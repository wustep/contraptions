import type { Piece, Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import { StockShow } from '../../../stock/show'
import type { StockScore } from '../../../stock/types'

/**
 * The stock show, dressed: each universe's machine exactly as the score placed it, with scenery drawn before it (the
 * land) and after it (light over the machine). Nothing here moves a ball or a mechanism; `at` is the stock show's,
 * handed back in the dressed universe so the stage draws the scenery too.
 */

/** What a universe is dressed with: drawings placed at its first piece, over every cell the camera can frame. */
export interface Dressing {
  behind: Piece<null>[]
  over: Piece<null>[]
}

export class DressedShow extends StockShow {
  private readonly dressed: Universe[]

  constructor(score: StockScore, dress: (index: number, universe: Universe) => Dressing) {
    super(score)
    this.dressed = score.maps.map((_, i) => {
      const u = super.universe(i)
      const { behind, over } = dress(i, u)
      // Every cell round the map and well past it, so a piece of scenery is on the stage wherever the camera is.
      const b = u.bounds
      const cells: Pt[] = []
      for (let x = b.x0 - 40; x <= b.x1 + 40; x++) for (let y = b.y0 - 40; y <= b.y1 + 40; y++) cells.push([x, y])
      // Placed at the first piece's cell, so the stage's turn of the ball by its way along the map is unchanged.
      const at = u.pieces[0]
      const place = (piece: Piece<null>): Placed => ({
        piece, state: null, col: at.col, row: at.row, mirror: 1, cells, lane: { segs: [{ from: [0, 0], to: [0, 0], dur: 0 }], fire: 0 },
        start: 0, span: 0, ballIn: at.ballIn, changes: [], points: 0,
      })
      // The scenery is the backdrop now: the stock paper's sprigs and stars would stand in front of its sky.
      return { ...u, backdrop: 'plain' as const, pieces: [...behind.map(place), ...u.pieces, ...over.map(place)] }
    })
  }

  override universe(index: number): Universe {
    return this.dressed[Math.max(0, Math.min(this.dressed.length - 1, index))]
  }

  override at(time: number): ShowPoint {
    const here = super.at(time)
    return { ...here, universe: this.dressed[here.universe.index] }
  }
}
