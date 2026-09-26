import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash } from '../kit'
import type { Pen } from '../troll'
import { SKY, STONE } from '../worlds'

/**
 * The finale's water: the geyser the broken heart lets loose up the chimney. A column of it, the cup of foam it makes
 * where it holds Peer up (the ball dancing on a fountain), and, out of the summit, its plume. Drawn in the caller's
 * frame, cells; y down. Flat fills and alpha, from the palette's wet stone and starlight; the dawn lights its east side.
 */

const WATER = STONE.wet
const FOAM = mixHex(STONE.wet, SKY.star, 0.65)
const frac = (v: number) => v - Math.floor(v)

/** Half the column's width at height u of it (0 at its foot, 1 at its top), `force` 0..1. */
function halfWidth(y: number, u: number, T: number, force: number): number {
  return (0.14 - 0.045 * u) * (0.85 + 0.25 * force) * (1 + 0.12 * Math.sin(y * 2.6 + T * 17) + 0.06 * Math.sin(y * 6.1 - T * 9))
}

/**
 * The column: from (x, yBase) up to yTop (yTop < yBase), pulsing upward (its swellings travel up it), `force` 0..1 how
 * hard it is pushing, `sun` 0..1 the dawn on its east (+x) side. `wide` widens it (the plume out in the open).
 */
export function column(p: p5, c: Pen, x: number, yBase: number, yTop: number, T: number, force: number, sun = 0, wide = 1): void {
  const k = c.k
  const len = yBase - yTop
  if (len <= 0.02) return
  const n = Math.max(8, Math.min(200, Math.ceil(len * 4)))
  const xs: [number, number, number][] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const y = yBase - len * u
    const hw = halfWidth(y, u, T, force) * wide
    const wob = 0.018 * Math.sin(y * 1.3 + T * 6)
    xs.push([x + wob - hw, x + wob + hw, y])
  }
  p.push()
  p.noStroke()
  p.fill(alpha(p, WATER, 0.82))
  p.beginShape()
  for (const [l, , y] of xs) p.vertex(l * k, y * k)
  for (let i = xs.length - 1; i >= 0; i--) p.vertex(xs[i][1] * k, xs[i][2] * k)
  p.endShape(p.CLOSE)
  // The bright core, a little west of the middle.
  p.fill(alpha(p, FOAM, 0.8))
  p.beginShape()
  for (const [l, r, y] of xs) p.vertex((l + (r - l) * 0.2) * k, y * k)
  for (let i = xs.length - 1; i >= 0; i--) p.vertex((xs[i][0] + (xs[i][1] - xs[i][0]) * 0.48) * k, xs[i][2] * k)
  p.endShape(p.CLOSE)
  if (sun > 0.02) {
    p.fill(alpha(p, SKY.sun, 0.55 * sun))
    p.beginShape()
    for (const [l, r, y] of xs) p.vertex((l + (r - l) * 0.72) * k, y * k)
    for (let i = xs.length - 1; i >= 0; i--) p.vertex(xs[i][1] * k, xs[i][2] * k)
    p.endShape(p.CLOSE)
  }
  p.pop()
}

/** Drops flicked off a rim at (x, y) to side s: each leaves, arcs out and falls, and is gone; small and pointed. */
function flicks(p: p5, k: number, x: number, y: number, s: number, T: number, n: number, reach: number, a: number, col: string): void {
  for (let i = 0; i < n; i++) {
    const u = frac(T * 2.3 + i / n + (s > 0 ? 0.37 : 0) + 0.21 * hash(i, 83))
    const tau = u * 0.42
    const vx = s * (0.9 + 0.5 * hash(i, 84)) * reach
    const vy = -(0.7 + 0.5 * hash(i, 85)) * reach
    const dx = x + vx * tau
    const dy = y + vy * tau + 3.5 * tau * tau
    p.fill(alpha(p, col, a * (1 - u)))
    p.ellipse(dx * k, dy * k, 0.024 * k, 0.042 * k)
  }
}

/**
 * The cup of foam the column makes where it holds Peer up: water wrapped round the ball's underside, a little wider
 * than he is, its rim frothing and flicking drops off both sides. (bx, by) is the ball's centre; the stage draws the
 * ball over it. `press` 0..1: he is rammed against a ceiling, and the water runs out flat along its underside and
 * drips. `spit` 0..1: he sits in the pipe's mouth, stopping it, and only a little spits out round him.
 */
