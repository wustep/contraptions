import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, piling, seaColor, seabed, splash, water } from './sea'

/**
 * A slipway. A new hull stands level on a wedge of a cradle at the head of
 * the ways, stern to the deck's end, and one chock under the cradle's foot
 * is all that holds it there. The ball rolls over the transom into the
 * cockpit and fetches up against the cuddy; that thump jumps the chock
 * out — it falls in the sea — and cradle, hull and ball go down the ways,
 * gathering pace. At the foot the cradle meets its stop and the hull does
 * not: it runs on off the cradle's top, noses over and belly-flops into
 * the sea a floor below in a sheet of spray, and the slap throws the ball
 * out over the bow onto the pier. The hull carries its way to the pier
 * and lies there, nodding; the cradle stays at the foot of the ways.
 *
 * The ball rides the hull: from the transom to the splash its lane is
 * sampled from the one motion the hull is drawn with.
 */
const WEST = -0.3
const PIER = 1.27
/** The hull in its own frame: x from the transom forward, sheer and keel as a boat afloat on the cell's own water; it pitches about PIVOT, on its keel. */
const LEN = 0.5
const SHEER = FLOOR
const KEEL = 0.44
const PIVOT: Pt = [LEN / 2, KEEL]
const CUDDY = 0.3
const SEAT: Pt = [CUDDY - R - 0.005, 0.05]
/** The ways: their slope, and where the hull's pivot stands at their head. */
const SLOPE = (50 * Math.PI) / 180
const HEAD: Pt = [WEST + 0.03 + LEN / 2, KEEL]
/** The cradle: a wedge with a level top this long, its sole on the ways; it stops with its toe on the bed of the sea. */
const TOP = 0.3
const WEDGE = TOP * Math.tan(SLOPE)
const SLIDE = (1.5 - WEDGE - KEEL) / Math.sin(SLOPE)
const AFLOAT = 1 + KEEL

/** Over the transom into the cockpit, slowing all the way to the cuddy. */
const T_EDGE = (WEST + 0.5) / ROLL
const IN = (2 * (SEAT[0] + 0.03)) / ROLL
const T_THUMP = T_EDGE + IN
const FIRE = T_THUMP
/** The launch: a creak; the run down the ways; off the cradle's top; the fall; the way carried to the pier. */
const CREAK = 0.15
const T_GO = FIRE + CREAK
const RUN = 0.85
const T_STOP = T_GO + RUN
const V_STOP = ((2 * SLIDE) / RUN) * Math.cos(SLOPE)
const OFF = 0.15
const T_TIP = T_STOP + OFF / V_STOP
const FALL = Math.sqrt((2 * (AFLOAT - KEEL - SLIDE * Math.sin(SLOPE))) / 35)
const T_FLOP = T_TIP + FALL
const X_STOP = HEAD[0] + SLIDE * Math.cos(SLOPE)
const X_FLOP = X_STOP + OFF + V_STOP * 0.85 * FALL
const X_END = PIER - 0.03 - LEN / 2
/** The slap throws the ball out: this long in the air, this high over its chord, to here on the pier. */
const FLIGHT = 0.3
const LOFT = 0.2
const LAND: Pt = [PIER + 0.07, 1]

/** The hull's pose: its pivot, and how far bow-down it is. */
function poseAt(t: number): { x: number; y: number; a: number } {
  // A shiver through the cradle at the thump, while the chock is going.
  if (t < T_GO) return { x: HEAD[0], y: HEAD[1] + (t > FIRE ? 0.006 * Math.sin((t - FIRE) * 70) * (1 - over(t, FIRE, T_GO)) : 0), a: 0 }
  if (t < T_STOP) {
    const s = SLIDE * Math.pow((t - T_GO) / RUN, 2)
    return { x: HEAD[0] + s * Math.cos(SLOPE), y: HEAD[1] + s * Math.sin(SLOPE), a: 0 }
  }
  const yStop = KEEL + SLIDE * Math.sin(SLOPE)
  if (t < T_TIP) return { x: X_STOP + V_STOP * (t - T_STOP), y: yStop, a: 0.1 * over(t, T_STOP, T_TIP) }
  if (t < T_FLOP) {
    const f = (t - T_TIP) / FALL
    return { x: X_STOP + OFF + V_STOP * 0.85 * (t - T_TIP), y: yStop + (AFLOAT - yStop) * f * f, a: 0.1 + 0.22 * Math.sin(Math.PI * f) * (1 - f * 0.5) - 0.1 * f }
  }
  const s = t - T_FLOP
  const wet = Math.exp(-s * 3)
  const e = t - T_END
  return {
    x: X_END - (X_END - X_FLOP) * Math.exp(-s * CARRY) - (e < 0 ? 0 : 0.015 * Math.exp(-e * 5) * Math.abs(Math.sin(e * 9))),
    y: AFLOAT + 0.05 * wet * Math.sin(s * 8) + 0.005 * (1 - wet) * Math.sin(t * 2.2),
    a: 0.11 * wet * Math.sin(s * 9 + 0.6) - 0.11 * Math.sin(0.6) * wet * Math.exp(-s * 20),
  }
}
/** How fast the sea takes the hull's way off, and when it is up to the pier. */
const CARRY = (V_STOP * 0.7) / (X_END - X_FLOP)
const T_END = T_FLOP + 3 / CARRY

