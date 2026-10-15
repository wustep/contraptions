import type { Pt } from '../../../../../parts'
import { layer, sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { BEATS } from '../music'
import { ctxOf, flash, mix, type Pen } from '../pen'
import { AY, BALES_TOP, BX0, BX1, FLARE, HALT, HOUSE, IN_BARN, LANTERN_DOWN, LANTERN_SHOT, PORCH, PORCH_ON, ROAD, S, SHOT_WIN, SHOTS, T0 } from './geo'
import { F, fireAt, fireLight } from './fire'
import { bag, box, disc, fill, loop, oval, poly, seg, stroke, wrap } from './ink'

/**
 * The wind that night, and what it does at the farm: it is one wind everywhere (left to right, the way the windmill's
 * vane streams and the smoke lays over), coming in gusts. Low scud goes over under the high clouds, across the moon,
 * faster than they do; the washing left out on the line in the yard cracks and fills; dry leaves go over the yard; a
 * curtain streams out of an open window upstairs. And the farm is awake: the dog on its chain by the porch gets up as
 * the cab's lamps come into the yard and barks on the backbeat, its breath going off in the cold; a man comes up into
 * the lit window with a rifle before the shots, and goes down again after the lantern; a rooster on the barn's roof
 * swings with the gusts.
 *
 * Nothing here gives light: the lit things are the windows and the lamps they already are, and what is near them is
 * lit by them, plainly.
 */

/** How hard the wind is blowing, about 1: gusting, slowly, never still. */
export const gust = (t: number): number => 1 + 0.38 * sway(t, 17, 5.5) + 0.14 * sway(t, 23, 1.9)
/** How far the wind has carried something at `t` that moves with it at speed 1: faster in the gusts, never back. */
const carried = (t: number): number => t + 0.85 * Math.sin(t * 1.13) / 1.13 + 0.25 * Math.sin(t * 2.9 + 1) / 2.9

const W = {
  scud: '#182837',
  scudLit: '#8095AA',
  cloth: '#8E9890',
  clothShade: '#606B66',
  shirt: '#6F7E88',
  towel: '#8E7C5E',
  pole: '#14110F',
  dog: '#090B0C',
  rim: '#8F7A4A',
  breath: '#A9B4B4',
  leaf: '#55493A',
  leafLit: '#7E6842',
  curtain: '#E3D3A4',
  man: '#08090B',
}

/**
 * A closed shape gathered into a path with the same turn as the discs and boxes beside it, so that where they overlap
 * the fill stays solid (a shape turned the other way, as a mirrored one is, would cut a hole there).
 */
export function solid(path: Path2D, pts: Pt[]): void {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    area += x0 * y1 - x1 * y0
  }
  poly(path, area < 0 ? [...pts].reverse() : pts)
}

/* ------------------------------------------------------------------ the scud */

const ANCHOR: Pt = [0, AY]
/** Low cloud, nearer than the high clouds (`sky.ts`, at 0.03) and quicker, going over on the wind. */
const D_SCUD = 0.14
const SCUD = 19
const SCUD_PERIOD = 46
const SCUD_V = 0.42

/** The scud: torn low cloud, lit along its top by the moon, going over (and across the moon) on the wind. */
export function drawScud(pen: Pen, t: number, f: Frame): void {
  layer(
    pen,
    f,
    D_SCUD,
    (g) => {
      const body = bag()
      const lit = bag()
      const belly = bag()
      const run = carried(t - T0) * SCUD_V
      for (let i = 0; i < SCUD; i++) {
        const L = 1.5 + 2.6 * hash(i, 201)
        const Hc = 0.1 + 0.15 * hash(i, 202)
        const y = AY - 1.15 - 3.6 * ((i * 0.618 + 0.3 * hash(i, 203)) % 1)
        const x = wrap(-16 + hash(i, 204) * SCUD_PERIOD + run * (0.8 + 0.4 * hash(i, 205)), -16, SCUD_PERIOD)
        if (x + L / 2 + 0.4 < g.x0 || x - L / 2 - 0.4 > g.x1 || y + Hc < g.y0 || y - 3 * Hc > g.y1) continue
        // Ragged along its top and torn at its ends, the rags changing slowly as it goes.
        const pts: Pt[] = []
        const n = 9
        for (let j = 0; j <= n; j++) {
          const u = j / n
          const tear = 0.7 + 0.3 * Math.sin(t * 0.55 + j * 1.7 + i * 2.3)
          const lump = (0.25 + 0.75 * Math.sin(u * Math.PI) ** 0.8) * (0.4 + 0.6 * hash(i, j, 206)) * tear
          pts.push([x - L / 2 + L * u + (hash(i, j, 207) - 0.5) * 0.18, y - Hc * 2.1 * lump])
        }
        pts.push([x + L * 0.5 + 0.12 * Math.sin(t * 0.7 + i), y + Hc * 0.15], [x + L * 0.15, y + Hc * 0.35], [x - L * 0.25, y + Hc * 0.3], [x - L * 0.52 - 0.1 * Math.sin(t * 0.6 + i), y + Hc * 0.1])
        loop(lit, pts, 0, -0.04)
        loop(body, pts)
        loop(belly, pts, 0.02, 0.05)
      }
      const fire = fireAt(t)
      if (fire > 0) fill(pen, belly, mix(F.red, F.gold, 0.1), 0.35 * Math.min(1, fireLight(t)))
      fill(pen, lit, W.scudLit, 0.6)
      fill(pen, body, W.scud, 0.9)
    },
    ANCHOR,
  )
}

