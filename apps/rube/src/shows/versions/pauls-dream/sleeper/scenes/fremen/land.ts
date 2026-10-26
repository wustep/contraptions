import { R } from '../../../../../../parts'
import { blob, cover, drift, fill, hash, mix, rgba, smooth, vgrad, type Paint, type Pt, type View } from '../../paint'
import { between, crest, hazeAt, type Air, type Range } from '../../world/desert'
import { HARKONNEN, drawThopter, drawThopterOver, thopterLook, type ThopterPose } from '../../craft/thopter'
import { FACES, SPOT, ground } from './ground'

/**
 * The Fremen's country at dawn: the great rocks of red sandstone standing out of the sand to the west, the open erg to
 * the east toward the sun, the near sand the people are on, and the stolen thopter at the foot of the nearest rock.
 *
 * The far things are drawn through a camera that dollies (a thing `d` cells back is `h / (h + d)` of its size) and that
 * can tilt up: `tilt` lowers the horizon in the frame by that share of the frame's height, for a shot that looks up at
 * someone on a crest against a big sky. The near sand is drawn over the balls, so one rising out of it is under it
 * until it is up.
 */

/** The first light: rose over the rocks, the sun just up in the east. */
export const FIRST: Air = {
  zenith: '#A99AA3',
  horizon: '#F2D2B0',
  haze: '#E8C8A6',
  sand: '#CC8C58',
  shade: '#80502F',
  sun: { x: 0.82, up: 0.15, r: 0.05, color: '#FFF1DA' },
}

/** The morning they go on into: the sky paled, the sun up. */
export const MORNING: Air = {
  zenith: '#C3B4A4',
  horizon: '#F4E1C3',
  haze: '#EEDCBE',
  sand: '#D59C64',
  shade: '#946038',
  sun: { x: 0.82, up: 0.24, r: 0.043, color: '#FFF7E8' },
}

/** The air at `t`: the first light through the fight, paling into the morning over the walk and the worm. */
export const airAt = (t: number): Air => between(FIRST, MORNING, smooth(t, 352, 412))

/* ------------------------------------------------------------------ the camera's tilt */

let tiltKeys: [number, number, boolean][] = [[0, 0, false]]

/** [t, tilt, cut]: the horizon's drop below the frame's middle (a share of its height), eased between keys, jumping on a cut. */
export function setTilt(keys: [number, number, boolean][]): void {
  tiltKeys = [...keys].sort((a, b) => a[0] - b[0])
}

export function tiltAt(t: number): number {
  const k = tiltKeys
  if (t <= k[0][0]) return k[0][1]
  for (let i = 0; i + 1 < k.length; i++) {
    const [ta, a] = k[i]
    const [tb, b, cut] = k[i + 1]
    if (t < tb) {
      if (cut) return a
      return a + (b - a) * smooth(t, ta, tb)
    }
  }
  return k[k.length - 1][1]
}

/** The composed 16:9 frame's height in cells (a tall stage shows more round it; the far field is fitted to the frame). */
const frameH = (v: View): number => Math.min(v.h, (v.w * 9) / 16)

export interface Far {
  s: number
  /** The horizon's height in the world (cells). */
  e: number
  x(x: number): number
  y(y: number): number
  pt(p: Pt): Pt
}

/** The projection of a layer `d` cells back, through the camera as it is at `t`. */
export function far(g: Paint, d: number): Far {
  const v = g.view
  const h = frameH(v)
  const s = h / (h + Math.max(-0.9 * h, d))
  const e = v.cy + tiltAt(g.t) * h
  const x = (a: number) => v.cx + (a - v.cx) * s
  const y = (b: number) => e + (b - e) * s
  return { s, e, x, y, pt: ([a, b]) => [x(a), y(b)] }
}

/* ------------------------------------------------------------------ the sky */

