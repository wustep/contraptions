import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { DECK_LAMP_LENS, drawDeck } from '../cast'
import { alpha, frame, hash, type Ctx } from '../kit'
import { level } from '../music'
import { SHELL, VALLEY } from '../worlds'
import {
  DECK,
  deckX,
  gravity,
  hullX,
  ianAt,
  louiseAt,
  PRESS,
  REST,
  RIBS,
  ribRise,
  SWITCH_U,
  T0,
  T_ON,
  T_SWITCH,
  THROAT,
  TOUCHES,
  TURN_FOR,
  X_END,
  X_HULL,
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

/** The cut stone, and the far wall between the faces (the shaft's air is darker than its stone). */
const STONE = mixHex(SHELL.wall, SHELL.dark, 0.45)
const BACK = SHELL.dark
const STEEL = mixHex(VALLEY.steel, SHELL.dark, 0.38)
const STEEL_DARK = mixHex(VALLEY.steelDark, SHELL.dark, 0.45)
/** The lift's arms, olive drab as outside, in the dark. */
const ARM_NEAR = mixHex(VALLEY.olive, SHELL.dark, 0.3)
const ARM_FAR = mixHex(VALLEY.olive, SHELL.dark, 0.6)
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
  return Math.min(1, 0.35 + s / 0.06) * (1 + 0.1 * Math.exp(-s / 0.25))
}
/** The flood's lens (its centre) and the direction it throws, in the part's frame, at `t`. */
const FLOOD_TILT = -0.12
export function floodLens(t: number): { at: Pt; dir: Pt } {
  return { at: [deckX(t) + DECK_LAMP_LENS.up, DECK[1] - DECK_LAMP_LENS.back], dir: [Math.cos(FLOOD_TILT), Math.sin(FLOOD_TILT)] }
}
const BEAM_HALF = 0.3
const BEAM_LEN = 17
/** The lift's top stage's height at the cut (the valley side's, measured): it opens on as the deck rises. */
const TOP_STAGE = 1.28

/** The white at the far end: faint in the mouth, growing along the shaft as they come to it. */
export function farGlow(t: number): number {
  const grow = 0.2 + 0.6 * sm(t, 72.5, 84.6)
  // As she comes to the threshold the mist's light sinks to the dim room's (the glass is dim until it wakes).
  const sink = 1 - 0.55 * sm(t, 85.1, 86.4)
  return grow * sink * (0.92 + 0.12 * level(t))
}

/** How lit a point is (0 dark .. about 1): for the dust, the faces' edges, the ribs. */
export function lightAt(x: number, y: number, t: number, farShare = 1): number {
  let l = 0.03
  // Daylight up the throat, strongest in it, dying a cell or two into the shaft.
  if (x < X_LIP) l += y > THROAT[0] && y < THROAT[1] ? 0.35 + 0.35 * clamp01((X_LIP - x) / (X_LIP - X_HULL)) : 0
  else l += 0.3 * Math.exp(-(x - X_LIP) / 1.2) * (0.5 + 0.5 * Math.exp(-(((y - 0.4) / 2.2) ** 2)))
  // The flood's cone.
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
      l += f * 0.22 / (1 + (d * d + r * r) / 6)
    }
  }
  // The far end.
  if (x <= X_END + 1) l += farShare * farGlow(t) * Math.exp(-Math.max(0, X_END - x) / 2.8)
  return l
}

/* ------------------------------------------------------------------ helpers */

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

/** The shaft's inside, between its faces, as a path (for filling and for clipping its light). */
function tunnelPath(ctx: CanvasRenderingContext2D, k: number, xa: number, xb: number): void {
  const x0 = Math.max(X_LIP, xa)
  const x1 = Math.min(X_END, xb)
  ctx.beginPath()
  if (x1 <= x0) return
  const step = 0.06
  ctx.moveTo(x0 * k, (Y_C + ribRise(x0) * 0.8) * k)
  for (let x = x0; x <= x1; x += step) ctx.lineTo(x * k, (Y_C + ribRise(x) * 0.8) * k)
  ctx.lineTo(x1 * k, (Y_C + ribRise(x1) * 0.8) * k)
  ctx.lineTo(x1 * k, (Y_F - ribRise(x1)) * k)
  for (let x = x1; x >= x0; x -= step) ctx.lineTo(x * k, (Y_F - ribRise(x)) * k)
  ctx.lineTo(x0 * k, (Y_F - ribRise(x0)) * k)
  ctx.closePath()
}

