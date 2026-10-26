import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash, smooth, type Ctx } from '../kit'
import { DUST } from '../worlds'
import { groundAt, type Day } from './light'

/**
 * The farm's far distance, behind the machine: what the sky draws between the horizon and the near ground. Each
 * layer has a depth `q` (0 is the horizon, 1 the machine's own plane): it moves `q` of the camera's move across, and
 * it stands that far down the land from the horizon toward the near ground. Far things are paler (the dust between),
 * smaller and inked lighter.
 *
 *   the dust wall      the storm on the horizon, growing over the act into a towering wall behind the launch
 *   farmsteads         a house, a barn, trees, now and then a windmill turning or a grain elevator
 *   the freight        a slow train along the far line in the morning
 *   crows              a flock now and then, crossing
 *   NASA's base        past the dam: a hangar, a water tower, a radar dish turning, fuel tanks, a blockhouse, a
 *                      service road with the crews' trucks pulling back from the pad, and floodlight masts
 *
 * Everything is a function of show time and the frame, so a seek lands on the same distance.
 */

export interface Far {
  p: p5
  c: Ctx
  ctx: CanvasRenderingContext2D
  f: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }
  /** The horizon, in world cells, in this frame. */
  hy: number
  day: Day
  /** How far up the camera has gone (0 on the ground, 1 high): the far land thins as the rocket climbs. */
  up: number
}

/** The world x a layer of depth `q` puts its own x at, in this frame. */
const at = (F: Far, q: number, x: number) => x + F.f.cx * (1 - q)
/** Its own x for a world x it should have when the camera's middle is at `cx`. */
const placed = (q: number, world: number, cx: number) => world - cx * (1 - q)
/** Where a layer of depth `q` meets the ground: down the land from the horizon toward the near ground. */
export const groundOf = (F: Far, q: number) => F.hy + (groundAt(F.f.cx) - F.hy) * q ** 1.4

/** The dust between: a far colour mixed toward the low sky by how far it is. */
const haze = (F: Far, hex: string, q: number) => mixHex(hex, F.day.low, 0.62 * (1 - q) ** 1.2)

/* ------------------------------------------------------------------ the dust wall */

interface Band {
  q: number
  seed: number
  size: number
  drift: number
  lift: number
  body: string
  lit: string
  foot: string
  ink: number
}

/** Behind to in front: a paler, taller wall far off, and a darker, lower one rolling in front of it. */
const BANDS: Band[] = [
  { q: 0.15, seed: 5, size: 1.25, drift: -0.025, lift: 1.12, body: '#CBA478', lit: '#E8C99A', foot: '#B68C62', ink: 0.18 },
  { q: 0.22, seed: 9, size: 0.95, drift: -0.05, lift: 0.66, body: '#AE8159', lit: '#D8A973', foot: '#87603F', ink: 0.32 },
]

/** The wall's height at its tallest, cells: a low bank in the morning, a storm by the launch. */
export const wallAt = (t: number) => {
  const s = smooth(t, 40, 86)
  return 0.32 + 3.5 * s ** 2.6
}

/**
 * The dust wall: billows over a body, each band inked once round its whole outline, the low sun catching the
 * billows' tops on its side, their feet in shade, and curls of dust rolling inside the big ones. It is lowest on the
 * sun's side, and towers behind the launch.
 */
