import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash, knock, smooth, type Ctx } from '../kit'
import { STAR } from '../worlds'
import {
  BEGIN,
  BOUNCE,
  CARPET,
  DOORS_CRACK,
  DOORS_WIDE,
  EDGE_T,
  EDGE_X,
  FLASH_APEX,
  FLASH_JUMP,
  FLASH_LATE,
  RUN1,
  RUN2,
  SPOT,
  VOLLEY,
  carpetX,
  flightIn,
} from './premiere-clock'
import { FACADE, FACADE_DEEP, INK, NIGHT, PILASTER, SILVER, STREET, beam, glint, glow, pool, rgba as rgbaHex } from './premiere-light'

/**
 * The red carpet of her own premiere, at night: the theatre's dark front with its doors lit and its marquee over
 * them, the press crouched shoulder to shoulder behind a velvet barrier with their flash guns up, and a rope line of
 * brass stanchions and velvet ropes along the carpet to the doors and past them.
 *
 * - The press fire as she comes in out of the dryer's flight (the jump, the top of her flight), as a volley when the
 *   spotlight has her, and once after.
 * - The spotlight on the marquee has been hunting over the press; on 61.06 its pool swings onto her and stays.
 * - She clips the rope line's first post twice: each time the posts go over one into the next like dominoes on the
 *   music's runs, and the last comes down flat.
 * - As she passes the doors they give, and swing wide on the hit, the lobby's light out over the carpet behind her.
 */

/* ------------------------------------------------------------------ the press */

/**
 * A press photographer, in silhouette: crouched in the front row or standing behind, a fedora or not, a camera held
 * up to the face and its flash gun's reflector over it. The reflector is the only thing of them that shines.
 */
interface Shooter {
  x: number
  front: boolean
  hat: boolean
  /** Which way the camera is held off the face, and a little turn of the head and hands. */
  side: 1 | -1
  lean: number
  flashes: number[]
}
/** The head's centre for a shooter: standing behind the barrier, or the one crouched at its front. */
const headY = (s: Shooter): number => (s.front ? CARPET - 1.78 : CARPET - 1.98) + (hash(Math.round(s.x * 10), 2) - 0.5) * 0.14
/** Where a shooter's reflector is: over the camera, off to one side of the head. */
const reflectorOf = (s: Shooter): Pt => [s.x + s.side * 0.2 + s.lean * 0.3, headY(s) - 0.46]
const shooter = (x: number, front: boolean, flashes: number[] = []): Shooter => {
  const h = hash(Math.round(x * 10), 9)
  return { x, front, hat: h > 0.3, side: hash(Math.round(x * 10), 8) > 0.5 ? 1 : -1, lean: (hash(Math.round(x * 10), 7) - 0.5) * 0.3, flashes }
}
/** The press, crouched shoulder to shoulder behind the barrier; the one by where she comes in leans lower, over it. */
const PRESS: Shooter[] = [
  shooter(-5.1, false),
  shooter(-4.25, false),
  shooter(-3.45, false),
  shooter(-2.6, false),
  shooter(-1.75, false),
  shooter(-0.95, false, [FLASH_APEX]),
  shooter(-0.1, true, [FLASH_JUMP]),
  shooter(0.8, false),
  shooter(1.7, false),
  shooter(2.55, false),
  shooter(3.35, false),
  shooter(4.25, false),
  shooter(5.1, false),
  shooter(5.95, false, [VOLLEY]),
  shooter(6.8, false, [VOLLEY]),
  shooter(7.65, false, [VOLLEY]),
  shooter(8.5, false),
  shooter(9.35, false, [FLASH_LATE]),
]
/** The press pen: a velvet-draped barrier with a brass rail, from the curb to where the rope line takes over. */
const PEN = { x0: -5.8, x1: 10.0, rail: CARPET - 0.62 }
/** The crowd's dark: darker than the wall behind it, so the pen reads as a mass of people against the lit front. */
const CROWD = mixHex(NIGHT, FACADE, 0.22)

