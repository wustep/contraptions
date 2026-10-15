import { mixHex } from '../../../../parts'
import { FULL } from './lens'
import { DROP, PERIOD, beatAt } from './music'
import { clamp, hash, smooth, type Screen } from './screen'

/**
 * The midway: the rest of the fair, on the horizon beyond the machine. A Ferris wheel, a swing ride, a carousel, a
 * drop tower, two big tops, dark against the glow they throw on the sky, and coming on as the chase goes on: the
 * small wheel's rim as the night's door opens on the drop, then one ride on the downbeat of each phrase of the chase
 * (beats 84, 100, 116), then every bulb on the midway in a wave across the horizon on the full organ, when the
 * house lights come up. The fair is busiest in the last third, as the music is.
 *
 * Far off, so it moves past the camera at a tenth of the machine's pace, between the farm and the far rows, whose
 * ragged top stands in front of its feet. No bloom: a bulb is a dot of colour, and the light is in the sky's glow.
 */

const Q = 0.1

/** The dark the rides stand in, against the glow, and the lights' colours. */
const SIL = '#0F0D21'
const BULB = '#F3D69C'
const ROSE = '#EE9BB0'
const MINT = '#9EDCCB'
const OFF = '#2E2846'

type Kind = 'wheel' | 'swing' | 'carousel' | 'tower' | 'tops'

interface Ride {
  kind: Kind
  /** Along the horizon, frame heights, at the layer's own pace. */
  u: number
  /** Its scale: a wheel's radius, a ride's reach, frame heights. */
  size: number
  /** When it comes on: show time. */
  on: number
}

export const RIDES: Ride[] = [
  { kind: 'tops', u: 0.62, size: 0.075, on: beatAt(84) },
  { kind: 'wheel', u: 0.24, size: 0.085, on: DROP },
  { kind: 'swing', u: -0.28, size: 0.05, on: beatAt(100) },
  { kind: 'carousel', u: -0.7, size: 0.05, on: beatAt(100) },
  { kind: 'tower', u: -1.04, size: 0.3, on: beatAt(116) },
  { kind: 'wheel', u: -1.42, size: 0.19, on: beatAt(116) },
  { kind: 'tops', u: -1.86, size: 0.09, on: FULL },
  { kind: 'swing', u: -2.22, size: 0.055, on: FULL },
]

/** The beats the midway's rides come on, for the checks and the glow. */
export const ONS = [...new Set(RIDES.map((r) => r.on))].sort((a, b) => a - b)

/**
 * How lit a ride is at `t`, 0 to 1: dark until it comes on, its bulbs switching on round it over half a beat, then
 * held at two thirds until the full organ's wave reaches it across the horizon (`across`, 0 left to 1 right, half a
 * beat end to end), when it is all the way up.
 */
function litAt(r: Ride, t: number, across: number): number {
  const first = smooth(t, r.on - 0.04, r.on + PERIOD * 0.5)
  const wave = FULL + PERIOD * 0.5 * clamp(across)
  return r.on >= FULL ? smooth(t, wave - 0.04, wave + PERIOD * 0.5) : 0.66 * first + 0.34 * smooth(t, wave - 0.04, wave + PERIOD * 0.5)
}

/** How far the midway as a whole is lit, 0 to 1: the share of its rides on, for the glow it throws on the sky. */
export function midwayAt(t: number): number {
  let sum = 0
  for (const r of RIDES) sum += litAt(r, t, 0.5)
  return sum / RIDES.length
}

/**
 * The roller coaster, behind the rides: a wooden one, its lift hill, its big drop and two camelbacks, on a lattice of
 * bents. Its train is hauled up the lift through the last bars of each phrase of the chase from beat 100 on and
 * crests on the downbeat, so it goes over the top and down the drop with the music: first on beat 100, and on the full
 * organ, beat 132, the plunge the climax opens on. Then it runs the hills into the brake shed and is back in the
 * station for the next phrase.
 */
const COASTER = { u: -1.3, span: 0.95, height: 0.22, crests: [100, 116, 132, 148, 164, 180, 196].map(beatAt) }
/** The lift takes six beats; the train waits in the station before it. */
const LIFT = 6 * PERIOD

