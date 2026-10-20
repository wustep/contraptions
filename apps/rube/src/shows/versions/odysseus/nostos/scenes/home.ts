import { M } from '../music'
import type { Scene } from '../scene'
import { END, WINDOWS } from '../voyage'
import { HOME, TRIAL } from './ithaca/geo'
import { heroMoves, ithacaActors } from './ithaca/people'
import { ITHACA_SET } from './ithaca/set'

/**
 * Home (418 to the end): up the cliff, the dog, the hall, the trial of the bow, the reckoning, the two of them; and the
 * west.
 *
 * - 418      ashore on Ithaca's beach; along the sand into the fishermen's basket; up the cliff with the stones going
 *            down past him; out onto the top beside an old dog on his straw.
 * - 428.8    Argos lifts his head; at 430.23 his tail goes once; where the music drops to nothing (431.57) he lays
 *            his head down and does not breathe again.
 * - 432.6    Telemachus comes out of the gate to the stranger beside the dog: they touch (437.26), and go in.
 * - 441.12   Penelope leaves her loom and watches from the head of the stairs.
 * - 450.58   Telemachus trips the first axe; the twelve come upright one from the next, east to west.
 * - 458, 467.6, 476.6   three suitors climb into her room, out onto the terrace, drop through the light well onto the
 *            bow's plate, and it does not give.
 * - 485.45   he climbs the stairs a step a note, comes up into her room beside her (489.26), and goes out past her.
 * - 494.74   the swell: he drops onto the plate, it goes down, and the bow sings. Antinous runs.
 * - 500.79   he rolls off the plate: the bow looses, and the arrow goes through all twelve eyes and out of the door.
 * - 503.15   the hall empties into the dark; Penelope comes down the stairs a step a note; they meet (508.96).
 * - 512.68   the west: the skiff, the two of them, the sun going down ahead; their son on the cliff behind.
 */
export const home: Scene = {
  key: 'home',
  from: WINDOWS.home[0],
  to: END,
  hero: heroMoves(),
  actors: ithacaActors(),
  back: [ITHACA_SET],
  dissolves: [[TRIAL.fade, 2.6]],
  shots: [
    // Up the cliff with him.
    { t: 420.9, cells: 6.5, off: [0.6, -1.4] },
    { t: HOME.top, cells: 5.0, off: [0.8, -0.9] },
    // Argos.
    { t: HOME.sees, cells: 2.5, at: [809.75, -9.62] },
    { t: HOME.dies + 2.5, cells: 2.3, at: [809.75, -9.58] },
    // His son comes out to him.
    { t: TRIAL.touch, cells: 2.6, at: [809.9, -9.6] },
    // In through the gate, the courtyard, to the hall's threshold.
    { t: TRIAL.inside, cells: 3.4, at: [819.2, -9.75] },
    // The hall: the axes come up.
    { t: 449.6, cells: 3.4, at: [821.6, -9.7] },
    { t: 457.6, cells: 3.4, at: [823.4, -9.7] },
    // The whole house, cut open, for the tries.
    { t: 460.5, cells: 4.8, at: [823.1, -10.4] },
    { t: 481.5, cells: 4.6, at: [823.0, -10.35] },
    // His climb, and her room.
    { t: 485.2, cells: 3.2, at: [820.9, -10.1] },
    { t: 489.4, cells: 2.4, at: [821.5, -11.15] },
    { t: TRIAL.out + 0.6, cells: 2.6, at: [823.6, -10.95] },
    { t: TRIAL.edge, cells: 3.0, at: [825.6, -10.3] },
    // The swell: the drop, the bow drawn, her at her door.
    { t: M.last + 0.4, cells: 3.3, at: [825.0, -9.95] },
    { t: TRIAL.loose - 1.4, cells: 3.4, at: [824.6, -9.95] },
    // The arrow's whole flight, bow to door.
    { t: TRIAL.loose - 0.2, cells: 4.9, at: [822.4, -9.75] },
    { t: TRIAL.erupts + 1.5, cells: 4.9, at: [822.6, -9.8] },
    // The two of them.
    { t: TRIAL.meet + 0.6, cells: 2.5, at: [820.7, -9.55] },
    { t: TRIAL.fade - 0.1, cells: 2.3, at: [820.65, -9.5] },
    // The west: the harbour, their son on the jetty, the skiff casting off; then away with them towards the sun.
    { t: TRIAL.fade, cells: 5.4, at: [842.9, -1.7], cut: true },
    { t: 519, cells: 5.4, at: [843.6, -1.75] },
    { t: END, cells: 6.2, at: [850.0, -2.2] },
  ],
}
