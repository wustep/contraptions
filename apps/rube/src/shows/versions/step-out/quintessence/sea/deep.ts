import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, type View } from '../depth'
import { hash, smooth } from '../kit'
import { BEGIN, PUFFS, W } from './sea-plan'

/**
 * The life of the water round him (B's): what keeps the bass-only stretch moving while the music has gone quiet over
 * it. Jade light coming down in rays that sway; two lines of light under the skin; the sea's snow drifting on two
 * planes; three shoals of small fish and a ribbon of capelin that turn about together on the strong lows, with open
 * water between them; and three pale jellyfish pulsing slowly in the dark. In the sea's cells (the skin at y 0, down
 * into the dark), from show time.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera mostly is while he is under, and how tall its frame: what the planes here are composed against. */
export const DEEP_AT: Pt = [0.6, 2.4]
export const DEEP_REF = 6.3

export const DEEP = {
  jade: '#A9DEC9',
  snow: '#A7CBC2',
  fish: '#05161B',
  capelin: '#5E8C8A',
  jelly: '#D9ECE6',
  web: '#C4E8DA',
}

/* ------------------------------------------------------------------ light */

export interface Rays {
  /** The rays' plane: how fast they cross the frame as the camera goes (1 the machine's, under 1 farther). */
  z: number
  n: number
  seed: number
  /** Their brightness at the skin. */
  a: number
  /** Their width at the skin, least and most, cells. */
  w: Pt
  /** How far down they reach before they are gone. */
  len: number
  color: string
}

/** How bright a ray is down its length, in five flat steps (the house's flat values): bright at the skin, gone below. */
const STEPS = [1, 0.6, 0.36, 0.19, 0.08]

/**
 * The light coming down from the surface: rays from the skin, leaning with the sun, fanning out and swaying, in three
 * sets that each brighten and dim slowly on their own as the swell passes over the sun. Each ray fades down its
 * length in flat steps, each step a little higher or lower on each ray so the steps never line up; a step of a set is
 * one path in one flat colour, laid on, so a score of rays is fifteen plain fills. They wrap round a span wider than
 * the frame, so one never pops in where it can be seen.
 */
export function drawRays(g: C2, v: View, t: number, o: Rays): void {
  if (v.y1 < W || v.y0 > W + o.len) return
  const k = v.k
  const span = 20
  const left = v.x0 - 4.5
  const shift = (1 - o.z) * (v.cx - DEEP_AT[0])
  const N = STEPS.length
  const paths: Path2D[][] = [0, 1, 2].map(() => STEPS.map(() => new Path2D()))
  for (let i = 0; i < o.n; i++) {
    const h1 = hash(i, 1, o.seed)
    const h2 = hash(i, 2, o.seed)
    const h3 = hash(i, 3, o.seed)
    const h4 = hash(i, 4, o.seed)
    // Each has its own stretch of the span, so they neither bunch nor leave a gap; it sways slowly, and wavers quicker
    // as the swell passes over the sun.
    const sx = ((i + 0.5 + 0.8 * (h1 - 0.5)) / o.n) * span + 0.4 * Math.sin(t * (0.1 + 0.08 * h2) + i * 1.7) + 0.05 * Math.sin(t * (1.1 + h2) + i * 2.9) + shift
    const x = left + ((((sx - left) % span) + span) % span)
    const wa = o.w[0] + (o.w[1] - o.w[0]) * h3
    const wb = wa * 1.8 + 0.04
    const lean = 0.3 + 0.05 * Math.sin(t * 0.17 + i * 2.3)
    const L = o.len
    // Its left and right edges at `u` of its length.
    const at = (u: number): [number, number, number] => [x + lean * L * u - (wb - wa) * u * 0.5, x + wa + lean * L * u + (wb - wa) * u * 0.5, W + L * u]
    let u0 = 0
    for (let b = 0; b < N; b++) {
      const u1 = b === N - 1 ? 1 : (b + 1 + 0.7 * (h4 - 0.5) + 0.2 * Math.sin(t * 0.3 + i)) / N
      const y0 = W + L * u0
      const y1 = W + L * u1
      if (y1 > v.y0 && y0 < v.y1) {
        const [l0, r0] = at(u0)
        const [l1, r1] = at(u1)
        const p = paths[i % 3][b]
        p.moveTo(l0 * k, y0 * k)
        p.lineTo(r0 * k, y0 * k)
        p.lineTo(r1 * k, y1 * k)
        p.lineTo(l1 * k, y1 * k)
        p.closePath()
      }
      u0 = u1
    }
  }
  g.save()
  for (let s = 0; s < 3; s++) {
    const a = o.a * (0.75 + 0.25 * Math.sin(t * 0.45 + s * 2.1))
    for (let b = 0; b < N; b++) {
      g.fillStyle = rgbaOf(o.color, a * STEPS[b])
      g.fill(paths[s][b])
    }
  }
  g.restore()
}

