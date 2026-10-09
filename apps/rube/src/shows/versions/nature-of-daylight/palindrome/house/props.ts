import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { drawScreen, mix, rgba, shellOnScreen } from '../cast'
import { shellDown } from '../shell-path'
import { HANNAH_AGE, HOUSE } from '../worlds'
import {
  ALPHA_L,
  ALPHA_R,
  CX0,
  FLOOR,
  FOOT_X,
  GONE,
  O0,
  PATIENT,
  RR,
  TV,
  goingWeight,
  hammer,
  pendulum,
  pose,
  ss,
  strikingWeight,
  tvOn,
  type Light,
} from './time'

type Ctx = CanvasRenderingContext2D

const path = (ctx: Ctx, k: number, pts: Pt[], close = true): void => {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * k, y * k) : ctx.lineTo(x * k, y * k)))
  if (close) ctx.closePath()
}

/** Wood seen against the window: darker for the light behind it, and the light caught along its tops. */
function woodTones(L: Light) {
  const oak = mix(HOUSE.wood, HOUSE.concrete, 0.28)
  const body = mix(mix(HOUSE.woodDark, oak, 0.2 + 0.45 * L.amb), HOUSE.night, 0.3 * (1 - L.amb) + 0.5 * L.night)
  const shade = mix(body, HOUSE.night, 0.35)
  const rim = mix(mix(HOUSE.linen, HOUSE.lamp, 0.5 * L.warm), HOUSE.fog, 0.3)
  return { body, shade, rim, rimA: (0.42 + 0.3 * L.sun + 0.1 * L.amb) * (1 - L.night) }
}

/* ------------------------------------------------------------------ the cradle */

/** The cradle's shape, designed where its rockers touch the floor at x = 0.82 and set down by `CRADLE_SHIFT`. */
const RAW = 0.82
const at0 = (x: number, y: number): Pt => [x - RAW + CX0, y]
const RAIL = -0.292
const RAIL_T = 0.02
const BOTTOM = -0.1
const FOOT_L = FOOT_X - CX0 + RAW
const FOOT_R = FOOT_L + 0.052
const HEAD_L = 1.37
const HEAD_R = 1.42
/** A rocker: the arc's underside and, above it, a thinner arc; its ends rounded up. */
function rockerPts(): Pt[] {
  const n = 30
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const phi = -ALPHA_L + ((ALPHA_L + ALPHA_R) * i) / n
    const u = phi / (phi < 0 ? ALPHA_L : ALPHA_R)
    const th = 0.078 - 0.034 * Math.abs(u) ** 2
    outer.push([O0[0] + RR * Math.sin(phi), O0[1] + RR * Math.cos(phi)])
    inner.push([O0[0] + (RR - th) * Math.sin(phi), O0[1] + (RR - th) * Math.cos(phi)])
  }
  return [...outer, ...inner.reverse()]
}
const ROCKER = rockerPts()
/** The rocker's top edge's height at x (at rest, world). */
const rockerTop = (x: number): number => O0[1] + Math.sqrt(Math.max(0, (RR - 0.07) ** 2 - (x - O0[0]) ** 2))
/** The basket's bottom: a shallow belly between its posts. */
const bottomAt = (x: number): number => BOTTOM + 0.05 * Math.sin((Math.PI * (x - FOOT_L)) / (HEAD_R - FOOT_L))
/** Its near side, from the foot post to the head post, up to the rail. */
const SIDE: Pt[] = (() => {
  const pts: Pt[] = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const x = FOOT_L + ((HEAD_R - FOOT_L) * i) / n
    pts.push(at0(x, bottomAt(x)))
  }
  pts.push(at0(HEAD_R, RAIL), at0(FOOT_L, RAIL))
  return pts
})()
/** The side's top strip, which is drawn again over Hannah: she lies in the cradle, not on it. */
const LIP: Pt[] = [at0(FOOT_L, RAIL - RAIL_T), at0(HEAD_R, RAIL - RAIL_T), at0(HEAD_R, RAIL + 0.03), at0(FOOT_L, RAIL + 0.03)]
/** The rocker's underside's height at a world x (at rest). */
const underAt = (x: number): number => O0[1] + Math.sqrt(Math.max(0, RR * RR - (x - O0[0]) ** 2))
const FOOT: Pt[] = [
  at0(FOOT_L, underAt(FOOT_X) - 0.012),
  at0(FOOT_R, underAt(FOOT_X + 0.052) - 0.012),
  at0(FOOT_R, -0.452),
  at0(FOOT_R - 0.008, -0.47),
  at0(FOOT_L + 0.008, -0.47),
  at0(FOOT_L, -0.452),
]
const HEAD_POST: Pt[] = [at0(HEAD_L, underAt(at0(HEAD_L, 0)[0]) - 0.012), at0(HEAD_R, underAt(at0(HEAD_R, 0)[0]) - 0.012), at0(HEAD_R, RAIL), at0(HEAD_L, RAIL)]
/** Posts from the rocker up into the basket's belly. */
const POSTS: Pt[][] = [0.55, 1.1].map((x) => {
  const w = at0(x, 0)[0]
  return [
    [w - 0.022, rockerTop(w) + 0.01],
    [w + 0.022, rockerTop(w) + 0.01],
    [w + 0.018, bottomAt(x) + 0.03],
    [w - 0.018, bottomAt(x) + 0.03],
  ] as Pt[]
})
/** The hood: a quarter round of wood over the head end, its lip at Hannah's shoulder. */
const HOOD_C: [number, number] = [HEAD_R, RAIL]
const HOOD_R = 0.36
function hoodArc(inset: number): Pt[] {
  const pts: Pt[] = []
  const n = 22
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 - (Math.PI / 2) * (i / n)
    const rr = HOOD_R * (1 + 0.07 * Math.sin((Math.PI * i) / n)) - inset
    pts.push(at0(HOOD_C[0] + Math.cos(a) * rr * 1.04, HOOD_C[1] + Math.sin(a) * rr))
  }
  return pts
}
const HOOD: Pt[] = [at0(HEAD_R + 0.01, RAIL), at0(HEAD_R + 0.01, RAIL - HOOD_R), ...hoodArc(0).slice(1)]
const HOOD_EDGE: Pt[] = [...hoodArc(0), ...hoodArc(0.03).reverse()]
/** The blanket folded at her feet, showing over the rail. */
const FOLD: Pt[] = (() => {
  const pts: Pt[] = []
  const n = 14
  for (let i = 0; i <= n; i++) {
    const x = FOOT_R + 0.01 + (0.42 * i) / n
    const u = i / n
    pts.push(at0(x, RAIL - 0.006 - 0.042 * Math.sin(Math.PI * u) ** 0.7))
  }
  return [...pts, at0(FOOT_R + 0.43, RAIL + 0.01), at0(FOOT_R + 0.01, RAIL + 0.01)]
})()

