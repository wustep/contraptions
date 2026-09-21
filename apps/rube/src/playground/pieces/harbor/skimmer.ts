import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, roll, trace, wait, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from '../../../pieces/harbor/sea'

/**
 * A skimmer. The last plank of the deck is not a plank: it is the arm of a
 * clay trap, lying flush in the deck with its pivot at the deck's end, its
 * short tail out over the water on a big coil spring drawn tight. The ball
 * rolls out along the arm and thumps into the lip across it; the jolt trips
 * the catch in the post, the spring has the tail, and the arm whips up and
 * over with the ball on its face and lets it go
 * just short of upright: low, flat and fast. It comes down on the sea and
 * does what a flat stone does, three times, each skip lower and shorter
 * than the last with a ring left on the water at every touch, and the third
 * brings it down on the far pier's slip, which it runs up with the way it
 * has left, slowing, and over onto the deck. The arm shivers upright
 * against its stop.
 *
 * The arm's angle is one function of time; the ball rides its face through
 * the swing, traced from it, and leaves along the arm's own tangent at the
 * pace the arm had brought it to. Every skip falls under one gravity.
 */

/** The arm: its pivot at the deck's end, how far it reaches to its tip and its tail, how thick it is, and where along it the ball fetches up. */
const PX = 0.3
const TH = 0.045
const PY = FLOOR + TH / 2
const REACH = 0.55
const TAIL = 0.17
const SEAT = 0.42
const OFF = R + TH / 2
/** The spring's foot: a lug on the trap's post, low down, so that the spring is nearly all run in when the arm stands up. */
const LUG: Pt = [PX + 0.07, 0.36]
/** Lying cocked it points west; it lets the ball go this far short of upright, flies on to here, and settles here against its stop. */
const COCKED = Math.PI
const LET_GO = Math.PI * 1.5 - 0.2
const OVER = Math.PI * 1.5 + 0.45
const REST = Math.PI * 1.5 + 0.12
/** The ball's pace off the arm, and the one gravity everything after falls under. */
const THROW = 5.4
const G = 24

/** The ball's centre on the arm's face, the arm at angle `a`. */
const onArm = (a: number): Pt => [PX + SEAT * Math.cos(a) - OFF * Math.sin(a), PY + SEAT * Math.sin(a) + OFF * Math.cos(a)]

const T_SEAT = arriveAt(onArm(COCKED)[0])
const HOLD = 0.2
const FIRE = T_SEAT + HOLD
/** The swing: from rest at a steady pull, so that the ball leaves at THROW. */
const SPIN = THROW / Math.hypot(SEAT, OFF)
const PULL = (SPIN * SPIN) / (2 * (LET_GO - COCKED))
const SWING = SPIN / PULL
const T_GO = FIRE + SWING
const T_OVER = T_GO + (2 * (OVER - LET_GO)) / SPIN

/** The arm's angle, `t` seconds into the piece. */
function armAt(t: number): number {
  if (t < FIRE) return COCKED
  if (t < T_GO) return COCKED + 0.5 * PULL * (t - FIRE) ** 2
  if (t < T_OVER) {
    const u = t - T_GO
    return LET_GO + SPIN * u - (0.5 * SPIN * u * u) / (T_OVER - T_GO)
  }
  // Against its stop: a shiver that dies away.
  const u = t - T_OVER
  return REST + (OVER - REST) * Math.exp(-6 * u) * (Math.cos(18 * u) + Math.sin(18 * u) / 3)
}

/** Off the arm along its tangent. */
const GO = onArm(LET_GO)
const AIM: Pt = (() => {
  const dx = -SEAT * Math.sin(LET_GO) - OFF * Math.cos(LET_GO)
  const dy = SEAT * Math.cos(LET_GO) - OFF * Math.sin(LET_GO)
  const n = Math.hypot(dx, dy)
  return [(THROW * dx) / n, (THROW * dy) / n]
})()
/** The ball's height when its underside is on the water. */
const SKIM = WATER - R
const T_FALL = (-AIM[1] + Math.sqrt(AIM[1] * AIM[1] + 2 * G * (SKIM - GO[1]))) / G
/** The three skips: how high each goes and the pace it crosses at. The heights say how long each lasts. */
const SKIPS: [height: number, pace: number][] = [
  [0.115, 3.9],
  [0.075, 3.5],
  [0.045, 3.1],
]
const airtime = (h: number) => Math.sqrt((8 * h) / G)

/** The far pier's slip: from the deck's end down to its foot under the water. */
const EAST = 3.3
const FOOT: Pt = [2.84, 0.47]
const SLOPE = Math.atan2(FOOT[1] - FLOOR, EAST - FOOT[0])
/** The ball's centre on the slip, `y` down from the deck's line: a radius off the slope. */
const onSlip = (y: number): Pt => [EAST - R * Math.sin(SLOPE) - (y + R * Math.cos(SLOPE) - R) / Math.tan(SLOPE), y]
const CREST = onSlip(R - R * Math.cos(SLOPE))

