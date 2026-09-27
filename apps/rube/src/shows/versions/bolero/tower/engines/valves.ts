import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { SNARE, STROKES, lastIndex } from '../music'
import { chainRun } from '../mast'
import { BRASS, GOLD, INK, IRON, clamp, deep, easeOut, pale, smooth } from '../look'

/**
 * The valves (storey 3: the tenor saxophone, then the soprano). A saxophone laid along the roof: a brass body
 * tapering from its crook and mouthpiece at the left to a bow at the right, turned back under itself into a flared
 * bell. Along the body stand seven piston valves, and over them a camshaft that the mast's chain turns a step on
 * every stroke of the drum, once round in two bars. Each step brings a cam down on the next valve along, left to
 * right and back, so the side drum's rhythm runs up and down the row: an eighth walks a valve, a triplet ripples
 * across three. A valve stays down while its cam is on it and rises, damped, as the cam moves on. At the bow a key
 * lifts off its tone hole on each downbeat, pressed open by a cam of its own at the camshaft's end.
 *
 * Idle, the camshaft stands still and the sprocket in the chain turns alone; as the engine is let in, the clutch
 * collars slide in and the camshaft takes up the chain's steps.
 */

/** The valves along the body (x, cells): the mast between the third and the fourth. */
const VALVES = [-2.125, -1.275, -0.425, 0.425, 1.275, 2.125, 2.975]
/** There and back along the row: twelve strokes, so two rounds to the camshaft's turn of 24. */
const ROUND = 2 * (VALVES.length - 1)
const STEPS = SNARE.length
/** The chain's step: as quick as the mast's. */
const STEP = 0.07
/** How quickly a valve comes back up off its cam, and the key back onto its hole. */
const RISE = 0.055
const SHUT = 0.09
/** The strokes in the drum's two bars that are downbeats. */
const DOWNBEATS = SNARE.map((q, i) => (Math.abs(q / 3 - Math.round(q / 3)) < 1e-6 ? i : -1)).filter((i) => i >= 0)

/** The body: its left end (where the crook joins) and right end (the bow), and its radius at each. */
const XL = -3.2
const XR = 4.6
const RL = 0.05
const RR = 0.075
const BOW = 0.1
/** The drive: a wheel in the mast's chain (right of it, its teeth in the links) under a pinion on the camshaft. */
const WHEEL_R = 0.13
const PINION_R = 0.05
const DRIVE_X = 0.045 + WHEEL_R - 0.035
const HANGERS = [-0.36, -0.14, 0.14, 0.36]

/** Which valve stroke `n` presses: along the row and back. */
const valveOf = (n: number): number => {
  const r = ((n % ROUND) + ROUND) % ROUND
  return r < VALVES.length ? r : ROUND - r
}
const ease = (u: number): number => {
  const v = clamp(u)
  return v * v * (3 - 2 * v)
}
/** A spring's damped return from full, `x` time constants after it is let go. */
const settle = (x: number): number => (x <= 0 ? 1 : (1 + x) * Math.exp(-x))

/** The chain's steps so far: stroke n's step is taken over its first 0.07 s, and the chain stands at n until the next. */
function run(t: number): number {
  const n = lastIndex(STROKES, t)
  if (n < 0) return -1
  return n - 1 + ease((t - STROKES[n]) / STEP)
}

/** How far down something pressed by the strokes `hits` picks is: down with the cam's step, back up damped when the cam moves on. */
function pressed(t: number, hits: (n: number) => boolean, tau: number): number {
  const n = lastIndex(STROKES, t)
  let depth = 0
  let found = 0
  for (let m = n; m >= 0 && m >= n - STEPS && found < 2; m--) {
    if (!hits(m)) continue
    found++
    if (m === n) depth = Math.max(depth, ease((t - STROKES[m]) / STEP))
    else depth = Math.max(depth, settle((t - STROKES[m + 1]) / tau))
  }
  return depth
}

/** How far a cam's lobes stand out below (and above) the shaft at camshaft position `pos`: 1 when one points straight down. */
function lobe(pos: number, steps: number[], offset: number): number {
  let best = 0
  for (const s of steps) {
    let d = (((pos - s - offset) % STEPS) + STEPS) % STEPS
    if (d > STEPS / 2) d = STEPS - d
    if (d < 1) best = Math.max(best, 1 - ease(d))
  }
  return best
}

