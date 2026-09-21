import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { R, ROLL, definePiece, over, ramp, roll, type BallChange, type Lane, type Pt, type Seg } from '../../../parts'
import { baluster, feltColor, ivory, stage } from './hall'

/**
 * A composer's inkwell, let into the stage and cut through: a deep bowl of
 * ink with its rim flush with the boards and a quill standing in it. The
 * stage stops at the rim and the ball rolls over it and down the inside of
 * the bowl into the ink, under, across the bottom and up the far side, the
 * ink taking the way off it, and out over the far rim onto the stage again
 * the colour of the ink, for good. The ink slops and settles; the quill
 * nods.
 *
 * The bowl's inside is the ball's own path set a radius out, so the ball
 * rolls on the glass all the way down and up; its pace is a roll's under
 * gravity, less what the ink takes.
 */
/** The bowl's two rims, how deep the ball's line goes, and where the ink lies. */
const XL = -0.37
const XR = 0.47
const DEPTH = 0.31
const INK_Y = 0.175
/** The glass's thickness. */
const GLASS = 0.055
const G = 20
/** How much of its pace the ink has taken by the far rim. */
const DRAG = 0.42

/** The ball's line through the bowl, `u` from rim to rim: level at both rims and at the bottom. */
const lineAt = (u: number): Pt => [XL + (XR - XL) * u, (DEPTH * (1 - Math.cos(2 * Math.PI * u))) / 2]
/** The same, set `d` out along the normal: the glass under the ball. */
function wallAt(u: number, d: number): Pt {
  const [x, y] = lineAt(u)
  const dy = (DEPTH * Math.PI * Math.sin(2 * Math.PI * u)) / (XR - XL)
  const n = Math.hypot(1, dy)
  return [x - (dy / n) * d, y + d / n]
}
const smooth = (a: number, b: number, x: number) => {
  const f = clamp((x - a) / (b - a))
  return f * f * (3 - 2 * f)
}
const paceAt = (u: number) => Math.sqrt(ROLL * ROLL + 2 * G * lineAt(u)[1]) * (1 - DRAG * smooth(0.12, 0.62, u))

const N = 40
const T_RIM = (XL + 0.5) / ROLL
const { LANE, T_IN, T_OUT } = (() => {
  const segs: Seg[] = [roll([-0.5, 0], [XL, 0], ROLL)]
  let t = T_RIM
  let tIn = 0
  let tOut = 0
  for (let i = 0; i < N; i++) {
    const seg = ramp(lineAt(i / N), lineAt((i + 1) / N), paceAt(i / N), paceAt((i + 1) / N))
    const [y0, y1] = [seg.from[1], seg.to[1]]
    // The moments the ball's middle goes under the ink's line, and comes up through it.
    if (y0 < INK_Y && y1 >= INK_Y) tIn = t + (seg.dur * (INK_Y - y0)) / (y1 - y0)
    if (y0 >= INK_Y && y1 < INK_Y) tOut = t + (seg.dur * (y0 - INK_Y)) / (y0 - y1)
    segs.push(seg)
    t += seg.dur
  }
  segs.push(ramp([XR, 0], [1.5, 0], paceAt(1), ROLL))
  return { LANE: { segs, fire: tIn } satisfies Lane, T_IN: tIn, T_OUT: tOut }
})()

/** The quill: its nib on the bowl's floor, and its tip. */
const NIB: Pt = [0.3, 0.37]
const TIP: Pt = [0.8, -0.43]

/** The ink as it lies in the bowl, its surface tipped by `slop` and lifted by what the ball pushes aside. */
function inkShape(p: p5, k: number, slop: number, lift: number): void {
  const y = INK_Y - lift
  const pts: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const w = wallAt(i / N, R)
    const level = y + slop * ((w[0] - (XL + XR) / 2) / ((XR - XL) / 2))
    if (w[1] > level) pts.push(w)
  }
  if (pts.length < 2) return
  const first = pts[0]
  const last = pts[pts.length - 1]
  p.beginShape()
  p.vertex(first[0] * k, (y + slop * ((first[0] - (XL + XR) / 2) / ((XR - XL) / 2))) * k)
  for (const [x, yy] of pts) p.vertex(x * k, yy * k)
  p.vertex(last[0] * k, (y + slop * ((last[0] - (XL + XR) / 2) / ((XR - XL) / 2))) * k)
  p.endShape(p.CLOSE)
}

const slopAt = (since: number) => (since <= 0 ? 0 : 0.035 * Math.exp(-since * 2.6) * Math.sin(since * 13))
const liftAt = (t: number) => 0.022 * over(t, T_IN, T_IN + 0.12) * (1 - over(t, T_OUT - 0.05, T_OUT + 0.15))

