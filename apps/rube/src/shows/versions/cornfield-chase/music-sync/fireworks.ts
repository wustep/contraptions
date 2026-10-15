import { DROP, LAST, beatAt } from './music'
import { hash, rgba, type Screen } from './screen'

/**
 * Fireworks over the fair, far off behind the machine, each bursting on a beat of the measured pulse the chase is built
 * on, and only at its landmarks: the drop, the full organ, the one downbeat the machine leaves to rest (beat 180), and
 * the last hit with the two soft beats after it. Never on the rest of the pulse: the machine strikes that, and a shell
 * on every bar would be wallpaper.
 */

interface Shell {
  /** Show time it bursts. */
  t: number
  /** Where, across the frame (0 to 1) and over the horizon (frame heights). */
  x: number
  y: number
  /** How wide it opens, frame heights. */
  r: number
  color: string
  /** A second colour its sparks turn to as they fall. */
  fade: string
}

const PINK = '#EF5A86'
const CYAN = '#3FC4D2'
const GOLD = '#EBD457'
const GREEN = '#8DD983'
const VIOLET = '#B48AEA'

export const SHELLS: Shell[] = [
  { t: DROP, x: 0.62, y: 0.52, r: 0.15, color: GOLD, fade: PINK },
  // The full organ comes in on beat 132: a shell on it and one on the eighth after.
  { t: beatAt(132), x: 0.3, y: 0.55, r: 0.14, color: CYAN, fade: VIOLET },
  { t: beatAt(132.5), x: 0.74, y: 0.48, r: 0.12, color: PINK, fade: GOLD },
  { t: beatAt(180), x: 0.5, y: 0.56, r: 0.15, color: GREEN, fade: CYAN },
  // The last hit, and the pulse's last two beats under its ring.
  { t: LAST, x: 0.42, y: 0.5, r: 0.2, color: GOLD, fade: PINK },
  { t: beatAt(192), x: 0.7, y: 0.44, r: 0.13, color: VIOLET, fade: CYAN },
  { t: beatAt(193), x: 0.2, y: 0.4, r: 0.12, color: CYAN, fade: GREEN },
]

/** How long a shell climbs before it bursts, and how long its sparks last. */
const CLIMB = 0.85
const LIFE = 2.1

/** Every shell in the air at `t`, over the horizon at `hy` (device pixels). */
export function fireworks(s: Screen, t: number, hy: number): void {
  const live = SHELLS.filter((sh) => t > sh.t - CLIMB && t < sh.t + LIFE)
  if (!live.length) return
  const { ctx, cx, f } = s
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const [n, sh] of live.entries()) {
    const bx = cx + (sh.x - 0.5) * f * (16 / 9)
    const by = hy - sh.y * f
    if (t < sh.t) {
      // The climb: a spark easing up to where it bursts, a short fading tail under it.
      const u = (t - (sh.t - CLIMB)) / CLIMB
      const rise = (v: number) => 1 - (1 - v) * (1 - v)
      const at = (v: number): [number, number] => [bx + (1 - rise(v)) * f * 0.03 * (hash(n, 9) - 0.5), hy - (hy - by) * rise(v)]
      const [x1, y1] = at(u)
      const [x0, y0] = at(Math.max(0, u - 0.18))
      const g = ctx.createLinearGradient(x0, y0, x1, y1)
      g.addColorStop(0, rgba(sh.color, 0))
      g.addColorStop(1, rgba('#FFF4D6', 0.75))
      ctx.strokeStyle = g
      ctx.lineWidth = Math.max(1, f * 0.0026)
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      continue
    }
    const age = t - sh.t
    // The flash at the burst, gone in a tenth of a second.
    if (age < 0.18) {
      const a = 1 - age / 0.18
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, sh.r * f * 0.6)
      g.addColorStop(0, rgba('#FFF6E0', 0.55 * a))
      g.addColorStop(1, rgba(sh.color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(bx, by, sh.r * f * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    // The sparks: out fast and slowing, drooping as they go, each a short streak that dims and turns colour.
    const sparks = 46
    const out = (u: number) => (1 - Math.exp(-3.2 * u)) / (1 - Math.exp(-3.2 * LIFE))
    const life = 1 - age / LIFE
    const color = age < 0.7 ? sh.color : sh.fade
    ctx.strokeStyle = rgba(color, 0.85 * life ** 1.4)
    ctx.lineWidth = Math.max(1, f * 0.0028 * (0.6 + 0.4 * life))
    ctx.beginPath()
    for (let i = 0; i < sparks; i++) {
      const a = (i / sparks) * Math.PI * 2 + (hash(i, n * 17 + 3) - 0.5) * 0.2
      const v = sh.r * f * (0.82 + 0.3 * hash(i, n * 17 + 4))
      const point = (u: number): [number, number] => [bx + Math.cos(a) * v * out(u), by + Math.sin(a) * v * out(u) + f * 0.035 * u * u]
      const [x1, y1] = point(age)
      const [x0, y0] = point(Math.max(0, age - 0.12))
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
    }
    ctx.stroke()
  }
  ctx.restore()
}
