import type { Theme } from '../../../../src/core/themes'
import type { Pt } from '../parts'
import type { Backdrop } from '../worlds'

/**
 * A build: the one portable file the Builder writes and reads. Pieces made
 * outside the repo, and optionally a world to play them in, as plain JSON.
 *
 * Nothing in a build is code. A stock piece is a TypeScript module with a
 * `place` and a `draw`; a built piece is a description of the same two
 * things — a footprint, a lane as a list of steps, and a drawing as a list
 * of shapes with motions on them — that `compile.ts` turns into a `Piece`
 * at runtime. So a file from anywhere can be loaded without a rebuild and
 * without evaluating anything, and what a file may say is exactly what this
 * module will validate.
 *
 * Units are the show's: cells, with the ball's centre on y = 0 and the rail
 * under it at y = FLOOR, a cell spanning [-0.5, 0.5] either way, y down, in
 * the canonical hand (west to east). Times are seconds.
 */

export const BUILD_FORMAT = 'contraptions-build'
export const BUILD_VERSION = 1
/** What an exported file is called: `<name>.contraptions.json`. */
export const BUILD_EXTENSION = '.contraptions.json'

export interface Build {
  format: typeof BUILD_FORMAT
  version: typeof BUILD_VERSION
  /** A slug. The name of the world the build plays in, and of its file. */
  name: string
  label?: string
  note?: string
  pieces: PieceSpec[]
  /** The place the pieces play in. Left out, they play on the workshop's paper with the workshop's rail. */
  world?: WorldSpec
}

export interface WorldSpec {
  label?: string
  note?: string
  /** One to four palettes; a visit picks one. */
  themes: Theme[]
  backdrops: Backdrop[]
  /** The stock world whose rail runs between the beats. */
  rail: StockWorld
  /** Stock pieces that play beside the build's own, by name, so a build of two pieces is still a whole map. */
  borrow: string[]
}

export const STOCK_WORLDS = ['workshop', 'harbor', 'garden', 'arcade'] as const
export type StockWorld = (typeof STOCK_WORLDS)[number]
export const BACKDROPS: readonly Backdrop[] = ['plain', 'dots', 'rules', 'stars', 'waves', 'sprigs', 'grid']

/* ------------------------------------------------------------------ pieces */

export interface PieceSpec {
  /** A slug, unique in the build and not a stock piece's. */
  name: string
  note?: string
  /** What it was made from, kept so it can be made again. */
  prompt?: string
  /** Relative likelihood of being picked by the planner. */
  weight: number
  /** Throws the ball: one of the tempo's accents. */
  flight?: boolean
  /** What a pass scores, where a world keeps score. */
  points?: number
  /** Cells occupied, relative to the entry cell. Includes [0, 0]. */
  cells: Pt[]
  /** The next piece's entry cell, relative to this one's; `dir` -1 sends the ball back the way it came. */
  exit: { at: Pt; dir: 1 | -1 }
  /** The ball's path, from [-0.5, 0], each step starting where the last ended. */
  lane: LaneStep[]
  /** The ball takes a new colour: `after` seconds past the fire, blending in over `over`. */
  paint?: { after: number; over?: number }
  shapes: Shape[]
}

interface StepCommon {
  /** The piece fires when this step ends: the blow, the bang, the tip. One step a lane; the first, when none says so. */
  fire?: boolean
  /** The ball is out of sight for this step. */
  hidden?: boolean
}

export type LaneStep = StepCommon &
  (
    | { op: 'roll'; to: Pt; /** Cells a second; the plain rail's pace when unset. */ v?: number }
    | { op: 'ramp'; to: Pt; /** Speed at the start and at the end. */ v0: number; v1: number }
    | { op: 'arrive'; to: Pt }
    | { op: 'wait'; dur: number }
    | { op: 'fall'; to: Pt; v?: number }
    | { op: 'fly'; to: Pt; dur: number; /** Cells the parabola peaks above the chord's midpoint. */ arc: number }
    | { op: 'move'; to: Pt; dur: number; ease?: 'in' | 'out' | 'inout' }
  )

export const STEP_OPS = ['roll', 'ramp', 'arrive', 'wait', 'fall', 'fly', 'move'] as const

