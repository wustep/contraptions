import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FAST, FLOOR, ROLL, burst, definePiece, over, rail, ramp, roll, wait, type Lane } from '../../parts'
import { drop } from './green'

/**
 * A watering can on a bracket over the path. A tongue in the rail is tied
 * by a cord to the can's handle; the ball rolls onto the tongue and into
 * a dip under the spout, the cord pulls the can over, and a shower comes
 * down on the ball and washes it on its way faster than it came. The can
 * drips a while and rights itself slowly, and there is a puddle after.
 */
const TONGUE = -0.2
const DIP = 0.02
const PIVOT = { x: 0.02, y: -0.56 }
const ROSE = { x: 0.24, y: -0.34 }
const T_TONGUE = (0.5 + TONGUE) / ROLL
const T_DIP = T_TONGUE + (DIP - TONGUE) / ((ROLL + 0) / 2)
const POUR = 0.22
const FIRE = T_DIP + POUR

export const wateringcan = definePiece<{ color: string }>({
  name: 'wateringcan',
  weight: 1,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [TONGUE, 0], ROLL),
        ramp([TONGUE, 0], [DIP, 0], ROLL, 0),
        wait([DIP, 0], POUR),
        ramp([DIP, 0], [0.3, 0], 0, FAST),
        ramp([0.3, 0], [0.5, 0], FAST, ROLL),
      ],
      fire: FIRE,
    }
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The tongue goes down under the ball; the cord pulls; the can tips over
    // and pours, then rights itself for the next one.
    const pressed = t < T_TONGUE ? 0 : t < T_DIP ? over(t, T_TONGUE, T_DIP) : since < 1.2 ? 1 : 1 - over(since, 1.2, 1.6)
    const tip =
      t < T_DIP ? 0
      : since < 0 ? 0.9 * easeOutCubic(over(t, T_DIP, FIRE))
      : since < 0.7 ? 0.9
      : 0.9 * (1 - easeInOutSine(over(since, 0.7, 2.2)))
    const pouring = tip > 0.6

    // The rail with the dip under the spout, and the tongue in it.
    rail(p, k, ink, weight, -0.5, TONGUE - 0.08)
    outline(p, ink, weight)
    p.line((TONGUE + 0.08) * k, FLOOR * k, (DIP - 0.08) * k, FLOOR * k)
    p.line((DIP - 0.08) * k, FLOOR * k, (DIP - 0.03) * k, (FLOOR + 0.02) * k)
    p.line((DIP - 0.03) * k, (FLOOR + 0.02) * k, (DIP + 0.03) * k, (FLOOR + 0.02) * k)
    p.line((DIP + 0.03) * k, (FLOOR + 0.02) * k, (DIP + 0.08) * k, FLOOR * k)
    rail(p, k, ink, weight, DIP + 0.08, 0.5)
    p.push()
    p.translate((TONGUE - 0.08) * k, FLOOR * k)
    p.rotate(0.35 * pressed)
    solid(p, ink, weight, s.color)
    p.rect(0.08 * k, 0, 0.16 * k, 0.03 * k)
    p.pop()
    // The bracket: a post behind the rail up to an arm over the path.
    outline(p, ink, weight)
    p.line(-0.38 * k, 0.5 * k, -0.38 * k, PIVOT.y * k)
    p.line(-0.44 * k, 0.5 * k, -0.32 * k, 0.5 * k)
    p.line(-0.38 * k, PIVOT.y * k, PIVOT.x * k, PIVOT.y * k)
    // The cord: from the tongue's heel up over the arm's end to the can's handle.
    outline(p, ink, weight * 0.8)
    p.line((TONGUE - 0.08) * k, (FLOOR - 0.01) * k, (TONGUE - 0.08) * k, (PIVOT.y + 0.05) * k)
    p.line((TONGUE - 0.08) * k, (PIVOT.y + 0.05) * k, (PIVOT.x - 0.16 + 0.1 * tip) * k, (PIVOT.y + 0.06 - 0.1 * tip) * k)

    // The can, hung on the arm's end by its handle's eye, tipping about it.
    p.push()
    p.translate(PIVOT.x * k, PIVOT.y * k)
    p.rotate(tip)
    solid(p, ink, weight, s.color)
    p.rect(0, 0.2 * k, 0.3 * k, 0.26 * k, 0.02 * k)
    p.rect(0, 0.04 * k, 0.12 * k, 0.06 * k)
    // The handle over the top, and the eye it hangs by.
    outline(p, ink, weight)
    p.noFill()
    p.arc(0, 0.06 * k, 0.26 * k, 0.16 * k, Math.PI, Math.PI * 2)
    solid(p, ink, weight, bg)
    p.circle(0, 0, 0.04 * k)
    // The spout, and its rose.
    outline(p, ink, weight * 1.6)
    p.line(0.15 * k, 0.16 * k, (ROSE.x - PIVOT.x) * k, (ROSE.y - PIVOT.y) * k)
    solid(p, ink, weight, s.color)
    p.circle((ROSE.x - PIVOT.x) * k, (ROSE.y - PIVOT.y) * k, 0.1 * k)
    p.pop()

    // The shower: drops from the rose down to the ball, while it pours.
    if (pouring) {
      const rx = PIVOT.x + Math.cos(tip + Math.atan2(ROSE.y - PIVOT.y, ROSE.x - PIVOT.x)) * Math.hypot(ROSE.x - PIVOT.x, ROSE.y - PIVOT.y)
      const ry = PIVOT.y + Math.sin(tip + Math.atan2(ROSE.y - PIVOT.y, ROSE.x - PIVOT.x)) * Math.hypot(ROSE.x - PIVOT.x, ROSE.y - PIVOT.y)
      for (let i = 0; i < 7; i++) {
        const f = ((t * 3.5 + i / 7) % 1 + 1) % 1
        const dx = (i - 3) * 0.025 * (1 + f)
        drop(p, k, s.color, rx + dx - 0.04 * f, ry + (FLOOR - ry) * f, 0.018)
      }
    }
    // The wash: a burst off the ball as the shower hits, and a puddle after.
    if (since > 0 && since < 0.3) {
      const f = over(since, 0, 0.3)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, DIP * k, 0, (0.16 + 0.12 * f) * k, (0.22 + 0.16 * f) * k, 5, 3.6)
      p.pop()
    }
    if (since > 0.1) {
      const g = over(since, 0.1, 1.2)
      solid(p, ink, weight, s.color)
      p.rect(DIP * k, (FLOOR + 0.05) * k, (0.1 + 0.2 * g) * k, 0.035 * k, 0.02 * k)
    }
  },
})
