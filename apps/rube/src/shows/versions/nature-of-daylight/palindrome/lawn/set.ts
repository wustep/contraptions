import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { R } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { frame, hash } from '../kit'
import { HOUSE, SHELL } from '../worlds'
import { BRUSHES, hannahAt, louiseAt, PIVOT, SEAT_T, SEAT_W, seatAt, surface } from './swing'

/**
 * The lawn, drawn from show time: the sky and the light, the far shore and the lake with its fog, the
 * lamps of the glass house up the bank at dusk, the lawn, the great tree (its year going round), and the swing hanging
 * from its long limb. Everything here is in the house's world cells, straight onto the canvas.
 */

type Ctx = CanvasRenderingContext2D
type Frame = ReturnType<typeof frame>
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (t: number, a: number, b: number) => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ the year and the light */

/**
 * Where the year is at show time `t`: 0 summer, 1 autumn, 2 winter, 3 spring, 4 summer again. The childhood takes the
 * year round once; the vision is a summer evening.
 */
const YEAR: [number, number][] = [
  [22, 0],
  [34.5, 0.05],
  [39.5, 1],
  [44, 1.2],
  [48.5, 2],
  [52.5, 2.2],
  [56.5, 3],
  [61, 3.2],
  [65.5, 4],
]
function yearAt(t: number): number {
  if (t > 150) return 4
  if (t <= YEAR[0][0]) return YEAR[0][1]
  for (let i = 1; i < YEAR.length; i++) {
    if (t <= YEAR[i][0]) {
      const [t0, a] = YEAR[i - 1]
      const [t1, b] = YEAR[i]
      const u = (t - t0) / (t1 - t0)
      return a + (b - a) * u * u * (3 - 2 * u)
    }
  }
  return 4
}
/** How much of each season: summer, autumn, winter, spring (they sum to 1). */
function seasons(y: number): [number, number, number, number] {
  const w = (c: number) => Math.max(0, 1 - Math.abs(y - c))
  return [w(0) + w(4), w(1), w(2), w(3)]
}
const blend = (cs: string[], ws: number[]): string => {
  let out = cs[0]
  let acc = ws[0]
  for (let i = 1; i < cs.length; i++) {
    if (ws[i] <= 0) continue
    acc += ws[i]
    out = mix(out, cs[i], ws[i] / acc)
  }
  return out
}

interface Look {
  skyTop: string
  skyLow: string
  far: string
  pines: string
  pinesBack: string
  lakeFar: string
  lakeNear: string
  fog: number
  grass: string
  grassDark: string
  leaf: string
  leafDark: string
  leafLight: string
  /** How full the leaves are: 1 in summer, none in winter. */
  density: number
  snow: number
  bark: string
  /** The evening: 0 day, 1 dusk (the house's glass lit). */
  dusk: number
  /** The vision's warmth. */
  warm: number
}

function lookAt(t: number): Look {
  const vision = t > 150
  const y = yearAt(t)
  const [su, au, wi, sp] = seasons(y)
  const dusk = vision ? 0 : smooth(t, 63.5, 71.9)
  const warm = vision ? 1 : 0
  const w = [su, au, wi, sp]
  let skyTop = blend([mix(HOUSE.day, HOUSE.lake, 0.35), mix(HOUSE.day, HOUSE.dusk, 0.5), mix(HOUSE.fog, HOUSE.hills, 0.4), mix(HOUSE.day, HOUSE.lake, 0.22)], w)
  let skyLow = blend([mix(HOUSE.day, HOUSE.glass, 0.6), mix(HOUSE.day, HOUSE.lamp, 0.22), HOUSE.fog, mix(HOUSE.glass, HOUSE.day, 0.3)], w)
  skyTop = mix(skyTop, mix(HOUSE.lakeDeep, HOUSE.night, 0.4), dusk * 0.9)
  skyLow = mix(skyLow, mix(HOUSE.dusk, HOUSE.hills, 0.35), dusk * 0.9)
  if (vision) {
    skyTop = mix(HOUSE.dusk, HOUSE.lake, 0.3)
    skyLow = mix(HOUSE.lamp, HOUSE.dusk, 0.35)
  }
  let grass = blend([HOUSE.grass, mix(HOUSE.grass, HOUSE.floor, 0.45), mix(HOUSE.grass, HOUSE.fog, 0.72), mix(HOUSE.grass, SHELL.canary, 0.1)], w)
  grass = mix(grass, mix(HOUSE.grassDark, HOUSE.night, 0.3), dusk * 0.7)
  if (vision) grass = mix(HOUSE.grass, HOUSE.lamp, 0.2)
  const grassDark = mix(grass, HOUSE.grassDark, 0.55)
  let leaf = blend([mix(HOUSE.grassDark, HOUSE.pines, 0.35), mix(SHELL.canary, HOUSE.wood, 0.5), mix(HOUSE.floorDark, HOUSE.hills, 0.4), mix(HOUSE.grass, SHELL.canary, 0.16)], w)
  let leafDark = blend([mix(HOUSE.pines, HOUSE.grassDark, 0.25), mix(HOUSE.wood, HOUSE.floorDark, 0.35), HOUSE.woodDark, mix(HOUSE.grassDark, HOUSE.grass, 0.35)], w)
  let leafLight = blend([mix(HOUSE.grass, HOUSE.lamp, 0.12), mix(SHELL.canary, HOUSE.lamp, 0.45), mix(HOUSE.fog, HOUSE.hills, 0.2), mix(HOUSE.grass, HOUSE.linen, 0.42)], w)
  leaf = mix(leaf, mix(HOUSE.pines, HOUSE.night, 0.3), dusk * 0.5)
  leafDark = mix(leafDark, HOUSE.night, dusk * 0.4)
  leafLight = mix(leafLight, mix(HOUSE.dusk, HOUSE.grassDark, 0.5), dusk * 0.55)
  if (vision) {
    leaf = mix(HOUSE.grassDark, HOUSE.pines, 0.25)
    leafDark = mix(HOUSE.pines, HOUSE.woodDark, 0.3)
    leafLight = mix(HOUSE.lamp, HOUSE.grass, 0.5)
  }
  // Leaves: full in summer, turning and thinning in autumn, none in winter, coming back in spring.
  const density = su * 1 + au * 0.7 + wi * 0 + sp * 0.62
  return {
    skyTop,
    skyLow,
    far: mix(mix(HOUSE.hills, skyLow, 0.4), mix(HOUSE.hills, HOUSE.lakeDeep, 0.6), dusk * 0.7),
    pinesBack: mix(mix(HOUSE.pinesFar, skyLow, 0.35), mix(HOUSE.pines, HOUSE.night, 0.3), dusk * 0.6),
    pines: mix(mix(HOUSE.pinesFar, HOUSE.pines, 0.35), mix(HOUSE.pines, HOUSE.dusk, 0.3), dusk * 0.6),
    lakeFar: mix(mix(HOUSE.lakeLight, skyLow, 0.4), mix(HOUSE.lake, HOUSE.dusk, 0.35), dusk * 0.8),
    lakeNear: mix(mix(HOUSE.lake, HOUSE.lakeDeep, 0.3), mix(HOUSE.lakeDeep, HOUSE.night, 0.22), dusk * 0.8),
    fog: 0.55 + 0.25 * wi - 0.2 * dusk,
    grass,
    grassDark,
    leaf,
    leafDark,
    leafLight,
    density,
    snow: wi,
    bark: mix(mix(HOUSE.woodDark, HOUSE.pines, 0.35), HOUSE.night, dusk * 0.35),
    dusk,
    warm,
  }
}

