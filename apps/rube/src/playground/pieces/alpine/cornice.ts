import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInQuad } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, rail, ramp, rankBy, trace, wait, type Lane, type Pt } from '../../../parts'
import { powder, snow, snowAt, snowWhite } from './snow'

/**
 * A cornice. The rail runs out onto the snow that caps a crag, and the snow
 * runs on past the rock: a lip of it hangs out over nothing, two or three
 * floors of air under it. The ball rolls out along the lip, slowing in the
 * soft snow, and its weight is too much: a crack runs down through the lip
 * behind it, at the rock's edge, the lip sags and gapes, and the block
 * breaks off and falls, nose a little down, with the ball on its back. It
 * lands on the bank at the crag's foot in a burst of powder and is one
 * heap with it, level where the block's back was; the ball rolls off the
 * heap onto the rail. The crag keeps its cap and a broken edge.
 *
 * The block falls under one gravity and the ball's seat is a place on its
 * back, so the ball is on the snow all the way down.
 */
export interface CorniceState {
  white: string
  floors: number
}

/** The crag's edge, where the lip's support ends and the crack runs; the lip's tip; how thick the cap lies on the rock. */
const EDGE = -0.06
const TIP = 0.42
const CAP = 0.1
/** How deep the lip is at its root, and at its nose. */
const ROOT = 0.36
const NOSE_D = 0.12
/** Where the ball comes to rest on the lip. */
const SEAT = 0.16
const G = 22
/** How far the block's nose drops on the way down, radians. */
const NOSE = 0.12
/** The block turns about its middle as it falls; cracked through, it first sags about the foot of the crack. */
const MID: Pt = [0.15, FLOOR + 0.12]
const HINGE: Pt = [EDGE, FLOOR + ROOT]
const SAG = 0.06
/** The bank of snow at the crag's foot, which the block lands on and is one heap with: its two ends, and where the heap's level top ends. */
const BANK: [number, number] = [-0.2, 0.49]
const SHELF = 0.4

/** The ball rolls out along the lip, the soft snow taking its way off; the crack runs while it creeps to a stop, and then the lip sags. */
const OUT = [ramp([-0.5, 0], [SEAT - 0.05, 0], ROLL, 0.45), ramp([SEAT - 0.05, 0], [SEAT, 0], 0.45, 0)]
const T_STOP = OUT[0].dur + OUT[1].dur
const HOLD = 0.2
const T_BREAK = T_STOP + HOLD
const CRACK = 0.3
const sagAt = (t: number): number => SAG * easeInQuad(clamp((t - T_STOP) / HOLD))
/** A place on the lip, sagged by `a` about the crack's foot. */
const sagged = (at: Pt, a: number): Pt => {
  const dx = at[0] - HINGE[0]
  const dy = at[1] - HINGE[1]
  return [HINGE[0] + dx * Math.cos(a) - dy * Math.sin(a), HINGE[1] + dx * Math.sin(a) + dy * Math.cos(a)]
}
/** Where the block's middle and the ball's seat are at the break. */
const MID0 = sagged(MID, SAG)
const SEAT0 = sagged([SEAT, 0], SAG)

/** The ball's seat on the falling block: the block has fallen `d` and its nose has dropped a further `a`. */
function seat(d: number, a: number): Pt {
  const dx = SEAT0[0] - MID0[0]
  const dy = SEAT0[1] - MID0[1]
  return [MID0[0] + dx * Math.cos(a) - dy * Math.sin(a), MID0[1] + d + dx * Math.sin(a) + dy * Math.cos(a)]
}

function laneFor(floors: number): { lane: Lane; fall: number } {
  // How long the fall is: until the ball on the block's back is `floors` down.
  const down = (tau: number, fall: number) => seat(0.5 * G * tau * tau, NOSE * clamp(tau / fall))
  let lo = 0.1
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (down(mid, mid)[1] < floors) lo = mid
    else hi = mid
  }
  const fall = (lo + hi) / 2
  const end = down(fall, fall)
  const lane: Lane = {
    segs: [
      ...OUT,
      ...trace((t) => sagged([SEAT, 0], sagAt(t)), T_STOP, T_BREAK, 6),
      ...trace((t) => down(t - T_BREAK, fall), T_BREAK, T_BREAK + fall, 24),
      wait([end[0], floors], 0.12),
      ramp([end[0], floors], [0.5, floors], 0.5, ROLL),
    ],
    fire: T_BREAK,
  }
  return { lane, fall }
}
const LANES = new Map([2, 3].map((floors) => [floors, laneFor(floors)]))

/** The crack's line, top to bottom. */
const JAG: Pt[] = [
  [EDGE, FLOOR],
  [EDGE - 0.03, FLOOR + ROOT * 0.3],
  [EDGE + 0.035, FLOOR + ROOT * 0.62],
  [EDGE - 0.01, FLOOR + ROOT],
]

