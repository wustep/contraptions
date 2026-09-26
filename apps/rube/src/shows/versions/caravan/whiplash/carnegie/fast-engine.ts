import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, type Ctx } from '../kit'
import { level } from '../music'
import { HALL, KIT } from '../worlds'
import { ACCENTS, CONTACTS, FIRST, HOP, HOP_MAX, LAST, SHIFT, STOMPS, UNWIND, cams, head, hopHeight, spin, sticks, strokeRate, sunk, turns } from './fast-clock'
import { FLOOR } from './stage'

/**
 * The engine of the build, drawn in the Carnegie frame (`stage.ts`: the ball rests on the snare at (-0.5, 0)). A
 * treadle machine in chrome tube and black cast iron, every part a filled form lit from above (no outlines), standing
 * between the snare and the hi-hat:
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

/** A filled material: the side away from the light, the body, and the strip the light catches. */
interface Tone {
  dark: string
  body: string
  lit: string
}

/** The post, the arm, the rod: the solo frame's dark chrome (`solo-rig.ts` `tube`), so the hall's machines are one make. */
const STEEL_BODY = mixHex(KIT.chrome, KIT.lacquer, 0.58)
const STEEL: Tone = { dark: mixHex(STEEL_BODY, KIT.lacquer, 0.45), body: STEEL_BODY, lit: KIT.chrome }
/** The flywheel and its stand: black cast iron, warm in the hall's light. */
const IRON_BODY = mixHex(HALL.black, KIT.shade, 0.55)
const IRON: Tone = { dark: mixHex(HALL.black, KIT.shade, 0.22), body: IRON_BODY, lit: mixHex(KIT.shade, KIT.chrome, 0.35) }
/** The wheel's ribs, a shade lighter than its web so they read turning. */
const RIB = mixHex(IRON_BODY, KIT.chrome, 0.28)
/** The belt: oxblood leather. */
const BELT_BODY = mixHex(KIT.oxblood, KIT.shade, 0.35)
const BELT: Tone = { dark: mixHex(BELT_BODY, KIT.lacquer, 0.5), body: BELT_BODY, lit: mixHex(KIT.oxblood, KIT.head, 0.3) }
/** The treadle: a hickory plate. */
const WOOD_BODY = mixHex(HALL.floor, KIT.hickory, 0.42)
const WOOD: Tone = { dark: mixHex(HALL.floor, KIT.lacquer, 0.35), body: WOOD_BODY, lit: mixHex(WOOD_BODY, KIT.hickory, 0.6) }
/** The cams: bright steel on the arm's dark face. */
const CAM = mixHex(STEEL_BODY, KIT.chrome, 0.5)

/** The stage's key light comes from above and a little from the house's left: every lit strip faces it. */
const KEY: Pt = [-0.35, -0.94]

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

/**
 * A length of tube or bar from `a` to `b`, `w` cells across, filled: dark along the side away from the key light,
 * the body, and one lit strip along the side that faces it. No outline.
 */
function tube(p: p5, k: number, a: Pt, b: Pt, w: number, tone: Tone, cap: 'round' | 'square' = 'round'): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1
  let nx = dy / L
  let ny = -dx / L
  if (nx * KEY[0] + ny * KEY[1] < 0) {
    nx = -nx
    ny = -ny
  }
  p.strokeCap(cap === 'round' ? p.ROUND : p.SQUARE)
  const run = (off: number, ww: number, col: string): void => {
    p.stroke(col)
    p.strokeWeight(ww * k)
    p.line((a[0] + nx * off) * k, (a[1] + ny * off) * k, (b[0] + nx * off) * k, (b[1] + ny * off) * k)
  }
  run(0, w, tone.dark)
  run(w * 0.1, w * 0.74, tone.body)
  run(w * 0.27, w * 0.17, tone.lit)
  p.strokeCap(p.ROUND)
}

/** A plate, corner at (x, y), `w` by `h` cells, filled the same way: dark below, the body, a lit strip along its top. */
function plate(p: p5, k: number, x: number, y: number, w: number, h: number, tone: Tone, r = 0.02): void {
  p.noStroke()
  p.fill(tone.dark)
  p.rect(x * k, y * k, w * k, h * k, r * k)
  p.fill(tone.body)
  p.rect(x * k, y * k, w * k, h * 0.7 * k, r * k)
  p.fill(tone.lit)
  const inset = Math.min(r, w * 0.2)
  p.rect((x + inset) * k, (y + h * 0.1) * k, (w - 2 * inset) * k, Math.max(0.012, h * 0.16) * k, h * 0.08 * k)
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
  belt(p, c, T)
  lever(p, c, T)
  drawHead(p, c, T)
  sweat(p, c, T)
  ctx.restore()
  p.pop()
}

/* ------------------------------------------------------------------ the frame and the post */

