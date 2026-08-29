import type p5 from 'p5'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, mod, seg } from '../../core/ease'
import type { Theme } from '../../core/themes'
import { ARC_CY, ARC_R, ARC_WALL, BY, D, FALL_V, FLOOR, LIFT_W, ROLL_V, TW } from '../lanes'
import { reactors, type ReactorState } from './reactors'

/**
 * Track cells. Each is one of seven shapes in a canonical hand — runs go west
 * to east, falls go down, the lift goes up on the left — and the composer
 * mirrors an instance to get the other hand.
 *
 * The ball's path through a cell is the primary object: the drawing is
 * derived from it (walls beside the falls, a floor under the runs, the arc
 * where one turns into the other), so lines and balls cannot disagree.
 */

export type Side = 'N' | 'E' | 'S' | 'W'

export interface TrackCell {
  col: number
  row: number
  in: Side
  out: Side
}

export type Kind = 'run' | 'landing' | 'drop' | 'fall' | 'shaft' | 'liftIn' | 'liftOut'

/** How a run is dressed. */
export type Variant = 'rail' | 'conveyor' | 'gate'

/**
 * A reactor assembly that reaches into this track cell. The track cell draws
 * the whole assembly clipped to its own footprint, and the reactor draws the
 * same assembly clipped to its cell, so the seam never cuts it — the pattern
 * of an elevator car straddling two cells.
 */
export interface Mount {
  /** Which reactor's assembly, by name. */
  name: string
  /** The reactor's own state, with `demo` set so the assembly comes unclipped. */
  state: ReactorState
  /** The reactor's cell relative to this one, in cells, in world hand. */
  dx: number
  dy: number
  /** Undo this instance's mirror, so the assembly lands as the reactor drew it. */
  flip: number
  /** Fraction of the period between this instance's u = 0 and the reactor's. */
  at: number
}

export interface SegState {
  color: string
  kind: Kind
  variant: Variant
  /** The instance's period in frames; reaction and gate windows count these. */
  frames?: number
  /** Fraction of the period at which the ball reaches the gate flap. */
  gateAt?: number
  /** Reactor assemblies whose ink crosses into this cell, drawn by it. */
  mounts?: Mount[]
}

type Pt = [number, number]

/** One straight piece of the ball's path, with the speed along it. */
export interface Piece {
  from: Pt
  to: Pt
  v: number
}

const LIFT_V = 4

export function kindOf(t: TrackCell): { kind: Kind; mirror: boolean } {
  const h = (s: Side) => s === 'E' || s === 'W'
  if (h(t.in) && h(t.out)) return { kind: 'run', mirror: t.in === 'E' }
  if (t.in === 'N' && h(t.out)) return { kind: 'landing', mirror: t.out === 'W' }
  if (h(t.in) && t.out === 'S') return { kind: 'drop', mirror: t.in === 'E' }
  if (t.in === 'N' && t.out === 'S') return { kind: 'fall', mirror: false }
  if (t.in === 'S' && t.out === 'N') return { kind: 'shaft', mirror: false }
  if (t.out === 'N') return { kind: 'liftIn', mirror: t.in === 'W' }
  return { kind: 'liftOut', mirror: t.out === 'W' }
}

const line = (from: Pt, to: Pt, v: number): Piece => ({ from, to, v })

