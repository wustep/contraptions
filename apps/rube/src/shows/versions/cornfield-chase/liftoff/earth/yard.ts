import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad } from '../../../../../../../../src/core/ease'
import { FLOOR, R, type Pt } from '../../../../../parts'
import { alpha, box, carried, hash, knock, lastOf, part, route, smooth, type Ctx, type Way } from '../kit'
import { hop } from '../physics'
import { DUST } from '../worlds'

/**
 * The yard, between the porch and the corn: three machines the farm has
 * made of what it had, and its hand pump, played on the piano's notes.
 *
 * A plank on a sawhorse: the ball rolls up the low end, and as it crosses the
 * middle the plank goes over (21.01) and comes down on the far side with a
 * thump (21.28). Off its end into the tin bucket at the foot of the windmill.
 * The windmill winds a hoist: a ratchet at the head of the tower takes up the
 * rope a tooth a note, and the bucket goes up in steps. At the top it knocks
 * a trip bar and tips, and the ball drops into the clothes basket on the line,
 * on the loudest note of the piano (24.09). The basket runs down the line on
 * its wheel, knocking the pegs off as it goes, fetches up against the pole,
 * and throws the ball out onto the end of the hand pump's handle by the corn
 * (25.57). Its weight works the pump: the handle goes down to its stop
 * (25.79), a rope of water comes out of the spout into the head of the
 * irrigation channel, and the handle springs back and lobs the ball up over
 * the pump into the channel with a splash (26.65).
 *
 * The part's frame: the ball comes in rolling on the yard (y = 0), the ground
 * at FLOOR; it leaves the same way.
 */

// The notes it plays, as measured.
const FOOT = 20.544
const OVER = 21.014
const THUMP = 21.275
const IN_BUCKET = 21.821
const TEETH = [22.036, 22.251, 22.657, 23.104, 23.522]
const TRIP = 23.899
const CATCH = 24.091
const PEGS = [24.305, 24.625, 24.869]
const POLE = 25.159
const LAND = 25.571
const BOTTOM = 25.786
const SPLASH = 26.645
export const YARD_HITS = [FOOT, OVER, THUMP, IN_BUCKET, ...TEETH, TRIP, CATCH, ...PEGS, POLE, LAND, BOTTOM, SPLASH]
/** Show time the yard hands the ball on: in the water at the head of the irrigation channel. */
export const YARD_END = SPLASH

// The plank on its sawhorse.
const PIVOT: Pt = [0.87, FLOOR - 0.22]
const HALF = 0.8
const TILT = 0.28
const THICK = 0.06
// The windmill, its hoist and the bucket.
const TOWER = 2.9
const TOWER_TOP = FLOOR - 2.45
const SHEAVE: Pt = [1.95, TOWER_TOP + 0.2]
const BUCKET_X = 2.15
const BUCKET_LOW = 0.12
const BUCKET_HIGH = SHEAVE[1] + 0.42
// The line, the basket's wheel on it, and the pole.
// Tied to the tower's near leg, so the basket waits just past the pail's lip.
const LINE_A: Pt = [TOWER - 0.2, TOWER_TOP + 0.62]
const LINE_B: Pt = [5.3, FLOOR - 1.2]
const DROP = 0.5
const EXIT_X = 7.1
/** How far back the channel's head reaches, in its own frame (to -HEAD_BACK): under the pump's spout, so its water falls into it. */
export const HEAD_BACK = 1.25
/** Half the pail's rim, and half the basket's mouth. */
const PAIL_W = 0.2
const BASKET_W = 0.21
// The hand pump by the corn: its body, the handle on its pivot (up when set, down when pumped), the spout to the channel.
const PX = 6.1
const PIVOT_H: Pt = [PX - 0.08, FLOOR - 0.78]
const HANDLE = 0.62
const SET = 0.45
const PUMPED = -0.32
/** The handle's angle: up and waiting; down under the ball; sprung back up, throwing it. */
function handleAt(t: number): number {
  if (t < LAND) return SET
  if (t < BOTTOM) return SET + (PUMPED - SET) * easeInQuad((t - LAND) / (BOTTOM - LAND))
  const up = t - BOTTOM
  return PUMPED + (SET - PUMPED) * gather(up, 0.03) - 0.08 * Math.exp(-up / 0.4) * Math.sin(up * 11) * smooth(up, 0, 0.08)
}
/** A point along the handle, `d` out from the pivot, lifted `lift` off its top. */
function onHandle(a: number, d: number, lift: number): Pt {
  const dx = -Math.cos(a)
  const dy = -Math.sin(a)
  return [PIVOT_H[0] + dx * d - dy * lift, PIVOT_H[1] + dy * d + dx * lift]
}
/** The plank's angle at show time `t`: down at the near end, over as the ball crosses, and a bounce when it lands. */
function plankAt(t: number): number {
  if (t < OVER) return -TILT
  const u = easeInQuad(clamp((t - OVER) / (THUMP - OVER)))
  const after = t - THUMP
  const bounce = after > 0 ? -0.05 * Math.exp(-after / 0.22) * Math.sin(after * 14) : 0
  return -TILT + 2 * TILT * u + bounce
}

