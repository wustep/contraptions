import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, burst, definePiece, fly, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { drop, leaf, soil, tuft } from './green'

/**
 * A shishi-odoshi, the deer scarer: a bamboo rocker pinned to a post at the
 * edge of a terrace, its tail down on a stone and its mouth — cut at a long
 * slant into a scoop — up at the rail's end, under a thin spout that drips
 * into it all day. The ball rolls onto the scoop and down it, up against
 * the end of the culm, and stops; its weight, out in front of the pivot,
 * brings the mouth down — slowly, then all at once — until the culm lands
 * on the terrace's coping; the ball rolls off the scoop's tip and drops to
 * the rail below, heading back the way it came, with the water the scoop
 * was holding. Empty, the rocker swings back, and its tail cracks on the
 * stone. Clack.
 *
 * The ball is wider than the culm's bore, so it rides on the scoop's two
 * rims with its foot a little way into it. Its lane is traced from the same
 * tilt the rocker is drawn with, and it leaves the tip along the scoop's own
 * line, at the pace it had rolling down it.
 */
const PIVOT: Pt = [0.1, 0.2]
/** Along the culm from the pivot: the scoop's tip, the step where the whole culm begins, and the tail. */
const TIP = -0.4
const STEP = -0.1
const TAIL = 0.36
/** The culm's outer radius and its bore. */
const RO = 0.085
const BORE = 0.07
/** How far the ball's centre stands off the culm's line, riding the scoop's rims. */
const RIDE = Math.sqrt(R * R - BORE * BORE)
/** Tail down on the stone; culm down on the coping. */
const REST = 0.24
const DOWN = -1.1
/** The ball's seat, against the step's top corner; and where it is clear of the tip. */
const SEAT = STEP - Math.sqrt(R * R - (RIDE - RO) * (RIDE - RO))
const CLEAR = TIP - 0.03

/** A point `r` along the culm and `d` below its line, with the rocker tilted `a`. */
const onCulm = (a: number, r: number, d = 0): Pt => [PIVOT[0] + r * Math.cos(a) - d * Math.sin(a), PIVOT[1] + r * Math.sin(a) + d * Math.cos(a)]
/** The ball's centre riding the scoop. */
const onScoop = (a: number, r: number): Pt => onCulm(a, r, -RIDE)

/** Onto the scoop's tip off the rail's end, and down it to the step, slowing. */
const AT_TIP = onScoop(REST, TIP + 0.03)
const AT_SEAT = onScoop(REST, SEAT)
const T_TIP = (AT_TIP[0] + 0.5) / ROLL
const T_SEAT = T_TIP + Math.hypot(AT_SEAT[0] - AT_TIP[0], AT_SEAT[1] - AT_TIP[1]) / (ROLL / 2)
/** The rocker goes over; the ball starts down the scoop once it is past level, and is off the tip a moment after the culm lands. */
const OVER = 0.45
const T_DOWN = T_SEAT + OVER
const ROLL_FROM = T_SEAT + OVER * 0.6
const ROLLS = 0.28
const FIRE = ROLL_FROM + ROLLS
/** Empty, it waits a moment and swings back; the tail lands on the stone. */
const WAITS = 0.12
const BACK = 0.5
const T_CLACK = FIRE + WAITS + BACK

function tiltAt(t: number): number {
  if (t < T_SEAT) return REST
  if (t < T_DOWN) return REST + (DOWN - REST) * easeInQuad(over(t, T_SEAT, T_DOWN))
  if (t < FIRE + WAITS) return DOWN + 0.06 * Math.exp(-(t - T_DOWN) * 16) * Math.abs(Math.sin((t - T_DOWN) * 30))
  if (t < T_CLACK) return DOWN + (REST - DOWN) * easeInQuad(over(t, FIRE + WAITS, T_CLACK))
  const s = t - T_CLACK
  return REST - 0.1 * Math.exp(-s * 9) * Math.abs(Math.sin(s * 17))
}
/** How far along the culm the ball is. */
const alongAt = (t: number): number => SEAT + (CLEAR - SEAT) * easeInQuad(over(t, ROLL_FROM, FIRE))
const ballAt = (t: number): Pt => onScoop(tiltAt(t), alongAt(t))

/** Off the tip along the scoop's line, and down to the rail below under cartoon gravity. */
const G = 16
const OUT = onScoop(DOWN, CLEAR)
const V_OUT = (2 * (SEAT - CLEAR)) / ROLLS
const VX = -V_OUT * Math.cos(DOWN)
const VY = -V_OUT * Math.sin(DOWN)
const FALL_T = (-VY + Math.sqrt(VY * VY + 2 * G * (1 - OUT[1]))) / G
const LAND: Pt = [OUT[0] + VX * FALL_T, 1]
/** `fly` leaves along its chord less four times its arc: this arc gives it the scoop's own line. */
const ARC = (G * FALL_T * FALL_T) / 8
/** The terrace: the coping the culm's underside lands on, and the face under it. */
const COPING = 0.455
const LANDS = (COPING - PIVOT[1] - RO * Math.cos(DOWN)) / Math.sin(DOWN)
const FACE = onCulm(DOWN, LANDS, RO)[0] - 0.01
const SPOUT: Pt = [-0.15, -0.3]

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], AT_TIP, ROLL),
    ramp(AT_TIP, AT_SEAT, ROLL, 0),
    ...trace(ballAt, T_SEAT, ROLL_FROM, 8),
    ...trace(ballAt, ROLL_FROM, FIRE, 12),
    fly(OUT, LAND, FALL_T, ARC),
    ramp(LAND, [-0.5, 1], Math.abs(VX), ROLL),
  ],
  fire: FIRE,
}

