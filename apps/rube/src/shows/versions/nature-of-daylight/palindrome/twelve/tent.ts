import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { R } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { frame, hash } from '../kit'
import { SHANG, TENT } from '../worlds'
import { CENTRE, drawRing, MONTANA } from './ring'
import { alarm, cablePulses, CALL_KEY, NUMBER, PRESSES, roomLight, voiceFlash, WAKE } from './timeline'

/**
 * The command tent at the camp, at night: canvas walls on a frame of poles, the ring on its rig, and before it a long
 * table with the sat phone on it. The only light is the screens': when they die, the tent goes dark with them.
 */

/** The table's top: a ball on it is at y = 0. */
const TOP = R
const FLOOR = 1.45
const TABLE: [number, number] = [-6.6, 7.4]

/* ------------------------------------------------------------------ the sat phone */

/**
 * The sat phone, on the table on Louise's right: the base patched into the rig by a cable up to Montana, its keys along
 * its top lit green once it wakes, the call key at the end; and its handset lying off the hook on the table beside it.
 */
const BASE: [number, number] = [0.26, 2.52]
const BASE_TOP = -0.18
/** Its digit keys and its call key, along its top (tent cells): each a little wider than she is, so it shows under her. */
export const KEYS = [0.5, 0.8, 1.1, 1.4, 1.7, 2.0]
export const CALL_X = 2.3
const KEY_W = 0.27
const CAP = 0.075
const SINK = 0.03
/** Where a ball sits on a pressed key. */
export const ON_KEY = BASE_TOP - CAP + SINK - R
/** The handset, lying on the table: its mouthpiece end and its earpiece end. */
const HANDSET: [number, number] = [2.7, 3.68]
/**
 * How long the hop onto press n takes (n = PRESSES.length is the call key), landing on the beat: a little longer, and
 * so a little higher, digit by digit as the music builds, and the call key the highest.
 */
export const hopFor = (n: number): number => (n >= PRESSES.length ? 0.54 : 0.36 + (0.12 * n) / (PRESSES.length - 1))

/** Which key (0..5 a digit, 6 the call key) Louise is on at show time t, or -1. */
export function keyUnder(t: number): number {
  if (t >= CALL_KEY) return 6
  for (let n = 0; n < PRESSES.length; n++) {
    const off = n + 1 < PRESSES.length ? PRESSES[n + 1] - hopFor(n + 1) : CALL_KEY - hopFor(PRESSES.length)
    if (t >= PRESSES[n] && t < off) return NUMBER[n]
  }
  return -1
}
/** How recently a key was struck: 1 at the press, decaying. */
function struck(t: number): number {
  let last = -Infinity
  for (const at of [...PRESSES, CALL_KEY]) if (at <= t) last = at
  return Math.exp(-(t - last) / 0.3)
}

/** The cable from the phone's base up to Montana's mount: a slack curve (start, bend, end). */
const CABLE: [Pt, Pt, Pt] = [[0.36, BASE_TOP + 0.03], [0.14, -0.8], [MONTANA[0], MONTANA[1] + 0.06]]
const cableAt = (u: number): Pt => {
  const [a, b, c] = CABLE
  const v = 1 - u
  return [v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1]]
}

/** A rounded rectangle's path, in pixels. */
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const q = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + q, y)
  ctx.lineTo(x + w - q, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + q)
  ctx.lineTo(x + w, y + h - q)
  ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h)
  ctx.lineTo(x + q, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - q)
  ctx.lineTo(x, y + q)
  ctx.quadraticCurveTo(x, y, x + q, y)
  ctx.closePath()
}

