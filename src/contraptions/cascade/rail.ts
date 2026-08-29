import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { FLOOR, flick, floor, rollLane, since, type Beat } from './parts'

/**
 * Plain rail: the cell the snake crosses when nothing else is happening.
 * A tie plate, a post, and a sprung trip the ball knocks on its way past —
 * enough to say the ball came through here, not enough to compete with the
 * machines either side. `chains` decides how much of a run is this.
 *
 * The lane is the plain one, a straight roll along the floor, but it is
 * declared all the same: declaring a lane is how a machine says the ball
 * belongs to the world, and it is what runs one through this cell on the
 * catalog sheet.
 */
const FIRE = 0.5
const TRIP_X = 0.16

export const rail = defineContraption<Beat>({
  name: 'rail',
  label: 'Rail',
  tags: ['ball'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  weight: 1,
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)

    floor(p, k, ink, weight, s)

    // One post to the floor with a foot, and a coloured tie plate under the
    // rail. A filler cell has to be quiet: two legs and a cross-piece read as
    // a bench, and a row of benches is wallpaper.
    outline(p, ink, weight)
    p.line(0, (FLOOR + 0.11) * k, 0, 0.44 * k)
    p.line(-0.12 * k, 0.44 * k, 0.12 * k, 0.44 * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR + 0.06) * k, 0.24 * k, 0.07 * k)

    // The trip: knocked flat as the ball goes over, springs back up behind it.
    p.push()
    p.translate(TRIP_X * k, FLOOR * k)
    p.rotate(1.15 * flick(t, 0.03, 0.06, 0.22))
    outline(p, ink, weight)
    p.line(0, 0, 0, -0.11 * k)
    p.pop()
  },
})
