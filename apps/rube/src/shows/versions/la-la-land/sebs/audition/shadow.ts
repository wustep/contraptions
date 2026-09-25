import type p5 from 'p5'
import { FLOOR, R, type Pt } from '../../../../../parts'
import { box, frame, knock, part, rgba, ring, route, smooth, type Companion, type PartShot, type Way } from '../kit'
import { hop } from '../physics'
import { SHADOW_MAT } from '../worlds'

/**
 * The audition, in shadow play (172 → 196, `SHADOW`).
 *
 * A screen lit from behind, in the dark. Everything on it is a black shape: a
 * low stage, a casting table with its desk lamp, papers, a pen in its stand and
 * a glass jug, and at the side a bentwood chair with a metronome on a stool
 * beside it. Only the two of them keep their colour.
 *
 * He is in the chair when the screen comes up; she is on her mark, and the
 * stage's spot opens on her on the first accent (175.880). She presents
 * herself, and then the music stops dead (177.5 → 179.8): she hesitates, and
 * steps back. He reaches up from the chair and taps the metronome's rod out of
 * its rest (179.792), sits back down (180.140), and the rod hits its far stop
 * on 180.454: she begins. The metronome keeps her time from there, a steady
 * tick under the rubato, every stop on a measured onset, and it is the
 * machine's pulse: the table answers her in steps on the off-beat accents. The
 * desk lamp lifts its head from the papers (181.940), turns toward the stage
 * (184.250), finds her (186.050), and on 187.582 its light snaps onto her and
 * follows her. The pen gets up out of its stand and signs, three touches of the
 * nib (188.558, 189.045, 189.591), and drops back into the stand (190.160).
 * The metronome comes back to its rest on 190.322 as he leaps from the chair,
 * over it, onto the stage beside her (191.170). The build: the screen floods
 * with light until the shapes are nearly gone and only the two of them are
 * left in it, and they bow together (193.132). The lights go 195.1 → 195.85.
 *
 * Frame: the floor the silhouettes stand on is y = FLOOR (a ball on it is at
 * y = 0). He comes in at (-0.5, 0) in the dark.
 */

const INK = SHADOW_MAT.shadow

/* ------------------------------------------------------------------ the clock (show seconds, each on a measured onset) */

/** The spot opens on her. */
const SPOT = 175.88
/** She presents herself: up on the one, down on the other. */
const PRESENT: [number, number] = [176.448, 177.017]
/** He taps the rod out of its rest, and lands back on the seat. */
const TAP = 179.792
const SIT = 180.14
/** The metronome's stops, alternately right and left, from its first (she begins) to the rest it comes back to. */
const TICKS = [180.454, 181.081, 181.685, 182.207, 182.787, 183.414, 183.983, 184.599, 185.191, 185.794, 186.352, 186.979, 187.582, 188.163, 188.813, 189.359, 189.87, 190.322]
/** The lamp's steps: up from the papers, round to the stage, onto her, and its light snaps on her. */
const LAMP = [181.94, 184.25, 186.05, 187.582]
/** The pen: three touches of the nib, and back into its stand. */
const PEN = [188.558, 189.045, 189.591, 190.16]
/** He leaps from the chair (as the metronome comes to rest), lands on the stage beside her, and they touch. */
const LEAP = 190.322
const LAND = 191.17
const TOUCH = 191.437
/** They bow together. */
const BOW = 193.132
/** The flood: from the build's first strong onset to its crest. */
const FLOOD: [number, number] = [190.659, 194.9]
/** The lights go (the cover, 195.1 → 195.85); Mia is ours until the cover is full. */
const MIA_FROM = 174.5
const MIA_TO = 195.85

