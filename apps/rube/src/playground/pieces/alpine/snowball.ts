import { clamp } from '../../../../../../src/core/ease'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, mixHex, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { body, ride, rounded, trackOf } from './parts-b'
import { gearColor, powder, snowWhite } from './snow'

/**
 * A snowball. The rail runs out onto the crown of a slope, and the ball
 * goes over the brink and down it gathering snow: the first of it coats
 * the ball white, and a snowball grows round it as it rolls, slow over the
 * brink and faster all the way, as big as half a cell by the foot. There a
 * stump stands in the run-out with the lower rail's end on it. The
 * snowball breaks on the stump in a burst of powder, and the ball, bare
 * again and its own colour, hops onto the stump's top and rolls on a floor
 * down. What was the snowball lies in a drift against the stump.
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

/** The drift the snowball leaves against the stump's near face: how far back of it it runs, and how high it stands. */
const DRIFT = 0.3
const DRIFT_H = 0.09

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
  draw: (p, s, { k, since, ink, weight }) => {
    // The hill, the rail onto its crown, and the snow's line on from its foot.
    body(p, k, ink, weight, s.white, HILL, HILL[HILL.length - 1][1])
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

    // What the snowball was, heaped against the stump's near face once it has broken there.
    const heap = clamp(since / 0.2)
    if (heap > 0) {
      const n = 16
      const ground = (x: number) => TRACK.at(TRACK.reach(x)).at[1]
      solid(p, ink, weight, s.white)
      p.beginShape()
      for (let i = 0; i <= n; i++) {
        const x = STUMP[0] - DRIFT + (DRIFT * i) / n
        p.vertex(x * k, (ground(x) - DRIFT_H * heap * Math.sin(((Math.PI / 2) * i) / n) ** 1.5) * k)
      }
      p.vertex(STUMP[0] * k, ground(STUMP[0]) * k)
      p.endShape(p.CLOSE)
    }
  },
  over: (p, s, { k, t, since, ink, weight, color }) => {
    // The snowball, over the ball it was gathered round: the first snow coats it its own colour going white.
    if (since < 0 && t > T_ON) {
      const rolled = RIDE.s(t - T_ON)
      const r = radius(rolled)
      const at = ballAt(t)
      solid(p, ink, weight, mixHex(color, s.white, clamp((r - R) / 0.03)))
      p.circle(at[0] * k, at[1] * k, r * 2 * k)
      // One crease, turning with it.
      const turn = rolled / r
      outline(p, ink, weight * 0.7)
      p.arc(at[0] * k, at[1] * k, r * 1.3 * k, r * 1.3 * k, turn, turn + 0.9)
    }
    // Broken on the stump, in one burst of powder.
    powder(p, k, ink, weight, s.white, STUMP[0] - 0.12, TRACK.at(TRACK.reach(STUMP[0] - 0.12)).at[1], since / 0.5, 2)
  },
})
