import type { Pt } from '../../../../../parts'
import { layer, motes, onLayer, shaft, sway, view, type View } from '../depth'
import { hash, scenery } from '../kit'
import { mix, ramp, rgba } from '../negatives/hand'
import { goldAt, S, sunAt, whiteAt } from './light'
import { ANCHOR, REF } from './sky'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * - The near plane: a street tree's leaves over the top and a mailbox at the kerb below as the camera comes along the
 *   pavement; and, for the long view, the leaves of the trees on this side hanging into the top corners, a hydrant and,
 *   last, a lamp post at the kerb, coming in from the frame's edges as the camera draws back and goes on along. All of it at the frame's edges, never over the two of
 *   them, and none of it tall enough at the bottom to reach the pavement where they roll.
 * - The air: shafts of the low sun down the street through the haze, and the dust turning in them.
 * - The grade: gold from the top, a cool blue in the street's shade, the frame's edges falling away warm; through the
 *   credits the morning whitens.
 */

type C2 = CanvasRenderingContext2D

/** The near plane's depth, and where it is composed: for the walk (close), and for the long view (wide). */
const Z = 1.45
const CLOSE: { anchor: Pt; ref: number } = { anchor: [3.6, -0.75], ref: 3.6 }
const WIDE: { anchor: Pt; ref: number } = { anchor: [10.5, -2.9], ref: 10.5 }

/** A spray of leaves hanging from a bough: silhouettes against the light, a few lit through, each stirring. */
function leaves(ctx: C2, k: number, t: number, at: Pt, spread: Pt, n: number, seed: number, bough: Pt): void {
  const dark = new Path2D()
  const lit = new Path2D()
  const wind = sway(t, 0.18, seed)
  ctx.strokeStyle = '#3B3A30'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(2, 0.08 * k)
  ctx.beginPath()
  ctx.moveTo(bough[0] * k, bough[1] * k)
  ctx.quadraticCurveTo(((bough[0] + at[0]) / 2) * k, (Math.min(bough[1], at[1]) - 0.3) * k, (at[0] + wind * 0.05) * k, at[1] * k)
  ctx.stroke()
  ctx.lineCap = 'butt'
  for (let i = 0; i < n; i++) {
    const a = hash(i, 1, seed) * Math.PI * 2
    const d = Math.sqrt(hash(i, 2, seed))
    const droop = d * 0.35
    const x = at[0] + Math.cos(a) * d * spread[0] + wind * 0.08 * d + 0.03 * sway(t, 0.5 + hash(i, 3, seed), i)
    const y = at[1] + Math.sin(a) * d * spread[1] + droop
    const r = 0.11 + 0.08 * hash(i, 4, seed)
    const rot = hash(i, 5, seed) * 3 + 0.25 * sway(t, 0.4, i + seed)
    const p = hash(i, 6, seed) > 0.78 ? lit : dark
    // A leaf: pointed at both ends.
    const cx = Math.cos(rot) * r
    const cy = Math.sin(rot) * r
    p.moveTo((x - cx) * k, (y - cy) * k)
    p.quadraticCurveTo((x - cy * 0.5) * k, (y + cx * 0.5) * k, (x + cx) * k, (y + cy) * k)
    p.quadraticCurveTo((x + cy * 0.5) * k, (y - cx * 0.5) * k, (x - cx) * k, (y - cy) * k)
  }
  ctx.fillStyle = '#36402D'
  ctx.fill(dark)
  ctx.fillStyle = '#7C9256'
  ctx.fill(lit)
}

