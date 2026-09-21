import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, lerp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, gallows, mixHex, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { bodyColor, piling, seaWater } from '../../../pieces/harbor/sea'

/**
 * A plughole. Between two piers the sea is walled in: a pool, brim-full,
 * with a bath plug in its bed. The plug's chain goes up over two sheaves on
 * a davit and down to the bail of a tub that floats at the deck's end. The
 * ball rolls off the deck into the tub, and the tub's weight is more than
 * the plug's: the plug comes out of its hole, and the pool goes down it. A
 * dimple turns over the hole; the level falls, fast at first and slower as
 * it shallows, and the tub goes down on it with the ball aboard, the plug
 * climbing as it sinks. The tub grounds on a stone, topples, and the ball
 * rolls out of its mouth along the wet bed of the pool, under the plug
 * hanging on its chain, and up the far pier's slip with the pace it has
 * left. Empty, the tub is lighter than the plug again, which drops back
 * into its hole and hauls the tub up to hang where it floated, over a pool
 * with no water in it.
 *
 * The level is one function of time. The tub floats on it and the plug
 * hangs from it, by one chain of one length; the ball's lane from the deck
 * to the pool's bed is traced from the tub's own place and lean.
 */

/** The deck's end, which is the pool's near wall; the pool's bed; and how full it stands. */
const EDGE = -0.17
const BED = 0.5
const BRIM = 0.17
/** The far pier's slip: from its deck's end down to its foot on the bed. */
const EAST = 2.22
const FOOT_X = 1.72
const SLOPE = Math.atan2(BED - FLOOR, EAST - FOOT_X)
const slipX = (y: number) => EAST - (y - FLOOR) / Math.tan(SLOPE)
/** The ball's centre on the slip, `y` down from the deck's line: a radius off the slope. */
const onSlip = (y: number): Pt => [EAST - R * Math.sin(SLOPE) - (y + R * Math.cos(SLOPE) - R) / Math.tan(SLOPE), y]
const CREST = onSlip(R - R * Math.cos(SLOPE))
/** Where the ball, rolling on the bed, meets the slip. */
const MEET = onSlip(BED - R)

/** The tub: where it floats, its half width, its height, its wall; how deep it floats, and the stone it grounds on. */
const TX = 0.05
const HALF = 0.17
const TALL = 0.15
const WALL = 0.022
const DRAFT = 0.09
const STONE = 0.05
/** The plug and its hole; the davit's beam and the two sheaves under it. */
const PLUG_X = 1.0
const BEAM = -0.42
const SHEAVE = BEAM + 0.05

/** Into the tub; the pool runs out in this long; the tub takes this long to go over, and the ball this long to roll out of it. */
const T_EDGE = (EDGE + 0.5) / ROLL
const HOP = 0.09
const FIRE = T_EDGE + HOP
const DRAIN = 1.3
const TIP = 0.34
const OUT = 0.26

/** The pool's surface at `t`: a tank emptying through a hole in its floor, so the depth goes as a square. */
const levelAt = (t: number): number => BED - (BED - BRIM) * (1 - clamp((t - FIRE) / DRAIN)) ** 2
/** When the tub's west foot finds the stone. */
const T_STONE = FIRE + DRAIN * (1 - Math.sqrt((DRAFT + STONE) / (BED - BRIM)))
const T_DOWN = T_STONE + TIP
const T_OUT = T_DOWN + OUT
/** Empty, it is hauled back up: the plug falls, slowly, with the tub on the other end of its chain. */
const T_HAUL = T_OUT + 0.1
const HAUL = 0.7

