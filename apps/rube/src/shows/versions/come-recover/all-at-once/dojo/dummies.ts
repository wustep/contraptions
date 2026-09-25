import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, hash, part, route, type Ctx, type PartShot } from '../kit'
import { G } from '../physics'
import { DOJO } from '../worlds'
import { hall } from './dummies-hall'
import {
  ARM,
  ENTRY,
  FIGHT_HITS,
  GONG,
  LEG,
  POST,
  STAFF,
  armAt,
  fight,
  legAt,
  ring,
  rockOf,
  seatAt,
  staffFoot,
  type FightPlan,
  type ManPlan,
  type V,
} from './dummies-plan'

/**
 * The kung fu picture: Evelyn who learned kung fu. A training hall of paper screens and lacquered pillars, and
 * four wing chun wooden men, each a post with three arms and a leg, standing in two sparring pairs.
 *
 * She drops in from the rafters out of the alley's drainpipe, and the first pair trade her down their arms on the
 * flurry, tak-tak-tak: upper arms, middle arms, a knee, and the second man catches her on his raised thigh. He
 * kicks her straight up into the bo staff hanging from the beam; it swings away, she hops between their arms
 * while it comes back, and it bats her over their heads to the second pair. They trade her down again, the third
 * man juggles her on his knee, catches her, and his high kick puts her into the bronze gong on the flurry's
 * loudest hit. She falls back onto him, he catches her once more, winds his leg down while the gong rings, and
 * kicks her on the jump: the kick lands in the next world, where a stockinged foot finishes it.
 *
 * The choreography (every contact, and how each limb moves) is worked out in `dummies-plan.ts`; the hall is in
 * `dummies-hall.ts`. This file places the hall so the seam's flight lands on the first arm, lays the lane on the
 * same functions the drawing reads, and draws.
 */

const PLAN: FightPlan = fight()
/** The fight as worked out, for the next world's first seconds: its kicking foot finishes this kick. */
export const DOJO_PLAN = PLAN
/** The seam's flight from the drainpipe, carried to the first strike: the hall is placed so that is on the first arm. */
const T0 = PLAN.path[0].t - ENTRY.t
const X0 = -0.5 + ENTRY.v[0] * T0
const Y0 = -ENTRY.v[1] * T0 + 0.5 * G * T0 * T0
/** Where the hall's origin (the first man's foot) is in the part's cells: x, and the floor's y. */
const OX = X0 - PLAN.path[0].p[0]
const FY = Y0 + PLAN.path[0].p[1]
/** A hall point (h up) in the part's cells (y down). */
const P = (v: V): Pt => [v[0] + OX, FY - v[1]]

interface DojoState {
  begin: number
  plan: FightPlan
}

/* ------------------------------------------------------------------ drawing */

