import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { drop, gardenWater } from './green'

/**
 * A garden fountain: a stone basin of water with a standpipe in the middle
 * of it, a cup on the pipe's top level with the path, water bubbling over
 * the cup. The path runs out over the basin's wall and the ball rolls into
 * the cup and corks it: the bubbling stops, the pipe shudders — and the jet
 * comes on under the ball and carries it straight up a floor on a column of
 * water, wobbling on the crown like a ping-pong ball on a garden hose. At
 * the top it hangs, bobbing; the jet leans, and the ball slides off the
 * crown onto a shelf of path a floor up and rolls on. Relieved, the jet
 * falls back into the basin in drops and goes on bubbling.
 *
 * The jet is one height, and the crown one place: the ball's lane while it
 * is aboard is that crown, a ball's radius up, so it sits on the water at
 * every instant of the rise, the wobble and the lean.
 */
/** The basin: its walls' inner faces, how thick they are, their tops and the water between them; the cup's rim, level with the path. */
const WALL = 0.31
const THICK = 0.11
const RIM = 0.28
const WATER = 0.34
const CUP = 0.11
/** The path's stub and the shelf's stake stand on the walls' copings. */
const STAKE_X = WALL + THICK / 2
/** How high the jet carries the ball: a little past the shelf, to come down onto it. */
const H = 1.12
/** What the jet does when nobody is on it. */
const BUBBLE = 0.06
/** Corked, the pipe shudders this long; then the rise, the hang at the top, and the lean that slides the ball off. */
const GURGLE = 0.11
const RISE = 0.42
const HANG = 0.08
const LEAN = 0.14
/** The jet's burst: how long it gathers, and the pace it reaches. */
const BURST = 0.05
const BURST_V = 5.2
/** The lean's push, cells per second squared, and how far the crown wobbles at full height. */
const PUSH = 12
const WOBBLE = 0.022
const BOB = 0.015
/** Where it comes down on the shelf, and where the shelf starts: clear of the ball on its way up. */
const LAND: Pt = [0.37, -1]
const SHELF_X = 0.27

const ARRIVE = arriveAt(0)
const FIRE = ARRIVE + GURGLE
const T_LEAN = RISE + HANG
const T_GO = T_LEAN + LEAN
/** How long the jet takes to fall back once the ball is off it. */
const SUBSIDE = 0.7

/** The jet's height under the ball, `since` the fire: a rush that slows to the top, and a bob once it is there. */
function lift(since: number): number {
  if (since <= 0) return 0
  // The burst gathers for an instant, to its top pace, and the column then slows all the way up.
  const burst = 0.5 * (BURST_V / BURST) * Math.min(since, BURST) ** 2
  const rest = H - 0.5 * BURST_V * BURST
  const up = burst + (since > BURST ? rest * (1 - Math.pow(1 - Math.min(1, (since - BURST) / (RISE - BURST)), (BURST_V * (RISE - BURST)) / rest)) : 0)
  // One bob while it hangs and leans: down a little and back, still at both ends.
  const bob = since > RISE ? BOB * (1 - Math.cos((2 * Math.PI * Math.min(since - RISE, HANG + LEAN)) / (HANG + LEAN))) : 0
  return up - bob
}

/** Where the crown is, side to side: wobbling more the taller the jet is, then leaning over toward the shelf. */
function sway(since: number): number {
  if (since <= 0) return 0
  const tau = Math.max(0, since - T_LEAN)
  return WOBBLE * (lift(Math.min(since, T_LEAN)) / H) * Math.sin(since * 15) + 0.5 * PUSH * tau * tau
}

/** The ball on the crown, `t` seconds into the piece. */
const ballAt = (t: number): Pt => [sway(t - FIRE), -lift(t - FIRE)]

