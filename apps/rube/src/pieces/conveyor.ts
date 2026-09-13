import { outline, solid } from '../../../../src/core/draw'

import { FLOOR, ROLL, definePiece, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * An inclined conveyor. The ball rolls off the rail onto the foot of the
 * belt and trips the switch; the motor at the top winds up, the belt
 * starts, and a cleat carries the ball up one floor and tips it onto the
 * rail. The belt runs on for a moment after, then the motor spins down.
 * The slowest beat in the show, on purpose.
 */
const FOOT: Pt = [-0.15, FLOOR]
const HEAD: Pt = [1.2, -1 + FLOOR]
/** The ball's centre line, one radius above the belt. */
const P0: Pt = [-0.23, 0.03]
const P1: Pt = [1.12, -0.97]
const ARRIVE = (0.5 + P0[0]) / ROLL
const WIND = 0.35
const RIDE = 1.7
const OVERRUN = 0.9
const FIRE = ARRIVE + WIND
const CLEAT = 0.34

export const conveyor = definePiece<{ color: string }>({
  name: 'conveyor',
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], P0, ROLL),
        wait(P0, WIND),
        { from: P0, to: P1, dur: RIDE },
        roll([P1[0], -1], [1.5, -1], ROLL, 'out'),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const dx = HEAD[0] - FOOT[0]
    const dy = HEAD[1] - FOOT[1]
    const len = Math.hypot(dx, dy)
    const ux = dx / len
    const uy = dy / len
    const nx = -uy
    const ny = ux
    // How far the belt has run, in cells along it.
    const speed = len / RIDE
    const run =
      since < 0 ? 0
      : since < RIDE + OVERRUN ? since * speed
      : (RIDE + OVERRUN) * speed + (1 - Math.exp(-(since - RIDE - OVERRUN) * 3)) * speed * 0.3
    const spinning = since >= 0 && since < RIDE + OVERRUN + 0.6

    // The rail in, the switch, and the rail out at the top.
    rail(p, k, ink, weight, -0.5, FOOT[0] - 0.02)
    const tripped = t < ARRIVE - 0.06 ? 0 : t < ARRIVE ? over(t, ARRIVE - 0.06, ARRIVE) : since < RIDE ? 1 : 1 - over(since, RIDE, RIDE + 0.3)
    p.push()
    p.translate(-0.4 * k, (FLOOR - 0.02) * k)
    p.rotate(-0.6 + 0.8 * tripped)
    solid(p, ink, weight, s.color)
    p.rect(0, -0.06 * k, 0.03 * k, 0.12 * k)
    p.pop()
    rail(p, k, ink, weight, HEAD[0] + 0.02, 1.5, -1 + FLOOR)

    // The frame: legs from the belt to the ground.
    outline(p, ink, weight)
    for (const f of [0.25, 0.6, 0.92]) {
      const x = FOOT[0] + dx * f
      const y = FOOT[1] + dy * f + 0.1
      p.line(x * k, y * k, x * k, 0.5 * k)
    }
    p.line((FOOT[0] + dx * 0.2) * k, 0.5 * k, (FOOT[0] + dx * 0.97) * k, 0.5 * k)

    // The belt: the top run and the return, on two rollers.
    p.push()
    p.stroke(s.color)
    p.strokeWeight(weight * 2.6)
    p.line(FOOT[0] * k, FOOT[1] * k, HEAD[0] * k, HEAD[1] * k)
    p.line((FOOT[0] + nx * 0.14) * k, (FOOT[1] + ny * 0.14) * k, (HEAD[0] + nx * 0.14) * k, (HEAD[1] + ny * 0.14) * k)
    p.pop()
    outline(p, ink, weight)
    p.line(FOOT[0] * k, FOOT[1] * k, HEAD[0] * k, HEAD[1] * k)
    p.line((FOOT[0] + nx * 0.14) * k, (FOOT[1] + ny * 0.14) * k, (HEAD[0] + nx * 0.14) * k, (HEAD[1] + ny * 0.14) * k)
    for (const end of [FOOT, HEAD]) {
      solid(p, ink, weight, bg)
      p.circle((end[0] + nx * 0.07) * k, (end[1] + ny * 0.07) * k, 0.14 * k)
      p.push()
      p.translate((end[0] + nx * 0.07) * k, (end[1] + ny * 0.07) * k)
      p.rotate(run / 0.07)
      outline(p, ink, weight)
      p.line(-0.05 * k, 0, 0.05 * k, 0)
      p.pop()
    }
    // Cleats along the top run, moving with the belt.
    for (let i = -1; i < len / CLEAT + 1; i++) {
      const along = ((i * CLEAT + run) % (len + CLEAT) + len + CLEAT) % (len + CLEAT) - CLEAT / 2
      if (along < 0.02 || along > len - 0.02) continue
      const x = FOOT[0] + ux * along
      const y = FOOT[1] + uy * along
      solid(p, ink, weight, s.color)
      p.push()
      p.translate(x * k, y * k)
      p.rotate(Math.atan2(uy, ux))
      p.rect(0, -0.04 * k, 0.035 * k, 0.08 * k)
      p.pop()
    }

    // The motor at the head: a box, a flywheel, and a drive belt to the top roller.
    const mx = HEAD[0] + 0.24
    const my = HEAD[1] + 0.3
    solid(p, ink, weight, s.color)
    p.rect(mx * k, my * k, 0.2 * k, 0.18 * k, 0.02 * k)
    solid(p, ink, weight, bg)
    p.circle(mx * k, (my - 0.16) * k, 0.12 * k)
    p.push()
    p.translate(mx * k, (my - 0.16) * k)
    p.rotate(run / 0.06 + (spinning ? 0 : 0))
    outline(p, ink, weight)
    p.line(-0.04 * k, 0, 0.04 * k, 0)
    p.line(0, -0.04 * k, 0, 0.04 * k)
    p.pop()
    outline(p, ink, weight * 0.8)
    p.line((mx - 0.06) * k, (my - 0.16) * k, (HEAD[0] + nx * 0.07 + 0.02) * k, (HEAD[1] + ny * 0.07 - 0.06) * k)
    p.line((mx + 0.06) * k, (my - 0.16) * k, (HEAD[0] + nx * 0.07 + 0.06) * k, (HEAD[1] + ny * 0.07 + 0.02) * k)
    // A lamp on the motor while it runs.
    solid(p, ink, weight, spinning ? s.color : bg)
    p.circle((mx + 0.06) * k, (my + 0.03) * k, 0.04 * k)
    // Motor whine: a few short arcs off the box while it winds up.
    if (t > ARRIVE && since < 0) {
      const f = over(t, ARRIVE, FIRE)
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (let i = 1; i <= 2; i++) {
        const r = (0.14 + i * 0.08 + f * 0.1) * k
        p.arc((mx + 0.1) * k, my * k, r, r, -0.5, 0.5)
      }
      p.pop()
    }
  },
})
