import { outline, solid } from '../../../../../src/core/draw'
import { FAST, ROLL, definePiece, flick, over, rail, ramp, roll, type Lane } from '../../parts'
import { flash, glow, lamp, score } from './neon'

/**
 * A pop bumper: a mushroom on a post beside the lane, its skirt out over
 * the ball's line. The ball clips the skirt going by; the cap slams down,
 * the lamp inside comes on, and the kick sends the ball on faster than it
 * came, with a hundred points popping off the top. The cap rides back up
 * and the lamp dies down.
 */
const HIT = -0.1
const CAP_Y = -0.3
const T_HIT = (0.5 + HIT) / ROLL

export const bumper = definePiece<{ color: string }>({
  name: 'bumper',
  weight: 1.1,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const lane: Lane = {
      segs: [roll([-0.5, 0], [HIT, 0], ROLL), ramp([HIT, 0], [0.3, 0], ROLL, FAST), ramp([0.3, 0], [0.5, 0], FAST, ROLL)],
      fire: T_HIT,
    }
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const slam = since < 0 ? 0 : flick(since, 0.04, 0.1, 0.5)
    const lit = since < 0 ? 0 : 1 - over(since, 0.2, 0.9)
    const capY = CAP_Y + 0.06 * slam

    rail(p, k, ink, weight, -0.5, 0.5)
    // The post from the floor up through the skirt to the cap.
    outline(p, ink, weight)
    p.line(0, 0.5 * k, 0, capY * k)
    p.line(-0.08 * k, 0.5 * k, 0.08 * k, 0.5 * k)
    // The glow, behind everything lit.
    glow(p, k, s.color, 0, -0.12, 0.22, lit)
    // The skirt: a ring at the ball's height, in the colour when lit.
    solid(p, ink, weight, lit > 0.5 ? s.color : bg)
    p.ellipse(0, -0.02 * k, 0.4 * k, 0.12 * k)
    // The lamp on the post under the cap.
    lamp(p, k, ink, weight, s.color, bg, 0, capY + 0.1, 0.05, lit)
    // The cap: a dome with a rim, slammed down on the hit.
    solid(p, ink, weight, s.color)
    p.arc(0, capY * k, 0.36 * k, 0.24 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.rect(0, (capY + 0.02) * k, 0.4 * k, 0.05 * k, 0.01 * k)
    // Rings off the skirt, and the score.
    flash(p, k, s.color, weight, HIT + 0.05, -0.02, since, 0.3, 0.14, 0.34)
    score(p, k, s.color, 0, CAP_Y - 0.18, '+100', since)
  },
})