const LANE: Lane = (() => {
  const ride = trace(ballAt, FIRE, FIRE + T_GO, 26)
  const off = ride[ride.length - 1].to
  // Off the crown at the pace the lean gave it, dropping from a standstill: the flight's arc is a quarter of its fall.
  const pace = (sway(T_GO) - sway(T_GO - 1e-4)) / 1e-4
  const flight = (LAND[0] - off[0]) / pace
  return {
    segs: [
      ...arrive([-0.5, 0], [0, 0]),
      wait([0, 0], GURGLE),
      ...ride,
      fly(off, LAND, flight, (LAND[1] - off[1]) / 4),
      fly(LAND, [LAND[0] + 0.03, -1], 0.03, 0.006),
      ramp([LAND[0] + 0.03, -1], [0.5, -1], pace, ROLL),
    ],
    fire: FIRE,
  }
})()

/** The jet as it is drawn: how tall, where its crown is, and how hard it is running (0 a bubble, 1 full). */
function jetAt(t: number): { h: number; x: number; force: number } {
  const since = t - FIRE
  const bubble = BUBBLE * (1 + 0.18 * Math.sin(t * 11))
  // Corked: the bubbling is pressed flat under the ball.
  if (since <= 0) return { h: bubble * (1 - 0.85 * over(t, ARRIVE - 0.06, ARRIVE + 0.04)), x: 0, force: 0 }
  if (since <= T_GO) return { h: lift(since), x: sway(since), force: Math.min(1, since / 0.12) }
  // Relieved: it stands a moment, swings back upright, and falls to a bubble again.
  const f = over(since, T_GO, T_GO + SUBSIDE)
  const top = lift(T_GO)
  return { h: top + (bubble - top) * easeInQuad(f), x: sway(T_GO) * (1 - easeInOutSine(over(since, T_GO, T_GO + 0.25))), force: 1 - f }
}

/** The drops off the crown: which side each falls to, how far out, and where in the cycle it starts. */
const DROPS: [number, number, number][] = [
  [-1, 0.12, 0],
  [1, 0.15, 0.17],
  [-1, 0.17, 0.41],
  [1, 0.09, 0.58],
  [-1, 0.07, 0.72],
  [1, 0.17, 0.88],
]

