import type { Light } from '../../light'
import { box, circle, fill, hash, ink, lit, mix, poly, pool, rgba, smooth, sway, type Paint } from '../../paint'
import { SEA_Y, SWAMP } from '../../geo'
import { reflect, waterline } from '../../world/sea'
import { COTTAGE, GROUND_Y, ISLAND, lampAt } from './plan'

/**
 * Swamp Bottom at night: a wood standing in the shallow water, the platform at its edge, a raised path of earth from
 * the platform's end in among the trees, and at its end, in a clearing, a cottage with one lit window. The trees are
 * dark against the moonlit sky, the far ones a step paler. The lamp, a street lamp on one leg, lives here.
 */

const TRUNK = '#3A3226'
const LEAF = '#3C5236'
const LEAF_FAR = '#4E6650'

/** Trees: [x, height of crown's top over the water, crown's width, far (1) or near (0)]. */
const TREES: [number, number, number, number][] = [
  [231.0, 3.3, 2.0, 1],
  [233.6, 3.9, 2.4, 1],
  [240.9, 3.6, 2.2, 1],
  [242.5, 3.0, 1.7, 0],
  [244.4, 4.2, 2.6, 1],
  [246.1, 3.3, 1.9, 0],
  [249.1, 4.4, 2.6, 1],
  [255.4, 3.7, 2.2, 0],
  [257.6, 4.3, 2.6, 1],
  [259.9, 3.4, 2.0, 0],
  [262.6, 4.0, 2.4, 1],
  [265.3, 3.4, 2.1, 1],
]

function tree(g: Paint, L: Light, x: number, h: number, w: number, far: boolean, base: number): void {
  const { ctx } = g
  const trunk = lit(far ? mix(TRUNK, '#6A7A88', 0.35) : TRUNK, L.ambient, 0.1)
  const leaf = lit(far ? LEAF_FAR : LEAF, L.ambient, far ? 0.15 : 0.05)
  const moon = lit(mix(far ? LEAF_FAR : LEAF, '#8EA6A0', 0.28), L.ambient, far ? 0.15 : 0.05)
  const top = SEA_Y - h
  const crown = top + w * 0.42
  // The trunk, tapering, and a branch either way into the crown.
  poly(ctx, [[x - 0.13, base], [x + 0.13, base], [x + 0.06, crown], [x - 0.06, crown]])
  fill(ctx, trunk)
  ctx.lineCap = 'round'
  ctx.strokeStyle = trunk
  ctx.lineWidth = 0.07
  ctx.beginPath()
  ctx.moveTo(x, crown + w * 0.25)
  ctx.quadraticCurveTo(x - w * 0.12, crown + w * 0.05, x - w * 0.3, crown - w * 0.02)
  ctx.moveTo(x, crown + w * 0.12)
  ctx.quadraticCurveTo(x + w * 0.14, crown - w * 0.02, x + w * 0.28, crown - w * 0.08)
  ctx.stroke()
  ctx.lineCap = 'butt'
  // The crown: a heap of rounded lobes, stirring a little, its moonward side a step lighter.
  const stir = 0.035 * sway(g.t, 0.18, x)
  const lobes: [number, number, number][] = []
  const n = 6
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    const r = w * (0.2 + 0.08 * hash(Math.round(x * 10), i))
    lobes.push([x - w * 0.46 + u * w * 0.92 + stir * u, top + w * 0.36 - Math.sin(Math.PI * u) * w * 0.2, r])
  }
  lobes.push([x + stir, top + w * 0.2, w * 0.26], [x - w * 0.18 + stir, top + w * 0.26, w * 0.2])
  ctx.beginPath()
  for (const [cx, cy, r] of lobes) {
    ctx.moveTo(cx + r, cy)
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
  fill(ctx, leaf)
  ctx.save()
  ctx.clip()
  ctx.beginPath()
  for (const [cx, cy, r] of lobes) {
    ctx.moveTo(cx - r * 0.25 + r * 0.8, cy - r * 0.3)
    ctx.arc(cx - r * 0.25, cy - r * 0.3, r * 0.8, 0, Math.PI * 2)
  }
  fill(ctx, moon)
  ctx.restore()
}

