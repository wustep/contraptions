import { outline, solid } from '../../../../src/core/draw'
import { FALL, FLOOR, ROLL, arcPts, chain, definePiece, over, rail, roll, segTime, type Lane, type Pt, type Seg } from '../parts'

/**
 * A funnel. The rail ends at the rim; the ball goes round and round and
 * down, faster and tighter, behind the cone and in front of it, until it
 * drops through the neck into the cell below, where a quarter-pipe turns
 * the drop back into a roll — on, or back the way it came.
 */
const RIM_Y = 0.06
const RIM_HALF = 0.42
const NECK_Y = 0.42
const NECK_HALF = 0.16
const ENTRY_X = -0.3
const TURNS = 4.6
const ORBIT = 1.5
const ARC = 0.24
const TUBE = 0.16

function orbit(): Seg[] {
  const n = 46
  const dt = ORBIT / n
  const pts: { x: number; y: number; back: boolean }[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const y = 0.02 + (NECK_Y - 0.1 - 0.02) * Math.pow(f, 1.4)
    const amp = 0.27 * (1 - 0.92 * f) + 0.02
    const phase = Math.PI + Math.PI * 2 * TURNS * Math.pow(f, 1.6)
    pts.push({ x: Math.cos(phase) * amp, y, back: Math.sin(phase) > 0.15 })
  }
  const segs: Seg[] = []
  for (let i = 1; i < pts.length; i++) {
    segs.push({ from: [pts[i - 1].x, pts[i - 1].y], to: [pts[i].x, pts[i].y], dur: dt, hidden: pts[i].back && pts[i - 1].back })
  }
  return segs
}

export const funnel = definePiece<{ color: string; turn: 1 | -1 }>({
  name: 'funnel',
  weight: 0.9,
  place: ({ rng, color, fits }) => {
    for (const turn of rng.shuffle([1, -1] as const)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
      ]
      if (!fits(cells, [turn, 1])) continue
      const round = orbit()
      const last = round[round.length - 1].to
      const bend = chain(arcPts(turn * ARC, 1 - ARC, ARC, Math.PI * (turn > 0 ? 1 : 0), Math.PI / 2, 4), 0.11)
      const segs: Seg[] = [
        roll([-0.5, 0], [ENTRY_X, 0.02], ROLL),
        ...round,
        { from: last, to: [0, 1 - ARC], dur: (1 - ARC - last[1]) / FALL, ease: 'in' },
        ...bend,
        roll([turn * ARC, 1], [turn * 0.5, 1], ROLL * 1.2, 'out'),
      ]
      const fire = segTime(segs) - segTime(bend) - segs[segs.length - 1].dur
      const lane: Lane = { segs, fire }
      return { cells, exit: { at: [turn, 1], dir: turn }, lane, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const { turn } = s
    // The rail to the rim.
    rail(p, k, ink, weight, -0.5, -RIM_HALF - 0.02)
    // The cone, paper-filled: the ball goes behind it on the far side.
    solid(p, ink, weight, bg)
    p.quad(-RIM_HALF * k, RIM_Y * k, RIM_HALF * k, RIM_Y * k, NECK_HALF * k, NECK_Y * k, -NECK_HALF * k, NECK_Y * k)
    // The rim, seen from a little above.
    solid(p, ink, weight, s.color)
    p.ellipse(0, RIM_Y * k, RIM_HALF * 2 * k, 0.11 * k)
    solid(p, ink, weight, ink)
    p.ellipse(0, RIM_Y * k, (RIM_HALF * 2 - 0.1) * k, 0.06 * k)
    // Bands on the cone.
    outline(p, ink, weight * 0.8)
    for (const f of [0.35, 0.7]) {
      const y = RIM_Y + (NECK_Y - RIM_Y) * f
      const half = RIM_HALF + (NECK_HALF - RIM_HALF) * f
      p.arc(0, y * k, half * 2 * k, 0.07 * k, 0, Math.PI)
    }
    // The neck, into the cell below, and the tube down to the catch.
    outline(p, ink, weight)
    for (const x of [-TUBE, TUBE]) p.line(x * k, NECK_Y * k, x * k, (1 - ARC - 0.02) * k)
    for (const y of [0.62, 0.86]) for (const x of [-TUBE, TUBE]) p.line(x * k, y * k, (x + Math.sign(x) * 0.06) * k, y * k)
    // The stand: legs from the rim's shoulders to the floor of the cell below.
    for (const side of [-1, 1]) {
      p.line(side * (RIM_HALF - 0.04) * k, (RIM_Y + 0.05) * k, side * 0.36 * k, 0.5 * k)
    }
    // The catch: a quarter-pipe onto the floor, in the direction the ball leaves.
    p.push()
    p.translate(0, 1 * k)
    p.scale(turn, 1)
    outline(p, ink, weight)
    p.arc(ARC * k, -ARC * k, (ARC + FLOOR) * 2 * k, (ARC + FLOOR) * 2 * k, Math.PI / 2, Math.PI)
    p.line(ARC * k, FLOOR * k, 0.5 * k, FLOOR * k)
    const squash = since < 0 ? 0 : 1 - over(since, 0, 0.35)
    solid(p, ink, weight, s.color)
    p.rect(0.04 * k, (FLOOR + 0.12 + squash * 0.02) * k, 0.24 * k, (0.09 - squash * 0.03) * k)
    outline(p, ink, weight)
    p.line(0.04 * k, (FLOOR + 0.17) * k, 0.04 * k, 0.5 * k)
    p.line(0.36 * k, FLOOR * k, 0.36 * k, 0.5 * k)
    p.pop()
  },
})
