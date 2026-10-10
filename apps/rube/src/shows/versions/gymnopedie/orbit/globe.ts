import type { Ctx2D } from './frame'

/**
 * The planet seen from space, as a world in sunlight. Close, its deep water is coloured by the hour where the ball is;
 * but from far off half of any world is always in the sun's light, whatever the hour on it. So as the planet becomes the
 * picture its face becomes a lit globe: deep ocean blue on the sun's side with the sun's glint on the water, the
 * night coming round from the far side, and a thin blue air on the day's limb. The night side keeps its dark, the sea's own light and the lamps.
 */

/** The globe's own canvas, remade each frame it is drawn. */
let globeCanvas: HTMLCanvasElement | null = null

/**
 * The globe, in the world's transform (the planet's middle at the origin), `R` its radius in the drawing's units, the sun
 * that way (`sun`, radians clockwise from the world's up), as much of it as `light`.
 */
export function drawGlobe(ctx: Ctx2D, R: number, sun: number, light: number): void {
  if (light < 0.01) return
  // Drawn on a canvas of its own, square to the world as the stage is, then its night side rubbed out softly and the
  // rest laid on the stage: so the night side shows what is under it.
  const m = ctx.getTransform()
  const scale = Math.hypot(m.a, m.b)
  const Rd = Math.ceil(R * scale * 1.06)
  globeCanvas ??= document.createElement('canvas')
  if (globeCanvas.width !== 2 * Rd) {
    globeCanvas.width = 2 * Rd
    globeCanvas.height = 2 * Rd
  }
  const g = globeCanvas.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.clearRect(0, 0, 2 * Rd, 2 * Rd)
  g.setTransform(m.a, m.b, m.c, m.d, Rd, Rd)
  const sx = Math.sin(sun)
  const sy = -Math.cos(sun)
  g.save()
  g.beginPath()
  g.arc(0, 0, R, 0, Math.PI * 2)
  g.clip()
  // The ocean, lit from the sun's side.
  const ocean = g.createRadialGradient(sx * R * 0.5, sy * R * 0.5, R * 0.05, 0, 0, R * 1.08)
  ocean.addColorStop(0, '#3577A4')
  ocean.addColorStop(0.35, '#255581')
  ocean.addColorStop(0.62, '#173658')
  ocean.addColorStop(1, '#0B1A30')
  g.fillStyle = ocean
  g.fillRect(-R, -R, 2 * R, 2 * R)
  // The sun's glint on the water.
  const gx = sx * R * 0.52
  const gy = sy * R * 0.52
  const glint = g.createRadialGradient(gx, gy, 0, gx, gy, R * 0.26)
  glint.addColorStop(0, 'rgba(255, 246, 226, 0.32)')
  glint.addColorStop(0.3, 'rgba(255, 240, 214, 0.1)')
  glint.addColorStop(1, 'rgba(255, 240, 214, 0)')
  g.fillStyle = glint
  g.fillRect(gx - R * 0.26, gy - R * 0.26, R * 0.52, R * 0.52)
  // The night, coming round from the far side: the globe rubbed out there, softly.
  g.globalCompositeOperation = 'destination-out'
  const night = g.createLinearGradient(sx * R, sy * R, -sx * R, -sy * R)
  night.addColorStop(0, 'rgba(0, 0, 0, 0)')
  night.addColorStop(0.42, 'rgba(0, 0, 0, 0)')
  night.addColorStop(0.62, 'rgba(0, 0, 0, 0.75)')
  night.addColorStop(0.85, 'rgba(0, 0, 0, 1)')
  g.fillStyle = night
  g.fillRect(-R, -R, 2 * R, 2 * R)
  g.restore()
  g.globalCompositeOperation = 'source-over'
  // A thin blue air on the day's limb.
  const air = g.createRadialGradient(0, 0, R * 0.94, 0, 0, R * 1.04)
  air.addColorStop(0, 'rgba(120, 180, 240, 0)')
  air.addColorStop(0.6, 'rgba(130, 190, 245, 0.12)')
  air.addColorStop(1, 'rgba(130, 190, 245, 0)')
  g.strokeStyle = air
  g.lineWidth = R * 0.1
  // Arcs one inside the other's span, so it thins away towards the night with no end to it.
  for (const span of [1.5, 1.15, 0.8, 0.45]) {
    g.beginPath()
    g.arc(0, 0, R * 0.99, sun - Math.PI / 2 - span, sun - Math.PI / 2 + span)
    g.stroke()
  }
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = light
  ctx.drawImage(globeCanvas, m.e - Rd, m.f - Rd)
  ctx.restore()
}
