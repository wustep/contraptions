import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, post, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../../parts'
import { gardenGreen, soil, tuft } from '../../../pieces/garden/green'

/**
 * A grasshopper on a leaf at the path's end, its back level with the path
 * and its big hind knees up either side of it. The ball rolls up its back
 * between the knees and stops behind its head; it settles lower, folding
 * tighter, a beat, and goes: the hind legs straighten in one kick and it
 * leaps a long flat arc over a cell of nothing with the ball aboard, legs
 * trailing, nose up and then nose down, onto a second leaf, a floor up when
 * the map wants that. The legs take the landing, the leaf nods, and the jolt
 * pitches the ball forward off its back, over its head and onto the path.
 * It stays where it landed and lifts its head again; the leaf it left is
 * still waving.
 *
 * One motion: where the body is, how it is pitched, and how far along its
 * back the ball is. The lane is the ball's seat traced from that, the legs
 * are solved from the body to feet that stay on the leaf until the leg is
 * straight, and the leaves move under the feet that push and land on them.
 */
export interface GrasshopperState {
  color: string
  green: string
  up: 0 | 1
}

/** The back: a deck from behind the knees to the brow, this far over the body's middle, and where the ball sits on it. */
const DECK: [number, number] = [-0.2, 0.22]
const BACK = 0.05
const SEAT = 0
/** The hind leg: hip on the body, thigh and shin; and how far under the body the feet stand. */
const HIP: Pt = [-0.07, 0.015]
const THIGH = 0.25
const SHIN = 0.27
const STAND = 0.2
/** How it holds itself: at rest with its head up, crouched, and nose down to shed the ball. */
const REST = -0.12
const CROUCH = -0.21
const SHED_PITCH = 0.22
/** Gravity for a leap, cells a second squared; and how hard the ball is sent down the pitched back. */
const G = 14
const SHED = 6
/** Where the body's middle is on the first leaf, and across the gap on the second. */
const FROM_X = -0.03
const TO_X = 1.96

/** A point `u` along the body and `v` below its middle line, for a body at `b` pitched `a` (nose down positive). */
const onBody = (b: Pt, a: number, u: number, v: number): Pt => [b[0] + u * Math.cos(a) - v * Math.sin(a), b[1] + u * Math.sin(a) + v * Math.cos(a)]

/** The body's height on the first leaf, so the deck's tail end is level with the path; and on the second, so its brow is, pitched to shed. */
const FROM_Y = FLOOR - (DECK[0] * Math.sin(REST) - BACK * Math.cos(REST))
const TO_Y = FLOOR - (DECK[1] * Math.sin(SHED_PITCH) - BACK * Math.cos(SHED_PITCH))

interface Leap {
  up: 0 | 1
  /** When the ball is on the deck, seated; when the kick begins, the feet leave, and the feet land. */
  deck: number
  seat: number
  kick: number
  off: number
  down: number
  /** Where the body is when the feet leave, and how fast it is going. */
  from: Pt
  v: Pt
  /** When the ball starts down the back, and when it leaves the brow. */
  sheds: number
  leaves: number
}

const KICK_T = 0.07
const AIR: [number, number] = [0.4, 0.62]

function leapFor(up: 0 | 1): Leap {
  const onto = onBody([FROM_X, FROM_Y], REST, DECK[0], -BACK - R)
  const deck = (onto[0] + 0.5) / ROLL
  const seat = deck + (SEAT - DECK[0]) / (ROLL / 2)
  const kick = seat + 0.33
  const off = kick + KICK_T
  const air = AIR[up]
  const crouched: Pt = [FROM_X - 0.02, FROM_Y + 0.04]
  // It comes down with its legs out, a little higher than it will sit.
  const to: Pt = [TO_X - 0.05, TO_Y - up - 0.04]
  let from = crouched
  let v: Pt = [0, 0]
  // The kick carries the body half a kick's worth of the speed it leaves at; twice round settles where from.
  for (let i = 0; i < 4; i++) {
    v = [(to[0] - from[0]) / air, (to[1] - from[1]) / air - 0.5 * G * air]
    from = [crouched[0] + (v[0] * KICK_T) / 2, crouched[1] + (v[1] * KICK_T) / 2]
  }
  const down = off + air
  const sheds = down + 0.12
  const leaves = sheds + Math.sqrt((2 * (DECK[1] - SEAT)) / SHED)
  return { up, deck, seat, kick, off, down, from, v, sheds, leaves }
}
const LEAPS = [leapFor(0), leapFor(1)] as const

interface Pose {
  b: Pt
  pitch: number
  /** 0 with its feet on a leaf, 1 in the air. */
  air: number
  /** Which leaf the feet are on, or were last. */
  landed: boolean
}

