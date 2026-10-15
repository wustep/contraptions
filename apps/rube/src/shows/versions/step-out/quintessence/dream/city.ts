import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { layer, onLayer, type View } from '../depth'
import { BEATS } from '../music'
import { ctxOf, rgba, type Pen } from './pen'
import { drained, T0, T1 } from './geo'
import { fireT } from './draw'

/**
 * The city behind the daydream: the night past true, on three planes behind the platform and the burning building.
 *
 * - Far (z 0.15): a big moon low in the magenta haze, the towers' silhouettes with their windows pricked out and the
 *   spires' beacons blinking, a water tower, and two searchlights sweeping the sky from behind them.
 * - Middle (z 0.35): the blocks between, their windows sodium-warm and going on and off; water towers on their
 *   roofs; the elevated line on its girders with a train crossing on the downbeats, a streak of lit windows; and under
 *   it the avenue's traffic, headlights and amber tail lights drawn out into streaks.
 * - Near (z 0.6): the dark fronts across the tracks, a fire escape, a few windows.
 *
 * Every colour goes through the pen's tone, so it all drains to grey with the rest in the last bar. Geometry that
 * never changes (the silhouettes, the windows that stay lit) is made once, in cells; what moves is drawn each frame.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera is for most of the daydream, and how close: where every plane is composed as seen. */
const ANCHOR: Pt = [3.5, -1.3]
const REF = 4.3

const K = {
  far: '#2A1D49',
  farHaze: '#6A2C62',
  mid: '#1E1539',
  near: '#1A1131',
  edge: '#3B2A5E',
  win: '#FFB45C',
  winPale: '#FFD9A0',
  sodium: '#FF9A3C',
  moon: '#F4DCC2',
  moonShade: '#E2C2AC',
  beam: '#CDBEFF',
  beacon: '#FFC46B',
  train: '#FFE2A6',
  head: '#FFF1D6',
  smoke: '#3A2944',
  smokeLit: '#C8642E',
}

interface Win {
  x: number
  y: number
  w: number
  h: number
  /** Which windows go on and off, and on what clock. */
  flick: number
  seed: number
}

interface Plane {
  z: number
  body: Path2D
  edge: Path2D
  lit: Path2D
  pale: Path2D
  /** The windows that are not lit: a shade darker than the fronts. */
  dark: Path2D
  flick: Win[]
  color: string
}

/** A rect into a path, in cells. */
const box = (p: Path2D, x0: number, y0: number, x1: number, y1: number) => p.rect(x0, y0, x1 - x0, y1 - y0)

/** A water tower on a roof at `x`, `roof`: its barrel, its cone, its legs. */
function waterTower(p: Path2D, x: number, roof: number, s: number): void {
  const w = 0.32 * s
  const legs = 0.18 * s
  const barrel = 0.3 * s
  box(p, x - w / 2, roof - legs - barrel, x + w / 2, roof - legs)
  p.moveTo(x - w / 2 - 0.02 * s, roof - legs - barrel)
  p.lineTo(x, roof - legs - barrel - 0.16 * s)
  p.lineTo(x + w / 2 + 0.02 * s, roof - legs - barrel)
  p.closePath()
  for (const dx of [-0.4, -0.05, 0.3]) box(p, x + dx * w, roof - legs, x + dx * w + 0.03 * s, roof)
  box(p, x - w / 2, roof - legs * 0.55, x + w / 2, roof - legs * 0.55 + 0.02 * s)
}

/**
 * A run of buildings from `x0` to `x1`: widths and heights from the seed, their tops between `low` and `high`, down to
 * `base`; windows in a grid of `win` cells, `lit` of them on, a few of those going on and off.
 */
