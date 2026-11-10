import type { Piece, Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Theme } from '../../../../../../../src/core/themes'
import { COLORS, type Drawing } from './draw'
import { BALL_COLORS, BOX, DURATION, SLOPE } from './layout'

/**
 * Struck as a `Show`: one place, the machine, and one drawing that stands for the whole of it and is told show time.
 * Its balls are its own (the drawing paints them from their laid-out paths), so the stage is handed an empty list of
 * riders and draws none.
 */

export const THEME: Theme = {
  name: 'struck',
  label: 'Struck',
  bg: COLORS.board,
  ink: COLORS.ink,
  colors: [BALL_COLORS[0]],
  weight: 0.5,
}

const WORLD = {
  name: 'struck',
  label: 'The soundboard',
  note: 'Tines, hammers, pipes and a bow on one long soundboard.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
} as unknown as World

/** Cells down the machine's slope, a band of them, so the stage draws the machine whenever any of it is in view. */
function cover(box: Box): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(box.x0); x <= Math.ceil(box.x1); x += 3) for (let dy = -16; dy <= 30; dy += 4) out.push([x, Math.round(SLOPE * x + dy)])
  return out
}

export class StruckShow extends Show {
  readonly duration = DURATION
  readonly box: Box = BOX
  private readonly world: Universe
  private readonly placed: Placed

  constructor(drawing: Drawing) {
    super('struck')
    const piece: Piece<null> = {
      name: 'struck',
      weight: 0,
      place: () => null,
      draw: (p, _s, c) => drawing.draw(p, c.t, c.k),
      over: (p, _s, c) => drawing.over(p, c.t, c.k),
    }
    this.placed = {
      piece,
      state: null,
      col: 0,
      row: 0,
      mirror: 1,
      cells: cover(BOX),
      lane: { segs: [{ from: [0, 0], to: [0, 0], dur: DURATION }], fire: 0 },
      start: 0,
      span: DURATION,
      ballIn: { color: BALL_COLORS[0], ghost: false, id: 0 },
      changes: [],
      points: 0,
    }
    this.world = {
      index: 0,
      seed: 'struck',
      world: WORLD,
      theme: THEME,
      taste: 'arranged',
      ballColor: BALL_COLORS[0],
      backdrop: 'plain',
      pieces: [this.placed],
      box: BOX,
      bounds: BOX,
      journey: DURATION,
    }
  }

  override indexAt(): number {
    return 0
  }
  override universe(): Universe {
    return this.world
  }
  override begin(): number {
    return 0
  }
  override worldAt(): World {
    return this.world.world
  }

  override at(t: number): ShowPoint {
    const time = Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
    return {
      x: (BOX.x0 + BOX.x1) / 2,
      y: (BOX.y0 + BOX.y1) / 2,
      scale: 0,
      stretch: 1,
      angle: 0,
      hidden: true,
      seg: 0,
      s: 0,
      raw: 0,
      placed: this.placed,
      ball: { color: BALL_COLORS[0], ghost: false, id: 0 },
      universe: this.world,
      local: time,
      begin: 0,
      balls: [],
    }
  }
}
