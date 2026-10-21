/**
 * The grade: the colour of the whole film at a moment, laid over every colour a drawing asks for. It is how the show
 * keeps Part Two's arc of light: the orange desert by day; the eclipse that takes the sun, when what is left is
 * infrared, a red without hue; Giedi Prime's black and white under its black sun; and the colour given back by the storm.
 *
 * A drawing names its colours as they are by day (`b.c('#D9955A')`) and the grade turns them. The grade keeps each
 * colour's lightness and gives it the hue of the moment: in infrared a ramp from near black through a dried-blood red to
 * a pale flesh; in black and white a ramp of greys a little harder than the lightness itself. So what was light stays
 * light, what was dark stays dark, and only the colour goes.
 */
import { M } from './music'

export interface GradeKey {
  t: number
  /** How far into infrared, 0 to 1. */
  ir: number
  /** How far into black and white, 0 to 1 (over the infrared). */
  mono: number
}

/**
 * The keys. Before the eclipse, the colours are their own. On the ride's last stretch the moon comes over the sun and the
 * colour drains into infrared; in the silence it goes to black and white, and the dissolve to Giedi Prime finds the arena
 * already there. Giedi Prime is drawn in its own greys, so the grade has nothing to do there; on the storm's dissolve
 * the colour comes back.
 */
export const GRADE: GradeKey[] = [
  { t: 0, ir: 0, mono: 0 },
  { t: M.fall + 2, ir: 0, mono: 0 },
  { t: M.fall + 9.5, ir: 0.92, mono: 0 },
  { t: M.silence - 0.5, ir: 1, mono: 0.15 },
  { t: M.return - 0.5, ir: 1, mono: 1 },
  // Held to the charge's dissolve, so the frame it holds under the storm is still black and white.
  { t: M.charge, ir: 1, mono: 1 },
  { t: M.charge + 1.4, ir: 0, mono: 0 },
]

const smooth = (u: number) => u * u * (3 - 2 * u)

/** The grade's weights at `t`. */
export function gradeAt(t: number): { ir: number; mono: number } {
  const ks = GRADE
  if (t <= ks[0].t) return ks[0]
  if (t >= ks[ks.length - 1].t) return ks[ks.length - 1]
  let i = 0
  while (i + 1 < ks.length && ks[i + 1].t <= t) i++
  const a = ks[i]
  const b = ks[i + 1]
  const u = smooth(Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t))))
  return { ir: a.ir + (b.ir - a.ir) * u, mono: a.mono + (b.mono - a.mono) * u }
}

const IR: [number, [number, number, number]][] = [
  [0, [16, 5, 8]],
  [0.35, [92, 20, 28]],
  [0.62, [168, 60, 58]],
  [1, [246, 222, 210]],
]
const MONO: [number, [number, number, number]][] = [
  [0, [10, 10, 11]],
  [1, [244, 242, 238]],
]

function ramp(stops: [number, [number, number, number]][], y: number): [number, number, number] {
  if (y <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (y <= stops[i][0]) {
      const [a, ca] = stops[i - 1]
      const [b, cb] = stops[i]
      const u = (y - a) / (b - a)
      return [ca[0] + (cb[0] - ca[0]) * u, ca[1] + (cb[1] - ca[1]) * u, ca[2] + (cb[2] - ca[2]) * u]
    }
  }
  return stops[stops.length - 1][1]
}

/** Relative lightness, 0 to 1, of an sRGB colour (a perceptual mix, gamma left in: it is a look, not a measurement). */
function lightness(r: number, g: number, b: number): number {
  return (0.3 * r + 0.59 * g + 0.11 * b) / 255
}

/** A little harder than the lightness itself: black and white wants its contrast. */
const harder = (y: number, by: number) => {
  const s = y * y * (3 - 2 * y)
  return y + (s - y) * by
}

const hexRe = /^#([0-9a-f]{6})$/i
const hex2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')

let cacheT = NaN
let cache = new Map<string, string>()

/** `hex` through the grade at show time `t`. A colour that is not `#rrggbb` passes through. */
export function graded(hex: string, t: number): string {
  if (t !== cacheT) {
    cacheT = t
    cache = new Map()
  }
  const hit = cache.get(hex)
  if (hit) return hit
  const w = gradeAt(t)
  const m = hexRe.exec(hex)
  let out = hex
  if (m && (w.ir > 0.001 || w.mono > 0.001)) {
    const v = parseInt(m[1], 16)
    const r = (v >> 16) & 255
    const g = (v >> 8) & 255
    const b = v & 255
    const y = lightness(r, g, b)
    const ir = ramp(IR, harder(y, 0.5))
    const mono = ramp(MONO, harder(y, 0.6))
    const a = [r + (ir[0] - r) * w.ir, g + (ir[1] - g) * w.ir, b + (ir[2] - b) * w.ir]
    const c = [a[0] + (mono[0] - a[0]) * w.mono, a[1] + (mono[1] - a[1]) * w.mono, a[2] + (mono[2] - a[2]) * w.mono]
    out = `#${hex2(c[0])}${hex2(c[1])}${hex2(c[2])}`
  }
  cache.set(hex, out)
  return out
}
