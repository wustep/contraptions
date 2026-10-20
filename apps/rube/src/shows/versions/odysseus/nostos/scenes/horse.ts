import type { Key } from '../camera'
import { M } from '../music'
import { ride, type Move } from '../path'
import type { Scene } from '../scene'
import { WINDOWS, seat } from '../voyage'
import { onShip } from '../world/ship'
import { troyPieces } from './troy/draw'
import { PLAN, SHIP0, SHIP1, SHIP2, consortDepth } from './troy/plan'

/**
 * Troy's beach at dusk (0 → 36.06), the theme alone and very quiet. Nolan's first image: the black horse rearing over
 * the surf, half sunk and listing, left for Poseidon; far up on its hill, Troy's red walls and the gate tower. Ropes made
 * fast to its sledge run up the beach and the hill into the open gate, and on the theme's four strongest notes the
 * Trojans, unseen, take it up the beach over a road of logs: a lurch, a slow settle, four times. Inside it, cut open on
 * our side, he and six of his men are packed in its belly, thrown about by each heave.
 *
 * This scene also owns everything in Troy that the next one does not: the drawings, every ball's moves from the first
 * frame to the last man aboard, and the ships, through the night while the camera is away at Ithaca (when nothing of
 * Troy is seen, and the horse is brought up to the temple).
 */

const shots: Key[] = [
  // Wide: the beach, the horse small in the surf, the walls on the hill, the sun going down over the sea.
  { t: 0, cells: 22, at: [-11.9, -6.6] },
  { t: 4.5, cells: 21.3, at: [-11.3, -6.3] },
  // In on the first heaves.
  { t: 11, cells: 12, at: [-5.4, -3.6] },
  { t: 16, cells: 7, at: [-4.6, -2.5] },
  // Close on the belly: the men packed in it, thrown about by the third heave.
  { t: 20.5, cells: 3.1, off: [0.25, 0.12] },
  { t: 26, cells: 2.9, off: [0.2, 0.12] },
  { t: 29.5, cells: 3.4, off: [0.1, 0.0] },
  // Back out on the last heave, so the dissolve to Ithaca comes off the horse on the beach in the last light.
  { t: 33, cells: 7, off: [-0.2, -0.6] },
  { t: 35, cells: 9.5, off: [-0.4, -1.0] },
]

/** The men of the other two ships ride them through Troy, a little smaller while their ships are out beyond his. */
function consortMen(): Partial<Record<number, Move[]>> {
  const out: Partial<Record<number, Move[]>> = {}
  for (let m = 6; m < 14; m++) {
    const ship = m < 10 ? SHIP1 : SHIP2
    const i: 1 | 2 = m < 10 ? 1 : 2
    out[m] = [ride((t) => onShip(ship.pose!(t), seat(m)), 0, 140, (t) => ship.pose!(t).a, { scale: (t) => 1 - 0.18 * consortDepth(i, t) })]
  }
  return out
}

const pieces = troyPieces()

export const horse: Scene = {
  key: 'horse',
  // Its window runs on under Ithaca's, for the ships: nothing of Troy is seen till the troy scene's cut.
  from: WINDOWS.horse[0],
  to: M.answer,
  hero: PLAN.hero,
  men: { ...PLAN.men, ...consortMen() },
  ships: { 0: SHIP0, 1: SHIP1, 2: SHIP2 },
  shots,
  back: pieces.back,
  mid: pieces.mid,
  front: pieces.front,
}
