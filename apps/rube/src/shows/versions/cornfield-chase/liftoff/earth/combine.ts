import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, ROLL, ball, laneAt, puff, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, part, route, smooth, type Ctx, type PartShot, type Way } from '../kit'
import { beat, ORIGIN, PERIOD } from '../music'
import { G_EARTH, hop } from '../physics'
import { DUST } from '../worlds'
import { cornWall, stalk } from './corn'

/**
 * The combine. It has come to the end of the field on its own, header up,
 * nobody in the cab, the lamp on its aerial ticking every two beats; and
 * the ball comes off the dam into its header. From there the machine is
 * the machine: five jobs, each on the beat.
 *
 *   86  lands in the header, between two bats of the reel
 *   87  a bat sweeps it back to the feeder
 *   88  a paddle of the feeder chain takes it; 89 up; 90 over the top
 *   90  the threshing drum has it (it goes round in the porthole)
 *   91  the drum throws it up the elevator; 91.5 out of the fill head
 *   92  onto the grain in the tank; 93 rolls down against the tank's gate
 *   94  the unloading auger comes off its rest; 95 it locks out
 *   96  the gate drops and the ball goes into the auger's hopper
 *   97  the auger takes it (a bulge up the tube)
 *   98  the flap at the spout fires it
 *   99  onto the high end of a plank on a straw bale; 99.5 the plank comes down
 *  100  and it rolls off onto the stubble.
 *
 * The part's frame: the ball comes in at the header (y = 0); the field is a
 * cell lower (the ground at 1 + FLOOR). The dam the truck braked on stands
 * at the left, x ≈ −2.8.
 */

const GROUND = 1 + FLOOR
/** The centre of a ball on the ground. */
const ON_GROUND = 1

/* ------------------------------------------------------------------ the beats */

const LAND = beat(86)
const SWEEP = beat(87)
const CATCH = beat(88)
const LIFT = beat(89)
const TIP = beat(90)
const FLING = beat(91)
const POP = beat(91.5)
const PLOP = beat(92)
const CLACK = beat(93)
const UNLATCH = beat(94)
const LOCK = beat(95)
const GATE = beat(96)
const DRAW = beat(97)
const FIRE = beat(98)
const PLANK = beat(99)
const THUMP = beat(99.5)
const EXIT = beat(100)

export const COMBINE_HITS = [LAND, SWEEP, CATCH, LIFT, TIP, FLING, POP, PLOP, CLACK, UNLATCH, LOCK, GATE, DRAW, FIRE, PLANK, THUMP]

/**
 * The combine's own clock: it surges on every beat and all but stops
 * between, so the reel and the feeder chain go round a step a beat. Whole
 * beats land on whole numbers, at the top of the surge.
 */
const PULSE = 0.85
const surge = (t: number): number => {
  const x = (t - ORIGIN) / PERIOD
  return x + (PULSE * Math.sin(2 * Math.PI * x)) / (2 * Math.PI)
}

/* ------------------------------------------------------------------ the header and its reel */

/** The pan the ball lands in: its floor, and how far forward it goes. */
const PAN_FRONT = -0.84
const PAN_BACK = 0.3
const REEL: Pt = [-0.3, -0.36]
const REEL_R = 0.42
const BATS = 6
const BAT_STEP = (2 * Math.PI) / BATS
/** A bat is at the bottom of the reel on every beat, going back toward the feeder. */
const batAngle = (i: number, t: number): number => Math.PI / 2 + i * BAT_STEP - BAT_STEP * surge(t)
const batAt = (i: number, t: number): Pt => {
  const a = batAngle(i, t)
  return [REEL[0] + REEL_R * Math.cos(a), REEL[1] + REEL_R * Math.sin(a)]
}
/** How near a bat's bar comes to the ball's centre before it pushes. */
const REACH = R + 0.035
/** The header on its rams, taking the ball's weight. */
const dipAt = (t: number): number => {
  const s = t - LAND
  return s < 0 ? 0 : 0.03 * Math.exp(-s / 0.2) * Math.sin(s * 15)
}

/** Where the feeder takes the ball in, at the back of the pan. */
const MOUTH: Pt = [0.2, 0]

/**
 * The ball in the pan from the landing to the feeder: it lands going right
 * and the crop mat slows it; the bat behind it comes down on the next beat
 * and sweeps it to the back of the pan. Worked out once, stepwise, against
 * the same reel the drawing turns.
 */
function panTrack(): (t: number) => Pt {
  const dt = 1 / 600
  const n = Math.ceil((CATCH - LAND) / dt)
  const xs = new Float64Array(n + 1)
  let x = -0.5
  let v = 1.0
  for (let i = 0; i <= n; i++) {
    const t = LAND + i * dt
    if (i > 0) {
      x += v * dt
      v = Math.max(0, v - (t < SWEEP ? 3.4 : 1.7) * dt)
    }
    for (let b = 0; b < BATS; b++) {
      const [bx, by] = batAt(b, t)
      if (bx > x || Math.abs(by) >= REACH) continue
      const cx = bx + Math.sqrt(REACH * REACH - by * by)
      if (cx > x) {
        const [px] = batAt(b, t - dt)
        v = Math.max(v, (bx - px) / dt)
        x = cx
      }
    }
    if (x >= MOUTH[0]) {
      x = MOUTH[0]
      v = 0
    }
    xs[i] = x
  }
  return (t) => {
    const f = Math.max(0, Math.min(n, (t - LAND) / dt))
    const i = Math.min(n - 1, Math.floor(f))
    return [xs[i] + (xs[i + 1] - xs[i]) * (f - i), dipAt(t)]
  }
}

/* ------------------------------------------------------------------ the feeder */

const FEED_A = -0.585
const FEED_D: Pt = [Math.cos(FEED_A), Math.sin(FEED_A)]
/** Up and forward, square to the feeder floor. */
const FEED_N: Pt = [FEED_D[1], -FEED_D[0]]
const FEED_LEN = 1.0
/** A paddle a beat at the ball: two steps take it to the top. */
const PITCH = FEED_LEN / 2
const feedPt = (s: number, up = 0): Pt => [MOUTH[0] + FEED_D[0] * s + FEED_N[0] * up, MOUTH[1] + FEED_D[1] * s + FEED_N[1] * up]
const chainAt = (t: number): number => PITCH * surge(t)
const feederBall = (t: number): Pt => feedPt(chainAt(t) - chainAt(CATCH))
const FEED_TOP = feedPt(FEED_LEN)
/** The housing: its floor under the ball, its roof, and how far past the ball's run it goes at each end. */
const FEED_FLOOR = -R
const FEED_ROOF = 0.32
const FEED_S0 = -0.1
const FEED_S1 = 1.14

/* ------------------------------------------------------------------ the body, the drum, the elevator */

