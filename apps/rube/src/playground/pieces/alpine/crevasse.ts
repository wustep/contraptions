import type p5 from 'p5'
import { solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, laneAt, mixHex, rail, ramp, rankBy, roll, trace, wait, type Lane, type Pt, type Seg } from '../../../parts'
import { iceBlue, powder, snowWhite } from './snow'

/**
 * A crevasse. The rail runs out over the snow and the snow hides a crack
 * in the ice under it, a floor or two deep, bridged by a crust no thicker
 * than the ball. The ball rolls onto the bridge, which dips under it, and
 * at the middle the bridge gives way: the ball falls between two walls of
 * blue ice, glancing off the far one and then the near one on the way
 * down, with the bridge's lumps falling round it, and lands in the snow on
 * the crevasse's floor. It rolls out under an arch in the ice, on or back.
 * The bridge's two stumps are left at the top, and its lumps at the bottom.
 *
 * The fall is one gravity from the break to the floor; the glances only
 * turn it from side to side.
 */
export interface CrevasseState {
  white: string
  ice: string
  floors: number
  turn: 1 | -1
}

/** The crack: its two faces, and how far out the ice is drawn either side. */
const FACE = 0.2
const OUTER = 0.5
/** How far under the cell's centre line the snow outside lies, where the floor's snow runs out to it. */
const SNOW_OUT = 0.352
/** The snow on the ice, and the bridge across the crack: how thick they lie. */
const CAP = 0.09
const CRUST = 0.07
/** How far the bridge dips under the ball, and where on it the ball is when it goes. */
const DIP = 0.04
const BREAK = -0.035
const G = 24
/** The ball's pace across the bridge, dying in the soft crust. */
const SLOW = 0.8
/** How far off the crack's middle the ball is when it glances off a face, and how high the arch out is. */
const PLAY = FACE - R
const ARCH = 0.5

/** The bridge's dip under a ball at `bx`, at `x`. */
const dipAt = (x: number, bx: number): number => (Math.abs(bx) >= FACE ? 0 : DIP * Math.cos((bx / FACE) * (Math.PI / 2)) ** 2 * Math.exp(-(((x - bx) / 0.14) ** 2)))

/** Across the bridge to where it gives: a run of short rolls, each a little slower and a little lower. */
const ACROSS: Seg[] = (() => {
  const n = 6
  const segs: Seg[] = []
  for (let i = 0; i < n; i++) {
    const x0 = -FACE + ((BREAK + FACE) * i) / n
    const x1 = -FACE + ((BREAK + FACE) * (i + 1)) / n
    segs.push(ramp([x0, dipAt(x0, x0)], [x1, dipAt(x1, x1)], ROLL + ((SLOW - ROLL) * i) / n, ROLL + ((SLOW - ROLL) * (i + 1)) / n))
  }
  return segs
})()
const T_BREAK = (0.5 - FACE) / ROLL + ACROSS.reduce((sum, s) => sum + s.dur, 0)
const Y_BREAK = dipAt(BREAK, BREAK)

function laneFor(floors: number, turn: 1 | -1): { lane: Lane; fall: number; land: number } {
  const fall = Math.sqrt((2 * (floors - Y_BREAK)) / G)
  // Off the far face three tenths of the way down, off the near one at seven; one sideways pace all the way.
  const pace = (PLAY - BREAK) / (0.3 * fall)
  const xAt = (tau: number): number => (tau < 0.3 * fall ? BREAK + pace * tau : tau < 0.7 * fall ? PLAY - pace * (tau - 0.3 * fall) : -PLAY + pace * (tau - 0.7 * fall))
  const at = (t: number): Pt => [xAt(t - T_BREAK), Y_BREAK + 0.5 * G * (t - T_BREAK) ** 2]
  const land = xAt(fall)
  const lane: Lane = {
    segs: [roll([-0.5, 0], [-FACE, 0], ROLL), ...ACROSS, ...trace(at, T_BREAK, T_BREAK + fall, 30), wait([land, floors], 0.12), ramp([land, floors], [turn * 0.5, floors], 0.5, ROLL)],
    fire: T_BREAK,
  }
  return { lane, fall, land }
}
const LANES = new Map([1, 2].flatMap((floors) => ([1, -1] as const).map((turn) => [`${floors}:${turn}`, laneFor(floors, turn)] as const)))

/** The bridge's lumps, on the side the ball does not leave by: where across the crack each falls, how long after the break it goes, how big it is. */
const LUMPS: [x: number, late: number, r: number][] = [
  [0.13, 0, 0.06],
  [0.03, 0.06, 0.045],
]

