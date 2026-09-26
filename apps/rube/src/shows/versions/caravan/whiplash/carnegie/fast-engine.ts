import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, type Ctx } from '../kit'
import { level } from '../music'
import { HALL, KIT } from '../worlds'
import { ACCENTS, CONTACTS, FIRST, HOP, HOP_MAX, LAST, SHIFT, STOMPS, UNWIND, cams, head, hopHeight, spin, sticks, strokeRate, sunk, turns } from './fast-clock'
import { FLOOR } from './stage'

/**
 * The engine of the build, drawn in the Carnegie frame (`stage.ts`: the ball rests on the snare at (-0.5, 0)). A
 * treadle machine in black japanned iron with gilt lines, standing between the snare and the hi-hat:
 *
 *   the head over the snare: a short arm off the post, two sticks hinged under it at their butts, side by side and
 *     leaning the same way like a drummer's two hands, each lifted by a cam on the camshaft beneath it and let fall
 *   the post, with the belt's pulley at the camshaft's end
 *   the lever (Andrew's), from the post out under the hi-hat, a treadle he rides; its pushrod down to the flywheel
 *   the flywheel, small, one turn a stomp, on its A-frame on the floor right of the hi-hat
 *
 * Everything is drawn from show time; `sunk` puts it all under the stage before the rise and after the sink.
 */

/* ------------------------------------------------------------------ the geometry */

export const WHEEL = { x: 1.72, y: 1.3, r: 0.5, rim: 0.085, hub: 0.1 }
export const POST_X = 0.2
const POST_TOP = -1.3
/** The head's arm: off the post, out over the snare as far as the back stick's hinge. */
const ARM_Y = -0.72
const ARM_END = -0.33
/** The lever: pivoted on the post, its top level with the snare's head, so he rolls straight across onto it. */
export const LEVER = { x0: POST_X, x1: 1.86, y: 0.165, th: 0.07 }
/** Where Andrew stands on the lever, and where its pushrod hangs. */
export const BALL_X = 1.32
const ROD_X = 1.7
/**
 * The sticks: hinged on lugs under the arm, parallel, tips on the head when struck. `left` strikes the house's left
 * of the head, `right` nearer the middle; each hinge is up and to the right of its tip. A short tail runs on past the
 * hinge up into the arm, where a cam on the camshaft inside it presses the tail down: the tip rises, and falls.
 */
const HINGE_Y = ARM_Y + 0.1
const STICK = {
  left: { f: [-0.21, HINGE_Y] as Pt, tip: [-0.69, 0.075] as Pt },
  right: { f: [0.09, HINGE_Y] as Pt, tip: [-0.39, 0.075] as Pt },
}
/** How far each stick runs on past its hinge, up into the arm. */
const TAIL = 0.1
const STICK_LEN = Math.hypot(STICK.right.tip[0] - STICK.right.f[0], STICK.right.tip[1] - STICK.right.f[1])
const STICK_DIR: Pt = [(STICK.right.tip[0] - STICK.right.f[0]) / STICK_LEN, (STICK.right.tip[1] - STICK.right.f[1]) / STICK_LEN]
/** The cams, on the arm's face over each tail's end: a base radius and a lobe (a teardrop, not a bead). */
const CAM_R = 0.04
const CAM_LOBE = 0.045
const camOver = (f: Pt): Pt => [f[0] - STICK_DIR[0] * TAIL, ARM_Y]
const CAM_AT = { left: camOver(STICK.left.f), right: camOver(STICK.right.f) }
/** The belt's pulley at the post's foot: the drive runs up inside the post to the camshaft in the arm. */
const PULLEY: Pt = [POST_X, WHEEL.y]

/* ------------------------------------------------------------------ colours */

const IRON = mixHex(HALL.black, KIT.shade, 0.55)
const IRON_LIT = mixHex(KIT.shade, KIT.chrome, 0.18)
const BELT = mixHex(KIT.oxblood, KIT.shade, 0.45)
const WOOD = mixHex(HALL.floor, KIT.hickory, 0.3)

/** The shutter a blur is drawn over, seconds: what a fast part's smear spans. */
const SHUTTER = 1 / 45

