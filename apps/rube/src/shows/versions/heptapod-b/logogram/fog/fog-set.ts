import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { mixHex } from '../../../../../parts'
import { drawHeptapod, drawLogogram, drawSpray, heptapodTip, type HeptapodOpts } from '../cast'
import { frame, hash } from '../kit'
import { SEAM } from '../music'
import { FOG } from '../worlds'
import { clamp01, inkAt, marksAt, mono, onInk, sstep, type Ring } from './fog-path'
import { costelloNib, F3, F4, FOG1, GREAT, herAt, P0, RINGS } from './fog-plan'

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

/** fog2's span, when she goes ring to ring and the fog around her is full of them. */
const F2A = SEAM.fog2
const F2B = SEAM.v2
const inFog2 = (t: number) => t > F2A - 0.3 && t < F2B + 0.3

/** Her way through fog2, smoothed over a couple of seconds (fog cells): what the far presences keep near. */
const wayAt = (() => {
  const xs: [number, number][] = []
  const ys: [number, number][] = []
  for (let t = F2A - 0.6; t <= F2B + 0.6; t += 0.5) {
    let sx = 0
    let sy = 0
    let n = 0
    for (let d = -1.2; d <= 1.2001; d += 0.1) {
      const q = herAt(Math.max(F2A, Math.min(F2B, t + d)))
      sx += q[0]
      sy += q[1]
      n++
    }
    xs.push([t, sx / n])
    ys.push([t, sy / n])
  }
  const x = mono(xs)
  const y = mono(ys)
  return (t: number): Pt => [x(t), y(t)]
})()

/** A point of a layer at depth `d` placed so that, seen from her way, it is at `off` from it (layer cells). */
const behind = (t: number, d: number, off: Pt): Pt => {
  const w = wayAt(t)
  return [w[0] + off[0] / d, w[1] + off[1] / d]
}

/**
 * Costello: where it stands by show time (its origin). Over fog1, and over the crescent and the great ring, it stands
 * high over her way in her own depth, its feet just above the close frames, so what comes down into them is what it
 * does: a limb reaching, a jet of ink. Through fog2 it is behind her way instead, a vast soft shape in the white whose
 * body rises behind her as she goes ring to ring, drifting back past her (it is further off: it moves less).
 */
const costelloHigh = (() => {
  const g = GREAT.ring
  const x = mono([[130, 7.5], [139.6, 8.2], [159.9, g.c[0] + 1.2], [186, g.c[0] + 1.6]])
  // Over the great ring its feet stand clear above the frame: only its pen comes down into the picture, never the
  // ends of its other limbs as stubs along the top edge.
  const y = mono([[130, -4.6], [139.6, -4.8], [159.9, g.c[1] - g.r - 2.6], [186, g.c[1] - g.r - 2.6]])
  return (t: number): Pt => [x(t), y(t)]
})()
const COSTELLO_H = 16
const COSTELLO_FAR = { d: 0.5, h: 18 }
const costelloFarAt = (t: number): Pt => {
  const u = clamp01((t - F2A) / (F2B - F2A))
  // Its body a soft mass in the right of the frame, its shoulders a little over her, its near limbs coming down
  // behind her way; it slides slowly back as she goes on.
  return behind(t, COSTELLO_FAR.d, [6.4 - 2.6 * u, 3.4 - 0.4 * u])
}

/** The limb whose foot is nearest `x` (layer cells), for a heptapod of height `h` standing at `at`. */
const nearestLimb = (at: Pt, h: number, x: number, skip = -1): number => {
  let best = 0
  for (let i = 1; i < 7; i++) if (i !== skip && Math.abs(at[0] + FEET_X[i] * h - x) < Math.abs(at[0] + FEET_X[best] * h - x)) best = i
  return best
}

/** Where a ring's first ink lands (fog cells): the point its writing jet goes to. */
const firstInk = (r: Ring): Pt => onInk(r, (r.lo(r.born) + r.hi(r.born)) / 2 + r.spin(r.born), r.born)

/** A reach toward `P` (in her plane) for a heptapod at `at` in a layer at depth `d`, arching up over its way down. */
function reachFor(f: Frame, at: Pt, d: number, limb: number, P: Pt, u: number): { limb: number; to: Pt; u: number; bow: number } {
  const X: Pt = [f.cx + (P[0] - f.cx) / d, f.cy + (P[1] - f.cy) / d]
  const to: Pt = [X[0] - at[0], X[1] - at[1]]
  const rootX = (limb - 3) * 0.036
  return { limb, to, u, bow: to[0] < rootX ? 0.13 : -0.13 }
}

