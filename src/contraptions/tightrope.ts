import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutSine, lerp, seg } from '../core/ease'
import { P, block, ground, knob, performer, stroke } from './circus'

/**
 * The unicyclist rides the wire from one platform to the other, the wire
 * sagging under them as they cross and the balance pole rocking, then turns
 * round on the far platform and rides back.
 */
const PLATFORM_X = 1.32
const ROPE_Y = -0.12
const ANCHOR = 1.19
const WHEEL = 0.09
const POLE = 0.7
const SAG = 0.1

export const tightrope = defineContraption({
  name: 'tightrope',
  label: 'Tightrope',
  tags: ['aerial'],
  role: 'relay',
  span: [3, 1],
  rotations: [0],
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const x =
      u < 0.05 ? -PLATFORM_X
      : u < 0.47 ? lerp(-PLATFORM_X, PLATFORM_X, easeInOutSine(seg(u, 0.05, 0.47)))
      : u < 0.53 ? PLATFORM_X
      : u < 0.95 ? lerp(PLATFORM_X, -PLATFORM_X, easeInOutSine(seg(u, 0.53, 0.95)))
      : -PLATFORM_X
    const onRope = Math.abs(x) < ANCHOR
    const sag = onRope ? SAG * (1 - (x / ANCHOR) * (x / ANCHOR)) : 0
    const contact = ROPE_Y + sag
    const wheelY = contact - WHEEL
    const riderY = wheelY - WHEEL - P / 2
    const rock = 0.14 * Math.sin(Math.PI * 6 * u) * (onRope ? 1 : 0.3)

    outline(p, ink, weight)
    ground(p, k, 3)
    for (const side of [-1, 1]) {
      stroke(p, k, side * PLATFORM_X, 0.5, side * PLATFORM_X, ROPE_Y)
      block(p, k, ink, weight, s.color, side * PLATFORM_X, ROPE_Y - 0.025, 0.28, 0.05)
    }
    outline(p, ink, weight)
    if (onRope) {
      stroke(p, k, -ANCHOR, ROPE_Y, x, contact)
      stroke(p, k, x, contact, ANCHOR, ROPE_Y)
    } else stroke(p, k, -ANCHOR, ROPE_Y, ANCHOR, ROPE_Y)

    // The wheel turns as far as it rolls.
    p.push()
    p.translate(x * k, wheelY * k)
    p.rotate(x / WHEEL)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, WHEEL * 2 * k)
    outline(p, ink, weight)
    p.line(-WHEEL * k, 0, WHEEL * k, 0)
    p.line(0, -WHEEL * k, 0, WHEEL * k)
    p.pop()
    stroke(p, k, x, wheelY, x, riderY)

    performer(p, k, ink, weight, s.color, x, riderY)
    p.push()
    p.translate(x * k, riderY * k)
    p.rotate(rock)
    outline(p, ink, weight)
    p.line((-POLE / 2) * k, 0, (POLE / 2) * k, 0)
    p.pop()
    knob(p, k, ink, weight, s.color, x - (POLE / 2) * Math.cos(rock), riderY - (POLE / 2) * Math.sin(rock), 0.06)
    knob(p, k, ink, weight, s.color, x + (POLE / 2) * Math.cos(rock), riderY + (POLE / 2) * Math.sin(rock), 0.06)
  },
})
