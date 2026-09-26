import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { heat } from '../fx'
import { FIRES, RAILWAY } from '../worlds'
import { horizonAt, moonAt } from './night'
import {
  BATTERY_X0,
  BURSTS,
  CRASH,
  CRASH_AT,
  CRATE,
  DIVE,
  DRIVERS_AT,
  FLANK,
  GERB,
  GERB_AT,
  GUNS,
  GY,
  HANG,
  IN,
  jetTop,
  LEADER_AT,
  LEADER_FOOT,
  LIP,
  MAST_A,
  MAST_B,
  MINES_X,
  omega,
  OUT,
  POUR,
  RACK_AT,
  RACK_N,
  RACK_X,
  rackTube,
  REST,
  riseAt,
  RISES,
  ROPE_Y,
  ropeY,
  SALUTE_RACK,
  SALUTES,
  sparkAt,
  starAt,
  TITAN_FIRE,
  TITAN_W,
  TITAN_X,
  TUBE_H,
  turned,
  UNIT_AT,
  STOPS,
  WHEEL,
  WHEEL_AT,
  WHEEL_R,
  WIND,
  wireY,
  burntTo,
  PIECES,
  type Burst,
  type Gun,
  type Puff,
  type Rise,
} from './fireworks-plan'

/**
 * FIREWORKS's drawings, all from show time, in the part's own cells: the riverside field below the end of the line,
 * the racks and their quick-match, the gerb, the Niagara wire, the finale's battery and mines, the great wheel, the
 * Titan and the guns that flank it, the salute rack, the crate, the ash; and everything that goes up: comets, shells'
 * rising tails, bursts (streaks and falling trails, never round blobs), smoke, and the light it all throws.
 *
 * The field is at night: things are dark shapes with a moonlit edge, lit up warm by whatever is burning near them.
 */

const FW = RAILWAY

/* ------------------------------------------------------------------ pen, colour */

export interface Pen {
  p: p5
  k: number
  ctx: CanvasRenderingContext2D
  /** Show time. */
  t: number
  /** The visible frame, in the part's cells. */
  f: { x0: number; y0: number; x1: number; y1: number }
}

const RGB = new Map<string, [number, number, number]>()
function rgb(hex: string): [number, number, number] {
  let c = RGB.get(hex)
  if (!c) {
    c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
    RGB.set(hex, c)
  }
  return c
}
export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Dark things by night: the timber, the tubes, the iron. */
const WOOD = mixHex(FW.crate, FW.iron, 0.55)
const WOOD_LIT = FW.crateLit
const TUBE = mixHex(FW.tube, FW.iron, 0.35)
const TUBE_LIT = mixHex(FW.tube, FW.crateLit, 0.55)
const CHAR = mixHex(FW.iron, FW.tube, 0.25)
const IRON_LIT = FW.ironLit
const GROUND = mixHex(FW.plain, FW.iron, 0.45)
const ASHC = mixHex(FW.smoke, FW.iron, 0.55)

/* ------------------------------------------------------------------ light */

export interface Light {
  x: number
  y: number
  r: number
  a: number
  col: string
}

/** Everything giving light at `t`: the spark, the bursts, the flashes at the muzzles, the fountains, the fire. */
export function lightsAt(t: number): Light[] {
  const out: Light[] = []
  if (t >= IN && t <= OUT + 0.05) {
    const hidden = PIECES.some((pc) => pc.hidden && t > pc.a && t < pc.b)
    if (!hidden) {
      const [x, y] = sparkAt(t)
      const h = heat(t)
      out.push({ x, y, r: 1.4 + 1.1 * Math.min(2.6, h), a: 0.55 * Math.min(1, 0.25 + h * 0.4), col: FW.fwGold })
    }
  }
  for (const b of BURSTS) {
    const s = t - b.at
    if (s < 0 || s > 1.8) continue
    const size = b.kind === 'titan' ? 1.4 : b.kind === 'salute' ? 0.8 : b.kind === 'small' ? 0.25 : b.kind === 'mine' ? 0.28 : 0.75
    const decay = b.kind === 'salute' ? Math.exp(-s / 0.07) : 0.75 * Math.exp(-s / 0.3) + 0.25 * Math.exp(-s / 1.1)
    out.push({ x: b.x, y: b.y + (b.kind === 'mine' ? -1.5 : 0.4 * s), r: 2.5 + (b.v / b.k) * 1.2, a: size * decay, col: b.kind === 'salute' ? FW.fwWhite : b.col })
  }
  for (const r of RISES) {
    const s = t - r.from
    if (s < 0 || s > 0.35) continue
    out.push({ x: r.a[0], y: r.a[1] - 0.3, r: r.comet ? 1.6 : 2.4, a: (r.comet ? 0.45 : r.col === FW.fwWhite ? 0.25 : 0.7) * Math.exp(-s / 0.08), col: FW.fwGold })
  }
  const jet = jetTop(t)
  if (jet > 0.05) out.push({ x: GERB[0], y: GERB[1] - jet * 0.5, r: 2 + jet * 0.6, a: 0.5 * clamp01(jet / 2), col: FW.fwGold })
  for (let j = 0; j < UNIT_AT.length; j++) {
    const a = pourAt(j, t)
    if (a > 0.02) out.push({ x: HANG[j], y: wireY(HANG[j]) + 1.8, r: 2.4, a: 0.35 * a, col: FW.fwGold })
  }
  const lit = driversLit(t)
  if (lit > 0.05) out.push({ x: WHEEL[0], y: WHEEL[1], r: 3.2, a: 0.08 * lit, col: FW.fwWhite })
  const blast = t - TITAN_FIRE
  if (blast >= 0 && blast < 0.8) out.push({ x: TITAN_X, y: LIP - 0.8, r: 5, a: 1.1 * Math.exp(-blast / 0.14), col: FW.fwWhite })
  const fire = crateFire(t)
  if (fire > 0.02) out.push({ x: CRATE.x1 - 0.35, y: GY - 0.8, r: 2.2 + 1.4 * fire, a: 0.65 * fire * (0.9 + 0.1 * Math.sin(t * 17)), col: FW.coal })
  return out
}

/** How lit a point is, 0..1, and by what colour most. */
function litAt(L: Light[], x: number, y: number): { a: number; col: string } {
  let a = 0
  let best = 0
  let col: string = FW.fwGold
  for (const l of L) {
    const d2 = ((x - l.x) ** 2 + (y - l.y) ** 2) / (l.r * l.r)
    if (d2 >= 1) continue
    const v = l.a * (1 - d2) * (1 - d2)
    a += v
    if (v > best) {
      best = v
      col = l.col
    }
  }
  return { a: clamp01(a), col }
}
const shade = (L: Light[], dark: string, lit: string, x: number, y: number, base = 0): string => mixHex(dark, lit, clamp01(base + litAt(L, x, y).a))

/* ------------------------------------------------------------------ small shapes */

function quad(pen: Pen, pts: Pt[], fill: string): void {
  const { ctx, k } = pen
  ctx.fillStyle = fill
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.fill()
}
/** A bar from a to b, `w` wide. */
function bar(pen: Pen, a: Pt, b: Pt, w: number, fill: string): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = (-dy / l) * (w / 2)
  const ny = (dx / l) * (w / 2)
  quad(pen, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], fill)
}
function rectC(pen: Pen, x0: number, y0: number, x1: number, y1: number, fill: string): void {
  quad(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill)
}
function line(pen: Pen, pts: Pt[], w: number, stroke: string): void {
  const { ctx, k } = pen
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(0.6, w * k)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.stroke()
}
/** A soft round glow: light only, never a solid disc. */
function glow(pen: Pen, x: number, y: number, r: number, col: string, a: number, sy = 1): void {
  if (a <= 0.004 || r <= 0) return
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(x * k, y * k)
  if (sy !== 1) ctx.scale(1, sy)
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  gr.addColorStop(0, rgba(col, a * 0.8))
  gr.addColorStop(0.35, rgba(col, a * 0.35))
  gr.addColorStop(1, rgba(col, 0))
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = gr
  ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}