/* ------------------------------------------------------------------ the set: stone, throat, daylight */

export function drawStone(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const xa = f.x0 - 1
  const xb = f.x1 + 1
  const ya = f.y0 - 1
  const yb = f.y1 + 1
  p.push()
  p.noStroke()
  p.rectMode(p.CORNER)
  // The stone: the belly's thickness and all the rock round the shaft, to the chamber's wall.
  const sx0 = Math.max(xa, X_HULL)
  const sx1 = Math.min(xb, X_END)
  if (sx1 > sx0) {
    p.fill(STONE)
    p.rect(sx0 * k, ya * k, (sx1 - sx0) * k, (yb - ya) * k)
    drawStrata(p, k, sx0, sx1, ya, yb)
  }
  // Below the belly (which curves up away from the slot): the valley's daylight, the fog under the shell, in the
  // belly's shadow close under it and paler away.
  if (xa < X_HULL + 1.5) {
    const g = ctx.createLinearGradient(X_HULL * k, 0, (X_HULL - 5) * k, 0)
    g.addColorStop(0, mixHex(VALLEY.cloudShade, SHELL.wall, 0.55))
    g.addColorStop(0.4, mixHex(VALLEY.cloudShade, SHELL.wall, 0.2))
    g.addColorStop(1, mixHex(DAY, VALLEY.cloudShade, 0.3))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((xa - 1) * k, ya * k)
    for (let y = ya; y <= yb; y += 0.1) ctx.lineTo(Math.min(xb + 1, hullX(y)) * k, y * k)
    ctx.lineTo((xa - 1) * k, yb * k)
    ctx.closePath()
    ctx.fill()
  }
  // The throat through the belly: lit from below, darkening up to the lip.
  const tb = Math.min(hullX(THROAT[0]), hullX(THROAT[1]))
  if (xa < X_LIP && xb > tb) {
    const g = ctx.createLinearGradient(tb * k, 0, X_LIP * k, 0)
    g.addColorStop(0, mixHex(DAY, BACK, 0.45))
    g.addColorStop(0.45, mixHex(DAY, BACK, 0.8))
    g.addColorStop(1, mixHex(DAY, BACK, 0.94))
    ctx.fillStyle = g
    ctx.fillRect(tb * k, THROAT[0] * k, (X_LIP - tb) * k, (THROAT[1] - THROAT[0]) * k)
  }
  // The shaft's air, and the far wall seen through it.
  if (xb > X_LIP && xa < X_END) {
    tunnelPath(ctx, k, xa, xb)
    ctx.fillStyle = BACK
    ctx.fill()
    ctx.save()
    tunnelPath(ctx, k, xa, xb)
    ctx.clip()
    drawAirLight(p, c, t, xa, xb)
    ctx.restore()
  }
  p.pop()
}

/**
 * The stone's grain: long soft beds running along the shaft either side of it, each a shade apart from the next, their
 * edges wandering gently. Flat fills, no lines: smooth and geological.
 */
const BEDS = [0.7, 1.6, 2.9, 4.6, 6.8]
const bedAt = (side: number, i: number, x: number): number => {
  const d = BEDS[i] + 0.22 * Math.sin(x * 0.31 + i * 1.9 + side) + 0.1 * Math.sin(x * 0.83 + i * 3.1)
  return side > 0 ? Y_F + d : Y_C - d
}
function drawStrata(p: p5, k: number, x0: number, x1: number, ya: number, yb: number): void {
  const step = 0.3
  p.noStroke()
  for (const side of [1, -1]) {
    for (let i = 0; i + 1 < BEDS.length; i += 2) {
      const near = side > 0 ? bedAt(side, i, x0) : bedAt(side, i + 1, x0)
      if ((side > 0 && near > yb + 1) || (side < 0 && near < ya - 1)) continue
      p.fill(mixHex(STONE, SHELL.wall, 0.28 + 0.08 * (i / 2)))
      p.beginShape()
      for (let x = x0; x <= x1 + step; x += step) p.vertex(Math.min(x, x1) * k, bedAt(side, i, Math.min(x, x1)) * k)
      for (let x = x1; x >= x0 - step; x -= step) p.vertex(Math.max(x, x0) * k, bedAt(side, i + 1, Math.max(x, x0)) * k)
      p.endShape(p.CLOSE)
    }
  }
}

