import { solid } from '../../../../../../src/core/draw'
import { clamp, easeOutQuad } from '../../../../../../src/core/ease'
import { R, ROLL, definePiece, laneReach, rail, ramp, roll, type Lane, type Pt, type Seg } from '../../../parts'
import { otherColor, sprung } from './parts-c'
import { gearColor, powder, snow, snowAt, snowWhite } from './snow'

/**
 * Three slalom poles planted in the snow beside the track, each on a
 * sprung hinge at the snow's surface and standing across the ball's way, a
 * flag at its head. The ball shoulders the first: it slaps flat along the
 * snow ahead of the ball, which rolls on over it, a touch slower for the
 * knock, into the second, and the third. A pole stays down while the ball
 * is within its reach and whips upright again the moment it is past, over
 * the top and back, quivering; so the poles come up behind the ball one by
 * one, each after the next has gone down.
 *
 * A pole is one angle about its hinge, from the time the ball struck it.
 * It goes down faster than the ball comes on, and is let up only when the
 * ball is further from the hinge than the pole is long, so neither ever
 * touches the other but at the knock.
 */
/** The hinges, and a pole's length and half its thickness. */
const POLES = [-0.26, 0.24, 0.74]
const LEN = 0.72
const HALF = 0.018
/** Flat is not quite flat: the pole lies on the snow, a little proud of its hinge. */
const DOWN = 1.52
/** How long a pole takes to slap down, and how far past it the ball is when it is let up. */
const SLAP = 0.1
const hinge = (x: number): number => snowAt(x) - 0.005
const REACH = (x: number): number => Math.sqrt((LEN + R + 0.03) ** 2 - hinge(x) ** 2)
/** What a knock takes off the ball's pace, and how far on it has it back. */
const KNOCKED = 1.9
const DENT = 0.06
const MEND = 0.26

const LANE: Lane = (() => {
  const segs: Seg[] = []
  let x = -0.5
  for (const px of POLES) {
    const hit = px - HALF - R
    segs.push(roll([x, 0], [hit, 0], ROLL), ramp([hit, 0], [hit + DENT, 0], ROLL, KNOCKED), ramp([hit + DENT, 0], [hit + MEND, 0], KNOCKED, ROLL))
    x = hit + MEND
  }
  segs.push(roll([x, 0], [1.5, 0], ROLL))
  return { segs, fire: (POLES[0] - HALF - R + 0.5) / ROLL }
})()
/** When each pole is struck, and when it is let up: for the last, after the ball has left the piece. */
const STRUCK = POLES.map((px) => laneReach(LANE, px - HALF - R))
const LET_UP = POLES.map((px) => {
  const at = px + REACH(px)
  return laneReach(LANE, Math.min(at, 1.5)) + Math.max(0, at - 1.5) / ROLL
})

/** A pole's angle from upright, toward the way the ball is going, `t` seconds into the piece. */
function poleAt(i: number, t: number): number {
  const down = t - STRUCK[i]
  if (down < 0) return 0
  const up = t - LET_UP[i]
  if (up >= 0) return sprung(up, DOWN, 0, 17, 6.5)
  if (down < SLAP) return DOWN * easeOutQuad(down / SLAP)
  // A bounce off the snow, once.
  return DOWN - 0.13 * Math.sin(Math.PI * clamp((down - SLAP) / 0.14))
}

export const slalom = definePiece<{ colors: string[]; white: string }>({
  name: 'slalom',
  weight: 1,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // Gates go by turns in two colours, neither of them the snow's or the ball's.
    const first = gearColor(theme, color, ball.color)
    const second = otherColor(theme, first, ball.color)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { colors: [first, second, first], white: snowWhite(theme) } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    snow(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, 1.5)
    POLES.forEach((px, i) => {
      const a = poleAt(i, t)
      const hy = hinge(px)
      // Powder where the pole's head slaps the snow.
      const tip = px + LEN * Math.sin(DOWN)
      powder(p, k, ink, weight, s.white, tip - 0.06, snowAt(tip) - 0.01, clamp((t - STRUCK[i] - SLAP) / 0.32), 0.55)
      // How fast it is turning: the flag trails behind the pole's swing.
      const turning = (poleAt(i, t + 0.004) - poleAt(i, t - 0.004)) / 0.008
      const trail = clamp(Math.abs(turning) * 0.005, 0, 0.07)
      p.push()
      p.translate(px * k, hy * k)
      // The hinge: a stub in the snow.
      p.noStroke()
      p.fill(ink)
      p.rect(0, 0.015 * k, 0.06 * k, 0.05 * k, 0.01 * k)
      p.rotate(a)
      solid(p, ink, weight, s.colors[i])
      p.rect(0, (-LEN / 2) * k, HALF * 2 * k, LEN * k, HALF * k)
      // The flag at its head, on the side the ball comes from, so it stands up off a pole lying flat.
      p.beginShape()
      p.vertex(-HALF * k, (-LEN + 0.04) * k)
      p.vertex(-(HALF + 0.13) * k, (-LEN + 0.06 + trail) * k)
      p.vertex(-(HALF + 0.13) * k, (-LEN + 0.16 + trail) * k)
      p.vertex(-HALF * k, (-LEN + 0.18) * k)
      p.endShape(p.CLOSE)
      p.pop()
    })
  },
})
