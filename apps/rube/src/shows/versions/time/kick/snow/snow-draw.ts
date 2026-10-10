import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { beam, bloom, rgba, sink, tear } from '../cast'
import { hash, type Ctx } from '../kit'
import { beat } from '../music'
import { FISCHER_DOWN } from '../stack'
import { SNOW } from '../worlds'
import {
  A_SHIFT,
  ARIADNE_SNOW,
  CASE_X,
  clamp01,
  COBB,
  F_SHIFT,
  F_SKIS_OFF,
  FISCHER_SNOW,
  FLOOR_Y,
  FORT,
  fortDrop,
  GUARD_DOWN,
  GUARD_HAIR,
  GUARD_LAND,
  GUARDS,
  kickTears,
  LIE_A,
  LIE_C,
  skiLine,
  lerpAngle,
  MAL_AT,
  MAL_FROM,
  MAL_TO,
  Motion,
  REST,
  SHOT_X,
  ss,
  T,
  TEARS_UP,
  THROUGH,
  TRACK,
} from './snow-geo'

/**
 * What the snow's parts draw over the set and under (or over) the balls: the skis, the powder they throw, the guards on
 * their snowmobiles, Mal's rifle and its flash, the floor going soft under the sleepers, and in the vault the tears
 * where they come up through the floor and are thrown up through the fortress, and the charges' blast. All in the
 * world's cells: each function moves itself from the part's frame (`o`, the part's origin).
 */

type C2D = CanvasRenderingContext2D
const TAU = Math.PI * 2

