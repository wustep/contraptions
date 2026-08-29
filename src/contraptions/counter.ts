import { defineContraption } from '../core/define'
import { clipCell, outline, solid, teeth } from '../core/draw'
import { easeInOutCubic, seg } from '../core/ease'
import { FLOOR, flick, floor, heading, rollIn, rollOut, since, token, tokenColor, type Beat } from './parts'

/**
 * A pedal in the line with a counter wheel under it: every ball that rolls
 * over the pedal presses it, the pawl clicks the wheel round one notch, and
 * the pointer shows how many have been by.
 */
const FIRE = 0.4
const HUB = 0.3
const R = 0.15
const NOTCHES = 8

export const counter = defineContraption<Beat>({
  name: 'counter',
  label: 'Counter',
  tags: ['ball', 'spin'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const press = flick(t, 0.04, 0.08, 0.2) * 0.05
    // One notch per pass; the wheel is eight-fold, so the loop closes.
    const step = easeInOutCubic(seg(t, 0.03, 0.15))
    const spin = (h * step * Math.PI * 2) / NOTCHES

    floor(p, k, ink, weight, s, 0.12)

    // The pedal, on a stem down to the pawl.
    outline(p, ink, weight)
    p.line(0, (FLOOR + press) * k, 0, (HUB - R - 0.06 + press) * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR - 0.01 + press) * k, 0.2 * k, 0.05 * k)

    // The wheel and its pointer.
    p.push()
    p.translate(0, HUB * k)
    p.rotate(spin)
    outline(p, ink, weight)
    p.circle(0, 0, R * 2 * k)
    teeth(p, R * k, NOTCHES, 0.045 * k)
    p.line(0, 0, 0, -R * 0.75 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, HUB * k, 0.08 * k)
    // The pawl, hanging from the pedal's stem onto the teeth.
    outline(p, ink, weight)
    p.line(0, (HUB - R - 0.06 + press) * k, h * 0.09 * k, (HUB - R + 0.01 + press) * k)

    clipCell(p, k, () => {
      const at = rollIn(s, u, FIRE) ?? rollOut(s, u, FIRE)
      if (at) token(p, k, ink, weight, tokenColor(s), at)
    })
  },
})
