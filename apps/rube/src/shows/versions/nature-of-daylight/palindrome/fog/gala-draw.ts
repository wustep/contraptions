import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawInk, mix, rgba } from '../cast'
import { frame, hash, smooth } from '../kit'
import { beats, level, SEAM } from '../music'
import { GALA, LOUISE, TENT } from '../worlds'
import { CALL_X, drawHandset, KEY_SPAN, KEY_W, KEYS, PHONE_BODY } from '../twelve/tent'
import { NUMBER } from '../twelve/timeline'
import { herAt as fogHerAt, SMALL, SMALL_TURN, smallBloom, smallC, smallPale, smallR, smallTendrils, smallU } from './plan'
import {
  BOTTLE,
  bottleAngle,
  BRIM,
  COUPE,
  HER_END,
  hush,
  coupeAt,
  mouthAt,
  PEDAL,
  pedalDown,
  POST,
  pourFlow,
  TABLE,
  TIERS,
  tierFill,
  T_TOAST,
  T_TOUCH,
  herAt,
} from './gala-plan'

/**
 * The gala, drawn by show time: a long room at night in champagne light, chandeliers, a crowd of dark figures at the
 * back and a long table, and in front the tower of coupes on its round table with the pouring stand beside it.
 */

type Frame = ReturnType<typeof frame>
type Ctx = CanvasRenderingContext2D
const seen = (f: Frame, d: number, x: number, y: number): Pt => [f.cx + d * (x - f.cx), f.cy + d * (y - f.cy)]
const FLOOR_Y = 0.13

/* ------------------------------------------------------------------ the room */

function room(ctx: Ctx, k: number, f: Frame, t: number): void {
  const w = f.x1 - f.x0
  // The back wall: deep blue-grey, lit warm toward the middle height where the chandeliers are.
  const g = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
  g.addColorStop(0, mix(GALA.room, GALA.guests, 0.45))
  g.addColorStop(0.45, GALA.roomLit)
  g.addColorStop(1, GALA.room)
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (w + 2) * k, (f.y1 - f.y0 + 2) * k)
  // Tall windows at the back, night in them, between pilasters (at depth: they move less).
  const d = 0.5
  for (let i = -4; i <= 5; i++) {
    const wx = i * 5.2 + 1.2
    const [x0, y0] = seen(f, d, wx - 1.1, -7.6)
    const [x1, y1] = seen(f, d, wx + 1.1, -1.1)
    if (x1 < f.x0 - 1 || x0 > f.x1 + 1) continue
    ctx.fillStyle = mix(GALA.room, GALA.guests, 0.32)
    ctx.beginPath()
    const r = (x1 - x0) / 2
    ctx.moveTo(x0 * k, y1 * k)
    ctx.lineTo(x0 * k, (y0 + r) * k)
    ctx.arc(((x0 + x1) / 2) * k, (y0 + r) * k, r * k, Math.PI, 0)
    ctx.lineTo(x1 * k, y1 * k)
    ctx.closePath()
    ctx.fill()
    // The room's light caught faintly in the glass.
    const sh = ctx.createLinearGradient(x0 * k, y0 * k, x1 * k, y1 * k)
    sh.addColorStop(0, rgba(GALA.lightWarm, 0.06))
    sh.addColorStop(0.5, rgba(GALA.lightWarm, 0))
    ctx.fillStyle = sh
    ctx.fill()
    // Mullions, faint.
    ctx.fillStyle = rgba(GALA.roomLit, 0.45)
    ctx.fillRect(((x0 + x1) / 2) * k - 0.5, (y0 + r * 0.4) * k, 1, (y1 - y0 - r * 0.4) * k)
    for (let m = 1; m <= 3; m++) ctx.fillRect(x0 * k, (y0 + r + ((y1 - y0 - r) * m) / 4) * k - 0.5, (x1 - x0) * k, 1)
  }
  // The floor: polished, dark, the light lying on it.
  const [, fy] = seen(f, d, 0, FLOOR_Y - 1.2)
  const fl = ctx.createLinearGradient(0, fy * k, 0, (FLOOR_Y + 3) * k)
  fl.addColorStop(0, mix(GALA.floor, GALA.roomLit, 0.4))
  fl.addColorStop(0.35, GALA.floor)
  fl.addColorStop(1, mix(GALA.floor, GALA.guests, 0.35))
  ctx.fillStyle = fl
  ctx.fillRect((f.x0 - 1) * k, fy * k, (w + 2) * k, (f.y1 + 1 - fy) * k)
  void t
}

