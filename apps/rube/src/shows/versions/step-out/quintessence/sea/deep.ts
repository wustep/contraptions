import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, type View } from '../depth'
import { hash, smooth } from '../kit'
import { BEGIN, OUT, PUFFS, W } from './sea-plan'

/**
 * The life of the water round him (B's): what keeps the bass-only stretch moving while the music has gone quiet over
 * it. Jade light coming down in rays that sway; the skin's underside, a web of light; the sea's snow sinking on two
 * planes; two shoals of small fish that turn about together on the strong lows; and two pale jellyfish pulsing slowly
 * in the dark. In the sea's cells (the skin at y 0, down into the dark), from show time.
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

/** How much of the water's life is there: all of it while he is under; it is left behind as he is hauled out. */
export const underAt = (t: number): number => 1 - smooth(t, OUT - 0.2, OUT + 0.9)

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
    // Each sways slowly, and wavers quicker as the swell passes over the sun.
    const sx = h1 * span + 0.4 * Math.sin(t * (0.1 + 0.08 * h2) + i * 1.7) + 0.05 * Math.sin(t * (1.1 + h2) + i * 2.9) + shift
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
 * The skin's underside: a web of light where the swell gathers the sun, shifting all the time, brightest just under
 * the surface and gone half a cell down. Three rows of a net whose knots wander, one stroke a row.
 */
export function drawWeb(g: C2, v: View, t: number, a: number): void {
  if (v.y0 > W + 0.7 || v.y1 < W) return
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
  for (let r = 0; r < 3; r++) {
    const path = new Path2D()
    for (let i = i0; i <= i1; i++) {
      const p = knot(i, r)
      const q = knot(i + 1, r)
      const m = 0.04 * Math.sin(t * 1.9 + i * 3.1 + r)
      path.moveTo(p[0] * k, p[1] * k)
      path.quadraticCurveTo(((p[0] + q[0]) / 2) * k, ((p[1] + q[1]) / 2 + m) * k, q[0] * k, q[1] * k)
      if (r < 2) {
        // Down to the row under it: the net's cells.
        const d = knot(i + (r % 2), r + 1)
        path.moveTo(p[0] * k, p[1] * k)
        path.quadraticCurveTo(((p[0] + d[0]) / 2 + m) * k, ((p[1] + d[1]) / 2) * k, d[0] * k, d[1] * k)
      }
    }
    g.strokeStyle = rgbaOf(DEEP.web, a * [0.3, 0.17, 0.08][r])
    g.stroke(path)
  }
  g.restore()
}

/* ------------------------------------------------------------------ the sea's snow */

