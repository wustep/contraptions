import { R } from '../../../../../parts'
import { region, standing } from '../draw'
import { M } from '../music'
import { fly, rest, ride, roll, type Move, type Pt } from '../path'
import type { Scene } from '../scene'
import { seat, WINDOWS } from '../voyage'
import { later, lazy, STRIKE } from './sirens/course'
import { oarsAt } from './storm'
import { CRACK, bowHalf, drawHull, halfAngle, onHalf, setFrozenStroke, sternHalf, type Half } from './wreck/hull'
import { setBoltAhead } from './storm/weather'
import { AGROUND, drawSpar, FLOAT, onSpar, POLE, sparAngle, sparX } from './wreck/spar'

/**
 * The wreck (the cut at 304.611 → the hush at 352.6: what is left after the tutti). The bolt has cracked the ship at the
 * mast. The mast goes over towards the bow and lies down on the water; the bow half dives, the stern half rears, and
 * its deck tips him forward: he rolls down it, off the broken edge, and drops onto the floating mast. His last three men
 * are thrown into the sea; through the quiet after the cut they go down slowly under him, into the dark under the
 * cutaway, and are gone as the low voices come back.
 *
 * He rides the spar through what is left of the storm; when the low voices come back (323.3) the seas stand up again,
 * at their greatest, and the camera stands back to see one man on a stick on all of it; when they go (342) it calms to
 * grey. On the cue's last attack (350.43) the spar runs into the shallows of an island's beach and stops dead, and he is
 * thrown along it and off onto the sand, and rolls, and stops, in the hush.
 */

const [FROM, TO] = WINDOWS.wreck
const HELM_AT: Pt = [-1.15, -0.35]
setFrozenStroke(oarsAt(STRIKE))
setBoltAhead(sparX)

/** A ball carried on a half of the hull at `p` (ship frame), turned with it. */
const onHalfRide = (half: (t: number) => Half, p: Pt, t0: number, t1: number): Move =>
  ride((t) => onHalf(t, half, p), t0, t1, (t) => halfAngle(t, half))

/** His roll down the stern half's tipping deck, from the helm to the broken edge, gathering speed. */
const ROLL_AT = STRIKE + 0.95
const EDGE_X = CRACK - 0.13
const DECK_ACC = 6
const OFF = ROLL_AT + Math.sqrt((2 * (EDGE_X - HELM_AT[0])) / DECK_ACC)
const LAND = OFF + 0.45
/** Where he sits on the spar: a little aft of its middle, on top of it. */
const SEAT_D = POLE / 2 - 0.35
const SEAT_H = 0.05 + R

const hero: Move[] = [
  onHalfRide(sternHalf, HELM_AT, STRIKE, ROLL_AT),
  ride(
    (t) => {
      const s = Math.max(0, t - ROLL_AT)
      return onHalf(t, sternHalf, [HELM_AT[0] + 0.5 * DECK_ACC * s * s, HELM_AT[1]])
    },
    ROLL_AT,
    OFF,
    (t) => {
      const s = Math.max(0, t - ROLL_AT)
      return halfAngle(t, sternHalf) + (0.5 * DECK_ACC * s * s) / R
    },
  ),
  later(OFF, LAND, 'fly', () => fly(onHalf(OFF, sternHalf, [EDGE_X, HELM_AT[1]]), onSpar(LAND, SEAT_D, SEAT_H), OFF, LAND)),
  ride((t) => onSpar(t, SEAT_D, SEAT_H), LAND, AGROUND, sparAngle),
  // Aground: thrown forward along the spar by the stop, off its end onto the sand, and rolling to rest.
  later(AGROUND, TO - 0.12, 'roll', () =>
    roll(
      [
        onSpar(AGROUND, SEAT_D, SEAT_H),
        onSpar(AGROUND, POLE - 0.1, SEAT_H),
        [655.7, -0.31],
        [656.4, -0.35],
        [660, -0.35],
      ],
      AGROUND,
      TO - 0.12,
      'out',
    ),
  ),
  rest([660, -0.35], TO - 0.12, TO),
]

/**
 * A man thrown from his half into the sea at `throwAt`, landing `dx` along, and going down slowly till he is lost. The
 * sea that carries the spar carries him too, a little slower (`carry`), so through the quiet after the cut the three of
 * them go down into the dark under the cutaway beneath him, falling behind, turning over slowly.
 */
