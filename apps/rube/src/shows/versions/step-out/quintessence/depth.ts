import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { frame, hash } from './kit'

/**
 * Depth: what every place draws its world with besides its machine. A place is a set on three planes at least, and
 * each plane moves at its own speed under the camera, so the frame reads as a world and not a diagram:
 *
 * - `layer`: a plane at depth `z`. 1 is the machine's own plane; under 1 is behind it (0.2 is a far range that hardly
 *   moves, 0 is painted on the lens), over 1 is in front (1.4 is a post the camera passes close). The plane also
 *   scales less (or more) than the world when the camera pushes in or pulls back, as far things do.
 * - `motes`: things in the air, scattered over a plane and wrapped round the frame so there are always some in it:
 *   dust in a beam, snow, ash, embers, bubbles, marine snow. Drawn in one path a colour, so a few hundred are cheap.
 * - `glow`, `shaft`, `vignette`, `wash`: the light. A source has a bloom; a window or a lamp throws a shaft; the
 *   frame's edges fall away; a grade colours the whole plate.
 *
 * Everything here draws from the time it is given and the camera read back off the canvas (`frame`), never the wall
 * clock, so a still at any time is the same as that frame of the show. Every function draws in the piece's own cells
 * times `k`, as the parts do, straight onto the 2D context: p5 is too slow for hundreds of motes a frame.
 *
 * Walter is never drawn here and nothing here is drawn over him: these are drawn in the `draw` pass, under the balls,
 * so his colour is his own whatever the grade does round him.
 */

type C2 = CanvasRenderingContext2D

/** The frame in the piece's cells (`frame`), with its size and `k`: what every layer is placed from. */
export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
  /** The frame's width and height in cells. */
  w: number
  h: number
  k: number
}

export function view(p: p5, k: number): View {
  const f = frame(p, k)
  return { ...f, w: f.x1 - f.x0, h: f.y1 - f.y0, k }
}

/**
 * Draw `draw` on a plane at depth `z`, in that plane's own coordinates. At `anchor` (a point of the world) and with
 * the frame `ref` cells tall, the plane and the world coincide; as the camera goes from there the plane moves `z`
 * as far on the screen as the world does, and scales `(h / ref)^(1 - z)` against it. Inside `draw`, `inner` is the
 * frame in the plane's coordinates, so a plane can fill exactly what is seen of it.
 */
export function layer(ctx: C2, v: View, z: number, anchor: Pt, ref: number, draw: (inner: View) => void): void {
  const s = Math.pow(v.h / ref, 1 - z)
  const ox = anchor[0] + z * (v.cx - anchor[0])
  const oy = anchor[1] + z * (v.cy - anchor[1])
  const k = v.k
  ctx.save()
  ctx.translate(v.cx * k, v.cy * k)
  ctx.scale(s, s)
  ctx.translate(-ox * k, -oy * k)
  const hw = v.w / 2 / s
  const hh = v.h / 2 / s
  draw({ x0: ox - hw, y0: oy - hh, x1: ox + hw, y1: oy + hh, cx: ox, cy: oy, w: 2 * hw, h: 2 * hh, k })
  ctx.restore()
}

/** Where a point of a plane at depth `z` is in the world at this frame (for a layer that must meet the set, as a hill's foot meets the road). */
export function onLayer(v: View, z: number, anchor: Pt, ref: number, at: Pt): Pt {
  const s = Math.pow(v.h / ref, 1 - z)
  const ox = anchor[0] + z * (v.cx - anchor[0])
  const oy = anchor[1] + z * (v.cy - anchor[1])
  return [v.cx + (at[0] - ox) * s, v.cy + (at[1] - oy) * s]
}

/* ------------------------------------------------------------------ in the air */

export interface Motes {
  /** How many in a tile `tile` cells across (the tile repeats to fill the frame). */
  n: number
  /** A different scatter for each set of motes. */
  seed: number
  /** The tile the scatter wraps in, cells: [w, h]. */
  tile: Pt
  /** Radius in cells: the least and the most. */
  r: Pt
  /** Drift, cells a second: [vx, vy] (y down). Each mote's speed is spread ±`spread` of it. */
  v: Pt
  spread?: number
  /** A sway across the drift: amplitude in cells and how many times a second. */
  sway?: Pt
  /** 'rgba(…)' or '#rrggbb': what they are. */
  color: string
  /** Twinkle: each mote's alpha goes between 1 - twinkle and 1, at its own pace (one path per brightness band). */
  twinkle?: number
  /** Only within this box of the plane (cells): a beam's dust, a chimney's sparks. */
  within?: { x0: number; y0: number; x1: number; y1: number }
  /** Square motes (cheaper; at a few pixels no one can tell): for snow and ash far off. */
  square?: boolean
  /** Streaks along the drift, of this many seconds of travel: rain, sparks, spray. */
  streak?: number
}

