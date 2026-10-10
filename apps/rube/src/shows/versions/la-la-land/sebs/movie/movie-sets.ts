import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { alpha, glow, hash } from '../kit'
import { MOVIE_MAT as M } from '../worlds'
import { box2, seg, shape, vgrad } from './movie-kit'

/**
 * What fills the home movie's six shots round the three of them: the summer sky a home movie is shot under, with its
 * clouds and birds, and in each place the things a family's film catches without meaning to (the tree by the house,
 * the bunting at the party, the umbrella on the beach, the lounger by the pool, the trees along the far hills). At
 * home, the room is theirs: his piano against the wall, and on the wall the pictures of the life the dream has given
 * them, her show's poster, the two of them in Paris, their wedding.
 *
 * All in the home movie part's cells, drawn behind the balls, inside the gate.
 */

type Rect = { x0: number; y0: number; x1: number; y1: number }

/** A home movie's summer sky: deep at the top, paling to haze at the horizon `yh`. The stock warms it. */
export function summerSky(p: p5, k: number, b: Rect, yh: number): void {
  const at = (y: number) => Math.max(0.01, Math.min(0.99, (y - b.y0) / (b.y1 - b.y0)))
  vgrad(p, k, b.x0, b.y0, b.x1, b.y1, [
    [0, '#6FA9C8'],
    [at(yh - 2.2), '#93C1D3'],
    [at(yh - 0.6), M.sky],
    [at(yh), M.cream],
    [1, M.cream],
  ])
}

/** A fair-weather cloud: a flat underside and three or four round heads, inked as one shape. Drifts with `t`. */
function cloud(p: p5, k: number, ink: string, w: number, x: number, y: number, s: number, i: number): void {
  const heads: [number, number, number][] = [
    [-0.55, -0.02, 0.32],
    [-0.15, -0.2, 0.42],
    [0.3, -0.12, 0.36],
    [0.62, 0.0, 0.24],
  ]
  // The ink first, a hair larger; then the fill over it, so the outline is the whole cloud's and not each head's.
  for (const pass of [0, 1]) {
    p.noStroke()
    if (pass === 0) p.fill(alpha(p, ink, 0.55))
    else p.fill('#FBF4E2')
    const grow = pass === 0 ? w * 0.9 / k : 0
    for (let j = 0; j < heads.length; j++) {
      if (j === 3 && hash(i, 5) < 0.4) continue
      const [hx, hy, r] = heads[j]
      p.circle((x + hx * s) * k, (y + hy * s) * k, (2 * r * s + 2 * grow) * k)
    }
    p.rect(x * k, (y + 0.08 * s) * k, (1.3 * s + 2 * grow) * k, (0.24 * s + 2 * grow) * k, 0.12 * s * k)
  }
  // A shade under it.
  p.fill(alpha(p, M.sky, 0.55))
  p.rect(x * k, (y + 0.15 * s) * k, 1.2 * s * k, 0.08 * s * k, 0.04 * s * k)
}

/** Clouds, each [x, y, size], drifting slowly to the right. */
export function clouds(p: p5, k: number, ink: string, w: number, t: number, list: [number, number, number][]): void {
  list.forEach(([x, y, s], i) => cloud(p, k, ink, w, x + (t - 345) * 0.025 * (0.6 + 0.4 * hash(i, 3)), y, s, i))
}

/** Birds far off: a stroke of two wings each, flapping, crossing slowly. */
export function birds(p: p5, k: number, ink: string, w: number, t: number, x: number, y: number, n: number): void {
  p.noFill()
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(w * 0.7)
  for (let i = 0; i < n; i++) {
    const bx = x + i * 0.32 + (t - 345) * 0.06 + 0.1 * hash(i, 9)
    const by = y + 0.14 * Math.sin(i * 2.1) + 0.03 * Math.sin(t * 0.8 + i)
    const flap = 0.05 * Math.sin(t * 7 + i * 1.7)
    const s = 0.09
    p.beginShape()
    p.vertex((bx - s) * k, (by - 0.02 + flap) * k)
    p.quadraticVertex((bx - s * 0.4) * k, (by - 0.06 - flap * 0.5) * k, bx * k, by * k)
    p.quadraticVertex((bx + s * 0.4) * k, (by - 0.06 - flap * 0.5) * k, (bx + s) * k, (by - 0.02 + flap) * k)
    p.endShape()
  }
}

