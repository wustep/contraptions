import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, mixHex, over, post, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { bodyColor, luminance, seaWater, splash, water } from './sea'

/**
 * A whale. The deck runs onto the back of a whale lying in the water,
 * head under the deck's end and fluke up out of the sea at the far side,
 * its blowhole on top; the ball rolls into the dip over the blowhole and
 * stops; the whale rumbles, shuts its eye, and it blows — a
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

export const blowhole = definePiece<{
  color: string
  /** The placement's pick, kept for saved shows. The spout is drawn in the sea's own blue instead (`draw`). */
  spout: string
}>({
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
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
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
    const blink = 1 - 0.75 * over(since, -0.08, -0.04) * (1 - over(since, 0.3, 0.36))
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
    water(p, k, ink, bg, weight, -0.5, 0.5)

    // (No bubbles up the blowhole while it rumbles: they rose behind the ball sat over it, unseen.)
    // The spout: a column of water from the blowhole, narrow at the hole and
    // opening into a crown at its head, where the ball is, which breaks into
    // drops. It is the sea's blue let down toward the paper, so it reads as
    // water whatever the whale is: the placement's pick was the palette's
    // farthest from the whale, a cream, and a cream column in an ink outline
    // stood on the whale's back like a pipe.
    const sea = mixHex(seaWater(theme), bg, 0.45)
    if (spout > 0.02) {
      const h = SPOUT_H * spout
      const head = FLOOR - h
      // The crown opens with the jet's height, so a jet falling back is a column again and not a cup on a stem.
      const c = 0.05 + 0.07 * Math.min(1, h / 0.8)
      solid(p, ink, weight * 0.8, sea)
      p.beginShape()
      p.vertex(-0.045 * k, TOP * k)
      p.bezierVertex(-0.05 * k, (TOP - h * 0.45) * k, -0.06 * k, (head + 0.16) * k, -c * k, (head + 0.05) * k)
      p.bezierVertex(-c * 0.8 * k, (head - 0.02) * k, -0.04 * k, (head - 0.03) * k, 0, (head - 0.03) * k)
      p.bezierVertex(0.04 * k, (head - 0.03) * k, c * 0.8 * k, (head - 0.02) * k, c * k, (head + 0.05) * k)
      p.bezierVertex(0.06 * k, (head + 0.16) * k, 0.05 * k, (TOP - h * 0.45) * k, 0.045 * k, TOP * k)
      p.endShape(p.CLOSE)
      splash(p, k, sea, weight, 0, head + 0.02, 1 - spout, 1.2, false)
    }
    // Drips after, back into the blowhole: left behind by the head of the
    // column as it drops away under them, and falling, each once, into the
    // hole. Drips looping down a fixed stretch of air came out of nothing
    // half a cell up when the column had already gone, and vanished in mid
    // air when they stopped.
    p.push()
    p.noStroke()
    p.fill(sea)
    for (const [dx, r] of [
      [-0.05, 0.32],
      [0.04, 0.38],
      [0.0, 0.44],
    ]) {
      if (since < r) continue
      const y = FLOOR - SPOUT_H * Math.sin((Math.PI * r) / 0.5) - 0.02 + 2.5 * (since - r) * (since - r)
      if (y < TOP - 0.02) p.ellipse(dx * k, y * k, 0.03 * k, 0.045 * k)
    }
    p.pop()
  },
})
