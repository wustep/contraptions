import { defineContraption } from '../../core/define'
import { outline } from '../../core/draw'
import { easeInOutSine, easeOutQuad, lerp, seg, stepEase } from '../../core/ease'
import { P, block, flight, ground, ladder, performer, splash, stroke } from './circus'

/**
 * The diver climbs the ladder a rung at a time, walks out along the board,
 * bounces, and dives into the tank; the splash is the moment, and then they
 * swim to the ladder and start climbing again.
 */
const LADDER_X = -0.34
const BOARD_Y = -0.72
const TIP = 0.16
const TANK_TOP = 0.5
const WATER = 0.6

export const highDive = defineContraption({
  name: 'high-dive',
  label: 'High Dive',
  tags: ['aerial', 'loop'],
  role: 'source',
  span: [1, 2],
  rotations: [0],
  // The splash.
  fireAt: 0.6,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const top = BOARD_Y - P / 2
    const rim = WATER - P / 2
    const dip = u >= 0.42 && u < 0.48 ? 0.06 * Math.sin(seg(u, 0.42, 0.48) * Math.PI) : 0

    let pos: [number, number]
    if (u < 0.32) pos = [LADDER_X, lerp(rim, top, stepEase(seg(u, 0, 0.32), 8, 0.35))]
    else if (u < 0.42) pos = [lerp(LADDER_X, TIP, easeInOutSine(seg(u, 0.32, 0.42))), top]
    else if (u < 0.48) pos = [TIP, top + dip]
    else if (u < 0.6) pos = flight([TIP, top], [0.2, rim], 0.12, seg(u, 0.48, 0.6))
    else if (u < 0.72) pos = [0.2, lerp(rim, 0.82, easeOutQuad(seg(u, 0.6, 0.72)))]
    else if (u < 0.9) pos = [lerp(0.2, LADDER_X, easeInOutSine(seg(u, 0.72, 0.9))), 0.78]
    else pos = [LADDER_X, lerp(0.78, rim, easeInOutSine(seg(u, 0.9, 1)))]

    outline(p, ink, weight)
    ground(p, k, 1, 1)
    ladder(p, k, LADDER_X, BOARD_Y, 0.92, 0.14, 11)
    // The board, hinged at the ladder, dipping under the bounce.
    p.push()
    p.translate((LADDER_X - 0.07) * k, BOARD_Y * k)
    p.rotate(Math.atan2(dip, TIP - LADDER_X + 0.1))
    block(p, k, ink, weight, s.color, (TIP - LADDER_X + 0.14) / 2, 0.025, TIP - LADDER_X + 0.14, 0.05)
    p.pop()
    outline(p, ink, weight)
    stroke(p, k, LADDER_X + 0.07, BOARD_Y + 0.26, LADDER_X + 0.3, BOARD_Y + 0.05)

    performer(p, k, ink, weight, s.color, pos[0], pos[1])

    // The water goes over the diver, so under is under.
    block(p, k, ink, weight, s.color, 0, (WATER + 1) / 2, 0.88, 1 - WATER)
    outline(p, ink, weight)
    p.rect(0, ((TANK_TOP + 1) / 2) * k, 0.88 * k, (1 - TANK_TOP) * k)
    splash(p, k, s.color, 0.2, WATER, seg(u, 0.6, 0.8), 0.14)
  },
})