/* ------------------------------------------------------------------ helpers */

function withAlpha(p: p5, a: number, fn: () => void): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const was = ctx.globalAlpha
  ctx.globalAlpha = was * Math.max(0, Math.min(1, a))
  fn()
  ctx.globalAlpha = was
}

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
const ease = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/** A stick from its butt to its tip, in cells: the canon's ink and hickory, with its bead at the tip. */
function stick(p: p5, c: Ctx, butt: Pt, tip: Pt): void {
  const { k, ink, weight } = c
  p.stroke(ink)
  p.strokeWeight(weight * 2.6)
  p.line(butt[0] * k, butt[1] * k, tip[0] * k, tip[1] * k)
  p.stroke(KIT.hickory)
  p.strokeWeight(weight * 1.3)
  p.line(butt[0] * k, butt[1] * k, tip[0] * k, tip[1] * k)
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(KIT.hickory)
  p.ellipse(tip[0] * k, tip[1] * k, 0.07 * k, 0.05 * k)
}

/** The stick's butt and tip when its tip is `h` over the head (turned about its hinge). */
function stickPose(which: 'left' | 'right', h: number): { butt: Pt; tip: Pt } {
  const s = STICK[which]
  const sin = Math.max(-0.2, Math.min(1, (s.tip[1] - s.f[1] - h) / STICK_LEN))
  // Both lean the same way: the tip is left of the hinge.
  const th = Math.PI - Math.asin(sin)
  const tip: Pt = [s.f[0] + Math.cos(th) * STICK_LEN, s.f[1] + Math.sin(th) * STICK_LEN]
  const butt: Pt = [s.f[0] - Math.cos(th) * TAIL, s.f[1] - Math.sin(th) * TAIL]
  return { butt, tip }
}

/* ------------------------------------------------------------------ the lever: where it is, and where he is on it */

/** How deep each stomp presses the lever at the ball, cells: the kick is the bottom of the press; more after a bigger hop. */
const DEPTH: readonly number[] = STOMPS.map((s, i) => 0.04 + 0.2 * Math.min(0.3, hopHeight(i ? s - STOMPS[i - 1] : 0.35)))
/** How fast the lever comes back up under him after a stomp, seconds. */
const RETURN = 0.08
/** The take-offs after a rest on the lever long enough to crouch in: he sinks into it before each, and springs. */
const TAKEOFFS: readonly { t: number; w: number }[] = STOMPS.flatMap((s, i) => {
  if (!i) return []
  const rest = s - STOMPS[i - 1] - HOP_MAX
  return rest >= 0.12 ? [{ t: s - HOP_MAX, w: Math.min(0.16, rest - 0.06) }] : []
})
const CROUCH = 0.035
/** How high the lever's spring lifts its toe when he is off it (at the ball, cells): it follows him up to there. */
const UP = 0.06

