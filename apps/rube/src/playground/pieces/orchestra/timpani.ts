import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, ramp, rankBy, type Lane, type Pt, type Seg } from '../../../parts'
import { brass, feltColor, ivory, stage } from './hall'

/**
 * A kettledrum in the pit. The stage stops at the pit's edge; the ball
 * slows to the brink, rolls off and falls onto the middle of the drum's
 * head, which takes it down a good way and throws it back, much harder
 * than it came: a high arc over the pit's far side onto the stage again,
 * or past the end of a shelf a floor up and down onto that. The head rings
 * on after, up and down through its level, and dies away.
 *
 * One pace across carries the ball the whole way, brink to landing: the
 * fall, the dimple and the flight are a falling thing's, so the drum stands
 * where the fall comes down and the ball lands where the flight does.
 */
export interface TimpaniState {
  color: string
  /** 0: back onto the stage across the pit. 1: onto a shelf a floor up. */
  up: 0 | 1
}

/** Cartoon gravity. */
const G = 26
/** The brink, the head at rest, how deep the ball takes it, and where the ball comes down at the far side. */
const LIP = 0.1
const HEAD = 0.8
const SAG = 0.12
const LAND_X = 1.3
/** The pit: how far the stage overhangs its near wall, its far wall, and its floor. */
const APRON = LIP + 0.04
const WALL1 = 1.12
const GROUND = 1.5
/** The bowl: half its width at the rim, and how deep it hangs under the hoop. */
const RW = 0.45
const HOOP = 0.055
const BOWL = 0.46

interface Plan {
  lane: Lane
  /** The drum's middle, under where the fall comes down. */
  cx: number
  /** When the ball touches the head, when the head is deepest, and when it lets go. */
  touch: number
  let: number
  /** Where the shelf a floor up begins, clear of the ball on its way past. */
  shelf: number
}

function plan(up: 0 | 1): Plan {
  const y0 = HEAD - R
  const landY = -up
  // The flight tops out a little over where it is going: more over a shelf, which it has to get past the end of.
  const peak = landY - (up ? 0.3 : 0.24)
  const fall = Math.sqrt((2 * y0) / G)
  const vIn = G * fall
  const vOut = Math.sqrt(2 * G * (y0 - peak))
  const down = (2 * SAG) / vIn
  const back = (2 * SAG) / vOut
  const rise = vOut / G
  const drop = Math.sqrt((2 * (landY - peak)) / G)
  const flight = rise + drop
  // One pace across, brink to landing.
  const v = (LAND_X - LIP) / (fall + down + back + flight)
  const cx = LIP + v * (fall + down)
  const hit: Pt = [LIP + v * fall, y0]
  const low: Pt = [cx, y0 + SAG]
  const off: Pt = [cx + v * back, y0]
  const run = ramp([-0.5, 0], [LIP, 0], ROLL, v)
  const segs: Seg[] = [
    run,
    fly([LIP, 0], hit, fall, (G * fall * fall) / 8),
    { from: hit, to: low, dur: down, ease: 'out' },
    { from: low, to: off, dur: back, ease: 'in' },
    fly(off, [LAND_X, landY], flight, (G * flight * flight) / 8),
    ramp([LAND_X, landY], [1.5, landY], v, ROLL),
  ]
  const touch = run.dur + fall
  // The ball's bottom clears the shelf's line this long after it leaves the head.
  const past = (vOut - Math.sqrt(vOut * vOut - 2 * G * (y0 - (landY - 2 * R)))) / G
  return { lane: { segs, fire: touch + down }, cx, touch, let: touch + down + back, shelf: off[0] + v * past + R + 0.04 }
}

const PLANS = [plan(0), plan(1)] as const

export const timpani = definePiece<TimpaniState>({
  name: 'timpani',
  flight: true,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    for (const up of rankBy(rng, [0, 1] as const, () => 1)) {
      const cells: Pt[] = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]
      if (up) cells.push([0, -1], [1, -1])
      const exit: Pt = [2, -up]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: PLANS[up].lane, state: { color: feltColor(theme, color, ball.color), up } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, weight, theme }) => {
    const { cx, touch, let: go } = PLANS[s.up]
    // How far the head's middle is from level: pressed by the ball, thrown back, and ringing on after.
    const free = t - go
    const sag = t < touch ? 0 : since < 0 ? SAG * (1 - (1 - over(t, touch, touch + (go - touch) * 0.55)) ** 2) : free < 0 ? SAG * (1 - over(since, 0, go - touch) ** 2) : -0.05 * Math.sin(free * 30) * Math.exp(-free * 3.2)

    // The stage to the brink, over the pit's near wall; the pit; and its far wall, up to whatever the ball comes down on.
    const wall0 = Math.min(APRON, cx - RW - 0.09)
    const top = s.up ? -1 + FLOOR : FLOOR
    stage(p, k, ink, weight, -0.5, APRON)
    stage(p, k, ink, weight, s.up ? PLANS[1].shelf : WALL1, 1.5, top)
    outline(p, ink, weight)
    p.line(wall0 * k, FLOOR * k, wall0 * k, GROUND * k)
    p.line(wall0 * k, GROUND * k, WALL1 * k, GROUND * k)
    p.line(WALL1 * k, top * k, WALL1 * k, GROUND * k)

    // The legs, splayed to the pit's floor, and the pedal between them.
    const rim = HEAD + HOOP
    outline(p, ink, weight)
    p.line((cx - RW * 0.62) * k, (rim + BOWL * 0.7) * k, (cx - RW * 0.95) * k, GROUND * k)
    p.line((cx + RW * 0.62) * k, (rim + BOWL * 0.7) * k, (cx + RW * 0.95) * k, GROUND * k)
    solid(p, ink, weight, s.color)
    p.quad((cx + 0.1) * k, GROUND * k, (cx - 0.12) * k, GROUND * k, (cx - 0.12) * k, (GROUND - 0.03) * k, (cx + 0.1) * k, (GROUND - 0.1) * k)

    // The kettle: copper, hung under the hoop.
    solid(p, ink, weight, brass(theme))
    p.beginShape()
    p.vertex((cx - RW) * k, rim * k)
    p.bezierVertex((cx - RW) * k, (rim + BOWL * 0.75) * k, (cx - RW * 0.55) * k, (rim + BOWL) * k, cx * k, (rim + BOWL) * k)
    p.bezierVertex((cx + RW * 0.55) * k, (rim + BOWL) * k, (cx + RW) * k, (rim + BOWL * 0.75) * k, (cx + RW) * k, rim * k)
    p.endShape(p.CLOSE)

    // The head: a skin lapped over the hoop, its top the line the ball lands on.
    const w = RW + 0.03
    solid(p, ink, weight, ivory(theme))
    p.beginShape()
    p.vertex((cx - w) * k, HEAD * k)
    p.bezierVertex((cx - w * 0.35) * k, (HEAD + sag * 1.33) * k, (cx + w * 0.35) * k, (HEAD + sag * 1.33) * k, (cx + w) * k, HEAD * k)
    p.vertex((cx + w) * k, rim * k)
    p.bezierVertex((cx + w * 0.35) * k, (rim + sag * 1.33) * k, (cx - w * 0.35) * k, (rim + sag * 1.33) * k, (cx - w) * k, rim * k)
    p.endShape(p.CLOSE)
  },
})
