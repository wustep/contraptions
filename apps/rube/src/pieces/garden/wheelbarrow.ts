import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A wheelbarrow parked on the path, tipped back on its legs with its tray
 * open to the rail. The ball rolls off the rail's end into the tray; the
 * weight brings the barrow forward onto its wheel and it trundles off
 * along the path, slowing, until the wheel meets a chock, the barrow
 * tips forward and the ball is dumped out onto the rail beyond. The
 * barrow stays tipped, handles in the air.
 */
const SEAT = 0.3
const STOP = 2.0
const ARRIVE = arriveAt(SEAT)
const CREAK = 0.3
const RUN = 1.0
const T_RUN = ARRIVE + CREAK
const FIRE = T_RUN + RUN
/** The wheel's axle sits this far ahead of the tray's centre, on the ground. */
const AXLE = 0.22
const WHEEL = 0.11

const barrowX = (t: number) => (t < T_RUN ? SEAT : t < FIRE ? lerp(SEAT, STOP, easeOutCubic(over(t, T_RUN, FIRE))) : STOP)

export const wheelbarrow = definePiece<{ color: string }>({
  name: 'wheelbarrow',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [SEAT, 0.02]),
        wait([SEAT, 0.02], CREAK),
        { from: [SEAT, 0.02], to: [STOP, 0.02], dur: RUN, ease: 'out' },
        fly([STOP, 0.02], [STOP + 0.24, 0], 0.14, 0.05),
        ramp([STOP + 0.24, 0], [2.5, 0], 2.2, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const x = barrowX(t)
    // Tipped back on its legs; level as it runs; tipped forward at the chock.
    const tilt =
      t < ARRIVE ? -0.16
      : t < T_RUN ? -0.16 * (1 - easeInOutSine(over(t, ARRIVE, T_RUN)))
      : since < 0 ? 0
      : since < 0.12 ? 0.5 * easeOutCubic(over(since, 0, 0.12))
      : 0.5 - 0.05 * Math.exp(-since * 3) * Math.sin(since * 20)

    // The rails in and out, the path between, the chock.
    rail(p, k, ink, weight, -0.5, SEAT - 0.24)
    rail(p, k, ink, weight, STOP + 0.2, 2.5)
    soil(p, k, ink, weight, -0.5, 2.5)
    outline(p, ink, weight)
    p.line((SEAT - 0.24) * k, FLOOR * k, (SEAT - 0.24) * k, 0.5 * k)
    p.line((STOP + 0.2) * k, FLOOR * k, (STOP + 0.2) * k, 0.5 * k)
    solid(p, ink, weight, ink)
    p.triangle((STOP + AXLE + WHEEL - 0.02) * k, 0.5 * k, (STOP + AXLE + WHEEL + 0.1) * k, 0.5 * k, (STOP + AXLE + WHEEL + 0.08) * k, 0.4 * k)
    // A wheel track behind the barrow.
    if (x > SEAT + 0.05) {
      outline(p, ink, weight * 0.6)
      p.line((SEAT + AXLE) * k, 0.49 * k, (x + AXLE) * k, 0.49 * k)
    }

    // The barrow, about its axle.
    const ax = x + AXLE
    const ay = 0.5 - WHEEL
    p.push()
    p.translate(ax * k, ay * k)
    p.rotate(tilt)
    p.translate(-ax * k, -ay * k)
    // The legs at the back, and the handles.
    outline(p, ink, weight)
    for (const dx of [-0.34, -0.3]) p.line((x + dx) * k, (FLOOR + 0.14) * k, (x + dx - 0.02) * k, 0.5 * k)
    p.line((x - 0.3) * k, (FLOOR + 0.12) * k, (x - 0.6) * k, (FLOOR + 0.02) * k)
    solid(p, ink, weight, ink)
    p.rect((x - 0.6) * k, (FLOOR + 0.02) * k, 0.06 * k, 0.03 * k)
    // The tray: back wall, floor, front wall; the ball sits on its floor.
    solid(p, ink, weight, s.color)
    p.quad((x - 0.38) * k, (FLOOR - 0.12) * k, (x + 0.3) * k, (FLOOR - 0.08) * k, (x + 0.22) * k, (FLOOR + 0.16) * k, (x - 0.24) * k, (FLOOR + 0.16) * k)
    p.fill(ink)
    p.noStroke()
    p.rect((x - 0.01) * k, (FLOOR + 0.13) * k, 0.46 * k, 0.04 * k)
    // The wheel, turning with the ground covered.
    solid(p, ink, weight, bg)
    p.circle(ax * k, ay * k, WHEEL * 2 * k)
    p.push()
    p.translate(ax * k, ay * k)
    p.rotate((x - SEAT) / WHEEL)
    outline(p, ink, weight)
    for (let i = 0; i < 3; i++) {
      p.line(-WHEEL * 0.8 * k, 0, WHEEL * 0.8 * k, 0)
      p.rotate(Math.PI / 3)
    }
    p.pop()
    p.pop()
    // A puff of dust off the wheel at the chock.
    if (since > 0 && since < 0.3) {
      const f = over(since, 0, 0.3)
      p.push()
      p.noStroke()
      const dust = p.color(ink)
      dust.setAlpha(120 * (1 - f))
      p.fill(dust)
      for (const [dx, dy] of [
        [-0.06, -0.04],
        [0.02, -0.08],
        [0.08, -0.03],
      ]) {
        p.circle((STOP + AXLE + dx * (1 + f)) * k, (0.5 + dy * (1 + f * 2)) * k, (0.03 + 0.03 * f) * k)
      }
      p.pop()
    }
    tuft(p, k, ink, weight, 1.1, 0.5, 0.1, 0.02)
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    // The tray's front wall stands between the viewer and the ball while it rides.
    if (t < ARRIVE - 0.1) return
    const x = barrowX(t)
    const tilt =
      t < ARRIVE ? -0.16
      : t < T_RUN ? -0.16 * (1 - easeInOutSine(over(t, ARRIVE, T_RUN)))
      : since < 0 ? 0
      : since < 0.12 ? 0.5 * easeOutCubic(over(since, 0, 0.12))
      : 0.5 - 0.05 * Math.exp(-since * 3) * Math.sin(since * 20)
    const ax = x + AXLE
    const ay = 0.5 - WHEEL
    p.push()
    p.translate(ax * k, ay * k)
    p.rotate(tilt)
    p.translate(-ax * k, -ay * k)
    solid(p, ink, weight, s.color)
    p.quad((x - 0.36) * k, (FLOOR - R * 0.3) * k, (x + 0.28) * k, (FLOOR - R * 0.1) * k, (x + 0.22) * k, (FLOOR + 0.16) * k, (x - 0.24) * k, (FLOOR + 0.16) * k)
    outline(p, ink, weight * 0.7)
    for (const dx of [-0.16, 0, 0.14]) p.line((x + dx) * k, (FLOOR - 0.01) * k, (x + dx) * k, (FLOOR + 0.13) * k)
    p.pop()
  },
})
