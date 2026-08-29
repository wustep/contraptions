import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutCubic, easeInOutSine, easeInQuad, easeOutCubic, lerp, seg } from '../core/ease'
import { P, block, drop, ground, knob, performer, rise, stroke } from './circus'

/**
 * The winch hauls the weight up, the weight drops on the short end of the
 * arm, the long end flings the acrobat up into the basket, the basket tips
 * them out, and they fall back onto the spoon while the winch starts hauling
 * again.
 */
const PIVOT: [number, number] = [0, 0.24]
const ARM_L = 0.36
const ARM_R = 0.32
const REST = 0.42
const FLUNG = -0.55
const WEIGHT_X = -ARM_L * Math.cos(REST)
const PULLEY_Y = -0.44
const CUP: [number, number] = [0.32, -0.33]
const CUP_W = 0.28
const CUP_H = 0.2
const HINGE: [number, number] = [CUP[0] + CUP_W / 2, CUP[1] - CUP_H / 2]
/** The arm angle at which the acrobat leaves the spoon, and when. */
const RELEASE_A = -0.3
const RELEASE_U = 0.06 + 0.07 * (1 - Math.cbrt(1 - (REST - RELEASE_A) / (REST - FLUNG)))

const spoonAt = (a: number): [number, number] => [PIVOT[0] + ARM_R * Math.cos(a), PIVOT[1] + ARM_R * Math.sin(a)]
const onSpoon = (a: number): [number, number] => {
  const [x, y] = spoonAt(a)
  return [x + (P / 2) * Math.sin(a), y - (P / 2) * Math.cos(a)]
}
const SEAT: [number, number] = [CUP[0], CUP[1] + CUP_H / 2 - P / 2]
const rot = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

export const catapult = defineContraption({
  name: 'catapult',
  label: 'Catapult',
  tags: ['aerial', 'loop'],
  role: 'source',
  rotations: [0],
  fireAt: RELEASE_U,
  weight: 1.2,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // The arm: flung fast when the weight lands, eased back to rest as the
    // winch takes the weight off it again.
    const arm =
      u < 0.06 ? REST
      : u < 0.13 ? lerp(REST, FLUNG, easeOutCubic(seg(u, 0.06, 0.13)))
      : u < 0.16 ? FLUNG
      : lerp(FLUNG, REST, easeInOutCubic(seg(u, 0.16, 0.3)))
    const armEndY = PIVOT[1] - ARM_L * Math.sin(arm)
    // The weight: held at the top, dropped, riding the arm down, hauled back.
    const weightY =
      u < 0.06 ? lerp(-0.3, armEndY - 0.07, easeInQuad(seg(u, 0, 0.06)))
      : u < 0.16 ? armEndY - 0.07
      : u < 0.92 ? lerp(PIVOT[1] - ARM_L * Math.sin(FLUNG) - 0.07, -0.3, easeInOutSine(seg(u, 0.16, 0.92)))
      : -0.3
    // The basket tips to pour, then rights itself.
    const tip = -1.4 * (easeInOutCubic(seg(u, 0.4, 0.5)) - easeInOutCubic(seg(u, 0.6, 0.75)))

    // The acrobat: on the spoon, in the air, in the basket, poured out, falling.
    let pos: [number, number]
    if (u < RELEASE_U) pos = onSpoon(arm)
    else if (u < 0.27) pos = rise(onSpoon(RELEASE_A), SEAT, seg(u, RELEASE_U, 0.27))
    else if (u < 0.45) {
      const [dx, dy] = rot(SEAT[0] - HINGE[0], SEAT[1] - HINGE[1], tip)
      pos = [HINGE[0] + dx, HINGE[1] + dy]
    } else if (u < 0.58) {
      const [dx, dy] = rot(SEAT[0] - HINGE[0], SEAT[1] - HINGE[1], -0.7)
      pos = drop([HINGE[0] + dx, HINGE[1] + dy], onSpoon(REST), seg(u, 0.45, 0.58))
    } else pos = onSpoon(REST)

    outline(p, ink, weight)
    ground(p, k, 1)
    // The stand.
    stroke(p, k, PIVOT[0] - 0.13, 0.5, PIVOT[0], PIVOT[1])
    stroke(p, k, PIVOT[0] + 0.13, 0.5, PIVOT[0], PIVOT[1])
    // The winch line, over the pulley and up through the ceiling.
    stroke(p, k, WEIGHT_X, PULLEY_Y, WEIGHT_X, weightY - 0.07)
    stroke(p, k, WEIGHT_X, -0.5, WEIGHT_X, PULLEY_Y)
    knob(p, k, ink, weight, s.color, WEIGHT_X, PULLEY_Y, 0.09)

    // The arm, and the spoon at its long end.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(arm)
    solid(p, ink, weight, s.color)
    p.rect(((ARM_R - ARM_L) / 2) * k, 0, (ARM_L + ARM_R) * k, 0.05 * k)
    outline(p, ink, weight)
    p.arc(ARM_R * k, -0.05 * k, 0.2 * k, 0.16 * k, 0, Math.PI)
    p.pop()
    knob(p, k, ink, weight, s.color, PIVOT[0], PIVOT[1], 0.07)

    block(p, k, ink, weight, s.color, WEIGHT_X, weightY, 0.16, 0.14)

    // The basket, hinged at its outer lip; the acrobat sits in front of it.
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(tip)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-CUP_W * k, 0)
    p.vertex(-CUP_W * 0.88 * k, CUP_H * k)
    p.vertex(-CUP_W * 0.12 * k, CUP_H * k)
    p.vertex(0, 0)
    p.endShape(p.CLOSE)
    p.pop()
    knob(p, k, ink, weight, s.color, HINGE[0], HINGE[1], 0.06)

    performer(p, k, ink, weight, s.color, pos[0], pos[1])
  },
})