export function dustWall(F: Far): void {
  const { p, c, ctx, f, hy, day, up } = F
  const { k, t, ink, weight } = c
  const X = (x: number) => x * k
  const top = wallAt(t)
  const thin = 1 - 0.35 * up
  for (const B of BANDS) {
    const shift = f.cx * (1 - B.q)
    // Taller behind the launch tower; its line across (in the band's own x) at the launch.
    const mid = 110 * B.q
    const height = (wx: number) =>
      top * B.lift * (0.34 + 0.66 * smooth(wx, mid - 5, mid + 3)) *
      (0.74 + 0.12 * Math.sin(wx * 0.33 + B.seed) + 0.08 * Math.sin(wx * 0.91 + B.seed * 2) + 0.3 * Math.max(0, Math.sin(wx * 0.21 + B.seed * 3)) ** 3)
    const near = smooth(top, 0.4, 2.2)
    const body = mixHex(B.body, day.low, 0.6 * (1 - near))
    const lit = mixHex(B.lit, day.low, 0.55 * (1 - near))
    const foot = mixHex(B.foot, day.low, 0.6 * (1 - near))
    const step = 0.42 * B.size
    const x0 = Math.floor(f.x0) - 2
    const x1 = Math.ceil(f.x1) + 2
    const i0 = Math.floor((x0 - shift - t * B.drift) / step) - 3
    const i1 = Math.ceil((x1 - shift - t * B.drift) / step) + 3
    const puffs: { x: number; y: number; r: number; i: number }[] = []
    for (let i = i0; i <= i1; i++) {
      const wx = i * step + t * B.drift + (hash(i, B.seed, 2) - 0.5) * step * 0.7
      const h = height(wx)
      // A few big domes heaped high, and smaller billows between them, lower down: an uneven skyline, not a hedge.
      const big = hash(i, B.seed, 4) > 0.7
      const grow = 0.4 + 0.42 * Math.min(1.8, h)
      const r = (big ? 0.44 + 0.24 * hash(i, B.seed) : 0.17 + 0.13 * hash(i, B.seed, 5)) * B.size * grow * (1 + 0.06 * Math.sin(t * 0.5 + i * 1.7))
      const y = (big ? hy - h + r * 0.5 : hy - h * 0.84 + r * 0.95) + 0.05 * Math.sin(t * 0.33 + i)
      puffs.push({ x: wx + shift, y, r, i })
    }
    // The body under the billows: from the horizon up to under their centres.
    const bodyPath = (grow: number) => {
      ctx.moveTo(X(x0), X(hy + 0.05 + grow))
      for (const q of puffs) ctx.lineTo(X(q.x), X(q.y + q.r * 0.2 - grow))
      ctx.lineTo(X(x1), X(hy + 0.05 + grow))
      ctx.closePath()
      for (const q of puffs) {
        ctx.moveTo(X(q.x + q.r + grow), X(q.y))
        ctx.arc(X(q.x), X(q.y), X(q.r + grow), 0, Math.PI * 2)
      }
    }
    ctx.save()
    ctx.globalAlpha = thin
    // Inked once round the whole band: all of it a hair bigger in ink, then the body over it.
    ctx.beginPath()
    bodyPath(Math.max(0.012, (weight * 0.6) / k))
    ctx.fillStyle = alpha(p, ink, B.ink * (0.4 + 0.6 * near)).toString()
    ctx.fill()
    ctx.beginPath()
    bodyPath(0)
    ctx.fillStyle = body
    ctx.fill()
    // The low sun on the billows' tops, from its side (the left).
    ctx.beginPath()
    for (const q of puffs) {
      const r = q.r * 0.76
      ctx.moveTo(X(q.x - q.r * 0.16 + r), X(q.y - q.r * 0.17))
      ctx.arc(X(q.x - q.r * 0.16), X(q.y - q.r * 0.17), X(r), 0, Math.PI * 2)
    }
    ctx.fillStyle = alpha(p, lit, 0.35 + 0.5 * day.warm).toString()
    ctx.fill()
    // And the body again over the lit discs' lower right, so each lit cap is a crescent on its billow, not a disc.
    ctx.beginPath()
    for (const q of puffs) {
      const r = q.r * 0.8
      ctx.moveTo(X(q.x + q.r * 0.12 + r), X(q.y + q.r * 0.14))
      ctx.arc(X(q.x + q.r * 0.12), X(q.y + q.r * 0.14), X(r), 0, Math.PI * 2)
    }
    ctx.fillStyle = body
    ctx.fill()
    // Its foot, in the shade of itself, ragged.
    ctx.beginPath()
    ctx.moveTo(X(x0), X(hy + 0.05))
    for (let x = x0; x <= x1; x += 0.4) {
      const wx = x - shift
      ctx.lineTo(X(x), X(hy - height(wx) * 0.3 - 0.06 * Math.sin(wx * 2.3 + t * 0.6)))
    }
    ctx.lineTo(X(x1), X(hy + 0.05))
    ctx.closePath()
    ctx.fillStyle = alpha(p, foot, 0.55 + 0.3 * near).toString()
    ctx.fill()
    ctx.restore()
    // Curls of dust rolling inside the big billows: a stroke of ink a third of the way round, turning slowly.
    if (near > 0.2) {
      p.noFill()
      p.stroke(alpha(p, ink, 0.13 * near * thin))
      p.strokeWeight(Math.max(0.7, weight * 0.45))
      for (const q of puffs) {
        if (q.r < 0.3) continue
        const a0 = t * (0.18 + 0.12 * hash(q.i, B.seed, 6)) + hash(q.i, B.seed, 7) * 6
        p.arc(X(q.x + q.r * 0.1), X(q.y + q.r * 0.12), X(q.r * 1.05), X(q.r * 1.05), a0, a0 + 1.7)
      }
    }
  }
}

