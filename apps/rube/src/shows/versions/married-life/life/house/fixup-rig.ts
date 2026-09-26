import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash, lastOf, smooth } from '../kit'
import { HOME, INK } from '../worlds'
import { CHAIR, drawChair } from '../props/chairs'
import { BLOWS, BRAKE, CART, CHAIR_LIFT, CHAIRS, FOLD, G, HOUSE, P, RAISE, SHOVE, W } from './front-plan'

/**
 * The fix-up machine (the house builder's): a wooden cart Carl pushes along the front of the house. Its front wheel
 * turns a belt to the gear of a trip hammer, which the gear lifts slowly over each bar and lets fall on the downbeat;
 * the blow strikes the old wall just ahead of three stacked rollers, as tall as the house on a telescoping mast,
 * that leave the house new wherever they pass. A jib on the mast lifts the two armchairs off the lawn and lowers them
 * in through the empty bay. Drawn in the house world's cells; `fixup.ts` places it.
 */

/** A rise from 0 to 1 at s = 0 that lands hard and rebounds a little, damped: a telescoping section hitting its stop. */
function stop(s: number, dur = 0.22): number {
  if (s <= -dur) return 0
  if (s < 0) {
    const u = (s + dur) / dur
    return u * u
  }
  return 1 - 0.06 * Math.exp(-s / 0.12) * Math.sin(s * 30)
}

/** How far the mast's middle and top sections are out, 0..1, at T. */
export function mastOut(T: number): [number, number] {
  const out = (up: number, fold: number) => {
    if (T < fold - 0.3) return stop(T - up)
    return 1 - stop(T - fold)
  }
  return [out(RAISE[0], FOLD[1]), out(RAISE[1], FOLD[0])]
}

/** One roller's height, and where the stack's rollers' bottoms are at T (the bottom one, the middle, the top). */
const ROLL = 2.48
const BASE = CART.deckY - 0.06
export function rollers(T: number): number[] {
  const [e1, e2] = mastOut(T)
  const b0 = BASE
  const b1 = b0 - ROLL * e1
  const b2 = b1 - ROLL * e2
  return [b0, b1, b2]
}

/** The trip hammer's angle (radians, clockwise from pointing right, about its pivot) at T: slow up, quick fall on each blow. */
const STRIKE = Math.atan2(CART.strike[1] - CART.hammerPivot[1], CART.strike[0] - CART.hammerPivot[0])
const RAISED = -0.2
export function hammerAngle(T: number): number {
  const first = BLOWS[0]
  const last = BLOWS[BLOWS.length - 1]
  if (T < first - 1.2) return RAISED
  const { i } = lastOf(BLOWS, T)
  const prev = i < 0 ? first - 1.05 : BLOWS[i]
  const next = i + 1 < BLOWS.length ? BLOWS[i + 1] : Infinity
  const fall = 0.13
  if (T >= last) {
    // After the last blow it is lifted once more, and rests there.
    const s = T - last
    return STRIKE + (RAISED - STRIKE) * smooth(s, 0.05, 0.9) - 0.12 * Math.exp(-s / 0.06) * Math.sin(Math.min(Math.PI, s * 40))
  }
  if (T >= next - fall) {
    const u = (T - (next - fall)) / fall
    return RAISED + (STRIKE - RAISED) * u * u
  }
  // Rising: a small rebound off the wall first, then the gear lifts it steadily to the top of its travel.
  const s = T - prev
  const up = next - fall - prev
  const rebound = i < 0 ? 0 : 0.1 * Math.exp(-s / 0.05) * Math.sin(Math.min(Math.PI, s * 35))
  const u = Math.max(0, Math.min(1, (s - 0.06) / Math.max(0.1, up - 0.12)))
  return (i < 0 ? RAISED : STRIKE + (RAISED - STRIKE) * (u * u * (3 - 2 * u))) - rebound
}

