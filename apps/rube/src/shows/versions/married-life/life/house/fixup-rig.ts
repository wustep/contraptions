import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash, lastOf, smooth } from '../kit'
import { beatsIn } from '../music'
import { HOME, INK } from '../worlds'
import { CHAIR, drawChair } from '../props/chairs'
import { BLOWS, BRAKE, CART, CHAIR_LIFT, CHAIRS, FOLD, G, HOUSE, P, RAISE, SHOVE, W } from './front-plan'

/**
 * The fix-up machine (the house builder's): a wooden cart Carl pushes along the front of the house. Its front wheel
 * turns a belt to the gear of a trip hammer, which the gear lifts slowly over each bar and lets fall on the downbeat;
 * the blow strikes the old wall just ahead of three stacked rollers, as tall as the house on a telescoping mast,
 * that leave the house new wherever they pass. A jib on the mast lifts the two armchairs (his off the lawn by the
 * porch, hers off the back of the deck) and swings them in over the sill through the empty bay. Drawn in the house world's cells; `fixup.ts` places it.
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

/**
 * The trip hammer's angle (radians, clockwise from pointing right, about its pivot) at T. Each bar it rebounds off the
 * wall and lies there a moment; the gear then trips it up, quick, into beat 3 (the melody's pickup), where the pawl
 * catches it with a small recoil; it hangs there, cocked, and falls onto the next downbeat.
 */
const STRIKE = Math.atan2(CART.strike[1] - CART.hammerPivot[1], CART.strike[0] - CART.hammerPivot[0])
const RAISED = -0.2
/** Each blow's bar's beat 3, where the hammer reaches the top: TOPS[i] follows BLOWS[i]. */
export const TOPS: number[] = BLOWS.map((t) => {
  const b = beatsIn(t + 0.05, t + 1.5).find((x) => x.pos === 3)
  return b ? b.t : t + 0.68
})
/** How long the trip up takes, how long the fall. */
const TRIP = 0.38
const FALL = 0.13
/** The recoil as the pawl catches it at the top (radians back down), s after the catch: one damped dip, then still. */
const caught = (s: number): number => (s <= 0 ? 0 : 0.15 * Math.exp(-s / 0.06) * Math.sin(Math.min(Math.PI, s * 26)))
export function hammerAngle(T: number): number {
  const { i } = lastOf(BLOWS, T)
  const next = i + 1 < BLOWS.length ? BLOWS[i + 1] : Infinity
  if (T >= next - FALL) {
    const u = (T - (next - FALL)) / FALL
    return RAISED + (STRIKE - RAISED) * u * u + (i < 0 ? 0 : caught(T - TOPS[i]))
  }
  // Before the first blow it hangs cocked from the start.
  if (i < 0) return RAISED
  const prev = BLOWS[i]
  const top = TOPS[i]
  // The rebound off the wall, lifting it clear a little (negative: up).
  const s = T - prev
  const rebound = 0.1 * Math.exp(-s / 0.05) * Math.sin(Math.min(Math.PI, s * 35))
  // The trip: from rest on the wall, gathering speed, to the top on beat 3.
  const start = Math.max(prev + 0.2, top - TRIP)
  const u = Math.max(0, Math.min(1, (T - start) / (top - start)))
  return STRIKE + (RAISED - STRIKE) * u * u - rebound + caught(T - top)
}

/**
 * The two chairs' ways in. Moving-in day: hers rides on the back of the cart's deck beside her from the start; his
 * waits on the lawn in front of the porch, clear of the old bay's dark. On its beat the jib lifts each one and swings
 * it sideways over the sill into the bay, to stand side by side: his first (bar 9 to 10), then hers (11 to 12).
 */
interface ChairFlight {
  who: 'carl' | 'ellie'
  /** Where it lands in the room. */
  x: number
  /** Where it waits: a fixed spot on the lawn, or a place on the deck (from the rollers' line, riding with the cart). */
  lawn?: number
  deck?: number
  down: number
  lift: number
  land: number
}
const FLIGHTS: ChairFlight[] = [
  { who: 'carl', x: CHAIRS.carl, lawn: 4.5, down: CHAIR_LIFT.carl[0], lift: CHAIR_LIFT.carl[1], land: CHAIR_LIFT.carl[2] },
  { who: 'ellie', x: CHAIRS.ellie, deck: -2.05, down: CHAIR_LIFT.ellie[0], lift: CHAIR_LIFT.ellie[1], land: CHAIR_LIFT.ellie[2] },
]
/**
 * The jib: a telescoping boom off the mast that luffs as it runs out, so its tip keeps near one height (a level-luffing
 * crane): out over the porch's lawn for his chair, back over the deck for hers. Its fixed section (the length it has
 * standing up at rest), its sliding one, and how much the tip's height gives as it reaches out.
 */
