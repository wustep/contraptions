import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import type { PieceCtx } from '../../../../parts'
import { BAR, BEAT, COLLAPSE, LAST, SNARE, STROKES, T0, lastIndex, loud, pluck } from './music'
import { DRUM } from './plan'
import { BRASS, DRUM_RED, INK, IRON, PAPER, alpha, deep, pale, ring } from './look'

/**
 * The ground and the one thing that stands on it: the side drum, which plays the rhythm all show and carries the
 * tower on its head.
 *
 * The drum is played by a machine beside it: a wheel with the rhythm on its rim as 24 pins (two bars of it, the
 * triplets as close pins), turning once every two bars. Each pin, passing the top, lifts the tail of a stick pivoted
 * over the drum and lets it go, and the stick's tip falls on the head: so every stroke is a pin, and the wheel shows
 * the whole rhythm at once. The same wheel, by a rod along the ground, works a mallet on a wooden box on the other
 * side of the drum: the plucked strings' low note on every downbeat, a lighter tap on the other two beats.
 */

export const WHEEL = { x: 1.62, y: -0.72, r: 0.42 }
const PIVOT = { x: 1.02, y: -1.22 }
const TIP = { x: 0.22, y: DRUM.head - 0.02 }
export const BOX = { x: 3.05, w: 0.86, h: 0.46 }

/** The wheel's turn at `t`, radians: once every two bars, pin `i` at the top on its stroke. */
export const wheelTurn = (t: number): number => (2 * Math.PI * (t - T0)) / (2 * BAR)
const pinAngle = (i: number): number => -Math.PI / 2 - (2 * Math.PI * SNARE[i]) / 6

/** How high the stick's tip is over the head: down on each stroke, up between (higher over a longer gap, and louder). */
export function stickLift(t: number): number {
  if (t >= LAST) return 0.18
  const n = lastIndex(STROKES, t)
  if (n < 0) {
    const next = STROKES[0]
    return 0.2 * Math.min(1, Math.max(0, (next - t) / 0.4))
  }
  const a = STROKES[n]
  const b = n + 1 < STROKES.length ? STROKES[n + 1] : a + BEAT / 2
  const gap = b - a
  const u = (t - a) / gap
  const amp = (0.05 + 0.34 * Math.min(1, gap / 0.42)) * (0.55 + 0.6 * loud(t))
  // Up fast off the head, a hang, and down fast onto the next stroke.
  const up = Math.min(1, u / 0.28)
  const down = Math.min(1, (1 - u) / 0.22)
  return amp * Math.min(up * (2 - up), down * (2 - down))
}

export function drawGround(p: p5, c: PieceCtx): void {
  const { k, weight } = c
  p.push()
  p.noStroke()
  p.fill(pale(IRON, 0.86))
  p.rectMode(p.CORNER)
  p.rect(-80 * k, 0, 160 * k, 6 * k)
  outline(p, INK, weight)
  p.line(-80 * k, 0, 80 * k, 0)
  p.pop()
}

