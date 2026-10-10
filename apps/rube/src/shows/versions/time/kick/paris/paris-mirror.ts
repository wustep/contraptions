import { mixHex, type Pt } from '../../../../../parts'
import { bloom, rgba } from '../cast'
import { frame, hash } from '../kit'
import { PARIS } from '../worlds'
import {
  ARI_TOUCH_A,
  B_HOME,
  DEEP,
  H,
  LAST_SHARD,
  MIRROR,
  MIRROR_A,
  MIRROR_B,
  SHARDS,
  SHATTER,
  theta,
  tip,
  VANISH,
  Y_S,
} from './paris-geo'
import { ctxOf, fillPaths, rect, strokePaths, type Pen } from './paris-pen'

/**
 * The mirrors (the PARIS builder's). Under the viaduct, hinged on one of its columns, a great door of glass in an iron
 * frame, standing edge on. Ariadne swings it (bar 13) to face us behind him, and it comes onto its stop: one honest
 * reflection of him. Then she shuts the near one, which is where we are: its iron frame comes round the picture, and
 * the glass behind him opens into a corridor, frame within frame, each of him smaller and paler, to nowhere. On bar 14
 * she touches it and it shatters: shards turning in the sun, down onto the deck, the last off the top of the frame on
 * the bar's third attack; the near frame swings away, and the bridge is only the bridge.
 */

type Frame = { x0: number; y0: number; x1: number; y1: number }

const X0 = H + MIRROR.s0
const X1 = H + MIRROR.s1
const TOP = Y_S - MIRROR.top
const BOT = Y_S - 0.04
const RIM = 0.13
const GLASS: [Pt, Pt] = [[X0 + RIM, TOP + RIM], [X1 - RIM, BOT - RIM * 0.6]]
const IRON_LIT = mixHex(PARIS.iron, PARIS.zinc, 0.35)
const SILVER = mixHex(PARIS.mirror, PARIS.sky, 0.35)

/** How far the great mirror has swung round (0 edge on, 1 facing us), coming onto its stop with a little bounce. */
function swing(t: number): number {
  if (t <= MIRROR_B) return 0
  if (t < B_HOME) {
    const u = (t - MIRROR_B) / (B_HOME - MIRROR_B)
    return 0.25 * u + 0.75 * u * u
  }
  const u = t - B_HOME
  return 1 - 0.05 * Math.exp(-u / 0.12) * Math.abs(Math.sin((Math.PI * u) / 0.12))
}

/** How far the near mirror (ours) has shut round the picture: 0 open, 1 shut; it swings away as the glass goes. */
export function nearShut(t: number): number {
  if (t <= ARI_TOUCH_A) return 0
  if (t < MIRROR_A) {
    const u = (t - ARI_TOUCH_A) / (MIRROR_A - ARI_TOUCH_A)
    return 0.3 * u + 0.7 * u * u
  }
  if (t < SHATTER) return 1 - 0.03 * Math.exp(-(t - MIRROR_A) / 0.1) * Math.abs(Math.sin(((t - MIRROR_A) * Math.PI) / 0.1))
  const u = (t - SHATTER - 0.1) / 0.9
  if (u <= 0) return 1
  if (u >= 1) return 0
  return 1 - u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ the shards */

interface Shard {
  poly: Pt[]
  c: Pt
  v: Pt
  spin: number
  /** When it lets go of the frame, and when it lands on the deck. */
  go: number
  land: number
  big: boolean
}

function clip(poly: Pt[], x0: number, y0: number, x1: number, y1: number): Pt[] {
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ]
  let out = poly
  for (const [inside, cut] of edges) {
    const src = out
    out = []
    for (let i = 0; i < src.length; i++) {
      const a = src[i]
      const b = src[(i + 1) % src.length]
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b))
        out.push(b)
      } else if (inside(a)) out.push(cut(a, b))
    }
    if (!out.length) return out
  }
  return out
}

