import { defineContraption } from '../core/define'
import { outline } from '../core/draw'
import { seg } from '../core/ease'
import { P, drop, ground, pedestal, performer, rise, stroke } from './circus'

/**
 * The acrobat steps off the tall tower onto the bed, the bed throws them up
 * onto the short tower, and the short tower's edge is where they step off to
 * be thrown back up onto the tall one — two bounces a loop, and the second
 * one has to be bigger.
 */
const TALL: [number, number] = [-0.38, -0.34]
const SHORT: [number, number] = [0.38, -0.08]
const BED = 0.27
const BED_W = 0.24

export const trampoline = defineContraption({
  name: 'trampoline',
  label: 'Trampoline',
  tags: ['aerial'],
  role: 'source',
  rotations: [0],
  // The first bounce.
  fireAt: 0.23,
  weight: 1.2,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const tall: [number, number] = [TALL[0], TALL[1] - P / 2]
    const short: [number, number] = [SHORT[0], SHORT[1] - P / 2]
    const bed: [number, number] = [0, BED - P / 2]

    // rest, step off, land, thrown up, rest, step off, land, thrown up
    let pos = tall
    let dip = 0
    if (u < 0.08) pos = tall
    else if (u < 0.2) pos = drop(tall, bed, seg(u, 0.08, 0.2))
    else if (u < 0.26) {
      dip = 0.07 * Math.sin(seg(u, 0.2, 0.26) * Math.PI)
      pos = [0, bed[1] + dip]
    } else if (u < 0.44) pos = rise(bed, short, seg(u, 0.26, 0.44))
    else if (u < 0.54) pos = short
    else if (u < 0.64) pos = drop(short, bed, seg(u, 0.54, 0.64))
    else if (u < 0.7) {
      dip = 0.09 * Math.sin(seg(u, 0.64, 0.7) * Math.PI)
      pos = [0, bed[1] + dip]
    } else if (u < 0.92) pos = rise(bed, tall, seg(u, 0.7, 0.92))

    outline(p, ink, weight)
    ground(p, k, 1)
    // The bed: legs, a frame, and the mat between, sagging under the landing.
    for (const side of [-1, 1]) {
      stroke(p, k, side * (BED_W - 0.03), 0.5, side * (BED_W - 0.03), BED)
      stroke(p, k, side * BED_W, BED, side * (BED_W - 0.06), BED + 0.04)
    }
    p.noFill()
    p.beginShape()
    p.vertex(-BED_W * k, BED * k)
    p.quadraticVertex(0, (BED + dip * 2) * k, BED_W * k, BED * k)
    p.endShape()

    pedestal(p, k, ink, weight, s.color, TALL[0], TALL[1], 0.5, 0.2)
    pedestal(p, k, ink, weight, s.color, SHORT[0], SHORT[1], 0.5, 0.2)
    performer(p, k, ink, weight, s.color, pos[0], pos[1])
  },
})
