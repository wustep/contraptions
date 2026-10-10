import type p5 from 'p5'
import { R, type Pt, type Seg } from '../../../../../parts'
import { director } from '../camera'
import { box, carried, frame, part, type Ctx, type PartShot } from '../kit'
import { DURATION, fight, JUMPS, strength } from '../music'
import { EVELYN, EYE_WHITE, JOY, LAUNDROMAT, MULTI_THEME, VOID, VOID_THEME, WAYMOND } from '../worlds'
import { penOf, room } from '../home/set'
import { drawArm, drawDesk, drawGiftBox, drawGlove, drawHammer, drawKaraoke, drawLanterns, drawLid, drawPartyWall, drawSteamers, drawTable, drawTrap, jumpersIn } from '../home/kindness-draw'
import { lidAt } from '../home/kindness-plan'
import { KINDNESS_AT } from '../home/kindness'
import { PANEL_LOOKS, paintPicture, pixelOf, prefersCalm } from '../film'
import { backdrop, HP, LE, LW, PL, SKINS, skinAt, TH, TILT, WEDGE, type Moment, type Skin, type View } from './skins'
import { at, circle, glow, hash, lodFor, mix, poly, rect, rgba, type Pen } from './skins-pen'

/**
 * ALL AT ONCE. Evelyn tips into the bagel's hole (a violet flare off her, the bagel's seeds flung wide) and falls,
 * slowly, through the dark, and the dark is the
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
 * gravity, in every life at once. Then, of all of them, this one: the camera dives into the wall, toward the panel
 * that is home, on 121½, 122 and 122½, a lurch a beat, every other life swelling past the frame's edges as it goes.
 * Home's panel is the laundromat's own room at the party corner, Jobu's jumpers already in it; it comes to fill the
 * frame, and on the great hit (123) she lands alone on its floor, at rest, where the kindness begins.
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
/**
 * The dive into home's panel: a lurch closer on each of these beats, then the last of the way eased onto the great
 * hit, where the panel is the frame. How far, in shares of the whole dive (in scale), after each lurch.
 */
const DIVE = [B(121.5), B(122), B(122.5)]
const DIVE_STEPS = [0.24, 0.47, 0.7]
/** The wall's last grid is twelve panels across: the dive comes twelve times closer. */
const DIVE_TO = 12
const ONE: Grid = { cols: 1, rows: 1, ox: 0, oy: 0 }
/** The breath in before a break: how far, and how long. */
const WIND = 0.035
const WIND_T = 0.22

/**
 * Every strike: the tip into the hole (fight 59: a violet flare off her, the bagel's seeds flung), the tubes, each
 * beat's slam from 72 to 121, the dive's lurches on 121½, 122 and 122½, and her landing on the great hit.
 */
export const MOSAIC_HITS: number[] = [JUMPS.mosaic, FLICKER, LIGHTS, ...Array.from({ length: LAST - FIRST + 1 }, (_, i) => B(FIRST + i)), B(121.5), B(122), B(122.5), END]

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

