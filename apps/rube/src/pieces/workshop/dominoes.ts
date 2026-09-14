import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutCubic, easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, burst, definePiece, flick, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'

/**
 * A gate across the line and a table of dominoes above it. The ball hits the
 * gate square; the gate gives, and the striker off its cap taps the first
 * domino at the waist; the row goes over along the table, each one
 * knocking the next as it lands on it; the last one falls on a button at
 * the table's end; the pulse runs along the wire to the coil over the gate
 * and the gate snaps up its guide like a portcullis. The ball rolls on
 * underneath the table, past the whole fallen row. Two cells, six links,
 * one ball.
 */
const GATE = 0.0
/** The gate is a bar across the ball's upper half: from its cap, under the coil, to a foot a little above the rail. */
const GATE_TOP = -0.35
const GATE_FOOT = 0.05
/** How far the portcullis rises: its foot clear of the ball, its cap up inside the coil. */
const RISE = 0.22
/** The ball stops with its edge on the gate's face. */
const SEAT = GATE - 0.03 - R
const SHELF = -0.18
const COUNT = 6
const FIRST = 0.16
const GAP = 0.178
const H = 0.26
const W = 0.065
/** Where a domino comes to rest on the next; and the last one, lying on the button. */
const LEAN = 0.9
const LEAN_LAST = 1.15
/** The gate's give when the ball hits it, and the striker's finger, off the gate just under its cap, at the first domino's waist. */
const NUDGE = 0.04
const STRIKE_Y = GATE_TOP + 0.05
const FINGER_X = FIRST - W / 2 - NUDGE - 0.005
/** The button on the table's end, the pole the wire climbs and is strung from, the coil over the gate. */
const BUTTON_X = FIRST + GAP * (COUNT - 1) + 0.2
const BUTTON_W = 0.16
const BASE_H = 0.06
const CAP_H = 0.05
const PRESS = 0.03
const POST_X = BUTTON_X + 0.2
const WIRE_Y = -0.52
const COIL_W = 0.14
const COIL_Y0 = -0.56
const COIL_Y1 = -0.36
/** Seconds after entry. */
const ARRIVE = (0.5 + SEAT) / ROLL
const PUSH = 0.04
/** How long a domino takes to fall onto the next, and how much of that fall is the kick it was struck with. */
const FALL_ONE = 0.075
const STRUCK = 0.35
/** The angle at which a falling domino's top corner reaches the next one's face. */
const CONTACT = 0.465
/** A struck domino's fall, 0 → 1. */
const falling = (u: number): number => STRUCK * u + (1 - STRUCK) * u * u
/** When in its fall a domino reaches CONTACT, so the next one starts exactly then. */
const contactAt = (): number => {
  const f = CONTACT / LEAN
  return (-STRUCK + Math.sqrt(STRUCK * STRUCK + 4 * (1 - STRUCK) * f)) / (2 * (1 - STRUCK))
}
const LEAD = FALL_ONE * contactAt()
const FALL_LAST = FALL_ONE * Math.sqrt(LEAN_LAST / LEAN)
const WAVE = ARRIVE + PUSH
const TRIP = WAVE + LEAD * (COUNT - 1) + FALL_LAST
/** The pulse's run along the wire, and the gate's snap. */
const SIGNAL = 0.12
const SNAP = 0.1
const GO = SIGNAL + SNAP * 0.5
const RESET = 3

/** The wire: from the button's base, along the table to the pole, up it, and strung across to the coil. */
const WIRE: Pt[] = [
  [BUTTON_X + BUTTON_W / 2 + 0.02, SHELF - 0.02],
  [POST_X - 0.035, SHELF - 0.02],
  [POST_X - 0.035, WIRE_Y],
  [GATE + COIL_W / 2, WIRE_Y],
]

/** A point `f` of the way along the wire, by length. */
function alongWire(f: number): Pt {
  const lens: number[] = []
  for (let i = 1; i < WIRE.length; i++) lens.push(Math.hypot(WIRE[i][0] - WIRE[i - 1][0], WIRE[i][1] - WIRE[i - 1][1]))
  const total = lens.reduce((a, b) => a + b, 0)
  let want = f * total
  for (let i = 0; i < lens.length; i++) {
    if (want <= lens[i]) {
      const g = want / lens[i]
      return [WIRE[i][0] + (WIRE[i + 1][0] - WIRE[i][0]) * g, WIRE[i][1] + (WIRE[i + 1][1] - WIRE[i][1]) * g]
    }
    want -= lens[i]
  }
  return WIRE[WIRE.length - 1]
}

/** How far the gate has risen: snapped up by the coil, held, dropped when the coil lets go. */
const liftAt = (since: number): number => {
  if (since < SIGNAL) return 0
  if (since < SIGNAL + SNAP) return easeOutCubic(over(since, SIGNAL, SIGNAL + SNAP))
  if (since < RESET + 0.2) return 1
  const drop = easeInQuad(over(since, RESET + 0.2, RESET + 0.36))
  const bounce = since > RESET + 0.36 ? 0.06 * Math.sin(Math.PI * over(since, RESET + 0.36, RESET + 0.48)) : 0
  return 1 - drop + bounce
}