/* ------------------------------------------------------------------ farmsteads */

const STEADS = 0.27
const STEAD_SPAN = 5.3

/** Farmsteads along the far line: a house and a barn under trees, some with a windmill turning, one in a few a grain elevator. */
export function farmsteads(F: Far): void {
  const { p, c, f, up } = F
  const { k, t, ink, weight } = c
  if (up > 0.95) return
  const X = (x: number) => x * k
  const gy = groundOf(F, STEADS)
  const fill = haze(F, DUST.shade, STEADS)
  const roof = haze(F, DUST.rust, STEADS)
  const tree = haze(F, DUST.leaf, STEADS)
  const dark = haze(F, mixHex(ink, DUST.wood, 0.3), STEADS)
  const line = alpha(p, ink, 0.32 * (1 - up))
  const w = Math.max(0.6, weight * 0.45)
  const first = Math.floor((f.x0 - at(F, STEADS, 0)) / STEAD_SPAN) - 1
  const last = Math.ceil((f.x1 - at(F, STEADS, 0)) / STEAD_SPAN) + 1
  for (let i = first; i <= last; i++) {
    const kind = hash(i, 301)
    if (kind > 0.78) continue
    const x = at(F, STEADS, i * STEAD_SPAN + hash(i, 302) * 2.2)
    p.stroke(line)
    p.strokeWeight(w)
    if (kind > 0.62) {
      // A grain elevator: a tall head house over a row of bins.
      p.fill(fill)
      p.rect(X(x), X(gy - 0.42), X(0.22), X(0.84))
      p.rect(X(x), X(gy - 0.93), X(0.12), X(0.18))
      for (let j = 0; j < 3; j++) p.rect(X(x + 0.2 + j * 0.13), X(gy - 0.25), X(0.12), X(0.5), X(0.04), X(0.04), 0, 0)
      continue
    }
    // Trees behind, a barn, a house.
    p.fill(tree)
    for (let j = 0; j < 2 + Math.floor(hash(i, 303) * 2); j++) p.circle(X(x - 0.22 + j * 0.16), X(gy - 0.2 - 0.04 * j), X(0.24 + 0.06 * hash(i, j, 304)))
    p.fill(dark)
    p.beginShape()
    p.vertex(X(x + 0.04), X(gy))
    p.vertex(X(x + 0.04), X(gy - 0.2))
    p.vertex(X(x + 0.12), X(gy - 0.3))
    p.vertex(X(x + 0.28), X(gy - 0.3))
    p.vertex(X(x + 0.36), X(gy - 0.2))
    p.vertex(X(x + 0.36), X(gy))
    p.endShape(p.CLOSE)
    p.fill(fill)
    p.rect(X(x - 0.15), X(gy - 0.08), X(0.22), X(0.16))
    p.fill(roof)
    p.triangle(X(x - 0.28), X(gy - 0.16), X(x - 0.15), X(gy - 0.27), X(x - 0.02), X(gy - 0.16))
    // Half of them have a windmill, turning in the wind.
    if (hash(i, 305) > 0.45) {
      const mx = x + 0.55
      const hub = gy - 0.58
      p.noFill()
      p.line(X(mx - 0.06), X(gy), X(mx), X(hub))
      p.line(X(mx + 0.06), X(gy), X(mx), X(hub))
      const a0 = t * (1.6 + 1.2 * hash(i, 306))
      for (let j = 0; j < 8; j++) {
        const a = a0 + (j * Math.PI) / 4
        p.line(X(mx), X(hub), X(mx + 0.11 * Math.cos(a)), X(hub + 0.11 * Math.sin(a)))
      }
      p.line(X(mx), X(hub), X(mx + 0.16), X(hub + 0.01))
    }
  }
}