/** The canonical path for each kind. */
export function pieces(kind: Kind): Piece[] {
  switch (kind) {
    case 'run':
      return [line([-0.5, BY], [0.5, BY], ROLL_V)]
    case 'fall':
      return [line([0, -0.5], [0, 0.5], FALL_V)]
    case 'landing': {
      const arc: Piece[] = []
      const n = 6
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI - (Math.PI / 2) * (i / n)
        const a1 = Math.PI - (Math.PI / 2) * ((i + 1) / n)
        arc.push(
          line(
            [ARC_R + ARC_R * Math.cos(a0), ARC_R * Math.sin(a0)],
            [ARC_R + ARC_R * Math.cos(a1), ARC_R * Math.sin(a1)],
            (FALL_V + ROLL_V) / 2,
          ),
        )
      }
      return [line([0, -0.5], [0, 0], FALL_V), ...arc, line([ARC_R, BY], [0.5, BY], ROLL_V)]
    }
    case 'drop': {
      // Off the lip on a parabola, picking up speed on the way to the tube.
      const fall: Piece[] = []
      const n = 4
      const x0 = -0.1
      for (let i = 0; i < n; i++) {
        const f0 = i / n
        const f1 = (i + 1) / n
        fall.push(
          line([x0 * (1 - f0), BY + (0.5 - BY) * f0 * f0], [x0 * (1 - f1), BY + (0.5 - BY) * f1 * f1], ROLL_V + (FALL_V - ROLL_V) * f1),
        )
      }
      return [line([-0.5, BY], [x0, BY], ROLL_V), ...fall]
    }
    case 'shaft':
      return [line([0, 0.5], [0, -0.5], LIFT_V)]
    case 'liftIn':
      return [line([0.5, BY], [0, BY], ROLL_V), line([0, BY], [0, -0.5], LIFT_V)]
    case 'liftOut':
      return [line([0, 0.5], [0, BY], LIFT_V), line([0, BY], [0.5, BY], ROLL_V)]
  }
}

const len = (piece: Piece) => Math.hypot(piece.to[0] - piece.from[0], piece.to[1] - piece.from[1])

/** Loop-fraction-ish time to traverse a path: sum of length over speed. */
export const duration = (path: Piece[]) => path.reduce((sum, piece) => sum + len(piece) / piece.v, 0)

/** Point at time fraction `f` along a path, and whether it is riding the lift. */
export function along(path: Piece[], f: number): { x: number; y: number; lift: boolean } {
  const total = duration(path)
  let want = f * total
  for (let i = 0; i < path.length; i++) {
    const piece = path[i]
    const t = len(piece) / piece.v
    if (want <= t || i === path.length - 1) {
      const s = t === 0 ? 0 : Math.min(1, want / t)
      return {
        x: piece.from[0] + (piece.to[0] - piece.from[0]) * s,
        y: piece.from[1] + (piece.to[1] - piece.from[1]) * s,
        lift: piece.v === LIFT_V,
      }
    }
    want -= t
  }
  const last = path[path.length - 1]
  return { x: last.to[0], y: last.to[1], lift: last.v === LIFT_V }
}

const floorLine = (p: p5, k: number, x1: number, x2: number, y = FLOOR) =>
  p.line(x1 * k, y * k, x2 * k, y * k)
const wall = (p: p5, k: number, x: number, y1: number, y2: number) => p.line(x * k, y1 * k, x * k, y2 * k)

/** The bucket that carries a ball up the lift, drawn under it. */
export function bucket(p: p5, k: number, ink: string, weight: number, bg: string, x: number, y: number): void {
  solid(p, ink, weight, bg)
  p.rect(x, y + (D / 2 + 0.03) * k, 0.36 * k, 0.06 * k)
  outline(p, ink, weight)
  p.line(x - 0.18 * k, y + (D / 2 + 0.03) * k, x - 0.18 * k, y - 0.02 * k)
  p.line(x + 0.18 * k, y + (D / 2 + 0.03) * k, x + 0.18 * k, y - 0.02 * k)
}

const reactorByName = new Map(reactors.map((r) => [r.name, r]))

/**
 * This cell's share of the reactor assemblies that reach into it, clipped to
 * this cell so the crossing ink lands on its own other half. Drawn after the
 * rails so a mast stands on the floor line.
 */
function drawMounts(
  p: p5,
  s: SegState,
  k: number,
  u: number,
  ink: string,
  weight: number,
  theme: Theme,
): void {
  if (!s.mounts?.length) return
  for (const m of s.mounts) {
    const reactor = reactorByName.get(m.name)
    if (!reactor) continue
    clipCell(p, k, () => {
      p.scale(m.flip, 1)
      p.translate(m.dx * k, m.dy * k)
      reactor.draw(p, m.state, {
        size: k,
        w: k,
        h: k,
        u: mod(u - m.at, 1),
        t: 0,
        unit: k,
        theme,
        ink,
        weight,
        fired: 0,
      })
    })
  }
}

/**
 * Draw a track cell in its canonical hand. `u` is the cell's own clock; the
 * gate's window starts at `gateAt`, the moment the ball reaches the flap.
 */
