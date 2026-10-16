import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { BUMPS, LIFT } from './sky-plan'
import { mix, rgba, type C2 } from './paint'

/**
 * The sky's world beyond the machine (B's): the overcast's underside going away to the horizon in rows of cloud, the
 * banks standing on the horizon, the cold sun breaking through as the skids leave the pad, the far mountains of the
 * coast under their snow, icebergs at their own distances, the swell, the sun's light on it, and a skein of birds.
 *
 * Everything is drawn through the one eye the sea is drawn with (`sky-draw.ts`): the horizon at the frame's middle,
 * and a thing `z` from the eye drawn `F / z` of its size, `F` being the distance of the plane the machine is in. So
 * the far rows hardly move as the helicopter goes, and the near ones sweep by: the parallax is the projection's own.
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
  silver: '#F1F3EE',
  bank: '#C3CACA',
  bankShade: '#A9B3B5',
  rock: '#6F7D82',
  rockFar: '#9AA6AA',
  snow: '#EEF1EF',
  snowFar: '#DCE2E2',
  berg: '#EEF2F0',
  bergShade: '#A9BEC4',
  crest: '#D7DFDC',
  trough: '#526660',
  sunlit: '#FBFBF4',
  bird: '#3B464A',
}

/** The cold sun: hidden by the overcast at the pad, breaking through as the skids leave it, and staying out. */
export const sunAt = (t: number): number => smooth(t, LIFT - 0.4, LIFT + 2.6)

/** Where the sun is on the screen: at no distance at all, so fixed in the frame, up and to the right of the middle. */
export function sunXY(e: Eye): [number, number] {
  return [e.cx + 0.2 * e.fw, e.hz - 0.34 * e.fh]
}

/** The air dropping from under the cabin: a jolt the near clouds feel most. */
export function jolt(t: number): number {
  let d = 0
  for (const b of BUMPS) {
    const u = t - (b - 0.32)
    if (u < 0 || u > 1.4) continue
    d += Math.sin(Math.min(1, u / 0.32) * Math.PI * 0.5) * Math.exp(-Math.max(0, u - 0.32) / 0.3) * (1 + 0.25 * Math.sin(u * 40) * Math.exp(-u / 0.25))
  }
  return d
}

/* ------------------------------------------------------------------ the overcast */

/** The overcast's underside: a ceiling of cloud this far above the sea, going away in rows. */
const DECK_Y = -15.5

/**
 * The underside of the overcast: a few long rolls of cloud going away to the horizon, each nearer one broader and
 * quicker across the screen, with breaks between and along them where the paler sky shows. Each roll is one flat grey
 * with its belly a shade darker. Once the sun is out the rolls thin to nothing round it, so it sits in a break that is
 * always there; the wind takes them all along.
 */
