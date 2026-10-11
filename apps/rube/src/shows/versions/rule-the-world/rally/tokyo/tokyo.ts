import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { WIN } from '../music'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawArena, drawEndo, drawEndoOver, drawImpacts, drawLamp, drawSprungBat, drawStreamers, drawTable } from './draw'
import { BACK2, END, IN_PAN, LEAVE, P0, PICK, POWER, RALLY, SET, STOMPS, T0, T1, TOKYO_STRIKES, WAY } from './geo'

/**
 * Tokyo (176.689 → 202.391, bars 83 to 94): the exhibition he is meant to lose, and the real match he forces.
 *
 * He comes in at rest on the near corner of the one table, under the lamp, the crowd dark round it, on the broken-off
 * "Everybody wants to rule the -"; a flash bulb, the umpire's bell, Endo bows. Marty refuses: he stomps on the table, and each stomp
 * brings a section of the house lights up, while his sprung bat cocks; he hops back into its pan. Then "Say that you'll never, never…": the real match, a bat on every beat,
 * Endo's thick sponge bat against Marty's sprung one: Endo driven off the table, lobbing from deep, digging a smash
 * off the floor, countering, and the flat drives coming in hard; every head in the house following the ball, the GIs
 * on their feet, the front rows rising through the last bar. On "Everybody" (WIN)
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
      drawImpacts(pen, t)
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
 * refusal; a cut in close on the cocked machine as he hops into its pan; and then the match as it is shot for the
 * house, cut on the strokes: side on at the table for the opening drives, wide and high when Endo is driven back and
 * the whole arena follows his lob, down low under the smash, wide again for his counter, and in on the table through
 * the last bar as the drives come in hard. The score's punch on the winner, wide on the arena erupting; in on Endo
 * picking him up and carrying him; and closing on him at the end line as the lights go down.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt, cut = false): PartShot => ({ t, cells, hold: at, w: 1, ...(cut ? { cut } : {}) })
  const seamIn = SEAMS.tokyo
  const seamOut = SEAMS.hospital
  const r = (i: number) => RALLY[i]
  return [
    hold(T0 + 0.42, seamIn.cells, [P0[0] + seamIn.frame[0], P0[1] + seamIn.frame[1]]),
    hold(STOMPS[0] - 0.2, 5.4, [1.8, -0.9]),
    hold(STOMPS[2], 3.9, [-0.75, -0.4], true),
    hold(IN_PAN + 0.3, 3.75, [-0.8, -0.42]),
    hold(r(0), 6.3, [2.3, -0.75], true),
    hold(r(1), 6.3, [2.42, -0.76]),
    hold(r(2), 6.35, [2.3, -0.76]),
    hold(r(3), 6.45, [2.5, -0.78]),
    hold(r(4), 8.6, [3.1, -1.7], true),
    hold(r(6), 8.4, [3.3, -1.6]),
    hold(r(7), 7.4, [2.9, -0.45], true),
    hold(r(9), 7.4, [2.95, -0.55]),
    hold(r(10), 8.0, [3.15, -1.3], true),
    hold(r(11), 7.9, [3.05, -1.2]),
    hold(r(12), 7.0, [2.8, -0.8], true),
    hold(WIN - 0.3, 6.1, [2.0, -0.72]),
    hold(WIN + 0.08, 6.0, [2.0, -0.72]),
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

/** The camera's punches in on this place's big moments (`score.ts`): show time and strength. */
export const TOKYO_PUNCHES: [number, number][] = [
  // His three stomps on the table, each a section of the house lights.
  [STOMPS[0], 0.3],
  [STOMPS[1], 0.3],
  [STOMPS[2], 0.35],
  // His two smashes, Endo's counter from deep, and the last drive before the winner.
  [POWER[0], 0.5],
  [POWER[1], 0.6],
  [RALLY[11], 0.3],
  [RALLY[14], 0.35],
]
