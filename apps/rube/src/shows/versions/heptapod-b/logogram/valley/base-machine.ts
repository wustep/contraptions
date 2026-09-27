import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, knock, lastOf } from '../kit'
import { PULSES, pulse } from '../music'
import { VALLEY } from '../worlds'
import { PAD } from './camp'
import { BELLY, MEADOW, SHELL_X } from './geo'
import { clamp01, lobe, rgbOf, sm } from './set-air'
import { openAt } from './set'

/**
 * The base's machine (the valley builder's): the camp's own hardware, hers to make go. World cells, y down; every
 * state here is a function of show time, so the drawing and the lanes read the same numbers.
 *
 * - The starter: a steel bucket hanging at the helideck's edge on a rope over a davit's pulley, the rope wound round
 *   the drum on the generator's flywheel. She rolls off the deck into the bucket (26.604); her weight takes it down
 *   to the meadow, pulling the rope off the drum, and it thuds down on 27.028 with the flywheel spinning. The engine
 *   coughs (27.55, 27.776) and catches (28.021); from then on it puffs on every pulse, the flapper on its stack
 *   lifting with each. The bucket tips her out, and the recoil winds it back up to its place.
 * - The switch: a steel plank on a trestle, its near end on the ground. She rolls up it; past the trestle it tips and
 *   its far end comes down on the contact plate (29.681): the power goes up the lamp mast, a lamp a pulse, to the
 *   bank at its head (36.13), which looks up at the belly. Ian, a step behind, tips it again (32.549).
 * - The floodlights: three on stands round the lift, looking up at the slot. They answer it: 38.534, 38.772, 39.735.
 * - The steps: a steel stair up to the lift's deck (its top 1 cell over the meadow).
 */

/* ------------------------------------------------------------------ where everything is */

/** The generator on its skid, its engine, the flywheel on its near end and the drum at its hub, the stack. */
export const GEN = { x0: -18.9, x1: -16.3, skid: MEADOW - 0.3, top: MEADOW - 1.75 }
export const FLY: Pt = [-18.42, MEADOW - 1.02]
const FLY_R = 0.5
const DRUM_R = 0.12
const STACK_X = -16.85
const STACK_TOP = MEADOW - 3.05
/** The davit on the skid's near end, and its pulley. */
const DAVIT_X = -18.78
const PULLEY: Pt = [-19.32, MEADOW - 2.78]
/** The bucket: its middle, hanging, rim flush with the deck's top; its size. */
export const BUCKET = { x: -19.3, rim: PAD.top, h: 0.44, w0: 0.4, w1: 0.31 }
/** How far it falls under her: its bottom from hanging to the meadow. */
const BUCKET_DROP = MEADOW - (BUCKET.rim + BUCKET.h)

/** The plank switch: its trestle's pivot, its half-length, its angle at rest (near end down) and tipped. */
export const PLANK = { pivot: [-15.2, MEADOW - 0.3] as Pt, half: 0.85, t: 0.05 }
export const PLANK_REST = -Math.asin((MEADOW - (MEADOW - 0.3) - 0.025) / 0.85)
export const PLANK_TIP = Math.asin((0.3 - 0.13) / 0.85)
const CONTACT: Pt = [PLANK.pivot[0] + 0.85 * Math.cos(PLANK_TIP), MEADOW - 0.1]
/** The lamp mast: where it stands, its lamps up it (heights), and its head. */
const MAST_X = -13.4
const LAMP_H = [2.4, 4.4, 6.4, 8.4, 10.4]
const HEAD_H = 12.1
/** The floodlights: where each stands. */
export const FLOODS = [-10.0, 3.95, 6.7]
/** The steps up to the deck: two treads and a landing, and where each hop lands. */
export const STEPS = { x0: -3.1, treads: [[-3.1, -2.8, 0.33], [-2.8, -2.45, 0.67], [-2.45, -1.8, 1.0]] as [number, number, number][] }

/* ------------------------------------------------------------------ the music it keeps */

export const INTO_BUCKET = pulse(111)
export const THUD = pulse(113)
/** The bucket, tipping over forward, comes down on its side: she rolls out of its mouth. */
export const TIPPED = pulse(114)
export const COUGHS = [pulse(115), pulse(116)]
export const CATCH = pulse(117)
export const TIP = pulse(124)
export const IAN_TIP = pulse(136)
export const LAMPS = [pulse(129), pulse(132), pulse(135), pulse(141), pulse(148)]
export const HEAD = pulse(151)
export const FLOOD_ON = [pulse(161), pulse(162), pulse(166)]

/* ------------------------------------------------------------------ the starter */