/* ------------------------------------------------------------------ the washing */

/** The line: from its pole in the yard to a hook on the house's corner, and how far it sags. */
const POLE_X = S + 2.35
const LINE_A: Pt = [POLE_X, ROAD - 3.12]
const LINE_B: Pt = [HOUSE[0] - 0.02, ROAD - 3.38]
const SAG = 0.22
/** On it, along it (0 the pole, 1 the hook): a sheet, a shirt, a towel, a pillowcase. How far each hangs. */
const WASH: { from: number; to: number; drop: number; col: string; pegs: number }[] = [
  { from: 0.06, to: 0.42, drop: 1.0, col: W.cloth, pegs: 3 },
  { from: 0.49, to: 0.61, drop: 0.62, col: W.shirt, pegs: 2 },
  { from: 0.67, to: 0.8, drop: 0.78, col: W.towel, pegs: 2 },
  { from: 0.86, to: 0.95, drop: 0.42, col: W.cloth, pegs: 2 },
]

/** Where the line is at `u` along it, sagging, lifting a little in the gusts. */
function onLine(u: number, t: number): Pt {
  const sag = SAG * (1 - 0.18 * (gust(t) - 1)) + 0.02 * Math.sin(t * 3.1)
  return [LINE_A[0] + (LINE_B[0] - LINE_A[0]) * u, LINE_A[1] + (LINE_B[1] - LINE_A[1]) * u + sag * 4 * u * (1 - u)]
}

/**
 * The washing left out on the line, filling and cracking in the wind: each piece hangs from its pegs, its foot blown
 * out downwind and up, a ripple going along its hem.
 */
export function drawWash(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < POLE_X - 1 || f.x0 > LINE_B[0] + 1.5) return
  // The pole and its crossbar, and the line.
  const pole = bag()
  box(pole, POLE_X - 0.05, LINE_A[1] - 0.12, POLE_X + 0.05, ROAD - 0.38)
  box(pole, POLE_X - 0.3, LINE_A[1] - 0.12, POLE_X + 0.3, LINE_A[1] - 0.04)
  fill(pen, pole, W.pole, 1)
  const line = bag()
  const pts: Pt[] = []
  for (let i = 0; i <= 16; i++) pts.push(onLine(i / 16, t))
  line.moveTo(pts[0][0], pts[0][1])
  for (const p of pts.slice(1)) line.lineTo(p[0], p[1])
  stroke(pen, line, '#3A3A33', 1, 0.5)
  const g = gust(t)
  const shades = bag()
  const pegs = bag()
  for (const [i, w] of WASH.entries()) {
    const n = 6
    const top: Pt[] = []
    const hem: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const u = w.from + ((w.to - w.from) * j) / n
      const p = onLine(u, t)
      top.push(p)
      // Blown out downwind from the top, more toward the free corner, rippling along the hem.
      const a = 0.22 + 0.32 * g + 0.1 * Math.sin(t * 4.3 - j * 0.9 + i * 1.7) + 0.05 * Math.sin(t * 9.1 + j * 1.3 + i)
      const d = w.drop * (0.92 + 0.06 * Math.sin(t * 5.2 + j + i))
      hem.push([p[0] + Math.sin(a) * d, p[1] + Math.cos(a) * d - 0.04 * Math.sin(t * 6.5 - j * 1.4 + i * 2)])
    }
    const cloth = bag()
    poly(cloth, [...top, ...hem.reverse()])
    fill(pen, cloth, w.col, 0.96)
    // A fold or two down it, the shade going over as it fills.
    hem.reverse()
    for (const j of [2, 4]) {
      const fold = Math.sin(t * 3.7 + j + i * 2.1)
      if (fold < -0.2) continue
      seg(shades, top[j][0] + 0.04 * fold, top[j][1] + 0.05, hem[j][0] - 0.03, hem[j][1] - 0.04)
    }
    for (let k = 0; k < w.pegs; k++) {
      const p = onLine(w.from + ((w.to - w.from) * k) / Math.max(1, w.pegs - 1), t)
      box(pegs, p[0] - 0.02, p[1] - 0.07, p[0] + 0.02, p[1] + 0.04)
    }
  }
  stroke(pen, shades, W.clothShade, 0.7, 1.4)
  fill(pen, pegs, '#2C2822', 1)
}

