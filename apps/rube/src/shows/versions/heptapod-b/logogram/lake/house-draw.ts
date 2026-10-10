import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { composedCells, frame, hash, type Ctx } from '../kit'
import { LAKE } from '../worlds'
import {
  BENCH,
  BROW,
  HORIZON,
  LAMP,
  MULLIONS,
  ROOM,
  SCENES,
  SHORE,
  SUN,
  V1_AT,
  V3_DROPS,
  VIEW_CAM,
  WIN,
  lawnY,
  type Light,
} from './house-plan'

/**
 * The lake house, drawn: the long room at dawn (and by day, and at dusk in the rain), the lake beyond its window, and
 * the lawn outside for the first vision. Everything is drawn from show time and the light (`lightAt`); the scenes'
 * parts draw nothing of their own.
 *
 * The room is flat fills and one ink (the bench, the lamp, the window's frame); the view, the fog, the light on the
 * water and the rain are soft (gradients, never outlined). Far things move less than the camera does, and grow less
 * as it comes in (`depth`), so a push toward the window reads as going toward it.
 */

type C2D = CanvasRenderingContext2D
type Frame = ReturnType<typeof frame>
/** A ball in the picture, for its shadow: its centre and radius (lake cells). */
export interface Body {
  x: number
  y: number
  r: number
}

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
const rgba = (hex: string, a: number): string => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a)).toFixed(4)})`
}

/** A soft round volume of light or air: an ellipse fading from its middle to nothing. */
function soft(ctx: C2D, k: number, x: number, y: number, rx: number, ry: number, color: string, a: number, core = 0): void {
  if (a <= 0.002 || rx <= 0 || ry <= 0) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(rx / ry, 1)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry * k)
  g.addColorStop(0, rgba(color, a))
  if (core > 0) g.addColorStop(core, rgba(color, a * 0.85))
  g.addColorStop(0.55, rgba(color, a * 0.45))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-ry * k, -ry * k, 2 * ry * k, 2 * ry * k)
  ctx.restore()
}

/** A band of colour from `c0` at `y0` to `c1` at `y1`, across `x0`..`x1`. */
function band(ctx: C2D, k: number, x0: number, x1: number, y0: number, y1: number, stops: [number, string, number][]): void {
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [at, c, a] of stops) g.addColorStop(at, rgba(c, a))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/**
 * Draw what `fn` draws as if it were `d` of the way to infinitely far (0: on the window, 1: at the horizon): it moves
 * and grows only by what is left of the camera's own move from `ref`.
 */
function depth(p: p5, k: number, f: Frame, ref: { x: number; y: number; cells: number }, d: number, fn: () => void): void {
  const m = composedCells(f) / ref.cells
  const S = 1 - d + d * m
  const ox = d * (f.cx - m * ref.x)
  const oy = d * (f.cy - m * ref.y)
  p.push()
  p.translate(ox * k, oy * k)
  p.scale(S)
  fn()
  p.pop()
}

/** Where a point `x` of a layer `d` of the way to the horizon (see `depth`) is seen, in the room's own cells. */
function viewX(f: Frame, d: number, x: number): number {
  const m = composedCells(f) / VIEW_CAM.cells
  return d * (f.cx - m * VIEW_CAM.x) + (1 - d + d * m) * x
}

/**
 * Firs along `top(x)`: spires, each about three and a half times as tall as it is wide, in stands that rise and thin
 * along the line (never a comb). Filled down to `base`.
 */
function firs(ctx: C2D, k: number, x0: number, x1: number, top: (x: number) => number, base: number, h: number, seed: number): void {
  ctx.beginPath()
  ctx.moveTo(x0 * k, base * k)
  ctx.lineTo(x0 * k, top(x0) * k)
  let x = x0
  let i = 0
  while (x < x1) {
    const r1 = hash(i, seed, 3)
    const r2 = hash(i, seed, 7)
    // Stands: a slow swell along the shore, and gaps where only low growth stands.
    const stand = Math.max(0, 0.5 + 0.5 * Math.sin(x * 0.8 + seed) * Math.cos(x * 0.29 + seed * 1.9) + 0.25 * Math.sin(x * 2.3 + seed))
    const th = h * (0.25 + 0.75 * stand) * (0.6 + 0.4 * r1)
    const w = th * (0.26 + 0.06 * r2)
    const y = top(x)
    ctx.lineTo((x - w) * k, (y - th * 0.08) * k)
    ctx.lineTo((x - w * 0.55) * k, (y - th * 0.42) * k)
    ctx.lineTo((x - w * 0.3) * k, (y - th * 0.46) * k)
    ctx.lineTo(x * k, (y - th) * k)
    ctx.lineTo((x + w * 0.3) * k, (y - th * 0.46) * k)
    ctx.lineTo((x + w * 0.55) * k, (y - th * 0.42) * k)
    ctx.lineTo((x + w) * k, (y - th * 0.08) * k)
    x += Math.max(0.03, w * (0.9 + 0.9 * hash(i, seed, 11)))
    i++
  }
  ctx.lineTo(x1 * k, top(x1) * k)
  ctx.lineTo(x1 * k, base * k)
  ctx.closePath()
  ctx.fill()
}

/** Rolling hills: a soft-topped silhouette whose top is `top(x)`, down to `y`. */
function hills(ctx: C2D, k: number, x0: number, x1: number, y: number, top: (x: number) => number): void {
  ctx.beginPath()
  ctx.moveTo(x0 * k, y * k)
  for (let x = x0; x <= x1 + 1e-6; x += 0.08) ctx.lineTo(x * k, top(x) * k)
  ctx.lineTo(x1 * k, y * k)
  ctx.closePath()
  ctx.fill()
}

/* ------------------------------------------------------------------ the view through the glass */

interface Palette {
  skyTop: string
  skyLow: string
  hillFar: string
  hill: string
  fir: string
  waterFar: string
  waterNear: string
  fog: string
  glow: string
}

function palette(L: Light): Palette {
  if (L.kind === 'day')
    return {
      skyTop: mixHex(LAKE.day, LAKE.lakeDeep, 0.22),
      skyLow: mixHex(LAKE.day, LAKE.fog, 0.6),
      hillFar: mixHex(LAKE.hills, LAKE.day, 0.5),
      hill: mixHex(LAKE.pinesFar, LAKE.pines, 0.35),
      fir: mixHex(LAKE.pines, LAKE.pinesFar, 0.2),
      waterFar: mixHex(LAKE.lakeLight, LAKE.day, 0.3),
      waterNear: mixHex(LAKE.lake, LAKE.lakeDeep, 0.5),
      fog: LAKE.fog,
      glow: LAKE.fog,
    }
  if (L.kind === 'dusk')
    return {
      skyTop: mixHex(LAKE.lakeDeep, LAKE.night, 0.6),
      skyLow: mixHex(LAKE.dusk, LAKE.lakeDeep, 0.35),
      hillFar: mixHex(LAKE.lakeDeep, LAKE.night, 0.42),
      hill: mixHex(LAKE.pines, LAKE.night, 0.55),
      fir: mixHex(LAKE.pines, LAKE.night, 0.75),
      waterFar: mixHex(LAKE.dusk, LAKE.lakeDeep, 0.5),
      waterNear: mixHex(LAKE.lakeDeep, LAKE.night, 0.7),
      fog: mixHex(LAKE.lakeLight, LAKE.dusk, 0.5),
      glow: LAKE.dusk,
    }
  // Dawn: before the sun, a cool blue-grey, the fog on the water the palest thing in it; as the light comes, pale.
  const u = Math.max(0, Math.min(1, L.lum))
  const d = (dim: string, lit: string) => mixHex(dim, lit, u)
  return {
    skyTop: d(mixHex(LAKE.lakeDeep, LAKE.night, 0.3), mixHex(LAKE.fog, LAKE.lakeLight, 0.55)),
    skyLow: d(mixHex(LAKE.lakeLight, LAKE.lakeDeep, 0.45), mixHex(LAKE.fog, LAKE.dawn, 0.6)),
    hillFar: d(mixHex(LAKE.hills, LAKE.lakeDeep, 0.55), mixHex(LAKE.hills, LAKE.fog, 0.6)),
    hill: d(mixHex(LAKE.pines, LAKE.lakeDeep, 0.5), mixHex(LAKE.pinesFar, LAKE.fog, 0.35)),
    fir: d(mixHex(LAKE.pines, LAKE.night, 0.35), mixHex(LAKE.pines, LAKE.pinesFar, 0.45)),
    waterFar: d(mixHex(LAKE.lakeLight, LAKE.lakeDeep, 0.5), mixHex(LAKE.lakeLight, LAKE.fog, 0.45)),
    waterNear: d(mixHex(LAKE.lakeDeep, LAKE.night, 0.4), mixHex(LAKE.lake, LAKE.lakeDeep, 0.45)),
    fog: d(mixHex(LAKE.lakeLight, LAKE.fog, 0.45), LAKE.fog),
    glow: mixHex(LAKE.dawn, LAKE.lamp, 0.3),
  }
}

const hillTop = (x: number, base: number, amp: number, seed: number) =>
  base - amp * (0.55 + 0.3 * Math.sin(x * 0.55 + seed) + 0.18 * Math.sin(x * 1.37 + seed * 1.7) + 0.07 * Math.sin(x * 3.1 + seed * 0.3))

/** The fog lying in long soft bands at `y`, drifting slowly (each its own way). */
function fogBands(ctx: C2D, k: number, x0: number, x1: number, y: number, spread: number, n: number, seed: number, color: string, a: number, tau: number, rx = 1.8, ry = 0.16): void {
  const span = x1 - x0
  for (let i = 0; i < n; i++) {
    const drift = tau * (0.025 + 0.03 * hash(i, seed, 2)) * (hash(i, seed, 9) < 0.5 ? 1 : -1)
    const cx = x0 + ((((i + 0.5) / n) * span + drift) % span + span) % span
    const cy = y - spread * hash(i, seed, 3) + 0.025 * Math.sin(tau * 0.17 + i * 1.3)
    soft(ctx, k, cx, cy, rx * (0.7 + 0.8 * hash(i, seed, 4)), ry * (0.7 + 0.6 * hash(i, seed, 5)), color, a * (0.55 + 0.45 * hash(i, seed, 8)))
  }
}

/**
 * Wisps of fog blowing slowly across the far shore: long thin streaks, each a few soft lobes along its length that
 * change a little as it goes, carried left to right on the dawn air fast enough for the eye to follow.
 */
function wisps(ctx: C2D, k: number, x0: number, x1: number, y: number, spread: number, n: number, seed: number, color: string, a: number, tau: number, speed: number): void {
  const span = x1 - x0
  for (let i = 0; i < n; i++) {
    const v = speed * (0.75 + 0.5 * hash(i, seed, 1))
    const L = 1.2 + 1.3 * hash(i, seed, 2)
    const th = 0.035 + 0.03 * hash(i, seed, 3)
    const cx = x0 + ((((span * hash(i, seed, 4) + v * tau) % span) + span) % span)
    const cy = y - spread * hash(i, seed, 5) + 0.02 * Math.sin(tau * 0.23 + i * 1.7)
    const alpha = a * (0.6 + 0.4 * hash(i, seed, 6))
    const breathe = 0.85 + 0.15 * Math.sin(tau * 0.31 + i * 2.3)
    soft(ctx, k, cx - 0.32 * L, cy + 0.012, 0.42 * L * breathe, th * 0.8, color, alpha * 0.8)
    soft(ctx, k, cx, cy, 0.55 * L, th, color, alpha)
    soft(ctx, k, cx + 0.34 * L, cy - 0.015, 0.35 * L * (1.15 - 0.15 * breathe), th * 0.7, color, alpha * 0.85)
  }
}

/**
 * The lake beyond the window: the sky, the far hills fading into the fog, the fir-dark hills round the lake with the
 * fog lying across them, the far shore's firs, the fog on the water, the water, and the sun behind the fog with its
 * light on the water. In the window's own cells for the camera of the first frame; `depth` moves it for any other.
 */
function view(p: p5, k: number, f: Frame, L: Light): void {
  const ctx = p.drawingContext as C2D
  const P = palette(L)
  const x0 = WIN.x0 - 7
  const x1 = WIN.x1 + 7
  const tau = L.tau
  const y0 = WIN.top - 3
  const yb = WIN.sill + 3
  const H = HORIZON

  // The sky, and the far hills going into the cloud: nearly as far as it goes.
  depth(p, k, f, VIEW_CAM, 0.9, () => {
    band(ctx, k, x0, x1, y0, H + 0.2, [
      [0, P.skyTop, 1],
      [0.6, mixHex(P.skyTop, P.skyLow, 0.55), 1],
      [1, P.skyLow, 1],
    ])
    if (L.glow > 0.01) soft(ctx, k, SUN[0], SUN[1] - 0.2, 5.5, 1.9, P.glow, 0.32 * L.glow)
    ctx.fillStyle = rgba(P.hillFar, 1)
    hills(ctx, k, x0, x1, H + 0.2, (x) => hillTop(x, H - 1.05, 0.75, 1.3))
    // Low cloud down on the far hills.
    fogBands(ctx, k, x0, x1, H - 1.35, 0.5, 7, 3, P.fog, 0.5 * (0.4 + 0.6 * L.fog), tau, 2.4, 0.22)
  })

  // The fir-dark hills round the lake, the fog lying in bands across them.
  depth(p, k, f, VIEW_CAM, 0.78, () => {
    const ridge = (x: number) => hillTop(x, H - 0.28, 0.55, 4.1)
    ctx.fillStyle = rgba(P.hill, 1)
    firs(ctx, k, x0, x1, ridge, H + 0.1, 0.1, 5)
    fogBands(ctx, k, x0, x1, H - 0.45, 0.35, 9, 6, P.fog, 0.55 * L.fog, tau, 2.0, 0.13)
    if (L.kind === 'dawn') wisps(ctx, k, x0, x1, H - 0.55, 0.35, 5, 41, P.fog, 0.3 + 0.25 * L.fog, tau, 0.1)
    if (L.glow > 0.01) {
      // The sun behind the fog: a long glow low on the water's far edge (never a disc).
      soft(ctx, k, SUN[0], SUN[1] + 0.15, 3.4, 0.75, P.glow, 0.55 * L.glow)
      soft(ctx, k, SUN[0], SUN[1] + 0.22, 1.5, 0.3, LAKE.fog, 0.75 * L.glow * L.glow, 0.3)
    }
  })

  // The far shore's firs at the water, and the fog lying on the water along it.
  depth(p, k, f, VIEW_CAM, 0.66, () => {
    // A dark mass of forest along the far shore, its top the firs' spires, rising and falling in stands.
    ctx.fillStyle = rgba(mixHex(P.fir, P.hill, 0.35), 1)
    firs(ctx, k, x0, x1, (x) => H - 0.1 - 0.08 * (0.5 + 0.5 * Math.sin(x * 1.1 + 2)), H + 0.03, 0.34, 23)
    ctx.fillStyle = rgba(P.fir, 1)
    firs(ctx, k, x0, x1, (x) => H - 0.03 - 0.05 * (0.5 + 0.5 * Math.sin(x * 0.7 + 1)), H + 0.03, 0.46, 17)
    fogBands(ctx, k, x0, x1, H - 0.02, 0.2, 11, 8, P.fog, 0.8 * L.fog, tau, 1.7, 0.15)
    if (L.kind === 'dawn' || L.kind === 'day') wisps(ctx, k, x0, x1, H - 0.04, 0.32, 9, 43, P.fog, (L.kind === 'day' ? 0.25 : 0.4) + 0.3 * L.fog, tau, 0.17)
    band(ctx, k, x0, x1, H - 0.4, H + 0.1, [
      [0, P.fog, 0],
      [0.75, P.fog, 0.5 * L.fog],
      [1, P.fog, 0.3 * L.fog],
    ])
  })

  // The water, and what it holds: the far shore darkly again, the light under the sun, the mist on it.
  depth(p, k, f, VIEW_CAM, 0.5, () => {
    band(ctx, k, x0, x1, H, yb, [
      [0, P.waterFar, 1],
      [0.15, mixHex(P.waterFar, P.waterNear, 0.4), 1],
      [0.45, P.waterNear, 1],
      [1, mixHex(P.waterNear, LAKE.night, 0.3), 1],
    ])
    band(ctx, k, x0, x1, H, H + 0.2, [
      [0, mixHex(P.fir, P.waterFar, 0.55), 0.35],
      [1, mixHex(P.fir, P.waterFar, 0.55), 0],
    ])
    if (L.path > 0.005) {
      // The first light on the water: a line along the far edge under the sun, and the path of glints toward us.
      soft(ctx, k, SUN[0], H + 0.035, 2.9, 0.055, P.glow, Math.min(1, 1.3 * L.path), 0.45)
      soft(ctx, k, SUN[0], H + 0.03, 1.3, 0.035, LAKE.fog, Math.min(1, 1.2 * L.path), 0.5)
      const n = 24
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n
        const y = H + 0.06 + u * u * (WIN.sill + 0.5 - H)
        const w = (0.14 + 0.9 * u) * (0.5 + 0.5 * hash(i, 21)) * (0.8 + 0.2 * Math.sin(tau * 1.6 + i * 1.3))
        const a = L.path * (0.75 - 0.45 * u) * (0.5 + 0.5 * hash(i, 23))
        soft(ctx, k, SUN[0] + 0.2 * (hash(i, 22) - 0.5) * u, y, w, 0.03 + 0.045 * u, LAKE.fog, a, 0.3)
      }
      soft(ctx, k, SUN[0], H + 0.45, 1.1, 0.8, LAKE.fog, 0.22 * L.path)
    }
    if (L.glow > 0.01) soft(ctx, k, SUN[0], H + 0.1, 2.4, 0.18, P.glow, 0.4 * L.glow)
    // The fog again in the still water, long and faint.
    if (L.fog > 0.01) fogBands(ctx, k, x0, x1, H + 0.26, 0.2, 8, 14, P.fog, 0.22 * L.fog, tau, 2.4, 0.05)
    // A low mist over the near water.
    if (L.fog > 0.01) fogBands(ctx, k, x0, x1, H + 0.5, 0.3, 6, 12, P.fog, 0.3 * L.fog, tau, 2.4, 0.12)
  })

  if (L.rain > 0) {
    // Rain over the lake: a grey drift across the view, heavier and lighter in slow sweeps.
    band(ctx, k, x0, x1, WIN.top, WIN.sill, [
      [0, mixHex(LAKE.fog, LAKE.night, 0.45), 0.24],
      [1, mixHex(LAKE.fog, LAKE.night, 0.55), 0.14],
    ])
    for (let i = 0; i < 4; i++) {
      const cx = WIN.x0 + ((i * 2.4 + tau * 0.45) % (WIN.x1 - WIN.x0 + 3)) - 1.5
      soft(ctx, k, cx, -1.2, 1.1, 1.9, mixHex(LAKE.fog, LAKE.night, 0.4), 0.1)
    }
  }
}

/* ------------------------------------------------------------------ rain on the glass */

interface Drop {
  at: number
  x: number
  y: number
  r: number
  /** How long it clings before it runs, how far it runs, how it wanders. */
  hold: number
  run: number
  wobble: number
}
/** Each hard pulse of the third vision is a drop landing on a pane (placed clear of the mullions and of her). */
const DROPS: Drop[] = V3_DROPS.map((at, i) => {
  const spots: Pt[] = [
    [0.3, -1.22],
    [1.3, -2.1],
    [-0.8, -1.95],
    [2.0, -1.25],
    [-0.25, -2.3],
    [2.95, -1.85],
    [0.95, -0.9],
    [-0.9, -1.0],
    [2.55, -2.3],
  ]
  const [x, y] = spots[i % spots.length]
  // Small beside her (never ball-sized): the first, on the hardest pulse, a little the largest.
  return { at, x, y, r: 0.036 + 0.012 * hash(i, 41) + (i === 0 ? 0.01 : 0), hold: 0.1 + 0.18 * hash(i, 42), run: 0.8 + 0.9 * hash(i, 43), wobble: hash(i, 44) }
})
/** Where a drop is `s` seconds after it lands, how big, and how far it has run. */
function dropAt(d: Drop, s: number): { x: number; y: number; r: number; ran: number } {
  // It clings, then gathers and runs, quicker and quicker, wandering a very little, until it has left most of itself behind.
  const go = Math.max(0, s - d.hold)
  const ran = Math.min(d.run, 0.4 * go * go + 0.22 * go)
  const x = d.x + 0.012 * Math.sin(ran * (3 + 3 * d.wobble) + d.wobble * 6) * Math.min(1, ran * 4) + 0.02 * (d.wobble - 0.5) * ran
  return { x, y: d.y + ran, r: d.r * (1 - 0.35 * (ran / d.run)), ran }
}
/** The beads already on the glass: still, faint, of every size. */
const BEADS: { x: number; y: number; r: number }[] = Array.from({ length: 46 }, (_, i) => ({
  x: WIN.x0 + 0.1 + (WIN.x1 - WIN.x0 - 0.2) * hash(i, 51),
  y: WIN.top + 0.1 + (WIN.sill - WIN.top - 0.25) * Math.pow(hash(i, 52), 0.8),
  r: 0.012 + 0.03 * Math.pow(hash(i, 53), 2.4),
}))

/** A drop of water on the glass: a small lens, the dark room over it at its top, the light outside through its foot. */
function bead(ctx: C2D, k: number, x: number, y: number, rx: number, ry: number, lit: string, dark: string, a: number): void {
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(rx / ry, 1)
  ctx.fillStyle = rgba(dark, 0.5 * a)
  ctx.beginPath()
  ctx.arc(0, 0, ry * k, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createLinearGradient(0, -ry * k, 0, ry * k)
  g.addColorStop(0, rgba(lit, 0))
  g.addColorStop(0.55, rgba(lit, 0.55 * a))
  g.addColorStop(1, rgba(lit, 0.95 * a))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, ry * 0.18 * k, ry * 0.78 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function rain(p: p5, k: number, t: number, L: Light): void {
  if (L.rain <= 0) return
  const ctx = p.drawingContext as C2D
  const lit = mixHex(LAKE.glass, LAKE.dusk, 0.3)
  const dark = mixHex(LAKE.mullion, LAKE.night, 0.5)
  for (const b of BEADS) bead(ctx, k, b.x, b.y, b.r, b.r * 1.05, lit, dark, 0.45)
  for (const d of DROPS) {
    const s = t - d.at
    if (s < 0) continue
    const at = dropAt(d, s)
    // The wet run it leaves behind it: a thin trail, a little brighter than the glass, drying.
    if (at.ran > 0.01) {
      ctx.strokeStyle = rgba(lit, 0.24 * Math.exp(-Math.max(0, s - d.hold - 0.8) / 3))
      ctx.lineWidth = Math.max(1, d.r * 0.45 * k)
      ctx.lineCap = 'round'
      ctx.beginPath()
      const n = 12
      for (let i = 0; i <= n; i++) {
        const q = dropAt(d, d.hold + ((s - d.hold) * i) / n)
        if (i === 0) ctx.moveTo(q.x * k, q.y * k)
        else ctx.lineTo(q.x * k, (q.y - q.r * 0.6) * k)
      }
      ctx.stroke()
    }
    // The drop: flattened as it strikes, rounding; drawn out a little as it runs.
    const hit = Math.exp(-s / 0.07)
    const running = Math.min(1, Math.max(0, s - d.hold) * 2)
    bead(ctx, k, at.x, at.y, at.r * (1 + 0.6 * hit), at.r * (1 - 0.3 * hit + 0.25 * running), lit, dark, 1)
    // The instant it lands, the glass round it catches the light: the pulse, seen.
    const glint = Math.exp(-s / 0.12)
    if (glint > 0.02) soft(ctx, k, at.x, at.y, d.r * 3.6, d.r * 2.4, lit, 0.55 * glint)
  }
}

/* ------------------------------------------------------------------ the room */

/** The room's colours by how dim it is. */
const shade = (hex: string, dim: number) => mixHex(hex, LAKE.night, dim)

/** How bright the window is, 0..1: what the floor reflects and the wall catches. */
const brightness = (L: Light) => (L.kind === 'dusk' ? 0.22 : L.kind === 'day' ? 0.75 : 0.55 + 0.35 * L.glow + 0.3 * L.glare)

function room(p: p5, c: Ctx, f: Frame, t: number, L: Light, balls: Body[]): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as C2D
  const X = (x: number) => x * k
  const dim = L.dim
  const wall = shade(LAKE.wall, dim)
  const lit = brightness(L)
  const fx0 = f.x0 - 1
  const fx1 = f.x1 + 1

  // The back wall, and the light from the window on it.
  ctx.fillStyle = rgba(wall, 1)
  ctx.fillRect(X(fx0), X(f.y0 - 1), X(fx1 - fx0), X(ROOM.wall - f.y0 + 1))
  const cx = (WIN.x0 + WIN.x1) / 2
  soft(ctx, k, cx, (WIN.top + WIN.sill) / 2, (WIN.x1 - WIN.x0) * 0.85, 2.6, LAKE.wall, 0.16 * lit * (1 - dim * 0.4))

  // The glass, and everything beyond it.
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(WIN.x0), X(WIN.top), X(WIN.x1 - WIN.x0), X(WIN.sill - WIN.top))
  ctx.clip()
  view(p, k, f, L)
  // At dusk the room's dark reaches into the glass a little; the rain on the glass is over it, catching what light
  // there is.
  if (L.kind === 'dusk') {
    ctx.fillStyle = rgba(LAKE.night, 0.22)
    ctx.fillRect(X(WIN.x0), X(WIN.top), X(WIN.x1 - WIN.x0), X(WIN.sill - WIN.top))
  }
  rain(p, k, t, L)
  ctx.restore()

  // The ceiling going away over us: dim, catching a little of the window's light near the wall.
  const ceil = shade(mixHex(LAKE.wallShade, LAKE.floorDark, 0.35), Math.min(1, dim * 0.95 + 0.12))
  const top = Math.min(ROOM.ceiling - 0.5, f.y0 - 1)
  band(ctx, k, fx0, fx1, top, ROOM.ceiling + 0.2, [
    [0, shade(ceil, 0.25), 1],
    [Math.max(0, 1 - 0.9 / (ROOM.ceiling + 0.2 - top)), ceil, 1],
    [Math.max(0, 1 - 0.2 / (ROOM.ceiling + 0.2 - top)), mixHex(ceil, wall, 0.45), 1],
    [1, wall, 1],
  ])
  soft(ctx, k, cx, ROOM.ceiling, (WIN.x1 - WIN.x0) * 0.6, 0.9, LAKE.wall, 0.1 * lit * (1 - dim * 0.5))
  // Where the wall meets it, a clean line, and the soft shadow of the ceiling's edge on the wall under it.
  band(ctx, k, fx0, fx1, ROOM.ceiling, ROOM.ceiling + 0.35, [[0, LAKE.night, 0.1 * (1 - dim * 0.5)], [1, LAKE.night, 0]])
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.line(X(fx0), X(ROOM.ceiling), X(fx1), X(ROOM.ceiling))
  p.noStroke()


  // The floor: pale oak going away from us, dimmer near.
  const floor = shade(LAKE.floor, dim * 0.9)
  band(ctx, k, fx0, fx1, ROOM.wall, Math.max(ROOM.wall + 0.5, f.y1 + 1), [
    [0, mixHex(floor, LAKE.wall, 0.12), 1],
    [0.35, floor, 1],
    [1, shade(LAKE.floorDark, Math.min(1, dim * 0.9 + 0.15)), 1],
  ])
  // The window in the boards: each pane's light drawn down the polish and fading, the mullions dark between; the
  // sun's path on the water again under it (straight under where the water, far off, shows it from here).
  const refl = mixHex(LAKE.glass, LAKE.dawn, 0.4)
  const pane = (WIN.x1 - WIN.x0) / 4
  for (let i = 0; i < 4; i++) {
    const a = WIN.x0 + pane * i + (i ? 0.03 : 0)
    const b = WIN.x0 + pane * (i + 1) - (i < 3 ? 0.03 : 0)
    band(ctx, k, a, b, ROOM.wall, ROOM.wall + 1.3, [
      [0, refl, 0.2 * lit],
      [0.25, refl, 0.1 * lit],
      [1, refl, 0],
    ])
    soft(ctx, k, (a + b) / 2, ROOM.wall + 0.08, pane * 0.5, 0.5, refl, 0.16 * lit)
  }
  if (L.path > 0.02) soft(ctx, k, viewX(f, 0.5, SUN[0]), ROOM.wall + 0.45, 0.32, 0.85, LAKE.fog, 0.3 * L.path + 0.1 * L.glare)

  // The window's frame: head, sill, jambs and the slim mullions.
  const mull = shade(LAKE.mullion, dim * 0.3)
  p.noStroke()
  p.fill(mull)
  p.rectMode(p.CORNER)
  p.rect(X(WIN.x0 - 0.08), X(WIN.top - 0.08), X(WIN.x1 - WIN.x0 + 0.16), X(0.08))
  p.rect(X(WIN.x0 - 0.08), X(WIN.sill), X(WIN.x1 - WIN.x0 + 0.16), X(ROOM.wall - WIN.sill))
  p.rect(X(WIN.x0 - 0.08), X(WIN.top - 0.08), X(0.08), X(ROOM.wall - WIN.top + 0.08))
  p.rect(X(WIN.x1), X(WIN.top - 0.08), X(0.08), X(ROOM.wall - WIN.top + 0.08))
  for (const mx of MULLIONS) p.rect(X(mx - 0.028), X(WIN.top), X(0.056), X(WIN.sill - WIN.top))

  // The line of the room: where the wall meets the floor.
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.line(X(fx0), X(ROOM.wall), X(fx1), X(ROOM.wall))

  lamp(p, c, dim, L)
  bench(p, c, dim)
  shadows(ctx, k, balls, dim)
}

/** The floor lamp by the window's left end: a slim stem, a heavy foot, a linen drum. Never lit. */
function lamp(p: p5, c: Ctx, dim: number, L: Light): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const x = LAMP.x
  p.push()
  p.rectMode(p.CORNER)
  solid(p, ink, weight * 0.8, shade(LAKE.mullion, dim * 0.4))
  p.rect(X(x - 0.016), X(LAMP.shadeBot), X(0.032), X(ROOM.wall - LAMP.shadeBot - 0.03))
  p.rect(X(x - 0.13), X(ROOM.wall - 0.04), X(0.26), X(0.04), X(0.018))
  // The shade: pale linen, lit from the window's side only.
  const linen = shade(mixHex(LAKE.wallShade, LAKE.lamp, 0.3), dim * 0.85)
  solid(p, ink, weight * 0.9, linen)
  p.beginShape()
  p.vertex(X(x - LAMP.shadeW * 0.42), X(LAMP.shadeTop))
  p.vertex(X(x + LAMP.shadeW * 0.42), X(LAMP.shadeTop))
  p.vertex(X(x + LAMP.shadeW * 0.5), X(LAMP.shadeBot))
  p.vertex(X(x - LAMP.shadeW * 0.5), X(LAMP.shadeBot))
  p.endShape(p.CLOSE)
  const ctx = p.drawingContext as C2D
  const g = ctx.createLinearGradient(X(x - LAMP.shadeW / 2), 0, X(x + LAMP.shadeW / 2), 0)
  g.addColorStop(0, rgba(LAKE.night, 0.18))
  g.addColorStop(1, rgba(LAKE.fog, 0.12 * brightness(L)))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(X(x - LAMP.shadeW * 0.42), X(LAMP.shadeTop))
  ctx.lineTo(X(x + LAMP.shadeW * 0.42), X(LAMP.shadeTop))
  ctx.lineTo(X(x + LAMP.shadeW * 0.5), X(LAMP.shadeBot))
  ctx.lineTo(X(x - LAMP.shadeW * 0.5), X(LAMP.shadeBot))
  ctx.closePath()
  ctx.fill()
  p.pop()
}

/** The low bench under the window: a thick oak slab on two blocks, its top Louise's place. */
function bench(p: p5, c: Ctx, dim: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const wood = shade(LAKE.bench, dim * 0.75)
  p.push()
  p.rectMode(p.CORNER)
  // Under it, in its shadow, the glass's foot and the floor.
  const ctx = p.drawingContext as C2D
  // Its ends fade out within the slab's length, so the shadow is never a dark box with square corners.
  const fade = 0.14
  const n = 10
  const under: [number, string, number][] = [[0, LAKE.night, 0.28], [1, LAKE.night, 0.12]]
  band(ctx, k, BENCH.x0 + fade, BENCH.x1 - fade, BENCH.top + BENCH.slab, ROOM.floor, under)
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n
    ctx.save()
    ctx.globalAlpha *= a * a * (3 - 2 * a)
    const w = fade / n
    band(ctx, k, BENCH.x0 + i * w, BENCH.x0 + (i + 1) * w, BENCH.top + BENCH.slab, ROOM.floor, under)
    band(ctx, k, BENCH.x1 - (i + 1) * w, BENCH.x1 - i * w, BENCH.top + BENCH.slab, ROOM.floor, under)
    ctx.restore()
  }
  soft(ctx, k, (BENCH.x0 + BENCH.x1) / 2, ROOM.floor + 0.01, (BENCH.x1 - BENCH.x0) * 0.6, 0.06, LAKE.night, 0.3)
  solid(p, ink, weight, shade(LAKE.floorDark, dim * 0.75))
  for (const x of [BENCH.x0 + 0.16, BENCH.x1 - 0.16 - BENCH.leg]) p.rect(X(x), X(BENCH.top + BENCH.slab - 0.01), X(BENCH.leg), X(ROOM.floor - BENCH.top - BENCH.slab + 0.01))
  solid(p, ink, weight, wood)
  p.rect(X(BENCH.x0), X(BENCH.top), X(BENCH.x1 - BENCH.x0), X(BENCH.slab), X(0.025))
  p.pop()
}

/** Soft contact shadows under the balls (where each rests on the bench or the floor), before they are drawn. */
function shadows(ctx: C2D, k: number, balls: Body[], dim: number): void {
  for (const { x, y, r } of balls) {
    const onBench = x > BENCH.x0 - 0.02 && x < BENCH.x1 + 0.02 && y < BENCH.top
    const ground = onBench ? BENCH.top : ROOM.floor
    const h = ground - (y + r)
    const a = (0.3 + 0.2 * dim) * Math.exp(-Math.max(0, h) / 0.25)
    soft(ctx, k, x, ground + 0.008, r * (1.25 + h), r * 0.26, LAKE.night, a)
  }
}

/* ------------------------------------------------------------------ the lawn (the first vision) */

/** The camera the lawn's backdrop is drawn for: the vision's own opening framing. */
const LAWN_CAM = { x: V1_AT[0] - 0.5 + 0.7, y: V1_AT[1] - 0.5, cells: 4.5 }

function lawn(p: p5, c: Ctx, f: Frame, t: number, balls: Body[]): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as C2D
  const X = (x: number) => x * k
  const [ox, oy] = V1_AT
  const tau = t - SCENES.v1.begin
  const x0 = f.x0 - 3
  const x1 = f.x1 + 3
  const warm = LAKE.lamp
  // Summer, midday: the only warm daylight in the show. A high sky, a warm haze low over the hills, the sun behind us
  // to the left.
  depth(p, k, f, LAWN_CAM, 0.92, () => {
    band(ctx, k, x0 - 6, x1 + 6, f.y0 - 6, oy - 0.7, [
      [0, mixHex(LAKE.lake, LAKE.day, 0.3), 1],
      [0.55, LAKE.day, 1],
      [1, mixHex(LAKE.day, warm, 0.45), 1],
    ])
    for (let i = 0; i < 4; i++) soft(ctx, k, ox - 4 + i * 3.6 + tau * 0.06, oy - 2.3 - 0.5 * hash(i, 61), 1.6 + hash(i, 62), 0.22, LAKE.fog, 0.55)
    ctx.fillStyle = rgba(mixHex(LAKE.hills, LAKE.day, 0.35), 1)
    hills(ctx, k, x0 - 6, x1 + 6, oy - 0.3, (x) => hillTop(x, oy - 1.4, 0.65, 2.2))
    ctx.fillStyle = rgba(mixHex(LAKE.grass, LAKE.hills, 0.55), 1)
    hills(ctx, k, x0 - 6, x1 + 6, oy - 0.3, (x) => hillTop(x, oy - 1.05, 0.45, 3.7))
    band(ctx, k, x0 - 6, x1 + 6, oy - 1.6, oy - 0.7, [
      [0, warm, 0],
      [1, warm, 0.3],
    ])
  })
  depth(p, k, f, LAWN_CAM, 0.78, () => {
    // The far shore's forested hills in the sun, and the firs along the water.
    ctx.fillStyle = rgba(mixHex(LAKE.grassDark, LAKE.pinesFar, 0.45), 1)
    firs(ctx, k, x0 - 5, x1 + 5, (x) => hillTop(x, oy - 0.95, 0.32, 5.3), oy - 0.6, 0.09, 31)
    ctx.fillStyle = rgba(mixHex(LAKE.pines, LAKE.grassDark, 0.4), 1)
    firs(ctx, k, x0 - 5, x1 + 5, (x) => oy - 0.9 - 0.06 * (0.5 + 0.5 * Math.sin(x * 0.9)), oy - 0.78, 0.36, 29)
    ctx.fillStyle = rgba(mixHex(LAKE.pines, LAKE.grassDark, 0.2), 1)
    firs(ctx, k, x0 - 5, x1 + 5, () => oy - 0.84, oy - 0.78, 0.44, 37)
  })
  // The lake, bright under the sun, glinting.
  depth(p, k, f, LAWN_CAM, 0.6, () => {
    band(ctx, k, x0 - 5, x1 + 5, oy - 0.84, oy + 4, [
      [0, mixHex(LAKE.lakeLight, LAKE.fog, 0.5), 1],
      [0.04, LAKE.lakeLight, 1],
      [0.16, mixHex(LAKE.lake, LAKE.lakeLight, 0.2), 1],
      [0.4, mixHex(LAKE.lake, LAKE.lakeDeep, 0.2), 1],
      [1, mixHex(LAKE.lake, LAKE.lakeDeep, 0.5), 1],
    ])
    band(ctx, k, x0 - 5, x1 + 5, oy - 0.84, oy - 0.62, [
      [0, mixHex(LAKE.pines, LAKE.lake, 0.5), 0.45],
      [1, mixHex(LAKE.pines, LAKE.lake, 0.5), 0],
    ])
    for (let i = 0; i < 34; i++) {
      const gx = x0 - 2 + (x1 - x0 + 4) * hash(i, 71)
      const gy = oy - 0.72 + 3.2 * Math.pow(hash(i, 72), 1.5)
      const tw = 0.5 + 0.5 * Math.sin(tau * (2.5 + 3 * hash(i, 73)) + i * 2.1)
      soft(ctx, k, gx, gy, 0.1 + 0.26 * hash(i, 74), 0.02 + 0.014 * hash(i, 75), LAKE.fog, 0.85 * tw * tw, 0.3)
    }
  })
  // The lawn: the grass in the sun at its edge, deeper below, the bank's face turned from the sun.
  const grass = mixHex(LAKE.grass, warm, 0.28)
  const deep = mixHex(LAKE.grass, LAKE.grassDark, 0.55)
  const top = (x: number) => oy + lawnY(x - ox)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(X(x0), X(f.y1 + 2))
  for (let x = x0; x <= x1; x += 0.05) ctx.lineTo(X(x), X(top(x)))
  ctx.lineTo(X(x1), X(f.y1 + 2))
  ctx.closePath()
  const g = ctx.createLinearGradient(0, X(oy), 0, X(oy + 2.4))
  g.addColorStop(0, rgba(grass, 1))
  g.addColorStop(0.3, rgba(mixHex(grass, deep, 0.45), 1))
  g.addColorStop(1, rgba(deep, 1))
  ctx.fillStyle = g
  ctx.fill()
  ctx.clip()
  // Light and shade in the grass: soft, long, lying along the ground.
  for (let i = 0; i < 12; i++) {
    const gx = ox - 6 + 16 * hash(i, 91)
    const gy = oy + 0.5 + 1.6 * hash(i, 92)
    soft(ctx, k, gx, gy, 1.2 + hash(i, 93), 0.16 + 0.1 * hash(i, 94), i % 3 ? LAKE.grassDark : warm, i % 3 ? 0.25 : 0.3)
  }
  band(ctx, k, x0, x1, oy + 0.1, oy + 0.4, [
    [0, warm, 0.3],
    [1, warm, 0],
  ])
  soft(ctx, k, ox + BROW + 2.4, oy + 1.8, 2.3, 1.7, LAKE.grassDark, 0.55)
  ctx.restore()
  // The water's edge at the bank's foot.
  soft(ctx, k, ox + SHORE.x + 0.4, oy + SHORE.y - 0.02, 1.3, 0.07, LAKE.lakeLight, 0.6)
  // The grass's edge: one ink line, and tufts along it that move in the air.
  p.push()
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.beginShape()
  for (let x = x0; x <= x1; x += 0.05) p.vertex(X(x), X(top(x)))
  p.endShape()
  p.stroke(mixHex(LAKE.grassDark, LAKE.pines, 0.35))
  p.strokeWeight(Math.max(1, weight * 0.7))
  const first = Math.floor(x0 / 0.23)
  for (let i = first; i * 0.23 < x1; i++) {
    if (hash(i, 81) < 0.4) continue
    const bx = i * 0.23 + 0.12 * hash(i, 82)
    const by = top(bx)
    const sway = 0.028 * Math.sin(tau * 2.1 + bx * 1.7)
    const h = 0.06 + 0.08 * hash(i, 83)
    for (let j = -1; j <= 1; j++) p.line(X(bx + j * 0.022), X(by + 0.004), X(bx + j * 0.042 + sway), X(by - h * (1 - 0.3 * Math.abs(j))))
  }
  p.pop()
  // Their shadows on the grass, down and to the right of each (the sun is high, behind us to the left).
  for (const { x, y, r } of balls) {
    const surf = top(x)
    const h = surf - (y + r)
    soft(ctx, k, x + 0.05 + 0.25 * Math.max(0, h), surf + 0.012, r * (1.35 + h), r * 0.26, LAKE.pines, 0.34 * Math.exp(-Math.max(0, h) / 0.3))
  }
  // The warm light over it all, from the sun behind us to the left.
  soft(ctx, k, f.x0 + 0.5, f.y0 + 0.3, 6.5, 3.8, warm, 0.26)
}

/* ------------------------------------------------------------------ the set */

/**
 * Draw the lake house (or the lawn) at show time `t`, lit by `L`. `balls` are where Louise and Hannah are (centre and
 * radius), for their shadows.
 */
export function drawHouse(p: p5, c: Ctx, t: number, L: Light, balls: Body[]): void {
  const f = frame(p, c.k)
  p.push()
  if (L.kind === 'lawn') lawn(p, c, f, t, balls)
  else room(p, c, f, t, L, balls)
  p.pop()
}

/**
 * The light over everything, the balls too: the window's glare as the sun comes through the fog, up into the white
 * the director's veil takes to the cut.
 */
export function drawGlare(p: p5, c: Ctx, L: Light): void {
  if (L.kind === 'lawn' || L.glare <= 0.002) return
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as C2D
  const g = L.glare
  // The window's own light, white, spilling past its frame into the room.
  // Centred on the sun where its layer of the view shows it from here (the first frame's camera: where it is).
  soft(ctx, k, viewX(f, 0.78, SUN[0]), SUN[1] + 0.4, 7.5, 3.6, LAKE.fog, 0.85 * g * g, 0.35)
  ctx.fillStyle = rgba(LAKE.fog, 0.55 * g * g * g)
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
}
