import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, rail, ramp, roll, wait, type BallChange, type Lane, type PieceCtx } from '../../parts'
import { cabinet, display, flash, lamp, marquee } from './neon'

/**
 * A change machine standing across the lane. The rail runs into a coin
 * slot in its side; the ball rolls in and is gone; the machine chunks and
 * shakes and its display ticks over — and a token drops out of the return
 * flap on the far side: a different ball, a different colour, and the
 * thread goes with it. The lights chase for a while after.
 *
 * The cabinet stands in front of the ball, so it goes *into* the slot and
 * the token comes *out* of the flap, pushing it open on the way.
 */
const HALF = 0.18
const SLOT = -0.16
const FLAP = 0.18
const T_SLOT = (0.5 + SLOT) / ROLL
/** The ball is out of sight once its back is inside the cabinet's edge, and in sight again once its front is past it. */
const GONE = -HALF + R
const BACK = HALF - R
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
    // The token is never the colour the ball arrives in — nor the cabinet's, when there is a choice; with nothing else to offer, the changer stays out of the map.
    const others = theme.colors.filter((c) => c !== ball.color)
    if (!others.length) return null
    const pool = others.filter((c) => c !== color)
    const token = rng.pick(pool.length ? pool : others)
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [GONE, 0], ROLL),
        { from: [GONE, 0], to: [0, 0], dur: IN, hidden: true },
        wait([0, 0], CHUNK, { hidden: true }),
        { from: [0, 0], to: [BACK, 0], dur: OUT * 0.3, hidden: true },
        ramp([BACK, 0], [FLAP + 0.1, 0], 1.2, 1.6),
        ramp([FLAP + 0.1, 0], [0.5, 0], 1.6, ROLL),
      ],
      fire: FIRE,
    }
    const changes: BallChange[] = [{ at: FIRE, relay: true, color: token }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, token }, changes }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, SLOT - 0.02)
    rail(p, k, ink, weight, FLAP + 0.02, 0.5)
    // The clink as the token drops.
    flash(p, k, s.token, weight, FLAP + 0.06, FLOOR - 0.06, since, 0.2, 0.06, 0.18)
  },
  over: (p, s, c: PieceCtx) => {
    const { k, t, since, ink, bg, weight } = c
    // The chunk: the machine shakes while it works, and the display flips at the fire.
    const working = t > T_SLOT + IN && since < 0
    const shake = working ? 0.012 * Math.sin(t * 60) : 0
    const credit = since < 0 ? 0 : 1
    p.push()
    p.translate(shake * k, 0)
    // The cabinet, the rail's height and taller, standing on the floor.
    cabinet(p, k, ink, weight, s.color, 0, -0.48, 0.5, HALF * 2)
    // The display, dark until the credit lights it in the token's colour.
    display(p, k, ink, weight, bg, 0, -0.32, 0.26, 0.14, credit ? '01' : '00', s.token, !!credit, 0.02)
    // The slot on the near side, at the rail's height, with an arrow to it.
    solid(p, ink, weight, ink)
    p.rect((SLOT + 0.02) * k, -0.02 * k, 0.04 * k, 0.16 * k)
    outline(p, ink, weight)
    p.line((SLOT + 0.06) * k, -0.14 * k, (SLOT + 0.06) * k, -0.2 * k)
    p.line((SLOT + 0.03) * k, -0.17 * k, (SLOT + 0.06) * k, -0.2 * k)
    p.line((SLOT + 0.09) * k, -0.17 * k, (SLOT + 0.06) * k, -0.2 * k)
    // A row of marquee lamps along the top, chasing after the payout; a lamp that comes on at the chunk.
    marquee(p, k, ink, weight, s.token, bg, -0.14, 0.14, -0.44, 5, since, since > 0 && since < 2)
    lamp(p, k, ink, weight, s.token, bg, 0.11, -0.18, 0.03, working ? (Math.floor(t * 8) % 2 ? 1 : 0) : credit ? 1 - over(since, 1, 2) : 0)
    p.pop()
    // The return flap on the far side, hinged at its top: the token pushes
    // it out as it comes, and it swings shut behind.
    const swing = since < 0 ? 0 : since < 0.08 ? easeOutCubic(over(since, 0, 0.08)) : since < 0.35 ? 1 : 1 - easeOutCubic(over(since, 0.35, 0.7))
    p.push()
    p.translate((FLAP - 0.02 + shake) * k, -0.14 * k)
    p.rotate(-1.1 * swing)
    solid(p, ink, weight, bg)
    p.rect(0, 0.1 * k, 0.05 * k, 0.2 * k, 0.01 * k)
    p.pop()
  },
})
