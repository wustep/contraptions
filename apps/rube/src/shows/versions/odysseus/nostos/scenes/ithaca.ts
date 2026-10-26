import { M } from '../music'
import type { Scene } from '../scene'
import { WINDOWS } from '../voyage'
import { SHUTTLE } from './ithaca/geo'

/**
 * Ithaca, that same night (the theme's second statement, 36.06 to 71.42): the island dark in its sea under the moon,
 * the palace cut open, the suitors at their bench in the hall, Telemachus on the terrace looking out to sea, Argos
 * asleep by the gate, and upstairs, Penelope at her loom, her shuttle crossing on the theme's notes, unpicking by night
 * what she wove by day. The camera comes in from the sea to her loom. It is the place he is coming home to, set out
 * before he leaves Troy: everyone who will be there at the end is here now, and the camera goes the road he will take
 * home, up from the cliff past the dog to the hall and the bow, so that when he comes, the way is known.
 */
export const ithaca: Scene = {
  key: 'ithaca',
  from: WINDOWS.ithaca[0],
  to: WINDOWS.ithaca[1],
  // The horse's beach fades into Ithaca's night.
  dissolves: [[M.second, 2.2]],
  shots: [
    // The island low in the frame under the night and the moon, the lit house on it the one bright thing.
    { t: M.second, cells: 25, at: [818.8, -10.2], cut: true },
    // Then in, and along the road he will come home by, east to west, in one move: the fishermen's hoist over the cliff
    // he will come up, the old dog asleep on his straw by the gate, the courtyard, the hall's door and its hearth.
    { t: 44.4, cells: 3.3, at: [808.6, -9.75] },
    // Argos framed as he will be when he knows him (`home.ts`), asleep.
    { t: 47.4, cells: 2.6, at: [810.1, -9.62] },
    { t: 48.4, cells: 2.6, at: [810.3, -9.62] },
    { t: 51.8, cells: 3.4, at: [818.9, -9.8] },
    // The hall's west end: the suitors at the bench, the bow on its stand, the axes lying in their trench; and over
    // them, alone on the terrace, the son looking out to sea.
    { t: 56.6, cells: 3.35, at: [824.7, -10.1] },
    // Up into her room.
    { t: SHUTTLE[7] + 0.3, cells: 2.5, at: [820.25, -11.45] },
    { t: M.answer - 0.4, cells: 2.2, at: [820.0, -11.42] },
  ],
}
