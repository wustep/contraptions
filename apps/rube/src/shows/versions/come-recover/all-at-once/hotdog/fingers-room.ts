import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, depth, frame, hash, knock, lastOf, smooth, type Ctx } from '../kit'
import { onsetsIn } from '../music'
import { HOTDOG } from '../worlds'
import { FLOOR_Y, HAND, KEY, LID } from './fingers-plan'

/**
 * The recital room the hot dog life's piano stands in, at three depths.
 *
 * - **Behind** (`wall`, at 0.82 of the piano's pace): the papered wall, with two tall windows onto a lilac evening,
 *   their rooftops further off still (at half the pace), rose velvet drapes that stir in the draught, and between them a
 *   gilt portrait of the house's grandmother, her hands in her lap, all sausages.
 * - **On the piano**: the music on the desk, three systems a page, and a page that turns as she runs up the keys.
 * - **In front** (`audience`, at 1.35): the recital's audience, seen from behind, heads and shoulders along the
 *   frame's foot below the keyboard. They sway with the music; when the bottle squirts they start, and from there two
 *   of them applaud on the notes, their hot dog fingers flopping.
 */

const PLUM = mixHex(mixHex(HOTDOG.piano, '#6B3A58', 0.35), '#C98B97', 0.45)
const WALL = '#F7D8D0'
const WALL_STRIPE = mixHex(WALL, HOTDOG.ivory, 0.42)
const WAINSCOT = mixHex(WALL, HOTDOG.sausage, 0.22)
const DRAPE = mixHex(HOTDOG.sausageDeep, '#8E3A55', 0.45)
const DRAPE_DEEP = mixHex(DRAPE, HOTDOG.piano, 0.3)
const GILT = mixHex(HOTDOG.mustard, HOTDOG.bun, 0.35)
const DUSK_HIGH = mixHex(HOTDOG.lilac, '#8E7FB8', 0.45)
const DUSK_LOW = mixHex('#F6C9B4', HOTDOG.ivory, 0.25)
const ROOFS = mixHex(HOTDOG.lilac, HOTDOG.piano, 0.38)

/** Where the layers sit as drawn: the camera's middle over the keyboard. */
const REF: Pt = [2.2, 0.3]
/** The windows' middles and their size, in the wall's own cells. */
const WINDOWS = [-2.05, 6.55]
const WIN = { w: 1.5, top: -3.9, sill: 1.55 }
const PORTRAIT = { x: 2.15, y: -1.62, w: 0.72, h: 0.88 }

/** The papered wall behind the piano: stripes, the windows and their drapes, the portrait, the wainscot. */
export function wall(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  depth(p, k, 0.82, REF, (f) => {
    const x0 = f.x0 - 1
    const x1 = f.x1 + 1
    p.noStroke()
    p.fill(WALL)
    p.rect(((x0 + x1) / 2) * k, ((f.y0 - 1 + FLOOR_Y + 0.6) / 2) * k, (x1 - x0) * k, (FLOOR_Y + 0.6 - f.y0 + 1) * k)
    p.fill(WALL_STRIPE)
    for (let x = Math.floor(x0 / 0.56) * 0.56; x < x1; x += 0.56) p.rect((x + 0.14) * k, ((f.y0 - 1 + 1.95) / 2) * k, 0.16 * k, (1.95 - (f.y0 - 1)) * k)
    for (const wx of WINDOWS) if (wx + 1.6 > x0 && wx - 1.6 < x1) tallWindow(p, c, wx, t, f.cx)
    if (PORTRAIT.x + 1 > x0 && PORTRAIT.x - 1 < x1) portrait(p, c)
    // The wainscot, under its dado rail, down behind the floor.
    p.noStroke()
    p.fill(WAINSCOT)
    p.rect(((x0 + x1) / 2) * k, ((1.95 + FLOOR_Y + 0.6) / 2) * k, (x1 - x0) * k, (FLOOR_Y + 0.6 - 1.95) * k)
    solid(p, ink, weight * 0.6, mixHex(HOTDOG.sausageDeep, WAINSCOT, 0.35))
    p.rect(((x0 + x1) / 2) * k, 1.95 * k, (x1 - x0) * k, 0.09 * k)
    // Panels moulded in the wainscot.
    pencil(p, alpha(p, HOTDOG.sausageDeep, 0.3), Math.max(1, weight * 0.5))
    for (let x = Math.floor(x0 / 1.4) * 1.4; x < x1; x += 1.4) p.rect((x + 0.7) * k, ((2.1 + FLOOR_Y - 0.1) / 2) * k, 1.1 * k, (FLOOR_Y - 2.3) * k, 0.04 * k)
  })
}