function skyline(x0: number, x1: number, base: number, low: number, high: number, wmin: number, wmax: number, win: [number, number, number, number], lit: number, seed: number, hidden: number, extras: (p: Path2D, edge: Path2D, x: number, top: number, w: number, i: number) => void): Omit<Plane, 'z' | 'color'> {
  const body = new Path2D()
  const edge = new Path2D()
  const litP = new Path2D()
  const pale = new Path2D()
  const dark = new Path2D()
  const flick: Win[] = []
  const [ww, wh, gx, gy] = win
  let x = x0
  for (let i = 0; x < x1; i++) {
    const w = wmin + (wmax - wmin) * hash(i, 1, seed)
    const top = low + (high - low) * Math.pow(hash(i, 2, seed), 1.6)
    box(body, x, top, x + w + 0.004, base)
    // The lit edge on the side toward the fire.
    box(edge, x + w - 0.025, top, x + w, base)
    extras(body, edge, x, top, w, i)
    // Windows down to where the next plane forward hides this one for good.
    for (let wy = top + gy; wy < Math.min(base - gy, hidden); wy += gy) {
      for (let wx = x + (w - Math.floor((w - 0.06) / gx) * gx) / 2; wx + ww < x + w - 0.04; wx += gx) {
        const h = hash(Math.round(wx * 100), Math.round(wy * 100), seed)
        // Every window has its sill, a line of the night's light under it.
        box(edge, wx - ww * 0.1, wy + wh, wx + ww * 1.1, wy + wh + wh * 0.18)
        if (h > lit) {
          box(dark, wx, wy, wx + ww, wy + wh)
          continue
        }
        if (h < lit * 0.14) flick.push({ x: wx, y: wy, w: ww, h: wh, flick: 2.5 + 4 * hash(i, Math.round(wy * 10), seed + 1), seed: Math.round(wx * 977 + wy * 131) })
        else box(h < lit * 0.4 ? pale : litP, wx, wy, wx + ww, wy + wh)
      }
    }
    x += w
  }
  return { body, edge, lit: litP, pale, dark, flick }
}

let planes: Plane[] | null = null
/** The towers' spires, far off: [x, top]. Their beacons blink. */
const SPIRES: Pt[] = [[-1.6, -3.55], [2.35, -3.75], [6.8, -3.4]]
/** The water towers on the middle roofs. */
const TOWERS_MID: number[] = [3, 8]

function made(): Plane[] {
  if (planes) return planes
  const far = skyline(-4.5, 10.5, 1.2, -1.6, -3.3, 0.28, 0.62, [0.035, 0.05, 0.085, 0.13], 0.16, 5, -0.3, (p, _e, x, top, w, i) => {
    for (const [sx, st] of SPIRES)
      if (sx > x && sx < x + w) {
        box(p, sx - 0.05, top - 0.12, sx + 0.05, top)
        box(p, sx - 0.012, st, sx + 0.012, top - 0.1)
      }
    if (i === 9) waterTower(p, x + w * 0.5, top, 0.55)
  })
  const mid = skyline(-6, 12, 1.4, -0.45, -1.75, 0.55, 1.15, [0.055, 0.075, 0.13, 0.17], 0.24, 9, 0.1, (p, _e, x, top, w, i) => {
    if (TOWERS_MID.includes(i)) waterTower(p, x + w * 0.35, top, 0.9)
    if (i % 4 === 1) box(p, x + w * 0.6, top - 0.12, x + w * 0.85, top)
  })
  // The elevated line's girders across the middle plane, and the posts under them.
  box(mid.body, -6, -0.05, 12, 0.08)
  for (let x = -5.6; x < 12; x += 0.9) box(mid.body, x, 0.08, x + 0.06, 1.4)
  box(mid.edge, -6, -0.05, 12, -0.03)
  const near = skyline(-5.5, 3.6, 1.6, -0.2, -1.05, 0.7, 1.3, [0.08, 0.11, 0.21, 0.26], 0.1, 13, 1.6, (p, e, x, top, w, i) => {
    // A fire escape down one front: its landings and the ladders between them.
    if (i % 3 === 1)
      for (let y = top + 0.4; y < 0.9; y += 0.45) {
        box(e, x + w * 0.2, y, x + w * 0.7, y + 0.02)
        box(e, x + w * 0.2, y - 0.12, x + w * 0.2 + 0.012, y)
        box(e, x + w * 0.7 - 0.012, y - 0.12, x + w * 0.7, y)
        e.moveTo(x + w * 0.25, y + 0.02)
        e.lineTo(x + w * 0.29, y + 0.02)
        e.lineTo(x + w * 0.69, y + 0.45)
        e.lineTo(x + w * 0.65, y + 0.45)
        e.closePath()
      }
    void p
  })
  planes = [
    { z: 0.15, color: K.far, ...far },
    { z: 0.35, color: K.mid, ...mid },
    { z: 0.6, color: K.near, ...near },
  ]
  return planes
}

/* ------------------------------------------------------------------ what moves */

/** A window going on and off on its own clock. */
const winOn = (w: Win, t: number): boolean => hash(Math.floor((t + (w.seed % 7)) / w.flick), w.seed, 3) > 0.35