/** How bright a shooter's flash is at show time `t`: the pop, and the bulb's afterglow. */
function flashOf(c: Shooter, t: number): { pop: number; after: number } {
  let pop = 0
  let after = 0
  for (const f of c.flashes) {
    const s = t - f
    if (s < 0 || s > 1.2) continue
    pop = Math.max(pop, knock(s, 0.06))
    after = Math.max(after, knock(s, 0.35))
  }
  return { pop, after }
}

/** Every flash, for the wash over the whole scene. */
const FLASHES: { x: number; y: number; t: number }[] = PRESS.flatMap((c) => c.flashes.map((t) => ({ x: reflectorOf(c)[0], y: reflectorOf(c)[1], t })))

/* ------------------------------------------------------------------ the rope line */

const H_POST = 1.62
const BASE_R = 0.19
const BASE_H = 0.09
interface Run {
  xs: number[]
  /** The clip, each post taking the next, and the last one down. */
  times: readonly number[]
}
const runAt = (clip: number, n: number, gap: number, times: readonly number[]): Run => {
  const x0 = carpetX(clip) + 0.02
  return { xs: Array.from({ length: n }, (_, i) => x0 + i * gap), times }
}
const RUNS: Run[] = [runAt(RUN1[0], 3, 1.0, RUN1), runAt(RUN2[0], 3, 0.86, RUN2)]

/** Where a post pivots as it tips (the right rim of its base), and a point of it (u across, v up from its foot) tipped by `a`. */
const pivot = (x: number): Pt => [x + BASE_R, CARPET]
function postPoint(x: number, a: number, u: number, v: number): Pt {
  const [px, py] = pivot(x)
  const lx = u - BASE_R
  const ly = -v
  return [px + lx * Math.cos(a) - ly * Math.sin(a), py + lx * Math.sin(a) + ly * Math.cos(a)]
}
/** The angle post `x` leans at, its top resting on the shaft of the next post (at `nx`, tipped by `b`). */
function lean(x: number, nx: number, b: number): number {
  const a0 = postPoint(nx, b, 0, BASE_H)
  const a1 = postPoint(nx, b, 0, H_POST)
  const dx = a1[0] - a0[0]
  const dy = a1[1] - a0[1]
  const len = Math.hypot(dx, dy)
  // How far this post's top is short of that shaft (positive while it has still to reach it), less the two
  // half-thicknesses: zero at the touch.
  const f = (a: number) => {
    const [tx, ty] = postPoint(x, a, 0, H_POST - 0.02)
    return ((tx - a0[0]) * dy - (ty - a0[1]) * dx) / len - 0.055
  }
  let lo = b
  let hi = Math.PI / 2 + 0.05
  if (f(hi) > 0) return hi
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (f(mid) > 0) lo = mid
    else hi = mid
  }
  return lo
}
const FLAT = Math.PI / 2 - Math.atan2(BASE_H, H_POST) + 0.02
/** Each post's tip at show time `t`, a run's worth. */
function runAngles(run: Run, t: number): number[] {
  const n = run.xs.length
  const out = new Array<number>(n).fill(0)
  // The last post: taken, falls flat on the hit, bounces once and lies.
  const lastStart = run.times[n - 1]
  const land = run.times[n]
  if (t > lastStart) {
    const u = clamp((t - lastStart) / (land - lastStart))
    const fall = FLAT * (0.3 * u + 0.7 * u * u)
    const s = t - land
    out[n - 1] = s < 0 ? fall : FLAT - 0.16 * Math.exp(-s / 0.12) * Math.abs(Math.sin(s * 13)) - 0.03 * Math.exp(-s / 0.4) * Math.abs(Math.sin(s * 31))
  }
  // Each before it: tipped from its start, then resting on the next.
  for (let i = n - 2; i >= 0; i--) {
    const start = run.times[i]
    const touch = run.times[i + 1]
    if (t <= start) continue
    const contact = lean(run.xs[i], run.xs[i + 1], 0)
    if (t < touch) {
      const u = (t - start) / (touch - start)
      // The first is clipped, and goes over slowly at first; the rest are struck, and go at once.
      const a = i === 0 ? 0.12 : 0.4
      out[i] = contact * (a * u + (1 - a) * u * u)
    } else {
      out[i] = lean(run.xs[i], run.xs[i + 1], out[i + 1])
      // The knock of the next going: a ring through the brass.
      const s = t - touch
      out[i] -= 0.035 * Math.exp(-s / 0.08) * Math.sin(s * 60)
    }
  }
  return out
}

