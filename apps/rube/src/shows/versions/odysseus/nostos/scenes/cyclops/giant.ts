import { blob, mix, ring, smooth, smoother, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { BOULDER_IN, BOULDER_OUT, BOULDER_R, EYE, SPLASH_X, T } from './plan'
import { FLOCK, HAND_X } from './sheep'

/**
 * Polyphemus: a hill of a man, drawn as one dark silhouette and an arm, never as a face. He lies asleep along the floor
 * inside his door like a heap of rock; his hand drags the boulder into the mouth; his one eye opens in the dark, tall
 * and narrow, at the end of the heap; he heaves up sitting by the fire, takes two men, and sleeps sitting; the club comes
 * up into the eye; he rears with his hand over it, gropes to the door, grinds the boulder out, and sits there with his
 * hand across the door, feeling the backs of his flock as they go out. Then, on the ridge, against the sky, the throw.
 *
 * A pose is his outline (the same eighteen points in every pose, so one eases into another point by point), his eye,
 * and his near arm. He faces east, into his cave, throughout.
 */

interface Pose {
  /** His outline, clockwise from the floor behind him: back, hunch, head, face, chest, knee, foot. */
  line: Pt[]
  eye: Pt
  /** His near arm: shoulder, elbow, hand. */
  shoulder: Pt
  elbow: Pt
  hand: Pt
}

/** Sitting up by the fire, awake: a great hunched back, the head low and forward, a knee up. */
const SIT: Pose = {
  line: [
    [99.0, -2.6],
    [98.7, -4.2],
    [99.1, -6.2],
    [100.2, -7.9],
    [101.6, -8.8],
    [103.0, -8.7],
    [103.8, -8.2],
    [104.4, -8.25],
    [105.1, -7.85],
    [105.35, -7.25],
    [105.05, -6.75],
    [104.3, -6.55],
    [103.95, -5.7],
    [104.5, -5.0],
    [104.85, -4.4],
    [104.55, -3.3],
    [105.25, -2.6],
    [102.0, -2.6],
  ],
  eye: [104.95, -7.36],
  shoulder: [102.8, -7.9],
  elbow: [103.35, -5.55],
  hand: [102.95, -3.05],
}

/** Moves the head (outline points 6 to 11) and the eye by `d`, and the whole of him by `all`. */
function moved(p: Pose, d: Pt, all: Pt = [0, 0]): Pose {
  const s = (q: Pt, head: boolean): Pt => [q[0] + all[0] + (head ? d[0] : 0), q[1] + all[1] + (head ? d[1] : 0)]
  return {
    line: p.line.map((q, i) => s(q, i >= 6 && i <= 11)),
    eye: s(p.eye, true),
    shoulder: s(p.shoulder, false),
    elbow: s(p.elbow, false),
    hand: s(p.hand, false),
  }
}

/** Asleep sitting up: the head down a little, the eye where the club's point comes up to. */
const SLEEP: Pose = moved(SIT, [EYE[0] - SIT.eye[0], EYE[1] - SIT.eye[1]])

/** Asleep along the floor inside his door: a long low heap, his head at its east end, his hand by the door. */
const LIE: Pose = {
  line: [
    [97.6, -2.6],
    [97.65, -3.4],
    [98.4, -4.2],
    [99.6, -4.75],
    [101.0, -4.95],
    [102.4, -4.7],
    [103.1, -4.3],
    [103.7, -4.4],
    [104.4, -4.2],
    [104.75, -3.65],
    [104.6, -3.1],
    [104.0, -2.85],
    [103.6, -2.7],
    [103.2, -2.65],
    [102.6, -2.62],
    [101.8, -2.6],
    [100.6, -2.6],
    [99.0, -2.6],
  ],
  eye: [104.45, -3.76],
  shoulder: [101.9, -4.2],
  elbow: [100.1, -3.15],
  hand: [98.35, -2.92],
}

/** Thrown back, the hand over the eye. */
const REAR: Pose = {
  line: [
    [99.2, -2.6],
    [98.9, -4.4],
    [99.2, -6.6],
    [99.9, -8.4],
    [101.0, -9.5],
    [102.1, -9.8],
    [102.6, -9.6],
    [103.1, -9.9],
    [103.8, -9.7],
    [104.1, -9.1],
    [103.9, -8.55],
    [103.3, -8.3],
    [103.4, -6.6],
    [104.3, -5.1],
    [104.7, -4.5],
    [104.5, -3.3],
    [105.2, -2.6],
    [102.0, -2.6],
  ],
  eye: [103.85, -9.2],
  shoulder: [102.4, -8.7],
  elbow: [104.6, -8.0],
  hand: [103.95, -9.25],
}

/** Sitting in the doorway, blind, the head hung, the hand across the door. */
const DOOR: Pose = {
  ...moved(SIT, [-0.1, 0.35], [-1.7, 0]),
  shoulder: [100.9, -7.7],
  elbow: [99.2, -5.3],
  hand: [HAND_X + 0.05, -3.12],
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const lp = (a: Pt, b: Pt, u: number): Pt => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]
function mixPose(a: Pose, b: Pose, u: number): Pose {
  return {
    line: a.line.map((q, i) => lp(q, b.line[i], u)),
    eye: lp(a.eye, b.eye, u),
    shoulder: lp(a.shoulder, b.shoulder, u),
    elbow: lp(a.elbow, b.elbow, u),
    hand: lp(a.hand, b.hand, u),
  }
}

/** Where the two men stand when the hand comes for them. */
export const PREY: Pt = [105.33, -2.95]

/** The boulder's middle at `t`: on the shelf, dragged up into the mouth, and later ground out again. */
export function boulderAt(t: number): Pt {
  const shut = smoother(t, T.shut - 0.75, T.shut)
  const open = smoother(t, T.open, T.open + 0.9)
  const u = shut * (1 - open)
  // It settles in the gap on the two knocks after the shut: a short rock back and forth.
  const settle = 0.05 * ring(t, T.shut, 1.6, 0.35)
  return [lerp(BOULDER_OUT[0], BOULDER_IN[0], u) + settle * (1 - open), lerp(BOULDER_OUT[1], BOULDER_IN[1], u)]
}

/** How far the boulder has turned (it rolls as it moves). */
export const boulderTurn = (t: number): number => (boulderAt(t)[0] - BOULDER_OUT[0]) / BOULDER_R

/** His pose at `t`. */
export function poseAt(t: number): Pose {
  let p: Pose
  if (t < T.flare) p = LIE
  else if (t < T.flare + 1.45) p = mixPose(LIE, SIT, smoother(t, T.flare, T.flare + 1.45))
  else if (t < T.sleep) p = SIT
  else if (t < T.strike) p = mixPose(SIT, SLEEP, smoother(t, T.sleep, T.sleep + 1.4))
  else if (t < T.rear) p = SLEEP
  else if (t < T.rear + 1.1) p = mixPose(SLEEP, REAR, smoother(t, T.rear, T.rear + 1.1))
  else if (t < T.grope - 1.2) p = REAR
  else p = mixPose(REAR, DOOR, smoother(t, T.grope - 1.2, T.grope + 1.9))
  // The heave of his breathing, asleep or not, and the shudder of the blow (the head most).
  const breath = 0.035 * Math.sin(t * 1.4)
  const jolt = 0.12 * ring(t, T.strike, 2.6, 0.3)
  p = moved(p, [jolt, -jolt * 0.4], [0, breath])
  return { ...p, hand: handAt(t, p) }
}

/** Where his near hand is at `t`, given the rest of him. */
function handAt(t: number, p: Pose): Pt {
  // The door: out through the mouth to the boulder's far side, and dragging it in.
  if (t >= T.reachDoor - 0.2 && t < T.shut + 1.6) {
    const b = boulderAt(t)
    const grip: Pt = [b[0] - BOULDER_R * 0.5, b[1] - BOULDER_R * 0.62]
    const out = smoother(t, T.reachDoor - 0.2, T.reachDoor + 0.45)
    const back = smoother(t, T.shut + 0.25, T.shut + 1.6)
    return lp(lp(LIE.hand, grip, out), LIE.hand, back)
  }
  // The two men: reaching, closing on them, up into the dark, and down again empty.
  if (t >= T.reach && t < T.gone + 1.4) {
    const reach = smoother(t, T.reach, T.grab)
    const up = smoother(t, T.lift, T.gone)
    const down = smoother(t, T.gone, T.gone + 1.4)
    const high: Pt = [104.2, -9.4]
    const a = lp(SIT.hand, [PREY[0] + 0.05, PREY[1] - 0.18], reach)
    return lp(lp(a, high, up), SIT.hand, down)
  }
  // The boulder ground out again, and then each back felt as it goes under.
  if (t >= T.open - 0.6 && t < T.open + 1.2) {
    const b = boulderAt(t)
    const push: Pt = [b[0] + BOULDER_R * 0.75, b[1] + 0.3]
    const on = smoother(t, T.open - 0.6, T.open)
    const off = smoother(t, T.open + 0.5, T.open + 1.2)
    return lp(lp(p.hand, push, on), DOOR.hand, off)
  }
  if (t >= T.open + 1.2) {
    let press = 0
    FLOCK.forEach((s, i) => {
      const d = Math.abs(s.x(t) - HAND_X)
      if (d < 0.35) press = Math.max(press, (1 - d / 0.35) * (i === 4 ? 1.25 : 1))
    })
    return [DOOR.hand[0], DOOR.hand[1] + 0.06 * press]
  }
  return p.hand
}

/** How open his hand is at `t`: 1 spread, 0 a fist. */
export function openAt(t: number): number {
  if (t >= T.grab - 0.15 && t < T.gone + 0.9) return 1 - smooth(t, T.grab - 0.15, T.grab + 0.1) + smooth(t, T.gone + 0.3, T.gone + 0.9)
  return 1
}

/** How open his eye is: shut asleep, open in the dark, shut again asleep, a flinch at the blow, and then shut for good. */
export function eyeAt(t: number): number {
  if (t < T.eye) return 0
  if (t < T.sleep) return smooth(t, T.eye, T.eye + 0.55)
  // Asleep; startled open by the thud of the hero landing on the club; and shut by its point.
  if (t < T.drop) return 1 - smooth(t, T.sleep, T.sleep + 1.1)
  return smooth(t, T.drop + 0.04, T.drop + 0.22) * (1 - smooth(t, T.strike - 0.02, T.strike + 0.06))
}

export interface GiantLight {
  /** His colour, and the fire's on him. */
  skin: string
  lit: string
  /** How strong the firelight is on him, 0 to 1. */
  fire: number
}

/** His outline as a path, rounded off. */
function outline(ctx: CanvasRenderingContext2D, p: Pose): void {
  blob(ctx, p.line)
}

/** The mass of him (all but the near arm), behind the balls; and the seam of the shut eye. */
export function drawBody(g: Paint, t: number, light: GiantLight): void {
  const { ctx } = g
  const p = poseAt(t)
  ctx.save()
  outline(ctx, p)
  ctx.fillStyle = light.skin
  ctx.fill()
  ctx.restore()
  outline(ctx, p)
  ctx.strokeStyle = mix(light.skin, '#000000', 0.5)
  ctx.lineWidth = Math.max(1.25 * g.px, 2 / 108)
  ctx.stroke()
  // The eye shut: a seam in the dark; once struck, a darker scar across it.
  if (eyeAt(t) < 0.02) {
    const [ex, ey] = p.eye
    ctx.beginPath()
    ctx.moveTo(ex, ey - 0.3)
    ctx.quadraticCurveTo(ex + 0.07, ey, ex, ey + 0.3)
    ctx.strokeStyle = mix(light.skin, '#000000', 0.55)
    ctx.lineWidth = Math.max(1.25 * g.px, (t > T.strike ? 3.4 : 2.2) / 108)
    ctx.stroke()
  }
}

/** A tapered limb from `a` (width `wa`) to `b` (width `wb`), rounded at both ends, added to the path (clockwise). */
function limb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, wa: number, wb: number): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  // Wound clockwise on the screen, as the arcs are, so the parts add up and never cut holes in each other.
  ctx.moveTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2)
  ctx.lineTo(b[0] - nx * wb / 2, b[1] - ny * wb / 2)
  ctx.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2)
  ctx.lineTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2)
  ctx.closePath()
  ctx.moveTo(a[0] + wa / 2, a[1])
  ctx.arc(a[0], a[1], wa / 2, 0, Math.PI * 2)
  ctx.moveTo(b[0] + wb / 2, b[1])
  ctx.arc(b[0], b[1], wb / 2, 0, Math.PI * 2)
}

