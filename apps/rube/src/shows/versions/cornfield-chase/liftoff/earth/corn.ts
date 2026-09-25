import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { hash } from '../kit'
import { DUST } from '../worlds'

/**
 * A stalk of corn, side on: a stem that leans, leaves off it left and right
 * that arch and droop, an ear in its husk, and the tassel. Everything the
 * farm grows is one of these at a different height and a different lean.
 *
 * `x, foot` is where it stands, in cells; `h` its height. `sway` bends the
 * whole stalk from the foot (radians at the top); `lift` raises one leaf,
 * the one a ball has just brushed, by index; `shake` sets the tassel going.
 */
export interface Stalk {
  x: number
  foot: number
  h: number
  seed: number
  sway?: number
  lift?: { leaf: number; by: number }
  shake?: number
  /** A lighter stalk, further off. */
  far?: boolean
  /** Three leaves and no ear: a stalk that is only passing. */
  plain?: boolean
}

export function stalk(p: p5, k: number, ink: string, weight: number, s: Stalk): void {
  const n = s.plain ? 3 : 5
  const fill = s.far ? DUST.husk : DUST.leaf
  const w = weight * (s.far ? 0.7 : 0.9)
  // The stem: it bends evenly along its length, so a stalk pushed flat goes down as well as over.
  const bend = (s.sway ?? 0) + (hash(s.seed, 1) - 0.5) * 0.12
  const pts: [number, number][] = [[s.x, s.foot]]
  for (let i = 1; i <= 10; i++) {
    const a = bend * ((i - 0.5) / 10) * 1.6
    const [px, py] = pts[i - 1]
    pts.push([px + Math.sin(a) * s.h * 0.1, py - Math.cos(a) * s.h * 0.1])
  }
  const at = (u: number): [number, number] => {
    const f = Math.max(0, Math.min(10, u * 10))
    const i = Math.min(9, Math.floor(f))
    const r = f - i
    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r]
  }
  p.push()
  p.stroke(ink)
  p.strokeWeight(w * 1.1)
  p.noFill()
  p.beginShape()
  for (let i = 0; i <= 8; i++) {
    const [x, y] = at(i / 8)
    p.vertex(x * k, y * k)
  }
  p.endShape()
  // The leaves, alternate sides, from low to high.
  for (let i = 0; i < n; i++) {
    const u = s.plain ? 0.25 + i * 0.2 : 0.18 + i * 0.14
    const [bx, by] = at(u)
    const side = i % 2 ? 1 : -1
    const len = s.h * (0.42 - i * 0.035) * (0.85 + hash(s.seed, i, 3) * 0.3)
    let rise = 0.55 - i * 0.04
    if (s.lift && s.lift.leaf === i) rise += s.lift.by
    leaf(p, k, ink, w, fill, bx, by, side, len, rise, bend * u)
  }
  // An ear, in its husk, off the stem below the middle.
  if (!s.far && !s.plain) {
    const [ex, ey] = at(0.46)
    const side = hash(s.seed, 9) > 0.5 ? 1 : -1
    p.push()
    p.translate(ex * k, ey * k)
    p.rotate(side * 0.45 + bend * 0.4)
    solid(p, ink, w, DUST.husk)
    p.ellipse(side * 0.07 * k, -0.02 * k, 0.12 * k, 0.24 * k)
    p.noFill()
    p.line(side * 0.07 * k, -0.14 * k, side * 0.09 * k, -0.2 * k)
    p.pop()
  }
  // The tassel: a spray of fine lines that shakes when something knocks the stalk.
  const [tx, ty] = at(1)
  const shake = s.shake ?? 0
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  for (let j = -2; j <= 2; j++) {
    // A heavy head: it swings a couple of slow times as the knock dies away, rather than chattering.
    const a = -Math.PI / 2 + j * 0.35 + bend + Math.sin(shake * 13 + j * 0.6) * 0.22 * Math.min(1, shake * 3)
    const l = s.h * (0.1 + (2 - Math.abs(j)) * 0.02)
    p.line(tx * k, ty * k, (tx + Math.cos(a) * l) * k, (ty + Math.sin(a) * l) * k)
  }
  p.pop()
}