/** One side of the ice in section, from its face at `side * FACE` to its cell's edge: down to the ground, or to the arch the ball leaves under. */
function wall(p: p5, k: number, side: 1 | -1, top: number, bottom: number, arch: boolean): void {
  p.beginShape()
  p.vertex(side * FACE * k, top * k)
  p.vertex(side * 0.5 * k, top * k)
  if (arch) {
    p.vertex(side * 0.5 * k, (bottom - ARCH + 0.04) * k)
    p.bezierVertex(side * 0.4 * k, (bottom - ARCH - 0.05) * k, side * (FACE + 0.1) * k, (bottom - ARCH - 0.05) * k, side * FACE * k, (bottom - ARCH + 0.06) * k)
  } else {
    p.vertex(side * 0.5 * k, bottom * k)
    p.vertex(side * FACE * k, bottom * k)
  }
  p.endShape(p.CLOSE)
}

export const crevasse = definePiece<CrevasseState>({
  name: 'crevasse',
  weight: 1,
  place: ({ rng, fits, theme, ball }) => {
    const options = [1, 2].flatMap((floors) => ([1, -1] as const).map((turn) => ({ floors, turn })))
    for (const { floors, turn } of rankBy(rng, options, () => 1)) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      // Ice is the palette's bluest colour, and paler when the ball is that colour, so the ball never falls through its own.
      const blue = iceBlue(theme)
      const white = snowWhite(theme)
      const ice = blue === ball.color ? mixHex(blue, white, 0.55) : blue
      return { cells, exit: { at: exit, dir: turn }, lane: LANES.get(`${floors}:${turn}`)!.lane, state: { white, ice, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const { floors, turn } = s
    const ground = floors + 0.5
    const level = floors + FLOOR

    // The two walls of ice, the one the ball leaves under cut to an arch; the snow that lies on them.
    solid(p, ink, weight, s.ice)
    wall(p, k, -1, FLOOR + CAP, ground, turn < 0)
    wall(p, k, 1, FLOOR + CAP, ground, turn > 0)
    solid(p, ink, weight, s.white)
    p.rect(((-0.5 - FACE) / 2) * k, (FLOOR + CAP / 2) * k, (0.5 - FACE) * k, CAP * k)
    p.rect(((FACE + OUTER) / 2) * k, (FLOOR + CAP / 2) * k, (OUTER - FACE) * k, CAP * k)

    // The snow on the crevasse's floor, level with the rail out, and running out under the arch to the ground there.
    solid(p, ink, weight, s.white)
    p.beginShape()
    p.vertex(-turn * FACE * k, level * k)
    const n = 12
    for (let i = 0; i <= n; i++) {
      const x = 0.24 + (0.26 * i) / n
      p.vertex(turn * x * k, (level + (SNOW_OUT - FLOOR) * Math.sin(((Math.PI / 2) * i) / n) ** 2) * k)
    }
    p.vertex(turn * 0.5 * k, ground * k)
    p.vertex(-turn * FACE * k, ground * k)
    p.endShape(p.CLOSE)
    rail(p, k, ink, weight, Math.min(turn * 0.24, turn * 0.5), Math.max(turn * 0.24, turn * 0.5), level)

    // The bridge: whole and dipping under the ball, or its two stumps.
    solid(p, ink, weight, s.white)
    if (since < 0) {
      const bx = laneAt(LANES.get(`${floors}:${turn}`)!.lane, t).x
      const n = 16
      p.beginShape()
      for (let i = 0; i <= n; i++) {
        const x = -FACE + (2 * FACE * i) / n
        p.vertex(x * k, (FLOOR + dipAt(x, bx)) * k)
      }
      for (let i = n; i >= 0; i--) {
        const x = -FACE + (2 * FACE * i) / n
        p.vertex(x * k, (FLOOR + CRUST + dipAt(x, bx) * 1.2) * k)
      }
      p.endShape(p.CLOSE)
      return
    }
    for (const side of [-1, 1]) {
      p.beginShape()
      p.vertex(side * FACE * k, FLOOR * k)
      p.vertex(side * (FACE - 0.07) * k, (FLOOR + 0.02) * k)
      p.vertex(side * (FACE - 0.04) * k, (FLOOR + CRUST + 0.03) * k)
      p.vertex(side * FACE * k, (FLOOR + CRUST) * k)
      p.endShape(p.CLOSE)
    }
    // Its lumps, falling with the ball and lying on the floor after.
    for (const [x, late, r] of LUMPS) {
      const tau = Math.max(0, since - late)
      p.circle(-turn * x * k, Math.min(level - r * 0.8, FLOOR + 0.04 + 0.5 * G * 0.8 * tau * tau) * k, r * 2 * k)
    }
  },
  over: (p, s, { k, since, ink, weight }) => {
    const { fall, land } = LANES.get(`${s.floors}:${s.turn}`)!
    powder(p, k, ink, weight, s.white, land, s.floors + FLOOR, (since - fall) / 0.45, 0.9)
  },
})