/** How far the dive into home's panel has gone at `t`: 0 the wall, 1 the panel is the frame (in shares of its scale). */
function diveAt(t: number): number {
  let v = 0
  for (let i = 0; i < DIVE.length; i++) {
    const x = t - DIVE[i]
    if (x <= 0) break
    const from = i === 0 ? 0 : DIVE_STEPS[i - 1]
    v = from + (DIVE_STEPS[i] - from) * (1 - Math.exp(-x / 0.07))
  }
  // The last of the way: from just after the last lurch, eased to rest a few frames before the great hit, so the panel
  // is the whole frame, with no edge of the wall left at its sides, before the cut.
  const u = Math.max(0, Math.min(1, (t - DIVE[2] - 0.06) / (END - 0.06 - DIVE[2] - 0.06)))
  // Whatever of the way the lurches have left, so it is all the way at the end.
  return v + (1 - v) * u * u * (3 - 2 * u)
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

/* ------------------------------------------------------------------ the family, in every life */

/**
 * In every life she has, he is there. As the wall multiplies, Waymond is beside her machine in more and more of the
 * worlds, on the ground past the weight, his googly eye on her: one panel in eight by beat 80, half by 100, three in
 * four by the crescendo. In the last phrases Joy is there in some, on her side, without an eye yet (hers comes at the
 * peak). Each arrives on a beat, dropping in with a little bounce, and stays. The home panel, dark at first, has
 * neither: there he is waiting at the party table, where the fold brings her.
 */
const WAY_X = 1.37
const JOY_X = -1.37
/** On which beat a panel's Waymond, or Joy, arrives, or never: from the panel's own hash, earlier for more of them. */
function arrives(i: number, j: number, who: 'w' | 'j'): number {
  const h = hash(i * 7 + 3, j * 11 + 5, who === 'w' ? 61 : 67)
  if (who === 'w') return h < 0.78 ? B(Math.round(77 + (h / 0.78) * 40)) : Infinity
  return h < 0.32 ? B(Math.round(105 + (h / 0.32) * 14)) : Infinity
}
/** How far down from the drop an arrival is `u` seconds in: a fall of half a cell, a bounce, settled. */
const drop = (u: number): number => (u < 0.16 ? -0.55 * (1 - (u / 0.16) ** 2) : -0.09 * Math.max(0, Math.sin(((u - 0.16) / 0.22) * Math.PI)) * Math.exp(-(u - 0.16) / 0.3))

function familyBall(pen: Pen, x: number, y: number, color: string, eyeOn: Pt | null): void {
  const { ctx } = pen
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, pen.lod === 3 ? Math.max(R, 1.1 / pen.q) : R, 0, Math.PI * 2)
  ctx.fill()
  if (pen.lod === 3) return
  if (pen.lod <= 1) {
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw
    ctx.stroke()
  }
  if (!eyeOn || pen.lod > 2) return
  // His googly eye, its pupil turned to her.
  const er = R * 0.62
  const a = Math.atan2(eyeOn[1] - y, eyeOn[0] - x)
  ctx.fillStyle = EYE_WHITE
  ctx.beginPath()
  ctx.arc(x, y - R * 0.12, er, 0, Math.PI * 2)
  ctx.fill()
  if (pen.lod <= 1) {
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * 0.8
    ctx.stroke()
  }
  ctx.fillStyle = '#141414'
  ctx.beginPath()
  ctx.arc(x + Math.cos(a) * er * 0.42, y - R * 0.12 + Math.sin(a) * er * 0.42, er * 0.46, 0, Math.PI * 2)
  ctx.fill()
}

