import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, mod, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, PART, PART_Y, belt, bench, lineOf } from './shop'

/**
 * Blanks stand in the magazine over the tray. One drops into it, its weight
 * tips the tray past the balance point, and it slides off the end onto the
 * belt and away east while the tray rights itself for the next.
 *
 * A blank stands in the magazine for exactly `emit`, so the throat is never
 * empty and nothing appears out of nothing.
 */
const PIVOT: [number, number] = [-0.25, -0.05]
const TRAY = 0.45
const TILT = 0.61
/** Tray-local seat of a blank, and where that is when level and when tipped. */
const SEAT = 0.3
const tray = (x: number, y: number, a: number): [number, number] => [
  PIVOT[0] + x * Math.cos(a) - y * Math.sin(a),
  PIVOT[1] + x * Math.sin(a) + y * Math.cos(a),
]
const LEVEL = tray(SEAT, -PART / 2, 0)
const TIPPED = tray(SEAT, -PART / 2, TILT)
const MAG_Y = -0.36
const LAND: [number, number] = [0.3, PART_Y]
const FALL_V = 8
const TIP_V = 4
const SLIDE_V = 5

const DROP_T = (LEVEL[1] - MAG_Y) / FALL_V
const TIP_T = Math.hypot(TIPPED[0] - LEVEL[0], TIPPED[1] - LEVEL[1]) / TIP_V
const SLIDE_T = Math.hypot(LAND[0] - TIPPED[0], LAND[1] - TIPPED[1]) / SLIDE_V
const HIT = 0.46
/** The tray's clock: level, tipping, tipped, righting. */
const U0 = mod(HIT - 2 * (TIP_T + SLIDE_T), 1)
const U1 = mod(HIT - 2 * SLIDE_T, 1)
const U2 = 0.56
const U3 = 0.86

export const tipper = defineContraption({
  name: 'tipper',
  label: 'Tipper',
  tags: ['feed'],
  role: 'source',
  rotations: [0],
  // The blank hitting the belt.
  fireAt: HIT,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    if (ctx.in !== null) return { pieces: [roll([-0.5, y], [0.5, y], BELT_V)] }
    return {
      pieces: [
        hold([LEVEL[0], MAG_Y], ctx.emit),
        roll([LEVEL[0], MAG_Y], LEVEL, FALL_V),
        roll(LEVEL, TIPPED, TIP_V),
        roll(TIPPED, LAND, SLIDE_V),
        ctx.out === null ? hold(LAND, ctx.emit) : roll(LAND, [0.5, y], BELT_V),
      ],
      fire: ctx.emit + DROP_T + TIP_T + SLIDE_T,
    }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    const x0 = line?.in ? -0.5 : 0.06
    // Linear while the blank is riding it, eased coming back empty.
    const tilt = TILT * (seg(u, U0, U1) - easeInOutCubic(seg(u, U2, U3)))

    bench(p, k, ink, weight, x0, 0.5, false)
    belt(p, k, ink, weight, fill, x0 + 0.02, 0.5, u * BELT_SPAN)

    // The magazine over the tray: a tube with the next blank standing in it.
    outline(p, ink, weight)
    const mouth = MAG_Y + PART / 2 + 0.02
    for (const dx of [-0.15, 0.15]) p.line((LEVEL[0] + dx) * k, -0.46 * k, (LEVEL[0] + dx) * k, mouth * k)
    p.line((LEVEL[0] - 0.18) * k, -0.46 * k, (LEVEL[0] + 0.18) * k, -0.46 * k)

    // The post, the counterweight, and the tray on its pivot.
    p.line(PIVOT[0] * k, BENCH * k, PIVOT[0] * k, PIVOT[1] * k)
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(tilt)
    outline(p, ink, weight)
    p.rect((TRAY / 2) * k, 0.02 * k, TRAY * k, 0.04 * k)
    p.line(0, 0, 0, -0.16 * k)
    p.line(0, 0, -0.16 * k, 0)
    solid(p, ink, weight, s.color)
    p.circle(-0.16 * k, 0, 0.12 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.06 * k)
  },
})
