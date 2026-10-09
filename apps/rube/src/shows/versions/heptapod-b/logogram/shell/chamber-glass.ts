import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash } from '../kit'
import { level } from '../music'
import { SHELL } from '../worlds'
import { CEIL, GLASS_BOT, GLASS_TOP, GLASS_X0, GLASS_X1, OUT, PALM, WAKE, WALL_X, WALL_X1 } from './chamber-path'
import { bodyAt, drawInk, drawWalker, FOOTFALLS, PALM_AT, WALKERS, type Seen } from './chamber-heptapods'

/**
 * The chamber: a vast dark room, its far wall the glass, a great rectangle of white with the fog rolling behind it,
 * and the floor a dark ledge in front. The glass is dim when they come in, and wakes in two steps; its light spills
 * onto the walls and lies along the polished floor; as the ring closes it swells, and the room goes white with it.
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
const rgba = (hex: string, a: number) => `rgba(${rgb(hex)}, ${Math.max(0, Math.min(1, a))})`

/** The glass's face with its fog unlit: only just a shade lighter than the dark round it, so it wakes out of nothing. */
const DIM = mixHex(SHELL.wall, SHELL.mist, 0.1)

/** The fog's colour behind the glass, lit: a little greyer high up; what the heptapods fade into. */
// Its top the same as its middle, so a heptapod deep in it is only ever a shade darker than the fog, never lighter.
const AIR = mixHex(SHELL.glowWarm, SHELL.screen, 0.5)
const TOP = AIR

/** When the room begins to go white with the glass, and how far it goes before the director's veil takes it. */
const SWELL = 129.0
export const swellAt = (t: number): number => sm(t, SWELL, OUT) ** 1.4

/**
 * How lit the glass is, 0 dark .. 1 its full white (a little over on its waking): dim when they come in; the first
 * step on WAKE[0], the second on WAKE[1] (a flare, settling), then breathing with the voices.
 */
export function glassLight(t: number): number {
  let g = 0.05
  const a0 = t - WAKE[0]
  const a1 = t - WAKE[1]
  if (a0 > 0) g += 0.3 * (1 - Math.exp(-a0 / 0.06))
  if (a1 > 0) g += 0.58 * (1 - Math.exp(-a1 / 0.1)) + 0.12 * Math.exp(-a1 / 0.7) * (1 - Math.exp(-a1 / 0.04))
  const breath = Math.max(-1, Math.min(1, (level(t) - 0.9) / 0.06))
  g += 0.035 * breath * sm(t, WAKE[1], WAKE[1] + 3)
  return g
}

/** A soft lobe of fog or light: dense in the middle, gone at its edge (volume, never a disc). */
function lobe(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, hex: string, a: number): void {
  if (a <= 0.004 || rx <= 0.01) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.5, rgba(hex, a * 0.62))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** The fog behind the glass: slow lobes at a depth, drifting sideways and breathing, wrapping round the glass's width. */
function fogLayer(ctx: CanvasRenderingContext2D, k: number, t: number, g: number, layer: number, n: number, seed: number): void {
  const span = GLASS_X1 - GLASS_X0 + 12
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, 1, seed)
    const h2 = hash(i, 2, seed)
    const h3 = hash(i, 3, seed)
    const drift = (0.12 + 0.1 * hash(i, 4, seed)) * (layer === 1 ? 1.4 : 1) * (hash(i, 5, seed) < 0.3 ? -1 : 1)
    const x = GLASS_X0 - 6 + ((((h1 * span + drift * t) % span) + span) % span)
    const y = GLASS_TOP + 1 + h2 * (GLASS_BOT - GLASS_TOP - 1.5) + 0.5 * Math.sin(t * (0.11 + 0.05 * h3) + i)
    const r = (layer === 0 ? 3.2 : 2.2) + 3 * h3
    const breathe = 1 + 0.08 * Math.sin(t * 0.23 + i * 1.7)
    const kind = hash(i, 6, seed)
    // Lit fog, its shade, and the brightest white where the light comes through thinnest.
    const hex = kind < 0.45 ? SHELL.fogLit : kind < 0.7 ? SHELL.mist : SHELL.screen
    const a = (kind < 0.45 ? 0.5 : kind < 0.7 ? 0.13 : 0.55) * (layer === 1 ? 0.7 : 1) * g
    lobe(ctx, k, x, y, r * breathe * 1.25, r * breathe * 0.8, hex, a)
  }
}