function drawPost(p: p5, c: Ctx, x: number, a: number, ring: number): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const at = (u: number, v: number) => postPoint(x, a, u, v)
  const quad = (pts: Pt[], fill: string, w = weight) => {
    solid(p, INK, w, fill)
    p.beginShape()
    for (const q of pts) p.vertex(X(q[0]), X(q[1]))
    p.endShape(p.CLOSE)
  }
  // The shaft, brass, a gold light down its lit side.
  const sw = 0.036
  quad([at(-sw, BASE_H), at(sw, BASE_H), at(sw, H_POST - 0.1), at(-sw, H_POST - 0.1)], STAR.brass, weight * 0.8)
  const g0 = at(-sw * 0.3, BASE_H + 0.05)
  const g1 = at(-sw * 0.3, H_POST - 0.16)
  p.stroke(STAR.gold)
  p.strokeWeight(Math.max(1, X(0.016)))
  p.line(X(g0[0]), X(g0[1]), X(g1[0]), X(g1[1]))
  // The base: a heavy low dome.
  const dome: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const u = -BASE_R + (2 * BASE_R * i) / 10
    const v = BASE_H * Math.sqrt(Math.max(0, 1 - (u / BASE_R) ** 2)) * 0.9 + 0.012
    dome.push(at(u, v))
  }
  dome.push(at(BASE_R, 0), at(-BASE_R, 0))
  quad(dome, STAR.brass, weight * 0.85)
  // The crown: a collar and a round finial, and the hook the rope hangs from.
  quad([at(-0.07, H_POST - 0.12), at(0.07, H_POST - 0.12), at(0.055, H_POST - 0.06), at(-0.055, H_POST - 0.06)], STAR.gold, weight * 0.7)
  const f = at(0, H_POST - 0.005 + ring)
  solid(p, INK, weight * 0.7, STAR.gold)
  p.circle(X(f[0]), X(f[1]), X(0.11))
}

/** A velvet rope hung between two hooks: sagging by its length, and lying on the carpet where it reaches it. */
function drawRope(p: p5, c: Ctx, a: Pt, b: Pt, length: number): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const d = Math.hypot(b[0] - a[0], b[1] - a[1])
  const sag = d < length ? Math.sqrt((3 * d * (length - d)) / 8) : 0.02
  const pts: Pt[] = []
  for (let i = 0; i <= 16; i++) {
    const u = i / 16
    const y = a[1] + (b[1] - a[1]) * u + 4 * sag * u * (1 - u)
    pts.push([a[0] + (b[0] - a[0]) * u, Math.min(CARPET - 0.035, y)])
  }
  // Ink under, velvet over, and a thread of carpet red where the light runs along it.
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(X(0.085) + weight * 1.6)
  p.beginShape()
  for (const q of pts) p.vertex(X(q[0]), X(q[1]))
  p.endShape()
  p.stroke(STAR.velvet)
  p.strokeWeight(X(0.085))
  p.beginShape()
  for (const q of pts) p.vertex(X(q[0]), X(q[1]))
  p.endShape()
  p.stroke(mixHex(STAR.velvet, STAR.carpet, 0.75))
  p.strokeWeight(Math.max(1, X(0.022)))
  p.beginShape()
  for (const q of pts) p.vertex(X(q[0]), X(q[1] - 0.02))
  p.endShape()
}

function drawRopeLine(p: p5, c: Ctx, t: number): void {
  for (const run of RUNS) {
    const angles = runAngles(run, t)
    const tops = run.xs.map((x, i) => postPoint(x, angles[i], 0, H_POST - 0.03))
    const gap = run.xs[1] - run.xs[0]
    for (let i = 0; i + 1 < run.xs.length; i++) drawRope(p, c, tops[i], tops[i + 1], gap * 1.16)
    run.xs.forEach((x, i) => {
      // A post just struck rings: its finial shivers.
      const hit = i > 0 ? t - run.times[i] : Infinity
      const ring = hit > 0 && hit < 0.4 ? 0.012 * Math.exp(-hit / 0.07) * Math.sin(hit * 70) : 0
      drawPost(p, c, x, angles[i], ring)
    })
  }
}

