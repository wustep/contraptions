import { outline, solid } from '../../../../../src/core/draw'
import { clamp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seabed, water } from './sea'

/**
 * A square sail, let fall. A little ship lies two floors down at the
 * pier's foot, and her mast comes up past the deck with a yard across its
 * head. The sail is rolled up from the foot on a batten, and the roll
 * hangs in its own cloth under the yard, its top level with the deck, kept
 * from unrolling by one gasket off the yard. The ball rolls off the
 * pier's end onto the roll; the roll sags under it and the gasket slips:
 * the sail lets fall, the roll unrolling down the mast, thinner and faster
 * all the way, the sail opening above it, and the ball rides the roll's
 * top down, the soft roll taking most of its way off it. The roll fetches
 * up at the end of its cloth with a snap, level with the landing stage at
 * the water's edge, a ripple runs up the sail, and the jolt hops the ball
 * off the batten's end onto the stage, where it rolls on, or on along a
 * longer stage. The gasket swings from the yard after.
 *
 * The roll's top is one height at every instant, and the ball's lane is
 * that height with a ball on it; a roll unrolling under its own weight
 * gains speed evenly, so the fall is one steady acceleration and a stop.
 */
export interface SailState {
  color: string
  /** How far the landing stage runs: to the cell's edge, or a cell further. */
  long: boolean
}

/** The mast, the yard across it, and the cloth that hangs from the yard. */
const MAST_X = -0.06
const HEAD = -0.47
const YARD_Y = -0.3
const YARD: [number, number] = [-0.43, 0.31]
const CLOTH: [number, number] = [-0.37, 0.25]
/** The roll: a hair wider than the cloth, fat when furled and nearly all batten when run out. */
const BAR: [number, number] = [-0.385, 0.265]
const R0 = 0.1
const R1 = 0.04
/** The gasket: where it hangs off the yard, east of where the ball is while it is still that high. */
const GASKET_X = 0.17
/** How far the roll's top falls, and how far it sags under the ball before the gasket goes. */
const DROP = 2
const SAG = 0.012
/** The ball comes onto the roll here, and leaves its end here for the stage. */
const X_ON = -0.4
const X_OFF = 0.26
const LAND = 0.38
const STAGE_X0 = 0.31
/** The soft roll takes the way off the ball in this long; the gasket slips this long after the weight comes on. */
const BRAKE = 0.06
const SLIP = 0.07
/** The ride from the pier's end to the snap, and the hop the snap gives the ball. */
const RIDE = 1.136923
const HOP = 0.08
const T_ON = (X_ON + 0.5) / ROLL
const FIRE = T_ON + SLIP
const T_SNAP = T_ON + RIDE
/** Its pace along the batten once the roll has braked it: what brings it to the batten's end at the snap. */
const SHED = BRAKE * (1 - Math.exp(-RIDE / BRAKE))
const DRIFT = (X_OFF - X_ON - ROLL * SHED) / (RIDE - SHED)

/** The height of the roll's top, `t` seconds into the piece. */
function topAt(t: number): number {
  if (t <= FIRE) return FLOOR + SAG * clamp((t - T_ON) / SLIP)
  if (t <= T_SNAP) return FLOOR + SAG + (DROP - SAG) * Math.pow((t - FIRE) / (T_SNAP - FIRE), 2)
  // Snapped taut: up off the end of the cloth and back, twice, once the ball is clear of the batten's end.
  const s = t - T_SNAP - 0.03
  const bounce = s <= 0 ? 0 : s < 0.22 ? 0.05 * Math.sin((Math.PI * s) / 0.22) : s < 0.38 ? 0.02 * Math.sin((Math.PI * (s - 0.22)) / 0.16) : 0
  return DROP + FLOOR - bounce
}
/** The roll's radius: what is left of the cloth, wound on the batten. */
const radiusAt = (t: number) => Math.sqrt(R1 * R1 + (R0 * R0 - R1 * R1) * (1 - clamp((topAt(t) - FLOOR) / DROP)))
/** The ball on the roll's top: braked from the deck's pace to a drift along the batten. */
function ballAt(t: number): Pt {
  const s = t - T_ON
  return [X_ON + DRIFT * s + (ROLL - DRIFT) * BRAKE * (1 - Math.exp(-s / BRAKE)), topAt(t) - FLOOR]
}

function laneTo(end: number): Lane {
  return {
    segs: [
      roll([-0.5, 0], [X_ON, 0], ROLL),
      ...trace(ballAt, T_ON, T_SNAP, 40),
      fly([X_OFF, DROP], [LAND, DROP], HOP, 0.02),
      ramp([LAND, DROP], [end, DROP], 1.7, ROLL),
    ],
    fire: FIRE,
  }
}
const LANES = { short: laneTo(0.5), long: laneTo(1.5) }