/**
 * The skin's underside: where the swell gathers the sun, two wandering lines of light just under the surface, the
 * nearer the brighter, shifting all the time. One stroke each.
 */
export function drawWeb(g: C2, v: View, t: number): void {
  if (v.y0 > W + 0.4 || v.y1 < W) return
  const k = v.k
  const step = 0.3
  const i0 = Math.floor((v.x0 - 0.5) / step)
  const i1 = Math.ceil((v.x1 + 0.5) / step)
  const knot = (i: number, r: number): Pt => [
    i * step + (r % 2) * step * 0.5 + (hash(i, r, 3) - 0.5) * step * 0.7 + 0.08 * Math.sin(t * 1.1 + i * 2.13 + r * 1.7) + 0.05 * Math.sin(t * 2.3 + i * 0.7),
    W + 0.06 + r * 0.13 + (hash(i, r, 4) - 0.5) * 0.08 + 0.035 * Math.sin(t * 1.6 + i * 1.37 + r * 2.9),
  ]
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = Math.max(0.6, 0.014 * k)
  for (let r = 0; r < 2; r++) {
    const path = new Path2D()
    for (let i = i0; i <= i1; i++) {
      const p = knot(i, r)
      const q = knot(i + 1, r)
      const m = 0.04 * Math.sin(t * 1.9 + i * 3.1 + r)
      if (i === i0) path.moveTo(p[0] * k, p[1] * k)
      path.quadraticCurveTo(((p[0] + q[0]) / 2) * k, ((p[1] + q[1]) / 2 + m) * k, q[0] * k, q[1] * k)
    }
    g.strokeStyle = rgbaOf(DEEP.web, [0.26, 0.13][r])
    g.stroke(path)
  }
  g.restore()
}

/* ------------------------------------------------------------------ the sea's snow */

/** The sea's snow on a plane: specks of the dead sinking slowly in the current, at that plane's size and pace. */
export function drawSnow(g: C2, inner: View, t: number, plane: 'far' | 'mid'): void {
  // Only under the skin.
  const box = { x0: inner.x0 - 1, y0: W + 0.12, x1: inner.x1 + 1, y1: inner.y1 + 1 }
  if (plane === 'far')
    motes(g, inner, t, { n: 245, seed: 31, tile: [5.5, 4.5], r: [0.008, 0.016], v: [0.07, 0.03], spread: 0.4, sway: [0.04, 0.06], color: rgbaOf(DEEP.snow, 0.3), square: true, within: box })
  else
    motes(g, inner, t, { n: 40, seed: 37, tile: [5, 4], r: [0.013, 0.026], v: [0.1, 0.045], spread: 0.35, sway: [0.06, 0.08], color: rgbaOf(DEEP.snow, 0.5), within: box })
}

/* ------------------------------------------------------------------ the shoals */

/** The strong lows a shoal turns about on: no two closer than 1.2 s, so one turn is done before the next. */
const TURNS = PUFFS.reduce<number[]>((out, p) => (out.length && p - out[out.length - 1] < 1.2 ? out : [...out, p]), [])
/** How long a fish takes to turn about. */
const TURN = 0.55

