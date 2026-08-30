import type p5 from 'p5'
import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, lerp, seg, stepEase } from '../../core/ease'
import { P, ground, ladder, performer, stroke } from './circus'

/**
 * A closed two-cell ride. The performer steps off the high deck into the cage,
 * rides down the shaft, walks out onto the stage, and climbs the ladder back
 * to the deck before the loop is out — so the act ends where it started and
 * nothing ever crosses into the next cell. The cage goes home empty behind
 * them, wound up by the drum on the head beam.
 *
 * Self-contained on purpose: the old lift/well pair needed the composer to
 * stamp `ride` state on both halves and leaked a performer sideways.
 */
const CAR_X = -0.28
/** Guide rails, either side of the car. */
const G = 0.16
const CAR_W = 0.28
const CAR_H = 0.28
const HEAD = -0.9
/** The high deck, and the stage the cage lands on. */
const UPPER = -0.52
const STAGE = 0.86
const LAD_X = 0.28
const LAD_W = 0.17
/** Where the performer stands on the deck, waiting for the door. */
const DOOR = -0.06

/** Passenger centres at the two stops. */
const UP_Y = UPPER - P / 2
const DOWN_Y = STAGE - P / 2

/**
 * The timetable, in loop fractions. The performer is clear of the cage before
 * it starts back up, and back on the deck before the loop is out — so both the
 * cage and the performer end where they began.
 */
const BOARD1 = 0.08
const DOWN0 = 0.12
const DOWN1 = 0.42
const OUT1 = 0.54
const UP0 = 0.56
const WALK1 = 0.63
const UP1 = 0.72
const CLIMB1 = 0.9

/** How far down the shaft the cage is, 0 at the deck and 1 on the stage. */
const descent = (u: number) =>
  u < DOWN0 ? 0
  : u < DOWN1 ? easeInOutCubic(seg(u, DOWN0, DOWN1))
  : u < UP0 ? 1
  : u < UP1 ? 1 - easeInOutCubic(seg(u, UP0, UP1))
  : 0

/** The cage: ink posts and roof, a coloured deck, shoes on both guides. */
function cage(p: p5, k: number, ink: string, weight: number, color: string, y: number): void {
  const floor = y + P / 2
  const roof = floor - CAR_H
  solid(p, ink, weight, ink)
  for (const x of [-CAR_W / 2, CAR_W / 2]) {
    p.rect((CAR_X + x) * k, ((roof + floor) / 2) * k, 0.035 * k, (CAR_H + 0.02) * k)
  }
  p.rect(CAR_X * k, (roof - 0.015) * k, (CAR_W + 0.06) * k, 0.03 * k)
  outline(p, ink, weight)
  for (const x of [-G, G]) {
    p.line((CAR_X + x - 0.035) * k, (roof + 0.03) * k, (CAR_X + x + 0.035) * k, (roof + 0.03) * k)
    p.line((CAR_X + x - 0.035) * k, (floor - 0.03) * k, (CAR_X + x + 0.035) * k, (floor - 0.03) * k)
  }
  solid(p, ink, weight, color)
  p.rect(CAR_X * k, (floor - 0.02) * k, (CAR_W + 0.06) * k, 0.045 * k)
}

export const elevator = defineContraption({
  name: 'elevator',
  label: 'Elevator',
  tags: ['aerial'],
  role: 'relay',
  span: [1, 2],
  rotations: [0],
  // The cage touching down.
  fireAt: DOWN1,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const down = descent(u)
    const carY = lerp(UP_Y, DOWN_Y, down)
    const floor = carY + P / 2

    // The performer: board, ride, walk out, climb home, walk back to the door.
    let pos: [number, number]
    if (u < BOARD1) pos = [lerp(DOOR, CAR_X, seg(u, 0, BOARD1)), UP_Y]
    else if (u < DOWN1) pos = [CAR_X, carY]
    else if (u < OUT1) pos = [lerp(CAR_X, 0, seg(u, DOWN1, OUT1)), DOWN_Y]
    else if (u < WALK1) pos = [lerp(0, LAD_X, seg(u, OUT1, WALK1)), DOWN_Y]
    else if (u < CLIMB1) pos = [LAD_X, lerp(DOWN_Y, UP_Y, stepEase(seg(u, WALK1, CLIMB1), 7, 0.3))]
    else pos = [lerp(LAD_X, DOOR, seg(u, CLIMB1, 1)), UP_Y]

    outline(p, ink, weight)
    ground(p, k, 1, 1)

    // The stage, on its legs, and the deck two floors up on its post.
    solid(p, ink, weight, s.color)
    p.rect(-0.02 * k, (STAGE + 0.025) * k, 0.88 * k, 0.05 * k)
    outline(p, ink, weight)
    for (const x of [-0.4, 0.36]) stroke(p, k, x, STAGE + 0.05, x, 1)
    solid(p, ink, weight, s.color)
    p.rect(0.12 * k, (UPPER + 0.025) * k, 0.5 * k, 0.05 * k)
    outline(p, ink, weight)
    stroke(p, k, 0.08, UPPER + 0.05, 0.08, STAGE)
    // The gate the performer steps through, at the shaft edge.
    stroke(p, k, -0.1, UPPER, -0.1, UPPER - 0.18)
    stroke(p, k, -0.1, UPPER - 0.18, -0.02, UPPER - 0.18)

    // The shaft: guides from the head beam down to the stage, the winch drum
    // on the beam, and the cable it pays out.
    for (const x of [CAR_X - G, CAR_X + G]) stroke(p, k, x, HEAD + 0.04, x, STAGE)
    stroke(p, k, CAR_X - G - 0.04, HEAD, CAR_X + G + 0.04, HEAD)
    p.push()
    p.translate(CAR_X * k, HEAD * k)
    p.rotate(down * Math.PI * 5)
    outline(p, ink, weight)
    p.circle(0, 0, 0.11 * k)
    p.line(-0.055 * k, 0, 0.055 * k, 0)
    p.pop()
    stroke(p, k, CAR_X, HEAD + 0.055, CAR_X, floor - CAR_H - 0.03)

    // The ladder, its rails carried past the deck to make a handhold.
    outline(p, ink, weight)
    ladder(p, k, LAD_X, UPPER, STAGE, LAD_W, 10)
    for (const x of [LAD_X - LAD_W / 2, LAD_X + LAD_W / 2]) stroke(p, k, x, UPPER, x, -0.72)

    cage(p, k, ink, weight, s.color, carY)
    performer(p, k, ink, weight, s.color, pos[0], pos[1])
  },
})