/** The sea's snow on a plane: specks of the dead sinking slowly in the current, at that plane's size and pace. */
export function drawSnow(g: C2, inner: View, t: number, plane: 'far' | 'mid', a: number): void {
  if (a <= 0.01) return
  // Only under the skin.
  const box = { x0: inner.x0 - 1, y0: W + 0.12, x1: inner.x1 + 1, y1: inner.y1 + 1 }
  if (plane === 'far')
    motes(g, inner, t, { n: 215, seed: 31, tile: [5.5, 4.5], r: [0.008, 0.016], v: [0.02, 0.03], spread: 0.4, sway: [0.04, 0.06], color: rgbaOf(DEEP.snow, 0.4 * a), square: true, within: box })
  else
    motes(g, inner, t, { n: 50, seed: 37, tile: [5, 4], r: [0.013, 0.026], v: [0.03, 0.045], spread: 0.35, sway: [0.06, 0.08], color: rgbaOf(DEEP.snow, 0.5 * a), within: box })
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

/** How far a shoal setting off at `dir` (1 right, -1 left) has swum along by `t`, at `v` cells a second. */
function swum(t: number, v: number, dir: number): number {
  const dt = 1 / 15
  let x = 0
  let u = BEGIN
  for (; u + dt <= t; u += dt) x += Math.cos(Math.PI * turned(u + dt / 2, 0)) * dt
  if (t > u) x += Math.cos(Math.PI * turned((u + t) / 2, 0)) * (t - u)
  return dir * v * x
}

/** One small fish, nose along +x, `len` long, at `sx` of its length across the frame (its turn: 1 broadside, near 0 end on, under 0 the other way). */
function fish(p: Path2D, k: number, x: number, y: number, len: number, sx: number, tilt: number): void {
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  const pts: Pt[] = [[0.5, 0], [0.18, -0.15], [-0.26, -0.05], [-0.5, -0.17], [-0.41, 0], [-0.5, 0.17], [-0.26, 0.05], [0.18, 0.13]]
  pts.forEach(([u, w], i) => {
    const X = u * len * sx
    const Y = w * len
    const px = (x + X * c - Y * s) * k
    const py = (y + X * s + Y * c) * k
    if (i) p.lineTo(px, py)
    else p.moveTo(px, py)
  })
  p.closePath()
}

export interface Shoal {
  /** Its middle, in its plane's cells. */
  at: Pt
  n: number
  /** How long and how deep it is, cells, and how far it bends as a ribbon. */
  w: number
  h: number
  bend: number
  /** A fish's length, cells. */
  len: number
  seed: number
  colour: string
}

/**
 * A shoal of small fish, each a body and a forked tail, holding their places in the shoal and all headed the same way
 * along it, so it swims as one: an oval, or a long ribbon that bends and slowly unbends. On a strong low of the bass
 * it turns about, the turn running through it from one end to the other in a fifth of a second; halfway round each
 * fish is end on, a short sliver. Between turns it swims a little way along, so it goes back and forth over the same
 * water. One fill.
 */
export function drawShoal(g: C2, k: number, t: number, o: Shoal, a: number): void {
  if (a <= 0.01) return
  const dir = o.seed % 2 ? -1 : 1
  const cx = o.at[0] + swum(t, 0.16, dir)
  const cy = o.at[1] + 0.18 * Math.sin(t * 0.17 + o.seed)
  const wave = (x: number): number => t * 0.25 + o.seed + x * (5 / o.w)
  const path = new Path2D()
  for (let i = 0; i < o.n; i++) {
    // Evenly through an oval (each fish keeps its distance), and a little give in each place.
    const r = Math.sqrt((i + 0.5) / o.n)
    const th = i * 2.39996 + o.seed
    const u = r * Math.cos(th)
    const ox = o.w * 0.5 * u + 0.035 * Math.sin(t * 0.8 + i * 1.7)
    const oy = o.h * 0.5 * r * Math.sin(th) + 0.025 * Math.sin(t * 1.1 + i * 2.3) + o.bend * Math.sin(wave(ox))
    const lag = 0.1 * (1 + dir * u) + 0.06 * hash(i, 1, o.seed)
    const head = dir * Math.cos(Math.PI * turned(t, lag))
    const sx = head >= 0 ? Math.max(0.16, head) : Math.min(-0.16, head)
    // Along the ribbon's bend, and a little more or less each.
    const tilt = Math.atan(o.bend * (5 / o.w) * Math.cos(wave(ox))) + 0.07 * Math.sin(t * 0.9 + i * 0.7)
    fish(path, k, cx + ox, cy + oy, o.len * (0.85 + 0.3 * hash(i, 2, o.seed)), sx, tilt)
  }
  g.fillStyle = rgbaOf(o.colour, a)
  g.fill(path)
}

/* ------------------------------------------------------------------ the berg */

/** The berg's keel, its outline in its plane's cells: wide at the skin, worn into ledges, down to a blunt foot. */
const KEEL: Pt[] = [
  [-6.32, -3],
  [-2.88, -3],
  [-2.84, 0.38],
  [-3.08, 0.89],
  [-2.88, 1.32],
  [-3.25, 1.95],
  [-3.49, 2.55],
  [-3.29, 2.93],
  [-3.82, 3.57],
  [-4.23, 4.12],
  [-4.56, 3.91],
  [-4.97, 3.31],
  [-5.13, 2.72],
  [-5.54, 2.29],
  [-5.42, 1.7],
  [-5.91, 1.27],
  [-6.03, 0.77],
  [-6.4, 0.34],
]

/**
 * Far off to the left, the keel of an iceberg: the most of it, under the water, hanging from the skin into the dark.
 * The light from above falls on its upper faces and is lost lower down, so it is three flat values, each a band
 * whose lower edge is a worn, slanting ledge; the lowest is nearly the water's own colour. Over its upper faces the
 * swell's light plays as it does under the skin: a loose net that wanders and is gone by its lowest ledge.
 */
function drawKeel(g: C2, k: number, t: number, a: number): void {
  if (a <= 0.01) return
  const outline = new Path2D()
  KEEL.forEach(([x, y], i) => (i ? outline.lineTo(x * k, y * k) : outline.moveTo(x * k, y * k)))
  outline.closePath()
  g.save()
  g.fillStyle = rgbaOf('#1C474A', 0.6 * a)
  g.fill(outline)
  g.clip(outline)
  // The upper bands, each down to a ledge.
  for (const [ledge, colour] of [
    [[2.35, 2.0, 2.2, 1.75, 1.95], '#275A5A'],
    [[1.05, 0.8, 1.0, 0.6, 0.7], '#3A6F6B'],
  ] as [number[], string][]) {
    const band = new Path2D()
    band.moveTo(-6.7 * k, -3 * k)
    band.lineTo(-2.3 * k, -3 * k)
    ledge.forEach((y, i) => band.lineTo((-2.3 - i * 1.1) * k, y * k))
    band.closePath()
    g.fillStyle = rgbaOf(colour, 0.6 * a)
    g.fill(band)
  }
  const knot = (i: number, r: number): Pt => [
    -6.9 + i * 0.36 + (r % 2) * 0.18 + (hash(i, r, 41) - 0.5) * 0.2 + 0.08 * Math.sin(t * 1.1 + i * 2.1 + r * 1.3),
    0.1 + r * 0.32 + (hash(i, r, 42) - 0.5) * 0.12 + 0.05 * Math.sin(t * 1.4 + i * 1.3 + r * 2.2),
  ]
  g.lineWidth = Math.max(0.6, 0.012 * k)
  for (let r = 0; r < 10; r++) {
    const net = new Path2D()
    for (let i = 0; i < 12; i++) {
      const [ax, ay] = knot(i, r)
      const [bx, by] = knot(i + 1, r)
      const [cx, cy] = knot(i + (r % 2), r + 1)
      const m = 0.05 * Math.sin(t * 1.7 + i * 2.9 + r)
      net.moveTo(ax * k, ay * k)
      net.quadraticCurveTo(((ax + bx) / 2) * k, ((ay + by) / 2 + m) * k, bx * k, by * k)
      net.moveTo(ax * k, ay * k)
      net.quadraticCurveTo(((ax + cx) / 2 + m) * k, ((ay + cy) / 2) * k, cx * k, cy * k)
    }
    g.strokeStyle = rgbaOf(DEEP.web, a * 0.14 * (1 - r / 10))
    g.stroke(net)
  }
  g.restore()
}

/* ------------------------------------------------------------------ jellyfish */

/**
 * A jellyfish, pale in the dark at (x, y), `s` across: its bell squeezes and slowly opens again, rising a little on
 * each squeeze, and its tentacles trail and lag behind it.
 */
export function drawJelly(g: C2, k: number, x: number, y: number, s: number, t: number, seed: number, a: number): void {
  if (a <= 0.01) return
  const ph = (((t * 0.48 + seed) % 1) + 1) % 1
  const c = ph < 0.22 ? Math.sin((ph / 0.22) * Math.PI * 0.5) : 1 - smooth(ph, 0.22, 1)
  const w = s * (0.5 - 0.11 * c)
  const h = s * (0.34 + 0.07 * c)
  g.save()
  g.translate(x * k, y * k)
  g.rotate(0.12 * Math.sin(t * 0.3 + seed * 4))
  // The tentacles, trailing: the wave runs down them a little behind the bell.
  const ten = new Path2D()
  for (let j = 0; j < 7; j++) {
    const u0 = (j / 6 - 0.5) * 1.6 * w
    const L = s * (1.1 + 0.8 * hash(j, 5, seed))
    ten.moveTo(u0 * k, 0)
    for (let i = 1; i <= 8; i++) {
      const u = i / 8
      const sway = 0.07 * s * Math.sin(t * 1.9 - u * 5 + j * 1.3) * u + u0 * 0.25 * c * u
      ten.lineTo((u0 * (1 - 0.3 * u) + sway) * k, u * L * k)
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
  // The stomach inside, the palest of it.
  g.beginPath()
  g.ellipse(0, -h * 0.42 * k, 0.42 * w * k, 0.3 * h * k, 0, 0, Math.PI * 2)
  g.fillStyle = rgbaOf(DEEP.jelly, 0.22 * a)
  g.fill()
  g.restore()
}

/* ------------------------------------------------------------------ all of the far water */

/**
 * The far water, behind the machine: a berg's keel, the far rays, the far snow, the capelin low in the dark and the
 * shoals at his depth, a jellyfish. Drawn inside the water's clip, so none of it comes above the skin.
 */
export function drawDeepBack(g: C2, v: View, t: number): void {
  const life = underAt(t)
  layer(g, v, 0.22, DEEP_AT, DEEP_REF, (inner) => {
    drawKeel(g, inner.k, t, 1)
    // Low in the dark, a long ribbon of capelin, pale where the light from above still finds their backs.
    drawShoal(g, inner.k, t, { at: [1.2, 4.6], n: 480, w: 11, h: 1.6, bend: 0.75, len: 0.1, seed: 12, colour: DEEP.capelin }, 0.5 * life)
  })
  // Two fans of rays: many thin far ones, and a few broader ones nearer, faint, so they never grey the water.
  drawRays(g, v, t, { z: 0.4, n: 34, seed: 3, a: 0.1, w: [0.02, 0.09], len: 12, color: DEEP.jade })
  drawRays(g, v, t, { z: 0.75, n: 6, seed: 5, a: 0.06, w: [0.1, 0.28], len: 9, color: DEEP.jade })
  layer(g, v, 0.32, DEEP_AT, DEEP_REF, (inner) => {
    drawSnow(g, inner, t, 'far', 1)
    drawShoal(g, inner.k, t, { at: [2.4, 1.6], n: 320, w: 9, h: 1, bend: 0.4, len: 0.12, seed: 7, colour: DEEP.fish }, 0.55 * life)
  })
  layer(g, v, 0.45, DEEP_AT, DEEP_REF, (inner) => {
    drawShoal(g, inner.k, t, { at: [3.6, 4.1], n: 70, w: 2.4, h: 0.8, bend: 0.15, len: 0.15, seed: 15, colour: DEEP.fish }, 0.6 * life)
  })
  layer(g, v, 0.55, DEEP_AT, DEEP_REF, (inner) => {
    drawShoal(g, inner.k, t, { at: [-3.4, 3.8], n: 80, w: 2.6, h: 0.8, bend: 0.15, len: 0.17, seed: 20, colour: DEEP.fish }, 0.8 * life)
    // A jellyfish rising very slowly, off to the left of him.
    drawJelly(g, inner.k, -2.4 + 0.2 * Math.sin(t * 0.13), 3.2 - 0.035 * (t - BEGIN), 0.55, t, 0.3, 0.8 * life)
  })
}

/** The near water: the rays nearer than him, and the second jellyfish, nearer and larger. Over the machine, under him. */
export function drawDeepFront(g: C2, v: View, t: number): void {
  const life = underAt(t)
  drawRays(g, v, t, { z: 1.3, n: 2, seed: 11, a: 0.045, w: [0.2, 0.45], len: 7, color: DEEP.jade })
  if (life <= 0.01) return
  layer(g, v, 1.25, DEEP_AT, DEEP_REF, (inner) => {
    drawJelly(g, inner.k, 5.0 + 0.25 * Math.sin(t * 0.1 + 1), 4.4 - 0.05 * (t - BEGIN), 0.9, t, 0.65, 0.55 * life)
  })
}
