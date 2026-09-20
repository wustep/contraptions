import { solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, burst, definePiece, over, rail, ramp, wait, type BallChange, type Lane } from '../../parts'
import { bodyColor, luminance, piling, water } from './sea'

/**
 * A treasure chest. It stands across the deck with its lid thrown open
 * and the deck running in one end and out the other. The ball rolls in
 * behind the front and stops; the lid slams down on it. A beat, and a
 * glint comes out through the keyhole. The lid lifts again and the ball
 * rolls out gilded — the palette's yellowest colour that is not the one
 * it came in — and goes on that colour for good. The chest keeps its lid
 * up after, for the next one.
 */
/** The chest: half its width, its height over the deck, and the lid's dome and its depth when it stands open. */
const HW = 0.27
const TOP = FLOOR - 0.3
const DOME = 0.11
const DEPTH = 0.24
/** Stop in the middle; the slam; the glint; the lid lifts; out. */
const ARRIVE = arriveAt(0)
const SLAM = 0.08
const FIRE = ARRIVE + 0.1
const T_GILD = FIRE + 0.3
const T_LIFT = FIRE + 0.62
const LIFT = 0.25
const T_OUT = T_LIFT + 0.14
/** How gold a colour is: what yellow has over its blue. */
const gilt = (hex: string) => Math.min(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16)) - parseInt(hex.slice(5, 7), 16)

const LANE: Lane = {
  segs: [...arrive([-0.5, 0], [0, 0]), wait([0, 0], T_OUT - ARRIVE, { hidden: true }), ramp([0, 0], [0.5, 0], 0, ROLL)],
  fire: FIRE,
}

/** How far shut the lid is: open, slammed at the fire, lifted again after the glint. */
function shutAt(since: number): number {
  if (since < -SLAM) return 0
  if (since < 0) return easeInQuad(over(since, -SLAM, 0))
  if (since < T_LIFT - FIRE) return 1
  return 1 - easeOutCubic(over(since, T_LIFT - FIRE, T_LIFT - FIRE + LIFT))
}

export const chest = definePiece<{ color: string; gold: string }>({
  name: 'chest',
  weight: 0.9,
  dynamic: true,
  place: ({ color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The gilt is the yellowest colour that is not the ball's; the chest is never that colour, so the ball is seen coming out of it.
    const pool = theme.colors.filter((c) => c !== ball.color)
    if (!pool.length) return null
    const gold = [...pool].sort((a, b) => gilt(b) - gilt(a))[0]
    let body = bodyColor(theme, color, ball.color)
    if (body === gold) {
      const paper = luminance(theme.bg)
      body = theme.colors.filter((c) => c !== gold && c !== ball.color).sort((a, b) => Math.abs(luminance(b) - paper) - Math.abs(luminance(a) - paper))[0]
      if (!body) return null
    }
    const changes: BallChange[] = [{ at: T_GILD, color: gold, over: 0.2 }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: body, gold }, changes }
  },
  draw: (p, _s, { k, ink, weight }) => {
    water(p, k, ink, weight, -0.5, 0.5)
    piling(p, k, ink, weight, -0.4)
    piling(p, k, ink, weight, 0.4)
    rail(p, k, ink, weight, -0.5, 0.5)
  },
  over: (p, s, { k, since, ink, bg, weight }) => {
    const shut = shutAt(since)
    const glint = since > 0.2 && since < 0.55 ? Math.sin(Math.PI * over(since, 0.2, 0.55)) : 0

    // The chest's front, standing between the viewer and the ball, on the deck: a box with a band down either side.
    solid(p, ink, weight, s.color)
    p.rect(0, ((TOP + FLOOR) / 2) * k, HW * 2 * k, (FLOOR - TOP) * k, 0.01 * k)
    solid(p, ink, weight * 0.8, bg)
    for (const x of [-HW + 0.06, HW - 0.06]) p.rect(x * k, ((TOP + FLOOR) / 2) * k, 0.045 * k, (FLOOR - TOP - weight / k) * k)
    // The keyhole, lit from inside when the glint comes.
    solid(p, ink, weight * 0.8, glint > 0.1 ? s.gold : ink)
    p.circle(0, (TOP + 0.13) * k, 0.05 * k)
    p.triangle(-0.012 * k, (TOP + 0.14) * k, 0.012 * k, (TOP + 0.14) * k, 0, (TOP + 0.2) * k)
    if (glint > 0.02) {
      p.push()
      p.stroke(s.gold)
      p.strokeWeight(weight * 1.3)
      burst(p, 0, (TOP + 0.15) * k, (0.05 + 0.04 * glint) * k, (0.05 + 0.2 * glint) * k, 7, 0.3 + since * 2)
      p.pop()
    }

    // The lid, hinged along the back: standing open, its inside to the viewer, or down as a dome on the box. Between,
    // it swings in the depth of the picture, so what is seen of it is its height foreshortened.
    const standing = DEPTH * Math.cos((Math.PI / 2) * shut)
    const dome = 0.025 + (DOME - 0.025) * Math.sin((Math.PI / 2) * shut)
    // Standing open it shows its inside, which is paper; down, its painted top.
    solid(p, ink, weight, shut < 0.5 ? bg : s.color)
    p.beginShape()
    p.vertex(-HW * k, TOP * k)
    p.vertex(-HW * k, (TOP - standing) * k)
    p.bezierVertex(-HW * k, (TOP - standing - dome * 1.3) * k, HW * k, (TOP - standing - dome * 1.3) * k, HW * k, (TOP - standing) * k)
    p.vertex(HW * k, TOP * k)
    p.endShape(p.CLOSE)
    if (shut > 0.98) {
      // The hasp, over the join.
      solid(p, ink, weight * 0.8, bg)
      p.rect(0, (TOP + 0.02) * k, 0.06 * k, 0.07 * k, 0.01 * k)
    }
    // The slam: a knock of lines off the lid's front edge.
    if (since > 0 && since < 0.16) {
      const f = since / 0.16
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      for (const x of [-HW - 0.03, HW + 0.03]) {
        const side = Math.sign(x)
        p.line(x * k, (TOP - 0.02) * k, (x + side * (0.05 + 0.05 * f)) * k, (TOP - 0.06 - 0.04 * f) * k)
        p.line(x * k, (TOP + 0.03) * k, (x + side * (0.06 + 0.05 * f)) * k, (TOP + 0.03) * k)
      }
      p.pop()
    }
  },
})