/** A point on the plank's top, `d` out from the pivot, lifted by `lift` off it. */
function onPlank(d: number, a: number, lift: number): Pt {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [PIVOT[0] + d * c + s * (THICK / 2 + lift), PIVOT[1] + d * s - c * (THICK / 2 + lift)]
}

/**
 * How far up the bucket is, 0 at the foot, 1 at the head. The wind turns the
 * wheel steadily, so the rope comes in steadily; each tooth the pawl drops
 * into gives it a small surge, and it never stops until the trip bar catches
 * the lip. Worked out once as a table: a steady pull, a surge after each
 * tooth, eased in at the start and a little slower at the top.
 */
const HOIST = (() => {
  const t0 = TEETH[0]
  const t1 = TRIP
  const dt = 0.002
  const n = Math.ceil((t1 - t0) / dt)
  const speed = (t: number): number => {
    let v = smooth(t, t0, t0 + 0.25) * (1 - 0.45 * smooth(t, t1 - 0.3, t1))
    for (const tooth of TEETH) {
      const s = (t - tooth) / 0.11
      if (s > 0) v += 0.75 * s * Math.exp(1 - s)
    }
    return v
  }
  const h = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) h[i] = h[i - 1] + speed(t0 + (i - 0.5) * dt) * dt
  for (let i = 0; i <= n; i++) h[i] /= h[n]
  return { t0, dt, h }
})()

function hoistAt(t: number): number {
  const i = (t - HOIST.t0) / HOIST.dt
  if (i <= 0) return 0
  if (i >= HOIST.h.length - 1) return 1
  const j = Math.floor(i)
  return HOIST.h[j] + (HOIST.h[j + 1] - HOIST.h[j]) * (i - j)
}

/** A step from 0 to 1 that starts at rest and gathers over a few `tau`s: what a spring or a lurch looks like as it lets go. */
function gather(since: number, tau: number): number {
  if (since <= 0) return 0
  const at = (s: number) => 1 - (1 + s / tau + (s * s) / (2 * tau * tau)) * Math.exp(-s / tau)
  return Math.min(1, at(since) / at(14 * tau))
}

/** The bucket's rim centre (x, y) and its tip (radians), at show time `t`. */
function bucketAt(t: number): { x: number; y: number; tip: number } {
  const h = hoistAt(t)
  const y = BUCKET_LOW + (BUCKET_HIGH - BUCKET_LOW) * h
  const tip = 1.1 * gather(t - TRIP, 0.035) - 0.25 * easeInOutSine(clamp((t - CATCH - 0.4) / 0.8))
  const sway = t > IN_BUCKET ? 0.02 * Math.sin((t - IN_BUCKET) * 7) * (1 - smooth(t, TEETH[TEETH.length - 1], TRIP)) : 0
  return { x: BUCKET_X + sway, y, tip }
}

/** The basket's wheel on the line: from the tower down to the pole, running faster as it goes. */
function trolleyAt(t: number): Pt {
  const u = clamp((t - CATCH) / (POLE - CATCH))
  const f = u * u * 0.7 + u * 0.3
  return [LINE_A[0] + 0.15 + (LINE_B[0] - 0.3 - LINE_A[0] - 0.15) * f, 0]
}
const lineY = (x: number): number => LINE_A[1] + ((x - LINE_A[0]) / (LINE_B[0] - LINE_A[0])) * (LINE_B[1] - LINE_A[1]) + 0.12 * Math.sin(Math.PI * clamp((x - LINE_A[0]) / (LINE_B[0] - LINE_A[0])))

/** The basket's swing on its hanger: still, a lurch as it starts down, a big swing forward when it fetches up against the pole. */
function swingAt(t: number): number {
  const start = t - CATCH
  const go = start > 0 ? -0.15 * Math.exp(-start / 0.5) * Math.sin(start * 6.5) : 0
  const hit = t - POLE
  // Up to the top of the fling as sharp as the knock; the swing back after it slower, a heavy basket on a long hanger.
  const top = Math.PI / 2 / 7
  const phase = hit < top ? hit * 7 : Math.PI / 2 + (hit - top) * 4.2
  const fling = hit > 0 ? 0.9 * Math.exp(-hit / 0.8) * Math.sin(phase) : 0
  return go + fling
}