/** A point of the hull's own frame, in the cell's. */
function afloat(local: Pt, t: number): Pt {
  const { x, y, a } = poseAt(t)
  const dx = local[0] - PIVOT[0]
  const dy = local[1] - PIVOT[1]
  return [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)]
}
/** The ball in the hull's frame: over the transom, down into the cockpit, and at the cuddy for the launch. */
function aboardAt(t: number): Pt {
  if (t >= T_THUMP) return SEAT
  const tau = t - T_EDGE
  const x = -0.03 + ROLL * tau - (ROLL * tau * tau) / (2 * IN)
  const f = over(x, 0, 0.09)
  return [x, SEAT[1] * f * f * (3 - 2 * f)]
}
const ballAt = (t: number): Pt => afloat(aboardAt(t), t)

const RIDE = [...trace(ballAt, T_EDGE, T_THUMP, 8), ...trace(ballAt, T_THUMP, T_GO, 3), ...trace(ballAt, T_GO, T_STOP, 30), ...trace(ballAt, T_STOP, T_FLOP, 12)]
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], RIDE[0].from, ROLL),
    ...RIDE,
    fly(RIDE[RIDE.length - 1].to, LAND, FLIGHT, LOFT),
    fly(LAND, [LAND[0] + 0.06, 1], 0.05, 0.012),
    ramp([LAND[0] + 0.06, 1], [1.5, 1], 1.8, ROLL),
  ],
  fire: FIRE,
}

/** The cradle goes with the hull to its stop, and stays there. */
const cradleAt = (t: number): Pt => {
  const pose = poseAt(Math.min(t, T_STOP))
  return [pose.x, pose.y]
}

