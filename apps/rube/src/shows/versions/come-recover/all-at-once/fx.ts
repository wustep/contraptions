import type p5 from 'p5'
import { R } from '../../../../parts'
import type { ShowBall } from '../../../../show'
import { scenery } from './kit'
import type { MultiverseShow } from './show'
import { EYE_PUPIL, EYE_WHITE } from './worlds'

/**
 * The googly eyes. Waymond sticks them on everything, and he wears one himself. Evelyn gets hers on the great hit,
 * when she chooses to be kind, and Joy gets hers when her mother pulls her back.
 *
 * An eye is drawn over its ball in every world from the moment it is given: a white disc with an ink ring and a
 * black pupil loose inside it. The pupil is a heavy bead in a round cage. It hangs at the bottom under gravity, and
 * when the ball speeds up, stops or turns it is thrown the other way, swings and settles. It is worked out afresh
 * for every frame from the ball's path over the second before, so it is a pure function of the clock like
 * everything else, and scrubbing gives the same swing.
 */

/** Who wears one, and from when (show seconds). */
export interface EyeSpec {
  who: 'evelyn' | 'joy' | 'waymond'
  from: number
  /**
   * The eye arrives at `from` rather than having always been there: it slaps on oversized and squashes down to
   * its size with an overshoot, and its pupil is flung round the rim and settles.
   */
  arrive?: boolean
  /** With the arrival, a burst of warm light behind the ball: the great hit. */
  burst?: boolean
}

/** An arriving eye's size, `u` seconds after it lands: a slap, a squash past its size, a bounce, rest. */
const pop = (u: number): number => (u < 0 ? 0 : 1 + 0.48 * Math.exp(-u / 0.08) * Math.cos((2 * Math.PI * u) / 0.2))
/** How long an arriving pupil keeps its fling before the usual drag has it again. */
const FLING = 0.9

/**
 * The eye's size and place on the ball, in ball radii: the white's radius, and how far up it sits. It is big and
 * nearly centred, so the ball becomes a face with one great eye, and it covers the dot the stage draws to show the
 * ball rolling (at 0.48 radii from the middle), which would otherwise wander under it like a mole.
 */
const WHITE = 0.6
const UP = 0.02
/** How far towards its heading the eye sits: a ball looks where it is going. */
const AHEAD = 0.04
const PUPIL = 0.52
/** Gravity the bead feels (cells/s², the laundromat's), how stiff its swing is and how fast it dies. */
const G = 12
const STIFF = 90
const DAMP = 7.5
const STEP = 1 / 120
const MEMORY = 1.2

type Where = (t: number) => { x: number; y: number; seen: boolean } | null

/**
 * The bead's offset in the white (fractions of how far it can go, -1..1) at `t`, from the ball's path `at`. An
 * eye that `arrive`s at a time starts there, its bead flung from the top of the rim round the cage, with little
 * drag at first so it goes round a turn or so before it settles.
 */
function bead(at: Where, t: number, arrive?: number): { x: number; y: number; hx: number } {
  // Start at rest, hanging, a second back (or from when the ball was first seen), then step forward.
  let t0 = t - MEMORY
  const ok = (s: number) => {
    const q = at(s)
    return !!q && q.seen
  }
  const flung = arrive !== undefined && arrive > t0
  if (flung) t0 = arrive
  while (t0 < t && !ok(t0)) t0 += 0.05
  let px = 0
  let py = flung ? -1 : 1
  let vx = flung ? 11 : 0
  let vy = 0
  let hx = 0
  const pos = (s: number) => at(s) ?? at(t)!
  for (let s = t0; s <= t + 1e-9; s += STEP) {
    const a = pos(s - STEP)
    const b = pos(s)
    const c = pos(s + STEP)
    // The ball's acceleration; a teleport (a jump) shows as a huge one, so it is ignored.
    let ax = (c.x - 2 * b.x + a.x) / (STEP * STEP)
    let ay = (c.y - 2 * b.y + a.y) / (STEP * STEP)
    if (Math.hypot(ax, ay) > 400) {
      ax = 0
      ay = 0
    }
    // In the ball's frame the bead feels gravity and the ball's acceleration backwards.
    const fx = -ax
    const fy = G - ay
    const f = Math.hypot(fx, fy) || 1
    const tx = fx / f
    const ty = fy / f
    const k = Math.min(1, f / G)
    const drag = flung ? DAMP * (0.18 + 0.82 * Math.min(1, Math.max(0, (s - arrive!) / FLING) ** 2)) : DAMP
    vx += (STIFF * k * (tx - px) - drag * vx) * STEP
    vy += (STIFF * k * (ty - py) - drag * vy) * STEP
    px += vx * STEP
    py += vy * STEP
    const r = Math.hypot(px, py)
    if (r > 1) {
      // The cage: it rolls round the rim.
      px /= r
      py /= r
      const vn = vx * px + vy * py
      if (vn > 0) {
        vx -= vn * px * 1.6
        vy -= vn * py * 1.6
      }
    }
    // Where it is heading, smoothed: the eye leans that way.
    const vxBall = (c.x - a.x) / (2 * STEP)
    hx += (Math.max(-1, Math.min(1, vxBall / 1.5)) - hx) * Math.min(1, STEP * 4)
  }
  return { x: px, y: py, hx }
}