/** The last stomp at or before `T` (its index), or -1. */
function stompBefore(T: number): number {
  if (T < STOMPS[0]) return -1
  let lo = 0
  let hi = STOMPS.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (STOMPS[mid] <= T) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * How far below its rest the lever is at the ball at `T`, under his weight, cells: at its deepest on every stomp (the
 * kick), coming back up under him, damped; a crouch before a take-off. This is where he stands; `leverTop` reads it.
 */
function press(T: number): number {
  let out = 0
  for (let i = stompBefore(T); i >= 0; i--) {
    const x = T - STOMPS[i]
    if (x > 0.6) break
    out += DEPTH[i] * Math.exp(-x / RETURN)
  }
  for (const tk of TAKEOFFS) {
    const x = T - tk.t
    if (x >= -tk.w && x <= 0) out += CROUCH * ease((x + tk.w) / tk.w)
  }
  return out
}

/** The lever's angle under him at `T`: what the lane stands on. */
function leverAngle(T: number): number {
  return Math.atan2(press(T), BALL_X - LEVER.x0)
}

/** A point on the lever's top face, `x` along it, with the lever turned by `th`. */
function topAt(x: number, th: number): Pt {
  const d = x - LEVER.x0
  return [LEVER.x0 + d * Math.cos(th) + (LEVER.th / 2) * Math.sin(th), LEVER.y + d * Math.sin(th) - (LEVER.th / 2) * Math.cos(th)]
}

/** A point on the lever's top face, `x` along it, at `T`: where he stands on it (the lane reads this). */
export function leverTop(x: number, T: number): Pt {
  return topAt(x, leverAngle(T))
}

/**
 * Where he is while he stomps (HOP → LAST), as `fast.ts` routes him: a hop from the snare's side onto the lever, then
 * from stomp to stomp a hop, or a rest riding the lever and a hop of `HOP_MAX`. The same pieces the lane is made of.
 */
function ballAt(T: number): Pt {
  const on = (t: number): number => leverTop(BALL_X, t)[1] - R
  const arc = (a: Pt, b: Pt, u: number, h: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - h * 4 * u * (1 - u)]
  if (T < FIRST) {
    const u = clamp01((T - HOP) / (FIRST - HOP))
    return arc([BALL_X - 0.17, 0], [BALL_X, on(FIRST)], u, hopHeight(FIRST - HOP))
  }
  const i = stompBefore(T)
  if (i >= STOMPS.length - 1) return [BALL_X, on(T)]
  const a = STOMPS[i]
  const b = STOMPS[i + 1]
  const gap = b - a
  if (gap > HOP_MAX + 0.02) {
    const off = b - HOP_MAX
    if (T <= off) return [BALL_X, on(T)]
    return arc([BALL_X, on(off)], [BALL_X, on(b)], (T - off) / HOP_MAX, hopHeight(HOP_MAX))
  }
  return arc([BALL_X, on(a)], [BALL_X, on(b)], (T - a) / gap, hopHeight(gap))
}

/** The larger of two, rounded over a width `w` (never less than either). */
const softMax = (a: number, b: number, w: number): number => (a + b + Math.sqrt((a - b) * (a - b) + w * w)) / 2

/**
 * The lever as drawn at `T`: a treadle on a spring. Under him it is where he stands; when he springs off it, it comes
 * up with him as far as its stop and waits there, and meets him on the way down, so every stomp is the ball and the
 * lever going down together to the kick. In the roll his hops are lower than the stop: he never leaves it.
 */
function drawnAngle(T: number): number {
  if (T <= HOP || T >= LAST) return leverAngle(T)
  const [bx, by] = ballAt(T)
  const d = Math.max(0.3, bx - LEVER.x0)
  const under = Math.atan2(by + R - (LEVER.y - LEVER.th / 2), d)
  // The spring's stop: none before the first stomp (he rolls on flat), none as he leaves it for home.
  const on = ease((T - FIRST) / 0.5) * (1 - ease((T - (LAST - 0.35)) / 0.3))
  const stop = -Math.atan2(UP * on, BALL_X - LEVER.x0)
  return softMax(stop, under, 0.014 * on)
}

/* ------------------------------------------------------------------ the whole */

/** The engine at show time `T`, in the Carnegie frame. */
export function drawEngine(p: p5, c: Ctx, T: number): void {
  const down = sunk(T)
  if (down > 4.1) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  // Whatever was drawn before may have left p5's modes changed.
  p.rectMode(p.CORNER)
  p.ellipseMode(p.CENTER)
  // Nothing of it shows below the stage's floor: it rises out of the stage and sinks back into it.
  ctx.save()
  ctx.beginPath()
  ctx.rect(-40 * k, -40 * k, 80 * k, (40 + FLOOR) * k)
  ctx.clip()
  p.translate(0, down * k)
  // At full cry the whole machine hums, a hair.
  const hum = Math.max(0, level(T) - 0.7) * Math.min(1, strokeRate(T) / 12)
  p.translate(Math.sin(T * 97) * 0.006 * hum * k, Math.sin(T * 131 + 1) * 0.005 * hum * k)
  frameBack(p, c)
  wheel(p, c, T)
  belt(p, c)
  lever(p, c, T)
  drawHead(p, c, T)
  sweat(p, c, T)
  ctx.restore()
  p.pop()
}

/* ------------------------------------------------------------------ the frame and the post */

function frameBack(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const { x, y, r } = WHEEL
  const spread = r * 0.9
  // The A-frame: two cast legs from the axle to the floor, a brace, feet.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  for (const s of [-1, 1]) {
    const foot = x + s * spread
    p.beginShape()
    p.vertex((x + s * 0.04) * k, (y - 0.05) * k)
    p.bezierVertex((x + s * 0.2) * k, (y + 0.22) * k, (foot - s * 0.04) * k, (FLOOR - 0.34) * k, (foot + s * 0.015) * k, (FLOOR - 0.05) * k)
    p.vertex((foot + s * 0.12) * k, (FLOOR - 0.05) * k)
    p.vertex((foot + s * 0.12) * k, FLOOR * k)
    p.vertex((foot - s * 0.12) * k, FLOOR * k)
    p.vertex((foot - s * 0.12) * k, (FLOOR - 0.05) * k)
    p.bezierVertex((foot - s * 0.15) * k, (FLOOR - 0.38) * k, (x + s * 0.09) * k, (y + 0.26) * k, (x - s * 0.04) * k, (y + 0.05) * k)
    p.endShape(p.CLOSE)
  }
  p.rect((x - spread * 0.78) * k, (FLOOR - 0.2) * k, spread * 1.56 * k, 0.05 * k, 0.02 * k)
  // The post: the head's arm at its top, the belt's pulley, the lever's pivot.
  p.rect((POST_X - 0.045) * k, POST_TOP * k, 0.09 * k, (FLOOR - POST_TOP) * k)
  p.rect((POST_X - 0.13) * k, (FLOOR - 0.07) * k, 0.26 * k, 0.07 * k, 0.02 * k)
  p.rect((POST_X - 0.065) * k, (POST_TOP - 0.05) * k, 0.13 * k, 0.07 * k, 0.02 * k)
  // A gilt line down the post's face.
  p.stroke(alpha(p, HALL.gilt, 0.75))
  p.strokeWeight(weight * 0.5)
  p.line(POST_X * k, (POST_TOP + 0.08) * k, POST_X * k, (FLOOR - 0.12) * k)
}

