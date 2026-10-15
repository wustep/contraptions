import type p5 from 'p5'
import { FLOOR, R, type Pt } from '../../../../../parts'
import { box, frame, lastOf, part, rgba, ring, route, smooth, type Companion, type PartShot, type Way } from '../kit'
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
/** She is on her mark in the dark before the screen comes up (173.07); the lights go (the cover, 195.1 → 195.85), and she is ours until the cover is full. */
const MIA_FROM = 172.3
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

/**
 * The office's floor, below the line the shapes stand on: the boards going away from us in the room's half-light (a
 * dark grey at the wall, black nearest us), the window's sun lying across them through the blind, dimming with the
 * same cloud as it does on the wall, and the edge of a rug under the casting table, its fringe toward us.
 */
function officeFloor(p: p5, k: number, t: number, F: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const top = FLOOR
  const deep = 0.85
  const fade = 1 - F
  if (fade <= 0.01) return
  ctx.save()
  const g = ctx.createLinearGradient(0, top * k, 0, (top + deep) * k)
  g.addColorStop(0, rgba(SHADOW_MAT.soft, 0.55 * fade))
  g.addColorStop(1, rgba(SHADOW_MAT.soft, 0))
  ctx.fillStyle = g
  ctx.fillRect(SX0 * k, top * k, (SX1 - SX0) * k, deep * k)
  // The boards' joints, running away from us: faint lines converging a little toward the wall.
  ctx.strokeStyle = rgba(INK, 0.5 * fade)
  ctx.lineWidth = Math.max(1, 0.012 * k)
  ctx.beginPath()
  for (let x = SX0 + 0.3; x < SX1; x += 0.62) {
    ctx.moveTo(x * k, top * k)
    ctx.lineTo((x + (x - 4.4) * 0.18) * k, (top + deep) * k)
  }
  ctx.stroke()
  // The sun through the window, on the floor: a long patch thrown forward and to the right, barred by the slats.
  const sun = sunAt(t) * fade
  const ax = WIN.x0 + 0.6
  const bx = WIN.x1 + 0.9
  const patch = (u0: number, u1: number) => {
    const y0 = top + 0.06 + u0 * 0.55
    const y1 = top + 0.06 + u1 * 0.55
    ctx.moveTo((ax + u0 * 1.3) * k, y0 * k)
    ctx.lineTo((bx + u0 * 1.6) * k, y0 * k)
    ctx.lineTo((bx + u1 * 1.6) * k, y1 * k)
    ctx.lineTo((ax + u1 * 1.3) * k, y1 * k)
    ctx.closePath()
  }
  ctx.fillStyle = rgba(SHADOW_MAT.warm, 0.2 * sun)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) patch(i / 6, i / 6 + 0.11)
  ctx.fill()
  // The rug under the table, and its fringe.
  const [t0, t1] = TABLE
  ctx.fillStyle = rgba(INK, 0.75 * fade)
  ctx.beginPath()
  ctx.moveTo((t0 - 0.4) * k, (top + 0.04) * k)
  ctx.lineTo((t1 + 0.4) * k, (top + 0.04) * k)
  ctx.lineTo((t1 + 0.6) * k, (top + 0.42) * k)
  ctx.lineTo((t0 - 0.6) * k, (top + 0.42) * k)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgba(SHADOW_MAT.soft, 0.9 * fade)
  ctx.beginPath()
  ctx.moveTo((t0 - 0.55) * k, (top + 0.39) * k)
  ctx.lineTo((t1 + 0.55) * k, (top + 0.39) * k)
  for (let x = t0 - 0.55; x < t1 + 0.55; x += 0.08) {
    ctx.moveTo(x * k, (top + 0.42) * k)
    ctx.lineTo((x + 0.01) * k, (top + 0.5) * k)
  }
  ctx.stroke()
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

/* ------------------------------------------------------------------ the room the screen is the wall of */

/*
 * The casting office the shadow play is set in, every piece of it a shadow too, its value saying how far it is from
 * the screen: what stands against the screen is black and sharp (the coat stand, the water cooler, the props on the
 * table), what stands back toward the lamp behind it is larger and grey (the casting panel, the clock, the fan), and
 * the window's sun on the wall is the faintest of all. A foreground fern stands in front of the screen, between it and
 * us, so it moves more than the screen as the camera does.
 */

