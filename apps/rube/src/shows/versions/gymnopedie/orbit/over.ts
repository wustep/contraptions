import { R as BALL_R, type PieceCtx } from '../../../../parts'
import { GRACES, MELODY } from './music'
import { LENGTH, RADIUS, STONES, along, ballLocal, float, since, sink, squash, stonesIn } from './path'
import { BREAK, FIREFLIES, FIREFLY, dropAt, rainAt, firefliesOut, inLayer, layered, overcastAt } from './air'
import { hash, osc, polar, smooth } from './world'
import { scenery, type Ctx2D, viewOf, frameOf, onCanvas, lamplighter, haloSprite, sunAngle, moonAngle, weathered, devicePx } from './frame'
import { lampLight, bloom, cadenceFronts, cadence, SEGMENT } from './stones'

// ---------------------------------------------------------------- over the ball

/**
 * A grace note's spark: the grace leans on the melody note after it, a breath ahead of it, and strikes a light
 * where the ball is about to come down on that note, a lamp's wick in the first Gnossienne.
 */
/**
 * The Gymnopédie's top note answered by the sun, as the Gnossiennes' are by the stars (`METEORS`): each time the ball
 * comes down on it, a star of sunlight catches the edge of the column's slab on the sun's side, and fades. In the
 * shower, the last of them is the cloud breaking, so it is not dimmed by it.
 */
const G1_TOP = Math.max(...MELODY.filter((n) => n.piece === 0).map((n) => n.p))
export const SUN_GLINTS = MELODY.filter((n) => n.piece === 0 && n.p === G1_TOP).map((n) => {
  const b = ballLocal(n.t + 0.02)
  const stone = STONES[b.stone]
  return { t: n.t, stone, v: n.v }
})

export const SPARKS = GRACES.map((g) => {
  const on = MELODY.find((n) => n.t > g.t) ?? MELODY[0]
  const b = ballLocal(on.t)
  const stone = STONES[b.stone]
  if (stone.piece === 1) {
    // At the wick of the lamp on the front of the beam, which the ball's landing then lights; clear of the ball.
    const w = stone.u1 - stone.u0
    const n = Math.max(1, Math.ceil(w / SEGMENT[1]))
    const sw = (w - 0.07 * (n - 1)) / n
    const lx = sw > 0.42 ? 0.1 : sw / 2
    const back = Math.round((b.u - (stone.u0 + stone.u1) / 2) / LENGTH) * LENGTH
    return { t: g.t, u: stone.u0 + back + lx, h: stone.h + 0.1, wick: true }
  }
  return { t: g.t, u: b.u, h: b.h - BALL_R, wick: false }
})

