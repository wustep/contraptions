import { outline, solid } from '../../../../../../src/core/draw'
import { easeOutQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from '../../../pieces/harbor/sea'

/**
 * A breach. The water off the deck's end is deep here, a whole floor of
 * it, and a tall marker buoy is held down in it out of sight of the
 * weather: upright under the surface, its head a hand's breadth awash, its
 * foot chained short to a slip hook on the bed of the sea. The ball runs
 * off the deck's end, goes in with a splash and comes down on the buoy's
 * head. The buoy ducks under the blow, the chain goes slack, and the hook's
 * tongue falls open. Nothing is holding it now, and it goes up like a cork:
 * faster all the way to the surface, out of it a whole length clear with
 * the ball on its head and the sea pouring off it, and there the ball
 * leaves it, on up in an arc onto the deck a floor above. The buoy falls
 * back with a second splash, ducks, bobs, and settles afloat, a third of it
 * under, the chain's end swinging from its foot.
 *
 * The buoy's head has one height at every instant: the duck, the rush to the
 * surface and the leap are one function of time, and while the ball is on
 * the head its lane is traced from it.
 */

const EDGE = -0.18
/** The buoy stands at this x; its length, and how wide it is at the shoulder and at the head. */
const BX = 0.27
const LEN = 0.74
const WIDE = 0.34
const HEAD = 0.2
/** Held down, the head lies this far under the surface; afloat, this much of the buoy stands out of it. */
const HELD = WATER + 0.17
const AFLOAT = WATER - 0.46
/** The bed of the sea, a floor down. */
const BED = 1.5
/** The upper deck: where it starts, its piling, and where the ball comes down on it. */
const SHELF_X = 0.92
const POST_X = 1.3
const LAND: Pt = [1.16, -1]

/** Cartoon gravity; the buoy's push up through the water; and how hard the air and its own weight stop it once it is out. */
const G = 22
const LIFT = 15.1
const BRAKE = 46

/** Off the end at the deck's pace, falling: where and when the ball's underside meets the sea. */
const T_EDGE = (EDGE + 0.5) / ROLL
const T_WET = Math.sqrt((2 * (WATER - R - 0.0)) / G)
const WET: Pt = [EDGE + ROLL * T_WET, WATER - R]
/** Down through the water onto the head, the way taken off it. */
const SINK = 0.16
const T_HEAD = T_EDGE + T_WET + SINK
/** The buoy ducks under the blow this far, in this long; then the hook lets go. */
const DUCK = 0.05
const T_DUCK = 0.14
const FIRE = T_HEAD + T_DUCK
/** Up to where its foot leaves the water: from rest at a steady push. */
const RISE = HELD + DUCK + LEN - WATER
const T_RISE = Math.sqrt((2 * RISE) / LIFT)
const V_OUT = LIFT * T_RISE
const T_OUT = FIRE + T_RISE
/** In the air it is stopped hard, and falls back under gravity into the sea. */
const T_TOP = T_OUT + V_OUT / BRAKE
const LEAP = (V_OUT * V_OUT) / (2 * BRAKE)

/** The height of the buoy's head, `t` seconds into the piece. */
function headAt(t: number): number {
  if (t < T_HEAD) return HELD
  if (t < FIRE) return HELD + DUCK * Math.sin((Math.PI / 2) * over(t, T_HEAD, FIRE))
  if (t < T_OUT) return HELD + DUCK - 0.5 * LIFT * (t - FIRE) ** 2
  const out = WATER - LEN
  if (t < T_TOP) return out - V_OUT * (t - T_OUT) + 0.5 * BRAKE * (t - T_OUT) ** 2
  // Back into the sea from the top of the leap, and then a cork: deep, up, and dying away about where it floats.
  const top = out - LEAP
  const s = t - T_TOP
  const tFall = Math.sqrt((2 * (AFLOAT - top)) / G)
  if (s < tFall) return top + 0.5 * G * s * s
  const u = s - tFall
  return AFLOAT + 0.2 * Math.exp(-u * 1.9) * Math.sin(u * 7.5)
}
/** It leans east as it comes out, which is what sends the ball on, and rights itself afloat. */
const leanAt = (t: number): number => (t < T_OUT - 0.08 ? 0 : 0.2 * over(t, T_OUT - 0.08, T_TOP) * (1 - over(t, T_TOP + 0.25, T_TOP + 1.1)))
/** When it goes back in. */
const T_BACK = T_TOP + Math.sqrt((2 * (AFLOAT + 0.12 - (WATER - LEN - LEAP))) / G)

/** The ball on the buoy's head: a radius over it, along the buoy's own lean. */
const onHead = (t: number): Pt => [BX + (LEN + R) * Math.sin(leanAt(t)), headAt(t) + LEN - (LEN + R) * Math.cos(leanAt(t))]
const SEAT = onHead(T_HEAD)
const RIDE = trace(onHead, T_HEAD, T_OUT, 20)
const OFF = RIDE[RIDE.length - 1].to
/** The ball leaves the head as the foot leaves the water, at the buoy's own pace, and is a thrown thing from there. */
const FLIGHT = (V_OUT + Math.sqrt(V_OUT * V_OUT - 2 * G * (OFF[1] - LAND[1]))) / G
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [EDGE, 0], ROLL),
    fly([EDGE, 0], WET, T_WET, WET[1] / 4),
    { from: WET, to: SEAT, dur: SINK, ease: 'out' },
    ...RIDE,
    fly(OFF, LAND, FLIGHT, (G * FLIGHT * FLIGHT) / 8),
    fly(LAND, [LAND[0] + 0.1, -1], 0.06, 0.015),
    ramp([LAND[0] + 0.1, -1], [1.5, -1], 2, ROLL),
  ],
  fire: FIRE,
}

