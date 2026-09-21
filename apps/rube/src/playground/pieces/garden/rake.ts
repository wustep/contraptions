import { outline, solid } from '../../../../../../src/core/draw'
import { easeInQuad, easeOutBounce } from '../../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, arrive, arriveAt, burst, definePiece, flick, over, rail, ramp, wait, type Lane, type Pt } from '../../../parts'
import { soil, tuft } from '../../../pieces/garden/green'

/**
 * A rake left lying on the path, tines up, its handle along the ground
 * behind it — the way the ball came. The ball rolls over the handle and
 * onto the tines and stops; the tines go down, the handle comes up behind
 * it — and up, and over — and cracks it on the back, and it shoots off
 * along the path faster than it came. The handle falls on and lies ahead,
 * where it fell. Somebody will trip on it later.
 *
 * The swing is a golf swing: from behind, over the top, meeting the back
 * of the ball just past vertical, where the handle is moving forward. So
 * the crack sends the ball the way it was going, and the handle, falling
 * on, never catches it.
 */
const HEAD = 0.24
/** The hinge: where the handle meets the head, on the ground behind the rail. */
const HINGE: Pt = [HEAD, FLOOR + 0.06]
const TINES = HEAD + 0.2
const HANDLE = 0.72
/** The handle's centreline sits this far off the hinge line, and is this thick. */
const OFFSET = 0.03
const THICK = 0.045
const ARRIVE = arriveAt(TINES)
const SWING = 0.3
const FIRE = ARRIVE + SWING
const FALL = 0.45

/**
 * The handle's angle (p5 rotation) at contact: pointing up and a little
 * forward, its face on the back of the ball. The tangent from the hinge to
 * the ball's back, allowing for the face's distance from the hinge line.
 */
const CONTACT = (() => {
  const dx = TINES - HINGE[0]
  const dy = 0 - HINGE[1]
  const d = Math.hypot(dx, dy)
  const face = R + (THICK / 2 - OFFSET)
  return Math.PI * 2 + Math.atan2(dy, dx) - Math.asin(face / d)
})()

/** The handle's angle about the hinge: lying behind (π), up and over to contact, on down to lying ahead (2π), with a bounce. */
function handleAngle(t: number, since: number): number {
  if (t < ARRIVE) return Math.PI
  if (since < 0) return Math.PI + (CONTACT - Math.PI) * easeInQuad(over(t, ARRIVE, FIRE))
  if (since < FALL) return CONTACT + (Math.PI * 2 - 0.3 - CONTACT) * easeInQuad(over(since, 0, FALL))
  return Math.PI * 2 - 0.3 * (1 - easeOutBounce(Math.min(1, (since - FALL) / 0.4)))
}

export const rake = definePiece<{ color: string }>({
  name: 'rake',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [TINES, 0]),
        wait([TINES, 0], SWING),
        ramp([TINES, 0], [1.0, 0], 0, FAST * 1.1),
        ramp([1.0, 0], [1.5, 0], FAST * 1.1, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const angle = handleAngle(t, since)
    // The tines are pressed flat as the ball sits on them, and spring back when it goes.
    const press = t < ARRIVE ? 0 : since < 0 ? 1 : 1 - over(since, 0, 0.15) + 0.3 * flick(since, 0.15, 0.25, 0.6)

    rail(p, k, ink, weight, -0.5, 1.5)
    soil(p, k, ink, weight, -0.5, 1.5)
    tuft(p, k, ink, weight, 1.2, 0.5, 0.1, 0.03)
    // The head: a bar lying across the path just under the rail line, the tines up from it under the seat.
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    solid(p, ink, weight, s.color)
    p.rect(0.12 * k, 0, 0.34 * k, 0.05 * k, 0.01 * k)
    outline(p, ink, weight)
    for (let i = 0; i < 5; i++) {
      const x = TINES - HEAD - 0.1 + i * 0.05
      p.push()
      p.translate(x * k, -0.02 * k)
      p.rotate(-0.5 + 0.7 * press)
      p.line(0, 0, 0, -0.11 * k)
      p.pop()
    }
    // The handle, hinged at the head: lying behind, then over and down ahead.
    p.push()
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect((HANDLE / 2) * k, -OFFSET * k, HANDLE * k, THICK * k, 0.02 * k)
    p.pop()
    p.pop()
    // The crack: lines off the back of the ball where the handle landed on it.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, (TINES - R) * k, -0.04 * k, (0.14 + 0.12 * f) * k, (0.2 + 0.16 * f) * k, 5, 2.2)
      p.pop()
    }
  },
})