type Reach = NonNullable<HeptapodOpts['reach']>

/**
 * The limb that writes ring `r`: the one whose foot is nearest where its first ink lands, as things stand when it is
 * born, chosen once. (Chosen afresh every frame from the moving camera, it flipped to another limb in a single frame
 * whenever the frame's middle passed between two feet.)
 */
function writerLimb(r: Ring): number {
  const tb = r.born
  const far = inFog2(tb)
  const at = far ? costelloFarAt(tb) : costelloHigh(tb)
  const d = far ? COSTELLO_FAR.d : 1
  const h = far ? COSTELLO_FAR.h : COSTELLO_H
  // The frame's middle, there: her way (what the far presences are placed from).
  const cx = wayAt(tb)[0]
  const P = firstInk(r)
  return nearestLimb(at, h, cx + (P[0] - cx) / d, 3)
}

/**
 * What Costello's reaching limbs are doing at `t`: writing rings, spinning the crescent, or the great ring's pen. The
 * strongest first. Rings written close together overlap: each one's limb comes and goes on its own, so the next one's
 * reach never appears all at once as the last one's ends (it did: a limb switched in a single frame).
 */
function costelloReaches(t: number, f: Frame, at: Pt, d: number): Reach[] {
  // Writing: the limb nearest reaches toward where the ring will be while its jet goes, then draws back.
  const writing: Reach[] = []
  for (const r of RINGS) {
    if (!r.by || r.by.who !== 'costello' || r.key === 'G') continue
    const t0 = r.by.t0
    if (t < t0 - 0.9 || t > r.born + 1.5) continue
    const u = 0.6 * sstep((t - (t0 - 0.9)) / 0.9) * (1 - sstep((t - (r.born + 0.2)) / 1.3))
    if (u <= 1e-4) continue
    const a = reachFor(f, at, d, writerLimb(r), firstInk(r), u)
    // Two on the one limb: it goes between them as much as each has reached, never jumping from one to the other.
    const same = writing.find((w) => w.limb === a.limb)
    if (same) {
      const k = a.u / (a.u + same.u)
      same.to = [same.to[0] + (a.to[0] - same.to[0]) * k, same.to[1] + (a.to[1] - same.to[1]) * k]
      same.bow = (same.bow ?? 0) + ((a.bow ?? 0) - (same.bow ?? 0)) * k
      same.u = Math.max(same.u, a.u)
    } else writing.push(a)
  }
  if (writing.length) return writing.sort((a, b) => b.u - a.u)
  const one = costelloOther(t, f, at, d)
  return one ? [one] : []
}

/** Costello's reach when it is not writing: spinning the crescent, or the great ring's pen. */
function costelloOther(t: number, f: Frame, at: Pt, d: number): HeptapodOpts['reach'] {
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
      const rim = onInk(W, tail + W.spin(Math.min(Math.max(t, a), b)), t)
      return reachFor(f, at, d, 3, rim, on)
    }
  }
  // The great ring's second pen: its front limb on the ring's top from the first ink to the close, then back.
  if (t > F4.stop - 0.2 && t < F4.close + 2.2) {
    const nib = costelloNib(Math.max(F4.top, Math.min(t, F4.close)))
    const u = sstep((t - (F4.stop - 0.2)) / (F4.top - F4.stop + 0.2)) * (1 - sstep((t - (F4.close + 0.2)) / 1.8))
    return reachFor(f, at, d, 3, nib, u)
  }
  return undefined
}

function costello(t: number, f: Frame): Staged {
  const far = inFog2(t)
  const at = far ? costelloFarAt(t) : costelloHigh(t)
  const d = far ? COSTELLO_FAR.d : 1
  const h = far ? COSTELLO_FAR.h : COSTELLO_H
  const reaches = costelloReaches(t, f, at, d)
  const o: HeptapodOpts = {
    t,
    h,
    who: 1,
    // Behind her way it is a soft mass far back in the white (the rings she rides are the picture); over it, a shape
    // in fog.
    fog: far ? 0.68 : 0.42,
    air: FOG.white,
    color: FOG.heptapod,
    reach: reaches[0],
    also: reaches.slice(1),
    // What it does comes out of the fog: the reaching limb clearer than the body it leaves.
    reachFog: far ? 0.42 : 0.24,
    lean: 0.05 * Math.sin(t * 0.13),
  }
  return { at, depth: d, o }
}