/* ------------------------------------------------------------------ the tree */

/** A branch: a smooth run through points, from its base width to its tip width. */
interface Branch {
  pts: Pt[]
  w0: number
  w1: number
}
const TRUNK_X = 55.3
/** The swing's limb: long and level from the trunk over the swing, its end sweeping down to where she reaches. */
const LIMB: Branch = {
  pts: [
    [55.55, -5.0],
    [57.2, -5.42],
    [59.0, -5.42],
    [60.5, -5.2],
    [62.0, -4.98],
    [63.05, -4.5],
    [63.7, -3.6],
    [63.92, -2.55],
  ],
  w0: 0.44,
  w1: 0.09,
}
const BRANCHES: Branch[] = [
  LIMB,
  { pts: [[55.45, -5.2], [54.6, -6.5], [53.3, -7.5], [51.9, -8.0]], w0: 0.4, w1: 0.08 },
  { pts: [[55.6, -5.3], [55.95, -7.0], [56.35, -8.6], [56.1, -9.7]], w0: 0.42, w1: 0.08 },
  { pts: [[55.8, -5.7], [57.3, -6.9], [59.0, -7.85], [60.8, -8.35]], w0: 0.3, w1: 0.07 },
  { pts: [[56.0, -6.3], [58.4, -6.6], [61.0, -6.85], [62.8, -6.55], [64.1, -5.9]], w0: 0.22, w1: 0.06 },
  { pts: [[55.15, -4.5], [53.9, -4.95], [52.6, -5.05]], w0: 0.26, w1: 0.06 },
  { pts: [[54.6, -6.5], [53.9, -8.2], [53.6, -9.2]], w0: 0.16, w1: 0.05 },
  { pts: [[57.3, -6.9], [57.9, -8.6], [58.3, -9.6]], w0: 0.14, w1: 0.05 },
  { pts: [[59.0, -5.42], [59.7, -6.2]], w0: 0.1, w1: 0.04 },
  { pts: [[62.0, -4.98], [62.9, -5.6], [63.6, -5.7]], w0: 0.1, w1: 0.04 },
]
/** Twigs off the branches' outer parts, for the bare boughs of winter. */
const TWIGS: Branch[] = (() => {
  const out: Branch[] = []
  BRANCHES.forEach((b, bi) => {
    for (let i = 1; i < b.pts.length; i++) {
      const [x0, y0] = b.pts[i - 1]
      const [x1, y1] = b.pts[i]
      const up = bi === 0 && i >= 5 ? 0.6 : 1
      for (let j = 0; j < 2; j++) {
        const u = 0.3 + 0.5 * hash(bi, i * 7 + j, 3)
        const x = x0 + (x1 - x0) * u
        const y = y0 + (y1 - y0) * u
        const a = -Math.PI / 2 + (j ? 0.55 : -0.55) + (hash(bi, i, j + 11) - 0.5) * 0.8
        const l = (0.4 + 0.5 * hash(bi, i + j, 5)) * up
        out.push({ pts: [[x, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + Math.cos(a - (j ? -0.25 : 0.25)) * l, y + Math.sin(a - (j ? -0.25 : 0.25)) * l]], w0: 0.045, w1: 0.016 })
      }
    }
  })
  return out
})()

/** A clump of leaves: a few round lobes, centre, size, seed; drawn only while the tree is at least `need` full. */
interface Clump {
  x: number
  y: number
  r: number
  lobes: [number, number, number][]
  need: number
}
const CLUMPS: Clump[] = (() => {
  const spots: [number, number, number][] = [
    // The crown.
    [52.2, -8.3, 1.3], [53.8, -9.2, 1.4], [55.6, -9.9, 1.5], [57.4, -9.6, 1.4], [59.1, -8.9, 1.3], [60.8, -8.5, 1.1],
    [54.5, -7.6, 1.4], [56.4, -8.1, 1.6], [58.3, -7.6, 1.4], [60.1, -7.4, 1.2], [62.0, -7.0, 1.1], [63.6, -6.3, 0.95],
    [52.9, -6.6, 1.1], [51.6, -7.2, 0.95], [53.4, -5.5, 0.9], [52.3, -5.4, 0.75],
    // Along the swing's limb and over its lowered end.
    [61.7, -5.85, 0.8], [62.95, -5.45, 0.75], [63.95, -4.7, 0.62], [57.9, -6.25, 0.85], [59.7, -6.45, 0.85], [56.6, -6.0, 0.7],
    // Low on the limb itself, where the frame sees them.
    [57.3, -5.55, 0.5], [58.7, -5.6, 0.45], [61.9, -5.3, 0.5], [62.95, -4.95, 0.46], [63.55, -4.25, 0.4]
  ]
  return spots.map(([x, y, r], i) => {
    const lobes: [number, number, number][] = [[0, -0.1 * r, 0.5 * r], [-0.3 * r, 0.05 * r, 0.42 * r], [0.3 * r, 0.05 * r, 0.42 * r]]
    for (let j = 0; j < 11; j++) {
      const a = (j / 11) * Math.PI * 2 + hash(i, j, 41) * 0.5
      const rr = r * (0.2 + 0.14 * hash(i, j, 42))
      lobes.push([Math.cos(a) * r * (0.78 - rr / r * 0.6), Math.sin(a) * r * (0.5 - rr / r * 0.4), rr])
    }
    return { x, y, r, lobes, need: 0.12 + 0.82 * hash(i, 9, 1) }
  })
})()

