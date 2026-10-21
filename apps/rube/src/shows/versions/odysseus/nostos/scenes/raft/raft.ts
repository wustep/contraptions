import { circle, clamp01, fill, mix, rgba, ring, smooth, stroke, type Paint } from '../../draw'
import { M } from '../../music'
import type { Pt } from '../../path'
import { glide } from '../../voyage'
import { surface } from '../../world/sea'
import { ground, lightAt } from '../ogygia/island'
import { frontLift } from '../storm/weather'

/**
 * The raft: three logs of driftwood off Ogygia's beach, seen end on, a hand's breadth more than a ball across, lashed
 * with a rope; it carries him through the storm to Ithaca and lies there on the sand after.
 *
 * It is built as a machine. The thunder wakes him; he rolls down the beach into the first log (389.39), which knocks the
 * second (389.57); the two roll on down the slope together into the third, which lies against a driftwood stake at the
 * water's edge (392.20), and the three settle against it (392.39). The rope coiled at the stake's foot winds twice round
 * them; he hops up onto the middle log; the swell lifts the stake and lays it down (395.25), and on the music's return
 * the raft slides into the sea (M.return).
 */

export const LOG_R = 0.17
/** Where the logs lie on the beach before he comes. */
const LOG0 = [671.25, 671.79, 675.64]
const STAKE_X = 675.85
export const HIT = 389.39
export const KNOCK = 389.57
export const STOP = 392.2
export const SETTLE = 392.39
export const WRAP0 = 392.5
export const WRAP1 = 393.95
export const STAKE_FALL = 395.25
export const LAUNCH = M.return
/** Where it grounds on Ithaca's beach, and when. */
export const AGROUND = 415.4

/** A log's centre on the sand at `x`. */
const onBeach = (x: number): Pt => [x, ground(x) - LOG_R]

/** Hermite between two [t, x, v] states. */
function seg(t: number, a: [number, number, number], b: [number, number, number]): number {
  const [t0, x0, v0] = a
  const [t1, x1, v1] = b
  const h = t1 - t0
  const u = clamp01((t - t0) / h)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * h * v0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * h * v1
}

/** The bundle's final places, against the stake. */
const FINAL = [LOG0[2] - 2 * LOG_R * 2, LOG0[2] - 2 * LOG_R, LOG0[2]]

/**
 * A log's x on the beach while they gather. The first, struck, rolls into the second; the two roll on together, gaining
 * a little down the slope, into the third; the three give a little against the stake and settle.
 */
function logX(i: number, t: number): number {
  const second0 = LOG0[1]
  // The pair: the second log from its place to its place in the bundle, between the knock and the stop.
  const pair = (s: number) => seg(s, [KNOCK, second0, 0.8], [STOP, FINAL[1], 1.8])
  const give = -0.025 * ring(t, STOP, 2.6, 0.18)
  if (i === 0) {
    if (t <= HIT) return LOG0[0]
    if (t <= KNOCK) return seg(t, [HIT, LOG0[0], 1.3], [KNOCK, second0 - 2 * LOG_R, 0.95])
    if (t <= STOP) return pair(t) - 2 * LOG_R
    return FINAL[0] + give
  }
  if (i === 1) {
    if (t <= KNOCK) return second0
    if (t <= STOP) return pair(t)
    return FINAL[1] + give
  }
  return LOG0[2] + give * 0.4
}

/** The raft's x after it is launched: down the beach, out through the storm, and aground on Ithaca. */
const sail = glide([
  [LAUNCH, FINAL[1], 0],
  [397.0, 677.83, 3.4],
  [400.0, 693.13, 6.8],
  [406.0, 737.53, 8.0],
  [411.0, 777.28, 7.9],
  [414.2, 794.82, 3.0],
  [AGROUND, 797.3, 0],
])

export interface RaftPose {
  x: number
  y: number
  /** Turned, radians, clockwise. */
  a: number
}

/** The bundle on the beach: its middle log, and the line from the first to the third. */
function beached(t: number): RaftPose {
  const [x1, y1] = onBeach(logX(0, t))
  const [x3, y3] = onBeach(logX(2, t))
  const [x2, y2] = onBeach(logX(1, t))
  return { x: x2, y: y2, a: Math.atan2(y3 - y1, x3 - x1) }
}

