import { defineContraption } from '../../core/define'
import { outline } from '../../core/draw'
import { seg } from '../../core/ease'
import { BELT_SPAN, BENCH, PART, PART_Y, bench, partLane, roller, rollers } from './shop'

/**
 * Two counter-turning rolls bite the part as it passes between them, the top
 * one riding up on it and settling back once it is through. The part never
 * stops: the mill pulls it along at the speed of the line.
 */
const NIP = 0.3
const ROLL_R = 0.1
/** The top roll rests on the part's face. */
const TOP = PART_Y - PART / 2 - ROLL_R
/** While the part's body is under the nip, in the bench's own clock. */
const IN = NIP - PART
const OUT = NIP + PART

export const mill = defineContraption({
  name: 'mill',
  label: 'Rolling Mill',
  tags: ['work', 'convey'],
  role: 'relay',
  rotations: [0],
  fireAt: NIP,
  lane: (ctx) => partLane(ctx),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const spin = u * Math.PI * 2 * 2
    const bite = seg(u, IN, IN + 0.06) - seg(u, OUT - 0.06, OUT)

    bench(p, k, ink, weight, -0.5, -0.3)
    bench(p, k, ink, weight, 0.3, 0.5)
    rollers(p, k, ink, weight, s.color, -0.5, -0.3, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.3, 0.5, u * BELT_SPAN)

    // The stand, and the two rolls: the top one rides up on what it bites.
    outline(p, ink, weight)
    for (const x of [-0.3, 0.3]) p.line(x * k, BENCH * k, x * k, -0.2 * k)
    p.line(-0.34 * k, -0.2 * k, 0.34 * k, -0.2 * k)
    p.line(0, -0.2 * k, 0, (TOP - bite * 0.03) * k)
    roller(p, k, ink, weight, s.color, 0, BENCH + 0.06, ROLL_R, spin)
    roller(p, k, ink, weight, s.color, 0, TOP - bite * 0.03, ROLL_R, -spin)
  },
})
