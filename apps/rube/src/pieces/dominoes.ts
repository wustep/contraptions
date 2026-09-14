import { outline, solid } from '../../../../src/core/draw'
import { easeInOutCubic, easeInQuad } from '../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, flick, over, rail, roll, wait, type Lane } from '../parts'

/**
 * A gate across the line and a table of dominoes above it. The ball hits the
 * gate; the gate's push rod knocks the first domino; the row goes over along
 * the table; the last one lands on a bell-crank at the table's end whose
 * tall arm hauls a cord over two pulleys; the cord lifts the gate straight
 * up its post like a portcullis; the ball rolls on underneath the table,
 * past the whole fallen row. Two cells, six links, one ball.
 */
const GATE = 0.0
const GATE_TOP = -0.2
/** How far the portcullis rises: clear of the ball, inside the cell. */
const RISE = 0.3
const SEAT = GATE - 0.19
const SHELF = -0.18
const COUNT = 6
const FIRST = 0.16
const GAP = 0.178
const H = 0.26
const W = 0.065
/** The bell-crank's pivot on the table's end, its two arms, and the pulley its tall arm pulls from. */
const PIVOT_X = FIRST + GAP * COUNT + 0.06
const ARM_FLAT = 0.2
const ARM_TALL = 0.22
const PULLEY_X = PIVOT_X + 0.14
const POST_X = PIVOT_X + 0.18
const CORD_Y = -0.47
const THROW = 0.55
/** Seconds after entry. */
const ARRIVE = (0.5 + SEAT) / ROLL
const PUSH = 0.06
const FALL_ONE = 0.09
const LEAD = 0.055
const WAVE = LEAD * (COUNT - 1) + FALL_ONE
const TRIP = ARRIVE + PUSH + WAVE
const OPEN = 0.22
const RESET = 3

export const dominoes = definePiece<{ color: string }>({
  name: 'dominoes',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: [number, number][] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [roll([-0.5, 0], [SEAT, 0], ROLL), wait([SEAT, 0], TRIP + OPEN - ARRIVE), roll([SEAT, 0], [1.5, 0], ROLL)],
      fire: TRIP,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 1.5)
    const pull = since < 0 ? 0 : since < OPEN ? over(since, 0, OPEN) : 1 - over(since, RESET - 0.3, RESET)
    const throwAngle = -THROW * easeInOutCubic(pull)

    // The table the row stands on, with its legs.
    outline(p, ink, weight)
    p.line((FIRST - 0.1) * k, SHELF * k, POST_X * k, SHELF * k)
    for (const x of [FIRST + 0.05, PIVOT_X + 0.08]) {
      p.line(x * k, SHELF * k, x * k, (FLOOR - 0.02) * k)
    }

    // The beam the pulleys hang from, between the gate's guide and a post on the table's end.
    p.line((GATE - 0.05) * k, (CORD_Y - 0.06) * k, POST_X * k, (CORD_Y - 0.06) * k)
    p.line(POST_X * k, (CORD_Y - 0.06) * k, POST_X * k, SHELF * k)
    // The cord: from the gate's top up to a pulley, across, over the second
    // pulley and down to the tall arm's tip, which swings away and hauls it.
    const gateLift = since < 0 ? 0 : since < OPEN ? easeInOutCubic(over(since, 0, OPEN)) : 1 - easeInOutCubic(over(since, RESET - 0.3, RESET))
    const tipX = PIVOT_X - ARM_TALL * Math.sin(-throwAngle)
    const tipY = SHELF - ARM_TALL * Math.cos(throwAngle)
    p.line(GATE * k, CORD_Y * k, PULLEY_X * k, CORD_Y * k)
    p.line(PULLEY_X * k, CORD_Y * k, tipX * k, tipY * k)
    p.line(GATE * k, CORD_Y * k, GATE * k, (GATE_TOP - RISE * gateLift) * k)
    solid(p, ink, weight, s.color)
    p.circle(GATE * k, CORD_Y * k, 0.06 * k)
    p.circle(PULLEY_X * k, CORD_Y * k, 0.06 * k)

    // The bell-crank on the table's end: a solid L on a pin. The last
    // domino lands on the flat arm; the tall arm swings and hauls the cord.
    p.push()
    p.translate(PIVOT_X * k, SHELF * k)
    p.rotate(throwAngle)
    solid(p, ink, weight, s.color)
    p.rect((-ARM_FLAT / 2) * k, 0, ARM_FLAT * k, 0.055 * k, 0.015 * k)
    p.rect(0, (-ARM_TALL / 2) * k, 0.055 * k, ARM_TALL * k, 0.015 * k)
    solid(p, ink, weight, bg)
    p.circle(0, 0, 0.05 * k)
    p.pop()

    // The dominoes. Each falls when the one before reaches it; they stand
    // back up from the far end once the ball is long gone.
    const wave0 = ARRIVE + PUSH
    for (let i = 0; i < COUNT; i++) {
      const x = FIRST + GAP * i
      const start = wave0 + i * LEAD
      const fallen = easeInQuad(over(t, start, start + FALL_ONE))
      const riseAt = RESET + 0.6 + (COUNT - 1 - i) * 0.08
      const rise = easeInOutCubic(over(t, riseAt, riseAt + 0.25))
      const last = i === COUNT - 1
      p.push()
      p.translate(x * k, SHELF * k)
      p.rotate((last ? 1.1 : 0.9) * fallen * (1 - rise))
      solid(p, ink, weight, s.color)
      p.rect(0, (-H / 2) * k, W * k, H * k)
      p.fill(ink)
      p.noStroke()
      p.circle(0, (-H * 0.7) * k, 0.025 * k)
      p.circle(0, (-H * 0.3) * k, 0.025 * k)
      p.pop()
    }

    // The gate: a bar in a guide, hauled straight up by the cord. It gives
    // a little when the ball hits it, and that nudge is what the push rod
    // carries up to the first domino's foot.
    const nudge = t < ARRIVE ? 0 : flick(t - ARRIVE, 0.05, 0.1, 0.5) * 0.04
    const top = GATE_TOP - RISE * gateLift
    const gateH = FLOOR - GATE_TOP - 0.02
    outline(p, ink, weight)
    p.line((GATE - 0.05) * k, -0.5 * k, (GATE - 0.05) * k, (FLOOR - 0.02) * k)
    solid(p, ink, weight, s.color)
    p.rect((GATE + nudge) * k, (top + 0.01 + gateH / 2) * k, 0.06 * k, gateH * k)
    p.fill(ink)
    p.noStroke()
    p.rect((GATE + nudge) * k, (top + 0.03) * k, 0.08 * k, 0.04 * k)
    // The push rod, from the gate up to the first domino's foot.
    outline(p, ink, weight)
    p.line((GATE + 0.04 + nudge) * k, (top + 0.12) * k, (FIRST - 0.04 + nudge) * k, (SHELF - 0.05) * k)
  },
})
