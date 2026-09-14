import p5 from 'p5'
import { clamp, easeInOutCubic, easeInOutSine } from '../../../src/core/ease'
import { R, TRANSIT, ball, type PieceCtx } from './parts'
import type { Placed } from './plan'
import type { Show, ShowPoint } from './show'
import type { Universe } from './universe'

/**
 * The stage. A fullscreen canvas, a camera that follows the ball, and the
 * one drawing of everything that moves, all as a function of the clock.
 *
 * The camera is a pure function of time too: it averages the ball's position
 * over a short window around `t` — a little ahead, a little behind — and
 * only over samples in the same world, so it glides through a beat and cuts
 * at a portal, which is what a portal is.
 */

/** Cells visible along the shorter screen edge. */
const VISIBLE = 4.4

export interface Clock {
  /** Show time in seconds. */
  time(): number
}

export interface Stage {
  /** Zoom out to the whole universe. Debug only. */
  setOverview(on: boolean): void
  destroy(): void
}

const strokeFor = (k: number, weight = 1): number => Math.max(0.75, k * 0.037) * weight

/** A cheap stable hash to scatter stars by cell. */
const hash = (a: number, b: number, s: number): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

interface Camera {
  x: number
  y: number
  /** Multiplier on the base cell size. */
  zoom: number
}

function cameraAt(show: Show, t: number, here: ShowPoint): Camera {
  // A window that leads the ball a little, filtered to its own world.
  const dt = 0.05
  let sx = 0
  let sy = 0
  let sw = 0
  for (let i = -5; i <= 7; i++) {
    const w = 1 - Math.abs(i - 1) / 8
    const sample = show.at(t + i * dt)
    if (sample.universe !== here.universe) continue
    sx += sample.x * w
    sy += sample.y * w
    sw += w
  }
  const x = sw ? sx / sw : here.x
  const y = sw ? sy / sw : here.y
  // A world opens wide and settles onto the ball; at its end the camera
  // pushes in on the portal as the ball is swallowed, so the cut goes from
  // tight on the eye to wide on the new world.
  const intro = easeInOutSine(clamp((here.local - 0.4) / 2.2))
  const left = here.universe.journey - here.local
  const push = easeInOutSine(clamp((1.1 - left) / 1.0))
  const zoom = 0.62 + 0.38 * intro + 0.24 * push
  return { x, y, zoom }
}

export function createStage(host: HTMLElement, show: Show, clock: Clock): Stage {
  let overview = false
  let instance: p5 | null = null

  const sketch = (p: p5) => {
    p.setup = () => {
      const c = p.createCanvas(window.innerWidth, window.innerHeight)
      c.parent(host)
      p.pixelDensity(window.devicePixelRatio || 1)
      p.rectMode(p.CENTER)
      p.angleMode(p.RADIANS)
      p.strokeCap(p.ROUND)
      p.strokeJoin(p.ROUND)
    }

    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight)
      p.pixelDensity(window.devicePixelRatio || 1)
    }

    p.draw = () => {
      const t = clock.time()
      const here = show.at(t)
      const u = here.universe
      const { theme } = u
      const W = p.width
      const H = p.height

      let cam = cameraAt(show, t, here)
      let k = (Math.min(W, H) / VISIBLE) * cam.zoom
      if (overview) {
        const { bounds } = u
        const bw = bounds.x1 - bounds.x0 + 2
        const bh = bounds.y1 - bounds.y0 + 2
        k = Math.min(W / bw, H / bh)
        cam = { x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2, zoom: 1 }
      }
      const weight = strokeFor(k, theme.weight)
      const sx = (x: number) => W / 2 + (x - cam.x) * k
      const sy = (y: number) => H / 2 + (y - cam.y) * k

      p.background(theme.bg)
      drawBackdrop(p, u, cam, k, W, H)

      // The pieces in view, in two passes around the ball.
      const x0 = cam.x - W / 2 / k - 1.5
      const x1 = cam.x + W / 2 / k + 1.5
      const y0 = cam.y - H / 2 / k - 1.5
      const y1 = cam.y + H / 2 / k + 1.5
      const visible: Placed[] = []
      for (const placed of u.pieces) {
        if (placed.cells.some(([c, r]) => c >= x0 && c <= x1 && r >= y0 && r <= y1)) visible.push(placed)
      }
      const ctxFor = (placed: Placed): PieceCtx => {
        const local = here.local - placed.start
        return {
          k,
          t: local,
          since: local - placed.lane.fire,
          ink: theme.ink,
          bg: theme.bg,
          weight,
          color: placed.ballIn.color,
          theme,
        }
      }
      const pass = (which: 'draw' | 'over') => {
        for (const placed of visible) {
          const fn = which === 'draw' ? placed.piece.draw : placed.piece.over
          if (!fn) continue
          p.push()
          p.translate(sx(placed.col), sy(placed.row))
          p.scale(placed.mirror, 1)
          fn.call(placed.piece, p, placed.state, ctxFor(placed))
          p.pop()
        }
      }
      pass('draw')

      // The ball, with a short trail when it is moving fast.
      if (!here.hidden && here.scale > 0) {
        const spin = (here.x - u.pieces[0].col) / R
        if (!here.ball.ghost) {
          for (let i = 4; i >= 1; i--) {
            const back = show.at(t - i * 0.022)
            if (back.universe !== u || back.ball.id !== here.ball.id || back.hidden) continue
            const d = Math.hypot(back.x - here.x, back.y - here.y)
            if (d < 0.08) continue
            p.push()
            p.noStroke()
            const c = p.color(here.ball.color)
            c.setAlpha(90 - i * 18)
            p.fill(c)
            p.circle(sx(back.x), sy(back.y), 2 * R * k * back.scale * (1 - i * 0.12))
            p.pop()
          }
        }
        // The streak's direction is the lane's, in the piece's hand.
        const angle = Math.atan2(Math.sin(here.angle), here.placed.mirror * Math.cos(here.angle))
        ball(p, k, theme.ink, weight, here.ball.color, sx(here.x), sy(here.y), spin, here.scale, here.stretch, angle, here.ball.ghost)
      }

      pass('over')

      drawTransitions(p, show, t, here, sx, sy, W, H)
    }
  }

  instance = new p5(sketch)

  return {
    setOverview(on) {
      overview = on
    },
    destroy() {
      instance?.remove()
      instance = null
    },
  }
}

