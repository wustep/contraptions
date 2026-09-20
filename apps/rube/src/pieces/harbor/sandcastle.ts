import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import type { Theme } from '../../../../../src/core/themes'
import { FLOOR, ROLL, definePiece, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, luminance, water } from './sea'

/**
 * A sandcastle. For one cell the pier gives way to a sandbank, an island
 * of sand standing out of the sea as high as the deck, and a sandcastle
 * stands on it in the ball's way: two round
 * towers with a wall between, crenellated, a flag on the far tower. The
 * ball runs into the near tower and does not stop: the towers slump into
 * heaps, the wall goes down, lumps hop off the tops and land beyond, the
 * flag keels over onto the ruin, and the ball, slowed by the sand, ploughs
 * through what is left and rolls on. A flat beat with a shape.
 */
/** The castle: the towers' footprints and height, the wall's, the merlons on top. */
const T0 = -0.11
const T1 = 0.21
const TW = 0.18
const TOWER_H = 0.38
const WALL_H = 0.22
const MERLON = 0.05
/** Where the ball first meets it, and how slow the sand makes it. */
const HIT = T0 - 0.13
const V_SAND = 1.1
const FIRE = (HIT + 0.5) / ROLL
/** The flag on the far tower. */
const POLE = 0.17
/** The bank's top runs this far either side; its flanks go down into the sea from there, and a plank of deck bridges each. */
const BANK = 0.37

/** How sandy a colour is: what yellow has over its blue. */
const sandy = (hex: string) => Math.min(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16)) - parseInt(hex.slice(5, 7), 16)
/** Sand is sand-coloured: the palette's sandiest colour that is not the ball's and stands off the paper; failing one, a body's colour. */
function sandColor(theme: Theme, color: string, ball: string): string {
  const paper = luminance(theme.bg)
  const sand = theme.colors.filter((c) => c !== ball && sandy(c) > 60 && Math.abs(luminance(c) - paper) > 0.12).sort((a, b) => sandy(b) - sandy(a))[0]
  return sand ?? bodyColor(theme, color, ball)
}

const LANE: Lane = {
  segs: [roll([-0.5, 0], [HIT, 0], ROLL), ramp([HIT, 0], [0.3, 0], ROLL, V_SAND), ramp([0.3, 0], [0.5, 0], V_SAND, ROLL)],
  fire: FIRE,
}

/** How far down a part has come, 0 standing to 1 a heap, from when the ball reaches it. */
const slump = (since: number, from: number, dur: number) => easeInQuad(over(since, from, from + dur))

/** A tower or a wall, standing at `x0..x0+w` to `h` over the sand, slumped by `c`: lower, wider, rounder. */
function heapShape(p: import('p5'), k: number, x0: number, w: number, h: number, c: number, merlons: boolean): void {
  const hh = h * (1 - 0.82 * c)
  const ww = w * (1 + 0.55 * c)
  const cx = x0 + w / 2
  const top = FLOOR - hh
  const r = Math.min(hh, ww / 2) * (0.1 + 0.9 * c)
  if (!merlons || c > 0.35) {
    // A slumped heap: one rounded hump.
    p.beginShape()
    p.vertex((cx - ww / 2) * k, FLOOR * k)
    p.bezierVertex((cx - ww / 2) * k, (top + r * 0.2) * k, (cx - ww / 2 + r) * k, top * k, (cx - ww / 2 + r) * k, top * k)
    p.vertex((cx + ww / 2 - r) * k, top * k)
    p.bezierVertex((cx + ww / 2 - r) * k, top * k, (cx + ww / 2) * k, (top + r * 0.2) * k, (cx + ww / 2) * k, FLOOR * k)
    p.endShape(p.CLOSE)
    return
  }
  // Standing: a tower with two merlons on top.
  const m = MERLON * (1 - c / 0.35)
  p.beginShape()
  p.vertex((cx - ww / 2) * k, FLOOR * k)
  p.vertex((cx - ww / 2) * k, top * k)
  p.vertex((cx - ww / 2 + ww * 0.28) * k, top * k)
  p.vertex((cx - ww / 2 + ww * 0.28) * k, (top + m) * k)
  p.vertex((cx + ww / 2 - ww * 0.28) * k, (top + m) * k)
  p.vertex((cx + ww / 2 - ww * 0.28) * k, top * k)
  p.vertex((cx + ww / 2) * k, top * k)
  p.vertex((cx + ww / 2) * k, FLOOR * k)
  p.endShape(p.CLOSE)
}

