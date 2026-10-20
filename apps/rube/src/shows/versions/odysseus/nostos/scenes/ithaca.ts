import { M } from '../music'
import type { Scene } from '../scene'
import { WINDOWS } from '../voyage'
import { SHUTTLE } from './ithaca/geo'

/**
 * Ithaca, that same night (the theme's second statement, 36.06 to 71.42): the island dark in its sea under the moon,
 * the palace cut open, the suitors at their bench in the hall, Telemachus on the terrace looking out to sea, Argos
 * asleep by the gate, and upstairs, Penelope at her loom, her shuttle crossing on the theme's notes, unpicking by night
 * what she wove by day. The camera comes in from the sea to her loom. It is the place he is coming home to, set out
 * before he leaves Troy: everyone who will be there at the end is here now.
 */
export const ithaca: Scene = {
  key: 'ithaca',
  from: WINDOWS.ithaca[0],
  to: WINDOWS.ithaca[1],
  // The horse's beach fades into Ithaca's night.
  dissolves: [[M.second, 2.2]],
  shots: [
    { t: M.second, cells: 24, at: [818.5, -5.6], cut: true },
    { t: 43.2, cells: 20, at: [819.6, -6.4] },
    // The palace, cut open: everyone at once.
    { t: 50.4, cells: 4.6, at: [822.7, -10.45] },
    // The hall's west end: the bow on its stand, the axes lying in their trench, the suitors at the bench.
    { t: 56.1, cells: 3.0, at: [824.2, -9.75] },
    // Up into her room.
    { t: SHUTTLE[7] + 0.3, cells: 2.5, at: [820.25, -11.45] },
    { t: M.answer - 0.4, cells: 2.2, at: [820.0, -11.42] },
  ],
}
