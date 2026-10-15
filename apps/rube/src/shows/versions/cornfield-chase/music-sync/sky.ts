import { mixHex } from '../../../../parts'
import { GATHER, ORGAN } from './music'
import { groundAlong, groundY } from './field'
import { clamp, hash, rgba, smooth, type Screen } from './screen'

/**
 * What crosses the sky: the clouds, the birds and the drone. Each moves with the wind or under its own power, and
 * past the camera at the share of the machine's pace its distance gives it, so the sky is never a painted card.
 */

/** Wraps `v` into [-p/2, p/2). */
const wrap = (v: number, p: number): number => v - p * Math.floor(v / p + 0.5)

interface Layer {
  /** How many clouds round the layer's loop, and how long the loop is, frame heights. */
  n: number
  loop: number
  /** Pace past the camera, as the field's layers have it, and the wind's drift, frame heights a second. */
  q: number
  drift: number
  /** Heights over the horizon the clouds keep between, frame heights, and their widths. */
  lo: number
  hi: number
  w0: number
  w1: number
  /** How far the haze has them: 0 clear, 1 gone into the sky. */
  haze: number
}

/** Low and far, small and slow; then the high fair-weather clouds; then the tall ones the opening looks up into. */
const DAY: Layer[] = [
  { n: 10, loop: 5, q: 0.03, drift: 0.004, lo: 0.035, hi: 0.1, w0: 0.08, w1: 0.17, haze: 0.45 },
  { n: 7, loop: 5.4, q: 0.05, drift: 0.008, lo: 0.2, hi: 0.42, w0: 0.18, w1: 0.32, haze: 0.12 },
  { n: 5, loop: 5.8, q: 0.07, drift: 0.011, lo: 0.6, hi: 0.95, w0: 0.26, w1: 0.42, haze: 0 },
]

/** Long, thin, slow: a night's few clouds, lit from under by the fair. */
const NIGHT: Layer[] = [
  { n: 4, loop: 4.6, q: 0.035, drift: 0.006, lo: 0.3, hi: 0.62, w0: 0.34, w1: 0.6, haze: 0 },
]

interface Puff {
  dx: number
  dy: number
  rx: number
  ry: number
}

/**
 * A cloud's puffs, from its index: rounded tops, wider than tall, along a flat base, the tallest a little off its
 * middle; a night's cloud is a long low bank.
 */
const shapes = new Map<number, Puff[]>()
function puffs(key: number, flat: boolean): Puff[] {
  let out = shapes.get(key)
  if (out) return out
  out = []
  const m = flat ? 11 : 6 + Math.floor(hash(key, 11) * 3)
  const peak = 0.3 + 0.4 * hash(key, 14)
  for (let k = 0; k < m; k++) {
    const u = k / (m - 1)
    const crown = Math.exp(-(((u - peak) / 0.3) ** 2))
    if (flat) {
      // A night's bank: thin and ragged, thicker in places, broken in others.
      if (hash(key * 7 + k, 15) < 0.18) continue
      const r = 0.012 + 0.03 * hash(key * 7 + k, 13) * (0.4 + crown)
      out.push({ dx: (u - 0.5) * 0.9, dy: -r * 0.4 + 0.02 * (hash(key * 7 + k, 16) - 0.5), rx: r * 3.2, ry: r })
      continue
    }
    const r = 0.07 + 0.11 * crown + 0.03 * hash(key * 7 + k, 12)
    out.push({ dx: (u - 0.5) * 0.8, dy: -r * 0.62, rx: r * 1.45, ry: r })
  }
  shapes.set(key, out)
  return out
}

export interface CloudLight {
  /** The heap, and its flat base: shaded by day, lit apricot from under at sunset, the fair's glow at night. */
  body: string
  base: string
  /** The sky the far ones fade toward. */
  sky: string
  alpha: number
}

/**
 * The clouds over the horizon at `hy`, `t` seconds in: rounded heaps on flat bases, each base a band of its own
 * colour. Drawn after the sun and the moon, so they pass in front of them.
 */