/** The lumps that hop off the tops: where each starts, how far it goes, and when. */
const LUMPS: { from: Pt; dx: number; at: number; r: number }[] = [
  { from: [T0 + TW / 2, FLOOR - TOWER_H], dx: 0.3, at: 0, r: 0.045 },
  { from: [T0 + TW + 0.07, FLOOR - WALL_H], dx: 0.22, at: 0.06, r: 0.035 },
  { from: [T1 + TW / 2, FLOOR - TOWER_H], dx: 0.16, at: 0.14, r: 0.04 },
]
const HOP = 0.3

export const sandcastle = definePiece<{ color: string }>({
  name: 'sandcastle',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: sandColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    // The bank: an island of sand, its top level with the decks, its flanks going down into the sea to the bed;
    // a plank of deck reaches it from either side.
    rail(p, k, ink, weight, -0.5, -BANK + 0.02)
    rail(p, k, ink, weight, BANK - 0.02, 0.5)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((-BANK + 0.04) * k, FLOOR * k)
    p.vertex((BANK - 0.04) * k, FLOOR * k)
    p.bezierVertex(BANK * k, FLOOR * k, (BANK + 0.03) * k, (FLOOR + 0.08) * k, 0.5 * k, (WATER + 0.05) * k)
    p.vertex(0.5 * k, 0.5 * k)
    p.vertex(-0.5 * k, 0.5 * k)
    p.vertex(-0.5 * k, (WATER + 0.05) * k)
    p.bezierVertex((-BANK - 0.03) * k, (FLOOR + 0.08) * k, -BANK * k, FLOOR * k, (-BANK + 0.04) * k, FLOOR * k)
    p.endShape(p.CLOSE)

    // The castle: the near tower, the wall, the far tower, each slumping in turn as the ball comes through; and
    // the lumps off their tops. Outlined once each and then filled again, so whatever overlaps is one heap.
    const cN = slump(since, 0, 0.22)
    const cW = slump(since, 0.06, 0.26)
    const cF = slump(since, 0.14, 0.28)
    const parts = () => {
      heapShape(p, k, T0, TW, TOWER_H, cN, true)
      heapShape(p, k, T0 + TW - 0.01, T1 - T0 - TW + 0.02, WALL_H, cW, false)
      heapShape(p, k, T1, TW, TOWER_H, cF, true)
      for (const l of LUMPS) {
        const f = over(since, l.at, l.at + HOP)
        if (f <= 0) continue
        const x = l.from[0] + l.dx * f
        const y = f < 1 ? l.from[1] + (FLOOR - l.r - l.from[1]) * f - 0.16 * 4 * f * (1 - f) : FLOOR - l.r
        p.ellipse(x * k, y * k, l.r * 2 * k, l.r * 1.6 * k)
      }
    }
    solid(p, ink, weight, s.color)
    parts()
    if (since > 0) {
      p.push()
      p.noStroke()
      p.fill(s.color)
      p.translate(0, (weight / k) * 0.5 * k)
      parts()
      p.pop()
    }
    // The bank's top again, over the heaps' feet, so the ground is one line; and the sea, lapping its flanks.
    outline(p, ink, weight)
    p.line((-BANK + 0.04) * k, FLOOR * k, (BANK - 0.04) * k, FLOOR * k)
    water(p, k, ink, weight, -0.5, 0.5)

    // The flag on the far tower: up, until the tower goes; then over onto the ruin.
    const fx = T1 + TW / 2
    const towerTop = FLOOR - TOWER_H * (1 - 0.82 * cF)
    const fall = 1.35 * easeInQuad(over(since, 0.16, 0.5))
    p.push()
    p.translate(fx * k, towerTop * k)
    p.rotate(fall)
    outline(p, ink, weight)
    p.line(0, 0, 0, -POLE * k)
    solid(p, ink, weight * 0.8, bg)
    const flutter = since < 0.16 ? 0.012 * Math.sin(since * 9) : 0
    p.triangle(0, -POLE * k, 0, (-POLE + 0.06) * k, 0.09 * k, (-POLE + 0.03 + flutter) * k)
    p.pop()

    // Sand thrown up at the hit.
    if (since > 0 && since < 0.35) {
      const f = since / 0.35
      p.push()
      p.noStroke()
      p.fill(s.color)
      for (let i = 0; i < 5; i++) {
        const a = -2.6 + i * 0.5
        const r = 0.08 + 0.22 * easeOutCubic(f)
        p.circle((HIT + 0.1 + Math.cos(a) * r) * k, (FLOOR - 0.05 + Math.sin(a) * r + 0.3 * f * f) * k, (0.03 - 0.02 * f) * k)
      }
      p.pop()
    }
  },
})
