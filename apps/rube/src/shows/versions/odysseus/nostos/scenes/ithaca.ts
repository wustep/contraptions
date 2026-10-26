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
    // The island low in the frame under the night and the moon, the lit house on it the one bright thing; and one even
    // move in from the sea to the house, which reads as lit and inhabited well before it fills the frame.
    { t: M.second, cells: 25, at: [818.8, -10.2], cut: true },
    // The palace, cut open: everyone at once.
    { t: 50.4, cells: 4.6, at: [822.7, -10.45] },
    // The hall's west end: the suitors at the bench, the bow on its stand, the axes lying in their trench; and over
    // them, alone on the terrace, the son looking out to sea.
    { t: 56.1, cells: 3.3, at: [825.0, -10.1] },
    // Up into her room.
    { t: SHUTTLE[7] + 0.3, cells: 2.5, at: [820.25, -11.45] },
    { t: M.answer - 0.4, cells: 2.2, at: [820.0, -11.42] },
  ],
}
