import type { Placed } from '../../../../../../plan'
import { region, standing } from '../../draw'
import { END } from '../../voyage'
import { drawIsland } from './island'
import { drawArgos, drawHoist, overHoist } from './outside'
import { drawPalace, overPalace } from './palace'
import { drawSkiff } from './west'

/**
 * Ithaca, as one standing drawing: the island, the hoist, the palace cut open, the skiff; and over the balls, the walls'
 * cut ends, the axes, the arrow, the baskets' fronts and Argos (who lies in front of whoever passes him).
 */
export const ITHACA_SET: Placed = standing(
  'ithaca',
  region(792, -14, 846, 9, 2),
  END,
  (g) => {
    drawIsland(g)
    drawHoist(g)
    drawPalace(g)
    drawSkiff(g)
  },
  (g) => {
    overPalace(g)
    overHoist(g)
    drawArgos(g)
  },
)