/** How far round a fish has come by `t`, in half turns: one for each strong low it has turned on, `lag` after it. */
function turned(t: number, lag: number): number {
  let n = 0
  for (const p of TURNS) n += smooth(t, p + lag, p + lag + TURN)
  return n
}

/** How far along a turn about has taken a fish, `u` of the way through it, for each second it lasts (it nets nothing). */
function turning(u: number): number {
  // Simpson's rule over eight steps of the turn's heading, cos(pi s) for s the smooth step.
  const f = (w: number): number => Math.cos(Math.PI * smooth(w, 0, 1))
  const h = u / 8
  let sum = f(0) + f(u)
  for (let i = 1; i < 8; i++) sum += f(i * h) * (i % 2 ? 4 : 2)
  return (sum * h) / 3
}

/** How far a shoal setting off at `dir` (1 right, -1 left) has swum along by `t`, at `v` cells a second. */
function swum(t: number, v: number, dir: number): number {
  let x = 0
  let from = BEGIN
  let sign = 1
  for (const p of TURNS) {
    if (t <= p) break
    x += sign * (p - from)
    if (t < p + TURN) return dir * v * (x + sign * TURN * turning((t - p) / TURN))
    from = p + TURN
    sign = -sign
  }
  return dir * v * (x + sign * (t - from))
}

/** A small fish, nose along +x and a unit long: its body tapering to a forked tail. */
const FISH: Pt[] = [[0.5, 0], [0.12, -0.15], [-0.5, -0.17], [-0.38, 0], [-0.5, 0.17], [0.12, 0.13]]

/** One small fish, `len` long, at `sx` of its length across the frame (its turn: 1 broadside, near 0 end on, under 0 the other way). */
function fish(p: Path2D, k: number, x: number, y: number, len: number, sx: number, tilt: number): void {
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  for (let i = 0; i < FISH.length; i++) {
    const X = FISH[i][0] * len * sx
    const Y = FISH[i][1] * len
    const px = (x + X * c - Y * s) * k
    const py = (y + X * s + Y * c) * k
    if (i) p.lineTo(px, py)
    else p.moveTo(px, py)
  }
  p.closePath()
}

export interface Shoal {
  /** Its middle, in its plane's cells. */
  at: Pt
  n: number
  /** How long and how deep it is, cells; how far it bends, and how much of a wave its length holds (radians). */
  w: number
  h: number
  bend: number
  curl: number
  /** A fish's length, cells. */
  len: number
  seed: number
  colour: string
}

/**
 * A shoal of small fish, each a body and a forked tail, holding their places in the shoal and all headed the same way
 * along it, so it swims as one: packed close at its heart and thinning to a few at its edge, so the whole of it is
 * one shape, an oval or a long ribbon, that bends and slowly unbends. On a strong low of the bass it turns about, the
 * turn running through it from one end to the other in a fifth of a second; halfway round each fish is end on, a
 * short sliver. Between turns it swims a little way along, so it goes back and forth over the same water. One fill.
 */
