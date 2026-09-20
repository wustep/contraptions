import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, over, rail, ramp, roll, wait, type Lane } from '../../parts'
import { flash, glow, lamp, score } from './neon'
import { pixel } from './screen'

/**
 * A photo booth across the lane: a cabinet with a curtain hung over its
 * front in two halves, a lamp in its header and a slot in its far side.
 * The rail runs in through the cabinet's side; the ball rolls in behind
 * the curtain, which stirs as it goes, and is gone, and stops for its
 * picture. The lamp comes on, and the flash goes off: the whole curtain
 * lit paper-white for an instant, the light spilling out of the gap. The
 * ball rolls out the far side, the curtain stirring again, and the strip
 * drops out of the slot beside it: three frames with a pixel ball in
 * each, in the ball's own colour. It hangs there.
 */
export interface BoothState {
  color: string
  curtain: string
}

/** The cabinet, and its header with the lamp. */
const HALF = 0.3
const TOP = -0.46
const HEADER = 0.1
/** The curtain: two halves from under the header to a wavy hem, a gap between them. */
const CURTAIN_X = 0.27
const HEM = 0.42
const GAP = 0.012
/** The strip out of the slot in the far side: how wide, and how long it grows. */
const SLOT_Y = -0.4
const STRIP_W = 0.09
const STRIP_L = 0.22
/** Out of sight once its back is behind the curtain's edge, and back once its front is past the other. */
const GONE = -CURTAIN_X + R
const T_GONE = (0.5 + GONE) / ROLL
const IN = 0.06
const POSE = 0.4
const FLASH_AT = 0.28
const FIRE = T_GONE + IN + FLASH_AT
const T_OUT = T_GONE + IN + POSE + IN
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [GONE, 0], ROLL),
    { from: [GONE, 0], to: [0, 0], dur: IN, hidden: true },
    wait([0, 0], POSE, { hidden: true }),
    { from: [0, 0], to: [-GONE, 0], dur: IN, hidden: true },
    ramp([-GONE, 0], [0.5, 0], 1.6, ROLL),
  ],
  fire: FIRE,
}

/** The curtain's stir off the ball going by its edge: a sway of the hem, dying down. */
const stir = (s: number) => (s < 0 ? 0 : 0.035 * Math.sin(s * 13) * Math.exp(-s * 4))

/** One half of the curtain, from `x0` to `x1`, its hem swung by `sway`, in `fill`. */
function half(p: p5, k: number, ink: string, weight: number, fill: string, x0: number, x1: number, sway: number): void {
  const top = TOP + HEADER
  solid(p, ink, weight, fill)
  p.beginShape()
  p.vertex(x0 * k, top * k)
  p.vertex(x1 * k, top * k)
  // The hem: scallops, so the cloth reads as cloth without a line drawn on it.
  const n = 3
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const x = x1 + (x0 - x1) * f + sway * (0.6 + 0.4 * Math.sin(f * Math.PI))
    if (i > 0) {
      const xm = x1 + (x0 - x1) * (f - 0.5 / n) + sway
      p.quadraticVertex(xm * k, (HEM + 0.035) * k, x * k, HEM * k)
    } else p.vertex(x * k, HEM * k)
  }
  p.endShape(p.CLOSE)
}

export const booth = definePiece<BoothState>({
  name: 'booth',
  points: 100,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The curtain in a colour of its own: not the cabinet's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color, curtain: pool.length ? rng.pick(pool) : color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const busy = t > T_GONE && t < T_OUT + 0.3
    rail(p, k, ink, weight, -0.5, -HALF)
    rail(p, k, ink, weight, HALF, 0.5)
    // The cabinet: a box in the colour with a dark inside, the lane's doorways cut in both sides.
    solid(p, ink, weight, s.color)
    p.rect(0, ((TOP + 0.5) / 2) * k, HALF * 2 * k, (0.5 - TOP) * k, 0.03 * k)
    solid(p, ink, weight * 0.8, bg)
    p.rect(0, ((TOP + HEADER + 0.44) / 2) * k, (HALF * 2 - 0.08) * k, (0.44 - TOP - HEADER) * k, 0.01 * k)
    p.noStroke()
    p.fill(bg)
    for (const side of [-1, 1]) p.rect(side * (HALF - 0.02) * k, -0.02 * k, 0.08 * k, 0.3 * k)
    // The lamp in the header: on while there is someone inside, and a wink at the flash.
    const lit = busy ? (since > 0 && since < 0.1 ? 0 : 1) : 0
    lamp(p, k, ink, weight, s.color, bg, 0, TOP + HEADER / 2, 0.035, lit)
    // The slot in the far side, and the strip out of it.
    solid(p, ink, weight, ink)
    p.rect((HALF + 0.01) * k, SLOT_Y * k, 0.05 * k, 0.03 * k)
  },
  over: (p, s, { k, t, since, ink, bg, weight, color }) => {
    // The curtain, in front of the ball, in two halves; each stirs as the ball passes its edge.
    const flashOn = since >= 0 && since < 0.07
    const cloth = flashOn ? ink : s.curtain
    half(p, k, ink, weight, cloth, -CURTAIN_X, -GAP, stir(t - T_GONE + 0.1))
    half(p, k, ink, weight, cloth, GAP, CURTAIN_X, stir(t - T_OUT + 0.06))
    // The light out of the gap: the flash itself, and its afterglow.
    if (since >= 0 && since < 0.5) {
      const f = 1 - over(since, 0.05, 0.5)
      glow(p, k, ink, 0, 0.05, 0.3, f)
      p.noStroke()
      p.fill(ink)
      p.rect(0, ((TOP + HEADER + HEM) / 2) * k, (GAP * 2 + 0.03 * f) * k, (HEM - TOP - HEADER) * k)
    }
    flash(p, k, ink, weight, 0, 0.0, since, 0.3, 0.2, 0.5)
    // The strip: feeds out of the slot after the flash and hangs, three frames with the ball in each.
    const fed = over(since, 0.3, 0.8)
    if (fed > 0) {
      const len = STRIP_L * fed
      const x = HALF + 0.05 + STRIP_W / 2
      solid(p, ink, weight * 0.6, ink)
      p.rect(x * k, (SLOT_Y + len / 2) * k, STRIP_W * k, len * k, 0.005 * k)
      for (let i = 0; i < 3; i++) {
        const fy = SLOT_Y + 0.015 + i * 0.07
        if (fy + 0.06 > SLOT_Y + len) break
        pixel(p, k, bg, x - 0.03, fy, 0.06)
        pixel(p, k, color, x - 0.012, fy + 0.018, 0.012, 2, 2)
      }
    }
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, 0, TOP + 0.1, '+100', since, 1),
})