/** Where she touched it: the cracks run out from there, and rings of them round it. */
const TOUCH: Pt = [X0 + RIM + 0.14, Y_S - 0.62]
const SHARD_LIST: Shard[] = (() => {
  const out: Shard[] = []
  const rays = 11
  const rings = [0, 0.32, 0.75, 1.3, 1.95, 2.7, 3.6]
  const angles: number[] = []
  for (let i = 0; i < rays; i++) angles.push(-Math.PI * 0.95 + (i / rays) * Math.PI * 2 + (hash(i, 201) - 0.5) * 0.35)
  const [[gx0, gy0], [gx1, gy1]] = GLASS
  for (let j = 0; j + 1 < rings.length; j++) {
    for (let i = 0; i < rays; i++) {
      const a0 = angles[i]
      const a1 = i + 1 < rays ? angles[i + 1] : angles[0] + Math.PI * 2
      const r0 = rings[j] * (0.9 + 0.2 * hash(i, j + 210))
      const r1 = rings[j + 1] * (0.9 + 0.2 * hash(i + 1, j + 211))
      const P = (a: number, r: number): Pt => [TOUCH[0] + Math.cos(a) * r, TOUCH[1] + Math.sin(a) * r]
      const poly = clip([P(a0, r0), P((a0 + a1) / 2, (r0 + r1) / 2 * 0.98), P(a0, r1), P((a0 + a1) / 2, r1 * 1.02), P(a1, r1), P(a1, r0)], gx0, gy0, gx1, gy1)
      if (poly.length < 3) continue
      let cx = 0
      let cy = 0
      for (const [x, y] of poly) {
        cx += x
        cy += y
      }
      cx /= poly.length
      cy /= poly.length
      let area = 0
      for (let q = 0; q < poly.length; q++) {
        const a = poly[q]
        const b = poly[(q + 1) % poly.length]
        area += a[0] * b[1] - b[0] * a[1]
      }
      area = Math.abs(area) / 2
      if (area < 0.004) continue
      const k = out.length
      const dx = cx - TOUCH[0]
      const dy = cy - TOUCH[1]
      const d = Math.hypot(dx, dy) || 1
      const push = 0.35 + 0.9 * hash(k, 221)
      const bottom = Math.max(...poly.map((p) => p[1]))
      // Most go at once and fall; it takes them about as long as falling from where they were (a real fall, G).
      const h = BOT - bottom
      const land = SHATTER + Math.sqrt((2 * Math.max(0.05, h)) / 12) * (0.92 + 0.16 * hash(k, 222))
      out.push({ poly: poly.map(([x, y]) => [x - cx, y - cy] as Pt), c: [cx, cy], v: [(dx / d) * push, (dy / d) * push * 0.4 - 0.2], spin: (hash(k, 223) - 0.5) * 9, go: SHATTER, land, big: area > 0.12 })
    }
  }
  // The strikes: the big ones low in the glass come down together on the bar's second attack; the biggest high one
  // hangs in the frame a moment, and comes down on the third.
  const bigLow = out.filter((s) => s.big && s.c[1] > TOP + 1.2).sort((a, b) => b.c[1] - a.c[1]).slice(0, 4)
  for (const s of bigLow) s.land = SHARDS
  const high = out.filter((s) => s.c[1] < TOP + 0.9).sort((a, b) => polyArea(b.poly) - polyArea(a.poly))[0]
  if (high) {
    const h = BOT - (high.c[1] + Math.max(...high.poly.map((p) => p[1])))
    high.land = LAST_SHARD
    high.go = LAST_SHARD - Math.sqrt((2 * h) / 12)
    high.v = [0.1, 0]
    high.spin = 1.8
  }
  return out
})()
function polyArea(poly: Pt[]): number {
  let area = 0
  for (let q = 0; q < poly.length; q++) {
    const a = poly[q]
    const b = poly[(q + 1) % poly.length]
    area += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(area) / 2
}

/** A shard's place and turn at `t`: in the frame, falling (a fall timed to land when it lands), or lying on the deck. */
function shardAt(s: Shard, t: number): { c: Pt; a: number; lying: boolean } {
  if (t <= s.go) return { c: s.c, a: 0, lying: false }
  const T = s.land - s.go
  const bottom = Math.max(...s.poly.map((p) => p[1]))
  const drop = BOT - (s.c[1] + bottom)
  // A throw that lands on time: its start's lift is whatever makes it.
  const vy = (drop - 6 * T * T) / T
  const u = Math.min(t, s.land) - s.go
  const c: Pt = [s.c[0] + s.v[0] * u, s.c[1] + vy * u + 6 * u * u]
  const a = s.spin * u
  if (t <= s.land) return { c, a, lying: false }
  // On the deck: a skid, and still.
  const w = t - s.land
  const skid = 0.12 * s.v[0] * (1 - Math.exp(-w / 0.18))
  return { c: [c[0] + skid, c[1]], a: a + 0.3 * s.spin * 0.05 * (1 - Math.exp(-w / 0.18)), lying: true }
}

/* ------------------------------------------------------------------ the corridor */

/** The glass: the sky's light across it, and, once both are shut, frame within frame to nowhere. */
function glass(pen: Pen, t: number, w: number): void {
  const [[gx0, gy0], [gx1, gy1]] = GLASS
  const x1 = gx0 + (gx1 - gx0) * w
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.rect(gx0 * k, gy0 * k, (x1 - gx0) * k, (gy1 - gy0) * k)
  ctx.clip()
  const g = ctx.createLinearGradient(0, gy0 * k, 0, gy1 * k)
  g.addColorStop(0, rgba(SILVER, 1))
  g.addColorStop(0.6, rgba(PARIS.mirror, 1))
  g.addColorStop(1, rgba(mixHex(PARIS.mirror, PARIS.stoneShade, 0.3), 1))
  ctx.fillStyle = g
  ctx.fillRect(gx0 * k, gy0 * k, (x1 - gx0) * k, (gy1 - gy0) * k)
  if (w > 0.99 && t >= MIRROR_A && t < SHATTER) {
    // Frame within frame: ours and this one, turn and turn about, each nearer the vanishing point, paler.
    const V = VANISH
    const u = t - MIRROR_A
    const open = 1 - Math.exp(-u / 0.12)
    for (let m = DEEP; m >= 1; m--) {
      const s = 1 / (1 + 0.46 * (m - 0.5))
      const fade = 1 - Math.pow(0.83, m)
      const P = (x: number, y: number): Pt => [V[0] + (x - V[0]) * s, V[1] + (y - V[1]) * s]
      const a = P(gx0 - 0.1, gy0 - 0.1)
      const b = P(gx1 + 0.1, gy1 + 0.3)
      const iron = mixHex(PARIS.iron, PARIS.mirror, 0.25 + 0.7 * fade)
      // The floor of the bridge at this depth, and the sky over it.
      const floorY = V[1] + (Y_S - V[1]) * s
      ctx.fillStyle = rgba(mixHex(PARIS.cobble, PARIS.mirror, 0.3 + 0.65 * fade), open)
      ctx.fillRect(a[0] * k, floorY * k, (b[0] - a[0]) * k, (b[1] - floorY) * k)
      // The columns either side of it, reflected.
      ctx.fillStyle = rgba(iron, open * 0.8)
      const cw = 0.12 * s
      ctx.fillRect((a[0] - cw * 1.5) * k, a[1] * k, cw * k, (floorY - a[1]) * k)
      ctx.fillRect((b[0] + cw * 0.5) * k, a[1] * k, cw * k, (floorY - a[1]) * k)
      // The frame.
      ctx.strokeStyle = rgba(iron, open)
      ctx.lineWidth = Math.max(0.6, RIM * s * k * 0.9)
      ctx.strokeRect(a[0] * k, a[1] * k, (b[0] - a[0]) * k, (b[1] - a[1]) * k)
    }
    // Where it goes to: a faint light.
    bloom(pen.p, k, V, 0.35, PARIS.mirror, 0.5 * open)
  }
  // The sheen: two soft bands of light across the glass.
  for (const [o, wd, a] of [[0.25, 0.35, 0.28], [0.62, 0.14, 0.22]] as const) {
    const sx = gx0 + (gx1 - gx0) * o
    const gg = ctx.createLinearGradient((sx - wd) * k, 0, (sx + wd) * k, 0)
    gg.addColorStop(0, rgba(PARIS.mirror, 0))
    gg.addColorStop(0.5, rgba('#FFFFFF', a))
    gg.addColorStop(1, rgba(PARIS.mirror, 0))
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.moveTo((sx - wd + 0.5) * k, gy0 * k)
    ctx.lineTo((sx + wd + 0.5) * k, gy0 * k)
    ctx.lineTo((sx + wd - 0.5) * k, gy1 * k)
    ctx.lineTo((sx - wd - 0.5) * k, gy1 * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** The great mirror, in the bridge's own cells: its frame, its glass, then its shards. */
function greatMirror(pen: Pen, t: number, f: Frame): void {
  if (!(X1 + 3 > f.x0 && X0 - 3 < f.x1 && Y_S + 0.5 > f.y0 && TOP - 0.5 < f.y1)) return
  const w = swing(t)
  const x1 = X0 + (X1 - X0) * Math.max(0.035, w)
  const broken = t >= SHATTER
  // The frame: iron, a lit edge along its top.
  const { k } = pen
  if (!broken) glass(pen, t, w)
  // Outer frame as four bars, so the glass (or what is behind it, once it has gone) shows through.
  const r = RIM * Math.max(0.35, w)
  rect(pen, X0, TOP, x1, TOP + RIM, PARIS.iron, 0.6)
  rect(pen, X0, BOT - RIM * 0.6, x1, BOT, PARIS.iron, 0.6)
  rect(pen, X0, TOP, X0 + RIM, BOT, PARIS.iron, 0.6)
  rect(pen, x1 - r, TOP, x1, BOT, PARIS.iron, 0.6)
  rect(pen, X0, TOP - 0.04, x1, TOP + 0.02, IRON_LIT, 0)
  // Its hinges on the column.
  rect(pen, X0 - 0.06, TOP + 0.4, X0 + 0.04, TOP + 0.62, IRON_LIT, 0.4)
  rect(pen, X0 - 0.06, BOT - 0.75, X0 + 0.04, BOT - 0.53, IRON_LIT, 0.4)
  if (!broken) return
  // The shards: turning in the sun (a bright face now, then its edge), falling, lying on the deck.
  const plain: Pt[][] = []
  const lit: Pt[][] = []
  const u = t - SHATTER
  for (const s of SHARD_LIST) {
    const { c, a, lying } = shardAt(s, t)
    const cs = Math.cos(a)
    const sn = Math.sin(a)
    // Lying, it lies flat: squashed to a sliver on the deck.
    const pts = s.poly.map(([x, y]) => (lying ? ([c[0] + x * cs * 0.9, BOT - 0.02 - Math.abs(y * sn) * 0.15] as Pt) : ([c[0] + x * cs - y * sn, c[1] + x * sn + y * cs] as Pt)))
    const facing = Math.cos(a * 1.3 + s.c[0] * 3)
    ;(facing > 0.4 && !lying ? lit : plain).push(pts)
  }
  fillPaths(pen, plain, mixHex(PARIS.glass, PARIS.slate, 0.15), 0.8)
  // A bright face is the sky in the glass, not blank white, and every shard has a firm edge: against the pale
  // facades a white one with a hairline edge read as a flat cut-out.
  fillPaths(pen, lit, mixHex('#FFFFFF', PARIS.glass, 0.3), 0.92)
  strokePaths(pen, [...plain, ...lit].map((g) => [...g, g[0]]), mixHex(PARIS.slate, PARIS.glass, 0.15), 0.6, 0.95)
  // Light: the flash where she touched it, and a glint where each big one lands.
  if (u < 0.7) bloom(pen.p, k, TOUCH, 1.9, '#FFFFFF', 0.55 * (1 - u / 0.7))
  for (const s of SHARD_LIST) {
    if (!s.big) continue
    const w2 = t - s.land
    if (w2 < 0 || w2 > 0.45) continue
    const { c } = shardAt(s, t)
    bloom(pen.p, k, [c[0], BOT - 0.05], 0.55, '#FFFFFF', 0.45 * (1 - w2 / 0.45))
  }
}

/** Everything of the mirrors, in the bridge's frame (turned with it). */
export function drawMirrors(pen: Pen, t: number): void {
  const th = theta(t)
  if (t < MIRROR_B - 30) return
  const { at } = tip(th)
  const { p, k } = pen
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(-th)
  p.translate(-H * k, -Y_S * k)
  greatMirror(pen, t, frame(p, k))
  p.pop()
}

/** How much nearer the near mirror is than the great one: it stands at the deck's front edge, so it is drawn larger. */
const NEAR = 1.16
/**
 * The near mirror: the other of the pair, on the deck's front edge (on the same column), facing the great one, with him
 * between them: we see through it (we are on its far side), so all we see of it is its iron frame, a little larger
 * for being nearer, and the faint cast of its glass. Drawn over the balls. It swings shut on the bar's third attack,
 * and away again as the other shatters.
 */
function nearMirror(pen: Pen, t: number): void {
  const v = nearShut(t)
  if (v <= 0.002) return
  const V = VANISH
  const P = (x: number, y: number): Pt => [V[0] + (x - V[0]) * NEAR, V[1] + (y - V[1]) * NEAR]
  const [a0, a1] = [P(X0, TOP), P(X1, BOT)]
  const x0 = a0[0]
  const y0 = a0[1]
  const y1 = a1[1]
  const x1 = x0 + (a1[0] - x0) * Math.max(0.03, v)
  const r = RIM * NEAR
  const side = r * (0.35 + 0.65 * v)
  const ctx = ctxOf(pen.p)
  const { k } = pen
  // Its glass, from behind: the faintest cast.
  ctx.save()
  ctx.fillStyle = rgba(SILVER, 0.1 * v)
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
  rect(pen, x0, y0, x1, y0 + r, PARIS.iron, 0.7)
  rect(pen, x0, y1 - r * 0.7, x1, y1, PARIS.iron, 0.7)
  rect(pen, x0, y0, x0 + r, y1, PARIS.iron, 0.7)
  rect(pen, x1 - side, y0, x1, y1, PARIS.iron, 0.7)
  rect(pen, x0, y0 - 0.04, x1, y0 + 0.02, IRON_LIT, 0)
}

/** The near mirror, in the bridge's frame (turned with it), over the balls. */
export function drawNearMirror(pen: Pen, t: number): void {
  if (nearShut(t) <= 0.002) return
  const th = theta(t)
  const { at } = tip(th)
  const { p, k } = pen
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(-th)
  p.translate(-H * k, -Y_S * k)
  nearMirror(pen, t)
  p.pop()
}
