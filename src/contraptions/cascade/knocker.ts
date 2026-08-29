import { defineContraption } from '../../core/define'
import { clipCell, floorRail, outline, solid } from '../../core/draw'
import { easeInOutSine, easeInQuad, lerp, seg } from '../../core/ease'
import { FLOOR, floor, heading, rollIn, rollOut, since, token, tokenColor, until, type Beat } from './parts'

/**
 * A mallet on a hinge over a ball on a pedestal: the winch hauls the mallet
 * up, the catch lets it go, it swings down and knocks the ball off its perch
 * and away down the run, and a fresh ball rolls in to take its place.
 */
const FIRE = 0.5
const ARM = 0.36
const HEAD = 0.2
/** Where the head meets the ball, and where the winch holds it. */
const HIT = 0.43
const COCKED = 1.5
/** When the next ball arrives on the pedestal. */
const FEED = 0.62

export const knocker = defineContraption<Beat>({
  name: 'knocker',
  label: 'Knocker',
  tags: ['strike', 'ball'],
  role: 'source',
  outlets: ['E', 'W', 'S'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    let angle: number
    if (t < 0.12) angle = HIT + 0.14 * Math.sin((t / 0.12) * Math.PI)
    else if (t < 0.7) angle = lerp(HIT, COCKED, easeInOutSine(seg(t, 0.12, 0.7)))
    else if (t < 0.9) angle = COCKED
    else angle = lerp(COCKED, HIT, easeInQuad(seg(t, 0.9, 1)))

    floor(p, k, ink, weight, s, 0.1)

    p.push()
    p.scale(heading(s.flow), 1)
    outline(p, ink, weight)
    floorRail(p, k)
    // The pedestal.
    p.line(0, 0.5 * k, 0, (FLOOR + 0.02) * k)
    p.line(-0.09 * k, (FLOOR + 0.02) * k, 0.09 * k, (FLOOR + 0.02) * k)
    // The winch drum in the corner the mallet is hauled towards.
    solid(p, ink, weight, s.color)
    p.circle(-0.4 * k, -0.4 * k, 0.12 * k)
    outline(p, ink, weight)
    p.line(-0.4 * k, -0.4 * k, -0.33 * k, -0.33 * k)

    clipCell(p, k, () => {
      const ball = tokenColor(s)
      // The ball waits on the pedestal from the moment it arrives to the knock.
      const feed = rollIn(s, u, (FIRE + FEED) % 1, true)
      if (feed) token(p, k, ink, weight, ball, feed)
      else if (until(u, FIRE) <= 1 - FEED) token(p, k, ink, weight, ball, [0, 0])
      const out = rollOut(s, u, FIRE)
      if (out) token(p, k, ink, weight, ball, out)
    })

    // The mallet, hinged at the top of the cell.
    const hx = -Math.sin(angle) * ARM
    const hy = -0.5 + Math.cos(angle) * ARM
    outline(p, ink, weight)
    // The rope, taut while the winch has it.
    if (t >= 0.12 && t < 0.9) p.line(-0.4 * k, -0.4 * k, hx * k, hy * k)
    p.line(0, -0.5 * k, hx * k, hy * k)
    p.push()
    p.translate(hx * k, hy * k)
    p.rotate(-angle)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, HEAD * k, HEAD * 0.7 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, -0.5 * k, 0.08 * k)
    p.pop()
  },
})
