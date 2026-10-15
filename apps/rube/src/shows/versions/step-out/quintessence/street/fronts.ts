import { sway, type View } from '../depth'
import { hash } from '../kit'
import { INK, mix, rgba } from '../negatives/hand'
import { goldAt, S, skyAt, whiteAt } from './light'
import { CORNER, PAVE } from './plan'

/**
 * The fronts along the street (the street's own), in the negatives' hand: flat values, the one graphite line, and the
 * morning on them. A stone apartment house with a shop and its awning; a low brick walk-up behind the newsstand with
 * its fire escape; a three-storey with a café; the corner's narrow tower; and across the avenue the far side, a
 * little hazed. Their windows hold the sky, slide a sheen as the camera passes, catch the sun one after another, and
 * here and there someone is behind one.
 *
 * Shapes are gathered into one path a colour and filled once (`Ink`), so a street of windows is a handful of fills.
 */

type C2 = CanvasRenderingContext2D

/** Paths gathered by colour, in pixels, filled or stroked once each. */
export class Ink {
  private fills = new Map<string, Path2D>()
  private lines = new Map<string, Path2D>()
  constructor(readonly k: number) {}
  fill(color: string): Path2D {
    let p = this.fills.get(color)
    if (!p) this.fills.set(color, (p = new Path2D()))
    return p
  }
  line(color: string): Path2D {
    let p = this.lines.get(color)
    if (!p) this.lines.set(color, (p = new Path2D()))
    return p
  }
  rect(color: string, x0: number, y0: number, x1: number, y1: number): void {
    const k = this.k
    this.fill(color).rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  box(color: string, x0: number, y0: number, x1: number, y1: number): void {
    const k = this.k
    this.line(color).rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  seg(color: string, x0: number, y0: number, x1: number, y1: number): void {
    const k = this.k
    const p = this.line(color)
    p.moveTo(x0 * k, y0 * k)
    p.lineTo(x1 * k, y1 * k)
  }
  draw(ctx: C2, width = 0.8): void {
    for (const [c, p] of this.fills) {
      ctx.fillStyle = c
      ctx.fill(p)
    }
    ctx.lineWidth = width
    for (const [c, p] of this.lines) {
      ctx.strokeStyle = c
      ctx.stroke(p)
    }
    this.fills.clear()
    this.lines.clear()
  }
}

interface Front {
  x0: number
  x1: number
  top: number
  fill: string
  /** Bays across, and the window in each: its width and height (cells). */
  bays: number
  win: [number, number]
  /** Where the ground floor's shop or base stops and the windows start. */
  base: number
  kind: 'stone' | 'brick'
  seed: number
  /** Across the avenue: hazed by the distance. */
  far?: boolean
}

/** Where the pavement starts again across the avenue. */
export const AVENUE_FAR = CORNER.kerb + 3.35

export const FRONTS: Front[] = [
  { x0: -12, x1: 3.6, top: -9.2, fill: S.stone, bays: 9, win: [0.78, 1.02], base: -1.85, kind: 'stone', seed: 1 },
  { x0: 3.6, x1: 8.6, top: -5.6, fill: S.brick, bays: 3, win: [0.72, 1.0], base: -2.75, kind: 'brick', seed: 2 },
  { x0: 8.6, x1: 12.6, top: -4.3, fill: S.stoneDark, bays: 3, win: [0.7, 0.95], base: -1.7, kind: 'stone', seed: 3 },
  { x0: 12.6, x1: CORNER.kerb, top: -7.6, fill: S.corner, bays: 1, win: [0.72, 1.0], base: -1.7, kind: 'stone', seed: 4 },
  { x0: AVENUE_FAR + 0.25, x1: AVENUE_FAR + 3.4, top: -6.4, fill: mix(S.brick, S.sky, 0.2), bays: 2, win: [0.7, 0.95], base: -1.8, kind: 'brick', seed: 5, far: true },
  { x0: AVENUE_FAR + 3.4, x1: AVENUE_FAR + 7.5, top: -8.4, fill: mix(S.stone, S.sky, 0.2), bays: 3, win: [0.74, 1.0], base: -1.8, kind: 'stone', seed: 6, far: true },
  { x0: AVENUE_FAR + 7.5, x1: AVENUE_FAR + 13, top: -5.4, fill: mix(S.stoneDark, S.sky, 0.2), bays: 4, win: [0.72, 0.95], base: -1.8, kind: 'stone', seed: 7, far: true },
]

/** The windows someone is behind this morning: [front, bay, floor from the top], and how they move. */
const SOMEONE: [number, number, number, number][] = [
  [0, 6, 2, 0.11],
  [0, 2, 4, 0.07],
  [2, 1, 1, 0.09],
  [5, 1, 3, 0.08],
]

/** Whether any sky is to be seen in the frame `v`, past the fronts along the street (else the sky and the city behind are not drawn). */
export function skyShows(v: View): boolean {
  let x = v.x0
  for (const f of [...FRONTS].sort((a, b) => a.x0 - b.x0)) {
    if (f.x1 <= x) continue
    if (f.x0 > x + 1e-6) return true
    if (v.y0 < f.top - 0.3) return true
    x = f.x1
    if (x >= v.x1) return false
  }
  return x < v.x1
}

/** Floors of a front: the y of each window's head, top floor first. */
function floors(f: Front): number[] {
  const out: number[] = []
  const step = f.kind === 'brick' ? 1.22 : 1.32
  for (let y = f.top + 0.75; y + f.win[1] < f.base - 0.25; y += step) out.push(y)
  return out
}

/** The fronts at `t`, seen from `v` (for the windows' sheen, which slides as the camera passes). */
export function drawFronts(ctx: C2, v: View, t: number): void {
  const k = v.k
  const ink = new Ink(k)
  const sky = skyAt(t)
  const gold = goldAt(t)
  const w = whiteAt(t)
  const hair = rgba(INK, 0.75)
  const faint = rgba(INK, 0.22)
  const lit = rgba(mix(S.sun, S.gold, 0.5 * gold), 0.55 + 0.25 * gold)
  for (const [fi, f] of FRONTS.entries()) {
    if (f.x1 < v.x0 - 1 || f.x0 > v.x1 + 1) continue
    const haze = (c: string) => (f.far ? mix(c, sky.low, 0.22) : c)
    const fill = haze(mix(f.fill, '#FFFFFF', w * 0.12))
    ink.rect(fill, f.x0, f.top, f.x1, PAVE)
    ink.box(hair, f.x0, f.top, f.x1, PAVE)
    // Its face: stone in courses, brick in finer ones (only where they can be told apart), and a quoin at each edge.
    const course = f.kind === 'brick' ? 0.11 : 0.36
    if (course * k > 3.5) {
      const c = rgba(INK, f.kind === 'brick' ? 0.15 : 0.18)
      const y0 = Math.max(f.top + 0.3, v.y0 - 0.2)
      const y1 = Math.min(f.base, v.y1)
      const a = Math.max(f.x0, v.x0 - 0.5)
      const b = Math.min(f.x1, v.x1 + 0.5)
      // Stone in blocks, brick in its bond: the upright joints, staggered course by course.
      const joint = f.kind === 'brick' ? 0.26 : 0.6
      for (let y = Math.ceil(y0 / course) * course; y < y1; y += course) {
        ink.seg(c, a, y, b, y)
        if (joint * k > 9) {
          const off = (Math.round(y / course) % 2) * joint * 0.5
          for (let x = Math.ceil((a - off) / joint) * joint + off; x < b; x += joint) ink.seg(c, x, y, x, Math.min(y + course, y1))
        }
      }
    }
    // The base: rusticated, its joints deep.
    for (let y = f.base + 0.32; y < PAVE - 0.05; y += 0.32) ink.seg(faint, f.x0, y, f.x1, y)
    ink.seg(hair, f.x0, f.base, f.x1, f.base)
    ink.rect(rgba(INK, 0.1), f.x0, f.base, f.x1, f.base + 0.06)
    // The cornice: a band, its dentils, its shadow below; the sun on its top.
    ink.rect(haze(mix(f.fill, S.paper, 0.4)), f.x0 - 0.12, f.top - 0.22, f.x1 + 0.12, f.top + 0.06)
    ink.box(hair, f.x0 - 0.12, f.top - 0.22, f.x1 + 0.12, f.top + 0.06)
    ink.rect(lit, f.x0 - 0.12, f.top - 0.22, f.x1 + 0.12, f.top - 0.17)
    ink.rect(rgba('#5A6A82', 0.2), f.x0, f.top + 0.06, f.x1, f.top + 0.2)
    if (0.09 * k > 3) for (let x = f.x0 + 0.06; x < f.x1; x += 0.18) ink.rect(rgba(INK, 0.28), x, f.top - 0.02, x + 0.07, f.top + 0.06)
    // The windows.
    const bw = (f.x1 - f.x0) / f.bays
    const fl = floors(f)
    for (let b = 0; b < f.bays; b++) {
      const wx0 = f.x0 + b * bw + (bw - f.win[0]) / 2
      const wx1 = wx0 + f.win[0]
      if (wx1 < v.x0 - 0.5 || wx0 > v.x1 + 0.5) continue
      fl.forEach((wy0, j) => {
        if (wy0 > v.y1 || wy0 + f.win[1] < v.y0) return
        pane(ink, t, v, f, fi, b, j, wx0, wy0, wx1, wy0 + f.win[1], sky, haze)
      })
    }
  }
  ink.draw(ctx)
  // People behind the glass: a head and shoulders, dim, going across a room or standing at the window.
  for (const [fi, b, j, rate] of SOMEONE) {
    const f = FRONTS[fi]
    const fl = floors(f)
    if (j >= fl.length) continue
    const bw = (f.x1 - f.x0) / f.bays
    const wx0 = f.x0 + b * bw + (bw - f.win[0]) / 2
    const wy0 = fl[j]
    if (wx0 > v.x1 || wx0 + f.win[0] < v.x0 || wy0 > v.y1 || wy0 + f.win[1] < v.y0) continue
    const u = 0.5 + 0.42 * Math.sin(t * rate * Math.PI * 2 + fi * 2 + b)
    const px = wx0 + f.win[0] * u
    const py = wy0 + f.win[1] * 0.42
    ctx.save()
    ctx.beginPath()
    ctx.rect(wx0 * k, (wy0 + f.win[1] * 0.18) * k, f.win[0] * k, f.win[1] * 0.82 * k)
    ctx.clip()
    ctx.fillStyle = rgba('#2E3236', f.far ? 0.22 : 0.32)
    ctx.beginPath()
    ctx.arc(px * k, py * k, 0.11 * k, 0, Math.PI * 2)
    ctx.moveTo((px - 0.24) * k, (py + 0.38) * k)
    ctx.ellipse(px * k, (py + 0.38) * k, 0.24 * k, 0.24 * k, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/** A window: its glass holding the sky, a blind or a plant, the reveal's shade, the sill, the sheen, the glint. */
function pane(ink: Ink, t: number, v: View, f: Front, fi: number, b: number, j: number, x0: number, y0: number, x1: number, y1: number, sky: { high: string; low: string; sun: string }, haze: (c: string) => string): void {
  const h = (n: number) => hash(fi * 31 + b, j, n)
  const glass = haze(mix(S.glass, sky.high, 0.25))
  ink.rect(glass, x0, y0, x1, y1)
  // The sky in the upper panes, paler.
  ink.rect(haze(mix(S.glassHigh, sky.low, 0.3)), x0, y0, x1, y0 + (y1 - y0) * 0.45)
  // A blind drawn part way, or a curtain's edge, or a plant on the inside sill.
  const r = h(1)
  if (r < 0.4) ink.rect(haze(mix('#EDE6D6', sky.low, 0.2)), x0, y0, x1, y0 + (y1 - y0) * (0.15 + 0.5 * h(2)))
  else if (r < 0.55) ink.rect(haze('#9C8E7B'), x0, y0, x0 + (x1 - x0) * 0.22, y1)
  else if (r < 0.62) ink.rect(haze(S.leaf), x0 + (x1 - x0) * 0.2, y1 - 0.22, x0 + (x1 - x0) * 0.55, y1)
  // The sheen: a pale band across the glass that slides as the camera goes by.
  const s = (((v.cx * 0.13 + x0 * 0.37 + y0 * 0.11) % 1) + 1) % 1
  const sx = x0 + (x1 - x0) * s
  ink.rect(rgba('#FFFFFF', f.far ? 0.12 : 0.2), sx, y0, Math.min(x1, sx + (x1 - x0) * 0.16), y1)
  // The reveal's shade along the head and the sunward side; the sash's bar; the sill catching the sun.
  ink.rect(rgba('#3C4A60', 0.24), x0, y0, x1, y0 + 0.07)
  ink.rect(rgba('#3C4A60', 0.24), x1 - 0.07, y0 + 0.07, x1, y1)
  ink.box(rgba(INK, 0.7), x0, y0, x1, y1)
  ink.seg(rgba(INK, 0.45), x0, (y0 + y1) / 2, x1, (y0 + y1) / 2)
  ink.rect(haze(mix(f.fill, S.paper, 0.55)), x0 - 0.06, y1, x1 + 0.06, y1 + 0.07)
  ink.rect(rgba(INK, 0.16), x0 - 0.06, y1 + 0.07, x1 + 0.06, y1 + 0.12)
  // The sun catching the glass: a sweep along the street, a window at a time.
  const ph = (((t * 0.42 - x0 * 0.21 + j * 0.37 + v.cx * 0.05 + h(3) * 0.3) % 3.2) + 3.2) % 3.2
  if (ph < 0.3) {
    const a = Math.sin((ph / 0.3) * Math.PI)
    ink.rect(rgba(sky.sun, 0.75 * a), x0, y0, x1, y1)
  }
  // An air conditioner hung out of the lower sash, here and there.
  if (!f.far && h(4) > 0.8 && j > 0) {
    ink.rect('#C9C8C2', x0 + 0.12, y1 - 0.34, x1 - 0.12, y1 + 0.02)
    ink.box(rgba(INK, 0.7), x0 + 0.12, y1 - 0.34, x1 - 0.12, y1 + 0.02)
    for (let yy = y1 - 0.28; yy < y1; yy += 0.06) ink.seg(rgba(INK, 0.3), x0 + 0.18, yy, x1 - 0.18, yy)
  }
}

/* ------------------------------------------------------------------ at the street */

/** The shops: their glass, an awning over each whose valance stirs, and the doors. */
const SHOPS: { x0: number; x1: number; top: number; awning?: [string, string]; far?: boolean }[] = [
  { x0: -8.6, x1: -4.1, top: -1.5, awning: ['#41604F', '#41604F'] },
  { x0: -1.95, x1: 1.25, top: -1.45, awning: [S.awning, '#ECE5D2'] },
  { x0: 8.8, x1: 9.95, top: -1.35, awning: ['#E9E1CC', S.awning] },
  { x0: 11.25, x1: 12.4, top: -1.35, awning: ['#E9E1CC', S.awning] },
  { x0: 12.8, x1: 14.3, top: -1.4, awning: ['#2F4A3E', '#2F4A3E'] },
  { x0: AVENUE_FAR + 0.5, x1: AVENUE_FAR + 2.9, top: -1.4, awning: ['#6D8A7A', '#E6E0D2'], far: true },
  { x0: AVENUE_FAR + 3.8, x1: AVENUE_FAR + 7.1, top: -1.45, awning: ['#2F4A3E', '#2F4A3E'], far: true },
  { x0: AVENUE_FAR + 8, x1: AVENUE_FAR + 12.4, top: -1.4, far: true },
]
const DOORS: [number, number][] = [[-3.2, 0.9], [1.6, 0.8], [3.8, 0.75], [10.15, 0.9], [AVENUE_FAR + 3.0, 0.7]]

export function drawGround(ctx: C2, v: View, t: number): void {
  const k = v.k
  const ink = new Ink(k)
  const sky = skyAt(t)
  const hair = rgba(INK, 0.8)
  for (const [x, w] of DOORS) {
    if (x > v.x1 || x + w < v.x0) continue
    // A door: its panels below, its glass above with the street in it, the kick plate, the handle.
    ink.rect('#5F6664', x, PAVE - 1.45, x + w, PAVE)
    ink.rect(rgba('#AFC0C8', 0.35), x + 0.12, PAVE - 1.32, x + w - 0.12, PAVE - 0.8)
    ink.rect(rgba('#3C4A60', 0.3), x + 0.12, PAVE - 1.0, x + w - 0.12, PAVE - 0.8)
    ink.box(hair, x, PAVE - 1.45, x + w, PAVE)
    ink.box(rgba(INK, 0.5), x + 0.12, PAVE - 1.32, x + w - 0.12, PAVE - 0.8)
    ink.box(rgba(INK, 0.4), x + 0.12, PAVE - 0.68, x + w - 0.12, PAVE - 0.38)
    ink.box(rgba(INK, 0.4), x + 0.16, PAVE - 0.64, x + w - 0.16, PAVE - 0.42)
    ink.rect(rgba('#9CA3A3', 0.6), x + 0.06, PAVE - 0.2, x + w - 0.06, PAVE - 0.05)
    ink.rect(rgba('#E7D9B8', 0.9), x + w - 0.2, PAVE - 0.74, x + w - 0.12, PAVE - 0.66)
  }
  const valances: { x0: number; x1: number; y: number; c: [string, string]; far?: boolean }[] = []
  for (const s of SHOPS) {
    if (s.x0 > v.x1 + 0.5 || s.x1 < v.x0 - 0.5) continue
    const haze = (c: string) => (s.far ? mix(c, sky.low, 0.22) : c)
    // The glass: dark, the street behind the camera in it (its roofline, pale over dark), a sheen sliding as the
    // camera passes, the stall board and the mullions.
    const g0 = PAVE - 0.22
    ink.rect(haze('#59656B'), s.x0, s.top, s.x1, g0)
    ink.rect(haze(mix('#8C9AA1', sky.low, 0.25)), s.x0, s.top, s.x1, s.top + 0.35)
    const roof = ink.fill(haze(rgba('#7E8C93', 0.8)))
    for (let x = s.x0, i = 0; x < s.x1; i++) {
      const w = 0.35 + 0.4 * hash(i, 9, Math.round(s.x0 * 10))
      const h = 0.1 + 0.25 * hash(i, 8, Math.round(s.x0 * 10))
      const x1 = Math.min(s.x1, x + w)
      roof.rect(x * k, (s.top + 0.35) * k, (x1 - x) * k, h * k)
      x = x1
    }
    const sh = (((v.cx * 0.11 + s.x0 * 0.29) % 1) + 1) % 1
    const sx = s.x0 + (s.x1 - s.x0) * sh
    ink.rect(rgba('#FFFFFF', 0.16), sx, s.top, Math.min(s.x1, sx + 0.35), g0)
    ink.rect(rgba('#FFFFFF', 0.09), Math.min(s.x1, sx + 0.45), s.top, Math.min(s.x1, sx + 0.55), g0)
    // Things on show inside, dim: two shelves of goods, a counter.
    for (const [sy, n] of [[g0 - 0.62, 5], [g0 - 0.25, 7]] as [number, number][]) {
      ink.seg(haze(rgba(INK, 0.45)), s.x0 + 0.1, sy + 0.02, s.x1 - 0.1, sy + 0.02)
      for (let x = s.x0 + 0.15, i = 0; x < s.x1 - 0.2; x += 0.18 + 0.1 * hash(i, n, 3), i++) {
        const hh = 0.08 + 0.12 * hash(Math.round(x * 10), n)
        ink.rect(haze(rgba(i % 3 ? '#4C565A' : '#6B6250', 0.7)), x, sy - hh, x + 0.11, sy)
      }
    }
    ink.rect(haze('#857A6A'), s.x0, g0, s.x1, PAVE)
    ink.seg(haze(rgba(INK, 0.4)), s.x0, g0 + 0.1, s.x1, g0 + 0.1)
    for (let x = s.x0 + 1.05; x < s.x1 - 0.3; x += 1.05) ink.seg(hair, x, s.top, x, g0)
    ink.box(hair, s.x0, s.top, s.x1, PAVE)
    if (s.awning) valances.push({ x0: s.x0 - 0.15, x1: s.x1 + 0.15, y: s.top - 0.42, c: s.awning, far: s.far })
  }
  ink.draw(ctx)
  // The awnings: striped, their valances lifting in the morning air, their shade on the glass.
  for (const a of valances) {
    const haze = (c: string) => (a.far ? mix(c, sky.low, 0.22) : c)
    const w = a.x1 - a.x0
    const n = Math.max(3, Math.round(w / 0.32))
    const sw = w / n
    const lift = (i: number) => 0.035 * sway(t, 0.45, i * 0.37 + a.x0) + 0.02 * Math.sin(t * 3.1 + i * 0.9)
    ink.rect(rgba('#3C4A60', 0.22), a.x0 + 0.15, a.y + 0.42, a.x1 - 0.15, a.y + 0.7)
    for (let i = 0; i < n; i++) {
      const x = a.x0 + i * sw
      const c = haze(a.c[i % 2])
      const p = ink.fill(c)
      const y1 = a.y + 0.42 + lift(i)
      p.moveTo(x * k, a.y * k)
      p.lineTo((x + sw) * k, a.y * k)
      p.lineTo((x + sw) * k, y1 * k)
      p.quadraticCurveTo((x + sw / 2) * k, (y1 + 0.13) * k, x * k, y1 * k)
      p.closePath()
    }
    // The light along its top, the line round it.
    ink.rect(rgba(S.sun, 0.5), a.x0, a.y, a.x1, a.y + 0.05)
    const o = ink.line(rgba(INK, 0.8))
    o.moveTo(a.x0 * k, (a.y + 0.42) * k)
    o.lineTo(a.x0 * k, a.y * k)
    o.lineTo(a.x1 * k, a.y * k)
    o.lineTo(a.x1 * k, (a.y + 0.42) * k)
    for (let i = n - 1; i >= 0; i--) {
      const x = a.x0 + i * sw
      o.quadraticCurveTo((x + sw / 2) * k, (a.y + 0.55 + lift(i)) * k, x * k, (a.y + 0.42 + lift(i)) * k)
    }
  }
  ink.draw(ctx)
}

/** The fire escape down the stone house's right-hand bays: platforms at each sill, the stairs between, its shadow. */
export function drawFireEscape(ctx: C2, v: View): void {
  const f = FRONTS[0]
  const x0 = 0.15
  const x1 = 3.35
  if (x1 < v.x0 || x0 > v.x1) return
  const k = v.k
  const ink = new Ink(k)
  const levels = floors(f).map((y) => y + f.win[1] + 0.06).filter((y) => y > f.top + 1.5)
  const draw = (c: string, dx: number, dy: number) => {
    for (const [i, y] of levels.entries()) {
      ink.rect(c, x0 + dx, y + dy, x1 + dx, y + dy + 0.05)
      ink.seg(c, x0 + dx, y + dy - 0.36, x1 + dx, y + dy - 0.36)
      if (0.13 * k > 3) for (let x = x0; x <= x1 + 1e-6; x += 0.13) ink.seg(c, x + dx, y + dy - 0.36, x + dx, y + dy)
      // The stair up to the next, the other way each time.
      const up = levels[i - 1]
      if (up !== undefined) {
        const a = i % 2 ? x0 + 0.35 : x1 - 0.35
        const b = i % 2 ? x0 + 1.45 : x1 - 1.45
        ink.seg(c, a + dx, y + dy, b + dx, up + dy + 0.05)
        ink.seg(c, a + dx, y + dy - 0.3, b + dx, up + dy - 0.25)
      }
    }
    // The drop ladder, hung from the lowest.
    const low = levels[levels.length - 1]
    if (low !== undefined) {
      ink.seg(c, x1 - 0.55 + dx, low + dy, x1 - 0.55 + dx, low + dy + 0.85)
      ink.seg(c, x1 - 0.25 + dx, low + dy, x1 - 0.25 + dx, low + dy + 0.85)
      for (let y = low + 0.12; y < low + 0.85; y += 0.14) ink.seg(c, x1 - 0.55 + dx, y + dy, x1 - 0.25 + dx, y + dy)
    }
  }
  draw(rgba('#33445E', 0.16), -0.16, 0.12)
  ink.draw(ctx, Math.max(1, 0.012 * k))
  draw(S.iron, 0, 0)
  ink.draw(ctx, Math.max(1, 0.018 * k))
}

/** On the far side's roof across the avenue: a water tower on its legs, and a flag flying out to the west. */
export function drawRoofs(ctx: C2, v: View, t: number): void {
  const f = FRONTS[4]
  if (f.x1 + 1 < v.x0 || f.x0 - 1 > v.x1 || f.top > v.y1) return
  const k = v.k
  const sky = skyAt(t)
  const haze = (c: string) => mix(c, sky.low, 0.25)
  const ink = new Ink(k)
  // The water tower: legs and their bracing, the barrel in its staves and hoops, the cone, the ladder.
  const tx = f.x0 + 0.9
  const base = f.top - 0.22
  const legs = base - 0.7
  for (const lx of [-0.4, -0.12, 0.16, 0.42]) ink.rect(haze('#5B544A'), tx + lx - 0.03, legs, tx + lx + 0.03, base)
  ink.seg(haze('#5B544A'), tx - 0.4, legs + 0.05, tx + 0.42, base - 0.05)
  ink.seg(haze('#5B544A'), tx - 0.4, base - 0.05, tx + 0.42, legs + 0.05)
  ink.rect(haze('#8C7860'), tx - 0.5, legs - 1.0, tx + 0.5, legs)
  for (let x = tx - 0.42; x < tx + 0.5; x += 0.12) ink.seg(haze(rgba(INK, 0.3)), x, legs - 1.0, x, legs)
  for (const hy of [0.2, 0.5, 0.8]) ink.seg(haze(rgba(INK, 0.6)), tx - 0.5, legs - hy, tx + 0.5, legs - hy)
  ink.rect(haze('#C9A57C'), tx + 0.36, legs - 1.0, tx + 0.5, legs)
  const cone = ink.fill(haze('#6A5E50'))
  cone.moveTo((tx - 0.56) * k, (legs - 1.0) * k)
  cone.lineTo(tx * k, (legs - 1.4) * k)
  cone.lineTo((tx + 0.56) * k, (legs - 1.0) * k)
  cone.closePath()
  ink.box(haze(rgba(INK, 0.8)), tx - 0.5, legs - 1.0, tx + 0.5, legs)
  // The flag: a pole, and the cloth flying out on the air, a wave running down it.
  const px = f.x1 - 0.5
  ink.rect(haze('#4E5552'), px - 0.025, f.top - 1.6, px + 0.025, f.top - 0.22)
  ink.draw(ctx, 0.9)
  const fw = 0.95
  const fh = 0.55
  const y0 = f.top - 1.55
  const wave = (u: number) => 0.07 * Math.sin(u * 5 - t * 6.5) * u + 0.03 * sway(t, 0.4, 3) * u
  for (const [band, c] of [[0, '#E9E4D6'], [1, '#4F7A62']] as [number, string][]) {
    ctx.fillStyle = haze(c)
    ctx.beginPath()
    const ya = y0 + (band * fh) / 2
    const yb = ya + fh / 2
    ctx.moveTo(px * k, ya * k)
    for (let i = 1; i <= 8; i++) {
      const u = i / 8
      ctx.lineTo((px - u * fw) * k, (ya + wave(u) + u * 0.06) * k)
    }
    for (let i = 8; i >= 0; i--) {
      const u = i / 8
      ctx.lineTo((px - u * fw) * k, (yb + wave(u) + u * 0.06) * k)
    }
    ctx.closePath()
    ctx.fill()
  }
}
