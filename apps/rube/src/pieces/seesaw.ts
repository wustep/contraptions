import { outline, solid } from '../../../../src/core/draw'
import { easeInOutCubic, easeOutCubic } from '../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, definePiece, over, rail, ramp, roll, wait, type Lane } from '../parts'

/**
 * A plank on a trestle with its near end down. The ball rolls up it, hangs
 * for a beat over the pivot, and its weight slams the far end down and sends
 * it off faster than it came. A counterweight under the near end hauls the
 * plank back, later, when nothing is watching.
 */
const TILT = 0.3
const HALF = 0.4
const THICK = 0.06
const PIVOT = FLOOR - HALF * Math.sin(TILT) + THICK / 2
const END = HALF * Math.cos(TILT)
const CREST = PIVOT - THICK / 2 - R

export const seesaw = definePiece<{ color: string }>({
  name: 'seesaw',
  weight: 0.9,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const up = ramp([-END, 0], [0, CREST], ROLL, 0.3)
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [-END, 0], ROLL),
        up,
        wait([0, CREST], 0.1),
        ramp([0, CREST], [END, 0], 0.3, FAST),
        ramp([END, 0], [0.5, 0], FAST, ROLL),
      ],
      fire: (0.5 - END) / ROLL + up.dur,
    }
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const tip = easeOutCubic(over(since, 0, 0.12)) - easeInOutCubic(over(since, 1.4, 2.6))
    // The plank creaks up a little as the ball climbs toward the pivot, then slams over.
    const creak = t > (0.5 - END) / ROLL && since < 0 ? 0.12 * over(t, (0.5 - END) / ROLL, (0.5 - END) / ROLL + 0.3) : 0
    const angle = TILT * (2 * tip - 1) + creak * TILT

    rail(p, k, ink, weight, -0.5, -END)
    rail(p, k, ink, weight, END, 0.5)
    // The stops the plank's ends land on, either side of the trestle.
    outline(p, ink, weight)
    for (const x of [-END + 0.06, END - 0.06]) p.line(x * k, (FLOOR + 0.06) * k, x * k, 0.5 * k)
    p.line((-END - 0.04) * k, (FLOOR + 0.06) * k, (-END + 0.1) * k, (FLOOR + 0.06) * k)
    p.line((END - 0.1) * k, (FLOOR + 0.06) * k, (END + 0.04) * k, (FLOOR + 0.06) * k)

    outline(p, ink, weight)
    p.line(-0.14 * k, 0.5 * k, 0, PIVOT * k)
    p.line(0.14 * k, 0.5 * k, 0, PIVOT * k)
    p.line(-0.2 * k, 0.5 * k, 0.2 * k, 0.5 * k)

    p.push()
    p.translate(0, PIVOT * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, HALF * 2 * k, THICK * k)
    // The counterweight, slung under the near end.
    outline(p, ink, weight)
    p.line(-HALF * 0.8 * k, THICK * k, -HALF * 0.8 * k, 0.12 * k)
    solid(p, ink, weight, s.color)
    p.rect(-HALF * 0.8 * k, 0.16 * k, 0.1 * k, 0.09 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, PIVOT * k, 0.08 * k)
  },
})
