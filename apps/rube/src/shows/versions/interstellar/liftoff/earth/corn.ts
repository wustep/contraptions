import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
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
 * A wall of corn behind the track, as one shape: a band of leaves whose top is
 * a run of arching leaves, each drooping into the next, and a few tassels
 * standing clear of it. It is drawn as a plane of light, not of strokes: sunlit
 * along its top and going into shade toward its foot, inked once along its top
 * and nowhere else. The field reads as a field without a thousand leaves (or a
 * thousand stems) to look at; only the stalks the ball or the truck touches are
 * drawn stalk by stalk.
 */
export function cornWall(p: p5, k: number, ink: string, weight: number, o: { x0: number; x1: number; foot: number; h: number; t: number; fill: string; seed: number; tassels?: boolean; alpha?: number; taper?: [number, number]; step?: number; line?: number }): void {
  // How wide a leaf is along the top, and how strong its one line (a far wall wants fewer, bigger leaves and less ink).
  const step = o.step ?? 0.24
  const line = o.line ?? 1
  const X = (x: number) => x * k
  const i0 = Math.floor(o.x0 / step) - 1
  const i1 = Math.ceil(o.x1 / step) + 1
  // Where the field starts and stops, it comes up out of nothing over a cell or so rather than ending in a wall.
  const edge = (x: number) => (o.taper ? Math.min(1, Math.max(0, (x - o.taper[0]) / 1.2), Math.max(0, (o.taper[1] - x) / 1.2)) : 1)
  // Each leaf's tip: a little off the grid, a little higher or lower, all of them leaning the same way in the wind.
  const tip = (i: number) => {
    const x = i * step + (hash(i, o.seed, 5) - 0.5) * 0.08
    const sway = Math.sin(o.t * 0.9 + x * 0.55) * 0.04
    const e = edge(x)
    const k2 = e * e * (3 - 2 * e)
    return { x: x + sway, y: o.foot - o.h * (0.93 + 0.07 * hash(i, o.seed)) * k2, k: k2 }
  }
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha
  // The canopy's edge, as curves: from a tip, the leaf arches on and droops into the dip; from the dip, the next leaf
  // rises to its tip. The dips are shallow, so the top reads as leaves, not teeth.
  const path = new Path2D()
  const edgeRuns: Path2D[] = []
  let run: Path2D | null = null
  const first = tip(i0)
  path.moveTo(X(first.x), X(o.foot))
  path.lineTo(X(first.x), X(first.y))
  for (let i = i0; i < i1; i++) {
    const a = tip(i)
    const b = tip(i + 1)
    const depth = (0.08 + 0.06 * hash(i, o.seed, 2)) * Math.min(a.k, b.k)
    const dx = b.x - a.x
    // A leaf arches over from its tip and droops into the dip; the next rises out of it steeply to its own tip, so
    // each tip is a point and they all lean one way, like a field in the wind.
    const dip: [number, number] = [a.x + dx * 0.72, Math.min(o.foot, Math.max(a.y, b.y) + depth)]
    const c1: [number, number] = [a.x + dx * 0.32, a.y - 0.012 * a.k]
    const c2: [number, number] = [b.x - dx * 0.04, dip[1] - depth * 0.15]
    path.quadraticCurveTo(X(c1[0]), X(c1[1]), X(dip[0]), X(dip[1]))
    path.quadraticCurveTo(X(c2[0]), X(c2[1]), X(b.x), X(b.y))
    // Inked only where the wall stands: a wall of no height would be a bare line along its foot.
    const stands = Math.min(a.k, b.k) > 0.05
    if (stands) {
      if (!run) {
        run = new Path2D()
        run.moveTo(X(a.x), X(a.y))
        edgeRuns.push(run)
      }
      run.quadraticCurveTo(X(c1[0]), X(c1[1]), X(dip[0]), X(dip[1]))
      run.quadraticCurveTo(X(c2[0]), X(c2[1]), X(b.x), X(b.y))
    } else run = null
  }
  const last = tip(i1)
  path.lineTo(X(last.x), X(o.foot))
  path.closePath()
  // Sunlit along the top, into the shade of its own leaves toward the foot.
  const top = o.foot - o.h
  const g = ctx.createLinearGradient(0, X(top), 0, X(o.foot))
  g.addColorStop(0, mixHex(o.fill, DUST.light, 0.22))
  g.addColorStop(0.45, o.fill)
  g.addColorStop(1, mixHex(o.fill, ink, 0.14))
  ctx.fillStyle = g
  ctx.fill(path)
  // A soft band of shade just under the leafy top, where the canopy overhangs itself: depth without a line.
  ctx.save()
  ctx.clip(path)
  const s = ctx.createLinearGradient(0, X(top), 0, X(top + o.h * 0.45))
  s.addColorStop(0, 'rgba(0, 0, 0, 0)')
  s.addColorStop(0.35, alphaHex(ink, 0.07))
  s.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = s
  ctx.fillRect(X(o.x0 - 1), X(top), X(o.x1 - o.x0 + 2), X(o.h * 0.5))
  ctx.restore()
  // The one line: the top, lighter than a machine's.
  ctx.strokeStyle = alphaHex(ink, 0.75 * line)
  ctx.lineWidth = weight * 0.6
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const r of edgeRuns) ctx.stroke(r)
  // A tassel here and there above the leaves: a fine spray, fewer than the leaves by far.
  if (o.tassels !== false) {
    ctx.strokeStyle = alphaHex(ink, 0.55 * line)
    ctx.lineWidth = weight * 0.45
    for (let i = i0; i <= i1; i++) {
      if (hash(i, o.seed, 4) > 0.24 * (0.24 / step) || edge(i * step) < 0.9) continue
      const a = tip(i)
      const tx = a.x
      const ty = a.y - 0.01
      ctx.beginPath()
      for (let j = -1; j <= 1; j++) {
        ctx.moveTo(X(tx), X(ty))
        ctx.lineTo(X(tx + j * 0.05 + Math.sin(o.t + i) * 0.01), X(ty - 0.14 + Math.abs(j) * 0.04))
      }
      ctx.stroke()
    }
  }
  p.pop()
}

/** `#rrggbb` at an alpha, as a CSS colour. */
function alphaHex(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/**
 * Stubble where a field has been cut, seen side on: a low band just over the ground line, a shade darker than the
 * earth, with a soft uneven top and no line round it. It says "cut corn" as a plane, where a row of ticks would be
 * texture. `fade` gives its height (0..1) along x, so it can thin out toward a fence or a track.
 */
export function stubble(p: p5, k: number, x0: number, x1: number, foot: number, h: number, seed: number, fade: (x: number) => number = () => 1): void {
  if (x1 <= x0) return
  const X = (x: number) => x * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(foot - h), 0, X(foot))
  g.addColorStop(0, alphaHex(mixHex(DUST.husk, DUST.wood, 0.45), 0))
  g.addColorStop(0.35, alphaHex(mixHex(DUST.husk, DUST.wood, 0.45), 0.55))
  g.addColorStop(1, alphaHex(mixHex(DUST.husk, DUST.wood, 0.6), 0.8))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(X(x0), X(foot))
  const step = 0.12
  for (let x = x0; x <= x1 + step; x += step) {
    const u = Math.min(x, x1)
    const i = Math.round(u / step)
    const top = h * fade(u) * (0.7 + 0.3 * hash(i, seed, 8))
    ctx.lineTo(X(u), X(foot - top))
  }
  ctx.lineTo(X(x1), X(foot))
  ctx.closePath()
  ctx.fill()
}
