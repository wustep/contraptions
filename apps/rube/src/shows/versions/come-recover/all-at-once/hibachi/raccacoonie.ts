import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, route, type PartShot, type Way } from '../kit'
import { hop, throwFor } from '../physics'
import { SEAMS } from '../seams'
import * as art from './raccacoonie-draw'
import * as rig from './raccacoonie-rig'

/**
 * HIBACHI: Raccacoonie (106.731 to 120.953). Evelyn the teppanyaki chef, and the raccoon under the hat.
 *
 * The kitchen's chef is a machine: a steel post behind the griddle, a crossbar for shoulders, and the tall white
 * toque on top, with Raccacoonie hidden inside it working two levers (his ringed tail hangs out the back). The left
 * arm is a trip hammer with a cleaver hung by its handle; the right arm is one long spatula, pivoted at the
 * shoulder, its blade flat on the griddle. Right of it a serving spoon rests across a steel block with a shrimp tail
 * in its bowl, and beyond that stands the onion volcano, a stack of rings.
 *
 * - She comes in on the hot dog finger's flick past the chef as the cleaver chops (tak, tak), lands on the spatula's
 *   blade (107.39), hops once (107.81) and settles while the cleaver finishes the scallions on the run.
 * - The spatula lifts to aim, and she rolls back down it into its crook (109.04). A dip, and on 110.05 it flicks her
 *   in a high lob into the volcano's top ring (110.96), where she sits like a lid on a boil and rattles on every
 *   onset, steam spitting round her, the hole glowing hotter.
 * - 112.71: the volcano goes up: a fireball, then a column of flame taller than the chef, and she is thrown high;
 *   it flares twice as she comes down (113.14, 113.46).
 * - 113.685: she lands on the spoon's handle; the bowl flings the shrimp tail up and over, into the pocket on the
 *   chef's hat. She rolls back along the griddle into the spatula's crook.
 * - The breath: the steel sizzles; the hat rises and tips, Raccacoonie's masked face comes out under the brim, paws
 *   on it; he looks at her, takes the tail from his pocket, eats it, looks again, and ducks: the hat drops on 117.6.
 * - The last run: his paw lobs an egg (118.03), the spatula snaps up to meet it (118.35), cracks it on its tip
 *   (118.68), and it fries (118.78). Then her own turn: tossed (119.22), three bounces dying (119.77, 120.09,
 *   120.31), lifted, slapped down on the griddle (120.755), and on 120.953 the spatula whips her up and away at the
 *   surf's velocity.
 */

/** Every strike this part makes, in show seconds. */
export const HIBACHI_HITS: number[] = rig.STRIKES

type Kitchen = { begin: number }

/** Where the ball is while it rides, for the steam that rises round her. */
const restAt = (t: number): Pt => (t < rig.ROLL_END ? rig.ride.home(Math.max(rig.SPOON_DOWN, t)) : rig.ride.crook(t))

