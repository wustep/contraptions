import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, route, type PartShot, type Way } from '../kit'
import { G, throwFor } from '../physics'
import { SEAMS } from '../seams'
import {
  AT_PLOP,
  BELT_GO,
  BELT_STOP,
  CLAP,
  DRAW,
  END_X,
  FLOOR_Y,
  FURNACE,
  GLORY,
  HISS,
  HOP_OFF,
  MOULD_X,
  OPEN,
  OPENED,
  PINGS,
  PLOP,
  PUFFS,
  RINGS,
  S1,
  SNAP,
  SPRINGS,
  STOP,
  TINK,
  inBottle,
  onGlass,
  onTuned,
  riseAt,
} from './glass-plan'
import { drawGlassworks, overGlassworks } from './glass-draw'

/**
 * GLASS: the glassworks, by day (58.024 to 82.053, phrases 6 to 8). Viscous, then brittle.
 *
 * The spark bursts out of the glory hole on statement 2's first note into a whitewashed glasshouse, and no one there.
 * It ticks off the end of a blowpipe (58.56) and plops into the molten gather on its tip (59.10), and its weight tips
 * the little blowing cart off its rest: down the rail it rolls, the pipe turning in its yokes, the crank on its wheel
 * working the bellows on its bed. Every turn the bellows bottoms out, a puff down the pipe, and the gather swells into
 * a bubble under the spark, a strong note at a time (60.17, 61.23, 62.28). The cart comes to rest at the rail's end
 * (63.33); the pipe stops turning, and the bubble, soft, droops off the tip a bottle's length down into the open
 * mould, and its two iron halves slam shut round it on the phrase's big note (64.37). The wet mould hisses.
 *
 * Phrase 7, quiet: the mould swings open on a glowing bottle (66.43), its halves clanking onto their stops (66.94),
 * the spark on its mouth. The lehr's belt takes up (67.45); the neck, still on the pipe, draws out into a thread and
 * cracks off (68.96). The belt carries the bottle east over the lehr's three fires, and in each cooler part it pings
 * and cools a step (70.96, 71.95, 72.93): orange, amber, green. The camera draws back to show the whole shop: the
 * lehr, a rack of finished bottles, and the great furnace at the far end.
 *
 * Phrase 8, the B: brittle. The belt stops at the rack (74.42). The spark hops up the seven tuned bottles, a mouth a
 * note, each ringing as it lands (75.40, 76.38, 77.34, 78.30, 79.25, 80.18), the last the great demijohn under the
 * furnace's working port (81.12), whose ring flings it up into the draught: drawn into the port's fire, rising, for
 * the door (82.053).
 */

/** Every strike this part makes (show seconds). */
export const GLASS_HITS: number[] = [TINK, PLOP, ...PUFFS, STOP, CLAP, ...HISS, OPEN, OPENED, BELT_GO, SNAP, ...PINGS, BELT_STOP, HOP_OFF, ...RINGS, ...SPRINGS]
  .filter((t, i, all) => all.indexOf(t) === i)
  .sort((a, b) => a - b)

/**
 * Where the glory hole's mouth is, in the glassworks' world cells: the spark streaks back through it on the way home
 * (`DOORS.back[1]` to `DOORS.back[2]`, up and to the left). It is always roaring, and it flares as the spark goes by.
 */
export const GLORY_AT: Pt = [GLORY.x, GLORY.y]

interface GlassState {
  begin: number
}

/** Seconds per sample where the spark rides something that moves. */
const STEP = 1 / 45