/** The moment someone's centre first goes below `y` in a motion, searched between `a` and `b`. */
function crossing(m: Motion, a: number, b: number, y: number): number {
  let lo = a
  let hi = b
  if (m.at(b)[1] < y) return b
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (m.at(mid)[1] < y) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
const F_THROUGH = crossing(FISCHER_SNOW, T.shot, FISCHER_DOWN.t, FLOOR_Y + 0.45)
const C_THROUGH = crossing(COBB, T.sink, T.out, FLOOR_Y + 0.45)
const A_THROUGH = crossing(ARIADNE_SNOW, T.sink, T.out, FLOOR_Y + 0.45)

/* ------------------------------------------------------------------ powder */

interface Spray {
  at: Pt
  t: number
  /** How big, and which way it is thrown (radians; null: all round). */
  size: number
  dir: number | null
}
/** Every burst of powder: the landings, the carves, the stops. */
const SPRAYS: Spray[] = (() => {
  const out: Spray[] = []
  const land = (m: Motion, t: number, size: number, dir: number | null = null) => {
    const [x, y] = m.at(t)
    out.push({ at: [x, y + R], t, size, dir })
  }
  for (const [m, shift] of [
    [ARIADNE_SNOW, -A_SHIFT],
    [COBB, 0],
    [FISCHER_SNOW, F_SHIFT],
  ] as [Motion, number][]) {
    land(m, T.dropF + shift, 0.8)
    land(m, T.j1Land + shift, 1.2, Math.PI)
    land(m, T.h1 + shift, 1.1, Math.PI + 0.35)
    land(m, T.j2Land + shift, 0.9, 0)
  }
  // Down in the powder on the shoulder: the three landings.
  out.push({ at: [COBB.at(T.land)[0], COBB.at(T.land)[1] + R], t: T.land, size: 0.9, dir: null })
  const aLand = ARIADNE_SNOW.phases[0].t1
  const fLand = FISCHER_SNOW.phases[0].t1
  out.push({ at: [ARIADNE_SNOW.at(aLand)[0], ARIADNE_SNOW.at(aLand)[1] + R], t: aLand, size: 0.8, dir: null })
  out.push({ at: [FISCHER_SNOW.at(fLand)[0], FISCHER_SNOW.at(fLand)[1] + R], t: fLand, size: 0.8, dir: null })
  // The stops on the ledge, and on the apron.
  land(ARIADNE_SNOW, T.stopA - 0.15, 0.7, 0)
  land(COBB, T.stopC - 0.15, 0.7, 0)
  land(COBB, T.cLand3, 1.0, 0)
  land(ARIADNE_SNOW, T.aLand3, 0.8, 0)
  land(FISCHER_SNOW, T.gate - 0.2, 0.6, 0)
  // The guards: hard down on the face off the cornice, and their carves round the hairpin.
  GUARDS.forEach((m, i) => {
    const [lx, ly] = m.at(GUARD_LAND[i])
    out.push({ at: [lx, ly + R], t: GUARD_LAND[i], size: 1.3, dir: Math.PI })
    const [hx, hy] = m.at(GUARD_HAIR[i])
    out.push({ at: [hx, hy + R], t: GUARD_HAIR[i], size: 1.2, dir: Math.PI + 0.35 })
  })
  // The guard into the crevasse.
  const g = GUARDS[0].at(GUARD_DOWN)
  out.push({ at: [g[0] + 0.3, g[1]], t: GUARD_DOWN, size: 1.4, dir: -Math.PI / 2 })
  return out
})()

function drawSprays(ctx: C2D, k: number, t: number): void {
  for (const s of SPRAYS) {
    const u = t - s.t
    if (u < 0 || u > 1.3) continue
    const grow = 1 - Math.exp(-u / 0.25)
    const fade = Math.exp(-u / 0.45) * (1 - clamp01((u - 1.0) / 0.3))
    // A few soft lobes, thrown the way the skis threw them, settling.
    for (let i = 0; i < 4; i++) {
      const spread = s.dir === null ? (i / 4) * TAU : s.dir + (i - 1.5) * 0.35
      const reach = s.size * (0.25 + 0.55 * grow) * (0.6 + 0.4 * hash(i, Math.round(s.t * 10), 5))
      const x = s.at[0] + Math.cos(spread) * reach * (s.dir === null ? 0.8 : 1)
      const y = s.at[1] - 0.15 * s.size * grow + Math.sin(spread) * reach * 0.35 + u * u * 0.3
      const r = s.size * (0.22 + 0.4 * grow)
      const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
      g.addColorStop(0, rgba(SNOW.snow, 0.75 * fade))
      g.addColorStop(0.5, rgba(SNOW.snow, 0.35 * fade))
      g.addColorStop(1, rgba(SNOW.snow, 0))
      ctx.fillStyle = g
      ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
    }
  }
}

/** The powder the skis kick up behind them when they are running fast: a soft trail, fading. */
function drawPlume(ctx: C2D, k: number, m: Motion, t: number): void {
  if (m.ski(t) === null) return
  const v = m.vel(t)
  const speed = Math.hypot(v[0], v[1])
  if (speed < 2.2 || Math.abs(v[1]) > 3.5) return
  for (let i = 1; i <= 4; i++) {
    const back = m.at(t - i * 0.06)
    if (m.ski(t - i * 0.06) === null) continue
    const a = clamp01((speed - 2.2) / 3) * 0.3 * (1 - i / 5)
    const r = 0.1 + 0.06 * i
    const x = back[0]
    const y = back[1] + R - 0.05 - 0.03 * i
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
    g.addColorStop(0, rgba(SNOW.snow, a))
    g.addColorStop(1, rgba(SNOW.snow, 0))
    ctx.fillStyle = g
    ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  }
}

/* ------------------------------------------------------------------ skis */

/** Which way someone is going (for the skis' tips): right +1, left -1, looking a little ahead and back when still. */
function facing(m: Motion, t: number): number {
  for (const dt of [0, 0.4, -0.4, 1.0, -1.0, 2.5]) {
    const v = m.vel(t + dt)
    if (Math.abs(v[0]) > 0.08) return Math.sign(v[0])
  }
  return -1
}

/** A pair of skis under a ball at `at`, lying at `a` (radians), tips curled up at the front (`front`: +1 right). */
function skis(ctx: C2D, c: Ctx, at: Pt, a: number, front: number): void {
  const { k } = c
  const L = 0.62
  const nx = -Math.sin(a)
  const ny = Math.cos(a)
  const tx = Math.cos(a)
  const ty = Math.sin(a)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [off, color, w] of [
    [0.0, mixDark(), 0.05],
    [-0.035, SNOW.rock, 0.03],
  ] as [number, string, number][]) {
    const cx = at[0] + nx * (R + 0.035 + off)
    const cy = at[1] + ny * (R + 0.035 + off)
    const back: Pt = [cx - tx * front * L * 0.5, cy - ty * front * L * 0.5]
    const bend: Pt = [cx + tx * front * L * 0.36, cy + ty * front * L * 0.36]
    const tip: Pt = [cx + tx * front * L * 0.5 - nx * 0.07, cy + ty * front * L * 0.5 - ny * 0.07]
    ctx.beginPath()
    ctx.moveTo(back[0] * k, back[1] * k)
    ctx.lineTo(bend[0] * k, bend[1] * k)
    ctx.quadraticCurveTo((bend[0] + tx * front * 0.1) * k, (bend[1] + ty * front * 0.1) * k, tip[0] * k, tip[1] * k)
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, w * k)
    ctx.stroke()
  }
  ctx.restore()
}
const mixDark = () => SNOW.vault