/** The moon, low and big behind the haze, with the haze's bands across it. */
const MOON = { x: 1.15, y: -2.85, r: 0.42 }
function moon(ctx: C2, pen: Pen, k: number): void {
  const { x, y, r } = MOON
  const halo = ctx.createRadialGradient(x * k, y * k, r * 0.9 * k, x * k, y * k, r * 2.3 * k)
  halo.addColorStop(0, rgba(pen, K.moon, 0.2))
  halo.addColorStop(0.4, rgba(pen, '#D88AA0', 0.07))
  halo.addColorStop(1, rgba(pen, '#D88AA0', 0))
  ctx.fillStyle = halo
  ctx.fillRect((x - r * 2.3) * k, (y - r * 2.3) * k, r * 4.6 * k, r * 4.6 * k)
  ctx.fillStyle = rgba(pen, K.moon, 0.88)
  ctx.beginPath()
  ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba(pen, K.moonShade, 1)
  ctx.beginPath()
  for (const [dx, dy, rr] of [[-0.35, -0.2, 0.26], [0.25, 0.15, 0.3], [0.1, -0.45, 0.13]]) {
    ctx.moveTo((x + (dx + rr) * r) * k, (y + dy * r) * k)
    ctx.ellipse((x + dx * r) * k, (y + dy * r) * k, rr * r * k, rr * r * 0.8 * k, 0, 0, Math.PI * 2)
  }
  ctx.globalAlpha = 0.5
  ctx.fill()
  ctx.globalAlpha = 1
  // The haze over its lower half, thickening.
  const haze = ctx.createLinearGradient(0, (y - r * 0.2) * k, 0, (y + r * 1.1) * k)
  haze.addColorStop(0, rgba(pen, '#6A2C62', 0))
  haze.addColorStop(1, rgba(pen, '#6A2C62', 0.75))
  ctx.fillStyle = haze
  ctx.fillRect((x - r * 1.3) * k, (y - r * 0.2) * k, r * 2.6 * k, r * 1.3 * k)
}

