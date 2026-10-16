import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { layer, onLayer, type View } from '../depth'
import { mix, rgba } from '../home/pen'
import { along, bands, billow, ROWS, rowOutline, SAMPLES } from './paint'
import { litY, sunAt, SUN_R, tone, VALLEY, REF, wind, type LitPlane, type Tone } from './dawn'

/**
 * Everything beyond the valley, on its own planes behind the mountain he climbs: the sky (painted at depth 0, with the
 * last stars, rolls of high cloud lit from under, a skein of geese and the sun); the farthest range at 0.03, pale with
 * the air, its summits in the gaps of the great range in front of it; the great range at 0.08, its highest summit
 * streaming a plume; a second range at 0.2 and a third at 0.35, a few of their highest summits streaming
 * spindrift, and cloud at their feet; and the sea of cloud at 0.55 filling the valley under the ledge.
 * Each plane moves and scales less than the world as the camera goes, so the climb raises the far peaks over the near
 * ridges and the pull-back opens on all of them.
 *
 * The light comes down the planes one after another (`dawn.ts`): every plane is drawn in the blue of the hour and then
 * lit, above the line the sun has reached, in rose-gold, then gold, then gold-white; the flanks away from the sun stay
 * blue, and throw long shadows over the cloud that shorten as the sun climbs.
 */

type C2 = CanvasRenderingContext2D

/* ------------------------------------------------------------------ the ranges' geometry (pure, made once) */

interface Peak {
  x: number
  y: number
  /** Half-widths down to the plane's base, left and right. */
  wl: number
  wr: number
}

interface Spec {
  z: number
  seed: number
  x0: number
  x1: number
  /** The plane's base (y): the summits' flanks reach it. */
  base: number
  peaks: Peak[]
  /** Serration: how jagged the ridgelines are. */
  jag: number
  /** How much of the plane is rock. */
  rocky: number
  /** The sea of cloud at its feet: its top, and how fast it flows. */
  cloud: number
  flow: number
  /** How far the air has paled it toward the sky. */
  haze: number
  plane: LitPlane
  /** The summits (by index in `peaks`) the wind streams spindrift off: a few of the highest. */
  plumed: number[]
}

const P = (x: number, y: number, wl: number, wr = wl): Peak => ({ x, y, wl, wr })

/** The great summit: the highest thing in the world, its plume streaming toward the sun. */
const GREAT = 4
const SPECS: Spec[] = [
  {
    z: 0.03, seed: 5, x0: -9, x1: 33, base: -9.5, jag: 0.04, rocky: 0.15, cloud: -9.55, flow: 0.015, haze: 0.6, plane: 'far', plumed: [],
    peaks: [P(-6.0, -11.3, 2.0), P(-2.2, -11.45, 2.1), P(1.9, -11.55, 2.2), P(5.6, -11.3, 2.0), P(8.6, -11.65, 1.8), P(16.7, -11.45, 1.9), P(20.4, -11.7, 2.2), P(24.2, -11.4, 2.0), P(28.0, -11.75, 2.3)],
  },
  {
    z: 0.08, seed: 11, x0: -8, x1: 32, base: -9.2, jag: 0.05, rocky: 0.35, cloud: -9.28, flow: 0.025, haze: 0.32, plane: 'far', plumed: [3, GREAT, 7],
    peaks: [P(-4.2, -11.2, 2.8), P(-0.2, -11.75, 3.0), P(3.9, -11.35, 2.4), P(7.1, -11.7, 2.2, 1.9), P(10.3, -12.45, 3.0, 2.3), P(12.6, -11.55, 1.5, 1.3), P(14.45, -11.7, 1.7, 2.2), P(18.4, -12.05, 2.6), P(22.2, -11.5, 2.4), P(26.0, -11.9, 2.8), P(30, -11.4, 2.5)],
  },
  {
    z: 0.2, seed: 23, x0: -10, x1: 34, base: -9.0, jag: 0.045, rocky: 0.5, cloud: -9.02, flow: 0.04, haze: 0.2, plane: 'mid', plumed: [5, 6],
    peaks: [P(-6.5, -10.3, 2.0), P(-2.8, -10.75, 2.2), P(0.9, -10.25, 1.8), P(4.4, -10.9, 2.3), P(8.0, -10.4, 1.9), P(11.6, -10.75, 2.0, 1.6), P(16.8, -10.9, 2.0), P(20.4, -10.35, 1.8), P(24.0, -11.0, 2.3), P(28.2, -10.5, 2.1), P(32, -10.8, 2)],
  },
  {
    z: 0.35, seed: 37, x0: -14, x1: 38, base: -8.7, jag: 0.045, rocky: 0.75, cloud: -8.68, flow: 0.06, haze: 0.1, plane: 'near', plumed: [7],
    peaks: [P(-10, -9.6, 1.8), P(-6.4, -10.05, 2.0), P(-2.6, -9.55, 1.6), P(1.0, -10.2, 2.1), P(4.8, -9.7, 1.7), P(8.4, -9.95, 1.6, 1.4), P(11.4, -9.6, 1.3), P(17.6, -10.25, 2.2), P(21.6, -9.7, 1.8), P(25.4, -10.35, 2.2), P(29.6, -9.8, 1.9), P(33.6, -10.2, 2)],
  },
]