export const SHADOW_HITS = [...new Set([SPOT, TAP, SIT, ...TICKS, ...LAMP, ...PEN, LAND, BOW])].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the set (the part's own cells) */

/** The lit screen. */
const SX0 = -1.7
const SX1 = 10.9
const SY0 = -5.1
const SY1 = 1.15
/** The bentwood chair, facing the stage: its seat's top, its front edge, and where he sits on it. */
const SEAT_Y = -0.37
const SEAT_X: [number, number] = [0.5, 1.16]
const SEAT: Pt = [0.83, SEAT_Y - R]
/** The stool beside it, and the metronome on it: the rod's pivot, its length, and how far it swings to a stop. */
const STOOL_Y = -0.2
const MET_X = 1.52
const PIV: Pt = [MET_X, -0.3]
const ROD = 0.64
const SWING = 0.5
/** The stage: a low riser, and her mark on it. */
const RISER_Y = -0.2
const RISER: [number, number] = [2.45, 5.95]
const ON_RISER = RISER_Y - R
const MARK: Pt = [4.2, ON_RISER]
/** Where he comes down on it, and where he stands beside her. */
const LANDED: Pt = [3.7, ON_RISER]
const BESIDE: Pt = [3.92, ON_RISER]
/** The casting table: its top, its ends. */
const TT = -0.6
const TABLE: [number, number] = [6.8, 9.65]
/** The lamp's base pivot, and its two arms. */
const LAMP_BASE: Pt = [7.15, TT - 0.07]
const ARM1 = 0.6
const ARM2 = 0.52
/** The papers, and the pen's stand. */
const PAPER: [number, number] = [7.8, 8.46]
const PAPER_Y = TT - 0.035
const STAND: Pt = [8.82, TT]
/** The stage's pelmet (its scalloped edge) and where its curtains are tied back. */
const PEL_Y = -2.45
const TIE_Y = -1.0
/** Where the flood opens from: behind the two of them. */
const BLOOM: Pt = [4.05, -0.7]

/** Where the rod's tip is at its rest (the left stop), and where he touches it from. */
const TIP_REST: Pt = [PIV[0] - ROD * Math.sin(SWING), PIV[1] - ROD * Math.cos(SWING)]
const TAP_AT: Pt = [TIP_REST[0] - 0.12, TIP_REST[1] + 0.06]

/* ------------------------------------------------------------------ paths */

/**
 * A path through timed keys `[t, x, y]`: each coordinate a monotone cubic, so a move that keeps going carries its
 * speed through a key, and a hold or a turn comes to rest on it.
 */
export function keyed(keys: [number, number, number][]): (t: number) => Pt {
  const ts = keys.map((k) => k[0])
  const n = keys.length
  const channel = (j: 1 | 2) => {
    const v = keys.map((k) => k[j])
    const d = (i: number) => (v[i + 1] - v[i]) / Math.max(1e-6, ts[i + 1] - ts[i])
    const m: number[] = new Array(n).fill(0)
    for (let i = 1; i < n - 1; i++) {
      const a = d(i - 1)
      const b = d(i)
      if (a * b <= 0) continue
      const h0 = ts[i] - ts[i - 1]
      const h1 = ts[i + 1] - ts[i]
      const w1 = 2 * h1 + h0
      const w2 = h1 + 2 * h0
      m[i] = (w1 + w2) / (w1 / a + w2 / b)
    }
    return (i: number, u: number) => {
      const H = ts[i + 1] - ts[i]
      const u2 = u * u
      const u3 = u2 * u
      return (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * H * m[i] + (-2 * u3 + 3 * u2) * v[i + 1] + (u3 - u2) * H * m[i + 1]
    }
  }
  const X = channel(1)
  const Y = channel(2)
  return (t) => {
    if (t <= ts[0]) return [keys[0][1], keys[0][2]]
    if (t >= ts[n - 1]) return [keys[n - 1][1], keys[n - 1][2]]
    let i = 0
    while (i + 2 < n && ts[i + 1] <= t) i++
    const u = (t - ts[i]) / (ts[i + 1] - ts[i])
    return [X(i, u), Y(i, u)]
  }
}

/**
 * Mia: on her mark, then as she sings. She rises a little with the high notes of the phrase and settles on the low
 * ones, drifts across her mark, steps into the lamp's light when it finds her, and goes to him when he lands.
 */
const miaPath = keyed(
  (
    [
      [MIA_FROM, 0, 0],
      [PRESENT[0] - 0.25, 0, 0],
      [PRESENT[0], 0.03, 0.1],
      [PRESENT[1], 0, 0],
      // The silence: a hesitation, a step back from the table.
      [178.1, 0, 0],
      [178.8, -0.15, 0],
      [SIT, -0.15, 0],
      // She begins on the metronome's first stop.
      [TICKS[0], -0.02, 0.13],
      [181.081, 0.04, 0.08],
      [181.94, 0.14, 0.3],
      [182.474, 0.1, 0.12],
      [183.414, -0.04, 0.27],
      [184.25, -0.12, 0.13],
      [185.191, -0.06, 0.03],
      [185.794, 0.04, 0.24],
      [186.352, 0.1, 0.33],
      [186.979, 0.16, 0.17],
      // Into the lamp's light, toward the table.
      [LAMP[3], 0.44, 0],
      [188.558, 0.46, 0.34],
      [189.359, 0.44, 0.12],
      [PEN[3], 0.42, 0],
      [LAND - 0.25, 0.4, 0],
      [TOUCH, BESIDE[0] + 2 * R - MARK[0], 0],
      [BOW - 0.24, BESIDE[0] + 2 * R - MARK[0], 0.09],
      [BOW, BESIDE[0] + 2 * R - MARK[0], 0],
      [MIA_TO, BESIDE[0] + 2 * R - MARK[0], 0],
    ] as [number, number, number][]
  ).map(([t, dx, lift]) => [t, MARK[0] + dx, MARK[1] - lift]),
)

/** The metronome's rod, radians from upright (right is positive): at rest on its left stop until tapped, then stop to stop. */
function rodAngle(t: number): number {
  if (t < TAP) return -SWING
  const last = TICKS.length - 1
  if (t >= TICKS[last]) return -SWING
  // From the tap to the first stop; then stop to stop. Each swing leaves a stop quick and slows over the top a little,
  // so a stop is a knock and not a turn.
  const i = t < TICKS[0] ? -1 : TICKS.findIndex((x, j) => j === last || (t >= x && t < TICKS[j + 1]))
  const a = i < 0 ? TAP : TICKS[i]
  const b = i < 0 ? TICKS[0] : TICKS[i + 1]
  const from = i < 0 ? -SWING : i % 2 === 0 ? SWING : -SWING
  const u = (t - a) / (b - a)
  // The tap starts it from rest: it gathers speed. After that, the swing is quick off the stop and quick into the next.
  const f = i < 0 ? u * u * (2 - u) * 0.55 + u * 0.45 : u + (0.42 / (2 * Math.PI)) * Math.sin(2 * Math.PI * u)
  return from + (-2 * from) * f
}

/** The lamp: its lower arm and upper arm angles (radians from upright, right positive) and what its head looks at. */
interface Pose {
  a1: number
  a2: number
  at: Pt
}
const POSES: Pose[] = [
  // Reading: bent over the papers.
  { a1: 0.5, a2: 1.75, at: [8.12, TT] },
  // It looks up.
  { a1: 0.18, a2: 0.95, at: [6.2, -0.1] },
  // Round toward the stage.
  { a1: -0.1, a2: -0.35, at: [5.3, -0.1] },
  // It finds her.
  { a1: -0.28, a2: -0.95, at: [4.75, -0.55] },
  // And holds her in its light (the look is her, from here).
  { a1: -0.34, a2: -1.22, at: [4.64, ON_RISER - 0.1] },
]
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

function lampPose(t: number): Pose {
  let pose = POSES[0]
  for (let i = 0; i < LAMP.length; i++) {
    const end = LAMP[i]
    const dur = i === 3 ? 0.42 : 0.62
    const a = POSES[i]
    const b = POSES[i + 1]
    if (t < end - dur) break
    const u = easeInOut(Math.min(1, (t - (end - dur)) / dur))
    // A move arrives on its onset and settles past it, heavy: a small overshoot that rings out.
    const over = t > end ? ring(t - end, 1.7, 0.22) * 0.07 : 0
    pose = {
      a1: lerp(a.a1, b.a1, u) + (b.a1 - a.a1) * over,
      a2: lerp(a.a2, b.a2, u) + (b.a2 - a.a2) * over,
      at: [lerp(a.at[0], b.at[0], u), lerp(a.at[1], b.at[1], u)],
    }
  }
  if (t >= LAMP[3]) {
    const [mx, my] = miaPath(t)
    const u = smooth(t, LAMP[3], LAMP[3] + 0.3)
    pose = { ...pose, at: [lerp(pose.at[0], mx, u), lerp(pose.at[1], my - 0.08, u)] }
  }
  return pose
}

/** The lamp's joints: the elbow, the head's hinge, and the unit vector the head looks along. */
function lampJoints(pose: Pose): { j1: Pt; j2: Pt; d: Pt } {
  const [x0, y0] = LAMP_BASE
  const j1: Pt = [x0 + ARM1 * Math.sin(pose.a1), y0 - ARM1 * Math.cos(pose.a1)]
  const j2: Pt = [j1[0] + ARM2 * Math.sin(pose.a2), j1[1] - ARM2 * Math.cos(pose.a2)]
  const dx = pose.at[0] - j2[0]
  const dy = pose.at[1] - j2[1]
  const L = Math.hypot(dx, dy) || 1
  return { j1, j2, d: [dx / L, dy / L] }
}

/** The pen: its nib and its lean from upright (the top to the right, positive). In its stand, up, three touches, back. */
const penPath = keyed([
  [187.84, STAND[0], TT - 0.07],
  [PEN[0] - 0.4, STAND[0] - 0.25, TT - 0.42],
  [PEN[0], 7.98, PAPER_Y],
  [PEN[0] + 0.2, 8.08, PAPER_Y - 0.12],
  [PEN[1], 8.16, PAPER_Y],
  // A flourish: up, over and back down.
  [PEN[1] + 0.17, 8.34, PAPER_Y - 0.26],
  [PEN[1] + 0.34, 8.44, PAPER_Y - 0.12],
  [PEN[2], 8.32, PAPER_Y],
  [PEN[2] + 0.3, 8.62, PAPER_Y - 0.42],
  [PEN[3], STAND[0], TT - 0.07],
])
const penLean = (t: number): number => {
  if (t < 187.84 || t > PEN[3]) return 0.42
  return 0.42 + 0.18 * smooth(t, 187.84, PEN[0] - 0.4) - 0.18 * smooth(t, PEN[2] + 0.05, PEN[3])
}

/* ------------------------------------------------------------------ light */

/** A pool of light with a flat middle and a soft edge: a spot's circle on the screen. */
function pool(p: p5, k: number, x: number, y: number, r: number, color: string, a: number, ry = 1, flat = 0.62): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(flat, rgba(color, a * 0.9))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A soft cone of light on the screen from a lamp's mouth to what it looks at. */
function cone(p: p5, k: number, from: Pt, to: Pt, w0: number, w1: number, color: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  ctx.save()
  const g = ctx.createLinearGradient(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(1, rgba(color, a * 0.45))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((from[0] + (nx * w0) / 2) * k, (from[1] + (ny * w0) / 2) * k)
  ctx.lineTo((to[0] + (nx * w1) / 2) * k, (to[1] + (ny * w1) / 2) * k)
  ctx.lineTo((to[0] - (nx * w1) / 2) * k, (to[1] - (ny * w1) / 2) * k)
  ctx.lineTo((from[0] - (nx * w0) / 2) * k, (from[1] - (ny * w0) / 2) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** How far the flood is in, 0..1. */
const flood = (t: number): number => {
  const u = smooth(t, FLOOD[0], FLOOD[1])
  return u * u * (1.6 - 0.6 * u)
}

/* ------------------------------------------------------------------ the silhouettes */

function fillInk(p: p5): void {
  p.noStroke()
  p.fill(INK)
}
function rod(p: p5, k: number, w: number): void {
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(Math.max(1, w * k))
}

/** The bentwood chair, facing the stage. */
function chair(p: p5, k: number): void {
  const X = (v: number) => v * k
  const [s0, s1] = SEAT_X
  rod(p, k, 0.05)
  // Legs, splayed a little; a bentwood ring between them.
  p.line(X(s1 - 0.05), X(SEAT_Y + 0.05), X(s1 + 0.03), X(FLOOR))
  p.line(X(s0 + 0.07), X(SEAT_Y + 0.05), X(s0 - 0.02), X(FLOOR))
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.line(X(s0 + 0.03), X(-0.07), X(s1 - 0.01), X(-0.07))
  // The back: one bent post up from the seat's rear, leaning back, a rail across it near the top.
  p.strokeWeight(Math.max(1, 0.06 * k))
  p.bezier(X(s0 + 0.04), X(SEAT_Y), X(s0 + 0.02), X(-0.75), X(s0 - 0.06), X(-1.0), X(s0 - 0.1), X(-1.22))
  fillInk(p)
  p.push()
  p.translate(X(s0 - 0.085), X(-1.12))
  p.rotate(0.12)
  p.rect(0, 0, X(0.075), X(0.26), X(0.035))
  p.pop()
  p.circle(X(s0 - 0.1), X(-1.24), X(0.08))
  // The seat.
  p.rect(X((s0 + s1) / 2), X(SEAT_Y + 0.035), X(s1 - s0), X(0.07), X(0.035))
}

/** The stool, and the metronome on it, its rod at `angle`. */
function metronome(p: p5, k: number, angle: number): void {
  const X = (v: number) => v * k
  // The stool: a round top and three legs.
  rod(p, k, 0.04)
  p.line(X(MET_X - 0.16), X(STOOL_Y + 0.03), X(MET_X - 0.24), X(FLOOR))
  p.line(X(MET_X + 0.16), X(STOOL_Y + 0.03), X(MET_X + 0.24), X(FLOOR))
  p.line(X(MET_X), X(STOOL_Y + 0.03), X(MET_X), X(FLOOR))
  p.strokeWeight(Math.max(1, 0.025 * k))
  p.line(X(MET_X - 0.2), X(-0.02), X(MET_X + 0.2), X(-0.02))
  fillInk(p)
  p.rect(X(MET_X), X(STOOL_Y + 0.02), X(0.5), X(0.05), X(0.02))
  // The rod and its weight, behind the case's face.
  const sx = Math.sin(angle)
  const cy = Math.cos(angle)
  rod(p, k, 0.028)
  p.line(X(PIV[0]), X(PIV[1]), X(PIV[0] + ROD * sx), X(PIV[1] - ROD * cy))
  fillInk(p)
  p.push()
  p.translate(X(PIV[0] + 0.4 * ROD * sx), X(PIV[1] - 0.4 * ROD * cy))
  p.rotate(angle)
  p.quad(X(-0.06), X(0.045), X(0.06), X(0.045), X(0.04), X(-0.045), X(-0.04), X(-0.045))
  p.pop()
  // The case: a pyramid with a small cap, the rod's slot the only way out.
  p.quad(X(MET_X - 0.2), X(STOOL_Y), X(MET_X + 0.2), X(STOOL_Y), X(MET_X + 0.075), X(-0.7), X(MET_X - 0.075), X(-0.7))
  p.rect(X(MET_X), X(-0.715), X(0.11), X(0.035), X(0.01))
  p.rect(X(MET_X), X(STOOL_Y - 0.02), X(0.44), X(0.04), X(0.01))
}

/** The stage: a low riser with two steps up at its near end. */
function riser(p: p5, k: number): void {
  const X = (v: number) => v * k
  fillInk(p)
  const [r0, r1] = RISER
  p.rect(X((r0 + r1) / 2), X((RISER_Y + FLOOR) / 2), X(r1 - r0), X(FLOOR - RISER_Y))
  const h = (FLOOR - RISER_Y) / 2
  p.rect(X(r0 - 0.11), X(FLOOR - h / 2), X(0.22), X(h))
  // A lip along its front edge.
  p.rect(X((r0 + r1) / 2), X(RISER_Y + 0.02), X(r1 - r0 + 0.08), X(0.04), X(0.02))
  // Its proscenium: a curtain tied back at each side, and a scalloped pelmet across the top.
  for (const side of [-1, 1]) {
    const e = side < 0 ? r0 + 0.02 : r1 - 0.02
    const x = (d: number) => X(e - side * d)
    p.beginShape()
    p.vertex(x(0), X(PEL_Y))
    p.vertex(x(0.62), X(PEL_Y))
    p.bezierVertex(x(0.58), X(PEL_Y + 0.62), x(0.2), X(TIE_Y - 0.42), x(0.15), X(TIE_Y))
    p.bezierVertex(x(0.13), X(TIE_Y + 0.3), x(0.36), X(RISER_Y - 0.32), x(0.42), X(RISER_Y))
    p.vertex(x(0), X(RISER_Y))
    p.endShape(p.CLOSE)
    p.ellipse(x(0.16), X(TIE_Y), X(0.13), X(0.09))
  }
  const n = 6
  const w = (r1 - r0 + 0.16) / n
  p.beginShape()
  p.vertex(X(r0 - 0.08), X(PEL_Y - 0.34))
  p.vertex(X(r1 + 0.08), X(PEL_Y - 0.34))
  p.vertex(X(r1 + 0.08), X(PEL_Y))
  for (let i = n - 1; i >= 0; i--) {
    const x0 = r0 - 0.08 + i * w
    p.quadraticVertex(X(x0 + w / 2), X(PEL_Y + 0.2), X(x0), X(PEL_Y))
  }
  p.endShape(p.CLOSE)
  p.rect(X((r0 + r1) / 2), X(PEL_Y - 0.37), X(r1 - r0 + 0.3), X(0.05), X(0.02))
}

/** The casting table. */
function table(p: p5, k: number): void {
  const X = (v: number) => v * k
  const [t0, t1] = TABLE
  fillInk(p)
  p.rect(X((t0 + t1) / 2), X(TT + 0.035), X(t1 - t0), X(0.07), X(0.02))
  p.rect(X((t0 + t1) / 2), X(TT + 0.13), X(t1 - t0 - 0.3), X(0.13))
  for (const x of [t0 + 0.17, t1 - 0.17]) p.quad(X(x - 0.04), X(TT + 0.1), X(x + 0.04), X(TT + 0.1), X(x + 0.025), X(FLOOR), X(x - 0.025), X(FLOOR))
  // The papers, a thin stack.
  p.rect(X((PAPER[0] + PAPER[1]) / 2), X(TT - 0.018), X(PAPER[1] - PAPER[0]), X(0.035))
  // The pen's stand: a block, and the socket leaning out of it.
  p.rect(X(STAND[0]), X(TT - 0.035), X(0.3), X(0.07), X(0.02))
  p.push()
  p.translate(X(STAND[0]), X(TT - 0.07))
  p.rotate(0.42)
  p.rect(0, X(-0.05), X(0.07), X(0.12), X(0.02))
  p.pop()
}

/** The desk lamp: a weighted base, two arms each a pair of bars, and a cone of a shade. */
function lamp(p: p5, k: number, pose: Pose): void {
  const X = (v: number) => v * k
  const { j1, j2, d } = lampJoints(pose)
  const bx = LAMP_BASE[0]
  fillInk(p)
  p.arc(X(bx), X(TT), X(0.36), X(0.16), Math.PI, 2 * Math.PI, p.CHORD)
  // Each arm: two bars and a spring beside them.
  for (const [a, b] of [[LAMP_BASE, j1], [j1, j2]] as [Pt, Pt][]) {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const L = Math.hypot(dx, dy)
    const nx = (-dy / L) * 0.024
    const ny = (dx / L) * 0.024
    rod(p, k, 0.026)
    p.line(X(a[0] + nx), X(a[1] + ny), X(b[0] + nx), X(b[1] + ny))
    p.line(X(a[0] - nx), X(a[1] - ny), X(b[0] - nx), X(b[1] - ny))
    p.strokeWeight(Math.max(1, 0.018 * k))
    p.line(X(a[0] + 3.2 * nx + dx * 0.15), X(a[1] + 3.2 * ny + dy * 0.15), X(a[0] + 3.2 * nx + dx * 0.6), X(a[1] + 3.2 * ny + dy * 0.6))
  }
  fillInk(p)
  p.circle(X(j1[0]), X(j1[1]), X(0.07))
  p.circle(X(j2[0]), X(j2[1]), X(0.07))
  // The shade: a cone from the hinge out along the look, and a knob at its back.
  const [ux, uy] = d
  const vx = -uy
  const vy = ux
  const back: Pt = [j2[0] - ux * 0.04, j2[1] - uy * 0.04]
  const mouth: Pt = [j2[0] + ux * 0.27, j2[1] + uy * 0.27]
  p.quad(
    X(back[0] + vx * 0.045), X(back[1] + vy * 0.045),
    X(mouth[0] + vx * 0.13), X(mouth[1] + vy * 0.13),
    X(mouth[0] - vx * 0.13), X(mouth[1] - vy * 0.13),
    X(back[0] - vx * 0.045), X(back[1] - vy * 0.045),
  )
  p.circle(X(back[0] - ux * 0.03), X(back[1] - uy * 0.03), X(0.07))
}

/** The pen, its nib at `nib`, leaning `lean`. */
function pen(p: p5, k: number, nib: Pt, lean: number): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(nib[0]), X(nib[1]))
  p.rotate(lean)
  fillInk(p)
  p.beginShape()
  p.vertex(0, 0)
  p.vertex(X(0.025), X(-0.07))
  p.vertex(X(0.028), X(-0.4))
  p.vertex(X(0.018), X(-0.44))
  p.vertex(X(-0.018), X(-0.44))
  p.vertex(X(-0.028), X(-0.4))
  p.vertex(X(-0.025), X(-0.07))
  p.endShape(p.CLOSE)
  // Its clip.
  p.rect(X(0.04), X(-0.34), X(0.016), X(0.12))
  p.pop()
}

/** The glass jug and a tumbler: glass throws a paler shadow, and the water in it a darker one. */
function jug(p: p5, k: number, t: number): void {
  const X = (v: number) => v * k
  const x = 9.34
  const y = TT
  // The water's line shivers when the table is knocked (the lamp's light snapping on her).
  const shiver = 0.012 * ring(t - LAMP[3], 3.2, 0.45)
  p.stroke(INK)
  p.strokeWeight(Math.max(1, 0.022 * k))
  p.fill(rgba(INK, 0.28))
  p.beginShape()
  p.vertex(X(x - 0.1), X(y))
  p.bezierVertex(X(x - 0.19), X(y - 0.12), X(x - 0.16), X(y - 0.3), X(x - 0.08), X(y - 0.4))
  p.vertex(X(x - 0.13), X(y - 0.47))
  p.vertex(X(x + 0.07), X(y - 0.46))
  p.bezierVertex(X(x + 0.16), X(y - 0.3), X(x + 0.19), X(y - 0.12), X(x + 0.1), X(y))
  p.endShape(p.CLOSE)
  p.noFill()
  p.bezier(X(x + 0.07), X(y - 0.4), X(x + 0.27), X(y - 0.38), X(x + 0.26), X(y - 0.14), X(x + 0.13), X(y - 0.1))
  p.noStroke()
  p.fill(rgba(INK, 0.35))
  p.beginShape()
  p.vertex(X(x - 0.1), X(y))
  p.bezierVertex(X(x - 0.19), X(y - 0.1), X(x - 0.18), X(y - 0.2), X(x - 0.165), X(y - 0.24 - shiver))
  p.vertex(X(x + 0.165), X(y - 0.24 + shiver))
  p.bezierVertex(X(x + 0.18), X(y - 0.2), X(x + 0.19), X(y - 0.1), X(x + 0.1), X(y))
  p.endShape(p.CLOSE)
  // The tumbler.
  p.stroke(INK)
  p.strokeWeight(Math.max(1, 0.02 * k))
  p.fill(rgba(INK, 0.28))
  p.quad(X(9.04), X(y), X(9.12), X(y), X(9.135), X(y - 0.19), X(9.025), X(y - 0.19))
}

/** The screen's valance: a black scalloped band along its top. */
function valance(p: p5, k: number): void {
  const X = (v: number) => v * k
  fillInk(p)
  p.beginShape()
  p.vertex(X(SX0), X(SY0 - 0.2))
  p.vertex(X(SX1), X(SY0 - 0.2))
  const n = 14
  const w = (SX1 - SX0) / n
  p.vertex(X(SX1), X(SY0 + 0.32))
  for (let i = n - 1; i >= 0; i--) {
    const x0 = SX0 + i * w
    p.quadraticVertex(X(x0 + w / 2), X(SY0 + 0.5), X(x0), X(SY0 + 0.32))
  }
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the part */

interface ShadowState {
  begin: number
}

export const shadow = part<ShadowState>(
  {
    name: 'shadow',
    draw(p, s, c) {
      const k = c.k
      const t = c.t + s.begin
      const X = (v: number) => v * k
      const f = frame(p, k)
      const F = flood(t)
      const ctx = p.drawingContext as CanvasRenderingContext2D

      // The dark the screen hangs in.
      p.noStroke()
      p.fill(INK)
      p.rect(X(f.cx), X(f.cy), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))

      // The screen, lit low from behind, brightest in the middle where the lamp is.
      p.fill(SHADOW_MAT.screen)
      p.rect(X((SX0 + SX1) / 2), X((SY0 + SY1) / 2), X(SX1 - SX0), X(SY1 - SY0))
      ctx.save()
      ctx.beginPath()
      ctx.rect(X(SX0), X(SY0), X(SX1 - SX0), X(SY1 - SY0))
      ctx.clip()
      p.fill(rgba(SHADOW_MAT.soft, 0.5))
      p.rect(X((SX0 + SX1) / 2), X((SY0 + SY1) / 2), X(SX1 - SX0), X(SY1 - SY0))
      pool(p, k, 4.4, -1.6, 7.5, SHADOW_MAT.warm, 0.55, 0.62, 0.05)

      // The spot on her, down from the pelmet: it opens on the accent, a breath brighter, and settles; it follows her.
      if (t >= SPOT - 0.04) {
        const a = smooth(t, SPOT - 0.04, SPOT) * (0.78 + 0.3 * knock(t - SPOT, 0.3))
        const mx = miaPath(t)[0]
        const top: Pt = [(RISER[0] + RISER[1]) / 2 + (mx - MARK[0]) * 0.35, PEL_Y + 0.1]
        cone(p, k, top, [mx, RISER_Y], 0.5, 1.35, SHADOW_MAT.warm, a * 0.62)
        cone(p, k, top, [mx, RISER_Y], 0.3, 0.95, SHADOW_MAT.screen, a * 0.42)
        pool(p, k, mx, RISER_Y - 0.08, 0.95, SHADOW_MAT.screen, a * 0.55, 0.32)
      }

      // The lamp's light: low over the papers; brighter as it comes round; full on her when it finds her.
      const pose = lampPose(t)
      const { j2, d } = lampJoints(pose)
      const mouth: Pt = [j2[0] + d[0] * 0.27, j2[1] + d[1] * 0.27]
      const on = t < LAMP[3] ? 0.3 + 0.25 * smooth(t, LAMP[0] - 0.6, LAMP[2]) : 0.75 + 0.35 * knock(t - LAMP[3], 0.25)
      const reach = Math.hypot(pose.at[0] - mouth[0], pose.at[1] - mouth[1])
      cone(p, k, mouth, pose.at, 0.24, 0.35 + reach * 0.34, SHADOW_MAT.screen, on * 0.55)
      pool(p, k, pose.at[0], pose.at[1], 0.28 + reach * 0.2, SHADOW_MAT.screen, on * 0.7, 0.9)

      // The flood: the lamp behind the screen opened all the way, from behind the two of them outward.
      if (F > 0) {
        pool(p, k, BLOOM[0], BLOOM[1], 2 + 11 * F, SHADOW_MAT.warm, Math.min(1, 1.4 * F), 0.8, 0.5)
        pool(p, k, BLOOM[0], BLOOM[1], 1.5 + 9 * F, SHADOW_MAT.screen, F, 0.8, 0.45)
      }
      ctx.restore()

      // The shapes.
      fillInk(p)
      p.rect(X((SX0 + SX1) / 2), X((FLOOR + SY1 + 0.6) / 2), X(SX1 - SX0), X(SY1 + 0.6 - FLOOR))
      valance(p, k)
      chair(p, k)
      metronome(p, k, rodAngle(t))
      riser(p, k)
      table(p, k)
      jug(p, k, t)
      pen(p, k, penPath(t), penLean(t))
      lamp(p, k, pose)

      // At the crest the light eats the shapes and the dark round the screen, from the two of them outward: only they
      // are left in it.
      if (F > 0) {
        const G = F * F
        pool(p, k, BLOOM[0], BLOOM[1], 1 + 12 * G, SHADOW_MAT.warm, Math.min(1, 1.1 * G), 0.75, 0.55)
        pool(p, k, BLOOM[0], BLOOM[1], 0.8 + 8 * G, SHADOW_MAT.screen, 0.75 * G, 0.75, 0.5)
      }
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const T = slot.end - slot.begin
    // In the dark: in along the floor, up onto the seat.
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: at(173.6), p: [0.25, 0], ease: 'out' }]
    ways.push(hop(ways[1], SEAT, at(174.25)))
    ways.push(
      { at: at(TAP - 0.26), p: SEAT },
      // Up to the rod's tip, touching it at the top of the reach, and back down onto the seat.
      { at: at(TAP), p: TAP_AT, ease: 'out' },
      { at: at(SIT), p: SEAT, ease: 'in' },
      { at: at(LEAP), p: SEAT },
    )
    const leap = ways[ways.length - 1]
    ways.push(
      hop(leap, LANDED, at(LAND)),
      { at: at(TOUCH), p: BESIDE, ease: 'out' },
      // The bow: up a little together, and down on the onset.
      { at: at(BOW - 0.24), p: BESIDE },
      { at: at(BOW - 0.12), p: [BESIDE[0], BESIDE[1] - 0.09], ease: 'out' },
      { at: at(BOW), p: BESIDE, ease: 'in' },
      { at: T, p: BESIDE },
    )
    return {
      cells: box(SX0 - 1, SY0 - 1, SX1 + 1, SY1 + 1),
      exit: [BESIDE[0] + 0.5, BESIDE[1]],
      lane: { segs: route(ways), fire: at(TAP) },
      state: { begin: slot.begin },
      company: [{ from: MIA_FROM, to: MIA_TO, who: 'mia', at: (t): Companion => ({ x: miaPath(t)[0], y: miaPath(t)[1] }) }],
    }
  },
  (): PartShot[] => [
    // Under the dark, the whole screen; it comes up wide, and closes in on the stage.
    { t: 172.05, cells: 7.2, hold: [4.4, -1.75] },
    { t: 176.6, cells: 5.4, hold: [4.2, -1.55] },
    // The silence: her and him, and the metronome between them.
    { t: 178.9, cells: 4.0, hold: [2.6, -1.3] },
    { t: 180.7, cells: 4.0, hold: [2.7, -1.3] },
    // The table answers her.
    { t: 183.2, cells: 5.0, hold: [5.3, -1.6] },
    { t: 186.2, cells: 4.6, hold: [5.8, -1.45] },
    { t: 187.9, cells: 4.0, hold: [6.5, -1.35] },
    { t: 189.2, cells: 4.0, hold: [6.6, -1.35] },
    // He leaps; the flood; the two of them in it.
    { t: 190.3, cells: 5.6, hold: [4.3, -1.6] },
    { t: 192.0, cells: 5.0, hold: [3.95, -1.45] },
    { t: 194.9, cells: 3.4, hold: [4.05, -0.95] },
    { t: 195.85, cells: 3.2, hold: [4.05, -0.9] },
  ],
)
