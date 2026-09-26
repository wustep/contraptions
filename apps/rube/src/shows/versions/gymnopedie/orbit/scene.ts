import type p5 from 'p5'
import { mixHex, type Piece, type PieceCtx } from '../../../../parts'
import { BASS, GRACES, PERIOD, wrap } from './music'
import { LENGTH, RADIUS, STONES, TOUCHES, along, ballLocal, since, sink, stonesIn, type Stone } from './path'
import { wideAt } from './camera'
import { alpha, hash, osc, polar, skyAt, smooth, type Sky } from './world'

/**
 * Everything on the planet but the ball, each a drawing told show time.
 *
 * - The sky: the day's gradient over the sea, the sun and the moon on their
 *   arcs, the stars, and, as the camera draws out, space round the planet.
 * - The stones: the melody, one material to a piece. The Gymnopédie's are
 *   columns of pale stone, the long notes lintels on two columns; the first
 *   Gnossienne's dark stelae, each with a lamp the ball lights as it lands,
 *   which burns down slowly behind it; the third's lotus leaves on stems, the
 *   longest with a flower that opens when the ball comes.
 * - The sea, over the stones' feet: the swell that each bass note sends out
 *   from under the ball, the stones' reflections, and a ring on the water
 *   under every landing.
 * - Over the ball: the glint of a grace note, and, once the planet is small
 *   in the frame, a light round the ball so it can still be found.
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

export const sky = scenery<null>('sky', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const day = skyAt(c.t)
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  // The horizon on the canvas: the sea under the frame's middle.
  const u = along(c.t)
  const [hx, hy] = onCanvas(ctx, c.k, ...polar(u + 0.55, 0))
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
  const reach = H * 0.62
  const body = (angle: number, radius: number, core: string, glow: string, light: number) => {
    if (Math.abs(angle) > 1.9 || light <= 0.01) return
    const bx = hx + Math.sin(angle) * reach * 1.25
    const by = hy - Math.cos(angle) * reach
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
  // Only close: once the planet draws away they are its sky's, not the frame's.
  const near = 1 - smooth(v.wide, 0, 0.25)
  body(sunAngle(c.t), H * 0.045, '#FFF1D6', 'rgba(255, 214, 160, A)', near * (1 - day.night * 0.8))
  body(moonAngle(c.t), H * 0.03, '#F2EEE2', 'rgba(200, 214, 240, A)', near * day.night)
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

/** 0 before the ball has landed on a stone, then how long ago it did (seconds), round the circle. */
const landed = (stone: Stone, t: number): number => since(t, stone.touches[0])

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
    const h = stone.h - sink(stone, c.t)
    const s = landed(stone, c.t)
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
        // Lit by the ball, and burning down slowly behind it: Ariadne's thread in lamps.
        const lamp = s < 0 ? 0 : Math.min(1, 0.5 * Math.exp(-s / 70) + 0.5 * Math.exp(-s / 1.8) + 0.45 * pulse(stone, c.t))
        stele(p, k, sw, h, day, c.weight, lamp, j === 0)
      } else {
        const sway = 0.03 * osc(c.t, 0.11, stone.index + j)
        const open = s < 0 ? 0 : smooth(s, 0, 2.2)
        lotus(p, k, sw, h, day, c.weight, sway, open, j === n - 1 && w > 0.9)
      }
      p.pop()
    }
  }
})

// ---------------------------------------------------------------- the sea

/** How high the sea stands at `u` at show time `t`: the swell each bass note sends out from under the ball, and a slow breath. */
function swell(u: number, t: number): number {
  let y = 0.018 * osc(t, 0.09, u * 0.9) + 0.012 * osc(t, 0.21, -u * 2.3)
  for (const b of BASS) {
    const s = since(t, b.t)
    if (s < 0 || s > 12) continue
    const from = along(b.t)
    let d = Math.abs(u - from) % LENGTH
    d = Math.min(d, LENGTH - d)
    const front = 0.85 * s
    const env = Math.exp(-s / 4.2) * (b.v / 46)
    y += 0.07 * env * Math.exp(-(((d - front) / 0.8) ** 2))
  }
  return y
}

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
    // Reflections: each stone a soft light going down into the water; a lit lamp a longer, warmer one.
    const ctx2 = p.drawingContext as Ctx2D
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      const w = stone.u1 - stone.u0
      const h = stone.h - sink(stone, c.t)
      const ago = since(c.t, stone.touches[0])
      const lit = stone.piece === 1 && ago >= 0 ? 0.5 * Math.exp(-ago / 70) + 0.5 * Math.exp(-ago / 1.8) : 0
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
      }
      p.pop()
    }
    // The surface: a line of light where the sky meets it.
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
    // A ring on the water under every landing.
    for (const touch of TOUCHES) {
      if (touch.kind === 'restrike') continue
      const s = since(c.t, touch.t)
      if (s < 0 || s > 3.2) continue
      const stone = STONES[touch.stone]
      let uc = (stone.u0 + stone.u1) / 2
      while (uc - along(c.t) > LENGTH / 2) uc -= LENGTH
      while (along(c.t) - uc > LENGTH / 2) uc += LENGTH
      if (uc < v.u0 || uc > v.u1) continue
      p.push()
      atSea(p, k, uc)
      p.noFill()
      p.stroke(alpha(p, day.low, 0.6 * (1 - s / 3.2)))
      p.strokeWeight(Math.max(1, c.weight * 0.7))
      const r = 0.12 + s * 0.42
      p.ellipse(0, k * swell(uc, c.t) * -1, k * r * 2, k * r * 0.22)
      p.pop()
    }
  }
})

// ---------------------------------------------------------------- over the ball

export const glints = scenery<null>('glints', () => {}, (p, _s, c) => {
  const v = viewOf(p, c)
  const k = c.k
  // A grace note: the ball catches the light, just before it lands.
  for (const g of GRACES) {
    const s = since(c.t, g.t)
    if (s < 0 || s > 0.45) continue
    const b = ballLocal(g.t)
    const [x, y] = polar(b.u, b.h + 0.2)
    const a = 1 - s / 0.45
    p.push()
    p.translate(x * k, y * k)
    p.rotate(b.u / RADIUS)
    p.stroke(alpha(p, '#FFF3D6', a))
    p.strokeWeight(Math.max(1, c.weight * 0.9))
    // A small four-pointed star, opening and fading.
    const r = k * (0.04 + 0.05 * (s / 0.45))
    p.noStroke()
    p.fill(alpha(p, '#FFF3D6', a))
    p.beginShape()
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.22 : r
      const th = (i * Math.PI) / 4
      p.vertex(Math.sin(th) * rr, -Math.cos(th) * rr)
    }
    p.endShape(p.CLOSE)
    p.pop()
  }
  // Wide: a light round the ball, so the eye can find it on the small planet.
  if (v.wide > 0.02) {
    const b = ballLocal(c.t)
    const [x, y] = polar(b.u, b.h)
    const ctx = p.drawingContext as Ctx2D
    const r = 22 * Math.max(1, p.width / 1600)
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r)
    g.addColorStop(0, `rgba(255, 240, 210, ${(0.85 * v.wide).toFixed(3)})`)
    g.addColorStop(0.2, `rgba(255, 228, 180, ${(0.35 * v.wide).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255, 228, 180, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
    ctx.fill()
  }
})
