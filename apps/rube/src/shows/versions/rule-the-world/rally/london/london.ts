import type { Pt } from '../../../../../parts'
import { at } from '../music'
import { box, frame, part, scenery, type PartShot } from '../kit'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawHall, drawPlay } from './draw'
import { A, B, ballAt, CATCH, DEAD, DIES, FLOOR_HITS, OFF_END, EXIT, FEED, FEED_BOUNCE, IN_PAN_B2, LONDON_STRIKES, LUNGE, OUT, REST, SEGS, SMASHES, STROKES, T0, T1, WINNER } from './geo'

/**
 * London: the British Open, 1952 (bar 25 → bar 43). A big cold hall under an iron and glass roof, two green tables
 * under their conical lamps, the low barrier, the umpires on their high chairs, the gallery, and in its front row Kay
 * Stone. Marty beats the champion Kletzki in the semifinal on table A, the kick of his last smash carrying him over the
 * gap into his own pan on table B; in the final he wins a point off Endo to level the games, and loses the last to
 * Endo's dead sponge shot, and rolls off the end onto the floorboards, where the hotel takes him.
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

const hold = (t: number, cells: number, h: Pt, cut = false): PartShot => ({ t, cells, hold: h, w: 1, ...(cut ? { cut } : {}) })

/**
 * One angle on a rally, the way a match is shot for the newsreel: from `from` to `to` (two strokes; `cut` if it opens
 * on a cut), the camera leans with every stroke toward where the ball is (`sway` cells of it, a key a stroke, so it
 * swings with the play and never lags it) while it creeps in from `c0` cells to `c1`, round `base`. It settles square
 * on its last stroke, so the cut after it finds both ends of the table in the frame.
 */
function angle(from: number, to: number, base: Pt, c0: number, c1: number, sway: number, cut: boolean): PartShot[] {
  const keys: PartShot[] = []
  const ts = STROKES.map((s) => s.t).filter((t) => t >= from - 1e-6 && t <= to + 1e-6)
  ts.forEach((t, i) => {
    const u = ts.length > 1 ? i / (ts.length - 1) : 0
    const cells = c0 * Math.pow(c1 / c0, u)
    const b = ballAt(t)
    const lean = i === ts.length - 1 && ts.length > 1 ? 0 : Math.max(-1, Math.min(1, (b[0] - base[0]) / 3))
    keys.push(hold(t, cells, [base[0] + sway * lean, base[1] + 0.12 * sway * Math.max(-1, Math.min(1, (b[1] + 0.3) / 1.2))], cut && i === 0))
  })
  return keys
}

const beat = (bar: number, pos: number) => at(bar, pos)

/** The semifinal's winner: Marty's last stroke on table A. */
const SEMI_WIN = Math.max(...STROKES.filter((s) => s.who === 'marty' && s.table === A).map((s) => s.t))
/** The final's last bar, from its second stroke: cut close on every stroke, and the dead shot. */
const CLOSE_FROM = beat(40, 2)

/**
 * The end of the final, in close: Marty's bat and Endo, a cut on each stroke, each a little closer; Endo's dead shot
 * in close on his sponge; then low on Marty's end as it dies short and his bat swings over it, and down with it off
 * the end to the floorboards.
 */
function closing(): PartShot[] {
  const MARTY: Pt = [B.x0 + 0.25, -0.35]
  const ENDO: Pt = [B.x1 + 0.85, -1.3]
  const keys = STROKES.filter((s) => s.table === B && s.t >= CLOSE_FROM - 1e-6 && s.t < DEAD - 1e-6).map((s, k) =>
    hold(s.t, (s.who === 'marty' ? 3.8 : 4.3) - 0.12 * k, s.who === 'marty' ? MARTY : ENDO, true),
  )
  return [
    ...keys,
    hold(DEAD, 3.8, [ENDO[0] - 0.1, ENDO[1] + 0.05], true),
    hold(DIES, 3.0, [B.x0 + 1.15, -0.12], true),
    hold(OFF_END, 3.1, [B.x0 + 0.5, 0.1]),
    hold(FLOOR_HITS[1], 3.3, [B.x0 - 1.05, 0.55]),
  ]
}

