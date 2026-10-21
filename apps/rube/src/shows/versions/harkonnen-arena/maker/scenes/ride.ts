import { R } from '../../../../../parts'
import { CHANI_SIZE, FREMEN, FREMEN_ID, FREMEN_RIM, FREMEN_SIZE } from '../cast'
import type { Shot } from '../lens'
import { beat, beatsIn, M } from '../music'
import { hold, hop, Path, ride as carried, roll, type Move } from '../motion'
import { drawing, hash, smooth, type Brush, type Pt } from '../paint'
import type { Scene } from '../scene'
import type { Actor } from '../show'
import { T } from '../timeline'
import { tiltOf } from '../world/land'
import {
  mesaTop, ON_CREST, paintBack, paintDune, paintFlat, paintMesa, paintRings, paintThumper, PLANT, RIDGE, sandAt, THUMPS,
} from './ride/set'
import {
  BITE, CLIMB, CREST, headX, LEAP, OPEN, paintHooks, paintPour, paintSand, paintWorm, paulOnWorm, spineY, STAND, SURGE,
  SWALLOW, duskAt,
} from './ride/worm'

/**
 * The thumper and the first ride (104.1 to 186.0): another day, further out.
 *
 *   104.1   a cut to the mesa: the Fremen on its top; he comes down its west ridge with the thumper on his back
 *   110.5   the drive's first hard beat: he plants it, and from then it beats with the drum, a ring over the sand a beat
 *   113.1   he goes up the dune west of it, and waits on the crest with the hooks
 *   118.2   far off to the west, worm sign: the desert swelling toward the thumper
 *   125.8   close on him; the swell comes on; the worm's back rises behind the dune
 *   133.5   the run's first hard beats, three in a row: he leaps onto its flank (133.5), the hooks bite (134.1),
 *           the thumper is gone into the head (134.7)
 *   136.5   the seam opens and the worm rolls its open side up, carrying him with it
 *   143.1   the run's hardest beat: the surge, the worm heaving up and on, faster
 *   145.5   he climbs, a pull a beat, up to its back
 *   151.4   wide: the worm racing east, the desert going by
 *   158.0   he stands: the iconic image, him upright on its back against the sky, the hooks in his hands
 *   160.4   the Fremen on the mesa, hopping with the drum; Chani still, looking after him
 *   164.6   the long last shot: he rides on toward the low sun as the music falls away; the moon comes over it, the
 *           colour drains to infrared and then to black and white; in the silence the black sun over the dark desert;
 *           held still for the dissolve to Giedi Prime (its black sun in the same place in the frame)
 */

const FROM = T.thumper
const TO = T.arena

/** The drive's and the run's beats, by number. */
const drive = (n: number) => beat('drive', n)
const run = (n: number) => beat('run', n)

/* ------------------------------------------------------------------ Paul */

/** Down the ridge, to the thumper's place, planting it, then up the dune's back to the crest. */
const DOWN = 107.0
const AT_THUMPER: Pt = [1056.4, -R]
const LEFT_THUMPER = drive(11)
const ON_TOP = drive(19)

const paul: Move[] = [
  roll(RIDGE, FROM, DOWN, 'in'),
  roll([RIDGE[RIDGE.length - 1], AT_THUMPER], DOWN, PLANT - 1.4, 'out'),
  hold(AT_THUMPER, PLANT - 1.4, LEFT_THUMPER, Math.PI * 0.05),
  // Up the dune's back; the crest is the dune's own line, a ball's radius over it.
  {
    t0: LEFT_THUMPER,
    t1: ON_TOP,
    kind: 'roll',
    at: (t) => {
      const u = smooth(t, LEFT_THUMPER, ON_TOP)
      const x = AT_THUMPER[0] + (ON_CREST[0] - AT_THUMPER[0]) * u
      return [x, duneSurface(x) - R]
    },
  },
  // On the crest, the hooks beside him, looking west for it.
  hold(ON_CREST, ON_TOP, LEAP, Math.PI),
  // The leap, onto its flank as it goes by.
  hop(ON_CREST, paulOnWorm(BITE), LEAP, BITE),
  // On the worm: carried, his face turned round to where it is going as he stands.
  carried(paulOnWorm, BITE, TO, (t) => -Math.PI * smooth(t, STAND + 0.1, STAND + 1.6)),
]

