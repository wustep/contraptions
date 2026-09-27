import type { Pt } from '../../../../../parts'
import { box, part, scenery, type PartShot, type Slot } from '../kit'
import { nearestBeat } from '../music'
import { BLINKS, drawChamber, drawChamberOver } from './set'
import { BOARDS, FRANTIC, LOGOS, REST, T, TOUCHES, WAYS, ianAt, laneOf, louiseAt } from './plan'

/**
 * Inside the shell (the CHAMBER builder's): the chamber and the glass. Contact, the heart of the film: the glass wakes,
 * the heptapods come out of the white, she tries with her board, takes off her suit and goes to the glass alone, and
 * a palm of seven fingers meets her there; then the language as a machine, her board and their rings back and forth
 * on the chords, every ring she reads lifting over the glass to hang lit in the dark above her, until "weapon". And the
 * bomb: the charge at the foot of the glass, Abbott's warning, the blast, the glass broken, the white coming in.
 *
 * The drawing is one set by show time (`set.ts`); the clock and the geometry are in `plan.ts`.
 */

export const CHAMBER_CELLS: Pt[] = box(-12, -16, 26, 6, 2)

export const chamberSet = scenery<null>({
  name: 'chamber-set',
  draw: (p, _s, c) => drawChamber(p, c.k, c.t),
  over: (p, _s, c) => drawChamberOver(p, c.k, c.t),
})

/** The contact part's origin in the chamber's cells: she comes in at the threshold, x = 0. */
export const CONTACT_AT: Pt = [0.5, 0]
/** The bomb's: she is where contact left her, before the glass. */
export const BOMB_AT: Pt = [REST + 0.5, 0]

const nothing = { name: '', draw: () => {} }

function checkSlot(name: string, slot: Slot, a: number, b: number): void {
  if (Math.abs(slot.begin - a) > 1e-6 || Math.abs(slot.end - b) > 1e-6) console.warn(`palindrome: ${name} was built for ${a}..${b}, given ${slot.begin}..${slot.end}`)
}

/** A world-cell point moved into a part's frame. */
const into = (w: Pt, at: Pt): Pt => [w[0] - at[0], w[1] - at[1]]

export const contact = part<{ begin: number }>(
  { ...nothing, name: 'contact' },
  (slot) => {
    const ways = WAYS.contact
    checkSlot('contact', slot, ways[0].at, ways[ways.length - 1].at)
    const lane = laneOf(ways, CONTACT_AT)
    const last = ways[ways.length - 1].p
    return {
      cells: box(-2, -10, 12, 2, 2),
      exit: [last[0] - CONTACT_AT[0] + 0.5, 0],
      lane,
      state: { begin: slot.begin },
      company: [
        {
          who: 'ian',
          from: slot.begin,
          to: slot.end,
          at: (t) => {
            const q = ianAt(t)
            return q ? { x: q[0] - CONTACT_AT[0], y: q[1] - CONTACT_AT[1] } : null
          },
        },
      ],
    }
  },
  () => contactShots().map((s) => ({ ...s, hold: s.hold ? into(s.hold, CONTACT_AT) : undefined })),
)

export const bomb = part<{ begin: number }>(
  { ...nothing, name: 'bomb' },
  (slot) => {
    const ways = WAYS.bomb
    checkSlot('bomb', slot, ways[0].at, ways[ways.length - 1].at)
    const lane = laneOf(ways, BOMB_AT)
    const last = ways[ways.length - 1].p
    return {
      cells: box(-10, -8, 4, 2, 2),
      exit: [last[0] - BOMB_AT[0] + 0.5, 0],
      lane,
      state: { begin: slot.begin },
      company: [
        {
          who: 'ian',
          from: slot.begin,
          to: slot.end,
          at: (t) => {
            const q = ianAt(t)
            return q ? { x: q[0] - BOMB_AT[0], y: q[1] - BOMB_AT[1] } : null
          },
        },
      ],
    }
  },
  () => bombShots().map((s) => ({ ...s, hold: s.hold ? into(s.hold, BOMB_AT) : undefined })),
)

/* ------------------------------------------------------------------ the camera, in world cells */

/** Her position at `t`, plus an offset: a hold that frames her. */
const on = (t: number, dx: number, dy: number): Pt => {
  const q = louiseAt(t) ?? [0, 0]
  return [q[0] + dx, q[1] + dy]
}

/**
 * Contact's shot plan. Set-ups, cut on the strikes: close on her at the threshold, following them in; a medium toward
 * the glass as it wakes; one wide that holds both heptapods whole, head to foot, over the tiny humans; close for the
 * board and the suit; a close two-shot of her and the palm through the glass; then the exchange as shot and reverse
 * shot, her side (the board, the plate, the frieze of what she has read) on each board, the glass (her touch, their
 * answer, the two of them whole) on each touch; the lexicon complete, wide; in on "weapon"; and down to the seam. She is
 * always about a third of the way up the frame.
 */
