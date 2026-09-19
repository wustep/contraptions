import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { bodyColor, luminance, splash, water } from './sea'

/**
 * A whale. The deck runs onto the back of a whale lying in the water,
 * head under the deck's end and fluke up out of the sea at the far side,
 * its blowhole on top; the ball rolls into the dip over the blowhole and
 * stops; the whale rumbles, a few bubbles come up, and it blows — a
 * column of water that throws the ball straight up past a shelf a floor
 * above, where it comes down onto the shelf and rolls on. The water falls
 * back into the blowhole in pieces. The whale is one colour and the water
 * another, so the spout reads as water and not as more whale.
 */
/** Where the ball comes down, and where the shelf starts: clear of the ball's rise past it. */
const LAND: Pt = [0.32, -1]
const SHELF_X = 0.26
const POST_X = 0.44
/** The whale's back, flat over the blowhole, a hair under the ball's bottom so it sits in a dip. */
const TOP = FLOOR + 0.02
const ARRIVE = arriveAt(0)
const RUMBLE = 0.35
const FIRE = ARRIVE + RUMBLE
const FLIGHT = 0.4
/** The throw's height over its chord: it peaks a ball above the shelf and comes down onto it. */
const LOFT = 0.45
const SPOUT_H = 1.12

export const blowhole = definePiece<{ color: string; spout: string }>({
  name: 'blowhole',
  weight: 1,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [0, 0]),
        wait([0, 0], RUMBLE),
        fly([0, 0], LAND, FLIGHT, LOFT),
        ramp(LAND, [0.5, -1], 1.6, ROLL),
      ],
      fire: FIRE,
    }
    // The whale in a colour that stands off the paper; the water it blows in the palette's colour furthest from that.
    const body = bodyColor(theme, color, ball.color)
    const spout = [...theme.colors].filter((c) => c !== body).sort((a, b) => Math.abs(luminance(b) - luminance(body)) - Math.abs(luminance(a) - luminance(body)))[0] ?? body
    return { cells, exit: { at: [1, -1], dir: 1 }, lane, state: { color: body, spout } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The rumble: the whale shivers before it blows; the spout rises fast and falls back.
    const shiver = t > ARRIVE && since < 0 ? 0.012 * Math.sin(t * 70) * over(t, ARRIVE, FIRE) : 0
    const spout = since < 0 ? 0 : since < 0.5 ? Math.sin((Math.PI * since) / 0.5) : 0

    // The shelf above, on a piling that stands in the water behind the whale, with a brace under it.
    rail(p, k, ink, weight, SHELF_X, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, POST_X, -1 + FLOOR, 0.5)
    outline(p, ink, weight)
    p.line(POST_X * k, (-1 + FLOOR + 0.16) * k, (SHELF_X + 0.03) * k, (-1 + FLOOR) * k)

    p.push()
    p.translate(shiver * k, 0)
    // The deck runs onto the whale's head.
    rail(p, k, ink, weight, -0.5, -0.3)
    // The whale: a blunt head under the deck's end, a long back flat over
    // the blowhole, sloping down to a tail stock that dips under the
    // water, and a fluke up out of it at the far side.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.38 * k, 0.5 * k)
    p.bezierVertex(-0.5 * k, 0.42 * k, -0.5 * k, TOP * k, -0.3 * k, TOP * k)
    p.vertex(0.14 * k, TOP * k)
    p.bezierVertex(0.28 * k, TOP * k, 0.3 * k, 0.34 * k, 0.36 * k, 0.4 * k)
    p.bezierVertex(0.4 * k, 0.34 * k, 0.42 * k, 0.24 * k, 0.49 * k, 0.19 * k)
    p.bezierVertex(0.5 * k, 0.3 * k, 0.46 * k, 0.42 * k, 0.44 * k, 0.5 * k)
    p.endShape(p.CLOSE)
    // The eye — shut tight as it blows — and the mouth's line back from the snout.
    const blink = since > -0.05 && since < 0.3 ? 0.25 : 1
    solid(p, ink, weight * 0.8, bg)
    p.ellipse(-0.35 * k, 0.26 * k, 0.05 * k, 0.05 * blink * k)
    p.noStroke()
    p.fill(ink)
    p.ellipse(-0.345 * k, 0.26 * k, 0.022 * k, 0.022 * blink * k)
    outline(p, ink, weight * 0.8)
    p.noFill()
    p.bezier(-0.47 * k, 0.31 * k, -0.42 * k, 0.35 * k, -0.34 * k, 0.35 * k, -0.28 * k, 0.33 * k)
    // The blowhole, and the dip round it the ball waits in.
    p.fill(ink)
    p.noStroke()
    p.ellipse(0, (TOP + 0.01) * k, 0.14 * k, 0.045 * k)
    p.pop()
    // The sea, in front of the whale: what is under the line is under water.
    water(p, k, ink, weight, -0.5, 0.5)

    // Bubbles up the blowhole while it rumbles.
    if (t > ARRIVE && since < 0) {
      solid(p, ink, weight * 0.8, bg)
      for (let i = 0; i < 3; i++) {
        const f = ((t * 3 + i / 3) % 1 + 1) % 1
        p.circle((0.03 * Math.sin(f * 9 + i)) * k, (TOP - 0.14 * f) * k, (0.02 + 0.01 * i) * k)
      }
    }
    // The spout: a column of water from the blowhole, its head where the
    // ball is, breaking into drops at the top. Water's colour, not the whale's.
    if (spout > 0.02) {
      const h = SPOUT_H * spout
      solid(p, ink, weight, s.spout)
      p.beginShape()
      p.vertex(-0.07 * k, TOP * k)
      p.bezierVertex(-0.07 * k, (FLOOR - h * 0.5) * k, -0.12 * k, (FLOOR - h + 0.1) * k, -0.03 * k, (FLOOR - h) * k)
      p.vertex(0.03 * k, (FLOOR - h) * k)
      p.bezierVertex(0.12 * k, (FLOOR - h + 0.1) * k, 0.07 * k, (FLOOR - h * 0.5) * k, 0.07 * k, TOP * k)
      p.endShape(p.CLOSE)
      p.push()
      p.noStroke()
      p.fill(bg)
      for (let i = 0; i < 4; i++) p.circle((-0.06 + 0.04 * i) * k, (FLOOR - h + 0.14 + 0.06 * (i % 2)) * k, 0.03 * k)
      p.pop()
      splash(p, k, s.spout, weight, 0, FLOOR - h + 0.02, 1 - spout, 1.2)
    }
    // Drips after, back into the blowhole.
    if (since > 0.5 && since < 1.4) {
      p.push()
      p.noStroke()
      p.fill(s.spout)
      for (const [dx, d] of [
        [-0.05, 0],
        [0.04, 0.3],
        [0.0, 0.6],
      ]) {
        const f = ((since - 0.5) * 1.6 + d) % 1
        p.ellipse(dx * k, (FLOOR - 0.5 + 0.5 * f) * k, 0.03 * k, 0.045 * k)
      }
      p.pop()
    }
  },
})
