import { MAN_SIZE } from '../cast'
import { lerpPt, region, smooth, standing } from '../draw'
import { BEATS, beatNear } from '../music'
import { fly, roll, type Move, type Pt } from '../path'
import type { Scene } from '../scene'
import { seat, WINDOWS } from '../voyage'
import { onShip } from '../world/ship'
import { drawBinding, HAUL, MAST_AT, man0At, strainAt, COILS, RELEASE } from './sirens/binding'
import { later, lazy, onDeck, shipPose, shipX, strokeAt, walk } from './sirens/course'
import { drawRocks } from './sirens/rocks'

/**
 * The Sirens (251.36 → 278.36, the tutti's middle phrases). White noon; the wind has dropped and the men row, wax in
 * their ears. He goes forward to the mast and has himself bound to it: man 0 hauls on a line that runs up through a block
 * at the masthead and back down round him, and on each beat a turn of it closes over him. Then the rocks come by with
 * the Sirens on them, who turn their heads after the ship; we hear nothing, as the men hear nothing, and he strains
 * against the rope towards them on every beat. Man 3, the youngest, cannot bear it: he climbs onto the bow and leaps,
 * and is gone into the dark water. The rocks pass astern, the turns are cast off, and he goes back aft to the helm.
 */

const [FROM, TO] = WINDOWS.sirens
const HELM_AT: Pt = [-1.15, -0.35]

/** When he goes forward to the mast, and when he comes back aft. */
const TO_MAST: [number, number] = [253.0, 255.2]
const TO_HELM: [number, number] = [RELEASE + 0.3, RELEASE + 2.5]

/** Man 3's leap: from the bow's top on a strong beat, into the sea ahead, and down. */
const LEAP = beatNear(265.6).t
const LEAP_LAND = LEAP + 0.78
const LOST = 276

/** The hero: forward to the mast, bound there straining, and back aft. */
const hero: Move[] = [
  onDeck(walk(HELM_AT, MAST_AT, TO_MAST[0], TO_MAST[1]), TO_MAST[0], TO_MAST[1]),
  onDeck((t) => {
    const s = strainAt(t)
    return [MAST_AT[0] + s, MAST_AT[1] - Math.abs(s) * 0.25]
  }, TO_MAST[1], TO_HELM[0]),
  onDeck(walk(MAST_AT, HELM_AT, TO_HELM[0], TO_HELM[1]), TO_HELM[0], TO_HELM[1]),
]

/** Men 2 and 3 go forward to the empty places of 4 and 5, to make room at the mast; man 2 comes back when it is over. */
const fwd2: Pt = seat(4)
const fwd3: Pt = seat(5)
const r = 0.13 * MAN_SIZE

const man0: Move[] = [onDeck(man0At, HAUL[0], TO_HELM[1] + 0.4, r)]
const man2: Move[] = [
  onDeck(walk(seat(2), fwd2, 251.8, 253.3), 251.8, 253.3, r),
  onDeck(walk(fwd2, fwd2, 253.3, TO_HELM[0]), 253.3, TO_HELM[0], r),
  onDeck(walk(fwd2, seat(2), TO_HELM[0], TO_HELM[1] + 0.6), TO_HELM[0], TO_HELM[1] + 0.6, r),
]

/** Man 3: forward, onto the bow, and over. */
const bowTop: Pt = [1.95, -0.62]
const leapFrom = lazy((): Pt => onShip(shipPose(LEAP), bowTop))
const leapTo = lazy((): Pt => [leapFrom()[0] + 2.4, 0.3])
const man3: Move[] = [
  onDeck(walk(seat(3), fwd3, 251.6, 253.0), 251.6, 253.0, r),
  onDeck(walk(fwd3, fwd3, 253.0, LEAP - 1.1), 253.0, LEAP - 1.1, r),
  onDeck((t) => {
    // Up onto the bow's cap: along the deck and up its rise, eased.
    const u = Math.max(0, Math.min(1, (t - (LEAP - 1.1)) / 1.1))
    const s = u * u * (3 - 2 * u)
    return lerpPt(fwd3, bowTop, s)
  }, LEAP - 1.1, LEAP, r),
  later(LEAP, LEAP_LAND, 'fly', () => fly(leapFrom(), leapTo(), LEAP, LEAP_LAND)),
  later(LEAP_LAND, LOST, 'roll', () => roll([leapTo(), [leapTo()[0] + 0.5, 2.2], [leapTo()[0] + 0.9, 7.5]], LEAP_LAND, LOST, 'out')),
]

/** The binding's line, the block and the turns over him: drawn over the balls. */
const binding = standing('sirens-binding', region(380, -8, 490, 4, 3), TO + 2, null, (g) => {
  if (g.t < TO_MAST[0] || g.t > TO + 1) return
  drawBinding(g)
})

/** The rocks and the Sirens: behind the ship. */
const rocks = standing('sirens-rocks', region(405, -10, 480, 6, 3), 600, (g) => drawRocks(g))

export const sirens: Scene = {
  key: 'sirens',
  from: FROM,
  to: TO,
  weather: [
    [254.5, 0.12],
    [272, 0.1],
  ],
  ships: {
    0: {
      x: shipX,
      look: (t) => ({
        // The wind drops: the sail comes in over the first bars, and they row on the beat.
        sail: 1 - smooth(t, 251.6, 254.4),
        stroke: strokeAt(t),
      }),
    },
  },
  hero,
  men: { 0: man0, 2: man2, 3: man3 },
  deaths: { 3: LOST },
  shots: [
    { t: 253.6, cells: 10.5, off: [0.7, -1.3] },
    { t: 256.4, cells: 7.5, off: [0.15, -1.0] },
    { t: 259.4, cells: 9, off: [0.5, -1.4] },
    { t: 262.2, cells: 17, off: [3.2, -3.0] },
    { t: 265.0, cells: 11, off: [1.7, -1.4] },
    { t: 267.4, cells: 10.5, off: [1.0, -0.5] },
    { t: 270.4, cells: 8, off: [0.1, -1.05] },
    { t: 274.0, cells: 11, off: [0.9, -1.4] },
    { t: 276.6, cells: 13, off: [1.6, -1.6] },
  ],
  back: [rocks],
  mid: [binding],
}

/** For the checks: the strikes this scene lands on the beat (the turns closing over him, his strains, the leap). */
export const SIRENS_STRIKES = { coils: COILS, leap: LEAP, beats: BEATS.filter((b) => b.t >= FROM && b.t < TO).length }
