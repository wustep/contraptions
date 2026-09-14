import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { pendulum as swingTable, swing } from '../../../../src/core/physics'
import { FAST, FLOOR, ROLL, arrive, arriveAt, definePiece, over, ramp, wait, type Lane, type Pt } from '../parts'

/**
 * A wrecking ball. The bob hangs cocked on a hook at the roof; the ball
 * rolls under it, over a tongue, and settles in a dimple; the tongue's
 * cord flips the hook; the bob comes down on a real pendulum's clock and
 * takes the ball out of the dimple at the bottom of its swing. Then it
 * swings, and swings less, and hangs.
 */
const PIVOT: Pt = [0.4, -0.5]
const ROD = 0.42
const BOB = 0.1
const COCKED = 1.25
const CONTACT = 0.14
const SEAT = 0.66
const TONGUE = 0.5
const ARRIVE = arriveAt(SEAT)
const TRIP = (0.5 + TONGUE) / ROLL
const RELEASE = TRIP + 0.1
const SWING = 0.36
const FIRE = RELEASE + SWING
const PERIOD = 2 * Math.PI * Math.sqrt(ROD / 9)

export const pendulum = definePiece<{ color: string }>({
  name: 'pendulum',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [...arrive([-0.5, 0], [SEAT, 0.03]), wait([SEAT, 0.03], FIRE - ARRIVE), ramp([SEAT, 0.03], [1.5, 0], FAST, ROLL)],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The bob's angle: cocked west, a real quarter-swing down to the strike,
    // a little follow-through, then a damped swing to rest.
    const table = swingTable(COCKED)
    let angle: number
    if (t < RELEASE) angle = -COCKED
    else if (t < FIRE) angle = -swing(table, 0.25 * over(t, RELEASE, FIRE)) + CONTACT * over(t, RELEASE, FIRE)
    else {
      const tau = since
      angle = CONTACT + 0.4 * Math.sin((tau * 2 * Math.PI) / PERIOD) * Math.exp(-tau / 0.9)
      if (tau > 0.3) angle = 0.5 * Math.cos(((tau - 0.3) * 2 * Math.PI) / PERIOD) * Math.exp(-(tau - 0.3) / 1.1) * (CONTACT + 0.36)
    }
    const bx = PIVOT[0] + Math.sin(angle) * ROD
    const by = PIVOT[1] + Math.cos(angle) * ROD

    // The rail, with the tongue and the dimple.
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, (TONGUE - 0.08) * k, FLOOR * k)
    p.line((TONGUE + 0.08) * k, FLOOR * k, (SEAT - 0.1) * k, FLOOR * k)
    p.line((SEAT - 0.1) * k, FLOOR * k, (SEAT - 0.05) * k, (FLOOR + 0.03) * k)
    p.line((SEAT - 0.05) * k, (FLOOR + 0.03) * k, (SEAT + 0.05) * k, (FLOOR + 0.03) * k)
    p.line((SEAT + 0.05) * k, (FLOOR + 0.03) * k, (SEAT + 0.1) * k, FLOOR * k)
    p.line((SEAT + 0.1) * k, FLOOR * k, 1.5 * k, FLOOR * k)
    const pressed = t < TRIP ? 0 : t < TRIP + 0.05 ? over(t, TRIP, TRIP + 0.05) : since < 0.2 ? 1 : 1 - easeOutCubic(over(since, 0.2, 0.4))
    p.push()
    p.translate((TONGUE - 0.08) * k, FLOOR * k)
    p.rotate(0.35 * pressed)
    solid(p, ink, weight, s.color)
    p.rect(0.08 * k, 0, 0.16 * k, 0.035 * k)
    p.pop()
    // The cord: up from the tongue, along the roof to the hook.
    outline(p, ink, weight)
    p.line(TONGUE * k, (FLOOR + 0.02 + 0.03 * pressed) * k, TONGUE * k, -0.42 * k)
    p.line(TONGUE * k, -0.42 * k, 0.1 * k, -0.42 * k)
    // The roof beam on two posts, the pivot, and the hook that held the bob.
    p.line(-0.15 * k, -0.5 * k, 1.05 * k, -0.5 * k)
    for (const x of [-0.1, 1.0]) {
      p.line(x * k, -0.5 * k, x * k, 0.5 * k)
      p.line((x - 0.06) * k, 0.5 * k, (x + 0.06) * k, 0.5 * k)
    }
    const released = t < RELEASE - 0.06 ? 0 : t < RELEASE ? over(t, RELEASE - 0.06, RELEASE) : 1
    p.push()
    p.translate(0.06 * k, -0.42 * k)
    p.rotate(0.9 * released)
    p.line(0, 0, -0.06 * k, 0.06 * k)
    p.line(-0.06 * k, 0.06 * k, -0.02 * k, 0.09 * k)
    p.pop()
    // The rod and the bob.
    outline(p, ink, weight)
    p.line(PIVOT[0] * k, PIVOT[1] * k, bx * k, by * k)
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.07 * k)
    solid(p, ink, weight, s.color)
    p.circle(bx * k, by * k, BOB * 2 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(bx * k, by * k, 0.05 * k)
    // The strike.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-0.9, -0.5, -0.1]) {
        const r0 = 0.14 + 0.16 * f
        const r1 = r0 + 0.08 * (1 - f)
        p.line((SEAT + Math.cos(a) * r0) * k, (Math.sin(a) * r0) * k, (SEAT + Math.cos(a) * r1) * k, (Math.sin(a) * r1) * k)
      }
      p.pop()
    }
  },
})
