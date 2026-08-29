import { defineContraption } from '../../core/define'
import { outline, solid, teeth } from '../../core/draw'
import { mod } from '../../core/ease'
import { P, block, drop, flight, ground, performer, route, stroke, type Leg } from './circus'

/**
 * Buckets on a chain scoop the performers off the floor one at a time, carry
 * them up the left side, and tip them out over the top into the chute; the
 * chute drops them down the right side onto the floor, where they roll back
 * to the foot of the lift and wait for the next bucket.
 */
const CHAIN_X = 0.16
/** A bucket goes over the top upside down, so the sprockets have to sit a
 *  bucket's depth in from the ends of the footprint. */
const SPROCKET = 0.62
const BUCKETS = 6
/** Loop time on the chain from the scoop at the bottom to the spill at the top. */
const RIDE_END = (2 * SPROCKET + (Math.PI * CHAIN_X) / 2) / (4 * SPROCKET + 2 * Math.PI * CHAIN_X)
const HOP = 0.04
const CHUTE = 0.14
const ROLL = 0.1
/** A performer's cycle: ride, hop, chute, roll, then wait for a bucket. */
const CYCLE = Math.ceil((RIDE_END + HOP + CHUTE + ROLL) * BUCKETS) / BUCKETS
const RIDERS = Math.round(CYCLE * BUCKETS)
const CHUTE_X = 0.4
const FLOOR = 0.92

/** The chain as a route: up the left, over the top, down the right, round the bottom. */
const chain = (() => {
  const legs: Leg[] = [{ from: [-CHAIN_X, SPROCKET], to: [-CHAIN_X, -SPROCKET], v: 1 }]
  const arc = (cy: number, from: number, to: number) => {
    const n = 8
    for (let i = 0; i < n; i++) {
      const a0 = from + ((to - from) * i) / n
      const a1 = from + ((to - from) * (i + 1)) / n
      legs.push({ from: [CHAIN_X * Math.cos(a0), cy + CHAIN_X * Math.sin(a0)], to: [CHAIN_X * Math.cos(a1), cy + CHAIN_X * Math.sin(a1)], v: 1 })
    }
  }
  arc(-SPROCKET, Math.PI, Math.PI * 2)
  legs.push({ from: [CHAIN_X, -SPROCKET], to: [CHAIN_X, SPROCKET], v: 1 })
  arc(SPROCKET, 0, Math.PI)
  return route(legs)
})()

/** Which way a bucket hangs: the chain's heading at `c`, relative to straight up. */
const heading = (c: number) => {
  const [x0, y0] = chain.at(mod(c, 1))
  const [x1, y1] = chain.at(mod(c + 0.002, 1))
  return Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2
}

export const bucketLift = defineContraption({
  name: 'bucket-lift',
  label: 'Bucket Lift',
  tags: ['loop'],
  role: 'relay',
  span: [1, 2],
  rotations: [0],
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    outline(p, ink, weight)
    ground(p, k, 1, 1)
    stroke(p, k, -0.32, FLOOR, CHUTE_X + 0.09, FLOOR)
    block(p, k, ink, weight, s.color, -0.34, FLOOR - 0.06, 0.05, 0.12)
    // The chute down the right side, with a mouth to catch the spill.
    outline(p, ink, weight)
    stroke(p, k, CHUTE_X - 0.09, -0.62, CHUTE_X - 0.09, FLOOR - 0.2)
    stroke(p, k, CHUTE_X + 0.09, -0.72, CHUTE_X + 0.09, FLOOR)
    stroke(p, k, CHUTE_X - 0.09, -0.62, 0.19, -0.74)
    // The chain and its sprockets.
    stroke(p, k, -CHAIN_X, -SPROCKET, -CHAIN_X, SPROCKET)
    stroke(p, k, CHAIN_X, -SPROCKET, CHAIN_X, SPROCKET)
    p.arc(0, -SPROCKET * k, CHAIN_X * 2 * k, CHAIN_X * 2 * k, Math.PI, Math.PI * 2)
    p.arc(0, SPROCKET * k, CHAIN_X * 2 * k, CHAIN_X * 2 * k, 0, Math.PI)
    stroke(p, k, 0, SPROCKET, 0, 1)
    stroke(p, k, 0, -0.96, 0, -SPROCKET)
    for (const cy of [-SPROCKET, SPROCKET]) {
      p.push()
      p.translate(0, cy * k)
      p.rotate(Math.PI * 2 * u)
      solid(p, ink, weight, s.color)
      p.circle(0, 0, 0.16 * k)
      outline(p, ink, weight)
      teeth(p, 0.08 * k, 8, 0.06 * k)
      p.pop()
    }

    // Performers: in a bucket, over the top, down the chute, along the floor, waiting.
    for (let j = 0; j < RIDERS; j++) {
      const t = mod(u - j / BUCKETS, CYCLE)
      let pos: [number, number]
      if (t < RIDE_END) {
        const [x, y] = chain.at(t)
        const a = heading(t)
        pos = [x - 0.08 * Math.sin(a), y + 0.08 * Math.cos(a)]
      } else if (t < RIDE_END + HOP) pos = flight([-0.08, -SPROCKET - CHAIN_X], [CHUTE_X, -0.62], 0.05, (t - RIDE_END) / HOP)
      else if (t < RIDE_END + HOP + CHUTE) pos = drop([CHUTE_X, -0.62], [CHUTE_X, FLOOR - P / 2], (t - RIDE_END - HOP) / CHUTE)
      else if (t < RIDE_END + HOP + CHUTE + ROLL) pos = [CHUTE_X - (CHUTE_X + CHAIN_X) * ((t - RIDE_END - HOP - CHUTE) / ROLL), FLOOR - P / 2]
      else pos = [-CHAIN_X, FLOOR - P / 2]
      performer(p, k, ink, weight, s.color, pos[0], pos[1])
    }

    // Buckets, hanging off the chain and turning over with it, drawn over
    // the riders so a rider sits in a bucket rather than on it.
    for (let b = 0; b < BUCKETS; b++) {
      const c = mod(u + b / BUCKETS, 1)
      const [x, y] = chain.at(c)
      p.push()
      p.translate(x * k, y * k)
      p.rotate(heading(c))
      solid(p, ink, weight, s.color)
      p.quad(-0.1 * k, 0.02 * k, -0.08 * k, 0.17 * k, 0.08 * k, 0.17 * k, 0.1 * k, 0.02 * k)
      p.pop()
    }
  },
})
