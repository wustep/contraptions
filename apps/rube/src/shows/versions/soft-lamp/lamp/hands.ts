import { camera } from './camera'
import { rgba, viewOf } from './canvas'
import { sweepAt } from './decor'
import { CAT, GLASS, LAMP, MUG } from './desk'
import { MUSIC_END, smooth } from './music'
import { ballAt, machineBusy } from './route'
import { MOMENTS, wetAt } from './sky'
import { INK, LAMP_ON, MOUTH, hash, lampAt, lightAt, lit, rainAt } from './world'

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

type Kind = 'on' | 'sip' | 'cup' | 'pet' | 'draw' | 'away' | 'back' | 'lamp'

interface Reach {
  kind: Kind
  /** When the hand starts in, and how long it stays (arriving and leaving included). */
  at: number
  dur: number
}

/** How long each takes, seconds, in and out included. */
const DUR: Record<Kind, number> = { on: 5.6, sip: 11, cup: 13, pet: 9, draw: 9.5, away: 6, back: 6, lamp: 10 }
/** How long the hand takes to come in, and to go. */
const IN = 1.5
const OUT = 1.3

/** The knob on the lamp's base, on the front of its dome: what turns the lamp on, and down. */
export const KNOB = { x: LAMP.base.x + 0.17, y: -0.085, r: 0.042 }

/** What the camera must hold the whole time for each reach: the thing reached for, and the hand on it. */
const BOX: Record<Kind, [number, number, number, number]> = {
  on: [LAMP.base.x - 0.4, -0.45, LAMP.base.x + 0.7, 0.2],
  // (The sip's hand comes up from the frame's foot, so the desk's front edge may be the frame's foot.)
  sip: [MUG.x - 0.75, -MUG.h - 0.1, MUG.x + 0.45, 0.1],
  away: [MUG.x - 0.75, -MUG.h - 0.1, MUG.x + 0.45, 0.25],
  back: [MUG.x - 0.75, -MUG.h - 0.1, MUG.x + 0.45, 0.25],
  cup: [MUG.x - 0.75, -MUG.h - 0.1, MUG.x + 0.45, 0.25],
  pet: [CAT.x0, -1.1, CAT.head.x + 0.75, 0.25],
  draw: [-3.0, -2.45, -1.8, 0.25],
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
  const busy = (t: number, d: number, kind?: Kind) =>
    // (Hands round the mug, at the desk's dark end, may share the night with someone across the street.)
    [...MOMENTS.shooting].some((m) => m > t - 8 && m < t + d + 6) ||
    (kind !== 'cup' &&
      [...MOMENTS.crossings.map(([c, , stop]) => [c, c + 3.6 + stop]), ...MOMENTS.cat.flatMap(([a, b]) => [[a, a + 2.4], [b - 2.4, b]])].some(
        ([a, b]) => a < t + d + 12 && b > t - 12,
      )) ||
    // After a flash, a hand may come for the warm mug: what anyone does as the storm comes closer.
    MOMENTS.lightning.some((m) => m > t - 3.5 && m < t + d + 6) ||
    out.some((r) => Math.abs(r.at - t) < 90) ||
    machineBusy(t, t + d) ||
    (() => {
      for (let s = t - 2; s <= t + d + 2; s += 0.5) if (sweepAt(s).a > 0.01) return true
      return false
    })()
  const find = (kind: Kind, from: number, to: number, ok: (t: number) => boolean = () => true) => {
    const d = DUR[kind]
    for (let t = from; t < to; t += 1) {
      if (ok(t) && !busy(t, d, kind) && held(BOX[kind], t - 1, t + d + 1)) {
        out.push({ kind, at: t, dur: d })
        return
      }
    }
  }
  // The lamp, turned on as the first chord sounds (`lampAt`): the hand is on its way in as the show opens.
  out.push({ kind: 'on', at: 0.1, dur: DUR.on })
  // A sip while the tea is hot: in the second track.
  find('sip', 160, 560)
  // The kitten, once in the rain.
  find('pet', 560, 900)
  // A face drawn in the mist on the glass, in the heaviest of the rain: it stays, and goes as the glass dries.
  // The ball sits in the cup the while (its walk along the sill would pass behind the arm), and the camera all but
  // holds still.
  find('draw', 740, 1250, (t) => {
    if (rainAt(t) < 0.55) return false
    const c0 = camera(t - 1)
    for (let s = t - 1; s <= t + DUR.draw + 1; s += 0.5) {
      const c = camera(s)
      if (ballAt(s).x < 1.6 || Math.abs(c.x - c0.x) + Math.abs(c.y - c0.y) > 0.35) return false
    }
    return true
  })
  // Hands round the mug, in the heaviest of the rain.
  find('cup', 560, 1300, (t) => rainAt(t) > 0.55)
  // About midnight, the tea gone cold: the mug taken away, and a minute or so later brought back hot (the kettle's
  // time, no longer: the desk by the cat stands empty only that while), the camera holding the desk each time.
  find('away', 1100, 1450)
  const away = out.find((r) => r.kind === 'away')
  if (away) find('back', away.at + 55, away.at + 420)
  // The lamp, turned down as the last track rings out: the knob turns as the light goes (`lampAt`).
  out.push({ kind: 'lamp', at: MUSIC_END - 3.6, dur: DUR.lamp })
  return out.sort((a, b) => a.at - b.at)
})()