/** The hanging leafy twigs at the limb's end, which she reaches at the front of her arc: rest positions. */
interface Spray {
  base: Pt
  tip: Pt
  seed: number
}
const SPRAYS: Spray[] = [
  { base: [63.45, -4.05], tip: [62.62, -0.88], seed: 1 },
  { base: [63.62, -3.7], tip: [62.95, -1.0], seed: 2 },
  { base: [63.75, -3.3], tip: [63.28, -1.22], seed: 3 },
  { base: [63.86, -2.9], tip: [63.62, -1.05], seed: 4 },
  { base: [63.2, -4.4], tip: [62.72, -1.55], seed: 5 },
  { base: [63.92, -2.6], tip: [64.02, -1.35], seed: 6 },
  { base: [62.9, -4.65], tip: [62.5, -2.2], seed: 7 },
]

const hannahSpot = (t: number): Pt => {
  const h = hannahAt(t)
  return h ? [h.x, h.y] : [0, 0]
}

/**
 * The twigs' tips as springs, pushed aside wherever Hannah actually goes (her reach at the front of an arc, her leap
 * through them), then ringing back: worked out once for each leg at 120 steps a second, then read.
 */
const SIM_DT = 1 / 120
interface Sim {
  t0: number
  n: number
  u: Float32Array
}
const sims: Record<string, Sim> = {}
function simFor(t0: number, t1: number): Sim {
  const key = `${t0}`
  if (sims[key]) return sims[key]
  const n = Math.ceil((t1 - t0) / SIM_DT) + 2
  const m = SPRAYS.length
  const u = new Float32Array(n * m * 2)
  const pos = SPRAYS.map(() => [0, 0])
  const vel = SPRAYS.map(() => [0, 0])
  const w = 2 * Math.PI * 1.05
  const z = 0.16
  for (let i = 0; i < n; i++) {
    const t = t0 + i * SIM_DT
    const h = hannahAt(t)
    for (let j = 0; j < m; j++) {
      const q = pos[j]
      const v = vel[j]
      v[0] += (-w * w * q[0] - 2 * z * w * v[0]) * SIM_DT
      v[1] += (-w * w * q[1] - 2 * z * w * v[1]) * SIM_DT
      q[0] += v[0] * SIM_DT
      q[1] += v[1] * SIM_DT
      if (h) {
        // Her reach: her own size and the leaves' about the twig. The twig is felt at its tip and two thirds down
        // (a push there moves the tip half again as far).
        const rho = R * h.scale + 0.14
        const sp = SPRAYS[j]
        for (const f of [1, 0.66]) {
          const px = sp.base[0] + (sp.tip[0] - sp.base[0]) * f + q[0] * f
          const py = sp.base[1] + (sp.tip[1] - sp.base[1]) * f + q[1] * f
          const dx = px - h.x
          const dy = py - h.y
          const d = Math.hypot(dx, dy)
          if (d < rho && d > 1e-6) {
            const mx = ((dx / d) * rho - dx) / f
            const my = ((dy / d) * rho - dy) / f
            q[0] += mx
            q[1] += my
            v[0] += (mx / SIM_DT) * 0.35
            v[1] += (my / SIM_DT) * 0.35
          }
        }
      }
      u[(i * m + j) * 2] = q[0]
      u[(i * m + j) * 2 + 1] = q[1]
    }
  }
  sims[key] = { t0, n, u }
  return sims[key]
}
/** How far twig `j`'s tip is pushed at `t`. */
function brushAt(t: number, j: number): Pt {
  const sim = t > 150 ? simFor(250.12, 257.7) : t >= 22.1 && t <= 72 ? simFor(22.111, 72) : null
  if (!sim) return [0, 0]
  const f = (t - sim.t0) / SIM_DT
  const i = Math.max(0, Math.min(sim.n - 2, Math.floor(f)))
  const s = Math.max(0, Math.min(1, f - i))
  const m = SPRAYS.length
  const a = (i * m + j) * 2
  const b = ((i + 1) * m + j) * 2
  return [sim.u[a] + (sim.u[b] - sim.u[a]) * s, sim.u[a + 1] + (sim.u[b + 1] - sim.u[a + 1]) * s]
}
/** Whether she is touching any twig at `t` (not drawn: what a probe checks the leaves' strikes against). */
export function touchingLeaves(t: number): boolean {
  const h = hannahAt(t)
  if (!h) return false
  return SPRAYS.some((s, j) => {
    const [dx, dy] = brushAt(t, j)
    return [1, 0.66].some((f) => Math.hypot(s.base[0] + (s.tip[0] - s.base[0] + dx) * f - h.x, s.base[1] + (s.tip[1] - s.base[1] + dy) * f - h.y) < R * h.scale + 0.145)
  })
}

/* ------------------------------------------------------------------ what falls */

/**
 * What the brushes knock loose, by the season: two or three leaves in autumn, spinning down to the grass (and lying
 * there till the snow), a little snow off the bare twigs in winter. Sparse: this is a year going by, not weather.
 */
