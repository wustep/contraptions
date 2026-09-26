import { stub } from '../stub'

/**
 * STUB (builder: road). The road, 205.92 → 242.34: the drive to the competition, late; the rental car; the crash on the stop-time breaks (227.15 to 233.99); crawling out. The stage changes to Carnegie on 242.34.
 * See dev/BUILD_BRIEF.md for the part: its slot, its entry and exit, what it strikes, who is in it.
 */

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const CRASH_HITS: number[] = []

export const crash = stub('crash', 18)
