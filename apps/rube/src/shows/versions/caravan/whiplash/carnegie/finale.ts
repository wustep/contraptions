import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { KICKS } from '../music'
import type { KitStroke } from '../stub'
import { F_BACK, F_WALK, NOD } from './conductor'
import { CHORD_HIT, CUT, F_FLY, F_LEAP, F_SEATED, ROLL, STICKS_UP } from './finale-clock'
import { FRAME_STROKES, drawFinaleRig, headAt } from './finale-rig'
import { FLOOR_SEAT, Path, RACK_SEAT, SNARE_SEAT } from './path'
import { CLOSE, KIT_AT } from './stage'

/**
 * Carnegie Hall, 504.0 → the end: the burst, the kick drum's march, the long roll and Fletcher's nod, the last fill,
 * the silence, the band's last chord, the fist. Then the hall goes dark under the credits. The director's.
 *
 * - **The burst (504.0).** He lands on the snare off the metronome's rod, and plays the kick drum's march alone,
 *   bouncing round the toms on its loudest strokes, while the metronome goes down into the stage behind him and the
 *   drummer's frame comes down out of the flies over the kit, as it did for the solo.
 * - **Into the frame (510.34).** He leaps up into its cup on a big kick, and it plays: the shin every kick, the toms
 *   on the loud ones, the hi-hat between (`finale-rig.ts`).
 * - **The long roll (518.8 → 534.9).** Both sticks on the snare, a blur, swelling. Fletcher comes down off his
 *   podium and across to the kit and rises on his column until his head is level with Andrew's; he nods, slowly,
 *   once; Andrew nods back; Fletcher goes back to his podium (`conductor.ts`).
 * - **The last fill**, round the cymbals and down the toms, to the last stroke (541.49): both sticks come up and are
 *   held there, high, through the silence. Fletcher's hands come up, open; the band's horns come up.
 * - **The chord (543.25).** Everything at once: the crash and the ride, the kick, the band lit, Fletcher's downbeat.
 *   A cymbal roll under it while it swells.
 * - **The fist (548.555).** Fletcher's hand closes; both sticks come down on the last stroke, and stop dead. The
 *   cymbals are choked. The hall goes dark round the frame, the ball still in its cup, and the credits come up.
 *
 * The frame is Carnegie's (`stage.ts`).
 */

/** The kick at the burst (the rubato has the snare there), and his own bounces round the kit before he is in the frame. */
const ALONE: KitStroke[] = ([
  { t: 505.0, piece: 'rack' },
  { t: 506.0, piece: 'floor' },
  { t: 506.57, piece: 'floor' },
  { t: 506.9, piece: 'rack' },
  { t: 507.78, piece: 'snare' },
  { t: 508.77, piece: 'rack' },
  { t: 509.72, piece: 'snare' },
  { t: F_LEAP, piece: 'snare' },
] as KitStroke[]).map((s) => ({ ...s, t: KICKS.reduce((a, b) => (Math.abs(b.t - s.t) < Math.abs(a - s.t) ? b.t : a), s.t) }))

export const FINALE_KIT: KitStroke[] = [
  { t: KICKS.find((o) => Math.abs(o.t - 504.0) < 0.03)?.t ?? 504.0, piece: 'kick' as const },
  ...ALONE,
  ...FRAME_STROKES.map((s) => ({ t: s.t, piece: s.piece })),
].sort((a, b) => a.t - b.t)
export const FINALE_HITS: number[] = [...new Set(FINALE_KIT.map((s) => s.t))].sort((a, b) => a - b)

/** A point of the kit's frame in the part's. */
const at = (q: Pt): Pt => [KIT_AT[0] + q[0], KIT_AT[1] + q[1]]
const seat = (piece: KitStroke['piece']): Pt => (piece === 'rack' ? RACK_SEAT : piece === 'floor' ? FLOOR_SEAT : SNARE_SEAT)

function lane(begin: number, end: number): Path {
  const path = new Path(begin, SNARE_SEAT)
  let from: KitStroke['piece'] = 'snare'
  for (const s of ALONE) {
    // Round the toms on the march's big strokes: a real throw between drums, a bounce on the same one.
    if (s.piece === from) path.hop(seat(s.piece), s.t, 12, 0.12, 0.4)
    else path.hop(seat(s.piece), s.t, 12, 0.4, 1.0)
    from = s.piece
  }
  // Up into the cup, a real throw that tops out over it and drops in; then his head, as the frame moves it.
  const T = F_SEATED - F_LEAP
  path.hop(at(headAt(F_SEATED)), F_SEATED, 12, Math.max(0.95, (22 * T * T) / 8))
  path.ride((t) => at(headAt(t)), CUT + 0.5, 60)
  path.ride((t) => at(headAt(t)), end, 4)
  return path
}

function shots(slot: { begin: number; end: number }): PartShot[] {
  const k = (t: number, cells: number, hold: Pt): PartShot => ({ t, cells, hold, w: 1 })
  return [
    { t: slot.begin, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
    // Round the toms, the metronome going down behind; up to see the frame come down out of the flies.
    k(505.2, 5.4, [-1.7, -0.6]),
    k(F_FLY[0] + 0.6, 7.2, [-1.5, -2.0]),
    k(F_FLY[1], 7.0, [-1.4, -2.1]),
    // In the frame: the march.
    k(F_SEATED + 0.4, 6.0, [-1.2, -1.7]),
    k(514.6, 5.2, [-1.0, -1.5]),
    // The roll: in on the sticks and his head; Fletcher comes; the two heads; the nod.
    k(ROLL[0], 4.8, [-0.9, -1.5]),
    k(F_WALK[0] + 1.6, 6.4, [0.6, -1.5]),
    k(F_WALK[1] + 1.2, 5.0, [0.2, -2.1]),
    k(NOD[0], 4.4, [0.15, -2.3]),
    k(NOD[1] + 0.9, 4.3, [0.05, -2.3]),
    // Fletcher goes back: the whole stage, his father at the door, the band waiting in the dark.
    k(F_BACK[0] + 2.2, 9.2, [-1.9, -1.2]),
    // The last fill, close; the sticks up in the silence.
    k(ROLL[1] + 0.6, 5.4, [-1.0, -1.6]),
    k(539.8, 5.4, [-0.9, -1.7]),
    k(STICKS_UP, 5.8, [-0.8, -1.9]),
    // Back through the silence to the band: the chord, everything at once, and the fist.
    k(CHORD_HIT - 0.2, 11.0, [3.0, -2.4]),
    k(CHORD_HIT + 2.6, 10.2, [2.7, -2.3]),
    k(CUT, 7.4, [1.7, -2.0]),
    // Still, and slowly back as the hall goes dark under the credits.
    k(CUT + 3.5, 7.6, [1.6, -2.0]),
    k(slot.end, 10.5, [1.8, -2.6]),
  ]
}

export const finale = part<{ begin: number }>(
  {
    name: 'finale',
    draw: (p, s, c) => {
      const T = s.begin + c.t
      p.push()
      p.translate(KIT_AT[0] * c.k, KIT_AT[1] * c.k)
      drawFinaleRig(p, c, T)
      p.pop()
    },
  },
  (slot) => {
    const path = lane(slot.begin, slot.end)
    const segs = path.segs
    // The part's exit is where he rests at the end: in the cup.
    const exit = segs[segs.length - 1].to
    return {
      cells: box(-5, -7, 4, 3),
      exit: [exit[0] + 0.5, exit[1]] as Pt,
      lane: { segs, fire: ALONE[0].t - slot.begin },
      state: { begin: slot.begin },
    }
  },
  shots,
)
