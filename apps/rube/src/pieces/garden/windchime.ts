import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, gallows, laneAt, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A wind chime on a bough that reaches out over the path from a post: three
 * wooden tubes on strings, long and short, hung clear of the ball's head,
 * and beside them the sail, a paddle on a long cord whose foot hangs at the
 * ball's middle. The ball bats the sail up ahead of it and goes under; the
 * sail comes down on the ball's crown, and riding it, its foot is shoved
 * into the foot of the first tube: the clack runs down the row, tube on
 * tube, and the chime rings off the row's end. The sail slides off the
 * ball's back and swings itself still behind it. The ball comes out a
 * touch slower for the shove and picks the path's pace back up.
 *
 * The sail is a pendulum the ball cannot pass through: its angle is its own
 * swing, or whatever keeps the paddle outside the ball, whichever is more,
 * stepped through once from the ball's own lane. The tubes are pendulums
 * too, each struck from rest by the one before it at the moment that one
 * has crossed the gap between them; none is ever inside its neighbour.
 */
/** The bough, along the cell's roof; everything hangs from it. */
const BEAM = -0.5
/** The sail's cord hangs here, this long to the middle of the paddle's round foot; the paddle's length and half its width at the foot. */
const SAIL_X = -0.27
const SAIL_L = 0.48
const PADDLE = 0.18
const HW = 0.045
/** How close the ball's centre comes to the sail's line when they touch. */
const C = R + HW
/** The sail's swing, how fast it dies, and how much livelier than the ball it comes off the ball's first knock. */
const OMEGA = 6.4
const DAMP = 2.5
const KICK = 1.16
/** The tubes: their width, the string each hangs on, their lengths, how far apart they hang, and how far one's foot travels before its outline meets the next one's. */
const W = 0.07
const STRING = 0.07
const LENGTHS = [0.26, 0.18, 0.22]
const SPACING = 0.125
const GAP = 0.018
/** A struck tube's swing, how fast it dies, and how far each swings: less down the row. */
const TUBE_OMEGA = 7.5
const TUBE_DAMP = 1.3
const SWINGS = [0.14, 0.11, 0.085]
/** The ball is slowed to this pace by the sail and picks up again after. */
const V_SLOW = 1.0
const X_IN = -0.4525
const X_SLOW = -0.2
const X_OUT = 0.28

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [X_IN, 0], ROLL),
    ramp([X_IN, 0], [X_SLOW, 0], ROLL, V_SLOW),
    roll([X_SLOW, 0], [X_OUT, 0], V_SLOW),
    ramp([X_OUT, 0], [0.5, 0], V_SLOW, ROLL),
  ],
  fire: 0,
}
const ballX = (t: number) => laneAt(LANE, t).x

/** The sail's line from the bough to its foot, at angle `a` forward of straight down. */
const foot = (a: number): Pt => [SAIL_X + SAIL_L * Math.sin(a), BEAM + SAIL_L * Math.cos(a)]

/**
 * The least angle the sail can hang at with the ball's centre at `xb`: the
 * far edge of the angles at which its line would cut the ball. Less than
 * nothing until they touch, and no bound at all once the ball is out of reach.
 */
function lifted(xb: number): number {
  const dx = xb - SAIL_X
  if (Math.hypot(dx, BEAM) >= SAIL_L + C) return -Infinity
  const toBall = Math.atan2(dx, -BEAM)
  const clear = (a: number) => {
    const [ex, ey] = foot(a)
    const ux = ex - SAIL_X
    const uy = ey - BEAM
    const f = Math.min(1, Math.max(0, (dx * ux - BEAM * uy) / (SAIL_L * SAIL_L)))
    return Math.hypot(SAIL_X + ux * f - xb, BEAM + uy * f) >= C
  }
  let lo = toBall
  let hi = toBall + Math.PI / 2
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (clear(mid)) hi = mid
    else lo = mid
  }
  return hi
}

/** The sail's angle, stepped from the ball's lane: a damped pendulum that the ball shoves, carries and lets go. */
const DT = 1 / 240
const SAIL: number[] = []
let touched = false
{
  let a = 0
  let w = 0
  let was = -Infinity
  for (let i = 0; i <= 6 / DT; i++) {
    const least = lifted(ballX(i * DT))
    w += (-OMEGA * OMEGA * Math.sin(a) - 2 * DAMP * w) * DT
    a += w * DT
    if (a < least) {
      const shove = was > -Infinity ? (least - was) / DT : 0
      a = least
      // The first knock sends it off ahead of the ball; after that it goes at the ball's pace while they touch.
      w = touched ? Math.max(w, shove) : shove * KICK
      touched = true
    }
    was = least
    SAIL.push(a)
  }
}

function sailAt(t: number): number {
  if (t <= 0) return 0
  const f = t / DT
  const i = Math.floor(f)
  if (i >= SAIL.length - 1) return 0
  return SAIL[i] + (SAIL[i + 1] - SAIL[i]) * (f - i)
}