/** The dune before it slumps (he is off it by then). */
function duneSurface(x: number): number {
  const h = -CREST[1]
  const d = x - CREST[0]
  if (d >= 0) {
    if (d >= 13.2) return 0
    const u = 1 - d / 13.2
    return -h * u * u * (1.55 - 0.55 * u)
  }
  return 0
}

/* ------------------------------------------------------------------ the mesa's top */

/** Chani: at the west end of the top, nearest the dune, still; she turns to follow him as he goes east. */
const CHANI_X = 1073.2
const chaniAt: Pt = [CHANI_X, mesaTop(CHANI_X) - R * CHANI_SIZE]
const chani: Move[] = [
  hold(chaniAt, FROM, 136.2, Math.PI * 0.95),
  hold(chaniAt, 136.2, TO, Math.PI * 0.02),
]

/** The Fremen along the top, each with his own facing; they hop on the drum's beats as he climbs to its back. */
const FREMEN_XS = [1074.6, 1075.7, 1077.0, 1080.2, 1081.3, 1082.6, 1083.6, 1087.4, 1088.7, 1091.9]
/** When we cut to Chani and the Fremen, as he climbs: the run's beat after the climb's fifth pull. */
const CHANI_AT = beat('run', 34)
const CHEER = beatsIn('run', CHANI_AT - 0.05, beat('run', 38) + 0.05).map((b) => b.t)
const fremen: Actor[] = FREMEN_XS.map((x, i) => {
  const at: Pt = [x, mesaTop(x) - R * FREMEN_SIZE]
  const moves: Move[] = []
  let t = FROM
  const looks = Math.PI * (0.88 + 0.1 * hash(i, 31))
  // Each hops on most of the beats, some on all: a crowd, not a drill.
  const mine = CHEER.filter((_, k) => k === 0 || k === CHEER.length - 1 || hash(i, k, 7) > 0.32)
  moves.push(hold(at, t, 136.2 + hash(i, 2) * 1.5, looks))
  t = moves[0].t1
  for (const c of mine) {
    if (c - t > 1e-3) moves.push(hold(at, t, c, Math.PI * (0.05 * hash(i, 3))))
    const up = 0.32 + 0.08 * hash(i, c)
    moves.push(hop(at, at, c, c + up))
    t = c + up
  }
  moves.push(hold(at, t, TO, Math.PI * (0.05 * hash(i, 3))))
  return {
    id: FREMEN_ID + i,
    color: FREMEN,
    rim: FREMEN_RIM,
    size: FREMEN_SIZE,
    turn: hash(i, 9) * 2,
    path: new Path(moves, `fremen ${i}`, FREMEN_SIZE),
    on: (tt: number) => tt >= FROM && tt < TO,
  }
})

/* ------------------------------------------------------------------ the camera */

const paulAt = (t: number): Pt => {
  if (t >= BITE) return paulOnWorm(t)
  return [CREST[0], CREST[1] - R]
}
/** The swell's crest, running under the sand before it breaks out. */
const swellAt = (t: number): Pt => [headX(t) - 2.5, -1.2]
/** The worm's middle, where the back is highest: what the wide shots of the ride keep. */
const wormMid = (t: number): Pt => [headX(t) - 12, spineY(12, t) - 1]

/** Paul's whole way through the scene, for the camera to track before he is on the worm. */
const PAUL = new Path(paul, 'paul-ride')
const paulWay = (t: number): Pt => PAUL.where(t)