const LOBES = VALVES.map((_, j) => Array.from({ length: STEPS }, (_, s) => s).filter((s) => valveOf(s) === j))

export const valves: Engine = (p, c, st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const fine = weight * 0.5
  const unfold = easeOut(smooth(e.open, 0.75, 1))
  const at = t - e.since
  const tint = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)

  const brass = tint(BRASS)
  const casing = tint(mixHex(BRASS, deep(e.color, 0.2), 0.3))
  const accent = tint(e.color)
  const iron = pale(IRON, 0.25)
  const inside = deep(brass, 0.55)

  const beam = st.top + 0.05
  const yc = st.top + 0.33
  const yp = st.top + 0.7
  const rb = 0.04
  const capTop = yc + rb + 0.006
  const casingTop = st.top + 0.59
  const radius = (x: number): number => RL + ((RR - RL) * (x - XL)) / (XR - XL)
  const hangers = HANGERS.map((f) => f * st.w)

  // The camshaft's position, in steps: still until it is let in, then taking up the chain.
  const chain = run(t)
  const idle = run(at) - 0.5
  const pos = e.on >= 1 ? chain : idle + (chain - idle) * e.on
  const travel = (0.06 + 0.06 * e.amp) * e.on

  p.push()
  // It opens out from the mast, as the rails do.
  const reach = 5 * unfold
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect(-reach * k, (st.top - 0.5) * k, 2 * reach * k, 2 * k)
  ctx.clip()
  p.rectMode(p.CENTER)

  // The camshaft, hung from the beam at its ends and borne on the hangers it passes.
  const x0 = VALVES[0] - 0.33
  const x1 = XR + 0.1
  outline(p, INK, fine)
  p.stroke(deep(IRON, 0.1))
  for (const x of [x0, x1]) p.line(x * k, beam * k, x * k, yc * k)
  outline(p, INK, weight * 2)
  p.line(x0 * k, yc * k, x1 * k, yc * k)
  outline(p, iron, weight)
  p.line(x0 * k, yc * k, x1 * k, yc * k)
  solid(p, INK, fine, pale(IRON, 0.45))
  for (const x of [x0, x1, ...hangers.filter((h) => h > x0 && h < x1)]) p.rect(x * k, yc * k, 0.08 * k, 0.12 * k, 0.02 * k)

  // The cams, edge on: a lobe shows below the shaft as it comes round onto its valve, and over the top half a turn on.
  const cam = (x: number, steps: number[], reachDown: number): void => {
    const down = rb + reachDown * lobe(pos, steps, 0)
    const up = rb + reachDown * lobe(pos, steps, STEPS / 2)
    solid(p, INK, fine, tint(pale(IRON, 0.1)))
    p.rectMode(p.CORNERS)
    p.rect((x - 0.045) * k, (yc - up) * k, (x + 0.045) * k, (yc + down) * k, 0.02 * k)
    p.rectMode(p.CENTER)
  }
  const reachDown = travel + 0.006
  VALVES.forEach((x, j) => cam(x, LOBES[j], reachDown))
  // The key's lever: its pivot on a post from the body, its touch under the end cam, its pad on a tone hole.
  const flapX = XR - 0.02
  const pivot = { x: XR - 0.2, y: yp - 0.22 }
  const hole = { x: XR - 0.33, y: yp - radius(XR - 0.33) }
  const touch = { x: flapX, y: capTop }
  const keyOpen = 0.6 * (0.6 + 0.4 * e.amp) * e.on
  cam(flapX, DOWNBEATS, keyOpen * (touch.x - pivot.x))

  // The drive: a wheel in the mast's chain (right of it, its teeth in the links) turning a pinion on the camshaft; the
  // clutch collars either side of the pinion slide in to lock it to the camshaft as the engine is let in.
  const wheelY = yc + WHEEL_R + PINION_R
  const turn = chainRun(t) / WHEEL_R
  cog(p, k, weight, DRIVE_X, wheelY, WHEEL_R, 12, turn, brass)
  cog(p, k, weight, DRIVE_X, yc, PINION_R, 5, -turn * (WHEEL_R / PINION_R) + Math.PI / 5, accent)
  const slide = 0.07 * (1 - smooth(t, at - 0.2, at + 0.6))
  for (const side of [-1, 1]) {
    solid(p, INK, fine, accent)
    p.rect((DRIVE_X + side * (PINION_R + 0.05 + slide)) * k, yc * k, 0.05 * k, 0.11 * k, 0.015 * k)
  }

  // The valves' casings, through the body.
  VALVES.forEach((x) => {
    solid(p, INK, fine * 1.4, casing)
    p.rectMode(p.CORNERS)
    p.rect((x - 0.075) * k, casingTop * k, (x + 0.075) * k, (yp + radius(x) + 0.07) * k, 0.03 * k)
    p.rectMode(p.CENTER)
  })

  // The body: the crook and its mouthpiece, the tapered body, the bow, and the bell turned back under it.
  tube(p, k, weight, brass, [XL, yp], [XL - 0.3, yp], [XL - 0.42, yp - 0.12], [XL - 0.45, yp - 0.3], 0.045)
  solid(p, INK, fine * 1.4, tint(deep(IRON, 0.1)))
  p.quad((XL - 0.49) * k, (yp - 0.3) * k, (XL - 0.41) * k, (yp - 0.3) * k, (XL - 0.43) * k, (yp - 0.42) * k, (XL - 0.475) * k, (yp - 0.42) * k)
  solid(p, INK, weight, brass)
  p.quad(XL * k, (yp - RL) * k, XR * k, (yp - RR) * k, XR * k, (yp + RR) * k, XL * k, (yp + RL) * k)
  p.strokeCap(p.SQUARE)
  outline(p, INK, 2 * RR * k + 2 * weight)
  p.arc(XR * k, (yp + BOW) * k, 2 * BOW * k, 2 * BOW * k, -Math.PI / 2, Math.PI / 2)
  outline(p, brass, 2 * RR * k)
  p.arc(XR * k, (yp + BOW) * k, 2 * BOW * k, 2 * BOW * k, -Math.PI / 2 - 0.02, Math.PI / 2 + 0.02)
  p.strokeCap(p.ROUND)
  const yr = yp + 2 * BOW
  const mouthX = XR - 0.4
  const mouthR = 0.1
  solid(p, INK, weight, brass)
  p.beginShape()
  p.vertex((XR + 0.01) * k, (yr - RR) * k)
  p.vertex((XR - 0.16) * k, (yr - RR) * k)
  p.bezierVertex((XR - 0.3) * k, (yr - RR) * k, (mouthX + 0.06) * k, (yr - mouthR * 0.8) * k, mouthX * k, (yr - mouthR) * k)
  p.vertex(mouthX * k, (yr + mouthR) * k)
  p.bezierVertex((mouthX + 0.06) * k, (yr + mouthR * 0.8) * k, (XR - 0.3) * k, (yr + RR) * k, (XR - 0.16) * k, (yr + RR) * k)
  p.vertex((XR + 0.01) * k, (yr + RR) * k)
  p.endShape()
  solid(p, INK, fine * 1.4, inside)
  p.ellipse(mouthX * k, yr * k, 0.07 * k, 2 * mouthR * k)
  // Ferrules at the joints, and clamps where the hangers hold it.
  solid(p, INK, fine * 1.4, tint(deep(BRASS, 0.15)))
  p.rect(XL * k, yp * k, 0.05 * k, (2 * RL + 0.04) * k, 0.012 * k)
  p.rect((XR - 0.02) * k, yp * k, 0.05 * k, (2 * RR + 0.04) * k, 0.012 * k)
  p.rect((XR - 0.02) * k, yr * k, 0.05 * k, (2 * RR + 0.04) * k, 0.012 * k)
  solid(p, INK, fine * 1.4, pale(IRON, 0.45))
  for (const x of hangers) {
    if (x < XL || x > XR) continue
    p.rect(x * k, yp * k, 0.07 * k, (2 * radius(x) + 0.05) * k, 0.015 * k)
  }

  // The pistons: a cap on a stem, pushed down by its cam, rising again as the cam goes by.
  VALVES.forEach((x, j) => {
    const down = travel * pressed(t, (n) => valveOf(n) === j, RISE)
    const up = (1 - smooth(unfold, 0.4, 1)) * 0.12
    const top = capTop + down + up
    outline(p, INK, weight * 1.5)
    p.line(x * k, (top + 0.06) * k, x * k, casingTop * k)
    outline(p, casing, weight * 0.6)
    p.line(x * k, (top + 0.06) * k, x * k, (casingTop - 0.004) * k)
    solid(p, INK, fine * 1.4, tint(deep(BRASS, 0.15)))
    p.rect(x * k, (casingTop + 0.012) * k, 0.19 * k, 0.03 * k, 0.01 * k)
    solid(p, INK, fine * 1.2, accent)
    p.rectMode(p.CORNERS)
    p.rect((x - 0.1) * k, top * k, (x + 0.1) * k, (top + 0.06) * k, 0.025 * k)
    p.rectMode(p.CENTER)
  })

  // The key at the bow, opened by the end cam on each downbeat.
  const open = keyOpen * pressed(t, (n) => DOWNBEATS.includes(((n % STEPS) + STEPS) % STEPS), SHUT)
  const tail = Math.atan2(touch.y - pivot.y, touch.x - pivot.x)
  const len = Math.hypot(touch.x - pivot.x, touch.y - pivot.y)
  const padLen = Math.hypot(hole.x - pivot.x, hole.y - pivot.y)
  const padAt = Math.atan2(hole.y - pivot.y, hole.x - pivot.x)
  outline(p, INK, fine * 1.4)
  p.line(pivot.x * k, pivot.y * k, (pivot.x + 0.02) * k, (yp - radius(pivot.x)) * k)
  p.push()
  p.translate(pivot.x * k, pivot.y * k)
  p.rotate(open)
  outline(p, INK, weight * 0.9)
  p.line(Math.cos(tail) * len * k, Math.sin(tail) * len * k, 0, 0)
  p.line(0, 0, Math.cos(padAt) * padLen * k, Math.sin(padAt) * padLen * k)
  p.translate(Math.cos(padAt) * (padLen - 0.02) * k, Math.sin(padAt) * (padLen - 0.02) * k)
  p.rotate(-open)
  solid(p, INK, fine * 1.6, accent)
  p.rect(0, 0, 0.17 * k, 0.06 * k, 0.025 * k)
  p.pop()
  solid(p, INK, fine, brass)
  p.circle(pivot.x * k, pivot.y * k, 0.035 * k)
  p.pop()
}