/** Draw what `fn` draws as light: added to what is under it, so fire brightens the night instead of greying it. */
function additive(pen: Pen, fn: () => void): void {
  pen.ctx.save()
  pen.ctx.globalCompositeOperation = 'lighter'
  fn()
  pen.ctx.restore()
}
export { additive }
/** A tube (a mortar, a gerb, a driver): its base at `a`, leaning `lean` from upright, `w` wide, `h` tall. */
function tube(pen: Pen, a: Pt, lean: number, w: number, h: number, body: string, rim: string, dy = 0): Pt {
  const top: Pt = [a[0] + Math.sin(lean) * h, a[1] + dy - Math.cos(lean) * h]
  bar(pen, [a[0], a[1] + dy], top, w, body)
  // Its round side: a lit strip down one flank.
  const off = w * 0.22
  bar(pen, [a[0] - off * Math.cos(lean), a[1] + dy - off * Math.sin(lean)], [top[0] - off * Math.cos(lean), top[1] - off * Math.sin(lean)], w * 0.16, rgba(FW.crateLit, 0.18))
  // The rim, a little wider, and its bore seen a little from above: filled dark.
  mouth(pen, top, lean, w * 0.58, rim)
  return top
}
/** A tube's mouth: its rim and its dark bore, an ellipse turned with the tube. */
function mouth(pen: Pen, at: Pt, lean: number, rx: number, rim: string, bore: string = FW.iron): void {
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  ctx.rotate(lean)
  ctx.fillStyle = rim
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * k, rx * 0.36 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = bore
  ctx.beginPath()
  ctx.ellipse(0, -rx * 0.04 * k, rx * 0.74 * k, rx * 0.24 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A flame's teardrop (as the spark's own, `fx.ts`): base at (x, y), `h` tall, `w` wide, its tip swung `lean`. */
function tongue(pen: Pen, x: number, y: number, w: number, h: number, lean: number, fill: string): void {
  const { ctx, k } = pen
  ctx.fillStyle = fill
  ctx.beginPath()
  const n = 16
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
    const px = x + side * w * 0.5 * belly + lean * u * u
    const py = y - h * u
    if (i) ctx.lineTo(px * k, py * k)
    else ctx.moveTo(px * k, py * k)
  }
  ctx.closePath()
  ctx.fill()
}

/* ------------------------------------------------------------------ the ground */

/**
 * The field: the rail's level past the buffer stops. The night's plain runs to the horizon behind it (EXPRESS's
 * `night.ts`, which keeps the horizon at the camera's eye); between the plain and the field lies the river, where
 * everything that burns in the sky burns again, smeared straight down.
 */
export function drawGround(pen: Pen, L: Light[]): void {
  const { f, t, ctx, k } = pen
  const x0 = Math.max(f.x0, STOPS + 0.2)
  const x1 = f.x1
  if (x1 <= x0) return
  const hy = horizonAt(pen.p, k)
  const top = Math.max(GY - 1.3, hy + 0.08)
  const bank = GY - 0.34
  // The field fades in from under the line's end, so the two grounds meet without a seam.
  const fadeIn = (x: number) => clamp01((x - STOPS - 0.2) / 1.6)
  const edge = ctx.createLinearGradient((STOPS + 0.2) * k, 0, (STOPS + 1.8) * k, 0)
  if (top < bank) {
    edge.addColorStop(0, rgba(FW.river, 0))
    edge.addColorStop(1, rgba(FW.river, 1))
    ctx.fillStyle = edge
    ctx.fillRect(x0 * k, top * k, (x1 - x0) * k, (bank - top) * k)
    // The river's moonlit ripples: long thin glints that drift.
    for (let i = 0; i < 12; i++) {
      const y = top + 0.08 + (bank - top - 0.12) * hash(i, 1)
      const len = 0.5 + 1.3 * hash(i, 2)
      const x = ((hash(i, 3) * 70 + t * 0.12 * (0.5 + hash(i, 4))) % 70) - 5
      if (x + len < x0 || x > x1) continue
      rectC(pen, x, y, x + len, y + 0.016, rgba(FW.moonHalo, (0.1 + 0.08 * hash(i, 5)) * fadeIn(x)))
    }
    // What burns in the sky is in the river too: broken glints under it, wider and fainter toward the near bank,
    // shivering as the water moves.
    additive(pen, () => {
      ctx.lineCap = 'round'
      for (const l of L) {
        if (l.y > GY - 1.5 || l.a < 0.04) continue
        const a0 = Math.min(1, l.a) * fadeIn(l.x)
        if (a0 < 0.02) continue
        const w = Math.min(1.6, 0.35 + l.r * 0.3)
        const n = 7
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n
          const y = top + 0.05 + (bank - top - 0.1) * u
          const seed = Math.round(l.x * 7 + l.y * 3)
          const shiver = Math.sin(t * (2.2 + hash(i, seed, 1)) + i * 1.9)
          const half = w * (0.25 + 0.55 * hash(i, seed, 2)) * (0.8 + 0.4 * u)
          const x = l.x + w * 0.3 * shiver * (hash(i, seed, 3) - 0.5)
          line(pen, [[x - half, y], [x + half, y]], 0.035, rgba(l.col, 0.3 * a0 * (1 - 0.6 * u)))
        }
      }
    })
  }
  const g2 = ctx.createLinearGradient((STOPS + 0.2) * k, 0, (STOPS + 1.8) * k, 0)
  g2.addColorStop(0, rgba(GROUND, 0))
  g2.addColorStop(1, rgba(GROUND, 1))
  ctx.fillStyle = g2
  ctx.fillRect(x0 * k, bank * k, (x1 - x0) * k, (f.y1 + 1 - bank) * k)
  const g3 = ctx.createLinearGradient((STOPS + 0.2) * k, 0, (STOPS + 1.8) * k, 0)
  g3.addColorStop(0, rgba(FW.moonHalo, 0))
  g3.addColorStop(1, rgba(FW.moonHalo, 0.2))
  ctx.fillStyle = g3
  ctx.fillRect(x0 * k, bank * k, (x1 - x0) * k, 0.025 * k)
  // Light on the ground under whatever is burning.
  for (const l of L) {
    if (l.a < 0.03) continue
    const rx = l.r * 1.1
    const d = Math.max(0, GY - l.y)
    const a = Math.min(0.35, l.a * 0.28 * Math.max(0, 1 - d / (l.r * 1.6))) * fadeIn(l.x)
    if (a < 0.01) continue
    ctx.save()
    ctx.beginPath()
    ctx.rect((l.x - rx) * k, bank * k, 2 * rx * k, (f.y1 + 1 - bank) * k)
    ctx.clip()
    glow(pen, l.x, GY - 0.1, rx, l.col, a)
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the racks and the match */

const dip = (s: number, size = 0.05, tau = 0.06): number => (s <= 0 ? 0 : size * (s / tau) * Math.exp(1 - s / tau))

/** A rack tube's paper: dark kraft with a red band under the mouth. */
const PAPER = mixHex(FW.tube, FW.iron, 0.25)
const BAND = mixHex(FW.signalRed, FW.iron, 0.45)

export function drawRacks(pen: Pen, L: Light[]): void {
  const { t } = pen
  for (let i = 0; i < 4; i++) {
    const n = RACK_N[i]
    const x = RACK_X[i]
    if (x < pen.f.x0 - 2 || x > pen.f.x1 + 2) continue
    const half = 0.15 * n + 0.2
    const dy = dip(t - RACK_AT[i], 0.045)
    const wood = shade(L, mixHex(WOOD, WOOD_LIT, 0.25), WOOD_LIT, x, GY - 0.6)
    const top = ROPE_Y + 0.14 + dy
    // The tubes, standing up through the frame, a little fanned; each kicks down into it as it fires.
    const fired = t >= RACK_AT[i]
    for (let j = 0; j < n; j++) {
      const tb = rackTube(i, j)
      const kick = dy + dip(t - RACK_AT[i], 0.06, 0.05)
      const body = shade(L, fired ? CHAR : PAPER, TUBE_LIT, tb.x, GY - 0.8)
      const mouthAt = tube(pen, [tb.x, GY - 0.02], tb.lean, 0.24, TUBE_H, body, mixHex(body, FW.iron, 0.45), kick)
      // The paper band a little under the mouth.
      const dir: Pt = [Math.sin(tb.lean), -Math.cos(tb.lean)]
      const a: Pt = [mouthAt[0] - dir[0] * 0.34, mouthAt[1] - dir[1] * 0.34]
      const b: Pt = [mouthAt[0] - dir[0] * 0.2, mouthAt[1] - dir[1] * 0.2]
      bar(pen, a, b, 0.245, shade(L, fired ? mixHex(BAND, CHAR, 0.5) : BAND, FW.signalRed, tb.x, GY - 1, -0.1))
    }
    // The frame: two uprights, a rail across the tubes where the match lies, and a sill.
    rectC(pen, x - half - 0.04, top, x - half + 0.05, GY, wood)
    rectC(pen, x + half - 0.05, top, x + half + 0.04, GY, wood)
    rectC(pen, x - half - 0.1, top - 0.02, x + half + 0.1, top + 0.08, wood)
    rectC(pen, x - half - 0.14, GY - 0.12, x + half + 0.14, GY, wood)
  }
}

/** The quick-match: pale where it has yet to burn, black and smoking behind the spark. */
export function drawMatch(pen: Pen): void {
  const { t } = pen
  const burnt = burntTo(t)
  const x0 = RACK_X[0] - 0.35
  const x1 = GERB[0]
  const pts = (a: number, b: number): Pt[] => {
    const out: Pt[] = []
    const n = Math.max(2, Math.ceil((b - a) / 0.12))
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n
      out.push([x, x < RACK_X[0] ? ROPE_Y + 0.08 * (RACK_X[0] - x) : ropeY(x)])
    }
    return out
  }
  const cut = Math.max(x0, Math.min(x1, burnt))
  if (cut > x0) line(pen, pts(x0, cut), 0.035, rgba(FW.sleeper, 0.95))
  if (cut < x1) line(pen, pts(cut, x1), 0.04, FW.fuse)
  // A thread of smoke off the burnt match, thinning as it rises.
  if (t > RACK_AT[0] && t < RACK_AT[0] + 7) {
    for (let i = 0; i < 40; i++) {
      const x = x0 + (i / 39) * (x1 - x0)
      const s = t - burntAt(x)
      if (s < 0 || s > 2.2) continue
      const y = ropeY(x) - 0.08 - s * 0.45
      const wx = x + WIND[0] * s + 0.06 * Math.sin(s * 5 + i)
      pen.ctx.fillStyle = rgba(FW.smoke, 0.16 * (1 - s / 2.2))
      pen.ctx.fillRect((wx - 0.03 - 0.03 * s) * pen.k, y * pen.k, (0.06 + 0.06 * s) * pen.k, 0.12 * pen.k)
    }
  }
}
/** When the burning reached `x` along the match. */
function burntAt(x: number): number {
  let lo = RACK_AT[0]
  let hi = GERB_AT
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (burntTo(mid) < x) lo = mid
    else hi = mid
  }
  return lo
}