/* ------------------------------------------------------------------ the theatre */

/** The doors, their marquee, and the spotlight on the marquee's roof. */
const DOORS = { x0: 14.62, x1: 16.9, h: 4.9 }
const MARQUEE = { x0: 12.7, x1: 18.8, y0: CARPET - 5.8, y1: CARPET - 5.08 }
const LAMP: Pt = [13.25, MARQUEE.y0 - 0.36]

/** How far the doors are open (0 shut, 1 wide) at show time `t`: the latch, then wide on the hit, off their stops. */
function doorsOpen(t: number): number {
  const a = t - DOORS_CRACK
  if (a <= 0) return 0
  const crack = 0.07 * (1 - Math.exp(-a / 0.03)) * (1 + 0.5 * Math.exp(-a / 0.05) * Math.sin(a * 40))
  const b = t - DOORS_WIDE
  if (b <= 0) return crack
  const swing = 1 - Math.exp(-b / 0.07)
  const stop = b > 0.2 ? 0.1 * Math.exp(-(b - 0.2) / 0.18) * Math.sin((b - 0.2) * 16) : 0
  return crack + (0.93 - crack) * swing - Math.abs(stop)
}

function drawFacade(p: p5, c: Ctx, t: number, f: ReturnType<typeof frame>): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const x0 = Math.max(-12, f.x0 - 1)
  const x1 = Math.min(EDGE_X + 0.3, f.x1 + 1)
  if (x1 <= x0) return
  const top = Math.max(-40, f.y0 - 1)
  // The wall.
  p.noStroke()
  p.fill(FACADE)
  p.rect(X((x0 + x1) / 2), X((top + CARPET) / 2), X(x1 - x0), X(CARPET - top))
  // Pilasters, each with a slit of gold light up its middle, and poster cases lit between them.
  for (let i = Math.floor(x0 / 3.4) - 1; i <= Math.ceil(x1 / 3.4) + 1; i++) {
    const px = i * 3.4 + 0.2
    if (px > EDGE_X - 0.2 || (px > DOORS.x0 - 0.8 && px < DOORS.x1 + 0.8)) continue
    solid(p, INK, weight * 0.5, PILASTER)
    p.rect(X(px), X((top + CARPET) / 2), X(0.62), X(CARPET - top))
    glow(p, X(px), X(CARPET - 3.2), X(1.2), STAR.gold, 0.1)
    p.stroke(STAR.gold)
    p.strokeWeight(Math.max(1, X(0.03)))
    p.line(X(px), X(Math.max(top, CARPET - 9)), X(px), X(CARPET - 1.4))
    // A poster case: a lit frame of brass.
    const cx = px + 1.7
    if (cx > DOORS.x0 - 1 && cx < DOORS.x1 + 1) continue
    if (cx > EDGE_X - 1.2) continue
    glow(p, X(cx), X(CARPET - 3.4), X(1.5), STAR.spot, 0.08)
    solid(p, INK, weight * 0.6, mixHex(FACADE, STAR.spot, 0.16))
    p.rect(X(cx), X(CARPET - 3.4), X(1.15), X(1.75))
    solid(p, STAR.brass, weight * 0.5, mixHex(FACADE_DEEP, STAR.carpet, 0.35))
    p.rect(X(cx), X(CARPET - 3.45), X(0.86), X(1.4))
    // Its picture: a gold moon over two dark ridges, a wuxia picture's night.
    p.noStroke()
    p.fill(mixHex(STAR.gold, FACADE, 0.2))
    p.circle(X(cx + 0.12), X(CARPET - 3.72), X(0.34))
    p.fill(mixHex(FACADE_DEEP, NIGHT, 0.4))
    p.triangle(X(cx - 0.43), X(CARPET - 2.76), X(cx - 0.05), X(CARPET - 3.32), X(cx + 0.3), X(CARPET - 2.76))
    p.fill(mixHex(FACADE_DEEP, STAR.carpetDeep, 0.3))
    p.triangle(X(cx - 0.12), X(CARPET - 2.76), X(cx + 0.24), X(CARPET - 3.12), X(cx + 0.43), X(CARPET - 2.76))
  }
  // The corner of the building, where the carpet ends and the steps go down.
  solid(p, INK, weight, PILASTER)
  p.rect(X(EDGE_X), X((top + CARPET) / 2), X(0.5), X(CARPET - top))

  // The doors.
  const o = doorsOpen(t)
  const dx = (DOORS.x0 + DOORS.x1) / 2
  const dw = DOORS.x1 - DOORS.x0
  const dtop = CARPET - DOORS.h
  // The doorway's surround.
  solid(p, INK, weight, FACADE_DEEP)
  p.rect(X(dx), X(CARPET - DOORS.h / 2 - 0.15), X(dw + 0.5), X(DOORS.h + 0.3))
  // The lobby behind: warm, a chandelier's glow high in it, the carpet going on in. Brighter where the doors stand open.
  const lobby = mixHex(FACADE_DEEP, STAR.spot, 0.5)
  p.noStroke()
  p.fill(lobby)
  p.rect(X(dx), X(CARPET - DOORS.h / 2), X(dw), X(DOORS.h))
  glow(p, X(dx), X(dtop + 1.1), X(1.6), STAR.spot, 0.7)
  // Two leaves of glass in brass, hinged at the jambs, swinging out toward us: each narrows as it opens, and where
  // it has swung away the lobby's light comes straight out.
  for (const side of [-1, 1] as const) {
    const hinge = side < 0 ? DOORS.x0 : DOORS.x1
    const w = (dw / 2) * Math.cos(o * 1.3)
    const free = hinge - side * w
    const lx = (hinge + free) / 2
    // The glass tints what is behind it, dimmer and cooler; its brass frame.
    p.noStroke()
    p.fill(rgbaHex(FACADE_DEEP, 0.55))
    p.rect(X(lx), X(CARPET - DOORS.h / 2), X(Math.max(0.02, w)), X(DOORS.h))
    outline(p, STAR.brass, Math.max(1, X(0.07)))
    p.rect(X(lx), X(CARPET - DOORS.h / 2), X(Math.max(0.02, w)), X(DOORS.h))
    if (w > 0.2) {
      outline(p, STAR.gold, weight * 1.2)
      p.line(X(lx - (w - 0.3) / 2), X(CARPET - 2.1), X(lx + (w - 0.3) / 2), X(CARPET - 2.1))
      // A glint down the glass.
      p.stroke(rgbaHex(STAR.spot, 0.35))
      p.strokeWeight(Math.max(1, X(0.03)))
      p.line(X(lx - w * 0.25), X(CARPET - 1.2), X(lx + w * 0.1), X(CARPET - 3.6))
    }
  }
  // The open doors' light on the jambs, and the flare as they go wide.
  if (o > 0.02) glow(p, X(dx), X(CARPET - 1.4), X(2.6), STAR.spot, 0.4 * o)
  const burst = knock(t - DOORS_WIDE, 0.3)
  if (burst > 0.01) glow(p, X(dx), X(CARPET - 2.2), X(4.2), STAR.spot, 0.55 * burst, 0.3)
  // Over the doors, the transom's sunburst.
  outline(p, STAR.gold, weight * 0.7)
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI
    p.line(X(dx), X(dtop - 0.05), X(dx + Math.cos(a) * 0.9), X(dtop - 0.05 + Math.sin(a) * 0.45))
  }

  // The marquee, and the bulbs along its underside, chasing slowly.
  const my = (MARQUEE.y0 + MARQUEE.y1) / 2
  solid(p, INK, weight, FACADE_DEEP)
  p.rect(X((MARQUEE.x0 + MARQUEE.x1) / 2), X(my), X(MARQUEE.x1 - MARQUEE.x0), X(MARQUEE.y1 - MARQUEE.y0))
  outline(p, STAR.gold, weight * 0.8)
  p.rect(X((MARQUEE.x0 + MARQUEE.x1) / 2), X(my), X(MARQUEE.x1 - MARQUEE.x0 - 0.3), X(MARQUEE.y1 - MARQUEE.y0 - 0.3))
  for (let x = MARQUEE.x0 + 0.2; x < MARQUEE.x1 - 0.1; x += 0.32) {
    const b = 0.55 + 0.45 * Math.max(0, Math.sin(x * 1.6 - t * 5))
    glow(p, X(x), X(MARQUEE.y1 + 0.02), X(0.3), STAR.gold, 0.5 * b)
    p.noStroke()
    p.fill(mixHex(STAR.brass, STAR.spot, b))
    p.circle(X(x), X(MARQUEE.y1 + 0.02), X(0.075))
  }
  // Its light on the doorway below.
  glow(p, X(dx), X(MARQUEE.y1 + 0.4), X(3.5), STAR.gold, 0.14)
}