export const glints = scenery<null>('glints', () => {}, (p, _s, c) => {
  const v = viewOf(p, c)
  const k = c.k
  const ctx = p.drawingContext as Ctx2D
  // A grace note's spark, just ahead of the ball.
  for (const g of SPARKS) {
    const s = since(c.t, g.t)
    if (s < 0 || s > 0.7) continue
    const a = (1 - Math.exp(-s / 0.012)) * Math.exp(-s / 0.22)
    const [x, y] = polar(g.u, g.h)
    ctx.save()
    // A soft glow, wider than the ball coming down on it, so it shows round it.
    const r = k * (0.2 + 0.25 * Math.min(1, s / 0.25))
    const glow = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r)
    glow.addColorStop(0, `rgba(255, 246, 220, ${(0.95 * a).toFixed(3)})`)
    glow.addColorStop(0.3, `rgba(255, 214, 150, ${(0.5 * a).toFixed(3)})`)
    glow.addColorStop(1, 'rgba(255, 214, 150, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(x * k - r, y * k - r, 2 * r, 2 * r)
    // And a twinkle: four short rays, turning a little as they go.
    const len = k * (0.16 + 0.22 * Math.min(1, s / 0.15)) * a
    ctx.translate(x * k, y * k)
    ctx.rotate(g.u / RADIUS + 0.4 * s)
    ctx.strokeStyle = `rgba(255, 250, 232, ${(0.9 * a).toFixed(3)})`
    ctx.lineWidth = Math.max(devicePx(ctx), k * 0.012)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-len, 0)
    ctx.lineTo(len, 0)
    ctx.moveTo(0, -len)
    ctx.lineTo(0, len)
    ctx.stroke()
    ctx.restore()
  }
  // A sun-glint on the Gymnopédie's top note: a soft star on the slab's edge towards the sun, turning a little.
  const sunSide = Math.sin(sunAngle(c.t)) >= 0 ? 1 : -1
  for (const g of SUN_GLINTS) {
    const s = since(c.t, g.t)
    if (s < 0 || s > 2) continue
    const a = (1 - Math.exp(-s / 0.03)) * Math.exp(-s / 0.45) * Math.min(1, g.v / 45) * (g.t === BREAK ? 1 : 1 - 0.8 * overcastAt(c.t)) * (1 - v.wide)
    if (a < 0.01) continue
    const st = g.stone
    const back = Math.round((along(c.t) - (st.u0 + st.u1) / 2) / LENGTH) * LENGTH
    const u = (sunSide > 0 ? st.u1 - 0.05 : st.u0 + 0.05) + back
    const [x, y] = polar(u, st.h - sink(st, c.t))
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.rotate(u / RADIUS + 0.25 * s)
    ctx.globalCompositeOperation = 'lighter'
    const r = k * 0.5
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    glow.addColorStop(0, `rgba(255, 246, 214, ${(0.8 * a).toFixed(3)})`)
    glow.addColorStop(0.25, `rgba(255, 226, 170, ${(0.25 * a).toFixed(3)})`)
    glow.addColorStop(1, 'rgba(255, 226, 170, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    // Its rays, two long and two short, bright at the heart and fading to nothing at their tips.
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(devicePx(ctx), k * 0.014)
    const L = k * (0.35 + 0.25 * Math.min(1, s / 0.3))
    for (const [dx, dy] of [[L, 0], [0, L * 0.55]]) {
      const ray = ctx.createLinearGradient(-dx, -dy, dx, dy)
      ray.addColorStop(0, 'rgba(255, 250, 232, 0)')
      ray.addColorStop(0.5, `rgba(255, 250, 232, ${(0.9 * a).toFixed(3)})`)
      ray.addColorStop(1, 'rgba(255, 250, 232, 0)')
      ctx.strokeStyle = ray
      ctx.beginPath()
      ctx.moveTo(-dx, -dy)
      ctx.lineTo(dx, dy)
      ctx.stroke()
    }
    ctx.restore()
  }
  // Far off: the lamps the ball has lit tonight, a thread of lights round the planet, and after them, fainter, the
  // flowers it has opened.
  const afar = smooth(v.cells, 10, 26)
  if (afar > 0.01) {
    const lamp = haloSprite('255, 236, 196', '255, 214, 150', '242, 170, 80')
    const flower = haloSprite('250, 236, 238', '240, 204, 212', '214, 170, 196')
    const F = frameOf(ctx)
    const spots: [number, number, number, HTMLCanvasElement][] = []
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      if (stone.piece === 1) {
        const burning = lampLight(stone, c.t)
        if (burning < 0.02) continue
        const light = burning + 0.7 * cadence(stone, c.t)
        const [x, y] = onCanvas(ctx, k, ...polar(stone.u0 + shift + 0.1, stone.h - sink(stone, c.t) + 0.08))
        spots.push([x, y, light, lamp])
      } else if (stone.piece === 2 && stone.u1 - stone.u0 > 0.9) {
        const open = bloom(stone, c.t)
        if (open < 0.02) continue
        const w = stone.u1 - stone.u0
        const fx = w - Math.min(0.24, (w / Math.ceil(w / SEGMENT[2])) * 0.25)
        const [x, y] = onCanvas(ctx, k, ...polar(stone.u0 + shift + fx, stone.h + float(stone, c.t) + 0.05))
        spots.push([x, y, open * (0.55 + 0.8 * cadence(stone, c.t)), flower])
      }
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (const [x, y, light, sprite] of spots) {
      const r = F * (0.006 + 0.008 * light)
      ctx.globalAlpha = Math.min(1, afar * light * 1.3)
      ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
    }
    ctx.restore()
  }
  // Rain, falling past the frame.
  // In the air close by: not out in space, when the frame is the whole planet (in Overview).
  const rain = rainAt(c.t) * (1 - v.wide)
  if (rain > 0.01) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const len = frameOf(ctx) * 0.04
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.lineCap = 'round'
    // A pixel at the least, and fainter where that is thicker than its share of the frame, so a small picture's rain
    // is as light as a large one's.
    const thin = frameOf(ctx) / 900
    ctx.lineWidth = Math.max(1, thin)
    ctx.strokeStyle = `rgba(226, 232, 242, ${(0.28 * rain * Math.min(1, thin / 0.8)).toFixed(3)})`
    ctx.beginPath()
    const count = Math.round(260 * rain)
    for (let i = 0; i < count; i++) {
      const d = dropAt(i, c.t)
      const x = d.x * (W + len) - len * 0.2
      const y = d.y * (H + len) - len
      ctx.moveTo(x, y)
      ctx.lineTo(x - len * 0.18, y + len)
    }
    ctx.stroke()
    ctx.restore()
  }
  // Fireflies over the pond, close: each wandering a little, blinking slowly on and off.
  const flies = firefliesOut(c.t) * (1 - smooth(v.cells, 9, 16))
  if (flies > 0.01) {
    const sprite = haloSprite('255, 252, 220', '232, 246, 168', '190, 226, 120')
    const m = ctx.getTransform()
    const cell = Math.hypot(m.a, m.b) * k
    const here = along(c.t)
    const half = (v.u1 - v.u0) / 2
    ctx.save()
    const ball = ballLocal(c.t)
    for (const f of FIREFLIES) {
      const d = layered(f.x, c.t, FIREFLY.f, FIREFLY.span, FIREFLY.wind) + 0.3 * osc(c.t, 0.035 + 0.03 * hash(f.seed, 141), f.seed)
      const edge = inLayer(d, FIREFLY.span)
      if (Math.abs(d) > half || edge < 0.01) continue
      const h = f.h + 0.22 * osc(c.t, 0.05 + 0.04 * hash(f.seed, 142), f.seed * 1.3)
      const dd = d
      const blink = Math.max(0, osc(c.t, 0.08 + 0.07 * hash(f.seed, 143), f.seed * 2.7)) ** 1.5
      // One the ball comes close to goes dim, as if behind it, so none is seen over it (and none is moved).
      const nearBall = smooth(Math.hypot(here + dd - ball.u, h - ball.h), 0.12, 0.35)
      const a = flies * edge * (0.25 + 0.75 * blink) * nearBall
      if (a < 0.02) continue
      const [x, y] = onCanvas(ctx, k, ...polar(here + dd, h), m)
      const r = cell * (0.1 + 0.16 * blink)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = a
      ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
      ctx.fillStyle = '#F6FBD2'
      ctx.beginPath()
      ctx.arc(x, y, Math.max(1, cell * 0.012), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  // A cadence's wave, running back along the way: its front a soft light over the stones it is passing, gold over the
  // lamps, pink over the flowers, warm over the columns in the sunset.
  for (const front of cadenceFronts(c.t)) {
    const near = stonesIn(front.u - 0.6, front.u + 0.6)
    if (!near.length) continue
    const { stone, shift } = near[0]
    const m = ctx.getTransform()
    const cell = Math.hypot(m.a, m.b) * k
    const at = front.u - shift
    const h = stone.h - sink(stone, c.t) + float(stone, c.t) + 0.1
    const [x, y] = onCanvas(ctx, k, ...polar(at + shift, h))
    const sprite = stone.piece === 2
      ? haloSprite('255, 244, 246', '244, 206, 218', '220, 170, 200')
      : stone.piece === 1
        ? haloSprite('255, 240, 204', '255, 214, 150', '242, 170, 80')
        : haloSprite('255, 248, 232', '255, 226, 186', '255, 196, 150')
    const r = Math.max(frameOf(ctx) * 0.03, cell * 0.9)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'lighter'
    // It is the night's light running back: it shines only where a lamp still burns or a flower is still open, and so
    // goes out where it meets the dawn coming round the other way.
    const still = stone.piece === 1 ? Math.min(1, lampLight(stone, c.t) / 0.5) : stone.piece === 2 ? bloom(stone, c.t) : 1
    ctx.globalAlpha = Math.min(1, 0.9 * front.light * still)
    ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
    ctx.restore()
  }
  // The lamplighter's own light: through the first Gnossienne the ball carries a small warm glow, the flame it lights
  // the lamps with, breathing a little.
  const flame = lamplighter(c.t) * (1 - v.wide)
  if (flame > 0.01) {
    const b = ballLocal(c.t)
    const [x, y] = polar(b.u, b.h)
    const r = k * (0.55 + 0.05 * osc(c.t, 0.31))
    const g = ctx.createRadialGradient(x * k, y * k, k * BALL_R * 0.8, x * k, y * k, r)
    g.addColorStop(0, `rgba(255, 210, 140, ${(0.3 * flame).toFixed(3)})`)
    g.addColorStop(0.35, `rgba(255, 190, 110, ${(0.1 * flame).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255, 190, 110, 0)')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g
    ctx.fillRect(x * k - r, y * k - r, 2 * r, 2 * r)
    ctx.restore()
  }
  // The ball in the light it is in: shaded on the side away from the sun by day, or the moon by night, with a rim of
  // the light on its lit side; through the first Gnossienne, lit by its own flame, all round.
  if (v.wide < 0.5) shadeBall(ctx, c)
  // Wide: a light round the ball, so the eye can find it on the small planet.
  if (v.wide > 0.02) {
    const b = ballLocal(c.t)
    const [x, y] = polar(b.u, b.h)
    // Sized by the canvas in device pixels, and drawn under its transform, which scales by its density.
    const W = ctx.canvas.width
    const tm = ctx.getTransform()
    const r = (22 * Math.max(W / 1600, Math.min(1, W / 1280))) / Math.hypot(tm.a, tm.b)
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
  // Last, over everything: the frame's corners a little in shade, so the eye goes to its middle, where the ball is,
  // and the many things in the picture sit together as one.
  vignette(ctx)
})

/**
 * The ball, lit: the stage draws it a flat disc, so over it, clipped to its outline as the stage drew it (squashed as
 * it lands), a shade across it from the side the light comes from, and a thin rim of that light.
 */
function shadeBall(ctx: Ctx2D, c: PieceCtx): void {
  const t = c.t
  const day = weathered(t)
  const sun = sunAngle(t)
  const moon = moonAngle(t)
  const sunUp = smooth(1.8 - Math.abs(sun), 0, 0.3) * (1 - day.night)
  const moonUp = smooth(1.85 - Math.abs(moon), 0, 0.3) * day.night
  const flame = lamplighter(t)
  const by = sunUp >= moonUp ? sun : moon
  const strength = Math.max(sunUp, moonUp) * (1 - 0.5 * overcastAt(t)) * (1 - flame)
  if (strength < 0.02) return
  const k = c.k
  const b = ballLocal(t)
  const q = squash(t)
  const [x, y] = polar(b.u, b.h - BALL_R * q)
  const rx = BALL_R * k * (1 + q)
  const ry = BALL_R * k * (1 - q)
  // The light's way in the ball's frame: `by` is from overhead, east (the ball's way) positive.
  const lx = Math.sin(by)
  const ly = -Math.cos(by)
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.rotate(b.u / RADIUS)
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * 0.97, ry * 0.97, 0, 0, Math.PI * 2)
  ctx.clip()
  // A sphere's light: brightest a little in from its lit edge, darkening round to the far side.
  const r = Math.max(rx, ry)
  const g = ctx.createRadialGradient(lx * r * 0.42, ly * r * 0.42, 0, lx * r * 0.2, ly * r * 0.2, r * 1.45)
  const lit = sunUp >= moonUp ? '255, 238, 204' : '220, 230, 248'
  g.addColorStop(0, `rgba(${lit}, ${(0.28 * strength).toFixed(3)})`)
  g.addColorStop(0.4, `rgba(${lit}, 0)`)
  g.addColorStop(0.62, 'rgba(40, 44, 70, 0)')
  g.addColorStop(1, `rgba(40, 44, 70, ${(0.34 * strength).toFixed(3)})`)
  ctx.fillStyle = g
  ctx.fillRect(-rx, -ry, 2 * rx, 2 * ry)
  ctx.restore()
}

/** How dark the frame's corners are, at their darkest. */
export const VIGNETTE = 0.18

/** A soft darkening towards the frame's corners, as a lens gives, over the whole picture. */
function vignette(ctx: Ctx2D): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const r = Math.hypot(W, H) / 2
  ctx.save()
  ctx.setTransform(W / (2 * r), 0, 0, H / (2 * r), W / 2, H / 2)
  const g = ctx.createRadialGradient(0, 0, r * 0.62, 0, 0, r * 1.02)
  g.addColorStop(0, 'rgba(8, 10, 22, 0)')
  g.addColorStop(1, `rgba(8, 10, 22, ${VIGNETTE})`)
  ctx.fillStyle = g
  ctx.fillRect(-r, -r, 2 * r, 2 * r)
  ctx.restore()
}
