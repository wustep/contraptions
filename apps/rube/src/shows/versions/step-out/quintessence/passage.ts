import type p5 from 'p5'
import { R, ball, type Piece, type PieceCtx, type Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Universe } from '../../../../universe'
import { NEG_C, NEG_H, NEG_W } from './home/home-draw'
import { frame, scenery } from './kit'
import { SEAM } from './music'
import { GAP_X, LIP, STRIP } from './negatives/plan'
import type { QuintessenceShow } from './show'

/**
 * The passages: for a second or so round each change of place, both places are on the screen at once.
 *
 * The cuts stay where they were, on Walter (`score.ts`): on the screen he holds still while the place changes round
 * him. The place he is going to is drawn whole into a second canvas, by the camera carried across the cut, and laid
 * over the place he is in, in one of two plain ways:
 *
 * - through a shape that is already in the picture and grows to the frame's edges: the blank frame he stares into
 *   opens into the daydream, the sea's surface comes up past the lens, the last negative opens on the snow. After the
 *   cut it is the other way about: the place he has left is laid over the one he is in, outside the shape;
 * - or as a dissolve, the one place fading through the other: out of the daydream, through the ship's picture into the
 *   bar, out of the bar's door, off the boat into Iceland, out of the press onto the street.
 *
 * Sean's shutter closes on the mountain and opens on Ted's table, over both. The ash (`score.ts`) is the one passage
 * under a cover, and stays its own. Every edge is plain: no borders, foam, sprockets, char, flare or glow.
 *
 * Walter is drawn by the place he is in. Wherever the other place is laid over him, he is drawn again on top, as he
 * is: nothing here changes his colour. Cheryl and the rest go with their places.
 */

type C2 = CanvasRenderingContext2D

/** Where things are on the screen at a moment of a passage. */
interface Scene {
  /** How far through the passage (0 to 1, eased). */
  u: number
  /** The frame, in device pixels. */
  W: number
  H: number
  /** Walter on the screen, and a cell's size there. */
  him: Pt
  s: number
  /** A point of the place he is leaving, in its cells, on the screen now. */
  leaving(x: number, y: number): Pt
}

interface Passage {
  /** The cut's show time. */
  at: number
  /** Seconds before and after the cut it runs. */
  before: number
  after: number
  /** How `u` goes across the window. */
  ease: (x: number) => number
  /** The region where the place he is going to is seen. Undefined: a dissolve (or, with `cover`, nothing). */
  region?(sc: Scene): Path2D
  /** Seconds over which the place he is going to comes up in the region when it first opens. */
  fade?: number
  /** A line along the region's edge: the sea's surface. */
  edge?(ctx: C2, sc: Scene): void
  /** A shape over both places: the shutter. */
  cover?(ctx: C2, sc: Scene): void
}

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const smooth = (x: number) => { const u = clamp(x); return u * u * (3 - 2 * u) }
const linear = (x: number) => clamp(x)
/** Slowly, then all at once, settling: an opening that bursts just after the cut. */
const burst = (x: number) => { const u = clamp(x); return u < 0.35 ? 0.12 * (u / 0.35) ** 2 : 0.12 + 0.88 * (1 - Math.pow(1 - (u - 0.35) / 0.65, 3)) }

/**
 * A rectangle of the place he is leaving, `[x0, y0, x1, y1]` in its cells, opening out at `e` (0 to 1) till it is past
 * the frame's edges on every side: it grows about its own middle, so the way it sits in the frame is kept.
 */
function opening(sc: Scene, box: [number, number, number, number], e: number): Path2D {
  const [ax, ay] = sc.leaving(box[0], box[1])
  const [bx, by] = sc.leaving(box[2], box[3])
  const pad = 0.1 * sc.s
  const x0 = ax + (-pad - ax) * e
  const y0 = ay + (-pad - ay) * e
  const x1 = bx + (sc.W + pad - bx) * e
  const y1 = by + (sc.H + pad - by) * e
  const path = new Path2D()
  path.rect(x0, y0, x1 - x0, y1 - y0)
  return path
}

/* ------------------------------------------------------------------ the shapes */

/** The blank frame he stares into, where frame 25 should be: it opens, and the daydream is in it. */
const BLANK: [number, number, number, number] = [GAP_X - 0.5, STRIP.top, GAP_X + 0.5, LIP]
/** The last negative, hung over the piano's curve, face on as he stops it: it opens on the snow. */
const LAST_NEGATIVE: [number, number, number, number] = [NEG_C[0] - NEG_W / 2, NEG_C[1] - NEG_H / 2, NEG_C[0] + NEG_W / 2, NEG_C[1] + NEG_H / 2]

