import { outline, solid } from '../../../../../../src/core/draw'
import { easeInOutSine, easeOutQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, laneAt, mixHex, over, rail, ramp, roll, trace, wait, type Lane, type Pt } from '../../../parts'
import { G, lob, spray } from './parts-e'
import { iceBlue, snowWhite } from './snow'

/**
 * A fishing hole. A tarn cut through from the side: a basin of water a
 * floor deep under a sheet of ice, level with the track, with two holes cut
 * in it and a tip-up standing by the first, its flag arm cocked down over
 * the hole on a line. The ball rolls out over the ice and drops through the
 * first hole: a splash, the line is snatched, the flag springs up. It dives
 * under the ice, slowing, and fetches up nose to nose with a big fish lying
 * on the bed. The fish looks at it, turns round, and slaps it with its tail:
 * up through the second hole in a spout, over the hole's edge, and down
 * onto the ice beyond. The fish watches it go.
 *
 * The fish is one drawing posed by a place, a turn and a tail; the ball's
 * dive is one curve run at a slowing pace, and its flight out of the hole
 * is the throw the slap gave it, under gravity.
 */
/** The basin, the ice on it, and the water's level in the holes. */
const BANK: [number, number] = [-0.4, 1.4]
const BED = 1.4
const ICE = 0.1
const SURFACE = FLOOR + ICE * 0.7
const HOLE1: [number, number] = [-0.26, 0.2]
const HOLE2: [number, number] = [0.54, 0.86]
/** Off the ice's edge, level, and falling till it is in the water. */
const X_EDGE = HOLE1[0] + 0.02
const FALL = 0.09
const IN: Pt = [X_EDGE + ROLL * FALL, (G * FALL * FALL) / 2]
/** The dive: a curve from there, under the ice, to the fish's nose. */
const BEND: Pt = [0.0, 0.62]
const DEEP: Pt = [0.42, 0.95]
const DIVE = 0.55
const HOVER = 0.32
/** The slap: up through the middle of the second hole, losing way in the water. */
const OUT: Pt = [(HOLE2[0] + HOLE2[1]) / 2, SURFACE - 0.02]
const SLAP = 6.2
const BREACH = 4.7
const X_LAND = (() => {
  const d = Math.hypot(OUT[0] - DEEP[0], OUT[1] - DEEP[1])
  const up = (BREACH * (DEEP[1] - OUT[1])) / d
  const along = (BREACH * (OUT[0] - DEEP[0])) / d
  return OUT[0] + (along * (up + Math.sqrt(up * up - 2 * G * OUT[1]))) / G
})()
const AIR = (X_LAND - OUT[0]) / ((BREACH * (OUT[0] - DEEP[0])) / Math.hypot(OUT[0] - DEEP[0], OUT[1] - DEEP[1]))

const T_EDGE = (X_EDGE + 0.5) / ROLL
const T_IN = T_EDGE + FALL
const T_DEEP = T_IN + DIVE
const FIRE = T_DEEP + HOVER

/** The dive's curve, `f` of the way along it. */
const diveAt = (f: number): Pt => [(1 - f) ** 2 * IN[0] + 2 * f * (1 - f) * BEND[0] + f * f * DEEP[0], (1 - f) ** 2 * IN[1] + 2 * f * (1 - f) * BEND[1] + f * f * DEEP[1]]

const LANE: Lane = (() => {
  const shot = ramp(DEEP, OUT, SLAP, BREACH)
  const along = (X_LAND - OUT[0]) / AIR
  return {
    segs: [
      roll([-0.5, 0], [X_EDGE, 0], ROLL),
      lob([X_EDGE, 0], IN, FALL),
      ...trace((t) => diveAt(easeOutQuad((t - T_IN) / DIVE)), T_IN, T_DEEP, 24),
      wait(DEEP, HOVER),
      shot,
      lob(OUT, [X_LAND, 0], AIR),
      lob([X_LAND, 0], [X_LAND + 0.07, 0], 0.05),
      ramp([X_LAND + 0.07, 0], [1.5, 0], Math.max(along, 1.8), ROLL),
    ],
    fire: FIRE,
  }
})()
const T_OUT = FIRE + LANE.segs[LANE.segs.length - 4].dur

/** The fish: where its middle is, how far round it has turned (1 facing the ball's way in, -1 facing on), and its tail's set. */
const FISH_Y = 1.0
const NOSE = 0.27
function fishAt(t: number): { x: number; turn: number; tail: number } {
  const f = easeInOutSine(over(t, T_DEEP - 0.1, T_DEEP + 0.2))
  // Lying nose to the ball as it comes; turned about, its tail is under the ball's back.
  const x = DEEP[0] + R + 0.03 + NOSE - f * 0.16
  const cock = over(t, T_DEEP + 0.16, FIRE - 0.07)
  const tail = t < FIRE - 0.07 ? -0.65 * cock : t < FIRE ? -0.65 + 1.5 * over(t, FIRE - 0.07, FIRE) : 0.85 * Math.exp(-(t - FIRE) * 5) * Math.cos((t - FIRE) * 9) + 0.12 * Math.sin(t * 2.3)
  return { x, turn: Math.cos(Math.PI * f), tail: t < T_DEEP - 0.1 ? 0.12 * Math.sin(t * 2.3) : tail }
}

