import { parallax, pulse, rising, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { ctxOf, type Pen } from '../pen'
import { oval, rgbaOf } from './batch'
import { BOW2, LIGHTS_UP, SERVE, WAY } from './geo'
import { ANCHOR, heat, house, risen, surge, swell } from './mood'
import { C } from './palette'

/**
 * The front row, in the lens: the backs of heads and shoulders along the bottom of the frame, dark and soft, nearer
 * than anything (1.35 of the table's depth, so they pass faster than the world as the camera goes). Hats, a GI's cap, a
 * press photographer with his camera up over the heads. They shift and turn after the ball, come up on the big points
 * with their arms, and are on their feet roaring on the winner. They are silhouettes and nothing more: no rim of light
 * is drawn round their heads. A cigarette's smoke curls up out of them in the dark. Never over the table, never near him: they keep under the
 * table's legs, and duck where he is low in the frame.
 */

const D = 1.35
const GAP = 0.8
const INK = '#060608'

export function drawFrontRow(pen: Pen, t: number, f: Frame): void {
  const fh = f.y1 - f.y0
  // How far up into the frame they may come: under the table's legs.
  const room = Math.min(0.13 * fh, (f.y1 - 0.8) / 1.25)
  if (room < 0.06) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const [dx] = parallax(f, D, ANCHOR)
  const s = Math.max(0.78, Math.min(1.3, Math.sqrt(fh / 5.5)))
  const [mx, my] = WAY.at(t)
  const up = risen(t)
  const sg = surge(t)
  const sw = swell(t)
  const hot = heat(t)
  const beat = pulse(t, 0.3)
  const lights = house(t)
  const bottom = f.y1
  const ceiling = bottom - room * 1.25
  const soft = new Path2D()
  const core = new Path2D()
  const arms = new Path2D()
  const both = (fn: (p: Path2D, grow: number) => void) => {
    fn(soft, 1.14)
    fn(core, 1)
  }
  const x0 = f.x0 - 1 - dx
  const x1 = f.x1 + 1 - dx
  let smoker: [number, number] | null = null
  for (let j = Math.floor(x0 / GAP); j * GAP < x1; j++) {
    const X = j * GAP + (hash(j, 161) - 0.5) * 0.3 + dx
    const kind = hash(j, 162)
    const ph = hash(j, 163)
    // Up on their feet on the winner and through the last bar, a jump on the power shots, a nod on the beat.
    const stand = Math.max(up, ph > 0.35 ? sw : 0, Math.min(1, sg * (0.4 + ph)))
    const sit = 0.5 + 0.3 * hash(j, 164)
    let top = bottom - room * (sit + 0.35 * stand) - 0.025 * beat * hot - 0.02 * Math.sin(t * 0.7 + ph * 30)
    // Down out of his way where he is low in the frame.
    const nearHim = Math.abs(X - mx) < 1.2 * s + 0.4
    if (nearHim) top = Math.max(top, my + 0.5)
    if (top > bottom + 0.05) continue
    const r = 0.2 * s * (0.9 + 0.2 * hash(j, 165))
    const lean = 0.05 * Math.sin(t * 0.45 + ph * 20) + 0.06 * Math.max(-1, Math.min(1, (mx - X) / 3))
    const hx = X + lean
    const hy = top + r * 1.1
    both((p, g) => {
      oval(p, k, hx, hy, r * 0.9 * g, r * 1.1 * g)
      oval(p, k, X + 0.4 * lean, hy + r * 2.2, 0.42 * s * g, 0.34 * s * g)
      p.rect((X - 0.2 * s * g) * k, (hy + r * 0.6) * k, 0.4 * s * g * k, r * 1.6 * k)
    })
    if (kind < 0.09) {
      // The press photographer: his camera up over the heads, both hands on it, the reflector beside it.
      const lift = smooth(t, LIGHTS_UP[0], SERVE)
      const cy = Math.max(ceiling + 0.12 * s, hy - (0.35 + 0.3 * lift) * s)
      const cx = hx + 0.06 * s
      both((p, g) => {
        p.rect((cx - 0.22 * s * g) * k, (cy - 0.16 * s * g) * k, 0.44 * s * g * k, 0.32 * s * g * k)
        oval(p, k, cx + 0.32 * s, cy - 0.14 * s, 0.2 * s * g, 0.2 * s * g)
      })
      arms.moveTo((X - 0.3 * s) * k, (hy + r * 1.6) * k)
      arms.lineTo((cx - 0.18 * s) * k, (cy + 0.1 * s) * k)
      arms.moveTo((X + 0.3 * s) * k, (hy + r * 1.6) * k)
      arms.lineTo((cx + 0.18 * s) * k, (cy + 0.1 * s) * k)
    } else if (kind < 0.32) {
      // A hat: a soft felt one, or a GI's cap.
      const gi = kind > 0.25
      both((p, g) => {
        if (gi) {
          p.moveTo((hx - r * 0.95 * g) * k, (hy - r * 0.35) * k)
          p.lineTo((hx - r * 0.7) * k, (hy - r * 1.25 * g) * k)
          p.lineTo((hx + r * 0.8) * k, (hy - r * 1.15 * g) * k)
          p.lineTo((hx + r * 0.95 * g) * k, (hy - r * 0.35) * k)
          p.closePath()
        } else {
          oval(p, k, hx, hy - r * 0.5, r * 1.55 * g, r * 0.28 * g)
          p.rect((hx - r * 0.8 * g) * k, (hy - r * 1.35 * g) * k, r * 1.6 * g * k, r * 0.9 * k)
        }
      })
    } else if (kind < 0.36 && hot < 0.2) {
      smoker = [hx + r * 0.9, hy - r * 0.2]
    }
    // Arms up and waving on the winner, fists up on the big points; never higher than under the table.
    const roar = Math.max(up * (ph > 0.3 ? 1 : 0), sg > 0.45 && ph > 0.55 ? sg : 0, t > BOW2 && t < BOW2 + 1.6 && ph > 0.7 ? 0.7 : 0)
    if (roar > 0.15 && kind >= 0.09 && !nearHim) {
      const wave = 0.08 * Math.sin(t * 8 + ph * 12) * s
      const reach = Math.max(ceiling, hy - (0.35 + 0.45 * roar) * s)
      const side = ph > 0.75 ? 1 : -1
      arms.moveTo((X + side * 0.3 * s) * k, (hy + r * 1.6) * k)
      arms.lineTo((X + side * 0.42 * s + wave) * k, reach * k)
      oval(core, k, X + side * 0.42 * s + wave, reach, 0.07 * s, 0.08 * s)
      if (ph > 0.6) {
        arms.moveTo((X - side * 0.3 * s) * k, (hy + r * 1.6) * k)
        arms.lineTo((X - side * 0.36 * s - wave) * k, (reach + 0.08 * s) * k)
        oval(core, k, X - side * 0.36 * s - wave, reach + 0.08 * s, 0.07 * s, 0.08 * s)
      }
    }
  }
  ctx.save()
  ctx.fillStyle = rgbaOf(pen, INK, 0.35)
  ctx.fill(soft)
  ctx.strokeStyle = rgbaOf(pen, INK, 0.4)
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.2 * s * k
  ctx.stroke(arms)
  ctx.fillStyle = rgbaOf(pen, INK, 0.92)
  ctx.fill(core)
  ctx.strokeStyle = rgbaOf(pen, INK, 0.95)
  ctx.lineWidth = 0.13 * s * k
  ctx.stroke(arms)
  ctx.restore()
  // In the dark, a cigarette's smoke curling up out of the front row.
  if (smoker) {
    const dark = 1 - Math.min(1, lights * 1.5)
    if (dark > 0.02) {
      const [sx, sy] = smoker
      rising(pen, t, { seed: 171, n: 9, from: [sx - 0.03, sx + 0.03, sy], rise: 1.5 * room, life: 3.2, spread: 0.35, size: [0.05 * s, 0.16 * s], color: C.smoke, alpha: 0.12 * dark })
    }
  }
}
