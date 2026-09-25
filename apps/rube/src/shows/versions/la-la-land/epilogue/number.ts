import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutQuad, lerp } from '../../../../../../../src/core/ease'
import { FLOOR, type Pt, type Seg } from '../../../../parts'
import { alpha, box, carried, knock, part, route, smooth, type Companion, type Ctx, type PartShot, type Way } from './kit'
import { number as beat, NUMBER_ORIGIN, NUMBER_PERIOD } from './music'
import { G_EARTH, hop } from './physics'
import { batten, beam, glow } from './rig'
import { PAINT } from './worlds'

/**
 * The production number: the film's Hollywood finale as a machine.
 *
 * The stars set the two down on a bare stage, at rest, on a slab in the
 * floor: the stage lift. Then the stage builds its own set. A grand
 * staircase surfaces out of the floor in a wave, three steps at a time,
 * from the top beside them down to the foot far right, each section locking
 * with a thunk on one of the build's big onsets. Behind it a great sun disc
 * flies in on a batten and lands on the biggest onset of the stretch, and
 * lights. A boom of four spotlights swings in over the top of the stairs and
 * strikes. A chorus line of legs (cut-outs on a camshaft, no faces) files in
 * from both ends of a flown bridge across the sun. From the sun's landing
 * the lift takes the two up, slow and steady, so the boom and the chorus
 * come in round a rising pair; it locks at the top of the staircase on
 * beat 443, and the chorus starts kicking on the pickups.
 *
 * On the downbeat (444) the top landing lights and they go: down the
 * staircase, a landing on every beat, she on the off-beats half a step
 * behind. Every tread lights as it is landed on and stays lit, so the
 * staircase turns gold behind them; the sun pulses on the bars; two spots
 * follow them, two sweep the set; the legs kick on the off-beats with her.
 * On the last beat (487) they land together on the mark at the foot, and
 * the set goes quiet.
 *
 * The part's frame: the ball comes in at rest on the lift's slab at floor
 * level (y = 0, the floor at FLOOR); it leaves at rest on the floor at the
 * foot, the same level.
 */

/* ------------------------------------------------------------------ the staircase */

const TREAD = 0.34
const RISE = 0.11
/** Treads 1..42; landing 43 is the mark on the floor at the foot. */
const STEPS = 42
/** The second position on each of the four landings: no drop from the one before. */
const FLAT = new Set([9, 17, 25, 33])
/** His last hop, onto the mark at the foot, a little longer than a tread: a finish. */
const LAST_HOP = 0.68

/** Where he lands: position j (0 the lift, 43 the foot), ball-centre height. */
const X: number[] = []
const Y: number[] = []
{
  let drops = 0
  for (let j = 1; j <= STEPS; j++) if (!FLAT.has(j)) drops++
  const top = -RISE * (drops + 1)
  X.push(-0.5)
  Y.push(top)
  let y = top
  for (let j = 1; j <= STEPS; j++) {
    if (!FLAT.has(j)) y += RISE
    X.push(-0.5 + TREAD * j)
    Y.push(y)
  }
  X.push(X[STEPS] + LAST_HOP)
  Y.push(0)
}
const TOP = Y[0]
const FOOT_X = X[STEPS + 1]
const EXIT_X = FOOT_X + 0.5
/** The lift's slab: from the left, to the first tread's back edge. */
const LIFT_L = -1.3
const LIFT_R = X[1] - TREAD / 2

/** The sections the staircase surfaces in: how many treads, and the onset each locks on. */
const SECTIONS: { n: number; lock: number }[] = [
  { n: 3, lock: 193.411 },
  { n: 3, lock: 194.502 },
  { n: 3, lock: 195.233 },
  { n: 3, lock: 196.963 },
  { n: 3, lock: 197.579 },
  { n: 3, lock: 198.449 },
  { n: 3, lock: 199.204 },
  { n: 4, lock: 199.599 },
  { n: 3, lock: 199.959 },
  { n: 3, lock: 200.644 },
  { n: 3, lock: 202.675 },
  { n: 3, lock: 203.198 },
  { n: 3, lock: 204.812 },
  { n: 3, lock: 205.264 },
]
/** Each tread's section, and each section's rise: when it starts, how long it takes. */
const SECTION_OF: number[] = [0]
const RISES: { start: number; lock: number; dur: number }[] = []
{
  let j = 1
  for (let g = 0; g < SECTIONS.length; g++) {
    const { n, lock } = SECTIONS[g]
    const h = -Y[j]
    // The first section shoots up right after they land; the rest gather and run at a lift's pace.
    const dur = g === 0 ? 0.42 : clamp(h / 3.2, 0.5, 1.5)
    RISES.push({ start: lock - dur, lock, dur })
    for (let i = 0; i < n; i++) SECTION_OF[j++] = g
  }
}

