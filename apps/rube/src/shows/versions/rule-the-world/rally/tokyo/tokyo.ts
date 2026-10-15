import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { WIN } from '../music'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawDropped, drawStreamers } from './confetti'
import { drawArena, drawEndo, drawEndoOver, drawLamp, drawSprungBat, drawTable } from './draw'
import { BACK2, END, IN_PAN, LEAVE, P0, PICK, POWER, RALLY, SET, STROKES, LUNGE, BOARDS, STOMPS, T0, T1, TOKYO_STRIKES, WAY } from './geo'
import { drawLampAir } from './light'
import { drawFrontRow } from './near'

/**
 * Tokyo (176.689 → 202.391, bars 83 to 94): the exhibition he is meant to lose, and the real match he forces.
 *
 * He comes in at rest on the near corner of the one table, under the lamp, the crowd dark round it, on the broken-off
 * "Everybody wants to rule the -"; a flash bulb, the umpire's bell, Endo bows. Marty refuses: he stomps on the table, and each stomp
 * brings a section of the house lights up, while his sprung bat cocks; he hops back into its pan. Then "Say that you'll never, never…": the real match, a bat on every beat,
 * Endo's thick sponge bat against Marty's sprung one: Endo driven off the table, lobbing from deep, digging a smash
 * off the floor, countering, and the flat drives coming in hard; every head in the house following the ball, the GIs
 * on their feet, the front rows rising through the last bar. On "Everybody" (WIN)
 * his bat fires with everything and the ball goes past Endo into the boards; the arena erupts (the whole house on its
 * feet, arms and flags up, the press firing, the GIs' caps in the air, streamers, confetti from the stands and the
 * roof). In the quiet, Endo turns, picks
 * him up off the floor, carries him back and sets him on the end line of the table, steps back and bows; the lights go
 * down section by section to the one lamp, the paper still coming down through it, and Endo walks off into the dark.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const TOKYO_AT: Pt = [0, 0]
export const TOKYO_CELLS = box(-26, -16, 32, 8, 2)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number): Pen => ({ p, k, ink, w, tone: (h) => h })

/**
 * The arena: the roof and its truss, both tiers of the stands and everyone in them, the lanterns, banners and bunting,
 * the floor, the press, the judges, the boards and the spotlights' still pair; and over everything, in the lens, the
 * front row.
 */
export const tokyoSet = scenery<null>({
  name: 'tokyo-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    p.push()
    drawArena(pen, c.t, frame(p, c.k))
    p.pop()
  },
  over: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    const f = frame(p, c.k)
    p.push()
    drawFrontRow(pen, c.t, f)
    p.pop()
  },
})

interface MatchState {
  begin: number
}

/** The match: the lamp and the air in its cone, the table, his sprung bat, Endo, the streamers, the paper falling. */
export const rematch = part<MatchState>(
  {
    name: 'rematch',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const pen = penOf(p, c.k, c.ink, c.weight)
      p.push()
      drawLamp(pen)
      drawLampAir(pen, t)
      drawStreamers(pen, t)
      drawTable(pen)
      drawSprungBat(pen, t)
      drawEndo(pen, t)
      drawDropped(pen, t, frame(p, c.k))
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
/**
 * The match as broadcast: a key on every stroke, framed on the flight it sends off (the ball from just before the bat
 * to the next bat), the camera going with the ball where Endo is driven deep or it goes up, as close as keeps the
 * ball in the Zoom frame and no wider than it must be. Cuts where the rally turns (`RALLY_CUTS`); the last bar is `closing`'s.
 */
const RALLY_CUTS = [0, 4, 7, 10, 12]
/** The closest each stretch of the rally may be: bar 85, the lob from deep, the dig, the counter. */
const RALLY_CELLS = (i: number): number => (i < 4 ? 5.3 : i < 7 ? 5.6 : i < 10 ? 5.2 : 5.5)
function rally(): PartShot[] {
  const out: PartShot[] = []
  const TABLE: Pt = [1.85, -0.6]
  for (let i = 0; i < RALLY.length; i++) {
    const a = RALLY[i] - 0.25
    const b = i + 1 < RALLY.length ? RALLY[i + 1] : WIN
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    for (let t = a; t <= b; t += 0.01) {
      const [x, y] = WAY.at(t)
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    // Mostly the flight, a little the table: it goes with the ball where Endo is driven deep or it goes up.
    const c: Pt = [0.15 * TABLE[0] + 0.85 * ((x0 + x1) / 2), 0.15 * TABLE[1] + 0.85 * ((y0 + y1) / 2)]
    // Under Zoom (half as close again) the ball must stay in: 16:9, so a cell of height is 16/9 of width.
    const need = 1.06 * Math.max((Math.max(c[0] - x0, x1 - c[0]) * 1.5) / (16 / 9 / 2), (Math.max(c[1] - y0, y1 - c[1]) * 1.5) / 0.5)
    out.push({ t: RALLY[i], cells: Math.max(RALLY_CELLS(i), need), hold: c, w: 1, ...(RALLY_CUTS.includes(i) ? { cut: true } : {}) })
  }
  return out
}

/** From the last bar (`CLOSE_FROM`): in close, cut on every stroke, his bat and then Endo, each closer than the last. */
const CLOSE_FROM = 12
const MARTY_CLOSE: Pt = [-0.35, -0.55]
const ENDO_CLOSE: Pt = [5.55, -0.85]
function closing(): PartShot[] {
  const out: PartShot[] = []
  for (let i = CLOSE_FROM; i < RALLY.length; i++) {
    const marty = STROKES.find((s) => s.i === i)?.who === 'marty'
    const k = i - CLOSE_FROM
    out.push({ t: RALLY[i], cells: (marty ? 3.7 : 4.1) - 0.15 * k, hold: marty ? MARTY_CLOSE : ENDO_CLOSE, w: 1, cut: true })
  }
  // The winner: on his bat as it fires, on Endo as it goes past him, and on the boards, the whole house.
  out.push({ t: WIN, cells: 3.2, hold: [MARTY_CLOSE[0] + 0.15, MARTY_CLOSE[1]], w: 1, cut: true })
  out.push({ t: LUNGE, cells: 3.6, hold: [ENDO_CLOSE[0] - 0.1, ENDO_CLOSE[1] + 0.1], w: 1, cut: true })
  out.push({ t: BOARDS, cells: 9.3, hold: [3.0, -1.95], w: 1, cut: true })
  return out
}

function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt, cut = false): PartShot => ({ t, cells, hold: at, w: 1, ...(cut ? { cut } : {}) })
  const seamIn = SEAMS.tokyo
  const seamOut = SEAMS.hospital
  return [
    hold(T0 + 0.42, seamIn.cells, [P0[0] + seamIn.frame[0], P0[1] + seamIn.frame[1]]),
    hold(STOMPS[0] - 0.2, 5.4, [1.8, -0.9]),
    hold(STOMPS[2], 3.9, [-0.75, -0.4], true),
    hold(IN_PAN + 0.3, 3.75, [-0.8, -0.42]),
    ...rally().filter((k) => k.t < RALLY[CLOSE_FROM] - 1e-6),
    ...closing(),
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

/** The last bar in close (the ball leaves the frame between the two ends), and the arena erupting, wide, from the smash. */
export const TOKYO_WIDE: [number, number][] = [[RALLY[CLOSE_FROM], WIN + 3.95]]

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