export function crown(p: p5, c: Pen, bx: number, by: number, T: number, force: number, press = 0, sun = 0, spit = 0): void {
  const k = c.k
  p.push()
  p.noStroke()
  if (spit > 0) {
    for (const s of [-1, 1]) flicks(p, k, bx + s * 0.11, by + 0.1, s, T, 3, 0.55 * spit, 0.8 * spit, FOAM)
    p.pop()
    return
  }
  const w = 0.19 + 0.05 * force
  const rim = by - 0.02 + 0.015 * Math.sin(T * 11)
  const depth = 0.19 + 0.05 * force
  const warm = mixHex(FOAM, SKY.sun, 0.35 * sun)
  // The cup.
  p.fill(alpha(p, FOAM, 0.72))
  p.beginShape()
  p.vertex((bx - w) * k, rim * k)
  p.bezierVertex((bx - w * 0.98) * k, (by + depth * 0.75) * k, (bx - w * 0.45) * k, (by + depth + 0.04) * k, bx * k, (by + depth + 0.04) * k)
  p.bezierVertex((bx + w * 0.45) * k, (by + depth + 0.04) * k, (bx + w * 0.98) * k, (by + depth * 0.75) * k, (bx + w) * k, rim * k)
  p.bezierVertex((bx + w * 0.6) * k, (rim + 0.05) * k, (bx - w * 0.6) * k, (rim + 0.05) * k, (bx - w) * k, rim * k)
  p.endShape(p.CLOSE)
  // Its rim, frothing: a few small scallops of brighter foam.
  p.fill(alpha(p, warm, 0.85))
  for (let i = 0; i < 4; i++) {
    const s = i < 2 ? -1 : 1
    const e = 0.72 + 0.28 * (i % 2)
    p.ellipse((bx + s * w * e) * k, (rim + 0.025 + 0.02 * Math.sin(T * 17 + i * 2)) * k, 0.07 * k, 0.045 * k)
  }
  for (const s of [-1, 1]) flicks(p, k, bx + s * w, rim, s, T, 3 + Math.round(2 * force), 0.6 + 0.4 * force, 0.8 * (1 - 0.6 * press), warm)
  // Rammed against a ceiling: the water has nowhere to go but out, and sprays sideways along its underside in fine
  // drops that fall away.
  if (press > 0.02) {
    const ceil = by - 0.13
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const u = frac(T * 3.1 + i / 5 + (s > 0 ? 0.5 : 0) + 0.3 * hash(i, 86))
        const dx = bx + s * (0.12 + 0.75 * u * (0.7 + 0.3 * hash(i, 87)))
        const dy = ceil + 0.04 + 0.03 * (i % 2) + 0.9 * Math.max(0, u - 0.35) * Math.max(0, u - 0.35)
        p.fill(alpha(p, FOAM, 0.75 * press * (1 - u)))
        p.ellipse(dx * k, dy * k, 0.045 * k, 0.022 * k)
      }
    }
  }
  p.pop()
}

/**
 * The plume over the summit once Peer has left it: the column standing up out of the crater to `yTop`, wider in the
 * open, its top half wrapped in a tall head of spray (narrow at its foot, fullest high up, rounded on top), drops
 * falling back out of it to the flanks (to `ground(x)` of the caller's frame). `h` 0..1 how big it still is; `sun`
 * the dawn on its east side.
 */
