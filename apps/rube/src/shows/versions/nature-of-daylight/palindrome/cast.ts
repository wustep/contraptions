import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { hash } from './kit'
import { FOG, SHELL, TENT, VALLEY } from './worlds'

/**
 * The director's canonical drawings: the things that appear in more than one place and must look the same in every
 * one of them. Every builder draws these with these functions, never a copy:
 *
 * - `drawShell`: the shell, from a speck on a television to the whole sky over the valley.
 * - `drawHeptapod`: Abbott and Costello, seven-limbed, in fog.
 * - `inkRing` / `drawInk` / `inkAt`: their writing, a ring of ink formed from both ends at once.
 * - `drawShellScene` / `drawScreen`: a screen with a shell on it: the television at the lake house, the twelve in the
 *   command tent (each a different place on Earth).
 *
 * All of them draw straight onto the canvas's context in pixels, from cells times `k` (the stage's pixels a cell,
 * `c.k`), so a gradient never leaks into p5's idea of the fill. Nothing here sets type.
 */

type Ctx = CanvasRenderingContext2D
const ctxOf = (p: p5): Ctx => p.drawingContext as Ctx

/** A colour with an alpha, as a CSS string. */
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(4)})`
}
/** Between two colours, `f` of the way from `a` to `b`. */
export function mix(a: string, b: string, f: number): string {
  const pa = a.replace('#', '')
  const pb = b.replace('#', '')
  const u = Math.max(0, Math.min(1, f))
  const ch = (i: number) => Math.round(parseInt(pa.slice(i, i + 2), 16) * (1 - u) + parseInt(pb.slice(i, i + 2), 16) * u)
  return `#${[0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const ease = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/* ------------------------------------------------------------------ the shell */

export interface ShellLook {
  /** How much the sky lights it, 0 (a silhouette) to 1. Default 0.6. */
  light?: number
  /** Where the light comes from across it: -1 its left, 1 its right. Default -0.45. */
  side?: number
  /** Mist over its lower part, 0 to 1, in `mistColor`. Default 0. */
  mist?: number
  mistColor?: string
  /** How open the slot in its belly is, 0 to 1, and how bright its light. */
  slot?: number
  slotLight?: number
  /** The whole of it, 0 to 1: for a shell going into cloud, or coming out of it. */
  alpha?: number
  /** How much of it has gone to vapour from the top down, 0 to 1 (it goes as it rises). */
  vapour?: number
  /** Its colours; the valley's by default. */
  body?: string
  rim?: string
  dark?: string
}

/** Half its width at `v` from top (-1) to bottom (1), as a share of its height: a stone stood on its edge, fuller low. */
const shellHalf = (v: number): number => 0.245 * Math.pow(Math.max(0, 1 - v * v), 0.56) * (1 + 0.09 * v) * (1 - 0.06 * Math.max(0, -v) ** 2)