/** The window's sun on the wall, sheared by its slant: its corners (bottom-left first), and how the light falls. */
const WIN = { x0: -1.25, x1: 1.55, y0: -4.35, y1: -2.15, shear: 0.55 }
/** A cloud goes over the sun while the music holds its breath, and the sun comes back as she begins. */
const sunAt = (t: number): number => 1 - 0.6 * (smooth(t, 177.3, 178.6) - smooth(t, 179.9, 181.2))
/** The ceiling fan: its hub, and how far its blades reach. */
const FAN: Pt = [4.2, -3.95]
const FAN_L = 1.05
/** The wall clock: an open wire clock, its centre and radius. */
const CLOCK: Pt = [7.95, -3.25]
const CLOCK_R = 0.38
/** The casting panel, behind the table: where each sits. */
const PANEL = [7.45, 8.55, 9.55]
/** The page turns (on the metronome's stops), her sip (in the silence), and the third's lean in. */
const PAGES = [TICKS[2], TICKS[7], TICKS[11]]
const SIP: [number, number] = [177.7, 179.35]
const LEAN_IN = LAMP[3]
/** The water cooler, against the screen at the right. */
const COOLER_X = 10.32
/** Bubbles up the cooler's bottle: a gulp now and then, then on every fourth stop of the metronome. */
const BUBBLES = [174.4, 176.9, 179.0, ...TICKS.filter((_, i) => i % 4 === 1), 192.2]
/** The coat stand, and the fern in front of the screen (where it stands when the camera is at the screen's middle). */
const STAND_X = -0.42
const FERN_X = -1.45
const FERN_Q = 1.35

const shade = (a: number): string => rgba(INK, a)

/** The window's sun on the wall: a lit patch with the blind's slats across it and a palm's frond stirring beyond. */
function windowSun(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const sun = sunAt(t)
  const { x0, x1, y0, y1, shear } = WIN
  const sx = (x: number, y: number) => (x + ((y1 - y) / (y1 - y0)) * shear) * k
  const patch = () => {
    ctx.beginPath()
    ctx.moveTo(sx(x0, y1), y1 * k)
    ctx.lineTo(sx(x1, y1), y1 * k)
    ctx.lineTo(sx(x1, y0), y0 * k)
    ctx.lineTo(sx(x0, y0), y0 * k)
    ctx.closePath()
  }
  ctx.save()
  patch()
  ctx.fillStyle = rgba(SHADOW_MAT.warm, 0.4 * sun)
  ctx.fill()
  ctx.clip()
  // The frond beyond the glass, in the wind: a rachis bowing down, its leaflets hanging from it.
  const sway = 0.07 * Math.sin(t * 0.8) + 0.035 * Math.sin(t * 2.1 + 1)
  ctx.translate(sx(x1 + 0.2, y0 + 0.3), (y0 + 0.3) * k)
  ctx.rotate(0.35 + sway)
  ctx.strokeStyle = shade(0.16 + 0.08 * sun)
  ctx.lineWidth = Math.max(1, 0.05 * k)
  ctx.beginPath()
  const rach = (u: number): Pt => [-2.6 * u, 1.1 * u * u]
  ctx.moveTo(0, 0)
  for (let i = 1; i <= 12; i++) {
    const [x, y] = rach(i / 12)
    ctx.lineTo(x * k, y * k)
  }
  ctx.stroke()
  ctx.lineWidth = Math.max(1, 0.035 * k)
  ctx.beginPath()
  for (let i = 1; i < 14; i++) {
    const u = i / 14
    const [x, y] = rach(u)
    const L = 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.12
    const flick = 0.12 * Math.sin(t * 2.4 + i)
    for (const side of [-1, 1]) {
      ctx.moveTo(x * k, y * k)
      ctx.lineTo((x - 0.18 * L) * k, (y + side * 0.25 * L + 0.75 * L + side * flick * L * 0.2) * k)
    }
  }
  ctx.stroke()
  ctx.restore()
  // The blind's slats and the window's frame and bars, thrown across it: shadows within the light.
  ctx.fillStyle = shade(0.1 + 0.12 * sun)
  ctx.beginPath()
  for (let y = y0 + 0.1; y < y1 - 0.02; y += 0.15) {
    ctx.moveTo(sx(x0, y), y * k)
    ctx.lineTo(sx(x1, y), y * k)
    ctx.lineTo(sx(x1, y + 0.055), (y + 0.055) * k)
    ctx.lineTo(sx(x0, y + 0.055), (y + 0.055) * k)
  }
  ctx.fill()
  ctx.strokeStyle = shade(0.2 + 0.12 * sun)
  ctx.lineWidth = Math.max(1, 0.1 * k)
  patch()
  ctx.stroke()
  ctx.lineWidth = Math.max(1, 0.07 * k)
  ctx.beginPath()
  const xm = (x0 + x1) / 2
  ctx.moveTo(sx(xm, y0), y0 * k)
  ctx.lineTo(sx(xm, y1), y1 * k)
  ctx.stroke()
  // The blind's cord, hanging from its head down the side, swinging a little.
  ctx.lineWidth = Math.max(1, 0.02 * k)
  ctx.beginPath()
  const cx = sx(x0 + 0.2, y0)
  ctx.moveTo(cx, y0 * k)
  ctx.lineTo(cx + 0.08 * Math.sin(t * 1.3) * k, (y1 + 0.35) * k)
  ctx.stroke()
}

