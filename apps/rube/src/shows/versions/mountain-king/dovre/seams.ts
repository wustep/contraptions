import type { Pt } from '../../../../parts'
import { CODA, P } from './music'

/**
 * Where every part stands in the mountain and how the ball crosses from one to the next: the director's contract
 * with the builders. **Keep to it.** A part is built in its own frame (it enters at (-0.5, 0), moving right), and
 * `score.ts` lays it where the last one left the ball; `exit` is where this part hands the ball on, so these exits
 * are what make the mountain's shape. A part laid `mirror` is built exactly as any other and turned over left to
 * right in the world (its drawing, lane, camera keys and company all turn): never rely on its handedness (no
 * writing, no light that must come from the world's left).
 *
 * The mountain in cross-section (world cells, y down; the gate's entry is 0, 0):
 *
 *   - the flank outside, climbing to the troll gate high on the mountain's west side (gate, 0 → 22.3);
 *   - tunnels down from the gate to the hall's west door (deep, 22.3 → 40.2);
 *   - the Mountain King's hall, floor at world y 8, from x 40 to 70, the throne near x 56 (court, wake);
 *   - under the hall, three levels, each reached by a drop through the floor above: the mine (y 17, running back
 *     west, mirrored), the trolls' drum (y 25, running east), the mountain's heart (y 33, running west, mirrored);
 *   - the chimney, from the heart straight up through the drum, the mine and the hall, to the summit (y ≈ -20), and
 *     out into the dawn (fall, the director's).
 *
 * So every level Peer has passed through lies over the heart, and when the mountain comes down he rises through all
 * of them. **Keep your set inside your footprint**, in your own frame, so the levels do not draw over each other.
 */

/** How the ball leaves a part (and so how the next one takes it). */
export type SeamKind =
  /**
   * At rest on a flat floor (centre at y = 0 of the exit cell, the floor's top at y = R), eased to rest in the last
   * half second before and out of rest in the first after. The seam is a phrase's first note, so arriving there is a
   * soft strike (a last tiptoe landing). The Woman in Green, when she is there, rests `WOMAN_LEAD` ahead of him.
   */
  | 'rest'
  /**
   * Dropped: the ball lands on the next part's entry, (-0.5, 0) of its frame, exactly at the seam time (the phrase's
   * downbeat: a strike, and the next part's first), falling straight down (no sideways motion) for at least the last
   * 0.25 s. The outgoing part owns the hole and the fall; the incoming part owns what he lands on.
   */
  | 'drop'
  /** Between two parts one builder owns: theirs to choose. */
  | 'own'

export interface PartPlan {
  name: string
  /** Show seconds the ball arrives and leaves. */
  begin: number
  end: number
  /** Where the part hands the ball on, in its own frame (the lane ends at `exit - [0.5, 0]`). */
  exit: Pt
  /** Laid right to left in the world. */
  mirror: boolean
  /** How the ball leaves. */
  out: SeamKind
  /** The box the part's set (its room) lives in, its own frame (cells): x0, y0, x1, y1. */
  footprint: [number, number, number, number]
  /** The shaft a 'drop' part owns below its room, down to the next level's floor, its own frame. */
  shaft?: [number, number, number, number]
  /** Who builds it. */
  builder: 'gate' | 'deep' | 'hall' | 'mine' | 'drum' | 'heart' | 'director'
}

export const PLAN: Record<'gate' | 'deep' | 'court' | 'wake' | 'mine' | 'drum' | 'gears' | 'runaway', PartPlan> = {
  gate: { name: 'gate', begin: 0, end: P[2], exit: [22, -4], mirror: false, out: 'rest', footprint: [-10, -13, 24, 4], builder: 'gate' },
  deep: { name: 'deep', begin: P[2], end: P[4], exit: [18, 12], mirror: false, out: 'rest', footprint: [-1, -4, 19, 13], builder: 'deep' },
  // The hall is one room for both of the hall's parts: `hall/hall.ts` draws it from court's frame, x -2 to 30.
  court: { name: 'court', begin: P[4], end: P[6], exit: [16, 0], mirror: false, out: 'own', footprint: [-2, -12, 30, 1.5], builder: 'hall' },
  wake: { name: 'wake', begin: P[6], end: P[8], exit: [12, 9], mirror: false, out: 'drop', footprint: [-1, -12, 14, 1.5], shaft: [10.5, 1.5, 12.5, 9], builder: 'hall' },
  mine: { name: 'mine', begin: P[8], end: P[10], exit: [22, 8], mirror: true, out: 'drop', footprint: [-1, -7, 23, 1], shaft: [20.5, 1, 22.5, 8], builder: 'mine' },
  drum: { name: 'drum', begin: P[10], end: P[12], exit: [16, 8], mirror: false, out: 'drop', footprint: [-1, -6.5, 17, 1], shaft: [14.5, 1, 16.5, 8], builder: 'drum' },
  // The heart is one room for both of its parts, in gears' frame x -1 to 15 (runaway's entry is gears' exit).
  gears: { name: 'gears', begin: P[12], end: P[16], exit: [10, 0], mirror: true, out: 'own', footprint: [-1, -6.5, 15, 3], builder: 'heart' },
  runaway: { name: 'runaway', begin: P[16], end: CODA, exit: [4, 0], mirror: true, out: 'drop', footprint: [-6, -6.5, 5, 3], builder: 'heart' },
}

/** The camera at every builder's seam, on both sides of it: following the ball, a little above it, 6 cells tall. */
export const SEAM_SHOT = { cells: 6, off: [0, -0.5] as Pt }

/** At a 'rest' seam where she is with him, the Woman in Green rests this far ahead of Peer (centre to centre, same floor). */
export const WOMAN_LEAD = 1.0