/** The shell's outline, centre (cx, cy) and height h, in pixels: 72 points round, leaning a hair to its right. */
function shellPath(ctx: Ctx, cx: number, cy: number, h: number): void {
  ctx.beginPath()
  const n = 72
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const v = -Math.cos(a)
    const x = cx + Math.sign(Math.sin(a)) * shellHalf(v) * h + 0.012 * h * (1 - v)
    const y = cy + (v * h) / 2
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/**
 * The shell, centre (cx, cy) and height `h` in cells. A smooth dark stone standing on its edge in the air: no seams,
 * no lights, the sky's grey caught along one side of it and its belly darker. Seen as a speck (on a television, in a
 * far wide) it is the same shape, only flatter in tone.
 */
export function drawShell(p: p5, k: number, cx: number, cy: number, h: number, o: ShellLook = {}): void {
  const ctx = ctxOf(p)
  const X = cx * k
  const Y = cy * k
  const H = h * k
  if (H < 0.5) return
  const alpha = o.alpha ?? 1
  if (alpha <= 0.003) return
  const light = o.light ?? 0.6
  const side = o.side ?? -0.45
  const body = o.body ?? VALLEY.shell
  const rim = o.rim ?? VALLEY.shellRim
  const dark = o.dark ?? VALLEY.shellDark
  const W = 0.5 * H
  ctx.save()
  ctx.globalAlpha *= alpha
  // Gone to vapour from the top down: clip the body below the vapour line, and let the line itself be soft (drawn
  // after, as mist the colour of the cloud).
  const vap = clamp01(o.vapour ?? 0)
  if (vap > 0) {
    ctx.beginPath()
    ctx.rect(X - W, Y - H / 2 + vap * H, 2 * W, H * 1.2)
    ctx.clip()
  }
  shellPath(ctx, X, Y, H)
  // Across it: the lit side to the dark side.
  const g = ctx.createLinearGradient(X + side * W * 0.5, Y, X - side * W * 0.5, Y)
  g.addColorStop(0, mix(body, rim, 0.55 * light))
  g.addColorStop(0.45, body)
  g.addColorStop(1, mix(body, dark, 0.7))
  ctx.fillStyle = g
  ctx.fill()
  if (H > 6) {
    // Down it: the sky's light on its crown, the belly in its own shadow.
    const d = ctx.createLinearGradient(X, Y - H / 2, X, Y + H / 2)
    d.addColorStop(0, rgba(rim, 0.28 * light))
    d.addColorStop(0.35, rgba(rim, 0))
    d.addColorStop(0.72, rgba(dark, 0))
    d.addColorStop(1, rgba(dark, 0.75))
    ctx.fillStyle = d
    ctx.fill()
    // A long soft sheen on the lit side, as on wet stone.
    ctx.save()
    shellPath(ctx, X, Y, H)
    ctx.clip()
    const sx = X + side * W * 0.3
    const sheen = ctx.createRadialGradient(sx, Y - H * 0.12, 0, sx, Y - H * 0.12, W * 0.55)
    sheen.addColorStop(0, rgba(rim, 0.3 * light))
    sheen.addColorStop(1, rgba(rim, 0))
    ctx.fillStyle = sheen
    ctx.scale(1, 1)
    ctx.fillRect(X - W, Y - H, 2 * W, 2 * H)
    ctx.restore()
    // The lit edge: the sky caught along one side, a soft band inside the outline, not a line round it.
    ctx.save()
    shellPath(ctx, X, Y, H)
    ctx.clip()
    ctx.lineWidth = Math.max(1, H * 0.022)
    ctx.strokeStyle = rgba(mix(rim, VALLEY.cloud, 0.35), 0.22 * light)
    ctx.translate(-side * H * 0.008, H * 0.004)
    shellPath(ctx, X, Y, H)
    ctx.stroke()
    ctx.restore()
  }
  // The slot in the belly: a dark cut that opens to its light.
  const slot = clamp01(o.slot ?? 0)
  if (slot > 0.001 && H > 12) {
    const sw = W * 0.07
    const sh = H * 0.045 * slot
    const sy = Y + H * 0.5 - H * 0.035
    ctx.fillStyle = SHELL.dark
    ctx.fillRect(X - sw / 2, sy - sh, sw, sh)
    const lit = clamp01(o.slotLight ?? slot)
    if (lit > 0) {
      const glow = ctx.createRadialGradient(X, sy - sh / 2, 0, X, sy - sh / 2, sw * 1.4)
      glow.addColorStop(0, rgba(SHELL.glow, 0.85 * lit))
      glow.addColorStop(1, rgba(SHELL.glow, 0))
      ctx.fillStyle = glow
      ctx.fillRect(X - sw * 1.5, sy - sh / 2 - sw * 1.5, sw * 3, sw * 3)
    }
  }
  // Mist over its lower part.
  const mist = clamp01(o.mist ?? 0)
  if (mist > 0) {
    const mc = o.mistColor ?? VALLEY.fog
    ctx.save()
    shellPath(ctx, X, Y, H)
    ctx.clip()
    const m = ctx.createLinearGradient(X, Y + H * (0.5 - 0.7 * mist), X, Y + H / 2)
    m.addColorStop(0, rgba(mc, 0))
    m.addColorStop(1, rgba(mc, 0.92 * mist))
    ctx.fillStyle = m
    ctx.fillRect(X - W, Y - H / 2, 2 * W, H)
    ctx.restore()
  }
  if (vap > 0) {
    // The vapour line: the cloud eating down into it.
    const vy = Y - H / 2 + vap * H
    const m = ctx.createLinearGradient(X, vy - H * 0.02, X, vy + H * 0.12)
    m.addColorStop(0, rgba(VALLEY.cloud, 0.95))
    m.addColorStop(1, rgba(VALLEY.cloud, 0))
    ctx.save()
    shellPath(ctx, X, Y, H)
    ctx.clip()
    ctx.fillStyle = m
    ctx.fillRect(X - W, vy - H * 0.02, 2 * W, H * 0.14)
    ctx.restore()
  }
  ctx.restore()
}

/** The shell's width for a height (cells): for laying things round it. */
export const shellWidth = (h: number): number => 0.5 * h
/** Where its belly's lowest point is, from its centre, for a height (cells). */
export const shellBelly = (h: number): number => h / 2

/* ------------------------------------------------------------------ the heptapods */

export interface HeptapodLook {
  /** Show time, for its slow breathing sway. */
  t?: number
  /** How deep in the fog it stands, 0 (at the glass, dark) to 1 (gone into the white). Default 0.35. */
  fog?: number
  fogColor?: string
  color?: string
  /** Its lean, -1 to 1 (toward its left or right). */
  lean?: number
  /** Which way it faces: 1 its front limb to the right, -1 to the left. */
  face?: 1 | -1
  /**
   * A limb raised and reaching toward `to` (cells), `u` of the way (0 down, 1 there), its tip opened into a palm by
   * `open` (0 closed, 1 a hand of seven fingers spread). `palm` is the hand's reach from its centre in cells (default
   * 0.15 of its height): smaller when it must meet a ball hand to hand.
   */
  reach?: { to: Pt; u: number; open?: number; palm?: number }
  /** A second seed for its limbs' spread, so Abbott and Costello are not twins. */
  seed?: number
}

interface Limb {
  /** Where on the body's underside it springs from (-1..1 across) and where its foot is (cells from the centre line). */
  from: number
  foot: number
  /** How far back it is (0 front, 1 behind): paler, thinner. */
  back: number
  /** Its knee: how far out it bows. */
  bow: number
}

function limbsOf(seed: number): Limb[] {
  const out: Limb[] = []
  for (let i = 0; i < 7; i++) {
    const a = -1 + (2 * i) / 6
    const back = i % 2 === 1 ? 0.55 + 0.3 * hash(i, seed, 3) : 0.1 * hash(i, seed, 4)
    out.push({ from: a * 0.55, foot: a * (1.05 + 0.25 * hash(i, seed, 1)) + 0.12 * (hash(i, seed, 2) - 0.5), back, bow: 0.18 + 0.2 * hash(i, seed, 5) })
  }
  return out.sort((a, b) => b.back - a.back)
}

/** A tapered limb from `a` to `b` in pixels, bowing out by `bow` (share of its length), `w0` wide at `a`, `w1` at `b`. */
function limbPath(ctx: Ctx, a: Pt, b: Pt, bow: number, w0: number, w1: number): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const side = a[0] < b[0] ? 1 : -1
  const c: Pt = [a[0] + dx * 0.45 + nx * bow * len * side, a[1] + dy * 0.45 + ny * bow * len * side]
  const n = 16
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0]
    const y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]
    const tx = 2 * (1 - u) * (c[0] - a[0]) + 2 * u * (b[0] - c[0])
    const ty = 2 * (1 - u) * (c[1] - a[1]) + 2 * u * (b[1] - c[1])
    const tl = Math.hypot(tx, ty) || 1
    // Thick from the body, a long taper, and a little swell above the foot.
    const w = (w0 + (w1 - w0) * Math.pow(u, 0.7)) * (1 + 0.25 * Math.exp(-((u - 0.88) ** 2) / 0.004))
    left.push([x - (ty / tl) * w * 0.5, y + (tx / tl) * w * 0.5])
    right.push([x + (ty / tl) * w * 0.5, y - (tx / tl) * w * 0.5])
  }
  ctx.beginPath()
  ctx.moveTo(left[0][0], left[0][1])
  for (const q of left) ctx.lineTo(q[0], q[1])
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
  ctx.closePath()
}

