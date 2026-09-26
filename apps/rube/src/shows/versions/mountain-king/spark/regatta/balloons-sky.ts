import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash } from '../kit'
import { REGATTA, REGATTA_THEME } from '../worlds'
import { drawBalloon, type Look } from './balloons-draw'
import { ANAT, AT, B, climbInt, dusk, DUSK, GROUND, roarOf, ss, T0, T1, type Balloon, type Blast } from './balloons-plan'

/**
 * The regatta's world behind its machine: the sunset sky, the low sun, a few long clouds, the land (a patchwork of
 * fields and a river going away to the horizon) and the far balloons of the regatta, all in perspective.
 *
 * The camera looks level, so the horizon stands a fifth of the frame below its middle wherever it goes. A far balloon
 * at depth `d` (1 is the machine's own plane, 0 the horizon) is drawn `d` times its size and moves `d` times as far as
 * the camera does. The land is a flat plane seen from the camera's eye (`drawLand`): the higher the camera climbs, the
 * further the fields fall away below and the smaller they get, and in phrase 11 they drop away faster still.
 */

/** How far below the frame's middle the horizon stands, as a share of the frame's height. */
const TILT = 0.2

export interface Frame {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
}

/** The horizon's height in the frame. */
export const horizon = (f: Frame): number => f.cy + TILT * (f.y1 - f.y0)

/** A point at depth `d` (true cells) to where it is drawn. */
export function persp(f: Frame, x: number, y: number, d: number): Pt {
  return [f.cx + (x - f.cx) * d, f.cy + (y - f.cy) * d + TILT * (f.y1 - f.y0) * (1 - d)]
}

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/* ------------------------------------------------------------------ the sky */

export function drawSky(p: p5, k: number, t: number): Frame {
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  const fw = f.x1 - f.x0
  const fh = f.y1 - f.y0
  const hy = horizon(f)
  // The sky: violet overhead, coral, then gold down to the horizon; the dusk comes down it from the top.
  const dk = dusk(t)
  const g = ctx.createLinearGradient(0, X(f.y0), 0, X(hy))
  g.addColorStop(0, mixHex(REGATTA.skyTop, DUSK, dk * 1.1))
  g.addColorStop(0.5, mixHex(REGATTA.skyMid, REGATTA.skyTop, dk * 0.9))
  g.addColorStop(0.86, mixHex(REGATTA.skyLow, REGATTA.skyMid, dk * 0.8))
  g.addColorStop(1, mixHex(REGATTA.skyLow, REGATTA.sun, 0.4 * (1 - dk)))
  ctx.fillStyle = g
  ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(fw + 2), X(fh + 2))

  // The sun, low on the right, half down behind the land, and its light across the sky.
  const sr = 0.075 * fh
  const sx = f.cx + 0.2 * fw
  const sy = hy + 0.3 * sr + 1.5 * sr * (dk / 0.62)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const glow = ctx.createRadialGradient(X(sx), X(sy), X(sr * 0.5), X(sx), X(sy), X(fh * 0.62))
  glow.addColorStop(0, `rgba(255, 227, 168, ${0.75 * (1 - 0.55 * dk)})`)
  glow.addColorStop(0.3, `rgba(255, 200, 150, ${0.28 * (1 - 0.5 * dk)})`)
  glow.addColorStop(1, 'rgba(255, 200, 150, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(fw + 2), X(fh + 2))
  ctx.restore()
  // Long thin clouds, lit from under by the low sun. They are far: they barely move.
  const clouds = [
    { u: -0.34, v: 0.17, len: 0.52, th: 0.016 },
    { u: 0.3, v: 0.29, len: 0.4, th: 0.012 },
    { u: -0.02, v: 0.43, len: 0.62, th: 0.011 },
    { u: 0.46, v: 0.09, len: 0.3, th: 0.009 },
    { u: -0.5, v: 0.36, len: 0.34, th: 0.01 },
  ]
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i]
    const cx = f.cx + c.u * fw + 0.03 * fw * Math.sin(t * 0.03 + i)
    const cy = hy - c.v * fh
    const L = c.len * fw
    const T = c.th * fh
    const n = 22
    const top: Pt[] = []
    const bot: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const s = j / n
      const prof = Math.pow(Math.sin(Math.PI * s), 0.7)
      const lump = 0.5 + 0.5 * Math.sin(s * 9 + i * 2.3) * Math.sin(s * 4 + i)
      const x = cx - L / 2 + L * s
      top.push([x, cy - T * prof * (0.8 + 0.6 * lump)])
      bot.push([x, cy + T * 0.55 * prof])
    }
    p.fill(rgba(mixHex(REGATTA.cloudShade, DUSK, dk * 0.8), 0.85))
    p.beginShape()
    for (const [x, y] of top) p.vertex(X(x), X(y))
    for (let j = bot.length - 1; j >= 0; j--) p.vertex(X(bot[j][0]), X(bot[j][1]))
    p.endShape(p.CLOSE)
    // The lit underside.
    p.fill(rgba(mixHex(mixHex(REGATTA.cloud, REGATTA.sun, 0.5), REGATTA.skyMid, dk * 0.8), 0.9))
    p.beginShape()
    for (let j = 0; j <= n; j++) {
      const [x, y] = bot[j]
      const prof = Math.pow(Math.sin((Math.PI * j) / n), 0.7)
      p.vertex(X(x), X(y - T * 0.5 * prof))
    }
    for (let j = bot.length - 1; j >= 0; j--) p.vertex(X(bot[j][0]), X(bot[j][1]))
    p.endShape(p.CLOSE)
  }
  return f
}