/** Where the raft is at `t` (from the stop on), its middle log's centre and its turn. */
export function raftAt(t: number): RaftPose {
  if (t < LAUNCH) return beached(Math.max(t, STOP))
  const x = sail(Math.min(t, AGROUND))
  const shore = beached(STOP)
  const onSand: RaftPose = { x, y: ground(x) - LOG_R, a: shore.a }
  // On the sea, and on the great seas where they stand (`frontLift`), as the spar rode them.
  const Y = (u: number) => surface(u, t) - frontLift(u, t)
  const sea: RaftPose = { x, y: Y(x) + 0.035, a: Math.atan2(Y(x + 0.5) - Y(x - 0.5), 1.0) * 0.85 }
  const w = smooth(x, 676.0, 678.2)
  let pose: RaftPose = { x, y: onSand.y + (sea.y - onSand.y) * w, a: onSand.a + (sea.a - onSand.a) * w }
  // Aground on Ithaca: it settles on the bottom where the beach comes up, its bow a little raised, and stays: wholly at
  // rest by the time he rolls off it, whatever the sea is doing.
  const gr = smooth(t, AGROUND - 0.75, AGROUND + 0.1)
  if (gr > 0) {
    const rest: RaftPose = { x: 797.3, y: 0.02, a: -0.05 }
    pose = { x: pose.x + (rest.x - pose.x) * gr, y: pose.y + (rest.y - pose.y) * gr, a: pose.a + (rest.a - pose.a) * gr }
  }
  return pose
}

/** A point of the raft's own frame (cells from the middle log's centre) in the world. */
export function onRaft(t: number, local: Pt): Pt {
  const p = raftAt(t)
  const c = Math.cos(p.a)
  const s = Math.sin(p.a)
  return [p.x + local[0] * c - local[1] * s, p.y + local[0] * s + local[1] * c]
}

/** Where he sits: on top of the middle log. */
export const SEAT: Pt = [0, -(LOG_R + 0.13)]

/** Each log's centre and turn at `t`. */
function logs(t: number): { c: Pt; turn: number }[] {
  if (t < STOP) {
    return [0, 1, 2].map((i) => {
      const x = logX(i, t)
      return { c: onBeach(x), turn: (x - LOG0[i]) / LOG_R }
    })
  }
  const p = raftAt(t)
  const at0 = raftAt(STOP)
  return [-1, 0, 1].map((k, i) => ({
    c: onRaft(t, [k * 2 * LOG_R, 0]),
    turn: (FINAL[i] - LOG0[i]) / LOG_R + (p.a - at0.a),
  }))
}

/* ------------------------------------------------------------------ drawing */

/**
 * A log end on: grey bark round a pale cut face, a growth ring half seen, and two checks split in from the bark, which
 * turn as it rolls. No mark at its heart: it is wood, not a face.
 */
function drawLog(g: Paint, c: Pt, turn: number, l: number, wet: number): void {
  const { ctx } = g
  const bark = mix(mix('#6F665A', '#26313B', 1 - l), '#33332F', wet * 0.4)
  const face = mix(mix('#D6C9AC', '#62738A', 1 - l), '#8C8676', wet * 0.35)
  const ink = mix('#3B342A', '#0B141B', 1 - l)
  circle(ctx, c[0], c[1], LOG_R)
  fill(ctx, bark)
  stroke(g, ink, 2.2)
  circle(ctx, c[0], c[1], LOG_R * 0.78)
  fill(ctx, face)
  ctx.beginPath()
  ctx.arc(c[0], c[1], LOG_R * 0.48, turn + 0.6, turn + 3.4)
  stroke(g, rgba(ink, 0.3), 1.4)
  for (const [da, len] of [[0, 0.5], [2.4, 0.32]] as [number, number][]) {
    const a = turn + da
    ctx.beginPath()
    ctx.moveTo(c[0] + Math.cos(a) * LOG_R * 0.78, c[1] + Math.sin(a) * LOG_R * 0.78)
    ctx.lineTo(c[0] + Math.cos(a) * LOG_R * (0.78 - len), c[1] + Math.sin(a) * LOG_R * (0.78 - len))
    stroke(g, rgba(ink, 0.6), 1.6)
  }
}