interface Fall {
  t0: number
  x: number
  y: number
  kind: 'leaf' | 'snow'
  seed: number
}
const FALLS: Fall[] = (() => {
  const out: Fall[] = []
  for (const b of BRUSHES) {
    if (b.t > 150) continue
    const y = yearAt(b.t)
    const [, au, wi] = seasons(y)
    const h = hannahSpot(b.t)
    if (au > 0.4) for (let i = 0; i < 3; i++) out.push({ t0: b.t + 0.05 + i * 0.22, x: h[0] + 0.1 + 0.35 * hash(i, b.t * 100, 1), y: h[1] - 0.2 - 0.6 * hash(i, b.t * 100, 2), kind: 'leaf', seed: i + b.t })
    if (wi > 0.4) for (let i = 0; i < 9; i++) out.push({ t0: b.t + 0.02 * i, x: h[0] + 0.3 * hash(i, b.t * 100, 3), y: h[1] - 0.3 - 1.2 * hash(i, b.t * 100, 4), kind: 'snow', seed: i + b.t })
  }
  // A few leaves let go of the crown by themselves through the autumn.
  for (let i = 0; i < 8; i++) out.push({ t0: 37.8 + i * 0.95 + 0.4 * hash(i, 5, 5), x: 56.5 + 7 * hash(i, 6, 6), y: -5.2 - 0.8 * hash(i, 7, 7), kind: 'leaf', seed: 100 + i })
  return out
})()

/** Where a falling thing is `s` seconds after it let go, and whether it has come to rest. */
function fallAt(f: Fall, s: number): { x: number; y: number; a: number; down: boolean } {
  if (f.kind === 'snow') {
    const y = f.y + 0.9 * s + 0.6 * s * s
    return { x: f.x + 0.1 * Math.sin(s * 3 + f.seed), y, a: 0, down: y >= surface(f.x) }
  }
  // A leaf: slow, rocking side to side as it comes down.
  const v = 0.75
  const ground = surface(f.x + 0.3 * Math.sin(f.seed)) - 0.02
  const T = Math.max(0.1, (ground - f.y) / v)
  const u = Math.min(s, T)
  const x = f.x + 0.35 * Math.sin(u * 2.4 + f.seed * 3) + 0.12 * u
  return { x, y: f.y + v * u, a: Math.sin(u * 2.4 + f.seed * 3) * 1.1, down: s >= T }
}

/* ------------------------------------------------------------------ drawing */

function branchAt(pts: Pt[], u: number): Pt {
  const n = pts.length
  const f = u * (n - 1)
  const i = Math.min(n - 2, Math.floor(f))
  const s = f - i
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(n - 1, i + 2)]
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s)
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]
}

/** A tapering bough, filled as one shape along a Catmull-Rom through its points. */
function fillBranch(ctx: Ctx, k: number, b: Branch, color: string): void {
  const steps = Math.max(8, b.pts.length * 7)
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const p = branchAt(b.pts, u)
    const q = branchAt(b.pts, Math.min(1, u + 0.01))
    const r0 = branchAt(b.pts, Math.max(0, u - 0.01))
    const tx = q[0] - r0[0]
    const ty = q[1] - r0[1]
    const l = Math.hypot(tx, ty) || 1
    const w = (b.w0 + (b.w1 - b.w0) * u) / 2
    left.push([p[0] - (ty / l) * w, p[1] + (tx / l) * w])
    right.push([p[0] + (ty / l) * w, p[1] - (tx / l) * w])
  }
  ctx.fillStyle = color
  ctx.beginPath()
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0] * k, right[i][1] * k)
  ctx.closePath()
  ctx.fill()
}

function lobesPath(ctx: Ctx, k: number, c: Clump, dx: number, dy: number, s: number): void {
  for (const [ox, oy, r] of c.lobes) {
    ctx.moveTo((c.x + ox + dx + r * s) * k, (c.y + oy + dy) * k)
    ctx.arc((c.x + ox + dx) * k, (c.y + oy + dy) * k, r * s * k, 0, Math.PI * 2)
  }
}

/** A leaf, as a small pointed oval turned `a`, `s` cells long. */
function leafShape(ctx: Ctx, k: number, x: number, y: number, s: number, a: number): void {
  const c = Math.cos(a)
  const sn = Math.sin(a)
  const L = s * k
  const W = s * 0.42 * k
  const X = x * k
  const Y = y * k
  ctx.beginPath()
  ctx.moveTo(X - c * L * 0.5, Y - sn * L * 0.5)
  ctx.quadraticCurveTo(X - sn * W, Y + c * W, X + c * L * 0.5, Y + sn * L * 0.5)
  ctx.quadraticCurveTo(X + sn * W, Y - c * W, X - c * L * 0.5, Y - sn * L * 0.5)
  ctx.fill()
}

function drawSky(ctx: Ctx, k: number, f: Frame, L: Look, t: number): void {
  const { shore, dx, s } = farView(f)
  const top = f.y0 - 0.5
  const low = shore - 0.3 * s
  const g = ctx.createLinearGradient(0, top * k, 0, low * k)
  g.addColorStop(0, L.skyTop)
  g.addColorStop(0.65, mix(L.skyTop, L.skyLow, 0.7))
  g.addColorStop(1, L.skyLow)
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  // Long soft banks of cloud, far off, drifting: lit a little on top, at dusk warm underneath.
  const h = low - top
  for (let i = 0; i < 4; i++) {
    const y = top + h * (0.2 + 0.2 * i + 0.05 * hash(i, 8, 1))
    const len = (3 + 2.5 * hash(i, 8, 2)) * s
    const drift = t * (0.04 + 0.02 * hash(i, 8, 3))
    for (let j = -2; j <= 2; j++) {
      const cx = dx * 1.1 + ((((j * 9.1 + drift + i * 3.7 + hash(i, 8, 4) * 6) % 45) + 45) % 45) - 22 + SEAM_CAM[0]
      if (cx < f.x0 - len || cx > f.x1 + len) continue
      ctx.save()
      ctx.translate(cx * k, y * k)
      ctx.scale(len / 0.2, 1)
      const c = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.2 * k)
      const col = L.dusk > 0 ? mix(HOUSE.fog, mix(HOUSE.lamp, HOUSE.dusk, 0.3), L.dusk) : L.warm > 0 ? mix(HOUSE.fog, HOUSE.lamp, 0.4) : HOUSE.fog
      c.addColorStop(0, rgba(col, (0.34 - 0.04 * i) * (1 - 0.45 * L.dusk)))
      c.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = c
      ctx.fillRect(-0.2 * k, -0.2 * k, 0.4 * k, 0.4 * k)
      ctx.restore()
    }
  }
  if (L.warm > 0) {
    // The vision's evening: the low sun behind the far shore on the right, a wide warm band, no disc.
    ctx.save()
    ctx.translate((f.cx + 5) * k, low * k)
    ctx.scale(3, 1)
    const w = ctx.createRadialGradient(0, 0, 0, 0, 0, 3.5 * s * k)
    w.addColorStop(0, rgba(HOUSE.lamp, 0.55 * L.warm))
    w.addColorStop(0.5, rgba(HOUSE.lamp, 0.18 * L.warm))
    w.addColorStop(1, rgba(HOUSE.lamp, 0))
    ctx.fillStyle = w
    ctx.fillRect(-3.5 * s * k, -3.5 * s * k, 7 * s * k, 3.6 * s * k)
    ctx.restore()
  }
  if (L.dusk > 0) {
    // The afterglow over the far shore.
    const a = ctx.createLinearGradient(0, (low - 1.2 * s) * k, 0, (low + 0.3) * k)
    a.addColorStop(0, rgba(mix(HOUSE.lamp, HOUSE.dusk, 0.3), 0))
    a.addColorStop(1, rgba(mix(HOUSE.lamp, HOUSE.dusk, 0.3), 0.5 * L.dusk))
    ctx.fillStyle = a
    ctx.fillRect((f.x0 - 1) * k, (low - 1.2 * s) * k, (f.x1 - f.x0 + 2) * k, (1.5 * s + 0.3) * k)
  }
}

