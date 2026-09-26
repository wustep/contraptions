import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, type Ctx } from '../kit'
import { level } from '../music'
import { HALL, KIT } from '../worlds'
import { ACCENTS, CONTACTS, SHIFT, UNWIND, cams, head, pressAt, spin, sticks, strokeRate, sunk, turns } from './fast-clock'
import { FLOOR } from './stage'

/**
 * The engine of the build, drawn in the Carnegie frame (`stage.ts`: the ball rests on the snare at (-0.5, 0)). A
 * treadle machine in black japanned iron with gilt lines, standing between the snare and the bass:
 *
 *   the head over the snare: an arm off the post, a yoke, two sticks crossed on their fulcrums, each thrown by a cam
 *   the post, with the belt's top pulley, and the lever's pivot
 *   the lever (Andrew's), from the post out under the hi-hat; its pushrod down to the flywheel's rim
 *   the flywheel, one turn a stomp, on its A-frame on the floor
 *
 * Everything is drawn from show time; `sunk` puts it all under the stage before the rise and after the sink.
 */

/* ------------------------------------------------------------------ the geometry */

export const WHEEL = { x: 0.7, y: 1.2, r: 0.8, rim: 0.12, hub: 0.2 }
export const POST_X = 0.2
const POST_TOP = -1.62
const PULLEY: Pt = [POST_X, -1.05]
const ARM_Y = -1.05
const ARM_END = -1.14
/** The lever: pivoted on the post, its top level with the snare's head, so he rolls straight across onto it. */
export const LEVER = { x0: POST_X, x1: 1.86, y: 0.165, th: 0.07 }
/** Where Andrew stands on the lever, and where its pushrod hangs. */
export const BALL_X = 1.32
const ROD_X = 1.62
/** The sticks: fulcrums on the yoke, tips on the head when struck. `left` strikes the house's left of the head. */
const YOKE_Y = -0.6
const STICK = {
  left: { f: [-0.15, YOKE_Y] as Pt, tip: [-0.74, 0.075] as Pt },
  right: { f: [-0.85, YOKE_Y] as Pt, tip: [-0.26, 0.075] as Pt },
}
const BUTT = 0.32

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

