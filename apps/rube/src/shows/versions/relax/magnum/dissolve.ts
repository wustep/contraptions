import type p5 from 'p5'
import { R, ball, type Piece, type PieceCtx } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { ShowBall, ShowPoint } from '../../../../show'
import type { Framing } from '../../../registry'
import { BUMP, STOMPS } from './center/center-plan'
import { frame, scenery } from './kit'
import { SEAM } from './music'
import type { MagnumShow } from './show'

/**
 * The dissolves: every change of place, and the Center's two cuts of the camera, are a plain dissolve, the one picture
 * fading through the other. No flash, no edge, nothing laid over both.
 *
 * At a change of place the cut stays where it was, on Derek (`score.ts`): the camera is carried across it, so he holds
 * still on the screen while the place round him becomes another. The other place is drawn into a second canvas by
 * this camera carried across the cut, as it stands at the cut (its last moment, or its first), with whoever is in it
 * but Derek, and laid over the place he is in; he is drawn again on top, as he is. Whoever stands on only one side
 * (Hansel, leaving the club) goes with that place; whoever stands at his side on both (Mugatu into the spa, Hansel into
 * the Center) holds.
 *
 * At a cut of the camera inside the Center the place is the same, live, seen by the framing on the other side of the
 * cut: the lawn wide into the model alone as the sheet goes up, and the pump close out to the whole lawn on the second
 * stomp.
 */

export interface Dissolve {
  /** The cut's show time. */
  at: number
  /** Seconds before and after the cut it runs. */
  before: number
  after: number
  /** A cut of the camera inside a place, rather than a change of place. */
  framing?: boolean
}

export const DISSOLVES: Dissolve[] = [
  { at: SEAM.spa, before: 0.3, after: 0.6 },
  { at: SEAM.club, before: 0.3, after: 0.6 },
  { at: SEAM.derelicte, before: 0.3, after: 0.6 },
  { at: SEAM.center, before: 0.3, after: 0.6 },
  { at: BUMP, before: 0.2, after: 0.5, framing: true },
  { at: STOMPS[1], before: 0.3, after: 0.15, framing: true },
]

const smooth = (x: number): number => {
  const u = Math.max(0, Math.min(1, x))
  return u * u * (3 - 2 * u)
}

/** The dissolve running at `t`, and how much of the other picture is laid over this one (0 to 1). */
export function dissolveAt(t: number): { d: Dissolve; a: number } | null {
  for (const d of DISSOLVES) {
    if (t <= d.at - d.before || t >= d.at + d.after) continue
    const m = smooth((t - (d.at - d.before)) / (d.before + d.after))
    return { d, a: t < d.at ? m : 1 - m }
  }
  return null
}

/**
 * A second canvas the size of the frame, one per p5 sketch, sized again in place when the frame changes size (p5's
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

/** One ball as the stage draws it (`engine.ts`): a rider as it says, or the ball itself off its lane. */
function drawBall(p: p5, here: ShowPoint, b: ShowBall | null, k: number, weight: number, x: number, y: number): void {
  const u = here.universe
  if (b) {
    const spin = b.spin ?? (b.x - u.pieces[0].col) / R
    const angle = b.angle ?? Math.atan2(b.vy ?? 0, b.vx ?? 1)
    ball(p, k, b.rim ?? u.theme.ink, weight, b.color, x, y, spin, b.scale ?? 1, b.stretch ?? 1, angle, !!b.ghost, b.spin !== null)
    return
  }
  if (here.hidden || here.scale <= 0) return
  const spin = (here.x - u.pieces[0].col) / R
  const angle = Math.atan2(Math.sin(here.angle), here.placed.mirror * Math.cos(here.angle))
  ball(p, k, u.theme.ink, weight, here.ball.color, x, y, spin, here.scale, here.stretch, angle, here.ball.ghost)
}

/**
 * A place at `here`, with the camera at `x, y` and `k` pixels a cell, as the stage would draw it (`engine.ts`,
 * drawWorld): its paper, the pieces in view, the balls (Derek too, if `hero`), and the pieces' overs. Every place of
 * this show has a plain backdrop and no cut drawn, so that is all of it.
 */
