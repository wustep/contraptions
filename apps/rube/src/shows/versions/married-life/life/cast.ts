import type p5 from 'p5'
import { ball, R, type Pt } from '../../../../parts'
import { alpha, scenery } from './kit'
import { AGE, AT, bar } from './music'
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
 * Both leave the stage's short trail when they move. The balloon comes in with Carl at the hospital, tied to his top
 * corner; it lags behind him as a balloon in still air does, and leans a little. He gives it to her at her bedside
 * (`show.ties`: the knot goes across to her); across the cut to the church it is his again, over the pew, and it
 * drifts back over him: she is gone. At the end he ties it to her chair.
 *
 * One of these stands in every world's scenery, last, and draws in its `over`, so the two of them come after every
 * part's drawing and before every part's front: where the stage would have drawn a ball.
 */

export interface CastState {
  show: LifeShow | null
}

/** Carl's half-width: the same footprint as a ball, so every lane built for a ball holds him. */
export const HALF = R
/** How round his corners are, in cells: young, and old (softer). */
const CORNER = 0.075
const CORNER_OLD = 0.09
/** The balloon comes in with him at the cut into the hospital, and is in the picture from there to the end. */
export const BALLOON_FROM = AT.hospital
/**
 * The bow tie is his from the last morning at the tie machine to the end, as the old Carl's is in the film: she ties
 * it on jar bar 48 (`ties.ts` draws it while it settles), and the cast carries it from here, across every cut after.
 */
export const BOW_FROM = bar('jar', 48) + 0.6
/** Where it floats, from his centre, at rest. */
export const BALLOON_REST: Pt = [0.24, -1.42]

/**
 * How the years sit on them, under whatever a part asks of them: Carl settles (a touch shorter and wider), his
 * corners soften, and when he walks he stoops a little toward where he is going, more as he goes faster; Ellie
 * settles a little onto the floor. All of it follows `AGE`, so it comes on with the years and never pops.
 */
export function bearingOfAge(show: LifeShow, t: number): { stoop: number; settle: number; corner: number; ellie: number } {
  const age = AGE(t)
  const leg = show.legs[show.owner(t)]
  const a = Math.max(leg.from, t - 0.07)
  const b = Math.min(leg.to - 1e-4, t + 0.07)
  const vx = b - a > 0.02 ? (show.where(b)[0] - show.where(a)[0]) / (b - a) : 0
  const u = Math.max(0, Math.min(1, (Math.abs(vx) - 0.05) / 0.35))
  return {
    stoop: 0.06 * age * Math.sign(vx) * u * u * (3 - 2 * u),
    settle: 0.07 * age,
    corner: CORNER + (CORNER_OLD - CORNER) * age,
    ellie: 0.05 * age,
  }
}

/** How Carl holds himself at `t`: a part's pose (or the slope's lean), with the years' settle and stoop on top. */
export function carlBearing(show: LifeShow, t: number, years = bearingOfAge(show, t)): { tilt: number; squash: number } {
  const pose = show.pose(t)
  return { tilt: (pose?.tilt ?? slopeAt(show, t)) + years.stoop, squash: (pose?.squash ?? 0) + years.settle }
}

/** Carl, a rounded square, at (x, y) in pixels, turned `tilt`, flattened `squash` onto his bottom. */
export function drawCarl(p: p5, k: number, weight: number, color: string, x: number, y: number, tilt = 0, squash = 0, scale = 1, light = 1, corner = CORNER): void {
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
  p.rect(0, 0, w, h, corner * k * scale)
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
    // In the air (a hop's arc bends hard; a slope does not) he is upright: the slope's lean fades out. Measured over
    // a wider span than the lanes' own samples, so their corners never read as a bend.
    // (Three spans, as a landing's corner between two arcs can cancel in one of them.)
    const c = (a + b) / 2
    let air = 0
    for (const span of [0.08, 0.05, 0.03]) {
      const h = Math.min(span, c - from, to - 1e-4 - c)
      if (h <= 0.015) continue
      const ay = Math.abs(show.where(c + h)[1] - 2 * show.where(c)[1] + show.where(c - h)[1]) / (h * h)
      air = Math.max(air, Math.min(1, (ay - 0.5) / 1.5))
    }
    const speed = Math.abs(vx)
    if (speed < 0.05) {
      n++
      continue
    }
    // Along a slope he leans with it, either way he is going; a steep drop or a climb is not a slope (and the one
    // fades into the other, so going up a step never flips his lean from one frame to the next).
    const slope = Math.atan2(vy, Math.abs(vx)) * Math.sign(vx)
    const steep = Math.max(0, Math.min(1, (Math.abs(slope) - 0.55) / 0.4))
    const along = Math.max(0, Math.min(1, (speed - 0.1) / 0.5)) * (1 - steep * steep * (3 - 2 * steep)) * (1 - air * air * (3 - 2 * air))
    sum += Math.max(-0.7, Math.min(0.7, slope)) * along
    n++
  }
  return n ? sum / n : 0
}

