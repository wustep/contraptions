import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { BUMPS, LIFT } from './sky-plan'
import { mix, rgba, type C2 } from './paint'

/**
 * The sky's world beyond the machine (B's): the overcast's underside going away to the horizon in three long layers,
 * the cold sun breaking through as the skids leave the pad, the far mountains of the coast under their snow, and
 * icebergs at their own distances.
 *
 * Everything is drawn through the one eye the sea is drawn with (`sky-draw.ts`): the horizon at the frame's middle,
 * and a thing `z` from the eye drawn `F / z` of its size, `F` being the distance of the plane the machine is in. So
 * the far layers hardly move as the helicopter goes, and the near ones sweep by: the parallax is the projection's own.
 */

/** The distance of the machine's plane from the eye. */
export const F = 10

/** The frame, with the horizon and its size: what every far thing is placed from. */
export interface Eye {
  x0: number
  x1: number
  y0: number
  y1: number
  cx: number
  cy: number
  hz: number
  fw: number
  fh: number
}

/** A point `z` from the eye, `gx` along and at height `y` (world cells): where it is drawn, and how big. */
export function project(e: Eye, gx: number, y: number, z: number): { x: number; y: number; s: number } {
  const s = F / z
  return { x: e.cx + (gx - e.cx) * s, y: e.hz + (y - e.hz) * s, s }
}

export const AIR = {
  deck: '#ACB4B7',
  deckShade: '#97A1A6',
  haze: '#CDD3D1',
  rock: '#6F7D82',
  rockFar: '#9AA6AA',
  snow: '#EEF1EF',
  snowFar: '#DCE2E2',
  berg: '#EEF2F0',
  bergShade: '#A9BEC4',
}

/** The cold sun: hidden by the overcast at the pad, breaking through as the skids leave it, and staying out. */
export const sunAt = (t: number): number => smooth(t, LIFT - 0.4, LIFT + 2.6)

/** Where the sun is on the screen: at no distance at all, so fixed in the frame, up and to the right of the middle. */
export function sunXY(e: Eye): [number, number] {
  return [e.cx + 0.2 * e.fw, e.hz - 0.34 * e.fh]
}

/** The sun's radius, of the frame's height. */
const SUN_R = 0.045

/** The air dropping from under the cabin: a jolt the near clouds feel most. */
function jolt(t: number): number {
  let d = 0
  for (const b of BUMPS) {
    const u = t - (b - 0.32)
    if (u < 0 || u > 1.4) continue
    d += Math.sin(Math.min(1, u / 0.32) * Math.PI * 0.5) * Math.exp(-Math.max(0, u - 0.32) / 0.3) * (1 + 0.25 * Math.sin(u * 40) * Math.exp(-u / 0.25))
  }
  return d
}

/* ------------------------------------------------------------------ the overcast */

/** The overcast's underside: a ceiling of cloud this far above the sea, going away to the horizon. */
const DECK_Y = -15.5

/** The overcast's three layers, nearest first: each one flat grey, paler the farther it is. */
const LAYERS = [mix(AIR.deck, AIR.deckShade, 0.35), mix(AIR.deck, AIR.haze, 0.3), mix(AIR.deck, AIR.haze, 0.62)]

/**
 * The underside of the overcast: three long soft layers going away to the horizon, each farther one lower on the
 * screen, paler and slower across it. The nearest is a ceiling along the frame's top, its edge swelling and lifting
 * slowly; the two beyond it are long bands, now and then breaking off where the paler sky shows. Each is one flat
 * grey. Once the sun is out they draw back round it in a round arch above and a bowl below, so it sits in a break
 * that is always there; the wind takes them all along.
 */
