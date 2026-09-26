import { alpha, scenery } from '../kit'

/**
 * The front set (a stub; the house builder replaces it): the house from the street: the facade, porch, steps, bay window (the living room and the two chairs seen through it), mailbox, path, the street and sky; derelict, fixed up, lived in, patched, and at dusk at the end.
 * Standing scenery for the whole show, drawn from show time (`c.t`) in its world's cells from the set's origin.
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const FRONT_BOX: [number, number, number, number] = [-10, -10, 20, 3]

export const front = scenery<null>({
  name: 'front',
  draw: (p, _s, c) => {
    const { k, ink, weight } = c
    const [x0, , x1] = FRONT_BOX
    p.push()
    p.stroke(alpha(p, ink, 0.5))
    p.strokeWeight(weight)
    p.line(x0 * k, 0.13 * k, x1 * k, 0.13 * k)
    p.pop()
  },
})