/** The stick's butt and tip when its tip is `h` over the head (rotated about its fulcrum). */
function stickPose(which: 'left' | 'right', h: number): { butt: Pt; tip: Pt; f: Pt } {
  const s = STICK[which]
  const dx = s.tip[0] - s.f[0]
  const dy = s.tip[1] - s.f[1]
  const len = Math.hypot(dx, dy)
  const sin = Math.max(-0.2, Math.min(1, (dy - h) / len))
  const base = Math.asin(sin)
  const th = which === 'left' ? Math.PI - base : base
  const tip: Pt = [s.f[0] + Math.cos(th) * len, s.f[1] + Math.sin(th) * len]
  const butt: Pt = [s.f[0] - Math.cos(th) * BUTT, s.f[1] - Math.sin(th) * BUTT]
  return { butt, tip, f: s.f }
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
  const { x, y } = WHEEL
  // The A-frame: two cast legs from the axle to the floor, a brace, feet.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  for (const s of [-1, 1]) {
    const foot = x + s * 0.72
    p.beginShape()
    p.vertex((x + s * 0.05) * k, (y - 0.06) * k)
    p.bezierVertex((x + s * 0.3) * k, (y + 0.35) * k, (foot - s * 0.05) * k, (FLOOR - 0.5) * k, (foot + s * 0.02) * k, (FLOOR - 0.06) * k)
    p.vertex((foot + s * 0.16) * k, (FLOOR - 0.06) * k)
    p.vertex((foot + s * 0.16) * k, FLOOR * k)
    p.vertex((foot - s * 0.16) * k, FLOOR * k)
    p.vertex((foot - s * 0.16) * k, (FLOOR - 0.06) * k)
    p.bezierVertex((foot - s * 0.2) * k, (FLOOR - 0.55) * k, (x + s * 0.12) * k, (y + 0.4) * k, (x - s * 0.05) * k, (y + 0.06) * k)
    p.endShape(p.CLOSE)
  }
  p.rect((x - 0.58) * k, (FLOOR - 0.3) * k, 1.16 * k, 0.06 * k, 0.02 * k)
  // The post: the head's arm at its top, the belt's pulley, the lever's pivot.
  p.rect((POST_X - 0.045) * k, POST_TOP * k, 0.09 * k, (FLOOR - POST_TOP) * k)
  p.rect((POST_X - 0.13) * k, (FLOOR - 0.07) * k, 0.26 * k, 0.07 * k, 0.02 * k)
  p.rect((POST_X - 0.065) * k, (POST_TOP - 0.05) * k, 0.13 * k, 0.07 * k, 0.02 * k)
  // A gilt line down the post's face.
  p.stroke(alpha(p, HALL.gilt, 0.75))
  p.strokeWeight(weight * 0.5)
  p.line(POST_X * k, (POST_TOP + 0.08) * k, POST_X * k, (FLOOR - 0.12) * k)
  // The belt's top pulley.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  p.circle(PULLEY[0] * k, PULLEY[1] * k, 0.15 * k)
  p.fill(KIT.chrome)
  p.circle(PULLEY[0] * k, PULLEY[1] * k, 0.05 * k)
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
  // Six curved ribs cast on its face: crisp when slow; at speed a soft smear of where they were over the shutter.
  const copies = swept < 0.06 ? 1 : Math.min(9, 2 + Math.ceil(swept / 0.12))
  for (let j = 0; j < copies; j++) {
    const aj = copies === 1 ? a : a - (swept * j) / (copies - 1)
    const fade = copies === 1 ? 1 : 1.6 / copies
    withAlpha(p, fade, () => spokes(p, c, aj, copies === 1))
  }
  // The rim: a heavy ring, its outer edge cut in ratchet teeth for the pawl, a gilt line on its face.
  const teeth = 40
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(IRON_LIT)
  p.beginShape()
  const blurTeeth = swept > 0.12
  for (let i = 0; i < teeth; i++) {
    const t0 = a + (i / teeth) * Math.PI * 2
    const t1 = a + ((i + 0.78) / teeth) * Math.PI * 2
    if (blurTeeth) {
      p.vertex(Math.cos(t0) * (r - 0.012) * k, Math.sin(t0) * (r - 0.012) * k)
    } else {
      p.vertex(Math.cos(t0) * (r - 0.035) * k, Math.sin(t0) * (r - 0.035) * k)
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
  p.strokeWeight(weight * 0.55)
  p.circle(0, 0, 2 * (r - rim * 0.45) * k)
  // The hub: a six-sided boss, the belt's pulley on it, the axle's nickel cap.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(IRON_LIT)
  p.beginShape()
  for (let i = 0; i < 6; i++) {
    const t = a + (i / 6) * Math.PI * 2 + Math.PI / 6
    p.vertex(Math.cos(t) * hub * k, Math.sin(t) * hub * k)
  }
  p.endShape(p.CLOSE)
  p.fill(IRON)
  p.circle(0, 0, 0.17 * k)
  p.fill(KIT.chrome)
  p.circle(0, 0, 0.06 * k)
  p.pop()
}

/** Six S-curved ribs from the hub to the rim, turned by `a`: lighter iron, cast in relief on the web. */
function spokes(p: p5, c: Ctx, a: number, edged: boolean): void {
  const { k, weight } = c
  const { r, rim, hub } = WHEEL
  const r0 = hub * 0.8
  const r1 = r - rim + 0.01
  if (edged) {
    p.stroke(mixHex(IRON, KIT.chrome, 0.35))
    p.strokeWeight(weight * 0.45)
  } else p.noStroke()
  p.fill(IRON_LIT)
  for (let i = 0; i < 6; i++) {
    const b = a + (i / 6) * Math.PI * 2
    const bend = 0.32
    const w0 = 0.06
    const w1 = 0.03
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
  const r1 = 0.13
  const c2 = PULLEY
  const r2 = 0.1
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
    p.strokeWeight(weight * 1.8)
    p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
    p.stroke(BELT)
    p.strokeWeight(weight * 0.9)
    p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  }
}

/* ------------------------------------------------------------------ the lever and its pushrod */

/** The lever's angle at `T`: pressed at every stomp, springing back. */
function leverAngle(T: number): number {
  return Math.atan2(pressAt(T), BALL_X - LEVER.x0)
}

/** A point on the lever's top face, `x` along it, at `T`. */
export function leverTop(x: number, T: number): Pt {
  const th = leverAngle(T)
  const d = x - LEVER.x0
  return [LEVER.x0 + d * Math.cos(th) + (LEVER.th / 2) * Math.sin(th), LEVER.y + d * Math.sin(th) - (LEVER.th / 2) * Math.cos(th)]
}

function lever(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const th = leverAngle(T)
  const drop = (ROD_X - LEVER.x0) * Math.sin(th)
  const rod: Pt = [LEVER.x0 + (ROD_X - LEVER.x0) * Math.cos(th), LEVER.y + drop + LEVER.th / 2]
  // The pushrod, down to the pawl on the rim's teeth: nickel, with the pawl's hook at its foot, pushed down a
  // stomp's depth each stomp.
  const ang = -0.28
  const pawl: Pt = [WHEEL.x + Math.cos(ang) * (WHEEL.r + 0.03), WHEEL.y + Math.sin(ang) * (WHEEL.r + 0.03) + drop]
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
  p.vertex((pawl[0] - 0.035) * k, (pawl[1] - 0.02) * k)
  p.vertex((pawl[0] + 0.05) * k, (pawl[1] - 0.02) * k)
  p.vertex((pawl[0] - 0.05) * k, (pawl[1] + 0.07) * k)
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

/* ------------------------------------------------------------------ the head: arm, yoke, sticks, cams */

function drawHead(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const { yaw, lift } = head(T)
  const cy = Math.cos((yaw * Math.PI) / 2)
  const X = (x: number): number => (POST_X + (x - POST_X) * cy) * k
  const Y = (y: number): number => (y - lift) * k
  const P = (q: Pt): Pt => [X(q[0]) / k, Y(q[1]) / k]
  // The arm: off the post, out over the snare, the camshaft along its underside.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  const x0 = Math.min(X(POST_X + 0.06), X(ARM_END))
  const x1 = Math.max(X(POST_X + 0.06), X(ARM_END))
  p.rect(x0 - 0.02 * k, Y(ARM_Y - 0.045), x1 - x0 + 0.04 * k, 0.09 * k, 0.02 * k)
  p.stroke(alpha(p, HALL.gilt, 0.7))
  p.strokeWeight(weight * 0.45)
  if (x1 - x0 > 0.1 * k) p.line(x0 + 0.03 * k, Y(ARM_Y), x1 - 0.03 * k, Y(ARM_Y))
  // The yoke: one casting hung under the arm's end, arched between the two fulcrums it holds.
  const L = STICK.left.f
  const Rf = STICK.right.f
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  p.beginShape()
  p.vertex(X(Rf[0] - 0.1), Y(ARM_Y + 0.03))
  p.vertex(X(L[0] + 0.1), Y(ARM_Y + 0.03))
  p.bezierVertex(X(L[0] + 0.1), Y(ARM_Y + 0.2), X(L[0] + 0.07), Y(YOKE_Y - 0.1), X(L[0] + 0.05), Y(YOKE_Y + 0.04))
  p.vertex(X(L[0] - 0.06), Y(YOKE_Y + 0.05))
  p.bezierVertex(X(L[0] - 0.12), Y(YOKE_Y - 0.14), X(-0.4), Y(YOKE_Y - 0.2), X(-0.5), Y(YOKE_Y - 0.2))
  p.bezierVertex(X(-0.6), Y(YOKE_Y - 0.2), X(Rf[0] + 0.12), Y(YOKE_Y - 0.14), X(Rf[0] + 0.06), Y(YOKE_Y + 0.05))
  p.vertex(X(Rf[0] - 0.05), Y(YOKE_Y + 0.04))
  p.bezierVertex(X(Rf[0] - 0.07), Y(YOKE_Y - 0.1), X(Rf[0] - 0.1), Y(ARM_Y + 0.2), X(Rf[0] - 0.1), Y(ARM_Y + 0.03))
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(alpha(p, HALL.gilt, 0.7))
  p.strokeWeight(weight * 0.45)
  p.bezier(X(L[0] - 0.02), Y(YOKE_Y - 0.03), X(-0.35), Y(YOKE_Y - 0.26), X(-0.65), Y(YOKE_Y - 0.26), X(Rf[0] + 0.02), Y(YOKE_Y - 0.03))

  // The sticks, and their cams on the arm. Fast, each is a smear of where it was over the shutter.
  const rate = strokeRate(T)
  const n = rate < 5 ? 1 : Math.min(7, 2 + Math.floor(rate / 3))
  for (const which of ['right', 'left'] as const) {
    for (let j = n - 1; j >= 0; j--) {
      const tj = T - (SHUTTER * j) / Math.max(1, n - 1)
      const h = sticks(tj)[which]
      const pose = stickPose(which, h)
      const a = n === 1 ? 1 : j === 0 ? 0.55 : 0.5 / n
      withAlpha(p, a, () => stick(p, c, P(pose.butt), P(pose.tip)))
    }
    // The fulcrum pin.
    const f = P(STICK[which].f)
    p.stroke(ink)
    p.strokeWeight(weight * 0.6)
    p.fill(KIT.chrome)
    p.circle(f[0] * k, f[1] * k, 0.05 * k)
  }
  // The cams over the butts: egg-shaped, turning with the camshaft, each pressing its stick's butt down.
  const psi = cams(T)
  for (const [which, off] of [['left', 0], ['right', 0.5]] as const) {
    const pose = stickPose(which, sticks(T)[which])
    const bx = pose.butt[0]
    const at: Pt = P([bx, ARM_Y + 0.1])
    const rot = (psi + off) * Math.PI * 2
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.fill(IRON_LIT)
    p.beginShape()
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2
      const rr = 0.055 + 0.025 * Math.max(0, Math.cos(t))
      p.vertex((at[0] + Math.cos(t + rot) * rr * Math.max(0.15, cy)) * k, (at[1] + Math.sin(t + rot) * rr) * k)
    }
    p.endShape(p.CLOSE)
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