/** The ceiling fan, from the side: its downrod from the valance, the motor, four blades sweeping round, the pull chain. */
function fan(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [hx, hy] = FAN
  const a = shade(0.34)
  ctx.fillStyle = a
  ctx.strokeStyle = a
  ctx.lineWidth = Math.max(1, 0.06 * k)
  ctx.beginPath()
  ctx.moveTo(hx * k, (SY0 + 0.3) * k)
  ctx.lineTo(hx * k, (hy - 0.12) * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(hx * k, hy * k, 0.24 * k, 0.13 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  // The blades: seen edge-on as they come round, broad as they cross.
  const turn = t * 2 * Math.PI * 0.9
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const th = turn + (i * Math.PI) / 2
    const x = FAN_L * Math.cos(th)
    const depth = Math.sin(th)
    const y = hy + 0.06 + 0.06 * depth
    const w = 0.035 + 0.06 * Math.abs(depth)
    const x0 = 0.2 * Math.sign(x)
    ctx.moveTo((hx + x0) * k, (hy + 0.03) * k)
    ctx.lineTo((hx + x) * k, (y - w) * k)
    ctx.lineTo((hx + x) * k, (y + w) * k)
    ctx.lineTo((hx + x0) * k, (hy + 0.09) * k)
  }
  ctx.fill()
  // The chain, swinging with the air the blades push.
  const sw = 0.05 * Math.sin(t * 2.7)
  ctx.lineWidth = Math.max(1, 0.018 * k)
  ctx.beginPath()
  ctx.moveTo(hx * k, (hy + 0.12) * k)
  ctx.lineTo((hx + sw) * k, (hy + 0.5) * k)
  ctx.stroke()
  ctx.fillRect((hx + sw - 0.02) * k, (hy + 0.5) * k, 0.04 * k, 0.08 * k)
}

/** The wall clock, an open wire one: its ring, its twelve marks and its hands; the second hand keeps the metronome's time. */
function clock(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [cx, cy] = CLOCK
  const ink = shade(0.48)
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1, 0.05 * k)
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, CLOCK_R * k, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = Math.max(1, 0.03 * k)
  ctx.beginPath()
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    const r0 = i % 3 === 0 ? 0.26 : 0.3
    ctx.moveTo((cx + r0 * Math.sin(a)) * k, (cy - r0 * Math.cos(a)) * k)
    ctx.lineTo((cx + 0.35 * Math.sin(a)) * k, (cy - 0.35 * Math.cos(a)) * k)
  }
  // The hour and minute hands: ten to four, and creeping.
  const minute = ((50 + (t - 172) / 60) / 60) * Math.PI * 2
  const hour = ((3 + (50 + (t - 172) / 60) / 60) / 12) * Math.PI * 2
  ctx.moveTo(cx * k, cy * k)
  ctx.lineTo((cx + 0.18 * Math.sin(hour)) * k, (cy - 0.18 * Math.cos(hour)) * k)
  ctx.moveTo(cx * k, cy * k)
  ctx.lineTo((cx + 0.3 * Math.sin(minute)) * k, (cy - 0.3 * Math.cos(minute)) * k)
  ctx.stroke()
  // The second hand: a step a second, and from the tap a step on every stop of the metronome; each step settles.
  let steps: number
  let since: number
  if (t < TAP) {
    steps = Math.floor(t - 172)
    since = t - 172 - steps
  } else {
    const n = lastOf(TICKS, t)
    steps = Math.floor(TAP - 172) + (n.i + 1)
    since = n.i < 0 ? t - TAP : n.ago
    if (t > TICKS[TICKS.length - 1]) {
      const after = Math.floor(t - TICKS[TICKS.length - 1])
      steps += after
      since = t - TICKS[TICKS.length - 1] - after
    }
  }
  const sa = ((steps + 0.12 * ring(since, 6, 0.06)) / 60) * Math.PI * 2 + 1.1
  ctx.lineWidth = Math.max(1, 0.016 * k)
  ctx.beginPath()
  ctx.moveTo((cx - 0.08 * Math.sin(sa)) * k, (cy + 0.08 * Math.cos(sa)) * k)
  ctx.lineTo((cx + 0.33 * Math.sin(sa)) * k, (cy - 0.33 * Math.cos(sa)) * k)
  ctx.stroke()
}

