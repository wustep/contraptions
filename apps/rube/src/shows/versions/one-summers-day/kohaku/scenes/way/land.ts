import type { Light } from '../../light'
import { blob, box, circle, curve, ellipse, fill, hash, ink, layer, lit, mix, poly, rect, rgba, sway, vgrad, type Paint, type Pt, type View } from '../../paint'
import { horizonOf } from '../../world/sky'
import { GATE, RIVER, STAIR, STONES, STREET, meadowY, treads } from '../../geo'

/**
 * The west end of the world: the gate on its grassy rise, the meadow running down from it, the river of stones, and
 * the far bank's steps. The land is flat greens laid in bands that pale into the air; only the gate and the steps,
 * which are made, have ink on them.
 */

/** The wind over the meadow: a light breeze east, and the pull into the tunnel on the third chord. */
export function wind(t: number, gust: number): number {
  return 0.35 + 0.25 * sway(t, 0.13, 3) - 1.4 * gust
}

/** A ridge line across the view: `amp` frame heights of relief over `base`, its shape set by `f` and `seed`. */
function ridge(v: View, base: number, amp: number, f: number, seed: number, step: number): Pt[] {
  const pts: Pt[] = [[v.x0 - 1, v.y1 + 1]]
  for (let x = Math.floor(v.x0 / step) * step - step; x <= v.x1 + step; x += step) {
    const s = x * f
    const h = 0.5 + 0.32 * Math.sin(s + seed) + 0.18 * Math.sin(s * 2.3 + seed * 1.7) + 0.08 * Math.sin(s * 5.1 + seed)
    pts.push([x, base - amp * v.h * h])
  }
  pts.push([v.x1 + 1, v.y1 + 1])
  return pts
}

