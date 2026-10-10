import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawBat, drawBills, drawCurtain, drawFitting, drawLadder, drawLamps, drawLights, drawOfficeDoor, drawPops, drawRoom, drawSafeDoor, drawSafeInside, drawShade } from './draw'
import { END, FIRE, INTRO_HOPS, INTRO_RUN, RACHEL_AT, rachelAt, STORE_STRIKES, T0, T1, WAY } from './geo'

/**
 * Uncle Murray's shoe store on the Lower East Side, 1952, before it opens (0 → 52.455, bars 1 to 24).
 *
 * In the dark, one bulb over the counter: Marty ticks on his own sprung bat, a toy on the counter, impatient, through
 * the intro. The bass comes in and the bat fires him, and the lamps click on down the store a beat at a time: down
 * the wall of boxes as they pop out under him, onto the library ladder, which rolls on its rail as he comes down it a
 * rung a beat and bangs into its stop; onto the shoehorn, into the stool's sprung footrest, onto the measuring
 * device, pushing its slider home; through the curtain into the stockroom, where Rachel is, and a while beside her on
 * a carton, a small bounce together on the shuffle. Then, on "Welcome to your life", Murray's office: the dial, a
 * click under every landing; the handle; the door heaved open a beat at a time; the bills in the light, and the ticket.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const STORE_AT: Pt = [0, 0]
export const STORE_CELLS = box(-8, -8, 34, 5, 1)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number): Pen => ({ p, k, ink, w, tone: (h) => h })

/** The room: the street through the window, the wall of boxes, the counter, the stockroom, the office. */
export const storeSet = scenery<null>({
  name: 'store-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    p.push()
    drawRoom(pen, c.t, frame(p, c.k))
    p.pop()
  },
})

interface StoreState {
  begin: number
}

const TAKEOFFS = [...INTRO_HOPS.map((h) => h[0]), ...INTRO_RUN, FIRE]

export const store = part<StoreState>(
  {
    name: 'store',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const pen = penOf(p, c.k, c.ink, c.weight)
      const f = frame(p, c.k)
      p.push()
      drawBat(pen, t, TAKEOFFS)
      drawPops(pen, t)
      drawLadder(pen, t)
      drawFitting(pen, t)
      drawCurtain(pen, t)
      drawOfficeDoor(pen, t)
      drawSafeInside(pen, t)
      drawSafeDoor(pen, t)
      drawLamps(pen, t)
      drawShade(pen, t, f)
      drawLights(pen, t)
      drawBills(pen, t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-8, -8, 34, 5, 1),
    exit: [END[0] + 0.5, END[1]] as Pt,
    lane: { segs: WAY.segs, fire: FIRE - slot.begin },
    state: { begin: slot.begin },
    company: [
      {
        who: 'rachel' as const,
        from: T0,
        to: T1,
        at: (t: number) => {
          const [x, y] = rachelAt(t)
          return { x, y }
        },
      },
    ],
  }),
  () => shots(),
)
void RACHEL_AT

/**
 * The camera: the first frame held on him on the counter through the intro; out and up with him on the bass; along
 * the store with the chain; close on the two of them in the stockroom; to the office, and held on the safe; in to the
 * seam's framing on the bills.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  const seam = SEAMS.london
  const last: Pt = [END[0] + seam.frame[0], END[1] + seam.frame[1]]
  return [
    hold(8.6, 3.2, [0.4, -0.55]),
    hold(FIRE, 3.8, [0.8, -0.7]),
    follow(11.0, 4.8, [0.5, 0.2]),
    follow(13.5, 4.6, [0.7, 0.3]),
    follow(16.0, 4.4, [0.8, -0.35]),
    follow(18.6, 4.2, [0.8, -0.45]),
    hold(20.9, 3.4, [17.45, 0.45]),
    hold(27.0, 3.4, [17.5, 0.45]),
    follow(28.6, 4.0, [0.8, -0.3]),
    hold(30.5, 3.8, [25.65, 0.55]),
    hold(43.9, 3.8, [25.65, 0.55]),
    hold(46.2, seam.cells, last),
    hold(T1, seam.cells, last),
  ]
}

export const STORE_HITS: readonly number[] = STORE_STRIKES

export const STORE_WIDE: [number, number][] = []
