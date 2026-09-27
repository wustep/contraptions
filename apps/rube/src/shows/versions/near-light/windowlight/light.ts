import { LAMP } from './layout'
import { ONSETS, section, since } from './music'
import { where } from './route'
import { scenery, viewOf, type Ctx2D } from './world'
import { WIDE_CELLS } from './room'
import { smooth } from './kit'

/**
 * The arpeggios' accents (their downbeats, and the coda's last chord): the lamp answers each, swelling a little and
 * settling over a second and a half, while the ball goes round it. Nowhere else does it move.
 */
const ACCENTS = ONSETS.filter((o) => (o.in === 'arpeggios' && o.s >= 1) || (o.in === 'coda' && o.s >= 1.5 && o.t < section('coda').t0 + 6))
export function lampBreath(t: number): number {
  let b = 0
  for (const o of ACCENTS) {
    const s = since(t, o.t)
    if (s < 0 || s > 8) continue
    b += Math.min(1.4, o.s) * (1 - Math.exp(-s / 0.05)) * Math.exp(-s / 1.4) * (1 - smooth(s, 5, 8))
  }
  return Math.min(1.2, b)
}

/**
 * The lamp's light, over everything near it, the ball included: warm, and soft at its edge. And, once the window is
 * the whole picture and the ball is a speck in it, a little light round the ball, so the eye can find it.
 */
export const light = scenery<null>('light', () => {}, (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const v = viewOf(p, c)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const x = LAMP[0] * k
  const y = LAMP[1] * k
  const swell = 1 + 0.3 * lampBreath(c.t)
  const wide = ctx.createRadialGradient(x, y, 0.2 * k, x, y, 9 * k)
  wide.addColorStop(0, `rgba(255, 196, 120, ${(0.22 * swell).toFixed(3)})`)
  wide.addColorStop(0.25, `rgba(255, 180, 100, ${(0.09 * swell).toFixed(3)})`)
  wide.addColorStop(1, 'rgba(255, 170, 90, 0)')
  ctx.fillStyle = wide
  ctx.fillRect(x - 9 * k, y - 9 * k, 18 * k, 18 * k)
  const near = ctx.createRadialGradient(x, y, 0, x, y, 1.2 * k)
  near.addColorStop(0, `rgba(255, 236, 190, ${Math.min(1, 0.42 * swell).toFixed(3)})`)
  near.addColorStop(1, 'rgba(255, 220, 160, 0)')
  ctx.fillStyle = near
  ctx.fillRect(x - 1.2 * k, y - 1.2 * k, 2.4 * k, 2.4 * k)
  // Far out, a light round the ball.
  const far = smooth(v.cells, 12, WIDE_CELLS * 0.9)
  if (far > 0.01) {
    const b = where(c.t).p
    const r = 20 * Math.max(1, v.W / 1600)
    const px = v.px
    const bx = b[0] * k
    const by = b[1] * k
    const rr = r * (k / px)
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, rr)
    g.addColorStop(0, `rgba(255, 244, 222, ${(0.55 * far).toFixed(3)})`)
    g.addColorStop(0.25, `rgba(255, 236, 200, ${(0.22 * far).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255, 236, 200, 0)')
    ctx.fillStyle = g
    ctx.fillRect(bx - rr, by - rr, 2 * rr, 2 * rr)
  }
  ctx.restore()
})
