import { box, scenery } from '../kit'
import { LOFT } from '../worlds'
import { BENCH, CANDLE, FLOOR_Y, ROOM, SKYLIGHT } from './layout'

/**
 * LOFT-A's file (a stub until built): the loft itself, drawn from show time for the whole show. The walls and the
 * roof, the skylight and its moonlight, the floor, the bench and its shelves, the candle on its chamberstick. The
 * stove and the cat are LOFT-B's (`hearth.ts`); the machines of the sneak are each part's own.
 *
 * The room is dark. Every lit thing in it is lit by the spark (where it is: `show.where`) or by the moon; draw a
 * light map, as All at Once's laundromat did, rather than a flat room. Keep the names below.
 */

/** Every cell the room covers: the set is drawn whenever any of it is in view. */
export const ROOM_CELLS = box(ROOM.x0, ROOM.y0, ROOM.x1, ROOM.y1, 2)

export const room = scenery<null>({
  name: 'loft-room',
  draw: (p, _s, c) => {
    const { k, ink, weight } = c
    p.push()
    p.stroke(LOFT.moonDeep)
    p.strokeWeight(weight * 0.6)
    p.noFill()
    // The floor, the bench top, the skylight: a stand-in for the room.
    p.line(ROOM.x0 * k, FLOOR_Y * k, ROOM.x1 * k, FLOOR_Y * k)
    p.line(BENCH.x0 * k, BENCH.top * k, BENCH.x1 * k, BENCH.top * k)
    p.rect(((SKYLIGHT.x0 + SKYLIGHT.x1) / 2) * k, ((SKYLIGHT.y0 + SKYLIGHT.y1) / 2) * k, (SKYLIGHT.x1 - SKYLIGHT.x0) * k, (SKYLIGHT.y1 - SKYLIGHT.y0) * k)
    // The candle and its chamberstick.
    p.stroke(ink)
    p.fill(LOFT.tallow)
    p.rect(CANDLE.x * k, ((CANDLE.top + CANDLE.foot) / 2) * k, CANDLE.r * 2 * k, (CANDLE.foot - CANDLE.top) * k)
    p.fill(LOFT.pewter)
    p.rect(CANDLE.x * k, (CANDLE.foot + 0.1) * k, 1.2 * k, 0.2 * k)
    p.pop()
  },
})
