import { alpha, scenery } from '../kit'

/**
 * The church set (a stub; the church builder replaces it): the church, inside: plaster walls, the aisle and the pews, the altar, the organ, the windows, the doors and the steps; its morning for the wedding and its grey for the funeral.
 * Standing scenery for the whole show, drawn from show time (`c.t`) in its world's cells from the set's origin.
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const CHURCH_BOX: [number, number, number, number] = [-8, -7, 18, 3]

export const churchSet = scenery<null>({
  name: 'church',
  draw: (p, _s, c) => {
    const { k, ink, weight } = c
    const [x0, , x1] = CHURCH_BOX
    p.push()
    p.stroke(alpha(p, ink, 0.5))
    p.strokeWeight(weight)
    p.line(x0 * k, 0.13 * k, x1 * k, 0.13 * k)
    p.pop()
  },
})