export const glassworks = part<GlassState>(
  {
    name: 'glassworks',
    flight: true,
    draw: (p, s, c) => drawGlassworks(p, c, s.begin + c.t),
    over: (p, s, c) => overGlassworks(p, c, s.begin + c.t),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const ride = (fn: (T: number) => Pt, a: number, b: number): Seg[] =>
      carried((u) => fn(u + slot.begin), at(a), at(b), Math.max(2, Math.ceil((b - a) / STEP)))
    const hop = (from: Pt, fromT: number, to: Pt, toT: number): Seg[] =>
      route([{ at: at(fromT), p: from }, { at: at(toT), p: to, arc: (G * (toT - fromT) ** 2) / 8 }])
    const segs: Seg[] = []
    // Out of the glory hole on the door's parabola; off the pipe; into the gather.
    const start: Way = { at: 0, p: [-0.5, 0] }
    const tink = throwFor(start, SEAMS.glass.v, at(TINK))
    const plop: Way = { at: at(PLOP), p: AT_PLOP, arc: (G * (PLOP - TINK) ** 2) / 8 }
    segs.push(...route([start, tink, plop]))
    // On the gather as it rolls and swells, and as it droops into the mould; on its mouth from then on: the collar on
    // the pipe while the mould works, then the bottle on the belt down the lehr.
    segs.push(...ride(onGlass, PLOP, CLAP))
    segs.push(...ride(inBottle, CLAP, HOP_OFF))
    // Up the organ: a hop to each mouth on its note, a spring off a quarter later.
    segs.push(...hop(inBottle(HOP_OFF), HOP_OFF, onTuned(0, RINGS[0]), RINGS[0]))
    for (let i = 0; i < SPRINGS.length; i++) {
      segs.push(...ride((T) => onTuned(i, T), RINGS[i], SPRINGS[i]))
      segs.push(...hop(onTuned(i, SPRINGS[i]), SPRINGS[i], onTuned(i + 1, RINGS[i + 1]), RINGS[i + 1]))
    }
    // The demijohn's ring flings it up, and the draught takes it into the port.
    segs.push(...carried((u) => riseAt(u + slot.begin), at(DRAW), at(S1), 30))
    const end = riseAt(S1)
    return {
      cells: box(-4.8, -9, FURNACE.x1 + 1, FLOOR_Y + 1),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: at(PLOP) },
      state: { begin: slot.begin },
    }
  },
  (slot) => shots(slot.begin),
)

/* ------------------------------------------------------------------ the camera */

function shots(begin: number): PartShot[] {
  return [
    // Out of the fire: the glory hole's mouth, the pipe, the gather.
    { t: begin + 0.45, cells: 3.0, hold: [0.5, 1.0], w: 0.55 },
    // With the cart down the rail: the bubble on the right, the bellows working behind it.
    { t: PUFFS[0] + 0.3, cells: 4.6, off: [-1.3, 0.75], w: 0 },
    { t: PUFFS[2], cells: 4.6, off: [-1.0, 0.8], w: 0 },
    // The droop into the mould; the slam; in slowly while it hisses.
    { t: STOP + 0.2, cells: 4.3, hold: [MOULD_X - 0.1, 2.35], w: 0.8 },
    { t: CLAP + 0.1, cells: 3.9, hold: [MOULD_X, 2.4], w: 1 },
    { t: OPEN - 0.2, cells: 3.45, hold: [MOULD_X, 2.4], w: 1 },
    // Open; the belt takes the bottle; the neck cracks off.
    { t: OPEN + 0.8, cells: 3.9, hold: [MOULD_X + 0.05, 2.6], w: 1 },
    { t: SNAP + 0.3, cells: 4.5, hold: [MOULD_X + 0.9, 2.7], w: 0.7 },
    // Down the lehr, its fires under the belt, and back to see the whole shop: the lehr, the rack, the furnace.
    { t: PINGS[0], cells: 5.0, off: [0.9, 1.15], w: 0 },
    { t: PINGS[2] - 0.2, cells: 8.8, hold: [END_X + 2.4, 0.9], w: 0.9 },
    { t: BELT_STOP + 0.2, cells: 5.4, hold: [END_X + 1.3, 1.3], w: 0.6 },
    // Up the organ, the port above.
    { t: RINGS[1], cells: 4.9, off: [0.7, 0.35], w: 0 },
    { t: RINGS[4], cells: 4.6, off: [0.5, 0.1], w: 0 },
    { t: RINGS[5] + 0.2, cells: 4.3, off: [0.35, -0.35], w: 0 },
    // Into the fire: close on the spark, the port's flame filling the frame.
    { t: DRAW + 0.35, cells: 3.2, off: [0, -0.3], w: 0 },
    { t: S1, cells: SEAMS.regatta.cells, w: 0 },
  ]
}
