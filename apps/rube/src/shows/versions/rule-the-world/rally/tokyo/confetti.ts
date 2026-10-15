import type { Pt } from '../../../../../parts'
import { parallax, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { WIN } from '../music'
import { ctxOf, type Pen } from '../pen'
import { events, Fills, toned } from './batch'
import { rowDepth } from './crowd'
import { FLOOR, LAMP, LIGHTS_DOWN, TOP, TURN, XL, XR } from './geo'
import { ANCHOR, house } from './mood'
import { C } from './palette'

/**
 * The paper of the eruption: confetti thrown up out of the stands on the winner and falling back into them; confetti
 * let go from the roof, a cloud of it on the winner and then a slow fall that never quite stops through the quiet,
 * gold, white and red, turning as it comes down through the lamp's cone and lying on the floor once it is down; and
 * the streamers thrown down from the stands.
 */

const COLORS = [C.gold, C.paper, C.redHi, C.goldHi, C.paper, C.red]
/** Its light: the house's, or the lamp's where it is under it. */
function light(x: number, y: number, lights: number): number {
  const top = LAMP[1] + 0.22
  let cone = 0
  if (y > top && y < TOP + 1.3) {
    const u = Math.min(1, (y - top) / (TOP - top))
    const hw = 0.3 + u * ((XR - XL) / 2 + 0.3)
    cone = Math.max(0, 1 - Math.abs(x - LAMP[0]) / hw)
  }
  return Math.min(1, 0.12 + 0.78 * lights + 0.75 * cone)
}

/** One turning piece into its colour's path: a little card flipping as it falls, darker as it turns edge-on. */
function piece(pen: Pen, fills: Fills, x: number, y: number, size: number, spin: number, tilt: number, base: string, f: number): void {
  const { k } = pen
  const face = Math.abs(Math.cos(spin))
  const cw = Math.max(0.15, face) * size
  const chh = size * 0.6
  const col = toned(pen, base, f * (0.7 + 0.3 * face))
  const ca = Math.cos(tilt)
  const sa = Math.sin(tilt)
  const p = fills.at(col)
  p.moveTo((x - cw * ca + chh * sa) * k, (y - cw * sa - chh * ca) * k)
  p.lineTo((x + cw * ca + chh * sa) * k, (y + cw * sa - chh * ca) * k)
  p.lineTo((x + cw * ca - chh * sa) * k, (y + cw * sa + chh * ca) * k)
  p.lineTo((x - cw * ca - chh * sa) * k, (y - cw * sa + chh * ca) * k)
  p.closePath()
}

/** Under linear drag: thrown at `v0` (cells a second, up positive), settling to a fall of `vt`; how far down at `u`. */
const fall = (u: number, v0: number, vt: number, tau: number): number => vt * u - (v0 + vt) * tau * (1 - Math.exp(-u / tau))

const THROWN = 150

/** Confetti thrown up out of the lower tier on the winner, in waves on its beats, falling back among them. */
export function drawThrown(pen: Pen, t: number, f: Frame): void {
  if (t < WIN || t > WIN + 9) return
  const fills = new Fills()
  const lights = house(t)
  for (let i = 0; i < THROWN; i++) {
    const t0 = WIN + 0.03 + [0, 0.54, 1.07, 1.6][Math.floor(hash(i, 111) * 4)] + 0.08 * hash(i, 112)
    const u = t - t0
    if (u < 0) continue
    const r = Math.floor(hash(i, 114) * 6)
    const [dx, dy] = parallax(f, rowDepth(r), ANCHOR)
    const x0 = -9 + 21 * hash(i, 113)
    const y0 = 0.3 - r * 0.56 - 0.75
    const y = y0 + fall(u, 3.2 + 2.6 * hash(i, 115), 0.45 + 0.4 * hash(i, 116), 0.35)
    if (y > y0 + 0.7) continue
    const x = x0 + (hash(i, 117) - 0.5) * 1.3 * (1 - Math.exp(-u / 0.6)) + 0.18 * Math.sin(u * (2 + 2 * hash(i, 118)) + i) + dx
    const Y = y + dy
    if (x < f.x0 - 0.2 || x > f.x1 + 0.2 || Y < f.y0 - 0.2 || Y > f.y1 + 0.2) continue
    piece(pen, fills, x, Y, 0.055, u * (5 + 6 * hash(i, 119)) + i, hash(i, 120) * Math.PI, COLORS[i % COLORS.length], light(x, Y, lights))
  }
  const ctx = ctxOf(pen.p)
  ctx.save()
  fills.fill(ctx)
  ctx.restore()
}

/** How much paper is let go from the roof a second: a cloud on the winner, and then it never quite stops. */
function dropRate(t: number): number {
  if (t < WIN + 0.2) return 0
  if (t < WIN + 2.4) return 70
  if (t < TURN + 2) return 22
  return 13 - 5 * smooth(t, LIGHTS_DOWN[0], LIGHTS_DOWN[3] + 1)
}
const DROP_LIFE = 20

/**
 * Confetti from the roof over the court: thrown down hard from the truss, slowing to a flutter, turning through the
 * light, and lying on the floor once it comes down (going dark there over a few seconds).
 */
export function drawDropped(pen: Pen, t: number, f: Frame): void {
  if (t < WIN + 0.2) return
  const fills = new Fills()
  const lying = new Fills()
  const lights = house(t)
  const { k } = pen
  events(t, 131, 0.1, 10, DROP_LIFE, dropRate, (u, id) => {
    const x0 = -9 + 21 * hash(id, 132)
    const y0 = -6.8 + 1.8 * hash(id, 133)
    const vt = 0.55 + 0.4 * hash(id, 134)
    const land = FLOOR - 0.5 + 0.55 * hash(id, 135)
    const v0 = -2.4 - 1.2 * hash(id, 136)
    // When it comes down (long after the throw has died away, so the fall is steady by then).
    const tl = (land - y0 + (v0 + vt) * 0.7) / vt
    const xAt = (s: number) => x0 + (hash(id, 137) - 0.5) * 0.12 * s + 0.22 * Math.sin(s * (1.6 + 1.4 * hash(id, 139)) + id)
    if (u >= tl) {
      // On the floor: where it came down, going dark.
      const lx = xAt(tl)
      const age = u - tl
      if (age > 7 || lx < f.x0 - 0.2 || lx > f.x1 + 0.2 || land < f.y0 || land > f.y1) return
      const fl = light(lx, land, lights) * (1 - age / 7) * 0.8
      const w = 0.05 * (0.4 + 0.6 * hash(id, 138))
      lying.at(toned(pen, COLORS[id % COLORS.length], fl)).rect((lx - w) * k, (land - 0.012) * k, 2 * w * k, 0.024 * k)
      return
    }
    const y = y0 + fall(u, v0, vt, 0.7)
    const x = xAt(u)
    if (x < f.x0 - 0.2 || x > f.x1 + 0.2 || y < f.y0 - 0.2 || y > f.y1 + 0.2) return
    const spin = u * (4 + 7 * hash(id, 140)) + id
    piece(pen, fills, x, y, 0.07, spin, hash(id, 141) * Math.PI + 0.5 * Math.sin(spin * 0.4), COLORS[id % COLORS.length], light(x, y, lights))
  })
  const ctx = ctxOf(pen.p)
  ctx.save()
  lying.fill(ctx)
  fills.fill(ctx)
  ctx.restore()
}

/* ------------------------------------------------------------------ the streamers */

const STREAMERS = 40
const STREAMER_COLORS = [C.red, C.white, C.gold, C.redHi, C.white]

/** Streamers, red, white and gold, thrown down from the stands at the smash; they lie on the floor after. */
export function drawStreamers(pen: Pen, t: number): void {
  if (t < WIN) return
  const g = 2.4
  const fade = 1 - smooth(t, LIGHTS_DOWN[0], LIGHTS_DOWN[3] + 0.5) * 0.7
  const strokes = new Fills()
  const { k } = pen
  for (let i = 0; i < STREAMERS; i++) {
    const t0 = WIN + 0.05 + (i % 10) * 0.24 + hash(i, 41) * 0.15
    if (t < t0) continue
    const p0: Pt = [-3 + 13 * hash(i, 42), -3.4 + 2.6 * hash(i, 43)]
    const v: Pt = [(hash(i, 44) - 0.5) * 2.4, -2.2 - 1.6 * hash(i, 45)]
    const land = 0.75 + 0.65 * hash(i, 46)
    const posAt = (u: number): Pt => {
      const yy = p0[1] + v[1] * u + 0.5 * g * u * u
      return [p0[0] + v[0] * u * Math.exp(-u * 0.5), Math.min(yy, land)]
    }
    const u = t - t0
    // When it comes down it lies along the floor where it fell.
    const uLand = (-v[1] + Math.sqrt(v[1] * v[1] + 2 * g * (land - p0[1]))) / g
    const down = posAt(uLand)
    const side = hash(i, 47) > 0.5 ? 1 : -1
    const settle = smooth(u, uLand, uLand + 0.4)
    const p = strokes.at(toned(pen, STREAMER_COLORS[i % STREAMER_COLORS.length], 0.85 * fade))
    for (let j = 0; j < 14; j++) {
      let x: number
      let y: number
      if (u > uLand + 0.4) {
        x = down[0] + side * (j - 7) * 0.07 + Math.sin(j * 1.3 + i) * 0.04
        y = land + Math.sin(j * 0.8 + i) * 0.03
      } else {
        const s = Math.max(0, u - j * 0.06)
        const [px, py] = posAt(s)
        const w = Math.sin(s * 9 + j * 0.9 + i) * 0.1
        const flat: Pt = [down[0] + side * (j - 7) * 0.07, land]
        x = px + w + (flat[0] - px - w) * settle
        y = py - j * 0.015 + (flat[1] - py + j * 0.015) * settle
      }
      if (j) p.lineTo(x * k, y * k)
      else p.moveTo(x * k, y * k)
    }
  }
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  strokes.stroke(ctx, pen.w * 1.1)
  ctx.restore()
}
