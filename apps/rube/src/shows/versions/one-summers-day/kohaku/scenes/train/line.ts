import type { Light } from '../../light'
import { box, circle, ellipse, fill, hash, ink, lit, mix, poly, rgba, smooth, sway, type Paint, type Pt } from '../../paint'
import { SEA_Y } from '../../geo'
import { reflect, waterline } from '../../world/sea'
import { BENCH_Y, CAR, HALT_TOP, LANDING, STATION, carX, doorOpen } from './plan'
import { HALT } from '../../geo'

/**
 * The railway over the sea and its one car: the posts and the wire along the line, the car (its far wall and bench and
 * the shadow passengers seen through its windows, its near wall over them), the platforms it stops at, and the girl
 * on the lonely station's.
 *
 * The car is an old single tram: dark green below, cream at its windows, a grey roof with its pantograph up to the
 * wire. Its far windows show the real sea and sky behind it. By day its windows are glass; from dusk its lamps are lit
 * and the windows warm, and the water under it gives them back.
 */

const BODY = '#2E5866'
const BODY_DARK = '#1F3C47'
const CREAM = '#E9DEC3'
const ROOF = '#6C6E72'
const STRIPE = '#A8432F'
const INSIDE = '#D9C7A0'
const SEAT = '#6B3A2E'
const LINE = '#1B1F24'
const LAMP = '#F4C67C'

/** The wire's height over the water, and how far apart the posts carrying it stand. */
export const WIRE_Y = SEA_Y - 1.67
const POLE_GAP = 6.5
const POLE_X0 = 71.6

/** The windows along the car's sides, from its middle: [x0, x1]. The door is between the fifth and the sixth. */
export const WINDOWS: [number, number][] = [
  [-2.02, -1.58],
  [-1.46, -1.02],
  [-0.9, -0.46],
  [-0.34, 0.1],
  [0.22, 0.66],
  [1.62, 2.02],
]
const SILL = CAR.floor - 0.38
const HEAD = CAR.roof + 0.2

/* ------------------------------------------------------------------ the line */

/** The posts that carry the wire, on the far side of the line, and the wire itself, sagging a little between them. */
export function drawLine(g: Paint, L: Light, x0: number, x1: number): void {
  const { ctx, view: v } = g
  const a = Math.max(x0, v.x0 - 1)
  const b = Math.min(x1, v.x1 + 1)
  if (b <= a) return
  const post = lit('#3D3630', L.ambient)
  const k0 = Math.max(0, Math.floor((a - POLE_X0) / POLE_GAP))
  const k1 = Math.ceil((b - POLE_X0) / POLE_GAP)
  const posts = (pass: 'post' | 'reflection') => {
    for (let k = k0; k <= k1; k++) {
      const x = POLE_X0 + k * POLE_GAP
      if (x < x0 || x > x1) continue
      box(ctx, x - 0.035, WIRE_Y - 0.12, 0.07, SEA_Y - WIRE_Y + 0.12, post)
      box(ctx, x - 0.035, WIRE_Y - 0.12, 0.42, 0.05, post)
      if (pass === 'post') waterline(g, L, x - 0.05, x + 0.05)
    }
  }
  reflect(g, () => posts('reflection'), 0.3)
  posts('post')
  // The wire, from post to post.
  ctx.beginPath()
  for (let k = k0; k < k1; k++) {
    const xa = POLE_X0 + k * POLE_GAP + 0.38
    const xb = xa + POLE_GAP
    if (xb < x0 || xa > x1) continue
    ctx.moveTo(xa, WIRE_Y)
    ctx.quadraticCurveTo((xa + xb) / 2, WIRE_Y + 0.1, xb, WIRE_Y)
  }
  ink(g, rgba(lit('#2A2622', L.ambient), 0.85), 1.3)
}

/* ------------------------------------------------------------------ the car */