/** The ball in the basket: under the wheel on its hanger, the swing carrying it. */
function inBasket(t: number): Pt {
  const [x] = trolleyAt(t)
  const y = lineY(x)
  const a = swingAt(t)
  return [x + Math.sin(a) * DROP, y + Math.cos(a) * DROP - 0.06]
}

/** The ball in the pail: on the rim's middle, and toward its lip as it tips. */
function inPail(t: number): Pt {
  const b = bucketAt(t)
  const s = Math.sin(b.tip)
  return [b.x + s * 0.12, b.y + 0.02 - s * 0.04]
}

interface YardState {
  begin: number
  pegs: number[]
}

export const yard = part<YardState>(
  {
    name: 'yard',
    draw: (p, s, c) => drawYard(p, s, c),
    over: (p, s, c) => {
      // The bucket's near side and the basket's weave, in front of the ball.
      const t = c.t + s.begin
      const b = bucketAt(t)
      bucketFront(p, c, b.x, b.y, b.tip)
      const [bx, by] = inBasket(t)
      basketFront(p, c, bx, by + 0.06, swingAt(t))
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const s: YardState = { begin: slot.begin, pegs: [] }
    s.pegs = PEGS.map((t) => trolleyAt(t)[0] + 0.12)
    const foot = onPlank(-HALF + 0.12, -TILT, R)
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: at(FOOT), p: foot }]
    const segs = route(ways)
    // Up the plank, over, and down it: the ball is carried by the plank as it turns.
    const along = (t: number): number => {
      const T = t + slot.begin
      if (T < OVER) return -HALF + 0.12 + (HALF - 0.12) * ((T - FOOT) / (OVER - FOOT))
      return 0.9 * (HALF - 0.1) * easeInQuad(clamp((T - OVER) / (IN_BUCKET - 0.26 - OVER)))
    }
    const plank = (t: number): Pt => onPlank(along(t), plankAt(t + slot.begin), R)
    segs.push(...carried(plank, at(FOOT), at(IN_BUCKET) - 0.26, 40))
    // Off the end into the bucket.
    const edge: Way = { at: at(IN_BUCKET) - 0.26, p: plank(at(IN_BUCKET) - 0.26) }
    const bucket = (t: number): Pt => inPail(t + slot.begin)
    segs.push(...route([edge, hop(edge, bucket(at(IN_BUCKET)), at(IN_BUCKET))]))
    // Up the tower in the bucket.
    segs.push(...carried(bucket, at(IN_BUCKET), at(TRIP), 60))
    // Tipped out as the pail goes over: poured in one flight into the basket, gathering speed as it falls.
    const out: Way = { at: at(TRIP), p: bucket(at(TRIP)) }
    const basket = (t: number): Pt => inBasket(t + slot.begin)
    segs.push(...route([out, { ...hop(out, basket(at(CATCH)), at(CATCH)), ramp: [0.5, 1] }]))
    // Down the line in the basket, to the pole.
    segs.push(...carried(basket, at(CATCH), at(POLE) + 0.08, 60))
    // Thrown out as it swings, onto the pump handle's end; down with it; and sprung up over the pump into the channel.
    const thrown: Way = { at: at(POLE) + 0.08, p: basket(at(POLE) + 0.08) }
    const onEnd = (t: number): Pt => onHandle(handleAt(t + slot.begin), HANDLE - 0.06, R + 0.02)
    segs.push(...route([thrown, hop(thrown, onEnd(at(LAND)), at(LAND))]))
    segs.push(...carried(onEnd, at(LAND), at(BOTTOM), 12))
    // The handle hits its stop; the spring takes hold and lifts him a moment before it throws him.
    const lift = at(BOTTOM) + 0.06
    segs.push(...carried(onEnd, at(BOTTOM), lift, 6))
    const sprung: Way = { at: lift, p: onEnd(lift) }
    segs.push(...route([sprung, hop(sprung, [EXIT_X, 0], slot.end - slot.begin)]))
    return {
      cells: box(-2, -3, EXIT_X + 0.5, 1),
      exit: [EXIT_X + 0.5, 0],
      lane: { segs, fire: at(OVER) },
      state: s,
    }
  },
  (slot) => [
    { t: slot.begin, cells: 4.3, off: [0.6, -0.55] },
    { t: IN_BUCKET, cells: 4.8, hold: [1.7, -0.95], w: 0.55 },
    { t: TRIP, cells: 5, hold: [2.9, -1.35], w: 0.7 },
    { t: POLE, cells: 4.8, hold: [5.4, -0.8], w: 0.55 },
    { t: BOTTOM, cells: 4.6, hold: [6.2, -0.7], w: 0.5 },
    { t: slot.end, cells: 4.2, off: [0.7, -0.55] },
  ],
)

