import type p5 from 'p5'
import { R as BALL_R, mixHex, type PieceCtx } from '../../../../parts'
import { CHORDS, loudness } from './music'
import { LENGTH, RADIUS, along, ballLocal, crest, since, sink, squash, stonesIn, swell } from './path'
import {
  BANKS_OF_MIST, MIST, WHALE, auroraAt, auroraSheet, auroraSize, deepLight, rainAt, ringAt, whaleAt, whaleShape, inLayer, layered, mistAt,
} from './air'
import { BALL, alpha, hash, osc, polar, smooth, type Sky } from './world'
import {
  scenery, type Ctx2D, type View, viewOf, frameOf, onCanvas, atSea, weathered, bodies, sunWay, AURORA_OVER, lamplighter,
} from './frame'
import { lampLight, farStones } from './stones'

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

/** The sea's own light at night, woken by the swell. */
const GLOW = '120, 228, 214'
const GLOW_RGB = [120, 228, 214]
const mixRgb = (a: number[], b: number[], f: number): string => a.map((x, i) => Math.round(x + (b[i] - x) * f)).join(', ')

export const sea = scenery<null>('sea', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const day = weathered(c.t)
  const k = c.k
  const whole = v.u1 - v.u0 >= LENGTH * 0.95
  const u0 = whole ? 0 : v.u0
  const u1 = whole ? LENGTH : v.u1
  const n = whole ? 360 : 220
  // The sea: a band from its surface (with the swell) down, darkening with depth.
  const water = new Path2D()
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n
    const [x, y] = polar(u, whole ? 0 : swell(u, c.t))
    if (i === 0) water.moveTo(x * k, y * k)
    else water.lineTo(x * k, y * k)
  }
  for (let i = n; i >= 0; i--) {
    const [x, y] = polar(u0 + ((u1 - u0) * i) / n, -DEPTH)
    water.lineTo(x * k, y * k)
  }
  water.closePath()
  const g = ctx.createRadialGradient(0, 0, (RADIUS - DEPTH) * k, 0, 0, RADIUS * k)
  g.addColorStop(0, day.deep)
  g.addColorStop(1, day.sea)
  ctx.fillStyle = g
  ctx.fill(water)
  // The sky's own colour on the water, under its surface, as a calm sea gives it back.
  {
    const sheen = ctx.createRadialGradient(0, 0, (RADIUS - 1.6) * k, 0, 0, RADIUS * k)
    sheen.addColorStop(0, alpha(p, day.low, 0).toString())
    sheen.addColorStop(1, alpha(p, day.low, 0.42 * (1 - v.wide)).toString())
    ctx.fillStyle = sheen
    ctx.fill(water)
  }
  // The aurora given back by the water, faint, upside down about the horizon.
  const northern = auroraAt(c.t) * (1 - v.wide)
  if (northern > 0.01) {
    const W = ctx.canvas.width
    const [, hy] = onCanvas(ctx, k, ...polar(along(c.t) + 0.55, 0))
    const F = frameOf(ctx)
    const sheet = auroraSheet(c.t, ...auroraSize(W, F), along(c.t))
    ctx.save()
    ctx.clip(water)
    ctx.setTransform(1, 0, 0, -1, 0, 2 * hy)
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, 0.3 * northern)
    ctx.drawImage(sheet, 0, hy - AURORA_OVER * F, W, F)
    ctx.restore()
  }
  // The planet under the sea: deep water all the way down, lit a little from the side the sun is on.
  {
    const r = (RADIUS - DEPTH + 0.02) * k
    const sun = sunWay(c.t)
    const [ox, oy] = [Math.sin(sun) * 0.5 * r, -Math.cos(sun) * 0.5 * r]
    const core = ctx.createRadialGradient(ox, oy, r * 0.1, 0, 0, r * 1.05)
    core.addColorStop(0, mixHex(day.sea, day.deep, 0.5))
    core.addColorStop(1, day.deep)
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    // Far off, at night: the sea's own light all through the deep water, turning with the planet.
    const far = smooth(Math.log(v.cells), Math.log(22), Math.log(70)) * smooth(day.night, 0.3, 0.8)
    if (far > 0.01) {
      ctx.save()
      ctx.globalAlpha = far * (0.8 + 0.2 * osc(c.t, 0.02))
      const R = RADIUS * k
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(deepLight(), -R, -R, 2 * R, 2 * R)
      ctx.restore()
    }
    // And its far side from the sun in shadow, once it is small enough to be a world.
    const shade = smooth(v.wide, 0.1, 0.6)
    if (shade > 0.01) {
      const R = RADIUS * k
      const night = ctx.createLinearGradient(Math.sin(sun) * R, -Math.cos(sun) * R, -Math.sin(sun) * R, Math.cos(sun) * R)
      night.addColorStop(0, 'rgba(3, 5, 12, 0)')
      night.addColorStop(0.45, 'rgba(3, 5, 12, 0)')
      night.addColorStop(1, `rgba(3, 5, 12, ${(0.5 * shade).toFixed(3)})`)
      ctx.fillStyle = night
      ctx.beginPath()
      ctx.arc(0, 0, R + 0.05 * k, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Wide: the planet's limb lit on the ball's side, where its day is, fading round to the far side's dark; and warm
  // where the sun's light grazes its air, the dawn coming round.
  if (v.wide > 0.01) {
    const face = along(c.t) / RADIUS - Math.PI / 2
    p.noFill()
    // Widths in the picture's own measure: a share of the framed height, whatever the canvas's size or density (the
    // stroke is in drawing units, which the canvas's transform scales by its density).
    const m = ctx.getTransform()
    const unit = frameOf(ctx) / 720 / Math.hypot(m.a, m.b)
    for (let i = 0; i < 6; i++) {
      const spread = 1.5 - i * 0.2
      p.stroke(alpha(p, mixHex(day.low, '#FFF1DA', 0.3), (0.08 + i * 0.045) * v.wide))
      p.strokeWeight((6 - i) * 1.4 * unit)
      p.arc(0, 0, RADIUS * 2 * k, RADIUS * 2 * k, face - spread, face + spread)
    }
    const sunFace = sunWay(c.t) - Math.PI / 2
    const warm = mixHex(day.low, '#FFC48E', 0.65)
    const px = unit
    for (let i = 0; i < 7; i++) {
      const spread = 1.1 - i * 0.14
      p.stroke(alpha(p, warm, (0.05 + i * 0.05) * smooth(v.wide, 0.1, 0.55)))
      p.strokeWeight((8 - i) * 1.6 * px)
      p.arc(0, 0, RADIUS * 2 * k, RADIUS * 2 * k, sunFace - spread, sunFace + spread)
    }
  }

  // The whale, deep under the pond, before anything on the water is drawn over it.
  const whale = whaleAt(c.t)
  if (whale && !whole && whale.there > 0.01) {
    const u = along(c.t) + whale.d
    const { body, flukes, fin } = whaleShape(k, whale.beat)
    const m = ctx.getTransform()
    const cell = Math.hypot(m.a, m.b) * k
    p.push()
    atSea(p, k, u)
    ctx.translate(0, WHALE.depth * k)
    // Swimming the ball's way, nose ahead, rising and sinking a little with its stroke.
    ctx.translate(0, 0.06 * whale.beat * k)
    const shape = new Path2D()
    body.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
    shape.closePath()
    const tail = new Path2D()
    flukes.forEach(([x, y], i) => (i ? tail.lineTo(x, y) : tail.moveTo(x, y)))
    tail.closePath()
    fin.forEach(([x, y], i) => (i ? tail.lineTo(x, y) : tail.moveTo(x, y)))
    tail.closePath()
    // Soft-edged, as a shape seen through deep water: a wider, fainter pass under the body itself.
    const dark = mixHex(day.deep, '#03060E', 0.45)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = alpha(p, dark, 0.14 * whale.there).toString()
    ctx.lineWidth = cell * 0.12
    ctx.stroke(shape)
    ctx.fillStyle = alpha(p, dark, 0.36 * whale.there).toString()
    ctx.fill(shape)
    ctx.fill(tail)
    // Its outline in the sea's light: motes along its back and belly, flickering.
    for (let i = 0; i < body.length; i += 2) {
      const [x, y] = body[i]
      const a = whale.there * (0.18 + 0.22 * Math.max(0, osc(c.t, 0.21 + 0.05 * hash(i, 181), i * 1.7)))
      ctx.fillStyle = `rgba(${GLOW}, ${a.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(x, y, Math.max(0.8, cell * 0.009), 0, Math.PI * 2)
      ctx.fill()
    }
    p.pop()
  }

  // What is drawn only close (the reflections, the surface's light, the sea's glow, the rain's rings, the mist) is gone
  // before the camera is out far enough to draw the whole planet, so nothing of it goes out in one frame at the switch.
  const close = 1 - smooth(Math.log(v.cells), Math.log(CLOSE[0]), Math.log(CLOSE[1]))
  if (!whole && close > 0.005) {
    ctx.save()
    ctx.globalAlpha = close
    // Reflections: the stones upside down in the water, rippling, fading as they go down; a lit lamp a longer,
    // warmer streak too, with its path of light on the water.
    mirror(p, c, v, day, water, close)
    const ctx2 = p.drawingContext as Ctx2D
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      if (stone.piece !== 1) continue
      const lit = lampLight(stone, c.t)
      if (lit <= 0.02) continue
      const w = stone.u1 - stone.u0
      const h = stone.h - sink(stone, c.t)
      p.push()
      atSea(p, k, stone.u0 + shift)
      const depth = h * 0.8 * k
      const wob = 0.015 * osc(c.t, 0.4, stone.index)
      const lg = ctx2.createLinearGradient(0, 0, 0, depth * 1.2)
      lg.addColorStop(0, `rgba(242, 180, 90, ${(0.3 * lit).toFixed(3)})`)
      lg.addColorStop(1, 'rgba(242, 180, 90, 0)')
      ctx2.fillStyle = lg
      const lx = w > 0.42 ? 0.1 : w / 2
      ctx2.fillRect(k * (lx - 0.05 + wob), k * 0.02, k * 0.1, depth * 1.2)
      p.translate(k * (lx + wob), 0)
      waterLight(p, c, stone.u0 + shift + lx, lit, '255, 206, 132', 6, 0.05, stone.index)
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
    // At night the swell wakes the sea's light: the crest glows a cold green-blue as it runs.
    const glow = smooth(day.night, 0.4, 0.9)
    const cell = Math.hypot(ctx.getTransform().a, ctx.getTransform().b) * k
    for (let i = 0; i < n; i++) {
      const ua = u0 + ((u1 - u0) * i) / n
      const ub = u0 + ((u1 - u0) * (i + 1)) / n
      const lift = crest((ua + ub) / 2, c.t)
      if (lift < 0.04) continue
      const [xa, ya] = polar(ua, swell(ua, c.t))
      const [xb, yb] = polar(ub, swell(ub, c.t))
      if (glow > 0.01) {
        ctx.strokeStyle = `rgba(${GLOW}, ${(0.16 * lift * glow).toFixed(3)})`
        ctx.lineWidth = Math.max(3, cell * 0.09)
        ctx.beginPath()
        ctx.moveTo(xa * k, ya * k)
        ctx.lineTo(xb * k, yb * k)
        ctx.stroke()
        ctx.lineWidth = Math.max(1, c.weight * 1.25)
      }
      ctx.strokeStyle = glow > 0.01
        ? `rgba(${mixRgb([fr, fg, fb], GLOW_RGB, 0.6 * glow)}, ${(0.75 * lift).toFixed(3)})`
        : `rgba(${fr}, ${fg}, ${fb}, ${(0.75 * lift).toFixed(3)})`
      ctx.beginPath()
      ctx.moveTo(xa * k, ya * k)
      ctx.lineTo(xb * k, yb * k)
      ctx.stroke()
    }
    // And under it, the motes in the water light as the crest passes over them, and go out behind it.
    if (glow > 0.01) {
      const STEP = 0.11
      for (let j = Math.floor(v.u0 / STEP); j * STEP < v.u1; j++) {
        const u = (j + hash(j, 171)) * STEP
        const lit = crest(u, c.t)
        if (lit < 0.05) continue
        const depth = 0.04 + 0.55 * hash(j, 172) ** 1.6
        const a = glow * lit * (1 - depth) * 0.85
        const [x, y] = polar(u, swell(u, c.t) - depth)
        ctx.fillStyle = `rgba(${GLOW}, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(x * k, y * k, Math.max(0.8, cell * (0.008 + 0.01 * hash(j, 173))), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
    // The pond answers the ball: each time it comes down on a leaf, rings go out on the water from the leaf's stem, as
    // wide and as clear as the note was played, and smooth away.
    ctx.save()
    // Only on the water, under its surface: a ring is seen as an ellipse lying on it.
    ctx.clip(water)
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      if (stone.piece !== 2) continue
      const at = (stone.u0 + stone.u1) / 2 + shift
      for (let j = 0; j < stone.touches.length; j++) {
        if (j > 0 && !stone.bounced[j]) continue
        const r = leafRings(stone.touches[j], stone.weight[j], c.t)
        for (const ring of r) {
          const [x, y] = polar(at, swell(at, c.t) - 0.04 - ring.r * 0.16)
          ctx.save()
          ctx.lineWidth = Math.max(1, c.weight * 0.9)
          ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${ring.a.toFixed(3)})`
          ctx.beginPath()
          ctx.ellipse(x * k, y * k, ring.r * k, ring.r * k * 0.16, at / RADIUS, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      }
    }
    ctx.restore()
    // Rain: each drop's ring spreading on the water.
    const rain = rainAt(c.t)
    if (rain > 0.01) {
      const span = v.u1 - v.u0
      ctx.save()
      ctx.lineWidth = Math.max(1, c.weight * 0.8)
      for (let i = 0; i < 70; i++) {
        const r = ringAt(i, c.t)
        const u = v.u0 + r.x * span
        const depth = 0.03 + 0.45 * r.d ** 1.5
        const size = (0.04 + 0.2 * r.q) * (1 - 0.5 * depth)
        const a = rain * (1 - r.q) ** 1.5 * (0.55 - 0.6 * depth)
        if (a < 0.02) continue
        const [x, y] = polar(u, swell(u, c.t) - depth)
        ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.ellipse(x * k, y * k, size * k, size * k * 0.2, u / RADIUS, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
    // Mist lying on the water: at dawn, a little at dusk, and under the moon.
    const mist = mistAt(c.t) * (1 - v.wide)
    if (mist > 0.01) {
      const tint = mixHex(day.low, day.night > 0.5 ? '#B4C2DC' : '#FFFFFF', 0.35)
      const [mr, mg, mb] = [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16))
      const half = (v.u1 - v.u0) / 2
      const here = along(c.t)
      for (const bank of BANKS_OF_MIST) {
        const d = layered(bank.x, c.t, MIST.f, MIST.span, MIST.wind)
        const edge = inLayer(d, MIST.span)
        if (Math.abs(d) > half + bank.w / 2 || edge < 0.01) continue
        p.push()
        atSea(p, k, here + d)
        ctx.translate(0, -bank.h * k)
        ctx.scale((bank.w * k) / 2, (bank.th * k) / 2)
        const m = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        const a = 0.6 * mist * edge
        m.addColorStop(0, `rgba(${mr}, ${mg}, ${mb}, ${a.toFixed(3)})`)
        m.addColorStop(0.55, `rgba(${mr}, ${mg}, ${mb}, ${(a * 0.45).toFixed(3)})`)
        m.addColorStop(1, `rgba(${mr}, ${mg}, ${mb}, 0)`)
        ctx.fillStyle = m
        ctx.fillRect(-1, -1, 2, 2)
        p.pop()
      }
    }
    ctx.restore()
  }
})

/** Cells from which the things drawn only close begin to fade, and by which they are gone. */
export const CLOSE = [25, 33.5]

/**
 * The sea's mirror: a canvas half the size of the stage's, kept, that the stones are drawn into upside down. One to a
 * sketch: the stage's own, and each frame a still or a video is made in, which takes its own with it when it goes; so
 * making a still never leaves the stage's behind.
 */
const mirrors = new WeakMap<p5, p5.Graphics>()

/**
 * The stones given back by the sea: drawn upside down from their feet into the mirror, faded with depth and cut to the
 * water, and laid over the sea in rows, each shifted a little by the ripple, more the deeper it is.
 */
function mirror(p: p5, c: PieceCtx, v: View, day: Sky, water: Path2D, close: number): void {
  const ctx = p.drawingContext as Ctx2D
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  // Less as the camera draws out: far off, a reflection is a streak, not a picture.
  const strength = (0.34 + 0.16 * day.night) * (1 - v.wide) * (1 - 0.65 * smooth(Math.log(v.cells), Math.log(10), Math.log(28)))
  if (strength < 0.01) return
  // Where the water starts on the canvas, roughly: the highest point of its surface in the frame.
  const k = c.k
  let top = H
  for (let i = 0; i <= 12; i++) {
    const [, y] = onCanvas(ctx, k, ...polar(v.u0 + ((v.u1 - v.u0) * i) / 12, 0.25))
    top = Math.min(top, y)
  }
  top = Math.max(0, Math.floor(top / 2) * 2)
  if (top >= H) return
  // At half the stage's resolution: the ripple softens it anyway.
  const w = Math.ceil(W / 2)
  const h = Math.ceil(H / 2)
  let g = mirrors.get(p)
  if (!g) {
    g = p.createGraphics(w, h)
    g.pixelDensity(1)
    mirrors.set(p, g)
  }
  if (g.width !== w || g.height !== h) g.resizeCanvas(w, h)
  const gp = g as unknown as p5
  // The stage's drawing modes (`engine.ts`), which a canvas of its own does not have.
  gp.rectMode(gp.CENTER)
  gp.angleMode(gp.RADIANS)
  gp.strokeCap(gp.ROUND)
  gp.strokeJoin(gp.ROUND)
  const gc = g.drawingContext as Ctx2D
  gc.setTransform(1, 0, 0, 1, 0, 0)
  gc.globalCompositeOperation = 'source-over'
  gc.globalAlpha = 1
  gc.clearRect(0, top / 2, w, h - top / 2)
  gc.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]).multiply(ctx.getTransform()))
  farStones(gc, c, v, day, true, 0.8)
  // And the ball, upside down under itself, with its flame through the first Gnossienne.
  {
    const b = ballLocal(c.t)
    const lift = b.h - BALL_R * squash(c.t)
    const [x, y] = polar(b.u, -lift)
    const flame = lamplighter(c.t)
    if (flame > 0.01) {
      const r = k * 0.55
      const g = gc.createRadialGradient(x * k, y * k, k * BALL_R * 0.8, x * k, y * k, r)
      g.addColorStop(0, `rgba(255, 210, 140, ${(0.35 * flame).toFixed(3)})`)
      g.addColorStop(1, 'rgba(255, 190, 110, 0)')
      gc.fillStyle = g
      gc.fillRect(x * k - r, y * k - r, 2 * r, 2 * r)
    }
    gc.fillStyle = BALL
    gc.strokeStyle = day.line
    gc.lineWidth = c.weight
    gc.beginPath()
    gc.arc(x * k, y * k, BALL_R * k, 0, Math.PI * 2)
    gc.fill()
    gc.stroke()
  }
  // Faded with depth, and nothing of it out of the water.
  gc.globalCompositeOperation = 'destination-in'
  const fade = gc.createRadialGradient(0, 0, (RADIUS - 2.2) * k, 0, 0, RADIUS * k)
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  fade.addColorStop(0.55, 'rgba(0, 0, 0, 0.18)')
  fade.addColorStop(1, 'rgba(0, 0, 0, 1)')
  gc.fillStyle = fade
  gc.fill(water)
  gc.globalCompositeOperation = 'source-over'
  const src = (g as unknown as { elt: HTMLCanvasElement }).elt
  const F = frameOf(ctx)
  const row = Math.max(2, Math.round(F / 240 / 2) * 2)
  const amp = F / 1500
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = strength * close
  for (let y = top; y < H; y += row) {
    const deep = Math.min(0.6, (y - top) / F)
    const dx = amp * (0.5 + deep * 7) * (0.6 * osc(c.t, 0.42, (y / F) * 190) + 0.4 * osc(c.t, 0.27, -(y / F) * 311))
    ctx.drawImage(src, 0, y / 2, w, row / 2, dx, y, w * 2, row)
  }
  ctx.restore()
}

/**
 * The rings a landing on a leaf sends out at `t`: up to three, a fifth of a second apart, spreading at about a cell a
 * second and fading over three; as wide and as clear as the note was played (`weight`, a middling touch 1).
 */
export function leafRings(touch: number, weight: number, t: number): { r: number; a: number }[] {
  const s = since(t, touch)
  if (s < 0 || s > 3.6) return []
  const out: { r: number; a: number }[] = []
  for (let i = 0; i < 3; i++) {
    const q = s - i * 0.22
    if (q <= 0) continue
    const r = 0.1 + 0.55 * Math.sqrt(q) * (0.8 + 0.3 * weight)
    const a = 0.32 * Math.min(1, weight) * (1 - i * 0.28) * smooth(q, 0, 0.08) * (1 - smooth(q, 0.6, 3))
    if (a > 0.01) out.push({ r, a })
  }
  return out
}
