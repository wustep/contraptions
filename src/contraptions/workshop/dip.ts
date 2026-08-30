import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, lerp, mod, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, HIT, PART, PART_Y, RAIL, bench, rollers } from './shop'

/**
 * A trolley picks the part off the bench, carries it out over the vat, lowers
 * it in for a soak and hauls it back out, and sets it down again on the far
 * side. The trolley runs back west empty while the next part rolls in.
 *
 * Trolley and part come off one schedule — the same segment times build the
 * lane and drive the hook — so the hook cannot arrive without its load. The
 * dye is drawn in `over`, so the part goes under the surface.
 */
const CARRY = -0.16
const SUNK = 0.1
const SURFACE = 0.04
const PICK = -0.42
const PLACE = 0.42
const HOIST_V = 12
const TROLLEY_V = 8
const SOAK = 0.08

const STUB = (0.5 + PICK) / BELT_V
const RISE = (PART_Y - CARRY) / HOIST_V
const RUN = -PICK / TROLLEY_V
const SINK = (SUNK - CARRY) / HOIST_V
/** Cumulative lane times: in, up, over, down, soak, up, over, down, out. */
const T1 = STUB
const T2 = T1 + RISE
const T3 = T2 + RUN
const T4 = T3 + SINK
const T5 = T4 + SOAK
const T6 = T5 + SINK
const T7 = T6 + RUN
const T8 = T7 + RISE
const FIRE = T4 + SOAK / 2

/** The same schedule read on the bench's own clock. */
const at = (t: number) => mod(HIT + 2 * (t - FIRE), 1)
const U0 = at(0)
const U1 = at(T1)
const U2 = at(T2)
const U3 = at(T3)
const U4 = at(T4)
const U5 = at(T5)
const U6 = at(T6)
const U7 = at(T7)
const U8 = at(T8)

export const dip = defineContraption({
  name: 'dip',
  label: 'Dip Tank',
  tags: ['work'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const pieces = [
      ctx.in === null ? hold([PICK, y], ctx.emit) : roll([-0.5, y], [PICK, y], BELT_V),
      roll([PICK, y], [PICK, CARRY], HOIST_V),
      roll([PICK, CARRY], [0, CARRY], TROLLEY_V),
      roll([0, CARRY], [0, SUNK], HOIST_V),
      hold([0, SUNK], SOAK),
      roll([0, SUNK], [0, CARRY], HOIST_V),
      roll([0, CARRY], [PLACE, CARRY], TROLLEY_V),
      roll([PLACE, CARRY], [PLACE, y], HOIST_V),
      ctx.out === null ? hold([PLACE, y], ctx.emit) : roll([PLACE, y], [0.5, y], BELT_V),
    ]
    return { pieces, fire: FIRE }
  },
  setup: ({ color, rng, theme }) => ({
    color,
    dye: rng.pick(theme.colors.filter((c) => c !== color)) ?? color,
  }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Empty and on its way home, or loaded and following the lane.
    const home = u >= U8 || u < U0
    const back = home ? mod(u - U8, 1) / mod(U0 - U8, 1) : 0
    const x =
      home ? lerp(PLACE, PICK, easeInOutCubic(back))
      : u < U2 ? PICK
      : u < U3 ? lerp(PICK, 0, seg(u, U2, U3))
      : u < U6 ? 0
      : u < U7 ? lerp(0, PLACE, seg(u, U6, U7))
      : PLACE
    const y =
      home ? lerp(PART_Y, RAIL + 0.2, Math.sin(Math.PI * back))
      : u < U1 ? PART_Y
      : u < U2 ? lerp(PART_Y, CARRY, seg(u, U1, U2))
      : u < U3 ? CARRY
      : u < U4 ? lerp(CARRY, SUNK, seg(u, U3, U4))
      : u < U5 ? SUNK
      : u < U6 ? lerp(SUNK, CARRY, seg(u, U5, U6))
      : u < U7 ? CARRY
      : u < U8 ? lerp(CARRY, PART_Y, seg(u, U7, U8))
      : PART_Y

    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, PICK + 0.09, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, PLACE - 0.09, 0.5, u * BELT_SPAN)

    // The rail and its hangers, the trolley, and the hook rod.
    outline(p, ink, weight)
    p.line(-0.5 * k, RAIL * k, 0.5 * k, RAIL * k)
    for (const hx of [-0.34, 0.34]) p.line(hx * k, -0.5 * k, hx * k, RAIL * k)
    p.line(x * k, RAIL * k, x * k, (y - PART / 2) * k)
    for (const wx of [-0.05, 0.05]) p.circle((x + wx) * k, RAIL * k, 0.05 * k)
    solid(p, ink, weight, s.color)
    p.rect(x * k, (RAIL - 0.055) * k, 0.16 * k, 0.05 * k)
    outline(p, ink, weight)
    p.circle(x * k, (y - PART / 2 - 0.02) * k, 0.05 * k)

    // The vat's walls. Its dye is drawn over the part, in `over`.
    for (const vx of [-0.24, 0.24]) p.line(vx * k, -0.02 * k, vx * k, BENCH * k)
  },
  over: (p, s, { size: k, u, ink, weight }) => {
    p.push()
    p.noStroke()
    p.fill(s.dye)
    p.rect(0, ((SURFACE + BENCH) / 2) * k, 0.44 * k, (BENCH - SURFACE) * k)
    p.pop()
    outline(p, ink, weight)
    p.line(-0.24 * k, SURFACE * k, 0.24 * k, SURFACE * k)

    // Drips off the part on the way out.
    if (u >= U5 && u < U7) {
      p.push()
      p.noStroke()
      p.fill(s.dye)
      for (const [dx, a] of [[-0.06, U5], [0.07, U5 + 0.04]] as const) {
        const f = seg(u, a, a + 0.1)
        if (f > 0 && f < 1) {
          const carry = u < U6 ? lerp(SUNK, CARRY, seg(u, U5, U6)) : CARRY
          p.circle((dx + (u < U6 ? 0 : lerp(0, PLACE, seg(u, U6, U7)))) * k, lerp(carry + PART / 2, SURFACE, easeInQuad(f)) * k, 0.035 * k)
        }
      }
      p.pop()
    }
  },
})
