import { solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, roll, type Lane, type Pt, type Seg } from '../../parts'
import { soil, tuft } from './green'

/**
 * Three toadstools, each taller than the last, where the path stops. The
 * ball rolls off the end and drops onto the first cap; the cap squashes
 * under it and springs, with a puff of spores, and throws it up onto the
 * second; the second onto the third; the third onto the path a floor up.
 * Every bounce is the same bounce — the same squash, the same pull of
 * gravity — so it reads as one rhythm: pum, pum, pum. The caps go on
 * wobbling on their stalks after the ball has gone.
 */
const LIP = -0.2
/** Gravity in the flights, cells a second squared: a flight over an arc `a` takes sqrt(8a / G). */
const G = 14
const hang = (arc: number) => Math.sqrt((8 * arc) / G)
/** How far a cap gives under the ball, and how long the give and the spring take. */
const SAG = 0.055
const DOWN = 0.055
const UP = 0.035
/** The ball comes onto a cap a little short of its crown and leaves a little past it: it keeps some of its way through the squash. */
const DRIFT = 0.035

interface Cap {
  /** The ball's centre when it sits on the cap at rest. */
  at: Pt
  /** The cap's width and its dome's height. */
  w: number
  h: number
  /** How far the stalk's foot stands off from under the cap, for a lean. */
  lean: number
}
const CAPS: Cap[] = [
  { at: [0.12, 0.1], w: 0.46, h: 0.14, lean: 0.02 },
  { at: [0.6, -0.33], w: 0.42, h: 0.14, lean: -0.05 },
  { at: [0.98, -0.74], w: 0.37, h: 0.13, lean: 0.06 },
]
/** The arcs of the three throws, over their chords. */
const ARCS = [0.3, 0.3, 0.2]
const LAND: Pt = [1.3, -1]
const RAIL0 = 1.16

/** The spores a cap throws off as it springs: which way each goes, and how far. */
const SPORES: [number, number][] = [
  [-2.95, 0.13],
  [-2.55, 0.2],
  [-2.15, 0.15],
  [-0.95, 0.16],
  [-0.6, 0.21],
  [-0.2, 0.12],
]

/** The one lane, and the moment of each landing. */
const TAPS: number[] = []
const LANE: Lane = (() => {
  const segs: Seg[] = [roll([-0.5, 0], [LIP, 0], ROLL)]
  // Off the end level, at the path's pace, and down onto the first cap.
  const on = (cap: Cap): Pt => [cap.at[0] - DRIFT, cap.at[1]]
  const off = (cap: Cap): Pt => [cap.at[0] + DRIFT, cap.at[1]]
  const drop = CAPS[0].at[1]
  segs.push(fly([LIP, 0], on(CAPS[0]), (on(CAPS[0])[0] - LIP) / ROLL, drop / 4))
  let t = segs[0].dur + segs[1].dur
  CAPS.forEach((cap, i) => {
    TAPS.push(t)
    const low: Pt = [cap.at[0], cap.at[1] + SAG]
    segs.push({ from: on(cap), to: low, dur: DOWN, ease: 'out' }, { from: low, to: off(cap), dur: UP, ease: 'in' })
    const to = i < CAPS.length - 1 ? on(CAPS[i + 1]) : LAND
    segs.push(fly(off(cap), to, hang(ARCS[i]), ARCS[i]))
    t += DOWN + UP + hang(ARCS[i])
  })
  const vx = (LAND[0] - off(CAPS[2])[0]) / hang(ARCS[2])
  segs.push(fly(LAND, [LAND[0] + 0.06, -1], 0.06, 0.012), ramp([LAND[0] + 0.06, -1], [1.5, -1], Math.max(vx, 1.4), ROLL))
  return { segs, fire: TAPS[0] + DOWN }
})()

/** How far cap `i` is pressed down at `t`: under the ball, then a ring-down on its stalk. */
function pressAt(i: number, t: number): { sag: number; ring: number } {
  const tau = t - TAPS[i]
  if (tau < 0) return { sag: 0, ring: 0 }
  if (tau < DOWN) return { sag: SAG * (1 - Math.pow(1 - tau / DOWN, 2)), ring: 0 }
  if (tau < DOWN + UP) return { sag: SAG * (1 - Math.pow((tau - DOWN) / UP, 2)), ring: 0 }
  const after = tau - DOWN - UP
  return { sag: -0.02 * Math.sin(after * 30) * Math.exp(-after * 5), ring: 0.13 * Math.sin(after * 17) * Math.exp(-after * 2.6) }
}