/** A point in leg `from`'s cells, carried into leg `leg`'s across any cut between (so what lags lags on the screen). */
function carry(show: LifeShow, [x, y]: Pt, from: number, leg: number): Pt {
  if (from === leg) return [x, y]
  let dx = 0
  let dy = 0
  if (from < leg) for (let i = from; i < leg; i++) { const [a, b] = show.shift(i, i + 1); dx += a; dy += b }
  else for (let i = from; i > leg; i--) { const [a, b] = show.shift(i, i - 1); dx += a; dy += b }
  return [x + dx, y + dy]
}

/** Where Carl is at `s`, carried into leg `leg`'s cells. */
function carlIn(show: LifeShow, s: number, leg: number): Pt {
  return carry(show, show.where(s), show.owner(s), leg)
}

/**
 * Where the balloon's string is tied at `s`, in leg `leg`'s cells: his top corner, or where a tie span has it (to her
 * at her bedside, to her chair at the end), the knot carried across from him to it over the span's first moments.
 */
export function anchorIn(show: LifeShow, s: number, leg: number): Pt {
  const [cx, cy] = carlIn(show, s, leg)
  // His top corner, turned and flattened as a part poses him (the pose alone: cheap, and where he leans with it).
  const pose = show.pose(s)
  const tilt = pose?.tilt ?? 0
  const sq = (pose?.squash ?? 0) + 0.07 * AGE(s)
  const ox = HALF * 0.7 * (1 + 0.6 * sq)
  const oy = -HALF * 0.9 + 2 * HALF * sq
  const own: Pt = [cx + ox * Math.cos(tilt) - oy * Math.sin(tilt), cy + ox * Math.sin(tilt) + oy * Math.cos(tilt)]
  const here = show.owner(s)
  const tie = show.ties.find((t) => s >= t.from && s < t.to && here === show.owner(t.from))
  if (!tie) return own
  const u = Math.min(1, (s - tie.from) / Math.max(0.05, tie.arrive - tie.from))
  const e = u * u * u * (u * (u * 6 - 15) + 10)
  const [tx, ty] = carry(show, tie.at(s), here, leg)
  return [own[0] + (tx - own[0]) * e, own[1] + (ty - own[1]) * e]
}

/** The balloon at `t`: where it is and where it is tied, in the cells of the leg on the stage. Null before it is his. */
export function balloonAt(show: LifeShow, t: number): { at: Pt; anchor: Pt; sway: number } | null {
  if (t < BALLOON_FROM) return null
  const leg = show.owner(t)
  // It follows where it is tied with a lag: an average of where it would rest over the last second and a half,
  // the recent weighing most. No overshoot: a balloon in still air is all drag. The average is taken on a fixed grid
  // of instants and eased between two of them, so where the knot changes hands at a cut (a step in where it is
  // tied) the balloon still drifts smoothly: no sample ever slides across the step.
  const rest: Pt = [BALLOON_REST[0] - HALF * 0.7, BALLOON_REST[1] + HALF * 0.9]
  const D = 0.025
  const average = (g: number): Pt => {
    let ax = 0
    let ay = 0
    let w = 0
    for (let i = 0; i <= 60; i++) {
      const s = Math.max(BALLOON_FROM, g - i * D)
      const [px, py] = anchorIn(show, s, leg)
      const wi = Math.exp(-(i * D) / 0.4)
      ax += (px + rest[0]) * wi
      ay += (py + rest[1]) * wi
      w += wi
    }
    return [ax / w, ay / w]
  }
  const g0 = Math.floor(t / D) * D
  const f = (t - g0) / D
  const a0 = average(g0)
  const a1 = average(g0 + D)
  const x = a0[0] + (a1[0] - a0[0]) * f
  const y = a0[1] + (a1[1] - a0[1]) * f
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
    const years = bearingOfAge(show, t)
    // Their short trails fade with the years: the old don't streak.
    const streak = 1 - 0.75 * AGE(t)
    const trail = (get: (u: number) => { x: number; y: number; scale: number } | null, shape: (x: number, y: number, size: number, a: number) => void) => {
      const now = get(t)
      if (!now) return
      for (let i = 4; i >= 1; i--) {
        const u = t - i * 0.022
        if (show.owner(u) !== leg) continue
        const back = get(u)
        if (!back || back.scale <= 0.02) continue
        if (Math.hypot(back.x - now.x, back.y - now.y) < 0.08) continue
        shape(back.x * k, back.y * k, back.scale * (1 - i * 0.12), (streak * (90 - i * 18)) / 255)
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
      const size = ellie.scale ?? 1
      // Settled a little onto the floor with the years: flattened on the vertical about her bottom, under whatever
      // squash or stretch a part gives her.
      const foot = (ellie.y + R * size) * k
      p.push()
      p.translate(0, foot)
      p.scale(1, 1 - years.ellie)
      p.translate(0, -foot)
      ball(p, k, INK, weight, ellie.color, ellie.x * k, ellie.y * k, spin, size, ellie.stretch ?? 1, ellie.angle ?? 0, false)
      p.pop()
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
        p.rect(x, y, 2 * HALF * k * size, 2 * HALF * k * size, years.corner * k * size)
        p.pop()
      },
    )
    const { tilt, squash } = carlBearing(show, t, years)
    drawCarl(p, k, weight, color, here.x * k, here.y * k, tilt, squash, here.scale, 1, years.corner)
    if (t >= BOW_FROM) drawBowTie(p, k, weight, here.x * k, here.y * k, tilt, squash, here.scale)
  },
})