/**
 * Motes over the plane `inner` (a `layer`'s, or the view itself for the machine's plane) at show time `t`. Each has a
 * place in a tile, moves with the drift and its sway, and wraps in the tile, so there is no first or last of them and
 * the frame is never without. Deterministic in `t`.
 */
export function motes(ctx: C2, inner: View, t: number, m: Motes): void {
  const k = inner.k
  const [tw, th] = m.tile
  const box = m.within
  const bx0 = box ? Math.max(inner.x0, box.x0) : inner.x0
  const bx1 = box ? Math.min(inner.x1, box.x1) : inner.x1
  const by0 = box ? Math.max(inner.y0, box.y0) : inner.y0
  const by1 = box ? Math.min(inner.y1, box.y1) : inner.y1
  if (bx1 <= bx0 || by1 <= by0) return
  const bands = m.twinkle ? 3 : 1
  const paths: Path2D[] = []
  for (let b = 0; b < bands; b++) paths.push(new Path2D())
  const spread = m.spread ?? 0.3
  const [sa, sf] = m.sway ?? [0, 0]
  const rx = Math.max(m.r[1], 0.02)
  // The tiles that meet the box, each tile the same scatter moved by whole tiles.
  const i0 = Math.floor((bx0 - rx) / tw)
  const i1 = Math.floor((bx1 + rx) / tw)
  const j0 = Math.floor((by0 - rx) / th)
  const j1 = Math.floor((by1 + rx) / th)
  if ((i1 - i0 + 1) * (j1 - j0 + 1) * m.n > 6000) return
  for (let n = 0; n < m.n; n++) {
    const h1 = hash(n, 1, m.seed)
    const h2 = hash(n, 2, m.seed)
    const h3 = hash(n, 3, m.seed)
    const h4 = hash(n, 4, m.seed)
    const f = 1 + spread * (2 * h3 - 1)
    const sway = sa ? sa * Math.sin(t * sf * Math.PI * 2 + h4 * 6.283) : 0
    // Sway goes across the drift: sideways for a fall, up and down for a wind.
    const across = Math.abs(m.v[1]) >= Math.abs(m.v[0])
    let x = h1 * tw + m.v[0] * f * t + (across ? sway : 0)
    let y = h2 * th + m.v[1] * f * t + (across ? 0 : sway)
    x = ((x % tw) + tw) % tw
    y = ((y % th) + th) % th
    const r = m.r[0] + (m.r[1] - m.r[0]) * h4
    const band = bands > 1 ? Math.min(bands - 1, Math.floor(((Math.sin(t * (0.7 + h3 * 1.6) + h1 * 40) + 1) / 2) * bands)) : 0
    const path = paths[band]
    for (let i = i0; i <= i1; i++) {
      const px = x + i * tw
      if (px < bx0 - r || px > bx1 + r) continue
      for (let j = j0; j <= j1; j++) {
        const py = y + j * th
        if (py < by0 - r || py > by1 + r) continue
        if (m.streak) {
          path.moveTo(px * k, py * k)
          path.lineTo((px - m.v[0] * f * m.streak) * k, (py - m.v[1] * f * m.streak) * k)
        } else if (m.square) path.rect((px - r) * k, (py - r) * k, 2 * r * k, 2 * r * k)
        else {
          path.moveTo((px + r) * k, py * k)
          path.arc(px * k, py * k, r * k, 0, Math.PI * 2)
        }
      }
    }
  }
  ctx.save()
  if (m.streak) {
    ctx.strokeStyle = m.color
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(0.5, 2 * m.r[1] * k)
  } else ctx.fillStyle = m.color
  const base = ctx.globalAlpha
  for (let b = 0; b < bands; b++) {
    ctx.globalAlpha = base * (bands > 1 ? 1 - (m.twinkle ?? 0) * (1 - b / (bands - 1)) : 1)
    if (m.streak) ctx.stroke(paths[b])
    else ctx.fill(paths[b])
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ light */

/** 'rgba(r, g, b, a)' from a '#rrggbb' and an alpha. */
export function rgbaOf(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** A bloom round a source at `x, y` (cells), radius `r`: brightest at the middle, gone at the rim. `add` adds light (a lamp in the dark); otherwise it is laid on. */
export function glow(ctx: C2, k: number, x: number, y: number, r: number, hex: string, a: number, add = false, squash = 1): void {
  if (a <= 0.003 || r <= 0) return
  ctx.save()
  if (add) ctx.globalCompositeOperation = 'lighter'
  ctx.translate(x * k, y * k)
  if (squash !== 1) ctx.scale(1, squash)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  g.addColorStop(0, rgbaOf(hex, a))
  g.addColorStop(0.35, rgbaOf(hex, a * 0.45))
  g.addColorStop(1, rgbaOf(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/**
 * A shaft of light from a source: from `a` (its width there `wa`) to `b` (width `wb`), brightest at `a` and gone at
 * `b`. A window's sun, a lamp's cone, the surface's light down through the water.
 */
export function shaft(ctx: C2, k: number, a: Pt, wa: number, b: Pt, wb: number, hex: string, alpha: number, add = false): void {
  if (alpha <= 0.003) return
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  ctx.save()
  if (add) ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  g.addColorStop(0, rgbaOf(hex, alpha))
  g.addColorStop(0.6, rgbaOf(hex, alpha * 0.35))
  g.addColorStop(1, rgbaOf(hex, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((a[0] + nx * wa / 2) * k, (a[1] + ny * wa / 2) * k)
  ctx.lineTo((b[0] + nx * wb / 2) * k, (b[1] + ny * wb / 2) * k)
  ctx.lineTo((b[0] - nx * wb / 2) * k, (b[1] - ny * wb / 2) * k)
  ctx.lineTo((a[0] - nx * wa / 2) * k, (a[1] - ny * wa / 2) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** The frame's edges falling away into `hex`: none inside `inner` of the half-diagonal, `a` at the corners. */
export function vignette(ctx: C2, v: View, hex: string, a: number, inner = 0.55): void {
  if (a <= 0.003) return
  const k = v.k
  const rx = (v.w / 2) * 1.42
  ctx.save()
  ctx.translate(v.cx * k, v.cy * k)
  ctx.scale(1, v.h / v.w)
  const g = ctx.createRadialGradient(0, 0, rx * inner * k, 0, 0, rx * k)
  g.addColorStop(0, rgbaOf(hex, 0))
  g.addColorStop(1, rgbaOf(hex, a))
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/**
 * A grade over the whole plate: a top colour to a bottom colour, laid on in `mode` ('soft-light' warms or cools
 * without greying, 'multiply' deepens, 'screen' lifts, 'source-over' is a haze).
 */
export function wash(ctx: C2, v: View, top: string, bottom: string, mode: GlobalCompositeOperation = 'source-over'): void {
  const k = v.k
  ctx.save()
  ctx.globalCompositeOperation = mode
  const g = ctx.createLinearGradient(0, v.y0 * k, 0, v.y1 * k)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect((v.x0 - 0.5) * k, (v.y0 - 0.5) * k, (v.w + 1) * k, (v.h + 1) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ motion */

/** A slow sway, -1 to 1, that never repeats exactly: two sines at unrelated rates. For lamps on cords, grass, flags. */
export const sway = (t: number, rate: number, seed = 0): number =>
  0.65 * Math.sin(t * rate * 6.283 + seed * 12.9) + 0.35 * Math.sin(t * rate * 2.618 * 6.283 + seed * 7.1)

/** A flicker, 0 to 1, mostly near 1: a fluorescent tube, a candle, a fire's light on a wall. */
export const flicker = (t: number, seed = 0, depth = 0.25): number => {
  const a = Math.sin(t * 13.1 + seed * 3.3) * Math.sin(t * 7.7 + seed * 1.9)
  const b = hash(Math.floor(t * 24), 7, seed) > 0.97 ? 0.6 : 0
  return Math.max(0, 1 - depth * (0.5 + 0.5 * a) - depth * b)
}
