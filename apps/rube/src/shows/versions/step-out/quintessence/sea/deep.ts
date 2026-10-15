import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, type View } from '../depth'
import { hash, knock, lastOf, smooth } from '../kit'
import { BEGIN, OUT, PUFFS, W } from './sea-plan'

/**
 * The life of the water round him (B's): what keeps the bass-only stretch moving while the music has gone quiet over
 * it. Jade light coming down in rays that sway and flicker; the skin's underside, a web of light; the sea's snow
 * drifting on three planes; a school of small fish far off, milling, that wheels over on each strong low; and two
 * pale jellyfish pulsing slowly in the dark. In the sea's cells (the skin at y 0, down into the dark), from show time.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera mostly is while he is under, and how tall its frame: what the planes here are composed against. */
export const DEEP_AT: Pt = [0.6, 2.4]
export const DEEP_REF = 6.3

export const DEEP = {
  jade: '#A9DEC9',
  snow: '#A7CBC2',
  fish: '#05161B',
  flash: '#D5ECE4',
  jelly: '#D9ECE6',
  web: '#C4E8DA',
}

/** How much of the water's life is there: all of it while he is under; it is left behind as he is hauled out. */
export const underAt = (t: number): number => 1 - smooth(t, OUT - 0.2, OUT + 0.9)

/* ------------------------------------------------------------------ light */

export interface Rays {
  /** The rays' plane: how fast they cross the frame as the camera goes (1 the machine's, under 1 farther). */
  z: number
  n: number
  seed: number
  /** Their brightness at the skin. */
  a: number
  /** Their width at the skin, least and most, cells. */
  w: Pt
  /** How far down they reach before they are gone. */
  len: number
  color: string
  add?: boolean
}

/** How bright a ray is down its length, in five flat steps (the house's flat values): bright at the skin, gone below. */
const STEPS = [1, 0.6, 0.36, 0.19, 0.08]

/**
 * The light coming down from the surface: rays from the skin, leaning with the sun, fanning out and swaying, in three
 * sets that each brighten and dim on their own. Each ray fades down its length in flat steps, each step a little
 * higher or lower on each ray so the steps never line up; a step of a set is one path in one flat colour, so a score
 * of rays is fifteen plain fills (a gradient over that much of the frame costs five times as much). They wrap round a
 * span wider than the frame, so one never pops in where it can be seen.
 */
export function drawRays(g: C2, v: View, t: number, o: Rays): void {
  if (v.y1 < W || v.y0 > W + o.len) return
  const k = v.k
  const span = 20
  const left = v.x0 - 4.5
  const shift = (1 - o.z) * (v.cx - DEEP_AT[0])
  const N = STEPS.length
  const paths: Path2D[][] = [0, 1, 2].map(() => STEPS.map(() => new Path2D()))
  for (let i = 0; i < o.n; i++) {
    const h1 = hash(i, 1, o.seed)
    const h2 = hash(i, 2, o.seed)
    const h3 = hash(i, 3, o.seed)
    const h4 = hash(i, 4, o.seed)
    // Each sways slowly, and wavers quicker as the swell passes over the sun.
    const sx = h1 * span + 0.4 * Math.sin(t * (0.1 + 0.08 * h2) + i * 1.7) + 0.05 * Math.sin(t * (1.1 + h2) + i * 2.9) + shift
    const x = left + ((((sx - left) % span) + span) % span)
    const wa = o.w[0] + (o.w[1] - o.w[0]) * h3
    const wb = wa * 1.8 + 0.04
    const lean = 0.3 + 0.05 * Math.sin(t * 0.17 + i * 2.3)
    const L = o.len
    // Its left and right edges at `u` of its length.
    const at = (u: number): [number, number, number] => [x + lean * L * u - (wb - wa) * u * 0.5, x + wa + lean * L * u + (wb - wa) * u * 0.5, W + L * u]
    let u0 = 0
    for (let b = 0; b < N; b++) {
      const u1 = b === N - 1 ? 1 : (b + 1 + 0.7 * (h4 - 0.5) + 0.2 * Math.sin(t * 0.3 + i)) / N
      const y0 = W + L * u0
      const y1 = W + L * u1
      if (y1 > v.y0 && y0 < v.y1) {
        const [l0, r0] = at(u0)
        const [l1, r1] = at(u1)
        const p = paths[i % 3][b]
        p.moveTo(l0 * k, y0 * k)
        p.lineTo(r0 * k, y0 * k)
        p.lineTo(r1 * k, y1 * k)
        p.lineTo(l1 * k, y1 * k)
        p.closePath()
      }
      u0 = u1
    }
  }
  g.save()
  if (o.add) g.globalCompositeOperation = 'lighter'
  for (let s = 0; s < 3; s++) {
    // Each set breathes on its own, with a quicker shimmer on it: the swell above passing over the sun.
    const shimmer = Math.sin(t * 2.3 + s * 1.9) * Math.sin(t * 1.3 + s * 0.7)
    const a = o.a * (0.72 + 0.28 * Math.sin(t * 0.45 + s * 2.1)) * (1 - 0.16 * (0.5 + 0.5 * shimmer))
    for (let b = 0; b < N; b++) {
      g.fillStyle = rgbaOf(o.color, a * STEPS[b])
      g.fill(paths[s][b])
    }
  }
  g.restore()
}

