import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, lerp } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, over, post, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../../parts'
import { drift, gearColor, snow, snowAt, snowWhite, wand } from './snow'

/**
 * A paraglider. Its wing is laid out on the snow under the track's end and
 * its seat, a sling on two risers, sits on a hump of snow just past it. The
 * ball drops off the track into the sling; the jerk comes up the lines and
 * lifts the wing's edge into the wind; the wing fills, cell by cell, comes
 * up off the snow in an arc about the seat and stands overhead, and takes
 * the weight. Seat and ball go up and across, swinging back under the wing
 * as it pulls and forward again as it slows, to a ledge one or two floors
 * up, where the sling is set down flat; the ball rolls out of it along the
 * ledge. The wing, with nothing under it, falls back over the ledge's end
 * and hangs there by its lines.
 *
 * The seat's path is one curve and the lane is the seat; the wing is where
 * the lines put it, a line's length from the seat along the swing, so the
 * ball never leaves the sling and the sling never leaves the wing.
 */
export interface ParagliderState {
  color: string
  white: string
  up: 1 | 2
}

/** Where the track stops, where the seat sits on its hump, and the ledge it is set down on. */
const END = 0
const SEAT: Pt = [0.3, 0.07]
const LEDGE_X0 = 0.9
const SET: number = 1.12
const POST = 1.3
/** Cartoon gravity for the drop into the sling. */
const G = 24
/** The risers' height to where they meet over the ball, the lines' length from there to the wing, the sling's half-width, the wing's span filled and its thickness. */
const RISERS = 0.24
const LINES = 0.2
const SLING = 0.16
const SPAN = 0.74
const THICK = 0.075
const CAMBER = 0.17
/** The wing laid out: where its middle lies on the snow. */
const LAID: Pt = [-0.27, 0.315]
const LAID_SPAN = 0.46

const T_DROP = (END + 0.5) / ROLL
const FALL = Math.sqrt((2 * SEAT[1]) / G)
const T_IN = T_DROP + FALL
/** The ball's way carries it on as it drops; the sling takes the rest off it, evenly, in this long. */
const CATCH = (2 * (SEAT[0] - END - ROLL * FALL)) / ROLL
const T_SEAT = T_IN + CATCH
const FILL = 0.62
const T_LIFT = T_SEAT + FILL

interface Flight {
  up: 1 | 2
  dur: number
  tDown: number
  lane: Lane
  seatAt(t: number): Pt
}

