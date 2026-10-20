import { mix, ring, smooth, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { A_REST, A_UP, BUTT_ARM, PIVOT, STAKE_R, T, TIP_ARM } from './plan'

/**
 * The club: his own, an olive trunk, lying over a stone with its point in his fire and its butt up by the ledge. It is
 * a lever with the stone for its fulcrum. Two men rolled onto the butt near the stone tip it a hair, two more a hair
 * more; the hero dropped onto its very end from the pillar slams the butt to the floor, and the point comes up out of
 * the fire into the eye.
 *
 * Its angle `a` is how far its point is turned up from level (radians). Along it, `s` is cells from the stone, the
 * point's side positive, and `lift` is cells off its axis, up.
 */

const TWO = A_REST + 0.022
const FOUR = A_REST + 0.045

/** How far the club is turned at `t`. */
export function angle(t: number): number {
  if (t < T.onA) return A_REST
  if (t < T.onB) return A_REST + (TWO - A_REST) * smooth(t, T.onA, T.onA + 0.3) + 0.006 * ring(t, T.onA, 2.6, 0.25)
  if (t < T.drop) return TWO + (FOUR - TWO) * smooth(t, T.onB, T.onB + 0.3) + 0.006 * ring(t, T.onB, 2.6, 0.25)
  if (t < T.strike) {
    // The butt goes down under him as a fall: slow off the mark, fastest as it meets the floor.
    const u = (t - T.drop) / (T.strike - T.drop)
    return FOUR + (A_UP - FOUR) * u * u
  }
  // The butt on the floor, the point in the eye; the shock rings down in the wood.
  return A_UP - 0.018 * Math.abs(ring(t, T.strike, 3.4, 0.2))
}

/** A point of the club at angle `a`: `s` along it from the stone (the point's side positive), `lift` up off its axis. */
export function along(a: number, s: number, lift = 0): Pt {
  const c = Math.cos(a)
  const n = Math.sin(a)
  return [PIVOT[0] - s * c + lift * n, PIVOT[1] - s * n - lift * c]
}

export const tipAt = (t: number): Pt => along(angle(t), TIP_ARM)
export const buttAt = (t: number): Pt => along(angle(t), -BUTT_ARM)

/** Where a ball of radius `r` sits on top of the club, `s` along it, at `t`. */
export const onClub = (t: number, s: number, r: number): Pt => along(angle(t), s, STAKE_R + r)

/** How hot the point is, 0 to 1: it has lain in the fire since the flare, and cools once it is out. */
export function heat(t: number): number {
  return smooth(t, T.flare, T.flare + 7) * (1 - smooth(t, T.strike + 0.3, T.strike + 4))
}

export function drawClub(g: Paint, t: number, wood: string, dark: string, ink: string, ember: string): void {
  const { ctx } = g
  const a = angle(t)
  const butt = along(a, -BUTT_ARM)
  const tip = along(a, TIP_ARM)
  // The trunk tapers from the butt to a cut point; the last of it is charred, and while hot, ember.
  const side = (s: number, w: number): [Pt, Pt] => [along(a, s, w), along(a, s, -w)]
  const [b0, b1] = side(-BUTT_ARM, STAKE_R * 1.2)
  const [n0, n1] = side(TIP_ARM - 0.55, STAKE_R * 0.8)
  ctx.beginPath()
  ctx.moveTo(b0[0], b0[1])
  ctx.lineTo(n0[0], n0[1])
  ctx.lineTo(tip[0], tip[1])
  ctx.lineTo(n1[0], n1[1])
  ctx.lineTo(b1[0], b1[1])
  ctx.closePath()
  ctx.fillStyle = wood
  ctx.fill()
  ctx.lineJoin = 'round'
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1.25 * g.px, 2.4 / 108)
  ctx.stroke()
  // One long grain line, a knot, and the butt's cut face.
  const g0 = along(a, -BUTT_ARM + 0.25, 0.04)
  const g1 = along(a, TIP_ARM - 1.2, 0.03)
  ctx.beginPath()
  ctx.moveTo(g0[0], g0[1])
  ctx.lineTo(g1[0], g1[1])
  ctx.strokeStyle = dark
  ctx.lineWidth = Math.max(1.25 * g.px, 1.4 / 108)
  ctx.stroke()
  const knot = along(a, 1.6, -0.04)
  ctx.beginPath()
  ctx.ellipse(knot[0], knot[1], 0.07, 0.035, -a, 0, Math.PI * 2)
  ctx.fillStyle = dark
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(butt[0], butt[1], STAKE_R * 0.5, STAKE_R * 1.2, -a, 0, Math.PI * 2)
  ctx.fillStyle = mix(wood, dark, 0.55)
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1.25 * g.px, 1.6 / 108)
  ctx.stroke()
  // The point, charred, and ember while it is hot.
  const [c0, c1] = side(TIP_ARM - 0.45, STAKE_R * 0.72)
  ctx.beginPath()
  ctx.moveTo(c0[0], c0[1])
  ctx.lineTo(tip[0], tip[1])
  ctx.lineTo(c1[0], c1[1])
  ctx.closePath()
  ctx.fillStyle = mix(dark, ember, heat(t))
  ctx.fill()
}
