import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { frame, hash, smooth } from '../kit'
import { level } from '../music'
import { GALA } from '../worlds'
import {
  BOTTLE,
  bottleAngle,
  BRIM,
  COUPE,
  hush,
  coupeAt,
  mouthAt,
  PEDAL,
  pedalDown,
  POST,
  pourFlow,
  TABLE,
  TIERS,
  tierFill,
  T_TOAST,
} from './gala-plan'

/**
 * The gala, drawn by show time: a long room at night in champagne light, chandeliers, a crowd of dark figures at the
 * back and a long table, and in front the tower of coupes on its round table with the pouring stand beside it.
 */

type Frame = ReturnType<typeof frame>
type Ctx = CanvasRenderingContext2D
const seen = (f: Frame, d: number, x: number, y: number): Pt => [f.cx + d * (x - f.cx), f.cy + d * (y - f.cy)]
const FLOOR_Y = 0.13

/* ------------------------------------------------------------------ the room */

function room(ctx: Ctx, k: number, f: Frame, t: number): void {
  const w = f.x1 - f.x0
  // The back wall: deep blue-grey, lit warm toward the middle height where the chandeliers are.
  const g = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
  g.addColorStop(0, mix(GALA.room, GALA.guests, 0.45))
  g.addColorStop(0.45, GALA.roomLit)
  g.addColorStop(1, GALA.room)
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (w + 2) * k, (f.y1 - f.y0 + 2) * k)
  // Tall windows at the back, night in them, between pilasters (at depth: they move less).
  const d = 0.5
  for (let i = -4; i <= 5; i++) {
    const wx = i * 5.2 + 1.2
    const [x0, y0] = seen(f, d, wx - 1.1, -7.6)
    const [x1, y1] = seen(f, d, wx + 1.1, -1.1)
    if (x1 < f.x0 - 1 || x0 > f.x1 + 1) continue
    ctx.fillStyle = mix(GALA.room, GALA.guests, 0.32)
    ctx.beginPath()
    const r = (x1 - x0) / 2
    ctx.moveTo(x0 * k, y1 * k)
    ctx.lineTo(x0 * k, (y0 + r) * k)
    ctx.arc(((x0 + x1) / 2) * k, (y0 + r) * k, r * k, Math.PI, 0)
    ctx.lineTo(x1 * k, y1 * k)
    ctx.closePath()
    ctx.fill()
    // The room's light caught faintly in the glass.
    const sh = ctx.createLinearGradient(x0 * k, y0 * k, x1 * k, y1 * k)
    sh.addColorStop(0, rgba(GALA.lightWarm, 0.06))
    sh.addColorStop(0.5, rgba(GALA.lightWarm, 0))
    ctx.fillStyle = sh
    ctx.fill()
    // Mullions, faint.
    ctx.fillStyle = rgba(GALA.roomLit, 0.45)
    ctx.fillRect(((x0 + x1) / 2) * k - 0.5, (y0 + r * 0.4) * k, 1, (y1 - y0 - r * 0.4) * k)
    for (let m = 1; m <= 3; m++) ctx.fillRect(x0 * k, (y0 + r + ((y1 - y0 - r) * m) / 4) * k - 0.5, (x1 - x0) * k, 1)
  }
  // The floor: polished, dark, the light lying on it.
  const [, fy] = seen(f, d, 0, FLOOR_Y - 1.2)
  const fl = ctx.createLinearGradient(0, fy * k, 0, (FLOOR_Y + 3) * k)
  fl.addColorStop(0, mix(GALA.floor, GALA.roomLit, 0.4))
  fl.addColorStop(0.35, GALA.floor)
  fl.addColorStop(1, mix(GALA.floor, GALA.guests, 0.35))
  ctx.fillStyle = fl
  ctx.fillRect((f.x0 - 1) * k, fy * k, (w + 2) * k, (f.y1 + 1 - fy) * k)
  void t
}

