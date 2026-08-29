import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, easeOutQuad, lerp, seg } from '../../core/ease'
import { bell, block, fade, ground, knob, rings, shiver, stroke } from './circus'

/**
 * The mallet is hauled up over the tower for most of the loop and let go;
 * it lands on the pad, the lever flips, the puck shoots up the rails and
 * rings the bell at the top, and falls back onto the lever for the next
 * swing.
 */
const TOWER_X = -0.22
const RAIL = 0.1
const BELL_TOP = -0.98
const BELL_W = 0.3
const BELL_H = 0.2
const HIT_Y = BELL_TOP + BELL_H * 0.22 + BELL_H + BELL_W * 0.12 + 0.03 + 0.04
const FULCRUM: [number, number] = [0.06, 0.84]
const HALF = 0.28
const TILT = 0.28
const PIVOT: [number, number] = [0.34, 0.06]
const MALLET = 0.66
const COCKED = -0.55
const HEAD = 0.07

export const highStriker = defineContraption({
  name: 'high-striker',
  label: 'High Striker',
  tags: ['sideshow', 'loop'],
  role: 'source',
  span: [1, 2],
  rotations: [0],
  // The bell.
  fireAt: 0.82,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const mallet =
      u < 0.02 ? 0
      : u < 0.58 ? lerp(0, COCKED, easeInOutSine(seg(u, 0.02, 0.58)))
      : u < 0.64 ? lerp(COCKED, 0, easeInQuad(seg(u, 0.58, 0.64)))
      : 0
    const tilt =
      u < 0.64 ? -TILT
      : u < 0.68 ? lerp(-TILT, TILT, easeOutCubic(seg(u, 0.64, 0.68)))
      : u < 0.86 ? TILT
      : u < 0.94 ? lerp(TILT, -TILT, easeInOutSine(seg(u, 0.86, 0.94)))
      : -TILT
    const seat = FULCRUM[1] + HALF * Math.sin(tilt) - 0.065
    const puck =
      u < 0.65 ? seat
      : u < 0.82 ? lerp(FULCRUM[1] - HALF * Math.sin(TILT) - 0.065, HIT_Y, easeOutQuad(seg(u, 0.65, 0.82)))
      : u < 0.84 ? HIT_Y
      : lerp(HIT_Y, FULCRUM[1] + HALF * Math.sin(-TILT) - 0.065, easeInQuad(seg(u, 0.84, 0.98)))
    const head: [number, number] = [PIVOT[0] + MALLET * Math.sin(mallet), PIVOT[1] + MALLET * Math.cos(mallet)]
    const ring = fade(u, 0.82, 0.18)

    outline(p, ink, weight)
    ground(p, k, 1, 1)
    // The tower.
    for (const side of [-1, 1]) stroke(p, k, TOWER_X + side * RAIL, 0.76, TOWER_X + side * RAIL, -0.76)
    for (let y = -0.55; y < 0.7; y += 0.25) stroke(p, k, TOWER_X - RAIL, y, TOWER_X + RAIL, y)
    stroke(p, k, TOWER_X - RAIL - 0.04, -0.76, TOWER_X + RAIL + 0.04, -0.76)
    rings(p, k, s.color, weight, TOWER_X, BELL_TOP + 0.15, 0.2, ring, -Math.PI / 2, 2)
    rings(p, k, s.color, weight, TOWER_X, BELL_TOP + 0.15, 0.2, ring, Math.PI, 1)
    bell(p, k, ink, weight, s.color, TOWER_X, BELL_TOP, BELL_W, BELL_H, 0.12 * shiver(u, 0.82, 0.16, 5))

    // The gallows the mallet hangs from.
    stroke(p, k, 0.46, 1, 0.46, PIVOT[1])
    stroke(p, k, 0.46, PIVOT[1], PIVOT[0], PIVOT[1])

    block(p, k, ink, weight, s.color, TOWER_X, puck, 0.14, 0.08)

    // The lever on its fulcrum.
    solid(p, ink, weight, s.color)
    p.triangle((FULCRUM[0] - 0.1) * k, 1 * k, (FULCRUM[0] + 0.1) * k, 1 * k, FULCRUM[0] * k, FULCRUM[1] * k)
    p.push()
    p.translate(FULCRUM[0] * k, FULCRUM[1] * k)
    p.rotate(tilt)
    solid(p, ink, weight, s.color)
    p.rect(0, -0.025 * k, HALF * 2 * k, 0.05 * k)
    p.pop()

    outline(p, ink, weight)
    stroke(p, k, PIVOT[0], PIVOT[1], head[0], head[1])
    knob(p, k, ink, weight, s.color, head[0], head[1], HEAD * 2)
    knob(p, k, ink, weight, s.color, PIVOT[0], PIVOT[1], 0.06)
  },
})