/** A clump of trees: rounded heaps in one flat tone, the sunward half a step lighter. */
function clump(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dark: string, light: string, seed: number): void {
  const lobes: [number, number, number][] = []
  const n = 3 + Math.floor(hash(seed, 1) * 3)
  for (let j = 0; j < n; j++) {
    const u = (j + 0.5) / n
    const r = s * (0.55 + 0.35 * Math.sin(Math.PI * u) + 0.15 * hash(seed, j + 2))
    lobes.push([x + (u - 0.5) * s * 1.8, y - r * 0.75 - s * 0.25 * Math.sin(Math.PI * u), r])
  }
  ctx.beginPath()
  for (const [cx, cy, r] of lobes) {
    ctx.moveTo(cx + r, cy)
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
  ctx.rect(x - s * 0.9, y - s * 0.4, s * 1.8, s * 0.4)
  fill(ctx, dark)
  ctx.beginPath()
  for (const [cx, cy, r] of lobes) {
    ctx.moveTo(cx - r * 0.18 + r * 0.72, cy - r * 0.2)
    ctx.arc(cx - r * 0.18, cy - r * 0.2, r * 0.72, 0, Math.PI * 2)
  }
  fill(ctx, light)
}

/** The far mountains on the horizon, the hills between them and the meadow, and the trees on them. */
export function drawHills(g: Paint, L: Light): void {
  const at: Pt = [6, -2.6]
  const { ctx } = g
  // Farthest: a pale range of mountains, nearly the sky's colour.
  layer(g, 0.06, 0, at, (v: View) => {
    const hy = horizonOf(v)
    poly(ctx, ridge(v, hy, 0.2, 0.09, 2.1, 0.5))
    fill(ctx, mix(lit('#8FA6B8', L.ambient, 0.4), L.haze, 0.55))
  })
  // Far: a nearer range, blue-green in the haze.
  layer(g, 0.14, 0, at, (v: View) => {
    const hy = horizonOf(v)
    poly(ctx, ridge(v, hy + 0.01 * v.h, 0.11, 0.17, 0.4, 0.35))
    fill(ctx, mix(lit('#6F9682', L.ambient, 0.3), L.haze, 0.4))
  })
  // Middle: rolling green hills with trees on their crests.
  layer(g, 0.32, 0.2, at, (v: View) => {
    const hy = horizonOf(v)
    const pts = ridge(v, hy + 0.035 * v.h, 0.06, 0.27, 1.2, 0.3)
    poly(ctx, pts)
    ctx.fillStyle = vgrad(ctx, hy - 0.05 * v.h, v.y1, [
      [0, mix(lit('#86AE5A', L.ambient, 0.15), L.haze, 0.22)],
      [1, mix(lit('#6E9A48', L.ambient, 0.1), L.haze, 0.1)],
    ])
    ctx.fill()
    const dark = mix(lit('#4F7D3A', L.ambient, 0.1), L.haze, 0.25)
    const light = mix(lit('#6A9446', L.ambient, 0.1), L.haze, 0.25)
    for (let i = Math.floor(v.x0 / 3.2) - 1; i <= v.x1 / 3.2 + 1; i++) {
      if (hash(i, 7) < 0.55) continue
      const x = i * 3.2 + hash(i, 8) * 1.6
      let y = Infinity
      for (const [px, py] of pts) if (Math.abs(px - x) < 0.16) y = Math.min(y, py)
      if (!Number.isFinite(y)) continue
      clump(ctx, x, y + 0.004 * v.h, 0.022 * v.h * (0.7 + 0.6 * hash(i, 9)), dark, light, i)
    }
  })
}

/**
 * The wind going over the meadow: two or three long, soft-edged bands of a lighter green running east through the
 * grass, the way the film shows the wind, never a field of marks. Clipped to the meadow's ground by the caller.
 */
function windBands(g: Paint, L: Light, x0: number, x1: number, gust: number): void {
  const { ctx } = g
  const light = lit('#A9CF6E', L.ambient)
  // They run east with the breeze, and the gust into the tunnel sends one west.
  const t = g.t
  for (let i = 0; i < 3; i++) {
    const period = 22
    const x = -12 + ((t * 1.6 + i * (period / 3) * 2.4) % (period * 2.4)) - 0 * gust
    if (x < x0 - 6 || x > x1 + 6) continue
    const y = meadowY(x) + 0.5 + 0.25 * i
    const gr = ctx.createRadialGradient(x, y, 0, x, y, 3)
    gr.addColorStop(0, rgba(light, 0.32))
    gr.addColorStop(1, rgba(light, 0))
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, 0.18)
    ctx.translate(-x, -y)
    ctx.fillStyle = gr
    ctx.fillRect(x - 3, y - 3, 6, 6)
    ctx.restore()
  }
}

