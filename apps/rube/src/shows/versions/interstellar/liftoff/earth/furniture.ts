import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import { DUST } from '../worlds'

/**
 * The farm's furniture, drawn once and used wherever it stands: the porch at dawn in Act I, and old Murph's room on
 * Cooper Station, where the same rocking chair has come with her.
 */

/** The rocking chair's measures at full size (cells): its rockers' arc, its seat's height (y up is negative) and front. */
export const ROCKER = { r: 1.13, seatY: -0.46, seatFront: 0.3 }

/**
 * A rocking chair, side on: two rockers on the one arc (the far one a shade darker, just behind), turned legs joined
 * by a stretcher, the seat, an arm on a turned post with a scrolled end, and a tall raked back of spindles under a
 * curved crest rail. With `quilt`, a small quilt folded over the rail. Drawn at full size in the caller's frame: x
 * toward the chair's front, y down, the rockers' arc touching the floor at 0, 0. `weight` is the line weight in that
 * frame (a caller that scales the chair down passes its weight scaled up, so lines stay the width of every other line).
 */
export function drawRocker(p: p5, k: number, ink: string, weight: number, quilt = true): void {
  const X = (v: number) => v * k
  p.strokeJoin(p.ROUND)
  const wood = DUST.wood
  const far = mixHex(DUST.wood, ink, 0.22)
  /** The rockers' arc: the height of its underside over the floor at `x`. */
  const rock = (x: number) => ROCKER.r - Math.sqrt(ROCKER.r * ROCKER.r - x * x)
  const RK = 0.055
  const RX0 = -0.5
  const RX1 = 0.5
  const rocker = (dx: number, dy: number, fill: string) => {
    solid(p, ink, weight * 0.9, fill)
    p.beginShape()
    const n = 20
    for (let i = 0; i <= n; i++) {
      const x = RX0 + ((RX1 - RX0) * i) / n
      p.vertex(X(x + dx), X(-rock(x) + dy))
    }
    // The front tip, rounded.
    p.bezierVertex(X(RX1 + 0.035 + dx), X(-rock(RX1) + dy), X(RX1 + 0.035 + dx), X(-rock(RX1) - RK + dy), X(RX1 + dx), X(-rock(RX1) - RK + dy))
    for (let i = n; i >= 0; i--) {
      const x = RX0 + ((RX1 - RX0) * i) / n
      p.vertex(X(x + dx), X(-rock(x) - RK + dy))
    }
    // The back tip, rounded.
    p.bezierVertex(X(RX0 - 0.035 + dx), X(-rock(RX0) - RK + dy), X(RX0 - 0.035 + dx), X(-rock(RX0) + dy), X(RX0 + dx), X(-rock(RX0) + dy))
    p.endShape(p.CLOSE)
  }
  /** A turned member from (x0, y0) to (x1, y1), `w` wide, with a bead a third of the way along. */
  const member = (x0: number, y0: number, x1: number, y1: number, w: number, fill: string, bead = true, line = 0.8) => {
    const L = Math.hypot(x1 - x0, y1 - y0)
    const ux = (x1 - x0) / L
    const uy = (y1 - y0) / L
    const nx = -uy * (w / 2)
    const ny = ux * (w / 2)
    solid(p, ink, weight * line, fill)
    p.beginShape()
    p.vertex(X(x0 + nx), X(y0 + ny))
    p.vertex(X(x1 + nx * 0.85), X(y1 + ny * 0.85))
    p.vertex(X(x1 - nx * 0.85), X(y1 - ny * 0.85))
    p.vertex(X(x0 - nx), X(y0 - ny))
    p.endShape(p.CLOSE)
    if (bead) {
      const bx = x0 + (x1 - x0) * 0.62
      const by = y0 + (y1 - y0) * 0.62
      p.ellipse(X(bx), X(by), X(w * 1.5), X(w * 1.5))
    }
  }
  const SEAT_B = -0.36
  const legTop = ROCKER.seatY + 0.07
  const FRONT_LEG = 0.2
  const BACK_LEG = -0.26
  // The far side first, a shade darker and a hair behind: its rocker and its legs.
  const fd: [number, number] = [0.05, -0.03]
  for (const x of [FRONT_LEG, BACK_LEG]) member(x + fd[0], -rock(x) - RK + fd[1], x + fd[0] - 0.01, legTop + fd[1], 0.04, far, false, 0.6)
  rocker(fd[0], fd[1], far)
  // The back: two raked posts, a crest rail, three spindles and a low rail, the whole raked back from the seat.
  const post = (u: number, y: number): [number, number] => {
    const f = (ROCKER.seatY - y) / (ROCKER.seatY + 1.12)
    return [u - 0.09 * f, y]
  }
  const B0 = SEAT_B
  const B1 = -0.13
  // Behind the spindles, the wall shows through: they are thin, and there are only two.
  for (let i = 1; i <= 2; i++) {
    const u = B0 + ((B1 - B0) * i) / 3
    const [ax, ay] = post(u, ROCKER.seatY - 0.1)
    const [bx, by] = post(u, -1.07)
    member(ax, ay, bx, by, 0.03, wood, false, 0.5)
  }
  for (const u of [B0, B1]) {
    const [ax, ay] = post(u, ROCKER.seatY + 0.02)
    const [bx, by] = post(u, -1.1)
    member(ax, ay, bx, by, 0.055, wood, false)
  }
  {
    const [ax, ay] = post(B0, ROCKER.seatY - 0.1)
    const [bx, by] = post(B1, ROCKER.seatY - 0.1)
    member(ax, ay, bx, by, 0.035, wood, false, 0.6)
  }
  // The crest rail: a gentle arch, a little proud of the posts each side.
  {
    const [lx, ly] = post(B0 - 0.03, -1.1)
    const [rx, ry] = post(B1 + 0.03, -1.1)
    solid(p, ink, weight * 0.9, wood)
    p.beginShape()
    p.vertex(X(lx), X(ly + 0.03))
    p.bezierVertex(X(lx + 0.05), X(ly - 0.05), X(rx - 0.05), X(ry - 0.05), X(rx), X(ry + 0.03))
    p.vertex(X(rx), X(ry + 0.075))
    p.bezierVertex(X(rx - 0.05), X(ry + 0.01), X(lx + 0.05), X(ly + 0.01), X(lx), X(ly + 0.075))
    p.endShape(p.CLOSE)
  }
  // The near legs, meeting the rocker, and the stretcher between them.
  for (const x of [FRONT_LEG, BACK_LEG]) member(x, -rock(x) - RK + 0.01, x - 0.01, legTop, 0.055, wood)
  member(BACK_LEG, (legTop - rock(BACK_LEG) - RK) / 2, FRONT_LEG, (legTop - rock(FRONT_LEG) - RK) / 2, 0.03, wood, false, 0.6)
  rocker(0, 0, wood)
  // The seat: a thick board, its front edge rounded over.
  solid(p, ink, weight * 0.9, wood)
  p.rect(X((SEAT_B + ROCKER.seatFront + 0.04) / 2), X(ROCKER.seatY + 0.035), X(ROCKER.seatFront + 0.04 - SEAT_B), X(0.07), X(0.02), X(0.035), X(0.035), X(0.02))
  // The arm: from the back post forward over the seat, on a turned post, its end scrolled over.
  const ARM_Y = -0.8
  const [ax0] = post(B1, ARM_Y)
  member(0.24, ROCKER.seatY - 0.01, 0.23, ARM_Y + 0.02, 0.045, wood)
  solid(p, ink, weight * 0.9, wood)
  p.rect(X((ax0 + 0.3) / 2), X(ARM_Y), X(0.3 - ax0), X(0.045), X(0.02))
  p.ellipse(X(0.3), X(ARM_Y + 0.012), X(0.07), X(0.065))
  // A quilt folded over the crest rail and hanging a little way down the back: bone, with a rust band at its hem.
  if (quilt) {
    const [l0x, l0y] = post(B0 - 0.03, -1.12)
    const [r0x, r0y] = post(B1 + 0.03, -1.12)
    const [l1x, l1y] = post(B0 - 0.02, -0.86)
    const [r1x, r1y] = post(B1 + 0.02, -0.9)
    const edge = (band: number, fill: string) => {
      solid(p, ink, weight * 0.55, fill)
      p.beginShape()
      p.vertex(X(l0x), X(l0y))
      p.bezierVertex(X(l0x + 0.06), X(l0y - 0.04), X(r0x - 0.06), X(r0y - 0.04), X(r0x), X(r0y))
      const ry = r0y + (r1y - r0y) * band
      const rx = r0x + (r1x - r0x) * band
      const ly = l0y + (l1y - l0y) * band
      const lx = l0x + (l1x - l0x) * band
      p.vertex(X(rx), X(ry))
      p.bezierVertex(X(rx - 0.05), X(ry + 0.03), X(lx + 0.06), X(ly - 0.02), X(lx), X(ly))
      p.endShape(p.CLOSE)
    }
    edge(1, DUST.rust)
    edge(0.72, DUST.bone)
  }
}