function frameBack(p: p5, c: Ctx): void {
  const { k } = c
  const { x, y, r } = WHEEL
  const spread = r * 0.9
  // The A-frame: two cast iron legs from the axle to the floor, a brace between them, a foot under each.
  tube(p, k, [x - spread * 0.7, FLOOR - 0.2], [x + spread * 0.7, FLOOR - 0.2], 0.06, IRON)
  for (const s of [-1, 1]) {
    const foot = x + s * spread
    tube(p, k, [x + s * 0.02, y], [foot, FLOOR - 0.07], 0.12, IRON)
    plate(p, k, foot - 0.14, FLOOR - 0.075, 0.28, 0.075, IRON)
  }
  // The post: a chrome column from its foot plate to its cap. The head's arm rides it, the lever pivots on it, the
  // belt's pulley turns at its foot.
  tube(p, k, [POST_X, POST_TOP], [POST_X, FLOOR - 0.06], 0.14, STEEL, 'square')
  plate(p, k, POST_X - 0.18, FLOOR - 0.085, 0.36, 0.085, STEEL)
  plate(p, k, POST_X - 0.1, POST_TOP - 0.07, 0.2, 0.08, STEEL)
}

/* ------------------------------------------------------------------ the flywheel */

/** How far a rib may smear before its smear meets the next rib's: from there on the web is one even blur. */
const FULL = (Math.PI * 2) / 5

function wheel(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const { x, y, r, rim, hub } = WHEEL
  const a = turns(T) * Math.PI * 2
  const w = spin(T)
  const swept = Math.abs(w) * Math.PI * 2 * SHUTTER
  p.push()
  p.translate(x * k, y * k)
  p.noStroke()
  // The rim: a heavy iron ring, its outer edge cut in ratchet teeth for the pawl; at speed the teeth run together.
  const teeth = 28
  const blurTeeth = swept > 0.12
  p.fill(IRON.body)
  p.beginShape()
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
  p.endShape(p.CLOSE)
  // The web: a solid cast disc inside the rim, in the rim's shadow.
  p.fill(IRON.dark)
  p.circle(0, 0, 2 * (r - rim) * k)
  ribs(p, k, a, Math.sign(w) * swept)
  // The boss the ribs run out of.
  p.fill(IRON.body)
  p.circle(0, 0, 2 * hub * k)
  // One highlight, on the rim where the key light catches it, up with the music: a soft band and its bright core.
  const lit = 0.5 + 0.4 * level(T)
  p.noFill()
  p.strokeCap(p.ROUND)
  p.stroke(IRON.lit)
  p.strokeWeight(rim * 0.55 * k)
  p.arc(0, 0, 2 * (r - rim * 0.5) * k, 2 * (r - rim * 0.5) * k, Math.PI * 1.04, Math.PI * 1.5)
  p.stroke(alpha(p, KIT.chrome, lit))
  p.strokeWeight(rim * 0.26 * k)
  p.arc(0, 0, 2 * (r - rim * 0.42) * k, 2 * (r - rim * 0.42) * k, Math.PI * 1.13, Math.PI * 1.38)
  p.pop()
}

/**
 * Five gently swept ribs from the boss to the rim, turned by `a`, cast in relief on the web. Their speed is a smear of
 * the fill itself: each rib swept back over the shutter (`sweep`, radians, signed with the turning) as a fan whose
 * fill thins as it widens, densest at the rib's leading edge. Past `FULL` the fans meet and the web is an even blur.
 */
function ribs(p: p5, k: number, a: number, sweep: number): void {
  const { r, rim, hub } = WHEEL
  const r0 = hub * 0.8
  const r1 = r - rim + 0.01
  const bend = 0.14
  const w0 = 0.042
  const w1 = 0.028
  const N = 10
  const s = Math.max(-FULL, Math.min(FULL, sweep))
  // How far past a full smear it is: the fans fade into one even tint of the web.
  const even = clamp01((Math.abs(sweep) - FULL) / FULL)
  const hw = (w0 + w1) / (r0 + r1)
  const layers = Math.abs(s) < 0.03 ? 1 : 5
  p.noStroke()
  for (let L = 1; L <= layers; L++) {
    const sw = (s * L) / layers
    const cover = (2 * hw) / (2 * hw + Math.abs(sw))
    if (layers === 1) p.fill(RIB)
    else p.fill(alpha(p, RIB, 0.36 * cover * (1 - even)))
    for (let i = 0; i < 5; i++) {
      const b = a + (i / 5) * Math.PI * 2
      p.beginShape()
      for (let j = 0; j <= N; j++) {
        const u = j / N
        const rr = r0 + (r1 - r0) * u
        const at = b + bend * Math.pow(u, 1.6) + (w0 + (w1 - w0) * u) / rr + Math.max(0, -sw)
        p.vertex(Math.cos(at) * rr * k, Math.sin(at) * rr * k)
      }
      for (let j = N; j >= 0; j--) {
        const u = j / N
        const rr = r0 + (r1 - r0) * u
        const at = b + bend * Math.pow(u, 1.6) - (w0 + (w1 - w0) * u) / rr - Math.max(0, sw)
        p.vertex(Math.cos(at) * rr * k, Math.sin(at) * rr * k)
      }
      p.endShape(p.CLOSE)
    }
  }
  if (even > 0) {
    // The even blur: the ribs' iron spread round the whole web.
    p.noFill()
    p.stroke(alpha(p, RIB, even * ((5 * 2 * hw) / (Math.PI * 2)) * 1.3))
    p.strokeWeight((r1 - r0) * k)
    p.circle(0, 0, (r0 + r1) * k)
    p.noStroke()
  }
}

