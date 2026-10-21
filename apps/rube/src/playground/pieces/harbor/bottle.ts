import { outline, solid } from '../../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, splash, water } from '../../../pieces/harbor/sea'

/**
 * A bottle. The deck ends in a brow down to the water's edge, and a big
 * bottle floats there with its mouth to the foot of the brow, its glass
 * the opaque paper of everything else with one line of light along it.
 * The ball runs down the brow into the mouth and is gone; the shove sends
 * the bottle off foot first across the open water, a wake behind it. Its
 * foot fetches up against the far pier's piling with way still on, and the
 * way takes it up: the bottle vaults over the pier's corner, mouth over
 * foot, and comes to lie across it on its shoulder with its lip on the
 * deck, and the ball pours out of the neck onto the deck and rolls on.
 * Empty and light, the bottle slides back off the corner into the sea,
 * foot first, with a splash, and lies there mouth to the pier, nodding.
 *
 * The vault is one turn about the deck's corner: the corner stays on the
 * bottle's skin the whole way over, first on the rim of the foot, then
 * sliding along the side to the shoulder, so nothing floats and nothing
 * goes through the deck.
 *
 * The ball is inside from the brow to the pour: its hidden lane is sampled
 * from the bottle's own drift and vault, the one motion it is drawn with,
 * so it comes out where the mouth is.
 */
/** The brow: from the deck's end down to the water's edge, where the mouth is. */
const BROW0 = -0.45
const BROW1 = -0.1
/** The bottle floats with its axis here, mouth to the brow's foot. */
const AXIS = 0.275
const MOUTH0 = -0.05
/** The far pier, and the piling at its edge the foot fetches up on. */
const EAST = 1.1
/** The bottle in its own frame: the foot at the origin, the axis toward -x to the mouth. */
const LEN = 0.6
const BODY = 0.31
const SHOULDER = 0.09
const BW = 0.21
const NW = 0.14
/** Where the ball lies in the body while she drifts, from the foot. */
const A_REST = 0.26
/** The deck's corner the foot catches on, and how far up the foot's face it catches: the bottle vaults about that point. */
const CORNER: Pt = [EAST, FLOOR]
const CATCH = AXIS - FLOOR
/**
 * Where the corner is on the bottle, in its own frame, when it lies over: on the shoulder. And how far past level
 * it goes then: until the lip comes down on the deck, the mouth a little lower than the foot.
 */
const SHOULDER_AT: Pt = [-(BODY + SHOULDER / 2), -(BW + NW) / 2]
const TH_END = Math.PI + Math.atan2(-SHOULDER_AT[1] - (NW + 0.015), LEN + SHOULDER_AT[0])

/** Down the brow, gathering pace, into the mouth. */
const V_BROW = 3.4
const T_BROW = (BROW0 + 0.5) / ROLL
const BROW_LEN = Math.hypot(BROW1 - BROW0, AXIS)
const T_IN = T_BROW + BROW_LEN / ((ROLL + V_BROW) / 2)
const T_GONE = T_IN + 0.04
/** The drift, foot first, to the far pier; the vault over its corner; the pour; and the fall back. */
const DRIFT = 0.9
const FIRE = T_GONE + DRIFT
const VAULT = 0.55
const T_OVER = FIRE + VAULT
const POUR = 0.22
const T_OUT = T_OVER + POUR
const T_FALL = T_OUT + 0.12
const FALL = 0.35
const T_AFLOAT = T_FALL + FALL
/** Where the foot is: afloat by the brow, at the pier, and afloat again by the pier. */
const F0: Pt = [MOUTH0 + LEN, AXIS]
const F1: Pt = [EAST - 0.03, AXIS]
const F2: Pt = [EAST - 0.03 - LEN, AXIS]