/* ------------------------------------------------------------------ the gerb */

export function drawGerb(pen: Pen, L: Light[]): void {
  const x = GERB[0]
  if (x < pen.f.x0 - 3 || x > pen.f.x1 + 3) return
  const wood = shade(L, WOOD, WOOD_LIT, x, GY - 0.3)
  rectC(pen, x - 0.34, GY - 0.22, x + 0.34, GY, wood)
  const body = shade(L, pen.t > GERB_AT ? CHAR : TUBE, TUBE_LIT, x, GY - 0.6)
  bar(pen, [x, GY - 0.2], [x, GERB[1] + 0.12], 0.34, body)
  // Its choke: a short cone at the mouth.
  quad(pen, [[x - 0.17, GERB[1] + 0.13], [x + 0.17, GERB[1] + 0.13], [x + 0.08, GERB[1] + 0.01], [x - 0.08, GERB[1] + 0.01]], mixHex(body, FW.iron, 0.4))
}

/**
 * The gerb's fountain: a column of sparks standing as high as `jetTop` (each one's arc scaled to the jet as it is now,
 * so the column rises and surges with it and the spark rides in its crown), and a wider, lower spray falling away.
 */
export function drawFountain(pen: Pen): void {
  const { t, ctx, k } = pen
  if (t < GERB_AT || t > 133) return
  const H = jetTop(t)
  if (H < 0.03) return
  const x0 = GERB[0]
  const y0 = GERB[1]
  ctx.lineCap = 'round'
  glow(pen, x0, y0 - 0.25, 0.8, FW.fwGold, 0.45 * clamp01(H / 1.5))
  const rate = 260
  const from = GERB_AT
  const start = Math.max(from, t - 1.0)
  for (let i = Math.floor((start - from) * rate); i <= (t - from) * rate; i++) {
    const born = from + (i + 0.9 * (hash(i, 17) - 0.5)) / rate
    const a = t - born
    if (a < 0) continue
    const core = hash(i, 6) < 0.6
    const life = core ? 0.7 + 0.25 * hash(i, 7) : 0.55 + 0.3 * hash(i, 7)
    if (a > life) continue
    const peak = H * (core ? 0.94 + 0.14 * hash(i, 5) : 0.3 + 0.35 * hash(i, 5))
    const T = life * (core ? 0.55 : 0.45)
    const lean = (hash(i, 3) - 0.5) * (core ? 0.22 : 1.3) + 0.05
    const at = (s: number): Pt => {
      const u = s / T
      return [x0 + lean * peak * 0.55 * u, y0 - peak * u * (2 - u)]
    }
    const [x, y] = at(a)
    const [px, py] = at(Math.max(0, a - 0.05))
    const fade = 1 - smooth(a, life * 0.65, life)
    ctx.strokeStyle = rgba(a < 0.1 ? FW.fwWhite : FW.fwGold, 0.85 * fade)
    ctx.lineWidth = Math.max(0.7, 0.04 * k)
    ctx.beginPath()
    ctx.moveTo(px * k, py * k)
    ctx.lineTo(x * k, y * k)
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ the Niagara wire */

/** How strongly the Niagara's `j`th length is pouring at `t`, 0..1. */
export function pourAt(j: number, t: number): number {
  const s = t - UNIT_AT[j]
  if (s < 0) return 0
  return smooth(s, 0, 0.12) * (1 - smooth(s, POUR - 0.9, POUR))
}

export function drawWire(pen: Pen, L: Light[]): void {
  const { f } = pen
  if (MAST_B < f.x0 - 2 || MAST_A > f.x1 + 2) return
  // The two masts.
  for (const x of [MAST_A, MAST_B]) {
    const wood = shade(L, WOOD, WOOD_LIT, x, wireY(x) + 1.5)
    bar(pen, [x, GY], [x, wireY(x) - 0.28], 0.15, wood)
    bar(pen, [x - 0.2, wireY(x) - 0.03], [x + 0.2, wireY(x) - 0.03], 0.06, wood)
    quad(pen, [[x - 0.1, wireY(x) - 0.28], [x + 0.1, wireY(x) - 0.28], [x, wireY(x) - 0.42]], wood)
  }
  // The wire.
  const pts: Pt[] = []
  for (let x = MAST_A; x <= MAST_B + 1e-6; x += 0.25) pts.push([x, wireY(x)])
  line(pen, pts, 0.022, rgba(FW.rail, 0.85))
  // The Niagara's lengths, lashed along under it: a slim paper tube following the wire's sag, and a row of short
  // lances pointing down from it, out of which the curtain pours.
  for (let j = 0; j < HANG.length; j++) {
    const cx = HANG[j]
    if (cx < f.x0 - 2 || cx > f.x1 + 2) continue
    const lit = pourAt(j, pen.t)
    const body = shade(L, pen.t > UNIT_AT[j] ? CHAR : TUBE, TUBE_LIT, cx, wireY(cx) + 0.3, 0.25 * lit)
    const run: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const x = cx - 0.86 + (1.72 * i) / 8
      run.push([x, wireY(x) + 0.12])
    }
    line(pen, run, 0.075, body)
    for (let i = 0; i < 6; i++) {
      const x = cx - 0.72 + (1.44 * i) / 5
      const y = wireY(x) + 0.12
      bar(pen, [x, y], [x, y + 0.2], 0.05, body)
    }
  }
}

/** The curtain: gold falling from every lit length, the newest flaring as it catches. */
export function drawCurtain(pen: Pen): void {
  const { t, ctx, k, f } = pen
  const gn = 6.5
  ctx.lineCap = 'round'
  for (let j = 0; j < HANG.length; j++) {
    const cx = HANG[j]
    if (cx < f.x0 - 2 || cx > f.x1 + 2) continue
    const s0 = t - UNIT_AT[j]
    if (s0 < 0 || s0 > POUR + 1.2) continue
    const y0 = wireY(cx) + 0.38
    // It catches: a flare along its length, and a gush of white sparks spat down and out from every lance at once.
    if (s0 < 0.3) glow(pen, cx, y0, 1.3, FW.fwWhite, 0.4 * (1 - s0 / 0.3), 0.3)
    if (s0 < 0.62) {
      for (let i = 0; i < 36; i++) {
        // Spat over the first few hundredths, not all in one frame (which would be a row of beads).
        const sa = s0 - 0.06 * hash(i, j, 34)
        if (sa < 0.012 || sa > 0.55) continue
        const x = cx + (hash(i, j, 31) - 0.5) * 1.5
        const ly = wireY(x) + 0.33
        const vx = (hash(i, j, 32) - 0.5) * 2.6
        const vy = 1.5 + 3 * hash(i, j, 33)
        const at = (s: number): Pt => [x + vx * s, ly + vy * s + 0.5 * gn * s * s]
        const [px, py] = at(sa)
        const [qx, qy] = at(Math.max(0, sa - 0.07))
        const fade = 1 - sa / 0.55
        ctx.strokeStyle = rgba(sa < 0.18 ? FW.fwWhite : FW.fwGold, 0.9 * fade)
        ctx.lineWidth = Math.max(0.7, 0.035 * k)
        ctx.beginPath()
        ctx.moveTo(qx * k, qy * k)
        ctx.lineTo(px * k, py * k)
        ctx.stroke()
      }
    }
    const rate = 150
    const from = UNIT_AT[j]
    const start = Math.max(from, t - 1.1)
    for (let i = Math.floor((start - from) * rate); i <= (t - from) * rate; i++) {
      const born = from + (i + 0.9 * (hash(i, j, 7) - 0.5)) / rate
      const a = t - born
      if (a < 0) continue
      const on = pourAt(j, born)
      if (on < 0.05 || hash(i, j, 9) > on) continue
      const life = 0.85 + 0.25 * hash(i, j, 2)
      if (a > life) continue
      // Out of the row of lances: a curtain along the whole length.
      const x = cx + (hash(i, j, 3) - 0.5) * 1.6
      const ly = wireY(x) + 0.33
      const at = (s: number): Pt => [x + (0.1 + 0.45 * (hash(i, j, 4) - 0.5)) * s, ly + 0.35 * s + 0.5 * gn * s * s]
      const [px, py] = at(a)
      const [qx, qy] = at(Math.max(0, a - 0.06))
      const fade = 1 - a / life
      ctx.strokeStyle = rgba(a < 0.1 ? FW.fwWhite : FW.fwGold, 0.8 * fade)
      ctx.lineWidth = Math.max(0.7, 0.03 * k)
      ctx.beginPath()
      ctx.moveTo(qx * k, qy * k)
      ctx.lineTo(px * k, py * k)
      ctx.stroke()
    }
  }
}

/* ------------------------------------------------------------------ guns */

function drawGun(pen: Pen, L: Light[], gun: Gun, base: string): void {
  const { t } = pen
  const fired = t >= gun.fires[0]
  const dy = dip(t - gun.fires[0], 0.07, 0.07)
  const body = shade(L, fired ? CHAR : base, TUBE_LIT, gun.x, gun.y - gun.h / 2)
  const top = tube(pen, [gun.x, gun.y - 0.02], gun.lean, gun.w, gun.h, body, mixHex(body, FW.iron, 0.5), dy)
  // Its paper band under the mouth, as the racks' tubes have.
  const dir: Pt = [Math.sin(gun.lean), -Math.cos(gun.lean)]
  const a: Pt = [top[0] - dir[0] * gun.h * 0.3, top[1] - dir[1] * gun.h * 0.3]
  const b: Pt = [top[0] - dir[0] * gun.h * 0.18, top[1] - dir[1] * gun.h * 0.18]
  bar(pen, a, b, gun.w * 1.02, shade(L, fired ? mixHex(BAND, CHAR, 0.5) : BAND, FW.signalRed, gun.x, gun.y - gun.h, -0.1))
}

/** A muzzle's flash as it fires: a short stab of flame and sparks along the tube, `s` seconds after. */
function muzzleFlash(pen: Pen, at: Pt, lean: number, s: number, size: number): void {
  if (s < 0 || s > 0.35) return
  const e = Math.exp(-s / 0.07)
  const dir: Pt = [Math.sin(lean), -Math.cos(lean)]
  glow(pen, at[0] + dir[0] * 0.5, at[1] + dir[1] * 0.5, 1.4 * size, FW.fwGold, 0.3 * e)
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = lean + (hash(i, 31, size * 10) - 0.5) * 0.7
    const len = size * (0.5 + 0.9 * hash(i, 32)) * (0.4 + 1.6 * (1 - e))
    const b: Pt = [at[0] + Math.sin(a) * len, at[1] - Math.cos(a) * len]
    line(pen, [at, b], 0.05 * size, rgba(i % 3 ? FW.fwGold : FW.fwWhite, 0.8 * e))
  }
}