function drawBackdrop(p: p5, u: Universe, cam: Camera, k: number, W: number, H: number): void {
  if (u.backdrop === 'plain') return
  const c0 = Math.floor(cam.x - W / 2 / k) - 1
  const c1 = Math.ceil(cam.x + W / 2 / k) + 1
  const r0 = Math.floor(cam.y - H / 2 / k) - 1
  const r1 = Math.ceil(cam.y + H / 2 / k) + 1
  const ink = p.color(u.theme.ink)
  p.push()
  if (u.backdrop === 'dots') {
    ink.setAlpha(46)
    p.noStroke()
    p.fill(ink)
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        p.circle(W / 2 + (c - 0.5 - cam.x) * k, H / 2 + (r - 0.5 - cam.y) * k, Math.max(1.5, k * 0.012))
      }
    }
  } else if (u.backdrop === 'rules') {
    ink.setAlpha(26)
    p.stroke(ink)
    p.strokeWeight(1)
    for (let r = r0; r <= r1; r++) {
      const y = H / 2 + (r + 0.5 - cam.y) * k
      p.line(0, y, W, y)
    }
  } else {
    p.noStroke()
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const n = 1 + Math.floor(hash(c, r, 1) * 2)
        for (let i = 0; i < n; i++) {
          const fx = hash(c, r, 10 + i)
          const fy = hash(c, r, 20 + i)
          const size = 0.6 + hash(c, r, 30 + i) * 1.6
          const star = p.color(u.theme.ink)
          star.setAlpha(60 + hash(c, r, 40 + i) * 90)
          p.fill(star)
          p.circle(W / 2 + (c - 0.5 + fx - cam.x) * k, H / 2 + (r - 0.5 + fy - cam.y) * k, size)
        }
      }
    }
  }
  p.pop()
}

/**
 * The cut between worlds: an iris that closes on the portal the ball went
 * into, in the ink of the world being left, holds shut for a beat, and
 * opens on the portal it comes out of. A door, not a glitch.
 */
function drawTransitions(
  p: p5,
  show: Show,
  t: number,
  here: ShowPoint,
  sx: (x: number) => number,
  sy: (y: number) => number,
  W: number,
  H: number,
): void {
  const u = here.universe
  const seg = here.placed.lane.segs[here.seg]

  if (here.placed.piece.name === 'portal' && seg.portal) {
    // How far into the transit, by the clock rather than the eased path:
    // 0 at the cut for 'in', 1 at the cut for 'out'.
    const f = seg.portal === 'out' ? here.raw : 1 - here.raw
    const shade = seg.portal === 'in' && u.index > 0 ? show.universe(u.index - 1).theme.ink : u.theme.ink
    // The iris closes over the second half of the way in and opens after
    // the first half of the way out, so it holds shut for a beat at the cut.
    const shut = seg.portal === 'out' ? clamp((f - 0.35) / 0.55) : clamp((f - 0.1) / 0.45)
    const radius = Math.hypot(W, H) * 0.6 * (1 - easeInOutCubic(shut))
    const rim = Math.hypot(W, H)
    p.push()
    p.noFill()
    p.stroke(shade)
    p.strokeWeight(rim)
    p.circle(sx(here.x), sy(here.y), radius * 2 + rim)
    p.pop()
  }
  // The very first frames of the show: fade up from ink.
  if (t < TRANSIT * 2 && u.index === 0 && here.local < TRANSIT * 2) {
    const c = p.color(u.theme.ink)
    c.setAlpha(255 * (1 - clamp(t / (TRANSIT * 2))))
    p.push()
    p.noStroke()
    p.fill(c)
    p.rect(W / 2, H / 2, W, H)
    p.pop()
  }
}