export function drawShoal(g: C2, v: View, t: number, o: Shoal, a: number): void {
  const k = v.k
  const dir = o.seed % 2 ? -1 : 1
  const cx = o.at[0] + swum(t, 0.16, dir)
  const cy = o.at[1] + 0.18 * Math.sin(t * 0.17 + o.seed)
  const wave = (x: number): number => t * 0.25 + o.seed + x * (o.curl / o.w)
  // Only the fish in the frame.
  const x0 = v.x0 - 0.3 - cx
  const x1 = v.x1 + 0.3 - cx
  const y0 = v.y0 - 0.3 - cy
  const y1 = v.y1 + 0.3 - cy
  if (x1 < -o.w / 2 || x0 > o.w / 2 || y1 < -o.h / 2 - o.bend || y0 > o.h / 2 + o.bend) return
  // Each fish turns a little after or before its neighbours (the turn running through the shoal): in a dozen steps of
  // lag, each worked out once.
  const LAGS = 12
  const heads = Array.from({ length: LAGS + 1 }, (_, j) => dir * Math.cos(Math.PI * turned(t, (0.26 * j) / LAGS)))
  const path = new Path2D()
  for (let i = 0; i < o.n; i++) {
    // Through an oval, packed at its middle and thinning to its edge as a crowd does (each fish keeps its distance from
    // the next), and a little give in each place.
    const r = Math.sqrt(-Math.log(1 - (0.95 * (i + 0.5)) / o.n) / 3)
    const th = i * 2.39996 + o.seed
    const u = r * Math.cos(th)
    const ox = o.w * 0.5 * u + 0.035 * Math.sin(t * 0.8 + i * 1.7)
    const oy = o.h * 0.5 * r * Math.sin(th) + 0.025 * Math.sin(t * 1.1 + i * 2.3) + o.bend * Math.sin(wave(ox))
    if (ox < x0 || ox > x1 || oy < y0 || oy > y1) continue
    const lag = 0.1 * (1 + dir * u) + 0.06 * hash(i, 1, o.seed)
    const head = heads[Math.round((lag / 0.26) * LAGS)]
    const sx = head >= 0 ? Math.max(0.16, head) : Math.min(-0.16, head)
    // Along the ribbon's bend, and a little more or less each.
    const tilt = Math.atan(o.bend * (o.curl / o.w) * Math.cos(wave(ox))) + 0.07 * Math.sin(t * 0.9 + i * 0.7)
    fish(path, k, cx + ox, cy + oy, o.len * (0.85 + 0.3 * hash(i, 2, o.seed)), sx, tilt)
  }
  g.fillStyle = rgbaOf(o.colour, a)
  g.fill(path)
}

/* ------------------------------------------------------------------ the berg */

/** The berg's keel in its plane's cells: its sides, top to bottom, wide at the skin and worn into ledges, and its foot. */
const KEEL_R: Pt[] = [[-2.88, -3], [-2.84, 0.38], [-3.08, 0.89], [-2.88, 1.32], [-3.25, 1.95], [-3.49, 2.55], [-3.29, 2.93], [-3.82, 3.57], [-4.23, 4.12]]
const KEEL_L: Pt[] = [[-6.32, -3], [-6.4, 0.34], [-6.03, 0.77], [-5.91, 1.27], [-5.42, 1.7], [-5.54, 2.29], [-5.13, 2.72], [-4.97, 3.31]]
const FOOT: Pt = [-4.56, 3.91]
/** The two ledges across it, right side to left, where the light on its faces steps down. */
const LEDGE_1: Pt[] = [[-3.03, 1], [-3.4, 0.8], [-4.5, 1], [-5.6, 0.6], [-6.13, 0.65]]
const LEDGE_2: Pt[] = [[-3.37, 2.25], [-3.6, 2], [-4.5, 2.2], [-5.45, 1.85]]
const above = (side: Pt[], y: number): Pt[] => side.filter((q) => q[1] < y)
const between = (side: Pt[], y0: number, y1: number): Pt[] => side.filter((q) => q[1] > y0 && q[1] < y1)
/** Its three faces, each a band from one ledge to the next: lit, half lit, and lost in the water. */
const KEEL_BANDS: { pts: Pt[]; colour: string; a: number }[] = [
  {
    pts: [...above(KEEL_R, LEDGE_1[0][1]), ...LEDGE_1, ...above(KEEL_L, LEDGE_1[LEDGE_1.length - 1][1]).reverse()],
    colour: '#3A6F6B',
    a: 0.75,
  },
  {
    pts: [
      ...between(KEEL_R, LEDGE_1[0][1], LEDGE_2[0][1]),
      ...LEDGE_2,
      ...between(KEEL_L, LEDGE_1[LEDGE_1.length - 1][1], LEDGE_2[LEDGE_2.length - 1][1]).reverse(),
      ...[...LEDGE_1].reverse(),
    ],
    colour: '#275A5A',
    a: 0.7,
  },
  {
    pts: [...KEEL_R.filter((q) => q[1] > LEDGE_2[0][1]), FOOT, ...KEEL_L.filter((q) => q[1] > LEDGE_2[LEDGE_2.length - 1][1]).reverse(), ...[...LEDGE_2].reverse()],
    colour: '#1C474A',
    a: 0.6,
  },
]

