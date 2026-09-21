import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutBack } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, laneReach, post, trace, type Lane, type Pt } from '../../../parts'
import { stage } from './hall'
import { brassFor, ivoryFor } from './parts-a'

/**
 * A flute laid across a gap as a bridge, in two crutches, and the ball
 * rolls along the top of it. Eight tone holes are cut along its top and a
 * padded key stands open over each one, tipped up on its hinge with its
 * back to the ball: a hole to stumble in and a lid in the way, eight times
 * over. But a flute's keys are coupled. The ball rolls over the lip plate
 * and the first key snaps shut over its hole; it rolls onto that key, and
 * the touch closes the next one; and so on down the flute, each key shut
 * just before the ball gets to it, and each springing open again behind it
 * once the ball is off it and on the one after. The ball never stops.
 */
/** The tube: its two ends, how thick it is, and where its joints are. */
const X0 = -0.42
const X1 = 2.42
const TUBE = 0.1
const JOINTS = [0.16, 2.24]
/** The lip plate, which works the first key. */
const LIP = -0.1
/** The keys: the first one's middle, the pitch, how many, and how long a cup is. */
const K0 = 0.42
const PITCH = 0.32
const N = 6
const CUP = 0.25
/** How thick a cup is, and how far its top stands over the tube's when it is shut: the ball's road along the keys is that much higher. */
const THICK = 0.065
const LIFT = 0.04
/** How far a key stands open, and how wide the hole under it is. */
const OPEN = 0.95
const HOLE = 0.13
/** A key starts to shut when the ball is this far short of its middle; it takes this long; and this long to spring open. */
const AHEAD = 0.52
const SHUT = 0.08
const SPRING = 0.22
/** The ball is off a key, and onto the next, this far past its middle. */
const OFF = PITCH / 2 + 0.02

const middle = (i: number) => K0 + PITCH * i

/** The ball's line: on the tube along the head and the foot, on the shut keys between, up and down a cup's lip at either end. */
const RISE: [number, number] = [middle(0) - CUP / 2 - 0.1, middle(0) - CUP / 2 + 0.02]
const FALL: [number, number] = [middle(N - 1) + CUP / 2 - 0.02, middle(N - 1) + CUP / 2 + 0.1]
const road = (x: number): number => -LIFT * (easeInOutSine(clamp((x - RISE[0]) / (RISE[1] - RISE[0]))) - easeInOutSine(clamp((x - FALL[0]) / (FALL[1] - FALL[0]))))
const at = (t: number): Pt => {
  const x = -0.5 + ROLL * t
  return [x, road(x)]
}
const LANE: Lane = { segs: trace(at, 0, 3 / ROLL, 72), fire: 0 }
LANE.fire = laneReach(LANE, middle(0) - AHEAD)
const shutAt = (i: number) => laneReach(LANE, middle(i) - AHEAD)
const openAt = (i: number) => laneReach(LANE, middle(i) + OFF)

/** How far open key `i` stands at piece time `t`: 1 open, 0 shut. */
function openOf(i: number, t: number): number {
  if (t < shutAt(i)) return 1
  if (t < openAt(i)) return 1 - easeInQuad(clamp((t - shutAt(i)) / SHUT))
  return easeOutBack(clamp((t - openAt(i)) / SPRING))
}

export const flute = definePiece<{ tube: string; cup: string }>({
  name: 'flute',
  weight: 0.9,
  place: ({ fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    // A silver flute with gold keys, whatever the map hands the piece; neither is ever the ball's colour.
    const tube = ivoryFor(theme, ball.color)
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { tube, cup: brassFor(theme, ball.color, tube) } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const top = FLOOR
    const mid = top + TUBE / 2

    // The stage stops either side of the gap; the flute lies across it in two crutches on posts.
    stage(p, k, ink, weight, -0.5, X0)
    stage(p, k, ink, weight, X1, 2.5)
    for (const x of [0.0, 2.0]) {
      post(p, k, ink, weight, x, top + TUBE + 0.06, 0.5)
      outline(p, ink, weight)
      p.arc(x * k, (mid + 0.01) * k, (TUBE + 0.1) * k, (TUBE + 0.1) * k, 0.15, Math.PI - 0.15)
    }

    // The tube, its crown to the west, and the two joints across it.
    solid(p, ink, weight, s.tube)
    p.rect(((X0 + X1) / 2) * k, mid * k, (X1 - X0) * k, TUBE * k, (TUBE / 2) * k)
    outline(p, ink, weight * 0.8)
    for (const x of JOINTS) p.line(x * k, top * k, x * k, (top + TUBE) * k)

    // The lip plate: a low pad on the head, which the ball rolls over.
    solid(p, ink, weight * 0.6, s.cup)
    p.rect(LIP * k, (top + 0.015) * k, 0.22 * k, 0.05 * k, 0.025 * k)

    // The rod the keys turn on, along the tube's side under them.
    outline(p, ink, weight * 0.7)
    p.line((middle(0) - 0.16) * k, (top + TUBE * 0.62) * k, (middle(N - 1) + 0.16) * k, (top + TUBE * 0.62) * k)

    // The holes, where a key stands open over one: a bite out of the tube's top line.
    for (let i = 0; i < N; i++) {
      if (openOf(i, t) < 0.2) continue
      p.noStroke()
      p.fill(ink)
      p.rect(middle(i) * k, (top + 0.015) * k, HOLE * k, 0.035 * k, 0.01 * k)
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The keys: each a padded cup on an arm hinged at its far end, standing open or lying shut over its hole.
    for (let i = 0; i < N; i++) {
      const a = OPEN * openOf(i, t)
      p.push()
      p.translate((middle(i) + CUP / 2) * k, (FLOOR - LIFT + THICK / 2) * k)
      p.rotate(a)
      solid(p, ink, weight * 0.6, s.cup)
      p.rect((-CUP / 2) * k, 0, CUP * k, THICK * k, (THICK / 2) * k)
      p.pop()
    }
  },
})
