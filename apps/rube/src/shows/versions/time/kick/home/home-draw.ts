import type p5 from 'p5'
import { FLOOR, mixHex, type Pt } from '../../../../../parts'
import { pool, rgba, top } from '../cast'
import { frame, hash, smooth, type Ctx } from '../kit'
import { LAST } from '../music'
import { HOME, HOME_THEME, TOP } from '../worlds'
import { CHAIRS, COUNTER, GARDEN, GLASS, HOLD, HOUSE, SUN_CAM, TABLE, TICKS, TOP_AT, cobbAt, frontDoor, glassDoor, kidX, swingAngle, topAt, turned } from './home-plan'

/**
 * Home, drawn: the house cut open side-on on a bright morning (the porch, the hall, the kitchen table and its chairs,
 * the counter, the glass doors), and the garden beyond the doors (the terrace, the lawn, the wall round it, the tree
 * and its swing, the sun low behind). Everything is drawn from show time; the part draws nothing of its own.
 *
 * The house and its things are flat fills and one ink; the sky, the sun, its light on the floor and through the doors,
 * and the far trees are soft. One warm light: the morning, low in the garden, coming in through the glass doors.
 */

type C2D = CanvasRenderingContext2D
type Frame = ReturnType<typeof frame>

const INK = HOME_THEME.ink
/** The morning sun's light: a little warmer than its white. */
const SUNLIGHT = mixHex(HOME.sun, HOME.floor, 0.22)
/** A wall cut through (the section's fill). */
const CUT = mixHex(HOME.wallShade, HOME.floorShade, 0.5)
/** The ground, cut: under the house and the lawn. */
const SOIL = mixHex(HOME.floorShade, HOME.wallShade, 0.3)
const BARK = mixHex(HOME.floorShade, INK, 0.4)
const WOOD = mixHex(HOME.table, HOME.floor, 0.45)
const DOORWOOD = mixHex(HOME.table, HOME.floor, 0.3)
const CABINET = mixHex(HOME.wall, HOME.glass, 0.3)
const STONE = mixHex(HOME.wallShade, HOME.wall, 0.4)
/** The garden wall's face, in the shade of the sun behind it, and its coping, lit. */
const WALL = mixHex(mixHex(HOME.wall, HOME.wallShade, 0.7), HOME.sky, 0.18)
const COPING = mixHex(HOME.wall, HOME.sun, 0.5)
const LEAVES = mixHex(HOME.lawnDark, HOME.tree, 0.55)

/* ------------------------------------------------------------------ small tools */

function shape(ctx: C2D, k: number, pts: Pt[], fill: string | CanvasGradient | null, ink?: string, lw = 0): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (ink && lw > 0) {
    ctx.strokeStyle = ink
    ctx.lineWidth = lw
    ctx.stroke()
  }
}
const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]
function fillBox(ctx: C2D, k: number, x0: number, y0: number, x1: number, y1: number, fill: string | CanvasGradient): void {
  ctx.fillStyle = fill
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}
function line(ctx: C2D, k: number, a: Pt, b: Pt, ink: string, lw: number): void {
  ctx.beginPath()
  ctx.moveTo(a[0] * k, a[1] * k)
  ctx.lineTo(b[0] * k, b[1] * k)
  ctx.strokeStyle = ink
  ctx.lineWidth = lw
  ctx.stroke()
}
/** A vertical gradient from `y0` to `y1` through `stops` ([at, colour, alpha]). */
function vgrad(ctx: C2D, k: number, y0: number, y1: number, stops: [number, string, number][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [at, c, a] of stops) g.addColorStop(at, rgba(c, a))
  return g
}
/**
 * A soft round light that falls off smoothly (a gaussian in many stops, so a big faint one shows no rings): the sun's
 * glow, the glare.
 */
function glow(ctx: C2D, k: number, at: Pt, r: number, color: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const [x, y] = [at[0] * k, at[1] * k]
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * k)
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    g.addColorStop(u, rgba(color, a * Math.exp(-4.2 * u * u) * (1 - u * u * u)))
  }
  ctx.fillStyle = g
  ctx.fillRect(x - r * k, y - r * k, 2 * r * k, 2 * r * k)
}
/** A soft mass of leaves: a lobed blob about (cx, cy), `rx` by `ry`, its lobes stirring a little. */
function foliage(ctx: C2D, k: number, cx: number, cy: number, rx: number, ry: number, seed: number, t: number, fill: string, flatBottom = false): void {
  ctx.beginPath()
  const n = 36
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const lobe = 1 + 0.1 * Math.abs(Math.sin(a * 3.5 + seed)) + 0.07 * Math.abs(Math.sin(a * 6.5 + seed * 1.7)) + 0.015 * Math.sin(a * 5 + t * 0.9 + seed)
    const x = cx + Math.cos(a) * rx * lobe + 0.02 * Math.sin(t * 0.7 + seed + a)
    let y = cy + Math.sin(a) * ry * lobe
    if (flatBottom) y = Math.min(y, cy)
    if (i) ctx.lineTo(x * k, y * k)
    else ctx.moveTo(x * k, y * k)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}
/** Far things move by `d` of the camera's own move from `SUN_CAM` (0: on the scene, 1: at infinity). */
const far = (f: Frame, d: number): Pt => [d * (f.cx - SUN_CAM[0]), d * (f.cy - SUN_CAM[1])]
/** The sun, where the camera sees it now. */
function sunAt(f: Frame): Pt {
  const [ox, oy] = far(f, 0.8)
  return [GARDEN.sun[0] + ox, GARDEN.sun[1] + oy]
}