export function drawDeck(g: C2, k: number, e: Eye, t: number): void {
  const sun = sunAt(t)
  const [sx, sy] = sunXY(e)
  const R = SUN_R * e.fh
  // How far from the sun's height the cloud keeps at `x`: clear of it over its middle, less and less either side in a
  // broad shallow arch (wider than the sun, so the break is not a ring round it), and not at all till it is out.
  const clear = (x: number, c: number): number => c * R - 2 * R * ((x - sx) / (5 * R)) ** 2 - (1 - sun) * e.fh
  const shake = jolt(t)
  const D = Math.abs(DECK_Y - e.hz)
  // The nearest layer hangs just inside the frame's top: the overcast fills the sky from there to the horizon.
  const z0 = Math.max(12, (F * D) / Math.max(0.5, e.hz - e.y0 - 0.25))
  const drift = t * 1.2
  const N = 96
  const lo = e.x0 - 1
  const step = (e.x1 - e.x0 + 2) / N
  // The far layers first, so a nearer one lies over the one beyond it.
  for (let r = LAYERS.length - 1; r >= 0; r--) {
    const s = F / (z0 * Math.pow(2, r))
    const gap = D * s * 0.5 * (r === 0 ? 1.3 : 1)
    const yRow = e.hz - D * s + shake * 0.5 * s
    if (yRow - gap > e.y1 || yRow + gap < e.y0 - 0.5) continue
    // A layer above the sun arches over it, one below bows under it; one passing its height as the camera moves goes
    // from the one to the other by degrees. The nearest, the ceiling, always arches over it, even where the horizon is
    // high in the frame (the sea's, from under the water) and the sun higher than its row.
    const above = r === 0 ? 1 : smooth(sy - yRow, -0.3 * gap, 0.3 * gap)
    const path = new Path2D()
    const top: Pt[] = []
    const low: Pt[] = []
    const close = () => {
      if (top.length > 1) outline(path, k, top, low)
      top.length = 0
      low.length = 0
    }
    for (let i = 0; i <= N; i++) {
      const x = lo + i * step
      const gx = e.cx + (x - e.cx) / s - drift
      // Long swells along it, changing slowly; where they sum below nothing, a band breaks off, its ends round.
      const n = 0.52 + 0.34 * Math.sin(gx / 23 + r * 2.1 + t * 0.03) + 0.24 * Math.sin(gx / 8.3 + r * 0.7 - t * 0.05)
      const swell = 0.55 + 0.45 * Math.max(0, Math.min(1, n))
      const end = r === 0 ? 1 : Math.sqrt(Math.max(0, Math.min(1, n * 4)))
      const f = gap * swell * end
      let a = r === 0 ? Math.min(e.y0 - 1, yRow - f * 0.4) : yRow - f * 0.4
      let b = yRow + f * 0.6 * (1 + 0.18 * Math.sin(gx / 6.1 + r * 1.3 + t * 0.08))
      if (above > 0) b += (smin(b, sy - clear(x, 1.7), R) - b) * above
      if (above < 1) a += (-smin(-a, -(sy + clear(x, 1.4)), R) - a) * (1 - above)
      if (r > 0 && b - a < 0.004) {
        close()
        continue
      }
      top.push([x, a])
      low.push([x, b])
    }
    close()
    g.fillStyle = LAYERS[r]
    g.fill(path)
  }
}

/** The lesser of `a` and `b`, rounded off where they meet, over about `w`. */
function smin(a: number, b: number, w: number): number {
  const h = Math.max(w - Math.abs(a - b), 0) / w
  return Math.min(a, b) - h * h * w * 0.25
}

/** A closed shape along `top` and back along `bottom` (both left to right), into `path`. */
function outline(path: Path2D, k: number, top: Pt[], bottom: Pt[]): void {
  top.forEach(([x, y], i) => (i ? path.lineTo(x * k, y * k) : path.moveTo(x * k, y * k)))
  for (let i = bottom.length - 1; i >= 0; i--) path.lineTo(bottom[i][0] * k, bottom[i][1] * k)
  path.closePath()
}