/** The hand at `t`: what it is doing, how far in it is (`k`), and how far through (`s`, seconds since it started). */
function reachAt(t: number): { r: Reach; k: number; s: number } | null {
  for (const r of REACHES) {
    const s = t - r.at
    if (s < 0 || s > r.dur) continue
    // Carrying the mug off, or back, the hand goes or comes with it, not along its arm.
    const k = (r.kind === 'back' ? 1 : smooth(s, 0, IN)) * (r.kind === 'away' ? 1 : 1 - smooth(s, r.dur - OUT, r.dur))
    return { r, k, s }
  }
  return null
}

/** How far the kitten is in a chin scratch, 0 to 1: for `cat.ts`, which shuts its eyes and leans into it. */
export function petAt(t: number): number {
  // It goes on enjoying it a moment after the hand has gone: its eyes open slowly, last.
  for (const r of REACHES) {
    if (r.kind !== 'pet') continue
    const s = t - r.at
    if (s < 0 || s > r.dur + 0.6) continue
    return smooth(s, IN - 0.2, IN + 0.6) * (1 - smooth(s, r.dur - OUT - 0.2, r.dur + 0.6))
  }
  return 0
}

/** Where the hand's fingertips are, and how much it is there: for the cat to glance at. */
export function handAt(t: number): { x: number; y: number; a: number } {
  const p = poseAt(t)
  if (!p) return { x: 0, y: 0, a: 0 }
  const m = mugAt(t)
  const at = carried(m, p.tip.x, p.tip.y)
  return { x: at.x, y: at.y, a: p.k * (1 - m.e) }
}

/**
 * Where the mug is: `up`, lifted off the desk (0 standing, 1 lifted); `e`, how far toward someone's lips (it grows as
 * it comes toward the camera, and leaves the picture at its foot); `gone`, carried on past them, away to be refilled.
 * A sip lifts it, holds it a few seconds and sets it back down before the hand lets go. About midnight it is taken
 * away, and brought back the same way a little later.
 */