/** The foot, for a bottle at angle `th` touching the corner at `at` in its own frame. */
function footOn(th: number, at: Pt): Pt {
  const c = Math.cos(th)
  const s = Math.sin(th)
  return [CORNER[0] - (at[0] * c - at[1] * s), CORNER[1] - (at[0] * s + at[1] * c)]
}
/** Where the corner is on the bottle at angle `th`: on the foot's rim until it stands on end, then sliding to the shoulder. */
function contactAt(th: number): Pt {
  const u = easeInOutSine(Math.max(0, (th - Math.PI / 2) / (TH_END - Math.PI / 2)))
  return [lerp(0, SHOULDER_AT[0], u), lerp(-CATCH, SHOULDER_AT[1], u)]
}
const F_HUNG = footOn(TH_END, SHOULDER_AT)

/** The bottle's pose: its foot's axis point, and the angle of the axis from foot to mouth, from due west. */
function poseAt(t: number): { f: Pt; th: number } {
  const bob = 0.008 * Math.sin(t * 2.2)
  if (t < FIRE) {
    // Nudged as the ball comes in; shoved off, fast at first, and still moving at the pier.
    const u = over(t, T_GONE, FIRE)
    const x = F0[0] + (F1[0] - F0[0]) * (1.35 * u - 0.35 * u * u)
    const dip = 0.03 * Math.sin(Math.PI * over(t, T_IN, T_IN + 0.3))
    return { f: [x, AXIS + bob + dip], th: 0.03 * Math.sin(t * 2.2) * (1 - u) - 0.1 * dip }
  }
  if (t < T_OVER) {
    // Up on end about the deck's corner, the foot's rim caught on it; then over the top and down onto the far side.
    const th = TH_END * easeInOutSine(over(t, FIRE, T_OVER))
    return { f: footOn(th, contactAt(th)), th }
  }
  if (t < T_FALL) {
    // Rocking on the shoulder as it lands, about the same corner.
    const s = t - T_OVER
    const th = TH_END + 0.04 * Math.exp(-s * 4) * Math.sin(s * 22)
    return { f: footOn(th, SHOULDER_AT), th }
  }
  if (t < T_AFLOAT) {
    // Off the corner backwards, foot first, and down flat on the water.
    const v = easeInQuad(over(t, T_FALL, T_AFLOAT))
    return { f: [lerp(F_HUNG[0], F2[0], v), lerp(F_HUNG[1], F2[1], v)], th: lerp(TH_END, Math.PI, v) - 0.3 * Math.sin(Math.PI * v) }
  }
  const s = t - T_AFLOAT
  const nod = Math.exp(-s * 3) * Math.sin(s * 9)
  return { f: [F2[0] - 0.02 * nod, AXIS + bob + 0.05 * nod], th: Math.PI + 0.12 * nod + 0.03 * Math.sin(t * 2.2) }
}
/** A point `a` from the foot along the axis toward the mouth, in the cell's frame. */
function onAxis(a: number, t: number): Pt {
  const { f, th } = poseAt(t)
  return [f[0] - a * Math.cos(th), f[1] - a * Math.sin(th)]
}
/** Where the ball lies inside: down the neck into the body, to the foot as she rears, and up the neck as she pours. */
function insideAt(t: number): number {
  if (t < FIRE) return LEN - (LEN - A_REST) * easeOutCubic(over(t, T_GONE, T_GONE + 0.14))
  if (t < T_OVER - 0.1) return A_REST - (A_REST - 0.1) * easeInOutSine(over(t, FIRE, FIRE + 0.25))
  return 0.1 + (LEN - 0.1) * easeInQuad(over(t, T_OVER - 0.1, T_OUT))
}
const ballAt = (t: number): Pt => onAxis(insideAt(t), t)

const HIDDEN = [...trace(ballAt, T_GONE, FIRE, 6), ...trace(ballAt, FIRE, T_OUT, 16)].map((s) => ({ ...s, hidden: true }))
const OUT = HIDDEN[HIDDEN.length - 1].to
/** How fast the ball leaves the lip: the pace it ran down the neck at. */
const V_POUR = (2 * (LEN - 0.1)) / (T_OUT - (T_OVER - 0.1))
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [BROW0, 0], ROLL),
    ramp([BROW0, 0], [BROW1, AXIS], ROLL, V_BROW),
    { from: [BROW1, AXIS], to: [MOUTH0 + 0.1, AXIS], dur: T_GONE - T_IN },
    ...HIDDEN,
    // Out of the lip at the pace it ran down the neck, and down onto the deck.
    fly(OUT, [1.5, 0], (1.5 - OUT[0]) / V_POUR, 0.004),
  ],
  fire: FIRE,
}

