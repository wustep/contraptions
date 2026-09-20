import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt, type Seg } from '../../parts'
import { bloom, gardenWater, soil, tuft } from './green'

/**
 * A pond across three cells of the path, with three lily pads floating on
 * it in a row, their tops level with the path. The ball rolls off the near
 * bank onto the first pad, which sinks a little and tilts toward it — down
 * at the edge it came onto, level as it crosses the middle, down again at
 * the edge it leaves by — and hops the water onto the next, and the next,
 * and up onto the far bank. Each pad rocks itself still behind it, and a
 * ring spreads on the water round each one as it takes the weight. A
 * flower rides the middle pad.
 *
 * A pad's tilt is set by where the ball is on it, so the ball's lane over a
 * pad is the pad's own top under it, and the ball never leaves the leaf.
 */
/** The pads: their centres, half-width, and how thick they are; the water is just under their tops. */
const XS = [0.05, 1.0, 1.95]
const HW = 0.4
const PAD_H = 0.12
const WATER = FLOOR + 0.04
/** How far a pad sinks under the ball and how far it tilts with the ball at its edge. */
const DIP = 0.025
const TILT = 0.1
/** The ball rides a pad from this far in from one edge to this far in from the other. */
const IN = 0.08
const V = 2.4
const BANK_L = XS[0] - HW - 0.02
const BANK_R = XS[2] + HW + 0.02

interface Ride {
  on: number
  off: number
  x0: number
}
const RIDES: Ride[] = []

/** The ball on pad `i` at piece time `t`. */
function onPad(i: number, t: number): Pt {
  const r = RIDES[i]
  const x = r.x0 + V * (t - r.on)
  return [x, FLOOR - R + DIP + (TILT * (x - XS[i]) * (x - XS[i])) / HW]
}

const LANE: Lane = (() => {
  const segs: Seg[] = [roll([-0.5, 0], [BANK_L, 0], ROLL)]
  let t = segs[0].dur
  let from: Pt = [BANK_L, 0]
  XS.forEach((cx, i) => {
    const x0 = cx - HW + IN
    const x1 = cx + HW - IN
    const hop = (x0 - from[0]) / V
    const ride: Ride = { on: t + hop, off: t + hop + (x1 - x0) / V, x0 }
    RIDES.push(ride)
    const land = onPad(i, ride.on)
    segs.push(fly(from, land, hop, 0.01))
    const across = trace((tt) => onPad(i, tt), ride.on, ride.off, 12)
    segs.push(...across)
    from = across[across.length - 1].to
    t = ride.off
  })
  segs.push(fly(from, [BANK_R, 0], (BANK_R - from[0]) / V, 0.03), ramp([BANK_R, 0], [2.5, 0], V, ROLL))
  return { segs, fire: RIDES[1].on }
})()

/** Pad `i`'s tilt and sink at piece time `t`: level and afloat, set by the ball while it is on it, rocking itself still after. */
function padAt(i: number, t: number): { tilt: number; sink: number } {
  const r = RIDES[i]
  if (t < r.on) return { tilt: 0, sink: 0 }
  if (t <= r.off) {
    const x = r.x0 + V * (t - r.on)
    return { tilt: (TILT * (x - XS[i])) / HW, sink: DIP }
  }
  const tau = t - r.off
  const fade = Math.exp(-tau * 3)
  return { tilt: TILT * fade * Math.cos(tau * 8), sink: DIP * fade * Math.cos(tau * 11) }
}

export const pond = definePiece<{ color: string; water: string }>({
  name: 'pond',
  weight: 1,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    const water = gardenWater(theme, ball.color)
    // The pads are never the water's colour, or they would be under it.
    const pads = color !== water ? color : rng.pick(theme.colors.filter((c) => c !== water && c !== ball.color)) ?? color
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: pads, water } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The banks, and the pond between them: water from its line down to the ground.
    rail(p, k, ink, weight, -0.5, BANK_L - 0.08)
    rail(p, k, ink, weight, BANK_R + 0.08, 2.5)
    soil(p, k, ink, weight, -0.5, BANK_L)
    soil(p, k, ink, weight, BANK_R, 2.5)
    tuft(p, k, ink, weight, BANK_L - 0.14, 0.5, 0.12, -0.03)
    tuft(p, k, ink, weight, BANK_R + 0.15, 0.5, 0.1, 0.03)
    p.push()
    p.noStroke()
    p.fill(s.water)
    p.rect(((BANK_L + BANK_R) / 2) * k, ((WATER + 0.5) / 2) * k, (BANK_R - BANK_L) * k, (0.5 - WATER) * k)
    p.pop()
    outline(p, ink, weight)
    p.line(BANK_L * k, WATER * k, BANK_R * k, WATER * k)
    // The pond is a raised one: a stone edge at either end holds the water up level with the path.
    solid(p, ink, weight, bg)
    for (const x of [BANK_L - 0.04, BANK_R + 0.04]) {
      p.rect(x * k, ((WATER + 0.5) / 2) * k, 0.09 * k, (0.5 - WATER) * k)
      p.rect(x * k, (WATER - 0.005) * k, 0.13 * k, 0.045 * k, 0.01 * k)
    }

    // The rings on the water round each pad as it takes the ball, spreading and fading.
    for (let i = 0; i < XS.length; i++) {
      const f = over(t, RIDES[i].on, RIDES[i].on + 1.0)
      if (f <= 0 || f >= 1) continue
      outline(p, ink, weight * (1 - f))
      p.ellipse(XS[i] * k, (WATER + 0.005) * k, (HW + 0.05 + 0.25 * f) * 2 * k, (0.06 + 0.06 * f) * 2 * k)
    }

    // The pads: each a leaf seen from a little above, a notch cut to its middle, tilting and sinking with the ball; the flower on the middle one.
    XS.forEach((cx, i) => {
      const { tilt, sink } = padAt(i, t)
      p.push()
      p.translate(cx * k, (FLOOR + PAD_H / 2 + sink) * k)
      p.rotate(tilt)
      solid(p, ink, weight, s.color)
      p.ellipse(0, 0, HW * 2 * k, PAD_H * k)
      p.noStroke()
      p.fill(s.water)
      p.triangle(-0.1 * k, (PAD_H / 2 + 0.01) * k, 0.06 * k, (PAD_H / 2 + 0.01) * k, -0.03 * k, 0)
      outline(p, ink, weight)
      p.line(-0.1 * k, (PAD_H / 2) * k, -0.03 * k, 0)
      p.line(0.06 * k, (PAD_H / 2) * k, -0.03 * k, 0)
      if (i === 1) {
        outline(p, ink, weight)
        p.line(0.24 * k, -0.02 * k, 0.25 * k, -0.14 * k)
        bloom(p, k, ink, weight, bg, s.color, 0.25, -0.17, 0.06, 6, 1, 0.3)
      }
      p.pop()
    })
  },
})
