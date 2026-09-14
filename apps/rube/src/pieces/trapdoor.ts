import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad, easeInOutSine, easeOutCubic } from '../../../../src/core/ease'
import { FALL, FAST, FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, wait, type Lane, type Pt } from '../parts'

/**
 * A trapdoor. The ball rolls onto it and stops in the dip it makes; its
 * weight tilts a rocker under the door's free end that lets the bolt draw,
 * slowly; the bolt clears the edge and the door swings; the ball falls into
 * the pit below onto a ramp and rolls out the far side, one floor down.
 */
const DOOR_W = 0.34
const HINGE = -DOOR_W / 2
const WALL = 0.4
const ARRIVE = arriveAt(0)
const DRAW = 0.55
const SWING = 0.1
const FIRE = ARRIVE + DRAW
/** The ramp in the pit: from the west wall down to where the rail out begins. */
const RAMP0: Pt = [-WALL, 0.66]
const RAMP1: Pt = [0.36, 1 + FLOOR]
const SLOPE = Math.atan2(RAMP1[1] - RAMP0[1], RAMP1[0] - RAMP0[0])
/** The ball's line down the ramp: one radius above it, measured square to the slope. */
const onRamp = (x: number): number => RAMP0[1] + (x - RAMP0[0]) * Math.tan(SLOPE) - R / Math.cos(SLOPE)
/** Where a straight fall from the door meets that line, and where the line reaches the ramp's foot. */
const LAND: Pt = [0, onRamp(0)]
const FOOT: Pt = [RAMP1[0], onRamp(RAMP1[0])]
/** The bolt under the door's free end, and how far it draws. */
const BOLT_X = 0.1
const BOLT_L = 0.24
const BOLT_DRAW = 0.14
/** The rocker under the rail, east of the door: its west end takes the door's weight. */
const ROCKER: Pt = [0.28, FLOOR + 0.15]

export const trapdoor = definePiece<{ color: string }>({
  name: 'trapdoor',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [0, 0.02]),
        wait([0, 0.02], DRAW + SWING * 0.3),
        { from: [0, 0.02], to: LAND, dur: (LAND[1] - 0.02) / FALL, ease: 'in' },
        { from: LAND, to: FOOT, dur: Math.hypot(FOOT[0] - LAND[0], FOOT[1] - LAND[1]) / FALL },
        ramp(FOOT, [0.5, 1], FAST, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, 1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const sink = t < ARRIVE ? 0 : since < SWING ? 1 : 1 - easeInOutSine(over(since, 2.5, 3.5))
    const bolt = t < ARRIVE ? 0 : since < 0 ? easeInQuad(over(t, ARRIVE + 0.05, FIRE)) : since < 2.5 ? 1 : 1 - easeInOutSine(over(since, 2.5, 3.5))
    const open = since < 0 ? 0 : since < SWING ? easeInQuad(over(since, 0, SWING)) : since < 2.5 ? 1 : 1 - easeOutCubic(over(since, 2.5, 3.5))

    // The rail either side of the door, and the pit's walls hung from it.
    rail(p, k, ink, weight, -0.5, HINGE)
    rail(p, k, ink, weight, DOOR_W / 2, 0.5)
    outline(p, ink, weight)
    p.line(-WALL * k, FLOOR * k, -WALL * k, RAMP0[1] * k)
    p.line(WALL * k, FLOOR * k, WALL * k, 0.72 * k)
    // The ramp from the west wall to the rail out, on two struts to the ground.
    p.line(RAMP0[0] * k, RAMP0[1] * k, RAMP1[0] * k, RAMP1[1] * k)
    p.line(RAMP1[0] * k, RAMP1[1] * k, 0.5 * k, (1 + FLOOR) * k)
    for (const x of [-0.2, 0.2]) p.line(x * k, onRamp(x) * k + (R / Math.cos(SLOPE)) * k, x * k, 1.5 * k)
    p.line(-0.42 * k, 1.5 * k, 0.42 * k, 1.5 * k)

    // The rocker: a bar on a pin under the rail. The door's free end sinks
    // onto its west end; its east end lifts and lets the bolt draw.
    p.push()
    p.translate(ROCKER[0] * k, ROCKER[1] * k)
    p.rotate(-0.25 * sink)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, 0.24 * k, 0.045 * k, 0.01 * k)
    solid(p, ink, weight, bg)
    p.circle(0, 0, 0.04 * k)
    p.pop()
    // The bolt: a bar under the door's free edge, drawn east into the jamb.
    const boltX = BOLT_X + BOLT_DRAW * bolt
    solid(p, ink, weight, s.color)
    p.rect((boltX + BOLT_L / 2) * k, (FLOOR + 0.075) * k, BOLT_L * k, 0.05 * k, 0.01 * k)

    // The door, hinged at its west end.
    p.push()
    p.translate(HINGE * k, FLOOR * k)
    p.rotate(open * 1.5 + sink * (1 - open) * 0.06)
    solid(p, ink, weight, s.color)
    p.rect((DOOR_W / 2) * k, 0.025 * k, DOOR_W * k, 0.05 * k)
    p.fill(ink)
    p.noStroke()
    for (const f of [0.25, 0.75]) p.circle(DOOR_W * f * k, 0.025 * k, 0.02 * k)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(HINGE * k, FLOOR * k, 0.05 * k)
  },
})
