import { defineContraption } from '../../core/define'
import { clipBox, outline, solid } from '../../core/draw'
import { mod } from '../../core/ease'
import { BELT_V, BENCH, HIGH_Y, PART, PART_Y, SHELF, belt, part, roller } from './shop'

/**
 * Three parts go round for ever: west along the low belt, up in the buckets
 * of the chain lift, east along the high belt, and down the drop tube back
 * onto the low belt.
 *
 * The lift's sprocket radius is chosen so its chain goes round exactly once
 * while a part goes round once (three loops), so the buckets, the parts, and
 * the sprocket spokes all close together.
 */
const LOW_Y = 0.5 + PART_Y
const HIGH = -0.5 + HIGH_Y
const DROP_X = 0.75
const SPROCKET_X = -0.8
const CIRCUIT = 3
const T_LIFT = 7 / 6
const LIFT_H = LOW_Y - HIGH
const LIFT_V = LIFT_H / T_LIFT
/** Chain length must be CIRCUIT * LIFT_V for the buckets to come round with the parts. */
const R = (CIRCUIT * LIFT_V - 2 * LIFT_H) / (2 * Math.PI)
const LIFT_X = SPROCKET_X + R
const T_BELT = (DROP_X - LIFT_X) / BELT_V
const T_DROP = CIRCUIT - 2 * T_BELT - T_LIFT
const CHAIN = CIRCUIT * LIFT_V
const BUCKETS = 3

/** Where a part is at circuit time `t`, in loops. */
function locate(t: number): [number, number] {
  if (t < T_BELT) return [DROP_X - (t / T_BELT) * (DROP_X - LIFT_X), LOW_Y]
  t -= T_BELT
  if (t < T_LIFT) return [LIFT_X, LOW_Y - (t / T_LIFT) * LIFT_H]
  t -= T_LIFT
  if (t < T_BELT) return [LIFT_X + (t / T_BELT) * (DROP_X - LIFT_X), HIGH]
  t -= T_BELT
  const f = t / T_DROP
  return [DROP_X, HIGH + LIFT_H * f * f]
}

/** A point on the chain at chain distance `c`, up the near side and down the far. */
function chainAt(c: number): [number, number] {
  if (c < LIFT_H) return [LIFT_X, LOW_Y - c]
  c -= LIFT_H
  if (c < Math.PI * R) {
    const a = -c / R
    return [SPROCKET_X + Math.cos(a) * R, HIGH + Math.sin(a) * R]
  }
  c -= Math.PI * R
  if (c < LIFT_H) return [SPROCKET_X - R, HIGH + c]
  c -= LIFT_H
  const a = Math.PI - c / R
  return [SPROCKET_X + Math.cos(a) * R, LOW_Y + Math.sin(a) * R]
}

export const carousel = defineContraption({
  name: 'carousel',
  label: 'Carousel',
  tags: ['lift', 'line'],
  span: [2, 2],
  rotations: [0],
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size: k, u, ink, weight }) => {
    const spin = (u * LIFT_V) / R

    clipBox(p, w, h, () => {
      // The two belts, the columns under the high one, and the drop tube.
      belt(p, k, ink, weight, s.color, LIFT_X + 0.1, 0.9, -u * BELT_V, 0.5 + BENCH)
      belt(p, k, ink, weight, s.color, LIFT_X + 0.1, 0.9, u * BELT_V, -0.5 + SHELF)
      outline(p, ink, weight)
      for (const x of [-0.3, 0.4]) p.line(x * k, (-0.5 + SHELF + 0.14) * k, x * k, (0.5 + BENCH) * k)
      p.line((DROP_X - 0.16) * k, (HIGH + PART / 2 + 0.04) * k, (DROP_X - 0.16) * k, (LOW_Y - PART / 2 - 0.04) * k)
      p.line((DROP_X + 0.16) * k, (HIGH - PART / 2 - 0.16) * k, (DROP_X + 0.16) * k, (LOW_Y - PART / 2 - 0.04) * k)
      p.line((DROP_X - 0.16) * k, (HIGH - PART / 2 - 0.16) * k, (DROP_X + 0.16) * k, (HIGH - PART / 2 - 0.16) * k)

      // The chain lift: sprockets, chain, buckets.
      outline(p, ink, weight)
      p.line(LIFT_X * k, LOW_Y * k, LIFT_X * k, HIGH * k)
      p.line((SPROCKET_X - R) * k, LOW_Y * k, (SPROCKET_X - R) * k, HIGH * k)
      p.arc(SPROCKET_X * k, HIGH * k, R * 2 * k, R * 2 * k, Math.PI, Math.PI * 2)
      p.arc(SPROCKET_X * k, LOW_Y * k, R * 2 * k, R * 2 * k, 0, Math.PI)
      roller(p, k, ink, weight, s.color, SPROCKET_X, HIGH, R * 0.7, -spin)
      roller(p, k, ink, weight, s.color, SPROCKET_X, LOW_Y, R * 0.7, -spin)
      for (let i = 0; i < BUCKETS; i++) {
        const c = mod((u + i) * LIFT_V - T_BELT * LIFT_V, CHAIN)
        const [bx, by] = chainAt(c)
        outline(p, ink, weight)
        p.line((bx - 0.14) * k, (by + PART / 2 + 0.03) * k, (bx - 0.14) * k, (by - 0.02) * k)
        p.line((bx + 0.14) * k, (by + PART / 2 + 0.03) * k, (bx + 0.14) * k, (by - 0.02) * k)
        solid(p, ink, weight, s.color)
        p.rect(bx * k, (by + PART / 2 + 0.03) * k, 0.3 * k, 0.05 * k)
      }

      // The parts, evenly spaced round the circuit.
      for (let i = 0; i < BUCKETS; i++) {
        const [x, y] = locate(mod(u + i, CIRCUIT))
        part(p, k, ink, weight, s.color, x, y)
      }
    })
  },
})
