import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine, lerp } from '../../../../src/core/ease'
import { FALL, FLOOR, R, ROLL, definePiece, fall, fly, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * An electromagnet on a gantry. The ball rolls into a dimple under the
 * trolley; the magnet comes down on its cable, blinks, and takes it; the
 * trolley hauls it two cells along the beam, stops, thinks about it, and
 * lets go. The ball drops onto the rail and carries on as if nothing had
 * happened. Three cells wide, two tall, and most of it is waiting.
 */
const SEAT = 0.2
const DROP_X = 1.9
const BEAM_Y = -1.05
const HIGH = -0.55
const MAG_H = 0.14
const ARRIVE = (0.5 + SEAT) / ROLL
const GRAB = 0.4
const RISE = 0.5
const TRAVEL = 1.1
const THINK = 0.35
const T_RISE = ARRIVE + GRAB
const T_MOVE = T_RISE + RISE
const T_THINK = T_MOVE + TRAVEL
const T_DROP = T_THINK + THINK
const RETURN = 1.6

export const crane = definePiece<{ color: string }>({
  name: 'crane',
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, -1],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, 0])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SEAT, 0.03], ROLL, 'out'),
        wait([SEAT, 0.03], GRAB),
        { from: [SEAT, 0.03], to: [SEAT, HIGH], dur: RISE, ease: 'inout' },
        { from: [SEAT, HIGH], to: [DROP_X, HIGH], dur: TRAVEL, ease: 'inout' },
        wait([DROP_X, HIGH], THINK),
        fall([DROP_X, HIGH], [DROP_X, 0], FALL),
        fly([DROP_X, 0], [DROP_X + 0.2, 0], 0.1, 0.05),
        roll([DROP_X + 0.2, 0], [2.5, 0], ROLL, 'out'),
      ],
      fire: T_DROP,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The trolley's place on the beam, and the magnet's height under it.
    const trolleyX =
      t < T_MOVE ? SEAT
      : t < T_THINK ? lerp(SEAT, DROP_X, easeInOutSine(over(t, T_MOVE, T_THINK)))
      : t < T_DROP + RETURN ? DROP_X
      : lerp(DROP_X, SEAT, easeInOutSine(over(t, T_DROP + RETURN, T_DROP + RETURN + 1.5)))
    const down = -R - MAG_H / 2 + 0.03
    const up = HIGH - R - MAG_H / 2
    const magY =
      t < ARRIVE + 0.03 ? up
      : t < ARRIVE + 0.28 ? lerp(up, down, easeInOutSine(over(t, ARRIVE + 0.03, ARRIVE + 0.28)))
      : t < T_RISE ? down
      : t < T_MOVE ? lerp(down, up, easeInOutSine(over(t, T_RISE, T_MOVE)))
      : up
    const holding = t >= ARRIVE + 0.28 && t < T_DROP
    const blink = ((t * 5) % 1) < 0.5
    const lit = (t > ARRIVE + 0.2 && t < T_RISE) || (t > T_THINK && t < T_DROP) ? blink : holding

    // The pylons stand behind the rail; the beam sits on them.
    outline(p, ink, weight)
    for (const x of [-0.3, 2.3]) {
      p.line(x * k, 0.5 * k, x * k, (BEAM_Y + 0.05) * k)
      p.line((x - 0.1) * k, 0.5 * k, (x + 0.1) * k, 0.5 * k)
    }
    p.line(-0.42 * k, BEAM_Y * k, 2.42 * k, BEAM_Y * k)
    p.line(-0.42 * k, (BEAM_Y + 0.07) * k, 2.42 * k, (BEAM_Y + 0.07) * k)
    for (const x of [-0.42, 2.42]) p.line(x * k, (BEAM_Y - 0.06) * k, x * k, (BEAM_Y + 0.13) * k)

    // The rail, with the dimple the ball waits in and a landing mat.
    rail(p, k, ink, weight, -0.5, SEAT - 0.16)
    outline(p, ink, weight)
    p.line((SEAT - 0.16) * k, FLOOR * k, (SEAT - 0.08) * k, (FLOOR + 0.03) * k)
    p.line((SEAT - 0.08) * k, (FLOOR + 0.03) * k, (SEAT + 0.08) * k, (FLOOR + 0.03) * k)
    p.line((SEAT + 0.08) * k, (FLOOR + 0.03) * k, (SEAT + 0.16) * k, FLOOR * k)
    rail(p, k, ink, weight, SEAT + 0.16, 2.5)
    solid(p, ink, weight, s.color)
    p.rect(DROP_X * k, (FLOOR + 0.06) * k, 0.34 * k, 0.07 * k)

    // The trolley: a box on two wheels on the beam, and its cable.
    solid(p, ink, weight, s.color)
    p.rect(trolleyX * k, (BEAM_Y + 0.2) * k, 0.26 * k, 0.16 * k, 0.02 * k)
    for (const dx of [-0.08, 0.08]) {
      solid(p, ink, weight, bg)
      p.circle((trolleyX + dx) * k, (BEAM_Y + 0.03) * k, 0.09 * k)
    }
    outline(p, ink, weight)
    p.line(trolleyX * k, (BEAM_Y + 0.28) * k, trolleyX * k, (magY - MAG_H / 2) * k)

    // The magnet: a horseshoe on its side, a pole stripe, and a lamp that
    // blinks while it makes up its mind.
    solid(p, ink, weight, s.color)
    p.rect(trolleyX * k, magY * k, 0.32 * k, MAG_H * k, 0.04 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(trolleyX * k, (magY + MAG_H / 2 - 0.025) * k, 0.32 * k, 0.03 * k)
    for (const dx of [-0.1, 0.1]) p.rect((trolleyX + dx) * k, (magY + MAG_H / 2 + 0.01) * k, 0.06 * k, 0.03 * k)
    solid(p, ink, weight, lit ? s.color : bg)
    p.circle(trolleyX * k, (magY - MAG_H / 2 - 0.04) * k, 0.05 * k)
    // Field lines while it holds.
    if (holding) {
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * 0.8)
      for (const dx of [-0.22, 0.22]) {
        p.arc((trolleyX + dx) * k, (magY + MAG_H / 2 + 0.08) * k, 0.12 * k, 0.16 * k, dx < 0 ? Math.PI * 0.6 : -Math.PI * 0.4, dx < 0 ? Math.PI * 1.4 : Math.PI * 0.4)
      }
      p.pop()
    }
  },
})