export const dominoes = definePiece<{ color: string }>({
  name: 'dominoes',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [roll([-0.5, 0], [SEAT, 0], ROLL), wait([SEAT, 0], TRIP + GO - ARRIVE), ramp([SEAT, 0], [SEAT + 0.3, 0], 0.8, ROLL), roll([SEAT + 0.3, 0], [1.5, 0], ROLL)],
      fire: TRIP,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 1.5)
    const lift = liftAt(since)
    const pressed = since < 0 ? 0 : since < RESET ? over(since, 0, 0.03) : 1 - over(since, RESET, RESET + 0.12)

    // The table the row stands on, with its legs; the pole at its end; the gate's guide, which the coil sits on.
    outline(p, ink, weight)
    p.line((FIRST - 0.1) * k, SHELF * k, POST_X * k, SHELF * k)
    for (const x of [FIRST + 0.05, POST_X - 0.08]) p.line(x * k, SHELF * k, x * k, (FLOOR - 0.02) * k)
    p.line(POST_X * k, (WIRE_Y - 0.04) * k, POST_X * k, SHELF * k)
    p.line((GATE - 0.05) * k, (COIL_Y1 - 0.05) * k, (GATE - 0.05) * k, (FLOOR - 0.02) * k)

    // The wire, in the piece's colour, and the pulse running along it after the button.
    p.push()
    p.stroke(s.color)
    p.strokeWeight(weight)
    p.noFill()
    p.beginShape()
    for (const [x, y] of WIRE) p.vertex(x * k, y * k)
    p.endShape()
    p.pop()
    if (since > 0 && since < SIGNAL) {
      const at = alongWire(over(since, 0, SIGNAL))
      solid(p, ink, weight, s.color)
      p.circle(at[0] * k, at[1] * k, 0.05 * k)
    }

    // The button on the table's end: a base and a cap the last domino lands on.
    solid(p, ink, weight, bg)
    p.rect(BUTTON_X * k, (SHELF - BASE_H / 2) * k, (BUTTON_W - 0.04) * k, BASE_H * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    p.rect(BUTTON_X * k, (SHELF - BASE_H - CAP_H / 2 + PRESS * pressed) * k, BUTTON_W * k, CAP_H * k, 0.02 * k)
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, BUTTON_X * k, (SHELF - BASE_H - CAP_H) * k, (0.1 + 0.1 * f) * k, (0.14 + 0.14 * f) * k, 5, 3.5)
      p.pop()
    }

    // The dominoes. Each is struck by the one before as it lands, and falls
    // on with the kick; they stand back up from the far end once the ball
    // is long gone.
    for (let i = 0; i < COUNT; i++) {
      const x = FIRST + GAP * i
      const last = i === COUNT - 1
      const start = WAVE + i * LEAD
      const fallen = falling(over(t, start, start + (last ? FALL_LAST : FALL_ONE)))
      const riseAt = RESET + (COUNT - 1 - i) * 0.08
      const rise = easeInOutCubic(over(t, riseAt, riseAt + 0.25))
      p.push()
      p.translate(x * k, SHELF * k)
      p.rotate((last ? LEAN_LAST : LEAN) * fallen * (1 - rise))
      solid(p, ink, weight, s.color)
      p.rect(0, (-H / 2) * k, W * k, H * k)
      p.fill(ink)
      p.noStroke()
      p.circle(0, (-H * 0.7) * k, 0.025 * k)
      p.circle(0, (-H * 0.3) * k, 0.025 * k)
      p.pop()
    }

    // The gate: a bar in a guide, snapped straight up by the coil. It gives
    // when the ball hits it, and the striker on top carries that give to
    // the first domino's shoulder.
    const nudge = t < ARRIVE ? 0 : flick(t - ARRIVE, PUSH, 0.1, 0.45) * NUDGE
    const top = GATE_TOP - RISE * lift
    const gateH = GATE_FOOT - GATE_TOP
    solid(p, ink, weight, s.color)
    p.rect((GATE + nudge) * k, (top + gateH / 2) * k, 0.06 * k, gateH * k)
    p.fill(ink)
    p.noStroke()
    p.rect((GATE + nudge) * k, (top + 0.03) * k, 0.08 * k, 0.04 * k)
    outline(p, ink, weight)
    p.line((GATE + 0.03 + nudge) * k, (STRIKE_Y - RISE * lift) * k, (FINGER_X + nudge) * k, (STRIKE_Y - RISE * lift) * k)
  },
  over: (p, s, { k, since, ink, bg, weight }) => {
    // The coil over the gate, in front: the gate's top slides up inside it.
    solid(p, ink, weight, bg)
    p.rect(GATE * k, ((COIL_Y0 + COIL_Y1) / 2) * k, COIL_W * k, (COIL_Y1 - COIL_Y0) * k, 0.015 * k)
    outline(p, ink, weight)
    for (let i = 1; i <= 3; i++) {
      const y = COIL_Y0 + ((COIL_Y1 - COIL_Y0) * i) / 4
      p.line((GATE - COIL_W / 2) * k, y * k, (GATE + COIL_W / 2) * k, y * k)
    }
    if (since > SIGNAL && since < SIGNAL + 0.18) {
      const f = over(since, SIGNAL, SIGNAL + 0.18)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, GATE * k, ((COIL_Y0 + COIL_Y1) / 2) * k, (0.1 + 0.08 * f) * k, (0.14 + 0.12 * f) * k, 6, 0.3)
      p.pop()
    }
  },
})
