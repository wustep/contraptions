import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A counterweight lift. The ball rolls into the cage at the bottom; a pawl
 * lets the weight go; the weight falls, the cage rises one, two or three
 * floors, and the ball rolls out at the top — on, or back the way it came.
 * Later the winch lowers the cage again and hauls the weight up, for no
 * one.
 */
export interface LiftState {
  color: string
  floors: number
  turn: 1 | -1
}

const GUIDE = 0.17
const CAR_W = 0.38
const CAR_H = 0.34
const CW_X = 0.33
const ARRIVE = 0.5 / ROLL
const LATCH = 0.4
const RIDE_PER = 0.5
const SETTLE = 0.3

const rideTime = (floors: number) => 0.4 + floors * RIDE_PER

export const lift = definePiece<LiftState>({
  name: 'lift',
  weight: 1.1,
  place: ({ rng, color, fits, taste }) => {
    const options = rng.shuffle([1, 2, 3].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    const tall = taste.weights['lift-tall'] ?? 1
    const pool = [...options]
    const ordered: typeof options = []
    while (pool.length) {
      const pick = rng.weighted(pool, (o) => Math.pow(tall, o.floors - 1))
      ordered.push(pick)
      pool.splice(pool.indexOf(pick), 1)
    }
    for (const { floors, turn } of ordered) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const ride = rideTime(floors)
      const lane: Lane = {
        segs: [
          roll([-0.5, 0], [0, 0], ROLL, 'out'),
          wait([0, 0], LATCH),
          { from: [0, 0], to: [0, -floors], dur: ride, ease: 'inout' },
          wait([0, -floors], SETTLE),
          roll([0, -floors], [turn * 0.5, -floors], ROLL, 'in'),
        ],
        fire: ARRIVE + LATCH,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, since, ink, weight }) => {
    const { floors, turn } = s
    const ride = rideTime(floors)
    const top = -floors
    // How far up the cage is, in floors: rises with the ball, holds, then is
    // lowered again a while later.
    const up =
      since < 0 ? 0
      : since < ride ? easeInOutSine(over(since, 0, ride))
      : 1 - easeInOutSine(over(since, ride + 2.2, ride + 5))
    const carY = up * top
    const sheaveY = top - 0.42

    // The guides, from the sheave bracket to the buffers at the bottom.
    outline(p, ink, weight)
    for (const x of [-GUIDE, GUIDE]) p.line(x * k, (sheaveY + 0.06) * k, x * k, 0.5 * k)
    for (let y = 0.3; y > sheaveY + 0.2; y -= 0.24) {
      for (const x of [-GUIDE, GUIDE]) p.line(x * k, y * k, (x + Math.sign(x) * 0.06) * k, y * k)
    }
    // The ground under the guides, and the buffers on it.
    p.line((-GUIDE - 0.06) * k, 0.5 * k, (CW_X + 0.14) * k, 0.5 * k)
    for (const x of [-0.07, 0.07]) p.line(x * k, 0.44 * k, x * k, 0.5 * k)
    p.line(-0.1 * k, 0.44 * k, 0.1 * k, 0.44 * k)
    // The sheave and its bracket.
    p.line(-GUIDE * k, (sheaveY + 0.06) * k, (CW_X + 0.08) * k, (sheaveY + 0.06) * k)
    p.line((CW_X + 0.08) * k, (sheaveY + 0.06) * k, (CW_X + 0.08) * k, 0.5 * k)
    // The cable: over the sheave, down to the cage on one side, to the weight on the other.
    p.line(-0.08 * k, sheaveY * k, -0.08 * k, (carY - CAR_H + FLOOR) * k)
    const weightY = lerp(sheaveY + 0.28, -0.05, up)
    p.line(CW_X * k, sheaveY * k, CW_X * k, (weightY - 0.1) * k)
    solid(p, ink, weight, s.color)
    p.circle(-0.0 * k, sheaveY * k, 0.16 * k)
    p.push()
    p.translate(0, sheaveY * k)
    p.rotate(-up * floors * 6)
    outline(p, ink, weight)
    p.line(-0.05 * k, 0, 0.05 * k, 0)
    p.line(0, -0.05 * k, 0, 0.05 * k)
    p.pop()
    // The pawl that holds the weight, flipped open at the fire.
    const pawl = since < 0 ? 0 : since < 0.12 ? easeInQuad(over(since, 0, 0.12)) : 1 - over(since, ride + 4.6, ride + 5)
    p.push()
    p.translate((CW_X + 0.08) * k, (sheaveY + 0.32) * k)
    p.rotate(pawl * 0.8)
    outline(p, ink, weight)
    p.line(0, 0, -0.1 * k, 0)
    p.pop()
    // The counterweight.
    solid(p, ink, weight, s.color)
    p.rect(CW_X * k, weightY * k, 0.14 * k, 0.2 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(CW_X * k, (weightY - 0.05) * k, 0.14 * k, 0.03 * k)

    // The landings: rail into the cage at the bottom, out of it at the top.
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, -GUIDE * k, FLOOR * k)
    p.line((turn * 0.5) * k, (top + FLOOR) * k, (turn * GUIDE) * k, (top + FLOOR) * k)

    // The cage: floor, back wall, roof, and an ink slab so it reads at rest.
    const cy = carY
    outline(p, ink, weight)
    p.line((-CAR_W / 2) * k, (cy + FLOOR) * k, (CAR_W / 2) * k, (cy + FLOOR) * k)
    p.line((-CAR_W / 2) * k, (cy + FLOOR) * k, (-CAR_W / 2) * k, (cy - CAR_H + FLOOR) * k)
    p.line((CAR_W / 2) * k, (cy + FLOOR) * k, (CAR_W / 2) * k, (cy - CAR_H + FLOOR) * k)
    p.line((-CAR_W / 2) * k, (cy - CAR_H + FLOOR) * k, (CAR_W / 2) * k, (cy - CAR_H + FLOOR) * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, (cy + FLOOR + 0.03) * k, CAR_W * k, 0.06 * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (cy - CAR_H + FLOOR - 0.03) * k, (CAR_W + 0.06) * k, 0.06 * k)
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The cage's front rail sits between the viewer and the ball.
    const ride = rideTime(s.floors)
    const up =
      since < 0 ? 0
      : since < ride ? easeInOutSine(over(since, 0, ride))
      : 1 - easeInOutSine(over(since, ride + 2.2, ride + 5))
    const cy = up * -s.floors
    outline(p, ink, weight)
    p.line((-CAR_W / 2) * k, (cy - R * 0.4) * k, (CAR_W / 2) * k, (cy - R * 0.4) * k)
  },
})