/**
 * In the second close shot of the roll the camera lags him a little, so the worm's rings and the hooks slide slowly
 * forward through the frame with him, the rock going back past them.
 */
const ROLL2 = run(21)
const lagging = (t: number): Pt => {
  const [x, y] = paulAt(t)
  return [x - 0.5 * (t - ROLL2), y]
}

/** How far ahead in time a tracking shot looks (`steady` in lens.ts). */
const LEAD = 0.15
const LAST_HOLD: Pt = [1404, -44]

/** When the draw back has the whole worm in the frame, and when it comes to rest for the silence. */
const WHOLE = 172.6
const REST = 184.3
/** The frame's height through the draw back: close on him, to the whole worm, and on out to the last hold. */
const DRAW: [number, number][] = [[2.9, 0], [30, 0.2], [112, 0]]
/**
 * The draw back's size, cells, at `t`: in even steps of ratio, two eased stretches (Hermite in the log of the size): from
 * the stand to the whole worm over eight seconds, never opening faster than about 0.4 in log size a second, and on, more
 * slowly, to the silence's hold.
 */
function drawCells(t: number): number {
  const seg = (t0: number, t1: number, a: [number, number], b: [number, number], tt: number): number => {
    const T = t1 - t0
    const u = Math.max(0, Math.min(1, (tt - t0) / T))
    const p0 = Math.log(a[0])
    const p1 = Math.log(b[0])
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
    const h10 = u ** 3 - 2 * u ** 2 + u
    const h01 = -2 * u ** 3 + 3 * u ** 2
    const h11 = u ** 3 - u ** 2
    return Math.exp(h00 * p0 + h10 * T * a[1] + h01 * p1 + h11 * T * b[1])
  }
  if (t <= WHOLE) return seg(M.fall, WHOLE, DRAW[0], DRAW[1], t)
  return seg(WHOLE, REST, DRAW[1], DRAW[2], t)
}
/** Where he sits in the frame through the draw back: left of the middle on the stand, a third in from the east edge
 * once the whole worm is in. */
const sxAt = (t: number) => 0.42 + (0.745 - 0.42) * smooth(t, M.fall, WHOLE)
const syAt = (t: number) => 0.63 + (0.55 - 0.63) * smooth(t, M.fall, WHOLE)
/**
 * What the stand's long take keeps in the middle of the frame: the point that puts him where `sxAt`, `syAt` say in a
 * frame `drawCells` high. The camera holds what it tracks a little ahead in time (`steady` in lens.ts), so this runs
 * that much behind, and he sits where it puts him.
 */
const drawBack = (t: number): Pt => {
  const [px, py] = paulAt(t - LEAD)
  const c = drawCells(Math.max(M.fall, t))
  return [px + (0.5 - sxAt(t)) * c * (16 / 9), py + (0.5 - syAt(t)) * c]
}
/** Where the last hold comes to rest, still for the silence and the dissolve. */
const holdAt = (t: number): Pt => {
  const u = smooth(t, 177.5, REST)
  return [1388 + (LAST_HOLD[0] - 1388) * u, -40 + (LAST_HOLD[1] + 40) * u]
}
/** The draw back as keys every quarter second: its size, what it tracks, and from the whole worm on, letting go to the hold. */
const DRAW_SHOTS: Shot[] = (() => {
  const out: Shot[] = []
  for (let t = M.fall; t < REST - 1e-6; t += 0.25) {
    out.push({ t, cells: drawCells(t), track: drawBack, at: holdAt(t), w: smooth(t, WHOLE, REST), focus: paulAt })
  }
  return out
})()



