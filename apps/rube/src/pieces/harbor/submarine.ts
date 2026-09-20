import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { aboveWater } from './creatures'
import { WATER, bodyColor, piling, seaWater, splash, water } from './sea'

/**
 * A submarine. The deck ends at the conning tower of a submarine lying
 * surfaced alongside, the top of the tower level with the deck and its
 * hatch open; only the tower, the periscope and the crown of the hull show
 * above the water. The periscope is turned to watch the ball come. The
 * ball rolls off the deck's end onto the tower's top and drops in the
 * hatch; the hatch slams; the periscope swings forward and the boat dives,
 * tower and all, and goes under. Nothing under the water is seen: what
 * crosses the two cells of open sea is her wake on the surface and the
 * bubbles she leaves. She comes up at the far pier with the water shedding
 * off her tower, the hatch opens, and the ball pops up out of it onto the
 * far deck and rolls on. The periscope turns to watch it go.
 *
 * The ball is out of sight from the hatch to the hatch: its hidden lane is
 * sampled from the boat's own run and dive, the one motion she is drawn
 * with, so it surfaces where she does.
 */
/** The piers: where the near deck stops and the far one starts. */
const WEST = -0.1
const EAST = 2.1
/** The tower: half its width at the top, and where it stands, surfaced, at either end of the passage. */
const TW = 0.17
const TX0 = 0.12
const TX1 = 1.86
/** The hatch: on the tower's top, a hair aft of centre, wide enough for the ball; its lid hinges at the far edge. */
const HATCH = 0.03
const HATCH_W = 0.3
/** The periscope stands forward of the hatch, this high over the tower's top. */
const PERI = -0.08
const PERI_TOP = -0.22
/** How deep she dives: everything of her under the wave line. */
const DEEP = 0.72

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

/** The hatch lid's angle from flat: standing open, or shut on the coaming. */
function lidAt(t: number): number {
  const shut = t < T_DOWN ? 0 : t < T_SURF ? easeOutCubic(over(t, T_DOWN, T_DOWN + SLAM)) : 1 - easeOutCubic(over(t, T_SURF + 0.05, T_SURF + 0.05 + OPEN))
  return 1.75 * (1 - shut)
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

    // The hatch lid, behind the ball: hinged at the far edge of the hatch, standing open or slammed flat.
    p.push()
    aboveWater(p, k, -0.5, 2.5)
    p.translate((x + HATCH + HATCH_W / 2) * k, (FLOOR - 0.035 + d) * k)
    p.rotate(lidAt(t))
    solid(p, ink, weight, s.color)
    p.rect((-HATCH_W / 2) * k, -0.012 * k, (HATCH_W + 0.02) * k, 0.03 * k, 0.006 * k)
    p.pop()
  },
  over: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const x = towerX(t)
    const d = depthAt(t)
    const way = wayAt(t)
    const sea = seaWater(theme)

    // The boat, in front of the ball, cut off at the wave line: the crown of the hull just awash, the tower on it
    // with the hatch's coaming on top, and the periscope. What is under the water is not seen.
    p.push()
    aboveWater(p, k, -0.5, 2.5)
    p.translate(x * k, d * k)
    solid(p, ink, weight, s.color)
    p.ellipse(0.06 * k, (WATER + 0.13) * k, 1.16 * k, 0.4 * k)
    p.beginShape()
    p.vertex(-(TW + 0.05) * k, (WATER + 0.02) * k)
    p.vertex(-TW * k, (FLOOR + 0.04) * k)
    p.vertex(-TW * k, FLOOR * k)
    p.vertex((HATCH - HATCH_W / 2 - 0.01) * k, FLOOR * k)
    p.vertex((HATCH - HATCH_W / 2 - 0.01) * k, (FLOOR - 0.035) * k)
    p.vertex((HATCH + HATCH_W / 2 + 0.01) * k, (FLOOR - 0.035) * k)
    p.vertex((HATCH + HATCH_W / 2 + 0.01) * k, FLOOR * k)
    p.vertex(TW * k, FLOOR * k)
    p.vertex(TW * k, (FLOOR + 0.04) * k)
    p.vertex((TW + 0.05) * k, (WATER + 0.02) * k)
    p.endShape(p.CLOSE)
    // The periscope: a tube up from the tower, and a head on it with an eye that looks aft, then forward.
    const look = lookAt(t)
    outline(p, ink, weight * 1.3)
    p.line(PERI * k, FLOOR * k, PERI * k, (PERI_TOP + 0.02) * k)
    solid(p, ink, weight, s.color)
    p.rect(PERI * k, PERI_TOP * k, 0.075 * k, 0.05 * k, 0.008 * k)
    p.rect((PERI + look * 0.05) * k, (PERI_TOP + 0.004) * k, 0.045 * k, 0.03 * k, 0.006 * k)
    p.pop()

    // The sea in front of her, and what she does to it.
    water(p, k, ink, weight, -0.5, 2.5)
    if (way > 0.05) {
      // Her wake: arcs on the surface trailing astern of the tower, in the water's colour.
      p.push()
      p.noFill()
      p.stroke(sea)
      p.strokeWeight(weight * 0.9)
      for (let i = 0; i < 3; i++) {
        const wx = x - 0.16 - i * 0.16 * way
        const w = (0.06 + 0.03 * i) * way
        p.arc(wx * k, (WATER + 0.008) * k, w * 2 * k, 0.045 * k, Math.PI * 1.1, Math.PI * 1.9)
      }
      p.pop()
      // Bubbles breaking the surface behind her while she is under.
      if (d > 0.3) {
        solid(p, ink, weight * 0.7, bg)
        for (let i = 0; i < 4; i++) {
          const f = ((since * 2.4 + i * 0.27) % 1 + 1) % 1
          const bx = x - 0.05 - i * 0.11 - f * 0.05
          p.circle(bx * k, (WATER - 0.014 - 0.008 * f) * k, (0.02 + 0.03 * f * (1 - f)) * k)
        }
      }
    }
    // The dive and the surfacing: water thrown off the tower at each.
    splash(p, k, sea, weight, TX0 + 0.05, WATER, over(since, 0.3, 0.8), 0.7)
    splash(p, k, sea, weight, TX1 + 0.05, WATER, over(t, T_SURF - 0.25, T_SURF + 0.25), 0.8)
  },
})