/** A round garden tree: a trunk, and a canopy of a few overlapping crowns, stirring. */
export function tree(p: p5, k: number, ink: string, w: number, x: number, foot: number, h: number, r: number, t: number): void {
  seg(p, k, [x, foot], [x, foot - h + r * 0.4], ink, w * 2.6)
  seg(p, k, [x, foot], [x, foot - h + r * 0.4], M.warm, w * 1.3)
  const crowns: [number, number, number][] = [
    [-0.55, 0.15, 0.62],
    [0.5, 0.12, 0.66],
    [0, -0.3, 0.8],
  ]
  const sway = 0.02 * Math.sin(t * 0.9)
  for (const pass of [0, 1]) {
    p.noStroke()
    p.fill(pass === 0 ? ink : M.teal)
    for (const [cx, cy, cr] of crowns) p.circle((x + cx * r + sway) * k, (foot - h + cy * r) * k, (2 * cr * r + (pass === 0 ? (2 * w * 0.9) / k : 0)) * k)
  }
  // The light side.
  p.fill(alpha(p, M.grass, 0.6))
  p.circle((x - 0.2 * r + sway) * k, (foot - h - 0.45 * r) * k, 0.8 * r * k)
}

/** A low hedge along the back of a lawn at `y`, from x0 to x1. */
export function hedge(p: p5, k: number, ink: string, w: number, x0: number, x1: number, y: number, h: number): void {
  p.fill(alpha(p, M.teal, 0.8))
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.beginShape()
  p.vertex(x0 * k, (y + 0.01) * k)
  for (let x = x0; x <= x1 + 1e-6; x += 0.2) p.vertex(x * k, (y - h - 0.05 * Math.sin(x * 4.1) - 0.03 * hash(Math.round(x * 5), 4)) * k)
  p.vertex(x1 * k, (y + 0.01) * k)
  p.endShape(p.CLOSE)
}

/** A mailbox on its post, its flag up. */
export function mailbox(p: p5, k: number, ink: string, w: number, x: number, foot: number): void {
  seg(p, k, [x, foot], [x, foot - 0.55], ink, w * 1.4)
  box2(p, k, x - 0.17, foot - 0.74, x + 0.17, foot - 0.55, M.teal, ink, w * 0.9, 0.07)
  seg(p, k, [x + 0.12, foot - 0.62], [x + 0.12, foot - 0.84], ink, w * 0.7)
  shape(p, k, [[x + 0.12, foot - 0.84], [x + 0.24, foot - 0.8], [x + 0.12, foot - 0.76]], M.orange, ink, w * 0.5)
}

/** A bed of flowers along the foot of a wall: low bushes with dots of colour. */
export function flowerBed(p: p5, k: number, ink: string, w: number, x0: number, x1: number, foot: number): void {
  for (let x = x0, i = 0; x < x1; x += 0.42, i++) {
    const r = 0.18 + 0.05 * hash(i, 61)
    p.fill(M.grass)
    p.stroke(ink)
    p.strokeWeight(w * 0.6)
    p.arc((x + 0.2) * k, foot * k, 2 * r * k, 2.2 * r * k, Math.PI, 2 * Math.PI, p.CHORD)
    p.noStroke()
    for (let j = 0; j < 3; j++) {
      p.fill(j % 2 ? M.pink : M.orange)
      p.circle((x + 0.08 + 0.12 * j + 0.03 * hash(i, j)) * k, (foot - r * (0.45 + 0.35 * hash(i, j + 4))) * k, 0.07 * k)
    }
  }
}

/** Bunting on a line that sags between two points: little flags in the party's colours, stirring. */
export function bunting(p: p5, k: number, ink: string, w: number, a: Pt, b: Pt, sag: number, t: number): void {
  const n = 16
  const at = (u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + sag * 4 * u * (1 - u)]
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  p.beginShape()
  for (let i = 0; i <= 24; i++) {
    const [x, y] = at(i / 24)
    p.vertex(x * k, y * k)
  }
  p.endShape()
  const cols = [M.orange, M.teal, M.pink, M.sun, M.pool]
  for (let i = 0; i < n; i++) {
    const u0 = (i + 0.15) / n
    const u1 = (i + 0.85) / n
    const [x0, y0] = at(u0)
    const [x1, y1] = at(u1)
    const flutter = 0.03 * Math.sin(t * 3 + i * 1.3)
    shape(p, k, [[x0, y0], [x1, y1], [(x0 + x1) / 2 + flutter, (y0 + y1) / 2 + 0.22]], cols[i % cols.length], ink, w * 0.5)
  }
}

