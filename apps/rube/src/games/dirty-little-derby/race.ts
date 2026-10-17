import type p5 from 'p5'
import { makeRng } from '../../../../../src/core/rng'
import type { Theme } from '../../../../../src/core/themes'
import { fly, laneAt, laneTime, type Lane, type Piece, type PieceCtx, type Pt, type Seg } from '../../parts'
import type { Placed } from '../../plan'
import { rocket } from '../../pieces/workshop/rocket'
import { conveyor } from '../../pieces/workshop/conveyor'
import { snail } from '../../pieces/garden/snail'
import { dunk } from '../../pieces/arcade/dunk'
import { Show, type ShowBall, type ShowPoint } from '../../show'
import type { Universe } from '../../universe'
import type { World } from '../../worlds'
import { COLORS, type Outcome, type Racer, type Result } from './model'

export const PAPER = '#e9eddf'
export const INK = '#282c27'
export const ROWS = [1.25, 4.25] as const
export const FINISH = 11.8
export const THEME: Theme = { name: 'derby', label: 'Backyard ink', bg: PAPER, ink: INK, colors: [...COLORS, '#d9b746'], weight: 0.64 }
const WORLD: World = {
  name: 'derby',
  label: 'The backyard circuit',
  note: '',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { derby: {} },
}

export interface Runner {
  pieces: Placed[]
  finish: number
  junction: number
  home: number
}

const segment = (from: Pt, to: Pt, dur: number): Seg => ({ from, to, dur })

/** Author the exact routes. Each stock machine owns a fresh placement and its own clock. */
function buildRunner(outcome: Outcome, racer: Racer): Runner {
  const pieces: Placed[] = []
  const row = ROWS[racer]
  const color = COLORS[racer]
  let clock = 0
  const add = <S>(piece: Piece<S>, col: number, y: number, duration: number): void => {
    const placement = piece.place({
      rng: makeRng(`derby:${racer}:${pieces.length}`),
      color,
      theme: THEME,
      taste: { weights: {} },
      ball: { id: racer, color, ghost: false },
      earned: 0,
      fits: () => true,
    })
    if (!placement) throw new Error(`Could not place derby machine: ${piece.name}`)
    const factor = duration / laneTime(placement.lane)
    const retime = (ctx: PieceCtx): PieceCtx => ({ ...ctx, t: ctx.t / factor, since: ctx.since / factor })
    const timed: Piece<S> = {
      ...piece,
      points: 0,
      draw: (p, state, ctx) => piece.draw(p, state, retime(ctx)),
      over: piece.over ? (p, state, ctx) => piece.over!(p, state, retime(ctx)) : undefined,
      // Arcade scores describe the stock show, never earned game points.
      scores: undefined,
    }
    pieces.push({
      piece: timed,
      state: placement.state,
      col,
      row: y,
      mirror: 1,
      cells: placement.cells.map(([x, py]) => [col + x, y + py]),
      lane: { segs: placement.lane.segs.map((s) => ({ ...s, dur: s.dur * factor })), fire: placement.lane.fire * factor },
      start: clock,
      span: duration,
      ballIn: { id: racer, color, ghost: false },
      changes: [],
      points: 0,
    })
    clock += duration
  }
  const track = (name: string, segs: Seg[], flights = false): void => {
    const lane: Lane = { segs, fire: 0 }
    const piece: Piece<null> = {
      name,
      weight: 0,
      place: () => ({ state: null, cells: segs.flatMap((s) => [s.from, s.to]), exit: { at: segs.at(-1)!.to, dir: 1 }, lane }),
      draw: (p, _s, { k, weight, ink }) => {
        p.noFill()
        p.stroke(ink)
        p.strokeWeight(weight)
        for (const s of segs) {
          if (s.arc && flights) {
            const ctx = p.drawingContext as CanvasRenderingContext2D
            ctx.setLineDash([2, 5])
            p.stroke('#abb19f')
            p.beginShape()
            for (let i = 0; i <= 24; i++) {
              const f = i / 24
              p.vertex(
                (s.from[0] + (s.to[0] - s.from[0]) * f) * k,
                (s.from[1] + (s.to[1] - s.from[1]) * f - s.arc * 4 * f * (1 - f) + 0.13) * k,
              )
            }
            p.endShape()
            ctx.setLineDash([])
            p.stroke(ink)
          } else {
            p.line(s.from[0] * k, (s.from[1] + 0.13) * k, s.to[0] * k, (s.to[1] + 0.13) * k)
          }
        }
        for (const s of segs) {
          if (s.arc) continue
          const x = (s.from[0] + s.to[0]) / 2
          const y = (s.from[1] + s.to[1]) / 2 + 0.13
          p.line(x * k, y * k, x * k, (y + 0.3) * k)
          p.line((x - 0.09) * k, (y + 0.3) * k, (x + 0.09) * k, (y + 0.3) * k)
        }
      },
    }
    add(piece, 0, row, laneTime(lane))
  }

  track('starting rail', [segment([0, 0], [1.5, 0], 0.8)])
  const routeTime = outcome.base - 6.6
  if (outcome.choice.route === 'rocket') add(rocket, 2, row, routeTime)
  else {
    add(conveyor, 2, row, routeTime - 0.65)
    track('conveyor exit', [segment([3.5, -1], [4.5, 0], 0.65)])
  }
  track('approach', [segment([4.5, 0], [6, 0], 1.1)])
  const junction = clock
  if (outcome.incoming === 'snail' && outcome.penalty) add(snail, 6.5, row, 1 + outcome.penalty)
  else if (outcome.incoming === 'dunk' && outcome.penalty) {
    add(dunk, 6.5, row, 0.5 + outcome.penalty)
    track('dunk escape', [segment([7, 1], [8, 0], 0.5)])
  } else track('clear junction', [segment([6, 0], [8, 0], 1)])
  const home = clock
  const homeTime = 3.7 - outcome.boost
  track(
    'home stretch',
    [
      segment([8, 0], [8.65, -0.22], homeTime * 0.22),
      fly([8.65, -0.22], [9.85, 0], homeTime * 0.27, 0.62),
      segment([9.85, 0], [FINISH, 0], homeTime * 0.51),
    ],
    true,
  )
  return { pieces, finish: clock, junction, home }
}

