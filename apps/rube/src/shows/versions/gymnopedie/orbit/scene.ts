/**
 * Everything on the planet but the ball, each a drawing told show time; the drawings are in `sky.ts`, `stones.ts`,
 * `sea.ts` and `over.ts`, and what they share in `frame.ts`.
 *
 * - The sky: the day's gradient over the sea, the sun and the moon on their
 *   arcs, the stars, and, as the camera draws out, space round the planet.
 * - The stones: the melody, one material to a piece. The Gymnopédie's are
 *   columns of pale stone, the long notes lintels on two columns; the first
 *   Gnossienne's dark stelae, each with a lamp the ball lights as it lands;
 *   the third's lotus leaves on stems, floating, the longest with a flower
 *   that opens when the ball comes. What the ball does at night stays done
 *   until dawn: the lamps burn and the flowers stay open behind it, so its way
 *   is a thread of light, and seen from far off, round the planet.
 * - The sea, over the stones' feet: the swell that each bass note sends out
 *   from under the ball, its crests catching the light; the stones'
 *   reflections; and the light on the water, under the sun, the lamps and the
 *   moon, which the chords set sparkling.
 * - Over the ball: a spark where it is about to land, struck by a grace note;
 *   the lamps seen from far off; and, once the planet is small in the frame, a
 *   light round the ball so it can still be found.
 *
 * One job to a voice: the melody is the stones and the ball's landings, the
 * bass the sea's swell, the chords the light on the water, a grace note a
 * spark. How full the music is (`loudness`) is how high the swell stands and
 * how bright the water's light.
 */

export { sky, raysAt } from './sky'
export { stones, lampLight, bloom, CADENCES, cadenceFronts, PERCHED, dawnAt, DAWN_GOING } from './stones'
export { sea, CLOSE, leafRings } from './sea'
export { glints, SUN_GLINTS } from './over'
export { sunAngle, moonAngle } from './frame'
