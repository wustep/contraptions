import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { clamp, easeInOutCubic, lerp, mod, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, PART, PART_Y, bench, rollers } from './shop'

/**
 * A part rolls in and stops, the arm closes on it, lifts it over the gap and
 * sets it on the far rollers, then swings back empty for the next one.
 *
 * The wrist follows the lane's own segments, so the jaws are always on the
 * part they are carrying: one schedule, two drawings of it.
 */
const SHOULDER: [number, number] = [0, -0.4]
const L1 = 0.3
const L2 = 0.28
const GRIP = 0.1
const PICK = -0.28
const PLACE = 0.28
/** The part's centre while carried, and the wrist under it. */
const LIFT_Y = 0.06
const DOWN = PART_Y - PART / 2 - GRIP
const CARRY = LIFT_Y - PART / 2 - GRIP
const ARM_V = 8
const SWING_V = 6
const GRAB = 0.06
const LET = 0.06
const SET = 0.72

const IN = (0.5 + PICK) / BELT_V
const HOP = (PART_Y - LIFT_Y) / ARM_V
const SWING = (PLACE - PICK) / SWING_V
const FIRE = IN + GRAB + 2 * HOP + SWING

/** The lane's segments read on the bench's own clock. */
const at = (t: number) => mod(SET + 2 * (t - FIRE), 1)
const UARR = at(IN)
const UC = at(IN + GRAB)
const UD = at(IN + GRAB + HOP)
const UE = at(IN + GRAB + HOP + SWING)
const UG = at(FIRE + LET)
const BACK = mod(UARR - UG, 1)

export const arm = defineContraption({
  name: 'arm',
  label: 'Pick and Place',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  fireAt: SET,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const pieces = [
      ctx.in === null ? hold([PICK, y], ctx.emit) : roll([-0.5, y], [PICK, y], BELT_V),
      hold([PICK, y], GRAB),
      roll([PICK, y], [PICK, LIFT_Y], ARM_V),
      roll([PICK, LIFT_Y], [PLACE, LIFT_Y], SWING_V),
      roll([PLACE, LIFT_Y], [PLACE, y], ARM_V),
      hold([PLACE, y], LET),
      ctx.out === null ? hold([PLACE, y], ctx.emit) : roll([PLACE, y], [0.5, y], BELT_V),
    ]
    return { pieces, fire: FIRE }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const { wx, wy } = wrist(u)

    // Two-link IK, elbow always to the east.
    const tx = wx - SHOULDER[0]
    const ty = wy - SHOULDER[1]
    const d = Math.hypot(tx, ty)
    const bend = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
    const a1 = Math.atan2(ty, tx) - bend
    const ex = SHOULDER[0] + Math.cos(a1) * L1
    const ey = SHOULDER[1] + Math.sin(a1) * L1

    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, -0.14, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.14, 0.5, u * BELT_SPAN)

    // Mount, upper arm, forearm, hubs.
    outline(p, ink, weight)
    p.line(-0.12 * k, -0.5 * k, 0.12 * k, -0.5 * k)
    p.line(SHOULDER[0] * k, -0.5 * k, SHOULDER[0] * k, SHOULDER[1] * k)
    p.strokeWeight(weight * 1.6)
    p.line(SHOULDER[0] * k, SHOULDER[1] * k, ex * k, ey * k)
    p.line(ex * k, ey * k, wx * k, wy * k)
    solid(p, ink, weight, s.color)
    p.circle(SHOULDER[0] * k, SHOULDER[1] * k, 0.09 * k)
    p.circle(ex * k, ey * k, 0.07 * k)
  },
  over: (p, s, { size: k, u, ink, weight }) => {
    // The gripper closes in front of the part it is holding.
    const { wx, wy, closed } = wrist(u)
    const gap = PART + 0.02 + 0.08 * (1 - closed)
    outline(p, ink, weight)
    p.line(wx * k, wy * k, wx * k, (wy + GRIP - 0.05) * k)
    p.line((wx - gap / 2) * k, (wy + GRIP - 0.05) * k, (wx + gap / 2) * k, (wy + GRIP - 0.05) * k)
    for (const side of [-1, 1]) {
      p.line((wx + (side * gap) / 2) * k, (wy + GRIP - 0.05) * k, (wx + (side * gap) / 2) * k, (wy + GRIP + PART * 0.55) * k)
    }
    solid(p, ink, weight, s.color)
    p.circle(wx * k, wy * k, 0.06 * k)
  },
})

/** Where the wrist is, and how shut the jaws are, at `u`. */
function wrist(u: number): { wx: number; wy: number; closed: number } {
  const home = u >= UG || u < UARR
  if (home) {
    const back = mod(u - UG, 1) / BACK
    return {
      wx: lerp(PLACE, PICK, easeInOutCubic(seg(back, 0.15, 0.82))),
      wy: DOWN + (CARRY - DOWN) * (easeInOutCubic(seg(back, 0, 0.15)) - easeInOutCubic(seg(back, 0.82, 1))),
      closed: 0,
    }
  }
  const closed = easeInOutCubic(seg(u, UARR, UC)) - easeInOutCubic(seg(u, SET, UG))
  if (u < UC) return { wx: PICK, wy: DOWN, closed }
  if (u < UD) return { wx: PICK, wy: lerp(DOWN, CARRY, seg(u, UC, UD)), closed }
  if (u < UE) return { wx: lerp(PICK, PLACE, seg(u, UD, UE)), wy: CARRY, closed }
  if (u < SET) return { wx: PLACE, wy: lerp(CARRY, DOWN, seg(u, UE, SET)), closed }
  return { wx: PLACE, wy: DOWN, closed }
}
