import { makeRng } from '../../../../../src/core/rng'
import type { Theme } from '../../../../../src/core/themes'
import { ballAt, laneTime, type BallState, type Piece, type Placement } from '../../parts'
import { worldCells, type Placed } from '../../plan'
import { Show, type ShowPoint } from '../../show'
import { extentOf, universeAt, type Universe } from '../../universe'
import { portal, portalPlacement } from '../../pieces/portal'
import { cannon } from '../../pieces/workshop/cannon'
import { seesaw } from '../../pieces/workshop/seesaw'
import { toaster } from '../../pieces/workshop/toaster'
import { painter } from '../../pieces/workshop/painter'
import { appletree } from '../../pieces/garden/appletree'
import { booth } from '../../pieces/arcade/booth'
import { bell } from '../../pieces/workshop/bell'
import { affectionStamp } from './pieces'
import { OPTIONS, type Opening, type Recipe } from './recipe'

export const PAPER = '#f5f2e9'
export const INK = '#292e2a'
export const RED = '#c95336'
export const GREEN = '#41776b'
export const GOLD = '#e9b64f'
export const THEME: Theme = {
  name: 'gift-office',
  label: 'Gift office',
  bg: PAPER,
  ink: INK,
  colors: [RED, GREEN, GOLD, '#8eafbf'],
  weight: 0.72,
}

export interface Department {
  universe: Universe
  extent: ReturnType<typeof extentOf>
  start: number
  duration: number
  pace: number
  title: string
  caption: string
  id: string
  fire: number
}

/** Resolved choices become exact placements. Portals preserve the ball between separate, bounded scenes. */
export class GiftPerformance extends Show {
  readonly departments: Department[] = []
  readonly duration: number
  readonly finaleStart: number
  override trailOff(): boolean {
    return true
  }

  constructor(
    readonly recipe: Recipe,
    readonly opening: Opening,
    snow: Piece<any>,
  ) {
    super(recipe.seed)
    const cast: Piece<any>[][] = [
      [cannon, seesaw, toaster],
      [snow, painter, appletree],
      [booth, affectionStamp, bell],
    ]
    let incoming: BallState = { color: RED, ghost: false, id: 0 }
    let acc = 0
    const choices: { piece: Piece<any>; option: { id: string; name: string; verb: string } }[] = recipe.picks.map(
      (pick, i) => ({ piece: cast[i][pick], option: OPTIONS[i][pick] }),
    )
    if (opening === 'deluxe')
      choices.push({
        piece: affectionStamp,
        option: { id: 'stamp', name: 'Extra paperwork', verb: 'Deluxe requires a second signature.' },
      })
    for (const [i, { piece, option }] of choices.entries()) {
      const theme = option.id === 'snow' ? { ...THEME, colors: [...THEME.colors, '#ffffff'] } : THEME
      const placed: Placed[] = []
      let start = 0
      const add = (actor: Piece<any>, placement: Placement<unknown>, col: number, row: number): void => {
        const span = laneTime(placement.lane)
        placed.push({
          piece: { ...actor, scores: undefined, points: 0 },
          state: placement.state,
          col,
          row,
          mirror: 1,
          cells: worldCells(placement.cells, col, row, 1),
          lane: placement.lane,
          start,
          span,
          ballIn: { ...incoming },
          changes: placement.changes ?? [],
          points: 0,
        })
        incoming = ballAt(incoming, placement.changes ?? [], span)
        start += span
      }
      add(portal, portalPlacement('in', GREEN), -1, 0)
      const placement = piece.place({
        rng: makeRng(`${recipe.seed}:${i}`),
        color: [GOLD, GREEN, RED, GOLD][i],
        theme,
        taste: { weights: {} },
        ball: incoming,
        earned: 0,
        fits: () => true,
      })
      if (!placement) throw new Error(`Gift piece ${piece.name} could not be placed`)
      add(piece, placement, 0, 0)
      add(portal, portalPlacement('out', GREEN), placement.exit.at[0], placement.exit.at[1])
      const bounds = placed
        .flatMap((p) => p.cells)
        .reduce(
          (b, [x, y]) => ({
            x0: Math.min(b.x0, x),
            x1: Math.max(b.x1, x),
            y0: Math.min(b.y0, y),
            y1: Math.max(b.y1, y),
          }),
          { x0: 0, y0: 0, x1: 0, y1: 0 },
        )
      const world = {
        name: 'gifts',
        label: 'Gift office',
        note: '',
        themes: [theme],
        backdrops: ['plain'] as ['plain'],
        pieces: [],
        tastes: {},
      }
      const universe: Universe = {
        index: i,
        seed: recipe.seed,
        world,
        theme,
        taste: '',
        ballColor: placed[0].ballIn.color,
        backdrop: 'plain',
        pieces: placed,
        box: bounds,
        journey: start,
        bounds,
      }
      const duration = i === 3 ? 2.3 : 3.1
      const pace = start / (duration - 0.3)
      this.departments.push({
        universe,
        extent: extentOf(universe),
        start: acc,
        duration,
        pace,
        title: option.name,
        caption: option.verb,
        id: option.id,
        fire: acc + (placed[1].start + placed[1].lane.fire) / pace,
      })
      acc += duration
    }
    this.finaleStart = acc
    this.duration = acc + (recipe.finale === 'boxes' ? 2.4 : 1.7)
  }

  departmentAt(t: number): number {
    return Math.min(
      this.departments.length - 1,
      this.departments.findIndex((d) => t < d.start + d.duration) < 0
        ? this.departments.length - 1
        : this.departments.findIndex((d) => t < d.start + d.duration),
    )
  }

  atDepartment(index: number, t: number): ShowPoint {
    const d = this.departments[index]
    const local = Math.max(0, Math.min(d.universe.journey, (t - d.start) * d.pace))
    return { ...universeAt(d.universe, local), universe: d.universe, local, begin: d.start }
  }

  override at(t: number): ShowPoint {
    return this.atDepartment(this.departmentAt(t), t)
  }
}
