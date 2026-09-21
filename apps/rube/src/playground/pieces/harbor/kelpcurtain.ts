import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, mixHex, over, rail, trace, type Lane, type Pt } from '../../../parts'
import { bodyColor, piling, seabed, water } from '../../../pieces/harbor/sea'

/**
 * A kelp curtain. Two spars stand behind the pier with a line strung
 * between their heads, and the morning's kelp is hung over it to dry like
 * washing, ten long wet blades side by side with floats at their necks,
 * down to just short of the planks. The deck runs straight through under
 * them. The ball rolls in and noses into the curtain. Each blade it meets
 * is pushed forward and lifted, lies down the ball's front like a bib, is
 * dragged back over its crown as the ball goes under, rides down its back
 * on its tip, drops off and swings back past the plumb, forward again, and
 * dies away. So the curtain parts in a wave ahead of the ball and closes in
 * a wave behind it. Wet kelp is heavy. Every blade lying on the ball slows
 * it and hauls the line down over it, and in the thick of the curtain the
 * ball is down to a third of its pace, all but stalled. Then the blades let
 * go of it one by one, the line comes up, and it rolls out at the pace it
 * came in at.
 *
 * The ball has one place at every instant, `xAt`, and the lane is traced
 * from it. A blade's angle is worked out from that same place, so a blade
 * lies on the ball and is never drawn through it.
 */

/** The spars the line is strung between, the height it is made fast to them at, and how far it sags under the kelp. */
const POST_W = -0.4
const POST_E = 1.4
const LINE_Y = -0.425
const SAG = 0.035
/** How much further the line is hauled down over a ball with the whole curtain's weight on it. */
const HAUL = 0.03
/** The blades: how many, where the first hangs, and how far apart. */
const BLADES = 10
const FIRST = 0.08
const PITCH = 0.088
/** A blade swinging free: cartoon gravity on a wet strap, and how fast the swing dies. */
const G = 22
const DAMP = 2
/** A free blade is limp: its tip does what its root did this many seconds before. */
const LAG = 0.09
/** What the whole curtain's weight leaves the ball of its pace. */
const CRAWL = 1 / 3
/** How many pieces a blade is drawn in, root to tip, and the share of its length that is bare stipe. */
const M = 24
const NECK = 0.1

/** The same scatter every time: 0 to 1 from an index and a salt. */
const hash = (i: number, salt: number): number => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return v - Math.floor(v)
}
/** 0 to 1 over [a, b], eased at both ends. */
const smooth = (v: number, a: number, b: number): number => {
  const f = clamp((v - a) / (b - a))
  return f * f * (3 - 2 * f)
}
/** How much of a dip in the line reaches `x`: nothing at the spars, all of it midway. */
const slack = (x: number): number => (4 * (x - POST_W) * (POST_E - x)) / (POST_E - POST_W) ** 2
/** The line's height at `x` with nothing pulling on it. */
const restAt = (x: number): number => LINE_Y + SAG * slack(x)

interface Blade {
  /** Where on the line it hangs, and how long it is. */
  x: number
  len: number
  /** Half its width, and how near the ball's middle its own middle line can come: it lies half on the ball's rim, half off it. */
  hw: number
  r: number
  /** How far past it the ball is, about, when the blade can no longer reach it. */
  out: number
  /** Nearer than the ball or beyond it, and whether it has a float at its neck. */
  front: boolean
  float: boolean
  /** How fast it swings, and where along it the ruffle of its edges starts. */
  omega: number
  ruffle: number
  /** When the ball first touches it, when it falls clear of the ball, and the angle and the swing it has then. */
  tTouch: number
  tFree: number
  a0: number
  w0: number
}

