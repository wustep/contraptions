import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { FLOOR, SPEED, TOKEN, flick, floor, since, type Beat } from './parts'

/**
 * A bell hung over the end of the line with its clapper down in the ball's
 * way: the ball rolls into the cradle, shoulders the clapper, the bell rings
 * and rocks on its yoke, and that is what everything before it was for.
 *
 * The ball then stays in the cradle for exactly `emit` — until the next one
 * arrives to take its place, at the same instant and the same point. The end
 * of the line is never empty, so nothing pops out of existence.
 */
const FIRE = 0
const BW = 0.48
const BH = 0.32
const CROWN = -0.42
/** Where the clapper hangs from, inside the bell. */
const HINGE = CROWN + BH * 0.4
/** Where the ball comes to rest: just touching the clapper. */
const SEAT = -0.2

export const bell = defineContraption<Beat>({
  name: 'bell',
  label: 'Bell',
  tags: ['strike', 'signal'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx: LaneCtx): Lane => {
    const pieces = [roll([-0.5, ctx.floorY], [SEAT, ctx.floorY], SPEED)]
    if (ctx.out === null) return { pieces: [...pieces, hold([SEAT, ctx.floorY], ctx.emit)] }
    return { pieces: [...pieces, roll([SEAT, ctx.floorY], [0.5, ctx.floorY], SPEED)] }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const hit = 1 - seg(t, 0, 0.18)
    const rock = hit * 0.22 * Math.sin(hit * Math.PI * 4)

    floor(p, k, ink, weight, s)

    // The cradle the ball comes to rest in: a dish under the rail and two
    // horns just wider than the ball, so the seat reads without anything
    // standing in the middle of the lane.
    const dish = TOKEN + 0.1
    outline(p, ink, weight)
    p.arc(SEAT * k, FLOOR * k, dish * k, 0.16 * k, 0, Math.PI)
    for (const side of [-1, 1]) {
      p.line((SEAT + (side * dish) / 2) * k, FLOOR * k, (SEAT + (side * dish) / 2) * k, (FLOOR - 0.07) * k)
    }
    solid(p, ink, weight, s.color)
    p.rect(SEAT * k, (FLOOR + 0.16) * k, (TOKEN + 0.12) * k, 0.07 * k)
    outline(p, ink, weight)
    p.line(SEAT * k, (FLOOR + 0.2) * k, SEAT * k, 0.5 * k)

    if (hit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (const side of [-1, 1]) {
        for (let i = 1; i <= 2; i++) {
          const r = BW * (0.9 + i * 0.3 + hit * 0.25) * k
          p.arc(side * BW * 0.42 * k, (CROWN + BH * 0.5) * k, r, r, side > 0 ? -0.55 : Math.PI - 0.55, side > 0 ? 0.55 : Math.PI + 0.55)
        }
      }
      p.pop()
    }

    p.push()
    p.translate(0, -0.5 * k)
    p.rotate(rock)
    outline(p, ink, weight)
    p.line(0, 0, 0, (CROWN + 0.5) * k)
    p.fill(s.color)
    p.beginShape()
    p.vertex((-BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.bezierVertex((-BW / 2) * k, (CROWN + 0.5) * k, -BW * 0.22 * k, (CROWN + 0.5) * k, 0, (CROWN + 0.5) * k)
    p.bezierVertex(BW * 0.22 * k, (CROWN + 0.5) * k, (BW / 2) * k, (CROWN + 0.5) * k, (BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.endShape(p.CLOSE)
    p.line((-BW / 2) * k, (CROWN + 0.5 + BH) * k, (BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.pop()
  },
  // The clapper hangs between the viewer and the ball it is struck by, so it
  // is drawn after the world's tokens rather than under them.
  over: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const hit = 1 - seg(t, 0, 0.18)
    p.push()
    p.translate(0, HINGE * k)
    p.rotate(flick(t) * 0.7 + hit * 0.11 * Math.sin(hit * Math.PI * 4))
    outline(p, ink, weight)
    p.line(0, 0, 0, -HINGE * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -HINGE * k, 0.13 * k)
    p.pop()
  },
})
