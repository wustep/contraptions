import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, cleat, piling, rope, seaWater, splash, water } from './sea'

/**
 * A sailing dinghy, moored stern-to at the deck's end with her painter
 * looped over a cleat, sail shaking. The ball rolls over the transom into
 * the stern sheets and fetches up against the mast thwart; the shove
 * carries her forward, the painter comes taut and its loop slips the
 * cleat; the sail fills and she sails across two cells of open water, bow
 * up, a curl of water at her stem and her wake behind. She meets the far
 * pier's fender with way still on her; the jolt pitches the ball up onto
 * the foredeck and it rolls off over the bow onto the deck. The sail
 * shakes again, and she lies there nodding at the fender.
 *
 * The ball rides the boat: from the transom to the bow its lane is sampled
 * from the one motion she is drawn with — her run, her bob and her pitch.
 */
/** The piers: where the near deck stops and the far one starts. */
const WEST = -0.1
const EAST = 1.98
/** The cleat under the deck's edge that her painter is looped over. */
const CLEAT = WEST - 0.1
/** The boat in her own frame: x from the transom forward, y as the world's; she pitches about PIVOT. */
const LEN = 0.68
const SHEER = FLOOR
const KEEL = 0.44
const PIVOT: Pt = [0.3, 0.33]
const MAST = 0.43
const SEAT: Pt = [0.27, 0.05]
const FOREDECK = 0.5
/** Where her transom lies when moored, and how far she sails: to the fender, less what it gives. */
const MOORED = WEST + 0.04
const SHOVE = 0.03
const RUN = EAST - 0.035 - LEN - MOORED

/** Over the transom, down the stern sheets to the thwart, slowing all the way. */
const T_ABOARD = (MOORED + 0.5) / ROLL
const IN = (2 * SEAT[0]) / ROLL
const T_SEAT = T_ABOARD + IN
const SLIP = 0.12
const FIRE = T_SEAT + SLIP
const SAIL = 1.7
const T_BUMP = FIRE + SAIL
/** The jolt throws the ball onto the foredeck; it rolls off over the bow. */
const HOP = 0.16
const V_OFF = 1.6
const T_OFF = T_BUMP + HOP + (LEN - FOREDECK) / V_OFF

/** How far she has come from her mooring: shoved by the ball, then sailing — a soft start, and way still on at the fender — then nodding at it. */
function runAt(t: number): number {
  const shove = SHOVE * easeOutCubic(over(t, T_ABOARD, T_ABOARD + 0.3))
  if (t < FIRE) return shove
  if (t < T_BUMP) {
    const r = (t - FIRE) / SAIL
    return SHOVE + (RUN - SHOVE) * (1.6 * r * r - 0.6 * r * r * r)
  }
  const s = t - T_BUMP
  return RUN - 0.035 * Math.exp(-s * 4) * Math.abs(Math.sin(s * 8))
}
/** Bow up, in radians: down by the stern as the ball comes aboard, up as she sails, nodding at the bump. */
function pitchAt(t: number): number {
  const aboard = 0.05 * over(t, T_ABOARD, T_ABOARD + 0.08) * (1 - over(t, T_ABOARD + 0.08, T_SEAT + 0.2))
  const way = 0.035 * easeInOutSine(over(t, FIRE, FIRE + 0.5)) * (1 - over(t, T_BUMP - 0.05, T_BUMP))
  const s = t - T_BUMP
  const nod = s < 0 ? 0 : -0.09 * Math.exp(-s * 3.5) * Math.cos(s * 9)
  return aboard + way + nod
}
const bobAt = (t: number) => 0.006 * Math.sin(t * 2.2) + 0.012 * over(t, T_ABOARD, T_ABOARD + 0.1) * (1 - over(t, T_OFF, T_OFF + 0.3))

/** A point of the boat's own frame, in the cell's. */
function afloat(local: Pt, t: number): Pt {
  const r = -pitchAt(t)
  const dx = local[0] - PIVOT[0]
  const dy = local[1] - PIVOT[1]
  return [MOORED + runAt(t) + PIVOT[0] + dx * Math.cos(r) - dy * Math.sin(r), PIVOT[1] + bobAt(t) + dx * Math.sin(r) + dy * Math.cos(r)]
}

