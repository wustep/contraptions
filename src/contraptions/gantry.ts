import { defineContraption } from '../core/define'
import { clipBox, outline, solid } from '../core/draw'
import { easeInOutCubic, easeOutQuad, lerp, seg } from '../core/ease'

/**
 * A portal crane shuttling a crate between two pads.
 *
 * The second half of the loop replays the first half backwards, so the crane
 * carries the crate out and then fetches it home — the loop closes without the
 * crate ever teleporting back to its starting pad. Pads are low plinths rather
 * than full-height stacks: the hook needs most of the frame's height to travel
 * through, or the pick-up and set-down stop reading as vertical moves at all.
 */
export const gantry = defineContraption({
  name: 'gantry',
  label: 'Gantry',
  tags: ['lift', 'square'],
  span: [2, 2],
  rotations: [0],
  // The crate touching down on the far pad.
  fireAt: 0.42,
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const beam = -h / 2 + size * 0.3
    const floor = h / 2 - size * 0.14
    const crate = size * 0.5
    const leg = w / 2 - size * 0.2
    const post = size * 0.11
    const padH = size * 0.1
    const a = -leg * 0.62 * s.dir
    const b = leg * 0.62 * s.dir
    // Crate-center heights: resting on a pad, and carried under the trolley.
    const rest = floor - padH - crate / 2
    const carry = beam + size * 0.62

    // Out and back: t runs the delivery forward, then in reverse.
    const t = u < 0.5 ? u * 2 : (1 - u) * 2

    // lower to grab, lift, traverse, lower, set down and raise clear
    let x = a
    let hook = carry
    let carrying = false
    if (t < 0.16) {
      hook = lerp(carry, rest, easeInOutCubic(seg(t, 0, 0.16)))
    } else if (t < 0.34) {
      hook = lerp(rest, carry, easeInOutCubic(seg(t, 0.16, 0.34)))
      carrying = true
    } else if (t < 0.66) {
      x = lerp(a, b, easeInOutCubic(seg(t, 0.34, 0.66)))
      carrying = true
    } else if (t < 0.84) {
      x = b
      hook = lerp(carry, rest, easeInOutCubic(seg(t, 0.66, 0.84)))
      carrying = true
    } else {
      x = b
      hook = lerp(rest, carry, easeInOutCubic(seg(t, 0.84, 1)))
    }
    // The whole frame flexes a little as the load lands.
    const settle = easeOutQuad(seg(t, 0.84, 0.96)) * (1 - easeOutQuad(seg(t, 0.84, 0.96)))

    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      for (const side of [-1, 1]) p.line(side * leg, beam, side * leg, floor)

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

      // The two pads the crate shuttles between.
      outline(p, ink, weight)
      p.rect(a, floor - padH / 2, crate * 1.2, padH)
      p.rect(b, floor - padH / 2, crate * 1.2, padH)

      const crateX = carrying ? x : t < 0.16 ? a : b
      const crateY = carrying ? hook : rest
      solid(p, ink, weight, s.color)
      p.rect(crateX, crateY, crate, crate)

      outline(p, ink, weight)
      p.line(-w / 2, floor, w / 2, floor)
    })
  },
})
