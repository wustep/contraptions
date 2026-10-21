import { blob, fill, mix, poly, rgba, vgrad, type Paint } from '../paint'

/**
 * The Atreides frigate, side on: a great dark pebble of a ship, long and low, its belly flat, a dark band along its
 * waist and a row of small ports; three vents under it, and, while it holds itself up, a short stub of shaken air under
 * each (a plain pale veil, no glow, no beam). About 15 cells long and 4.4 tall, its middle at the origin. It carries the
 * house, the family and the bull's head from Caladan to Arrakis; the fold hands it from one sky to the other.
 */

export interface FrigatePose {
  x: number
  y: number
  /** Its tilt, radians, clockwise. */
  tilt?: number
  /** How hard its vents push, 0 to 1 (the columns under it). */
  burn?: number
  /** How far the breath under the vents reaches before it fades (cells, at most 2.2). */
  reach?: number
}

export interface FrigateLook {
  hull: string
  belly: string
  band: string
  port: string
  /** The air under the vents. */
  plume: string
}

export const FRIGATE: FrigateLook = {
  hull: '#3C403F',
  belly: '#242726',
  band: '#2C302F',
  port: '#B9B7A6',
  plume: '#E8E4D8',
}

const HULL: [number, number][] = [
  [-7.6, -0.4], [-6.6, -1.9], [-2.5, -2.45], [3.0, -2.3], [6.9, -1.4], [7.9, 0.2], [6.6, 1.55], [0, 1.85], [-6.4, 1.6],
]

export function drawFrigate(g: Paint, p: FrigatePose, look: FrigateLook = FRIGATE): void {
  const ctx = g.ctx
  const burn = p.burn ?? 0
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.tilt ?? 0)
  // The vents' breath first, under the hull: a short shaken stub of air under each, no beam. The dust it raises is the
  // ground's to draw.
  if (burn > 0.01) {
    const reach = Math.min(2.2, p.reach ?? 1.6)
    for (const vx of [-4.2, 0, 4.2]) {
      const top = 1.7
      poly(ctx, [[vx - 0.6, top], [vx + 0.6, top], [vx + 0.85, top + reach], [vx - 0.85, top + reach]])
      fill(ctx, vgrad(ctx, top, top + reach, [[0, rgba(look.plume, 0.35 * burn)], [1, rgba(look.plume, 0)]]))
    }
  }
  blob(ctx, HULL)
  fill(ctx, vgrad(ctx, -2.4, 1.9, [[0, mix(look.hull, '#FFFFFF', 0.08)], [0.55, look.hull], [1, look.belly]]))
  // The waist band, and the belly's flat.
  poly(ctx, [[-7.1, 0.15], [7.4, 0.15], [7.6, 0.55], [-6.9, 0.6]])
  fill(ctx, look.band)
  poly(ctx, [[-6.0, 1.45], [6.2, 1.4], [6.5, 1.62], [0, 1.86], [-6.2, 1.66]])
  fill(ctx, look.belly)
  // The ports: a row of small slots along the band.
  for (let i = 0; i < 9; i++) {
    const x = -5.2 + i * 1.25
    poly(ctx, [[x, 0.27], [x + 0.42, 0.27], [x + 0.42, 0.4], [x, 0.4]])
    fill(ctx, rgba(look.port, 0.85))
  }
  // The vents.
  for (const vx of [-4.2, 0, 4.2]) {
    poly(ctx, [[vx - 0.7, 1.5], [vx + 0.7, 1.5], [vx + 0.55, 1.75], [vx - 0.55, 1.75]])
    fill(ctx, '#151716')
  }
  ctx.restore()
}