const BODY_FRONT = 1.0
const BODY_BACK = 4.5
const BODY_TOP = -0.64
const BODY_FOOT = 0.14
/** The threshing drum behind its porthole, and the circle the ball goes round on in it. */
const DRUM: Pt = [2.1, -0.33]
const PORT_R = 0.2
const WHIRL = 0.075
/** The drum's own turn, radians a second (it runs; it does not surge). */
const DRUM_SPIN = 9
/** Into the drum, round it one and a half times, and thrown off its back up the elevator. */
const IN_DRUM = TIP + 0.18
const whirlAt = (t: number): Pt => {
  const u = (t - IN_DRUM) / (FLING - IN_DRUM)
  const a = Math.PI - u * 3 * Math.PI
  return [DRUM[0] + WHIRL * Math.cos(a), DRUM[1] + WHIRL * Math.sin(a)]
}
/** The elevator: a duct up the tank's side from the drum to the fill head, which turns over the tank. */
const DUCT_X = DRUM[0] + WHIRL
const DUCT_HW = 0.085
const DUCT_FOOT = DRUM[1] - PORT_R + 0.02
const DUCT_TOP = -1.6
/** The fill head: a gooseneck off the top of the duct, turned over toward the back, its mouth up a little. */
const NECK_R = 0.2
const NECK_C: Pt = [DUCT_X + NECK_R, DUCT_TOP]
const NECK_END = (3 * Math.PI) / 2 - 0.5
const neckPt = (a: number, r = NECK_R): Pt => [NECK_C[0] + r * Math.cos(a), NECK_C[1] + r * Math.sin(a)]
/** The fill head's mouth, where the ball comes out over the grain. */
const FILL: Pt = neckPt(NECK_END)

/* ------------------------------------------------------------------ the tank, its grain and its gate */

const TANK_FRONT = 1.46
const TANK_BACK = 3.28
const RIM = -1.3
const FLARE = 0.06
const HEAP_TOP = 0.24
const HEAP_PEAK = 2.32
const HEAP_SPAN = 1.0
/** The grain's surface in the tank, heaped above the rim under the fill head. */
const heapY = (x: number): number => RIM - HEAP_TOP * Math.max(0, 1 - ((x - HEAP_PEAK) / HEAP_SPAN) ** 2)
/** Where the ball lands on the grain, and where it comes to rest against the gate. */
const ON_HEAP = 2.8
const GATE_X = TANK_BACK
const GATE_H = 0.26
const AT_GATE = GATE_X - 0.02 - R
const heapBall = (x: number): Pt => [x, heapY(x) - R]
/** The gate, open this far (0 shut, standing; 1 down flat, a bridge to the hopper). */
const gateOpen = (t: number): number => {
  if (t < GATE) return 0
  const s = (t - GATE) / 0.16
  if (s < 1) return s * s
  const b = t - GATE - 0.16
  return 1 - 0.12 * Math.exp(-b / 0.08) * Math.abs(Math.sin(b * 26))
}
/** The auger's hopper at the tank's back corner, over the pivot the tube swings on. */
const PIVOT: Pt = [3.5, -1.12]
const HOPPER_TOP = -1.36
const HOPPER_W = 0.34
const IN_HOPPER: Pt = [PIVOT[0], -1.29]

/* ------------------------------------------------------------------ the unloading auger */

const TUBE_L = 1.8
const TUBE_HW = 0.085
const STOWED = 0.1
const OUT = -0.5
/** The spout turns the tube's run down this much; stowed it points at the ground, swung out it points level. */
const BEND = 0.5
const NOZZLE = 0.18
/** The tube's angle: on its rest, off it on 94, locked out on 95 with a knock. */
const tubeAngle = (t: number): number => {
  if (t < UNLATCH) return STOWED
  if (t < LOCK) {
    const u = (t - UNLATCH) / (LOCK - UNLATCH)
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
    // Up off the rest first, a little, on the latch.
    return STOWED + (OUT - STOWED) * e - 0.05 * Math.sin(Math.min(1, u * 4) * Math.PI) * (1 - u)
  }
  const s = t - LOCK
  return OUT + 0.06 * Math.exp(-s / 0.12) * Math.sin(s * 34)
}
const tubeEnd = (a: number): Pt => [PIVOT[0] + TUBE_L * Math.cos(a), PIVOT[1] + TUBE_L * Math.sin(a)]
const nozzleEnd = (a: number): Pt => {
  const [ex, ey] = tubeEnd(a)
  return [ex + NOZZLE * Math.cos(a + BEND), ey + NOZZLE * Math.sin(a + BEND)]
}
/** The mouth the ball leaves by, the tube locked out. */
const MUZZLE = nozzleEnd(OUT)
const SUCK = DRAW + 0.14

/* ------------------------------------------------------------------ the bale and the plank */

const BALE_W = 0.84
const BALE_H = 0.4
const PLANK_HALF = 0.75
const PLANK_T = 0.04
const PLANK_Y = GROUND - BALE_H - PLANK_T
/** How far the plank leans: its low end on the ground. */
const LEAN = Math.asin((GROUND - PLANK_Y - PLANK_T) / PLANK_HALF)
/** Where along the plank from the pivot the ball lands, on the high side. */
const U0 = 0.36

/** The plank's angle (positive: right end down). */
function plankAngle(t: number): number {
  if (t < PLANK) return -LEAN
  if (t < THUMP) {
    const u = (t - PLANK) / (THUMP - PLANK)
    return -LEAN + 2 * LEAN * u * u
  }
  const s = t - THUMP
  return LEAN - 0.05 * Math.exp(-s / 0.07) * Math.abs(Math.sin(s * 40))
}
/** A ball on the plank, `u` from the pivot along it, the plank at angle `a`, the bale at `bx`. */
const onPlank = (bx: number, u: number, a: number): Pt => {
  const off = PLANK_T + R
  return [bx + u * Math.cos(a) + off * Math.sin(a), PLANK_Y + u * Math.sin(a) - off * Math.cos(a)]
}

/* ------------------------------------------------------------------ build */

interface CombineState {
  begin: number
  lane: Lane
  /** The bale's centre. */
  bale: number
  /** The lane's end, where the ball leaves on the stubble. */
  end: number
  /** The stalks standing in front of the header. */
  crop: { x: number; h: number; seed: number }[]
}

/** Points along a polyline at arc length `s`. */
function along(pts: Pt[], s: number): Pt {
  let left = s
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const l = Math.hypot(bx - ax, by - ay)
    if (left <= l || i === pts.length - 1) {
      const u = l ? Math.min(1, left / l) : 1
      return [ax + (bx - ax) * u, ay + (by - ay) * u]
    }
    left -= l
  }
  return pts[pts.length - 1]
}
const lengthOf = (pts: Pt[]): number => pts.slice(1).reduce((sum, b, i) => sum + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]), 0)