/** The sun itself: a plain cold silver disc, drawn on the sky before the deck, in the break it opens. */
export function drawSun(g: C2, k: number, e: Eye, t: number): void {
  const sun = sunAt(t)
  if (sun <= 0.01) return
  const [sx, sy] = sunXY(e)
  g.fillStyle = rgba('#F4F5F0', sun)
  g.beginPath()
  g.arc(sx * k, sy * k, SUN_R * e.fh * k, 0, Math.PI * 2)
  g.fill()
}

/* ------------------------------------------------------------------ the coast */

/**
 * The coast of Greenland far off, in two ranges: the farther higher and paler under more snow, the nearer lower,
 * darker rock streaked with snow in its gullies. Barely moving as the helicopter goes.
 */
export function drawRanges(g: C2, k: number, e: Eye, t: number): void {
  const shake = jolt(t) * 0.02
  for (const R of [
    { par: 0.992, step: 0.5, h: 1.35, seed: 3, rock: AIR.rockFar, snow: AIR.snowFar, line: 0.45, fog: 0.45 },
    { par: 0.982, step: 0.32, h: 0.8, seed: 7, rock: AIR.rock, snow: AIR.snow, line: 0.55, fog: 0.3 },
  ]) {
    const scale = e.fh / 6.6
    const h = R.h * Math.min(1.6, Math.max(0.8, scale))
    const xa = Math.floor((e.x0 - 1 - e.cx * R.par) / R.step) * R.step
    // Each point keeps its place along the range (`i`), so its snow is its own however the frame cuts the range.
    const ridge: [number, number, number][] = []
    for (let u = xa; u <= e.x1 + 1 - e.cx * R.par + R.step; u += R.step) {
      const i = Math.round(u / R.step)
      const big = Math.max(0, Math.sin(i * 0.11 + R.seed) * 0.6 + Math.sin(i * 0.047 + R.seed * 2) * 0.5)
      const y = h * (0.18 + 0.75 * big * (0.6 + 0.4 * hash(i >> 2, R.seed)) + 0.1 * hash(i, R.seed + 1))
      ridge.push([u + e.cx * R.par, e.hz - y + shake, i])
    }
    const foot = e.hz + 0.05
    const rock = new Path2D()
    rock.moveTo(ridge[0][0] * k, foot * k)
    for (const [x, y] of ridge) rock.lineTo(x * k, y * k)
    rock.lineTo(ridge[ridge.length - 1][0] * k, foot * k)
    rock.closePath()
    // The snow: down from the ridge to a ragged line, deeper in the gullies.
    const snow = new Path2D()
    snow.moveTo(ridge[0][0] * k, ridge[0][1] * k)
    for (const [x, y] of ridge) snow.lineTo(x * k, y * k)
    for (let j = ridge.length - 1; j >= 0; j--) {
      const [x, y, i] = ridge[j]
      const depth = Math.max(0, foot - y) * (R.line + 0.3 * hash(i, R.seed + 5))
      snow.lineTo(x * k, (y + depth) * k)
    }
    snow.closePath()
    g.fillStyle = mix(R.rock, '#C9D0D0', R.fog)
    g.fill(rock)
    g.fillStyle = rgba(R.snow, 0.92)
    g.fill(snow)
  }
}

/* ------------------------------------------------------------------ on the sea */

interface Berg {
  gx: number
  z: number
  w: number
  h: number
  seed: number
}
/** The icebergs: a few, at their own distances along the way, tabular and pinnacled. */
const BERGS: Berg[] = [
  { gx: 14, z: 130, w: 9, h: 3.2, seed: 1 },
  { gx: 40, z: 75, w: 5, h: 3.4, seed: 2 },
  { gx: 62, z: 160, w: 12, h: 2.6, seed: 3 },
  { gx: 78, z: 46, w: 3.2, h: 1.9, seed: 4 },
  { gx: 96, z: 95, w: 6, h: 4.2, seed: 5 },
  { gx: 120, z: 60, w: 4, h: 1.6, seed: 6 },
  { gx: -14, z: 110, w: 7, h: 2.8, seed: 7 },
  { gx: 140, z: 140, w: 8, h: 3.6, seed: 8 },
]