/** Ten blades, no two alike: a wider one is a heavier one and swings slower. */
const blades: Blade[] = Array.from({ length: BLADES }, (_, i) => {
  const x = FIRST + i * PITCH + (hash(i, 0) - 0.5) * 0.018
  const len = 0.04 + 0.045 * hash(i, 1) - restAt(x)
  const hw = 0.03 + 0.008 * hash(i, 2)
  const r = R + hw * 0.5
  return {
    x,
    len,
    hw,
    r,
    out: Math.sqrt((len + r) ** 2 - restAt(x) ** 2),
    front: i % 2 === 1,
    float: i % 3 !== 1,
    omega: Math.sqrt((1.5 * G) / len) * (1.06 - 0.12 * hash(i, 2)),
    ruffle: hash(i, 3) * 6.28,
    tTouch: 0,
    tFree: 0,
    a0: 0,
    w0: 0,
  }
})

/** How much of blade `b`'s weight is on a ball at `x`: on as it is lifted, off as it slides down the ball's back. */
const weighAt = (b: Blade, x: number): number => b.len * b.hw * smooth(x - b.x, -b.r, 0.02) * (1 - smooth(x - b.x, 0.08, b.out))

/** The deck across the two cells in even steps, and at each the share of the curtain's weight that lies on a ball there. */
const STEPS = 800
const DX = 2 / STEPS
const LOADS: number[] = Array.from({ length: STEPS + 1 }, (_, j) => blades.reduce((sum, b) => sum + weighAt(b, -0.5 + j * DX), 0))
const HEAVIEST = Math.max(...LOADS)
/** The share of the curtain's weight on a ball at `x`, 0 to 1. */
function burdenAt(x: number): number {
  const f = clamp((x + 0.5) / DX, 0, STEPS)
  const j = Math.min(STEPS - 1, Math.floor(f))
  return (LOADS[j] + (LOADS[j + 1] - LOADS[j]) * (f - j)) / HEAVIEST
}
/** The ball's pace at `x`: the deck's, less what the kelp lying on it takes. */
const paceAt = (x: number): number => ROLL * (1 - (1 - CRAWL) * burdenAt(x))

/** The ball's clock: when it reaches each step of the deck at that pace. */
const CLOCK: number[] = [0]
for (let j = 0; j < STEPS; j++) CLOCK.push(CLOCK[j] + DX / paceAt(-0.5 + (j + 0.5) * DX))
const T_END = CLOCK[STEPS]
/** When the ball is at `x`. */
function tAt(x: number): number {
  const f = clamp((x + 0.5) / DX, 0, STEPS)
  const j = Math.min(STEPS - 1, Math.floor(f))
  return CLOCK[j] + (CLOCK[j + 1] - CLOCK[j]) * (f - j)
}
/** Where the ball is, `t` seconds into the piece: the one function the lane, the line and every blade are worked from. */
function xAt(t: number): number {
  if (t <= 0) return -0.5 + ROLL * t
  if (t >= T_END) return 1.5 + ROLL * (t - T_END)
  let lo = 0
  let hi = STEPS
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (CLOCK[mid] <= t) lo = mid
    else hi = mid
  }
  return -0.5 + (lo + (t - CLOCK[lo]) / (CLOCK[lo + 1] - CLOCK[lo])) * DX
}

/** The line's height at `x` with the ball at `cx`: hauled down by the kelp on the ball, most over the blades it is dragging, just behind it. */
const lineAt = (x: number, cx: number): number => restAt(x) + HAUL * burdenAt(cx) * slack(x) * Math.cos((Math.PI / 2) * clamp((x - cx + 0.12) / 0.6, -1, 1)) ** 2

/**
 * The angle a blade is held at by a ball at `cx`, from the plumb, forward
 * positive. While it is long enough it runs straight from the line to
 * where it is tangent to the ball; once the ball has gone on too far for
 * that, it is a straight strap with its tip resting on the ball's back.
 */