export function drawTrack(
  p: p5,
  s: SegState,
  k: number,
  u: number,
  ink: string,
  weight: number,
  theme: Theme,
): void {
  drawRails(p, s, k, u, ink, weight)
  drawMounts(p, s, k, u, ink, weight, theme)
}

function drawRails(p: p5, s: SegState, k: number, u: number, ink: string, weight: number): void {
  outline(p, ink, weight)
  switch (s.kind) {
    case 'run': {
      if (s.variant === 'conveyor') {
        // Roller speed is set in frames so it holds whatever the period is;
        // whole turns per period, and the cross is fourfold anyway.
        const turns = Math.max(1, Math.round((s.frames ?? 720) / 120))
        const r = 0.08
        floorLine(p, k, -0.3, 0.3)
        floorLine(p, k, -0.3, 0.3, FLOOR + r * 2)
        for (const x of [-0.3, 0.3]) {
          p.push()
          p.translate(x * k, (FLOOR + r) * k)
          p.rotate(u * Math.PI * 2 * turns)
          outline(p, ink, weight)
          p.circle(0, 0, r * 2 * k)
          p.line(-r * k, 0, r * k, 0)
          p.line(0, -r * k, 0, r * k)
          p.pop()
        }
        floorLine(p, k, -0.5, -0.3)
        floorLine(p, k, 0.3, 0.5)
        return
      }
      floorLine(p, k, -0.5, 0.5)
      if (s.variant === 'gate') {
        // A flap hung from a bracket; the ball shoulders it open and it
        // swings shut behind it. Windows in frames — open over 10, shut over
        // 14 to 38 — so an open flap always has its ball beside it.
        const K = 1 / Math.max(s.frames ?? 240, 40)
        const ug = mod(u - (s.gateAt ?? 0), 1)
        const open = easeOutCubic(seg(ug, 0, 10 * K)) - easeInOutCubic(seg(ug, 14 * K, 38 * K))
        const hinge = FLOOR - D - 0.12
        p.line(0.08 * k, hinge * k, 0.08 * k, (hinge - 0.12) * k)
        p.line(-0.04 * k, (hinge - 0.12) * k, 0.2 * k, (hinge - 0.12) * k)
        p.push()
        p.translate(0.08 * k, hinge * k)
        p.rotate(open * 1.1)
        solid(p, ink, weight, s.color)
        p.rect(0, ((FLOOR - hinge) / 2 - 0.015) * k, 0.07 * k, (FLOOR - hinge - 0.03) * k)
        p.pop()
      }
      return
    }
    case 'landing':
      wall(p, k, -TW, -0.5, ARC_CY)
      wall(p, k, TW, -0.5, -0.14)
      p.arc(ARC_R * k, ARC_CY * k, ARC_WALL * 2 * k, ARC_WALL * 2 * k, Math.PI / 2, Math.PI)
      floorLine(p, k, ARC_R, 0.5)
      return
    case 'drop':
      floorLine(p, k, -0.5, -TW)
      wall(p, k, -TW, FLOOR, 0.5)
      wall(p, k, TW, 0.12, 0.5)
      return
    case 'fall':
      wall(p, k, -TW, -0.5, 0.5)
      wall(p, k, TW, -0.5, 0.5)
      return
    case 'shaft':
      wall(p, k, -LIFT_W, -0.5, 0.5)
      wall(p, k, LIFT_W, -0.5, 0.5)
      return
    case 'liftIn':
      // The ball rolls in from the east onto a waiting bucket.
      floorLine(p, k, LIFT_W, 0.5)
      wall(p, k, -LIFT_W, -0.5, FLOOR + 0.1)
      wall(p, k, LIFT_W, -0.5, FLOOR - D - 0.05)
      floorLine(p, k, -LIFT_W, LIFT_W, FLOOR + 0.1)
      return
    case 'liftOut':
      // Up to the head pulley, then off to the east.
      wall(p, k, -LIFT_W, 0.5, -0.3)
      wall(p, k, LIFT_W, 0.5, FLOOR)
      wall(p, k, LIFT_W, FLOOR - D - 0.05, -0.3)
      floorLine(p, k, LIFT_W, 0.5)
      p.line(-LIFT_W * k, -0.3 * k, LIFT_W * k, -0.3 * k)
      p.circle(0, -0.3 * k, 0.16 * k)
      return
  }
}
