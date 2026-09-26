import type p5 from 'p5'
import { R, mixHex, type Pt, type Seg } from '../../../../../parts'
import { drawStick } from '../drums'
import { alpha, box, carried, part, route, type Ctx, type PartShot, type Slot, type Way } from '../kit'
import { level } from '../music'
import { G_EARTH } from '../physics'
import type { KitStroke } from '../stub'
import { HALL, KIT } from '../worlds'
import { ACCENTS, BIG, BOUNCE, FIRST, FOLD, GO, HOP, HOP_MAX, LAND, LAST, LATCH, SHIFT, SLAM, STOMPS, UNWIND, hopHeight, sunk } from './fast-clock'
import { BALL_X, LEVER, POST_X, drawEngine, leverTop } from './fast-engine'
import { ARCH, CLOSE, FLOOR, JIM_WINGS, KIT_AT, RISERS } from './stage'

/**
 * Carnegie Hall, the build (369.98 → 423.34): from the hush to the loudest and fastest playing of the solo, and
 * back down to the soft ride.
 *
 * He lands on the snare. Beside it an engine rises out of the stage: a flywheel on a cast-iron frame, a post, and
 * a lever out under the hi-hat. He plays the snare twice while it rises (the second the build's loudest stroke),
 * glances at it, rolls across onto the lever and stomps it: the first kick, and the flywheel starts to turn, a turn
 * a stomp. The head swings round off the post over the snare and drops onto its seat: one stick, thrown by its cam,
 * strikes with every stomp, and the stomps come faster and the wheel spins up. On the roll (383) the second stick
 * drops in and the camshaft runs at the roll's own pace, a stroke every 70 ms: the sticks a blur over the head, the
 * wheel a dark disc, and him stomping every kick, every 150 ms. Near the end the sticks let go and the head folds
 * back to its post; on his last stomp he rolls home across the lever onto the snare and settles there as the ride
 * begins (no strike). The engine sinks back into the stage.
 *
 * It grows in three stages on the music's phrases. The engine alone: low and close on the kick (the treadle, the
 * belt, the flywheel spinning up) into the roll (383), then up the post to the sticks as the roll runs away. Fletcher
 * gives in (388.2): a two-shot, the engine and his hand coming up to beat with the stomps. On the build's biggest
 * kick (394.62) a second stage: the post telescopes up, a second head swings round off it over the rack tom and
 * seats, and from then its two sticks double the roll's accents on the tom. Across the stage to his father in the
 * wings for the loudest phrase's arrival (396.7), the stage's light lifted on him (`hall.ts` `jimLit`); back to the whole
 * grown machine and Fletcher conducting it with his whole arm. Then in on the peak (404-405), and out to the whole
 * hall in its pool of light, the light up with the music and the band watching from the dark, held; then a hard push
 * in onto the sticks' blur (414.5), and up to him on the treadle with Fletcher's beating hand at the edge of the
 * frame, until the unwind (421.72), when both heads fold away.
 *
 * The clock is `fast-clock.ts`, the drawing `fast-engine.ts` (the rack head and the light are drawn here). The frame
 * is Carnegie's (`stage.ts`).
 */

/* ------------------------------------------------------------------ the second stage: the rack head's clock */

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
const ease = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/** The post's inner tube telescopes up out of its cap, carrying the rack head folded edge-on. */
const TUBE_UP: [number, number] = [393.2, 394.0]
/** The head swings round over the rack tom at its raised height, then drops onto its seat on the build's biggest kick. */
const SWING2: [number, number] = [393.75, 394.33]
const SEAT = 394.617
/** At the unwind it lifts, swings back edge-on, and the tube goes down into the post, before the engine sinks. */
const LIFT2: [number, number] = [UNWIND, UNWIND + 0.26]
const FOLD2: [number, number] = [UNWIND + 0.18, UNWIND + 0.78]
const TUBE_DOWN: [number, number] = [UNWIND + 0.66, UNWIND + 1.36]
const TUBE = 0.24
const RAISED2 = 0.28