function drawSkis(ctx: C2D, c: Ctx, m: Motion, t: number, restX: number | null): void {
  const a = m.ski(t)
  if (a !== null && t >= m.phases[0].t1 - 0.02) {
    // A heading left is the same line as one right: skis lie under the ball whichever way the path runs.
    skis(ctx, c, m.at(t), skiLine(a), facing(m, t))
    return
  }
  // Left where they lay down (when they have sunk out of them).
  if (restX !== null && t > T.sink) skis(ctx, c, [restX, FLOOR_Y - R], 0, 1)
}

/* ------------------------------------------------------------------ the guards */

/** A guard on a snowmobile, in silhouette, at `at` heading `h`: the machine, the rider hunched over it, its lamp. */
function snowmobile(p: p5, ctx: C2D, c: Ctx, at: Pt, h: number, lit: number): void {
  const { k } = c
  const dark = SNOW.vault
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  if (Math.cos(h) < 0) {
    ctx.scale(-1, 1)
    ctx.rotate(Math.PI - h)
  } else ctx.rotate(h)
  const P = (pts: Pt[], color: string) => {
    ctx.beginPath()
    ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
    for (const q of pts.slice(1)) ctx.lineTo(q[0] * k, q[1] * k)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  const g = R
  // The track under the back, and the ski under the front.
  P(
    [
      [-0.64, g - 0.2],
      [0.02, g - 0.2],
      [0.08, g - 0.05],
      [0.0, g],
      [-0.6, g],
      [-0.68, g - 0.1],
    ],
    dark,
  )
  ctx.strokeStyle = dark
  ctx.lineWidth = Math.max(1, 0.045 * k)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0.28 * k, g * k)
  ctx.lineTo(0.62 * k, g * k)
  ctx.quadraticCurveTo(0.74 * k, g * k, 0.76 * k, (g - 0.1) * k)
  ctx.moveTo(0.4 * k, (g - 0.02) * k)
  ctx.lineTo(0.33 * k, (g - 0.2) * k)
  ctx.stroke()
  // The body: the seat, the cowl, the nose.
  P(
    [
      [-0.66, g - 0.18],
      [-0.62, g - 0.4],
      [-0.1, g - 0.42],
      [0.22, g - 0.52],
      [0.52, g - 0.3],
      [0.58, g - 0.16],
      [0.1, g - 0.14],
    ],
    dark,
  )
  // The windscreen, a little lighter.
  P(
    [
      [0.2, g - 0.5],
      [0.3, g - 0.72],
      [0.36, g - 0.7],
      [0.32, g - 0.47],
    ],
    SNOW.rockDark,
  )
  // The rider: hunched forward, head down, arms to the bars.
  P(
    [
      [-0.46, g - 0.42],
      [-0.4, g - 0.72],
      [-0.2, g - 0.92],
      [0.02, g - 0.93],
      [0.2, g - 0.7],
      [0.24, g - 0.56],
      [0.02, g - 0.6],
      [-0.1, g - 0.42],
    ],
    dark,
  )
  ctx.beginPath()
  ctx.ellipse(0.02 * k, (g - 1.03) * k, 0.12 * k, 0.13 * k, 0, 0, TAU)
  ctx.fillStyle = dark
  ctx.fill()
  // A rim of the pale light along its top.
  ctx.strokeStyle = rgba(SNOW.snow, 0.35)
  ctx.lineWidth = Math.max(0.6, 0.02 * k)
  ctx.beginPath()
  ctx.moveTo(-0.4 * k, (g - 0.74) * k)
  ctx.lineTo(-0.2 * k, (g - 0.93) * k)
  ctx.lineTo(0.0 * k, (g - 0.95) * k)
  ctx.stroke()
  ctx.restore()
  // Its lamp, forward: a cold beam, soft.
  if (lit > 0.01) {
    const dir: Pt = [Math.cos(h), Math.sin(h)]
    const nose: Pt = [at[0] + dir[0] * 0.5 + Math.sin(h) * 0.25, at[1] + dir[1] * 0.5 - Math.abs(Math.cos(h)) * 0.25]
    beam(p, k, nose, [nose[0] + dir[0] * 3.2, nose[1] + dir[1] * 3.2 + 0.25], 0.12, 1.4, SNOW.flash, 0.3 * lit)
  }
}