export const bamboo = definePiece<{ color: string }>({
  name: 'bamboo',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [-1, 1])) return null
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const a = tiltAt(t)
    const clack = t - T_CLACK

    // The rail in, to the scoop's tip; the terrace the rocker stands on, its face going down to the garden below.
    const railEnd = onCulm(REST, TIP)[0] - 0.015
    rail(p, k, ink, weight, -0.5, railEnd)
    post(p, k, ink, weight, railEnd - 0.01, FLOOR, 1.5)
    soil(p, k, ink, weight, FACE + 0.1, 0.5)
    outline(p, ink, weight)
    p.line(FACE * k, 0.5 * k, (FACE + 0.1) * k, 0.5 * k)
    p.line(FACE * k, 0.5 * k, FACE * k, 1.5 * k)
    outline(p, ink, weight * 0.7)
    for (let i = 0; i < 5; i++) p.line(FACE * k, (0.66 + i * 0.19) * k, (FACE + (i % 2 ? 0.05 : 0.08)) * k, (0.66 + i * 0.19) * k)
    solid(p, ink, weight, bg)
    p.rect((FACE + 0.05) * k, (COPING + 0.0225) * k, 0.13 * k, 0.045 * k, 0.012 * k)
    // The rail below, and its ground.
    rail(p, k, ink, weight, -0.5, FACE, 1 + FLOOR)
    soil(p, k, ink, weight, -0.5, FACE, 1.5)

    // The spout on its post, behind everything, dripping into the scoop.
    post(p, k, ink, weight, 0.38, -0.42, 0.5)
    p.push()
    p.translate(0.41 * k, -0.4 * k)
    p.rotate(Math.atan2(SPOUT[1] + 0.4, SPOUT[0] - 0.41))
    solid(p, ink, weight, s.color)
    const reach = Math.hypot(SPOUT[0] - 0.41, SPOUT[1] + 0.4)
    p.rect((reach / 2) * k, 0, reach * k, 0.05 * k, 0.012 * k)
    p.pop()
    const catchY = onCulm(a, (SPOUT[0] - PIVOT[0]) / Math.cos(a), 0)[1]
    for (let i = 0; i < 2; i++) {
      const f = (((t * 1.3 + i * 0.5) % 1) + 1) % 1
      const y = SPOUT[1] + 0.05 + 0.9 * f * f
      if (y < Math.min(0.4, Math.max(0.05, catchY))) drop(p, k, s.color, SPOUT[0] + 0.01, y, 0.016)
    }

    // The stone the tail rests on, and the post the rocker is pinned to.
    const tail = onCulm(REST, TAIL - 0.07, RO)
    solid(p, ink, weight, bg)
    p.arc(tail[0] * k, 0.5 * k, 0.26 * k, (0.5 - tail[1]) * 2 * k, Math.PI, Math.PI * 2, p.CHORD)
    tuft(p, k, ink, weight, 0.2, 0.5, 0.09, -0.02)
    post(p, k, ink, weight, PIVOT[0], PIVOT[1], 0.5)

    rocker(p, k, ink, weight, s.color, a, false)
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.045 * k)

    // The water the scoop was holding goes off the tip with the ball.
    if (since > -0.1 && since < 0.45) {
      const f = since + 0.1
      for (let i = 0; i < 4; i++) {
        const d = f - i * 0.035
        if (d < 0) continue
        const x = OUT[0] + 0.06 + VX * 0.6 * d - 0.025 * i
        const y = OUT[1] + 0.12 + VY * 0.8 * d + (G / 2) * d * d
        if (y < 1 + FLOOR - 0.02) drop(p, k, s.color, x, y, 0.018)
      }
    }
    // The clack: the tail on the stone.
    if (clack > 0 && clack < 0.22) {
      const f = over(clack, 0, 0.22)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      burst(p, (tail[0] + 0.05) * k, (tail[1] - 0.02) * k, (0.06 + 0.05 * f) * k, (0.1 + 0.08 * f) * k, 3, -1.9)
      p.pop()
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The scoop's near rim, in front of the ball's foot: it rides in the scoop, not on it.
    rocker(p, k, ink, weight, s.color, tiltAt(t), true)
  },
})

/**
 * The rocker about its pivot: a culm with raised nodes and a leaf, closed
 * at the tail, its front cut away to a scoop with the bore showing dark at
 * the step. `front` draws only the scoop, which stands before the ball's foot.
 */
function rocker(p: p5, k: number, ink: string, weight: number, color: string, a: number, front: boolean): void {
  p.push()
  p.translate(PIVOT[0] * k, PIVOT[1] * k)
  p.rotate(a)
  if (!front) {
    leaf(p, k, ink, weight, color, 0.2, -RO, 0.13, -0.9, 0.36)
    solid(p, ink, weight, color)
    p.rect(((STEP + TAIL) / 2) * k, 0, (TAIL - STEP) * k, RO * 2 * k, 0.02 * k)
    for (const x of [0.04, 0.2, TAIL - 0.015]) p.rect(x * k, 0, 0.03 * k, (RO * 2 + 0.03) * k, 0.012 * k)
    solid(p, ink, weight, ink)
    p.rect((STEP + 0.012) * k, (-RO / 2) * k, 0.024 * k, RO * k)
  }
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex((STEP + 0.02) * k, 0)
  p.vertex((TIP + 0.05) * k, 0)
  p.bezierVertex(TIP * k, 0, TIP * k, RO * 0.5 * k, (TIP + 0.04) * k, RO * k)
  p.vertex((STEP + 0.02) * k, RO * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight)
  p.pop()
}