export function drawDeck(g: C2, k: number, e: Eye, t: number): void {
  const sun = sunAt(t)
  const [sx, sy] = sunXY(e)
  const shake = jolt(t)
  const D = Math.abs(DECK_Y - e.hz)
  // A roll's unbroken stretches are this long (world cells), a little longer in a wider frame.
  const S = 9 * Math.pow(Math.max(0.5, Math.min(2.5, e.fh / 6.6)), 0.35)
  // The nearest roll is the one just over the frame's top: the deck fills the sky from there to the horizon.
  const z0 = Math.max(12, (F * D) / Math.max(0.5, e.hz - e.y0 + 0.4))
  const drift = t * 1.2
  const rows: { body: Path2D; belly: Path2D; fog: number }[] = []
  for (let r = 0; r < 7; r++) {
    const s = F / (z0 * Math.pow(1.36, r))
    // Between this roll and the next: what its depth on the screen is drawn from.
    const gap = D * s * (1 - 1 / 1.36)
    // Past where the rolls are this thin, the horizon's haze stands for them.
    if (gap < 0.05 * (e.fh / 6.6)) break
    const yRow = e.hz - D * s + shake * 0.5 * s
    if (yRow - gap > e.y1 || yRow + gap < e.y0 - 0.5) continue
    const body = new Path2D()
    const belly = new Path2D()
    // Its stretches, and the breaks between them: a run of whole stretches, its ends pulled in a little at random.
    const ga = e.cx - (e.fw / 2 + 2) / s
    const gb = e.cx + (e.fw / 2 + 2) / s
    const n0 = Math.floor((ga - drift) / S) - 1
    const n1 = Math.ceil((gb - drift) / S) + 1
    const broken = (n: number) => hash(n, r, 45) < 0.25
    for (let n = n0; n <= n1; n++) {
      if (broken(n) || (n > n0 && !broken(n - 1))) continue
      let m = n
      while (m < n1 && !broken(m + 1)) m++
      const xa = e.cx + ((n + 0.35 * hash(n, r, 41)) * S + drift - e.cx) * s
      const xb = e.cx + ((m + 1 - 0.35 * hash(m, r, 42)) * S + drift - e.cx) * s
      const lo = Math.max(xa, e.x0 - 1)
      const hi = Math.min(xb, e.x1 + 1)
      if (hi <= lo) continue
      const step = Math.max(0.05, Math.min((hi - lo) / 48, gap * 0.1))
      const top: Pt[] = []
      const mid: Pt[] = []
      const low: Pt[] = []
      for (let x = lo; x <= hi + step * 0.5; x += step) {
        const xx = Math.min(x, hi)
        // Round at its ends; swelling and narrowing slowly along its length, and changing as it goes.
        const u = Math.max(0, Math.min(1, Math.min(xx - xa, xb - xx) / (gap * 1.2)))
        const end = Math.sqrt(1 - (1 - u) * (1 - u))
        const gx = e.cx + (xx - e.cx) / s - drift
        const w1 = Math.sin((gx / S) * 2.3 + r * 1.7 + t * 0.25)
        const w2 = Math.sin((gx / S) * 5.1 + r * 0.6 - t * 0.3)
        // Its outline is lumpy: rounded billows along its foot, and longer, lower ones along its far edge.
        const q = (gx * s) / gap
        const d = Math.hypot((xx - sx) / e.fw, (Math.max(0, Math.abs(yRow - sy) - 0.4 * gap) / e.fh) * 1.3)
        const thin = sun > 0.01 ? smooth(d, 0.04 * sun, 0.11 * sun) : 1
        const f = end * thin * gap
        top.push([xx, yRow - f * (0.46 + 0.2 * w1 + 0.05 * w2 + 0.12 * billow(q / 1.3 + 0.2, r, 49))])
        mid.push([xx, yRow + f * (0.1 + 0.08 * w2)])
        low.push([xx, yRow + f * (0.34 + 0.08 * w1 + 0.16 * billow(q / 0.95, r, 47))])
      }
      outline(body, k, top, low)
      outline(belly, k, mid, low)
    }
    rows.push({ body, belly, fog: r / 6 })
  }
  // The far rolls first, so a nearer one lies over the one beyond it.
  for (let i = rows.length - 1; i >= 0; i--) {
    const { body, belly, fog } = rows[i]
    g.fillStyle = mix(AIR.deck, AIR.haze, 0.7 * fog)
    g.fill(body)
    g.fillStyle = mix(AIR.deckShade, AIR.haze, 0.7 * fog)
    g.fill(belly)
  }
}

/** A run of rounded billows along `q`, one a unit, each its own size: 0 between them, up to 1 at the fullest. */
function billow(q: number, r: number, seed: number): number {
  const w = q + 0.3 * Math.sin(q * 1.3 + r)
  const i = Math.floor(w)
  return Math.sqrt(Math.sin((w - i) * Math.PI)) * (0.45 + 0.55 * hash(i, r, seed))
}

/** A closed shape along `top` and back along `bottom` (both left to right), into `path`. */
function outline(path: Path2D, k: number, top: Pt[], bottom: Pt[]): void {
  top.forEach(([x, y], i) => (i ? path.lineTo(x * k, y * k) : path.moveTo(x * k, y * k)))
  for (let i = bottom.length - 1; i >= 0; i--) path.lineTo(bottom[i][0] * k, bottom[i][1] * k)
  path.closePath()
}

/**
 * The banks: heaped cloud standing on the horizon, far beyond the ice, all but still, their heads slowly heaping up
 * and settling. Grey under the overcast; once the sun is out, their tops are lit silver. One path for their bodies,
 * one for their lit tops.
 */
