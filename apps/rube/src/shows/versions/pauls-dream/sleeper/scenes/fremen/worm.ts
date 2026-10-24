import { R } from '../../../../../../parts'
import { FREMEN } from '../../cast'
import { M } from '../../music'
import { drawPour, drawWorm, type Worm } from '../../craft/worm'
import { clamp01, fill, kick, mix, rgba, smooth, smoother, type Paint, type Pt } from '../../paint'
import { RIDER } from '../../plan'
import type { Air } from '../../world/desert'
import { far } from './land'

/**
 * The worm the Fremen ride, at the end: first only a swell running under the far sand (worm sign), then its back
 * arching up out of it with a rider standing on it, surging on the climb's blows, crossing toward the rocks, and on the
 * last blow going down again. Its one job is the future: what Paul will do.
 *
 * One body, two places. Out on the erg it stands `D` cells back, seen from the crest small against the sky; for the
 * insert (`INSERT`) the same body, at the same moment of its going, is laid on the near sand far to the east, where the
 * camera can be close to the rider without a lens the dolly does not have. The rider is a ball: in the insert the
 * stage's own (`riderAt`), out on the erg too small for the stage, drawn here as one.
 *
 * It is the show's one sandworm (`craft/worm.ts`) along a spine: an arch of length `ARCH`, the head end leading west
 * into the sand, sand pouring off its flanks. No mouth is seen: this worm is ridden, not feared.
 */

/** How far back it is on the erg. */
export const D = 25
const ARCH = 40
const RW = 3
/** The near sand's height where the insert is laid. */
const INSERT_Y = -2

/** Where it is on the erg (the head's x, layer cells) and in the insert (world cells), by show time. */
const ERG_HEAD = (t: number) => 1205 - (t - RIDER.from) * 1.7
const INSERT_HEAD = (t: number) => ERG_HEAD(t) + 212
/** The insert's window: the camera is there only between these cuts. */
export const INSERT = { from: 388.64, to: 393.05 } as const

/** The surges on the climb's blows. */
const SURGES = [388.64, 391.41, 393.05, 394.87]
/** Worm sign: the swell running under the sand before it breaches. */
const SIGN = { from: 377.4, to: RIDER.from } as const

/** How high the arch stands over the sand at `t` (cells, the spine's top): breach, surge, dive. */
export function arch(t: number): number {
  const up = smoother(t, RIDER.from - 0.25, RIDER.from + 1.6)
  const down = smoother(t, M.last + 0.15, M.last + 2.6)
  const surge = SURGES.reduce((a, s) => a + 0.42 * kick(t, s, 0.24, 1.1), 0)
  return -RW * 1.3 + (8 + RW * 1.3 + surge * 1.6) * up * (1 - down)
}

/**
 * The spine at share `u` (0 the head, 1 the tail end) for a head at `hx` over sand at `base`: not a bridge's arch but a
 * back breaching, the head end coming up steep and highest a third of the way along, the long tail end going down
 * slowly into the sand behind.
 */
function spine(hx: number, base: number, a: number, u: number): Pt {
  const k = Math.sin(Math.PI * Math.pow(Math.max(0, Math.min(1, u)), 0.62))
  return [hx + u * ARCH, base + RW * 0.9 - (a + RW * 0.9) * k]
}

/** Its girth at share `u`: thickest behind the head, thinning toward the tail. */
const girth = (u: number): number => RW * (1.04 - 0.3 * u)

/** The outward normal of the arch's top at share `u` (pointing up off its back). */
function normal(hx: number, base: number, a: number, u: number): Pt {
  const p0 = spine(hx, base, a, u - 0.002)
  const p1 = spine(hx, base, a, u + 0.002)
  const tx = p1[0] - p0[0]
  const ty = p1[1] - p0[1]
  const l = Math.hypot(tx, ty) || 1
  return [ty / l, -tx / l]
}

/** Where the rider stands along the arch. */
const RIDE_U = 0.3

/** The rider's place on the worm's back, in a frame where the head is at `hx` over sand at `base`. */
function riderOn(hx: number, base: number, a: number, size: number): Pt {
  const s = spine(hx, base, a, RIDE_U)
  const n = normal(hx, base, a, RIDE_U)
  const r = R * size
  return [s[0] + n[0] * (girth(RIDE_U) + r), s[1] + n[1] * (girth(RIDE_U) + r)]
}

/** The rider in the insert, where the stage draws him (world cells). */
export const riderAt = (t: number): Pt => riderOn(INSERT_HEAD(t), INSERT_Y, arch(t), FREMEN.size)

/** Toward the sun, up and to the east of the frame. */
const SUN: Pt = [0.45, -0.89]

