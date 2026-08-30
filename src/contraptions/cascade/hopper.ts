import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { FALL_V, SPEED, TOKEN, floor, since, until, type Beat } from './parts'

/**
 * A V-funnel over the line: one ball sits in the throat, the gate slides, it
 * drops onto the rail and rolls off. Not a stack of totes — a magazine with a
 * mouth at the top and a single seat.
 *
 * The seat is where the lane's opening `hold` puts the ball, and the hold runs
 * for exactly `emit`, so the throat is never empty: the ball you can see is
 * the next one, and it leaves on the frame the one after it arrives.
 */
const FIRE = 0.3
const THROAT = 0.055
const MOUTH = 0.3
const GATE = -0.04
const SEAT = GATE - 0.03 - TOKEN / 2

export const hopper = defineContraption<Beat>({
  name: 'hopper',
  label: 'Hopper',
  tags: ['ball'],
  role: 'source',
  outlets: ['E', 'W', 'S'],
  inlets: ['N'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx: LaneCtx): Lane => {
    if (ctx.in !== null) return { pieces: [roll([-0.5, ctx.floorY], [0.5, ctx.floorY], SPEED)] }
    return {
      pieces: [
        hold([0, SEAT], ctx.emit),
        roll([0, SEAT], [0, ctx.floorY], FALL_V / 2),
        roll([0, ctx.floorY], ctx.out === 'S' ? [0, 0.5] : [0.5, ctx.floorY], SPEED),
      ],
      // The gate opens as the ball goes, not as it lands.
      fire: ctx.emit,
    }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const w = until(u, FIRE)
    const drop = -SEAT / (FALL_V / 2)
    const open =
      t < 0.06 ? 1
      : t < 0.16 ? 1 - easeInOutCubic(seg(t, 0.06, 0.16))
      : w <= drop + 0.03 ? easeOutCubic(1 - seg(w, drop, drop + 0.03))
      : 0

    floor(p, k, ink, weight, s)

    outline(p, ink, weight)
    p.line(-MOUTH * k, -0.46 * k, -THROAT * k, GATE * k)
    p.line(MOUTH * k, -0.46 * k, THROAT * k, GATE * k)
    p.line(-MOUTH * k, -0.46 * k, MOUTH * k, -0.46 * k)
    p.line(-THROAT * k, (GATE + 0.05) * k, 0.36 * k, (GATE + 0.05) * k)
    solid(p, ink, weight, s.color)
    p.rect(open * 0.22 * k, GATE * k, 0.24 * k, 0.06 * k)
  },
})