/* ------------------------------------------------------------------ the dog */

/** The dog on its chain at the porch's end, under the window the shots come from; the chain's staple in the post. */
const DOG_X = S + 11.85
const STAKE: Pt = [PORCH[1] - 0.1, ROAD - 0.3]
/** It barks on the backbeat from when the porch lamp comes on until the barn is well alight. */
const BARKS = BEATS.filter((b) => b.t >= PORCH_ON - 0.01 && b.t <= FLARE + 4.5 && b.pos % 2 === 0).map((b) => b.t)
const lastBark = (t: number): number => {
  let ago = Infinity
  for (const b of BARKS) if (b <= t) ago = t - b
  return ago
}

/**
 * The dog: asleep by the porch until the cab's lamps come into the yard, then up on its feet; on every backbeat it
 * lunges to the end of its chain and barks, its head going up, its breath going off downwind. When they run for the
 * barn it turns after them.
 */
export function drawDog(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < DOG_X - 2 || f.x0 > DOG_X + 2) return
  const up = smooth(t, HALT - 0.7, HALT + 0.2)
  const face = t < IN_BARN - 0.3 ? -1 : 1
  const ago = lastBark(t)
  const bark = Number.isFinite(ago) ? flash(ago, 0.13) : 0
  const lunge = 0.07 * bark * face
  // Pacing at the end of its chain between barks.
  const x = DOG_X + lunge + (0.012 + 0.2 * smooth(t, HALT, HALT + 1)) * sway(t, 31, 2.4) * up
  const sh = ROAD - 0.22 - 0.38 * up
  const head: Pt = [x + face * 0.42, sh - 0.12 * up - 0.1 * bark - 0.03 + 0.08 * (1 - up)]
  const body = bag()
  oval(body, x, sh, 0.4, 0.15 + 0.03 * (1 - up))
  // Its legs (tucked while it lies), its head and muzzle, an ear up, its tail out stiff behind.
  if (up > 0.05) {
    for (const [lx, d] of [[x - 0.28, 1], [x - 0.14, -1], [x + 0.18, 1], [x + 0.3, -1]] as [number, number][]) {
      const sw = 0.03 * d * bark
      box(body, lx - 0.045 + sw, sh, lx + 0.045 + sw, sh + 0.38 * up)
    }
  }
  disc(body, head[0], head[1], 0.13)
  const jaw = 0.15 * bark
  solid(body, [[head[0], head[1] - 0.05], [head[0] + face * 0.26, head[1] - 0.01 - jaw * 0.3], [head[0] + face * 0.26, head[1] + 0.03 - jaw * 0.3], [head[0], head[1] + 0.06]])
  solid(body, [[head[0] + face * 0.02, head[1] + 0.07], [head[0] + face * 0.22, head[1] + 0.06 + jaw * 0.5], [head[0] + face * 0.2, head[1] + 0.1 + jaw * 0.5], [head[0], head[1] + 0.1]])
  solid(body, [[head[0] - face * 0.02, head[1] - 0.1], [head[0] - face * 0.1, head[1] - 0.27 - 0.03 * bark], [head[0] - face * 0.12, head[1] - 0.07]])
  const tail = -face * (0.32 + 0.04 * Math.sin(t * 7))
  solid(body, [[x - face * 0.35, sh - 0.05], [x + tail - face * 0.08, sh - 0.2 * up - 0.02 + 0.03 * sway(t, 33, 0.9)], [x + tail - face * 0.1, sh - 0.16 * up + 0.02], [x - face * 0.33, sh + 0.04]])
  // Lit along its back by the window over it.
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.translate(0, -0.035 * pen.k)
  fill(pen, body, W.rim, 0.55)
  ctx.restore()
  fill(pen, body, W.dog, 1)
  // The chain, slack, and taut as it lunges.
  const collar: Pt = [x + face * 0.3, sh - 0.05]
  const chain = bag()
  const slack = 0.18 * (1 - 0.8 * bark)
  chain.moveTo(STAKE[0], STAKE[1])
  for (let i = 1; i <= 10; i++) {
    const u = i / 10
    chain.lineTo(STAKE[0] + (collar[0] - STAKE[0]) * u, STAKE[1] + (collar[1] - STAKE[1]) * u + slack * 4 * u * (1 - u))
  }
  stroke(pen, chain, '#4A4840', 0.9, 0.55)
  // Its breath on each bark, off on the wind.
  if (ago < 1.1) {
    const u = ago / 1.1
    const puff = bag()
    const mouth: Pt = [head[0] + face * 0.3, head[1] + 0.03]
    for (let k = 0; k < 3; k++) disc(puff, mouth[0] + face * 0.12 * u + 0.45 * u * gust(t) + 0.06 * k, mouth[1] - 0.12 * u - 0.03 * k, 0.04 + 0.13 * u + 0.02 * k)
    fill(pen, puff, W.breath, 0.3 * (1 - u))
  }
}

