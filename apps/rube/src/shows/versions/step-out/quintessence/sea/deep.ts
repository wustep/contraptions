import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, type View } from '../depth'
import { hash, smooth } from '../kit'
import { BEGIN, PUFFS, W } from './sea-plan'

/**
 * The life of the water round him (B's): what keeps the bass-only stretch moving while the music has gone quiet over
 * it, and stays out of the way of him and the shark. Three broad shafts of jade light coming down from the surface,
 * swaying slowly; a few specks of the sea's snow; one compact shoal of small fish that turns about on the strong lows;
 * and one pale jellyfish rising slowly in the dark. In the sea's cells (the skin at y 0, down into the dark), from show
 * time.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera mostly is while he is under, and how tall its frame: what the planes here are composed against. */
const DEEP_AT: Pt = [0.6, 2.4]
const DEEP_REF = 6.3

const DEEP = {
  jade: '#A9DEC9',
  snow: '#A7CBC2',
  fish: '#05161B',
  jelly: '#D9ECE6',
}

/* ------------------------------------------------------------------ light */

/**
 * How bright a shaft is down its length, in flat steps (the house's flat values): bright at the skin, gone below. Each
 * step is a shade from the next, so no edge across the shaft is seen.
 */
const STEPS = [1, 0.84, 0.69, 0.55, 0.42, 0.3, 0.19, 0.09]
/** A shaft's soft edge: three widths of it laid one on another, so it is brightest down its middle. */
const WIDTHS = [1, 0.68, 0.38]
/** The shafts: where each meets the skin on its plane, its width there, how far down it reaches, and its own sway. */
const SHAFTS = [
  { x: -3.6, w: 0.9, len: 10.5, seed: 0 },
  { x: 0.2, w: 1.35, len: 12.5, seed: 1 },
  { x: 4.3, w: 1.05, len: 11.5, seed: 2 },
]
/** The shafts' plane, and their brightness at the skin where all three widths meet. */
const SHAFT_Z = 0.6
const SHAFT_A = 0.1

/**
 * The light coming down from the surface: three broad shafts from the skin, leaning with the sun, widening as they go
 * down and swaying slowly as the swell passes over it. Each is three widths laid one on another, so its edges are
 * soft, and fades down its length in flat steps, each width's steps a third of a step from the next width's so no two
 * meet; a width at a step is one path for all three shafts, so the light is a couple of dozen plain fills.
 */
function drawShafts(g: C2, v: View, t: number): void {
  if (v.y1 < W) return
  const k = v.k
  const shift = (1 - SHAFT_Z) * (v.cx - DEEP_AT[0])
  const N = STEPS.length
  const paths = WIDTHS.map(() => STEPS.map(() => new Path2D()))
  for (const o of SHAFTS) {
    const x = o.x + shift + 0.35 * Math.sin(t * 0.11 + o.seed * 2.1)
    const lean = 0.3 + 0.04 * Math.sin(t * 0.15 + o.seed * 1.7)
    for (let i = 0; i < WIDTHS.length; i++) {
      const wa = o.w * WIDTHS[i]
      // Its left and right edges `u` of the way down its length.
      const at = (u: number): [number, number, number] => {
        const c = x + lean * o.len * u
        const half = (wa * (1 + 0.9 * u)) / 2
        return [c - half, c + half, W + o.len * u]
      }
      const step = (b: number): number => (b <= 0 ? 0 : b >= N ? 1 : (b + i / WIDTHS.length) / N)
      for (let b = 0; b < N; b++) {
        const [l0, r0, y0] = at(step(b))
        const [l1, r1, y1] = at(step(b + 1))
        if (y1 < v.y0 || y0 > v.y1) continue
        const p = paths[i][b]
        p.moveTo(l0 * k, y0 * k)
        p.lineTo(r0 * k, y0 * k)
        p.lineTo(r1 * k, y1 * k)
        p.lineTo(l1 * k, y1 * k)
        p.closePath()
      }
    }
  }
  for (let i = 0; i < WIDTHS.length; i++)
    for (let b = 0; b < N; b++) {
      g.fillStyle = rgbaOf(DEEP.jade, (SHAFT_A / WIDTHS.length) * STEPS[b])
      g.fill(paths[i][b])
    }
}

/* ------------------------------------------------------------------ the sea's snow */