/* ------------------------------------------------------------------ the freight */

const RAIL = 0.33

/** A freight train along the far line in the morning, slower than the camera, the locomotive's exhaust trailing. */
export function freight(F: Far): void {
  const { p, c, f } = F
  const { k, t, ink, weight } = c
  if (t < 17 || t > 40) return
  const X = (x: number) => x * k
  const gy = groundOf(F, RAIL)
  const seen = smooth(t, 17, 18.5) * (1 - smooth(t, 38, 40))
  // The rails.
  p.stroke(alpha(p, ink, 0.22 * seen))
  p.strokeWeight(Math.max(0.6, weight * 0.4))
  p.line(X(f.x0), X(gy), X(f.x1), X(gy))
  // The head comes in from the right as the yard opens and heads off left, at a slow freight's pace.
  const head = at(F, RAIL, 6.6 - 0.27 * (t - 18))
  const car = 0.25
  // Far off, so all of a colour with the dust: the engine darker, boxcars and a few tank cars in one weathered brown.
  const engine = mixHex(haze(F, mixHex(DUST.rust, ink, 0.3), RAIL), F.day.low, 0.25)
  const box = mixHex(haze(F, mixHex(DUST.wood, DUST.rust, 0.4), RAIL), F.day.low, 0.3)
  const roof = mixHex(haze(F, mixHex(DUST.wood, ink, 0.4), RAIL), F.day.low, 0.3)
  p.stroke(alpha(p, ink, 0.28 * seen))
  p.strokeWeight(Math.max(0.6, weight * 0.35))
  for (let j = 0; j < 20; j++) {
    const x = head + j * (car + 0.025)
    if (x > f.x1 + 0.5 || x < f.x0 - 0.5) continue
    const y = gy - 0.012
    if (j === 0) {
      p.fill(alpha(p, engine, seen))
      p.rect(X(x + car / 2), X(y - 0.04), X(car), X(0.08))
      p.rect(X(x + 0.05), X(y - 0.1), X(0.08), X(0.05))
    } else if (hash(j, 311) > 0.72) {
      // A tank car: a rounded drum on a flat.
      p.fill(alpha(p, roof, seen))
      p.rect(X(x + car / 2), X(y - 0.04), X(car * 0.92), X(0.065), X(0.03))
    } else {
      p.fill(alpha(p, box, seen))
      p.rect(X(x + car / 2), X(y - 0.04), X(car), X(0.075))
      p.noStroke()
      p.fill(alpha(p, roof, seen))
      p.rect(X(x + car / 2), X(y - 0.073), X(car), X(0.012))
      p.stroke(alpha(p, ink, 0.28 * seen))
    }
  }
  // Its exhaust: low puffs strung back over the cars, lifting and thinning.
  p.noStroke()
  for (let j = 0; j < 9; j++) {
    const age = j * 0.55 + ((t * 2) % 0.55)
    const x = head + 0.07 + age * 0.36
    const y = gy - 0.15 - age * 0.05
    p.fill(alpha(p, haze(F, DUST.bone, RAIL), 0.35 * seen * (1 - age / 5)))
    p.ellipse(X(x), X(y), X(0.1 + age * 0.06), X(0.05 + age * 0.022))
  }
}

/* ------------------------------------------------------------------ crows */

interface Flock {
  t0: number
  t1: number
  /** Its own x at t0 (depth 0.5), and its pace (cells a second, + to the right). */
  x0: number
  v: number
  /** Its height over the horizon, and how many. */
  up: number
  n: number
  seed: number
}

const BIRDS = 0.5
/** Placed by where the camera is when each one comes in (`placed`), so it crosses the frame. */
const FLOCKS: Flock[] = [
  { t0: 19, t1: 28, x0: placed(BIRDS, -5, 11), v: 2.0, up: 1.6, n: 5, seed: 1 },
  { t0: 55.5, t1: 65, x0: placed(BIRDS, 6, 80.4), v: -1.2, up: 1.5, n: 7, seed: 2 },
  { t0: 65.5, t1: 73, x0: placed(BIRDS, -6, 95), v: 3.2, up: 1.3, n: 4, seed: 3 },
  // Ahead of the storm, away from it: a bigger flock over the countdown.
  { t0: 76.5, t1: 87, x0: placed(BIRDS, 9.5, 110), v: -1.7, up: 2.3, n: 11, seed: 4 },
]