export function drawBase(p: p5, c: PieceCtx, t: number): void {
  const { k, weight } = c
  const L = loud(t)
  const turn = wheelTurn(t)

  // The rod along the ground from the wheel's crank to the box's cam.
  outline(p, INK, weight * 0.9)
  const crank = { x: WHEEL.x + Math.cos(turn * 3) * 0.1, y: WHEEL.y + Math.sin(turn * 3) * 0.1 }
  p.line(crank.x * k, crank.y * k, (BOX.x - BOX.w / 2 - 0.08) * k, (-BOX.h - 0.42) * k)

  // The wheel's stand: an A frame on the ground.
  outline(p, INK, weight * 1.2)
  p.line((WHEEL.x - 0.34) * k, 0, WHEEL.x * k, WHEEL.y * k)
  p.line((WHEEL.x + 0.34) * k, 0, WHEEL.x * k, WHEEL.y * k)
  p.line((WHEEL.x - 0.22) * k, -0.25 * k, (WHEEL.x + 0.22) * k, -0.25 * k)

  // The wheel, its spokes and its 24 pins.
  p.push()
  p.translate(WHEEL.x * k, WHEEL.y * k)
  solid(p, INK, weight, pale(BRASS, 0.3))
  p.circle(0, 0, WHEEL.r * 2 * k)
  p.rotate(turn)
  outline(p, INK, weight * 0.8)
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    p.line(Math.cos(a) * 0.07 * k, Math.sin(a) * 0.07 * k, Math.cos(a) * (WHEEL.r - 0.05) * k, Math.sin(a) * (WHEEL.r - 0.05) * k)
  }
  solid(p, INK, weight * 0.8, BRASS)
  p.circle(0, 0, 0.13 * k)
  for (let i = 0; i < SNARE.length; i++) {
    const a = pinAngle(i) + Math.PI / 2
    const x = Math.cos(a - Math.PI / 2) * WHEEL.r
    const y = Math.sin(a - Math.PI / 2) * WHEEL.r
    const x2 = Math.cos(a - Math.PI / 2) * (WHEEL.r + 0.07)
    const y2 = Math.sin(a - Math.PI / 2) * (WHEEL.r + 0.07)
    outline(p, INK, weight * 1.3)
    p.line(x * k, y * k, x2 * k, y2 * k)
  }
  p.pop()

  // The stick: pivoted over the drum's right rim, its tail riding the pins, its tip on the head.
  const lift = stickLift(t)
  const reach = Math.hypot(TIP.x - PIVOT.x, TIP.y - PIVOT.y)
  const rest = Math.atan2(TIP.y - PIVOT.y, TIP.x - PIVOT.x)
  const a = rest + Math.asin(Math.min(0.9, lift / reach))
  const tip = { x: PIVOT.x + Math.cos(a) * reach, y: PIVOT.y + Math.sin(a) * reach }
  const tail = { x: PIVOT.x - Math.cos(a) * 0.62, y: PIVOT.y - Math.sin(a) * 0.62 }
  // Its post.
  outline(p, INK, weight * 1.1)
  p.line(PIVOT.x * k, PIVOT.y * k, (PIVOT.x + 0.08) * k, (DRUM.head + 0.3) * k)
  outline(p, INK, weight * 2.1)
  p.stroke(deep('#C9A36A', 0.1))
  p.line(tail.x * k, tail.y * k, tip.x * k, tip.y * k)
  outline(p, INK, weight * 0.8)
  p.noFill()
  solid(p, INK, weight * 0.8, '#E7D2A8')
  p.circle(tip.x * k, tip.y * k, 0.09 * k)
  solid(p, INK, weight * 0.8, BRASS)
  p.circle(PIVOT.x * k, PIVOT.y * k, 0.08 * k)

  // The drum: a snare on a low stand.
  const top = DRUM.head
  const bottom = -DRUM.foot
  outline(p, INK, weight * 1.1)
  for (const x of [-0.5, 0.05, 0.55]) p.line(x * 0.9 * k, bottom * k, x * 1.4 * k, 0)
  const since = t - STROKES[Math.max(0, lastIndex(STROKES, t))]
  const hit = t >= STROKES[0] && t < COLLAPSE ? ring(since, 18, 0.05) * 0.012 * (0.4 + L) : 0
  solid(p, INK, weight, DRUM_RED)
  p.rectMode(p.CORNERS)
  p.rect((-DRUM.w / 2) * k, (top + 0.05) * k, (DRUM.w / 2) * k, (bottom - 0.04) * k)
  // Its white band and the rods.
  p.noStroke()
  p.fill(alpha(p, PAPER, 0.85))
  p.rect((-DRUM.w / 2) * k, ((top + bottom) / 2 - 0.05) * k, (DRUM.w / 2) * k, ((top + bottom) / 2 + 0.05) * k)
  outline(p, INK, weight * 0.8)
  for (let i = 0; i < 6; i++) {
    const x = -DRUM.w / 2 + 0.12 + (i * (DRUM.w - 0.24)) / 5
    p.line(x * k, (top + 0.08) * k, x * k, (bottom - 0.08) * k)
    solid(p, INK, weight * 0.7, BRASS)
    p.rect((x - 0.035) * k, ((top + bottom) / 2 - 0.07) * k, (x + 0.035) * k, ((top + bottom) / 2 + 0.07) * k, 0.01 * k)
    outline(p, INK, weight * 0.8)
  }
  // Hoops.
  solid(p, INK, weight, pale(IRON, 0.35))
  p.rect((-DRUM.w / 2 - 0.04) * k, (top - 0.02 + hit) * k, (DRUM.w / 2 + 0.04) * k, (top + 0.07 + hit) * k, 0.02 * k)
  p.rect((-DRUM.w / 2 - 0.04) * k, (bottom - 0.08) * k, (DRUM.w / 2 + 0.04) * k, bottom * k, 0.02 * k)
  p.rectMode(p.CENTER)

  // The box and its mallet: down on the plucked strings' low note, a tap on the others.
  const low = pluck(t, 'low')
  const other = Math.min(pluck(t, 'mid'), pluck(t, 'high'))
  const boxTop = -BOX.h
  solid(p, INK, weight, '#C58E55')
  p.rectMode(p.CORNERS)
  p.rect((BOX.x - BOX.w / 2) * k, boxTop * k, (BOX.x + BOX.w / 2) * k, 0, 0.03 * k)
  solid(p, INK, weight * 0.8, deep('#C58E55', 0.45))
  p.rect((BOX.x - 0.16) * k, (boxTop + 0.14) * k, (BOX.x + 0.16) * k, (boxTop + 0.3) * k, 0.02 * k)
  p.rectMode(p.CENTER)
  const bigAgo = t < COLLAPSE ? low : Infinity
  const smallAgo = t < COLLAPSE ? other : Infinity
  mallet(p, k, weight, { x: BOX.x - 0.62, y: boxTop - 0.32 }, 0.5, bigAgo, 0.9, 0.24 * (0.6 + L))
  mallet(p, k, weight, { x: BOX.x + 0.66, y: boxTop - 0.26 }, -0.44, smallAgo, 0.55, 0.16 * (0.6 + L))
}