/* ------------------------------------------------------------------ the belt */

/** The belt's width, cells. */
const BW = 0.055

function belt(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const c1: Pt = [WHEEL.x, WHEEL.y]
  const r1 = 0.075
  const c2 = PULLEY
  const r2 = 0.07
  const dx = c2[0] - c1[0]
  const dy = c2[1] - c1[1]
  const L = Math.hypot(dx, dy)
  const base = Math.atan2(dy, dx)
  const beta = Math.acos((r1 - r2) / L)
  // The two runs: a leather band, lit along its top.
  for (const s of [-1, 1]) {
    const t = base + s * beta
    const a: Pt = [c1[0] + Math.cos(t) * r1, c1[1] + Math.sin(t) * r1]
    const b: Pt = [c2[0] + Math.cos(t) * r2, c2[1] + Math.sin(t) * r2]
    tube(p, k, a, b, BW, BELT)
  }
  // The pulleys, the belt wrapped round each: leather over iron, a nickel axle cap, and a key in the iron that turns
  // with it (lost in the blur at speed).
  const turn = turns(T) * Math.PI * 2
  const swept = Math.abs(spin(T)) * Math.PI * 2 * SHUTTER
  for (const [cc, rr, ang] of [
    [c1, r1, turn],
    [c2, r2, (turn * r1) / r2],
  ] as const) {
    p.noFill()
    p.stroke(BELT.dark)
    p.strokeWeight(BW * k)
    p.circle(cc[0] * k, cc[1] * k, 2 * rr * k)
    p.stroke(BELT.body)
    p.strokeWeight(BW * 0.6 * k)
    p.arc(cc[0] * k, cc[1] * k, 2 * (rr + BW * 0.08) * k, 2 * (rr + BW * 0.08) * k, Math.PI * 0.85, Math.PI * 2.15)
    p.noStroke()
    const inner = rr - BW / 2
    p.fill(IRON.dark)
    p.circle(cc[0] * k, cc[1] * k, 2 * inner * k)
    p.fill(IRON.body)
    p.circle((cc[0] - 0.006) * k, (cc[1] - 0.008) * k, 2 * inner * 0.82 * k)
    const key = 1 - clamp01(swept / 0.45)
    if (key > 0) {
      p.fill(alpha(p, IRON.lit, key))
      p.circle((cc[0] + Math.cos(ang) * inner * 0.6) * k, (cc[1] + Math.sin(ang) * inner * 0.6) * k, 0.02 * k)
    }
    p.fill(KIT.chrome)
    p.circle(cc[0] * k, cc[1] * k, 0.028 * k)
  }
}

/* ------------------------------------------------------------------ the lever and its pushrod */

