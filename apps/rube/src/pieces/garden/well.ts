import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../parts'
import { drop, soil, tuft } from './green'

/**
 * A garden well: a parapet of brick, a little roof on two posts, a
 * windlass under it with a crank, and a bucket hanging in the mouth with
 * its rim at the rail's level. The ball rolls over the coping and drops
 * into the bucket, which dips and swings on its rope; the jolt slips the
 * pawl; the crank whirls as the rope pays out and the bucket goes down the
 * shaft — two floors or three, the ball riding in it — and lands on a stone
 * at the bottom, half on it and half off, and topples toward an arch in the
 * shaft's side; the ball rolls out of it, through the arch and on, or back
 * the way it came. Long after, the windlass rights the bucket and winds it
 * back up, for no one.
 *
 * The ball is in the bucket all the way: its lane is traced from the one
 * motion the bucket is drawn with — the swing, the fall, the topple.
 */
export interface WellState {
  color: string
  floors: number
  turn: 1 | -1
}

/** The shaft's inner walls, and how thick the parapet is above ground. */
const SHAFT = 0.22
const PARAPET = 0.16
/** The bucket: outer half-width, height, the thickness of its staves; the ball just fits. */
const BW = 0.165
const BH = 0.29
const STAVE = 0.025
const SEAT_U = STAVE + R
/** The ball's centre in the hanging bucket at the top: the rim is level with the coping. */
const YB = FLOOR + BH - SEAT_U
/** The shaft's floor, under the last rail's level so the toppled bucket's side is level with the rail; and the stone on it. */
const SLAB = FLOOR + STAVE
const STONE_H = 0.1
const STONE_X = 0.07
/** Where the toppled bucket's base ends up, back from the middle. */
const LIE_X = -0.04
/** The windlass: a drum under the ridge, the rope off its near side falling down the shaft's middle. */
const DRUM_R = 0.08
const DRUM: Pt = [-DRUM_R, -0.25]
const CRANK = 0.15
/** Rolls over the coping slowing, and drops off its inner edge into the bucket. */
const EDGE = -SHAFT + 0.02
const SLOW_FROM = -0.42
const V_EDGE = 1.2
const DROP_T = (0 - EDGE) / V_EDGE
const T_EDGE = (SLOW_FROM + 0.5) / ROLL + (EDGE - SLOW_FROM) / ((ROLL + V_EDGE) / 2)
const T_IN = T_EDGE + DROP_T
const PAWL = 0.3
const FIRE = T_IN + PAWL
const fallTime = (floors: number) => 0.35 + 0.4 * floors
const TOPPLE = 0.3
const LIES = 2.4
const RIGHTS = 0.5
const WINDS = 2.4

/** How far the bucket has to go down: until its base is on the stone. */
const travel = (floors: number) => floors + SLAB - STONE_H - (YB + SEAT_U)

/** How far down the bucket is, `since` the pawl slipped. */
function depth(since: number, floors: number): number {
  const fall = fallTime(floors)
  const d = travel(floors)
  if (since < 0) return 0
  if (since < fall) return d * easeInQuad(since / fall)
  const up = since - fall - TOPPLE - LIES - RIGHTS
  return up < 0 ? d : d * (1 - easeInOutSine(Math.min(1, up / WINDS)))
}

/** How far over the bucket has toppled, 0 to 1: over at the landing, righted by the rope before it is wound up. */
function toppled(since: number, floors: number): number {
  const s = since - fallTime(floors)
  if (s < 0) return 0
  if (s < TOPPLE) return easeInQuad(s / TOPPLE)
  if (s < TOPPLE + LIES) return 1 - 0.05 * Math.exp(-(s - TOPPLE) * 12) * Math.abs(Math.sin((s - TOPPLE) * 26))
  return 1 - easeInOutSine(Math.min(1, (s - TOPPLE - LIES) / RIGHTS))
}

/** The bucket at piece time `t`: the middle of its base, and its lean. */
function bucketAt(t: number, floors: number, turn: 1 | -1): { o: Pt; lean: number; f: number } {
  const s = t - T_IN
  // The swing and the dip as the ball lands in it, dying away on the way down.
  const sway = s < 0 ? 0 : 0.035 * Math.exp(-s * 4) * Math.sin(s * 11)
  const dip = s < 0 ? 0 : 0.03 * Math.exp(-s * 9) * Math.sin(s * 16)
  const f = toppled(t - FIRE, floors)
  const hung: Pt = [sway, YB + SEAT_U + dip + depth(t - FIRE, floors)]
  const lies: Pt = [turn * LIE_X, floors + SLAB - BW]
  return { o: [lerp(hung[0], lies[0], f), lerp(hung[1], lies[1], f)], lean: (turn * f * Math.PI) / 2, f }
}