/** The rack head's strokes: the roll's accents from the first after it seats, alternate sticks, doubling the snare's. */
const RACK: readonly { t: number; s: number; left: boolean }[] = ACCENTS.filter((a) => a.t > SEAT + 1 && a.t < UNWIND).map((a, i) => ({ ...a, left: i % 2 === 0 }))

/** How far the tube is up out of the post at `t`, cells. */
const tubeAt = (t: number): number => TUBE * (ease((t - TUBE_UP[0]) / (TUBE_UP[1] - TUBE_UP[0])) - ease((t - TUBE_DOWN[0]) / (TUBE_DOWN[1] - TUBE_DOWN[0])))

/** The rack head's pose: `yaw` 1 edge-on at its post, 0 swung round over the tom; `lift` over its seat, cells. */
function rackHead(t: number): { yaw: number; lift: number } {
  if (t < UNWIND) {
    const yaw = 1 - ease((t - SWING2[0]) / (SWING2[1] - SWING2[0]))
    let lift = RAISED2
    if (t >= SWING2[1]) {
      // Dropped onto its seat, slow off the top, arriving on the kick; a hair of rock on the seat, damped.
      const u = clamp01((t - SWING2[1]) / (SEAT - SWING2[1]))
      lift = RAISED2 * (1 - u * u)
      if (t > SEAT) lift = -0.012 * Math.exp(-(t - SEAT) / 0.05) * Math.sin((t - SEAT) * 40)
    }
    return { yaw, lift }
  }
  return { yaw: ease((t - FOLD2[0]) / (FOLD2[1] - FOLD2[0])), lift: RAISED2 * ease((t - LIFT2[0]) / (LIFT2[1] - LIFT2[0])) }
}

/** How high a rack stick's tip rests over the tom's head between strokes, and how long a stroke's wind-up is. */
const REST2 = 0.07
const WIND = 0.26
/** A rack stick's tip over the head at `t` (0 is a stroke), and how far round its cam is (turns, one a stroke). */
function rackStick(t: number, left: boolean): { h: number; turn: number } {
  const mine = RACK.filter((r) => r.left === left)
  let i = mine.findIndex((r) => r.t >= t)
  if (i < 0) i = mine.length
  const prev = i > 0 ? mine[i - 1].t : -Infinity
  // After a stroke it rises back off the head to its rest, damped (a hit is sharp; the recovery long).
  const recover = (x: number): number => (x === Infinity ? REST2 : REST2 * (1 - Math.exp(-x / 0.07)))
  if (i < mine.length) {
    const next = mine[i]
    const w = Math.min(WIND, (next.t - prev) * 0.7)
    const a = next.t - w
    if (t >= a) {
      // The wind-up: the cam lifts it to the top of its throw, and lets it go: it falls, fastest onto the head.
      const u = (t - a) / w
      const top = 0.22 + 0.09 * Math.min(1.4, next.s)
      const from = recover(a - prev)
      const h = u < 0.55 ? from + (top - from) * ease(u / 0.55) : top * (1 - Math.pow((u - 0.55) / 0.45, 2))
      return { h, turn: i + u }
    }
  }
  return { h: recover(t - prev), turn: i }
}

/* ------------------------------------------------------------------ the strikes */

const strokes: KitStroke[] = [
  // The landing from the hush, and his two strokes on the snare while the engine rises.
  { t: LAND, piece: 'snare' },
  { t: BOUNCE, piece: 'snare' },
  { t: SLAM, piece: 'snare' },
]
// Every stomp is a kick.
for (const s of STOMPS) strokes.push({ t: s, piece: 'kick' })
// From the latch to the roll, the one stick strikes the snare with every stomp.
for (const s of STOMPS) if (s >= LATCH - 1e-6 && s <= SHIFT + 1e-6) strokes.push({ t: s, piece: 'snare' })
// In the roll the sticks are a blur; the head answers the roll's accents, a stick landing on each.
for (const a of ACCENTS) strokes.push({ t: a.t, piece: 'snare' })
// From the second stage on, the rack head doubles the accents on the tom (the same measured strokes).
for (const r of RACK) strokes.push({ t: r.t, piece: 'rack' })
strokes.sort((a, b) => a.t - b.t)

