import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { LAST2, ROLL } from '../music'
import type { Pen } from '../troll'
import { SKY, STONE } from '../worlds'

/**
 * The finale's water: the geyser the broken heart lets loose up the chimney. A column of it, the cup of foam it makes
 * where it holds Peer up (the ball dancing on a fountain), and, out of the summit, its burst. Drawn in the caller's
 * frame, cells; y down. Flat fills and alpha, from the palette's wet stone and starlight; the dawn lights its east side.
 *
 * The water keeps its own clock inside the calls (T is show time), so the caller only says where the column stands:
 * - through the silence it lets go of him (`below`): the last hammer blow throws him on up the vent, the water falls
 *   back away under him, and on the roll a fresh jet comes up the dark vent and slams into him;
 * - after the second of the last two chords it bursts out of the summit past the top of the frame (`burst`), falls
 *   back, and is gone before the credits (151.8).
 */

/** The column's body: the wet stone's blue, deeper, so the froth on it reads. */
const BODY = mixHex(STONE.wet, STONE.deep, 0.32)
const FOAM = mixHex(STONE.wet, SKY.star, 0.65)
const WHITE = mixHex(STONE.wet, SKY.star, 0.85)
const frac = (v: number) => v - Math.floor(v)

/* ------------------------------------------------------------------ the water's own clock */

/** When the water stops carrying him (a beat after the last hammer blow's throw), and how hard it then falls back. */
const LET_GO = 146.85
const SAG = 14
/** How fast the roll's fresh jet comes up the vent (cells/s): it reaches him on the roll. */
const JET = 24

/** How far below where the caller puts the column's top the water really is: 0 while it carries him. */
function below(T: number): number {
  if (T <= LET_GO || T >= ROLL) return 0
  return Math.min(0.5 * SAG * (T - LET_GO) * (T - LET_GO), JET * (ROLL - T))
}

/** After the last chord (u = T - LAST2): how far the burst's jet climbs over the caller's top (then falls back), how open its head is, and how much of it is left. */
function burst(u: number): { up: number; open: number; left: number } {
  const s = Math.min(1, Math.max(0, u / 0.65))
  const up = 3 * (1 - (1 - s) * (1 - s) * (1 - s)) - 14 * Math.max(0, u - 0.7) ** 2
  return { up, open: smooth(u, 0, 0.45), left: 1 - smooth(u, 1.15, 1.9) }
}

/* ------------------------------------------------------------------ the column */

/** Half the column's width at `d` cells under its top, `f` cells over its foot: widest under him, tapering below, a pipe's width at the foot. */
function profile(d: number, f: number, force: number, open: number): number {
  // Out in the open it spreads as it climbs, into a head of spray well wider than the jet out of the crater.
  const top = 0.4 + 1.0 * open
  const core = 0.24 + 0.1 * open
  const body = core + (top - core) * Math.exp(-d / (2.5 + 4 * open))
  return body * (0.95 + 0.15 * force) * (0.5 + 0.5 * smooth(f, 0, 1.4))
}

/** A ragged edge: the swellings run up the column (y falls as T grows), each side on its own phase. */
function rag(y: number, T: number, s: number): number {
  return 0.13 * Math.sin(y * 2.1 + T * 19 + s) + 0.08 * Math.sin(y * 4.9 + T * 34 + 2.3 * s) + 0.05 * Math.sin(y * 9.7 + T * 47 + 3.1 * s)
}

interface Row {
  y: number
  l: number
  r: number
  d: number
  hw: number
}

/**
 * The column: from (x, yBase) up to yTop (yTop < yBase), pulsing upward (its swellings travel up it), `force` 0..1 how
 * hard it is pushing, `sun` 0..1 the dawn on its east (+x) side. `wide` widens it.
 *
 * About three of him wide under him and foaming, narrowing and breaking into surges further down, a pipe's width
 * where it leaves the collar. When its top is loose (falling back through the silence, the roll's jet coming up, the
 * burst out of the summit), the top is a ragged head of froth with spray over it, not a flat end.
 */