export function drawBattery(pen: Pen, L: Light[]): void {
  const { f, t } = pen
  const xa = BATTERY_X0 - 0.55
  const xb = GUNS[GUNS.length - 1].x + 0.55
  if (xb < f.x0 - 3 || xa > f.x1 + 3) return
  const wood = shade(L, WOOD, WOOD_LIT, (xa + xb) / 2, GY - 0.4)
  for (const gun of GUNS) drawGun(pen, L, gun, PAPER)
  // The rack: a sill, a front rail, posts.
  rectC(pen, xa, GY - 0.14, xb, GY, wood)
  bar(pen, [xa, GY - 0.72], [xb, GY - 0.72], 0.08, wood)
  for (let x = xa + 0.04; x <= xb; x += (xb - xa - 0.08) / 4) bar(pen, [x, GY], [x, GY - 0.8], 0.08, wood)
  // The master fuse along the sill, burning from gun to gun down the coda.
  const lastFire = GUNS.filter((g) => t >= g.fires[0]).length
  const burnX = lastFire === 0 ? CRASH_AT[0] - 0.2 : GUNS[lastFire - 1].x
  line(pen, [[CRASH_AT[0] - 0.2, GY - 0.07], [burnX, GY - 0.07]], 0.03, rgba(FW.sleeper, 0.95))
  if (burnX < xb) line(pen, [[burnX, GY - 0.07], [xb - 0.1, GY - 0.07]], 0.035, FW.fuse)
  for (const gun of GUNS) {
    const s = t - gun.fires[0]
    const top: Pt = [gun.x + Math.sin(gun.lean) * gun.h, gun.y - Math.cos(gun.lean) * gun.h]
    muzzleFlash(pen, top, gun.lean, s, 1.3)
  }
  // The mines along the front: fat short tubes.
  for (let i = 0; i < MINES_X.length; i++) {
    const x = MINES_X[i]
    const body = shade(L, t >= CRASH ? CHAR : TUBE, TUBE_LIT, x, GY - 0.2)
    rectC(pen, x - 0.22, GY - 0.36, x + 0.22, GY, body)
    rectC(pen, x - 0.24, GY - 0.4, x + 0.24, GY - 0.33, mixHex(body, FW.iron, 0.5))
  }
}

/* ------------------------------------------------------------------ the great wheel */

const DRIVERS = DRIVERS_AT.length
const DRIVER_BURN = 4.6
/** Driver `j`'s place round the rim (radians, in the wheel's own turn), and when it lit. */
const driverAngle = (j: number): number => Math.PI + 0.33 + (j * 2 * Math.PI) / DRIVERS
/** How many drivers are burning, weighted by how hard. */
export function driversLit(t: number): number {
  let n = 0
  for (const at of DRIVERS_AT) n += driverOn(t - at)
  return n
}
const driverOn = (s: number): number => (s < 0 ? 0 : smooth(s, 0, 0.08) * (1 - smooth(s, DRIVER_BURN - 1.2, DRIVER_BURN)))

export function drawWheel(pen: Pen, L: Light[]): void {
  const { t, f } = pen
  const [cx, cy] = WHEEL
  if (cx + 4 < f.x0 || cx - 4 > f.x1) return
  const wood = shade(L, WOOD, WOOD_LIT, cx, (cy + GY) / 2)
  // The post and its two braces.
  bar(pen, [cx, GY], [cx, cy + 0.15], 0.22, wood)
  bar(pen, [cx - 0.75, GY], [cx - 0.05, GY - 1.1], 0.09, wood)
  bar(pen, [cx + 0.75, GY], [cx + 0.05, GY - 1.1], 0.09, wood)
  const turn = -turned(t)
  const rimC = shade(L, WOOD, WOOD_LIT, cx, cy, 0.1)
  // The spokes.
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2
    bar(pen, [cx, cy], [cx + Math.cos(a) * (WHEEL_R - 0.03), cy + Math.sin(a) * (WHEEL_R - 0.03)], 0.065, rimC)
  }
  // The rim.
  const { ctx, k } = pen
  ctx.strokeStyle = rimC
  ctx.lineWidth = 0.09 * k
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, WHEEL_R * k, 0, Math.PI * 2)
  ctx.stroke()
  // The hub: a square iron plate, turning.
  const hub: Pt[] = [0, 1, 2, 3].map((i) => [cx + 0.24 * Math.cos(turn + Math.PI / 4 + (i * Math.PI) / 2), cy + 0.24 * Math.sin(turn + Math.PI / 4 + (i * Math.PI) / 2)])
  quad(pen, hub, shade(L, FW.iron, IRON_LIT, cx, cy, 0.2))
  // The drivers: short tubes on the rim, each pointing back against the turn.
  for (let j = 0; j < DRIVERS; j++) {
    const a = driverAngle(j) + turn
    const p0: Pt = [cx + Math.cos(a) * (WHEEL_R + 0.02), cy + Math.sin(a) * (WHEEL_R + 0.02)]
    // Tangent pointing clockwise on the screen: backwards, against the wheel's counterclockwise turn.
    const tx = -Math.sin(a)
    const ty = Math.cos(a)
    const s = t - DRIVERS_AT[j]
    const body = shade(L, s > 0 ? CHAR : PAPER, TUBE_LIT, p0[0], p0[1], 0.1)
    // Lashed along the rim's outside, its mouth to the back.
    const ox = Math.cos(a) * 0.07
    const oy = Math.sin(a) * 0.07
    bar(pen, [p0[0] + ox - tx * 0.3, p0[1] + oy - ty * 0.3], [p0[0] + ox + tx * 0.26, p0[1] + oy + ty * 0.26], 0.15, body)
    bar(pen, [p0[0] + ox - tx * 0.06, p0[1] + oy - ty * 0.06], [p0[0] + ox + tx * 0.06, p0[1] + oy + ty * 0.06], 0.155, shade(L, s > 0 ? mixHex(BAND, CHAR, 0.5) : BAND, FW.signalRed, p0[0], p0[1], -0.1))
  }
}

