import type { Pt, Seg } from '../../../../../parts'
import { box, part, scenery, type Company, type PartShot, type Slot } from '../kit'
import { lawnDraw, lawnOver } from './set'
import { bankAt, BRUSHES, DEG, hannahAt, hannahLook, louiseLanes, RUN, SEES_FROM, SEES_TO, SEES_TOUCHES, SWING_AT as AT, SWING_TOUCHES } from './swing'

/**
 * The lawn by the lake (the LAWN builder's): the swing on the great tree's long limb, the bank behind it rising toward
 * the glass house (out of the picture; its lamps come on over the bank at dusk), the grey lake, the fog on the water,
 * the far pines. The far shore sits where the room's long window has it, so at the cuts in from the dawn and out to
 * the bed the same shore holds still behind her while the room becomes the lawn and back. Two legs:
 *
 *   swing  22.111 → 59.362  Hannah's childhood. First a child's game, come back to me: she hops down off the still
 *                           seat (23.174) and runs off along the grass toward the water, her mother a step after her;
 *                           turns with a skip at the far end (25.136) and runs back under the seat into her (27.196);
 *                           and is up on the seat again (28.241). Then one machine: a pendulum a bar long. Louise, on
 *                           the bank behind it, rises to the seat at the back of every arc and pushes it on the chord
 *                           (her first push from the still swing on 30.273); half a bar on, once Hannah is a girl and
 *                           the arcs are high (the second voice), she reaches the leaves at the end of the limb. The
 *                           year goes round in the tree: summer, autumn, a winter's bare boughs, spring; on the back of
 *                           the spring's last arc the picture cuts to the room years on, where Hannah is a teenager.
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
    // She ends on the bank behind the back of the spring's last arc, where the cut to the room years on finds her.
    const end = bankAt(32.5 * DEG)
    return {
      cells: box(-4, -6, 6, 1),
      exit: [end[0] - AT[0] + 0.5, end[1] - AT[1]] as Pt,
      lane: { segs, fire: SWING_TOUCHES[0].t - slot.begin },
      state: { begin: slot.begin },
      company: hannah(AT, slot),
    }
  },
  () => {
    const o = AT
    const k = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - o[0], y - o[1]], w: 1 })
    const cut = (t: number, cells: number, x: number, y: number): PartShot => ({ ...k(t, cells, x, y), cut: true })
    // At the cut to the room years on: on the bank behind the back of the spring's last arc, the seam's framing.
    const seam = bankAt(32.5 * DEG)
    return [
      // Close at the seam, as the dawn left it, while Hannah sits on the still seat;
      k(RUN.off, 4.6, 60.55, -0.95),
      // in and along the grass with her as she runs off toward the water, Louise a step after her at the frame's left,
      // the whole of the run in it, held while she turns and runs back into her mother (wide, both were specks);
      k(RUN.off + 1.3, 3.4, 61.55, -0.82),
      k(RUN.into - 0.3, 3.45, 61.45, -0.84),
      // and back in to the swing as she hops up onto it, for the first push.
      k(RUN.on + 0.6, 4.75, 60.45, -1.0),
      // Opening just enough for the arc as it grows, on the trunk side, where she pushes: she stays large, and
      // Hannah on the seat grows from a child to a girl in plain sight.
      k(34.5, 5.0, 60.25, -1.08),
      k(38.5, 5.25, 60.12, -1.1),
      // Then a year in four shots, each season cut in on her push at the back of the arc, where the swing is still: the
      // childhood as the film tells it, a montage. Autumn, on the second voice: in close and low on the push, the arc
      // running out of the frame and back into it, the turning leaves at its front knocked loose.
      cut(38.609, 3.6, 60.2, -1.05),
      k(46.25, 3.75, 60.15, -1.05),
      // Winter: out under the whole tree, bare.
      cut(46.353, 8.0, 59.7, -2.55),
      k(55.35, 7.6, 59.75, -2.45),
      // Spring: the whole arc again, from her on the bank to the leaves coming back at its front; then in on the two of
      // them at the back of its last arc, where the cut to the room years on carries the framing.
      cut(55.449, 5.4, 60.1, -1.1),
      k(56.9, 5.3, 59.6, -1.2),
      k(59.362, 4.6, seam[0] + 1.05, seam[1] - 0.95),
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
      // Held as the cut left it while the vision opens out of the ring (`score.ts`, the dissolves): a frame laid over
      // a moving one doubles whatever moves.
      k(251.6, 4.6, SEES_FROM[0] + 1.05, SEES_FROM[1] - 0.95),
      // Close: her and Hannah large, the arc and the leaves at its front.
      k(252.9, 5.3, 60.2, -1.2),
      k(255.0, 5.4, 60.15, -1.2),
      // And still again, her at rest, before it closes back into the ring.
      k(end - 1.5, 4.6, SEES_TO[0] + 1.05, SEES_TO[1] - 0.95),
      k(end, 4.6, SEES_TO[0] + 1.05, SEES_TO[1] - 0.95),
    ]
  },
)

/**
 * Every strike on the lawn: Hannah's run (off the seat, the skip at the far end, into her mother on the chord, back up
 * onto the seat), Louise's pushes on the chords (her first from the bottom), the leaves half a bar on once the arcs reach
 * them; in the vision her push and the leaves on the chord.
 */
export const LAWN_HITS: number[] = [
  RUN.off,
  RUN.turn,
  RUN.into,
  RUN.on,
  ...SWING_TOUCHES.map((x) => x.t),
  ...BRUSHES.map((b) => b.t),
  ...SEES_TOUCHES.map((x) => x.t),
].filter((t, i, all) => all.indexOf(t) === i).sort((a, b) => a - b)