/** The car's outline: its body from roof to skirt, the ends rounded. */
function bodyPath(ctx: CanvasRenderingContext2D, x: number): void {
  const h = CAR.len / 2
  const top = CAR.roof
  const bot = CAR.floor + 0.14
  const r = 0.16
  ctx.beginPath()
  ctx.moveTo(x - h + r, top)
  ctx.lineTo(x + h - r, top)
  ctx.quadraticCurveTo(x + h, top, x + h, top + r)
  ctx.lineTo(x + h + 0.02, bot)
  ctx.lineTo(x - h - 0.02, bot)
  ctx.lineTo(x - h, top + r)
  ctx.quadraticCurveTo(x - h, top, x - h + r, top)
  ctx.closePath()
}

/** The windows as holes, for an even-odd fill over the body. */
function windowHoles(ctx: CanvasRenderingContext2D, x: number, door: number): void {
  for (const [a, b] of WINDOWS) ctx.rect(x + b, SILL, a - b, HEAD - SILL)
  // The door: open, it is a hole down to the floor.
  if (door > 0.01) {
    const d0 = x + CAR.door - CAR.doorW / 2
    const w = CAR.doorW * door
    ctx.rect(d0 + w, HEAD, -w, CAR.floor - HEAD)
  }
}

/**
 * The inside of the car: its far wall with the sea through its windows, the bench, the passengers, the straps and
 * the lamps; and the sunset's window-squares laid on the far wall (`sun`, 0 to 1).
 */
export function drawInside(g: Paint, L: Light, t: number, passengers: number[]): void {
  const { ctx } = g
  const x = carX(t)
  const h = CAR.len / 2
  const lamps = smooth(L.lamps, 0.1, 0.7)
  const wall = mix(lit(INSIDE, L.ambient, 0.15), '#E6C089', lamps * 0.85)
  // The far wall, its windows holes onto the world behind.
  ctx.beginPath()
  ctx.rect(x - h + 0.04, CAR.roof + 0.04, CAR.len - 0.08, CAR.floor - CAR.roof - 0.04)
  for (const [a, b] of WINDOWS) ctx.rect(x + b, SILL, a - b, HEAD - SILL)
  ctx.rect(x + CAR.door + CAR.doorW / 2, SILL, -CAR.doorW, HEAD - SILL)
  ctx.fillStyle = wall
  ctx.fill('evenodd')
  // At night the glass gives back the lamps: a warm veil over the dark outside.
  if (lamps > 0.01) {
    for (const [a, b] of [...WINDOWS, [CAR.door - CAR.doorW / 2, CAR.door + CAR.doorW / 2] as [number, number]]) {
      box(ctx, x + a, HEAD, b - a, SILL - HEAD, rgba('#3A2A1A', 0.32 * lamps * L.night))
    }
  }
  for (const [a, b] of WINDOWS) {
    ctx.beginPath()
    ctx.rect(x + a, HEAD, b - a, SILL - HEAD)
    ink(g, lit('#6A5038', L.ambient, 0.2), 1.3)
  }
  // The ceiling, its lamps, and the straps hanging from it.
  box(ctx, x - h + 0.04, CAR.roof + 0.04, CAR.len - 0.08, 0.1, mix(lit('#9C8768', L.ambient), '#C99A5E', lamps * 0.5))
  for (const lx of [-1.3, 0.0, 1.3]) {
    ellipse(ctx, x + lx, CAR.roof + 0.115, 0.06, 0.025)
    fill(ctx, mix(lit('#D8D0C0', L.ambient), LAMP, lamps))
  }
  for (let i = 0; i < 7; i++) {
    const sx = x - 1.9 + i * 0.6
    const swing = 0.02 * Math.sin(t * 1.7 + i * 0.9)
    poly(ctx, [[sx, CAR.roof + 0.14], [sx + swing, CAR.roof + 0.33]], false)
    ink(g, lit('#4A3A2A', L.ambient), 1.1)
    ellipse(ctx, sx + swing, CAR.roof + 0.37, 0.035, 0.04)
    ink(g, lit('#4A3A2A', L.ambient), 1.1)
  }
  // The bench along the far wall: its back, its seat, its front down to the floor.
  const seat = lit(SEAT, L.ambient, 0.2)
  box(ctx, x - h + 0.12, BENCH_Y - 0.14, CAR.len - 0.24, 0.14, mix(seat, '#2A1612', 0.25))
  box(ctx, x - h + 0.12, BENCH_Y, CAR.len - 0.24, 0.07, seat)
  box(ctx, x - h + 0.12, BENCH_Y + 0.07, CAR.len - 0.24, CAR.floor - BENCH_Y - 0.07, mix(seat, '#1A0E0A', 0.45))
  // The floor.
  box(ctx, x - h + 0.04, CAR.floor - 0.02, CAR.len - 0.08, 0.06, lit('#5A4632', L.ambient))
  // The shadow passengers: still, dark, a little see-through, sitting as people sit on a long ride.
  passengers.forEach((dx, i) => shadow(g, L, x + dx, BENCH_Y, i))
}

