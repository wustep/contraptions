import { mixHex } from '../../../../parts'
import { DROP, LAST, beatAt } from './music'
import type { Flash } from './field'
import { hash, rgba, smooth, type Screen } from './screen'

/**
 * Fireworks over the fair, far off behind the machine, each bursting on a beat of the measured pulse the chase is built
 * on, and only at its landmarks: the drop, the full organ and the downbeat of each of its phrases (the one at beat 180
 * the machine leaves to rest), and the last hit with the two soft beats after it. None through the chase between the
 * drop and the full organ, which is the machine's alone, and never on the rest of the pulse: the machine strikes that,
 * and a shell on every bar would be wallpaper.
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
  // The full organ comes in on beat 132: a shell on it and one on the eighth after, high and wide, to be seen over and
  // through the floors of machines that fill the frame there.
  { t: beatAt(132), x: 0.24, y: 0.62, r: 0.22, color: CYAN, fade: VIOLET },
  { t: beatAt(132.5), x: 0.78, y: 0.58, r: 0.19, color: PINK, fade: GOLD },
  // Each phrase of the full organ opens with one, high in the sky the single floor leaves open: the climax builds where
  // the chase before it kept to the machine.
  { t: beatAt(148), x: 0.66, y: 0.6, r: 0.16, color: GOLD, fade: VIOLET },
  { t: beatAt(164), x: 0.47, y: 0.64, r: 0.17, color: VIOLET, fade: PINK },
  { t: beatAt(180), x: 0.5, y: 0.56, r: 0.15, color: GREEN, fade: CYAN },
  // The last hit, and the pulse's last two beats under its ring.
  { t: LAST, x: 0.42, y: 0.5, r: 0.2, color: GOLD, fade: PINK },
  { t: beatAt(192), x: 0.7, y: 0.44, r: 0.13, color: VIOLET, fade: CYAN },
  { t: beatAt(193), x: 0.2, y: 0.4, r: 0.12, color: CYAN, fade: GREEN },
]

/** How long a shell climbs before it bursts, and how long its sparks last. */
const CLIMB = 0.85
const LIFE = 2.1

/**
 * The light the shells throw on the field at `t`: the brightest burst's colour, where it is across the frame, and how
 * strong (0 to 1), a flash on the beat that dies over half a second or so, the wider shells throwing more.
 */
export function shellLight(t: number): Flash | undefined {
  let best: Flash | undefined
  for (const sh of SHELLS) {
    const age = t - sh.t
    if (age < 0 || age > LIFE) continue
    const a = Math.min(1, Math.exp(-age / 0.55) * (sh.r / 0.2))
    if (!best || a > best.a) best = { x: sh.x, color: sh.color, a }
  }
  return best && best.a > 0.02 ? best : undefined
}

/** Every shell in the air at `t`, over the horizon at `hy` (device pixels). */
export function fireworks(s: Screen, t: number, hy: number): void {
  const live = SHELLS.filter((sh) => t > sh.t - CLIMB && t < sh.t + LIFE)
  if (!live.length) return
  const { ctx, cx, f } = s
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const sh of live) {
    // Its own index, not its place among the shells in the air, so its sparks keep their way as others burn out.
    const n = SHELLS.indexOf(sh)
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

/**
 * The smoke the shells leave: where each burst, a soft cloud of it the size the burst opened, lit from under by the
 * fair, that the wind draws out east and shears, the high side carried the farther, into a long slant of veil that thins
 * over half a minute. It hangs over the midway, so it goes past the camera at the midway's pace: `camAt` is the
 * camera's cell at a show time, to find where over the fair a shell burst. Through the climax it gathers, a shell's on
 * the one before's, and the last of it is still there in the blue hour, over the photograph. `color` is the smoke's
 * over, `lit` along its foot, by the light it is in.
 */
export function smoke(s: Screen, t: number, hy: number, camAt: (t: number) => number, color: string, lit: string): void {
  const { ctx, cx, f, w } = s
  const at = (s.camX * MIDWAY) / 8
  for (const [n, sh] of SHELLS.entries()) {
    const age = t - sh.t
    if (age < 0.3 || age > 40) continue
    const a = 0.13 * smooth(age, 0.3, 2.5) * Math.exp(-age / 16) * (sh.r / 0.18)
    if (a < 0.005) continue
    // Where over the fair it burst, and how far the wind has had it since.
    const u = (sh.x - 0.5) * (16 / 9) + (camAt(sh.t) * MIDWAY) / 8 - at + 0.011 * age
    const spread = sh.r * (0.7 + 0.6 * (1 - Math.exp(-age / 10)))
    // Round as the burst left it; drawn out, flattened and sheared by the wind as it goes.
    const long = 1 + 0.08 * age
    const flat = 1 - 0.72 * smooth(age, 1, 16)
    const shear = 0.04 * age
    if (Math.abs(u) * f > w / 2 + spread * f * (long + shear)) continue
    const bx = cx + u * f
    const by = hy - (sh.y - 0.003 * age) * f
    // Puffs over the disc the sparks filled, as one cloud: no edges inside it, only its outline.
    const cloud = new Path2D()
    for (let k = 0; k < 8; k++) {
      const turn = hash(k, n * 7 + 50) * Math.PI * 2
      const from = Math.sqrt(hash(k, n * 7 + 51)) * 0.62 * spread
      const dy = Math.sin(turn) * from * flat
      const x = bx + (Math.cos(turn) * from * long - dy * shear) * f
      const y = by + dy * f
      const r = spread * (0.3 + 0.16 * hash(k, n * 7 + 52)) * f
      cloud.moveTo(x + r * long, y)
      cloud.ellipse(x, y, r * long, r * flat, 0, 0, Math.PI * 2)
    }
    const g = ctx.createLinearGradient(0, by - spread * flat * f, 0, by + spread * flat * f)
    g.addColorStop(0, rgba(mixHex(color, sh.color, 0.1), a * 0.55))
    g.addColorStop(1, rgba(mixHex(lit, sh.color, 0.1), a))
    ctx.fillStyle = g
    ctx.fill(cloud)
  }
}

/** The midway's pace past the camera (`midway.ts`), which the smoke over it keeps. */
const MIDWAY = 0.1