interface Range {
  spec: Spec
  body: Path2D
  /** The summits' flanks away from the sun, the steeper face in each beside its arête, the gullies down their two faces, their rock, and the lines on their snow (flutes, couloirs, crevasses). */
  shade: Path2D
  deep: Path2D
  gullies: Path2D
  grooves: Path2D
  rock: Path2D
  lines: Path2D
  /** The summits: where each one's plume leaves from, and how big a summit it is (0 to 1). */
  tops: { x: number; y: number; size: number }[]
  top: number
}

/** Every summit of a range with its shoulders: a lesser top on each flank, so no peak is a plain triangle. */
const shouldered = new Map<Spec, Peak[]>()
function withShoulders(s: Spec): Peak[] {
  let all = shouldered.get(s)
  if (all) return all
  all = [...s.peaks]
  s.peaks.forEach((p, n) => {
    for (const side of [-1, 1]) {
      const w = side < 0 ? p.wl : p.wr
      const u = 0.4 + 0.3 * hash(n, side + 5, s.seed)
      const drop = 0.32 + 0.3 * hash(n, side + 7, s.seed)
      all!.push(P(p.x + side * w * u, p.y + (s.base - p.y) * drop, w * (0.22 + 0.12 * hash(n, side + 9, s.seed))))
    }
  })
  shouldered.set(s, all)
  return all
}

function ridgeY(s: Spec, x: number): number {
  let y = s.base + 2
  for (const p of withShoulders(s)) {
    const w = x < p.x ? p.wl : p.wr
    const d = Math.abs(x - p.x) / w
    // Steep under the summit, easing into long shoulders.
    const v = p.y + (s.base - p.y) * Math.min(1.5, d ** 0.88)
    if (v < y) y = v
  }
  return y
}