/** The lashing round the three: a loop hugging them, laid on as it is wound, twice. */
function drawWraps(g: Paint, t: number, l: number): void {
  const { ctx } = g
  const rope = mix('#A8946A', '#4A5560', 1 - l)
  const ink = mix('#3B342A', '#0B141B', 1 - l)
  for (let w = 0; w < 2; w++) {
    const f = smooth(t, WRAP0 + w * 0.72, WRAP0 + (w + 1) * 0.72)
    if (f <= 0) continue
    const r = LOG_R + 0.012 + w * 0.014
    const off = (w === 0 ? -0.07 : 0.07)
    // Around the bundle, in its own frame: along the top, round the third, back along the bottom, round the first.
    const loop: Pt[] = []
    const n = 40
    const half = 2 * LOG_R
    for (let i = 0; i <= n; i++) {
      const s = i / n
      let p: Pt
      if (s < 0.3) p = [-half + (2 * half * s) / 0.3, -r]
      else if (s < 0.5) {
        const a = -Math.PI / 2 + (Math.PI * (s - 0.3)) / 0.2
        p = [half + Math.cos(a) * r, Math.sin(a) * r]
      } else if (s < 0.8) p = [half - (2 * half * (s - 0.5)) / 0.3, r]
      else {
        const a = Math.PI / 2 + (Math.PI * (s - 0.8)) / 0.2
        p = [-half + Math.cos(a) * r, Math.sin(a) * r]
      }
      loop.push(onRaft(t, [p[0] + off * (Math.abs(p[1]) < r * 0.9 ? 0 : 1) * 0.1, p[1]]))
    }
    const m = Math.max(1, Math.round(n * f))
    ctx.beginPath()
    ctx.moveTo(loop[0][0], loop[0][1])
    for (let i = 1; i <= m; i++) ctx.lineTo(loop[i][0], loop[i][1])
    ctx.lineCap = 'round'
    stroke(g, ink, 3.6)
    stroke(g, rope, 2.2)
  }
}

/** The stake at the water's edge, and the rope coiled at its foot, uncoiling as the lashing is wound. */
function drawStake(g: Paint, t: number, l: number): void {
  const { ctx } = g
  const ink = mix('#3B342A', '#0B141B', 1 - l)
  const wood = mix('#8A7E6C', '#2C3844', 1 - l)
  const rope = mix('#A8946A', '#4A5560', 1 - l)
  const foot: Pt = [STAKE_X + 0.04, ground(STAKE_X + 0.04) + 0.06]
  // It leans a little; it shivers when the bundle comes against it; the swell lifts it and lays it down seaward.
  const fall = Math.pow(smooth(t, STAKE_FALL, STAKE_FALL + 0.55), 1.6)
  const a = 0.08 + 0.03 * ring(t, STOP, 3.2, 0.2) + fall * 1.32
  const len = 0.62
  const top: Pt = [foot[0] + Math.sin(a) * len, foot[1] - Math.cos(a) * len]
  ctx.beginPath()
  ctx.moveTo(foot[0], foot[1])
  ctx.lineTo(top[0], top[1])
  ctx.lineCap = 'round'
  stroke(g, ink, 7)
  stroke(g, wood, 4.6)
  // The coil, smaller as the rope goes round the logs, and gone once it is all wound.
  const left = 1 - smooth(t, WRAP0, WRAP1)
  if (left > 0.02 && fall < 0.5) {
    ctx.beginPath()
    ctx.ellipse(foot[0] + 0.02, foot[1] - 0.05, 0.13 * (0.4 + 0.6 * left), 0.045 * (0.4 + 0.6 * left), 0, 0, Math.PI * 2)
    stroke(g, ink, 3.4)
    stroke(g, rope, 2)
  }
}

/** The logs, the lashing and the stake: from driftwood on Ogygia's beach to the raft aground on Ithaca's. */
export function drawRaft(g: Paint): void {
  const { t, view } = g
  if (t < STOP) {
    if (view.x1 < 669 || view.x0 > 678) return
  } else {
    const p = raftAt(t)
    if (p.x < view.x0 - 2 || p.x > view.x1 + 2) {
      if (view.x1 >= 674.5 && view.x0 <= 678) drawStake(g, t, lightAt(t))
      return
    }
  }
  const l = Math.max(0.12, lightAt(t))
  if (view.x1 >= 674.5 && view.x0 <= 678) drawStake(g, t, l)
  const wet = smooth(t, LAUNCH + 0.8, LAUNCH + 2.5)
  for (const { c, turn } of logs(t)) drawLog(g, c, turn, l, wet)
  if (t >= WRAP0) drawWraps(g, t, l)
}