/** The light in the shaft's air: the daylight up the throat, the far end's white, the ribs catching it. */
function drawAirLight(p: p5, c: Ctx, t: number, xa: number, xb: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const mid = (Y_C + Y_F) / 2
  // The far wall: lit from below by the daylight up the throat, darkening up the shaft; and from the far end, a
  // faint haze of its white a long way down.
  {
    const x0 = X_LIP
    const g = ctx.createLinearGradient(x0 * k, 0, (x0 + 4.2) * k, 0)
    g.addColorStop(0, `rgba(${rgb(DAY)}, 0.13)`)
    g.addColorStop(0.3, `rgba(${rgb(DAY)}, 0.06)`)
    g.addColorStop(1, `rgba(${rgb(DAY)}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, (Y_C - 0.5) * k, 4.2 * k, (Y_F - Y_C + 1) * k)
    const glow0 = farGlow(t)
    const h = ctx.createLinearGradient((X_LIP + 1.5) * k, 0, X_END * k, 0)
    const hz = 0.55 + 0.45 * glow0
    h.addColorStop(0, `rgba(${rgb(SHELL.glow)}, 0)`)
    h.addColorStop(0.25, `rgba(${rgb(SHELL.glow)}, ${0.04 * hz})`)
    h.addColorStop(0.7, `rgba(${rgb(SHELL.glow)}, ${0.07 * hz})`)
    h.addColorStop(1, `rgba(${rgb(SHELL.glow)}, ${0.1 * hz})`)
    ctx.fillStyle = h
    ctx.fillRect((X_LIP + 1.5) * k, (Y_C - 0.5) * k, (X_END - X_LIP - 1.5) * k, (Y_F - Y_C + 1) * k)
  }
  // The daylight: a soft glow over the lip, and two thin blades of it up past the deck's ends, spreading and dying.
  if (xa < X_LIP + 5) {
    lobe(ctx, k, X_LIP, 0.4, 2.6, 2.2, DAY, 0.07)
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
  // it (the beam crossing it, the daylight low in the mouth, the opening's white), dark elsewhere.
  for (const r of RIBS) {
    if (r.x < xa - 1 || r.x > xb + 1) continue
    const y0 = Y_C + ribRise(r.x) * 0.8
    const y1 = Y_F - ribRise(r.x)
    const n = 16
    const lit: number[] = []
    for (let j = 0; j <= n; j++) lit.push(clamp01(lightAt(r.x, y0 + ((y1 - y0) * j) / n, t, 0.3)))
    if (Math.max(...lit) < 0.04) continue
    for (const [wm, am, dx] of [[1.7, 0.35, -0.08], [1.0, 0.6, -0.04], [0.45, 0.9, 0]] as const) {
      const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
      lit.forEach((l, j) => g.addColorStop(j / n, `rgba(${rgb(WARM)}, ${0.26 * am * l * l})`))
      ctx.fillStyle = g
      const w = r.w * wm
      ctx.fillRect((r.x + dx - w / 2) * k, y0 * k, w * k, (y1 - y0) * k)
    }
    // Its shade on the side away from the mouth's light.
    const g = ctx.createLinearGradient((r.x - 0.1) * k, 0, (r.x + r.w) * k, 0)
    g.addColorStop(0, 'rgba(0, 0, 0, 0)')
    g.addColorStop(0.35, 'rgba(0, 0, 0, 0.09)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect((r.x - 0.1) * k, y0 * k, (r.w + 0.1) * k, (y1 - y0) * k)
  }
  // The far end: the opening's light, low along the floor where the mist lies, and a pale breath of it up the
  // opening; it falls off fast into the shaft.
  const glow = farGlow(t)
  if (xb > X_END - 10) {
    lobe(ctx, k, X_END + 0.2, Y_F - 1.6, 3.4, 2.4, SHELL.glow, 0.13 * glow)
    lobe(ctx, k, X_END + 0.1, mid + 0.8, 1.1, (Y_F - Y_C) * 0.5, SHELL.fogLit, 0.14 * glow)
  }
}

/** The mist that lies along the floor at the far end, lit by it, drifting slowly back down the shaft. */
export function drawMist(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const glow = farGlow(t)
  const f = frame(p, k)
  if (f.x1 < X_END - 8 || f.x0 > X_END + 2) return
  ctx.save()
  tunnelPath(ctx, k, f.x0 - 1, f.x1 + 1)
  ctx.clip()
  for (let i = 0; i < 22; i++) {
    const life = 8 + 6 * hash(i, 1, 57)
    const ph = hash(i, 2, 57) * life
    const cyc = Math.floor((t + ph) / life)
    const age = ((t + ph) % life) / life
    // Born at the opening and drifting slowly back down the shaft along the floor, thinning as it comes.
    const x0 = X_END + 0.8 - 5.5 * hash(i, cyc, 58) ** 1.4
    const x = x0 - 0.9 * age
    const lowness = hash(i, cyc, 59)
    const y = Y_F - 0.15 - 1.8 * lowness * lowness * lowness + 0.06 * Math.sin(t * 0.3 + i)
    const near = Math.exp(-Math.max(0, X_END - x) / 2.4)
    const a = 0.3 * glow * near * Math.sin(Math.PI * age) * (1 - 0.6 * lowness)
    const rx = 0.6 + 1.2 * hash(i, cyc, 60)
    lobe(ctx, k, x, y, rx, rx * (0.18 + 0.2 * lowness), SHELL.fogLit, a)
  }
  ctx.restore()
}

/** A few low wisps of the mist in front of them near the opening, thin enough to see them through. */
export function drawMistFront(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const glow = farGlow(t)
  const f = frame(p, k)
  if (f.x1 < X_END - 6 || f.x0 > X_END + 2) return
  ctx.save()
  tunnelPath(ctx, k, f.x0 - 1, f.x1 + 1)
  ctx.clip()
  for (let i = 0; i < 7; i++) {
    const life = 9 + 5 * hash(i, 1, 67)
    const ph = hash(i, 2, 67) * life
    const cyc = Math.floor((t + ph) / life)
    const age = ((t + ph) % life) / life
    const x = X_END + 0.5 - 4.2 * hash(i, cyc, 68) ** 1.2 - 0.8 * age
    const y = Y_F - 0.1 - 0.12 * hash(i, cyc, 69)
    const near = Math.exp(-Math.max(0, X_END - x) / 2.2)
    const rx = 0.8 + 0.9 * hash(i, cyc, 70)
    lobe(ctx, k, x, y, rx, rx * 0.2, SHELL.fogLit, 0.13 * glow * near * Math.sin(Math.PI * age))
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the faces */

/** The shaft's faces, the lip, the throat and the belly's face, in bone, as bright as the light on them. */
export function drawFaces(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const f = frame(p, k)
  const xa = Math.max(X_LIP, f.x0 - 1)
  const xb = Math.min(X_END, f.x1 + 1)
  p.push()
  p.noFill()
  p.strokeCap(p.ROUND)
  const edge = (x0: number, y0: number, x1: number, y1: number, l: number, w = 1) => {
    p.stroke(alpha(p, ink, Math.min(0.95, 0.16 + 0.8 * l)))
    p.strokeWeight(weight * w)
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  }
  // The floor's face (the +y wall) and the ceiling's (-y), with the ribs on them.
  const step = 0.1
  for (let x = xa; x < xb; x += step) {
    const x2 = Math.min(xb, x + step)
    const xm = (x + x2) / 2
    edge(x, Y_F - ribRise(x), x2, Y_F - ribRise(x2), lightAt(xm, Y_F - 0.3, t), 1)
    edge(x, Y_C + ribRise(x) * 0.8, x2, Y_C + ribRise(x2) * 0.8, lightAt(xm, Y_C + 0.3, t) * 0.8, 0.9)
  }
  // The chamber's wall over and under the opening (the shaft's end).
  if (f.x1 > X_END - 1 && f.x0 < X_END + 1) {
    const l = lightAt(X_END - 0.1, Y_C, t)
    edge(X_END, Y_C + ribRise(X_END) * 0.8, X_END, f.y0 - 1, l * 0.6, 0.9)
  }
  // The lip: the shaft's end face either side of the throat; the throat's walls; the belly's face.
  if (f.x0 < X_LIP + 1) {
    const l = 0.5
    edge(X_LIP, Y_C, X_LIP, THROAT[0], l, 1)
    edge(X_LIP, THROAT[1], X_LIP, Y_F, l, 1)
    edge(hullX(THROAT[0]), THROAT[0], X_LIP, THROAT[0], 0.6, 1)
    edge(hullX(THROAT[1]), THROAT[1], X_LIP, THROAT[1], 0.6, 1)
    // The belly's face, curving up away from the slot, lit from below.
    for (let y = f.y0 - 1; y < f.y1 + 1; y += 0.2) {
      const y2 = y + 0.2
      if (y2 > THROAT[0] && y < THROAT[1]) continue
      edge(hullX(y), y, hullX(y2), y2, 0.45, 1)
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the deck, the lift, the flood */

/** The lift's top under the deck, the deck (cast's), the lamp's switch and cable, and the floodlight on its post. */
export function drawDeckRig(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = deckX(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  p.translate(x * k, 0)
  // Turned a quarter: the deck's own up is the shell's +x, its length runs along y.
  p.rotate(Math.PI / 2)
  // The lift's tower under the deck, as the valley side has it (seven stages of 2.5-long arms, a thin beam between
  // each): the top stage still opening as the deck comes up to its stops, the rest open, down through the throat
  // into the daylight, dark against it.
  const bar = (a: Pt, b: Pt, w: number) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = (-dy / l) * w
    const ny = (dx / l) * w
    p.quad((a[0] + nx) * k, (a[1] + ny) * k, (b[0] + nx) * k, (b[1] + ny) * k, (b[0] - nx) * k, (b[1] - ny) * k, (a[0] - nx) * k, (a[1] - ny) * k)
  }
  const CXU = 0.4
  const ARM = 2.5
  const th = 0.085
  let yb = R + 0.14
  for (let s = 0; s < 4; s++) {
    const hx = s === 0 ? TOP_STAGE + (x - deckX(T0)) : 2.045
    const v = Math.max(0, Math.min(ARM * 0.995, hx - 0.06))
    const half = Math.sqrt(ARM * ARM - v * v) / 2
    const top = yb + th / 2
    const bot = yb + hx - th / 2
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    p.fill(ARM_FAR)
    bar([CXU + half, bot], [CXU - half, top], th / 2)
    p.fill(ARM_NEAR)
    bar([CXU - half, bot], [CXU + half, top], th / 2)
    p.fill(STEEL_DARK)
    p.strokeWeight(weight * 0.6)
    for (const q of [[CXU - half, bot], [CXU + half, bot], [CXU - half, top], [CXU + half, top]] as Pt[]) p.circle(q[0] * k, q[1] * k, 0.064 * k)
    p.fill(STEEL)
    p.circle(CXU * k, ((top + bot) / 2) * k, 0.09 * k)
    yb += hx
    // The beam under it.
    p.fill(STEEL_DARK)
    p.strokeWeight(weight * 0.7)
    p.rectMode(p.CORNER)
    p.rect((CXU - 1.2) * k, yb * k, 2.4 * k, 0.03 * k)
    yb += 0.03
  }
  // The deck itself, with its work light (cast's): the switch pressed in as she rolls against it, the lamp lit.
  const lu = louiseAt(Math.min(t, TURN))[1]
  const press = clamp01((lu - (SWITCH_U - R)) / PRESS)
  drawDeck(p, k, DECK[0], DECK[1], { ink, weight, steel: STEEL, lamp: { on: clamp01(floodOn(t)), switchAt: SWITCH_U, press, tilt: -FLOOD_TILT, body: STEEL_DARK } })
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
  const { k, ink, weight } = c
  p.push()
  p.translate(deckX(t) * k, 0)
  p.rotate(Math.PI / 2)
  drawDeck(p, k, DECK[0], DECK[1], { ink, weight, steel: STEEL, over: true })
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
    const bx = X_HULL + (X_END - X_HULL) * u * u
    const by = Y_C + (Y_F - Y_C) * hash(i, cyc, 93)
    const w = 0.035
    const x = bx + m * (D[0] - B[0]) + w * Math.sin(t * (0.7 + hash(i, 4, 91)) + i)
    const y = by + m * (D[1] - B[1]) + w * Math.cos(t * (0.6 + hash(i, 5, 91)) + i * 1.3)
    if (x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1) continue
    // In the shaft's air or the throat, never in the stone.
    const inShaft = x > X_LIP && x < X_END && y > Y_C + 0.05 && y < Y_F - 0.05
    const inThroat = x <= X_LIP && x > hullX(y) && y > THROAT[0] && y < THROAT[1]
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