/** Seams across the cloth, this far down it from the head. */
const SEAMS = [0.98, 1.72]

export const sail = definePiece<SailState>({
  name: 'sail',
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    for (const long of rankBy(rng, [false, true], () => 1)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
        [0, 2],
      ]
      if (long) cells.push([1, 2])
      const exit: Pt = [long ? 2 : 1, 2]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: long ? LANES.long : LANES.short, state: { color: bodyColor(theme, color, ball.color), long } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const x1 = s.long ? 1.5 : 0.5
    const top = topAt(t)
    const r = radiusAt(t)
    const mid = top + r
    const sea = DROP + WATER

    // The deck's last plank above; the stage at the water's edge on its pilings.
    rail(p, k, ink, weight, -0.5, X_ON - 0.01)
    rail(p, k, ink, weight, STAGE_X0, x1, DROP + FLOOR)
    piling(p, k, ink, weight, STAGE_X0 + 0.07, DROP + FLOOR, DROP + 0.5)
    if (s.long) piling(p, k, ink, weight, 1.2, DROP + FLOOR, DROP + 0.5)
    seabed(p, k, ink, weight, -0.5, x1, DROP + 0.5)

    // The mast, stepped in the hull below; the yard across its head, in its lifts.
    outline(p, ink, weight * 0.9)
    for (const x of YARD) p.line(MAST_X * k, (HEAD + 0.03) * k, (x - Math.sign(x - MAST_X) * 0.03) * k, YARD_Y * k)
    solid(p, ink, weight, bg)
    p.rect(MAST_X * k, ((HEAD + sea) / 2) * k, 0.045 * k, (sea - HEAD) * k, 0.02 * k)
    p.rect(((YARD[0] + YARD[1]) / 2) * k, YARD_Y * k, (YARD[1] - YARD[0]) * k, 0.045 * k, 0.02 * k)
    // The hull: low in the water, her stem under the pier and her stern short of the stage.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.47 * k, (sea - 0.14) * k)
    p.quadraticVertex(-0.1 * k, (sea - 0.06) * k, 0.25 * k, (sea - 0.11) * k)
    p.vertex(0.22 * k, (sea + 0.07) * k)
    p.quadraticVertex(-0.2 * k, (sea + 0.11) * k, -0.37 * k, (sea + 0.05) * k)
    p.endShape(p.CLOSE)

    // The cloth, from the yard down to the roll; snapped taut, a ripple runs up its leeches and dies.
    const head = YARD_Y + 0.02
    const snap = t - T_SNAP
    const wob = (y: number) => (snap <= 0 ? 0 : 0.014 * Math.exp(-snap * 5) * Math.sin((mid - y) * 9 - snap * 26) * clamp((y - head) / 0.4))
    const n = 18
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const y = head + ((mid - head) * i) / n
      p.vertex((CLOTH[0] + wob(y)) * k, y * k)
    }
    for (let i = n; i >= 0; i--) {
      const y = head + ((mid - head) * i) / n
      p.vertex((CLOTH[1] + wob(y)) * k, y * k)
    }
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.6)
    for (const down of SEAMS) {
      const y = head + down
      if (y < top - 0.02) p.line((CLOTH[0] + wob(y)) * k, y * k, (CLOTH[1] + wob(y)) * k, y * k)
    }

    // The gasket: round the roll and up to the yard until it slips, and swinging from the yard after.
    outline(p, ink, weight * 0.9)
    if (since < 0) {
      p.line(GASKET_X * k, head * k, GASKET_X * k, (mid + r) * k)
    } else {
      const a = 0.55 * Math.exp(-since * 2.2) * Math.sin(since * 8)
      const len = 0.4
      p.noFill()
      p.beginShape()
      p.vertex(GASKET_X * k, head * k)
      p.quadraticVertex((GASKET_X + Math.sin(a) * len * 0.3) * k, (head + len * 0.55) * k, (GASKET_X + Math.sin(a) * len) * k, (head + Math.cos(a) * len) * k)
      p.endShape()
    }

    // The roll on its batten, a knob at each end.
    solid(p, ink, weight, s.color)
    p.rect(((BAR[0] + BAR[1]) / 2) * k, mid * k, (BAR[1] - BAR[0]) * k, 2 * r * k, r * k)
    if (since < 0) {
      outline(p, ink, weight * 0.9)
      p.line(GASKET_X * k, top * k, GASKET_X * k, (mid + r) * k)
    }
    solid(p, ink, weight, ink)
    for (const x of BAR) p.circle(x * k, mid * k, 0.04 * k)

    // The sea, in front of the hull.
    water(p, k, ink, weight, -0.5, x1, sea)
  },
})