/** The jib: its elevation (radians above level, pointing back over the deck) at T, and where its hook is. */
interface ChairFlight {
  who: 'carl' | 'ellie'
  x: number
  down: number
  lift: number
  land: number
}
const FLIGHTS: ChairFlight[] = [
  { who: 'carl', x: CHAIRS.carl, down: CHAIR_LIFT.carl[0], lift: CHAIR_LIFT.carl[1], land: CHAIR_LIFT.carl[2] },
  { who: 'ellie', x: CHAIRS.ellie, down: CHAIR_LIFT.ellie[0], lift: CHAIR_LIFT.ellie[1], land: CHAIR_LIFT.ellie[2] },
]
const REST_ELEV = 1.5
/** Where a chair's floor is at T while it flies (G on the lawn, P once in), and whether it is indoors yet. */
export function chairFloor(f: ChairFlight, T: number): { y: number; inside: boolean } {
  if (T < f.lift) return { y: G, inside: false }
  if (T >= f.land) return { y: P, inside: true }
  const peak = f.lift + 0.52 * (f.land - f.lift)
  const top = -0.98
  if (T < peak) {
    const u = (T - f.lift) / (peak - f.lift)
    return { y: G + (top - G) * (u * u * (3 - 2 * u)), inside: false }
  }
  const u = (T - peak) / (f.land - peak)
  return { y: top + (P - top) * (u * u), inside: true }
}

function jibAt(T: number): { elev: number; hook: number | null; flight: ChairFlight | null } {
  const pivotX = W(T) + CART.jib[0]
  const reachFor = (x: number) => Math.acos(Math.max(-1, Math.min(0.999, (pivotX - x) / CART.jibLength)))
  const LEAD = 0.4
  for (let i = 0; i < FLIGHTS.length; i++) {
    const f = FLIGHTS[i]
    const next = FLIGHTS[i + 1]
    const start = f.down - LEAD
    const end = next ? next.down - LEAD : f.land + 0.9
    if (T < start || T >= end) continue
    const want = reachFor(f.x)
    if (T < f.down) {
      // Swinging over to it from where it was (at rest, or over the last chair), paying out the hook.
      const from = i === 0 ? REST_ELEV : reachFor(FLIGHTS[i - 1].x)
      const u = smooth(T, start, f.down)
      const tipY = CART.jib[1] - Math.sin(from + (want - from) * u) * CART.jibLength
      const chairTop = G - CHAIR.back
      return { elev: from + (want - from) * u, hook: tipY + 0.35 + (chairTop - tipY - 0.35) * u, flight: f }
    }
    if (T <= f.land) return { elev: want, hook: chairFloor(f, T).y - CHAIR.back, flight: f }
    // Let go: the hook hauled up; after the last chair the jib swings back up to rest.
    const u = smooth(T, f.land, f.land + 0.35)
    const elev = next ? want : want + (REST_ELEV - want) * smooth(T, f.land + 0.1, f.land + 0.9)
    const tipY = CART.jib[1] - Math.sin(elev) * CART.jibLength
    const low = P - CHAIR.back
    return { elev, hook: low + (tipY + 0.35 - low) * u, flight: f }
  }
  return { elev: REST_ELEV, hook: null, flight: null }
}

/** The old paint knocked off the wall by a blow: a burst of chips, tumbling down and gone in a second. */
function flakes(p: p5, k: number, weight: number, T: number): void {
  const { i, ago } = lastOf(BLOWS, T)
  if (i < 0 || ago > 1.1) return
  const x0 = W(BLOWS[i]) + CART.strike[0] + 0.12
  const y0 = CART.strike[1]
  const old = mixHex(HOME.sidingOld, '#8F8B82', 0.62)
  for (let j = 0; j < 8; j++) {
    const vx = 0.35 + hash(i, j, 1) * 0.9
    const vy = -1.1 - hash(i, j, 2) * 1.2
    const x = x0 + vx * ago
    const y = y0 + (hash(i, j, 6) - 0.5) * 0.3 + vy * ago + 4 * ago * ago
    if (y > G) continue
    const s = 0.04 + hash(i, j, 3) * 0.06
    const fade = Math.min(1, (1.1 - ago) / 0.35)
    p.push()
    p.translate(x * k, y * k)
    p.rotate(ago * (5 + j) + j)
    p.stroke(alpha(p, INK, 0.6 * fade))
    p.strokeWeight(weight * 0.35)
    p.fill(alpha(p, j % 3 === 0 ? mixHex(old, INK, 0.2) : old, fade))
    p.quad(-s * k, -s * 0.4 * k, s * 0.8 * k, -s * 0.5 * k, s * k, s * 0.35 * k, -s * 0.7 * k, s * 0.45 * k)
    p.pop()
  }
}