/* ------------------------------------------------------------------ the flywheel */

function wheel(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const { x, y, r, rim, hub } = WHEEL
  const turn = turns(T)
  const a = turn * Math.PI * 2
  const swept = Math.abs(spin(T)) * Math.PI * 2 * SHUTTER
  p.push()
  p.translate(x * k, y * k)
  // The web: a solid cast disc between hub and rim (it hides the stands behind it).
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  p.circle(0, 0, 2 * (r - rim + 0.01) * k)
  // Five curved ribs cast on its face: crisp when slow; at speed a soft smear of where they were over the shutter.
  const copies = swept < 0.06 ? 1 : Math.min(9, 2 + Math.ceil(swept / 0.12))
  for (let j = 0; j < copies; j++) {
    const aj = copies === 1 ? a : a - (swept * j) / (copies - 1)
    const fade = copies === 1 ? 1 : 1.6 / copies
    withAlpha(p, fade, () => spokes(p, c, aj, copies === 1))
  }
  // The rim: a heavy ring, its outer edge cut in ratchet teeth for the pawl, a gilt line on its face.
  const teeth = 28
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(IRON_LIT)
  p.beginShape()
  const blurTeeth = swept > 0.12
  for (let i = 0; i < teeth; i++) {
    const t0 = a + (i / teeth) * Math.PI * 2
    const t1 = a + ((i + 0.78) / teeth) * Math.PI * 2
    if (blurTeeth) {
      p.vertex(Math.cos(t0) * (r - 0.01) * k, Math.sin(t0) * (r - 0.01) * k)
    } else {
      p.vertex(Math.cos(t0) * (r - 0.03) * k, Math.sin(t0) * (r - 0.03) * k)
      p.vertex(Math.cos(t1) * r * k, Math.sin(t1) * r * k)
    }
  }
  p.beginContour()
  for (let i = 32; i >= 0; i--) {
    const t = (i / 32) * Math.PI * 2
    p.vertex(Math.cos(t) * (r - rim) * k, Math.sin(t) * (r - rim) * k)
  }
  p.endContour()
  p.endShape(p.CLOSE)
  const lit = 0.45 + 0.4 * level(T)
  p.noFill()
  p.stroke(alpha(p, HALL.gilt, lit))
  p.strokeWeight(weight * 0.5)
  p.circle(0, 0, 2 * (r - rim * 0.45) * k)
  // The hub: a six-sided boss with the belt's pulley on it, the axle's nickel cap.
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(IRON_LIT)
  p.beginShape()
  for (let i = 0; i < 6; i++) {
    const t = a + (i / 6) * Math.PI * 2 + Math.PI / 6
    p.vertex(Math.cos(t) * hub * k, Math.sin(t) * hub * k)
  }
  p.endShape(p.CLOSE)
  p.fill(KIT.chrome)
  p.circle(0, 0, 0.04 * k)
  p.pop()
}