const shots: Shot[] = [
  // The mesa: down its west ridge with the thumper on his back, the Fremen on its top; pushing in to him as he leaves it
  // and walks out alone onto the sand.
  { t: FROM, cut: true, cells: 15, track: paulWay, off: [3.4, -2.1] },
  { t: DOWN, cells: 10, track: paulWay, off: [2.0, -1.8] },
  { t: PLANT - 0.01, cells: 6.2, track: paulWay, off: [0.9, -1.2] },
  // The thumper, close, as he drives it in and it starts.
  { t: PLANT, cut: true, cells: 3.4, at: [1056.9, -0.95] },
  { t: drive(13) - 0.01, cells: 3.2, at: [1056.95, -0.92] },
  // Up the dune to the crest, going with him; the thumper beating behind him.
  { t: drive(13), cut: true, cells: 8.5, track: paulWay, off: [2.4, -1.6] },
  { t: ON_TOP, cells: 7.4, track: paulWay, off: [1.6, -1.2] },
  { t: drive(21) - 0.01, cells: 7.2, track: paulWay, off: [1.5, -1.1] },
  // Worm sign: low over the flat, nearly still, drifting a little east, so the swell is seen to run: in at the west edge
  // and across the frame toward the dune and him (a camera going along with it made it one more dune).
  { t: drive(21), cut: true, cells: 15, at: [971, -4.8], focus: swellAt },
  { t: 125.846 - 0.01, cells: 15.5, at: [990, -5.0], focus: swellAt },
  // Close on him on the crest; it comes; the frame opens as its back rises behind the dune, and he goes.
  { t: 125.846, cut: true, cells: 5.2, at: [1041.4, -6.9] },
  { t: 129.0, cells: 6, at: [1040.6, -6.7] },
  { t: LEAP - 0.3, cells: 17, at: [1039.5, -6.2] },
  { t: OPEN - 0.01, cells: 19, at: [1050.5, -6.0] },
  // The roll: on its flank going by under the mesa, the Fremen on its edge over him; pushing in as the worm rolls him up.
  { t: OPEN, cut: true, cells: 13, track: paulAt, off: [-1.2, -3.4] },
  { t: ROLL2 - 0.01, cells: 9.5, track: paulAt, off: [-0.7, -2.3] },
  // Close on the open seam and the hooks, the rings sliding through the frame with him.
  { t: ROLL2, cut: true, cells: 5.4, track: lagging, off: [1.4, -0.45] },
  { t: SURGE - 0.01, cells: 5.0, track: lagging, off: [1.4, -0.4] },
  // The surge: the whole worm heaving out of the sand.
  { t: SURGE, cut: true, cells: 25, track: wormMid, off: [3, -1.5], focus: paulAt },
  { t: CLIMB[0] - 0.01, cells: 24, track: wormMid, off: [2, -1.5], focus: paulAt },
  // The climb, close, rising with him and pushing in.
  { t: CLIMB[0], cut: true, cells: 5.6, track: paulAt, off: [-0.9, 0.45] },
  { t: CHANI_AT - 0.01, cells: 4.6, track: paulAt, off: [-0.7, -0.15] },
  // On the mesa, far behind: Chani close and still, looking after him; the Fremen beside her hopping with the drum.
  { t: CHANI_AT, cut: true, cells: 4.6, at: [1075.0, -14.45] },
  { t: run(39) - 0.01, cells: 4.3, at: [1074.9, -14.4] },
  // Wide and still: the worm comes into the frame from the west and races across it.
  { t: run(39), cut: true, cells: 30, at: [1193, -10.5], focus: paulAt },
  { t: STAND - 0.01, cells: 29, at: [1195, -10.3], focus: paulAt },
  // He stands: low and close, the worm's back a long curve across the foot of the frame like a horizon, and on the
  // beat he springs up onto its crown, upright against the sky a little left of the middle, the staves held forward;
  // held, pushing in a little. Then, as the music falls away, the camera draws back from him to the whole worm and on,
  // and he goes small on it, riding toward the sun as the moon comes over it; still for the silence and the dissolve.
  { t: STAND, cut: true, cells: 3.1, track: drawBack, w: 0, focus: paulAt },
  { t: M.fall - 0.25, cells: 2.92, track: drawBack, w: 0, focus: paulAt },
  ...DRAW_SHOTS,
  { t: REST, cells: 112, at: LAST_HOLD },
  { t: TO - 0.001, cells: 112, at: LAST_HOLD },
]