/** A spoked wheel, turned by how far it has rolled. */
function wheel(p: p5, k: number, weight: number, x: number, y: number, r: number, turn: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.fill(HOME.woodDark)
  p.circle(0, 0, 2 * r * k)
  p.fill(HOME.wood)
  p.circle(0, 0, 2 * (r - 0.06) * k)
  p.strokeWeight(weight * 0.6)
  for (let i = 0; i < 6; i++) {
    const a = turn + (i * Math.PI) / 3
    p.line(0, 0, Math.cos(a) * (r - 0.06) * k, Math.sin(a) * (r - 0.06) * k)
  }
  p.fill(HOME.woodDark)
  p.circle(0, 0, 0.1 * k)
  p.pop()
}

/** The machine at show time T. `chairsOutside` draws the chairs still on the lawn or on their way up (not yet in). */
/** The rollers' width. */
const RW = 0.46
/** The helical seam's rise per turn. */
const PITCH = 0.62

/** The seam on a drum from `top` to `bottom`, turned `turn` radians: each turn's front half, left edge to right. */
function helix(p: p5, weight: number, X: (v: number) => number, Y: (v: number) => number, top: number, bottom: number, turn: number, col: string): void {
  p.noFill()
  p.stroke(alpha(p, col, 0.9))
  p.strokeWeight(weight * 0.75)
  const phase = ((turn / (2 * Math.PI)) % 1 + 1) % 1
  for (let n = -1; n * PITCH < bottom - top + PITCH; n++) {
    p.beginShape()
    let open = false
    for (let i = 0; i <= 10; i++) {
      const s = (i / 10) * Math.PI
      const y = top + (n + phase + s / (2 * Math.PI)) * PITCH
      if (y < top + 0.08 || y > bottom - 0.08) {
        if (open) { p.endShape(); p.beginShape(); open = false }
        continue
      }
      p.vertex(X(-(RW / 2 - 0.03) * Math.cos(s)), Y(y))
      open = true
    }
    p.endShape()
  }
}

/**
 * The wet paint behind the rollers: a glossy band on the new wall that dries as they roll on, so the house is seen
 * being painted, not wiped. Over the house's front only (the walls to the eaves), and only while they are on it.
 */
function wetBand(p: p5, k: number, T: number): void {
  if (T <= SHOVE || T >= BRAKE) return
  const w = W(T)
  const edge = w - RW / 2 + 0.02
  const dry = 0.95
  const x0 = Math.max(HOUSE.x0, edge - dry)
  const x1 = Math.min(HOUSE.x1, edge)
  if (x1 <= x0) return
  const [, , b2] = rollers(T)
  const topY = Math.max(HOUSE.eaves, b2 - ROLL)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const g = ctx.createLinearGradient((edge - dry) * k, 0, edge * k, 0)
  g.addColorStop(0, 'rgba(47,138,114,0)')
  g.addColorStop(0.5, 'rgba(47,138,114,0.16)')
  g.addColorStop(1, 'rgba(47,138,114,0.42)')
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, topY * k, (x1 - x0) * k, (G - topY) * k)
  // The gloss: a few long soft streaks the roller's nap left, brightest where it is wettest.
  const s = ctx.createLinearGradient((edge - dry * 0.6) * k, 0, edge * k, 0)
  s.addColorStop(0, 'rgba(255,255,255,0)')
  s.addColorStop(1, 'rgba(255,255,255,0.34)')
  ctx.fillStyle = s
  for (let i = 0; i < 7; i++) {
    const y = topY + 0.35 + i * ((G - topY - 0.7) / 6) + 0.12 * hash(i, 3, 5)
    const len = dry * (0.35 + 0.35 * hash(i, 9, 2))
    ctx.fillRect(Math.max(x0, edge - len) * k, y * k, Math.min(len, edge - x0) * k, 0.035 * k)
  }
  ctx.restore()
}

