import { camera } from './camera'
import { rgba } from './canvas'
import { sweepAt } from './decor'
import { CAT, LAMP, MUG } from './desk'
import { MUSIC_END, smooth } from './music'
import { MOMENTS } from './sky'
import { INK, hash, lampAt, lightAt, lit, rainAt } from './world'

/**
 * Someone at the desk. The show never shows who: the camera is where they sit, and what is seen of them is a hand in
 * a sweater's sleeve, reaching in from the camera's side now and then, as anyone at a desk does through an evening.
 * Early, while the tea is hot, it takes the mug for a sip: lifts it toward the camera and out of the picture, and
 * a few seconds later sets it back down, steaming. In the cold of the rain it comes and rests round the mug a while,
 * for the warmth. Twice it scratches the kitten under its chin, and the kitten shuts its
 * eyes and leans into it. And at the end, as the last track rings out, it turns the lamp's knob down, and goes.
 *
 * Seldom, and slow: a few seconds each, minutes apart, each while the camera is holding what it reaches for, so nothing
 * comes in at the edge of a frame unexplained. Every part of it is a function of show time.
 */

type Ctx = CanvasRenderingContext2D

type Kind = 'sip' | 'cup' | 'pet' | 'lamp'

interface Reach {
  kind: Kind
  /** When the hand starts in, and how long it stays (arriving and leaving included). */
  at: number
  dur: number
}

/** How long each takes, seconds, in and out included. */
const DUR: Record<Kind, number> = { sip: 11, cup: 13, pet: 9, lamp: 10 }
/** How long the hand takes to come in, and to go. */
const IN = 1.5
const OUT = 1.3

/** The knob on the lamp's base, on the front of its dome: what turns the lamp down. */
export const KNOB = { x: LAMP.base.x + 0.17, y: -0.085, r: 0.042 }

/** What the camera must hold the whole time for each reach: the thing reached for, and the hand on it. */
const BOX: Record<Kind, [number, number, number, number]> = {
  sip: [MUG.x - 0.75, -MUG.h - 0.1, MUG.x + 0.45, 0.25],
  cup: [MUG.x - 0.75, -MUG.h - 0.1, MUG.x + 0.45, 0.25],
  pet: [CAT.x0, -1.1, CAT.head.x + 0.75, 0.25],
  lamp: [LAMP.base.x - 0.4, -0.45, LAMP.base.x + 0.7, 0.2],
}

/** Whether the camera's frame holds `box` from `t0` to `t1`, clear of its edges. */
function held(box: [number, number, number, number], t0: number, t1: number): boolean {
  const [x0, y0, x1, y1] = box
  for (let s = t0; s <= t1; s += 0.5) {
    const c = camera(s)
    const hh = c.cells / 2
    const hw = (hh * 16) / 9
    if (x0 < c.x - hw + 0.1 || x1 > c.x + hw - 0.1 || y0 < c.y - hh + 0.1 || y1 > c.y + hh - 0.05) return false
  }
  return true
}

/**
 * When it reaches in: worked out once, at load. Each at the first moment in its stretch of the night that the camera
 * holds what it reaches for all the while, clear of a car's lights, the lightning and the shooting stars (the cat has
 * its eyes on those), and of each other.
 */
export const REACHES: Reach[] = (() => {
  const out: Reach[] = []
  const busy = (t: number, d: number) =>
    [...MOMENTS.lightning, ...MOMENTS.shooting, ...MOMENTS.crossings.map(([c]) => c)].some((m) => m > t - 8 && m < t + d + 6) ||
    out.some((r) => Math.abs(r.at - t) < 90) ||
    (() => {
      for (let s = t - 2; s <= t + d + 2; s += 0.5) if (sweepAt(s).a > 0.01) return true
      return false
    })()
  const find = (kind: Kind, from: number, to: number, ok: (t: number) => boolean = () => true) => {
    const d = DUR[kind]
    for (let t = from; t < to; t += 1) {
      if (ok(t) && !busy(t, d) && held(BOX[kind], t - 1, t + d + 1)) {
        out.push({ kind, at: t, dur: d })
        return
      }
    }
  }
  // A sip while the tea is hot: in the second track.
  find('sip', 160, 420)
  // Hands round the mug, in the heaviest of the rain.
  find('cup', 600, 1250, (t) => rainAt(t) > 0.65)
  // The kitten, twice, well apart: once in the rain, once late in the clear night.
  find('pet', 560, 900)
  find('pet', 1200, 1660)
  // The lamp, turned down as the last track rings out: the knob turns as the light goes (`lampAt`).
  out.push({ kind: 'lamp', at: MUSIC_END - 3.6, dur: DUR.lamp })
  return out.sort((a, b) => a.at - b.at)
})()

