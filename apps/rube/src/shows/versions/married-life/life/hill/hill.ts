import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { along, birds, gust, wobble, wrapNear, type Frame } from '../depth'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { CHURCH, HILL, HOME, INK } from '../worlds'

/**
 * The hill set: their picnic hill, seen from the side. Standing scenery for the whole show, drawn from show time
 * (`c.t`) in the hill world's cells from the set's origin.
 *
 * A green hill rising from a country lane on the right to a broad crest with one big tree (left of it in summer, on
 * the near flank's shoulder years later: `treeX`); beyond it the valley, the town small and pale, the far hills, and
 * a big sky. The path up is the hill's own skyline: from a
 * stone step at the lane (`STEP`) it climbs the flank to the crest, so whoever walks it is seen against the sky.
 * The lane runs along the hill's foot in front of it.
 *
 * Summer for the clouds (49.6 to 63.3 s): a blue sky with a high thin sheet of cloud far above the steam's shapes,
 * green grass, the tree in full leaf, their house small on the far ridge, birds now and then low over the valley, and
 * the near grass and its flowers along the frame's foot. Years later, autumn for the climb (167.7 to 180.4 s): a pale
 * grey sky in slow bands at two depths, a skein of geese leaving, the grass gone to straw, the tree turning and its
 * leaves coming down; the harvest stooked in the valley's stubble with crows in it, a farmstead by the town, and a
 * weathered fence along the near side of the lane. Everything here moves only with the wind and the seasons: the
 * machines are the parts'.
 *
 * Heights are given where a ball's centre sits (`ridge`, `LANE_Y`); the ground's surface is `R` below that.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const HILL_BOX: [number, number, number, number] = [-12, -9, 20, 6]

/** The crest: flat, a ball's centre at y 0, from x0 to x1. */
export const CREST = { x0: -1.3, x1: 2.6 }
/** The lane at the hill's foot, a ball's centre height (it runs the whole width, in front of the hill). */
export const LANE_Y = 2.1
/** The stone step where the path leaves the lane: its tread from x0 to x1, a ball on it at y. */
export const STEP = { x0: 8.15, x1: 9.05, y: LANE_Y - 0.13 }
/** The foot of the path: the step's face, on the lane. */
export const FOOT_X = STEP.x1
/** Summer to autumn, by show time: 0 for the clouds, 1 for the climb. */
export const autumn = (t: number): number => smooth(t, 100, 150)
/** Their tree: its trunk's foot. In summer on the far shoulder, over the crest where they lie and watch the clouds. */
export const TREE_X = -3.5
/**
 * Years later the tree stands on the near flank's shoulder, at the top of the path he leads her up: the picnic place,
 * which he nearly reaches and she never does. The climb is seen from the lane, so this is where the tree has to be for
 * the fall to happen under it. Only one season is ever on screen, so each has the tree where it is seen.
 */
export const TREE_AUTUMN_X = 5.2
/** Where the tree's foot is at show time `t`. */
export const treeX = (t: number): number => (autumn(t) > 0.5 ? TREE_AUTUMN_X : TREE_X)


/**
 * A shoulder of the hill: from level at its top, steepening (to `max` at 0.625 of the way), then easing a little
 * toward its foot, `h` lower after `l` across. What it has dropped `u` of the way across, and its slope there.
 */
const SHOULDER = 0.8 * Math.PI
const drop = (h: number, u: number) => (h * (1 - Math.cos(SHOULDER * u))) / (1 - Math.cos(SHOULDER))
const dropSlope = (h: number, l: number, u: number) => (h * SHOULDER * Math.sin(SHOULDER * u)) / ((1 - Math.cos(SHOULDER)) * l)
/** The far (left) shoulder: how far across, and how far down. */
const BACK = { l: 7, h: 2.6 }

/**
 * The hill's skyline, where a ball's centre sits on it at `x`: the far shoulder, the level crest, the near flank down
 * to the step, the step's tread. (Right of the step it is the lane's: `LANE_Y`.)
 */
export function ridge(x: number): number {
  if (x <= CREST.x0) {
    const u = (CREST.x0 - x) / BACK.l
    if (u <= 1) return drop(BACK.h, u)
    return BACK.h + (u - 1) * BACK.l * dropSlope(BACK.h, BACK.l, 1)
  }
  if (x <= CREST.x1) return 0
  if (x < STEP.x0) return drop(STEP.y, (x - CREST.x1) / (STEP.x0 - CREST.x1))
  if (x <= STEP.x1) return STEP.y
  return LANE_Y
}

/**
 * Where a ball's (or his square's) centre rests on the skyline at `x`: `ridge` is the drawn ground less R straight
 * down, which on the flank sinks a ball a little into it (by up to a tenth of R where it is steepest); resting on it,
 * its centre is R from the ground along the ground's normal, R times the secant of the slope straight up.
 */
export function seat(x: number): number {
  const s = ridgeSlope(x)
  return ridge(x) - R * (Math.hypot(1, s) - 1)
}

/** The skyline's slope (dy/dx, y down) at `x`: what a thing standing there leans with. */
export function ridgeSlope(x: number): number {
  if (x <= CREST.x0) return -dropSlope(BACK.h, BACK.l, Math.min(1, (CREST.x0 - x) / BACK.l))
  if (x <= CREST.x1 || x >= STEP.x0) return 0
  const L = STEP.x0 - CREST.x1
  return dropSlope(STEP.y, L, (x - CREST.x1) / L)
}

/** A clump of the crown: a few discs round a middle, from the trunk's foot (x) and in the world's height (y). */
interface Clump {
  x: number
  y: number
  discs: { x: number; y: number; r: number }[]
}

/**
 * The crown of a big old tree: six clumps, the back ones first, each a soft mass with its own shade under it and
 * light across its top, so the crown reads as bulk and not as one flat blob.
 */
const CROWN: Clump[] = (() => {
  const at: [number, number, number][] = [
    // x from the trunk, y, size
    [0.05, -2.7, 1.0],
    [-0.9, -2.45, 0.9],
    [1.0, -2.45, 0.9],
    [-1.6, -1.9, 0.8],
    [1.6, -1.85, 0.8],
    [0.0, -1.95, 1.0],
  ]
  return at.map(([x, y, s], j) => {
    const discs = [{ x, y, r: 0.5 * s }]
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.95 + (i / 4) * Math.PI * 0.9 + (hash(i, j, 3) - 0.5) * 0.4
      const d = 0.36 * s
      discs.push({ x: x + Math.cos(a) * d * 1.25, y: y + Math.sin(a) * d * 0.85 + 0.06, r: (0.3 + 0.1 * hash(i, j, 5)) * s })
    }
    discs.push({ x: x - 0.3 * s, y: y + 0.2 * s, r: 0.36 * s }, { x: x + 0.32 * s, y: y + 0.2 * s, r: 0.36 * s })
    return { x, y, discs }
  })
})()

/** The main limbs, out of the trunk's fork into the clumps, each a curve: [x0, y0, bend x, bend y, x1, y1, width], x from the trunk. */
const LIMBS: [number, number, number, number, number, number, number][] = [
  [-0.06, -1.0, -0.55, -1.2, -1.05, -1.75, 0.11],
  [0.0, -1.05, 0.1, -1.5, -0.05, -2.15, 0.12],
  [0.07, -1.0, 0.6, -1.15, 1.1, -1.7, 0.11],
]

