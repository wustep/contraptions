import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
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
const WINCH: [number, number] = [-0.28, -0.16]

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

    // No gap in the rail: the ball waits on it, and the gap existed only for
    // a pedestal that reached down through the floor.
    floor(p, k, ink, weight, s)

    p.push()
    p.scale(heading(s.flow), 1)
    outline(p, ink, weight)
    // The seat the ball waits in. It used to be drawn as a post below the
    // rail — a stalactite under the floor the ball is sitting on.
    for (const x of [-0.11, 0.11]) p.line(x * k, FLOOR * k, x * k, (FLOOR - 0.06) * k)
    // The winch stands on the rail, not in the empty corner.
    outline(p, ink, weight)
    p.line(WINCH[0] * k, WINCH[1] * k, WINCH[0] * k, FLOOR * k)
    solid(p, ink, weight, s.color)
    p.circle(WINCH[0] * k, WINCH[1] * k, 0.12 * k)
    outline(p, ink, weight)
    p.line(WINCH[0] * k, WINCH[1] * k, (WINCH[0] + 0.08) * k, (WINCH[1] + 0.08) * k)

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
    const hy = -0.42 + Math.cos(angle) * ARM
    outline(p, ink, weight)
    // The rope, taut while the winch has it.
    if (t >= 0.12 && t < 0.9) p.line(WINCH[0] * k, WINCH[1] * k, hx * k, hy * k)
    p.line(0, -0.42 * k, hx * k, hy * k)
    p.push()
    p.translate(hx * k, hy * k)
    p.rotate(-angle)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, HEAD * k, HEAD * 0.7 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, -0.42 * k, 0.08 * k)
    p.pop()
  },
})