/** The track's height (0 to 1 of the coaster's) at `x` (0 to 1 of its span). */
function trackY(x: number): number {
  const bump = (a: number, b: number) => Math.sin(Math.PI * clamp((x - a) / (b - a)))
  if (x < 0.1) return 0.1
  if (x < 0.36) return 0.1 + 0.9 * smooth(x, 0.1, 0.36) ** 0.85
  if (x < 0.385) return 1
  if (x < 0.53) return 0.06 + 0.94 * (1 + Math.cos(Math.PI * (x - 0.385) / 0.145)) / 2
  if (x < 0.72) return 0.06 + 0.56 * bump(0.53, 0.72)
  if (x < 0.87) return 0.06 + 0.32 * bump(0.72, 0.87)
  return 0.06
}

interface Track {
  /** Samples along the track: across and up, frame heights from its station end and its foot; the length along it. */
  x: Float32Array
  y: Float32Array
  s: Float32Array
  /** The time since the crest the train is at each sample, for those past the crest. */
  run: Float32Array
  crest: number
  shed: number
}

/** The track sampled once, and how long the train takes from the crest to each sample, falling under gravity. */
const TRACK: Track = (() => {
  const n = 480
  const x = new Float32Array(n)
  const y = new Float32Array(n)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    x[i] = u * COASTER.span
    y[i] = trackY(u) * COASTER.height
    if (i) s[i] = s[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1])
  }
  const crest = Math.round(0.375 * (n - 1))
  const shed = Math.round(0.9 * (n - 1))
  // Over the top at the lift's pace, then as fast as the fall from the crest makes it: v² = v0² + 2g(h0 - h).
  const v0 = 0.08
  const g = 0.5
  const run = new Float32Array(n)
  for (let i = crest + 1; i < n; i++) {
    const v = Math.sqrt(v0 * v0 + 2 * g * Math.max(0, y[crest] - y[i]))
    run[i] = run[i - 1] + (s[i] - s[i - 1]) / v
  }
  return { x, y, s, run, crest, shed }
})()

/** How far along the track the train's lead car is at `t` (frame heights), or null while it is in the brake shed. */
function trainAt(t: number): number | null {
  const T = TRACK
  const station = T.s[Math.round(0.07 * (T.s.length - 1))]
  const lift0 = T.s[Math.round(0.1 * (T.s.length - 1))]
  let next = COASTER.crests.find((c) => t < c + T.run[T.shed])
  if (next === undefined) next = COASTER.crests[COASTER.crests.length - 1] + 1e9
  if (t < next - LIFT - 0.8) return station
  if (t < next - LIFT) return station + (lift0 - station) * smooth(t, next - LIFT - 0.8, next - LIFT)
  if (t < next) return lift0 + (T.s[T.crest] - lift0) * (t - (next - LIFT)) / LIFT
  const since = t - next
  if (since >= T.run[T.shed]) return null
  let i = T.crest
  while (i < T.shed && T.run[i + 1] < since) i++
  const f = (since - T.run[i]) / Math.max(1e-6, T.run[i + 1] - T.run[i])
  return T.s[i] + (T.s[i + 1] - T.s[i]) * f
}

/** The track's point and slope at length `along` (frame heights). */
function onTrack(along: number): [number, number, number] {
  const T = TRACK
  let lo = 0
  let hi = T.s.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (T.s[mid] < along) lo = mid
    else hi = mid
  }
  const f = clamp((along - T.s[lo]) / Math.max(1e-6, T.s[hi] - T.s[lo]))
  return [T.x[lo] + (T.x[hi] - T.x[lo]) * f, T.y[lo] + (T.y[hi] - T.y[lo]) * f, Math.atan2(T.y[hi] - T.y[lo], T.x[hi] - T.x[lo])]
}