export const inkwell = definePiece<{ color: string; ink: string; feather: string }>({
  name: 'inkwell',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // Ink is never the colour the ball arrives in, and never so pale it is not ink; with nothing else to offer, the well stays out of the map.
    const pale = ivory(theme)
    const pool = theme.colors.filter((c) => c !== ball.color && c !== pale)
    if (!pool.length) return null
    const ink = rng.pick(pool)
    const glass = [feltColor(theme, color, ball.color), ...theme.colors].find((c) => c !== ink && c !== ball.color && c !== pale) ?? color
    const changes: BallChange[] = [{ at: T_IN + 0.04, color: ink, over: Math.max(0.2, (T_OUT - T_IN) * 0.7) }]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: glass, ink, feather: pale }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The quill, behind everything: a shaft from the bowl's floor and a vane along it. It nods when the ink slops.
    const nod = since <= 0 ? 0 : 0.07 * Math.exp(-since * 3) * Math.sin(since * 13 + 0.6)
    p.push()
    p.translate(NIB[0] * k, NIB[1] * k)
    p.rotate(Math.atan2(TIP[1] - NIB[1], TIP[0] - NIB[0]) + nod)
    const len = Math.hypot(TIP[0] - NIB[0], TIP[1] - NIB[1])
    solid(p, ink, weight, s.feather)
    p.beginShape()
    p.vertex(len * 0.34 * k, 0)
    p.bezierVertex(len * 0.42 * k, -0.11 * k, len * 0.86 * k, -0.1 * k, len * k, -0.012 * k)
    p.bezierVertex(len * 0.9 * k, 0.085 * k, len * 0.5 * k, 0.08 * k, len * 0.34 * k, 0)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.line(0, 0, len * 0.97 * k, -0.006 * k)
    p.pop()

    // The stage up to the near rim and on from the far one.
    stage(p, k, ink, weight, -0.5, XL)
    stage(p, k, ink, weight, XR, 1.5)
    baluster(p, k, ink, weight, s.color, 1.08)

    // The bowl, cut through: glass of one thickness round the ball's line, its foot on the floor.
    outline(p, ink, weight)
    p.line(((XL + XR) / 2 - 0.12) * k, 0.5 * k, ((XL + XR) / 2 + 0.12) * k, 0.5 * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= N; i++) {
      const [x, y] = wallAt(i / N, R + GLASS)
      p.vertex(x * k, y * k)
    }
    for (let i = N; i >= 0; i--) {
      const [x, y] = wallAt(i / N, R)
      p.vertex(x * k, y * k)
    }
    p.endShape(p.CLOSE)
    // Its hollow is paper, and the ink lies in it.
    p.noStroke()
    p.fill(bg)
    p.beginShape()
    for (let i = 0; i <= N; i++) {
      const [x, y] = wallAt(i / N, R)
      p.vertex(x * k, y * k)
    }
    p.endShape(p.CLOSE)
    // The ink has no line along its top: the stage's line stops at the rims, and the ink's level must not read as more of it.
    p.noStroke()
    p.fill(s.ink)
    inkShape(p, k, slopAt(since), liftAt(t))
    outline(p, ink, weight)
    p.beginShape()
    for (let i = 0; i <= N; i++) {
      const [x, y] = wallAt(i / N, R)
      p.vertex(x * k, y * k)
    }
    p.endShape()
  },
  over: (p, s, { k, t, since }) => {
    // While the ball is under, the ink is between us and it: a wash of ink over what of it is under.
    const under = over(t, T_IN - 0.02, T_IN + 0.1) * (1 - over(t, T_OUT - 0.04, T_OUT + 0.06))
    if (under > 0) {
      const wash = p.color(s.ink)
      wash.setAlpha(150 * under)
      p.noStroke()
      p.fill(wash)
      inkShape(p, k, slopAt(since), liftAt(t))
    }
    // The splash where it went in, and a smaller one where it comes out: drops of ink on short arcs.
    for (const [at, x, size] of [[T_IN, lineAt(0.2)[0], 1], [T_OUT, lineAt(0.82)[0], 0.6]] as const) {
      const f = over(t, at, at + 0.34)
      if (f <= 0 || f >= 1) continue
      p.noStroke()
      p.fill(s.ink)
      for (const [dx, up] of [[-1, 0.8], [-0.4, 1.25], [0.45, 1.2], [1, 0.7]]) {
        p.circle((x + dx * 0.13 * size * f) * k, (INK_Y - up * 0.5 * size * f * (1 - f) - 0.01) * k, 0.036 * size * (1 - f * 0.5) * k)
      }
    }
  },
})