/** A garden table with a cloth, a jug of lemonade and paper cups: behind the party. */
export function partyTable(p: p5, k: number, ink: string, w: number, x: number, foot: number): void {
  const top = foot - 0.5
  seg(p, k, [x - 0.45, top], [x - 0.5, foot], ink, w * 1.1)
  seg(p, k, [x + 0.45, top], [x + 0.5, foot], ink, w * 1.1)
  shape(p, k, [[x - 0.62, top - 0.02], [x + 0.62, top - 0.02], [x + 0.66, top + 0.2], [x - 0.66, top + 0.2]], M.cream, ink, w * 0.9)
  for (let i = 0; i < 6; i++) {
    const cx = x - 0.55 + i * 0.22
    p.fill(i % 2 ? M.pink : M.cream)
    p.noStroke()
    p.triangle(cx * k, (top + 0.2) * k, (cx + 0.11) * k, (top + 0.2) * k, (cx + 0.055) * k, (top + 0.28) * k)
  }
  // The jug, half full, and three cups.
  box2(p, k, x - 0.42, top - 0.34, x - 0.22, top - 0.02, alpha(p, M.cream, 0.9), ink, w * 0.8, 0.04)
  box2(p, k, x - 0.42, top - 0.18, x - 0.22, top - 0.02, M.sun, null, 0, 0.03)
  for (const [cx, col] of [[0.0, M.teal], [0.18, M.orange], [0.36, M.pink]] as [number, string][]) {
    shape(p, k, [[x + cx - 0.06, top - 0.16], [x + cx + 0.06, top - 0.16], [x + cx + 0.045, top - 0.02], [x + cx - 0.045, top - 0.02]], col, ink, w * 0.6)
  }
}

/** A striped beach umbrella planted in the sand, leaning, and a towel spread beside it. */
export function umbrella(p: p5, k: number, ink: string, w: number, x: number, foot: number, t: number): void {
  // The towel on the sand.
  shape(p, k, [[x + 0.1, foot - 0.02], [x + 1.15, foot - 0.02], [x + 1.12, foot + 0.04], [x + 0.13, foot + 0.04]], M.pink, ink, w * 0.6)
  for (let i = 0; i < 4; i++) seg(p, k, [x + 0.3 + i * 0.22, foot - 0.02], [x + 0.3 + i * 0.22, foot + 0.04], alpha(p, M.cream, 0.9), w)
  const top: Pt = [x + 0.2, foot - 1.25]
  seg(p, k, [x, foot + 0.05], top, ink, w * 1.3)
  // The canopy: a low dome over the pole's top, in stripes, its hem scalloped and stirring.
  const r = 0.72
  const hem = top[1] + 0.32
  const flap = 0.012 * Math.sin(t * 2.4)
  const at = (a: number): Pt => [top[0] + Math.cos(a) * r, hem - Math.sin(a) * 0.36]
  const n = 6
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI
    const a1 = ((i + 1) / n) * Math.PI
    const pts: Pt[] = [[top[0], hem]]
    for (let j = 0; j <= 4; j++) pts.push(at(a0 + ((a1 - a0) * j) / 4))
    shape(p, k, pts, i % 2 ? M.cream : M.orange, ink, w * 0.7)
  }
  for (let i = 0; i < n; i++) {
    const x0 = top[0] - r + (2 * r * i) / n
    const x1 = x0 + (2 * r) / n
    p.fill(i % 2 ? M.orange : M.cream)
    p.stroke(ink)
    p.strokeWeight(w * 0.5)
    p.arc(((x0 + x1) / 2) * k, (hem + flap) * k, (x1 - x0) * k, 0.12 * k, 0, Math.PI, p.CHORD)
  }
  p.noStroke()
  p.fill(ink)
  p.circle(top[0] * k, (hem - 0.38) * k, 0.06 * k)
}