/** The ball in the boat's frame: in over the transom, at the thwart for the passage, pitched onto the foredeck, off over the bow. */
function aboardAt(t: number): Pt {
  if (t < T_SEAT) {
    const tau = t - T_ABOARD
    return [ROLL * tau - (ROLL * tau * tau) / (2 * IN), SEAT[1] * Math.min(1, Math.pow(tau / 0.07, 2))]
  }
  if (t < T_BUMP) return SEAT
  if (t < T_BUMP + HOP) {
    const f = (t - T_BUMP) / HOP
    return [lerp(SEAT[0], FOREDECK, f), lerp(SEAT[1], 0, f) - 0.07 * 4 * f * (1 - f)]
  }
  return [FOREDECK + V_OFF * (t - T_BUMP - HOP), 0]
}
const ballAt = (t: number): Pt => afloat(aboardAt(t), t)

const RIDE = [...trace(ballAt, T_ABOARD, T_SEAT, 8), ...trace(ballAt, T_SEAT, T_BUMP, 40), ...trace(ballAt, T_BUMP, T_OFF, 14)]
const OFF = RIDE[RIDE.length - 1].to
const LANE: Lane = {
  segs: [roll([-0.5, 0], RIDE[0].from, ROLL), ...RIDE, ramp(OFF, [EAST + 0.12, 0], V_OFF, 2.1), ramp([EAST + 0.12, 0], [2.5, 0], 2.1, ROLL)],
  fire: FIRE,
}

/** How full the sail is: shaking at her mooring, drawing on passage, shaking again at the fender. */
const fullAt = (t: number) => easeInOutSine(over(t, FIRE, FIRE + 0.35)) * (1 - easeInOutSine(over(t, T_BUMP, T_BUMP + 0.25)))

