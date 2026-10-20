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
 * the surf, half sunk and listing, left for Poseidon; far up on its hill, Troy's red walls and the gate tower. The
 * Trojans have come down to it in their hundreds (`troy/crowd.ts`). Ropes made fast to its sledge run up the beach to
 * the men hauling on them, and on the theme's four strongest notes they take it up out of the surf over a road of logs:
 * a lurch, a slow settle, and a cheer, four times. Between the second heave and the third they test it: four spears
 * driven up through its rump into its belly, a thrust a note, the last a finger from his face. Inside it, cut open on
 * our side, he and six of his men are packed in its belly, thrown about by each heave and pressed from each point.
 *
 * This scene also owns everything in Troy that the next one does not: the drawings, every ball's moves from the first
 * frame to the last man aboard, and the ships, through the night while the camera is away at Ithaca (when nothing of
 * Troy is seen, and the horse is brought up to the temple).
 */

const shots: Key[] = [
  // Wide: the beach, the horse small in the surf, the Trojans come down to it in their hundreds, the walls on the hill,
  // the sun going down over the sea.
  { t: 0, cells: 22, at: [-11.9, -6.6] },
  { t: 4.5, cells: 21, at: [-11.3, -6.3] },
  // In on the haul: the ropes, the men on them walking it up out of the surf.
  { t: 11, cells: 11, at: [-6.9, -3.2] },
  { t: 16.0, cells: 8.5, at: [-6.6, -2.5] },
  // On a note, close: its flank and its belly, the spearmen at its rump, and the men packed in the dark inside it.
  { t: 18.03, cells: 3.8, at: [-6.35, -1.55], cut: true },
  { t: 22.5, cells: 3.5, at: [-6.15, -1.7] },
  // The last spear, in close by his face.
  { t: 25.0, cells: 2.9, at: [-5.85, -1.85] },
  { t: 26.6, cells: 2.95, at: [-5.85, -1.85] },
  // On the third heave, out: the haul going on up the beach towards the walls in the last of the light.
  { t: 26.97, cells: 9.5, at: [-9.6, -2.9], cut: true },
  { t: 31.4, cells: 11, at: [-11.4, -3.6] },
  { t: 35.2, cells: 15, at: [-14.5, -5.0] },
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