/** How far the bucket has come down (0 hanging .. BUCKET_DROP on the meadow), how far tipped (radians), at `t`. */
export function bucketAt(t: number): { drop: number; tip: number } {
  if (t < INTO_BUCKET) return { drop: 0.012 * knock(t - (INTO_BUCKET - 1.5), 0.3) * 0, tip: 0 }
  if (t < THUD) {
    // Under her weight, against the rope and the flywheel: gathering speed all the way down.
    const u = (t - INTO_BUCKET) / (THUD - INTO_BUCKET)
    return { drop: BUCKET_DROP * u * u, tip: 0 }
  }
  // On the meadow: it tips over forward, gathering, onto its side (a knock), and lies there while she rolls out;
  // the recoil takes it back up.
  const u = clamp01((t - THUD) / (TIPPED - THUD))
  const knockBack = t > TIPPED ? 0.08 * Math.exp(-(t - TIPPED) / 0.1) * Math.sin(Math.min(Math.PI, (t - TIPPED) * 18)) : 0
  const tip = ((Math.PI / 2) * u * u - knockBack) * (1 - sm(t, 29.0, 29.8))
  const back = sm(t, 29.3, 31.2)
  const settle = t > 31.2 ? 0.05 * Math.exp(-(t - 31.2) / 0.5) * Math.sin((t - 31.2) * 6) : 0
  return { drop: BUCKET_DROP * (1 - back) + settle, tip }
}

/** The bucket's floor (where she sits in it), in the world, at `t`: while it falls. */
export function bucketSeat(t: number): Pt {
  const { drop } = bucketAt(t)
  return [BUCKET.x, BUCKET.rim + drop + BUCKET.h - 0.03 - R]
}

/** Where she is while the bucket tips over on the meadow: its floor, turned with it about its bottom's far edge. */
export function tipSeat(t: number): Pt {
  const { tip } = bucketAt(t)
  const px = BUCKET.x + BUCKET.w1 / 2
  const py = MEADOW
  const x = BUCKET.x - px
  const y = MEADOW - 0.03 - R - py
  const c = Math.cos(tip)
  const s = Math.sin(tip)
  return [px + x * c - y * s, py + x * s + y * c]
}

/** The flywheel's angle at `t`: still; spun by the rope; coasting; the coughs; running. Integrated once. */
const FLY_T0 = 25
const FLY_DT = 0.005
const flyTable: number[] = (() => {
  const out: number[] = [0]
  let phi = 0
  let w = 0
  for (let t = FLY_T0; t < 60; t += FLY_DT) {
    if (t >= INTO_BUCKET && t < THUD) {
      // The rope pulls it round as the bucket falls.
      const u = (t - INTO_BUCKET) / (THUD - INTO_BUCKET)
      w = (2 * BUCKET_DROP * u) / (THUD - INTO_BUCKET) / DRUM_R
    } else if (t >= THUD) {
      const run = t >= CATCH ? 26 : 0
      // Coasting down, kicked by the coughs, then caught and running.
      w += (run - w) * (1 - Math.exp(-FLY_DT / (t >= CATCH ? 0.35 : 0.7)))
      for (const c of COUGHS) if (t >= c && t < c + FLY_DT) w += 9
    }
    phi += w * FLY_DT
    out.push(phi)
  }
  return out
})()
export function flyAt(t: number): { phi: number; w: number } {
  if (t <= FLY_T0) return { phi: 0, w: 0 }
  const i = (t - FLY_T0) / FLY_DT
  if (i >= flyTable.length - 1) return { phi: flyTable[flyTable.length - 1] + 26 * (t - (FLY_T0 + (flyTable.length - 1) * FLY_DT)), w: 26 }
  const j = Math.floor(i)
  const f = i - j
  return { phi: flyTable[j] * (1 - f) + flyTable[j + 1] * f, w: (flyTable[j + 1] - flyTable[j]) / FLY_DT }
}

/** The exhaust: a cough, a cough, the catch, then a puff on every pulse, as hard as it is sung. */
const RUN_PULSES = PULSES.filter((p) => p.t > CATCH + 0.01).map((p) => ({ t: p.t, g: p.g }))
const PUFFS: { t: number; size: number; dark: number }[] = [
  { t: COUGHS[0], size: 1.0, dark: 1.3 },
  { t: COUGHS[1], size: 1.3, dark: 1.4 },
  { t: CATCH, size: 1.8, dark: 1.5 },
  ...RUN_PULSES.map((p) => ({ t: p.t, size: 0.35 + 0.55 * Math.min(1.4, p.g), dark: 0.25 })),
]
const PUFF_TIMES = PUFFS.map((p) => p.t)

