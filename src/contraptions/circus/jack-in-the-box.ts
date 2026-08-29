import { defineContraption } from '../../core/define'
import { clipCell, coil, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, easeOutBack, easeOutCubic, lerp, seg } from '../../core/ease'
import { P, block, ground, knob, performer, shiver, stroke } from './circus'

/**
 * The crank winds for most of the loop, the lid flies open and the clown
 * springs out on his coil, and a plunger comes down from above to stuff him
 * back in and shut the lid so the crank can start again.
 */
const BOX_W = 0.44
const BOX_TOP = 0.1
const LID_OPEN = -2.2
const IN = 0.3
const OUT = -0.3

export const jackInTheBox = defineContraption({
  name: 'jack-in-the-box',
  label: 'Jack-in-the-box',
  tags: ['sideshow'],
  role: 'source',
  rotations: [0],
  // The lid going.
  fireAt: 0.72,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const crank = Math.PI * 2 * 3 * seg(u, 0, 0.72)
    const lid =
      u < 0.72 ? 0
      : u < 0.78 ? LID_OPEN * easeOutCubic(seg(u, 0.72, 0.78))
      : u < 0.9 ? LID_OPEN
      : LID_OPEN * (1 - easeInQuad(seg(u, 0.9, 0.96)))
    const head =
      u < 0.72 ? IN
      : u < 0.8 ? lerp(IN, OUT, easeOutBack(seg(u, 0.72, 0.8)))
      : u < 0.86 ? OUT + 0.03 * shiver(u, 0.8, 0.08, 2)
      : u < 0.94 ? lerp(OUT, IN, easeInOutCubic(seg(u, 0.86, 0.94)))
      : IN
    const plunger =
      u < 0.86 ? -0.55
      : u < 0.94 ? head - P / 2 - 0.05
      : lerp(IN - P / 2 - 0.05, -0.55, easeInOutCubic(seg(u, 0.94, 1)))

    clipCell(p, k, () => {
    outline(p, ink, weight)
    ground(p, k, 1)

    // The clown on his coil, drawn first so the box hides him when he is in.
    outline(p, ink, weight)
    coil(p, 0, 0.46 * k, 0, (head + P / 2) * k, 5, 0.07 * k)
    performer(p, k, ink, weight, s.color, 0, head)
    solid(p, ink, weight, s.color)
    p.triangle(-0.08 * k, (head - P / 2 + 0.02) * k, 0.08 * k, (head - P / 2 + 0.02) * k, 0, (head - P / 2 - 0.16) * k)

    block(p, k, ink, weight, s.color, 0, (BOX_TOP + 0.5) / 2, BOX_W, 0.5 - BOX_TOP)

    // The lid, hinged at the back corner.
    p.push()
    p.translate((-BOX_W / 2) * k, BOX_TOP * k)
    p.rotate(lid)
    solid(p, ink, weight, s.color)
    p.rect((BOX_W / 2) * k, -0.025 * k, BOX_W * k, 0.05 * k)
    p.pop()

    // The crank on the side.
    stroke(p, k, BOX_W / 2, 0.3, BOX_W / 2 + 0.06, 0.3)
    p.push()
    p.translate((BOX_W / 2 + 0.06) * k, 0.3 * k)
    p.rotate(crank)
    outline(p, ink, weight)
    p.line(0, 0, 0.1 * k, 0)
    p.line(0.1 * k, 0, 0.1 * k, 0.05 * k)
    p.pop()
    knob(p, k, ink, weight, s.color, BOX_W / 2 + 0.06, 0.3, 0.06)

    // The plunger.
    if (plunger > -0.5) {
      outline(p, ink, weight)
      stroke(p, k, 0, -0.5, 0, plunger)
      block(p, k, ink, weight, s.color, 0, plunger, 0.18, 0.05)
    }
    })
  },
})