/** The drivers' fire: each lit one spraying back against the turn, so the sparks curl away in a spiral. */
export function drawDriverFire(pen: Pen): void {
  const { t, ctx, k, f } = pen
  const [cx, cy] = WHEEL
  if (cx + 6 < f.x0 || cx - 6 > f.x1 || t < WHEEL_AT) return
  ctx.lineCap = 'round'
  const life = 0.6
  for (let j = 0; j < DRIVERS; j++) {
    const on0 = driverOn(t - DRIVERS_AT[j])
    if (on0 <= 0 && t - DRIVERS_AT[j] > DRIVER_BURN + life) continue
    const s0 = t - DRIVERS_AT[j]
    if (s0 < 0) continue
    // It catches: a spit of white.
    if (s0 < 0.15) {
      const a = driverAngle(j) - turned(t)
      glow(pen, cx + Math.cos(a) * WHEEL_R, cy + Math.sin(a) * WHEEL_R, 0.7, FW.fwWhite, 0.3 * (1 - s0 / 0.15), 0.5)
    }
    const rate = 48
    const from = DRIVERS_AT[j]
    const start = Math.max(from, t - life)
    for (let i = Math.floor((start - from) * rate); i <= (t - from) * rate; i++) {
      const born = from + (i + 0.8 * (hash(i, j, 21) - 0.5)) / rate
      const a0 = t - born
      if (a0 < 0 || a0 > life) continue
      const on = driverOn(born - from)
      if (hash(i, j, 22) > on) continue
      // Where the driver's mouth was when this spark left it, and how it was moving.
      const ang = driverAngle(j) - turned(born)
      const mx = cx + Math.cos(ang) * (WHEEL_R + 0.09) - Math.sin(ang) * 0.26
      const my = cy + Math.sin(ang) * (WHEEL_R + 0.09) + Math.cos(ang) * 0.26
      const w = omega(born)
      const sp = 9 + 5 * hash(i, j, 23)
      const vx = -Math.sin(ang) * sp + WHEEL_R * w * Math.sin(ang) + (hash(i, j, 24) - 0.5) * 0.8
      const vy = Math.cos(ang) * sp - WHEEL_R * w * Math.cos(ang) + (hash(i, j, 25) - 0.5) * 0.8
      const at = (s: number): Pt => [mx + vx * s, my + vy * s + 5 * s * s]
      const [x, y] = at(a0)
      const [px, py] = at(Math.max(0, a0 - 0.06))
      const fade = 1 - a0 / life
      ctx.strokeStyle = rgba(hash(i, j, 26) < 0.7 ? FW.fwWhite : FW.fwBlue, 0.8 * fade)
      ctx.lineWidth = Math.max(0.7, 0.03 * k)
      ctx.beginPath()
      ctx.moveTo(px * k, py * k)
      ctx.lineTo(x * k, y * k)
      ctx.stroke()
    }
  }
}

/* ------------------------------------------------------------------ the Titan, the flanking guns, the salutes */

/** The Titan's kick as it fires: down into its cradle, and back, slowly. */
const titanDrop = (t: number): number => dip(t - TITAN_FIRE, 0.12, 0.09)

export function drawTitan(pen: Pen, L: Light[]): void {
  const { t, f } = pen
  const x = TITAN_X
  if (x + 5 < f.x0 || x - 5 > f.x1) return
  for (const gun of FLANK) drawGun(pen, L, gun, PAPER)
  // The flanking guns' A-frames.
  for (const gun of FLANK) {
    const wood = shade(L, WOOD, WOOD_LIT, gun.x, GY - 0.4)
    bar(pen, [gun.x - 0.28, GY], [gun.x, GY - 0.62], 0.06, wood)
    bar(pen, [gun.x + 0.28, GY], [gun.x, GY - 0.62], 0.06, wood)
  }
  const dy = titanDrop(t)
  const hw = TITAN_W / 2
  const body = shade(L, FW.iron, IRON_LIT, x, LIP + 1, 0.15)
  const wood = shade(L, WOOD, WOOD_LIT, x, GY - 0.6)
  const hoop = shade(L, mixHex(FW.brass, FW.iron, 0.55), FW.brass, x, LIP + 0.6, 0.05)
  // The tube: a heavy iron mortar, a little wider at its foot.
  quad(pen, [[x - hw, LIP + dy], [x + hw, LIP + dy], [x + hw + 0.06, GY], [x - hw - 0.06, GY]], body)
  // Its round side: the moon's light down the right flank, a firelit strip down the left.
  quad(pen, [[x + hw * 0.55, LIP + dy], [x + hw * 0.8, LIP + dy], [x + hw * 0.84, GY], [x + hw * 0.58, GY]], rgba(FW.moonHalo, 0.16))
  quad(pen, [[x - hw * 0.62, LIP + dy], [x - hw * 0.42, LIP + dy], [x - hw * 0.44, GY], [x - hw * 0.65, GY]], rgba(FW.crateLit, 0.12 + 0.3 * litAt(L, x - hw, LIP + 1).a))
  // Its hoops.
  for (const yb of [LIP + 0.3, LIP + 1.2, GY - 0.7]) {
    const u = (yb - LIP) / (GY - LIP)
    const w = hw + 0.06 * u + 0.05
    rectC(pen, x - w, yb + dy, x + w, yb + 0.14 + dy, hoop)
  }
  // The mouth: the heavy rim, and its bore seen a little from above, glowing while the spark is down it.
  const inside = t > DIVE && t < TITAN_FIRE + 0.2
  mouth(pen, [x, LIP + dy], 0, hw + 0.08, shade(L, FW.iron, IRON_LIT, x, LIP, 0.15), inside ? mixHex(FW.iron, FW.coal, 0.45 + 0.25 * Math.sin(t * 31)) : FW.iron)
  if (inside) glow(pen, x, LIP - 0.2, 0.7, FW.coal, 0.35 * smooth(t, DIVE, DIVE + 0.2))
  // The cradle: low and heavy, two chocks and a sill either side, bracing the foot.
  for (const sx of [-1, 1]) {
    quad(pen, [[x + sx * (hw + 0.06), GY], [x + sx * (hw + 0.06), GY - 0.9], [x + sx * (hw + 0.5), GY]], wood)
    bar(pen, [x + sx * (hw + 0.12), GY - 0.05], [x + sx * (hw + 0.12), GY - 1.15], 0.1, wood)
  }
  rectC(pen, x - hw - 0.7, GY - 0.14, x + hw + 0.7, GY, wood)
  drawLeader(pen)
}

/** The leader: a fuse from the muzzle down the Titan's side to a curl on the ground, burning upward from its foot. */
function drawLeader(pen: Pen): void {
  const { t } = pen
  const wall = TITAN_X - TITAN_W / 2 - 0.035
  const dy = titanDrop(t)
  const foot = LEADER_FOOT[0]
  const path: Pt[] = [
    [foot - 0.22, GY - 0.03],
    [foot - 0.05, GY - 0.02],
    [foot + 0.12, GY - 0.05],
    [wall - 0.02, GY - 0.3],
    [wall, GY - 0.6],
    [wall, LIP + 0.05 + dy],
    [wall + 0.08, LIP - 0.05 + dy],
    [wall + 0.25, LIP + 0.05 + dy],
  ]
  // How far up it has burnt: the spark's height while it climbs; all of it once it is in.
  if (t < LEADER_AT) line(pen, path, 0.04, FW.fuse)
  else if (t >= DIVE) line(pen, path, 0.035, rgba(FW.sleeper, 0.95))
  else {
    const sy = sparkAt(t)[1] + 0.05
    const burnt: Pt[] = []
    const fresh: Pt[] = []
    for (let i = 0; i < path.length; i++) {
      const p = path[i]
      const isBurnt = i < 3 ? t > LEADER_AT + 0.25 * i : p[1] >= sy
      ;(isBurnt ? burnt : fresh).push(p)
    }
    if (burnt.length) burnt.push([wall, Math.max(LIP, sy)])
    if (fresh.length) fresh.unshift([wall, Math.max(LIP, sy)])
    if (burnt.length > 1) line(pen, burnt, 0.035, rgba(FW.sleeper, 0.95))
    if (fresh.length > 1) line(pen, fresh, 0.04, FW.fuse)
  }
}