/**
 * The far shore: low hills, two lines of pines, and the lake under them with fog lying on it. It is far: it slides with the camera and shrinks less than the lawn when the camera draws back, and at the
 * cuts into and out of the lake house (the seam camera) it is where the room's window has it, 0.6 over her: the same
 * far shore behind her on both sides of the cut.
 */
const SEAM_CAM: Pt = [60.55, -0.95]
const SHORE_Y = -0.6
function farView(f: Frame): { shore: number; dx: number; s: number } {
  const dy = f.cy - SEAM_CAM[1]
  return { shore: SHORE_Y + dy * 0.6, dx: (f.cx - SEAM_CAM[0]) * 0.72, s: Math.pow((f.y1 - f.y0) / 4.6, 0.55) }
}
function drawFarShore(ctx: Ctx, k: number, f: Frame, L: Look, t: number): void {
  const x0 = Math.floor(f.x0) - 2
  const x1 = Math.ceil(f.x1) + 2
  const { shore, dx, s } = farView(f)
  // Hills: two long low swells.
  ctx.fillStyle = L.far
  ctx.beginPath()
  ctx.moveTo(x0 * k, (shore + 0.05) * k)
  for (let x = x0; x <= x1; x += 0.2) {
    const v = (x - dx) / s
    const h = (0.3 + 0.13 * Math.sin(v * 0.42 + 0.7) + 0.07 * Math.sin(v * 1.13 + 2.1) + 0.03 * Math.sin(v * 2.9)) * s
    ctx.lineTo(x * k, (shore - h) * k)
  }
  ctx.lineTo(x1 * k, (shore + 0.05) * k)
  ctx.closePath()
  ctx.fill()
  // Haze over the hills' feet.
  const haze = ctx.createLinearGradient(0, (shore - 0.35 * s) * k, 0, shore * k)
  haze.addColorStop(0, rgba(HOUSE.fog, 0))
  haze.addColorStop(1, rgba(HOUSE.fog, 0.5 * L.fog))
  ctx.fillStyle = haze
  ctx.fillRect(x0 * k, (shore - 0.35 * s) * k, (x1 - x0) * k, 0.35 * s * k)
  // Pines: narrow spires in stands and gaps, a far row and a nearer, darker one.
  const pines = (color: string, base: number, hMin: number, hMax: number, seed: number) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x0 * k, (base + 0.02) * k)
    let v = (x0 - dx) / s
    const v1 = (x1 - dx) / s
    while (v <= v1) {
      const n = Math.floor(v * 30)
      const clump = 0.5 + 0.5 * Math.sin(v * 0.9 + seed) * Math.sin(v * 0.37 + seed * 2) + 0.25 * Math.sin(v * 2.3 + seed * 3)
      const h = (hMin + (hMax - hMin) * hash(n, seed, 2) ** 1.4) * (0.35 + 0.8 * Math.max(0, Math.min(1.2, clump))) * s
      const w = h * (0.26 + 0.1 * hash(n, seed, 3))
      const x = v * s + dx
      ctx.lineTo((x - w * 0.5) * k, (base - 0.01) * k)
      ctx.lineTo((x - w * 0.18) * k, (base - h * 0.45) * k)
      ctx.lineTo((x - w * 0.3) * k, (base - h * 0.45) * k)
      ctx.lineTo(x * k, (base - h) * k)
      ctx.lineTo((x + w * 0.3) * k, (base - h * 0.45) * k)
      ctx.lineTo((x + w * 0.18) * k, (base - h * 0.45) * k)
      ctx.lineTo((x + w * 0.5) * k, (base - 0.01) * k)
      v += 0.04 * (0.6 + 0.8 * hash(n, seed, 5))
    }
    ctx.lineTo(x1 * k, (base + 0.02) * k)
    ctx.closePath()
    ctx.fill()
  }
  pines(L.pinesBack, shore + 0.01, 0.1, 0.26, 11)
  pines(L.pines, shore + 0.04, 0.16, 0.44, 23)
  // The lake, from the far shore to the lawn.
  const g = ctx.createLinearGradient(0, shore * k, 0, 0.3 * k)
  g.addColorStop(0, L.lakeFar)
  g.addColorStop(0.5, mix(L.lakeFar, L.lakeNear, 0.6))
  g.addColorStop(1, L.lakeNear)
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, shore * k, (x1 - x0) * k, (Math.max(3, f.y1 + 2) - shore) * k)
  // The far shore's dark lying in the still water under it: soft, no shapes.
  const refl = ctx.createLinearGradient(0, shore * k, 0, (shore + 0.18 * s) * k)
  refl.addColorStop(0, rgba(L.pines, 0.4))
  refl.addColorStop(1, rgba(L.pines, 0))
  ctx.fillStyle = refl
  ctx.fillRect(x0 * k, shore * k, (x1 - x0) * k, 0.18 * s * k)
  // A long bright calm on the water where it holds the sky; at dusk the afterglow in it.
  const calm = ctx.createLinearGradient(0, (shore + 0.12 * s) * k, 0, (shore + 0.3 * s) * k)
  const cc = L.dusk > 0 ? mix(L.skyLow, mix(HOUSE.lamp, HOUSE.glass, 0.35), L.dusk) : L.skyLow
  calm.addColorStop(0, rgba(cc, 0))
  calm.addColorStop(0.5, rgba(cc, 0.3 + 0.35 * L.dusk + 0.25 * L.warm))
  calm.addColorStop(1, rgba(cc, 0))
  ctx.fillStyle = calm
  ctx.fillRect(x0 * k, (shore + 0.12 * s) * k, (x1 - x0) * k, 0.18 * s * k)
  // Fog lying on the water: long soft banks drifting very slowly, and a mist over the far water and shore.
  for (let i = 0; i < 6; i++) {
    const y = shore + (0.03 + 0.09 * i) * s
    const len = (2.2 + 1.8 * hash(i, 3, 1)) * s
    const drift = t * (0.03 + 0.015 * hash(i, 3, 2))
    for (let j = -3; j <= 3; j++) {
      const cx = dx + ((((j * 5.3 + drift + i * 1.9 + hash(i, 3, 3) * 5) % 37) + 37) % 37) - 18 + SEAM_CAM[0]
      if (cx < x0 - len || cx > x1 + len) continue
      ctx.save()
      ctx.translate(cx * k, y * k)
      ctx.scale(len / 0.1, 1)
      const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.1 * k)
      fg.addColorStop(0, rgba(HOUSE.fog, (0.4 - 0.05 * i) * L.fog))
      fg.addColorStop(1, rgba(HOUSE.fog, 0))
      ctx.fillStyle = fg
      ctx.fillRect(-0.1 * k, -0.1 * k, 0.2 * k, 0.2 * k)
      ctx.restore()
    }
  }
  const mist = ctx.createLinearGradient(0, (shore - 0.4 * s) * k, 0, (shore + 0.45 * s) * k)
  mist.addColorStop(0, rgba(HOUSE.fog, 0))
  mist.addColorStop(0.5, rgba(HOUSE.fog, 0.3 * L.fog))
  mist.addColorStop(1, rgba(HOUSE.fog, 0))
  ctx.fillStyle = mist
  ctx.fillRect(x0 * k, (shore - 0.4 * s) * k, (x1 - x0) * k, 0.85 * s * k)
}

