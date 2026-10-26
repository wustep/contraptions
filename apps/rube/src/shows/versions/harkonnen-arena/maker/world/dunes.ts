import { hash, layer, type Brush } from '../paint'

/**
 * Dunes: transverse ridges driven by a wind from the east. Each has a long gentle back (its stoss side, to the east, on
 * the right) up to a sharp crest, and a steep slip face down to the west, on the left. The sun is to the east, so the
 * backs are lit and the slip faces are in shadow: the shadow is a wedge under each crest, bounded by the face and a
 * terminator that falls from the crest more steeply than the face itself, which is how a crest reads seen a little from
 * above, the crisp line Villeneuve's desert is drawn in.
 *
 * A range is a row of crests along x, its heights and spacing from a seed, so the same range is the same in every frame.
 * It is drawn in a layer (`paint.ts`): far ranges smaller and paler, toward the horizon.
 */

export interface Range {
  seed: number
  /** Mean distance between crests, cells (as if in the action's plane). */
  spacing: number
  /** Mean height of a crest above the range's foot, cells. */
  height: number
  /** How much the heights vary, 0 to 1. */
  vary?: number
  /** The range's foot, world y (0 is the flat). */
  foot?: number
  /**
   * Soft: rounded swells, no crest or shadow of their own. So far off the crests are lost in the haze, and a row of
   * small sharp ones reads as teeth.
   */
  soft?: boolean
  /** The share of crests left out, so the range has open corridors between its dunes (0 none). */
  gap?: number
}

interface Crest {
  x: number
  h: number
  soft: boolean
  /** Its back's length, east of the crest, over its height. */
  back: number
  /** Its face's length, west of the crest, over its height. */
  face: number
}

function crestsOf(r: Range, x0: number, x1: number): Crest[] {
  const out: Crest[] = []
  const vary = r.vary ?? 0.45
  const i0 = Math.floor(x0 / r.spacing) - 3
  const i1 = Math.ceil(x1 / r.spacing) + 3
  for (let i = i0; i <= i1; i++) {
    if (hash(i, r.seed, 5) < (r.gap ?? 0)) continue
    const x = (i + (hash(i, r.seed, 1) - 0.5) * 0.7) * r.spacing
    const h = r.height * (1 - vary / 2 + vary * hash(i, r.seed, 2))
    out.push({ x, h, soft: !!r.soft, back: 3.0 + 1.8 * hash(i, r.seed, 3), face: 1.35 + 0.3 * hash(i, r.seed, 4) })
  }
  return out
}

/** How high one crest stands over the foot at `x` (0 away from it). */
function crestAt(c: Crest, x: number): number {
  const d = x - c.x
  if (c.soft) {
    const u = d / (c.h * (d > 0 ? c.back : c.face * 1.8))
    if (u <= -1 || u >= 1) return 0
    const k = 1 - u * u
    return c.h * k * k
  }
  if (d >= 0) {
    const L = c.h * c.back
    if (d >= L) return 0
    const u = 1 - d / L
    // The back: a long rise that steepens a little toward the crest.
    return c.h * u * u * (1.6 - 0.6 * u)
  }
  const L = c.h * c.face
  if (-d >= L) return 0
  const u = 1 + d / L
  // The face: straight at the sand's angle of rest from the crest, turning out only at its very foot.
  return c.h * (u > 0.12 ? u : 0.12 * Math.pow(u / 0.12, 2) * 0.5 + u * 0.5)
}

/**
 * The long low swell the dunes stand on: the troughs between crests are never quite the flat, so a range never shows a
 * shelf of level sand under it.
 */
function swell(r: Range, x: number): number {
  const u = x / (r.spacing * 1.7)
  const i = Math.floor(u)
  const f = u - i
  const s = f * f * (3 - 2 * f)
  const a = hash(i, r.seed, 11)
  const b = hash(i + 1, r.seed, 11)
  return r.height * (0.18 + 0.3 * (a + (b - a) * s))
}