/**
 * Far off to the left, the keel of an iceberg: the most of it, under the water, hanging from the skin into the dark.
 * The light from above falls on its upper faces and is lost lower down, so it is three flat values, each a band
 * whose lower edge is a worn, slanting ledge; the lowest is nearly the water's own colour. The light catches the lip
 * of the upper ledge in one pale line.
 */
function drawKeel(g: C2, k: number): void {
  for (const band of KEEL_BANDS) {
    g.beginPath()
    band.pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
    g.closePath()
    g.fillStyle = rgbaOf(band.colour, band.a)
    g.fill()
  }
  g.beginPath()
  LEDGE_1.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
  g.lineJoin = 'round'
  g.lineWidth = Math.max(0.8, 0.02 * k)
  g.strokeStyle = rgbaOf(DEEP.web, 0.22)
  g.stroke()
}

/* ------------------------------------------------------------------ jellyfish */

/**
 * A jellyfish, pale in the dark at (x, y), `s` across: its bell squeezes and slowly opens again, rising a little on
 * each squeeze, and its `n` tentacles, `reach` times the usual length, trail and lag behind it.
 */
export function drawJelly(g: C2, k: number, x: number, y: number, s: number, t: number, seed: number, a: number, n = 7, reach = 1): void {
  const ph = (((t * 0.48 + seed) % 1) + 1) % 1
  const c = ph < 0.22 ? Math.sin((ph / 0.22) * Math.PI * 0.5) : 1 - smooth(ph, 0.22, 1)
  const w = s * (0.5 - 0.11 * c)
  const h = s * (0.34 + 0.07 * c)
  g.save()
  g.translate(x * k, y * k)
  g.rotate(0.12 * Math.sin(t * 0.3 + seed * 4))
  // The tentacles, trailing: the wave runs down them a little behind the bell, slower down the longer ones.
  const ten = new Path2D()
  const segs = 8 * Math.ceil(reach)
  for (let j = 0; j < n; j++) {
    const u0 = (j / (n - 1) - 0.5) * 1.6 * w
    const L = s * reach * (1.1 + 0.8 * hash(j, 5, seed))
    ten.moveTo(u0 * k, 0)
    for (let i = 1; i <= segs; i++) {
      const u = i / segs
      const sway = 0.07 * s * reach * Math.sin((t * 1.9) / reach - u * 5 + j * 1.3) * u + u0 * 0.25 * c * u
      ten.lineTo((u0 * (1 + 0.3 * (reach - 2) * u) + sway) * k, u * L * k)
    }
  }
  g.lineWidth = Math.max(0.6, 0.012 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.32 * a)
  g.stroke(ten)
  // The bell.
  const bell = new Path2D()
  bell.moveTo(-w * k, 0)
  bell.bezierCurveTo(-w * k, -h * 1.25 * k, w * k, -h * 1.25 * k, w * k, 0)
  bell.quadraticCurveTo(0, 0.12 * s * k, -w * k, 0)
  g.fillStyle = rgbaOf(DEEP.jelly, 0.2 * a)
  g.fill(bell)
  g.lineWidth = Math.max(0.7, 0.025 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.55 * a)
  g.stroke(bell)
  // Inside it, the faint canals running down from its crown to its rim, and the pale horseshoes of its four gonads,
  // the outer two turned away.
  const canals = new Path2D()
  for (const f of [-0.6, -0.2, 0.2, 0.6]) {
    canals.moveTo(f * 0.2 * w * k, -h * 0.92 * k)
    canals.quadraticCurveTo(f * 0.9 * w * k, -h * 0.75 * k, f * w * k, 0)
  }
  g.lineWidth = Math.max(0.6, 0.012 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.2 * a)
  g.stroke(canals)
  const rings = new Path2D()
  for (const f of [-0.5, -0.17, 0.17, 0.5]) {
    const rx = (Math.abs(f) > 0.3 ? 0.08 : 0.13) * w
    rings.moveTo((f * w - rx) * k, -h * 0.42 * k)
    rings.ellipse(f * w * k, -h * 0.5 * k, rx * k, 0.2 * h * k, 0, Math.PI * 0.75, Math.PI * 2.25)
  }
  g.lineWidth = Math.max(0.7, 0.02 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.45 * a)
  g.stroke(rings)
  g.restore()
}