/**
 * One of the casting panel, seated behind the table facing the stage (left): head in profile, shoulders, an arm.
 * `lean` tips them toward the stage from the hips; `nod` drops the head; `hand` is where the near hand is (null: in
 * the lap, out of sight below the table).
 */
function sitter(p: p5, k: number, x: number, lean: number, nod: number, breath: number, hair: 'bun' | 'short' | 'bob', hand: Pt | null, ink: string): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const hip: Pt = [x, TT + 0.05]
  ctx.save()
  ctx.translate(hip[0] * k, hip[1] * k)
  ctx.rotate(-lean)
  ctx.fillStyle = ink
  ctx.beginPath()
  // The torso, up from the table's edge: rounded shoulders, a little higher on each breath.
  const sh = -0.62 - breath
  ctx.moveTo(-0.3 * k, 0)
  ctx.lineTo(-0.3 * k, (sh + 0.16) * k)
  ctx.quadraticCurveTo(-0.3 * k, sh * k, -0.1 * k, sh * k)
  ctx.lineTo(0.12 * k, sh * k)
  ctx.quadraticCurveTo(0.32 * k, sh * k, 0.32 * k, (sh + 0.18) * k)
  ctx.lineTo(0.32 * k, 0)
  ctx.closePath()
  ctx.fill()
  // The neck, and the head, nodding forward (toward the stage).
  ctx.translate(-0.02 * k, (sh + 0.02) * k)
  ctx.rotate(-nod)
  ctx.fillRect(-0.06 * k, -0.12 * k, 0.12 * k, 0.14 * k)
  ctx.beginPath()
  ctx.ellipse(-0.01 * k, -0.27 * k, 0.15 * k, 0.18 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  // The nose and the chin, to say which way they face.
  ctx.beginPath()
  ctx.moveTo(-0.15 * k, -0.31 * k)
  ctx.lineTo(-0.21 * k, -0.23 * k)
  ctx.lineTo(-0.14 * k, -0.2 * k)
  ctx.fill()
  ctx.beginPath()
  if (hair === 'bun') ctx.arc(0.13 * k, -0.37 * k, 0.08 * k, 0, Math.PI * 2)
  else if (hair === 'bob') ctx.ellipse(0.04 * k, -0.27 * k, 0.17 * k, 0.17 * k, 0, Math.PI * 1.1, Math.PI * 2.4)
  else ctx.ellipse(0.02 * k, -0.36 * k, 0.15 * k, 0.07 * k, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  if (hand) {
    // The near arm, from the shoulder to the hand.
    const sx = hip[0] - 0.12 + Math.sin(lean) * -0.6
    const sy = hip[1] - 0.5
    ctx.strokeStyle = ink
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, 0.1 * k)
    ctx.beginPath()
    ctx.moveTo(sx * k, sy * k)
    const ex = (sx + hand[0]) / 2 + 0.06
    const ey = Math.max(sy, hand[1]) + 0.12
    ctx.quadraticCurveTo(ex * k, ey * k, hand[0] * k, hand[1] * k)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }
}