const BOOM = 1.8
const SLIDE = 1.35
const LUFF = 0.08
/** How far back of the pivot the tip is at rest (the boom nearly upright, leaning back over the deck). */
const REST_DX = BOOM * Math.cos(1.5)
/** The top of the flight (the chair's floor), as high as the old one's. */
const ARC_TOP = -0.98

/** The deck's shudder as he shoves the cart off: it and whatever rides on it. */
const deckJolt = (T: number): number => (T > SHOVE ? 0.015 * Math.exp(-(T - SHOVE) / 0.2) * Math.sin((T - SHOVE) * 25) : 0)

/** Where a waiting chair is at T, and the floor under it. */
function waiting(f: ChairFlight, T: number): { x: number; y: number } {
  if (f.deck !== undefined) return { x: W(T) + f.deck, y: CART.deckY + deckJolt(T) }
  return { x: f.lawn ?? f.x, y: G }
}

/** The quintic Hermite from p0 (moving v0) to p1 at rest, with no kick in its pull at either end, over D, at u. */
function glide(p0: number, v0: number, p1: number, D: number, u: number): number {
  const u3 = u * u * u
  const u4 = u3 * u
  const u5 = u4 * u
  const h1 = u - 6 * u3 + 8 * u4 - 3 * u5
  const h5 = 10 * u3 - 15 * u4 + 6 * u5
  return p0 + (p1 - p0) * h5 + v0 * D * h1
}

/** The bay's middle light, between its posts: the missing pane a chair goes in through. */
const MIDDLE = [HOUSE.bay.x0 + HOUSE.bay.facet + 0.05, HOUSE.bay.x1 - HOUSE.bay.facet - 0.05]

/**
 * Where a chair is at T (its middle, the floor under it), whether it is indoors (in through the middle light, over the
 * sill and going down), and how far it swings on its hook (radians, from how hard the swing pulls it sideways).
 */
export function chairAt(f: ChairFlight, T: number): { x: number; y: number; inside: boolean; sway: number } {
  if (T < f.lift) return { ...waiting(f, T), inside: false, sway: 0 }
  if (T >= f.land) return { x: f.x, y: P, inside: true, sway: 0 }
  const D = f.land - f.lift
  const from = waiting(f, f.lift)
  // Up off the lawn (or the deck) to the top, then down onto the room's floor.
  const peak = f.lift + 0.52 * D
  let y: number
  if (T < peak) {
    const u = (T - f.lift) / (peak - f.lift)
    y = from.y + (ARC_TOP - from.y) * (u * u * (3 - 2 * u))
  } else {
    const u = (T - peak) / (f.land - peak)
    y = ARC_TOP + (P - ARC_TOP) * (u * u)
  }
  // Sideways: from where it waited (carrying on at the cart's pace if it rode the deck) to its place, settled over
  // it a moment before it touches down.
  const XD = 0.92 * D
  const v0 = f.deck !== undefined ? (W(f.lift + 1e-3) - W(f.lift - 1e-3)) / 2e-3 : 0
  const xAt = (t: number) => (t >= f.lift + XD ? f.x : t <= f.lift ? from.x + v0 * (t - f.lift) : glide(from.x, v0, f.x, XD, (t - f.lift) / XD))
  const x = xAt(T)
  const h = 0.01
  const ax = (xAt(T + h) - 2 * x + xAt(T - h)) / (h * h)
  const sway = Math.max(-0.12, Math.min(0.12, 0.006 * ax))
  const half = CHAIR.w / 2
  const inside = T >= peak && x - half >= MIDDLE[0] && x + half <= MIDDLE[1]
  return { x, y, inside, sway }
}