/** One leaf: from the stem out to one side, arching up and drooping to its tip. `rise` is how high it arches. */
function leaf(p: p5, k: number, ink: string, w: number, fill: string, x: number, y: number, side: number, len: number, rise: number, tilt: number): void {
  const tip: [number, number] = [x + side * len * Math.cos(0.5 - rise * 0.2) + tilt * len * 0.5, y - len * (rise - 0.62)]
  const ctl: [number, number] = [x + side * len * 0.45, y - len * rise * 0.85]
  const width = len * 0.1
  solid(p, ink, w, fill)
  p.beginShape()
  p.vertex(x * k, y * k)
  p.quadraticVertex(ctl[0] * k, (ctl[1] - width) * k, tip[0] * k, tip[1] * k)
  p.quadraticVertex(ctl[0] * k, (ctl[1] + width) * k, x * k, (y + width * 0.6) * k)
  p.endShape(p.CLOSE)
}

/** Where a stalk's leaf `i` ends, for a ball that is to brush it. */
export function leafTip(s: Stalk, i: number): [number, number] {
  const u = 0.18 + i * 0.14
  const side = i % 2 ? 1 : -1
  const len = s.h * (0.42 - i * 0.035) * (0.85 + hash(s.seed, i, 3) * 0.3)
  const rise = 0.55 - i * 0.04
  const bx = s.x
  const by = s.foot - s.h * u
  return [bx + side * len * Math.cos(0.5 - rise * 0.2), by - len * (rise - 0.62)]
}

/**
 * A wall of corn behind the track, as one shape: a flat band with a ragged
 * top of leaf tips, a stem line here and there, and tassels standing clear of
 * it. The field reads as a field without a thousand leaves to look at; only
 * the stalks the ball or the truck touches are drawn stalk by stalk.
 */
export function cornWall(p: p5, k: number, ink: string, weight: number, o: { x0: number; x1: number; foot: number; h: number; t: number; fill: string; seed: number; tassels?: boolean; alpha?: number; taper?: [number, number] }): void {
  const step = 0.2
  const X = (x: number) => x * k
  const i0 = Math.floor(o.x0 / step) - 1
  const i1 = Math.ceil(o.x1 / step) + 1
  // Where the field starts and stops, it comes up out of nothing over a cell or so rather than ending in a wall.
  const edge = (x: number) => (o.taper ? Math.min(1, Math.max(0, (x - o.taper[0]) / 1.2), Math.max(0, (o.taper[1] - x) / 1.2)) : 1)
  const top = (i: number) => {
    const x = i * step
    const sway = Math.sin(o.t * 0.9 + x * 0.55) * 0.05
    const e = edge(x)
    const k2 = e * e * (3 - 2 * e)
    return { x: x + sway, y: o.foot - o.h * (0.86 + 0.14 * hash(i, o.seed)) * k2, k: k2 }
  }
  p.push()
  if (o.alpha !== undefined) p.drawingContext.globalAlpha = o.alpha
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(o.fill)
  p.beginShape()
  p.vertex(X(i0 * step), X(o.foot))
  for (let i = i0; i <= i1; i++) {
    const a = top(i)
    const b = top(i + 1)
    // A leaf tip, then the dip between two.
    p.vertex(X(a.x), X(a.y))
    p.vertex(X((a.x + b.x) / 2 + 0.03), X(Math.min(o.foot, (a.y + b.y) / 2 + (0.16 + 0.06 * hash(i, o.seed, 2)) * Math.min(a.k, b.k))))
  }
  p.vertex(X(i1 * step), X(o.foot))
  p.endShape(p.CLOSE)
  // A stem line now and then, and the tassels above the leaves.
  p.stroke(ink)
  for (let i = i0; i <= i1; i++) {
    if (hash(i, o.seed, 4) > 0.45 || edge(i * step) < 0.9) continue
    const a = top(i)
    p.strokeWeight(weight * 0.5)
    p.line(X(a.x - 0.02), X(o.foot - 0.05), X(a.x), X(a.y + 0.15))
    if (o.tassels === false) continue
    p.strokeWeight(weight * 0.6)
    const tx = a.x
    const ty = a.y - 0.02
    for (let j = -1; j <= 1; j++) p.line(X(tx), X(ty), X(tx + j * 0.06 + Math.sin(o.t + i) * 0.01), X(ty - 0.16 + Math.abs(j) * 0.05))
  }
  p.pop()
}
