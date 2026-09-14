import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'

/**
 * An Archimedes' screw. The ball rolls into the foot of a glass tube; the
 * pawl lets the weight go; the weight falls and turns the screw, and the
 * thread carries the ball up the tube, in view the whole way, to the rail
 * a floor above. The weight is winched back up later.
 */
const FOOT: Pt = [-0.12, 0.06]
const HEAD: Pt = [1.1, -0.94]
const BORE = 0.18
const ARRIVE = arriveAt(FOOT[0])
const LATCH = 0.3
const RIDE = 1.7
const FIRE = ARRIVE + LATCH
const RESET = 2.5
const PITCH = 0.16
const WEIGHT_X = 1.36

export const screw = definePiece<{ color: string }>({
  name: 'screw',
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [FOOT[0], 0]),
        wait([FOOT[0], 0], LATCH),
        { from: [FOOT[0], 0], to: [HEAD[0], -1], dur: RIDE, ease: 'inout' },
        ramp([HEAD[0], -1], [1.5, -1], 0.8, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const dx = HEAD[0] - FOOT[0]
    const dy = HEAD[1] - FOOT[1]
    const len = Math.hypot(dx, dy)
    const ang = Math.atan2(dy, dx)
    // How far the thread has run, in cells along the tube.
    const run = since < 0 ? 0 : since < RIDE ? len * easeInOutSine(over(since, 0, RIDE)) : len
    const fallen = since < 0 ? 0 : since < RIDE ? easeInOutSine(over(since, 0, RIDE)) : since < RESET ? 1 : 1 - easeInOutSine(over(since, RESET, RESET + 1.5))

    // The rails: in at the foot, out at the head.
    rail(p, k, ink, weight, -0.5, FOOT[0] - 0.1)
    rail(p, k, ink, weight, HEAD[0] + 0.1, 1.5, -1 + FLOOR)
    // The stand: legs from the tube to the ground.
    outline(p, ink, weight)
    for (const f of [0.3, 0.7]) {
      const x = FOOT[0] + dx * f
      const y = FOOT[1] + dy * f + BORE
      p.line(x * k, y * k, x * k, 0.5 * k)
      p.line((x - 0.06) * k, 0.5 * k, (x + 0.06) * k, 0.5 * k)
    }
    // The glass tube: a paper bar with the thread inside, behind the ball.
    p.push()
    p.translate(FOOT[0] * k, FOOT[1] * k)
    p.rotate(ang)
    solid(p, ink, weight, bg)
    p.rect((len / 2) * k, 0, (len + 0.1) * k, BORE * 2 * k, 0.06 * k)
    outline(p, ink, weight)
    p.line(-0.02 * k, 0, (len + 0.02) * k, 0)
    p.push()
    p.stroke(s.color)
    p.strokeWeight(weight)
    for (let i = -1; i < len / PITCH + 1; i++) {
      const at = (((i * PITCH + run) % (len + PITCH)) + len + PITCH) % (len + PITCH) - PITCH / 2
      if (at < 0.02 || at > len - 0.02) continue
      p.line((at - 0.05) * k, -BORE * 0.8 * k, (at + 0.05) * k, BORE * 0.8 * k)
    }
    p.pop()
    p.pop()
    // The drum at the head, the cord, and the weight beside the tube.
    const wy = lerp(HEAD[1] - 0.2, 0.28, easeInQuad(fallen))
    outline(p, ink, weight)
    p.line(WEIGHT_X * k, HEAD[1] * k, WEIGHT_X * k, (wy - 0.1) * k)
    p.line((HEAD[0] + 0.1) * k, (HEAD[1] - 0.06) * k, WEIGHT_X * k, HEAD[1] * k)
    p.line(WEIGHT_X * k, 0.5 * k, WEIGHT_X * k, (HEAD[1] + 0.02) * k)
    p.line((WEIGHT_X - 0.06) * k, 0.5 * k, (WEIGHT_X + 0.06) * k, 0.5 * k)
    solid(p, ink, weight, bg)
    p.circle((HEAD[0] + 0.02) * k, (HEAD[1] - 0.02) * k, 0.12 * k)
    p.push()
    p.translate((HEAD[0] + 0.02) * k, (HEAD[1] - 0.02) * k)
    p.rotate(run / 0.06)
    outline(p, ink, weight)
    p.line(-0.04 * k, 0, 0.04 * k, 0)
    p.line(0, -0.04 * k, 0, 0.04 * k)
    p.pop()
    // The pawl that holds the weight, flipped at the fire.
    const pawl = since < 0 ? 0 : since < RESET ? 1 : 1 - over(since, RESET + 1.3, RESET + 1.5)
    p.push()
    p.translate((WEIGHT_X - 0.1) * k, (HEAD[1] + 0.1) * k)
    p.rotate(-0.8 * pawl)
    outline(p, ink, weight)
    p.line(0, 0, 0.1 * k, 0)
    p.pop()
    solid(p, ink, weight, s.color)
    p.rect(WEIGHT_X * k, wy * k, 0.14 * k, 0.2 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(WEIGHT_X * k, (wy - 0.05) * k, 0.14 * k, 0.03 * k)
  },
})