/** A tall window onto the evening, its drapes either side. `cx` is the frame's middle, for the view's own depth. */
function tallWindow(p: p5, c: Ctx, x: number, t: number, cx: number): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const L = x - WIN.w / 2
  const R = x + WIN.w / 2
  // The view, clipped to the glass: a lilac dusk over rooftops further off, which slide by slower still.
  ctx.save()
  ctx.beginPath()
  ctx.rect(L * k, WIN.top * k, WIN.w * k, (WIN.sill - WIN.top) * k)
  ctx.clip()
  const g = ctx.createLinearGradient(0, WIN.top * k, 0, WIN.sill * k)
  g.addColorStop(0, DUSK_HIGH)
  g.addColorStop(0.75, DUSK_LOW)
  g.addColorStop(1, DUSK_LOW)
  ctx.fillStyle = g
  ctx.fillRect(L * k, WIN.top * k, WIN.w * k, (WIN.sill - WIN.top) * k)
  const drift = (cx - REF[0]) * 0.35
  p.noStroke()
  p.fill(ROOFS)
  for (let i = -3; i < 5; i++) {
    const rx = x + drift + i * 0.42 - 0.4
    const top = 0.25 + 0.35 * hash(i + Math.round(x * 3), 4, 51)
    p.rect(rx * k, ((top + WIN.sill) / 2) * k, 0.4 * k, (WIN.sill - top) * k)
    // A chimney now and then, and a lit window.
    if (hash(i + Math.round(x * 3), 5, 51) < 0.4) p.rect((rx + 0.08) * k, (top - 0.08) * k, 0.07 * k, 0.16 * k)
    if (hash(i + Math.round(x * 3), 6, 51) < 0.5) {
      p.fill(alpha(p, HOTDOG.mustard, 0.55))
      p.rect((rx - 0.06) * k, (top + 0.22) * k, 0.07 * k, 0.09 * k)
      p.fill(ROOFS)
    }
  }
  ctx.restore()
  // The sash: a frame, glazing bars, the meeting rail.
  outline(p, mixHex(HOTDOG.ivory, WALL, 0.4), Math.max(1, 0.05 * k))
  p.rect(x * k, ((WIN.top + WIN.sill) / 2) * k, WIN.w * k, (WIN.sill - WIN.top) * k)
  p.strokeWeight(Math.max(1, 0.028 * k))
  p.line(x * k, WIN.top * k, x * k, WIN.sill * k)
  for (let y = WIN.top + 0.62; y < WIN.sill; y += 0.62) p.line(L * k, y * k, R * k, y * k)
  pencil(p, alpha(p, ink, 0.5), Math.max(1, weight * 0.6))
  p.rect(x * k, ((WIN.top + WIN.sill) / 2) * k, (WIN.w + 0.06) * k, (WIN.sill - WIN.top + 0.06) * k)
  // The sill.
  solid(p, ink, weight * 0.6, HOTDOG.ivory)
  p.rect(x * k, (WIN.sill + 0.05) * k, (WIN.w + 0.3) * k, 0.1 * k, 0.02 * k)
  // The drapes: velvet from a pole, drawn back to a gold tie-back at the window's side, falling full below it, their
  // hems stirring in the draught off the glass.
  for (const s of [-1, 1]) {
    const out = x + s * (WIN.w / 2 + 0.62)
    const inner = x + s * (WIN.w / 2 - 0.3)
    const tie: Pt = [x + s * (WIN.w / 2 + 0.12), -0.55]
    const stir = 0.04 * Math.sin(t * 1.3 + x + s) + 0.025 * Math.sin(t * 2.1 + s * 2)
    const hem = WIN.sill + 0.4
    const edge: Pt[] = [
      [inner, WIN.top - 0.2],
      [inner + s * 0.06, WIN.top + 1.1],
      [tie[0] - s * 0.04, tie[1] - 0.7],
      tie,
      [tie[0] - s * 0.16 + stir * 0.5, tie[1] + 0.6],
      [inner + s * 0.08 + stir, hem],
    ]
    solid(p, ink, weight * 0.7, DRAPE)
    p.beginShape()
    p.vertex(out * k, (WIN.top - 0.2) * k)
    for (const [px, py] of smoothed(edge)) p.vertex(px * k, py * k)
    p.vertex((out + stir * 0.4) * k, hem * k)
    p.endShape(p.CLOSE)
    // Its pleats: gathered into the tie, and opening out again under it.
    p.stroke(alpha(p, DRAPE_DEEP, 0.8))
    p.strokeWeight(Math.max(1, 0.03 * k))
    p.noFill()
    for (let j = 1; j < 4; j++) {
      const u = j / 4
      const topX = inner + (out - inner) * u
      const tieX = tie[0] + (out - tie[0]) * u
      const hemX = inner + s * 0.08 + (out - inner - s * 0.08) * u + stir * (1 - u)
      p.bezier(topX * k, (WIN.top - 0.15) * k, topX * k, (tie[1] - 1.2) * k, tieX * k, (tie[1] - 0.5) * k, tieX * k, (tie[1] - 0.06) * k)
      p.bezier(tieX * k, (tie[1] + 0.06) * k, tieX * k, (tie[1] + 0.5) * k, hemX * k, (hem - 1.2) * k, hemX * k, hem * k)
    }
    // The tie-back, round the gathered drape, and its tassel.
    solid(p, ink, weight * 0.5, GILT)
    p.rect(((tie[0] + out) / 2) * k, tie[1] * k, (Math.abs(out - tie[0]) + 0.06) * k, 0.09 * k, 0.03 * k)
    p.line(tie[0] * k, (tie[1] + 0.04) * k, (tie[0] + stir * 0.3) * k, (tie[1] + 0.26) * k)
    p.ellipse((tie[0] + stir * 0.3) * k, (tie[1] + 0.3) * k, 0.07 * k, 0.12 * k)
  }
  // The pole and its finials.
  solid(p, ink, weight * 0.6, GILT)
  p.rect(x * k, (WIN.top - 0.22) * k, (WIN.w + 1.0) * k, 0.06 * k, 0.03 * k)
  for (const s of [-1, 1]) p.circle((x + s * (WIN.w / 2 + 0.52)) * k, (WIN.top - 0.22) * k, 0.12 * k)
}

