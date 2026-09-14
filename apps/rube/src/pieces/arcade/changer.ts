import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, over, rail, ramp, roll, wait, type BallChange, type Lane } from '../../parts'
import { cabinet, digits, flash, lamp, marquee } from './neon'

/**
 * A change machine standing across the lane. The rail runs into a coin
 * slot in its side; the ball rolls in and is gone; the machine chunks and
 * shakes and its display ticks over — and a token drops out of the return
 * flap on the far side: a different ball, a different colour, and the
 * thread goes with it. The lights chase for a while after.
 */
const SLOT = -0.16
const FLAP = 0.18
const T_SLOT = (0.5 + SLOT) / ROLL
const IN = 0.1
const CHUNK = 0.45
const OUT = 0.1
const FIRE = T_SLOT + IN + CHUNK

export const changer = definePiece<{ color: string; token: string }>({
  name: 'changer',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const pool = theme.colors.filter((c) => c !== ball.color && c !== color)
    const token = rng.pick(pool.length ? pool : theme.colors)
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SLOT, 0], ROLL),
        { from: [SLOT, 0], to: [0, 0], dur: IN, hidden: true },
        wait([0, 0], CHUNK, { hidden: true }),
        { from: [0, 0], to: [FLAP, 0], dur: OUT, hidden: true },
        ramp([FLAP, 0], [0.5, 0], 1.6, ROLL),
      ],
      fire: FIRE,
    }
    const changes: BallChange[] = [{ at: FIRE, relay: true, color: token }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, token }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The chunk: the machine shakes while it works, and the display flips at the fire.
    const working = t > T_SLOT + IN && since < 0
    const shake = working ? 0.012 * Math.sin(t * 60) : 0
    const credit = since < 0 ? 0 : 1

    rail(p, k, ink, weight, -0.5, SLOT - 0.02)
    rail(p, k, ink, weight, FLAP + 0.02, 0.5)
    p.push()
    p.translate(shake * k, 0)
    // The cabinet, the rail's height and taller, standing on the floor.
    cabinet(p, k, ink, weight, s.color, 0, -0.48, 0.5, 0.36)
    // The display, with the credit count in it.
    solid(p, ink, weight, ink)
    p.rect(0, -0.32 * k, 0.24 * k, 0.12 * k, 0.01 * k)
    digits(p, k, credit ? s.token : bg, 0, -0.32, credit ? '01' : '00', 0.02)
    // The slot on the near side, the flap on the far side, both at the rail's height.
    solid(p, ink, weight, ink)
    p.rect((SLOT + 0.02) * k, -0.02 * k, 0.04 * k, 0.16 * k)
    outline(p, ink, weight)
    p.line((SLOT + 0.06) * k, -0.14 * k, (SLOT + 0.06) * k, -0.2 * k)
    p.line((SLOT + 0.03) * k, -0.17 * k, (SLOT + 0.06) * k, -0.2 * k)
    p.line((SLOT + 0.09) * k, -0.17 * k, (SLOT + 0.06) * k, -0.2 * k)
    p.push()
    p.translate((FLAP - 0.02) * k, -0.1 * k)
    p.rotate(since > -0.02 && since < 0.4 ? 0.9 : 0)
    solid(p, ink, weight, bg)
    p.rect(0, 0.08 * k, 0.05 * k, 0.16 * k, 0.01 * k)
    p.pop()
    // A row of marquee lamps along the top, chasing after the payout; a lamp that comes on at the chunk.
    marquee(p, k, ink, weight, s.token, bg, -0.14, 0.14, -0.44, 5, since, since > 0 && since < 2)
    lamp(p, k, ink, weight, s.token, bg, 0.11, -0.18, 0.03, working ? (Math.floor(t * 8) % 2 ? 1 : 0) : credit ? 1 - over(since, 1, 2) : 0)
    p.pop()
    // The clink as the token drops.
    flash(p, k, s.token, weight, FLAP + 0.06, FLOOR - 0.06, since, 0.25, 0.06, 0.2)
  },
})
