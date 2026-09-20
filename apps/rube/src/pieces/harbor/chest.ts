import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, wait, type BallChange, type Lane } from '../../parts'
import { bodyColor, luminance, piling, water } from './sea'

/**
 * A treasure chest. It is let into the deck between two pilings, its brim
 * level with the planks and heaped to the brim with coin, and its domed
 * lid stands thrown back behind, the dark of its inside to us. The ball
 * rolls off the planks onto the gold and beds down in the hollow between
 * two heaps; the lid slams over it. A beat, and gold light leaks out of
 * the seam and the keyhole. The lid flies back, a few coins jump with it,
 * and the ball is lying there gilded — the palette's yellowest colour that
 * is not the one it came in — and rolls off that colour for good. The
 * chest keeps its lid up after, for the next one.
 */
/** The chest: half its width; its brim, which is the deck's level; how deep the box hangs under it; how high the lid's dome stands over it. */
const HW = 0.28
const BRIM = FLOOR
const BOX = 0.2
const LID = 0.3
/** The straps: a band of paper down the box and over the lid, this far in from either end. */
const STRAP = HW - 0.075
/** Stop in the hollow; the slam; the glint; the lid lifts; out. */
const ARRIVE = arriveAt(0)
const SLAM = 0.08
const FIRE = ARRIVE + 0.1
const T_GILD = FIRE + 0.3
const T_LIFT = FIRE + 0.62
const LIFT = 0.25
const T_OUT = T_LIFT + 0.14
/** The lid is past halfway up, and no longer between us and the ball. */
const T_SHOW = T_LIFT + LIFT * (1 - Math.cbrt(0.5))
/** How gold a colour is: what yellow has over its blue. */
const gilt = (hex: string) => Math.min(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16)) - parseInt(hex.slice(5, 7), 16)

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [0, 0]),
    wait([0, 0], FIRE - ARRIVE),
    wait([0, 0], T_SHOW - FIRE, { hidden: true }),
    wait([0, 0], T_OUT - T_SHOW),
    ramp([0, 0], [0.5, 0], 0, ROLL),
  ],
  fire: FIRE,
}

/** How far shut the lid is: open, slammed at the fire, thrown back again after the glint. */
function shutAt(since: number): number {
  if (since < -SLAM) return 0
  if (since < 0) return easeInQuad(over(since, -SLAM, 0))
  if (since < T_LIFT - FIRE) return 1
  return 1 - easeOutCubic(over(since, T_LIFT - FIRE, T_LIFT - FIRE + LIFT))
}

/** The lid's dome over the brim, `h` high: one arch, the same seen from inside as from outside. */
function dome(p: p5, k: number, h: number, inset = 0): void {
  const w = HW + 0.012 - inset
  p.beginShape()
  p.vertex(-w * k, BRIM * k)
  p.vertex(-w * k, (BRIM - 0.35 * h) * k)
  p.bezierVertex(-w * k, (BRIM - 1.2 * h + inset) * k, w * k, (BRIM - 1.2 * h + inset) * k, w * k, (BRIM - 0.35 * h) * k)
  p.vertex(w * k, BRIM * k)
  p.endShape(p.CLOSE)
}
/** How high the dome stands over the brim at `x`, for a strap that has to stop at its edge. */
function domeAt(x: number, h: number): number {
  const w = HW + 0.012
  let lo = 0
  let hi = 0.5
  for (let i = 0; i < 20; i++) {
    const u = (lo + hi) / 2
    // The arch's bezier runs from -w to w with both its handles over its ends.
    if (-w * (1 - u) ** 3 - 3 * w * (1 - u) ** 2 * u + 3 * w * (1 - u) * u * u + w * u ** 3 < -Math.abs(x)) lo = u
    else hi = u
  }
  return h * (0.35 + 0.85 * 3 * lo * (1 - lo))
}