/** The meadow: its grass from the ground's edge down, the path worn in it, and the tips of the grass along its top. */
export function drawMeadow(g: Paint, L: Light, gust: number): void {
  const { ctx, view: v } = g
  const x0 = Math.max(v.x0 - 1, -40)
  const x1 = Math.min(v.x1 + 1, RIVER.x0 + 0.4)
  if (x1 <= x0) return
  const grass = lit('#79B04A', L.ambient)
  const deep = lit('#4F8A36', L.ambient)
  const w = wind(g.t, gust)
  // The ground, with its edge in grass tips.
  const pts: Pt[] = []
  const step = 0.07
  for (let x = Math.floor(x0 / step) * step, i = 0; x <= x1; x += step, i++) {
    const y = meadowY(x)
    const tip = 0.035 + 0.05 * hash(Math.round(x / step), 3)
    const lean = w * 0.05 * (0.6 + 0.4 * Math.sin(g.t * 2.1 + x * 1.7))
    pts.push([x - step * 0.3, y])
    pts.push([x + lean, y - tip])
  }
  pts.push([x1, 8], [x0, 8])
  poly(ctx, pts)
  ctx.fillStyle = vgrad(ctx, -0.5, 4, [
    [0, grass],
    [0.55, deep],
    [1, lit('#3F6E2C', L.ambient)],
  ])
  ctx.fill()
  ctx.save()
  ctx.clip()
  windBands(g, L, x0, x1, gust)
  ctx.restore()
  // The path: packed earth, worn into the grass from the gate's door down to the river.
  const dirt = lit('#C9B48A', L.ambient)
  ctx.beginPath()
  const p0 = Math.max(x0, GATE.x0 + 0.4)
  for (let x = p0; x <= Math.min(x1, RIVER.x0 + 0.1); x += 0.1) {
    const y = meadowY(x) + 0.01
    if (x === p0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let x = Math.min(x1, RIVER.x0 + 0.1); x >= p0; x -= 0.1) ctx.lineTo(x, meadowY(x) + 0.09 + 0.02 * Math.sin(x * 2.3))
  ctx.closePath()
  fill(ctx, dirt)
}

/** A few tall tufts at the frame's foot, nearer than the meadow, leaning with the wind. */
export function drawTufts(g: Paint, L: Light, gust: number, xs: number[]): void {
  const { ctx } = g
  const w = wind(g.t, gust)
  const c = lit('#5E9A3E', L.ambient)
  for (const x of xs) {
    const y = meadowY(x) + 0.05
    for (let j = 0; j < 7; j++) {
      const h = 0.28 + 0.22 * hash(x * 10, j)
      const bx = x + (j - 3) * 0.035
      const lean = (w * 0.12 + 0.03 * Math.sin(g.t * 2.4 + j)) * h
      ctx.beginPath()
      ctx.moveTo(bx - 0.018, y)
      ctx.quadraticCurveTo(bx + lean * 0.3, y - h * 0.6, bx + lean, y - h)
      ctx.quadraticCurveTo(bx + lean * 0.3 + 0.01, y - h * 0.55, bx + 0.018, y)
      fill(ctx, c)
    }
  }
}

/* ------------------------------------------------------------------ the gate */

const WALL = '#B4573E'
const WALL_HI = '#C97257'
const STONE = '#D3BFA6'
const SLATE = '#4B5663'

/** The gate: a red-plastered hall with a little clock tower, the tunnel's arch through it. */
export function drawGate(g: Paint, L: Light): void {
  const { ctx } = g
  const { x0, x1, arch, archW } = GATE
  const wall = lit(WALL, L.ambient)
  const hi = lit(WALL_HI, L.ambient)
  const line = mix('#3B1E16', L.top, 0.15 * L.night)
  // The plinth, the wall, the cornice.
  box(ctx, x0, -0.2, x1 - x0, 0.2, lit('#7E6A5C', L.ambient))
  box(ctx, x0, -2.0, x1 - x0, 1.8, wall)
  ctx.fillStyle = vgrad(ctx, -2.0, -0.2, [
    [0, rgba('#000000', 0)],
    [1, rgba('#3A160C', 0.18)],
  ])
  ctx.fillRect(x0, -2.0, x1 - x0, 1.8)
  box(ctx, x0 - 0.06, -2.08, x1 - x0 + 0.12, 0.14, hi)
  // Weather down the plaster from the cornice: two long soft stains.
  for (const [sx, len] of [[x0 + 1.1, 0.9], [x1 - 1.3, 0.6]] as const) {
    ctx.fillStyle = vgrad(ctx, -1.94, -1.94 + len, [
      [0, rgba('#5A2414', 0.22)],
      [1, rgba('#5A2414', 0)],
    ])
    ctx.fillRect(sx, -1.94, 0.18, len)
  }
  // The roof.
  poly(ctx, [[x0 - 0.3, -2.06], [x1 + 0.3, -2.06], [x1 - 0.7, -2.6], [x0 + 0.7, -2.6]])
  fill(ctx, lit(SLATE, L.ambient))
  ink(g, line, 2)
  // The tower over the arch, with its clock.
  const tw = 0.82
  box(ctx, arch - tw, -3.45, tw * 2, 1.45, wall)
  box(ctx, arch - tw - 0.05, -3.5, tw * 2 + 0.1, 0.12, hi)
  poly(ctx, [[arch - tw - 0.2, -3.48], [arch + tw + 0.2, -3.48], [arch, -4.05]])
  fill(ctx, lit(SLATE, L.ambient))
  ink(g, line, 2)
  circle(ctx, arch, -2.86, 0.34)
  fill(ctx, lit('#EFE8D8', L.ambient))
  ink(g, line, 2)
  // Its hands stand where they have stood for years.
  ctx.lineCap = 'round'
  poly(ctx, [[arch, -2.86], [arch + 0.16, -2.98]], false)
  ink(g, line, 2.2)
  poly(ctx, [[arch, -2.86], [arch - 0.04, -2.62]], false)
  ink(g, line, 2.2)
  ctx.lineCap = 'butt'
  // Arched windows either side, dark glass in a pale frame.
  for (const wx of [x0 + 0.9, arch - 1.7, arch + 1.7, x1 - 0.9]) {
    const ww = 0.26
    ctx.beginPath()
    ctx.moveTo(wx - ww, -0.75)
    ctx.lineTo(wx - ww, -1.35)
    ctx.arc(wx, -1.35, ww, Math.PI, 0)
    ctx.lineTo(wx + ww, -0.75)
    ctx.closePath()
    fill(ctx, lit('#2D3440', L.ambient, 0.2))
    ink(g, lit(STONE, L.ambient), 2.4)
  }
  // The arch: a ring of stone round the dark.
  archPath(ctx, arch, archW / 2 + 0.13, 0.62 + 0.13)
  fill(ctx, lit(STONE, L.ambient))
  ink(g, line, 2)
  archPath(ctx, arch, archW / 2, 0.62)
  ctx.fillStyle = vgrad(ctx, -1.2, 0, [
    [0, '#1A1214'],
    [1, '#0C0A0B'],
  ])
  ctx.fill()
  // Far down the tunnel, the light at its other end.
  archPath(ctx, arch, 0.09, 0.08, -0.12)
  fill(ctx, rgba(mix('#F4E9D0', L.ambient, 0.4), 0.55))
  // The sill.
  box(ctx, arch - archW / 2 - 0.2, -0.05, archW + 0.4, 0.07, lit('#9C8B7A', L.ambient))
}

/** An arch `hw` wide each side, its spring line `spring` over the sill (and its sill `drop` lower than 0). */
export function archPath(ctx: CanvasRenderingContext2D, x: number, hw: number, spring: number, drop = 0): void {
  ctx.beginPath()
  ctx.moveTo(x - hw, drop)
  ctx.lineTo(x - hw, -spring + drop)
  ctx.arc(x, -spring + drop, hw, Math.PI, 0)
  ctx.lineTo(x + hw, drop)
  ctx.closePath()
}

/** The tunnel's dark laid over a ball still inside it: `a` is how deep in it she is. */
export function drawArchDark(g: Paint, a: number): void {
  if (a <= 0.003) return
  archPath(g.ctx, GATE.arch, GATE.archW / 2, 0.62)
  fill(g.ctx, rgba('#0D0A0B', a))
}

/* ------------------------------------------------------------------ the river of stones */

/** The boulders lying in the bed: [x, half width, height], a few, at their own sizes, none where she steps. */
const BOULDERS: [number, number, number][] = [
  [15.85, 0.22, 0.16],
  [16.8, 0.12, 0.09],
  [17.85, 0.3, 0.2],
  [18.95, 0.14, 0.1],
  [20.15, 0.24, 0.15],
  [21.3, 0.18, 0.14],
]

/** A rounded stone sitting on the bed: its body in shade, its top lit, flat. */
function boulder(ctx: CanvasRenderingContext2D, L: Light, x: number, y: number, w: number, h: number, seed: number): void {
  blob(ctx, [
    [x - w, y + 0.02],
    [x - w * 0.95, y - h * 0.5],
    [x - w * 0.45, y - h],
    [x + w * 0.5, y - h * 0.95],
    [x + w, y - h * 0.4],
    [x + w * 0.9, y + 0.02],
  ])
  fill(ctx, lit(mix('#8C887E', '#9A9486', hash(seed, 1)), L.ambient))
  ellipse(ctx, x - w * 0.12, y - h * 0.72, w * 0.62, h * 0.26)
  fill(ctx, lit('#C2BDAF', L.ambient))
}

export function drawRiver(g: Paint, L: Light): void {
  const { ctx } = g
  const bed = lit('#C3B79C', L.ambient)
  const near = lit('#9C8E72', L.ambient)
  // The bed, between the meadow's bank and the far bank's foot: lighter far, darker at its near edge.
  poly(ctx, [
    [RIVER.x0 - 0.2, meadowY(RIVER.x0 - 0.2)],
    [RIVER.x0 + 0.3, RIVER.bed],
    [RIVER.x1 + 0.2, RIVER.bed],
    [RIVER.x1 + 0.2, 8],
    [RIVER.x0 - 0.2, 8],
  ])
  ctx.fillStyle = vgrad(ctx, RIVER.bed, RIVER.bed + 1.2, [
    [0, bed],
    [0.18, near],
    [1, lit('#6A5C44', L.ambient)],
  ])
  ctx.fill()
  // The bed's top: a band of pale gravel the stones lie on.
  box(ctx, RIVER.x0 + 0.25, RIVER.bed - 0.02, RIVER.x1 - RIVER.x0 - 0.05, 0.06, lit('#D3C8AE', L.ambient))
  BOULDERS.forEach(([x, w, h], i) => boulder(ctx, L, x, RIVER.bed + 0.02, w, h, i))
  // Grass along both banks, where the bed meets them.
  const grass = lit('#6E9E44', L.ambient)
  for (const [bx, d] of [[RIVER.x0 + 0.25, 1], [RIVER.x1 - 0.1, -1]] as const) {
    for (let j = 0; j < 6; j++) {
      const x = bx + d * j * 0.07
      const hh = 0.12 + 0.1 * hash(j, d + 5)
      ctx.beginPath()
      ctx.moveTo(x - 0.03, RIVER.bed + 0.02)
      ctx.quadraticCurveTo(x + d * 0.02, RIVER.bed - hh * 0.6, x + d * 0.05, RIVER.bed - hh)
      ctx.quadraticCurveTo(x + d * 0.03, RIVER.bed - hh * 0.5, x + 0.03, RIVER.bed + 0.02)
      fill(ctx, grass)
    }
  }
  // The stones she crosses on: big, rounded, flat on top.
  STONES.forEach(([x, y], i) => {
    const w = 0.34 + 0.08 * hash(i, 41)
    const h = RIVER.bed - y + 0.1
    blob(ctx, [
      [x - w, RIVER.bed + 0.06],
      [x - w * 0.95, y + h * 0.35],
      [x - w * 0.6, y + 0.01],
      [x + w * 0.55, y - 0.005],
      [x + w * 0.95, y + h * 0.4],
      [x + w, RIVER.bed + 0.06],
    ])
    fill(ctx, lit('#8F8D86', L.ambient))
    ellipse(ctx, x - w * 0.05, y + 0.035, w * 0.72, 0.05)
    fill(ctx, lit('#C4C0B4', L.ambient))
  })
}

/* ------------------------------------------------------------------ the far bank's steps */

export function drawStair(g: Paint, L: Light): void {
  const { ctx } = g
  const top = treads[treads.length - 1]
  // The bank: grass going up from the bed to the street's level, earth showing low down where the river has cut it.
  poly(ctx, [
    [STAIR.x0 - 0.45, RIVER.bed + 0.05],
    [STAIR.x0 - 0.2, STAIR.bottom - 0.25],
    [top[0] - 0.4, STAIR.top + 0.02],
    [STREET.x0 + 0.6, STREET.y],
    [STREET.x0 + 0.6, 8],
    [STAIR.x0 - 0.45, 8],
  ])
  ctx.fillStyle = vgrad(ctx, STAIR.top, RIVER.bed + 0.9, [
    [0, lit('#7AA44E', L.ambient)],
    [0.75, lit('#5E8A3C', L.ambient)],
    [1, lit('#6E5E44', L.ambient)],
  ])
  ctx.fill()
  // The flight: a stone slab under each tread, set into the bank, each a little proud of the one below.
  const stone = lit('#A8A194', L.ambient)
  const tread = lit('#D2CBBA', L.ambient)
  const line = lit('#5A544A', L.ambient)
  for (let i = 0; i < treads.length; i++) {
    const [x, y] = treads[i]
    const w = 0.42
    box(ctx, x - w / 2, y, w + 0.12, 0.34, stone)
    box(ctx, x - w / 2, y, w + 0.12, 0.04, tread)
    rect(ctx, x - w / 2, y, w + 0.12, 0.34)
    ink(g, line, 1.1)
  }
  // Moss along the top of the town's wall where the bank meets it.
  box(ctx, STREET.x0 + 0.5, STREET.y + 0.1, 3.0, 0.07, lit('#6E8E46', L.ambient))
}

export { curve }

/* ------------------------------------------------------------------ trees, and the stone by the path */

/**
 * A summer tree: a short dark trunk and a great crown of rounded heaps, its underside and far side in shade, its sunward
 * top lit, three flat greens. `h` tall from the ground at `y`; it stirs a little in the wind.
 */
export function drawTree(g: Paint, L: Light, x: number, y: number, h: number, seed: number, gust: number): void {
  const { ctx } = g
  const w = wind(g.t, gust)
  const lean = 0.03 * h * w
  box(ctx, x - h * 0.045, y - h * 0.42, h * 0.09, h * 0.42 + 0.05, lit('#4A3A2C', L.ambient))
  // Two limbs into the crown.
  poly(ctx, [[x - h * 0.03, y - h * 0.38], [x - h * 0.2 + lean, y - h * 0.6], [x - h * 0.16 + lean, y - h * 0.62], [x + h * 0.01, y - h * 0.42]])
  fill(ctx, lit('#4A3A2C', L.ambient))
  const lobes: [number, number, number][] = []
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed, i) * 0.5
    const rr = h * (0.18 + 0.08 * hash(seed, i + 10))
    lobes.push([x + lean + Math.cos(a) * h * 0.24, y - h * 0.66 + Math.sin(a) * h * 0.17, rr])
  }
  lobes.push([x + lean, y - h * 0.7, h * 0.26])
  const heap = (dx: number, dy: number, k: number) => {
    ctx.beginPath()
    for (const [cx, cy, r] of lobes) {
      ctx.moveTo(cx + dx + r * k, cy + dy)
      ctx.arc(cx + dx, cy + dy, r * k, 0, Math.PI * 2)
    }
  }
  heap(0, 0, 1)
  fill(ctx, lit('#3F6B32', L.ambient))
  ctx.save()
  heap(0, 0, 1)
  ctx.clip()
  heap(-h * 0.03, -h * 0.05, 0.92)
  fill(ctx, lit('#568A3E', L.ambient))
  heap(-h * 0.06, -h * 0.1, 0.78)
  fill(ctx, lit('#6FA24A', L.ambient))
  ctx.restore()
}