/** A chandelier: a fall of crystal strands lit warm, hung from out of the top of the frame; no bright core. */
function chandelier(ctx: Ctx, k: number, f: Frame, x: number, t: number, i: number): void {
  const d = 0.62
  const [cx, cy] = seen(f, d, x, -4.9)
  const s = d
  const breath = (0.85 + 0.15 * level(t)) * (1 - 0.3 * hush(t))
  // Its light on the room: wide and soft.
  const R = 4.6 * s
  const glow = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, R * k)
  glow.addColorStop(0, rgba(GALA.lightWarm, 0.28 * breath))
  glow.addColorStop(0.35, rgba(GALA.lightWarm, 0.12 * breath))
  glow.addColorStop(1, rgba(GALA.lightWarm, 0))
  ctx.fillStyle = glow
  ctx.fillRect((cx - R) * k, (cy - R) * k, 2 * R * k, 2 * R * k)
  // The chain up out of the frame.
  ctx.fillStyle = rgba(GALA.lightWarm, 0.35)
  ctx.fillRect(cx * k - 0.5, (f.y0 - 1) * k, 1, (cy - 0.7 * s - f.y0 + 1) * k)
  // The strands: an inverted dome of short falls of light, swaying a little.
  const n = 15
  for (let j = 0; j < n; j++) {
    const u = (j / (n - 1)) * 2 - 1
    const sway = 0.02 * Math.sin(t * 0.7 + j + i)
    const sx = cx + u * 0.75 * s + sway
    const top = cy - 0.55 * s + Math.abs(u) * 0.15 * s
    const len = (0.9 - 0.55 * u * u) * s
    const a = 0.55 + 0.35 * hash(j, i, 7)
    const g = ctx.createLinearGradient(0, top * k, 0, (top + len) * k)
    g.addColorStop(0, rgba(GALA.light, 0.2 * a))
    g.addColorStop(0.7, rgba(GALA.light, 0.75 * a * breath))
    g.addColorStop(1, rgba(GALA.light, 0))
    ctx.fillStyle = g
    ctx.fillRect(sx * k - Math.max(0.8, 0.018 * s * k), top * k, Math.max(1.6, 0.036 * s * k), len * k)
  }
  // Its ring of arms, a thin warm band.
  ctx.fillStyle = rgba(GALA.lightWarm, 0.5)
  ctx.fillRect((cx - 0.8 * s) * k, (cy - 0.58 * s) * k, 1.6 * s * k, Math.max(1, 0.04 * s * k))
}

/* ------------------------------------------------------------------ the crowd */

/**
 * The guests: people at the cast's own scale, as the whole show has them, but never cast: small muted dark discs, no
 * mark, no outline, a faint rim of the room's light; standing in loose knots about the room and by the tower. On the
 * toast a few lift a tiny glass, a glint over the disc. None stands near where Louise and Shang are at either cut.
 */
interface Guest {
  x: number
  d: number
  glass: boolean
  seed: number
}
/**
 * Knots of guests about the room: [x, depth, how many]. Far ones small and hazy, near ones bigger and darker; singles,
 * pairs and threes, spaced unevenly. None near where Louise and Shang are at either cut, or on Shang's way to her.
 */
const KNOTS: [number, number, number][] = [
  [-7.9, 0.52, 2], [-6.1, 0.6, 1], [-3.9, 0.55, 3], [3.4, 0.5, 2], [6.3, 0.58, 3], [9.9, 0.52, 2], [12.6, 0.6, 1],
  [-6.5, 0.74, 2], [2.55, 0.78, 3], [4.95, 0.71, 1], [7.4, 0.8, 2], [10.7, 0.75, 3],
  [-4.45, 0.9, 2], [4.0, 0.93, 2], [8.9, 0.95, 3],
  [-5.2, 1, 3], [11.1, 1, 2],
]
const GUESTS: Guest[] = KNOTS.flatMap(([x0, d0, n], i) => {
  const out: Guest[] = []
  let x = x0
  for (let j = 0; j < n; j++) {
    const seed = i * 7 + j + 1
    const d = d0 + (hash(seed, 3, 9) - 0.5) * 0.06
    out.push({ x, d, glass: hash(seed, 5, 9) > 0.55, seed })
    x += (0.26 + 0.2 * hash(seed, 7, 9)) / Math.max(0.5, d0) * d0
  }
  return out
}).sort((p, q) => p.d - q.d)