/** The dust of a footfall: fog churned up round the tip, a shade under it, rising and spreading, going. */
function drawPuffs(ctx: CanvasRenderingContext2D, k: number, t: number, who: 0 | 1, g: number): void {
  for (const f of FOOTFALLS) {
    if (f.who !== who) continue
    const a = t - f.at
    if (a < 0 || a > 2.4) continue
    const w = WALKERS[who]
    // Deep in the fog a footfall is only the fog churning: wider, slower, darker than a near one's.
    const deep = clamp01((w.fog(f.at) - 0.6) / 0.3)
    const seen = clamp01(0.35 + 0.35 * deep + (1 - w.fog(f.at)) * 1.6) * g
    const s = (w.h / 13) * (1 + 0.7 * deep)
    const spread = (0.4 + 1.1 * (1 - Math.exp(-a / (0.45 + 0.3 * deep)))) * s
    const rise = (0.1 + 0.8 * (1 - Math.exp(-a / 0.8))) * s
    const on = (1 - Math.exp(-a / 0.04)) * Math.exp(-a / 0.8)
    const [x, y] = f.p
    // The shade of the churned fog round the foot, then the white it throws up either side.
    lobe(ctx, k, x, y - 0.05 * s, spread * 1.15, spread * 0.42, mixHex(SHELL.fogLit, SHELL.mist, 0.8), 0.55 * on * seen)
    for (const d of [-0.55, 0.5]) lobe(ctx, k, x + d * spread, y - rise * (0.7 + 0.3 * Math.abs(d)), spread * 0.8, spread * 0.55, SHELL.screen, 0.6 * on * seen)
  }
}

/**
 * A heptapod's shadow in the fog before it can be seen: a great soft darkening where its body is and a low one where
 * it stands, deepening as it comes, and darker for a moment on each unseen footfall (the fog it stirs). Gone once
 * the heptapod itself shows through.
 */
function drawShadow(ctx: CanvasRenderingContext2D, k: number, t: number, j: 0 | 1, g: number): void {
  const w = WALKERS[j]
  const f = w.fog(t)
  const near = 1 - f
  const s = sm(near, 0.02, 0.13) * (1 - sm(near, 0.3, 0.55))
  let beat = 0
  for (const q of FOOTFALLS) {
    if (q.who !== j) continue
    const a = t - q.at
    if (a > 0 && a < 3) beat += (1 - Math.exp(-a / 0.06)) * Math.exp(-a / 0.8) * (1 - sm(1 - w.fog(q.at), 0.2, 0.4))
  }
  const on = Math.min(1, s * (1 + 0.9 * beat)) * g
  if (on <= 0.004) return
  const { at, h } = bodyAt(j, t)
  const shade = mixHex(SHELL.fogLit, SHELL.mist, 0.7)
  lobe(ctx, k, at[0], at[1] - 0.66 * h, 0.3 * h, 0.42 * h, shade, 0.2 * on)
  lobe(ctx, k, at[0], at[1] - 0.2 * h, 0.62 * h, 0.22 * h, shade, 0.16 * on)
}

/**
 * The press of the palm on the glass: the fog behind it pushed out from under the hand, between its fingers, a shade
 * and then white, drifting out and going. Soft volume, no line.
 */
