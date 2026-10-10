import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { WIN } from '../music'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawArena, drawEndo, drawEndoOver, drawLamp, drawSprungBat, drawStreamers, drawTable } from './draw'
import { BACK2, END, LEAVE, P0, PICK, SERVE, SET, STOMPS, T0, T1, TOKYO_STRIKES, WAY } from './geo'

/**
 * Tokyo (176.689 → 202.391, bars 83 to 94): the exhibition he is meant to lose, and the real match he forces.
 *
 * He comes in at rest on the near corner of the one table, under the lamp, the crowd dark round it, on the broken-off
 * "Everybody wants to rule the -"; flash bulbs go in the stands, the umpire's bell, Endo bows. Marty refuses: he stomps
 * on the table, and each stomp brings a section of the house lights up, while his sprung bat cocks; he hops back into
 * its pan. Then "Say that you'll never, never…": the real match, a bat on every beat and a bounce on every shuffle,
 * Endo's thick sponge bat against Marty's sprung one, the crowd surging, the GIs on their feet. On "Everybody" (WIN)
 * his bat fires with everything and the ball goes past Endo into the boards; the arena erupts (caps, streamers, flash
 * bulbs on the beats). In the quiet, Endo turns, picks him up off the floor, carries him back and sets him on the end
 * line of the table, steps back and bows; the lights go down section by section to the one lamp, and Endo walks off
 * into the dark.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const TOKYO_AT: Pt = [0, 0]
export const TOKYO_CELLS = box(-26, -16, 32, 8, 2)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number): Pen => ({ p, k, ink, w, tone: (h) => h })

/** The arena: the roof, the stands and everyone in them, the lanterns and bunting, the floor, the judges, the boards. */
export const tokyoSet = scenery<null>({
  name: 'tokyo-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    p.push()
    drawArena(pen, c.t, frame(p, c.k))
    p.pop()
  },
})

interface MatchState {
  begin: number
}

/** The match: the lamp, the table, his sprung bat, Endo, the streamers. */
export const rematch = part<MatchState>(
  {
    name: 'rematch',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const pen = penOf(p, c.k, c.ink, c.weight)
      p.push()
      drawLamp(pen, t)
      drawStreamers(pen, t)
      drawTable(pen, t)
      drawSprungBat(pen, t)
      drawEndo(pen, t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      drawEndoOver(penOf(p, c.k, c.ink, c.weight), t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-12, -12, 18, 6, 1),
    exit: [END[0] + 0.5, END[1]] as Pt,
    lane: { segs: WAY.segs, fire: WIN - slot.begin },
    state: { begin: slot.begin },
  }),
  () => shots(),
)

/**
 * The camera: from the seam's close hold on him at the corner, back to the table and Endo for the bow and the
 * refusal; the whole table through the match, edging in; the score's punch on the smash, then wide on the arena
 * erupting; in on Endo picking him up and carrying him; and closing on him at the end line as the lights go down.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const seamIn = SEAMS.tokyo
  const seamOut = SEAMS.hospital
  return [
    hold(T0 + 0.42, seamIn.cells, [P0[0] + seamIn.frame[0], P0[1] + seamIn.frame[1]]),
    hold(STOMPS[0] - 0.2, 5.4, [1.8, -0.9]),
    hold(SERVE, 6.2, [2.0, -0.8]),
    hold(WIN - 0.6, 5.9, [2.0, -0.75]),
    hold(WIN + 0.08, 5.9, [2.0, -0.75]),
    hold(WIN + 1.7, 9.5, [3.0, -2.0]),
    hold(WIN + 3.05, 9.5, [3.2, -2.0]),
    hold(PICK - 0.7, 6.0, [5.6, 0.1]),
    hold(SET - 0.5, 5.0, [5.2, -0.4]),
    hold(BACK2, 4.4, [5.0, -0.6]),
    hold(LEAVE[0] + 0.2, seamOut.cells, [END[0] + seamOut.frame[0], END[1] + seamOut.frame[1]]),
    hold(T1, seamOut.cells, [END[0] + seamOut.frame[0], END[1] + seamOut.frame[1]]),
  ]
}

export const TOKYO_HITS: readonly number[] = TOKYO_STRIKES

/** The arena erupting, wide, from the smash. */
export const TOKYO_WIDE: [number, number][] = [[WIN, WIN + 3.95]]

