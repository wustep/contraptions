import type p5 from 'p5'
import { R, mixHex } from '../../../../parts'
import { frame, hash, scenery, smooth } from './kit'
import { LAST, ROLL, SILENCE, THEME, level } from './music'
import type { SparkShow } from './show'
import { ASH, FIRES, FLAME_CORE, FLAME_RIM, LOFT, SPARK, type WorldKey } from './worlds'

/**
 * What makes the ball a spark, over every world: its flame, and the veil of fire at every door. The director's file:
 * parts never draw either. A part only has to keep the spark's flame in mind (it rises over the ball, a little under
 * a cell tall at the start and more than a cell by the fireworks) and mark a segment `hidden` where something in front
 * covers the spark, or its flame would show through.
 */

/* ------------------------------------------------------------------ heat */

/**
 * How big the spark's flame is at `t`: 1 is a candle's flame. It follows the orchestra (`level`), so the spark grows
 * as the music does, from a careful flicker in the loft to a comet on the night express. In the silence it all but
 * goes out; the roll fans it back; on the first last chord it is a candle's flame again, on its wick.
 */
export function heat(t: number): number {
  if (t < THEME) return 1
  const grown = 0.7 + 1.9 * Math.pow(level(t), 1.4)
  // The silence: it sinks to an ember, and the roll brings it roaring back.
  const out = smooth(t, SILENCE, SILENCE + 0.6) * (1 - smooth(t, ROLL, ROLL + 0.12))
  const flare = t >= ROLL ? 1.6 * Math.exp(-(t - ROLL) / 0.8) : 0
  const home = smooth(t, LAST[0] - 0.05, LAST[0] + 0.9)
  const live = grown * (1 - out) + 0.06 * out + flare
  return live * (1 - home) + 1 * home
}

/* ------------------------------------------------------------------ where the spark is, for the sets it lights */

/** Bound by the score once the show is built. */
export const bound: { show: SparkShow | null } = { show: null }

/**
 * Where the spark is at show time `t` if it is in `world` then, in that world's cells, with its heat and whether it is
 * out of sight: what a dark set (the loft, the night) lights itself by. Null in any other world, or before the show
 * is built. A part placed at (col, row) subtracts its own origin (the loft's are in `loft/layout.ts`).
 */
export function sparkIn(world: WorldKey, t: number): { x: number; y: number; heat: number; hidden: boolean } | null {
  const show = bound.show
  if (!show || show.worldKey(t) !== world) return null
  const here = show.at(t)
  return { x: here.x, y: here.y, heat: heat(t), hidden: here.hidden || here.scale <= 0.05 }
}

/* ------------------------------------------------------------------ the flame */

export interface FlameState {
  /** Bound once the show is built: the flame reads where the spark is from it. */
  show: SparkShow | null
  world: WorldKey
}

/** A flame's teardrop: base at (x, y), `h` tall, `w` wide at its belly, its tip swung `lean` (cells) sideways. */
function tongue(p: p5, k: number, x: number, y: number, w: number, h: number, lean: number, fill: string): void {
  p.fill(fill)
  p.beginShape()
  const n = 18
  for (let i = 0; i <= n; i++) {
    // Round the drop: the belly low, a point at the tip.
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2 // 0 at the base, 1 at the tip, back to 0
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
    const px = x + side * w * 0.5 * belly + lean * u * u
    const py = y - h * u + w * 0.25 * (1 - u) * Math.abs(side) * 0.3
    p.vertex(px * k, py * k)
  }
  p.endShape(p.CLOSE)
}

/** The spark's flame, drawn over it in the world on the stage. One of these stands last in each world's `after`. */
export const flame = () =>
  scenery<FlameState>({
    name: 'spark-flame',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      const here = show.at(t)
      if (here.hidden || here.scale <= 0.05) return
      const h = heat(t)
      if (h <= 0.01) return
      const { k } = c
      // The spark's velocity over the last few hundredths, in its own leg: the flame streams back from it.
      const a = show.where(t - 0.04)
      const b = show.where(t)
      const same = show.owner(t - 0.04) === show.owner(t)
      const vx = same ? (b[0] - a[0]) / 0.04 : 0
      const vy = same ? (b[1] - a[1]) / 0.04 : 0
      const flick = 0.12 * Math.sin(t * 23 + 1.3) + 0.08 * Math.sin(t * 37.7) + 0.05 * (hash(Math.floor(t * 30)) - 0.5)
      const len = R * (2.1 + 0.25 * flick) * h
      const wide = R * 1.55 * Math.sqrt(h) * (1 + 0.1 * flick)
      // Speed lays the flame back along the way it came, up to nearly flat.
      const lean = Math.max(-1.6, Math.min(1.6, -vx * 0.09)) * len + flick * R * 0.6
      const up = Math.max(0.35, 1 - Math.max(0, vy) * 0.05)
      const x = here.x
      const y = here.y - R * 0.35
      p.push()
      p.noStroke()
      // A soft warm light round it, wide and faint: never a bright core of its own.
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const glow = R * (5 + 6 * Math.min(2.5, h)) * k
      const g = ctx.createRadialGradient(x * k, y * k, R * k, x * k, y * k, glow)
      const dark = s.world === 'loft' || s.world === 'railway'
      g.addColorStop(0, `rgba(255, 196, 120, ${dark ? 0.2 : 0.1})`)
      g.addColorStop(1, 'rgba(255, 196, 120, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x * k - glow, y * k - glow, glow * 2, glow * 2)
      tongue(p, k, x, y, wide * 1.15, len * up * 1.1, lean, FLAME_RIM)
      tongue(p, k, x, y, wide * 0.8, len * up * 0.82, lean * 0.85, SPARK)
      tongue(p, k, x, y + R * 0.1, wide * 0.42, len * up * 0.5, lean * 0.6, FLAME_CORE)
      p.pop()
    },
  })