/** The Titan's fire: a gout as the spark goes in, the great blast as it fires, the tail under the rising spark. */
export function drawTitanFire(pen: Pen): void {
  const { t } = pen
  const s = t - DIVE
  if (s >= 0 && s < 0.35) muzzleFlash(pen, [TITAN_X - 0.1, LIP], 0.1, s, 0.9)
  for (const gun of FLANK) muzzleFlash(pen, [gun.x + Math.sin(gun.lean) * gun.h, gun.y - Math.cos(gun.lean) * gun.h], gun.lean, t - gun.fires[0], 1.2)
  const b = t - TITAN_FIRE
  if (b >= 0 && b < 0.7) {
    // The blast: a column of fire and sparks thrown straight up out of the muzzle, the spark riding its head.
    const e = Math.exp(-b / 0.16)
    const reach = smooth(b, 0, 0.035)
    glow(pen, TITAN_X, LIP - 1.8, 4, FW.fwGold, 0.4 * e)
    additive(pen, () => {
      for (let i = 0; i < 48; i++) {
        const a = (hash(i, 41) - 0.5) * 0.36
        const len = (1.6 + 3.2 * hash(i, 42)) * reach * (0.55 + 0.45 * e)
        const x0 = TITAN_X + (hash(i, 43) - 0.5) * (TITAN_W - 0.3)
        const lift = 0.9 * b * hash(i, 45)
        const y0 = LIP - 0.05 - lift * 3
        const w = 0.05 + 0.08 * (1 - hash(i, 46))
        line(pen, [[x0, y0], [x0 + Math.sin(a) * len, y0 - Math.cos(a) * len]], w, rgba(i % 3 ? FW.fwGold : FW.fwWhite, 0.8 * e))
      }
      // Sparks thrown out sideways, falling away.
      for (let i = 0; i < 24; i++) {
        const side = i % 2 ? 1 : -1
        const v = 2.5 + 3 * hash(i, 47)
        const vx = side * v * (0.35 + 0.5 * hash(i, 48))
        const vy = -v * (0.8 + 0.4 * hash(i, 49))
        const at = (s: number): Pt => [TITAN_X + side * 0.5 + vx * s, LIP + vy * s + 6 * s * s]
        const p1 = at(b)
        const p0 = at(Math.max(0, b - 0.05))
        line(pen, [p0, p1], 0.035, rgba(FW.fwGold, 0.85 * (1 - b / 0.7)))
      }
    })
  }
  // The rising tail under the spark: glitter it sheds on the way up, falling slowly.
  if (b >= 0 && t <= TITAN_FIRE + 1.5) {
    const { ctx, k } = pen
    additive(pen, () => {
      ctx.lineCap = 'round'
      for (let i = 0; i < 60; i++) {
        const born = TITAN_FIRE + (i / 60) * 0.9
        const a = t - born
        if (a < 0 || a > 0.6) continue
        const [x, y] = sparkAt(born)
        const px = x + (hash(i, 44) - 0.5) * 0.5 * a
        const py = y + 0.15 + 1.4 * a * a
        const fade = 1 - a / 0.6
        ctx.strokeStyle = rgba(i % 5 ? FW.fwGold : FW.fwWhite, 0.8 * fade)
        ctx.lineWidth = Math.max(0.7, 0.035 * k)
        ctx.beginPath()
        ctx.moveTo(px * k, py * k)
        ctx.lineTo(px * k, (py + 0.14) * k)
        ctx.stroke()
      }
    })
  }
}

export function drawSaluteRack(pen: Pen, L: Light[]): void {
  const { t, f } = pen
  const [x, y] = SALUTE_RACK
  if (x + 2 < f.x0 || x - 2 > f.x1) return
  const wood = shade(L, WOOD, WOOD_LIT, x, y - 0.3)
  SALUTES.forEach((s, j) => {
    const tx = s.a[0]
    const fired = t >= s.from
    const body = shade(L, fired ? CHAR : TUBE, TUBE_LIT, tx, y - 0.3)
    tube(pen, [tx, y - 0.02], (s.b[0] - s.a[0]) * 0.03, 0.16, 0.55, body, mixHex(body, FW.iron, 0.5), dip(t - s.from, 0.03))
    void j
  })
  bar(pen, [x - 0.55, y - 0.3], [x + 0.5, y - 0.3], 0.06, wood)
  bar(pen, [x - 0.5, y], [x - 0.5, y - 0.4], 0.06, wood)
  bar(pen, [x + 0.45, y], [x + 0.45, y - 0.4], 0.06, wood)
  for (const s of SALUTES) muzzleFlash(pen, [s.a[0], s.a[1]], 0, t - s.from, 0.6)
}

/* ------------------------------------------------------------------ the crate, the ash */

/** How big the crate's fire is, 0..1: caught by the Titan's blast, blazing by the silence. */
export function crateFire(t: number): number {
  if (t < TITAN_FIRE + 0.15) return 0
  return 0.25 + 0.75 * smooth(t, TITAN_FIRE + 0.15, 146.4)
}

export function drawCrate(pen: Pen, L: Light[]): void {
  const { t, f } = pen
  const { x0, x1, h } = CRATE
  if (x1 + 2 < f.x0 || x0 - 2 > f.x1) return
  const fire = crateFire(t)
  const board = shade(L, WOOD, WOOD_LIT, (x0 + x1) / 2, GY - h / 2)
  const burnt = mixHex(board, CHAR, 0.4 * fire)
  // The inside, dark, where its end is broken open (the right quarter).
  rectC(pen, x0, GY - h, x1, GY, burnt)
  // Its boards: three long ones, with dark seams; the right end's broken short.
  const seams = [GY - h * 0.66, GY - h * 0.33]
  for (const y of seams) rectC(pen, x0, y - 0.02, x1 - 0.28, y + 0.02, rgba(FW.iron, 0.6))
  rectC(pen, x0, GY - h, x0 + 0.1, GY, mixHex(burnt, FW.iron, 0.3))
  // The broken end: a ragged mouth, black inside.
  quad(pen, [[x1 - 0.42, GY - h + 0.12], [x1 + 0.01, GY - h + 0.02], [x1 + 0.01, GY], [x1 - 0.3, GY], [x1 - 0.36, GY - 0.35], [x1 - 0.5, GY - 0.6]], mixHex(FW.iron, FW.coal, 0.18 * fire))
}

/** The crate's fire: tongues out of its broken end and over its top, bigger through the fall, blazing in the hush. */
export function drawCrateFire(pen: Pen): void {
  const { t } = pen
  const fire = crateFire(t)
  if (fire <= 0) return
  const { x0, x1, h } = CRATE
  const F = FIRES.railway
  // The glow of it, soft and wide: light, never a disc.
  glow(pen, x1 - 0.4, GY - 0.6, 1.8 + fire, F.body, 0.28 * fire)
  const tongues = [
    { x: x1 - 0.2, y: GY - 0.05, w: 0.5, h: 1.1 },
    { x: x1 - 0.38, y: GY - 0.2, w: 0.42, h: 1.25 },
    { x: x1 - 0.05, y: GY - 0.02, w: 0.36, h: 0.8 },
    { x: x1 - 0.7, y: GY - h + 0.05, w: 0.38, h: 0.7 },
    { x: x0 + 0.5, y: GY - h + 0.02, w: 0.3, h: 0.45 },
  ]
  tongues.forEach((tg, i) => {
    const flick = 0.12 * Math.sin(t * (9 + i * 2.3) + i) + 0.08 * Math.sin(t * (21 + i * 3.1) + 2 * i)
    const size = fire * (1 + flick) * (i === 4 ? smooth(t, 145.5, 147) : 1)
    if (size <= 0.02) return
    const lean = 0.12 * Math.sin(t * 3.1 + i) + 0.05
    tongue(pen, tg.x, tg.y, tg.w * size, tg.h * size, lean, rgba(F.rim, 0.9))
    tongue(pen, tg.x, tg.y + 0.02, tg.w * 0.72 * size, tg.h * 0.78 * size, lean * 0.8, rgba(F.body, 0.95))
    tongue(pen, tg.x, tg.y + 0.04, tg.w * 0.4 * size, tg.h * 0.45 * size, lean * 0.5, rgba(F.heart, 0.95))
  })
}

