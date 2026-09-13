import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad, easeInOutSine, easeOutCubic } from '../../../../src/core/ease'
import { FALL, FLOOR, ROLL, definePiece, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A trapdoor. The ball rolls onto it and stops in the dip it makes; its
 * weight tilts a lever under the door that draws the bolt, slowly; the
 * bolt clears the edge and the door swings; the ball falls into the pit
 * below onto a ramp and rolls out the far side, one floor down.
 */
const DOOR_W = 0.34
const HINGE = -DOOR_W / 2
const ARRIVE = 0.5 / ROLL
const DRAW = 0.55
const SWING = 0.1
const FIRE = ARRIVE + DRAW
/** The ramp in the pit, from its high west end to the rail. */
const RAMP0: Pt = [-0.36, 0.69]
const RAMP1: Pt = [0.34, 1.1]
/** Where the ball's centre line along the ramp, one radius above it, meets the rail. */
const PATH1: Pt = [0.285, 0.987]
/** Where a straight fall from the door meets that line. */
const LAND: Pt = [0, 0.82]

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
        roll([-0.5, 0], [0, 0.02], ROLL, 'out'),
        wait([0, 0.02], DRAW + SWING * 0.3),
        { from: [0, 0.02], to: LAND, dur: Math.hypot(LAND[1] - 0.02) / FALL, ease: 'in' },
        { from: LAND, to: PATH1, dur: 0.16, ease: 'in' },
        roll([PATH1[0], 1], [0.5, 1], ROLL * 1.3, 'out'),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, 1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const sink = t < ARRIVE ? 0 : since < SWING ? 1 : 1 - easeInOutSine(over(since, 2.5, 3.5))
    const bolt = t < ARRIVE ? 0 : since < 0 ? easeInQuad(over(t, ARRIVE + 0.05, FIRE)) : since < 2.5 ? 1 : 1 - easeInOutSine(over(since, 2.5, 3.5))
    const open = since < 0 ? 0 : since < SWING ? easeInQuad(over(since, 0, SWING)) : since < 2.5 ? 1 : 1 - easeOutCubic(over(since, 2.5, 3.5))

    // The rail either side of the door.
    rail(p, k, ink, weight, -0.5, HINGE)
    rail(p, k, ink, weight, DOOR_W / 2, 0.5)
    // The pit: walls down to the ramp, the ramp, and the rail out.
    outline(p, ink, weight)
    p.line(-0.4 * k, (FLOOR + 0.1) * k, -0.4 * k, RAMP0[1] * k)
    p.line(0.4 * k, (FLOOR + 0.1) * k, 0.4 * k, 0.62 * k)
    p.line(RAMP0[0] * k, RAMP0[1] * k, RAMP1[0] * k, RAMP1[1] * k)
    p.line(RAMP1[0] * k, (1 + FLOOR) * k, 0.5 * k, (1 + FLOOR) * k)
    // Struts under the ramp.
    for (const f of [0.3, 0.7]) {
      const x = RAMP0[0] + (RAMP1[0] - RAMP0[0]) * f
      const y = RAMP0[1] + (RAMP1[1] - RAMP0[1]) * f
      p.line(x * k, y * k, x * k, 1.5 * k)
    }
    p.line(-0.42 * k, 1.5 * k, 0.42 * k, 1.5 * k)

    // The bolt: a bar from the east jamb under the door's free edge, drawn
    // back by the lever as the door sinks.
    const boltX = DOOR_W / 2 + 0.02 + bolt * 0.16
    solid(p, ink, weight, s.color)
    p.rect((boltX + 0.08) * k, (FLOOR + 0.07) * k, 0.16 * k, 0.05 * k)
    outline(p, ink, weight)
    p.line((DOOR_W / 2 + 0.24) * k, (FLOOR + 0.04) * k, (DOOR_W / 2 + 0.24) * k, (FLOOR + 0.16) * k)
    // The lever: from the door's underside to the bolt, tilting as the door sinks.
    p.line(0.02 * k, (FLOOR + 0.05 + sink * 0.02) * k, (boltX + 0.02) * k, (FLOOR + 0.1 + (1 - bolt) * 0.03) * k)
    solid(p, ink, weight, bg)
    p.circle(0.02 * k, (FLOOR + 0.05 + sink * 0.02) * k, 0.035 * k)

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
