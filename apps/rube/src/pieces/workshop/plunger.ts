import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'

/**
 * A spring kicker and a gap. The ball rolls to the rail's end and settles
 * in a dimple against the lip; under the rail behind it a plunger sits
 * cocked in its barrel, aimed up along the line the ball has to fly. The
 * pawl lets go; the spring drives the pad up through a slot in the rail
 * onto the ball's lower back and boots it across a cell with no rail in
 * it at all, to land on the far side and roll on. The pad is drawn back
 * again slowly by nothing in particular.
 */
const SEAT = 0.3
/** The shot's angle above the rail, and its direction. */
const AIM = 0.61
const U: Pt = [Math.cos(AIM), -Math.sin(AIM)]
/** Where the pad's face meets the ball: on its rim, square to the shot. */
const STRIKE: Pt = [SEAT - R * U[0], 0.02 - R * U[1]]
/** The pad's face cocked back along the shot's line, and its follow-through past the strike. */
const COCKED = 0.14
const THROUGH = 0.05
/** Seconds the pad takes to cross from cocked to the strike. */
const STROKE = 0.07
/** The barrel, as distances back from the strike along the shot's line. */
const BARREL0 = 0.28
const BARREL1 = 0.62
const PAD = 0.1
const LIP = SEAT + 0.12
/** The slot the pad comes up through, where the shot's line crosses the rail. */
const SLOT = STRIKE[0] - ((FLOOR - STRIKE[1]) * U[0]) / -U[1]
const LAND: Pt = [1.78, 0]
const ARRIVE = arriveAt(SEAT)
const HOLD = 0.5
const FIRE = ARRIVE + HOLD
/** The flight leaves at AIM: the arc that gives that angle over the chord, at the same gravity as before. */
const ARC = (Math.tan(AIM) * (LAND[0] - SEAT)) / 4
const FLIGHT = Math.sqrt((8 * ARC) / 9)
const V_LAND = Math.hypot((LAND[0] - SEAT) / FLIGHT, (4 * ARC) / FLIGHT)

/** A point `s` back from the strike along the shot's line. */
const along = (s: number): Pt => [STRIKE[0] - U[0] * s, STRIKE[1] - U[1] * s]

export const plunger = definePiece<{ color: string }>({
  name: 'plunger',
  flight: true,
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
        fly([SEAT, 0.02], LAND, FLIGHT, ARC),
        fly(LAND, [LAND[0] + 0.2, 0], 0.2 / V_LAND, 0.03),
        ramp([LAND[0] + 0.2, 0], [2.5, 0], V_LAND, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    // The pawl lets go a hair before the fire; the pad crosses to the ball
    // in that hair, arriving at the fire, follows through a little as the
    // ball leaves, and is drawn back, slowly, by nothing in particular.
    const pad =
      since < -STROKE ? COCKED
      : since < 0 ? lerp(COCKED, 0, easeInQuad(over(since, -STROKE, 0)))
      : since < 0.05 ? lerp(0, -THROUGH, easeOutCubic(over(since, 0, 0.05)))
      : since < 0.8 ? -THROUGH
      : lerp(-THROUGH, COCKED, easeInOutSine(over(since, 0.8, 2.6)))
    const pawl = since < -STROKE ? 0 : since < -STROKE + 0.04 ? over(since, -STROKE, -STROKE + 0.04) : since < 2.6 ? 1 : 1 - over(since, 2.6, 2.8)

    // The rail to the lip, with the slot the pad comes through; the gap; the rail beyond it.
    rail(p, k, ink, weight, -0.5, SLOT - 0.06)
    rail(p, k, ink, weight, SLOT + 0.06, LIP)
    outline(p, ink, weight)
    p.line(LIP * k, FLOOR * k, LIP * k, (FLOOR - 0.06) * k)
    rail(p, k, ink, weight, 1.5, 2.5)
    p.line(1.5 * k, (FLOOR - 0.06) * k, 1.5 * k, (FLOOR + 0.06) * k)
    // Posts either side of the gap, and a hazard board.
    p.line(LIP * k, FLOOR * k, LIP * k, 0.5 * k)
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

    // The barrel's foot: a post from under its middle to the ground.
    const mid = along((BARREL0 + BARREL1) / 2)
    const under: Pt = [mid[0] + 0.08 * Math.sin(AIM), mid[1] + 0.08 * Math.cos(AIM)]
    outline(p, ink, weight)
    p.line(under[0] * k, under[1] * k, under[0] * k, 0.5 * k)
    p.line((under[0] - 0.06) * k, 0.5 * k, (under[0] + 0.06) * k, 0.5 * k)

    // The kicker, in the shot's own frame: x along the shot, y across it.
    p.push()
    p.translate(STRIKE[0] * k, STRIKE[1] * k)
    p.rotate(-AIM)
    // The barrel, the rod, the spring, the pad.
    solid(p, ink, weight, bg)
    p.rect(-((BARREL0 + BARREL1) / 2) * k, 0, (BARREL1 - BARREL0) * k, 0.16 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(-BARREL0 * k, 0, -pad * k, 0)
    p.beginShape()
    const coils = 6
    for (let i = 0; i <= coils * 2; i++) {
      const f = i / (coils * 2)
      const end = i === 0 || i === coils * 2
      p.vertex(lerp(-BARREL0 + 0.02, -pad - 0.03, f) * k, (end ? 0 : i % 2 ? 0.05 : -0.05) * k)
    }
    p.endShape()
    solid(p, ink, weight, s.color)
    p.rect(-pad * k, 0, 0.05 * k, PAD * k)
    // The pawl: holds a notch on the rod while cocked, flips at the fire.
    p.push()
    p.translate(-(BARREL0 + 0.06) * k, -0.08 * k)
    p.rotate(0.8 * pawl)
    outline(p, ink, weight)
    p.line(0, 0, 0, -0.09 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -0.09 * k, 0.05 * k)
    p.pop()
    p.pop()

    // The strike: three ticks off the ball's back along the shot.
    if (since > 0 && since < 0.15) {
      const f = over(since, 0, 0.15)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const da of [-0.8, 0, 0.8]) {
        const a = Math.PI + AIM + da
        const r0 = 0.15 + 0.12 * f
        p.line((SEAT + Math.cos(a) * r0) * k, (0.02 - Math.sin(a) * r0) * k, (SEAT + Math.cos(a) * (r0 + 0.07)) * k, (0.02 - Math.sin(a) * (r0 + 0.07)) * k)
      }
      p.pop()
    }
  },
})