/** The tub's east foot, which it goes over about; how far over it is; and the dip it takes as the ball lands in it. */
function tubAt(t: number): { foot: Pt; lean: number } {
  const dip = t < FIRE ? 0 : 0.025 * Math.exp(-(t - FIRE) * 9) * Math.cos((t - FIRE) * 16)
  if (t < T_HAUL) {
    const y = Math.min(BED, levelAt(t) + DRAFT + dip)
    return { foot: [TX + HALF, y], lean: (Math.PI / 2) * easeInQuad(over(t, T_STONE, T_DOWN)) }
  }
  // Hauled up by its bail: upright again as it leaves the bed, then up to where it floated, and a swing that dies away.
  const f = easeInOutSine(over(t, T_HAUL, T_HAUL + HAUL))
  const swing = 0.12 * Math.exp(-(t - T_HAUL) * 1.6) * Math.sin((t - T_HAUL) * 7)
  return { foot: [TX + HALF + swing * 0.3, lerp(BED, BRIM + DRAFT, f)], lean: (Math.PI / 2) * (1 - over(t, T_HAUL, T_HAUL + 0.22)) + swing }
}
/** A point in the tub's own frame, `u` across it from its middle and `v` up from its foot, in the piece's. */
function tubPt(tub: { foot: Pt; lean: number }, u: number, v: number): Pt {
  const x = u - HALF
  const y = -v
  return [tub.foot[0] + x * Math.cos(tub.lean) - y * Math.sin(tub.lean), tub.foot[1] + x * Math.sin(tub.lean) + y * Math.cos(tub.lean)]
}
/** How far the tub's bail has come down from where it floats: what the plug has gone up by. */
const bailAt = (t: number): Pt => tubPt(tubAt(t), 0, TALL + 0.13)
const BAIL0 = bailAt(-1)
const paidAt = (t: number): number => Math.hypot(bailAt(t)[0] - TX, bailAt(t)[1] - SHEAVE) - (BAIL0[1] - SHEAVE)

/** The ball in the tub: on its floor, against its east wall once it leans, and out along that wall when it lies on its side. */
function inTub(t: number): Pt {
  const tub = tubAt(t)
  const slide = over(t, T_STONE, T_STONE + TIP * 0.6)
  const out = easeInQuad(over(t, T_DOWN, T_OUT))
  return tubPt(tub, lerp(0, HALF - WALL - R, slide), WALL + R + out * (TALL + 0.04))
}

const SEAT = inTub(FIRE)
const RIDE = [...trace(inTub, FIRE, T_STONE, 16), ...trace(inTub, T_STONE, T_OUT, 18)]
const SPILL = RIDE[RIDE.length - 1].to
const ON_BED: Pt = [SPILL[0] + 0.1, BED - R]
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [EDGE, 0], ROLL),
    fly([EDGE, 0], SEAT, HOP, 0.02),
    ...RIDE,
    // Off the tub's lip onto the bed, and along it, gathering the deck's pace again; up the slip, slowing; over its crest.
    ramp(SPILL, ON_BED, 1.4, 1.8),
    ramp(ON_BED, MEET, 1.8, 3),
    ramp(MEET, CREST, 3, 1.3),
    roll(CREST, [EAST, 0], 1.3),
    ramp([EAST, 0], [2.5, 0], 1.3, ROLL),
  ],
  fire: FIRE,
}

/** The tub, in its own frame: staves in the colour, open at the top. */
function tubShape(p: p5, k: number): void {
  p.beginShape()
  p.vertex((-HALF - 0.012) * k, -TALL * k)
  p.vertex(-HALF * k, 0)
  p.vertex(HALF * k, 0)
  p.vertex((HALF + 0.012) * k, -TALL * k)
  p.endShape()
}