export const chest = definePiece<{ color: string; gold: string }>({
  name: 'chest',
  weight: 0.9,
  dynamic: true,
  place: ({ color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The gilt is the yellowest colour that is not the ball's; the chest is never that colour, so the gold is seen in it.
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
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const shut = shutAt(since)

    water(p, k, ink, weight, -0.5, 0.5)
    piling(p, k, ink, weight, -HW - 0.06)
    piling(p, k, ink, weight, HW + 0.06)
    rail(p, k, ink, weight, -0.5, -HW)
    rail(p, k, ink, weight, HW, 0.5)

    // The lid thrown back, behind the ball: the dark of its inside within its rim.
    if (shut < 0.5) {
      const h = LID * (Math.cos((Math.PI / 2) * shut) + Math.sin((Math.PI / 2) * shut))
      solid(p, ink, weight, s.color)
      dome(p, k, h)
      p.fill(ink)
      dome(p, k, h, 0.045)
    }
    // The gold, heaped to the brim in two heaps with a hollow between, where the ball beds down.
    solid(p, ink, weight, s.gold)
    p.beginShape()
    p.vertex((-HW + 0.03) * k, BRIM * k)
    p.bezierVertex(-0.2 * k, (BRIM - 0.13) * k, -0.1 * k, (BRIM - 0.13) * k, 0, (BRIM - 0.02) * k)
    p.bezierVertex(0.1 * k, (BRIM - 0.13) * k, 0.2 * k, (BRIM - 0.13) * k, (HW - 0.03) * k, BRIM * k)
    p.endShape(p.CLOSE)

    // The box, hung under the deck between the two pilings: a strap down either end and a lock plate in the middle.
    solid(p, ink, weight, s.color)
    p.rect(0, (BRIM + BOX / 2) * k, HW * 2 * k, BOX * k, 0.012 * k)
    solid(p, ink, weight * 0.8, bg)
    for (const x of [-STRAP, STRAP]) p.rect(x * k, (BRIM + BOX / 2) * k, 0.05 * k, (BOX - weight / k) * k)
    p.rect(0, (BRIM + 0.075) * k, 0.1 * k, 0.11 * k, 0.015 * k)
  },
  over: (p, s, { k, since, ink, bg, weight }) => {
    const shut = shutAt(since)
    const glint = since > 0.2 && since < 0.55 ? Math.sin(Math.PI * over(since, 0.2, 0.55)) : 0

    // The lid slammed down over the ball, in front of it: the dome, its two straps, and the hasp over the lock.
    if (shut >= 0.5) {
      const h = LID * (Math.cos((Math.PI / 2) * shut) + Math.sin((Math.PI / 2) * shut))
      solid(p, ink, weight, s.color)
      dome(p, k, h)
      solid(p, ink, weight * 0.8, bg)
      for (const x of [-STRAP, STRAP]) {
        const top = domeAt(x, h) - 0.012
        p.rect(x * k, (BRIM - top / 2) * k, 0.05 * k, top * k)
      }
      if (shut > 0.98) p.rect(0, (BRIM - 0.01) * k, 0.06 * k, 0.08 * k, 0.012 * k)
    }
    // The keyhole, dark, or lit from inside when the glint comes.
    p.noStroke()
    p.fill(glint > 0.1 ? s.gold : ink)
    p.circle(0, (BRIM + 0.065) * k, 0.04 * k)
    p.triangle(-0.012 * k, (BRIM + 0.07) * k, 0.012 * k, (BRIM + 0.07) * k, 0, (BRIM + 0.115) * k)
    // The glint: gold light out of the seam under the lid, at either end.
    if (glint > 0.02) {
      p.push()
      p.stroke(s.gold)
      p.strokeWeight(weight)
      for (const side of [-1, 1]) {
        for (const a of [-0.6, -0.15, 0.3]) {
          const r0 = 0.05
          const r1 = 0.07 + 0.09 * glint
          const x = side * (HW + 0.01)
          p.line((x + side * Math.cos(a) * r0) * k, (BRIM - 0.01 + Math.sin(a) * r0) * k, (x + side * Math.cos(a) * r1) * k, (BRIM - 0.01 + Math.sin(a) * r1) * k)
        }
      }
      p.pop()
    }
    // The slam: a knock of lines off the lid's foot.
    if (since > 0 && since < 0.16) {
      const f = since / 0.16
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      for (const side of [-1, 1]) {
        const x = side * (HW + 0.04)
        p.line(x * k, (BRIM - 0.06) * k, (x + side * (0.05 + 0.05 * f)) * k, (BRIM - 0.1 - 0.04 * f) * k)
        p.line(x * k, (BRIM - 0.16) * k, (x + side * (0.04 + 0.05 * f)) * k, (BRIM - 0.22 - 0.04 * f) * k)
      }
      p.pop()
    }
    // The lid flies back and three coins jump with it, clear of the ball, and fall back into the heaps: two behind it, and one
    // ahead that goes high enough for the ball to have gone by under it.
    if (since > T_SHOW - FIRE) {
      solid(p, ink, weight * 0.6, s.gold)
      for (const [x, h, dur] of [
        [-0.22, 0.3, 0.4],
        [-0.15, 0.42, 0.45],
        [0.26, 0.5, 0.5],
      ]) {
        const hop = over(since, T_SHOW - FIRE, T_SHOW - FIRE + dur)
        if (hop < 1) p.circle(x * k, (BRIM - 0.06 - h * 4 * hop * (1 - hop)) * k, 0.07 * k)
      }
    }
  },
})
