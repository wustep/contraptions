import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FALL, FLOOR, R, ROLL, arrive, arriveAt, definePiece, fall, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { glow, lamp, marquee } from './neon'

/**
 * A claw machine. The lane runs in through the side of a glass cabinet
 * and stops among the prizes; the claw comes down on its cable, fingers
 * open, and closes on the ball; it goes up, trundles along the gantry to
 * the prize chute, hangs there a moment — and lets go. The ball drops
 * down the chute onto the rail out. Lights chase on the marquee the whole
 * time, and the prizes it left behind stay where they were.
 */
const SEAT = 0.3
const DROP_X = 2.0
const GANTRY_Y = -1.2
const HIGH = -0.62
const ARRIVE = arriveAt(SEAT)
const GRAB = 0.45
const RISE = 0.45
const TRAVEL = 0.9
const THINK = 0.3
const T_RISE = ARRIVE + GRAB
const T_MOVE = T_RISE + RISE
const T_THINK = T_MOVE + TRAVEL
const T_DROP = T_THINK + THINK
const RETURN = 1.8

export const claw = definePiece<{ color: string; prizes: string[] }>({
  name: 'claw',
  weight: 0.9,
  place: ({ rng, color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, -1],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, 0])) return null
    const prizes = [0, 1, 2, 3].map(() => rng.pick(theme.colors))
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [SEAT, 0.02]),
        wait([SEAT, 0.02], GRAB),
        { from: [SEAT, 0.02], to: [SEAT, HIGH], dur: RISE, ease: 'inout' },
        { from: [SEAT, HIGH], to: [DROP_X, HIGH], dur: TRAVEL, ease: 'inout' },
        wait([DROP_X, HIGH], THINK),
        fall([DROP_X, HIGH], [DROP_X, 0], FALL),
        fly([DROP_X, 0], [DROP_X + 0.2, 0], 0.1, 0.05),
        ramp([DROP_X + 0.2, 0], [2.5, 0], 1.5, ROLL),
      ],
      fire: T_DROP,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color, prizes } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The trolley's place on the gantry, and the claw's height and grip.
    const trolleyX =
      t < T_MOVE ? SEAT
      : t < T_THINK ? lerp(SEAT, DROP_X, easeInOutSine(over(t, T_MOVE, T_THINK)))
      : t < T_DROP + RETURN ? DROP_X
      : lerp(DROP_X, SEAT, easeInOutSine(over(t, T_DROP + RETURN, T_DROP + RETURN + 1.5)))
    const down = -R + 0.04
    const up = HIGH - R + 0.04
    const clawY =
      t < ARRIVE + 0.05 ? up
      : t < ARRIVE + 0.3 ? lerp(up, down, easeInOutSine(over(t, ARRIVE + 0.05, ARRIVE + 0.3)))
      : t < T_RISE ? down
      : t < T_MOVE ? lerp(down, up, easeInOutSine(over(t, T_RISE, T_MOVE)))
      : up
    const grip = t < ARRIVE + 0.3 ? 0 : t < T_RISE ? over(t, ARRIVE + 0.3, ARRIVE + 0.42) : t < T_DROP ? 1 : 1 - over(t, T_DROP, T_DROP + 0.1)
    const lit = t > T_DROP && t < T_DROP + 1.5 ? 1 - over(t, T_DROP + 0.8, T_DROP + 1.5) : 0

    // The cabinet: glass from the floor to the marquee, with the lane running in through its side.
    solid(p, ink, weight, bg)
    p.rect(1 * k, ((GANTRY_Y - 0.15 + 0.5) / 2) * k, 2.8 * k, (0.5 - GANTRY_Y + 0.15) * k)
    outline(p, ink, weight * 0.6)
    p.line(-0.3 * k, -0.9 * k, 0.1 * k, -1.3 * k)
    p.line(-0.2 * k, -0.9 * k, 0.2 * k, -1.3 * k)
    // The rail in, through the cabinet's side, to the dimple; the chute's rail out.
    rail(p, k, ink, weight, -0.5, SEAT - 0.16)
    outline(p, ink, weight)
    p.line((SEAT - 0.16) * k, FLOOR * k, (SEAT - 0.08) * k, (FLOOR + 0.03) * k)
    p.line((SEAT - 0.08) * k, (FLOOR + 0.03) * k, (SEAT + 0.08) * k, (FLOOR + 0.03) * k)
    p.line((SEAT + 0.08) * k, (FLOOR + 0.03) * k, (SEAT + 0.16) * k, FLOOR * k)
    rail(p, k, ink, weight, SEAT + 0.16, 0.7)
    rail(p, k, ink, weight, DROP_X - 0.24, 2.5)
    // The prizes: a heap of soft things on the cabinet floor between the dimple and the chute.
    for (let i = 0; i < 4; i++) {
      const px = 0.85 + i * 0.26
      solid(p, ink, weight, s.prizes[i])
      p.ellipse(px * k, (FLOOR + 0.1 + (i % 2) * 0.04) * k, 0.2 * k, 0.16 * k)
      solid(p, ink, weight, bg)
      p.circle((px - 0.04) * k, (FLOOR + 0.06 + (i % 2) * 0.04) * k, 0.04 * k)
      p.circle((px + 0.04) * k, (FLOOR + 0.06 + (i % 2) * 0.04) * k, 0.04 * k)
    }
    // The chute: walls either side of the drop, with a lamp.
    outline(p, ink, weight)
    for (const x of [DROP_X - 0.24, DROP_X + 0.24]) p.line(x * k, (FLOOR - 0.1) * k, x * k, -0.4 * k)
    glow(p, k, s.color, DROP_X, -0.5, 0.2, lit)
    lamp(p, k, ink, weight, s.color, bg, DROP_X, -0.5, 0.04, lit)
    // The gantry and the trolley on it, the cable, and the claw.
    solid(p, ink, weight, s.color)
    p.rect(1 * k, (GANTRY_Y + 0.03) * k, 2.8 * k, 0.07 * k)
    solid(p, ink, weight, s.color)
    p.rect(trolleyX * k, (GANTRY_Y + 0.14) * k, 0.24 * k, 0.14 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(trolleyX * k, (GANTRY_Y + 0.21) * k, trolleyX * k, (clawY - 0.1) * k)
    // The claw: a hub and three fingers, open wide or closed round the ball.
    solid(p, ink, weight, s.color)
    p.circle(trolleyX * k, (clawY - 0.06) * k, 0.12 * k)
    outline(p, ink, weight * 1.2)
    p.noFill()
    for (const side of [-1, 0, 1]) {
      const spread = side === 0 ? 0 : side * (0.9 - 0.55 * grip)
      p.push()
      p.translate(trolleyX * k, (clawY - 0.02) * k)
      p.rotate(spread)
      p.arc(0, 0.06 * k, 0.32 * k, 0.32 * k, Math.PI * 0.35, Math.PI * 0.65)
      p.pop()
    }
    // The marquee across the top, chasing always; brighter after the drop.
    solid(p, ink, weight, s.color)
    p.rect(1 * k, (GANTRY_Y - 0.08) * k, 2.9 * k, 0.16 * k, 0.02 * k)
    marquee(p, k, ink, weight, s.color, bg, -0.3, 2.3, GANTRY_Y - 0.08, 10, t, true)
    // The controls: a joystick and a button on the front, below the rail line.
    solid(p, ink, weight, ink)
    p.rect(1.3 * k, 0.4 * k, 0.4 * k, 0.12 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(1.2 * k, 0.34 * k, 1.16 * k, 0.24 * k)
    solid(p, ink, weight, s.color)
    p.circle(1.16 * k, 0.22 * k, 0.06 * k)
    p.circle(1.4 * k, 0.34 * k, 0.06 * k)
  },
})
