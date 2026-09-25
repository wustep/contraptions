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
}

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

/** The bead's offset in the white (fractions of how far it can go, -1..1) at `t`, from the ball's path `at`. */
function bead(at: Where, t: number): { x: number; y: number; hx: number } {
  // Start at rest, hanging, a second back (or from when the ball was first seen), then step forward.
  let t0 = t - MEMORY
  const ok = (s: number) => {
    const q = at(s)
    return !!q && q.seen
  }
  while (t0 < t && !ok(t0)) t0 += 0.05
  let px = 0
  let py = 1
  let vx = 0
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
    vx += (STIFF * k * (tx - px) - DAMP * vx) * STEP
    vy += (STIFF * k * (ty - py) - DAMP * vy) * STEP
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
        const look = bead((time) => {
          if (time < spec.from - MEMORY) return null
          if (show.indexAt(time) !== u) return null
          const q = find(time)
          return q ? { x: q.x, y: q.y, seen: true } : null
        }, t)
        const shade = s.shade
        googly(p, c.k, c.ink, c.weight, b.x, b.y, look, b.scale ?? 1, shade ? (hex) => shade(hex, b.x, b.y, t) : undefined)
      }
    },
  })
