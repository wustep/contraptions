import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp, seg } from '../core/ease'
import { fade, ground, knob, rings, shiver, stroke } from './circus'

/**
 * The mallet is drawn back from the gong for most of the loop, and when the
 * signal arrives it swings in: the gong shakes on its cords, the sound rings
 * out, and the mallet starts its slow draw back for the next strike.
 */
const GONG: [number, number] = [-0.16, -0.02]
const GONG_R = 0.2
const BEAM_Y = -0.44
const PIVOT: [number, number] = [0.34, BEAM_Y]
const HEAD = 0.065
/** The mallet meets the rim at this bearing from the gong's centre. */
const HIT = -0.3
const HIT_AT: [number, number] = [GONG[0] + (GONG_R + HEAD) * Math.cos(HIT), GONG[1] + (GONG_R + HEAD) * Math.sin(HIT)]
const ARM = Math.hypot(HIT_AT[0] - PIVOT[0], HIT_AT[1] - PIVOT[1])
const STRIKE = Math.atan2(PIVOT[0] - HIT_AT[0], HIT_AT[1] - PIVOT[1])
const RECOIL = STRIKE * 0.7
const COCKED = -0.2

export const gong = defineContraption({
  name: 'gong',
  label: 'Gong',
  tags: ['band'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const arm =
      u < 0.05 ? lerp(STRIKE, RECOIL, easeOutCubic(seg(u, 0, 0.05)))
      : u < 0.92 ? lerp(RECOIL, COCKED, easeInOutSine(seg(u, 0.05, 0.92)))
      : lerp(COCKED, STRIKE, easeInQuad(seg(u, 0.92, 1)))
    const head: [number, number] = [PIVOT[0] - ARM * Math.sin(arm), PIVOT[1] + ARM * Math.cos(arm)]
    const shake = 0.03 * shiver(u, 0, 0.22, 5)
    const hit = fade(u, 0, 0.24)

    outline(p, ink, weight)
    ground(p, k, 1)
    // The frame: two posts and a beam.
    stroke(p, k, -0.44, 0.5, -0.44, BEAM_Y)
    stroke(p, k, 0.36, 0.5, 0.36, BEAM_Y)
    stroke(p, k, -0.44, BEAM_Y, 0.36, BEAM_Y)
    // The cords, and the gong swinging on them.
    stroke(p, k, GONG[0] - 0.1, BEAM_Y, GONG[0] - 0.07 + shake, GONG[1] - GONG_R + 0.02)
    stroke(p, k, GONG[0] + 0.1, BEAM_Y, GONG[0] + 0.07 + shake, GONG[1] - GONG_R + 0.02)

    rings(p, k, s.color, weight, GONG[0] + shake, GONG[1], GONG_R, hit, Math.PI, 2)
    rings(p, k, s.color, weight, GONG[0] + shake, GONG[1], GONG_R, hit, -Math.PI / 2, 2)

    solid(p, ink, weight, s.color)
    p.circle((GONG[0] + shake) * k, GONG[1] * k, GONG_R * 2 * k)
    outline(p, ink, weight)
    p.circle((GONG[0] + shake) * k, GONG[1] * k, GONG_R * 0.7 * k)

    // The mallet, hung from the beam's end.
    stroke(p, k, PIVOT[0], PIVOT[1], head[0], head[1])
    knob(p, k, ink, weight, s.color, head[0], head[1], HEAD * 2)
    knob(p, k, ink, weight, s.color, PIVOT[0], PIVOT[1], 0.06)
  },
})