const HER_SIDE = { cells: 8, hold: [2.5, -1.33] as Pt }
const THE_GLASS = { cells: 9, hold: [8.6, -2.05] as Pt }
function contactShots(): PartShot[] {
  const keys: PartShot[] = [
    // The threshold in the dark (the seam's framing), following them in as the light comes down the floor to them.
    { t: T.in + 0.9, cells: 4.3, hold: on(T.in + 0.9, 0.9, -0.72) },
    { t: T.in + 3.6, cells: 4.5, hold: on(T.in + 3.6, 0.95, -0.75) },
    { t: T.wake - 0.1, cells: 4.6, hold: on(T.wake - 0.1, 1.0, -0.77) },
    // The glass wakes: toward it, from behind them.
    { t: T.wake, cells: 6.5, hold: [6.3, -1.08], cut: true },
    { t: T.abbott - 0.1, cells: 6.3, hold: [6.3, -1.05] },
    // Out of the white: both of them whole, over the two small figures before the glass.
    { t: T.abbott, cells: 10.4, hold: [8.9, -1.73], cut: true },
    { t: T.board0 - 0.1, cells: 10.0, hold: [8.8, -1.67] },
    // The board, and the suit: close.
    { t: T.board0, cells: 3.8, hold: [4.35, -0.63], cut: true },
    { t: nearestBeat(146.141), cells: 3.8, hold: [4.45, -0.63] },
    // To the glass alone, the limb coming down to meet her.
    { t: T.palm - 0.25, cells: 4.3, hold: [6.3, -0.72] },
    // The palm: hand to hand through the glass, close, held.
    { t: T.palm, cells: 3.1, hold: [7.72, -0.05], cut: true },
    { t: T.first - 0.1, cells: 3.0, hold: [7.62, -0.05] },
    // The first logogram, the two of them side by side before it.
    { t: T.first, cells: THE_GLASS.cells, hold: THE_GLASS.hold, cut: true },
    { t: BOARDS[1].t - 0.1, cells: THE_GLASS.cells * 0.97, hold: [THE_GLASS.hold[0] - 0.1, THE_GLASS.hold[1] + 0.03] },
  ]
  // The exchange: her side on each board, the glass on each touch.
  const turns: { t: number; side: 'her' | 'glass' }[] = [
    { t: BOARDS[1].t, side: 'her' },
    { t: TOUCHES[0], side: 'glass' },
    { t: BOARDS[2].t, side: 'her' },
    { t: TOUCHES[1], side: 'glass' },
    { t: BOARDS[3].t, side: 'her' },
    { t: TOUCHES[2], side: 'glass' },
    { t: BOARDS[4].t, side: 'her' },
    { t: TOUCHES[4], side: 'glass' },
    { t: BOARDS[5].t, side: 'her' },
  ]
  turns.forEach((turn, i) => {
    const s = turn.side === 'her' ? HER_SIDE : THE_GLASS
    const next = turns[i + 1]?.t ?? BOARDS[6].t
    keys.push({ t: turn.t, cells: s.cells, hold: s.hold, cut: true })
    // A breath in while it holds.
    keys.push({ t: next - 0.1, cells: s.cells * 0.97, hold: [s.hold[0] + (turn.side === 'her' ? 0.1 : -0.1), s.hold[1] + 0.03] })
  })
  keys.push(
    // The lexicon complete: everything at once, wide; she reads it back, and asks.
    { t: BOARDS[6].t, cells: 10.5, hold: [5.8, -2.35], cut: true },
    { t: nearestBeat(194.81), cells: 10.2, hold: [6.0, -2.25] },
    // "Weapon": in on it.
    { t: T.weapon, cells: 4.2, hold: [7.45, -0.56], cut: true },
    { t: T.out - 0.05, cells: 4.2, hold: [REST + 0.85, -0.7] },
  )
  return keys
}

function bombShots(): PartShot[] {
  const find: Pt = [6.05, -0.35]
  return [
    // Abbott at the glass: up to him.
    { t: T.slam + 1.8, cells: 5.8, hold: [7.2, -1.55] },
    // The charge, found: low and close.
    { t: T.find, cells: 2.9, hold: find, cut: true },
    { t: T.frantic - 0.02, cells: 3.0, hold: [find[0] - 0.05, find[1] - 0.05] },
    // Abbott writing, the charge running out.
    { t: T.frantic, cells: 7.2, hold: [7.35, -2.3], cut: true },
    { t: T.blast - 0.05, cells: 7.0, hold: [7.2, -2.25] },
    // The blast: after her, back down the chamber; the room held wide while the light goes, then in on her as the
    // white comes for her.
    { t: T.blast + 1.3, cells: 8.2, hold: [2.4, -1.9] },
    { t: T.shard + 0.3, cells: 7.3, hold: [2.0, -1.7] },
    { t: T.flood + 0.3, cells: 6.1, hold: [0.2, -1.1] },
    { t: T.fog - 0.05, cells: 5, hold: on(T.fog - 0.05, 0.6, -0.7) },
  ]
}

/* ------------------------------------------------------------------ the strikes */

const beat = (t: number) => nearestBeat(t)
export const CHAMBER_HITS: number[] = [
  // Contact: the glass's first light; it wakes as she comes up to it; Abbott; Costello; her board, in her suit.
  T.kindle,
  T.wake,
  T.abbott,
  T.costello,
  T.board0,
  // The suit off; the palm; Ian's suit off; the first logogram.
  T.suit,
  T.palm,
  T.ianSuit,
  T.first,
  // The exchange: every board up, every touch answered, every ring read lifting off.
  ...BOARDS.map((b) => b.t),
  ...TOUCHES,
  ...LOGOS.filter((l) => l.lift !== null).map((l) => l.lift as number),
  // The bomb: the slam; the charge's light on the beats; found; Abbott's bursts; the blast; the long shard; the flood.
  T.slam,
  ...BLINKS.filter((t) => Math.abs(beat(t) - t) < 0.02).map(beat),
  T.find,
  ...FRANTIC.bursts,
  T.blast,
  // After it: the white's light failing in steps, the long shard coming down on the chord, the rest of the glass going.
  beat(225.309),
  beat(226.232),
  T.shard,
  T.flood,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)