/* ------------------------------------------------------------------ the men's breath */

/** Each of Mishkin's men breathing out in the cold, now and then, the breath going off on the wind. */
export function drawBreath(pen: Pen, t: number, mouths: Pt[]): void {
  const puff = bag()
  for (const [i, m] of mouths.entries()) {
    const period = 3.1 + 0.6 * i
    const u = ((t + 1.3 * i) % period) / 1.3
    if (u > 1) continue
    for (let k = 0; k < 2; k++) disc(puff, m[0] - 0.08 + 0.5 * u * gust(t) + 0.05 * k, m[1] - 0.08 * u - 0.03 * k, 0.03 + 0.1 * u)
  }
  fill(pen, puff, W.breath, 0.22)
}

/* ------------------------------------------------------------------ the man at the window */

/** Up into the window a bar before the first shot; down again once the lantern has gone. */
const RIFLE_UP: [number, number] = [SHOTS[0] - 1.9, SHOTS[0] - 1.1]
const RIFLE_DOWN: [number, number] = [LANTERN_SHOT + 1.6, LANTERN_SHOT + 2.4]

/**
 * The man at the window the shots come from: his head and shoulders come up into the lit window against the light, the
 * rifle's barrel out over the sill toward the gate; it kicks up with each shot, and he turns it on the barn.
 */
export function drawRifleman(pen: Pen, t: number): void {
  const up = smooth(t, RIFLE_UP[0], RIFLE_UP[1]) * (1 - smooth(t, RIFLE_DOWN[0], RIFLE_DOWN[1]))
  if (up <= 0.001) return
  const [cx, cy] = SHOT_WIN
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.beginPath()
  ctx.rect((cx - 0.375) * k, (cy - 0.575) * k, 0.75 * k, 1.15 * k)
  ctx.clip()
  const hx = cx + 0.1 + 0.02 * Math.sin(t * 1.3)
  const hy = cy + 0.85 - 0.75 * up
  const man = bag()
  disc(man, hx, hy, 0.12)
  solid(man, [[hx - 0.05, hy - 0.11], [hx - 0.04, hy - 0.2], [hx + 0.15, hy - 0.21], [hx + 0.17, hy - 0.11]])
  oval(man, hx, hy - 0.11, 0.22, 0.035)
  solid(man, [[hx - 0.3, hy + 0.7], [hx - 0.24, hy + 0.17], [hx - 0.08, hy + 0.1], [hx + 0.12, hy + 0.1], [hx + 0.3, hy + 0.2], [hx + 0.34, hy + 0.7]])
  fill(pen, man, W.man, 1)
  ctx.restore()
  // The rifle: from his shoulder out over the sill, at the gate, then at the barn; kicked up by each shot.
  let kick = 0
  for (const s of [...SHOTS, LANTERN_SHOT]) kick = Math.max(kick, flash(t - s, 0.14))
  // Down at the gate (left), then up and over onto the barn (right), the barrel lifting as it goes across.
  const toBarn = smooth(t, SHOTS[2] + 0.3, LANTERN_SHOT - 0.15)
  const aim = Math.PI - 0.35 + toBarn * (Math.PI + 0.6) + 0.3 * kick * (1 - 2 * toBarn)
  const sx = hx - 0.12 + 0.24 * toBarn
  const sy = hy + 0.2
  const len = 0.95 * up
  const rifle = bag()
  seg(rifle, sx, sy, sx + Math.cos(aim) * len, sy + Math.sin(aim) * len)
  stroke(pen, rifle, W.man, 1, 1.5)
}