/** A chandelier: a fall of crystal strands lit warm, hung from out of the top of the frame; no bright core. */
function chandelier(ctx: Ctx, k: number, f: Frame, x: number, t: number, i: number): void {
  const d = 0.62
  const [cx, cy] = seen(f, d, x, -4.9)
  const s = d
  const breath = (0.85 + 0.15 * level(t)) * (1 - 0.3 * hush(t))
  // Its light on the room: wide and soft.
  const R = 4.6 * s
  const glow = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, R * k)
  glow.addColorStop(0, rgba(GALA.lightWarm, 0.28 * breath))
  glow.addColorStop(0.35, rgba(GALA.lightWarm, 0.12 * breath))
  glow.addColorStop(1, rgba(GALA.lightWarm, 0))
  ctx.fillStyle = glow
  ctx.fillRect((cx - R) * k, (cy - R) * k, 2 * R * k, 2 * R * k)
  // The chain up out of the frame.
  ctx.fillStyle = rgba(GALA.lightWarm, 0.35)
  ctx.fillRect(cx * k - 0.5, (f.y0 - 1) * k, 1, (cy - 0.7 * s - f.y0 + 1) * k)
  // The strands: an inverted dome of short falls of light, swaying a little.
  const n = 15
  for (let j = 0; j < n; j++) {
    const u = (j / (n - 1)) * 2 - 1
    const sway = 0.02 * Math.sin(t * 0.7 + j + i)
    const sx = cx + u * 0.75 * s + sway
    const top = cy - 0.55 * s + Math.abs(u) * 0.15 * s
    const len = (0.9 - 0.55 * u * u) * s
    const a = 0.55 + 0.35 * hash(j, i, 7)
    const g = ctx.createLinearGradient(0, top * k, 0, (top + len) * k)
    g.addColorStop(0, rgba(GALA.light, 0.2 * a))
    g.addColorStop(0.7, rgba(GALA.light, 0.75 * a * breath))
    g.addColorStop(1, rgba(GALA.light, 0))
    ctx.fillStyle = g
    ctx.fillRect(sx * k - Math.max(0.8, 0.018 * s * k), top * k, Math.max(1.6, 0.036 * s * k), len * k)
  }
  // Its ring of arms, a thin warm band.
  ctx.fillStyle = rgba(GALA.lightWarm, 0.5)
  ctx.fillRect((cx - 0.8 * s) * k, (cy - 0.58 * s) * k, 1.6 * s * k, Math.max(1, 0.04 * s * k))
}

/* ------------------------------------------------------------------ the crowd */

interface Guest {
  x: number
  h: number
  face: 1 | -1
  dress: boolean
  glass: boolean
  seed: number
}
const GUESTS: Guest[] = [
  { x: -9.2, h: 3.1, face: 1, dress: false, glass: true, seed: 1 },
  { x: -8.3, h: 2.85, face: -1, dress: true, glass: true, seed: 2 },
  { x: -6.1, h: 3.2, face: 1, dress: false, glass: false, seed: 3 },
  { x: -5.2, h: 2.9, face: -1, dress: true, glass: true, seed: 4 },
  { x: -1.4, h: 3.15, face: 1, dress: false, glass: true, seed: 5 },
  { x: 2.6, h: 2.95, face: -1, dress: true, glass: true, seed: 6 },
  { x: 3.5, h: 3.2, face: -1, dress: false, glass: true, seed: 7 },
  { x: 6.3, h: 3.05, face: 1, dress: false, glass: false, seed: 8 },
  { x: 7.1, h: 2.8, face: -1, dress: true, glass: true, seed: 9 },
  { x: 9.8, h: 3.1, face: -1, dress: false, glass: true, seed: 10 },
  { x: 11.0, h: 2.9, face: 1, dress: true, glass: true, seed: 11 },
]