/** The wood: far trees, then the near ones, each standing in the water (or on the island) with its reflection. */
export function drawWood(g: Paint, L: Light, far: boolean): void {
  const { view: v } = g
  for (const [x, h, w, f] of TREES) {
    if (!!f !== far) continue
    if (x + w < v.x0 - 1 || x - w > v.x1 + 1) continue
    const onIsland = x > ISLAND.x0 && x < ISLAND.x1
    const base = onIsland ? GROUND_Y : SEA_Y
    if (!onIsland) reflect(g, () => tree(g, L, x, h, w, far, base), 0.25)
    tree(g, L, x, h, w, far, base)
    if (!onIsland) waterline(g, L, x - 0.14, x + 0.14)
  }
}

/**
 * The wood going back beyond Swamp Bottom: a low line of tree crowns on the far water, darker than the sky, from a
 * little before the station on east. It fades in and out with the place, never cut off at a frame's edge.
 */
export function drawTreeline(g: Paint, L: Light, hy: number, v: { x0: number; x1: number; h: number; cx: number }): void {
  const { ctx } = g
  const a = smooth(v.cx, 214, 226)
  if (a <= 0.01) return
  const tone = mix(lit('#2E3A34', L.ambient, 0.2), L.haze, 0.35)
  ctx.beginPath()
  const r = v.h * 0.03
  for (let x = Math.floor(v.x0 / (r * 1.3)) * r * 1.3 - r * 2; x < v.x1 + r * 2; x += r * 1.3) {
    const i = Math.round(x / (r * 1.3))
    const rr = r * (0.8 + 0.7 * hash(i, 91))
    ctx.moveTo(x + rr, hy - rr * 0.6)
    ctx.arc(x, hy - rr * 0.6, rr, 0, Math.PI * 2)
  }
  ctx.rect(v.x0 - 1, hy - r * 0.6, v.x1 - v.x0 + 2, r * 0.62)
  fill(ctx, rgba(tone, a))
}

/** The island: the raised path from the platform's end into the wood, widening to the cottage's clearing. */
export function drawIsland(g: Paint, L: Light): void {
  const { ctx } = g
  const earth = lit('#5A5038', L.ambient, 0.1)
  const grass = lit('#4E6A3A', L.ambient, 0.1)
  const pts: [number, number][] = [
    [ISLAND.x0 - 0.2, SEA_Y + 0.02],
    [ISLAND.x0 + 0.25, GROUND_Y],
    [ISLAND.x1 - 0.6, GROUND_Y],
    [ISLAND.x1 + 0.4, SEA_Y + 0.02],
  ]
  reflect(g, () => {
    poly(ctx, pts)
    fill(ctx, earth)
  }, 0.25)
  poly(ctx, pts)
  fill(ctx, earth)
  box(ctx, ISLAND.x0 + 0.25, GROUND_Y - 0.01, ISLAND.x1 - ISLAND.x0 - 0.85, 0.05, grass)
  // Reeds at the water's edge, in a few clumps.
  for (const rx of [ISLAND.x0 + 0.1, ISLAND.x0 + 2.6, 247.2, 256.4, ISLAND.x1 + 0.1]) reeds(g, L, rx)
}

function reeds(g: Paint, L: Light, x: number): void {
  const { ctx } = g
  const c = lit('#56683E', L.ambient, 0.1)
  for (let j = 0; j < 6; j++) {
    const bx = x + (j - 2.5) * 0.05
    const h = 0.28 + 0.18 * hash(Math.round(x * 10), j)
    const lean = 0.05 * sway(g.t, 0.3, x + j) * h
    ctx.beginPath()
    ctx.moveTo(bx - 0.012, SEA_Y)
    ctx.quadraticCurveTo(bx + lean * 0.4, SEA_Y - h * 0.6, bx + lean, SEA_Y - h)
    ctx.quadraticCurveTo(bx + lean * 0.4 + 0.008, SEA_Y - h * 0.55, bx + 0.012, SEA_Y)
    fill(ctx, c)
  }
}