function flightFor(up: 1 | 2): Flight {
  const dur = up === 1 ? 1.5 : 1.95
  const tDown = T_LIFT + dur
  const land: Pt = [SET, -up]
  // One curve: out level over the snow first as the wing loads, then up the lift and in over the ledge from just above it.
  const c1: Pt = [0.78, 0.07]
  const c2: Pt = [0.66, -up - 0.13]
  const path = (u: number): Pt => {
    const v = 1 - u
    return [
      v * v * v * SEAT[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * land[0],
      v * v * v * SEAT[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * land[1],
    ]
  }
  const seatAt = (t: number): Pt => {
    if (t <= T_LIFT) return [SEAT[0], SEAT[1] + 0.012 * over(t, T_IN, T_IN + 0.05) * (1 - over(t, T_LIFT - 0.2, T_LIFT))]
    return path(easeInOutSine(clamp((t - T_LIFT) / dur)))
  }
  // Into the sling: the drop, then the sling taking the way off the ball.
  const xIn = END + ROLL * FALL
  const dropAt = (t: number): Pt => {
    const tau = t - T_DROP
    return [END + ROLL * tau, (G * tau * tau) / 2]
  }
  const catchAt = (t: number): Pt => {
    const f = clamp((t - T_IN) / CATCH)
    // From the track's pace to nothing, evenly: its place is a parabola's.
    const x = xIn + (SEAT[0] - xIn) * (2 * f - f * f)
    return [x, seatAt(t)[1]]
  }
  const ride = [...trace(dropAt, T_DROP, T_IN, 5), ...trace(catchAt, T_IN, T_SEAT, 6), ...trace(seatAt, T_SEAT, T_LIFT, 4), ...trace(seatAt, T_LIFT, tDown, 60)]
  const lane: Lane = {
    segs: [roll([-0.5, 0], [END, 0], ROLL), ...ride, ramp(land, [1.5, -up], 0.35, ROLL)],
    fire: T_LIFT,
  }
  return { up, dur, tDown, lane, seatAt }
}
const FLIGHTS = { 1: flightFor(1), 2: flightFor(2) }

/** How far the seat hangs back from under the wing, as an angle: back as the wing pulls, forward as it is slowed over the ledge. */
function swingAt(f: Flight, t: number): number {
  const u = clamp((t - T_LIFT) / f.dur)
  return -0.34 * Math.sin(Math.PI * Math.pow(u, 0.75)) * (1 - u * 0.4) + 0.2 * Math.sin(Math.PI * clamp((u - 0.72) / 0.28))
}

interface Wing {
  at: Pt
  /** Which way its back faces: 0 is up. */
  turn: number
  /** 0 laid out or hanging limp, 1 full. */
  full: number
}

/** Which way the lines lead from the risers' head, as an angle (up is a quarter turn back), and how far out the wing is along them. */
function leadAt(f: Flight, t: number): { a: number; rise: number } {
  const rise = easeInOutSine(over(t, T_SEAT + 0.04, T_LIFT - 0.05))
  const head = headFor(SEAT, -Math.PI + 0.75)
  const from = Math.atan2(LAID[1] - head[1], LAID[0] - head[0]) - 2 * Math.PI
  return { a: lerp(from, -Math.PI / 2 - swingAt(f, t), rise), rise }
}
/** The risers' head: over the seat, leaning the way the lines lead, but never far off upright. */
function headFor(seat: Pt, a: number): Pt {
  const lean = -Math.PI / 2 + clamp(a + Math.PI / 2, -0.6, 0.6)
  return [seat[0] + Math.cos(lean) * RISERS, seat[1] + Math.sin(lean) * RISERS]
}

function wingAt(f: Flight, t: number): Wing & { head: Pt } {
  const seat = f.seatAt(t)
  const { a, rise } = leadAt(f, t)
  const head = headFor(seat, a)
  if (t <= T_SEAT) return { at: LAID, turn: 0, full: 0, head }
  if (t <= f.tDown) {
    // Up off the snow in an arc about the risers' head, to stand overhead; then wherever the swing puts it.
    const reach = lerp(Math.hypot(LAID[0] - head[0], LAID[1] - head[1]), LINES, rise)
    return { at: [head[0] + Math.cos(a) * reach, head[1] + Math.sin(a) * reach], turn: (a + Math.PI / 2) * rise, full: easeInOutSine(over(t, T_SEAT + 0.08, T_LIFT - 0.12)), head }
  }
  // Nothing under it: it falls back, out round the ledge's end and not through it, and hangs there by its lines.
  const fall = easeInOutSine(over(t, f.tDown + 0.05, f.tDown + 0.85))
  const s = t - f.tDown - 0.85
  const sway = s < 0 ? 0 : 0.22 * Math.exp(-s * 1.6) * Math.sin(s * 5)
  const above: Pt = [head[0], head[1] - LINES]
  const hung: Pt = [LEDGE_X0 - 0.1 + Math.sin(sway) * 0.3, -f.up + FLOOR + 0.04 + 0.3 * Math.cos(sway)]
  const at: Pt = [lerp(above[0], hung[0], fall) - 0.2 * Math.sin(Math.PI * fall), lerp(above[1], hung[1], fall * fall)]
  // The risers go over with it and lie along the ledge.
  const laid = headFor(seat, lerp(-Math.PI / 2, -Math.PI - 0.5, fall))
  const down: Pt = [lerp(laid[0], seat[0] - RISERS, fall), lerp(laid[1], seat[1] + 0.1, fall)]
  return { at, turn: lerp(0, -Math.PI / 2 - 0.15 + sway, fall), full: lerp(1, 0.1, over(t, f.tDown, f.tDown + 0.5)), head: down }
}

/** The wing in its own frame, its back up: a crescent when full, a flat rag when not. Answers where its lines are made fast. */
function canopy(p: p5, k: number, ink: string, weight: number, color: string, wing: Wing): Pt[] {
  const span = lerp(LAID_SPAN, SPAN, wing.full)
  const camber = lerp(0.0, CAMBER, wing.full)
  const thick = lerp(0.09, THICK, wing.full)
  const upper = (s: number): Pt => [(s - 0.5) * span, -camber * (1 - (2 * s - 1) ** 2) - thick * Math.sqrt(Math.max(0, 1 - (2 * s - 1) ** 2)) * 0.5]
  const lower = (s: number): Pt => [(s - 0.5) * span, -camber * (1 - (2 * s - 1) ** 2) + thick * Math.sqrt(Math.max(0, 1 - (2 * s - 1) ** 2)) * 0.5]
  const n = 14
  p.push()
  p.translate(wing.at[0] * k, wing.at[1] * k)
  p.rotate(wing.turn)
  solid(p, ink, weight, color)
  p.beginShape()
  for (let i = 0; i <= n; i++) p.vertex(upper(i / n)[0] * k, upper(i / n)[1] * k)
  for (let i = n; i >= 0; i--) p.vertex(lower(i / n)[0] * k, lower(i / n)[1] * k)
  p.endShape(p.CLOSE)
  p.pop()
  const cos = Math.cos(wing.turn)
  const sin = Math.sin(wing.turn)
  return [0.14, 0.38, 0.62, 0.86].map((s) => {
    const [x, y] = lower(s)
    return [wing.at[0] + x * cos - y * sin, wing.at[1] + x * sin + y * cos] as Pt
  })
}

export const paraglider = definePiece<ParagliderState>({
  name: 'paraglider',
  weight: 0.8,
  flight: true,
  place: ({ rng, color, fits, theme, ball }) => {
    for (const up of rankBy(rng, [1, 2] as const, () => 1)) {
      const cells: Pt[] = []
      for (let r = 0; r <= up; r++) cells.push([0, -r], [1, -r])
      const exit: Pt = [2, -up]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: FLIGHTS[up].lane, state: { color: gearColor(theme, color, ball.color), white: snowWhite(theme), up } }
    }
    return null
  },
  draw: (p, s, { k, ink, weight }) => {
    snow(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, END)
    wand(p, k, ink, weight, s.color, END - 0.015)
    // The hump the seat sits on, and the ledge it is set down on, on its own post.
    drift(p, k, ink, weight, s.white, [[SEAT[0] - 0.2, snowAt(SEAT[0] - 0.2)], [SEAT[0] - 0.1, 0.26], [SEAT[0], 0.215], [SEAT[0] + 0.1, 0.26], [SEAT[0] + 0.2, snowAt(SEAT[0] + 0.2)]], snowAt(SEAT[0]))
    rail(p, k, ink, weight, LEDGE_X0, 1.5, -s.up + FLOOR)
    post(p, k, ink, weight, POST, -s.up + FLOOR, snowAt(POST) + 0.03)
  },
  over: (p, s, { k, t, ink, weight }) => {
    const f = FLIGHTS[s.up]
    const seat = f.seatAt(t)
    const wing = wingAt(f, t)
    const fast = canopy(p, k, ink, weight, s.color, wing)

    // The sling: a shallow cradle under the ball, flat on the ledge once it is set down.
    const flat = over(t, f.tDown - 0.06, f.tDown + 0.1)
    const sag = lerp(0.06, 0.012, flat)
    const left: Pt = [seat[0] - SLING, seat[1] + 0.13 - sag]
    const right: Pt = [seat[0] + SLING, seat[1] + 0.13 - sag]
    outline(p, ink, weight * 1.4)
    p.beginShape()
    p.vertex(left[0] * k, left[1] * k)
    p.quadraticVertex(seat[0] * k, (seat[1] + 0.13 + sag * 1.6) * k, right[0] * k, right[1] * k)
    p.endShape()

    // The risers: from each end of the sling to their head over the ball.
    outline(p, ink, weight * 0.8)
    p.line(left[0] * k, left[1] * k, wing.head[0] * k, wing.head[1] * k)
    p.line(right[0] * k, right[1] * k, wing.head[0] * k, wing.head[1] * k)
    // The lines: four from the risers' head to the wing, slack along the snow until the wing is up.
    const taut = t <= T_SEAT ? 0 : t <= f.tDown ? easeInOutSine(over(t, T_SEAT, T_SEAT + 0.3)) : 1 - 0.4 * over(t, f.tDown, f.tDown + 0.4)
    outline(p, ink, weight * 0.6)
    for (const to of fast) {
      const mid: Pt = [(wing.head[0] + to[0]) / 2, (wing.head[1] + to[1]) / 2 + (1 - taut) * 0.12]
      if (t <= T_LIFT) mid[1] = Math.min(mid[1], snowAt(mid[0]) - 0.01)
      p.beginShape()
      p.vertex(wing.head[0] * k, wing.head[1] * k)
      p.quadraticVertex(mid[0] * k, mid[1] * k, to[0] * k, to[1] * k)
      p.endShape()
    }
  },
})
