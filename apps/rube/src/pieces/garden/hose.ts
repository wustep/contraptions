import { outline, solid } from '../../../../../src/core/draw'
import { FAST, FLOOR, ROLL, burst, definePiece, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { drop, tuft } from './green'

/**
 * A garden hose, coiled twice on a hook on the fence, its mouth at the
 * path's end and its nozzle pointing along the path a cell on. The ball
 * rolls into the mouth and the hose swallows it: a bulge the ball's size
 * travels round the coil, once, twice, gathering pace, and the ball shoots
 * out of the nozzle onto the path with a spit of water behind it. The hose
 * drips.
 *
 * The collars at the mouth and the nozzle stand in front of the ball, and
 * the bulge is the ball's own colour and size, so going in and coming out
 * are one motion with nothing popping.
 */
const MOUTH = -0.24
const NOZZLE = 1.12
const CENTRE: Pt = [0.44, -0.16]
const RADIUS = 0.3
const T_MOUTH = (0.5 + MOUTH) / ROLL
/** How fast the bulge goes at its quickest, mid-coil. */
const PEAK = 7

/** Where the hose meets the coil, and leaves it. */
const IN: Pt = [CENTRE[0] - RADIUS, CENTRE[1] + 0.09]
const OUT: Pt = [CENTRE[0] + RADIUS, CENTRE[1] + 0.09]

/** A point along the hose, f from 0 (the mouth) to 1 (the nozzle): in, two and a half turns of coil, out. */
function hosePt(f: number): Pt {
  if (f < 0.12) {
    const g = f / 0.12
    return [MOUTH + (IN[0] - MOUTH) * g, IN[1] * g]
  }
  if (f < 0.88) {
    const g = (f - 0.12) / 0.76
    const a = Math.PI + g * Math.PI * 5
    const r = RADIUS - 0.04 * Math.sin(g * Math.PI)
    return [CENTRE[0] + Math.cos(a) * r, CENTRE[1] + 0.09 + Math.sin(a) * r * 0.7]
  }
  const g = (f - 0.88) / 0.12
  return [OUT[0] + (NOZZLE - OUT[0]) * g, OUT[1] * (1 - g)]
}

/**
 * The bulge's timetable: the hose's length walked in small steps, at a pace
 * that starts as the ball's, peaks in the coil and ends as a kick's, so the
 * ball goes in and comes out without a jolt. `TIMES[i]` is when the bulge
 * reaches the i-th step.
 */
const STEPS = 240
const TIMES: number[] = (() => {
  const times = [0]
  let prev = hosePt(0)
  let s = 0
  const lengths: number[] = []
  for (let i = 1; i <= STEPS; i++) {
    const pt = hosePt(i / STEPS)
    lengths.push(Math.hypot(pt[0] - prev[0], pt[1] - prev[1]))
    s += lengths[i - 1]
    prev = pt
  }
  let walked = 0
  for (let i = 0; i < STEPS; i++) {
    const u = (walked + lengths[i] / 2) / s
    const v = ROLL + (FAST - ROLL) * u + (PEAK - (ROLL + FAST) / 2) * Math.sin(Math.PI * u)
    times.push(times[i] + lengths[i] / v)
    walked += lengths[i]
  }
  return times
})()
const INSIDE = TIMES[STEPS]
const FIRE = T_MOUTH + INSIDE

/** Where along the hose the bulge is, `tau` seconds after the ball went in. */
function bulgeAt(tau: number): Pt {
  let i = 0
  while (i < STEPS - 1 && TIMES[i + 1] < tau) i++
  const f = (i + over(tau, TIMES[i], TIMES[i + 1])) / STEPS
  return hosePt(f)
}

export const hose = definePiece<{ color: string }>({
  name: 'hose',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [MOUTH, 0], ROLL),
        { from: [MOUTH, 0], to: [NOZZLE, 0], dur: INSIDE, hidden: true },
        ramp([NOZZLE, 0], [1.5, 0], FAST, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, weight, color }) => {
    const inside = t > T_MOUTH && since < 0

    rail(p, k, ink, weight, -0.5, MOUTH - 0.04)
    rail(p, k, ink, weight, NOZZLE + 0.02, 1.5)
    // The fence behind: a few pales, and the hook the coil hangs on.
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 1.5 * k, 0.5 * k)
    for (const x of [0.1, 0.44, 0.78]) p.line(x * k, 0.5 * k, x * k, (CENTRE[1] - 0.24) * k)
    p.line(0.0 * k, (CENTRE[1] - 0.2) * k, 0.88 * k, (CENTRE[1] - 0.2) * k)
    solid(p, ink, weight, ink)
    p.rect(CENTRE[0] * k, (CENTRE[1] - 0.12) * k, 0.06 * k, 0.16 * k)
    tuft(p, k, ink, weight, -0.3, 0.5, 0.1, 0.02)
    tuft(p, k, ink, weight, 1.3, 0.5, 0.08, -0.02)

    // The hose: one thick line in ink, a thinner one in the colour over it.
    const n = 72
    for (const [w, c] of [
      [weight * 3.6, ink],
      [weight * 2, s.color],
    ] as [number, string][]) {
      p.push()
      p.noFill()
      p.stroke(c)
      p.strokeWeight(w)
      p.beginShape()
      for (let i = 0; i <= n; i++) {
        const [x, y] = hosePt(i / n)
        p.vertex(x * k, y * k)
      }
      p.endShape()
      p.pop()
    }
    // The bulge, going round: the ball's size, in the ball's colour, seen through the hose's skin.
    if (inside) {
      const [bx, by] = bulgeAt(t - T_MOUTH)
      solid(p, ink, weight, color)
      p.circle(bx * k, by * k, 2 * 0.13 * k)
    }
    // The spit out of the nozzle, and drips after.
    if (since > 0 && since < 0.25) {
      const g = over(since, 0, 0.25)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, (NOZZLE + 0.04) * k, 0, (0.08 + 0.12 * g) * k, (0.14 + 0.18 * g) * k, 4, -0.6)
      p.pop()
    }
    if (since > 0.2 && since < 1.6) {
      const g = ((since - 0.2) * 1.4) % 1
      drop(p, k, s.color, NOZZLE + 0.02, 0.06 + (FLOOR - 0.06 + 0.3) * g, 0.02)
    }
  },
  over: (p, _s, { k, ink, bg, weight }) => {
    // The brass collars at either end, in front: the mouth the ball goes into, the nozzle it comes out of.
    solid(p, ink, weight, bg)
    p.rect((MOUTH + 0.02) * k, 0, 0.1 * k, 0.32 * k, 0.01 * k)
    p.quad((NOZZLE - 0.12) * k, -0.11 * k, NOZZLE * k, -0.15 * k, NOZZLE * k, 0.15 * k, (NOZZLE - 0.12) * k, 0.11 * k)
  },
})
