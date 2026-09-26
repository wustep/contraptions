import { box, scenery } from '../kit'
import { LOFT } from '../worlds'
import { CAT, DOOR, FLOOR_Y, STOVE } from './layout'

/**
 * LOFT-B's file (a stub until built): the stove and the cat, drawn from show time for the whole show, since both
 * matter at the start (the cat asleep in the stove's glow), in LOFT-B's slot (the door, the fire), and at the end:
 *
 * - `DOORS.back[2]`: the firebox door bursts open and the spark leaps out of the fire (the director's `home` part has
 *   the spark; this draws the door and the fire).
 * - `LAST[1]` (149.815, the loudest onset of the piece): the door bangs shut, and the cat's eye snaps open. It looks
 *   at the candle, sees a candle burning as it should, and by about 154 it has gone back to sleep.
 *
 * Keep the names below. `CAT_CUES` are the times the cat reacts (an ear, a tail, a stir), which LOFT-A's slot uses too:
 * the director set them from the loudest notes; move your own, and ask before moving another's.
 */

export const CAT_CUES = {
  /** An ear flicks (LOFT-A's slot: the drying rack's candles knock together). */
  ear: [25.653, 28.961],
  /** The tail twitches, or the cat shifts in its sleep (LOFT-B's slot). */
  stir: [42.455, 51.384],
  /** Wide awake: the door has banged. */
  wake: 149.815,
}

export const HEARTH_CELLS = box(STOVE.x0 - 4, -14, STOVE.x1 + 2, FLOOR_Y + 1, 1)

export const hearth = scenery<null>({
  name: 'loft-hearth',
  draw: (p, _s, c) => {
    const { k, ink, weight } = c
    p.push()
    p.stroke(ink)
    p.strokeWeight(weight * 0.6)
    p.fill(LOFT.iron)
    p.rectMode(p.CORNER)
    p.rect(STOVE.x0 * k, STOVE.top * k, (STOVE.x1 - STOVE.x0) * k, (FLOOR_Y - 1.5 - STOVE.top) * k)
    p.fill(LOFT.ember)
    p.rect(DOOR.x0 * k, DOOR.y0 * k, (DOOR.x1 - DOOR.x0) * k, (DOOR.y1 - DOOR.y0) * k)
    p.fill(LOFT.cat)
    p.ellipse(((CAT.x0 + CAT.x1) / 2) * k, ((CAT.y0 + FLOOR_Y) / 2) * k, (CAT.x1 - CAT.x0) * k, (FLOOR_Y - CAT.y0) * k)
    p.pop()
  },
})
