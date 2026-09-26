import type { Pt } from '../../../../../parts'
import { box, part, type Companion, type PartShot, type Pose } from '../kit'
import { bar, beat, CUT } from '../music'
import { CUTS } from '../seams'
import { CHAIR } from '../props/chairs'
import { drawFacadeFront } from './front-house'
import { FRONT_OVER, lookAt } from './front'
import { BLOWS, BRAKE, CART, CHAIR_LIFT, CHAIRS, FOLD, HALT, P, PANE_AT, PRINT_AT, PRINTS, RAISE, SHOVE, SWINGS, TREADS, W } from './front-plan'
import { crouch, cubic, flight, pieces, trace, type Path } from './front-motion'
import { drawChairsIn, drawChairsOut, drawRig } from './fixup-rig'

/**
 * FIXUP (21.577 to 49.644, waltz bars 5 to 31): the house builder's. They come running out of the church and up the
 * street to the old house, grey and falling down, with two new armchairs waiting on its lawn. She leaps onto their
 * cart; he runs into its handle and it starts (bar 6), its mast shooting up in two stages on the pahs. Then the
 * first great machine of the show: he pushes it along the front of the house in a waltz's lilt, its trip hammer
 * striking the old wall on every downbeat, and the rollers on the mast leave the house new behind them, roof and
 * all. On the way the jib swings his chair and then hers off the lawn and in through the empty bay (bars 10 and
 * 12); the hammer knocks the door straight on its hinges (12); the bay's missing pane slides home (13); the last
 * blow falls on the mailbox's post (17), and past the house the rollers fold down (18) as she hops for joy (19).
 * The cart stops with him under the mailbox (20): she presses her round print into its wet paint (21) and he his
 * square one beside it (22). She leaps over him (23) and leads him up the steps and in; she sits (27), the door
 * shuts behind him (28), and he sits beside her (29). The soft bars are the breath: side by side in their chairs,
 * looking out through the new window, the camera coming to them: the cut to the hill (`CUTS.hill`).
 *
 * The house, and all it keeps (the chairs, the prints, the patched roof, the dusk), is the set's (`front.ts`); the
 * machine is `fixup-rig.ts`; where and when is `front-plan.ts`.
 */

const T0 = CUT.house
const T1 = CUT.hill

/* ------------------------------------------------------------------ Carl */

/** He comes in at the church's run and spends it into the cart's handle. */
const V_IN = CUTS.house.v[0]
const V_HIT = 0.9
const HANDLE = W(SHOVE) + CART.carl
const XE = HANDLE - ((V_IN + V_HIT) / 2) * (SHOVE - T0)
const ACC = (V_IN - V_HIT) / (SHOVE - T0)

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const FIXUP_AT: Pt = [XE + 0.5, 0]

/** The steps as he and she climb them: off the path, onto each tread's middle, onto the porch. */
const TAKEOFF: Pt = [TREADS[1].x1 + 0.17, 0]
const ON: Pt[] = [
  [(TREADS[1].x0 + TREADS[1].x1) / 2, TREADS[1].y - 0.13],
  [(TREADS[0].x0 + TREADS[0].x1) / 2, TREADS[0].y - 0.13],
  [TREADS[0].x0 - 0.2, P - 0.13],
]
const SEATED = (x: number): Pt => [x, P + CHAIR.sit]
const FLOOR = P - 0.13

const C = {
  stop: W(HALT) + CART.carl,
  up: PRINT_AT.carl - 0.4,
  press: PRINT_AT.carl,
  off: PRINT_AT.carl + 0.09,
  down: beat('waltz', 22, 2),
  dropAt: [PRINTS.carl[0] - 0.22, 0] as Pt,
  walk: 40.9,
  hops: [beat('waltz', 24, 3), bar('waltz', 25), beat('waltz', 25, 2), beat('waltz', 25, 3)],
  front: 1.86,
  seatUp: 46.2,
  sit: bar('waltz', 29),
}

const carl: Path = pieces([
  [SHOVE, (T) => [XE + V_IN * (T - T0) - 0.5 * ACC * (T - T0) ** 2, 0]],
  [HALT, (T) => [W(T) + CART.carl, 0]],
  [C.up, () => [C.stop, 0]],
  [C.press, (T) => flight(T, C.up, [C.stop, 0], C.press, PRINTS.carl)],
  [C.off, () => PRINTS.carl],
  [C.down, (T) => flight(T, C.off, PRINTS.carl, C.down, C.dropAt)],
  [C.walk, () => C.dropAt],
  [C.hops[0], (T) => [cubic(T, C.walk, C.dropAt[0], 0, C.hops[0], TAKEOFF[0], -1.0), 0]],
  [C.hops[1], (T) => flight(T, C.hops[0], TAKEOFF, C.hops[1], ON[0])],
  [C.hops[2], (T) => flight(T, C.hops[1], ON[0], C.hops[2], ON[1])],
  [C.hops[3], (T) => flight(T, C.hops[2], ON[1], C.hops[3], ON[2])],
  [C.seatUp, (T) => [cubic(T, C.hops[3], ON[2][0], -1.1, C.seatUp, C.front, 0), FLOOR]],
  [C.sit, (T) => flight(T, C.seatUp, [C.front, FLOOR], C.sit, SEATED(CHAIRS.carl))],
  [Infinity, () => SEATED(CHAIRS.carl)],
])

