import type p5 from 'p5'
import { ball, R, type Pt } from '../../../../parts'
import { alpha, scenery } from './kit'
import { AT, bar } from './music'
import type { LifeShow } from './show'
import { carlAt, INK } from './worlds'
import { drawBalloon, BALLOON_SIZE } from './props/balloon'
import { drawBowTie } from './inside/ties-tie'

/**
 * The two of them, drawn (the stage draws no ball in this show: `LifeShow.at` hands it none).
 *
 * Carl is a rounded square: stiff and steady, the film's own shape for him. He does not roll; he slides, and he
 * leans with the slope under him, and stands up straight in the air, so a hop reads as a box tossed, not a wheel. A
 * part can say otherwise for a stretch (`Built.pose`: a lean, a bow, a slump, a squash on landing).
 *
 * Ellie is round and rolls, the way every ball in this house has always been drawn (`parts.ts` `ball`).
 *
 * Both leave the stage's short trail when they move. The balloon is Carl's from the hospital on: tied to his top
 * corner, it lags behind him as a balloon in still air does, and leans a little.
 *
 * One of these stands in every world's scenery, last, and draws in its `over`, so the two of them come after every
 * part's drawing and before every part's front: where the stage would have drawn a ball.
 */

export interface CastState {
  show: LifeShow | null
}

/** Carl's half-width: the same footprint as a ball, so every lane built for a ball holds him. */
export const HALF = R
/** How round his corners are, in cells. */
const CORNER = 0.075
/** The balloon is his from the cut into the hospital to the end. */
export const BALLOON_FROM = AT.hospital
/**
 * The bow tie is his from the last morning at the tie machine to the end, as the old Carl's is in the film: she ties
 * it on jar bar 48 (`ties.ts` draws it while it settles), and the cast carries it from here, across every cut after.
 */
export const BOW_FROM = bar('jar', 48) + 0.6
/** Where it floats, from his centre, at rest. */
export const BALLOON_REST: Pt = [0.24, -1.42]

/** Carl, a rounded square, at (x, y) in pixels, turned `tilt`, flattened `squash` onto his bottom. */
export function drawCarl(p: p5, k: number, weight: number, color: string, x: number, y: number, tilt = 0, squash = 0, scale = 1, light = 1): void {
  if (scale <= 0.02) return
  const s = 2 * HALF * k * scale
  const h = s * (1 - squash)
  const w = s * (1 + squash * 0.6)
  p.push()
  p.translate(x, y)
  p.rotate(tilt)
  // Flattened onto his bottom: the bottom edge stays where it is.
  p.translate(0, (s - h) / 2)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * Math.min(1, scale * 1.5 + 0.3))
  p.fill(alpha(p, color, light))
  p.rectMode(p.CENTER)
  p.rect(0, 0, w, h, CORNER * k * scale)
  p.pop()
}

/** The slope Carl leans with at `t`: the way he is going, where he is going along something, and upright in the air. */
function slopeAt(show: LifeShow, t: number): number {
  const leg = show.owner(t)
  const from = show.legs[leg].from
  const to = show.legs[leg].to
  let sum = 0
  let n = 0
  for (const dt of [-0.08, -0.04, 0, 0.04, 0.08]) {
    const a = Math.max(from, Math.min(to - 1e-4, t + dt - 0.03))
    const b = Math.max(from, Math.min(to - 1e-4, t + dt + 0.03))
    if (b - a < 0.01) continue
    const p = show.where(a)
    const q = show.where(b)
    const vx = (q[0] - p[0]) / (b - a)
    const vy = (q[1] - p[1]) / (b - a)
    const speed = Math.abs(vx)
    if (speed < 0.05) {
      n++
      continue
    }
    // Along a slope he leans with it, either way he is going; a steep drop or a climb is not a slope.
    const slope = Math.atan2(vy, Math.abs(vx)) * Math.sign(vx)
    const along = Math.max(0, Math.min(1, (speed - 0.1) / 0.5)) * (Math.abs(slope) < 0.9 ? 1 : 0)
    sum += Math.max(-0.7, Math.min(0.7, slope)) * along
    n++
  }
  return n ? sum / n : 0
}

/** Where Carl is at `s`, carried into leg `leg`'s cells across any cut between (so what lags him lags on the screen). */
function carlIn(show: LifeShow, s: number, leg: number): Pt {
  const own = show.owner(s)
  const [x, y] = show.where(s)
  if (own === leg) return [x, y]
  let dx = 0
  let dy = 0
  if (own < leg) for (let i = own; i < leg; i++) { const [a, b] = show.shift(i, i + 1); dx += a; dy += b }
  else for (let i = own; i > leg; i--) { const [a, b] = show.shift(i, i - 1); dx += a; dy += b }
  return [x + dx, y + dy]
}