export const raccacoonie = part<Kitchen>(
  {
    name: 'raccacoonie',
    draw: (p, s, c) => {
      const pen: art.Pen = { p, k: c.k, ink: c.ink, w: c.weight, t: c.t + s.begin }
      art.drawRoom(pen)
      art.drawChef(pen)
      art.drawCounter(pen)
      art.drawCleaver(pen)
      art.drawVolcano(pen)
      art.drawSpoon(pen)
      art.drawEgg(pen)
      art.drawSpatula(pen)
      art.drawSizzle(pen, restAt)
    },
    over: (p, s, c) => {
      const pen: art.Pen = { p, k: c.k, ink: c.ink, w: c.weight, t: c.t + s.begin }
      art.drawCorkRing(pen)
    },
  },
  (slot) => {
    const b = slot.begin
    const at = (t: number) => t - b
    const segs: Seg[] = []
    // In on the finger's flick, down onto the blade, one hop along it.
    const w0: Way = { at: 0, p: [-0.5, 0] }
    const land = throwFor(w0, SEAMS.hibachi.v, at(rig.LAND))
    segs.push(...route([w0, land, hop(land, rig.HOP_AT, at(rig.HOP))]))
    // Held on the blade, raised, and flicked.
    const flick = rig.THROWS.lob.start
    segs.push(...carried((u) => rig.ride.first(u + b), at(rig.HOP), at(flick), Math.ceil((flick - rig.HOP) * 60)))
    segs.push(...carried((u) => rig.ride.first(u + b), at(flick), at(rig.LOB), 48))
    // The lob into the top ring; sitting there, rattling; the eruption; down onto the spoon's handle.
    const lob: Way = { at: at(rig.LOB), p: rig.THROWS.lob.from }
    const ways: Way[] = [lob, hop(lob, rig.CORK, at(rig.CORKED)), { at: at(rig.RATTLES[0]), p: rig.CORK }]
    for (const r of [...rig.RATTLES.slice(1), rig.ERUPT]) ways.push(hop(ways[ways.length - 1], rig.CORK, at(r)))
    ways.push(hop(ways[ways.length - 1], rig.ride.spoon(rig.SPOON), at(rig.SPOON)))
    segs.push(...route(ways))
    // The spoon's handle down, the roll home into the crook, held there through the breath and the egg.
    segs.push(...carried((u) => rig.ride.spoon(u + b), at(rig.SPOON), at(rig.SPOON_DOWN), 6))
    segs.push(...carried((u) => rig.ride.home(u + b), at(rig.SPOON_DOWN), at(rig.ROLL_END), 120))
    segs.push(...carried((u) => rig.ride.crook(u + b), at(rig.ROLL_END), at(rig.TOSSES[0]), Math.ceil((rig.TOSSES[0] - rig.ROLL_END) * 60)))
    // Tossed, and three bounces dying away on the blade.
    const tosses: Way[] = [{ at: at(rig.TOSSES[0]), p: rig.ride.crook(rig.TOSSES[0]) }]
    for (const s of rig.TOSSES.slice(1)) tosses.push(hop(tosses[tosses.length - 1], rig.ride.crook(s), at(s)))
    segs.push(...route(tosses))
    // At rest a breath, then the flip.
    segs.push(...carried((u) => rig.ride.crook(u + b), at(rig.TOSSES[3]), at(rig.WIND), 30))
    segs.push(...carried((u) => rig.ride.crook(u + b), at(rig.WIND), at(slot.end), 90))
    const end: Pt = rig.ride.crook(slot.end)
    return {
      cells: box(-5.5, -5, 5, 4),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: at(rig.LAND) },
      state: { begin: b },
    }
  },
  (slot): PartShot[] => {
    const f = rig.THROWS.flip.from
    return [
      // Out of the match cut onto the whole kitchen: the chef, the cleaver chopping, the spatula she lands on.
      { t: slot.begin + 0.55, cells: 4.7, hold: [-1.3, -0.75], w: 0.85 },
      { t: 108.5, cells: 4.8, hold: [-0.85, -0.8], w: 0.95 },
      // Over to the spatula and the volcano as it takes aim, for the flick.
      { t: 109.8, cells: 4.6, hold: [0.9, -0.55], w: 0.9 },
      { t: rig.CORKED, cells: 4.2, hold: [2.1, -0.3], w: 0.9 },
      // In on the rattling lid.
      { t: 112.6, cells: 3.0, hold: [2.6, 0.05], w: 1 },
      { t: rig.ERUPT + 0.03, cells: 3.1, hold: [2.55, -0.05], w: 1 },
      // Out, fast, for the column.
      { t: 113.38, cells: 5.9, hold: [0.9, -1.3], w: 1 },
      { t: rig.SPOON + 0.25, cells: 6.3, hold: [0.3, -1.25], w: 1 },
      // Round to the hat for the pocket, and in close for the raccoon.
      { t: 114.9, cells: 4.2, hold: [-1.0, -0.65], w: 1 },
      { t: 115.9, cells: 2.8, hold: [-0.82, -0.05], w: 1 },
      { t: 117.2, cells: 2.75, hold: [-0.78, -0.03], w: 1 },
      // Back a little for the egg and the tosses, and onto her for the flip.
      { t: rig.EGG_TOSS + 0.2, cells: 4.2, hold: [-0.45, -0.5], w: 1 },
      { t: rig.SPLAT + 0.2, cells: 4.25, hold: [-0.25, -0.5], w: 1 },
      { t: 120.4, cells: 4.5, hold: [0.1, -0.55], w: 0.9 },
      { t: slot.end, cells: SEAMS.surf.cells, hold: [f[0] + 0.5, f[1] - 0.45], w: 0.75 },
    ]
  },
)