/* ------------------------------------------------------------------ the land */

/**
 * The land is a flat plane seen from the camera's eye. A point of it at distance `D` (1 is the machine's own plane)
 * and across at `x` is drawn at `x` moved toward the frame's middle by `1/D`, and `eye/D` below the horizon. On the
 * meadow the eye is where the machine's cells say; as the camera climbs it is set higher still, so the fields fall
 * away below as they would from a real balloon's height and go small.
 */
function eyeOf(f: Frame, t: number): number {
  const E = Math.max(0.05, GROUND - horizon(f))
  // In phrase 11 the whole regatta goes up together, far higher than the stair's own cells: the land drops away.
  return E * (1 + 2.4 * ss(GROUND - f.cy, 9, 60)) * (1 + 0.9 * ss(t, AT.land4, T1 + 1.5))
}

/** Where the land is drawn at depth `d` (1/D): the meadow at 1 is the machine's own ground; toward 0, the horizon. */
export function groundY(f: Frame, d: number, t: number): number {
  return horizon(f) + eyeOf(f, t) * d
}

/** The land's rows, near to far: each a little deeper than the last, so the fields foreshorten as they go away. */
const ROW = 1.13
const ROWS: number[] = (() => {
  const out = [1]
  while (out[out.length - 1] < 1400) out.push(out[out.length - 1] * ROW)
  return out
})()
/** How deep a unit of distance is, in cells across: what keeps a field about as deep as it is wide on the ground. */
const DEPTH = 28
/** The launch meadow runs out to here; the fields beyond it. */
const MEADOW = 3.4

