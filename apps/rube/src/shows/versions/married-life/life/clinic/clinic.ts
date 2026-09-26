import { alpha, scenery } from '../kit'

/**
 * The clinic set (a stub; the clinic builder replaces it): the clinic: the doctor's office (cold, two chairs, blinds) and the hospital room (a bed, a chair, a window).
 * Standing scenery for the whole show, drawn from show time (`c.t`) in its world's cells from the set's origin.
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const CLINIC_BOX: [number, number, number, number] = [-8, -6, 12, 3]

export const clinicSet = scenery<null>({
  name: 'clinic',
  draw: (p, _s, c) => {
    const { k, ink, weight } = c
    const [x0, , x1] = CLINIC_BOX
    p.push()
    p.stroke(alpha(p, ink, 0.5))
    p.strokeWeight(weight)
    p.line(x0 * k, 0.13 * k, x1 * k, 0.13 * k)
    p.pop()
  },
})
