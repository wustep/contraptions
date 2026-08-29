import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { hold, roll, type Lane, type LaneCtx, type Pt } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, HIT, SHOP_PERIOD, belt, bench, burst, lineOf, pulse } from './shop'

/**
 * A stack light on a post at the east end of the bench. The part rolls off
 * the belt into the tote beside it and stays there, and the light comes on as
 * it lands: the end of the line, announced.
 *
 * It rests for exactly `emit`, so the tote is never empty. The drop off the
 * lip is what keeps the arriving part clear of the one already in it.
 */
const POST = 0.22
/** The belt's end, and where the part comes to rest below it. */
const LIP = -0.26
const REST: Pt = [-0.1, 0.36]
const TRAY0 = -0.24
const TRAY1 = 0.04
const PIT = 0.48
const FALL_V = 6

export const lamp = defineContraption({
  name: 'lamp',
  label: 'Stack Light',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const pieces = [
      ctx.in === null ? hold([LIP, y], ctx.emit) : roll([-0.5, y], [LIP, y], BELT_V),
      roll([LIP, y], REST, FALL_V),
      ctx.out === null ? hold(REST, ctx.emit) : roll(REST, [0.5, y], BELT_V),
    ]
    return { pieces }
  },
  setup: ({ color, theme }) => ({ color, bg: theme.bg }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const lit = pulse(u, HIT, 48, SHOP_PERIOD)
    const lens = BENCH - 0.4
    const x0 = line?.in === false ? -0.44 : -0.5

    bench(p, k, ink, weight, x0, LIP + 0.02, false)
    belt(p, k, ink, weight, s.color, x0, LIP, u * BELT_SPAN)
    bench(p, k, ink, weight, TRAY1, 0.5, false)

    // The tote the part drops into, open at the top.
    outline(p, ink, weight)
    for (const x of [TRAY0, TRAY1]) p.line(x * k, (BENCH - 0.06) * k, x * k, PIT * k)
    p.line(TRAY0 * k, PIT * k, TRAY1 * k, PIT * k)

    // The post on its foot, and the lamp head.
    outline(p, ink, weight)
    p.line(POST * k, BENCH * k, POST * k, (lens + 0.1) * k)
    p.rect(POST * k, (BENCH - 0.08) * k, 0.22 * k, 0.14 * k)
    solid(p, ink, weight, s.color)
    p.circle((POST + 0.05) * k, (BENCH - 0.08) * k, 0.05 * k)

    burst(p, k, s.color, weight, POST, lens, lit, 0.14, 0.26, 8, Math.PI / 8)

    solid(p, ink, weight, s.bg)
    p.rect(POST * k, (lens + 0.16) * k, 0.2 * k, 0.14 * k)
    solid(p, ink, weight, lit > 0.02 ? s.color : s.bg)
    p.rect(POST * k, lens * k, 0.2 * k, 0.16 * k, 0.03 * k)
    outline(p, ink, weight)
    p.line((POST - 0.12) * k, (lens - 0.1) * k, (POST + 0.12) * k, (lens - 0.1) * k)
  },
  over: (p, s, { size: k, ink, weight }) => {
    // The tote's front, so what has landed is inside it.
    solid(p, ink, weight, s.color)
    p.rect(((TRAY0 + TRAY1) / 2) * k, ((0.4 + PIT) / 2) * k, (TRAY1 - TRAY0) * k, (PIT - 0.4) * k)
  },
})
