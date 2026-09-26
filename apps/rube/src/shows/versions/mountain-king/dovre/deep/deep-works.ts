import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, hash, knock } from '../kit'
import { drawLantern, drawTorch } from '../lantern'
import { CODA } from '../music'
import { quake } from '../rock'
import type { Pen } from '../troll'
import { STONE, WORKS } from '../worlds'
import {
  BEAM, BLOWS, CUP, FLUME, HAMMER, LAMPS, PIVOT, RUNNEL_X0, T2_X1, T_CUP, T_SLAM, T_WHEEL, WHEEL, Y_T2, bucketAngle, cupFill, cupSeat, flumeY,
  hammerLift, leverAngle, litOf, waterX, wheelTurn,
} from './deep-plan'
import { inkAt, lightAt, rim, roofY, stoneAt } from './deep-set'

/**
 * The tunnels' machines (the part's own frame): the drip-cup lever and its flint, the runnel and the flume, the
 * waterwheel, the trip hammer and its stone bar, and the lanterns. Each is drawn from the plan's pure functions of
 * show time, so the lanes that ride them (`carried`) and the drawing never disagree.
 */

/** Timber at a light level. */
const woodAt = (lit: number): string => mixHex(mixHex(STONE.dark, WORKS.wood, 0.6), WORKS.timber, 0.1 + 0.8 * lit)
/** Iron at a light level. */
const ironAt = (lit: number): string => mixHex(WORKS.iron, WORKS.steel, 0.1 + 0.6 * lit)

/** When the water stops: the drips go quiet as the tune moves on into the hall. */
const DRY = BLOWS[BLOWS.length - 1] + 0.6
const flowing = (T: number): number => (T < T_SLAM ? 0 : Math.max(0, Math.min(1, 1 - (T - DRY) / 1.5)))

/* ------------------------------------------------------------------ the lever */