/** A sailboat far out on the horizon `y`, drifting. */
export function sailboat(p: p5, k: number, ink: string, w: number, x: number, y: number): void {
  shape(p, k, [[x - 0.22, y - 0.04], [x + 0.22, y - 0.04], [x + 0.15, y + 0.03], [x - 0.15, y + 0.03]], M.orange, ink, w * 0.5)
  shape(p, k, [[x, y - 0.06], [x, y - 0.5], [x + 0.2, y - 0.08]], M.cream, ink, w * 0.5)
  shape(p, k, [[x - 0.02, y - 0.08], [x - 0.02, y - 0.4], [x - 0.17, y - 0.08]], M.cream, ink, w * 0.5)
}

/** A lounger on the deck, a towel over its back, and a glass on the tiles beside it. */
export function lounger(p: p5, k: number, ink: string, w: number, x: number, foot: number): void {
  const seat = foot - 0.22
  seg(p, k, [x - 0.4, seat], [x - 0.42, foot], ink, w)
  seg(p, k, [x + 0.45, seat], [x + 0.47, foot], ink, w)
  shape(p, k, [[x - 0.55, seat - 0.05], [x + 0.55, seat - 0.05], [x + 0.55, seat + 0.02], [x - 0.55, seat + 0.02]], M.cream, ink, w * 0.8)
  shape(p, k, [[x - 0.55, seat - 0.05], [x - 0.5, seat + 0.02], [x - 0.86, seat - 0.48], [x - 0.92, seat - 0.44]], M.cream, ink, w * 0.8)
  for (let i = 0; i < 4; i++) seg(p, k, [x - 0.45 + i * 0.28, seat - 0.05], [x - 0.45 + i * 0.28, seat + 0.02], alpha(p, M.teal, 0.8), w * 1.4)
  shape(p, k, [[x - 0.78, seat - 0.4], [x - 0.6, seat - 0.12], [x - 0.66, seat + 0.05], [x - 0.84, seat - 0.24]], M.pink, ink, w * 0.5)
  shape(p, k, [[x + 0.68, foot - 0.15], [x + 0.78, foot - 0.15], [x + 0.76, foot], [x + 0.7, foot]], alpha(p, M.cream, 0.8), ink, w * 0.5)
  box2(p, k, x + 0.7, foot - 0.09, x + 0.76, foot - 0.01, M.orange, null)
}

/** A rubber ring riding the pool, bobbing at x on the water's surface `y`. */
export function poolRing(p: p5, k: number, ink: string, w: number, x: number, y: number, t: number): void {
  const bob = 0.012 * Math.sin(t * 2.2)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(M.orange)
  p.ellipse(x * k, (y + bob) * k, 0.62 * k, 0.17 * k)
  p.fill(M.pool)
  p.ellipse(x * k, (y + bob - 0.01) * k, 0.3 * k, 0.07 * k)
  p.noStroke()
  p.fill(M.cream)
  for (const dx of [-0.22, 0.22]) p.ellipse((x + dx) * k, (y + bob) * k, 0.08 * k, 0.15 * k)
}

/** A row of round trees along a far line `y(x)`, small with distance, from x0 to x1. */
export function farTrees(p: p5, k: number, ink: string, w: number, x0: number, x1: number, y: (x: number) => number): void {
  for (let x = x0, i = 0; x < x1; x += 0.55 + 0.4 * hash(i, 51), i++) {
    if (hash(i, 52) < 0.3) continue
    const r = 0.13 + 0.08 * hash(i, 53)
    const foot = y(x) + 0.03
    seg(p, k, [x, foot], [x, foot - r * 1.2], alpha(p, ink, 0.6), w * 0.8)
    p.fill(alpha(p, M.teal, 0.85))
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(w * 0.6)
    p.ellipse(x * k, (foot - r * 1.6) * k, 1.6 * r * k, 2 * r * k)
  }
}

