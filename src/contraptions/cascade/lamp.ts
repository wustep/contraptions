import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, seg } from '../../core/ease'
import { FLOOR, dipLane, flick, floor, since, type Beat } from './parts'

/**
 * A street lamp over a treadle at the end of the line: the ball rolls onto
 * the treadle, the lamp comes on, and it fades as the loop runs down while
 * the ball sits there waiting to be relieved by the next one.
 */
const FIRE = 0
const BULB_Y = -0.22
const BULB_D = 0.3
const ARM_Y = -0.44
/** The treadle, and the stroke the ball shares with it. */
const PEDAL = -0.2
const GIVE = 0.05
const DOWN = 0.03
const WAIT = 0.1
const UP = 0.06

export const lamp = defineContraption<Beat>({
  name: 'lamp',
  label: 'Lamp',
  tags: ['signal'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => dipLane(ctx, { at: PEDAL, by: GIVE, down: DOWN, wait: WAIT, up: UP }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const t = since(u, FIRE)
    const lit = 1 - easeInQuad(seg(t, 0.03, 0.6))
    const press = flick(t, DOWN, DOWN + WAIT, DOWN + WAIT + UP) * GIVE

    floor(p, k, ink, weight, s)
    outline(p, ink, weight)
    // The post stands on the rail, not the cell floor — a full-height mast
    // was merging with the row below.
    p.line(0.32 * k, FLOOR * k, 0.32 * k, ARM_Y * k)
    p.line(0.32 * k, ARM_Y * k, 0, ARM_Y * k)
    p.line(0, ARM_Y * k, 0, (BULB_Y - BULB_D / 2) * k)
    // The treadle, on a stem, with lips wide enough to seat the ball.
    p.line(PEDAL * k, (FLOOR + 0.05 + press) * k, PEDAL * k, 0.5 * k)
    for (const side of [-1, 1]) {
      p.line((PEDAL + side * 0.15) * k, (FLOOR + press) * k, (PEDAL + side * 0.15) * k, (FLOOR - 0.05 + press) * k)
    }
    solid(p, ink, weight, s.color)
    p.rect(PEDAL * k, (FLOOR + 0.025 + press) * k, 0.3 * k, 0.05 * k)

    if (lit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      const reach = (BULB_D / 2) * (1.25 + lit * 0.5)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        p.line(Math.cos(a) * BULB_D * 0.6 * k, (BULB_Y + Math.sin(a) * BULB_D * 0.6) * k, Math.cos(a) * reach * k, (BULB_Y + Math.sin(a) * reach) * k)
      }
      p.pop()
    }
    solid(p, ink, weight, lit > 0.02 ? s.color : theme.bg)
    p.circle(0, BULB_Y * k, BULB_D * k)
  },
})