export const combine = part<CombineState>(
  {
    name: 'combine',
    flight: true,
    draw: (p, s, c) => drawCombine(p, s, c),
    over: (p, s, c) => overCombine(p, s, c),
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const pan = panTrack()
    const segs: Seg[] = []
    // The header and the reel.
    segs.push(...carried((u) => pan(u + slot.begin), 0, at(CATCH), 90))
    // The feeder chain: two steps up, and over the top into the body.
    segs.push(...carried((u) => feederBall(u + slot.begin), at(CATCH), at(TIP), 48))
    // Into the drum (hidden, seen in the porthole), round it, and up the elevator to the fill head.
    const intoDrum = whirlAt(IN_DRUM)
    segs.push(...route([{ at: at(TIP), p: FEED_TOP }, { at: at(IN_DRUM), p: intoDrum, hidden: true }]))
    segs.push(...carried((u) => whirlAt(u + slot.begin), at(IN_DRUM), at(FLING), 36, true))
    const neck: Pt[] = []
    for (let i = 1; i <= 8; i++) neck.push(neckPt(Math.PI + ((NECK_END - Math.PI) * i) / 8))
    const duct: Pt[] = [whirlAt(FLING), [DUCT_X, DUCT_FOOT], [DUCT_X, DUCT_TOP], ...neck]
    const ductLen = lengthOf(duct)
    segs.push(
      ...carried(
        (u) => {
          const f = (u + slot.begin - FLING) / (POP - FLING)
          return along(duct, ductLen * (f * (2 - f)))
        },
        at(FLING),
        at(POP),
        24,
        true,
      ),
    )
    // Out over the grain, and down its slope against the gate.
    const pop: Way = { at: at(POP), p: FILL }
    const landing = heapBall(ON_HEAP)
    segs.push(...route([pop, hop(pop, landing, at(PLOP))]))
    segs.push(
      ...carried(
        (u) => {
          // It lands going back and rolls down the grain, still rolling when it comes against the gate.
          const f = (u + slot.begin - PLOP) / (CLACK - PLOP)
          return heapBall(ON_HEAP + (AT_GATE - ON_HEAP) * f * (1.5 - 0.5 * f))
        },
        at(PLOP),
        at(CLACK),
        20,
      ),
    )
    // Against the gate while the auger comes round; it rattles with the latch and the lock.
    const rest = heapBall(AT_GATE)
    const rattle = (t: number): Pt => {
      const a = knock(t - UNLATCH, 0.08) * Math.sin((t - UNLATCH) * 50) + knock(t - LOCK, 0.08) * Math.sin((t - LOCK) * 50)
      return [rest[0] - 0.012 * Math.abs(a), rest[1] - 0.02 * Math.abs(a)]
    }
    segs.push(...carried((u) => rattle(u + slot.begin), at(CLACK), at(GATE), 60))
    // The gate goes down: over it and into the hopper, where it sits with its crown showing.
    const onGate: Pt = [GATE_X + 0.12, RIM - 0.02 - R]
    segs.push(
      ...route([
        { at: at(GATE), p: rest },
        { at: at(GATE) + 0.2, p: onGate, ease: 'in' },
        { at: at(GATE) + 0.34, p: IN_HOPPER, ease: 'in' },
        { at: at(DRAW), p: IN_HOPPER },
      ]),
    )
    // The auger takes it: down into the boot, up the tube, round the spout.
    const tube: Pt[] = [IN_HOPPER, PIVOT, tubeEnd(OUT), MUZZLE]
    const tubeLen = lengthOf(tube)
    segs.push(...route([{ at: at(DRAW), p: IN_HOPPER }, { at: at(SUCK), p: [PIVOT[0], PIVOT[1] - 0.02], ease: 'in', hidden: true }]))
    segs.push(
      ...carried(
        (u) => {
          const f = (u + slot.begin - SUCK) / (FIRE - SUCK)
          const d = lengthOf([IN_HOPPER, [PIVOT[0], PIVOT[1] - 0.02]])
          return along(tube, d + (tubeLen - d) * f)
        },
        at(SUCK),
        at(FIRE),
        24,
        true,
      ),
    )
    // Fired off the spout, onto the high end of the plank.
    const T = PLANK - FIRE
    const vx = 2.35
    const land0 = onPlank(0, U0, -LEAN)
    const bale = MUZZLE[0] + vx * T - land0[0]
    const fire: Way = { at: at(FIRE), p: MUZZLE }
    segs.push(...route([fire, hop(fire, [bale + land0[0], land0[1]], at(PLANK))]))
    // The plank comes down with it.
    segs.push(...carried((u) => onPlank(bale, U0, plankAngle(u + slot.begin)), at(PLANK), at(THUMP), 24))
    // And it rolls off the low end onto the stubble, up to the pace of the field.
    const tipEnd = onPlank(bale, PLANK_HALF, LEAN)
    const off: Pt[] = [onPlank(bale, U0, LEAN), tipEnd, [tipEnd[0] + 0.1, ON_GROUND]]
    const offLen = lengthOf(off)
    const Tr = EXIT - THUMP
    const v0 = Math.max(0, (2 * (offLen + 0.12)) / Tr - ROLL)
    const acc = (ROLL - v0) / Tr
    const runTo = (tau: number) => v0 * tau + 0.5 * acc * tau * tau
    const total = runTo(Tr)
    const path: Pt[] = [...off, [off[2][0] + (total - offLen), ON_GROUND]]
    segs.push(...carried((u) => along(path, runTo(u + slot.begin - THUMP)), at(THUMP), at(EXIT), 24))
    const end = path[path.length - 1][0]

    const crop = [
      { x: -2.25, h: 2.2, seed: 811 },
      { x: -1.72, h: 1.9, seed: 813 },
    ]
    return {
      cells: box(-3, -3, end + 1.5, 2),
      exit: [end + 0.5, ON_GROUND],
      lane: { segs, fire: at(SWEEP) },
      state: { begin: slot.begin, lane: { segs, fire: at(SWEEP) }, bale, end, crop },
    }
  },
  (slot, built) => {
    const s = built.state
    const keys: PartShot[] = [
      { t: slot.begin, cells: 5.4 },
      { t: beat(87.5), cells: 6.2, hold: [1.0, -0.85], w: 0.7 },
      { t: beat(93), cells: 6.3, hold: [2.4, -0.9], w: 0.7 },
      { t: beat(97), cells: 6.3, hold: [3.4, -0.9], w: 0.65 },
      { t: beat(99), cells: 5.9, hold: [s.bale - 0.4, -0.4], w: 0.55 },
      // (No key at the hand-off: from the bale the frame eases out along with him to the gate's first framing, in one move.)
    ]
    return keys
  },
)

/* ------------------------------------------------------------------ drawing */

const X = (k: number) => (x: number) => x * k

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/**
 * A round pipe from `a` to `b`, `hw` its half width, with the ball's bulge
 * `at` (a fraction along it) when the ball is inside.
 */