export function crows(F: Far): void {
  const { p, c, hy, up } = F
  const { k, t, ink, weight } = c
  const X = (x: number) => x * k
  p.noFill()
  p.strokeCap(p.ROUND)
  for (const fl of FLOCKS) {
    if (t < fl.t0 || t > fl.t1) continue
    const seen = smooth(t, fl.t0, fl.t0 + 0.4) * (1 - smooth(t, fl.t1 - 0.4, fl.t1)) * (1 - up)
    p.stroke(alpha(p, mixHex(ink, F.day.low, 0.25), 0.85 * seen))
    p.strokeWeight(Math.max(0.8, weight * 0.55))
    const lead = at(F, BIRDS, fl.x0 + fl.v * (t - fl.t0))
    const dir = Math.sign(fl.v)
    for (let j = 0; j < fl.n; j++) {
      // A loose skein: each bird its own place behind the lead, wandering a little.
      const bx = lead - dir * (j * 0.28 + hash(j, fl.seed, 1) * 0.35) + 0.08 * Math.sin(t * 0.9 + j * 2.1)
      const by = hy - fl.up + (hash(j, fl.seed, 2) - 0.5) * 0.7 + 0.06 * Math.sin(t * 1.3 + j)
      const s = 0.07 + 0.03 * hash(j, fl.seed, 3)
      const flap = Math.sin(t * (8 + 3 * hash(j, fl.seed, 4)) + j * 1.9)
      // Two wings, each bent at the wrist: up on the stroke, down and swept on the beat.
      const lift = s * (0.15 + 0.55 * flap)
      p.beginShape()
      p.vertex(X(bx - s), X(by - lift))
      p.vertex(X(bx - s * 0.45), X(by - lift * 0.35 - s * 0.12))
      p.vertex(X(bx), X(by))
      p.vertex(X(bx + s * 0.45), X(by - lift * 0.35 - s * 0.12))
      p.vertex(X(bx + s), X(by - lift))
      p.endShape()
    }
  }
}

/* ------------------------------------------------------------------ NASA's base */

/** The base's things, each at its depth, by the world x it stands at when the camera is over the launch (110) or the fence (95). */
const HANGAR = { q: 0.3, x: placed(0.3, 116.8, 110) }
const WATER = { q: 0.38, x: placed(0.38, 99.2, 95) }
const RADAR = { q: 0.45, x: placed(0.45, 103.0, 110) }
const TANKS = { q: 0.55, x: placed(0.55, 114.2, 110) }
const BLOCK = { q: 0.6, x: placed(0.6, 117.9, 110) }
const ROAD = 0.62
const MASTS = [
  { q: 0.7, x: placed(0.7, 101.6, 95), on: 70.4 },
  { q: 0.7, x: placed(0.7, 106.0, 110), on: 74.0 },
  { q: 0.7, x: placed(0.7, 116.2, 110), on: 74.6 },
]

/** The crews' trucks, pulling back from the pad down the service road as the countdown runs, each raising its dust. */
const CREW = [
  { t0: 71.0, x: placed(ROAD, 113.4, 110), v: 1.15, color: DUST.bone, tank: false },
  { t0: 73.4, x: placed(ROAD, 112.8, 110), v: 0.95, color: DUST.corn, tank: true },
  { t0: 76.8, x: placed(ROAD, 113.0, 110), v: 1.3, color: DUST.bone, tank: false },
]

