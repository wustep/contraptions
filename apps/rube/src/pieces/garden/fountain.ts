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
 * off the crown thrown out either side of it and falling back into the
 * basin. At the top it hangs, bobbing; the jet leans, and the ball slides
 * off the crown onto a shelf of path a floor up and rolls on. Relieved, the
 * jet falls back into the cup and goes on welling.
 *
 * The jet is one height, and the crown one place: the ball's lane while it
 * is aboard is that crown, so it sits on the water at every instant of the
 * rise, the wobble and the lean. The water that falls is drops, each let go
 * of the crown where the crown then was and left to gravity: slow and
 * shoulder to shoulder at the top, where they run together into a stream,
 * and pulled apart into beads by the time they reach the basin; when the
 * jet drops, what is already in the air goes on falling from up there.
 * Water is always blue, and the one thing here with no ink round it, so it
 * is never taken for a thing.
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
/**
 * The water off the crown: a drop lets go of each end of it every `DRIP`
 * seconds, thrown out and a little up, and falls on its own from where the
 * crown was at that moment. `G_WATER` pulls it down to the basin.
 */
const DRIP = 0.03
const THROW = 0.34
const TOSS = 0.5
const G_WATER = 9
/** The longest a drop is in the air: off the crown at full height, down to the basin. */
const AIRBORNE = (TOSS + Math.sqrt(TOSS * TOSS + 2 * G_WATER * (H + WATER - FLOOR))) / G_WATER
/** How fast the overflow drips off the cup's rim when nobody is on it, and how long a drip falls to the basin. */
const DRIPS = 1.7
const DRIP_FALL = Math.sqrt((2 * (WATER - FLOOR - 0.012)) / G_WATER)

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
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
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
    // Its surface: still under a welling cup, and chopped up while the jet's water is coming down into it.
    const chop = 0.007 * Math.max(jet.force, jetAt(t - AIRBORNE * 0.8).force)
    outline(p, ink, weight * 0.8)
    p.beginShape()
    for (let i = 0; i <= 26; i++) {
      const x = -INNER + (2 * INNER * i) / 26
      p.vertex(x * k, (WATER + chop * Math.sin(x * 38) * Math.sin(t * 13 + x * 9)) * k)
    }
    p.endShape()

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
    if (jet.h <= 0.1) {
      // Welling up out of the cup, and the overflow dripping off its rim both sides into the basin, until the ball corks it.
      if (jet.h > 0.004) p.arc(0, (FLOOR + 0.005) * k, (CUP * 2 - 0.07) * k, jet.h * 2 * k, Math.PI, Math.PI * 2, p.CHORD)
      const run = jet.h / WELL
      if (run > 0.4 && since <= 0) {
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            // A bead swells under the rim, lets go, and falls.
            const f = (t * DRIPS + i / 3 + (side > 0 ? 0.17 : 0)) % 1
            const age = (f * (1 / DRIPS)) - (1 / DRIPS - DRIP_FALL)
            const x = side * (CUP + 0.004)
            if (age < 0) p.circle(x * k, (FLOOR + 0.012) * k, 0.03 * run * over(f, 0, 1 - DRIP_FALL * DRIPS) * k)
            else p.ellipse(x * k, (FLOOR + 0.012 + 0.5 * G_WATER * age * age) * k, 0.026 * run * k, (0.03 + 0.05 * age * G_WATER * 0.1) * run * k)
          }
        }
      }
      // Corked: it spits from under the ball at both sides of the rim, harder as the pressure comes on.
      if (corked) {
        const press = over(t, ARRIVE, FIRE)
        const reach = (0.07 + 0.13 * press) * (0.8 + 0.2 * Math.sin(t * 70))
        spit(p, k, s.water, shudder, -1, reach)
        spit(p, k, s.water, shudder, 1, reach)
      }
    } else {
      // The column, from the cup to the crown, leaning where the crown leans: its sides are never still, a swell
      // running up it faster than the eye follows, and a glint or two of the paper riding up inside it.
      const w0 = 0.044
      const w1 = 0.034 + 0.012 * jet.force
      const foot = FLOOR + 0.04
      const n = 16
      const edge = (u: number, side: number): Pt => {
        const w = (w0 + (w1 - w0) * u) * (1 + 0.17 * Math.min(1, u * 5) * Math.sin(u * jet.h * 21 - t * 38 + side))
        return [jet.x * u * u + side * w, foot + (top + 0.03 - foot) * u]
      }
      p.beginShape()
      for (let i = 0; i <= n; i++) p.vertex(edge(i / n, -1)[0] * k, edge(i / n, -1)[1] * k)
      for (let i = n; i >= 0; i--) p.vertex(edge(i / n, 1)[0] * k, edge(i / n, 1)[1] * k)
      p.endShape(p.CLOSE)
      p.stroke(bg)
      p.strokeWeight(0.011 * k)
      for (let i = 0; i < 3; i++) {
        const u = (t * 2.6 + i / 3) % 1
        const len = 0.07 * Math.sin(Math.PI * u)
        if (jet.h * u < 0.08 || len < 0.01) continue
        const x = jet.x * u * u + (i - 1) * 0.014
        const y = foot + (top + 0.03 - foot) * u
        p.line(x * k, y * k, x * k, (y + len) * k)
      }
      p.noStroke()
      // The crown: a cushion of water under the ball, heaving a little.
      const half = 0.085 + 0.025 * jet.force
      p.ellipse(jet.x * k, (top + 0.012) * k, half * 2 * (1 + 0.05 * Math.sin(t * 31)) * k, 0.07 * k)
    }
    rain(p, k, t)
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

