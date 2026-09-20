import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, roll, trace, wait, type Lane, type Pt } from '../../parts'
import { gardenWater, waterHue } from './green'

/**
 * A garden fountain: a stone basin of water, a pedestal standing in the
 * middle of it, and a cup on the pedestal's top level with the path, water
 * welling up out of the cup and running down off its rim. The path runs out
 * over the basin's wall to the cup, and the ball rolls over the rim and beds
 * down into it like a cork: the welling stops, the running stops, the cup
 * shudders and spits from under the ball at both sides — and the jet comes
 * on under it and carries it straight up a floor on a column of water,
 * wobbling on the crown like a ping-pong ball on a garden hose, the water
 * off the crown falling back into the basin in a stream either side of it.
 * At the top it hangs, bobbing; the jet leans, and the ball slides off the
 * crown onto a shelf of path a floor up and rolls on. Relieved, the jet
 * falls back into the cup and goes on welling.
 *
 * The jet is one height, and the crown one place: the ball's lane while it
 * is aboard is that crown, so it sits on the water at every instant of the
 * rise, the wobble and the lean. Water is the one thing here with no ink
 * round it, so it is never taken for a thing.
 */
/** The basin, cut through: its walls' outer and inner faces, their tops, its floor, and the water between them. */
const OUTER = 0.47
const INNER = 0.39
const RIM = 0.27
const BED = 0.45
const WATER = 0.325
/** The cup: half its width at the rim, which is level with the path; its depth; and how far under the path's line the ball beds into it. */
const CUP = 0.16
const DEEP = 0.11
const SEAT = 0.035
/** How high the jet carries the ball: a little past the shelf, to come down onto it. */
const H = 1.12
/** What the water does in the cup when nobody is on it. */
const WELL = 0.055
/** Corked, the cup shudders and spits this long; then the rise, the hang at the top, and the lean that slides the ball off. */
const GURGLE = 0.2
const RISE = 0.36
const HANG = 0.08007
const LEAN = 0.13
/** The jet's burst: how long it gathers, and the pace it reaches. */
const BURST = 0.05
const BURST_V = 5.6
/** The lean's push, cells per second squared, and how far the crown wobbles at full height. */
const PUSH = 13
const WOBBLE = 0.02
const BOB = 0.015
/** Where it comes down on the shelf, and where the shelf starts: clear of the ball on its way up, and of the water coming down. */
const LAND: Pt = [0.39, -1]
const SHELF_X = 0.29
/** Where the two streams off the crown come down in the basin, and what pulls them there. */
const FALL_X = 0.26
const G_WATER = 9

/** Over the cup's rim and down into it, to a stop. */
const BED_IN = ramp([-CUP, 0], [0, SEAT], ROLL, 0)
const ARRIVE = (0.5 - CUP) / ROLL + BED_IN.dur
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
const ballAt = (t: number): Pt => [sway(t - FIRE), SEAT - lift(t - FIRE)]

const LANE: Lane = (() => {
  const ride = trace(ballAt, FIRE, FIRE + T_GO, 26)
  const off = ride[ride.length - 1].to
  // Off the crown at the pace the lean gave it, dropping from a standstill: the flight's arc is a quarter of its fall.
  const pace = (sway(T_GO) - sway(T_GO - 1e-4)) / 1e-4
  const flight = (LAND[0] - off[0]) / pace
  return {
    segs: [
      roll([-0.5, 0], [-CUP, 0], ROLL),
      BED_IN,
      wait([0, SEAT], GURGLE),
      ...ride,
      fly(off, LAND, flight, (LAND[1] - off[1]) / 4),
      fly(LAND, [LAND[0] + 0.03, -1], 0.03, 0.006),
      ramp([LAND[0] + 0.03, -1], [0.5, -1], pace, ROLL),
    ],
    fire: FIRE,
  }
})()