function lever(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const th = drawnAngle(T)
  const drop = (ROD_X - LEVER.x0) * Math.sin(th)
  const rod: Pt = [LEVER.x0 + (ROD_X - LEVER.x0) * Math.cos(th), LEVER.y + drop + LEVER.th / 2]
  // The pushrod, down to the pawl on the rim's teeth near its top: a chrome rod, with the pawl's hook at its foot,
  // pushed down with the lever on every stomp.
  const ang = -Math.PI / 2 + 0.2
  const pawl: Pt = [WHEEL.x + Math.cos(ang) * (WHEEL.r + 0.02), WHEEL.y + Math.sin(ang) * (WHEEL.r + 0.02) + drop]
  tube(p, k, rod, pawl, 0.055, STEEL)
  p.noStroke()
  const hook = (dx: number, dy: number, s: number): void => {
    p.beginShape()
    p.vertex((pawl[0] - 0.045 * s + dx) * k, (pawl[1] - 0.035 * s + dy) * k)
    p.vertex((pawl[0] + 0.04 * s + dx) * k, (pawl[1] - 0.035 * s + dy) * k)
    p.vertex((pawl[0] - 0.05 * s + dx) * k, (pawl[1] + 0.055 * s + dy) * k)
    p.endShape(p.CLOSE)
  }
  p.fill(STEEL.dark)
  hook(0, 0, 1)
  p.fill(STEEL.body)
  hook(-0.004, -0.006, 0.8)
  p.fill(STEEL.lit)
  p.rect((pawl[0] - 0.036) * k, (pawl[1] - 0.034) * k, 0.06 * k, 0.012 * k, 0.006 * k)
  // The treadle: a hickory plate on its pivot at the post, the rod's clevis under it, a chrome shoe at the toe.
  p.push()
  p.translate(LEVER.x0 * k, LEVER.y * k)
  p.rotate(th)
  const run = LEVER.x1 - LEVER.x0
  p.noStroke()
  p.fill(STEEL.dark)
  p.rect((ROD_X - LEVER.x0 - 0.035) * k, (LEVER.th / 2 + 0.02) * k, 0.07 * k, 0.045 * k, 0.012 * k)
  // Deeper than the face he rides (`LEVER.th`): the plate's heft hangs below it.
  const deep = LEVER.th + 0.035
  plate(p, k, -0.07, -LEVER.th / 2, run + 0.07, deep, WOOD, 0.025)
  plate(p, k, run - 0.11, -LEVER.th / 2 - 0.006, 0.11, deep + 0.012, STEEL, 0.02)
  // The pivot's boss, and its pin.
  p.noStroke()
  p.fill(STEEL.dark)
  p.circle(0, 0, 0.13 * k)
  p.fill(STEEL.body)
  p.circle(-0.006 * k, -0.008 * k, 0.1 * k)
  p.fill(KIT.chrome)
  p.circle(0, 0, 0.035 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the head: arm, camshaft, cams, sticks */

/** The arm's depth, cells: a chrome box beam, as heavy as the post. */
const ARM_W = 0.14

function drawHead(p: p5, c: Ctx, T: number): void {
  const { k } = c
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

  // A lug under the arm at each hinge, and its pin.
  for (const which of ['left', 'right'] as const) {
    const f = STICK[which].f
    p.noStroke()
    p.fill(STEEL.dark)
    p.beginShape()
    p.vertex(X(f[0] - 0.04), Y(ARM_Y + 0.04))
    p.vertex(X(f[0] + 0.04), Y(ARM_Y + 0.04))
    p.vertex(X(f[0] + 0.028), Y(f[1] + 0.03))
    p.vertex(X(f[0] - 0.028), Y(f[1] + 0.03))
    p.endShape(p.CLOSE)
    const pin = P(f)
    p.fill(KIT.chrome)
    p.circle(pin[0] * k, pin[1] * k, 0.036 * k)
  }

  // The arm: a chrome box beam off the post, out over the snare, the camshaft inside it; a collar round the post
  // where it rides.
  const x0 = Math.min(X(POST_X), X(ARM_END)) - 0.03 * k
  const x1 = Math.max(X(POST_X), X(ARM_END)) + 0.03 * k
  plate(p, k, x0 / k, (Y(ARM_Y) - (ARM_W / 2) * k) / k, (x1 - x0) / k, ARM_W, STEEL, 0.035)
  plate(p, k, POST_X - 0.1, ARM_Y - lift - ARM_W / 2 - 0.035, 0.2, ARM_W + 0.07, STEEL, 0.025)

  // A cam on the arm's face over each tail, turning with the camshaft: its lobe comes round and presses the tail
  // down (the tip up at the top of its throw) and lets it go (the stick falls onto the head). Bright steel with its
  // shadow on the arm under it.
  const psi = cams(T)
  for (const [which, off] of [['left', 0], ['right', 0.5]] as const) {
    const at = P(CAM_AT[which])
    const u = psi + off
    const rot = Math.PI / 2 + (u - Math.floor(u) - 0.5) * Math.PI * 2
    const cam = (dx: number, dy: number): void => {
      p.beginShape()
      for (let i = 0; i < 24; i++) {
        const t = (i / 24) * Math.PI * 2 - Math.PI
        const rr = CAM_R + CAM_LOBE * Math.pow(Math.max(0, Math.cos(t)), 2.2)
        p.vertex((at[0] + dx + Math.cos(t + rot) * rr * Math.max(0.15, cy)) * k, (at[1] + dy + Math.sin(t + rot) * rr) * k)
      }
      p.endShape(p.CLOSE)
    }
    p.noStroke()
    p.fill(STEEL.dark)
    cam(0.007, 0.012)
    p.fill(CAM)
    cam(0, 0)
    p.fill(STEEL.dark)
    p.circle(at[0] * k, at[1] * k, 0.03 * k)
    p.fill(KIT.chrome)
    p.circle(at[0] * k, at[1] * k, 0.014 * k)
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
