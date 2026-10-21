import type { Key } from '../camera'
import { M } from '../music'
import type { Scene } from '../scene'
import { WINDOWS } from '../voyage'
import { SURGE } from './troy/host'
import { KILLS } from './troy/sack'
import { HE_STOPS, SHIP0, SHIP1, SHIP2 } from './troy/plan'

/**
 * Troy that night (71.42 → 140), the theme answered. The horse stands on Athena's forecourt before her temple, her
 * white statue before it and a brazier burning by her. On the answer's first notes its hatch drops open and a rope is
 * thrown round Athena's neck; his men come down it one by one, a man a note, and run down the temple steps to the gate.
 * He comes last, and his weight stops him halfway down and holds him there while her neck gives, note by note; while
 * he hangs, the camera goes to his men dropping into the gate's counterweight bucket, and out to Agamemnon's host
 * waiting in the dark beyond the wall; the rope slips, he drops, and on the music's held breath her head comes off and rolls to him. He goes down the steps a
 * step a note, along the street, and into the Trojans' own counterweight bucket with his men: the seventh weight takes
 * it down, the great wheels turn, the gate goes up, and Agamemnon's host, massed down the hill to the sea with its
 * torches, pours in under it behind him, the gold one (`troy/host.ts`). The city burns from the gate up, roof by roof,
 * and the Trojans who took the horse in run out of their doors and are cut down in their street, and at last at
 * Athena's feet (`troy/sack.ts`), while he and his men come out of the drain under the hill, run down to the ships
 * through the host the other way, and put out at first light. (Every move is in `troy/plan.ts`; the horse scene carries
 * them.)
 */

const shots: Key[] = [
  // The cut from Ithaca: the horse on the forecourt in the dark, Athena white before it, the brazier by her.
  { t: M.answer, cells: 4.6, at: [-37.55, -6.62], cut: true },
  { t: 74, cells: 4.4, at: [-37.45, -6.55] },
  // The men coming down the rope and away down the steps.
  { t: 78, cells: 4.7, at: [-36.75, -6.3] },
  { t: 83.2, cells: 4.3, at: [-37.15, -6.4] },
  // Him, last, on the rope, till his weight stops him.
  { t: 86.4, cells: 3.2, at: [-37.4, -6.25] },
  // While he hangs, on the note he stops: the gate tower, where his men drop into the Trojans' counterweight bucket
  // under the still wheels, and it does not go down for six of them.
  { t: HE_STOPS, cells: 3.5, at: [-29.0, -4.15], cut: true },
  { t: 91.5, cells: 3.8, at: [-28.85, -4.2] },
  // On the next, out past the wall: Agamemnon's host, come back in the dark, waiting with its torches down the hill to
  // the sea for the gate to open.
  { t: 91.57, cells: 10, at: [-22.4, -3.4], cut: true },
  { t: 94.8, cells: 9.4, at: [-22.9, -3.5] },
  // Back to him on the rope as her neck gives; it slips (96.33).
  { t: 94.86, cells: 2.75, at: [-37.35, -6.05], cut: true },
  { t: 95.6, cells: 2.6, at: [-37.3, -6.0] },
  // Her head.
  { t: 99.0, cells: 2.2, at: [-37.25, -5.68] },
  { t: 100.5, cells: 2.3, at: [-37.15, -5.6] },
  // Down the steps with him, along the street: a steady move down the line of the steps, not a bob with each one.
  { t: 102.4, cells: 3.0, at: [-33.7, -5.35] },
  { t: 107.6, cells: 3.2, at: [-31.4, -3.7] },
  // The gate tower: the bucket full of men, the wheels, the gate.
  { t: 108.9, cells: 3.9, at: [-28.75, -4.35] },
  { t: 113.6, cells: 4.3, at: [-28.6, -3.95] },
  // On the note the king goes in, out wide: the gate going up in its tower, Agamemnon's host massed down the hill to
  // the sea, their torches, and the surge running back down the column as they pour up into the city; the fire takes
  // the town from the gate up, and under it all the men come along the drain.
  { t: SURGE - 0.05, cells: 4.5, at: [-28.45, -3.75] },
  { t: SURGE, cells: 11.5, at: [-24.4, -3.4], cut: true },
  { t: KILLS.door - 0.05, cells: 11.3, at: [-24.2, -3.33] },
  // On the next note, into the lower street as its roofs catch: the Trojans running out of their doors, the Greeks come
  // in round the tower's foot with their torches, and a blow on each note. Then the music holds its breath, and the
  // camera with it, over the dead in the street, as the torches go on up the steps after the rest.
  { t: KILLS.door, cells: 4.0, at: [-31.35, -4.0], cut: true },
  { t: 118.0, cells: 3.95, at: [-31.6, -4.08] },
  { t: 120.6, cells: 3.8, at: [-32.2, -4.3] },
  // On the next note, down to the drain's mouth: him out of it and down the hill through them, the other way.
  { t: 120.73, cells: 6.5, at: [-21.2, -2.3], cut: true },
  { t: 122.6, cells: 7, off: [1.2, -0.75] },
  { t: 125.0, cells: 6.6, off: [1.1, -0.7] },
  // On the cue's hardest notes, up on the height: the last of them have run to Athena's statue, the one sanctuary in the
  // city, and the Greeks come across the forecourt and kill them at her feet, one on each note, beside the horse. Then
  // out, from there, to the whole of it from the sea: Troy burning on its hill from end to end.
  { t: 125.07, cells: 4.8, at: [-36.5, -6.45], cut: true },
  { t: KILLS.statue[3] + 0.3, cells: 5.4, at: [-36.2, -6.5] },
  { t: 129.6, cells: 14.6, at: [-31.0, -6.6] },
  // Put out at first light, Troy smoking behind.
  { t: 134, cells: 11.5, off: [2.1, -1.7] },
  { t: 138.8, cells: 15.6, off: [2.45, -2.15] },
]

export const troy: Scene = {
  key: 'troy',
  from: WINDOWS.troy[0],
  to: WINDOWS.troy[1],
  ships: { 0: SHIP0, 1: SHIP1, 2: SHIP2 },
  shots,
  dissolves: [[M.answer, 2]],
}