export function drawBanks(g: C2, k: number, e: Eye, t: number): void {
  const sun = sunAt(t)
  const body = new Path2D()
  const lit = new Path2D()
  const z = 260
  const s = F / z
  const span = 260
  const shake = jolt(t) * 0.04
  for (let i = -1; i < 9; i++) {
    const base = (hash(i, 51) + i) * (span / 8) + t * 2.5
    const gx = e.cx + ((((base - e.cx) % span) + span * 1.5) % span) - span / 2
    const x = e.cx + (gx - e.cx) * s
    // Sized with the frame as much as with the distance: they are the horizon's, whatever the framing.
    const R = (8 + 10 * hash(i, 52)) * s * Math.max(0.6, Math.min(2.4, e.fh / 6.6))
    if (x + R * 3 < e.x0 || x - R * 3 > e.x1) continue
    const foot = e.hz + 0.06 + shake
    for (let j = 0; j < 5; j++) {
      const u = j / 4 - 0.5
      const lx = x + u * R * 3.2 + (hash(i, j, 53) - 0.5) * R * 0.5
      const heap = 1 + 0.1 * Math.sin(t * 0.45 + i * 1.3 + j * 2.1)
      const lr = R * (0.45 + 0.55 * Math.cos(u * 2.6)) * (0.7 + 0.4 * hash(i, j, 54)) * heap
      const ly = foot - lr * 0.75
      body.moveTo((lx + lr) * k, ly * k)
      body.arc(lx * k, ly * k, lr * k, 0, Math.PI * 2)
      lit.moveTo((lx + lr * 0.86 + R * 0.06) * k, (ly - lr * 0.16) * k)
      lit.arc((lx + R * 0.06) * k, (ly - lr * 0.16) * k, lr * 0.86 * k, Math.PI * 0.95, Math.PI * 2.05)
    }
    body.rect((x - R * 2) * k, (foot - R * 0.4) * k, R * 4 * k, (R * 0.4 + 0.05) * k)
  }
  g.fillStyle = AIR.bankShade
  g.fill(body)
  g.fillStyle = mix(AIR.bank, AIR.silver, 0.6 * sun)
  g.fill(lit)
}

