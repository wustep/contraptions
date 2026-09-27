import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { mixHex } from '../../../../../parts'
import { drawHeptapod, drawLogogram, drawSpray, heptapodTip, type HeptapodOpts } from '../cast'
import { frame, hash } from '../kit'
import { FOG } from '../worlds'
import { clamp01, inkAt, marksAt, mono, onInk, sstep, type Ring } from './fog-path'
import { costelloNib, F3, F4, FOG1, GREAT, P0, RINGS } from './fog-plan'

/**
 * Beyond the glass, drawn: white fog without a floor, soft volumes drifting at several depths, a denser white far
 * below; Costello near and huge, Abbott further back and paler; the rings they write hanging where and when they
 * were written. Everything is read from the plan by show time, so the ink she rides is the ink drawn.
 */

type Frame = ReturnType<typeof frame>
const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the air */

const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/** A soft lobe of fog: dense in the middle, gone at its edge; long and low, never a round cartoon cloud. */
function lobe(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, col: string, a: number): void {
  if (a <= 0.004 || rx * k < 1) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, `rgba(${col}, ${a})`)
  g.addColorStop(0.5, `rgba(${col}, ${a * 0.62})`)
  g.addColorStop(1, `rgba(${col}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** Where a point of a layer at depth `d` (1 her plane .. toward 0 far off) is drawn, seen from the frame's centre. */
const seen = (f: Frame, d: number, x: number, y: number): Pt => [f.cx + d * (x - f.cx), f.cy + d * (y - f.cy)]

interface Layer {
  d: number
  /** Spacing of its lobes (layer cells), their size, drift (cells a second), colours and strength. */
  step: number
  size: number
  drift: number
  cols: string[]
  a: number
  seed: number
}
const LAYERS: Layer[] = [
  { d: 0.28, step: 6.5, size: 7.5, drift: 0.05, cols: [FOG.grey, FOG.deep, FOG.deep], a: 0.42, seed: 1 },
  { d: 0.5, step: 6, size: 5.5, drift: 0.09, cols: [FOG.grey, FOG.deep, FOG.white], a: 0.34, seed: 2 },
  { d: 0.78, step: 7.5, size: 4.5, drift: 0.14, cols: [FOG.white, FOG.grey], a: 0.3, seed: 3 },
]

function drawLayer(p: p5, k: number, f: Frame, L: Layer, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The part of the layer in view: the frame taken back through its depth.
  const x0 = f.cx + (f.x0 - f.cx) / L.d - L.size * 2
  const x1 = f.cx + (f.x1 - f.cx) / L.d + L.size * 2
  const y0 = f.cy + (f.y0 - f.cy) / L.d - L.size
  const y1 = f.cy + (f.y1 - f.cy) / L.d + L.size
  const shift = L.drift * t
  const sy = L.step * 0.55
  for (let j = Math.floor(y0 / sy); j <= Math.ceil(y1 / sy); j++) {
    for (let i = Math.floor((x0 - shift) / L.step); i <= Math.ceil((x1 - shift) / L.step); i++) {
      const hx = hash(i, j, L.seed)
      const hy = hash(i, j, L.seed + 7)
      const lx = (i + 0.2 + 0.6 * hx) * L.step + shift + Math.sin(t * 0.07 + i * 1.3 + j) * 0.8
      const ly = (j + 0.2 + 0.6 * hy) * sy + Math.sin(t * 0.05 + i * 0.7) * 0.3
      const [x, y] = seen(f, L.d, lx, ly)
      const size = L.size * (0.6 + 0.8 * hash(i, j, L.seed + 3)) * L.d
      // Far below the fog is denser and whiter: its lobes turn white and thicken there.
      const below = sstep((ly - 4) / 10)
      const col = below > 0.5 ? FOG.white : L.cols[Math.floor(hash(i, j, L.seed + 5) * L.cols.length)]
      const a = L.a * (0.55 + 0.45 * Math.sin(t * 0.11 + hx * 9)) * (1 + 0.8 * below)
      lobe(ctx, k, x, y, size, size * (0.26 + 0.16 * hy), rgb(col), a)
    }
  }
}

function drawAir(p: p5, k: number, f: Frame, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The light from nowhere: a little greyer overhead (where the heptapods are), whiter below, by where the frame is.
  const top = mixHex(FOG.white, FOG.grey, 0.55 * clamp01(1 - (f.y0 + 14) / 22))
  const bottom = mixHex(FOG.white, '#FFFFFF', 0.25 * clamp01((f.y1 - 2) / 10))
  const gr = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
  gr.addColorStop(0, top)
  gr.addColorStop(1, bottom)
  ctx.fillStyle = gr
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  for (const L of LAYERS.slice(0, 2)) drawLayer(p, k, f, L, t)
}

/* ------------------------------------------------------------------ the heptapods */

interface Staged {
  at: Pt
  depth: number
  o: HeptapodOpts
}

/** The seven limbs' standing feet (the canonical drawing's), as shares of its height from its origin. */
const FEET_X = [-0.62, -0.4, -0.2, 0.02, 0.22, 0.43, 0.6]

/**
 * Costello: where it stands by show time (its origin, fog cells). It stands high over her way, its feet just above
 * the close frames, so what comes down into them is only what it does: a limb reaching, a jet of ink. It keeps up
 * with her slowly, and moves on while the lake house is on the screen.
 */
const costelloAt = (() => {
  const g = GREAT.ring
  const x = mono([[130, 7.5], [139.6, 8.2], [142.3, 19], [148, 26], [152.5, 32], [156.3, 36.5], [159.9, g.c[0] + 1.2], [186, g.c[0] + 1.6]])
  const y = mono([[130, -4.6], [139.6, -4.8], [142.3, -12.6], [148, -12.9], [152.5, -13.4], [156.3, -14.3], [159.9, g.c[1] - g.r - 1.8], [186, g.c[1] - g.r - 1.6]])
  return (t: number): Pt => [x(t), y(t)]
})()
const COSTELLO_H = 16

/** The limb whose foot is nearest `x` (fog cells), for a heptapod standing at `at`. */
const nearestLimb = (at: Pt, h: number, x: number, skip = -1): number => {
  let best = 0
  for (let i = 1; i < 7; i++) if (i !== skip && Math.abs(at[0] + FEET_X[i] * h - x) < Math.abs(at[0] + FEET_X[best] * h - x)) best = i
  return best
}

/** Where a ring's first ink lands (fog cells): the point its writing jet goes to. */
const firstInk = (r: Ring): Pt => onInk(r, (r.lo(r.born) + r.hi(r.born)) / 2 + r.spin(r.born), r.born)

/** What Costello's reaching limb is doing at `t`: writing a ring, spinning the crescent, or the great ring's pen. */
function costelloReach(t: number, at: Pt): { limb: number; to: Pt; u: number } | undefined {
  // Writing: the limb nearest reaches down toward where the ring will be while its jet goes, then draws back.
  for (const r of RINGS) {
    if (!r.by || r.by.who !== 'costello' || r.key === 'G') continue
    const t0 = r.by.t0
    if (t < t0 - 0.9 || t > r.born + 1.5) continue
    const target = firstInk(r)
    const u = 0.6 * sstep((t - (t0 - 0.9)) / 0.9) * (1 - sstep((t - (r.born + 0.2)) / 1.3))
    return { limb: nearestLimb(costelloAt(t0), COSTELLO_H, target[0], 3), to: [target[0] - at[0], target[1] - at[1]], u }
  }
  // Spinning the crescent (fog3's three pushes, fog4's kick): its front limb comes down, its tip on the rim, and
  // pushes it round, carried with it a little way, and lifts off.
  const W = RINGS.find((r) => r.key === 'W')
  if (W) {
    const spins: [number, number][] = [[F3.taps[0], F3.taps[2] + 0.2], [F4.kick, F4.kick + 0.18]]
    for (const [a, b] of spins) {
      if (t < a - 1.1 || t > b + 1.0) continue
      const on = sstep((t - (a - 1.1)) / 1.1) * (1 - sstep((t - b) / 0.8))
      // The crescent's tail (its upper end, on its left side), pushed down and round, carried with its turn.
      const tail = W.hi(a) - 0.25
      const ang = tail + W.spin(Math.min(Math.max(t, a), b))
      const rim = onInk(W, ang, t)
      return { limb: 3, to: [rim[0] - at[0], rim[1] - at[1]], u: on }
    }
  }
  // The great ring's second pen: its front limb on the ring's top from the first ink to the close, then back.
  if (t > F4.stop - 0.2 && t < F4.close + 2.2) {
    const nib = costelloNib(Math.max(F4.top, Math.min(t, F4.close)))
    const u = sstep((t - (F4.stop - 0.2)) / (F4.top - F4.stop + 0.2)) * (1 - sstep((t - (F4.close + 0.2)) / 1.8))
    return { limb: 3, to: [nib[0] - at[0], nib[1] - at[1]], u }
  }
  return undefined
}

function costello(t: number): Staged {
  const at = costelloAt(t)
  const o: HeptapodOpts = {
    t,
    h: COSTELLO_H,
    who: 1,
    fog: 0.42,
    air: FOG.white,
    color: FOG.heptapod,
    reach: costelloReach(t, at),
    // What it does comes out of the fog: the reaching limb clearer than the body it leaves.
    reachFog: 0.24,
    lean: 0.05 * Math.sin(t * 0.13),
  }
  return { at, depth: 1, o }
}

/**
 * Abbott: in fog1, near, its palm under her (the glass gone); it lets her go and draws back into the white until it
 * is gone in it. In the push it is there again, far off and pale, and writes one far answer.
 */
const ABBOTT_H = 15
const ABBOTT_NEAR: Pt = [P0[0] - 3.5, P0[1] - 3.9]
function abbott(t: number): Staged | null {
  const rel = FOG1.release
  if (t < 160) {
    const back = sstep((t - (rel + 0.3)) / 6.5)
    if (back >= 0.999) return null
    const reachU = 1 - sstep((t - (rel - 0.1)) / 2.4)
    const o: HeptapodOpts = {
      t,
      h: ABBOTT_H,
      who: 0,
      fog: 0.1 + 0.9 * back,
      air: FOG.white,
      color: FOG.heptapod,
      // Its palm a little above her, so she rests in the cup of its lower fingers.
      reach: reachU > 0.01 ? { limb: 3, to: [P0[0] - ABBOTT_NEAR[0], P0[1] - 0.38 - ABBOTT_NEAR[1]], u: reachU } : undefined,
      palm: 1 - sstep((t - (rel - 0.25)) / 0.5),
      lean: 0.06 * (1 - back),
    }
    return { at: [ABBOTT_NEAR[0] - 2.5 * back, ABBOTT_NEAR[1] - 3 * back], depth: 1 - 0.35 * back, o }
  }
  const come = sstep((t - 169.5) / 4)
  if (come <= 0.001) return null
  const g = GREAT.ring
  const o: HeptapodOpts = { t, h: ABBOTT_H, who: 0, fog: 1 - 0.32 * come, air: FOG.white, color: FOG.heptapodFar, lean: 0.03 * Math.sin(t * 0.1) }
  // Its writing limb, reaching toward its far ring as it writes it.
  const s = t - FAR.born
  if (s > -1.6 && s < 1.6) {
    const u = 0.5 * sstep((s + 1.6) / 1.0) * (1 - sstep((s - 0.2) / 1.2))
    o.reach = { limb: 5, to: [FAR.at[0] - (g.c[0] - 14), FAR.at[1] + FAR.r + 9], u }
  }
  return { at: [g.c[0] - 14, -9], depth: 0.45, o }
}

function drawStaged(p: p5, k: number, f: Frame, s: Staged): void {
  const [x, y] = seen(f, s.depth, s.at[0], s.at[1])
  p.push()
  p.translate(x * k, y * k)
  drawHeptapod(p, k * s.depth, s.o)
  p.pop()
}

/** Where a staged heptapod's limb tip is drawn, fog cells. */
function tipOf(f: Frame, s: Staged, limb: number): Pt {
  const [tx, ty] = heptapodTip(s.o, limb)
  return seen(f, s.depth, s.at[0] + tx, s.at[1] + ty)
}

/* ------------------------------------------------------------------ Abbott's far writing */

/** The logogram Abbott writes far off in the push, behind the great ring: pale, small with distance. */
const FAR = { seed: 223, r: 1.9, at: [GREAT.ring.c[0] - 15, -7.5] as Pt, born: 175.3, d: 0.42 }

/* ------------------------------------------------------------------ the rings */

function drawRing(p: p5, k: number, ring: Ring, t: number): void {
  const ink = inkAt(ring, t)
  if (!ink) return
  const marks = marksAt(ring, t)
  const base = { r: ring.r, seed: ring.seed, t, spin: ink.spin, fade: ink.fade, color: FOG.ink, light: ring.light, marks, taper: ink.taper }
  p.push()
  p.translate(ring.c[0] * k, ring.c[1] * k)
  if (ring.key === 'G' && t < ring.closed) {
    // The great ring, as it is written: her half from her pen at its bottom, Costello's from its pen at its top,
    // each the same ink turned half a turn from the other.
    const lo = ring.lo(t)
    const hi = ring.hi(t)
    const half = Math.max(0, (hi - lo) / 2)
    const form = 0.7 * (0.5 - Math.sin(Math.asin(1 - 2 * Math.min(1, half / Math.PI)) / 3)) * 0.9999
    const taper = Math.min(ring.taper, Math.max(0.015, 0.3 * (TAU - 4 * half)))
    drawLogogram(p, k, { ...base, start: (lo + hi) / 2, form, taper })
    drawLogogram(p, k, { ...base, start: (lo + hi) / 2 - Math.PI, form, taper })
  } else {
    drawLogogram(p, k, { ...base, start: ink.start, form: ink.form })
  }
  p.pop()
}

/* ------------------------------------------------------------------ the set */

/** The fog's standing drawing, for the whole show (it is only ever on the stage while she is beyond the glass). */
export function drawFog(p: p5, k: number, t: number): void {
  const f = frame(p, k)
  p.push()
  p.noStroke()
  drawAir(p, k, f, t)
  // Abbott (and its far writing), then the middle air, then Costello, then a last thin veil, then the ink.
  const A = abbott(t)
  if (A && A.depth < 0.5) {
    const s = t - FAR.born
    if (s > -1.2) {
      const [x, y] = seen(f, FAR.d, FAR.at[0], FAR.at[1])
      p.push()
      p.translate(x * k, y * k)
      drawLogogram(p, k * FAR.d, { r: FAR.r, seed: FAR.seed, t, form: sstep(s / 3.2), color: FOG.inkSoft, light: 0.42 })
      p.pop()
      if (s < 0.6) drawSpray(p, k, tipOf(f, A, 5), seen(f, FAR.d, FAR.at[0], FAR.at[1] + FAR.r), (s + 1.2) / 1.2, FOG.inkSoft, 0.6)
    }
  }
  if (A) drawStaged(p, k, f, A)
  drawLayer(p, k, f, LAYERS[2], t)
  const C = costello(t)
  drawStaged(p, k, f, C)
  // The white they stand in: the upper frame thickens to it, so a limb comes down out of the fog, not from the edge.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const vh = (f.y1 - f.y0) * 0.42
  const veil = ctx.createLinearGradient(0, f.y0 * k, 0, (f.y0 + vh) * k)
  veil.addColorStop(0, `rgba(${rgb(FOG.white)}, 0.66)`)
  veil.addColorStop(0.28, `rgba(${rgb(FOG.white)}, 0.2)`)
  veil.addColorStop(1, `rgba(${rgb(FOG.white)}, 0)`)
  ctx.fillStyle = veil
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (vh + 1) * k)
  for (const ring of RINGS) drawRing(p, k, ring, t)
  // The sprays: from the writing limb's tip to where the ring begins, landing as its first ink comes.
  for (const ring of RINGS) {
    if (!ring.by) continue
    const u = (t - ring.by.t0) / (ring.born - ring.by.t0)
    if (u <= 0 || u >= 1.6) continue
    const start = (ring.lo(ring.born) + ring.hi(ring.born)) / 2 + ring.spin(ring.born)
    const reach = C.o.reach
    const limb = reach ? reach.limb : ring.by.limb
    drawSpray(p, k, tipOf(f, C, limb), onInk(ring, start, ring.born), u, FOG.ink, 1.15)
  }
  p.pop()
}

/** The fog's cells: all of it, in steps (the stage draws a piece whenever one of its cells is in view). */
export const FOG_EXTENT = { x0: -14, y0: -26, x1: 66, y1: 12 }