/** A lift's run, 0 → 1: it gathers over the first `a` of its time, then runs steady to the stop. */
const hoist = (u: number, a = 0.3): number => {
  const v = clamp(u)
  const s = v < a ? (v * v) / (2 * a) : v - a / 2
  return s / (1 - a / 2)
}
/** The speed a hoist arrives at, per second, for a run of `d` over `dur`. */
const arriving = (d: number, dur: number, a = 0.3): number => d / (dur * (1 - a / 2))
/** The stop: carried past the mark by the speed it had, and back, damped. In the direction of travel. */
const thunk = (since: number, v: number, tau = 0.14): number => (since <= 0 ? 0 : (Math.min(v, 3) / 24) * Math.exp(-since / tau) * Math.sin(24 * since))

/** Tread j's height at show time `T`, as the ball-centre height on it: 0 while it is still in the floor. */
function treadAt(j: number, T: number): number {
  const g = SECTION_OF[j]
  const { start, lock, dur } = RISES[g]
  const h = -Y[j]
  if (T < lock) return -h * hoist((T - start) / dur)
  return Y[j] - thunk(T - lock, arriving(h, dur))
}

/* ------------------------------------------------------------------ the lift */

/** The lift starts up as the sun lands (SUN_LAND), gathers slowly, and climbs steadily to its lock on beat 443. */
const LIFT_GO = 201.317
const LIFT_LOCK = beat(443)
/** The downbeat: the top landing lights and they go. */
const GO = beat(444)
const END = beat(487)

/** The lift's slab, as the ball-centre height on it: one continuous eased rise, a small settle at the lock. */
function liftAt(T: number): number {
  if (T < LIFT_GO) return 0
  const dur = LIFT_LOCK - LIFT_GO
  if (T < LIFT_LOCK) return TOP * hoist((T - LIFT_GO) / dur, 0.35)
  return TOP - thunk(T - LIFT_LOCK, arriving(-TOP, dur, 0.35), 0.16)
}

/* ------------------------------------------------------------------ the sun, the bridge, the boom */

const SUN: Pt = [6.0, -5.0]
const SUN_R = 2.7
const SUN_HIGH = -13.5
const SUN_GO = 196.4
const SUN_LAND = 201.317

function sunAt(T: number): number {
  if (T < SUN_GO) return SUN_HIGH
  const dur = SUN_LAND - SUN_GO
  if (T < SUN_LAND) return lerp(SUN_HIGH, SUN[1], hoist((T - SUN_GO) / dur, 0.25))
  return SUN[1] + thunk(T - SUN_LAND, arriving(SUN[1] - SUN_HIGH, dur, 0.25), 0.2)
}

/**
 * The bridge the chorus stands on: a flown walkway behind the staircase, across the sun's lower half, so the line
 * shows whole above the stairs' profile. It flies in from the grid after the sun, with a stack of cut-outs at each end.
 */
const BRIDGE = -3.6
const BRIDGE_HIGH = -12
const BRIDGE_GO = 199.6
const BRIDGE_IN = 203.1
const BRIDGE_L = 1.1
const BRIDGE_R = 9.3
/** Where the legs file in from (a stack at each end), and where each one stops. */
const STACK_L = 1.5
const STACK_R = 8.9
const SPOTS_L = [4.8, 4.0, 3.2, 2.4]
const SPOTS_R = [5.6, 6.4, 7.2, 8.0]
const FILE_IN = [205.613, 207.877, 209.014, 209.247]