export const plughole = definePiece<{ color: string; sea: string }>({
  name: 'plughole',
  weight: 0.8,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    // The pool is the sea's own colour, a little deeper when the ball is that colour too; the tub is never the pool's colour, nor the ball's.
    const blue = seaWater(theme)
    const body = bodyColor(theme, color, ball.color)
    const tub = body !== blue ? body : bodyColor(theme, theme.colors.find((c) => c !== blue && c !== ball.color) ?? body, ball.color)
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: tub, sea: blue === ball.color ? mixHex(blue, theme.ink, 0.3) : blue } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const level = levelAt(t)
    const draining = t > FIRE && level < BED - 0.004
    const tub = tubAt(t)
    const up = clamp(paidAt(t), 0, 1)

    // The davit, behind everything: a post on the near pier and a beam out over the pool, a sheave over the tub and one over the plug.
    gallows(p, k, ink, weight, -0.34, PLUG_X + 0.07, -0.34, BEAM)
    // The two piers: the near one's end is the pool's wall; the far one's slip is its other.
    rail(p, k, ink, weight, -0.5, EDGE)
    rail(p, k, ink, weight, EAST, 2.5)
    piling(p, k, ink, weight, EAST + 0.14)

    // The water: from the wall to the slip, a dimple turning over the hole while it runs out.
    if (level < BED - 0.002) {
      const dimple = draining ? Math.min(0.12, (BED - level) * 0.8) * over(t, FIRE + 0.05, FIRE + 0.35) : 0
      p.noStroke()
      p.fill(s.sea)
      p.beginShape()
      p.vertex(EDGE * k, BED * k)
      p.vertex(EDGE * k, level * k)
      if (dimple > 0) {
        p.vertex((PLUG_X - 0.13) * k, level * k)
        p.quadraticVertex((PLUG_X - 0.02) * k, level * k, PLUG_X * k, (level + dimple) * k)
        p.quadraticVertex((PLUG_X + 0.02) * k, level * k, (PLUG_X + 0.13) * k, level * k)
      }
      p.vertex(slipX(level) * k, level * k)
      p.vertex(FOOT_X * k, BED * k)
      p.endShape(p.CLOSE)
    }
    // The pool's one line: down the wall, along the bed, over the plughole, and up the slip to the far deck.
    outline(p, ink, weight)
    p.line(EDGE * k, FLOOR * k, EDGE * k, BED * k)
    p.line(EDGE * k, BED * k, (PLUG_X - 0.07) * k, BED * k)
    p.line((PLUG_X + 0.07) * k, BED * k, FOOT_X * k, BED * k)
    p.line(FOOT_X * k, BED * k, EAST * k, FLOOR * k)
    p.line(FOOT_X * k, BED * k, 2.5 * k, BED * k)
    // The stone the tub comes down on.
    solid(p, ink, weight, bg)
    p.arc((TX - 0.08) * k, BED * k, 0.16 * k, STONE * 2 * k, Math.PI, Math.PI * 2, p.CHORD)

    // The chain: up from the bail to its sheave, along under the beam, and down to the plug.
    const bail = tubPt(tub, 0, TALL + 0.13)
    const plugY = BED - up
    outline(p, ink, weight * 0.8)
    p.line(bail[0] * k, bail[1] * k, TX * k, SHEAVE * k)
    p.line(TX * k, (SHEAVE - 0.03) * k, PLUG_X * k, (SHEAVE - 0.03) * k)
    p.line(PLUG_X * k, SHEAVE * k, PLUG_X * k, (plugY - 0.09) * k)
    solid(p, ink, weight, bg)
    p.circle(TX * k, SHEAVE * k, 0.07 * k)
    p.circle(PLUG_X * k, SHEAVE * k, 0.07 * k)
    // The plug: a rubber bung, wider at the top, on a ring.
    outline(p, ink, weight * 0.8)
    p.circle(PLUG_X * k, (plugY - 0.065) * k, 0.045 * k)
    solid(p, ink, weight, ink)
    p.quad((PLUG_X - 0.085) * k, (plugY - 0.045) * k, (PLUG_X + 0.085) * k, (plugY - 0.045) * k, (PLUG_X + 0.06) * k, (plugY + 0.005) * k, (PLUG_X - 0.06) * k, (plugY + 0.005) * k)

    // The tub's bail and its inside, behind the ball.
    p.push()
    p.translate(tub.foot[0] * k, tub.foot[1] * k)
    p.rotate(tub.lean)
    p.translate(-HALF * k, 0)
    outline(p, ink, weight)
    p.arc(0, -TALL * k, (HALF * 2 - 0.03) * k, 0.26 * k, Math.PI, Math.PI * 2)
    p.pop()
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The tub's staves, in front of the ball: it is in the tub, not on it.
    const tub = tubAt(t)
    p.push()
    p.translate(tub.foot[0] * k, tub.foot[1] * k)
    p.rotate(tub.lean)
    p.translate(-HALF * k, 0)
    solid(p, ink, weight, s.color)
    tubShape(p, k)
    p.pop()
  },
})