/**
 * The burst of light behind a ball on the great hit, `u` seconds after it: warm light that swells out from round
 * the ball and fades, clear of the ball itself so its colour stays its own.
 */
function burst(p: p5, k: number, x: number, y: number, u: number, lit: (hex: string) => string): void {
  if (u < 0 || u > 0.7) return
  const grow = 1 - Math.exp(-u / 0.12)
  const outer = R * (2.4 + 7 * grow)
  const a = 0.8 * (1 - u / 0.7) ** 1.5
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Lantern gold: it has to show on the laundromat's pale tile as well as in the dark.
  const warm = lit('#FFC95A')
  const rgb = [1, 3, 5].map((i) => parseInt(warm.slice(i, i + 2), 16)).join(', ')
  const g = ctx.createRadialGradient(x * k, y * k, R * 1.05 * k, x * k, y * k, outer * k)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(0.35, `rgba(${rgb}, ${a * 0.45})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x * k, y * k, outer * k, 0, Math.PI * 2)
  // Not over the ball: its own disc is cut out of the light.
  ctx.arc(x * k, y * k, R * 1.02 * k, 0, Math.PI * 2, true)
  ctx.fill()
  ctx.restore()
}

/** One googly eye on a ball at (x, y) in the piece's cells, `r` its radius in cells. */
export function googly(p: p5, k: number, ink: string, weight: number, x: number, y: number, look: { x: number; y: number; hx: number }, scale = 1, lit: (hex: string) => string = (h) => h): void {
  const w = WHITE * R * scale
  const cx = (x + look.hx * AHEAD * R * scale) * k
  const cy = (y - UP * R * scale) * k
  p.push()
  p.stroke(lit(ink))
  p.strokeWeight(weight * 0.5)
  p.fill(lit(EYE_WHITE))
  p.circle(cx, cy, 2 * w * k)
  const reach = w * (1 - PUPIL) * 0.92
  p.noStroke()
  p.fill(lit(EYE_PUPIL))
  p.circle(cx + look.x * reach * k, cy + look.y * reach * k, 2 * w * PUPIL * k)
  // A glint on the pupil, fixed to the light, not the swing.
  p.fill(lit(EYE_WHITE))
  p.circle(cx + look.x * reach * k - w * PUPIL * 0.35 * k, cy + look.y * reach * k - w * PUPIL * 0.35 * k, w * PUPIL * 0.45 * k)
  p.pop()
}

export interface EyesState {
  /** Bound once the show is built: the eyes read where the balls are from it. */
  show: MultiverseShow | null
  specs: EyeSpec[]
  /** How a world's light falls on a colour at a place and time, where it has lighting of its own (the laundromat's dark). */
  shade?: (hex: string, x: number, y: number, t: number) => string
}

/** The eyes of every ball that wears one, over everything, in every world. One of these goes last in each world's `after`, each with its own state. */
export const eyes = () =>
  scenery<EyesState>({
    name: 'googly-eyes',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      for (const spec of s.specs) {
        if (t < spec.from) continue
        // Where the ball is: cheap enough to sample a hundred times a frame.
        const find = (time: number): ShowBall | null => {
          if (spec.who === 'evelyn') {
            const [x, y] = show.where(time)
            const [ox, oy] = show.offset(time)
            return { id: 0, x: x + ox, y: y + oy, color: '' }
          }
          return spec.who === 'joy' ? show.joy(time) : show.waymond(time)
        }
        let b = find(t)
        if (spec.who === 'evelyn') {
          const h = show.at(t)
          b = h.hidden || h.scale <= 0.3 ? null : { id: 0, x: h.x, y: h.y, color: '', scale: h.scale }
        }
        if (!b || (b.scale ?? 1) <= 0.3) continue
        // The path it is swung by: in the world on the stage now, so a jump's teleport does not throw it.
        const u = show.indexAt(t)
        const look = bead(
          (time) => {
            if (time < spec.from - MEMORY) return null
            if (show.indexAt(time) !== u) return null
            const q = find(time)
            return q ? { x: q.x, y: q.y, seen: true } : null
          },
          t,
          spec.arrive ? spec.from : undefined,
        )
        const shade = s.shade
        const lit = shade ? (hex: string) => shade(hex, b!.x, b!.y, t) : (hex: string) => hex
        if (spec.burst) burst(p, c.k, b.x, b.y, t - spec.from, lit)
        const size = spec.arrive && t - spec.from < 1 ? pop(t - spec.from) : 1
        googly(p, c.k, c.ink, c.weight, b.x, b.y, look, (b.scale ?? 1) * size, lit)
      }
    },
  })
