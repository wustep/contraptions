import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { FLOOR, SPEED, floor, since, type Beat } from './parts'

/**
 * A bellows under the line: the ball's weight squashes it going over, and the
 * puff out of the nozzle throws it clear into the next cell.
 *
 * The lane is the shape of that: down onto the top board as it gives, a beat
 * held at the bottom of the squash, then a hop over the nozzle in three
 * quickening pieces. The board and the ball come off the same numbers, so the
 * ball is never seen pressing on air.
 */
const FIRE = 0.4
const TOP = FLOOR
const BOTTOM = 0.44
const PLEATS = 4
const HALF_W = 0.2
/** How far the top board sinks under the ball. */
const GIVE = 0.1
/** The ball's fall onto the board, its pause there, and the top of its hop. */
const SINK = 0.045
const HELD = 0.03
const APEX = -0.03

export const bellows = defineContraption<Beat>({
  name: 'bellows',
  label: 'Bellows',
  tags: ['ball', 'pop'],
  role: 'relay',
  inlets: ['E', 'W', 'N'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const low = y + GIVE - 0.01
    const roll0 = 0.44 / SPEED
    return {
      pieces: [
        roll([-0.5, y], [-0.06, y], SPEED),
        roll([-0.06, y], [0, low], Math.hypot(0.06, low - y) / SINK),
        hold([0, low], HELD),
        roll([0, low], [0.22, APEX], Math.hypot(0.22, low - APEX) / 0.02),
        roll([0.22, APEX], [0.5, y], Math.hypot(0.28, y - APEX) / 0.018),
      ],
      // The squash starts as the ball starts pressing, not as it lands.
      fire: roll0,
    }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const squash = easeOutCubic(seg(t, 0, SINK)) - easeInOutCubic(seg(t, 0.1, 0.45))
    const top = TOP + squash * GIVE

    floor(p, k, ink, weight, s, HALF_W + 0.02)

    outline(p, ink, weight)
    // The nozzle, a short spout off the board's edge angled up so the puff
    // goes under the ball rather than past it.
    p.line(HALF_W * k, (top - 0.01) * k, 0.4 * k, (top - 0.07) * k)
    p.line(HALF_W * k, (top + 0.05) * k, 0.4 * k, (top - 0.01) * k)
    p.line(0.4 * k, (top - 0.07) * k, 0.4 * k, (top - 0.01) * k)

    // The pleats between the two boards.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    for (let i = 0; i <= PLEATS * 2; i++) {
      const y = top + 0.04 + ((BOTTOM - 0.02 - top - 0.04) * i) / (PLEATS * 2)
      p.vertex((i % 2 === 0 ? HALF_W - 0.04 : HALF_W) * k, y * k)
    }
    for (let i = PLEATS * 2; i >= 0; i--) {
      const y = top + 0.04 + ((BOTTOM - 0.02 - top - 0.04) * i) / (PLEATS * 2)
      p.vertex((i % 2 === 0 ? -HALF_W + 0.04 : -HALF_W) * k, y * k)
    }
    p.endShape(p.CLOSE)
    p.pop()
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      p.beginShape()
      for (let i = 0; i <= PLEATS * 2; i++) {
        const y = top + 0.04 + ((BOTTOM - 0.02 - top - 0.04) * i) / (PLEATS * 2)
        p.vertex(side * (i % 2 === 0 ? HALF_W - 0.04 : HALF_W) * k, y * k)
      }
      p.endShape()
    }
    // The boards.
    solid(p, ink, weight, s.color)
    p.rect(0, (top + 0.02) * k, (HALF_W * 2 + 0.04) * k, 0.05 * k)
    p.rect(0, (BOTTOM + 0.02) * k, (HALF_W * 2 + 0.04) * k, 0.05 * k)

    // The puff, out of the nozzle as the ball leaves it.
    if (t > 0.06 && t < 0.24) {
      const f = seg(t, 0.06, 0.24)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (let i = 0; i < 3; i++) {
        const x = Math.min(0.46, 0.32 + 0.1 * f + i * 0.04)
        const r = (0.06 + 0.08 * f) * (1 - i * 0.2)
        p.arc(x * k, (top - 0.04) * k, r * k, r * k, -0.5, 0.5)
      }
      p.pop()
    }
  },
})