function drawYard(p: p5, s: YardState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k

  // The yard: hard earth, a tuft or two.
  outline(p, ink, weight)
  const ground = EXIT_X + 0.5 - HEAD_BACK
  p.line(X(-0.5), X(FLOOR), X(ground), X(FLOOR))
  for (let i = 0; i < 7; i++) {
    const gx = -0.2 + i * 1.1 + hash(i, 5) * 0.4
    if (gx > ground - 0.15) continue
    p.line(X(gx), X(FLOOR), X(gx - 0.03), X(FLOOR - 0.07))
    p.line(X(gx + 0.03), X(FLOOR), X(gx + 0.06), X(FLOOR - 0.06))
  }
  drawHens(p, c, t)

  // The windmill: a wooden lattice tower, the wheel of blades turning in the dawn wind, the tail behind it.
  const legL = TOWER - 0.42
  const legR = TOWER + 0.42
  outline(p, ink, weight)
  p.line(X(legL), X(FLOOR), X(TOWER - 0.12), X(TOWER_TOP))
  p.line(X(legR), X(FLOOR), X(TOWER + 0.12), X(TOWER_TOP))
  outline(p, ink, weight * 0.6)
  for (let i = 1; i < 4; i++) {
    const y0 = FLOOR + (TOWER_TOP - FLOOR) * ((i - 1) / 4)
    const y1 = FLOOR + (TOWER_TOP - FLOOR) * (i / 4)
    const w0 = 0.42 - 0.3 * ((i - 1) / 4)
    const w1 = 0.42 - 0.3 * (i / 4)
    p.line(X(TOWER - w1), X(y1), X(TOWER + w1), X(y1))
    p.line(X(TOWER - w0), X(y0), X(TOWER + w1), X(y1))
  }
  // The head: the ratchet and pawl that wind the rope, and the boom out to the sheave over the bucket.
  solid(p, ink, weight, DUST.wood)
  p.rect(X((SHEAVE[0] + TOWER) / 2), X(TOWER_TOP + 0.08), X(TOWER - SHEAVE[0] + 0.15), X(0.07))
  const turns = hoistAt(t) * 5
  p.push()
  p.translate(X(TOWER), X(TOWER_TOP + 0.08))
  p.rotate(-turns * (Math.PI * 2) / 10)
  solid(p, ink, weight * 0.8, DUST.tin)
  p.beginShape()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    p.vertex(X(Math.cos(a) * 0.17), X(Math.sin(a) * 0.17))
    p.vertex(X(Math.cos(a + 0.4) * 0.12), X(Math.sin(a + 0.4) * 0.12))
  }
  p.endShape(p.CLOSE)
  p.pop()
  const click = lastOf(TEETH, t)
  const pawl = click.ago < 0.45 ? 0.35 * Math.exp(-click.ago / 0.12) : 0
  outline(p, ink, weight)
  p.line(X(TOWER + 0.32), X(TOWER_TOP - 0.1), X(TOWER + 0.18 - pawl * 0.05), X(TOWER_TOP - 0.02 - pawl * 0.12))
  // The wheel, on its shaft over the head: blades as a fan, turning.
  const spin = t * 1.6 + turns * 1.4
  const hub: Pt = [TOWER + 0.1, TOWER_TOP - 0.3]
  solid(p, ink, weight * 0.7, DUST.bone)
  for (let i = 0; i < 16; i++) {
    const a = spin + (i / 16) * Math.PI * 2
    const r0 = 0.18
    const r1 = 0.62
    p.quad(
      X(hub[0] + Math.cos(a) * r0), X(hub[1] + Math.sin(a) * r0),
      X(hub[0] + Math.cos(a) * r1), X(hub[1] + Math.sin(a) * r1),
      X(hub[0] + Math.cos(a + 0.16) * r1), X(hub[1] + Math.sin(a + 0.16) * r1),
      X(hub[0] + Math.cos(a + 0.12) * r0), X(hub[1] + Math.sin(a + 0.12) * r0),
    )
  }
  outline(p, ink, weight * 0.8)
  p.noFill()
  p.circle(X(hub[0]), X(hub[1]), X(1.24))
  solid(p, ink, weight, DUST.rust)
  p.circle(X(hub[0]), X(hub[1]), X(0.12))
  // The tail vane, out behind.
  solid(p, ink, weight * 0.8, DUST.rust)
  p.line(X(hub[0]), X(hub[1]), X(hub[0] + 0.85), X(hub[1] - 0.05))
  p.quad(X(hub[0] + 0.6), X(hub[1] - 0.22), X(hub[0] + 0.95), X(hub[1] - 0.32), X(hub[0] + 0.95), X(hub[1] + 0.14), X(hub[0] + 0.6), X(hub[1] + 0.08))

  // The trip bar at the head of the hoist: a stop the bucket's lip catches on, and it goes over.
  outline(p, ink, weight)
  p.line(X(BUCKET_X + 0.22), X(BUCKET_HIGH - 0.2), X(BUCKET_X + 0.42), X(BUCKET_HIGH - 0.2))
  // Sheave, rope, bucket.
  solid(p, ink, weight * 0.8, DUST.tin)
  p.circle(X(SHEAVE[0]), X(SHEAVE[1]), X(0.16))
  const b = bucketAt(t)
  outline(p, ink, weight * 0.6)
  p.line(X(SHEAVE[0] - 0.08), X(SHEAVE[1]), X(b.x), X(b.y - 0.28))
  p.line(X(SHEAVE[0] + 0.08), X(SHEAVE[1]), X(TOWER - 0.05), X(TOWER_TOP + 0.08))
  bucketBack(p, c, b.x, b.y, b.tip)
  // At the foot, a shallow pit the bucket sits in.
  outline(p, ink, weight * 0.8)
  const pit = PAIL_W + 0.06
  p.line(X(BUCKET_X - pit), X(FLOOR), X(BUCKET_X - pit + 0.04), X(FLOOR + 0.3))
  p.line(X(BUCKET_X + pit), X(FLOOR), X(BUCKET_X + pit - 0.04), X(FLOOR + 0.3))
  p.line(X(BUCKET_X - pit + 0.04), X(FLOOR + 0.3), X(BUCKET_X + pit - 0.04), X(FLOOR + 0.3))

  // The plank and its sawhorse.
  outline(p, ink, weight)
  for (const dx of [-0.16, 0.16]) p.line(X(PIVOT[0]), X(PIVOT[1] + 0.02), X(PIVOT[0] + dx), X(FLOOR))
  p.line(X(PIVOT[0] - 0.11), X(PIVOT[1] + 0.12), X(PIVOT[0] + 0.11), X(PIVOT[1] + 0.12))
  const a = plankAt(t)
  p.push()
  p.translate(X(PIVOT[0]), X(PIVOT[1]))
  p.rotate(a)
  solid(p, ink, weight, DUST.wood)
  p.rect(0, 0, X(HALF * 2), X(THICK), X(0.01))
  p.pop()
  // Dust where it comes down.
  const thud = t - THUMP
  if (thud > 0 && thud < 0.5) {
    const u = thud / 0.5
    const end = onPlank(HALF, TILT, 0)
    p.noStroke()
    p.fill(alpha(p, DUST.shade, 0.7 * (1 - u)))
    for (const side of [-1, 1]) p.circle(X(end[0] + side * (0.08 + u * 0.14)), X(FLOOR - 0.03 - u * 0.04), X(0.05 + u * 0.05))
  }

  // The clothes line: from the tower down to the pole, the pegs on it, the pole.
  outline(p, ink, weight)
  p.line(X(LINE_B[0]), X(FLOOR), X(LINE_B[0]), X(LINE_B[1] - 0.12))
  p.line(X(LINE_B[0] - 0.22), X(LINE_B[1] - 0.05), X(LINE_B[0] + 0.22), X(LINE_B[1] - 0.05))
  outline(p, ink, weight * 0.6)
  p.noFill()
  p.beginShape()
  for (let i = 0; i <= 24; i++) {
    const x = LINE_A[0] + ((LINE_B[0] - LINE_A[0]) * i) / 24
    p.vertex(X(x), X(lineY(x)))
  }
  p.endShape()
  // A sheet on the line past the basket's run, lifting a little in the wind.
  const sx = LINE_B[0] - 0.25
  solid(p, ink, weight * 0.8, DUST.bone)
  p.beginShape()
  p.vertex(X(sx - 0.02), X(lineY(sx - 0.02)))
  p.vertex(X(sx + 0.2), X(LINE_B[1] - 0.02))
  p.vertex(X(sx + 0.26 + Math.sin(t * 1.3) * 0.03), X(LINE_B[1] + 0.6))
  p.vertex(X(sx - 0.02 + Math.sin(t * 1.3 + 0.4) * 0.03), X(lineY(sx) + 0.66))
  p.endShape(p.CLOSE)
  // The pegs, each holding a piece of the wash: knocked off one by one as the basket's wheel comes through, and the
  // wash drops away in front of the basket, out of its road, and lies in the dust.
  const WASH: [string, number, number][] = [
    [DUST.denim, 0.3, 0.36],
    [DUST.rust, 0.24, 0.3],
    [DUST.light, 0.28, 0.26],
  ]
  for (let i = 0; i < s.pegs.length; i++) {
    const x = s.pegs[i]
    const since = t - PEGS[i]
    const top = lineY(x)
    const [col, w, h] = WASH[i]
    // The wash: hanging, then falling, turning, and crumpled on the ground.
    const f = Math.max(0, since)
    const fall = Math.min(FLOOR - top - 0.06, 0.5 * 12 * f * f)
    const down = f > 0 && fall >= FLOOR - top - 0.06
    const sway = 0.04 * Math.sin(t * 1.4 + i)
    p.push()
    p.translate(X(x + 0.05 + f * 0.25), X(top + fall))
    if (!down) {
      p.rotate(sway + (f > 0 ? Math.min(0.9, f * 3) * (i % 2 ? -1 : 1) : 0))
      solid(p, ink, weight * 0.7, col)
      if (i === 0) {
        // A shirt: body, sleeves, collar.
        p.beginShape()
        p.vertex(X(-w / 2), 0)
        p.vertex(X(w / 2), 0)
        p.vertex(X(w / 2 + 0.1), X(0.12))
        p.vertex(X(w / 2 - 0.02), X(0.14))
        p.vertex(X(w / 2 - 0.02), X(h))
        p.vertex(X(-w / 2 + 0.02), X(h))
        p.vertex(X(-w / 2 + 0.02), X(0.14))
        p.vertex(X(-w / 2 - 0.1), X(0.12))
        p.endShape(p.CLOSE)
        outline(p, ink, weight * 0.4)
        p.line(0, X(0.02), 0, X(h - 0.02))
      } else {
        p.rect(0, X(h / 2), X(w), X(h), X(0.01))
        outline(p, ink, weight * 0.4)
        p.line(X(-w / 2), X(h - 0.06), X(w / 2), X(h - 0.06))
      }
    } else {
      // In a heap in the dust.
      solid(p, ink, weight * 0.7, col)
      p.beginShape()
      p.vertex(X(-w * 0.6), X(0.05))
      p.vertex(X(-w * 0.35), X(-0.03))
      p.vertex(X(-w * 0.05), X(0.0))
      p.vertex(X(w * 0.25), X(-0.05))
      p.vertex(X(w * 0.6), X(0.05))
      p.endShape(p.CLOSE)
    }
    p.pop()
    // The peg itself, sprung off the line.
    let px = x
    let py = top
    let pa = 0
    if (since > 0) {
      const g = Math.min(since, 0.55)
      px += 0.35 * g
      py = Math.min(FLOOR - 0.03, py - 0.6 * g + 0.5 * 12 * g * g)
      pa = since * 9
    }
    p.push()
    p.translate(X(px), X(py))
    p.rotate(since > 0 ? Math.min(pa, Math.PI / 2 + 0.2) : 0)
    solid(p, ink, weight * 0.6, DUST.wood)
    p.rect(0, X(0.05), X(0.035), X(0.12), X(0.01))
    p.pop()
  }
  // The basket's wheel and hanger, and the back of the basket.
  const [wx] = trolleyAt(t)
  const wy = lineY(wx)
  solid(p, ink, weight * 0.8, DUST.tin)
  p.circle(X(wx), X(wy - 0.03), X(0.1))
  const sw = swingAt(t)
  outline(p, ink, weight * 0.6)
  p.line(X(wx), X(wy), X(wx + Math.sin(sw) * (DROP - 0.12)), X(wy + Math.cos(sw) * (DROP - 0.12)))
  const [bx, by] = inBasket(t)
  p.push()
  p.translate(X(bx), X(by + 0.06))
  p.rotate(-sw)
  solid(p, ink, weight * 0.8, DUST.shade)
  p.arc(0, X(-0.02), X(2 * BASKET_W), X(0.36), 0, Math.PI, p.CHORD)
  p.pop()
  // The hand pump: iron body on its stand, the spout toward the corn, the handle on its pivot.
  solid(p, ink, weight, DUST.denim)
  p.rect(X(PX), X((FLOOR + PIVOT_H[1]) / 2 + 0.05), X(0.2), X(FLOOR - PIVOT_H[1] - 0.1), X(0.03))
  p.rect(X(PX), X(FLOOR - 0.04), X(0.36), X(0.08))
  outline(p, ink, weight)
  p.line(X(PX + 0.1), X(PIVOT_H[1] + 0.28), X(PX + 0.36), X(PIVOT_H[1] + 0.3))
  p.line(X(PX + 0.36), X(PIVOT_H[1] + 0.3), X(PX + 0.38), X(PIVOT_H[1] + 0.38))
  solid(p, ink, weight, DUST.denim)
  p.circle(X(PX), X(PIVOT_H[1] + 0.02), X(0.18))
  const ha = handleAt(t)
  const hEnd = onHandle(ha, HANDLE, 0)
  outline(p, ink, weight * 1.3)
  p.line(X(PIVOT_H[0]), X(PIVOT_H[1]), X(hEnd[0]), X(hEnd[1]))
  solid(p, ink, weight * 0.8, DUST.bone)
  p.circle(X(PIVOT_H[0]), X(PIVOT_H[1]), X(0.07))
  // The pumped water: out of the spout in a rope on the stroke, down into the head of the channel.
  const gush = t - BOTTOM
  if (gush > -0.05 && gush < 1.6) {
    const flow = smooth(gush, -0.05, 0.05) * (1 - smooth(gush, 0.9, 1.6))
    const sx = PX + 0.37
    const sy = PIVOT_H[1] + 0.4
    p.noFill()
    p.stroke(alpha(p, DUST.teal, 0.85 * flow))
    p.strokeWeight(Math.max(1.5, k * 0.06 * flow))
    p.beginShape()
    for (let i = 0; i <= 10; i++) {
      const u = i / 10
      p.vertex(X(sx + 0.14 * u), X(sy + (FLOOR - sy) * u * u))
    }
    p.endShape()
    if (flow > 0.2) {
      p.noStroke()
      p.fill(alpha(p, DUST.light, 0.7 * flow))
      for (let j = 0; j < 4; j++) p.circle(X(sx + 0.14 + (hash(j, 17) - 0.5) * 0.2), X(FLOOR - 0.05 - hash(j, 18) * 0.12 * (1 + Math.sin(t * 30 + j))), X(0.04))
    }
  }
  // The pole takes the knock.
  const knocked = knock(t - POLE, 0.15)
  if (knocked > 0.05) {
    p.stroke(alpha(p, ink, knocked))
    p.strokeWeight(weight)
    for (const dy of [-0.12, 0, 0.12]) p.line(X(LINE_B[0] - 0.08), X(LINE_B[1] + 0.3 + dy), X(LINE_B[0] - 0.2), X(LINE_B[1] + 0.3 + dy * 1.3))
  }
}