/** The bridge's walkway at `T`: flown in on its lines, easing to its trim (no hit). */
function bridgeAt(T: number): number {
  if (T < BRIDGE_GO) return BRIDGE_HIGH
  if (T >= BRIDGE_IN) return BRIDGE
  return lerp(BRIDGE_HIGH, BRIDGE, easeInOutSine((T - BRIDGE_GO) / (BRIDGE_IN - BRIDGE_GO)))
}
/** The camshaft engages on the number's pickups. */
const KICK_ON = beat(440.5)

/** A leg cut-out's place at `T`: the i-th from a stack (0 goes furthest), sliding out to its spot and stopping. */
function legAt(side: 'L' | 'R', i: number, T: number): number {
  const from = side === 'L' ? STACK_L : STACK_R
  const to = side === 'L' ? SPOTS_L[i] : SPOTS_R[i]
  const d = Math.abs(to - from)
  const dur = d / 5 + 0.15
  const end = FILE_IN[i]
  if (T < end - dur) return from
  const dir = Math.sign(to - from)
  if (T < end) return lerp(from, to, hoist((T - (end - dur)) / dur))
  return to + dir * thunk(T - end, arriving(d, dur), 0.12)
}

/** The kick: snapped up, held, and let down slowly. */
const kickShape = (s: number): number => (s < 0 ? 0 : s < 0.07 ? easeOutQuad(s / 0.07) : s < 0.19 ? 1 : 1 - easeInOutSine(clamp((s - 0.19) / 0.26)))

/** How far up the front leg is, 0..1: a kick on every off-beat from the pickups to the last beat, rippling out from the middle. */
function kickAt(T: number, place: number): number {
  const t = T - Math.abs(place - 3.5) * 0.022
  if (t < KICK_ON || t > END) return 0
  const half = NUMBER_PERIOD / 2
  const idx = Math.floor((t - NUMBER_ORIGIN) / half)
  const last = idx % 2 === 1 ? idx : idx - 1
  return kickShape(t - (NUMBER_ORIGIN + last * half))
}

const PIVOT: Pt = [0.2, -8.3]
const PIVOT_HIGH = -12.2
const ARM = 6.2
const LAMPS = [1.4, 3.0, 4.6, 6.2]
const BOOM_GO = 203.05
const BOOM_LOCK = 204.51

/** The boom: hung high in the grid pointing straight up; lowered and swung down to level over the stairs in one move, and locked. */
function boomAt(T: number): { angle: number; y: number } {
  if (T < BOOM_GO) return { angle: -Math.PI / 2, y: PIVOT_HIGH }
  const dur = BOOM_LOCK - BOOM_GO
  if (T < BOOM_LOCK) {
    const u = hoist((T - BOOM_GO) / dur, 0.35)
    return { angle: -Math.PI / 2 + (Math.PI / 2) * u, y: lerp(PIVOT_HIGH, PIVOT[1], u) }
  }
  return { angle: thunk(T - BOOM_LOCK, arriving(Math.PI / 2, dur, 0.35) / 2.2, 0.18), y: PIVOT[1] }
}

/** The two as a line down the set, without the hops: what the follow-spots track. */
function lineAt(T: number): Pt {
  if (T < GO) return [-0.5, liftAt(T)]
  if (T >= END) return [FOOT_X, 0]
  const u = (T - GO) / NUMBER_PERIOD
  const j = Math.min(STEPS, Math.floor(u))
  const f = u - j
  return [lerp(X[j], X[j + 1], f), lerp(Y[j], Y[j + 1], f)]
}

/** A tread's light: it blooms as he lands on it and stays lit; her landing after him lifts it again. */
function litAt(j: number, T: number): number {
  const his = GO + NUMBER_PERIOD * j
  const hers = his + NUMBER_PERIOD / 2
  const a = knock(T - his, 0.3) + 0.32 * smooth(T - his, 0, 0.04) + 0.45 * knock(T - hers, 0.18)
  return Math.min(1.2, a)
}

/* ------------------------------------------------------------------ Mia */

