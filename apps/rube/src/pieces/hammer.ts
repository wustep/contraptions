import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, definePiece, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A drop hammer, two cells tall. The ball rolls onto the anvil and waits;
 * the pawl lets go; the head falls a whole cell and the blow drives the
 * ball out twice as fast as it came, with sparks off the anvil. Then the
 * winch hauls the head back up, slowly, for a ball that will never come.
 */
const HEAD_W = 0.32
const HEAD_H = 0.22
const LOW = FLOOR - HEAD_H / 2
const HIGH = -1.1
const CONTACT = -R - HEAD_H / 2
const GUIDE = 0.23
const SHEAVE_Y = -1.4
const ARRIVE = 0.5 / ROLL
const WAIT = 0.6
const DROP = 0.16

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
      segs: [roll([-0.5, 0], [0, 0], ROLL), wait([0, 0], WAIT), roll([0, 0], [0.5, 0], FAST, 'out')],
      fire: ARRIVE + WAIT,
    }
    return { cells, exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    let y: number
    if (since < -DROP) y = HIGH
    else if (since < 0) y = lerp(HIGH, CONTACT, easeInQuad(over(since, -DROP, 0)))
    else if (since < 0.05) y = lerp(CONTACT, LOW, easeInQuad(over(since, 0, 0.05)))
    else if (since < 0.16) y = LOW - 0.03 * Math.sin(over(since, 0.05, 0.16) * Math.PI)
    else if (since < 1.2) y = LOW
    else y = lerp(LOW, HIGH, easeInOutSine(over(since, 1.2, 3.6)))

    rail(p, k, ink, weight, -0.5, 0.5)
    outline(p, ink, weight)
    // The frame: two guides the head rides between, a crossbar, ties to the
    // wall, and the sheave the cable runs over.
    for (const x of [-GUIDE, GUIDE]) p.line(x * k, SHEAVE_Y * k, x * k, (FLOOR + 0.06) * k)
    p.line(-GUIDE * k, SHEAVE_Y * k, GUIDE * k, SHEAVE_Y * k)
    for (let ty = -1.15; ty < 0; ty += 0.3) {
      for (const x of [-GUIDE, GUIDE]) p.line(x * k, ty * k, (x + Math.sign(x) * 0.06) * k, ty * k)
    }
    p.line(0, (SHEAVE_Y + 0.05) * k, 0, (y - HEAD_H / 2) * k)
    solid(p, ink, weight, s.color)
    p.circle(0, (SHEAVE_Y + 0.05) * k, 0.1 * k)
    // The pawl that holds the head up, flipped aside at the fire.
    const pawl = since < -DROP ? 0 : since < 1.2 ? 1 : 1 - over(since, 3.4, 3.6)
    p.push()
    p.translate(GUIDE * k, (HIGH + HEAD_H / 2 + 0.02) * k)
    p.rotate(-0.5 * pawl)
    solid(p, ink, weight, s.color)
    p.rect(-0.07 * k, 0, 0.14 * k, 0.05 * k)
    p.pop()

    // The anvil: the one ink-filled mass, on a foot.
    p.fill(ink)
    p.noStroke()
    p.rect(0, (FLOOR + 0.08) * k, 0.44 * k, 0.16 * k)
    p.rect(0, (FLOOR + 0.16 + 0.105) * k, 0.2 * k, 0.21 * k)

    // The head, with a motion streak on the way down.
    if (since > -DROP * 0.6 && since < 0) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      const f = over(since, -DROP, 0)
      for (const dx of [-0.1, 0.1]) p.line(dx * k, (y - HEAD_H / 2 - 0.02) * k, dx * k, (y - HEAD_H / 2 - 0.02 - 0.3 * f) * k)
      p.pop()
    }
    solid(p, ink, weight, s.color)
    p.rect(0, y * k, HEAD_W * k, HEAD_H * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, (y + HEAD_H / 2 - 0.03) * k, HEAD_W * k, 0.04 * k)

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