/**
 * The hand: a broad mitten of a palm, its thumb, and three blunt fingers that spread or curl into a fist, turned along
 * the forearm.
 */
function hand(ctx: CanvasRenderingContext2D, h: Pt, toward: number, open: number): void {
  ctx.save()
  ctx.translate(h[0], h[1])
  ctx.rotate(toward)
  ctx.moveTo(0.36, 0)
  ctx.ellipse(0, 0, 0.36, 0.27, 0, 0, Math.PI * 2)
  for (let f = 0; f < 3; f++) {
    const spread = (f - 1) * (0.22 + 0.2 * open)
    const len = 0.12 + 0.3 * open
    const base: Pt = [Math.cos(spread) * 0.26, Math.sin(spread) * 0.26]
    const curl = spread + (1 - open) * 1.7
    const tip: Pt = [base[0] + Math.cos(curl) * len, base[1] + Math.sin(curl) * len]
    limb(ctx, base, tip, 0.17, 0.14)
  }
  // The thumb, on the near side.
  const thumb = -1.1 + 0.5 * (1 - open)
  limb(ctx, [0.05, -0.18], [0.05 + Math.cos(thumb) * 0.3, -0.18 + Math.sin(thumb) * 0.3], 0.15, 0.12)
  ctx.restore()
}

