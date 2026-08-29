import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, lerp, mod, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, PART, PART_Y, RAIL, belt, bench, lineOf } from './shop'

/**
 * Blanks come in on the shelf from the bay to the west. The hook takes the
 * one waiting there, runs it out along the rail, lowers it onto the belt and
 * lets go, then goes back for the next.
 *
 * A blank stands on the shelf for exactly `emit`, so the shelf is never empty:
 * the next one is there the instant the hook takes this one away.
 */
const LEDGE_X = -0.24
const LEDGE_Y = -0.2
const CLEAR = LEDGE_Y - 0.08
const DEST = 0.1
const HOOK_V = 6
const LIFT = (LEDGE_Y - CLEAR) / HOOK_V
const RUN = (DEST - LEDGE_X) / HOOK_V
const DROP = (PART_Y - CLEAR) / HOOK_V
const LAND = 0.3
const OPEN = 0.08

export const hoist = defineContraption({
  name: 'hoist',
  label: 'Hoist',
  tags: ['feed', 'lift'],
  role: 'source',
  rotations: [0],
  // Touchdown.
  fireAt: LAND,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    if (ctx.in !== null) return { pieces: [roll([-0.5, y], [0.5, y], BELT_V)] }
    return {
      pieces: [
        hold([LEDGE_X, LEDGE_Y], ctx.emit),
        roll([LEDGE_X, LEDGE_Y], [LEDGE_X, CLEAR], HOOK_V),
        roll([LEDGE_X, CLEAR], [DEST, CLEAR], HOOK_V),
        roll([DEST, CLEAR], [DEST, y], HOOK_V),
        ctx.out === null ? hold([DEST, y], ctx.emit) : roll([DEST, y], [0.5, y], BELT_V),
      ],
      fire: ctx.emit + LIFT + RUN + DROP,
    }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    // The hook's clock: it takes the blank a whole carry before touchdown.
    const took = mod(LAND - 2 * (LIFT + RUN + DROP), 1)
    const back = mod(u - LAND - OPEN, 1)
    const span = mod(took - LAND - OPEN, 1)
    const home = back < span
    const t = mod(u - took, 1)
    const hookX =
      home ? lerp(DEST, LEDGE_X, easeInOutCubic(seg(back / span, 0.15, 0.85)))
      : t < 2 * LIFT ? LEDGE_X
      : t < 2 * (LIFT + RUN) ? lerp(LEDGE_X, DEST, seg(t, 2 * LIFT, 2 * (LIFT + RUN)))
      : DEST
    const hookY =
      home ? lerp(PART_Y, CLEAR, Math.min(1, seg(back / span, 0, 0.2) + 1 - seg(back / span, 0.85, 1)))
      : t < 2 * LIFT ? lerp(LEDGE_Y, CLEAR, seg(t, 0, 2 * LIFT))
      : t < 2 * (LIFT + RUN) ? CLEAR
      : t < 2 * (LIFT + RUN + DROP) ? lerp(CLEAR, PART_Y, seg(t, 2 * (LIFT + RUN), 2 * (LIFT + RUN + DROP)))
      : PART_Y
    const release = easeOutCubic(seg(u, LAND, LAND + 0.06)) - easeInOutCubic(seg(u, LAND + 0.3, LAND + 0.45))

    const x0 = line?.in ? -0.5 : -0.04
    bench(p, k, ink, weight, x0, 0.5, false)
    belt(p, k, ink, weight, fill, x0, 0.5, u * BELT_SPAN)

    // The rail from the bay, and the shelf the next blank stands on.
    outline(p, ink, weight)
    p.line(-0.5 * k, RAIL * k, 0.5 * k, RAIL * k)
    for (const hx of [-0.36, 0.3]) p.line(hx * k, -0.5 * k, hx * k, RAIL * k)
    p.line(-0.5 * k, (LEDGE_Y + PART / 2) * k, (LEDGE_X + 0.16) * k, (LEDGE_Y + PART / 2) * k)
    p.line(-0.44 * k, (LEDGE_Y + PART / 2) * k, -0.44 * k, (LEDGE_Y + PART / 2 + 0.1) * k)

    // The trolley, its cable, and a J of a hook.
    p.line(hookX * k, RAIL * k, hookX * k, (hookY - PART / 2 - 0.1) * k)
    for (const wx of [-0.05, 0.05]) p.circle((hookX + wx) * k, RAIL * k, 0.05 * k)
    solid(p, ink, weight, s.color)
    p.rect(hookX * k, (RAIL - 0.055) * k, 0.16 * k, 0.05 * k)
    p.push()
    p.translate(hookX * k, (hookY - PART / 2 - 0.1) * k)
    p.rotate(-release * 0.7)
    outline(p, ink, weight)
    p.line(0, 0, 0, 0.1 * k)
    p.arc(-0.035 * k, 0.1 * k, 0.07 * k, 0.07 * k, 0, Math.PI)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.06 * k)
    p.pop()
  },
})
