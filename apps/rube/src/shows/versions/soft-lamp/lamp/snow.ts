import { mixHex } from '../../../../parts'
import { rgba } from './canvas'
import { GLASS, WINDOW } from './desk'
import { smooth } from './music'
import { coldAt, coverAt, hash, lampAt, nightAt, snowAt } from './world'

/**
 * The first snow (`snowAt`, `world.ts`), through the glass: flakes falling past at three depths, slow and drifting,
 * the nearest soft when the camera is close; a few landing on the pane and melting there; and what settles. It
 * whitens the roofs across the street (`roofSnow`, drawn on each roof by `sky.ts`), gathers on the ledge outside in
 * the foot of each pane, deepest in the corners, and frosts the corners of the glass. What has settled stays, white
 * under the moon, to the end.
 */

type Ctx = CanvasRenderingContext2D

const W = GLASS.x1 - GLASS.x0
const H = GLASS.y1 - GLASS.y0
const BAR_HALF = 0.045

/** The three depths flakes fall at: far over the roofs, between, and close past the glass. */
export const FLAKES = [
  { p: 0.38, n: 230, r: 0.0085, v: 0.2, sway: 0.05, a: 0.6 },
  { p: 0.2, n: 120, r: 0.014, v: 0.32, sway: 0.08, a: 0.78 },
  { p: 0.07, n: 42, r: 0.024, v: 0.48, sway: 0.12, a: 0.9 },
] as const

/** The colour of snow at `t`: the city's light in it, bluer and brighter once the moon is up, warmer toward the lamp. */
function snowColor(t: number, warm = 0): string {
  const moon = smooth(nightAt(t), 0.82, 0.95)
  return mixHex(mixHex('#D8D4EE', '#E8EEFF', moon), '#F6D6B8', warm * 0.5 * lampAt(t))
}

/**
 * The flakes of depth `k` (0 far to 2 near), in that layer's own coordinates. Each falls at its own pace and drifts on
 * the air, a slow sway and a little wind; as many as the snow has. `blur` (cells, on the wall) is how soft the camera
 * sees what is past the glass; the nearer flakes open into soft discs by it.
 */
