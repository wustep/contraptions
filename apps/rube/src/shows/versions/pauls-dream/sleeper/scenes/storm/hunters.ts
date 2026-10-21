import { blob, drift, fill, layer, mix, rgba, smooth, type Paint, type Pt } from '../../paint'
import { TICK } from '../../music'
import { HARKONNEN, drawThopter, drawThopterOver, thopterLook, type ThopterPose } from '../../craft/thopter'
import { pose as ours, inStorm } from './craft'
import { T, keyed } from './geo'

/**
 * The hunters: two Harkonnen ornithopters that come over the dunes behind at dawn and chase Paul into the storm, where
 * the storm takes them apart, one on each of two booms (327.55, 329.15): the wings torn off and flung back on the wind,
 * the hull tumbling down into the dust and gone. No one is seen in them.
 *
 * Until the wide shot on the fill's boom they are far behind, over the dunes (a layer deep in the air, coming nearer);
 * from it, they are on the plane, closing.
 */

interface Hunter {
  /** Far: where it is over the dunes before the wide shot, on the near plane, and how deep. */
  farX(t: number): number
  farY: number
  /** Near: how far behind Paul it is, and how far above (negative) or below. */
  gap(t: number): number
  dy: number
  breaks: number
  seed: number
}

const HUNTERS: Hunter[] = [
  {
    farX: (t) => 696 + (t - T.hunters) * 5.5,
    farY: -7.4,
    gap: keyed([[T.wall, 8.6], [318, 6.2], [T.enter, 4.6], [T.breaks[0], 3.9]]),
    dy: -1.3,
    breaks: T.breaks[0],
    seed: 81,
  },
  {
    farX: (t) => 692 + (t - T.hunters) * 5.8,
    farY: -6.0,
    gap: keyed([[T.wall, 11], [318, 8.4], [T.enter, 6.2], [T.breaks[1], 3.7]]),
    dy: 0.3,
    breaks: T.breaks[1],
    seed: 87,
  },
]

/** How deep in the air the far hunters are: far over the dunes when first seen, nearer by the wide shot. */
const depth = (t: number): number => 70 - 56 * smooth(t, T.hunters, T.wall)

function nearPose(h: Hunter, t: number): ThopterPose {
  const p = ours(t)
  const s = inStorm(p.x)
  return {
    x: p.x - h.gap(t),
    y: p.y + h.dy + 0.25 * drift(t * 0.7, h.seed) + s * 0.35 * drift(t * 1.3, h.seed + 1),
    face: 1,
    pitch: (p.pitch ?? 0) * 0.7 + 0.06 + s * 0.14 * drift(t * 1.2, h.seed + 2),
  }
}

const look = (h: Hunter, t: number) => thopterLook(HARKONNEN, ((t - h.seed * 0.01) / TICK) * Math.PI * 2, 1, 0)

/** A piece of a broken hunter: where it was at the break, how it moves after, how it turns. */
interface Piece {
  shape: Pt[]
  color: string
  at: Pt
  v: Pt
  g: number
  spin: number
  alpha: number
}

/** The pieces a hunter breaks into at `p` (its pose at the break). */
function pieces(p: ThopterPose): Piece[] {
  const H = HARKONNEN
  const wing = (len: number): Pt[] => [[0, 0], [-len * 0.15, -0.09], [-len * 0.55, -0.1], [-len, 0], [-len * 0.55, 0.08], [-len * 0.15, 0.07]]
  const body: Pt[] = [[-0.75, -0.3], [0.35, -0.36], [0.95, -0.3], [1.6, -0.02], [1.5, 0.2], [0.6, 0.27], [-0.7, 0.24], [-0.9, -0.02]]
  const tail: Pt[] = [[-0.5, -0.2], [-1.85, -0.16], [-2.0, -0.32], [-2.06, -0.06], [-1.85, 0], [-0.5, 0.16]]
  const at = (lx: number, ly: number): Pt => [p.x + lx, p.y + ly]
  return [
    { shape: tail, color: H.body, at: at(-0.4, 0), v: [-1.5, -0.6], g: 9, spin: -2.6, alpha: 1 },
    { shape: body, color: H.body, at: at(0.1, 0), v: [0.6, 0.4], g: 11, spin: 1.7, alpha: 1 },
    { shape: wing(2.5), color: H.wing, at: at(0.18, -0.36), v: [-4.5, -3.2], g: 3, spin: -3.8, alpha: 0.8 },
    { shape: wing(2.3), color: mix(H.wing, H.belly, 0.35), at: at(-0.52, -0.33), v: [-5.5, -2.0], g: 3, spin: 4.4, alpha: 0.6 },
  ]
}

function drawPieces(g: Paint, h: Hunter): void {
  const s = g.t - h.breaks
  const fade = 1 - smooth(s, 0.4, 1.9)
  if (fade <= 0.002) return
  const base = nearPose(h, h.breaks)
  // The air it was flying in keeps going east at Paul's pace less the storm's: the pieces fall behind it.
  const ox = (ours(g.t).x - ours(h.breaks).x) * 0.45
  for (const pc of pieces(base)) {
    const x = pc.at[0] + ox + pc.v[0] * s
    const y = pc.at[1] + pc.v[1] * s + 0.5 * pc.g * s * s
    g.ctx.save()
    g.ctx.translate(x, y)
    g.ctx.rotate((base.pitch ?? 0) + pc.spin * s)
    blob(g.ctx, pc.shape)
    fill(g.ctx, rgba(pc.color, pc.alpha * fade))
    g.ctx.restore()
  }
}

export function drawHunters(g: Paint): void {
  const t = g.t
  if (t < T.hunters - 0.5) return
  for (const h of HUNTERS) {
    if (t < T.wall) {
      // Far behind, over the dunes: a small dark shape coming on.
      const L = layer(g.view, depth(t))
      const [x, y] = L.pt([h.farX(t), h.farY])
      g.ctx.save()
      g.ctx.translate(x, y)
      g.ctx.scale(L.s, L.s)
      // Its lines are still never under the house's least on the screen, however far it is.
      const far: Paint = { ...g, px: g.px / L.s }
      const p: ThopterPose = { x: 0, y: 0, face: 1, pitch: 0.08 }
      drawThopter(far, p, look(h, t))
      drawThopterOver(far, p, look(h, t))
      g.ctx.restore()
    } else if (t < h.breaks) {
      drawThopter(g, nearPose(h, t), look(h, t))
    } else {
      drawPieces(g, h)
    }
  }
}

/** Over the balls: the near hunters' glass and near wings (no one is in them). */
export function drawHuntersOver(g: Paint): void {
  const t = g.t
  if (t < T.wall) return
  for (const h of HUNTERS) if (t < h.breaks) drawThopterOver(g, nearPose(h, t), look(h, t))
}
