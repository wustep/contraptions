import type p5 from 'p5'
import { ball, R, type Pt } from '../../../../parts'
import { alpha, scenery } from './kit'
import { AGE, AT, bar, CUT } from './music'
import type { LifeShow } from './show'
import { carlAt, INK } from './worlds'
import { drawBalloon, BALLOON_SIZE } from './props/balloon'
import { drawBowTie } from './inside/ties-tie'
import { FUN } from './church/church'

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
 * What stirs the balloon in the still air. The church's one toll goes through it: a sharp swing aside on its string
 * and a long slow sway back (a damped swing from rest: `amp` cells aside at its fullest, over a `period`, dying away
 * over `decay` seconds), and a little at the answer.
 */
export const STIRS: { t: number; amp: number; period: number; decay: number }[] = [
  { t: FUN.toll, amp: 0.2, period: 1.7, decay: 1.4 },
  { t: FUN.answer, amp: 0.07, period: 1.7, decay: 1.2 },
]
/**
 * At home, tied to her chair, it leans the smallest way toward him on the piano's phrase notes once he has sat down
 * (her last gesture at her bedside was the same: the smallest roll toward him). Each lean eases up from nothing to
 * `amp` cells (negative is toward his chair) at `rise` seconds after the note, and back, slowly.
 */
export const LEANS: { t: number; amp: number; rise: number }[] = [
  { t: 219.696, amp: -0.07, rise: 0.5 },
  { t: 221.884, amp: -0.06, rise: 0.5 },
  { t: 226.203, amp: -0.06, rise: 0.55 },
]
/**
 * Where he draws the string in short and lets it out again (show seconds). He comes into the ward with it held close
 * (it is in at the cut already gathered), so it rides in the frame over him in the close on the cut, under Zoom too,
 * and lets it up as the camera opens and he reaches for the lamp. At home, as the latch gives, he gathers it in so
 * the balloon comes in under the lintel with him, before the door shuts behind him, and past the wall between the
 * door and the bay; he lets it out again in the bay, before he ties it to her chair. `string` is its gathered length;
 * it is taken in over [in0, in1] and let out over [out0, out1], quintic eased.
 */
export const GATHERS: { in0: number; in1: number; out0: number; out1: number; string: number }[] = [
  { in0: AT.hospital - 1.5, in1: AT.hospital - 1, out0: 181.3, out1: 183.0, string: 0.8 },
  { in0: 208.2, in1: 209.3, out0: 212.7, out1: 214.2, string: 0.3 },
]
/**
 * Where her one dot, her face, looks while she is still: up at the clouds on the hill; and at him through the five
 * mornings at the tie wheel and the dance, from the first tie to the picture lamp, she at his right, so up and to her
 * left (`at`, the dot's angle on the screen, y down). Rolling, her dot rolls with her, as everywhere; it comes round to him as she comes to rest (by her speed,
 * smoothed), so at the crest, held at arm's length, she is looking at him, not at the floor. Eased in and out over
 * `ease` seconds at the span's ends.
 */
export const LOOKS: { from: number; to: number; ease: number; at: number | ((show: LifeShow, t: number) => number) }[] = [
  // In her armchair at the new bay, at him as he comes in and sits, a little above his middle (not at her lap, as the
  // roll had it); then, across the cut onto the blanket, turning up to the clouds the engine builds (up, and a little
  // toward the shapes), carried just across the next cut onto the mobile until she rolls off to the cradle. One span,
  // its target turning, so her face never drops back to her roll between the two.
  {
    from: bar('waltz', 27) + 0.2,
    to: CUT.nursery + 0.6,
    ease: 0.9,
    at: (show, t) => turnTo(towardHim(show, t), -1.35, (t - CUT.hill - 0.3) / 1.2),
  },
  { from: bar('jar', 39), to: bar('jar', 56), ease: 0.8, at: -2.3 },
]
/** The angle from her to a little above his middle (his face, as far as a square has one), on the screen. */
function towardHim(show: LifeShow, t: number): number {
  const e = show.ellie(t)
  const c = show.at(t)
  return e ? Math.atan2(c.y - 0.12 - e.y, c.x - e.x) : 0
}
/** From angle `a` to angle `b` the short way round, `u` of the way (0..1, eased). */
function turnTo(a: number, b: number, u: number): number {
  const v = Math.max(0, Math.min(1, u))
  const d = b - a
  return a + (d - 2 * Math.PI * Math.round(d / (2 * Math.PI))) * v * v * (3 - 2 * v)
}
export function lookOf(show: LifeShow, t: number, own: number): number {
  for (const l of LOOKS) {
    if (t <= l.from || t >= l.to) continue
    const edge = Math.min(1, (t - l.from) / l.ease, (l.to - t) / l.ease)
    // Her speed, smoothed over a third of a second: still or swaying, she looks at him; rolling at two cells a second
    // or more, her dot rolls with her.
    // Sampled inside the place she is in: her cells change at a cut, which is no speed.
    const leg = show.legs[show.owner(t)]
    const at = (s: number) => show.ellie(Math.max(leg.from + 1e-4, Math.min(leg.to - 1e-4, s)))
    let v = 0
    for (const dt of [-0.15, -0.05, 0.05, 0.15]) {
      const a = at(t + dt - 0.05)
      const b = at(t + dt + 0.05)
      if (a && b) v += Math.abs(b.x - a.x) / 0.1 / 4
    }
    const still = 1 - Math.min(1, v / 2)
    const w = edge * edge * (3 - 2 * edge) * still * still * (3 - 2 * still)
    const d = (typeof l.at === 'number' ? l.at : l.at(show, t)) - own
    return own + w * (d - 2 * Math.PI * Math.round(d / (2 * Math.PI)))
  }
  return own
}
function stir(t: number): number {
  let x = 0
  for (const s of STIRS) {
    const u = t - s.t
    if (u > 0) x += s.amp * Math.exp(-u / s.decay) * Math.sin((2 * Math.PI * u) / s.period)
  }
  for (const l of LEANS) {
    const u = (t - l.t) / l.rise
    if (u > 0) x += l.amp * u * u * Math.exp(2 * (1 - u))
  }
  return x
}

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