export const FAST_KIT: KitStroke[] = strokes
/** Every strike: the kit's, and the head knocking home against its post as it folds away (the fill's accent). */
export const FAST_HITS: number[] = [...new Set([...strokes.map((s) => s.t), FOLD[1]])].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the lane */

interface FastState {
  begin: number
}

/** Where he stands on the lever at show time `T` (it dips under him on a stomp). */
const onLever = (x: number, T: number): Pt => {
  if (x <= LEVER.x0 - 0.02) return [x, 0]
  const top = leverTop(x, T)
  return [x, top[1] - R]
}

function build(slot: Slot) {
  const B = slot.begin
  const span = slot.end - slot.begin
  const at = (T: number): number => T - B
  const snare: Pt = [...KIT_AT]
  const segs: Seg[] = []
  let cur: Way = { at: 0, p: snare }
  const go = (w: Way): void => {
    segs.push(...route([cur, w]))
    cur = w
  }
  const ride = (fn: (t: number) => Pt, t1: number, n: number): void => {
    segs.push(...carried(fn, cur.at, t1, n))
    cur = { at: t1, p: fn(t1) }
  }
  const flight = (T: number, g = G_EARTH): number => (g * T * T) / 8

  // On the snare: a stroke in place, a glance toward the engine as it rises, the slam.
  go({ at: at(BOUNCE), p: snare, arc: flight(BOUNCE - LAND) })
  go({ at: at(370.86), p: snare })
  go({ at: at(371.04), p: [snare[0] + 0.07, 0], ease: 'inout' })
  go({ at: at(371.23), p: snare, ease: 'inout' })
  go({ at: at(SLAM), p: snare, arc: flight(SLAM - 371.23) })
  // Across to the lever, and up onto it: the first stomp.
  go({ at: at(GO), p: snare })
  go({ at: at(HOP), p: [BALL_X - 0.17, 0], ease: 'inout' })
  go({ at: at(FIRST), p: onLever(BALL_X, FIRST), arc: hopHeight(FIRST - HOP) })
  // Every stomp a hop landing on the lever; a long gap is a rest riding the lever, then a hop.
  for (let i = 1; i < STOMPS.length; i++) {
    const a = STOMPS[i - 1]
    const b = STOMPS[i]
    const gap = b - a
    if (gap > HOP_MAX + 0.02) {
      ride((t) => onLever(BALL_X, B + t), at(b - HOP_MAX), Math.max(2, Math.ceil((gap - HOP_MAX) / 0.02)))
      go({ at: at(b), p: onLever(BALL_X, b), arc: hopHeight(HOP_MAX) })
    } else {
      go({ at: at(b), p: onLever(BALL_X, b), arc: hopHeight(gap) })
    }
  }
  // Home: from the last stomp he rolls back along the lever onto the snare and comes to rest in its middle.
  const t0 = at(LAST)
  const t1 = span
  const home = (t: number): Pt => {
    const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)))
    const e = u * u * (3 - 2 * u)
    const x = BALL_X + (snare[0] - BALL_X) * e
    return x > LEVER.x0 ? onLever(x, B + t) : [x, 0]
  }
  segs.push(...carried(home, t0, t1, 90))
  // The last piece ends exactly on the snare.
  segs[segs.length - 1] = { ...segs[segs.length - 1], to: snare }

  return {
    cells: box(-2.5, -3, 3, 3),
    exit: [0, 0] as Pt,
    lane: { segs, fire: at(BOUNCE) },
    state: { begin: slot.begin },
  }
}

