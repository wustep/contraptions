import { R } from '../../../../../parts'
import type { Key } from '../camera'
import { light } from '../light'
import { M, eighthsIn, spread } from '../music'
import { knock, region, smooth, smoother, standing, type Pt } from '../paint'
import { hop, rest, ride, roll, type Move } from '../path'
import type { Scene } from '../scene'
import { GATE, STONES, STREET, meadowY, onMeadow, treads } from '../geo'
import { END } from '../credits'
import { drawArchDark, drawGate, drawHills, drawMeadow, drawRiver, drawStair, drawStone, drawTree } from './way/land'
import { LAMPS, drawStreet, drawTown, drawTownBack } from './way/town'

/**
 * The way in (0 → M.swell): the four chords, the theme.
 *
 * Close on the red gate's face, its arch dark. On the first chord she comes up out of the tunnel's dark into the
 * afternoon; on the second she rolls out from under the gate into the sun; on the third the wind goes past her into
 * the tunnel, pulling at her, and the grass leans after it; on the fourth she goes on to the brow of the meadow, and
 * the camera opens on the whole summer: the hills, the cloud, the meadow running down to the river of stones.
 *
 * On the theme she goes down the meadow and over the river, a stone a note, up the far bank's steps a step an eighth,
 * and along the empty street of eating houses as the sun goes. On the theme's last notes the lanterns come on down the
 * street, one a note, overtaking her towards the bridge.
 */

export const FROM = 0
export const TO = M.swell

/* ------------------------------------------------------------------ her */

const ARCH: Pt = [GATE.arch, GATE.sill - R]
/** Out from under the gate into the sun. */
const SUNLIT: Pt = onMeadow(-1.25)
/** The brow of the meadow, where she stops and the summer opens round her. */
const BROW: Pt = onMeadow(2.7)
const BANK: Pt = onMeadow(15.12)

/** Out of the dark: the first chord, and how long it takes her to come up out of it. */
const EMERGE = M.chord1
const EMERGED = EMERGE + 2.0
/** The wind's pull, on the third chord: she rocks back towards the tunnel and comes to rest again. */
const PULL = M.chord3
const PULL_END = PULL + 1.15

const pull = (t: number): Pt => {
  const k = knock(t, PULL, 0.18, 0.4)
  const x = SUNLIT[0] - 0.24 * k
  return [x, meadowY(x) - R]
}

/** The meadow's ground under a roll from `a` to `b`, sampled. */
const groundPath = (a: number, b: number): Pt[] => {
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / 0.1))
  return Array.from({ length: n + 1 }, (_, i) => onMeadow(a + ((b - a) * i) / n))
}

/** The stones: she lands on each on a note. */
export const STONE_LANDS = spread(26.4, 30.0, 6)
const STONE_AIR = 0.34
const stonePts: Pt[] = [BANK, ...STONES.map(([x, y]): Pt => [x, y - R]), [treads[0][0], treads[0][1] - R]]

/** The steps: a step an eighth, from the first eighth after the last stone. */
export const STEP_LANDS = eighthsIn(STONE_LANDS[5] + 0.3, 40)
  .slice(0, treads.length - 1)
  .map((e) => e.t)
const STEP_AIR = 0.26

/** Along the street, from the top of the steps to the bridge's foot. */
const TOP: Pt = [treads[treads.length - 1][0], STREET.y - R]
const BRIDGE_FOOT: Pt = [41.4, STREET.y - R]
const STREET_GO = STEP_LANDS[STEP_LANDS.length - 1] + 0.5
const STREET_STOP = M.swell - 0.7

/** The lanterns come on one a note down the street, west to east, overtaking her. */
export const LAMP_AT = spread(37.0, 43.4, LAMPS.length)

function heroMoves(): Move[] {
  const out: Move[] = [
    rest(ARCH, FROM, EMERGE, { scale: () => 0.55 }),
    ride(() => ARCH, EMERGE, EMERGED, undefined, { scale: (t) => 0.55 + 0.45 * smooth(t, EMERGE, EMERGED) }),
    rest(ARCH, EMERGED, M.chord2),
    roll(groundPath(ARCH[0], SUNLIT[0]).map((p, i) => (i === 0 ? ARCH : p)), M.chord2, M.chord2 + 1.6, 'inout'),
    rest(SUNLIT, M.chord2 + 1.6, PULL),
    { t0: PULL, t1: PULL_END, kind: 'roll', at: pull },
    rest(pull(PULL_END), PULL_END, M.chord4),
    roll(groundPath(pull(PULL_END)[0], BROW[0]), M.chord4, M.chord4 + 3.2, 'inout'),
    rest(BROW, M.chord4 + 3.2, M.theme),
    roll(groundPath(BROW[0], BANK[0]), M.theme, STONE_LANDS[0] - STONE_AIR - 0.12, 'inout'),
  ]
  // Stone to stone.
  let at = stonePts[0]
  let t = STONE_LANDS[0] - STONE_AIR - 0.12
  STONE_LANDS.forEach((land, i) => {
    const off = land - STONE_AIR
    if (off > t + 1e-6) out.push(rest(at, t, off))
    out.push(hop(at, stonePts[i + 1], off, land))
    at = stonePts[i + 1]
    t = land
  })
  // Up the steps.
  STEP_LANDS.forEach((land, i) => {
    const to: Pt = [treads[i + 1][0], treads[i + 1][1] - R]
    const off = Math.max(t, land - STEP_AIR)
    if (off > t + 1e-6) out.push(rest(at, t, off))
    out.push(hop(at, to, off, land))
    at = to
    t = land
  })
  out.push(rest(at, t, STREET_GO))
  out.push(roll([TOP, BRIDGE_FOOT], STREET_GO, STREET_STOP, 'inout'))
  out.push(rest(BRIDGE_FOOT, STREET_STOP, TO))
  return out
}