/** The little stone figure by the path, mossed, a face worn into it. */
export function drawStone(g: Paint, L: Light, x: number): void {
  const { ctx } = g
  const y = meadowY(x) + 0.03
  blob(ctx, [
    [x - 0.13, y],
    [x - 0.15, y - 0.2],
    [x - 0.09, y - 0.38],
    [x + 0.09, y - 0.38],
    [x + 0.15, y - 0.2],
    [x + 0.13, y],
  ])
  fill(ctx, lit('#8E9282', L.ambient))
  ink(g, lit('#3E4238', L.ambient), 1.2)
  // Moss on its shoulders; the face: shut eyes and a small smile.
  ellipse(ctx, x - 0.04, y - 0.33, 0.07, 0.03)
  fill(ctx, lit('#6C8A48', L.ambient))
  for (const d of [-0.045, 0.045]) {
    ctx.beginPath()
    ctx.moveTo(x + d - 0.025, y - 0.24)
    ctx.quadraticCurveTo(x + d, y - 0.215, x + d + 0.025, y - 0.24)
    ink(g, lit('#3E4238', L.ambient), 1.1)
  }
  ctx.beginPath()
  ctx.moveTo(x - 0.03, y - 0.17)
  ctx.quadraticCurveTo(x, y - 0.15, x + 0.03, y - 0.17)
  ink(g, lit('#3E4238', L.ambient), 1.1)
}
