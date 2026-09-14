import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine } from '../../../../src/core/ease'
import { FLOOR, R, ROLL, arcPts, chain, definePiece, fall, over, rail, ramp, type Lane, type Pt } from '../parts'

/**
 * A bucket wheel. The ball drops into the top cup, its weight turns the
 * wheel half a turn, and the cup tips it out at the bottom — one floor
 * down and facing back the way it came. Four cups on a rim on a post:
 * a half turn leaves the wheel exactly as it was.
 */
const CY = 0.5
const RIM = 0.4
/** The ball rides with its top on the rim; each cup is a bucket round that seat. */
const PATH = RIM - R
const CUP = R + 0.03
const LIP = 0.05
const CUPS = 4
const TURN = 1.5
const ARRIVE = 0.5 / ((ROLL + 1.2) / 2)

const angleAt = (since: number) =>
  since < 0 ? 0
  : since < TURN ? Math.PI * easeInOutSine(over(since, 0, TURN))
  : Math.PI + 0.05 * Math.exp(-(since - TURN) * 5) * Math.sin((since - TURN) * 28)

/** One cup in its own frame: the seat at the origin, the wheel's hub down +y. A bowl round the seat with a lip either side. */
function cup(p: import('p5'), k: number, ink: string, weight: number, color: string): void {
  solid(p, ink, weight, color)
  p.arc(0, 0, CUP * 2 * k, CUP * 2 * k, 0, Math.PI, p.OPEN)
  outline(p, ink, weight)
  for (const side of [-1, 1]) p.line(side * CUP * k, 0, side * CUP * k, -LIP * k)
}

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
    const drop = fall([0, 0], [0, CY - PATH], 2)
    const lane: Lane = {
      segs: [
        ramp([-0.5, 0], [0, 0], ROLL, 1.2),
        drop,
        ...chain(pts, TURN).map((seg) => ({ ...seg, ease: 'inout' as const })),
        fall([0, CY + PATH], [0, 1], 2.5),
        ramp([0, 1], [-0.5, 1], 1.2, ROLL),
      ],
      fire: ARRIVE + drop.dur,
    }
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const angle = angleAt(since)

    // The rail in runs to the top cup's lip; the rail out starts under the bottom cup; the post the wheel turns on.
    rail(p, k, ink, weight, -0.5, -CUP - 0.03)
    rail(p, k, ink, weight, -0.5, CUP + 0.03, 1 + FLOOR)
    outline(p, ink, weight)
    p.line(0, CY * k, 0, 1.5 * k)
    p.line(-0.12 * k, 1.5 * k, 0.12 * k, 1.5 * k)
    // The pawl on the post: it rides the rim and clicks as each cup goes by.
    let click = 0
    for (let i = 0; i < CUPS; i++) {
      const at = -Math.PI / 2 + (i * Math.PI * 2) / CUPS + angle
      const d = Math.atan2(Math.sin(at - (Math.PI / 2 + 0.3)), Math.cos(at - (Math.PI / 2 + 0.3)))
      click = Math.max(click, Math.exp(-(d / 0.14) * (d / 0.14)))
    }
    p.push()
    p.translate(0.06 * k, (CY + RIM + 0.1) * k)
    p.rotate(-0.9 - 0.5 * click)
    outline(p, ink, weight)
    p.line(0, 0, 0.13 * k, 0)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(0.06 * k, (CY + RIM + 0.1) * k, 0.04 * k)

    p.push()
    p.translate(0, CY * k)
    p.rotate(angle)
    // The rim and its spokes, out to each cup's floor.
    outline(p, ink, weight)
    p.circle(0, 0, RIM * 2 * k)
    for (let i = 0; i < CUPS; i++) {
      p.line(0, 0, 0, -(PATH - CUP) * k)
      p.rotate((Math.PI * 2) / CUPS)
    }
    // The cups: a bucket at every spoke, open outward.
    for (let i = 0; i < CUPS; i++) {
      p.push()
      p.translate(0, -PATH * k)
      cup(p, k, ink, weight, s.color)
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
    // The near side of the cup the ball rides in, so the ball sits *in* it.
    p.push()
    p.translate(0, CY * k)
    p.rotate(angleAt(since))
    p.translate(0, -PATH * k)
    cup(p, k, ink, weight, s.color)
    p.pop()
  },
})