function pipe(p: p5, k: number, ink: string, w: number, fill: string, a: Pt, b: Pt, hw: number, at: number | null, caps = true): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  p.push()
  p.translate(a[0] * k, a[1] * k)
  p.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]))
  p.noStroke()
  p.fill(fill)
  poly(p, k, [[0, -hw], [L, -hw], [L, hw], [0, hw]])
  const rb = R + 0.035
  let gap: [number, number] | null = null
  if (at !== null) {
    const u = at * L
    solid(p, ink, w, fill)
    p.circle(u * k, 0, rb * 2 * k)
    p.noStroke()
    p.fill(fill)
    const h = Math.sqrt(rb * rb - hw * hw)
    poly(p, k, [[u - h - 0.01, -hw + 0.004], [u + h + 0.01, -hw + 0.004], [u + h + 0.01, hw - 0.004], [u - h - 0.01, hw - 0.004]])
    gap = [u - h, u + h]
    // The flights of the auger turning round it.
    outline(p, ink, w * 0.5)
    p.arc(u * k, 0, rb * 1.3 * k, rb * 1.3 * k, -2.2, -0.9)
  }
  outline(p, ink, w)
  for (const y of [-hw, hw]) {
    if (gap && gap[0] < L && gap[1] > 0) {
      if (gap[0] > 0) p.line(0, y * k, gap[0] * k, y * k)
      if (gap[1] < L) p.line(gap[1] * k, y * k, L * k, y * k)
    } else p.line(0, y * k, L * k, y * k)
  }
  if (caps) {
    p.line(0, -hw * k, 0, hw * k)
    p.line(L * k, -hw * k, L * k, hw * k)
  }
  p.pop()
}

function drawCombine(p: p5, s: CombineState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const f = frame(p, k)
  const x = X(k)

  // The field beyond: uncut corn, one calm wall, from the dam to past the bale.
  // It ends behind the combine's back wheel: everything this side of it is cut.
  const w0 = Math.max(-2.6, f.x0 - 1)
  const w1 = Math.min(WALL_END - 0.3, f.x1 + 1)
  if (w1 > w0) cornWall(p, k, ink, weight, { x0: w0, x1: w1, foot: GROUND - 0.32, h: 1.1, t, fill: DUST.sage, seed: 41, tassels: false })

  // The ground, and the stubble the combine left behind it.
  outline(p, ink, weight)
  p.line(x(-2.75), x(GROUND), x(s.end + 0.4), x(GROUND))
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(weight * 0.55)
  const s0 = Math.max(-0.95, f.x0 - 0.5)
  const s1 = Math.min(s.end + 0.35, f.x1 + 0.5)
  for (let i = Math.floor(s0 / 0.17); i < s1 / 0.17; i++) {
    const sx = i * 0.17 + hash(i, 3) * 0.07
    const h = 0.07 + hash(i, 4) * 0.07
    p.line(x(sx), x(GROUND), x(sx + 0.015), x(GROUND - h))
  }

  // The corn it has not cut yet, standing in front of the header.
  for (const st of s.crop) {
    const since = t - LAND
    const shiver = since > 0 ? Math.exp(-since / 0.5) * Math.sin(since * 18) * 0.04 : 0
    stalk(p, k, ink, weight, { x: st.x, foot: GROUND, h: st.h, seed: st.seed, sway: Math.sin(t * 0.8 + st.seed) * 0.025 + shiver })
  }

  drawBale(p, s, c, t)
  drawBody(p, s, c, t)
  drawHeader(p, c, t)
  drawChaff(p, c, t)
}

/** The straw bale, and the plank across it. */
function drawBale(p: p5, s: CombineState, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = X(k)
  const bx = s.bale
  solid(p, ink, weight, DUST.husk)
  p.rect(x(bx), x(GROUND - BALE_H / 2), x(BALE_W), x(BALE_H), x(0.07))
  // Straw, and the two strings round it.
  p.stroke(alpha(p, ink, 0.35))
  p.strokeWeight(weight * 0.45)
  for (let i = 0; i < 9; i++) {
    const yy = GROUND - BALE_H + 0.05 + (i % 3) * 0.1 + hash(i, 5) * 0.03
    const xx = bx - BALE_W / 2 + 0.08 + hash(i, 6) * (BALE_W - 0.25)
    p.line(x(xx), x(yy), x(xx + 0.1), x(yy + 0.01))
  }
  outline(p, DUST.rust, weight * 0.8)
  for (const d of [-0.18, 0.18]) p.line(x(bx + d), x(GROUND - BALE_H + 0.01), x(bx + d), x(GROUND - 0.01))
  // The plank.
  const a = plankAngle(t)
  p.push()
  p.translate(x(bx), x(PLANK_Y))
  p.rotate(a)
  solid(p, ink, weight, DUST.wood)
  p.rect(0, 0, x(PLANK_HALF * 2), x(PLANK_T * 2))
  outline(p, ink, weight * 0.45)
  for (const d of [-0.5, 0.1, 0.55]) p.line(x(d), x(-0.01), x(d + 0.12), x(0.012))
  p.pop()
  // Dust where it comes down.
  const since = t - THUMP
  if (since > 0 && since < 1) {
    const [ex] = onPlank(bx, PLANK_HALF, LEAN)
    p.push()
    p.drawingContext.globalAlpha = 1 - since
    puff(p, k, ink, weight * 0.6, DUST.bone, ex + 0.05 + since * 0.25, GROUND - 0.06 - since * 0.12, 0.05 + since * 0.1)
    puff(p, k, ink, weight * 0.6, DUST.bone, ex - 0.25 - since * 0.2, GROUND - 0.05 - since * 0.1, 0.04 + since * 0.08)
    p.pop()
  }
}

function wheel(p: p5, k: number, ink: string, weight: number, cx: number, cy: number, r: number): void {
  const x = X(k)
  solid(p, ink, weight, ink)
  // Lugs round the tread.
  const n = Math.round(r * 30)
  p.push()
  p.translate(x(cx), x(cy))
  for (let i = 0; i < n; i++) {
    p.push()
    p.rotate((i / n) * Math.PI * 2 + 0.2)
    p.rect(x(r - 0.005), 0, x(0.05), x(0.07))
    p.pop()
  }
  p.pop()
  p.circle(x(cx), x(cy), x(r * 2))
  solid(p, ink, weight * 0.7, DUST.corn)
  p.circle(x(cx), x(cy), x(r * 1.1))
  solid(p, ink, weight * 0.6, DUST.rust)
  p.circle(x(cx), x(cy), x(r * 0.42))
  p.noStroke()
  p.fill(ink)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    p.circle(x(cx + Math.cos(a) * r * 0.36), x(cy + Math.sin(a) * r * 0.36), x(0.025))
  }
}

/** Where the far corn stops: behind the back wheel, which hides its edge. */
const WALL_END = 4.0
const FRONT_WHEEL: [number, number, number] = [1.75, GROUND - 0.62, 0.62]
const REAR_WHEEL: [number, number, number] = [3.98, GROUND - 0.36, 0.36]