/**
 * What a part is filled with. `color` is the colour the planner hands the
 * piece and `accent` a second one; neither is ever the colour the ball
 * arrives in, which is the house rule that keeps a ball from vanishing into
 * what holds it. `paint` is the colour a painting piece gives the ball.
 */
export type Fill = 'color' | 'accent' | 'paint' | 'paper' | 'ink' | 'none'
export const FILLS: readonly Fill[] = ['color', 'accent', 'paint', 'paper', 'ink', 'none']
export type Stroke = 'ink' | 'color' | 'accent' | 'paint' | 'none'
export const STROKES: readonly Stroke[] = ['ink', 'color', 'accent', 'paint', 'none']

/** Which clock a motion or a window reads: seconds since the piece fired, or since the ball entered it. */
export type ClockName = 'since' | 't'

/**
 * How a part moves: a drive turns the clock into an amount `m`, and the
 * amount scales a rotation, a move and a stretch about the part's origin.
 *
 *   ease    0 → 1 over [from, to], and back to 0 over `back` if given
 *   pulse   0 → 1 → 0 over [from, to]
 *   flick   out fast at `from`, back with a settle by `to`
 *   swing   a ring-down from `from`: sin(freq·x)·exp(-decay·x)
 *   turn    seconds run since `from` (held at `to`), so `rotate` is radians a second
 *   follow  the ball itself, from the start of lane step `steps[0]` to the end of `steps[1]`
 */
export interface Motion {
  drive: 'ease' | 'pulse' | 'flick' | 'swing' | 'turn' | 'follow'
  clock?: ClockName
  from?: number
  to?: number
  ease?: 'linear' | 'in' | 'out' | 'inout'
  back?: [number, number]
  freq?: number
  decay?: number
  /** Radians at m = 1. */
  rotate?: number
  /** Cells at m = 1. */
  move?: Pt
  /** Stretch at m = 1, as factors. */
  scale?: Pt
  steps?: [number, number]
  axis?: 'x' | 'y' | 'both'
}

export const DRIVES = ['ease', 'pulse', 'flick', 'swing', 'turn', 'follow'] as const

interface ShapeCommon {
  /** `over` is drawn after the ball, for parts that stand in front of it. */
  layer?: 'draw' | 'over'
  fill?: Fill
  stroke?: Stroke
  /** The part's origin and pivot. */
  at?: Pt
  /** Radians, at rest. */
  rot?: number
  motion?: Motion[]
  /** Drawn only inside this window of the clock: a spark, a splash, a puff. */
  show?: { clock?: ClockName; from?: number; to?: number }
}

export type Shape = ShapeCommon &
  (
    | { kind: 'rail'; x0: number; x1: number; y?: number }
    | { kind: 'post'; x: number; y0?: number; y1?: number }
    | { kind: 'gallows'; x0: number; x1: number; post: number; y?: number }
    | { kind: 'line'; pts: Pt[] }
    | { kind: 'poly'; pts: Pt[] }
    | { kind: 'rect'; w: number; h: number; r?: number; offset?: Pt }
    | { kind: 'ellipse'; w: number; h: number; offset?: Pt }
    | { kind: 'arc'; w: number; h: number; a0: number; a1: number; close?: 'open' | 'chord' | 'pie'; offset?: Pt }
    /** A spring from a fixed `anchor` to the part's origin, wherever its motions have carried it. */
    | { kind: 'coil'; anchor: Pt; turns: number; amp: number }
    /** Radial lines round the origin. With a `show` window they fly outward across it and thin away. */
    | { kind: 'burst'; r0: number; r1: number; n: number; phase?: number }
    /** A cloud of paper. With a `show` window it swells across it. */
    | { kind: 'puff'; r: number }
    /** Parts that move as one: the group's origin and motions carry everything in it. */
    | { kind: 'group'; shapes: Shape[] }
  )

export const SHAPE_KINDS = ['rail', 'post', 'gallows', 'line', 'poly', 'rect', 'ellipse', 'arc', 'coil', 'burst', 'puff', 'group'] as const

/* ------------------------------------------------------------------ limits */

export const LIMITS = {
  /** Bytes of JSON a file may be. */
  bytes: 512 * 1024,
  pieces: 24,
  cells: 12,
  steps: 40,
  shapes: 80,
  points: 32,
  depth: 3,
  /** No coordinate is further than this from the entry cell. */
  reach: 8,
  /** Seconds a lane may take. A solo world is short. */
  laneTime: 7,
  name: 32,
  text: 400,
} as const