/** A hop from `a` to `b` over `T` seconds under gravity, `u` of the way. */
function flight(a: Pt, b: Pt, T: number, u: number): Pt {
  const v = clamp(u)
  const arc = (G_EARTH * T * T) / 8
  return [lerp(a[0], b[0], v), lerp(a[1], b[1], v) - arc * 4 * v * (1 - v)]
}

const MIA_X = -0.82
/** She rides the lift beside him; when the spots find them she leans to him, a tap, and back. */
function miaOnLift(T: number): Pt {
  const s = T - BOOM_LOCK
  const tap = s <= 0 ? 0 : 0.05 * easeOutQuad(clamp(s / 0.25)) * (1 - easeInOutSine(clamp((s - 0.25) / 0.9)))
  return [MIA_X + tap, liftAt(T)]
}

function miaAt(T: number): Companion {
  const half = NUMBER_PERIOD / 2
  if (T < GO + half) {
    const [x, y] = miaOnLift(T)
    return { x, y }
  }
  if (T >= END) return { x: FOOT_X - 0.32, y: 0 }
  // Her hops: to position j, landing half a beat after him; the last a short skip onto the mark beside him.
  const u = (T - GO - half) / NUMBER_PERIOD
  const j = Math.min(STEPS, Math.floor(u)) + 1
  if (j <= STEPS) {
    const from: Pt = j === 1 ? [MIA_X, TOP] : [X[j - 1], Y[j - 1]]
    const [x, y] = flight(from, [X[j], Y[j]], NUMBER_PERIOD, u - (j - 1))
    return { x, y }
  }
  const t0 = GO + NUMBER_PERIOD * STEPS + half
  const [x, y] = flight([X[STEPS], Y[STEPS]], [FOOT_X - 0.32, 0], END - t0, (T - t0) / (END - t0))
  return { x, y }
}

/* ------------------------------------------------------------------ the strikes */

const SECTION_HITS = SECTIONS.map((s) => s.lock)
const HIS = Array.from({ length: STEPS + 1 }, (_, i) => beat(445 + i))
const HERS = Array.from({ length: STEPS }, (_, i) => beat(445.5 + i))
export const NUMBER_HITS: number[] = [...SECTION_HITS, SUN_LAND, BOOM_LOCK, ...FILE_IN, LIFT_LOCK, GO, ...HIS, ...HERS].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the part */

interface NumberState {
  begin: number
}

export const number = part<NumberState>(
  {
    name: 'number',
    draw: (p, s, c) => drawNumber(p, c, c.t + s.begin, c.t < 0),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const end = slot.end - slot.begin
    const segs: Seg[] = []
    // At rest on the lift's slab while the set builds; then up with it to the top.
    segs.push({ from: [-0.5, 0], to: [-0.5, 0], dur: at(LIFT_GO) })
    segs.push(...carried((t) => [-0.5, liftAt(t + slot.begin)], at(LIFT_GO), at(GO), Math.ceil((GO - LIFT_GO) * 30)))
    // Down the staircase: a landing on every beat, the last onto the mark at the foot.
    const ways: Way[] = [{ at: at(GO), p: [X[0], Y[0]] }]
    for (let j = 1; j <= STEPS + 1; j++) ways.push(hop(ways[ways.length - 1], [X[j], Y[j]], j === STEPS + 1 ? end : at(beat(444 + j))))
    segs.push(...route(ways))
    return {
      cells: box(-2, -10, EXIT_X + 1, 1, 2),
      exit: [EXIT_X, 0],
      lane: { segs, fire: at(GO) },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: miaAt }],
    }
  },
  (slot) => shotsFor(slot),
)