/* ------------------------------------------------------------------ the camera */

const SHOTS: Key[] = [
  // The gate under its trees in the afternoon, the arch dark.
  { t: 0, cells: 4.0, at: [-2.6, -1.8] },
  { t: EMERGED, cells: 3.5, at: [-2.7, -1.45], focus: ARCH },
  { t: PULL, cells: 3.4, at: [-2.0, -1.4], focus: SUNLIT },
  { t: M.chord4, cells: 3.6, at: [-1.6, -1.45] },
  // The summer opens round her on the brow.
  { t: M.chord4 + 5, cells: 6.0, at: [1.8, -1.85] },
  { t: M.theme - 0.4, cells: 8.6, at: [5.2, -2.5] },
  // Down the meadow with her, to the river.
  { t: M.theme + 3.2, cells: 6.8, at: [10.6, -1.5] },
  { t: STONE_LANDS[0] - 0.6, cells: 5.8, at: [17.4, 0.35] },
  { t: STONE_LANDS[5], cells: 5.4, at: [20.4, 0.15] },
  // Up the steps, and along the street as the light goes.
  { t: STEP_LANDS[STEP_LANDS.length - 1], cells: 5.0, at: [24.6, -1.45] },
  { t: 37.2, cells: 5.0, at: [30.0, -2.55] },
  { t: 41.0, cells: 6.0, at: [35.4, -2.85] },
  { t: TO - 0.05, cells: 7.0, at: [39.4, -2.95] },
]

/* ------------------------------------------------------------------ the drawings */

const LAND = region(-12, -6, 46, 5, 2)
const far = standing('way-far', region(-40, -14, 120, 8, 3), END, (g) => {
  // The far land belongs to the west: east of the bathhouse it gives way to the sea's horizon, going into the haze
  // as the camera goes, never cut off at once.
  // Nor are they seen from over the cloud.
  const a = (1 - smoother(g.view.cx, 57, 67)) * (1 - smoother(-g.view.cy, 13.5, 16.5))
  if (a <= 0.01) return
  g.ctx.save()
  g.ctx.globalAlpha = a
  drawHills(g, light(g.t))
  g.ctx.restore()
})
const gust = (t: number) => knock(t, PULL, 0.25, 0.9)
/** The trees about the gate, behind it, and the ones on the meadow. */
const trees = standing('way-trees', region(-12, -6, 14, 1, 1), END, (g) => {
  const L = light(g.t)
  drawTree(g, L, -8.3, 0.02, 4.6, 3, gust(g.t))
  drawTree(g, L, -5.6, 0.02, 3.4, 9, gust(g.t))
  drawTree(g, L, 1.15, meadowY(1.15) + 0.02, 3.9, 5, gust(g.t))
  drawTree(g, L, 9.6, meadowY(9.6) + 0.02, 2.3, 13, gust(g.t))
})
const gate = standing('way-gate', region(-9, -5, 3, 1, 1), END, (g) => {
  const L = light(g.t)
  drawGate(g, L)
  drawStone(g, L, 1.95)
})
const meadow = standing('way-meadow', LAND, END, (g) => {
  const L = light(g.t)
  drawMeadow(g, L, gust(g.t))
  drawRiver(g, L)
  drawStair(g, L)
})
const town = standing('way-town', region(22, -6, 44, 2, 1.5), END, (g) => {
  const L = light(g.t)
  drawTownBack(g, L)
  drawStreet(g, L)
  drawTown(g, L, LAMP_AT)
})
const archDark = standing('way-arch-dark', region(-5, -2, -2, 0, 1), END, null, (g) => drawArchDark(g, 1 - smooth(g.t, EMERGE + 0.15, EMERGED - 0.2)))

export const way: Scene = {
  key: 'way',
  from: FROM,
  to: TO,
  hero: heroMoves(),
  shots: SHOTS,
  back: [far],
  mid: [trees, gate, meadow, town],
  front: [archDark],
  overview: { x0: -9, y0: -6, x1: 44, y1: 3 },
}
