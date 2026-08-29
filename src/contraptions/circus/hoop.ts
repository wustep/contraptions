import { defineContraption } from '../../core/define'
import { clipCell, outline } from '../../core/draw'
import { seg } from '../../core/ease'
import { P, flight, ground, hoop as ring, knock, pedestal, performer, stroke } from './circus'

/**
 * The lion leaps from one pedestal through the flaming hoop to the other, the
 * hoop flares as it goes through, and after a sit it leaps back the same way.
 */
const PED_X = 0.37
const PED_TOP = 0.1
const HOOP: [number, number] = [0, -0.14]
const HOOP_R = 0.2
const BAND = 0.05
const LEAP = 0.24

export const hoop = defineContraption({
  name: 'hoop',
  label: 'Hoop',
  tags: ['aerial'],
  role: 'source',
  rotations: [0],
  // Through the hoop.
  fireAt: 0.12 + LEAP / 2,
  weight: 1.2,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const left: [number, number] = [-PED_X, PED_TOP - P / 2]
    const right: [number, number] = [PED_X, PED_TOP - P / 2]
    const lift = left[1] - HOOP[1]

    let pos = left
    if (u >= 0.12 && u < 0.12 + LEAP) pos = flight(left, right, lift, seg(u, 0.12, 0.12 + LEAP))
    else if (u >= 0.12 + LEAP && u < 0.62) pos = right
    else if (u >= 0.62 && u < 0.62 + LEAP) pos = flight(right, left, lift, seg(u, 0.62, 0.62 + LEAP))

    const flare = Math.max(knock(u, 0.12 + LEAP / 2, 0.04, 0.3), knock(u, 0.62 + LEAP / 2, 0.04, 0.3))

    clipCell(p, k, () => {
    outline(p, ink, weight)
    ground(p, k, 1)
    stroke(p, k, HOOP[0], HOOP[1] + HOOP_R + BAND, HOOP[0], 0.5)
    stroke(p, k, HOOP[0] - 0.1, 0.5, HOOP[0] + 0.1, 0.5)
    pedestal(p, k, ink, weight, s.color, -PED_X, PED_TOP, 0.5, 0.2)
    pedestal(p, k, ink, weight, s.color, PED_X, PED_TOP, 0.5, 0.2)

    // The ring is drawn over the lion, so the band crosses it mid-leap and it
    // reads as going through rather than past.
    performer(p, k, ink, weight, s.color, pos[0], pos[1])
    ring(p, k, ink, weight, s.color, HOOP[0], HOOP[1], HOOP_R, BAND, flare)
    })
  },
})
