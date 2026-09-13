import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine } from '../../../../src/core/ease'
import { FLOOR, R, ROLL, arcPts, chain, definePiece, fall, over, rail, roll, type Lane, type Pt } from '../parts'

/**
 * A bucket wheel. The ball drops into the top cup, its weight turns the
 * wheel half a turn, and the cup tips it out at the bottom — one floor
 * down and facing back the way it came. Four cups on a rim on a post:
 * a half turn leaves the wheel exactly as it was.
 */
const CY = 0.5
const RIM = 0.4
const PATH = RIM - R + 0.05
const CUPS = 4
const TURN = 1.5
const ARRIVE = 0.5 / ROLL
const DROP_IN = 0.1

const angleAt = (since: number) => (since < 0 ? 0 : since < TURN ? Math.PI * easeInOutSine(over(since, 0, TURN)) : Math.PI)

export const scoop = definePiece<{ color: string }>({
  name: 'scoop',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [-1, 1])) return null
    // Clockwise from the top: −π/2 through 0 to π/2, in screen angles.
    const pts = arcPts(0, CY, PATH, -Math.PI / 2, Math.PI / 2, 12)
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [0, 0], ROLL),
        fall([0, 0], [0, CY - PATH], 2),
        ...chain(pts, TURN).map((seg) => ({ ...seg, ease: 'inout' as const })),
        fall([0, CY + PATH], [0, 1], 2.5),
        roll([0, 1], [-0.5, 1], ROLL, 'out'),
      ],
      fire: ARRIVE + DROP_IN,
    }
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const angle = angleAt(since)

    // Rails in and out, stopping short of the wheel, and the post it turns on.
    rail(p, k, ink, weight, -0.5, -0.36)
    rail(p, k, ink, weight, -0.5, 0.16, 1 + FLOOR)
    outline(p, ink, weight)
    p.line(-0.36 * k, FLOOR * k, -0.36 * k, (FLOOR - 0.06) * k)
    p.line(0, CY * k, 0, 1.5 * k)
    p.line(-0.12 * k, 1.5 * k, 0.12 * k, 1.5 * k)

    p.push()
    p.translate(0, CY * k)
    p.rotate(angle)
    // The rim and its spokes.
    outline(p, ink, weight)
    p.circle(0, 0, RIM * 2 * k)
    for (let i = 0; i < CUPS; i++) {
      p.line(0, 0, 0, -RIM * k)
      p.rotate((Math.PI * 2) / CUPS)
    }
    // The cups: one at every spoke, open toward the direction of turn.
    for (let i = 0; i < CUPS; i++) {
      p.push()
      p.translate(0, -RIM * k)
      solid(p, ink, weight, s.color)
      p.arc(0, 0.02 * k, 0.28 * k, 0.24 * k, -0.15, Math.PI + 0.15, p.CHORD)
      p.pop()
      p.rotate((Math.PI * 2) / CUPS)
    }
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(0, CY * k, 0.12 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(0, CY * k, 0.04 * k)
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The near lip of the cup the ball rides in, so it sits *in* the cup.
    p.push()
    p.translate(0, CY * k)
    p.rotate(angleAt(since))
    p.translate(0, -RIM * k)
    solid(p, ink, weight, s.color)
    p.rect(0, 0.06 * k, 0.28 * k, 0.05 * k)
    p.pop()
  },
})
