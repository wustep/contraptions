import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad, lerp } from '../../../../src/core/ease'
import { FLOOR, R, ROLL, burst, definePiece, fly, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A zip line. A cup hangs from a trolley on a wire strung from a tall post
 * down to a short one a floor below and two cells over. The ball rolls off
 * the rail into the cup; its weight lifts the brake; the trolley runs down
 * the wire, hits the stop, and the ball goes on out of the cup onto the
 * rail. The trolley stays where it stopped.
 */
const TOP: Pt = [0, -0.38]
const END: Pt = [1.9, 0.62]
/** The cup hangs this far under the wire, so the ball rides at the rail's level. */
const HANG = 0.38
const ARRIVE = 0.5 / ROLL
const BRAKE = 0.35
const RUN = 0.8
const FIRE = ARRIVE + BRAKE

/** Where along the wire the trolley is, 0 at the top, 1 at the stop. */
const along = (since: number) =>
  since < 0 ? 0 : since < RUN ? easeInQuad(over(since, 0, RUN)) : 1 - 0.02 * Math.exp(-(since - RUN) * 8) * Math.cos((since - RUN) * 40)

export const zipline = definePiece<{ color: string }>({
  name: 'zipline',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]
    if (!fits(cells, [3, 1])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [0, 0], ROLL, 'out'),
        wait([0, 0], BRAKE),
        { from: [0, 0], to: [END[0], 1], dur: RUN, ease: 'in' },
        fly([END[0], 1], [END[0] + 0.24, 1], 0.1, 0.04),
        roll([END[0] + 0.24, 1], [2.5, 1], ROLL * 1.2, 'out'),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const f = along(since)
    const tx = lerp(TOP[0], END[0], f)
    const ty = lerp(TOP[1], END[1], f)

    // The rails: in to the cup, and on from under the stop.
    rail(p, k, ink, weight, -0.5, -0.2)
    rail(p, k, ink, weight, END[0] + 0.04, 2.5, 1 + FLOOR)
    // The posts, on the ground of the floor below, and the wire between them.
    outline(p, ink, weight)
    p.line(-0.04 * k, (TOP[1] - 0.06) * k, -0.04 * k, 1.5 * k)
    p.line(-0.12 * k, 1.5 * k, 0.04 * k, 1.5 * k)
    p.line((END[0] + 0.12) * k, (END[1] - 0.06) * k, (END[0] + 0.12) * k, 1.5 * k)
    p.line((END[0] + 0.04) * k, 1.5 * k, (END[0] + 0.2) * k, 1.5 * k)
    p.line((TOP[0] - 0.1) * k, TOP[1] * k, (END[0] + 0.12) * k, END[1] * k)
    // The brake on the top post: a bar across the wire, lifted at the fire.
    const lifted = t < ARRIVE ? 0 : since < 0 ? over(t, ARRIVE + 0.1, FIRE) : 1
    p.push()
    p.translate(-0.04 * k, (TOP[1] - 0.06) * k)
    p.rotate(-0.9 * lifted)
    solid(p, ink, weight, s.color)
    p.rect(0.08 * k, 0, 0.16 * k, 0.04 * k)
    p.pop()
    // The stop on the bottom post: a pad the trolley hits.
    const hit = since < RUN ? 0 : 1 - over(since, RUN, RUN + 0.3)
    solid(p, ink, weight, s.color)
    p.rect((END[0] + 0.08 - hit * 0.01) * k, (END[1] + 0.08) * k, (0.06 + hit * 0.02) * k, 0.2 * k)

    // The trolley: a wheel on the wire, a hanger, and the cup.
    p.push()
    p.translate(tx * k, ty * k)
    solid(p, ink, weight, bg)
    p.circle(0, -0.03 * k, 0.11 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(0, -0.03 * k, 0.035 * k)
    outline(p, ink, weight)
    p.line(0, 0.02 * k, 0, (HANG - R - 0.06) * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (HANG + R * 0.6) * k, 0.3 * k, 0.05 * k)
    outline(p, ink, weight)
    p.line(-0.15 * k, (HANG + R * 0.6) * k, -0.15 * k, (HANG - R * 0.5) * k)
    p.line(0.15 * k, (HANG + R * 0.6) * k, 0.15 * k, (HANG - R * 0.1) * k)
    p.line(-0.09 * k, (HANG - R - 0.06) * k, 0.09 * k, (HANG - R - 0.06) * k)
    p.pop()

    // The hit: dust off the stop.
    if (since > RUN && since < RUN + 0.25) {
      const g = over(since, RUN, RUN + 0.25)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      burst(p, (END[0] + 0.05) * k, (END[1] + 0.05) * k, (0.05 + 0.1 * g) * k, (0.09 + 0.14 * g) * k, 5, 2.4)
      p.pop()
    }
  },
})