/* ------------------------------------------------------------------ all of the far water */

/**
 * The far water, behind the machine: a berg's keel, the rays, the far snow, the capelin low in the dark, the shoals
 * and two jellyfish. Drawn inside the water's clip, so none of it comes above the skin.
 */
export function drawDeepBack(g: C2, v: View, t: number): void {
  layer(g, v, 0.22, DEEP_AT, DEEP_REF, (inner) => {
    drawKeel(g, inner.k)
    // Low in the dark, a ribbon of capelin, pale where the light from above still finds their backs.
    drawShoal(g, inner, t, { at: [0.8, 4.5], n: 110, w: 10, h: 0.5, bend: 0.45, curl: 6.5, len: 0.1, seed: 12, colour: DEEP.capelin }, 0.6)
  })
  // Two fans of rays: many thin far ones, and a few broader ones nearer, faint, so they never grey the water.
  drawRays(g, v, t, { z: 0.4, n: 56, seed: 3, a: 0.1, w: [0.04, 0.11], len: 16, color: DEEP.jade })
  drawRays(g, v, t, { z: 0.75, n: 14, seed: 5, a: 0.06, w: [0.1, 0.28], len: 14, color: DEEP.jade })
  layer(g, v, 0.32, DEEP_AT, DEEP_REF, (inner) => {
    drawSnow(g, inner, t, 'far')
    // Low in the dark to the left, a big jellyfish rising very slowly, its long tentacles a veil trailing under it.
    drawJelly(g, inner.k, -1.6 + 0.15 * Math.sin(t * 0.09), 5.0 - 0.03 * (t - BEGIN), 1.15, t, 0.8, 0.6, 24, 3)
    // At his depth, off to the right, a shoal turning on the bass.
    drawShoal(g, inner, t, { at: [3.0, 1.5], n: 80, w: 3, h: 1.2, bend: 0.22, curl: 3, len: 0.12, seed: 7, colour: DEEP.fish }, 0.75)
  })
  layer(g, v, 0.45, DEEP_AT, DEEP_REF, (inner) => {
    // Out to the right and a little deeper, a smaller shoal.
    drawShoal(g, inner, t, { at: [5.6, 3.6], n: 40, w: 1.5, h: 0.7, bend: 0.12, curl: 3, len: 0.15, seed: 15, colour: DEEP.fish }, 0.75)
  })
  layer(g, v, 0.55, DEEP_AT, DEEP_REF, (inner) => {
    // By the berg's foot, a shoal in its lee.
    drawShoal(g, inner, t, { at: [-3.1, 3.9], n: 45, w: 2.2, h: 0.95, bend: 0.15, curl: 3, len: 0.17, seed: 20, colour: DEEP.fish }, 0.8)
    // A jellyfish rising very slowly, off to the left of him.
    drawJelly(g, inner.k, -2.4 + 0.2 * Math.sin(t * 0.13), 3.2 - 0.035 * (t - BEGIN), 0.55, t, 0.3, 0.8, 10, 1.6)
  })
}

/** The near water: a third jellyfish, nearer than he is and larger. Over the machine, under him. */
export function drawDeepFront(g: C2, v: View, t: number): void {
  layer(g, v, 1.25, DEEP_AT, DEEP_REF, (inner) => {
    drawJelly(g, inner.k, 5.0 + 0.25 * Math.sin(t * 0.1 + 1), 4.4 - 0.05 * (t - BEGIN), 0.9, t, 0.65, 0.55, 16, 2.2)
  })
}