/** Where the balloon's string is tied at `s`, in leg `leg`'s cells: his top corner, or (at the end) where it is tied off. */
function anchorIn(show: LifeShow, s: number, leg: number): Pt {
  const [cx, cy] = carlIn(show, s, leg)
  const own: Pt = [cx + HALF * 0.7, cy - HALF * 0.9]
  const tie = show.tie
  if (!tie || s < tie.from || show.owner(s) !== show.owner(tie.from)) return own
  const u = Math.min(1, (s - tie.from) / 1.2)
  const e = u * u * (3 - 2 * u)
  return [own[0] + (tie.at[0] - own[0]) * e, own[1] + (tie.at[1] - own[1]) * e]
}

/** The balloon at `t`: where it is and where it is tied, in the cells of the leg on the stage. Null before it is his. */
export function balloonAt(show: LifeShow, t: number): { at: Pt; anchor: Pt; sway: number } | null {
  if (t < BALLOON_FROM) return null
  const leg = show.owner(t)
  // It follows where it is tied with a lag: an average of where it would rest over the last second and a half,
  // the recent weighing most. No overshoot: a balloon in still air is all drag.
  const rest: Pt = [BALLOON_REST[0] - HALF * 0.7, BALLOON_REST[1] + HALF * 0.9]
  let x = 0
  let y = 0
  let w = 0
  for (let i = 0; i <= 30; i++) {
    const s = Math.max(BALLOON_FROM, t - i * 0.05)
    const [ax, ay] = anchorIn(show, s, leg)
    const wi = Math.exp(-(i * 0.05) / 0.4)
    x += (ax + rest[0]) * wi
    y += (ay + rest[1]) * wi
    w += wi
  }
  x /= w
  y /= w
  const anchor = anchorIn(show, t, leg)
  // The string is taut: the balloon rides it at its length from the knot, drifting a little in the air.
  const drift = Math.sin(t * 0.9) * 0.05 + Math.sin(t * 0.37 + 1) * 0.04
  let dx = x + drift - anchor[0]
  let dy = y - anchor[1]
  const d = Math.hypot(dx, dy) || 1
  const L = BALLOON_SIZE.string + BALLOON_SIZE.ry
  dx = (dx / d) * L
  dy = (dy / d) * L
  const at: Pt = [anchor[0] + dx, anchor[1] + dy]
  return { at, anchor, sway: Math.atan2(dx, -dy) * 0.6 }
}

export const cast = scenery<CastState>({
  name: 'cast',
  draw: () => {},
  over: (p, s, c) => {
    const show = s.show
    if (!show) return
    const t = c.t
    const { k, weight } = c
    const here = show.at(t)
    const leg = show.owner(t)
    const trail = (get: (u: number) => { x: number; y: number; scale: number } | null, shape: (x: number, y: number, size: number, a: number) => void) => {
      const now = get(t)
      if (!now) return
      for (let i = 4; i >= 1; i--) {
        const u = t - i * 0.022
        if (show.owner(u) !== leg) continue
        const back = get(u)
        if (!back || back.scale <= 0.02) continue
        if (Math.hypot(back.x - now.x, back.y - now.y) < 0.08) continue
        shape(back.x * k, back.y * k, back.scale * (1 - i * 0.12), (90 - i * 18) / 255)
      }
    }

    // Ellie, round, rolling.
    const ellie = show.ellie(t)
    if (ellie && (ellie.scale ?? 1) > 0.02) {
      trail(
        (u) => {
          const e = show.ellie(u)
          return e ? { x: e.x, y: e.y, scale: e.scale ?? 1 } : null
        },
        (x, y, size, a) => {
          p.push()
          p.noStroke()
          p.fill(alpha(p, ellie.color, a))
          p.circle(x, y, 2 * R * k * size)
          p.pop()
        },
      )
      const spin = ellie.x / R
      const angle = ellie.angle ?? 0
      ball(p, k, INK, weight, ellie.color, ellie.x * k, ellie.y * k, spin, ellie.scale ?? 1, ellie.stretch ?? 1, angle, false)
    }

    // The balloon, behind him.
    const b = balloonAt(show, t)
    if (b) drawBalloon(p, k, weight, b.at, b.anchor, b.sway)

    // Carl, square, sliding.
    if (here.hidden || here.scale <= 0.02) return
    const color = carlAt(t)
    trail(
      (u) => {
        const h = show.at(u)
        return h.hidden ? null : { x: h.x, y: h.y, scale: h.scale }
      },
      (x, y, size, a) => {
        p.push()
        p.noStroke()
        p.fill(alpha(p, color, a))
        p.rectMode(p.CENTER)
        p.rect(x, y, 2 * HALF * k * size, 2 * HALF * k * size, CORNER * k * size)
        p.pop()
      },
    )
    const pose = show.pose(t)
    const tilt = pose?.tilt ?? slopeAt(show, t)
    drawCarl(p, k, weight, color, here.x * k, here.y * k, tilt, pose?.squash ?? 0, here.scale)
    if (t >= BOW_FROM) drawBowTie(p, k, weight, here.x * k, here.y * k, tilt, pose?.squash ?? 0, here.scale)
  },
})