/** The hand at `t`: what it is doing, how far in it is (`k`), and how far through (`s`, seconds since it started). */
function reachAt(t: number): { r: Reach; k: number; s: number } | null {
  for (const r of REACHES) {
    const s = t - r.at
    if (s < 0 || s > r.dur) continue
    const k = smooth(s, 0, IN) * (1 - smooth(s, r.dur - OUT, r.dur))
    return { r, k, s }
  }
  return null
}

/** How far the kitten is in a chin scratch, 0 to 1: for `cat.ts`, which shuts its eyes and leans into it. */
export function petAt(t: number): number {
  const h = reachAt(t)
  if (!h || h.r.kind !== 'pet') return 0
  return smooth(h.s, IN - 0.2, IN + 0.6) * (1 - smooth(h.s, h.r.dur - OUT - 0.4, h.r.dur - OUT + 0.4))
}

/** Where the hand's fingertips are, and how much it is there: for the cat to glance at. */
export function handAt(t: number): { x: number; y: number; a: number } {
  const p = poseAt(t)
  if (!p) return { x: 0, y: 0, a: 0 }
  const up = p.r.kind === 'sip' ? sipAt(t) : 0
  const e = p.r.kind === 'sip' ? travelAt(t) : 0
  const at = sipped(up, e, p.tip.x, p.tip.y)
  return { x: at.x, y: at.y, a: p.k * (1 - e) }
}

/**
 * How far the mug is off the desk for a sip, 0 (standing) to 1 (at someone's lips, out of the picture): lifted after
 * the hand has it, held a few seconds, and set back down before the hand lets go.
 */
export function sipAt(t: number): number {
  const h = reachAt(t)
  if (!h || h.r.kind !== 'sip') return 0
  return smooth(h.s, 2.0, 2.6) * (1 - smooth(h.s, 8.5, 9.1))
}

/** How far toward the lips it has gone (after it is lifted off the desk, and back before it is set down). */
function travelAt(t: number): number {
  const h = reachAt(t)
  if (!h || h.r.kind !== 'sip') return 0
  return smooth(h.s, 2.4, 4.3) * (1 - smooth(h.s, 6.7, 8.7))
}

/**
 * Where a point on the mug (or the hand on it) is: lifted off the desk (`up`), then `e` of the way to the lips, toward
 * the camera, so it grows as it comes and leaves the picture at its foot, where someone sitting at the desk would be.
 */
function sipped(up: number, e: number, x: number, y: number): { x: number; y: number } {
  const g = 1 + 2.2 * e * e
  return { x: MUG.x + (x - MUG.x) * g + 0.6 * e, y: y * g - 0.25 * up + 2.6 * e }
}

/** How far the lamp's knob is turned, 0 (up) to 1 (down to a glow): it turns as the lamp goes down. */
export const knobAt = (t: number): number => smooth(t, MUSIC_END - 1.5, MUSIC_END + 4.5)

interface Pose {
  r: Reach
  s: number
  k: number
  /** Which hand: 1 the right, -1 the left. */
  side: 1 | -1
  wrist: { x: number; y: number }
  /** Which way the fingers point (radians from straight up, clockwise), and which way the forearm runs from the wrist. */
  angle: number
  arm: number
  /** Each finger's curl (index to little), 0 straight to 1 folded under; the thumb's; and how far finger and thumb pinch. */
  curl: [number, number, number, number]
  thumb: number
  pinch: number
  tip: { x: number; y: number }
}

