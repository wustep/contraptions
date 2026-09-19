import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, laneAt, over, post, rail, ramp, roll, trace, wait, type Lane, type Pt } from '../../parts'
import { body, flipper, through } from './creatures'
import { seaColor, water } from './sea'

/**
 * A seal hauled out on a rock in a gap in the pier. It lounges with its
 * nose in the air until it sees the ball coming, then stretches its neck
 * out and lays its nose at the deck's end; the ball rolls off the deck
 * onto it and stops. The seal rears up with the ball on its nose, finds
 * its balance, bounces it twice — a little one, then a bigger one, the
 * nose dipping under each catch — winds its head back, and with a toss
 * lobs it up past the end of the deck a floor above and down onto it, on
 * or back the way it came. Then it claps.
 *
 * The seal is one shape from tail to nose, drawn round a spine that ends
 * at the nose, and the nose is wherever the pose says the ball's seat is:
 * the ball's lane, whenever it is on the nose, is traced from that same
 * pose, so it never floats off it or sinks into it.
 */
export interface SealState {
  color: string
  turn: 1 | -1
}

/** The deck's end, and the ball's seat when it has rolled off it onto the nose. */
const EDGE = -0.2
const MEET: Pt = [-0.07, 0]
/** Reared up: where it balances the ball. */
const BAL: Pt = [0, -0.19]
/** Lounging, before and after: where the nose would hold a ball, and which way the snout points. */
const REST: Pt = [0.06, -0.17]
const PHI_REST = 4.25
const PHI_MEET = 3.5
const PHI_UP = Math.PI * 1.5
/** Nose tip to the middle of the head. */
const SNOUT = 0.125

/** Where the ball comes down on the deck above, and where that deck ends. */
const LAND_X = 0.37
const SHELF_X = 0.29
const POST_X = 0.44

const T_EDGE = (0.5 + EDGE) / ROLL
const T_MEET = T_EDGE + (MEET[0] - EDGE) / (ROLL / 2)
const BEAT = 0.06
const T_REAR = T_MEET + BEAT
const REAR = 0.28
const HOLD = 0.2
/** A bounce: the nose dips and flicks over this long, the ball is in the air this long, and the catch gives for this long. */
const FLICK = 0.1
const CUSHION = 0.08
const AIR1 = 0.24
const LOFT1 = 0.09
const AIR2 = 0.3
const LOFT2 = 0.16
const B1 = T_REAR + REAR + HOLD
const B1_OFF = B1 + FLICK
const B1_ON = B1_OFF + AIR1
const B2 = B1_ON + CUSHION
const B2_OFF = B2 + FLICK
const B2_ON = B2_OFF + AIR2
const WIND0 = B2_ON + CUSHION
const WIND = 0.14
const SNAP = 0.06
const FIRE = WIND0 + WIND + SNAP
const FLIGHT = 0.48
const LOFT = 0.42
/** It notices the ball this long before it arrives, and goes back to lounging this long after the toss. */
const NOTICE = 0.7
const CLAPS = 1.1
const RELAX = 0.8

/** The nose's flick under a bounce, as a height off the balance point: down, then up and away at speed. */
const flickY = (f: number): number => (f < 0.6 ? 0.03 * easeInOutSine(f / 0.6) : 0.03 - 0.05 * easeInQuad((f - 0.6) / 0.4))
/** The ball leaves the nose this far above the balance point, and comes back down onto it there. */
const OFF_Y = flickY(1)
/** After the ball has left: the nose follows through and comes back to where it will catch it. */
const followY = (f: number): number => OFF_Y - 0.03 * Math.sin(Math.PI * f)
/** The catch: the nose gives under the ball and comes back to the balance point. */
const catchY = (f: number): number => OFF_Y * (1 - f) + 0.03 * Math.sin(Math.PI * f)

interface Pose {
  /** The ball's seat on the nose: the nose's tip is a radius under it. */
  seat: Pt
  /** Which way the snout points, radians, y down. */
  phi: number
}

