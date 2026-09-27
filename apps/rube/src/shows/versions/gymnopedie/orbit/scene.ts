import type p5 from 'p5'
import { R as BALL_R, mixHex, type Piece, type PieceCtx } from '../../../../parts'
import { CHORDS, GRACES, MELODY, PERIOD, loudness, wrap } from './music'
import { LENGTH, RADIUS, along, ballLocal, crest, float, since, sink, stonesIn, swell, type Stone } from './path'
import { wideAt } from './camera'
import { alpha, hash, osc, polar, skyAt, smooth, type Sky } from './world'

/**
 * Everything on the planet but the ball, each a drawing told show time.
 *
 * - The sky: the day's gradient over the sea, the sun and the moon on their
 *   arcs, the stars, and, as the camera draws out, space round the planet.
 * - The stones: the melody, one material to a piece. The Gymnopédie's are
 *   columns of pale stone, the long notes lintels on two columns; the first
 *   Gnossienne's dark stelae, each with a lamp the ball lights as it lands;
 *   the third's lotus leaves on stems, floating, the longest with a flower
 *   that opens when the ball comes. What the ball does at night stays done
 *   until dawn: the lamps burn and the flowers stay open behind it, so its way
 *   is a thread of light, and seen from far off, round the planet.
 * - The sea, over the stones' feet: the swell that each bass note sends out
 *   from under the ball, its crests catching the light; the stones'
 *   reflections; and the light on the water, under the sun, the lamps and the
 *   moon, which the chords set sparkling.
 * - Over the ball: a spark where it is about to land, struck by a grace note;
 *   the lamps seen from far off; and, once the planet is small in the frame, a
 *   light round the ball so it can still be found.
 *
 * One job to a voice: the melody is the stones and the ball's landings, the
 * bass the sea's swell, the chords the light on the water, a grace note a
 * spark. How full the music is (`loudness`) is how high the swell stands and
 * how bright the water's light.
 */

const scenery = <S>(name: string, draw: (p: p5, s: S, c: PieceCtx) => void, over?: (p: p5, s: S, c: PieceCtx) => void): Piece<S> => ({
  name,
  weight: 0,
  place: () => null,
  draw,
  over,
})

type Ctx2D = CanvasRenderingContext2D

/** The frame on the canvas as the drawing sees it: its height in cells, and the ball's way round it. */
interface View {
  /** Cells top to bottom of the canvas. */
  cells: number
  /** 0 close, 1 when the whole planet is the picture. */
  wide: number
  /** The span of the sea in the frame, cells along. */
  u0: number
  u1: number
}

function viewOf(p: p5, c: PieceCtx): View {
  const ctx = p.drawingContext as Ctx2D
  const m = ctx.getTransform()
  const d = p.pixelDensity()
  // Cells per canvas height: the transform's scale is device pixels a pixel of the drawing, and k pixels a cell.
  const scale = Math.hypot(m.a, m.b) / d
  const cells = p.height / (c.k * scale)
  const wide = wideAt(cells)
  const u = along(c.t)
  // Once the frame has begun to slide from the ball to the planet's middle, the ball's neighbourhood is no longer
  // what is in it: the whole way round is.
  const half = wide > 0.001 ? LENGTH / 2 : (Math.hypot(p.width, p.height) / (c.k * scale)) * 0.62 + 1.5
  return { cells, wide, u0: u - half, u1: u + half }
}

/** Where a point of the world (cells) is on the canvas, in device pixels. */
function onCanvas(ctx: Ctx2D, k: number, x: number, y: number): [number, number] {
  const m = ctx.getTransform()
  return [m.a * x * k + m.c * y * k + m.e, m.b * x * k + m.d * y * k + m.f]
}

/** Draw in a stone's own frame: its front foot on the sea at the origin, up the frame's up. */
function atSea(p: p5, k: number, u: number): void {
  const [x, y] = polar(u, 0)
  p.translate(x * k, y * k)
  p.rotate(u / RADIUS)
}

// ---------------------------------------------------------------- the sky

/** The sun and the moon: how far from overhead, radians (east positive), at show time `t`; beyond ±1.75 they are down. */
const sunAngle = (t: number): number => 1.82 - (3.64 * wrap(t)) / 222
const moonAngle = (t: number): number => (wrap(t) < 430 ? 3 : 1.8 - (3.6 * (wrap(t) - 430)) / (PERIOD - 430))

