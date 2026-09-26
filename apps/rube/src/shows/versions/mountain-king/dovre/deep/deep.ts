import { laneAt, R } from '../../../../../parts'
import { box, part, type Company, type PartShot } from '../kit'
import { quake } from '../rock'
import { PLAN, SEAM_SHOT } from '../seams'
import {
  BLOWS, CUP_DRIPS, DRIPS, E, F, LAMPS, T_CUP, T_HIS_BUCKET, T_HIS_LAND, T_SLAM, T_WHEEL, Y_T2, cupFill, cupSeat, leverAngle, peerLane, womanLane,
} from './deep-plan'
import { drawCupDrips, drawFire, drawFloors, drawRock, drawSparks, drawXylophone, unseen } from './deep-set'
import { drawFlume, drawHammer, drawLamps, drawLever, drawWater, drawWheel } from './deep-works'

/**
 * The tunnels, the deep builder's (22.32 → 40.19: phrases 2 and 3, the theme a fifth up, still pianissimo).
 *
 * Down from the gate's threshold to the Mountain King's hall, the Woman in Green leading. The rock itself plays the
 * tune: stalactites drip onto a xylophone of stone bars on the theme's notes. The drips fill a cup at the end of a
 * balanced stone beam; Peer rolls out along the beam and drops into the cup on the phrase's loudest note, and the
 * last drop is him: it tips, slams onto a flint, and the sparks catch in the oil gutter, so the lanterns come on
 * one after another back up the gallery behind him. The cup's water runs down a flume onto a waterwheel of stone
 * buckets, which starts; she rides it down first and he follows her into the next bucket on the second phrase's
 * first note. His bucket presses the tail of a great stone hammer, and from then on the wheel drops it on a stone
 * bar every half bar (the xylophone grown to the size of the machine); its sparks set the stair's gutter alight and
 * the flame chases him down to the hall's door, a lantern at a time. He comes to rest on the threshold, her a step
 * ahead, as the hall's phrase begins.
 *
 * Layout and timing: `deep-plan.ts`. Rock, light, drips, fire: `deep-set.ts`. Machines: `deep-works.ts`.
 */

interface DeepState {
  begin: number
}

/** Where a drip from the cup's stalactite lands: in the cup's water while the beam is level, on the terrace after. */
const cupWater = (at: number): number => (leverAngle(at) < 0.01 ? cupSeat(at)[1] + 0.11 - 0.24 * cupFill(at) : Y_T2 + R)

export const deep = part<DeepState>(
  {
    name: 'deep',
    draw: (p, s, c) => {
      const T = s.begin + c.t
      const [qx, qy] = quake(T)
      p.push()
      p.translate(qx * 0.8 * c.k, qy * 0.8 * c.k)
      drawRock(p, c, T)
      drawFire(p, c, T)
      drawXylophone(p, c, T)
      drawCupDrips(p, c, T, cupWater)
      drawFloors(p, c, T)
      drawLever(p, c, T)
      drawWater(p, c, T)
      drawFlume(p, c, T)
      drawWheel(p, c, T)
      drawHammer(p, c, T)
      drawLamps(p, c, T)
      drawSparks(p, c, T)
      unseen(p, c, T)
      p.pop()
    },
  },
  (slot) => {
    const lane = peerLane()
    const her = womanLane()
    const company: Company[] = [
      {
        who: 'woman',
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const q = laneAt(her, t - slot.begin)
          return { x: q.x, y: q.y }
        },
      },
    ]
    return { cells: box(-1, -4, 19, 13), exit: PLAN.deep.exit, lane, state: { begin: slot.begin }, company }
  },
  (slot): PartShot[] => [
    { t: slot.begin, ...SEAM_SHOT },
    // Under the xylophone with them: the slabs and the drips playing the phrase over them, held in the frame
    // through its first bars, down to the beam and the cup.
    { t: E(4), cells: 6.4, hold: [2.4, -1.3], w: 0.55 },
    { t: E(10), cells: 6.6, hold: [3.3, -0.4], w: 0.5 },
    // The beam and the cup, and the tip.
    { t: T_CUP, cells: 5.6, hold: [4.6, 0.6], w: 0.55 },
    { t: T_SLAM + 0.3, cells: 5.0, hold: [5.4, 1.7], w: 0.5 },
    // The water to the wheel; she goes first.
    { t: T_WHEEL, cells: 5.4, hold: [7.6, 2.6], w: 0.55 },
    { t: T_HIS_BUCKET - 0.4, cells: 5.4, hold: [8.4, 3.2], w: 0.5 },
    // The pull back on the second phrase, peaking on the hammer's first blow: the gallery lit behind him, the wheel
    // turning, the hammer. Then in again on him as the third blow throws him out.
    { t: F(4), cells: 10, hold: [8.0, 2.9], w: 0.85 },
    { t: F(8), cells: 7.4, hold: [9.8, 4.3], w: 0.55 },
    // Down with him: off the wheel and down the stair, the flame at his heels.
    { t: F(12), cells: 6, off: [0.3, 0.3] },
    { t: F(18), cells: 5.4, off: [0.4, 0.4] },
    { t: F(24), cells: 5.4, off: [0.5, -0.2] },
    { t: slot.end, ...SEAM_SHOT },
  ],
)

/** Every strike, show seconds, sorted: the seam's landing, the drips, the cup, the slam, the wheel, the lamps, the hammer, his steps. */
export const DEEP_HITS: number[] = (() => {
  const all = [
    E(0),
    ...DRIPS.map((d) => d.at),
    ...CUP_DRIPS,
    T_CUP,
    T_SLAM,
    T_WHEEL,
    T_HIS_BUCKET,
    T_HIS_LAND,
    F(14), F(16), F(18), F(20), F(22), F(24),
    ...LAMPS.map((l) => l.catch),
    ...BLOWS,
  ].sort((a, b) => a - b)
  return all.filter((t, i) => i === 0 || t - all[i - 1] > 1e-3)
})()