function heldAt(b: Blade, cx: number): number {
  const u = cx - b.x
  const h = -lineAt(b.x, cx)
  const d = Math.hypot(u, h)
  const lean = Math.atan2(u, h)
  if (d * d - b.r * b.r <= b.len * b.len) return lean + Math.asin(b.r / d)
  return lean + Math.acos(clamp((b.len * b.len + d * d - b.r * b.r) / (2 * b.len * d), -1, 1))
}

/**
 * When each blade leaves the ball. Riding down the ball's back on its tip
 * it is let down faster and faster, and the instant that is faster than it
 * would fall on its own it is a pendulum, let go at the angle and the swing
 * it has. So nothing jumps at the release, and a falling blade is always
 * above the ball that has just left it.
 */
for (const b of blades) {
  const dt = 0.002
  const held = (t: number) => heldAt(b, xAt(t))
  b.tTouch = tAt(b.x - b.r)
  let t = b.tTouch + 2 * dt
  for (; Math.hypot(xAt(t + 2 * dt) - b.x, lineAt(b.x, xAt(t + 2 * dt))) < b.len + b.r; t += dt) {
    const w = (held(t + dt) - held(t - dt)) / (2 * dt)
    const acc = (held(t + dt) - 2 * held(t) + held(t - dt)) / (dt * dt)
    if (w < 0 && acc < -b.omega * b.omega * held(t) - 2 * DAMP * w) break
  }
  b.tFree = t
  b.a0 = held(t)
  b.w0 = (held(t) - held(t - dt)) / dt
}

/** The angle of blade `b` at its root, `t` seconds into the piece: plumb, held by the ball, or swinging down to plumb again. */
function swingAt(b: Blade, t: number): number {
  if (t <= b.tTouch) return 0
  if (t < b.tFree) return heldAt(b, xAt(t))
  const s = t - b.tFree
  const wd = Math.sqrt(b.omega * b.omega - DAMP * DAMP)
  return Math.exp(-DAMP * s) * (b.a0 * Math.cos(wd * s) + ((b.w0 + DAMP * b.a0) / wd) * Math.sin(wd * s))
}

/**
 * A blade's middle line, root to tip, in even steps of its length. Held, it
 * runs straight to the ball, round the ball's front as far as the ball's
 * middle, and hangs plumb from there. Free, it is limp: each step down it
 * has the angle the root had a moment before.
 */
function spine(b: Blade, t: number): Pt[] {
  const cx = xAt(t)
  const top = lineAt(b.x, cx)
  const pts: Pt[] = [[b.x, top]]
  const ds = b.len / M
  if (t <= b.tTouch || t >= b.tFree) {
    const lag = LAG * over(t, b.tFree, b.tFree + 0.25)
    let [x, y] = pts[0]
    for (let j = 0; j < M; j++) {
      const a = swingAt(b, t - lag * ((j + 0.5) / M))
      x += Math.sin(a) * ds
      y += Math.cos(a) * ds
      pts.push([x, y])
    }
    return pts
  }
  const a = heldAt(b, cx)
  const d = Math.hypot(cx - b.x, top)
  const run = Math.min(b.len, Math.sqrt(Math.max(0, d * d - b.r * b.r)))
  for (let j = 1; j <= M; j++) {
    const s = j * ds
    const phi = (s - run) / b.r - a
    if (s <= run) pts.push([b.x + Math.sin(a) * s, top + Math.cos(a) * s])
    else if (phi <= 0) pts.push([cx + b.r * Math.cos(phi), b.r * Math.sin(phi)])
    else pts.push([cx + b.r, b.r * phi])
  }
  return pts
}

/** Half a blade's width, `f` of the way down it: a neck, a long leathery strap, a tapered tip, and a ruffle along each edge. */
function halfWidth(b: Blade, f: number, side: number): number {
  const strap = b.hw * (0.3 + 0.7 * smooth(f, NECK, NECK + 0.14)) * (1 - 0.3 * smooth(f, 0.45, 1))
  const tip = 1 - over(f, 0.8, 1) ** 2
  return strap * tip * (1 + 0.14 * Math.sin(f * 20 + b.ruffle + side * 1.9))
}