/**
 * The camera, cut like a match: the seam's close hold on him on the corner as the lamp comes on, out to the
 * semifinal; then an angle every bar or two, cut on Marty's strokes: the table square on, in tight on Kletzki's end,
 * low on Marty's sprung bat, wide on the gallery whose heads follow the ball, and tight again as it comes to the
 * smash. On Kletzki's miss a cut to the whole hall, roof and all, and down onto the final: square on, then Endo's end
 * and Kay; out after Marty's winner as it goes by Endo and off the floor, and back with the ball as Endo pats it to
 * the pan. The last point opens wide as Endo backs off the table to lob, and cuts in tight as he comes running back
 * for the dead shot; after it, down and along with him to the floorboards, to the seam's framing.
 */
function shots(): PartShot[] {
  const seam = SEAMS.hotel
  const end: Pt = [REST[0] + seam.frame[0], REST[1] + seam.frame[1]]
  return [
    hold(T0 + 0.5, 3.4, [-0.1, -0.5]),
    hold(at(25, 3), 3.6, [-0.3, -0.48]),
    // The semifinal: square on, creeping in.
    ...angle(beat(26, 2), beat(26, 4), [2.1, -0.5], 5.9, 5.75, 0.22, false),
    // Kletzki's end, in close: his attack.
    ...angle(beat(27, 1), beat(27, 4), [2.45, -0.65], 6.6, 6.4, 0.2, true),
    // Low on Marty's bat: the blocks, and the drives coming back.
    ...angle(beat(28, 1), beat(28, 4), [1.95, -0.2], 6.35, 6.15, 0.2, true),
    // Wide on the house, every head going with the ball.
    ...angle(beat(29, 1), beat(29, 4), [2.2, -1.55], 8.6, 8.3, 0.3, true),
    // In tight for the end of it: square on, low.
    ...angle(beat(30, 1), SEMI_WIN - 0.01, [2.15, -0.38], 6.0, 6.1, 0.2, true),
    // The winning smash, in close on his bat as it fires.
    hold(SEMI_WIN, 3.3, [A.x0 - 0.05, -0.38], true),
    // Kletzki's miss: the hall.
    hold(at(31, 4), 11, [7.2, -1.95], true),
    hold(68.0, 10.2, [7.7, -1.6]),
    // The final's first point: square on, then Endo's end and Kay.
    ...angle(beat(33, 2), beat(33, 4), [11.4, -0.5], 6.05, 6.0, 0.22, false),
    ...angle(beat(34, 1), WINNER, [12.0, -0.72], 7.1, 6.9, 0.2, true),
    // Out with the winner as it goes by Endo, and round with him after it.
    hold(LUNGE, 6.9, [13.6, -0.55]),
    hold(OUT[1], 6.6, [15.0, -0.35]),
    hold(CATCH, 6.6, [15.3, -0.35]),
    hold(FEED, 6.6, [14.6, -0.4]),
    // Back with it over the net to the pan.
    hold(FEED_BOUNCE, 6.4, [11.6, -0.45]),
    hold(IN_PAN_B2, 6.3, [10.9, -0.5]),
    // The last point: square on; then wide as Endo backs off to lob; in tight as he runs back in.
    ...angle(beat(37, 1), beat(37, 4), [11.4, -0.5], 6.3, 6.6, 0.22, false),
    ...angle(beat(38, 1), beat(39, 4), [12.55, -1.0], 8.4, 8.0, 0.32, true),
    ...closing(),
    hold(T1 - 0.17, seam.cells, end),
    hold(T1, seam.cells, end),
  ]
}

export const LONDON_HITS: readonly number[] = LONDON_STRIKES

/** The cut to the hall on Kletzki's miss, roof and all, until the final's first rally is under way. */
export const LONDON_WIDE: [number, number][] = [
  [SEMI_WIN, 69.9],
  [CLOSE_FROM, DIES],
]

/**
 * The camera's punches in on this place's big moments (`score.ts`): show time and strength. Every smash: Kletzki's
 * a little, Marty's more, and most the one that wins the semifinal and the one that wins him his point in the final.
 */
export const LONDON_PUNCHES: [number, number][] = SMASHES.map((s): [number, number] =>
  s.who !== 'marty' ? [s.t, 0.35] : s.table.x0 < 0 || Math.abs(s.t - WINNER) < 1e-6 ? [s.t, 1.1] : [s.t, 0.5],
)