/** Two butterflies about the field, fluttering a loose figure about `x`, `y`. */
export function butterflies(p: p5, k: number, ink: string, w: number, t: number, x: number, y: number): void {
  for (let i = 0; i < 2; i++) {
    const ph = t * (0.9 + 0.2 * i) + i * 2.4
    const bx = x + i * 1.6 + 0.6 * Math.sin(ph) + 0.25 * Math.sin(ph * 2.3)
    const by = y - 0.2 * i + 0.25 * Math.sin(ph * 1.7) + 0.1 * Math.cos(ph * 3.1)
    const open = Math.abs(Math.sin(t * 14 + i * 2))
    const col = i ? M.pink : M.sun
    p.stroke(ink)
    p.strokeWeight(w * 0.4)
    p.fill(col)
    p.ellipse((bx - 0.045 * open) * k, by * k, 0.09 * open * k + 1, 0.08 * k)
    p.ellipse((bx + 0.045 * open) * k, by * k, 0.09 * open * k + 1, 0.08 * k)
  }
}

/**
 * Their home's wall: his upright piano against it at the left (its lid up, its keys, a photo on top), and on the
 * wall the pictures of the dream's life: the two of them on their wedding day, her show's poster (her window and its
 * red curtains, a gold star), the two of them by the tower in Paris. A rug before the couch; a plant by the lamp.
 */
