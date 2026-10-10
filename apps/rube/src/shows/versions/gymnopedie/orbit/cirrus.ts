import { mixHex } from '../../../../parts'
import { inLayer, layered, overcastAt, repeatOf } from './air'
import { RADIUS, along } from './path'
import { hash, polar, skyAt, smooth } from './world'
import { sunAngle, type Ctx2D } from './frame'

/**
 * Cirrus: high thin cloud, mares' tails, far above the cumulus, in a layer of its own that goes by slowest of all the
 * air's. By day a faint white; as the sun goes down they take its light, gold and then orange and pink, brightest towards
 * the sun, and go on glowing after it has set (the afterglow), pink to mauve, until the light leaves them grey and the
 * night has them. And so again, the other way round, before the dawn.
 */

export const CIRRUS = { f: 0.06, span: repeatOf(0.06, 1), wind: 2 }

export const WISPS = Array.from({ length: 13 }, (_, i) => ({
  x: ((i + 0.15 + 0.7 * hash(i, 801)) * CIRRUS.span) / 13,
  h: 3.0 + 1.7 * hash(i, 802),
  len: 2.4 + 2.6 * hash(i, 803),
  tilt: (hash(i, 804) - 0.5) * 0.12,
  kind: Math.floor(hash(i, 805) * 4),
  flip: hash(i, 806) < 0.5,
}))

const SPRITE_W = 512
const SPRITE_H = 96
let sprites: HTMLCanvasElement[] | null = null

/** Four wisps, drawn once in white: fine strands sweeping along, hooked up at one end. */
function wispSprites(): HTMLCanvasElement[] {
  return [0, 1, 2, 3].map((kind) => {
    const c = document.createElement('canvas')
    c.width = SPRITE_W
    c.height = SPRITE_H
    const g = c.getContext('2d')!
    g.lineCap = 'round'
    const n = 34
    for (let i = 0; i < n; i++) {
      const y = SPRITE_H * (0.45 + 0.4 * (hash(kind, i, 811) - 0.5))
      const x0 = SPRITE_W * (0.04 + 0.3 * hash(kind, i, 812))
      const x1 = SPRITE_W * (0.55 + 0.4 * hash(kind, i, 813))
      const hook = SPRITE_H * (0.15 + 0.3 * hash(kind, i, 814))
      // Thinner and fainter towards the strand's ends.
      const grad = g.createLinearGradient(x0, 0, x1, 0)
      const a = 0.05 + 0.09 * hash(kind, i, 815)
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)')
      grad.addColorStop(0.25, `rgba(255, 255, 255, ${a.toFixed(3)})`)
      grad.addColorStop(0.7, `rgba(255, 255, 255, ${(a * 0.9).toFixed(3)})`)
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      g.strokeStyle = grad
      g.lineWidth = 1.5 + 4 * hash(kind, i, 816)
      g.beginPath()
      g.moveTo(x0, y)
      // Swept along, and hooked up at the far end: the mare's tail.
      g.bezierCurveTo(x0 + (x1 - x0) * 0.4, y + 6 * (hash(kind, i, 817) - 0.5), x1 - 30, y - 4, x1, y - hook)
      g.stroke()
    }
    return c
  })
}

/** The wisps tinted one colour: remade only when the colour has moved on. */
const tinted = new Map<string, HTMLCanvasElement[]>()
function tintedSprites(colour: string): HTMLCanvasElement[] {
  const got = tinted.get(colour)
  if (got) return got
  sprites ??= wispSprites()
  const out = sprites.map((s) => {
    const c = document.createElement('canvas')
    c.width = SPRITE_W
    c.height = SPRITE_H
    const g = c.getContext('2d')!
    g.drawImage(s, 0, 0)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = colour
    g.fillRect(0, 0, SPRITE_W, SPRITE_H)
    return c
  })
  if (tinted.size > 24) tinted.delete(tinted.keys().next().value!)
  tinted.set(colour, out)
  return out
}

/** Their light at `t`: what colour, and how much of them is seen. */
export function cirrusLight(t: number): { colour: string; light: number; glow: number } {
  // How far the sun is below (positive) or above (negative) the horizon, radians, taken within a half-turn.
  const a = sunAngle(t)
  const below = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) - 1.75
  const keys: [number, string, number, number][] = [
    // below, colour, how much is seen, how much they glow (lit from under by a low sun).
    // By day only a trace: the sunset is their moment, and the noon sky has its cumulus.
    [-1.6, '#FFFFFF', 0.16, 0],
    [-0.5, '#FFF4E2', 0.22, 0],
    [-0.2, '#FFDCA8', 0.5, 0.35],
    [0.0, '#FFB28A', 0.62, 0.7],
    [0.18, '#EE92A6', 0.6, 0.55],
    [0.4, '#B884A8', 0.42, 0.2],
    [0.7, '#6E6E8E', 0.22, 0],
    [1.0, '#3A3E5C', 0, 0],
  ]
  let i = 0
  while (i + 2 < keys.length && keys[i + 1][0] <= below) i++
  const [x0, c0, l0, g0] = keys[i]
  const [x1, c1, l1, g1] = keys[i + 1]
  const f = smooth(below, x0, x1)
  // And the afterglow ends as the sky goes dark: they are gone in the full night, and back as it lifts before the dawn.
  const clear = (1 - overcastAt(t)) * (1 - smooth(skyAt(t).night, 0.6, 0.88))
  return { colour: mixHex(c0, c1, f), light: (l0 + (l1 - l0) * f) * clear, glow: (g0 + (g1 - g0) * f) * clear }
}

/** Colours a little apart are one colour here, so the tinted wisps are remade only now and then. */
const quantise = (hex: string): string =>
  '#' + [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) / 6) * 6).toString(16).padStart(2, '0')).join('')

/**
 * The cirrus, in the world's transform, each wisp at its place in its layer, high over the sea: brighter on the side of
 * the frame the sun is on (`sunX`, device pixels across the canvas), as cloud is when lit from behind.
 */
export function drawCirrus(ctx: Ctx2D, k: number, t: number, half: number, sunX: number, alpha: number): void {
  const { colour, light, glow } = cirrusLight(t)
  if (light * alpha < 0.01) return
  const set = tintedSprites(quantise(colour))
  const u = along(t)
  const W = ctx.canvas.width
  const m = ctx.getTransform()
  for (const w of WISPS) {
    const d = layered(w.x, t, CIRRUS.f, CIRRUS.span, CIRRUS.wind)
    const edge = inLayer(d, CIRRUS.span)
    if (Math.abs(d) > half + w.len || edge < 0.01) continue
    const [px, py] = polar(u + d, w.h)
    // Towards the sun, brighter.
    const sx = m.a * px * k + m.c * py * k + m.e
    const near = Math.exp(-(((sx - sunX) / (W * 0.45)) ** 2))
    const a = alpha * edge * light * (0.7 + 0.6 * near * (0.4 + glow))
    if (a < 0.01) continue
    ctx.save()
    ctx.translate(px * k, py * k)
    ctx.rotate((u + d) / RADIUS + w.tilt)
    if (w.flip) ctx.scale(-1, 1)
    const L = w.len * k
    const H = (w.len * k * SPRITE_H) / SPRITE_W
    ctx.globalAlpha = Math.min(1, a * 1.6)
    ctx.drawImage(set[w.kind], -L / 2, -H / 2, L, H)
    // Lit from under by the low sun: a glow over them.
    if (glow > 0.01) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.min(1, a * glow * 1.2 * (0.5 + near))
      ctx.drawImage(set[w.kind], -L / 2, -H / 2, L, H)
    }
    ctx.restore()
  }
}
