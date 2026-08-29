import { defineContraption } from '../core/define'
import { clipCell, floorRail, outline, solid } from '../core/draw'
import { easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../core/ease'
import { TOKEN, drop, fallIn, heading, since, token, tokenColor, type Beat } from './parts'

/**
 * A cup under the end of the line: the ball drops in and sits there, which is
 * the end of the story, until the flap in the bottom lets it go so the cup is
 * empty when the next one comes.
 */
const FIRE = 0
const MOUTH = 0.05
const BASE = 0.36
const TOP_W = 0.46
const BASE_W = 0.36
/** Where the ball sits once it is in. */
const REST = BASE - TOKEN / 2 - 0.02
const DUMP = 0.62

export const cup = defineContraption<Beat>({
  name: 'cup',
  label: 'Cup',
  tags: ['ball'],
  role: 'sink',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const open = easeOutCubic(seg(t, DUMP, DUMP + 0.04)) - easeInOutCubic(seg(t, DUMP + 0.14, DUMP + 0.26))

    outline(p, ink, weight)
    floorRail(p, k)
    for (const x of [-0.12, 0.12]) p.line(x * k, BASE * k, x * k, 0.5 * k)

    // The body, open at the bottom: the walls are drawn on their own so the
    // flap can swing clear of a line that would otherwise stay put.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.quad((-TOP_W / 2) * k, MOUTH * k, (TOP_W / 2) * k, MOUTH * k, (BASE_W / 2) * k, BASE * k, (-BASE_W / 2) * k, BASE * k)
    p.pop()
    outline(p, ink, weight)
    p.line((-TOP_W / 2) * k, MOUTH * k, (-BASE_W / 2) * k, BASE * k)
    p.line((TOP_W / 2) * k, MOUTH * k, (BASE_W / 2) * k, BASE * k)

    clipCell(p, k, () => {
      const ball = tokenColor(s)
      const falling = fallIn(s, u, FIRE)
      if (falling) token(p, k, ink, weight, ball, falling)
      let y: number | null = null
      if (t < 0.04) y = lerp(0, REST, easeInQuad(seg(t, 0, 0.04)))
      else if (t < 0.09) y = REST - 0.04 * Math.sin(seg(t, 0.04, 0.09) * Math.PI)
      else if (t < DUMP) y = REST
      else if (t < DUMP + 0.08) y = drop(REST, 0.5 + TOKEN / 2 - REST, seg(t, DUMP, DUMP + 0.08) * 1.3)
      if (y !== null) token(p, k, ink, weight, ball, [0, y])

      // The flap, hinged on the far side so it swings down and away.
      p.push()
      p.translate(h * (BASE_W / 2) * k, BASE * k)
      p.rotate(-h * open * 1.3)
      solid(p, ink, weight, s.color)
      p.rect((-h * BASE_W) / 2 * k, 0, BASE_W * k, 0.06 * k)
      p.pop()
    })
  },
})