export function clouds(s: Screen, t: number, hy: number, light: CloudLight, night = false): void {
  const { ctx, cx, f, w } = s
  const half = w / 2 / f
  for (const [li, layer] of (night ? NIGHT : DAY).entries()) {
    const at = (s.camX * layer.q) / 8
    const heap = new Path2D()
    const under = new Path2D()
    let any = false
    for (let i = 0; i < layer.n; i++) {
      const key = li * 31 + i + (night ? 500 : 0)
      const width = (layer.w0 + (layer.w1 - layer.w0) * hash(key, 1)) * f
      const u = wrap((i + 0.35 * hash(key, 2)) * (layer.loop / layer.n) + layer.drift * t - at, layer.loop)
      if (Math.abs(u) > half + width / f) continue
      const x = cx + u * f
      const y = hy - (layer.lo + (layer.hi - layer.lo) * hash(key, 3)) * f
      if (y < -width * 0.3) continue
      any = true
      for (const p of puffs(key, night)) {
        const px = x + p.dx * width
        const py = y + p.dy * width
        heap.moveTo(px + p.rx * width, py)
        heap.ellipse(px, py, p.rx * width, p.ry * width, 0, 0, Math.PI * 2)
      }
      // A flat foot under the heap, and the band of the base's colour along it, cut to the heap's outline.
      if (!night) heap.rect(x - width * 0.36, y - width * 0.08, width * 0.72, width * 0.08)
      under.rect(x - width * 0.6, y - width * (night ? 0.012 : 0.075), width * 1.2, width * 0.2)
    }
    if (!any) continue
    const a = light.alpha * (1 - layer.haze * 0.5)
    ctx.fillStyle = rgba(mixHex(light.body, light.sky, layer.haze), a)
    ctx.fill(heap)
    ctx.save()
    ctx.clip(heap)
    ctx.fillStyle = rgba(mixHex(light.base, light.sky, layer.haze), a)
    ctx.fill(under)
    ctx.restore()
  }
}

/**
 * The high clouds' shadows on the field: long soft ovals laid on the rows, going over them at the wind's pace, the
 * near ones larger and quicker past the camera than the far. As the sun goes down they lengthen and fade.
 */
export function shadows(s: Screen, t: number, hy: number, color: string, strength: number): void {
  if (strength <= 0.01) return
  const { ctx, cx, f, w } = s
  const half = w / 2 / f
  const outer = new Path2D()
  const inner = new Path2D()
  for (let i = 0; i < 5; i++) {
    const d = 1.15 + 3.6 * hash(i, 41)
    const y = groundY(s, hy, d)
    if (y > s.h + f * 0.05) continue
    const rw = (0.55 + 0.35 * hash(i, 42)) * f / d
    const rh = rw * (0.1 + 0.03 * hash(i, 43))
    // The wind carries the shadow over the ground at its depth: quicker across the frame the nearer it is.
    const u = wrap(i * 1.37 + (0.018 * t) / d - groundAlong(s, d), 6.5 / d)
    if (Math.abs(u) > half + rw / f) continue
    const x = cx + u * f
    // Feathered: a wide faint oval and a narrower one inside it, so the edge is soft as a cloud's shadow is.
    outer.moveTo(x + rw, y)
    outer.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2)
    inner.moveTo(x + rw * 0.72, y)
    inner.ellipse(x + rw * 0.04, y, rw * 0.72, rh * 0.62, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = rgba(color, 0.05 * strength)
  ctx.fill(outer)
  ctx.fill(inner)
}

/**
 * A bird's wings on the path: from tip to body to tip, the tips up or down by `flap` (-1 to 1) of `span`. `glide`
 * holds them out flat with a soaring hawk's bend.
 */
function wings(path: Path2D, x: number, y: number, span: number, flap: number, glide = false): void {
  const lift = flap * span * 0.55
  const bow = glide ? -span * 0.12 : -span * 0.2 * flap
  path.moveTo(x - span, y - lift)
  path.quadraticCurveTo(x - span * 0.45, y + bow - lift * 0.15, x, y)
  path.quadraticCurveTo(x + span * 0.45, y + bow - lift * 0.15, x + span, y - lift)
}

/**
 * The birds over the field.
 *
 * - **Two hawks** turn slow circles high over the corn through the afternoon, wings held out, a few beats of them now
 *   and then.
 * - **Swallows** skim the near rows in the piano's quiet, quick across the frame and gone.
 * - **The crows.** On the organ's entry a flock goes up out of the corn, all of them within a second, and climbs away
 *   toward the low sun, smaller as it goes, gone by the door.
 */
export function birds(s: Screen, t: number, hy: number, ink: string): void {
  const { ctx, cx, f } = s
  const path = new Path2D()
  const W = (f * 16) / 9
  const left = cx - W / 2
  // The hawks: far, barely moving past the camera.
  const hawks = 1 - smooth(t, ORGAN + 1, ORGAN + 5)
  if (hawks > 0) {
    const at = (s.camX * 0.03) / 8
    for (let i = 0; i < 2; i++) {
      const period = 11 + 3 * i
      const a = (t / period) * Math.PI * 2 * (i ? -1 : 1) + i * 2.1
      const ox = cx + (0.15 - 0.55 * i - at + 0.12 * Math.sin(t * 0.05 + i)) * f
      const oy = hy - (0.52 + 0.12 * i) * f
      const x = ox + Math.cos(a) * 0.09 * f
      const y = oy + Math.sin(a) * 0.028 * f
      // A few beats every so often, then the glide.
      const beat = (t + i * 3.3) % 7
      const flap = beat < 1.1 ? Math.sin(beat * Math.PI * 2 * 2.7) : 0.15 + 0.05 * Math.sin(t * 1.3 + i)
      wings(path, x, y, f * 0.013 * hawks ** 0.3, flap, beat >= 1.1)
    }
  }
  // The swallows: low over the near rows, crossing in a second or two, one every few seconds.
  const swallows = smooth(t, 3, 6) * (1 - smooth(t, ORGAN - 2, ORGAN))
  if (swallows > 0) {
    for (let i = 0; i < 3; i++) {
      const every = 6.5 + 1.7 * i
      const k = Math.floor((t + i * 2.2) / every)
      const u = ((t + i * 2.2) % every) / 2.2
      if (u > 1) continue
      const dir = hash(k, 60 + i) < 0.5 ? 1 : -1
      const x = left + (dir > 0 ? u : 1 - u) * W * 1.2 - W * 0.1
      const y = hy + (0.07 + 0.08 * hash(k, 70 + i)) * f + Math.sin(u * 9 + i) * 0.02 * f
      const flap = Math.sin(t * 22 + i * 2)
      wings(path, x, y, f * 0.009, flap * 0.8)
    }
  }
  // The crows: up out of the corn on the organ, away toward the sun.
  if (t > ORGAN - 0.05 && t < 41.5) {
    for (let i = 0; i < 17; i++) {
      // Each goes up on one of the organ's onsets in its first two seconds, the flock in a scatter.
      const cue = GATHER[Math.min(GATHER.length - 1, Math.floor(hash(i, 21) * 6))].t + 0.08 * hash(i, 22)
      const age = t - cue
      if (age <= 0) continue
      const x0 = left + (0.12 + 0.36 * hash(i, 23)) * W
      const y0 = hy + (0.035 + 0.05 * hash(i, 24)) * f
      // Up steeply at first, then away to the right and the sun, climbing less as they go.
      const up = 1 - Math.exp(-age / 1.4)
      const away = Math.max(0, age - 0.6)
      const x = x0 + (0.05 + 0.06 * hash(i, 25)) * f * away + 0.02 * f * Math.sin(age * 1.7 + i)
      const y = y0 - (0.16 + 0.2 * hash(i, 26)) * f * up - 0.012 * f * away + 0.008 * f * Math.sin(age * 2.3 + i * 1.7)
      const size = f * 0.011 * (1 - 0.45 * smooth(age, 0.5, 7))
      const flap = Math.sin(age * (17 + 4 * hash(i, 27)) + i * 1.3)
      wings(path, x, y, size, flap)
    }
  }
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1, f * 0.0024)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(path)
}

