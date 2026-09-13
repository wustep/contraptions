import { outline, solid } from '../../../../src/core/draw'
import { easeInOutCubic, easeInQuad } from '../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, flick, over, rail, roll, wait, type Lane } from '../parts'

/**
 * A gate across the line and a table of dominoes above it. The ball hits the
 * gate; the gate's push rod knocks the first domino; the row goes over along
 * the table; the last one lands on a lever whose arm pulls a cord over two
 * pulleys; the cord lifts the gate; the ball rolls on underneath the table,
 * past the whole fallen row. Two cells, six links, one ball.
 */
const GATE = 0.0
const GATE_TOP = -0.3
const SEAT = GATE - 0.19
const SHELF = -0.18
const COUNT = 7
const FIRST = 0.16
const GAP = 0.178
const H = 0.26
const W = 0.065
const LEVER_X = FIRST + GAP * COUNT + 0.02
const CORD_Y = -0.47
/** The gate's pulley sits east of it, so the cord hauls the gate up and out of the way. */
const GATE_PULLEY = GATE + 0.3
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
  draw: (p, s, { k, t, since, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, 1.5)

    // The table the row stands on, with its legs.
    outline(p, ink, weight)
    p.line((FIRST - 0.1) * k, SHELF * k, (LEVER_X + 0.16) * k, SHELF * k)
    for (const x of [FIRST + 0.05, LEVER_X - 0.05]) {
      p.line(x * k, SHELF * k, x * k, (FLOOR - 0.02) * k)
    }

    // The cord: from the gate's foot up to a pulley, across, down to the lever.
    outline(p, ink, weight)
    const pull = since < 0 ? 0 : since < OPEN ? over(since, 0, OPEN) : 1 - over(since, RESET - 0.3, RESET)
    p.line(GATE_PULLEY * k, CORD_Y * k, (LEVER_X + 0.08) * k, CORD_Y * k)
    p.line((LEVER_X + 0.08) * k, CORD_Y * k, (LEVER_X + 0.08) * k, (SHELF - 0.1 - 0.16 * pull) * k)
    // Down from the pulley to the gate's foot, wherever the gate has swung to.
    const gateLift = since < 0 ? 0 : since < OPEN ? easeInOutCubic(over(since, 0, OPEN)) : 1 - easeInOutCubic(over(since, RESET - 0.3, RESET))
    const gateLen = FLOOR - GATE_TOP - 0.03
    const footX = GATE + Math.sin(1.35 * gateLift) * gateLen
    const footY = GATE_TOP + Math.cos(1.35 * gateLift) * gateLen
    p.line(GATE_PULLEY * k, CORD_Y * k, footX * k, footY * k)
    solid(p, ink, weight, s.color)
    p.circle(GATE_PULLEY * k, CORD_Y * k, 0.06 * k)
    p.circle((LEVER_X + 0.08) * k, CORD_Y * k, 0.06 * k)

    // The lever on the table's end: an L, hinged at its corner. The last
    // domino lands on the flat arm; the tall arm swings and hauls the cord.
    p.push()
    p.translate((LEVER_X + 0.08) * k, SHELF * k)
    p.rotate(-0.5 * pull)
    outline(p, ink, weight)
    p.line(0, 0, -0.14 * k, 0)
    p.line(0, 0, 0, -0.26 * k)
    solid(p, ink, weight, s.color)
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

    // The gate: a bar hinged at its top, swung up and out of the way by the
    // cord. Its push rod runs from its foot up to the first domino.
    const lift = gateLift
    const nudge = t < ARRIVE ? 0 : flick(t - ARRIVE, 0.05, 0.1, 0.5) * 0.04
    p.push()
    p.translate((GATE + nudge) * k, GATE_TOP * k)
    p.rotate(-1.35 * lift)
    outline(p, ink, weight)
    p.line(0, 0, 0, (FLOOR - GATE_TOP) * k)
    solid(p, ink, weight, s.color)
    p.rect(0, ((FLOOR - GATE_TOP) / 2) * k, 0.06 * k, (FLOOR - GATE_TOP - 0.02) * k)
    p.pop()
    outline(p, ink, weight)
    p.line(GATE * k, -0.5 * k, GATE * k, GATE_TOP * k)
    solid(p, ink, weight, s.color)
    p.circle(GATE * k, GATE_TOP * k, 0.05 * k)
    // The push rod, from the gate up to the first domino's foot.
    outline(p, ink, weight)
    p.line((GATE + 0.04 + nudge) * k, -0.06 * k, (FIRST - 0.04 + nudge) * k, (SHELF - 0.05) * k)
  },
})