function drawBody(p: p5, s: CombineState, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = X(k)
  const W = weight * 1.1

  // The body: from the feeder's top back over the engine to the spreader.
  solid(p, ink, W, DUST.corn)
  poly(p, k, [
    [BODY_FRONT, BODY_FOOT],
    [BODY_FRONT, -0.86],
    [TANK_FRONT - 0.02, -0.86],
    [TANK_FRONT - 0.02, BODY_TOP],
    [BODY_BACK - 0.35, BODY_TOP],
    [BODY_BACK - 0.35, -0.72],
    [BODY_BACK - 0.12, -0.72],
    [BODY_BACK + 0.02, -0.4],
    [BODY_BACK + 0.02, 0.02],
    [BODY_BACK - 0.1, BODY_FOOT],
  ])
  // A rust band along its flank.
  solid(p, ink, weight * 0.7, DUST.rust)
  poly(p, k, [[BODY_FRONT, -0.02], [BODY_BACK + 0.02, -0.02], [BODY_BACK + 0.02, 0.05], [BODY_FRONT, 0.05]])
  // Engine grille.
  outline(p, ink, weight * 0.55)
  for (let i = 0; i < 4; i++) p.line(x(3.62), x(-0.5 + i * 0.08), x(4.25), x(-0.5 + i * 0.08))

  // The tank.
  drawTank(p, c, t)

  // The porthole on the drum.
  drawPorthole(p, s, c, t)

  // The elevator duct up the tank's side, the ball's bulge in it while it goes up.
  const lp = laneAt(s.lane, c.t)
  let bulge: number | null = null
  if (t > FLING && t < POP && lp.hidden && lp.x > DUCT_X - 0.1 && lp.x < DUCT_X + 0.1) bulge = (DUCT_FOOT - lp.y) / (DUCT_FOOT - DUCT_TOP)
  if (bulge !== null && (bulge < 0 || bulge > 1)) bulge = null
  pipe(p, k, ink, weight, DUST.corn, [DUCT_X, DUCT_FOOT], [DUCT_X, DUCT_TOP], DUCT_HW, bulge, false)

  // The cab: glass all round, and nobody in it.
  drawCab(p, c, t)

  // The unloading auger.
  drawAuger(p, c, t, lp)

  // The back axle's frame, down to the wheel.
  solid(p, ink, weight * 0.8, DUST.shade)
  poly(p, k, [[REAR_WHEEL[0] - 0.3, BODY_FOOT], [REAR_WHEEL[0] + 0.3, BODY_FOOT], [REAR_WHEEL[0] + 0.14, REAR_WHEEL[1]], [REAR_WHEEL[0] - 0.14, REAR_WHEEL[1]]])
  // Wheels.
  wheel(p, k, ink, weight, ...FRONT_WHEEL)
  wheel(p, k, ink, weight, ...REAR_WHEEL)

  // The shaker at the tail, going on the eighths.
  const shake = 0.025 * Math.sin(((t - ORIGIN) / PERIOD) * Math.PI * 4)
  solid(p, ink, weight * 0.7, DUST.shade)
  poly(p, k, [[BODY_BACK - 0.05 + shake, 0.02], [BODY_BACK + 0.22 + shake, 0.07], [BODY_BACK + 0.22 + shake, 0.12], [BODY_BACK - 0.05 + shake, 0.1]])
  outline(p, ink, weight * 0.45)
  for (let i = 1; i < 4; i++) {
    const sx = BODY_BACK - 0.05 + shake + i * 0.065
    p.line(x(sx), x(0.03 + i * 0.013), x(sx), x(0.1 + i * 0.006))
  }
}

function drawTank(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = X(k)
  // The grain, heaped over the rim.
  solid(p, ink, weight * 0.8, DUST.husk)
  p.beginShape()
  p.vertex(x(TANK_FRONT - FLARE + 0.04), x(RIM + 0.05))
  for (let i = 0; i <= 24; i++) {
    const hx = TANK_FRONT - FLARE + 0.04 + ((TANK_BACK + FLARE - 0.06 - (TANK_FRONT - FLARE + 0.04)) * i) / 24
    p.vertex(x(hx), x(heapY(hx)))
  }
  p.vertex(x(TANK_BACK + FLARE - 0.06), x(RIM + 0.05))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, DUST.wood, 0.9))
  for (let i = 0; i < 26; i++) {
    const hx = TANK_FRONT + 0.05 + hash(i, 21) * (TANK_BACK - TANK_FRONT - 0.1)
    const hy = heapY(hx) + 0.03 + hash(i, 22) * 0.06
    if (hy > RIM) continue
    p.circle(x(hx), x(hy), x(0.022))
  }
  // Kernels thrown up where it lands.
  const since = t - PLOP
  if (since > 0 && since < 0.5) {
    p.fill(DUST.corn)
    p.stroke(ink)
    p.strokeWeight(weight * 0.4)
    for (let i = 0; i < 7; i++) {
      const vx = (hash(i, 23) - 0.5) * 1.4
      const vy = -1.2 - hash(i, 24) * 0.8
      const gx = ON_HEAP + vx * since
      const gy = heapY(ON_HEAP) + vy * since + 0.5 * G_EARTH * since * since
      if (gy > heapY(gx)) continue
      p.circle(x(gx), x(gy), x(0.04))
    }
  }
  // The tank itself, flared at the top, a rust rim.
  solid(p, ink, weight * 1.1, DUST.corn)
  poly(p, k, [[TANK_FRONT, BODY_TOP], [TANK_BACK, BODY_TOP], [TANK_BACK + FLARE, RIM], [TANK_FRONT - FLARE, RIM]])
  solid(p, ink, weight * 0.8, DUST.rust)
  poly(p, k, [[TANK_FRONT - FLARE, RIM], [TANK_BACK + FLARE, RIM], [TANK_BACK + FLARE * 0.9, RIM + 0.07], [TANK_FRONT - FLARE * 0.9, RIM + 0.07]])
  outline(p, ink, weight * 0.5)
  for (const rx of [1.95, 2.75]) p.line(x(rx), x(RIM + 0.07), x(rx), x(BODY_TOP))
  // The gate at its back corner: shut, standing; on 96 it goes down flat.
  const g = gateOpen(t)
  p.push()
  p.translate(x(GATE_X + 0.02), x(RIM))
  // It rattles when the ball comes against it.
  const rattle = knock(t - CLACK, 0.1) * Math.sin((t - CLACK) * 60) * 0.08
  p.rotate(g * Math.PI / 2 + rattle)
  solid(p, ink, weight * 0.9, DUST.bone)
  p.rect(x(0.03), x(-GATE_H / 2), x(0.06), x(GATE_H), x(0.012))
  solid(p, ink, weight * 0.7, DUST.rust)
  p.circle(0, 0, x(0.06))
  p.pop()
}

