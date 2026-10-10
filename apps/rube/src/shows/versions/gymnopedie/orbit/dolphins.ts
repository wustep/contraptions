import { mixHex } from '../../../../parts'
import { BASS, wrap } from './music'
import { RADIUS, along } from './path'
import { hash, polar, smooth, type Sky } from './world'
import { devicePx, type Ctx2D } from './frame'

/**
 * Dolphins, once, in the morning: a pod of three in the near water, in front of the colonnade, leaping on the bass. Each
 * bass note of a passage of the Gymnopédie sends one of them up out of the water, in turn, so each leaps every third
 * bar; the bass's swell brings them up, as it does the sea's light at night. They swim against the ball's way, as the
 * boats do, so the pod crosses the frame slowly from one side to the other while it passes.
 *
 * Drawn in the frame square to the sea under the middle of the picture (cells across, and down from the horizon: the
 * further down, the nearer, the larger), each leap an arc that leaves the water and goes back in a little further on,
 * nose up as it rises and down as it dives, with a splash and spreading rings where it breaks the surface.
 */

/** The bass notes of the passage: one leap each. */
const FROM = 78
const TO = 101
export const LEAPS = BASS.filter((n) => n.piece === 0 && n.t > FROM && n.t < TO).map((n, j) => ({ t: n.t, v: n.v, who: j % 3 }))

/** How long a leap is out of the water, s. */
const AIR = 1.45

/** The three: how far down (nearer) each swims, and where in the pod. */
const POD = [
  { y: 0.82, x: 0 },
  { y: 1.02, x: 0.95 },
  { y: 0.66, x: -0.85 },
]

/** Where the pod is across the frame at `t`, cells from its middle: in from one side, out at the other. */
const podAt = (t: number): number => 6.6 - (13.4 * (t - FROM)) / (TO - FROM + 1.5)

/** How big a dolphin swimming `y` down from the horizon is drawn: nearer, larger. */
const sizeAt = (y: number): number => 0.62 + 0.4 * y

/** Whether the pod is about at `t`. */
export const dolphinsOut = (t: number): boolean => {
  const u = wrap(t)
  return u > FROM - 1 && u < TO + 4
}

/**
 * A dolphin's outline, nose to the left at (-0.5, 0), a unit long, up negative: back, fin, flukes, belly. Made on first
 * use, in the page (the checks load this module where there is no Path2D).
 */
let body: Path2D | null = null
const BODY = (): Path2D => (body ??= outline())
function outline(): Path2D {
  const p = new Path2D()
  p.moveTo(-0.5, 0.01)
  // The beak, and the melon over it.
  p.quadraticCurveTo(-0.47, -0.035, -0.4, -0.04)
  p.quadraticCurveTo(-0.33, -0.1, -0.2, -0.105)
  // The back, to the fin.
  p.quadraticCurveTo(-0.08, -0.11, -0.02, -0.1)
  p.quadraticCurveTo(0.04, -0.2, 0.12, -0.21)
  p.quadraticCurveTo(0.08, -0.15, 0.1, -0.085)
  // On to the tail stock and the flukes.
  p.quadraticCurveTo(0.28, -0.06, 0.4, -0.02)
  p.quadraticCurveTo(0.47, -0.07, 0.55, -0.08)
  p.quadraticCurveTo(0.5, -0.01, 0.52, 0.02)
  p.quadraticCurveTo(0.5, 0.06, 0.55, 0.1)
  p.quadraticCurveTo(0.46, 0.08, 0.4, 0.025)
  // The belly, back to the beak.
  p.quadraticCurveTo(0.2, 0.07, -0.05, 0.075)
  p.quadraticCurveTo(-0.3, 0.07, -0.42, 0.035)
  p.closePath()
  return p
}

/**
 * The pod, over the sea, in the world's transform. `light` is how much of it to draw; the near water is the frame's,
 * so it goes as the camera draws back.
 */
