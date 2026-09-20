import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { aboveWater } from './creatures'
import { WATER, bodyColor, piling, seaWater, splash, water } from './sea'

/**
 * A submarine. The deck ends at the conning tower of a submarine lying
 * surfaced alongside, the top of the tower level with the deck and its
 * hatch open; her whale-back hull lies awash along the pier, the tower and
 * the periscope on it. The periscope is turned to watch the ball come. The
 * ball rolls off the deck's end onto the tower's top and drops in the
 * hatch; the hatch slams; the periscope swings forward and she dives, but
 * only to periscope depth: hull and tower go under, and the periscope
 * crosses the two cells of open sea on its own, a feather of water at its
 * foot, a V of wake and a string of bubbles behind it. She comes up at the
 * far pier with the water shedding off her tower, the hatch opens, and the
 * ball pops up out of it onto the far deck and rolls on. The periscope
 * turns to watch it go.
 *
 * The ball is out of sight from the hatch to the hatch: its hidden lane is
 * sampled from the boat's own run and dive, the one motion she is drawn
 * with, so it surfaces where she does.
 */
/** The piers: where the near deck stops and the far one starts. */
const WEST = -0.1
const EAST = 2.1
/** The tower: half its width at the top, how far it flares to its foot, and where it stands, surfaced, at either end of the passage. */
const TW = 0.2
const FLARE = 0.04
const TX0 = 0.12
const TX1 = 1.86
/** The hull: a long whale-back, its middle a hair forward of the tower, its crown this far out of the water. */
const HULL_X = 0.06
const HULL_W = 1.16
const HULL_H = 0.44
const CROWN = 0.1
/** The hatch: on the tower's top, a hair forward of centre, wide enough for the ball; its lid stands this tall when open. */
const HATCH = 0.03
const HATCH_W = 0.3
const LID = 0.24
/** The periscope stands aft of the hatch, this high over the tower's top. */
const PERI = -0.165
const PERI_TOP = -0.22
/** How deep she dives: periscope depth, the head and a hand of tube left over the wave line. */
const DEEP = 0.42

/** Off the deck's end onto the tower, and down the hatch. */
const T_IN = (TX0 + HATCH - 0.1 + 0.5) / ROLL
const DROP = 0.14
const T_DOWN = T_IN + DROP
/** The hatch slams; a beat; she dives. */
const SLAM = 0.12
const FIRE = T_DOWN + 0.2
/** The passage: down, across and up in one motion, this long. */
const PASSAGE = 1.7
const T_SURF = FIRE + PASSAGE
/** The hatch opens again, and the ball pops out. */
const OPEN = 0.15
const T_POP = T_SURF + 0.25
const POP = 0.32
const LOFT = 0.3
const LAND: Pt = [EAST + 0.12, 0]

/** Where the tower stands: alongside the near deck, then across to the far one, easing in and out. */
const towerX = (t: number) => TX0 + (TX1 - TX0) * easeInOutSine(over(t, FIRE, T_SURF))
/** How far down she is: under in the first part of the passage, up again in the last. */
const depthAt = (t: number) => DEEP * easeInOutSine(over(t, FIRE, FIRE + 0.5)) * (1 - easeInOutSine(over(t, T_SURF - 0.5, T_SURF)))
/** How fast she is going, 0 to 1: the wake's strength. */
const wayAt = (t: number) => (t <= FIRE || t >= T_SURF ? 0 : Math.sin(Math.PI * over(t, FIRE, T_SURF)))

/** The ball inside her: under the hatch, riding the boat's run and dive. */
const insideAt = (t: number): Pt => [towerX(t) + HATCH, FLOOR + 0.2 + depthAt(t)]

const HIDDEN = trace(insideAt, T_DOWN, T_POP, 24).map((s) => ({ ...s, hidden: true }))
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [TX0 + HATCH - 0.1, 0], ROLL),
    { from: [TX0 + HATCH - 0.1, 0], to: [TX0 + HATCH + 0.02, 0.3], dur: DROP, ease: 'in' },
    ...HIDDEN,
    fly([TX1 + HATCH, 0.18], LAND, POP, LOFT),
    fly(LAND, [LAND[0] + 0.06, 0], 0.05, 0.012),
    ramp([LAND[0] + 0.06, 0], [2.5, 0], 1.8, ROLL),
  ],
  fire: FIRE,
}

/** How far open the hatch lid stands, 0 shut on the coaming to 1: it hinges on the hatch's far side, so it is seen face on and the ball goes in and comes out in front of it. */
function lidAt(t: number): number {
  const shut = t < T_DOWN ? 0 : t < T_SURF ? easeOutCubic(over(t, T_DOWN, T_DOWN + SLAM)) : 1 - easeOutCubic(over(t, T_SURF + 0.05, T_SURF + 0.05 + OPEN))
  return 1 - shut
}
/** Which way the periscope looks: aft at the ball coming, forward on passage, and after the ball once it has gone. */
const lookAt = (t: number) => -1 + 2 * easeInOutSine(over(t, FIRE, FIRE + 0.4))

