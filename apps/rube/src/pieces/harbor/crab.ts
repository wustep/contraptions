import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, burst, definePiece, fly, laneAt, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { piling, water } from './sea'

/**
 * A crab on the pier. The ball rolls into its open claw and stops; the
 * claw closes on it; the crab lifts it high, rocks back on its legs, and
 * pitches it across a cell of open water to the deck on the far side,
 * where it lands and rolls on. The other claw waves until the wind-up,
 * then braces low and still for the throw — out of the ball's way — and
 * waves it goodbye after. The empty claw comes down slowly.
 *
 * Its eyes are open the whole time, and on the ball: whites wide enough
 * that the pen does not close them, pupils that follow the ball in, up,
 * and away over the water. Nothing of the crab's own crosses them — the
 * throwing arm follows through short and comes down outside the stalks.
 */
const SEAT = 0.1
const BODY: Pt = [0.5, -0.12]
const HIGH: Pt = [0.2, -0.46]
const LAND: Pt = [1.95, 0]
const ARRIVE = arriveAt(SEAT)
const GRAB = 0.35
const LIFT = 0.3
const AIM = 0.18
const FLIGHT = 0.42
/** The pitch's height over its chord: enough to clear the eyestalks and the far claw. */
const LOFT = 0.3
const T_LIFT = ARRIVE + GRAB
const T_AIM = T_LIFT + LIFT
const FIRE = T_AIM + AIM
/** How far the empty claw follows the ball out: short of the eyestalks. */
const FOLLOW = 0.16
const EYES: Pt[] = [
  [BODY[0] - 0.085, BODY[1] - 0.22],
  [BODY[0] + 0.085, BODY[1] - 0.22],
]

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [SEAT, 0]),
    wait([SEAT, 0], GRAB),
    { from: [SEAT, 0], to: HIGH, dur: LIFT, ease: 'inout' },
    { from: HIGH, to: [HIGH[0] - 0.08, HIGH[1] + 0.02], dur: AIM, ease: 'inout' },
    fly([HIGH[0] - 0.08, HIGH[1] + 0.02], LAND, FLIGHT, LOFT),
    fly(LAND, [LAND[0] + 0.14, 0], 0.06, 0.02),
    ramp([LAND[0] + 0.14, 0], [2.5, 0], 2.8, ROLL),
  ],
  fire: FIRE,
}

/** Where the near claw is: round the seat, then up with the ball, then held out where it let go. */
function clawAt(t: number): Pt {
  if (t < T_LIFT) return [SEAT, -0.02]
  if (t < T_AIM) return [lerp(SEAT, HIGH[0], easeInOutSine(over(t, T_LIFT, T_AIM))), lerp(-0.02, HIGH[1], easeInOutSine(over(t, T_LIFT, T_AIM)))]
  if (t < FIRE) return [HIGH[0] - 0.08 * easeInOutSine(over(t, T_AIM, FIRE)), HIGH[1] + 0.02]
  if (t < FIRE + 0.12) return [HIGH[0] - 0.08 + FOLLOW * over(t, FIRE, FIRE + 0.12), HIGH[1] + 0.02 - 0.1 * over(t, FIRE, FIRE + 0.12)]
  const rest = easeInOutSine(over(t, FIRE + 1.2, FIRE + 3))
  return [lerp(HIGH[0] - 0.08 + FOLLOW, SEAT, rest), lerp(HIGH[1] - 0.08, -0.02, rest)]
}

