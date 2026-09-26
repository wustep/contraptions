import { FLOOR, type Pt } from '../../../../../parts'

/**
 * The piano, and the room it stands in, as numbers every builder shares. The
 * same piano is Seb's at the start, Lipton's in the dream (the room changes
 * round it under a closing spotlight), and Seb's again at the end, so these
 * are fixed: the opening part draws it, Lipton's is built round it, and the
 * finale draws it again where the room stands at the end.
 *
 * All in the piano's own frame: the opening part's origin. A cell is about
 * a quarter of a metre at the keys; the piano is the stage's giant, and the
 * room is built at the scale of the balls who sit at its tables.
 */
export const PIANO = {
  /** Width of a white key. The ball (radius 0.13) is a finger's width more. */
  keyW: 0.22,
  /** The lowest and highest keys (MIDI): C3 to E6, 24 white keys. */
  low: 48,
  high: 88,
  /** Left edge of the lowest white key. */
  x0: 0,
  /** The white keys' top: a ball resting on a white key has its centre at y = 0. */
  whiteTop: FLOOR,
  /** A black key stands this much higher: a ball on one sits this much higher. */
  blackRise: 0.07,
  /** The case, left to right, and the top of the raised lid. */
  caseX0: -0.5,
  caseX1: 5.78,
  lidTop: -3.4,
  /** Where the legs stand: the top of the low stage the piano is on. */
  stage: 2.6,
  /** The room's floor, where the tables and chairs stand (the stage is a step up). */
  floor: 3.1,
}

const WHITE = [0, 2, 4, 5, 7, 9, 11]

/** Whether a MIDI note is a black key. */
export const isBlack = (midi: number): boolean => !WHITE.includes(((midi % 12) + 12) % 12)

/** A note folded by octaves into the piano's range. */
export function fold(midi: number): number {
  let m = midi
  while (m < PIANO.low) m += 12
  while (m > PIANO.high) m -= 12
  return m
}

/** How many white keys lie wholly below `midi`, from the lowest. */
function whitesBelow(midi: number): number {
  let n = 0
  for (let m = PIANO.low; m < midi; m++) if (!isBlack(m)) n++
  return n
}

/** The centre of a key, x, in the piano's frame. A black key sits over the gap between its neighbours. */
export function keyX(midi: number): number {
  const m = fold(midi)
  const w = PIANO.keyW
  return isBlack(m) ? PIANO.x0 + whitesBelow(m) * w : PIANO.x0 + (whitesBelow(m) + 0.5) * w
}

/** Where a ball rests on a key: its centre. */
export function keyRest(midi: number): Pt {
  const m = fold(midi)
  return [keyX(m), isBlack(m) ? -PIANO.blackRise : 0]
}

/**
 * Where the opening leaves the thread at the hush (61.777 s), and Lipton's picks it up: the phrase before the hush
 * runs up the keyboard in a flourish (58.4 to 61.8 s), and he ends it on the top key, E6. The opening's `exit` is
 * this plus [0.5, 0].
 */
export const HUSH_KEY = 88
export const OPENING_END: Pt = keyRest(HUSH_KEY)