/** A path through `pts` drawn smooth (Catmull-Rom, eight steps a span), its ends where they are. */
function smoothed(pts: Pt[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[i]
    const c = pts[i + 1]
    const d = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < 8; j++) {
      const u = j / 8
      const u2 = u * u
      const u3 = u2 * u
      const f = (q: number, r: number, s: number, v: number) => 0.5 * (2 * r + (s - q) * u + (2 * q - 5 * r + 4 * s - v) * u2 + (3 * r - q - 3 * s + v) * u3)
      out.push([f(a[0], b[0], c[0], d[0]), f(a[1], b[1], c[1], d[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/** The grandmother's portrait in its gilt frame: a lady in lilac, hands folded in her lap, every finger a sausage. */
function portrait(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const { x, y, w, h } = PORTRAIT
  // The cord to its picture rail.
  pencil(p, alpha(p, HOTDOG.sausageDeep, 0.6), Math.max(1, weight * 0.4))
  p.line((x - 0.2) * k, (y - h / 2) * k, x * k, (y - h / 2 - 0.3) * k)
  p.line((x + 0.2) * k, (y - h / 2) * k, x * k, (y - h / 2 - 0.3) * k)
  solid(p, ink, weight * 0.8, GILT)
  p.rect(x * k, y * k, (w + 0.14) * k, (h + 0.14) * k, 0.03 * k)
  solid(p, ink, weight * 0.4, mixHex(HOTDOG.piano, DUSK_HIGH, 0.35))
  p.rect(x * k, y * k, w * k, h * k)
  // Her: shoulders in lilac, a high collar, her hair up, and her hands in her lap.
  const u = h / 1.06
  p.noStroke()
  p.fill(mixHex(HOTDOG.lilac, HOTDOG.piano, 0.15))
  p.ellipse(x * k, (y + 0.36 * u) * k, 0.62 * u * k, 0.52 * u * k)
  p.fill(mixHex(HOTDOG.bun, HOTDOG.ivory, 0.3))
  p.ellipse(x * k, (y - 0.1 * u) * k, 0.24 * u * k, 0.29 * u * k)
  p.fill(mixHex(HOTDOG.piano, HOTDOG.sausageDeep, 0.3))
  p.ellipse(x * k, (y - 0.25 * u) * k, 0.27 * u * k, 0.13 * u * k)
  p.circle(x * k, (y - 0.34 * u) * k, 0.13 * u * k)
  // A face: two closed eyes and a small smile, kindly.
  p.stroke(alpha(p, HOTDOG.piano, 0.7))
  p.strokeWeight(Math.max(0.6, 0.012 * k))
  p.noFill()
  for (const s of [-1, 1]) p.arc((x + s * 0.05 * u) * k, (y - 0.11 * u) * k, 0.05 * u * k, 0.03 * u * k, 0, Math.PI)
  p.arc(x * k, (y - 0.02 * u) * k, 0.07 * u * k, 0.04 * u * k, 0.2, Math.PI - 0.2)
  p.noStroke()
  p.fill(HOTDOG.ivory)
  p.rect(x * k, (y + 0.07 * u) * k, 0.11 * u * k, 0.06 * u * k)
  for (let i = 0; i < 4; i++) {
    p.fill(i % 2 ? HOTDOG.sausage : mixHex(HOTDOG.sausage, HOTDOG.sausageDeep, 0.4))
    p.ellipse((x - 0.08 * u + i * 0.055 * u) * k, (y + 0.36 * u) * k, 0.055 * u * k, 0.15 * u * k)
  }
}

/** A stroke in a colour with alpha, no fill. */
function pencil(p: p5, col: p5.Color, w: number): void {
  p.stroke(col)
  p.strokeWeight(w)
  p.noFill()
}

/* ------------------------------------------------------------------ the music on the desk */

/** The music desk's page turn: as she reaches the top of the keyboard the pianist's page goes over. */
const TURN: [number, number] = [100.05, 100.5]

/** The music on the desk: two pages open, three systems each, and the right-hand page going over on `TURN`. */
export function music(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const top = LID - 0.78
  const bot = LID - 0.1
  const spine = 1.0
  const page = (x0: number, x1: number, shade: number) => {
    solid(p, ink, weight * 0.4, mixHex(HOTDOG.ivory, HOTDOG.bun, shade))
    p.quad(x0 * k, (top + 0.02) * k, x1 * k, top * k, x1 * k, bot * k, x0 * k, (bot + 0.01) * k)
    staves(p, k, Math.min(x0, x1), Math.max(x0, x1), top, bot)
  }
  page(0.12, spine, 0.08)
  page(spine, 1.88, 0.04)
  const u = smooth(t, TURN[0], TURN[1])
  if (u > 0 && u < 1) {
    // The leaf over its spine: seen edge-on halfway, foreshortened either side, lifting at its middle.
    const reach = 0.88 * Math.cos(u * Math.PI)
    const lift = 0.1 * Math.sin(u * Math.PI)
    const x1 = spine + reach
    solid(p, ink, weight * 0.4, mixHex(HOTDOG.ivory, HOTDOG.bun, u < 0.5 ? 0.04 : 0.14))
    p.quad(spine * k, top * k, x1 * k, (top - lift) * k, x1 * k, (bot - lift) * k, spine * k, bot * k)
  }
  pencil(p, alpha(p, HOTDOG.piano, 0.5), Math.max(1, weight * 0.5))
  p.line(spine * k, top * k, spine * k, bot * k)
}

function staves(p: p5, k: number, x0: number, x1: number, top: number, bot: number): void {
  p.stroke(alpha(p, HOTDOG.piano, 0.35))
  p.strokeWeight(Math.max(0.5, 0.008 * k))
  const sys = (bot - top - 0.08) / 3
  for (let s = 0; s < 3; s++) {
    const y0 = top + 0.07 + s * sys
    for (let l = 0; l < 5; l++) p.line((x0 + 0.07) * k, (y0 + l * 0.022) * k, (x1 - 0.07) * k, (y0 + l * 0.022) * k)
    p.noStroke()
    p.fill(alpha(p, HOTDOG.piano, 0.55))
    for (let n = 0; n < 6; n++) p.circle((x0 + 0.14 + n * (x1 - x0 - 0.22) / 6) * k, (y0 + 0.011 + 0.022 * Math.floor(hash(n, s, Math.round(x0 * 10)) * 4)) * k, 0.025 * k)
    p.stroke(alpha(p, HOTDOG.piano, 0.35))
  }
}

/* ------------------------------------------------------------------ the audience */

type Hat = 'bun' | 'topper' | 'bob' | 'bald' | 'feather' | 'bow'
interface Sitter {
  x: number
  /** Head radius. */
  r: number
  hat: Hat
  tone: number
  /** Does this one applaud. */
  claps: boolean
}

/** The audience, left to right in their own (near) cells: a row, not evenly sat. */
const ROW: Sitter[] = [
  { x: -4.6, r: 0.27, hat: 'bald', tone: 0.1, claps: false },
  { x: -3.3, r: 0.25, hat: 'feather', tone: 0.3, claps: true },
  { x: -1.75, r: 0.28, hat: 'topper', tone: 0.0, claps: false },
  { x: -0.15, r: 0.24, hat: 'bun', tone: 0.25, claps: false },
  { x: 1.6, r: 0.2, hat: 'bow', tone: 0.4, claps: true },
  { x: 3.15, r: 0.27, hat: 'bob', tone: 0.15, claps: false },
  { x: 4.75, r: 0.26, hat: 'bald', tone: 0.35, claps: true },
  { x: 6.4, r: 0.25, hat: 'feather', tone: 0.05, claps: false },
  { x: 8.0, r: 0.27, hat: 'bun', tone: 0.2, claps: false },
  { x: 9.6, r: 0.26, hat: 'topper', tone: 0.3, claps: false },
]

/** The notes they sway to, and the ones they clap on once the bottle has squirted. */
const BEATS = onsetsIn(97.15, 106.8, 0.45)
const CLAPS = onsetsIn(HAND.squirt + 0.25, HAND.land2 - 0.1, 0.3)
/** The squirt startles them. */
const START = HAND.squirt

/** How far up a clapper's hands are (0 in the lap, 1 up), and how near together (1 met). */
function applause(t: number): { up: number; meet: number } {
  const up = smooth(t, START + 0.12, START + 0.4) * (1 - smooth(t, HAND.land2 - 0.15, HAND.land2 + 0.2))
  if (up <= 0) return { up: 0, meet: 0 }
  const { ago } = lastOf(CLAPS, t)
  return { up, meet: Math.exp(-ago / 0.07) }
}

/** The audience, in front of everything, along the frame's foot. The keys stay clear over their heads. */
export function audience(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  // Under the keyboard always: its foot is at the key bed, so their heads stand from a little below it.
  const keyBed = KEY.top + KEY.face + 0.32
  const world = frame(p, k)
  if (world.y1 < keyBed + 0.1) return
  const sway = knock(lastOf(BEATS, t).ago, 0.25)
  const clap = applause(t)
  const start = knock(t - START, 0.35)
  depth(p, k, 1.35, REF, (f) => {
    // Sat so their heads come a hand's height up the frame's foot, and their crowns never above the keyboard's foot,
    // however close the camera is (a head's crown is about 0.98 over where they sit).
    const dy = world.cy - f.cy
    const floor = Math.max(f.y1 + 0.05, keyBed + 1.03 - dy)
    for (const [i, s] of ROW.entries()) {
      if (s.x + 1 < f.x0 || s.x - 1 > f.x1) continue
      const lean = 0.03 * Math.sin(t * 1.15 + i * 1.9) + 0.025 * sway * (i % 2 ? 1 : -1)
      const hx = s.x + lean
      const hy = floor - 0.42 - s.r + 0.03 * sway - 0.05 * start * (i % 3 === 0 ? 1 : 0)
      const tone = mixHex(PLUM, HOTDOG.sausageDeep, s.tone * 0.5)
      // Shoulders.
      solid(p, ink, weight * 0.6, mixHex(tone, HOTDOG.piano, 0.25))
      p.ellipse(hx * k, (floor + 0.05) * k, (s.r * 4.2) * k, 1.0 * k)
      // The clappers' hands, raised before their faces, meeting on the notes, every finger flopping.
      if (s.claps && clap.up > 0) {
        // Beside the head, from behind: up at its sides, coming together behind it on each note.
        const hands = hy + 0.25 - 0.37 * clap.up
        const gap = s.r * 0.55 + 0.22 * (1 - clap.meet)
        for (const side of [-1, 1]) hand(p, c, hx + side * gap, hands, side, t + i, clap.meet)
      }
      solid(p, ink, weight * 0.6, tone)
      head(p, c, hx, hy, s, t + i, tone)
    }
  })
}

/** A head from behind, and its hat. */
function head(p: p5, c: Ctx, x: number, y: number, s: Sitter, t: number, tone: string): void {
  const { k, ink, weight } = c
  const r = s.r
  // Ears, then the head.
  p.ellipse((x - r * 0.95) * k, (y + 0.05) * k, r * 0.35 * k, r * 0.55 * k)
  p.ellipse((x + r * 0.95) * k, (y + 0.05) * k, r * 0.35 * k, r * 0.55 * k)
  p.ellipse(x * k, y * k, 2 * r * k, 2.15 * r * k)
  const hair = mixHex(tone, HOTDOG.piano, 0.55)
  // The piano's light catches each head's crown, a thin edge of warmth.
  const rim = alpha(p, HOTDOG.bun, 0.35)
  if (s.hat === 'bun') {
    solid(p, ink, weight * 0.6, hair)
    p.ellipse(x * k, (y - 0.05) * k, 2 * r * k, 2.05 * r * k)
    p.circle(x * k, (y - r * 1.05) * k, r * 0.9 * k)
  } else if (s.hat === 'bob') {
    solid(p, ink, weight * 0.6, hair)
    p.rect(x * k, (y + 0.02) * k, 2.2 * r * k, 2.1 * r * k, r * k, r * k, 0.04 * k, 0.04 * k)
  } else if (s.hat === 'bow') {
    // Plaits, and a big bow tied at the back of her head.
    solid(p, ink, weight * 0.6, hair)
    p.ellipse(x * k, (y - 0.03) * k, 2 * r * k, 2.1 * r * k)
    for (const side of [-1, 1]) p.ellipse((x + side * r * 0.85) * k, (y + r * 0.95) * k, r * 0.45 * k, r * 1.1 * k)
    solid(p, ink, weight * 0.5, mixHex(HOTDOG.ketchup, PLUM, 0.3))
    for (const side of [-1, 1]) {
      p.push()
      p.translate((x + side * r * 0.45) * k, (y - r * 1.0) * k)
      p.rotate(-side * 0.45)
      p.ellipse(0, 0, r * 0.95 * k, r * 0.55 * k)
      p.pop()
    }
    p.circle(x * k, (y - r * 0.92) * k, r * 0.32 * k)
  } else if (s.hat === 'topper') {
    solid(p, ink, weight * 0.6, HOTDOG.piano)
    p.ellipse(x * k, (y - r * 0.55) * k, 2.5 * r * k, 0.5 * r * k)
    p.rect(x * k, (y - r * 1.3) * k, 1.55 * r * k, 1.4 * r * k, 0.02 * k)
    p.noStroke()
    p.fill(mixHex(HOTDOG.ketchup, HOTDOG.piano, 0.45))
    p.rect(x * k, (y - r * 0.82) * k, 1.55 * r * k, 0.3 * r * k)
  } else if (s.hat === 'feather') {
    solid(p, ink, weight * 0.6, mixHex(HOTDOG.lilac, PLUM, 0.55))
    p.ellipse(x * k, (y - r * 0.6) * k, 2.6 * r * k, 0.55 * r * k)
    p.arc(x * k, (y - r * 0.62) * k, 1.7 * r * k, 1.6 * r * k, Math.PI, Math.PI * 2, p.CHORD)
    // The feather, curling up off the band and nodding.
    const nod = 0.12 * Math.sin(t * 2.3)
    p.push()
    p.translate((x + r * 0.55) * k, (y - r * 0.9) * k)
    p.rotate(0.5 + nod)
    solid(p, ink, weight * 0.4, mixHex(HOTDOG.ivory, HOTDOG.lilac, 0.4))
    p.ellipse(0, -r * 0.75 * k, r * 0.42 * k, r * 1.6 * k)
    p.pop()
  }
  // The crown's edge of light.
  p.noFill()
  p.stroke(rim)
  p.strokeWeight(Math.max(1, 0.025 * k))
  p.arc(x * k, y * k, 1.9 * r * k, 2.05 * r * k, Math.PI * 1.15, Math.PI * 1.85)
}

/** One raised hand, palm out, its four sausage fingers drooping with the clap's shake. `side` -1 left, 1 right. */
function hand(p: p5, c: Ctx, x: number, y: number, side: number, t: number, meet: number): void {
  const { k, ink, weight } = c
  // The sleeve up to the wrist.
  solid(p, ink, weight * 0.6, PLUM)
  p.quad((x - 0.08) * k, (y + 0.7) * k, (x + 0.08) * k, (y + 0.7) * k, (x + 0.065) * k, (y + 0.16) * k, (x - 0.065) * k, (y + 0.16) * k)
  // The fingers: up from the palm, flopping over with the clap.
  const finger = 0.09
  for (let j = 0; j < 4; j++) {
    const a = -Math.PI / 2 + (j - 1.5) * 0.24 - side * 0.12
    const flop = side * (0.55 + 0.5 * meet) + 0.18 * Math.sin(t * 9 + j)
    const len = 0.26
    const root: Pt = [x + Math.cos(a) * 0.06, y + 0.02 + Math.sin(a) * 0.06]
    const mid: Pt = [root[0] + Math.cos(a) * len * 0.5, root[1] + Math.sin(a) * len * 0.5]
    const tip: Pt = [mid[0] + Math.cos(a - flop) * len * 0.55, mid[1] + Math.sin(a - flop) * len * 0.55]
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(finger * k + weight * 1.4)
    p.line(root[0] * k, root[1] * k, mid[0] * k, mid[1] * k)
    p.line(mid[0] * k, mid[1] * k, tip[0] * k, tip[1] * k)
    p.stroke(j % 2 ? HOTDOG.sausage : mixHex(HOTDOG.sausage, HOTDOG.sausageDeep, 0.3))
    p.strokeWeight(finger * k)
    p.line(root[0] * k, root[1] * k, mid[0] * k, mid[1] * k)
    p.line(mid[0] * k, mid[1] * k, tip[0] * k, tip[1] * k)
  }
  solid(p, ink, weight * 0.6, mixHex(HOTDOG.bun, HOTDOG.sausage, 0.25))
  p.ellipse(x * k, (y + 0.08) * k, 0.2 * k, 0.22 * k)
}