export function homeWall(p: p5, k: number, ink: string, w: number, floor: number, lampOn: number): void {
  const wood = '#7A5238'
  const woodDeep = '#55382A'
  // The piano.
  const px0 = 1.95
  const px1 = 3.55
  const top = -0.78
  box2(p, k, px0, top, px1, floor - 0.02, wood, ink, w)
  box2(p, k, px0 - 0.06, top - 0.07, px1 + 0.06, top, woodDeep, ink, w * 0.9)
  // The fallboard's music desk, and the keys under it.
  box2(p, k, px0 + 0.12, top + 0.12, px1 - 0.12, top + 0.5, alpha(p, woodDeep, 0.7), ink, w * 0.6)
  box2(p, k, px0 + 0.05, top + 0.58, px1 - 0.05, top + 0.7, '#FBF4E2', ink, w * 0.7)
  for (let i = 1; i < 14; i++) {
    const x = px0 + 0.05 + (i / 14) * (px1 - px0 - 0.1)
    if ([1, 2, 4, 5, 6, 8, 9, 11, 12, 13].includes(i)) box2(p, k, x - 0.025, top + 0.58, x + 0.025, top + 0.65, ink, null)
  }
  box2(p, k, px0 + 0.02, top + 0.7, px1 - 0.02, top + 0.76, woodDeep, ink, w * 0.6)
  // Its legs, and the pedals.
  for (const lx of [px0 + 0.12, px1 - 0.12]) box2(p, k, lx - 0.05, top + 0.76, lx + 0.05, floor - 0.02, woodDeep, ink, w * 0.6)
  for (const lx of [-0.12, 0, 0.12]) box2(p, k, (px0 + px1) / 2 + lx - 0.03, floor - 0.08, (px0 + px1) / 2 + lx + 0.03, floor - 0.03, M.sun, null)
  // Sheet music on its desk; a framed photo and a small vase on its top.
  box2(p, k, px0 + 0.45, top + 0.16, px0 + 0.75, top + 0.46, '#FBF4E2', ink, w * 0.4)
  box2(p, k, px0 + 0.78, top + 0.18, px0 + 1.08, top + 0.46, '#FBF4E2', ink, w * 0.4)
  for (let i = 0; i < 4; i++) {
    seg(p, k, [px0 + 0.49, top + 0.22 + i * 0.06], [px0 + 0.71, top + 0.22 + i * 0.06], alpha(p, ink, 0.4), w * 0.4)
    seg(p, k, [px0 + 0.82, top + 0.24 + i * 0.06], [px0 + 1.04, top + 0.24 + i * 0.06], alpha(p, ink, 0.4), w * 0.4)
  }
  box2(p, k, px0 + 0.2, top - 0.37, px0 + 0.48, top - 0.07, M.cream, ink, w * 0.6)
  p.noStroke()
  p.fill(M.teal)
  p.circle((px0 + 0.3) * k, (top - 0.18) * k, 0.09 * k)
  p.fill(M.sun)
  p.circle((px0 + 0.39) * k, (top - 0.18) * k, 0.09 * k)
  shape(p, k, [[px1 - 0.42, top - 0.07], [px1 - 0.24, top - 0.07], [px1 - 0.27, top - 0.3], [px1 - 0.39, top - 0.3]], M.pool, ink, w * 0.6)
  for (const [dx, col] of [[-0.06, M.pink], [0.05, M.orange], [0, M.pink]] as [number, string][]) {
    seg(p, k, [px1 - 0.33, top - 0.3], [px1 - 0.33 + dx * 2, top - 0.48], ink, w * 0.5)
    p.fill(col)
    p.noStroke()
    p.circle((px1 - 0.33 + dx * 2) * k, (top - 0.5) * k, 0.08 * k)
  }
  // The wedding photo over the piano: the two of them, side by side, in a gold frame.
  const frame = (x0: number, y0: number, x1: number, y1: number, rim: string, fill: string) => {
    box2(p, k, x0, y0, x1, y1, rim, ink, w * 0.8)
    box2(p, k, x0 + 0.06, y0 + 0.06, x1 - 0.06, y1 - 0.06, fill, ink, w * 0.5)
  }
  frame(2.35, -2.05, 3.15, -1.3, M.sun, '#EADFC6')
  p.stroke(ink)
  p.strokeWeight(w * 0.5)
  p.fill('#4C7FD9')
  p.circle(2.62 * k, -1.62 * k, 0.2 * k)
  p.fill('#F2C230')
  p.circle(2.88 * k, -1.62 * k, 0.2 * k)
  // Her show's poster, by the lamp: her window with its red curtains, a gold star over it.
  frame(6.95, -2.2, 7.8, -1.05, woodDeep, '#5B2230')
  box2(p, k, 7.17, -1.78, 7.58, -1.32, '#F6E3B8', ink, w * 0.5)
  shape(p, k, [[7.15, -1.8], [7.3, -1.8], [7.2, -1.3], [7.15, -1.3]], '#C23B48', null)
  shape(p, k, [[7.6, -1.8], [7.45, -1.8], [7.55, -1.3], [7.6, -1.3]], '#C23B48', null)
  p.noStroke()
  p.fill('#F2C230')
  p.circle(7.375 * k, -1.42 * k, 0.1 * k)
  star(p, k, 7.375, -1.98, 0.08, M.sun)
  // Paris: the two of them small by the tower, in a blue night.
  frame(6.95, -0.88, 7.65, -0.3, M.cream, '#2D3F7A')
  shape(p, k, [[7.42, -0.37], [7.5, -0.37], [7.47, -0.6], [7.46, -0.78], [7.45, -0.6]], '#E9D9B6', null)
  p.fill('#4C7FD9')
  p.circle(7.14 * k, -0.43 * k, 0.07 * k)
  p.fill('#F2C230')
  p.circle(7.23 * k, -0.43 * k, 0.07 * k)
  // The rug before the couch, and a plant in a pot by the lamp.
  shape(p, k, [[3.85, floor + 0.02], [6.45, floor + 0.02], [6.55, floor + 0.12], [3.75, floor + 0.12]], '#C2604A', ink, w * 0.6)
  for (let i = 0; i < 7; i++) seg(p, k, [3.95 + i * 0.37, floor + 0.04], [3.92 + i * 0.37, floor + 0.1], alpha(p, M.cream, 0.6), w * 0.6)
  const px = 7.55
  shape(p, k, [[px - 0.2, floor - 0.32], [px + 0.2, floor - 0.32], [px + 0.15, floor], [px - 0.15, floor]], M.orange, ink, w * 0.8)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.45
    const L = 0.45 + 0.1 * hash(i, 31)
    shape(p, k, [[px, floor - 0.32], [px + Math.cos(a) * L * 0.6 + 0.06, floor - 0.32 + Math.sin(a) * L * 0.6], [px + Math.cos(a) * L, floor - 0.32 + Math.sin(a) * L], [px + Math.cos(a) * L * 0.6 - 0.06, floor - 0.32 + Math.sin(a) * L * 0.6]], M.grass, ink, w * 0.5)
  }
  // The lamp's light on all of it.
  glow(p, k, 6.55, -1.2, 1.6, M.sun, 0.12 * lampOn)
}

function star(p: p5, k: number, x: number, y: number, r: number, col: string): void {
  p.noStroke()
  p.fill(col)
  p.beginShape()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    p.vertex((x + Math.cos(a) * rr) * k, (y + Math.sin(a) * rr) * k)
  }
  p.endShape(p.CLOSE)
}
