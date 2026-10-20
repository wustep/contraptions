import type { Key } from '../camera'
import { region, standing } from '../draw'
import { M } from '../music'
import { R } from '../../../../../parts'
import { fly, rest, ride, roll, type Move, type Pt } from '../path'
import type { Scene } from '../scene'
import { END, WINDOWS } from '../voyage'
import { horizonOf } from '../world/sea'
import type { SkyKey } from '../world/sky'
import { FIRST_DUSK, LAST_DAWN, extremes } from './ogygia/days'
import { BED, drawDiscs, drawDrift, drawDunes, drawLotus, drawSand, drawStone, onSand } from './ogygia/island'
import { HIT, LAUNCH, SEAT, onRaft, raftAt } from './raft/raft'

/**
 * Ogygia (M.hush → M.return): the rise, the theme again from almost nothing.
 *
 * He lies where the sea left him on the west beach through the hush. At the rise's first attack (358.70) the first
 * dawn comes up, a lotus opens on the low rise above him, and he goes up over it to the cave's mouth, where five more
 * open round him as he comes (362.39 to 364.37). Then seven days and nights go over him (`days.ts`): the sun and the
 * moon arc across, the lotus open by day and close by night, the sand drifts against him. Twice the picture goes to
 * Ithaca, to Penelope at her loom keeping the same days (366.12 and 377.28, the third and sixth dawns), and comes back
 * (371.35, 380.96). On the cloudless eighth morning the thunder (384.66) wakes him: the lotus shiver and shut, the net
 * swings, the drift slumps off him. He rolls down into the first log of driftwood (389.39), which knocks the second
 * (389.57), the two roll into the third against the stake (392.20, 392.39), the rope winds round them, he hops aboard,
 * and on the music's return (395.511) the raft goes into the sea (`raft/raft.ts`).
 */

const [FROM, TO] = WINDOWS.ogygia

/* ------------------------------------------------------------------ the light */

type Sea = Pick<SkyKey, 'far' | 'near' | 'body' | 'deep' | 'lit' | 'edge'>
const SEA_DAY: Sea = { far: '#9FD3CC', near: '#3E9C99', body: '#2A7E84', deep: '#0B2A35', lit: '#E8F4EC', edge: '#185A60' }
const SEA_NIGHT: Sea = { far: '#34586A', near: '#1E4652', body: '#183D49', deep: '#061219', lit: '#7AA2AE', edge: '#0F2E38' }
const SEA_GREY: Sea = { far: '#5A7A80', near: '#2C5258', body: '#20444A', deep: '#071318', lit: '#A3BFC0', edge: '#14323A' }
const SEA_DAWN: Sea = { far: '#B7D3C8', near: '#4A9A94', body: '#2E7A80', deep: '#0B2A35', lit: '#F2EEDF', edge: '#1A5A60' }

const sky = (t: number, top: string, low: string, cloud: string, cover: number, sea: Sea): SkyKey => ({ t, top, low, cloud, cover, ...sea })
const DAY = (t: number) => sky(t, '#9DC6CF', '#F1EEE4', '#F3F1EA', 0.12, SEA_DAY)
const NIGHT = (t: number) => sky(t, '#1D2E48', '#3F5874', '#3A4E68', 0.1, SEA_NIGHT)

const SKY: SkyKey[] = [
  // The grey before the first dawn, after the storm (overrides the base plan's key at M.hush + 2).
  sky(M.hush + 2, '#3A4858', '#8A98A0', '#6A7682', 0.3, SEA_GREY),
  // Seven noons and seven midnights; the dawns and dusks fall halfway between.
  ...extremes().map(([t, day]) => (day ? DAY(t) : NIGHT(t))),
  // The cloudless morning of the thunder.
  sky(LAST_DAWN, '#587F98', '#C9C2B2', '#D9D6CC', 0.04, SEA_DAWN),
  sky(LAST_DAWN + 1.8, '#93C2CE', '#F3EFE4', '#F3F1EA', 0.02, SEA_DAY),
  // Still clear as the raft is built (overrides the base plan's key at M.return - 3, whose sun is drawn here instead).
  sky(M.return - 3, '#93C2CE', '#F3EFE4', '#F3F1EA', 0.02, SEA_DAY),
]

/* ------------------------------------------------------------------ the hero */

/** One rock, there and back, on the spot: a rolling ball's start. `n` half-swings, damped. */
function rock(at: Pt, t0: number, amp: number, f: number, n: number, tau: number): Move {
  const dur = n / (2 * f)
  const x = (t: number) => at[0] + amp * Math.sin(2 * Math.PI * f * (t - t0)) * Math.exp(-(t - t0) / tau)
  return ride((t) => [x(t), at[1]], t0, t0 + dur, (t) => (x(t) - at[0]) / R)
}

/** The sand under a roll from `a` to `b`, sampled: where a ball's centre goes over it. */
const sandPath = (a: number, b: number): Pt[] => {
  const pts: Pt[] = []
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / 0.08))
  for (let i = 0; i <= n; i++) pts.push(onSand(a + ((b - a) * i) / n))
  return pts
}