export function drawRig(p: p5, k: number, weight: number, T: number): void {
  wetBand(p, k, T)
  const w = W(T)
  const X = (v: number) => (w + v) * k
  const Y = (v: number) => v * k
  const rolled = w - W(SHOVE)
  p.push()
  p.rectMode(p.CORNER)

  // The jib (behind the mast): a boom off the mast's first section, its rope and hook.
  const jib = jibAt(T)
  const [jx, jy] = CART.jib
  const tipX = jx + Math.cos(Math.PI - jib.elev) * CART.jibLength
  const tipY = jy - Math.sin(jib.elev) * CART.jibLength
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(HOME.wood)
  p.push()
  p.translate(X(jx), Y(jy))
  p.rotate(-(Math.PI - jib.elev))
  p.rect(0, -0.045 * k, CART.jibLength * k, 0.09 * k, 0.02 * k)
  p.pop()
  p.fill(HOME.woodDark)
  p.circle(X(tipX), Y(tipY), 0.12 * k)
  // The rope: to the hook on the chair's back, or hauled short.
  const hookY = jib.hook ?? tipY + 0.35
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.5)
  p.line(X(tipX), Y(tipY), X(tipX), Y(hookY - 0.08))
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.arc(X(tipX), Y(hookY - 0.02), 0.1 * k, 0.12 * k, -0.3, Math.PI)

  // The belt from the front wheel's hub up to the hammer's gear.
  const [hx, hy] = CART.hammerPivot
  const hub: [number, number] = [CART.wheels[1], G - CART.wheelR]
  p.stroke(alpha(p, INK, 0.7))
  p.strokeWeight(weight * 0.55)
  p.line(X(hub[0] - 0.07), Y(hub[1]), X(hx - 0.1), Y(hy))
  p.line(X(hub[0] + 0.07), Y(hub[1]), X(hx + 0.1), Y(hy))

  // The mast's three rollers, the top one's in the roof's colour; bearings between them; the mast behind. Their paint
  // is wet: deeper and glossier than the dry siding they leave, so the stack stands out against new and old alike.
  const [b0, b1, b2] = rollers(T)
  const paint = [mixHex(HOME.siding, '#2F8A72', 0.4), mixHex(HOME.siding, '#2F8A72', 0.4), mixHex(HOME.roof, INK, 0.12)]
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.woodDark)
  p.rect(X(CART.mast - 0.09), Y(b2 - ROLL - 0.05), 0.18 * k, (BASE - (b2 - ROLL - 0.05)) * k)
  // The rollers' frame: a stile beside the drums, out to the side as a roller's handle is, with an arm to each end of
  // each drum, so the stack reads as rollers held in a frame and not as a pipe on the wall.
  const stile = -RW / 2 - 0.2
  p.rect(X(stile - 0.05), Y(b2 - ROLL - 0.02), 0.1 * k, (BASE - (b2 - ROLL - 0.02)) * k, 0.03 * k)
  for (const b of [b0, b1, b2]) {
    for (const y of [b - ROLL + 0.0, b - 0.0]) p.rect(X(stile), Y(y - 0.035), (0.2 + 0.02) * k, 0.07 * k, 0.02 * k)
  }
  for (const [n, b] of [
    [2, b2],
    [1, b1],
    [0, b0],
  ] as [number, number][]) {
    const top = b - ROLL
    const col = paint[n]
    p.stroke(INK)
    p.strokeWeight(weight * 0.8)
    p.fill(col)
    p.rect(X(-RW / 2), Y(top), RW * k, ROLL * k, 0.1 * k)
    // Its round: shade on the left, a wet shine on the right.
    p.noStroke()
    p.fill(alpha(p, mixHex(col, INK, 0.3), 0.55))
    p.rect(X(-RW / 2 + 0.03), Y(top + 0.06), 0.1 * k, (ROLL - 0.12) * k, 0.04 * k)
    // The seam wound round the drum: its front half seen, a slant that climbs as the drum turns, so the roll reads.
    helix(p, weight, X, Y, top, b, rolled / (RW / 2), mixHex(col, INK, 0.4))
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', 0.4))
    p.rect(X(RW / 2 - 0.12), Y(top + 0.12), 0.045 * k, (ROLL - 0.24) * k, 0.02 * k)
    // The yoke's caps.
    p.stroke(INK)
    p.strokeWeight(weight * 0.7)
    p.fill(HOME.woodDark)
    p.rect(X(-RW / 2 - 0.05), Y(top - 0.06), (RW + 0.1) * k, 0.1 * k, 0.02 * k)
    p.rect(X(-RW / 2 - 0.05), Y(b - 0.04), (RW + 0.1) * k, 0.1 * k, 0.02 * k)
  }

  // The deck, its handle to Carl, its two wheels.
  const [d0, d1] = CART.deck
  const dy = CART.deckY
  const jolt = T > SHOVE ? 0.015 * Math.exp(-(T - SHOVE) / 0.2) * Math.sin((T - SHOVE) * 25) : 0
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(HOME.wood)
  p.rect(X(d0), Y(dy + jolt), (d1 - d0) * k, 0.1 * k, 0.02 * k)
  p.fill(HOME.woodDark)
  p.rect(X(d0 + 0.1), Y(dy + 0.1 + jolt), (d1 - d0 - 0.2) * k, 0.07 * k)
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.wood)
  p.quad(X(d0 + 0.05), Y(dy + 0.02), X(d0 - 0.03), Y(dy + 0.06), X(CART.carl + 0.15), Y(-0.02), X(CART.carl + 0.2), Y(-0.08))
  p.fill(HOME.woodDark)
  p.rect(X(CART.carl + 0.12), Y(-0.16), 0.08 * k, 0.22 * k, 0.03 * k)
  for (const wx of CART.wheels) wheel(p, k, weight, w + wx, G - CART.wheelR, CART.wheelR, rolled / CART.wheelR)

  // The hammer: its gear on the mast, the helve and the iron head.
  const a = hammerAngle(T)
  const gearTurn = rolled * 2.2
  p.push()
  p.translate(X(hx), Y(hy))
  p.stroke(INK)
  p.strokeWeight(weight * 0.75)
  p.fill(HOME.brass)
  p.beginShape()
  for (let i = 0; i < 28; i++) {
    const ang = gearTurn + (i / 28) * Math.PI * 2
    const r = i % 2 === 0 ? 0.21 : 0.17
    p.vertex(Math.cos(ang) * r * k, Math.sin(ang) * r * k)
  }
  p.endShape(p.CLOSE)
  p.noFill()
  p.strokeWeight(weight * 0.5)
  p.circle(0, 0, 0.2 * k)
  const L = Math.hypot(CART.strike[0] - hx, CART.strike[1] - hy)
  p.rotate(a)
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.wood)
  p.rect(-0.12 * k, -0.045 * k, (L - 0.05) * k, 0.09 * k, 0.03 * k)
  p.fill('#5E5A57')
  p.rect((L - 0.14) * k, -0.2 * k, 0.24 * k, 0.4 * k, 0.03 * k)
  p.noStroke()
  p.fill(alpha(p, '#FFFFFF', 0.25))
  p.rect((L - 0.11) * k, -0.17 * k, 0.05 * k, 0.34 * k, 0.02 * k)
  p.stroke(INK)
  p.fill(HOME.woodDark)
  p.circle(0, 0, 0.09 * k)
  p.pop()
  flakes(p, k, weight, T)

  // The brake: a block on an arm that drops against the rear wheel as the cart comes to rest.
  const brake = smooth(T, BRAKE - 0.12, BRAKE)
  const bx = CART.wheels[0] - CART.wheelR - 0.02
  p.push()
  p.translate(X(bx + 0.18), Y(dy + 0.12))
  p.rotate(0.9 - 0.75 * brake + (T > BRAKE ? 0.06 * Math.exp(-(T - BRAKE) / 0.1) * Math.sin((T - BRAKE) * 40) : 0))
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.line(0, 0, 0, 0.3 * k)
  p.fill(HOME.woodDark)
  p.rect(-0.05 * k, 0.24 * k, 0.1 * k, 0.12 * k, 0.02 * k)
  p.pop()
  p.pop()
}

/** The chairs on the lawn and on the way up, outside the house: drawn in front of the bay's sill. */
export function drawChairsOut(p: p5, k: number, weight: number, T: number): void {
  for (const f of FLIGHTS) {
    const { y, inside } = chairFloor(f, T)
    if (inside) continue
    drawChair(p, k, weight, f.who, f.x, y, 0, 1)
  }
}

/** The chairs going down into the room, seen only through the bay's glass (before they land, when the set takes them). */
export function drawChairsIn(p: p5, k: number, weight: number, T: number): void {
  const { x0, x1, sill, head } = HOUSE.bay
  for (const f of FLIGHTS) {
    const { y, inside } = chairFloor(f, T)
    if (!inside || T >= f.land) continue
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, head * k, (x1 - x0) * k, (sill - head) * k)
    ctx.clip()
    drawChair(p, k, weight, f.who, f.x, y, 0, 1)
    ctx.restore()
  }
}