/* ------------------------------------------------------------------ validation */

export interface Parsed {
  build: Build | null
  errors: string[]
}

const SLUG = /^[a-z][a-z0-9-]*$/
const HEX = /^#[0-9a-f]{6}$/i

/** A name made safe to be one: lower case, hyphens, a letter first. */
export function slug(text: string, fallback = 'piece'): string {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^[0-9-]+/, '').slice(0, LIMITS.name).replace(/-+$/, '')
  return s || fallback
}

const luma = (hex: string): number =>
  (0.2126 * parseInt(hex.slice(1, 3), 16) + 0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16)) / 255

class Checker {
  errors: string[] = []
  fail(path: string, message: string): void {
    if (this.errors.length < 40) this.errors.push(`${path}: ${message}`)
  }
  num(v: unknown, path: string, lo = -LIMITS.reach, hi: number = LIMITS.reach): v is number {
    if (typeof v !== 'number' || !Number.isFinite(v)) return this.fail(path, 'must be a number'), false
    if (v < lo || v > hi) return this.fail(path, `must be between ${lo} and ${hi}`), false
    return true
  }
  optNum(v: unknown, path: string, lo?: number, hi?: number): boolean {
    return v === undefined || this.num(v, path, lo, hi)
  }
  pt(v: unknown, path: string): v is Pt {
    if (!Array.isArray(v) || v.length !== 2) return this.fail(path, 'must be a point [x, y]'), false
    return this.num(v[0], `${path}[0]`) && this.num(v[1], `${path}[1]`)
  }
  pts(v: unknown, path: string, min: number): v is Pt[] {
    if (!Array.isArray(v) || v.length < min || v.length > LIMITS.points) return this.fail(path, `must be ${min} to ${LIMITS.points} points`), false
    return v.every((p, i) => this.pt(p, `${path}[${i}]`))
  }
  oneOf<T extends string>(v: unknown, options: readonly T[], path: string): v is T {
    if (typeof v !== 'string' || !options.includes(v as T)) return this.fail(path, `must be one of ${options.join(', ')}`), false
    return true
  }
  optOneOf<T extends string>(v: unknown, options: readonly T[], path: string): boolean {
    return v === undefined || this.oneOf(v, options, path)
  }
  text(v: unknown, path: string, max: number = LIMITS.text): boolean {
    if (v === undefined) return true
    if (typeof v !== 'string' || v.length > max) return this.fail(path, `must be text of at most ${max} characters`), false
    return true
  }
  name(v: unknown, path: string): v is string {
    if (typeof v !== 'string' || !SLUG.test(v) || v.length > LIMITS.name) return this.fail(path, `must be a slug like "bell-tower", at most ${LIMITS.name} characters`), false
    return true
  }
  bool(v: unknown, path: string): boolean {
    if (v === undefined || typeof v === 'boolean') return true
    return this.fail(path, 'must be true or false'), false
  }
  obj(v: unknown, path: string): v is Record<string, unknown> {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return this.fail(path, 'must be an object'), false
    return true
  }
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

function checkLane(c: Checker, piece: Record<string, unknown>, path: string): void {
  const lane = piece.lane
  if (!Array.isArray(lane) || lane.length < 1 || lane.length > LIMITS.steps) return c.fail(`${path}.lane`, `must be 1 to ${LIMITS.steps} steps`)
  let at: Pt = [-0.5, 0]
  let fires = 0
  let time = 0
  const cells = (Array.isArray(piece.cells) ? piece.cells : []) as Pt[]
  // A step may end anywhere in the footprint, its edges included.
  const inside = (p: Pt) => cells.some(([cx, cy]) => Math.abs(p[0] - cx) <= 0.5 + 1e-6 && Math.abs(p[1] - cy) <= 0.5 + 1e-6)
  lane.forEach((raw, i) => {
    const at0 = `${path}.lane[${i}]`
    if (!c.obj(raw, at0) || !c.oneOf(raw.op, STEP_OPS, `${at0}.op`)) return
    c.bool(raw.fire, `${at0}.fire`)
    c.bool(raw.hidden, `${at0}.hidden`)
    if (raw.fire) fires++
    if (raw.op === 'wait') {
      if (c.num(raw.dur, `${at0}.dur`, 0.01, LIMITS.laneTime)) time += raw.dur
      return
    }
    if (!c.pt(raw.to, `${at0}.to`)) return
    const len = Math.hypot(raw.to[0] - at[0], raw.to[1] - at[1])
    if (raw.op === 'roll' || raw.op === 'fall') {
      if (c.optNum(raw.v, `${at0}.v`, 0.2, 12)) time += len / ((raw.v as number | undefined) ?? 2.6)
    } else if (raw.op === 'ramp') {
      if (c.num(raw.v0, `${at0}.v0`, 0, 12) && c.num(raw.v1, `${at0}.v1`, 0, 12)) {
        if (raw.v0 + raw.v1 <= 0) c.fail(at0, 'a ramp must be moving at one end or the other')
        else time += len / ((raw.v0 + raw.v1) / 2)
      }
    } else if (raw.op === 'arrive') {
      if (len < 0.2) c.fail(at0, 'an arrive needs at least 0.2 cells to stop in')
      time += len / 2.6
    } else {
      if (c.num(raw.dur, `${at0}.dur`, 0.01, LIMITS.laneTime)) time += raw.dur
      if (raw.op === 'fly') c.num(raw.arc, `${at0}.arc`, -3, 3)
      else c.optOneOf(raw.ease, ['in', 'out', 'inout'] as const, `${at0}.ease`)
    }
    if (len < 1e-6) c.fail(at0, 'goes nowhere; use a wait')
    if (cells.length && !inside(raw.to)) c.fail(`${at0}.to`, 'is outside the cells the piece claims')
    at = raw.to
  })
  if (fires > 1) c.fail(`${path}.lane`, 'only one step may fire')
  if (time > LIMITS.laneTime) c.fail(`${path}.lane`, `takes ${time.toFixed(1)}s; a piece has at most ${LIMITS.laneTime}s`)
  // The hand-off: the lane ends on the edge of the cell it hands the ball into, on that cell's rail line.
  const exit = piece.exit as { at?: Pt; dir?: number } | undefined
  if (exit && Array.isArray(exit.at) && (exit.dir === 1 || exit.dir === -1)) {
    const want: Pt = [exit.at[0] - 0.5 * exit.dir, exit.at[1]]
    if (!near(at[0], want[0]) || !near(at[1], want[1])) c.fail(`${path}.lane`, `must end at [${want[0]}, ${want[1]}], the edge of the exit cell; it ends at [${at[0]}, ${at[1]}]`)
  }
}

function checkMotion(c: Checker, raw: unknown, path: string, steps: number): void {
  if (!c.obj(raw, path) || !c.oneOf(raw.drive, DRIVES, `${path}.drive`)) return
  c.optOneOf(raw.clock, ['since', 't'] as const, `${path}.clock`)
  c.optNum(raw.from, `${path}.from`, -20, 20)
  c.optNum(raw.to, `${path}.to`, -20, 20)
  c.optOneOf(raw.ease, ['linear', 'in', 'out', 'inout'] as const, `${path}.ease`)
  c.optNum(raw.freq, `${path}.freq`, 0, 120)
  c.optNum(raw.decay, `${path}.decay`, 0, 40)
  c.optNum(raw.rotate, `${path}.rotate`, -60, 60)
  if (raw.move !== undefined) c.pt(raw.move, `${path}.move`)
  if (raw.scale !== undefined) c.pt(raw.scale, `${path}.scale`)
  c.optOneOf(raw.axis, ['x', 'y', 'both'] as const, `${path}.axis`)
  if (raw.back !== undefined) {
    const b = raw.back
    if (!Array.isArray(b) || b.length !== 2 || !c.num(b[0], `${path}.back[0]`, -20, 20) || !c.num(b[1], `${path}.back[1]`, -20, 20) || !(b[1] > b[0])) c.fail(`${path}.back`, 'must be a window [from, to]')
  }
  if (typeof raw.from === 'number' && typeof raw.to === 'number' && raw.to <= raw.from) c.fail(path, '`to` must come after `from`')
  if (raw.drive === 'follow') {
    const s = raw.steps
    const ok = Array.isArray(s) && s.length === 2 && s.every((n) => Number.isInteger(n) && n >= 0 && n < steps) && s[0] <= s[1]
    if (!ok) c.fail(`${path}.steps`, 'must be [first, last] indices of lane steps')
  } else if ((raw.drive === 'ease' || raw.drive === 'pulse') && (typeof raw.from !== 'number' || typeof raw.to !== 'number')) {
    c.fail(path, `${raw.drive} needs a window: from and to`)
  }
}

function checkShape(c: Checker, raw: unknown, path: string, steps: number, depth: number, count: { n: number }): void {
  if (!c.obj(raw, path) || !c.oneOf(raw.kind, SHAPE_KINDS, `${path}.kind`)) return
  if (++count.n > LIMITS.shapes) return c.fail(path, `a piece has at most ${LIMITS.shapes} shapes`)
  c.optOneOf(raw.layer, ['draw', 'over'] as const, `${path}.layer`)
  c.optOneOf(raw.fill, FILLS, `${path}.fill`)
  c.optOneOf(raw.stroke, STROKES, `${path}.stroke`)
  if (raw.at !== undefined) c.pt(raw.at, `${path}.at`)
  c.optNum(raw.rot, `${path}.rot`, -7, 7)
  if (raw.motion !== undefined) {
    if (!Array.isArray(raw.motion) || raw.motion.length > 6) c.fail(`${path}.motion`, 'must be a list of at most six motions')
    else raw.motion.forEach((m, i) => checkMotion(c, m, `${path}.motion[${i}]`, steps))
  }
  if (raw.show !== undefined && c.obj(raw.show, `${path}.show`)) {
    c.optOneOf(raw.show.clock, ['since', 't'] as const, `${path}.show.clock`)
    c.optNum(raw.show.from, `${path}.show.from`, -20, 20)
    c.optNum(raw.show.to, `${path}.show.to`, -20, 20)
  }
  if (raw.offset !== undefined) c.pt(raw.offset, `${path}.offset`)
  switch (raw.kind) {
    case 'rail':
      c.num(raw.x0, `${path}.x0`)
      c.num(raw.x1, `${path}.x1`)
      c.optNum(raw.y, `${path}.y`)
      break
    case 'post':
      c.num(raw.x, `${path}.x`)
      c.optNum(raw.y0, `${path}.y0`)
      c.optNum(raw.y1, `${path}.y1`)
      break
    case 'gallows':
      c.num(raw.x0, `${path}.x0`)
      c.num(raw.x1, `${path}.x1`)
      c.num(raw.post, `${path}.post`)
      c.optNum(raw.y, `${path}.y`)
      break
    case 'line':
      c.pts(raw.pts, `${path}.pts`, 2)
      break
    case 'poly':
      c.pts(raw.pts, `${path}.pts`, 3)
      break
    case 'rect':
      c.num(raw.w, `${path}.w`, 0.005)
      c.num(raw.h, `${path}.h`, 0.005)
      c.optNum(raw.r, `${path}.r`, 0, 1)
      break
    case 'ellipse':
      c.num(raw.w, `${path}.w`, 0.005)
      c.num(raw.h, `${path}.h`, 0.005)
      break
    case 'arc':
      c.num(raw.w, `${path}.w`, 0.005)
      c.num(raw.h, `${path}.h`, 0.005)
      c.num(raw.a0, `${path}.a0`, -7, 7)
      c.num(raw.a1, `${path}.a1`, -7, 7)
      c.optOneOf(raw.close, ['open', 'chord', 'pie'] as const, `${path}.close`)
      break
    case 'coil':
      c.pt(raw.anchor, `${path}.anchor`)
      if (c.num(raw.turns, `${path}.turns`, 1, 12) && !Number.isInteger(raw.turns)) c.fail(`${path}.turns`, 'must be a whole number')
      c.num(raw.amp, `${path}.amp`, 0, 0.5)
      break
    case 'burst':
      c.num(raw.r0, `${path}.r0`, 0)
      c.num(raw.r1, `${path}.r1`, 0)
      if (c.num(raw.n, `${path}.n`, 1, 24) && !Number.isInteger(raw.n)) c.fail(`${path}.n`, 'must be a whole number')
      c.optNum(raw.phase, `${path}.phase`, -7, 7)
      break
    case 'puff':
      c.num(raw.r, `${path}.r`, 0.01, 1)
      break
    case 'group':
      if (depth >= LIMITS.depth) c.fail(path, `groups nest at most ${LIMITS.depth} deep`)
      else if (!Array.isArray(raw.shapes) || !raw.shapes.length) c.fail(`${path}.shapes`, 'must be a list of shapes')
      else raw.shapes.forEach((s, i) => checkShape(c, s, `${path}.shapes[${i}]`, steps, depth + 1, count))
      break
  }
}

function checkPiece(c: Checker, raw: unknown, path: string): void {
  if (!c.obj(raw, path)) return
  c.name(raw.name, `${path}.name`)
  if (raw.name === 'rail' || raw.name === 'portal') c.fail(`${path}.name`, 'rail and portal are the show\'s own')
  c.text(raw.note, `${path}.note`)
  c.text(raw.prompt, `${path}.prompt`)
  c.num(raw.weight, `${path}.weight`, 0.05, 4)
  c.bool(raw.flight, `${path}.flight`)
  c.optNum(raw.points, `${path}.points`, 0, 100000)

  const cells = raw.cells
  if (!Array.isArray(cells) || cells.length < 1 || cells.length > LIMITS.cells) c.fail(`${path}.cells`, `must be 1 to ${LIMITS.cells} cells`)
  else {
    const whole = cells.every((cell, i) => c.pt(cell, `${path}.cells[${i}]`) && (Number.isInteger(cell[0]) && Number.isInteger(cell[1]) ? true : (c.fail(`${path}.cells[${i}]`, 'must be whole cells'), false)))
    if (whole) {
      const keys = new Set((cells as Pt[]).map(([x, y]) => `${x}:${y}`))
      if (keys.size !== cells.length) c.fail(`${path}.cells`, 'lists a cell twice')
      if (!keys.has('0:0')) c.fail(`${path}.cells`, 'must include the entry cell [0, 0]')
      const exit = raw.exit
      if (!c.obj(exit, `${path}.exit`)) return
      if (exit.dir !== 1 && exit.dir !== -1) c.fail(`${path}.exit.dir`, 'must be 1 or -1')
      if (c.pt(exit.at, `${path}.exit.at`)) {
        if (!Number.isInteger(exit.at[0]) || !Number.isInteger(exit.at[1])) c.fail(`${path}.exit.at`, 'must be a whole cell')
        if (keys.has(`${exit.at[0]}:${exit.at[1]}`)) c.fail(`${path}.exit.at`, 'is one of the piece\'s own cells')
      }
    }
  }
  checkLane(c, raw, path)

  if (raw.paint !== undefined && c.obj(raw.paint, `${path}.paint`)) {
    c.num(raw.paint.after, `${path}.paint.after`, 0, LIMITS.laneTime)
    c.optNum(raw.paint.over, `${path}.paint.over`, 0, 3)
  }
  const steps = Array.isArray(raw.lane) ? raw.lane.length : 0
  if (!Array.isArray(raw.shapes) || !raw.shapes.length) c.fail(`${path}.shapes`, 'must be a list of shapes; a piece with nothing drawn is a gap in the rail')
  else {
    const count = { n: 0 }
    raw.shapes.forEach((s, i) => checkShape(c, s, `${path}.shapes[${i}]`, steps, 1, count))
  }
}

function checkTheme(c: Checker, raw: unknown, path: string): void {
  if (!c.obj(raw, path)) return
  c.name(raw.name, `${path}.name`)
  if (typeof raw.label !== 'string' || !raw.label || raw.label.length > 40) c.fail(`${path}.label`, 'must be a short label')
  c.text(raw.note, `${path}.note`, 120)
  c.optNum(raw.weight, `${path}.weight`, 0.5, 1.6)
  const hex = (v: unknown, at: string): v is string => (typeof v === 'string' && HEX.test(v) ? true : (c.fail(at, 'must be a colour like #E76B31'), false))
  const bg = hex(raw.bg, `${path}.bg`)
  const ink = hex(raw.ink, `${path}.ink`)
  if (!Array.isArray(raw.colors) || raw.colors.length !== 5) c.fail(`${path}.colors`, 'must be five colours')
  else raw.colors.forEach((col, i) => hex(col, `${path}.colors[${i}]`))
  // Ink must read on the paper, or nothing drawn in it does.
  if (bg && ink && Math.abs(luma(raw.bg as string) - luma(raw.ink as string)) < 0.4) c.fail(path, 'the ink does not read against the paper')
}

function checkWorld(c: Checker, raw: unknown, path: string): void {
  if (!c.obj(raw, path)) return
  c.text(raw.label, `${path}.label`, 40)
  c.text(raw.note, `${path}.note`, 160)
  if (!Array.isArray(raw.themes) || raw.themes.length < 1 || raw.themes.length > 4) c.fail(`${path}.themes`, 'must be one to four palettes')
  else {
    raw.themes.forEach((t, i) => checkTheme(c, t, `${path}.themes[${i}]`))
    const names = raw.themes.map((t) => (t as { name?: unknown } | null)?.name)
    if (new Set(names).size !== names.length) c.fail(`${path}.themes`, 'two palettes share a name')
  }
  if (!Array.isArray(raw.backdrops) || raw.backdrops.length < 1 || raw.backdrops.length > 8) c.fail(`${path}.backdrops`, 'must be one to eight backdrops')
  else raw.backdrops.forEach((b, i) => c.oneOf(b, BACKDROPS, `${path}.backdrops[${i}]`))
  c.oneOf(raw.rail, STOCK_WORLDS, `${path}.rail`)
  if (!Array.isArray(raw.borrow) || raw.borrow.length > 40) c.fail(`${path}.borrow`, 'must be a list of at most forty stock piece names')
  else {
    raw.borrow.forEach((b, i) => c.name(b, `${path}.borrow[${i}]`))
    if (new Set(raw.borrow).size !== raw.borrow.length) c.fail(`${path}.borrow`, 'borrows a piece twice')
    if (raw.borrow.some((b) => b === 'rail' || b === 'portal')) c.fail(`${path}.borrow`, 'rail and portal come with every world')
  }
}

/**
 * A build from whatever was in a file: parsed JSON, or the text of it.
 * Either the build, checked end to end, or every reason it is not one. What
 * comes back is a plain copy, so nothing the caller holds is shared with it.
 */
export function parseBuild(input: unknown): Parsed {
  const c = new Checker()
  let raw = input
  if (typeof input === 'string') {
    if (input.length > LIMITS.bytes) return { build: null, errors: [`file: larger than ${LIMITS.bytes / 1024} KB`] }
    try {
      raw = JSON.parse(input)
    } catch (err) {
      return { build: null, errors: [`file: not JSON (${(err as Error).message})`] }
    }
  }
  if (!c.obj(raw, 'build')) return { build: null, errors: c.errors }
  if (raw.format !== BUILD_FORMAT) return { build: null, errors: [`build.format: must be "${BUILD_FORMAT}"; this is not a contraptions build`] }
  if (raw.version !== BUILD_VERSION) return { build: null, errors: [`build.version: this app reads version ${BUILD_VERSION}; the file is version ${String(raw.version)}`] }
  c.name(raw.name, 'build.name')
  if (STOCK_WORLDS.includes(raw.name as StockWorld)) c.fail('build.name', 'is a stock world\'s name')
  c.text(raw.label, 'build.label', 40)
  c.text(raw.note, 'build.note', 160)
  if (!Array.isArray(raw.pieces) || raw.pieces.length > LIMITS.pieces) c.fail('build.pieces', `must be a list of at most ${LIMITS.pieces} pieces`)
  else {
    raw.pieces.forEach((p, i) => checkPiece(c, p, `pieces[${i}]`))
    const names = raw.pieces.map((p) => (p as { name?: unknown } | null)?.name)
    if (new Set(names).size !== names.length) c.fail('build.pieces', 'two pieces share a name')
  }
  if (raw.world !== undefined) checkWorld(c, raw.world, 'world')
  if (c.errors.length) return { build: null, errors: c.errors }
  return { build: JSON.parse(JSON.stringify(raw)) as Build, errors: [] }
}

/** The text of a build's file: stable key order as written, two-space indent, a newline at the end. */
export const serializeBuild = (build: Build): string => `${JSON.stringify(build, null, 2)}\n`

export const emptyBuild = (name: string): Build => ({ format: BUILD_FORMAT, version: BUILD_VERSION, name, pieces: [] })
