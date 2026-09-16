import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { flash, lamp, score } from './neon'

/**
 * A slingshot. A fork is clamped to the post that holds the shelf above,
 * aimed up the way the ball has to go; two lit bands run back from its
 * tips to a pouch hanging cocked at the rail's end, held down on a catch.
 * The ball rolls off the rail into the pouch and its weight sinks it: the
 * pouch's tail slips the catch, the bands whip the pouch up their own line
 * through the fork, and the ball flies on from the fork's mouth the way the
 * bands sent it — a lob a floor up onto the shelf, landing on the way down
 * and rolling off to the way out. The pouch swings and hangs at the fork
 * after; the fork lights, and the score pops.
 *
 * Everything lines up with the shot: the pouch's motion is one function of
 * time that both the drawing and the lane come from, the bands are straight
 * lines from the tips to the pouch wherever it is, and the flight leaves
 * the mouth with the pouch's last speed along the bands' line.
 */
/** The pouch's cup, at the rail's end. */
const SEAT = -0.2
/** How far the ball's weight sinks the pouch before the catch lets go. */
const SAG = 0.06
const SHELF_Y = -1
const POST_X = 0.4
/** The shelf's near end: clear of the ball's flight, which comes down onto it past the top of its arc. */
const SHELF_X0 = 0.32
const LAND: Pt = [0.38, SHELF_Y]
/** The fork's handle runs from its clamp on the post to the crotch, square to the shot. */
const CLAMP: Pt = [POST_X, -0.295]
const CROTCH: Pt = [0.12, -0.37]
/** Along the handle, from the clamp toward the crotch and on to the fork's mouth. */
const ALONG: Pt = (() => {
  const dx = CROTCH[0] - CLAMP[0]
  const dy = CROTCH[1] - CLAMP[1]
  const l = Math.hypot(dx, dy)
  return [dx / l, dy / l]
})()
/** The fork's mouth: between the tips, on the handle's line, where the ball leaves the pouch. */
const MOUTH: Pt = [CROTCH[0] + ALONG[0] * 0.2, CROTCH[1] + ALONG[1] * 0.2]
const P_SEAT: Pt = [SEAT, 0]
const P_BACK: Pt = [SEAT, SAG]
/** The shot's line: from the cocked pouch up through the mouth. */
const SHOT = Math.hypot(MOUTH[0] - P_BACK[0], MOUTH[1] - P_BACK[1])
const AIM: Pt = [(MOUTH[0] - P_BACK[0]) / SHOT, (MOUTH[1] - P_BACK[1]) / SHOT]
/**
 * The prongs spread either side of the shot's line, seen a little turned
 * so the Y opens toward the viewer: the near tip up the line, the far tip
 * down it. The ball passes between them, behind the near prong and in
 * front of the far.
 */
const SPREAD = 0.075
const TIP_NEAR: Pt = [MOUTH[0] + AIM[0] * SPREAD, MOUTH[1] + AIM[1] * SPREAD]
const TIP_FAR: Pt = [MOUTH[0] - AIM[0] * SPREAD, MOUTH[1] - AIM[1] * SPREAD]
const ARRIVE = arriveAt(SEAT)
const SAG_T = 0.16
const HOLD = 0.12
const T_SAGGED = ARRIVE + SAG_T
const FIRE = T_SAGGED + HOLD
const LAUNCH_T = 0.18
const T_OFF = FIRE + LAUNCH_T
/** The pouch's speed as the ball leaves it: it comes up the line from rest, quickening all the way. */
const V_OFF = (2 * SHOT) / LAUNCH_T
/** The flight: leaves the mouth along the shot's line at the pouch's speed, and comes down onto the shelf. */
const ARC = (LAND[1] - MOUTH[1] - ((LAND[0] - MOUTH[0]) * AIM[1]) / AIM[0]) / 4
const FLY_T = Math.hypot(LAND[0] - MOUTH[0], LAND[1] - MOUTH[1] - 4 * ARC) / V_OFF
const V_LAND = Math.hypot(LAND[0] - MOUTH[0], LAND[1] - MOUTH[1] + 4 * ARC) / FLY_T
const T_LAND = T_OFF + FLY_T

