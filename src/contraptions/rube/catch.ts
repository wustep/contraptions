import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { seg } from '../../core/ease'
import { FALL_V, FLOOR, SPEED, since, type Beat } from '../cascade/parts'
import { pieceTime, roll, type Lane, type LaneCtx, type Piece, type Pt } from '../../core/lane'
import { ARC_R, ARC_V, ARC_WALL, TUBE_W } from './fall'

/**
 * The bottom of a fall: a quarter-pipe turns the drop back into a roll. The
 * ball comes down the tube, sweeps round the pipe onto the rail, and carries
 * on the way the path is going. A cushion under the bend takes the landing.
 *
 * The lane approximates the quarter circle with three straight pieces; at
 * cell scale the corners are inside the stroke.
 */
const STEPS = 3

/** Points on the ball's arc from the tube's axis to the floor, in cell units. */
function arcPoints(y: number): Pt[] {
  const cx = ARC_R
  const cy = y - ARC_R
  const out: Pt[] = []
  for (let i = 0; i <= STEPS; i++) {
    const a = Math.PI - (i / STEPS) * (Math.PI / 2)
    out.push([cx + ARC_R * Math.cos(a), cy + ARC_R * Math.sin(a)])
  }
  return out
}

function catchLane(ctx: LaneCtx): Lane {
  const y = ctx.floorY
  const arc = arcPoints(y)
  const pieces: Piece[] = [roll([0, -0.5], arc[0], FALL_V)]
  for (let i = 1; i < arc.length; i++) pieces.push(roll(arc[i - 1], arc[i], ARC_V))
  pieces.push(roll(arc[arc.length - 1], [0.5, y], SPEED))
  // Fires as the ball lands on the rail.
  const fire = pieces.slice(0, -1).reduce((sum, piece) => sum + pieceTime(piece), 0)
  return { pieces, fire }
}

/** Where in its own loop a catch lands the ball: the fall plus the bend. */
const FIRE = catchLane({ in: 'N', out: 'E', emit: 1, floorY: 0 }).fire!

export const catchPipe = defineContraption<Beat>({
  name: 'catch',
  label: 'Catch',
  tags: ['ball', 'fall'],
  role: 'relay',
  inlets: ['N'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  lane: catchLane,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const squash = 1 - seg(t, 0, 0.12)
    const cx = ARC_R
    const cy = -ARC_R

    // The tube from above: the near wall runs into the pipe, the far wall
    // stops short so the ball can leave under it.
    outline(p, ink, weight)
    p.line(-TUBE_W * k, -0.5 * k, -TUBE_W * k, cy * k)
    p.line(TUBE_W * k, -0.5 * k, TUBE_W * k, -0.22 * k)

    // The pipe wall: a quarter circle from the near wall down onto the floor.
    p.arc(cx * k, cy * k, ARC_WALL * 2 * k, ARC_WALL * 2 * k, Math.PI / 2, Math.PI)
    // And the rail on from where it lands.
    p.line(cx * k, FLOOR * k, 0.5 * k, FLOOR * k)
    p.line(0.36 * k, FLOOR * k, 0.36 * k, 0.5 * k)

    // The cushion under the bend, squashed by the landing.
    solid(p, ink, weight, s.color)
    p.rect(0.02 * k, (FLOOR + 0.12 + squash * 0.02) * k, 0.24 * k, (0.09 - squash * 0.03) * k)
    outline(p, ink, weight)
    p.line(0.02 * k, (FLOOR + 0.17) * k, 0.02 * k, 0.5 * k)
  },
})