/** A limb: a tapering curve, filled. */
function limb(p: p5, k: number, tx: number, [x0, y0, bx, by, x1, y1, w]: (typeof LIMBS)[number]): void {
  const at = (u: number): Pt => [
    (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * bx + u * u * x1,
    (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * by + u * u * y1,
  ]
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    const [x, y] = at(u)
    const [xa, ya] = at(Math.max(0, u - 0.05))
    const [xb, yb] = at(Math.min(1, u + 0.05))
    const l = Math.hypot(xb - xa, yb - ya) || 1
    const half = w * (1 - 0.55 * u)
    left.push([tx + x - ((yb - ya) / l) * half, y + ((xb - xa) / l) * half])
    right.push([tx + x + ((yb - ya) / l) * half, y - ((xb - xa) / l) * half])
  }
  p.beginShape()
  for (const [x, y] of [...left, ...right.reverse()]) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/**
 * The tree's falling leaves in autumn, as a pure function of time: torn off the crown in the gusts (a leaf whose moment
 * comes in a slack between gusts stays on), each drifts down and away on the wind and is gone. They go by the wind gone
 * by, so they hang in the lull; and then the frame's middle is kept clear (`lullFade`).
 */
function fallingLeaves(p: p5, k: number, t: number, au: number, f: Frame): void {
  if (au < 0.05) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const tx = treeX(t)
  const base = ridge(tx)
  const blown = windBlown(t)
  const clear = lullFade(f, t)
  const n = 40
  const life = 9
  // By colour, then by how faded: three of each, so they go in a handful of fills.
  const lists: [number, number, number, number][][] = Array.from({ length: 9 }, () => [])
  for (let i = 0; i < n; i++) {
    const phase = hash(i, 41) * life
    const cycle = Math.floor((blown + phase) / life)
    const u = (((blown + phase) % life) + life) % life / life
    const seed = i * 31 + cycle * 7
    if (gustIn(REACH.near, tx, blown - u * life) < -0.15 && hash(seed, 9) < 0.7) continue
    // Let go from somewhere in the crown; the wind takes them right and down, swaying.
    const x0 = tx - 1.4 + 3.3 * hash(seed, 1)
    const y0 = base - 2.4 + 1.2 * (hash(seed, 2) - 0.5)
    const drift = 3.5 + 6 * hash(seed, 3)
    const x = x0 + drift * u + 0.35 * Math.sin(u * 9 + hash(seed, 4) * 6)
    const y = y0 + 4.6 * u + 0.12 * Math.sin(u * 13 + i)
    if (x < f.x0 - 0.5 || x > f.x1 + 0.5 || y < f.y0 - 0.5 || y > f.y1 + 0.5) continue
    const fade = Math.min(1, u * 8) * Math.min(1, (1 - u) * 5) * (clear ? clear(x, y) : 1)
    if (fade < 0.08) continue
    const s = (0.055 + 0.02 * hash(seed, 5)) * (0.6 + 0.4 * fade)
    lists[(i % 3) * 3 + (fade < 0.4 ? 0 : fade < 0.75 ? 1 : 2)].push([x, y, u * 11 + i, s])
  }
  p.noStroke()
  lists.forEach((list, j) => {
    if (!list.length) return
    p.fill(alpha(p, LEAF_COLORS[Math.floor(j / 3)], [0.3, 0.6, 0.85][j % 3] * au))
    ctx.beginPath()
    for (const [x, y, a, s] of list) leafPath(ctx, k, x, y, a, s)
    ctx.fill()
  })
}

/* ------------------------------------------------------------------ the autumn wind */

/**
 * The autumn wind's strength at show time `t` (0 to 1): strong all through the climb, but for a lull while she gives way
 * and he stands struck and runs down to her (174.4 to 176.6), so the stillness is a beat of its own; it comes back once
 * he is beside her on the stone.
 */
export function windStrength(t: number): number {
  return 1 - 0.88 * smooth(t, 174.15, 174.55) * (1 - smooth(t, 176.95, 177.55))
}

/** The strength's running total from 160 s, worked out once at 50 a second. */
const WIND_FROM = 160
const WIND_STEP = 0.02
const WIND_SUM: Float64Array = (() => {
  const n = Math.ceil((190 - WIND_FROM) / WIND_STEP) + 1
  const sum = new Float64Array(n)
  for (let i = 1; i < n; i++) sum[i] = sum[i - 1] + WIND_STEP * windStrength(WIND_FROM + (i - 0.5) * WIND_STEP)
  return sum
})()

/**
 * How much wind has blown by `t` (seconds of full wind): what it carries goes by this, not by the clock, so a leaf
 * slows in the lull and is taken on again after, and the gusts' waves slow and come on with it.
 */
export function windBlown(t: number): number {
  const u = (t - WIND_FROM) / WIND_STEP
  if (u <= 0) return t - WIND_FROM
  const n = WIND_SUM.length - 1
  if (u >= n) return WIND_SUM[n] + (t - WIND_FROM - n * WIND_STEP)
  const i = Math.floor(u)
  return WIND_SUM[i] + (WIND_SUM[i + 1] - WIND_SUM[i]) * (u - i)
}

/**
 * A reach of the land the wind runs over, from the far slopes to the field at our feet: how fast its gusts cross it
 * (cells a second, in its own cells: the far ones slow, the near quick), how far apart they come (seconds), how strongly
 * its streaks show, and its seed.
 */
interface Reach {
  c: number
  period: number
  a: number
  seed: number
}
const REACH: Record<'far' | 'mid' | 'field' | 'near', Reach> = {
  far: { c: 0.45, period: 2.6, a: 0.55, seed: 31 },
  mid: { c: 0.7, period: 2.3, a: 0.7, seed: 32 },
  field: { c: 1.0, period: 2.0, a: 0.85, seed: 33 },
  near: { c: 1.45, period: 1.7, a: 1, seed: 34 },
}

/** The gust at `x` of a reach (its own cells), when `blown` of wind has gone by: a wave travelling with the wind, -1 to 1. */
const gustIn = (r: Reach, x: number, blown: number): number => wobble(blown - x / r.c, r.seed, r.period)

/**
 * The wind seen running through a reach of straw: short slanted strokes, pale where a gust lays the stalks over and
 * shows their light sides, darker in the hollows where they stand up again between. The strokes ride with the gusts
 * across the reach and swell and shrink as each gust passes, row on row a little behind the one above, so every gust is
 * a sweep across the reach and not a stripe; gone in the lull. Each row is [its middle, its half height] (cells);
 * `outline` traces the reach for the clip. Flat fills, no edges drawn.
 */
function windStreaks(
  p: p5,
  k: number,
  f: Frame,
  t: number,
  r: Reach,
  shift: number,
  rows: [number, number][],
  outline: () => void,
  pale: string,
  dark: string,
  a: number,
): void {
  const s = windStrength(t) * r.a
  if (s * a < 0.05 || !rows.length) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const blown = windBlown(t)
  // The strokes ride the wind across the reach; the gusts with them, a second, slower wave on them so they change.
  const ride = r.c * blown + shift
  const gx = 0.5 * Math.sqrt(r.c)
  const lists: [number, number, number, number][][] = [[], [], [], []]
  rows.forEach(([y, h], j) => {
    if (y + h < f.y0 || y - h > f.y1) return
    const lag = j * 0.33 * r.c + 7.3 * j
    for (let m = Math.floor((f.x0 - 0.6 - ride) / gx); m * gx + ride < f.x1 + 0.6; m++) {
      const x = (m + 0.6 * hash(m, j, r.seed)) * gx + ride
      const w = s * (0.8 * gustIn(r, x - shift + lag, blown) + 0.35 * wobble(0.6 * blown - (x - shift + lag) / (0.5 * r.c), r.seed + 5, r.period * 1.3))
      const size = smooth(w, 0.2, 0.5)
      const hollow = smooth(-w, 0.3, 0.6)
      const len = gx * (0.5 + 0.3 * hash(m, j, r.seed + 1))
      const y1 = y + h * 0.5 * (hash(m, j, r.seed + 2) - 0.5)
      if (size > 0.02) {
        lists[0].push([x, y1, len * (0.3 + 0.7 * size), h * 0.42 * size])
        if (w > 0.55) lists[1].push([x - 0.15 * len, y1, len * smooth(w, 0.55, 0.8) * 0.6, h * 0.22])
      } else if (hollow > 0.02) {
        lists[2].push([x, y1, len * (0.3 + 0.7 * hollow), h * 0.42 * hollow])
        if (w < -0.6) lists[3].push([x, y1, len * smooth(-w, 0.6, 0.85) * 0.6, h * 0.22])
      }
    }
  })
  ctx.save()
  ctx.beginPath()
  outline()
  ctx.clip()
  p.noStroke()
  const fills: [string, number][] = [
    [pale, 0.08],
    [pale, 0.07],
    [dark, 0.07],
    [dark, 0.05],
  ]
  lists.forEach((list, n) => {
    if (!list.length) return
    p.fill(alpha(p, fills[n][0], fills[n][1] * a))
    ctx.beginPath()
    for (const [x, y, rx, ry] of list) {
      // Slanted a little, as the stalks lie over with the wind.
      ctx.moveTo(X(x + rx * 0.99, k), X(y - rx * 0.12, k))
      ctx.ellipse(X(x, k), X(y, k), X(rx + 0.015, k), X(ry + 0.008, k), -0.12, 0, Math.PI * 2)
    }
    ctx.fill()
  })
  ctx.restore()
}

/**
 * Tufts of straw standing over a reach, row on row down to the frame's foot, nearer rows taller: each laid over as a gust
 * reaches it (and paler then, its light side to us), quivering in the wind, standing up again behind the gust and in the
 * lull. Nothing stands above `above` (the skyline, the lane's edge). Two strokes' colours, one path each.
 */
function tuftField(
  p: p5,
  k: number,
  f: Frame,
  t: number,
  y0: number,
  y1: number,
  above: (x: number) => number,
  o: { gapX: number; gapY: number; h0: number; h1: number; color: string; pale: string; weight: number; seed: number },
): void {
  const blown = windBlown(t)
  const s = windStrength(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const lists: number[][] = [[], []]
  const bottom = Math.min(y1, f.y1 + 0.3)
  for (let r = 0; r < 60; r++) {
    const y = y0 + (r + 0.5) * o.gapY
    if (y > bottom) break
    if (y < f.y0 - 0.3) continue
    const h = o.h0 + (o.h1 - o.h0) * Math.min(1, (y - y0) / Math.max(0.01, y1 - y0))
    for (let i = Math.floor((f.x0 - 0.3) / o.gapX); i * o.gapX < f.x1 + 0.3; i++) {
      if (hash(i, r, o.seed) < 0.25) continue
      const x = (i + 0.8 * hash(i, r, o.seed + 1)) * o.gapX
      const yy = y + o.gapY * 0.6 * (hash(i, r, o.seed + 2) - 0.5)
      if (yy < above(x) + 0.04) continue
      const hh = h * (0.7 + 0.6 * hash(i, r, o.seed + 3))
      const w = gustIn(REACH.near, x, blown) * s
      const lean = hh * (0.1 * s + 0.55 * Math.max(-0.2, w) + 0.22 * s * Math.sin(t * (9 + 3 * hash(i, r, o.seed + 4)) + i * 1.7 + r))
      const list = lists[w > 0.35 ? 1 : 0]
      for (const [dx, u] of [[-0.022, 0.8], [0, 1], [0.024, 0.7]]) {
        const l = lean * u
        list.push(x + dx, yy, x + dx + l, yy - hh * u * (1 - 0.25 * (l / (hh * u)) ** 2))
      }
    }
  }
  p.noFill()
  p.strokeWeight(o.weight)
  lists.forEach((list, n) => {
    if (!list.length) return
    p.stroke(n ? o.pale : o.color)
    ctx.beginPath()
    for (let i = 0; i < list.length; i += 4) {
      ctx.moveTo(X(list[i], k), X(list[i + 1], k))
      ctx.lineTo(X(list[i + 2], k), X(list[i + 3], k))
    }
    ctx.stroke()
  })
}

/** Rows down a reach from `y0` to `y1`, `gap` apart, each as tall as the gap (for `windStreaks`). */
function rowsOf(y0: number, y1: number, gap: number): [number, number][] {
  const out: [number, number][] = []
  for (let y = y0 + gap / 2; y < y1; y += gap) out.push([y, gap * 0.62])
  return out
}

/** A leaf's shape in a path (no fill of its own): a pointed oval `s` long, turned `a`, for drawing many in one fill. */
export function leafPath(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, a: number, s: number): void {
  const c = Math.cos(a) * s
  const d = Math.sin(a) * s
  const P = (u: number, v: number): [number, number] => [X(x + u * c - v * d, k), X(y + u * d + v * c, k)]
  const [ax, ay] = P(-1, 0)
  const [bx, by] = P(1, 0)
  const [ux, uy] = P(0, -0.55)
  const [lx, ly] = P(0, 0.55)
  ctx.moveTo(ax, ay)
  ctx.quadraticCurveTo(ux, uy, bx, by)
  ctx.quadraticCurveTo(lx, ly, ax, ay)
}

/** The autumn leaves' colours: the turned leaf, a yellower one, a browner one. */
export const LEAF_COLORS = [HILL.leafAutumn, mixHex(HILL.leafAutumn, HOME.yellow, 0.4), mixHex(HILL.leafAutumn, HILL.bark, 0.35)]

/**
 * Leaves the wind is carrying across the land at one depth, never resting: each blown along by the wind gone by (so
 * they hang in the lull and are taken on after), bobbing and tumbling, wrapped round a stretch wider than any frame
 * (out of sight) so the stream never runs out. `band` is the height they fly in, `depth` their parallax; `size` and
 * `speed` (cells per second of full wind) as the depth makes them; `fade` thins them where it is above 0 (the frame's
 * middle in the lull). With `wide` (cells), only as many fly as keep their number on the screen about even: a frame
 * wider than that shows a share of them (each leaf in or out by its own mark, growing in as the camera comes closer),
 * so a wide is not a blizzard of specks and a close is not empty.
 */
function windLeaves(
  p: p5,
  k: number,
  f: Frame,
  t: number,
  o: { n: number; depth: number; band: [number, number]; size: number; speed: number; haze: number; seed: number; wide?: number; fade?: (x: number, y: number) => number },
): void {
  const share = o.wide ? Math.min(1, o.wide / (f.x1 - f.x0)) : 1
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const blown = windBlown(t)
  const shift = along(f, o.depth)
  // A fixed stretch, wider than any frame, so no leaf ever moves when the camera does.
  const span = 18
  const paths: [number, number, number, number, number][][] = [[], [], []]
  for (let i = 0; i < o.n; i++) {
    const v = o.speed * (0.7 + 0.6 * hash(i, 1, o.seed))
    const home = hash(i, 2, o.seed) * span + v * blown
    const x = wrapNear(home, f.cx - shift, span) + shift
    if (x < f.x0 - 0.3 || x > f.x1 + 0.3) continue
    const ph = hash(i, 3, o.seed) * 6.28
    const y = o.band[0] + (o.band[1] - o.band[0]) * hash(i, 4, o.seed) + 0.18 * Math.sin(blown * 1.3 + ph) * (o.band[1] - o.band[0]) * 0.4
    if (y < f.y0 - 0.3 || y > f.y1 + 0.3) continue
    const a = blown * (3 + 4 * hash(i, 5, o.seed)) + ph
    const s = o.size * (0.75 + 0.5 * hash(i, 6, o.seed))
    const fade = (o.fade ? o.fade(x, y) : 1) * smooth(share - hash(i, 7, o.seed), 0, 0.06)
    if (fade < 0.05) continue
    paths[i % 3].push([x, y, a, s * (0.4 + 0.6 * fade), fade])
  }
  p.noStroke()
  paths.forEach((list, c) => {
    if (!list.length) return
    p.fill(mixHex(LEAF_COLORS[c], HILL.skyGrey, o.haze))
    ctx.beginPath()
    for (const [x, y, a, s] of list) leafPath(ctx, k, x, y, a, s)
    ctx.fill()
  })
}

/**
 * How far the crown leans over in the wind at `t` (cells, at its middle; its top goes further): in summer a breeze's
 * sway; years later it heaves in the autumn gusts as they reach it, and all but stills in the lull.
 */
function crownSway(t: number, au: number): number {
  const summer = 0.03 * Math.sin(t * 0.9) + 0.015 * Math.sin(t * 2.3 + 1) + 0.045 * (gust(t, 21) - 0.55)
  if (au <= 0) return summer
  const autumnal = windStrength(t) * (0.024 + 0.048 * gustIn(REACH.near, treeX(t), windBlown(t)) + 0.008 * Math.sin(t * 4.4))
  return summer * (1 - au) + autumnal * au
}

/**
 * In the lull (174.4 to 176.6: her give-way, his stillness, his run) the frame's middle is kept clear: how much of a leaf
 * at (x, y) shows then, or nothing when there is no lull.
 */
function lullFade(f: Frame, t: number): ((x: number, y: number) => number) | undefined {
  const lull = smooth(t, 174.0, 174.4) * (1 - smooth(t, 176.6, 177.1))
  if (lull <= 0) return undefined
  const hw = (f.x1 - f.x0) / 2
  const hh = (f.y1 - f.y0) / 2
  return (x, y) => 1 - lull * (1 - smooth(Math.hypot((x - f.cx) / hw, (y - f.cy) / hh), 0.4, 0.75))
}

/* ------------------------------------------------------------------ the harvest, the farm, the fence */

/**
 * The harvest left standing in the stubble: stooks, sheaves leaning together, tied at the waist and splayed at the top,
 * in rows across the valley field, smaller and hazier the farther the row. Flat shapes with a shaded side and no ink;
 * the wind tugs their tops a little (and lets them be in the lull). Each row: how far past the horizon it lies, its
 * parallax, the stooks' height, how far apart, and how hazed. A strip of the field is left unstooked where the close
 * looks from her give-way to his reaching her (`STOOK_CLEAR`, the camera's middle then), so nothing stands behind them.
 */
const STOOK_CLEAR = { from: 7.0, to: 8.55, margin: 1.0 }
const STOOK_ROWS: { below: number; depth: number; size: number; gap: number; haze: number }[] = [
  { below: 0.42, depth: 0.76, size: 0.1, gap: 0.55, haze: 0.5 },
  { below: 0.64, depth: 0.71, size: 0.13, gap: 0.68, haze: 0.4 },
  { below: 0.92, depth: 0.64, size: 0.17, gap: 0.82, haze: 0.3 },
  { below: 1.26, depth: 0.55, size: 0.22, gap: 1.0, haze: 0.2 },
]

function stooks(p: p5, k: number, f: Frame, t: number, au: number, horizon: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const blown = windBlown(t)
  const s0 = windStrength(t)
  const straw = mixHex(HILL.grassAutumn, HOME.yellow, 0.25)
  p.noStroke()
  STOOK_ROWS.forEach((row, j) => {
    const y = horizon + row.below
    if (y < f.y0 - 0.3 || y - row.size > f.y1) return
    const shift = along(f, row.depth)
    const body: [number, number, number][] = []
    for (let m = Math.floor((f.x0 - shift - 0.5) / row.gap); m * row.gap + shift < f.x1 + 0.5; m++) {
      if (hash(m, j, 201) < 0.22) continue
      const lx = (m + 0.7 * hash(m, j, 202)) * row.gap
      const d = 1 - row.depth
      if (lx > d * STOOK_CLEAR.from - STOOK_CLEAR.margin && lx < d * STOOK_CLEAR.to + STOOK_CLEAR.margin) continue
      const x = lx + shift
      const s = row.size * (0.85 + 0.3 * hash(m, j, 203))
      body.push([x, y + 0.04 * row.size * (hash(m, j, 204) - 0.5), s])
    }
    if (!body.length) return
    const tug = (x: number, s: number) => s * 0.14 * s0 * (0.4 + gustIn(REACH.field, x, blown))
    // The stook: sheaves splayed at the foot, tied at the waist, their heads fanned at the top.
    const shape = (x: number, yb: number, s: number, half: boolean) => {
      const g = tug(x, s)
      if (half) {
        ctx.moveTo(X(x + 0.02 * s, k), X(yb, k))
        ctx.lineTo(X(x + 0.02 * s + g * 0.6, k), X(yb - 0.52 * s, k))
        ctx.lineTo(X(x + 0.04 * s + g, k), X(yb - 1.02 * s, k))
        ctx.lineTo(X(x + 0.13 * s + g, k), X(yb - 0.96 * s, k))
        ctx.lineTo(X(x + 0.23 * s + g * 0.8, k), X(yb - 0.82 * s, k))
        ctx.lineTo(X(x + 0.14 * s + g * 0.5, k), X(yb - 0.52 * s, k))
        ctx.lineTo(X(x + 0.35 * s, k), X(yb, k))
        ctx.closePath()
        return
      }
      ctx.moveTo(X(x - 0.35 * s, k), X(yb, k))
      ctx.lineTo(X(x - 0.15 * s + g * 0.5, k), X(yb - 0.52 * s, k))
      ctx.lineTo(X(x - 0.24 * s + g * 0.8, k), X(yb - 0.84 * s, k))
      ctx.lineTo(X(x - 0.12 * s + g, k), X(yb - 1.0 * s, k))
      ctx.lineTo(X(x + 0.01 * s + g * 1.15, k), X(yb - 1.08 * s, k))
      ctx.lineTo(X(x + 0.13 * s + g, k), X(yb - 0.96 * s, k))
      ctx.lineTo(X(x + 0.23 * s + g * 0.8, k), X(yb - 0.82 * s, k))
      ctx.lineTo(X(x + 0.14 * s + g * 0.5, k), X(yb - 0.52 * s, k))
      ctx.lineTo(X(x + 0.35 * s, k), X(yb, k))
      ctx.closePath()
    }
    const lit = mixHex(straw, HILL.skyGrey, row.haze)
    const dark = mixHex(mixHex(straw, HILL.bark, 0.42), HILL.skyGrey, row.haze)
    p.fill(alpha(p, lit, au))
    ctx.beginPath()
    for (const [x, yb, s] of body) shape(x, yb, s, false)
    ctx.fill()
    p.fill(alpha(p, dark, au))
    ctx.beginPath()
    for (const [x, yb, s] of body) shape(x, yb, s, true)
    ctx.fill()
    // The band that ties each at its waist.
    p.fill(alpha(p, mixHex(mixHex(HILL.bark, straw, 0.3), HILL.skyGrey, row.haze), au))
    ctx.beginPath()
    for (const [x, yb, s] of body) {
      const g = tug(x, s) * 0.5
      ctx.rect(X(x - 0.15 * s + g, k), X(yb - 0.56 * s, k), X(0.3 * s, k), X(0.07 * s, k))
    }
    ctx.fill()
  })
}

/** The farmstead's place on the far slope, at that fold's own depth (0.82), in the hill's cells: just short of the town. */
const FARM_X = 3.2

/**
 * A farmstead far off on the far slope, near the town and its spire: a barn under its roof, a silo, and a line of
 * poplars gone gold, bending in the wind. Hazed toward the grey sky, flat, no ink.
 */
function farmstead(p: p5, k: number, f: Frame, t: number, au: number, top: (x: number) => number): void {
  const x0 = FARM_X + along(f, 0.82)
  if (x0 + 1 < f.x0 || x0 - 0.8 > f.x1) return
  // Small, as far things are: everything below at this size.
  const S = 0.72
  const haze = (c: string, h = 0.78) => alpha(p, mixHex(c, HILL.skyGrey, h), au)
  const blown = windBlown(t)
  const s0 = windStrength(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  // The poplars: a row of tall narrow crowns, their tips bent over downwind as each gust comes.
  p.fill(haze(mixHex(HILL.leafAutumn, HOME.yellow, 0.45), 0.7))
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const x = x0 + S * (-0.75 + i * 0.13 + 0.03 * hash(i, 211))
    const yb = top(x) + 0.03
    const h = S * (0.36 + 0.1 * hash(i, 212))
    const bendTo = h * 0.16 * s0 * (0.5 + gustIn(REACH.mid, x, blown))
    ctx.moveTo(X(x - 0.035 * S, k), X(yb, k))
    ctx.quadraticCurveTo(X(x - 0.05 * S, k), X(yb - h * 0.55, k), X(x + bendTo, k), X(yb - h, k))
    ctx.quadraticCurveTo(X(x + 0.05 * S + bendTo * 0.4, k), X(yb - h * 0.55, k), X(x + 0.035 * S, k), X(yb, k))
    ctx.closePath()
  }
  ctx.fill()
  // The barn: its walls, its roof, and the dark of its open door.
  const bx = x0
  const by = Math.max(top(bx - 0.2 * S), top(bx + 0.2 * S)) + 0.02
  p.fill(haze(mixHex(HOME.roof, HILL.blanket, 0.35)))
  ctx.beginPath()
  ctx.rect(X(bx - 0.2 * S, k), X(by - 0.15 * S, k), X(0.4 * S, k), X(0.15 * S, k))
  ctx.fill()
  p.fill(haze(mixHex(HOME.roofOld, INK, 0.25)))
  ctx.beginPath()
  ctx.moveTo(X(bx - 0.24 * S, k), X(by - 0.14 * S, k))
  ctx.lineTo(X(bx - 0.13 * S, k), X(by - 0.26 * S, k))
  ctx.lineTo(X(bx + 0.13 * S, k), X(by - 0.26 * S, k))
  ctx.lineTo(X(bx + 0.24 * S, k), X(by - 0.14 * S, k))
  ctx.closePath()
  ctx.rect(X(bx - 0.04 * S, k), X(by - 0.09 * S, k), X(0.08 * S, k), X(0.09 * S, k))
  ctx.fill()
  // The silo: a tall drum with a domed cap, beside it.
  const sx = x0 + 0.33 * S
  const sy = top(sx) + 0.02
  p.fill(haze(mixHex(HOME.stone, HILL.skyGrey, 0.2)))
  ctx.beginPath()
  ctx.rect(X(sx - 0.05 * S, k), X(sy - 0.34 * S, k), X(0.1 * S, k), X(0.34 * S, k))
  ctx.moveTo(X(sx + 0.05 * S, k), X(sy - 0.34 * S, k))
  ctx.arc(X(sx, k), X(sy - 0.34 * S, k), X(0.05 * S, k), 0, Math.PI, true)
  ctx.fill()
}

/**
 * Crows in the stubble, small and far: they stand, take off together on a gust (171.15), wheel up and downwind and come
 * down again a little way on, settled by 173.1 and still after. Standing, a dark body with its head; flying, a pair of
 * strokes flapping. Their spots in the field's own depth, at the frame's look when they rise.
 */
const CROWS = { at: 9.7, depth: 0.7, lift: 171.15, n: 7 }
function crows(p: p5, k: number, f: Frame, t: number, au: number, horizon: number, weight: number): void {
  if (t > CROWS.lift + 6) return
  const shift = along(f, CROWS.depth, 7.2)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ink = alpha(p, mixHex(INK, HILL.skyGrey, 0.35), au)
  const standing: [number, number, number][] = []
  const flying: [number, number, number][] = []
  for (let i = 0; i < CROWS.n; i++) {
    const x0 = CROWS.at + 0.95 * hash(i, 221) + shift
    const y0 = horizon + 0.48 + 0.16 * hash(i, 222)
    const off = CROWS.lift + 0.07 * i + 0.05 * hash(i, 223)
    const dur = 1.45 + 0.4 * hash(i, 224)
    const u = Math.max(0, Math.min(1, (t - off) / dur))
    const x = x0 + (0.75 + 0.3 * hash(i, 225)) * (u * u * (3 - 2 * u))
    const y = y0 - (0.42 + 0.2 * hash(i, 226)) * Math.sin(Math.PI * u) - 0.04 * Math.sin(Math.PI * 2 * u)
    if (x < f.x0 - 0.2 || x > f.x1 + 0.2 || y < f.y0 - 0.2 || y > f.y1 + 0.2) continue
    const facing = hash(i, 227) < 0.5 ? -1 : 1
    if (u > 0 && u < 1) flying.push([x, y, t - off])
    else standing.push([x, y, facing])
  }
  p.noStroke()
  p.fill(ink)
  ctx.beginPath()
  for (const [x, y, d] of standing) {
    ctx.moveTo(X(x + 0.032, k), X(y - 0.022, k))
    ctx.ellipse(X(x, k), X(y - 0.022, k), X(0.032, k), X(0.018, k), d * 0.25, 0, Math.PI * 2)
    ctx.moveTo(X(x + d * 0.03 + 0.012, k), X(y - 0.04, k))
    ctx.arc(X(x + d * 0.03, k), X(y - 0.04, k), X(0.012, k), 0, Math.PI * 2)
  }
  ctx.fill()
  if (!flying.length) return
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(Math.max(1, weight * 0.4))
  ctx.beginPath()
  for (const [x, y, s] of flying) {
    const flap = Math.sin(s * Math.PI * 2 * 3.2)
    const half = 0.045
    const lift = half * (0.15 + 0.5 * flap)
    ctx.moveTo(X(x - half, k), X(y - lift, k))
    ctx.lineTo(X(x, k), X(y + half * 0.15, k))
    ctx.lineTo(X(x + half, k), X(y - lift, k))
  }
  ctx.stroke()
}

/** The fence's line along the lane's near side, in the hill's cells: its posts' tops, how far apart, the gate's gap. */
const FENCE = { top: LANE_Y + R + 0.32, gap: 1.05, depth: -0.45, anchor: 8.6, gate: 8 }

/**
 * A weathered fence along the near side of the lane, at the frame's foot and nearer than the set (it slides past
 * faster as the camera moves): split grey posts, each a little askew and one leaning hard, two sagging rails between,
 * one here and there dropped at an end; across from where the path leaves the lane, a gap with its gate hung open. Its
 * tops stay well under the lane, so it never comes near the two of them, the stone or the basket. Inked, as near
 * things are.
 */
function fence(p: p5, k: number, f: Frame, au: number, weight: number): void {
  const top = FENCE.top
  if (f.y1 < top + 0.02) return
  const shift = along(f, FENCE.depth, FENCE.anchor)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const post = mixHex(mixHex(HOME.woodDark, HILL.skyGrey, 0.5), HILL.grassAutumn, 0.12)
  const shade = mixHex(post, INK, 0.3)
  const rail = mixHex(HOME.wood, HILL.skyGrey, 0.48)
  const foot = top + 0.62
  const ink = weight * 0.8
  const m0 = Math.floor((f.x0 - shift - 1.2) / FENCE.gap)
  const m1 = Math.ceil((f.x1 - shift + 1.2) / FENCE.gap)
  // Where each post stands, its top, and its lean.
  const posts: [number, number, number, number][] = []
  for (let m = m0; m <= m1; m++) {
    const gatepost = m === FENCE.gate || m === FENCE.gate + 1
    const x = m * FENCE.gap + (gatepost ? 0 : 0.18 * (hash(m, 231) - 0.5)) + shift
    const lean = hash(m, 232) < 0.14 && !gatepost ? 0.2 + 0.1 * hash(m, 233) : 0.05 * (hash(m, 234) - 0.5)
    posts.push([x, top + (gatepost ? -0.07 : 0.035 * hash(m, 235)), lean, m])
  }
  // The rails, behind the posts: each from one post to the next, sagging; a few dropped at one end; none at the gate.
  const at = (x: number, y: number, lean: number) => x + Math.tan(lean) * (foot - y)
  const rails: [number, number, number, number][] = []
  for (let i = 0; i + 1 < posts.length; i++) {
    const [xa, ya, la, m] = posts[i]
    const [xb, yb, lb] = posts[i + 1]
    if (m === FENCE.gate) continue
    for (const [n, drop] of [[0, 0.1], [1, 0.3]] as const) {
      const r = hash(m, 236 + n)
      if (r < 0.06) continue
      const y1 = ya + drop
      const y2 = r < 0.16 ? foot - 0.08 : yb + drop
      rails.push([at(xa, y1, la), y1, at(xb, y2, lb), y2])
    }
  }
  p.noFill()
  ctx.lineCap = 'butt'
  for (const [w, color] of [[0.034 + (2 * ink) / k, INK], [0.034, rail]] as const) {
    p.stroke(alpha(p, color, au))
    p.strokeWeight(w * k)
    ctx.beginPath()
    for (const [x1, y1, x2, y2] of rails) {
      ctx.moveTo(X(x1, k), X(y1, k))
      ctx.quadraticCurveTo(X((x1 + x2) / 2, k), X((y1 + y2) / 2 + 0.035, k), X(x2, k), X(y2, k))
    }
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  // The gate, hung open from its post toward us: narrow (seen nearly end on), three bars and a brace.
  const g = posts.find((q) => q[3] === FENCE.gate)
  if (g) {
    const [gx, gy] = g
    const w = 0.34
    const y0 = gy + 0.13
    const y1 = gy + 0.48
    p.stroke(alpha(p, INK, au))
    p.strokeWeight(ink)
    p.fill(alpha(p, rail, au))
    for (const v of [0, 0.5, 1]) {
      const y = y0 + (y1 - y0) * v
      ctx.beginPath()
      ctx.rect(X(gx + 0.04, k), X(y - 0.016 + v * 0.05, k), X(w, k), X(0.032, k))
      ctx.fill()
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(X(gx + 0.06, k), X(y1, k))
    ctx.lineTo(X(gx + 0.04 + w, k), X(y0 + 0.05, k))
    ctx.stroke()
    ctx.beginPath()
    ctx.rect(X(gx + 0.04 + w - 0.03, k), X(y0 - 0.02, k), X(0.03, k), X(y1 - y0 + 0.1, k))
    ctx.fill()
    ctx.stroke()
  }
  // The posts: split, so a little uneven in width; their tops cut on a slant; shaded down their right side.
  for (const [x, y, lean, m] of posts) {
    if (x < f.x0 - 0.3 || x > f.x1 + 0.3) continue
    const hw = (m === FENCE.gate || m === FENCE.gate + 1 ? 0.05 : 0.034) * (0.9 + 0.2 * hash(m, 238))
    const dx = Math.tan(lean) * (foot - y)
    const corners: [number, number][] = [
      [x - hw + dx, y - 0.012],
      [x + hw + dx, y + 0.014],
      [x + hw * 1.1, foot],
      [x - hw * 1.1, foot],
    ]
    const trace = () => {
      ctx.beginPath()
      corners.forEach(([cx, cy], i) => (i ? ctx.lineTo(X(cx, k), X(cy, k)) : ctx.moveTo(X(cx, k), X(cy, k))))
      ctx.closePath()
    }
    p.noStroke()
    p.fill(alpha(p, post, au))
    trace()
    ctx.fill()
    p.fill(alpha(p, shade, au))
    ctx.beginPath()
    ctx.moveTo(X(x + hw * 0.3 + dx, k), X(y + 0.005, k))
    ctx.lineTo(X(x + hw + dx, k), X(y + 0.014, k))
    ctx.lineTo(X(x + hw * 1.1, k), X(foot, k))
    ctx.lineTo(X(x + hw * 0.35, k), X(foot, k))
    ctx.closePath()
    ctx.fill()
    p.noFill()
    p.stroke(alpha(p, INK, au))
    p.strokeWeight(ink)
    trace()
    ctx.stroke()
    // A split down its face.
    p.strokeWeight(Math.max(1, ink * 0.5))
    ctx.beginPath()
    ctx.moveTo(X(x - hw * 0.2 + dx * 0.9, k), X(y + 0.06, k))
    ctx.lineTo(X(x - hw * 0.1 + dx * 0.5, k), X(y + 0.26, k))
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ the sky, the far side, the near grass */

/** The ground's drawn line at `x`, its surface: the hill's skyline, the stone's top, the lane beyond. */
function surface(x: number): number {
  if (x < STEP.x0) return ridge(x) + R
  if (x <= STEP.x1) return STEP.y + R
  return LANE_Y + R
}

/**
 * The summer's high sheet: long thin streaks of cloud in rows far above the steam's shapes (none lower than
 * `SHEET_FOOT`, clear of the falls' lip and the airship's back), faint, drifting slowly, and keeping nearly with the
 * frame as it moves (deep parallax), so the sky is a sky and the shapes stay the subject. It goes up as far as the frame
 * does: a phone held upright sees a sky of it.
 */
const SHEET_FOOT = -3.35
function highSheet(p: p5, k: number, f: Frame, t: number, a: number): void {
  if (f.y0 > SHEET_FOOT - 0.05 || a <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const shift = along(f, 0.9, 1)
  const span = 3.4
  p.noStroke()
  for (let r = 0; r < 60; r++) {
    const y = SHEET_FOOT - 0.12 - r * 0.34 - 0.2 * hash(r, 71)
    if (y < f.y0 - 0.2) break
    // Fading in above its foot, so the sheet has no edge; each row its own strength.
    const strength = a * 0.3 * smooth(-y, -SHEET_FOOT, -SHEET_FOOT + 0.8) * (0.55 + 0.45 * hash(r, 72))
    if (strength < 0.01) continue
    p.fill(alpha(p, mixHex(HILL.cloud, HILL.sky, 0.15), strength))
    const drift = 0.05 * t * (0.8 + 0.4 * hash(r, 73)) + span * hash(r, 74)
    ctx.beginPath()
    for (let j = Math.floor((f.x0 - shift - drift) / span) - 1; j * span + drift + shift < f.x1 + 1; j++) {
      // In drifts and clearings, not an even weave: the sheet thins and gathers in patches.
      const patch = Math.sin(j * 0.9 + r * 0.45) * Math.sin(j * 0.37 - r * 0.8)
      if (hash(j, r, 75) < 0.4 + 0.45 * patch) continue
      const x = j * span + drift + shift + 1.6 * hash(j, r, 76)
      const half = 0.7 + 1.1 * hash(j, r, 77)
      const h = 0.03 + 0.035 * hash(j, r, 78)
      if (x + 1.6 * half < f.x0 || x - half > f.x1) continue
      // A streak, and its frayed tail trailing off a little lower.
      ctx.moveTo(X(x + half, k), X(y, k))
      ctx.ellipse(X(x, k), X(y, k), X(half, k), X(h, k), 0, 0, Math.PI * 2)
      ctx.moveTo(X(x + 1.55 * half, k), X(y + 0.04, k))
      ctx.ellipse(X(x + 1.0 * half, k), X(y + 0.04, k), X(0.55 * half, k), X(h * 0.6, k), 0, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

/**
 * The autumn lid: soft grey bands of cloud at two depths, the far ones pale and high and all but still, the nearer ones
 * lower, a shade darker and drifting faster, so the overcast has depth as the camera breathes out and in. The far ones
 * go up as far as the frame does.
 */
function greyBands(p: p5, k: number, f: Frame, t: number, au: number, horizon: number): void {
  const layers = [
    { depth: 0.93, drift: 0.025, foot: horizon - 1.25, gap: 0.8, rows: 40, w: 8, h: 0.3, a: 1, seed: 0 },
    { depth: 0.7, drift: 0.075, foot: horizon - 0.85, gap: 1.1, rows: 4, w: 6, h: 0.34, a: 1, seed: 5 },
  ]
  const span = 13
  p.noStroke()
  for (const L of layers) {
    const near = L.seed > 0
    const under = alpha(p, near ? mixHex(HILL.skyGrey, HOME.night, 0.16) : mixHex(HILL.cloudShade, HILL.skyGrey, 0.5), (near ? 0.26 : 0.22) * au)
    const over = alpha(p, mixHex(HILL.cloud, HILL.skyGrey, near ? 0.5 : 0.35), (near ? 0.24 : 0.3) * au)
    const shift = along(f, L.depth)
    for (let i = 0; i < L.rows; i++) {
      const cy = L.foot - i * L.gap - 0.3 * hash(i, 11, L.seed)
      if (cy < f.y0 - 1) break
      if (cy > f.y1 + 1) continue
      const drift = L.drift * t + span * hash(i, 12, L.seed)
      for (let j = Math.floor((f.x0 - shift - drift) / span) - 1; j * span + drift + shift < f.x1 + span; j++) {
        const cx = j * span + drift + shift + 4 * hash(i, j, 13 + L.seed)
        const w = L.w * (0.75 + 0.6 * hash(i, j, 14 + L.seed))
        const h = L.h * (0.75 + 0.6 * hash(i, j, 15 + L.seed))
        if (cx + w < f.x0 || cx - w > f.x1) continue
        p.fill(under)
        p.ellipse(X(cx, k), X(cy, k), X(w * 1.2, k), X(h * 1.6, k))
        p.fill(over)
        p.ellipse(X(cx - w * 0.1, k), X(cy - h * 0.2, k), X(w * 0.8, k), X(h, k))
      }
    }
  }
}

/**
 * Scud: small torn clouds racing under the grey lid on the autumn wind, darker than it, low over the far slopes and
 * quicker than anything else in the sky; they slow in the lull with the wind. A ragged blob each (a few overlapping
 * ovals), wrapped round a stretch wider than any frame.
 */
function scud(p: p5, k: number, f: Frame, t: number, au: number, horizon: number): void {
  const span = 20
  const blown = windBlown(t)
  const shift = along(f, 0.6)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  p.fill(alpha(p, mixHex(HILL.skyGrey, HOME.night, 0.24), 0.34 * au))
  ctx.beginPath()
  for (let i = 0; i < 26; i++) {
    const w = 0.35 + 0.45 * hash(i, 1, 51)
    const x = wrapNear(hash(i, 2, 51) * span + (1.1 + 0.6 * hash(i, 3, 51)) * blown, f.cx - shift, span) + shift
    const y = horizon - 1.1 - 2.6 * hash(i, 4, 51) + 0.05 * Math.sin(blown * 0.7 + i)
    if (x + w < f.x0 || x - w > f.x1 || y < f.y0 - 0.3 || y > f.y1) continue
    for (let j = 0; j < 3; j++) {
      const cx = x + (j - 1) * w * 0.55 + 0.1 * (hash(i, j, 52) - 0.5)
      const rx = w * (0.32 + 0.22 * hash(i, j, 53))
      const ry = w * (0.11 + 0.08 * hash(i, j, 54))
      const cy = y - ry * 0.3 * (j === 1 ? 1 : 0)
      ctx.moveTo(X(cx + rx, k), X(cy, k))
      ctx.ellipse(X(cx, k), X(cy, k), X(rx, k), X(ry, k), 0, 0, Math.PI * 2)
    }
  }
  ctx.fill()
}

/**
 * The geese, leaving: once, as he leads her up, a skein in a V crosses the grey sky high and slow, in from the left and
 * climbing away out of the top of the frame, gone well before she gives way (174.67). So far off that it keeps with the
 * frame as the camera breathes, the same size in it throughout.
 */
const GEESE = { t0: 167.85, t1: 173.8 }
function geese(p: p5, k: number, f: Frame, t: number, weight: number): void {
  if (t < GEESE.t0 || t > GEESE.t1) return
  const W = f.x1 - f.x0
  const u = (t - GEESE.t0) / (GEESE.t1 - GEESE.t0)
  const span = 0.012 * W
  const tall = Math.min(f.y1 - f.y0, W)
  birds(
    p,
    k,
    f,
    t,
    {
      t0: GEESE.t0,
      from: [f.x0 + W * (-0.07 + 0.92 * u), f.y0 + tall * (0.21 - 0.33 * u)],
      v: [0, 0],
      dur: GEESE.t1 - GEESE.t0,
      n: 9,
      vee: true,
      span,
      color: mixHex(INK, HILL.skyGrey, 0.5),
      beat: 1.6,
      seed: 4,
    },
    weight,
  )
}

/**
 * Small birds, now and then, crossing low over the valley near the far ridge and gliding down into it behind the
 * nearer fold: under the steam's shapes and never through one while it builds, and never through the steam's line from
 * the chimney. Their flights in the far ridge's depth: when, from where (across, and how far over the horizon), how fast
 * (cells a second, across and down), how many. A few come out from behind the tree and come down before the engine;
 * three cross the town under the falls' far side; a pair comes in from the right after the gust has taken the falls
 * and comes down right of the engine, clear of the baby.
 */
const FLOCKS = [
  { t0: 50.3, dur: 2.9, x: -1.9, up: 0.5, v: [0.8, 0.2], n: 4, seed: 3 },
  { t0: 54.6, dur: 3.2, x: 5.1, up: 0.48, v: [-0.6, 0.13], n: 3, seed: 5 },
  { t0: 61.0, dur: 2.8, x: 3.85, up: 0.48, v: [-0.55, 0.19], n: 2, seed: 8 },
] as const
function valleyBirds(p: p5, k: number, f: Frame, t: number, horizon: number, weight: number): void {
  for (const b of FLOCKS) {
    birds(
      p,
      k,
      f,
      t,
      { t0: b.t0, from: [b.x, horizon - b.up], v: [b.v[0], b.v[1]], dur: b.dur, n: b.n, span: 0.075, color: mixHex(INK, HILL.sky, 0.5), beat: 2.6, seed: b.seed, depth: 0.8 },
      weight,
    )
  }
}

/** Their house on the far ridge in summer: where its foot is at the ridge's own depth (0.9), in the hill's cells. */
const HOUSE_FAR = -1.12

/**
 * Their house, small on the far ridge in summer and hazed toward the sky: its pale green walls, its steep terracotta
 * roof and its chimney, one flat shape and no ink. Seen from the blanket over the valley, as the church's spire is in
 * the town across it: their places in sight of each other.
 */
function farHouse(p: p5, k: number, f: Frame, a: number, top: (x: number) => number): void {
  const x = HOUSE_FAR + along(f, 0.9)
  if (a <= 0 || x < f.x0 - 0.5 || x > f.x1 + 0.5) return
  const y = Math.max(top(x - 0.09), top(x + 0.09)) + 0.025
  const haze = 0.6
  p.noStroke()
  p.fill(alpha(p, mixHex(mixHex(HOME.siding, HILL.grass, 0.3), HILL.sky, haze), a))
  p.rect(X(x - 0.085, k), X(y - 0.1, k), X(0.17, k), X(0.1, k))
  p.fill(alpha(p, mixHex(HOME.roof, HILL.sky, haze - 0.08), a))
  p.rect(X(x + 0.03, k), X(y - 0.235, k), X(0.03, k), X(0.07, k))
  p.triangle(X(x - 0.11, k), X(y - 0.095, k), X(x + 0.11, k), X(y - 0.095, k), X(x, k), X(y - 0.22, k))
  p.fill(alpha(p, mixHex(HOME.yellow, HILL.sky, haze), a))
  p.triangle(X(x - 0.05, k), X(y - 0.1, k), X(x + 0.05, k), X(y - 0.1, k), X(x, k), X(y - 0.16, k))
}

/**
 * The tree's shadow on the grass in summer, the sun high on the left: a soft dark band along the ground right of its
 * foot, under the skyline, thickest a little way out and gone to nothing at both ends. Years later the sky is a lid and
 * there is none.
 */
function treeShadow(p: p5, k: number, tx: number, a: number): void {
  if (a <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  for (const [x0, x1, th, s] of [[-0.35, 2.7, 0.26, 0.1], [-0.15, 2.1, 0.14, 0.11]] as const) {
    p.fill(alpha(p, mixHex(HILL.leaf, INK, 0.45), s * a))
    ctx.beginPath()
    const n = 24
    for (let i = 0; i <= n; i++) {
      const x = tx + x0 + ((x1 - x0) * i) / n
      ctx.lineTo(X(x, k), X(ridge(x) + R - 0.01, k))
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n
      const x = tx + x0 + (x1 - x0) * u
      ctx.lineTo(X(x, k), X(ridge(x) + R + th * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.7), k))
    }
    ctx.closePath()
    ctx.fill()
  }
}

/**
 * The near grass along the frame's foot, in front of everything and nearer than the set, in two rows that slide past
 * faster than it as the camera moves: tall stalks nodding in the wind's gusts, the gust travelling along them; in
 * summer a few small wildflowers in the palette's colours on them, years later straw with its seed heads. Their tops
 * stay under the hill's own skyline and the lane wherever they show, so they never come over the two of them, the
 * blanket, the engine or the basket.
 */
function nearGrass(p: p5, k: number, f: Frame, t: number, au: number): void {
  const root = f.y1 + 0.05
  // Never more than the frame's foot: close in (and under Zoom) it is a fringe, not a hedge.
  const most = 0.22 * Math.min(f.y1 - f.y0, ((f.x1 - f.x0) * 9) / 16)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rows = [
    { depth: -0.35, per: 6, h: 0.42, w: 0.014, seed: 1, color: mixHex(mixHex(HILL.leaf, INK, 0.06), mixHex(HILL.grassAutumn, HILL.bark, 0.28), au) },
    { depth: -0.75, per: 3.2, h: 0.58, w: 0.019, seed: 2, color: mixHex(mixHex(HILL.leaf, INK, 0.22), mixHex(HILL.grassAutumn, HILL.bark, 0.48), au) },
  ]
  const blown = windBlown(t)
  const strong = windStrength(t)
  // Each head: its blade's top, the curve's control point (so the head lies along the blade), its size, and which it is.
  const heads: [number, number, number, number, number, number][] = []
  p.noStroke()
  for (const row of rows) {
    const shift = along(f, row.depth)
    p.fill(row.color)
    ctx.beginPath()
    for (let i = Math.floor((f.x0 - shift - 0.4) * row.per); i <= Math.ceil((f.x1 - shift + 0.4) * row.per); i++) {
      if (hash(i, 81, row.seed) > 0.62) continue
      const x = (i + hash(i, 82, row.seed)) / row.per + shift
      if (x < f.x0 - 0.3 || x > f.x1 + 0.3) continue
      const want = Math.min(row.h, most) * (0.45 + 0.8 * hash(i, 83, row.seed))
      // Its top no higher than the ground's line where it might lean to, less a margin; under it, still ragged.
      const room = root - Math.max(surface(x - 0.05), surface(x + 0.45 * want)) - 0.07
      const h = Math.min(want, room * (0.6 + 0.4 * hash(i, 85, row.seed)))
      if (h < 0.05) continue
      // In summer nodding in the breeze; years later laid over by each gust as it crosses, and fluttering.
      const breeze = (0.08 + 0.34 * gust(t - x * 0.12, 9)) + 0.04 * Math.sin(t * 1.7 + i * 1.3)
      const gale = strong * (0.12 + 0.42 * gustIn(REACH.near, x - shift, blown) + 0.12 * Math.sin(t * (9 + 3 * hash(i, 87, row.seed)) + i * 1.3))
      const lean = h * (breeze * (1 - au) + gale * au)
      const tx = x + lean
      const ty = root - h * (1 - 0.2 * (lean / h) ** 2)
      const qx = x + lean * 0.15
      const qy = root - h * 0.6
      // A blade: up one side to its point and down the other, tapering.
      const bw = row.w * (0.7 + 0.6 * hash(i, 86, row.seed))
      ctx.moveTo(X(x - bw, k), X(root, k))
      ctx.quadraticCurveTo(X(qx - bw * 0.55, k), X(qy, k), X(tx, k), X(ty, k))
      ctx.quadraticCurveTo(X(qx + bw * 0.55, k), X(qy, k), X(x + bw, k), X(root, k))
      ctx.closePath()
      const which = hash(i, 84, row.seed)
      if (which < (au < 0.5 ? 0.2 : 0.35)) heads.push([tx, ty, qx, qy, bw, which])
    }
    ctx.fill()
  }
  if (au < 0.5) {
    // Wildflowers: a small dot on the blade's head, nodding with it.
    const blooms = [HOME.yellow, HOME.pink, HOME.trim].map((c) => mixHex(c, HILL.leaf, 0.12))
    blooms.forEach((c, n) => {
      p.fill(c)
      ctx.beginPath()
      for (const [x, y, , , bw, which] of heads) {
        if (Math.floor((which / 0.2) * 3) !== n) continue
        const r = bw * 1.9
        ctx.moveTo(X(x + r, k), X(y, k))
        ctx.arc(X(x, k), X(y, k), X(r, k), 0, Math.PI * 2)
      }
      ctx.fill()
    })
  } else {
    // Seed heads: a small spindle at the top of the straw, along its lean.
    p.fill(mixHex(HILL.grassAutumn, HILL.bark, 0.4))
    ctx.beginPath()
    for (const [x, y, qx, qy, bw] of heads) {
      const a = Math.atan2(y - qy, x - qx)
      const len = bw * 4
      const cx = x - Math.cos(a) * len * 0.7
      const cy = y - Math.sin(a) * len * 0.7
      ctx.moveTo(X(cx + Math.cos(a) * len, k), X(cy + Math.sin(a) * len, k))
      ctx.ellipse(X(cx, k), X(cy, k), X(len, k), X(bw * 1.4, k), a, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

/** Cells to pixels. */
const X = (v: number, k: number): number => v * k

export const hillSet = scenery<null>({
  name: 'hill',
  draw: (p, _s, c) => {
    const { k, t, weight } = c
    const au = autumn(t)
    const f = frame(p, k)
    const X = (x: number) => x * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    p.push()
    p.rectMode(p.CORNER)

    // The sky: a summer blue deepening overhead; years later a pale overcast grey.
    const zenith = mixHex(mixHex(HILL.sky, CHURCH.glassBlue, 0.5), mixHex(HILL.skyGrey, HOME.night, 0.12), au)
    const low = mixHex(mixHex(HILL.sky, HILL.cloud, 0.45), mixHex(HILL.skyGrey, HILL.cloud, 0.35), au)
    // The horizon, kept to the 16:9 picture: a phone held upright sees the extra above it (0.85 of it) as more sky,
    // so the far land stays under the steam's shapes and does not climb up behind them.
    const box = Math.min(f.y1 - f.y0, ((f.x1 - f.x0) * 9) / 16)
    const extra = f.y1 - f.y0 - box
    const mid = f.y1 - 0.15 * extra - box / 2
    const horizon = mid + (0.9 - mid) * 0.3
    ctx.save()
    const g = ctx.createLinearGradient(0, X(horizon - 7), 0, X(horizon))
    g.addColorStop(0, zenith)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
    ctx.restore()

    // Far weather: in summer a high thin sheet far above the steam's shapes (the clouds are theirs); in autumn a lid of
    // soft grey bands at two depths, drifting, and once the geese.
    highSheet(p, k, f, t, 1 - au)
    if (au > 0.02) greyBands(p, k, f, t, au, horizon)
    if (au > 0.5) scud(p, k, f, t, au, horizon)
    if (au > 0.5) geese(p, k, f, t, weight)

    // The far hills and the valley: flat and pale, slow to move with the camera.
    const hill1 = mixHex(mixHex(HILL.grass, HILL.sky, 0.62), mixHex(HILL.grassAutumn, HILL.skyGrey, 0.6), au)
    const hill2 = mixHex(mixHex(HILL.grass, HILL.sky, 0.4), mixHex(HILL.grassAutumn, HILL.skyGrey, 0.42), au)
    const field = mixHex(mixHex(HILL.grass, HILL.sky, 0.22), mixHex(HILL.grassAutumn, HILL.skyGrey, 0.25), au)
    // A fold of the far land: where its top is at `x`, and the fold filled down past the frame.
    const fold = (shift: number, height: number, amp: number, freq: number, seed: number) => (x: number) => {
      const w = x - shift
      return horizon - height - amp * (0.55 + 0.45 * Math.sin(w * freq + seed) + 0.25 * Math.sin(w * freq * 2.7 + seed * 2))
    }
    const band = (top: (x: number) => number, color: string) => {
      p.noStroke()
      p.fill(color)
      p.beginShape()
      p.vertex(X(f.x0 - 1), X(f.y1 + 1))
      for (let x = Math.floor(f.x0) - 1; x <= f.x1 + 1; x += 0.25) p.vertex(X(x), X(top(x)))
      p.vertex(X(f.x1 + 1), X(f.y1 + 1))
      p.endShape(p.CLOSE)
    }
    // A fold's outline, for the wind's streaks to keep to it.
    const trace = (top: (x: number) => number) => () => {
      ctx.moveTo(X(f.x0 - 1), X(f.y1 + 1))
      for (let x = Math.floor(f.x0) - 1; x <= f.x1 + 1; x += 0.25) ctx.lineTo(X(x), X(top(x)))
      ctx.lineTo(X(f.x1 + 1), X(f.y1 + 1))
      ctx.closePath()
    }
    // Years later the wind runs over every fold: far and faint and slow on the far slopes, quicker and plainer nearer.
    const windy = au > 0.5
    const streaks = (top: (x: number) => number, shift: number, r: Reach, gap: number, rows: number, color: string) => {
      if (!windy) return
      const y0 = top(f.cx) - gap
      windStreaks(p, k, f, t, r, shift, rowsOf(y0, y0 + gap * rows, gap), trace(top), mixHex(color, HILL.cloud, 0.75), mixHex(color, HILL.bark, 0.7), au)
    }
    const ridge1 = fold(f.cx * 0.9, 0.35, 0.35, 0.33, 1)
    band(ridge1, hill1)
    streaks(ridge1, f.cx * 0.9, REACH.far, 0.12, 9, hill1)
    // On the far ridge in summer, their house; over the valley in front of it, birds now and then.
    farHouse(p, k, f, 1 - smooth(au, 0, 0.5), ridge1)
    if (au < 0.5) valleyBirds(p, k, f, t, horizon, weight)
    const ridge2 = fold(f.cx * 0.82, 0.05, 0.22, 0.52, 4)
    band(ridge2, hill2)
    streaks(ridge2, f.cx * 0.82, REACH.mid, 0.15, 8, hill2)
    // Years later a farmstead on the far slope, short of the town.
    if (windy) farmstead(p, k, f, t, au, ridge2)
    const ridge3 = fold(f.cx * 0.75, -0.35, 0.05, 0.9, 7)
    band(ridge3, field)
    streaks(ridge3, f.cx * 0.75, REACH.field, 0.19, 12, field)
    // Leaves far off, small and hazed, carried over the far slopes.
    if (windy) {
      windLeaves(p, k, f, t, { n: 35, depth: 0.72, band: [horizon - 1.3, horizon + 0.5], size: 0.026, speed: 0.75, haze: 0.45, seed: 1, fade: lullFade(f, t) })
    }

    // The town in the valley, far off in the haze: one soft roofline, the houses run together under their gables,
    // and a steeple where their church is. A single pale shape, no gaps, no outline, so it never reads as a row of
    // marks.
    const townShift = f.cx * 0.78
    const ty = horizon + 0.05
    const town = mixHex(mixHex(HOME.roof, HILL.sky, 0.72), mixHex(HOME.roofOld, HILL.skyGrey, 0.72), au)
    const walls = mixHex(mixHex(HILL.grass, HILL.sky, 0.72), mixHex(HOME.trim, HILL.skyGrey, 0.7), au)
    // In summer it stands nearer the middle of the valley, so its spire is seen from the blanket across from their house
    // (only one season is ever on screen, as with the tree).
    const tx0 = townShift + (au < 0.5 ? 2.75 : 4.2)
    const tx1 = tx0 + 2.8
    if (tx1 > f.x0 - 1 && tx0 < f.x1 + 1) {
      p.noStroke()
      p.fill(alpha(p, mixHex(town, walls, 0.45), 0.42))
      p.beginShape()
      p.vertex(X(tx0), X(ty))
      for (let i = 0; i < 9; i++) {
        const x = tx0 + 0.16 + i * 0.3 + 0.06 * hash(i, 21)
        const h = 0.1 + 0.07 * hash(i, 22)
        const w = 0.3
        p.vertex(X(x - w / 2), X(ty - h))
        if (i === 4) {
          // The steeple.
          p.vertex(X(x - 0.07), X(ty - h))
          p.vertex(X(x - 0.07), X(ty - h - 0.34))
          p.vertex(X(x), X(ty - h - 0.7))
          p.vertex(X(x + 0.07), X(ty - h - 0.34))
          p.vertex(X(x + 0.07), X(ty - h))
        } else p.vertex(X(x), X(ty - h - 0.1))
        p.vertex(X(x + w / 2), X(ty - h))
      }
      p.vertex(X(tx0 + 0.16 + 8 * 0.3 + 0.2), X(ty))
      p.endShape(p.CLOSE)
    }
    // The harvest standing in the valley's stubble, and the crows in it.
    if (windy) {
      stooks(p, k, f, t, au, horizon)
      crows(p, k, f, t, au, horizon, weight)
    }

    // How far a tuft of height `h` at `x` bends: in summer with the breeze's gust as it runs along; years later laid over
    // by the gusts of the autumn wind as they cross, fluttering, and standing up again in the lull.
    const blown = windBlown(t)
    const strong = windStrength(t)
    const bend = (x: number, h: number, i: number) =>
      (1 - au) * (h * (0.5 * gust(t - x * 0.15, 4) - 0.12) + 0.008 * Math.sin(t * 2.2 + i)) +
      au * strong * h * (0.15 + 0.5 * gustIn(REACH.near, x, blown) + 0.12 * Math.sin(t * 7.5 + i * 1.7))

    // The hill: the crest and its flank, filled down past the lane; its skyline inked once.
    const grass = mixHex(HILL.grass, HILL.grassAutumn, au)
    const grassDark = mixHex(mixHex(HILL.grass, HILL.leaf, 0.6), mixHex(HILL.grassAutumn, HILL.bark, 0.3), au)
    const xs: number[] = []
    const a = Math.max(f.x0 - 1, -14)
    const b = Math.min(f.x1 + 1, STEP.x1)
    for (let x = a; x < b; x += 0.1) xs.push(x)
    xs.push(b)
    if (b > a) {
      p.fill(grass)
      p.beginShape()
      p.vertex(X(a), X(LANE_Y + 3))
      for (const x of xs) p.vertex(X(x), X(ridge(x) + R))
      p.vertex(X(b), X(LANE_Y + 3))
      p.endShape(p.CLOSE)
      // A shade across the face, deepening toward the foot: the hill's bulk.
      ctx.save()
      const sh = ctx.createLinearGradient(0, X(0), 0, X(LANE_Y + 0.2))
      sh.addColorStop(0, 'rgba(0,0,0,0)')
      sh.addColorStop(1, `rgba(40, 50, 30, ${0.1 + 0.04 * au})`)
      ctx.fillStyle = sh
      ctx.beginPath()
      ctx.moveTo(X(a), X(LANE_Y + 0.4))
      for (const x of xs) ctx.lineTo(X(x), X(ridge(x) + R))
      ctx.lineTo(X(b), X(LANE_Y + 0.4))
      ctx.closePath()
      ctx.fill()
      // The wind running down the face of the hill, under the path.
      if (windy) {
        const face = () => {
          ctx.moveTo(X(a), X(LANE_Y + 0.4))
          for (const x of xs) ctx.lineTo(X(x), X(ridge(x) + R + 0.03))
          ctx.lineTo(X(b), X(LANE_Y + 0.4))
          ctx.closePath()
        }
        windStreaks(p, k, f, t, REACH.near, 0, rowsOf(Math.max(-0.2, f.y0 - 0.2), LANE_Y + 0.3, 0.2), face, mixHex(grass, HILL.cloud, 0.8), mixHex(grass, HILL.bark, 0.85), au)
        // (None on the stone's ground: it stands in front of them.)
        const onFace = (x: number) => (x > STEP.x0 - 0.3 && x < STEP.x1 + 0.15 ? Infinity : ridge(x) + R + 0.04)
        tuftField(p, k, f, t, Math.max(-0.3, f.y0 - 0.3), LANE_Y + R - 0.02, onFace, {
          gapX: 0.3,
          gapY: 0.24,
          h0: 0.06,
          h1: 0.1,
          color: alpha(p, mixHex(grass, HILL.bark, 0.4), 0.8).toString(),
          pale: alpha(p, mixHex(grass, HILL.cloud, 0.42), 0.85).toString(),
          weight: Math.max(1, weight * 0.45),
          seed: 101,
        })
        ctx.beginPath()
        ctx.moveTo(X(a), X(LANE_Y + 0.4))
        for (const x of xs) ctx.lineTo(X(x), X(ridge(x) + R))
        ctx.lineTo(X(b), X(LANE_Y + 0.4))
        ctx.closePath()
      }
      // The tree's shadow on the grass (summer), kept to the hill's face.
      if (au < 0.98) {
        ctx.clip()
        treeShadow(p, k, treeX(t), 1 - au)
      }
      ctx.restore()
      // The path along the skyline: a worn band just under the edge, from the step to the crest.
      const px0 = Math.max(a, CREST.x1 - 0.8)
      const px1 = Math.min(b, STEP.x0)
      if (px1 > px0) {
        p.noStroke()
        p.fill(alpha(p, mixHex(HOME.stone, grass, 0.35), 0.9))
        p.beginShape()
        for (let x = px0; x <= px1; x += 0.1) p.vertex(X(x), X(ridge(x) + R))
        for (let x = px1; x >= px0; x -= 0.1) p.vertex(X(x), X(ridge(x) + R + 0.055 * smooth(x, CREST.x1 - 0.8, CREST.x1)))
        p.endShape(p.CLOSE)
      }
      p.noFill()
      p.stroke(alpha(p, INK, 0.85))
      p.strokeWeight(weight * 0.9)
      p.beginShape()
      for (const x of xs) {
        if (x > STEP.x0 + 1e-6) break
        p.vertex(X(x), X(ridge(x) + R))
      }
      p.endShape()
      // Tufts along the skyline, the odd one taller: grass, then straw, bending as each gust runs along the path.
      p.stroke(alpha(p, grassDark, 0.9))
      p.strokeWeight(Math.max(1, weight * 0.55))
      for (let i = Math.floor(a / 0.23); i * 0.23 < b; i++) {
        const x = i * 0.23 + 0.08 * hash(i, 31)
        if (x > STEP.x0 - 0.1 || (x > -0.85 && x < 2.6)) continue
        const y = ridge(x) + R
        const h = 0.06 + 0.07 * hash(i, 32)
        const lean = bend(x, h, i)
        p.line(X(x), X(y), X(x - 0.03 + lean), X(y - h))
        p.line(X(x + 0.03), X(y), X(x + 0.05 + lean), X(y - h * 0.8))
      }
    }

    // The step: one stone slab, where the path leaves the lane.
    if (STEP.x1 > f.x0 - 1 && STEP.x0 < f.x1 + 1) {
      p.stroke(INK)
      p.strokeWeight(weight * 0.9)
      p.fill(mixHex(HOME.stone, HILL.skyGrey, 0.15 + 0.2 * au))
      p.rect(X(STEP.x0 - 0.08), X(STEP.y + R), X(STEP.x1 - STEP.x0 + 0.08), X(0.13), X(0.025))
    }

    // The lane at the foot, in front of the hill: a pale track, its verge, and the field below.
    const lane = mixHex(HOME.stone, mixHex(HOME.stone, HILL.grassAutumn, 0.3), au)
    const top = LANE_Y + R
    p.noStroke()
    p.fill(mixHex(grass, grassDark, 0.35))
    p.rect(X(f.x0 - 1), X(top + 0.16), X(f.x1 - f.x0 + 2), X(Math.max(0, f.y1 - top + 1)))
    p.fill(lane)
    p.rect(X(f.x0 - 1), X(top), X(f.x1 - f.x0 + 2), X(0.16))
    p.stroke(alpha(p, INK, 0.85))
    p.strokeWeight(weight * 0.9)
    p.line(X(f.x0 - 1), X(top), X(Math.min(f.x1 + 1, STEP.x0 - 0.08)), X(top))
    p.line(X(Math.max(f.x0 - 1, STEP.x1)), X(top), X(f.x1 + 1), X(top))
    // Ruts in the track, faint.
    p.stroke(alpha(p, mixHex(lane, INK, 0.3), 0.35))
    p.strokeWeight(Math.max(1, weight * 0.4))
    for (let i = Math.floor(f.x0 / 1.7) - 1; i * 1.7 < f.x1 + 1; i++) {
      const x = i * 1.7 + 0.5 * hash(i, 51)
      p.line(X(x), X(top + 0.07), X(x + 0.5 + 0.4 * hash(i, 52)), X(top + 0.07))
    }
    // The field in front: darkening toward us, a verge of tufts along the lane, and the odd tuft further down.
    if (f.y1 > top + 0.2) {
      ctx.save()
      const fg = ctx.createLinearGradient(0, X(top + 0.16), 0, X(top + 2.6))
      fg.addColorStop(0, 'rgba(40, 36, 20, 0)')
      fg.addColorStop(1, `rgba(40, 36, 20, ${0.16 + 0.04 * au})`)
      ctx.fillStyle = fg
      ctx.fillRect(X(f.x0 - 1), X(top + 0.16), X(f.x1 - f.x0 + 2), X(Math.max(0, f.y1 - top + 1)))
      ctx.restore()
      // The wind across the field at our feet: the biggest, quickest sweeps.
      if (windy) {
        const near = () => ctx.rect(X(f.x0 - 1), X(top + 0.16), X(f.x1 - f.x0 + 2), X(Math.max(0, f.y1 - top + 1)))
        const fieldC = mixHex(grass, grassDark, 0.35)
        windStreaks(p, k, f, t, REACH.near, 0, rowsOf(top + 0.16, f.y1 + 0.1, 0.24), near, mixHex(fieldC, HILL.cloud, 0.8), mixHex(fieldC, HILL.bark, 0.85), au)
        tuftField(p, k, f, t, top + 0.25, top + 1.6, () => top + 0.16, {
          gapX: 0.28,
          gapY: 0.2,
          h0: 0.09,
          h1: 0.2,
          color: alpha(p, mixHex(fieldC, HILL.bark, 0.45), 0.85).toString(),
          pale: alpha(p, mixHex(fieldC, HILL.cloud, 0.42), 0.85).toString(),
          weight: Math.max(1, weight * 0.5),
          seed: 111,
        })
      }
      p.stroke(alpha(p, grassDark, 0.85))
      p.strokeWeight(Math.max(1, weight * 0.55))
      for (let i = Math.floor(f.x0 / 0.31) - 1; i * 0.31 < f.x1 + 1; i++) {
        if (hash(i, 58) < 0.3) continue
        const x = i * 0.31 + 0.14 * hash(i, 53)
        const y = top + 0.17
        const h = 0.04 + 0.09 * hash(i, 54) ** 2
        const lean = bend(x, h, i)
        p.line(X(x), X(y), X(x - 0.03 + lean), X(y - h))
        p.line(X(x + 0.025), X(y), X(x + 0.05 + lean), X(y - h * 0.75))
      }
      p.stroke(alpha(p, grassDark, 0.5))
      for (let i = Math.floor(f.x0 / 0.9) - 1; i * 0.9 < f.x1 + 1; i++) {
        for (let row = 0; row < 3; row++) {
          const x = i * 0.9 + 0.6 * hash(i, 55, row)
          const y = top + 0.55 + row * 0.6 + 0.25 * hash(i, 56, row)
          if (y > f.y1 + 0.2) continue
          const h = 0.05 + 0.05 * hash(i, 57, row)
          const lean = au * bend(x, h, i + row)
          p.line(X(x), X(y), X(x - 0.02 + lean), X(y - h))
          p.line(X(x + 0.03), X(y), X(x + 0.04 + lean), X(y - h * 0.8))
        }
      }
    }

    // Leaves carried across the field and the hill's face, behind everything near: the stone, the basket, the two of them.
    if (windy) {
      windLeaves(p, k, f, t, { n: 100, depth: 0, band: [0.2, LANE_Y + 1.3], size: 0.062, speed: 1.9, haze: 0, seed: 2, wide: 5.8, fade: lullFade(f, t) })
    }

    // The tree's trunk and limbs (the crown is drawn over the parts, so their clouds pass behind it).
    const tx = treeX(t)
    const ty0 = R
    const base = ridge(tx)
    if (tx + 3 > f.x0 && tx - 3 < f.x1) {
      p.push()
      p.translate(0, X(base))
      const bark = mixHex(HILL.bark, mixHex(HILL.bark, HILL.skyGrey, 0.25), au)
      p.stroke(INK)
      p.strokeWeight(weight)
      p.fill(bark)
      // The trunk: short and stout, flaring at its foot, forking into its limbs. Both shoulders of the hill slope, so
      // its foot follows the ground (from the foot's height) and neither side floats.
      const ground = (x: number) => ridge(x) - base + ty0
      p.beginShape()
      p.vertex(X(tx - 0.4), X(ground(tx - 0.4)))
      p.bezierVertex(X(tx - 0.2), X(ground(tx - 0.2) - 0.12), X(tx - 0.19), X(ty0 - 0.5), X(tx - 0.16), X(-1.12))
      p.vertex(X(tx + 0.17), X(-1.14))
      p.bezierVertex(X(tx + 0.2), X(ty0 - 0.5), X(tx + 0.21), X(ground(tx + 0.21) - 0.12), X(tx + 0.42), X(ground(tx + 0.42)))
      for (let x = tx + 0.32; x > tx - 0.4; x -= 0.1) p.vertex(X(x), X(ground(x)))
      p.endShape(p.CLOSE)
      for (const l of LIMBS) limb(p, k, tx, l)
      // Bare twigs show in autumn, through the thinning crown.
      if (au > 0.05) {
        p.noFill()
        p.stroke(alpha(p, bark, au))
        p.strokeWeight(Math.max(1, weight * 0.5))
        for (let i = 0; i < 12; i++) {
          const [x0, y0, , , x1, y1] = LIMBS[i % LIMBS.length]
          const u = 0.6 + 0.4 * hash(i, 61)
          const bx = tx + x0 + (x1 - x0) * u
          const by = y0 + (y1 - y0) * u
          const a2 = -Math.PI / 2 + (hash(i, 62) - 0.5) * 2.2
          // Their tips go with the crown as it heaves.
          const ty2 = by + Math.sin(a2) * 0.45
          p.line(X(bx), X(by), X(bx + Math.cos(a2) * 0.45 + crownSway(t, au) * (1.2 - ty2 * 0.4)), X(ty2))
        }
      }
      p.pop()
    }
    p.pop()
  },
  over: (p, _s, c) => {
    const { k, t, weight } = c
    const au = autumn(t)
    const f = frame(p, k)
    const tx = treeX(t)
    if (tx + 3.5 > f.x0 && tx - 3.5 < f.x1 && f.y0 < ridge(tx) - 1.3) {
      p.push()
      p.translate(0, ridge(tx) * k)
      // The crown: clumps from the back forward, each inked round its outside, shaded under, lit on top.
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const X = (v: number) => v * k
      // It sways in the breeze as one, harder in the gusts, and each clump stirs a little on its own; years later it
      // heaves in the autumn wind, each clump tossed on its own, the most moving thing in the frame.
      const breeze = gust(t, 21)
      const sway = crownSway(t, au)
      const toss = au * windStrength(t)
      const blown = windBlown(t)
      const body = mixHex(HILL.leaf, HILL.leafAutumn, au)
      const lit = mixHex(mixHex(HILL.leaf, HOME.yellow, 0.3), mixHex(HILL.leafAutumn, HOME.yellow, 0.4), au)
      const shade = mixHex(mixHex(HILL.leaf, INK, 0.3), mixHex(HILL.leafAutumn, HILL.bark, 0.45), au)
      CROWN.forEach((clump, j) => {
        // In autumn the crown thins a little.
        const s = 1 - 0.08 * au * (0.6 + 0.8 * hash(j, 91))
        const lean =
          sway * (1.2 - clump.y * 0.4) +
          (1 - au) * 0.028 * (0.5 + breeze) * wobble(t, 40 + j, 1.9) +
          toss * (0.04 * wobble(blown, 40 + j, 0.8) + 0.01 * Math.sin(t * 6.3 + j * 1.9))
        const lift = 0.016 * wobble(t, 60 + j, 2.4) + toss * 0.022 * wobble(blown, 60 + j, 0.9)
        const discs = clump.discs.map((d) => ({ x: tx + clump.x + (d.x - clump.x) * s + lean, y: clump.y + (d.y - clump.y) * s + lift, r: d.r * s }))
        p.stroke(alpha(p, INK, 0.9))
        p.strokeWeight(weight * 1.6)
        p.fill(shade)
        for (const d of discs) p.circle(X(d.x), X(d.y), X(2 * d.r))
        p.noStroke()
        for (const d of discs) p.circle(X(d.x), X(d.y), X(2 * d.r))
        ctx.save()
        ctx.beginPath()
        for (const d of discs) {
          ctx.moveTo(X(d.x + d.r), X(d.y))
          ctx.arc(X(d.x), X(d.y), X(d.r), 0, Math.PI * 2)
        }
        ctx.clip()
        p.fill(body)
        for (const d of discs) p.circle(X(d.x - 0.03), X(d.y - 0.13), X(2 * d.r))
        p.fill(alpha(p, lit, 0.85))
        for (const d of discs) p.circle(X(d.x - 0.08), X(d.y - 0.3), X(2 * d.r * 0.78))
        ctx.restore()
      })
      p.pop()
    }
    p.push()
    fallingLeaves(p, k, t, au, f)
    if (au > 0.5) fence(p, k, f, au, weight)
    nearGrass(p, k, f, t, au)
    p.pop()
  },
})
