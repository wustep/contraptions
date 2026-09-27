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

function contactShots(): PartShot[] {
  const b = nearestBeat
  return [
    // The threshold in the dark (the seam's framing), then back as they go in and the glass comes up.
    { t: T.in + 0.9, cells: 4.3, hold: on(T.in + 0.9, 0.95, -0.75) },
    { t: T.wake - 1.2, cells: 7.4, hold: [3.9, -1.9] },
    { t: T.wake + 0.6, cells: 9.6, hold: [6.2, -2.9] },
    // They come out of the white: the whole of it, held.
    { t: T.abbott + 2.2, cells: 12.6, hold: [8.4, -4.0] },
    { t: T.costello + 2.4, cells: 13.2, hold: [9.0, -4.2] },
    { t: T.board0 - 0.02, cells: 13.0, hold: [8.9, -4.15] },
    // The board up, in her suit: nothing answers. Then the suit, closer.
    { t: T.board0, cells: 6.2, hold: [5.6, -1.9], cut: true },
    { t: T.suit + 0.2, cells: 5.0, hold: on(T.suit, 0.55, -1.0) },
    { t: T.suit + 1.3, cells: 4.7, hold: on(T.suit, 0.9, -0.95) },
    // To the glass alone; the palm.
    { t: T.palm - 0.4, cells: 5.0, hold: [7.35, -1.0] },
    { t: T.palm + 2.2, cells: 4.4, hold: [7.3, -0.85] },
    // The first logogram over them, and on her first board it lifts off, read, and goes up over the glass.
    { t: T.first + 1.0, cells: 8.6, hold: [7.9, -2.75] },
    { t: T.first + 2.4, cells: 8.9, hold: [7.7, -2.85] },
    { t: b(159.126), cells: 9.4, hold: [6.6, -3.0] },
    { t: TOUCHES[0] + 1.6, cells: 9.8, hold: [7.4, -3.1] },
    // Her second board, close: then back to see what she read go up into the dark.
    { t: BOARDS[2].t, cells: 5.0, hold: [4.9, -1.0], cut: true },
    { t: b(166.615), cells: 6.4, hold: [5.1, -1.8] },
    { t: TOUCHES[1] - 0.2, cells: 9.2, hold: [6.2, -2.9] },
    { t: BOARDS[3].t + 1.5, cells: 10.0, hold: [5.8, -3.1] },
    { t: TOUCHES[2] + 1.0, cells: 10.4, hold: [5.6, -3.2] },
    // Faster, fuller: the lexicon filling the dark.
    { t: b(186.073), cells: 11.0, hold: [5.5, -3.4] },
    { t: b(191.843), cells: 11.3, hold: [5.4, -3.45] },
    { t: b(193.817), cells: 11.4, hold: [5.4, -3.45] },
    // "Weapon": in on it.
    { t: T.weapon + 0.6, cells: 6.2, hold: [7.35, -1.55] },
    { t: T.out - 0.05, cells: 4.2, hold: [REST + 0.85, -0.7] },
  ]
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