/** The sea's snow at his distance: a few specks sinking slowly in the current, so the water is seen to go by. */
export function drawSnow(g: C2, v: View, t: number): void {
  // Only under the skin.
  const box = { x0: v.x0 - 1, y0: W + 0.12, x1: v.x1 + 1, y1: v.y1 + 1 }
  motes(g, v, t, { n: 24, seed: 37, tile: [13, 9], r: [0.014, 0.026], v: [0.1, 0.045], spread: 0.35, sway: [0.06, 0.08], color: rgbaOf(DEEP.snow, 0.45), within: box })
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

interface Shoal {
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
 * one oval shape that bends and slowly unbends. On a strong low of the bass it turns about, the
 * turn running through it from one end to the other in a fifth of a second; halfway round each fish is end on, a
 * short sliver. Between turns it swims a little way along, so it goes back and forth over the same water. One fill.
 */
function drawShoal(g: C2, v: View, t: number, o: Shoal, a: number): void {
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
/** The ledge across it, right side to left, where the light on its faces steps down. */
const LEDGE: Pt[] = [[-3.03, 1], [-3.4, 0.8], [-4.5, 1], [-5.6, 0.6], [-6.13, 0.65]]
/** Its two faces: lit above the ledge, and lost in the water below it. */
const KEEL_BANDS: { pts: Pt[]; colour: string; a: number }[] = [
  {
    pts: [...KEEL_R.filter((q) => q[1] < LEDGE[0][1]), ...LEDGE, ...KEEL_L.filter((q) => q[1] < LEDGE[LEDGE.length - 1][1]).reverse()],
    colour: '#3A6F6B',
    a: 0.75,
  },
  {
    pts: [...KEEL_R.filter((q) => q[1] > LEDGE[0][1]), FOOT, ...KEEL_L.filter((q) => q[1] > LEDGE[LEDGE.length - 1][1]).reverse(), ...[...LEDGE].reverse()],
    colour: '#21504F',
    a: 0.65,
  },
]

/**
 * Far off to the left, the keel of an iceberg: the most of it, under the water, hanging from the skin into the dark.
 * The light from above falls on its upper faces and is lost lower down, so it is two flat values, split at a worn,
 * slanting ledge.
 */
function drawKeel(g: C2, k: number): void {
  for (const band of KEEL_BANDS) {
    g.beginPath()
    band.pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
    g.closePath()
    g.fillStyle = rgbaOf(band.colour, band.a)
    g.fill()
  }
}

/* ------------------------------------------------------------------ the jellyfish */

/**
 * A jellyfish, pale in the dark at (x, y), `s` across: its bell squeezes and slowly opens again, and a few tentacles
 * trail under it, the wave running down them a little behind the bell.
 */
function drawJelly(g: C2, k: number, x: number, y: number, s: number, t: number, seed: number, a: number): void {
  const ph = (((t * 0.48 + seed) % 1) + 1) % 1
  const c = ph < 0.22 ? Math.sin((ph / 0.22) * Math.PI * 0.5) : 1 - smooth(ph, 0.22, 1)
  const w = s * (0.5 - 0.11 * c)
  const h = s * (0.34 + 0.07 * c)
  g.save()
  g.translate(x * k, y * k)
  g.rotate(0.12 * Math.sin(t * 0.3 + seed * 4))
  const ten = new Path2D()
  const n = 4
  for (let j = 0; j < n; j++) {
    const u0 = (j / (n - 1) - 0.5) * 1.3 * w
    const L = s * (1.0 + 0.5 * hash(j, 5, seed))
    ten.moveTo(u0 * k, 0)
    for (let i = 1; i <= 8; i++) {
      const u = i / 8
      const sway = 0.07 * s * Math.sin(t * 1.9 - u * 5 + j * 1.3) * u + u0 * 0.25 * c * u
      ten.lineTo((u0 * (1 - 0.3 * u) + sway) * k, u * L * k)
    }
  }
  g.lineWidth = Math.max(0.6, 0.014 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.3 * a)
  g.stroke(ten)
  // The bell.
  const bell = new Path2D()
  bell.moveTo(-w * k, 0)
  bell.bezierCurveTo(-w * k, -h * 1.25 * k, w * k, -h * 1.25 * k, w * k, 0)
  bell.quadraticCurveTo(0, 0.12 * s * k, -w * k, 0)
  g.fillStyle = rgbaOf(DEEP.jelly, 0.2 * a)
  g.fill(bell)
  g.lineWidth = Math.max(0.7, 0.025 * s * k)
  g.strokeStyle = rgbaOf(DEEP.jelly, 0.5 * a)
  g.stroke(bell)
  g.restore()
}

/* ------------------------------------------------------------------ all of the far water */

/**
 * The far water, behind the machine: a berg's keel, the shafts of light, a shoal and a jellyfish. Drawn inside the
 * water's clip, so none of it comes above the skin.
 */
export function drawDeepBack(g: C2, v: View, t: number): void {
  layer(g, v, 0.22, DEEP_AT, DEEP_REF, (inner) => drawKeel(g, inner.k))
  drawShafts(g, v, t)
  layer(g, v, 0.32, DEEP_AT, DEEP_REF, (inner) => {
    // At his depth, off to the right under the hull, a shoal turning on the bass.
    drawShoal(g, inner, t, { at: [3.0, 1.5], n: 50, w: 1.9, h: 0.8, bend: 0.15, curl: 3, len: 0.13, seed: 7, colour: DEEP.fish }, 0.75)
  })
  layer(g, v, 0.55, DEEP_AT, DEEP_REF, (inner) => {
    // A jellyfish rising very slowly, off to the left of him.
    drawJelly(g, inner.k, -2.4 + 0.2 * Math.sin(t * 0.13), 3.2 - 0.035 * (t - BEGIN), 0.55, t, 0.3, 0.8)
  })
}
