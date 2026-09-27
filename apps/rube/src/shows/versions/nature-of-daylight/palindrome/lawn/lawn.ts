import type { Pt, Seg } from '../../../../../parts'
import { box, part, scenery, type Company, type PartShot, type Slot } from '../kit'
import { lawnDraw, lawnOver } from './set'
import { BRUSHES, hannahAt, hannahLook, LANDS, LEAP, louiseLanes, SEES_FROM, SEES_TO, SEES_TOUCHES, SWING_AT as AT, SWING_TOUCHES } from './swing'

/**
 * The lawn by the lake (the LAWN builder's): the swing on the great tree's long limb, the bank behind it rising toward
 * the glass house (out of the picture; its lamps come on over the bank at dusk), the grey lake, the fog on the water,
 * the far pines. The far shore sits where the room's long window has it, so at the cuts in from the dawn and out to
 * the bed the same shore holds still behind her while the room becomes the lawn and back. Two legs:
 *
 *   swing  22.111 → 71.953  Hannah's childhood, in one machine. A pendulum a bar long: Louise, on the bank behind it,
 *                           rises to the seat at the back of every arc and pushes it on the chord (her first push from
 *                           the still swing on the beat 24.131); half a bar on, once Hannah is a girl and the arcs are
 *                           high (the second voice), she reaches the leaves at the end of the limb. The year goes round
 *                           in the tree: summer, autumn, a winter's bare boughs, spring. From the top of the last big
 *                           arc she leaps (61.365), up out through the leaves and down on the beat (62.357), and runs
 *                           back; Louise catches the empty seat (63.286) and steadies it as Hannah climbs back on
 *                           (68.011); the swing settles, still, as the light goes.
 *   sees   250.120 → 257.683 What Louise is shown in the fog: the same swing on a summer evening, Hannah grown, well,
 *                           going already; Louise pushes (254.108) and Hannah reaches the leaves on the chord (255.866).
 *
 * The whole place (and the swing itself) is drawn by `lawnSet` from show time, so the two legs, which are the same
 * place years apart, share one tree; the parts only carry Louise and Hannah.
 */

export { SWING_AT } from './swing'

/** Every cell the lawn claims (the house's world, far from the room). */
export const LAWN_CELLS: Pt[] = box(40, -14, 80, 6, 2)

export const lawnSet = scenery<null>({ name: 'lawn-set', draw: (p, _s, c) => lawnDraw(p, c.k, c.t), over: (p, _s, c) => lawnOver(p, c.k, c.t) })

/** The vision's first moment: the swing at the back of its arc, Louise at rest a cell behind it on the bank. */
export const SEES_AT: Pt = [SEES_FROM[0] + 0.5, SEES_FROM[1]]

const shift = (segs: Seg[], o: Pt): Seg[] =>
  segs.map((s) => ({ ...s, from: [s.from[0] - o[0], s.from[1] - o[1]] as Pt, to: [s.to[0] - o[0], s.to[1] - o[1]] as Pt }))

const hannah = (o: Pt, slot: Slot): Company[] => [
  {
    who: 'hannah',
    from: slot.begin,
    to: slot.end,
    at: (t) => {
      const h = hannahAt(t)
      return h ? { x: h.x - o[0], y: h.y - o[1], scale: h.scale, spin: hannahLook(t) } : null
    },
  },
]

interface State {
  begin: number
}
const nothing = () => {}

/** The childhood. */
export const swing = part<State>(
  { name: 'lawn-swing', draw: nothing },
  (slot) => {
    const segs = shift(louiseLanes().swing, AT)
    return {
      cells: box(-4, -6, 6, 1),
      exit: [0, 0] as Pt,
      lane: { segs, fire: SWING_TOUCHES[0].t - slot.begin },
      state: { begin: slot.begin },
      company: hannah(AT, slot),
    }
  },
  () => {
    const o = AT
    const k = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - o[0], y - o[1]], w: 1 })
    return [
      // Close at the seam, as the dawn left it; held while she goes to the seat and gives the first push.
      k(23.2, 4.6, 60.55, -0.95),
      k(25.0, 4.7, 60.45, -1.0),
      // Opening just enough for the arc as it grows, on the trunk side, where she pushes: she stays large, and
      // Hannah on the seat grows from a child to a girl in plain sight.
      k(30.3, 4.9, 60.35, -1.05),
      k(34.5, 5.1, 60.2, -1.1),
      k(38.6, 5.3, 60.1, -1.1),
      // The height: the whole arc, from her on the bank to the leaves Hannah reaches at its front.
      k(46.4, 5.45, 60.05, -1.1),
      k(60.6, 5.55, 60.1, -1.1),
      // The leap's space: out to where she lands, then in again as she runs back.
      k(61.6, 6.25, 60.95, -1.3),
      k(62.7, 6.5, 61.3, -1.35),
      k(63.6, 6.2, 61.3, -1.25),
      k(64.7, 5.5, 61.2, -1.1),
      k(68.2, 5.0, 60.6, -1.0),
      k(71.953, 4.6, 60.55, -0.95),
    ]
  },
)

/** What she sees. */
export const sees = part<State>(
  { name: 'lawn-sees', draw: nothing },
  (slot) => {
    const segs = shift(louiseLanes().sees, SEES_AT)
    return {
      cells: box(-3, -6, 7, 1),
      exit: [SEES_TO[0] - SEES_AT[0] + 0.5, SEES_TO[1] - SEES_AT[1]] as Pt,
      lane: { segs, fire: SEES_TOUCHES[0].t - slot.begin },
      state: { begin: slot.begin },
      company: hannah(SEES_AT, slot),
    }
  },
  (slot) => {
    const o = SEES_AT
    const k = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - o[0], y - o[1]], w: 1 })
    const end = slot.end
    return [
      k(250.7, 4.65, SEES_FROM[0] + 1.08, SEES_FROM[1] - 0.98),
      // Close: her and Hannah large, the arc and the leaves at its front.
      k(252.6, 5.3, 60.2, -1.2),
      k(255.9, 5.4, 60.15, -1.2),
      k(end, 4.6, SEES_TO[0] + 1.05, SEES_TO[1] - 0.95),
    ]
  },
)

/**
 * Every strike on the lawn: her pushes on the chords (her first from the bottom, on the beat 24.131), the leaves
 * half a bar on once the arcs reach them, the leap and its landing, the catch, the steadying; in the vision her push
 * and the leaves on the chord.
 */
export const LAWN_HITS: number[] = [
  ...SWING_TOUCHES.map((x) => x.t),
  ...BRUSHES.map((b) => b.t),
  LEAP,
  LANDS,
  ...SEES_TOUCHES.map((x) => x.t),
].filter((t, i, all) => all.indexOf(t) === i).sort((a, b) => a - b)