/* ------------------------------------------------------------------ outside */

function sky(ctx: C2D, k: number, f: Frame): void {
  const g = ctx.createLinearGradient(0, -6 * k, 0, -0.8 * k)
  g.addColorStop(0, HOME.sky)
  g.addColorStop(0.6, mixHex(HOME.sky, HOME.sun, 0.55))
  g.addColorStop(1, mixHex(HOME.sky, HOME.sun, 0.9))
  fillBox(ctx, k, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, g)
}

/**
 * A line of far trees over the garden wall: crowns of many sizes, overlapping, flat with the morning haze, and here and
 * there a palm standing over them (it is Los Angeles).
 */
function farTrees(ctx: C2D, k: number, f: Frame, d: number, base: number, h: number, color: string, seed: number, palms: boolean): void {
  const [ox, oy] = far(f, d)
  const x0 = f.x0 - 1.5 - ox
  const x1 = f.x1 + 1.5 - ox
  ctx.save()
  ctx.translate(ox * k, oy * k)
  ctx.fillStyle = color
  // Its body runs well down behind the wall: the layer rides up with the camera (most under Zoom), and a body that
  // stopped just under its base showed a strip of sky between it and the wall's top.
  ctx.fillRect(x0 * k, (base - h * 0.35) * k, (x1 - x0) * k, (h * 0.35 + 3) * k)
  const step = 0.3
  for (let i = Math.floor(x0 / step) - 3; i <= Math.ceil(x1 / step) + 3; i++) {
    const r1 = hash(i, seed, 1)
    const r2 = hash(i, seed, 2)
    const cx = i * step + (r1 - 0.5) * step
    // Stands of trees: a slow swell along the line, and within it crowns of every size.
    const stand = 0.5 + 0.3 * Math.sin(i * step * 0.62 + seed) + 0.2 * Math.sin(i * step * 1.7 + seed * 2.1)
    const rx = h * (0.3 + 0.22 * r2) * (0.75 + 0.4 * stand)
    const ry = rx * (0.72 + 0.2 * hash(i, seed, 3))
    const cy = base - h * (0.3 + 0.45 * stand * (0.8 + 0.2 * hash(i, seed, 4)))
    ctx.beginPath()
    ctx.ellipse(cx * k, cy * k, rx * k, ry * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  if (palms) {
    // Two far palms over the garden's left, a little apart, leaning a little: small with distance.
    ctx.strokeStyle = color
    for (const [px, ph, lean] of [[6.55, 0.74, -0.05], [7.3, 0.88, 0.04]] as const) {
      ctx.lineWidth = 0.035 * k
      ctx.beginPath()
      ctx.moveTo(px * k, base * k)
      ctx.quadraticCurveTo((px + lean * 0.3) * k, (base - ph * 0.5) * k, (px + lean) * k, (base - ph) * k)
      ctx.stroke()
      ctx.lineWidth = 0.028 * k
      for (let j = 0; j < 7; j++) {
        const a = -Math.PI / 2 + (j - 3) * 0.45
        const L = 0.24 + 0.05 * hash(j, px, 11)
        ctx.beginPath()
        ctx.moveTo((px + lean) * k, (base - ph) * k)
        ctx.quadraticCurveTo((px + lean + Math.cos(a) * L * 0.6) * k, (base - ph + Math.sin(a) * L * 0.6 - 0.05) * k, (px + lean + Math.cos(a) * L) * k, (base - ph + Math.sin(a) * L * 0.45 + 0.1) * k)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

/** The garden: the wall round it, the terrace and the lawn, the tree, the swing. */
function garden(ctx: C2D, k: number, f: Frame, t: number, w: number): void {
  const x0 = HOUSE.end[1]
  const x1 = f.x1 + 1
  if (x1 <= x0) return
  const sun = sunAt(f)
  // The wall round the garden, in its own shade; its coping catching the sun along its top.
  fillBox(ctx, k, x0, GARDEN.wall, x1, GARDEN.back, vgrad(ctx, k, GARDEN.wall, GARDEN.back, [[0, WALL, 1], [1, mixHex(WALL, HOME.lawnDark, 0.3), 1]]))
  shape(ctx, k, box(x0, GARDEN.wall - 0.08, x1 + 1, GARDEN.wall), COPING, INK, w * 0.6)
  // Shrubs of many sizes at its foot.
  const shrubs: [number, number, number][] = [[6.9, 0.55, 0.42], [8.35, 0.9, 0.55], [11.9, 1.1, 0.72], [13.6, 0.6, 0.4], [15.4, 1.0, 0.62], [17.6, 0.7, 0.5], [19.5, 1.2, 0.7]]
  shrubs.forEach(([cx, rx, ry], i) => {
    if (cx + rx < f.x0 - 1 || cx - rx > f.x1 + 1) return
    foliage(ctx, k, cx, GARDEN.back + 0.03, rx, ry, i * 1.9, t, LEAVES, true)
  })
  // The ground: the terrace's stone by the doors, then the lawn, glowing where the low sun comes through the grass.
  fillBox(ctx, k, x0, GARDEN.back, GARDEN.terrace, FLOOR, vgrad(ctx, k, GARDEN.back, FLOOR, [[0, mixHex(STONE, HOME.wallShade, 0.5), 1], [1, STONE, 1]]))
  const lawn = ctx.createLinearGradient((sun[0] - 5) * k, 0, (sun[0] + 5) * k, 0)
  lawn.addColorStop(0, HOME.lawn)
  lawn.addColorStop(0.5, mixHex(HOME.lawn, HOME.sun, 0.62))
  lawn.addColorStop(1, HOME.lawn)
  fillBox(ctx, k, GARDEN.terrace, GARDEN.back, x1, FLOOR, lawn)
  fillBox(ctx, k, GARDEN.terrace, GARDEN.back, x1, FLOOR, vgrad(ctx, k, GARDEN.back, FLOOR, [[0, HOME.lawnDark, 0.45], [0.35, HOME.lawnDark, 0], [1, HOME.lawnDark, 0]]))
  // The low sun through the grass behind the children: a warm glare along the lawn.
  ctx.save()
  ctx.translate(sun[0] * k, (GARDEN.back + 0.12) * k)
  ctx.scale(1, 0.16)
  glow(ctx, k, [0, 0], 3.0, HOME.sun, 0.75)
  ctx.restore()
  // The lawn comes on toward us, richer in the house's shade; the terrace's stone with it.
  const near = vgrad(ctx, k, FLOOR - 0.02, FLOOR + 2.2, [[0, mixHex(HOME.lawn, HOME.sun, 0.12), 1], [0.35, HOME.lawn, 1], [1, mixHex(HOME.lawnDark, HOME.tree, 0.45), 1]])
  fillBox(ctx, k, GARDEN.terrace, FLOOR, x1, f.y1 + 1, near)
  fillBox(ctx, k, x0, FLOOR, GARDEN.terrace, f.y1 + 1, vgrad(ctx, k, FLOOR, FLOOR + 2.2, [[0, STONE, 1], [1, mixHex(STONE, HOME.wallShade, 0.6), 1]]))
  // The terrace is laid stone: its courses widening as they come toward us, each slab's joint a half step from the
  // course behind's.
  {
    const rows = [GARDEN.back, -0.17, FLOOR, FLOOR + 0.42, FLOOR + 1.0, FLOOR + 1.75, FLOOR + 2.7]
    ctx.save()
    ctx.strokeStyle = rgba(HOME.wallShade, 0.55)
    ctx.lineWidth = Math.max(1, w * 0.35)
    ctx.beginPath()
    rows.forEach((y, i) => {
      if (i > 0) {
        ctx.moveTo(x0 * k, y * k)
        ctx.lineTo(GARDEN.terrace * k, y * k)
      }
      const next = rows[i + 1]
      if (next === undefined) return
      const slab = 0.36 + 0.12 * i
      for (let x = x0 + (i % 2 ? slab / 2 : slab); x < GARDEN.terrace - 0.08; x += slab) {
        ctx.moveTo(x * k, y * k)
        ctx.lineTo(x * k, next * k)
      }
    })
    ctx.stroke()
    ctx.restore()
  }
  fillBox(ctx, k, GARDEN.terrace - 0.03, GARDEN.back, GARDEN.terrace + 0.03, f.y1 + 1, rgba(HOME.lawnDark, 0.35))
  tree(ctx, k, f, t, w)
  swing(ctx, k, t, w)
}

/** The tree: a trunk from the lawn, a branch reaching over it for the swing, and its crown, stirring. */
function tree(ctx: C2D, k: number, f: Frame, t: number, w: number): void {
  const X = GARDEN.tree
  if (X + 4 < f.x0 || X - 4 > f.x1) return
  const [sx, sy] = GARDEN.swing
  foliage(ctx, k, X + 0.4, -3.6, 2.6, 1.3, 1.3, t, mixHex(HOME.tree, INK, 0.16))
  const trunk: Pt[] = [
    [X - 0.28, -0.16],
    [X - 0.15, -0.34],
    [X - 0.13, -1.62],
    [X - 0.28, -1.92],
    [sx + 0.3, sy - 0.07],
    [sx - 0.3, sy - 0.1],
    [sx - 0.28, sy + 0.02],
    [sx + 0.3, sy + 0.05],
    [X - 0.22, -1.78],
    [X - 0.02, -1.72],
    [X + 0.12, -2.7],
    [X + 0.26, -2.7],
    [X + 0.15, -1.62],
    [X + 0.17, -0.34],
    [X + 0.32, -0.16],
  ]
  shape(ctx, k, trunk, BARK, INK, w * 0.8)
  foliage(ctx, k, X + 0.6, -3.45, 2.25, 1.08, 4.1, t, HOME.tree)
  // Its lower leaves, lit from under by the low sun.
  foliage(ctx, k, X - 0.5, -2.78, 1.3, 0.48, 2.2, t, mixHex(HOME.tree, HOME.lawn, 0.5))
  foliage(ctx, k, X + 1.5, -2.72, 1.0, 0.42, 5.2, t, mixHex(HOME.tree, HOME.lawn, 0.35))
}

/** The empty swing: two ropes from the branch and a plank seat (as in his memory of it), swaying a little. */
function swing(ctx: C2D, k: number, t: number, w: number): void {
  const [px, py] = GARDEN.swing
  const a = swingAngle(t)
  const L = GARDEN.rope
  const sx = px + Math.sin(a) * L
  const sy = py + Math.cos(a) * L
  for (const d of [-0.18, 0.18]) line(ctx, k, [px + d, py], [sx + d, sy], INK, w * 0.5)
  shape(ctx, k, box(sx - 0.26, sy - 0.03, sx + 0.26, sy + 0.045), WOOD, INK, w * 0.6)
}

/** In front of the house: the porch's stone, and a hedge along the front garden. */
function porch(ctx: C2D, k: number, f: Frame, t: number, w: number): void {
  const x1 = HOUSE.front[0]
  const x0 = f.x0 - 1
  if (x0 >= x1) return
  for (let i = 0; i < 6; i++) {
    const cx = x1 - 0.5 - i * 1.25 - 0.3 * hash(i, 21)
    if (cx < x0 - 1.5) break
    foliage(ctx, k, cx, HOUSE.back, 0.75 + 0.3 * hash(i, 22), 0.75 + 0.25 * hash(i, 23), i * 3.1, t, LEAVES, true)
  }
  fillBox(ctx, k, x0, HOUSE.back, x1, FLOOR, vgrad(ctx, k, HOUSE.back, FLOOR, [[0, mixHex(STONE, HOME.wallShade, 0.5), 1], [1, STONE, 1]]))
  fillBox(ctx, k, x0, FLOOR, x1, f.y1 + 1, vgrad(ctx, k, FLOOR, FLOOR + 2.2, [[0, STONE, 1], [1, mixHex(STONE, HOME.wallShade, 0.6), 1]]))
  void w
}

/* ------------------------------------------------------------------ the house */

function house(ctx: C2D, k: number, f: Frame, t: number, w: number): void {
  const [fx0, fx1] = HOUSE.front
  const [ex0, ex1] = HOUSE.end
  const slabTop = HOUSE.ceil - 0.28
  const foot = FLOOR + HOUSE.slab
  // The ground under everything, cut: warm, darkening as it goes down.
  shape(ctx, k, box(fx0, FLOOR, ex1, f.y1 + 1), vgrad(ctx, k, FLOOR, FLOOR + 3, [[0, SOIL, 1], [1, mixHex(HOME.floorShade, INK, 0.2), 1]]), INK, w * 0.8)
  ground(ctx, k, f, w, foot)
  // The roof: its section, eave to eave, and the loft inside it.
  const e = HOUSE.eave
  const mid = (fx0 + ex1) / 2
  shape(ctx, k, [[fx0 - e, slabTop + 0.06], [mid, HOUSE.ridge], [ex1 + e, slabTop + 0.06], [ex1 + e, slabTop + 0.22], [mid, HOUSE.ridge + 0.32], [fx0 - e, slabTop + 0.22]], mixHex(HOME.floorShade, INK, 0.3), INK, w)
  shape(ctx, k, [[fx0 + 0.1, slabTop], [mid, HOUSE.ridge + 0.34], [ex1 - 0.1, slabTop]], mixHex(CUT, INK, 0.3))
  // The back wall inside, in the morning's soft shade: warmer toward the glass doors, dimmer under the ceiling.
  const wall = ctx.createLinearGradient(fx1 * k, 0, ex0 * k, 0)
  wall.addColorStop(0, mixHex(HOME.wall, HOME.wallShade, 0.78))
  wall.addColorStop(0.6, mixHex(HOME.wall, HOME.wallShade, 0.62))
  wall.addColorStop(1, mixHex(HOME.wall, HOME.wallShade, 0.45))
  fillBox(ctx, k, fx1, HOUSE.ceil, ex0, HOUSE.back, wall)
  fillBox(ctx, k, fx1, HOUSE.ceil, ex0, HOUSE.ceil + 1.4, vgrad(ctx, k, HOUSE.ceil, HOUSE.ceil + 1.4, [[0, HOME.wallShade, 0.5], [1, HOME.wallShade, 0]]))
  sunOnWall(ctx, k, t)
  // Left of the sun's patch the wall falls into soft shade, deepest low down behind the table, so the top's shine
  // and its ink read against it.
  const shade = ctx.createLinearGradient((TOP_AT[0] - 2.2) * k, 0, (TOP_AT[0] + 0.62) * k, 0)
  const dim = mixHex(HOME.wallShade, HOME.floorShade, 0.45)
  shade.addColorStop(0, rgba(dim, 0))
  shade.addColorStop(0.55, rgba(dim, 0.32))
  shade.addColorStop(0.9, rgba(dim, 0.34))
  shade.addColorStop(1, rgba(dim, 0))
  ctx.fillStyle = shade
  ctx.fillRect((TOP_AT[0] - 2.2) * k, (HOUSE.back - 2.4) * k, 2.82 * k, 2.4 * k)
  fillBox(ctx, k, TOP_AT[0] - 2.2, HOUSE.back - 2.4, TOP_AT[0] + 0.62, HOUSE.back - 1.2, vgrad(ctx, k, HOUSE.back - 2.4, HOUSE.back - 1.2, [[0, HOME.wall, 0.5], [1, HOME.wall, 0]]))
  hallWindow(ctx, k, w)
  // The skirting, and the floor running back to it: warm boards, a little darker at the back.
  fillBox(ctx, k, fx1, HOUSE.back - 0.1, ex0, HOUSE.back, mixHex(HOME.wall, HOME.wallShade, 0.7))
  fillBox(ctx, k, fx0, HOUSE.back, ex1, FLOOR, vgrad(ctx, k, HOUSE.back, FLOOR, [[0, mixHex(HOME.floor, HOME.floorShade, 0.5), 1], [1, HOME.floor, 1]]))
  sunOnFloor(ctx, k)
  // The floor's boards and joists, cut, and the footing under the walls.
  fillBox(ctx, k, fx0, FLOOR, ex1, foot, HOME.floorShade)
  line(ctx, k, [fx0, foot], [ex1, foot], INK, w * 0.6)
  // The ceiling, and the front and end walls over their doorways, cut.
  shape(ctx, k, box(fx0, slabTop, ex1, HOUSE.ceil), CUT, INK, w)
  shape(ctx, k, box(fx0, slabTop, fx1, HOUSE.frontHead), CUT, INK, w)
  shape(ctx, k, box(ex0, slabTop, ex1, HOUSE.endHead), CUT, INK, w)
  // The thresholds.
  for (const [a, b] of [[fx0, fx1], [ex0, ex1]]) fillBox(ctx, k, a, HOUSE.back, b, FLOOR, mixHex(STONE, HOME.floorShade, 0.25))
  line(ctx, k, [fx0, FLOOR], [ex1, FLOOR], INK, w * 0.8)
}

/**
 * The earth under the house, cut: in a tall frame it is near half the picture, so it is not a blank. The footings go
 * down under the two walls in laid stone; the earth lies in soft bands, darker as it goes down, a few stones in it.
 */
function ground(ctx: C2D, k: number, f: Frame, w: number, foot: number): void {
  const [fx0, fx1] = HOUSE.front
  const [ex0, ex1] = HOUSE.end
  const bottom = f.y1 + 1
  if (bottom <= foot) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(fx0 * k, foot * k, (ex1 - fx0) * k, (bottom - foot) * k)
  ctx.clip()
  // The bands: each a little darker, their tops wandering gently.
  const bands = [0.55, 1.35, 2.4, 3.8]
  bands.forEach((d, i) => {
    ctx.beginPath()
    ctx.moveTo(fx0 * k, bottom * k)
    for (let x = fx0; x <= ex1 + 0.2; x += 0.2) ctx.lineTo(x * k, (foot + d + 0.07 * Math.sin(x * 1.3 + i * 2.1) + 0.04 * Math.sin(x * 3.1 + i)) * k)
    ctx.lineTo(ex1 * k, bottom * k)
    ctx.closePath()
    ctx.fillStyle = rgba(mixHex(HOME.floorShade, INK, 0.35), 0.1 + 0.03 * i)
    ctx.fill()
  })
  // Stones in the earth, a few to a cell, flattened as stones lie.
  ctx.fillStyle = rgba(mixHex(STONE, HOME.floorShade, 0.55), 0.42)
  for (let i = Math.floor(fx0); i < ex1; i++)
    for (let j = 0; j < 6; j++) {
      const [x, y] = [i + hash(i, j, 41), foot + 0.35 + j * 0.7 + 0.5 * hash(i, j, 42)]
      if (y > bottom || hash(i, j, 43) < 0.45) continue
      const r = 0.035 + 0.05 * hash(i, j, 44)
      ctx.beginPath()
      ctx.ellipse(x * k, y * k, r * 1.5 * k, r * k, (hash(i, j, 45) - 0.5) * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
  // The footings, a little wider than their walls, in courses of stone.
  const depth = 1.1
  for (const [a, b] of [[fx0, fx1 + 0.12], [ex0 - 0.12, ex1]]) {
    shape(ctx, k, box(a, foot, b, foot + depth), mixHex(STONE, HOME.floorShade, 0.45), INK, w * 0.6)
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.lineWidth = Math.max(1, w * 0.35)
    ctx.beginPath()
    for (let r = 0, y = foot; y < foot + depth - 0.01; r++, y += depth / 4) {
      if (r) {
        ctx.moveTo(a * k, y * k)
        ctx.lineTo(b * k, y * k)
      }
      const x = a + (b - a) * (r % 2 ? 0.35 : 0.65)
      ctx.moveTo(x * k, y * k)
      ctx.lineTo(x * k, (y + depth / 4) * k)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/** A window in the hall's back wall, onto the side of the garden: sky and leaves, and its light on the sill. */
function hallWindow(ctx: C2D, k: number, w: number): void {
  const [x0, x1, y0, y1] = [-0.12, 0.88, -2.3, -1.05]
  shape(ctx, k, box(x0, y0, x1, y1), vgrad(ctx, k, y0, y1, [[0, mixHex(HOME.sky, HOME.sun, 0.35), 1], [0.55, mixHex(HOME.sky, HOME.tree, 0.35), 1], [1, mixHex(HOME.tree, HOME.sky, 0.3), 1]]), INK, w * 0.8)
  line(ctx, k, [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1], INK, w * 0.55)
  line(ctx, k, [x0, (y0 + y1) / 2 - 0.1], [x1, (y0 + y1) / 2 - 0.1], INK, w * 0.55)
  shape(ctx, k, box(x0 - 0.07, y1, x1 + 0.07, y1 + 0.06), mixHex(HOME.wall, HOME.wallShade, 0.4), INK, w * 0.6)
}

/**
 * The morning on the back wall: the glass doors' light laid on it, long and leaning, behind the table where the top
 * stands, soft at its edges, with the shadows of the doors' bars across it while the doors are shut.
 */
function sunOnWall(ctx: C2D, k: number, t: number): void {
  // The patch: its right edge at the doors (behind the counter), its top edge falling to the left, its foot on the
  // skirting; u across it (0 left, 1 right), v up it.
  const [xl, xr] = [3.78, HOUSE.end[0]]
  const top = (x: number) => HOUSE.endHead + 0.1 + ((xr - x) / (xr - xl)) * 0.6
  const q = (u: number, v: number): Pt => {
    const x = xl + (xr - xl) * u
    return [x, HOUSE.back - 0.1 + (top(x) - (HOUSE.back - 0.1)) * v]
  }
  const layers = 8
  for (let i = 0; i < layers; i++) {
    const m = (i / layers) * 0.1
    shape(ctx, k, [q(m * 0.6, 0), q(1, 0), q(1, 1 - m), q(m * 0.6, 1 - m)], rgba(HOME.sun, 0.17))
  }
  // The bars of the shut doors across it, fading as they open.
  const shut = 1 - Math.min(1, glassDoor(t) / 0.6)
  if (shut > 0.01)
    for (const v of [0.36, 0.69]) {
      const d = 0.022
      shape(ctx, k, [q(0.03, v - d), q(1, v - d), q(1, v + d), q(0.03, v + d)], rgba(HOME.wallShade, 0.6 * shut))
    }
}

/** The morning on the floor, in through the glass doors: long and warm, bright by the doors and past the table's shade. */
function sunOnFloor(ctx: C2D, k: number): void {
  const [ex0] = HOUSE.end
  const g = ctx.createLinearGradient(ex0 * k, 0, 0 * k, 0)
  const a = 0.62
  g.addColorStop(0, rgba(SUNLIGHT, a))
  g.addColorStop(0.24, rgba(SUNLIGHT, a * 0.85))
  g.addColorStop(0.3, rgba(SUNLIGHT, a * 0.25))
  g.addColorStop(0.62, rgba(SUNLIGHT, a * 0.18))
  g.addColorStop(0.72, rgba(SUNLIGHT, a * 0.5))
  g.addColorStop(1, rgba(SUNLIGHT, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(ex0 * k, (HOUSE.back + 0.02) * k)
  ctx.lineTo(0 * k, (HOUSE.back + 0.08) * k)
  ctx.lineTo(0.5 * k, (FLOOR - 0.01) * k)
  ctx.lineTo(ex0 * k, (FLOOR - 0.01) * k)
  ctx.closePath()
  ctx.fill()
}

/* ------------------------------------------------------------------ the things in it */

/** A door leaf swinging about a hinge at the doorway's far side: `phi` 0 shut (in the doorway), π/2 back flat. */
function leaf(ctx: C2D, k: number, hx: number, W: number, H: number, phi: number, fill: string, w: number, glass: boolean, depth = 0.33): void {
  const s = Math.sin(phi)
  const hb = HOUSE.back
  const fb = FLOOR - depth * (1 - Math.cos(phi))
  const A: Pt = [hx, hb]
  const B: Pt = [hx, hb - H]
  const C: Pt = [hx + W * s, fb - H]
  const D: Pt = [hx + W * s, fb]
  const at = (u: number, v: number): Pt => [A[0] + (D[0] - A[0]) * u + (B[0] - A[0]) * v, A[1] + (D[1] - A[1]) * u + (B[1] - A[1]) * v]
  if (glass) {
    // Shut, it is a pane seen edge on in the doorway: a strip of pale glass in its frame, bright where the sun is on it.
    const c = Math.cos(phi)
    if (s < 0.05 && c > 0) {
      const x = hx - 0.05
      const hw = GLASS.half
      glow(ctx, k, [x, FLOOR - H * 0.55], 0.5, HOME.sun, 0.35)
      shape(ctx, k, box(x - hw, FLOOR - H, x + hw, FLOOR), DOORWOOD, INK, w * 0.8)
      // The pane in its frame, catching the light, between the rails.
      for (const [v0, v1] of [[0.07, 0.31], [0.37, 0.64], [0.7, 0.92]] as const) shape(ctx, k, box(x - hw * 0.45, FLOOR - H * v1, x + hw * 0.45, FLOOR - H * v0), mixHex(HOME.glass, HOME.sun, 0.55), INK, w * 0.35)
      return
    }
    // Folded back against the house: its edge.
    if (s < 0.05) {
      shape(ctx, k, box(hx, fb - H, hx + 0.05, fb), rgba(HOME.glass, 0.7), INK, w * 0.6)
      return
    }
    shape(ctx, k, [A, B, C, D], rgba(HOME.glass, 0.3))
    // The sun on the glass as it turns: a glint that slides across it, brightest as it faces the sun.
    const glint = Math.exp(-(((phi - 1.2) / 0.35) ** 2))
    if (glint > 0.02) {
      const u = 0.1 + 0.8 * Math.min(1, phi / Math.PI)
      const g = ctx.createLinearGradient(at(u - 0.3, 0.5)[0] * k, 0, at(u + 0.3, 0.5)[0] * k, 0)
      g.addColorStop(0, rgba(HOME.sun, 0))
      g.addColorStop(0.5, rgba(HOME.sun, 0.9 * glint))
      g.addColorStop(1, rgba(HOME.sun, 0))
      shape(ctx, k, [A, B, C, D], g)
    }
    // Its wooden frame: stiles and rails round the glass, and the two bars across it.
    const fu = Math.min(0.5, 0.07 / Math.max(0.05, s))
    const fv = 0.03
    const frameBand = (u0: number, v0: number, u1: number, v1: number) => shape(ctx, k, [at(u0, v0), at(u0, v1), at(u1, v1), at(u1, v0)], DOORWOOD, INK, w * 0.4)
    frameBand(0, 0, fu, 1)
    frameBand(1 - fu, 0, 1, 1)
    frameBand(0, 0, 1, fv)
    frameBand(0, 1 - fv, 1, 1)
    for (const v of [0.34, 0.67]) frameBand(0, v - fv * 0.5, 1, v + fv * 0.5)
    return
  }
  shape(ctx, k, [A, B, C, D], fill, INK, w)
  if (s > 0.12) {
    for (const [v0, v1] of [[0.1, 0.44], [0.56, 0.9]] as const) shape(ctx, k, [at(0.18, v0), at(0.18, v1), at(0.82, v1), at(0.82, v0)], mixHex(fill, INK, 0.12), INK, w * 0.5)
    shape(ctx, k, [at(0.86, 0.47), at(0.86, 0.53), at(0.93, 0.53), at(0.93, 0.47)], mixHex(HOME.floorShade, INK, 0.5))
  }
}

function counter(ctx: C2D, k: number, w: number): void {
  const { x0, x1, top: tp, upper, win } = COUNTER
  // The window over it, onto the side of the garden.
  shape(ctx, k, box(x0 + 0.12, win[0], x1 - 0.12, win[1]), vgrad(ctx, k, win[0], win[1], [[0, mixHex(HOME.sky, HOME.sun, 0.5), 1], [1, mixHex(HOME.tree, HOME.sky, 0.45), 1]]), INK, w * 0.8)
  line(ctx, k, [(x0 + x1) / 2, win[0]], [(x0 + x1) / 2, win[1]], INK, w * 0.5)
  // The cupboard over it, the worktop, the cupboards under it.
  shape(ctx, k, box(x0 + 0.05, upper[0], x1 - 0.05, upper[1]), CABINET, INK, w * 0.8)
  line(ctx, k, [(x0 + x1) / 2, upper[0] + 0.08], [(x0 + x1) / 2, upper[1] - 0.08], INK, w * 0.45)
  shape(ctx, k, box(x0, tp + 0.08, x1, HOUSE.back - 0.07), CABINET, INK, w * 0.8)
  fillBox(ctx, k, x0 + 0.04, HOUSE.back - 0.07, x1 - 0.04, HOUSE.back, mixHex(CABINET, INK, 0.35))
  for (const cx of [x0 + 0.26, x1 - 0.26]) shape(ctx, k, box(cx - 0.2, tp + 0.2, cx + 0.2, HOUSE.back - 0.16), null, INK, w * 0.45)
  shape(ctx, k, box(x0 - 0.04, tp, x1 + 0.04, tp + 0.08), mixHex(HOME.table, INK, 0.15), INK, w * 0.8)
}

/** A kitchen chair side on: its seat, its legs, its back at one end (outward from the table), rising a little over him. */
function chair(ctx: C2D, k: number, w: number, c: (typeof CHAIRS)[number]): void {
  const { x0, x1, seat, top: tp } = c
  const bx = c.back === 'left' ? x0 : x1 - 0.05
  // The back: an upright, a little raked outward, with a rail near its top.
  const rake = c.back === 'left' ? -0.03 : 0.03
  shape(ctx, k, [[bx, seat], [bx + 0.05, seat], [bx + 0.05 + rake, tp], [bx + rake, tp]], WOOD, INK, w * 0.6)
  const rx0 = c.back === 'left' ? bx + rake : bx + rake - 0.12
  shape(ctx, k, box(rx0, tp + 0.04, rx0 + 0.17, tp + 0.1), WOOD, INK, w * 0.5)
  // The legs (the far pair glimpsed, darker), the seat.
  for (const x of [x0 + 0.06, x1 - 0.1]) shape(ctx, k, box(x, seat + 0.03, x + 0.035, FLOOR - 0.06), mixHex(WOOD, INK, 0.3), INK, w * 0.4)
  for (const x of [x0 + 0.01, x1 - 0.045]) shape(ctx, k, box(x, seat + 0.03, x + 0.035, FLOOR - 0.01), WOOD, INK, w * 0.5)
  shape(ctx, k, box(x0 - 0.01, seat, x1 + 0.01, seat + 0.035), mixHex(WOOD, HOME.sun, 0.2), INK, w * 0.6)
}

/** The kitchen table: a slab on four legs, his height; its top lit from the doors. */
function table(ctx: C2D, k: number, w: number): void {
  const { x0, x1, top: tp, feet } = TABLE
  const c = HOME.table
  for (const x of [x0 + 0.16, x1 - 0.2]) shape(ctx, k, box(x, tp + 0.08, x + 0.04, feet - 0.04), mixHex(c, INK, 0.3), INK, w * 0.45)
  shape(ctx, k, box(x0 + 0.05, tp + 0.05, x1 - 0.05, tp + 0.1), mixHex(c, INK, 0.12), INK, w * 0.5)
  for (const x of [x0 + 0.04, x1 - 0.09]) shape(ctx, k, box(x, tp + 0.05, x + 0.05, feet), c, INK, w * 0.6)
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  g.addColorStop(0, mixHex(c, HOME.floor, 0.35))
  g.addColorStop(0.5, mixHex(c, HOME.floor, 0.5))
  g.addColorStop(1, mixHex(mixHex(c, HOME.floor, 0.5), HOME.sun, 0.35))
  shape(ctx, k, box(x0, tp - 0.05, x1, tp), g, INK, w * 0.6)
  shape(ctx, k, box(x0, tp, x1, tp + 0.05), c, INK, w * 0.6)
}

/**
 * The top on the table: the wall behind it in soft shade and the morning lying across the tabletop round it as a warm
 * pool, so its shine and its ink read against them; and its long shadow across the table.
 */
function drawTop(p: p5, ctx: C2D, k: number, t: number): void {
  const s = topAt(t)
  const [x, y] = s.tip
  pool(p, k, [x + 0.12, y - 0.025], 0.62, 0.045, SUNLIGHT, 0.85)
  pool(p, k, [x + 0.05, y - 0.025], 0.3, 0.03, HOME.sun, 0.7)
  // The low sun from the doors lays its shadow long to the left over the table's top; it swings as the top leans.
  const lean = Math.max(-1, Math.min(1, s.sway))
  const L = Math.max(0.2, Math.min(x - TABLE.x0 + 0.02, 1.05 + 0.45 * lean))
  const g = ctx.createLinearGradient(x * k, 0, (x - L) * k, 0)
  g.addColorStop(0, rgba(TOP.shade, 0.55))
  g.addColorStop(0.5, rgba(TOP.shade, 0.25))
  g.addColorStop(1, rgba(TOP.shade, 0))
  shape(ctx, k, [[x + 0.03, y - 0.004], [x - L, y - 0.022], [x - L, y - 0.05], [x - 0.05, y - 0.045]], g)
  top(p, k, [x, y], s.phase, s.lean, s.prec, INK, 1, s.blur)
}

/** Soft shade under the balls (Cobb's and the children's), on the floor and the lawn. */
function shades(p: p5, k: number, t: number): void {
  const [cx] = cobbAt(t)
  pool(p, k, [cx - 0.16, FLOOR - 0.015], 0.26, 0.035, mixHex(HOME.floorShade, INK, 0.35), 0.4)
  for (const i of [0, 1]) pool(p, k, [kidX(i, t) - 0.1, FLOOR - 0.012], 0.16, 0.026, HOME.lawnDark, 0.6)
}

/* ------------------------------------------------------------------ the set */

export function drawHome(p: p5, c: Ctx): void {
  const { k, weight: w } = c
  const t = c.t
  // Once the picture has cut to black on the last chord nothing here is seen again.
  if (t > LAST + 0.1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  sky(ctx, k, f)
  // The sun, low over the garden wall, behind the far trees, and its glow on them.
  const sun = sunAt(f)
  glow(ctx, k, sun, 7.5, SUNLIGHT, 0.8)
  farTrees(ctx, k, f, 0.55, -1.1, 1.1, mixHex(HOME.tree, HOME.sky, 0.66), 0.7, true)
  glow(ctx, k, sun, 3.6, HOME.sun, 0.7)
  farTrees(ctx, k, f, 0.3, -1.05, 0.75, mixHex(HOME.tree, HOME.sky, 0.45), 2.9, false)
  glow(ctx, k, sun, 1.8, HOME.sun, 0.95)
  garden(ctx, k, f, t, w)
  // The light coming round onto the children as they turn: warm on the lawn round them.
  const e = Math.max(turned(0, t), turned(1, t))
  if (e > 0) pool(p, k, [(kidX(0, t) + kidX(1, t)) / 2, FLOOR - 0.06], 1.1, 0.18, HOME.sun, 0.4 * e)
  porch(ctx, k, f, t, w)
  house(ctx, k, f, t, w)
  // Inside: the front door back against the wall, the counter, the chairs, the table and the top.
  // The front door swings back less deep into the hall, so its foot stays low behind him as he comes in under it,
  // and not on his crown.
  leaf(ctx, k, HOUSE.front[1] - 0.08, 1.15, 2.42, frontDoor(t), DOORWOOD, w * 0.8, false, 0.18)
  counter(ctx, k, w)
  for (const c of CHAIRS) chair(ctx, k, w, c)
  table(ctx, k, w)
  drawTop(p, ctx, k, t)
  // The glass door onto the garden, swinging out as he goes through.
  leaf(ctx, k, GLASS.hinge, GLASS.w, 2.47, glassDoor(t), HOME.glass, w * 0.7, true)
  shades(p, k, t)
  ctx.restore()
}

/** Over everything: the morning in the air through the doors, and the sun's glare in the garden. */
export function drawHomeOver(p: p5, c: Ctx): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const t = c.t
  if (t > LAST + 0.1) return
  const f = frame(p, k)
  const [ex0] = HOUSE.end
  // The morning spilling in at the glass doors.
  if (f.x0 < ex0 + 2 && f.x1 > ex0 - 3) {
    ctx.save()
    ctx.translate((ex0 + 0.1) * k, -1.1 * k)
    ctx.scale(0.55, 1)
    glow(ctx, k, [0, 0], 2.4, SUNLIGHT, 0.32)
    ctx.restore()
  }
  // The last shot: as the camera settles on the top the room falls a little dim round it, like a lens.
  const v = Math.min(smooth(t, HOLD + 1.6, TICKS[0] + 1.2), 1)
  if (v > 0.001) {
    const r = Math.hypot(f.x1 - f.x0, f.y1 - f.y0) / 2
    const g = ctx.createRadialGradient(f.cx * k, f.cy * k, r * 0.28 * k, f.cx * k, f.cy * k, r * k)
    g.addColorStop(0, rgba(INK, 0))
    g.addColorStop(0.55, rgba(INK, 0.1 * v))
    g.addColorStop(1, rgba(INK, 0.32 * v))
    ctx.fillStyle = g
    ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  }
  const sun = sunAt(f)
  // The glare: a little less once the children have turned (the light has come round onto them).
  const e = Math.max(turned(0, t), turned(1, t))
  glow(ctx, k, sun, 2.6, HOME.sun, 0.22 * (1 - 0.4 * e))
}