/* ------------------------------------------------------------------ upstairs */

/**
 * The open window upstairs: its curtain streaming out of it on the wind and in again, lit from the room behind.
 * `win` is the window's middle and its size.
 */
export function drawCurtain(pen: Pen, t: number, win: Pt, w: number, h: number): void {
  const g = gust(t)
  const out = 0.12 + 0.3 * g + 0.06 * Math.sin(t * 3.3)
  const top = win[1] - h / 2 + 0.04
  const pts: Pt[] = [[win[0] - w / 2 + 0.05, top], [win[0] + w / 2 - 0.05, top]]
  const n = 5
  for (let j = 0; j <= n; j++) {
    const u = j / n
    const ripple = 0.05 * Math.sin(t * 6.1 - u * 4 + 1)
    pts.push([win[0] + w / 2 - 0.05 + out * (0.4 + 0.6 * (1 - u)) + ripple, top + h * (0.25 + 0.5 * (1 - u)) * (1 - 0.25 * (g - 1)) + 0.04 * Math.sin(t * 5 + u * 3)])
  }
  pts.push([win[0] - w / 2 + 0.12 + 0.6 * out, win[1] + h / 2 - 0.08])
  const c = bag()
  poly(c, pts)
  fill(pen, c, W.curtain, 0.9)
}

/* ------------------------------------------------------------------ the leaves */

/**
 * A few dry leaves, lifted off the yard a handful at a time by a gust, carried low over it a few cells, and let down
 * again: never up into the sky or the washing. Each handful has its own gust, at its own interval.
 */
const HANDFULS = 8
const PER = 6
/** Where the handfuls lift from: the yard and the barn's foot. */
const YARD: [number, number] = [S + 2.5, S + 23]
/** The lit things a leaf going by is lit by: the door, the lit windows. */
const LIGHTS: [Pt, number][] = [
  [[(PORCH[0] + PORCH[1]) / 2, ROAD - 1.2], 1.6],
  [[HOUSE[0] + 0.55, ROAD - 1.0], 1.1],
  [[SHOT_WIN[0], ROAD - 1.0], 1.1],
]