/** The handset lying on its back on the table, off the hook: a handle between the mouthpiece and the earpiece cups. */
function drawHandset(ctx: CanvasRenderingContext2D, k: number): void {
  const [a, b] = HANDSET
  const cup = 0.24
  const floor = TOP * k
  ctx.fillStyle = TENT.phone
  // The handle, bowed up between the cups.
  ctx.beginPath()
  ctx.moveTo((a + cup * 0.6) * k, floor - 0.13 * k)
  ctx.quadraticCurveTo(((a + b) / 2) * k, floor - 0.34 * k, (b - cup * 0.6) * k, floor - 0.13 * k)
  ctx.lineTo((b - cup * 0.6) * k, floor - 0.02 * k)
  ctx.quadraticCurveTo(((a + b) / 2) * k, floor - 0.22 * k, (a + cup * 0.6) * k, floor - 0.02 * k)
  ctx.closePath()
  ctx.fill()
  // The two cups, the earpiece a little bigger.
  rounded(ctx, a * k, floor - 0.17 * k, cup * k, 0.17 * k, 0.07 * k)
  ctx.fill()
  rounded(ctx, (b - cup * 1.1) * k, floor - 0.19 * k, cup * 1.1 * k, 0.19 * k, 0.08 * k)
  ctx.fill()
  ctx.fillStyle = rgba(TENT.canvasLit, 0.6)
  ctx.fillRect((a + 0.03) * k, floor - 0.17 * k, (cup - 0.06) * k, Math.max(1, 0.02 * k))
  ctx.fillRect((b - cup * 1.1 + 0.03) * k, floor - 0.19 * k, (cup * 1.1 - 0.06) * k, Math.max(1, 0.02 * k))
  // Its cord, slack along the table back to the base.
  ctx.strokeStyle = TENT.phone
  ctx.lineWidth = Math.max(1, 0.03 * k)
  ctx.beginPath()
  ctx.moveTo((a + 0.03) * k, floor - 0.06 * k)
  ctx.quadraticCurveTo((a - 0.1) * k, floor - 0.01 * k, (BASE[1] - 0.02) * k, floor - 0.08 * k)
  ctx.stroke()
}

