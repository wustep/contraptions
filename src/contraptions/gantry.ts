import { defineContraption } from '../core/define'
import { clipBox, outline, solid } from '../core/draw'
import { easeInOutCubic, easeOutQuad, lerp, seg } from '../core/ease'

/**
 * A portal crane taking a crate off one stack and setting it on the other.
 *
 * The earlier version was all thin outline and read as architecture rather than
 * a machine. The frame is now drawn as box section — paired lines with a filled
 * beam — so it has enough mass to anchor a 2x2 footprint, and the load is big
 * enough to be the thing you watch.
 */
export const gantry = defineContraption({
  name: 'gantry',
  label: 'Gantry',
  tags: ['lift', 'square'],
  span: [2, 2],
  rotations: [0],
  // The crate touching down.
  fireAt: 0.7,
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const beam = -h / 2 + size * 0.3
    const floor = h / 2 - size * 0.14
    const crate = size * 0.62
    const leg = w / 2 - size * 0.2
    const post = size * 0.11
    const from = -leg * 0.62 * s.dir
    const to = leg * 0.62 * s.dir
    const high = beam + size * 0.62
    const low = floor - crate / 2

    // lower, lift, traverse, lower, release, lift, return
    let x = from
    let hook = high
    let carrying = false
    if (u < 0.14) {
      hook = lerp(high, low, easeInOutCubic(seg(u, 0, 0.14)))
    } else if (u < 0.28) {
      hook = lerp(low, high, easeInOutCubic(seg(u, 0.14, 0.28)))
      carrying = true
    } else if (u < 0.56) {
      x = lerp(from, to, easeInOutCubic(seg(u, 0.28, 0.56)))
      carrying = true
    } else if (u < 0.7) {
      x = to
      hook = lerp(high, low, easeInOutCubic(seg(u, 0.56, 0.7)))
      carrying = true
    } else if (u < 0.84) {
      x = to
      hook = lerp(low, high, easeInOutCubic(seg(u, 0.7, 0.84)))
    } else {
      x = lerp(to, from, easeInOutCubic(seg(u, 0.84, 1)))
    }
    // The whole frame flexes a little as the load lands.
    const settle = easeOutQuad(seg(u, 0.7, 0.82)) * (1 - easeOutQuad(seg(u, 0.7, 0.82)))

    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      // Box-section legs: two lines a post apart, braced top and bottom.
      for (const side of [-1, 1]) {
        const cx = side * leg
        p.line(cx - post / 2, beam, cx - post / 2, floor)
        p.line(cx + post / 2, beam, cx + post / 2, floor)
        p.line(cx - post / 2, floor, cx + post / 2, floor)
        p.line(cx - post * 1.8, beam + size * 0.34, cx + post * 1.8, beam + size * 0.34)
        p.line(cx - side * post * 1.9, beam + size * 0.34, cx, beam + post)
      }

      // The beam carries the load, so it gets the only ink fill in the machine.
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      p.fill(ink)
      p.rect(0, beam + settle * size * 0.05, w - size * 0.16, post * 1.1)
      p.pop()

      const beamY = beam + settle * size * 0.05
      outline(p, ink, weight)
      p.line(x, beamY + post, x, hook - crate / 2)
      p.line(x - size * 0.11, hook - crate / 2, x + size * 0.11, hook - crate / 2)

      solid(p, ink, weight, s.color)
      p.rect(x, beamY + post * 1.6, size * 0.34, size * 0.18)

      // Stacks either side, so the crane is visibly moving stock between them.
      outline(p, ink, weight)
      for (let i = 0; i < 2; i++) {
        p.rect(from, low - i * crate, crate, crate)
      }
      p.rect(to, low, crate, crate)

      const crateX = carrying ? x : u < 0.14 ? from : to
      const crateY = carrying ? hook : low
      solid(p, ink, weight, s.color)
      p.rect(crateX, crateY, crate, crate)

      outline(p, ink, weight)
      p.line(-w / 2, floor, w / 2, floor)
    })
  },
})