/** A mallet on a pivot: its head down on the box at its stroke, lifted between. */
function mallet(p: p5, k: number, weight: number, pivot: { x: number; y: number }, len: number, ago: number, size: number, amp: number): void {
  // Down at the stroke, up in 0.25 s, then held up waiting (the next stroke brings it down).
  const up = Number.isFinite(ago) ? Math.min(1, ago / 0.28) : 1
  const lift = amp * (up * (2 - up))
  const a = (len > 0 ? 0.45 : Math.PI - 0.45) + (len > 0 ? -1 : 1) * lift * 2.4
  const L = Math.abs(len)
  const hx = pivot.x + Math.cos(a) * L
  const hy = pivot.y + Math.sin(a) * L
  outline(p, INK, weight * 1.1)
  p.line(pivot.x * k, pivot.y * k, (pivot.x + (len > 0 ? -0.05 : 0.05)) * k, 0)
  outline(p, INK, weight * 1.6)
  p.stroke('#8A6A45')
  p.line(pivot.x * k, pivot.y * k, hx * k, hy * k)
  solid(p, INK, weight * 0.8, '#3F3A36')
  p.push()
  p.translate(hx * k, hy * k)
  p.rotate(a)
  p.rectMode(p.CENTER)
  p.rect(0, 0, 0.1 * size * k, 0.2 * size * k, 0.03 * k)
  p.pop()
  solid(p, INK, weight * 0.8, BRASS)
  p.circle(pivot.x * k, pivot.y * k, 0.07 * k)
}
