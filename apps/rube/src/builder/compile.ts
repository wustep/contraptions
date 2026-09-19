import type p5 from 'p5'
import { coil } from '../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutQuad } from '../../../../src/core/ease'
import { themeByName } from '../../../../src/core/themes'
import {
  arrive,
  burst,
  definePiece,
  fall,
  flick,
  fly,
  gallows,
  laneAt,
  over,
  post,
  puff,
  rail,
  ramp,
  roll,
  segTime,
  wait,
  type BallChange,
  type Lane,
  type Piece,
  type PieceCtx,
  type Pt,
  type Seg,
} from '../parts'
import { portal } from '../pieces/portal'
import { WORLDS, type World } from '../worlds'
import type { Build, ClockName, Fill, LaneStep, Motion, PieceSpec, Shape, Stroke, WorldSpec } from './spec'

/**
 * A build, made playable: every `PieceSpec` becomes a `Piece` — the same
 * contract a stock piece is written against, so the planner, the stage, the
 * catalog and the checks cannot tell one from the other — and the build as a
 * whole becomes a `World` the show can be pinned to.
 *
 * The drawing is interpreted, not evaluated: a shape list is walked on every
 * frame with the clock in hand, which is all a stock `draw` does by hand.
 */

/** What a built piece keeps from its placement: the colours it was handed. */
export interface BuiltState {
  color: string
  accent: string
  paint: string
}

/** A lane from its steps, with the second each step begins at, and ends. */
export interface BuiltLane {
  lane: Lane
  starts: number[]
  ends: number[]
}

export function buildLane(steps: LaneStep[]): BuiltLane {
  const segs: Seg[] = []
  const starts: number[] = []
  const ends: number[] = []
  let at: Pt = [-0.5, 0]
  let fire: number | null = null
  for (const step of steps) {
    starts.push(segTime(segs))
    const extra: Partial<Seg> = step.hidden ? { hidden: true } : {}
    const add = (...made: Seg[]) => segs.push(...made.map((s) => ({ ...s, ...extra })))
    if (step.op === 'wait') add(wait(at, step.dur))
    else {
      if (step.op === 'roll') add(roll(at, step.to, step.v))
      else if (step.op === 'ramp') add(ramp(at, step.to, step.v0, step.v1))
      else if (step.op === 'arrive') add(...arrive(at, step.to))
      else if (step.op === 'fall') add(fall(at, step.to, step.v))
      else if (step.op === 'fly') add(fly(at, step.to, step.dur, step.arc))
      else add({ from: at, to: step.to, dur: step.dur, ease: step.ease })
      at = step.to
    }
    ends.push(segTime(segs))
    if (step.fire && fire === null) fire = ends[ends.length - 1]
  }
  return { lane: { segs, fire: fire ?? ends[0] ?? 0 }, starts, ends }
}

/* ------------------------------------------------------------------ drawing */

interface Frame {
  p: p5
  c: PieceCtx
  s: BuiltState
  built: BuiltLane
}

const colourOf = (f: Frame, which: Fill | Stroke): string | null =>
  which === 'color' ? f.s.color : which === 'accent' ? f.s.accent : which === 'paint' ? f.s.paint : which === 'paper' ? f.c.bg : which === 'ink' ? f.c.ink : null

const clockOf = (f: Frame, name: ClockName | undefined): number => (name === 't' ? f.c.t : f.c.since)

const easeOf = (kind: Motion['ease'], x: number): number => (kind === 'linear' ? x : kind === 'in' ? easeInQuad(x) : kind === 'out' ? easeOutQuad(x) : easeInOutSine(x))

interface Pose {
  x: number
  y: number
  rot: number
  sx: number
  sy: number
}

/** Where a part is on this frame: its origin carried, turned and stretched by its motions. */
function poseOf(f: Frame, shape: Shape): Pose {
  const pose: Pose = { x: shape.at?.[0] ?? 0, y: shape.at?.[1] ?? 0, rot: shape.rot ?? 0, sx: 1, sy: 1 }
  for (const m of shape.motion ?? []) {
    const x = clockOf(f, m.clock)
    const rest = m.back ? 1 - easeInOutSine(over(x, m.back[0], m.back[1])) : 1
    if (m.drive === 'follow') {
      // The ball's own motion over a run of lane steps, so what carries it never parts from it.
      const [a, b] = m.steps ?? [0, 0]
      const t0 = f.built.starts[a] ?? 0
      const t1 = f.built.ends[b] ?? t0
      const from = laneAt(f.built.lane, t0)
      const here = laneAt(f.built.lane, clamp(f.c.t, t0, t1))
      if (m.axis !== 'y') pose.x += (here.x - from.x) * rest
      if (m.axis !== 'x') pose.y += (here.y - from.y) * rest
      continue
    }
    const from = m.from ?? 0
    let amount = 0
    if (m.drive === 'ease') amount = easeOf(m.ease, over(x, from, m.to ?? from + 1)) * rest
    else if (m.drive === 'pulse') amount = Math.sin(Math.PI * over(x, from, m.to ?? from + 1))
    else if (m.drive === 'flick') amount = x < from ? 0 : flick(x - from, 0.06, 0.12, Math.max(0.2, (m.to ?? from + 0.5) - from))
    else if (m.drive === 'swing') amount = x < from ? 0 : Math.sin((x - from) * (m.freq ?? 9)) * Math.exp(-(x - from) * (m.decay ?? 1.6))
    else if (m.drive === 'turn') amount = m.from !== undefined && x < from ? 0 : Math.min(x, m.to ?? Infinity) - from
    pose.rot += (m.rotate ?? 0) * amount
    if (m.move) {
      pose.x += m.move[0] * amount
      pose.y += m.move[1] * amount
    }
    if (m.scale) {
      pose.sx *= 1 + (m.scale[0] - 1) * amount
      pose.sy *= 1 + (m.scale[1] - 1) * amount
    }
  }
  return pose
}