export const bottle = definePiece<{ color: string }>({
  name: 'bottle',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, _s, { k, ink, weight }) => {
    // The deck, and the brow down from its end to the water's edge on a trestle; the far pier on its piling.
    rail(p, k, ink, weight, -0.5, BROW0)
    outline(p, ink, weight)
    p.line(BROW0 * k, FLOOR * k, BROW1 * k, (AXIS + 0.1) * k)
    p.line(-0.27 * k, (FLOOR + 0.13) * k, -0.27 * k, 0.5 * k)
    p.line(-0.33 * k, 0.5 * k, -0.21 * k, 0.5 * k)
    p.line((BROW1 - 0.01) * k, (AXIS + 0.1) * k, (BROW1 - 0.01) * k, 0.5 * k)
    rail(p, k, ink, weight, EAST, 1.5)
    piling(p, k, ink, weight, EAST + 0.03)
    piling(p, k, ink, weight, 1.4)
  },
  over: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const { f, th } = poseAt(t)
    const sea = seaWater(theme)

    // Water thrown up behind it, seen over its top and past its ends: at the brow's foot as the ball goes in, at the
    // piling as the foot hits it, and as it comes back down.
    splash(p, k, sea, weight, MOUTH0 + 0.06, WATER, over(t, T_IN + 0.02, T_IN + 0.45), 0.55)
    splash(p, k, sea, weight, EAST - 0.05, WATER, over(since, 0, 0.4), 0.6)
    splash(p, k, sea, weight, F2[0] + LEN / 2, WATER, over(t, T_AFLOAT - 0.02, T_AFLOAT + 0.5), 1.1)

    // The bottle, in front of the ball: one shape from the foot round the shoulder to the lip and back, with one
    // line of light along the side that is uppermost. Opaque paper: nothing of what is inside is seen.
    p.push()
    p.translate(f[0] * k, f[1] * k)
    p.rotate(th)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, -(BW - 0.05) * k)
    p.quadraticVertex(0, -BW * k, -0.05 * k, -BW * k)
    p.vertex(-BODY * k, -BW * k)
    p.bezierVertex(-(BODY + SHOULDER * 0.6) * k, -BW * k, -(BODY + SHOULDER * 0.7) * k, -NW * k, -(BODY + SHOULDER) * k, -NW * k)
    p.vertex(-(LEN - 0.03) * k, -NW * k)
    p.vertex(-(LEN - 0.03) * k, -(NW + 0.015) * k)
    p.vertex(-LEN * k, -(NW + 0.015) * k)
    p.vertex(-LEN * k, (NW + 0.015) * k)
    p.vertex(-(LEN - 0.03) * k, (NW + 0.015) * k)
    p.vertex(-(LEN - 0.03) * k, NW * k)
    p.vertex(-(BODY + SHOULDER) * k, NW * k)
    p.bezierVertex(-(BODY + SHOULDER * 0.7) * k, BW * k, -(BODY + SHOULDER * 0.6) * k, BW * k, -BODY * k, BW * k)
    p.vertex(-0.05 * k, BW * k)
    p.quadraticVertex(0, BW * k, 0, (BW - 0.05) * k)
    p.endShape(p.CLOSE)
    // Stood on end there is no upper side, and no line.
    const level = Math.cos(th)
    if (Math.abs(level) > 0.4) {
      const side = level > 0 ? -1 : 1
      p.push()
      p.stroke(bg)
      p.strokeWeight(weight * 1.3)
      p.strokeCap(p.ROUND)
      p.line(-0.07 * k, side * (BW - 0.06) * k, -(BODY - 0.04) * k, side * (BW - 0.06) * k)
      p.pop()
    }
    p.pop()

    // The sea in front.
    water(p, k, ink, bg, weight, -0.5, 1.5)
  },
})