/** His near arm and hand: over the balls, so a fist can close over two of them. */
export function drawArm(g: Paint, t: number, light: GiantLight): void {
  const { ctx } = g
  const p = poseAt(t)
  const open = openAt(t)
  const h = p.hand
  ctx.save()
  ctx.beginPath()
  limb(ctx, p.shoulder, p.elbow, 0.7, 0.52)
  limb(ctx, p.elbow, h, 0.52, 0.4)
  hand(ctx, h, Math.atan2(h[1] - p.elbow[1], h[0] - p.elbow[0]), open)
  ctx.fillStyle = light.skin
  ctx.fill('nonzero')
  ctx.restore()
}

/**
 * The eye: tall and narrow, set upright on the side of his head, drawn over the dark so it is seen when nothing else
 * is. Its pupil is a dark upright slit that turns to whatever it is looking at.
 */
export function drawEye(g: Paint, t: number, look: Pt, colors: { white: string; iris: string; pupil: string; skin: string }): void {
  const open = eyeAt(t)
  if (open < 0.02) return
  const { ctx } = g
  const [ex, ey] = poseAt(t).eye
  const H = 0.8
  const W = 0.36
  const h = H * open
  const lens = () => {
    ctx.beginPath()
    ctx.moveTo(ex, ey - h / 2)
    ctx.quadraticCurveTo(ex + W, ey, ex, ey + h / 2)
    ctx.quadraticCurveTo(ex - W, ey, ex, ey - h / 2)
    ctx.closePath()
  }
  ctx.save()
  lens()
  ctx.fillStyle = colors.white
  ctx.fill()
  ctx.clip()
  const dx = Math.max(-1, Math.min(1, (look[0] - ex) / 3)) * W * 0.3
  const dy = Math.max(-1, Math.min(1, (look[1] - ey) / 3)) * H * 0.12
  ctx.beginPath()
  ctx.ellipse(ex + dx, ey + dy, W * 0.45, H * 0.34, 0, 0, Math.PI * 2)
  ctx.fillStyle = colors.iris
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(ex + dx, ey + dy, W * 0.11, H * 0.26, 0, 0, Math.PI * 2)
  ctx.fillStyle = colors.pupil
  ctx.fill()
  ctx.restore()
  lens()
  ctx.strokeStyle = colors.skin
  ctx.lineWidth = Math.max(1.25 * g.px, 3 / 108)
  ctx.stroke()
}