/* ------------------------------------------------------------------ Ellie */

const DECK = CART.deckY - 0.13
const E = {
  jump: bar('waltz', 5),
  land: beat('waltz', 5, 3),
  joy: bar('waltz', 19),
  up: PRINT_AT.ellie - 0.34,
  press: PRINT_AT.ellie,
  leap: 39.6,
  leapLand: bar('waltz', 23),
  leapTo: [7.75, 0] as Pt,
  hops: [41.2, bar('waltz', 24), beat('waltz', 24, 2), beat('waltz', 24, 3)],
  front: CHAIRS.ellie + 0.14,
  seatUp: 44.15,
  sit: bar('waltz', 27),
}
/** Her running start: a little quicker than him, into her leap onto the cart. */
const eRun = (T: number) => XE + CUTS.house.ellie![0] + V_IN * (T - T0) + 0.45 * (T - T0) ** 2
/** On the deck: the settle after her landing, the rock back when he shoves, the hop for joy past the house. */
function onDeck(T: number): Pt {
  const settle = 0.05 * (1 - Math.exp(-(T - E.land) / 0.1))
  const s = T - SHOVE
  const jolt = s > 0 ? -0.08 * (1 - Math.exp(-s / 0.07)) * Math.exp(-s / 0.45) : 0
  const u = (T - (E.joy - 0.38)) / 0.38
  const hop = u > 0 && u < 1 ? 0.16 * 4 * u * (1 - u) : 0
  return [W(T) + CART.ellie + settle + jolt, DECK - hop]
}
const deckEnd = onDeck(E.up)
const ellie: Path = pieces([
  [E.jump, (T) => [eRun(T), 0]],
  [E.land, (T) => flight(T, E.jump, [eRun(E.jump), 0], E.land, [W(E.land) + CART.ellie, DECK])],
  [E.up, onDeck],
  [E.press, (T) => flight(T, E.up, deckEnd, E.press, PRINTS.ellie)],
  [E.leap, () => PRINTS.ellie],
  [E.leapLand, (T) => flight(T, E.leap, PRINTS.ellie, E.leapLand, E.leapTo)],
  [E.hops[0], (T) => [cubic(T, E.leapLand, E.leapTo[0], (E.leapTo[0] - PRINTS.ellie[0]) / (E.leapLand - E.leap), E.hops[0], TAKEOFF[0], -1.25), 0]],
  [E.hops[1], (T) => flight(T, E.hops[0], TAKEOFF, E.hops[1], ON[0])],
  [E.hops[2], (T) => flight(T, E.hops[1], ON[0], E.hops[2], ON[1])],
  [E.hops[3], (T) => flight(T, E.hops[2], ON[1], E.hops[3], ON[2])],
  [E.seatUp, (T) => [cubic(T, E.hops[3], ON[2][0], -0.98, E.seatUp, E.front, 0), FLOOR]],
  [E.sit, (T) => flight(T, E.seatUp, [E.front, FLOOR], E.sit, SEATED(CHAIRS.ellie))],
  [Infinity, () => SEATED(CHAIRS.ellie)],
])

/* ------------------------------------------------------------------ how he holds himself */

function carlPose(T: number): { tilt?: number; squash?: number } {
  if (T < HALT + 0.6) {
    // Leaning into the push as the cart surges, a jolt of squash on the shove, leaning back as it stops.
    const v = (W(T + 0.03) - W(T - 0.03)) / 0.06
    const s = T - SHOVE
    const squash = s > 0 ? 0.14 * Math.exp(-s / 0.1) : 0
    const back = Math.exp(-(((T - HALT) / 0.35) ** 2))
    return { tilt: s < 0 ? 0 : Math.min(1, s / 0.15) * (0.06 + 0.1 * Math.min(1, v / 1.1)) - 0.1 * back, squash }
  }
  if (T > C.up - 0.16 && T < C.up) return { tilt: 0, squash: 0.13 * crouch(T, C.up, 0.16) }
  if (T > C.press - 0.1 && T < C.down + 0.3) {
    // Pressed flat against the wet paint; and a squash as he lands back down.
    const press = Math.exp(-(((T - (C.press + 0.03)) / 0.07) ** 2)) * 0.16
    const land = T > C.down ? 0.12 * Math.exp(-(T - C.down) / 0.1) : 0
    return { tilt: 0, squash: press + land }
  }
  if (T > C.sit) {
    // Into his chair: a small sink, settling.
    const s = T - C.sit
    return { tilt: 0, squash: 0.13 * Math.exp(-s / 0.22) * Math.cos(Math.min(Math.PI / 2, s * 3)) }
  }
  // Gathering himself before each hop; a little squash on each landing.
  const takeoffs = [C.hops[0], C.hops[1], C.hops[2], C.seatUp]
  const landings = [C.hops[1], C.hops[2], C.hops[3]]
  let squash = 0
  for (const t of takeoffs) squash += 0.12 * crouch(T, t)
  for (const t of landings) if (T > t) squash += 0.09 * Math.exp(-(T - t) / 0.08)
  return squash > 0.001 ? { squash } : {}
}