/** Where the pouch's cup — and the ball in it — is at `t`. */
function pouchAt(t: number): Pt {
  if (t < ARRIVE) return P_SEAT
  if (t < T_SAGGED) return [SEAT, SAG * easeOutQuad(over(t, ARRIVE, T_SAGGED))]
  if (t < FIRE) return P_BACK
  if (t < T_OFF) {
    const f = easeInQuad(over(t, FIRE, T_OFF))
    return [P_BACK[0] + (MOUTH[0] - P_BACK[0]) * f, P_BACK[1] + (MOUTH[1] - P_BACK[1]) * f]
  }
  // Empty: on past the mouth, checked by the bands, swinging back, and settling to dangle under the tips on slack bands.
  const s = t - T_OFF
  const fling = 0.08 * Math.sin(s * 18) * Math.exp(-s * 6)
  const hang = 0.16 * easeOutQuad(Math.min(1, s / 0.5))
  return [MOUTH[0] + AIM[0] * fling, MOUTH[1] + AIM[1] * fling + hang]
}

/** A band's length unstretched: taut and straight when the pouch is further than this from the tip, sagging when it is nearer. */
const REST = 0.3

/** A band from a tip to the pouch: a lit tube, straight under tension, hanging in a bight when slack. */
function band(p: p5, k: number, ink: string, weight: number, color: string, a: Pt, b: Pt, lit: number): void {
  const slack = Math.max(0, REST - Math.hypot(b[0] - a[0], b[1] - a[1]))
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + slack * 0.9]
  const curve = () => {
    p.beginShape()
    p.vertex(a[0] * k, a[1] * k)
    p.quadraticVertex(mid[0] * k, mid[1] * k, b[0] * k, b[1] * k)
    p.endShape()
  }
  p.push()
  p.noFill()
  if (lit > 0.02) {
    const halo = p.color(color)
    halo.setAlpha(40 * lit)
    p.stroke(halo)
    p.strokeWeight(weight * 3.2)
    curve()
  }
  p.stroke(lit > 0.5 ? color : ink)
  p.strokeWeight(weight * 1.3)
  curve()
  p.pop()
}

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], P_SEAT),
    ...trace(pouchAt, ARRIVE, T_SAGGED, 6),
    wait(P_BACK, HOLD),
    ...trace(pouchAt, FIRE, T_OFF, 18),
    fly(MOUTH, LAND, FLY_T, ARC),
    ramp(LAND, [0.5, SHELF_Y], V_LAND, ROLL),
  ],
  fire: FIRE,
}

/** A bar from a to b, `w` thick, in the colour with an ink edge. */
function bar(p: p5, k: number, ink: string, weight: number, color: string, a: Pt, b: Pt, w: number): void {
  p.push()
  p.translate(((a[0] + b[0]) / 2) * k, ((a[1] + b[1]) / 2) * k)
  p.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]))
  solid(p, ink, weight, color)
  p.rect(0, 0, Math.hypot(b[0] - a[0], b[1] - a[1]) * k, w * k, 0.01 * k)
  p.pop()
}

