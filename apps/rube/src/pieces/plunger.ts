import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../parts'

/**
 * A pinball plunger and a gap. The ball rolls past the cocked plunger into
 * a dimple; the pawl lets go; the spring drives the plunger into the ball
 * and the ball across a cell with no rail in it at all, to land on the far
 * side and roll on. The plunger is drawn back again slowly by nothing in
 * particular.
 */
const SEAT = 0.3
const COCKED = -0.16
/** The tip's face is flush with the ball's edge at the strike, and follows through past it. */
const STRIKE = SEAT - R - 0.025
const THROUGH = 0.06
/** Seconds the tip takes to cross from cocked to the strike. */
const STROKE = 0.07
const COLLAR = -0.44
const LAND: Pt = [1.78, 0]
const ARRIVE = arriveAt(SEAT)
const HOLD = 0.5
const FIRE = ARRIVE + HOLD
const FLIGHT = 0.42

export const plunger = definePiece<{ color: string }>({
  name: 'plunger',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [SEAT, 0.02]),
        wait([SEAT, 0.02], HOLD),
        fly([SEAT, 0.02], LAND, FLIGHT, 0.2),
        fly(LAND, [LAND[0] + 0.2, 0], 0.1, 0.04),
        ramp([LAND[0] + 0.2, 0], [2.5, 0], FAST, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    // The pawl lets go a hair before the fire; the tip crosses to the ball
    // in that hair, arriving at the fire, and follows through a little as
    // the ball leaves. Then it is drawn back, slowly, by nothing in particular.
    const tip =
      since < -STROKE ? COCKED
      : since < 0 ? lerp(COCKED, STRIKE, easeInQuad(over(since, -STROKE, 0)))
      : since < 0.05 ? lerp(STRIKE, STRIKE + THROUGH, easeOutCubic(over(since, 0, 0.05)))
      : since < 0.8 ? STRIKE + THROUGH
      : lerp(STRIKE + THROUGH, COCKED, easeInOutSine(over(since, 0.8, 2.6)))
    const pawl = since < -STROKE ? 0 : since < -STROKE + 0.04 ? over(since, -STROKE, -STROKE + 0.04) : since < 2.6 ? 1 : 1 - over(since, 2.6, 2.8)

    // The rail up to the edge, the gap, and the rail beyond it.
    rail(p, k, ink, weight, -0.5, 0.5)
    outline(p, ink, weight)
    p.line(0.5 * k, (FLOOR - 0.06) * k, 0.5 * k, (FLOOR + 0.06) * k)
    rail(p, k, ink, weight, 1.5, 2.5)
    p.line(1.5 * k, (FLOOR - 0.06) * k, 1.5 * k, (FLOOR + 0.06) * k)
    // Posts either side of the gap, and a hazard board.
    p.line(0.5 * k, FLOOR * k, 0.5 * k, 0.5 * k)
    p.line(1.5 * k, FLOOR * k, 1.5 * k, 0.5 * k)
    solid(p, ink, weight, s.color)
    p.rect(1.0 * k, 0.4 * k, 0.5 * k, 0.09 * k)
    p.push()
    p.stroke(ink)
    p.strokeWeight(weight)
    for (let x = 0.8; x < 1.22; x += 0.1) p.line(x * k, 0.36 * k, (x + 0.05) * k, 0.44 * k)
    p.pop()
    // The dimple the ball waits in.
    outline(p, ink, weight)
    p.line((SEAT - 0.1) * k, FLOOR * k, (SEAT - 0.05) * k, (FLOOR + 0.02) * k)
    p.line((SEAT - 0.05) * k, (FLOOR + 0.02) * k, (SEAT + 0.05) * k, (FLOOR + 0.02) * k)
    p.line((SEAT + 0.05) * k, (FLOOR + 0.02) * k, (SEAT + 0.1) * k, FLOOR * k)

    // The housing: a collar the rod runs through, on a foot.
    solid(p, ink, weight, bg)
    p.rect(COLLAR * k, -0.02 * k, 0.08 * k, 0.2 * k)
    outline(p, ink, weight)
    p.line(COLLAR * k, 0.08 * k, COLLAR * k, FLOOR * k)
    // The spring, between the collar and the tip.
    const x0 = COLLAR + 0.04
    const x1 = tip - 0.05
    p.beginShape()
    const coils = 7
    for (let i = 0; i <= coils * 2; i++) {
      const f = i / (coils * 2)
      p.vertex(lerp(x0, x1, f) * k, (-0.02 + (i % 2 ? 0.06 : -0.06) * (i === 0 || i === coils * 2 ? 0 : 1)) * k)
    }
    p.endShape()
    // The rod, tip, and knob.
    p.line((tip - 0.36) * k, -0.02 * k, tip * k, -0.02 * k)
    solid(p, ink, weight, s.color)
    p.rect(tip * k, -0.02 * k, 0.05 * k, 0.18 * k)
    p.circle((tip - 0.36) * k, -0.02 * k, 0.1 * k)
    // The pawl: holds a notch on the rod while cocked, flips at the fire.
    p.push()
    p.translate((COLLAR + 0.1) * k, -0.2 * k)
    p.rotate(-0.8 * pawl)
    outline(p, ink, weight)
    p.line(0, 0, 0, 0.1 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.05 * k)
    p.pop()
    outline(p, ink, weight)
    p.line((COLLAR + 0.1) * k, -0.2 * k, COLLAR * k, -0.2 * k)
    p.line(COLLAR * k, -0.2 * k, COLLAR * k, -0.12 * k)
    // The strike.
    if (since > 0 && since < 0.15) {
      const f = over(since, 0, 0.15)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-0.6, -0.2, 0.2]) {
        const r0 = 0.12 + 0.14 * f
        p.line((STRIKE + 0.03 + Math.cos(a) * r0) * k, (Math.sin(a) * r0) * k, (STRIKE + 0.03 + Math.cos(a) * (r0 + 0.08)) * k, (Math.sin(a) * (r0 + 0.08)) * k)
      }
      p.pop()
    }
  },
})