/* ------------------------------------------------------------------ the strikes */

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const FIXUP_HITS: number[] = [
  E.land,
  SHOVE,
  ...RAISE,
  ...BLOWS,
  CHAIR_LIFT.carl[2],
  CHAIR_LIFT.ellie[2],
  PANE_AT,
  ...FOLD,
  E.joy,
  BRAKE,
  PRINT_AT.ellie,
  PRINT_AT.carl,
  C.down,
  E.leapLand,
  ...E.hops.slice(1),
  ...C.hops.slice(1),
  E.sit,
  SWINGS[0].shut,
  C.sit,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

/* ------------------------------------------------------------------ the camera */

/** Keys in world cells, turned into the part's frame. */
function shotsFor(): PartShot[] {
  const at = FIXUP_AT
  const key = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - at[0], y - at[1]], w: 1 })
  const cut = SEATED(CHAIRS.carl)
  return [
    // Running in on the church's framing; easing out to take in the old house and the cart.
    key(SHOVE, 5.6, -0.1, -1.6),
    // Up with the mast, along the bay as the chairs go in.
    key(24.2, 6.2, 0.9, -1.9),
    key(26.1, 6.1, 1.7, -1.85),
    key(27.9, 6.1, 2.8, -1.85),
    key(29.5, 6.6, 4.0, -2.0),
    // Wide: the house half old, half new, the rollers as tall as it.
    key(31.6, 8.4, 5.1, -2.6),
    key(33.6, 9.6, 5.9, -2.95),
    // Past the house: the whole of it new, the cart rolling away from it, the rollers folding; then in to the mailbox.
    key(35.6, 10.0, 6.5, -2.95),
    key(38.7, 4.5, 8.85, -1.0),
    key(40.0, 4.4, 8.75, -1.05),
    // With them back to the house, up the steps and in.
    key(41.3, 5.0, 7.2, -1.35),
    key(42.9, 5.2, 5.4, -1.55),
    key(44.5, 4.5, 3.6, -1.6),
    key(46.4, 4.0, 2.55, -1.7),
    // The breath: to them in their chairs, through the new window.
    key(T1, CUTS.hill.cells, cut[0] + CUTS.hill.frame[0], cut[1] + CUTS.hill.frame[1]),
  ]
}

/* ------------------------------------------------------------------ the part */

interface FixupState {
  begin: number
}

export const fixup = part<FixupState>(
  {
    name: 'fixup',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      if (T > 100) return
      p.push()
      p.translate(-FIXUP_AT[0] * c.k, -FIXUP_AT[1] * c.k)
      drawChairsIn(p, c.k, c.weight, T)
      drawChairsOut(p, c.k, c.weight, T)
      drawRig(p, c.k, c.weight, T)
      p.pop()
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      if (T < FRONT_OVER || T >= 125) return
      p.push()
      p.translate(-FIXUP_AT[0] * c.k, -FIXUP_AT[1] * c.k)
      drawFacadeFront(p, c.k, c.weight, lookAt(T), SWINGS)
      p.pop()
    },
  },
  (slot) => {
    const breaks = [SHOVE, HALT, C.up, C.press, C.off, C.down, C.walk, ...C.hops, C.seatUp, C.sit]
    const segs = trace(carl, FIXUP_AT, slot.begin, slot.end, breaks)
    const end = carl(slot.end)
    const exit: Pt = [end[0] - FIXUP_AT[0] + 0.5, end[1] - FIXUP_AT[1]]
    const company = (T: number): Companion => {
      const [x, y] = ellie(T)
      return { x: x - FIXUP_AT[0], y: y - FIXUP_AT[1] }
    }
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: carlPose }]
    return {
      cells: box(XE - 1.5 - FIXUP_AT[0], -9.5, 13.5 - FIXUP_AT[0], 1.5),
      exit,
      lane: { segs, fire: SHOVE - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: company }],
      pose,
    }
  },
  () => shotsFor(),
)