/** A damped ring: from `x0` moving at `v0`, settling to zero. */
const ring = (s: number, x0: number, v0: number, b: number, w: number): number => Math.exp(-b * s) * (x0 * Math.cos(w * s) + ((v0 + b * x0) / w) * Math.sin(w * s))

function poseAt(t: number, l: Leap): Pose {
  if (t < l.kick) {
    // At rest; then, the ball aboard, lower and tighter.
    const c = easeInOutSine(clamp((t - l.seat - 0.03) / 0.2))
    return { b: [FROM_X - 0.02 * c, FROM_Y + 0.04 * c], pitch: REST + (CROUCH - REST) * c, air: 0, landed: false }
  }
  const lift = Math.atan2(l.v[1], l.v[0])
  if (t < l.off) {
    const s = t - l.kick
    const f = (s * s) / (KICK_T * KICK_T)
    return { b: [FROM_X - 0.02 + (l.from[0] - FROM_X + 0.02) * f, FROM_Y + 0.04 + (l.from[1] - FROM_Y - 0.04) * f], pitch: CROUCH + (0.6 * lift - CROUCH) * f, air: clamp((s - KICK_T * 0.6) / (KICK_T * 0.4)), landed: false }
  }
  if (t < l.down) {
    const s = t - l.off
    const vy = l.v[1] + G * s
    return { b: [l.from[0] + l.v[0] * s, l.from[1] + l.v[1] * s + 0.5 * G * s * s], pitch: 0.6 * Math.atan2(vy, l.v[0]), air: 1 - clamp((s - (l.down - l.off) + 0.07) / 0.07), landed: false }
  }
  // Down: the legs take it, the body rings a little on them, and it pitches to shed the ball, then lifts its head again.
  const s = t - l.down
  const vy = l.v[1] + G * (l.down - l.off)
  const came = 0.6 * Math.atan2(vy, l.v[0])
  const pitch = t < l.leaves + 0.1 ? SHED_PITCH + (came - SHED_PITCH) * (1 - easeOutQuad(clamp(s / 0.12))) : SHED_PITCH + (REST - SHED_PITCH) * easeInOutSine(clamp((t - l.leaves - 0.1) / 0.5))
  return { b: [TO_X + ring(s, -0.05, l.v[0] * 0.3, 9, 14), TO_Y - l.up + ring(s, -0.04, vy * 0.45, 9, 15)], pitch, air: 0, landed: true }
}

/** How far along the back from its seat the ball is at piece time `t`. */
const alongAt = (t: number, l: Leap): number => (t < l.sheds ? SEAT : Math.min(DECK[1], SEAT + 0.5 * SHED * Math.pow(t - l.sheds, 2)))

function ballAt(t: number, l: Leap): Pt {
  const pose = poseAt(t, l)
  return onBody(pose.b, pose.pitch, alongAt(t, l), -BACK - R)
}

function laneFor(l: Leap): Lane {
  const onto = onBody([FROM_X, FROM_Y], REST, DECK[0], -BACK - R)
  const seat = onBody([FROM_X, FROM_Y], REST, SEAT, -BACK - R)
  return {
    segs: [
      roll([-0.5, 0], onto, ROLL),
      ramp(onto, seat, ROLL, 0),
      ...trace((t) => ballAt(t, l), l.seat, l.leaves, Math.round((l.leaves - l.seat) * 80)),
      ramp(ballAt(l.leaves, l), [2.5, -l.up], SHED * (l.leaves - l.sheds), ROLL),
    ],
    fire: l.kick,
  }
}
const LANES = [laneFor(LEAPS[0]), laneFor(LEAPS[1])] as const

/** The leaf the feet stand on: its top, a little under the body. */
const leafTop = (bodyY: number): number => bodyY + STAND

/** How far each leaf is pushed from its rest at piece time `t`: the first kicked down and back, the second landed on. */
function leavesAt(t: number, l: Leap): { first: Pt; second: Pt } {
  const kicked = Math.max(0, t - l.kick)
  const hit = Math.max(0, t - l.down)
  const vy = l.v[1] + G * (l.down - l.off)
  const first: Pt = t < l.kick ? [0, 0] : [ring(kicked, -0.02, -1.2, 5, 17) * clamp(kicked / 0.03), ring(kicked, 0.04, 1.6, 5, 17) * clamp(kicked / 0.03)]
  const second: Pt = t < l.down ? [0, 0] : [ring(hit, 0, l.v[0] * 0.3, 9, 14), ring(hit, 0, vy * 0.45, 9, 15)]
  return { first, second }
}