export const breach = definePiece<{ color: string; band: string }>({
  name: 'breach',
  weight: 0.8,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    const body = bodyColor(theme, color, ball.color)
    // The band round its shoulder: the palette's palest colour, or failing that the paper.
    const pale = theme.colors.filter((c) => c !== body && c !== ball.color).sort((a, b) => parseInt(b.slice(1, 3), 16) + parseInt(b.slice(3, 5), 16) - parseInt(a.slice(1, 3), 16) - parseInt(a.slice(3, 5), 16))[0]
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color: body, band: pale ?? theme.bg } }
  },
  draw: (p, s, { k, t, since, ink, weight, theme }) => {
    const sea = seaWater(theme)
    const head = headAt(t)
    const lean = leanAt(t)

    // The deck in and its piling, down through a floor of water to the bed; the deck above on its own long piling.
    rail(p, k, ink, weight, -0.5, EDGE)
    piling(p, k, ink, weight, -0.36, FLOOR, BED)
    rail(p, k, ink, weight, SHELF_X, 1.5, -1 + FLOOR)
    piling(p, k, ink, weight, POST_X, -1 + FLOOR, BED)
    seabed(p, k, ink, weight, -0.5, 1.5, BED)

    // The slip hook on the bed: a ring bolt, the hook's back, and its tongue, shut over the chain's last link until the buoy ducks.
    const open = since < 0 ? 0 : easeOutQuad(over(since, 0, 0.12))
    outline(p, ink, weight)
    p.line(BX * k, BED * k, BX * k, (BED - 0.05) * k)
    p.noFill()
    p.arc(BX * k, (BED - 0.1) * k, 0.1 * k, 0.1 * k, Math.PI * 0.5, Math.PI * 1.85)
    p.push()
    p.translate((BX + 0.05) * k, (BED - 0.1) * k)
    p.rotate(-0.25 + open * 2.2)
    p.line(0, 0, 0, -0.1 * k)
    p.pop()

    // The buoy, about its foot: a tall can with a flat head, a fat shoulder a third of the way down, and one pale band.
    const foot = head + LEN
    p.push()
    p.translate(BX * k, foot * k)
    p.rotate(lean)
    // The chain from its foot: taut to the hook while it is held, a short end swinging after.
    outline(p, ink, weight)
    if (since < 0) p.line(0, 0, 0, (BED - 0.15 - foot) * k)
    else {
      const swing = 0.5 * Math.exp(-since * 1.3) * Math.sin(since * 9) - lean
      p.line(0, 0, Math.sin(swing) * 0.13 * k, Math.cos(swing) * 0.13 * k)
    }
    const shape = () => {
      p.beginShape()
      p.vertex((-HEAD / 2) * k, -LEN * k)
      p.vertex((HEAD / 2) * k, -LEN * k)
      p.vertex((WIDE / 2) * k, -LEN * 0.66 * k)
      p.vertex((WIDE / 2) * k, -LEN * 0.4 * k)
      p.vertex(0.05 * k, -0.02 * k)
      p.vertex(-0.05 * k, -0.02 * k)
      p.vertex((-WIDE / 2) * k, -LEN * 0.4 * k)
      p.vertex((-WIDE / 2) * k, -LEN * 0.66 * k)
      p.endShape(p.CLOSE)
    }
    solid(p, ink, weight, s.color)
    shape()
    p.noStroke()
    p.fill(s.band)
    p.rect(0, -LEN * 0.53 * k, WIDE * k, LEN * 0.13 * k)
    outline(p, ink, weight)
    shape()
    p.line((-WIDE / 2) * k, -LEN * 0.595 * k, (WIDE / 2) * k, -LEN * 0.595 * k)
    p.line((-WIDE / 2) * k, -LEN * 0.465 * k, (WIDE / 2) * k, -LEN * 0.465 * k)
    p.pop()

    // The sea, and what is done to it: the ball going in, the buoy coming out with the sea pouring off it, and going back.
    water(p, k, ink, weight, -0.5, 1.5)
    splash(p, k, sea, weight, WET[0] + 0.03, WATER, over(t, T_EDGE + T_WET, T_EDGE + T_WET + 0.5), 0.9)
    const breaking = T_OUT - (LEN * 0.9) / V_OUT
    splash(p, k, sea, weight, BX, WATER, over(t, breaking, breaking + 0.6), 1.5)
    splash(p, k, sea, weight, BX, WATER, over(t, T_BACK, T_BACK + 0.6), 1.2)
  },
})