/** The casting panel, behind the table: one turns the pages, one sips from a cup in the silence, one leans in. */
function panel(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ink = shade(0.42)
  const breath = (i: number) => 0.012 * Math.sin(t * 1.7 + i * 2.1)
  // They look up as she presents herself, and down again; all three nod when the pen signs.
  const look = 0.12 * (1 - smooth(t, PRESENT[0] - 0.3, PRESENT[0] + 0.2)) + 0.1 * smooth(t, 181.5, 182.3) * (1 - smooth(t, LAMP[2] - 0.3, LAMP[2] + 0.3))
  const sign = PEN.slice(0, 3).reduce((a, x) => a + 0.12 * Math.max(0, ring(t - x, 2.2, 0.22)), 0)
  // The first turns a page on three of the stops: her hand goes to the stack's corner, and the leaf goes over.
  const turning = PAGES.find((x) => t > x - 0.6 && t < x + 0.5)
  const reach: Pt | null = turning !== undefined ? [PAPER[1] - 0.05 - 0.55 * smooth(t, turning - 0.2, turning + 0.25), PAPER_Y - 0.08 - 0.25 * Math.sin(Math.PI * smooth(t, turning - 0.2, turning + 0.25))] : null
  sitter(p, k, PANEL[0], 0.06, look + 0.08 + sign, breath(0), 'bun', reach, ink)
  if (turning !== undefined) {
    const u = smooth(t, turning - 0.2, turning + 0.25)
    const a = Math.PI * u
    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(1, 0.025 * k)
    ctx.beginPath()
    const L = (PAPER[1] - PAPER[0]) / 2
    const mx = (PAPER[0] + PAPER[1]) / 2
    ctx.moveTo(mx * k, PAPER_Y * k)
    ctx.quadraticCurveTo((mx + L * Math.cos(a) * 0.6) * k, (PAPER_Y - L * Math.sin(a) * 0.9) * k, (mx + L * Math.cos(a)) * k, (PAPER_Y - L * Math.sin(a) * 0.55) * k)
    ctx.stroke()
  }
  // The second lifts a cup to drink in the silence, and sets it down as she begins.
  const sip = smooth(t, SIP[0], SIP[0] + 0.5) - smooth(t, SIP[1] - 0.4, SIP[1])
  const cup: Pt = [PANEL[1] - 0.32 + 0.12 * sip, TT - 0.12 - 0.72 * sip]
  sitter(p, k, PANEL[1], 0.02 - 0.12 * sip, look - 0.25 * sip + sign, breath(1), 'short', cup, ink)
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.moveTo((cup[0] - 0.07) * k, (cup[1] - 0.06) * k)
  ctx.lineTo((cup[0] + 0.07) * k, (cup[1] - 0.06) * k)
  ctx.lineTo((cup[0] + 0.055) * k, (cup[1] + 0.1) * k)
  ctx.lineTo((cup[0] - 0.055) * k, (cup[1] + 0.1) * k)
  ctx.fill()
  // The third leans in on her when the light finds her, chin on hand, and stays there.
  const lean = smooth(t, LEAN_IN - 0.5, LEAN_IN + 0.4)
  sitter(p, k, PANEL[2], 0.04 + 0.3 * lean, look * (1 - lean) + 0.1 * lean + sign, breath(2), 'bob', lean > 0.05 ? [PANEL[2] - 0.32 - 0.38 * lean, TT - 0.5 - 0.35 * lean] : null, ink)
}

