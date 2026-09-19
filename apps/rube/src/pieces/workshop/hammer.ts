import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'

/**
 * A drop hammer, two cells tall. The ball rolls onto the anvil and waits;
 * the pawl lets go; the head falls a whole cell. The head is a wedge, and
 * it comes down just behind the ball, so its slanted face squeezes the ball
 * out along the rail — twice as fast as it came, with a skip and sparks —
 * rather than flattening it. Then the winch hauls the head back up, slowly,
 * for a ball that will never come.
 */
/** The hammer's axis: a little behind the ball, so the wedge's near face does the work. */
const AX = -0.08
const HEAD_W = 0.34
/** The block above the wedge, and the wedge below it. */
const BLOCK_H = 0.12
const WEDGE_H = 0.26
const HALF = HEAD_W / 2
/** The apex at rest on the anvil, and cocked at the top of the guides. */
const LOW = FLOOR
const HIGH = -1.0
/**
 * The apex's height when the wedge's near face first touches the ball: the
 * face through the apex with slope (HALF, -WEDGE_H) is a radius from the
 * ball's centre.
 */
const CONTACT = (-AX * WEDGE_H - R * Math.hypot(HALF, WEDGE_H)) / HALF
const GUIDE = 0.24
const SHEAVE_Y = HIGH - WEDGE_H - BLOCK_H - 0.06
const ARRIVE = arriveAt(0)
const WAIT = 0.6
const DROP = 0.16
/** The skip the blow gives the ball before it settles to a roll. */
const SKIP: Pt = [0.22, 0]

export const hammer = definePiece<{ color: string }>({
  name: 'hammer',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, 0])) return null
    const lane: Lane = {
      segs: [...arrive([-0.5, 0], [0, 0]), wait([0, 0], WAIT), fly([0, 0], SKIP, SKIP[0] / FAST, 0.04), ramp(SKIP, [0.5, 0], FAST, ROLL)],
      fire: ARRIVE + WAIT,
    }
    return { cells, exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    // The apex's height over time: cocked, the fall to contact, the follow-through
    // onto the anvil, a bounce, the rest, and the long haul back up.
    let y: number
    if (since < -DROP) y = HIGH
    else if (since < 0) y = lerp(HIGH, CONTACT, easeInQuad(over(since, -DROP, 0)))
    else if (since < 0.05) y = lerp(CONTACT, LOW, over(since, 0, 0.05))
    else if (since < 0.16) y = LOW - 0.03 * Math.sin(over(since, 0.05, 0.16) * Math.PI)
    else if (since < 1.2) y = LOW
    else y = lerp(LOW, HIGH, easeInOutSine(over(since, 1.2, 3.6)))
    const top = y - WEDGE_H - BLOCK_H

    rail(p, k, ink, weight, -0.5, 0.5)
    outline(p, ink, weight)
    // The frame: two guides the head rides between, a crossbar, ties to the
    // wall, and the sheave the cable runs over.
    for (const x of [AX - GUIDE, AX + GUIDE]) p.line(x * k, SHEAVE_Y * k, x * k, (FLOOR + 0.06) * k)
    p.line((AX - GUIDE) * k, SHEAVE_Y * k, (AX + GUIDE) * k, SHEAVE_Y * k)
    for (let ty = -1.15; ty < 0; ty += 0.3) {
      for (const x of [AX - GUIDE, AX + GUIDE]) p.line(x * k, ty * k, (x + Math.sign(x - AX) * 0.06) * k, ty * k)
    }
    // The cable: taut on the winch, slack while the head is falling or down.
    const slack = since < -DROP ? 0 : since < 1.2 ? 1 : 1 - easeInOutSine(over(since, 1.2, 3.6))
    p.noFill()
    p.bezier(AX * k, (SHEAVE_Y + 0.05) * k, AX * k, ((SHEAVE_Y + top) / 2) * k, (AX + slack * 0.08) * k, ((SHEAVE_Y + top) / 2 + 0.1) * k, AX * k, top * k)
    solid(p, ink, weight, s.color)
    p.circle(AX * k, (SHEAVE_Y + 0.05) * k, 0.1 * k)
    p.push()
    p.translate(AX * k, (SHEAVE_Y + 0.05) * k)
    p.rotate(-(y - HIGH) * 12)
    outline(p, ink, weight)
    p.line(-0.035 * k, 0, 0.035 * k, 0)
    p.pop()
    // The pawl that holds the head up under the block, flipped aside at the fire.
    const pawl = since < -DROP ? 0 : since < 1.2 ? 1 : 1 - over(since, 3.4, 3.6)
    const tremble = since > -DROP - 0.35 && since < -DROP ? 0.06 * Math.sin(since * 70) * over(since, -DROP - 0.35, -DROP) : 0
    p.push()
    p.translate((AX + GUIDE) * k, (HIGH - WEDGE_H + 0.02) * k)
    p.rotate(-0.5 * pawl + tremble)
    solid(p, ink, weight, s.color)
    p.rect(-0.07 * k, 0, 0.14 * k, 0.05 * k)
    p.pop()

    // The anvil: the rail made thick between the guides, and no more. On a foot it was a black T hung under the ball.
    p.fill(ink)
    p.noStroke()
    p.rect(AX * k, (FLOOR + 0.04) * k, (GUIDE * 2 + 0.12) * k, 0.08 * k, 0.015 * k)

    // The head, with a motion streak on the way down.
    if (since > -DROP * 0.6 && since < 0) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      const f = over(since, -DROP, 0)
      for (const dx of [-0.1, 0.1]) p.line((AX + dx) * k, (top - 0.02) * k, (AX + dx) * k, (top - 0.02 - 0.3 * f) * k)
      p.pop()
    }
    // A block on top and the wedge below it, one outline; the wedge's bit is ink.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((AX - HALF) * k, top * k)
    p.vertex((AX + HALF) * k, top * k)
    p.vertex((AX + HALF) * k, (top + BLOCK_H) * k)
    p.vertex(AX * k, y * k)
    p.vertex((AX - HALF) * k, (top + BLOCK_H) * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.line((AX - HALF) * k, (top + BLOCK_H) * k, (AX + HALF) * k, (top + BLOCK_H) * k)
    p.fill(ink)
    p.noStroke()
    const bit = 0.3
    p.triangle((AX - HALF * bit) * k, (y - WEDGE_H * bit) * k, (AX + HALF * bit) * k, (y - WEDGE_H * bit) * k, AX * k, y * k)

    if (since > 0 && since < 0.22) {
      const f = over(since, 0, 0.22)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const side of [-1, 1]) {
        for (const a of [0.15, 0.65, 1.15]) {
          const dx = side * Math.cos(a)
          const dy = -Math.sin(a)
          const r0 = 0.05 + 0.24 * f
          const r1 = r0 + 0.1 * (1 - f)
          p.line((side * 0.22 + dx * r0) * k, (FLOOR + dy * r0) * k, (side * 0.22 + dx * r1) * k, (FLOOR + dy * r1) * k)
        }
      }
      p.pop()
    }
  },
})
