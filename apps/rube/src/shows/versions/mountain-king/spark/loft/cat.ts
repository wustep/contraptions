import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { LOFT } from '../worlds'
import { FLOOR_Y } from './layout'
import { fireLight, shade, type Light } from './stove-light'

/**
 * The cat: a grey tabby asleep on the floor in front of the stove, curled with its back to the room and its head
 * tucked at the east end, facing back along its body (west), its chin on its paws and its tail laid out west along
 * the boards. It is the only creature in the show, and it never leaves the loft. LOFT-B's.
 *
 * It breathes, slow (about four seconds a breath), and it reacts only on its cues:
 *
 * - `CAT_CUES.ear` (LOFT-A's): an ear flicks while the rack's candles knock.
 * - `CAT_CUES.stir[0]` (42.455): the tail's tip lifts and flops, right in front of the spark.
 * - `CAT_CUES.stir[1]` (51.384): it shifts in its sleep, a heave of the shoulders, and the spark riding them is tossed
 *   up the stove's hot face.
 * - `CAT_CUES.wake` (149.815): the stove door bangs. Its eye snaps open, it lifts its head and looks at the candle
 *   (a candle burning, as candles do), and by about 154 it is asleep again.
 *
 * Everything here is in the loft's world cells; `h` is height above the floor. The spark rides the cat by
 * `catTop` and `tailTop`, which read the same shapes this draws.
 */

export const CAT_CUES = {
  /** An ear flicks (LOFT-A's slot: the drying rack's candles knock together). */
  ear: [25.653, 28.961],
  /** The tail twitches, or the cat shifts in its sleep (LOFT-B's slot). */
  stir: [42.455, 51.384],
  /** Wide awake: the door has banged. */
  wake: 149.815,
}

/** LOFT-B's own ear flick: the spark comes to the shoulders, right by the ear. */
export const EAR_NEAR = 50.267

const F = FLOOR_Y
const Y = (h: number): number => F - h

/* ------------------------------------------------------------------ splines */

