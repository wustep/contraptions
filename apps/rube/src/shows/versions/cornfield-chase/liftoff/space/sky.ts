import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { DARK } from '../worlds'

/**
 * The dark: what the frame is filled with above the cloud. Just over the
 * deck it is still a deep blue with the cloud tops below; higher, black,
 * and the stars come out in three depths that drift at three speeds. The
 * Earth is a curve under everything while the ball is near it, and slips
 * away once the ring has it.
 */
export interface VoidState {
  /** The top of the cloud deck, in world cells. */
  deck: number
  /** Show time from which the Earth is let go. */
  leave: number
}

const LAYERS = [
  { f: 0.04, size: 1.2, cell: 0.9, a: 0.55 },
  { f: 0.1, size: 1.7, cell: 1.4, a: 0.75 },
  { f: 0.22, size: 2.4, cell: 2.3, a: 0.95 },
]

export const voidSky = scenery<VoidState>({
  name: 'void',
  draw: (p: p5, s, c) => {
    const { k, t } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // Height over the deck: 0 in the cloud, 1 well up.
    const up = smooth(s.deck - f.cy, 0, 18)
    const low = mixHex('#27477A', DARK.deep, up)
    const high = mixHex('#15254A', '#070A14', up)
    const g = ctx.createLinearGradient(0, X(f.y0), 0, X(f.y1))
    g.addColorStop(0, high)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0), X(f.y0), X(f.x1 - f.x0), X(f.y1 - f.y0))

    // Stars, three depths. Each layer is a tiling of cells with a star or none, offset by how far it drifts.
    p.noStroke()
    const shown = smooth(s.deck - f.cy, 2, 10)
    for (let l = 0; l < LAYERS.length; l++) {
      const L = LAYERS[l]
      const ox = f.cx * (1 - L.f)
      const oy = f.cy * (1 - L.f)
      const c0 = Math.floor((f.x0 - ox) / L.cell) - 1
      const c1 = Math.ceil((f.x1 - ox) / L.cell) + 1
      const r0 = Math.floor((f.y0 - oy) / L.cell) - 1
      const r1 = Math.ceil((f.y1 - oy) / L.cell) + 1
      for (let i = c0; i <= c1; i++) {
        for (let j = r0; j <= r1; j++) {
          if (hash(i, j, l * 7 + 1) > 0.55) continue
          const x = ox + (i + hash(i, j, l * 7 + 2)) * L.cell
          const y = oy + (j + hash(i, j, l * 7 + 3)) * L.cell
          const twinkle = 0.75 + 0.25 * Math.sin(t * (1.3 + hash(i, j, l) * 2) + i)
          p.fill(alpha(p, '#F4EEDF', L.a * shown * twinkle * (0.5 + hash(i, j, l * 7 + 4) * 0.5)))
          p.circle(X(x), X(y), L.size * (0.6 + hash(i, j, l * 7 + 5) * 0.7))
        }
      }
    }

    // The Earth: a curve along the foot of the frame that bends more the higher we are, and is let go of later.
    const gone = smooth(t, s.leave, s.leave + 6)
    if (gone >= 1) return
    const rise = Math.max(0, s.deck - f.cy)
    const half = (f.y1 - f.y0) / 2
    // A planet, not a floor: a tight curve low in the frame, falling away as we climb.
    // Just over the cloud it is a wide curve along the foot of the frame; climbing, it draws in to a disc in the corner.
    const w = (f.x1 - f.x0) / 2
    const settle = smooth(rise, 2, 22)
    const R = 70 - 56 * settle
    const ax = f.cx - w * 0.62 * settle
    const top = f.cy + half * (0.84 - 0.12 * settle) + gone * half * 1.2
    const cx = ax - R * 0.35 * settle
    const cy = top + R * (1 - 0.1 * settle)
    ctx.save()
    const air = ctx.createRadialGradient(X(cx), X(cy), X(R - 0.1), X(cx), X(cy), X(R + 1.4))
    air.addColorStop(0, `rgba(143, 198, 230, ${0.6 * (1 - gone)})`)
    air.addColorStop(1, 'rgba(143, 198, 230, 0)')
    ctx.fillStyle = air
    ctx.beginPath()
    ctx.arc(X(cx), X(cy), X(R + 1.4), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    p.stroke(alpha(p, c.ink, 1 - gone))
    p.strokeWeight(c.weight)
    p.fill(mixHex('#35629A', '#1F3A64', smooth(rise, 4, 30)))
    p.circle(X(cx), X(cy), X(R * 2))
    // Weather on its face: a few long streaks of cloud along the curve.
    p.noFill()
    p.stroke(alpha(p, '#E9E4D6', 0.55 * (1 - gone)))
    p.strokeWeight(Math.max(1.5, k * 0.05))
    for (let i = 0; i < 7; i++) {
      const rr = R - 0.35 - i * 0.55 - hash(i, 9) * 0.3
      const span = (0.8 + hash(i, 5) * 1.6) / rr
      const a0 = -Math.PI / 2 + ((hash(i, 3) - 0.5) * 9 - (f.cx - cx) * 0.02) / rr
      p.arc(X(cx), X(cy), X(rr * 2), X(rr * 2), a0, a0 + span)
    }
  },
})