/** The mailbox at the kerb: the blue box with its rounded head, on its legs; the sun down its right side. */
function mailbox(ctx: C2, k: number, x: number, foot: number): void {
  const w = 0.62
  const h = 0.95
  ctx.fillStyle = '#2B4A72'
  ctx.beginPath()
  ctx.moveTo((x - w / 2) * k, (foot - 0.18) * k)
  ctx.lineTo((x - w / 2) * k, (foot - h + 0.2) * k)
  ctx.quadraticCurveTo((x - w / 2) * k, (foot - h) * k, x * k, (foot - h) * k)
  ctx.quadraticCurveTo((x + w / 2) * k, (foot - h) * k, (x + w / 2) * k, (foot - h + 0.2) * k)
  ctx.lineTo((x + w / 2) * k, (foot - 0.18) * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#5F7FA6'
  ctx.fillRect((x + w / 2 - 0.08) * k, (foot - h + 0.15) * k, 0.08 * k, (h - 0.33) * k)
  ctx.fillStyle = '#1C2B3E'
  ctx.fillRect((x - 0.2) * k, (foot - h + 0.3) * k, 0.4 * k, 0.05 * k)
  ctx.fillRect((x - w / 2 + 0.04) * k, (foot - 0.18) * k, 0.06 * k, 0.18 * k)
  ctx.fillRect((x + w / 2 - 0.1) * k, (foot - 0.18) * k, 0.06 * k, 0.18 * k)
}

/** A hydrant: ochre, its cap and its two nozzles; the sun on its right. */
function hydrant(ctx: C2, k: number, x: number, foot: number): void {
  ctx.fillStyle = '#B98F2E'
  ctx.fillRect((x - 0.13) * k, (foot - 0.62) * k, 0.26 * k, 0.62 * k)
  ctx.fillRect((x - 0.19) * k, (foot - 0.08) * k, 0.38 * k, 0.08 * k)
  ctx.fillRect((x - 0.24) * k, (foot - 0.46) * k, 0.48 * k, 0.12 * k)
  ctx.beginPath()
  ctx.arc(x * k, (foot - 0.62) * k, 0.14 * k, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#E6C46E'
  ctx.fillRect((x + 0.07) * k, (foot - 0.6) * k, 0.06 * k, 0.52 * k)
  ctx.fillStyle = '#4A4436'
  ctx.fillRect((x - 0.03) * k, (foot - 0.82) * k, 0.06 * k, 0.07 * k)
}

/** A lamp post at the kerb, near: its fluted foot, the pole, the crook over the street, the lamp out by day; the sun down its right. */
function lampPost(ctx: C2, k: number, x: number, foot: number, h: number): void {
  const c = '#33403A'
  const top = foot - h
  ctx.fillStyle = c
  ctx.fillRect((x - 0.16) * k, (foot - 1.1) * k, 0.32 * k, 1.1 * k)
  ctx.fillRect((x - 0.1) * k, (foot - 1.4) * k, 0.2 * k, 0.3 * k)
  ctx.fillRect((x - 0.07) * k, top * k, 0.14 * k, (h - 1.4) * k)
  ctx.strokeStyle = c
  ctx.lineWidth = 0.12 * k
  ctx.beginPath()
  ctx.moveTo(x * k, (top + 0.1) * k)
  ctx.quadraticCurveTo(x * k, (top - 0.7) * k, (x - 0.8) * k, (top - 0.55) * k)
  ctx.stroke()
  ctx.fillRect((x - 1.05) * k, (top - 0.62) * k, 0.5 * k, 0.24 * k)
  ctx.fillStyle = '#E9E3D2'
  ctx.fillRect((x - 1.0) * k, (top - 0.38) * k, 0.4 * k, 0.06 * k)
  ctx.fillStyle = '#6E7C70'
  ctx.fillRect((x + 0.03) * k, top * k, 0.04 * k, (h - 1.4) * k)
  ctx.fillRect((x + 0.08) * k, (foot - 1.1) * k, 0.08 * k, 1.1 * k)
}

/** The near plane at `t`: what passes close to the lens. */
function near(ctx: C2, v: View, t: number): void {
  const k = v.k
  // Along the pavement: the street tree by the shop over the top, and the mailbox at the kerb going by below, as
  // the camera comes in; the mailbox comes back into the long view's corner as it draws back.
  layer(ctx, v, Z, CLOSE.anchor, CLOSE.ref, () => {
    leaves(ctx, k, t, [-3.9, -2.45], [1.5, 0.45], 70, 11, [-5.6, -3.0])
    mailbox(ctx, k, 0.4, 1.55)
  })
  // For the long view: the trees on this side into the top corners, the hydrant and a lamp post at the kerb.
  layer(ctx, v, Z, WIDE.anchor, WIDE.ref, () => {
    leaves(ctx, k, t, [1.7, -7.15], [2.0, 0.7], 90, 12, [-0.8, -8.2])
    leaves(ctx, k, t, [23.6, -7.3], [2.0, 0.65], 80, 13, [26.3, -8.4])
    hydrant(ctx, k, 21.6, 1.75)
    lampPost(ctx, k, 25.3, 2.25, 9.2)
  })
}

/** The sun's shafts down the street, from where the sun is (or, close in, from beyond the frame's top right). */
function shafts(ctx: C2, v: View, t: number): void {
  const k = v.k
  const gold = goldAt(t)
  const w = whiteAt(t)
  const sun = onLayer(v, 0.04, ANCHOR, REF, sunAt(t))
  // Close in, the sun is behind the fronts: the shafts come from above the frame's right.
  const open = ramp(v.h, 4.5, 9)
  const off: Pt = [v.x1 + v.w * 0.25, v.y0 - v.h * 0.35]
  const src: Pt = [off[0] + (sun[0] - off[0]) * open, off[1] + (sun[1] - off[1]) * open]
  const len = v.w * 1.15
  const hex = mix(S.sun, S.gold, 0.35 * gold * (1 - w))
  const beams: [number, number, number][] = [
    [0.12, 0.1, 0.34],
    [0.36, 0.1, 0.4],
  ]
  for (const [i, [ang, a, wd]] of beams.entries()) {
    const th = Math.PI + ang + 0.05 * sway(t, 0.03, i) + 0.12 * (1 - open)
    const b: Pt = [src[0] + Math.cos(th) * len, src[1] - Math.sin(th) * len]
    shaft(ctx, k, src, v.w * 0.02, b, v.w * wd, hex, a * (0.7 + 0.3 * gold) * (0.75 + 0.25 * Math.sin(t * 0.37 + i * 2)))
  }
}

/**
 * The grade: the frame's edges falling away warm, in a band up each side and along the foot (so the street's foot is
 * a little deeper than the sky, and the lower corners deepest), thinning as the morning whitens.
 */
function grade(ctx: C2, v: View, w: number): void {
  const k = v.k
  const a = 1 - 0.45 * w
  const ink = '#4A3B2C'
  // One band: from `depth` at the edge (x0, y0) to nothing at (x1, y1), over the box it spans.
  const band = (x0: number, y0: number, x1: number, y1: number, depth: number, box: [number, number, number, number]) => {
    const g = ctx.createLinearGradient(x0 * k, y0 * k, x1 * k, y1 * k)
    g.addColorStop(0, rgba(ink, depth * a))
    g.addColorStop(0.5, rgba(ink, depth * 0.3 * a))
    g.addColorStop(1, rgba(ink, 0))
    ctx.fillStyle = g
    ctx.fillRect(box[0] * k, box[1] * k, (box[2] - box[0]) * k, (box[3] - box[1]) * k)
  }
  const bh = v.h * 0.17
  const bw = v.w * 0.08
  const [x0, y0, x1, y1] = [v.x0 - 0.5, v.y0 - 0.5, v.x1 + 0.5, v.y1 + 0.5]
  band(0, v.y1, 0, v.y1 - bh, 0.2, [x0, v.y1 - bh, x1, y1])
  band(v.x0, 0, v.x0 + bw, 0, 0.16, [x0, y0, v.x0 + bw, y1])
  band(v.x1, 0, v.x1 - bw, 0, 0.16, [v.x1 - bw, y0, x1, y1])
}

export const streetFront = scenery<null>({
  name: 'street-front',
  draw: (p, _s, c) => {
    const ctx = p.drawingContext as C2
    const v = view(p, c.k)
    const t = c.t
    const w = whiteAt(t)
    ctx.save()
    shafts(ctx, v, t)
    // Dust turning in the light, near the lens.
    layer(ctx, v, 1.15, WIDE.anchor, WIDE.ref, (f) => {
      motes(ctx, f, t, { n: 6, seed: 21, tile: [3.2, 2.4], r: [0.006, 0.014], v: [-0.12, -0.05], spread: 0.5, sway: [0.08, 0.15], color: rgba('#FFF3D8', 0.5) })
    })
    near(ctx, v, t)
    // The grade: gold from the top, a cool blue in the street's shade; the whitening of the late morning; the edges.
    grade(ctx, v, w)
    ctx.restore()
  },
})