/**
 * The skin's underside: a web of light where the swell gathers the sun, shifting all the time, brightest just under
 * the surface and gone half a cell down. Three rows of a net whose knots wander, one stroke a row.
 */
export function drawWeb(g: C2, v: View, t: number, a: number): void {
  if (v.y0 > W + 0.7 || v.y1 < W) return
  const k = v.k
  const step = 0.3
  const i0 = Math.floor((v.x0 - 0.5) / step)
  const i1 = Math.ceil((v.x1 + 0.5) / step)
  const knot = (i: number, r: number): Pt => [
    i * step + (r % 2) * step * 0.5 + (hash(i, r, 3) - 0.5) * step * 0.7 + 0.08 * Math.sin(t * 1.1 + i * 2.13 + r * 1.7) + 0.05 * Math.sin(t * 2.3 + i * 0.7),
    W + 0.06 + r * 0.13 + (hash(i, r, 4) - 0.5) * 0.08 + 0.035 * Math.sin(t * 1.6 + i * 1.37 + r * 2.9),
  ]
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = Math.max(0.6, 0.014 * k)
  for (let r = 0; r < 3; r++) {
    const path = new Path2D()
    for (let i = i0; i <= i1; i++) {
      const p = knot(i, r)
      const q = knot(i + 1, r)
      const m = 0.04 * Math.sin(t * 1.9 + i * 3.1 + r)
      path.moveTo(p[0] * k, p[1] * k)
      path.quadraticCurveTo(((p[0] + q[0]) / 2) * k, ((p[1] + q[1]) / 2 + m) * k, q[0] * k, q[1] * k)
      if (r < 2) {
        // Down to the row under it: the net's cells.
        const d = knot(i + (r % 2), r + 1)
        path.moveTo(p[0] * k, p[1] * k)
        path.quadraticCurveTo(((p[0] + d[0]) / 2 + m) * k, ((p[1] + d[1]) / 2) * k, d[0] * k, d[1] * k)
      }
    }
    g.strokeStyle = rgbaOf(DEEP.web, a * [0.3, 0.17, 0.08][r])
    g.stroke(path)
  }
  g.restore()
}

/* ------------------------------------------------------------------ the sea's snow */

/** The sea's snow on a plane: specks of the dead drifting down in the current, at that plane's size and pace. */
export function drawSnow(g: C2, inner: View, t: number, plane: 'far' | 'mid', a: number): void {
  if (a <= 0.01) return
  // Only under the skin.
  const box = { x0: inner.x0 - 1, y0: W + 0.12, x1: inner.x1 + 1, y1: inner.y1 + 1 }
  if (plane === 'far')
    motes(g, inner, t, { n: 380, seed: 31, tile: [5.5, 4.5], r: [0.008, 0.016], v: [0.035, 0.05], spread: 0.4, sway: [0.06, 0.09], color: rgbaOf(DEEP.snow, 0.55 * a), twinkle: 0.45, square: true, within: box })
  else
    motes(g, inner, t, { n: 80, seed: 37, tile: [5, 4], r: [0.013, 0.026], v: [0.05, 0.075], spread: 0.35, sway: [0.09, 0.13], color: rgbaOf(DEEP.snow, 0.65 * a), twinkle: 0.5, within: box })
}

/* ------------------------------------------------------------------ the school */

/** How far the school's wheel has tipped: a little all the time, and over again on each of the strong lows. */
function tip(t: number): number {
  let a = 0.08 * t
  for (const p of PUFFS) a += 0.55 * smooth(t, p, p + 0.8)
  return a
}

