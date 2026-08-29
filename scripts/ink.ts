/**
 * A p5 stand-in that draws nothing and remembers where the ink went.
 *
 * Every contraption is a pure function of `u` that paints inside its own
 * footprint. That is a contract, and until now nothing enforced it: a machine
 * could reach a rod into its neighbour, or draw a 4px dot in a 500px cell, and
 * only a human staring at a canvas would ever notice.
 *
 * The recorder implements the slice of the p5 surface the catalogs actually
 * use — transforms, the primitives, shapes, and the 2D clip path — and
 * accumulates one axis-aligned box per drawn primitive, clipped by whatever
 * clip region is in force, unioned into the total. That box is what the checks
 * reason about: ink that leaves the footprint is a clip, ink that never spans
 * it is an artifact.
 */

/** [a, b, c, d, e, f] — the same order as canvas `setTransform`. */
type Matrix = [number, number, number, number, number, number]

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

const IDENT: Matrix = [1, 0, 0, 1, 0, 0]

const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]

const empty = (): Box => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity })

export const isEmpty = (b: Box): boolean => b.x1 < b.x0

const union = (a: Box, b: Box): Box =>
  isEmpty(b)
    ? a
    : {
        x0: Math.min(a.x0, b.x0),
        y0: Math.min(a.y0, b.y0),
        x1: Math.max(a.x1, b.x1),
        y1: Math.max(a.y1, b.y1),
      }

const intersect = (a: Box, b: Box): Box => ({
  x0: Math.max(a.x0, b.x0),
  y0: Math.max(a.y0, b.y0),
  x1: Math.min(a.x1, b.x1),
  y1: Math.min(a.y1, b.y1),
})

interface State {
  m: Matrix
  weight: number
  /** World-space clip box, or null for unclipped. */
  clip: Box | null
  stroking: boolean
}

/** The 2D context surface `clipBox` and friends reach for. */
class ClipPath {
  box: Box = empty()
  private owner: Recorder
  constructor(owner: Recorder) {
    this.owner = owner
  }
  beginPath(): void {
    this.box = empty()
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.box = union(this.box, this.owner.boxOfPoints([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 0))
  }
  arc(x: number, y: number, r: number, _a: number, _b: number): void {
    this.box = union(this.box, this.owner.boxOfEllipse(x, y, r * 2, r * 2, 0))
  }
  moveTo(x: number, y: number): void {
    this.box = union(this.box, this.owner.boxOfPoints([[x, y]], 0))
  }
  lineTo(x: number, y: number): void {
    this.box = union(this.box, this.owner.boxOfPoints([[x, y]], 0))
  }
  closePath(): void {}
  clip(): void {
    const top = this.owner.top()
    top.clip = top.clip ? intersect(top.clip, this.box) : this.box
  }
  save(): void {}
  restore(): void {}
  set letterSpacing(_v: string) {}
}

export class Recorder {
  /** Every primitive drawn so far, in world space. */
  ink: Box = empty()
  /** Fill-only ink: what a reader sees as mass rather than as a hairline. */
  private stack: State[] = [{ m: [...IDENT] as Matrix, weight: 1, clip: null, stroking: true }]
  private shape: [number, number][] = []
  private inShape = false
  readonly drawingContext: ClipPath

  // p5 constants the catalogs name.
  readonly PIE = 'pie'
  readonly CHORD = 'chord'
  readonly OPEN = 'open'
  readonly CLOSE = 'close'
  readonly CENTER = 'center'
  readonly RADIUS = 'radius'
  readonly CORNER = 'corner'
  readonly CORNERS = 'corners'
  readonly RADIANS = 'radians'
  readonly ROUND = 'round'
  readonly PI = Math.PI
  readonly TWO_PI = Math.PI * 2
  readonly TAU = Math.PI * 2
  readonly HALF_PI = Math.PI / 2
  readonly QUARTER_PI = Math.PI / 4
  width = 0
  height = 0

  constructor() {
    this.drawingContext = new ClipPath(this)
  }

  reset(): void {
    this.ink = empty()
    this.stack = [{ m: [...IDENT] as Matrix, weight: 1, clip: null, stroking: true }]
    this.shape = []
    this.inShape = false
  }

  top(): State {
    return this.stack[this.stack.length - 1]
  }

  private at(x: number, y: number): [number, number] {
    const m = this.top().m
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
  }