export function plume(p: p5, c: Pen, x: number, yBase: number, yTop: number, T: number, h: number, sun: number, ground: (x: number) => number): void {
  if (h <= 0.005 || yBase - yTop < 0.05) return
  const k = c.k
  column(p, c, x, yBase, yTop, T, 0.6 + 0.4 * h, sun, 1 + 1.1 * h)
  const tall = yBase - yTop
  const foot = yTop + tall * 0.6
  const W = (0.3 + 0.8 * h) * Math.min(1, tall / 3)
  // The head: an upturned bell of spray, narrow where it leaves the column, broadest near the top, and on top a row
  // of billows (lobes of different sizes, each swelling and settling on its own clock), not a point.
  const head = (inner: number): Pt2[] => {
    const out: Pt2[] = []
    const n = 14
    for (let i = 0; i <= n; i++) {
      const v = i / n
      const y = foot + (yTop - foot) * v
      const hw = (0.08 + W * inner * Math.pow(Math.sin((v * Math.PI) / 2), 1.6)) * (1 + 0.05 * Math.sin(T * 5.1 + v * 7))
      out.push([x - hw, y])
    }
    const lobes = 5
    for (let i = 0; i <= lobes * 4; i++) {
      const u = i / (lobes * 4)
      const lx = x - W * inner * 1.05 + 2.1 * W * inner * u
      const which = Math.floor(u * lobes - 1e-9)
      const f = u * lobes - which
      const size = (0.55 + 0.45 * hash(which, 96)) * (1 + 0.12 * Math.sin(T * (2.1 + hash(which, 97)) + which * 2))
      out.push([lx, yTop - 0.05 - W * inner * 0.5 * size * Math.pow(Math.sin(Math.PI * f), 0.7) - 0.3 * W * inner * Math.sin(Math.PI * u)])
    }
    for (let i = n; i >= 0; i--) {
      const v = i / n
      const y = foot + (yTop - foot) * v
      const hw = (0.08 + W * inner * Math.pow(Math.sin((v * Math.PI) / 2), 1.6)) * (1 + 0.05 * Math.sin(T * 4.7 + v * 7 + 1))
      out.push([x + hw, y])
    }
    return out
  }
  p.push()
  p.noStroke()
  // Drops falling back out of the head to the flanks.
  for (let i = 0; i < 10; i++) {
    const s = i % 2 === 0 ? -1 : 1
    const u = frac(T * 0.75 + i / 10 + 0.13 * hash(i, 92))
    const x0 = x + s * W * (0.6 + 0.3 * hash(i, 93))
    const y0 = yTop + tall * 0.25 * hash(i, 94)
    const dx = x0 + s * (0.25 + 0.5 * hash(i, 95)) * u * (0.6 + h)
    const gy = ground(dx)
    const dy = y0 + (gy - y0) * u * u
    if (dy > gy) continue
    p.fill(alpha(p, mixHex(FOAM, SKY.sun, s > 0 ? 0.5 * sun : 0.1 * sun), 0.7 * (1 - u) * h))
    p.ellipse(dx * k, dy * k, 0.03 * k, 0.075 * k)
  }
  // The head: translucent spray, and a brighter heart to it.
  for (const [inner, a] of [[1, 0.3], [0.55, 0.45]] as const) {
    p.fill(alpha(p, mixHex(FOAM, SKY.sun, 0.3 * sun), a))
    p.beginShape()
    for (const [a0, b0] of head(inner)) p.vertex(a0 * k, b0 * k)
    p.endShape(p.CLOSE)
  }
  // The dawn on its east side.
  if (sun > 0.02) {
    p.fill(alpha(p, SKY.sun, 0.3 * sun))
    p.beginShape()
    for (const [a0, b0] of head(1)) if (a0 >= x - 0.02) p.vertex((x + (a0 - x) * (a0 > x + 0.3 * W ? 1 : 0.6)) * k, b0 * k)
    p.endShape(p.CLOSE)
  }
  p.pop()
}

type Pt2 = [number, number]

/** Steam rising off the crater once the geyser has sunk: a few faint strands drifting east and thinning. */
export function steam(p: p5, c: Pen, x: number, y: number, T: number, a: number, sun: number): void {
  if (a <= 0.005) return
  const k = c.k
  p.push()
  p.noStroke()
  for (let i = 0; i < 4; i++) {
    const age = frac(T * 0.11 + i / 4)
    const rise = 4.5 * age
    const sx = x + (i - 1.5) * 0.2 + 1.6 * age * age + 0.2 * Math.sin(T * 0.7 + i * 2)
    const sy = y - rise
    p.fill(alpha(p, mixHex(FOAM, SKY.sun, 0.35 * sun), a * 0.12 * Math.sin(Math.PI * age)))
    p.ellipse(sx * k, sy * k, (0.3 + 0.8 * age) * k, (0.8 + 1.4 * age) * k)
  }
  p.pop()
}