/**
 * A school of small fish far off, milling: each goes round the school's middle on a ring of its own, so the school
 * reads as one turning cloud of dark marks, and the whole wheel tips over on each strong low of the bass, the fish
 * on its turning edge flashing pale as they bank. One stroke for the dark of them and one for the flash.
 */
export function drawSchool(g: C2, k: number, t: number, c: Pt, n: number, size: number, seed: number, a: number): void {
  if (a <= 0.01) return
  const phi = tip(t) + seed
  const cp = Math.cos(phi)
  const sp = Math.sin(phi)
  const flash = knock(lastOf(PUFFS, t).ago, 0.35)
  const dark = new Path2D()
  const lit = new Path2D()
  const cx = c[0] + 0.5 * Math.sin(t * 0.07 + seed)
  const cy = c[1] + 0.25 * Math.sin(t * 0.11 + seed * 2)
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, 1, seed)
    const h2 = hash(i, 2, seed)
    const h3 = hash(i, 3, seed)
    const rx = size * (0.35 + 0.65 * Math.sqrt(h1))
    const ry = rx * (0.28 + 0.12 * h3)
    const th = h2 * 6.283 + t * (0.55 + 0.25 * h3) * (0.6 + 0.4 * (1 - h1))
    const ct = Math.cos(th)
    const st = Math.sin(th)
    const lx = rx * ct
    const ly = ry * st + (h3 - 0.5) * size * 0.35
    const x = cx + lx * cp - ly * sp
    const y = cy + lx * sp + ly * cp
    // Its heading: along its ring.
    let tx = -rx * st
    let ty = ry * ct
    const tl = Math.hypot(tx, ty) || 1
    tx /= tl
    ty /= tl
    const hx = tx * cp - ty * sp
    const hy = tx * sp + ty * cp
    const len = 0.05 + 0.03 * h1
    // Broadside to us a fish shows its flank and catches the light; end on it is a dark mark. On a strong low the
    // whole wheel turns and flashes.
    const path = Math.abs(ct) > 0.8 || (flash > 0.05 && Math.abs(st) < 0.45) ? lit : dark
    path.moveTo(x * k, y * k)
    path.lineTo((x - hx * len) * k, (y - hy * len) * k)
  }
  g.save()
  g.lineWidth = Math.max(1, 0.026 * k)
  g.strokeStyle = rgbaOf(DEEP.fish, 0.85 * a)
  g.stroke(dark)
  g.strokeStyle = rgbaOf(DEEP.flash, (0.3 + 0.45 * flash) * a)
  g.stroke(lit)
  g.restore()
}

/* ------------------------------------------------------------------ jellyfish */

/**
 * A jellyfish, pale in the dark at (x, y), `s` across: its bell squeezes and slowly opens again, rising a little on
 * each squeeze, and its tentacles trail and lag behind it.
 */
export function drawJelly(g: C2, k: number, x: number, y: number, s: number, t: number, seed: number, a: number): void {
  if (a <= 0.01) return
  const ph = (((t * 0.48 + seed) % 1) + 1) % 1
  const c = ph < 0.22 ? Math.sin((ph / 0.22) * Math.PI * 0.5) : 1 - smooth(ph, 0.22, 1)
  const w = s * (0.5 - 0.11 * c)
  const h = s * (0.34 + 0.07 * c)
  g.save()
  g.translate(x * k, y * k)
  g.rotate(0.12 * Math.sin(t * 0.3 + seed * 4))
  // Its glow, faint.
  const gr = g.createRadialGradient(0, -h * 0.4 * k, 0, 0, -h * 0.4 * k, s * 1.3 * k)
  gr.addColorStop(0, rgbaOf(DEEP.jelly, 0.12 * a))
  gr.addColorStop(1, rgbaOf(DEEP.jelly, 0))
  g.fillStyle = gr
  g.fillRect(-s * 1.3 * k, (-h * 0.4 - s * 1.3) * k, s * 2.6 * k, s * 2.6 * k)
  // The tentacles, trailing: the wave runs down them a little behind the bell.
  const ten = new Path2D()
  for (let j = 0; j < 7; j++) {
    const u0 = (j / 6 - 0.5) * 1.6 * w
    const L = s * (1.1 + 0.8 * hash(j, 5, seed))
    ten.moveTo(u0 * k, 0)
    for (let i = 1; i <= 8; i++) {
      const u = i / 8
      const sway = 0.07 * s * Math.sin(t * 1.9 - u * 5 + j * 1.3) * u + u0 * 0.25 * c * u
      ten.lineTo((u0 * (1 - 0.3 * u) + sway) * k, u * L * k)
    }
  }
  g.lineWidth = Math.max(0.6, 0.012 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.32 * a)
  g.stroke(ten)
  // The bell.
  const bell = new Path2D()
  bell.moveTo(-w * k, 0)
  bell.bezierCurveTo(-w * k, -h * 1.25 * k, w * k, -h * 1.25 * k, w * k, 0)
  bell.quadraticCurveTo(0, 0.12 * s * k, -w * k, 0)
  g.fillStyle = rgbaOf(DEEP.jelly, 0.2 * a)
  g.fill(bell)
  g.lineWidth = Math.max(0.7, 0.025 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.55 * a)
  g.stroke(bell)
  // The stomach inside, the brightest of it.
  g.beginPath()
  g.ellipse(0, -h * 0.42 * k, 0.42 * w * k, 0.3 * h * k, 0, 0, Math.PI * 2)
  g.fillStyle = rgbaOf(DEEP.jelly, 0.22 * a)
  g.fill()
  g.restore()
}