export class DerbyShow extends Show {
  readonly runners: [Runner, Runner]
  readonly arena: Universe
  readonly duration: number

  constructor(readonly result: Result) {
    super('dirty-little-derby')
    this.runners = result.outcomes.map((outcome, i) => buildRunner(outcome, i as Racer)) as [Runner, Runner]
    this.duration = Math.max(...this.runners.map((r) => r.finish))
    const bounds = { x0: -1.4, y0: -0.6, x1: 13.0, y1: 7.5 }
    this.arena = {
      index: 0,
      seed: this.seed,
      world: WORLD,
      theme: THEME,
      taste: 'derby',
      ballColor: COLORS[0],
      backdrop: 'plain',
      pieces: this.runners.flatMap((r) => r.pieces),
      box: bounds,
      bounds,
      journey: this.duration,
    }
  }

  override trailOff(): boolean {
    return true
  }

  position(racer: Racer, time: number): { placed: Placed; point: ReturnType<typeof laneAt> } {
    const runner = this.runners[racer]
    const placed = runner.pieces.find((piece) => piece.start + piece.span >= Math.max(0, time)) ?? runner.pieces.at(-1)!
    const point = laneAt(placed.lane, Math.max(0, time) - placed.start)
    return { placed, point: { ...point, x: placed.col + point.x, y: placed.row + point.y } }
  }

  override at(time: number): ShowPoint {
    const local = Math.max(0, Math.min(this.duration, time))
    const first = this.position(0, local)
    const balls = this.runners.map((_r, i): ShowBall => {
      const { point } = this.position(i as Racer, local)
      return { id: i, x: point.x, y: point.y, color: COLORS[i], scale: point.hidden ? 0 : 1.12, spin: null }
    })
    return { ...first.point, placed: first.placed, ball: first.placed.ballIn, universe: this.arena, local, begin: 0, balls }
  }
}