export function column(p: p5, c: Pen, x: number, yBase: number, yTop0: number, T: number, force: number, sun = 0, wide = 1): void {
  const k = c.k
  let yTop = yTop0 + below(T)
  let open = 0
  let a = 1
  if (T >= LAST2) {
    const b = burst(T - LAST2)
    yTop = yTop0 - b.up
    open = b.open * b.left
    a = b.left
  }
  if (a <= 0.005) return
  const len = yBase - yTop
  if (len <= 0.02) return
  // Loose: the top is not pushing anything (he is away above it, or it is out in the open on its own).
  const loose = Math.max(smooth(below(T), 0.03, 0.4), T >= LAST2 ? 1 : 0)
  // 0..1 how much a loose head is falling back (1) rather than driving up (0).
  const falling = T >= LAST2 ? smooth(T - LAST2, 0.6, 1.0) : T > LET_GO && T < ROLL && 0.5 * SAG * (T - LET_GO) ** 2 < JET * (ROLL - T) ? 1 : 0
  const n = Math.max(10, Math.min(420, Math.ceil(len * 12)))
  const rows: Row[] = []
  for (let i = 0; i <= n; i++) {
    const y = yBase - (len * i) / n
    const d = y - yTop
    const f = yBase - y
    // Below him it breaks into surges: necks between them running up it.
    const neck = 1 - 0.32 * smooth(d, 1.2, 5) * Math.pow(0.5 + 0.5 * Math.sin(y * 1.15 + T * 10), 3)
    // The very top: under him the crown covers it; loose, it rounds off into a head.
    const held = 0.55 + 0.45 * Math.sqrt(smooth(d, 0, 0.3))
    const dome = 0.32 + 0.8 * open
    const free = d < dome ? Math.sqrt(1 - (1 - d / dome) ** 2) : 1
    const tip = held * (1 - loose) + free * loose
    const hw = profile(d, f, force, open) * wide * neck * tip
    const amp = 0.7 + 0.9 * smooth(d, 0.4, 4) + 0.9 * loose * Math.exp(-d / (0.3 + open))
    const wob = 0.02 * Math.sin(y * 1.3 + T * 6)
    rows.push({ y, l: x + wob - hw * (1 + amp * rag(y, T, 0)), r: x + wob + hw * (1 + amp * rag(y, T, 1.7)), d, hw })
  }
  const band = (from: (w: Row) => number, to: (w: Row) => number) => {
    p.beginShape()
    for (const w of rows) p.vertex(from(w) * k, w.y * k)
    for (let i = rows.length - 1; i >= 0; i--) p.vertex(to(rows[i]) * k, rows[i].y * k)
    p.endShape(p.CLOSE)
  }
  // A head falling back comes apart: every layer of it fades out toward the top over `melt` cells (a raw canvas
  // gradient; the kit keeps p5's fill honest after it).
  const melt = falling * loose * (0.7 + 1.8 * open)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const paint = (col: string, v: number) => {
    const fill = alpha(p, col, v)
    p.fill(fill)
    if (melt < 0.02) return
    const rgb = `${p.red(fill)},${p.green(fill)},${p.blue(fill)}`
    const g = ctx.createLinearGradient(0, (yTop - 0.3) * k, 0, (yTop + melt) * k)
    g.addColorStop(0, `rgba(${rgb},0)`)
    g.addColorStop(0.55, `rgba(${rgb},${0.3 * v})`)
    g.addColorStop(1, `rgba(${rgb},${v})`)
    ctx.fillStyle = g
  }
  p.push()
  p.noStroke()
  // A thin mist of spray round it.
  paint(FOAM, 0.1 * a)
  band(
    (w) => w.l - 0.04 - 0.08 * w.hw * (1 + Math.sin(w.y * 3.3 + T * 25)),
    (w) => w.r + 0.04 + 0.08 * w.hw * (1 + Math.sin(w.y * 3.7 + T * 22 + 1)),
  )
  // The body; out in the open its spreading head is spray, and thinner.
  paint(BODY, 0.8 * a * (1 - 0.45 * open))
  band((w) => w.l, (w) => w.r)
  // Froth along both edges, the band's inner side as ragged as the outer.
  paint(FOAM, 0.62 * a)
  band((w) => w.l, (w) => w.l + (w.r - w.l) * (0.16 + 0.1 * Math.sin(w.y * 3.1 + T * 27)))
  band((w) => w.r - (w.r - w.l) * (0.14 + 0.1 * Math.sin(w.y * 2.7 + T * 23 + 2)), (w) => w.r)
  // The white core, west of the middle, pinching and swelling as the surges run up it.
  paint(WHITE, 0.7 * a)
  band(
    (w) => w.l + (w.r - w.l) * 0.3,
    (w) => w.l + (w.r - w.l) * (0.3 + 0.2 * (0.25 + 0.75 * Math.abs(Math.sin(w.y * 1.7 + T * 13)))),
  )
  // Under him, and at a loose head, it is all froth.
  paint(WHITE, 0.55 * a)
  const froth = (w: Row) => 0.5 * (1 - Math.exp(-w.d / (0.5 + 0.4 * loose)))
  band((w) => w.l + (w.r - w.l) * froth(w), (w) => w.r - (w.r - w.l) * froth(w))
  if (sun > 0.02) {
    paint(SKY.sun, 0.5 * sun * a)
    band((w) => w.l + (w.r - w.l) * 0.7, (w) => w.r)
  }
  // Spray torn off its sides, carried up with it and thrown out: small drops of different sizes, never beads.
  const step = 0.26
  const phase = (T * 7) / step
  const j0 = Math.ceil(yTop / step + phase)
  const j1 = Math.floor(yBase / step + phase)
  for (let j = j0; j <= j1; j++) {
    const y = (j - phase) * step + step * 0.8 * (hash(j, 71) - 0.5)
    const row = rows[Math.max(0, Math.min(rows.length - 1, Math.round(((yBase - y) / len) * n)))]
    const s = hash(j, 72) < 0.5 ? -1 : 1
    const age = frac(hash(j, 73) + T * 1.6)
    const edge = s < 0 ? row.l : row.r
    const dx = edge + s * (0.02 + 0.3 * age * (0.5 + hash(j, 74)))
    const dy = y + 0.25 * age * age
    const sz = 0.5 + 0.7 * hash(j, 75)
    p.fill(alpha(p, s > 0 && sun > 0.02 ? mixHex(FOAM, SKY.sun, 0.5 * sun) : FOAM, 0.7 * a * (1 - age)))
    p.ellipse(dx * k, dy * k, 0.028 * sz * k, 0.06 * sz * k)
  }
  // A loose head: tongues of froth round its dome, reaching up while it drives and hanging out and down as it falls
  // back; drops thrown up off it, falling back into it.
  if (loose > 0.02) {
    const dome = 0.32 + 0.8 * open
    const hw = profile(0.2, len, force, open) * wide
    for (let i = 0; i < 9; i++) {
      const v = (i + 0.3 + 0.4 * hash(i, 79)) / 9
      const th = (v - 0.5) * Math.PI * 0.95
      const rx = x + hw * Math.sin(th)
      const ry = yTop + dome * (1 - Math.cos(th))
      const out = th + Math.sign(th || 1) * falling * (0.5 + 1.1 * Math.abs(Math.sin(th)))
      const lick = 0.65 + 0.35 * Math.sin(T * (8 + 4 * hash(i, 80)) + i * 1.7)
      const L = (0.1 + 0.3 * open + 0.25 * falling) * (0.6 + 0.6 * hash(i, 81)) * lick
      const half = (0.04 + 0.05 * open) * (0.7 + 0.6 * hash(i, 82))
      const ux = Math.sin(out)
      const uy = -Math.cos(out)
      paint(i % 3 ? FOAM : WHITE, 0.7 * loose * a)
      p.beginShape()
      p.vertex((rx - uy * half) * k, (ry + ux * half) * k)
      p.quadraticVertex((rx - uy * half * 0.5 + ux * L * 0.55) * k, (ry + ux * half * 0.5 + uy * L * 0.55) * k, (rx + ux * L) * k, (ry + uy * L) * k)
      p.quadraticVertex((rx + uy * half * 0.5 + ux * L * 0.55) * k, (ry - ux * half * 0.5 + uy * L * 0.55) * k, (rx + uy * half) * k, (ry - ux * half) * k)
      p.endShape(p.CLOSE)
    }
    for (let i = 0; i < 9; i++) {
      const age = frac(T * 1.9 + i / 9 + 0.3 * hash(i, 76))
      const s = hash(i, 77) - 0.5
      const vy = 1.1 + 0.9 * hash(i, 78) + 2 * open
      const dx = x + s * hw * 1.6 + s * (0.3 + open) * age
      const dy = yTop + 0.05 - vy * age + vy * age * age
      p.fill(alpha(p, FOAM, 0.75 * loose * a * (1 - age)))
      p.ellipse(dx * k, dy * k, 0.03 * k, 0.065 * k)
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the crown */

/** Drops thrown off the cup's lip at (x, y) to side s: each arcs out and falls back past the column, and is gone. */
function flicks(p: p5, k: number, x: number, y: number, s: number, T: number, n: number, reach: number, a: number, col: string): void {
  for (let i = 0; i < n; i++) {
    const u = frac(T * 1.7 + i / n + (s > 0 ? 0.37 : 0) + 0.21 * hash(i, 83))
    const tau = u * 0.62
    const vx = s * (0.45 + 0.5 * hash(i, 84)) * reach
    const vy = -(0.9 + 0.7 * hash(i, 85)) * reach
    const dx = x + vx * tau
    const dy = y + vy * tau + 3.6 * tau * tau
    const sz = 0.6 + 0.8 * hash(i, 88)
    p.fill(alpha(p, col, a * (1 - u * u)))
    p.ellipse(dx * k, dy * k, 0.026 * sz * k, 0.055 * sz * k)
  }
}

/**
 * The cup of foam the column makes where it holds Peer up: froth wrapped round the ball's underside and a good way
 * wider than he is, its lip a ring of tongues of spray leaning out and up round him, drops thrown off it falling back
 * down the column's sides. (bx, by) is the ball's centre; the stage draws the ball over it. `press` 0..1: he is rammed
 * against a ceiling, and the water runs out flat along its underside and drips. `spit` 0..1: he sits in the pipe's
 * mouth, stopping it, and only a little spits out round him. Through the silence, as the water falls away under him,
 * the cup goes with it.
 */
export function crown(p: p5, c: Pen, bx: number, by: number, T: number, force: number, press = 0, sun = 0, spit = 0): void {
  const k = c.k
  p.push()
  p.noStroke()
  if (spit > 0) {
    for (const s of [-1, 1]) flicks(p, k, bx + s * 0.11, by + 0.1, s, T, 3, 0.5 * spit, 0.8 * spit, FOAM)
    p.pop()
    return
  }
  const held = 1 - smooth(below(T), 0.03, 0.4)
  if (held <= 0.01) {
    p.pop()
    return
  }
  const w = 0.36 + 0.07 * force
  const rim = by - 0.01 + 0.012 * Math.sin(T * 11)
  const depth = 0.24 + 0.06 * force
  const warm = mixHex(FOAM, SKY.sun, 0.35 * sun)
  // The cup: a bowl of froth under him, its underside running into the column.
  p.fill(alpha(p, FOAM, 0.78 * held))
  p.beginShape()
  p.vertex((bx - w) * k, rim * k)
  p.bezierVertex((bx - w * 0.95) * k, (by + depth * 0.7) * k, (bx - w * 0.5) * k, (by + depth + 0.06) * k, bx * k, (by + depth + 0.08) * k)
  p.bezierVertex((bx + w * 0.5) * k, (by + depth + 0.06) * k, (bx + w * 0.95) * k, (by + depth * 0.7) * k, (bx + w) * k, rim * k)
  p.bezierVertex((bx + w * 0.55) * k, (rim + 0.07) * k, (bx - w * 0.55) * k, (rim + 0.07) * k, (bx - w) * k, rim * k)
  p.endShape(p.CLOSE)
  // Its lip: tongues of spray of different heights, leaning out and up round him, each licking up on its own clock.
  // Pressed flat under a ceiling they lie down.
  const tall = (1 - 0.7 * press) * (0.75 + 0.5 * force)
  for (let i = 0; i < 7; i++) {
    const v = (i + 0.5) / 7
    const s = v < 0.5 ? -1 : 1
    const e = Math.abs(v - 0.5) * 2
    const root = bx + (v - 0.5) * 2 * w * 0.95
    const lick = 0.6 + 0.4 * Math.sin(T * (9 + 4 * hash(i, 89)) + i * 2.1)
    const h = (0.08 + 0.16 * e * e + 0.05 * hash(i, 90)) * lick * tall
    const lean = s * (0.05 + 0.12 * e)
    const half = 0.03 + 0.025 * hash(i, 91)
    const baseY = rim + 0.04 - 0.02 * e
    p.fill(alpha(p, i % 2 ? warm : WHITE, (0.7 + 0.2 * e) * held))
    p.beginShape()
    p.vertex((root - half) * k, baseY * k)
    p.quadraticVertex((root - half * 0.4 + lean * 0.4) * k, (baseY - h * 0.6) * k, (root + lean) * k, (baseY - h) * k)
    p.quadraticVertex((root + half * 0.4 + lean * 0.4) * k, (baseY - h * 0.6) * k, (root + half) * k, baseY * k)
    p.endShape(p.CLOSE)
  }
  for (const s of [-1, 1]) flicks(p, k, bx + s * w * 0.9, rim, s, T, 4 + Math.round(3 * force), 0.7 + 0.5 * force, 0.8 * held * (1 - 0.6 * press), warm)
  // Rammed against a ceiling: the water has nowhere to go but out, and sprays sideways along its underside in fine
  // drops that fall away.
  if (press > 0.02) {
    const ceil = by - 0.13
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const u = frac(T * 3.1 + i / 6 + (s > 0 ? 0.5 : 0) + 0.3 * hash(i, 86))
        const dx = bx + s * (0.2 + 0.8 * u * (0.7 + 0.3 * hash(i, 87)))
        const dy = ceil + 0.04 + 0.03 * (i % 2) + 0.9 * Math.max(0, u - 0.35) * Math.max(0, u - 0.35)
        p.fill(alpha(p, FOAM, 0.75 * press * held * (1 - u)))
        p.ellipse(dx * k, dy * k, 0.05 * k, 0.022 * k)
      }
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the burst */

type Pt2 = [number, number]

/**
 * Out of the summit on the second of the last two chords: the jet (drawn by `column`) climbs past the top of the
 * frame and bursts, throwing spray up and out in streaks that arc over and fall back to the flanks (to `ground(x)` of
 * the caller's frame); then it all falls back and is gone by the credits. (x, yBase) is the crater; `yTop` the
 * caller's top for the column (the burst climbs over it); `sun` the dawn on its east side. The caller's own
 * envelope (`_h`) is replaced by the burst's clock.
 */
export function plume(p: p5, c: Pen, x: number, yBase: number, yTop: number, T: number, sun: number, ground: (x: number) => number): void {
  const u = T - LAST2
  if (u < 0 || yBase - yTop < 0.05) return
  const { left } = burst(u)
  if (left <= 0.005) return
  const k = c.k
  // Where the jet's top was when each streak left it (the caller's top moves little over the burst).
  const topAt = (v: number) => yTop - burst(v).up
  p.push()
  p.noStroke()
  // Streaks peel off the jet's upper part (most near its top), thrown up and out to both sides, and arc over.
  const N = 90
  for (let i = 0; i < N; i++) {
    const t0 = 0.95 * Math.pow((i + hash(i, 60)) / N, 1.3)
    const tau = u - t0
    if (tau <= 0) continue
    const s = hash(i, 61) < 0.5 ? -1 : 1
    const along = Math.pow(hash(i, 67), 1.6)
    const top0 = topAt(t0)
    const y0 = top0 + along * 0.45 * Math.max(0, yBase - top0)
    const x0 = x + s * profile(y0 - top0, 9, 0.6, smooth(t0, 0, 0.45)) * (0.7 + 0.3 * hash(i, 68))
    const vx = s * (1.2 + 2.8 * hash(i, 62))
    const vy = -(1.5 + 5 * hash(i, 63)) * (1 - 0.35 * along)
    const g = 8
    const at = (q: number): Pt2 => [x0 + vx * q, y0 + vy * q + 0.5 * g * q * q]
    const head = at(tau)
    if (head[1] > ground(head[0])) continue
    const tail = at(Math.max(0, tau - 0.08 - 0.05 * hash(i, 64)))
    const fade = left * (1 - smooth(tau, 0.9, 1.5))
    if (fade <= 0.01) continue
    // Each a streak drawn out along its flight, a few of them heavier gouts.
    const soft = i % 5 === 0
    const wd = (soft ? 0.07 + 0.03 * Math.min(1, tau / 0.7) : 0.03 + 0.035 * hash(i, 65)) * (0.7 + 0.6 * hash(i, 69))
    const dx = head[0] - tail[0]
    const dy = head[1] - tail[1]
    const m = Math.hypot(dx, dy)
    const col = mixHex(soft ? FOAM : WHITE, SKY.sun, (s > 0 ? 0.55 : 0.15) * sun)
    p.fill(alpha(p, col, (soft ? 0.4 : 0.55 + 0.3 * hash(i, 66)) * fade))
    p.push()
    p.translate(((head[0] + tail[0]) / 2) * k, ((head[1] + tail[1]) / 2) * k)
    p.rotate(Math.atan2(dy, dx))
    p.ellipse(0, 0, (m + wd) * k, wd * k)
    p.pop()
  }
  p.pop()
}