/** The cradle's outline for its shadow (at rest). */
export const CRADLE_HULL: Pt[] = [
  at0(0.18, -0.07),
  at0(FOOT_L, -0.47),
  at0(FOOT_R, -0.47),
  at0(1.05, RAIL - 0.02),
  at0(HEAD_R, RAIL - HOOD_R * 1.05),
  at0(HEAD_R + 0.02, RAIL),
  at0(1.45, -0.06),
  at0(RAW, FLOOR),
]

function cradleColors(L: Light) {
  const W = woodTones(L)
  const linen = mix(mix(HOUSE.linenShade, HOUSE.linen, 0.3 + 0.55 * L.amb), HOUSE.night, 0.18 * (1 - L.amb))
  return { ...W, linen }
}

/** The cradle tilted by θ, in the room's light. */
export function drawCradle(p: p5, k: number, theta: number, L: Light): void {
  const ctx = p.drawingContext as Ctx
  const W = cradleColors(L)
  const at = (pts: Pt[]) => pts.map((q) => pose(theta, q))
  // The wood lit from the window behind and above: its tops paler, down to its shadowed foot.
  const grad = ctx.createLinearGradient(0, -0.72 * k, 0, FLOOR * k)
  grad.addColorStop(0, mix(W.body, W.rim, 0.22))
  grad.addColorStop(0.45, W.body)
  grad.addColorStop(1, mix(W.body, HOUSE.night, 0.3))
  ctx.save()
  // The far rocker and posts, a shade behind (seen a hair off true side-on).
  ctx.fillStyle = W.shade
  path(ctx, k, at(ROCKER).map(([x, y]) => [x + 0.03, y - 0.014] as Pt))
  ctx.fill()
  for (const post of POSTS) {
    path(ctx, k, at(post))
    ctx.fill()
  }
  // The folded blanket, the hood, the side, the posts, the rocker.
  ctx.fillStyle = W.linen
  path(ctx, k, at(FOLD))
  ctx.fill()
  ctx.fillStyle = grad
  path(ctx, k, at(HOOD))
  ctx.fill()
  path(ctx, k, at(SIDE))
  ctx.fill()
  path(ctx, k, at(FOOT))
  ctx.fill()
  path(ctx, k, at(HEAD_POST))
  ctx.fill()
  ctx.fillStyle = mix(W.body, HOUSE.night, 0.12)
  path(ctx, k, at(ROCKER))
  ctx.fill()
  // The side's panel, a little recessed: a darker field inside its frame, lit along its lower edge.
  const panel: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const x = FOOT_R + 0.045 + ((HEAD_L - 0.045 - FOOT_R - 0.045) * i) / 12
    panel.push(at0(x, bottomAt(x) - 0.04))
  }
  panel.push(at0(HEAD_L - 0.045, RAIL + 0.055), at0(FOOT_R + 0.045, RAIL + 0.055))
  ctx.fillStyle = rgba(HOUSE.night, 0.2)
  path(ctx, k, at(panel))
  ctx.fill()
  // The hood's inner curve in its own shade, so it reads as a hollow over her.
  ctx.fillStyle = rgba(HOUSE.night, 0.16)
  path(ctx, k, at([...hoodArc(0.03), at0(HEAD_L, RAIL)]))
  ctx.fill()
  // The light caught along its tops: the hood's edge, the foot post's top.
  ctx.fillStyle = rgba(W.rim, W.rimA)
  path(ctx, k, at(HOOD_EDGE))
  ctx.fill()
  path(ctx, k, at([at0(FOOT_L, -0.47), at0(FOOT_R, -0.47), at0(FOOT_R, -0.456), at0(FOOT_L, -0.456)]))
  ctx.fill()
  ctx.restore()
}