function crowd(ctx: Ctx, k: number, f: Frame, t: number): void {
  const h = hush(t)
  // A muted grey a little above the room, people standing in its dim light: darker than the room they stood in (near
  // black), at their size two fresh readers in a row took them for holes, coal, ball bearings, olives.
  const body = mix(GALA.roomLit, GALA.cloth, 0.2)
  for (const g of GUESTS) {
    const drift = 0.018 * Math.sin(t * 0.35 + g.seed * 1.7)
    const [x, y] = seen(f, g.d, g.x + drift, 0)
    // People are not all one size; and the nearer, the bigger.
    const r = 0.13 * g.d * (0.86 + 0.28 * hash(g.seed, 1, 9))
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    // Deeper, the more of the room's haze on it (the far ones well into it); and more again for the whisper.
    const haze = (1 - g.d) * 1.45 + 0.35 * h
    // Standing on the polished floor, not hung on the wall: a soft shadow under each, and its dim reflection.
    const foot = y + r * 0.96
    ctx.save()
    ctx.translate(x * k, foot * k)
    ctx.scale(1, 0.22)
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.35 * k)
    sg.addColorStop(0, rgba(body, 0.5 * (1 - Math.min(0.85, haze))))
    sg.addColorStop(1, rgba(body, 0))
    ctx.fillStyle = sg
    ctx.fillRect(-r * 1.35 * k, -r * 1.35 * k, 2.7 * r * k, 2.7 * r * k)
    ctx.restore()
    ctx.fillStyle = rgba(mix(body, GALA.roomLit, Math.min(0.85, haze)), 0.18)
    ctx.beginPath()
    ctx.ellipse(x * k, (foot + r * 0.55) * k, r * 0.8 * k, r * 0.5 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = mix(body, GALA.roomLit, Math.min(0.85, haze))
    ctx.beginPath()
    ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
    ctx.fill()
    // The room's light, faint along its top.
    ctx.strokeStyle = rgba(mix(GALA.lightWarm, GALA.roomLit, 0.45), 0.3 * (1 - 0.6 * h))
    ctx.lineWidth = Math.max(0.6, 0.012 * k * g.d)
    ctx.beginPath()
    ctx.arc(x * k, y * k, (r - 0.006 * g.d) * k, Math.PI * 1.15, Math.PI * 1.75)
    ctx.stroke()
    // People, as the cast are: a dim outline all round and a mark that looks, toward the room's middle. (Dark discs
    // with only the light along their tops, a fresh reader took them for coal, for rocks.)
    const near = Math.max(0, 1 - haze)
    ctx.strokeStyle = rgba(mix(GALA.roomLit, GALA.lightWarm, 0.3), 0.32 * near * (1 - 0.6 * h))
    ctx.lineWidth = Math.max(0.6, 0.016 * k * g.d)
    ctx.beginPath()
    ctx.arc(x * k, y * k, (r - 0.008 * g.d) * k, 0, Math.PI * 2)
    ctx.stroke()
    const look = x < 0 ? -0.35 : Math.PI + 0.35
    ctx.fillStyle = rgba(GALA.guests, 0.7 * near * (1 - 0.6 * h))
    ctx.beginPath()
    ctx.arc((x + Math.cos(look) * r * 0.5) * k, (y + Math.sin(look) * r * 0.5) * k, Math.max(0.6, r * 0.17 * k), 0, Math.PI * 2)
    ctx.fill()
    if (!g.glass) continue
    // The toast: a tiny glass lifted over it, catching the light.
    const up = smooth(t, T_TOAST + 0.07 * (g.seed % 6), T_TOAST + 0.6 + 0.07 * (g.seed % 6)) * (1 - smooth(t, T_TOAST + 3.3, T_TOAST + 4.3))
    if (up < 0.02) continue
    const gx = x + 0.035 * g.d
    const gy = y - r - (0.03 + 0.11 * up) * g.d
    const w = 0.075 * g.d
    ctx.fillStyle = rgba(mix(GALA.lightWarm, GALA.light, 0.5), (0.25 + 0.65 * up) * (1 - 0.5 * h))
    ctx.beginPath()
    ctx.moveTo((gx - w / 2) * k, (gy - 0.03 * g.d) * k)
    ctx.lineTo((gx + w / 2) * k, (gy - 0.03 * g.d) * k)
    ctx.lineTo((gx + w * 0.15) * k, gy * k)
    ctx.lineTo((gx - w * 0.15) * k, gy * k)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(gx * k - 0.4, gy * k, 0.8, 0.035 * g.d * k)
  }
}

