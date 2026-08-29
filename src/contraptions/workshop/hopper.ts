import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, FEED_WEST, belt, bench, lineOf } from './shop'

/**
 * A V-funnel over the bench. One blank sits in the throat, the gate lets it
 * drop onto the rollers, and the belt takes it away.
 *
 * The blank waits for exactly `emit`, so the throat is never empty: the part
 * you can see is the next one, and it goes as the one after it arrives.
 */
const GATE = 0.02
const MOUTH = 0.3
const W = 0.055
/** Where the blank waits, clear of the gate under it. */
const SEAT = -0.12
/** Cells per loop it drops at once the gate is out of the way. */
const DROP_V = 8

export const hopper = defineContraption({
  name: 'hopper',
  label: 'Hopper',
  tags: ['feed'],
  role: 'source',
  rotations: [0],
  weight: 1.3,
  fireAt: 0.12,
  lane: (ctx: LaneCtx): Lane => {
    if (ctx.in !== null) return { pieces: [roll([-0.5, ctx.floorY], [0.5, ctx.floorY], BELT_V)] }
    return {
      pieces: [
        hold([0, SEAT], ctx.emit),
        roll([0, SEAT], [0, ctx.floorY], DROP_V),
        roll([0, ctx.floorY], ctx.out === 'S' ? [0, 0.5] : [0.5, ctx.floorY], BELT_V),
      ],
      // The gate opens as the blank goes, not as it lands.
      fire: ctx.emit,
    }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    const open = easeOutCubic(seg(u, 0, 0.05)) - easeInOutCubic(seg(u, 0.16, 0.22))
    const x0 = line?.in ? -0.5 : FEED_WEST

    bench(p, k, ink, weight, x0, 0.5, false)
    belt(p, k, ink, weight, fill, x0, 0.5, u * BELT_SPAN)

    outline(p, ink, weight)
    p.line(-MOUTH * k, -0.46 * k, -W * k, GATE * k)
    p.line(MOUTH * k, -0.46 * k, W * k, GATE * k)
    p.line(-MOUTH * k, -0.46 * k, MOUTH * k, -0.46 * k)
    p.line((-W - 0.02) * k, (GATE + 0.02) * k, (W + 0.18) * k, (GATE + 0.02) * k)
    solid(p, ink, weight, s.color)
    p.rect(open * 0.22 * k, GATE * k, 2 * W * k, 0.045 * k)
  },
})