/** A guest: a dark figure, drawn, never a ball: shoulders, a dress or a suit, an arm with a coupe that rises for the toast. */
function guest(ctx: Ctx, k: number, x: number, y: number, h: number, g: Guest, t: number, color: string): void {
  const sway = 0.012 * h * Math.sin(t * 0.5 + g.seed * 1.7)
  const sh = y - h * 0.8
  const hx = x + sway
  ctx.fillStyle = color
  // Body.
  ctx.beginPath()
  if (g.dress) {
    ctx.moveTo((hx - h * 0.09) * k, sh * k)
    ctx.quadraticCurveTo((hx - h * 0.07) * k, (y - h * 0.5) * k, (x - h * 0.15) * k, y * k)
    ctx.lineTo((x + h * 0.15) * k, y * k)
    ctx.quadraticCurveTo((hx + h * 0.07) * k, (y - h * 0.5) * k, (hx + h * 0.09) * k, sh * k)
  } else {
    ctx.moveTo((hx - h * 0.12) * k, sh * k)
    ctx.lineTo((hx - h * 0.1) * k, (y - h * 0.45) * k)
    ctx.lineTo((x - h * 0.075) * k, y * k)
    ctx.lineTo((x - h * 0.015) * k, y * k)
    ctx.lineTo((x) * k, (y - h * 0.4) * k)
    ctx.lineTo((x + h * 0.015) * k, y * k)
    ctx.lineTo((x + h * 0.075) * k, y * k)
    ctx.lineTo((hx + h * 0.1) * k, (y - h * 0.45) * k)
    ctx.lineTo((hx + h * 0.12) * k, sh * k)
  }
  ctx.closePath()
  ctx.fill()
  // Neck and head: an upright oval, a little turned.
  ctx.fillRect((hx - h * 0.02) * k, (sh - h * 0.05) * k, h * 0.04 * k, h * 0.06 * k)
  ctx.beginPath()
  ctx.ellipse((hx + g.face * h * 0.008) * k, (y - h * 0.9) * k, h * 0.047 * k, h * 0.064 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  if (!g.glass) return
  // The arm: at the waist with its glass, then raised for the toast.
  const up = smooth(t, T_TOAST + 0.08 * (g.seed % 4), T_TOAST + 0.75 + 0.08 * (g.seed % 4)) * (1 - smooth(t, T_TOAST + 3.4, T_TOAST + 4.6))
  const s0: Pt = [hx + g.face * h * 0.1, sh + h * 0.02]
  const hand: Pt = [hx + g.face * h * (0.17 + 0.05 * up), y - h * (0.5 + 0.44 * up)]
  const elbow: Pt = [hx + g.face * h * (0.16 - 0.02 * up), y - h * (0.6 + 0.14 * up)]
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, h * 0.045 * k)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(s0[0] * k, s0[1] * k)
  ctx.lineTo(elbow[0] * k, elbow[1] * k)
  ctx.lineTo(hand[0] * k, hand[1] * k)
  ctx.stroke()
  // The coupe in the hand: catching the light as it rises.
  const cw = h * 0.07
  ctx.fillStyle = rgba(mix(GALA.glass, GALA.lightWarm, 0.5), 0.35 + 0.45 * up)
  ctx.beginPath()
  ctx.moveTo((hand[0] - cw / 2) * k, (hand[1] - h * 0.05) * k)
  ctx.lineTo((hand[0] + cw / 2) * k, (hand[1] - h * 0.05) * k)
  ctx.lineTo((hand[0] + cw * 0.18) * k, (hand[1] - h * 0.02) * k)
  ctx.lineTo((hand[0] - cw * 0.18) * k, (hand[1] - h * 0.02) * k)
  ctx.closePath()
  ctx.fill()
}

function crowd(ctx: Ctx, k: number, f: Frame, t: number): void {
  // Two ranks: the far one smaller and deeper in the room's haze.
  const h = 0.3 * hush(t)
  for (const [d, haze, pick] of [[0.6, 0.34, 0], [0.74, 0.16, 1]] as const) {
    GUESTS.forEach((g, i) => {
      if (i % 2 !== pick) return
      const [x, y] = seen(f, d, g.x + (pick ? 0 : 1.3), FLOOR_Y)
      if (x < f.x0 - 2 || x > f.x1 + 2) return
      guest(ctx, k, x, y, g.h * d, g, t, mix(GALA.guests, GALA.roomLit, haze + h))
    })
  }
}

/* ------------------------------------------------------------------ the tower */