export function mugAt(t: number): { up: number; e: number; gone: number } {
  const between = REACHES.find((r) => r.kind === 'away')
  const back = REACHES.find((r) => r.kind === 'back')
  if (between && back && t > between.at + between.dur && t < back.at) return { up: 1, e: 1, gone: 1 }
  const h = reachAt(t)
  if (!h) return { up: 0, e: 0, gone: 0 }
  const s = h.s
  // (At the lips a moment and a half: long enough to drink, not so long the picture waits on it.)
  if (h.r.kind === 'sip') return { up: smooth(s, 2.0, 2.6) * (1 - smooth(s, 8.5, 9.1)), e: smooth(s, 2.4, 4.1) * (1 - smooth(s, 5.6, 8.0)), gone: 0 }
  if (h.r.kind === 'away') return { up: smooth(s, 2.0, 2.6), e: smooth(s, 2.4, 4.3), gone: smooth(s, 3.9, 5.8) }
  if (h.r.kind === 'back') return { up: 1 - smooth(s, 3.4, 4.0), e: 1 - smooth(s, 1.5, 3.4), gone: 1 - smooth(s, 0, 1.8) }
  return { up: 0, e: 0, gone: 0 }
}

/** Whether the mug is anywhere but standing on the desk: `scene.ts` leaves it (and its steam and shadows) to this file. */
export const liftAt = (t: number): number => mugAt(t).up

/** When the mug comes back hot: the steam is fresh from here (`scene.ts`), and cools again to the end. */
export const REFILL = (() => {
  const back = REACHES.find((r) => r.kind === 'back')
  return back ? back.at + 4 : Infinity
})()

/** How big the mug is drawn, as it comes toward the camera. */
const grow = (e: number): number => 1 + 2.2 * e * e

/** Where a point on the mug (or the hand on it) is, on its way. */
function carried(m: { up: number; e: number; gone: number }, x: number, y: number, foot = 0.55): { x: number; y: number } {
  const g = grow(m.e)
  // At the lips, the mug's rim stands just above the foot of the picture, whatever its shape: a phone held upright
  // sees far below the desk, and the mug must still go out at its foot, not hang over the drawers.
  const lips = foot - 0.25 + MUG.h * grow(1) + 0.25
  return { x: MUG.x + (x - MUG.x) * g + 0.6 * m.e + 0.5 * m.gone, y: y * g - 0.25 * m.up + lips * m.e + (foot - 0.55 + 4) * m.gone }
}

/** How far the lamp's knob is turned, 0 (up) to 1 (down to a glow): turned up as the lamp comes on, down as it goes. */
export const knobAt = (t: number): number => 1 - smooth(t, LAMP_ON - 0.1, LAMP_ON + 1.5) + smooth(t, MUSIC_END - 1.5, MUSIC_END + 4.5)

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
    const at = { x: CAT.head.x + 0.1, y: CAT.head.y + 0.21 }
    tip = { x: at.x + d.x * 0.015 * sc, y: at.y + d.y * 0.015 * sc }
    reach = PALM.len + 0.3 * (1 - 0.5 * 0.4)
  } else if (r.kind === 'cup' || r.kind === 'sip' || r.kind === 'away' || r.kind === 'back') {
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
  } else if (r.kind === 'draw') {
    // One finger out, the others curled, its tip tracing the face in the mist (`DOODLE`): a little up and to the right
    // of straight, the forearm down past the mug.
    side = -1
    angle = 0.12
    arm = 3.3
    curl = [0, 0.88, 0.92, 0.95]
    thumb = 1
    tip = drawTip(s)
    reach = 0
  } else {
    // The lamp's knob, between finger and thumb, turned as the light comes up, or goes down.
    // From the right, at about the desk's height, as an arm resting along the desk reaches over to it (from below,
    // a frame taller than wide showed it coming up out of the dark under the desk).
    side = 1
    angle = -1.15 + 0.3 * knobAt(t)
    arm = 1.8
    curl = [0.25, 0.7, 0.75, 0.8]
    thumb = 0
    pinch = 1
    tip = { x: KNOB.x - 0.01, y: KNOB.y - 0.03 }
    reach = PALM.len + 0.3 * 0.75
  }
  const d = dir(angle)
  // Drawing, the point is the first finger's tip, off the hand's middle: the wrist is where that finger's tip lands.
  const index = r.kind === 'draw' ? fingerTip(side, angle) : { x: d.x * reach, y: d.y * reach }
  const rest = { x: tip.x - index.x, y: tip.y - index.y }
  // In, and out, along the forearm, from beyond the frame's foot.
  const a = dir(arm)
  const away = 3.2 * (1 - k)
  const wrist = { x: rest.x + a.x * away, y: rest.y + a.y * away }
  return { r, s, k, side, wrist, angle, arm, curl, thumb, pinch, tip: { x: tip.x + a.x * away, y: tip.y + a.y * away } }
}