/**
 * The icebergs, standing out of the sea at their distances: a sunlit face and a shaded one, a little foam at the
 * waterline, the farther the more lost in the haze. Drifting, slowly.
 */
export function drawBergs(g: C2, k: number, e: Eye, t: number, surf: number, seaFar: string): void {
  const sun = sunAt(t)
  for (const b of [...BERGS].sort((p, q) => q.z - p.z)) {
    const q = project(e, b.gx + 0.06 * t, surf, b.z)
    const w = b.w * q.s
    const h = b.h * q.s
    if (q.x + w < e.x0 || q.x - w > e.x1) continue
    const fog = Math.min(0.55, Math.pow(1 - q.s, 3) * 0.6)
    // A pinnacled berg or a tabular one: its outline across the top, from the left foot to the right.
    const shape = b.seed % 2 ? PINNACLE : TABLE
    const pts: [number, number][] = shape.map(([u, v], i) => [q.x - w / 2 + u * w, q.y + v * h * (0.85 + 0.3 * hash(i, b.seed, 71))])
    const peak = shape.reduce((best, p, i) => (p[1] < shape[best][1] ? i : best), 0)
    const whole = new Path2D()
    pts.forEach(([x, y], i) => (i ? whole.lineTo(x * k, y * k) : whole.moveTo(x * k, y * k)))
    whole.closePath()
    g.fillStyle = mix(mix(AIR.bergShade, AIR.berg, 0.2 * sun), seaFar, fog)
    g.fill(whole)
    // The faces toward the sun, lit: from its highest point to its right foot.
    const lit = new Path2D()
    lit.moveTo(pts[peak][0] * k, q.y * k)
    for (let i = peak; i < pts.length; i++) lit.lineTo(pts[i][0] * k, pts[i][1] * k)
    lit.closePath()
    g.fillStyle = mix(AIR.berg, seaFar, fog * 0.7)
    g.fill(lit)
    g.fillStyle = rgba('#F4F7F5', 0.5 * (1 - fog))
    g.fillRect((q.x - w * 0.6) * k, (q.y - 0.02 * q.s) * k, w * 1.2 * k, Math.max(1 / k, 0.06 * q.s) * k)
  }
}

const PINNACLE: [number, number][] = [[0, 0], [0.06, -0.28], [0.18, -0.42], [0.3, -0.55], [0.38, -0.95], [0.46, -1], [0.55, -0.7], [0.66, -0.62], [0.8, -0.45], [0.92, -0.3], [1, 0]]
const TABLE: [number, number][] = [[0, 0], [0.03, -0.75], [0.2, -0.85], [0.45, -0.82], [0.52, -0.66], [0.6, -0.8], [0.9, -0.7], [0.97, -0.4], [1, 0]]

/* ------------------------------------------------------------------ Nuuk, across the harbour */

const HOUSES = ['#C08A3E', '#4F8C88', '#CFA43E', '#4E6F94', '#E4E6E1', '#6E8F6A']

/**
 * Nuuk across the harbour from the pad: Sermitsiaq's dark bulk under its snow beyond the town, the low shore, and a
 * few houses up it in their colours (ochre, teal, mustard, blue, white). Left behind as the helicopter goes.
 */