function drawPress(ctx: CanvasRenderingContext2D, k: number, t: number, g: number): void {
  const a = t - PALM
  if (a < 0 || a > 3) return
  const on = (1 - Math.exp(-a / 0.06)) * Math.exp(-a / 1.0) * g
  const [px, py] = PALM_AT
  for (let i = 0; i < 7; i++) {
    // Between the fingers (which start straight up), the fog pushed out along the glass.
    const ang = -Math.PI / 2 + ((i + 0.5) / 7) * Math.PI * 2
    const out = 1.0 + 1.1 * (1 - Math.exp(-a / 0.5)) + 0.15 * hash(i, 1, 57)
    const r = 0.5 + 0.6 * (1 - Math.exp(-a / 0.6))
    const x = px + Math.cos(ang) * out
    const y = py + Math.sin(ang) * out * 0.9
    if (y > GLASS_BOT - 0.1) continue
    lobe(ctx, k, x, y, r * 1.3, r, mixHex(SHELL.fogLit, SHELL.mist, 0.5), 0.16 * on)
  }
}

/** The far wall, its edges, and the glass's light falling on it. */
function drawRoom(p: p5, k: number, g: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const x0 = Math.max(WALL_X, f.x0 - 1)
  const x1 = Math.min(WALL_X1, f.x1 + 1)
  const y0 = Math.max(CEIL, f.y0 - 1)
  const y1 = GLASS_BOT + 0.02
  if (x1 <= x0 || y1 <= y0) return
  ctx.fillStyle = mixHex(SHELL.dark, SHELL.wall, 0.3)
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // The light off the glass on the walls round it: brightest close to it, reaching far into the room.
  const cx = (GLASS_X0 + GLASS_X1) / 2
  const cy = (GLASS_TOP + GLASS_BOT) / 2
  const R = 26
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  ctx.translate(cx * k, cy * k)
  ctx.scale(1, 0.72)
  const spill = ctx.createRadialGradient(0, 0, 8 * k, 0, 0, R * k)
  spill.addColorStop(0, rgba(SHELL.wallLit, 0.9 * Math.min(1, g)))
  spill.addColorStop(0.45, rgba(SHELL.wallLit, 0.35 * Math.min(1, g)))
  spill.addColorStop(1, rgba(SHELL.wallLit, 0))
  ctx.fillStyle = spill
  ctx.fillRect(-R * k, -R * k, 2 * R * k, 2 * R * k)
  ctx.restore()
  // The glass's light bleeding a little past its edges onto the wall: it glows, it is not a card.
  const B = 1.3
  const rim = rgba(SHELL.screenEdge, 0.3 * Math.min(1, g))
  const clear = rgba(SHELL.screenEdge, 0)
  const bleed: [number, number, number, number, number, number, number, number][] = [
    [GLASS_X0 - B, GLASS_TOP - B, B, GLASS_BOT - GLASS_TOP + B, GLASS_X0, 0, GLASS_X0 - B, 0],
    [GLASS_X1, GLASS_TOP - B, B, GLASS_BOT - GLASS_TOP + B, GLASS_X1, 0, GLASS_X1 + B, 0],
    [GLASS_X0, GLASS_TOP - B, GLASS_X1 - GLASS_X0, B, 0, GLASS_TOP, 0, GLASS_TOP - B],
  ]
  for (const [x, y, w, h, ax, ay, bx, by] of bleed) {
    const bg = ctx.createLinearGradient(ax * k, ay * k, bx * k, by * k)
    bg.addColorStop(0, rim)
    bg.addColorStop(1, clear)
    ctx.fillStyle = bg
    ctx.fillRect(x * k, y * k, w * k, h * k)
  }
  // Its ceiling and side walls: the room's edges, the stone beyond them darker still.
  ctx.fillStyle = SHELL.dark
  if (f.y0 < CEIL) ctx.fillRect(Math.max(WALL_X, f.x0 - 1) * k, (f.y0 - 1) * k, (Math.min(WALL_X1, f.x1 + 1) - Math.max(WALL_X, f.x0 - 1)) * k, (CEIL - f.y0 + 1) * k)
  if (f.x1 > WALL_X1) ctx.fillRect(WALL_X1 * k, (f.y0 - 1) * k, (f.x1 - WALL_X1 + 1) * k, (GLASS_BOT - f.y0 + 1) * k)
  // The far corner: the wall darkens into it as the glass's light falls off, so the room turns there rather than
  // ending on a cut.
  if (f.x1 > WALL_X1 - 2.5) {
    const corner = ctx.createLinearGradient((WALL_X1 - 2.5) * k, 0, WALL_X1 * k, 0)
    corner.addColorStop(0, rgba(SHELL.dark, 0))
    corner.addColorStop(1, rgba(SHELL.dark, 0.9))
    ctx.fillStyle = corner
    ctx.fillRect((WALL_X1 - 2.5) * k, (f.y0 - 1) * k, 2.5 * k, (GLASS_BOT - f.y0 + 1) * k)
  }
}