/** The room falls back into its haze round the two of them as he tells her. */
function haze(ctx: Ctx, k: number, f: Frame, t: number): void {
  const h = hush(t)
  if (h <= 0.005) return
  ctx.fillStyle = rgba(mix(GALA.roomLit, GALA.lightWarm, 0.1), 0.5 * h)
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
}

/* ------------------------------------------------------------------ the tower */

/** One coupe: a shallow bowl on a stem and a foot, glass, with champagne in it to `fill` (0..1). */
function coupe(ctx: Ctx, k: number, x: number, rim: number, fill: number, lit: number): void {
  const w = COUPE.w
  const bowl = COUPE.bowl
  const stemTop = rim + bowl
  const foot = rim + COUPE.h
  // The champagne first, inside the bowl.
  if (fill > 0.001) {
    const level = rim + bowl * (1 - fill)
    const half = (w / 2) * (0.35 + 0.65 * Math.sqrt(fill))
    ctx.beginPath()
    ctx.moveTo((x - half) * k, level * k)
    ctx.lineTo((x + half) * k, level * k)
    ctx.quadraticCurveTo((x + w * 0.3) * k, stemTop * k, x * k, stemTop * k)
    ctx.quadraticCurveTo((x - w * 0.3) * k, stemTop * k, (x - half) * k, level * k)
    ctx.closePath()
    ctx.fillStyle = rgba(mix(GALA.lightWarm, GALA.light, 0.3 * lit), 0.8 + 0.15 * lit)
    ctx.fill()
  }
  // The glass: the bowl's shape filled faintly, its rim a lit edge.
  ctx.beginPath()
  ctx.moveTo((x - w / 2) * k, rim * k)
  ctx.lineTo((x + w / 2) * k, rim * k)
  ctx.quadraticCurveTo((x + w * 0.32) * k, stemTop * k, x * k, stemTop * k)
  ctx.quadraticCurveTo((x - w * 0.32) * k, stemTop * k, (x - w / 2) * k, rim * k)
  ctx.closePath()
  ctx.fillStyle = rgba(GALA.glass, 0.16)
  ctx.fill()
  ctx.fillStyle = rgba(GALA.light, 0.6)
  ctx.fillRect((x - w / 2) * k, rim * k - 0.6, w * k, Math.max(1.2, 0.012 * k))
  // Stem and foot.
  ctx.fillStyle = rgba(GALA.glass, 0.5)
  ctx.fillRect(x * k - Math.max(0.6, 0.008 * k), stemTop * k, Math.max(1.2, 0.016 * k), (foot - stemTop) * k)
  ctx.fillRect((x - w * 0.26) * k, (foot - 0.012) * k, w * 0.52 * k, Math.max(1, 0.014 * k))
}

