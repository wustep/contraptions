import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutCubic, lerp, seg } from '../core/ease'

/** An overhead crane fetching a crate from one side and setting it on the other. */
export const gantry = defineContraption({
  name: 'gantry',
  label: 'Gantry',
  tags: ['lift', 'square'],
  span: [2, 2],
  rotations: [0],
  fireAt: 0.7,
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const railY = -h / 2 + size * 0.22
    const floorY = h / 2
    const crate = size * 0.52
    const leg = w / 2 - size * 0.16
    const reach = w * 0.26
    const from = -reach * s.dir
    const to = reach * s.dir
    const high = railY + size * 0.62
    const low = floorY - crate / 2

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

    outline(p, ink, weight)
    p.line(-w / 2, railY, w / 2, railY)
    p.line(-leg, railY, -leg, floorY)
    p.line(leg, railY, leg, floorY)
    p.line(-w / 2, floorY, w / 2, floorY)
    // Corner trusses give the frame enough weight to hold a 2x2 footprint.
    p.line(-leg, railY + size * 0.3, -leg + size * 0.3, railY)
    p.line(leg, railY + size * 0.3, leg - size * 0.3, railY)
    p.line(x, railY, x, hook - crate / 2)
    // The hook itself, so the cable ends in something.
    p.line(x - size * 0.1, hook - crate / 2, x + size * 0.1, hook - crate / 2)

    solid(p, ink, weight, s.color)
    p.rect(x, railY, size * 0.3, size * 0.16)

    const crateX = carrying ? x : u < 0.14 ? from : to
    const crateY = carrying ? hook : low
    solid(p, ink, weight, s.color)
    p.rect(crateX, crateY, crate, crate)
  },
})