/* ------------------------------------------------------------------ the spotlight */

/** Where she is on the carpet, whatever the time. */
function herX(t: number): number {
  if (t < BOUNCE) return flightIn(Math.max(0, t - BEGIN))[0]
  return carpetX(Math.min(t, EDGE_T))
}
/** It hunts over the press before it has her. */
const hunt = (t: number): number => 5.6 + 3.4 * Math.sin(0.75 * (t - 57.2))
const FIND = 60.15
/** Where the spotlight's pool is on the carpet at show time `t`, and how bright it is. */
function spotAt(t: number): { x: number; b: number } {
  if (t < FIND) return { x: hunt(t), b: 0.5 }
  if (t < SPOT) {
    // It sees her and swings onto her, faster and faster.
    const u = (t - FIND) / (SPOT - FIND)
    return { x: hunt(FIND) + (herX(SPOT) - hunt(FIND)) * (u * u * u), b: 0.5 + 0.1 * u }
  }
  const s = t - SPOT
  // Past her a little with the swing, and back onto her; then after her, a hair behind.
  const over = 0.42 * Math.sin(Math.min(Math.PI, s * 5)) * Math.exp(-s / 0.3)
  const x = Math.min(herX(t - 0.05) - over, EDGE_X - 0.35)
  const lost = smooth(t, EDGE_T + 0.2, EDGE_T + 1.3)
  return { x, b: (0.86 + 0.5 * knock(s, 0.12)) * (1 - lost) }
}