export function drawDolphins(ctx: Ctx2D, k: number, t: number, day: Sky, light: number): void {
  if (light < 0.01 || !dolphinsOut(t)) return
  const time = wrap(t)
  const u = along(t) + 0.55
  const [x, y] = polar(u, 0)
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.rotate(u / RADIUS)
  ctx.scale(k, k)
  const px = devicePx(ctx)
  // Their colours: slate, lit along the back from the sky, pale underneath; hazed a little with the morning.
  const back = mixHex(mixHex('#36434F', day.deep, 0.2), day.low, 0.1)
  const top = mixHex(back, mixHex(day.lit, day.low, 0.4), 0.35)
  const belly = mixHex(mixHex('#C8D0D3', day.low, 0.3), back, 0.2)
  const foam = mixHex(day.low, '#FFFFFF', 0.7)
  const pod = podAt(time)
  for (const leap of LEAPS) {
    const s = time - leap.t
    if (s < -0.6 || s > AIR + 2.4) continue
    const d = POD[leap.who]
    const size = sizeAt(d.y)
    const q = s / AIR
    // Its way: from where it leaves the water, a body and a half on to where it goes back in, up to the height its note
    // was played (a middling bass note, about half its length).
    const span = 1.5 * size
    const high = size * (0.42 + 0.12 * Math.min(1.4, leap.v / 44))
    const x0 = pod + d.x + span / 2
    const at = (q: number): [number, number] => [x0 - span * q, d.y - high * 4 * q * (1 - q)]
    // Before it breaks the surface, its shape under the water, coming up.
    if (q < 0.05) {
      const a = light * 0.22 * smooth(s, -0.6, 0) * (1 - smooth(q, 0, 0.05))
      ctx.save()
      ctx.translate(x0 + 0.3 * size, d.y + 0.05 * size)
      ctx.scale(size, size * 0.6)
      ctx.globalAlpha = a
      ctx.fillStyle = mixHex(day.deep, back, 0.5)
      ctx.fill(BODY())
      ctx.restore()
    }
    // In the air: only what is over its line on the water.
    if (q > 0 && q < 1) {
      const [bx, by] = at(q)
      const [nx, ny] = at(Math.min(1, q + 0.01))
      const [ox, oy] = at(Math.max(0, q - 0.01))
      const angle = Math.atan2(ny - oy, nx - ox) - Math.PI
      ctx.save()
      ctx.beginPath()
      ctx.rect(-50, -50, 100, 50 + d.y)
      ctx.clip()
      ctx.translate(bx, by)
      ctx.rotate(angle)
      // Its middle on the arc: arched with it a little.
      ctx.scale(size, size)
      ctx.globalAlpha = light
      const g = ctx.createLinearGradient(0, -0.2, 0, 0.08)
      g.addColorStop(0, top)
      g.addColorStop(0.45, back)
      g.addColorStop(0.8, belly)
      ctx.fillStyle = g
      ctx.fill(BODY())
      // The eye.
      ctx.fillStyle = mixHex(back, '#10161C', 0.6)
      ctx.beginPath()
      ctx.arc(-0.33, -0.035, Math.max(px / size, 0.008), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    // Where it breaks the water: a splash going up and falling back, and rings spreading on the surface.
    for (const [qBreak, wx] of [[0, x0], [1, x0 - span]] as [number, number][]) {
      const since = s - qBreak * AIR
      if (since < 0 || since > 2.4) continue
      // Spray: drops thrown up and falling back.
      const spray = light * (1 - smooth(since, 0.35, 0.8))
      if (spray > 0.01) {
        ctx.fillStyle = foam
        for (let i = 0; i < 14; i++) {
          const a = (hash(i, leap.t * 10, 501) - 0.5) * 1.6
          const v = size * (0.45 + 0.5 * hash(i, leap.t * 10, 502))
          const dx = Math.sin(a) * v * since
          const dy = -Math.cos(a) * v * since + 1.6 * size * since * since
          if (dy > 0.02) continue
          ctx.globalAlpha = spray * (0.5 + 0.5 * hash(i, leap.t * 10, 503))
          ctx.beginPath()
          ctx.arc(wx + dx, d.y + dy, Math.max(1.2 * px, 0.016 * size), 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // Rings, flattened on the water as it is seen.
      ctx.strokeStyle = foam
      ctx.lineWidth = Math.max(px, 0.008)
      for (let i = 0; i < 2; i++) {
        const r = size * (0.1 + 0.45 * Math.sqrt(Math.max(0, since - i * 0.25)))
        const a = light * 0.5 * (1 - i * 0.35) * smooth(since - i * 0.25, 0, 0.1) * (1 - smooth(since, 0.4, 2.4))
        if (a < 0.01) continue
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.ellipse(wx, d.y, r, r * 0.16, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}