/** The range's surface at `x`, world y (negative up). */
export function surface(r: Range, x: number, crests?: Crest[]): number {
  const cs = crests ?? crestsOf(r, x - r.spacing * 4, x + r.spacing * 4)
  let h = 0
  for (const c of cs) h = Math.max(h, crestAt(c, x))
  return (r.foot ?? 0) - Math.max(h, swell(r, x))
}

export interface DuneLook {
  lit: string
  shade: string
  /** The far air the range pales toward, and how far it goes toward it (0 none, 1 all). */
  air?: string
  pale?: number
}

/**
 * One range across the frame in the layer `f` behind the action's plane, horizon at `hy`: its lit body, and under every
 * crest its shadow. Down to `bottom` (world y in the layer) it is filled solid.
 */
export function paintRange(b: Brush, r: Range, f: number, hy: number, look: DuneLook, bottom = 400): void {
  layer(b, f, hy, (lb) => {
    const { ctx, view } = lb
    const x0 = view.x0 - 2
    const x1 = view.x1 + 2
    const cs = crestsOf(r, x0 - r.spacing * 3, x1 + r.spacing * 3)
    const n = Math.min(260, Math.max(60, Math.ceil(view.w / 0.4)))
    const step = (x1 - x0) / n
    const lit = lb.c(look.air && look.pale ? mixHex(look.lit, look.air, look.pale) : look.lit)
    const shade = lb.c(look.air && look.pale ? mixHex(look.shade, look.air, look.pale * 0.9) : look.shade)
    // The body.
    ctx.beginPath()
    ctx.moveTo(x0, bottom)
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * step
      ctx.lineTo(x, surface(r, x, cs))
    }
    ctx.lineTo(x1, bottom)
    ctx.closePath()
    ctx.fillStyle = lit
    ctx.fill()
    // The shadows: under each crest in the frame, the face, crisp at the crest and along the terminator, melting into the
    // lit sand toward its foot.
    for (const c of r.soft ? [] : cs) {
      const top = (r.foot ?? 0) - c.h
      const faceL = c.h * c.face
      if (c.x + c.h < x0 || c.x - faceL - 1 > x1) continue
      // Only where this crest is the surface (a crest buried in a taller neighbour's back casts nothing of its own).
      if (surface(r, c.x, cs) < top - 1e-3) continue
      const foot = r.foot ?? 0
      const lean = c.h * (0.22 + 0.1 * hash(Math.round(c.x * 10), r.seed, 7))
      // Down the face as far as it is the surface: where a neighbour's back or the swell takes over is its valley.
      const m = 12
      let vx = c.x - faceL
      let vy = surface(r, vx, cs)
      ctx.beginPath()
      ctx.moveTo(c.x, top)
      for (let j = 1; j <= m; j++) {
        const x = c.x - (faceL * j) / m
        const y = surface(r, x, cs)
        if (foot - crestAt(c, x) > y + 1e-3) {
          vx = x
          vy = y
          break
        }
        ctx.lineTo(x, y)
        vx = x
        vy = y
      }
      const deep = Math.max(vy, top + c.h * 0.6) + c.h * 0.35
      ctx.lineTo(vx, vy)
      ctx.lineTo(vx + (c.x - vx) * 0.35, deep)
      ctx.lineTo(c.x + lean, deep)
      ctx.quadraticCurveTo(c.x + lean * 0.8, top + c.h * 0.4, c.x + c.h * 0.012, top + c.h * 0.008)
      ctx.closePath()
      const gr = ctx.createLinearGradient(0, top, 0, deep)
      gr.addColorStop(0, shade)
      gr.addColorStop(0.55, shade)
      gr.addColorStop(1, withAlpha(shade, 0))
      ctx.fillStyle = gr
      ctx.fill()
    }
  })
}

/** A graded `#rrggbb` at alpha `a`. */
function withAlpha(hex: string, a: number): string {
  const v = parseInt(hex.slice(1), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a.toFixed(3)})`
}

function mixHex(a: string, b: string, f: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (v: number, s: number) => (v >> s) & 255
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * f).toString(16).padStart(2, '0')
  return `#${m(16)}${m(8)}${m(0)}`
}