/** Five S-curved ribs from the hub to the rim, turned by `a`: lighter iron, cast in relief on the web. */
function spokes(p: p5, c: Ctx, a: number, edged: boolean): void {
  const { k, weight } = c
  const { r, rim, hub } = WHEEL
  const r0 = hub * 0.8
  const r1 = r - rim + 0.01
  if (edged) {
    p.stroke(mixHex(IRON, KIT.chrome, 0.35))
    p.strokeWeight(weight * 0.4)
  } else p.noStroke()
  p.fill(IRON_LIT)
  for (let i = 0; i < 5; i++) {
    const b = a + (i / 5) * Math.PI * 2
    const bend = 0.34
    const w0 = 0.045
    const w1 = 0.022
    const at = (rad: number, ang: number): [number, number] => [Math.cos(ang) * rad * k, Math.sin(ang) * rad * k]
    const [ax, ay] = at(r0, b - w0 / r0)
    const [bx, by] = at(r1, b + bend - w1 / r1)
    const [cx, cy] = at(r1, b + bend + w1 / r1)
    const [dx, dy] = at(r0, b + w0 / r0)
    const [m1x, m1y] = at((r0 + r1) / 2, b + bend * 0.2 - 0.05)
    const [m2x, m2y] = at((r0 + r1) / 2, b + bend * 0.2 + 0.05)
    p.beginShape()
    p.vertex(ax, ay)
    p.quadraticVertex(m1x, m1y, bx, by)
    p.vertex(cx, cy)
    p.quadraticVertex(m2x, m2y, dx, dy)
    p.endShape(p.CLOSE)
  }
}

/* ------------------------------------------------------------------ the belt */

function belt(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const c1: Pt = [WHEEL.x, WHEEL.y]
  const r1 = 0.075
  const c2 = PULLEY
  const r2 = 0.07
  const dx = c2[0] - c1[0]
  const dy = c2[1] - c1[1]
  const L = Math.hypot(dx, dy)
  const base = Math.atan2(dy, dx)
  const beta = Math.acos((r1 - r2) / L)
  for (const s of [-1, 1]) {
    const t = base + s * beta
    const a: Pt = [c1[0] + Math.cos(t) * r1, c1[1] + Math.sin(t) * r1]
    const b: Pt = [c2[0] + Math.cos(t) * r2, c2[1] + Math.sin(t) * r2]
    p.stroke(ink)
    p.strokeWeight(weight * 1.6)
    p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
    p.stroke(BELT)
    p.strokeWeight(weight * 0.8)
    p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  }
  // The pulley at the post's foot, where the belt turns the drive that runs up the post to the camshaft.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  p.circle(c2[0] * k, c2[1] * k, 2 * r2 * k)
  p.fill(KIT.chrome)
  p.circle(c2[0] * k, c2[1] * k, 0.035 * k)
}

/* ------------------------------------------------------------------ the lever and its pushrod */