export const slipway = definePiece<{ color: string }>({
  name: 'slipway',
  weight: 0.9,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The deck the ball comes off, on a piling that goes down to the bed of the sea a floor below; the pier down there.
    rail(p, k, ink, weight, -0.5, WEST)
    piling(p, k, ink, weight, WEST - 0.08, FLOOR, 1.5)
    seabed(p, k, ink, weight, WEST - 0.12, 1.5, 1.5)
    rail(p, k, ink, weight, PIER, 1.5, 1 + FLOOR)
    piling(p, k, ink, weight, PIER + 0.07, 1 + FLOOR, 1.5)

    // The ways: a rail down the slope from under the hull's stern to the bed of the sea, on trestles, with a stop at its foot.
    const heel: Pt = [HEAD[0] - TOP / 2, KEEL]
    const toe: Pt = [X_STOP + TOP / 2, 1.5]
    const railAt = (x: number) => heel[1] + (x - heel[0]) * Math.tan(SLOPE)
    outline(p, ink, weight * 1.5)
    p.line((heel[0] - 0.06) * k, railAt(heel[0] - 0.06) * k, toe[0] * k, toe[1] * k)
    outline(p, ink, weight * 0.8)
    for (const x of [heel[0] + 0.02, heel[0] + 0.3, heel[0] + 0.58]) {
      p.line(x * k, railAt(x) * k, x * k, 1.5 * k)
      p.line((x - 0.05) * k, 1.5 * k, (x + 0.05) * k, 1.5 * k)
    }
    p.line((heel[0] + 0.02) * k, (railAt(heel[0] + 0.02) + 0.42) * k, (heel[0] + 0.3) * k, (railAt(heel[0] + 0.3) + 0.04) * k)
    solid(p, ink, weight, ink)
    p.rect((toe[0] + 0.02) * k, 1.46 * k, 0.05 * k, 0.08 * k)

    // The cradle: a wedge, level on top for the keel, its sole on the ways on two wheels.
    const [cx, cy] = cradleAt(t)
    const a: Pt = [cx - TOP / 2, cy]
    const b: Pt = [cx + TOP / 2, cy]
    const c: Pt = [cx + TOP / 2, cy + WEDGE]
    solid(p, ink, weight, ink)
    p.triangle(a[0] * k, a[1] * k, b[0] * k, b[1] * k, c[0] * k, c[1] * k)
    // Two keel blocks on its top, in the colour.
    solid(p, ink, weight * 0.8, s.color)
    for (const f of [0.22, 0.78]) p.rect((a[0] + TOP * f) * k, (cy - 0.0) * k, 0.07 * k, 0.035 * k, 0.006 * k)
    solid(p, ink, weight * 0.8, bg)
    for (const f of [0.22, 0.85]) p.circle((a[0] + (c[0] - a[0]) * f) * k, (a[1] + (c[1] - a[1]) * f) * k, 0.05 * k)

    // The chock under the cradle's toe: all that holds it. The thump jumps it out, and it falls in the sea.
    const w0: Pt = [HEAD[0] + TOP / 2 + 0.035, KEEL + WEDGE + 0.035 * Math.tan(SLOPE) - 0.035]
    const fell = Math.max(0, since)
    const wx = w0[0] + 0.55 * fell
    const wy = w0[1] - 1.3 * fell + 17 * fell * fell
    const plop = (1.3 + Math.sqrt(1.69 + 68 * (1 + WATER - w0[1]))) / 34
    if (fell < plop) {
      p.push()
      p.translate(wx * k, wy * k)
      p.rotate(SLOPE + fell * 11)
      solid(p, ink, weight, s.color)
      p.triangle(-0.05 * k, 0.03 * k, 0.05 * k, 0.03 * k, 0.05 * k, -0.05 * k)
      p.pop()
    }
    splash(p, k, s.color, weight, w0[0] + 0.55 * plop, 1 + WATER, over(since, plop, plop + 0.45), 0.6)
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    // The hull stands between the viewer and the ball, which sits down in its cockpit.
    const pose = poseAt(t)
    p.push()
    p.translate(pose.x * k, pose.y * k)
    p.rotate(pose.a)
    p.translate(-PIVOT[0] * k, -PIVOT[1] * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, SHEER * k)
    p.vertex(CUDDY * k, SHEER * k)
    p.vertex((CUDDY + 0.015) * k, (SHEER - 0.09) * k)
    p.vertex((CUDDY + 0.12) * k, (SHEER - 0.09) * k)
    p.vertex((CUDDY + 0.15) * k, (SHEER - 0.005) * k)
    p.vertex(LEN * k, (SHEER - 0.015) * k)
    p.bezierVertex((LEN - 0.04) * k, (SHEER + 0.14) * k, (LEN - 0.12) * k, KEEL * k, (LEN - 0.22) * k, KEEL * k)
    p.vertex(0.05 * k, KEEL * k)
    p.endShape(p.CLOSE)
    // New paint: a boot top along the waterline, the rubbing strake, and a port in the cuddy.
    p.noStroke()
    p.fill(bg)
    p.quad(0.035 * k, (WATER - 0.035) * k, (LEN - 0.075) * k, (WATER - 0.035) * k, (LEN - 0.1) * k, (WATER + 0.005) * k, 0.04 * k, (WATER + 0.005) * k)
    outline(p, ink, weight * 0.8)
    p.line(0.01 * k, (SHEER + 0.06) * k, (LEN - 0.02) * k, (SHEER + 0.05) * k)
    solid(p, ink, weight * 0.7, bg)
    p.circle((CUDDY + 0.07) * k, (SHEER - 0.04) * k, 0.04 * k)
    p.pop()

    // The sea in front of it all, and the belly-flop: a sheet of spray the length of the hull.
    water(p, k, ink, weight, WEST - 0.12, 1.5, 1 + WATER)
    const s1 = t - T_FLOP
    splash(p, k, s.color, weight, X_FLOP + 0.22, 1 + WATER, over(s1, 0, 0.6), 2)
    splash(p, k, s.color, weight, X_FLOP - 0.2, 1 + WATER, over(s1, 0.03, 0.6), 1.5)
    splash(p, k, s.color, weight, X_FLOP, 1 + WATER, over(s1, 0.1, 0.75), 1.2)
    splash(p, k, s.color, weight, PIER - 0.05, 1 + WATER, over(t, T_END, T_END + 0.4), 0.5)
  },
})