/** The jet as it is drawn: how tall, where its crown is, how hard it is running (0 a welling, 1 full), and how long it has been up. */
function jetAt(t: number): { h: number; x: number; force: number; up: number } {
  const since = t - FIRE
  const well = WELL * (1 + 0.18 * Math.sin(t * 11))
  // Corked: the welling is pressed flat under the ball as it beds in.
  if (since <= 0) return { h: well * (1 - over(t, ARRIVE - 0.08, ARRIVE)), x: 0, force: 0, up: 0 }
  if (since <= T_GO) return { h: lift(since), x: sway(since), force: Math.min(1, since / 0.12), up: since }
  // Relieved: it stands a moment, swings back upright, and falls to a welling again.
  const f = over(since, T_GO, T_GO + SUBSIDE)
  const top = lift(T_GO)
  return { h: top + (well - top) * easeInQuad(f), x: sway(T_GO) * (1 - easeInOutSine(over(since, T_GO, T_GO + 0.25))), force: 1 - f, up: since }
}

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
    // The stone is never the water's hue, or the jet would seem to be made of it.
    const hue = waterHue(theme)
    const stone = color !== hue ? color : rng.pick(theme.colors.filter((c) => c !== hue && c !== ball.color)) ?? color
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color: stone, water: gardenWater(theme, ball.color) } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const jet = jetAt(t)
    const corked = t > ARRIVE && since <= 0
    const shudder = corked ? 0.009 * Math.sin(t * 80) * over(t, ARRIVE, FIRE) : 0

    // The ground; the path in, carried out over the basin on a stake off its near wall; the shelf a floor up on its own post.
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    rail(p, k, ink, weight, -0.5, -CUP - 0.01)
    p.line(-(OUTER + INNER) * 0.5 * k, FLOOR * k, -(OUTER + INNER) * 0.5 * k, RIM * k)
    rail(p, k, ink, weight, SHELF_X, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.43, -1 + FLOOR, -0.5)

    // The basin, cut through: one trough of stone, and the water standing in it.
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (const [x, y] of [
      [-OUTER, RIM],
      [-INNER, RIM],
      [-INNER, BED],
      [INNER, BED],
      [INNER, RIM],
      [OUTER, RIM],
      [OUTER - 0.03, 0.5],
      [-OUTER + 0.03, 0.5],
    ])
      p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(s.water)
    p.rect(0, ((WATER + BED) / 2) * k, (INNER * 2 - weight / k) * k, (BED - WATER) * k)
    outline(p, ink, weight * 0.8)
    p.line(-INNER * k, WATER * k, INNER * k, WATER * k)

    // The pedestal, standing in the water: a foot, and a shaft that swells under the cup.
    p.push()
    p.translate(shudder * k, 0)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.09 * k, BED * k)
    p.vertex(-0.09 * k, (BED - 0.035) * k)
    p.bezierVertex(-0.02 * k, (BED - 0.06) * k, -0.035 * k, (FLOOR + DEEP + 0.05) * k, -0.07 * k, (FLOOR + DEEP - 0.01) * k)
    p.vertex(0.07 * k, (FLOOR + DEEP - 0.01) * k)
    p.bezierVertex(0.035 * k, (FLOOR + DEEP + 0.05) * k, 0.02 * k, (BED - 0.06) * k, 0.09 * k, (BED - 0.035) * k)
    p.vertex(0.09 * k, BED * k)
    p.endShape(p.CLOSE)
    p.pop()

    // The water. None of it has ink round it.
    p.noStroke()
    p.fill(s.water)
    const top = FLOOR + SEAT - jet.h
    if (since <= 0) {
      // Welling up out of the cup and running down off its rim both sides, until the ball corks it.
      if (jet.h > 0.004) {
        p.arc(0, (FLOOR + 0.005) * k, (CUP * 2 - 0.07) * k, jet.h * 2 * k, Math.PI, Math.PI * 2, p.CHORD)
        const run = jet.h / WELL
        for (const side of [-1, 1]) p.rect(side * (CUP + 0.012) * k, ((FLOOR + WATER) / 2 + 0.01) * k, 0.028 * run * k, (WATER - FLOOR - 0.02) * k, 0.014 * k)
      }
      // Corked: it spits from under the ball at both sides of the rim, harder as the pressure comes on.
      if (corked) {
        const press = over(t, ARRIVE, FIRE)
        const reach = (0.07 + 0.13 * press) * (0.8 + 0.2 * Math.sin(t * 70))
        spit(p, k, s.water, shudder, -1, reach)
        spit(p, k, s.water, shudder, 1, reach)
      }
    } else if (jet.h > 0.1) {
      // The column, from the cup to the crown, leaning where the crown leans.
      const w0 = 0.042
      const w1 = 0.034 + 0.012 * jet.force
      p.beginShape()
      p.vertex(-w0 * k, (FLOOR + 0.04) * k)
      p.bezierVertex(-w0 * k, (FLOOR - jet.h * 0.5) * k, (jet.x - w1) * k, (top + jet.h * 0.4) * k, (jet.x - w1) * k, (top + 0.03) * k)
      p.vertex((jet.x + w1) * k, (top + 0.03) * k)
      p.bezierVertex((jet.x + w1) * k, (top + jet.h * 0.4) * k, w0 * k, (FLOOR - jet.h * 0.5) * k, w0 * k, (FLOOR + 0.04) * k)
      p.endShape(p.CLOSE)
      // The crown: a cushion of water under the ball, and a stream off each end of it falling back into the basin,
      // as long as the water has had time to fall.
      const half = 0.085 + 0.025 * jet.force
      p.ellipse(jet.x * k, (top + 0.012) * k, half * 2 * k, 0.07 * k)
      const foot = Math.min(WATER, top + 0.03 + 0.5 * G_WATER * jet.up * jet.up)
      for (const side of [-1, 1]) stream(p, k, s.water, jet.x + side * (half - 0.015), top + 0.015, side * FALL_X, foot, 0.058 * (0.55 + 0.45 * jet.force))
      // Where they come down: a ring of spray on the water.
      if (foot >= WATER) {
        const f = (t * 3) % 1
        for (const side of [-1, 1]) p.ellipse(side * FALL_X * k, (WATER - 0.004) * k, (0.06 + 0.06 * f) * k, 0.03 * (1 - f) * jet.force * k)
      }
    } else {
      p.arc(0, (FLOOR + 0.005) * k, (CUP * 2 - 0.07) * k, jet.h * 2 * k, Math.PI, Math.PI * 2, p.CHORD)
    }
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    // The cup on the pedestal's top, in front of the ball bedded in it and of the water it holds.
    const shudder = t > ARRIVE && since <= 0 ? 0.009 * Math.sin(t * 80) * over(t, ARRIVE, FIRE) : 0
    p.push()
    p.translate(shudder * k, 0)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-CUP * k, FLOOR * k)
    p.vertex(CUP * k, FLOOR * k)
    p.bezierVertex((CUP - 0.01) * k, (FLOOR + DEEP * 0.7) * k, 0.09 * k, (FLOOR + DEEP) * k, 0.06 * k, (FLOOR + DEEP) * k)
    p.vertex(-0.06 * k, (FLOOR + DEEP) * k)
    p.bezierVertex(-0.09 * k, (FLOOR + DEEP) * k, (-CUP + 0.01) * k, (FLOOR + DEEP * 0.7) * k, -CUP * k, FLOOR * k)
    p.endShape(p.CLOSE)
    p.pop()
  },
})