/** A round stick with an ink edge and rounded ends, from `a` to `b` (part cells). */
function stick(p: p5, k: number, ink: string, w: number, a: Pt, b: Pt, r: number, fill: string | p5.Color): void {
  p.strokeCap(p.ROUND)
  p.stroke(ink)
  p.strokeWeight(2 * r * k + 2 * w)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.stroke(fill as string)
  p.strokeWeight(Math.max(0.5, 2 * r * k))
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

const lerpV = (a: V, b: V, u: number): V => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

const ARMWOOD = mixHex(DOJO.wood, DOJO.woodDeep, 0.3)

/** One wooden man at show time `t`: his foot block, the far upper arm, the post, the near arms and the leg. */
function drawMan(p: p5, c: Ctx, m: ManPlan, t: number): void {
  const { k, ink, weight } = c
  const w = weight * 1.05
  const rho = rockOf(m, t)
  const foot = P([m.x, POST.base])
  // The foot block: fixed to the floor.
  solid(p, ink, w, DOJO.woodDeep)
  p.beginShape()
  for (const [x, h] of [[-POST.baseW / 2, 0], [POST.baseW / 2, 0], [POST.baseW / 2 - 0.1, POST.base], [-POST.baseW / 2 + 0.1, POST.base]] as V[]) {
    const q = P([m.x + x, h])
    p.vertex(q[0] * k, q[1] * k)
  }
  p.endShape(p.CLOSE)

  // The far upper arm, a shade darker and raised a little more: the pair reads as two in the side view.
  const up = armAt(m, 'up', t)
  const far: V = [up.root[0] + (up.tip[0] - up.root[0]) * 0.93 - m.s * 0.02, up.root[1] + (up.tip[1] - up.root[1]) * 0.93 + 0.13]
  stick(p, k, ink, w * 0.9, P(up.root), P(far), ARM.r * 0.95, DOJO.woodDeep)

  // The post, rocking on its foot.
  p.push()
  p.translate(foot[0] * k, foot[1] * k)
  p.rotate(-rho)
  const hw = (POST.w / 2) * k
  const top = (POST.top - POST.base) * k
  solid(p, ink, w, DOJO.wood)
  p.beginShape()
  p.vertex(-hw, 0)
  p.vertex(-hw, -top + hw * 0.7)
  p.bezierVertex(-hw, -top - hw * 0.25, hw, -top - hw * 0.25, hw, -top + hw * 0.7)
  p.vertex(hw, 0)
  p.endShape(p.CLOSE)
  // Its shadow side, away from the lit screens' middle: a flat darker strip down the back of the post.
  p.noStroke()
  p.fill(alpha(p, DOJO.woodDeep, 0.28))
  p.rect(-m.s * hw * 0.62, -top / 2 + hw * 0.2, hw * 0.62, top - hw * 0.5)
  // Its grain, one long stroke, and the dark collars where the arms and the leg go through.
  p.stroke(alpha(p, DOJO.woodDeep, 0.55))
  p.strokeWeight(w * 0.55)
  p.noFill()
  p.line(-hw * 0.35 * m.s, -0.25 * k, -hw * 0.3 * m.s, -top + hw * 1.4)
  solid(p, ink, w * 0.7, DOJO.woodDeep)
  for (const h of [ARM.up.root, ARM.mid.root, LEG.hip]) p.rect(0, -(h - POST.base) * k, POST.w * k * 1.02, 0.11 * k)
  p.pop()

  // The near arms, knocked in their sockets when struck; a dark ring near each end, where the ball meets them.
  for (const limb of ['up', 'mid'] as const) {
    const a = limb === 'up' ? up : armAt(m, limb, t)
    stick(p, k, ink, w, P(a.root), P(a.tip), ARM.r, ARMWOOD)
    const ringAt = lerpV(a.root, a.tip, 0.86)
    const ringTo = lerpV(a.root, a.tip, 0.9)
    stick(p, k, ink, w * 0.4, P(ringAt), P(ringTo), ARM.r * 1.02, DOJO.woodDeep)
  }

  // The leg: thigh, knee, shin, raised to meet the ball and kicked.
  const leg = legAt(m, t)
  stick(p, k, ink, w, P(leg.knee), P(leg.foot), LEG.r * 0.82, DOJO.wood)
  stick(p, k, ink, w, P(leg.hip), P(leg.knee), LEG.r, DOJO.wood)
  solid(p, ink, w * 0.8, DOJO.woodDeep)
  const kn = P(leg.knee)
  p.circle(kn[0] * k, kn[1] * k, LEG.r * 2.1 * k)
}

/** The bo staff on its rope from the beam: an iron ring, the rope, and the lacquered staff with gold ferrules. */
function drawStaff(p: p5, c: Ctx, s: FightPlan['staff'], t: number): void {
  const { k, ink, weight } = c
  const pivot = P([s.x, STAFF.hp])
  const knot = P(staffFoot(s, t, STAFF.rope))
  const foot = P(staffFoot(s, t))
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.line(pivot[0] * k, pivot[1] * k, knot[0] * k, knot[1] * k)
  solid(p, ink, weight * 0.8, DOJO.woodDeep)
  p.circle(pivot[0] * k, pivot[1] * k, 0.16 * k)
  stick(p, k, ink, weight, knot, foot, STAFF.r, DOJO.lacquer)
  const along = (d: number) => P(staffFoot(s, t, STAFF.rope + d))
  const L = STAFF.len
  stick(p, k, ink, weight * 0.6, along(0.02), along(0.2), STAFF.r * 1.08, DOJO.gold)
  stick(p, k, ink, weight * 0.6, along(L - 0.2), along(L - 0.02), STAFF.r * 1.08, DOJO.gold)
}

/** The gong, three-quarters on, hung on two cords from the beam: it jumps on its cords, swings and turns when struck, and its face glows. */
function drawGong(p: p5, c: Ctx, g: FightPlan['gong'], t: number): void {
  const { k, ink, weight } = c
  const u = t - g.t
  // Knocked up and away from the ball: a bounce on its cords, a swing, and a turn of its face.
  const lift = u > 0 ? 0.1 * Math.exp(-u / 0.5) * Math.abs(Math.sin(u * 9)) : 0
  const swing = 0.16 * -g.n[0] * ring(u, 0.85, 1.6)
  const turn = 0.3 * ring(u, 1.4, 1.1)
  const hang: V = [g.c[0], 7.6]
  const top: V = [g.c[0], g.c[1] + GONG.ry + lift]
  // The gong's centre, swung about the hanging point.
  const arm: V = [g.c[0] - hang[0], g.c[1] + lift - hang[1]]
  const cs = Math.cos(swing)
  const sn = Math.sin(swing)
  const cen: V = [hang[0] + arm[0] * cs - arm[1] * sn, hang[1] + arm[0] * sn + arm[1] * cs]
  const rx = GONG.rx * (1 + turn)
  const ry = GONG.ry
  // The cords, from the beam to either side of its top rim.
  const rim = (dx: number): Pt => {
    const q: V = [dx * cs - (top[1] - g.c[1]) * sn, dx * sn + (top[1] - g.c[1]) * cs]
    return P([cen[0] + q[0], cen[1] + q[1] - 0.02])
  }
  const [lx, ly] = rim(-rx * 0.6)
  const [rx2, ry2] = rim(rx * 0.6)
  const [bx, by] = P(hang)
  // Red silk cords from the beam, tied in a knot over it.
  for (const [ex, ey, dx] of [[lx, ly, -0.16], [rx2, ry2, 0.16]]) {
    p.stroke(ink)
    p.strokeWeight(weight * 2.2)
    p.line((bx + dx) * k, by * k, ex * k, ey * k)
    p.stroke(DOJO.lacquer)
    p.strokeWeight(weight * 1.1)
    p.line((bx + dx) * k, by * k, ex * k, ey * k)
  }
  solid(p, ink, weight * 0.7, DOJO.lacquer)
  p.quad(bx * k, (by - 0.02) * k, (bx + 0.1) * k, (by + 0.1) * k, bx * k, (by + 0.22) * k, (bx - 0.1) * k, (by + 0.1) * k)
  const [cx, cy] = P(cen)
  p.push()
  p.translate(cx * k, cy * k)
  p.rotate(-swing)
  // Its rim's thickness shows as a crescent on the far side.
  solid(p, ink, weight, mixHex(DOJO.gold, DOJO.woodDeep, 0.55))
  p.ellipse(rx * 0.22 * k, 0, rx * 2 * k, ry * 2 * k)
  solid(p, ink, weight, DOJO.gold)
  p.ellipse(0, 0, rx * 2 * k, ry * 2 * k)
  // The face: hammered rings, and the boss at its heart.
  p.noFill()
  p.stroke(mixHex(DOJO.gold, DOJO.woodDeep, 0.4))
  p.strokeWeight(weight * 0.7)
  p.ellipse(0, 0, rx * 1.62 * k, ry * 1.62 * k)
  p.stroke(alpha(p, DOJO.woodDeep, 0.3))
  p.strokeWeight(weight * 0.5)
  p.ellipse(0, 0, rx * 1.15 * k, ry * 1.15 * k)
  solid(p, ink, weight * 0.8, mixHex(DOJO.gold, DOJO.woodDeep, 0.22))
  p.ellipse(0, 0, rx * 0.56 * k, ry * 0.56 * k)
  p.noStroke()
  p.fill(alpha(p, DOJO.screen, 0.45))
  p.ellipse(-rx * 0.1 * k, -ry * 0.1 * k, rx * 0.2 * k, ry * 0.2 * k)
  // Struck: the bronze flares with light, and settles back to its own colour.
  if (u > 0 && u < 2.5) {
    const glow = Math.exp(-u / 0.55)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, ry * 1.6 * k)
    grad.addColorStop(0, `rgba(255, 238, 190, ${0.75 * glow})`)
    grad.addColorStop(0.45, `rgba(245, 200, 110, ${0.35 * glow})`)
    grad.addColorStop(1, 'rgba(245, 200, 110, 0)')
    ctx.save()
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(0, 0, rx * 3.2 * k, ry * 1.6 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  p.pop()
}

/** Old wood dust knocked off where she strikes: a few soft motes thrown off along the bounce, slowing and fading. */
function drawDust(p: p5, c: Ctx, plan: FightPlan, t: number): void {
  const { k } = c
  for (let e = 0; e < plan.path.length; e++) {
    const hit = plan.path[e]
    const u = t - hit.t
    if (u <= 0 || u > 0.5 || hit.kind === 'kick' || hit.t === plan.gong.t) continue
    // Where she touched: her centre, back along the normal.
    const at = P([hit.p[0] - hit.n[0] * 0.13, hit.p[1] - hit.n[1] * 0.13])
    const n: Pt = [hit.n[0], -hit.n[1]]
    const fade = Math.pow(1 - u / 0.5, 2)
    const motes = hit.w > 1.1 ? 6 : 4
    for (let i = 0; i < motes; i++) {
      const spread = (i - (motes - 1) / 2) * 0.55 + (hash(e, i) - 0.5) * 0.4
      const cs = Math.cos(spread)
      const sn = Math.sin(spread)
      const dir: Pt = [n[0] * cs - n[1] * sn, n[0] * sn + n[1] * cs]
      const speed = (0.55 + hash(e, i, 3) * 0.6) * (0.7 + 0.35 * hit.w)
      const d = speed * 0.11 * (1 - Math.exp(-u / 0.11))
      const x = at[0] + dir[0] * d
      const y = at[1] + dir[1] * d + 0.25 * u * u
      p.noStroke()
      p.fill(alpha(p, DUST_MOTE, 0.55 * fade))
      p.circle(x * k, y * k, (0.035 + 0.05 * u + 0.02 * hash(e, i, 5)) * k)
    }
  }
}
const DUST_MOTE = mixHex(DOJO.wash, DOJO.screen, 0.35)

/* ------------------------------------------------------------------ the part */

export const dummies = part<DojoState>(
  {
    name: 'dojo',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      p.push()
      hall(p, c.k, c, OX, FY)
      drawStaff(p, c, s.plan.staff, t)
      drawGong(p, c, s.plan.gong, t)
      for (const m of s.plan.men) drawMan(p, c, m, t)
      drawDust(p, c, s.plan, t)
      p.pop()
    },
  },
  (slot) => {
    const plan = PLAN
    const path = plan.path
    const at = (t: number) => t - slot.begin
    const segs: Seg[] = []
    // In from the drainpipe on the seam's flight, down onto the first man's upper arm.
    segs.push(...route([{ at: 0, p: [-0.5, 0] }, { at: at(path[0].t), p: P(path[0].p), arc: (G * T0 * T0) / 8 }]))
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i]
      const b = path[i + 1]
      if (a.kind === 'catch') {
        // Caught on the thigh, carried as it gives, winds and kicks.
        const m = plan.men[a.man!]
        segs.push(...carried((t) => P(seatAt(m, t)), a.t, b.t, Math.max(4, Math.ceil((b.t - a.t) * 240))))
      } else {
        const T = b.t - a.t
        segs.push(...route([{ at: a.t, p: P(a.p) }, { at: b.t, p: P(b.p), arc: (G * T * T) / 8 }]))
      }
    }
    // She leaves exactly where the lane has her at the kick (the leg's own function, sampled).
    const end = segs[segs.length - 1].to
    return {
      cells: box(-9, -7, 17, FY + 4, 2),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: at(path[0].t) },
      state: { begin: slot.begin, plan },
    }
  },
  (slot) => {
    const H = (x: number, h: number): Pt => P([x, h])
    const last = PLAN.path[PLAN.path.length - 1].p
    return [
      // Down out of the rafters with her, opening out onto the first pair.
      { t: slot.begin + 0.5, cells: 5.0, off: [0.5, 0.7] },
      { t: 87.25, cells: 5.1, hold: H(1.6, 2.35), w: 0.9 },
      { t: 89.3, cells: 5.1, hold: H(1.6, 2.4), w: 0.92 },
      // The kick up into the staff: wide enough for its swing.
      { t: 90.2, cells: 6.4, hold: H(1.35, 2.8), w: 0.95 },
      { t: 91.7, cells: 6.4, hold: H(1.8, 2.85), w: 0.95 },
      // Batted over their heads to the second pair.
      { t: 92.45, cells: 5.8, hold: H(4.2, 3.4), w: 0.6 },
      { t: 93.25, cells: 5.3, hold: H(5.95, 2.3), w: 0.9 },
      { t: 94.45, cells: 5.0, hold: H(6.15, 2.55), w: 0.9 },
      // The high kick and the gong, wide: from his leg to the beam.
      { t: 95.25, cells: 6.1, hold: H(6.5, 5.0), w: 0.97 },
      { t: 95.9, cells: 6.3, hold: H(6.3, 4.45), w: 0.95 },
      // In on the leg as it winds, to the seam's framing at the kick.
      { t: 96.5, cells: 5.4, hold: H(5.95, 2.1), w: 0.92 },
      { t: slot.end, cells: 4.5, hold: H(last[0] + 0.25, last[1] + 0.45), w: 0.85 },
    ] as PartShot[]
  },
)

/** Every strike this part makes, in show seconds. */
export const DOJO_HITS: number[] = FIGHT_HITS