export const toadstools = definePiece<{ color: string }>({
  name: 'toadstools',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The path in, on a stake; the ground; the path out a floor up, on a long stake of its own.
    rail(p, k, ink, weight, -0.5, LIP)
    post(p, k, ink, weight, LIP - 0.05)
    soil(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, RAIL0, 1.5, -1 + FLOOR)
    post(p, k, ink, weight, 1.42, -1 + FLOOR, 0.5)
    // A button of a toadstool that has not come up yet.
    solid(p, ink, weight, bg)
    p.rect(0.86 * k, 0.47 * k, 0.04 * k, 0.06 * k)
    solid(p, ink, weight, s.color)
    p.arc(0.86 * k, 0.45 * k, 0.12 * k, 0.1 * k, Math.PI, Math.PI * 2, p.CHORD)
    tuft(p, k, ink, weight, 0.36, 0.5, 0.09, 0.02)

    // The tallest first, so the nearer stand in front.
    for (let i = CAPS.length - 1; i >= 0; i--) {
      const cap = CAPS[i]
      const { sag, ring } = pressAt(i, t)
      const [cx, cy] = cap.at
      const top = cy + R + sag
      const squash = Math.max(0, sag) / SAG
      const h = cap.h * (1 - 0.35 * squash)
      const w = cap.w * (1 + 0.12 * squash)
      const brim = top + h
      const foot = cx + cap.lean
      // The stalk: paper, a little waisted, bowing as the cap rocks; a ring of skirt under the cap.
      const sw = 0.05 + 0.012 * i
      const bow = cap.lean * 0.6 + ring * 0.15
      solid(p, ink, weight, bg)
      p.beginShape()
      p.vertex((cx - sw * 0.75) * k, brim * k)
      p.quadraticVertex((cx - sw * 0.6 + bow) * k, ((brim + 0.5) / 2) * k, (foot - sw) * k, 0.5 * k)
      p.vertex((foot + sw) * k, 0.5 * k)
      p.quadraticVertex((cx + sw * 0.6 + bow) * k, ((brim + 0.5) / 2) * k, (cx + sw * 0.75) * k, brim * k)
      p.endShape(p.CLOSE)
      if (i > 0) {
        solid(p, ink, weight * 0.8, bg)
        p.ellipse((cx + bow * 0.2) * k, (brim + 0.07) * k, (sw * 2 + 0.05) * k, 0.035 * k)
      }
      // The cap: a dome with spots, rocking on the stalk's top.
      p.push()
      p.translate(cx * k, brim * k)
      p.rotate(ring)
      solid(p, ink, weight, s.color)
      p.arc(0, 0, w * k, h * 2 * k, Math.PI, Math.PI * 2, p.CHORD)
      p.noStroke()
      p.fill(bg)
      for (const [dx, dy, d] of [
        [-0.26, 0.45, 0.16],
        [0.05, 0.62, 0.2],
        [0.3, 0.35, 0.13],
      ]) {
        p.ellipse(dx * w * k, -dy * h * k, d * w * k, d * w * 0.8 * (1 - 0.3 * squash) * k)
      }
      p.pop()

      // The spores: a puff thrown up off the cap's shoulders as it springs, drifting and thinning.
      const puff = t - TAPS[i] - DOWN
      if (puff > 0 && puff < 0.7) {
        const f = over(puff, 0, 0.7)
        p.push()
        p.noStroke()
        p.fill(s.color)
        const e = 1 - Math.pow(1 - f, 3)
        SPORES.forEach(([a, reach], j) => {
          const px = cx + Math.cos(a) * (cap.w * 0.34 + reach * e)
          const py = cy + R + cap.h * 0.5 + Math.sin(a) * (0.03 + reach * e) + 0.04 * f * f
          p.circle(px * k, py * k, (j % 2 ? 0.04 : 0.05) * (1 - f * f) * k)
        })
        p.pop()
      }
    }
  },
})