/** The hand's shape: from the wrist, the palm's length and width, and each finger's base, length. */
const PALM = { len: 0.4, w: 0.46 }
const FINGERS = [
  { x: -0.15, len: 0.3 },
  { x: -0.05, len: 0.33 },
  { x: 0.05, len: 0.31 },
  { x: 0.145, len: 0.25 },
]
const FINGER_W = 0.1

/** Where a pose's reach is, before it slides in along the arm. */
function poseAt(t: number): Pose | null {
  const h = reachAt(t)
  if (!h) return null
  const { r, k, s } = h
  const dir = (a: number) => ({ x: Math.sin(a), y: -Math.cos(a) })
  let side: 1 | -1 = 1
  let angle = 0
  let arm = 0
  let tip = { x: 0, y: 0 }
  let curl: [number, number, number, number] = [0.2, 0.2, 0.2, 0.25]
  let thumb = 0.2
  let pinch = 0
  let reach = PALM.len + 0.3
  if (r.kind === 'pet') {
    // Under the chin, from the right and below, the fingers scratching in little bursts.
    side = 1
    angle = -0.6
    arm = 2.75
    const burst = Math.max(0, Math.sin(s * 1.3)) ** 2
    const sc = Math.sin(s * 15) * burst
    curl = [0.35 + 0.2 * sc, 0.35 - 0.2 * sc, 0.4 + 0.2 * sc, 0.5]
    thumb = 0.6
    const d = dir(angle)
    const at = { x: CAT.head.x + 0.1, y: CAT.head.y + 0.16 }
    tip = { x: at.x + d.x * 0.015 * sc, y: at.y + d.y * 0.015 * sc }
    reach = PALM.len + 0.3 * (1 - 0.5 * 0.4)
  } else if (r.kind === 'cup' || r.kind === 'sip') {
    // Round the mug's front, the fingers wrapped round its far side: for the warmth, now and then a finger tapping;
    // or to take it up for a sip (`sipAt`), the grip a little firmer.
    side = -1
    angle = 1.45
    arm = 3.7
    const tap = r.kind === 'cup' ? Math.max(0, Math.sin(s * 3.1)) ** 8 * (hash(Math.floor(s / 2), 5) < 0.4 ? 1 : 0) : 0
    curl = [0.35 - 0.25 * tap, 0.35, 0.4, 0.45]
    thumb = 1
    tip = { x: MUG.x + MUG.halfW - 0.02, y: -MUG.h * 0.48 }
    reach = PALM.len + 0.3 * 0.62
  } else {
    // The lamp's knob, between finger and thumb, turned as the light goes down.
    side = 1
    angle = -0.35 + 0.35 * knobAt(t)
    arm = 2.6
    curl = [0.25, 0.7, 0.75, 0.8]
    thumb = 0
    pinch = 1
    tip = { x: KNOB.x - 0.01, y: KNOB.y - 0.03 }
    reach = PALM.len + 0.3 * 0.75
  }
  const d = dir(angle)
  const rest = { x: tip.x - d.x * reach, y: tip.y - d.y * reach }
  // In, and out, along the forearm, from beyond the frame's foot.
  const a = dir(arm)
  const away = 3.2 * (1 - k)
  const wrist = { x: rest.x + a.x * away, y: rest.y + a.y * away }
  return { r, s, k, side, wrist, angle, arm, curl, thumb, pinch, tip: { x: tip.x + a.x * away, y: tip.y + a.y * away } }
}

const SKIN = '#9A6352'
const SKIN_LIT = '#F2BE98'
const KNIT = '#4E5F58'
const KNIT_LIT = '#9FB49B'

/** The hand and its sleeve, in front of everything on the desk. */
export function hands(ctx: Ctx, lw: number, t: number, mug: (ctx: Ctx) => void): void {
  const p = poseAt(t)
  if (!p) return
  // Taking a sip, the mug comes too, and both come toward the camera: drawn here, in front of everything.
  const up = sipAt(t)
  if (p.r.kind === 'sip' && up > 0.001) {
    const e = travelAt(t)
    ctx.save()
    const o = sipped(up, e, 0, 0)
    const g = 1 + 2.2 * e * e
    ctx.translate(o.x, o.y)
    ctx.scale(g, g)
    mug(ctx)
    hand(ctx, lw, t, p)
    ctx.restore()
    return
  }
  hand(ctx, lw, t, p)
}