export const fountain = definePiece<{ color: string; water: string }>({
  name: 'fountain',
  weight: 1,
  flight: true,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const water = gardenWater(theme, ball.color)
    // The cup and the coping are never the water's colour, or the jet would seem to be made of them.
    const stone = color !== water ? color : rng.pick(theme.colors.filter((c) => c !== water && c !== ball.color)) ?? color
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color: stone, water } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const jet = jetAt(t)
    const shudder = t > ARRIVE && since < 0 ? 0.01 * Math.sin(t * 80) * over(t, ARRIVE, FIRE) : 0

    // The ground; the path in, carried out over the basin on a stub off its near wall; the shelf a
    // floor up, on a tall stake off the far one.
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    rail(p, k, ink, weight, -0.5, -CUP - 0.01)
    rail(p, k, ink, weight, SHELF_X, 0.5, -1 + FLOOR)
    outline(p, ink, weight)
    p.line(-STAKE_X * k, FLOOR * k, -STAKE_X * k, RIM * k)
    p.line(STAKE_X * k, (-1 + FLOOR) * k, STAKE_X * k, RIM * k)

    // The standpipe, from the basin's floor up to the cup.
    p.push()
    p.translate(shudder * k, 0)
    solid(p, ink, weight, bg)
    p.rect(0, ((FLOOR + 0.5) / 2 + 0.04) * k, 0.07 * k, (0.5 - FLOOR - 0.08) * k)
    p.pop()

    // The basin, cut through: water between two stone walls, a coping on each.
    p.push()
    p.noStroke()
    p.fill(s.water)
    p.rect(0, ((WATER + 0.5) / 2) * k, WALL * 2 * k, (0.5 - WATER) * k)
    p.pop()
    outline(p, ink, weight)
    p.line(-WALL * k, WATER * k, WALL * k, WATER * k)
    for (const side of [-1, 1]) {
      solid(p, ink, weight, bg)
      p.rect(side * (WALL + THICK / 2) * k, ((RIM + 0.5) / 2) * k, THICK * k, (0.5 - RIM) * k)
      solid(p, ink, weight, s.color)
      p.rect(side * (WALL + THICK / 2) * k, RIM * k, (THICK + 0.05) * k, 0.07 * k, 0.02 * k)
    }

    // The jet: a column of water from the cup to its crown, a little wider at the top, and the
    // crown itself, a cap of water spilling over on both sides under the ball. With nobody on
    // it and no pressure behind it, it is only a dome of water bubbling over the cup.
    const top = FLOOR - jet.h
    if (jet.h > 0.14) {
      const w0 = 0.035
      const w1 = 0.045 + 0.02 * jet.force
      solid(p, ink, weight, s.water)
      p.beginShape()
      p.vertex(-w0 * k, FLOOR * k)
      p.bezierVertex(-w0 * k, (FLOOR - jet.h * 0.5) * k, (jet.x - w1) * k, (top + jet.h * 0.4) * k, (jet.x - w1) * k, (top + 0.03) * k)
      p.vertex((jet.x + w1) * k, (top + 0.03) * k)
      p.bezierVertex((jet.x + w1) * k, (top + jet.h * 0.4) * k, w0 * k, (FLOOR - jet.h * 0.5) * k, w0 * k, FLOOR * k)
      p.endShape(p.CLOSE)
      crown(p, k, ink, weight, s.water, jet.x, top, 0.1 + 0.07 * jet.force)
    } else if (jet.h > 0.012) {
      solid(p, ink, weight, s.water)
      p.arc(0, FLOOR * k, (CUP * 2 - 0.05) * k, jet.h * 2 * k, Math.PI, Math.PI * 2, p.CHORD)
    }

    // The drops off the crown, falling back into the basin: only while the jet is up.
    if (jet.force > 0.05 && jet.h > 0.3) {
      for (const [side, reach, phase] of DROPS) {
        const f = (((t * 1.5 + phase) % 1) + 1) % 1
        // Off the crown's rim and out, to come down on the water and never on the garden.
        const from = jet.x + side * 0.12
        const to = Math.max(-WALL + 0.04, Math.min(WALL - 0.04, from + side * reach))
        const y = top + 0.04 + (WATER - top) * f * f
        if (y < WATER - 0.03) drop(p, k, s.water, from + (to - from) * f, y, 0.024 * jet.force)
      }
    }

    // The cup on the pipe's top, in front of the water it holds.
    p.push()
    p.translate(shudder * k, 0)
    solid(p, ink, weight, s.color)
    p.quad(-CUP * k, FLOOR * k, CUP * k, FLOOR * k, 0.045 * k, (FLOOR + 0.1) * k, -0.045 * k, (FLOOR + 0.1) * k)
    p.pop()
  },
})

/** The jet's crown at (x, y): a cap of water `r` wide each way, curling over and down at both rims. */
function crown(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, r: number): void {
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex((x - r) * k, (y + r * 0.62) * k)
  p.bezierVertex((x - r * 1.05) * k, (y + r * 0.1) * k, (x - r * 0.55) * k, (y - r * 0.12) * k, x * k, (y - r * 0.12) * k)
  p.bezierVertex((x + r * 0.55) * k, (y - r * 0.12) * k, (x + r * 1.05) * k, (y + r * 0.1) * k, (x + r) * k, (y + r * 0.62) * k)
  p.bezierVertex((x + r * 0.8) * k, (y + r * 0.3) * k, (x + r * 0.5) * k, (y + r * 0.3) * k, (x + r * 0.32) * k, (y + r * 0.5) * k)
  p.vertex((x - r * 0.32) * k, (y + r * 0.5) * k)
  p.bezierVertex((x - r * 0.5) * k, (y + r * 0.3) * k, (x - r * 0.8) * k, (y + r * 0.3) * k, (x - r) * k, (y + r * 0.62) * k)
  p.endShape(p.CLOSE)
}