function shotsFor(slot: { begin: number; end: number }): PartShot[] {
  return [
    // In on the two as the stars set them down; out to the wide as the staircase surfaces.
    { t: slot.begin, cells: 4.6, off: [0.5, -0.4] },
    { t: 193.4, cells: 5.6, off: [1.4, -0.9] },
    { t: 197.6, cells: 9.6, hold: [5.4, -3.6], w: 0.72 },
    { t: 201.3, cells: 11, hold: [6.9, -4.2], w: 0.78 },
    // Locked off: the lift carries them up through the frame.
    { t: LIFT_LOCK, cells: 11, hold: [6.9, -4.2], w: 0.78 },
    // Down the staircase: the frame pans right with the line of their descent (no bounce) and holds its height, so
    // the chorus is whole above them until it has left by the left edge; then it tilts down to the foot.
    { t: GO, cells: 9.6, hold: [5.6, -4.0], w: 0.6 },
    { t: beat(449), cells: 6.6, hold: [ahead(449, 1.4), -3.15] },
    { t: beat(470), cells: 6.6, hold: [ahead(470, 1.4), -3.15] },
    { t: beat(479), cells: 6.4, hold: [ahead(479, 1.2), -2.5] },
    { t: beat(482), cells: 6.3, hold: [ahead(482, 1.0), -2.1] },
    { t: beat(486), cells: 5.8, hold: [ahead(486, 0.9), -1.9] },
    { t: slot.end, cells: 5.0, off: [0.4, -1.2] },
  ]
}

/** Where the line of their descent is on beat `k`, `dx` ahead. */
const ahead = (k: number, dx: number): number => X[k - 444] + dx

/* ------------------------------------------------------------------ drawing */