/** The spotlight's light: its cone from the lens to its pool, over the press and the rope line it falls across. */
function drawSpotBeam(p: p5, c: Ctx, t: number): void {
  const X = (v: number) => v * c.k
  const { x, b } = spotAt(t)
  if (b <= 0.01) return
  const aim = Math.atan2(CARPET - LAMP[1], x - LAMP[0])
  const lens: Pt = [LAMP[0] + Math.cos(aim) * 0.42, LAMP[1] + Math.sin(aim) * 0.42]
  // A soft outer cone and a harder core, lens to pool, stopped by the ground; the pool on the carpet, and its light
  // on what stands there.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(x - 6), X(LAMP[1] - 1), X(12), X(CARPET + 0.03 - LAMP[1] + 1))
  ctx.clip()
  beam(p, [X(lens[0]), X(lens[1])], [X(x), X(CARPET + 0.2)], X(0.3), X(1.0), STAR.spot, 0.12 * b, 0.07 * b)
  beam(p, [X(lens[0]), X(lens[1])], [X(x), X(CARPET + 0.2)], X(0.16), X(0.55), STAR.spot, 0.26 * b, 0.2 * b)
  ctx.restore()
  glow(p, X(x), X(CARPET - 0.45), X(1.3), STAR.spot, 0.2 * b)
  pool(p, X(x), X(CARPET + 0.08), X(0.95), X(0.2), STAR.spot, 0.95 * b)
}

/** The spotlight itself: a drum on a yoke on the marquee's roof, turned to its pool, its lens lit. */
function drawSpotLamp(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const { x, b } = spotAt(t)
  const aim = Math.atan2(CARPET - LAMP[1], x - LAMP[0])
  p.push()
  p.translate(X(LAMP[0]), X(LAMP[1]))
  solid(p, INK, weight, FACADE_DEEP)
  p.rect(0, X(0.24), X(0.1), X(0.44))
  p.rotate(aim)
  solid(p, INK, weight, mixHex(NIGHT, INK, 0.2))
  p.rect(0, 0, X(0.85), X(0.5), X(0.06))
  solid(p, INK, weight * 0.7, mixHex(STAR.brass, STAR.spot, 0.5 + 0.5 * b))
  p.rect(X(0.45), 0, X(0.08), X(0.46))
  p.pop()
  if (b > 0.01) glow(p, X(LAMP[0] + Math.cos(aim) * 0.5), X(LAMP[1] + Math.sin(aim) * 0.5), X(0.9), STAR.spot, 0.5 * b)
}

