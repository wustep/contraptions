import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutBounce } from '../../../../../src/core/ease'
import { FAST, FLOOR, ROLL, arrive, arriveAt, burst, definePiece, flick, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A rake left lying on the path, tines up, its handle along the ground
 * ahead. The ball rolls onto the tines and stops; the head goes down, the
 * handle comes up — and up, and over — and comes down on the ball's back
 * with a crack that shoots it off along the path faster than it came. The
 * handle lies where it fell. Somebody will trip on it later.
 */
const HEAD = 0.14
const TINES = -0.02
const HANDLE = 0.86
const ARRIVE = arriveAt(TINES)
const SWING = 0.28
const FIRE = ARRIVE + SWING

/** The handle's angle about the head: flat ahead, up and over, flat behind, with a bounce. */
function handleAngle(t: number, since: number): number {
  if (t < ARRIVE) return 0
  if (since < 0) return -Math.PI * easeInQuad(over(t, ARRIVE, FIRE))
  return -Math.PI + 0.35 * (1 - easeOutBounce(Math.min(1, since / 0.4)))
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
        ramp([TINES, 0], [0.5, 0], 0, FAST * 1.1),
        ramp([0.5, 0], [1.5, 0], FAST * 1.1, ROLL),
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
    // The head: a bar lying across the path just under the rail line, and the tines up from it.
    p.push()
    p.translate(HEAD * k, (FLOOR + 0.06) * k)
    solid(p, ink, weight, s.color)
    p.rect(-0.1 * k, 0, 0.3 * k, 0.05 * k, 0.01 * k)
    outline(p, ink, weight)
    for (let i = 0; i < 5; i++) {
      const x = -0.22 + i * 0.05
      p.push()
      p.translate(x * k, -0.02 * k)
      p.rotate(-0.5 + 0.7 * press)
      p.line(0, 0, 0, -0.11 * k)
      p.pop()
    }
    // The handle, hinged at the head: lying ahead, then over and down behind.
    p.push()
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect((HANDLE / 2) * k, -0.03 * k, HANDLE * k, 0.045 * k, 0.02 * k)
    p.pop()
    p.pop()
    // The crack: lines off the ball where the handle landed on it.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, (TINES + 0.06) * k, -0.06 * k, (0.14 + 0.12 * f) * k, (0.2 + 0.16 * f) * k, 5, -2.6)
      p.pop()
    }
  },
})