/**
 * How far Ellie's mark (her dot, which way she looks) is turned at `t`: the ball's own roll, her place over `R`, in the
 * place she is in. At a match cut her place on the screen carries across but her place in the new world's cells does
 * not, so the roll alone would flick her dot round on the cut: across it she goes on looking the way she was, and
 * turns to the new place's own look over `LOOK_ROUND` seconds (the short way round, eased at both ends).
 */
const LOOK_ROUND = 1.6
export function ellieSpin(show: LifeShow, t: number): number {
  const e = show.ellie(t)
  if (!e) return 0
  const own = e.x / R
  const leg = show.owner(t)
  const t0 = leg > 0 ? show.legs[leg].from : -Infinity
  if (t - t0 >= LOOK_ROUND) return own
  const before = show.ellie(t0 - 1e-4)
  const after = show.ellie(t0 + 1e-4)
  if (!before || !after) return own
  // Only where she is in the same place in the picture on both sides (not where the cut finds her somewhere else).
  const [bx, by] = carry(show, [before.x, before.y], leg - 1, leg)
  if (Math.hypot(bx - after.x, by - after.y) > 0.05) return own
  const d = ellieSpin(show, t0 - 1e-4) - after.x / R
  const turn = d - 2 * Math.PI * Math.round(d / (2 * Math.PI))
  const u = Math.max(0, Math.min(1, (t - t0) / LOOK_ROUND))
  return own + turn * (1 - u * u * u * (u * (u * 6 - 15) + 10))
}

/**
 * The balloon's string at `t`, from the knot to where it is tied: its own length, or a tie's (`Tie.string`), taken in
 * over the second after the knot arrives (the balloon settling down to her) and let out again over 2.2 s after the
 * tie's span ends, so across the cut it rises back to its length. Quintic eases: no kick at either end.
 */
function stringAt(show: LifeShow, t: number): number {
  const ease = (u: number) => {
    const v = Math.max(0, Math.min(1, u))
    return v * v * v * (v * (v * 6 - 15) + 10)
  }
  let L = BALLOON_SIZE.string
  for (const tie of show.ties) {
    if (tie.string === undefined || t < tie.arrive - 0.1) continue
    const into = ease((t - (tie.arrive - 0.1)) / 1.2)
    const out = t < tie.to ? 0 : ease((t - tie.to) / 2.2)
    L += (tie.string - BALLOON_SIZE.string) * into * (1 - out)
  }
  for (const g of GATHERS) {
    const into = ease((t - g.in0) / (g.in1 - g.in0))
    const out = ease((t - g.out0) / (g.out1 - g.out0))
    L += (g.string - BALLOON_SIZE.string) * into * (1 - out)
  }
  return L
}

/**
 * The balloon at `t`: where it is and where it is tied, in the cells of the leg on the stage. Null before it is his.
 * Across the cut where a short tie ends (her bedside into the church), the knot is his again but the balloon goes on
 * from exactly where it was in the picture, and drifts over to where it rides on him while its string is let out.
 */
export function balloonAt(show: LifeShow, t: number): { at: Pt; anchor: Pt; sway: number } | null {
  const b = riding(show, t)
  if (!b) return null
  const leg = show.owner(t)
  for (const tie of show.ties) {
    if (tie.string === undefined || t < tie.to || t >= tie.to + 2.2) continue
    const was = riding(show, tie.to - 1e-4)
    const now = riding(show, tie.to + 1e-4)
    if (!was || !now || show.owner(tie.to + 1e-4) !== leg) continue
    const [wx, wy] = carry(show, was.at, show.owner(tie.to - 1e-4), leg)
    const u = Math.min(1, (t - tie.to) / 2.2)
    const left = 1 - u * u * u * (u * (u * 6 - 15) + 10)
    b.at = [b.at[0] + (wx - now.at[0]) * left, b.at[1] + (wy - now.at[1]) * left]
    b.sway += (was.sway - now.sway) * left
  }
  return b
}

/** Where the balloon rides at `t` on its string from where it is tied, lagging where it is tied in the still air. */
function riding(show: LifeShow, t: number): { at: Pt; anchor: Pt; sway: number } | null {
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
  const drift = Math.sin(t * 0.9) * 0.05 + Math.sin(t * 0.37 + 1) * 0.04 + stir(t)
  let dx = x + drift - anchor[0]
  let dy = y - anchor[1]
  const d = Math.hypot(dx, dy) || 1
  const L = stringAt(show, t) + BALLOON_SIZE.ry
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
      const spin = lookOf(show, t, ellieSpin(show, t))
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