export function drawSky(g: Paint, air: Air): void {
  const v = g.view
  const h = frameH(v)
  const e = far(g, 1e6).e
  cover(g, vgrad(g.ctx, e - h * 1.6, e, [[0, air.zenith], [0.7, mix(air.zenith, air.horizon, 0.62)], [1, air.horizon]]))
  // Under the horizon (seen only past the last range, on a tall stage) the haze goes on down.
  g.ctx.fillStyle = air.haze
  g.ctx.fillRect(v.x0 - 1, e, v.w + 2, Math.max(0, v.y1 - e) + 1)
  if (air.sun) {
    g.ctx.beginPath()
    g.ctx.arc(v.cx + (air.sun.x - 0.5) * (h * 16) / 9, e - h * air.sun.up, h * air.sun.r, 0, Math.PI * 2)
    fill(g.ctx, air.sun.color)
  }
}

/* ------------------------------------------------------------------ the erg */

/** Something moving under a range's sand, by depth: how much higher its crest stands at near-plane `x`, time `t`. */
const swells = new Map<number, (x: number, t: number) => number>()
export function setSwell(d: number, fn: (x: number, t: number) => number): void {
  swells.set(d, fn)
}

/** One range of dunes through the tilted camera: lighter at its crest, its own shade at its foot, into the haze by depth. */
export function drawRange(g: Paint, air: Air, r: Range): void {
  const swell = swells.get(r.d)
  const v = g.view
  const L = far(g, r.d)
  const hz = r.haze ?? hazeAt(r.d)
  const lit = mix(air.sand, air.haze, hz)
  // Its foot only a little darker than its crest: a range is told from the one behind it by its crest, not by a band.
  const dark = mix(mix(air.shade, air.haze, Math.min(0.95, hz * 1.04)), lit, 0.45)
  const step = Math.max(r.len / 40, (6 * g.px) / L.s)
  const xa = v.cx + (v.x0 - v.cx) / L.s - step
  const xb = v.cx + (v.x1 - v.cx) / L.s + step
  const ctx = g.ctx
  ctx.beginPath()
  const foot = Math.max(v.y1 + 1, L.y(r.base) + 1)
  ctx.moveTo(L.x(xa), foot)
  let top = Infinity
  for (let x = xa; x <= xb + 1e-9; x += step) {
    const [px, py] = L.pt([x, crest(r, x) - (swell ? swell(x, g.t) : 0)])
    ctx.lineTo(px, py)
    top = Math.min(top, py)
  }
  ctx.lineTo(L.x(xb), foot)
  ctx.closePath()
  const rise = Math.max(1e-3, L.y(r.base) - top)
  fill(ctx, vgrad(ctx, top, top + rise * 1.7, [[0, lit], [1, dark]]))
}

/** The erg's ranges, far to near. */
export const RANGES: Range[] = [
  { d: 900, base: 0, amp: 36, len: 700, seed: 11 },
  { d: 380, base: 0, amp: 18, len: 300, seed: 12 },
  { d: 150, base: 0, amp: 8, len: 130, seed: 13 },
  { d: 60, base: 0, amp: 4.0, len: 60, seed: 14 },
  { d: 25, base: 0, amp: 1.4, len: 34, seed: 15 },
  { d: 11, base: 0, amp: 1.2, len: 16, seed: 16 },
]

/* ------------------------------------------------------------------ the rocks */

/**
 * The jebels: [x, width, height, depth, seed]. Wadi Rum's: walls nearly straight up out of the sand, tops worn into a
 * few domes, a crack or two down the face, the east face in the sun and the rest in their own shade. Far enough back
 * that they keep to the skyline (a thing far back keeps its size on the screen however close the camera comes), and
 * standing on ground that goes on under them, so no foot of one is ever seen.
 */
const ROCKS: [number, number, number, number, number][] = [
  [1030, 210, 70, 520, 1],
  [1095, 60, 34, 210, 2],
  [1128, 44, 28, 150, 3],
  [1152, 26, 17, 72, 4],
]

const ROCK_LIT = '#B5643F'
const ROCK_SHADE = '#5E3125'