/** A number from 0 to 1 for drop `i`, the same every time: no two drops are thrown quite alike. */
const uneven = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * The water in the air at `t`: every drop let go of the crown in the last
 * `AIRBORNE` seconds, each where its own fall has got it to, drawn along
 * the way it is going and thinner the longer it has fallen. Where the
 * last of them went in, a ring opens on the basin and a bead or two hops.
 * The fill is the caller's.
 */
function rain(p: p5, k: number, t: number): void {
  const newest = Math.floor(t / DRIP)
  const count = Math.ceil(AIRBORNE / DRIP) + 1
  for (const side of [-1, 1]) {
    let splash: number | null = null
    for (let i = 0; i <= count; i++) {
      const born = (newest - i) * DRIP + (side > 0 ? 0 : DRIP / 2)
      const age = t - born
      if (age < 0 || born <= FIRE) continue
      const jet = jetAt(born)
      if (jet.h <= 0.1) continue
      const lot = uneven((newest - i) * 2 + (side > 0 ? 0 : 1))
      const size = uneven((newest - i) * 2 + (side > 0 ? 40 : 41))
      // Thrown out and a little up; and off a crown that is sinking, it leaves going down as fast as the crown is.
      const sinking = Math.max(0, (jetAt(born - 0.004).h - jet.h) / 0.004)
      const vx = side * THROW * (0.7 + 0.6 * lot) * (0.45 + 0.55 * jet.force)
      const v0 = sinking - TOSS * (0.6 + 0.4 * lot) * jet.force
      const vy = v0 + G_WATER * age
      const x = Math.max(-INNER + 0.04, Math.min(INNER - 0.04, jet.x + side * (0.07 + 0.025 * jet.force) + vx * age))
      const y = FLOOR + SEAT - jet.h + 0.015 + v0 * age + 0.5 * G_WATER * age * age
      if (y >= WATER) {
        splash ??= x
        continue
      }
      const d = 0.07 * (0.35 + 0.65 * jet.force) * (0.75 + 0.4 * size) * (1 - 0.4 * (age / AIRBORNE))
      p.push()
      p.translate(x * k, y * k)
      p.rotate(Math.atan2(vy, vx))
      p.ellipse(0, 0, (d + Math.hypot(vx, vy) * 0.022) * k, d * k)
      p.pop()
    }
    if (splash === null) continue
    const f = (t * 3.2) % 1
    p.ellipse(splash * k, (WATER - 0.004) * k, (0.06 + 0.08 * f) * k, 0.032 * (1 - f) * k)
    for (let i = 0; i < 2; i++) {
      const g = (t * 2.7 + i * 0.5) % 1
      p.circle((splash + side * (i ? -0.05 : 0.06) * g) * k, (WATER - 0.01 - 0.36 * g * (1 - g)) * k, 0.024 * (1 - g * 0.5) * k)
    }
  }
}