function build(s: Spec): Range {
  const h = (i: number, j: number) => hash(i, j, s.seed)
  // The ridgeline: irregular steps, each point a little above or below the profile, so the crest is serrated.
  const ridge: Pt[] = []
  let x = s.x0
  let i = 0
  while (x <= s.x1) {
    const sharp = h(i, 3) > 0.82 ? -1.8 : 1
    ridge.push([x, ridgeY(s, x) + (h(i, 1) - 0.5) * 2 * s.jag * sharp])
    x += 0.08 + 0.15 * h(i, 2)
    i++
  }
  // The range goes down only as far as the cloud at its feet covers it.
  const bottom = s.cloud + 0.5
  const body = new Path2D()
  body.moveTo(ridge[0][0], bottom)
  for (const [px, py] of ridge) body.lineTo(px, py)
  body.lineTo(ridge[ridge.length - 1][0], bottom)
  body.closePath()

  const shade = new Path2D()
  const deep = new Path2D()
  const gullies = new Path2D()
  const grooves = new Path2D()
  const rock = new Path2D()
  const lines = new Path2D()
  const tops: Range['tops'] = []
  const near = (px: number) => {
    let best = 0
    for (let q = 0; q < ridge.length; q++) if (Math.abs(ridge[q][0] - px) < Math.abs(ridge[best][0] - px)) best = q
    return best
  }
  s.peaks.forEach((p, n) => {
    const top = near(p.x)
    const [tx, ty] = ridge[top]
    tops.push({ x: tx, y: ty, size: Math.min(1, Math.max(0.2, (s.base - ty) / 3.2)) })
    // The ice on its faces: short crevasse and serac lines across the snow, and couloirs down it.
    for (let r = 0; r < 22; r++) {
      const lx = tx + (h(n * 19 + r, 30) - 0.5) * 2 * (r % 2 ? p.wr : p.wl) * 0.9
      const top = ridgeY(s, lx)
      const ly = top + 0.12 + h(n * 19 + r, 31) * Math.max(0.1, bottom - top - 0.3)
      const w = 0.12 + 0.35 * h(n * 19 + r, 32)
      if (r % 3) {
        lines.moveTo(lx - w / 2, ly)
        lines.lineTo(lx, ly + 0.02 * (h(r, n) - 0.5))
        lines.lineTo(lx + w / 2, ly - 0.01)
      } else {
        lines.moveTo(lx, top + 0.05)
        lines.lineTo(lx + 0.03, top + (ly - top) * 0.5)
        lines.lineTo(lx - 0.02, ly)
      }
    }
    // The flank away from the sun: from the summit along the ridge to the saddle on its left, down the gully from the
    // saddle, which leans away under the next summit, and back up the arête, which leans the other way. Both wander a
    // little on their way down, so no two flanks stand side by side like posts.
    let saddle = top
    const left = n > 0 ? s.peaks[n - 1].x : s.x0
    for (let q = top; q >= 0 && ridge[q][0] > left; q--) if (ridge[q][1] > ridge[saddle][1]) saddle = q
    const [sx, sy] = ridge[saddle]
    const gully = sx - (0.2 + 0.3 * h(n, 6)) * (bottom - sy)
    const foot = tx + (0.08 + 0.25 * h(n, 7)) * (bottom - ty)
    const steps = 10
    shade.moveTo(tx, ty)
    for (let q = top; q >= saddle; q--) shade.lineTo(ridge[q][0], ridge[q][1])
    for (let k = 1; k <= steps; k++) {
      const u = k / steps
      shade.lineTo(sx + (gully - sx) * u ** 1.3 + (h(n * 37 + k, 5) - 0.5) * 0.14 * u, sy + (bottom - sy) * u)
    }
    const arete = (u: number, k: number): Pt => [tx + (foot - tx) * u + (h(n * 31 + k, 8) - 0.5) * 0.14 * u, ty + (bottom - ty) * u]
    // Gullies down the summit's two faces, from the ridge to partway down, each between the face's edges: two of snow
    // catching the sky's light down the shadowed flank, and two grooves in the snow of the face toward the sun, between
    // the arête and the saddle on the right.
    const run = (path: Path2D, q0: number, l: (u: number) => number, r: (u: number) => number, f: number, end: number, seed: number) => {
      const [gx, gy] = ridge[q0]
      path.moveTo(gx, gy + 0.04)
      for (let k = 1; k <= 6; k++) {
        const u = (k / 6) * end
        path.lineTo(l(u) + (r(u) - l(u)) * (f + (h(seed + k, 17) - 0.5) * 0.08), gy + (bottom - gy) * u)
      }
    }
    let rs = top
    const right = n + 1 < s.peaks.length ? s.peaks[n + 1].x : s.x1
    for (let q = top; q < ridge.length && ridge[q][0] < right; q++) if (ridge[q][1] > ridge[rs][1]) rs = q
    const [rx, ry] = ridge[rs]
    for (let g = 0; g < 2; g++) {
      const f = 0.3 + 0.35 * g + 0.15 * h(n, 16 + g)
      run(gullies, Math.round(saddle + (top - saddle) * f), (u) => sx + (gully - sx) * u ** 1.3, (u) => tx + (foot - tx) * u, f, 0.55 + 0.35 * h(n, 18 + g), n * 43 + g * 7)
      const e = 0.2 + 0.4 * g + 0.15 * h(n, 26 + g)
      run(grooves, Math.round(top + (rs - top) * e), (u) => tx + (foot - tx) * u, (u) => rx + 0.15 * u * (bottom - ry), e, 0.45 + 0.35 * h(n, 28 + g), n * 47 + g * 7)
    }
    for (let k = steps; k >= 1; k--) shade.lineTo(...arete(k / steps, k))
    shade.closePath()
    // Inside it, beside the arête, a steeper face turned further from the light: from partway down the ridge, down a
    // rib to the foot, and back up the arête.
    const pr = top - Math.max(1, Math.round((top - saddle) * (0.35 + 0.3 * h(n, 13))))
    const [px, py] = ridge[pr]
    const rib = px + (foot - px) * (0.3 + 0.3 * h(n, 14)) - (bottom - py) * 0.1
    deep.moveTo(px, py)
    for (let q = pr + 1; q <= top; q++) deep.lineTo(ridge[q][0], ridge[q][1])
    for (let k = 1; k <= steps; k++) deep.lineTo(...arete(k / steps, k))
    for (let k = steps; k >= 1; k--) {
      const u = k / steps
      deep.lineTo(px + (rib - px) * u + (h(n * 41 + k, 15) - 0.5) * 0.12 * u, py + (bottom - py) * u)
    }
    deep.closePath()
    // Rock: ribs down from the crest, more of them the lower the range.
    const ribs = Math.round(4 + 8 * s.rocky)
    for (let r = 0; r < ribs; r++) {
      const rx = tx + (h(n * 17 + r, 9) - 0.55) * 1.6 * p.wl
      const ry = ridgeY(s, rx) + 0.02
      const len = (0.3 + 1.6 * h(n * 17 + r, 10) ** 1.5) * (0.5 + 0.6 * s.rocky)
      const w = 0.04 + 0.06 * h(n * 17 + r, 11)
      const lean = (h(n * 17 + r, 12) - 0.5) * 0.3
      rock.moveTo(rx - w * 0.3, ry)
      rock.lineTo(rx + w, ry + 0.04)
      rock.lineTo(rx + lean + w * 0.6, ry + len * 0.6)
      rock.lineTo(rx + lean * 1.3 + w * 0.15, ry + len)
      rock.lineTo(rx + lean * 0.8 - w * 0.4, ry + len * 0.55)
      rock.closePath()
    }
  })
  // Flutes: the fine runnels down the steep snow under the crest.
  for (let q = 1; q < ridge.length - 1; q++) {
    const [fx, fy] = ridge[q]
    if (h(q, 20) < 0.6) continue
    lines.moveTo(fx, fy + 0.03)
    lines.lineTo(fx + (h(q, 22) - 0.5) * 0.08, Math.min(fy + 0.15 + 0.6 * h(q, 21), s.cloud))
  }
  return { spec: s, body, shade, deep, gullies, grooves, rock, lines, tops, top: Math.min(...ridge.map((r) => r[1])) }
}