/** Where the first finger's tip is from the wrist, straight out, for a hand turned `angle` (`hand` draws it so). */
function fingerTip(side: 1 | -1, angle: number): { x: number; y: number } {
  const f = FINGERS[0]
  const by = -PALM.len + 0.04
  const lx = side * (f.x + f.x * 0.25 * f.len)
  const ly = by - f.len
  return { x: lx * Math.cos(angle) - ly * Math.sin(angle), y: lx * Math.sin(angle) + ly * Math.cos(angle) }
}

/**
 * The face drawn in the mist: a kitten's, a circle, two ears, two eyes and a small mouth, on the lower left pane above
 * the mug, where the glass mists thickest. Strokes in the order a finger draws them.
 */
const FACE = { x: -2.42, y: -2.2, r: 0.21 }
const DOODLE: { x: number; y: number }[][] = (() => {
  const { x, y, r } = FACE
  const at = (dx: number, dy: number) => ({ x: x + dx, y: y + dy })
  const head = Array.from({ length: 33 }, (_, i) => {
    const a = Math.PI * 0.6 + (i / 32) * Math.PI * 2
    return at(Math.cos(a) * r, Math.sin(a) * r * 0.92)
  })
  return [
    head,
    [at(-0.17, -0.1), at(-0.15, -0.35), at(-0.045, -0.195)],
    [at(0.045, -0.195), at(0.15, -0.35), at(0.17, -0.1)],
    [at(-0.075, -0.045), at(-0.073, 0.0)],
    [at(0.075, -0.045), at(0.073, 0.0)],
    [at(-0.045, 0.075), at(-0.022, 0.095), at(0, 0.08), at(0.022, 0.095), at(0.045, 0.075)],
  ]
})()
/** How long each stroke is, and all of them, cells. */
const STROKE_LEN = DOODLE.map((st) => st.reduce((n, p, i) => (i ? n + Math.hypot(p.x - st[i - 1].x, p.y - st[i - 1].y) : 0), 0))
const DOODLE_LEN = STROKE_LEN.reduce((a, b) => a + b, 0)
/** When the finger draws: from a moment after it reaches the glass, for five seconds. */
const DRAW_FROM = 1.7
const DRAW_FOR = 5.4

/** When the face starts to go: once the glass is half dry after the rain; it is gone two and a half minutes later. */
const DRIES = (() => {
  const r = REACHES.find((x) => x.kind === 'draw')
  if (!r) return Infinity
  for (let t = r.at + 20; t < MUSIC_END; t += 1) if (wetAt(t) < 0.5) return t
  return MUSIC_END
})()

/** How much of the face is drawn, cells along its strokes, `s` seconds into the reach. */
const drawnAt = (s: number): number => DOODLE_LEN * smooth(s, DRAW_FROM, DRAW_FROM + DRAW_FOR) ** 1

/** A point `len` along the face's strokes. */
function along(len: number): { x: number; y: number } {
  let left = Math.max(0, Math.min(DOODLE_LEN, len))
  for (let i = 0; i < DOODLE.length; i++) {
    if (left <= STROKE_LEN[i] || i === DOODLE.length - 1) {
      const st = DOODLE[i]
      for (let j = 1; j < st.length; j++) {
        const seg = Math.hypot(st[j].x - st[j - 1].x, st[j].y - st[j - 1].y)
        if (left <= seg || j === st.length - 1) {
          const u = Math.min(1, left / (seg || 1))
          return { x: st[j - 1].x + (st[j].x - st[j - 1].x) * u, y: st[j - 1].y + (st[j].y - st[j - 1].y) * u }
        }
        left -= seg
      }
    }
    left -= STROKE_LEN[i]
  }
  return DOODLE[0][0]
}