function drawPorthole(p: p5, s: CombineState, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = X(k)
  const [dx, dy] = DRUM
  // A warm light in it while the drum has the ball.
  const lit = smooth(t, TIP, IN_DRUM + 0.1) * (1 - smooth(t, FLING, FLING + 0.3))
  solid(p, ink, weight * 1.1, DUST.bone)
  p.circle(x(dx), x(dy), x((PORT_R + 0.05) * 2))
  solid(p, ink, weight * 0.8, ink)
  p.circle(x(dx), x(dy), x(PORT_R * 2))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.beginPath()
  ctx.arc(x(dx), x(dy), x(PORT_R), 0, Math.PI * 2)
  ctx.clip()
  if (lit > 0) {
    p.noStroke()
    p.fill(alpha(p, DUST.light, 0.4 * lit))
    p.circle(x(dx), x(dy), x(PORT_R * 2))
  }
  // The drum's rasp bars going round past the glass.
  const spin = -t * DRUM_SPIN
  p.stroke(alpha(p, DUST.shade, 0.75))
  p.strokeWeight(weight * 1.3)
  p.noFill()
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * Math.PI) / 3
    p.arc(x(dx), x(dy), x(0.34), x(0.34), a, a + 0.45)
  }
  // The ball, when it is in there.
  const lp = laneAt(s.lane, c.t)
  if (lp.hidden && Math.hypot(lp.x - dx, lp.y - dy) < PORT_R + R) {
    ball(p, k, ink, weight, c.color, x(lp.x), x(lp.y), c.spin(lp.x))
  }
  p.pop()
  // The glass.
  p.stroke(alpha(p, DUST.light, 0.7))
  p.strokeWeight(weight * 0.9)
  p.noFill()
  p.arc(x(dx), x(dy), x(PORT_R * 1.45), x(PORT_R * 1.45), Math.PI * 1.08, Math.PI * 1.42)
  // Bolts round the ring.
  p.noStroke()
  p.fill(ink)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3
    p.circle(x(dx + Math.cos(a) * (PORT_R + 0.025)), x(dy + Math.sin(a) * (PORT_R + 0.025)), x(0.018))
  }
}

/** Where the cab is: its floor on the body's front, glass to the roof, the aerial on the roof. */
const CAB = { x0: 0.46, x1: 1.44, floor: -0.86, roof: -1.46 }

function drawCab(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = X(k)
  // The platform it stands on, and the rail round it.
  solid(p, ink, weight, DUST.corn)
  poly(p, k, [[CAB.x0 - 0.08, CAB.floor], [BODY_FRONT + 0.1, CAB.floor], [BODY_FRONT + 0.1, CAB.floor + 0.08], [CAB.x0 - 0.08, CAB.floor + 0.08]])
  outline(p, ink, weight * 0.6)
  p.line(x(CAB.x0 - 0.05), x(CAB.floor), x(CAB.x0 - 0.05), x(CAB.floor - 0.22))
  p.line(x(CAB.x0 - 0.05), x(CAB.floor - 0.22), x(CAB.x0 + 0.02), x(CAB.floor - 0.22))
  // The cab: a frame of posts round big panes.
  solid(p, ink, weight * 1.1, DUST.corn)
  poly(p, k, [[CAB.x0 + 0.06, CAB.floor], [CAB.x1, CAB.floor], [CAB.x1, CAB.roof + 0.06], [CAB.x0 - 0.02, CAB.roof + 0.06]])
  const glass: Pt[] = [[CAB.x0 + 0.12, CAB.floor - 0.05], [CAB.x1 - 0.07, CAB.floor - 0.05], [CAB.x1 - 0.07, CAB.roof + 0.13], [CAB.x0 + 0.05, CAB.roof + 0.13]]
  solid(p, ink, weight * 0.7, DUST.sky)
  poly(p, k, glass)
  // Nobody at the wheel: the seat, its back, the column and the wheel.
  const seat = CAB.floor - 0.17
  solid(p, ink, weight * 0.6, DUST.denim)
  p.rect(x(1.14), x(seat - 0.2), x(0.12), x(0.3), x(0.035))
  p.rect(x(1.07), x(seat), x(0.24), x(0.09), x(0.03))
  p.rect(x(1.16), x(seat - 0.4), x(0.1), x(0.07), x(0.025))
  outline(p, ink, weight * 0.7)
  p.line(x(1.12), x(seat + 0.05), x(1.12), x(CAB.floor - 0.04))
  p.line(x(0.7), x(CAB.floor - 0.04), x(0.8), x(CAB.floor - 0.28))
  p.push()
  p.translate(x(0.81), x(CAB.floor - 0.3))
  p.rotate(-1.05)
  solid(p, ink, weight * 0.7, DUST.denim)
  p.ellipse(0, 0, x(0.22), x(0.05))
  p.pop()
  // The glass's shine, and the post between the panes.
  p.stroke(alpha(p, DUST.light, 0.8))
  p.strokeWeight(weight * 1.2)
  p.line(x(CAB.x0 + 0.2), x(CAB.floor - 0.12), x(CAB.x0 + 0.42), x(CAB.roof + 0.2))
  outline(p, ink, weight * 0.7)
  p.line(x(0.93), x(CAB.floor - 0.05), x(0.93), x(CAB.roof + 0.13))
  // The roof.
  solid(p, ink, weight * 1.1, DUST.corn)
  poly(p, k, [[CAB.x0 - 0.08, CAB.roof + 0.07], [CAB.x1 + 0.05, CAB.roof + 0.07], [CAB.x1 + 0.05, CAB.roof - 0.02], [CAB.x0 - 0.04, CAB.roof - 0.02]])
  // The aerial and its lamp: every two beats, 1.25 s, the tick.
  const mast: Pt = [CAB.x1 - 0.14, CAB.roof - 0.02]
  const top = mast[1] - 0.3
  outline(p, ink, weight * 0.7)
  p.line(x(mast[0]), x(mast[1]), x(mast[0]), x(top))
  const b = (t - ORIGIN) / PERIOD
  const since = (((b % 2) + 2) % 2) * PERIOD
  const on = Math.exp(-since / 0.14)
  if (on > 0.05) {
    p.noStroke()
    p.fill(alpha(p, DUST.light, 0.55 * on))
    p.circle(x(mast[0]), x(top - 0.03), x(0.22 * on + 0.06))
  }
  solid(p, ink, weight * 0.6, on > 0.3 ? DUST.light : DUST.rust)
  p.circle(x(mast[0]), x(top - 0.03), x(0.07))
}