/** The jib's tip at T, as how far back of its pivot it is (negative: out ahead), and its hook (null: hauled short). */
function jibAt(T: number): { dx: number; hook: number | null } {
  const pivotX = W(T) + CART.jib[0]
  const over = (x: number) => pivotX - x
  const [his, hers] = FLIGHTS
  const top = (f: ChairFlight, t: number) => chairAt(f, t).y - CHAIR.back
  // Out over the porch's lawn to his chair: a slow swing over from rest, the hook paid out as it arrives.
  const OUT = 1.7
  if (T < his.down - OUT) return { dx: REST_DX, hook: null }
  if (T < his.down) {
    const dx = REST_DX + (over(his.lawn!) - REST_DX) * smooth(T, his.down - OUT, his.down)
    const hauled = tipHeight(dx) + 0.35
    return { dx, hook: hauled + (top(his, T) - hauled) * smooth(T, his.down - 1.05, his.down) }
  }
  if (T < his.land) return { dx: over(chairAt(his, T).x), hook: top(his, T) }
  // Let go of his, the hook lifted clear, and set on hers on the deck just behind.
  if (T < hers.down) {
    const s = smooth(T, his.land, hers.down)
    const x = his.x + (chairAt(hers, T).x - his.x) * s
    return { dx: over(x), hook: top(his, his.land) + (top(hers, T) - top(his, his.land)) * s - 0.4 * Math.sin(Math.PI * s) }
  }
  if (T < hers.land) return { dx: over(chairAt(hers, T).x), hook: top(hers, T) }
  // Let go: the hook hauled up (unhurried) as the boom draws in and stands back up to rest.
  const dx = over(hers.x) + (REST_DX - over(hers.x)) * smooth(T, hers.land + 0.1, hers.land + 1.0)
  const low = P - CHAIR.back
  return { dx, hook: low + (tipHeight(dx) + 0.35 - low) * smooth(T, hers.land + 0.05, hers.land + 0.95) }
}

/** The tip's height (y) when it is `dx` back of the pivot: the boom's standing length upright, a little lower far out. */
function tipHeight(dx: number): number {
  return CART.jib[1] - Math.sqrt(BOOM * BOOM - LUFF * dx * dx)
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
  drawChairsFlying(p, k, weight, T)
  const w = W(T)
  const X = (v: number) => (w + v) * k
  const Y = (v: number) => v * k
  const rolled = w - W(SHOVE)
  p.push()
  p.rectMode(p.CORNER)

  // The jib (behind the mast): a boom off the mast's first section, its sliding section run out as far as it reaches,
  // its rope and hook.
  const jib = jibAt(T)
  const [jx, jy] = CART.jib
  const tipX = jx - jib.dx
  const tipY = tipHeight(jib.dx)
  const len = Math.hypot(jib.dx, jy - tipY)
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.push()
  p.translate(X(jx), Y(jy))
  p.rotate(Math.atan2(tipY - jy, -jib.dx))
  p.fill(mixHex(HOME.wood, '#FFFFFF', 0.12))
  p.rect(Math.max(0.2, len - SLIDE) * k, -0.03 * k, Math.min(SLIDE, len - 0.2) * k, 0.06 * k, 0.015 * k)
  p.fill(HOME.wood)
  p.rect(0, -0.045 * k, BOOM * k, 0.09 * k, 0.02 * k)
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
  const jolt = deckJolt(T)
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

/** One chair hanging on the hook (or standing), swung `sway` about the top of its back. */
function hung(p: p5, k: number, weight: number, f: ChairFlight, c: { x: number; y: number; sway: number }): void {
  if (Math.abs(c.sway) < 1e-4) {
    drawChair(p, k, weight, f.who, c.x, c.y, 0, 1)
    return
  }
  const hookY = c.y - CHAIR.back
  p.push()
  p.translate(c.x * k, hookY * k)
  p.rotate(c.sway)
  drawChair(p, k, weight, f.who, 0, CHAIR.back, 0, 1)
  p.pop()
}

/** The chairs still waiting (on the lawn, on the deck), before the jib lifts them. */
export function drawChairsOut(p: p5, k: number, weight: number, T: number): void {
  for (const f of FLIGHTS) if (T < f.lift) hung(p, k, weight, f, chairAt(f, T))
}

/**
 * The chairs on the hook, from the lift to the landing: outside, in front of the house; once in through the middle
 * light, seen only through the bay. Drawn with the machine (`drawRig`), over the wet paint on the wall and under the
 * mast, the jib and its rope.
 */
function drawChairsFlying(p: p5, k: number, weight: number, T: number): void {
  const { x0, x1, sill, head } = HOUSE.bay
  for (const f of FLIGHTS) {
    if (T < f.lift || T >= f.land) continue
    const c = chairAt(f, T)
    if (!c.inside) {
      hung(p, k, weight, f, c)
      continue
    }
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, head * k, (x1 - x0) * k, (sill - head) * k)
    ctx.clip()
    hung(p, k, weight, f, c)
    ctx.restore()
  }
}

/** (Nothing waits indoors: the chairs going in are the machine's load, drawn in `drawRig`, and once down the set's.) */
export function drawChairsIn(_p: p5, _k: number, _weight: number, _T: number): void {}
