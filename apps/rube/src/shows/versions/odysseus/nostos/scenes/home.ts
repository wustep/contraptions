import { M } from '../music'
import type { Scene } from '../scene'
import { END, WINDOWS } from '../voyage'
import type { Pt } from '../path'
import { FIGHT } from './ithaca/battle'
import { HOME, TRIAL } from './ithaca/geo'
import { heroMoves, ithacaActors } from './ithaca/people'
import { ARROW, arrowTail } from './ithaca/rig'
import { ITHACA_SET } from './ithaca/set'
import { WEST_CAM } from './ithaca/west'

/**
 * Home (418 to the end): up the cliff, the dog, the hall, the trial of the bow, the reckoning, the two of them; and the
 * west.
 *
 * - 418      ashore on Ithaca's beach; along the sand into the fishermen's basket; up the cliff with the stones going
 *            down past him; out onto the top beside an old dog on his straw.
 * - 428.8    Argos lifts his head; at 430.23 his tail goes once; where the music drops to nothing (431.57) he lays
 *            his head down and does not breathe again.
 * - 429.75   Telemachus, out of the gate at a run, stops under the olive and sees the dog know the beggar and die;
 *            then he comes to the dog's other side (437.26), and leads his father in.
 * - 441.12   Penelope leaves her loom and watches from the head of the stairs.
 * - 450.58   Telemachus trips the first axe; the twelve come upright one from the next, east to west.
 * - 458, 467.6, 476.6   three suitors climb into her room, out onto the terrace, drop through the light well onto the
 *            bow's plate, and it does not give: seen close, then whole, then past her.
 * - 485.45   he climbs the stairs a step a note, comes up into her room beside her (489.26), and goes out past her.
 * - 494.74   the swell: he drops onto the plate, it goes down, and the bow sings. Antinous goes for the son.
 * - 500.79   he rolls off the plate: the bow looses, and the camera goes with the arrow through all twelve eyes until
 *            it takes Antinous in the air as he leaps at Telemachus in the doorway (501.6).
 * - 503.15   the rest of them come at him, and the hall is a battle, a blow on each note (`battle.ts`): two thrown
 *            back over the bow, three on his way down the hall, and on the swell's hardest attack (508.96) the last
 *            three thrown out of the house; the son holds the stairs below his mother. Those who never fought give in.
 * - 509.39   Penelope comes down the stairs a step a note, and steps off them beside him on the swell's last attack
 *            (512.68); it dies away on the three of them.
 * - 514      the west: the skiff, the two of them, the sun going down ahead; their son on the cliff's edge behind.
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
    // Argos, the beggar beside him, and the son stopped under the olive, watching.
    { t: HOME.sees, cells: 2.6, at: [810.1, -9.62] },
    { t: HOME.dies + 2.5, cells: 2.45, at: [810.05, -9.58] },
    // His son comes to the dog's other side, the dead dog between them.
    { t: TRIAL.touch, cells: 2.6, at: [809.9, -9.6] },
    // In through the gate, the courtyard, to the hall's threshold.
    { t: TRIAL.inside, cells: 3.4, at: [819.2, -9.75] },
    // The hall: the axes come up; on the last one's note, in close on the plate, with the first suitor at the well's lip.
    { t: 449.6, cells: 3.4, at: [821.6, -9.7] },
    { t: 457.3, cells: 3.4, at: [823.3, -9.7] },
    { t: TRIAL.axes[11], cells: 2.5, at: [825.3, -10.05], cut: true },
    { t: 460.4, cells: 2.55, at: [825.2, -10.05] },
    // The second: the whole house, cut open, his whole way round, the beggar by the door.
    { t: 462.6, cells: 5.15, at: [822.5, -10.6] },
    { t: 468.6, cells: 5.1, at: [822.5, -10.58] },
    // The third: in on her room and the terrace as he goes past her.
    { t: 473.6, cells: 3.65, at: [823.65, -10.45] },
    { t: 478.4, cells: 3.6, at: [823.7, -10.43] },
    // His climb, and her room.
    { t: 485.2, cells: 3.2, at: [820.9, -10.1] },
    { t: 489.4, cells: 2.4, at: [821.5, -11.15] },
    { t: TRIAL.out + 0.6, cells: 2.6, at: [823.6, -10.95] },
    { t: TRIAL.edge, cells: 3.0, at: [825.6, -10.3] },
    // The swell: the drop, the bow drawn; and at its note she comes to her door over the hall, and knows him by it.
    { t: M.last + 0.4, cells: 3.3, at: [824.6, -9.95] },
    { t: TRIAL.loose - 1.4, cells: 3.75, at: [824.25, -10.1] },
    // On the loose, in close on the string; then along with the arrow, a little ahead of it, through the twelve eyes,
    // each axe shivering as it goes through, to Antinous in the air. It takes him on its note, and the camera comes to
    // rest on him as he comes down at the son's feet with it in him.
    { t: TRIAL.loose, cells: 2.3, at: [825.2, -9.6], cut: true },
    ...[0.27, 0.54].map((s) => ({ t: TRIAL.loose + s, cells: 2.3 - 0.4 * s, at: [arrowTail(TRIAL.loose + s) - ARROW - 0.4, -9.58] as Pt })),
    { t: TRIAL.strike + 0.4, cells: 1.75, at: [818.8, -9.38] },
    { t: TRIAL.erupts - 0.05, cells: 1.62, at: [818.75, -9.35] },
    // On the next, they come at him: the wall of them that pressed up against the bow, charging him at the west door.
    { t: TRIAL.erupts, cells: 4.1, at: [824.2, -10.0], cut: true },
    { t: FIGHT.first[0] - 0.05, cells: 4.0, at: [824.4, -9.98] },
    // On the first blow, in close at the west end: the first two hurled back into the hall.
    { t: FIGHT.first[0], cells: 2.7, at: [825.5, -9.82], cut: true },
    { t: FIGHT.sonHit - 0.05, cells: 2.62, at: [825.35, -9.84] },
    // On the next, the son on the stairs below his mother, driven up a step.
    { t: FIGHT.sonHit, cells: 2.5, at: [820.4, -9.92], cut: true },
    { t: FIGHT.rampage[0] - 0.05, cells: 2.45, at: [820.45, -9.92] },
    // On the next, with him: east down the hall through three of them, one on each note, past the ones he has thrown.
    { t: FIGHT.rampage[0], cells: 3.2, at: [824.85, -9.95], cut: true },
    { t: FIGHT.rampage[1], cells: 3.25, at: [823.75, -9.97] },
    { t: FIGHT.rampage[2], cells: 3.35, at: [822.65, -10.0] },
    { t: FIGHT.last - 0.05, cells: 3.5, at: [820.7, -10.03] },
    // On the swell's hardest attack, in close at the stairs' foot and the door: he and the son strike together, and the
    // last three go out of his house.
    { t: FIGHT.last, cells: 2.5, at: [819.05, -9.62], cut: true },
    { t: FIGHT.down[1] - 0.05, cells: 2.55, at: [819.1, -9.64] },
    // On the next, the whole hall: what it cost. The dead on the floor, those who never fought in their corner, the son
    // come down beside his father, and his mother coming down the stairs to them; and in, to the three of them.
    { t: FIGHT.down[1], cells: 5.3, at: [822.75, -10.8], cut: true },
    { t: FIGHT.down[3], cells: 5.1, at: [822.4, -10.7] },
    { t: TRIAL.meet, cells: 3.0, at: [820.3, -9.95] },
    { t: TRIAL.fade - 0.1, cells: 2.85, at: [820.28, -9.92] },
    // The west, held: their son on the cliff's edge, the skiff casting off and going away from us into the sun.
    { t: TRIAL.fade, cells: WEST_CAM.cells, at: [WEST_CAM.x, WEST_CAM.y], cut: true },
    { t: END, cells: WEST_CAM.cells, at: [WEST_CAM.x, WEST_CAM.y] },
  ],
}