/** A Catmull-Rom curve through `pts`, `n` samples a span. Closed joins the last point to the first. */
export function spline(pts: Pt[], closed: boolean, n = 6): Pt[] {
  const out: Pt[] = []
  const m = pts.length
  const at = (i: number): Pt => (closed ? pts[((i % m) + m) % m] : pts[Math.max(0, Math.min(m - 1, i))])
  const spans = closed ? m : m - 1
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    for (let j = 0; j < n; j++) {
      const u = j / n
      const u2 = u * u
      const u3 = u2 * u
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  if (!closed) out.push(pts[m - 1])
  return out
}

/* ------------------------------------------------------------------ motion */

/** The breath: -1..1, about four seconds a breath. */
export const breath = (t: number): number => Math.sin((2 * Math.PI * (t - 0.4)) / 4.2)

/** The shift in its sleep (51.384): the shoulders heave up, and the whole cat sighs down after. Cells. */
export function heave(t: number): number {
  const s = t - CAT_CUES.stir[1]
  if (s < 0) return 0
  return 0.32 * (1 - Math.exp(-s / 0.075)) * Math.exp(-s / 0.5) - 0.06 * smooth(s, 0.35, 0.9) * Math.exp(-Math.max(0, s - 0.9) / 1.4)
}

/** How far the tail's tip is lifted by its twitch (42.455) or its lash on waking (149.815), and swung (cells). */
function twitch(t: number): { lift: number; swing: number } {
  let lift = 0
  let swing = 0
  const s = t - CAT_CUES.stir[0]
  if (s >= -0.05) {
    const u = Math.max(0, s + 0.05)
    // A lash: the tip lifts and sweeps back and forth along the boards, a smaller second, still by 43.3.
    lift += 0.62 * Math.sin(Math.min(Math.PI, (u / 0.55) * Math.PI)) * (u < 0.55 ? 1 : 0) + 0.2 * Math.max(0, Math.sin(((u - 0.55) / 0.3) * Math.PI)) * (u > 0.55 && u < 0.85 ? 1 : 0)
    swing += 0.55 * Math.sin(u * 9) * Math.exp(-u / 0.35)
  }
  // Woken by the bang: one lash of the tail, and it lies down again as the cat looks.
  const w = t - CAT_CUES.wake
  if (w >= 0) {
    lift += 0.42 * Math.sin(Math.PI * Math.min(1, w / 0.5)) * Math.exp(-w / 0.9)
    swing += 0.35 * Math.sin(w * 7.5) * Math.exp(-w / 0.45)
  }
  return { lift, swing }
}

/** The ear flick: the near ear's turn, radians (back is negative). */
function earTurn(t: number): number {
  let a = 0
  // A cat's flick: the ear snapped back hard and let go, twice, the second smaller; still again within a second.
  const flick = (s: number, amp: number) => (s < 0 || s > 1.2 ? 0 : -amp * smooth(s, 0, 0.04) * Math.exp(-s / 0.13) * Math.cos(s * 13))
  for (const c of [...CAT_CUES.ear, EAR_NEAR]) a += flick(t - c, 0.95) + flick(t - c - 0.24, 0.6)
  const w = t - CAT_CUES.wake
  if (w >= 0) a += -0.45 * Math.exp(-w / 0.5) * (w < 0.06 ? w / 0.06 : 1)
  return a
}

/** Awake: how open its eye is, how far its head is lifted, 0..1. */
export function awake(t: number): { eye: number; lift: number } {
  const w = t - CAT_CUES.wake
  if (w < 0) return { eye: 0, lift: 0 }
  // The eye snaps open on the bang; the head comes up and it looks; a slow blink half shut, then shut by 154.
  const open = smooth(w, 0, 0.05)
  const blink = 0.55 * smooth(w, 2.9, 3.25) + 0.45 * smooth(w, 3.55, 4.1)
  const lift = smooth(w, 0.04, 0.55) * (1 - smooth(w, 2.55, 3.75))
  return { eye: open * (1 - blink), lift }
}

/* ------------------------------------------------------------------ shapes */

/** The body's outline, rump to chest, over the top (x, h). The floor closes it. */
const BODY: Pt[] = [
  [2.45, 0.0],
  [2.08, 0.38],
  [2.05, 0.9],
  [2.35, 1.42],
  [2.95, 1.8],
  [3.8, 2.02],
  [4.7, 2.08],
  [5.5, 1.98],
  [6.15, 1.75],
  [6.7, 1.42],
  [7.15, 1.0],
  [7.3, 0.5],
  [7.2, 0.0],
]

/** Where the breath and the heave are: the ribs rise most, the shoulders heave. */
const ribs = (x: number): number => Math.exp(-(((x - 4.6) / 1.8) ** 2))
const shoulders = (x: number): number => Math.exp(-(((x - 5.7) / 1.0) ** 2))

function bodyAt(t: number): Pt[] {
  const b = breath(t)
  const hv = heave(t)
  return BODY.map(([x, h]) => [x, h * (1 + 0.032 * b * ribs(x)) + hv * shoulders(x) * Math.min(1, h / 1.2)] as Pt)
}

/** The body's top line, sampled west to east from the haunch to the shoulders (x increasing). */
function topLine(t: number): Pt[] {
  const pts = spline(bodyAt(t), false, 8)
  // From the haunch's top (the first point west of which the line turns down the rump) to the neck.
  return pts.filter(([x, h], i) => i >= 3 * 8 && i <= 9 * 8 && h > 0.5 && x > 2.3)
}

/** The cat's back under x at `t`, in loft cells: where the spark's centre is when it stands there. */
export function catTop(x: number, t: number): number {
  const line = topLine(t)
  for (let i = 1; i < line.length; i++) {
    const [x0, h0] = line[i - 1]
    const [x1, h1] = line[i]
    if (x >= x0 && x <= x1) {
      const h = h0 + ((h1 - h0) * (x - x0)) / (x1 - x0 || 1)
      return Y(h) - R
    }
  }
  const end = x < line[0][0] ? line[0] : line[line.length - 1]
  return Y(end[1]) - R
}

/** The tail's midline, root to tip (x, h), and its thickness along it. */
const TAIL: Pt[] = [
  [2.45, 0.3],
  [1.8, 0.21],
  [0.9, 0.2],
  [0.0, 0.2],
  [-0.6, 0.23],
  [-1.0, 0.33],
  [-1.28, 0.52],
]
const tailWidth = (s: number): number => 0.39 - 0.14 * s

function tailAt(t: number): { mid: Pt[]; s: number[] } {
  const base = spline(TAIL, false, 6)
  const n = base.length
  const { lift, swing } = twitch(t)
  const idle = 0.05 * Math.sin((2 * Math.PI * t) / 9.3)
  const mid = base.map(([x, h], i) => {
    const s = i / (n - 1)
    const w = Math.pow(smooth(s, 0.45, 1), 1.4)
    const tip = smooth(s, 0.82, 1)
    return [x - swing * w + idle * tip * 0.6, h + lift * w + idle * tip] as Pt
  })
  return { mid, s: mid.map((_, i) => i / (n - 1)) }
}

/** The tail's top under x at `t` (x between the curl and the root), in loft cells: the spark's centre on it. */
export function tailTop(x: number, t: number): number {
  const { mid, s } = tailAt(t)
  for (let i = 1; i < mid.length; i++) {
    const [x0, h0] = mid[i - 1]
    const [x1, h1] = mid[i]
    const lo = Math.min(x0, x1)
    const hi = Math.max(x0, x1)
    if (x >= lo && x <= hi && hi - lo > 1e-6) {
      const u = (x - x0) / (x1 - x0)
      const h = h0 + (h1 - h0) * u
      const w = tailWidth(s[i - 1] + (s[i] - s[i - 1]) * u)
      return Y(h + w / 2) - R
    }
  }
  return Y(0.4) - R
}

/* ------------------------------------------------------------------ drawing */

const vtx = (p: p5, k: number, pts: Pt[]) => {
  p.beginShape()
  for (const [x, h] of pts) p.vertex(x * k, Y(h) * k)
  p.endShape(p.CLOSE)
}

/** The body's light: the fur in its dark colour, then the spark's and the fire's light laid over it, clipped to it. */
function furLight(p: p5, k: number, L: Light, pts: Pt[], lit: string): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  pts.forEach(([x, h], i) => (i ? ctx.lineTo(x * k, Y(h) * k) : ctx.moveTo(x * k, Y(h) * k)))
  ctx.closePath()
  ctx.clip()
  const glow = (x: number, y: number, r: number, a: number, col: string) => {
    if (a <= 0.01) return
    const c = p.color(col)
    const rgb = `${p.red(c)}, ${p.green(c)}, ${p.blue(c)}`
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
    g.addColorStop(0, `rgba(${rgb}, ${a})`)
    g.addColorStop(0.45, `rgba(${rgb}, ${a * 0.45})`)
    g.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  }
  if (L.power > 0) glow(L.sx, L.sy, 1.7 + 0.9 * L.power, 0.5 * Math.min(1, L.power), mixHex(lit, LOFT.glow, 0.3))
  // The fire: from the vent while shut, from the doorway while open; always from above and to the east of the cat.
  const f = fireLight(L, 6.3, Y(1.6))
  if (f > 0.01) glow(6.5, 5.1, 5.5, 0.7 * f, mixHex(lit, LOFT.ember, 0.55))
  ctx.restore()
}

