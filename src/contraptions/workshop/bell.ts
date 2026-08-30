import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx, type Pt } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, HIT, SHOP_PERIOD, belt, bench, lineOf, pulse } from './shop'

/**
 * A bell hung over the end of the bench. The part rolls off the belt into the
 * pan beneath it and stays there, and the striker rings the bell as it lands.
 * Nothing continues past it.
 */
const BELL_X = 0.16
const BW = 0.34
const BH = 0.26
/** High enough that the bell's mouth clears what is in the pan. */
const HANGER = BENCH - 0.6
const LIP = -0.02
const REST: Pt = [0.14, 0.36]
const TRAY0 = 0
const TRAY1 = 0.28
const PIT = 0.48
const FALL_V = 6

export const bell = defineContraption({
  name: 'bell',
  label: 'Bell',
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
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const ring = pulse(u, HIT, 40, SHOP_PERIOD)
    const swing = ring * 0.3 * Math.sin(ring * Math.PI * 5)
    const ext = 0.1 * (easeOutCubic(seg(u, HIT - 0.02, HIT)) - easeInOutCubic(seg(u, HIT + 0.04, HIT + 0.14)))
    const lip = HANGER + 0.08 + BH
    const x0 = line?.in === false ? -0.36 : -0.5

    bench(p, k, ink, weight, x0, LIP + 0.02, false)
    belt(p, k, ink, weight, s.color, x0, LIP, u * BELT_SPAN)
    bench(p, k, ink, weight, TRAY1, 0.5, false)

    // The pan under the bell.
    outline(p, ink, weight)
    for (const x of [TRAY0, TRAY1]) p.line(x * k, (BENCH - 0.06) * k, x * k, PIT * k)
    p.line(TRAY0 * k, PIT * k, TRAY1 * k, PIT * k)

    if (ring > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (let i = 1; i <= 2; i++) {
        const r = BW * (0.9 + i * 0.3 + ring * 0.3) * k
        p.arc((BELL_X - BW * 0.35) * k, (lip - BH * 0.5) * k, r, r, Math.PI - 0.6, Math.PI + 0.6)
      }
      p.pop()
    }

    outline(p, ink, weight)
    p.line(0.36 * k, (BENCH - 0.06) * k, 0.36 * k, HANGER * k)
    p.line(BELL_X * k, HANGER * k, 0.36 * k, HANGER * k)

    p.push()
    p.translate(BELL_X * k, HANGER * k)
    p.rotate(swing)
    outline(p, ink, weight)
    p.line(0, 0, 0, 0.08 * k)
    p.translate(0, 0.08 * k)
    p.fill(s.color)
    p.beginShape()
    p.vertex((-BW / 2) * k, BH * k)
    p.bezierVertex((-BW / 2) * k, 0, -BW * 0.22 * k, 0, 0, 0)
    p.bezierVertex(BW * 0.22 * k, 0, (BW / 2) * k, 0, (BW / 2) * k, BH * k)
    p.endShape(p.CLOSE)
    p.line((-BW / 2) * k, BH * k, (BW / 2) * k, BH * k)
    p.circle(0, (BH + 0.05) * k, 0.1 * k)
    p.pop()

    outline(p, ink, weight)
    p.line(0.42 * k, lip * k, 0.42 * k, (BENCH - 0.06) * k)
    p.rect(0.42 * k, lip * k, 0.12 * k, 0.12 * k)
    p.line((0.34 - ext) * k, lip * k, 0.34 * k, lip * k)
    solid(p, ink, weight, s.color)
    p.circle((0.32 - ext) * k, lip * k, 0.07 * k)
  },
  over: (p, s, { size: k, ink, weight }) => {
    // The pan's front, so what has landed is inside it.
    solid(p, ink, weight, s.color)
    p.rect(((TRAY0 + TRAY1) / 2) * k, ((0.4 + PIT) / 2) * k, (TRAY1 - TRAY0) * k, (PIT - 0.4) * k)
  },
})