  /** How much one unit of stroke weight covers after the current transform. */
  private scaleOf(): number {
    const m = this.top().m
    return Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]))
  }

  private pad(): number {
    const s = this.top()
    return s.stroking ? (s.weight * this.scaleOf()) / 2 : 0
  }

  boxOfPoints(points: [number, number][], pad: number): Box {
    let box = empty()
    for (const [x, y] of points) {
      const [wx, wy] = this.at(x, y)
      box = union(box, { x0: wx - pad, y0: wy - pad, x1: wx + pad, y1: wy + pad })
    }
    return box
  }

  boxOfEllipse(x: number, y: number, w: number, h: number, pad: number): Box {
    const pts: [number, number][] = []
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2
      pts.push([x + (Math.cos(a) * w) / 2, y + (Math.sin(a) * h) / 2])
    }
    return this.boxOfPoints(pts, pad)
  }

  /** Fold one primitive's box into the running total, honouring the clip. */
  private paint(box: Box): void {
    if (isEmpty(box)) return
    const { clip } = this.top()
    const kept = clip ? intersect(box, clip) : box
    if (kept.x1 < kept.x0 || kept.y1 < kept.y0) return
    this.ink = union(this.ink, kept)
  }

  // ---- state -------------------------------------------------------------
  push(): void {
    const s = this.top()
    this.stack.push({ m: [...s.m] as Matrix, weight: s.weight, clip: s.clip, stroking: s.stroking })
  }
  pop(): void {
    if (this.stack.length > 1) this.stack.pop()
  }
  translate(x: number, y: number): void {
    const s = this.top()
    s.m = mul(s.m, [1, 0, 0, 1, x, y])
  }
  rotate(a: number): void {
    const s = this.top()
    s.m = mul(s.m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])
  }
  scale(x: number, y = x): void {
    const s = this.top()
    s.m = mul(s.m, [x, 0, 0, y, 0, 0])
  }
  strokeWeight(w: number): void {
    this.top().weight = w
  }
  stroke(..._a: unknown[]): void {
    this.top().stroking = true
  }
  noStroke(): void {
    this.top().stroking = false
  }
  fill(..._a: unknown[]): void {}
  noFill(): void {}
  strokeCap(_v: unknown): void {}
  strokeJoin(_v: unknown): void {}
  rectMode(_v: unknown): void {}
  ellipseMode(_v: unknown): void {}
  angleMode(_v: unknown): void {}
  textFont(_v: unknown): void {}
  textSize(_v: unknown): void {}
  textAlign(..._a: unknown[]): void {}
  blendMode(_v: unknown): void {}
  erase(..._a: unknown[]): void {}
  noErase(): void {}
  color(v: unknown): { setAlpha(a: number): void; toString(): string } {
    return { setAlpha: () => {}, toString: () => String(v) }
  }

  // ---- primitives --------------------------------------------------------
  line(x1: number, y1: number, x2: number, y2: number): void {
    this.paint(this.boxOfPoints([[x1, y1], [x2, y2]], this.pad()))
  }
  point(x: number, y: number): void {
    this.paint(this.boxOfPoints([[x, y]], this.pad()))
  }
  circle(x: number, y: number, d: number): void {
    this.paint(this.boxOfEllipse(x, y, d, d, this.pad()))
  }
  ellipse(x: number, y: number, w: number, h = w): void {
    this.paint(this.boxOfEllipse(x, y, w, h, this.pad()))
  }
  square(x: number, y: number, s: number): void {
    this.rect(x, y, s, s)
  }
  /** `rectMode(CENTER)` is set once by the engine and never changed. */
  rect(x: number, y: number, w: number, h: number, ..._r: number[]): void {
    this.paint(
      this.boxOfPoints(
        [
          [x - w / 2, y - h / 2],
          [x + w / 2, y - h / 2],
          [x + w / 2, y + h / 2],
          [x - w / 2, y + h / 2],
        ],
        this.pad(),
      ),
    )
  }
  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
    this.paint(this.boxOfPoints([[x1, y1], [x2, y2], [x3, y3]], this.pad()))
  }
  quad(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number,
  ): void {
    this.paint(this.boxOfPoints([[x1, y1], [x2, y2], [x3, y3], [x4, y4]], this.pad()))
  }
  arc(x: number, y: number, w: number, h: number, start: number, stop: number, mode?: string): void {
    const pts: [number, number][] = []
    const steps = 24
    for (let i = 0; i <= steps; i++) {
      const a = start + ((stop - start) * i) / steps
      pts.push([x + (Math.cos(a) * w) / 2, y + (Math.sin(a) * h) / 2])
    }
    if (mode === this.PIE || mode === undefined) pts.push([x, y])
    this.paint(this.boxOfPoints(pts, this.pad()))
  }
  text(_s: string, x: number, y: number): void {
    this.paint(this.boxOfPoints([[x, y]], this.pad()))
  }

  // ---- shapes ------------------------------------------------------------
  beginShape(): void {
    this.inShape = true
    this.shape = []
  }
  beginContour(): void {}
  endContour(): void {}
  vertex(x: number, y: number): void {
    this.shape.push([x, y])
  }
  curveVertex(x: number, y: number): void {
    this.shape.push([x, y])
  }
  quadraticVertex(cx: number, cy: number, x: number, y: number): void {
    const [ax, ay] = this.shape[this.shape.length - 1] ?? [cx, cy]
    for (let i = 1; i <= 12; i++) {
      const t = i / 12
      const u = 1 - t
      this.shape.push([
        u * u * ax + 2 * u * t * cx + t * t * x,
        u * u * ay + 2 * u * t * cy + t * t * y,
      ])
    }
  }
  bezierVertex(
    c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number,
  ): void {
    const [ax, ay] = this.shape[this.shape.length - 1] ?? [c1x, c1y]
    for (let i = 1; i <= 12; i++) {
      const t = i / 12
      const u = 1 - t
      this.shape.push([
        u * u * u * ax + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
        u * u * u * ay + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y,
      ])
    }
  }
  endShape(_mode?: string): void {
    if (this.inShape && this.shape.length) this.paint(this.boxOfPoints(this.shape, this.pad()))
    this.inShape = false
    this.shape = []
  }
}