/* ------------------------------------------------------------------ the switch */

/** The plank's angle at `t` (radians, y down: negative is its far end up). Tipped by her and by Ian, back between. */
export function plankAt(t: number): number {
  const tip = (at: number, back: number) => sm(t, at - 0.085, at) - sm(t, back, back + 0.9)
  const a = Math.max(tip(TIP, 30.55), tip(IAN_TIP, 33.4))
  const bounce = (at: number) => (t > at ? 0.05 * Math.exp(-(t - at) / 0.12) * Math.sin((t - at) * 30) : 0)
  return PLANK_REST + (PLANK_TIP - PLANK_REST) * clamp01(a) - bounce(TIP) - bounce(IAN_TIP) * 0.7
}
/** A point along the plank's top, `s` cells from its pivot (negative toward its near end), at angle `a`. */
export function plankTop(s: number, a: number, lift = R): Pt {
  const [px, py] = PLANK.pivot
  const c = Math.cos(a)
  const n = Math.sin(a)
  // Its top face is t/2 above the line through the pivot; the ball's centre `lift` above that.
  return [px + s * c + n * (PLANK.t / 2 + lift), py + s * n - c * (PLANK.t / 2 + lift)]
}

/** How lit the mast's lamps are: each from its pulse, the head from HEAD. */
function lampAt(t: number, at: number): number {
  const u = t - at
  if (u < 0) return 0
  // Struck: a flare, a flicker, and steady; paler once the daylight comes through at the end.
  const on = Math.min(1.25, sm(u, 0, 0.05) * (1 + 0.35 * Math.exp(-u / 0.12)) - 0.35 * Math.exp(-((u - 0.16) ** 2) / 0.002))
  return on * (1 - 0.55 * openAt(t))
}
/** The floodlights: each bangs on on its pulse and settles; they go out, one by one, as the shell goes. */
function floodAt(t: number, i: number): number {
  const u = t - FLOOD_ON[i]
  if (u < 0) return 0
  const out = 1 - sm(t, 188.4 + i * 0.9, 189.6 + i * 0.9)
  return sm(u, 0, 0.04) * (1 + 0.5 * Math.exp(-u / 0.15)) * out
}

/* ------------------------------------------------------------------ drawing */

const X = (k: number, v: number) => v * k