/** The coat stand, against the screen: a pole on three feet, a hat and a coat on its hooks; the coat swings when he leaps. */
function coatStand(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = STAND_X
  ctx.fillStyle = INK
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(1, 0.05 * k)
  ctx.beginPath()
  ctx.moveTo(X * k, FLOOR * k)
  ctx.lineTo(X * k, -2.05 * k)
  for (const s of [-1, 1]) {
    ctx.moveTo(X * k, (FLOOR - 0.12) * k)
    ctx.lineTo((X + s * 0.28) * k, FLOOR * k)
    ctx.moveTo(X * k, -1.9 * k)
    ctx.quadraticCurveTo((X + s * 0.2) * k, -1.95 * k, (X + s * 0.24) * k, -2.08 * k)
  }
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(X * k, -2.1 * k, 0.05 * k, 0, Math.PI * 2)
  ctx.fill()
  // The hat on the left hook.
  ctx.beginPath()
  ctx.ellipse((X - 0.26) * k, -2.05 * k, 0.2 * k, 0.04 * k, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse((X - 0.27) * k, -2.14 * k, 0.12 * k, 0.1 * k, -0.2, Math.PI, 0)
  ctx.fill()
  // The coat on the right hook: hung from its shoulders, swinging out and back when the chair is kicked.
  const swing = 0.16 * ring(t - LEAP, 1.3, 0.6)
  ctx.save()
  ctx.translate((X + 0.2) * k, -2.0 * k)
  ctx.rotate(swing)
  ctx.beginPath()
  ctx.moveTo(-0.1 * k, 0)
  ctx.quadraticCurveTo(-0.26 * k, 0.1 * k, -0.24 * k, 0.5 * k)
  ctx.lineTo(-0.28 * k, 1.15 * k)
  ctx.lineTo(0.22 * k, 1.15 * k)
  ctx.lineTo(0.2 * k, 0.5 * k)
  ctx.quadraticCurveTo(0.24 * k, 0.1 * k, 0.08 * k, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** The water cooler, against the screen: a cabinet, its tap, and the glass bottle upside down on it with a bubble going up. */
function cooler(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x = COOLER_X
  ctx.fillStyle = INK
  ctx.fillRect((x - 0.24) * k, -0.85 * k, 0.48 * k, (FLOOR + 0.85) * k)
  ctx.fillRect((x - 0.28) * k, -0.9 * k, 0.56 * k, 0.07 * k)
  ctx.fillRect((x - 0.32) * k, -0.62 * k, 0.1 * k, 0.05 * k)
  // The bottle: glass throws a paler shadow, the water in it a darker one; its neck down in the cabinet.
  const b0 = -0.9
  const b1 = -1.82
  const glass = () => {
    ctx.beginPath()
    ctx.moveTo((x - 0.06) * k, b0 * k)
    ctx.lineTo((x - 0.06) * k, (b0 - 0.12) * k)
    ctx.quadraticCurveTo((x - 0.22) * k, (b0 - 0.16) * k, (x - 0.22) * k, (b0 - 0.3) * k)
    ctx.lineTo((x - 0.22) * k, (b1 + 0.08) * k)
    ctx.quadraticCurveTo((x - 0.22) * k, b1 * k, (x - 0.14) * k, b1 * k)
    ctx.lineTo((x + 0.14) * k, b1 * k)
    ctx.quadraticCurveTo((x + 0.22) * k, b1 * k, (x + 0.22) * k, (b1 + 0.08) * k)
    ctx.lineTo((x + 0.22) * k, (b0 - 0.3) * k)
    ctx.quadraticCurveTo((x + 0.22) * k, (b0 - 0.16) * k, (x + 0.06) * k, (b0 - 0.12) * k)
    ctx.lineTo((x + 0.06) * k, b0 * k)
    ctx.closePath()
  }
  glass()
  ctx.fillStyle = shade(0.28)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(1, 0.022 * k)
  ctx.stroke()
  // The water, up to its line near the top (the air above it), which shivers when a bubble breaks it.
  const last = lastOf(BUBBLES, t)
  const rise = 0.9
  const level = b1 + 0.2 + 0.015 * ring(last.ago - rise, 3, 0.3)
  ctx.save()
  glass()
  ctx.clip()
  ctx.fillStyle = shade(0.3)
  ctx.fillRect((x - 0.3) * k, level * k, 0.6 * k, (b0 - level) * k)
  // The bubble, rising from the neck to the line, wobbling as it goes.
  if (last.i >= 0 && last.ago < rise) {
    const u = last.ago / rise
    const by = b0 - 0.12 + (level - (b0 - 0.12)) * u * u * (1.6 - 0.6 * u)
    const r = 0.035 + 0.05 * u
    ctx.fillStyle = rgba(SHADOW_MAT.screen, 0.85)
    ctx.beginPath()
    ctx.ellipse((x + 0.03 * Math.sin(u * 14)) * k, by * k, r * k, r * 0.8 * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** The fern in front of the screen, between it and us: black against the light, it moves more than the screen does. */
function fern(p: p5, k: number, t: number, f: { cx: number }): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x = FERN_X - (FERN_Q - 1) * (f.cx - 4.4)
  const base: Pt = [x, FLOOR + 0.55]
  ctx.fillStyle = INK
  ctx.strokeStyle = INK
  // The pot.
  ctx.beginPath()
  ctx.moveTo((x - 0.42) * k, (base[1] - 0.62) * k)
  ctx.lineTo((x + 0.42) * k, (base[1] - 0.62) * k)
  ctx.lineTo((x + 0.32) * k, (base[1] + 0.3) * k)
  ctx.lineTo((x - 0.32) * k, (base[1] + 0.3) * k)
  ctx.fill()
  // The fronds: arching out of it, leaflets along each; stirring in the fan's air.
  ctx.lineWidth = Math.max(1, 0.035 * k)
  ctx.beginPath()
  const fronds = [-1.05, -0.65, -0.25, 0.2, 0.6, 1.0]
  for (const [i, a0] of fronds.entries()) {
    const a = a0 + 0.05 * Math.sin(t * 1.4 + i * 1.7)
    const L = 1.3 - 0.25 * Math.abs(a0)
    const at = (u: number): Pt => [x + Math.sin(a) * L * u + 0.25 * Math.sign(a) * u * u, base[1] - 0.6 - Math.cos(a) * L * u + 0.85 * u * u * Math.abs(Math.sin(a))]
    const [ax, ay] = at(0)
    ctx.moveTo(ax * k, ay * k)
    for (let j = 1; j <= 8; j++) {
      const [px, py] = at(j / 8)
      ctx.lineTo(px * k, py * k)
    }
    for (let j = 2; j <= 8; j++) {
      const [px, py] = at(j / 8.5)
      const l = 0.17 * (1 - j / 10)
      ctx.moveTo((px - l) * k, (py - l * 0.4) * k)
      ctx.lineTo(px * k, py * k)
      ctx.lineTo((px + l) * k, (py - l * 0.4) * k)
    }
  }
  ctx.stroke()
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
      // The room's far shadows on the wall: the window's sun, the fan, the clock, and the casting panel.
      windowSun(p, k, t)
      fan(p, k, t)
      clock(p, k, t)
      panel(p, k, t)

      // The spot on her, down from the pelmet: it opens on the accent and holds; it follows her.
      if (t >= SPOT - 0.04) {
        const a = smooth(t, SPOT - 0.04, SPOT) * 0.8
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
      const on = t < LAMP[3] ? 0.3 + 0.25 * smooth(t, LAMP[0] - 0.6, LAMP[2]) : 0.55 + 0.25 * smooth(t, LAMP[3], LAMP[3] + 0.2)
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
      officeFloor(p, k, t, F)
      valance(p, k)
      coatStand(p, k, t)
      cooler(p, k, t)
      chair(p, k)
      metronome(p, k, rodAngle(t))
      riser(p, k)
      table(p, k)
      jug(p, k, t)
      pen(p, k, penPath(t), penLean(t))
      lamp(p, k, pose)
      fern(p, k, t, f)

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
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: at(172.45), p: [0.25, 0], ease: 'out' }]
    // On the seat on the low note the screen begins to light on.
    ways.push(hop(ways[1], SEAT, at(173.07)))
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
      { at: at(BOW - 0.12), p: [BESIDE[0], BESIDE[1] - 0.09], ease: 'inout' },
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
    { t: 176.6, cells: 5.4, hold: [4.2, -1.7] },
    // The silence: her and him, and the metronome between them.
    { t: 178.9, cells: 4.0, hold: [2.6, -1.3] },
    { t: 180.7, cells: 4.0, hold: [2.7, -1.3] },
    // The table answers her, and he watches from his chair: the three of them, chair, stage and table, in one frame,
    // and the camera leans in on her as the lamp comes round to find her.
    { t: 183.2, cells: 5.4, hold: [5.05, -1.75] },
    { t: 186.9, cells: 4.95, hold: [4.85, -1.6] },
    // In a little as the pen signs, his chair still at the left of the frame: he sees it, and leaps.
    { t: 188.3, cells: 4.75, hold: [4.75, -1.45] },
    { t: 189.4, cells: 4.7, hold: [4.7, -1.45] },
    // He leaps; the flood; the two of them in it.
    { t: 190.3, cells: 5.6, hold: [4.3, -1.6] },
    { t: 192.0, cells: 5.0, hold: [3.95, -1.45] },
    { t: 194.9, cells: 3.4, hold: [4.05, -0.95] },
    { t: 195.85, cells: 3.2, hold: [4.05, -0.9] },
  ],
)