export function drawLever(p: p5, c: Pen, T: number): void {
  const k = c.k
  const lit = lightAt(PIVOT[0] + 0.8, PIVOT[1], T)
  const ink = inkAt(c.ink, lit)
  const w = c.weight
  p.push()
  p.rectMode(p.CORNER)
  // The post: a dressed stone pillar from the terrace, forked at the top round the pin.
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(stoneAt(lit * 0.85, STONE.mid))
  p.beginShape()
  for (const [x, y] of [[-0.17, Y_T2 + R], [-0.12, PIVOT[1] + 0.02], [0.12, PIVOT[1] + 0.02], [0.17, Y_T2 + R]] as Pt[]) p.vertex((PIVOT[0] + x) * k, y * k)
  p.endShape(p.CLOSE)
  // The flint, set in the terrace where the cup comes down: a dark wedge of hard stone.
  p.fill(mixHex(WORKS.iron, STONE.mid, 0.3 + 0.4 * lightAt(5.6, 2.7, T)))
  p.beginShape()
  for (const [x, y] of [[5.34, 2.84], [5.46, 2.68], [5.72, 2.66], [5.86, 2.84]] as Pt[]) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  p.pop()

  // The beam, turned about its pin.
  const a = leverAngle(T)
  p.push()
  p.rectMode(p.CORNER)
  p.translate(PIVOT[0] * k, PIVOT[1] * k)
  p.rotate(a)
  p.stroke(ink)
  p.strokeWeight(w * 0.9)
  // The counterweight under its short arm: a squared block on two short straps.
  p.fill(stoneAt(lit * 0.9, STONE.light))
  p.line(-0.98 * k, BEAM.half * k, -0.98 * k, 0.2 * k)
  p.line(-0.62 * k, BEAM.half * k, -0.62 * k, 0.2 * k)
  p.rect(-1.02 * k, 0.2 * k, 0.44 * k, 0.3 * k, 0.03 * k)
  // The beam itself.
  p.fill(stoneAt(lit, STONE.light))
  p.rect(BEAM.l * k, -BEAM.half * k, (BEAM.r - BEAM.l) * k, 2 * BEAM.half * k, 0.03 * k)
  // The cup at its far end: a stone bowl, its floor cut into the beam, a low lip he rolls over and a tall end wall;
  // the drips' water in it.
  const inX0 = CUP.x0 + 0.06
  const inX1 = CUP.x1 - 0.04
  p.noStroke()
  p.fill(mixHex(STONE.deep, STONE.dark, 0.5 + 0.5 * lit))
  p.rect(inX0 * k, -BEAM.half * k, (inX1 - inX0) * k, (BEAM.half + CUP.floor) * k)
  const fill = cupFill(T)
  if (fill > 0.01) {
    p.fill(alpha(p, STONE.wet, 0.4 + 0.35 * lit))
    const top = CUP.floor - 0.2 * fill
    p.rect(inX0 * k, top * k, (inX1 - inX0) * k, (CUP.floor - top) * k)
  }
  p.stroke(ink)
  p.strokeWeight(w * 0.9)
  p.fill(stoneAt(lit, STONE.light))
  p.rect((inX0 - 0.14) * k, (-BEAM.half - 0.11) * k, 0.14 * k, 0.12 * k, 0.05 * k, 0.05 * k, 0, 0)
  p.rect(inX1 * k, (-BEAM.half - 0.3) * k, 0.14 * k, 0.31 * k, 0.05 * k, 0.05 * k, 0, 0)
  p.pop()
  // His drop into the cup splashes: a few drops thrown up and out of it.
  const sp = T - T_CUP
  if (sp >= 0 && sp < 0.55) {
    const [sx, sy] = cupSeat(T_CUP)
    p.push()
    p.strokeCap(p.ROUND)
    for (let i = 0; i < 7; i++) {
      const vx = (hash(i, 3, 7) - 0.5) * 2.2
      const vy = -1.6 - 1.4 * hash(i, 5, 7)
      const x = sx + vx * sp
      const y = sy - 0.05 + vy * sp + 6 * sp * sp
      const dy = vy + 12 * sp
      const n = Math.hypot(vx, dy) || 1
      p.stroke(alpha(p, STONE.wet, 0.85 * (1 - sp / 0.55)))
      p.strokeWeight(Math.max(1, 0.025 * k))
      p.line(x * k, y * k, (x - (vx / n) * 0.05) * k, (y - (dy / n) * 0.05) * k)
    }
    p.pop()
  }
  // The pin through post and beam.
  p.push()
  p.stroke(inkAt(c.ink, lit))
  p.strokeWeight(w * 0.7)
  p.fill(ironAt(lit))
  p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.1 * k)
  p.pop()
}

/* ------------------------------------------------------------------ water */