/** Where the horizon stands in each shot: low for the stand, so he is against the sky. */
const tilt = tiltOf([
  [FROM, 0.2], [PLANT - 0.01, 0.2], [PLANT, 0.36], [drive(13) - 0.01, 0.36], [drive(13), 0.16], [drive(21) - 0.01, 0.16],
  [drive(21), 0.34], [drive(27), 0.34], [125.84, 0.2], [125.846, 0.2], [LEAP, 0.18], [OPEN - 0.01, 0.18], [OPEN, 0.3],
  [SURGE - 0.01, 0.3], [SURGE, 0.14], [CLIMB[0] - 0.01, 0.14], [CLIMB[0], 0.24], [CHANI_AT - 0.01, 0.24], [CHANI_AT, 0.25],
  [run(39) - 0.01, 0.25], [run(39), 0.14], [STAND - 0.01, 0.14], [STAND, 0.14], [M.fall, 0.14], [WHOLE, 0.24], [177.5, 0.27], [TO, 0.27],
])

/* ------------------------------------------------------------------ the drawings */

/** A tilt that jumps only on a cut: the keys above change within a hundredth of a second, at the cuts. */
const tiltAt = (t: number) => tilt(t)

function paintRide(b: Brush): void {
  const t = b.t
  if (t < FROM || t >= TO) return
  paintBack(b, tiltAt(t))
  paintMesa(b)
  paintFlat(b)
  paintRings(b)
  const sand = sandAt(t)
  paintSand(b, t, sand)
  paintThumper(b, t < PLANT ? paulCarry(t) : null)
  paintWorm(b, t, duskAt(t))
}

/** Where the thumper is while he carries it: on his back. */
function paulCarry(t: number): Pt {
  const p = paulPath(t)
  return [p[0] - 0.05, p[1] + 0.02]
}

let paulPathCache: Path | null = null
function paulPath(t: number): Pt {
  paulPathCache ??= new Path(paul.slice(0, 3), 'paul-carry')
  return paulPathCache.where(Math.min(t, paulPathCache.t1))
}

function paintRideFront(b: Brush): void {
  const t = b.t
  if (t < FROM || t >= TO) return
  paintPour(b, t, sandAt(t))
  paintDune(b)
  if (t >= BITE) paintHooks(b, t, paulOnWorm(t))
}

export const ride: Scene = {
  key: 'ride',
  from: FROM,
  to: TO,
  paul,
  chani,
  actors: fremen,
  shots,
  back: [drawing('ride', TO + 1, paintRide)],
  front: [drawing('ride-front', TO + 1, paintRideFront)],
  overview: { x0: 980, y0: -60, x1: 1440, y1: 10 },
  // On the worm they go with the camera: no streak behind them.
  trailOff: (t) => t >= BITE && t < TO,
  strikes: [
    ['he plants the thumper', PLANT],
    ...THUMPS.map((t, i): [string, number] => [`thump ${i}`, t]),
    ['worm sign', drive(21)],
    ['close on him', 125.846],
    ['the leap', LEAP],
    ['the hooks bite', BITE],
    ['the thumper swallowed', SWALLOW],
    ['the seam opens', OPEN],
    ['close on the seam', ROLL2],
    ['the surge', SURGE],
    ...CLIMB.map((t, i): [string, number] => [`climb ${i}`, t]),
    ['wide, racing', run(39)],
    ['he stands', STAND],
    ['Chani', CHANI_AT],
    ...CHEER.map((t, i): [string, number] => [`the Fremen ${i}`, t]),
    ['the long draw back', M.fall],
  ],
}