function quad(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** Light: the floods' beams up to the belly, the lamps' glow; behind everything of the camp. */
export function drawLight(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const warm = rgbOf(VALLEY.floodlight)
  const lamp = rgbOf(VALLEY.lamp)
  // The mast's lamps: a soft glow each, and the fog round the ones in it lit.
  LAMP_H.forEach((h, i) => {
    const on = lampAt(t, LAMPS[i])
    if (on <= 0.01) return
    const side = i % 2 ? 1 : -1
    const [x, y] = [MAST_X + side * 0.42, MEADOW - h]
    const inFog = sm(h, 6, 7.2) * (1 - sm(h, 8.8, 10))
    const flare = Math.exp(-Math.max(0, t - LAMPS[i]) / 0.25)
    lobe(ctx, k, x, y, 1.6 + 2.6 * inFog + 1.2 * flare, 1.2 + 1.3 * inFog + 0.8 * flare, lamp, (0.42 + 0.3 * flare) * on * (1 + 0.6 * inFog), 0.2)
    lobe(ctx, k, x, y, 0.45, 0.4, warm, 0.8 * Math.min(1, on), 0.3)
    // A soft fan of light down and out over the camp.
    const g = ctx.createLinearGradient(x * k, y * k, (x + side * 2) * k, (y + 3) * k)
    g.addColorStop(0, `rgba(${lamp}, ${0.18 * on})`)
    g.addColorStop(1, `rgba(${lamp}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x * k, (y - 0.1) * k)
    ctx.lineTo((x + side * 3.2) * k, (y + 2.2) * k)
    ctx.lineTo((x + side * 1.2) * k, (y + 3.4) * k)
    ctx.closePath()
    ctx.fill()
  })
  // The head's bank: four lamps looking up at the belly, their light a long soft wedge to it.
  const head = lampAt(t, HEAD)
  if (head > 0.01) {
    const hy = MEADOW - HEAD_H
    const flare = Math.exp(-Math.max(0, t - HEAD) / 0.3)
    lobe(ctx, k, MAST_X, hy, 3.2 + 1.5 * flare, 2 + flare, lamp, (0.42 + 0.3 * flare) * head, 0.2)
    lobe(ctx, k, MAST_X, hy - 0.2, 0.8, 0.45, warm, 0.8 * Math.min(1, head), 0.3)
    beam(ctx, k, [MAST_X + 0.2, hy - 0.2], [SHELL_X - 3.5, BELLY - 3.2], 0.5, 4.5, warm, 0.15 * Math.min(1, head))
  }
  // The floodlights: long soft beams up through the fog to the belly round the slot, and a pool of light on it.
  FLOODS.forEach((fx, i) => {
    const on = floodAt(t, i)
    if (on <= 0.01) return
    const [hx, hy] = floodHead(i)
    const aim = floodAim(i)
    beam(ctx, k, [hx, hy], aim, 0.35, 5.5, warm, 0.19 * Math.min(1.2, on))
    lobe(ctx, k, aim[0], aim[1] + 0.8, 6, 1.8, warm, 0.26 * Math.min(1, on), 0.3)
    // Where it crosses the fog band, the fog lights.
    const u = (MEADOW - 8 - hy) / (aim[1] - hy)
    lobe(ctx, k, hx + (aim[0] - hx) * u, MEADOW - 8, 3.2, 1.2, warm, 0.22 * Math.min(1, on), 0.3)
    void fx
  })
}

/** A soft beam of light from `a` to `b`, `w0` wide at its source and `w1` at its end, fading along it. */
function beam(ctx: CanvasRenderingContext2D, k: number, a: Pt, b: Pt, w0: number, w1: number, rgb: string, al: number): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy)
  const nx = -dy / L
  const ny = dx / L
  const g = ctx.createLinearGradient(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  g.addColorStop(0, `rgba(${rgb}, ${al})`)
  g.addColorStop(0.6, `rgba(${rgb}, ${al * 0.45})`)
  g.addColorStop(1, `rgba(${rgb}, ${al * 0.15})`)
  ctx.fillStyle = g
  // Two passes, a wide faint one and the core, so its edges are soft.
  for (const [s, f] of [[1.8, 0.45], [1, 1]] as const) {
    ctx.globalAlpha *= f
    ctx.beginPath()
    ctx.moveTo((a[0] + (nx * w0 * s) / 2) * k, (a[1] + (ny * w0 * s) / 2) * k)
    ctx.lineTo((b[0] + (nx * w1 * s) / 2) * k, (b[1] + (ny * w1 * s) / 2) * k)
    ctx.lineTo((b[0] - (nx * w1 * s) / 2) * k, (b[1] - (ny * w1 * s) / 2) * k)
    ctx.lineTo((a[0] - (nx * w0 * s) / 2) * k, (a[1] - (ny * w0 * s) / 2) * k)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha /= f
  }
}

/** A floodlight's head (its lens), and the point on the belly it looks at. */
function floodHead(i: number): Pt {
  return [FLOODS[i], MEADOW - 1.75]
}
function floodAim(i: number): Pt {
  return [SHELL_X + [-2.2, 1.6, 3.2][i], BELLY - [0.9, 0.7, 1.4][i]]
}

export interface Ink {
  ink: string
  weight: number
}

/** The generator, the davit, the rope, the bucket, and the exhaust. */
export function drawStarter(p: p5, k: number, t: number, { ink, weight }: Ink): void {
  const olive = VALLEY.olive
  const dark = VALLEY.oliveDark
  const running = sm(t, CATCH, CATCH + 0.3)
  // It shudders a little while it runs.
  const shake = running * 0.012 * Math.sin(t * 90)
  p.push()
  p.rectMode(p.CORNER)
  // The skid and the engine's box, louvres along it, a panel with a pilot lamp.
  solid(p, ink, weight, dark)
  p.rect(X(k, GEN.x0), X(k, GEN.skid), X(k, GEN.x1 - GEN.x0), X(k, MEADOW - GEN.skid))
  p.translate(0, X(k, shake))
  solid(p, ink, weight, olive)
  p.rect(X(k, GEN.x0 + 0.25), X(k, GEN.top), X(k, GEN.x1 - GEN.x0 - 0.35), X(k, GEN.skid - GEN.top))
  outline(p, mixHex(ink, olive, 0.4), weight * 0.5)
  for (let i = 0; i < 4; i++) {
    const lx = GEN.x0 + 0.95 + i * 0.22
    p.line(X(k, lx), X(k, GEN.top + 0.35), X(k, lx), X(k, GEN.top + 0.9))
  }
  solid(p, ink, weight * 0.7, mixHex(olive, VALLEY.steel, 0.4))
  p.rect(X(k, GEN.x1 - 0.95), X(k, GEN.top + 0.3), X(k, 0.62), X(k, 0.55))
  p.noStroke()
  p.fill(running > 0.5 ? VALLEY.lamp : mixHex(dark, ink, 0.3))
  p.rect(X(k, GEN.x1 - 0.5), X(k, GEN.top + 0.42), X(k, 0.1), X(k, 0.1))
  // The stack, and its flapper, which lifts on each puff.
  solid(p, ink, weight, VALLEY.steelDark)
  p.rect(X(k, STACK_X - 0.07), X(k, STACK_TOP), X(k, 0.14), X(k, GEN.top - STACK_TOP))
  const { ago } = lastOf(PUFF_TIMES, t)
  const flap = t >= COUGHS[0] ? 0.9 * knock(ago, 0.09) : 0
  p.push()
  p.translate(X(k, STACK_X + 0.07), X(k, STACK_TOP))
  p.rotate(-flap)
  solid(p, ink, weight * 0.8, VALLEY.steel)
  p.rect(X(k, -0.2), X(k, -0.04), X(k, 0.2), X(k, 0.04))
  p.pop()
  p.pop()
  // The davit: a post off the skid's near end, an arm out over the bucket, the pulley at its tip.
  solid(p, ink, weight, dark)
  quad(p, k, [[DAVIT_X - 0.05, GEN.skid], [DAVIT_X + 0.05, GEN.skid], [DAVIT_X + 0.05, PULLEY[1] - 0.12], [DAVIT_X - 0.05, PULLEY[1] - 0.12]])
  quad(p, k, [[DAVIT_X + 0.05, PULLEY[1] - 0.18], [PULLEY[0] - 0.02, PULLEY[1] - 0.18], [PULLEY[0] - 0.02, PULLEY[1] - 0.1], [DAVIT_X + 0.05, PULLEY[1] - 0.1]])
  // The flywheel and its drum.
  const { phi, w } = flyAt(t)
  const [fx, fy0] = FLY
  const fy = fy0 + shake
  solid(p, ink, weight, dark)
  p.circle(X(k, fx), X(k, fy), X(k, FLY_R * 2))
  solid(p, ink, weight * 0.6, mixHex(olive, VALLEY.steel, 0.3))
  p.circle(X(k, fx), X(k, fy), X(k, FLY_R * 1.55))
  // Its spokes, blurring as it runs.
  const blur = clamp01((w - 8) / 14)
  p.stroke(alpha(p, ink, 1 - 0.75 * blur))
  p.strokeWeight(weight * 1.1)
  for (let i = 0; i < 4; i++) {
    const a = phi + (i * Math.PI) / 2
    p.line(X(k, fx + Math.cos(a) * DRUM_R), X(k, fy + Math.sin(a) * DRUM_R), X(k, fx + Math.cos(a) * FLY_R * 0.77), X(k, fy + Math.sin(a) * FLY_R * 0.77))
  }
  if (blur > 0.02) lobe(p.drawingContext as CanvasRenderingContext2D, k, fx, fy, FLY_R * 0.78, FLY_R * 0.78, rgbOf(ink), 0.18 * blur, 0.8)
  solid(p, ink, weight * 0.7, VALLEY.steelDark)
  p.circle(X(k, fx), X(k, fy), X(k, DRUM_R * 2))
  // The rope: from the drum over the pulley and down to the bucket's bail; slack once it has let go.
  const b = bucketAt(t)
  const bail = bailAt(b)
  outline(p, mixHex(VALLEY.canvas, ink, 0.35), Math.max(1, weight * 0.8))
  const tight = t < THUD + 0.05 || t > 29.3
  p.line(X(k, fx), X(k, fy - DRUM_R), X(k, PULLEY[0] + 0.1), X(k, PULLEY[1]))
  if (tight) p.line(X(k, PULLEY[0]), X(k, PULLEY[1] + 0.1), X(k, bail[0]), X(k, bail[1]))
  else {
    p.noFill()
    p.beginShape()
    const n = 10
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const x = PULLEY[0] + (bail[0] - PULLEY[0]) * u
      const y = PULLEY[1] + 0.1 + (bail[1] - PULLEY[1] - 0.1) * u + 0.35 * Math.sin(Math.PI * u)
      p.vertex(X(k, x - 0.25 * Math.sin(Math.PI * u)), X(k, y))
    }
    p.endShape()
  }
  solid(p, ink, weight * 0.7, VALLEY.steel)
  p.circle(X(k, PULLEY[0]), X(k, PULLEY[1]), X(k, 0.2))
  // (The bucket itself is drawn over the balls, by the part: she rides in it.) Where it thuds down, and where it
  // comes down on its side, a little dust kicked up off the meadow.
  const dust = rgbOf(mixHex(VALLEY.road, VALLEY.fog, 0.35))
  for (const [at, x, size] of [[THUD, BUCKET.x, 1], [TIPPED, BUCKET.x + 0.3, 0.7]] as const) {
    const age = t - at
    if (age < 0 || age > 1.2) continue
    const u = age / 1.2
    for (const side of [-1, 1]) {
      const r = (0.12 + 0.45 * Math.sqrt(u)) * size
      lobe(p.drawingContext as CanvasRenderingContext2D, k, x + side * (0.2 + 0.7 * Math.sqrt(u)) * size, MEADOW - 0.1 - 0.25 * u, r, r * 0.6, dust, 0.45 * (1 - u) * (1 - u), 0.4)
    }
  }
  // The exhaust: soft puffs rising off the stack and drifting back, the coughs dark.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const pf of PUFFS) {
    const age = t - pf.t
    if (age < 0 || age > 2.2) continue
    if (pf.t > t + 0.01) break
    const u = age / 2.2
    const col = rgbOf(mixHex(VALLEY.fog, mixHex(VALLEY.steelDark, ink, 0.4), Math.min(1, 0.45 * pf.dark)))
    const r = (0.16 + 0.5 * Math.sqrt(u)) * pf.size
    lobe(ctx, k, STACK_X - 0.9 * age - 0.1, STACK_TOP - 0.22 - 1.1 * Math.sqrt(age) * pf.size, r, r * 0.8, col, Math.min(0.85, 0.42 * pf.dark) * (1 - u) * (1 - u), 0.45)
  }
}

/** The bucket's bail (where the rope takes it), for its state. */
function bailAt(b: { drop: number; tip: number }): Pt {
  const top = BUCKET.rim + b.drop
  if (b.tip < 0.01) return [BUCKET.x, top - 0.26]
  // Lying on its side, the bail falls over toward its mouth.
  return [BUCKET.x + BUCKET.w1 / 2 + 0.25 * Math.sin(b.tip), MEADOW - BUCKET.w0 / 2 + 0.1 * Math.cos(b.tip)]
}

/** The bucket: a steel pail, its bail; falling, tipping over on its bottom's far edge, and lifted back. */
export function drawBucket(p: p5, k: number, t: number, { ink, weight }: Ink): void {
  const b = bucketAt(t)
  const top = BUCKET.rim + b.drop
  const bottom = top + BUCKET.h
  const pivot: Pt = [BUCKET.x + BUCKET.w1 / 2, bottom]
  const turn = (x: number, y: number): Pt => {
    const dx = x - pivot[0]
    const dy = y - pivot[1]
    const c = Math.cos(b.tip)
    const s = Math.sin(b.tip)
    return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c]
  }
  const body: Pt[] = [
    [BUCKET.x - BUCKET.w0 / 2, top],
    [BUCKET.x + BUCKET.w0 / 2, top],
    [BUCKET.x + BUCKET.w1 / 2, bottom],
    [BUCKET.x - BUCKET.w1 / 2, bottom],
  ].map(([x, y]) => turn(x, y))
  // Its inside (dark) where the rim shows it, then its side.
  solid(p, ink, weight, VALLEY.steel)
  quad(p, k, body)
  outline(p, ink, weight * 0.6)
  const band0 = turn(BUCKET.x - BUCKET.w0 / 2 + 0.02, top + 0.12)
  const band1 = turn(BUCKET.x + BUCKET.w0 / 2 - 0.02, top + 0.12)
  p.line(X(k, band0[0]), X(k, band0[1]), X(k, band1[0]), X(k, band1[1]))
  // The bail, while it hangs.
  if (b.tip < 0.01) {
    p.noFill()
    p.arc(X(k, BUCKET.x), X(k, top), X(k, BUCKET.w0 * 1.05), X(k, 0.52), Math.PI, 2 * Math.PI)
  }
}

/** The plank switch on its trestle, the contact plate under its far end, the cable to the mast. */
export function drawSwitch(p: p5, k: number, t: number, { ink, weight }: Ink): void {
  const a = plankAt(t)
  const [px, py] = PLANK.pivot
  // The cable: along the meadow from the generator to the contact box, and on to the mast.
  outline(p, mixHex(ink, VALLEY.oliveDark, 0.3), Math.max(1, weight * 0.9))
  p.noFill()
  p.beginShape()
  p.vertex(X(k, GEN.x1 - 0.1), X(k, GEN.skid - 0.4))
  p.quadraticVertex(X(k, GEN.x1 + 0.3), X(k, MEADOW - 0.04), X(k, GEN.x1 + 0.8), X(k, MEADOW - 0.04))
  p.vertex(X(k, CONTACT[0] - 0.2), X(k, MEADOW - 0.04))
  p.endShape()
  p.line(X(k, CONTACT[0] + 0.2), X(k, MEADOW - 0.04), X(k, MAST_X - 0.1), X(k, MEADOW - 0.04))
  // The contact box: a low steel box, its plate, its pilot lamp lit once the power is through.
  const live = t >= TIP
  solid(p, ink, weight * 0.8, VALLEY.steelDark)
  p.push()
  p.rectMode(p.CORNER)
  p.rect(X(k, CONTACT[0] - 0.2), X(k, CONTACT[1]), X(k, 0.4), X(k, MEADOW - CONTACT[1]))
  p.noStroke()
  p.fill(live ? VALLEY.lamp : mixHex(VALLEY.steelDark, ink, 0.4))
  p.rect(X(k, CONTACT[0] + 0.06), X(k, CONTACT[1] + 0.03), X(k, 0.07), X(k, 0.04))
  p.pop()
  // The trestle.
  solid(p, ink, weight * 0.8, VALLEY.oliveDark)
  quad(p, k, [[px - 0.16, MEADOW], [px - 0.03, py], [px + 0.03, py], [px + 0.16, MEADOW]])
  // The plank.
  const c = Math.cos(a)
  const s = Math.sin(a)
  const L = PLANK.half
  const h = PLANK.t / 2
  const pts: Pt[] = [
    [px - L * c + s * h, py - L * s - c * h],
    [px + L * c + s * h, py + L * s - c * h],
    [px + L * c - s * h, py + L * s + c * h],
    [px - L * c - s * h, py - L * s + c * h],
  ]
  solid(p, ink, weight, VALLEY.steel)
  quad(p, k, pts)
  solid(p, ink, weight * 0.6, VALLEY.steelDark)
  p.circle(X(k, px), X(k, py), X(k, 0.08))
}

/** The lamp mast: a slender lattice, its lamps on brackets up it, its head's bank of four. */
export function drawMast(p: p5, k: number, t: number, { ink, weight }: Ink): void {
  const w = 0.24
  const top = MEADOW - HEAD_H
  outline(p, ink, weight * 0.8)
  p.line(X(k, MAST_X - w / 2), X(k, MEADOW), X(k, MAST_X - w / 2), X(k, top))
  p.line(X(k, MAST_X + w / 2), X(k, MEADOW), X(k, MAST_X + w / 2), X(k, top))
  p.strokeWeight(weight * 0.45)
  p.noFill()
  p.beginShape()
  const n = 36
  for (let i = 0; i <= n; i++) p.vertex(X(k, MAST_X + (i % 2 ? w / 2 : -w / 2)), X(k, MEADOW - (HEAD_H * i) / n))
  p.endShape()
  // The foot: a steel plate and a small box where the cable comes in.
  solid(p, ink, weight * 0.8, VALLEY.steelDark)
  p.push()
  p.rectMode(p.CORNER)
  p.rect(X(k, MAST_X - 0.35), X(k, MEADOW - 0.08), X(k, 0.7), X(k, 0.08))
  p.rect(X(k, MAST_X - 0.2), X(k, MEADOW - 0.6), X(k, 0.4), X(k, 0.34))
  // The lamps, on brackets, alternately either side.
  LAMP_H.forEach((h, i) => {
    const side = i % 2 ? 1 : -1
    const on = lampAt(t, LAMPS[i])
    const y = MEADOW - h
    outline(p, ink, weight)
    p.line(X(k, MAST_X + (side * w) / 2), X(k, y), X(k, MAST_X + side * 0.36), X(k, y))
    p.line(X(k, MAST_X + (side * w) / 2), X(k, y + 0.22), X(k, MAST_X + side * 0.3), X(k, y + 0.02))
    lampHead(p, k, MAST_X + side * 0.46, y, side, on, ink, weight)
  })
  // The head: a crossbar and four lamps looking up and over at the belly.
  const on = lampAt(t, HEAD)
  solid(p, ink, weight * 0.8, VALLEY.steelDark)
  p.rect(X(k, MAST_X - 0.7), X(k, top - 0.06), X(k, 1.4), X(k, 0.08))
  for (let i = 0; i < 4; i++) {
    const x = MAST_X - 0.52 + i * 0.35
    p.push()
    p.translate(X(k, x), X(k, top - 0.22))
    p.rotate(-0.55)
    solid(p, ink, weight * 0.7, on > 0.05 ? mixHex(VALLEY.lamp, VALLEY.floodlight, 0.4) : VALLEY.steelDark)
    p.rect(X(k, -0.13), X(k, -0.1), X(k, 0.26), X(k, 0.2))
    p.pop()
  }
  p.pop()
}

function lampHead(p: p5, k: number, x: number, y: number, side: number, on: number, ink: string, weight: number): void {
  p.push()
  p.rectMode(p.CORNER)
  p.translate(X(k, x), X(k, y))
  p.rotate(side * 0.35)
  solid(p, ink, weight * 0.8, VALLEY.steelDark)
  p.rect(X(k, -0.19), X(k, -0.14), X(k, 0.38), X(k, 0.28))
  // Its face, toward the camp: lit.
  p.noStroke()
  p.fill(on > 0.02 ? mixHex(VALLEY.steel, VALLEY.floodlight, Math.min(1, on)) : mixHex(VALLEY.steelDark, ink, 0.25))
  p.rect(X(k, -0.15), X(k, 0.06), X(k, 0.3), X(k, 0.07))
  p.pop()
}

/** The floodlights: a tripod each, a big square lamp on a yoke, tilted up at the slot; its lens lit when on. */
export function drawFloods(p: p5, k: number, t: number, { ink, weight }: Ink): void {
  FLOODS.forEach((fx, i) => {
    const [hx, hy] = floodHead(i)
    const aim = floodAim(i)
    const ang = Math.atan2(aim[1] - hy, aim[0] - hx)
    const on = floodAt(t, i)
    // A little kick on the stand as it bangs on.
    const kick = t > FLOOD_ON[i] ? 0.03 * Math.exp(-(t - FLOOD_ON[i]) / 0.15) * Math.sin((t - FLOOD_ON[i]) * 40) : 0
    outline(p, ink, weight * 0.8)
    for (const dx of [-0.55, 0.55, 0.12]) p.line(X(k, fx + dx), X(k, MEADOW), X(k, fx), X(k, hy + 0.55))
    p.line(X(k, fx), X(k, hy + 0.55), X(k, fx), X(k, hy + 0.2))
    p.push()
    p.translate(X(k, hx), X(k, hy))
    p.rotate(ang + Math.PI / 2 + kick)
    p.rectMode(p.CENTER)
    solid(p, ink, weight, VALLEY.oliveDark)
    p.rect(0, 0, X(k, 0.62), X(k, 0.34))
    // The lens, facing the belly.
    p.noStroke()
    p.fill(on > 0.02 ? mixHex(VALLEY.floodlight, '#FFFFFF', 0.3 * Math.min(1, on - 1 < 0 ? 0 : on - 1)) : mixHex(VALLEY.steelDark, VALLEY.sky, 0.3))
    p.rect(0, X(k, -0.14), X(k, 0.52), X(k, 0.07))
    p.pop()
  })
}

/** The steps up to the deck: two treads and a landing on a stringer, a rail up the far side. */
export function drawSteps(p: p5, k: number, { ink, weight }: Ink): void {
  const steel = VALLEY.steel
  p.push()
  p.rectMode(p.CORNER)
  // The stringer: a plate from the meadow up under the landing.
  solid(p, ink, weight * 0.8, mixHex(steel, VALLEY.steelDark, 0.5))
  quad(p, k, [[STEPS.x0 - 0.15, MEADOW], [STEPS.x0 + 0.1, MEADOW], [-1.85, MEADOW - 0.85], [-1.85, MEADOW - 0.98], [-2.45, MEADOW - 0.98]])
  // The treads and the landing.
  for (const [x0, x1, h] of STEPS.treads) {
    solid(p, ink, weight, steel)
    p.rect(X(k, x0), X(k, MEADOW - h), X(k, x1 - x0), X(k, 0.07))
  }
  // Legs under the landing.
  outline(p, ink, weight * 0.7)
  p.line(X(k, -1.9), X(k, MEADOW - 0.93), X(k, -1.9), X(k, MEADOW))
  p.line(X(k, -2.4), X(k, MEADOW - 0.93), X(k, -2.4), X(k, MEADOW))
  // A handrail up the far side.
  p.stroke(mixHex(ink, steel, 0.35))
  p.line(X(k, STEPS.x0 + 0.05), X(k, MEADOW - 0.95), X(k, -2.4), X(k, MEADOW - 1.95))
  p.line(X(k, -2.4), X(k, MEADOW - 1.95), X(k, -1.95), X(k, MEADOW - 1.95))
  p.line(X(k, STEPS.x0 + 0.05), X(k, MEADOW - 0.95), X(k, STEPS.x0 + 0.05), X(k, MEADOW - 0.33))
  p.line(X(k, -1.95), X(k, MEADOW - 1.95), X(k, -1.95), X(k, MEADOW - 1.0))
  p.pop()
}