function poseAt(t: number, turn: 1 | -1): Pose {
  // The wind-up goes away from the throw and down; the snap is mostly up, and lets go before it is back over the balance point, so the ball rises clear of the deck's end.
  // Going back it winds toward its own shoulders, where there is less room.
  const back: Pt = [BAL[0] - turn * (turn > 0 ? 0.12 : 0.08), BAL[1] + 0.07]
  const out: Pt = [BAL[0] - turn * 0.07, BAL[1] - 0.07]
  const mix = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]
  if (t < T_EDGE) return { seat: mix(REST, MEET, easeInOutSine(over(t, T_EDGE - NOTICE, T_EDGE - 0.1))), phi: lerp(PHI_REST, PHI_MEET, easeInOutSine(over(t, T_EDGE - NOTICE, T_EDGE - 0.1))) }
  if (t < T_REAR) return { seat: MEET, phi: PHI_MEET }
  if (t < T_REAR + REAR) {
    const f = easeInOutSine(over(t, T_REAR, T_REAR + REAR))
    return { seat: mix(MEET, BAL, f), phi: lerp(PHI_MEET, PHI_UP, f) }
  }
  // Finding its balance: one sway under the ball.
  if (t < B1) return { seat: [BAL[0] + 0.02 * Math.sin(over(t, T_REAR + REAR, B1) * Math.PI * 2), BAL[1]], phi: PHI_UP + 0.25 * Math.sin(over(t, T_REAR + REAR, B1) * Math.PI * 2) }
  const bal = (dy: number): Pose => ({ seat: [BAL[0], BAL[1] + dy], phi: PHI_UP })
  if (t < B1_OFF) return bal(flickY(over(t, B1, B1_OFF)))
  if (t < B1_ON) return bal(followY(over(t, B1_OFF, B1_ON)))
  if (t < B2) return bal(catchY(over(t, B1_ON, B2)))
  if (t < B2_OFF) return bal(flickY(over(t, B2, B2_OFF)))
  if (t < B2_ON) return bal(followY(over(t, B2_OFF, B2_ON)))
  if (t < WIND0) return bal(catchY(over(t, B2_ON, WIND0)))
  if (t < WIND0 + WIND) {
    const f = easeInOutSine(over(t, WIND0, WIND0 + WIND))
    return { seat: mix(BAL, back, f), phi: PHI_UP - turn * 0.45 * f }
  }
  if (t < FIRE) {
    const f = easeInQuad(over(t, WIND0 + WIND, FIRE))
    return { seat: mix(back, out, f), phi: PHI_UP - turn * 0.45 + turn * 0.75 * f }
  }
  // The follow-through, held while it claps, and back to lounging.
  const thrown: Pose = { seat: [out[0] + turn * 0.08, out[1] - 0.02], phi: PHI_UP + turn * 0.4 }
  if (t < FIRE + 0.1) {
    const f = easeOutCubic(over(t, FIRE, FIRE + 0.1))
    return { seat: mix(out, thrown.seat, f), phi: lerp(PHI_UP + turn * 0.3, thrown.phi, f) }
  }
  const f = easeInOutSine(over(t, FIRE + CLAPS, FIRE + CLAPS + RELAX))
  return { seat: mix(thrown.seat, REST, f), phi: lerp(thrown.phi, PHI_REST, f) }
}

function laneFor(turn: 1 | -1): Lane {
  const seat = (t: number) => poseAt(t, turn).seat
  const off: Pt = [BAL[0], BAL[1] + OFF_Y]
  const out = seat(FIRE)
  const land: Pt = [turn * LAND_X, -1]
  return {
    segs: [
      roll([-0.5, 0], [EDGE, 0], ROLL),
      ramp([EDGE, 0], MEET, ROLL, 0),
      wait(MEET, BEAT),
      ...trace(seat, T_REAR, B1_OFF, 22),
      fly(off, off, AIR1, LOFT1),
      ...trace(seat, B1_ON, B2_OFF, 8),
      fly(off, off, AIR2, LOFT2),
      ...trace(seat, B2_ON, FIRE, 12),
      fly(out, land, FLIGHT, LOFT),
      fly(land, [land[0] + turn * 0.06, -1], 0.05, 0.012),
      ramp([land[0] + turn * 0.06, -1], [turn * 0.5, -1], 1.7, ROLL),
    ],
    fire: FIRE,
  }
}

const LANES: Record<1 | -1, Lane> = { 1: laneFor(1), [-1]: laneFor(-1) }

/* ------------------------------------------------------------------ the seal */

