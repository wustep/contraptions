import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { DECK_LAMP_LENS, drawDeck } from '../cast'
import { alpha, frame, hash, type Ctx } from '../kit'
import { level, pulse } from '../music'
import { SHELL, VALLEY } from '../worlds'
import {
  DECK,
  deckX,
  gravity,
  ianAt,
  louiseAt,
  PRESS,
  REST,
  RIBS,
  ribRise,
  SWITCH_U,
  T0,
  T_KNOCK,
  T_ON,
  T_SWITCH,
  THROAT,
  TOUCHES,
  TURN_FOR,
  X_END,
  X_LIP,
  Y_C,
  Y_F,
} from './shaft-path'
import { TURN } from '../music'

/**
 * The shaft's drawings (the shaft builder's). Everything is in the shaft part's frame, in shell cells; the camera's
 * roll turns it all on the screen. Side on, the shaft is a section through dark stone: the cut stone round it, the
 * far wall seen between its two faces, low ribs across it like rings. Three lights and nothing else: the daylight
 * coming up the throat from the valley below, the deck's floodlight once she switches it on, and the white at the
 * far end, growing. Dust hangs in the air and falls the way gravity does.
 */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const sm = (t: number, a: number, b: number) => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * The stone round the shaft (the shell's own), the floor's stone (the same as the chamber's floor, which it runs on
 * into), and the air in the hollow (the same dark as the chamber's room, so the shaft and the room are one place).
 */
const STONE = mixHex(SHELL.wall, SHELL.dark, 0.22)
const FLOOR_STONE = SHELL.floor
const AIR = mixHex(SHELL.dark, SHELL.wall, 0.3)
/** Where light meets the stone: a soft lit lip that fades into it. */
const LIP = rgb(mixHex(SHELL.wallLit, SHELL.glowWarm, 0.4))
/**
 * The lift and its deck in the dark: dark steel silhouettes against the throat's daylight and the beam, their only
 * light a thin edge on the side toward the daylight below them.
 */
const RIG_INK = SHELL.dark
const STEEL = mixHex(VALLEY.steel, SHELL.dark, 0.7)
const STEEL_DARK = mixHex(VALLEY.steelDark, SHELL.dark, 0.62)
const ARM_NEAR = mixHex(VALLEY.olive, SHELL.dark, 0.72)
const ARM_FAR = mixHex(VALLEY.olive, SHELL.dark, 0.86)
/** How much of the throat's daylight reaches a point of the rig, from its depth below the deck's plate (deck-local y). */
const rigLit = (y: number) => clamp01(0.3 + 0.28 * (y - 0.3))
const DAY = VALLEY.fog
const WARM = SHELL.glowWarm

/* ------------------------------------------------------------------ the lights */

/** The floodlight: off, a stutter on her touch, catching on the next pulse; it goes down with the deck. */
export function floodOn(t: number): number {
  if (t < T_SWITCH) return 0
  if (t < T_ON) {
    const s = t - T_SWITCH
    // A stutter: a flash that dies, a weaker one, dark.
    return 0.5 * Math.exp(-s / 0.045) + 0.22 * Math.exp(-Math.max(0, s - 0.11) / 0.03) * (s > 0.11 ? 1 : 0)
  }
  const s = t - T_ON
  // The knock on its bracket jolts it: a blink.
  const jolt = t >= T_KNOCK ? 1 - 0.3 * Math.exp(-(t - T_KNOCK) / 0.06) : 1
  return Math.min(1, 0.35 + s / 0.06) * (1 + 0.1 * Math.exp(-s / 0.25)) * jolt
}
/**
 * The lamp's lean on its yoke, radians toward the deck's near end. Balanced leaning a little up the shaft's middle in
 * Earth's pull; as gravity turns it tips toward the new floor and knocks on its bracket's stop on T_KNOCK, rebounding,
 * damped, and settles there. The beam goes with it.
 */
export function lampTilt(t: number): number {
  const t0 = TURN + 0.2
  if (t <= t0) return 0.12
  if (t < T_KNOCK) {
    const u = (t - t0) / (T_KNOCK - t0)
    return 0.12 - 0.16 * u * u
  }
  const s = t - T_KNOCK
  return -0.04 + 0.03 * Math.abs(Math.sin((Math.PI * s) / 0.19)) * Math.exp(-s / 0.22)
}
/** The flood's lens (its centre) and the direction it throws, in the part's frame, at `t`. */
export function floodLens(t: number): { at: Pt; dir: Pt } {
  const a = -lampTilt(t)
  return { at: [deckX(t) + DECK_LAMP_LENS.up, DECK[1] - DECK_LAMP_LENS.back], dir: [Math.cos(a), Math.sin(a)] }
}
const BEAM_HALF = 0.3
const BEAM_LEN = 17
/** The lift's top stage's height at the cut (the valley side's, measured): it opens on as the deck rises. */
const TOP_STAGE = 1.28

/** The mist at the far end, lit: faint in the mouth, growing along the shaft as they come to it. */
export function farGlow(t: number): number {
  const grow = 0.2 + 0.6 * sm(t, 72.5, 84.6)
  // As she comes to the threshold the mist's light sinks to the dim room's (the glass is dim until it wakes).
  const sink = 1 - 0.55 * sm(t, 85.1, 86.4)
  return grow * sink * (0.92 + 0.12 * level(t))
}
/** The chamber's glass seen from the opening: dim, then waking in two steps (pulses 365 and 366). */
const WAKE0 = pulse(365)
const WAKE1 = pulse(366)
export const chamberLight = (t: number): number => 0.12 + 0.3 * sm(t, WAKE0, WAKE0 + 0.12) + 0.5 * sm(t, WAKE1, WAKE1 + 0.3)

/** The light from the mouth's side: the daylight up the throat, and the flood. */
function mouthLight(x: number, y: number, t: number): number {
  let l = 0
  if (x < X_LIP) l += y > THROAT[0] && y < THROAT[1] ? 0.35 + 0.35 * clamp01((X_LIP - x) / 3) : 0.12 * clamp01((X_LIP - x) / 3)
  else l += 0.3 * Math.exp(-(x - X_LIP) / 1.2) * (0.5 + 0.5 * Math.exp(-(((y - 0.4) / 2.2) ** 2)))
  const f = floodOn(t)
  if (f > 0.01) {
    const { at, dir } = floodLens(t)
    const dx = x - at[0]
    const dy = y - at[1]
    const d = dx * dir[0] + dy * dir[1]
    if (d > 0) {
      const r = Math.abs(-dx * dir[1] + dy * dir[0])
      const w = d * Math.tan(BEAM_HALF * 0.55) + 0.08
      l += f * clamp01(1.3 - r / w) * (1 / (1 + d / 4.5))
      // Its spill: the shaft round the lamp is lit a little whichever way.
      l += (f * 0.22) / (1 + (d * d + r * r) / 6)
    }
  }
  return l
}
/** The light from the far end: the mist there, lit; nothing at the opening itself (the room beyond is dark). */
const MIST_C = X_END - 2.3
function farLight(x: number, t: number): number {
  if (x > X_END) return 0
  const bell = x > MIST_C ? Math.exp(-(((x - MIST_C) / 1.5) ** 2)) : Math.exp(-(MIST_C - x) / 3.2)
  return farGlow(t) * bell * clamp01((X_END - x) / 1.1)
}
/** How lit a point is (0 dark .. about 1): for the dust, the lips, the ribs. */
export function lightAt(x: number, y: number, t: number, farShare = 1): number {
  return 0.03 + mouthLight(x, y, t) + farShare * farLight(x, t)
}

/* ------------------------------------------------------------------ the hollow */

/** The rounded lip where the shaft's ceiling turns up into the chamber's wall. */
const LIP_R = 0.9
/** The floor's face and the ceiling's, over the ribs; the ceiling rounding up into the opening at the end. */
export const floorY = (x: number): number => Y_F - ribRise(x)
export function ceilY(x: number): number {
  let y = Y_C + ribRise(x) * 0.8
  const c = X_END - LIP_R
  if (x > c) {
    const u = Math.min(LIP_R, x - c)
    y -= LIP_R - Math.sqrt(LIP_R * LIP_R - u * u)
  }
  return y
}
const slope = (fn: (x: number) => number, x: number) => (fn(x + 0.02) - fn(x - 0.02)) / 0.04

/** A soft lobe of light or air: dense in the middle, nothing at its edge. */
function lobe(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, hex: string, a: number): void {
  if (a <= 0.004 || rx <= 0.003) return
  const c = rgb(hex)
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, `rgba(${c}, ${a})`)
  g.addColorStop(0.5, `rgba(${c}, ${a * 0.62})`)
  g.addColorStop(1, `rgba(${c}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** The hollow: the shaft between its faces, and the throat below the lip (as far down as the frame goes). */
function tunnelPath(ctx: CanvasRenderingContext2D, k: number, xa: number, xb: number, throat = true): void {
  const x0 = Math.max(X_LIP, xa)
  const x1 = Math.min(X_END, xb)
  ctx.beginPath()
  if (x1 > x0) {
    const step = 0.06
    ctx.moveTo(x0 * k, ceilY(x0) * k)
    for (let x = x0; x <= x1; x += step) ctx.lineTo(x * k, ceilY(x) * k)
    ctx.lineTo(x1 * k, ceilY(x1) * k)
    ctx.lineTo(x1 * k, floorY(x1) * k)
    for (let x = x1; x >= x0; x -= step) ctx.lineTo(x * k, floorY(x) * k)
    ctx.lineTo(x0 * k, floorY(x0) * k)
    ctx.closePath()
  }
  if (throat && xa < X_LIP) ctx.rect((xa - 1) * k, THROAT[0] * k, (X_LIP + 0.01 - xa + 1) * k, (THROAT[1] - THROAT[0]) * k)
}

/**
 * A lit lip along a face that runs along x: bands laid into the stone from the face (`into` +1 down, -1 up), each a
 * little deeper and fainter, lit along their length by `light`. No line: the light fades into the stone.
 */
function lipX(ctx: CanvasRenderingContext2D, k: number, xa: number, xb: number, face: (x: number) => number, into: number, depth: number, light: (x: number) => number): void {
  if (xb - xa < 0.05) return
  const step = Math.max(0.1, (xb - xa) / 110)
  const xs: number[] = []
  for (let x = xa; x < xb; x += step) xs.push(x)
  xs.push(xb)
  const ls = xs.map((x) => clamp01(light(x)))
  if (Math.max(...ls) < 0.02) return
  const layers = [1, 0.7, 0.46, 0.28, 0.15, 0.07]
  for (const d of layers) {
    const g = ctx.createLinearGradient(xa * k, 0, xb * k, 0)
    xs.forEach((x, i) => g.addColorStop((x - xa) / (xb - xa), `rgba(${LIP}, ${0.16 * ls[i]})`))
    ctx.fillStyle = g
    ctx.beginPath()
    xs.forEach((x, i) => (i ? ctx.lineTo(x * k, face(x) * k) : ctx.moveTo(x * k, face(x) * k)))
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i] * k, (face(xs[i]) + into * depth * d) * k)
    ctx.closePath()
    ctx.fill()
  }
}
/** The same along a face that runs along y at `x` (`into` -1 toward -x, +1 toward +x). */
function lipY(ctx: CanvasRenderingContext2D, k: number, ya: number, yb: number, x: number, into: number, depth: number, light: (y: number) => number): void {
  if (yb - ya < 0.05) return
  const n = 24
  const ls: number[] = []
  for (let i = 0; i <= n; i++) ls.push(clamp01(light(ya + ((yb - ya) * i) / n)))
  if (Math.max(...ls) < 0.02) return
  for (const d of [1, 0.7, 0.46, 0.28, 0.15, 0.07]) {
    const g = ctx.createLinearGradient(0, ya * k, 0, yb * k)
    ls.forEach((l, i) => g.addColorStop(i / n, `rgba(${LIP}, ${0.13 * l})`))
    ctx.fillStyle = g
    const w = depth * d
    ctx.fillRect(Math.min(x, x + into * w) * k, ya * k, w * k, (yb - ya) * k)
  }
}

/* ------------------------------------------------------------------ the set: stone, the hollow, its light */

export function drawStone(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const xa = f.x0 - 1
  const xb = Math.min(f.x1 + 1, X_END)
  const ya = f.y0 - 1
  const yb = f.y1 + 1
  if (xb <= xa) return
  p.push()
  p.noStroke()
  p.rectMode(p.CORNER)
  // The stone: everything round the hollow, to the chamber's wall. Under the floor it is the floor's stone, turning to
  // the chamber's own floor as it runs into it.
  p.fill(STONE)
  p.rect(xa * k, ya * k, (xb - xa) * k, (yb - ya) * k)
  {
    const fx0 = Math.max(xa, X_LIP)
    if (xb > fx0) {
      const g = ctx.createLinearGradient((X_END - 3.5) * k, 0, X_END * k, 0)
      g.addColorStop(0, mixHex(STONE, FLOOR_STONE, 0.55))
      g.addColorStop(1, FLOOR_STONE)
      ctx.fillStyle = g
      ctx.fillRect(fx0 * k, Y_F * k, (xb - fx0) * k, Math.max(0, yb - Y_F) * k)
    }
  }
  drawStrata(p, k, xa, xb, ya, yb)
  // The hollow's air.
  tunnelPath(ctx, k, xa, xb)
  ctx.fillStyle = AIR
  ctx.fill()
  // Its light, only in its air.
  ctx.save()
  tunnelPath(ctx, k, xa, xb)
  ctx.clip()
  drawAirLight(p, c, t, xa, xb)
  ctx.restore()
  drawLips(p, c, t, xa, xb, ya, yb)
  p.pop()
}

/**
 * The stone's grain: long soft beds running along the shaft either side of it, each a shade apart from the next, their
 * edges wandering gently. Flat fills, no lines: smooth and geological. Under the floor they thin out before the
 * chamber, whose floor is plain.
 */
const BEDS = [0.7, 1.6, 2.9, 4.6, 6.8, 9.5]
const bedAt = (side: number, i: number, x: number): number => {
  const d = BEDS[i] + 0.22 * Math.sin(x * 0.31 + i * 1.9 + side) + 0.1 * Math.sin(x * 0.83 + i * 3.1)
  return side > 0 ? Y_F + d : Y_C - d
}
function drawStrata(p: p5, k: number, x0: number, x1: number, ya: number, yb: number): void {
  const step = 0.3
  p.noStroke()
  for (const side of [1, -1]) {
    const base = side > 0 ? FLOOR_STONE : STONE
    for (let i = 0; i + 1 < BEDS.length; i += 2) {
      const near = side > 0 ? bedAt(side, i, x0) : bedAt(side, i + 1, x0)
      if ((side > 0 && near > yb + 1) || (side < 0 && near < ya - 1)) continue
      const taper = (x: number) => (side > 0 ? clamp01((X_END - 0.8 - x) / 2.4) : 1)
      p.fill(mixHex(base, SHELL.dark, 0.16 + 0.06 * (i / 2)))
      p.beginShape()
      for (let x = x0; x <= x1 + step; x += step) {
        const q = Math.min(x, x1)
        p.vertex(q * k, bedAt(side, i, q) * k)
      }
      for (let x = x1; x >= x0 - step; x -= step) {
        const q = Math.max(x, x0)
        const a = bedAt(side, i, q)
        p.vertex(q * k, (a + (bedAt(side, i + 1, q) - a) * taper(q)) * k)
      }
      p.endShape(p.CLOSE)
    }
  }
}

/** The light in the hollow's air: the daylight up the throat, the mist at the far end, the ribs catching the light. */
function drawAirLight(p: p5, c: Ctx, t: number, xa: number, xb: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const mid = (Y_C + Y_F) / 2
  // The throat: the valley's daylight coming up it, pale far down, dying toward the lip.
  if (xa < X_LIP) {
    const g = ctx.createLinearGradient(X_LIP * k, 0, (X_LIP - 4.5) * k, 0)
    g.addColorStop(0, `rgba(${rgb(DAY)}, 0.04)`)
    g.addColorStop(0.3, `rgba(${rgb(DAY)}, 0.16)`)
    g.addColorStop(0.65, `rgba(${rgb(DAY)}, 0.42)`)
    g.addColorStop(1, `rgba(${rgb(DAY)}, 0.72)`)
    ctx.fillStyle = g
    ctx.fillRect((xa - 1) * k, THROAT[0] * k, (X_LIP - xa + 1) * k, (THROAT[1] - THROAT[0]) * k)
  }
  // Up out of the throat into the shaft: a soft glow over the lip, and two thin blades past the deck's ends.
  if (xa < X_LIP + 5) {
    lobe(ctx, k, X_LIP, 0.4, 2.6, 2.2, DAY, 0.08)
    for (const [gy, dir] of [[(THROAT[0] + DECK[0]) / 2, -1], [(THROAT[1] + DECK[1]) / 2, 1]] as const) {
      const x0 = Math.max(X_LIP, deckX(t) - R - 0.14)
      const len = 2.8
      for (const [grow, a] of [[1, 0.07], [2.2, 0.035]] as const) {
        const g = ctx.createLinearGradient(x0 * k, 0, (x0 + len) * k, 0)
        g.addColorStop(0, `rgba(${rgb(DAY)}, ${a})`)
        g.addColorStop(0.35, `rgba(${rgb(DAY)}, ${a * 0.4})`)
        g.addColorStop(1, `rgba(${rgb(DAY)}, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x0 * k, (gy - 0.04 * grow) * k)
        ctx.lineTo(x0 * k, (gy + 0.04 * grow) * k)
        ctx.lineTo((x0 + len) * k, (gy + dir * 0.35 + 0.22 * grow) * k)
        ctx.lineTo((x0 + len) * k, (gy + dir * 0.35 - 0.22 * grow) * k)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
  // The ribs, which go right round the shaft: across its far wall each is a low ridge, seen only where light falls on
  // it (the beam crossing it, the daylight low in the mouth, the mist's light), dark elsewhere.
  for (const r of RIBS) {
    if (r.x < xa - 1 || r.x > xb + 1) continue
    const y0 = ceilY(r.x)
    const y1 = floorY(r.x)
    const n = 16
    const lit: number[] = []
    for (let j = 0; j <= n; j++) lit.push(clamp01(lightAt(r.x, y0 + ((y1 - y0) * j) / n, t, 0.3)))
    if (Math.max(...lit) < 0.04) continue
    for (const [wm, am, dx] of [[1.7, 0.3, -0.08], [1.0, 0.5, -0.04], [0.45, 0.8, 0]] as const) {
      const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
      lit.forEach((l, j) => g.addColorStop(j / n, `rgba(${rgb(WARM)}, ${0.24 * am * l * l})`))
      ctx.fillStyle = g
      const w = r.w * wm
      ctx.fillRect((r.x + dx - w / 2) * k, y0 * k, w * k, (y1 - y0) * k)
    }
  }
  // The mist's light at the far end: in the shaft's last cells, low along the floor, fading out before the opening
  // (the room beyond is dark).
  const glow = farGlow(t)
  if (xb > X_END - 8) {
    lobe(ctx, k, MIST_C, Y_F - 1.1, 2.2, 1.6, SHELL.glow, 0.12 * glow)
    lobe(ctx, k, MIST_C + 0.3, mid + 0.6, 1.2, (Y_F - Y_C) * 0.45, SHELL.fogLit, 0.08 * glow)
  }
}

/** The lit lips: every face of the stone where light reaches it, a soft band fading into the stone. */
function drawLips(p: p5, c: Ctx, t: number, xa: number, xb: number, ya: number, yb: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x0 = Math.max(X_LIP, xa)
  const x1 = Math.min(X_END, xb)
  // The floor: a lit top edge, each rib's face toward a light brighter than its back.
  lipX(ctx, k, x0, x1, floorY, 1, 0.4, (x) => {
    const s = slope(floorY, x)
    const toMouth = Math.max(0.25, Math.min(2.5, 1 - 3.5 * s))
    const toFar = Math.max(0.25, Math.min(2.5, 1 + 3.5 * s))
    return 0.08 + 1.25 * mouthLight(x, floorY(x) - 0.06, t) * toMouth + farLight(x, t) * toFar
  })
  // The ceiling, a little dimmer; its rounded lip at the opening catching the chamber's light.
  lipX(ctx, k, x0, x1, ceilY, -1, 0.3, (x) => {
    const s = slope(ceilY, x)
    const toMouth = Math.max(0.25, Math.min(2.5, 1 + 3.5 * s))
    const toFar = Math.max(0.25, Math.min(2.5, 1 - 3.5 * s))
    const room = chamberLight(t) * 0.8 * clamp01(1 - (X_END - x) / (LIP_R * 1.4))
    return 0.8 * (0.04 + mouthLight(x, ceilY(x) + 0.06, t) * toMouth + farLight(x, t) * toFar) + room
  })
  // The chamber's wall over the opening, facing into the room: lit by the glass.
  if (xb >= X_END - 0.5) lipY(ctx, k, ya, ceilY(X_END), X_END, -1, 0.32, (y) => chamberLight(t) * 0.7 * (0.4 + 0.6 * clamp01((y - (Y_C - 10)) / 10)))
  // The mouth: the lip's face either side of the throat (facing up the shaft), and the throat's walls.
  if (xa < X_LIP + 0.5) {
    const ledge = (y: number) => 0.06 + mouthLight(X_LIP + 0.05, y, t) * 0.8
    lipY(ctx, k, Math.max(ya, Y_C), THROAT[0], X_LIP, -1, 0.3, ledge)
    lipY(ctx, k, THROAT[1], Math.min(yb, Y_F), X_LIP, -1, 0.3, ledge)
    const wall = (x: number) => 0.1 + 0.8 * clamp01((X_LIP - x) / 4)
    lipX(ctx, k, xa, X_LIP, () => THROAT[0], -1, 0.34, wall)
    lipX(ctx, k, xa, X_LIP, () => THROAT[1], 1, 0.34, wall)
  }
}

/** The mist that lies along the floor at the far end, lit, drifting slowly back down the shaft; gone before the opening. */
export function drawMist(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  if (f.x1 < X_END - 8 || f.x0 > X_END + 2) return
  ctx.save()
  tunnelPath(ctx, k, f.x0 - 1, f.x1 + 1, false)
  ctx.clip()
  for (let i = 0; i < 22; i++) {
    const life = 8 + 6 * hash(i, 1, 57)
    const ph = hash(i, 2, 57) * life
    const cyc = Math.floor((t + ph) / life)
    const age = ((t + ph) % life) / life
    const x0 = X_END - 0.4 - 5.5 * hash(i, cyc, 58) ** 1.4
    const x = x0 - 0.9 * age
    const lowness = hash(i, cyc, 59)
    const y = Y_F - 0.15 - 1.8 * lowness * lowness * lowness + 0.06 * Math.sin(t * 0.3 + i)
    const rx = 0.6 + 1.1 * hash(i, cyc, 60)
    // Its light: the mist's own, and never reaching past the opening.
    const reach = clamp01((X_END - x - rx * 0.6) / 0.8)
    const a = 0.3 * farLight(x, t) * reach * Math.sin(Math.PI * age) * (1 - 0.6 * lowness)
    lobe(ctx, k, x, y, rx, rx * (0.18 + 0.2 * lowness), SHELL.fogLit, a)
  }
  ctx.restore()
}

/** A few low wisps of the mist in front of them in the shaft's last cells, thin enough to see them through. */
export function drawMistFront(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  if (f.x1 < X_END - 6 || f.x0 > X_END + 2) return
  ctx.save()
  tunnelPath(ctx, k, f.x0 - 1, f.x1 + 1, false)
  ctx.clip()
  for (let i = 0; i < 7; i++) {
    const life = 9 + 5 * hash(i, 1, 67)
    const ph = hash(i, 2, 67) * life
    const cyc = Math.floor((t + ph) / life)
    const age = ((t + ph) % life) / life
    const x = X_END - 0.6 - 4 * hash(i, cyc, 68) ** 1.2 - 0.8 * age
    const y = Y_F - 0.1 - 0.12 * hash(i, cyc, 69)
    const rx = 0.7 + 0.8 * hash(i, cyc, 70)
    const reach = clamp01((X_END - x - rx * 0.6) / 0.8)
    lobe(ctx, k, x, y, rx, rx * 0.2, SHELL.fogLit, 0.4 * farLight(x, t) * reach * Math.sin(Math.PI * age))
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the deck, the lift, the flood */

/** The lift's top under the deck, the deck (cast's), the lamp's switch and cable, and the floodlight on its post. */
export function drawDeckRig(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  const x = deckX(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  p.translate(x * k, 0)
  // Turned a quarter: the deck's own up is the shell's +x, its length runs along y (the throat is its +y, below it).
  p.rotate(Math.PI / 2)
  // The lift's tower under the deck, as the valley side has it (seven stages of 2.5-long arms, a thin beam between
  // each): the top stage still opening as the deck comes up to its stops, the rest open, down through the throat
  // into the daylight, dark against it.
  const quad = (a: Pt, b: Pt, w: number) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = (-dy / l) * w
    const ny = (dx / l) * w
    p.quad((a[0] + nx) * k, (a[1] + ny) * k, (b[0] + nx) * k, (b[1] + ny) * k, (b[0] - nx) * k, (b[1] - ny) * k, (a[0] - nx) * k, (a[1] - ny) * k)
  }
  // A thin lit edge along a bar's side that faces down the throat, as bright as the daylight reaching it there.
  const edges: [Pt, Pt, number][] = []
  const litEdge = (a: Pt, b: Pt, w: number) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    let nx = -dy / l
    let ny = dx / l
    if (ny < 0) {
      nx = -nx
      ny = -ny
    }
    edges.push([[a[0] + nx * w, a[1] + ny * w], [b[0] + nx * w, b[1] + ny * w], rigLit((a[1] + b[1]) / 2)])
  }
  const CXU = 0.4
  const ARM = 2.5
  const th = 0.085
  let yb = R + 0.14
  p.stroke(RIG_INK)
  for (let s = 0; s < 4; s++) {
    const hx = s === 0 ? TOP_STAGE + (x - deckX(T0)) : 2.045
    const v = Math.max(0, Math.min(ARM * 0.995, hx - 0.06))
    const half = Math.sqrt(ARM * ARM - v * v) / 2
    const top = yb + th / 2
    const bot = yb + hx - th / 2
    p.strokeWeight(weight * 0.7)
    p.fill(ARM_FAR)
    quad([CXU + half, bot], [CXU - half, top], th / 2)
    p.fill(ARM_NEAR)
    quad([CXU - half, bot], [CXU + half, top], th / 2)
    litEdge([CXU - half, bot], [CXU + half, top], th / 2)
    p.fill(STEEL_DARK)
    p.strokeWeight(weight * 0.5)
    for (const q of [[CXU - half, bot], [CXU + half, bot], [CXU - half, top], [CXU + half, top]] as Pt[]) p.circle(q[0] * k, q[1] * k, 0.064 * k)
    p.circle(CXU * k, ((top + bot) / 2) * k, 0.09 * k)
    yb += hx
    // The beam under it.
    p.strokeWeight(weight * 0.6)
    p.rectMode(p.CORNER)
    p.rect((CXU - 1.2) * k, yb * k, 2.4 * k, 0.03 * k)
    edges.push([[CXU - 1.2, yb + 0.03], [CXU + 1.2, yb + 0.03], rigLit(yb)])
    yb += 0.03
  }
  // The deck itself, with its work light (cast's), in the same dark steel: the switch pressed in as she rolls
  // against it, the lamp lit.
  const lu = louiseAt(Math.min(t, TURN))[1]
  const press = clamp01((lu - (SWITCH_U - R)) / PRESS)
  drawDeck(p, k, DECK[0], DECK[1], { ink: RIG_INK, weight, steel: STEEL, lamp: { on: clamp01(floodOn(t)), switchAt: SWITCH_U, press, tilt: lampTilt(t), body: STEEL_DARK } })
  // The plate's underside, over the throat, catches its light.
  edges.push([[DECK[0], R + 0.14], [DECK[1], R + 0.14], rigLit(0.3) * 1.2])
  p.noFill()
  p.strokeCap(p.ROUND)
  for (const [a, b, l] of edges) {
    p.stroke(alpha(p, DAY, 0.55 * l))
    p.strokeWeight(weight * 0.55)
    p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  }
  p.pop()
  // The beam: a soft cone of light up the shaft (the stone stops it: only the shaft's air is lit).
  const on = floodOn(t)
  if (on > 0.01) {
    const { at, dir } = floodLens(t)
    const f = frame(p, k)
    ctx.save()
    tunnelPath(ctx, k, f.x0 - 1, f.x1 + 1)
    ctx.clip()
    const nx = -dir[1]
    const ny = dir[0]
    // Many thin cones, each a little wider and fainter: a beam with a bright core and soft edges, no bands.
    const LAYERS = 14
    for (let j = 0; j < LAYERS; j++) {
      const spread = 0.15 + (1.75 * j) / (LAYERS - 1)
      const a = 0.036 * Math.exp(-((spread / 1.25) ** 2))
      const w0 = 0.1 * Math.min(1, spread)
      const w1 = BEAM_LEN * Math.tan(BEAM_HALF * spread)
      const far: Pt = [at[0] + dir[0] * BEAM_LEN, at[1] + dir[1] * BEAM_LEN]
      const g = ctx.createLinearGradient(at[0] * k, at[1] * k, far[0] * k, far[1] * k)
      const c0 = rgb(WARM)
      g.addColorStop(0, `rgba(${c0}, ${a * on})`)
      g.addColorStop(0.25, `rgba(${c0}, ${a * 0.55 * on})`)
      g.addColorStop(0.6, `rgba(${c0}, ${a * 0.2 * on})`)
      g.addColorStop(1, `rgba(${c0}, 0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo((at[0] + nx * w0) * k, (at[1] + ny * w0) * k)
      ctx.lineTo((far[0] + nx * w1) * k, (far[1] + ny * w1) * k)
      ctx.lineTo((far[0] - nx * w1) * k, (far[1] - ny * w1) * k)
      ctx.lineTo((at[0] - nx * w0) * k, (at[1] - ny * w0) * k)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}

/** The deck's near toe board, over the balls' feet. */
export function drawDeckOver(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  p.push()
  p.translate(deckX(t) * k, 0)
  p.rotate(Math.PI / 2)
  drawDeck(p, k, DECK[0], DECK[1], { ink: RIG_INK, weight, steel: STEEL, over: true })
  p.pop()
}

/* ------------------------------------------------------------------ the dust */

/**
 * Dust, drifting the way gravity pulls: down the throat in the mouth, then, as gravity turns, turning with it (each
 * mote's drift lags a little, the way fine dust in air does) toward the new floor. Tiny, soft, seen only where light is.
 */
const V_DUST = 0.16
const TAU_DUST = 0.4
const DUST_DT = 0.01
const DUST_T0 = TURN - 1
const DUST_T1 = TURN + 3
const DRIFT: Pt[] = (() => {
  // The drift from DUST_T0, tabled: velocity relaxing toward V_DUST along gravity.
  const out: Pt[] = [[0, 0]]
  let v: Pt = [-V_DUST, 0]
  let p: Pt = [0, 0]
  for (let t = DUST_T0; t < DUST_T1; t += DUST_DT) {
    const g = gravity(t)
    const gl = Math.hypot(g[0], g[1]) || 1
    const want: Pt = [(V_DUST * g[0]) / gl, (V_DUST * g[1]) / gl]
    const e = 1 - Math.exp(-DUST_DT / TAU_DUST)
    v = [v[0] + (want[0] - v[0]) * e, v[1] + (want[1] - v[1]) * e]
    p = [p[0] + v[0] * DUST_DT, p[1] + v[1] * DUST_DT]
    out.push(p)
  }
  return out
})()
function drift(t: number): Pt {
  if (t <= DUST_T0) return [-V_DUST * (t - DUST_T0), 0]
  const i = (t - DUST_T0) / DUST_DT
  if (i >= DRIFT.length - 1) {
    const e = DRIFT[DRIFT.length - 1]
    return [e[0], e[1] + V_DUST * (t - DUST_T1)]
  }
  const j = Math.floor(i)
  const f = i - j
  return [DRIFT[j][0] + (DRIFT[j + 1][0] - DRIFT[j][0]) * f, DRIFT[j][1] + (DRIFT[j + 1][1] - DRIFT[j][1]) * f]
}

const MOTES = 420
export function drawDust(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const f = frame(p, k)
  const minD = 1.3 / k
  p.push()
  p.noStroke()
  const D = drift(t)
  for (let i = 0; i < MOTES; i++) {
    const life = 4 + 4 * hash(i, 1, 91)
    const ph = hash(i, 2, 91) * life
    const cyc = Math.floor((t + ph) / life)
    const age = (t + ph - cyc * life) / life
    const born = t - age * life
    const B = drift(born)
    const m = 0.6 + 0.8 * hash(i, 3, 91)
    // Born anywhere in the shaft's first cells or its throat, thinning up the shaft.
    const u = hash(i, cyc, 92)
    const bx = X_LIP - 3.5 + (X_END - X_LIP + 3.5) * u * u
    const by = Y_C + (Y_F - Y_C) * hash(i, cyc, 93)
    const w = 0.035
    const x = bx + m * (D[0] - B[0]) + w * Math.sin(t * (0.7 + hash(i, 4, 91)) + i)
    const y = by + m * (D[1] - B[1]) + w * Math.cos(t * (0.6 + hash(i, 5, 91)) + i * 1.3)
    if (x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1) continue
    // In the shaft's air or the throat, never in the stone.
    const inShaft = x > X_LIP && x < X_END && y > ceilY(x) + 0.05 && y < floorY(x) - 0.05
    const inThroat = x <= X_LIP && y > THROAT[0] && y < THROAT[1]
    if (!inShaft && !inThroat) continue
    const l = lightAt(x, y, t)
    const env = Math.sin(Math.PI * age)
    const tw = 0.65 + 0.35 * Math.sin(t * (2.2 + 3 * hash(i, 6, 91)) + i * 2.1)
    const a = Math.pow(clamp01(l * 1.1), 1.6) * env * tw * 0.95
    if (a < 0.03) continue
    const d = Math.max(minD, 0.018 + 0.014 * hash(i, 7, 91))
    p.fill(alpha(p, WARM, a))
    p.ellipse(x * k, y * k, d * k, d * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ what their landings raise */

/** A breath of dust where a ball touches down: soft lobes lifting a little off the floor and settling back. */
export function drawPuffs(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const { t: at, who } of TOUCHES) {
    const s = t - at
    if (s < 0 || s > 1.8) continue
    const pos = who === 'louise' ? louiseAt(at) : ianAt(at)
    // A landing after the fall is a bigger breath than a hop's.
    const big = at < TURN + 1 ? 1 : 0.55
    const l = clamp01(0.25 + lightAt(pos[0], REST, t))
    for (let j = 0; j < 4; j++) {
      const side = j % 2 ? 1 : -1
      const spread = (0.12 + 0.35 * (1 - Math.exp(-s / 0.35))) * (0.7 + 0.3 * j / 3) * big
      const lift = 0.14 * big * (1 - Math.exp(-s / 0.25)) * (1 - s / 2.2) * (0.6 + 0.4 * hash(j, Math.round(at * 100), 5))
      const a = 0.16 * big * l * Math.exp(-s / 0.55) * Math.min(1, s / 0.03)
      const r = (0.1 + 0.2 * (1 - Math.exp(-s / 0.4))) * big
      lobe(ctx, k, pos[0] + side * spread, Y_F - 0.04 - lift, r, r * 0.55, SHELL.mist, a)
    }
  }
}

/** For shots: when the turn is done. */
export const TURNED_BY = TURN + TURN_FOR