/** A leaf in profile on its stalk: a blade held level at (x, y), its stalk down to the ground at `ground`. */
function blade(p: p5, k: number, ink: string, weight: number, green: string, x: number, y: number, ground: number, lean: number): void {
  outline(p, ink, weight * 1.2)
  p.noFill()
  p.beginShape()
  p.vertex((x + 0.06) * k, ground * k)
  p.quadraticVertex((x + 0.06 + lean) * k, ((ground + y) / 2) * k, (x - 0.02) * k, (y + 0.02) * k)
  p.endShape()
  solid(p, ink, weight, green)
  p.beginShape()
  p.vertex((x - 0.36) * k, (y + 0.015) * k)
  p.bezierVertex((x - 0.2) * k, (y - 0.012) * k, (x + 0.15) * k, (y - 0.012) * k, (x + 0.33) * k, (y + 0.03) * k)
  p.bezierVertex((x + 0.15) * k, (y + 0.075) * k, (x - 0.2) * k, (y + 0.07) * k, (x - 0.36) * k, (y + 0.015) * k)
  p.endShape(p.CLOSE)
}

/** A hind leg from hip to foot: thigh and shin, the knee the way a grasshopper's goes, up and back. */
function hindLeg(p: p5, k: number, ink: string, weight: number, color: string, hip: Pt, foot: Pt): void {
  const dx = foot[0] - hip[0]
  const dy = foot[1] - hip[1]
  const d = Math.min(THIGH + SHIN - 0.002, Math.max(0.06, Math.hypot(dx, dy)))
  const to = Math.atan2(dy, dx)
  const open = Math.acos(clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1))
  // Of the two ways to bend, the one with the knee higher.
  const knees: Pt[] = [to - open, to + open].map((a) => [hip[0] + THIGH * Math.cos(a), hip[1] + THIGH * Math.sin(a)] as Pt)
  const knee = knees[0][1] < knees[1][1] ? knees[0] : knees[1]
  const end: Pt = [hip[0] + (dx / Math.hypot(dx, dy)) * d, hip[1] + (dy / Math.hypot(dx, dy)) * d]
  // The shin, a line; the thigh, a fat drumstick tapering to the knee.
  outline(p, ink, weight)
  p.line(knee[0] * k, knee[1] * k, end[0] * k, end[1] * k)
  const a = Math.atan2(knee[1] - hip[1], knee[0] - hip[0])
  p.push()
  p.translate(hip[0] * k, hip[1] * k)
  p.rotate(a)
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex(-0.02 * k, 0)
  p.bezierVertex(0.0, -0.06 * k, THIGH * 0.6 * k, -0.035 * k, THIGH * k, 0)
  p.bezierVertex(THIGH * 0.6 * k, 0.035 * k, 0.0, 0.06 * k, -0.02 * k, 0)
  p.endShape(p.CLOSE)
  p.pop()
}

/** Where a hind foot is: on its leaf while the leg will reach, trailing behind the body in the air. */
function hindFoot(pose: Pose, l: Leap, leaves: { first: Pt; second: Pt }): Pt {
  const trailing = onBody(pose.b, pose.pitch, HIP[0] - 0.44, HIP[1] + 0.13)
  const reaching = onBody(pose.b, pose.pitch, HIP[0] - 0.01, HIP[1] + 0.22)
  if (pose.landed) return [TO_X - 0.13 + leaves.second[0], leafTop(TO_Y - l.up) + leaves.second[1]]
  const planted: Pt = [FROM_X - 0.13 + leaves.first[0], leafTop(FROM_Y) + leaves.first[1]]
  if (pose.air <= 0) return planted
  // In the air: from where it pushed off, to trailing, and forward again to land.
  const flown = clamp((pose.b[0] - l.from[0]) / (TO_X - 0.05 - l.from[0]))
  const swing = easeInOutSine(clamp((flown - 0.62) / 0.38))
  const away: Pt = [trailing[0] + (reaching[0] - trailing[0]) * swing, trailing[1] + (reaching[1] - trailing[1]) * swing]
  const f = flown < 0.5 ? pose.air : 1
  const base = flown < 0.5 ? planted : away
  return [base[0] + (away[0] - base[0]) * f, base[1] + (away[1] - base[1]) * f]
}

