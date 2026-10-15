import type { Pt } from '../../../../../parts'
import { motes, parallax, pulse, rising, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { WIN } from '../music'
import { ctxOf, type Pen } from '../pen'
import { events, Glows, rgbaOf } from './batch'
import { LOWER, rowDepth, FAR } from './crowd'
import { BELL, BOW2, CM, FLASH_IN, FLASH_WIN, FLOOR, LAMP, LIGHTS_DOWN, LIGHTS_UP, NET_X, POWER, RALLY, SERVE, STOMPS, TOP, TURN, WAY, XL, XR } from './geo'
import { ANCHOR, beats, closeness, heat, HIGH, house } from './mood'
import { C } from './palette'

/**
 * The night's light, over and through the house: the spotlights on the roof's truss, which find him as he stomps,
 * criss-cross the arena on every beat of the match (meeting on the table on the beat, flung apart between), lock on his
 * bat for the winner and then sweep the stands wild; the flash bulbs going off all over the house, a few through the
 * exhibition, more and more through the match, a wall of them on the winner; the lights of the far side out of focus
 * when the camera is in close; the dust in the beams and in the lamp's cone; the cigarette smoke drifting up through it.
 */

/* ------------------------------------------------------------------ the spotlights */

/** The roof's truss (its own frame moves at 0.8 of the table's speed, laid out from the wide's view). */
export const TRUSS_D = 0.8
export const TRUSS_Y = -6.05
/** The spotlights along the truss (their x), outermost first on each side. */
export const SPOTS = [NET_X - 9.5, NET_X - 5.8, NET_X - 2.6, NET_X + 2.6, NET_X + 5.8, NET_X + 9.5]
/** Each comes on with a stomp, the inner pair first, and goes out with the house, the outer pair first. */
const ON = [STOMPS[2], STOMPS[1], STOMPS[0], STOMPS[0], STOMPS[1], STOMPS[2]]
const OFF = [LIGHTS_DOWN[0], LIGHTS_DOWN[1], LIGHTS_DOWN[2], LIGHTS_DOWN[2], LIGHTS_DOWN[1], LIGHTS_DOWN[0]]
const SPREAD = 0.085

export interface Beam {
  from: Pt
  to: Pt
  /** How bright, 0 off to 1 (a little over as it strikes on). */
  a: number
}

const blend = (p: Pt, q: Pt, w: number): Pt => [p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w]

/** Where spotlight `i` is aimed at `t` (cells, on the table's plane). */
function aim(i: number, t: number): Pt {
  const side = i < 3 ? 1 : -1
  const reach = i === 0 || i === 5 ? 1 : i === 1 || i === 4 ? 0.8 : 0.6
  const b = beats(t)
  // Finding him: each swings in onto him as it comes on, and stays on him as he stomps and hops into the pan.
  const [mx, my] = WAY.at(t)
  let p: Pt = [mx + side * 2.2 * Math.exp(-Math.max(0, t - ON[i]) / 0.22), my]
  // The match: on the table on every beat, flung apart and crossing between, wider as it goes.
  const S = 1.2 + 3.6 * smooth(t, SERVE, WIN)
  const s = Math.sin(Math.PI * b)
  const rally: Pt = [NET_X + 0.5 * Math.sin((Math.PI * b) / 4) + side * reach * S * s, -0.1 - 1.4 * Math.abs(s) * (S / 4.8) * reach]
  p = blend(p, rally, smooth(t, SERVE - 0.15, SERVE + 0.35))
  // The winner: all of them on his bat.
  p = blend(p, CM, smooth(t, WIN - 0.12, WIN + 0.02))
  // The eruption: swept wild over the stands.
  const wild: Pt = [NET_X + side * reach * 7 * Math.sin((Math.PI * b) / 2 + i * 0.7), -2.4 + 1.5 * Math.cos((Math.PI * b) / 3 + i * 1.3)]
  p = blend(p, wild, smooth(t, WIN + 0.5, WIN + 1.4))
  // The quiet: all on him, in Endo's hand, drifting a little.
  const follow: Pt = [mx + 0.25 * Math.sin(t * 0.8 + i * 2), my + 0.1 * Math.cos(t * 0.6 + i)]
  return blend(p, follow, smooth(t, TURN - 0.6, TURN + 1.2))
}

/** The six beams at `t`, in the frame `f` (their lamps on the truss move with it). */
export function beamsAt(t: number, f: Frame): Beam[] {
  const [dx, dy] = parallax(f, TRUSS_D, HIGH)
  const beat = pulse(t, 0.25)
  const win = Math.exp(-Math.max(0, t - WIN) / 0.4) * (t >= WIN ? 1 : 0)
  return SPOTS.map((x, i) => {
    const on = t < ON[i] ? 0 : Math.min(1, (t - ON[i]) / 0.05) + 0.4 * Math.exp(-(t - ON[i]) / 0.15)
    const off = 1 - smooth(t, OFF[i], OFF[i] + 0.15)
    const a = on * off * (0.78 + 0.22 * beat + 0.35 * win)
    return { from: [x + dx, TRUSS_Y + 0.22 + dy] as Pt, to: aim(i, t), a }
  })
}

/** How lit a point is by the beams (0 to 1): for the dust in them. */
function beamLight(beams: Beam[], x: number, y: number): number {
  let v = 0
  const half = Math.tan(SPREAD / 2)
  for (const b of beams) {
    if (b.a <= 0.02) continue
    const ux = b.to[0] - b.from[0]
    const uy = b.to[1] - b.from[1]
    const l = Math.hypot(ux, uy) || 1
    const vx = x - b.from[0]
    const vy = y - b.from[1]
    const along = (vx * ux + vy * uy) / l
    if (along <= 0) continue
    const perp = Math.abs(vx * uy - vy * ux) / l
    const w = along * half
    if (perp >= w) continue
    v = Math.max(v, b.a * (1 - perp / w) * Math.max(0.2, 1 - along / 14))
  }
  return v
}

/** The beams through the haze, added onto everything behind the table, and the dust that catches in them. */
export function drawBeams(pen: Pen, t: number, f: Frame): void {
  const beams = beamsAt(t, f)
  if (!beams.some((b) => b.a > 0.01)) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const half = Math.tan(SPREAD / 2)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const b of beams) {
    if (b.a <= 0.01) continue
    const ux = b.to[0] - b.from[0]
    const uy = b.to[1] - b.from[1]
    const l = Math.hypot(ux, uy) || 1
    const dxn = ux / l
    const dyn = uy / l
    // On down through its mark to the floor, or across the house.
    const len = Math.min(16, dyn > 0.1 ? (FLOOR + 0.3 - b.from[1]) / dyn : 16)
    const ex = b.from[0] + dxn * len
    const ey = b.from[1] + dyn * len
    const w = len * half
    const g = ctx.createLinearGradient(b.from[0] * k, b.from[1] * k, ex * k, ey * k)
    const a = Math.min(1, b.a)
    g.addColorStop(0, rgbaOf(pen, C.beam, 0.26 * a))
    g.addColorStop(0.35, rgbaOf(pen, C.beam, 0.12 * a))
    g.addColorStop(1, rgbaOf(pen, C.beam, 0.025 * a))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((b.from[0] - dyn * 0.06) * k, (b.from[1] + dxn * 0.06) * k)
    ctx.lineTo((b.from[0] + dyn * 0.06) * k, (b.from[1] - dxn * 0.06) * k)
    ctx.lineTo((ex + dyn * w) * k, (ey - dxn * w) * k)
    ctx.lineTo((ex - dyn * w) * k, (ey + dxn * w) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  motes(pen, t, {
    n: 300,
    seed: 83,
    box: [-11, -6.5, 15, FLOOR],
    size: [0.012, 0.03],
    color: C.beam,
    alpha: 0.85,
    drift: [0.07, -0.03],
    wander: 0.3,
    twinkle: 0.55,
    light: (x, y) => (x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1 ? 0 : beamLight(beams, x, y)),
  })
}

/* ------------------------------------------------------------------ the lamp's air */

/** How far inside the lamp's cone a point is, 0 to 1. */
function inCone(x: number, y: number): number {
  const top = LAMP[1] + 0.22
  if (y < top || y > TOP) return 0
  const u = (y - top) / (TOP - top)
  const hw = 0.3 + u * ((XR - XL) / 2 + 0.3)
  const d = Math.abs(x - LAMP[0]) / hw
  return d >= 1 ? 0 : 0.35 + 0.65 * (1 - d)
}

/** Dust turning in the one lamp's cone, and cigarette smoke drifting up through it; more of both in the quiet. */
export function drawLampAir(pen: Pen, t: number): void {
  const quiet = smooth(t, TURN, TURN + 3)
  rising(pen, t, {
    seed: 61,
    n: 22,
    from: [XL + 0.4, XR - 0.4, 0.2],
    rise: 3.2,
    life: 7.5,
    spread: 1.1,
    size: [0.22, 0.55],
    color: C.smoke,
    alpha: 0.05 + 0.03 * quiet - 0.02 * heat(t),
  })
  motes(pen, t, {
    n: 110,
    seed: 67,
    box: [XL - 0.6, LAMP[1] + 0.22, XR + 0.6, TOP],
    size: [0.01, 0.026],
    color: C.lamp,
    alpha: 0.8,
    drift: [0.04, -0.02],
    wander: 0.25,
    twinkle: 0.6,
    light: inCone,
  })
}

/* ------------------------------------------------------------------ the flash bulbs */

/** How many flash bulbs go off over the whole house a second. */
function flashRate(t: number): number {
  if (t < BELL - 0.3) return 0
  let r: number
  if (t < LIGHTS_UP[0]) r = 1.2
  else if (t < SERVE) r = 3 + 3 * smooth(t, LIGHTS_UP[0], SERVE)
  else if (t < WIN) r = 7 + 38 * ((t - SERVE) / (WIN - SERVE)) ** 2
  else if (t < WIN + 1) r = 900
  else if (t < TURN) r = 25 + 300 * Math.exp(-(t - WIN - 1) / 1.4)
  else r = 9 * (1 - smooth(t, LIGHTS_DOWN[0], LIGHTS_DOWN[3] + 1)) + 1.2
  for (const p of POWER) if (t >= p && t < p + 0.45) r += 80
  for (const h of RALLY) if (t >= h && t < h + 0.12) r += 30
  for (const e of FLASH_WIN) if (t >= e && t < e + 0.1) r += 140
  if (t >= BOW2 && t < BOW2 + 0.7) r += 50
  return r
}

const FLASH_LIFE = 0.32
const FLASH_DT = 1 / 30
const FLASH_PER = 40

/**
 * The flash bulbs in the stands: each a hard white pop and a bloom that dies in a third of a second, at a seat in the
 * lower tier or the upper; and the one on the broken-off line as he comes in. With the camera in close they are out
 * of focus: bigger and softer.
 */
export function drawFlashes(pen: Pen, t: number, f: Frame): void {
  const glows = new Glows(pen)
  const c = closeness(f)
  const [fx, fy] = parallax(f, FAR, HIGH)
  events(t, 91, FLASH_DT, FLASH_PER, FLASH_LIFE, flashRate, (age, id) => {
    const hx = -15 + 34 * hash(id, 93)
    const far = hash(id, 94) < 0.28
    let x: number
    let y: number
    let r: number
    if (far) {
      x = hx + fx
      y = -5.6 - 2.2 * hash(id, 95) + fy
      r = 0.42
    } else {
      const row = Math.floor(hash(id, 95) * LOWER)
      const [dx, dy] = parallax(f, rowDepth(row), ANCHOR)
      x = hx + dx
      y = 0.3 - row * 0.56 - 0.5 - 0.15 * hash(id, 96) + dy
      r = 0.7 + 0.45 * c
    }
    if (x < f.x0 - r || x > f.x1 + r || y < f.y0 - r || y > f.y1 + r) return
    glows.add(x, y, r, C.bulbWarm, Math.exp(-age / 0.09))
  })
  // The one on the broken-off line.
  const u = t - FLASH_IN
  if (u >= 0 && u < 0.6) {
    const a = Math.exp(-u / 0.12)
    glows.add(1.3, -1.05, 2.2, C.lamp, 0.4 * a)
    glows.add(1.3, -1.05, 0.4, C.bulb, a)
  }
  glows.draw(pen.p.drawingContext as CanvasRenderingContext2D)
}

/* ------------------------------------------------------------------ the far side, out of focus */

const BOKEH = 70
const BOKEH_COLORS = [C.lanternPale, '#E2604C', C.bulbWarm, C.beam]

/**
 * With the camera in close on a bat, the house behind is out of focus: the lanterns and lamps and bulbs up in its
 * higher rows become soft discs of light, drifting slower than the table as the camera goes (0.5), breathing,
 * brighter as the house lights come up.
 */
export function drawBokeh(pen: Pen, t: number, f: Frame): void {
  const c = Math.max(0, Math.min(1, (closeness(f) - 0.3) / 0.6))
  if (c <= 0) return
  const [dx, dy] = parallax(f, 0.5, ANCHOR)
  const lights = house(t)
  const glows = new Glows(pen)
  const grow = 0.8 + 1.1 * c
  for (let i = 0; i < BOKEH; i++) {
    const x = -16 + 36 * hash(i, 101) + dx
    const y = -4.6 + 2.8 * hash(i, 102) + dy
    const r = (0.05 + 0.1 * hash(i, 103)) * grow
    if (x < f.x0 - r || x > f.x1 + r || y < f.y0 - r || y > f.y1 + r) continue
    const col = BOKEH_COLORS[Math.floor(hash(i, 104) * BOKEH_COLORS.length)]
    const breath = 0.6 + 0.4 * Math.sin(t * (0.4 + 0.8 * hash(i, 105)) + i * 2.3)
    glows.add(x, y, r, col, c * (0.05 + 0.4 * lights) * breath, true)
  }
  glows.draw(ctxOf(pen.p))
}
