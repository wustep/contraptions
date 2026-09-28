import type p5 from 'p5'
import { alpha, hash } from '../kit'
import { DARK } from '../worlds'

const TAU = Math.PI * 2

export interface LensLook {
  /** How far the far sky has turned (radians), and how far it slides with the camera going by. */
  turn: number
  shift: number
  /** The galaxy band's angle across the face. */
  band: number
  /** How many stars, and which. */
  stars: number
  seed: number
}

/**
 * The wormhole's face, one drawing for the sphere past the ring (Act I) and
 * the one past Saturn (Act II): the far side's sky, seen through a round
 * lens. Its stars are points, crowded toward the edge and smaller and dimmer
 * there, where the lensing squeezes the whole far sky into a thin ring; its
 * galaxy is one soft band across it; and just inside the rim the light
 * gathers a little, the one sign of the bending. No strokes drawn out along
 * the edge: at every size those read as a dashed ring, a second outline.
 * Drawn in the sphere's clip; the rim is the caller's, one line.
 */
export function lensFace(p: p5, k: number, sx: number, sy: number, rs: number, ink: string, look: LensLook): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  p.noStroke()
  p.fill(DARK.deep)
  p.circle(X(sx), X(sy), X(rs * 2))
  ctx.save()
  ctx.translate(X(sx + look.shift * 0.5), X(sy))
  ctx.rotate(look.band + look.turn)
  const band = ctx.createLinearGradient(0, X(-rs * 0.48), 0, X(rs * 0.48))
  band.addColorStop(0, 'rgba(110, 99, 201, 0)')
  band.addColorStop(0.5, 'rgba(110, 99, 201, 0.3)')
  band.addColorStop(1, 'rgba(110, 99, 201, 0)')
  ctx.fillStyle = band
  ctx.fillRect(X(-rs * 1.3), X(-rs * 0.48), X(rs * 2.6), X(rs * 0.96))
  ctx.restore()
  for (let j = 0; j < look.stars; j++) {
    const rho = hash(j, look.seed) ** 0.38
    const a = hash(j, look.seed + 1) * TAU + look.turn + look.shift * (1 - rho) * 0.6
    const r = rs * rho * 0.97
    const bright = 0.35 + 0.65 * hash(j, look.seed + 2)
    const squeezed = rho ** 6
    p.fill(alpha(p, ink, bright * (0.85 - 0.4 * squeezed)))
    p.circle(X(sx + Math.cos(a) * r), X(sy + Math.sin(a) * r), Math.max(1, X(0.026) * (0.6 + bright) * (1 - 0.45 * squeezed)))
  }
  // The light the lens gathers at its edge: soft, inside, no line. (Saved and restored, so p5's fill stays true.)
  ctx.save()
  const edge = ctx.createRadialGradient(X(sx), X(sy), X(rs * 0.72), X(sx), X(sy), X(rs))
  edge.addColorStop(0, 'rgba(143, 198, 230, 0)')
  edge.addColorStop(1, 'rgba(143, 198, 230, 0.16)')
  ctx.fillStyle = edge
  ctx.beginPath()
  ctx.arc(X(sx), X(sy), X(rs), 0, TAU)
  ctx.fill()
  ctx.restore()
}