export function drawTown(g: C2, k: number, e: Eye, surf: number, haze: string): void {
  // Seen from the pad and the first of the climb; below the horizon from any height, and out over the sea, it is
  // left behind.
  const seen = (1 - smooth(surf - e.hz, 2.6, 4.2)) * (1 - smooth(e.cx, 26, 34))
  if (seen <= 0.01) return
  // As the helicopter climbs the town falls away behind it: farther off, so its shore stays on the horizon's haze
  // rather than sinking into the sea in front.
  const z = Math.max(26, (F * (surf - e.hz)) / 0.45)
  const a = project(e, -40, surf, z)
  const b = project(e, 20, surf, z)
  if (b.x < e.x0 - 1 || a.x > e.x1 + 1) return
  g.save()
  g.globalAlpha = seen
  // The mountain, beyond.
  const m = project(e, -14, surf, z * (70 / 26))
  const ms = m.s
  const peak: [number, number][] = [
    [m.x - 9 * ms, m.y],
    [m.x - 5.5 * ms, m.y - 2.8 * ms],
    [m.x - 3.2 * ms, m.y - 4.6 * ms],
    [m.x - 1.4 * ms, m.y - 7.4 * ms],
    [m.x + 0.6 * ms, m.y - 7.6 * ms],
    [m.x + 2.2 * ms, m.y - 6.2 * ms],
    [m.x + 4.8 * ms, m.y - 4.4 * ms],
    [m.x + 8.5 * ms, m.y - 1.6 * ms],
    [m.x + 11 * ms, m.y],
  ]
  const rock = new Path2D()
  peak.forEach(([x, y], i) => (i ? rock.lineTo(x * k, y * k) : rock.moveTo(x * k, y * k)))
  rock.closePath()
  g.fillStyle = mix('#59666B', haze, 0.45)
  g.fill(rock)
  const snow = new Path2D()
  peak.forEach(([x, y], i) => (i ? snow.lineTo(x * k, y * k) : snow.moveTo(x * k, y * k)))
  for (let i = peak.length - 1; i >= 0; i--) {
    const [x, y] = peak[i]
    snow.lineTo(x * k, (y + (m.y - y) * (0.35 + 0.25 * hash(i, 101))) * k)
  }
  snow.closePath()
  g.fillStyle = mix(AIR.snow, haze, 0.25)
  g.fill(snow)
  // The shore: low hills, and the houses up them.
  const s = a.s
  const hill = (x: number) => s * (0.9 + 0.5 * Math.sin((x - a.x) / (s * 7)) + 0.3 * Math.sin((x - a.x) / (s * 2.3)))
  const shore = new Path2D()
  shore.moveTo(a.x * k, (a.y + 0.04) * k)
  for (let x = a.x; x <= b.x; x += 0.12) shore.lineTo(x * k, (a.y - hill(x)) * k)
  shore.lineTo(b.x * k, (a.y + 0.04) * k)
  shore.closePath()
  g.fillStyle = mix('#5E6A64', haze, 0.4)
  g.fill(shore)
  const walls = HOUSES.map(() => new Path2D())
  const roofs = new Path2D()
  for (let i = 0; i < 24; i++) {
    const x = a.x + (b.x - a.x) * ((i + hash(i, 102)) / 24)
    if (x < e.x0 - 0.5 || x > e.x1 + 0.5) continue
    const up = hill(x) * (0.15 + 0.75 * hash(i, 103))
    const w = s * (0.55 + 0.35 * hash(i, 104))
    const h = s * (0.38 + 0.22 * hash(i, 105))
    const y = a.y - up
    walls[Math.floor(hash(i, 106) * HOUSES.length)].rect((x - w / 2) * k, (y - h) * k, w * k, h * k)
    roofs.moveTo((x - w / 2 - 0.04 * s) * k, (y - h) * k)
    roofs.lineTo(x * k, (y - h - 0.22 * s) * k)
    roofs.lineTo((x + w / 2 + 0.04 * s) * k, (y - h) * k)
    roofs.closePath()
  }
  walls.forEach((p, i) => {
    g.fillStyle = mix(HOUSES[i], haze, 0.3)
    g.fill(p)
  })
  g.fillStyle = mix('#36403F', haze, 0.3)
  g.fill(roofs)
  g.restore()
}