/** The sail's highest swing; the first tube's near face stands where the paddle's foot is a hair short of it. */
const TOP = Math.max(...SAIL)
const CLIP = TOP - 0.035
const FACE = foot(CLIP)[0] + HW
const XS = LENGTHS.map((_, i) => FACE + W / 2 + i * SPACING)
/** How far down its string and tube each pair of neighbours meets: the shorter of the two. */
const MEET = LENGTHS.map((len, i) => STRING + Math.min(len, LENGTHS[Math.min(i + 1, LENGTHS.length - 1)]))

/** A tube struck from rest at `at`: out the way it was struck, and back, dying away. */
const struck = (i: number, t: number, at: number) => (t < at ? 0 : SWINGS[i] * Math.exp(-TUBE_DAMP * (t - at)) * Math.sin(TUBE_OMEGA * (t - at)))

/** When each tube is struck: the first by the sail's foot, the rest by the tube before, once that one has crossed the gap. */
const STRUCK: number[] = []
{
  let at = 0
  while (sailAt(at) < CLIP) at += DT
  STRUCK.push(at)
  for (let i = 1; i < LENGTHS.length; i++) {
    let t = STRUCK[i - 1]
    while (t < STRUCK[i - 1] + 0.2 && MEET[i - 1] * Math.sin(struck(i - 1, t, STRUCK[i - 1])) < GAP) t += DT
    STRUCK.push(t)
  }
}
LANE.fire = STRUCK[0]

/** Every tube's angle at piece time `t`: its own swing, and never inside the paddle or the tube before it. */
function tubesAt(t: number): number[] {
  const out: number[] = []
  for (let i = 0; i < LENGTHS.length; i++) {
    let a = struck(i, t, STRUCK[i])
    const reach = i === 0 ? foot(sailAt(t))[0] + HW - FACE : MEET[i - 1] * Math.sin(out[i - 1]) - GAP
    const held = i === 0 ? STRING + LENGTHS[0] : MEET[i - 1]
    if (reach > 0) a = Math.max(a, Math.asin(Math.min(1, reach / held)))
    out.push(a)
  }
  return out
}

export const windchime = definePiece<{ color: string }>({
  name: 'windchime',
  weight: 0.9,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, 0.5)
    soil(p, k, ink, weight, -0.5, 0.5)
    tuft(p, k, ink, weight, 0.4, 0.5, 0.1, 0.03)
    // The bough out over the path from its post, behind everything.
    gallows(p, k, ink, weight, -0.49, XS[XS.length - 1] + 0.07, -0.47, BEAM)

    // The tubes on their strings.
    const angles = tubesAt(t)
    for (let i = 0; i < LENGTHS.length; i++) {
      p.push()
      p.translate(XS[i] * k, BEAM * k)
      p.rotate(-angles[i])
      outline(p, ink, weight * 0.8)
      p.line(0, 0, 0, STRING * k)
      solid(p, ink, weight, s.color)
      p.rect(0, (STRING + LENGTHS[i] / 2) * k, W * k, LENGTHS[i] * k, W * 0.4 * k)
      p.pop()
    }
    // The chime rings off the end of the row as the clack gets there.
    const last = LENGTHS.length - 1
    rings(p, k, ink, weight, XS[last] + 0.06, BEAM + STRING + LENGTHS[last] - 0.08, over(t, STRUCK[last], STRUCK[last] + 0.4))

    // The sail: a cord, and a paddle that widens to a round foot.
    p.push()
    p.translate(SAIL_X * k, BEAM * k)
    p.rotate(-sailAt(t))
    outline(p, ink, weight * 0.8)
    p.line(0, 0, 0, (SAIL_L - PADDLE) * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, (SAIL_L - PADDLE) * k)
    p.bezierVertex(-HW * 0.5 * k, (SAIL_L - PADDLE * 0.6) * k, -HW * k, (SAIL_L - HW * 1.6) * k, -HW * k, SAIL_L * k)
    p.bezierVertex(-HW * k, (SAIL_L + HW * 1.33) * k, HW * k, (SAIL_L + HW * 1.33) * k, HW * k, SAIL_L * k)
    p.bezierVertex(HW * k, (SAIL_L - HW * 1.6) * k, HW * 0.5 * k, (SAIL_L - PADDLE * 0.6) * k, 0, (SAIL_L - PADDLE) * k)
    p.endShape(p.CLOSE)
    p.pop()
  },
})

/** Two short arcs ringing off a point, spreading and fading over `f`. */
function rings(p: p5, k: number, ink: string, weight: number, x: number, y: number, f: number): void {
  if (f <= 0 || f >= 1) return
  outline(p, ink, weight * (1 - f) * 1.1)
  for (const r of [0.05, 0.09]) {
    const rr = (r + 0.08 * f) * k
    p.arc(x * k, y * k, rr * 2, rr * 2, -0.9, 0.5)
  }
}