export function drawLeaves(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < YARD[0] - 1 || f.x0 > YARD[1] + 6) return
  const dark = [bag(), bag()]
  const lit = [bag(), bag()]
  const fireLit = [bag(), bag()]
  const fire = Math.min(1, fireLight(t))
  for (let k = 0; k < HANDFULS; k++) {
    const period = 5 + 2.5 * hash(k, 311)
    const life = 2.2 + 1.2 * hash(k, 312)
    const phase = (t - T0) / period + hash(k, 313)
    const gen = Math.floor(phase)
    const since = (phase - gen) * period
    if (since > life) continue
    const u = since / life
    const cx = YARD[0] + (YARD[1] - YARD[0]) * hash(k, gen, 314)
    const reach = 2.6 + 2.4 * hash(k, gen, 315)
    for (let j = 0; j < PER; j++) {
      const i = k * PER + j
      const h1 = hash(i, gen, 316)
      const h2 = hash(i, gen, 317)
      // Each its own moment into the gust, its own height and its own size.
      const v = Math.max(0, Math.min(1, (u - 0.12 * h1) / 0.88))
      if (v <= 0 || v >= 1) continue
      const x = cx + (h2 - 0.5) * 1.6 + reach * (0.7 + 0.5 * h1) * (v * (2 - v))
      if (x < f.x0 - 0.2 || x > f.x1 + 0.2) continue
      const lift = 0.25 + 1.0 * h2 * h2
      const y = ROAD - 0.04 - lift * Math.sin(Math.PI * v) ** 0.8 + 0.06 * Math.sin(t * 7 + i)
      const spin = t * (3 + 4 * h1) + i * 1.3
      const rx = 0.04 + 0.04 * h2 * h1 + 0.015 * hash(i, 318)
      // Thin, and thinner as it turns edge on.
      const ry = rx * (0.14 + 0.36 * Math.abs(Math.cos(spin * 0.8)))
      const fade = Math.min(1, v * 7, (1 - v) * 7)
      let l = 0
      for (const [c, r] of LIGHTS) l = Math.max(l, Math.exp(-((x - c[0]) ** 2 + (y - c[1]) ** 2) / (r * r)))
      const fl = fire * Math.exp(-(((x - (BX0 + BX1) / 2) / 7) ** 2))
      const set = fl > 0.3 && fl > l ? fireLit : l > 0.35 ? lit : dark
      oval(set[fade > 0.6 ? 1 : 0], x, y, rx, ry, spin)
    }
  }
  for (const [b, a] of [[0, 0.4], [1, 0.8]] as const) {
    fill(pen, dark[b], W.leaf, a)
    fill(pen, lit[b], W.leafLit, a * 0.85)
    fill(pen, fireLit[b], mix(W.leafLit, F.red, 0.45), a * 0.85)
  }
}

/* ------------------------------------------------------------------ the rooster on the barn */

/** The weathercock on the barn's ridge: swung by the gusts, going short as it turns toward us and away. */
export function drawVane(pen: Pen, t: number): void {
  const top: Pt = [(BX0 + BX1) / 2, ROAD - 7.8]
  const turn = 0.55 * sway(t, 41, 2.6) + 0.25 * (gust(t) - 1)
  const s = Math.cos(turn)
  const arrowY = top[1] - 0.55
  const rod = bag()
  seg(rod, top[0], top[1], top[0], top[1] - 1.0)
  seg(rod, top[0] - 0.5 * s, arrowY, top[0] + 0.5 * s, arrowY)
  stroke(pen, rod, '#0C0A09', 1, 0.8)
  const bird = bag()
  const P = (x: number, y: number): Pt => [top[0] + x * s, arrowY - 0.04 + y]
  solid(bird, [P(-0.3, 0), P(-0.34, -0.24), P(-0.2, -0.14), P(-0.04, -0.2), P(0.1, -0.34), P(0.18, -0.27), P(0.25, -0.28), P(0.2, -0.18), P(0.22, -0.06), P(0.1, 0)])
  solid(bird, [P(0.5, -0.06), P(0.62, 0.04), P(0.5, 0.12)])
  solid(bird, [P(-0.6, -0.04), P(-0.46, 0.04), P(-0.6, 0.12)])
  fill(pen, bird, '#0C0A09', 1)
}

/* ------------------------------------------------------------------ the hens */

/**
 * The barn's hens: pecking about the floor in the lantern's light; up onto the bales in a flurry as the two of them come
 * running in; and off the bales and out of the open end, low and flapping, as the hay goes up under them.
 */
const HENS: { x: number; perch: Pt; white: boolean }[] = [
  { x: S + 15.2, perch: [S + 16.7, BALES_TOP - 0.55], white: true },
  { x: S + 16.4, perch: [S + 17.6, BALES_TOP - 0.55], white: false },
  { x: S + 17.9, perch: [S + 18.4, BALES_TOP], white: true },
  { x: S + 19.2, perch: [S + 21.0, ROAD - 0.55], white: false },
]
const UP_FROM = IN_BARN - 0.45
const UP_TO = IN_BARN + 0.35
const OFF_FROM = LANTERN_DOWN + 0.05