/* ------------------------------------------------------------------ the spark itself */

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

/**
 * The spark's heart: the ball, drawn here instead of by the stage (the show hands the stage no ball, `SparkShow.at`),
 * so it is a flame's heart and not a marble: no ink ring, no spinning dot, no trail of beads. Hot, it is gold going to
 * orange at its edge; in the silence it is an ember gone to ash with a dull red heart that breathes. Drawn out along
 * its way at a door, as the stage would.
 */
export function drawSpark(p: p5, k: number, x: number, y: number, t: number, scale = 1, stretch = 1, angle = 0): void {
  if (scale <= 0.02) return
  const r = R * k * scale
  // 0 while it burns; 1 in the silence, when it is all but out.
  const ash = 1 - smooth(heat(t), 0.1, 0.45)
  const breathe = 0.5 + 0.5 * Math.sin(t * 2.6)
  const core = mixHex(FLAME_CORE, mixHex(FLAME_RIM, ASH, 0.35 - 0.2 * breathe), ash)
  const body = mixHex(SPARK, mixHex(ASH, FLAME_RIM, 0.25), ash)
  const edge = mixHex(FLAME_RIM, mixHex(ASH, LOFT.soot, 0.45), ash)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.rotate(angle)
  ctx.scale(Math.max(1, stretch), 1)
  const g = ctx.createRadialGradient(0, -0.25 * r, 0.05 * r, 0, 0, r)
  g.addColorStop(0, core)
  g.addColorStop(0.55, body)
  g.addColorStop(1, edge)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * The spark on the stage: the first thing in each world's pieces, so its `over` comes before every part's (a pan's
 * lip or a socket drawn over it still covers it, as it did the stage's ball) and before the veil and the flame.
 */
export const ember = () =>
  scenery<FlameState>({
    name: 'spark-ember',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      const here = show.at(t)
      if (here.hidden || here.scale <= 0.05) return
      drawSpark(p, c.k, here.x, here.y, t, here.scale, here.stretch, here.angle)
    },
  })

/* ------------------------------------------------------------------ the veil at a door */

export interface VeilState {
  show: SparkShow | null
  world: WorldKey
}

/**
 * How long before and after a door its fire is in the frame. The three doors out are a fire the camera goes through
 * with the spark: it comes in from the way the spark is going, covers the frame on the cut, and leaves behind it. The
 * dash home is three doors in a sixth of a second, on the roll's strokes: each is a flash of fire and no more, so the
 * worlds it goes back through are seen, a few frames each (a burner, the glory hole), before the loft.
 */
const VEIL = { before: 0.3, after: 0.34 }
const FLASH = { before: 0.022, after: 0.028 }

/** A tongue of the veil: where its base is (shares of the frame), how big, its colour's place from rim to heart, its clock. */
interface Tongue {
  u: number
  v: number
  w: number
  h: number
  hot: number
  rate: number
  phase: number
}
const TONGUES: Tongue[] = (() => {
  const out: Tongue[] = []
  // Three layers, back to front: big dark tongues, then the body, then small hot ones.
  const layers = [
    { cols: 6, rows: 3, w: 0.27, h: 0.7, hot: 0 },
    { cols: 8, rows: 3, w: 0.17, h: 0.55, hot: 0.5 },
    { cols: 9, rows: 2, w: 0.085, h: 0.42, hot: 1 },
  ]
  layers.forEach((L, n) => {
    for (let j = 0; j < L.rows; j++)
      for (let i = 0; i < L.cols; i++) {
        const seed = n * 100 + j * 20 + i
        out.push({
          u: (i + 0.5 + 0.7 * (hash(seed, 1) - 0.5)) / L.cols,
          v: (j + 0.75 + 0.6 * (hash(seed, 2) - 0.5)) / L.rows + 0.12,
          w: L.w * (0.75 + 0.5 * hash(seed, 3)),
          h: L.h * (0.7 + 0.6 * hash(seed, 4)),
          hot: L.hot,
          rate: 1.6 + 1.4 * hash(seed, 5),
          phase: hash(seed, 6),
        })
      }
  })
  return out
})()

/** The fire over the frame at a door, from the world left's fire to the world come to's. */
export const veil = () =>
  scenery<VeilState>({
    name: 'fire-veil',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      // The door nearest now, if its fire is up.
      let best = -1
      let d = Infinity
      for (let i = 1; i < show.legs.length; i++) {
        const e = t - show.legs[i].from
        const span = i >= 4 ? FLASH : VEIL
        if (e > -span.before && e < span.after && Math.abs(e) < Math.abs(d)) {
          best = i
          d = e
        }
      }
      if (best < 0) return
      const span = best >= 4 ? FLASH : VEIL
      const door = show.legs[best].from
      const from = FIRES[show.legs[best - 1].world]
      const to = FIRES[show.legs[best].world]
      const turn = best >= 4 ? smooth(d, -0.012, 0.012) : smooth(d, -0.07, 0.07)
      const mix = (a: string, b: string) => {
        const pa = rgb(a)
        const pb = rgb(b)
        return pa.map((v, i) => Math.round(v + (pb[i] - v) * turn)) as [number, number, number]
      }
      const rim = mix(from.rim, to.rim)
      const body = mix(from.body, to.body)
      const heart = mix(from.heart, to.heart)
      const col = (a: [number, number, number], b: [number, number, number], f: number, al: number) =>
        `rgba(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')}, ${Math.max(0, Math.min(1, al))})`

      const { k } = c
      const f = frame(p, k)
      const w = f.x1 - f.x0
      const hgt = f.y1 - f.y0
      const cx = (f.x0 + f.x1) / 2
      const cy = (f.y0 + f.y1) / 2
      // The way the spark goes through this door: the fire comes at the frame from there and leaves behind it.
      const a = show.where(door - 0.03)
      const b = show.where(door - 0.001)
      let ux = b[0] - a[0]
      let uy = b[1] - a[1]
      const ul = Math.hypot(ux, uy)
      if (ul < 1e-6) {
        ux = 0
        uy = -1
      } else {
        ux /= ul
        uy /= ul
      }
      const reach = (Math.abs(ux) * w + Math.abs(uy) * hgt) / 2
      // 0 at the frame's trailing edge, 1 at its leading edge.
      const sOf = (x: number, y: number) => 0.5 + ((x - cx) * ux + (y - cy) * uy) / (2 * reach)
      const q = (d + span.before) / (span.before + span.after)
      const band = best >= 4 ? 0.5 : 2.0 - 3.0 * q
      const cover = (sv: number) => (best >= 4 ? smooth(d, -span.before, -span.before * 0.3) * (1 - smooth(d, span.after * 0.3, span.after)) : 1 - smooth(Math.abs(sv - band), 0.62, 1.0))

      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      // The wash: dark rim at the fire's edges, the body where it is thickest.
      const g = ctx.createLinearGradient((cx - ux * reach) * k, (cy - uy * reach) * k, (cx + ux * reach) * k, (cy + uy * reach) * k)
      for (let i = 0; i <= 10; i++) {
        const sv = i / 10
        const cv = cover(sv)
        g.addColorStop(sv, col(rim, body, 0.55 * cv * cv, 0.94 * cv))
      }
      ctx.fillStyle = g
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, hgt * k)
      ctx.restore()
      // The tongues, rising through it and flickering, hotter toward the middle of the fire.
      p.push()
      p.noStroke()
      for (const tg of TONGUES) {
        const life = (t * tg.rate * 0.9 + tg.phase) % 1
        const bx = f.x0 + w * tg.u + 0.03 * w * Math.sin(t * 7 + tg.phase * 20)
        const by = f.y0 + hgt * (tg.v - 0.22 * life)
        const cv = cover(sOf(bx, by - hgt * tg.h * 0.4))
        if (cv < 0.03) continue
        const fade = Math.sin(Math.PI * life)
        const hh = hgt * tg.h * (0.55 + 0.45 * cv) * (0.8 + 0.2 * Math.sin(t * 13 * tg.rate + tg.phase * 9))
        const ww = w * tg.w * 0.5 * (0.6 + 0.4 * cv)
        const hot = Math.min(1, tg.hot * (0.4 + 0.6 * cv))
        const fill = hot < 0.5 ? col(rim, body, hot * 2, 0.8 * cv * fade) : col(body, heart, (hot - 0.5) * 2, 0.8 * cv * fade)
        tongue(p, k, bx, by, ww, hh, Math.sin(t * 3 + tg.phase * 12) * w * 0.02, fill)
      }
      p.pop()
      // The spark itself stays in front of its fire: a door never hides it.
      const here = show.at(t)
      if (!here.hidden && here.scale > 0.05) drawSpark(p, k, here.x, here.y, t, here.scale, here.stretch, here.angle)
    },
  })