/** How far through its `show` window a part is, or null when it is not to be drawn. */
function shown(f: Frame, shape: Shape): number | null {
  if (!shape.show) return 0
  const x = clockOf(f, shape.show.clock)
  const from = shape.show.from ?? -Infinity
  const to = shape.show.to ?? Infinity
  if (x < from || x > to) return null
  return Number.isFinite(from) && Number.isFinite(to) ? over(x, from, to) : 0
}

function drawShape(f: Frame, shape: Shape, layer: 'draw' | 'over', inherited: 'draw' | 'over'): void {
  const mine = shape.layer ?? inherited
  // A group is walked on both passes, since a part inside it may name the other layer.
  if (shape.kind !== 'group' && mine !== layer) return
  const progress = shown(f, shape)
  if (progress === null) return
  const { p, c } = f
  const { k, weight } = c
  const pose = poseOf(f, shape)

  if (shape.kind === 'coil') {
    // Not a body that moves but a spring between a fixed point and one that does.
    p.push()
    p.stroke(colourOf(f, shape.stroke ?? 'ink') ?? c.ink)
    p.strokeWeight(weight)
    p.noFill()
    coil(p, shape.anchor[0] * k, shape.anchor[1] * k, pose.x * k, pose.y * k, shape.turns, shape.amp * k)
    p.pop()
    return
  }

  p.push()
  p.translate(pose.x * k, pose.y * k)
  if (pose.rot) p.rotate(pose.rot)
  if (pose.sx !== 1 || pose.sy !== 1) p.scale(pose.sx, pose.sy)

  if (shape.kind === 'group') {
    for (const child of shape.shapes) drawShape(f, child, layer, mine)
    p.pop()
    return
  }

  const line = colourOf(f, shape.stroke ?? 'ink')
  if (line) {
    p.stroke(line)
    p.strokeWeight(weight)
  } else p.noStroke()
  const open = shape.kind === 'line' || shape.kind === 'burst' || (shape.kind === 'arc' && (shape.close ?? 'open') === 'open' && shape.fill === undefined)
  const paint = open ? null : colourOf(f, shape.fill ?? 'color')
  if (paint) p.fill(paint)
  else p.noFill()

  const ox = 'offset' in shape && shape.offset ? shape.offset[0] * k : 0
  const oy = 'offset' in shape && shape.offset ? shape.offset[1] * k : 0
  switch (shape.kind) {
    case 'rail':
      rail(p, k, line ?? c.ink, weight, shape.x0, shape.x1, shape.y)
      break
    case 'post':
      post(p, k, line ?? c.ink, weight, shape.x, shape.y0, shape.y1)
      break
    case 'gallows':
      gallows(p, k, line ?? c.ink, weight, shape.x0, shape.x1, shape.post, shape.y)
      break
    case 'line':
      p.beginShape()
      for (const [x, y] of shape.pts) p.vertex(x * k, y * k)
      p.endShape()
      break
    case 'poly':
      p.beginShape()
      for (const [x, y] of shape.pts) p.vertex(x * k, y * k)
      p.endShape(p.CLOSE)
      break
    case 'rect':
      p.rect(ox, oy, shape.w * k, shape.h * k, (shape.r ?? 0) * k)
      break
    case 'ellipse':
      p.ellipse(ox, oy, shape.w * k, shape.h * k)
      break
    case 'arc':
      p.arc(ox, oy, shape.w * k, shape.h * k, shape.a0, shape.a1, shape.close === 'chord' ? p.CHORD : shape.close === 'pie' ? p.PIE : p.OPEN)
      break
    case 'burst': {
      // Sparks: out from r0 towards r1 across the window, shortening as they go. Spokes, when there is no window.
      const windowed = !!shape.show
      const r0 = windowed ? shape.r0 + (shape.r1 - shape.r0) * progress * 0.7 : shape.r0
      const r1 = windowed ? r0 + (shape.r1 - shape.r0) * 0.45 * (1 - progress) : shape.r1
      burst(p, 0, 0, r0 * k, r1 * k, shape.n, shape.phase ?? 0)
      break
    }
    case 'puff':
      puff(p, k, c.ink, weight, c.bg, 0, 0, shape.r * (shape.show ? 0.35 + 0.65 * progress : 1))
      break
  }
  p.pop()
}