const LANDED: Pt = [660, -0.35]
/** The stir at the first dawn, then over the rise to the cave's mouth. */
const STIR = 358.7
const STIRRED = STIR + 1 / (2 * 1.4)
const ARRIVE = FIRST_DUSK
/** Woken: two swings, dying. */
const WAKE_F = 1.7
const WOKEN = LAST_DAWN + 2 / (2 * WAKE_F)
/** Down to the first log, his touch on it, after it. */
const SETS_OFF = 386.34
const TOUCH_X = 670.953
const AFTER_X = 671.07
const FOLLOW = 391.6
const BESIDE_X = 674.66
const HOP = 393.83
const ABOARD = 394.15

const HERO: Move[] = [
  rest(LANDED, FROM, STIR),
  rock(LANDED, STIR, 0.035, 1.4, 1, 0.25),
  roll(sandPath(LANDED[0], BED[0]), STIRRED, ARRIVE, 'inout'),
  rest(BED, ARRIVE, LAST_DAWN),
  rock(BED, LAST_DAWN, 0.04, WAKE_F, 2, 0.35),
  rest(BED, WOKEN, SETS_OFF),
  roll(sandPath(BED[0], TOUCH_X), SETS_OFF, HIT, 'in'),
  roll(sandPath(TOUCH_X, AFTER_X), HIT, HIT + 0.46, 'out'),
  rest(onSand(AFTER_X), HIT + 0.46, FOLLOW),
  roll(sandPath(AFTER_X, BESIDE_X), FOLLOW, HOP, 'inout'),
  fly(onSand(BESIDE_X), onRaft(ABOARD, SEAT), HOP, ABOARD),
  ride((t) => onRaft(t, SEAT), ABOARD, LAUNCH, (t) => raftAt(t).a),
]

/* ------------------------------------------------------------------ the camera */

/** Penelope's room in Ithaca: the loom, framed close (the cross-cuts). */
const LOOM: Pt = [820.2, -11.45]

const SHOTS: Key[] = [
  // The hush: held on him where the sea left him.
  { t: 356.0, cells: 7, at: [661.6, -1.4] },
  { t: STIR, cells: 7.3, at: [661.9, -1.5] },
  // Up over the rise with him; the cave, its stone, and the great dune behind.
  { t: 362.2, cells: 9.5, at: [665.6, -2.0] },
  { t: 365.9, cells: 11, at: [668.6, -2.9] },
  { t: 366.0, cells: 11, at: [668.6, -2.9] },
  // Ithaca: the loom keeping the same days.
  { t: 366.12, cells: 2.4, at: LOOM, cut: true },
  { t: 371.2, cells: 2.25, at: [LOOM[0] + 0.05, LOOM[1] + 0.02] },
  // Back: close on him in the lotus, the sand drifting over him, years.
  { t: 371.35, cells: 3.4, at: [669.15, -1.2], cut: true },
  { t: 377.1, cells: 3.0, at: [669.1, -1.16] },
  // Ithaca again, on the cue's loudest bars.
  { t: 377.28, cells: 2.35, at: [LOOM[0], LOOM[1] + 0.05], cut: true },
  { t: 380.85, cells: 2.2, at: LOOM },
  // The last nights going, wide; the cloudless morning; the thunder.
  { t: 380.96, cells: 9, at: [669.8, -2.3], cut: true },
  { t: 384.5, cells: 8, at: [670.0, -2.0] },
  // The machine: down to the logs, the knocks, the lashing, aboard.
  { t: 386.3, cells: 5, at: [670.4, -1.4] },
  { t: 389.4, cells: 4.6, at: [671.6, -1.25] },
  { t: 391.6, cells: 4.8, at: [673.0, -1.2] },
  { t: 392.3, cells: 4.8, at: [673.8, -1.15] },
  { t: 394.5, cells: 5.2, at: [675.0, -1.2] },
  { t: 395.4, cells: 5.4, at: [675.3, -1.2] },
]

/* ------------------------------------------------------------------ the drawings */

const ISLAND = region(630, -24, 700, 4, 2)

// The dunes stand far back, so they are seen from much further along the sea than the island's own cells: claimed wide.
const back = standing('ogygia-sky', region(560, -40, 860, 6, 4), END, (g) => {
  drawDiscs(g, horizonOf(g.view))
  drawDunes(g)
})
const stone = standing('ogygia-stone', region(664, -4, 674, 1, 1), END, (g) => drawStone(g))
const sand = standing('ogygia-sand', ISLAND, END, (g) => drawSand(g))
const lotus = standing('ogygia-lotus', region(663, -2, 673, 1, 1), END, (g) => drawLotus(g, false))
const drift = standing('ogygia-drift', region(666, -2, 672, 1, 1), END, null, (g) => drawDrift(g))
const lotusFront = standing('ogygia-lotus-front', region(666, -2, 672, 1, 1), END, null, (g) => drawLotus(g, true))

export const ogygia: Scene = {
  key: 'ogygia',
  from: FROM,
  to: TO,
  sky: SKY,
  weather: [
    [356, 0.06],
    [384, 0.06],
    [393, 0.1],
  ],
  hero: HERO,
  shots: SHOTS,
  dissolves: [
    [366.12, 1.6],
    [371.35, 1.6],
    [377.28, 1.6],
    [380.96, 1.6],
  ],
  back: [back],
  mid: [stone, sand, lotus],
  front: [drift, lotusFront],
}