/** Where the drawing fingertip is: at the face's start as it arrives, along the strokes as it draws, then off. */
function drawTip(s: number): { x: number; y: number } {
  return along(drawnAt(s))
}

/**
 * The face on the glass: the mist cleared where the finger went, so the night shows through a little clearer. It stays while the glass is wet, rain running over it, and
 * goes as the glass dries. Drawn on the glass, after the night and before the window's frame.
 */
export function doodle(ctx: Ctx, t: number): void {
  const r = REACHES.find((x) => x.kind === 'draw')
  if (!r || t < r.at + DRAW_FROM) return
  const vis = 1 - smooth(t, DRIES, DRIES + 150)
  if (vis <= 0.01) return
  const len = drawnAt(t - r.at)
  ctx.save()
  ctx.beginPath()
  ctx.rect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0)
  ctx.clip()
  // The mist it is drawn in, a little thicker there, as where someone has breathed on the glass.
  // (A breath's worth, wider than the face, so the clear lines are drawn in it and not on bare glass.)
  ctx.save()
  ctx.translate(FACE.x, FACE.y + 0.05)
  ctx.scale(1, 0.8)
  const m = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.85)
  m.addColorStop(0, rgba('#B9B3DA', 0.34 * vis))
  m.addColorStop(0.6, rgba('#B9B3DA', 0.2 * vis))
  m.addColorStop(1, rgba('#B9B3DA', 0))
  ctx.fillStyle = m
  ctx.fillRect(-0.9, -0.9, 1.8, 1.8)
  ctx.restore()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  let left = len
  for (let i = 0; i < DOODLE.length && left > 0; i++) {
    const st = DOODLE[i]
    ctx.beginPath()
    ctx.moveTo(st[0].x, st[0].y)
    let used = 0
    for (let j = 1; j < st.length; j++) {
      const seg = Math.hypot(st[j].x - st[j - 1].x, st[j].y - st[j - 1].y)
      if (used + seg <= left) ctx.lineTo(st[j].x, st[j].y)
      else {
        const u = (left - used) / seg
        ctx.lineTo(st[j - 1].x + (st[j].x - st[j - 1].x) * u, st[j - 1].y + (st[j].y - st[j - 1].y) * u)
        used = left
        break
      }
      used += seg
    }
    left -= STROKE_LEN[i]
    // Clear glass where the finger went: the night darker and plainer through it, with a faint wet edge.
    ctx.strokeStyle = rgba('#DCD8F6', 0.16 * vis)
    ctx.lineWidth = 0.064
    ctx.stroke()
    ctx.strokeStyle = rgba('#14122A', 0.36 * vis)
    ctx.lineWidth = 0.04
    ctx.stroke()
  }
  ctx.restore()
}

const SKIN = '#9A6352'
const SKIN_LIT = '#F2BE98'
const KNIT = '#4E5F58'
const KNIT_LIT = '#9FB49B'

/** The hand and its sleeve, in front of everything on the desk. */
export function hands(ctx: Ctx, lw: number, t: number, mug: (ctx: Ctx) => void): void {
  const p = poseAt(t)
  if (!p) return
  // Carrying the mug, for a sip or away, both come toward the camera: drawn here, in front of everything.
  const m = mugAt(t)
  const foot = viewOf(ctx).y1
  const carry = (g: Ctx) => {
    const o = carried(m, 0, 0, foot)
    g.translate(o.x, o.y)
    g.scale(grow(m.e), grow(m.e))
  }
  shadow(ctx, lw, t, p, m, carry)
  if (m.up > 0.001) {
    ctx.save()
    carry(ctx)
    mug(ctx)
    hand(ctx, lw, t, p)
    ctx.restore()
    return
  }
  hand(ctx, lw, t, p)
}