/** The coaster at `x0` (its station end, device pixels) over the horizon at `hy`, in `ink`, a shade off the rides'. */
function coaster(ctx: CanvasRenderingContext2D, t: number, x0: number, hy: number, f: number, ink: string): void {
  const T = TRACK
  const X = (v: number) => x0 + v * f
  const Y = (v: number) => hy - v * f
  const track = new Path2D()
  const frame = new Path2D()
  track.moveTo(X(T.x[0]), Y(T.y[0]))
  for (let i = 1; i < T.x.length; i += 2) track.lineTo(X(T.x[i]), Y(T.y[i]))
  // The bents under it, every so far along, braced to the next.
  const step = 0.028
  let prev: [number, number] | null = null
  for (let v = 0.12 * COASTER.span; v < 0.87 * COASTER.span; v += step) {
    const h = trackY(v / COASTER.span) * COASTER.height
    frame.moveTo(X(v), Y(h))
    frame.lineTo(X(v), hy)
    if (prev) {
      frame.moveTo(X(prev[0]), Y(prev[1] * 0.5))
      frame.lineTo(X(v), hy)
      frame.moveTo(X(prev[0]), Y(prev[1]))
      frame.lineTo(X(v), Y(h * 0.5))
    }
    prev = [v, h]
  }
  ctx.strokeStyle = ink
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1, f * 0.0012)
  ctx.stroke(frame)
  ctx.lineWidth = Math.max(1.5, f * 0.0028)
  ctx.stroke(track)
  // The station at one end and the brake shed at the other, which the train goes into out of sight.
  ctx.fillStyle = ink
  for (const [a, b] of [[0, 0.12], [0.87, 0.99]]) {
    const xa = X(a * COASTER.span)
    const xb = X(b * COASTER.span)
    const top = Y(COASTER.height * 0.2)
    ctx.beginPath()
    ctx.rect(xa, top, xb - xa, hy - top)
    ctx.moveTo(xa - f * 0.004, top)
    ctx.lineTo((xa + xb) / 2, top - f * 0.014)
    ctx.lineTo(xb + f * 0.004, top)
    ctx.closePath()
    ctx.fill()
  }
  // The train: four cars on the rails, each with its riders' heads over the side.
  const lead = trainAt(t)
  if (lead === null) return
  const car = 0.016
  const cars = new Path2D()
  for (let k = 0; k < 4; k++) {
    const along = lead - k * car
    if (along < T.s[Math.round(0.1 * (T.s.length - 1))] - 0.001 || along > T.s[T.shed]) continue
    const [cx, cy, a] = onTrack(along)
    const c = Math.cos(a)
    const sn = Math.sin(a)
    const px = X(cx)
    const py = Y(cy)
    // A point `dx` along the rail and `dy` up off it, square to it.
    const corner = (dx: number, dy: number): [number, number] => [px + (dx * c - dy * sn) * f, py - (dx * sn + dy * c) * f]
    const pts = [corner(-car * 0.45, 0.002), corner(car * 0.45, 0.002), corner(car * 0.45, 0.009), corner(-car * 0.45, 0.009)]
    cars.moveTo(...pts[0])
    for (const p of pts.slice(1)) cars.lineTo(...p)
    cars.closePath()
    for (const dx of [-0.2, 0.2]) {
      const [hx, hyy] = corner(car * dx, 0.012)
      cars.moveTo(hx + f * 0.0028, hyy)
      cars.arc(hx, hyy, f * 0.0028, 0, Math.PI * 2)
    }
  }
  ctx.fill(cars)
}

/** The bulbs of one colour, as one path, filled once. */
class Bulbs {
  private readonly paths = new Map<string, Path2D>()
  constructor(private readonly r: number) {}
  add(x: number, y: number, color: string, size = 1): void {
    let p = this.paths.get(color)
    if (!p) this.paths.set(color, (p = new Path2D()))
    const r = this.r * size
    p.moveTo(x + r, y)
    p.arc(x, y, r, 0, Math.PI * 2)
  }
  fill(ctx: CanvasRenderingContext2D): void {
    for (const [color, p] of this.paths) {
      ctx.fillStyle = color
      ctx.fill(p)
    }
  }
}

/** A bulb's colour when `lit` (0 to 1), among the colours a ride strings: off, then its own. */
const bulb = (color: string, lit: number): string => (lit <= 0.01 ? OFF : mixHex(OFF, color, Math.min(1, lit * 1.2)))