/* ------------------------------------------------------------------ on the ridge */

/** How far up over the ridge he has come (0 hidden behind it, 1 standing over it). */
export const ridgeRise = (t: number): number => smoother(t, T.rise, T.rise + 1.0) * (1 - smoother(t, T.splash + 0.6, T.splash + 2.4))

/** The rock in his hand, raised, thrown, and falling: where it is at `t`, or null when it is not in the air. */
export function thrownRock(t: number, ridge: Pt): Pt | null {
  const at = rockHand(t, ridge)
  if (t < T.hurl) return t > T.rise + 0.4 ? at : null
  if (t > T.splash) return null
  // From his hand at the throw to the sea, under the show's gravity: the one parabola that does it in the time.
  const a = rockHand(T.hurl, ridge)
  const b: Pt = [SPLASH_X, 0]
  const D = T.splash - T.hurl
  const s = t - T.hurl
  const vx = (b[0] - a[0]) / D
  const vy = (b[1] - a[1] - 0.5 * 26 * D * D) / D
  return [a[0] + vx * s, a[1] + vy * s + 0.5 * 26 * s * s]
}

export const SPLASH_AT = SPLASH_X

/** How far he stands up out of the ridge, in cells, when he is all the way up, and how big he is drawn. */
const RISE = 13
const BIG = 1.35

/** Where he is on the ridge at `t`: his waist on the ridge line, risen as far as he has come. */
function ridgeBase(t: number, ridge: Pt): Pt {
  return [ridge[0], ridge[1] + RISE * (1 - ridgeRise(t))]
}