/** The ball's centre, riding in the bucket: on its floor, and against its lower side once it is over. */
function ballAt(t: number, floors: number, turn: 1 | -1): Pt {
  const { o, lean, f } = bucketAt(t, floors, turn)
  const side = (BW - STAVE - R) * f
  return [o[0] + SEAT_U * Math.sin(lean) + turn * side * Math.cos(lean), o[1] - SEAT_U * Math.cos(lean) + turn * side * Math.sin(lean)]
}

export const well = definePiece<WellState>({
  name: 'well',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    const options = rng.shuffle([2, 3].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(deep, o.floors - 2))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const tLand = FIRE + fallTime(floors)
      const at = (t: number) => ballAt(t, floors, turn)
      const out = [...trace(at, T_IN, FIRE, 8), ...trace(at, FIRE, tLand, 28), ...trace(at, tLand, tLand + TOPPLE, 10)]
      const last = out[out.length - 1]
      const vOut = Math.hypot(last.to[0] - last.from[0], last.to[1] - last.from[1]) / last.dur
      const lane: Lane = {
        segs: [
          roll([-0.5, 0], [SLOW_FROM, 0], ROLL),
          ramp([SLOW_FROM, 0], [EDGE, 0], ROLL, V_EDGE),
          fly([EDGE, 0], [0, YB], DROP_T, YB / 4),
          ...out,
          ramp(last.to, [turn * 0.5, floors], vOut, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const d = depth(since, floors)
    const landed = since - fallTime(floors)
    const bottom = floors + SLAB

    // The path in, over the coping; the ground either side of the parapet.
    rail(p, k, ink, weight, -0.5, -SHAFT - PARAPET)
    soil(p, k, ink, weight, -0.5, -SHAFT - PARAPET)
    soil(p, k, ink, weight, SHAFT + PARAPET, 0.5)
    tuft(p, k, ink, weight, -SHAFT - PARAPET - 0.05, 0.5, 0.12, -0.03)
    tuft(p, k, ink, weight, SHAFT + PARAPET + 0.05, 0.5, 0.1, 0.03)

    // The roof on its posts, behind the rail, and the beam the windlass turns on.
    for (const x of [-0.29, 0.29]) post(p, k, ink, weight, x, -0.32, FLOOR)
    outline(p, ink, weight)
    p.line(-0.29 * k, DRUM[1] * k, 0.29 * k, DRUM[1] * k)
    solid(p, ink, weight, s.color)
    p.triangle(-0.43 * k, -0.3 * k, 0, -0.485 * k, 0.43 * k, -0.3 * k)

    // The shaft's walls, down to its floor, with a brick's end showing here and there; an arch through the one on the way out.
    for (const side of [-1, 1] as const) {
      const foot = side === turn ? floors - 0.3 : bottom
      outline(p, ink, weight)
      p.line(side * SHAFT * k, 0.5 * k, side * SHAFT * k, foot * k)
      if (side === turn) p.arc(side * (SHAFT + 0.07) * k, foot * k, 0.14 * k, 0.12 * k, side > 0 ? Math.PI / 2 : 0, side > 0 ? Math.PI : Math.PI / 2)
      outline(p, ink, weight * 0.7)
      let i = 0
      for (let y = 0.62; y < foot - 0.04; y += 0.19) {
        p.line(side * SHAFT * k, y * k, side * (SHAFT + (i % 2 ? 0.05 : 0.08)) * k, y * k)
        i++
      }
    }
    // The parapet above ground, with its coping level with the rail.
    for (const side of [-1, 1]) {
      brickwork(p, k, ink, weight, bg, side * (SHAFT + PARAPET / 2), FLOOR + 0.04, 0.5, PARAPET, side)
      solid(p, ink, weight, bg)
      p.rect(side * (SHAFT + PARAPET / 2) * k, (FLOOR + 0.02) * k, (PARAPET + 0.04) * k, 0.04 * k, 0.01 * k)
    }
    // The shaft's floor, the stone the bucket comes down on, and the rail out through the arch.
    outline(p, ink, weight)
    p.line(-turn * SHAFT * k, bottom * k, turn * SHAFT * k, bottom * k)
    solid(p, ink, weight, bg)
    p.rect(-turn * ((SHAFT + STONE_X) / 2) * k, (bottom - STONE_H / 2) * k, (SHAFT - STONE_X) * k, STONE_H * k, 0.02 * k)
    rail(p, k, ink, weight, turn * (LIE_X + BH - 0.01), turn * 0.5, floors + FLOOR)
    post(p, k, ink, weight, turn * 0.42, floors + FLOOR, floors + 0.5)
    outline(p, ink, weight)
    p.line(turn * SHAFT * k, (floors + 0.5) * k, turn * 0.5 * k, (floors + 0.5) * k)

    // The windlass: the drum, the crank going round with the rope, and the pawl.
    const turnsBy = d / DRUM_R
    solid(p, ink, weight, s.color)
    p.circle(DRUM[0] * k, DRUM[1] * k, DRUM_R * 2 * k)
    p.push()
    p.translate(DRUM[0] * k, DRUM[1] * k)
    p.rotate(-turnsBy - 0.6)
    outline(p, ink, weight * 1.2)
    p.line(0, 0, CRANK * k, 0)
    solid(p, ink, weight, bg)
    p.circle(CRANK * k, 0, 0.05 * k)
    p.pop()
    p.noStroke()
    p.fill(ink)
    p.circle(DRUM[0] * k, DRUM[1] * k, 0.035 * k)
    const wound = since - fallTime(floors) - TOPPLE - LIES - RIGHTS - WINDS
    const pawl = since < 0 ? 0 : since < 0.1 ? over(since, 0, 0.1) : 1 - over(wound, 0, 0.3)
    const strain = t > T_IN && since < 0 ? 0.08 * Math.sin(t * 60) * over(t, T_IN, FIRE) : 0
    p.push()
    p.translate((DRUM[0] + 0.15) * k, (DRUM[1] - 0.005) * k)
    p.rotate(Math.PI + 0.35 + 0.8 * pawl + strain)
    outline(p, ink, weight)
    p.line(0, 0, 0.085 * k, 0)
    p.pop()

    // The rope, from the drum to the bail; slack and bowed while the bucket lies on its side.
    const b = bucketAt(t, floors, turn)
    const bail = bucketPt(b, 0, BH + 0.085)
    outline(p, ink, weight * 0.8)
    p.noFill()
    p.bezier(0, DRUM[1] * k, 0, lerp(DRUM[1], bail[1], 0.6) * k, -turn * 0.12 * b.f * k, (bail[1] + 0.3 * b.f) * k, bail[0] * k, bail[1] * k)

    // The bucket's body and bail; the ball is drawn over these, and the hoops over the ball.
    p.push()
    p.translate(b.o[0] * k, b.o[1] * k)
    p.rotate(b.lean)
    outline(p, ink, weight)
    p.arc(0, -BH * k, (BW * 2 - 0.04) * k, 0.17 * k, Math.PI, Math.PI * 2)
    solid(p, ink, weight, s.color)
    p.rect(0, (-BH / 2) * k, BW * 2 * k, BH * k, 0.015 * k)
    p.pop()

    // The thud: water off the shaft's floor, and a clack of lines off the stone.
    if (landed > 0 && landed < 0.4) {
      const f = over(landed, 0, 0.4)
      for (const [dx, h] of [
        [-0.17, 0.2],
        [-0.08, 0.3],
        [0.1, 0.26],
        [0.18, 0.18],
      ]) {
        drop(p, k, s.color, dx * (0.7 + 0.5 * f), bottom - 0.03 - h * 4 * f * (1 - f), 0.02 * (1 - f * 0.5))
      }
    }
    if (landed > 0 && landed < 0.18) {
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      const x = -turn * (SHAFT - 0.02)
      p.line(x * k, (bottom - STONE_H - 0.03) * k, (x - turn * 0.05) * k, (bottom - STONE_H - 0.09) * k)
      p.line((x + turn * 0.07) * k, (bottom - STONE_H - 0.04) * k, (x + turn * 0.07) * k, (bottom - STONE_H - 0.1) * k)
      p.pop()
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The bucket's hoops and its rim, in front of the ball: it is in the bucket, not on it.
    const b = bucketAt(t, s.floors, s.turn)
    p.push()
    p.translate(b.o[0] * k, b.o[1] * k)
    p.rotate(b.lean)
    outline(p, ink, weight * 0.9)
    for (const u of [0.07, 0.2]) p.line(-BW * k, -u * k, BW * k, -u * k)
    outline(p, ink, weight * 1.3)
    p.line((-BW - 0.012) * k, -BH * k, (BW + 0.012) * k, -BH * k)
    p.pop()
  },
})

/** A point in the bucket's own frame — `v` across it, `u` up it from its base — in the piece's. */
function bucketPt(b: { o: Pt; lean: number }, v: number, u: number): Pt {
  return [b.o[0] + v * Math.cos(b.lean) + u * Math.sin(b.lean), b.o[1] + v * Math.sin(b.lean) - u * Math.cos(b.lean)]
}

/** A strip of brickwork `w` wide from `y0` down to `y1`, centred on `x`: courses, and joints staggered course to course. */
function brickwork(p: p5, k: number, ink: string, weight: number, bg: string, x: number, y0: number, y1: number, w: number, side: number): void {
  solid(p, ink, weight, bg)
  p.rect(x * k, ((y0 + y1) / 2) * k, w * k, (y1 - y0) * k)
  outline(p, ink, weight * 0.55)
  const course = 0.095
  for (let y = y0 + course; y < y1 - 0.03; y += course) p.line((x - w / 2) * k, y * k, (x + w / 2) * k, y * k)
  let i = 0
  for (let y = y0; y < y1 - 0.03; y += course) {
    const jx = x + side * (i % 2 ? 0.2 : -0.2) * w
    if (w > 0.1) p.line(jx * k, y * k, jx * k, Math.min(y + course, y1) * k)
    i++
  }
}
