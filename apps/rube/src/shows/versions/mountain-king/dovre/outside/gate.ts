import { laneAt, type Pt } from '../../../../../parts'
import { box, carried, part, route, smooth, type Company, type PartShot } from '../kit'
import { dawn } from '../mountain'
import { quake } from '../rock'
import { PLAN, SEAM_SHOT } from '../seams'
import { drawPig } from './gate-pig'
import { DOOR, doorDrop, pebbleAt, pebbleStops, peerWays, pigPose, riderAt, TIMES, womanWays, worksLamp, type PebbleStop } from './gate-motion'
import { drawBoulders, drawDoor, drawDrain, drawFlank, drawLintel, drawMouth, drawPawl, drawPebble, drawStair, drawWorks, drawWorksHollows } from './gate-set'

/**
 * The gate: the flank at night and the troll gate (0 → 22.32: the horns' note and the theme's first two phrases,
 * pianissimo). The film's first image is the mountain at night, wide; a great pig trots up the west flank with Peer
 * and the Woman in Green on its back. At the foot of the trolls' stair they leap off and hop up it a step a note,
 * the stair ringing under them, the melody climbing with them. The door at the top is shut; she knocks; nothing.
 * Peer, idle, nudges a pebble off the top step: the careful tip that starts the whole machine. It clatters down the
 * stair a step a note, drops through the drain by the pig's snout into the works under the path and lands in the
 * counterweight's pan with a spark that lights the works' lamp; the pan sinks, the chain runs under the stair, and
 * the great door sinks into the floor a notch a note, the pawl clicking on its rack, until its top is the doorstep.
 * She rolls in; he follows; at rest inside on the next phrase, she a cell ahead. The pig dozes off outside.
 *
 * The gate is the first part, laid at 0, 0, so its frame is the world's. Its lane starts on the pig's back where the
 * pig is at the first frame, not at (-0.5, 0): no seam comes in, and the ride needs the flank.
 * Motion and times: `gate-motion.ts`; the set: `gate-set.ts`; the pig: `gate-pig.ts`.
 */

interface GateState {
  stones: PebbleStop[]
}

const ALL: number[] = [
  ...TIMES.heavy,
  TIMES.womanLeap[1],
  TIMES.peerLeap[1],
  ...TIMES.womanHops,
  ...TIMES.peerHops,
  TIMES.knock,
  TIMES.tip,
  ...TIMES.pebble,
  TIMES.pan,
  ...TIMES.clicks,
].sort((a, b) => a - b)

/**
 * Every strike, show seconds: the pig's heavy steps; her leap and his onto the stair's foot and their hops up it; her
 * knock; the tip; the pebble on each step, the foot stone and the pan (the spark); the door's fourteen clicks.
 */
export const GATE_HITS: number[] = ALL.filter((t, i) => i === 0 || t - ALL[i - 1] > 0.001)

export const gate = part<GateState>(
  {
    name: 'gate',
    draw: (p, s, c) => {
      const t = c.t
      const drop = doorDrop(t)
      const lamp = worksLamp(t)
      p.push()
      // The turf is the mountain's own skin (it keeps to the sky's edge); the stones and the works shake with the rest.
      drawFlank(p, c, t)
      const [qx, qy] = quake(t)
      p.translate(qx * c.k, qy * c.k)
      drawBoulders(p, c, t)
      drawWorksHollows(p, c, t)
      drawDrain(p, c, lamp)
      drawMouth(p, c, Math.min(1, drop / DOOR.travel))
      drawDoor(p, c, t, drop, 0)
      drawStair(p, c, t)
      drawPawl(p, c, t)
      drawLintel(p, c, t)
      drawWorks(p, c, t, drop)
      drawPig(p, c, pigPose(t), { day: dawn(t), t, slack: smooth(t, TIMES.womanLeap[0], TIMES.womanLeap[0] + 0.5) })
      const peb = pebbleAt(t, s.stones, drop)
      drawPebble(p, c, t, peb.p, peb.turn)
      p.pop()
    },
  },
  (slot) => {
    const end = slot.end - slot.begin
    const [t0] = TIMES.peerLeap
    // On the pig's back until he leaps (sampled at 60 a second from the pose the pig is drawn in); then his ways.
    const ride = carried((t) => riderAt(t, 'peer'), 0, t0, Math.ceil(t0 * 60))
    const segs = [...ride, ...route(peerWays(end))]
    const her = { segs: route(womanWays(end)), fire: 0 }
    const [w0] = TIMES.womanLeap
    const company: Company[] = [
      {
        who: 'woman',
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const u = t - slot.begin
          if (u < w0) {
            const [x, y] = riderAt(u, 'woman')
            return { x, y }
          }
          const at = laneAt(her, u - w0)
          return { x: at.x, y: at.y }
        },
      },
    ]
    return {
      cells: box(-10, -13, 24, 4),
      exit: PLAN.gate.exit,
      lane: { segs, fire: TIMES.heavy[0] - slot.begin },
      state: { stones: pebbleStops(end) },
      company,
    }
  },
  (slot): PartShot[] => {
    const at = (t: number) => slot.begin + t
    const hold = (x: number, y: number): Pt => [x, y]
    return [
      // The mountain at night: the flank, the cliff with the gate at its foot, the slope beyond. Still for the horns.
      // (Held a little west of the cliff, so the pig is in the frame from the first frame even under Zoom.)
      { t: at(0), cells: 27, hold: hold(12.5, -7.6), w: 1 },
      { t: at(2.4), cells: 26.2, hold: hold(12.9, -7.3), w: 1 },
      // Down to them as the theme begins, and after them up the flank.
      { t: at(6.5), cells: 7.8, off: [1.4, -0.9], w: 0 },
      { t: at(8.6), cells: 6.5, hold: hold(15.4, -3.8), off: [1.1, -0.7], w: 0.4 },
      // Up the stair to the landing and the door (the pig left behind, out of the frame).
      { t: at(10.8), cells: 5.1, hold: hold(18.6, -4.55), w: 0.7 },
      { t: at(12.0), cells: 5.0, hold: hold(18.65, -4.6), w: 0.9 },
      // Back to take in the whole stair, the pig at its foot, as he creeps to the edge.
      { t: at(13.55), cells: 5.5, hold: hold(15.95, -4.0), w: 1 },
      // The pebble down the whole stair, in one frame.
      { t: at(14.75), cells: 5.3, hold: hold(15.75, -3.25), w: 1 },
      // Down with it through the drain into the works: the pan, the spark, the lamp.
      { t: at(15.75), cells: 6.2, hold: hold(15.45, -2.15), w: 1 },
      // The whole machine: the pan sinking, the fire running under the stair, the door going down.
      { t: at(17.7), cells: 7.4, hold: hold(17.3, -1.9), w: 1 },
      // In on the door.
      { t: at(19.8), cells: 5.7, hold: hold(19.6, -4.25), w: 1 },
      { t: at(21.3), cells: 5.8, hold: hold(21.0, -4.5), w: 0.55 },
      { t: slot.end, ...SEAM_SHOT },
    ]
  },
)