/**
 * The drone, as in the film: a long slender wing high over the field, out of the west at the end of the piano and
 * coming down across the sunset toward the far rows as the organ gathers, with the pickup on the ground after it.
 * Returns where it is across the frame (0 to 1), so the truck can chase it, or null when it is not up.
 */
export function drone(s: Screen, t: number, hy: number, ink: string): number | null {
  const from = 27
  if (t < from || t > 41.2) return null
  const { ctx, cx, f } = s
  const W = (f * 16) / 9
  const u = (t - from) / (41.2 - from)
  // Across the frame from beyond its left edge, slowing as it comes down.
  const across = -0.12 + 1.02 * (1 - (1 - u) * (1 - u) * 0.6 - 0.4 * (1 - u))
  const x = cx - W / 2 + across * W
  const y = hy - (0.46 - 0.34 * smooth(u, 0.15, 1)) * f + 0.006 * f * Math.sin(t * 0.9)
  const span = f * 0.07
  const bank = 0.04 * Math.sin(t * 0.55)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(bank)
  ctx.fillStyle = ink
  ctx.strokeStyle = ink
  // The wing: long and thin, a little swept, tips raised.
  ctx.beginPath()
  ctx.moveTo(-span, -span * 0.035)
  ctx.lineTo(-span * 0.1, span * 0.012)
  ctx.lineTo(span * 0.1, span * 0.012)
  ctx.lineTo(span, -span * 0.035)
  ctx.lineTo(span, -span * 0.01)
  ctx.lineTo(span * 0.1, span * 0.04)
  ctx.lineTo(-span * 0.1, span * 0.04)
  ctx.lineTo(-span, -span * 0.01)
  ctx.closePath()
  // The pod under it, and the tail.
  ctx.ellipse(0, span * 0.06, span * 0.13, span * 0.035, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = Math.max(1, f * 0.0018)
  ctx.beginPath()
  ctx.moveTo(-span * 0.1, span * 0.06)
  ctx.lineTo(-span * 0.34, span * 0.05)
  ctx.lineTo(-span * 0.38, span * 0.0)
  ctx.stroke()
  ctx.restore()
  return clamp(across, -0.2, 1.2)
}
