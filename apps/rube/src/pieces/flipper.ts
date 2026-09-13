import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A pinball flipper. The ball rolls onto the bat and over the switch under
 * it; the solenoid fires; the bat snaps up and the ball is flung a floor
 * up onto a shelf, where a bumper stops it and it rolls on. The bat drops
 * back on its own.
 */
const HINGE: Pt = [-0.3, FLOOR + 0.03]
const BAT = 0.5
const SEAT = 0.06
const SHELF_Y = -1
const LAND: Pt = [0.3, SHELF_Y]
const ARRIVE = (0.5 + SEAT) / ROLL
const CHARGE = 0.2
const SNAP = 0.07
const FIRE = ARRIVE + CHARGE
const UP = -1.05

const batAt = (since: number) =>
  since < 0 ? 0 : since < SNAP ? UP * easeOutCubic(over(since, 0, SNAP)) : since < 0.5 ? UP : UP * (1 - easeInOutSine(over(since, 0.5, 0.9)))

export const flipper = definePiece<{ color: string }>({
  name: 'flipper',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SEAT, 0], ROLL, 'out'),
        wait([SEAT, 0], CHARGE + SNAP * 0.6),
        fly([SEAT, -0.06], LAND, 0.42, 0.22),
        fly(LAND, [LAND[0] + 0.1, SHELF_Y], 0.06, 0.02),
        roll([LAND[0] + 0.1, SHELF_Y], [0.5, SHELF_Y], ROLL, 'out'),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const a = batAt(since)
    const pressed = t < ARRIVE ? 0 : since < 0.5 ? 1 : 1 - over(since, 0.5, 0.7)

    // The rail to the hinge; the shelf above on its post, with the bumper.
    rail(p, k, ink, weight, -0.5, HINGE[0])
    rail(p, k, ink, weight, 0.08, 0.5, SHELF_Y + FLOOR)
    outline(p, ink, weight)
    p.line(0.44 * k, (SHELF_Y + FLOOR) * k, 0.44 * k, 0.5 * k)
    p.line(0.38 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    solid(p, ink, weight, s.color)
    p.rect(0.47 * k, (SHELF_Y - 0.04) * k, 0.05 * k, 0.28 * k)
    // The solenoid under the bat: a box on the ground with its plunger up to the bat.
    solid(p, ink, weight, bg)
    p.rect(0.02 * k, 0.36 * k, 0.24 * k, 0.16 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(-0.1 * k, 0.5 * k, 0.14 * k, 0.5 * k)
    const plunger = since < 0 ? 0 : since < SNAP ? 1 : since < 0.5 ? 1 : 1 - over(since, 0.5, 0.9)
    p.line(0.02 * k, 0.28 * k, 0.02 * k, (0.28 - 0.1 * plunger) * k)
    // The switch: a tongue in the rail under the bat's tip.
    p.push()
    p.translate(0.16 * k, (FLOOR + 0.05) * k)
    p.rotate(0.5 * pressed)
    solid(p, ink, weight, s.color)
    p.rect(-0.05 * k, 0, 0.1 * k, 0.03 * k)
    p.pop()
    outline(p, ink, weight)
    p.line(0.16 * k, (FLOOR + 0.05) * k, 0.16 * k, 0.36 * k)
    // The bat, hinged at its heel.
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, -0.06 * k)
    p.vertex(BAT * k, -0.03 * k)
    p.vertex(BAT * k, 0.03 * k)
    p.vertex(0, 0.06 * k)
    p.endShape(p.CLOSE)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(HINGE[0] * k, HINGE[1] * k, 0.06 * k)
    // The snap.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, 0.16 * k, -0.1 * k, (0.1 + 0.16 * f) * k, (0.16 + 0.2 * f) * k, 5, 3.6)
      p.pop()
    }
  },
})
