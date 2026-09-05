import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { FALL_V, FLOOR, SPEED, flick, since, type Beat } from '../cascade/parts'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { TUBE_W, tubeWalls } from './fall'

/**
 * The top of a fall. The rail runs to a lip over a tube; the ball rolls off
 * it, knocks the stop on the far wall, and drops out the bottom of the cell.
 * No car, no cable: gravity is the machine here, which is the most Rube
 * Goldberg thing a cell can do.
 *
 * The stop is what fires: the lane pauses for a beat against it, so the knock
 * and the ball are one event.
 */
const FIRE = 0.05
/** Height the backstop reaches above the rail. */
const STOP_TOP = -0.3
/** Where the rail ends: a little past the tube's axis, so the ball is over the hole. */
const LIP = 0.04

export const chute = defineContraption<Beat>({
  name: 'chute',
  label: 'Chute',
  tags: ['ball', 'fall'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['S'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx: LaneCtx): Lane => ({
    pieces: [
      roll([-0.5, ctx.floorY], [0, ctx.floorY], SPEED),
      hold([0, ctx.floorY], 0.02),
      roll([0, ctx.floorY], [0, 0.5], FALL_V),
    ],
  }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const knock = flick(t, 0.03, 0.06, 0.24)

    // The rail, to the lip. Drawn here rather than by `floor` because the
    // floor helper would run it across the hole.
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, LIP * k, FLOOR * k)

    // The tube below the lip: the near wall starts under the rail, the far
    // wall runs up past it and is the backstop.
    outline(p, ink, weight)
    p.line(-TUBE_W * k, (FLOOR + 0.06) * k, -TUBE_W * k, 0.5 * k)
    p.line(TUBE_W * k, STOP_TOP * k, TUBE_W * k, 0.5 * k)
    tubeWalls(p, k, ink, weight, 0.42, 0.5)
    // A bracket holding the backstop to the wall behind.
    p.line(TUBE_W * k, STOP_TOP * k, (TUBE_W + 0.12) * k, (STOP_TOP + 0.05) * k)

    // The stop pad the ball knocks: a coloured block on the backstop that
    // gives a little and springs back.
    solid(p, ink, weight, s.color)
    p.rect((TUBE_W + 0.035 + knock * 0.03) * k, -0.02 * k, 0.07 * k, 0.2 * k)
  },
})