/* ------------------------------------------------------------------ the camera */

/** The whole hall, held: the machine small in its pool, the band on its risers, Fletcher on his podium. */
const WIDE_IN = 409.3
const WIDE_OUT = 412.55
/** The push in lands on the phrase's loudest stroke (snare and cymbal together). */
const PUSHED = 414.534
/** Low on the kick through the spin-up; up to the sticks as the roll runs away; out to Fletcher as he gives in. */
const KICK_LOW = 381.0
const ROLL_UP = 386.8
const TWO_SHOT = 389.1
/** His father in the wings, on the arrival of the build's loudest phrase (396.70), for one phrase. */
const JIM_IN = 396.7
const JIM_OUT = 398.9

function shots(slot: Slot): PartShot[] {
  const close = { cells: CLOSE.cells, hold: CLOSE.hold, w: 1 }
  return [
    { t: slot.begin, ...close },
    // Over to the engine as it rises and he goes across to it.
    { t: 371.5, cells: 4.5, hold: [0.1, 0.35], w: 1 },
    // Close on the head as the first stick comes down; across to him on the biggest stomp of the spin-up; back to
    // the whole engine as it gathers speed.
    { t: LATCH, cells: 3.3, hold: [-0.2, -0.05], w: 1 },
    { t: BIG, cells: 3.3, hold: [0.75, 0.2], w: 1 },
    // The kick: down low and close on what his stomps drive, the treadle, the pushrod, the belt and the flywheel
    // spinning up to a dark disc, him coming down into the top of the frame on every stomp.
    { t: KICK_LOW, cells: 2.7, hold: [1.05, 0.9], w: 1 },
    { t: SHIFT, cells: 2.65, hold: [1.12, 0.93], w: 1 },
    { t: 385.5, cells: 2.6, hold: [1.19, 0.96], w: 1 },
    // Tilt up the post to the sticks as the roll runs away (a stroke every 70 ms).
    { t: ROLL_UP, cells: 3.1, hold: [-0.25, 0.05], w: 1 },
    // He gives in: out and across to a two-shot, the engine on the left, Fletcher on the right, his hand coming up
    // to beat with the stomps.
    { t: TWO_SHOT, cells: 6.5, hold: [2.05, -0.45], w: 1 },
    { t: 391.0, cells: 6.3, hold: [1.95, -0.5], w: 1 },
    // The second stage: in to the post as it grows and the rack head swings round and seats on the biggest kick.
    { t: TUBE_UP[0] + 0.1, cells: 4.1, hold: [-0.45, -0.6], w: 1 },
    { t: SEAT, cells: 4.4, hold: [-0.6, -0.8], w: 1 },
    // Across the dark stage to his father in the wings, watching, for the loudest phrase's arrival: by the stage
    // door his son walked out to, in the stage's spill; a slow push in on him; and back.
    { t: JIM_IN, cells: 3.6, hold: [JIM_WINGS[0] - 0.6, JIM_WINGS[1] - 0.87], w: 1 },
    { t: JIM_OUT, cells: 3.15, hold: [JIM_WINGS[0] - 0.35, JIM_WINGS[1] - 0.72], w: 1 },
    // The whole grown machine, both heads going, and Fletcher conducting it with his whole arm now.
    { t: 401.3, cells: 7.2, hold: [1.7, -1.25], w: 1 },
    { t: 402.7, cells: 6.9, hold: [1.55, -1.15], w: 1 },
    // In on the peak: both heads.
    { t: 404.265, cells: 3.5, hold: [-0.8, -0.45], w: 1 },
    { t: 405.461, cells: 3.4, hold: [-0.7, -0.4], w: 1 },
    // The third stage: out to the whole hall, held; then a hard push in onto the sticks' blur, held there; then up
    // to him on the treadle, Fletcher's beating hand coming into the right edge of the frame.
    { t: WIDE_IN, cells: 13.6, hold: [3.2, -2.2], w: 1 },
    { t: WIDE_OUT, cells: 14.4, hold: [3.5, -2.45], w: 1 },
    { t: PUSHED, cells: 2.8, hold: [-0.45, -0.25], w: 1 },
    { t: 416.665, cells: 2.65, hold: [-0.35, -0.3], w: 1 },
    { t: 419.9, cells: 3.4, hold: [1.45, -0.7], w: 1 },
    { t: LAST, cells: 4.2, hold: [-0.3, -0.25], w: 1 },
    { t: slot.end, ...close },
  ]
}