let ranges: Range[] | null = null
const rangesOf = (): Range[] => (ranges ??= SPECS.map(build))

/* ------------------------------------------------------------------ drawing */

/** Fill or stroke a path made in cells, inside a plane drawn `k` pixels a cell. */
function inCells(ctx: C2, k: number, fn: () => void): void {
  ctx.save()
  ctx.scale(k, k)
  fn()
  ctx.restore()
}

/** The sky: its gradient, the last stars, the high cloud, the geese, the sun. */
function drawSky(ctx: C2, s: View, t: number, tn: Tone): void {
  const sun = sunAt(t)
  inCells(ctx, s.k, () => {
    // The sky in level bands, deep overhead to pale at the horizon.
    const stops: [number, string][] = [[0, tn.zenith], [0.42, tn.high], [0.8, tn.low], [1, tn.horizon]]
    const skyAt = (y: number) => along(stops, (y - s.y0) / (-9.0 - s.y0))
    bands(ctx, s.x0 - 1, s.x1 + 1, s.y0 - 1, s.y1 + 1, skyAt, undefined, 6)
    // The last stars, steady, going out one by one.
    if (tn.night > 0.01) {
      const path = new Path2D()
      for (let i = 0; i < 60; i++) {
        if (tn.night < 1 - (0.15 + 0.85 * hash(i, 3, 7))) continue
        const x = s.x0 + hash(i, 1, 7) * s.w
        const y = s.y0 + hash(i, 2, 7) ** 1.5 * s.h * 0.55
        const r = 0.008 + 0.011 * hash(i, 4, 7)
        path.moveTo(x + r, y)
        path.arc(x, y, r, 0, Math.PI * 2)
      }
      ctx.fillStyle = rgba('#F4F0FF', 0.9 * tn.night)
      ctx.fill(path)
    }
    // The high cloud, lit from under before the sun is up.
    rolls(ctx, s, t, tn, skyAt)
    // A skein of geese, very high, crossing the range while the two of them wait: a long, loose V, the wings beating.
    if (t > 168 && t < 191.2) {
      const u = (t - 168) / 23
      const lx = s.x0 - 1 + (s.w + 2.5) * u
      const ly = s.y0 + s.h * 0.2 - u * 0.5
      const geese = new Path2D()
      for (let i = 0; i < 15; i++) {
        const side = i % 2 ? 1 : -1
        const rank = Math.ceil(i / 2)
        const gx = lx - rank * 0.16 + Math.sin(t * 0.7 + i) * 0.02
        const gy = ly + side * rank * 0.075 + Math.sin(t * 0.9 + i * 1.3) * 0.015
        const beat = Math.sin(t * 7 + i * 0.9) * 0.022
        geese.moveTo(gx - 0.055, gy - beat)
        geese.lineTo(gx, gy + 0.01)
        geese.lineTo(gx + 0.055, gy - beat)
      }
      ctx.strokeStyle = rgba(mix(tn.ink, tn.high, 0.35), 0.75)
      ctx.lineWidth = 1.4 / ctx.getTransform().a
      ctx.stroke(geese)
    }
    // The sun: a plain disc, gold and then gold-white, behind the range until its edge clears the ridge.
    if (t > 166) {
      ctx.beginPath()
      ctx.arc(sun[0], sun[1], SUN_R, 0, Math.PI * 2)
      ctx.fillStyle = mix(tn.sun, '#FFFFFF', 0.5 * tn.light)
      ctx.fill()
    }
  })
}

