import type { Piece, Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Theme } from '../../../../../../../src/core/themes'
import { COLORS, type Drawing } from './draw'

/**
 * Orchestrion as a `Show`: one place, the instrument, and one drawing that stands for the whole show and is told show
 * time. Its balls are its own (the drawing paints them from the simulation), so the stage is handed an empty list of
 * riders and draws none of its own.
 */

export const THEME: Theme = {
  name: 'orchestrion',
  label: 'Orchestrion',
  bg: COLORS.bg,
  ink: COLORS.woodDark,
  colors: [COLORS.ball],
  weight: 0.5,
}

const WORLD = {
  name: 'orchestrion',
  label: 'The orchestrion',
  note: 'An instrument the balls play, in a dim room.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
} as unknown as World

/** Every cell of a box, at `step`, so the stage draws the instrument whenever any of it is in view. */
function cover(box: Box, step = 2): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(box.x0); x <= Math.ceil(box.x1); x += step) for (let y = Math.floor(box.y0); y <= Math.ceil(box.y1); y += step) out.push([x, y])
  return out
}

export class OrchestrionShow extends Show {
  private readonly world: Universe
  private readonly placed: Placed

  constructor(
    drawing: Drawing,
    readonly duration: number,
    readonly box: Box,
  ) {
    super('orchestrion')
    const piece: Piece<null> = {
      name: 'orchestrion',
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
      cells: cover(box),
      lane: { segs: [{ from: [0, 0], to: [0, 0], dur: duration }], fire: 0 },
      start: 0,
      span: duration,
      ballIn: { color: COLORS.ball, ghost: false, id: 0 },
      changes: [],
      points: 0,
    }
    this.world = {
      index: 0,
      seed: 'orchestrion',
      world: WORLD,
      theme: THEME,
      taste: 'arranged',
      ballColor: COLORS.ball,
      backdrop: 'plain',
      pieces: [this.placed],
      box,
      bounds: box,
      journey: duration,
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
      x: (this.box.x0 + this.box.x1) / 2,
      y: (this.box.y0 + this.box.y1) / 2,
      scale: 0,
      stretch: 1,
      angle: 0,
      hidden: true,
      seg: 0,
      s: 0,
      raw: 0,
      placed: this.placed,
      ball: { color: COLORS.ball, ghost: false, id: 0 },
      universe: this.world,
      local: time,
      begin: 0,
      balls: [],
    }
  }
}