function thrown(man: number, half: (t: number) => Half, throwAt: number, dx: number, flight: number, lost: number, carry: number): Move[] {
  const from = lazy(() => onHalf(throwAt, half, seat(man)))
  const splash = lazy((): Pt => [from()[0] + dx, 0.32])
  const land = throwAt + flight
  const way = Math.sign(dx || 1)
  const span = lost - land
  return [
    onHalfRide(half, seat(man), STRIKE, throwAt),
    later(throwAt, land, 'fly', () => fly(from(), splash(), throwAt, land)),
    ride(
      (t) => {
        const s = Math.max(0, t - land)
        const [sx, sy] = splash()
        return [sx + (sparX(t) - sparX(land)) * carry + 0.12 * way * Math.sin(s * 0.5), sy + 4.4 * Math.pow(s / span, 1.7)]
      },
      land,
      lost,
      (t) => 0.35 * way * Math.max(0, t - land),
    ),
  ]
}

const LOST: [number, number, number] = [STRIKE + 19.5, STRIKE + 18.5, STRIKE + 17.5]

const hull = standing('wreck-hull', region(520, -4, 560, 30, 3), 700, (g) => drawHull(g))
const spar = standing('wreck-spar', region(520, -4, 670, 4, 3), 700, (g) => drawSpar(g))

/**
 * The light over the wreck, over the base plan's storm: a little lift in what is left after the cut, the darkest of it
 * when the seas stand up again, and the base plan's grey and Ogygia's white after.
 */
const lifted = { top: '#283034', low: '#535C5E', cloud: '#363D40', cover: 0.9, far: '#46504F', near: '#253032', body: '#1C2628', deep: '#060909', lit: '#8C9797', edge: '#101718' }
const darkest = { top: '#191D1F', low: '#353C3E', cloud: '#252A2C', cover: 0.95, far: '#353E40', near: '#1A2224', body: '#141C1E', deep: '#030505', lit: '#77817F', edge: '#090D0E' }

export const wreck: Scene = {
  key: 'wreck',
  from: FROM,
  to: TO,
  sky: [
    { t: 312, ...lifted },
    { t: 320.5, ...lifted },
    { t: M.lowBack + 3, ...darkest },
    { t: 338, ...darkest },
  ],
  weather: [
    [STRIKE + 0.6, 0.86],
    [310, 0.66],
    [320, 0.56],
    [M.lowBack + 2.5, 1.0],
    [338.5, 0.95],
    [M.lowGone + 2.5, 0.3],
    [349, 0.1],
  ],
  hero,
  men: {
    2: thrown(2, bowHalf, STRIKE + 0.45, 1.0, 0.5, LOST[2], 0.985),
    1: thrown(1, sternHalf, STRIKE + 0.7, 0.25, 0.45, LOST[1], 0.97),
    0: thrown(0, sternHalf, STRIKE + 0.85, -1.1, 0.6, LOST[0], 0.955),
  },
  deaths: { 0: LOST[0], 1: LOST[1], 2: LOST[2] },
  shots: [
    { t: STRIKE + 0.9, cells: 9.5, at: [533.2, -0.6] },
    { t: 308.6, cells: 9.5, off: [0.3, 0.7] },
    // In the quiet after the cut, in close, looking down through the cut: him alone on the spar at the top of the frame,
    // and under him in the dark water his last three men going down, falling behind, until the dark has them.
    { t: 313.6, cells: 6.2, off: [-0.6, 1.25] },
    { t: 319.4, cells: 6.4, off: [-0.9, 1.35] },
    // As the low voices come back, out and out to the seas at their highest.
    { t: 322.4, cells: 6.4, off: [0.6, -0.8] },
    { t: 325.6, cells: 10, off: [1.2, -2.2] },
    { t: 330.4, cells: 13, off: [1.8, -2.8] },
    { t: 335.0, cells: 22, off: [4.0, -4.4] },
    { t: 339.6, cells: 13, off: [2.2, -2.4] },
    { t: 344.6, cells: 11, off: [1.8, -1.9] },
    { t: 348.6, cells: 10, off: [1.3, -1.4] },
    { t: 351.4, cells: 7.6, at: [659.4, -1.2] },
  ],
  mid: [hull, spar],
}

/** For the checks: the moments this scene strikes. */
export const WRECK_STRIKES = { strike: STRIKE, float: FLOAT, aground: AGROUND, lowBack: M.lowBack, lowGone: M.lowGone }
