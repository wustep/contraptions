import { ellipse, fill, mix, rgba, smooth, vgrad, type Paint } from '../../paint'
import { T, TENT, ground } from './geo'

/**
 * The stilltent: a low dome of desert cloth pitched in the lee of the dune, cut away on our side so the two of them
 * are seen in it. Its one job is the night: it keeps them, and in its still air the spice is thick enough to see by.
 *
 * It goes up from the sand (its cloth lifting into the dome) while they stand by it, they go in, and it stands until
 * they leave at dawn. In the dark its far wall is a dusk grey-blue, light enough to see them by; with the visions the
 * air in it goes faintly rust with spice; at dawn its cloth greys and warms.
 */

export const DOME = { rx: 0.62, ry: 0.5 } as const

/** How far up the dome is, 0 to 1. */
export const up = (t: number): number => smooth(t, T.tentUp[0], T.tentUp[1])

const CLOTH = '#7E6E5C'
const INNER_NIGHT = '#34343F'
const INNER_DAWN = '#8E7A66'

export function drawTent(g: Paint): void {
  const h = up(g.t)
  if (h <= 0.002) return
  const ctx = g.ctx
  const gy = ground(TENT) + 0.02
  const ry = DOME.ry * (0.08 + 0.92 * h)
  const rx = DOME.rx * (0.9 + 0.1 * h)
  const dawn = smooth(g.t, T.dawn[0] + 2, T.dawn[1])
  // The far wall, inside.
  ctx.save()
  ctx.beginPath()
  ctx.rect(TENT - rx - 0.1, gy - ry - 0.1, 2 * rx + 0.2, ry + 0.1)
  ctx.clip()
  ellipse(ctx, TENT, gy, rx, ry)
  const inner = mix(INNER_NIGHT, INNER_DAWN, dawn)
  fill(ctx, vgrad(ctx, gy - ry, gy, [[0, mix(inner, '#000000', 0.1)], [1, mix(inner, '#000000', 0.35)]]))
  // Spice in the still air while he sees: a faint rust veil.
  const spice = smooth(g.t, T.voiceIn - 0.6, T.voiceIn + 1.5) * (1 - smooth(g.t, T.vision3[1] - 1, T.out))
  if (spice > 0.01) {
    ellipse(ctx, TENT, gy, rx * 0.96, ry * 0.94)
    fill(ctx, vgrad(ctx, gy - ry, gy, [[0, rgba('#B0582C', 0.2 * spice)], [1, rgba('#B0582C', 0.06 * spice)]]))
  }
  ctx.restore()
}

/** Over the balls: the cloth cut through, an arc of it standing over them. */
export function drawTentOver(g: Paint): void {
  const h = up(g.t)
  if (h <= 0.002) return
  const ctx = g.ctx
  const gy = ground(TENT) + 0.02
  const ry = DOME.ry * (0.08 + 0.92 * h)
  const rx = DOME.rx * (0.9 + 0.1 * h)
  const w = 0.045
  const dawn = smooth(g.t, T.dawn[0] + 2, T.dawn[1])
  ctx.save()
  ctx.beginPath()
  ctx.rect(TENT - rx - 0.2, gy - ry - 0.2, 2 * rx + 0.4, ry + 0.2)
  ctx.clip()
  ctx.beginPath()
  ctx.ellipse(TENT, gy, rx + w, ry + w, 0, Math.PI, 2 * Math.PI)
  ctx.ellipse(TENT, gy, rx, ry, 0, 2 * Math.PI, Math.PI, true)
  ctx.closePath()
  fill(ctx, mix(CLOTH, '#C9B39A', dawn * 0.6))
  ctx.restore()
}