export const submarine = definePiece<{ color: string }>({
  name: 'submarine',
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
  draw: (p, s, { k, t, ink, weight }) => {
    const x = towerX(t)
    const d = depthAt(t)

    // The piers either side of the open water.
    rail(p, k, ink, weight, -0.5, WEST)
    rail(p, k, ink, weight, EAST, 2.5)
    piling(p, k, ink, weight, WEST - 0.28)
    piling(p, k, ink, weight, EAST + 0.3)

    // Behind the ball, cut off at the wave line: the periscope on the tower's far side, and the hatch lid.
    p.push()
    aboveWater(p, k, -0.5, 2.5)
    p.translate(x * k, d * k)
    // The periscope: a tube up from the tower, and a head on it with an eye that looks aft, then forward.
    const look = lookAt(t)
    outline(p, ink, weight * 1.3)
    p.line(PERI * k, FLOOR * k, PERI * k, (PERI_TOP + 0.02) * k)
    solid(p, ink, weight, s.color)
    p.rect(PERI * k, PERI_TOP * k, 0.075 * k, 0.05 * k, 0.008 * k)
    p.rect((PERI + look * 0.05) * k, (PERI_TOP + 0.004) * k, 0.045 * k, 0.03 * k, 0.006 * k)
    // The lid, hinged on the hatch's far side: a round plate standing open behind it, its wheel on its face,
    // or slammed down to a bar on the coaming.
    const lid = 0.03 + LID * lidAt(t)
    p.rect(HATCH * k, (FLOOR - 0.032 - lid / 2) * k, (HATCH_W + 0.02) * k, lid * k, Math.min(0.1, lid * 0.45) * k)
    if (lid > 0.12) {
      outline(p, ink, weight)
      p.circle(HATCH * k, (FLOOR - 0.032 - lid / 2) * k, lid * 0.38 * k)
    }
    p.pop()
  },
  over: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const x = towerX(t)
    const d = depthAt(t)
    const way = wayAt(t)
    const sea = seaWater(theme)

    // The boat, in front of the ball, cut off at the wave line: the hull awash and the tower on it with the
    // hatch's coaming on top, one silhouette. What is under the water is not seen.
    p.push()
    aboveWater(p, k, -0.5, 2.5)
    p.translate(x * k, d * k)
    const hullY = WATER - CROWN + HULL_H / 2
    solid(p, ink, weight, s.color)
    p.ellipse(HULL_X * k, hullY * k, HULL_W * k, HULL_H * k)
    p.beginShape()
    p.vertex(-(TW + FLARE) * k, (WATER - CROWN + 0.06) * k)
    p.vertex(-TW * k, (FLOOR + 0.04) * k)
    p.vertex(-TW * k, FLOOR * k)
    p.vertex((HATCH - HATCH_W / 2 - 0.01) * k, FLOOR * k)
    p.vertex((HATCH - HATCH_W / 2 - 0.01) * k, (FLOOR - 0.035) * k)
    p.vertex((HATCH + HATCH_W / 2 + 0.01) * k, (FLOOR - 0.035) * k)
    p.vertex((HATCH + HATCH_W / 2 + 0.01) * k, FLOOR * k)
    p.vertex(TW * k, FLOOR * k)
    p.vertex(TW * k, (FLOOR + 0.04) * k)
    p.vertex((TW + FLARE) * k, (WATER - CROWN + 0.06) * k)
    p.endShape(p.CLOSE)
    // Filled again without their outlines, so the tower's foot and the hull's crown under it do not show.
    p.noStroke()
    p.ellipse(HULL_X * k, hullY * k, HULL_W * k - weight, HULL_H * k - weight)
    p.rect(0, (WATER - CROWN + 0.02) * k, (TW + FLARE) * 2 * k - weight * 2.2, 0.08 * k)
    p.pop()

    // The sea in front of her, and what she does to it.
    water(p, k, ink, weight, -0.5, 2.5)
    const run = way * over(d, 0.34, DEEP)
    if (run > 0.05) {
      // Under way at periscope depth: a feather of water curling up ahead of the tube, and her wake astern of
      // it, ridges on the surface that widen as they fall behind, in the water's colour.
      const px = x + PERI
      p.push()
      p.noFill()
      p.stroke(sea)
      p.strokeWeight(weight)
      p.arc((px + 0.045) * k, (WATER - 0.01) * k, 0.09 * k, (0.06 + 0.07 * run) * k, Math.PI, Math.PI * 1.8)
      for (let i = 0; i < 3; i++) {
        const wx = px - 0.1 - i * 0.17 * run
        const w = (0.05 + 0.035 * i) * run
        p.arc(wx * k, (WATER + 0.008) * k, w * 2 * k, (0.06 - 0.012 * i) * k, Math.PI * 1.1, Math.PI * 1.9)
      }
      p.pop()
      // Bubbles breaking the surface where she has been.
      solid(p, ink, weight * 0.7, bg)
      for (let i = 0; i < 3; i++) {
        const f = ((since * 2.4 + i * 0.33) % 1 + 1) % 1
        const bx = px - 0.62 - i * 0.13 - f * 0.05
        if (bx > WEST + 0.06) p.circle(bx * k, (WATER - 0.014 - 0.008 * f) * k, (0.02 + 0.03 * f * (1 - f)) * run * k)
      }
    }
    // The dive: a splash where the tower goes under. The surfacing: water running off the tower's shoulders,
    // drops down either flank to the sea, as she comes up.
    splash(p, k, sea, weight, towerX(FIRE + 0.3), WATER, over(since, 0.3, 0.8), 0.7)
    const shed = over(t, T_SURF - 0.3, T_SURF + 0.3)
    if (shed > 0 && shed < 1) {
      p.noStroke()
      p.fill(sea)
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const f = shed * 1.5 - i * 0.25
          if (f <= 0 || f >= 1) continue
          const top = Math.min(FLOOR + 0.03 + d, WATER - 0.02)
          p.circle((x + side * (TW + 0.035 + 0.03 * f)) * k, (top + (WATER - top) * f * f) * k, 0.045 * (1 - 0.4 * f) * k)
        }
      }
    }
  },
})