function drawNumber(p: p5, c: Ctx, T: number, before: boolean): void {
  const { k, ink, weight } = c
  const S = (v: number) => v * k

  // Before the two arrive, the stage here is bare: the floor and the trap's seams, and nothing of the set (the
  // stars play in the space just left of here, and their frame reaches over).
  if (before) {
    drawFloor(p, c)
    return
  }

  // The sun: a painted disc on its batten, flown in; lit from its landing, and pulsing on the bars.
  const sy = sunAt(T)
  const lit = T >= SUN_LAND
  batten(p, c, SUN[0] - 2.6, SUN[0] + 2.6, sy - SUN_R - 0.18)
  outline(p, ink, weight * 0.45)
  for (const dx of [-1.1, 1.1]) p.line(S(SUN[0] + dx), S(sy - SUN_R - 0.18), S(SUN[0] + dx * 0.85), S(sy - SUN_R + 0.05))
  if (lit) {
    const bar = Math.floor((T - GO) / (NUMBER_PERIOD * 4))
    const since = T >= GO && T < END ? T - (GO + bar * NUMBER_PERIOD * 4) : T >= END ? Infinity : -1
    const rest = T >= END ? 0.08 + 0.14 * (1 - smooth(T, END, END + 1.6)) : 0.22
    const a = rest + 0.3 * knock(T - SUN_LAND, 0.35) + (since >= 0 ? 0.26 * knock(since, 0.22) : 0)
    glow(p, c, SUN[0], sy, SUN_R * 1.4, a)
  }
  solid(p, ink, weight * 0.8, PAINT.gold)
  p.circle(S(SUN[0]), S(sy), S(SUN_R * 2))
  // Painted: a paler round laid in high and off centre, two brushed rings, and a faint rim inside the edge.
  p.noStroke()
  p.fill(alpha(p, PAINT.cream, 0.14))
  p.circle(S(SUN[0] - 0.35), S(sy - 0.4), S(SUN_R * 1.3))
  p.noFill()
  p.stroke(alpha(p, PAINT.cream, 0.13))
  p.strokeWeight(S(0.07))
  p.circle(S(SUN[0] - 0.1), S(sy - 0.12), S(SUN_R * 1.5))
  p.strokeWeight(S(0.05))
  p.circle(S(SUN[0] + 0.05), S(sy + 0.06), S(SUN_R * 1.02))
  p.stroke(alpha(p, PAINT.red, 0.12))
  p.strokeWeight(S(0.09))
  p.circle(S(SUN[0]), S(sy), S(SUN_R * 1.86))

  // The bridge behind the stairs, flown in across the sun, and the chorus line on it.
  const by = bridgeAt(T)
  batten(p, c, BRIDGE_L, BRIDGE_R, by)
  for (let i = 3; i >= 0; i--) {
    drawLegs(p, c, legAt('L', i, T), by, kickAt(T, 3 - i))
    drawLegs(p, c, legAt('R', i, T), by, kickAt(T, 4 + i))
  }

  drawFloor(p, c)

  // The staircase: a column for every tread, up out of the floor; the treads in ink; the lit ones gold.
  p.noStroke()
  p.fill(PAINT.deep)
  const tops: number[] = [liftAt(T)]
  for (let j = 1; j <= STEPS; j++) tops.push(treadAt(j, T))
  p.rect(S((LIFT_L + LIFT_R) / 2), S((tops[0] + FLOOR + FLOOR + 0.04) / 2), S(LIFT_R - LIFT_L), S(FLOOR + 0.04 - tops[0] - FLOOR))
  for (let j = 1; j <= STEPS; j++) {
    const top = tops[j] + FLOOR
    if (top >= FLOOR - 0.005) continue
    p.rect(S(X[j]), S((top + FLOOR + 0.04) / 2), S(TREAD + 0.01), S(FLOOR + 0.04 - top))
  }
  // The lit treads: the riser's face and a pool of light on the tread.
  for (let j = 0; j <= STEPS; j++) {
    const a = litAt(j, T)
    if (a <= 0.01) continue
    const top = tops[j] + FLOOR
    const x0 = j === 0 ? LIFT_L : X[j] - TREAD / 2
    const x1 = j === 0 ? LIFT_R : X[j] + TREAD / 2
    p.noStroke()
    p.fill(alpha(p, PAINT.gold, Math.min(1, a * 0.85)))
    p.rect(S((x0 + x1) / 2), S(top + RISE / 2), S(x1 - x0), S(RISE))
    glow(p, c, (x0 + x1) / 2, top, j === 0 ? 0.8 : 0.42, Math.min(0.7, a * 0.5))
  }
  // Treads and risers.
  outline(p, ink, weight * 0.6)
  p.line(S(LIFT_L), S(tops[0] + FLOOR), S(LIFT_R), S(tops[0] + FLOOR))
  for (let j = 1; j <= STEPS; j++) {
    const top = tops[j] + FLOOR
    const prev = tops[j - 1] + FLOOR
    const x0 = X[j] - TREAD / 2
    p.line(S(x0), S(top), S(X[j] + TREAD / 2), S(top))
    if (Math.abs(top - prev) > 0.004) p.line(S(x0), S(Math.min(top, FLOOR)), S(x0), S(Math.min(prev, FLOOR)))
  }
  // The lift's ram, showing under the slab once it is up.
  if (tops[0] < -0.02) {
    outline(p, ink, weight * 0.5)
    p.line(S(LIFT_L + 0.02), S(tops[0] + FLOOR), S(LIFT_L + 0.02), S(FLOOR))
  }
  // The mark at the foot, where the number ends: a painted round on the boards, lit on the last beat.
  const mark = FOOT_X - 0.16
  solid(p, ink, weight * 0.5, PAINT.violet)
  p.ellipse(S(mark), S(FLOOR), S(1.05), S(0.13))
  if (T >= END - 0.05) {
    const a = 0.5 * knock(T - END, 0.4) + 0.3 * smooth(T, END, END + 0.05) * (1 - 0.6 * smooth(T, END + 1.5, END + 4))
    glow(p, c, mark, FLOOR - 0.05, 1.1, a)
  }

  // The boom: hung from the grid at its pivot, the arm with four lamps; the beams once it has struck.
  const { angle: th, y: py } = boomAt(T)
  const on = T >= BOOM_LOCK
  outline(p, ink, weight * 0.45)
  p.line(S(PIVOT[0]), S(py), S(PIVOT[0]), S(py - 70))
  p.push()
  p.translate(S(PIVOT[0]), S(py))
  p.rotate(th)
  solid(p, ink, weight * 0.7, PAINT.timber)
  p.rect(S(ARM / 2), 0, S(ARM), S(0.12))
  for (const d of LAMPS) {
    p.rect(S(d), S(0.17), S(0.26), S(0.2), S(0.02))
  }
  solid(p, ink, weight * 0.7, PAINT.timber)
  p.circle(0, 0, S(0.16))
  p.pop()
  if (on) {
    const fade = T >= END ? 1 - 0.85 * smooth(T, END, END + 1.4) : 1
    const flash = 1 + 1.3 * knock(T - BOOM_LOCK, 0.25)
    // Four follow-spots on the two, each a hair to its own side of them, a little behind the beat.
    const line = lineAt(T - 0.12)
    for (let i = 0; i < LAMPS.length; i++) {
      const d = LAMPS[i]
      const lx = PIVOT[0] + Math.cos(th) * d - Math.sin(th) * 0.27
      const ly = py + Math.sin(th) * d + Math.cos(th) * 0.27
      const target: Pt = [line[0] + (i - 1.5) * 0.16, line[1] - 0.05]
      beam(p, c, [lx, ly], target, 1.1, 0.085 * flash * fade)
      glow(p, c, lx, ly, 0.34, 0.6 * flash * fade, PAINT.beam)
    }
  }
}