/** The lip's outline from the top of the crack round its nose and back along its hollow underside to the crack's foot. */
function round(p: p5, k: number): void {
  p.vertex(EDGE * k, FLOOR * k)
  p.vertex((TIP - 0.07) * k, FLOOR * k)
  p.bezierVertex((TIP + 0.02) * k, FLOOR * k, (TIP + 0.03) * k, (FLOOR + NOSE_D) * k, (TIP - 0.08) * k, (FLOOR + NOSE_D) * k)
  p.bezierVertex(0.14 * k, (FLOOR + NOSE_D + 0.01) * k, 0.02 * k, (FLOOR + 0.2) * k, (EDGE - 0.01) * k, (FLOOR + ROOT) * k)
}
/** The lip as a block of its own, the crack its near edge. */
function lip(p: p5, k: number): void {
  p.beginShape()
  round(p, k)
  p.vertex(JAG[2][0] * k, JAG[2][1] * k)
  p.vertex(JAG[1][0] * k, JAG[1][1] * k)
  p.endShape(p.CLOSE)
}
/** A mound between `x0` and `x1` standing on the snow's line at `base`, its top at `top`; level from `l0` to `l1` when it has a shelf. */
function mound(p: p5, k: number, x0: number, x1: number, base: number, top: number, l0?: number, l1?: number): void {
  const n = 28
  p.beginShape()
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    const ground = snowAt(x, base) + 0.012
    const f = l0 === undefined || l1 === undefined ? (x - x0) / (x1 - x0) : x < l0 ? ((x - x0) / (l0 - x0)) * 0.5 : x > l1 ? 1 - ((x1 - x) / (x1 - l1)) * 0.5 : 0.5
    p.vertex(x * k, (ground - (ground - top) * Math.sin(Math.PI * f) ** 2) * k)
  }
  p.endShape(p.CLOSE)
}

export const cornice = definePiece<CorniceState>({
  name: 'cornice',
  weight: 0.9,
  place: ({ rng, fits, theme }) => {
    for (const floors of rankBy(rng, [2, 3], () => 1)) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [1, floors]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: LANES.get(floors)!.lane, state: { white: snowWhite(theme), floors } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors } = s
    const { fall } = LANES.get(floors)!
    const ground = floors + 0.5
    const landed = since >= fall

    // The ground below and the rail out; the crag, bare rock from the ground up, its face leaning back under the lip.
    snow(p, k, ink, weight, BANK[0], 0.5, floors + 0.36)
    rail(p, k, ink, weight, SHELF, 0.5, floors + FLOOR)
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-0.5 * k, (FLOOR + CAP) * k)
    p.vertex((EDGE - 0.01) * k, (FLOOR + CAP) * k)
    p.vertex((EDGE - 0.02) * k, (FLOOR + ROOT + 0.05) * k)
    p.vertex(-0.2 * k, (FLOOR + ROOT + 0.3) * k)
    p.vertex(-0.15 * k, (ground - 0.75) * k)
    p.vertex(-0.27 * k, (ground - 0.4) * k)
    p.vertex(-0.22 * k, ground * k)
    p.vertex(-0.5 * k, ground * k)
    p.endShape(p.CLOSE)

    // The bank at the crag's foot; with the block landed on it, one heap with a level top the ball rolls off.
    solid(p, ink, weight, s.white)
    if (landed) mound(p, k, BANK[0], BANK[1], floors + 0.36, floors + FLOOR, -0.02, SHELF)
    else mound(p, k, BANK[0], BANK[1], floors + 0.36, floors + 0.27)

    if (since < 0) {
      // Whole, the cap and the lip are one snow. Cracked through, the lip sags about the crack's foot and the crack gapes.
      const run = clamp((t - (T_STOP - CRACK)) / CRACK)
      const sag = sagAt(t)
      p.beginShape()
      p.vertex(-0.5 * k, FLOOR * k)
      if (sag > 0) for (const at of JAG) p.vertex(at[0] * k, at[1] * k)
      else round(p, k)
      p.vertex((EDGE - 0.01) * k, (FLOOR + CAP) * k)
      p.vertex(-0.5 * k, (FLOOR + CAP) * k)
      p.endShape(p.CLOSE)
      if (sag > 0) {
        p.push()
        p.translate(HINGE[0] * k, HINGE[1] * k)
        p.rotate(sag)
        p.translate(-HINGE[0] * k, -HINGE[1] * k)
        lip(p, k)
        p.pop()
      } else if (run > 0) {
        // The crack, running down from the top behind the ball.
        outline(p, ink, weight)
        p.beginShape()
        p.vertex(JAG[0][0] * k, JAG[0][1] * k)
        for (let i = 1; i < JAG.length; i++) {
          const f = clamp(run * (JAG.length - 1) - (i - 1))
          if (f <= 0) break
          p.vertex((JAG[i - 1][0] + (JAG[i][0] - JAG[i - 1][0]) * f) * k, (JAG[i - 1][1] + (JAG[i][1] - JAG[i - 1][1]) * f) * k)
        }
        p.endShape()
      }
      return
    }
    // Broken: the cap keeps the crack's edge.
    p.beginShape()
    p.vertex(-0.5 * k, FLOOR * k)
    for (const at of JAG.slice(0, 2)) p.vertex(at[0] * k, at[1] * k)
    p.vertex((EDGE - 0.01) * k, (FLOOR + CAP) * k)
    p.vertex(-0.5 * k, (FLOOR + CAP) * k)
    p.endShape(p.CLOSE)
    if (landed) return
    // The block, falling, its nose dropping as it goes.
    p.push()
    p.translate(MID0[0] * k, (MID0[1] + 0.5 * G * since * since) * k)
    p.rotate(SAG + NOSE * clamp(since / fall))
    p.translate(-MID[0] * k, -MID[1] * k)
    lip(p, k)
    p.pop()
  },
  over: (p, s, { k, since, ink, weight }) => {
    const { fall } = LANES.get(s.floors)!
    const f = (since - fall) / 0.55
    powder(p, k, ink, weight, s.white, -0.04, s.floors + 0.3, f, 1.8)
    powder(p, k, ink, weight, s.white, 0.3, s.floors + 0.32, f * 1.15, 1.4)
  },
})
