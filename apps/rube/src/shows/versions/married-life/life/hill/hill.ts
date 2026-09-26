import { alpha, scenery } from '../kit'

/**
 * The hill set (a stub; the hill builder replaces it): the picnic hill: the slope, the tree, the sky; summer for the clouds, autumn and grey for the climb.
 * Standing scenery for the whole show, drawn from show time (`c.t`) in its world's cells from the set's origin.
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const HILL_BOX: [number, number, number, number] = [-10, -10, 18, 4]

export const hillSet = scenery<null>({
  name: 'hill',
  draw: (p, _s, c) => {
    const { k, ink, weight } = c
    const [x0, , x1] = HILL_BOX
    p.push()
    p.stroke(alpha(p, ink, 0.5))
    p.strokeWeight(weight)
    p.line(x0 * k, 0.13 * k, x1 * k, 0.13 * k)
    p.pop()
  },
})
