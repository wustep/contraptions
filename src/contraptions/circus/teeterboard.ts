import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeOutCubic, lerp, seg } from '../../core/ease'
import { P, drop, ground, pedestal, performer, rise, second } from './circus'

/**
 * One acrobat drops from their tower onto the raised end of the board, the
 * board slams over and throws the other acrobat up onto the far tower, and
 * half a loop later that one drops back onto the board and throws the first
 * one home.
 */
const TOWER_X = 0.84
const TOWER_TOP = -0.22
const FULCRUM: [number, number] = [0, 0.3]
const HALF = 0.48
const TILT = 0.28
const THICK = 0.05

/** Where a performer stands on the board's end, `side` -1 for the left. */
const onEnd = (tilt: number, side: number): [number, number] => {
  const ex = side * HALF * Math.cos(tilt)
  const ey = FULCRUM[1] + side * HALF * Math.sin(tilt)
  return [ex + (P / 2 + THICK / 2) * Math.sin(tilt), ey - (P / 2 + THICK / 2) * Math.cos(tilt)]
}

export const teeterboard = defineContraption({
  name: 'teeterboard',
  label: 'Teeterboard',
  tags: ['aerial'],
  role: 'source',
  span: [2, 1],
  rotations: [0],
  // The first throw.
  fireAt: 0.34,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color) }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const tilt =
      u < 0.28 ? TILT
      : u < 0.34 ? lerp(TILT, -TILT, easeOutCubic(seg(u, 0.28, 0.34)))
      : u < 0.78 ? -TILT
      : u < 0.84 ? lerp(-TILT, TILT, easeOutCubic(seg(u, 0.78, 0.84)))
      : TILT
    const towerL: [number, number] = [-TOWER_X, TOWER_TOP - P / 2]
    const towerR: [number, number] = [TOWER_X, TOWER_TOP - P / 2]

    // A starts on the left tower and ends the loop thrown back onto it.
    let a: [number, number]
    if (u < 0.14) a = towerL
    else if (u < 0.28) a = drop(towerL, onEnd(TILT, -1), seg(u, 0.14, 0.28))
    else if (u < 0.84) a = onEnd(tilt, -1)
    else a = rise(onEnd(TILT, -1), towerL, seg(u, 0.84, 1))

    // B starts on the board's low end and is thrown first.
    let b: [number, number]
    if (u < 0.34) b = onEnd(tilt, 1)
    else if (u < 0.5) b = rise(onEnd(-TILT, 1), towerR, seg(u, 0.34, 0.5))
    else if (u < 0.64) b = towerR
    else if (u < 0.78) b = drop(towerR, onEnd(-TILT, 1), seg(u, 0.64, 0.78))
    else b = onEnd(tilt, 1)

    outline(p, ink, weight)
    ground(p, k, 2)
    pedestal(p, k, ink, weight, s.color, -TOWER_X, TOWER_TOP, 0.5, 0.24)
    pedestal(p, k, ink, weight, s.alt, TOWER_X, TOWER_TOP, 0.5, 0.24)

    solid(p, ink, weight, s.color)
    p.triangle(-0.13 * k, 0.5 * k, 0.13 * k, 0.5 * k, FULCRUM[0] * k, FULCRUM[1] * k)
    p.push()
    p.translate(FULCRUM[0] * k, FULCRUM[1] * k)
    p.rotate(tilt)
    solid(p, ink, weight, s.color)
    p.rect(0, (-THICK / 2) * k, HALF * 2 * k, THICK * k)
    p.pop()

    performer(p, k, ink, weight, s.color, a[0], a[1])
    performer(p, k, ink, weight, s.alt, b[0], b[1])
  },
})
