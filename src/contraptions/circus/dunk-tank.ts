import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutSine, easeInQuad, seg } from '../../core/ease'
import { P, block, ground, knob, performer, splash, stroke } from './circus'

/**
 * The signal is the ball that hits the target: the paddle kicks back, the
 * seat drops the clown into the tank with a splash, and the seat winds
 * slowly back up out of the water with the clown on it for the next throw.
 */
const HINGE: [number, number] = [0.06, 0]
const PLANK = 0.36
const SEAT = 0.3
const DROPPED = 1.7
const TANK_X = 0.02
const TANK_TOP = 0.16
const WATER = 0.22
const TARGET: [number, number] = [-0.34, -0.16]

const rot = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

export const dunkTank = defineContraption({
  name: 'dunk-tank',
  label: 'Dunk Tank',
  tags: ['sideshow'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, fired }) => {
    const angle =
      u < 0.06 ? DROPPED * easeInQuad(seg(u, 0, 0.06))
      : u < 0.32 ? DROPPED
      : DROPPED * (1 - easeInOutSine(seg(u, 0.32, 0.9)))
    const [sx, sy] = rot(SEAT, -P / 2 - 0.02, angle)
    const kick = -0.9 * fired

    outline(p, ink, weight)
    ground(p, k, 1)
    // The target on its pole, and the rod that trips the seat.
    stroke(p, k, TARGET[0], 0.5, TARGET[0], TARGET[1])
    stroke(p, k, TARGET[0], TARGET[1], HINGE[0], TARGET[1])
    stroke(p, k, HINGE[0], TARGET[1], HINGE[0], HINGE[1])
    p.push()
    p.translate(TARGET[0] * k, TARGET[1] * k)
    p.rotate(kick)
    outline(p, ink, weight)
    p.line(0, 0, 0, -0.12 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -0.22 * k, 0.2 * k)
    p.pop()

    // The post and the seat, hinged on it.
    stroke(p, k, HINGE[0], 0.5, HINGE[0], HINGE[1])
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect((PLANK / 2) * k, 0, PLANK * k, 0.05 * k)
    p.pop()
    knob(p, k, ink, weight, s.color, HINGE[0], HINGE[1], 0.06)
    performer(p, k, ink, weight, s.color, HINGE[0] + sx, HINGE[1] + sy)

    // The water goes on last, so whatever is under it is under it.
    block(p, k, ink, weight, s.color, TANK_X + (0.5 - TANK_X) / 2, (WATER + 0.5) / 2, 0.5 - TANK_X, 0.5 - WATER)
    outline(p, ink, weight)
    p.rect((TANK_X + (0.5 - TANK_X) / 2) * k, ((TANK_TOP + 0.5) / 2) * k, (0.5 - TANK_X) * k, (0.5 - TANK_TOP) * k)
    splash(p, k, s.color, 0.22, WATER, seg(u, 0.05, 0.26), 0.16)
  },
})