/** The sea's surface: its line comes up past the lens as he goes in, gently waved. */
const waterAt = (u: number, H: number, s: number, x: number) => H * 1.15 - H * 1.35 * smooth(u) + 0.08 * s * Math.sin(x / (1.3 * s) + u * 6)
function waterline(sc: Scene): Path2D {
  const { u, W, H, s } = sc
  const path = new Path2D()
  path.moveTo(-10, H + 20)
  for (let x = -10; x <= W + 10; x += Math.max(6, W / 60)) path.lineTo(x, waterAt(u, H, s, x))
  path.lineTo(W + 10, waterAt(u, H, s, W + 10))
  path.lineTo(W + 10, H + 20)
  path.closePath()
  return path
}
/** The surface itself, where the two meet: a plain light line. */
function surface(ctx: C2, sc: Scene): void {
  const { u, W, H, s } = sc
  if (u <= 0 || u >= 1) return
  ctx.beginPath()
  for (let x = -10; x <= W + 10; x += Math.max(6, W / 60)) {
    const y = waterAt(u, H, s, x)
    if (x === -10) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = 'rgba(226, 238, 238, 0.75)'
  ctx.lineWidth = Math.max(1, 0.035 * s)
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/**
 * Sean's shutter: a plain dark iris that closes on the mountain to a ring round him on the cut, a little turned, and
 * opens on Ted's table: a photograph taken on the peak.
 */
function shutter(ctx: C2, sc: Scene): void {
  const { u, W, H, him, s } = sc
  if (u <= 0 || u >= 1) return
  const shut = Math.pow(clamp(1 - Math.abs(u - 0.5) * 2), 1.6)
  const far = Math.max(Math.hypot(him[0], him[1]), Math.hypot(W - him[0], him[1]), Math.hypot(him[0], H - him[1]), Math.hypot(W - him[0], H - him[1])) * 1.05 / Math.cos(Math.PI / 7)
  const r = far - (far - 0.95 * s) * shut
  const turn = 0.9 * shut
  ctx.save()
  ctx.beginPath()
  ctx.rect(-10, -10, W + 20, H + 20)
  for (let i = 0; i <= 7; i++) {
    const a = (i / 7) * Math.PI * 2 + turn
    const x = him[0] + Math.cos(a) * r
    const y = him[1] + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = '#17181B'
  ctx.fill('evenodd')
  ctx.restore()
}

/* ------------------------------------------------------------------ the passages, in order */

export const PASSAGES: Passage[] = [
  { at: SEAM.dream, before: 0.32, after: 0.7, ease: burst, region: (sc) => opening(sc, BLANK, sc.u), fade: 0.32 },
  { at: SEAM.office, before: 0.2, after: 0.45, ease: smooth },
  { at: SEAM.nuuk, before: 0.3, after: 0.6, ease: smooth },
  { at: SEAM.sky, before: 0.25, after: 0.5, ease: smooth },
  { at: SEAM.sea, before: 0.4, after: 0.5, ease: linear, region: waterline, edge: surface },
  { at: SEAM.iceland, before: 0.3, after: 0.6, ease: smooth },
  { at: SEAM.himalaya, before: 0.3, after: 1.0, ease: burst, region: (sc) => opening(sc, LAST_NEGATIVE, sc.u), fade: 0.3 },
  { at: SEAM.press, before: 0.42, after: 0.55, ease: linear, cover: shutter },
  { at: SEAM.street, before: 0.3, after: 0.6, ease: smooth },
]

/** The passage running at `t`, and how far through it is. */
export function passageAt(t: number): { passage: Passage; u: number } | null {
  for (const passage of PASSAGES) {
    const a = passage.at - passage.before
    const b = passage.at + passage.after
    if (t > a && t < b) return { passage, u: clamp(passage.ease((t - a) / (b - a))) }
  }
  return null
}

/* ------------------------------------------------------------------ the drawing */

/**
 * A second canvas the size of the frame, one per p5 sketch, sized again when the frame changes size (in place: p5's
 * `remove` on a 2D graphics throws, so a new one cannot replace it).
 */
const spares = new WeakMap<p5, p5.Graphics>()
function spareFor(p: p5): p5.Graphics {
  const d = p.pixelDensity()
  let g = spares.get(p)
  if (!g) {
    g = p.createGraphics(p.width, p.height)
    g.pixelDensity(d)
    // The modes every piece is drawn in (the stage's `drawingModes`).
    g.rectMode(g.CENTER)
    g.angleMode(g.RADIANS)
    g.strokeCap(g.ROUND)
    g.strokeJoin(g.ROUND)
    spares.set(p, g)
  }
  if (g.width !== p.width || g.height !== p.height) g.resizeCanvas(p.width, p.height, true)
  if (g.pixelDensity() !== d) g.pixelDensity(d)
  return g
}

/**
 * The other place at `t`, without Walter, as the stage would draw it (`engine.ts`, drawWorld) with the camera at `x,
 * y`: its paper, then every piece in view in two passes. Every place of this show has a plain backdrop and no cut
 * drawn, so that is all of it.
 */
function paintPlace(g: p5, u: Universe, t: number, x: number, y: number, k: number): void {
  const W = g.width
  const H = g.height
  const { theme } = u
  const weight = Math.max(0.75, k * 0.037) * (theme.weight ?? 1)
  g.push()
  g.noStroke()
  g.fill(theme.bg)
  g.rect(W / 2, H / 2, W, H)
  const x0 = x - W / 2 / k - 1.5
  const x1 = x + W / 2 / k + 1.5
  const y0 = y - H / 2 / k - 1.5
  const y1 = y + H / 2 / k + 1.5
  const visible = u.pieces.filter((pl) => pl.cells.some(([c, r]) => c >= x0 && c <= x1 && r >= y0 && r <= y1))
  const ctxFor = (pl: Placed): PieceCtx => ({
    k,
    t: t - pl.start,
    since: t - pl.start - pl.lane.fire,
    ink: theme.ink,
    bg: theme.bg,
    weight,
    color: pl.ballIn.color,
    theme,
    spin: (sx) => {
      const turned = (pl.col + pl.mirror * sx - u.pieces[0].col) / R
      return pl.mirror > 0 ? turned : Math.PI - turned
    },
  })
  for (const which of ['draw', 'over'] as const) {
    for (const pl of visible) {
      const fn = pl.piece[which]
      if (!fn) continue
      g.push()
      g.translate(W / 2 + (pl.col - x) * k, H / 2 + (pl.row - y) * k)
      g.scale(pl.mirror, 1)
      fn.call(pl.piece, g, pl.state, ctxFor(pl))
      g.pop()
    }
  }
  g.pop()
}

let drawingOther = false

/**
 * The piece that lays the other place over this one. It stands in every place, last of what is drawn over it, and is
 * handed the show once it is made (`bind`).
 */
export function passages(): { piece: Piece<null>; bind(show: QuintessenceShow): void } {
  let show: QuintessenceShow | null = null
  const piece = scenery<null>({
    name: 'passage',
    draw: () => {},
    over: (p, _s, c) => {
      if (!show || drawingOther) return
      const t = c.t
      const on = passageAt(t)
      if (!on) return
      const { passage, u } = on
      const main = show.owner(t)
      const before = t < passage.at
      const other = before ? main + 1 : main - 1
      if (other < 0 || other >= show.legs.length) return
      const ctx = p.drawingContext as C2
      const k = c.k
      const d = p.pixelDensity()
      const W = p.width * d
      const H = p.height * d
      const here = show.at(t)
      const m = ctx.getTransform()
      const toScreen = (x: number, y: number): Pt => [m.a * x * k + m.c * y * k + m.e, m.b * x * k + m.d * y * k + m.f]
      const [dx, dy] = show.shift(main, other)
      const sc: Scene = {
        u,
        W,
        H,
        him: toScreen(here.x, here.y),
        s: Math.hypot(m.a, m.b) * k,
        // Before the cut he is in the place he is leaving; after it, that place is the other one.
        leaving: (x, y) => (before ? toScreen(x, y) : toScreen(x - dx, y - dy)),
      }

      let over = false
      if (!passage.cover) {
        // The other place, by this camera carried across the cut.
        const f = frame(p, k)
        const universe = show.universeOf(show.legs[other].world)
        if (!universe) return
        const g = spareFor(p)
        drawingOther = true
        try {
          paintPlace(g as unknown as p5, universe, t, f.cx + dx, f.cy + dy, k)
        } finally {
          drawingOther = false
        }
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        if (passage.region) {
          // Before the cut the new place is seen inside the shape; after it, the old one is seen outside it.
          const region = passage.region(sc)
          let clip = region
          let rule: CanvasFillRule = 'nonzero'
          if (!before) {
            clip = new Path2D()
            clip.rect(-20, -20, W + 40, H + 40)
            clip.addPath(region)
            rule = 'evenodd'
          }
          ctx.clip(clip, rule)
          if (before && passage.fade) ctx.globalAlpha = smooth((t - (passage.at - passage.before)) / passage.fade)
          over = ctx.isPointInPath(clip, sc.him[0], sc.him[1], rule)
        } else {
          // A dissolve: the new place comes up through the old one.
          ctx.globalAlpha = before ? u : 1 - u
          over = true
        }
        ctx.drawImage(g.elt as HTMLCanvasElement, 0, 0, W, H)
        ctx.restore()
        if (passage.edge) {
          ctx.save()
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          passage.edge(ctx, sc)
          ctx.restore()
        }
      } else {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        passage.cover(ctx, sc)
        ctx.restore()
        over = true
      }

      // Walter, again, wherever the other place or the shutter was laid over him: as he is, his own colour.
      if (!over || here.hidden || here.scale <= 0.02) return
      const u0 = here.universe
      const spin = (here.x - u0.pieces[0].col) / R
      const angle = Math.atan2(Math.sin(here.angle), here.placed.mirror * Math.cos(here.angle))
      const him = here.balls?.find((b) => b.id === here.ball.id)
      const b = him ?? { x: here.x, y: here.y, color: here.ball.color, ghost: here.ball.ghost, scale: here.scale, stretch: here.stretch, angle }
      ball(p, k, c.ink, c.weight, b.color, b.x * k, b.y * k, spin, b.scale ?? 1, b.stretch ?? 1, b.angle ?? 0, b.ghost ?? false)
    },
  })
  return { piece, bind: (s) => { show = s } }
}
