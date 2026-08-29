import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, lerp, seg } from '../../core/ease'
import { ARRIVE, BENCH, bench, DEPART, HIT, lineOf, PART, part, partColor, RAIL, shuttle } from './shop'

/**
 * A trolley carries the part in along the overhead rail, lowers it into the
 * vat, and hauls it out again in the vat's colour to carry on east.
 */
const CARRY = -0.16
const SUNK = 0.18
const SURFACE = 0.04

export const dip = defineContraption({
  name: 'dip',
  label: 'Dip Tank',
  tags: ['work'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color, rng, theme }) => ({
    color,
    dye: rng.pick(theme.colors.filter((c) => c !== color)) ?? color,
  }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const xs = shuttle(u, ARRIVE, DEPART, lineOf(s))
    const y =
      u < 0.32 ? CARRY
      : u < 0.38 ? lerp(CARRY, SUNK, easeInOutCubic(seg(u, 0.32, 0.38)))
      : u < 0.46 ? SUNK
      : lerp(SUNK, CARRY, easeInOutCubic(seg(u, 0.46, 0.54)))
    const dyed = u >= 0.44

    clipCell(p, k, () => {
      bench(p, k, ink, weight)

      // The rail and its hangers, the trolley, the hook rod and the part.
      outline(p, ink, weight)
      p.line(-0.5 * k, RAIL * k, 0.5 * k, RAIL * k)
      for (const hx of [-0.34, 0.34]) p.line(hx * k, -0.5 * k, hx * k, RAIL * k)
      for (const x of xs) {
        outline(p, ink, weight)
        p.line(x * k, RAIL * k, x * k, (y - PART / 2) * k)
        for (const wx of [-0.05, 0.05]) p.circle((x + wx) * k, RAIL * k, 0.05 * k)
        solid(p, ink, weight, s.color)
        p.rect(x * k, (RAIL - 0.055) * k, 0.16 * k, 0.05 * k)
        part(p, k, ink, weight, dyed ? s.dye : partColor(s), x, y)
        outline(p, ink, weight)
        p.circle(x * k, (y - PART / 2 - 0.02) * k, 0.05 * k)
        // Drips on the way out.
        if (dyed && u < 0.66) {
          p.push()
          p.noStroke()
          p.fill(s.dye)
          for (const [dx, at] of [[-0.06, 0.5], [0.07, 0.54]] as const) {
            const f = seg(u, at, at + 0.1)
            if (f > 0 && f < 1) p.circle((x + dx) * k, lerp(y + PART / 2, SURFACE, easeInQuad(f)) * k, 0.035 * k)
          }
          p.pop()
        }
      }

      // The vat, drawn over the part so it goes under the surface.
      p.push()
      p.noStroke()
      p.fill(s.dye)
      p.rect(0, ((SURFACE + BENCH) / 2) * k, 0.44 * k, (BENCH - SURFACE) * k)
      p.pop()
      outline(p, ink, weight)
      p.line(-0.22 * k, SURFACE * k, 0.22 * k, SURFACE * k)
      for (const vx of [-0.24, 0.24]) p.line(vx * k, -0.02 * k, vx * k, BENCH * k)
    })
  },
})