/*
 * Two hens scratching in the yard between the porch and the plank. The ball comes rolling through them: the rust
 * one jerks her head up and steps back as it passes (19.51); the buff one goes up in a flurry as it reaches her,
 * the ball rolls under, and she comes down behind it (19.75 to 20.16), and goes back to pecking.
 */
const HENS: { x: number; color: string; startle: number; flight?: [number, number, number] }[] = [
  { x: -1.72, color: DUST.rust, startle: 19.511 },
  { x: -0.9, color: DUST.wood, startle: 19.754, flight: [19.754, 20.161, -0.42] },
]

function drawHens(p: p5, c: Ctx, t: number): void {
  for (let i = 0; i < HENS.length; i++) {
    const h = HENS[i]
    const since = t - h.startle
    let x = h.x
    let lift = 0
    let flap = 0
    let alert = 0
    if (h.flight && since > 0) {
      const [t0, t1, dx] = h.flight
      const u = clamp((t - t0) / (t1 - t0))
      x += dx * easeInOutSine(u)
      lift = 0.3 * Math.sin(Math.PI * u) + 0.03 * Math.sin(Math.PI * u) ** 2
      flap = u < 1 ? 0.5 + 0.5 * Math.sin((t - t0) * 38) : 0
      alert = u < 1 ? 1 : 1 - smooth(t, t1 + 0.2, t1 + 0.6)
    } else if (!h.flight && since > 0) {
      // Head up, a step back, and settled again.
      x -= 0.07 * easeInOutSine(clamp(since / 0.18))
      lift = 0.05 * Math.sin(Math.PI * clamp(since / 0.18))
      alert = 1 - smooth(since, 0.5, 0.9)
    }
    // Pecking, each at her own unhurried rhythm, unless she is watching.
    const cycle = (t * (0.55 + 0.2 * i) + i * 0.37) % 1
    const peck = (1 - alert) * (cycle < 0.3 ? Math.sin((Math.PI * cycle) / 0.3) : 0)
    hen(p, c, x, FLOOR - lift, h.color, peck, flap)
  }
}