/** Two searchlights sweeping the sky from behind the far towers. */
function searchlights(ctx: C2, pen: Pen, k: number, t: number): void {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const [bx, by, phase, rate] of [[1.6, -1.5, 0.3, 0.33], [6.3, -1.7, 2.2, 0.27]]) {
    const a = 0.5 * Math.sin(t * rate * Math.PI * 2 * 0.5 + phase) + (bx < 3 ? -0.15 : 0.25)
    const len = 5.5
    const dx = Math.sin(a)
    const dy = -Math.cos(a)
    const nx = -dy
    const ny = dx
    const tx = bx + dx * len
    const ty = by + dy * len
    const g = ctx.createLinearGradient(bx * k, by * k, tx * k, ty * k)
    g.addColorStop(0, rgba(pen, K.beam, 0.16))
    g.addColorStop(0.5, rgba(pen, K.beam, 0.06))
    g.addColorStop(1, rgba(pen, K.beam, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((bx + nx * 0.04) * k, (by + ny * 0.04) * k)
    ctx.lineTo((tx + nx * 0.5) * k, (ty + ny * 0.5) * k)
    ctx.lineTo((tx - nx * 0.5) * k, (ty - ny * 0.5) * k)
    ctx.lineTo((bx - nx * 0.04) * k, (by - ny * 0.04) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** The bars' downbeats in the daydream: when a train sets off across the elevated line. */
const DOWNBEATS = BEATS.filter((b) => b.pos === 1 && b.t >= T0 - 1.8 && b.t < T1).map((b) => b.t)

/** The train on the elevated line: one crosses on every other downbeat, each the other way, its windows a streak. */
function train(ctx: C2, pen: Pen, k: number, t: number, inner: View): void {
  const cars = 4
  const car = 1.05
  const len = cars * car
  const span = inner.w + len + 2
  for (let i = 0; i < DOWNBEATS.length; i += 2) {
    const s = t - DOWNBEATS[i]
    const dur = 2.2
    if (s < 0 || s > dur) continue
    const dir = (i / 2) % 2 === 0 ? 1 : -1
    const u = s / dur
    const head = dir > 0 ? inner.x0 - len - 1 + span * u : inner.x1 + 1 - span * u
    const y = -0.32
    const body = new Path2D()
    const lit = new Path2D()
    for (let c = 0; c < cars; c++) {
      const x = dir > 0 ? head + c * car : head + c * car
      box(body, x + 0.02, y, x + car - 0.02, y + 0.27)
      for (let wx = x + 0.1; wx < x + car - 0.12; wx += 0.13) box(lit, wx, y + 0.06, wx + 0.08, y + 0.14)
    }
    ctx.save()
    ctx.scale(k, k)
    ctx.fillStyle = rgba(pen, '#2B1F44', 1)
    ctx.fill(body)
    ctx.fillStyle = rgba(pen, K.train, 0.95)
    ctx.fill(lit)
    ctx.restore()
    // Its light on the girders under it, and a spark off the rail at the downbeat.
    ctx.fillStyle = rgba(pen, K.train, 0.12)
    ctx.fillRect(head * k, (y + 0.27) * k, len * k, 0.12 * k)
    const spark = Math.exp(-s / 0.12)
    if (spark > 0.05) {
      const sx = dir > 0 ? head + len : head
      ctx.fillStyle = rgba(pen, '#E9E0FF', 0.8 * spark)
      ctx.beginPath()
      ctx.arc(sx * k, (y + 0.3) * k, 0.06 * k * (1 + spark), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** The avenue's traffic under the elevated line: headlights one way, amber tail lights the other, drawn out. */
function traffic(ctx: C2, pen: Pen, k: number, t: number, inner: View): void {
  const lanes: [number, number, string, number][] = [
    // [y, speed (cells a second, signed), colour, seed]
    [0.52, 2.6, K.head, 1],
    [0.6, -2.1, K.sodium, 2],
  ]
  ctx.save()
  ctx.lineCap = 'round'
  for (const [y, v, col, seed] of lanes) {
    const p = new Path2D()
    const period = 3.4
    const n = 9
    for (let i = 0; i < n; i++) {
      const x0 = hash(i, seed, 41) * period * 2
      const span = inner.w + 4
      let x = (((x0 + v * t) % span) + span) % span
      x = inner.x0 - 2 + x
      const tail = -Math.sign(v) * (0.35 + 0.25 * hash(i, seed, 42))
      p.moveTo(x * k, y * k)
      p.lineTo((x + tail) * k, y * k)
    }
    ctx.strokeStyle = rgba(pen, col, 0.75)
    ctx.lineWidth = Math.max(1, 0.035 * k)
    ctx.stroke(p)
  }
  ctx.restore()
}

/** The beacons on the spires: a slow blink, amber. */
function beacons(ctx: C2, pen: Pen, k: number, t: number): void {
  for (const [i, [x, y]] of SPIRES.entries()) {
    const on = Math.pow(0.5 + 0.5 * Math.sin(t * 2.4 + i * 2.1), 6)
    if (on < 0.05) continue
    ctx.fillStyle = rgba(pen, K.beacon, on)
    ctx.beginPath()
    ctx.arc(x * k, y * k, 0.035 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(pen, K.beacon, 0.18 * on)
    ctx.beginPath()
    ctx.arc(x * k, y * k, 0.12 * k, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ------------------------------------------------------------------ the city, drawn */

/** Where, in the world, the far towers stand solid from: the sky need only be painted above it. */
export function skyFloor(v: View): number {
  return onLayer(v, 0.15, ANCHOR, REF, [0, -1.6])[1]
}

/**
 * The city behind the platform and the building, on its three planes, at show time `t`: `fire` is how hard the
 * building burns (its light on the fronts that face it).
 */
export function drawCity(pen: Pen, v: View, t: number, fire: number): void {
  const ctx = ctxOf(pen.p)
  const all = made()
  all.forEach((plane, i) => {
    layer(ctx, v, plane.z, ANCHOR, REF, (inner) => {
      const k = inner.k
      if (i === 0) {
        moon(ctx, pen, k)
        searchlights(ctx, pen, k, t)
      }
      ctx.save()
      ctx.scale(k, k)
      ctx.fillStyle = rgba(pen, plane.color, 1)
      ctx.fill(plane.body)
      ctx.fillStyle = rgba(pen, '#0A0619', i === 0 ? 0.6 : i === 1 ? 0.7 : 0.85)
      ctx.fill(plane.dark)
      // The fronts' edges toward the fire take its light, and the more as it flares.
      ctx.fillStyle = rgba(pen, i === 2 ? '#9A5A34' : K.edge, i === 2 ? 0.35 + 0.4 * fire : 0.8)
      ctx.fill(plane.edge)
      ctx.fillStyle = rgba(pen, i === 1 ? K.sodium : K.win, i === 0 ? 0.55 : 0.85)
      ctx.fill(plane.lit)
      ctx.fillStyle = rgba(pen, K.winPale, i === 0 ? 0.5 : 0.8)
      ctx.fill(plane.pale)
      const fl = new Path2D()
      for (const w of plane.flick) if (w.x > inner.x0 - 0.2 && w.x < inner.x1 + 0.2 && winOn(w, t)) box(fl, w.x, w.y, w.x + w.w, w.y + w.h)
      ctx.fillStyle = rgba(pen, K.winPale, i === 0 ? 0.6 : 0.9)
      ctx.fill(fl)
      ctx.restore()
      if (i === 0) {
        beacons(ctx, pen, k, t)
        // The magenta haze over the far towers' feet.
        const h = ctx.createLinearGradient(0, -1.9 * k, 0, -0.35 * k)
        h.addColorStop(0, rgba(pen, K.farHaze, 0))
        h.addColorStop(1, rgba(pen, K.farHaze, 0.5))
        ctx.fillStyle = h
        ctx.fillRect((inner.x0 - 0.2) * k, -1.9 * k, (inner.w + 0.4) * k, 1.55 * k)
      }
      if (i === 1) {
        train(ctx, pen, k, t, inner)
        traffic(ctx, pen, k, t, inner)
      }
    })
    if (i === 1) drift(ctx, pen, v, t, fire)
  })
}

/**
 * The fire's smoke lying across the city lower down (z 0.45, in front of the middle blocks): long rolls drifting
 * left on the night air, thin enough to see the windows through, lit amber underneath.
 */
function drift(ctx: C2, pen: Pen, v: View, t: number, fire: number): void {
  const amount = 1 - 0.5 * drained(t)
  layer(ctx, v, 0.45, ANCHOR, REF, (inner) => {
    const k = inner.k
    const span = 16
    const body = new Path2D()
    const under = new Path2D()
    const ft = fireT(t)
    for (let i = 0; i < 12; i++) {
      const x = 9 - ((((ft * 0.22 + hash(i, 1, 61) * span) % span) + span) % span)
      const y = -2.2 - 1.3 * hash(i, 2, 61) + 0.12 * Math.sin(ft * 0.4 + i)
      const r = 0.45 + 0.5 * hash(i, 3, 61)
      if (x + r * 1.6 < inner.x0 || x - r * 1.6 > inner.x1) continue
      for (const [p, oy] of [[under, 0.18], [body, 0]] as const) {
        for (let j = 0; j < 8; j++) {
          const a = (j / 8) * Math.PI * 2
          const rr = r * (0.8 + 0.25 * Math.sin(a * 3 + i * 1.9 + ft * 0.3))
          const px = x + Math.cos(a) * rr * 1.6
          const py = y + oy * r + Math.sin(a) * rr * 0.42
          if (j) p.lineTo(px * k, py * k)
          else p.moveTo(px * k, py * k)
        }
        p.closePath()
      }
    }
    ctx.fillStyle = rgba(pen, K.smokeLit, (0.05 + 0.08 * fire) * amount)
    ctx.fill(under)
    ctx.fillStyle = rgba(pen, K.smoke, 0.24 * amount)
    ctx.fill(body)
  })
}

/**
 * Smoke from the burning roof going away over the city, behind the building (z 0.75): big soft rolls drifting left
 * and up, lit amber from under by the fire.
 */
export function drawPlumes(pen: Pen, v: View, t: number, fire: number, amount: number): void {
  if (amount <= 0.01) return
  const ctx = ctxOf(pen.p)
  layer(ctx, v, 0.75, ANCHOR, REF, (inner) => {
    const k = inner.k
    const under = new Path2D()
    const body = new Path2D()
    for (let i = 0; i < 9; i++) {
      const age = (t * 0.06 + i / 9 + hash(i, 5) * 0.1) % 1
      const x = 5.2 - age * 7.5 + Math.sin(age * 3 + i) * 0.4
      const y = -6.3 - age * 2.6 + Math.sin(age * 5 + i * 2) * 0.25
      const r = 0.7 + age * 1.6
      if (x + r * 1.3 < inner.x0 || x - r * 1.3 > inner.x1 || y + r < inner.y0 || y - r > inner.y1) continue
      for (const [p, oy] of [[under, 0.22], [body, 0]] as const) {
        const pts: Pt[] = Array.from({ length: 7 }, (_, j) => {
          const a = (j / 7) * Math.PI * 2
          const rr = r * (0.82 + 0.22 * Math.sin(a * 3 + i * 1.7 + age * 4))
          return [x + Math.cos(a) * rr * 1.3, y + oy * r + Math.sin(a) * rr * 0.6]
        })
        pts.forEach(([px, py], j) => (j ? p.lineTo(px * k, py * k) : p.moveTo(px * k, py * k)))
        p.closePath()
      }
    }
    ctx.fillStyle = rgba(pen, K.smokeLit, (0.1 + 0.12 * fire) * amount)
    ctx.fill(under)
    ctx.fillStyle = rgba(pen, K.smoke, 0.38 * amount)
    ctx.fill(body)
  })
}