/** A soft light round her while the spot has her: what the stage's ball cannot show. */
export function spotOnHer(p: p5, c: Ctx, t: number, at: Pt): void {
  const { b } = spotAt(t)
  if (t < SPOT || b < 0.02) return
  glow(p, at[0] * c.k, at[1] * c.k, c.k * 0.55, STAR.spot, 0.3 * b)
}

/* ------------------------------------------------------------------ the press, drawn */

function drawPress(p: p5, c: Ctx, t: number, f: ReturnType<typeof frame>): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  if (f.x0 > PEN.x1 + 1.5 || f.x1 < PEN.x0 - 1.5) return
  // The crowd as one silhouette, shoulder to shoulder: every shoulder, head, hat, raised arm and camera outlined
  // together and then filled together, so only the outer edge keeps its line.
  const shapes = (fill: boolean) => {
    const top = CARPET - 1.4
    p.rect(X((PEN.x0 + PEN.x1) / 2), X((top + PEN.rail) / 2 + 0.1), X(PEN.x1 - PEN.x0 - 0.1), X(PEN.rail - top + 0.2))
    for (const s of PRESS) {
      const hy = headY(s)
      const hx = s.x + s.lean * 0.4
      const rx = reflectorOf(s)[0]
      const sy = Math.max(hy + 0.62, top + 0.02)
      // Shoulders: a low wide rise; the neck; the head, and a fedora on most.
      p.ellipse(X(s.x), X(sy), X(0.92), X(0.46))
      p.rect(X(hx), X(hy + 0.3), X(0.2), X(0.2))
      p.ellipse(X(hx), X(hy), X(0.4), X(0.48))
      if (s.hat) {
        p.ellipse(X(hx), X(hy - 0.14), X(0.7), X(0.1))
        p.rect(X(hx), X(hy - 0.29), X(0.4), X(0.27), X(0.1), X(0.1), X(0.02), X(0.02))
      }
      // The arm up, the camera at the face, and the flash gun's stem up to its reflector.
      p.quad(X(s.x + s.side * 0.4), X(sy - 0.02), X(s.x + s.side * 0.5), X(sy - 0.17), X(hx + s.side * 0.2), X(hy + 0.12), X(hx + s.side * 0.08), X(hy + 0.28))
      p.rect(X(hx + s.side * 0.07), X(hy + 0.08), X(0.44), X(0.3), X(0.04))
      if (!fill) p.line(X(rx), X(hy - 0.3), X(rx), X(hy - 0.06))
    }
  }
  p.stroke(rgbaHex(INK, 0.55))
  p.strokeWeight(weight * 1.6)
  p.fill(CROWD)
  shapes(false)
  p.noStroke()
  p.fill(CROWD)
  shapes(true)
  // The barrier they crouch behind: dark velvet hung from a brass rail, in folds.
  const bx = (PEN.x0 + PEN.x1) / 2
  solid(p, rgbaHex(INK, 0.6), weight * 0.8, mixHex(STAR.velvet, NIGHT, 0.5))
  p.rect(X(bx), X((PEN.rail + CARPET) / 2), X(PEN.x1 - PEN.x0), X(CARPET - PEN.rail))
  p.stroke(rgbaHex(NIGHT, 0.6))
  p.strokeWeight(Math.max(1, X(0.03)))
  for (let x = PEN.x0 + 0.35; x < PEN.x1 - 0.1; x += 0.42) p.line(X(x), X(PEN.rail + 0.08), X(x + 0.04), X(CARPET - 0.04))
  outline(p, STAR.brass, Math.max(1, X(0.06)))
  p.line(X(PEN.x0), X(PEN.rail), X(PEN.x1), X(PEN.rail))
  outline(p, STAR.gold, Math.max(1, X(0.018)))
  p.line(X(PEN.x0), X(PEN.rail - 0.015), X(PEN.x1), X(PEN.rail - 0.015))
  // The reflectors: dull silver in the dark, white hot when they fire.
  for (const s of PRESS) {
    const [rx, ry] = reflectorOf(s)
    const { pop, after } = flashOf(s, t)
    const r = 0.18
    solid(p, rgbaHex(INK, 0.6), weight * 0.7, mixHex(mixHex(SILVER, NIGHT, 0.5), STAR.flash, Math.max(pop, after * 0.7)))
    p.circle(X(rx), X(ry), X(2 * r))
    p.noStroke()
    p.fill(mixHex(mixHex(SILVER, NIGHT, 0.25), STAR.flash, Math.max(pop, after)))
    p.circle(X(rx), X(ry), X(r * 0.75))
    if (pop > 0.01 || after > 0.01) {
      glow(p, X(rx), X(ry), X(1.8), STAR.flash, 0.95 * pop + 0.14 * after)
      glint(p, X(rx), X(ry), X(1.0 * (0.55 + 0.45 * pop)), STAR.flash, pop)
    }
  }
}