/** The midway over the horizon at `hy` (device pixels), `t` show seconds in, against a sky whose foot is `sky`. */
export function midway(s: Screen, t: number, hy: number, sky: string): void {
  const { ctx, cx, f, w } = s
  const at = (s.camX * Q) / 8
  const half = w / 2 / f
  const W = (f * 16) / 9
  const bulbs = new Bulbs(Math.max(1, f * 0.0026))
  const sil = new Path2D()
  const lines = new Path2D()
  const glass: [Path2D, string][] = []
  // The coaster first, behind the rides, a shade into the sky, as it stands farther off.
  const cu = COASTER.u - at
  if (cu < half + 0.1 && cu + COASTER.span > -half - 0.1) coaster(ctx, t, cx + cu * f, hy, f, mixHex(SIL, sky, 0.18))
  for (const r of RIDES) {
    const u = r.u - at
    if (Math.abs(u) > half + 0.25) continue
    const x = cx + u * f
    const across = clamp((x - (cx - W / 2)) / W)
    const lit = litAt(r, t, across)
    if (r.kind === 'wheel') wheel(x, r, lit)
    else if (r.kind === 'swing') swing(x, r, lit)
    else if (r.kind === 'carousel') carousel(x, r, lit)
    else if (r.kind === 'tower') tower(x, r, lit)
    else tops(x, r, lit)
  }
  for (const [p, color] of glass) {
    ctx.fillStyle = color
    ctx.fill(p)
  }
  ctx.fillStyle = SIL
  ctx.fill(sil)
  ctx.strokeStyle = SIL
  ctx.lineWidth = Math.max(1, f * 0.0018)
  ctx.lineCap = 'round'
  ctx.stroke(lines)
  bulbs.fill(ctx)

  /** The Ferris wheel: an A-frame, two rims and their spokes, cars hanging level, bulbs round the rim. */
  function wheel(x: number, r: Ride, lit: number): void {
    const R = r.size * f
    const hx = x
    const hyb = hy - R - f * 0.022
    // Slow, a turn a minute, a little quicker once the full organ is in.
    const turn = (t / 60 + 0.25 * Math.max(0, t - FULL) / 60) * Math.PI * 2 + r.u * 3
    lines.moveTo(hx, hyb)
    lines.lineTo(hx - R * 0.55, hy)
    lines.moveTo(hx, hyb)
    lines.lineTo(hx + R * 0.55, hy)
    lines.moveTo(hx - R * 0.3, hyb + R * 0.55)
    lines.lineTo(hx + R * 0.3, hyb + R * 0.55)
    lines.moveTo(hx + R, hyb)
    lines.arc(hx, hyb, R, 0, Math.PI * 2)
    lines.moveTo(hx + R * 0.9, hyb)
    lines.arc(hx, hyb, R * 0.9, 0, Math.PI * 2)
    const n = 16
    const cars = new Path2D()
    for (let k = 0; k < n; k++) {
      const a = turn + (k * Math.PI * 2) / n
      const ex = hx + Math.cos(a) * R
      const ey = hyb + Math.sin(a) * R
      lines.moveTo(hx, hyb)
      lines.lineTo(ex, ey)
      // The car hangs level under its pin.
      const cw = R * 0.1
      const ch = R * 0.085
      cars.rect(ex - cw / 2, ey + R * 0.02, cw, ch)
      sil.rect(ex - cw * 0.6, ey + R * 0.015, cw * 1.2, R * 0.012)
    }
    sil.moveTo(hx + R * 0.06, hyb)
    sil.arc(hx, hyb, R * 0.06, 0, Math.PI * 2)
    // The cars lit from inside once the wheel is.
    glass.push([cars, lit > 0.01 ? mixHex(SIL, '#8C6A6E', 0.8 * lit) : SIL])
    // Bulbs round the rim, every other one warm and rose, coming on round the wheel from the top.
    const m = 40
    for (let k = 0; k < m; k++) {
      const a = turn + (k * Math.PI * 2) / m
      const order = ((k / m + 0.25) % 1)
      const here = clamp(lit * 1.6 - order * 0.6)
      bulbs.add(hx + Math.cos(a) * R, hyb + Math.sin(a) * R, bulb(k % 2 ? ROSE : BULB, here))
    }
  }

  /** The swing ride: a tower, its crown tilting as it turns, and the chairs flung out on their chains. */
  function swing(x: number, r: Ride, lit: number): void {
    const S = r.size * f
    const top = hy - f * 0.14
    // At rest until it comes on, then up to speed over a bar; quicker again for the full organ.
    const run = smooth(t, r.on, r.on + 4 * PERIOD) * (0.8 + 0.2 * smooth(t, FULL, FULL + 4 * PERIOD))
    const turn = spin(t, r.on, 0.3) + r.u
    const out = 0.95 * run * run
    const tilt = 0.18 * run * Math.sin(t * 0.7 + r.u)
    sil.rect(x - S * 0.08, top, S * 0.16, hy - top)
    // The crown: a shallow cone over a rim.
    sil.moveTo(x, top - S * 0.32)
    sil.lineTo(x + S, top + tilt * S)
    sil.lineTo(x - S, top - tilt * S)
    sil.closePath()
    const n = 12
    for (let k = 0; k < n; k++) {
      const a = turn + (k * Math.PI * 2) / n
      const c = Math.cos(a)
      const sn = Math.sin(a)
      const rimX = x + S * c
      const rimY = top + S * 0.2 * sn - tilt * S * c
      const L = S * 0.95
      const reach = S + L * Math.sin(out)
      const seatX = x + reach * c
      const seatY = top + L * Math.cos(out) + reach * 0.2 * sn - tilt * reach * c
      lines.moveTo(rimX, rimY)
      lines.lineTo(seatX, seatY)
      sil.rect(seatX - S * 0.06, seatY, S * 0.12, S * 0.07)
      bulbs.add(rimX, rimY, bulb(k % 3 ? BULB : MINT, lit))
    }
    bulbs.add(x, top - S * 0.32, bulb(ROSE, lit), 1.3)
  }

  /** The carousel: a striped roof on its pole, lit under, the horses going round and up and down. */
  function carousel(x: number, r: Ride, lit: number): void {
    const C = r.size * f
    const eave = hy - f * 0.05
    const peak = eave - C * 0.55
    sil.moveTo(x, peak)
    sil.lineTo(x + C * 1.15, eave)
    sil.lineTo(x - C * 1.15, eave)
    sil.closePath()
    sil.rect(x - C * 1.1, eave, C * 2.2, C * 0.12)
    sil.rect(x - C * 0.05, peak - C * 0.18, C * 0.1, C * 0.18)
    // Under the roof, the light of the ride, then the horses against it.
    const room = new Path2D()
    room.rect(x - C, eave + C * 0.12, C * 2, hy - eave - C * 0.12)
    glass.push([room, lit > 0.01 ? mixHex(SIL, '#C99572', 0.8 * lit) : SIL])
    const turn = spin(t, r.on, 0.12) + r.u
    for (let k = 0; k < 8; k++) {
      const a = turn + (k * Math.PI * 2) / 8
      const hxp = x + Math.cos(a) * C * 0.85
      const bob = Math.sin(a * 2 + t * 2.4) * C * 0.06 * smooth(lit, 0, 0.3)
      const y = eave + C * 0.42 + bob
      lines.moveTo(hxp, eave + C * 0.12)
      lines.lineTo(hxp, hy)
      sil.moveTo(hxp + C * 0.13, y)
      sil.ellipse(hxp, y, C * 0.13, C * 0.06, 0, 0, Math.PI * 2)
      sil.rect(hxp + C * (Math.sin(a) > 0 ? 0.08 : -0.13), y - C * 0.12, C * 0.05, C * 0.12)
    }
    for (let k = 0; k <= 14; k++) bulbs.add(x - C * 1.1 + (k * C * 2.2) / 14, eave + C * 0.06, bulb(k % 2 ? BULB : ROSE, lit))
  }

  /** The drop tower: a lattice mast, its ring going up through each phrase and falling on the next downbeat. */
  function tower(x: number, r: Ride, lit: number): void {
    const H = r.size * f
    const top = hy - H
    const half = f * 0.006
    lines.moveTo(x - half, hy)
    lines.lineTo(x - half, top)
    lines.moveTo(x + half, hy)
    lines.lineTo(x + half, top)
    for (let y = hy - f * 0.02; y > top; y -= f * 0.02) {
      lines.moveTo(x - half, y)
      lines.lineTo(x + half, y - f * 0.02)
    }
    sil.rect(x - half * 2, top - f * 0.012, half * 4, f * 0.012)
    const h = ringAt(t, r.on)
    const ry = hy - f * 0.03 - h * (H - f * 0.06)
    sil.rect(x - half * 3.2, ry - f * 0.008, half * 6.4, f * 0.016)
    for (let k = 0; k < 5; k++) bulbs.add(x - half * 2.6 + (k * half * 5.2) / 4, ry, bulb(k % 2 ? MINT : BULB, lit), 0.8)
    // A steady red light on its top, as a mast has.
    bulbs.add(x, top - f * 0.016, mixHex(OFF, '#E0504A', 0.4 + 0.6 * lit), 1.1)
  }

  /** Two big tops side by side, striped, lit from inside, their pennants out on the wind; a string of bulbs over them. */
  function tops(x: number, r: Ride, lit: number): void {
    const T = r.size * f
    for (const [dx, sc] of [[-0.55, 1], [0.6, 0.78]] as const) {
      const tx = x + dx * T
      const th = T * 0.9 * sc
      const tw = T * 0.75 * sc
      const ridge = hy - th
      const eaves = hy - th * 0.45
      // The canvas, in stripes: dark ones and, once lit, ones the light inside comes through.
      const lightC = lit > 0.01 ? mixHex(SIL, '#B7766E', 0.7 * lit) : SIL
      const stripes = new Path2D()
      for (let k = 0; k < 6; k++) {
        const a = -tw + (k * 2 * tw) / 6
        const b = a + tw / 3
        stripes.moveTo(tx, ridge)
        stripes.lineTo(tx + b, eaves)
        stripes.lineTo(tx + b * 1.08, hy)
        stripes.lineTo(tx + a * 1.08, hy)
        stripes.lineTo(tx + a, eaves)
        stripes.closePath()
      }
      glass.push([stripes, lightC])
      for (let k = 0; k < 6; k += 2) {
        const a = -tw + (k * 2 * tw) / 6
        const b = a + tw / 3
        sil.moveTo(tx, ridge)
        sil.lineTo(tx + b, eaves)
        sil.lineTo(tx + b * 1.08, hy)
        sil.lineTo(tx + a * 1.08, hy)
        sil.lineTo(tx + a, eaves)
        sil.closePath()
      }
      // The pole and its pennant, out on the wind and fluttering.
      lines.moveTo(tx, ridge)
      lines.lineTo(tx, ridge - T * 0.22 * sc)
      const fy = ridge - T * 0.22 * sc
      const flap = Math.sin(t * 6 + dx * 9) * T * 0.03
      sil.moveTo(tx, fy)
      sil.lineTo(tx + T * 0.16 * sc, fy + T * 0.03 + flap)
      sil.lineTo(tx, fy + T * 0.07)
      sil.closePath()
      for (let k = 0; k <= 8; k++) bulbs.add(tx - tw + (k * 2 * tw) / 8, eaves, bulb(k % 2 ? BULB : ROSE, lit), 0.8)
    }
    // A string of bulbs from one top's pole to the other's, sagging.
    const a = [x - 0.55 * T, hy - T * 0.9]
    const b = [x + 0.6 * T, hy - T * 0.9 * 0.78]
    for (let k = 1; k < 12; k++) {
      const u = k / 12
      const sx = a[0] + (b[0] - a[0]) * u
      const sy = a[1] + (b[1] - a[1]) * u + Math.sin(Math.PI * u) * T * 0.18
      bulbs.add(sx, sy, bulb(hash(k, 3) < 0.5 ? BULB : MINT, lit), 0.75)
    }
  }
}

