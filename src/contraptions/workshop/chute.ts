import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, mod, seg } from '../../core/ease'
import { BELT_SPAN, BENCH, PART, PART_Y, bench, rollers, workLane } from './shop'

/**
 * A chute down from the bay above, feeding the line. Blanks slide down the
 * board, gather at its mouth, and one is tipped onto each part that stops
 * under it before the rollers take it on.
 *
 * The chute is kept clear of the part's own height: the line runs under it,
 * the chute delivers onto it. What slides down the board is the machine's own
 * stock — the part on the bench belongs to the world.
 */
const HIGH = -0.3
const X0 = -0.3
/** The mouth: over the part, clear of its face. */
const X1 = 0.18
const Y1 = 0.02
const RAMP = Math.hypot(X1 - X0, Y1 - HIGH)
const ANGLE = Math.atan2(Y1 - HIGH, X1 - X0)
const DROP = 0.5
const HOLD = 0.12
const CHIP = 0.07

export const chute = defineContraption({
  name: 'chute',
  label: 'Chute',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  weight: 1.2,
  fireAt: DROP,
  lane: (ctx) => workLane(ctx, { at: X1, time: HOLD }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const nx = Math.sin(ANGLE)
    const ny = -Math.cos(ANGLE)

    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, -0.12, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.32, 0.5, u * BELT_SPAN)

    // The bay's shelf and its post, then the board on its strut.
    outline(p, ink, weight)
    p.line(-0.5 * k, HIGH * k, X0 * k, HIGH * k)
    p.line(-0.44 * k, HIGH * k, -0.44 * k, BENCH * k)
    const under = 0.06
    p.line(X0 * k, HIGH * k, X1 * k, Y1 * k)
    p.line((X0 - nx * under) * k, (HIGH - ny * under) * k, (X1 - nx * under) * k, (Y1 - ny * under) * k)
    p.line(X0 * k, HIGH * k, (X0 - nx * under) * k, (HIGH - ny * under) * k)
    p.line(X1 * k, Y1 * k, (X1 - nx * under) * k, (Y1 - ny * under) * k)
    p.line(-0.06 * k, -0.12 * k, -0.06 * k, BENCH * k)

    // Stock sliding down the board, one reaching the mouth every part.
    solid(p, ink, weight, s.color)
    const head = mod(u - DROP, 1)
    for (let i = 0; i < 3; i++) {
      const f = mod(head - i / 3, 1)
      const d = RAMP * f
      p.circle((X0 + Math.cos(ANGLE) * d - nx * CHIP * 0.5) * k, (HIGH + Math.sin(ANGLE) * d - ny * CHIP * 0.5) * k, CHIP * k)
    }
    // The one that is tipped out onto the part.
    const fall = seg(u, DROP, DROP + 0.1)
    if (fall > 0 && fall < 1) {
      p.circle(
        (X1 + 0.04 - nx * CHIP * 0.5) * k,
        ((Y1 - ny * CHIP * 0.5) + (PART_Y - PART / 2 - Y1) * easeInQuad(fall)) * k,
        CHIP * k,
      )
    }
  },
})