/** Where it touches the sea, and when: for the rings. */
const TOUCH: { x: number; at: number }[] = []

const LANE: Lane = (() => {
  const seat = onArm(COCKED)
  const flights = []
  let from: Pt = [GO[0] + AIM[0] * T_FALL, SKIM]
  let at = T_GO + T_FALL
  flights.push(fly(GO, from, T_FALL, (G * T_FALL * T_FALL) / 8))
  SKIPS.forEach(([h, pace], i) => {
    const dur = airtime(h)
    TOUCH.push({ x: from[0], at })
    // The last skip comes down on the slip, a little above the water.
    const to: Pt = i === SKIPS.length - 1 ? onSlip(0.18) : [from[0] + pace * dur, SKIM]
    flights.push(fly(from, to, dur, (G * dur * dur) / 8))
    from = to
    at += dur
  })
  return {
    segs: [
      ...arrive([-0.5, 0], seat),
      wait(seat, HOLD),
      ...trace((t) => onArm(armAt(t)), FIRE, T_GO, 14),
      ...flights,
      ramp(from, CREST, 3, 1.3),
      roll(CREST, [EAST, 0], 1.3),
      ramp([EAST, 0], [3.5, 0], 1.3, ROLL),
    ],
    fire: FIRE,
  }
})()

export const skimmer = definePiece<{ color: string }>({
  name: 'skimmer',
  weight: 0.8,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]
    if (!fits(cells, [4, 0])) return null
    return { cells, exit: { at: [4, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const sea = seaWater(theme)
    const a = armAt(t)
    const tip = PX - REACH

    // The deck to the arm's tip, and the bed the arm lies in, a plank's thickness down, to the deck's end.
    rail(p, k, ink, weight, -0.5, tip)
    outline(p, ink, weight)
    p.line(tip * k, FLOOR * k, tip * k, (FLOOR + TH) * k)
    rail(p, k, ink, weight, tip, PX, FLOOR + TH)
    piling(p, k, ink, weight, -0.36)
    // The far pier, and the slip down from its end to its foot on the bed of the sea.
    rail(p, k, ink, weight, EAST, 3.5)
    piling(p, k, ink, weight, EAST + 0.1)
    outline(p, ink, weight)
    p.line(EAST * k, FLOOR * k, FOOT[0] * k, FOOT[1] * k)
    seabed(p, k, ink, weight, FOOT[0] - 0.08, 3.5)

    // The trap's post on the deck's end, down to the bed of the sea, with the lug its spring is made fast to;
    // and the coil spring from the lug up to the arm's tail.
    solid(p, ink, weight, s.color)
    p.rect(PX * k, ((FLOOR + TH + 0.5) / 2) * k, 0.1 * k, (0.5 - FLOOR - TH) * k, 0.015 * k)
    outline(p, ink, weight)
    p.line((PX + 0.05) * k, LUG[1] * k, LUG[0] * k, LUG[1] * k)
    const tail: Pt = [PX - TAIL * Math.cos(a), PY - TAIL * Math.sin(a)]
    const coils = 3
    const sx = tail[0] - LUG[0]
    const sy = tail[1] - LUG[1]
    const len = Math.hypot(sx, sy) || 1
    outline(p, ink, weight * 0.9)
    p.beginShape()
    p.vertex(LUG[0] * k, LUG[1] * k)
    for (let i = 0; i < coils * 2; i++) {
      const f = (i + 0.5) / (coils * 2)
      const side = i % 2 ? -1 : 1
      p.vertex((LUG[0] + sx * f + (-sy / len) * 0.04 * side) * k, (LUG[1] + sy * f + (sx / len) * 0.04 * side) * k)
    }
    p.vertex(tail[0] * k, tail[1] * k)
    p.endShape()

    // The arm about its pivot: a plank from tip to tail, the lip across it that stops the ball.
    p.push()
    p.translate(PX * k, PY * k)
    p.rotate(a - Math.PI)
    solid(p, ink, weight, bg)
    p.rect((-(REACH - TAIL) / 2) * k, 0, (REACH + TAIL) * k, TH * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    p.rect(-(SEAT - R - 0.025) * k, -(TH / 2 + 0.03) * k, 0.035 * k, 0.06 * k, 0.008 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(PX * k, PY * k, 0.075 * k)

    // The sea, and a ring left on it at every touch.
    water(p, k, ink, weight, -0.5, 3.5)
    TOUCH.forEach(({ x, at }, i) => splash(p, k, sea, weight, x, WATER, over(t, at, at + 0.55), 0.95 - 0.2 * i))
  },
})