/* ------------------------------------------------------------------ the carpet */

function drawCarpet(p: p5, c: Ctx, t: number, f: ReturnType<typeof frame>): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const x0 = Math.max(-12, f.x0 - 1)
  const x1 = EDGE_X
  // The street under it, down to the frame's foot.
  const foot = Math.max(CARPET + 3, f.y1 + 1)
  p.noStroke()
  p.fill(STREET)
  p.rect(X((x0 + x1) / 2), X((CARPET + foot) / 2), X(x1 - x0), X(foot - CARPET))
  // The carpet: its face, seen a little from above, a gold binding on its far edge, and its near edge in shadow.
  solid(p, INK, weight, STAR.carpet)
  p.rect(X((x0 + x1) / 2), X(CARPET + 0.12), X(x1 - x0), X(0.24))
  p.noStroke()
  p.fill(STAR.carpetDeep)
  p.rect(X((x0 + x1) / 2), X(CARPET + 0.21), X(x1 - x0), X(0.06))
  outline(p, STAR.gold, Math.max(1, X(0.025)))
  p.line(X(x0), X(CARPET + 0.01), X(x1), X(CARPET + 0.01))
  // The doors' light on it.
  const o = doorsOpen(t)
  if (o > 0.01) {
    pool(p, X((DOORS.x0 + DOORS.x1) / 2 + 0.3), X(CARPET + 0.1), X(3.2 * o + 0.6), X(0.24), STAR.spot, (0.7 + 0.3 * knock(t - DOORS_WIDE, 0.3)) * Math.min(1, o * 2))
    glow(p, X((DOORS.x0 + DOORS.x1) / 2), X(CARPET - 1.2), X(3.4), STAR.spot, 0.25 * o)
  }
}

/* ------------------------------------------------------------------ all of it */

/** Everything of the premiere behind the ball, at show time `t`. */
export function drawPremiere(p: p5, c: Ctx, t: number): void {
  const f = frame(p, c.k)
  if (f.x0 > EDGE_X + 1) return
  drawFacade(p, c, t, f)
  drawSpotLamp(p, c, t)
  drawPress(p, c, t, f)
  drawCarpet(p, c, t, f)
  drawRopeLine(p, c, t)
  drawSpotBeam(p, c, t)
}

/** Over everything: each flash's light thrown across the scene, and the flash of the frame itself. */
export function premiereOver(p: p5, c: Ctx, t: number): void {
  const f = frame(p, c.k)
  if (f.x0 > EDGE_X + 2) return
  const X = (v: number) => v * c.k
  for (const fl of FLASHES) {
    const s = t - fl.t
    if (s < 0 || s > 0.8) continue
    const a = knock(s, 0.08)
    glow(p, X(fl.x), X(fl.y), X(4.5), STAR.flash, 0.4 * a, 0.2)
    p.noStroke()
    p.fill(255, 255, 255, 36 * a)
    p.rect(X(f.cx), X(f.cy), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
  }
}
