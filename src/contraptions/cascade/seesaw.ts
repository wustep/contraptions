import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { FLOOR, SPEED, TOKEN, floor, since, type Beat } from './parts'

/**
 * A plank on a trestle resting with its near end down: the ball rolls up it,
 * crosses the pivot, and its weight slams the far end down and sends it off
 * faster than it came, while a counterweight hauls the plank back before the
 * next one.
 *
 * The lane is the plank: up the near half, a beat balanced over the pivot
 * while the plank goes over, then down the far half a third again as fast.
 * The rest angle is chosen so the low end's deck lands exactly on the rail,
 * which is what lets the ball step from one onto the other.
 */
const FIRE = 0.4
const TILT = 0.3
const HALF_LEN = 0.4
const THICK = 0.06
const PIVOT = FLOOR - HALF_LEN * Math.sin(TILT) + THICK / 2
/** Where the plank's ends sit, and the ball's centre when it is over the pivot. */
const END = HALF_LEN * Math.cos(TILT)
const CREST = PIVOT - THICK / 2 - TOKEN / 2

export const seesaw = defineContraption<Beat>({
  name: 'seesaw',
  label: 'Seesaw',
  tags: ['ball', 'swing'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    return {
      pieces: [
        roll([-0.5, y], [-END, y], SPEED),
        roll([-END, y], [0, CREST], SPEED * 0.8),
        hold([0, CREST], 0.035),
        roll([0, CREST], [END, y], SPEED * 1.35),
        roll([END, y], [0.5, y], SPEED * 1.35),
      ],
    }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const tip = easeOutCubic(seg(t, 0, 0.06)) - easeInOutCubic(seg(t, 0.5, 0.85))
    const angle = TILT * (2 * tip - 1)

    floor(p, k, ink, weight, s, END)

    // The trestle stands on the cell floor: the rail is gapped for the plank.
    outline(p, ink, weight)
    p.line(-0.13 * k, 0.44 * k, 0, PIVOT * k)
    p.line(0.13 * k, 0.44 * k, 0, PIVOT * k)
    p.line(-0.16 * k, 0.44 * k, 0.16 * k, 0.44 * k)

    p.push()
    p.translate(0, PIVOT * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, HALF_LEN * 2 * k, THICK * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, PIVOT * k, 0.08 * k)
  },
})