/** The stage floor, and the seams of the trap the lift sits in. */
function drawFloor(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const S = (v: number) => v * k
  outline(p, ink, weight * 0.8)
  p.line(S(LIFT_L - 0.6), S(FLOOR), S(EXIT_X + 0.6), S(FLOOR))
  outline(p, ink, weight * 0.5)
  for (const x of [LIFT_L, LIFT_R]) p.line(S(x), S(FLOOR), S(x), S(FLOOR + 0.09))
}

/**
 * A chorus cut-out standing on the bridge (its walkway at `by`) at `x`: a shallow bell of a skirt, a standing leg,
 * and the kicking one, `kick` of the way up: the knee bends through the swing and the leg is straight at the top,
 * the toe pointed. Heeled shoes.
 */
function drawLegs(p: p5, c: Ctx, x: number, by: number, kick: number): void {
  const { k, ink, weight } = c
  const S = (v: number) => v * k
  const THIGH = 0.5
  const SHIN = 0.47
  const hip = by - 0.03 - THIGH - SHIN
  const waist = hip - 0.12
  const hem = hip + 0.24
  // The standing leg: straight, the knee a hair forward.
  p.stroke(PAINT.cream)
  p.strokeWeight(S(0.1))
  p.line(S(x + 0.07), S(hip), S(x + 0.1), S(hip + THIGH))
  p.line(S(x + 0.1), S(hip + THIGH), S(x + 0.07), S(by - 0.03))
  // The kicking leg: the thigh swings up from the hip; the shin lags it and straightens at the top.
  const a = kick * 1.5
  const bend = 0.55 * Math.sin(Math.PI * kick)
  const kx = x - 0.07 + Math.sin(a) * THIGH
  const ky = hip + Math.cos(a) * THIGH
  const b = a - bend
  const fx = kx + Math.sin(b) * SHIN
  const fy = ky + Math.cos(b) * SHIN
  p.line(S(x - 0.07), S(hip), S(kx), S(ky))
  p.line(S(kx), S(ky), S(fx), S(fy))
  // Shoes: a pointed toe forward, a heel under the back.
  p.noStroke()
  p.fill(ink)
  shoe(p, k, x + 0.07, by - 0.03, 0)
  shoe(p, k, fx, fy, b)
  // The skirt over the tops of the legs: wider than it is long, its hem a shallow scallop.
  solid(p, ink, weight * 0.55, PAINT.pink)
  p.beginShape()
  p.vertex(S(x - 0.14), S(waist))
  p.vertex(S(x + 0.14), S(waist))
  p.vertex(S(x + 0.37), S(hem - 0.02))
  p.vertex(S(x + 0.18), S(hem + 0.03))
  p.vertex(S(x), S(hem))
  p.vertex(S(x - 0.18), S(hem + 0.03))
  p.vertex(S(x - 0.37), S(hem - 0.02))
  p.endShape(p.CLOSE)
}

/** A dancer's shoe at the ankle (x, y), the foot turned by `a` from straight down: a pointed toe and a heel. */
function shoe(p: p5, k: number, x: number, y: number, a: number): void {
  const S = (v: number) => v * k
  p.push()
  p.translate(S(x), S(y))
  p.rotate(a)
  p.ellipse(S(0.05), S(-0.01), S(0.2), S(0.065))
  p.rect(S(-0.035), S(0.035), S(0.03), S(0.07))
  p.pop()
}