/** Sparse, flat scenery. Everything important is still drawn by engine.drawWorld. */
export function drawTrackFurniture(
  p: p5,
  show: DerbyShow,
  time: number,
  camera: { x: number; y: number },
  k: number,
  width: number,
  height: number,
  names: [string, string],
  detailed = true,
): void {
  const x = (value: number) => width / 2 + (value - camera.x) * k
  const y = (value: number) => height / 2 + (value - camera.y) * k
  const label = (text: string, atX: number, atY: number): void => {
    const left = x(atX)
    if (left >= 10 && left + p.textWidth(text) <= width - 10) p.text(text, left, y(atY))
  }
  p.push()
  p.textFont('Arial')
  p.textAlign(p.LEFT, p.CENTER)
  p.stroke(INK)
  p.strokeWeight(Math.max(1, k * 0.018))
  for (const racer of [0, 1] as const) {
    const row = ROWS[racer]
    const outcome = show.result.outcomes[racer]
    const runner = show.runners[racer]
    const current = show.position(racer, time).point
    const before = time < 0
    // Start gate and finish post.
    p.stroke(INK)
    p.line(x(0.45), y(row - 0.65), x(0.45), y(row + 0.48))
    p.line(x(0.45), y(row - 0.65), x(time < 0.15 ? 0.45 : 0.82), y(row - 0.18))
    p.line(x(FINISH), y(row - 1.1), x(FINISH), y(row + 0.48))
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        p.noStroke()
        p.fill((i + j) % 2 ? PAPER : INK)
        p.rect(x(FINISH + 0.09 + i * 0.18), y(row - 1 + j * 0.18), 0.18 * k, 0.18 * k)
      }
    }
    // Lane number tab.
    p.fill(COLORS[racer])
    p.circle(x(-0.55), y(row), 0.48 * k)
    p.fill('#ffffff')
    p.textAlign(p.CENTER, p.CENTER)
    p.textSize(k * 0.22)
    p.textStyle(p.BOLD)
    p.text(String(racer + 1), x(-0.55), y(row - 0.005))
    p.textStyle(p.NORMAL)
    p.textAlign(p.LEFT, p.CENTER)
    // Route labels live above the machines; the cause is printed under the detour.
    p.fill('#636c5e')
    p.textSize(Math.max(9, k * 0.135))
    if (detailed) {
      label(outcome.choice.route === 'rocket' ? 'ROCKET SHORTCUT' : 'COVERED CONVEYOR', 1.5, row - 1.38)
      label('MISCHIEF JUNCTION', 6, row - 1.38)
      label('HOME STRETCH', 9.3, row - 1.38)
    }
    // A literal roof makes the covered route legible.
    if (outcome.choice.route === 'covered') {
      p.stroke('#8b9580')
      p.noFill()
      p.line(x(1.45), y(row - 0.65), x(3.1), y(row - 1.2))
      p.line(x(3.1), y(row - 1.2), x(4.05), y(row - 0.55))
      p.line(x(1.55), y(row - 0.68), x(1.55), y(row + 0.5))
      p.line(x(4), y(row - 0.58), x(4), y(row + 0.5))
    }
    // Faces give the two otherwise identical engine riders a little personality.
    if (!current.hidden) {
      p.noStroke()
      p.fill(INK)
      p.circle(x(current.x + 0.025), y(current.y - 0.03), k * 0.035)
      p.circle(x(current.x + 0.09), y(current.y - 0.03), k * 0.035)
      p.stroke(INK)
      p.noFill()
      p.arc(x(current.x + 0.058), y(current.y + 0.01), k * 0.065, k * 0.06, 0, Math.PI)
    }
    if (outcome.blocked && time >= runner.junction - 0.25 && time <= runner.junction + 1.1) {
      p.stroke(COLORS[racer])
      p.strokeWeight(2)
      p.noFill()
      p.circle(x(current.x), y(current.y), k * 0.48)
    }
    if (outcome.boost && time >= runner.home && time < runner.finish) {
      p.stroke(COLORS[racer])
      for (let n = 0; n < 3; n++)
        p.line(
          x(current.x - 0.22 - n * 0.08),
          y(current.y - 0.07 + n * 0.07),
          x(current.x - 0.4 - n * 0.08),
          y(current.y - 0.07 + n * 0.07),
        )
    }
    p.noStroke()
    p.fill(INK)
    p.textSize(Math.max(10, k * 0.18))
    const caption = before
      ? names[racer]
      : time >= runner.finish
        ? `${names[racer]} · ${runner.finish.toFixed(2)}s`
        : time >= runner.junction && outcome.incoming
          ? outcome.blocked
            ? 'A very satisfying NO.'
            : `${names[1 - racer]} did this. +${outcome.penalty.toFixed(1)}s`
          : names[racer]
    if (detailed)
      label(
        caption,
        time >= runner.junction && time < runner.finish && outcome.incoming ? 6 : 0,
        row + (outcome.incoming === 'dunk' && outcome.penalty ? 1.45 : 0.9),
      )
    if (detailed && outcome.protected && time >= runner.junction && time < runner.finish) {
      p.fill('#636c5e')
      p.textSize(Math.max(9, k * 0.14))
      label('Cover halved the delay.', 8.1, row + 1.2)
    }
  }
  p.pop()
}
