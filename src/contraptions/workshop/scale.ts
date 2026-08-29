import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, HIT, bench, rollers } from './shop'

/**
 * The part rolls onto the platform, the platform sinks under it and the
 * needle swings round and settles on its weight, then the rollers take it on.
 *
 * The lane sinks with the platform — one number, so the part never floats a
 * hair above the pan it is meant to be resting on.
 */
const DIAL: [number, number] = [0, -0.22]
const DIAL_R = 0.18
const REST = (3 * Math.PI) / 4
const SWEEP = 1.5 * Math.PI
const READING = 0.62
/** How far the pan gives, and how slowly. */
const SINK = 0.03
const SINK_V = 0.5
const WEIGH = 0.1
/** Where the pan is down, in the bench's own clock. */
const DOWN0 = HIT - 2 * (SINK / SINK_V + WEIGH / 2)
const DOWN1 = DOWN0 + 2 * (SINK / SINK_V)
const UP0 = DOWN1 + 2 * WEIGH
const UP1 = UP0 + 2 * (SINK / SINK_V)

export const scale = defineContraption({
  name: 'scale',
  label: 'Scale',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const pieces = [
      ctx.in === null ? hold([0, y], ctx.emit) : roll([-0.5, y], [0, y], BELT_V),
      roll([0, y], [0, y + SINK], SINK_V),
      hold([0, y + SINK], WEIGH),
      roll([0, y + SINK], [0, y], SINK_V),
      ctx.out === null ? hold([0, y], ctx.emit) : roll([0, y], [0.5, y], BELT_V),
    ]
    return { pieces, fire: 0.25 + SINK / SINK_V + WEIGH / 2 }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Linear, like the lane it has to agree with.
    const sit = seg(u, DOWN0, DOWN1) - seg(u, UP0, UP1)
    const f = seg(u, DOWN0, UP0)
    // A swing that overshoots and rings down onto the reading.
    const swing = (1 - Math.cos(f * Math.PI * 2.5) * Math.pow(1 - f, 2)) * (1 - easeInOutCubic(seg(u, UP0, UP1 + 0.06)))
    const needle = REST + SWEEP * READING * swing
    const dy = sit * SINK

    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, -0.2, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.2, 0.5, u * BELT_SPAN)

    // Column and dial, ticks along the sweep.
    outline(p, ink, weight)
    p.line(0, BENCH * k, 0, (DIAL[1] + DIAL_R) * k)
    p.circle(DIAL[0] * k, DIAL[1] * k, DIAL_R * 2 * k)
    for (let i = 0; i <= 8; i++) {
      const a = REST + (SWEEP * i) / 8
      const r0 = i % 4 === 0 ? DIAL_R - 0.05 : DIAL_R - 0.03
      p.line((DIAL[0] + Math.cos(a) * r0) * k, (DIAL[1] + Math.sin(a) * r0) * k, (DIAL[0] + Math.cos(a) * DIAL_R) * k, (DIAL[1] + Math.sin(a) * DIAL_R) * k)
    }
    p.push()
    p.stroke(s.color)
    p.strokeWeight(weight * 1.4)
    p.line(DIAL[0] * k, DIAL[1] * k, (DIAL[0] + Math.cos(needle) * (DIAL_R - 0.04)) * k, (DIAL[1] + Math.sin(needle) * (DIAL_R - 0.04)) * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(DIAL[0] * k, DIAL[1] * k, 0.06 * k)

    // The pan: its face is the line the part rests on.
    solid(p, ink, weight, s.color)
    p.rect(0, (BENCH + 0.025 + dy) * k, 0.36 * k, 0.05 * k)
  },
})