/** The sun or the moon in the frame: where it is on the canvas (device pixels), and how much it lights. */
interface Body {
  x: number
  y: number
  light: number
  sun: boolean
  /** How far from overhead, radians. */
  angle: number
}

/** The sun and the moon at `t`, on their arcs over the horizon; they light nothing once the planet is small in the frame. */
function bodies(ctx: Ctx2D, c: PieceCtx, v: View, day: Sky): Body[] {
  const H = ctx.canvas.height
  const [hx, hy] = onCanvas(ctx, c.k, ...polar(along(c.t) + 0.55, 0))
  const reach = H * 0.62
  // Only close: once the planet draws away they are its sky's, not the frame's.
  const near = 1 - smooth(v.wide, 0, 0.25)
  const at = (angle: number, light: number, sun: boolean): Body => ({
    x: hx + Math.sin(angle) * reach * 1.25,
    y: hy - Math.cos(angle) * reach,
    light: Math.abs(angle) > 1.9 ? 0 : light,
    sun,
    angle,
  })
  return [at(sunAngle(c.t), near * (1 - day.night * 0.8), true), at(moonAngle(c.t), near * day.night, false)]
}

export const sky = scenery<null>('sky', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const day = skyAt(c.t)
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  // The horizon on the canvas: the sea under the frame's middle.
  const u = along(c.t)
  const [, hy] = onCanvas(ctx, c.k, ...polar(u + 0.55, 0))
  // Where they are is worked out in the world's own transform, before the sky is painted square to the canvas.
  const [sun, moon] = bodies(ctx, c, v, day)
  const m = ctx.getTransform()
  const roll = Math.atan2(m.b, m.a)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  // Space: the dark the planet hangs in, once it is small in the frame.
  const space = '#05070F'
  const top = mixHex(day.top, space, v.wide)
  const low = mixHex(day.low, '#0A0E1E', v.wide)
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(hy, H * 0.3))
  g.addColorStop(0, top)
  g.addColorStop(1, low)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Stars: fixed to the sky, which turns with the planet (twice a period, as the sun and the moon do).
  const starLight = Math.max(day.night, v.wide) * 0.95
  if (starLight > 0.02) {
    const R0 = Math.hypot(W, H) * 0.75
    const turn = roll * 2
    for (let i = 0; i < 420; i++) {
      const a = hash(i, 1) * Math.PI * 2 + turn
      const r = Math.sqrt(hash(i, 2)) * R0
      const x = W / 2 + Math.cos(a) * r
      const y = H / 2 + Math.sin(a) * r
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue
      // Stars only in the sky: over the horizon, fading into its haze.
      const over = v.wide > 0.5 ? 1 : smooth(hy - y, 0, H * 0.25)
      const tw = 0.7 + 0.3 * osc(c.t, 0.13 + hash(i, 3) * 0.3, i)
      const a2 = starLight * over * tw * (0.25 + 0.75 * hash(i, 4))
      if (a2 < 0.02) continue
      ctx.fillStyle = `rgba(244, 238, 223, ${a2.toFixed(3)})`
      const s = (0.6 + hash(i, 5) * 1.3) * Math.max(1, W / 1600)
      ctx.beginPath()
      ctx.arc(x, y, s, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // The sun and the moon, on arcs over the horizon; gone when the planet is small (they are its sky, not space's).
  const body = ({ x: bx, y: by, light }: Body, radius: number, core: string, glow: string) => {
    if (light <= 0.01) return
    const glowR = radius * 7
    const halo = ctx.createRadialGradient(bx, by, radius * 0.6, bx, by, glowR)
    halo.addColorStop(0, glow.replace('A', (0.55 * light).toFixed(3)))
    halo.addColorStop(1, glow.replace('A', '0'))
    ctx.fillStyle = halo
    ctx.fillRect(bx - glowR, by - glowR, glowR * 2, glowR * 2)
    ctx.globalAlpha = light
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(bx, by, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  body(sun, H * 0.045, '#FFF1D6', 'rgba(255, 214, 160, A)')
  body(moon, H * 0.03, '#F2EEE2', 'rgba(200, 214, 240, A)')
  ctx.restore()

  // Wide: the air round the planet, lit the colour of its day.
  if (v.wide > 0.01) {
    const k = c.k
    const air = ctx.createRadialGradient(0, 0, RADIUS * k * 0.98, 0, 0, RADIUS * k * 1.16)
    air.addColorStop(0, alpha(p, day.low, 0.75 * v.wide).toString())
    air.addColorStop(1, alpha(p, day.low, 0).toString())
    ctx.fillStyle = air
    ctx.beginPath()
    ctx.arc(0, 0, RADIUS * k * 1.16, 0, Math.PI * 2)
    ctx.fill()
  }
})

// ---------------------------------------------------------------- the stones

/** Show time dawn puts out what the night lit: each lamp goes out, and each flower closes, at its own moment in here. */
const DAWN_FROM = 7
const DAWN_TO = 34

/**
 * The night's hold on `stone` at `t`: how long ago the ball came to it (seconds), and how much of the night is still
 * on it (1, down to 0 as the dawn comes to it). The lamps the ball lights burn, and the flowers it opens stay open,
 * until the sun comes up; before the ball comes to it this time round it is last night's, going out with the dawn,
 * and then nothing. Only the Gnossiennes' stones: the night's.
 */
function tonight(stone: Stone, t: number): { age: number; left: number } | null {
  const u = wrap(t)
  const at = stone.touches[0]
  if (u >= at) return { age: u - at, left: 1 }
  const out = DAWN_FROM + hash(stone.index, 7) * (DAWN_TO - DAWN_FROM - 6)
  const left = 1 - smooth(u, out, out + 6)
  return left > 0 ? { age: u + PERIOD - at, left } : null
}

/**
 * How bright a lamp burns, 0 to 1: it catches as the ball comes down on it, flares as hard as the note was played,
 * and settles to burn, a little unsteadily, until dawn.
 */
export function lampLight(stone: Stone, t: number): number {
  const night = tonight(stone, t)
  if (!night) return 0
  const s = night.age
  const burn = 0.56 * smooth(s, 0, 0.3) * (1 + 0.07 * osc(t, 0.37, stone.index * 1.7))
  const flare = 0.55 * stone.weight[0] * (1 - Math.exp(-s / 0.03)) * Math.exp(-s / 1.6)
  return night.left * Math.min(1, burn + flare + 0.45 * pulse(stone, t))
}

/** How far a flower is open, 0 a bud to 1: it opens as the ball comes, and closes again at dawn. */
export function bloom(stone: Stone, t: number): number {
  const night = tonight(stone, t)
  return night ? night.left * smooth(night.age, 0, 2.2) : 0
}

/** A restrike's pulse: the chord striking the held note's key again, answered by the stone. */
function pulse(stone: Stone, t: number): number {
  let out = 0
  for (let i = 1; i < stone.touches.length; i++) {
    if (stone.bounced[i]) continue
    const s = since(t, stone.touches[i])
    if (s >= 0 && s < 3) out = Math.max(out, Math.exp(-s / 0.7))
  }
  return out
}

const MARBLE_SHADE = 0.22

/**
 * A column, or a lintel on two: the Gymnopédie's stones, drawn from the front foot, `w` wide, top at `-h`. Slender,
 * with air between: a colonnade in the sea, not a wall.
 */
function column(p: p5, k: number, w: number, h: number, day: Sky, weight: number, shine: number): void {
  const K = (v: number) => v * k
  const stone = day.lit
  const shade = mixHex(day.lit, day.sea, MARBLE_SHADE)
  const ink = day.line
  const lintel = w > 0.62
  const shafts = lintel ? [0.14, w - 0.14] : [w / 2]
  const sw = lintel ? 0.11 : Math.max(0.08, Math.min(0.16, w * 0.36))
  const capH = lintel ? 0.09 : 0.06
  const slabW = lintel ? w : Math.min(w, sw * 2.1)
  p.strokeWeight(weight)
  for (const x of shafts) {
    // The shaft, into the sea: lit on the east, in shade on the west.
    p.stroke(ink)
    p.fill(stone)
    p.rect(K(x), K(-h / 2 + 0.2), K(sw), K(h + 0.4))
    p.noStroke()
    p.fill(alpha(p, shade, 0.8))
    p.rect(K(x - sw * 0.25), K(-h / 2 + 0.2), K(sw * 0.4), K(h + 0.4 - 0.02))
    p.stroke(alpha(p, ink, 0.28))
    p.strokeWeight(weight * 0.55)
    p.line(K(x + sw * 0.16), K(-h + capH + 0.1), K(x + sw * 0.16), K(0.2))
    p.strokeWeight(weight)
    // The capital: a cushion under the slab.
    p.stroke(ink)
    p.fill(stone)
    p.quad(K(x - sw * 0.8), K(-h + capH), K(x + sw * 0.8), K(-h + capH), K(x + sw * 0.52), K(-h + capH + 0.06), K(x - sw * 0.52), K(-h + capH + 0.06))
  }
  // The slab the ball walks on.
  p.fill(stone)
  p.rect(K(w / 2), K(-h + capH / 2), K(slabW), K(capH))
  if (shine > 0.01) {
    p.stroke(alpha(p, '#FFF6E2', shine))
    p.strokeWeight(weight * 1.6)
    p.line(K(w / 2 - slabW / 2 + 0.02), K(-h), K(w / 2 + slabW / 2 - 0.02), K(-h))
  }
}

/**
 * The first Gnossienne's stones: a beam of bronze on slim dark posts, with a lamp at its front that the ball lights
 * as it lands. `lamp` is how bright it burns.
 */
function stele(p: p5, k: number, w: number, h: number, day: Sky, weight: number, lamp: number, withLamp: boolean): void {
  const K = (v: number) => v * k
  const body = mixHex('#23283C', day.lit, 0.2)
  const posts = w > 0.42 ? [0.09, w - 0.09] : [w / 2]
  const pw = w > 0.42 ? 0.075 : Math.max(0.06, Math.min(0.12, w * 0.4))
  p.strokeWeight(weight)
  p.stroke(alpha(p, day.line, 0.7))
  p.fill(body)
  for (const x of posts) p.rect(K(x), K(-h / 2 + 0.2), K(pw), K(h + 0.4))
  // The beam.
  p.fill(mixHex('#6E5232', '#C99C5C', 0.25 + 0.75 * lamp))
  const bw = w > 0.42 ? w : Math.min(w, pw * 2.4)
  p.rect(K(w / 2), K(-h + 0.03), K(bw), K(0.06))
  if (!withLamp) return
  // The lamp: a small bowl at the front, where the ball lands.
  const lx = w > 0.42 ? 0.1 : w / 2
  p.fill(mixHex('#3A2C22', '#E9B866', lamp))
  p.arc(K(lx), K(-h - 0.005), K(0.1), K(0.09), Math.PI, Math.PI * 2, p.CHORD)
  if (lamp > 0.02) {
    const ctx = p.drawingContext as Ctx2D
    const r = K(0.14 + 0.6 * lamp)
    const cy = K(-h - 0.08)
    const g = ctx.createRadialGradient(K(lx), cy, 0, K(lx), cy, r)
    g.addColorStop(0, `rgba(255, 214, 140, ${(0.75 * lamp).toFixed(3)})`)
    g.addColorStop(0.35, `rgba(242, 170, 80, ${(0.28 * lamp).toFixed(3)})`)
    g.addColorStop(1, 'rgba(242, 170, 80, 0)')
    ctx.fillStyle = g
    ctx.fillRect(K(lx) - r, cy - r, r * 2, r * 2)
    // The flame.
    p.noStroke()
    p.fill(alpha(p, '#FFE7B0', Math.min(1, lamp * 1.4)))
    const fh = 0.05 + 0.06 * lamp
    p.ellipse(K(lx), K(-h - 0.05 - fh / 2), K(0.035), K(fh))
  }
}

/** A lotus leaf on its stem: the third Gnossienne's stones. `open` is how far its flower has opened, if it has one. */
function lotus(p: p5, k: number, w: number, h: number, day: Sky, weight: number, sway: number, open: number, flower: boolean): void {
  const K = (v: number) => v * k
  const leaf = mixHex('#5E8C77', day.lit, 0.25)
  const ink = alpha(p, day.line, 0.75)
  // The stem, from under the sea to the leaf's middle, bowed a little by the swell.
  p.noFill()
  p.stroke(mixHex('#4F7466', day.sea, 0.3))
  p.strokeWeight(Math.max(1, K(0.03)))
  p.bezier(K(w / 2 + sway * 0.4), K(0.3), K(w / 2 - 0.08 + sway), K(-h * 0.35), K(w / 2 + 0.06), K(-h * 0.7), K(w / 2), K(-h + 0.02))
  // The leaf: flat, with a rim turned up at its edge.
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(leaf)
  const rim = Math.min(0.06, 0.03 + w * 0.02)
  p.beginShape()
  p.vertex(K(0), K(-h - rim))
  p.quadraticVertex(K(0.02), K(-h + 0.035), K(w * 0.18), K(-h + 0.04))
  p.vertex(K(w * 0.82), K(-h + 0.04))
  p.quadraticVertex(K(w - 0.02), K(-h + 0.035), K(w), K(-h - rim))
  p.vertex(K(w - 0.03), K(-h))
  p.vertex(K(0.03), K(-h))
  p.endShape(p.CLOSE)
  if (!flower) return
  // The flower at the leaf's far end: a bud until the ball comes, then open.
  const fx = w - Math.min(0.24, w * 0.25)
  const fy = -h - 0.02
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  for (const i of [-2, 2, -1, 1, 0]) {
    const a = i * (0.16 + 0.34 * open)
    const len = 0.16 + 0.04 * open - Math.abs(i) * 0.018
    p.push()
    p.translate(K(fx), K(fy))
    p.rotate(a)
    p.fill(mixHex('#E4B9C0', '#F7E9E6', Math.abs(i) / 3))
    p.ellipse(0, K(-len / 2), K(0.06 + 0.025 * open), K(len))
    p.pop()
  }
}

/** The longest a stone is drawn in one piece: longer, it is several, each standing square to the curve of the sea. */
const SEGMENT = [1.5, 1.3, 1.1]

/** Every stone in the frame, in its piece's material. */
export const stones = scenery<null>('stones', (p, _s, c) => {
  const v = viewOf(p, c)
  const day = skyAt(c.t)
  const k = c.k
  for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
    const w = stone.u1 - stone.u0
    // Too small to be anything but a mark.
    if (w * k < 1.5 && v.wide > 0.9) continue
    const h = stone.h - sink(stone, c.t) + float(stone, c.t)
    const n = Math.max(1, Math.ceil(w / SEGMENT[stone.piece]))
    const gap = n > 1 ? 0.07 : 0
    const sw = (w - gap * (n - 1)) / n
    for (let j = 0; j < n; j++) {
      const u0 = stone.u0 + shift + j * (sw + gap)
      p.push()
      atSea(p, k, u0)
      if (stone.piece === 0) {
        column(p, k, sw, h, day, c.weight, 0.7 * pulse(stone, c.t))
      } else if (stone.piece === 1) {
        // Lit by the ball, and burning on behind it until dawn: Ariadne's thread in lamps.
        stele(p, k, sw, h, day, c.weight, lampLight(stone, c.t), j === 0)
      } else {
        const sway = 0.03 * osc(c.t, 0.11, stone.index + j)
        lotus(p, k, sw, h, day, c.weight, sway, bloom(stone, c.t), j === n - 1 && w > 0.9)
      }
      p.pop()
    }
  }
})

// ---------------------------------------------------------------- the light on the water

/** A chord still sounding on the water: which one, how long ago, and how hard it was played (a middling chord is 1). */
interface Sounding {
  i: number
  s: number
  v: number
}

let soundingAt = Number.NaN
let soundingNow: Sounding[] = []

/** The chords that have lately sounded at `t`. Asked for many times a frame, for one time: kept for that time. */
function sounding(t: number): Sounding[] {
  if (t === soundingAt) return soundingNow
  const out: Sounding[] = []
  for (let i = 0; i < CHORDS.length; i++) {
    const s = since(t, CHORDS[i].t)
    if (s >= 0 && s < 2.4) out.push({ i, s, v: CHORDS[i].v / 32 })
  }
  soundingAt = t
  soundingNow = out
  return out
}

/**
 * How bright glint `id` of a path of light on the water is at `t`: a slow shimmer, brighter as the music is fuller,
 * and a flash when a chord catches it. Each chord catches a different few, as hard as it was played, and they die
 * away over half a second.
 */
function glint(id: number, t: number, full: number, chords: Sounding[]): number {
  let a = (0.26 + 0.14 * osc(t, 0.19 + 0.35 * hash(id, 11), 6.28 * hash(id, 12))) * (0.4 + 0.6 * full)
  for (const ch of chords) {
    if (hash(id, ch.i, 13) > 0.45) continue
    a += 1.1 * ch.v * (1 - Math.exp(-ch.s / 0.02)) * Math.exp(-ch.s / 0.5)
  }
  return a
}

/**
 * A path of light on the water, drawn in a stone's frame at `u` (cells along): short strokes of `rgb` in rows going
 * down from the surface, spreading as they come nearer, as bright as `light`. The chords set it sparkling.
 */
function waterLight(p: p5, c: PieceCtx, u: number, light: number, rgb: string, rows: number, spread: number, seed: number): void {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const full = loudness(c.t)
  const chords = sounding(c.t)
  const top = -swell(u, c.t)
  const thick = Math.max(1.2, c.weight * 1.1)
  ctx.save()
  for (let j = 0; j < rows; j++) {
    const d = 0.06 + 0.07 * j + 0.0035 * j * j
    const fade = 1 - j / (rows + 1)
    for (let i = 0; i < 3; i++) {
      const id = seed * 131 + j * 3 + i
      const a = Math.min(0.95, light * fade * glint(id, c.t, full, chords))
      if (a < 0.015) continue
      const x = (hash(id, 14) - 0.5) * 2 * spread * (0.5 + d) + 0.025 * osc(c.t, 0.23, id)
      const len = (0.04 + 0.1 * hash(id, 15)) * (0.7 + 0.6 * d)
      ctx.fillStyle = `rgba(${rgb}, ${a.toFixed(3)})`
      ctx.fillRect(k * (x - len / 2), k * (top + d), k * len, thick)
    }
  }
  ctx.restore()
}

// ---------------------------------------------------------------- the sea

const DEPTH = 5

export const sea = scenery<null>('sea', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const day = skyAt(c.t)
  const k = c.k
  const whole = v.u1 - v.u0 >= LENGTH * 0.95
  const u0 = whole ? 0 : v.u0
  const u1 = whole ? LENGTH : v.u1
  const n = whole ? 360 : 220
  // The sea: a band from its surface (with the swell) down, darkening with depth.
  const g = ctx.createRadialGradient(0, 0, (RADIUS - DEPTH) * k, 0, 0, RADIUS * k)
  g.addColorStop(0, day.deep)
  g.addColorStop(1, day.sea)
  ctx.fillStyle = g
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n
    const [x, y] = polar(u, whole ? 0 : swell(u, c.t))
    if (i === 0) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  for (let i = n; i >= 0; i--) {
    const [x, y] = polar(u0 + ((u1 - u0) * i) / n, -DEPTH)
    ctx.lineTo(x * k, y * k)
  }
  ctx.closePath()
  ctx.fill()
  // The planet under the sea: deep water all the way down, lit a little from the side the day is on.
  {
    const r = (RADIUS - DEPTH + 0.02) * k
    const core = ctx.createRadialGradient(-0.35 * r, -0.45 * r, r * 0.1, 0, 0, r)
    core.addColorStop(0, mixHex(day.sea, day.deep, 0.55))
    core.addColorStop(1, day.deep)
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Wide: the planet's limb lit on the ball's side, where its day is, fading round to the far side's dark.
  if (v.wide > 0.01) {
    const face = along(c.t) / RADIUS - Math.PI / 2
    p.noFill()
    for (let i = 0; i < 6; i++) {
      const spread = 1.5 - i * 0.2
      p.stroke(alpha(p, mixHex(day.low, '#FFF1DA', 0.3), (0.12 + i * 0.06) * v.wide))
      p.strokeWeight(Math.max(1, (6 - i) * 1.4))
      p.arc(0, 0, RADIUS * 2 * k, RADIUS * 2 * k, face - spread, face + spread)
    }
  }

  if (!whole) {
    // Reflections: each stone a soft light going down into the water; a lit lamp a longer, warmer one, with its
    // path of light on the water.
    const ctx2 = p.drawingContext as Ctx2D
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      const w = stone.u1 - stone.u0
      const h = stone.h - sink(stone, c.t) + float(stone, c.t)
      const lit = stone.piece === 1 ? lampLight(stone, c.t) : 0
      p.push()
      atSea(p, k, stone.u0 + shift)
      const col = stone.piece === 0 ? day.lit : stone.piece === 1 ? '#8D7A5E' : '#7FA894'
      const depth = h * 0.8 * k
      const g = ctx2.createLinearGradient(0, 0, 0, depth)
      g.addColorStop(0, alpha(p, col, 0.11).toString())
      g.addColorStop(1, alpha(p, col, 0).toString())
      ctx2.fillStyle = g
      const wob = 0.015 * osc(c.t, 0.4, stone.index)
      // Under what stands in the water: the shafts, the posts, the stems; not the whole span.
      const under = stone.piece === 2 ? [w / 2] : w > 0.55 ? [0.12, w - 0.12] : [w / 2]
      for (const x of under) ctx2.fillRect(k * (wob + x - 0.07), k * 0.02, k * 0.14, depth)
      if (lit > 0.02) {
        const lg = ctx2.createLinearGradient(0, 0, 0, depth * 1.2)
        lg.addColorStop(0, `rgba(242, 180, 90, ${(0.4 * lit).toFixed(3)})`)
        lg.addColorStop(1, 'rgba(242, 180, 90, 0)')
        ctx2.fillStyle = lg
        const lx = w > 0.42 ? 0.1 : w / 2
        ctx2.fillRect(k * (lx - 0.05 + wob), k * 0.02, k * 0.1, depth * 1.2)
        p.translate(k * (lx + wob), 0)
        waterLight(p, c, stone.u0 + shift + lx, lit, '255, 206, 132', 6, 0.05, stone.index)
      }
      p.pop()
    }
    // The sun's and the moon's paths of light on the water, under them.
    {
      const m = ctx.getTransform()
      const cell = Math.hypot(m.a, m.b) * k
      const uh = along(c.t) + 0.55
      const [hx] = onCanvas(ctx, k, ...polar(uh, 0))
      for (const b of bodies(ctx, c, v, day)) {
        // Low over the sea it lays a long bright path; high, a fainter one; at the horizon it goes.
        const light = b.light * smooth(1.85 - Math.abs(b.angle), 0, 0.35) * (0.55 + 0.45 * Math.min(1, Math.abs(b.angle) / 1.2))
        if (light < 0.02) continue
        const ub = uh + (b.x - hx) / cell
        if (ub < v.u0 || ub > v.u1) continue
        p.push()
        atSea(p, k, ub)
        waterLight(p, c, ub, light, b.sun ? '255, 226, 178' : '226, 234, 248', 16, b.sun ? 0.22 : 0.16, b.sun ? 1 : 2)
        p.pop()
      }
    }
    // The surface: a line of light where the sky meets it, brighter along the swells' crests.
    p.noFill()
    p.stroke(alpha(p, day.low, 0.55))
    p.strokeWeight(Math.max(1, c.weight * 0.8))
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n
      const [x, y] = polar(u, swell(u, c.t))
      p.vertex(x * k, y * k)
    }
    p.endShape()
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, c.weight * 1.25)
    const foam = mixHex(day.low, '#FFF7EA', 0.6)
    const [fr, fg, fb] = [1, 3, 5].map((i) => parseInt(foam.slice(i, i + 2), 16))
    for (let i = 0; i < n; i++) {
      const ua = u0 + ((u1 - u0) * i) / n
      const ub = u0 + ((u1 - u0) * (i + 1)) / n
      const lift = crest((ua + ub) / 2, c.t)
      if (lift < 0.04) continue
      const [xa, ya] = polar(ua, swell(ua, c.t))
      const [xb, yb] = polar(ub, swell(ub, c.t))
      ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${(0.75 * lift).toFixed(3)})`
      ctx.beginPath()
      ctx.moveTo(xa * k, ya * k)
      ctx.lineTo(xb * k, yb * k)
      ctx.stroke()
    }
    ctx.restore()
  }
})

// ---------------------------------------------------------------- over the ball

/**
 * A grace note's spark: the grace leans on the melody note after it, a breath ahead of it, and strikes a light
 * where the ball is about to come down on that note, a lamp's wick in the first Gnossienne.
 */
const SPARKS = GRACES.map((g) => {
  const on = MELODY.find((n) => n.t > g.t) ?? MELODY[0]
  const b = ballLocal(on.t)
  return { t: g.t, u: b.u, h: b.h - BALL_R }
})

/** A soft round light, drawn once and stamped: a lamp, or an open flower, seen from far off. */
const halos = new Map<string, HTMLCanvasElement>()
function haloSprite(core: string, mid: string, edge: string): HTMLCanvasElement {
  const key = core + mid
  const got = halos.get(key)
  if (got) return got
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, `rgba(${core}, 1)`)
  r.addColorStop(0.12, `rgba(${mid}, 0.85)`)
  r.addColorStop(0.4, `rgba(${edge}, 0.22)`)
  r.addColorStop(1, `rgba(${edge}, 0)`)
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  halos.set(key, c)
  return c
}

export const glints = scenery<null>('glints', () => {}, (p, _s, c) => {
  const v = viewOf(p, c)
  const k = c.k
  const ctx = p.drawingContext as Ctx2D
  // A grace note's spark, just ahead of the ball.
  for (const g of SPARKS) {
    const s = since(c.t, g.t)
    if (s < 0 || s > 0.5) continue
    const a = (1 - Math.exp(-s / 0.012)) * Math.exp(-s / 0.13)
    const [x, y] = polar(g.u, g.h)
    ctx.save()
    const r = k * (0.05 + 0.06 * Math.min(1, s / 0.2))
    const glow = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r)
    glow.addColorStop(0, `rgba(255, 246, 220, ${(0.95 * a).toFixed(3)})`)
    glow.addColorStop(0.3, `rgba(255, 214, 150, ${(0.5 * a).toFixed(3)})`)
    glow.addColorStop(1, 'rgba(255, 214, 150, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(x * k - r, y * k - r, 2 * r, 2 * r)
    ctx.restore()
  }
  // Far off: the lamps the ball has lit tonight, a thread of lights round the planet, and after them, fainter, the
  // flowers it has opened.
  const afar = smooth(v.cells, 10, 26)
  if (afar > 0.01) {
    const lamp = haloSprite('255, 236, 196', '255, 214, 150', '242, 170, 80')
    const flower = haloSprite('250, 236, 238', '240, 204, 212', '214, 170, 196')
    const H = ctx.canvas.height
    const spots: [number, number, number, HTMLCanvasElement][] = []
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      if (stone.piece === 1) {
        const light = lampLight(stone, c.t)
        if (light < 0.02) continue
        const [x, y] = onCanvas(ctx, k, ...polar(stone.u0 + shift + 0.1, stone.h - sink(stone, c.t) + 0.08))
        spots.push([x, y, light, lamp])
      } else if (stone.piece === 2 && stone.u1 - stone.u0 > 0.9) {
        const open = bloom(stone, c.t)
        if (open < 0.02) continue
        const w = stone.u1 - stone.u0
        const fx = w - Math.min(0.24, (w / Math.ceil(w / SEGMENT[2])) * 0.25)
        const [x, y] = onCanvas(ctx, k, ...polar(stone.u0 + shift + fx, stone.h + float(stone, c.t) + 0.05))
        spots.push([x, y, 0.55 * open, flower])
      }
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (const [x, y, light, sprite] of spots) {
      const r = H * (0.006 + 0.008 * light)
      ctx.globalAlpha = Math.min(1, afar * light * 1.3)
      ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
    }
    ctx.restore()
  }
  // Wide: a light round the ball, so the eye can find it on the small planet.
  if (v.wide > 0.02) {
    const b = ballLocal(c.t)
    const [x, y] = polar(b.u, b.h)
    const r = 22 * Math.max(1, p.width / 1600)
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r)
    g.addColorStop(0, `rgba(255, 240, 210, ${(0.85 * v.wide).toFixed(3)})`)
    g.addColorStop(0.2, `rgba(255, 228, 180, ${(0.35 * v.wide).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255, 228, 180, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
})