export function flakes(ctx: Ctx, t: number, k: 0 | 1 | 2, blur = 0): void {
  // Sleet first: the last of the rain is cold before it is white.
  const s = snowAt(t) * smooth(coldAt(t), 0.4, 1)
  if (s < 0.01) return
  const L = FLAKES[k]
  const count = L.n * s
  // Wider than the glass, for the camera's moves that slide the layer along behind the bars.
  const X0 = GLASS.x0 - 1.4
  const XW = W + 2.8
  const HH = H + 0.5
  const open = blur * (1 - L.p) * 0.9
  const base = snowColor(t)
  for (let i = 0; i < L.n; i++) {
    const a = Math.min(1, count - i)
    if (a <= 0) break
    const v = L.v * (0.75 + 0.5 * hash(i, k, 301))
    const y = GLASS.y0 - 0.25 + ((hash(i, k, 302) * HH + t * v) % HH)
    const sway = L.sway * Math.sin(t * (0.5 + 0.6 * hash(i, k, 304)) + hash(i, k, 305) * 6.3)
    const x = X0 + ((((hash(i, k, 303) * XW + t * 0.045 + sway) % XW) + XW) % XW)
    const r0 = L.r * (0.65 + 0.7 * hash(i, k, 306))
    const r = Math.max(r0, open)
    const alpha = L.a * a * (0.6 + 0.4 * hash(i, k, 307)) * Math.min(1, (r0 * r0) / (r * r) * 1.6)
    if (alpha < 0.01) continue
    const warm = Math.max(0, Math.min(1, (x - GLASS.x0) / W)) ** 2
    ctx.fillStyle = rgba(warm > 0.05 ? mixHex(base, '#F6D6B8', warm * 0.35 * lampAt(t)) : base, alpha)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * A few flakes that land on the glass: each a small white star for a moment, then a drop of water as the room's warmth
 * melts it, then gone; then another lands somewhere else.
 */
export function landed(ctx: Ctx, t: number): void {
  const s = snowAt(t) * smooth(coldAt(t), 0.6, 1)
  if (s < 0.02) return
  const color = snowColor(t)
  const count = 16 * s
  for (let i = 0; i < 16; i++) {
    const a = Math.min(1, count - i)
    if (a <= 0) break
    const life = 7 + hash(i, 311) * 6
    const u = (t + hash(i, 312) * life) / life
    const n = Math.floor(u)
    const f = u - n
    const x = GLASS.x0 + 0.08 + hash(i, n, 313) * (W - 0.16)
    const y = GLASS.y0 + 0.15 + hash(i, n, 314) * (H - 0.5)
    if (Math.abs(x - WINDOW.mullion) < 0.08 || Math.abs(y - WINDOW.transom) < 0.08) continue
    const r = 0.016 + hash(i, n, 315) * 0.012
    // Lands, sits a moment white, melts into a bead.
    const white = smooth(f, 0, 0.04) * (1 - smooth(f, 0.25, 0.6))
    const wet = smooth(f, 0.3, 0.55) * (1 - smooth(f, 0.85, 1))
    if (white > 0.01) {
      ctx.strokeStyle = rgba(color, 0.75 * white * a)
      ctx.lineWidth = 0.0045
      ctx.beginPath()
      for (let arm = 0; arm < 3; arm++) {
        const ang = (arm * Math.PI) / 3 + hash(i, n, 316)
        const ux = Math.cos(ang) * r
        const uy = Math.sin(ang) * r
        ctx.moveTo(x - ux, y - uy)
        ctx.lineTo(x + ux, y + uy)
      }
      ctx.stroke()
      ctx.fillStyle = rgba(color, 0.85 * white * a)
      ctx.beginPath()
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    if (wet > 0.01) {
      ctx.fillStyle = rgba('#9AA2D2', 0.3 * wet * a)
      ctx.beginPath()
      ctx.ellipse(x, y + 0.004, r * 0.42, r * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgba('#E4E6FA', 0.45 * wet * a)
      ctx.beginPath()
      ctx.arc(x + r * 0.12, y - r * 0.15, r * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** The snow on a roof `w` wide whose top is at `x, y`: a soft white cap, a little over its edges. `far` is paler, seen through more air. */
export function roofSnow(ctx: Ctx, t: number, x: number, y: number, w: number, far: boolean): void {
  const c = coverAt(t)
  if (c < 0.01) return
  const h = (far ? 0.026 : 0.034) * c
  const color = mixHex(snowColor(t), far ? '#8E8CB8' : '#B9BCE0', far ? 0.45 : 0.25)
  ctx.fillStyle = rgba(color, Math.min(1, c * 1.6))
  const o = 0.012 * c
  ctx.beginPath()
  ctx.moveTo(x - o, y + 0.004)
  ctx.lineTo(x - o, y - h * 0.4)
  ctx.quadraticCurveTo(x - o, y - h, x + h, y - h)
  ctx.lineTo(x + w - h, y - h)
  ctx.quadraticCurveTo(x + w + o, y - h, x + w + o, y - h * 0.4)
  ctx.lineTo(x + w + o, y + 0.004)
  ctx.closePath()
  ctx.fill()
}

/** The drift height along a lower pane's foot at `x` (the pane from `a` to `b`): deepest in its corners, uneven. */
function drift(x: number, a: number, b: number, c: number): number {
  const d = Math.min(x - a, b - x)
  const corner = Math.exp(-d / 0.22)
  const lumps = 0.012 * Math.sin(x * 23 + 1.7) + 0.008 * Math.sin(x * 41 + 0.4)
  return c * (0.06 + 0.15 * corner + lumps)
}

/**
 * What has settled at the window: on the ledge outside, in the foot of each lower pane and along the meeting rail
 * between the upper and lower, deepest in the corners; and frost in the glass's corners, the room's warmth keeping
 * the middle clear. On the glass, sharp at any frame.
 */
export function settled(ctx: Ctx, t: number): void {
  const c = coverAt(t)
  const frost = Math.max(c, 0.6 * snowAt(t))
  if (frost < 0.01) return
  const color = snowColor(t)
  const panes: [number, number][] = [
    [GLASS.x0, WINDOW.mullion - BAR_HALF],
    [WINDOW.mullion + BAR_HALF, GLASS.x1],
  ]
  // Frost: a pale bloom in each corner of each pane, crystalline at its edge.
  for (const [a, b] of panes) {
    for (const [y0, y1] of [[GLASS.y0, WINDOW.transom - BAR_HALF], [WINDOW.transom + BAR_HALF, GLASS.y1]] as const) {
      for (const [cx, cy, deep] of [[a, y0, 0.6], [b, y0, 0.6], [a, y1, 1], [b, y1, 1]] as const) {
        const rr = 0.42 * deep
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr)
        g.addColorStop(0, rgba('#DCE0FA', 0.22 * frost * deep))
        g.addColorStop(0.55, rgba('#C9CDF0', 0.08 * frost * deep))
        g.addColorStop(1, rgba('#C9CDF0', 0))
        ctx.fillStyle = g
        ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2)
        // A few fronds of it reaching out of the corner.
        ctx.strokeStyle = rgba('#E4E8FF', 0.16 * frost * deep)
        ctx.lineWidth = 0.004
        ctx.beginPath()
        for (let j = 0; j < 7; j++) {
          const ang = Math.atan2(cy === y0 ? 1 : -1, cx === a ? 1 : -1) + (hash(j, cx * 10, 321) - 0.5) * 1.3
          const len = rr * (0.35 + 0.45 * hash(j, cy * 10, 322)) * Math.min(1, frost * 1.4)
          const ex = cx + Math.cos(ang) * len
          const ey = cy + Math.sin(ang) * len
          ctx.moveTo(cx, cy)
          ctx.lineTo(ex, ey)
          for (const u of [0.4, 0.7]) {
            const bx = cx + (ex - cx) * u
            const by = cy + (ey - cy) * u
            for (const side of [-1, 1]) {
              const ba = ang + side * 0.7
              ctx.moveTo(bx, by)
              ctx.lineTo(bx + Math.cos(ba) * len * 0.22, by + Math.sin(ba) * len * 0.22)
            }
          }
        }
        ctx.stroke()
      }
    }
  }
  if (c < 0.01) return
  // The drifts: on the ledge in the foot of each lower pane, and a thinner line along the meeting rail.
  for (const [a, b] of panes) {
    for (const [y, k] of [[GLASS.y1, 1], [WINDOW.transom - BAR_HALF, 0.35]] as const) {
      const steps = 40
      ctx.beginPath()
      ctx.moveTo(a, y)
      for (let j = 0; j <= steps; j++) {
        const x = a + ((b - a) * j) / steps
        ctx.lineTo(x, y - drift(x, a, b, c) * k)
      }
      ctx.lineTo(b, y)
      ctx.closePath()
      const top = y - 0.16 * k
      const g = ctx.createLinearGradient(0, top, 0, y)
      g.addColorStop(0, rgba(color, 0.95))
      g.addColorStop(1, rgba(mixHex(color, '#7E7FB0', 0.4), 0.95))
      ctx.fillStyle = g
      ctx.fill()
      // Its crest, catching the light.
      ctx.beginPath()
      for (let j = 0; j <= steps; j++) {
        const x = a + ((b - a) * j) / steps
        const yy = y - drift(x, a, b, c) * k
        if (j === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.strokeStyle = rgba('#FFFFFF', 0.35 * c)
      ctx.lineWidth = 0.008
      ctx.stroke()
    }
  }
}