/** One coupe: a shallow bowl on a stem and a foot, glass, with champagne in it to `fill` (0..1). */
function coupe(ctx: Ctx, k: number, x: number, rim: number, fill: number, lit: number): void {
  const w = COUPE.w
  const bowl = COUPE.bowl
  const stemTop = rim + bowl
  const foot = rim + COUPE.h
  // The champagne first, inside the bowl.
  if (fill > 0.001) {
    const level = rim + bowl * (1 - fill)
    const half = (w / 2) * (0.35 + 0.65 * Math.sqrt(fill))
    ctx.beginPath()
    ctx.moveTo((x - half) * k, level * k)
    ctx.lineTo((x + half) * k, level * k)
    ctx.quadraticCurveTo((x + w * 0.3) * k, stemTop * k, x * k, stemTop * k)
    ctx.quadraticCurveTo((x - w * 0.3) * k, stemTop * k, (x - half) * k, level * k)
    ctx.closePath()
    ctx.fillStyle = rgba(mix(GALA.lightWarm, GALA.light, 0.3 * lit), 0.8 + 0.15 * lit)
    ctx.fill()
  }
  // The glass: the bowl's shape filled faintly, its rim a lit edge.
  ctx.beginPath()
  ctx.moveTo((x - w / 2) * k, rim * k)
  ctx.lineTo((x + w / 2) * k, rim * k)
  ctx.quadraticCurveTo((x + w * 0.32) * k, stemTop * k, x * k, stemTop * k)
  ctx.quadraticCurveTo((x - w * 0.32) * k, stemTop * k, (x - w / 2) * k, rim * k)
  ctx.closePath()
  ctx.fillStyle = rgba(GALA.glass, 0.16)
  ctx.fill()
  ctx.fillStyle = rgba(GALA.light, 0.6)
  ctx.fillRect((x - w / 2) * k, rim * k - 0.6, w * k, Math.max(1.2, 0.012 * k))
  // Stem and foot.
  ctx.fillStyle = rgba(GALA.glass, 0.5)
  ctx.fillRect(x * k - Math.max(0.6, 0.008 * k), stemTop * k, Math.max(1.2, 0.016 * k), (foot - stemTop) * k)
  ctx.fillRect((x - w * 0.26) * k, (foot - 0.012) * k, w * 0.52 * k, Math.max(1, 0.014 * k))
}

/** A thin fall of champagne from `a` to `b`, shimmering. */
function fall(ctx: Ctx, k: number, a: Pt, b: Pt, w: number, alpha: number, t: number, seed: number): void {
  if (alpha <= 0.01) return
  const n = 10
  ctx.beginPath()
  const L: Pt[] = []
  const R: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = a[0] + (b[0] - a[0]) * u * u + 0.006 * Math.sin(t * 23 + u * 9 + seed)
    const y = a[1] + (b[1] - a[1]) * u
    const ww = w * (1 - 0.35 * u)
    L.push([x - ww / 2, y])
    R.push([x + ww / 2, y])
  }
  ctx.moveTo(L[0][0] * k, L[0][1] * k)
  for (const q of L) ctx.lineTo(q[0] * k, q[1] * k)
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0] * k, R[i][1] * k)
  ctx.closePath()
  ctx.fillStyle = rgba(GALA.lightWarm, alpha)
  ctx.fill()
}

