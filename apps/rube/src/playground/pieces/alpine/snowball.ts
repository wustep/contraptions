import { clamp } from '../../../../../../src/core/ease'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { body, ride, rounded, trackOf } from './parts-b'
import { gearColor, snowWhite } from './snow'

/**
 * A snowball. The rail runs out onto the crown of a slope, and the ball
 * goes over the brink and down it gathering snow: a white ball grows round
 * it as it rolls, the ball its coloured heart, slow over the brink and
 * faster all the way, as big as half a cell by the foot. There a stump
 * stands in the run-out with the lower rail's end on it. The snowball
 * breaks on the stump, the snow bursts off in lumps, and the ball, bare
 * again, hops onto the stump's top and rolls on a floor down. The lumps
 * lie where they fell.
 *
 * The slope is one line and the ball's centre is the snowball's: a
 * snowball's radius off that line, which grows with how far it has rolled.
 * The pace is the slope's, under a cartoon gravity and a drag.
 */
/** How big the snowball is when it breaks. */
const RF = 0.27
/** The stump: its near face, its far face, and its top, which is the lower rail's level. */
const STUMP: [number, number] = [1.13, 1.3]
const STUMP_TOP = 1 + FLOOR
/** Where the rail stops and the snow's crown takes over, level with it. */
const CROWN = -0.28
const BRINK = -0.1
const LINE = rounded([
  [CROWN, FLOOR],
  [BRINK, FLOOR, 0.2],
  [0.84, 1.36, 0.5],
  [1.5, 1.352],
])
const TRACK = trackOf(LINE)
/** The whole hill's top, from the cell's edge: level with the rail as far as the brink. */
const HILL: Pt[] = [[-0.5, FLOOR], ...LINE]
/** Soft snow takes the way off it on the crown; then the slope has it, under a cartoon gravity and a drag. */
const CRAWL = 1
const G = 4.6
const DRAG = 0.35

/** The snowball gathers from the brink on: its radius by how far down the line it is. */
/** Where the crown begins to turn over: the soft snow has slowed it to a crawl by here, and it goes. */
const X_GO = BRINK - 0.09
const S_BRINK = TRACK.reach(X_GO)
const S_FOOT = TRACK.reach(0.9)
const radius = (s: number) => R + (RF - R) * clamp((s - S_BRINK) / (S_FOOT - S_BRINK))
/** It breaks when its front meets the stump's face. */
const RIDE = ride(TRACK, S_BRINK, CRAWL, G, DRAG, (s) => TRACK.at(s, radius(s)).at[0] + radius(s) >= STUMP[0])

const ON_SNOW = ramp([CROWN, 0], [X_GO, 0], ROLL, CRAWL)
const T_ON = (CROWN + 0.5) / ROLL + ON_SNOW.dur
const T_BURST = T_ON + RIDE.dur
const ballAt = (t: number): Pt => {
  const s = RIDE.s(t - T_ON)
  return TRACK.at(s, radius(s)).at
}
const BURST = ballAt(T_BURST)
const V_BURST = RIDE.v(RIDE.dur)
/** Bare, it hops onto the stump's top, the burst taking some of its way off. */
const LAND: Pt = [STUMP[0] + 0.1, 1]
const V_HOP = V_BURST * 0.8
const HOP = (LAND[0] - BURST[0]) / V_HOP

const LANE: Lane = {
  segs: [roll([-0.5, 0], [CROWN, 0], ROLL), ON_SNOW, ...trace(ballAt, T_ON, T_BURST, 40), fly(BURST, LAND, HOP, 0.03), ramp(LAND, [1.5, 1], V_HOP, ROLL)],
  fire: T_BURST,
}

/** The lumps the snowball breaks into: how far back of the stump each comes to rest, how high it goes, how big it is. */
const LUMPS: [rest: number, up: number, r: number][] = [
  [0.08, 0.16, 0.085],
  [-0.27, 0.42, 0.06],
  [0.25, 0.34, 0.065],
  [0.4, 0.22, 0.045],
]

export const snowball = definePiece<{ color: string; white: string }>({
  name: 'snowball',
  weight: 1,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color: gearColor(theme, color, ball.color), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    // The hill, the rail onto its crown, and the snow's line on from its foot.
    body(p, k, ink, weight, s.white, HILL, 1.5, 0.95)
    rail(p, k, ink, weight, -0.5, CROWN + 0.02)
    // The stump in the run-out, the lower rail's end on its top.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(STUMP[0] * k, STUMP_TOP * k)
    p.vertex(STUMP[1] * k, STUMP_TOP * k)
    p.vertex(STUMP[1] * k, 1.31 * k)
    p.vertex((STUMP[1] + 0.06) * k, 1.39 * k)
    p.vertex((STUMP[0] - 0.06) * k, 1.39 * k)
    p.vertex(STUMP[0] * k, 1.31 * k)
    p.endShape(p.CLOSE)
    rail(p, k, ink, weight, STUMP[0], 1.5, STUMP_TOP)

    if (since < 0) {
      // The snowball, under the ball: its coloured heart is the show's. Two creases turn with it.
      const at = ballAt(Math.max(T_ON, t))
      const r = radius(RIDE.s(t - T_ON))
      if (t > T_ON && r > R + 0.03) {
        solid(p, ink, weight, s.white)
        p.circle(at[0] * k, at[1] * k, r * 2 * k)
        const turn = RIDE.s(t - T_ON) / ((r + R) / 2)
        outline(p, ink, weight * 0.7)
        for (const a of [turn, turn + 2.3]) p.arc(at[0] * k, at[1] * k, r * 1.45 * k, r * 1.45 * k, a, a + 0.7)
      }
      return
    }
    // Broken on the stump: the lumps go up and back off it and lie where they land.
    const white = s.white
    solid(p, ink, weight * 0.8, white)
    for (const [rest, up, r] of LUMPS) {
      const f = clamp(since / (0.3 + up * 0.5))
      const x = BURST[0] + RF * 0.5 + (STUMP[0] - rest - BURST[0] - RF * 0.5) * f
      const ground = TRACK.at(TRACK.reach(STUMP[0] - rest)).at[1] - r * 0.8
      const y = BURST[1] + (ground - BURST[1]) * f - up * 4 * f * (1 - f)
      p.circle(x * k, y * k, r * 2 * k)
    }
  },
})
