import type p5 from 'p5'
import { R, type Pt, type Seg } from '../../../../../parts'
import { director } from '../camera'
import { box, carried, frame, part, type Ctx, type PartShot } from '../kit'
import { DURATION, fight, JUMPS, strength } from '../music'
import { EVELYN, HOME, LAUNDROMAT, MULTI_THEME, VOID, VOID_THEME } from '../worlds'
import { backdrop, HP, LE, LW, PL, SKINS, skinAt, TH, TILT, WEDGE, type Moment, type Skin, type View } from './skins'
import { at, circle, glow, hash, lodFor, mix, poly, rect, rgba, type Pen } from './skins-pen'

/**
 * ALL AT ONCE. Evelyn tips into the bagel's hole and falls, slowly, through the dark, and the dark is the
 * laundromat with its lights off. On the fight's beat 69 the tubes flicker on round her, and on 72, as the pulse
 * comes back, she lands on the end of a seesaw: a wedge, a plank, and a laundry bag on its other end. Her landing
 * throws the bag; the bag's landing throws her. From then on the two of them trade throws, one on every beat.
 *
 * On that same landing the frame splits. The picture tears in two and a second world slides in beside hers: the
 * premiere, with the same seesaw in brass and velvet, a gold statuette for the weight, and the same Evelyn landing
 * on it at the same instant. On the phrases it goes on splitting, 2, 4, 9, 16, 36, 64 (beats 72, 76, 88, 96, 104,
 * 112), each time with a breath in and a hard break outward, the worlds inside ringing as they settle, and then
 * drawing slowly closer through the phrase until the next break lets them go: every world she has been to and more
 * she never saw, a wall of universes all running the one machine in unison.
 *
 * On the crescendo the wall crowds to 144 (beat 121) as the seesaw throws her one last time, high, under home's
 * gravity. On 121½ every panel turns over like a card to another world; on 122 they all turn to the same one, and
 * it is one place seen through a hundred and forty-four windows: a calm floor, and one of her over it. The frames
 * close in on her and thin away, and on the great hit (123) she lands alone on the calm floor, at rest: home, where
 * the kindness begins.
 *
 * The part draws everything in its `over`, in the screen's own place: a panel is a world (`skins.ts`) with its own
 * little camera on the machine. At one panel that camera is the stage's own, so the leg opens and closes on the
 * show's framing exactly; the stage's ball is under the paint, and each panel draws its own Evelyn from the same
 * function the lane is sampled from. A panel's detail drops as it gets small.
 */

const B = fight
/** The ball meets the plank a little before the beat and rides it down; the plank hits the ground a little after. */
const SWING = 0.05
/** How high a throw goes, and how long it takes: from one slam to the next contact. */
const HOP = 0.62
const HOP_T = (B(1) - B(0)) - SWING
/** The last throw, from 121 to the great hit: under home's gravity, higher and slower, the fold happening round it. */
const LEAP_FROM = B(121) + SWING / 2
const END = JUMPS.eye
const LEAP_T = END - LEAP_FROM
const LEAP = (12 * LEAP_T * LEAP_T) / 8

/** The first beat she lands on, and the last beat of the trade. */
const FIRST = 72
const LAST = 121
/** The tubes: a flicker on the half-beat before 69, and on for good on 69. */
const FLICKER = B(68.5)
const LIGHTS = B(69)

/** How the wall is laid, beat by beat: columns, rows, and which panel is in the middle. */
interface Grid {
  cols: number
  rows: number
  ox: number
  oy: number
}
const STEPS: { at: number; g: Grid; snap: number }[] = [
  { at: B(72), g: { cols: 2, rows: 1, ox: 0.5, oy: 0 }, snap: 0.13 },
  { at: B(76), g: { cols: 2, rows: 2, ox: 0.5, oy: 0.5 }, snap: 0.12 },
  { at: B(88), g: { cols: 3, rows: 3, ox: 0, oy: 0 }, snap: 0.12 },
  { at: B(96), g: { cols: 4, rows: 4, ox: 0.5, oy: 0.5 }, snap: 0.115 },
  { at: B(104), g: { cols: 6, rows: 6, ox: 0.5, oy: 0.5 }, snap: 0.11 },
  { at: B(112), g: { cols: 8, rows: 8, ox: 0.5, oy: 0.5 }, snap: 0.11 },
  { at: B(121), g: { cols: 12, rows: 12, ox: 0.5, oy: 0.5 }, snap: 0.07 },
]
/** The crescendo's turns: every panel over to another world on 121½, and on 122 all of them to the calm. */
const FLIPS = [B(121.5), B(122)]
const FLIP_T = 0.19
/** The gathering: from the turn on 122 to the great hit. */
const FOLD = B(122)
const ONE: Grid = { cols: 1, rows: 1, ox: 0, oy: 0 }
/** The breath in before a break: how far, and how long. */
const WIND = 0.035
const WIND_T = 0.22

