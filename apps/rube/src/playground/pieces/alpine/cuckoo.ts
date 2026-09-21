import { outline, solid } from '../../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutQuad } from '../../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, definePiece, fly, over, rail, ramp, roll, type Lane, type Pt } from '../../../parts'
import { otherColor } from './parts-c'
import { gearColor, snow, snowAt, snowWhite } from './snow'

/**
 * A cuckoo clock as tall as a sentry box, on a post in the snow behind the
 * track: a chalet's steep roof under snow, a dial, and a pair of shutters
 * in its side wall at the height of the ball. The ball rolls past the clock
 * onto a plate in the track, and the plate sinks under it, slowing it: the
 * hands jump to the hour, the shutters fly open, and the cuckoo shoots out
 * on a lazy-tongs and punches the ball in the back, which skips off down
 * the track faster than it came. The cuckoo hangs there a moment at full
 * stretch, nodding, and is drawn back in; the shutters close on it.
 *
 * The cuckoo's beak is one distance out from the wall at every instant: it
 * reaches the ball's back at the blow, neither before nor through it, and
 * the tongs are whatever that distance makes them.
 */
/** The case: its walls, its foot and its eaves, and the roof's peak. */
const WEST = -0.46
const EAST = -0.2
const FOOT = 0.2
const EAVES = -0.7
const PEAK = -1.0
const MID = (WEST + EAST) / 2
/** The dial. */
const DIAL: Pt = [MID, -0.46]
const DIAL_R = 0.095
/** The shutters' height, either side of the ball's line. */
const HATCH = 0.12
/** The plate in the track, and where the ball is when the blow lands. */
const PLATE: [number, number] = [-0.12, 0.08]
const X_BLOW = 0.16
const SLOWED = 1.1
const SKIP = 0.2
/** The cuckoo, beak tip to tail, and where the tongs are made fast inside the case. */
const BIRD = 0.15
const ANCHOR = EAST - 0.05
const TONGS = 4
const BAR = 0.052
/** The beak at rest inside the case, at the blow, and at full stretch. */
const IN = EAST - 0.03
const AT_BLOW = X_BLOW - R
const OUT = AT_BLOW + 0.13

const ROLL_IN = roll([-0.5, 0], [PLATE[0], 0], ROLL)
const ON_PLATE = ramp([PLATE[0], 0], [X_BLOW, 0], ROLL, SLOWED)
const FIRE = ROLL_IN.dur + ON_PLATE.dur
const LANE: Lane = {
  segs: [ROLL_IN, ON_PLATE, fly([X_BLOW, 0], [X_BLOW + SKIP, 0], SKIP / FAST, 0.03), ramp([X_BLOW + SKIP, 0], [0.5, 0], FAST, ROLL)],
  fire: FIRE,
}
/** The plate trips this long before the blow: when the ball rolls onto it. */
const TRIP = -ON_PLATE.dur

/** Where the beak's tip is, `since` seconds after the blow. */
function beakAt(since: number): number {
  if (since < -0.09) return IN
  if (since < 0) return IN + (AT_BLOW - IN) * easeInQuad(over(since, -0.09, 0))
  if (since < 0.05) return AT_BLOW + (OUT - AT_BLOW) * easeOutQuad(since / 0.05)
  if (since < 0.45) return OUT + 0.012 * Math.exp(-(since - 0.05) * 9) * Math.sin((since - 0.05) * 42)
  return OUT + (IN - OUT) * easeInOutSine(over(since, 0.45, 0.85))
}
/** How far open the shutters are, 0 to 1. */
const shuttersAt = (since: number): number => (since < 0.5 ? easeOutQuad(over(since, TRIP, TRIP + 0.05)) : 1 - easeInOutSine(over(since, 0.86, 0.98)))

export const cuckoo = definePiece<{ color: string; bird: string; white: string }>({
  name: 'cuckoo',
  weight: 1,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, 0])) return null
    const body = gearColor(theme, color, ball.color)
    return { cells, exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: body, bird: otherColor(theme, body, ball.color), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    snow(p, k, ink, weight, -0.5, 0.5)
    rail(p, k, ink, weight, -0.5, 0.5)

    // The plate: proud of the track until the ball is on it, down while it is, and up again after.
    const onPlate = t >= ROLL_IN.dur ? 1 - over(since, 0.1, 0.3) : 0
    solid(p, ink, weight, s.bird)
    p.rect(((PLATE[0] + PLATE[1]) / 2) * k, (FLOOR - 0.018 + 0.018 * onPlate) * k, (PLATE[1] - PLATE[0]) * k, 0.036 * k, 0.01 * k)

    // The cuckoo on its tongs, drawn first so the case hides all of it that is still indoors.
    const beak = beakAt(since)
    const tail = beak - BIRD
    if (tail > ANCHOR + 0.01) {
      const cell = (tail - ANCHOR) / TONGS
      const half = Math.sqrt(Math.max(0, BAR * BAR - (cell * cell) / 4))
      outline(p, ink, weight * 0.9)
      for (let i = 0; i < TONGS; i++) {
        const x0 = ANCHOR + cell * i
        p.line(x0 * k, -half * k, (x0 + cell) * k, half * k)
        p.line(x0 * k, half * k, (x0 + cell) * k, -half * k)
      }
    }
    if (beak > EAST) {
      solid(p, ink, weight, s.bird)
      p.triangle((tail - 0.035) * k, -0.035 * k, (tail - 0.035) * k, 0.02 * k, (tail + 0.03) * k, 0)
      p.ellipse((tail + 0.065) * k, 0, 0.12 * k, 0.095 * k)
      solid(p, ink, weight, s.white)
      p.triangle((tail + 0.112) * k, -0.022 * k, (tail + 0.112) * k, 0.022 * k, beak * k, 0)
      p.noStroke()
      p.fill(ink)
      p.circle((tail + 0.085) * k, -0.017 * k, 0.022 * k)
    }

    // The post, the case, the roof under its snow, and the dial.
    outline(p, ink, weight)
    p.line(MID * k, FOOT * k, MID * k, (snowAt(MID) + 0.03) * k)
    solid(p, ink, weight, s.color)
    p.rect(MID * k, ((EAVES + FOOT) / 2) * k, (EAST - WEST) * k, (FOOT - EAVES) * k)
    solid(p, ink, weight, s.white)
    p.triangle((WEST - 0.04) * k, EAVES * k, (EAST + 0.04) * k, EAVES * k, MID * k, PEAK * k)
    solid(p, ink, weight, bg)
    p.circle(DIAL[0] * k, DIAL[1] * k, DIAL_R * 2 * k)
    // The hands stand at two minutes to the hour, and the plate jumps them on to it.
    const minute = -0.22 * (1 - over(since, TRIP, TRIP + 0.04))
    outline(p, ink, weight)
    p.line(DIAL[0] * k, DIAL[1] * k, (DIAL[0] + Math.sin(minute) * DIAL_R * 0.78) * k, (DIAL[1] - Math.cos(minute) * DIAL_R * 0.78) * k)
    p.line(DIAL[0] * k, DIAL[1] * k, (DIAL[0] + DIAL_R * 0.5) * k, DIAL[1] * k)

    // The shutters in the side wall: shut, they lie along it; open, they stand out from it.
    const open = shuttersAt(since) * (Math.PI / 2)
    p.strokeWeight(weight * 1.5)
    for (const side of [-1, 1]) {
      p.line(EAST * k, side * HATCH * k, (EAST + Math.sin(open) * HATCH * 0.9) * k, side * HATCH * (1 - Math.cos(open) * 0.9) * k)
    }
  },
})
