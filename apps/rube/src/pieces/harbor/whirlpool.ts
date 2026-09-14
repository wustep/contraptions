import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, arcPts, catchBend, chain, definePiece, over, rail, ramp, roll, segTime, type Pt, type Seg } from '../../parts'
import { bubbles, piling, seaColor, water } from './sea'

/**
 * A whirlpool in a basin let into the pier. The deck stops at the rim;
 * the ball rolls onto the water and is taken round — a wide slow circle,
 * then tighter and faster, the funnel of the vortex drawing in under it
 * — down to the drain in the middle, through the pipe below, and out of
 * a quarter-pipe onto the deck a floor down, facing back the way it came.
 */
const RIM = 0.42
const SURFACE = 0.02
const DRAIN_Y = 0.34
const TURNS = 2.6
const ORBIT = 1.25
const ARC = 0.24
const TUBE = R

function orbit(): Seg[] {
  const n = 40
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const y = SURFACE + (DRAIN_Y - 0.08 - SURFACE) * Math.pow(f, 1.5)
    const amp = 0.3 * (1 - 0.9 * f) + 0.02
    const phase = Math.PI + Math.PI * 2 * TURNS * Math.pow(f, 1.5)
    pts.push([Math.cos(phase) * amp, y])
  }
  return chain(pts, ORBIT).map((seg) => ({ ...seg, dur: ORBIT / n }))
}

export const whirlpool = definePiece<{ color: string }>({
  name: 'whirlpool',
  weight: 0.9,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [-1, 1])) return null
    const round = orbit()
    const last = round[round.length - 1].to
    const depth = 1 - ARC - last[1]
    const fallDur = Math.sqrt((2 * depth) / 24)
    const vEnd = (2 * depth) / fallDur
    const bend = chain(arcPts(-ARC, 1 - ARC, ARC, 0, Math.PI / 2, 4), ((Math.PI / 2) * ARC) / (vEnd * 0.85))
    const segs: Seg[] = [
      roll([-0.5, 0], [-0.32, SURFACE], ROLL),
      ...round,
      { from: last, to: [0, 1 - ARC], dur: fallDur, ease: 'in' },
      ...bend,
      ramp([-ARC, 1], [-0.5, 1], ROLL * 1.4, ROLL),
    ]
    const fire = segTime(segs) - segTime(bend) - segs[segs.length - 1].dur - fallDur
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane: { segs, fire }, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The deck to the rim, and the deck out below.
    water(p, k, ink, weight, -0.5, -RIM)
    rail(p, k, ink, weight, -0.5, -RIM)
    piling(p, k, ink, weight, -0.46)
    // The basin: a tank let into the deck, its walls down to the drain.
    solid(p, ink, weight, bg)
    p.rect(0, ((SURFACE - 0.04 + DRAIN_Y + 0.06) / 2) * k, (RIM * 2 + 0.06) * k, (DRAIN_Y + 0.1 - SURFACE) * k)
    // The water: a body with the vortex sunk into it, spinning.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    p.vertex(-RIM * k, (SURFACE + R) * k)
    p.bezierVertex(-0.12 * k, (SURFACE + R + 0.02) * k, -0.06 * k, (DRAIN_Y - 0.02) * k, 0, DRAIN_Y * k)
    p.bezierVertex(0.06 * k, (DRAIN_Y - 0.02) * k, 0.12 * k, (SURFACE + R + 0.02) * k, RIM * k, (SURFACE + R) * k)
    p.vertex(RIM * k, (DRAIN_Y + 0.06) * k)
    p.vertex(-RIM * k, (DRAIN_Y + 0.06) * k)
    p.endShape(p.CLOSE)
    p.pop()
    // The rings of the vortex, turning: an ellipse a level, each offset by its spin.
    outline(p, ink, weight * 0.8)
    for (let i = 0; i < 5; i++) {
      const f = i / 5
      const y = SURFACE + R + (DRAIN_Y - SURFACE - R) * Math.pow(f, 1.4)
      const half = RIM * (1 - 0.9 * f) + 0.03
      const spin = t * (1.2 + f * 3)
      p.arc(Math.cos(spin) * 0.02 * k, y * k, half * 2 * k, (0.08 - 0.05 * f) * k, spin % (Math.PI * 2), (spin % (Math.PI * 2)) + Math.PI * 1.5)
    }
    // The rim, and the drain into the pipe below.
    outline(p, ink, weight)
    p.line(-RIM * k, (SURFACE - 0.04) * k, -RIM * k, (DRAIN_Y + 0.1) * k)
    p.line(RIM * k, (SURFACE - 0.04) * k, RIM * k, (DRAIN_Y + 0.1) * k)
    p.line(-RIM * k, (DRAIN_Y + 0.1) * k, -TUBE * k, (DRAIN_Y + 0.1) * k)
    p.line(TUBE * k, (DRAIN_Y + 0.1) * k, RIM * k, (DRAIN_Y + 0.1) * k)
    for (const x of [-TUBE, TUBE]) p.line(x * k, (DRAIN_Y + 0.1) * k, x * k, (1 - ARC) * k)
    // A gurgle of bubbles up the drain after the ball has gone down it.
    if (since > 0 && since < 1.2) bubbles(p, k, ink, weight, bg, 0, DRAIN_Y + 0.4, DRAIN_Y - 0.02, since, 4)
    // The catch: a quarter-pipe onto the deck out, facing back.
    const squash = since < 0 ? 0 : 1 - over(since, 0.15, 0.5)
    p.push()
    p.translate(0, 1 * k)
    catchBend(p, k, ink, weight, s.color, -1, ARC, squash)
    p.pop()
    water(p, k, ink, weight, -0.5, -0.4, 1.37)
  },
})