/* ------------------------------------------------------------------ the rack head (the second stage) */

const IRON = mixHex(HALL.black, KIT.shade, 0.55)
const IRON_LIT = mixHex(KIT.shade, KIT.chrome, 0.18)
/** The post's cap, the tube's foot. */
const CAP = -1.35
/** The rack head's arm, when its tube is all the way up: off the post, out over the rack tom. */
const ARM2_Y = CAP - TUBE + 0.08
const ARM2_END = -1.2
/** Its two sticks, hinged under the arm, parallel to the snare's, tips just over the rack tom's head when struck. */
const HINGE2_Y = ARM2_Y + 0.1
const TIP2_Y = KIT_AT[1] - 0.66 - 0.055
const STICK2 = {
  left: { f: [-1.05, HINGE2_Y] as Pt, tip: [-1.63, TIP2_Y] as Pt },
  right: { f: [-0.72, HINGE2_Y] as Pt, tip: [-1.3, TIP2_Y] as Pt },
}
const STICK2_LEN = Math.hypot(STICK2.right.tip[0] - STICK2.right.f[0], STICK2.right.tip[1] - STICK2.right.f[1])
const TAIL2 = 0.1
const DIR2: Pt = [(STICK2.right.tip[0] - STICK2.right.f[0]) / STICK2_LEN, (STICK2.right.tip[1] - STICK2.right.f[1]) / STICK2_LEN]

function withAlpha(p: p5, a: number, fn: () => void): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const was = ctx.globalAlpha
  ctx.globalAlpha = was * clamp01(a)
  fn()
  ctx.globalAlpha = was
}

/** A stick from its butt to its tip, in cells: the kit's own (`drums.ts` `drawStick`), hickory with its bead. */
function stick(p: p5, c: Ctx, butt: Pt, tip: Pt): void {
  drawStick(p, c, butt, Math.atan2(tip[1] - butt[1], tip[0] - butt[0]), Math.hypot(tip[0] - butt[0], tip[1] - butt[1]))
}

/** A rack stick's butt and tip with its tip `h` over the head, turned about its hinge. */
function pose2(which: 'left' | 'right', h: number): { butt: Pt; tip: Pt } {
  const s = STICK2[which]
  const sin = Math.max(-0.2, Math.min(1, (s.tip[1] - s.f[1] - h) / STICK2_LEN))
  const th = Math.PI - Math.asin(sin)
  return {
    tip: [s.f[0] + Math.cos(th) * STICK2_LEN, s.f[1] + Math.sin(th) * STICK2_LEN],
    butt: [s.f[0] - Math.cos(th) * TAIL2, s.f[1] - Math.sin(th) * TAIL2],
  }
}

/**
 * The second stage, in the Carnegie frame: the inner tube up out of the post's cap, and on it the rack head, the
 * snare head's twin: a short arm out over the rack tom, two sticks hinged under it, a cam over each tail.
 */