/** The worm as the shared drawing has it: its spine from the tail end to the head (both in the sand), its girth. */
function worm(hx: number, base: number, a: number, map: (p: Pt) => Pt, air: Air, haze: number, phase: number, n: number): Worm {
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) pts.push(spine(hx, base, a, 1 - i / n))
  return {
    spine: pts,
    radius: (back, len) => girth(back / Math.max(1e-6, len)),
    sun: SUN,
    map,
    phase,
    tint: (c) => mix(mix(c, air.sand, 0.22), air.haze, haze),
  }
}

/** Sand sliding off its back: two broad soft sheets from its upper flanks to the sand. */
function pour(g: Paint, w: Worm, a: number, base: number, air: Air, t: number): void {
  if (a <= 0.5) return
  drawPour(g, w, 1, t, [[0.76, 1], [0.38, 1]], mix(air.sand, '#FFF4E2', 0.18), base + 0.2)
}

/**
 * Worm sign: the far sand's crest at `x` swells where the worm runs under it, a long low swell travelling west with it,
 * gone as it breaches (the range at depth `D` stands it up: `setSwell`).
 */
export function sign(x: number, t: number): number {
  if (t < SIGN.from || t > RIDER.from + 0.6) return 0
  const u = clamp01((t - SIGN.from) / (SIGN.to - SIGN.from))
  const rise = smooth(t, SIGN.from, SIGN.from + 1.4) * (1 - smooth(t, RIDER.from - 0.1, RIDER.from + 0.6))
  const k = (x - ERG_HEAD(t) - ARCH * 0.3) / (ARCH * 0.35)
  return (2.2 + 1.8 * u) * rise * Math.exp(-k * k * 2)
}

/** Out on the erg: the arch and its rider, small against the sky. Drawn at its depth among the ranges. */
export function drawFarWorm(g: Paint, air: Air): void {
  const t = g.t
  if (t < RIDER.from - 0.5 || t > M.last + 3.2) return
  const L = far(g, D)
  const haze = 0.2
  const ctx = g.ctx
  const a = arch(t)
  if (a <= -RW) return
  const hx = ERG_HEAD(t)
  // Nothing of it below its own sand: it breaches, rather than appearing whole over the sand in front of it.
  drawWorm(g, { ...worm(hx, 0, a, L.pt, air, haze, t * 1.7, 60), ground: 0.15 })
  // The rider, too small for the stage: a ball drawn here, the troop's own umber, a hair of rope to the hooks.
  if (a > 1.2) {
    const r = Math.max(R * FREMEN.size * L.s, 1.6 * g.px)
    const [x, y] = L.pt(riderOn(hx, 0, a, FREMEN.size))
    const hook = L.pt(spine(hx, 0, a, RIDE_U - 0.05))
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(hook[0], hook[1] - girth(RIDE_U - 0.05) * L.s * 0.95)
    ctx.strokeStyle = rgba('#2D2218', 0.7)
    ctx.lineWidth = Math.max(1.25 * g.px, 0.04 * L.s)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y - r * 0.2, r, 0, Math.PI * 2)
    fill(ctx, FREMEN.color)
  }
}

/** The insert: the same worm laid on the near sand, the rider (the stage's ball) on its back. Under the balls. */
export function drawNearWorm(g: Paint, air: Air): void {
  const t = g.t
  if (t < INSERT.from - 0.01 || t >= INSERT.to + 0.01) return
  const a = arch(t)
  const hx = INSERT_HEAD(t)
  const w = worm(hx, INSERT_Y, a, (p: Pt): Pt => p, air, 0, t * 1.7, 120)
  drawWorm(g, w)
  pour(g, w, a, INSERT_Y, air, t)
}

/** The rider's ropes in the insert: from his hands to the hooks set in the seam ahead of him. Over the balls. */
export function drawRopes(g: Paint): void {
  const t = g.t
  if (t < INSERT.from - 0.01 || t >= INSERT.to + 0.01) return
  const a = arch(t)
  const hx = INSERT_HEAD(t)
  const [x, y] = riderAt(t)
  const ctx = g.ctx
  for (const du of [0.028, 0.046]) {
    const s = spine(hx, INSERT_Y, a, RIDE_U - du)
    const n = normal(hx, INSERT_Y, a, RIDE_U - du)
    const hook: Pt = [s[0] + n[0] * girth(RIDE_U - du) * 0.98, s[1] + n[1] * girth(RIDE_U - du) * 0.98]
    ctx.beginPath()
    ctx.moveTo(x - 0.06, y + 0.02)
    ctx.lineTo(hook[0], hook[1])
    ctx.strokeStyle = '#2D2218'
    ctx.lineWidth = Math.max(1.25 * g.px, 0.022)
    ctx.stroke()
    // The hook's stave, standing out of the seam.
    ctx.beginPath()
    ctx.moveTo(hook[0], hook[1])
    ctx.lineTo(hook[0] + n[0] * 0.22, hook[1] + n[1] * 0.22)
    ctx.lineWidth = Math.max(1.25 * g.px, 0.04)
    ctx.stroke()
  }
}