/** Whoever of the family is in panel (i, j) at `t`, beside her machine. */
function family(pen: Pen, i: number, j: number, t: number, e: Pt): void {
  const w = arrives(i, j, 'w')
  if (t >= w) familyBall(pen, WAY_X, -R + drop(t - w), WAYMOND, e)
  const jo = arrives(i, j, 'j')
  if (t >= jo) familyBall(pen, JOY_X, -R + drop(t - jo), JOY, null)
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
function panel(ctx: CanvasRenderingContext2D, F: Frame, skin: Skin, b: Box, q: number, sc: Pt, sx: number, mc: Machine, back: Pt[] | null, dark = 0, cell?: [number, number]): void {
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
  if (cell && dark < 0.5) family(pen, cell[0], cell[1], mc.m.t, mc.e)
  // In the dark her ring is the dark's own ink, as it was in the bagel.
  evelyn(pen, mc.e, back, dark > 0 ? mix(skin.ink, VOID_THEME.ink, dark) : skin.ink)
  if (skin.front && dark < 0.5) skin.front(pen, mc.m, v)
  // Every panel is the picture its life is in: a wall of every kind of film at once (`film.ts`).
  const look = PANEL_LOOKS[skin.key]
  if (look && dark < 0.5) paintPicture(ctx, look, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0, mc.m.t + hash(Math.round(b.cx), Math.round(b.cy), 7), prefersCalm(), pixelOf(ctx), 0.6, pen.lod >= 1)
  ctx.restore()
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
  // As the net closes the frame settles with her, low, so the great hit lands on the room and not on the ground
  // under it: the floor near the bottom, the wall over her.
  const low: Pt = [rest[0], rest[1] - 0.72]
  return [
    { t: begin + 0.5, cells: 4, off: [0, 0.35] },
    { t: B(68), cells: 4, off: [0, 0.45] },
    { t: B(71), cells: 4, hold: mid, w: 1 },
    { t: B(116), cells: 4, hold: mid, w: 1 },
    { t: B(119), cells: 3.2, hold: calm, w: 1 },
    { t: B(121.5), cells: 3.2, hold: calm, w: 1 },
    { t: END, cells: 3.2, hold: low, w: 1 },
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
  // The dive into home's panel: how far (0..1), how much closer the wall is, and how far home's panel has become the
  // stage's own view (its scale and its middle), which it is wholly on the great hit.
  const dv = early ? 0 : diveAt(t)
  const zoom = Math.exp(dv * Math.log(DIVE_TO))
  const land = smoothstep((dv - 0.5) / 0.5)

  // The layout, in CSS px: panel (i, j) is centred at (X0 + (i - ox) pw, Y0 + (j - oy) ph), zoomed about the frame's
  // middle.
  const pw = (fw / g.cols) * zf
  const ph = (fh / g.rows) * zf
  // The gutters thin away as the dive goes in, so home's panel has no dark edge when it is the frame.
  const gut = Math.min(7, Math.max(1.3, 0.03 * Math.min(pw, ph))) * split * (1 - dv)
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
  const place = (x: number, y: number): Pt => [x + shift[0], y + shift[1]]
  // In the dive every panel looks closer by the dive's own zoom, and home's comes to look as the stage does.
  const qD = lerp(q * zoom, F.k, land)
  const scD: Pt = [lerp(sc[0], realSc[0], land), lerp(sc[1], realSc[1], land)]
  // Home's panel: laid on the wall; in the dive, held so that she stays where the stage has her (the wall was slid
  // there by the crescendo), the rest of the wall swelling out from it.
  const cHome: Pt = dv > 0 ? [P[0] - (mc.e[0] - scD[0]) * qD, P[1] - (mc.e[1] - scD[1]) * qD] : place(X0 - g.ox * pw, Y0 - g.oy * ph)
  const zpw = zoom * pw
  const zph = zoom * ph

  // The panels that can be seen: the canvas taken back into the wall.
  let ia = Math.floor(-cHome[0] / zpw - 0.5)
  let ib = Math.ceil((W - cHome[0]) / zpw + 0.5)
  let ja = Math.floor(-cHome[1] / zph - 0.5)
  let jb = Math.ceil((H - cHome[1]) / zph + 0.5)
  // One panel, before the first break: no neighbours at its edges.
  if (split <= 0) ia = ib = ja = jb = 0

  // The gutters: the dark between worlds, under the whole wall.
  ctx.setTransform(F.d, 0, 0, F.d, 0, 0)
  ctx.fillStyle = MULTI_THEME.bg
  ctx.fillRect(0, 0, W, H)
  // Before the first tear there is one panel and no neighbours: it is the whole stage, not a 16:9 box in the middle of
  // a wider one with the dark down its sides. As the first tear opens (`split` 0 to 1) the home panel shrinks to its
  // 16:9 place in step, rather than snapping to it. While it is still oversized it is drawn first, so the neighbours
  // on every side come in over it and the tear opens evenly.
  for (const first of [true, false]) for (let j = ja; j <= jb; j++) {
    for (let i = ia; i <= ib; i++) {
      const whole = i === 0 && j === 0 && split < 1
      if (whole !== first) continue
      const cx = cHome[0] + i * zpw
      const cy = cHome[1] + j * zph
      const own: Box = { cx, cy, w: (pw - gut) * zoom, h: (ph - gut) * zoom }
      const b: Box = whole
        ? { cx, cy, w: own.w + (2 * Math.max(cx, W - cx) + 2 - own.w) * (1 - split), h: own.h + (2 * Math.max(cy, H - cy) + 2 - own.h) * (1 - split) }
        : own
      if (cx + b.w / 2 < 0 || cx - b.w / 2 > W || cy + b.h / 2 < 0 || cy - b.h / 2 > H) continue
      if (b.w < 0.5 || b.h < 0.4) continue
      const home = i === 0 && j === 0
      // From the dive, home's panel is home itself, drawn after the rest (below).
      if (home && t >= DIVE[0]) continue
      const skin = home ? SKINS.home : skinAt(i, j, 0)
      const dark = home ? 0.97 * (1 - lights(t)) : 0
      // The family in every life but home's own panel.
      panel(ctx, F, skin, b, qD, scD, 1, mc, back, dark, home ? undefined : [i, j])
    }
  }
  // From the dive, home's panel is home itself: the laundromat's room at the party corner, as the kindness has it,
  // over the rest of the wall. As it lands it grows to the whole stage, not only its 16:9 frame, so on a taller or a
  // wider stage no edge of the wall is left round it at the cut.
  if (!early && t >= DIVE[0]) {
    const w = (pw - gut) * zoom
    const h = (ph - gut) * zoom
    const b: Box = { cx: cHome[0], cy: cHome[1], w: w + Math.max(0, 2 * Math.max(cHome[0], W - cHome[0]) + 2 - w) * land, h: h + Math.max(0, 2 * Math.max(cHome[1], H - cHome[1]) + 2 - h) * land }
    drawHome(p, ctx, F, s, c, time, b, cHome, qD, scD, mc, back)
  }
  // In the dark she falls past seeds from the bagel, which go as the lights come.
  if (split <= 0 && t < LIGHTS + 0.4) seedsInDark(ctx, F, s, t, q, sc, place(X0, Y0), mc.e, mix(LAUNDROMAT.ink, VOID_THEME.ink, 0.97 * (1 - lights(t))))
  ctx.restore()
}

/**
 * Home's panel in the dive: the laundromat's own room (`home/set.ts`) and the party corner with Jobu's jumpers
 * waiting in it (`home/kindness-draw.ts`), drawn as the stage will draw them from the great hit, only smaller, with
 * the panel's own scale and middle: where she comes to rest is where the kindness leg has her, so the cut on the great
 * hit changes nothing at all.
 */
function drawHome(p: p5, ctx: CanvasRenderingContext2D, F: Frame, s: MosaicState, c: Ctx, time: number, b: Box, cHome: Pt, q: number, sc: Pt, mc: Machine, back: Pt[] | null): void {
  ctx.save()
  ctx.setTransform(F.d, 0, 0, F.d, 0, 0)
  ctx.beginPath()
  ctx.rect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h)
  ctx.clip()
  // A room cell w is, in the part's cells, w + T; in the scene's, w + T - O; and on the screen it is laid as the panel
  // lays the scene. The room draws in cells times the stage's k, so the transform scales that by q / k.
  const T: Pt = [s.rest[0] - (KINDNESS_AT[0] - 0.5), s.rest[1] - KINDNESS_AT[1]]
  const r = q / F.k
  const ex = cHome[0] + (T[0] - s.O[0] - sc[0]) * q
  const ey = cHome[1] + (T[1] - s.O[1] - sc[1]) * q
  ctx.setTransform(F.d * r, 0, 0, F.d * r, F.d * ex, F.d * ey)
  p.push()
  room.draw(p, null, { k: c.k, t: time, since: 0, ink: LAUNDROMAT.ink, bg: LAUNDROMAT.bg, weight: c.weight, color: EVELYN, theme: LAUNDROMAT, spin: () => 0 })
  const pen = penOf(p, { k: c.k, ink: LAUNDROMAT.ink, weight: c.weight })
  drawPartyWall(pen, time)
  drawDesk(pen)
  drawLanterns(pen, time)
  drawTable(pen)
  drawKaraoke(pen)
  drawSteamers(pen)
  drawGiftBox(pen)
  if (jumpersIn(time)) {
    drawHammer(pen, time)
    drawTrap(pen, time)
    drawArm(pen, time)
    drawGlove(pen, time)
  }
  const lid = lidAt(time)
  drawLid(pen, lid.at, lid.turn)
  p.pop()
  // Her, over it all.
  const her = penFor(ctx, F, cHome[0], cHome[1], q, sc, LAUNDROMAT.ink)
  evelyn(her, mc.e, back, LAUNDROMAT.ink)
  ctx.restore()
}

/**
 * The bagel's seeds she falls past in the dark, drifting down slower than she does. On the tip in (the first
 * instant of the leg, fight 59) she comes through the hole with a violet flare off her, and the seeds round her are
 * flung outward, with a spray of new ones from where she broke through; they slow in the dark and drift on.
 */
function seedsInDark(ctx: CanvasRenderingContext2D, F: Frame, s: MosaicState, t: number, q: number, sc: Pt, c: Pt, e: Pt, ink: string): void {
  const pen = penFor(ctx, F, c[0], c[1], q, sc, VOID.sesame)
  const fade = 1 - smoothstep((t - FLICKER) / (LIGHTS + 0.4 - FLICKER))
  const x = t - s.begin
  const hit = s.fall(s.begin)
  const fling = x < 0 ? 0 : 1 - Math.exp(-x / 0.3)
  for (const sd of s.seeds) {
    const dx = sd.x - hit[0]
    const dy = sd.y - hit[1]
    const d = Math.hypot(dx, dy) || 1
    const push = (0.9 * fling) / (1 + d * 0.6)
    const y = sd.y + 0.28 * x * sd.s + (dy / d) * push
    ctx.fillStyle = rgba(sd.c, 0.55 * fade)
    ctx.beginPath()
    ctx.ellipse(sd.x + 0.05 * Math.sin(x * 0.7 + sd.y) + (dx / d) * push, y, 0.032 * sd.s, 0.017 * sd.s, x * 0.4 * sd.s + sd.x, 0, Math.PI * 2)
    ctx.fill()
  }
  if (x < 0 || x > 3) return
  // The spray: seeds thrown out from where she came through, slowing in the dark.
  for (let i = 0; i < 42; i++) {
    const a = hash(i, 5, 43) * Math.PI * 2
    const sp = 2.2 + 3.6 * hash(i, 6, 43)
    const size = 1 + 0.9 * hash(i, 8, 43)
    const drag = 3.2
    const r = (sp / drag) * (1 - Math.exp(-drag * x))
    const sx = hit[0] + Math.cos(a) * r
    const sy = hit[1] + Math.sin(a) * r + 0.28 * x
    const col = i % 5 === 0 ? VOID.poppy : i % 6 === 0 ? VOID.salt : VOID.sesame
    ctx.fillStyle = rgba(col, 0.9 * fade * (0.55 + 0.45 * Math.exp(-x / 0.6)))
    ctx.beginPath()
    ctx.ellipse(sx, sy, 0.05 * size, 0.024 * size, a + x * 3 * (hash(i, 7, 43) - 0.5), 0, Math.PI * 2)
    ctx.fill()
  }
  // The flare: violet, off her, gone in a moment; a hot core for the first frames.
  glow(pen, hit[0], hit[1] + 0.9 * x, 2.1, VOID.glow, 0.9 * Math.exp(-x / 0.16))
  glow(pen, hit[0], hit[1] + 0.9 * x, 0.7, VOID.rimLight, 0.8 * Math.exp(-x / 0.06))
  evelyn(pen, e, null, ink)
}
