import { R as BALL_R, type PieceCtx } from '../../../../parts'
import { GRACES, MELODY } from './music'
import { RADIUS, along, ballLocal, float, since, sink, squash, stonesIn } from './path'
import { titlesAt } from './titles'
import { FIREFLIES, FIREFLY, dropAt, rainAt, firefliesOut, inLayer, layered, overcastAt } from './air'
import { hash, osc, polar, smooth } from './world'
import { scenery, type Ctx2D, viewOf, frameOf, onCanvas, lamplighter, haloSprite, sunAngle, moonAngle, weathered } from './frame'
import { lampLight, bloom, cadenceFronts, cadence, SEGMENT } from './stones'

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

export const glints = scenery<null>('glints', () => {}, (p, _s, c) => {
  const v = viewOf(p, c)
  const k = c.k
  const ctx = p.drawingContext as Ctx2D
  // A grace note's spark, just ahead of the ball.
  for (const g of SPARKS) {
    const s = since(c.t, g.t)
    if (s < 0 || s > 0.7) continue
    const a = (1 - Math.exp(-s / 0.012)) * Math.exp(-s / 0.2)
    const [x, y] = polar(g.u, g.h)
    ctx.save()
    const r = k * (0.08 + 0.12 * Math.min(1, s / 0.25))
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
  const rain = rainAt(c.t)
  if (rain > 0.01) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const len = frameOf(ctx) * 0.04
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, frameOf(ctx) / 900)
    ctx.strokeStyle = `rgba(226, 232, 242, ${(0.28 * rain).toFixed(3)})`
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
    for (const f of FIREFLIES) {
      const d = layered(f.x, c.t, FIREFLY.f, FIREFLY.span, FIREFLY.wind) + 0.3 * osc(c.t, 0.035 + 0.03 * hash(f.seed, 141), f.seed)
      const edge = inLayer(d, FIREFLY.span)
      if (Math.abs(d) > half || edge < 0.01) continue
      const h = f.h + 0.22 * osc(c.t, 0.05 + 0.04 * hash(f.seed, 142), f.seed * 1.3)
      const blink = Math.max(0, osc(c.t, 0.08 + 0.07 * hash(f.seed, 143), f.seed * 2.7)) ** 1.5
      const a = flies * edge * (0.25 + 0.75 * blink)
      if (a < 0.02) continue
      const [x, y] = onCanvas(ctx, k, ...polar(here + d, h), m)
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
    ctx.globalAlpha = Math.min(1, 0.9 * front.light)
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
  // Under each card of words while it is up, a soft veil of the dark, so the page's words read over the bright limb
  // and the ring of lamps they come over, as a film's titles are shaded; it comes and goes with its card.
  const cards = titlesAt(c.t)
  if (cards.length) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const fw = Math.min(W, (H * 16) / 9)
    const fh = (fw * 9) / 16
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (const card of cards) {
      const tall = fh * (0.035 + (card.title ? 0.09 : 0.065) * card.names.length + 0.032 * (card.notes?.length ?? 0) + (card.role ? 0.03 : 0))
      const x = (W - fw) / 2 + card.at[0] * fw
      const y = (H - fh) / 2 + card.at[1] * fh + tall / 2
      const rx = fw * 0.38
      const ry = tall * 0.85 + fh * 0.06
      ctx.setTransform(rx, 0, 0, ry, x, y)
      const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      const a = 0.3 * card.light
      veil.addColorStop(0, `rgba(5, 7, 16, ${a.toFixed(3)})`)
      veil.addColorStop(0.55, `rgba(5, 7, 16, ${(a * 0.6).toFixed(3)})`)
      veil.addColorStop(1, 'rgba(5, 7, 16, 0)')
      ctx.fillStyle = veil
      ctx.fillRect(-1, -1, 2, 2)
    }
    ctx.restore()
  }
  // The ball in the light it is in: shaded on the side away from the sun by day, or the moon by night, with a rim of
  // the light on its lit side; through the first Gnossienne, lit by its own flame, all round.
  if (v.wide < 0.5) shadeBall(ctx, c)
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
