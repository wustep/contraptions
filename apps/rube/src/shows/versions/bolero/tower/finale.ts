import type { Pt } from '../../../../parts'
import { BEAT, COLLAPSE, EMAJOR, LAST, RETURN, bar } from './music'
import { DRUM, R, TOWER, liftA, liftB, ride, rideAt, sOf, INTO_CUP } from './plan'
import type { Where } from './ball'

/**
 * The finale. The last statement ends with the ball home at the top storey's lower left on the first downbeat of E
 * major (bar 327), the one place the tune leaves C. Then:
 *
 * - **Bar 327**: the lift takes it up the top storey's left end, a step a stroke, while the roof unfolds over the
 *   top storey: a gold pitched roof, the tower's one upright triangle, with a stair up its left slope and the great
 *   bell under its apex.
 * - **Bars 328 to 334**: up the stair, a step a beat, 21 of them, to the apex.
 * - **Bar 335**, C again: it lands in the finial cup at the apex and the great bell swings.
 * - **Bars 335 to 338**: the whole tower at full stretch, rocking on the drum.
 * - **Bar 339**, the collapse (the trombones' glissandi): the tower splits down its mast and its two halves fall away
 *   either side, storey by storey from the top; the ball, tipped out of the cup, falls straight down the middle.
 * - **Bar 340**, the last chord: it lands on the drum head, where the drum is still standing, and bounces to rest in
 *   the silence after.
 */

export const FINALE_FROM = sOf(17, INTO_CUP)
const TOP = TOWER[TOWER.length - 1]

/** The roof: its eaves are the top storey's top corners; its apex over the mast. */
export const ROOF = { eave: TOP.top, apex: TOP.top - 3.1, half: TOP.w / 2 }
/** The finial cup at the apex, where the ball rests from bar 335. */
export const FINIAL: Pt = [0, ROOF.apex - 0.2 - R]
/** The great bell hangs in the roof under the apex. */
export const BELL: Pt = [0, ROOF.apex + 1.05]

/** The stair's 22 treads (0 at the lift's head, 21 the finial), up the roof's left slope: where the ball stands on each. */
export const STAIR: Pt[] = (() => {
  const out: Pt[] = []
  const [x0, y0] = TOP.B
  const [x1, y1] = FINIAL
  for (let i = 0; i <= 21; i++) {
    const f = i / 21
    // Straight up the slope, eased so the first treads climb the storey's side and the last lie along the roof.
    out.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * (1 - (1 - f) * (1 - f) * 0.35 - 0.65 * (1 - f))])
  }
  return out
})()
/** When the ball lands on each tread: the ride ends on tread 0 at bar 328, then one a beat to the finial on 335. */
export const TREAD_AT: number[] = STAIR.map((_, i) => bar(328) + i * BEAT)

/** The E-major ride: the top storey's A to its B, a step a stroke, through bar 327 (the ball leaves the rail as it begins). */
export const LAST_RIDE = ride(FINALE_FROM, bar(328) - 0.2, liftA(9), liftB(9))

/** The fall: tipped out of the cup on the collapse, straight down onto the drum head on the last chord. */
export const FALL_FROM = COLLAPSE
export const HEAD: Pt = [0, DRUM.head - R]
const G = (2 * (HEAD[1] - FINIAL[1])) / ((LAST - FALL_FROM) * (LAST - FALL_FROM))
/** Its bounces on the head after the last chord: heights and how long each takes. */
const BOUNCES = [0.34, 0.12, 0.04].map((h) => ({ h, d: 2 * Math.sqrt((2 * h) / G) }))
export const REST = BOUNCES.reduce((t, b) => t + b.d, LAST)

export function finaleAt(t: number, turned: number): Where {
  // Up the top storey's left end.
  if (t < TREAD_AT[0]) {
    const p = t <= LAST_RIDE.to ? rideAt(LAST_RIDE, t) : STAIR[0]
    return { p, angle: -Math.PI / 2, phase: 'finale', k: 17, turned }
  }
  // Up the stair, a tread a beat: a hop that leaves the tread just after the beat and lands on the next.
  if (t < RETURN) {
    let i = 0
    while (i + 1 < TREAD_AT.length && TREAD_AT[i + 1] <= t) i++
    const a = STAIR[i]
    const b = STAIR[Math.min(i + 1, STAIR.length - 1)]
    const since = t - TREAD_AT[i]
    // A beat on each tread: it sits a moment (the tread gives), then hops.
    const sit = 0.18
    const u = Math.max(0, Math.min(1, (since - sit) / (BEAT - sit)))
    const x = a[0] + (b[0] - a[0]) * u
    const lift = 0.26 + 0.06 * Math.max(0, (b[1] - a[1]) * -3)
    const y = a[1] + (b[1] - a[1]) * u - lift * 4 * u * (1 - u)
    return { p: [x, y], angle: Math.atan2(b[1] - a[1], b[0] - a[0]), phase: 'finale', k: 17, turned: turned + i * 0.6 + u * 0.6 }
  }
  // In the finial cup at the apex.
  if (t < FALL_FROM) return { p: FINIAL, angle: 0, phase: 'finale', k: 17, turned: turned + 12.6 }
  // Straight down the middle.
  if (t < LAST) {
    const d = t - FALL_FROM
    return { p: [0, FINIAL[1] + 0.5 * G * d * d], angle: Math.PI / 2, phase: 'finale', k: 17, turned: turned + 12.6 }
  }
  // Bouncing to rest on the drum head.
  let at = LAST
  for (const b of BOUNCES) {
    if (t < at + b.d) {
      const u = (t - at) / b.d
      return { p: [HEAD[0], HEAD[1] - 4 * b.h * u * (1 - u)], angle: -Math.PI / 2, phase: 'finale', k: 17, turned: turned + 12.6 }
    }
    at += b.d
  }
  return { p: HEAD, angle: 0, phase: 'finale', k: 17, turned: turned + 12.6 }
}

/** The strikes of the finale, show seconds: every tread's landing (on the beat), the finial on 335, the drum on the last chord. */
export const FINALE_HITS = { treads: TREAD_AT.slice(1), finial: RETURN, drum: LAST, emajor: EMAJOR }