/**
 * Abbott: in fog1, near, its palm under her (the glass gone); it lets her go and draws back into the white until it
 * is gone in it. Through fog2 it is there again far off, behind Costello, paler; in the push, far and pale, watching:
 * the great ring is the only writing then.
 */
const ABBOTT_H = 15
const ABBOTT_NEAR: Pt = [P0[0] - 3.5, P0[1] - 3.9]
function abbott(t: number): Staged | null {
  const rel = FOG1.release
  if (t < F2A - 0.3) {
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
  if (inFog2(t)) {
    const u = clamp01((t - F2A) / (F2B - F2A))
    const o: HeptapodOpts = { t, h: 18, who: 0, fog: 0.84, air: FOG.white, color: FOG.heptapodFar, lean: 0.03 * Math.sin(t * 0.1) }
    return { at: behind(t, 0.3, [-3.6 - 2.4 * u, 3.4]), depth: 0.3, o }
  }
  if (t < 160) return null
  const come = sstep((t - 169.5) / 4)
  if (come <= 0.001) return null
  const g = GREAT.ring
  const o: HeptapodOpts = { t, h: ABBOTT_H, who: 0, fog: 1 - 0.32 * come, air: FOG.white, color: FOG.heptapodFar, lean: 0.03 * Math.sin(t * 0.1) }
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

/* ------------------------------------------------------------------ the writing already in the fog */

/**
 * Logograms hanging at depth along fog2 (written before, or far off while she goes): paler and smaller with distance,
 * each placed to be seen from her way at `tc` at `off` from her, so the fog fills with writing as the show goes.
 */
const HANGING = [
  { seed: 401, r: 2.6, d: 0.36, born: 126.5, tc: 143.6, off: [3.9, -2.2] as Pt },
  { seed: 419, r: 2.9, d: 0.34, born: 140.5, tc: 147.6, off: [4.4, 2.0] as Pt },
  { seed: 421, r: 2.3, d: 0.4, born: 146.9, tc: 150.6, off: [-4.2, -2.1] as Pt },
  { seed: 431, r: 2.7, d: 0.35, born: 149.4, tc: 153.3, off: [4.0, -2.6] as Pt },
].map((h) => ({ ...h, at: behind(h.tc, h.d, h.off) }))

function drawHanging(p: p5, k: number, f: Frame, t: number): void {
  if (!inFog2(t)) return
  for (const w of HANGING) {
    const s = t - w.born
    if (s < 0) continue
    const [x, y] = seen(f, w.d, w.at[0], w.at[1])
    if (x + w.r * w.d < f.x0 - 1 || x - w.r * w.d > f.x1 + 1 || y + w.r * w.d < f.y0 - 1 || y - w.r * w.d > f.y1 + 1) continue
    p.push()
    p.translate(x * k, y * k)
    drawLogogram(p, k * w.d, { r: w.r, seed: w.seed, t, form: 0.35 + 0.65 * sstep(s / 3.4), start: hash(w.seed, 1) * TAU, spin: 0.02 * t, fade: clamp01((s - 30) / 40), color: mixHex(FOG.inkSoft, FOG.white, 0.55), light: 0.16 })
    p.pop()
  }
}

/* ------------------------------------------------------------------ the rings */

function drawRing(p: p5, k: number, ring: Ring, t: number): void {
  const ink = inkAt(ring, t)
  if (!ink) return
  const marks = marksAt(ring, t)
  // Where she is on it, when she is on it (or all but): so no tendril grows out of her.
  const her = herAt(t)
  const dx = her[0] - ring.c[0]
  const dy = her[1] - ring.c[1]
  const clear = Math.abs(Math.hypot(dx, dy) - ring.r) < 0.6 ? Math.atan2(dy, dx) - ink.spin : undefined
  const back = ring.recede === undefined ? 1 : 1 - 0.6 * sstep((t - ring.recede) / 1.0)
  const base = { r: ring.r, seed: ring.seed, t, spin: ink.spin, fade: ink.fade, color: FOG.ink, light: ring.light * back, marks, taper: ink.taper, clear }
  p.push()
  p.translate(ring.c[0] * k, ring.c[1] * k)
  if (ring.key === 'G' && t < ring.closed) {
    // The great ring, as it is written: her half from her pen at its bottom, Costello's from its pen at its top,
    // each the same ink turned half a turn from the other. Each half's tail is held a little short of the other's pen
    // (the inks' round ends would otherwise run together a second and more early, and the ring read closed before it
    // is), and on the close the tails run into the gaps: the halves meet on 183.182, seen to. Held only where it comes
    // near that pen (half a turn back from its own head): early on the ink runs out both ways from under her.
    const hi = ring.hi(t)
    const lo = Math.max(ring.lo(t), hi - Math.PI + JOIN_GAP * (1 - sstep((t - (ring.closed - JOIN_RUN)) / JOIN_RUN)))
    const half = Math.max(0, (hi - lo) / 2)
    const form = 0.7 * (0.5 - Math.sin(Math.asin(1 - 2 * Math.min(1, half / Math.PI)) / 3)) * 0.9999
    // Each half's ends run out to a point over as much of the ink as lies between her pen and them, so they read as
    // ink running, not a blunt cut, and never thin under her, where she rides it at its full thickness (her place on
    // it is worked out from its whole width).
    const pen = GREAT.her(t) - GREAT.spin(t)
    const lead = Math.min(LEAD_TAPER, 0.8 * Math.min(hi - pen, pen - lo))
    const taper = Math.min(lead, Math.max(0.015, 0.3 * (TAU - 4 * half)))
    drawLogogram(p, k, { ...base, start: (lo + hi) / 2, form, taper })
    drawLogogram(p, k, { ...base, start: (lo + hi) / 2 - Math.PI, form, taper })
  } else {
    drawLogogram(p, k, { ...base, start: ink.start, form: ink.form })
  }
  p.pop()
}

/* ------------------------------------------------------------------ the set */

/** How far short of the other half's pen each half's tail is held while the great ring is written, and how long its run into the gap on the close takes. */
const JOIN_GAP = 0.35
const JOIN_RUN = 0.18
/** The most a half of the great ring's forming ends taper over, radians (as other rings' do). */
const LEAD_TAPER = 0.4

/** The fog's standing drawing, for the whole show (it is only ever on the stage while she is beyond the glass). */
export function drawFog(p: p5, k: number, t: number): void {
  const f = frame(p, k)
  p.push()
  p.noStroke()
  drawAir(p, k, f, t)
  // Far off: Abbott, and the logograms hanging at depth; then Costello behind her way, the nearer air,
  // Costello over it; then the white the tops of them go into; then the ink.
  // While Abbott holds her it is the nearest of them (in her plane, and darker than Costello in the fog), so it is
  // drawn over the nearer air and over Costello's reaching limb; as it draws back it goes behind them again.
  const A = abbott(t)
  const holding = A !== null && A.depth > 0.95
  if (A && !holding) drawStaged(p, k, f, A)
  drawHanging(p, k, f, t)
  const C = costello(t, f)
  if (C.depth < 1) drawStaged(p, k, f, C)
  drawLayer(p, k, f, LAYERS[2], t)
  if (C.depth >= 1) drawStaged(p, k, f, C)
  if (A && holding) drawStaged(p, k, f, A)
  // The white they stand in: the upper frame thickens to it, so a limb comes down out of the fog, not from the edge
  // (less in the wide frames, where the heptapods are far up it).
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const wide = sstep((f.y1 - f.y0 - 7) / 4)
  const vh = (f.y1 - f.y0) * (0.52 - 0.1 * wide)
  const veil = ctx.createLinearGradient(0, f.y0 * k, 0, (f.y0 + vh) * k)
  veil.addColorStop(0, `rgba(${rgb(FOG.white)}, ${0.84 - 0.2 * wide})`)
  veil.addColorStop(0.3, `rgba(${rgb(FOG.white)}, ${0.42 - 0.2 * wide})`)
  veil.addColorStop(0.62, `rgba(${rgb(FOG.white)}, ${0.1 - 0.05 * wide})`)
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
    // Its own ring's limb (rings close together are written by two limbs at once): the one nearest its first ink.
    const reaching = [C.o.reach, ...(C.o.also ?? [])].filter((r): r is Reach => !!r)
    const own = writerLimb(ring)
    const limb = reaching.some((r) => r.limb === own) ? own : (C.o.reach?.limb ?? ring.by.limb)
    drawSpray(p, k, tipOf(f, C, limb), onInk(ring, start, ring.born), u, FOG.ink, 1.15)
  }
  p.pop()
}

/** The fog's cells: all of it, in steps (the stage draws a piece whenever one of its cells is in view). */
export const FOG_EXTENT = { x0: -14, y0: -26, x1: 66, y1: 12 }
