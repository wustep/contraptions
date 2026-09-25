import type p5 from 'p5'
import { FLOOR, R, type Pt } from '../../../../parts'
import { scenery, type Ctx } from './kit'
import { BAR } from './worlds'

/**
 * Seb's: the room, and where everything in it stands. One layout, used
 * three times: the real club at the start (the piano, and Mia at her
 * table), the same room the moment it turns into the dream (the kiss), and
 * the real club again at the end, drawn at the far end of the chain where
 * the dream's last set was struck. The parts place themselves against
 * these numbers, so a match cut lands.
 *
 * Cells, in the frame of the part that has the ball in this room: the piano
 * part at the start, the kiss, and the finale at the end. In each the room's
 * origin is the part's entry cell, and the ball comes in at (-0.5, 0), which
 * is the left end of the piano's keys, at the height it rolls on them. The
 * piano is drawn from the front, its keys along the frame, its lid up
 * behind. It is a big piano: the camera is close, and a key is a ball's
 * width and a bit.
 */
export const ROOM = {
  /** The keys run from KEYS[0] to KEYS[1]; the ball rolls along them at y = 0, its centre a ball's radius over the key tops. */
  keys: [-0.5, 11.8] as Pt,
  /** Number of keys. */
  keyCount: 88,
  /** The club's floor, below the keys: a ball on it has its centre at floorBall. */
  floor: 1.0,
  floorBall: 1.0 - R,
  /** Mia's table, to the right of the piano; her ball rests on the floor beside it, at rest, facing the piano. */
  table: 17.0,
  /** The stairs up to the street, and the door at their top. */
  stairs: [19.5, 23] as Pt,
  door: [23, -2] as Pt,
  /** The top of the piano's case over the keys, and the peak of its raised lid. */
  case: -2.4,
  lid: -4.2,
  /** The lamp over the piano: the one light in the real room. */
  lamp: [5.5, -5.2] as Pt,
}

/** Where the kiss lands: Seb's ball touching hers, on the floor beside her table. */
export const KISS_AT: Pt = [ROOM.table - 2 * R - 0.02, ROOM.floorBall]

export interface RoomState {
  /** Whether the room is dressed as the dream (the kiss and after) or is itself. */
  dream: boolean
}

/**
 * The room as scenery (the walls, the floor, the tables, the bar, the lamp,
 * the stairs), drawn behind the parts. The piano is the part's own, since
 * its keys are the machine. Not yet built: the club builder draws it.
 */
export const room = scenery<RoomState>({
  name: 'room',
  draw: (p: p5, s: RoomState, c: Ctx) => drawRoom(p, s, c),
})

function drawRoom(p: p5, _s: RoomState, c: Ctx): void {
  const { k, ink, weight } = c
  p.push()
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.noFill()
  // The floor line, the stairs and the door, as a sketch, until the room is drawn.
  p.line(-3 * k, ROOM.floor * k, ROOM.stairs[0] * k, ROOM.floor * k)
  const steps = 6
  for (let i = 0; i < steps; i++) {
    const x0 = ROOM.stairs[0] + ((ROOM.stairs[1] - ROOM.stairs[0]) * i) / steps
    const x1 = ROOM.stairs[0] + ((ROOM.stairs[1] - ROOM.stairs[0]) * (i + 1)) / steps
    const y = ROOM.floor + ((ROOM.door[1] - ROOM.floor) * (i + 1)) / steps
    p.line(x0 * k, (ROOM.floor + ((ROOM.door[1] - ROOM.floor) * i) / steps) * k, x0 * k, y * k)
    p.line(x0 * k, y * k, x1 * k, y * k)
  }
  p.fill(BAR.brass)
  p.noStroke()
  p.circle(ROOM.lamp[0] * k, ROOM.lamp[1] * k, 0.3 * k)
  p.stroke(ink)
  p.noFill()
  p.line((ROOM.table - 0.6) * k, (ROOM.floor - 0.6) * k, (ROOM.table + 0.6) * k, (ROOM.floor - 0.6) * k)
  p.line(ROOM.table * k, (ROOM.floor - 0.6) * k, ROOM.table * k, ROOM.floor * k)
  p.pop()
  void FLOOR
}
