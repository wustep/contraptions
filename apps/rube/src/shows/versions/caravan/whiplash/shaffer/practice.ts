import { stub } from '../stub'

/**
 * STUB (builder: room). Shaffer, 0 → 30.65 (the drum intro, alone; the bass from 21.11): the practice room at night, the film's first shot. Andrew alone at the old kit at the end of a dark corridor; Fletcher in the doorway on the bass's entrance; out after him as the band comes in.
 * See dev/BUILD_BRIEF.md for the part: its slot, its entry and exit, what it strikes, who is in it.
 */

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const PRACTICE_HITS: number[] = []

export const practice = stub('practice', 9)
