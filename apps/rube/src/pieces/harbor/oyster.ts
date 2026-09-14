import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, over, rail, ramp, roll, wait, type BallChange, type Lane } from '../../parts'
import { bubbles, luminance, piling, water } from './sea'

/**
 * An oyster in the deck. The rail dips into the open lower shell; the
 * ball rolls in and stops; the upper shell snaps shut on it. A beat. The
 * shell opens again and what rolls out is a pearl — a different ball, in
 * the palest colour the world has — and the thread goes with it. The
 * oyster keeps the ball.
 */
const HINGE = -0.2
const SNAP = 0.12
const SHUT = 0.55
const T_STOP = 0.28 / ROLL + 0.22 / (ROLL / 2)
const FIRE = T_STOP + SNAP

export const oyster = definePiece<{ color: string; pearl: string }>({
  name: 'oyster',
  weight: 0.9,
  dynamic: true,
  place: ({ color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const pool = theme.colors.filter((c) => c !== ball.color)
    const pearl = [...(pool.length ? pool : theme.colors)].sort((a, b) => luminance(b) - luminance(a))[0]
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [-0.22, 0], ROLL),
        ramp([-0.22, 0], [0, 0], ROLL, 0),
        wait([0, 0], SNAP),
        wait([0, 0], SHUT, { hidden: true }),
        ramp([0, 0], [0.5, 0], 0, ROLL),
      ],
      fire: FIRE,
    }
    const changes: BallChange[] = [{ at: FIRE, relay: true, color: pearl }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, pearl }, changes }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const shut = since > 0.06 && since < SHUT

    water(p, k, ink, weight, -0.5, 0.5)
    piling(p, k, ink, weight, -0.36)
    piling(p, k, ink, weight, 0.4)
    rail(p, k, ink, weight, -0.5, -0.24)
    rail(p, k, ink, weight, 0.24, 0.5)
    // The lower shell: a scalloped cup the ball sits in, hinged at the back.
    shell(p, k, ink, weight, s.color, HINGE, FLOOR + 0.02, 0, false)
    // The pearl's glint as the lid comes off it.
    if (since > SHUT && since < SHUT + 0.5) {
      const f = 1 - over(since, SHUT, SHUT + 0.5)
      p.push()
      p.stroke(s.pearl)
      p.strokeWeight(weight)
      for (const a of [-1.2, -0.6, -2.0, -2.6]) {
        const r0 = 0.15 + 0.08 * (1 - f)
        p.line(Math.cos(a) * r0 * k, Math.sin(a) * r0 * k, Math.cos(a) * (r0 + 0.07 * f) * k, Math.sin(a) * (r0 + 0.07 * f) * k)
      }
      p.pop()
    }
    // Bubbles up from the shell while it is shut.
    if (shut) bubbles(p, k, ink, weight, bg, 0.12, FLOOR, -0.3, since, 3)
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The upper shell stands in front: open, snapped shut at the fire, opening again after the beat.
    const lid =
      since < 0 ? -1.5
      : since < 0.06 ? -1.5 * (1 - easeInQuad(over(since, 0, 0.06)))
      : since < SHUT ? 0
      : -1.3 * easeOutCubic(over(since, SHUT, SHUT + 0.3))
    shell(p, k, ink, weight, s.color, HINGE, FLOOR + 0.02, lid, true)
    // The snap: a clack of lines.
    if (since > 0.06 && since < 0.2) {
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const a of [-0.4, -0.8, -1.2]) {
        p.line((0.22 + Math.cos(a) * 0.05) * k, (Math.sin(a) * 0.05) * k, (0.22 + Math.cos(a) * 0.1) * k, (Math.sin(a) * 0.1) * k)
      }
      p.pop()
    }
  },
})

/** Half a shell hinged at (hx, hy): a fan of radial ribs, `angle` up from flat; the upper half is drawn mirrored. */
function shell(p: import('p5'), k: number, ink: string, weight: number, color: string, hx: number, hy: number, angle: number, upper: boolean): void {
  p.push()
  p.translate(hx * k, hy * k)
  p.rotate(angle)
  if (upper) p.scale(1, -1)
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex(0, 0)
  const n = 7
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI / 2) * (i / n) * 0.9 - 0.05
    const r = 0.44 * (1 + 0.04 * (i % 2))
    p.vertex(Math.cos(a) * r * k, Math.sin(a) * r * 0.5 * k)
  }
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.8)
  for (let i = 1; i < n; i += 2) {
    const a = (Math.PI / 2) * (i / n) * 0.9 - 0.05
    p.line(0.05 * k, 0.01 * k, Math.cos(a) * 0.4 * k, Math.sin(a) * 0.4 * 0.5 * k)
  }
  p.pop()
}
