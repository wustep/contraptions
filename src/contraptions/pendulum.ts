import { defineContraption } from '../core/define'
import { ceilRail, outline, solid } from '../core/draw'
import { pendulum as pendulumTable, swing } from '../core/physics'

const ARM = 0.58
const BOB = 1 / 3
/** asin of the room left over once the bob's radius is taken off the wall. */
const SWING = Math.asin((0.5 - BOB / 2 - 0.03) / ARM)

/** A weight swinging from the ceiling rail, under real pendulum motion. */
export const pendulum = defineContraption({
  name: 'pendulum',
  label: 'Pendulum',
  tags: ['swing'],
  // Gravity gives this one an up.
  rotations: [0],
  period: 120,
  mirror: false,
  fireAt: 0.25,
  // The widest swing the cell can hold: at the turning point the bob's far
  // edge lands on the wall. Anything more and the weight swings through the
  // machine next door.
  setup: ({ color, rng }) => ({
    color,
    table: pendulumTable(rng.range(SWING * 0.55, SWING)),
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const arm = size * ARM
    const bob = size * BOB
    // Hang from the ceiling: 0 rad is straight down.
    const theta = swing(s.table, u)
    const bx = arm * Math.sin(theta)
    const by = -size / 2 + arm * Math.cos(theta)

    outline(p, ink, weight)
    ceilRail(p, size)
    p.line(0, -size / 2, bx, by)
    solid(p, ink, weight, s.color)
    p.circle(bx, by, bob)
  },
})