/** Over Hannah: the cradle's near rail, so she lies down in it. */
export function drawCradleOver(p: p5, k: number, theta: number, L: Light): void {
  const ctx = p.drawingContext as Ctx
  const W = cradleColors(L)
  ctx.save()
  ctx.fillStyle = W.body
  path(ctx, k, LIP.map((q) => pose(theta, q)))
  ctx.fill()
  ctx.fillStyle = rgba(W.rim, W.rimA * 0.9)
  path(ctx, k, [at0(FOOT_R, RAIL - RAIL_T), at0(HEAD_L, RAIL - RAIL_T), at0(HEAD_L, RAIL - RAIL_T + 0.011), at0(FOOT_R, RAIL - RAIL_T + 0.011)].map((q) => pose(theta, q)))
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the bed */

const BED = { x0: 0.4, x1: 2.6, rail: -0.075, mattress: -0.19 }
const PILLOW_TOP = PATIENT[1] + R * HANNAH_AGE.young
export const BED_HULL: Pt[] = [
  [BED.x0, FLOOR],
  [BED.x0, BED.mattress],
  [BED.x1, BED.mattress],
  [BED.x1, FLOOR],
]

export function drawBed(p: p5, k: number, T: number, L: Light): void {
  const ctx = p.drawingContext as Ctx
  const W = woodTones(L)
  const linen = mix(mix(HOUSE.linenShade, HOUSE.linen, 0.35 + 0.5 * L.amb), HOUSE.night, 0.15 * (1 - L.amb))
  const linenShade = mix(linen, HOUSE.linenShade, 0.6)
  ctx.save()
  // The head and the foot: oak boards rounded over at the top, the head the taller, so the bed is the cradle grown
  // up, its hood become a headboard. Their tops catch the window's light.
  for (const [x0, x1, top] of [[BED.x0 - 0.03, BED.x0 + 0.05, -0.5], [BED.x1 - 0.05, BED.x1 + 0.03, -0.31]] as const) {
    ctx.fillStyle = W.body
    roundRect(ctx, k, x0, top, x1 - x0, FLOOR - top, 0.035)
    ctx.fill()
    ctx.strokeStyle = rgba(W.rim, W.rimA)
    ctx.lineWidth = Math.max(1, 0.012 * k)
    ctx.beginPath()
    ctx.moveTo((x0 + 0.012) * k, (top + 0.03) * k)
    ctx.quadraticCurveTo((x0 + 0.012) * k, (top + 0.006) * k, ((x0 + x1) / 2) * k, (top + 0.006) * k)
    ctx.stroke()
  }
  // Legs and the oak frame.
  ctx.fillStyle = W.shade
  path(ctx, k, [[BED.x0 + 0.05, FLOOR], [BED.x0 + 0.12, FLOOR], [BED.x0 + 0.12, 0.02], [BED.x0 + 0.05, 0.02]])
  ctx.fill()
  path(ctx, k, [[BED.x1 - 0.12, FLOOR], [BED.x1 - 0.05, FLOOR], [BED.x1 - 0.05, 0.02], [BED.x1 - 0.12, 0.02]])
  ctx.fill()
  ctx.fillStyle = W.body
  path(ctx, k, [[BED.x0, 0.025], [BED.x1, 0.025], [BED.x1, BED.rail], [BED.x0, BED.rail]])
  ctx.fill()
  // The mattress.
  ctx.fillStyle = linenShade
  roundRect(ctx, k, BED.x0 + 0.02, BED.mattress, BED.x1 - BED.x0 - 0.04, BED.rail - BED.mattress + 0.01, 0.035)
  ctx.fill()
  // The pillow, under her.
  ctx.fillStyle = linen
  ctx.beginPath()
  const pl = 0.62
  const pc = PATIENT[0] - 0.02
  ctx.moveTo((pc - pl / 2) * k, (BED.mattress + 0.005) * k)
  ctx.bezierCurveTo((pc - pl / 2 - 0.02) * k, (PILLOW_TOP - 0.01) * k, (pc - pl / 4) * k, (PILLOW_TOP - 0.004) * k, pc * k, PILLOW_TOP * k)
  ctx.bezierCurveTo((pc + pl / 4) * k, (PILLOW_TOP - 0.004) * k, (pc + pl / 2 + 0.02) * k, (PILLOW_TOP - 0.01) * k, (pc + pl / 2) * k, (BED.mattress + 0.005) * k)
  ctx.closePath()
  ctx.fill()
  // The duvet over the rest of the bed, hanging down over its side and its foot in soft folds.
  // Warm linen, never the lake's grey-blue behind it, so the bed stands against the window.
  const duvet = mix(mix(HOUSE.linen, HOUSE.dusk, 0.32), HOUSE.night, 0.22 * (1 - L.amb))
  const dg = ctx.createLinearGradient(0, (BED.mattress - 0.05) * k, 0, 0.02 * k)
  dg.addColorStop(0, mix(duvet, HOUSE.fog, 0.25))
  dg.addColorStop(0.35, duvet)
  dg.addColorStop(1, mix(duvet, HOUSE.night, 0.18))
  ctx.fillStyle = dg
  ctx.beginPath()
  const top = BED.mattress - 0.028
  ctx.moveTo(1.0 * k, (top + 0.012) * k)
  ctx.bezierCurveTo(1.3 * k, (top - 0.012) * k, 2.2 * k, (top - 0.02) * k, (BED.x1 + 0.03) * k, (top + 0.006) * k)
  ctx.bezierCurveTo((BED.x1 + 0.08) * k, (top + 0.03) * k, (BED.x1 + 0.07) * k, -0.06 * k, (BED.x1 + 0.075) * k, 0.005 * k)
  for (let i = 0; i <= 16; i++) {
    const x = BED.x1 + 0.075 - ((BED.x1 + 0.075 - 1.02) * i) / 16
    const y = 0.0 + 0.012 * Math.sin(i * 1.7) + 0.006 * Math.sin(i * 4.1)
    ctx.lineTo(x * k, y * k)
  }
  ctx.bezierCurveTo(0.98 * k, -0.06 * k, 0.98 * k, (top + 0.04) * k, 1.0 * k, (top + 0.012) * k)
  ctx.closePath()
  ctx.fill()
  // Its soft folds where it falls over the side: each a wedge from a little below the top, widening to the hem, lit on
  // its left and shaded on its right, blurred and kept inside the duvet, so a fold has no edge of its own.
  ctx.save()
  ctx.clip()
  ctx.filter = `blur(${Math.max(0.6, 0.025 * k).toFixed(1)}px)`
  for (const [x, w] of [[1.42, 0.09], [1.93, 0.11], [2.38, 0.08]] as const) {
    const y0 = top + 0.03
    const y1 = 0.01
    const g = ctx.createLinearGradient((x - w) * k, 0, (x + w) * k, 0)
    g.addColorStop(0, rgba(HOUSE.linen, 0))
    g.addColorStop(0.35, rgba(HOUSE.linen, 0.14))
    g.addColorStop(0.55, rgba(HOUSE.night, 0.03))
    g.addColorStop(0.75, rgba(HOUSE.night, 0.09))
    g.addColorStop(1, rgba(HOUSE.night, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((x - w * 0.15) * k, y0 * k)
    ctx.lineTo((x + w * 0.15) * k, y0 * k)
    ctx.quadraticCurveTo((x + w * 0.6) * k, ((y0 + y1) / 2) * k, (x + w) * k, y1 * k)
    ctx.lineTo((x - w) * k, y1 * k)
    ctx.quadraticCurveTo((x - w * 0.6) * k, ((y0 + y1) / 2) * k, (x - w * 0.15) * k, y0 * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.restore()
  void T
}

/** Over Hannah: the blanket's turned-down edge across her, which sinks flat when she has gone. */
export function drawBedOver(p: p5, k: number, T: number, L: Light): void {
  const ctx = p.drawingContext as Ctx
  const gone = ss(T, GONE[0] + 0.6, GONE[1] + 0.4)
  const blanket = mix(mix(HOUSE.linen, HOUSE.dusk, 0.32), HOUSE.night, 0.22 * (1 - L.amb))
  const fold = mix(mix(HOUSE.linen, HOUSE.fog, 0.3), HOUSE.night, 0.18 * (1 - L.amb))
  const r = R * HANNAH_AGE.young
  const cx = PATIENT[0]
  // The mound over her lower half, and the fold along its top.
  const top = PATIENT[1] + r * 0.32 + (BED.mattress - 0.035 - (PATIENT[1] + r * 0.32)) * gone
  ctx.save()
  ctx.fillStyle = blanket
  ctx.beginPath()
  ctx.moveTo((cx - r * 1.25) * k, (BED.mattress + 0.01) * k)
  ctx.bezierCurveTo((cx - r * 1.2) * k, (top + 0.02) * k, (cx - r * 0.6) * k, top * k, (cx + r * 0.1) * k, top * k)
  // Its tail runs down into the duvet's own line, one sheet, no step where it ends.
  ctx.bezierCurveTo((cx + r * 1.2) * k, top * k, 1.3 * k, (BED.mattress - 0.03) * k, 2.0 * k, (BED.mattress + 0.012) * k)
  ctx.lineTo(2.0 * k, (BED.mattress + 0.03) * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = fold
  ctx.beginPath()
  ctx.moveTo((cx - r * 1.22) * k, (top + 0.035) * k)
  ctx.bezierCurveTo((cx - r * 1.1) * k, (top + 0.006) * k, (cx - r * 0.5) * k, (top - 0.004) * k, (cx + r * 0.1) * k, (top - 0.004) * k)
  // Tapering away to nothing at its end, not stopping square.
  ctx.bezierCurveTo((cx + r * 0.9) * k, (top - 0.004) * k, (cx + r * 1.4) * k, (top + 0.01) * k, (cx + r * 2.3) * k, (top + 0.045) * k)
  ctx.bezierCurveTo((cx + r * 1.2) * k, (top + 0.04) * k, (cx - r * 0.5) * k, (top + 0.035) * k, (cx - r * 1.1) * k, (top + 0.06) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function roundRect(ctx: Ctx, k: number, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo((x + r) * k, y * k)
  ctx.lineTo((x + w - r) * k, y * k)
  ctx.quadraticCurveTo((x + w) * k, y * k, (x + w) * k, (y + r) * k)
  ctx.lineTo((x + w) * k, (y + h) * k)
  ctx.lineTo(x * k, (y + h) * k)
  ctx.lineTo(x * k, (y + r) * k)
  ctx.quadraticCurveTo(x * k, y * k, (x + r) * k, y * k)
  ctx.closePath()
}

/* ------------------------------------------------------------------ the clock */

/** A tall case clock by the bed: its pendulum keeps the beats; its weights are the time left. */
export const CLOCK = { x: 3.55, w: 0.66, top: -2.04 }
export const CLOCK_HULL: Pt[] = [
  [CLOCK.x - 0.31, FLOOR],
  [CLOCK.x - 0.31, CLOCK.top],
  [CLOCK.x + 0.31, CLOCK.top],
  [CLOCK.x + 0.31, FLOOR],
]
export function drawClock(p: p5, k: number, T: number, L: Light): void {
  const ctx = p.drawingContext as Ctx
  const W = woodTones(L)
  const cx = CLOCK.x
  const hw = CLOCK.w / 2
  const trunkHW = hw * 0.82
  const plinthTop = -0.3
  const hoodBottom = -1.47
  const top = CLOCK.top
  const doorTop = hoodBottom - 0.02
  const doorBottom = plinthTop - 0.06
  ctx.save()
  // The case.
  ctx.fillStyle = W.body
  path(ctx, k, [[cx - hw, FLOOR], [cx + hw, FLOOR], [cx + hw, plinthTop], [cx + trunkHW, plinthTop - 0.04], [cx + trunkHW, hoodBottom], [cx + hw, hoodBottom - 0.03], [cx + hw, top + 0.06], [cx + hw + 0.03, top + 0.03], [cx + hw + 0.03, top], [cx - hw - 0.03, top], [cx - hw - 0.03, top + 0.03], [cx - hw, top + 0.06], [cx - hw, hoodBottom - 0.03], [cx - trunkHW, hoodBottom], [cx - trunkHW, plinthTop - 0.04], [cx - hw, plinthTop]])
  ctx.fill()
  // The trunk's glass door: dark, the pendulum and weights behind it.
  const dx0 = cx - trunkHW + 0.05
  const dx1 = cx + trunkHW - 0.05
  ctx.fillStyle = mix(HOUSE.night, W.shade, 0.35)
  path(ctx, k, [[dx0, doorBottom], [dx1, doorBottom], [dx1, doorTop], [dx0, doorTop]])
  ctx.fill()
  ctx.save()
  path(ctx, k, [[dx0, doorBottom], [dx1, doorBottom], [dx1, doorTop], [dx0, doorTop]])
  ctx.clip()
  // The pendulum: a long rod from the top of the trunk and a tall bob, swinging.
  const pivot: Pt = [cx, doorTop + 0.02]
  const len = 0.84
  const a = pendulum(T)
  const bob: Pt = [pivot[0] + Math.sin(a) * len, pivot[1] + Math.cos(a) * len]
  const steel = mix(mix(HOUSE.concrete, HOUSE.linen, 0.45), HOUSE.night, 0.25 * (1 - L.amb))
  ctx.strokeStyle = steel
  ctx.lineWidth = Math.max(1, 0.014 * k)
  ctx.beginPath()
  ctx.moveTo(pivot[0] * k, pivot[1] * k)
  ctx.lineTo(bob[0] * k, bob[1] * k)
  ctx.stroke()
  ctx.save()
  ctx.translate(bob[0] * k, bob[1] * k)
  ctx.rotate(-a)
  ctx.fillStyle = steel
  ctx.beginPath()
  ctx.moveTo(0, -0.1 * k)
  ctx.bezierCurveTo(0.06 * k, -0.07 * k, 0.06 * k, 0.07 * k, 0, 0.1 * k)
  ctx.bezierCurveTo(-0.06 * k, 0.07 * k, -0.06 * k, -0.07 * k, 0, -0.1 * k)
  ctx.fill()
  ctx.restore()
  // The weights on their lines: the going weight sinks a notch a tick; the striking weight a notch a strike.
  const span = doorBottom - 0.13 - (doorTop + 0.15)
  const weights: [number, number][] = [
    [cx - trunkHW + 0.1, goingWeight(T)],
    [cx + trunkHW - 0.1, strikingWeight(T)],
  ]
  for (const [wx, u] of weights) {
    const wy = doorTop + 0.15 + span * u
    ctx.strokeStyle = rgba(steel, 0.8)
    ctx.lineWidth = Math.max(0.8, 0.007 * k)
    ctx.beginPath()
    ctx.moveTo(wx * k, doorTop * k)
    ctx.lineTo(wx * k, (wy - 0.1) * k)
    ctx.stroke()
    const wg = ctx.createLinearGradient((wx - 0.035) * k, 0, (wx + 0.035) * k, 0)
    wg.addColorStop(0, mix(HOUSE.mullion, steel, 0.35))
    wg.addColorStop(0.4, mix(HOUSE.mullion, steel, 0.6))
    wg.addColorStop(1, HOUSE.mullion)
    ctx.fillStyle = wg
    roundRect(ctx, k, wx - 0.036, wy - 0.1, 0.072, 0.2, 0.012)
    ctx.fill()
  }
  ctx.restore()
  // The glass's sheen.
  const sheen = ctx.createLinearGradient(dx0 * k, doorTop * k, dx1 * k, doorBottom * k)
  sheen.addColorStop(0, rgba(HOUSE.glass, 0.1))
  sheen.addColorStop(0.5, rgba(HOUSE.glass, 0))
  sheen.addColorStop(1, rgba(HOUSE.glass, 0.05))
  ctx.fillStyle = sheen
  path(ctx, k, [[dx0, doorBottom], [dx1, doorBottom], [dx1, doorTop], [dx0, doorTop]])
  ctx.fill()
  // The dial: a square face, two hands, stopped when the clock is.
  const dialS = 0.4
  const dcy = (hoodBottom + top) / 2 + 0.01
  ctx.fillStyle = mix(mix(HOUSE.linenShade, HOUSE.linen, 0.5 * L.amb), HOUSE.night, 0.15 * (1 - L.amb))
  path(ctx, k, [[cx - dialS / 2, dcy - dialS / 2], [cx + dialS / 2, dcy - dialS / 2], [cx + dialS / 2, dcy + dialS / 2], [cx - dialS / 2, dcy + dialS / 2]])
  ctx.fill()
  ctx.strokeStyle = rgba(HOUSE.mullion, 0.35)
  ctx.lineWidth = Math.max(0.8, 0.008 * k)
  ctx.beginPath()
  ctx.arc(cx * k, dcy * k, dialS * 0.4 * k, 0, Math.PI * 2)
  ctx.stroke()
  const minutes = 0.9 + (Math.min(T, GONE[0]) - 71.953) * 0.012
  const hands: [number, number, number][] = [
    [minutes * Math.PI * 2 - Math.PI / 2, dialS * 0.36, 0.014],
    [(minutes / 12 + 0.38) * Math.PI * 2 - Math.PI / 2, dialS * 0.24, 0.02],
  ]
  ctx.strokeStyle = HOUSE.mullion
  ctx.lineCap = 'round'
  for (const [ang, l, wdt] of hands) {
    ctx.lineWidth = Math.max(1, wdt * k)
    ctx.beginPath()
    ctx.moveTo(cx * k, dcy * k)
    ctx.lineTo((cx + Math.cos(ang) * l) * k, (dcy + Math.sin(ang) * l) * k)
    ctx.stroke()
  }
  // The bell on its crown and the hammer that strikes it.
  const h = hammer(T)
  const bellY = top - 0.02
  const shiver = h.ring * 0.006 * Math.sin((T % 10) * 60)
  ctx.fillStyle = mix(steel, HOUSE.mullion, 0.35)
  ctx.beginPath()
  ctx.moveTo((cx - 0.085 + shiver) * k, bellY * k)
  ctx.bezierCurveTo((cx - 0.08 + shiver) * k, (bellY - 0.1) * k, (cx + 0.08 + shiver) * k, (bellY - 0.1) * k, (cx + 0.085 + shiver) * k, bellY * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect((cx - 0.008) * k, (bellY - 0.12) * k, 0.016 * k, 0.03 * k)
  const hinge: Pt = [cx + 0.2, top - 0.015]
  const ang = -Math.PI + 0.22 + 0.55 * h.lift
  const tip: Pt = [hinge[0] + Math.cos(ang) * 0.14, hinge[1] + Math.sin(ang) * 0.14]
  ctx.strokeStyle = mix(steel, HOUSE.mullion, 0.2)
  ctx.lineWidth = Math.max(1, 0.012 * k)
  ctx.beginPath()
  ctx.moveTo(hinge[0] * k, hinge[1] * k)
  ctx.lineTo(tip[0] * k, tip[1] * k)
  ctx.stroke()
  ctx.fillRect((tip[0] - 0.012) * k, (tip[1] - 0.022) * k, 0.024 * k, 0.044 * k)
  // The light caught along the case's edges.
  ctx.fillStyle = rgba(W.rim, W.rimA * 0.8)
  ctx.fillRect((cx - hw - 0.03) * k, top * k, (CLOCK.w + 0.06) * k, 0.012 * k)
  ctx.fillRect((cx - hw) * k, plinthTop * k, CLOCK.w * k, 0.01 * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the television */

export const CONSOLE = { x0: 1.02, x1: 3.95, top: -0.3 }
export const TV_HULL: Pt[] = [
  [CONSOLE.x0, FLOOR],
  [CONSOLE.x0, CONSOLE.top],
  [CONSOLE.x1, CONSOLE.top],
  [CONSOLE.x1, FLOOR],
]
export function drawTV(p: p5, k: number, T: number, L: Light): void {
  const ctx = p.drawingContext as Ctx
  const on = tvOn(T)
  ctx.save()
  // The console: a long low cabinet.
  const wood = mix(mix(HOUSE.woodDark, HOUSE.night, 0.55), HOUSE.tv, 0.1 * on)
  ctx.fillStyle = wood
  path(ctx, k, [[CONSOLE.x0, FLOOR - 0.03], [CONSOLE.x1, FLOOR - 0.03], [CONSOLE.x1, CONSOLE.top], [CONSOLE.x0, CONSOLE.top]])
  ctx.fill()
  ctx.fillStyle = mix(HOUSE.night, HOUSE.woodDark, 0.2)
  path(ctx, k, [[CONSOLE.x0 + 0.08, FLOOR], [CONSOLE.x0 + 0.14, FLOOR], [CONSOLE.x0 + 0.14, FLOOR - 0.03], [CONSOLE.x0 + 0.08, FLOOR - 0.03]])
  ctx.fill()
  path(ctx, k, [[CONSOLE.x1 - 0.14, FLOOR], [CONSOLE.x1 - 0.08, FLOOR], [CONSOLE.x1 - 0.08, FLOOR - 0.03], [CONSOLE.x1 - 0.14, FLOOR - 0.03]])
  ctx.fill()
  // Its top catching the screen's light.
  ctx.fillStyle = rgba(HOUSE.tv, 0.3 * on)
  ctx.fillRect(CONSOLE.x0 * k, CONSOLE.top * k, (CONSOLE.x1 - CONSOLE.x0) * k, 0.012 * k)
  // The stand.
  ctx.fillStyle = HOUSE.mullion
  const sx = TV.x + TV.w / 2
  ctx.fillRect((sx - 0.12) * k, (CONSOLE.top - 0.012) * k, 0.24 * k, 0.012 * k)
  ctx.fillRect((sx - 0.03) * k, (TV.y + TV.h) * k, 0.06 * k, (CONSOLE.top - TV.y - TV.h) * k)
  ctx.restore()
  // The set: the news, the shell coming down out of the cloud over Montana.
  drawScreen(p, k, TV.x, TV.y, TV.w, TV.h, { on, place: 'montana', t: T, descend: shellDown(T), bezel: HOUSE.mullion, glow: 0.7 })
  void L
}

/** The television's light on the floor in front of it, reaching her (drawn over the floor's mirror). */
export function drawTVGlow(p: p5, k: number, T: number): void {
  const ctx = p.drawingContext as Ctx
  const on = tvOn(T)
  ctx.save()
  // Its light on the floor in front of it, reaching her.
  if (on > 0.01) {
    ctx.save()
    const cx = TV.x + TV.w * 0.42
    const cy = FLOOR + 0.3
    ctx.translate(cx * k, cy * k)
    ctx.scale(1, 0.24)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 2.8 * k)
    g.addColorStop(0, rgba(HOUSE.tv, 0.34 * on))
    g.addColorStop(0.55, rgba(HOUSE.tv, 0.12 * on))
    g.addColorStop(1, rgba(HOUSE.tv, 0))
    ctx.fillStyle = g
    ctx.fillRect(-2.8 * k, -2.8 * k, 5.6 * k, 5.6 * k)
    ctx.restore()
  }
  ctx.restore()
}

/**
 * The shell on the television at show time T, in world cells: where `drawShellScene` puts it on the glass (a fifth of
 * the screen over the land, lowered out of the cloud by `descend`).
 */
export function tvShell(T: number): { c: Pt; h: number } {
  return shellOnScreen(TV.x, TV.y, TV.w, TV.h, shellDown(T))
}