function tower(ctx: Ctx, k: number, t: number): void {
  // Each tier alight as it brims: a warm bloom behind it that flares and settles.
  for (let i = 0; i < TIERS; i++) {
    const on = smooth(t, BRIM[i] - 0.25, BRIM[i] + 0.15)
    if (on <= 0.01) continue
    const flare = Math.exp(-Math.max(0, t - BRIM[i]) / 0.7)
    const [, rim] = coupeAt(i, 0)
    const cy = rim + COUPE.bowl * 0.5
    const R = 0.5 + 0.28 * i + 0.25 * flare
    const g = ctx.createRadialGradient(TABLE.x * k, cy * k, 0, TABLE.x * k, cy * k, R * k)
    g.addColorStop(0, rgba(GALA.lightWarm, on * (0.1 + 0.16 * flare)))
    g.addColorStop(1, rgba(GALA.lightWarm, 0))
    ctx.fillStyle = g
    ctx.fillRect((TABLE.x - R) * k, (cy - R) * k, 2 * R * k, 2 * R * k)
  }
  // Its light on the polished floor under the table.
  const full = smooth(t, BRIM[0], BRIM[TIERS - 1] + 0.4)
  if (full > 0.01) {
    // A long soft pool, as on polished stone: an ellipse of light, no edges.
    ctx.save()
    ctx.translate(TABLE.x * k, (FLOOR_Y + 0.35) * k)
    ctx.scale(1, 0.32)
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.6 * k)
    rg.addColorStop(0, rgba(GALA.lightWarm, 0.2 * full))
    rg.addColorStop(1, rgba(GALA.lightWarm, 0))
    ctx.fillStyle = rg
    ctx.fillRect(-1.6 * k, -1.6 * k, 3.2 * k, 3.2 * k)
    ctx.restore()
  }
  // The round table: a cloth over its top, a dark pedestal and foot.
  const x0 = TABLE.x - TABLE.half
  const x1 = TABLE.x + TABLE.half
  const wood = mix(GALA.guests, GALA.roomLit, 0.35)
  ctx.fillStyle = wood
  ctx.fillRect((TABLE.x - 0.06) * k, TABLE.top * k, 0.12 * k, (FLOOR_Y - TABLE.top) * k)
  ctx.beginPath()
  ctx.moveTo((TABLE.x - 0.45) * k, FLOOR_Y * k)
  ctx.quadraticCurveTo(TABLE.x * k, (FLOOR_Y - 0.14) * k, (TABLE.x + 0.45) * k, FLOOR_Y * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = mix(GALA.cloth, GALA.roomLit, 0.45)
  ctx.beginPath()
  ctx.moveTo(x0 * k, TABLE.top * k)
  ctx.lineTo(x1 * k, TABLE.top * k)
  ctx.quadraticCurveTo((x1 + 0.04) * k, (TABLE.top + 0.18) * k, (x1 - 0.06) * k, (TABLE.top + 0.24) * k)
  ctx.lineTo((x0 + 0.06) * k, (TABLE.top + 0.24) * k)
  ctx.quadraticCurveTo((x0 - 0.04) * k, (TABLE.top + 0.18) * k, x0 * k, TABLE.top * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba(GALA.light, 0.18 + 0.2 * full)
  ctx.fillRect(x0 * k, TABLE.top * k, (x1 - x0) * k, Math.max(1, 0.03 * k))
  // The coupes, the bottom tier first; the falls between them where a tier above has brimmed and is running over.
  const flow = pourFlow(t)
  for (let i = TIERS - 1; i >= 0; i--) {
    const fill = tierFill(i, t)
    const brimmed = smooth(t, BRIM[i] - 0.12, BRIM[i] + 0.1)
    const lit = smooth(t, BRIM[i] - 0.15, BRIM[i] + 0.35) * (0.75 + 0.25 * Math.exp(-Math.max(0, t - BRIM[i]) / 0.8))
    for (let j = 0; j <= i; j++) {
      const [x, rim] = coupeAt(i, j)
      coupe(ctx, k, x, rim, fill, lit)
      // Running over its rim into the two below, while the pour keeps coming.
      if (i < TIERS - 1 && brimmed > 0.01) {
        const over = brimmed * flow * 0.55
        const [bx, brim] = coupeAt(i + 1, j)
        const [cx2] = coupeAt(i + 1, j + 1)
        fall(ctx, k, [x - COUPE.w / 2 + 0.01, rim], [bx + 0.05, brim + COUPE.bowl * 0.4], 0.018, over, t, i * 7 + j)
        fall(ctx, k, [x + COUPE.w / 2 - 0.01, rim], [cx2 - 0.05, brim + COUPE.bowl * 0.4], 0.018, over, t, i * 7 + j + 3)
      }
    }
  }
}

/* ------------------------------------------------------------------ the stand */

function stand(ctx: Ctx, k: number, t: number): void {
  const brass = mix(GALA.lightWarm, GALA.room, 0.45)
  const dark = mix(GALA.guests, GALA.roomLit, 0.3)
  // The post and its arm to the cradle.
  ctx.fillStyle = brass
  ctx.fillRect((POST.x - 0.025) * k, POST.top * k, 0.05 * k, (FLOOR_Y - POST.top) * k)
  ctx.fillRect((POST.x - 0.12) * k, (FLOOR_Y - 0.03) * k, 0.24 * k, 0.03 * k)
  ctx.fillRect(BOTTLE.c[0] * k, (POST.top - 0.02) * k, (POST.x - BOTTLE.c[0]) * k, 0.04 * k)
  // The pedal: a brass plate hinged at the post's foot, its free end raised, pressed flat under her.
  const lift = PEDAL.lift * (1 - pedalDown(t))
  ctx.save()
  ctx.translate(PEDAL.hinge * k, FLOOR_Y * k)
  ctx.rotate(-Math.atan2(lift, PEDAL.end - PEDAL.hinge))
  ctx.fillStyle = brass
  ctx.fillRect(0, -0.035 * k, (PEDAL.end - PEDAL.hinge) * k, 0.035 * k)
  ctx.restore()
  // The bottle in its cradle, turning about its middle: dark glass, a pale foil at its neck.
  const a = bottleAngle(t)
  ctx.save()
  ctx.translate(BOTTLE.c[0] * k, BOTTLE.c[1] * k)
  ctx.rotate(a)
  // Along -x is the neck.
  const L = BOTTLE.half
  ctx.beginPath()
  ctx.moveTo(-L * k, -0.03 * k)
  ctx.lineTo(-0.2 * k, -0.035 * k)
  ctx.quadraticCurveTo(-0.08 * k, -0.085 * k, 0.02 * k, -0.085 * k)
  ctx.lineTo(0.36 * k, -0.085 * k)
  ctx.quadraticCurveTo(0.4 * k, -0.085 * k, 0.4 * k, -0.045 * k)
  ctx.lineTo(0.4 * k, 0.045 * k)
  ctx.quadraticCurveTo(0.4 * k, 0.085 * k, 0.36 * k, 0.085 * k)
  ctx.lineTo(0.02 * k, 0.085 * k)
  ctx.quadraticCurveTo(-0.08 * k, 0.085 * k, -0.2 * k, 0.035 * k)
  ctx.lineTo(-L * k, 0.03 * k)
  ctx.closePath()
  ctx.fillStyle = dark
  ctx.fill()
  ctx.fillStyle = rgba(GALA.lightWarm, 0.28)
  ctx.fillRect(0.02 * k, -0.07 * k, 0.32 * k, 0.025 * k)
  ctx.fillStyle = mix(GALA.lightWarm, GALA.cloth, 0.4)
  ctx.fillRect(-L * k, -0.035 * k, 0.16 * k, 0.07 * k)
  // The cradle's band round it.
  ctx.fillStyle = brass
  ctx.fillRect(-0.03 * k, -0.1 * k, 0.06 * k, 0.2 * k)
  ctx.restore()
  // The pour: from the mouth down into the top coupe.
  const flow = pourFlow(t)
  if (flow > 0.01) {
    const m = mouthAt(t)
    const [, rim] = coupeAt(0, 0)
    const surface = rim + COUPE.bowl * (1 - tierFill(0, t))
    fall(ctx, k, m, [coupeAt(0, 0)[0], surface], 0.028, 0.85 * flow, t, 1)
  }
}

/** The gala's standing drawing, by show time. */
export function drawGala(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  p.push()
  p.noStroke()
  room(ctx, k, f, t)
  chandelier(ctx, k, f, -3.2, t, 1)
  chandelier(ctx, k, f, 5.4, t, 2)
  crowd(ctx, k, f, t)
  // The foreground floor's sheen, and the tower's light lying on it.
  const sheen = ctx.createLinearGradient(0, FLOOR_Y * k, 0, (FLOOR_Y + 1.5) * k)
  sheen.addColorStop(0, rgba(GALA.lightWarm, 0.1))
  sheen.addColorStop(1, rgba(GALA.lightWarm, 0))
  ctx.fillStyle = sheen
  ctx.fillRect((f.x0 - 1) * k, FLOOR_Y * k, (f.x1 - f.x0 + 2) * k, 1.5 * k)
  tower(ctx, k, t)
  stand(ctx, k, t)
  p.pop()
}