function lever(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const th = drawnAngle(T)
  const drop = (ROD_X - LEVER.x0) * Math.sin(th)
  const rod: Pt = [LEVER.x0 + (ROD_X - LEVER.x0) * Math.cos(th), LEVER.y + drop + LEVER.th / 2]
  // The pushrod, down to the pawl on the rim's teeth near its top: nickel, with the pawl's hook at its foot, pushed
  // down with the lever on every stomp.
  const ang = -Math.PI / 2 + 0.2
  const pawl: Pt = [WHEEL.x + Math.cos(ang) * (WHEEL.r + 0.02), WHEEL.y + Math.sin(ang) * (WHEEL.r + 0.02) + drop]
  p.stroke(ink)
  p.strokeWeight(weight * 1.9)
  p.line(rod[0] * k, rod[1] * k, pawl[0] * k, pawl[1] * k)
  p.stroke(KIT.chrome)
  p.strokeWeight(weight * 0.9)
  p.line(rod[0] * k, rod[1] * k, pawl[0] * k, pawl[1] * k)
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(KIT.chrome)
  p.beginShape()
  p.vertex((pawl[0] - 0.04) * k, (pawl[1] - 0.03) * k)
  p.vertex((pawl[0] + 0.035) * k, (pawl[1] - 0.03) * k)
  p.vertex((pawl[0] - 0.045) * k, (pawl[1] + 0.05) * k)
  p.endShape(p.CLOSE)
  // The lever: a hickory plank on its pivot at the post, a nickel shoe at the toe.
  p.push()
  p.translate(LEVER.x0 * k, LEVER.y * k)
  p.rotate(th)
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(WOOD)
  p.rect(-0.06 * k, (-LEVER.th / 2) * k, (LEVER.x1 - LEVER.x0 + 0.06) * k, LEVER.th * k, 0.025 * k)
  p.fill(KIT.chrome)
  p.rect((LEVER.x1 - LEVER.x0 - 0.1) * k, (-LEVER.th / 2 - 0.005) * k, 0.1 * k, (LEVER.th + 0.01) * k, 0.02 * k)
  p.fill(IRON)
  p.circle(0, 0, 0.1 * k)
  p.fill(KIT.chrome)
  p.circle(0, 0, 0.035 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the head: arm, camshaft, cams, sticks */

function drawHead(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const { yaw, lift } = head(T)
  const cy = Math.cos((yaw * Math.PI) / 2)
  const X = (x: number): number => (POST_X + (x - POST_X) * cy) * k
  const Y = (y: number): number => (y - lift) * k
  const P = (q: Pt): Pt => [X(q[0]) / k, Y(q[1]) / k]
  const now = sticks(T)

  // The sticks, the back one first, their tails running up behind the arm. Fast, each is a smear of where it was
  // over the shutter.
  const rate = strokeRate(T)
  const n = rate < 5 ? 1 : Math.min(7, 2 + Math.floor(rate / 3))
  for (const which of ['left', 'right'] as const) {
    for (let j = n - 1; j >= 0; j--) {
      const tj = T - (SHUTTER * j) / Math.max(1, n - 1)
      const h = j === 0 ? now[which] : sticks(tj)[which]
      const pose = stickPose(which, h)
      const a = n === 1 ? 1 : j === 0 ? 0.55 : 0.5 / n
      withAlpha(p, a, () => stick(p, c, P(pose.butt), P(pose.tip)))
    }
  }

  // The arm: off the post, out over the snare, the camshaft inside it, a gilt line along it.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  const x0 = Math.min(X(POST_X + 0.06), X(ARM_END))
  const x1 = Math.max(X(POST_X + 0.06), X(ARM_END))
  p.rect(x0 - 0.02 * k, Y(ARM_Y - 0.045), x1 - x0 + 0.04 * k, 0.09 * k, 0.025 * k)
  p.stroke(alpha(p, HALL.gilt, 0.7))
  p.strokeWeight(weight * 0.45)
  if (x1 - x0 > 0.1 * k) p.line(x0 + 0.03 * k, Y(ARM_Y - 0.028), x1 - 0.03 * k, Y(ARM_Y - 0.028))

  // A cam on the arm's face over each tail, turning with the camshaft: its lobe comes round and presses the tail
  // down (the tip up at the top of its throw) and lets it go (the stick falls onto the head).
  const psi = cams(T)
  for (const [which, off] of [['left', 0], ['right', 0.5]] as const) {
    const at = P(CAM_AT[which])
    const u = psi + off
    const rot = Math.PI / 2 + (u - Math.floor(u) - 0.5) * Math.PI * 2
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.fill(IRON_LIT)
    p.beginShape()
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2 - Math.PI
      const rr = CAM_R + CAM_LOBE * Math.pow(Math.max(0, Math.cos(t)), 2.2)
      p.vertex((at[0] + Math.cos(t + rot) * rr * Math.max(0.15, cy)) * k, (at[1] + Math.sin(t + rot) * rr) * k)
    }
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(KIT.chrome)
    p.circle(at[0] * k, at[1] * k, 0.022 * k)
  }

  // A lug under the arm at each hinge, and its pin.
  for (const which of ['left', 'right'] as const) {
    const f = STICK[which].f
    p.stroke(ink)
    p.strokeWeight(weight * 0.6)
    p.fill(IRON)
    p.beginShape()
    p.vertex(X(f[0] - 0.04), Y(ARM_Y + 0.04))
    p.vertex(X(f[0] + 0.04), Y(ARM_Y + 0.04))
    p.vertex(X(f[0] + 0.028), Y(f[1] + 0.03))
    p.vertex(X(f[0] - 0.028), Y(f[1] + 0.03))
    p.endShape(p.CLOSE)
    const pin = P(f)
    p.fill(KIT.chrome)
    p.circle(pin[0] * k, pin[1] * k, 0.04 * k)
  }
}

/* ------------------------------------------------------------------ sweat */

const SWEAT_LIFE = 0.7
const SWEAT_G = 9

/**
 * Where the playing is loudest, sweat flicks off the sticks as they strike: a few fine pale drops thrown up and out
 * from a stroke, arcing over and falling past the head, more off an accent. Each a speck drawn out along its flight
 * with a faint tail, a tenth of the ball across, so none reads as a bead.
 */
function sweat(p: p5, c: Ctx, T: number): void {
  if (T < SHIFT || T > UNWIND + SWEAT_LIFE) return
  const { k } = c
  // The strokes of the last moment, found by halving.
  let lo = 0
  let hi = CONTACTS.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (CONTACTS[mid].t < T - SWEAT_LIFE) lo = mid + 1
    else hi = mid
  }
  for (let j = lo; j < CONTACTS.length && CONTACTS[j].t <= T; j++) {
    const e = CONTACTS[j]
    const loud = level(e.t)
    const accent = ACCENTS.some((a) => Math.abs(a.t - e.t) < 0.012)
    const n = (accent ? 2 : 0) + (hash(j, 1, 5) < (loud - 0.84) * 6 ? 1 : 0)
    if (!n) continue
    const age = T - e.t
    const side = e.left ? -1 : 1
    const tip: Pt = e.left ? STICK.left.tip : STICK.right.tip
    for (let d = 0; d < n; d++) {
      const vx = side * (0.35 + 0.8 * hash(j, d, 7)) + (hash(j, d, 9) - 0.5) * 0.3
      const vy = -(1.3 + 1.3 * hash(j, d, 11))
      const x = tip[0] + vx * age
      const y = tip[1] - 0.02 + vy * age + 0.5 * SWEAT_G * age * age
      const a = 0.75 * (1 - age / SWEAT_LIFE) * Math.min(1, age / 0.02)
      if (a <= 0.01) continue
      const dvy = vy + SWEAT_G * age
      const sp = Math.hypot(vx, dvy)
      const size = 0.7 + 0.6 * hash(j, d, 13)
      // A drop: a small pale speck drawn out along its flight, a tenth of the ball across.
      p.push()
      p.translate(x * k, y * k)
      p.rotate(Math.atan2(dvy, vx))
      p.noStroke()
      p.fill(alpha(p, KIT.head, a * 0.35))
      p.ellipse(-0.03 * size * k, 0, 0.075 * size * k, 0.016 * size * k)
      p.fill(alpha(p, KIT.head, a))
      p.ellipse(0, 0, (0.03 + 0.012 * Math.min(1, sp / 3)) * size * k, 0.022 * size * k)
      p.pop()
    }
  }
}
