import { defineContraption } from '../../core/define'
import { outline, solid, teeth } from '../../core/draw'
import { easeInOutCubic, seg } from '../../core/ease'
import { FLOOR, dipLane, flick, floor, since, type Beat } from './parts'

/**
 * A pedal in the line with a counter wheel under it: every ball that rolls
 * over the pedal presses it, the pawl clicks the wheel round one notch, and
 * the pointer shows how many have been by.
 *
 * The lane dips by exactly the pedal's travel over exactly its stroke, so the
 * ball rides the pedal down and up instead of hanging above it.
 */
const FIRE = 0.4
/** The wheel hangs beside the pedal's stem, so both fit under the rail. */
const HUB_X = 0.17
const HUB_Y = 0.32
const R = 0.12
const NOTCHES = 8
const PEDAL = -0.06
/** The pedal's stroke, and the three stretches of it the ball shares. */
const GIVE = 0.05
const DOWN = 0.03
const WAIT = 0.06
const UP = 0.07

export const counter = defineContraption<Beat>({
  name: 'counter',
  label: 'Counter',
  tags: ['ball', 'spin'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => dipLane(ctx, { at: PEDAL, by: GIVE, down: DOWN, wait: WAIT, up: UP }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const press = flick(t, DOWN, DOWN + WAIT, DOWN + WAIT + UP) * GIVE
    // One notch per pass; the wheel is eight-fold, so the loop closes.
    const step = easeInOutCubic(seg(t, 0.02, 0.14))
    const spin = (step * Math.PI * 2) / NOTCHES

    floor(p, k, ink, weight, s, 0.18)

    // The pedal sits in the rail's gap with its stem down to the pawl. Lips
    // just wider than the ball, so it reads as a treadle and not as rail.
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      p.line((PEDAL + side * 0.14) * k, (FLOOR + press) * k, (PEDAL + side * 0.14) * k, (FLOOR - 0.05 + press) * k)
    }
    solid(p, ink, weight, s.color)
    p.rect(PEDAL * k, (FLOOR + 0.025 + press) * k, 0.28 * k, 0.05 * k)
    outline(p, ink, weight)
    p.line(PEDAL * k, (FLOOR + 0.05 + press) * k, PEDAL * k, (FLOOR + 0.13 + press) * k)
    // The pawl, hanging off the stem onto the teeth.
    p.line(PEDAL * k, (FLOOR + 0.13 + press) * k, (PEDAL + 0.08) * k, (FLOOR + 0.17 + press) * k)

    // The wheel and its pointer.
    p.push()
    p.translate(HUB_X * k, HUB_Y * k)
    p.rotate(spin)
    outline(p, ink, weight)
    p.circle(0, 0, R * 2 * k)
    teeth(p, R * k, NOTCHES, 0.04 * k)
    p.line(0, 0, 0, -R * 0.7 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(HUB_X * k, HUB_Y * k, 0.07 * k)
  },
})