/** The ash round the Titan's foot and the crate: a low grey drift with embers breathing in it. */
export function drawAsh(pen: Pen): void {
  const { t, ctx, k } = pen
  const a = smooth(t, TITAN_FIRE, TITAN_FIRE + 1.5)
  if (a <= 0) return
  const xa = LEADER_FOOT[0] - 1.2
  const xb = REST[0] + 1.3
  ctx.fillStyle = rgba(ASHC, 0.95 * a)
  ctx.beginPath()
  ctx.moveTo(xa * k, GY * k)
  for (let i = 0; i <= 40; i++) {
    const x = xa + ((xb - xa) * i) / 40
    const u = i / 40
    const hgt = (0.05 + 0.08 * hash(i, 51)) * Math.sin(Math.PI * u) ** 0.5
    ctx.lineTo(x * k, (GY - hgt * a) * k)
  }
  ctx.lineTo(xb * k, GY * k)
  ctx.closePath()
  ctx.fill()
  // Embers breathing in it.
  for (let i = 0; i < 22; i++) {
    const x = xa + (xb - xa) * hash(i, 52)
    const y = GY - 0.03 - 0.05 * hash(i, 53)
    const b = 0.5 + 0.5 * Math.sin(t * (1.3 + hash(i, 54)) + i * 1.7)
    ctx.fillStyle = rgba(i % 3 ? FW.coal : FW.coalHot, 0.55 * a * b)
    ctx.fillRect((x - 0.02) * k, (y - 0.012) * k, 0.04 * k, 0.024 * k)
  }
}

/* ------------------------------------------------------------------ what goes up */

/** A rising comet or shell: a head that is a short streak, and a glittering tail behind it. */
export function drawRise(pen: Pen, r: Rise): void {
  const { t, ctx, k } = pen
  if (t < r.from || t >= r.to) return
  // The tail, in time, but never longer than a cell and a half: a fast shell's is not a ruled line.
  const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1])
  const speed = (2 * len) / Math.max(0.05, r.to - r.from)
  const tail = Math.min(r.comet ? 0.34 : 0.24, 1.5 / Math.max(1e-6, speed))
  const n = 8
  ctx.lineCap = 'round'
  let prev = riseAt(r, Math.max(r.from, t - tail))
  for (let i = 1; i <= n; i++) {
    const s = t - tail + (tail * i) / n
    if (s < r.from) continue
    const q = riseAt(r, s)
    const u = i / n
    ctx.strokeStyle = rgba(r.comet ? r.col : FW.fwGold, (r.comet ? 0.8 : 0.55) * u * u)
    ctx.lineWidth = Math.max(0.6, (r.comet ? 0.07 : 0.035) * u * k)
    ctx.beginPath()
    ctx.moveTo(prev[0] * k, prev[1] * k)
    ctx.lineTo(q[0] * k, q[1] * k)
    ctx.stroke()
    prev = q
  }
  // The head: a short white streak along its way (never shorter than a fifth of a cell, so never a dot).
  const h = riseAt(r, t)
  const dx = r.b[0] - r.a[0]
  const dy = r.b[1] - r.a[1]
  const dl = Math.hypot(dx, dy) || 1
  const h0: Pt = [h[0] - (dx / dl) * 0.2, h[1] - (dy / dl) * 0.2]
  ctx.strokeStyle = rgba(FW.fwWhite, 0.95)
  ctx.lineWidth = Math.max(0.8, (r.comet ? 0.06 : 0.04) * k)
  ctx.beginPath()
  ctx.moveTo(h0[0] * k, h0[1] * k)
  ctx.lineTo(h[0] * k, h[1] * k)
  ctx.stroke()
  // Sparks shed from the tail, falling away.
  for (let i = 0; i < (r.comet ? 10 : 5); i++) {
    const born = t - 0.5 * hash(i, 61, r.from * 7)
    if (born < r.from) continue
    const a = t - born
    const p0 = riseAt(r, born)
    const x = p0[0] + (hash(i, 62) - 0.5) * 0.4 * a
    const y = p0[1] + 2.5 * a * a
    ctx.fillStyle = rgba(r.comet ? r.col : FW.fwGold, 0.7 * (1 - a / 0.5))
    ctx.fillRect((x - 0.012) * k, (y - 0.03) * k, 0.024 * k, 0.06 * k)
  }
}

/** A burst: streaks out from where it broke, slowing, drooping, fading; never a disc, never a ring. */
export function drawBurst(pen: Pen, b: Burst): void {
  const { t, ctx, k, f } = pen
  const s = t - b.at
  // Not in its first hundredth: a burst that small is a dot, and a dot near the spark is a second ball.
  if (s < 0.01 || s > b.life) return
  const reach = b.v / b.k + 2
  if (b.x + reach < f.x0 || b.x - reach > f.x1 || b.y + reach + 3 < f.y0 || b.y - reach > f.y1) return
  ctx.lineCap = 'round'
  const fadeAll = 1 - smooth(s, b.life * 0.45, b.life)
  const stars = (count: number, speed: number, trail: number, col: string, tail: string, width: number, salt: number, sub = false) => {
    for (let i = 0; i < count; i++) {
      let ang: number
      if (b.fan !== undefined) ang = -Math.PI / 2 + (i / (count - 1) - 0.5) * 2 * b.fan + (hash(i, salt, b.seed) - 0.5) * 0.08
      else ang = (2 * Math.PI * (i + 0.6 * hash(i, salt, b.seed))) / count + b.seed
      const v = speed * (0.82 + 0.32 * hash(i, salt + 1, b.seed))
      const vx = Math.cos(ang) * v
      const vy = Math.sin(ang) * v
      // Glitter: willows and the Titan's stars twinkle as they burn down.
      const tw = b.kind === 'willow' || b.kind === 'titan' || b.kind === 'chrys' ? 0.75 + 0.25 * Math.sin(t * 40 + i * 2.1) : 1
      const m = 6
      // A salute's stars are short dashes flung out of its flash, not spokes from its centre.
      const from = b.kind === 'salute' ? Math.max(0, s - 0.035) : Math.max(s - trail, s * 0.22)
      let prev = starAt(b, vx, vy, from)
      for (let q = 1; q <= m; q++) {
        const ss = from + ((s - from) * q) / m
        const cur = starAt(b, vx, vy, ss)
        const u = q / m
        const head = u > 0.8
        ctx.strokeStyle = rgba(head ? (s < 0.08 ? FW.fwWhite : col) : tail, (head ? 0.95 : 0.7 * u) * fadeAll * tw)
        ctx.lineWidth = Math.max(0.6, width * (0.35 + 0.65 * u) * smooth(s, 0, 0.12) * k)
        ctx.beginPath()
        ctx.moveTo(prev[0] * k, prev[1] * k)
        ctx.lineTo(cur[0] * k, cur[1] * k)
        ctx.stroke()
        prev = cur
      }
      void sub
    }
  }
  switch (b.kind) {
    case 'crossette': {
      const split = 0.34
      if (s < split) stars(b.n, b.v, b.trail, b.col, b.col, 0.06, 1)
      else {
        // Each star splits into four going off at angles: a crossette's cross.
        for (let i = 0; i < b.n; i++) {
          const ang = (2 * Math.PI * (i + 0.6 * hash(i, 1, b.seed))) / b.n + b.seed
          const v = b.v * (0.82 + 0.32 * hash(i, 2, b.seed))
          const at = starAt(b, Math.cos(ang) * v, Math.sin(ang) * v, split)
          const child: Burst = { ...b, x: at[0], y: at[1], v: b.v * 0.45, n: 4, seed: b.seed + i * 0.37 + ang, fan: undefined }
          const cs = s - split
          for (let c = 0; c < 4; c++) {
            const ca = ang + (c - 1.5) * 0.7
            const cv = child.v
            let prev = starAt(child, Math.cos(ca) * cv, Math.sin(ca) * cv, Math.max(0, cs - 0.16))
            const cur = starAt(child, Math.cos(ca) * cv, Math.sin(ca) * cv, cs)
            ctx.strokeStyle = rgba(b.col, 0.9 * fadeAll)
            ctx.lineWidth = Math.max(0.6, 0.05 * k)
            ctx.beginPath()
            ctx.moveTo(prev[0] * k, prev[1] * k)
            ctx.lineTo(cur[0] * k, cur[1] * k)
            ctx.stroke()
            prev = cur
          }
        }
      }
      break
    }
    case 'titan': {
      stars(b.n, b.v, b.trail, s < 0.25 ? FW.fwWhite : FW.fwGold, b.tail ?? b.col, 0.07, 1)
      // A pistil of white inside it.
      stars(22, b.v * 0.42, 0.2, FW.fwWhite, FW.fwWhite, 0.05, 7)
      break
    }
    case 'palm':
      stars(b.n, b.v, b.trail, b.col, b.tail ?? b.col, 0.13, 1)
      break
    case 'salute': {
      // A flash-bang: a ragged spray of short white streaks thrown out of the flash at every angle and speed,
      // flickering and gone. Uneven, so it reads as a bang and never as clean spokes or a ring.
      const out = (u: number) => 2.0 * (1 - Math.exp(-u / 0.05))
      const fade = 1 - smooth(s, b.life * 0.3, b.life)
      for (let i = 0; i < 34; i++) {
        const on = hash(i, b.seed, Math.floor(t * 40)) > 0.25 ? 1 : 0.3
        const ang = 2 * Math.PI * hash(i, b.seed, 1)
        const spd = 0.35 + 0.7 * hash(i, b.seed, 2)
        const r1 = out(s) * spd
        const r0 = out(Math.max(0, s - 0.03)) * spd * 0.9
        const drop = 0.8 * s * s
        ctx.strokeStyle = rgba(i % 4 ? FW.fwWhite : FW.fwGold, 0.95 * fade * on)
        ctx.lineWidth = Math.max(0.7, 0.045 * k)
        ctx.beginPath()
        ctx.moveTo((b.x + Math.cos(ang) * r0) * k, (b.y + Math.sin(ang) * r0 + drop) * k)
        ctx.lineTo((b.x + Math.cos(ang) * r1) * k, (b.y + Math.sin(ang) * r1 + drop) * k)
        ctx.stroke()
      }
      break
    }
    default:
      stars(b.n, b.v, b.trail, b.col, b.tail ?? b.col, b.kind === 'small' ? 0.05 : b.kind === 'mine' ? 0.075 : 0.065, 1)
  }
}

