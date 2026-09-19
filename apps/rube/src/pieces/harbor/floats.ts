import { solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt, type Seg } from '../../parts'
import { piling, rope, seaWater, splash, water } from './sea'

/**
 * A line of net floats. The deck stops; across the gap three floats ride
 * the water on a slack rope strung between the pilings either side. The
 * ball drops off the deck's end onto the first, which dunks under it and
 * bobs it up again — and so to the second, and the third, and up onto the
 * far deck: stepping stones that give. Each float rings down on its own
 * after the ball has gone, a ring spreading on the water from each. No
 * mechanism; the rhythm is the beat.
 *
 * The ball rides each float: while it is on one its lane is sampled from
 * the same dunk the float is drawn with.
 */
const WEST = -0.16
const EAST = 1.16
/** The floats: where they ride, how big, and how deep the ball's weight takes them. */
const XS = [0.12, 0.5, 0.88]
const FY = 0.335
const FR = 0.12
const DUNK = 0.07
/** On a float this long, rolling this far over its top; then a hop this long to the next. */
const CONTACT = 0.13
const SHIFT = 0.05
const HOP = 0.18
const LOFT = 0.13
/** Off the deck's end it only falls, keeping the pace it had: a short drop onto the first float. */
const FIRST = 0.085
const DROP = 0.021

/** When the ball is off the deck's end, and when it lands on each float. */
const T0 = (WEST + 0.5) / ROLL
const LANDS = XS.map((_, i) => T0 + FIRST + i * (CONTACT + HOP))

/** How far under its rest float `i` is: idling on the swell, dunked under the ball, ringing down after. */
function dunkAt(i: number, t: number): number {
  const idle = 0.006 * Math.sin(t * 1.8 + i * 2.1)
  const tau = t - LANDS[i]
  if (tau < 0) return idle
  if (tau < CONTACT) return idle + DUNK * Math.sin((Math.PI * tau) / CONTACT)
  const s = tau - CONTACT
  return idle - 0.04 * Math.exp(-s * 3.2) * Math.sin(s * 15)
}
/** The ball on float `i`: a radius and the float's off its centre, rolling a little way over the top. */
const onFloat = (i: number) => (t: number): Pt => {
  const u = -SHIFT + 2 * SHIFT * over(t, LANDS[i], LANDS[i] + CONTACT)
  return [XS[i] + u, FY + dunkAt(i, t) - Math.sqrt((FR + R) * (FR + R) - u * u)]
}

const SEGS: Seg[] = (() => {
  const segs: Seg[] = [roll([-0.5, 0], [WEST, 0], ROLL)]
  let from: Pt = [WEST, 0]
  XS.forEach((_, i) => {
    const ride = trace(onFloat(i), LANDS[i], LANDS[i] + CONTACT, 8)
    // Off the deck the ball only falls; off a float it is thrown up.
    segs.push(fly(from, ride[0].from, i === 0 ? FIRST : HOP, i === 0 ? DROP : LOFT), ...ride)
    from = ride[ride.length - 1].to
  })
  const land: Pt = [EAST + 0.06, 0]
  segs.push(fly(from, land, HOP + 0.02, LOFT), fly(land, [land[0] + 0.07, 0], 0.05, 0.012), ramp([land[0] + 0.07, 0], [1.5, 0], 1.7, ROLL))
  return segs
})()
const LANE: Lane = { segs: SEGS, fire: LANDS[1] }

export const floats = definePiece<{ color: string }>({
  name: 'floats',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, weight, theme }) => {
    // The floats' colours: the piece's own first, then round the palette.
    const at = Math.max(0, theme.colors.indexOf(s.color))
    const ys = XS.map((_, i) => FY + dunkAt(i, t))

    rail(p, k, ink, weight, -0.5, WEST)
    rail(p, k, ink, weight, EAST, 1.5)
    piling(p, k, ink, weight, WEST - 0.05)
    piling(p, k, ink, weight, EAST + 0.05)
    // The line: made fast to the pilings, bent to each float's shoulders, slack between them and following them down.
    const H = FR * 0.72
    const knots: Pt[] = [[WEST - 0.05, FLOOR + 0.075], ...XS.map((x, i): Pt => [x, ys[i] - H]), [EAST + 0.05, FLOOR + 0.075]]
    for (let i = 1; i < knots.length; i++) {
      const a = knots[i - 1]
      const b = knots[i]
      rope(p, k, ink, weight, a[0] + (i > 1 ? H : 0), a[1], b[0] - (i < knots.length - 1 ? H : 0), b[1], 0.07)
    }
    // The floats: balls of cork, one colour each.
    XS.forEach((x, i) => {
      solid(p, ink, weight, theme.colors[(at + i * 2) % theme.colors.length])
      p.circle(x * k, ys[i] * k, FR * 2 * k)
    })
    // The water goes in front of them, so they sit in it and not on it.
    water(p, k, ink, weight, -0.5, 1.5)
    XS.forEach((x, i) => splash(p, k, seaWater(theme), weight, x, FY + 0.04, over(t, LANDS[i] + 0.02, LANDS[i] + 0.55), 0.75))
  },
})