export const crab = definePiece<{ color: string }>({
  name: 'crab',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const holding = t >= ARRIVE + GRAB * 0.5 && t < FIRE
    const [cx, cy] = clawAt(t)
    // The crab rocks back to throw and settles after.
    const lean = t < T_AIM ? 0 : t < FIRE ? -0.12 * easeInOutSine(over(t, T_AIM, FIRE)) : since < 0.15 ? -0.12 + 0.2 * over(since, 0, 0.15) : 0.08 * Math.exp(-since * 2) * Math.cos(since * 8)
    // Legs twitch while it thinks.
    const twitch = t > ARRIVE && t < FIRE ? 0.06 * Math.sin(t * 24) : 0

    // The pier: the deck to the water, the deck beyond, the gap between.
    water(p, k, ink, weight, -0.5, 2.5)
    rail(p, k, ink, weight, -0.5, 0.75)
    rail(p, k, ink, weight, 1.55, 2.5)
    piling(p, k, ink, weight, 0.7)
    piling(p, k, ink, weight, 1.6)
    // The dimple the ball waits in.
    outline(p, ink, weight)
    p.line((SEAT - 0.1) * k, FLOOR * k, (SEAT - 0.05) * k, (FLOOR + 0.02) * k)
    p.line((SEAT - 0.05) * k, (FLOOR + 0.02) * k, (SEAT + 0.05) * k, (FLOOR + 0.02) * k)
    p.line((SEAT + 0.05) * k, (FLOOR + 0.02) * k, (SEAT + 0.1) * k, FLOOR * k)

    p.push()
    p.translate(BODY[0] * k, FLOOR * k)
    p.rotate(lean)
    p.translate(-BODY[0] * k, -FLOOR * k)
    // The legs: three a side, two joints each, feet on the deck.
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const hx = BODY[0] + side * (0.1 + i * 0.05)
        const kx = hx + side * (0.1 + i * 0.03)
        const fx = kx + side * 0.04 + twitch * (i % 2 ? 1 : -1)
        p.line(hx * k, (BODY[1] + 0.06) * k, kx * k, (BODY[1] - 0.06 + i * 0.03) * k)
        p.line(kx * k, (BODY[1] - 0.06 + i * 0.03) * k, fx * k, FLOOR * k)
      }
    }
    // The body, its eyes on stalks, and a grin. The eyes are wide open and
    // on the ball, wherever it is.
    solid(p, ink, weight, s.color)
    p.ellipse(BODY[0] * k, BODY[1] * k, 0.4 * k, 0.24 * k)
    outline(p, ink, weight)
    for (const [ex, ey] of EYES) p.line((BODY[0] + (ex - BODY[0]) * 0.75) * k, (BODY[1] - 0.1) * k, ex * k, (ey + 0.04) * k)
    const ball = laneAt(LANE, t)
    for (const [ex, ey] of EYES) {
      solid(p, ink, weight * 0.75, bg)
      p.circle(ex * k, ey * k, 0.095 * k)
      const gx = ball.x - ex
      const gy = ball.y - ey
      const g = Math.hypot(gx, gy) || 1
      p.fill(ink)
      p.noStroke()
      p.circle((ex + (gx / g) * 0.018) * k, (ey + (gy / g) * 0.018) * k, 0.042 * k)
    }
    outline(p, ink, weight * 0.9)
    p.arc(BODY[0] * k, (BODY[1] + 0.02) * k, 0.12 * k, 0.06 * k, 0.2, Math.PI - 0.2)
    // The far claw: waving, but braced low and still through the throw so
    // the ball flies clear over it.
    const brace = t < T_AIM - 0.15 ? 0 : t < FIRE + 0.45 ? easeInOutSine(over(t, T_AIM - 0.15, T_AIM)) : 1 - easeInOutSine(over(t, FIRE + 0.45, FIRE + 0.8))
    const wave = 0.3 * Math.sin(t * 3) * (1 - brace)
    const fx = BODY[0] + 0.25 + 0.02 * brace
    const fy = BODY[1] - 0.16 + 0.04 * Math.sin(t * 3) * (1 - brace) + 0.12 * brace
    p.line((BODY[0] + 0.17) * k, (BODY[1] - 0.04) * k, fx * k, fy * k)
    pincer(p, k, ink, weight, s.color, fx, fy, lerp(-0.9 + wave, 0.25, brace), 0.5 - 0.3 * brace)
    // The near arm: shoulder to elbow to claw.
    const sx = BODY[0] - 0.17
    const sy = BODY[1] - 0.02
    const ex = Math.min((sx + cx) / 2 - 0.08, EYES[0][0] - 0.14)
    const ey = Math.min(sy, lerp(sy, cy, 0.5)) - 0.12
    outline(p, ink, weight)
    p.line(sx * k, sy * k, ex * k, ey * k)
    p.line(ex * k, ey * k, cx * k, cy * k)
    pincer(p, k, ink, weight, s.color, cx, cy, t < T_LIFT ? -1.2 : t < FIRE ? -1.6 : -0.6, holding ? 0.12 : 0.55)
    p.pop()

    // The pitch: a burst where the ball left the claw.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, (HIGH[0] - 0.08) * k, (HIGH[1] + 0.02) * k, (0.1 + 0.14 * f) * k, (0.16 + 0.18 * f) * k, 5, 2.8)
      p.pop()
    }
  },
})

/** A claw at (x, y): a fat palm and two pincers, `open` radians apart, pointing along `angle`. */
function pincer(p: import('p5'), k: number, ink: string, weight: number, color: string, x: number, y: number, angle: number, open: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  solid(p, ink, weight, color)
  p.ellipse(0, 0, 0.14 * k, 0.11 * k)
  for (const side of [-1, 1]) {
    p.push()
    p.rotate(side * open)
    p.beginShape()
    p.vertex(0.02 * k, side * 0.035 * k)
    p.bezierVertex(0.14 * k, side * 0.06 * k, (0.16 + R) * k, side * 0.02 * k, (0.14 + R) * k, -side * 0.01 * k)
    p.bezierVertex(0.14 * k, side * 0.005 * k, 0.08 * k, -side * 0.005 * k, 0.02 * k, -side * 0.02 * k)
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.pop()
}