/** A bent tube along a cubic from `a` to `d`: an ink line under a brass one. */
function tube(p: p5, k: number, weight: number, fill: string, a: [number, number], b: [number, number], cc: [number, number], d: [number, number], r: number): void {
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(2 * r * k + 2 * weight)
  p.bezier(a[0] * k, a[1] * k, b[0] * k, b[1] * k, cc[0] * k, cc[1] * k, d[0] * k, d[1] * k)
  p.stroke(fill)
  p.strokeWeight(2 * r * k)
  p.bezier(a[0] * k, a[1] * k, b[0] * k, b[1] * k, cc[0] * k, cc[1] * k, d[0] * k, d[1] * k)
}

/** A toothed wheel, face on: its disc, its teeth, three spokes and a hub. */
function cog(p: p5, k: number, weight: number, x: number, y: number, r: number, teeth: number, turn: number, fill: string): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(turn)
  outline(p, INK, weight * 1.1)
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * 2 * Math.PI
    p.line(Math.cos(a) * (r - 0.02) * k, Math.sin(a) * (r - 0.02) * k, Math.cos(a) * (r + 0.025) * k, Math.sin(a) * (r + 0.025) * k)
  }
  solid(p, INK, weight * 0.8, fill)
  p.circle(0, 0, 2 * (r - 0.012) * k)
  outline(p, INK, weight * 0.6)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 2 * Math.PI
    p.line(Math.cos(a) * 0.02 * k, Math.sin(a) * 0.02 * k, Math.cos(a) * (r - 0.03) * k, Math.sin(a) * (r - 0.03) * k)
  }
  p.pop()
  solid(p, INK, weight * 0.6, pale(IRON, 0.3))
  p.circle(x * k, y * k, Math.min(0.045, r * 0.6) * k)
}