/**
 * A rim of light along a top edge (points in x, h), just inside it: the stove's glow and the night catching the fur,
 * so the sleeping cat's shape reads even where the spark's light does not reach it.
 */
function rim(p: p5, k: number, pts: Pt[], col: string, a: number, wide: number): void {
  if (a <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = rgbaOf(col, a)
  ctx.lineWidth = wide * k
  ctx.beginPath()
  pts.forEach(([x, h], i) => (i ? ctx.lineTo(x * k, (Y(h) + wide * 0.45) * k) : ctx.moveTo(x * k, (Y(h) + wide * 0.45) * k)))
  ctx.stroke()
  ctx.restore()
}
const rgbaOf = (hex: string, a: number): string => {
  const v = parseInt(hex.slice(1), 16)
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${a})`
}

/** One tabby stripe across the back: from the top line at x, down the flank, tapering. */
function stripe(p: p5, k: number, top: Pt[], x: number, len: number, wide: number, lean: number): void {
  // The top line's point at x and its inward normal.
  let i = top.findIndex(([px]) => px >= x)
  if (i <= 0) i = 1
  const [x0, h0] = top[i - 1]
  const [x1, h1] = top[i]
  const u = (x - x0) / (x1 - x0 || 1)
  const px = x0 + (x1 - x0) * u
  const ph = h0 + (h1 - h0) * u
  const tx = x1 - x0
  const th = h1 - h0
  const tl = Math.hypot(tx, th) || 1
  // Inward (down into the body): the tangent turned.
  const nx = th / tl
  const nh = -tx / tl
  const pts: Pt[] = []
  const n = 6
  for (let j = 0; j <= n; j++) {
    const v = j / n
    const w = wide * (1 - v) ** 0.8 * 0.5
    const cx = px + nx * len * v + lean * v * v
    const ch = ph + nh * len * v + 0.02
    pts.push([cx - (tx / tl) * w, ch - (th / tl) * w])
  }
  for (let j = n; j >= 0; j--) {
    const v = j / n
    const w = wide * (1 - v) ** 0.8 * 0.5
    const cx = px + nx * len * v + lean * v * v
    const ch = ph + nh * len * v + 0.02
    pts.push([cx + (tx / tl) * w, ch + (th / tl) * w])
  }
  vtx(p, k, pts)
}

/** The head, facing west: its outline about its centre, ears, closed or open eye, nose. Drawn in the head's own frame. */
const HEAD: Pt[] = [
  [-0.78, -0.1],
  [-0.64, 0.2],
  [-0.36, 0.5],
  [0.08, 0.63],
  [0.52, 0.47],
  [0.72, 0.1],
  [0.56, -0.4],
  [-0.08, -0.58],
  [-0.6, -0.36],
]
const HEAD_AT: Pt = [6.82, 1.24]
/** The head's size against its outline's units: big enough to read as a cat's at a distance. */
const HS = 1.18
/** Where the head turns when it lifts: the nape. */
const NAPE: Pt = [7.5, 1.08]

/** The whole cat, lit by `L`. Drawn with the hearth, in front of the stove's legs. */
export function drawCat(p: p5, k: number, ink: string, weight: number, L: Light, t: number): void {
  const w = weight
  const body = spline(bodyAt(t), false, 8)
  const bodyPoly: Pt[] = [...body, [body[body.length - 1][0], 0], [body[0][0], 0]]
  const mid = (x: number, h: number) => [x, Y(h)] as const
  // The big shapes take the spark's light as a pool (`furLight`); the small ones (ears, paws, marks) in their fill.
  const furAt = (x: number, h: number, near = false) => shade(L, ...mid(x, h), LOFT.cat, LOFT.catLit, 0.36, near)
  const deepAt = (x: number, h: number, near = false) => shade(L, ...mid(x, h), LOFT.catDeep, mixHex(LOFT.catDeep, LOFT.catLit, 0.4), 0.32, near)

  p.push()
  p.strokeJoin(p.ROUND)

  /* The tail, behind the body's front: drawn first, laid along the floor. */
  const tail = tailAt(t)
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i < tail.mid.length; i++) {
    const a = tail.mid[Math.max(0, i - 1)]
    const b = tail.mid[Math.min(tail.mid.length - 1, i + 1)]
    const tx = b[0] - a[0]
    const th = b[1] - a[1]
    const tl = Math.hypot(tx, th) || 1
    const hw = tailWidth(tail.s[i]) / 2
    left.push([tail.mid[i][0] - (th / tl) * hw, tail.mid[i][1] + (tx / tl) * hw])
    right.push([tail.mid[i][0] + (th / tl) * hw, tail.mid[i][1] - (tx / tl) * hw])
  }
  // The rounded tip.
  const tip = tail.mid[tail.mid.length - 1]
  const prev = tail.mid[tail.mid.length - 2]
  const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0])
  const cap: Pt[] = []
  for (let j = 1; j < 6; j++) {
    const a = ang + Math.PI / 2 - (j / 6) * Math.PI
    cap.push([tip[0] + Math.cos(a) * tailWidth(1) * 0.5, tip[1] + Math.sin(a) * tailWidth(1) * 0.5])
  }
  const tailPoly: Pt[] = [...left, ...cap, ...right.reverse()]
  p.noStroke()
  p.fill(furAt(0.6, 0.3))
  vtx(p, k, tailPoly)
  // Rings along it, darker, narrowing to the tip.
  p.fill(deepAt(0.6, 0.3))
  for (const [s0, s1] of [
    [0.16, 0.21],
    [0.32, 0.37],
    [0.49, 0.55],
    [0.66, 0.72],
    [0.83, 0.9],
  ]) {
    const i0 = Math.round(s0 * (tail.mid.length - 1))
    const i1 = Math.round(s1 * (tail.mid.length - 1))
    const L0 = left[i0]
    const L1 = left[i1]
    const r = [...right].reverse()
    vtx(p, k, [L0, L1, r[i1], r[i0]])
  }
  furLight(p, k, L, tailPoly, LOFT.catLit)
  rim(p, k, right.slice().reverse().filter((_, i) => i > 1), mixHex(LOFT.catLit, LOFT.ember, 0.25), 0.26, 0.05)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  vtx(p, k, tailPoly)

  /* The body. */
  p.noStroke()
  p.fill(furAt(4.6, 1.2))
  vtx(p, k, bodyPoly)
  // Tabby stripes over the back, each its own width and lean, none the same.
  const top = spline(bodyAt(t), false, 8).filter(([x, h]) => x > 2.2 && h > 0.6)
  p.fill(deepAt(4.4, 1.9))
  const stripes: [number, number, number, number][] = [
    [2.8, 0.58, 0.19, -0.12],
    [3.32, 0.76, 0.23, -0.08],
    [3.88, 0.84, 0.19, -0.03],
    [4.46, 0.8, 0.25, 0.03],
    [5.05, 0.68, 0.18, 0.07],
    [5.58, 0.52, 0.2, 0.1],
  ]
  for (const [x, len, wide, lean] of stripes) stripe(p, k, top, x, len, wide, lean)
  furLight(p, k, L, bodyPoly, LOFT.catLit)
  const rimCol = mixHex(LOFT.catLit, LOFT.ember, 0.25)
  rim(p, k, top.filter(([x]) => x < 7.0), rimCol, 0.34, 0.07)
  // The haunch: the hind leg folded under, its thigh's line, and its foot on the floor.
  const thigh = spline(
    [
      [3.95, 0.02],
      [3.85, 0.62],
      [3.4, 1.12],
      [2.75, 1.22],
      [2.32, 0.9],
    ],
    false,
    6,
  )
  p.fill(furAt(3.9, 0.12))
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  vtx(p, k, [
    ...spline(
      [
        [3.48, 0.0],
        [3.56, 0.17],
        [3.92, 0.25],
        [4.36, 0.2],
        [4.52, 0.06],
      ],
      false,
      5,
    ),
    [4.52, 0.0],
  ])
  p.noFill()
  p.strokeWeight(w * 0.55)
  p.beginShape()
  for (const [x, h] of thigh) p.vertex(x * k, Y(h) * k)
  p.endShape()
  p.strokeWeight(w * 0.75)
  vtx(p, k, bodyPoly)

  /* The forepaws, under the chin, reaching west along the boards (a little further as it stretches in its sleep). */
  const reach = 0.4 * Math.max(0, heave(t) / 0.32)
  const paw = (x0: number, x1: number, hh: number, fill: string) => {
    const pts = spline(
      [
        [x1, 0.0],
        [x1 + 0.05, hh * 0.8],
        [(x0 + x1) / 2, hh],
        [x0 + 0.12, hh * 0.9],
        [x0, hh * 0.45],
        [x0 + 0.1, 0.0],
      ],
      false,
      5,
    )
    p.fill(fill)
    p.stroke(ink)
    p.strokeWeight(w * 0.65)
    vtx(p, k, pts)
  }
  paw(5.72 - reach * 0.7, 6.95, 0.27, deepAt(6.2, 0.2))
  paw(5.48 - reach, 6.75, 0.31, furAt(6.0, 0.2))

  /* The head: tucked, facing west, its chin on its paws; lifted and looking when it wakes. */
  const aw = awake(t)
  const hb = 0.018 * breath(t) + 0.16 * Math.max(0, heave(t) / 0.32)
  const lift = aw.lift
  const turnUp = 0.6 * lift
  const rise = hb + 0.8 * lift
  // Where a point of the head (x, h) is drawn, lifted and turned about the nape: for the neck, which joins the two.
  const lifted = (x: number, h: number): Pt => {
    const dx = x - NAPE[0]
    const dy = Y(h) - Y(NAPE[1])
    const c = Math.cos(turnUp)
    const sn = Math.sin(turnUp)
    return [NAPE[0] + dx * c - dy * sn, Y(NAPE[1]) + dx * sn + dy * c - rise]
  }
  const H = (dx: number, dh: number): Pt => [HEAD_AT[0] + dx * HS, HEAD_AT[1] + dh * HS]
  // The neck under the head as it comes up, one piece with the body: its throat curving up from the back to the chin,
  // and the back of it from the head down to the shoulders' round. Only those two edges are inked.
  if (lift > 0.01) {
    const topH = (x: number) => F - catTop(x, t) - R
    const b0: Pt = [5.95, Y(topH(5.95) - 0.05)]
    const chin = lifted(...H(-0.1, -0.58))
    const jaw = lifted(...H(0.5, -0.45))
    const occiput = lifted(...H(0.72, 0.1))
    const b1: Pt = [7.22, Y(0.82)]
    const throat = spline([b0, [(b0[0] + chin[0]) / 2 + 0.06, (b0[1] + chin[1]) / 2 + 0.04], chin], false, 6)
    const nape = spline([occiput, [(occiput[0] + b1[0]) / 2 + 0.1, (occiput[1] + b1[1]) / 2], b1], false, 6)
    p.noStroke()
    p.fill(furAt(6.8, 1.4))
    p.beginShape()
    for (const [x, y] of [...throat, jaw, ...nape, [6.7, Y(1.1)] as Pt]) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(w * 0.7)
    for (const edge of [throat, nape]) {
      p.beginShape()
      for (const [x, y] of edge) p.vertex(x * k, y * k)
      p.endShape()
    }
  }
  p.push()
  p.translate(NAPE[0] * k, (Y(NAPE[1]) - rise) * k)
  p.rotate(turnUp)
  p.translate(-NAPE[0] * k, -Y(NAPE[1]) * k)
  // Local head coordinates: centred on HEAD_AT.
  const headPts = spline(HEAD.map(([dx, dh]) => H(dx, dh)), true, 6)
  // Ears: the far one behind, the near one in front of the crown; the near one flicks.
  const ear = (base0: Pt, base1: Pt, tip: Pt, turn: number, fill: string) => {
    const bx = (base0[0] + base1[0]) / 2
    const bh = (base0[1] + base1[1]) / 2
    const rot = (q: Pt): Pt => {
      const dx = q[0] - bx
      const dh = q[1] - bh
      return [bx + dx * Math.cos(turn) - dh * Math.sin(turn), bh + dx * Math.sin(turn) + dh * Math.cos(turn)]
    }
    const tp = rot(tip)
    const a = rot(base0)
    const b = rot(base1)
    const pts = spline([a, [a[0] * 0.55 + tp[0] * 0.45, a[1] * 0.55 + tp[1] * 0.45 + 0.03], tp, [b[0] * 0.55 + tp[0] * 0.45 + 0.02, b[1] * 0.55 + tp[1] * 0.45], b], false, 4)
    p.fill(fill)
    p.stroke(ink)
    p.strokeWeight(w * 0.65)
    vtx(p, k, pts)
  }
  const back = -0.35 * smooth(t - CAT_CUES.wake, 0, 0.04) * Math.exp(-Math.max(0, t - CAT_CUES.wake) / 0.6)
  ear(H(0.18, 0.6), H(0.52, 0.45), H(0.5, 1.02), back * 0.8, deepAt(7.0, 2.0))
  p.noStroke()
  p.fill(furAt(6.5, 1.3))
  vtx(p, k, headPts)
  // The forehead's tabby marks and a cheek stripe.
  p.fill(deepAt(6.5, 1.6))
  vtx(p, k, [H(-0.12, 0.6), H(-0.02, 0.35), H(0.05, 0.36), H(0.06, 0.62)])
  vtx(p, k, [H(0.12, 0.6), H(0.17, 0.4), H(0.23, 0.41), H(0.28, 0.57)])
  vtx(p, k, [H(0.3, -0.02), H(0.62, 0.02), H(0.6, 0.08), H(0.33, 0.06)])
  furLight(p, k, L, headPts, LOFT.catLit)
  rim(p, k, headPts.filter(([, h]) => h > HEAD_AT[1] + 0.2 * HS), mixHex(LOFT.catLit, LOFT.ember, 0.25), 0.3, 0.06)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.75)
  vtx(p, k, headPts)
  ear(H(-0.3, 0.5), H(0.08, 0.63), H(-0.12, 1.1), earTurn(t) + back, furAt(6.4, 2.0))
  // The eye: shut, a soft downward curve; open, an almond of amber with a slit pupil looking up and west, at the candle.
  const E = H(-0.3, 0.12)
  const ew = 0.3 * HS
  if (aw.eye < 0.04) {
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(w * 0.7)
    p.beginShape()
    for (let j = 0; j <= 8; j++) {
      const u = j / 8
      p.vertex((E[0] - ew / 2 + ew * u) * k, Y(E[1] - 0.05 * Math.sin(Math.PI * u)) * k)
    }
    p.endShape()
  } else {
    const oh = 0.085 * HS * aw.eye
    const almond: Pt[] = []
    for (let j = 0; j <= 10; j++) {
      const u = j / 10
      almond.push([E[0] - ew / 2 + ew * u, E[1] + oh * Math.sin(Math.PI * u) * (1 + 0.25 * (0.5 - u))])
    }
    for (let j = 10; j >= 0; j--) {
      const u = j / 10
      almond.push([E[0] - ew / 2 + ew * u, E[1] - oh * 0.8 * Math.sin(Math.PI * u)])
    }
    p.fill(LOFT.catEye)
    p.stroke(ink)
    p.strokeWeight(w * 0.7)
    vtx(p, k, almond)
    // The slit, toward the eye's west corner and up: it is looking at the candle.
    p.noStroke()
    p.fill(LOFT.soot)
    const px = E[0] - ew * 0.14
    const pw = 0.022 + 0.018 * Math.exp(-Math.max(0, t - CAT_CUES.wake) / 0.8)
    p.beginShape()
    for (let j = 0; j <= 12; j++) {
      const a = (j / 12) * Math.PI * 2
      p.vertex((px + Math.cos(a) * pw) * k, Y(E[1] + 0.012 + Math.sin(a) * oh * 0.95) * k)
    }
    p.endShape(p.CLOSE)
  }
  // The nose, and the line of the mouth under it.
  p.fill(deepAt(5.8, 1.1))
  p.stroke(ink)
  p.strokeWeight(w * 0.5)
  vtx(p, k, [H(-0.79, -0.04), H(-0.68, -0.03), H(-0.72, -0.13)])
  p.noFill()
  p.strokeWeight(w * 0.5)
  p.beginShape()
  p.vertex(H(-0.72, -0.14)[0] * k, Y(H(-0.72, -0.14)[1]) * k)
  p.vertex(H(-0.66, -0.26)[0] * k, Y(H(-0.66, -0.26)[1]) * k)
  p.vertex(H(-0.56, -0.28)[0] * k, Y(H(-0.56, -0.28)[1]) * k)
  p.endShape()
  p.pop()

  p.pop()
}