type RGB = [number, number, number]
const rgbOf = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mixRGB = (a: RGB, b: RGB, u: number): RGB => {
  const v = Math.max(0, Math.min(1, u))
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, a[2] + (b[2] - a[2]) * v]
}
const css = (c: RGB, a = 1): string => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`

/** The fields' crops: grass, wheat, a darker pasture, stubble, a copse, and fresh plough; and how often each comes. */
const CROPS: { c: RGB; w: number }[] = [
  { c: rgbOf(REGATTA.fieldA), w: 3 },
  { c: rgbOf(REGATTA.fieldB), w: 2.5 },
  { c: rgbOf(REGATTA.fieldC), w: 3 },
  { c: rgbOf(mixHex(REGATTA.fieldB, REGATTA.sandbag, 0.5)), w: 1.2 },
  { c: rgbOf(mixHex(REGATTA.fieldC, REGATTA_THEME.ink, 0.42)), w: 0.9 },
  { c: rgbOf(mixHex(REGATTA.wickerDeep, REGATTA.fieldC, 0.35)), w: 0.8 },
]
const CROP_SUM = CROPS.reduce((s, c) => s + c.w, 0)
function crop(j: number, r: number): RGB {
  let u = hash(j, r, 3) * CROP_SUM
  for (const c of CROPS) {
    u -= c.w
    if (u <= 0) return c.c
  }
  return CROPS[0].c
}

/** How far the haze has taken the land at distance `D`: none near, most of it at the horizon. */
const hazeOf = (D: number): number => 0.8 * Math.pow(Math.max(0, Math.min(1, (Math.log(D) - Math.log(5)) / (Math.log(1400) - Math.log(5)))), 1.35)

/**
 * The river: it winds away from the meadow toward the setting sun, its bends opening out as they come near. Its
 * middle, `x` across at distance `D` (true cells); its width on the ground.
 */
const riverX = (D: number): number => 26 + D * (8.5 + 3.6 * Math.sin(3.3 * Math.log(D) + 0.6))
const RIVER_W = 30

export function drawLand(p: p5, k: number, f: Frame, t: number): void {
  const dk = dusk(t)
  const hy = horizon(f)
  if (hy > f.y1 + 0.5) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const E = eyeOf(f, t)
  const yAt = (D: number) => hy + E / D
  const xAt = (x: number, D: number) => f.cx + (x - f.cx) / D
  const fw = f.x1 - f.x0
  const fh = f.y1 - f.y0

  // The light on it: the low sun warms it, the dusk takes it down toward the sky's plum, the haze to the horizon's gold.
  const ink = rgbOf(REGATTA_THEME.ink)
  const sunWarm = rgbOf(mixHex(REGATTA.skyMid, REGATTA.sun, 0.5))
  const hazeC = rgbOf(mixHex(mixHex(REGATTA.haze, REGATTA.skyLow, 0.5), REGATTA.skyMid, 0.55 * dk))
  const lit = (c: RGB, D: number): RGB => mixRGB(mixRGB(mixRGB(c, sunWarm, 0.14), ink, 0.18 + 0.4 * dk), hazeC, hazeOf(D))

  ctx.save()
  // Under everything, the far haze to the frame's foot, so no row leaves a gap.
  ctx.fillStyle = css(lit(CROPS[0].c, 60))
  ctx.fillRect((f.x0 - 1) * k, hy * k, (fw + 2) * k, (f.y1 - hy + 1) * k)

  for (let r = 0; r < ROWS.length - 1; r++) {
    const Da = ROWS[r]
    const Db = ROWS[r + 1]
    const ya = yAt(Da)
    const yb = yAt(Db)
    if (yb > f.y1 + 0.2) continue
    // Past a sliver of a pixel the rows are only haze.
    if ((ya - yb) * k < 0.5) break
    const top = yb * k
    const bot = Math.min(f.y1 + 0.2, ya) * k + 0.6
    if (Da < MEADOW) {
      // The launch meadow: mown grass in two tones.
      ctx.fillStyle = css(lit(mixRGB(CROPS[2].c, r % 2 ? CROPS[0].c : ink, r % 2 ? 0.25 : 0.06), Da))
      ctx.fillRect((f.x0 - 1) * k, top, (fw + 2) * k, bot - top)
      continue
    }
    // The fields of this row: each about half again as wide as the row is deep, their edges a little uneven.
    const wide = (Db - Da) * DEPTH * 1.55
    const lo = Math.floor((f.cx + (f.x0 - 1 - f.cx) * Da) / wide) - 1
    const hi = Math.ceil((f.cx + (f.x1 + 1 - f.cx) * Da) / wide) + 1
    const edge = (j: number) => (j + 0.7 * hash(j, r, 7)) * wide
    const D = (Da + Db) / 2
    for (let j = lo; j <= hi; j++) {
      const x0 = edge(j)
      const x1 = edge(j + 1)
      const c = crop(j, r)
      // Each field its own tone of its crop, so neighbours of one crop still part.
      const tone = hash(j, r, 11) - 0.5
      ctx.fillStyle = css(lit(mixRGB(c, tone > 0 ? sunWarm : ink, Math.abs(tone) * 0.22), D))
      ctx.beginPath()
      ctx.moveTo(xAt(x0, Da) * k - 0.3, bot)
      ctx.lineTo(xAt(x1, Da) * k + 0.3, bot)
      ctx.lineTo(xAt(x1, Db) * k + 0.3, top - 0.3)
      ctx.lineTo(xAt(x0, Db) * k - 0.3, top - 0.3)
      ctx.closePath()
      ctx.fill()
    }
  }

  // The river, a band on the ground (its banks square to its course), catching the sky: gold far off, rose near.
  {
    const n = 150
    const left: Pt[] = []
    const right: Pt[] = []
    const Dnear = Math.max(MEADOW + 1, E / Math.max(0.05, f.y1 + 1 - hy))
    const lnA = Math.log(Dnear)
    const lnB = Math.log(1400)
    for (let i = 0; i <= n; i++) {
      const D = Math.exp(lnA + ((lnB - lnA) * i) / n)
      const dD = D * 0.01
      const x = riverX(D)
      // The course's direction on the ground (x across, D·DEPTH along), and the square to it.
      const tx = riverX(D + dD) - x
      const tz = dD * DEPTH
      const len = Math.hypot(tx, tz)
      const nx = -tz / len
      const nz = tx / len
      const h = RIVER_W / 2
      const La: Pt = [x + nx * h, D + (nz * h) / DEPTH]
      const Rb: Pt = [x - nx * h, D - (nz * h) / DEPTH]
      left.push([xAt(La[0], La[1]), yAt(La[1])])
      right.push([xAt(Rb[0], Rb[1]), yAt(Rb[1])])
    }
    const g = ctx.createLinearGradient(0, hy * k, 0, f.y1 * k)
    const far = mixRGB(rgbOf(mixHex(REGATTA.skyLow, REGATTA.sun, 0.6)), rgbOf(REGATTA.skyMid), 0.45 * dk)
    const near = mixRGB(mixRGB(rgbOf(REGATTA.skyMid), rgbOf(REGATTA.river), 0.3), rgbOf(REGATTA.skyTop), 0.5 * dk)
    g.addColorStop(0, css(far))
    g.addColorStop(Math.min(1, 0.35), css(mixRGB(far, near, 0.6)))
    g.addColorStop(1, css(near))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(left[0][0] * k, left[0][1] * k)
    for (const [x, y] of left) ctx.lineTo(x * k, y * k)
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0] * k, right[i][1] * k)
    ctx.closePath()
    ctx.fill()
  }

  // The sun's light lying along the land under it, and the haze on the horizon.
  const sr = 0.075 * fh
  const sx = f.cx + 0.2 * fw
  ctx.globalCompositeOperation = 'screen'
  ctx.translate(sx * k, hy * k)
  ctx.scale(2.6, 1)
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.16 * fh * k)
  sg.addColorStop(0, `rgba(255, 214, 150, ${0.42 * (1 - 0.6 * dk)})`)
  sg.addColorStop(1, 'rgba(255, 214, 150, 0)')
  ctx.fillStyle = sg
  ctx.fillRect(-0.16 * fh * k, 0, 0.32 * fh * k, 0.16 * fh * k)
  ctx.setTransform(ctx.getTransform().scale(1 / 2.6, 1).translate(-sx * k, -hy * k))
  ctx.globalCompositeOperation = 'source-over'
  const hc = rgbOf(mixHex(REGATTA.haze, REGATTA.skyMid, 0.2 + 0.7 * dk))
  const hg = ctx.createLinearGradient(0, (hy - 0.05 * fh) * k, 0, (hy + 0.08 * fh) * k)
  hg.addColorStop(0, css(hc, 0))
  hg.addColorStop(0.45, css(hc, 0.6))
  hg.addColorStop(1, css(hc, 0))
  ctx.fillStyle = hg
  ctx.fillRect((f.x0 - 1) * k, (hy - 0.05 * fh) * k, (fw + 2) * k, 0.13 * fh * k)
  ctx.restore()

  // The sun, half down behind the land, in front of the haze.
  const sy = hy + 0.3 * sr + 1.5 * sr * (dk / 0.62)
  if (sy - sr >= hy) return
  ctx.save()
  ctx.beginPath()
  ctx.rect((sx - sr * 2) * k, (sy - sr * 2) * k, sr * 4 * k, (hy - (sy - sr * 2)) * k)
  ctx.clip()
  p.noStroke()
  p.fill(REGATTA.sun)
  p.circle(sx * k, sy * k, 2 * sr * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the far balloons */

interface Far {
  /** True base (the basket's floor) at the door, true cells; its depth; its size. */
  x: number
  y: number
  d: number
  b: Balloon
  /** Lying on the grass, half up, standing, or aloft. */
  stage: 'lying' | 'half' | 'up' | 'aloft'
  /** When it lets go of the ground, and how it climbs against the regatta's own climb. */
  launch: number
  speed: number
  /** Which of phrase 11's calls it answers. */
  group: 'A' | 'B'
  seed: number
}

const far = (b: Balloon, a: string, bb: string, band?: string): Balloon => ({ ...b, key: 'far', silk: { a, b: bb, band, cap: band ?? a } })
const R = { ...REGATTA }

/**
 * Where a far balloon stands, given where it should look to be at a reference framing: the ones aloft placed for the
 * wide shot (phrase 11, the whole regatta), the ones on the meadow for the stand-up (phrase 9).
 */
function aloft(ax: number, ay: number, d: number, b: Balloon, group: 'A' | 'B', speed: number, seed: number): Far {
  const ref = { cx: 13, cy: -63, fh: 40, t: AT.glow }
  const x = ref.cx + (ax - ref.cx) / d
  const yRef = ref.cy + (ay - ref.cy - TILT * ref.fh * (1 - d)) / d
  const y = yRef + speed * (climbInt(ref.t) - climbInt(T0))
  return { x, y, d, b, stage: 'aloft', launch: T0 - 10, speed, group, seed }
}
function meadow(ax: number, d: number, b: Balloon, stage: Far['stage'], launch: number, group: 'A' | 'B', seed: number): Far {
  const ref = { cx: 6, cy: -4 }
  return { x: ref.cx + (ax - ref.cx) / d, y: GROUND, d, b, stage, launch, speed: 1.1, group, seed }
}

const small = { key: 'far', H: 10.5, Rs: 4.1, silk: B.b2.silk }
const FAR: Far[] = [
  // On the meadow, behind the two at the door: one lying and filling, one half up, some tethered up and glowing.
  meadow(-9, 0.4, far(small, R.teal, R.ivory), 'up', AT.pop3, 'A', 1),
  meadow(24, 0.34, far(small, R.indigo, R.saffron), 'half', AT.pop3 + 0.4, 'B', 2),
  meadow(-24, 0.3, far(small, R.coral, R.coral, R.ivory), 'lying', AT.land4, 'A', 3),
  meadow(31, 0.42, far(small, R.ivory, R.coral), 'up', AT.pop2, 'B', 4),
  meadow(-17, 0.26, far(small, R.saffron, R.indigo), 'up', AT.pop1, 'A', 5),
  // Aloft, all round the climb, placed for the wide shot: far enough off to be the regatta, not the machine.
  aloft(-13, -66, 0.46, far(small, R.coral, R.ivory), 'A', 0.9, 6),
  aloft(-3, -54, 0.4, far(small, R.saffron, R.coral), 'A', 1.0, 7),
  aloft(-22, -52, 0.3, far(small, R.teal, R.teal, R.saffron), 'A', 0.8, 8),
  aloft(2, -78, 0.34, far(small, R.ivory, R.teal), 'A', 1.1, 9),
  aloft(31, -72, 0.44, far(small, R.coral, R.coral, R.indigo), 'B', 1.0, 10),
  aloft(41, -56, 0.32, far(small, R.indigo, R.ivory), 'B', 0.9, 11),
  aloft(28, -52, 0.5, far(small, R.saffron, R.teal), 'B', 1.1, 12),
  aloft(46, -79, 0.25, far(small, R.teal, R.ivory), 'B', 0.8, 13),
  aloft(-27, -79, 0.27, far(small, R.indigo, R.coral), 'A', 0.9, 14),
]
FAR.sort((a, b) => a.d - b.d)

/**
 * The rest of the regatta, far off: a crowd of small balloons all round the climb (placed for the wide shot, clear of
 * the stair itself), each a silhouette with its stripes, a basket and, on the calls, a spark of burner.
 */
interface Tiny {
  x: number
  y: number
  d: number
  a: string
  b: string
  group: 'A' | 'B'
  speed: number
  seed: number
  /** Where it looks to be in the wide shot. */
  ax: number
  ay: number
}
const SILKS = [R.coral, R.saffron, R.teal, R.ivory, R.indigo]
const TINY: Tiny[] = (() => {
  const out: Tiny[] = []
  let i = 0
  let n = 0
  while (out.length < 26 && n < 400) {
    n++
    const ax = -26 + 76 * hash(n, 1, 41)
    const ay = -86 + 36 * hash(n, 2, 41)
    // Clear of the stair of hero balloons, and of each other.
    if (ax > 5 && ax < 24 && ay < -46) continue
    const d = 0.1 + 0.15 * hash(n, 3, 41)
    if (out.some((o) => Math.hypot(o.ax - ax, o.ay - ay) < 6.5)) continue
    const f = aloft(ax, ay, d, B.b2, ax < 13 ? 'A' : 'B', 0.8 + 0.4 * hash(n, 4, 41), 20 + i)
    const a = SILKS[Math.floor(hash(n, 5, 41) * SILKS.length)]
    let b = SILKS[Math.floor(hash(n, 6, 41) * SILKS.length)]
    if (b === a) b = R.ivory === a ? R.coral : R.ivory
    out.push({ x: f.x, y: f.y, d, a, b, group: f.group, speed: f.speed, seed: 20 + i, ax, ay })
    i++
  }
  return out.sort((p, q) => p.d - q.d)
})()

export function drawTiny(p: p5, look: Look, f: Frame, t: number): void {
  const { k } = look
  const X = (v: number) => v * k
  p.noStroke()
  for (const tb of TINY) {
    const up = tb.speed * (climbInt(t) - climbInt(T0))
    const [bx, by] = persp(f, tb.x, tb.y - up, tb.d)
    const s = tb.d
    if (by < f.y0 - 1 || by - 16 * s > f.y1 + 1 || bx < f.x0 - 5 * s || bx > f.x1 + 5 * s) continue
    const call = tb.group === 'A' ? AT.bags4 : AT.groupB
    const roar = roarOf([{ on: call, off: call + 0.3 }, { on: AT.glow, off: AT.glow + 0.6 }], t)
    const lit = Math.min(1, roar)
    const haze = (0.3 + 0.3 * (1 - (tb.d - 0.1) / 0.15)) * (1 - 0.45 * lit)
    const dk = dusk(t) * (1 - lit)
    const warm = (c: string) => mixHex(mixHex(mixHex(c, mixHex(REGATTA.saffron, REGATTA.sun, 0.5), 0.65 * lit), REGATTA.haze, haze), DUSK, dk * 0.7)
    const H = 10.5 * s
    const Rs = 4.4 * s
    const mouth = by - 4.5 * s
    // The envelope: a round top on a body that narrows to the mouth.
    const pts: Pt[] = []
    const n = 12
    for (let j = 0; j <= n; j++) {
      const h = H * Math.sin((Math.PI / 2) * (j / n))
      const hc = H - Rs
      const r = h >= hc ? Math.sqrt(Math.max(0, Rs * Rs - (h - hc) * (h - hc))) : s + (Rs - s) * (1 - Math.pow(1 - h / hc, 1.75))
      pts.push([r, h])
    }
    p.fill(warm(tb.a))
    p.beginShape()
    for (const [r, h] of pts) p.vertex(X(bx + r), X(mouth - h))
    for (let j = pts.length - 1; j >= 0; j--) p.vertex(X(bx - pts[j][0]), X(mouth - pts[j][1]))
    p.endShape(p.CLOSE)
    // Two stripes in the other silk.
    p.fill(warm(tb.b))
    for (const [s0, s1] of [[-0.62, -0.25], [0.12, 0.5]]) {
      p.beginShape()
      for (const [r, h] of pts) p.vertex(X(bx + r * s0), X(mouth - h))
      for (let j = pts.length - 1; j >= 0; j--) p.vertex(X(bx + pts[j][0] * s1), X(mouth - pts[j][1]))
      p.endShape(p.CLOSE)
    }
    // The basket, and the flame when it roars.
    p.fill(warm(REGATTA.wickerDeep))
    p.rectMode(p.CORNER)
    p.rect(X(bx - 0.7 * s), X(by - 1.3 * s), X(1.4 * s), X(1.3 * s))
    p.rectMode(p.CENTER)
    if (roar > 0.05) {
      p.fill(mixHex(REGATTA.propaneTip, REGATTA.haze, haze * 0.5))
      p.triangle(X(bx - 0.35 * s), X(by - 2.2 * s), X(bx + 0.35 * s), X(by - 2.2 * s), X(bx), X(by - (2.2 + 2.2 * Math.min(1.2, roar)) * s))
    }
  }
}

/** Their burners: on their calls in phrase 11, and all together on the glow; the ones standing on the meadow now and then. */
function farBlasts(fb: Far): Blast[] {
  const call = fb.group === 'A' ? AT.bags4 : AT.groupB
  const out: Blast[] = [
    { on: call, off: call + 0.35 },
    { on: AT.glow, off: AT.glow + 0.65 },
  ]
  if (fb.stage !== 'aloft') out.push({ on: fb.launch, off: fb.launch + 0.6 })
  return out
}

export function drawFar(p: p5, look: Look, f: Frame, t: number): void {
  const { k } = look
  for (const fb of FAR) {
    const up = fb.stage === 'aloft' || t > fb.launch ? fb.speed * (climbInt(t) - climbInt(fb.stage === 'aloft' ? T0 : fb.launch)) * (fb.stage === 'aloft' ? 1 : ss(t, fb.launch, fb.launch + 1.5)) : 0
    // Standing on the meadow it stands on the land's own row; aloft it is where it is.
    const base: Pt = fb.stage === 'aloft' ? persp(f, fb.x, fb.y - up, fb.d) : [f.cx + (fb.x - f.cx) * fb.d, groundY(f, fb.d, t) - up * fb.d]
    // Only what could be in the frame (a balloon is about 16 true cells tall).
    const tall = 17 * fb.d
    if (base[1] < f.y0 - 2 || base[1] - tall > f.y1 + 2 || base[0] < f.x0 - 6 * fb.d - 2 || base[0] > f.x1 + 6 * fb.d + 2) continue
    const roar = roarOf(farBlasts(fb), t)
    // The ones on the meadow come up from lying, or from half up, as the regatta goes.
    let a = 0
    let fill = 1
    let ground: number | undefined
    if (fb.stage === 'lying') {
      const stand = ss(t, fb.launch - 2.5, fb.launch)
      a = (Math.PI / 2) * (1 - stand)
      fill = 0.62 + 0.38 * stand + 0.03 * Math.sin(t * 3.3 + fb.seed)
      ground = 0
    } else if (fb.stage === 'half') {
      a = 0.75 * (1 - ss(t, T0, fb.launch - 0.5))
      fill = 0.9 + 0.1 * ss(t, T0, fb.launch)
      ground = 0
    }
    const lit = fb.stage === 'aloft' || fb.stage === 'up' || t > fb.launch - 3
    const drift = 0.2 * Math.sin(t * 0.21 + fb.seed * 1.7)
    p.push()
    p.translate((base[0] + drift * fb.d) * k, base[1] * k)
    p.scale(fb.d)
    const farLook: Look = { k, weight: look.weight * Math.min(1.6, 0.8 / Math.sqrt(fb.d)), haze: 0.12 + 0.5 * Math.pow(1 - fb.d, 1.6), simple: true, dusk: dusk(t) * 0.55 * (1 - 0.6 * Math.min(1, roar)) }
    drawBalloon(p, farLook, fb.b, {
      t,
      pose: { n: [0, -ANAT.floorY], a, fill, ground, vent: 0, sag: fb.stage === 'lying' ? 1.1 * Math.sin(a) : 0, H: fb.b.H },
      roar,
      warm: Math.min(1, roar * 0.9 + (lit ? 0.12 : 0)),
      pilot: false,
      spark: null,
      bags: null,
      seed: fb.seed,
    })
    p.pop()
  }
}