/** Water spat out from under the corked ball over the cup's rim on one `side`, `reach` cells out: a short arc, up and over. */
function spit(p: p5, k: number, color: string, x: number, side: number, reach: number): void {
  p.push()
  p.noFill()
  p.stroke(color)
  p.strokeWeight(0.034 * k)
  p.beginShape()
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    p.vertex((x + side * (R * 0.75 + reach * u)) * k, (FLOOR - 0.005 - reach * 1.1 * u + reach * 1.5 * u * u) * k)
  }
  p.endShape()
  p.pop()
}

/**
 * A stream of falling water from (x0, y0), level as it leaves, making for
 * `x1` at the basin's water, and drawn down to `y1` at most: the whole fall
 * is one parabola, and the stream is as much of it as the water has had
 * time to cover. It thins as it falls.
 */
function stream(p: p5, k: number, color: string, x0: number, y0: number, x1: number, y1: number, width: number): void {
  if (y1 <= y0) return
  const whole = WATER - y0
  const reach = Math.sqrt((y1 - y0) / whole)
  const n = 20
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = (reach * i) / n
    const tx = x1 - x0
    const ty = 2 * whole * u
    const len = Math.hypot(tx, ty) || 1
    const half = (width / 2) * (1 - 0.45 * u)
    const x = x0 + tx * u
    const y = y0 + whole * u * u
    left.push([x + (ty / len) * half, y - (tx / len) * half])
    right.push([x - (ty / len) * half, y + (tx / len) * half])
  }
  p.push()
  p.noStroke()
  p.fill(color)
  p.beginShape()
  for (const [x, y] of left) p.vertex(x * k, y * k)
  for (const [x, y] of right.reverse()) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  const end = reach
  p.circle((x0 + (x1 - x0) * end) * k, (y0 + whole * end * end) * k, width * (1 - 0.45 * end) * k)
  p.pop()
}