function hand(ctx: Ctx, lw: number, t: number, p: Pose): void {
  const lamp = lampAt(t)
  // Nearer the lamp than the desk's far end, and never in the dark: the hand is lit as much as the room lets it be.
  const l = Math.min(1, lightAt(p.wrist.x, p.wrist.y - 0.2) * lamp * 1.2 + 0.42 * Math.max(0.35, lamp))
  const skin = lit(SKIN, SKIN_LIT, l)
  const knit = lit(KNIT, KNIT_LIT, l * 0.85)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // The sleeve: a soft knit tube up to its ribbed cuff over the wrist, a little wider toward the camera, and gone into
  // the dark in front of the desk within a forearm's length (a frame held upright sees that far).
  const sleeve = () => {
    ctx.beginPath()
    ctx.moveTo(-0.3, 0.02)
    ctx.quadraticCurveTo(-0.35, -1.4, -0.44, -3)
    ctx.lineTo(0.44, -3)
    ctx.quadraticCurveTo(0.35, -1.4, 0.3, 0.02)
    ctx.quadraticCurveTo(0, 0.07, -0.3, 0.02)
    ctx.closePath()
  }
  // The hand, in its own frame: the wrist at the origin, the fingers pointing up; mirrored for the left.
  const handDraw = (pass: 'ink' | 'fill') => {
    ctx.save()
    ctx.translate(p.wrist.x, p.wrist.y)
    ctx.rotate(p.angle)
    ctx.scale(p.side, 1)
    const grow = pass === 'ink' ? lw * 2 : 0
    ctx.strokeStyle = pass === 'ink' ? INK : skin
    ctx.fillStyle = pass === 'ink' ? INK : skin
    // The fingers, each a round-ended stroke from its knuckle, shorter as it curls under (seen from behind).
    const tips: { x: number; y: number }[] = []
    FINGERS.forEach((f, i) => {
      const c = p.curl[i]
      const len = f.len * (1 - 0.62 * c)
      const lean = (f.x - 0.0) * 0.25
      const bx = f.x
      const by = -PALM.len + 0.04
      const tx = bx + lean * len - (i === 0 ? p.pinch * 0.02 : 0)
      const ty = by - len
      tips.push({ x: tx, y: ty })
      ctx.lineWidth = FINGER_W * (1 - 0.06 * i) + grow
      ctx.beginPath()
      ctx.moveTo(bx, by + 0.04)
      ctx.quadraticCurveTo(bx + lean * len * 0.3, by - len * 0.55, tx, ty)
      ctx.stroke()
    })
    // The thumb, from the palm's side: out and up, or tucked, or pinched to the first finger's tip.
    const tb = { x: -PALM.w / 2 + 0.02, y: -0.1 }
    const out = { x: -PALM.w / 2 - 0.14, y: -0.3 }
    const tuck = { x: -PALM.w / 2 + 0.06, y: -0.22 }
    let th = { x: out.x + (tuck.x - out.x) * p.thumb, y: out.y + (tuck.y - out.y) * p.thumb }
    if (p.pinch > 0) th = { x: th.x + (tips[0].x - 0.03 - th.x) * p.pinch, y: th.y + (tips[0].y + 0.03 - th.y) * p.pinch }
    ctx.lineWidth = 0.11 + grow
    ctx.beginPath()
    ctx.moveTo(tb.x, tb.y)
    ctx.quadraticCurveTo(tb.x - 0.08, (tb.y + th.y) / 2, th.x, th.y)
    ctx.stroke()
    // The palm's back: rounder at the knuckles, narrower at the wrist.
    ctx.beginPath()
    ctx.moveTo(-PALM.w * 0.42, 0.06)
    ctx.quadraticCurveTo(-PALM.w * 0.56, -PALM.len * 0.5, -PALM.w * 0.48, -PALM.len + 0.02)
    ctx.quadraticCurveTo(0, -PALM.len - 0.07, PALM.w * 0.48, -PALM.len + 0.03)
    ctx.quadraticCurveTo(PALM.w * 0.54, -PALM.len * 0.5, PALM.w * 0.4, 0.06)
    ctx.closePath()
    if (pass === 'ink') {
      ctx.lineWidth = grow
      ctx.stroke()
    } else {
      const g = ctx.createLinearGradient(-PALM.w / 2, 0, PALM.w / 2, 0)
      g.addColorStop(0, lit(SKIN, SKIN_LIT, l * 0.75))
      g.addColorStop(1, skin)
      ctx.fillStyle = g
    }
    ctx.fill()
    if (pass === 'fill') {
      // The nails, on the fingers that still point out.
      ctx.fillStyle = rgba('#FBE3D0', 0.55 * l + 0.15)
      tips.forEach((tp, i) => {
        if (p.curl[i] > 0.6) return
        ctx.beginPath()
        ctx.ellipse(tp.x, tp.y + 0.012, 0.024, 0.03, 0, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    ctx.restore()
  }
  handDraw('ink')
  handDraw('fill')
  // The sleeve over the wrist, last: the cuff covers the heel of the hand.
  ctx.save()
  ctx.translate(p.wrist.x, p.wrist.y)
  ctx.rotate(p.arm)
  ctx.translate(0, -0.02)
  sleeve()
  // Into the dark as it nears the camera, out of the lamp's reach: the knit goes to shadow, then to nothing.
  const along = (color: string) => {
    const g = ctx.createLinearGradient(0, -0.9, 0, -2.6)
    g.addColorStop(0, rgba(color, 1))
    g.addColorStop(0.5, rgba(lit(color, '#120E1E', 0.8), 0.95))
    g.addColorStop(1, rgba('#120E1E', 0))
    return g
  }
  ctx.fillStyle = along(knit)
  ctx.fill()
  // Its shaded side, away from the lamp.
  ctx.save()
  ctx.clip()
  const side = ctx.createLinearGradient(-0.45, 0, 0.2, 0)
  side.addColorStop(0, rgba(INK, 0.22))
  side.addColorStop(1, rgba(INK, 0))
  ctx.fillStyle = side
  ctx.fillRect(-0.7, -1.5, 1.4, 1.6)
  ctx.restore()
  sleeve()
  ctx.strokeStyle = along(INK)
  ctx.lineWidth = lw
  ctx.stroke()
  // Its cuff's ribbing, and a fold or two in the knit above it.
  ctx.save()
  sleeve()
  ctx.clip()
  ctx.strokeStyle = rgba(INK, 0.28)
  ctx.lineWidth = lw * 0.55
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 0.055, 0.04)
    ctx.lineTo(i * 0.057, -0.24)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(-0.34, -0.24)
  ctx.quadraticCurveTo(0, -0.21, 0.34, -0.25)
  ctx.strokeStyle = rgba(INK, 0.5)
  ctx.lineWidth = lw * 0.7
  ctx.stroke()
  ctx.strokeStyle = rgba(INK, 0.18)
  ctx.lineWidth = lw * 0.8
  for (const [y, w] of [[-0.75, 0.2], [-1.25, -0.15]]) {
    ctx.beginPath()
    ctx.moveTo(-0.3, y)
    ctx.quadraticCurveTo(w, y - 0.12, 0.32, y + 0.05)
    ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
  ctx.restore()
}

/** The knob on the lamp's base: a small brass dial with a mark, turned down at the end. */
export function knob(ctx: Ctx, lw: number, t: number): void {
  const on = lampAt(t)
  ctx.beginPath()
  ctx.arc(KNOB.x, KNOB.y, KNOB.r, 0, Math.PI * 2)
  ctx.fillStyle = lit('#5A4A30', '#D9B26A', 0.35 + 0.4 * on)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = lw * 0.8
  ctx.stroke()
  const a = -0.5 - 2.2 * knobAt(t)
  ctx.beginPath()
  ctx.moveTo(KNOB.x, KNOB.y)
  ctx.lineTo(KNOB.x + Math.sin(a) * KNOB.r * 0.8, KNOB.y - Math.cos(a) * KNOB.r * 0.8)
  ctx.lineWidth = lw * 0.6
  ctx.stroke()
}
