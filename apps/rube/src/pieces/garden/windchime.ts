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
 * tube, and the chime rings off the row's end. Then it comes back: the last
 * tube swings out and home into the one before it, and that one into the
 * first, and the clack runs back up the row and rings off its other end;
 * and so on, back and forth, each time softer, the long tube and the short
 * ones swinging at their own paces and meeting where they meet. The sail
 * slides off the ball's back and swings itself still behind it. The ball
 * comes out a touch slower for the shove and picks the path's pace back up.
 *
 * The sail is a pendulum the ball cannot pass through: its angle is its own
 * swing, or whatever keeps the paddle outside the ball, whichever is more,
 * stepped through once from the ball's own lane. The tubes are pendulums
 * too, stepped once from the sail's swing: the sail's foot carries the first
 * along wherever it has come past its face, and neighbours that meet knock
 * each other apart, the heavier giving the lighter more; none is ever
 * inside its neighbour. Every knock hard enough to hear rings off the end
 * of the row it is running toward.
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
/** Each tube's own swing, the short ones quicker; how fast it dies; how much of a knock two tubes keep between them; how far the sail's first knock would swing the first tube on its own, in radians. */
const TUBE_OMEGA = LENGTHS.map((len) => 7.5 * Math.sqrt((STRING + LENGTHS[0] / 2) / (STRING + len / 2)))
const TUBE_DAMP = 0.32
const BOUNCE = 0.9
const KNOCK = 0.26
/** A knock is heard, and rings, when the tubes meet faster than this, in cells a second; one pair is not heard twice inside this long. */
const HEARD = 0.07
const ECHO = 0.14
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

/** The sail's foot first reaches the first tube's face: that is the knock the piece is about. */
{
  let at = 0
  while (sailAt(at) < CLIP) at += DT
  LANE.fire = at
}

/** A knock heard: when, the tube it sends on, which way along the row, and how hard the two met. */
interface Clack {
  at: number
  tube: number
  dir: 1 | -1
  hard: number
}
/** How long the chime is stepped for; by the end of it the tubes are all but still. */
const RINGING = 9
/** Every tube's angle at every step, and every knock heard. */
const TUBES: number[][] = LENGTHS.map(() => [])
const CLACKS: Clack[] = []
{
  const a = LENGTHS.map(() => 0)
  const w = LENGTHS.map(() => 0)
  const heard = LENGTHS.map(() => -Infinity)
  let pushed = -Infinity
  let knocked = false
  for (let i = 0; i <= RINGING / DT; i++) {
    const t = i * DT
    for (let j = 0; j < a.length; j++) {
      w[j] += (-TUBE_OMEGA[j] * TUBE_OMEGA[j] * Math.sin(a[j]) - 2 * TUBE_DAMP * w[j]) * DT
      a[j] += w[j] * DT
    }
    // The sail's foot knocks the first tube away the first time it comes past its face, and after that carries it on wherever it has come past it.
    const reach = foot(sailAt(t))[0] + HW - FACE
    const least = reach > 0 ? Math.asin(Math.min(1, reach / (STRING + LENGTHS[0]))) : -Infinity
    if (a[0] < least) {
      a[0] = least
      w[0] = Math.max(w[0], knocked ? (least - pushed) / DT : KNOCK * TUBE_OMEGA[0])
      knocked = true
    }
    pushed = least
    // Neighbours that have met are set apart, and knock each other on if they were closing.
    for (let j = 0; j < a.length - 1; j++) {
      const m = MEET[j]
      const into = m * (Math.sin(a[j]) - Math.sin(a[j + 1])) - GAP
      if (into <= 0) continue
      a[j] = Math.asin(Math.sin(a[j]) - into / (2 * m))
      a[j + 1] = Math.asin(Math.sin(a[j + 1]) + into / (2 * m))
      const vi = m * Math.cos(a[j]) * w[j]
      const vj = m * Math.cos(a[j + 1]) * w[j + 1]
      const closing = vi - vj
      if (closing <= 0) continue
      const [mi, mj] = [LENGTHS[j], LENGTHS[j + 1]]
      w[j] = (vi - ((1 + BOUNCE) * mj * closing) / (mi + mj)) / (m * Math.cos(a[j]))
      w[j + 1] = (vj + ((1 + BOUNCE) * mi * closing) / (mi + mj)) / (m * Math.cos(a[j + 1]))
      if (closing > HEARD && t - heard[j] > ECHO) {
        const dir = vi + vj > 0 ? 1 : -1
        CLACKS.push({ at: t, tube: dir > 0 ? j + 1 : j, dir, hard: closing })
      }
      heard[j] = t
    }
    a.forEach((v, j) => TUBES[j].push(v))
  }
}

/** Every tube's angle at piece time `t`. */
function tubesAt(t: number): number[] {
  if (t <= 0) return LENGTHS.map(() => 0)
  const f = t / DT
  const i = Math.floor(f)
  if (i >= TUBES[0].length - 1) return LENGTHS.map(() => 0)
  return TUBES.map((steps) => steps[i] + (steps[i + 1] - steps[i]) * (f - i))
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
    // Every knock rings off the end of the row it is running toward: down the row, and back up it.
    for (const c of CLACKS) {
      const f = over(t, c.at, c.at + 0.4)
      const end = c.dir > 0 ? LENGTHS.length - 1 : 0
      if (f > 0 && f < 1) rings(p, k, ink, weight * Math.min(1, 0.4 + c.hard / 0.6), XS[end] + c.dir * 0.06, BEAM + STRING + LENGTHS[end] - 0.08, f, c.dir)
    }

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

/** Two short arcs ringing off a point toward `dir`, spreading and fading over `f`. */
function rings(p: p5, k: number, ink: string, weight: number, x: number, y: number, f: number, dir: 1 | -1): void {
  if (f <= 0 || f >= 1) return
  outline(p, ink, weight * (1 - f) * 1.1)
  const [a0, a1] = dir > 0 ? [-0.9, 0.5] : [Math.PI - 0.5, Math.PI + 0.9]
  for (const r of [0.05, 0.09]) {
    const rr = (r + 0.08 * f) * k
    p.arc(x * k, y * k, rr * 2, rr * 2, a0, a1)
  }
}