function drawPhone(ctx: CanvasRenderingContext2D, k: number, t: number): void {
  const awake = t < WAKE ? 0 : Math.min(1, (t - WAKE) / 0.35)
  const calling = t < CALL_KEY ? 0 : Math.min(1, (t - CALL_KEY) / 0.2)
  // The cable, live once the call is through, and the call and her words going up it.
  ctx.strokeStyle = TENT.cable
  ctx.lineWidth = Math.max(1, 0.035 * k)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let n = 0; n <= 30; n++) {
    const [x, y] = cableAt(n / 30)
    if (n === 0) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  ctx.stroke()
  if (calling > 0) {
    ctx.strokeStyle = rgba(TENT.signal, 0.45 * calling)
    ctx.lineWidth = Math.max(1, 0.02 * k)
    ctx.stroke()
  }
  for (const { u: pulse, a } of cablePulses(t)) {
    for (let n = 0; n < 6; n++) {
      const [x0, y0] = cableAt(Math.max(0, pulse - n * 0.035))
      const [x1, y1] = cableAt(Math.max(0, pulse - (n + 1) * 0.035))
      ctx.strokeStyle = rgba(TENT.screenOn, 0.95 * a * (1 - n / 6))
      ctx.lineWidth = Math.max(1.5, 0.07 * k)
      ctx.beginPath()
      ctx.moveTo(x0 * k, y0 * k)
      ctx.lineTo(x1 * k, y1 * k)
      ctx.stroke()
    }
  }
  ctx.lineCap = 'butt'
  drawHandset(ctx, k)
  // The base: a squat dark box, a hair of light along its top.
  const x0 = BASE[0] * k
  const x1 = BASE[1] * k
  const y0 = BASE_TOP * k
  const y1 = TOP * k
  rounded(ctx, x0, y0, x1 - x0, y1 - y0, 0.07 * k)
  ctx.fillStyle = TENT.phone
  ctx.fill()
  ctx.fillStyle = rgba(TENT.canvasLit, 0.7)
  ctx.fillRect(x0 + 0.06 * k, y0, x1 - x0 - 0.12 * k, Math.max(1, 0.02 * k))
  // Its display, a slit of green light along its face: waking, flashing with each key, bright once through, and
  // brightening with each word she says.
  if (awake > 0) {
    const lit = Math.min(1, 0.35 + 0.5 * struck(t) * (calling > 0 ? 0 : 1) + 0.4 * calling + 0.25 * voiceFlash(t))
    ctx.fillStyle = rgba(TENT.keypad, awake * lit)
    ctx.fillRect(x0 + 0.2 * k, (BASE_TOP + 0.13) * k, 0.9 * k, Math.max(1, 0.045 * k))
  }
  // Its keys: caps along its top, lit green from under once it wakes, the one she is on pressed down and bright.
  const under = keyUnder(t)
  const hit = struck(t)
  if (awake > 0) {
    // The keypad's backlight, spilling up off the whole row: one low soft band.
    const g = ctx.createLinearGradient(0, (BASE_TOP - CAP) * k, 0, (BASE_TOP - CAP - 0.16) * k)
    g.addColorStop(0, rgba(TENT.keypad, awake * (0.16 + 0.12 * hit + 0.1 * calling)))
    g.addColorStop(1, rgba(TENT.keypad, 0))
    ctx.fillStyle = g
    ctx.save()
    ctx.filter = `blur(${Math.max(1, 0.04 * k).toFixed(1)}px)`
    ctx.fillRect((KEYS[0] - 0.16) * k, (BASE_TOP - CAP - 0.16) * k, (CALL_X - KEYS[0] + 0.32) * k, 0.16 * k)
    ctx.restore()
  }
  const key = (x: number, w: number, n: number) => {
    const down = n === under ? SINK : 0
    if (n === under && awake > 0) {
      // Struck, it throws its light up round her: a low band, never a round glow.
      const g = ctx.createLinearGradient(0, (BASE_TOP - CAP + down) * k, 0, (BASE_TOP - CAP - 0.3) * k)
      g.addColorStop(0, rgba(TENT.keypad, awake * (0.3 + 0.45 * hit)))
      g.addColorStop(1, rgba(TENT.keypad, 0))
      ctx.fillStyle = g
      // Soft at its sides as well as its top: with square sides it stood round her as a lit box.
      ctx.save()
      ctx.filter = `blur(${Math.max(1, 0.05 * k).toFixed(1)}px)`
      ctx.fillRect((x - w / 2 - 0.02) * k, (BASE_TOP - CAP - 0.3) * k, (w + 0.04) * k, (0.3 + down) * k)
      ctx.restore()
    }
    const top = (BASE_TOP - CAP + down) * k
    const h = (CAP - down) * k + 1
    const lit = awake * (n === under ? 0.85 + 0.15 * hit : n === 6 ? 0.5 + 0.5 * calling : 0.4)
    ctx.fillStyle = mix(mix(TENT.phone, TENT.canvasLit, 0.4), TENT.keypad, lit)
    ctx.fillRect((x - w / 2) * k, top, w * k, h)
    ctx.fillStyle = rgba(TENT.phone, 0.6)
    ctx.fillRect((x - w / 2) * k, top + h * 0.55, w * k, h * 0.45)
  }
  KEYS.forEach((x, n) => key(x, KEY_W, n))
  key(CALL_X, KEY_W + 0.04, 6)
}

/* ------------------------------------------------------------------ the tent */

/** The tent's door, at the far left beyond the table, and the alarm lamp over it. */
const DOOR: [number, number] = [-8.75, -7.3]
const DOOR_TOP = -1.95
const LAMP: Pt = [-8.02, -2.55]