/** The glass: its lit fog, the two of them in it, their ink; its edges soft. */
function drawGlass(p: p5, k: number, t: number, g: number, wash: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const gl = Math.min(1, g)
  const X0 = GLASS_X0
  const X1 = GLASS_X1
  const Y0 = GLASS_TOP
  const Y1 = GLASS_BOT + 0.05
  ctx.save()
  ctx.beginPath()
  ctx.rect(X0 * k, Y0 * k, (X1 - X0) * k, (Y1 - Y0) * k)
  ctx.clip()
  // The face: the fog lit from nowhere, a little greyer high up, brightest low where it lies thickest.
  const face = ctx.createLinearGradient(0, Y0 * k, 0, Y1 * k)
  face.addColorStop(0, mixHex(DIM, mixHex(TOP, SHELL.screen, wash), gl))
  face.addColorStop(0.55, mixHex(DIM, AIR, gl))
  face.addColorStop(1, mixHex(DIM, SHELL.screen, gl))
  ctx.fillStyle = face
  ctx.fillRect(X0 * k, Y0 * k, (X1 - X0) * k, (Y1 - Y0) * k)
  const fogA = gl * (1 - 0.8 * wash)
  fogLayer(ctx, k, t, fogA, 0, 16, 401)
  const seen: Seen = { air: AIR, wash }
  // Costello behind, then fog between the two, then Abbott close behind the glass.
  if (t > 95) {
    drawShadow(ctx, k, t, 1, gl)
    drawWalker(p, k, 1, t, seen)
    drawPuffs(ctx, k, t, 1, gl)
    fogLayer(ctx, k, t, fogA * 0.8, 1, 9, 402)
  }
  // The fog lying thickest on its floor, where their feet go.
  const band = ctx.createLinearGradient(0, (Y1 - 2.8) * k, 0, Y1 * k)
  band.addColorStop(0, rgba(SHELL.screen, 0))
  band.addColorStop(0.6, rgba(SHELL.screen, 0.55 * gl))
  band.addColorStop(1, rgba(SHELL.screen, 0.9 * gl))
  ctx.fillStyle = band
  ctx.fillRect(X0 * k, (Y1 - 2.8) * k, (X1 - X0) * k, 2.8 * k)
  if (t > 88) {
    drawShadow(ctx, k, t, 0, gl)
    drawWalker(p, k, 0, t, seen)
    drawPuffs(ctx, k, t, 0, gl)
    drawPress(ctx, k, t, gl)
    drawInk(p, k, t, seen)
  }
  // Its edges: soft, greyer, the light falling off into the frame of the wall.
  const edge = mixHex(DIM, SHELL.screenEdge, gl)
  const E = 1.6
  const strips: [number, number, number, number, number, number, number, number][] = [
    [X0, Y0, E, Y1 - Y0, X0, 0, X0 + E, 0],
    [X1 - E, Y0, E, Y1 - Y0, X1, 0, X1 - E, 0],
    [X0, Y0, X1 - X0, E, 0, Y0, 0, Y0 + E],
  ]
  for (const [x, y, w, h, ax, ay, bx, by] of strips) {
    const eg = ctx.createLinearGradient(ax * k, ay * k, bx * k, by * k)
    eg.addColorStop(0, rgba(edge, 0.85))
    eg.addColorStop(1, rgba(edge, 0))
    ctx.fillStyle = eg
    ctx.fillRect(x * k, y * k, w * k, h * k)
  }
  // Before it wakes it is all but the dark of the room: a pane only just told from the wall, so it wakes out of the
  // dark rather than being a grey slab waiting at the end of the shaft.
  const asleep = 0.6 * Math.max(0, 1 - g / 0.33)
  if (asleep > 0.004) {
    ctx.fillStyle = rgba(SHELL.dark, asleep)
    ctx.fillRect(X0 * k, Y0 * k, (X1 - X0) * k, (Y1 - Y0) * k)
  }
  ctx.restore()
}