export const slingshot = definePiece<{ color: string }>({
  name: 'slingshot',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const [px, py] = pouchAt(t)
    // The bands light as the pouch is cocked under the ball's weight, and go dark a while after the shot.
    const lit = t < ARRIVE ? 0 : since < 0 ? over(t, ARRIVE, T_SAGGED) : 1 - over(since, 0.4, 1.1)

    // The rail to the pouch, and the ground. The shelf above on its post, level to the way out, with a lamp over its end that lights when the ball lands.
    rail(p, k, ink, weight, -0.5, SEAT - R - 0.02)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    p.line(SHELF_X0 * k, (SHELF_Y + FLOOR) * k, 0.5 * k, (SHELF_Y + FLOOR) * k)
    p.line(POST_X * k, (SHELF_Y + FLOOR) * k, POST_X * k, 0.5 * k)
    p.line((POST_X - 0.06) * k, 0.5 * k, (POST_X + 0.06) * k, 0.5 * k)
    p.line(0.44 * k, (SHELF_Y - 0.32) * k, 0.44 * k, (SHELF_Y - 0.44) * k)
    lamp(p, k, ink, weight, s.color, bg, 0.44, SHELF_Y - 0.48, 0.035, t > T_LAND ? 1 - over(t, T_LAND + 0.8, T_LAND + 1.6) : 0)

    // The catch: a post under the pouch's seat with a hook at its top that
    // holds the pouch's tail down against the bands, until the ball's weight
    // sinks the tail out of it; the hook drops open and stays open.
    const hookX = SEAT + 0.08
    const hookY = 0.3
    p.line(hookX * k, hookY * k, hookX * k, 0.5 * k)
    p.line((hookX - 0.05) * k, 0.5 * k, (hookX + 0.05) * k, 0.5 * k)
    const open = since < 0 ? 0 : 1.3 * Math.min(1, over(since, 0, 0.08))
    p.push()
    p.translate(hookX * k, hookY * k)
    p.rotate(open)
    outline(p, ink, weight * 1.2)
    p.line(0, 0, -0.08 * k, -0.06 * k)
    p.pop()

    // The fork: clamped to the post, the handle to the crotch, and the far prong; the near one is drawn in front of the ball.
    solid(p, ink, weight, ink)
    p.rect(CLAMP[0] * k, CLAMP[1] * k, 0.08 * k, 0.09 * k, 0.01 * k)
    bar(p, k, ink, weight, s.color, CLAMP, CROTCH, 0.06)
    bar(p, k, ink, weight, s.color, CROTCH, TIP_FAR, 0.045)
    solid(p, ink, weight, s.color)
    p.circle(TIP_FAR[0] * k, TIP_FAR[1] * k, 0.06 * k)
    // The far band, and the pouch's back and tail: the tail's ring is what the catch holds.
    band(p, k, ink, weight, s.color, TIP_FAR, [px - 0.12, py + 0.05], lit)
    solid(p, ink, weight, s.color)
    p.rect(px * k, (py + 0.08) * k, 0.3 * k, 0.15 * k, 0.04 * k)
    outline(p, ink, weight)
    p.line(px * k, (py + 0.155) * k, px * k, (py + 0.2) * k)
    solid(p, ink, weight * 0.9, bg)
    p.circle(px * k, (py + 0.23) * k, 0.05 * k)

    // The ball leaving the fork, and the score.
    flash(p, k, s.color, weight, MOUTH[0], MOUTH[1], t - T_OFF)
    score(p, k, s.color, MOUTH[0] - 0.26, MOUTH[1] - 0.06, '+100', since)
  },
  over: (p, s, { k, t, ink, weight, since }) => {
    const [px, py] = pouchAt(t)
    const lit = t < ARRIVE ? 0 : since < 0 ? over(t, ARRIVE, T_SAGGED) : 1 - over(since, 0.4, 1.1)
    // In front of the ball: the near band, the pouch's front, and the near prong the ball passes behind.
    band(p, k, ink, weight, s.color, TIP_NEAR, [px + 0.12, py + 0.05], lit)
    solid(p, ink, weight, s.color)
    p.rect(px * k, (py + 0.1) * k, 0.3 * k, 0.11 * k, 0.04 * k)
    bar(p, k, ink, weight, s.color, CROTCH, TIP_NEAR, 0.045)
    solid(p, ink, weight, s.color)
    p.circle(TIP_NEAR[0] * k, TIP_NEAR[1] * k, 0.06 * k)
  },
})
