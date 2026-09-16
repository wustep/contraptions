import { outline } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, arcPts, catchBend, chain, definePiece, over, rail, ramp, segTime, type Pt, type Seg } from '../../parts'
import { bubbles, seaColor, water } from './sea'

/**
 * A whirlpool in a tank let into the pier. The deck stops at the rim,
 * which is level with it, and the tank is full to the brim; the ball rolls
 * onto the water and the current takes it — round the near side first, the
 * way it was already going, then round and round, a wide slow circle that
 * tightens and quickens, the funnel of the vortex drawing in under it —
 * down to the drain in the middle, through the pipe below, and out of a
 * quarter-pipe onto the deck a floor down, facing back the way it came.
 *
 * The swirl is seen a little from above, so each turn rises at the back
 * and dips at the front, and the ball never stops dead at the edge of a
 * flat ellipse: it joins the swirl moving, and leaves it moving. The tank
 * is one line — a T, the basin and its drain pipe — with the water in it
 * and two rings turning on the funnel, and nothing else.
 */
const RIM = 0.42
const SURFACE = 0.02
const DRAIN_Y = 0.34
/** The tank's floor, where the drain pipe leaves it. */
const TANK_FLOOR = DRAIN_Y + 0.1
const TURNS = 2.6
const ORBIT = 1.25
const ARC = 0.24
const TUBE = R
/** How much of a turn's depth shows as height: the vortex seen from a little above. */
const ASPECT = 0.1
/** Where the ball joins the swirl: on the near side short of the rim, already moving the way it came. */
const JOIN = 0.5

/** The swirl: the angle runs on from the join and quickens as the radius closes on the drain. Equal time a step. */
function swirl(): Seg[] {
  const n = 96
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const phase = Math.PI - JOIN - Math.PI * 2 * TURNS * (0.5 * f + 0.5 * f * f * f)
    const amp = 0.3 * (1 - 0.9 * f) + 0.02
    const y = SURFACE + (DRAIN_Y - 0.08 - SURFACE) * Math.pow(f, 1.5)
    pts.push([Math.cos(phase) * amp, y + Math.sin(phase) * amp * ASPECT])
  }
  return chain(pts, ORBIT).map((seg) => ({ ...seg, dur: ORBIT / n }))
}
const speedOf = (seg: Seg) => Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]) / seg.dur

export const whirlpool = definePiece<{ color: string }>({
  name: 'whirlpool',
  weight: 0.9,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [-1, 1])) return null
    const round = swirl()
    const first = round[0]
    const last = round[round.length - 1]
    const depth = 1 - ARC - last.to[1]
    const vEnd = Math.sqrt(2 * depth * 24)
    const drop = ramp(last.to, [0, 1 - ARC], speedOf(last), vEnd)
    const bend = chain(arcPts(-ARC, 1 - ARC, ARC, 0, Math.PI / 2, 4), ((Math.PI / 2) * ARC) / (vEnd * 0.85))
    const segs: Seg[] = [
      ramp([-0.5, 0], first.from, ROLL, speedOf(first)),
      ...round,
      drop,
      ...bend,
      ramp([-ARC, 1], [-0.5, 1], ROLL * 1.4, ROLL),
    ]
    const fire = segTime(segs) - segTime(bend) - segs[segs.length - 1].dur - drop.dur
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane: { segs, fire }, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The deck in, over the sea, to the rim.
    water(p, k, ink, weight, -0.5, -RIM)
    rail(p, k, ink, weight, -0.5, -RIM)
    // The tank: one T — the basin, open at the top and level with the deck,
    // and the drain pipe out of its floor — paper inside.
    const tank = () => {
      p.beginShape()
      p.vertex(-RIM * k, FLOOR * k)
      p.vertex(-RIM * k, TANK_FLOOR * k)
      p.vertex(-TUBE * k, TANK_FLOOR * k)
      p.vertex(-TUBE * k, (1 - ARC) * k)
      p.vertex(TUBE * k, (1 - ARC) * k)
      p.vertex(TUBE * k, TANK_FLOOR * k)
      p.vertex(RIM * k, TANK_FLOOR * k)
      p.vertex(RIM * k, FLOOR * k)
    }
    p.push()
    p.noStroke()
    p.fill(bg)
    tank()
    p.endShape(p.CLOSE)
    p.pop()
    // The water, full to the brim, with the vortex's funnel sunk into it down to the drain.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    p.vertex(-RIM * k, FLOOR * k)
    p.bezierVertex(-0.12 * k, (FLOOR + 0.02) * k, -0.06 * k, (DRAIN_Y - 0.02) * k, 0, DRAIN_Y * k)
    p.bezierVertex(0.06 * k, (DRAIN_Y - 0.02) * k, 0.12 * k, (FLOOR + 0.02) * k, RIM * k, FLOOR * k)
    p.vertex(RIM * k, TANK_FLOOR * k)
    p.vertex(-RIM * k, TANK_FLOOR * k)
    p.endShape(p.CLOSE)
    p.pop()
    // Two rings turning on the funnel: one wide near the surface, one small near the drain.
    outline(p, ink, weight * 0.8)
    for (const f of [0.12, 0.6]) {
      const y = FLOOR + (DRAIN_Y - FLOOR) * Math.pow(f, 1.4)
      const half = (RIM - 0.04) * (1 - 0.9 * f) + 0.02
      const spin = t * (1.2 + f * 3)
      p.arc(Math.cos(spin) * 0.02 * k, y * k, half * 2 * k, (0.08 - 0.05 * f) * k, spin % (Math.PI * 2), (spin % (Math.PI * 2)) + Math.PI * 1.5)
    }
    // The tank's one line: down the near wall, along the floor, down the pipe and up the far side.
    outline(p, ink, weight)
    tank()
    p.endShape()
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