/** The floor: a dark ledge, polished enough to hold the glass's light along its edge. */
function drawFloor(p: p5, k: number, g: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const x0 = Math.max(WALL_X, f.x0 - 1)
  const x1 = Math.max(x0, f.x1 + 1)
  const top = GLASS_BOT
  const bot = Math.max(top + 1, f.y1 + 1)
  ctx.fillStyle = SHELL.floor
  ctx.fillRect(x0 * k, top * k, (x1 - x0) * k, (bot - top) * k)
  // The glass in the floor: a soft sheen under its width, fading down and off its ends.
  const gl = Math.min(1, g)
  const L = 2.2
  const sheen = ctx.createLinearGradient(0, top * k, 0, (top + L) * k)
  sheen.addColorStop(0, rgba(SHELL.fogLit, 0.2 * gl))
  sheen.addColorStop(0.3, rgba(SHELL.fogLit, 0.07 * gl))
  sheen.addColorStop(1, rgba(SHELL.fogLit, 0))
  // Under the glass's width, faded off its ends by the floor's own dark drawn back over them.
  const a0 = GLASS_X0 - 2.5
  const a1 = GLASS_X1 + 2.5
  ctx.fillStyle = sheen
  ctx.fillRect(a0 * k, top * k, (a1 - a0) * k, L * k)
  for (const [from, to] of [[a0, GLASS_X0 + 1.5], [a1, GLASS_X1 - 1.5]] as const) {
    const cap = ctx.createLinearGradient(from * k, 0, to * k, 0)
    cap.addColorStop(0, rgba(SHELL.floor, 1))
    cap.addColorStop(1, rgba(SHELL.floor, 0))
    ctx.fillStyle = cap
    ctx.fillRect(Math.min(from, to) * k, top * k, Math.abs(to - from) * k, L * k)
  }
}

/** As the ring closes the glass's light swells and fills the room: white rising over it all (the veil takes it after). */
function drawSwell(p: p5, k: number, t: number): void {
  const w = swellAt(t)
  if (w <= 0.002) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  // From the glass: the light fills the air over the floor first, and the floor close behind it (never a dark slab
  // left standing in the white).
  ctx.fillStyle = rgba(SHELL.glow, 0.6 * w)
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (GLASS_BOT - f.y0 + 1) * k)
  // The polished floor takes the light as a reflection: brightest at its edge, under the glass, so the two meet in one
  // white, and less down toward us, so the floor reads as a floor going white rather than a grey slab under the white.
  const top = GLASS_BOT
  // Over as much floor as the frame shows (a tall window, a phone, sees far more of it than the 16:9 frame does).
  const g = ctx.createLinearGradient(0, top * k, 0, Math.max(top + 4, f.y1) * k)
  g.addColorStop(0, rgba(SHELL.glow, Math.min(1, 1.5 * w)))
  g.addColorStop(0.35, rgba(SHELL.glow, Math.min(1, 1.05 * w)))
  g.addColorStop(1, rgba(SHELL.glow, Math.min(1, 0.85 * w ** 1.2)))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, Math.max(1, f.y1 + 1 - top) * k)
}

/** The whole chamber at show time `t`. */
export function drawChamber(p: p5, k: number, t: number): void {
  const g = glassLight(t)
  const wash = swellAt(t)
  p.push()
  p.noStroke()
  drawRoom(p, k, g)
  drawGlass(p, k, t, g, wash)
  drawFloor(p, k, g)
  drawSwell(p, k, t)
  p.pop()
}

export type { Pt }
