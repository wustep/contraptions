import { defineContraption } from '../../core/define'
import { solid } from '../../core/draw'
import { clamp, easeInOutCubic, easeInQuad, seg } from '../../core/ease'
import { FLOOR, SPEED, floor, rollLane, since, type Beat } from './parts'

/**
 * A row of bars across the line: the ball knocks the first one going in, the
 * row goes over one by one, and the last one falls out across the edge into
 * the next cell, then they stand back up in reverse while the ball is long
 * gone.
 *
 * The lane is the plain one — the ball crosses in a straight roll — and all
 * this cell owns is the row's timing off that crossing.
 */
const FIRE = 0.4
const COUNT = 5
const SPAN = 0.6
const H = 0.28
const W = 0.08
/**
 * The row sits west of centre, because the last bar falls out across it: at
 * full stretch its tip must still be inside the cell, or the row spills into
 * the next machine.
 */
const MID = -0.1
const FIRST = MID - SPAN / 2
/**
 * Fraction of the loop one bar takes to go over. Short enough that the wave
 * keeps pace with the ball — a bar the ball has already passed is a bar it
 * went through.
 */
const FALL = 0.02
/** Where a bar comes to rest against the next; the last has nothing to lean on. */
const REST = 0.85
/** The ball reaches the first bar before the centre, by that much rail. */
const START = FIRE + FIRST / SPEED

export const dominoes = defineContraption<Beat>({
  name: 'dominoes',
  label: 'Dominoes',
  tags: ['ball', 'strike'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, START)
    const gap = SPAN / (COUNT - 1)
    // A falling bar starts the next at the instant it touches it, which is a
    // geometric angle and, inverting the fall curve, a moment in its fall.
    const contact = Math.asin(clamp(gap / H, 0, 1))
    const lead = Math.sqrt(clamp(contact / REST, 0, 1))

    floor(p, k, ink, weight, s)

    for (let i = 0; i < COUNT; i++) {
      const x = FIRST + gap * i
      const last = i === COUNT - 1
      const start = i * lead * FALL
      const fallen = easeInQuad(seg(t, start, start + FALL))
      const riseAt = 0.62 + (COUNT - 1 - i) * 0.03
      const rise = easeInOutCubic(seg(t, riseAt, riseAt + 0.1))
      p.push()
      p.translate(x * k, FLOOR * k)
      p.rotate((last ? 1 : REST) * fallen * (1 - rise))
      solid(p, ink, weight, s.color)
      p.rect(0, (-H / 2) * k, W * k, H * k)
      p.pop()
    }
  },
})
