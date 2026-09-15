import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { piling, splash, water } from './sea'

/**
 * A bell buoy in a gap in the pier. The deck stops; a buoy floats in the
 * water between, its flat top a hair above deck height, a bell in a cage
 * on it and a chain down to a sinker. It is already rocking on the swell
 * and leans to meet the ball: the near side of its deck comes down level
 * with the pier as the ball arrives. The ball rolls on and climbs, slowing,
 * to the middle; its weight past the middle rocks the buoy over, the bell
 * clangs against its cage, and the far side going down runs the ball off
 * onto the pier faster than it came. The buoy rocks itself still after,
 * ringing down.
 *
 * The ball rides the deck: its lane is sampled from the same tilt the buoy
 * is drawn with, so it sits on the deck at every angle instead of floating
 * over a deck that has dipped away from under it.
 */
const GAP = 0.28
/** The float's half-width, and where its deck lies when level: above the pier by what a tilted end comes down. */
const DECK = 0.24
const DECK_Y = FLOOR - 0.04
/** The float's centre, which it rocks about. */
const CY = 0.3
const CAGE_H = -0.34
/** The rock: this far each way. */
const TILT = 0.16
/** When the ball reaches the pier's end. */
const T0 = (0.5 - GAP) / ROLL
/** The buoy leans to meet the ball, starting this long before it arrives. */
const LEAN = 0.3
/** Climbing the near side, slowing to a crawl at the crest. */
const V_CREST = 1.0
const CLIMB = DECK / ((ROLL + V_CREST) / 2)
const FIRE = T0 + CLIMB
/** Running down the far side, to this pace at the pier; the rock-over takes exactly as long. */
const V_OFF = 3.4
const RUN = DECK / ((V_CREST + V_OFF) / 2)
const T1 = FIRE + RUN
/** The bell meets the cage this far into the rock-over. */
const CLANG_AT = RUN * 0.7

/** The buoy's tilt at `t`: leaning to the ball, held while it climbs, rocked over from the fire, ringing down after. */
function tiltAt(t: number): number {
  if (t < T0 - LEAN) return 0
  if (t < T0) return -TILT * easeInOutSine(over(t, T0 - LEAN, T0))
  if (t < FIRE) return -TILT
  if (t < T1) return -TILT + 2 * TILT * easeInOutSine(over(t, FIRE, T1))
  const s = t - T1
  return TILT * Math.cos(s * 7) * Math.exp(-s * 1.6)
}

/** Where the ball's contact point is along the deck at `t`: slowing up the near side, quickening down the far. */
function alongAt(t: number): number {
  if (t < FIRE) {
    const f = over(t, T0, FIRE)
    return -DECK + (ROLL * f + ((V_CREST - ROLL) * f * f) / 2) * CLIMB
  }
  const f = over(t, FIRE, T1)
  return (V_CREST * f + ((V_OFF - V_CREST) * f * f) / 2) * RUN
}

/** The ball's centre with its contact point `u` along the deck and the buoy tilted `a`: a radius off the deck, square to it. */
function ballOn(u: number, a: number): Pt {
  const d = DECK_Y - CY
  return [u * Math.cos(a) - d * Math.sin(a) + R * Math.sin(a), CY + u * Math.sin(a) + d * Math.cos(a) - R * Math.cos(a)]
}

const RIDE = trace((t) => ballOn(alongAt(t), tiltAt(t)), T0, T1, 24)
const LANE: Lane = {
  segs: [roll([-0.5, 0], RIDE[0].from, ROLL), ...RIDE, ramp(RIDE[RIDE.length - 1].to, [0.5, 0], V_OFF, ROLL)],
  fire: FIRE,
}

export const buoy = definePiece<{ color: string }>({
  name: 'buoy',
  weight: 1,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const tilt = tiltAt(t)
    const clang = since < CLANG_AT ? 0 : Math.exp(-(since - CLANG_AT) * 3)

    // The pier either side, on pilings, and the water in the gap.
    water(p, k, ink, weight, -0.5, 0.5)
    rail(p, k, ink, weight, -0.5, -GAP)
    rail(p, k, ink, weight, GAP, 0.5)
    piling(p, k, ink, weight, -GAP - 0.05)
    piling(p, k, ink, weight, GAP + 0.05)
    // The chain to the sinker on the seabed: not part of the rocking.
    outline(p, ink, weight * 0.9)
    for (let y = CY + 0.1; y < 0.48; y += 0.04) p.line(0, y * k, 0.01 * k, (y + 0.025) * k)
    solid(p, ink, weight, ink)
    p.rect(0, 0.485 * k, 0.1 * k, 0.03 * k)

    p.push()
    p.translate(0, CY * k)
    p.rotate(tilt)
    p.translate(0, -CY * k)
    // The float: a deck on a tapering hull, with a stripe.
    solid(p, ink, weight, s.color)
    p.quad(-DECK * 0.92 * k, (DECK_Y + 0.06) * k, DECK * 0.92 * k, (DECK_Y + 0.06) * k, 0.1 * k, (CY + 0.14) * k, -0.1 * k, (CY + 0.14) * k)
    p.rect(0, (DECK_Y + 0.03) * k, DECK * 2 * k, 0.06 * k)
    p.fill(ink)
    p.noStroke()
    p.quad(-0.17 * k, 0.27 * k, 0.17 * k, 0.27 * k, 0.15 * k, 0.31 * k, -0.15 * k, 0.31 * k)
    // The cage: two posts and a crossbar, the bell hung under it, clear of the ball's top.
    outline(p, ink, weight)
    for (const x of [-0.09, 0.09]) p.line(x * k, DECK_Y * k, x * k, CAGE_H * k)
    p.line(-0.11 * k, CAGE_H * k, 0.11 * k, CAGE_H * k)
    p.line(0, CAGE_H * k, 0, (CAGE_H + 0.05) * k)
    // The bell swings against the tilt and knocks the cage.
    p.push()
    p.translate(0, (CAGE_H + 0.05) * k)
    p.rotate(-tilt * 1.6)
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-0.06 * k, 0.12 * k)
    p.bezierVertex(-0.06 * k, 0, -0.03 * k, 0, 0, 0)
    p.bezierVertex(0.03 * k, 0, 0.06 * k, 0, 0.06 * k, 0.12 * k)
    p.endShape(p.CLOSE)
    p.line(-0.06 * k, 0.12 * k, 0.06 * k, 0.12 * k)
    p.pop()
    p.pop()

    // The clang: rings off the cage, and a ripple where the far side dipped.
    if (clang > 0.05) {
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * clang)
      for (let i = 1; i <= 2; i++) p.circle(0, (CAGE_H + 0.1) * k, (0.24 + i * 0.16 + (1 - clang) * 0.3) * k)
      p.pop()
    }
    splash(p, k, s.color, weight, 0.2, CY + 0.06, over(since, CLANG_AT, CLANG_AT + 0.45), 0.6)
  },
})