/** A thin fall of champagne from `a` to `b`, shimmering. */
function fall(ctx: Ctx, k: number, a: Pt, b: Pt, w: number, alpha: number, t: number, seed: number): void {
  if (alpha <= 0.01) return
  const n = 10
  ctx.beginPath()
  const L: Pt[] = []
  const R: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = a[0] + (b[0] - a[0]) * u * u + 0.006 * Math.sin(t * 23 + u * 9 + seed)
    const y = a[1] + (b[1] - a[1]) * u
    const ww = w * (1 - 0.35 * u)
    L.push([x - ww / 2, y])
    R.push([x + ww / 2, y])
  }
  ctx.moveTo(L[0][0] * k, L[0][1] * k)
  for (const q of L) ctx.lineTo(q[0] * k, q[1] * k)
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0] * k, R[i][1] * k)
  ctx.closePath()
  ctx.fillStyle = rgba(GALA.lightWarm, alpha)
  ctx.fill()
}

function tower(ctx: Ctx, k: number, t: number): void {
  // Each tier alight as it brims: a warm bloom behind it that flares and settles.
  for (let i = 0; i < TIERS; i++) {
    const on = smooth(t, BRIM[i] - 0.25, BRIM[i] + 0.15)
    if (on <= 0.01) continue
    const flare = Math.exp(-Math.max(0, t - BRIM[i]) / 0.7)
    const [, rim] = coupeAt(i, 0)
    const cy = rim + COUPE.bowl * 0.5
    const R = 0.5 + 0.28 * i + 0.25 * flare
    const g = ctx.createRadialGradient(TABLE.x * k, cy * k, 0, TABLE.x * k, cy * k, R * k)
    g.addColorStop(0, rgba(GALA.lightWarm, on * (0.1 + 0.16 * flare)))
    g.addColorStop(1, rgba(GALA.lightWarm, 0))
    ctx.fillStyle = g
    ctx.fillRect((TABLE.x - R) * k, (cy - R) * k, 2 * R * k, 2 * R * k)
  }
  // Its light on the polished floor under the table.
  const full = smooth(t, BRIM[0], BRIM[TIERS - 1] + 0.4)
  if (full > 0.01) {
    // A long soft pool, as on polished stone: an ellipse of light, no edges.
    ctx.save()
    ctx.translate(TABLE.x * k, (FLOOR_Y + 0.35) * k)
    ctx.scale(1, 0.32)
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.6 * k)
    rg.addColorStop(0, rgba(GALA.lightWarm, 0.2 * full))
    rg.addColorStop(1, rgba(GALA.lightWarm, 0))
    ctx.fillStyle = rg
    ctx.fillRect(-1.6 * k, -1.6 * k, 3.2 * k, 3.2 * k)
    ctx.restore()
  }
  // In the whisper the tower's light reaches the two of them on the floor beside it.
  const h = hush(t)
  if (h > 0.01) {
    ctx.save()
    ctx.translate((HER_END[0] + 0.1) * k, (FLOOR_Y + 0.05) * k)
    ctx.scale(1, 0.3)
    const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.3 * k)
    wg.addColorStop(0, rgba(GALA.lightWarm, 0.16 * h))
    wg.addColorStop(1, rgba(GALA.lightWarm, 0))
    ctx.fillStyle = wg
    ctx.fillRect(-1.3 * k, -1.3 * k, 2.6 * k, 2.6 * k)
    ctx.restore()
  }
  // The round table: a cloth over its top, a dark pedestal and foot.
  const x0 = TABLE.x - TABLE.half
  const x1 = TABLE.x + TABLE.half
  const wood = mix(GALA.guests, GALA.roomLit, 0.35)
  ctx.fillStyle = wood
  ctx.fillRect((TABLE.x - 0.06) * k, TABLE.top * k, 0.12 * k, (FLOOR_Y - TABLE.top) * k)
  ctx.beginPath()
  ctx.moveTo((TABLE.x - 0.45) * k, FLOOR_Y * k)
  ctx.quadraticCurveTo(TABLE.x * k, (FLOOR_Y - 0.14) * k, (TABLE.x + 0.45) * k, FLOOR_Y * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = mix(GALA.cloth, GALA.roomLit, 0.45)
  ctx.beginPath()
  ctx.moveTo(x0 * k, TABLE.top * k)
  ctx.lineTo(x1 * k, TABLE.top * k)
  ctx.quadraticCurveTo((x1 + 0.04) * k, (TABLE.top + 0.18) * k, (x1 - 0.06) * k, (TABLE.top + 0.24) * k)
  ctx.lineTo((x0 + 0.06) * k, (TABLE.top + 0.24) * k)
  ctx.quadraticCurveTo((x0 - 0.04) * k, (TABLE.top + 0.18) * k, x0 * k, TABLE.top * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba(GALA.light, 0.18 + 0.2 * full)
  ctx.fillRect(x0 * k, TABLE.top * k, (x1 - x0) * k, Math.max(1, 0.03 * k))
  // The coupes, the bottom tier first; the falls between them where a tier above has brimmed and is running over.
  const flow = pourFlow(t)
  for (let i = TIERS - 1; i >= 0; i--) {
    const fill = tierFill(i, t)
    const brimmed = smooth(t, BRIM[i] - 0.12, BRIM[i] + 0.1)
    const lit = smooth(t, BRIM[i] - 0.15, BRIM[i] + 0.35) * (0.75 + 0.25 * Math.exp(-Math.max(0, t - BRIM[i]) / 0.8))
    for (let j = 0; j <= i; j++) {
      const [x, rim] = coupeAt(i, j)
      coupe(ctx, k, x, rim, fill, lit)
      // Running over its rim into the two below, while the pour keeps coming.
      if (i < TIERS - 1 && brimmed > 0.01) {
        const over = brimmed * flow * 0.55
        const [bx, brim] = coupeAt(i + 1, j)
        const [cx2] = coupeAt(i + 1, j + 1)
        fall(ctx, k, [x - COUPE.w / 2 + 0.01, rim], [bx + 0.05, brim + COUPE.bowl * 0.4], 0.018, over, t, i * 7 + j)
        fall(ctx, k, [x + COUPE.w / 2 - 0.01, rim], [cx2 - 0.05, brim + COUPE.bowl * 0.4], 0.018, over, t, i * 7 + j + 3)
      }
    }
  }
}

/* ------------------------------------------------------------------ the stand */

function stand(ctx: Ctx, k: number, t: number): void {
  const brass = mix(GALA.lightWarm, GALA.room, 0.45)
  const dark = mix(GALA.guests, GALA.roomLit, 0.3)
  // The post and its arm to the cradle.
  ctx.fillStyle = brass
  ctx.fillRect((POST.x - 0.025) * k, POST.top * k, 0.05 * k, (FLOOR_Y - POST.top) * k)
  ctx.fillRect((POST.x - 0.12) * k, (FLOOR_Y - 0.03) * k, 0.24 * k, 0.03 * k)
  ctx.fillRect(BOTTLE.c[0] * k, (POST.top - 0.02) * k, (POST.x - BOTTLE.c[0]) * k, 0.04 * k)
  // The pedal: a brass plate hinged at the post's foot, its free end raised, pressed flat under her. A wedge, deeper at
  // its free end with a dark tread on it: drawn as a thin even strip, once she had rolled off it, it read as a rod
  // from the stand to her side, a leash.
  const lift = PEDAL.lift * (1 - pedalDown(t))
  const len = PEDAL.end - PEDAL.hinge
  ctx.save()
  ctx.translate(PEDAL.hinge * k, FLOOR_Y * k)
  ctx.rotate(-Math.atan2(lift, len))
  ctx.fillStyle = brass
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -0.03 * k)
  ctx.lineTo(len * k, -0.06 * k)
  ctx.quadraticCurveTo((len + 0.02) * k, -0.06 * k, (len + 0.02) * k, -0.03 * k)
  ctx.lineTo((len + 0.02) * k, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = dark
  ctx.fillRect(len * 0.45 * k, -0.065 * k, len * 0.5 * k, 0.018 * k)
  ctx.restore()
  // The bottle in its cradle, turning about its middle: dark glass, a pale foil at its neck.
  const a = bottleAngle(t)
  ctx.save()
  ctx.translate(BOTTLE.c[0] * k, BOTTLE.c[1] * k)
  ctx.rotate(a)
  // Along -x is the neck.
  const L = BOTTLE.half
  ctx.beginPath()
  ctx.moveTo(-L * k, -0.03 * k)
  ctx.lineTo(-0.2 * k, -0.035 * k)
  ctx.quadraticCurveTo(-0.08 * k, -0.085 * k, 0.02 * k, -0.085 * k)
  ctx.lineTo(0.36 * k, -0.085 * k)
  ctx.quadraticCurveTo(0.4 * k, -0.085 * k, 0.4 * k, -0.045 * k)
  ctx.lineTo(0.4 * k, 0.045 * k)
  ctx.quadraticCurveTo(0.4 * k, 0.085 * k, 0.36 * k, 0.085 * k)
  ctx.lineTo(0.02 * k, 0.085 * k)
  ctx.quadraticCurveTo(-0.08 * k, 0.085 * k, -0.2 * k, 0.035 * k)
  ctx.lineTo(-L * k, 0.03 * k)
  ctx.closePath()
  ctx.fillStyle = dark
  ctx.fill()
  ctx.fillStyle = rgba(GALA.lightWarm, 0.28)
  ctx.fillRect(0.02 * k, -0.07 * k, 0.32 * k, 0.025 * k)
  ctx.fillStyle = mix(GALA.lightWarm, GALA.cloth, 0.4)
  ctx.fillRect(-L * k, -0.035 * k, 0.16 * k, 0.07 * k)
  // The cradle's band round it.
  ctx.fillStyle = brass
  ctx.fillRect(-0.03 * k, -0.1 * k, 0.06 * k, 0.2 * k)
  ctx.restore()
  // The pour: from the mouth down into the top coupe.
  const flow = pourFlow(t)
  if (flow > 0.01) {
    const m = mouthAt(t)
    const [, rim] = coupeAt(0, 0)
    const surface = rim + COUPE.bowl * (1 - tierFill(0, t))
    fall(ctx, k, m, [coupeAt(0, 0)[0], surface], 0.028, 0.85 * flow, t, 1)
  }
}

/** The gala's standing drawing, by show time. */
export function drawGala(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  p.push()
  p.noStroke()
  room(ctx, k, f, t)
  chandelier(ctx, k, f, -3.2, t, 1)
  chandelier(ctx, k, f, 5.4, t, 2)
  crowd(ctx, k, f, t)
  haze(ctx, k, f, t)
  carried(p, k, t)
  // The foreground floor's sheen, and the tower's light lying on it.
  const sheen = ctx.createLinearGradient(0, FLOOR_Y * k, 0, (FLOOR_Y + 1.5) * k)
  sheen.addColorStop(0, rgba(GALA.lightWarm, 0.1))
  sheen.addColorStop(1, rgba(GALA.lightWarm, 0))
  ctx.fillStyle = sheen
  ctx.fillRect((f.x0 - 1) * k, FLOOR_Y * k, (f.x1 - f.x0 + 2) * k, 1.5 * k)
  tower(ctx, k, t)
  stand(ctx, k, t)
  number(ctx, k, t)
  p.pop()
}

/**
 * The ring she was shown, carried across the cut into the gala: at the cut it is where it was, in the same place by
 * her on the screen (the cut carries her and the camera together), and pales away in a second. In the fog it is ink
 * on white; here, on the dark room, a ghost of it in light. So the gala comes out of what she is shown, as the swing
 * did, and reads as another thing she sees: years on, not the next day. Gone before the camera has drawn back far: it is
 * drawn in the room, and over a second and a half the draw-back shrank it onto the floor among the guests, a pale hoop
 * standing in the ballroom, a prop.
 */
function carried(p: p5, k: number, t: number): void {
  const at = SEAM.gala
  const fade = 1 - smooth(t, at + 0.15, at + 0.38)
  if (t < at || fade <= 0.001) return
  const c = smallC(at)
  const her0 = fogHerAt(at)
  const here = herAt(at)
  // Gathered into her at once, in her own gold, and gone in a third of a second: the cut's carry, not a thing in the
  // room. (Any frame of it a fresh eye caught, over four tries at it, they took for a thing in the ballroom: a wreath,
  // a layer left showing, a hoop, a hula hoop; and the gala reads as a future she is shown without it lingering.)
  const into = smooth(t, at, at + 0.32)
  const now = herAt(t)
  const x = here[0] + c[0] - her0[0] + (now[0] - (here[0] + c[0] - her0[0])) * into
  const y = here[1] + c[1] - her0[1] + (now[1] - (here[1] + c[1] - her0[1])) * into
  const ctx = p.drawingContext as Ctx
  p.push()
  p.translate(x * k, y * k)
  p.rotate(SMALL_TURN)
  ctx.save()
  ctx.globalAlpha *= (1 - smallPale(at)) * 1.5 * fade
  drawInk(p, k, 0, 0, smallR(at) * (1 - 0.88 * into), SMALL, smallU(at), { tendrils: smallTendrils(at) * (1 - into), bloom: smallBloom(at), color: mix(LOUISE, GALA.lightWarm, 0.35) })
  ctx.restore()
  p.pop()
}

/**
 * What he tells her: his number, which she will dial. After the whisper a ghost of the sat phone's keys comes up beside
 * them, on her right where he is, lit the keys' own green (in his red it read as warning lights, the bomb's colour), just where the keys stand in the tent after the cut (the cut carries her and the
 * camera together, so the same place on the screen), and its keys light one a beat in the order she will press them;
 * on the cut the real keys are there, and she dials the same keys in the same order. Without it nothing passed between
 * them at the touch, and "the number he gave her" could not be read.
 */
/** The beats between the whisper and the cut: a digit on each. */
const GHOST_BEATS = beats(T_TOUCH + 0.4, SEAM.call - 0.4)
function number(ctx: Ctx, k: number, t: number): void {
  const up = smooth(t, T_TOUCH + 0.25, T_TOUCH + 0.85)
  if (up <= 0.001) return
  const [hx, hy] = HER_END
  const [top, foot] = KEY_SPAN
  const key = (x: number, lit: number) => {
    const x0 = (hx + x - KEY_W / 2) * k
    const y0 = (hy + top) * k
    const w = KEY_W * k
    const h = (foot - top) * k
    if (lit > 0.01) {
      const g = ctx.createRadialGradient(x0 + w / 2, y0 + h / 2, 0, x0 + w / 2, y0 + h / 2, KEY_W * 1.3 * k)
      g.addColorStop(0, rgba(TENT.keypad, 0.75 * lit * up))
      g.addColorStop(1, rgba(TENT.keypad, 0))
      ctx.fillStyle = g
      ctx.fillRect(x0 - KEY_W * 1.3 * k + w / 2, y0 - KEY_W * 1.3 * k + h / 2, KEY_W * 2.6 * k, KEY_W * 2.6 * k)
    }
    // Bright enough, lit, to catch at speed: fainter, the hand-off was easy to miss.
    ctx.fillStyle = rgba(mix(TENT.keypad, '#FFFFFF', 0.15 + 0.45 * lit), (0.2 + 0.8 * lit) * up)
    ctx.fillRect(x0 + 0.02 * k, y0, w - 0.04 * k, h)
  }
  // Each of the first digits on its beat, as he speaks: a flare, then held lit.
  const litOf = (digit: number) => {
    let v = 0
    GHOST_BEATS.forEach((bt, n) => {
      if (NUMBER[n] === digit && t >= bt) v = Math.max(v, 0.55 + 0.45 * Math.exp(-(t - bt) / 0.35))
    })
    return v
  }
  // The phone's body under its keys, faint, with the keys' light along its edge: keys floating alone read as lights.
  const bx0 = (hx + PHONE_BODY.x0) * k
  const bx1 = (hx + PHONE_BODY.x1) * k
  const by0 = (hy + PHONE_BODY.top) * k
  const by1 = (hy + PHONE_BODY.foot) * k
  ctx.fillStyle = rgba(mix(GALA.roomLit, '#000000', 0.7), 0.5 * up)
  ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0)
  ctx.strokeStyle = rgba(TENT.keypad, 0.35 * up)
  ctx.lineWidth = Math.max(1, 0.012 * k)
  ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0)
  // And its handset beside it, off the hook, as it lies in the tent: without it the ghost read as a bar counter.
  ctx.save()
  ctx.translate(hx * k, hy * k)
  drawHandset(ctx, k, rgba(mix(GALA.roomLit, '#000000', 0.7), 0.5 * up), false)
  ctx.restore()
  KEYS.forEach((x, digit) => key(x, litOf(digit)))
  key(CALL_X, 0)
}