function drawGuards(p: p5, ctx: C2D, c: Ctx, t: number): void {
  GUARDS.forEach((m, i) => {
    if (t < m.t0) return
    const at = m.at(t)
    const h = m.ski(t) ?? 0
    // The first goes into the crevasse: half in, its tail up out of the snow (the crevasse's lip hides the rest).
    const lit = i === 0 ? 1 - ss((t - GUARD_DOWN) / 0.4) * 0.8 : 1 - ss((t - (T.gate + 1)) / 2) * 0.5
    snowmobile(p, ctx, c, at, h, lit)
  })
  drawShots(p, ctx, c, t)
}

/**
 * The guards fire on them down the face (the chase had no threat that landed): on alternate beats of it, a flash at the
 * rider's shoulder and, a tenth of a second on, a spurt of snow kicked up on Fischer's track just ahead of him, the
 * last of the three, that he rides through (behind him, it fell off a tight frame). Never a hit: Mal's shot is the one that lands.
 */
const SHOTS: [number, number][] = [138, 139, 140, 141, 142, 143, 144, 145, 146].map((b, j) => [beat(b) + 0.04, j % 2])
function drawShots(p: p5, ctx: C2D, c: Ctx, t: number): void {
  const { k } = c
  for (const [ts, gi] of SHOTS) {
    const u = t - ts
    if (u < 0 || u > 0.7) continue
    const g = GUARDS[gi]
    const gat = g.at(ts)
    const tgt = FISCHER_SNOW.at(ts + 0.22)
    const side = Math.sign(tgt[0] - gat[0]) || -1
    // The flash at his shoulder, gone in a tenth of a second.
    if (u < 0.12) bloom(p, k, [gat[0] + side * 0.45, gat[1] - 0.85], 0.45, SNOW.flash, 0.9 * (1 - u / 0.12))
    // The round in flight: a dark streak coming in from the guard's side to where it strikes, so the spurt reads as a
    // shot landing and not as their own spray (the guards are mostly out of frame when they fire).
    const at: Pt = [tgt[0], tgt[1] + R]
    const dx = gat[0] + side * 0.45 - at[0]
    const dy = gat[1] - 0.85 - at[1]
    const dl = Math.hypot(dx, dy) || 1
    if (u < 0.16) {
      const w = Math.min(1, u / 0.1)
      const head: Pt = [at[0] + (dx / dl) * 2.4 * (1 - w), at[1] + (dy / dl) * 2.4 * (1 - w)]
      const tail: Pt = [head[0] + (dx / dl) * 1.3, head[1] + (dy / dl) * 1.3]
      const g = ctx.createLinearGradient(head[0] * k, head[1] * k, tail[0] * k, tail[1] * k)
      g.addColorStop(0, rgba(SNOW.vault, 0.85 * (1 - Math.max(0, u - 0.1) / 0.06)))
      g.addColorStop(1, rgba(SNOW.vault, 0))
      ctx.strokeStyle = g
      ctx.lineWidth = Math.max(1, 0.045 * k)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(head[0] * k, head[1] * k)
      ctx.lineTo(tail[0] * k, tail[1] * k)
      ctx.stroke()
    }
    // The spurt where it strikes the snow: up and settling, a few flecks thrown.
    const v = u - 0.1
    if (v < 0) continue
    const a = Math.exp(-v / 0.22)
    // White on white is lost: the pock it leaves is dark, and the spray in the snow's blue shade.
    ctx.fillStyle = rgba(SNOW.snowDeep, 0.75 * Math.exp(-v / 0.5))
    ctx.beginPath()
    ctx.ellipse(at[0] * k, at[1] * k, 0.14 * k, 0.05 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    bloom(p, k, [at[0], at[1] - 0.18 - 0.4 * Math.min(1, v / 0.15)], 0.35 + 0.45 * Math.min(1, v / 0.2), SNOW.snowShade, a)
    ctx.fillStyle = rgba(SNOW.snowDeep, 0.85 * a)
    for (let q = 0; q < 9; q++) {
      const ang = -Math.PI / 2 + (hash(q, Math.round(ts * 10), 7) - 0.5) * 1.6
      const sp = 1.8 + 2.0 * hash(q, Math.round(ts * 10), 8)
      const x = at[0] + Math.cos(ang) * sp * v
      const y = at[1] + Math.sin(ang) * sp * v + 4 * v * v
      ctx.beginPath()
      ctx.arc(x * k, y * k, Math.max(1.2, (0.04 + 0.03 * hash(q, 3, 9)) * k), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * Where Mal's shot strikes Fischer at the vault's door: a hard white flash on the shot, a ring going out from him
 * across the floor and a spray of snow thrown up off it, still settling when the camera cuts back to him, so the hit
 * is seen and not only his going under.
 */
function drawHit(p: p5, ctx: C2D, k: number, t: number): void {
  const u = t - T.shot
  if (u < 0 || u > 1.6) return
  const at: Pt = [SHOT_X, FLOOR_Y - R]
  bloom(p, k, at, 0.9, SNOW.flash, 0.95 * Math.exp(-u / 0.12))
  bloom(p, k, at, 0.5, SNOW.flash, 0.55 * Math.exp(-u / 0.45))
  // The ring, out along the floor (seen a little from above: flattened).
  const r = 0.2 + 1.1 * (1 - Math.exp(-u / 0.35))
  ctx.save()
  ctx.strokeStyle = rgba(SNOW.flash, 0.8 * (1 - u / 1.6))
  ctx.lineWidth = Math.max(1, 0.035 * k)
  ctx.beginPath()
  ctx.ellipse(at[0] * k, FLOOR_Y * k, r * k, r * 0.28 * k, 0, 0, TAU)
  ctx.stroke()
  // The spray: flecks thrown up and out, falling back under gravity, thinning.
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * (0.12 + 0.76 * hash(i, 1, 9))
    const v = 1.6 + 1.6 * hash(i, 2, 9)
    const x = at[0] + Math.cos(a) * v * u
    const y = FLOOR_Y - 0.05 + Math.sin(a) * v * u + 3.2 * u * u
    if (y > FLOOR_Y + 0.02) continue
    ctx.fillStyle = rgba(SNOW.snow, 0.9 * (1 - u / 1.6))
    ctx.beginPath()
    ctx.arc(x * k, y * k, Math.max(0.8, (0.025 + 0.02 * hash(i, 3, 9)) * k), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ Mal */

/** Mal's rifle on Fischer at the vault door, and its flash on the chord. */
function drawRifle(p: p5, ctx: C2D, c: Ctx, t: number, over: boolean): void {
  if (t < MAL_FROM || t > MAL_TO) return
  const { k } = c
  // Lowered along her until the camera comes to her, then brought up onto Fischer at the vault's door.
  const aimA = Math.atan2(FLOOR_Y - R - 0.1 - MAL_AT[1], SHOT_X - MAL_AT[0])
  const a = lerpAngle(0.95, aimA, ss((t - T.malCut) / 0.7))
  const d: Pt = [Math.cos(a), Math.sin(a)]
  const kick = t > T.shot ? 0.16 * Math.exp(-(t - T.shot) / 0.14) : 0
  const from: Pt = [MAL_AT[0] + d[0] * (0.02 - kick), MAL_AT[1] + d[1] * (0.02 - kick) + 0.04]
  const muzzle: Pt = [MAL_AT[0] + d[0] * (0.68 - kick), MAL_AT[1] + d[1] * (0.68 - kick) + 0.04]
  if (!over) {
    // A sniper's rifle in silhouette, laid out along the aim (s) and across it, up (h): the butt in her shoulder, the
    // grip and the magazine under, the scope on its mounts over the receiver, the long barrel to the muzzle.
    const n: Pt = [d[1], -d[0]]
    const q = (s: number, h: number): [number, number] => [(from[0] + d[0] * s + n[0] * h) * k, (from[1] + d[1] * s + n[1] * h) * k]
    const poly = (pts: [number, number][]): void => {
      ctx.beginPath()
      pts.forEach(([s, h], i) => (i ? ctx.lineTo(...q(s, h)) : ctx.moveTo(...q(s, h))))
      ctx.closePath()
      ctx.fill()
    }
    // The muzzle is where the flash comes out.
    const len = 0.66
    ctx.save()
    ctx.fillStyle = SNOW.vault
    // The stock: deep at the butt, thinning to the wrist, the grip dropping under it.
    poly([[-0.06, 0.035], [0.15, 0.03], [0.15, -0.012], [0.11, -0.02], [0.13, -0.075], [0.095, -0.075], [0.07, -0.025], [-0.06, -0.06]])
    // The receiver, and the magazine under it.
    poly([[0.14, 0.032], [0.34, 0.03], [0.34, -0.018], [0.14, -0.02]])
    poly([[0.2, -0.015], [0.255, -0.015], [0.27, -0.085], [0.225, -0.085]])
    // The barrel, thinning a little to the muzzle, and its brake.
    poly([[0.33, 0.016], [len, 0.011], [len, -0.009], [0.33, -0.012]])
    poly([[len - 0.045, 0.018], [len, 0.018], [len, -0.016], [len - 0.045, -0.016]])
    // The scope on two mounts: its bell to the front, its eyepiece back over her cheek.
    poly([[0.18, 0.03], [0.2, 0.03], [0.2, 0.06], [0.18, 0.06]])
    poly([[0.29, 0.03], [0.31, 0.03], [0.31, 0.06], [0.29, 0.06]])
    poly([[0.13, 0.06], [0.16, 0.052], [0.33, 0.052], [0.37, 0.045], [0.37, 0.105], [0.33, 0.098], [0.16, 0.098], [0.13, 0.09]])
    // A glint on the scope's lens as she brings it up.
    ctx.fillStyle = rgba(SNOW.flash, 0.55)
    poly([[0.355, 0.055], [0.368, 0.053], [0.368, 0.097], [0.355, 0.095]])
    ctx.restore()
    return
  }
  // The flash: a short hard cone of light out of the muzzle, gone in a sixth of a second; then a puff of smoke that
  // drifts off and thins.
  const u = t - T.shot
  if (u < 0 || u > 1.6) return
  // Held a little (a sixth of a second was gone between looks), and the smoke grey: pale on the pale snow, the shot
  // did not read, and a viewer new to it could not tell her rifle from ski poles.
  const f = Math.exp(-u / 0.11)
  if (u < 0.45) {
    const core = mixHex(SNOW.flash, SNOW.pinwheel, 0.35)
    beam(p, k, muzzle, [muzzle[0] + d[0] * 1.5, muzzle[1] + d[1] * 1.5], 0.1, 0.9, core, f)
    beam(p, k, muzzle, [muzzle[0] + d[0] * 0.8, muzzle[1] + d[1] * 0.8], 0.06, 0.35, SNOW.flash, f)
    beam(p, k, muzzle, [muzzle[0] + d[1] * 0.5, muzzle[1] - d[0] * 0.5], 0.05, 0.28, core, 0.7 * f)
    beam(p, k, muzzle, [muzzle[0] - d[1] * 0.5, muzzle[1] + d[0] * 0.5], 0.05, 0.28, core, 0.7 * f)
    bloom(p, k, [muzzle[0] + d[0] * 0.25, muzzle[1] + d[1] * 0.25], 0.9, SNOW.flash, 0.8 * f)
  }
  const smoke = ss(u / 0.15) * (1 - ss((u - 0.5) / 1.1))
  if (smoke > 0.01) {
    const at: Pt = [muzzle[0] + d[0] * (0.2 + 0.25 * u) + 0.15 * u, muzzle[1] + d[1] * (0.2 + 0.25 * u) - 0.25 * u]
    const r = 0.18 + 0.3 * u
    const g = (p.drawingContext as C2D).createRadialGradient(at[0] * k, at[1] * k, 0, at[0] * k, at[1] * k, r * k)
    const grey = mixHex(SNOW.rock, SNOW.snowShade, 0.35)
    g.addColorStop(0, rgba(grey, 0.75 * smoke))
    g.addColorStop(0.6, rgba(grey, 0.32 * smoke))
    g.addColorStop(1, rgba(grey, 0))
    const cx = p.drawingContext as C2D
    cx.fillStyle = g
    cx.fillRect((at[0] - r) * k, (at[1] - r) * k, 2 * r * k, 2 * r * k)
  }
}

/* ------------------------------------------------------------------ the parts */

const at = (ctx: C2D, k: number, o: Pt, fn: () => void) => {
  ctx.save()
  ctx.translate(-o[0] * k, -o[1] * k)
  fn()
  ctx.restore()
}

export function drawSnowPart(p: p5, c: Ctx, t: number, o: Pt): void {
  const ctx = p.drawingContext as C2D
  const { k } = c
  at(ctx, k, o, () => {
    drawGuards(p, ctx, c, t)
    drawSprays(ctx, k, t)
    for (const m of [ARIADNE_SNOW, COBB, FISCHER_SNOW]) if (t < m.t1) drawPlume(ctx, k, m, t)
    drawSkis(ctx, c, ARIADNE_SNOW, t, LIE_A)
    drawSkis(ctx, c, COBB, t, LIE_C)
    if (t < FISCHER_SNOW.t1 && FISCHER_SNOW.ski(t) !== null) drawSkis(ctx, c, FISCHER_SNOW, t, null)
    else if (t > T.in + 5) skis(ctx, c, F_SKIS_OFF, 0, 1)
    drawRifle(p, ctx, c, t, false)
    // The floor goes soft under them: Fischer where he is shot; Cobb and Ariadne by the gate as the case opens.
    sink(p, k, [SHOT_X, FLOOR_Y], t - T.shot - 0.3, F_THROUGH - T.shot - 0.3, 0.8)
    drawHit(p, ctx, k, t)
    sink(p, k, [LIE_C, FLOOR_Y], t - T.sink, C_THROUGH - T.sink, 0.75)
    sink(p, k, [LIE_A, FLOOR_Y], t - T.sink, A_THROUGH - T.sink, 0.7)
    drawCaseLines(ctx, c, t)
  })
}

export function drawSnowOver(p: p5, c: Ctx, t: number, o: Pt): void {
  const ctx = p.drawingContext as C2D
  at(ctx, c.k, o, () => drawRifle(p, ctx, c, t, true))
}

/** The case's lines out to their wrists: thin tubes that go slack and draw back as they sink. */
function drawCaseLines(ctx: C2D, c: Ctx, t: number): void {
  const out = ss((t - T.case) / 0.45)
  const back = ss((t - T.sink - 0.2) / 0.8)
  const a = out * (1 - back)
  if (a <= 0.01) return
  const { k } = c
  const from: Pt = [CASE_X + 0.12, FLOOR_Y - 0.1]
  ctx.save()
  ctx.strokeStyle = rgba(SNOW.snowDeep, 0.9)
  ctx.lineWidth = Math.max(0.8, 0.022 * k)
  ctx.lineCap = 'round'
  for (const x of [LIE_C, LIE_A]) {
    const to: Pt = [x + 0.1, FLOOR_Y - R - 0.02]
    const end: Pt = [from[0] + (to[0] - from[0]) * a, from[1] + (to[1] - from[1]) * a]
    ctx.beginPath()
    ctx.moveTo(from[0] * k, from[1] * k)
    ctx.quadraticCurveTo(((from[0] + end[0]) / 2) * k, (FLOOR_Y + 0.02) * k, end[0] * k, end[1] * k)
    ctx.stroke()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the vault */

export function drawVaultPart(p: p5, c: Ctx, t: number, o: Pt): void {
  const ctx = p.drawingContext as C2D
  const { k } = c
  at(ctx, k, o, () => {
    // The charges blow under the floor: flashes at the pillars, then the floor goes.
    const u = t - T.charges
    if (u >= 0 && u < 0.9) {
      const a = Math.exp(-u / 0.18)
      for (const px of [-5.2, -2.1, 1.0, 4.1]) bloom(p, k, [px, FLOOR_Y + 0.95 + fortDrop(t)], 1.1, SNOW.flash, 0.85 * a)
    }
  })
}

export function drawVaultOver(p: p5, c: Ctx, t: number, o: Pt): void {
  const ctx = p.drawingContext as C2D
  const { k } = c
  at(ctx, k, o, () => {
    // Up through the vault's floor, each of them, with a tear of light that heals.
    for (const q of TEARS_UP) tear(p, k, [q.x, q.y], t - q.t, 0.8, SNOW.flash)
    // Thrown up through the ceiling and the roof on the kick.
    for (const q of KICK_TEARS) tear(p, k, [q.x, q.y], t - q.t, 0.9, SNOW.flash)
    void REST
    void THROUGH
    void FORT
    void TRACK
  })
}
const KICK_TEARS = kickTears()