/** How far round a ride has turned at `t`, radians: still until `on`, up to `rate` turns a second over a bar. */
function spin(t: number, on: number, rate: number): number {
  const ramp = 4 * PERIOD
  if (t <= on) return 0
  // The angle is the integral of the speed, which comes up as a smoothstep and then holds.
  const u = Math.min(1, (t - on) / ramp)
  const during = ramp * (u * u * u - (u * u * u * u) / 2)
  const after = Math.max(0, t - on - ramp)
  return rate * (during + after) * Math.PI * 2
}

/**
 * The drop tower's ring, 0 at the foot to 1 at the top: resting until it comes on, then up through each phrase of
 * sixteen beats and down on the next downbeat, in a third of a beat.
 */
function ringAt(t: number, on: number): number {
  if (t < on) return 0
  const phrase = 16 * PERIOD
  const k = Math.floor((t - on) / phrase)
  const into = t - on - k * phrase
  const next = on + (k + 1) * phrase
  const fall = PERIOD / 3
  if (t > next - fall) return smooth(next - t, 0, fall) ** 0.5
  // Up over the first twelve beats, held at the top until it falls.
  return smooth(into, PERIOD, 12 * PERIOD)
}

interface Balloon {
  /** Let go at, show time; where along the horizon, at the midway's pace; how quick up and across, frame heights a second. */
  t: number
  u: number
  rise: number
  drift: number
  color: string
}

