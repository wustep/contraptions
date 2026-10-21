import type p5 from 'p5'
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
 * the last. The ball rolls along the box through them. Each string it
 * meets lies round its front and is carried a little way along with it,
 * until the string slips round the ball and springs back behind it,
 * sounding: a blur that narrows to a line again, quickly for the short
 * strings and slowly for the long. So the harp rings in a wave behind the
 * ball, low to high, and the ball leaves a touch slower for the nine it
 * plucked.
 *
 * The pillar and the neck's foot stand behind the line; only the strings
 * are in the ball's way, and a string the ball has let go of is behind it.
 */
/** The soundbox: the ball's road from `BOX[0]` to `BOX[1]`, deep at the pillar and shallow at the far end. */
const BOX: [number, number] = [-0.4, 1.4]
const DEEP = 0.2
const SHALLOW = 0.09
/** The pillar, and the neck from its head down to the box's far end: a cubic, the harmonic curve. */
const PILLAR = -0.33
const HEAD: Pt = [PILLAR, -1.22]
const NECK: [Pt, Pt, Pt, Pt] = [HEAD, [0, -1.6], [0.5, -0.7], [1.36, 0.05]]
/** The frame's gilt, between its two ink edges. */
const GILT = 0.075
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
/** The neck's middle over each string, and how much further down its underside is for the neck's slope there. */
const NECK_Y = Array.from({ length: N }, (_, i) => neckOver(stringX(i)))
const SLOPE = Array.from({ length: N }, (_, i) => Math.hypot(1, (neckOver(stringX(i) + 0.01) - neckOver(stringX(i) - 0.01)) / 0.02))
const NECK_PTS: Pt[] = Array.from({ length: 33 }, (_, i) => bez(i / 32))

/** Where a line from `from` meets the ball's rim square, on its front: an angle about the ball's middle. */
function touch([fx, fy]: Pt, [cx, cy]: Pt): number {
  const away = Math.atan2(fy - cy, fx - cx)
  const off = Math.acos(Math.min(1, R / Math.hypot(fx - cx, fy - cy)))
  return Math.cos(away + off) > Math.cos(away - off) ? away + off : away - off
}

/** A string from `top` to `foot` lying round the front of the ball at `c`: down to its rim, round it, and on down to the foot. */
function draped(p: p5, k: number, top: Pt, foot: Pt, c: Pt): void {
  const a0 = touch(top, c)
  const a1 = touch(foot, c)
  const rim = (a: number): Pt => [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)]
  const [x0, y0] = rim(a0)
  const [x1, y1] = rim(a1)
  p.noFill()
  p.line(top[0] * k, top[1] * k, x0 * k, y0 * k)
  if (a1 > a0) p.arc(c[0] * k, c[1] * k, 2 * R * k, 2 * R * k, a0, a1)
  p.line(x1 * k, y1 * k, foot[0] * k, foot[1] * k)
}

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
  draw: (p, s, { k, t, ink, weight }) => {
    stage(p, k, ink, weight, -0.5, BOX[0])
    stage(p, k, ink, weight, BOX[1], 1.5)

    // The pillar and the neck, behind the line: one gilt frame, with a crown on the pillar's head.
    rod(p, k, ink, weight, s.frame, [[PILLAR, FOOT + 0.04], HEAD, ...NECK_PTS.slice(1)], GILT)
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

    // The strings, from the neck's underside to the box: standing, lying round the ball's front, or sounding.
    const at = laneAt(LANE, t)
    const under = GILT / 2 + weight / (2 * k)
    for (let i = 0; i < N; i++) {
      const x = stringX(i)
      const top = NECK_Y[i] + under * SLOPE[i]
      if (t < FREED[i] && at.x + R > x) {
        outline(p, ink, weight * 0.7)
        draped(p, k, [x, top], [x, FOOT], [at.x, at.y])
        continue
      }
      const rung = t - FREED[i]
      const amp = rung < 0 ? 0 : 0.032 * Math.exp(-rung * (1.5 + 0.22 * i))
      string(p, k, ink, weight, x, top, x, FOOT, amp, rung * (26 + 3 * i))
    }
  },
})