/** A hen facing left, her feet at (x, foot): buff or rust, a red comb, a corn beak; `peck` puts her head down, `flap` her wings up. */
function hen(p: p5, c: Ctx, x: number, foot: number, color: string, peck: number, flap: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const w = weight * 0.7
  // Legs.
  outline(p, ink, w)
  for (const dx of [-0.015, 0.03]) p.line(X(x + dx), X(foot - 0.09), X(x + dx - 0.01), X(foot))
  // Tail, then body.
  solid(p, ink, w, color)
  p.beginShape()
  p.vertex(X(x + 0.08), X(foot - 0.12))
  p.vertex(X(x + 0.17), X(foot - 0.27))
  p.vertex(X(x + 0.19), X(foot - 0.2))
  p.vertex(X(x + 0.12), X(foot - 0.1))
  p.endShape(p.CLOSE)
  p.ellipse(X(x + 0.02), X(foot - 0.155), X(0.24), X(0.15))
  // The neck and head: up and looking, or down to the dirt.
  const hx = x - 0.1 - 0.04 * peck
  const hy = foot - 0.26 + 0.19 * peck
  p.beginShape()
  p.vertex(X(x - 0.07), X(foot - 0.2))
  p.vertex(X(hx + 0.02), X(hy - 0.02))
  p.vertex(X(hx + 0.045), X(hy + 0.02))
  p.vertex(X(x - 0.02), X(foot - 0.13))
  p.endShape(p.CLOSE)
  p.circle(X(hx), X(hy), X(0.075))
  solid(p, ink, w * 0.8, DUST.rust)
  p.arc(X(hx + 0.005), X(hy - 0.035), X(0.05), X(0.04), Math.PI, Math.PI * 2, p.CHORD)
  solid(p, ink, w * 0.8, DUST.corn)
  p.triangle(X(hx - 0.035), X(hy - 0.01), X(hx - 0.075), X(hy + 0.005), X(hx - 0.035), X(hy + 0.015))
  // The near wing: folded, or beating.
  solid(p, ink, w * 0.9, color === DUST.rust ? DUST.wood : DUST.bone)
  p.push()
  p.translate(X(x + 0.05), X(foot - 0.17))
  p.rotate(-1.1 * flap)
  p.ellipse(X(0.02), 0, X(0.13), X(0.065))
  p.pop()
}

