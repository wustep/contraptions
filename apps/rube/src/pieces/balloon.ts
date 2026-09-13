import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A balloon on a mast. The ball rolls into the basket and its weight pulls
 * the pin on the sandbag; the sandbag drops, the balloon is suddenly
 * lighter than it was, and up it goes along the mast — one or two floors
 * — to the stop at the top, where the ball rolls out. The balloon stays
 * up. Nobody comes to fetch it.
 */
export interface BalloonState {
  color: string
  floors: number
  turn: 1 | -1
}

const MAST_X = -0.3
const BASKET_W = 0.3
const ENVELOPE = 0.2
const ARRIVE = 0.5 / ROLL
const PIN = 0.35
const SETTLE = 0.25
const riseTime = (floors: number) => 0.6 + floors * 0.7

export const balloon = definePiece<BalloonState>({
  name: 'balloon',
  weight: 0.8,
  place: ({ rng, color, fits }) => {
    for (const { floors, turn } of rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))) {
      const cells: Pt[] = []
      // The sky cell above the top floor is claimed too: the envelope lives there.
      for (let i = 0; i <= floors + 1; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const lane: Lane = {
        segs: [
          roll([-0.5, 0], [0, 0], ROLL, 'out'),
          wait([0, 0], PIN),
          { from: [0, 0], to: [0, -floors], dur: riseTime(floors), ease: 'inout' },
          wait([0, -floors], SETTLE),
          roll([0, -floors], [turn * 0.5, -floors], ROLL, 'in'),
        ],
        fire: ARRIVE + PIN,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const top = -floors
    const up = since < 0 ? 0 : easeInOutSine(over(since, 0, riseTime(floors)))
    const y = up * top
    // The basket sinks a little under the ball; that is what pulls the pin.
    const sink = t < ARRIVE ? 0 : Math.min(1, over(t, ARRIVE, ARRIVE + 0.1)) * 0.025

    // The mast, its rings, and the stop at the top.
    outline(p, ink, weight)
    p.line(MAST_X * k, 0.5 * k, MAST_X * k, (top - 0.95) * k)
    p.line((MAST_X - 0.12) * k, 0.5 * k, (MAST_X + 0.12) * k, 0.5 * k)
    p.line((MAST_X - 0.06) * k, (top - 0.95) * k, (MAST_X + 0.06) * k, (top - 0.95) * k)
    solid(p, ink, weight, s.color)
    p.rect((MAST_X + 0.05) * k, (top - 0.3) * k, 0.1 * k, 0.05 * k)
    // The landings: rail into the basket, and out of it at the top.
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, (-BASKET_W / 2 - 0.02) * k, FLOOR * k)
    p.line((turn * 0.5) * k, (top + FLOOR) * k, (turn * (BASKET_W / 2 + 0.02)) * k, (top + FLOOR) * k)

    // The sandbag: on its pin beside the basket, then dropped to the ground.
    const bagHang = 0.28
    const bagY = t < ARRIVE + 0.12 ? bagHang : t < ARRIVE + PIN ? lerp(bagHang, 0.42, easeInQuad(over(t, ARRIVE + 0.12, ARRIVE + PIN))) : 0.42
    const dropped = t >= ARRIVE + 0.12
    if (!dropped) {
      outline(p, ink, weight)
      p.line((BASKET_W / 2 + 0.08) * k, (y + FLOOR + 0.02) * k, (BASKET_W / 2 + 0.08) * k, (bagY - 0.07) * k)
    }
    solid(p, ink, weight, s.color)
    p.ellipse((BASKET_W / 2 + 0.08) * k, bagY * k, 0.12 * k, 0.14 * k)
    outline(p, ink, weight)
    p.line((BASKET_W / 2 + 0.05) * k, (bagY - 0.05) * k, (BASKET_W / 2 + 0.11) * k, (bagY - 0.05) * k)

    // The basket: a cup the ball sits in, on a collar round the mast.
    const by = y + sink
    outline(p, ink, weight)
    p.line((MAST_X + 0.05) * k, (by - 0.05) * k, (-BASKET_W / 2) * k, (by - 0.05) * k)
    solid(p, ink, weight, bg)
    p.rect(MAST_X * k, (by - 0.02) * k, 0.1 * k, 0.16 * k)
    solid(p, ink, weight, s.color)
    p.quad((-BASKET_W / 2) * k, (by - R * 0.4) * k, (BASKET_W / 2) * k, (by - R * 0.4) * k, (BASKET_W / 2 - 0.04) * k, (by + FLOOR + 0.05) * k, (-BASKET_W / 2 + 0.04) * k, (by + FLOOR + 0.05) * k)
    // The pin the sandbag hung from, pulled by the basket's sinking.
    p.push()
    p.translate((BASKET_W / 2 + 0.02) * k, (by + FLOOR - 0.02) * k)
    p.rotate(dropped ? 0.7 : 0)
    outline(p, ink, weight)
    p.line(0, 0, 0.1 * k, 0)
    p.pop()

    // The ropes and the envelope above.
    const ey = by - 0.55
    outline(p, ink, weight)
    for (const dx of [-0.11, 0.11]) p.line(dx * k, (by - R * 0.4) * k, (dx * 0.6) * k, (ey + ENVELOPE * 0.8) * k)
    solid(p, ink, weight, s.color)
    p.ellipse(0, ey * k, ENVELOPE * 2 * k, ENVELOPE * 2.3 * k)
    p.triangle(-0.05 * k, (ey + ENVELOPE * 1.05) * k, 0.05 * k, (ey + ENVELOPE * 1.05) * k, 0, (ey + ENVELOPE * 0.8) * k)
    outline(p, ink, weight)
    p.arc(0, ey * k, ENVELOPE * 1.1 * k, ENVELOPE * 2.3 * k, -Math.PI / 2, Math.PI / 2)
    p.arc(0, ey * k, ENVELOPE * 1.1 * k, ENVELOPE * 2.3 * k, Math.PI / 2, Math.PI * 1.5)
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    // The basket's front wall stands between the viewer and the ball.
    const up = since < 0 ? 0 : easeInOutSine(over(since, 0, riseTime(s.floors)))
    const sink = t < ARRIVE ? 0 : Math.min(1, over(t, ARRIVE, ARRIVE + 0.1)) * 0.025
    const by = up * -s.floors + sink
    solid(p, ink, weight, s.color)
    p.quad((-BASKET_W / 2) * k, (by + R * 0.1) * k, (BASKET_W / 2) * k, (by + R * 0.1) * k, (BASKET_W / 2 - 0.04) * k, (by + FLOOR + 0.05) * k, (-BASKET_W / 2 + 0.04) * k, (by + FLOOR + 0.05) * k)
    outline(p, ink, weight * 0.8)
    for (const dx of [-0.06, 0, 0.06]) p.line(dx * k, (by + R * 0.1 + 0.02) * k, dx * k, (by + FLOOR + 0.03) * k)
  },
})