function drawAuger(p: p5, c: Ctx, t: number, lp: ReturnType<typeof laneAt>): void {
  const { k, ink, weight } = c
  const x = X(k)
  // The rest it lies on, and the latch that lets it go on 94.
  const rest: Pt = [4.3, -0.72]
  solid(p, ink, weight * 0.8, DUST.corn)
  poly(p, k, [[rest[0] - 0.03, rest[1]], [rest[0] + 0.03, rest[1]], [rest[0] + 0.03, -0.9], [rest[0] - 0.03, -0.9]])
  outline(p, ink, weight * 0.8)
  // The latch: a hook over the tube, thrown back on 94.
  const latch = t < UNLATCH ? 0 : Math.min(1, (t - UNLATCH) / 0.07) - 0.15 * knock(t - UNLATCH - 0.07, 0.1) * Math.sin((t - UNLATCH) * 40)
  p.push()
  p.translate(x(rest[0] + 0.04), x(-0.9))
  p.rotate(latch * 1.3)
  outline(p, DUST.rust, weight * 1.6)
  p.line(0, 0, 0, x(-0.15))
  p.line(0, x(-0.15), x(-0.07), x(-0.17))
  p.pop()
  // The column up to the hopper.
  solid(p, ink, weight, DUST.corn)
  poly(p, k, [[PIVOT[0] - 0.08, BODY_TOP], [PIVOT[0] + 0.08, BODY_TOP], [PIVOT[0] + 0.08, PIVOT[1]], [PIVOT[0] - 0.08, PIVOT[1]]])

  const a = tubeAngle(t)
  const end = tubeEnd(a)
  // The ball's bulge along the tube.
  let at: number | null = null
  if (lp.hidden && t > SUCK && t < FIRE) {
    const u = ((lp.x - PIVOT[0]) * Math.cos(a) + (lp.y - PIVOT[1]) * Math.sin(a)) / TUBE_L
    if (u > 0.04 && u < 1) at = u
  }
  pipe(p, k, ink, weight, DUST.corn, PIVOT, end, TUBE_HW, at, false)
  // Its end: the spout, turned down, and the flap across the spout's mouth.
  const d = a + BEND
  const nz = nozzleEnd(a)
  solid(p, ink, weight, DUST.rust)
  poly(p, k, [
    [end[0] - Math.sin(a) * TUBE_HW - Math.cos(a) * 0.02, end[1] + Math.cos(a) * TUBE_HW - Math.sin(a) * 0.02],
    [end[0] + Math.sin(a) * TUBE_HW - Math.cos(a) * 0.02, end[1] - Math.cos(a) * TUBE_HW - Math.sin(a) * 0.02],
    [nz[0] + Math.sin(d) * (TUBE_HW + 0.01), nz[1] - Math.cos(d) * (TUBE_HW + 0.01)],
    [nz[0] - Math.sin(d) * (TUBE_HW + 0.01), nz[1] + Math.cos(d) * (TUBE_HW + 0.01)],
  ])
  // The flap: hinged at the top of the mouth; the ball knocks it open on 98.
  const kick = t < FIRE ? 0 : Math.min(1, (t - FIRE) / 0.05) * Math.exp(-Math.max(0, t - FIRE - 0.05) / 0.25)
  const hinge: Pt = [nz[0] + Math.sin(d) * (TUBE_HW + 0.01), nz[1] - Math.cos(d) * (TUBE_HW + 0.01)]
  p.push()
  p.translate(x(hinge[0]), x(hinge[1]))
  p.rotate(d + Math.PI / 2 - kick * 1.7)
  solid(p, ink, weight * 0.9, DUST.bone)
  p.rect(x(0.13), x(0.02), x(0.27), x(0.05), x(0.012))
  solid(p, ink, weight * 0.6, DUST.rust)
  p.circle(0, 0, x(0.05))
  p.pop()
  // The pivot's collar, and the drive's hub in it, which turns while the auger runs.
  solid(p, ink, weight, DUST.rust)
  p.circle(x(PIVOT[0]), x(PIVOT[1]), x(0.16))
  const run = smooth(t, DRAW - 0.05, DRAW + 0.05) * (1 - smooth(t, FIRE + 0.4, FIRE + 0.9))
  const turn = run > 0 ? (t - DRAW) * 14 : 0
  outline(p, ink, weight * 0.7)
  for (let i = 0; i < 3; i++) {
    const r = turn + (i * 2 * Math.PI) / 3
    p.line(x(PIVOT[0]), x(PIVOT[1]), x(PIVOT[0] + Math.cos(r) * 0.065), x(PIVOT[1] + Math.sin(r) * 0.065))
  }

  // A spray of grain out after the ball.
  const since = t - FIRE
  if (since > 0 && since < 0.9) {
    p.stroke(ink)
    p.strokeWeight(weight * 0.4)
    p.fill(DUST.corn)
    for (let i = 0; i < 9; i++) {
      const vx = 1.3 + hash(i, 31) * 1.2
      const vy = -0.6 + hash(i, 32) * 0.9
      const gx = MUZZLE[0] + vx * since
      const gy = MUZZLE[1] + vy * since + 0.5 * G_EARTH * since * since
      if (gy > GROUND) continue
      p.circle(x(gx), x(gy), x(0.035))
    }
  }
}

function drawHeader(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = X(k)
  const dip = dipAt(t)
  p.push()
  p.translate(0, x(dip))
  // The back sheet, where the feeder takes the crop in.
  solid(p, ink, weight, DUST.corn)
  poly(p, k, [[PAN_BACK - 0.16, 0.27], [PAN_BACK + 0.06, 0.27], [PAN_BACK + 0.06, -0.72], [PAN_BACK - 0.04, -0.82], [PAN_BACK - 0.36, -0.82], [PAN_BACK - 0.36, -0.74], [PAN_BACK - 0.16, -0.7]])
  outline(p, ink, weight * 0.5)
  p.line(x(PAN_BACK - 0.1), x(0.2), x(PAN_BACK - 0.1), x(-0.66))
  // The pan's floor.
  outline(p, ink, weight)
  p.line(x(PAN_FRONT), x(FLOOR), x(PAN_BACK), x(FLOOR))
  // The reel's arm and ram, from the back sheet to the hub.
  outline(p, ink, weight * 1.3)
  p.line(x(PAN_BACK - 0.05), x(-0.74), x(REEL[0]), x(REEL[1]))
  outline(p, ink, weight * 0.7)
  p.line(x(PAN_BACK), x(-0.45), x((PAN_BACK + REEL[0]) / 2), x((-0.72 + REEL[1]) / 2 + 0.03))
  // The reel: spider arms, the bats end on, and the tines hanging off them.
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(weight * 0.6)
  p.noFill()
  p.circle(x(REEL[0]), x(REEL[1]), x(REEL_R * 2))
  for (let i = 0; i < BATS; i++) {
    const [bx, by] = batAt(i, t)
    outline(p, ink, weight * 0.55)
    p.line(x(REEL[0]), x(REEL[1]), x(bx), x(by))
    // A tine: always pointing down and a little back, as a cam keeps it.
    outline(p, ink, weight * 0.55)
    p.line(x(bx), x(by), x(bx + 0.03), x(by + 0.12))
    solid(p, ink, weight * 0.7, DUST.bone)
    p.rect(x(bx), x(by), x(0.08), x(0.055), x(0.012))
  }
  solid(p, ink, weight * 0.8, DUST.rust)
  p.circle(x(REEL[0]), x(REEL[1]), x(0.11))
  // The cutter bar along the front of the pan, teeth forward.
  outline(p, ink, weight * 0.7)
  for (let i = 0; i < 3; i++) p.line(x(PAN_FRONT - 0.02 - i * 0.02), x(FLOOR + 0.02 + i * 0.02), x(PAN_FRONT - 0.14), x(FLOOR + 0.05))
  p.pop()
  // Chaff off the pan where the ball comes down, and where the bat takes it.
  for (const [at, px, big] of [[LAND, -0.5, 1], [SWEEP, -0.12, 0.7]] as const) {
    const age = t - at
    if (age < 0 || age > 0.9) continue
    p.push()
    p.drawingContext.globalAlpha = 1 - age / 0.9
    for (const side of [-1, 1]) puff(p, k, ink, weight * 0.5, DUST.husk, px + side * (0.1 + age * 0.35) * big, FLOOR - 0.1 - age * 0.25, (0.035 + age * 0.07) * big)
    p.pop()
  }
  drawFeeder(p, c, t)
}

