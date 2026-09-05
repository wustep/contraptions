import { defineContraption } from '../../core/define'
import { ride, type Lane, type LaneCtx } from '../../core/lane'
import { CASCADE_RIDE, shaftFrame } from '../../worlds/goldberg/elevator'
import type { Beat } from '../cascade/parts'

/**
 * A middle cell of an elevator deeper than two cells. The lift above and the
 * well below are the cascade's; this is the floor in between, which owns
 * nothing but its stretch of guides. The car and its passenger come through
 * on the stack's clock, drawn by the world, at the one speed the whole
 * descent shares.
 */
export const shaft = defineContraption<Beat>({
  name: 'shaft',
  label: 'Shaft',
  tags: ['ball', 'lift'],
  role: 'relay',
  inlets: ['N'],
  outlets: ['S'],
  rotations: [0],
  fireAt: 0,
  lane: (_ctx: LaneCtx): Lane => ({
    pieces: [ride([0, -0.5], [0, 0.5], CASCADE_RIDE.v)],
  }),
  setup: ({ color }) => ({ color }),
  draw: (p, _s, { size: k, ink, weight }) => {
    shaftFrame(p, k, ink, weight)
  },
})
