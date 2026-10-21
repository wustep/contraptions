import { R } from '../../../../../parts'
import type { Key } from '../camera'
import { CREDITS_AT, END } from '../credits'
import { light } from '../light'
import { M, spread, strongest } from '../music'
import { region, smooth, standing, type Pt } from '../paint'
import { hop, rest, ride, roll, type Move } from '../path'
import type { Scene } from '../scene'
import { GATE, STONES, meadowY, onMeadow } from '../geo'
import { CLOUD_BOTTOM, CLOUD_TOP, drawMist } from '../world/cloudsea'
import { drawArchDark } from './way/land'
import { HE_LANDS, LAND, SHE_LANDS, heFalls, sheFalls } from './sky'

/**
 * Home (M.home → the end): the cue winding down, and its fade.
 *
 * They fall on down into the cloud, through its pale, and out under it into the first light, the meadow and the river
 * of stones below them, and the fall slows to nothing: they come down on the dry bed side by side. They stay so a
 * while. Then, on a note, she goes: back over the stones alone, a stone a note, and he does not follow; up the meadow
 * to the red gate; at the arch she stops, and does not look back; and as the music fades she goes into the dark. The
 * credits come up over the summer sky, and the wind goes on in the grass.
 */

export const FROM = M.home
export const TO = END

/** They part on a note, a while after they come down. */
export const PART = strongest(LAND + 2.6, LAND + 3.6)
/** She lands on each stone on a note, west, and then the bank. */
export const STONE_LANDS = spread(PART + 0.45, PART + 5.6, 6)
const AIR = 0.34
const BANK: Pt = onMeadow(15.12)
const stonePts: Pt[] = [SHE_LANDS, ...[...STONES].reverse().map(([x, y]): Pt => [x, y - R]), BANK]

/** Up the meadow to the gate, the stop at its arch, and into the dark. */
const UP_FROM = STONE_LANDS[5] + 0.35
const AT_ARCH = M.fade - 1.1
const ARCH: Pt = [GATE.arch, GATE.sill - R]
const SILL: Pt = onMeadow(-1.0)
const GOES = M.fade + 0.4
const GONE = GOES + 2.2

const groundPath = (a: number, b: number): Pt[] => {
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / 0.1))
  return Array.from({ length: n + 1 }, (_, i) => onMeadow(a + ((b - a) * i) / n))
}

function heroMoves(): Move[] {
  const out: Move[] = [ride(sheFalls, FROM, LAND), rest(SHE_LANDS, LAND, STONE_LANDS[0] - AIR)]
  let at = stonePts[0]
  let t = STONE_LANDS[0] - AIR
  STONE_LANDS.forEach((land, i) => {
    const off = land - AIR
    if (off > t + 1e-6) out.push(rest(at, t, off))
    out.push(hop(at, stonePts[i + 1], off, land))
    at = stonePts[i + 1]
    t = land
  })
  out.push(rest(at, t, UP_FROM))
  out.push(roll(groundPath(BANK[0], SILL[0]), UP_FROM, AT_ARCH - 1.2, 'inout'))
  out.push(roll([SILL, ARCH], AT_ARCH - 1.2, AT_ARCH, 'inout'))
  out.push(rest(ARCH, AT_ARCH, GOES))
  // Into the tunnel: away from us, smaller, into its dark.
  out.push(ride(() => ARCH, GOES, GONE, undefined, { scale: (s) => 1 - 0.45 * smooth(s, GOES, GONE) }))
  out.push(rest(ARCH, GONE, TO, { scale: () => 0.55 }))
  return out
}

const SHOTS: Key[] = [
  // Down with them through the cloud.
  { t: FROM + 0.05, cells: 4.4, off: [0, 0.7] },
  { t: FROM + 2.4, cells: 5.6, off: [0, 1.2] },
  // Out under it into the dawn: the meadow and the river of stones below.
  { t: FROM + 4.1, cells: 7.6, off: [-0.4, 1.9] },
  // Down on the bed, close on the two of them.
  { t: LAND, cells: 3.4, at: [SHE_LANDS[0] + 0.15, SHE_LANDS[1] - 0.45] },
  { t: PART, cells: 3.6, at: [SHE_LANDS[0] - 0.1, SHE_LANDS[1] - 0.45] },
  // Back over the stones with her; he stays.
  { t: STONE_LANDS[3], cells: 5.0, at: [18.6, 0.9] },
  // Up the meadow with her, under the trees, to the gate.
  { t: UP_FROM + 1.2, cells: 5.4, off: [-1.1, -1.05] },
  { t: AT_ARCH - 3.2, cells: 5.0, off: [-1.3, -1.1] },
  { t: AT_ARCH, cells: 4.4, at: [-2.6, -1.25] },
  { t: GONE, cells: 4.5, at: [-2.6, -1.3] },
  // The summer, wide, for the credits: the gate at the left, the meadow going down to the river.
  { t: CREDITS_AT + 1, cells: 7.4, at: [2.6, -2.5] },
  { t: TO, cells: 9.8, at: [5.6, -2.9] },
]

/** Falling through the cloud, the frame goes to its pale and out of it. */
const mist = standing('home-mist', region(-10, -40, 80, 10, 4), END, null, (g) => {
  if (g.t < FROM - 1 || g.t > FROM + 6) return
  const cy = g.view.cy
  const inside = smooth(cy, CLOUD_TOP - 0.3, CLOUD_TOP + 1.6) * (1 - smooth(cy, CLOUD_BOTTOM - 1.4, CLOUD_BOTTOM + 0.6))
  drawMist(g, light(g.t), inside * 0.62)
})
/** The tunnel's dark over her as she goes into it. */
const archDark = standing('home-arch-dark', region(-5, -2, -2, 0, 1), END, null, (g) => {
  if (g.t < GOES) return
  drawArchDark(g, smooth(g.t, GOES + 0.3, GONE - 0.2))
})

export const home: Scene = {
  key: 'home',
  from: FROM,
  to: TO,
  hero: heroMoves(),
  haku: { moves: [ride(heFalls, FROM, LAND), rest(HE_LANDS, LAND, TO)] },
  shots: SHOTS,
  front: [mist, archDark],
  overview: { x0: -9, y0: -6, x1: 24, y1: 3 },
}

export { meadowY }