/** A shadow passenger sitting on the bench at `x` (seat at `y`): head and body one dark, see-through shape. */
function shadow(g: Paint, L: Light, x: number, y: number, i: number): void {
  const { ctx } = g
  const c = rgba(mix('#22283A', L.top, 0.2), 0.62)
  const slump = 0.02 * hash(i, 3)
  const hw = 0.13 + 0.03 * hash(i, 4)
  ctx.beginPath()
  // Body: shoulders to seat, knees to the floor.
  ctx.moveTo(x - hw, y)
  ctx.quadraticCurveTo(x - hw - 0.01, y - 0.3, x - hw * 0.55, y - 0.36 + slump)
  ctx.lineTo(x + hw * 0.55, y - 0.36 + slump)
  ctx.quadraticCurveTo(x + hw + 0.01, y - 0.3, x + hw, y)
  ctx.lineTo(x + hw * 0.8, CAR.floor - 0.02)
  ctx.lineTo(x - hw * 0.8, CAR.floor - 0.02)
  ctx.closePath()
  // Head, bowed a little; one wears a hat. One shape with the body, so nothing overlaps darker.
  const hx = x + 0.01 * (hash(i, 5) - 0.5)
  const hy = y - 0.47 + slump * 1.5
  ctx.moveTo(hx + 0.095, hy)
  ctx.arc(hx, hy, 0.095, 0, Math.PI * 2)
  if (i === 1) {
    ctx.moveTo(x + 0.14, y - 0.53)
    ctx.ellipse(x, y - 0.53, 0.14, 0.025, 0, 0, Math.PI * 2)
    ctx.moveTo(x + 0.07, y - 0.57)
    ctx.ellipse(x, y - 0.57, 0.07, 0.045, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = c
  ctx.fill('nonzero')
}

/**
 * The low sun's window-squares, laid over the far wall and whoever sits against it, sliding as the car goes and
 * crossed now and then by a post's shadow: `a` how strong (0 by day and at night).
 */
export function drawSunSquares(g: Paint, t: number, a: number): void {
  if (a <= 0.01) return
  const { ctx } = g
  const x = carX(t)
  // The squares fall a little behind the windows that cast them, and slide back as the light swings round.
  const shift = -0.18 - 0.1 * Math.sin(t * 0.21)
  // Every post the car passes throws a shadow across the squares, quick, from front to back.
  const post = ((x - 71.6) / 6.5) % 1
  const shade = 1 - 0.75 * Math.max(0, 1 - Math.abs(post - 0.5) * 7)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x - CAR.len / 2 + 0.06, CAR.roof + 0.15, CAR.len - 0.12, CAR.floor - CAR.roof - 0.17)
  ctx.clip()
  for (const [wa, wb] of [...WINDOWS, [CAR.door - CAR.doorW / 2, CAR.door + CAR.doorW / 2] as [number, number]]) {
    const x0 = x + wa + shift
    const x1 = x + wb + shift
    const y0 = SILL - 0.04
    const y1 = BENCH_Y + 0.02
    box(ctx, x0, y0, x1 - x0, y1 - y0, rgba('#F7C27A', 0.22 * a * shade))
  }
  ctx.restore()
}

/** The car from outside: its near wall with the windows, the door, the stripe, the roof and pantograph, the wheels. */
export function drawOutside(g: Paint, L: Light, t: number, wall = 1): void {
  const { ctx } = g
  const x = carX(t)
  const h = CAR.len / 2
  const door = doorOpen(t)
  const line = mix(LINE, L.top, 0.25)
  // Wheels, in the water.
  for (const bx of [-1.45, 1.45]) {
    box(ctx, x + bx - 0.45, CAR.floor + 0.12, 0.9, SEA_Y - CAR.floor - 0.12, lit('#26231F', L.ambient))
    for (const w of [-0.24, 0.24]) {
      circle(ctx, x + bx + w, SEA_Y - 0.05, 0.1)
      fill(ctx, lit('#3A3530', L.ambient))
    }
  }
  if (wall > 0.003) {
    ctx.save()
    ctx.globalAlpha = wall
    // The near wall: the body with its windows (and the open door) as holes.
    bodyPath(ctx, x)
    windowHoles(ctx, x, door)
    ctx.fillStyle = lit(BODY, L.ambient, 0.12)
    ctx.fill('evenodd')
    // The cream of the window band, over the green, its own windows holes too.
    ctx.beginPath()
    ctx.rect(x - h + 0.02, CAR.roof + 0.06, CAR.len - 0.04, SILL + 0.06 - CAR.roof - 0.06)
    windowHoles(ctx, x, door)
    ctx.fillStyle = lit(CREAM, L.ambient, 0.12)
    ctx.fill('evenodd')
    box(ctx, x - h, SILL + 0.06, CAR.len, 0.035, lit(STRIPE, L.ambient, 0.1))
    box(ctx, x - h, CAR.floor + 0.04, CAR.len, 0.1, lit(BODY_DARK, L.ambient, 0.1))
    // The door's leaf, sliding back along the wall as it opens.
    const d0 = x + CAR.door - CAR.doorW / 2
    const slide = CAR.doorW * door
    box(ctx, d0 + slide, HEAD - 0.04, CAR.doorW, CAR.floor + 0.04 - HEAD, lit(BODY, L.ambient, 0.12))
    ctx.beginPath()
    ctx.rect(d0 + slide, HEAD - 0.04, CAR.doorW, CAR.floor + 0.04 - HEAD)
    ink(g, line, 1.2)
    // The window frames.
    for (const [a, b] of WINDOWS) {
      ctx.beginPath()
      ctx.rect(x + a, HEAD, b - a, SILL - HEAD)
      ink(g, line, 1.3)
    }
    bodyPath(ctx, x)
    ink(g, line, 1.6)
    ctx.restore()
  }
  if (wall < 0.997) {
    // Cut open, what is left of the near wall is its section: the skirt under the floor, and the two ends.
    ctx.save()
    ctx.globalAlpha = 1 - wall
    const section = lit(BODY_DARK, L.ambient, 0.1)
    box(ctx, x - h, CAR.floor - 0.03, CAR.len, 0.17, section)
    box(ctx, x - h - 0.02, CAR.roof + 0.04, 0.1, CAR.floor + 0.14 - CAR.roof - 0.04, section)
    box(ctx, x + h - 0.08, CAR.roof + 0.04, 0.1, CAR.floor + 0.14 - CAR.roof - 0.04, section)
    ctx.restore()
  }
  // The roof, its lantern ridge, and the pantograph up to the wire: always, so the car reads as a car cut open.
  const roof = lit(ROOF, L.ambient, 0.12)
  ctx.beginPath()
  ctx.moveTo(x - h + 0.05, CAR.roof + 0.02)
  ctx.quadraticCurveTo(x - h + 0.25, CAR.roof - 0.13, x - h + 0.6, CAR.roof - 0.14)
  ctx.lineTo(x + h - 0.6, CAR.roof - 0.14)
  ctx.quadraticCurveTo(x + h - 0.25, CAR.roof - 0.13, x + h - 0.05, CAR.roof + 0.02)
  ctx.closePath()
  fill(ctx, roof)
  ink(g, line, 1.4)
  box(ctx, x - 1.3, CAR.roof - 0.22, 2.6, 0.09, lit('#5A5C60', L.ambient, 0.12))
  pantograph(g, L, x)
  // The headlamp at the front (east), lit from the evening on; a small red one at the back.
  const lamps = smooth(L.lamps, 0.1, 0.7)
  circle(ctx, x + h - 0.02, CAR.roof + 0.32, 0.055)
  fill(ctx, mix(lit('#D8D2C4', L.ambient), '#F8DE9E', lamps))
  ink(g, line, 1.1)
  circle(ctx, x - h + 0.02, CAR.roof + 0.32, 0.035)
  fill(ctx, mix(lit('#7A2A22', L.ambient), '#D8473A', lamps))
}

function pantograph(g: Paint, L: Light, x: number): void {
  const { ctx } = g
  const base = CAR.roof - 0.16
  const top = WIRE_Y + 0.02
  const mid = (base + top) / 2
  ctx.beginPath()
  ctx.moveTo(x - 0.3, base)
  ctx.lineTo(x - 0.05, mid)
  ctx.lineTo(x - 0.22, top)
  ctx.moveTo(x + 0.3, base)
  ctx.lineTo(x + 0.05, mid)
  ctx.lineTo(x + 0.22, top)
  ctx.moveTo(x - 0.3, top)
  ctx.lineTo(x + 0.3, top)
  ink(g, lit('#2A2622', L.ambient), 1.4)
}

/** The car's reflection in the water: its body and its windows, plain. */
export function drawCarReflection(g: Paint, L: Light, t: number): void {
  const x = carX(t)
  const lamps = smooth(L.lamps, 0.1, 0.7)
  reflect(g, () => {
    const { ctx } = g
    bodyPath(ctx, x)
    ctx.fillStyle = lit(BODY, L.ambient, 0.12)
    ctx.fill()
    for (const [a, b] of WINDOWS) box(ctx, x + a, HEAD, b - a, SILL - HEAD, mix(lit(CREAM, L.ambient, 0.2), '#D9A964', lamps))
    box(ctx, x + CAR.door - CAR.doorW / 2, HEAD, CAR.doorW, SILL - HEAD, mix(lit(BODY, L.ambient, 0.12), '#D9A964', lamps * 0.6))
    box(ctx, x - CAR.len / 2, CAR.roof - 0.14, CAR.len, 0.16, lit(ROOF, L.ambient, 0.12))
  }, 0.26 + 0.06 * lamps)
}

/* ------------------------------------------------------------------ the platforms */

/** A low deck of boards on posts in the water, its top at `top`, from `x0` to `x1`. */
export function deck(g: Paint, L: Light, x0: number, x1: number, top: number): void {
  const { ctx } = g
  const wood = lit('#7A6248', L.ambient, 0.08)
  const posts = () => {
    for (let x = x0 + 0.12; x <= x1 - 0.05; x += 0.8) box(ctx, x - 0.05, top, 0.1, SEA_Y - top + 0.02, lit('#3E3024', L.ambient))
  }
  reflect(g, () => {
    posts()
    box(ctx, x0, top, x1 - x0, 0.09, wood)
  }, 0.3)
  posts()
  box(ctx, x0, top, x1 - x0, 0.09, wood)
  box(ctx, x0, top, x1 - x0, 0.022, lit('#A78B68', L.ambient, 0.1))
  ctx.beginPath()
  ctx.rect(x0, top, x1 - x0, 0.09)
  ink(g, lit('#2E241A', L.ambient), 1.1)
  waterline(g, L, x0, x1)
}

/** The bathhouse's halt: a bare deck in the water, with one post and its board. */
export function drawHalt(g: Paint, L: Light): void {
  deck(g, L, HALT.x0, HALT.x1, HALT_TOP)
  const { ctx } = g
  const px = HALT.x1 - 0.3
  box(ctx, px - 0.03, HALT_TOP - 0.75, 0.06, 0.75, lit('#3E3024', L.ambient))
  box(ctx, px - 0.2, HALT_TOP - 0.85, 0.4, 0.2, lit('#3D6A5A', L.ambient, 0.1))
  ctx.beginPath()
  ctx.rect(px - 0.2, HALT_TOP - 0.85, 0.4, 0.2)
  ink(g, lit('#1E2A24', L.ambient), 1.1)
}

/** The landing at the boiler room's east end: boards at the water, two steps down into it. */
export function drawLanding(g: Paint, L: Light): void {
  deck(g, L, LANDING.x0, LANDING.x1, LANDING.y)
  const { ctx } = g
  const wood = lit('#6E583F', L.ambient, 0.08)
  box(ctx, LANDING.x1 - 0.02, LANDING.y + 0.1, 0.3, 0.06, wood)
  box(ctx, LANDING.x1 + 0.22, LANDING.y + 0.19, 0.3, 0.06, wood)
}

/** The lonely station: a long deck across the line, a little shelter at its east end, and the girl. */
export function drawStation(g: Paint, L: Light): void {
  deck(g, L, STATION.x0, STATION.x1, STATION.y)
  const { ctx } = g
  const wood = lit('#5A4632', L.ambient)
  const [sx0, sx1] = STATION.shelter
  for (const px of [sx0, sx1]) box(ctx, px - 0.04, STATION.y - 1.05, 0.08, 1.05, wood)
  poly(ctx, [[sx0 - 0.25, STATION.y - 1.02], [sx1 + 0.25, STATION.y - 1.02], [sx1 + 0.1, STATION.y - 1.2], [sx0 - 0.1, STATION.y - 1.2]])
  fill(ctx, lit('#5C5E62', L.ambient, 0.1))
  ink(g, lit('#22201E', L.ambient), 1.2)
  // A bench under it.
  box(ctx, sx0 + 0.5, STATION.y - 0.24, 1.3, 0.05, wood)
  box(ctx, sx0 + 0.55, STATION.y - 0.24, 0.05, 0.24, wood)
  box(ctx, sx0 + 1.7, STATION.y - 0.24, 0.05, 0.24, wood)
  girl(g, L, STATION.girl, STATION.y)
}

/** A shadow girl standing on the platform, a child's dress, still; only its hem stirs. */
function girl(g: Paint, L: Light, x: number, y: number): void {
  const { ctx } = g
  const c = rgba(mix('#1A2030', L.top, 0.15), 0.82)
  const stir = 0.012 * sway(g.t, 0.5, 2)
  ctx.beginPath()
  ctx.moveTo(x - 0.05, y - 0.42)
  ctx.lineTo(x + 0.05, y - 0.42)
  ctx.lineTo(x + 0.11 + stir, y - 0.15)
  ctx.lineTo(x - 0.11 + stir, y - 0.15)
  ctx.closePath()
  fill(ctx, c)
  box(ctx, x - 0.045, y - 0.15, 0.03, 0.15, c)
  box(ctx, x + 0.015, y - 0.15, 0.03, 0.15, c)
  circle(ctx, x, y - 0.5, 0.075)
  fill(ctx, c)
}

/** The far side of the line between the stations: houses standing alone in the water, very far, pale in the air. */
export function drawFarHouses(g: Paint, L: Light, hy: number, v: { x0: number; x1: number; h: number }): void {
  const { ctx } = g
  const tone = mix(lit('#5E6A70', L.ambient, 0.3), L.haze, 0.55)
  const lamps = smooth(L.lamps, 0.4, 1)
  for (let i = 0; i < 14; i++) {
    const x = 70 + i * 13 + hash(i, 81) * 6
    if (x < v.x0 - 2 || x > v.x1 + 2) continue
    const s = v.h * (0.018 + 0.01 * hash(i, 82))
    const w = s * (1.6 + hash(i, 83))
    const top = hy - s
    box(ctx, x - w / 2, top, w, s + 0.002, tone)
    poly(ctx, [[x - w / 2 - s * 0.2, top], [x + w / 2 + s * 0.2, top], [x, top - s * 0.7]])
    fill(ctx, tone)
    if (hash(i, 84) > 0.55) {
      // A tree beside it.
      circle(ctx, x + w / 2 + s * 0.6, top - s * 0.1, s * 0.75)
      fill(ctx, mix(tone, '#3E5240', 0.2))
    }
    if (hash(i, 85) > 0.5 && lamps > 0.01) box(ctx, x - s * 0.2, top + s * 0.35, s * 0.35, s * 0.3, rgba(LAMP, lamps))
  }
}

export type { Pt }