function drawRack(p: p5, c: Ctx, T: number): void {
  const up = tubeAt(T)
  if (up < 0.004) return
  const { k, weight } = c
  // Its edges in the iron's own dark, never the cream ink (as the engine's).
  const ink = mixHex(HALL.black, KIT.shade, 0.22)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const { yaw, lift } = rackHead(T)
  // All of it rides the tube: `drop` is how far below its full height it still is.
  const drop = TUBE - up
  const cy = Math.cos((yaw * Math.PI) / 2)
  const X = (x: number): number => (POST_X + (x - POST_X) * cy) * k
  const Y = (y: number): number => (y + drop - lift) * k
  const P = (q: Pt): Pt => [X(q[0]) / k, Y(q[1]) / k]
  p.push()
  p.rectMode(p.CORNER)
  p.ellipseMode(p.CENTER)
  ctx.save()
  // It comes up out of the post's cap: nothing of it below the cap's top.
  ctx.beginPath()
  ctx.rect(-40 * k, -40 * k, 80 * k, (40 + CAP) * k)
  ctx.clip()
  p.translate(0, sunk(T) * k)
  // The tube: nickel, narrower than the post, a collar at its top under the arm.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(mixHex(KIT.chrome, IRON, 0.35))
  p.rect((POST_X - 0.03) * k, Y(ARM2_Y - 0.02), 0.06 * k, (CAP - ARM2_Y + 0.05 - drop) * k)
  p.fill(IRON)
  p.rect((POST_X - 0.06) * k, Y(ARM2_Y - 0.075), 0.12 * k, 0.07 * k, 0.02 * k)
  if (yaw >= 0.999) {
    // Folded, the arm is a short block edge-on on the tube, and comes up out of the cap with it.
    p.rect((POST_X - 0.08) * k, Y(ARM2_Y - 0.045), 0.16 * k, 0.09 * k, 0.025 * k)
    ctx.restore()
    p.pop()
    return
  }
  ctx.restore()
  p.translate(0, sunk(T) * k)
  // The sticks first, their tails up behind the arm; a smear of where they were when they fall fast. Edge-on they
  // hang along the post.
  for (const which of ['left', 'right'] as const) {
    const now = rackStick(T, which === 'left')
    const was = rackStick(T - 1 / 45, which === 'left')
    const n = Math.abs(now.h - was.h) * 45 > 2.2 ? 4 : 1
    for (let j = n - 1; j >= 0; j--) {
      const h = j === 0 ? now.h : rackStick(T - j / (n - 1) / 45, which === 'left').h
      const q = pose2(which, h)
      withAlpha(p, n === 1 ? 1 : j === 0 ? 0.7 : 0.4 / n, () => stick(p, c, P(q.butt), P(q.tip)))
    }
  }
  // The arm: the snare head's twin, iron with a gilt line (edge-on, a short block on the tube).
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  const x0 = Math.min(X(POST_X + 0.06), X(ARM2_END))
  const x1 = Math.max(X(POST_X + 0.06), X(ARM2_END))
  p.rect(x0 - 0.02 * k, Y(ARM2_Y - 0.045), x1 - x0 + 0.04 * k, 0.09 * k, 0.025 * k)
  if (x1 - x0 > 0.1 * k) {
    p.stroke(alpha(p, HALL.gilt, 0.7))
    p.strokeWeight(weight * 0.45)
    p.line(x0 + 0.03 * k, Y(ARM2_Y - 0.028), x1 - 0.03 * k, Y(ARM2_Y - 0.028))
  }
  // A cam over each tail, a turn a stroke: its lobe comes round, presses the tail down, and lets it go.
  for (const which of ['left', 'right'] as const) {
    const f = STICK2[which].f
    const at = P([f[0] - DIR2[0] * TAIL2, ARM2_Y])
    const u = rackStick(T, which === 'left').turn
    const rot = Math.PI / 2 + (u - Math.floor(u) - 0.5) * Math.PI * 2
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.fill(IRON_LIT)
    p.beginShape()
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2 - Math.PI
      const rr = 0.04 + 0.045 * Math.pow(Math.max(0, Math.cos(t)), 2.2)
      p.vertex((at[0] + Math.cos(t + rot) * rr * Math.max(0.15, cy)) * k, (at[1] + Math.sin(t + rot) * rr) * k)
    }
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(KIT.chrome)
    p.circle(at[0] * k, at[1] * k, 0.022 * k)
    // The lug under the arm at the hinge, and its pin.
    p.stroke(ink)
    p.strokeWeight(weight * 0.6)
    p.fill(IRON)
    p.beginShape()
    p.vertex(X(f[0] - 0.04), Y(ARM2_Y + 0.04))
    p.vertex(X(f[0] + 0.04), Y(ARM2_Y + 0.04))
    p.vertex(X(f[0] + 0.028), Y(f[1] + 0.03))
    p.vertex(X(f[0] - 0.028), Y(f[1] + 0.03))
    p.endShape(p.CLOSE)
    const pin = P(f)
    p.fill(KIT.chrome)
    p.circle(pin[0] * k, pin[1] * k, 0.04 * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the light: up with the music for the wide */

/** How much the stage's light is up for the third stage: in as the camera goes out, down through the unwind. */
const swellOn = (T: number): number => ease((T - 405.6) / 3.4) * (1 - ease((T - 419.6) / 3.6))
/** The music's loudness, averaged over a second, so the light breathes with it and never flickers. */
const breath = (T: number): number => {
  let s = 0
  for (let i = -4; i <= 4; i++) s += level(T + i * 0.12)
  return s / 9
}

/**
 * The stage's light up with the music, laid over the hall (additive, as the hall's own is): the pool on the kit
 * wider and brighter, a warm wash down the whole stage, and a little on the risers, so the band is seen watching.
 */
function drawSwell(p: p5, c: Ctx, T: number): void {
  const on = swellOn(T)
  if (on < 0.002) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const a = on * (0.35 + 0.65 * clamp01((breath(T) - 0.6) / 0.35))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // The wash, from the flies down to the floor.
  const top = ARCH.top + 2
  const g = ctx.createLinearGradient(0, top * k, 0, FLOOR * k)
  g.addColorStop(0, 'rgba(227, 176, 91, 0)')
  g.addColorStop(1, `rgba(227, 176, 91, ${(0.07 * a).toFixed(3)})`)
  ctx.fillStyle = g
  ctx.fillRect(ARCH.x0 * k, top * k, (ARCH.x1 - ARCH.x0) * k, (FLOOR - top) * k)
  // The pool on the kit and the machine, wider.
  const cx = (KIT_AT[0] + 0.2) * k
  const cy = (KIT_AT[1] + 0.3) * k
  const r = 6.2 * k
  const q = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  q.addColorStop(0, `rgba(255, 241, 207, ${(0.13 * a).toFixed(3)})`)
  q.addColorStop(0.5, `rgba(255, 241, 207, ${(0.05 * a).toFixed(3)})`)
  q.addColorStop(1, 'rgba(255, 241, 207, 0)')
  ctx.fillStyle = q
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  // The risers: a low soft spill over the band's front rows, wide and flat, fading to nothing all round.
  const bx = RISERS[0].x0 + 3.2
  const by = FLOOR - 1.6
  const br = 6.5 * k
  ctx.save()
  ctx.translate(bx * k, by * k)
  ctx.scale(1, 0.42)
  const b = ctx.createRadialGradient(0, 0, 0, 0, 0, br)
  b.addColorStop(0, `rgba(227, 176, 91, ${(0.07 * a).toFixed(3)})`)
  b.addColorStop(0.6, `rgba(227, 176, 91, ${(0.025 * a).toFixed(3)})`)
  b.addColorStop(1, 'rgba(227, 176, 91, 0)')
  ctx.fillStyle = b
  ctx.fillRect(-br, -br, 2 * br, 2 * br)
  ctx.restore()
  ctx.restore()
}

export const fast = part<FastState>(
  {
    name: 'fast',
    draw: (p, s, c) => {
      const T = s.begin + c.t
      drawEngine(p, c, T)
      drawRack(p, c, T)
      drawSwell(p, c, T)
    },
  },
  build,
  shots,
)