export const dinghy = definePiece<{ color: string }>({
  name: 'dinghy',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const full = fullAt(t)
    const shake = (1 - full) * Math.sin(t * 11)
    const bump = t - T_BUMP

    // The piers, the cleat her painter is on, and the fender she fetches up against.
    rail(p, k, ink, weight, -0.5, WEST)
    rail(p, k, ink, weight, EAST, 2.5)
    piling(p, k, ink, weight, WEST - 0.26)
    piling(p, k, ink, weight, EAST + 0.05)
    cleat(p, k, ink, weight, s.color, CLEAT)
    const squash = bump < 0 ? 0 : 0.5 * Math.exp(-bump * 4) * Math.abs(Math.cos(bump * 8))
    solid(p, ink, weight, s.color)
    p.ellipse((EAST - 0.015 + 0.01 * squash) * k, (FLOOR + 0.1) * k, (0.06 - 0.025 * squash) * k, (0.14 + 0.03 * squash) * k)

    // The painter: from the ring on her transom to its loop on the cleat, tautening as she is shoved; then trailing astern.
    const ring = afloat([0, 0.21], t)
    const slipped = since < 0 ? 0 : easeOutCubic(over(since, 0, 0.25))
    const end: Pt = [lerp(CLEAT, ring[0] - 0.2, slipped), lerp(FLOOR + 0.09, WATER + 0.02, slipped)]
    rope(p, k, ink, weight, end[0], end[1], ring[0], ring[1], since < 0 ? 0.07 * (1 - over(t, T_ABOARD, FIRE)) : 0.05)
    if (since > 0) splash(p, k, seaWater(theme), weight, CLEAT + 0.06, WATER, over(since, 0.12, 0.6), 0.5)

    // The rig, in her frame: the mast, the boom kicked up over the stern sheets, the sail and the pennant.
    const [ox, oy] = afloat(PIVOT, t)
    p.push()
    p.translate(ox * k, oy * k)
    p.rotate(-pitchAt(t))
    p.translate(-PIVOT[0] * k, -PIVOT[1] * k)
    const head: Pt = [MAST, -0.44]
    const tack: Pt = [MAST, -0.13]
    const clew: Pt = [-0.04, -0.17 - 0.025 * full + 0.012 * shake]
    outline(p, ink, weight * 1.2)
    p.line(MAST * k, SHEER * k, MAST * k, (head[1] - 0.03) * k)
    // The sail: its leech bellied out when she is drawing, hollow and shaking when she is not.
    const belly = -0.025 + 0.085 * full
    const lx = (head[0] + clew[0]) / 2 - belly * 0.5 + 0.02 * shake
    const ly = (head[1] + clew[1]) / 2 - belly + 0.012 * shake
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(head[0] * k, head[1] * k)
    p.quadraticVertex(lx * k, ly * k, clew[0] * k, clew[1] * k)
    p.quadraticVertex(((tack[0] + clew[0]) / 2) * k, ((tack[1] + clew[1]) / 2 + 0.02 * full) * k, tack[0] * k, tack[1] * k)
    p.endShape(p.CLOSE)
    // A band across it in her colour.
    p.noStroke()
    p.fill(s.color)
    const band = (f: number): Pt => [lerp(MAST, lerp(head[0], clew[0], f) - belly * 0.5 * 4 * f * (1 - f) * 0.5, 0.94), lerp(head[1], clew[1], f)]
    const b0 = band(0.5)
    const b1 = band(0.68)
    p.quad((MAST - 0.015) * k, b0[1] * k, b0[0] * k, b0[1] * k, b1[0] * k, b1[1] * k, (MAST - 0.015) * k, b1[1] * k)
    outline(p, ink, weight)
    p.line(tack[0] * k, tack[1] * k, clew[0] * k, clew[1] * k)
    // The pennant at the masthead: there is always a breeze.
    solid(p, ink, weight * 0.8, s.color)
    const py = head[1] - 0.03
    p.triangle(MAST * k, (py - 0.025) * k, MAST * k, (py + 0.025) * k, (MAST + 0.11) * k, (py + 0.012 * Math.sin(t * 9)) * k)
    p.pop()
  },
  over: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    // The hull stands between the viewer and the ball, which sits down inside it.
    const [ox, oy] = afloat(PIVOT, t)
    p.push()
    p.translate(ox * k, oy * k)
    p.rotate(-pitchAt(t))
    p.translate(-PIVOT[0] * k, -PIVOT[1] * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, SHEER * k)
    p.vertex(LEN * k, (SHEER - 0.015) * k)
    p.bezierVertex((LEN - 0.05) * k, (SHEER + 0.14) * k, (LEN - 0.14) * k, KEEL * k, (LEN - 0.26) * k, KEEL * k)
    p.vertex(0.06 * k, KEEL * k)
    p.endShape(p.CLOSE)
    // The rubbing strake, and the ring for the painter.
    outline(p, ink, weight * 0.8)
    p.line(0.01 * k, (SHEER + 0.06) * k, (LEN - 0.02) * k, (SHEER + 0.05) * k)
    solid(p, ink, weight * 0.8, bg)
    p.circle(0.0, (SHEER + 0.085) * k, 0.035 * k)
    p.pop()

    // The water in front of her, the curl at her stem and the wake astern while she has way on.
    water(p, k, ink, weight, -0.5, 2.5)
    const way = since < 0 || t > T_BUMP ? 0 : Math.sin(Math.PI * Math.pow(over(t, FIRE, T_BUMP), 0.8))
    if (way > 0.05) {
      const bow = afloat([LEN - 0.03, WATER - 0.01], t)
      const stern = afloat([0, WATER], t)
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * 1.2)
      p.arc((bow[0] + 0.03) * k, WATER * k, 0.1 * way * k, 0.12 * way * k, Math.PI * 1.05, Math.PI * 1.75)
      p.strokeWeight(weight * 0.9)
      for (let i = 1; i <= 3; i++) {
        const x = stern[0] - i * 0.13 * way
        const w = (0.05 + 0.03 * i) * way
        p.arc(x * k, (WATER + 0.01) * k, w * 2 * k, 0.04 * k, Math.PI * 1.1, Math.PI * 1.9)
      }
      p.pop()
    }
    // The bump: water thrown up between her stem and the fender.
    splash(p, k, seaWater(theme), weight, EAST - 0.06, WATER, over(t, T_BUMP, T_BUMP + 0.45), 0.6)
  },
})