/** The Titan's stars crackle on the chord after it: white flecks all over, a moment. */
export function drawCrackle(pen: Pen, at: number): void {
  const { t, ctx, k } = pen
  const s = t - at
  if (s < 0 || s > 0.55) return
  const b = BURSTS.find((x) => x.kind === 'titan')
  if (!b) return
  const u = t - b.at
  for (let i = 0; i < 70; i++) {
    const ang = 2 * Math.PI * hash(i, 71)
    const v = b.v * (0.5 + 0.55 * hash(i, 72))
    const [x, y] = starAt(b, Math.cos(ang) * v, Math.sin(ang) * v, u)
    const on = hash(i, 73, Math.floor(t * 30)) > 0.45 ? 1 : 0
    const a = on * (1 - s / 0.55)
    if (a <= 0) continue
    ctx.fillStyle = rgba(FW.fwWhite, 0.9 * a)
    ctx.fillRect((x - 0.03) * k, (y - 0.03) * k, 0.06 * k, 0.06 * k)
  }
}

/* ------------------------------------------------------------------ smoke, embers */

/** A puff of smoke: soft layered clouds (gradients, no edges), drifting with the wind, lit by what burns near it. */
export function drawPuff(pen: Pen, L: Light[], q: Puff): void {
  const { t, ctx, k, f } = pen
  const s = t - q.at
  if (s < 0 || s > q.life) return
  const grow = 1 - Math.exp(-s / (q.life * 0.22))
  const r = q.r0 + (q.r1 - q.r0) * grow
  const x = q.x + WIND[0] * s + 0.15 * Math.sin(s * 0.7 + q.seed)
  const y = q.y + WIND[1] * s
  if (x + r * 2 < f.x0 || x - r * 2 > f.x1 || y + r * 2 < f.y0 || y - r * 2 > f.y1) return
  const env = smooth(s, 0, 0.5) * (1 - smooth(s, q.life * 0.4, q.life))
  if (env <= 0.01) return
  const lit = litAt(L, x, y)
  const col = mixHex(FW.smoke, lit.col, Math.min(0.45, lit.a * 0.6))
  for (let i = 0; i < 3; i++) {
    const ox = (hash(q.seed, i, 81) - 0.5) * r * 1.2
    const oy = (hash(q.seed, i, 82) - 0.5) * r * 0.5
    const rr = r * (0.6 + 0.45 * hash(q.seed, i, 83))
    const a = q.a * env * (0.5 + 0.3 * hash(q.seed, i, 84))
    ctx.save()
    ctx.translate((x + ox) * k, (y + oy) * k)
    ctx.scale(1, 0.68)
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * k)
    gr.addColorStop(0, rgba(col, a))
    gr.addColorStop(0.5, rgba(col, a * 0.65))
    gr.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = gr
    ctx.fillRect(-rr * k, -rr * k, 2 * rr * k, 2 * rr * k)
    ctx.restore()
  }
}

/**
 * In the hush, the finale's smoke drifts across the moon: a soft bank that comes in from its left with the wind and
 * dims it, and is still on it as the roll comes. (The moon holds its place in the frame: EXPRESS's `moonAt`.)
 */
export function drawMoonSmoke(pen: Pen): void {
  const { t, ctx, k, p } = pen
  if (t < 146.2 || t > OUT + 0.3) return
  const m = moonAt(p, k, t)
  const u = (t - 146.2) / (OUT - 146.2)
  const env = smooth(t, 146.2, 146.9)
  for (let i = 0; i < 4; i++) {
    const x = m.x + m.r * (-4.2 + 4.6 * u + 1.3 * i - 1.2 * hash(i, 101))
    const y = m.y + m.r * (0.6 * (hash(i, 102) - 0.5) + 0.25 * Math.sin(t * 0.6 + i))
    const rr = m.r * (1.5 + 0.8 * hash(i, 103))
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.scale(1, 0.55)
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * k)
    gr.addColorStop(0, rgba(FW.smoke, 0.55 * env))
    gr.addColorStop(0.55, rgba(FW.smoke, 0.35 * env))
    gr.addColorStop(1, rgba(FW.smoke, 0))
    ctx.fillStyle = gr
    ctx.fillRect(-rr * k, -rr * k, 2 * rr * k, 2 * rr * k)
    ctx.restore()
  }
}

/** Embers coming down slowly through the smoke after the finale, round where the spark lies. */
export function drawEmbers(pen: Pen): void {
  const { t, ctx, k } = pen
  if (t < 145.3 || t > OUT + 0.3) return
  const cx = REST[0]
  for (let i = 0; i < 26; i++) {
    const life = 2.2 + 1.4 * hash(i, 91)
    const born = 145.3 + ((hash(i, 92) * 3 + i * 0.07) % 3) - 0.8
    const s = t - born
    if (s < 0 || s > life) continue
    const x = cx - 4.5 + 9 * hash(i, 93) + WIND[0] * s + 0.1 * Math.sin(s * 2 + i)
    const y = GY - 6.5 + 2.5 * hash(i, 94) + 1.5 * s
    if (y > GY - 0.05) continue
    const b = (0.6 + 0.4 * Math.sin(t * (7 + 5 * hash(i, 95)) + i)) * (1 - s / life)
    ctx.fillStyle = rgba(i % 4 ? FW.coal : FW.coalHot, 0.8 * b)
    ctx.fillRect((x - 0.012) * k, (y - 0.012) * k, 0.024 * k, 0.024 * k)
  }
}

/**
 * The flash of a heavy shell or a salute: light thrown out from where it broke across the whole frame, warm for a
 * moment and gone. A pool round the burst, not a flat veil, so the night stays night round it.
 */
export function drawWash(pen: Pen): void {
  const { t, ctx, k, f } = pen
  const w = f.x1 - f.x0
  const h = f.y1 - f.y0
  const reach = Math.hypot(w, h)
  const flash = (x: number, y: number, col: string, a: number) => {
    if (a < 0.004) return
    const gr = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, reach * k)
    gr.addColorStop(0, rgba(col, Math.min(0.32, a)))
    gr.addColorStop(0.3, rgba(col, Math.min(0.32, a) * 0.45))
    gr.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = gr
    ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const b of BURSTS) {
    const s = t - b.at
    if (s < 0 || s > 0.6 || b.wash <= 0) continue
    const salute = b.kind === 'salute'
    const a = b.wash * (salute ? 0.36 * Math.exp(-s / 0.05) : 0.24 * Math.exp(-s / 0.11))
    const col = salute ? FW.fwWhite : b.kind === 'mine' ? FW.coalHot : mixHex(b.col, FW.fwGold, 0.5)
    flash(b.x, b.y, col, a)
  }
  const blast = t - TITAN_FIRE
  if (blast >= 0 && blast < 0.5) flash(TITAN_X, LIP - 1, FW.fwGold, 0.26 * Math.exp(-blast / 0.08))
  ctx.restore()
}

export { R }