/** The bucket's back and bottom, behind the ball: a tin pail, rim at (x, y), tipped by `tip`. */
function bucketBack(p: p5, c: Ctx, x: number, y: number, tip: number): void {
  const { k, ink, weight } = c
  p.push()
  p.translate(x * k, y * k)
  p.rotate(tip)
  solid(p, ink, weight * 0.8, DUST.shade)
  const w = PAIL_W
  p.quad(-w * k, 0.02 * k, w * k, 0.02 * k, (w - 0.05) * k, 0.28 * k, (0.05 - w) * k, 0.28 * k)
  outline(p, ink, weight * 0.6)
  p.arc(0, 0, (2 * w + 0.04) * k, 0.56 * k, Math.PI, Math.PI * 2)
  p.pop()
}

/** The bucket's near side, over the ball, lower than the rim so the ball shows in it. */
function bucketFront(p: p5, c: Ctx, x: number, y: number, tip: number): void {
  const { k, ink, weight } = c
  p.push()
  p.translate(x * k, y * k)
  p.rotate(tip)
  solid(p, ink, weight * 0.8, DUST.tin)
  const w = PAIL_W
  p.quad((0.01 - w) * k, 0.12 * k, (w - 0.01) * k, 0.12 * k, (w - 0.05) * k, 0.28 * k, (0.05 - w) * k, 0.28 * k)
  outline(p, ink, weight * 0.5)
  p.line((0.02 - w) * k, 0.18 * k, (w - 0.02) * k, 0.18 * k)
  p.pop()
}

/** The basket's woven front, over the ball. */
function basketFront(p: p5, c: Ctx, x: number, y: number, swing: number): void {
  const { k, ink, weight } = c
  p.push()
  p.translate(x * k, y * k)
  p.rotate(-swing)
  solid(p, ink, weight * 0.8, DUST.wood)
  p.arc(0, 0.04 * k, (2 * BASKET_W + 0.02) * k, 0.3 * k, 0, Math.PI, p.CHORD)
  outline(p, ink, weight * 0.45)
  for (const dx of [-0.1, 0, 0.1]) p.line(dx * k, 0.05 * k, dx * 0.8 * k, 0.17 * k)
  p.pop()
}