/**
 * A palm: a solid pad and seven thick fingers with round pads, spread from `c` (pixels), `r` long, opened by `open`
 * (curled in toward the pad at 0, spread flat at 1), turned to `angle`. Filled in `color`: a hand, never a star.
 */
function drawPalm(ctx: Ctx, c: Pt, r: number, open: number, angle: number, color: string): void {
  const n = 7
  const spread = 0.3 + 0.7 * open
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(c[0], c[1], r * 0.5, r * 0.44, angle, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < n; i++) {
    // Fanned over the front of the pad, not all round it: the limb comes into the hand from behind, where there are
    // no fingers, so it reads as a hand pressed flat and never as a star. The middle ones longest, the outer ones
    // shorter and splayed a little wider.
    const side = (i - (n - 1) / 2) / ((n - 1) / 2)
    const a = angle + side * Math.PI * 0.6 * spread * (1 + 0.08 * Math.abs(side))
    const len = r * (0.66 + 0.34 * Math.cos(side * 1.25)) * (0.5 + 0.5 * open)
    const w0 = r * (0.36 - 0.06 * Math.abs(side))
    const w1 = r * (0.19 - 0.03 * Math.abs(side))
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    const nx = -uy
    const ny = ux
    const tip: Pt = [c[0] + ux * len, c[1] + uy * len]
    ctx.beginPath()
    ctx.moveTo(c[0] + nx * w0 * 0.5, c[1] + ny * w0 * 0.5)
    ctx.lineTo(tip[0] + nx * w1 * 0.5, tip[1] + ny * w1 * 0.5)
    ctx.arc(tip[0], tip[1], w1 * 0.5, a + Math.PI / 2, a - Math.PI / 2, true)
    ctx.lineTo(c[0] - nx * w0 * 0.5, c[1] - ny * w0 * 0.5)
    ctx.closePath()
    ctx.fill()
    // The finger's pad: a little fuller at the tip.
    ctx.beginPath()
    ctx.arc(tip[0] - ux * w1 * 0.25, tip[1] - uy * w1 * 0.25, w1 * 0.62, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * A heptapod standing on the ground at (x, y) (the middle of its stance, in cells), `s` cells tall to the top of its
 * body. A heavy rounded body high up, like a great skull turned down; seven long limbs from under it, thick as trunks,
 * bowing out and tapering to the ground; the ones behind paler. Always a shape in fog: the deeper it stands (`fog`),
 * the more it goes to the fog's colour, and its feet are always lost in it.
 */
export function drawHeptapod(p: p5, k: number, x: number, y: number, s: number, o: HeptapodLook = {}): void {
  const ctx = ctxOf(p)
  const fogC = o.fogColor ?? FOG.white
  const base = o.color ?? FOG.heptapod
  const depth = clamp01(o.fog ?? 0.35)
  const t = o.t ?? 0
  const seed = o.seed ?? 1
  const face = o.face ?? 1
  const lean = (o.lean ?? 0) + 0.035 * Math.sin(t * 0.6 + seed)
  const S = s * k
  const X = x * k
  const Y = y * k
  // The body: tall and heavy, high on its limbs, breathing a little.
  const bx = X + lean * S * 0.1
  const by = Y - S * (0.72 + 0.008 * Math.sin(t * 0.8 + seed * 2))
  const bw = S * 0.2
  const bh = S * 0.27
  const col = (back: number) => mix(base, fogC, Math.min(0.92, depth * 0.85 + back * 0.32))
  ctx.save()
  // The limbs, the far ones first: from under the body, bowing out like a great tree's roots, down into the fog.
  const limbs = limbsOf(seed)
  for (const L of limbs) {
    // Springing from all round the underside, like fingers from a palm: a hand standing on its fingertips.
    const th = Math.PI / 2 - (L.from / 0.55) * 1.2
    const a: Pt = [bx + Math.cos(th) * bw * 0.6 * face, by + Math.sin(th) * bh * 0.5]
    const b: Pt = [X + L.foot * S * 0.5 * face, Y]
    const w0 = S * (0.125 - 0.035 * L.back)
    const w1 = S * (0.032 - 0.01 * L.back)
    limbPath(ctx, a, b, (0.05 + L.bow * 0.3) * (L.from < 0 ? -1 : 1) * face, w0, w1)
    const g = ctx.createLinearGradient(0, a[1], 0, b[1])
    g.addColorStop(0, col(L.back))
    g.addColorStop(0.55, mix(col(L.back), fogC, 0.2))
    g.addColorStop(1, mix(col(L.back), fogC, 0.85))
    ctx.fillStyle = g
    ctx.fill()
  }
  // The reaching limb and its palm.
  if (o.reach && o.reach.u > 0) {
    const u = ease(o.reach.u)
    const from: Pt = [bx + bw * 0.55 * face, by + bh * 0.25]
    const rest: Pt = [X + S * 0.5 * face, Y]
    const to: Pt = [o.reach.to[0] * k, o.reach.to[1] * k]
    const tip: Pt = [rest[0] + (to[0] - rest[0]) * u, rest[1] + (to[1] - rest[1]) * u]
    limbPath(ctx, from, tip, 0.1 * face, S * 0.1, S * 0.045)
    const g = ctx.createLinearGradient(from[0], from[1], tip[0], tip[1])
    g.addColorStop(0, col(0))
    g.addColorStop(1, mix(col(0), fogC, 0.08))
    ctx.fillStyle = g
    ctx.fill()
    const open = clamp01(o.reach.open ?? 0)
    if (open > 0.01) {
      const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0])
      drawPalm(ctx, tip, (o.reach.palm ?? s * 0.15) * k, open, ang, col(0))
    }
  }
  // The body: a heavy dome, rounder on top, narrowing into the limbs below; its crown lighter where the fog's light
  // falls, its skin folded in long soft creases.
  ctx.beginPath()
  const n = 48
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const v = -Math.cos(a)
    const half = bw * Math.pow(Math.max(0, 1 - v * v), v < 0 ? 0.36 : 0.58) * (1 - 0.3 * Math.max(0, v) ** 1.5)
    const px = bx + Math.sign(Math.sin(a)) * half + lean * bh * 0.2 * v
    const py = by + v * bh
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  const bg = ctx.createRadialGradient(bx - bw * 0.25, by - bh * 0.55, bh * 0.1, bx, by, bh * 1.25)
  bg.addColorStop(0, mix(col(0), fogC, 0.22))
  bg.addColorStop(0.65, col(0))
  bg.addColorStop(1, mix(col(0), '#000000', 0.1))
  ctx.fillStyle = bg
  ctx.fill()
  // Its underside in its own shadow, where the limbs go in.
  ctx.save()
  ctx.clip()
  const under = ctx.createLinearGradient(0, by, 0, by + bh)
  under.addColorStop(0, rgba(mix(col(0), '#000000', 0.2), 0))
  under.addColorStop(1, rgba(mix(col(0), '#000000', 0.2), 0.55))
  ctx.fillStyle = under
  ctx.fillRect(bx - bw * 1.2, by, bw * 2.4, bh * 1.1)
  ctx.restore()
  // The fog at their feet, always: a low bank of white the limbs go into, fading out at its ends as well as its top,
  // so it never shows an edge against whatever is behind.
  ctx.save()
  ctx.translate(X, Y)
  ctx.scale(1, 0.32)
  const f = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.95)
  f.addColorStop(0, rgba(fogC, 0.92))
  f.addColorStop(0.55, rgba(fogC, 0.8))
  f.addColorStop(1, rgba(fogC, 0))
  ctx.fillStyle = f
  ctx.beginPath()
  ctx.arc(0, 0, S * 0.95, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

/** Where a heptapod's reaching limb comes to rest, and its body's centre: for aiming a reach, or a jet of ink. */
export const heptapodBody = (x: number, y: number, s: number): Pt => [x, y - s * 0.72]

/* ------------------------------------------------------------------ their ink */

export interface Ring {
  seed: number
  /** Where the writing starts (radians; 0 is to the right, y down): it forms both ways round from here, meeting opposite. */
  start: number
  /** The ring's radius at an angle, as a share of its radius: never quite a circle. */
  r: (a: number) => number
  /** How thick the ink is at an angle, as a share of the radius: a brush's thick and thin. */
  w: (a: number) => number
  /** The strokes that fling out from it, each at an angle, with a length (share of the radius) and a curl. */
  tendrils: { a: number; len: number; curl: number; w: number }[]
  /** The blots pressed into it. */
  blots: { a: number; size: number; out: number }[]
}

/** A logogram's geometry from a seed: the same seed is the same sentence everywhere. */
export function inkRing(seed: number): Ring {
  const h = (i: number) => hash(seed, i, 71)
  const harm = [1, 2, 3, 5].map((m, i) => ({ m, amp: [0.035, 0.05, 0.03, 0.015][i] * (0.5 + h(i)), ph: h(i + 10) * Math.PI * 2 }))
  const wh = [1, 2, 3].map((m, i) => ({ m, amp: [0.5, 0.35, 0.25][i] * (0.4 + h(i + 20)), ph: h(i + 30) * Math.PI * 2 }))
  const start = -Math.PI / 2 + (h(40) - 0.5) * 1.2
  const nt = 3 + Math.floor(h(41) * 4)
  const tendrils = Array.from({ length: nt }, (_, i) => ({
    a: start + Math.PI * 0.25 + ((i + h(50 + i) * 0.7) / nt) * Math.PI * 2,
    len: 0.18 + 0.4 * h(60 + i),
    curl: (h(70 + i) - 0.5) * 2.2,
    w: 0.05 + 0.05 * h(80 + i),
  }))
  const nb = 2 + Math.floor(h(42) * 4)
  const blots = Array.from({ length: nb }, (_, i) => ({ a: h(90 + i) * Math.PI * 2, size: 0.07 + 0.09 * h(100 + i), out: (h(110 + i) - 0.5) * 0.12 }))
  return {
    seed,
    start,
    r: (a) => 1 + harm.reduce((s, q) => s + q.amp * Math.sin(q.m * a + q.ph), 0),
    w: (a) => Math.max(0.035, 0.11 * (1 + wh.reduce((s, q) => s + q.amp * Math.sin(q.m * a + q.ph), 0))),
    tendrils,
    blots,
  }
}

/** A point on a ring's middle line at angle `a` (radians), centre (cx, cy), radius R: where a ball rides it. */
export function inkAt(ring: Ring, cx: number, cy: number, R: number, a: number): Pt {
  const r = R * ring.r(a)
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
}

export interface InkLook {
  /** Its colour; the fog's ink by default. */
  color?: string
  /** How much of each tendril is out, 0 to 1 (they come after the ring closes). */
  tendrils?: number
  /** Going: 0 whole, 1 gone (it spreads and pales into the fog). */
  fade?: number
  /** The breath of the ink as it settles: a slow spread, 0 to 1. */
  bloom?: number
}

/**
 * A logogram: ring `ring` at centre (cx, cy), radius R (cells), written `u` of the way (0 nothing, 1 whole). It forms
 * from `start` both ways round at once, the two fronts swelling as they go, and closes opposite where it began. Thick
 * and thin like a brush, bleeding a little at its edges, with blots pressed in and, once closed, strokes flung out.
 */
export function drawInk(p: p5, k: number, cx: number, cy: number, R: number, ring: Ring, u: number, o: InkLook = {}): void {
  const g = clamp01(u)
  if (g <= 0.001) return
  const ctx = ctxOf(p)
  const color = o.color ?? FOG.ink
  const fade = clamp01(o.fade ?? 0)
  const bloom = clamp01(o.bloom ?? 0)
  const X = cx * k
  const Y = cy * k
  const Rp = R * k * (1 + 0.04 * bloom + 0.25 * fade)
  const reach = Math.PI * g
  const n = Math.max(24, Math.ceil(120 * g))
  const band = (a0: number, a1: number, widen: number, alpha: number) => {
    const outer: Pt[] = []
    const inner: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n
      // The fronts swell a little as they come: fatter near the leading end while it is still forming.
      const lead = g < 1 ? Math.exp(-((Math.min(Math.abs(a - (ring.start + reach)), Math.abs(a - (ring.start - reach)))) ** 2) / 0.012) * 0.3 : 0
      const r = Rp * ring.r(a)
      const w = Rp * ring.w(a) * (1 + lead) * widen * (1 + 0.8 * fade)
      outer.push([X + Math.cos(a) * (r + w / 2), Y + Math.sin(a) * (r + w / 2)])
      inner.push([X + Math.cos(a) * (r - w / 2), Y + Math.sin(a) * (r - w / 2)])
    }
    ctx.beginPath()
    ctx.moveTo(outer[0][0], outer[0][1])
    for (const q of outer) ctx.lineTo(q[0], q[1])
    for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i][0], inner[i][1])
    ctx.closePath()
    ctx.fillStyle = rgba(color, alpha * (1 - fade))
    ctx.fill()
  }
  ctx.save()
  // The bleed, then the ink: both halves from the start.
  band(ring.start - reach, ring.start + reach, 1.9 + bloom * 0.6, 0.12)
  band(ring.start - reach, ring.start + reach, 1.35, 0.22)
  band(ring.start - reach, ring.start + reach, 1, 0.92)
  // The two fronts: round wet heads where the ink is still coming.
  if (g < 1) {
    for (const a of [ring.start + reach, ring.start - reach]) {
      const [hx, hy] = [X + Math.cos(a) * Rp * ring.r(a), Y + Math.sin(a) * Rp * ring.r(a)]
      const hr = Rp * ring.w(a) * 0.62
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr * 1.35)
      hg.addColorStop(0, rgba(color, 0.9 * (1 - fade)))
      hg.addColorStop(0.55, rgba(color, 0.45 * (1 - fade)))
      hg.addColorStop(1, rgba(color, 0))
      ctx.fillStyle = hg
      ctx.beginPath()
      ctx.arc(hx, hy, hr * 1.35, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Blots, where the ring has reached them.
  for (const b of ring.blots) {
    const d = Math.abs(((b.a - ring.start + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
    if (d > reach) continue
    const r = Rp * (ring.r(b.a) + b.out)
    const bx = X + Math.cos(b.a) * r
    const by = Y + Math.sin(b.a) * r
    const br = Rp * b.size * (0.6 + 0.4 * ease((reach - d) / 0.5)) * (1 + 0.3 * bloom)
    ctx.beginPath()
    ctx.ellipse(bx, by, br, br * 0.8, b.a, 0, Math.PI * 2)
    ctx.fillStyle = rgba(color, 0.9 * (1 - fade))
    ctx.fill()
  }
  // Tendrils, once it is closed.
  const tu = clamp01(o.tendrils ?? (g >= 1 ? 1 : 0))
  if (tu > 0) {
    for (const td of ring.tendrils) {
      const root = inkAt(ring, X, Y, Rp, td.a)
      const m = 18
      const len = Rp * td.len * ease(tu)
      const pts: Pt[] = []
      for (let i = 0; i <= m; i++) {
        const s = i / m
        const a = td.a + td.curl * s * s * 0.6
        pts.push([root[0] + Math.cos(a) * len * s + Math.cos(td.a) * Rp * ring.w(td.a) * 0.3, root[1] + Math.sin(a) * len * s + Math.sin(td.a) * Rp * ring.w(td.a) * 0.3])
      }
      // Drawn as a run of tapering segments.
      for (let i = 1; i <= m; i++) {
        const s = i / m
        ctx.beginPath()
        ctx.moveTo(pts[i - 1][0], pts[i - 1][1])
        ctx.lineTo(pts[i][0], pts[i][1])
        ctx.lineWidth = Math.max(0.6, Rp * td.w * (1 - s) ** 1.3)
        ctx.lineCap = 'round'
        ctx.strokeStyle = rgba(color, 0.88 * (1 - fade))
        ctx.stroke()
      }
      // A drop at the end of the longer ones.
      if (td.len > 0.35 && tu > 0.8) {
        const [ex, ey] = pts[m]
        ctx.beginPath()
        ctx.arc(ex, ey, Rp * 0.025 * (1 + bloom), 0, Math.PI * 2)
        ctx.fillStyle = rgba(color, 0.85 * (1 - fade))
        ctx.fill()
      }
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ screens */

/**
 * The twelve places a shell came down (the film's twelve), each as a screen shows it: 0 is Montana, and the rest go
 * round the world. The command tent's ring and the television both draw from this list.
 */
export const PLACES = ['montana', 'sea', 'desert', 'snow', 'city', 'jungle', 'savanna', 'hills', 'peaks', 'island', 'outback', 'steppe'] as const
export type Place = (typeof PLACES)[number]

const SCENE: Record<Place, { sky: string; far: string; ground: string; shade: string }> = {
  montana: { sky: '#C9CFCE', far: '#8E9B97', ground: '#6F8560', shade: '#56694B' },
  sea: { sky: '#BFC8CC', far: '#8FA2AA', ground: '#5F7680', shade: '#4B616A' },
  desert: { sky: '#D9D2C2', far: '#C8B48E', ground: '#C09D6A', shade: '#A5845A' },
  snow: { sky: '#D3D9DC', far: '#B9C3C8', ground: '#E7ECEE', shade: '#C9D2D6' },
  city: { sky: '#BCC2C6', far: '#7D878C', ground: '#6A7378', shade: '#545C61' },
  jungle: { sky: '#B9C3BD', far: '#5E7A62', ground: '#3F5A45', shade: '#314838' },
  savanna: { sky: '#D2CDBE', far: '#A9A27E', ground: '#9C9360', shade: '#807849' },
  hills: { sky: '#C4CACA', far: '#8FA17F', ground: '#6E8A5A', shade: '#587048' },
  peaks: { sky: '#C5CDD2', far: '#9AA3AA', ground: '#7C8288', shade: '#636A70' },
  island: { sky: '#C6D0D3', far: '#6E8C79', ground: '#6F8E9A', shade: '#57737E' },
  outback: { sky: '#D6CFC3', far: '#B78B63', ground: '#A76F47', shade: '#8C5B3A' },
  steppe: { sky: '#CBCFCB', far: '#A3A58E', ground: '#8F9574', shade: '#767C5E' },
}

/**
 * A place with a shell over it, as a screen shows it: sky, the land's line, the shell hanging over it. Drawn into the
 * rect (x, y, w, h) in cells, top-left corner. `t` is show time (the land's light breathes, the shell turns a hair).
 * `descend` 0..1 lowers the shell out of cloud (0 hidden in it, 1 at its height), for the news.
 */
export function drawShellScene(p: p5, k: number, x: number, y: number, w: number, h: number, place: Place, t = 0, descend = 1): void {
  const ctx = ctxOf(p)
  const c = SCENE[place]
  const X = x * k
  const Y = y * k
  const W = w * k
  const H = h * k
  ctx.save()
  ctx.beginPath()
  ctx.rect(X, Y, W, H)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, Y, 0, Y + H)
  sky.addColorStop(0, mix(c.sky, '#FFFFFF', 0.1))
  sky.addColorStop(1, c.sky)
  ctx.fillStyle = sky
  ctx.fillRect(X, Y, W, H)
  const hz = Y + H * 0.7
  const land = (yy: number, amp: number, col: string, f: number, s: number) => {
    ctx.beginPath()
    ctx.moveTo(X, Y + H)
    for (let i = 0; i <= 24; i++) {
      const u = i / 24
      const bump =
        place === 'city'
          ? (hash(Math.floor(u * 14), s, 3) > 0.35 ? -amp * (0.4 + hash(Math.floor(u * 14), s, 4)) : 0)
          : place === 'peaks'
            ? -amp * Math.abs(Math.sin(u * f * 3 + s)) * 1.6
            : -amp * (0.5 + 0.5 * Math.sin(u * f + s))
      ctx.lineTo(X + u * W, yy + bump)
      if (place === 'city' && i < 24) ctx.lineTo(X + (u + 1 / 24) * W, yy + bump)
    }
    ctx.lineTo(X + W, Y + H)
    ctx.closePath()
    ctx.fillStyle = col
    ctx.fill()
  }
  land(hz - H * 0.05, H * 0.08, c.far, 5, 1.3)
  if (place === 'sea' || place === 'island') {
    ctx.fillStyle = c.ground
    ctx.fillRect(X, hz, W, H)
    if (place === 'island') land(hz + H * 0.02, H * 0.06, c.far, 3, 0.2)
  } else land(hz + H * 0.04, H * 0.05, c.ground, 7, 2.1)
  // The shell: hanging over the land, coming down out of the top on the news.
  const spot = shellOnScreen(x, y, w, h, descend)
  const sh = spot.h
  const scy = spot.c[1]
  drawShell(p, k, spot.c[0], scy, sh, { light: 0.5, mist: place === 'snow' || place === 'sea' ? 0.3 : 0.15, mistColor: c.sky })
  if (descend < 1) {
    // The cloud it comes out of: the top of the screen soft white.
    const cl = ctx.createLinearGradient(0, Y, 0, Y + H * 0.35)
    cl.addColorStop(0, rgba('#F1F3F0', 0.95))
    cl.addColorStop(1, rgba('#F1F3F0', 0))
    ctx.fillStyle = cl
    ctx.fillRect(X, Y, W, H * 0.35)
  }
  void t
  ctx.restore()
}

/**
 * Where `drawShellScene` puts the shell in a screen's rect (x, y, w, h, cells, top-left), lowered out of the cloud by
 * `descend`: its centre and its height. What anything that must line up with the picture on a screen reads.
 */
export function shellOnScreen(x: number, y: number, w: number, h: number, descend = 1): { c: Pt; h: number } {
  // The news picks it up already out of the cloud: its whole descent on a screen is a quarter of the picture, so at
  // any moment most of it is in the picture, under the cloud at the top.
  return { c: [x + w * 0.56, y + h * 0.36 - (1 - descend) * h * 0.25], h: h * 0.46 }
}

export interface ScreenLook {
  /** 0 off (dark glass), 1 on. Between, it flickers up or dies down. */
  on?: number
  place?: Place
  t?: number
  /** For the news: the shell coming down (see drawShellScene). */
  descend?: number
  /** The bezel's colour. */
  bezel?: string
  /** How much it glows onto what is round it, 0 to 1. Default 0.5. */
  glow?: number
}

/**
 * A screen, its glass (x, y, w, h) in cells, top-left: a thin dark bezel, and on it a place with a shell (on), or
 * dark glass with the room's light faint in it (off). When on, it casts a soft cool light round itself.
 */
export function drawScreen(p: p5, k: number, x: number, y: number, w: number, h: number, o: ScreenLook = {}): void {
  const ctx = ctxOf(p)
  const on = clamp01(o.on ?? 1)
  const X = x * k
  const Y = y * k
  const W = w * k
  const H = h * k
  const b = Math.max(1.5, Math.min(W, H) * 0.045)
  ctx.save()
  if (on > 0.01 && (o.glow ?? 0.5) > 0) {
    const cx = X + W / 2
    const cy = Y + H / 2
    const r = Math.max(W, H) * 1.1
    const g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, r)
    g.addColorStop(0, rgba(TENT.screenGlow, 0.22 * on * (o.glow ?? 0.5) * 2))
    g.addColorStop(1, rgba(TENT.screenGlow, 0))
    ctx.fillStyle = g
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  }
  ctx.fillStyle = o.bezel ?? TENT.cable
  ctx.fillRect(X - b, Y - b, W + 2 * b, H + 2 * b)
  ctx.fillStyle = TENT.screenOff
  ctx.fillRect(X, Y, W, H)
  if (on > 0.01) {
    ctx.globalAlpha *= on
    drawShellScene(p, k, x, y, w, h, o.place ?? 'montana', o.t ?? 0, o.descend ?? 1)
    // The glass: a cool cast over the picture and a faint sheen across its top.
    ctx.fillStyle = rgba(TENT.screenOn, 0.12)
    ctx.fillRect(X, Y, W, H)
    ctx.globalAlpha /= on
  }
  const sheen = ctx.createLinearGradient(X, Y, X + W * 0.6, Y + H)
  sheen.addColorStop(0, rgba('#FFFFFF', 0.08))
  sheen.addColorStop(0.5, rgba('#FFFFFF', 0))
  ctx.fillStyle = sheen
  ctx.fillRect(X, Y, W, H)
  ctx.restore()
}