const hasLayer = (shapes: Shape[], layer: 'draw' | 'over', inherited: 'draw' | 'over' = 'draw'): boolean =>
  shapes.some((s) => (s.kind === 'group' ? hasLayer(s.shapes, layer, s.layer ?? inherited) : (s.layer ?? inherited) === layer))

/* ------------------------------------------------------------------ pieces */

export function compilePiece(spec: PieceSpec): Piece<BuiltState> {
  const built = buildLane(spec.lane)
  const pass = (layer: 'draw' | 'over') => (p: p5, s: BuiltState, c: PieceCtx) => {
    const frame: Frame = { p, c, s, built }
    for (const shape of spec.shapes) drawShape(frame, shape, layer, 'draw')
  }
  return definePiece<BuiltState>({
    name: spec.name,
    weight: spec.weight,
    flight: spec.flight,
    dynamic: !!spec.paint,
    points: spec.points,
    place: ({ rng, color, theme, ball, fits }) => {
      if (!fits(spec.cells, spec.exit.at)) return null
      // No part of a piece is the colour the ball arrives in, and the paint is a colour the ball is not yet.
      const others = theme.colors.filter((c) => c !== ball.color && c !== color)
      const accent = others.length ? rng.fork('accent').pick(others) : color
      let paint = color
      const changes: BallChange[] = []
      if (spec.paint) {
        const pots = theme.colors.filter((c) => c !== ball.color)
        if (!pots.length) return null
        const apart = pots.filter((c) => c !== color)
        paint = rng.fork('paint').pick(apart.length ? apart : pots)
        const at = Math.min(built.lane.fire + spec.paint.after, segTime(built.lane.segs))
        changes.push({ at, color: paint, over: spec.paint.over })
      }
      return { cells: spec.cells, exit: spec.exit, lane: built.lane, state: { color, accent, paint }, changes }
    },
    draw: pass('draw'),
    over: hasLayer(spec.shapes, 'over') ? pass('over') : undefined,
  })
}

/* ------------------------------------------------------------------ worlds */

const stockPiece = (name: string): Piece<any> | null => {
  for (const w of WORLDS) {
    const found = w.pieces.find((c) => c.name === name)
    if (found) return found
  }
  return null
}

/** Every name a stock world has taken. A built piece may not share one, or a solo of it would resolve to the wrong world. */
export const stockNames = (): Set<string> => new Set(WORLDS.flatMap((w) => w.pieces.map((c) => c.name)))

/** Where a build's pieces play when it brings no world of its own: the workshop's paper, the workshop's rail. */
export const defaultWorldSpec = (): WorldSpec => ({
  themes: [structuredClone(themeByName('okazz'))],
  backdrops: ['plain', 'dots'],
  rail: 'workshop',
  borrow: [],
})

export interface Compiled {
  world: World | null
  errors: string[]
}

/**
 * The world a build plays in: its own pieces, the rail of the stock world it
 * names, whatever stock pieces it borrows, and the portal. A taste of its
 * own leans on the build's pieces, so a borrowed cast supports them rather
 * than crowding them out.
 */
export function compileBuild(build: Build): Compiled {
  const errors: string[] = []
  const taken = stockNames()
  for (const spec of build.pieces) if (taken.has(spec.name)) errors.push(`pieces: "${spec.name}" is a stock piece's name`)
  if (WORLDS.some((w) => w.name === build.name)) errors.push(`build.name: "${build.name}" is a stock world's name`)
  const spec = build.world ?? defaultWorldSpec()
  const host = WORLDS.find((w) => w.name === spec.rail)
  const railPiece = host?.pieces.find((c) => c.name === 'rail')
  if (!railPiece) errors.push(`world.rail: no stock world called "${spec.rail}"`)
  const borrowed: Piece<any>[] = []
  for (const name of spec.borrow) {
    const found = stockPiece(name)
    if (!found) errors.push(`world.borrow: no stock piece called "${name}"`)
    else borrowed.push(found)
  }
  if (errors.length || !railPiece) return { world: null, errors }

  const own = build.pieces.map(compilePiece)
  const lean: Record<string, number> = {}
  for (const piece of own) lean[piece.name] = 2.2
  const world: World = {
    name: build.name,
    label: spec.label ?? build.label ?? build.name,
    note: spec.note ?? build.note ?? 'a build',
    themes: spec.themes,
    backdrops: spec.backdrops,
    tastes: borrowed.length ? { own: lean, mixed: Object.fromEntries(own.map((c) => [c.name, 1.4])) } : { own: {} },
    pieces: [railPiece, ...own, ...borrowed, portal],
    own: own.map((c) => c.name),
  }
  return { world, errors: [] }
}