function paintPlace(g: p5, here: ShowPoint, x: number, y: number, k: number, hero: boolean): void {
  const u = here.universe
  const { theme } = u
  const W = g.width
  const H = g.height
  const weight = Math.max(0.75, k * 0.037) * (theme.weight ?? 1)
  const sx = (c: number) => W / 2 + (c - x) * k
  const sy = (r: number) => H / 2 + (r - y) * k
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
    t: here.local - pl.start,
    since: here.local - pl.start - pl.lane.fire,
    ink: theme.ink,
    bg: theme.bg,
    weight,
    color: pl.ballIn.color,
    theme,
    spin: (px) => {
      const turned = (pl.col + pl.mirror * px - u.pieces[0].col) / R
      return pl.mirror > 0 ? turned : Math.PI - turned
    },
  })
  const pass = (which: 'draw' | 'over') => {
    for (const pl of visible) {
      const fn = pl.piece[which]
      if (!fn) continue
      g.push()
      g.translate(sx(pl.col), sy(pl.row))
      g.scale(pl.mirror, 1)
      fn.call(pl.piece, g, pl.state, ctxFor(pl))
      g.pop()
    }
  }
  pass('draw')
  if (here.balls) {
    for (const b of here.balls) if (hero || b.id !== here.ball.id) drawBall(g, here, b, k, weight, sx(b.x), sy(b.y))
  } else if (hero) drawBall(g, here, null, k, weight, sx(here.x), sy(here.y))
  pass('over')
  g.pop()
}

let painting = false

/**
 * The piece that lays the other picture over this one. It stands in every place, over everything but the credits, and
 * is handed the show and its camera once they are made (`bind`).
 */
export function dissolves(): { piece: Piece<null>; bind(show: MagnumShow, camera: (t: number) => Framing): void } {
  let show: MagnumShow | null = null
  let camera: ((t: number) => Framing) | null = null
  const piece = scenery<null>({
    name: 'dissolve',
    draw: () => {},
    over: (p, _s, c) => {
      if (!show || !camera || painting) return
      const t = c.t
      const on = dissolveAt(t)
      if (!on || on.a <= 0.001) return
      const { d, a } = on
      const k = c.k
      const f = frame(p, k)
      const cam = camera(t)
      // Overview frames the whole place, not the camera: nothing to dissolve between there.
      if ((k * cam.cells) / Math.min(p.width / (16 / 9), p.height) < 0.9) return
      const before = t < d.at
      const main = show.owner(t)
      let here: ShowPoint
      let x: number
      let y: number
      let kk = k
      if (d.framing) {
        // The same place, live, by the framing on the other side of the cut.
        const other = camera(before ? d.at + 1e-4 : d.at - 1e-4)
        here = show.at(t)
        x = f.cx + other.x - cam.x
        y = f.cy + other.y - cam.y
        kk = (k * cam.cells) / other.cells
      } else {
        // The other place as it stands at the cut, by this camera carried across it, with all but Derek.
        const leg = before ? main + 1 : main - 1
        if (leg < 0 || leg >= show.legs.length) return
        here = show.at(before ? d.at + 1e-4 : d.at - 1e-4)
        const [dx, dy] = show.shift(main, leg)
        x = f.cx + dx
        y = f.cy + dy
      }
      const g = spareFor(p)
      painting = true
      try {
        paintPlace(g, here, x, y, kk, !!d.framing)
      } finally {
        painting = false
      }
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = a
      ctx.drawImage(g.elt as HTMLCanvasElement, 0, 0)
      ctx.restore()
      if (d.framing) return
      // Derek, again, over both places: as he is.
      const now = show.at(t)
      const him = now.balls?.find((b) => b.id === now.ball.id) ?? null
      if (now.balls && !him) return
      drawBall(p, now, him, k, c.weight, (him?.x ?? now.x) * k, (him?.y ?? now.y) * k)
    },
  })
  return {
    piece,
    bind: (s, cam) => {
      show = s
      camera = cam
    },
  }
}
