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
 *   145.5   he climbs, a pull every other beat, up to its back
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

/** The Fremen along the top, each with his own facing; they hop on the drum's beats once he stands. */
const FREMEN_XS = [1074.6, 1075.7, 1077.0, 1080.2, 1081.3, 1082.6, 1083.6, 1087.4, 1088.7, 1091.9]
const CHEER = beatsIn('run', 160.3, 164.7).map((b) => b.t)
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

const LAST_HOLD: Pt = [1404, -44]

const shots: Shot[] = [
  // The mesa: the Fremen on its top, him coming down the ridge.
  { t: FROM, cut: true, cells: 25, at: [1067.5, -8.6] },
  { t: PLANT - 0.01, cells: 21, at: [1063.5, -7.2] },
  // The thumper, close, as he drives it in and it starts.
  { t: PLANT, cut: true, cells: 3.4, at: [1056.9, -0.95] },
  { t: drive(13) - 0.01, cells: 3.2, at: [1056.95, -0.92] },
  // Up the dune to the crest; the thumper beating behind him.
  { t: drive(13), cut: true, cells: 12, at: [1050.5, -5.6] },
  { t: drive(21) - 0.01, cells: 11, at: [1048, -5.6] },
  // Worm sign: low, going along with the swell as it runs east under the sand.
  { t: drive(21), cut: true, cells: 15, track: swellAt, off: [-1.5, -3.6], focus: swellAt },
  { t: drive(27), cells: 16, track: swellAt, off: [1.0, -3.8], focus: swellAt },
  // It runs on into the frame toward the dune, him small on its crest.
  { t: 125.846 - 0.01, cells: 30, at: [1019, -9.4], focus: [1042, -6] },
  // Close on him on the crest; it comes; the frame opens as its back rises behind the dune, and he goes.
  { t: 125.846, cut: true, cells: 5.2, at: [1041.4, -6.9] },
  { t: 129.0, cells: 6, at: [1040.6, -6.7] },
  { t: LEAP - 0.3, cells: 17, at: [1039.5, -6.2] },
  { t: OPEN - 0.01, cells: 19, at: [1050.5, -6.0] },
  // The roll: on its flank going by under the mesa, the Fremen on its edge over him, the rock sliding past.
  { t: OPEN, cut: true, cells: 13, track: paulAt, off: [-1.2, -3.4] },
  { t: SURGE - 0.01, cells: 12, track: paulAt, off: [-0.8, -3.0] },
  // The surge: the whole worm heaving out of the sand.
  { t: SURGE, cut: true, cells: 30, track: wormMid, off: [3, -1.5], focus: paulAt },
  { t: CLIMB[0] - 0.01, cells: 28, track: wormMid, off: [2, -1.5], focus: paulAt },
  // The climb, close.
  { t: CLIMB[0], cut: true, cells: 5.4, track: paulAt, off: [-0.9, 0.2] },
  { t: run(39) - 0.01, cells: 5.0, track: paulAt, off: [-0.8, 0.1] },
  // Wide and still: the worm comes into the frame from the west and races across it.
  { t: run(39), cut: true, cells: 42, at: [1193, -13], focus: paulAt },
  { t: STAND - 0.01, cells: 40, at: [1196, -12.6], focus: paulAt },
  // He stands: low and close, him high in the frame against the sky.
  { t: STAND, cut: true, cells: 7.6, track: paulAt, off: [2.4, 1.3], focus: paulAt },
  { t: run(54) - 0.01, cells: 6.8, track: paulAt, off: [2.1, 1.15], focus: paulAt },
  // On the mesa: Chani close and still, looking after him; the Fremen beside her hopping with the drum.
  { t: run(54), cut: true, cells: 4.6, at: [1075.0, -14.45] },
  { t: M.fall - 0.01, cells: 4.3, at: [1074.9, -14.4] },
  // The long last shot: behind him, then drawing back and back as the sun goes out, then still.
  { t: M.fall, cut: true, cells: 34, track: wormMid, off: [3, -8.5], focus: paulAt },
  { t: 170, cells: 52, track: wormMid, off: [18, -15], w: 0 },
  { t: 177.5, cells: 112, at: [1390, -43] },
  { t: 184.3, cells: 120, at: LAST_HOLD },
  { t: TO - 0.001, cells: 120, at: LAST_HOLD },
]

/** Where the horizon stands in each shot: low for the stand, so he is against the sky. */
const tilt = tiltOf([
  [FROM, 0.14], [PLANT - 0.01, 0.14], [PLANT, 0.36], [drive(13) - 0.01, 0.36], [drive(13), 0.16], [drive(21) - 0.01, 0.16],
  [drive(21), 0.22], [drive(27), 0.22], [125.84, 0.16], [125.846, 0.2], [LEAP, 0.18], [OPEN - 0.01, 0.18], [OPEN, 0.3], [SURGE - 0.01, 0.3],
  [SURGE, 0.14], [CLIMB[0] - 0.01, 0.14], [CLIMB[0], 0.24], [run(39) - 0.01, 0.24], [run(39), 0.12], [STAND - 0.01, 0.12],
  [STAND, 0.26], [run(54) - 0.01, 0.26], [run(54), 0.25], [M.fall - 0.01, 0.25], [M.fall, 0.14], [177.5, 0.12], [TO, 0.12],
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
    ['the surge', SURGE],
    ...CLIMB.map((t, i): [string, number] => [`climb ${i}`, t]),
    ['wide, racing', run(39)],
    ['he stands', STAND],
    ...CHEER.map((t, i): [string, number] => [`the Fremen ${i}`, t]),
    ['the long last shot', M.fall],
  ],
}