/**
 * The high cloud: four rows of altocumulus, each its height, its thickness, and its rolls (where each starts, and how
 * long it is). They lie in two patches, the high rows thin over the left and the low rows heavier and further right,
 * with open sky over the right, broken where the sun climbs.
 */
const ROLLS: [number, number, [number, number][]][] = [
  [-13.28, 0.1, [[3.6, 1.6], [5.6, 2.6], [8.9, 1.2], [16.0, 1.4]]],
  [-12.84, 0.17, [[3.0, 2.2], [5.9, 1.4], [7.8, 2.8], [11.3, 1.2], [16.2, 2.0]]],
  [-12.3, 0.27, [[4.6, 1.8], [7.2, 2.4], [10.2, 1.3], [12.6, 1.9], [15.3, 3.0]]],
  [-11.62, 0.4, [[3.4, 2.4], [6.5, 1.7], [9.8, 2.0], [12.6, 3.2], [16.4, 2.4], [19.2, 1.6]]],
]

/**
 * The high cloud, a little paler than the sky round it, each roll a run of rounded cloudlets, drifting with the wind
 * aloft. The sun lights each roll's underside before it is up: rose, then gold, then white.
 */
function rolls(ctx: C2, s: View, t: number, tn: Tone, sky: (y: number) => string): void {
  const lit = smooth(t, 155, 168)
  const under = mix(tn.lit, '#FFFFFF', 0.1 + 0.55 * tn.light)
  const bodies = new Path2D()
  const lights = new Path2D()
  const ts: number[] = []
  ROLLS.forEach(([y0, th, row], j) => {
    const drift = (t - 182) * (0.09 + 0.015 * j)
    row.forEach(([x, L], i) => {
      const x0 = x + drift
      const y = y0 + (hash(i, 5, 100 + j) - 0.5) * 0.12
      if (x0 > s.x1 + 0.5 || x0 + L < s.x0 - 0.5) return
      const n = Math.max(4, Math.round(L / 0.08))
      // Its thickness along it, thinning to nothing where the sun will climb through it, so its way up stays clear.
      const sun = y > -13.25
      for (let k = 0; k <= n; k++) {
        const q = k / n
        ts[k] = th * Math.sin(Math.PI * q) ** 0.6 * (sun ? smooth(Math.abs(x0 + L * q - 14.15), 0.45, 0.85) : 1)
      }
      // Its cloudlets: about as long as the roll is thick and a little more, each its own size, slowly changing as the
      // wind works on them. The roll is not quite level: it sags or lifts a little along its length.
      const ph = hash(i, 4, 100 + j) * 6
      const lump = Math.PI / (th * 2.6)
      const lean = (hash(i, 6, 100 + j) - 0.5) * 0.16
      const at = (k: number) => y + lean * (k / n - 0.5) * L - 0.04 * L * Math.sin((Math.PI * k) / n) * (hash(i, 7, 100 + j) - 0.3)
      // Its body down to where the light under it begins, and that light: side by side, neither over the other.
      bodies.moveTo(x0, at(0))
      for (let k = 1; k <= n; k++) {
        const u = (L * k) / n
        bodies.lineTo(x0 + u, at(k) - ts[k] * (0.3 + 0.7 * Math.abs(Math.sin(u * lump + ph + 0.4 * Math.sin(u * 2.3 + t * 0.2) - t * 0.3))))
      }
      for (let k = n; k >= 0; k--) bodies.lineTo(x0 + (L * k) / n, at(k) + ts[k] * (lit > 0.01 ? 0.14 : 0.4))
      bodies.closePath()
      lights.moveTo(x0, at(0))
      for (let k = 1; k <= n; k++) lights.lineTo(x0 + (L * k) / n, at(k) + ts[k] * 0.12)
      for (let k = n; k >= 0; k--) lights.lineTo(x0 + (L * k) / n, at(k) + ts[k] * 0.4)
      lights.closePath()
    })
  })
  const body = mix(mix(sky(-13), tn.cloudUnder, 0.3), '#FFFFFF', 0.1 + 0.22 * tn.light)
  ctx.fillStyle = body
  ctx.fill(bodies)
  if (lit > 0.01) {
    ctx.fillStyle = mix(body, under, 0.6 * lit)
    ctx.fill(lights)
  }
}