/** Every strike: the tubes, each beat's slam from 72 to 121, the turns on 121½ and 122, and her landing on the great hit. */
export const MOSAIC_HITS: number[] = [FLICKER, LIGHTS, ...Array.from({ length: LAST - FIRST + 1 }, (_, i) => B(FIRST + i)), B(121.5), B(122), END]

/* ------------------------------------------------------------------ the machine's clock (scene cells: the ground under the pivot at 0,0) */

const rot = (a: number, x: number, y: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
/** Where Evelyn sits on the plank at angle `phi` (positive: her end up). */
const seatE = (phi: number): Pt => {
  const [x, y] = rot(phi, -LE, -TH / 2 - R)
  return [x, -HP + y]
}
const footW = (phi: number): Pt => {
  const [x, y] = rot(phi, LW, -TH / 2)
  return [x, -HP + y]
}
/** Her seat with her end up: where every throw of hers leaves from and comes back to. */
const E_UP = seatE(TILT)
const W_UP = footW(-TILT)

/** The slams: beat, time, who lands (Evelyn on the even beats), strength. */
interface Slam {
  k: number
  t: number
  e: boolean
  s: number
}
const SLAMS: Slam[] = Array.from({ length: LAST - FIRST + 1 }, (_, i) => {
  const k = FIRST + i
  return { k, t: B(k), e: k % 2 === 0, s: strength('fight', k) }
})

/** The last slam whose contact has come by `t`, or -1. */
function lastSlam(t: number): number {
  let lo = -1
  for (let i = 0; i < SLAMS.length; i++) if (SLAMS[i].t - SWING / 2 <= t) lo = i
  return lo
}

/** The plank's angle at show time `t`. */
function plank(t: number): number {
  const i = lastSlam(t)
  if (i < 0) return TILT
  const sl = SLAMS[i]
  const to = sl.e ? -TILT : TILT
  const from = -to
  const u = (t - (sl.t - SWING / 2)) / SWING
  if (u < 1) {
    const e = 0.55 * u + 0.45 * u * u
    return from + (to - from) * e
  }
  // The down end bounces off the ground and settles.
  const x = t - (sl.t + SWING / 2)
  const amp = 0.035 + 0.035 * Math.min(1.4, sl.s)
  const b = amp * Math.exp(-x / 0.07) * Math.abs(Math.sin((Math.PI * x) / 0.085))
  return to + (sl.e ? 1 : -1) * b
}

/** A vertical throw from `p` that comes back to it after `T`, rising `h`: where it is `x` seconds in. */
const toss = (p: Pt, h: number, T: number, x: number): Pt => {
  const u = Math.max(0, Math.min(1, x / T))
  return [p[0], p[1] - 4 * h * u * (1 - u)]
}

interface Machine {
  phi: number
  e: Pt
  w: Pt
  /** The weight's turn: its seat's, or a somersault in the air. */
  wa: number
  /** The last slam, for the skins. */
  m: Moment
}

/** The machine at show time `t` (from the first landing on). Before it, the weight sits and she is still falling. */
function machine(t: number, fall: (t: number) => Pt): Machine {
  const phi = plank(t)
  const i = lastSlam(t)
  const sl = i >= 0 ? SLAMS[i] : null
  const m: Moment = sl ? { t, since: t - sl.t, s: sl.s, e: sl.e } : { t, since: Infinity, s: 0, e: false }
  // Evelyn.
  let e: Pt
  if (!sl) e = fall(t)
  else if (sl.e) e = seatE(phi)
  else {
    // The weight came down and threw her: she rides her end up, and leaves it as it stops.
    const off = t - (sl.t + SWING / 2)
    if (off < 0) e = seatE(phi)
    else if (sl.k === LAST) e = toss(E_UP, LEAP, LEAP_T, off)
    else e = toss(E_UP, HOP, HOP_T, off)
  }
  // The weight.
  let w: Pt
  let wa = phi
  if (!sl || !sl.e) w = footW(phi)
  else {
    const off = t - (sl.t + SWING / 2)
    if (off < 0) w = footW(phi)
    else {
      w = toss(W_UP, HOP, HOP_T, off)
      // A loud landing of hers sends it over in a somersault.
      if (sl.s >= 1.2) {
        const u = Math.min(1, off / HOP_T)
        wa = -TILT + Math.PI * 2 * (u * u * (3 - 2 * u))
      } else wa = -TILT
    }
  }
  return { phi, e, w, wa, m }
}

/* ------------------------------------------------------------------ the wall */

/**
 * 0 until the breath before a break, then the break itself: away at once and settling, with no overshoot (a wall
 * that overshot would show a sliver of the next worlds at its edge). The ring is in the worlds inside (`ringAt`).
 */
function snap(t: number, at: number, d: number, wind = WIND_T): number {
  const x = t - at
  if (x < -wind) return 0
  if (x < 0) {
    const u = (x + wind) / wind
    return -WIND * u * u * (3 - 2 * u)
  }
  return 1 - (1 + WIND) * Math.exp(-x / d)
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
function blend(a: Grid, b: Grid, u: number): Grid {
  return {
    cols: Math.exp(lerp(Math.log(a.cols), Math.log(b.cols), u)),
    rows: Math.exp(lerp(Math.log(a.rows), Math.log(b.rows), u)),
    ox: lerp(a.ox, b.ox, u),
    oy: lerp(a.oy, b.oy, u),
  }
}

/** How long the breath before step `i` takes: less when the steps come quick. */
const windOf = (i: number): number => (i === 0 ? WIND_T : Math.min(WIND_T, 0.45 * (STEPS[i].at - STEPS[i - 1].at)))

/** The wall's grid at `t`, and how far the first split has gone (0 one panel, 1 two). */
function gridAt(t: number): { g: Grid; split: number } {
  let i = -1
  for (let j = 0; j < STEPS.length; j++) if (t >= STEPS[j].at - windOf(j)) i = j
  if (i < 0) return { g: ONE, split: 0 }
  const from = i === 0 ? ONE : gridAt(STEPS[i].at - windOf(i) - 1e-6).g
  const u = snap(t, STEPS[i].at, STEPS[i].snap, windOf(i))
  const split = i === 0 ? Math.max(0, Math.min(1, u)) : 1
  return { g: blend(from, STEPS[i].g, u), split }
}

/** The worlds inside the panels ring after a break: a little zoom past and back, twice, dying away. */
function ringAt(t: number): number {
  let r = 0
  for (const st of STEPS) {
    const x = t - st.at
    if (x > 0 && x < 1.2) r += 0.045 * Math.exp(-x / 0.16) * Math.sin((x * Math.PI * 2) / 0.34)
  }
  return 1 + r
}

/**
 * The slow push: through each phrase the worlds inside the panels draw a little closer, and the next break lets
 * them go (on the break's own ease, so nothing jumps). Tension toward every split.
 */
const PUSH = 0.07
function pushAt(t: number): number {
  let i = -1
  for (let j = 0; j < STEPS.length; j++) if (t >= STEPS[j].at) i = j
  if (i < 0) return 1
  const next = i + 1 < STEPS.length ? STEPS[i + 1].at : B(121)
  if (i === STEPS.length - 1) return 1 + PUSH * Math.max(0, 1 - snap(t, STEPS[i].at, STEPS[i].snap, windOf(i)))
  const u = Math.max(0, Math.min(1, (t - STEPS[i].at - 0.3) / (next - STEPS[i].at - 0.3)))
  const grow = u * u * (3 - 2 * u)
  const letGo = i === 0 ? 0 : Math.max(0, 1 - snap(t, STEPS[i].at, STEPS[i].snap, windOf(i)))
  return 1 + PUSH * (grow + letGo)
}

/** How much a panel of `h` pixels (of a frame `fh` tall) shows top to bottom, in cells: less as it gets small. */
const cellsTall = (h: number, fh: number): number => 2.3 + 1.7 * Math.pow(Math.max(0.01, h / fh), 0.62)

/** The crescendo's turns at `t`: how wide a panel is (1 flat, 0 edge-on), and how many turns have gone over. */
function flipAt(t: number): { w: number; n: number } {
  let n = 0
  let w = 1
  for (const f of FLIPS) {
    if (t >= f) n++
    const u = (t - (f - FLIP_T / 2)) / FLIP_T
    if (u > 0 && u < 1) w = Math.abs(Math.cos(Math.PI * u))
  }
  return { w, n }
}

/**
 * How big the net of frames still is, once every panel has turned to the calm: whole until the turn has finished,
 * then closing on her at once and settling onto her, gone on the great hit.
 */
function gatherAt(t: number): number {
  const from = FOLD + FLIP_T / 2
  const u = Math.max(0, Math.min(1, (t - from) / (END - from)))
  return Math.pow(1 - u, 1.4)
}

/* ------------------------------------------------------------------ state */

interface MosaicState {
  begin: number
  /** The scene's origin (the ground under the pivot) in the part's cells. */
  O: Pt
  /** Where she is falling, in scene cells, before she lands. */
  fall: (t: number) => Pt
  /** The stage camera's distance at `t`, as the score will have it (the part's own keys). */
  cells: (t: number) => number
  /** Where she comes to rest on the great hit, in the part's cells. */
  rest: Pt
  /** Bagel seeds she falls past in the dark (scene cells). */
  seeds: { x: number; y: number; s: number; c: string }[]
}

/** Where every panel looks: the middle of the machine and her throw. */
const SCENE_MID: Pt = [0, -0.78]
/** The calm floor she lands on: level with her seat, so she comes down onto it where she left the plank. */
const CALM_FLOOR = E_UP[1] + R

/* ------------------------------------------------------------------ painting */

interface Frame {
  /** The canvas in CSS pixels, and the device ratio. */
  W: number
  H: number
  d: number
  /** The composed 16:9 frame inside it. */
  fx: number
  fy: number
  fw: number
  fh: number
  /** The stage's own camera: its centre in the part's cells, and pixels a cell. */
  cx: number
  cy: number
  k: number
}

/** A pen whose transform draws scene cells into a panel: `sc` (scene cells) at `(px, py)` (CSS px), `q` CSS px a cell, squeezed `sx` across. */
function penFor(ctx: CanvasRenderingContext2D, F: Frame, px: number, py: number, q: number, sc: Pt, ink: string, sx = 1): Pen {
  const dq = F.d * q
  ctx.setTransform(dq * sx, 0, 0, dq, F.d * (px - q * sx * sc[0]), F.d * (py - q * sc[1]))
  const lw = Math.max(0.8, dq * 0.03) / dq
  return { ctx, q: dq, lw, lod: lodFor(dq), ink }
}

/** Evelyn in a panel, with her ink ring and the dot that shows her turning, and a short trail when she is quick. */
function evelyn(pen: Pen, e: Pt, back: Pt[] | null, ink: string): void {
  const { ctx } = pen
  if (pen.lod === 3) {
    ctx.fillStyle = EVELYN
    ctx.beginPath()
    ctx.arc(e[0], e[1], Math.max(R, 1.1 / pen.q), 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (back && pen.lod <= 1) {
    for (let i = 0; i < back.length; i++) {
      const b = back[i]
      if (Math.hypot(b[0] - e[0], b[1] - e[1]) < 0.08) continue
      ctx.fillStyle = rgba(EVELYN, (90 - (back.length - i) * 18) / 255)
      ctx.beginPath()
      ctx.arc(b[0], b[1], R * (1 - (back.length - i) * 0.12), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = EVELYN
  ctx.beginPath()
  ctx.arc(e[0], e[1], R, 0, Math.PI * 2)
  ctx.fill()
  if (pen.lod <= 1) {
    ctx.strokeStyle = ink
    ctx.lineWidth = pen.lw
    ctx.stroke()
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(e[0] + R * 0.48 * Math.cos(-0.9), e[1] + R * 0.48 * Math.sin(-0.9), R * 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The seesaw: its wedge, its plank at `phi`, the weight. */
function seesaw(pen: Pen, skin: Skin, mc: Machine): void {
  poly(pen, [[-WEDGE, 0], [WEDGE, 0], [0.05, -HP + 0.03], [-0.05, -HP + 0.03]], skin.fulcrum)
  at(pen, 0, -HP, mc.phi, 1, () => {
    if (skin.board && pen.lod <= 2) skin.board(pen)
    else rect(pen, -PL, -TH / 2, 2 * PL, TH, skin.plank)
  })
  circle(pen, 0, -HP, 0.04, skin.fulcrum, pen.lod <= 1 ? 0.8 : 0)
  at(pen, mc.w[0], mc.w[1], mc.wa, 1, () => skin.weight(pen))
}

/** A puff of dust off the down end, for a moment after the slam. */
function dust(pen: Pen, skin: Skin, mc: Machine): void {
  if (pen.lod > 0 || !Number.isFinite(mc.m.since) || mc.m.since > 0.35 || mc.m.since < 0) return
  const u = mc.m.since / 0.35
  const x = (mc.m.e ? -1 : 1) * (PL - 0.05)
  const a = (1 - u) * 0.55 * Math.min(1, 0.4 + mc.m.s * 0.5)
  const c = rgba(mix(skin.floor, skin.bg, 0.5), a)
  for (let i = -1; i <= 1; i += 2) {
    pen.ctx.fillStyle = c
    pen.ctx.beginPath()
    pen.ctx.ellipse(x + i * (0.08 + 0.3 * u), -0.03 - 0.05 * u, 0.05 + 0.08 * u, 0.03 + 0.04 * u, 0, 0, Math.PI * 2)
    pen.ctx.fill()
  }
}

interface Box {
  cx: number
  cy: number
  w: number
  h: number
}

/** One panel: a world, its machine and its Evelyn, clipped to its rectangle. */
function panel(ctx: CanvasRenderingContext2D, F: Frame, skin: Skin, b: Box, q: number, sc: Pt, sx: number, mc: Machine, back: Pt[] | null, dark = 0): void {
  const pen = penFor(ctx, F, b.cx, b.cy, q, sc, skin.ink, sx)
  const hw = b.w / 2 / q
  const hh = b.h / 2 / q
  const v: View = { x0: sc[0] - hw, y0: sc[1] - hh, x1: sc[0] + hw, y1: sc[1] + hh }
  if (pen.lod === 3) {
    ctx.fillStyle = skin.bg
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0)
    ctx.fillStyle = skin.floor
    ctx.fillRect(v.x0, 0, v.x1 - v.x0, Math.max(0, v.y1))
    evelyn(pen, mc.e, null, skin.ink)
    return
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0)
  ctx.clip()
  backdrop(pen, skin, mc.m, v)
  seesaw(pen, skin, mc)
  dust(pen, skin, mc)
  if (dark > 0.002) {
    ctx.fillStyle = rgba(VOID_THEME.bg, dark)
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0)
  }
  evelyn(pen, mc.e, back, skin.ink)
  if (skin.front && dark < 0.5) skin.front(pen, mc.m, v)
  ctx.restore()
}

/** A calm panel: home's paper and floor, and her alone over it. */
function calmPanel(ctx: CanvasRenderingContext2D, F: Frame, b: Box, q: number, sc: Pt, sx: number, e: Pt, back: Pt[] | null): void {
  const pen = penFor(ctx, F, b.cx, b.cy, q, sc, LAUNDROMAT.ink, sx)
  const hw = b.w / 2 / q
  const hh = b.h / 2 / q
  const v: View = { x0: sc[0] - hw, y0: sc[1] - hh, x1: sc[0] + hw, y1: sc[1] + hh }
  ctx.fillStyle = LAUNDROMAT.bg
  ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0)
  ctx.fillStyle = HOME.floor
  ctx.fillRect(v.x0, CALM_FLOOR, v.x1 - v.x0, Math.max(0, v.y1 - CALM_FLOOR))
  if (pen.lod <= 2) {
    ctx.fillStyle = LAUNDROMAT.ink
    ctx.fillRect(v.x0, CALM_FLOOR - pen.lw / 2, v.x1 - v.x0, pen.lw)
  }
  evelyn(pen, e, back, LAUNDROMAT.ink)
}

/** The tubes coming on: 0 in the dark, 1 lit. A flicker on the half-beat, then on for good on 69, with a stammer. */
function lights(t: number): number {
  // In the dark the room comes up a little as she nears it, the way eyes get used to it.
  if (t < FLICKER) return 0.02 + 0.12 * smoothstep((t - (FLICKER - 3)) / 3)
  if (t < FLICKER + 0.06) return 0.75
  if (t < LIGHTS) return 0.12
  const x = t - LIGHTS
  if (x < 0.05) return 0.9
  if (x < 0.1) return 0.45
  return 1
}

const smoothstep = (u: number): number => {
  const x = Math.max(0, Math.min(1, u))
  return x * x * (3 - 2 * x)
}

/* ------------------------------------------------------------------ the part */

export const mosaic = part<MosaicState>(
  {
    name: 'mosaic',
    draw: () => {},
    over: (p: p5, s, c: Ctx) => {
      const t = s.begin + c.t
      // Only while the leg is on, and in the flickers just before it.
      if (t < s.begin - 1.0 || t > END + 0.05) return
      paint(p, s, c, t)
    },
  },
  (slot) => {
    const begin = slot.begin
    // She falls in straight down from the bagel's hole at 0.9 cells a second, gathering a little, and meets her end
    // of the plank just before beat 72.
    const contact = B(FIRST) - SWING / 2
    const Tf = contact - begin
    const v0 = 0.9
    const v1 = 1.35
    const D = ((v0 + v1) / 2) * Tf
    // The scene's origin in the part's cells: her seat, end up, is straight under where she came in.
    const O: Pt = [-0.5 - E_UP[0], D - E_UP[1]]
    const fall = (t: number): Pt => {
      const x = Math.max(0, Math.min(Tf, t - begin))
      return [-0.5 - O[0], v0 * x + (0.5 * (v1 - v0) * x * x) / Tf - O[1]]
    }
    const rest: Pt = [O[0] + E_UP[0], O[1] + E_UP[1]]

    // The lane: the fall, then her side of the machine, sampled from the same clock the panels draw from.
    const at = (t: number): Pt => {
      const m = machine(t, fall)
      return [O[0] + m.e[0], O[1] + m.e[1]]
    }
    const segs: Seg[] = [{ from: [-0.5, 0], to: rest, dur: Tf, ramp: [v0, v1] }]
    let t0 = contact
    for (let i = 0; i < SLAMS.length; i++) {
      const sl = SLAMS[i]
      const next = i + 1 < SLAMS.length ? SLAMS[i + 1].t - SWING / 2 : END
      const off = sl.t + SWING / 2
      if (sl.e) {
        // She rides her end down and sits, the plank bouncing under her; then the weight lands and she rides it up.
        segs.push(...carried(at, t0, off + 0.2, 15))
        segs.push({ from: at(off + 0.2), to: at(next), dur: next - (off + 0.2) })
        t0 = next
      } else {
        // Up with her end, and off it.
        segs.push(...carried(at, t0, off, 3))
        const T = sl.k === LAST ? LEAP_T : HOP_T
        const h = sl.k === LAST ? LEAP : HOP
        segs.push({ from: rest, to: rest, dur: T, arc: h })
        t0 = off + T
      }
    }
    const cellsKeys = shotsFor(begin, rest, O)
    const cam = director(() => [0, 0], [{ t: begin, cells: 4 }, ...cellsKeys], DURATION)
    const seeds = Array.from({ length: 34 }, (_, i) => ({
      x: -2.6 + 5.2 * hash(i, 2, 41),
      y: -D - 3 + (D + 4) * hash(i, 1, 41),
      s: 0.6 + 0.8 * hash(i, 3, 41),
      c: i % 4 === 0 ? VOID.poppy : i % 7 === 0 ? VOID.salt : VOID.sesame,
    }))
    return {
      cells: box(-6, -4, 6, D + 4),
      // The exit: exactly where the lane ends, where she rests.
      exit: [rest[0] + 0.5, rest[1]],
      lane: { segs, fire: B(FIRST) - begin },
      state: { begin, O, fall, cells: (t: number) => cam(t).cells, rest, seeds },
    }
  },
  (slot, built) => shotsFor(slot.begin, built.state.rest, built.state.O),
)

/** The stage camera: down with her in the dark, onto the machine as the lights come up, and at the end close on where she will rest. */
function shotsFor(begin: number, rest: Pt, O: Pt): PartShot[] {
  const mid: Pt = [O[0] + SCENE_MID[0], O[1] + SCENE_MID[1]]
  const calm: Pt = [rest[0], rest[1] - 0.3]
  return [
    { t: begin + 0.5, cells: 4, off: [0, 0.35] },
    { t: B(68), cells: 4, off: [0, 0.45] },
    { t: B(71), cells: 4, hold: mid, w: 1 },
    { t: B(116), cells: 4, hold: mid, w: 1 },
    { t: B(119), cells: 3.2, hold: calm, w: 1 },
    { t: END, cells: 3.2, hold: calm, w: 1 },
  ]
}

/* ------------------------------------------------------------------ the frame */

function paint(p: p5, s: MosaicState, c: Ctx, time: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, c.k)
  const W = p.width
  const H = p.height
  const fw = Math.min(W, (H * 16) / 9)
  const fh = (fw * 9) / 16
  const F: Frame = { W, H, d: p.pixelDensity(), fx: (W - fw) / 2, fy: (H - fh) / 2, fw, fh, cx: f.cx, cy: f.cy, k: c.k }
  // Before she comes (the flickers in the second before she tips in), the wall shows through as it will be.
  const early = time < s.begin
  const t = early ? B(113) + (time - s.begin) : time
  // Zoom (the viewer's Z) is the stage camera 1.5 times closer: the wall comes closer with it.
  const zf = (c.k * s.cells(time)) / fh > 1.25 ? 1.5 : 1
  const toScreen = (x: number, y: number): Pt => [W / 2 + (x - F.cx) * F.k, H / 2 + (y - F.cy) * F.k]
  const mc = machine(t, s.fall)
  const back = [3, 2, 1].map((i) => machine(t - i * 0.022, s.fall).e)

  ctx.save()
  ctx.setTransform(F.d, 0, 0, F.d, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const { g, split } = early ? { g: STEPS[5].g, split: 1 } : gridAt(t)
  const flip = flipAt(t)
  const calm = !early && flip.n >= FLIPS.length

  // The layout, in CSS px: panel (i, j) is centred at (X0 + (i - ox) pw, Y0 + (j - oy) ph), zoomed about the frame's
  // middle.
  const pw = (fw / g.cols) * zf
  const ph = (fh / g.rows) * zf
  const gut = Math.min(7, Math.max(1.3, 0.03 * Math.min(pw, ph))) * split
  // Where each panel looks, and how close: the stage's own camera while there is one panel, the machine after.
  const own = 1 - split
  const qLay = ((ph - gut) / cellsTall(ph, fh * zf)) * ringAt(t) * (early ? 1 : pushAt(t))
  const q = lerp(qLay, F.k, own)
  const jolt = Number.isFinite(mc.m.since) && mc.m.since >= 0 ? 0.03 * Math.exp(-mc.m.since / 0.06) * Math.min(1.5, mc.m.s) : 0
  const realSc: Pt = [F.cx - s.O[0], F.cy - s.O[1]]
  const sc: Pt = [lerp(SCENE_MID[0], realSc[0], own), lerp(SCENE_MID[1], realSc[1], own) - jolt]
  // Zoom comes closer on the home panel's seat, where her throws start, so that she stays in the frame.
  const cx0 = F.fx + fw / 2
  const cy0 = F.fy + fh / 2
  const anchor: Pt = [cx0 - (g.ox * pw) / zf + ((E_UP[0] - sc[0]) * q) / zf, cy0 - (g.oy * ph) / zf + ((E_UP[1] - sc[1]) * q) / zf]
  const X0 = lerp(anchor[0] + zf * (cx0 - anchor[0]), cx0, own)
  const Y0 = lerp(anchor[1] + zf * (cy0 - anchor[1]), cy0, own)
  // On the crescendo the wall slides until the home panel's Evelyn sits on the stage's own: where the frames close.
  const P = toScreen(s.O[0] + mc.e[0], s.O[1] + mc.e[1])
  const homeE: Pt = [X0 - g.ox * pw + (mc.e[0] - sc[0]) * q, Y0 - g.oy * ph + (mc.e[1] - sc[1]) * q]
  const align = early ? 0 : smoothstep((t - B(119.5)) / (B(121) - B(119.5)))
  const shift: Pt = [(P[0] - homeE[0]) * align, (P[1] - homeE[1]) * align]
  const sigma = calm ? gatherAt(t) : 1
  const place = (x: number, y: number): Pt => [P[0] + sigma * (x + shift[0] - P[0]), P[1] + sigma * (y + shift[1] - P[1])]

  // The panels that can be seen: the canvas taken back into the wall.
  const [ax, ay] = [-shift[0], -shift[1]]
  let ia = Math.floor((ax - X0) / pw + g.ox - 0.5)
  let ib = Math.ceil((ax + W - X0) / pw + g.ox + 0.5)
  let ja = Math.floor((ay - Y0) / ph + g.oy - 0.5)
  let jb = Math.ceil((ay + H - Y0) / ph + g.oy + 0.5)
  // One panel, before the first break: no neighbours at its edges.
  if (split <= 0) ia = ib = ja = jb = 0

  if (calm) {
    // Every panel has turned to the same calm floor, and they turn out to be windows on one place, the stage's own,
    // with one of her in it.
    const [ox, oy] = toScreen(s.O[0], s.O[1])
    calmPanel(ctx, F, { cx: W / 2, cy: H / 2, w: W, h: H }, F.k, [(W / 2 - ox) / F.k, (H / 2 - oy) / F.k], 1, mc.e, null)
    // The net of frames closes on her and thins away.
    const ga = Math.pow(sigma, 0.8)
    ctx.setTransform(F.d, 0, 0, F.d, 0, 0)
    if (ga > 0.01) {
      const [gx0, gy0] = place(X0 + (ia - 0.5 - g.ox) * pw, Y0 + (ja - 0.5 - g.oy) * ph)
      const [gx1, gy1] = place(X0 + (ib + 0.5 - g.ox) * pw, Y0 + (jb + 0.5 - g.oy) * ph)
      ctx.beginPath()
      ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0)
      for (let j = ja; j <= jb; j++) {
        for (let i = ia; i <= ib; i++) {
          const [cx, cy] = place(X0 + (i - g.ox) * pw, Y0 + (j - g.oy) * ph)
          const w = (pw - gut) * sigma * flip.w
          const h = (ph - gut) * sigma
          ctx.rect(cx - w / 2, cy - h / 2, w, h)
        }
      }
      ctx.fillStyle = rgba(MULTI_THEME.bg, ga)
      ctx.fill('evenodd')
    }
    // Her, and the light of her landing.
    const pen = penFor(ctx, F, ox, oy, F.k, [0, 0], LAUNDROMAT.ink)
    const x = t - END
    if (x > -0.2) glow(pen, E_UP[0], CALM_FLOOR, 1.3, HOME.light, 0.45 * Math.exp(-Math.abs(x) / 0.1))
    evelyn(pen, mc.e, null, LAUNDROMAT.ink)
    ctx.restore()
    return
  }

  // The gutters: the dark between worlds, under the whole wall.
  ctx.setTransform(F.d, 0, 0, F.d, 0, 0)
  ctx.fillStyle = MULTI_THEME.bg
  ctx.fillRect(0, 0, W, H)
  for (let j = ja; j <= jb; j++) {
    for (let i = ia; i <= ib; i++) {
      const [cx, cy] = place(X0 + (i - g.ox) * pw, Y0 + (j - g.oy) * ph)
      const b: Box = { cx, cy, w: (pw - gut) * flip.w, h: ph - gut }
      if (cx + b.w / 2 < 0 || cx - b.w / 2 > W || cy + b.h / 2 < 0 || cy - b.h / 2 > H) continue
      if (b.w < 0.5 || b.h < 0.4) continue
      const home = i === 0 && j === 0 && flip.n === 0
      const skin = home ? SKINS.home : skinAt(i, j, flip.n)
      const dark = home ? 0.97 * (1 - lights(t)) : 0
      panel(ctx, F, skin, b, q, sc, flip.w, mc, back, dark)
    }
  }
  // In the dark she falls past seeds from the bagel, which go as the lights come.
  if (split <= 0 && t < LIGHTS + 0.4) seedsInDark(ctx, F, s, t, q, sc, place(X0, Y0))
  ctx.restore()
}

/** The bagel's seeds she falls past in the dark, drifting down slower than she does. */
function seedsInDark(ctx: CanvasRenderingContext2D, F: Frame, s: MosaicState, t: number, q: number, sc: Pt, c: Pt): void {
  penFor(ctx, F, c[0], c[1], q, sc, VOID.sesame)
  const fade = 1 - smoothstep((t - FLICKER) / (LIGHTS + 0.4 - FLICKER))
  const x = t - s.begin
  for (const sd of s.seeds) {
    const y = sd.y + 0.28 * x * sd.s
    ctx.fillStyle = rgba(sd.c, 0.55 * fade)
    ctx.beginPath()
    ctx.ellipse(sd.x + 0.05 * Math.sin(x * 0.7 + sd.y), y, 0.032 * sd.s, 0.017 * sd.s, x * 0.4 * sd.s + sd.x, 0, Math.PI * 2)
    ctx.fill()
  }
}
