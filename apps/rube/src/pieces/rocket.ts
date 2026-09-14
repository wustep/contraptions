import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad, lerp } from '../../../../src/core/ease'
import { FAST, FLOOR, ROLL, burst, definePiece, fly, over, puff, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A rocket sled. The ball drops into the cup on the sled and its weight
 * presses the button; the rocket sputters, catches, and the sled goes down
 * the track like it was shot; the buffer stops the sled and nothing stops
 * the ball, which flies out of the cup and rolls on. The sled stays where
 * it hit, smoking.
 */
const CUP: Pt = [0.05, -0.06]
const STOP = 2.0
const ARRIVE = (0.5 + CUP[0]) / ROLL
const IGNITE = 0.55
const BURN = 0.55
const FIRE = ARRIVE + IGNITE

export const rocket = definePiece<{ color: string }>({
  name: 'rocket',
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
        roll([-0.5, 0], CUP, ROLL, 'out'),
        wait(CUP, IGNITE),
        { from: CUP, to: [STOP + CUP[0], CUP[1]], dur: BURN, ease: 'in' },
        fly([STOP + CUP[0], CUP[1]], [2.42, 0], 0.13, 0.06),
        roll([2.42, 0], [2.5, 0], FAST),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const sledX = since < 0 ? 0 : since < BURN ? lerp(0, STOP, easeInQuad(over(since, 0, BURN))) : STOP - 0.04 * Math.exp(-(since - BURN) * 6) * Math.cos((since - BURN) * 40)

    // The track: a rail with sleepers, and the buffer at the far end.
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, 2.5 * k, FLOOR * k)
    for (let x = -0.4; x < 2.5; x += 0.25) p.line(x * k, (FLOOR + 0.03) * k, x * k, (FLOOR + 0.09) * k)
    solid(p, ink, weight, s.color)
    p.rect(2.34 * k, (FLOOR - 0.12) * k, 0.1 * k, 0.24 * k)
    outline(p, ink, weight)
    p.line(2.34 * k, FLOOR * k, 2.34 * k, 0.5 * k)
    // The buffer's spring, compressed by the hit.
    const squash = since < BURN ? 0 : Math.max(0, 1 - over(since, BURN, BURN + 0.5)) * 0.6
    const springX0 = 2.29
    const springX1 = STOP + 0.24 + 0.05 * (1 - squash) - 0.03 * squash
    p.beginShape()
    const coils = 5
    for (let i = 0; i <= coils * 2; i++) {
      const f = i / (coils * 2)
      p.vertex(lerp(springX0, springX1, f) * k, (FLOOR - 0.06 + (i % 2 ? 0.05 : -0.05)) * k)
    }
    p.endShape()

    // Smoke, behind the sled.
    if (since > 0 && since < 1.8) {
      const f = over(since, 0, 1.8)
      for (let i = 0; i < 3; i++) {
        const back = Math.min(since, BURN)
        const x = lerp(0, STOP, easeInQuad(back / BURN)) - 0.35 - i * 0.28 - f * 0.4
        const y = -0.05 - f * 0.25 * (i + 1) * 0.5
        const r = (0.05 + 0.09 * f) * (1 - i * 0.2)
        if (x > -0.45 && f < 0.95) puff(p, k, ink, weight, bg, x, y, r)
      }
    }

    // The sled: a bed on two wheels, a cup for the ball, and a rocket on
    // the back with its button.
    p.push()
    p.translate(sledX * k, 0)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR - 0.07) * k, 0.56 * k, 0.06 * k)
    for (const dx of [-0.18, 0.18]) {
      solid(p, ink, weight, bg)
      p.circle(dx * k, (FLOOR - 0.02) * k, 0.08 * k)
      p.push()
      p.translate(dx * k, (FLOOR - 0.02) * k)
      p.rotate(sledX / 0.04)
      outline(p, ink, weight)
      p.line(-0.03 * k, 0, 0.03 * k, 0)
      p.pop()
    }
    // The cup: two horns the ball sits between.
    outline(p, ink, weight)
    p.line((CUP[0] - 0.15) * k, (FLOOR - 0.1) * k, (CUP[0] - 0.15) * k, (CUP[1] - 0.02) * k)
    p.line((CUP[0] + 0.15) * k, (FLOOR - 0.1) * k, (CUP[0] + 0.15) * k, (CUP[1] + 0.02) * k)
    // The button under the cup, pressed by the ball.
    const pressed = t < ARRIVE ? 0 : 1
    solid(p, ink, weight, s.color)
    p.rect(CUP[0] * k, (FLOOR - 0.1 + pressed * 0.015) * k, 0.1 * k, 0.03 * k)
    // The rocket: a fat cylinder on the back, nose east, fins, nozzle west.
    const rx = -0.3
    const ry = -0.12
    solid(p, ink, weight, s.color)
    p.triangle((rx - 0.06) * k, (ry - 0.07) * k, (rx - 0.18) * k, (ry - 0.16) * k, (rx - 0.16) * k, (ry - 0.02) * k)
    p.triangle((rx - 0.06) * k, (ry + 0.07) * k, (rx - 0.18) * k, (ry + 0.16) * k, (rx - 0.16) * k, (ry + 0.02) * k)
    p.rect(rx * k, ry * k, 0.3 * k, 0.15 * k, 0.04 * k)
    solid(p, ink, weight, bg)
    p.triangle((rx + 0.14) * k, (ry - 0.075) * k, (rx + 0.14) * k, (ry + 0.075) * k, (rx + 0.28) * k, ry * k)
    p.circle((rx + 0.02) * k, ry * k, 0.06 * k)
    outline(p, ink, weight)
    p.line((rx - 0.15) * k, (ry - 0.05) * k, (rx - 0.2) * k, (ry - 0.08) * k)
    p.line((rx - 0.15) * k, (ry + 0.05) * k, (rx - 0.2) * k, (ry + 0.08) * k)
    p.line((rx - 0.15) * k, (ry - 0.05) * k, (rx - 0.15) * k, (ry + 0.05) * k)
    // Sputter while it catches; flame while it burns.
    if (t > ARRIVE + 0.1 && since < 0) {
      const f = over(t, ARRIVE + 0.1, FIRE)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, (rx - 0.22) * k, ry * k, 0.02 * k, (0.03 + 0.06 * f) * k, 5, t * 30)
      p.pop()
    }
    if (since > 0 && since < BURN + 0.15) {
      const f = 1 - over(since, BURN, BURN + 0.15)
      const flick = 0.85 + 0.15 * Math.sin(t * 60)
      const len = 0.42 * f * flick
      solid(p, ink, weight, s.color)
      p.triangle((rx - 0.2) * k, (ry - 0.07) * k, (rx - 0.2) * k, (ry + 0.07) * k, (rx - 0.2 - len) * k, ry * k)
      p.fill(bg)
      p.triangle((rx - 0.2) * k, (ry - 0.035) * k, (rx - 0.2) * k, (ry + 0.035) * k, (rx - 0.2 - len * 0.5) * k, ry * k)
    }
    p.pop()
    // The sled and the ball leave a cloud of dust where they met the buffer.
    if (since > BURN && since < BURN + 0.3) {
      const f = over(since, BURN, BURN + 0.3)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      burst(p, (STOP + 0.28) * k, (FLOOR - 0.05) * k, (0.04 + 0.1 * f) * k, (0.08 + 0.16 * f) * k, 6, 0.4)
      p.pop()
    }
  },
})