/** Ink box of `fn`, measured in the space `fn` is called in. */
export function recordInk(fn: (p: Recorder) => void): Box {
  const rec = new Recorder()
  try {
    fn(rec)
  } catch {
    return empty()
  }
  return rec.ink
}

export const boxUnion = union
export const emptyBox = empty

// ---------------------------------------------------------------------------
// Measuring a whole composition.
// ---------------------------------------------------------------------------

import type p5 from 'p5'
import type { Composition, Options } from '../src/core/composition'
import { strokeWeight } from '../src/core/composition'
import { ART_INSET, REACH } from '../src/core/constants'
import { mod } from '../src/core/ease'
import { FIRE_DECAY } from '../src/core/wiring'
import type { Cell } from '../src/core/types'

export interface InkReport {
  name: string
  /** How far past the footprint this machine says it may reach. */
  reach: number
  cell: Cell
  /** Ink box in cell-local space, unioned over the loop. */
  local: Box
  /** The same box placed, turned and mirrored into canvas space. */
  world: Box
  /** Worst spill past the footprint, as a fraction of a cell. */
  over: number
  side: string
  /** Widest the ink ever gets, as a fraction of the footprint. */
  spanX: number
  spanY: number
}

/** The square the composition is laid out in. Machines belong inside it. */
export function artFrame(options: Options, canvas: number): Box {
  const area = Math.floor((canvas * ART_INSET) / options.res) * options.res
  const origin = Math.round((canvas - area) / 2)
  return { x0: origin, y0: origin, x1: origin + area, y1: origin + area }
}

/** Local box -> canvas box, given a quarter turn and a mirror. */
function place(box: Box, angle: number, mirror: number, cx: number, cy: number): Box {
  const cos = Math.round(Math.cos(angle))
  const sin = Math.round(Math.sin(angle))
  const xs: number[] = []
  const ys: number[] = []
  for (const [lx, ly] of [
    [box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1],
  ]) {
    const mx = lx * mirror
    xs.push(cx + mx * cos - ly * sin)
    ys.push(cy + mx * sin + ly * cos)
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** Draw every machine in `comp` through the recorder and report where the ink went. */
export function inkOf(comp: Composition, samples = 24): InkReport[] {
  const rec = new Recorder()
  const out: InkReport[] = []
  for (const inst of comp.instances) {
    const { cell, contraption } = inst
    let local = empty()
    let world = empty()
    let spanX = 0
    let spanY = 0
    for (let i = 0; i < samples; i++) {
      const t = inst.phase + (i / samples) * inst.period
      const u = mod(t, inst.period) / inst.period
      rec.reset()
      contraption.draw(rec as unknown as p5, inst.state, {
        size: cell.size,
        unit: comp.unit,
        w: cell.w,
        h: cell.h,
        theme: comp.theme,
        t,
        u,
        weight: strokeWeight(cell.size, comp.unit, comp.theme, comp.options.stroke),
        ink: comp.theme.ink,
        fired: Math.max(0, 1 - mod(i - inst.fireFrame, comp.loop) / FIRE_DECAY),
      })
      const box = rec.ink
      if (isEmpty(box)) continue
      local = union(local, box)
      world = union(world, place(box, inst.angle, inst.mirror, cell.x, cell.y))
      spanX = Math.max(spanX, (box.x1 - box.x0) / cell.w)
      spanY = Math.max(spanY, (box.y1 - box.y0) / cell.h)
    }
    let over = 0
    let side = ''
    if (!isEmpty(local)) {
      for (const [s, amount] of [
        ['W', -local.x0 - cell.w / 2], ['E', local.x1 - cell.w / 2],
        ['N', -local.y0 - cell.h / 2], ['S', local.y1 - cell.h / 2],
      ] as [string, number][]) {
        if (amount / cell.size > over) {
          over = amount / cell.size
          side = s
        }
      }
    }
    out.push({
      name: contraption.name,
      reach: inst.reach ?? contraption.reach ?? REACH,
      cell, local, world, over, side, spanX, spanY,
    })
  }
  return out
}
