import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery } from '../kit'
import type { Pen } from '../pen'
import {
  drawBlanket,
  drawBuilding,
  drawDebris,
  drawFireEscape,
  drawFlakes,
  drawHeap,
  drawMishBed,
  drawMishkin,
  drawOutside,
  drawStamp,
  drawTub,
  drawWallOver,
  drawWaterOver,
  toneMarty,
  toneMish,
} from './draw'
import { END, HOTEL_STRIKES, hotelShots, LAND, mishkin, STANDS, WAY } from './geo'

/**
 * The hotel on the Upper West Side (91.016 → 121.018, bars 43 to 56), the building cut open at night. He comes in at
 * rest on the floorboards just inside the door of his room as the second hook begins, and bounces across it on the
 * radiator's knocks, onto the iron bed and off it into the tub. On the bridge ("There's a room where the light won't
 * find you") the bulb goes and the moon comes in; the floor under the tub creaks, and cracks on every beat ("Holding
 * hands while the walls come tumbling down"), and on bar 48 the tub goes through it onto Ezra Mishkin reading in bed
 * below. Mishkin comes up out of the plaster; Marty bounces off his head, the tub's rim and the sill, out of the
 * window ("So glad we've almost made it") and down the fire escape a tread a beat, Mishkin's head out of the window
 * above; on bar 55 the last ladder slides down on its counterweight, and he drops to the pavement under the
 * streetlight and comes to rest at its foot.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const HOTEL_AT: Pt = [0, 0]
export const HOTEL_CELLS = box(-10, -12, 24, 18, 1)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number, tone: (h: string) => string = (h) => h): Pen => ({ p, k, ink, w, tone })

/** The night, the street, the building cut open, the fire escape: drawn first, on show time. */
export const hotelSet = scenery<null>({
  name: 'hotel-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    const f = frame(p, c.k)
    p.push()
    drawOutside(pen, c.t, f)
    drawBuilding(pen, c.t, f)
    drawFireEscape(pen, c.t)
    p.pop()
  },
})

interface HotelState {
  begin: number
}

/** The tub: across the room, into it, through the floor onto Mishkin, out of the window and down (bar 43 → bar 57). */
export const tub = part<HotelState>(
  {
    name: 'tub',
    dynamic: true,
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const base = penOf(p, c.k, c.ink, c.weight)
      const marty: Pen = { ...base, tone: toneMarty(t) }
      const mish: Pen = { ...base, tone: toneMish }
      const pose = mishkin(t)
      p.push()
      drawMishBed(mish, t)
      const standing = t >= STANDS - 0.25
      if (!standing) drawMishkin(mish, t, pose)
      drawBlanket(mish, t, pose)
      drawFlakes(mish, t)
      // The tub: in his room's light till it is through the floor.
      drawTub(t < LAND - 0.5 ? marty : mish, t)
      drawHeap(mish, t)
      if (standing) {
        drawMishkin(mish, t, pose)
        drawWallOver(base, frame(p, c.k))
      }
      drawDebris(mish, t)
      drawStamp(mish, t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      drawWaterOver({ ...penOf(p, c.k, c.ink, c.weight), tone: toneMarty(t) }, t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-10, -12, 24, 18, 1),
    exit: [END[0] + 0.5, END[1]] as Pt,
    lane: { segs: WAY.segs, fire: 0 },
    state: { begin: slot.begin },
  }),
  () => hotelShots(),
)

export const HOTEL_HITS: readonly number[] = HOTEL_STRIKES

export const HOTEL_WIDE: [number, number][] = []


