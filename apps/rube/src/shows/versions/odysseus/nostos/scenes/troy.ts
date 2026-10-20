import type { Key } from '../camera'
import { M } from '../music'
import type { Scene } from '../scene'
import { WINDOWS } from '../voyage'
import { SHIP0, SHIP1, SHIP2 } from './troy/plan'

/**
 * Troy that night (71.42 → 140), the theme answered. The horse stands on Athena's forecourt before her temple, her
 * white statue before it and a brazier burning by her. On the answer's first notes its hatch drops open and a rope is
 * thrown round Athena's neck; his men come down it one by one, a man a note, and run down the temple steps to the gate.
 * He comes last, and his weight stops him halfway down and holds him there while her neck gives, note by note; the
 * rope slips, he drops, and on the music's held breath her head comes off and rolls to him. He goes down the steps a
 * step a note, along the street, and into the Trojans' own counterweight bucket with his men: the seventh weight takes
 * it down, the great wheels turn, the gate goes up, and the army's torches come in under it. The city burns from the
 * gate up, roof by roof, while they come out of the drain under the hill, run down to the ships, and put out at first
 * light. (Every move is in `troy/plan.ts`; the horse scene carries them.)
 */

const shots: Key[] = [
  // The cut from Ithaca: the horse on the forecourt in the dark, Athena white before it, the brazier by her.
  { t: M.answer, cells: 4.6, at: [-37.55, -6.62], cut: true },
  { t: 74, cells: 4.4, at: [-37.45, -6.55] },
  // The men coming down the rope and away down the steps.
  { t: 78, cells: 4.7, at: [-36.75, -6.3] },
  { t: 83.2, cells: 4.3, at: [-37.15, -6.4] },
  // Him, last, on the rope; in, slowly, while he hangs.
  { t: 86.4, cells: 3.2, at: [-37.4, -6.25] },
  { t: 95.6, cells: 2.6, at: [-37.3, -6.0] },
  // Her head.
  { t: 99.0, cells: 2.2, at: [-37.25, -5.68] },
  { t: 100.5, cells: 2.3, at: [-37.15, -5.6] },
  // Down the steps with him, along the street.
  { t: 102.4, cells: 2.8, off: [0.6, -0.5] },
  { t: 106.6, cells: 3.0, off: [0.7, -0.45] },
  // The gate tower: the bucket full of men, the wheels, the gate.
  { t: 108.9, cells: 3.9, at: [-28.75, -4.35] },
  { t: 113.6, cells: 4.3, at: [-28.6, -3.95] },
  { t: 116.4, cells: 4.8, at: [-28.45, -3.35] },
  // Wide: the city burning, the drain under the hill, him coming out of it.
  { t: 119.3, cells: 12, at: [-30.5, -5.3] },
  { t: 122.6, cells: 9, off: [1.4, -1.1] },
  // Down to the ships and aboard.
  { t: 125.6, cells: 6.2, off: [1.0, -0.8] },
  { t: 128.6, cells: 7.2, off: [1.6, -1.1] },
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