export function drawWater(p: p5, c: Pen, T: number): void {
  const k = c.k
  const on = flowing(T)
  if (on <= 0) return
  const wet = (a: number) => alpha(p, STONE.wet, a * on)
  const front = waterX(T)
  p.push()
  p.noFill()
  p.strokeCap(p.ROUND)
  // Poured out of the cup as it comes down, and along the runnel at the terrace's edge.
  const pour = T - T_SLAM
  if (pour >= 0 && pour < 0.9) {
    p.stroke(wet(0.7 * (1 - pour / 0.9)))
    p.strokeWeight(Math.max(1, 0.06 * k))
    p.line(5.95 * k, 2.72 * k, 6.25 * k, 2.8 * k)
  }
  if (front > RUNNEL_X0) {
    p.stroke(alpha(p, STONE.deep, on))
    p.strokeWeight(Math.max(1.5, 0.08 * k))
    p.line(RUNNEL_X0 * k, (Y_T2 + R + 0.01) * k, Math.min(front, T2_X1) * k, (Y_T2 + R + 0.01) * k)
    p.stroke(wet(0.45))
    p.strokeWeight(Math.max(1, 0.04 * k))
    p.line(RUNNEL_X0 * k, (Y_T2 + R - 0.02) * k, Math.min(front, T2_X1) * k, (Y_T2 + R - 0.02) * k)
  }
  // Along the flume.
  if (front > FLUME.x0) {
    const x1 = Math.min(front, FLUME.x1)
    p.stroke(wet(0.8))
    p.strokeWeight(Math.max(1, 0.05 * k))
    p.line(FLUME.x0 * k, (flumeY(FLUME.x0) - 0.025) * k, x1 * k, (flumeY(x1) - 0.025) * k)
  }
  // Off its end onto the buckets coming round: a thin fall, curving out.
  if (T >= T_WHEEL) {
    const u = Math.min(1, (T - T_WHEEL) / 0.25)
    p.stroke(wet(0.7))
    p.strokeWeight(Math.max(1, 0.045 * k))
    const [x0, y0] = [FLUME.x1, flumeY(FLUME.x1)]
    p.bezier(x0 * k, y0 * k, (x0 + 0.12) * k, y0 * k, (x0 + 0.2) * k, (y0 + 0.25 * u) * k, (x0 + 0.22) * k, (y0 + 0.62 * u) * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the flume */

export function drawFlume(p: p5, c: Pen, T: number): void {
  const k = c.k
  const lit = lightAt(8.2, 2.8, T)
  const ink = inkAt(c.ink, lit)
  p.push()
  // Its brace: a timber strut from the pit's wall.
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.7)
  p.fill(mixHex(woodAt(lit), STONE.dark, 0.25))
  const bx = 8.1
  const by = flumeY(bx) + 0.08
  p.quad((bx - 0.05) * k, by * k, (bx + 0.05) * k, by * k, 6.84 * k, 4.3 * k, 6.74 * k, 4.2 * k)
  // The trough: its floor plank and the back board (the near board is left off, so what rolls in it is seen).
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.8)
  p.fill(mixHex(woodAt(lit), STONE.dark, 0.35))
  const back = 0.2
  p.beginShape()
  p.vertex(FLUME.x0 * k, (flumeY(FLUME.x0) - back) * k)
  p.vertex(FLUME.x1 * k, (flumeY(FLUME.x1) - back) * k)
  p.vertex(FLUME.x1 * k, flumeY(FLUME.x1) * k)
  p.vertex(FLUME.x0 * k, flumeY(FLUME.x0) * k)
  p.endShape(p.CLOSE)
  p.fill(woodAt(lit))
  p.beginShape()
  p.vertex(FLUME.x0 * k, flumeY(FLUME.x0) * k)
  p.vertex(FLUME.x1 * k, flumeY(FLUME.x1) * k)
  p.vertex(FLUME.x1 * k, (flumeY(FLUME.x1) + 0.08) * k)
  p.vertex(FLUME.x0 * k, (flumeY(FLUME.x0) + 0.08) * k)
  p.endShape(p.CLOSE)
  // The near board's edge: a low lip along the front.
  p.strokeWeight(Math.max(1.2, 0.05 * k))
  p.stroke(woodAt(lit))
  p.line(FLUME.x0 * k, (flumeY(FLUME.x0) - 0.03) * k, FLUME.x1 * k, (flumeY(FLUME.x1) - 0.03) * k)
  p.pop()
}

/* ------------------------------------------------------------------ the wheel */

const polar = (r: number, a: number): Pt => [WHEEL.c[0] + r * Math.cos(a), WHEEL.c[1] + r * Math.sin(a)]

export function drawWheel(p: p5, c: Pen, T: number): void {
  const k = c.k
  const lit = lightAt(WHEEL.c[0], WHEEL.c[1] - 1, T)
  const ink = inkAt(c.ink, lit)
  const w = c.weight
  const turn = wheelTurn(T)
  const [cx, cy] = WHEEL.c
  p.push()
  p.strokeJoin(p.ROUND)
  // The frame it turns in: two timber legs from the sump's floor to the axle.
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(mixHex(woodAt(lit * 0.7), STONE.dark, 0.3))
  for (const s of [-1, 1]) {
    p.beginShape()
    for (const [x, y] of [[cx + s * 0.06, cy], [cx + s * 1.1, 7.85], [cx + s * 0.86, 7.85], [cx - s * 0.06, cy + 0.2]] as Pt[]) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
  }
  // The spokes, turning.
  p.stroke(woodAt(lit))
  p.strokeWeight(Math.max(1.5, 0.09 * k))
  for (let i = 0; i < WHEEL.n; i++) {
    const a = turn + (i + 0.5) * ((2 * Math.PI) / WHEEL.n)
    const [x, y] = polar(WHEEL.rim - 0.05, a)
    p.line(cx * k, cy * k, x * k, y * k)
  }
  // The rim: a timber ring.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.circle(cx * k, cy * k, 2 * (WHEEL.rim + 0.05) * k)
  p.circle(cx * k, cy * k, 2 * (WHEEL.rim - 0.08) * k)
  p.stroke(woodAt(lit))
  p.strokeWeight(Math.max(1, 0.1 * k))
  p.circle(cx * k, cy * k, 2 * (WHEEL.rim - 0.015) * k)
  // The hub and its iron.
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(ironAt(lit))
  p.circle(cx * k, cy * k, 0.36 * k)
  // The buckets: a stone cup on the rim at each, open outward, water in those on the way down while it flows.
  const on = flowing(T) * (T > T_WHEEL ? 1 : 0)
  const d = 0.2
  for (let i = 0; i < WHEEL.n; i++) {
    const a = bucketAngle(i, T)
    const inner = WHEEL.rim + 0.06
    const outer = WHEEL.lip
    const cup = (r0: number, r1: number, h: number): Pt[] => {
      const pts: Pt[] = [polar(r1, a - h), polar(r0, a - h)]
      for (let j = 1; j < 6; j++) pts.push(polar(r0 - 0.03 * Math.sin((j / 6) * Math.PI), a - h + (2 * h * j) / 6))
      pts.push(polar(r0, a + h), polar(r1, a + h))
      return pts
    }
    const body = cup(inner - 0.07, outer, d + 0.045)
    const hollowIn = cup(inner, outer + 0.02, d)
    p.stroke(ink)
    p.strokeWeight(w * 0.8)
    p.fill(stoneAt(lit * 0.9, STONE.mid))
    p.beginShape()
    for (const [x, y] of body) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(mixHex(STONE.deep, STONE.dark, 0.3 + 0.5 * lit))
    p.beginShape()
    for (const [x, y] of hollowIn) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    const deg = (((a * 180) / Math.PI) % 360 + 540) % 360 - 180
    if (on > 0 && deg > -80 && deg < 40) {
      p.fill(alpha(p, STONE.wet, 0.5 * on))
      p.beginShape()
      for (const [x, y] of cup(inner, inner + 0.13, d - 0.01)) p.vertex(x * k, y * k)
      p.endShape(p.CLOSE)
    }
    // Its lips catch the light.
    p.stroke(stoneAt(lit, STONE.light))
    p.strokeWeight(Math.max(1, 0.035 * k))
    for (const sgn of [-1, 1]) {
      const [x0, y0] = polar(outer - 0.12, a + sgn * (d + 0.02))
      const [x1, y1] = polar(outer - 0.01, a + sgn * (d + 0.02))
      p.line(x0 * k, y0 * k, x1 * k, y1 * k)
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the hammer */

/** The stone bar the hammer plays: the xylophone grown. */
const BAR = { x0: 12.8, x1: 14.42, top: HAMMER.pivot[1] + HAMMER.head[1] + HAMMER.h / 2, h: 0.22 }
const LEDGE = 4.12

export function drawHammer(p: p5, c: Pen, T: number): void {
  const k = c.k
  const lit = lightAt(12.8, 3.2, T)
  const ink = inkAt(c.ink, lit)
  const w = c.weight
  const [px, py] = HAMMER.pivot
  // The ledge the bar lies on, out of the east wall.
  rim(p, c, [[12.72, LEDGE], [14.55, LEDGE]], 0.34, lit)
  // The bar: it rings on each blow (a shiver and a wet glint along its top).
  let r = 0
  for (const b of BLOWS) if (b <= T) r = Math.max(r, knock(T - b, 0.3))
  const shiver = 0.02 * r * Math.sin(T * 70)
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(stoneAt(lit * 0.7, STONE.mid))
  for (const x of [BAR.x0 + 0.25, BAR.x1 - 0.25]) p.rect((x - 0.07) * k, (BAR.top + BAR.h) * k, 0.14 * k, (LEDGE - BAR.top - BAR.h) * k)
  p.fill(mixHex(stoneAt(lit, STONE.light), STONE.wet, 0.2 + 0.4 * r))
  p.rect(BAR.x0 * k, (BAR.top + shiver) * k, (BAR.x1 - BAR.x0) * k, BAR.h * k, 0.04 * k)
  p.pop()

  // The strap from the roof to the pin.
  p.push()
  p.stroke(ironAt(lit))
  p.strokeWeight(Math.max(1.5, 0.07 * k))
  p.line(px * k, (roofY(px) - 0.1) * k, px * k, py * k)
  p.line((px - 0.08) * k, (roofY(px) - 0.1) * k, (px - 0.08) * k, (py - 0.05) * k)
  p.pop()

  // The arm, turned about its pin: the tail the buckets press down, the long arm and the head.
  const rho = -HAMMER.lift * hammerLift(T)
  p.push()
  p.translate(px * k, py * k)
  p.rotate(rho)
  p.stroke(ink)
  p.strokeWeight(w * 0.85)
  p.fill(woodAt(lit))
  const beam = (a: Pt, b: Pt, half: number) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const n = Math.hypot(dx, dy)
    const nx = (-dy / n) * half
    const ny = (dx / n) * half
    p.beginShape()
    p.vertex((a[0] + nx) * k, (a[1] + ny) * k)
    p.vertex((b[0] + nx) * k, (b[1] + ny) * k)
    p.vertex((b[0] - nx) * k, (b[1] - ny) * k)
    p.vertex((a[0] - nx) * k, (a[1] - ny) * k)
    p.endShape(p.CLOSE)
  }
  beam([0, 0], HAMMER.tail, 0.09)
  beam([0, 0], [HAMMER.head[0] - 0.3, HAMMER.head[1]], 0.1)
  // The head: a great dressed block of stone, iron-banded, its face worn by the bar.
  const [hx, hy] = HAMMER.head
  const { w: hw, h: hh } = HAMMER
  p.fill(stoneAt(lit, STONE.light))
  p.rectMode(p.CORNER)
  p.rect((hx - hw / 2) * k, (hy - hh / 2) * k, hw * k, hh * k, 0.06 * k)
  p.fill(ironAt(lit))
  p.rect((hx - hw / 2 - 0.01) * k, (hy - 0.08) * k, (hw + 0.02) * k, 0.13 * k)
  p.circle(0, 0, 0.14 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the lanterns */

export function drawLamps(p: p5, c: Pen, T: number): void {
  const [qx] = quake(T)
  for (const l of LAMPS) {
    const lit = litOf(l, T)
    const swing = T > CODA - 1 ? qx * 5 : 0
    const size = 0.26
    const pen: Pen = { ...c, ink: inkAt(c.ink, Math.max(0.15 * lit, lightAt(l.at[0], l.at[1], T) * 0.6)) }
    if (l.hang > 0) {
      const top = roofY(l.at[0])
      drawLantern(p, pen, l.at[0], top - 0.05, { lit, t: T, seed: l.seed, size, hang: l.at[1] - top + 0.05, swing })
    } else {
      // A torch in the gutter: its oil feeds the cup, so the flame running along the gutter lights it.
      drawTorch(p, pen, l.at[0], l.at[1] - 0.01, { lit, t: T, seed: l.seed, size: 0.36, side: 1 })
    }
  }
}