/** The body and head about the body's middle, facing on. */
function body(p: p5, k: number, ink: string, weight: number, color: string): void {
  solid(p, ink, weight, color)
  // One long shape: the brow, the back as flat as a deck, the tail's taper, the belly.
  p.beginShape()
  p.vertex(DECK[1] * k, -BACK * k)
  p.vertex(DECK[0] * k, -BACK * k)
  p.bezierVertex(-0.27 * k, -0.04 * k, -0.33 * k, -0.01 * k, -0.34 * k, 0.015 * k)
  p.bezierVertex(-0.26 * k, 0.05 * k, -0.12 * k, 0.085 * k, 0.04 * k, 0.08 * k)
  p.bezierVertex(0.14 * k, 0.08 * k, 0.2 * k, 0.085 * k, 0.24 * k, 0.06 * k)
  p.bezierVertex(0.275 * k, 0.03 * k, 0.27 * k, -0.04 * k, DECK[1] * k, -BACK * k)
  p.endShape(p.CLOSE)
  // The collar behind the head, the eye, and one feeler swept back.
  outline(p, ink, weight * 0.8)
  p.line(0.125 * k, -BACK * k, 0.11 * k, 0.078 * k)
  p.noStroke()
  p.fill(ink)
  p.circle(0.2 * k, -0.005 * k, 0.035 * k)
  outline(p, ink, weight * 0.7)
  p.noFill()
  p.beginShape()
  p.vertex(0.235 * k, -0.035 * k)
  p.quadraticVertex(0.3 * k, -0.13 * k, 0.2 * k, -0.19 * k)
  p.endShape()
}

export const grasshopper = definePiece<GrasshopperState>({
  name: 'grasshopper',
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits, taste, theme }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    for (const up of rankBy(rng, [0, 1] as const, (u) => (u ? tall : 1))) {
      const cells: Pt[] = [
        [0, 0],
        [1, 0],
        [2, 0],
      ]
      if (up) cells.push([0, -1], [1, -1], [2, -1])
      const exit: Pt = [3, -up]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: LANES[up], state: { color, green: gardenGreen(theme), up } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const l = LEAPS[s.up]
    const pose = poseAt(t, l)
    const leaves = leavesAt(t, l)
    const onto = onBody([FROM_X, FROM_Y], REST, DECK[0], -BACK - R)
    const brow = onBody([TO_X, TO_Y - s.up], SHED_PITCH, DECK[1], -BACK)

    // The ground under all three cells, the path in to the tail, and the path out from the brow on its post.
    soil(p, k, ink, weight, -0.5, 2.5)
    tuft(p, k, ink, weight, 1.0, 0.5, 0.12, 0.03)
    rail(p, k, ink, weight, -0.5, onto[0] - 0.02)
    post(p, k, ink, weight, -0.42)
    rail(p, k, ink, weight, brow[0] + 0.015, 2.5, -s.up + FLOOR)
    post(p, k, ink, weight, 2.42, -s.up + FLOOR, 0.5)

    // The two leaves, each on its stalk, moving under the feet that push and land on them.
    blade(p, k, ink, weight, s.green, FROM_X - 0.04 + leaves.first[0] * 0.6, leafTop(FROM_Y) + leaves.first[1], 0.5, 0.1)
    blade(p, k, ink, weight, s.green, TO_X - 0.04 + leaves.second[0] * 0.6, leafTop(TO_Y - s.up) + leaves.second[1], 0.5, -0.1)

    // The far hind leg, the small legs, and the body; the near hind leg goes on in front of the ball.
    const foot = hindFoot(pose, l, leaves)
    hindLeg(p, k, ink, weight, s.color, onBody(pose.b, pose.pitch, HIP[0] + 0.03, HIP[1] - 0.01), [foot[0] + 0.05, foot[1]])
    outline(p, ink, weight * 0.9)
    for (const u of [0.06, 0.15]) {
      const hip = onBody(pose.b, pose.pitch, u, 0.06)
      const down: Pt = pose.landed ? [TO_X + u + 0.02 + leaves.second[0], leafTop(TO_Y - s.up) + leaves.second[1]] : [FROM_X + u + 0.02 + leaves.first[0], leafTop(FROM_Y) + leaves.first[1]]
      const tucked = onBody(pose.b, pose.pitch, u - 0.07, 0.15)
      const to: Pt = [down[0] + (tucked[0] - down[0]) * pose.air, down[1] + (tucked[1] - down[1]) * pose.air]
      const knee: Pt = [(hip[0] + to[0]) / 2 + 0.035, (hip[1] + to[1]) / 2]
      p.line(hip[0] * k, hip[1] * k, knee[0] * k, knee[1] * k)
      p.line(knee[0] * k, knee[1] * k, to[0] * k, to[1] * k)
    }
    p.push()
    p.translate(pose.b[0] * k, pose.b[1] * k)
    p.rotate(pose.pitch)
    body(p, k, ink, weight, s.color)
    p.pop()
  },
  over: (p, s, { k, t, ink, weight }) => {
    const l = LEAPS[s.up]
    const pose = poseAt(t, l)
    hindLeg(p, k, ink, weight, s.color, onBody(pose.b, pose.pitch, HIP[0], HIP[1]), hindFoot(pose, l, leavesAt(t, l)))
  },
})