export const icehole = definePiece<{ color: string; water: string }>({
  name: 'icehole',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 0])) return null
    const ice = iceBlue(theme)
    // Water is the palette's bluest, a little deeper when the ball is that colour; the fish is none of water, snow or ball.
    const water = ball.color === ice ? mixHex(ice, theme.ink, 0.25) : ice
    const spare = theme.colors.filter((c) => c !== ice && c !== ball.color && c !== snowWhite(theme))
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: spare.includes(color) ? color : spare[0] ?? color, water } }
  },
  draw: (p, s, { k, t, ink, weight, theme }) => {
    const white = snowWhite(theme)
    const here = laneAt(LANE, Math.max(0, t))

    // The basin, cut through: its water inside one line, the surface showing in the holes.
    solid(p, ink, weight, s.water)
    p.beginShape()
    p.vertex(BANK[0] * k, SURFACE * k)
    p.vertex(BANK[0] * k, (BED - 0.12) * k)
    p.quadraticVertex(BANK[0] * k, BED * k, (BANK[0] + 0.12) * k, BED * k)
    p.vertex((BANK[1] - 0.12) * k, BED * k)
    p.quadraticVertex(BANK[1] * k, BED * k, BANK[1] * k, (BED - 0.12) * k)
    p.vertex(BANK[1] * k, SURFACE * k)
    p.endShape(p.CLOSE)

    // The fish, on the bed: a body, a tail that sets and slaps, and an eye that follows the ball.
    const fish = fishAt(t)
    p.push()
    p.translate(fish.x * k, FISH_Y * k)
    p.scale(Math.abs(fish.turn) < 0.08 ? 0.08 * Math.sign(fish.turn || 1) : fish.turn, 1)
    solid(p, ink, weight, s.color)
    p.push()
    p.translate(0.2 * k, 0)
    p.rotate(-fish.tail)
    p.beginShape()
    p.vertex(0, 0)
    p.vertex(0.24 * k, -0.15 * k)
    p.quadraticVertex(0.17 * k, 0, 0.24 * k, 0.15 * k)
    p.endShape(p.CLOSE)
    p.pop()
    p.beginShape()
    p.vertex(-NOSE * k, 0)
    p.bezierVertex(-0.14 * k, -0.17 * k, 0.1 * k, -0.15 * k, 0.24 * k, -0.02 * k)
    p.vertex(0.24 * k, 0.02 * k)
    p.bezierVertex(0.1 * k, 0.15 * k, -0.14 * k, 0.17 * k, -NOSE * k, 0)
    p.endShape(p.CLOSE)
    p.triangle(-0.04 * k, -0.125 * k, 0.1 * k, -0.11 * k, 0.07 * k, -0.2 * k)
    const eye: Pt = [-0.15, -0.045]
    solid(p, ink, weight * 0.8, white)
    p.circle(eye[0] * k, eye[1] * k, 0.075 * k)
    // The pupil leans toward the ball, in the fish's own hand.
    const hand = fish.turn < 0 ? -1 : 1
    const dx = (here.x - (fish.x + hand * eye[0])) * hand
    const dy = here.y - (FISH_Y + eye[1])
    const far = Math.hypot(dx, dy) || 1
    p.noStroke()
    p.fill(ink)
    p.circle((eye[0] + (dx / far) * 0.014) * k, (eye[1] + (dy / far) * 0.014) * k, 0.034 * k)
    p.pop()

    // The ice, in three slabs, level with the track.
    rail(p, k, ink, weight, -0.5, BANK[0])
    rail(p, k, ink, weight, BANK[1], 1.5)
    solid(p, ink, weight, white)
    for (const [x0, x1] of [
      [BANK[0], HOLE1[0]],
      [HOLE1[1], HOLE2[0]],
      [HOLE2[1], BANK[1]],
    ]) {
      p.rect(((x0 + x1) / 2) * k, (FLOOR + ICE / 2) * k, (x1 - x0) * k, ICE * k, 0.03 * k)
    }

    // The tip-up by the first hole: a post, a line down into the water, and the flag arm, cocked over the hole till the line is snatched.
    const post = HOLE1[1] + 0.05
    const sprung = t < T_IN ? 0 : 1 - Math.exp(-(t - T_IN) * 9) * Math.cos((t - T_IN) * 21)
    const sway = t < T_IN ? 0 : 0.07 * Math.exp(-(t - T_IN) * 3) * Math.sin((t - T_IN) * 11)
    outline(p, ink, weight * 0.7)
    p.line((HOLE1[1] - 0.025) * k, FLOOR * k, (HOLE1[1] - 0.05 + sway) * k, 0.62 * k)
    p.fill(ink)
    p.circle((HOLE1[1] - 0.05 + sway) * k, 0.64 * k, 0.04 * k)
    outline(p, ink, weight)
    p.line(post * k, FLOOR * k, post * k, (FLOOR - 0.24) * k)
    p.line((HOLE1[1] - 0.025) * k, FLOOR * k, post * k, (FLOOR - 0.06) * k)
    p.push()
    p.translate(post * k, (FLOOR - 0.24) * k)
    p.rotate((Math.PI / 2) * sprung)
    p.line(0, 0, -0.22 * k, 0)
    solid(p, ink, weight * 0.8, s.color)
    p.triangle(-0.22 * k, 0, -0.1 * k, 0, -0.16 * k, -0.11 * k)
    p.pop()

    // A splash going in, and a spout coming out.
    spray(p, k, s.water, IN[0], SURFACE, over(t, T_IN, T_IN + 0.4), 1)
    spray(p, k, s.water, OUT[0], SURFACE, over(t, T_OUT, T_OUT + 0.5), 1.5)
  },
})
