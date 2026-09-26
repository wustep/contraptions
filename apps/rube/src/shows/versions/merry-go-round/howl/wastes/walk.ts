import type { Pt } from '../../../../../parts'
import { box, part } from '../kit'
import { SEAM } from '../music'
import { wastesNight } from './sky'
import { CASTLE, drawCastle, STRIDE } from './castle'

/**
 * The castle walking (121.15 → 151.998): the castle builder's. A stub until they replace it (keep the export
 * names): the castle strides right with Sophie standing in its doorway, from the hilltop to its night's stop.
 */

const WIDTH = 46
const LEN = SEAM.morning - SEAM.walk

/** The castle's origin in this part's frame at `u` seconds into the slot: Sophie rides in its door. */
const castleAt = (u: number): Pt => {
  const x = -0.5 + (WIDTH * Math.max(0, Math.min(LEN, u))) / LEN
  return [x - CASTLE.door[0], -CASTLE.door[1] - 0.13]
}

export const walk = part<null>(
  {
    name: 'walk',
    draw: (p, _s, c) => {
      const u = c.t
      const [x, y] = castleAt(u)
      const step = (x - castleAt(0)[0]) / STRIDE
      p.push()
      p.translate(x * c.k, y * c.k)
      drawCastle(p, c.k, c.weight, c.ink, { t: SEAM.walk + u, step, smoke: 0.8, lights: wastesNight(SEAM.walk + u), night: wastesNight(SEAM.walk + u), door: 1 })
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-10, -16, WIDTH + 10, 12),
    exit: [WIDTH, 0] as Pt,
    lane: { segs: [{ from: [-0.5, 0], to: [WIDTH - 0.5, 0], dur: slot.end - slot.begin }], fire: 0 },
    state: null,
  }),
  (slot) => [
    { t: slot.begin + 1.2, cells: 26, hold: [4, -6], w: 0.6 },
    { t: slot.end - 3, cells: 12 },
  ],
)

/** Every strike of this part, in show seconds. */
export const WALK_HITS: number[] = []