export const seal = definePiece<SealState>({
  name: 'seal',
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    for (const turn of rng.shuffle([1, -1] as const)) {
      if (!fits(cells, [turn, -1])) continue
      return { cells, exit: { at: [turn, -1], dir: turn }, lane: LANES[turn], state: { color: seaColor(theme, color), turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { turn } = s
    const { seat, phi } = poseAt(t, turn)
    const nose: Pt = [seat[0], seat[1] + R]
    const head: Pt = [nose[0] - Math.cos(phi) * SNOUT, nose[1] - Math.sin(phi) * SNOUT]
    // How far it is reared up, for the tail to come up against; and the claps after the toss.
    const reared = over(FLOOR - nose[1], 0, FLOOR - BAL[1] - R)
    const clapping = since > 0.12 && since < CLAPS
    const clap = clapping ? Math.abs(Math.sin((since - 0.12) * 13)) : 0
    const ball = laneAt(LANES[turn], t)

    // The deck the ball comes in on, and the deck above on a piling that stands in the water behind the rock.
    rail(p, k, ink, weight, -0.5, EDGE)
    post(p, k, ink, weight, -0.42, FLOOR, 0.5)
    rail(p, k, ink, weight, turn * SHELF_X, turn * 0.5, -1 + FLOOR)
    if (turn > 0) post(p, k, ink, weight, POST_X, -1 + FLOOR, 0.5)
    else {
      // Going back, the deck above stands over the one below, on the same piling.
      outline(p, ink, weight)
      p.line(-0.42 * k, (-1 + FLOOR) * k, -0.42 * k, FLOOR * k)
    }
    outline(p, ink, weight)
    p.line(turn * (turn > 0 ? POST_X : 0.42) * k, (-1 + FLOOR + 0.16) * k, turn * (SHELF_X + 0.03) * k, (-1 + FLOOR) * k)

    // The rock, awash.
    solid(p, ink, weight, bg)
    p.arc(0.24 * k, 0.5 * k, 0.56 * k, 0.34 * k, Math.PI, Math.PI * 2, p.CHORD)

    // The far flipper, behind the body: it comes round to meet the near one in a clap.
    solid(p, ink, weight, s.color)
    flipper(p, k, 0.1, 0.23, 0.17, lerp(2.3, 3.25, clap) + 0.1)
    // The tail flippers, which come up as it rears.
    for (const a of [-0.75, -0.15]) flipper(p, k, 0.42, 0.33, 0.13, a - 0.5 * reared - 0.35 * clap, 0.42)
    // The seal, tail to nose, in one line.
    body(
      p,
      k,
      through(
        [
          [0.45, 0.335, 0.02],
          [0.31, 0.335, 0.095],
          [0.19, 0.27, 0.125],
          [0.11, 0.15 - 0.03 * reared, 0.098],
          [head[0], head[1], 0.078],
          [lerp(head[0], nose[0], 0.62), lerp(head[1], nose[1], 0.62), 0.045],
          [nose[0] - Math.cos(phi) * 0.03, nose[1] - Math.sin(phi) * 0.03, 0.03],
        ],
        7,
      ),
    )
    // The near flipper: propping it up, spread for balance, clapping.
    const prop = clapping ? lerp(2.0, 3.05, clap) : 1.95 + 0.35 * reared
    flipper(p, k, 0.13, 0.27, 0.19, prop)

    // The face: the nose, whiskers that twitch while it balances, an eye that never leaves the ball.
    p.noStroke()
    p.fill(ink)
    p.circle((nose[0] - Math.cos(phi) * 0.022) * k, (nose[1] - Math.sin(phi) * 0.022) * k, 0.045 * k)
    const twitch = t > T_MEET && t < FIRE ? 0.12 * Math.sin(t * 38) : 0
    const mx = lerp(head[0], nose[0], 0.5)
    const my = lerp(head[1], nose[1], 0.5)
    outline(p, ink, weight * 0.6)
    for (const side of [-1, 1]) {
      for (const fan of [-0.22, 0.22]) {
        const a = phi + side * (Math.PI / 2 + 0.35) + fan + twitch * side
        p.line((mx + Math.cos(a) * 0.04) * k, (my + Math.sin(a) * 0.04) * k, (mx + Math.cos(a) * 0.1) * k, (my + Math.sin(a) * 0.1) * k)
      }
    }
    // The eye sits on the side of the head that faces us, a little back from the snout's line.
    const ex = head[0] + Math.cos(phi + 1.2) * 0.03
    const ey = head[1] + Math.sin(phi + 1.2) * 0.03
    const look = Math.atan2(ball.y - ey, ball.x - ex)
    solid(p, ink, weight * 0.7, bg)
    p.circle(ex * k, ey * k, 0.058 * k)
    p.noStroke()
    p.fill(ink)
    p.circle((ex + Math.cos(look) * 0.011) * k, (ey + Math.sin(look) * 0.011) * k, 0.03 * k)

    // The sea in front: what is under the line is under water.
    water(p, k, ink, weight, -0.5, 0.5)

    // The claps: a crack of lines off the flippers each time they meet.
    if (clapping && clap > 0.8) {
      outline(p, ink, weight * 0.9)
      for (const a of [2.6, 3.1, 3.6]) p.line((-0.07 + Math.cos(a) * 0.04) * k, (0.26 + Math.sin(a) * 0.04) * k, (-0.07 + Math.cos(a) * 0.085) * k, (0.26 + Math.sin(a) * 0.085) * k)
    }
  },
})
