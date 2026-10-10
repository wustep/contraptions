import type { Pt } from '../../../../../parts'
import { at } from '../music'
import { box, frame, part, scenery, type PartShot } from '../kit'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawHall, drawPlay } from './draw'
import { EXIT, LONDON_STRIKES, REST, SEGS, T0, T1 } from './geo'

/**
 * London: the British Open, 1952 (bar 25 → bar 43). A big cold hall under an iron and glass roof, two green tables
 * under their conical lamps, the low barrier, the umpires on their high chairs, the gallery, and in its front row Kay
 * Stone. Marty beats the champion Kletzki in the semifinal on table A, the kick of his last smash carrying him over the
 * gap into his own pan on table B; he loses the final to Endo's dead sponge shot, and rolls off the end onto the
 * floorboards, where the hotel takes him.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const LONDON_AT: Pt = [0, 0]
export const LONDON_CELLS = box(-10, -9, 24, 5, 2)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number): Pen => ({ p, k, ink, w, tone: (h) => h })

/** The hall, the gallery, the barrier and the tables: drawn first, on show time. */
export const londonSet = scenery<null>({
  name: 'london-set',
  draw: (p, _s, c) => {
    p.push()
    drawHall(penOf(p, c.k, c.ink, c.weight), c.t, frame(p, c.k))
    p.pop()
  },
})

interface OpenState {
  begin: number
}

/** The British Open: the semifinal won, the final lost (bar 25 → bar 43). */
export const open = part<OpenState>(
  {
    name: 'open',
    draw: (p, s, c) => {
      p.push()
      drawPlay(penOf(p, c.k, c.ink, c.weight), s.begin + c.t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-6, -6, 20, 4),
    exit: EXIT,
    lane: { segs: SEGS, fire: at(41, 1) - slot.begin },
    state: { begin: slot.begin },
  }),
  () => shots(),
)

/**
 * The camera: the seam's close hold on him on the corner as the lamp comes on, out to the semifinal's table; on
 * Kletzki's miss a cut to the hall, wide, roof and all, and down onto the final's table; after the dead shot, down and
 * along with him to the floorboards, to the seam's framing.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, h: Pt, cut = false): PartShot => ({ t, cells, hold: h, w: 1, ...(cut ? { cut } : {}) })
  const seam = SEAMS.hotel
  const end: Pt = [REST[0] + seam.frame[0], REST[1] + seam.frame[1]]
  return [
    hold(T0 + 0.5, 3.4, [-0.1, -0.5]),
    hold(at(25, 3), 3.6, [-0.3, -0.48]),
    hold(55.2, 5.8, [2.04, -0.45]),
    hold(61, 5.8, [2.04, -0.58]),
    hold(66.4, 5.8, [2.04, -0.45]),
    hold(at(31, 4), 11, [7.2, -1.95], true),
    hold(68.0, 10.2, [7.7, -1.6]),
    hold(70.3, 6.0, [11.35, -0.5]),
    hold(78, 5.95, [11.35, -0.62]),
    hold(at(41, 1), 6.0, [11.35, -0.5]),
    hold(88.4, 5.9, [10.6, -0.2]),
    hold(89.4, 5.4, [9.0, 0.15]),
    hold(T1 - 0.17, seam.cells, end),
    hold(T1, seam.cells, end),
  ]
}

export const LONDON_HITS: readonly number[] = LONDON_STRIKES

/** The cut to the hall on Kletzki's miss, roof and all, until the final's first rally is under way. */
export const LONDON_WIDE: [number, number][] = [[at(31, 4), 69.9]]