/**
 * Balloons let go at the fair: one through the chase, a child's, and on the full organ a bunch of them, rising
 * through the last third of the song on the wind, smaller as they go. They are far off, over the midway, behind the
 * machine.
 */
const BALLOONS: Balloon[] = [
  { t: beatAt(76), u: 0.36, rise: 0.016, drift: 0.005, color: '#D8576F' },
  ...Array.from({ length: 9 }, (_, i) => ({
    t: FULL + 0.12 * i + 0.2 * hash(i, 41),
    u: -0.92 + 0.06 * (hash(i, 42) - 0.5),
    rise: 0.013 + 0.008 * hash(i, 43),
    drift: 0.003 + 0.004 * hash(i, 44),
    color: ['#D8576F', '#4FB0BE', '#DDBB4C', '#9C82D2', '#E58C6A'][i % 5],
  })),
]

export function balloons(s: Screen, t: number, hy: number): void {
  const { ctx, cx, f, w } = s
  const at = (s.camX * Q) / 8
  const strings = new Path2D()
  for (const [i, b] of BALLOONS.entries()) {
    const age = t - b.t
    if (age <= 0) continue
    // Up quickly off the ground, clear of the fair's floors in a few seconds, then on the wind.
    const rise = b.rise * age * (1 - 0.15 * smooth(age, 0, 30)) + 0.09 * (1 - Math.exp(-age / 1.8))
    const x = cx + (b.u - at + b.drift * age + 0.012 * Math.sin(age * 0.8 + i)) * f
    const y = hy - f * 0.06 - rise * f
    const r = f * 0.0085 * (1 - 0.35 * smooth(age, 0, 35))
    if (y < -r * 4 || x < -r * 4 || x > w + r * 4) continue
    // Lit from under by the fair, so its lower half is the brighter.
    const tilt = 0.1 * Math.sin(age * 1.3 + i)
    ctx.fillStyle = mixHex(b.color, '#1B1733', 0.35)
    ctx.beginPath()
    ctx.ellipse(x, y, r * 0.86, r, tilt, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = mixHex(b.color, '#F3D69C', 0.1)
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.28, r * 0.72, r * 0.62, tilt, 0, Math.PI)
    ctx.fill()
    strings.moveTo(x, y + r)
    strings.quadraticCurveTo(x + r * 0.8 * Math.sin(age * 2 + i), y + r * 2.4, x - r * 0.3, y + r * 3.6)
  }
  ctx.strokeStyle = 'rgba(190, 180, 220, 0.45)'
  ctx.lineWidth = Math.max(1, f * 0.0012)
  ctx.stroke(strings)
}