function drawRock(g: Paint, air: Air, [x, w, h, d, seed]: [number, number, number, number, number]): void {
  const L = far(g, d)
  const hz = Math.min(0.88, hazeAt(d) * 1.15)
  const lit = mix(ROCK_LIT, air.haze, hz)
  const shade = mix(ROCK_SHADE, air.haze, hz * 0.95)
  const ctx = g.ctx
  const half = w / 2
  const domes = 3
  // The outline: up the west wall, over the domes, down the east wall, and on down under the sand.
  const top: Pt[] = []
  for (let i = 0; i <= domes * 6; i++) {
    const u = i / (domes * 6)
    const dome = Math.abs(Math.sin(u * Math.PI * domes)) * (0.06 + 0.04 * hash(seed, Math.floor(u * domes)))
    const fall = Math.pow(Math.abs(u - 0.5) * 2, 6) * 0.18
    top.push([x - half * 0.92 + u * w * 0.92, -h * (0.9 + dome - fall)])
  }
  const outline: Pt[] = [[x - half, 40], [x - half * 1.0, -h * 0.55], ...top, [x + half * 1.0, -h * 0.5], [x + half, 40]]
  const pts = outline.map(L.pt)
  ctx.beginPath()
  pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)))
  ctx.closePath()
  fill(ctx, shade)
  // The east face: the right part of the mass, its edge a soft line down from the last dome.
  const split = x + half * (0.15 + 0.2 * hash(seed, 9))
  const face: Pt[] = [...top.filter(([px]) => px >= split), [x + half * 1.0, -h * 0.5], [x + half, 40], [split + half * 0.1, 40], [split - half * 0.05, -h * 0.5]]
  const fp = face.map(L.pt)
  ctx.beginPath()
  fp.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)))
  ctx.closePath()
  fill(ctx, lit)
  // Two cracks down the lit face, the wall's own shadow in them.
  ctx.strokeStyle = rgba(shade, 0.6)
  ctx.lineWidth = Math.max(1.25 * g.px, w * 0.012 * L.s)
  for (const k of [0.45, 0.75]) {
    const cx = split + (x + half - split) * k
    const [ax, ay] = L.pt([cx, -h * 0.86])
    const [bx, by] = L.pt([cx + w * 0.02, -h * 0.2])
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ the near ground */

/** The near sand: the profile and everything under it, over the balls. */
export function drawSand(g: Paint, air: Air): void {
  const v = g.view
  const ctx = g.ctx
  const step = Math.max(0.12, 4 * g.px)
  const x0 = v.x0 - 1
  const x1 = v.x1 + 1
  const bottom = v.y1 + 1
  ctx.beginPath()
  ctx.moveTo(x0, bottom)
  let top = Infinity
  for (let x = x0; x <= x1 + 1e-9; x += step) {
    const y = ground(x)
    ctx.lineTo(x, y)
    top = Math.min(top, y)
  }
  ctx.lineTo(x1, bottom)
  ctx.closePath()
  const lit = mix(air.sand, '#FFFFFF', 0.05)
  fill(ctx, vgrad(ctx, top, top + 7, [[0, lit], [1, mix(air.sand, air.shade, 0.4)]]))
  // Each dune's west face in its own shade: the surface from the foot up to the crest, and from the crest a curve back
  // down through the dune's body to the foot, so the face is a shape and not a band along the top.
  const shade = mix(air.sand, air.shade, 0.42)
  for (const [foot, crestX] of FACES) {
    if (crestX < v.x0 - 2 || foot > v.x1 + 2) continue
    const cy = ground(crestX)
    const fy = ground(foot)
    const w = crestX - foot
    const h = fy - cy
    ctx.beginPath()
    ctx.moveTo(foot, fy + 0.02)
    for (let x = foot; x <= crestX + 1e-9; x += Math.max(0.1, w / 60)) ctx.lineTo(x, ground(x))
    ctx.lineTo(crestX, cy)
    // Back from the crest to the foot under the surface: the shaded face as a crescent, deepest under the crest.
    ctx.bezierCurveTo(crestX - w * 0.06, cy + h * 1.1, foot + w * 0.45, fy + h * 0.55, foot, fy + 0.02)
    ctx.closePath()
    fill(ctx, vgrad(ctx, cy, fy + h * 0.8, [[0, shade], [1, mix(shade, air.shade, 0.2)]]))
  }
}


/**
 * The wind off the crests: a thin veil of sand lifted off each crest and carried west, never still, never a particle.
 * Over everything at the crest, faint enough that someone standing in it is only softened by it.
 */
function drawWind(g: Paint, air: Air): void {
  const ctx = g.ctx
  const sand = mix(air.sand, '#FFF6E6', 0.3)
  for (const [, crestX] of FACES) {
    if (crestX < g.view.x0 - 6 || crestX > g.view.x1 + 8) continue
    const cy = ground(crestX)
    const len = 2.6 + 0.6 * drift(g.t * 0.35, crestX)
    const lift = 0.35 + 0.15 * drift(g.t * 0.5 + 3, crestX)
    const wave = (u: number) => 0.12 * Math.sin(u * 5 - g.t * 2.1) * u
    const top: Pt[] = []
    const bot: Pt[] = []
    for (let i = 0; i <= 16; i++) {
      const u = i / 16
      const x = crestX - 0.28 - u * len
      const mid = cy - 0.05 - lift * u * u + wave(u)
      const half = 0.03 + 0.16 * u
      top.push([x, mid - half])
      bot.push([x, mid + half * 0.6])
    }
    ctx.beginPath()
    ;[...top, ...bot.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    const gr = ctx.createLinearGradient(crestX, 0, crestX - len, 0)
    gr.addColorStop(0, rgba(sand, 0.28))
    gr.addColorStop(1, rgba(sand, 0))
    fill(ctx, gr)
  }
}

/** The boulders the Fremen stand on and come up behind: [x, width, height]. Drawn over the balls. */
export const BOULDERS: [number, number, number][] = [[1177.6, 1.7, 0.75]]

/** The top of boulder `i` at its middle (where one stands on it). */
export const boulderTop = (i: number): number => ground(BOULDERS[i][0]) - BOULDERS[i][2]

function drawBoulders(g: Paint, air: Air): void {
  const ctx = g.ctx
  for (const [x, w, h] of BOULDERS) {
    const base = ground(x)
    const pts: Pt[] = [
      [x - w / 2, base + 1.2],
      [x - w * 0.48, base - h * 0.55],
      [x - w * 0.3, base - h * 0.95],
      [x + w * 0.05, base - h],
      [x + w * 0.35, base - h * 0.9],
      [x + w * 0.5, base - h * 0.45],
      [x + w / 2, base + 1.2],
    ]
    blob(ctx, pts)
    fill(ctx, mix(mix(ROCK_SHADE, air.shade, 0.3), air.sand, 0.3))
    blob(ctx, [[x + w * 0.02, base - h * 0.98], [x + w * 0.35, base - h * 0.9], [x + w * 0.5, base - h * 0.45], [x + w / 2, base + 1.2], [x + w * 0.12, base + 1.2], [x + w * 0.08, base - h * 0.5]])
    fill(ctx, mix(ROCK_LIT, air.sand, 0.2))
  }
}

/* ------------------------------------------------------------------ the thopter they came in */

export const THOPTER: ThopterPose = { x: SPOT.thopter, y: ground(SPOT.thopter) - 0.6, face: 1, pitch: 0 }
const LANDED = thopterLook(HARKONNEN, 0, 0, 1)

/* ------------------------------------------------------------------ the whole of it */

/**
 * The dune behind the landing: one broad swell a few cells back from the flat where the thopter comes down and Jamis is
 * fought, so a camera standing a little above them sees sand rising behind them to the skyline, and not a flat line
 * across the middle of the frame. It stands only behind the basin: the scene shows it only while its camera is there.
 */
export const BASIN_D = 5
export function drawBasin(g: Paint, air: Air): void {
  const L = far(g, BASIN_D)
  const v = g.view
  const lit = mix(air.sand, air.haze, 0.26)
  const dark = mix(mix(air.sand, air.shade, 0.25), air.haze, 0.22)
  const hump = (x: number) => {
    const u = (x - 1163.5) / 15
    return 2.0 * Math.exp(-u * u * 1.1) * (1 + 0.1 * Math.sin(x * 0.31))
  }
  const ctx = g.ctx
  const xa = v.cx + (v.x0 - v.cx) / L.s - 1
  const xb = v.cx + (v.x1 - v.cx) / L.s + 1
  const step = Math.max(0.2, (5 * g.px) / L.s)
  const foot = v.y1 + 1
  ctx.beginPath()
  ctx.moveTo(L.x(xa), foot)
  let top = Infinity
  for (let x = xa; x <= xb + 1e-9; x += step) {
    const [px, py] = L.pt([x, -hump(x)])
    ctx.lineTo(px, py)
    top = Math.min(top, py)
  }
  ctx.lineTo(L.x(xb), foot)
  ctx.closePath()
  // Darkest low on its face, and at its foot halfway back toward the floor's own light; below that, the basin's floor
  // coming toward us, all the way to the floor's own light where they stand, so the sand under them is one surface and
  // there is no line at their feet.
  const floor = mix(air.sand, '#FFFFFF', 0.05)
  const near = Math.max(L.y(0) + 0.5, 0)
  const k = (L.y(0) - top) / (near - top)
  fill(ctx, vgrad(ctx, top, near, [[0, lit], [0.7 * k, dark], [k, mix(dark, floor, 0.5)], [1, floor]]))
}

/** Everything behind the people, far to near: the sky and sun, the erg and the jebels in depth order, `extra` things
 * standing out there at their own depths (the worm), the thopter. With `floor`, the near sand too, under the people, so
 * they stand on it (the basin, seen from a little above): it is never a band across their feet. */
export function drawBack(g: Paint, extra: [number, (g: Paint, air: Air) => void][] = [], floor = false): void {
  const air = airAt(g.t)
  drawSky(g, air)
  const layers: [number, () => void][] = [
    ...RANGES.map((r): [number, () => void] => [r.d, () => drawRange(g, air, r)]),
    ...ROCKS.map((r): [number, () => void] => [r[3] + 0.5, () => drawRock(g, air, r)]),
    ...extra.map(([d, fn]): [number, () => void] => [d - 0.5, () => fn(g, air)]),
  ]
  layers.sort((a, b) => b[0] - a[0])
  for (const [, fn] of layers) fn()
  if (floor) drawSand(g, air)
  drawThopter(g, THOPTER, LANDED)
}

/**
 * Everything in front of them: the thopter's glass, the near sand, the boulders. With `floor` (the near sand already
 * under them), the sand is laid over them again only where something is still in it: at `rises` ([x, size, up]),
 * someone coming up out of it until they are up, and round the boulders' feet. The same sand, so no seam shows.
 */
export function drawFront(g: Paint, floor = false, rises: [number, number, number][] = []): void {
  const air = airAt(g.t)
  const ctx = g.ctx
  drawThopterOver(g, THOPTER, LANDED)
  // The boulders before the sand, so their feet are in it and never seen.
  drawBoulders(g, air)
  if (floor) {
    ctx.save()
    ctx.beginPath()
    const bottom = g.view.y1 + 1
    for (const [x, size, up] of rises) {
      if (g.t >= up) continue
      const half = R * size * 1.3
      ctx.rect(x - half, ground(x) - 0.02, 2 * half, bottom - ground(x))
    }
    for (const [x, w] of BOULDERS) ctx.rect(x - w / 2 - 0.1, ground(x) - 0.3, w + 0.2, bottom - ground(x) + 0.3)
    ctx.clip()
    drawSand(g, air)
    ctx.restore()
  } else drawSand(g, air)
  drawWind(g, air)
}
