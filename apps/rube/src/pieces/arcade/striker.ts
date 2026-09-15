import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { glow, lamp, score, tube } from './neon'

/**
 * A high striker. The lane runs onto the puck at the foot of the tower;
 * the ball's weight sinks it onto the spring and trips the latch — and the
 * spring fires the puck up the tower with the ball riding it, lighting
 * every level it passes, one or two floors, to the bell at the top. Ding.
 * The puck latches there, cants toward the rail, and the ball rolls off
 * onto it, on or back the way it came. The tower stays lit to the top, for
 * a while.
 *
 * The ball sits on the puck the whole way: the same sink, the same
 * easing up the slot, so neither runs ahead of the other.
 */
export interface StrikerState {
  color: string
  floors: number
  turn: 1 | -1
}

const TOWER = 0.24
const ARRIVE = arriveAt(0)
/** How far the puck sinks under the ball's weight, and how long that takes. */
const SINK_D = 0.04
const SINK_T = 0.15
const SINK = 0.3
const FIRE_LATCH = ARRIVE + SINK
const shootTime = (floors: number) => 0.3 + 0.18 * floors
const DING = 0.25
/** The puck's cant at the top, radians toward the rail, and how long after the ding it takes. */
const CANT = 0.12
const CANT_AT = DING - 0.1

/** Where the puck's top is (the ball's centre line), `t` seconds in, for a tower of `floors`. */
function puckAt(t: number, floors: number): number {
  const launched = t - FIRE_LATCH
  if (launched < 0) return t < ARRIVE ? 0 : SINK_D * easeOutQuad(Math.min(1, (t - ARRIVE) / SINK_T))
  return SINK_D + (-floors - SINK_D) * easeOutQuad(Math.min(1, launched / shootTime(floors)))
}

export const striker = definePiece<StrikerState>({
  name: 'striker',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const shoot = shootTime(floors)
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [0, 0]),
          { from: [0, 0], to: [0, SINK_D], dur: SINK_T, ease: 'out' },
          wait([0, SINK_D], SINK - SINK_T),
          { from: [0, SINK_D], to: [0, -floors], dur: shoot, ease: 'out' },
          wait([0, -floors], DING),
          ramp([0, -floors], [turn * 0.5, -floors], 0, ROLL),
        ],
        fire: FIRE_LATCH + shoot,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const top = -floors
    const launched = t - FIRE_LATCH
    // The puck: sinks under the ball, shoots up, latches at the top and cants.
    const puckY = puckAt(t, floors)
    const cant = since < CANT_AT ? 0 : turn * CANT * easeOutCubic(over(since, CANT_AT, CANT_AT + 0.1))
    const ding = since < 0 ? 0 : Math.exp(-since * 2.5)
    const rock = since < 0 ? 0 : 0.14 * Math.sin(since * 26) * Math.exp(-since * 4)

    rail(p, k, ink, weight, -0.5, -TOWER)
    rail(p, k, ink, weight, turn * TOWER, turn * 0.5, top + FLOOR)
    // The tower: a tall board on a base, the slot the puck rides up its middle.
    solid(p, ink, weight, s.color)
    p.rect(0, ((0.5 + top - 0.55) / 2) * k, TOWER * 2 * k, (0.5 - top + 0.55) * k, 0.03 * k)
    p.rect(0, 0.46 * k, (TOWER * 2 + 0.2) * k, 0.08 * k)
    solid(p, ink, weight, ink)
    p.rect(0, ((FLOOR + top - 0.2) / 2) * k, 0.08 * k, (FLOOR - top + 0.2) * k)
    // The levels: a lamp and a tube each side every so far up, lit as the puck passes and the tower fills.
    const levels = 3 + 3 * floors
    for (let i = 0; i < levels; i++) {
      const ly = FLOOR - 0.15 - ((FLOOR - 0.15 - (top - 0.25)) * i) / (levels - 1)
      const reached = puckY <= ly + 0.02 && launched > 0
      const on = reached ? 1 - over(since, 1.5, 3) : 0
      tube(p, k, ink, weight, s.color, -TOWER + 0.03, ly, -0.08, ly, on)
      tube(p, k, ink, weight, s.color, 0.08, ly, TOWER - 0.03, ly, on)
    }
    // The spring at the foot, and the latch.
    outline(p, ink, weight)
    p.beginShape()
    for (let i = 0; i <= 8; i++) p.vertex((i % 2 ? 0.05 : -0.05) * (i === 0 || i === 8 ? 0 : 1) * k, (0.44 - (0.44 - (puckY + FLOOR + 0.06)) * (i / 8)) * k)
    p.endShape()
    p.push()
    p.translate((TOWER + 0.04) * k, (FLOOR + 0.1) * k)
    p.rotate(launched > 0 ? 0.8 : 0)
    p.line(0, 0, -0.1 * k, 0)
    p.pop()
    // The puck the ball rides, canting toward the rail once it has latched.
    p.push()
    p.translate(0, (puckY + FLOOR + 0.03) * k)
    p.rotate(cant)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, 0.3 * k, 0.06 * k, 0.01 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, -0.01 * k, 0.06 * k, 0.03 * k)
    p.pop()
    // The bell at the top, in a hood, rocking on the ding.
    glow(p, k, s.color, 0, top - 0.32, 0.22, ding)
    solid(p, ink, weight, s.color)
    p.arc(0, (top - 0.42) * k, 0.4 * k, 0.3 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.push()
    p.translate(0, (top - 0.42) * k)
    p.rotate(rock)
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-0.08 * k, 0.16 * k)
    p.bezierVertex(-0.08 * k, 0, -0.04 * k, 0, 0, 0)
    p.bezierVertex(0.04 * k, 0, 0.08 * k, 0, 0.08 * k, 0.16 * k)
    p.endShape(p.CLOSE)
    p.line(-0.08 * k, 0.16 * k, 0.08 * k, 0.16 * k)
    p.pop()
    if (ding > 0.05) {
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * ding)
      for (let i = 1; i <= 2; i++) p.circle(0, (top - 0.34) * k, (0.3 + i * 0.16 + (1 - ding) * 0.3) * k)
      p.pop()
    }
    lamp(p, k, ink, weight, s.color, bg, 0, top - 0.6, 0.04, ding)
    score(p, k, s.color, 0, top - 0.7, '+1000', since, 1.2)
  },
})