/**
 * The glass house is up the bank behind, out of the picture: at dusk its lamps come on, and their light lies warm
 * across the top of the bank from the left.
 */
function drawHouseLight(ctx: Ctx, k: number, f: Frame, L: Look): void {
  const lit = Math.max(L.dusk, L.warm * 0.4)
  if (lit < 0.01) return
  const g = ctx.createLinearGradient(50 * k, 0, 59 * k, 0)
  g.addColorStop(0, rgba(HOUSE.lamp, 0.34 * lit))
  g.addColorStop(1, rgba(HOUSE.lamp, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((f.x0 - 1) * k, (f.y1 + 1) * k)
  for (let x = f.x0 - 1; x <= 59.6; x += 0.1) ctx.lineTo(x * k, surface(x) * k)
  ctx.lineTo(59.6 * k, (f.y1 + 1) * k)
  ctx.closePath()
  ctx.fill()
}

/** The lawn: the flat by the swing, running on toward the water, and the bank up to the terrace behind. */
function drawLawn(ctx: Ctx, k: number, f: Frame, L: Look): void {
  const x0 = Math.min(44, Math.floor(f.x0) - 2)
  const x1 = Math.max(76, Math.ceil(f.x1) + 2)
  const bottom = Math.max(4, f.y1 + 2)
  ctx.beginPath()
  ctx.moveTo(x0 * k, bottom * k)
  for (let x = x0; x <= 59.6; x += 0.08) ctx.lineTo(x * k, surface(x) * k)
  ctx.lineTo(x1 * k, R * k)
  ctx.lineTo(x1 * k, bottom * k)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, -1.8 * k, 0, 1.4 * k)
  g.addColorStop(0, L.grass)
  g.addColorStop(1, L.grassDark)
  ctx.fillStyle = g
  ctx.fill()
  // The turf's lit edge: a soft band along its top.
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = rgba(HOUSE.linen, 0.12 + 0.2 * L.snow)
  ctx.lineWidth = 0.08 * k
  ctx.beginPath()
  for (let x = x0; x <= 59.6; x += 0.1) (x === x0 ? ctx.moveTo(x * k, surface(x) * k) : ctx.lineTo(x * k, surface(x) * k))
  ctx.lineTo(x1 * k, R * k)
  ctx.stroke()
  ctx.restore()
  // Tufts of grass along the top of the turf: sparse.
  ctx.strokeStyle = rgba(L.grassDark, 0.5)
  ctx.lineWidth = Math.max(0.6, 0.022 * k)
  ctx.beginPath()
  for (let i = 0; i < 120; i++) {
    const x = 48 + i * 0.21 + 0.15 * hash(i, 1, 2)
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const y = surface(x)
    const h = 0.05 + 0.06 * hash(i, 2, 2)
    ctx.moveTo(x * k, y * k)
    ctx.lineTo((x + 0.03) * k, (y - h) * k)
    ctx.moveTo((x + 0.05) * k, y * k)
    ctx.lineTo((x + 0.1) * k, (y - h * 0.7) * k)
  }
  ctx.stroke()
}

function drawCanopy(ctx: Ctx, k: number, L: Look, wind: number, back: boolean): void {
  const d = L.density
  if (d < 0.01) return
  const on = CLUMPS.filter((c) => c.need <= d + 1e-3)
  if (back) {
    // The shade under the crown.
    ctx.fillStyle = L.leafDark
    ctx.beginPath()
    for (const c of on) lobesPath(ctx, k, c, c.r * 0.12 + wind * 0.5, c.r * 0.12, 1.02)
    ctx.fill()
    return
  }
  ctx.fillStyle = L.leaf
  ctx.beginPath()
  for (const c of on) lobesPath(ctx, k, c, wind, 0, 0.9)
  ctx.fill()
  // The light on each clump's upper side: the clump lit, less itself moved down and along.
  for (const c of on) {
    ctx.save()
    ctx.beginPath()
    lobesPath(ctx, k, c, wind, 0, 0.9)
    ctx.clip()
    ctx.fillStyle = L.leafLight
    ctx.fillRect((c.x - c.r * 2) * k, (c.y - c.r * 2) * k, c.r * 4 * k, c.r * 4 * k)
    ctx.fillStyle = L.leaf
    ctx.beginPath()
    lobesPath(ctx, k, c, wind + c.r * 0.16, c.r * 0.2, 0.9)
    ctx.fill()
    ctx.restore()
  }
}

function drawTree(ctx: Ctx, k: number, L: Look, t: number): void {
  const wind = Math.sin(t * 0.7) * 0.03 + Math.sin(t * 1.9 + 1) * 0.012
  drawCanopy(ctx, k, L, wind, true)
  // The trunk, flaring into its roots on the bank.
  const base = surface(TRUNK_X)
  const top = -5.4
  ctx.fillStyle = L.bark
  ctx.beginPath()
  ctx.moveTo((TRUNK_X - 1.0) * k, (surface(TRUNK_X - 1.0) + 0.08) * k)
  ctx.quadraticCurveTo((TRUNK_X - 0.42) * k, (base - 0.15) * k, (TRUNK_X - 0.38) * k, (base - 1.0) * k)
  ctx.lineTo((TRUNK_X - 0.24) * k, top * k)
  ctx.lineTo((TRUNK_X + 0.4) * k, top * k)
  ctx.lineTo((TRUNK_X + 0.4) * k, (base - 1.0) * k)
  ctx.quadraticCurveTo((TRUNK_X + 0.5) * k, (base - 0.12) * k, (TRUNK_X + 1.1) * k, (surface(TRUNK_X + 1.1) + 0.08) * k)
  ctx.closePath()
  ctx.fill()
  // Its lit side, soft, and a few long furrows in the bark.
  ctx.save()
  ctx.clip()
  const lg = ctx.createLinearGradient((TRUNK_X - 0.45) * k, 0, (TRUNK_X + 0.15) * k, 0)
  lg.addColorStop(0, rgba(HOUSE.linen, 0.13))
  lg.addColorStop(1, rgba(HOUSE.linen, 0))
  ctx.fillStyle = lg
  ctx.fillRect((TRUNK_X - 1.2) * k, top * k, 1.4 * k, (base - top + 0.3) * k)
  ctx.strokeStyle = rgba(HOUSE.night, 0.18)
  ctx.lineWidth = Math.max(0.6, 0.03 * k)
  for (let i = 0; i < 5; i++) {
    const x = TRUNK_X - 0.2 + i * 0.13 + 0.05 * hash(i, 3, 3)
    ctx.beginPath()
    ctx.moveTo(x * k, (top + 0.3 + 0.8 * hash(i, 4, 4)) * k)
    ctx.quadraticCurveTo((x + 0.06) * k, ((top + base) / 2) * k, (x + (i - 2) * 0.12) * k, (base - 0.3 - 0.8 * hash(i, 5, 5)) * k)
    ctx.stroke()
  }
  ctx.restore()
  for (const b of BRANCHES) fillBranch(ctx, k, b, L.bark)
  const bare = clamp01((0.55 - L.density) / 0.45)
  if (bare > 0.02) {
    ctx.globalAlpha = bare
    for (const tw of TWIGS) fillBranch(ctx, k, tw, L.bark)
    ctx.globalAlpha = 1
  }
  if (L.snow > 0.05) {
    ctx.globalAlpha = L.snow * 0.9
    for (const b of BRANCHES.slice(0, 6)) fillBranch(ctx, k, { pts: b.pts.map(([x, y]) => [x, y - b.w0 * 0.42] as Pt), w0: b.w0 * 0.3, w1: 0.015 }, HOUSE.linen)
    ctx.globalAlpha = 1
  }
  drawCanopy(ctx, k, L, wind, false)
}

/** The hanging twigs at the limb's end: leaves by the season, pushed when she reaches them. */
function drawSprays(ctx: Ctx, k: number, L: Look, t: number): void {
  const d = L.density
  SPRAYS.forEach((s, j) => {
    const [bx, by] = brushAt(t, j)
    const sway = Math.sin(t * 0.9 + s.seed) * 0.03
    const tip: Pt = [s.tip[0] + bx + sway, s.tip[1] + by]
    const mid: Pt = [(s.base[0] + tip[0]) / 2 + 0.25 + bx * 0.3, (s.base[1] + tip[1]) / 2 + by * 0.3]
    ctx.strokeStyle = L.bark
    ctx.lineWidth = Math.max(0.6, 0.035 * k)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(s.base[0] * k, s.base[1] * k)
    ctx.quadraticCurveTo(mid[0] * k, mid[1] * k, tip[0] * k, tip[1] * k)
    ctx.stroke()
    if (L.snow > 0.3) {
      ctx.strokeStyle = rgba(HOUSE.linen, 0.6 * L.snow)
      ctx.lineWidth = Math.max(0.5, 0.02 * k)
      ctx.beginPath()
      ctx.moveTo(s.base[0] * k, (s.base[1] - 0.03) * k)
      ctx.quadraticCurveTo(mid[0] * k, (mid[1] - 0.03) * k, tip[0] * k, (tip[1] - 0.03) * k)
      ctx.stroke()
    }
    if (d < 0.1) return
    const n = 9
    for (let i = 0; i < n; i++) {
      if (hash(s.seed, i, 31) > d + 0.05) continue
      const u = 0.35 + (0.65 * i) / (n - 1)
      const q = (a: number, b: number, c: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c
      const x = q(s.base[0], mid[0], tip[0])
      const y = q(s.base[1], mid[1], tip[1])
      const side = i % 2 ? 1 : -1
      ctx.fillStyle = i % 3 === 0 ? L.leafLight : i % 3 === 1 ? L.leaf : L.leafDark
      leafShape(ctx, k, x + side * 0.1, y + 0.03, 0.26, Math.PI / 2 + side * 0.9 + bx * 0.8)
    }
  })
}

/** What has fallen and is falling: leaves in the autumn (lying on the grass until the snow), snow off the twigs. */
function drawFalls(ctx: Ctx, k: number, t: number): void {
  if (t > 150) return
  for (const f of FALLS) {
    const s = t - f.t0
    if (s < 0) continue
    const p = fallAt(f, s)
    if (f.kind === 'snow') {
      if (p.down || s > 1.6) continue
      ctx.fillStyle = rgba(HOUSE.linen, 0.9 * (1 - s / 1.6))
      ctx.fillRect((p.x - 0.018) * k, (p.y - 0.018) * k, 0.036 * k, 0.036 * k)
      continue
    }
    // A leaf on the grass stays until the snow covers it.
    const keep = p.down ? clamp01((1.85 - yearAt(t)) / 0.35) : 1
    if (keep <= 0.01) continue
    ctx.fillStyle = rgba(mix(SHELL.canary, HOUSE.wood, 0.45 + 0.25 * hash(f.seed * 10, 1, 1)), keep)
    leafShape(ctx, k, p.x, p.down ? p.y + 0.01 : p.y, 0.15, p.down ? 0.2 * Math.sin(f.seed) : p.a)
  }
}

/**
 * Soft shadows on the grass under Louise and Hannah (the light is overcast: faint, close): they stay on the ground and
 * thin as a ball rises, which is how her hops to the seat, Hannah's height on the swing and the leap read as height.
 * In the vision the low sun is on the right and they lie long to the left.
 */
function drawShadows(ctx: Ctx, k: number, t: number, L: Look): void {
  const who: [Pt | null, number][] = []
  const l = louiseAt(t)
  who.push([l, 1])
  const h = hannahAt(t)
  if (h) who.push([[h.x, h.y], h.scale])
  for (const [p, scale] of who) {
    if (!p) continue
    const r = R * scale
    const gy = surface(p[0])
    const up = Math.max(0, gy - r - p[1])
    const fade = Math.max(0, 1 - up / 1.6)
    if (fade <= 0.01) continue
    const slope = Math.atan2(surface(p[0] + 0.05) - surface(p[0] - 0.05), 0.1)
    const long = 1 + 1.4 * L.warm
    ctx.save()
    ctx.translate((p[0] - 0.12 * L.warm * (1 + up)) * k, (gy - 0.01) * k)
    ctx.rotate(slope)
    ctx.scale(long * (1 + 0.35 * Math.min(1, up)), 0.3)
    const rr = r * 1.55 * k
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr)
    const a = (0.5 - 0.12 * L.snow) * fade
    g.addColorStop(0, rgba(HOUSE.night, a))
    g.addColorStop(1, rgba(HOUSE.night, 0))
    ctx.fillStyle = g
    ctx.fillRect(-rr, -rr, 2 * rr, 2 * rr)
    ctx.restore()
  }
}

/** The swing: its two ropes (the far one behind her, the near one, `near`, over her), and the seat. */
function drawSwing(ctx: Ctx, k: number, t: number, near: boolean): void {
  const { c, f, a } = seatAt(t)
  const rope = mix(HOUSE.linenShade, HOUSE.wood, 0.35)
  const o = near ? 0.03 : -0.03
  ctx.strokeStyle = near ? mix(rope, HOUSE.woodDark, 0.1) : mix(rope, HOUSE.woodDark, 0.45)
  ctx.lineWidth = Math.max(0.8, 0.032 * k)
  ctx.lineCap = 'round'
  const sx = c[0] + f[0] * o
  const sy = c[1] + f[1] * o
  ctx.beginPath()
  ctx.moveTo((PIVOT[0] + o * 0.3) * k, (PIVOT[1] - 0.06) * k)
  ctx.lineTo(sx * k, (sy - 0.02) * k)
  ctx.stroke()
  if (near) return
  ctx.fillStyle = rope
  ctx.fillRect((PIVOT[0] - 0.06) * k, (PIVOT[1] - 0.16) * k, 0.12 * k, 0.12 * k)
  // The seat: a plank on the ropes' ends, square to them.
  ctx.save()
  ctx.translate(c[0] * k, c[1] * k)
  ctx.rotate(-a)
  ctx.fillStyle = HOUSE.wood
  ctx.fillRect(-SEAT_W * k, -(SEAT_T / 2) * k, 2 * SEAT_W * k, SEAT_T * k)
  ctx.fillStyle = rgba(HOUSE.linen, 0.22)
  ctx.fillRect(-SEAT_W * k, -(SEAT_T / 2) * k, 2 * SEAT_W * k, SEAT_T * 0.3 * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the set */

export function lawnDraw(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  const L = lookAt(t)
  ctx.save()
  drawSky(ctx, k, f, L, t)
  drawFarShore(ctx, k, f, L, t)
  drawLawn(ctx, k, f, L)
  drawHouseLight(ctx, k, f, L)
  drawShadows(ctx, k, t, L)
  drawTree(ctx, k, L, t)
  drawSprays(ctx, k, L, t)
  drawFalls(ctx, k, t)
  drawSwing(ctx, k, t, false)
  ctx.restore()
}

export function lawnOver(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  ctx.save()
  drawSwing(ctx, k, t, true)
  if (t > 150) drawVision(ctx, k, frame(p, k))
  ctx.restore()
}

/** What she sees is seen from the fog: its white soft at the edges of the picture. */
function drawVision(ctx: Ctx, k: number, f: Frame): void {
  const w = f.x1 - f.x0
  const h = f.y1 - f.y0
  ctx.save()
  ctx.translate(f.cx * k, f.cy * k)
  ctx.scale(w / h, 1)
  const g = ctx.createRadialGradient(0, 0, h * 0.34 * k, 0, 0, h * 0.78 * k)
  g.addColorStop(0, rgba(HOUSE.fog, 0))
  g.addColorStop(1, rgba(HOUSE.fog, 0.62))
  ctx.fillStyle = g
  ctx.fillRect(-h * k, -h * k, 2 * h * k, 2 * h * k)
  ctx.restore()
}
