import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, easeOutCubic, seg } from '../../core/ease'
import { FLOOR, HALF, floor, rollLane, since, type Beat } from './parts'

/**
 * A flap hung across the line from a bracket: the ball shoulders it open and
 * goes through, and it swings shut behind and rattles against its stop.
 *
 * A plain crossing, so the ball takes the plain lane; all this cell owns is
 * the swing, started a hair early so the flap is out of the way by the time
 * the ball is under it.
 */
const FIRE = 0.4
const HINGE = -0.24
/** The ball's leading edge reaches the flap a little before its centre does. */
const START = FIRE - HALF * 0.3

export const flap = defineContraption<Beat>({
  name: 'flap',
  label: 'Flap',
  tags: ['ball', 'swing'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, START)
    const open = easeOutCubic(seg(t, 0, 0.06)) - easeInQuad(seg(t, 0.08, 0.26))
    const rattle = t > 0.26 && t < 0.5 ? 0.14 * Math.sin((t - 0.26) * 60) * (1 - seg(t, 0.26, 0.5)) : 0
    // Negative swings the leaf east: the ball shoulders it the way it travels.
    const angle = -(1.35 * open + Math.abs(rattle))

    floor(p, k, ink, weight, s)
    outline(p, ink, weight)
    // The bracket: a post from the top edge and a crossbar the flap hangs from.
    p.line(0, -0.5 * k, 0, HINGE * k)
    p.line(-0.14 * k, HINGE * k, 0.14 * k, HINGE * k)

    p.push()
    p.translate(0, HINGE * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect(0, ((FLOOR - HINGE) / 2) * k, 0.09 * k, (FLOOR - HINGE - 0.01) * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, HINGE * k, 0.08 * k)
  },
})
