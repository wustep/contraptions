import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { FALL_V, flick, since, type Beat } from '../cascade/parts'
import { roll, type Lane, type LaneCtx } from '../../core/lane'
import { TUBE_W, tubeTies, tubeWalls } from './fall'

/**
 * A middle cell of a fall: the tube runs straight through, and a hinged flap
 * halfway down swings out of the ball's way and back. The flap is the tell
 * that something went by; without it a long drop is an empty rectangle.
 */
const FIRE = 0.5 / FALL_V
const HINGE = -0.02

export const tube = defineContraption<Beat>({
  name: 'tube',
  label: 'Tube',
  tags: ['ball', 'fall'],
  role: 'relay',
  inlets: ['N'],
  outlets: ['S'],
  rotations: [0],
  fireAt: FIRE,
  lane: (_ctx: LaneCtx): Lane => ({
    pieces: [roll([0, -0.5], [0, 0.5], FALL_V)],
    fire: FIRE,
  }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const swing = flick(t, 0.03, 0.08, 0.3)

    tubeWalls(p, k, ink, weight, -0.5, 0.5)
    tubeTies(p, k, ink, weight, -0.5, 0.5)

    // The flap: hinged on the near wall, hanging into the tube at rest,
    // kicked flat against the wall as the ball passes.
    p.push()
    p.translate(-TUBE_W * k, HINGE * k)
    p.rotate(-0.55 + swing * 1.1)
    solid(p, ink, weight, s.color)
    p.rect(0.09 * k, 0, 0.18 * k, 0.05 * k)
    outline(p, ink, weight)
    p.circle(0, 0, 0.05 * k)
    p.pop()
  },
})