export function drawHens(pen: Pen, t: number): void {
  if (t > OFF_FROM + 2.6) return
  const white = bag()
  const brown = bag()
  const combs = bag()
  const legs = bag()
  for (const [i, h] of HENS.entries()) {
    let x: number
    let y: number
    let face: number
    let flap = 0
    const go = OFF_FROM + 0.12 * i
    if (t < UP_FROM + 0.08 * i) {
      // Pecking about: a step this way and that, the head going down to the floor and up.
      x = h.x + 0.25 * Math.sin(t * 0.5 + i * 2.1)
      y = ROAD
      face = Math.cos(t * 0.5 + i * 2.1) > 0 ? 1 : -1
    } else if (t < go) {
      // Up onto the bales, flapping, and settled there.
      const u = smooth(t, UP_FROM + 0.08 * i, UP_TO + 0.08 * i)
      const x0 = h.x + 0.25 * Math.sin((UP_FROM + 0.08 * i) * 0.5 + i * 2.1)
      x = x0 + (h.perch[0] - x0) * u
      y = ROAD + (h.perch[1] - ROAD) * u - 0.5 * Math.sin(u * Math.PI)
      face = h.perch[0] > x0 ? 1 : -1
      flap = u < 1 ? 1 : 0.15 * Math.max(0, Math.sin(t * 9 + i))
    } else {
      // Off and out of the open end, low over the floor, the wings going.
      const s = t - go
      x = h.perch[0] - 3.4 * s - 0.6 * s * s
      y = h.perch[1] + (ROAD - 0.35 - h.perch[1]) * Math.min(1, s / 0.5) - 0.12 * Math.abs(Math.sin(s * 9))
      face = -1
      flap = 1
    }
    // Startled by the shot that takes the lantern down.
    if (t < go) flap = Math.max(flap, flash(t - LANTERN_SHOT, 0.35))
    const peck = flap === 0 && y === ROAD ? Math.max(0, Math.sin(t * 5.5 + i * 1.7)) ** 3 : 0
    const body = h.white ? white : brown
    const by = y - 0.17
    oval(body, x, by, 0.17, 0.12)
    // The tail up behind, the head up front (or down at the floor).
    solid(body, [[x - face * 0.12, by - 0.02], [x - face * 0.25, by - 0.2], [x - face * 0.2, by + 0.04]])
    const head: Pt = [x + face * (0.15 + 0.06 * peck), by - 0.13 + 0.2 * peck]
    disc(body, head[0], head[1], 0.06)
    solid(body, [[head[0] + face * 0.04, head[1] - 0.01], [head[0] + face * 0.11, head[1] + 0.015], [head[0] + face * 0.04, head[1] + 0.03]])
    disc(combs, head[0], head[1] - 0.06, 0.025)
    // A wing: folded, or beating.
    if (flap > 0) {
      const a = Math.sin(t * 28 + i * 2) * flap
      solid(body, [[x - face * 0.06, by - 0.04], [x - face * 0.02 + face * 0.05 * a, by - 0.04 - 0.28 * a], [x + face * 0.14, by - 0.02]])
    }
    if (y > ROAD - 0.01 || (flap === 0 && t < go)) {
      seg(legs, x - 0.04, by + 0.1, x - 0.05, y)
      seg(legs, x + 0.04, by + 0.1, x + 0.05, y)
    }
  }
  stroke(pen, legs, '#C49A3A', 0.9, 0.5)
  fill(pen, brown, '#7A4A28', 1)
  fill(pen, white, '#DCD3BC', 1)
  fill(pen, combs, '#B8281E', 1)
}

/* ------------------------------------------------------------------ the barn's draught */

/** Chaff sifting down off the loft's edge in the draught through the open end, lit where the lantern is. */
export function drawChaff(pen: Pen, t: number, lamp: Pt, lit: number): void {
  if (lit <= 0.01) return
  const near = bag()
  const far = bag()
  const n = 34
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, 801)
    const h2 = hash(i, 802)
    const life = 2.2 + 1.6 * h2
    const u = (((t / life + h1) % 1) + 1) % 1
    const gen = Math.floor(t / life + h1)
    const x0 = BX0 + 0.6 + (S + 19.5 - BX0 - 0.6) * hash(i, gen, 803)
    const y = ROAD - 3.2 + 3.1 * u
    const x = x0 + 0.5 * u * gust(t) + 0.12 * Math.sin(u * 7 + i)
    const a = u * 6 + i
    const len = 0.06 + 0.05 * h2
    const d = Math.hypot(x - lamp[0], (y - lamp[1]) * 0.8)
    seg(d < 1.4 ? near : far, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.5)
  }
  stroke(pen, near, '#E4C276', 0.85 * lit, 0.7)
  stroke(pen, far, '#86703A', 0.6 * lit, 0.7)
}
