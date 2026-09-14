import { outline, solid } from '../../../../src/core/draw'
import { FLOOR, ROLL, arcPts, chain, definePiece, over, rail, ramp, roll, segTime, type Lane, type Pt, type Seg } from '../parts'

/**
 * A glass funnel. The rail ends at the rim; the ball goes round and round
 * and down, faster and tighter, in full view the whole way — the funnel is
 * drawn as a paper bowl behind the ball, so the spiral is always readable
 * — until it drops through the neck into the cell below, where a
 * quarter-pipe turns the drop back into a roll, on or back the way it came.
 */
const RIM_Y = 0.06
const RIM_HALF = 0.42
const NECK_Y = 0.42
const NECK_HALF = 0.16
const ENTRY_X = -0.3
const TURNS = 3.8
const ORBIT = 1.5
const ARC = 0.24
const TUBE = 0.16

function orbit(): Seg[] {
  const n = 46
  const dt = ORBIT / n
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const y = 0.02 + (NECK_Y - 0.1 - 0.02) * Math.pow(f, 1.4)
    const amp = 0.27 * (1 - 0.92 * f) + 0.02
    const phase = Math.PI + Math.PI * 2 * TURNS * Math.pow(f, 1.6)
    pts.push([Math.cos(phase) * amp, y])
  }
  return chain(pts, ORBIT).map((seg) => ({ ...seg, dur: dt }))
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
      const depth = 1 - ARC - last[1]
      const fallDur = Math.sqrt((2 * depth) / 24)
      const vEnd = (2 * depth) / fallDur
      const bend = chain(arcPts(turn * ARC, 1 - ARC, ARC, Math.PI * (turn > 0 ? 1 : 0), Math.PI / 2, 4), ((Math.PI / 2) * ARC) / (vEnd * 0.85))
      const segs: Seg[] = [
        roll([-0.5, 0], [ENTRY_X, 0.02], ROLL),
        ...round,
        { from: last, to: [0, 1 - ARC], dur: fallDur, ease: 'in' },
        ...bend,
        ramp([turn * ARC, 1], [turn * 0.5, 1], ROLL * 1.4, ROLL),
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
    // The bowl shivers on its stand as the ball goes through the neck.
    const neckAt = -0.11 - 0.09
    const shiver = since > neckAt && since < neckAt + 0.4 ? 0.02 * Math.sin((since - neckAt) * 40) * (1 - over(since, neckAt, neckAt + 0.4)) : 0
    p.push()
    p.translate(0, NECK_Y * k)
    p.rotate(shiver)
    p.translate(0, -NECK_Y * k)
    // The bowl, in paper: the ball is always in front of it.
    solid(p, ink, weight, bg)
    p.quad(-RIM_HALF * k, RIM_Y * k, RIM_HALF * k, RIM_Y * k, NECK_HALF * k, NECK_Y * k, -NECK_HALF * k, NECK_Y * k)
    // The rim, a band of colour seen from a little above, open in the middle.
    solid(p, ink, weight, s.color)
    p.ellipse(0, RIM_Y * k, RIM_HALF * 2 * k, 0.12 * k)
    solid(p, ink, weight, bg)
    p.ellipse(0, RIM_Y * k, (RIM_HALF * 2 - 0.12) * k, 0.06 * k)
    // Two bands round the glass.
    outline(p, ink, weight)
    for (const f of [0.35, 0.7]) {
      const y = RIM_Y + (NECK_Y - RIM_Y) * f
      const half = RIM_HALF + (NECK_HALF - RIM_HALF) * f
      p.arc(0, y * k, half * 2 * k, 0.07 * k, 0, Math.PI)
    }
    p.pop()
    // The neck, into the cell below, and the tube down to the catch.
    outline(p, ink, weight)
    for (const x of [-TUBE, TUBE]) p.line(x * k, NECK_Y * k, x * k, (1 - ARC - 0.02) * k)
    for (const y of [0.62, 0.86]) for (const x of [-TUBE, TUBE]) p.line(x * k, y * k, (x + Math.sign(x) * 0.06) * k, y * k)
    // The stand: legs from the rim's shoulders to the floor of the cell below.
    for (const side of [-1, 1]) {
      p.line(side * (RIM_HALF - 0.04) * k, (RIM_Y + 0.05) * k, side * 0.36 * k, 0.5 * k)
      p.line(side * 0.3 * k, 0.5 * k, side * 0.42 * k, 0.5 * k)
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