/** One blade: its stipe over the line and a finger down the far side, the strap, and the float at its neck if it has one. */
function blade(p: p5, k: number, ink: string, weight: number, fill: string, b: Blade, t: number): void {
  const pts = spine(b, t)
  const neck = Math.round(NECK * M)
  const near: Pt[] = []
  const far: Pt[] = []
  for (let j = neck; j <= M; j++) {
    const [ax, ay] = pts[j - 1]
    const [bx, by] = pts[Math.min(M, j + 1)]
    const l = Math.hypot(bx - ax, by - ay) || 1
    const nx = (by - ay) / l
    const ny = -(bx - ax) / l
    near.push([pts[j][0] - nx * halfWidth(b, j / M, -1), pts[j][1] - ny * halfWidth(b, j / M, -1)])
    far.unshift([pts[j][0] + nx * halfWidth(b, j / M, 1), pts[j][1] + ny * halfWidth(b, j / M, 1)])
  }
  const [x0, y0] = pts[0]
  outline(p, ink, weight * 0.8)
  p.line((x0 + 0.014) * k, (y0 + 0.035) * k, (x0 + 0.014) * k, (y0 - 0.006) * k)
  p.line((x0 + 0.014) * k, (y0 - 0.006) * k, x0 * k, (y0 - 0.006) * k)
  p.line(x0 * k, (y0 - 0.006) * k, pts[neck][0] * k, pts[neck][1] * k)
  solid(p, ink, weight * 0.6, fill)
  p.beginShape()
  for (const [x, y] of [...near, ...far]) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  if (!b.float) return
  // The float: a pear of a bladder where the stipe becomes the blade, lying along it.
  p.push()
  p.translate(pts[neck][0] * k, pts[neck][1] * k)
  p.rotate(Math.atan2(pts[neck + 1][1] - pts[neck][1], pts[neck + 1][0] - pts[neck][0]))
  p.ellipse(0, 0, 0.075 * k, 0.05 * k)
  p.pop()
}

/** The piece's moment is the ball at its slowest, deepest in with the most kelp on it. */
const DEEPEST = -0.5 + LOADS.indexOf(HEAVIEST) * DX
const LANE: Lane = { segs: trace((t) => [xAt(t), 0], 0, T_END, 64), fire: tAt(DEEPEST) }

export const kelpcurtain = definePiece<{ color: string }>({
  name: 'kelpcurtain',
  weight: 0.8,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const cx = xAt(t)
    // The spars are pilings that go on up behind the deck, so the ball goes by in front of them. Each is whipped under its head as it is under the planks, and the line comes off the whipping.
    for (const x of [POST_W, POST_E]) {
      piling(p, k, ink, weight, x)
      piling(p, k, ink, weight, x, LINE_Y - 0.06, FLOOR)
    }
    piling(p, k, ink, weight, 0.5)
    water(p, k, ink, weight, -0.5, 1.5)
    seabed(p, k, ink, weight, -0.5, 1.5)
    // The blades that hang beyond the ball, let down toward the paper; then the line they all hang on.
    const beyond = mixHex(s.color, bg, 0.45)
    for (const b of blades) if (!b.front) blade(p, k, ink, weight, beyond, b, t)
    outline(p, ink, weight * 0.9)
    p.beginShape()
    for (let i = 0; i <= 36; i++) {
      const x = POST_W + ((POST_E - POST_W) * i) / 36
      p.vertex(x * k, lineAt(x, cx) * k)
    }
    p.endShape()
    rail(p, k, ink, weight, -0.5, 1.5)
  },
  over: (p, s, { k, t, ink, weight }) => {
    for (const b of blades) if (b.front) blade(p, k, ink, weight, s.color, b, t)
  },
})
