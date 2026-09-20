import { outline, solid } from '../../../../../../src/core/draw'
import { R, ROLL, definePiece, laneAt, laneReach, post, ramp, roll, type Lane, type Pt } from '../../../parts'
import { feltColor, stage, string } from './hall'
import { brassFor, partColor, rod } from './parts-a'

/**
 * A harp, two cells wide and two tall, and the ball plays a glissando on
 * it. Its soundbox lies along the line and is the ball's road; the pillar
 * stands at the near end, the neck sweeps down from the pillar's head to
 * the far end in the harp's own curve, and nine strings stand between the
 * neck and the box, the longest by the pillar and each one shorter than
 * the last. The ball rolls along the box through them. Its front takes
 * each string a little way along with it, bending it at the foot, until the
 * string slips round the ball and springs back, sounding: a blur that
 * narrows to a line again, quickly for the short strings and slowly for the
 * long. So the harp rings in a wave behind the ball, low to high, and the
 * ball leaves a touch slower for the nine it plucked.
 *
 * The pillar and the neck's foot stand behind the line; only the strings
 * are in the ball's way.
 */
/** The soundbox: the ball's road from `BOX[0]` to `BOX[1]`, deep at the pillar and shallow at the far end. */
const BOX: [number, number] = [-0.4, 1.4]
const DEEP = 0.2
const SHALLOW = 0.09
/** The pillar, and the neck from its head down to the box's far end: a cubic, the harmonic curve. */
const PILLAR = -0.33
const HEAD: Pt = [PILLAR, -1.22]
const NECK: [Pt, Pt, Pt, Pt] = [HEAD, [0, -1.6], [0.5, -0.7], [1.36, 0.05]]
/** The strings: where the first stands, the pitch, and how many. */
const S0 = -0.15
const PITCH = 0.14
const N = 9
/** How far the ball takes a string with it before it slips, and how much of the ball's radius leads. */
const PULL = 0.075
const LEAD = R * 0.9
/** The pace the nine strings bring it down to. */
const SLOWED = ROLL * 0.78

const FOOT = R
const stringX = (i: number) => S0 + PITCH * i
const bez = (u: number): Pt => {
  const v = 1 - u
  return [0, 1].map((j) => v * v * v * NECK[0][j] + 3 * v * v * u * NECK[1][j] + 3 * v * u * u * NECK[2][j] + u * u * u * NECK[3][j]) as Pt
}
/** The neck's height over `x`. The curve runs steadily east, so a bisection finds it. */
function neckOver(x: number): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (bez(mid)[0] < x) lo = mid
    else hi = mid
  }
  return bez((lo + hi) / 2)[1]
}
const TOPS = Array.from({ length: N }, (_, i) => neckOver(stringX(i)) + 0.02)
const NECK_PTS: Pt[] = Array.from({ length: 33 }, (_, i) => bez(i / 32))

const FIRST = stringX(0) - LEAD
const LAST = stringX(N - 1) + PULL - LEAD
const LANE: Lane = {
  segs: [roll([-0.5, 0], [FIRST, 0], ROLL), ramp([FIRST, 0], [LAST, 0], ROLL, SLOWED), ramp([LAST, 0], [1.5, 0], SLOWED, ROLL)],
  fire: 0,
}
LANE.fire = laneReach(LANE, stringX(0) + PULL - LEAD)
/** When each string slips the ball. */
const FREED = Array.from({ length: N }, (_, i) => laneReach(LANE, stringX(i) + PULL - LEAD))

export const harp = definePiece<{ frame: string; box: string }>({
  name: 'harp',
  weight: 1,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    // A gilt frame, whatever the map hands the piece, and the box in the map's colour; neither is ever the ball's.
    const frame = brassFor(theme, ball.color)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { frame, box: partColor(theme, feltColor(theme, color, ball.color), ball.color, frame) } }
  },
  draw: (p, s, { k, ink, weight }) => {
    stage(p, k, ink, weight, -0.5, BOX[0])
    stage(p, k, ink, weight, BOX[1], 1.5)

    // The pillar and the neck, behind the line: one gilt frame, with a crown on the pillar's head.
    rod(p, k, ink, weight, s.frame, [[PILLAR, FOOT + 0.04], HEAD, ...NECK_PTS.slice(1)], 0.075)
    solid(p, ink, weight, s.frame)
    p.circle(HEAD[0] * k, (HEAD[1] - 0.02) * k, 0.15 * k)

    // The soundbox on its two feet: the ball's road.
    post(p, k, ink, weight, BOX[0] + 0.22, FOOT + DEEP - 0.03, 0.5)
    post(p, k, ink, weight, BOX[1] - 0.22, FOOT + SHALLOW + 0.01, 0.5)
    solid(p, ink, weight, s.box)
    p.beginShape()
    p.vertex(BOX[0] * k, FOOT * k)
    p.vertex(BOX[1] * k, FOOT * k)
    p.vertex(BOX[1] * k, (FOOT + SHALLOW) * k)
    p.vertex(BOX[0] * k, (FOOT + DEEP) * k)
    p.endShape(p.CLOSE)
  },
  over: (p, _s, { k, t, ink, weight }) => {
    // The strings, in front of the ball: standing, taken along by its front, or sounding.
    const front = laneAt(LANE, t).x + LEAD
    for (let i = 0; i < N; i++) {
      const x = stringX(i)
      const top = TOPS[i]
      if (t < FREED[i] && front > x) {
        // Bent at the ball: two straight parts, from the neck to the ball's front and from there to its foot.
        outline(p, ink, weight * 0.7)
        p.line(x * k, top * k, front * k, 0)
        p.line(front * k, 0, x * k, FOOT * k)
        continue
      }
      const rung = t - FREED[i]
      const amp = rung < 0 ? 0 : 0.032 * Math.exp(-rung * (1.5 + 0.22 * i))
      string(p, k, ink, weight, x, top, x, FOOT, amp, rung * (26 + 3 * i))
    }
  },
})