/** The sun itself: a plain cold silver disc, drawn on the sky before the deck, in the break it opens. */
export function drawSun(g: C2, k: number, e: Eye, t: number): void {
  const sun = sunAt(t)
  if (sun <= 0.01) return
  const [sx, sy] = sunXY(e)
  g.fillStyle = rgba('#F4F5F0', sun)
  g.beginPath()
  g.arc(sx * k, sy * k, 0.045 * e.fh * k, 0, Math.PI * 2)
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
    const ridge: [number, number][] = []
    for (let u = xa; u <= e.x1 + 1 - e.cx * R.par + R.step; u += R.step) {
      const i = Math.round(u / R.step)
      const big = Math.max(0, Math.sin(i * 0.11 + R.seed) * 0.6 + Math.sin(i * 0.047 + R.seed * 2) * 0.5)
      const y = h * (0.18 + 0.75 * big * (0.6 + 0.4 * hash(i >> 2, R.seed)) + 0.1 * hash(i, R.seed + 1))
      ridge.push([u + e.cx * R.par, e.hz - y + shake])
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
    for (let i = ridge.length - 1; i >= 0; i--) {
      const [x, y] = ridge[i]
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

/**
 * The swell on the open sea: long dark troughs and pale crests in rows going away to the horizon, each band of
 * distance running at its own speed (the far swell slow, the near chop quicker). Two paths, one stroke each.
 */
export function drawSwell(g: C2, k: number, e: Eye, t: number, surf: number): void {
  const troughs = new Path2D()
  const crests = new Path2D()
  const e0 = surf - e.hz
  if (e0 <= 0.05) return
  const S = 1.9
  for (let r = 0; r < 20; r++) {
    const z = F * 0.95 * Math.pow(1.16, r)
    const s = F / z
    if (S * s < 0.16) break
    const speed = r < 6 ? 1.4 : r < 13 ? 0.7 : 0.3
    const y0 = e.hz + e0 * s
    if (y0 < e.y0 || y0 > e.y1 + 0.2) continue
    const drift = t * speed
    const n0 = Math.floor((e.cx - (e.fw / 2 + 1) / s - drift) / S) - 1
    const n1 = Math.ceil((e.cx + (e.fw / 2 + 1) / s - drift) / S) + 1
    for (let n = n0; n <= n1; n++) {
      if (hash(n, r, 81) < 0.35) continue
      const gx = (n + hash(n, r, 82)) * S + drift
      const x = e.cx + (gx - e.cx) * s
      const len = (1.1 + 1.9 * hash(n, r, 83)) * s
      const y = y0 + (hash(n, r, 84) - 0.5) * e0 * s * 0.5 + 0.03 * s * Math.sin(t * 1.3 + n)
      const p = hash(n, r, 85) < 0.55 ? troughs : crests
      p.moveTo(x * k, y * k)
      p.lineTo((x + len) * k, y * k)
    }
  }
  g.save()
  g.lineCap = 'butt'
  g.lineWidth = Math.max(0.8, 0.014 * k)
  g.strokeStyle = rgba(AIR.trough, 0.38)
  g.stroke(troughs)
  g.strokeStyle = rgba(AIR.crest, 0.36)
  g.stroke(crests)
  g.restore()
}

/**
 * Under the sun, its light on the sea: a path of pale dashes down the water toward us, the swell's crests where the
 * light lies on them, each going along with the swell.
 */
export function drawSunPath(g: C2, k: number, e: Eye, t: number, surf: number): void {
  const sun = sunAt(t)
  if (sun <= 0.02) return
  const [sx] = sunXY(e)
  const e0 = surf - e.hz
  if (e0 <= 0.05) return
  const path = new Path2D()
  for (let i = 0; i < 46; i++) {
    const v = Math.pow(hash(i, 91), 1.4)
    const y = e.hz + 0.03 + v * Math.min(e0, e.y1 - e.hz) * 0.9
    const spread = (0.06 + v * 0.3) * e.fw
    // Each crest goes along the path with the swell, and is gone at its edge and back at the other, small there.
    const u = (((hash(i, 92) + t * (0.02 + 0.05 * v)) % 1) + 1) % 1
    const x = sx - 0.03 * e.fw + (u - 0.5) * 2 * spread * (0.4 + 0.6 * hash(i, 93))
    const len = (0.04 + 0.12 * v) * (0.6 + 0.8 * hash(i, 95)) * (e.fh / 6.6) * Math.sin(u * Math.PI)
    path.moveTo((x - len / 2) * k, y * k)
    path.lineTo((x + len / 2) * k, y * k)
  }
  g.save()
  g.lineWidth = Math.max(1, 0.018 * k)
  g.strokeStyle = rgba(AIR.sunlit, 0.5 * sun)
  g.stroke(path)
  g.restore()
}

/* ------------------------------------------------------------------ birds */

/**
 * A skein of birds (eiders, low over the water) crossing ahead in a long V, wings beating: from `t0` to `t1`, `z`
 * from the eye and `y` high. One stroke for all of them.
 */
export function drawSkein(g: C2, k: number, e: Eye, t: number, t0: number, t1: number, z: number, y: number, gx0: number, vx: number, n: number): void {
  if (t < t0 || t > t1) return
  const s = F / z
  const path = new Path2D()
  const lead = gx0 + (t - t0) * vx
  const dir = Math.sign(vx) || 1
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1
    const rank = Math.ceil(i / 2)
    const gx = lead - dir * rank * 0.9 + 0.08 * Math.sin(t * 0.9 + i)
    const gy = y + side * rank * 0.38 + 0.05 * Math.sin(t * 1.3 + i * 2)
    const q = project(e, gx, gy, z)
    const span = 0.32 * q.s
    const flap = Math.sin(t * 11 + i * 0.7)
    path.moveTo((q.x - span) * k, (q.y - flap * span * 0.45) * k)
    path.lineTo(q.x * k, (q.y + span * 0.12) * k)
    path.lineTo((q.x + span * 0.95) * k, (q.y - flap * span * 0.45) * k)
  }
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = Math.max(1, 0.05 * s * k)
  g.strokeStyle = rgba(AIR.bird, 0.75)
  g.stroke(path)
  g.restore()
}

/* ------------------------------------------------------------------ Nuuk, across the harbour */

const HOUSES = ['#C08A3E', '#4F8C88', '#CFA43E', '#4E6F94', '#E4E6E1', '#6E8F6A']

/**
 * Nuuk across the harbour from the pad: Sermitsiaq's dark bulk under its snow beyond the town, the low shore, and the
 * houses climbing it in their colours (ochre, teal, mustard, blue, white), a window here and there lit. Left behind as
 * the helicopter goes.
 */
export function drawTown(g: C2, k: number, e: Eye, t: number, surf: number, haze: string): void {
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
  const lit = new Path2D()
  for (let i = 0; i < 70; i++) {
    const x = a.x + (b.x - a.x) * ((i + hash(i, 102)) / 70)
    if (x < e.x0 - 0.5 || x > e.x1 + 0.5) continue
    const up = hill(x) * (0.15 + 0.75 * hash(i, 103))
    const w = s * (0.45 + 0.3 * hash(i, 104))
    const h = s * (0.32 + 0.2 * hash(i, 105))
    const y = a.y - up
    walls[Math.floor(hash(i, 106) * HOUSES.length)].rect((x - w / 2) * k, (y - h) * k, w * k, h * k)
    roofs.moveTo((x - w / 2 - 0.04 * s) * k, (y - h) * k)
    roofs.lineTo(x * k, (y - h - 0.22 * s) * k)
    roofs.lineTo((x + w / 2 + 0.04 * s) * k, (y - h) * k)
    roofs.closePath()
    if (hash(i, 107) < 0.4) lit.rect((x - w * 0.18) * k, (y - h * 0.62) * k, w * 0.18 * k, h * 0.26 * k)
  }
  walls.forEach((p, i) => {
    g.fillStyle = mix(HOUSES[i], haze, 0.3)
    g.fill(p)
  })
  g.fillStyle = mix('#36403F', haze, 0.3)
  g.fill(roofs)
  g.fillStyle = rgba('#F2D9A0', 0.55 + 0.1 * Math.sin(t * 0.7))
  g.fill(lit)
  g.restore()
}