function feederQuad(s0: number, s1: number, h0: number, h1: number): Pt[] {
  return [feedPt(s0, h0), feedPt(s1, h0), feedPt(s1, h1), feedPt(s0, h1)]
}

function drawFeeder(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x = X(k)
  // Inside: the far wall, in shadow.
  solid(p, ink, weight, DUST.shade)
  const inside = feederQuad(FEED_S0, FEED_S1, FEED_FLOOR, FEED_ROOF)
  poly(p, k, inside)
  // The chain's paddles, a step a beat.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.beginPath()
  inside.forEach(([px, py], i) => (i ? ctx.lineTo(px * k, py * k) : ctx.moveTo(px * k, py * k)))
  ctx.closePath()
  ctx.clip()
  const base = chainAt(t) - chainAt(CATCH) - R - 0.03
  const first = Math.ceil((FEED_S0 - 0.1 - base) / PITCH)
  for (let i = first; base + i * PITCH < FEED_S1 + 0.1; i++) {
    const sp = base + i * PITCH
    const a = feedPt(sp, FEED_ROOF - 0.04)
    const b = feedPt(sp, FEED_FLOOR + 0.03)
    outline(p, ink, weight * 1.1)
    p.line(x(a[0]), x(a[1]), x(b[0]), x(b[1]))
    solid(p, ink, weight * 0.6, DUST.rust)
    p.circle(x(a[0]), x(a[1]), x(0.05))
  }
  p.pop()
}

function overCombine(p: p5, s: CombineState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const x = X(k)
  // The feeder's near side: a rail along the floor, the roof, and the top end where it goes into the body.
  solid(p, ink, weight, DUST.corn)
  poly(p, k, feederQuad(FEED_S0, FEED_S1, FEED_FLOOR - 0.08, FEED_FLOOR + 0.06))
  poly(p, k, feederQuad(FEED_S0, FEED_S1, FEED_ROOF - 0.1, FEED_ROOF + 0.06))
  poly(p, k, feederQuad(FEED_LEN + 0.02, FEED_S1, FEED_FLOOR - 0.08, FEED_ROOF + 0.06))
  // The header's near end: low at the front, so what is in the pan shows over it.
  const dip = dipAt(t)
  p.push()
  p.translate(0, x(dip))
  solid(p, ink, weight * 1.1, DUST.corn)
  poly(p, k, [[PAN_FRONT - 0.2, FLOOR + 0.1], [PAN_FRONT + 0.04, FLOOR - 0.035], [PAN_BACK + 0.06, FLOOR - 0.035], [PAN_BACK + 0.06, FLOOR + 0.14], [PAN_FRONT + 0.02, FLOOR + 0.14]])
  outline(p, ink, weight * 0.5)
  p.line(x(PAN_FRONT + 0.1), x(FLOOR + 0.05), x(PAN_BACK - 0.05), x(FLOOR + 0.05))
  p.pop()
  // The fill head over the tank, so the ball comes out of it and not over it: a gooseneck, and a lip at its mouth.
  solid(p, ink, weight, DUST.corn)
  p.beginShape()
  const n = 12
  for (let i = 0; i <= n; i++) {
    const [px, py] = neckPt(Math.PI + ((NECK_END - Math.PI) * i) / n, NECK_R + DUCT_HW)
    p.vertex(x(px), x(py))
  }
  for (let i = n; i >= 0; i--) {
    const [px, py] = neckPt(Math.PI + ((NECK_END - Math.PI) * i) / n, NECK_R - DUCT_HW)
    p.vertex(x(px), x(py))
  }
  p.vertex(x(DUCT_X + DUCT_HW), x(DUCT_TOP + 0.03))
  p.vertex(x(DUCT_X - DUCT_HW), x(DUCT_TOP + 0.03))
  p.endShape(p.CLOSE)
  const lip0 = neckPt(NECK_END, NECK_R + DUCT_HW + 0.02)
  const lip1 = neckPt(NECK_END, NECK_R - DUCT_HW - 0.02)
  const back0 = neckPt(NECK_END - 0.3, NECK_R + DUCT_HW + 0.02)
  const back1 = neckPt(NECK_END - 0.3, NECK_R - DUCT_HW - 0.02)
  solid(p, ink, weight * 0.8, DUST.rust)
  poly(p, k, [lip0, lip1, back1, back0])
  // The hopper's near lip: the ball's crown shows over it while it waits.
  solid(p, ink, weight, DUST.corn)
  poly(p, k, [[PIVOT[0] - HOPPER_W / 2, HOPPER_TOP + 0.1], [PIVOT[0] + HOPPER_W / 2, HOPPER_TOP + 0.1], [PIVOT[0] + 0.08, PIVOT[1] + 0.02], [PIVOT[0] - 0.08, PIVOT[1] + 0.02]])
  solid(p, ink, weight * 0.8, DUST.rust)
  poly(p, k, [[PIVOT[0] - HOPPER_W / 2 - 0.02, HOPPER_TOP + 0.06], [PIVOT[0] + HOPPER_W / 2 + 0.02, HOPPER_TOP + 0.06], [PIVOT[0] + HOPPER_W / 2 + 0.02, HOPPER_TOP + 0.11], [PIVOT[0] - HOPPER_W / 2 - 0.02, HOPPER_TOP + 0.11]])
}

/** Chaff out of the back on the beats while the machine runs, a cloud of it after the drum. */
function drawChaff(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const b0 = Math.floor((t - ORIGIN) / PERIOD)
  for (let j = 0; j < 3; j++) {
    const b = b0 - j
    const at = beat(b)
    const age = t - at
    if (age < 0 || age > 1.4) continue
    const big = Math.abs(b - 91) < 0.1 || Math.abs(b - 92) < 0.1
    const u = age / 1.4
    p.push()
    p.drawingContext.globalAlpha = (1 - u) * (big ? 0.9 : 0.55)
    const r = (big ? 0.1 : 0.05) + age * (big ? 0.16 : 0.08)
    puff(p, k, ink, weight * 0.5, DUST.husk, BODY_BACK + 0.3 + age * 0.6, 0.12 + age * 0.12 - age * age * 0.1, r)
    p.pop()
  }
}