/** The cottage in its clearing: low, whitewashed, a steep roof, a chimney, a fence and gate, and one window lit. */
export function drawCottage(g: Paint, L: Light): void {
  const { ctx } = g
  const { x0, x1, gate } = COTTAGE
  const y = GROUND_Y
  const wall = lit('#D9CDB0', L.ambient, 0.1)
  const timber = lit('#4E3E30', L.ambient)
  const roof = lit('#6E5244', L.ambient, 0.1)
  const line = lit('#1E1814', L.ambient)
  const top = y - 1.15
  box(ctx, x0, top, x1 - x0, y - top, wall)
  // Its timbers.
  for (const tx of [x0, x0 + (x1 - x0) / 2, x1 - 0.08]) box(ctx, tx, top, 0.08, y - top, timber)
  box(ctx, x0, top, x1 - x0, 0.08, timber)
  // The chimney and the roof.
  box(ctx, x1 - 0.75, top - 1.05, 0.28, 0.8, lit('#6E5040', L.ambient))
  poly(ctx, [[x0 - 0.3, top + 0.05], [x1 + 0.3, top + 0.05], [x0 + (x1 - x0) / 2, top - 1.15]])
  fill(ctx, roof)
  ink(g, line, 1.5)
  // The door, and the one lit window, warm, with its square of light on the clearing.
  box(ctx, x0 + 0.35, y - 0.62, 0.38, 0.62, lit('#3E2E22', L.ambient))
  const wx = x0 + 1.75
  const wy = y - 0.78
  box(ctx, wx, wy, 0.62, 0.42, mix(lit('#4A4238', L.ambient), '#F2C47A', smooth(L.lamps, 0.3, 0.9)))
  poly(ctx, [[wx + 0.31, wy], [wx + 0.31, wy + 0.42]], false)
  ink(g, timber, 1.2)
  poly(ctx, [[wx, wy + 0.21], [wx + 0.62, wy + 0.21]], false)
  ink(g, timber, 1.2)
  ctx.beginPath()
  ctx.rect(wx, wy, 0.62, 0.42)
  ink(g, line, 1.2)
  pool(ctx, wx + 0.31, y + 0.01, 0.8, '#F2C47A', 0.32 * smooth(L.lamps, 0.3, 0.9), 0.2)
  // The fence along the clearing, and its gate.
  for (let fx = gate - 1.6; fx < x0 - 0.1; fx += 0.32) {
    if (Math.abs(fx - gate) < 0.25) continue
    box(ctx, fx - 0.02, y - 0.32, 0.04, 0.32, timber)
  }
  box(ctx, gate - 1.6, y - 0.26, x0 - 0.1 - (gate - 1.6), 0.035, timber)
  // A little smoke from the chimney.
  for (let i = 0; i < 4; i++) {
    const age = (g.t * 0.6 + i * 1.5) % 6
    const u = age / 6
    circle(ctx, x1 - 0.61 + u * 0.9, top - 1.15 - u * 1.4, 0.12 + u * 0.35)
    fill(ctx, rgba(mix(lit('#8E96A6', L.ambient, 0.3), L.top, 0.2), 0.3 * (1 - u) * smooth(age, 0, 0.6)))
  }
}

/** The lamp: a street lamp on one leg, its lantern lit, its light round its foot; it hops, crouches, bows. */
export function drawLamp(g: Paint, L: Light, t: number, on: number): void {
  if (on <= 0.003) return
  const { ctx } = g
  const { x, lift, bow, squash } = lampAt(t)
  const foot = GROUND_Y - lift
  // Its light on the ground, under it wherever it is (fainter in the air).
  pool(ctx, x, GROUND_Y + 0.02, 1.15, '#F6D08A', 0.5 * on * (1 - lift * 1.5), 0.24)
  const height = 1.05 * (1 - 0.12 * squash)
  ctx.save()
  ctx.globalAlpha = on
  ctx.translate(x, foot)
  ctx.rotate(-0.35 * bow)
  const post = lit('#2E2A26', L.ambient, 0.1)
  // The leg and the post: one thin dark line, a little wider at the foot.
  poly(ctx, [[-0.05, 0], [0.05, 0], [0.025, -height], [-0.025, -height]])
  fill(ctx, post)
  // The lantern: a little glass house with a roof, lit.
  const ly = -height
  poly(ctx, [[-0.11, ly], [0.11, ly], [0.14, ly - 0.24], [-0.14, ly - 0.24]])
  fill(ctx, '#F8DC9A')
  ctx.lineWidth = 0.02
  ctx.strokeStyle = post
  ctx.stroke()
  poly(ctx, [[-0.19, ly - 0.23], [0.19, ly - 0.23], [0, ly - 0.38]])
  fill(ctx, post)
  box(ctx, -0.12, ly - 0.02, 0.24, 0.035, post)
  ctx.restore()
}

/** Swamp Bottom's platform: a small deck at the wood's edge. */
export const SWAMP_DECK = { x0: SWAMP.x0, x1: SWAMP.x1, y: SWAMP.y }