function drawDoor(ctx: CanvasRenderingContext2D, k: number, L: number): void {
  const [x0, x1] = DOOR
  // The opening: the dark of the night outside, a flap of canvas tied back across part of it.
  ctx.fillStyle = TENT.cable
  ctx.fillRect(x0 * k, DOOR_TOP * k, (x1 - x0) * k, (FLOOR - DOOR_TOP) * k)
  ctx.fillStyle = mix(TENT.cable, TENT.canvas, 0.5 + 0.4 * L)
  ctx.beginPath()
  ctx.moveTo(x1 * k, DOOR_TOP * k)
  ctx.lineTo(x1 * k, FLOOR * k)
  ctx.lineTo((x1 - 0.3) * k, FLOOR * k)
  ctx.quadraticCurveTo((x1 - 0.2) * k, 0.2 * k, (x1 - 0.55) * k, DOOR_TOP * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = TENT.frame
  for (const x of [x0, x1]) ctx.fillRect((x - 0.06) * k, (DOOR_TOP - 0.1) * k, 0.12 * k, (FLOOR - DOOR_TOP + 0.1) * k)
  ctx.fillRect((x0 - 0.06) * k, (DOOR_TOP - 0.1) * k, (x1 - x0 + 0.12) * k, 0.1 * k)
}

/** The alarm lamp over the door: a caged red lamp on a bracket, and the red it throws over the tent as it pulses. */
function drawAlarm(ctx: CanvasRenderingContext2D, k: number, t: number, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const a = alarm(t)
  const [lx, ly] = LAMP
  if (a > 0.01) {
    // Its red over the whole tent, strongest round the door.
    ctx.fillStyle = rgba(SHANG, 0.07 * a)
    ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    const g = ctx.createRadialGradient(lx * k, ly * k, 0.2 * k, lx * k, ly * k, 7 * k)
    g.addColorStop(0, rgba(SHANG, 0.42 * a))
    g.addColorStop(0.25, rgba(SHANG, 0.16 * a))
    g.addColorStop(1, rgba(SHANG, 0))
    ctx.fillStyle = g
    ctx.fillRect((lx - 7) * k, (ly - 7) * k, 14 * k, 14 * k)
  }
  // The bracket, the housing, the lens behind its cage.
  ctx.fillStyle = TENT.frame
  ctx.fillRect((lx - 0.03) * k, (ly + 0.08) * k, 0.06 * k, (DOOR_TOP - 0.1 - ly - 0.08) * k)
  ctx.fillStyle = TENT.cable
  ctx.fillRect((lx - 0.36) * k, (ly - 0.21) * k, 0.72 * k, 0.42 * k)
  ctx.fillStyle = a > 0.01 ? mix(mix(TENT.frame, SHANG, 0.5), mix(SHANG, TENT.screenOn, 0.3), a) : mix(TENT.frame, SHANG, 0.35)
  ctx.fillRect((lx - 0.29) * k, (ly - 0.15) * k, 0.58 * k, 0.3 * k)
  ctx.fillStyle = TENT.cable
  for (const dx of [-0.15, 0, 0.15]) ctx.fillRect((lx + dx - 0.02) * k, (ly - 0.15) * k, 0.04 * k, 0.3 * k)
}

/** Where the canvas's folds fall: uneven, a cell or two apart. */
const FOLDS: number[] = (() => {
  const out = [-30]
  for (let n = 0; n < 49; n++) out.push(out[n] + 0.9 + 1.0 * hash(n, 7))
  return out
})()

function drawTent(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const L = roomLight(t)
  ctx.save()
  // The canvas: near black when the screens are dark, the screens' cold light on it when they are lit.
  const wall = ctx.createLinearGradient(0, (CENTRE[1] - 9) * k, 0, FLOOR * k)
  wall.addColorStop(0, mix(TENT.cable, TENT.canvas, 0.25 + 0.4 * L))
  wall.addColorStop(1, mix(TENT.cable, TENT.canvas, 0.45 + 0.55 * L))
  ctx.fillStyle = wall
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  const glow = ctx.createRadialGradient(CENTRE[0] * k, CENTRE[1] * k, 0, CENTRE[0] * k, CENTRE[1] * k, 9.5 * k)
  glow.addColorStop(0, rgba(TENT.screenGlow, 0.05 + 0.12 * L))
  glow.addColorStop(0.55, rgba(TENT.screenGlow, 0.03 + 0.07 * L))
  glow.addColorStop(1, rgba(TENT.screenGlow, 0))
  ctx.fillStyle = glow
  ctx.fillRect((CENTRE[0] - 10) * k, (CENTRE[1] - 10) * k, 20 * k, 20 * k)
  // The canvas hangs in long soft folds between the poles, their ridges catching the screens' light.
  for (let n = -24; n < 24; n++) {
    const x = FOLDS[n + 24]
    const w = FOLDS[n + 25] - x
    if (x + w < f.x0 - 1 || x > f.x1 + 1) continue
    const fold = ctx.createLinearGradient(x * k, 0, (x + w) * k, 0)
    fold.addColorStop(0, rgba(TENT.cable, 0.12))
    fold.addColorStop(0.3 + 0.3 * hash(n, 3), rgba(TENT.canvasLit, (0.04 + 0.1 * L) * (0.6 + 0.6 * hash(n, 4))))
    fold.addColorStop(1, rgba(TENT.cable, 0.12))
    ctx.fillStyle = fold
    ctx.fillRect(x * k, (f.y0 - 1) * k, w * k, (FLOOR - f.y0 + 1) * k)
  }
  // The frame of the tent: two poles and the beam the rig hangs from, and the canvas's seams between them.
  ctx.fillStyle = rgba(TENT.frame, 0.35)
  for (const x of [-6.2, -3.1, 3.7, 6.8]) ctx.fillRect(x * k, (f.y0 - 1) * k, Math.max(1, 0.03 * k), (FLOOR - f.y0 + 1) * k)
  ctx.fillStyle = TENT.frame
  for (const x of [-9.3, 9.9]) ctx.fillRect((x - 0.13) * k, (f.y0 - 1) * k, 0.26 * k, (FLOOR - f.y0 + 1) * k)
  ctx.fillRect(-9.4 * k, -11.7 * k, 19.4 * k, 0.24 * k)
  drawDoor(ctx, k, L)
  // The floor.
  ctx.fillStyle = TENT.floor
  ctx.fillRect((f.x0 - 1) * k, FLOOR * k, (f.x1 - f.x0 + 2) * k, (f.y1 - FLOOR + 2) * k)
  ctx.fillStyle = rgba(TENT.cable, 0.6)
  ctx.fillRect((f.x0 - 1) * k, FLOOR * k, (f.x1 - f.x0 + 2) * k, 0.05 * k)
  drawAlarm(ctx, k, t, f)
  ctx.restore()

  drawRing(p, k, t)

  ctx.save()
  // The table: a long dark top, its near edge catching the screens' light, on trestle legs.
  ctx.fillStyle = TENT.frame
  for (const x of [TABLE[0] + 0.4, -0.8 - 1.9, 4.2, TABLE[1] - 0.4]) ctx.fillRect((x - 0.07) * k, (TOP + 0.18) * k, 0.14 * k, (FLOOR - TOP - 0.18) * k)
  ctx.fillStyle = TENT.desk
  ctx.fillRect(TABLE[0] * k, TOP * k, (TABLE[1] - TABLE[0]) * k, 0.2 * k)
  // The ring's light on the table's top edge, brightest under it.
  const sheen = ctx.createLinearGradient(TABLE[0] * k, 0, TABLE[1] * k, 0)
  const mid = (CENTRE[0] - TABLE[0]) / (TABLE[1] - TABLE[0])
  sheen.addColorStop(0, rgba(mix(TENT.desk, TENT.screenOn, 0.5), 0.2 + 0.2 * L))
  sheen.addColorStop(Math.max(0, mid - 0.3), rgba(mix(TENT.desk, TENT.screenOn, 0.5), 0.3 + 0.3 * L))
  sheen.addColorStop(mid, rgba(TENT.screenOn, 0.35 + 0.6 * L))
  sheen.addColorStop(Math.min(1, mid + 0.3), rgba(mix(TENT.desk, TENT.screenOn, 0.5), 0.3 + 0.3 * L))
  sheen.addColorStop(1, rgba(mix(TENT.desk, TENT.screenOn, 0.5), 0.2 + 0.2 * L))
  ctx.fillStyle = sheen
  ctx.fillRect(TABLE[0] * k, TOP * k, (TABLE[1] - TABLE[0]) * k, Math.max(1, 0.035 * k))
  ctx.fillStyle = rgba(TENT.cable, 0.5)
  ctx.fillRect(TABLE[0] * k, (TOP + 0.17) * k, (TABLE[1] - TABLE[0]) * k, 0.03 * k)
  drawPhone(ctx, k, t)
  ctx.restore()
}

export function tentDraw(p: p5, k: number, t: number): void {
  drawTent(p, k, t)
}