export function base(F: Far): void {
  const { p, c, f, up } = F
  const { k, t, ink, weight } = c
  if (f.cx < 76 || up > 0.98) return
  const X = (x: number) => x * k
  const w = Math.max(0.7, weight * 0.6)
  const line = (q: number) => alpha(p, ink, (0.25 + 0.5 * q) * (1 - up))
  const seen = (x: number, half: number) => x + half > f.x0 && x - half < f.x1

  // The hangar: a tall shed with its great door, the base's stripe along its top.
  {
    const x = at(F, HANGAR.q, HANGAR.x)
    const gy = groundOf(F, HANGAR.q)
    if (seen(x, 1.6)) {
      p.stroke(line(HANGAR.q))
      p.strokeWeight(w * 0.7)
      p.fill(haze(F, DUST.bone, HANGAR.q))
      p.rect(X(x), X(gy - 0.68), X(2.3), X(1.36))
      p.fill(haze(F, DUST.shade, HANGAR.q))
      p.rect(X(x + 1.3), X(gy - 0.5), X(0.5), X(1.0))
      p.fill(haze(F, DUST.denim, HANGAR.q))
      p.rect(X(x - 0.2), X(gy - 1.3), X(1.9), X(0.08))
      // The door, in its vertical leaves.
      p.fill(haze(F, mixHex(DUST.shade, ink, 0.2), HANGAR.q))
      p.rect(X(x - 0.25), X(gy - 0.5), X(0.9), X(1.0))
      for (let j = 1; j < 4; j++) p.line(X(x - 0.7 + j * 0.225), X(gy - 1.0), X(x - 0.7 + j * 0.225), X(gy))
    }
  }
  // The water tower: a tank under a cone, on four legs.
  {
    const x = at(F, WATER.q, WATER.x)
    const gy = groundOf(F, WATER.q)
    if (seen(x, 0.6)) {
      p.stroke(line(WATER.q))
      p.strokeWeight(w * 0.7)
      p.noFill()
      for (const dx of [-0.2, -0.07, 0.07, 0.2]) p.line(X(x + dx), X(gy), X(x + dx * 0.6), X(gy - 0.78))
      p.line(X(x - 0.17), X(gy - 0.4), X(x + 0.17), X(gy - 0.4))
      p.fill(haze(F, DUST.bone, WATER.q))
      p.rect(X(x), X(gy - 0.98), X(0.46), X(0.38), X(0.04))
      p.fill(haze(F, DUST.denim, WATER.q))
      p.rect(X(x), X(gy - 1.12), X(0.46), X(0.07))
      p.fill(haze(F, DUST.shade, WATER.q))
      p.triangle(X(x - 0.25), X(gy - 1.17), X(x), X(gy - 1.36), X(x + 0.25), X(gy - 1.17))
    }
  }
  // The radar: a lattice mast and a dish turning on it, sweeping round once every few seconds.
  {
    const x = at(F, RADAR.q, RADAR.x)
    const gy = groundOf(F, RADAR.q)
    if (seen(x, 0.6)) {
      p.stroke(line(RADAR.q))
      p.strokeWeight(w * 0.75)
      p.noFill()
      const top = gy - 0.95
      p.line(X(x - 0.2), X(gy), X(x - 0.05), X(top))
      p.line(X(x + 0.2), X(gy), X(x + 0.05), X(top))
      for (let j = 1; j < 4; j++) {
        const y = gy - (j * 0.95) / 4
        const hw = 0.2 - (0.15 * j) / 4
        p.line(X(x - hw), X(y), X(x + hw), X(y - 0.95 / 4))
      }
      // The dish, side on: a shallow bowl tipped up at the sky, its rim foreshortened as it turns, the feed on a strut.
      const turn = t * 1.05
      const face = Math.cos(turn)
      const side = Math.sin(turn)
      const rim = 0.2
      const deep = 0.07 + 0.05 * Math.abs(face)
      p.push()
      p.translate(X(x), X(top - 0.08))
      p.rotate(-0.5 + 0.25 * side)
      const dish = haze(F, mixHex(DUST.shade, ink, 0.25), RADAR.q)
      p.fill(face > 0 ? haze(F, DUST.bone, RADAR.q) : dish)
      p.beginShape()
      p.vertex(X(-rim), 0)
      p.bezierVertex(X(-rim * 0.5), X(deep * 1.6), X(rim * 0.5), X(deep * 1.6), X(rim), 0)
      // The rim's near edge, a thin ellipse's half: wider as it turns toward us.
      p.bezierVertex(X(rim * 0.5), X(-0.09 * Math.abs(face)), X(-rim * 0.5), X(-0.09 * Math.abs(face)), X(-rim), 0)
      p.endShape(p.CLOSE)
      p.noFill()
      p.line(0, X(deep * 1.1), X(0.03 * side), X(-0.2))
      p.pop()
    }
  }
  // Fuel tanks: two long cylinders on saddles, a pipe run off toward the pad.
  {
    const x = at(F, TANKS.q, TANKS.x)
    const gy = groundOf(F, TANKS.q)
    if (seen(x, 1.4)) {
      p.stroke(alpha(p, ink, 0.6 * (1 - up)))
      p.strokeWeight(w * 0.8)
      for (const [dx, dy] of [[0, 0], [0.35, 0.12]] as [number, number][]) {
        const cy = gy + dy - 0.26
        // Saddles under, then the tank: flat ends, two weld bands, a stripe, a ladder up its end.
        p.fill(haze(F, mixHex(DUST.shade, ink, 0.35), TANKS.q))
        for (const sx of [-0.33, 0.33]) p.quad(X(x + dx + sx - 0.07), X(gy + dy), X(x + dx + sx - 0.04), X(cy + 0.1), X(x + dx + sx + 0.04), X(cy + 0.1), X(x + dx + sx + 0.07), X(gy + dy))
        p.fill(haze(F, DUST.bone, TANKS.q))
        p.rect(X(x + dx), X(cy), X(1.1), X(0.28), X(0.05))
        p.fill(haze(F, DUST.rust, TANKS.q))
        p.rect(X(x + dx), X(cy + 0.03), X(1.1), X(0.05))
        p.noFill()
        for (const bx of [-0.3, 0.3]) p.line(X(x + dx + bx), X(cy - 0.14), X(x + dx + bx), X(cy + 0.14))
      }
      p.noFill()
      p.line(X(x - 0.55), X(gy - 0.1), X(x - 1.6), X(gy - 0.1))
      p.line(X(x - 1.6), X(gy - 0.1), X(x - 1.6), X(gy + 0.04))
    }
  }
  // The blockhouse: low and thick, slits of light, an antenna mast and a wind sock standing out in the storm's wind.
  {
    const x = at(F, BLOCK.q, BLOCK.x)
    const gy = groundOf(F, BLOCK.q)
    if (seen(x, 1.0)) {
      p.stroke(line(BLOCK.q))
      p.strokeWeight(w * 0.85)
      p.fill(haze(F, DUST.shade, BLOCK.q))
      p.beginShape()
      p.vertex(X(x - 0.55), X(gy))
      p.vertex(X(x - 0.45), X(gy - 0.42))
      p.vertex(X(x + 0.45), X(gy - 0.42))
      p.vertex(X(x + 0.55), X(gy))
      p.endShape(p.CLOSE)
      const lit = smooth(t, 69, 70)
      p.fill(mixHex(haze(F, mixHex(DUST.shade, ink, 0.4), BLOCK.q), '#FFE7A0', lit))
      for (const dx of [-0.25, 0, 0.25]) p.rect(X(x + dx), X(gy - 0.27), X(0.14), X(0.05))
      p.noFill()
      p.line(X(x + 0.3), X(gy - 0.42), X(x + 0.3), X(gy - 1.25))
      p.line(X(x + 0.18), X(gy - 1.05), X(x + 0.42), X(gy - 1.05))
      p.line(X(x + 0.22), X(gy - 1.18), X(x + 0.38), X(gy - 1.18))
      // The sock: on its pole, out downwind and lifting as the wind gets up, flapping.
      const sx = x - 0.4
      const sy = gy - 0.9
      p.line(X(sx), X(gy - 0.42), X(sx), X(sy))
      const blow = smooth(t, 58, 76)
      const droop = 0.32 * (1 - blow) + 0.04
      const flap = 0.04 * Math.sin(t * 7) * blow
      p.fill(haze(F, DUST.rust, BLOCK.q))
      p.quad(X(sx), X(sy - 0.04), X(sx - 0.34), X(sy + droop - 0.03 + flap), X(sx - 0.33), X(sy + droop + 0.02 + flap), X(sx), X(sy + 0.05))
    }
  }
  // The service road, and the crews' trucks pulling back down it from the pad, each with its plume of dust.
  {
    const gy = groundOf(F, ROAD)
    // A pale strip of graded dirt, soft at its edges: a ruled ink line here ran across the whole base as a seam.
    {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const road = haze(F, DUST.bone, ROAD)
      const rgb = [1, 3, 5].map((i) => parseInt(road.slice(i, i + 2), 16)).join(', ')
      const a = 0.4 * (1 - up)
      const g = ctx.createLinearGradient(0, X(gy - 0.03), 0, X(gy + 0.07))
      g.addColorStop(0, `rgba(${rgb}, 0)`)
      g.addColorStop(0.5, `rgba(${rgb}, ${a})`)
      g.addColorStop(1, `rgba(${rgb}, 0)`)
      ctx.fillStyle = g
      ctx.fillRect(X(f.x0 - 1), X(gy - 0.03), X(f.x1 - f.x0 + 2), X(0.1))
    }
    for (const cr of CREW) {
      if (t < cr.t0 - 2) continue
      // Off from rest, at its own pace.
      const go = t - cr.t0
      const run = go <= 0 ? 0 : go < 1.2 ? (cr.v * go * go) / 2.4 : cr.v * (go - 0.6)
      const x = at(F, ROAD, cr.x + run)
      if (!seen(x, 4)) continue
      // The plume: puffs left along the road as it went, rising and thinning, blown downwind.
      p.noStroke()
      for (let m = 0; m < 10; m++) {
        const age = m * 0.4 + (go > 0 ? go % 0.4 : 0)
        if (go - age < 0) continue
        const back = cr.v * Math.min(age, Math.max(0, go - 0.6))
        const px = x - back - 0.3 - age * 0.3
        const py = gy - 0.06 - age * 0.06
        p.fill(alpha(p, mixHex(haze(F, '#B98F5E', ROAD), F.day.low, 0.2), 0.3 * (1 - age / 4)))
        p.ellipse(X(px), X(py), X(0.32 + age * 0.3), X(0.08 + age * 0.05))
      }
      p.stroke(line(ROAD))
      p.strokeWeight(w * 0.7)
      p.fill(haze(F, cr.color, ROAD))
      if (cr.tank) {
        p.rect(X(x - 0.12), X(gy - 0.13), X(0.42), X(0.16), X(0.07))
        p.rect(X(x + 0.17), X(gy - 0.12), X(0.15), X(0.2))
      } else {
        p.rect(X(x), X(gy - 0.12), X(0.46), X(0.2), X(0.03))
        p.fill(haze(F, mixHex(DUST.shade, ink, 0.3), ROAD))
        p.rect(X(x + 0.13), X(gy - 0.17), X(0.12), X(0.06))
      }
      p.fill(haze(F, ink, ROAD))
      for (const dx of [-0.13, 0.15]) p.circle(X(x + dx), X(gy + 0.0), X(0.09))
    }
  }
  // The floodlight masts: a lattice and a bank of lamps on top, coming on as the light goes, lighting the pad.
  for (const m of MASTS) {
    const x = at(F, m.q, m.x)
    const gy = groundOf(F, m.q)
    if (!seen(x, 1.2)) continue
    const top = gy - 2.3
    const on = smooth(t, m.on, m.on + 0.25)
    p.stroke(line(m.q))
    p.strokeWeight(w * 0.8)
    p.noFill()
    p.line(X(x - 0.13), X(gy), X(x - 0.04), X(top))
    p.line(X(x + 0.13), X(gy), X(x + 0.04), X(top))
    for (let j = 0; j < 6; j++) {
      const y0 = gy - (j * 2.3) / 6
      const y1 = gy - ((j + 1) * 2.3) / 6
      const h0 = 0.13 - (0.09 * j) / 6
      const h1 = 0.13 - (0.09 * (j + 1)) / 6
      p.line(X(x - h0), X(y0), X(x + h1), X(y1))
    }
    // Its light, falling on the ground in front of it: a flat pool, no beam through the air.
    if (on > 0.01) {
      p.noStroke()
      p.fill(alpha(p, '#FFE6B0', 0.16 * on * (1 - up)))
      p.ellipse(X(x), X(gy + 0.06), X(1.3), X(0.14))
    }
    p.stroke(line(m.q))
    p.fill(haze(F, DUST.shade, m.q))
    p.rect(X(x), X(top - 0.08), X(0.5), X(0.24), X(0.02))
    for (let r = 0; r < 2; r++) {
      for (let j = 0; j < 3; j++) {
        p.fill(on > 0.5 ? '#FFE7A0' : haze(F, mixHex(DUST.shade, ink, 0.5), m.q))
        p.rect(X(x - 0.15 + j * 0.15), X(top - 0.14 + r * 0.12), X(0.11), X(0.08))
      }
    }
  }
}
