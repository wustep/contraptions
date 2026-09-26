import type p5 from 'p5'
import { R } from '../../../../parts'
import { frame, hash, scenery, smooth } from './kit'
import { LAST, ROLL, SILENCE, THEME, level } from './music'
import type { SparkShow } from './show'
import { FIRES, FLAME_CORE, FLAME_RIM, SPARK, type WorldKey } from './worlds'

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

/* ------------------------------------------------------------------ the veil at a door */

export interface VeilState {
  show: SparkShow | null
  world: WorldKey
}

/** How long before and after a door its veil of flame is up, and how long it takes to come up and go. */
const VEIL = { before: 0.3, after: 0.34, full: 0.05 }

/** The fire over the whole frame at a door, turning from the world left's fire to the world come to. */
export const veil = () =>
  scenery<VeilState>({
    name: 'fire-veil',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      // The door nearest now, if its veil is up.
      let best = -1
      let d = Infinity
      for (let i = 1; i < show.legs.length; i++) {
        const e = t - show.legs[i].from
        if (e > -VEIL.before && e < VEIL.after && Math.abs(e) < Math.abs(d)) {
          best = i
          d = e
        }
      }
      if (best < 0) return
      const from = FIRES[show.legs[best - 1].world]
      const to = FIRES[show.legs[best].world]
      const up = smooth(d, -VEIL.before, -VEIL.full) * (1 - smooth(d, VEIL.full, VEIL.after))
      if (up <= 0.01) return
      const { k } = c
      const f = frame(p, k)
      const w = f.x1 - f.x0
      const hgt = f.y1 - f.y0
      const turn = smooth(d, -0.06, 0.06)
      const mix = (a: string, b: string) => {
        const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
        const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
        return pa.map((v, i) => Math.round(v + (pb[i] - v) * turn))
      }
      const rim = mix(from.rim, to.rim)
      const body = mix(from.body, to.body)
      const heart = mix(from.heart, to.heart)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      // The whole frame goes to fire: a wash of the rim colour, then tongues of flame rising through it.
      ctx.fillStyle = `rgba(${rim.join(',')}, ${0.92 * up})`
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, hgt * k)
      p.push()
      p.noStroke()
      for (let i = 0; i < 9; i++) {
        const u = (i + 0.5) / 9
        const rise = (t * (1.3 + hash(i, 3)) + hash(i, 7)) % 1
        const x = f.x0 + w * (u + 0.06 * Math.sin(t * 5 + i))
        const y = f.y1 + hgt * 0.15 - hgt * 0.5 * rise
        const hh = hgt * (0.7 + 0.5 * hash(i, 11)) * up
        const col = i % 2 ? body : heart
        p.fill(`rgba(${col.join(',')}, ${0.85 * up})`)
        tongue(p, k, x, y, w * 0.2, hh, Math.sin(t * 3 + i) * w * 0.03, `rgba(${col.join(',')}, ${0.8 * up})`)
      }
      p.pop()
      ctx.restore()
      // The spark itself stays in front of its fire: a door never hides it.
      const here = show.at(t)
      if (!here.hidden && here.scale > 0.05) {
        p.push()
        p.noStroke()
        p.fill(FLAME_CORE)
        p.circle(here.x * k, here.y * k, 2 * R * 1.05 * k)
        p.fill(SPARK)
        p.circle(here.x * k, here.y * k, 2 * R * 0.8 * k)
        p.pop()
      }
    },
  })
