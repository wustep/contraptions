import { stub } from '../stub'

/**
 * STUB (builder: band). Shaffer, 30.65 → 80.79 (the band's tune): the studio band's room. Fletcher conducts; Tanner has the kit; Andrew, the alternate, turns his pages.
 * See dev/BUILD_BRIEF.md for the part: its slot, its entry and exit, what it strikes, who is in it.
 */

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const BAND_HITS: number[] = []

export const band = stub('band', 14)