/* ------------------------------------------------------------------ all of the far water */

/**
 * The far water, behind the machine: the far rays, the far snow, the school milling, the jellyfish. Drawn inside the
 * water's clip, so none of it comes above the skin.
 */
export function drawDeepBack(g: C2, v: View, t: number): void {
  const life = underAt(t)
  // Two fans of rays: many thin far ones, fewer and broader nearer.
  drawRays(g, v, t, { z: 0.4, n: 44, seed: 3, a: 0.13, w: [0.02, 0.12], len: 12, color: DEEP.jade })
  drawRays(g, v, t, { z: 0.75, n: 13, seed: 5, a: 0.085, w: [0.1, 0.32], len: 9, color: DEEP.jade })
  layer(g, v, 0.32, DEEP_AT, DEEP_REF, (inner) => {
    drawSnow(g, inner, t, 'far', 1)
    drawSchool(g, inner.k, t, [4.4, 4.4], 200, 2.0, 7, life * smooth(t, BEGIN + 0.8, BEGIN + 3))
  })
  layer(g, v, 0.55, DEEP_AT, DEEP_REF, (inner) => {
    drawSchool(g, inner.k, t, [-3.6, 5.0], 110, 1.3, 19, 0.9 * life)
    // A jellyfish rising very slowly, off to the left of him.
    drawJelly(g, inner.k, -2.4 + 0.2 * Math.sin(t * 0.13), 3.2 - 0.035 * (t - BEGIN), 0.55, t, 0.3, 0.8 * life)
  })
}

/** The near water: the rays nearer than him, and the second jellyfish, nearer and larger. Over the machine, under him. */
export function drawDeepFront(g: C2, v: View, t: number): void {
  const life = underAt(t)
  drawRays(g, v, t, { z: 1.3, n: 5, seed: 11, a: 0.07, w: [0.2, 0.55], len: 7, color: DEEP.jade, add: true })
  layer(g, v, 1.25, DEEP_AT, DEEP_REF, (inner) => {
    drawJelly(g, inner.k, 5.0 + 0.25 * Math.sin(t * 0.1 + 1), 4.4 - 0.05 * (t - BEGIN), 0.9, t, 0.65, 0.55 * life)
  })
  layer(g, v, 1.7, DEEP_AT, DEEP_REF, (inner) => {
    // The near snow: large and soft, out of focus. Each speck a dim halo round a brighter core (the same scatter twice).
    const box = { x0: inner.x0 - 1, y0: W + 0.3, x1: inner.x1 + 1, y1: inner.y1 + 1 }
    const m = { n: 15, seed: 53, tile: [7, 5] as Pt, v: [0.05, 0.1] as Pt, spread: 0.35, sway: [0.16, 0.07] as Pt, within: box }
    motes(g, inner, t, { ...m, r: [0.07, 0.15], color: rgbaOf(DEEP.snow, 0.06 * life) })
    motes(g, inner, t, { ...m, r: [0.035, 0.07], color: rgbaOf(DEEP.snow, 0.13 * life) })
  })
}
