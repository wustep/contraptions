import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { box, frame, scenery, type Ctx } from '../kit'
import { BAND, SPLASH } from '../stack'
import { bloom, rgba } from '../cast'
import { RAIN } from '../worlds'
import { deckFace, drawBridge, drawCity, drawLampLight, drawRailing, drawStreet, seen, type Pen, type View } from './rain-city'
import { MAL_AT, MAL_FROM, MAL_TO, eff, sm, vanPose } from './rain-geo'
import { drawSpray, drawTraffic, drawTrain, trainBeam } from './rain-traffic'
import { drawVanBack, drawVanFront } from './rain-van'
import { drawRain, drawSplash, drawTicks, overRiver } from './rain-water'

/**
 * The rain's standing set, for the whole show, in the dream world's own cells: Yusuf's city in the rain, its street and
 * traffic, the bridge and the river, and the van (mine until they go under in it; `vanAt` from then). Everything moves
 * on the rain's clock, so in the director's wides of the climax the rain hangs in the air and the van hangs off the
 * bridge. Behind the balls: the city, the traffic and the train, the rain, the van's inside; over them: the van's body
 * and glass, the deck's face and railing, the river's water, the splash.
 */

const pen = (p: p5, c: Ctx): Pen => ({ p, k: c.k, ink: c.ink, w: c.weight, ctx: p.drawingContext as CanvasRenderingContext2D })
const inBand = (f: View): boolean => f.y1 > BAND.rain.top - 0.5 && f.y0 < BAND.rain.bottom + 0.5
const vanSeen = (f: View, t: number): boolean => {
  const v = vanPose(t)
  return seen(f, v.x - 4.5, v.x + 5.5, v.y - 1.6, v.y + 1.6)
}

export const rainSet = scenery<null>({
  name: 'rain-set',
  draw: (p, _s, c) => {
    const f = frame(p, c.k)
    if (!inBand(f)) return
    const P = pen(p, c)
    const t = c.t
    const te = eff(t)
    p.push()
    const ctx = P.ctx
    ctx.save()
    // Nothing of the rain outside its band.
    ctx.beginPath()
    ctx.rect((f.x0 - 2) * c.k, BAND.rain.top * c.k, (f.x1 - f.x0 + 4) * c.k, (BAND.rain.bottom - BAND.rain.top) * c.k)
    ctx.clip()
    drawCity(P, f, te)
    drawStreet(P, f, te)
    drawBridge(P, f)
    drawRailing(P, f)
    drawLampLight(P, f, te)
    drawTraffic(P, f, te)
    drawTrain(P, f, te)
    drawRain(P, f, t)
    // The drops the train's headlamp catches, lit in its beam.
    const b = trainBeam(te)
    if (b && seen(f, b.to[0] - 3, b.from[0] + 1, -4, 1)) {
      const dx = b.to[0] - b.from[0]
      const dy = b.to[1] - b.from[1]
      const L = Math.hypot(dx, dy)
      const nx = -dy / L
      const ny = dx / L
      const k = c.k
      ctx.save()
      ctx.beginPath()
      ctx.moveTo((b.from[0] + (nx * b.w0) / 2) * k, (b.from[1] + (ny * b.w0) / 2) * k)
      ctx.lineTo((b.to[0] + (nx * b.w1) / 2) * k, (b.to[1] + (ny * b.w1) / 2) * k)
      ctx.lineTo((b.to[0] - (nx * b.w1) / 2) * k, (b.to[1] - (ny * b.w1) / 2) * k)
      ctx.lineTo((b.from[0] - (nx * b.w0) / 2) * k, (b.from[1] - (ny * b.w0) / 2) * k)
      ctx.closePath()
      ctx.clip()
      drawRain(P, f, t, { color: RAIN.lamp, a: b.a })
      ctx.restore()
    }
    drawTicks(P, f, t)
    if (vanSeen(f, t)) drawVanBack(p, c.k, c.ink, c.weight, vanPose(t), t, sm((t - SPLASH) / 0.4))
    drawSpray(P, te)
    ctx.restore()
    p.pop()
  },
  over: (p, _s, c) => {
    const f = frame(p, c.k)
    if (!inBand(f)) return
    const P = pen(p, c)
    const t = c.t
    p.push()
    if (vanSeen(f, t)) drawVanFront(p, c.k, c.ink, c.weight, vanPose(t), t)
    if (seen(f, -31, 0.5, -0.2, 0.6)) deckFace(P)
    malLit(P, t)
    overRiver(P, f, t)
    drawSplash(P, f, t)
    p.pop()
  },
})

/**
 * Mal, lit once: the train's headlamp catches her as it comes, a still dark shape on the pavement warmed on the side
 * toward it, and the black of the locomotive goes by behind her.
 */
function malLit(P: Pen, t: number): void {
  if (t < MAL_FROM || t > MAL_TO) return
  const b = trainBeam(eff(t))
  if (!b) return
  const [mx, my] = MAL_AT
  const s = (b.from[0] - mx) / (b.from[0] - b.to[0])
  if (s <= 0 || s >= 1) return
  // Inside the cone at her height?
  const cy = b.from[1] + (b.to[1] - b.from[1]) * s
  const half = (b.w0 + (b.w1 - b.w0) * s) / 2
  // (The beam is soft: its light spreads well past its core, and off the wet street up onto her.)
  const inside = sm((half * 2.2 + 0.35 - Math.abs(my - cy)) / 0.6)
  const lit = inside * Math.pow(1 - s, 0.5) * sm(s / 0.06) * b.a
  if (lit < 0.01) return
  const { ctx, k } = P
  // A pool of the lamp's light on the wet pavement round her, and on her.
  bloom(P.p, k, [mx + 0.25, my + 0.08], 1.3, RAIN.lamp, 0.45 * lit)
  bloom(P.p, k, [mx + 0.1, my - 0.05], 0.75, RAIN.lamp, 0.85 * lit)
  ctx.save()
  ctx.strokeStyle = rgba(RAIN.windowLit, Math.min(1, 2.2 * lit))
  ctx.lineWidth = Math.max(1.6, 0.07 * k)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(mx * k, my * k, 0.115 * k, -1.1, 1.1)
  ctx.stroke()
  ctx.restore()
}

/** Everything the set may draw: the band across the whole width the camera may look. */
export const RAIN_CELLS: Pt[] = box(-84, BAND.rain.top, 86, BAND.rain.bottom, 2)