/** The rock over his head in both hands: lifted, held back over his head, and brought over and down on the throw. */
function rockHand(t: number, ridge: Pt): Pt {
  const lift = smoother(t, T.rise + 0.2, T.rise + 0.9)
  const wind = smoother(t, T.rise + 0.9, T.hurl - 0.25)
  const over = smoother(t, T.hurl - 0.25, T.hurl)
  const [x, y] = ridgeBase(t, ridge)
  const chest: Pt = [x + 1.8 * BIG, y - 7.0 * BIG]
  const high: Pt = [x + 0.6 * BIG, y - 15.0 * BIG]
  const back: Pt = [x - 1.2 * BIG, y - 14.6 * BIG]
  const release: Pt = [x + 4.4 * BIG, y - 12.6 * BIG]
  return lp(lp(lp(chest, high, lift), back, wind), release, over)
}

/**
 * Him on the ridge, risen up out of its far side to the waist: a broad back, a head low and forward on a thick neck, and
 * both arms bent up over it with a lump of the hill, then brought over: one dark shape against the grey sky, its parts
 * each clear of the others so it reads at a glance.
 */
export function drawRidge(g: Paint, t: number, ridge: Pt, skin: string, rock: string, ink: string): void {
  if (ridgeRise(t) <= 0.001) return
  const { ctx } = g
  const [x, y] = ridgeBase(t, ridge)
  const k = BIG
  const P = (px: number, py: number): Pt => [x + px * k, y + py * k]
  const at = rockHand(t, ridge)
  const held = t < T.hurl
  const after = smoother(t, T.hurl, T.hurl + 0.6)
  const hands: Pt = held ? at : lp(rockHand(T.hurl, ridge), P(4.6, -6.4), after)
  ctx.fillStyle = skin
  // The trunk: broad at the shoulders, narrower to the waist where the ridge cuts him off.
  blob(ctx, [P(-3.0, 2.0), P(-3.5, -2.0), P(-3.8, -5.6), P(-3.2, -8.1), P(-1.0, -9.0), P(1.6, -8.8), P(2.6, -7.2), P(2.3, -3.4), P(2.7, 2.0)])
  ctx.fill()
  // The head, low and forward: a heavy brow, a jaw.
  blob(ctx, [P(1.9, -9.6), P(2.2, -10.9), P(3.3, -11.3), P(4.3, -10.8), P(4.6, -9.9), P(4.2, -9.2), P(3.9, -8.4), P(2.8, -8.2)])
  ctx.fill()
  // The neck, and the arms: from both shoulders, bent out at the elbows, up to the rock.
  ctx.beginPath()
  limb(ctx, P(0.8, -8.4), P(2.7, -9.5), 1.7 * k, 1.3 * k)
  for (const [sx, sy, side] of [[-2.4, -8.2, -1], [1.0, -8.6, 1]] as const) {
    const sh = P(sx, sy)
    const mid: Pt = [(sh[0] + hands[0]) / 2, (sh[1] + hands[1]) / 2]
    const el: Pt = [mid[0] + side * 1.6 * k, mid[1] + 0.4 * k]
    limb(ctx, sh, el, 1.45 * k, 1.15 * k)
    limb(ctx, el, hands, 1.15 * k, 0.9 * k)
  }
  ctx.fill('nonzero')
  // His one eye, put out: the tall slit in his brow, shut, a pale scar on the dark, so it is him and no other.
  const eye = P(3.75, -10.05)
  ctx.beginPath()
  ctx.moveTo(eye[0], eye[1] - 0.55 * k)
  ctx.quadraticCurveTo(eye[0] + 0.16 * k, eye[1], eye[0], eye[1] + 0.55 * k)
  ctx.quadraticCurveTo(eye[0] - 0.1 * k, eye[1], eye[0], eye[1] - 0.55 * k)
  ctx.fillStyle = mix(skin, '#C9B9A0', 0.55)
  ctx.fill()
  if (held) drawRock(g, at, rock, ink, 0)
}

/** The thrown rock: a lump of the hill. */
export function drawRock(g: Paint, at: Pt, fill: string, ink: string, turn: number): void {
  const { ctx } = g
  ctx.save()
  ctx.translate(at[0], at[1])
  ctx.rotate(turn)
  const pts: Pt[] = ([[1, 0.12], [0.66, -0.83], [-0.27, -1.04], [-0.96, -0.47], [-0.9, 0.5], [-0.13, 0.96], [0.73, 0.73]] as Pt[]).map(([px, py]) => [px * 1.9, py * 1.6])
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1.25 * g.px, 2.4 / 108)
  ctx.stroke()
  ctx.restore()
}
