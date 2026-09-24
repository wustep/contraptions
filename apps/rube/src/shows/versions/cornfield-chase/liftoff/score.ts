import { FLOOR, type Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { box, lay, smooth, standing } from './kit'
import { ACT2, beat, cue, DROP, DURATION, IGNITION, UNDOCK } from './music'
import { LiftoffShow } from './show'
import { BALL, EARTH, FARM, SPACE, STATION, VOID } from './worlds'
import { dawn, sky } from './earth/sky'
import { house, porch, shelf, stairs, toy } from './earth/house'
import { cornrow } from './earth/field'
import { yard, YARD_END } from './earth/yard'
import { rearAt, truck } from './earth/truck'
import { drone, type Flight } from './earth/drone'
import { combine } from './earth/combine'
import { gate } from './earth/gate'
import { gantry } from './earth/gantry'
import { PUNCH, punchHeight, rocket, rocketPose, ROCKET_LENGTH } from './rocket'
import { cloud } from './cloud'
import { voidSky } from './space/sky'
import { endurance } from './space/endurance'
import { miller } from './space/miller'
import { gargantua } from './space/gargantua'
import { AXIS } from './act2/station'
import { interior } from './act2/interior'
import { replica } from './act2/replica'
import { rim } from './act2/rim'
import { ballpark } from './act2/ballpark'
import { hub } from './act2/hub'
import { undock } from './act2/undock'
import { edmunds } from './act2/edmunds'

/**
 * The whole show, in order: who has the ball from when to when. Every part
 * is told its slot and builds to it; this file only says the order and the
 * seams, which are all on the music:
 *
 *   0       the house: the ghost on the shelf, the stairs, the porch (piano)
 *   20.16   the corn row (piano)
 *   29.16   the truck: into the bed, the organ, the drop at 42.48, the dam on beat 84
 *   b86     the combine
 *   b100    the gate, and the drone coming down
 *   b116    the gantry and the countdown
 *   b134    ignition; the rocket through the cloud; the fairing on beat 148
 *   b148    orbit and the ring
 *   b166    Miller's world
 *   b183    Gargantua, the tesseract, and the last hit on beat 191
 */

/** Show time at which the rocket is inside the cloud and the stage changes universe. */
export const SWITCH = PUNCH

/** The sun off the drone's wing: a flash on each downbeat of the chase, the rest of the bar dark. */
function glintAt(t: number): number {
  if (t < DROP || t > beat(84)) return 0
  const since = (t - beat(68)) % (4 * 0.625)
  return Math.exp(-since / 0.18)
}

export function compose(): { show: LiftoffShow; camera: (t: number) => Framing } {
  const earth = lay({ col: 0, row: -2, begin: 0, ball: { color: BALL, ghost: true, id: 0 } }, [
    { part: shelf, end: 12.283 },
    { part: toy, end: 15.743 },
    { part: stairs, end: 17.4 },
    { part: porch, end: 20.16 },
    { part: yard, end: YARD_END },
    { part: cornrow, end: 29.158 },
    { part: truck, end: beat(86) },
    { part: combine, end: beat(100) },
    { part: gate, end: beat(116) },
    { part: gantry, end: IGNITION },
    { part: rocket, end: beat(148) },
  ])
  const lift = earth.placed[earth.placed.length - 1]
  const space = lay(earth.next, [
    { part: endurance, end: beat(166) },
    { part: miller, end: beat(183) },
    { part: gargantua, end: ACT2 },
  ])
  // Act II: No Time for Caution. Inside Cooper Station, and then out of it.
  const station = lay(space.next, [
    { part: replica, end: cue(116) },
    { part: rim, end: cue(132) },
    { part: ballpark, end: cue(156) },
    { part: hub, end: UNDOCK },
  ])
  const outside = lay(station.next, [
    { part: undock, end: cue(212) },
    { part: edmunds, end: DURATION },
  ])
  const axis: Pt = [space.next.col - 0.5 + AXIS[0], space.next.row + AXIS[1]]

  const all = box(-12, -140, 260, 16, 2)
  const pickup = earth.placed.find((p) => p.piece.name === 'pickup')!
  const b0 = (pickup.state as { b0: number }).b0
  const rear = (t: number) => pickup.col + rearAt(b0, t)
  const road = pickup.row + 1 + FLOOR
  const flight: Flight = {
    at(t) {
      // Over the truck while it idles, high, left to right; gone; then ahead of it all the way through the corn.
      if (t < 35.4) return { p: [0, 0], bank: 0, seen: 0, ground: null, glint: 0 }
      if (t < 41) {
        const u = (t - 35.4) / 5.6
        return { p: [rear(35.4) - 5 + 14 * u, road - 3.6 - 0.5 * u], bank: -0.04, seen: 1, ground: road - 2, glint: 0 }
      }
      if (t < DROP - 0.2) return { p: [0, 0], bank: 0, seen: 0, ground: null, glint: 0 }
      // Ahead, a little closer every bar, until the dam: then it is over the edge and away down the valley.
      const close = smooth(t, DROP, beat(83))
      const gone = smooth(t, beat(84), beat(86) + 1.2)
      const x = rear(Math.min(t, beat(84))) + 5.6 - 1.8 * close + 0.3 * Math.sin(t * 0.9) + gone * 9
      return { p: [x, road - 2.55 + 0.1 * Math.sin(t * 1.7) - gone * 1.5], bank: 0.05 * Math.sin(t * 0.9) - gone * 0.12, seen: smooth(t, DROP - 0.2, DROP + 0.3) * (1 - smooth(t, beat(86), beat(86) + 1.4)), ground: gone > 0.2 ? null : road - 2, glint: glintAt(t) }
    },
  }

  const deck = lift.row + punchHeight()
  const pose = (t: number) => {
    const { base, lean } = rocketPose(t)
    return { base: [lift.col + base[0], lift.row + base[1]] as [number, number], lean }
  }
  const deckCloud = standing(cloud, 0, 0, all, { deck, punch: SWITCH, rocket: pose, length: ROCKET_LENGTH }, DURATION)
  const chainOf = (placed: Placed[]) => placed
  const show = new LiftoffShow(
    [
      {
        world: EARTH,
        theme: FARM,
        scenery: [standing(sky, 0, 0, all, { cloud: SWITCH }, DURATION), standing(house, 0, 0, box(-2, -6, 9, 2), null, DURATION)],
        chain: chainOf(earth.placed),
        after: [standing(drone, 0, 0, all, flight, DURATION), deckCloud, standing(dawn, 0, 0, all, null, DURATION)],
        from: 0,
      },
      {
        world: SPACE,
        theme: VOID,
        scenery: [standing(voidSky, 0, 0, all, { deck, leave: beat(160) }, DURATION)],
        chain: [lift, ...space.placed],
        after: [deckCloud],
        from: SWITCH,
      },
      {
        world: STATION,
        theme: FARM,
        scenery: [standing(interior, 0, 0, box(axis[0] - 30, axis[1] - 30, axis[0] + 30, axis[1] + 30, 2), { axis, lights: ACT2 }, DURATION)],
        chain: station.placed,
        from: ACT2,
      },
      {
        world: SPACE,
        theme: VOID,
        scenery: [standing(voidSky, 0, 0, box(axis[0] - 60, axis[1] - 120, axis[0] + 260, axis[1] + 60, 2), { deck: axis[1] + 1000, leave: -100 }, DURATION)],
        chain: outside.placed,
        from: UNDOCK,
      },
    ],
    DURATION,
    [...earth.riders, ...space.riders, ...station.riders, ...outside.riders],
  )

  const shots: Shot[] = [
    { t: 0, cells: 2.9, hold: [0.75, -2.55] },
    { t: 5.5, cells: 2.9, hold: [0.75, -2.55] },
    { t: 12.3, cells: 3.1, hold: [2.1, -2.55], w: 0.7 },
    { t: 15.5, cells: 3.3, w: 0.35, hold: [4.4, -2.3] },
    { t: 17.2, cells: 3.8, w: 0 },
    { t: 20.6, cells: 4.4, off: [0.7, -0.55] },
    { t: 26.9, cells: 3.6, off: [0.6, -0.5] },
    { t: 28.4, cells: 5.2, off: [1.6, -0.2] },
    { t: 31, cells: 4.6, off: [0.8, -0.6] },
    { t: 36, cells: 6, off: [1, -1.4] },
    { t: 41, cells: 5, off: [1.2, -0.9] },
    { t: 44, cells: 4.7, off: [1.5, -0.8] },
    { t: 52, cells: 4.7, off: [1.5, -0.8] },
    { t: beat(86) - 0.3, cells: 5.4 },
    ...earth.shots,
    ...space.shots,
    ...station.shots,
    ...outside.shots,
  ]
  // Where a part asks for nothing, the camera follows at a middle distance.
  if (!shots.some((s) => s.t > beat(86))) shots.push({ t: DURATION, cells: 5 })
  const camera = director((t) => show.where(t) as Pt, shots, DURATION)
  return { show, camera }
}