/** A plume of spindrift for `plumes`: in its own frame, along x from 0 (the summit) to 1 (its end), y in cells. */
export interface Plume {
  x: number
  y: number
  len: number
  thick: number
  seed: number
}

/**
 * Spindrift streaming downwind (right) off the summits: a veil that widens and lifts as it goes and fades along its
 * length, its edges rippling. One gradient serves them all: each is drawn in its own frame, stretched to its length.
 */
export function plumes(ctx: C2, list: Plume[], col: string, a: number, t: number): void {
  if (!list.length || a <= 0.01) return
  const g = ctx.createLinearGradient(0, 0, 1, 0)
  g.addColorStop(0, rgba(col, 0))
  g.addColorStop(0.06, rgba(col, a))
  g.addColorStop(0.3, rgba(col, a * 0.65))
  g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g
  for (const p of list) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.scale(p.len, 1)
    const n = 14
    ctx.beginPath()
    const yc = (u: number) => -u * p.len * 0.12 + Math.sin(u * 7 - t * 2.4 + p.seed) * 0.05 * u * p.thick * 3
    const w = (u: number) => p.thick * (0.12 + 0.88 * Math.sqrt(u)) * (1 + 0.18 * Math.sin(u * 11 - t * 3.1 + p.seed * 2))
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const yy = yc(u) - w(u) * 0.75
      if (j) ctx.lineTo(u, yy)
      else ctx.moveTo(u, yy)
    }
    for (let j = n; j >= 0; j--) {
      const u = j / n
      ctx.lineTo(u, yc(u) + w(u) * 0.35 + u * u * p.thick * 0.5)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

/** The cloud at a plane's feet, flowing: billowed tops, lit when the light is down to them. */
function clouds(ctx: C2, s: View, t: number, tn: Tone, cy: number, flow: number, seed: number, hz: (c: string) => string, lit: number, depth = 0): void {
  if (cy > s.y1 + 0.5) return
  const lo = s.x0 - 1
  const hi = s.x1 + 1
  const step = 0.55
  const shift = (t * flow) % step
  const i0 = Math.floor((lo - shift) / step) - 1
  const i1 = Math.ceil((hi - shift) / step) + 1
  const base = Math.floor((t * flow) / step)
  // The front row's tops, traced as one outline from its billows: each keeps its own shape as it goes (hashed by
  // which billow it is, not where it is). Its body below is laid over by the bands, so the outline stops at its line.
  const dx = 0.05
  const x0 = i0 * step + shift - step
  const n = Math.min(SAMPLES, Math.ceil(((i1 - i0 + 2) * step) / dx) + 1)
  const [tops, lows] = ROWS
  tops.fill(Infinity, 0, n)
  lows.fill(-Infinity, 0, n)
  for (let i = i0; i <= i1; i++) {
    const id = i - base
    const bx = i * step + shift + (hash(id, 61, seed) - 0.5) * 0.2
    const rx = 0.32 + 0.34 * hash(id, 62, seed)
    const ry = 0.09 + 0.12 * hash(id, 63, seed) + 0.025 * Math.sin(t * 0.5 + id)
    const by = cy + (hash(id, 64, seed) - 0.5) * 0.08
    billow(tops, lows, x0, dx, n, bx, by, rx, ry)
  }
  for (let k = 0; k < n; k++) {
    if (tops[k] > cy) tops[k] = cy
    lows[k] = cy + 0.1
  }
  // The cloud's body goes down until the next plane's cloud is surely over it (or, for the nearest, out of the frame).
  const foot = depth ? cy + depth : s.y1 + 1
  const top = hz(mix(tn.cloud, tn.lit, 0.6 * lit))
  ctx.fillStyle = top
  ctx.fill(rowOutline(tops, lows, x0, dx, n))
  // Its body is the sea of cloud seen from above, going on toward the lens: it darkens only a little under its tops, so
  // each plane's cloud is the floor the next one's stands on, and the sea on the machine's plane goes on from them.
  const stops: [number, string][] = [[0, top], [1, hz(mix(top, tn.cloudUnder, 0.22))]]
  bands(ctx, lo, hi, cy, foot, (y) => along(stops, (y - cy) / 0.6), undefined, 8)
}

/** One range on its plane: lit where the sun has reached, its shadow flanks blue, cloud flowing at its feet, spindrift off its ridges. */
function drawRange(ctx: C2, s: View, t: number, tn: Tone, r: Range): void {
  const sp = r.spec
  if (s.x1 < sp.x0 || s.x0 > sp.x1) return
  const hz = (c: string) => mix(c, tn.haze, sp.haze)
  const ly = litY(t, sp.plane)
  const wnd = wind(t)
  inCells(ctx, s.k, () => {
    // Snow in the hour's blue below the line the light has come down to, flat light above it, and a soft edge on it:
    // each laid only where it shows.
    const clipY = (y0: number, y1: number, fill: string | CanvasGradient) => {
      if (y1 <= y0) return
      ctx.save()
      ctx.beginPath()
      ctx.rect(s.x0 - 1, y0, s.w + 2, y1 - y0)
      ctx.clip()
      ctx.fillStyle = fill
      ctx.fill(r.body)
      ctx.restore()
    }
    const lit = ly > r.top
    const snow = hz(tn.snow)
    if (!lit) {
      ctx.fillStyle = snow
      ctx.fill(r.body)
    } else {
      const litC = hz(tn.lit)
      clipY(r.top - 0.2, ly - 0.15, litC)
      clipY(ly - 0.15, sp.cloud + 1, snow)
      const g = ctx.createLinearGradient(0, ly - 0.15, 0, ly + 0.3)
      g.addColorStop(0, rgba(litC, 1))
      g.addColorStop(1, rgba(litC, 0))
      clipY(ly - 0.15, ly + 0.3, g)
    }
    // The flanks away from the sun, the rock, and the lines on the snow.
    ctx.fillStyle = rgba(mix(tn.shade, tn.haze, sp.haze * 0.5), 0.6 + 0.25 * tn.light)
    ctx.fill(r.shade)
    ctx.fillStyle = rgba(mix(tn.shade, tn.haze, sp.haze * 0.5), 0.3)
    ctx.fill(r.deep)
    ctx.strokeStyle = rgba(hz(mix(tn.shade, tn.snow, 0.6)), 0.7)
    ctx.lineWidth = 1.5 / ctx.getTransform().a
    ctx.stroke(r.gullies)
    ctx.strokeStyle = rgba(hz(tn.shade), 0.45)
    ctx.stroke(r.grooves)
    ctx.fillStyle = hz(mix(tn.rock, tn.litRock, 0.35 * tn.light))
    ctx.fill(r.rock)
    ctx.strokeStyle = rgba(hz(tn.shade), 0.5)
    ctx.lineWidth = 1 / ctx.getTransform().a
    ctx.stroke(r.lines)
    // Spindrift off a few of the highest summits, longer as the build climbs and on every gust.
    const lo = s.x0 - 1
    const hi = s.x1 + 1
    const list: Plume[] = []
    r.tops.forEach((tp, n) => {
      if (!sp.plumed.includes(n)) return
      const great = sp.seed === 11 && n === GREAT
      const len = great ? 2.2 + 1.6 * wnd : (0.6 + 1.4 * wnd) * (0.35 + 0.9 * tp.size)
      if (tp.x + len < lo || tp.x > hi) return
      list.push({ x: tp.x - 0.03, y: tp.y + 0.04, len, thick: (great ? 0.22 : 0.08 + 0.12 * tp.size) * (0.75 + 0.45 * wnd), seed: n * 7 + sp.seed })
    })
    plumes(ctx, list, hz(mix('#FFFFFF', tn.lit, 0.6 * smooth(ly, r.top, r.top + 1.5))), 0.65 * (0.6 + 0.4 * Math.min(1, wnd)), t)
    // The cloud at its feet, and the long shadows the summits throw across it once the light is down to it.
    const cl = smooth(ly, sp.cloud - 0.4, sp.cloud + 0.5)
    clouds(ctx, s, t, tn, sp.cloud, sp.flow, sp.seed, hz, cl, 1.2)
    if (cl > 0.02) {
      const shadows = new Path2D()
      const len = 0.6 + 7 * (1 - smooth(t, 178, 191.4)) ** 1.5
      for (const tp of r.tops) {
        const L = len * tp.size
        if (tp.x < lo || tp.x - L > hi) continue
        const w = 0.25 + 0.5 * tp.size
        shadows.moveTo(tp.x + w * 0.3, sp.cloud - 0.05)
        shadows.lineTo(tp.x - L, sp.cloud)
        shadows.lineTo(tp.x - L - w, sp.cloud + 0.14)
        shadows.lineTo(tp.x - w, sp.cloud + 0.12)
        shadows.closePath()
      }
      ctx.fillStyle = rgba(hz(tn.cloudUnder), 0.38 * cl)
      ctx.fill(shadows)
    }
  })
}

/** The far edge of the sea of cloud filling the valley, on the machine's plane: everything below it there is cloud. */
export const DECK = -7.9

/** The cloud nearest the ledge, far below it, faster: what the valley is full of. */
function drawLowCloud(ctx: C2, s: View, t: number, tn: Tone): void {
  const ly = litY(t, 'low')
  inCells(ctx, s.k, () => clouds(ctx, s, t, tn, -7.9, 0.12, 71, (c) => c, smooth(ly, -8.4, -7.4)))
}

/** The pair of choughs, wheeling far below the ledge over the sea of cloud, dark against it (on the machine's plane). */
export function drawChoughs(ctx: C2, k: number, t: number): void {
  const tn = tone(t)
  const path = new Path2D()
  for (let b = 0; b < 2; b++) {
    const ph = t * 0.42 + b * 2.3
    const cx = 10.9 + Math.cos(ph) * (1.3 + 0.2 * b) + Math.sin(t * 0.13) * 0.8
    const cy = -7.9 + Math.sin(ph) * 0.35 + b * 0.15
    // Wings: a shallow gull-wing, flapping now and then, gliding between.
    const flap = Math.sin(t * 9 + b * 1.7) * smooth(Math.sin(t * 0.9 + b * 2), 0.2, 0.6)
    const span = 0.09
    const dir = Math.sin(ph) > 0 ? 1 : -1
    const lift = -0.03 - flap * 0.035
    path.moveTo((cx - span) * k, (cy + lift) * k)
    path.quadraticCurveTo((cx - span * 0.4) * k, (cy - 0.012) * k, cx * k, (cy + 0.006) * k)
    path.quadraticCurveTo((cx + span * 0.4) * k, (cy - 0.012) * k, (cx + span) * k, (cy + lift) * k)
    path.moveTo((cx + dir * 0.02) * k, cy * k)
    path.lineTo((cx - dir * 0.03) * k, (cy + 0.005) * k)
  }
  ctx.save()
  ctx.strokeStyle = rgba(tn.ink, 0.85)
  ctx.lineWidth = Math.max(1, 0.016 * k)
  ctx.lineCap = 'round'
  ctx.stroke(path)
  ctx.restore()
}

/** Everything beyond the valley, back to front. Drawn first, under the mountain he climbs. */
export function drawBeyond(ctx: C2, v: View, t: number): void {
  const tn = tone(t)
  layer(ctx, v, 0, VALLEY, REF, (s) => drawSky(ctx, s, t, tn))
  for (const r of rangesOf()) layer(ctx, v, r.spec.z, VALLEY, REF, (s) => drawRange(ctx, s, t, tn, r))
  // The nearest cloud, unless the sea of cloud on the machine's plane stands in front of all of it.
  if (onLayer(v, 0.55, VALLEY, REF, [0, -8.2])[1] < DECK + 0.1) layer(ctx, v, 0.55, VALLEY, REF, (s) => drawLowCloud(ctx, s, t, tn))
}