/** The scratch canvas the hand's shadow is drawn small in, kept between frames. */
let shade: HTMLCanvasElement | null = null

/**
 * The hand's shadow from the lamp: thrown away from the shade onto whatever is behind it (the kitten, the mug, the
 * desk, the wall), soft, as a hand held well in front of things throws one. Drawn small and laid back over the
 * picture, so it is soft for nothing. Gone as the mug is carried toward the camera, out of the lamp's light.
 */
function shadow(ctx: Ctx, lw: number, t: number, p: Pose, m: { up: number; e: number }, carry: (g: Ctx) => void): void {
  const a = 0.32 * lampAt(t) * (1 - m.e) * p.k
  if (a < 0.01) return
  const v = viewOf(ctx)
  const dx = p.wrist.x - MOUTH.x
  const dy = p.wrist.y - MOUTH.y
  const d = Math.hypot(dx, dy) || 1
  const off = { x: (dx / d) * 0.42, y: (dy / d) * 0.42 }
  // Only round the hand and its sleeve (the sleeve fades within three cells of the wrist), not the whole picture; a
  // carried mug grows toward the camera, so give it room.
  const span = 3.4 * (m.up > 0.001 ? grow(m.e) : 1)
  const x0 = Math.max(v.x0, p.wrist.x + off.x - span)
  const x1 = Math.min(v.x1, p.wrist.x + off.x + span)
  const y0 = Math.max(v.y0, p.wrist.y + off.y - span)
  const y1 = Math.min(v.y1, p.wrist.y + off.y + span)
  if (x1 <= x0 || y1 <= y0) return
  const res = 14
  const w = Math.ceil((x1 - x0) * res)
  const h = Math.ceil((y1 - y0) * res)
  if (!shade) {
    // Made once at the most it will need (a carried mug's hand at its largest), so it is never resized mid-show.
    shade = document.createElement('canvas')
    shade.width = 320
    shade.height = 320
  }
  if (shade.width < w || shade.height < h) {
    shade.width = Math.max(shade.width, w)
    shade.height = Math.max(shade.height, h)
  }
  const g = shade.getContext('2d') as Ctx
  g.setTransform(1, 0, 0, 1, 0, 0)
  // All of it, not just this frame's part: what is drawn past the part is sampled at its edge as it is laid back.
  g.clearRect(0, 0, shade.width, shade.height)
  g.setTransform(res, 0, 0, res, (off.x - x0) * res, (off.y - y0) * res)
  if (m.up > 0.001) carry(g)
  hand(g, lw, t, p, true)
  // Laid over as it is: the mask is black, so at `a` it darkens what is under it by `a`, as a shadow does (a multiply
  // blend gives the same, and costs a frame's time).
  ctx.save()
  ctx.globalAlpha = a
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(shade, 0, 0, w, h, x0, y0, w / res, h / res)
  ctx.restore()
}

function hand(ctx: Ctx, lw: number, t: number, p: Pose, shape = false): void {
  const lamp = lampAt(t)
  // Nearer the lamp than the desk's far end, and never in the dark: the hand is lit as much as the room lets it be.
  const l = Math.min(1, lightAt(p.wrist.x, p.wrist.y - 0.2) * lamp * 1.2 + 0.42 * Math.max(0.65, lamp))
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
  if (shape) {
    // Only its outline's whole shape, for its shadow: the hand, and the sleeve as it fades.
    handDraw('ink')
    ctx.translate(p.wrist.x, p.wrist.y)
    ctx.rotate(p.arm)
    ctx.translate(0, -0.02)
    sleeve()
    const g = ctx.createLinearGradient(0, -0.9, 0, -2.6)
    g.addColorStop(0, 'rgba(0, 0, 0, 1)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()
    return
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
