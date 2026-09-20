import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, arcPts, arrive, arriveAt, burst, catchBend, chain, definePiece, over, rail, ramp, rankBy, trace, type Lane, type Pt, type Seg } from '../../parts'

/**
 * A pair of scales. The rail ends at the left pan, which hangs level with
 * it on three cords from a beam on a knife-edge; a brass weight in the
 * right pan holds the beam down on its stop. The ball rolls into the pan
 * and outweighs the brass: the beam creeps, then swings, the loaded pan
 * sinking and the weight flying up, the pointer going over with them.
 * Part way down the pan's foot lands on a rest off the pillar; the beam
 * goes on without it, the cords slacken, and the pan, held now by its
 * outer cord alone, tips outward and rolls the ball off its rim into the
 * cell below, where a quarter-pipe turns the fall into a roll — on, or
 * back the way it came. The beam hangs a moment, then the brass wins
 * again and eases it back level onto its stop.
 *
 * The pan's tilt is the geometry of its cords: the beam's end sinks and
 * comes inward, the outer cord is the one that stays taut, and the pan
 * turns about the rest exactly as far as that cord allows. The ball's
 * seat is traced from that same pan, so it sits on the dish's floor at
 * every angle until the dish lets it go.
 */
export interface ScalesState {
  color: string
  /** 1: carries on east. -1: turns back west. */
  turn: 1 | -1
}

/** The pillar's axis, and the knife-edge on top of it. */
const PX = 0.12
const BY = -0.27
const ARM = 0.22
/** The pans hang this far under the beam's ends, so the left one is level with the rail. */
const CORD = FLOOR - BY
/** Half the pan's floor; its lip flares up from the floor's ends; a foot ring stands under it. */
const PW = 0.13
const LIP = 0.035
const FLARE = 0.02
const FOOT = 0.03
const FOOT_W = 0.06
/** A cord from the beam's end to a corner of the rim, and to the rim's middle. */
const LC = Math.hypot(PW, CORD - LIP)
const LC_MID = CORD - LIP
const PILLAR = 0.04
const BEAM_T = 0.05
const POINTER = 0.2
/** How far over the beam swings; how far it has crept when it goes; the tilt at which the pan's foot meets the rest. */
const A_MAX = 1.01
const A_CREEP = 0.09
const A_REST = 0.38
const SEAT_X = PX - ARM
const ARRIVE = arriveAt(SEAT_X)
const CREEP = 0.35
const FIRE = ARRIVE + CREEP
const SWING = 0.7
const HOLD = 0.6
const RESET = 1.3
const BACK = SWING + HOLD + RESET
/** Where, along the swing, the beam stops gaining and starts braking. */
const F1 = 0.65
/** Cartoon gravity: along the tipped pan's floor, and for the fall. Cells per second squared. */
const G_PAN = 12
const G_FALL = 14
const ARC = 0.16
/** The rest's top, where the pan's foot lands, and the corner of the foot that turns on it. */
const RY = FLOOR + ARM * Math.sin(A_REST) + FOOT
const PIVOT: Pt = [PX - ARM * Math.cos(A_REST) + FOOT_W, RY]
/** The stop under the right arm reaches out to here. */
const STOP_X = PX + 0.17

/** Gains speed to F1 of the way, then brakes to a stop; continuous in speed at the join. */
const swingEase = (f: number) => (f < F1 ? (f * f) / F1 : 1 - ((1 - f) * (1 - f)) / (1 - F1))

/** The beam's tilt, left end down, `since` the fire. */
const beamAt = (since: number): number => {
  if (since < -CREEP) return 0
  if (since < 0) return A_CREEP * easeInQuad(over(since, -CREEP, 0))
  if (since < SWING) return A_CREEP + (A_MAX - A_CREEP) * swingEase(over(since, 0, SWING))
  if (since < SWING + HOLD) return A_MAX
  if (since < BACK) return A_MAX * (1 - easeInOutSine(over(since, SWING + HOLD, BACK)))
  // Back on the stop, with a bounce or two.
  const tau = since - BACK
  return 0.03 * Math.exp(-tau * 7) * Math.abs(Math.sin(tau * 22))
}

const endL = (a: number): Pt => [PX - ARM * Math.cos(a), BY + ARM * Math.sin(a)]
const endR = (a: number): Pt => [PX + ARM * Math.cos(a), BY - ARM * Math.sin(a)]

/** `v`, given in a pan's own frame, once the pan is tipped `phi` with its outer edge down. */
const inPan = (v: Pt, phi: number): Pt => [v[0] * Math.cos(phi) + v[1] * Math.sin(phi), -v[0] * Math.sin(phi) + v[1] * Math.cos(phi)]

interface Pan {
  /** The middle of the floor. */
  c: Pt
  /** Outer edge down. */
  phi: number
}

/**
 * The left pan at beam tilt `a`: hanging level under the beam's end, or,
 * once its foot is on the rest, turned about the foot's corner as far as
 * its outer cord lets it go.
 */
function panL(a: number): Pan {
  const e = endL(a)
  if (a < A_REST) return { c: [e[0], e[1] + CORD], phi: 0 }
  // The outer corner of the rim, from the foot's corner, in the pan's frame.
  const v: Pt = [-PW - FOOT_W, -FOOT - LIP]
  const reach = (phi: number) => {
    const o = inPan(v, phi)
    return Math.hypot(PIVOT[0] + o[0] - e[0], PIVOT[1] + o[1] - e[1]) - LC
  }
  let lo = -0.4
  let hi = 1.4
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (reach(mid) < 0) lo = mid
    else hi = mid
  }
  const phi = Math.max(0, (lo + hi) / 2)
  const f = inPan([FOOT_W, FOOT], phi)
  return { c: [PIVOT[0] - f[0], PIVOT[1] - f[1]], phi }
}

/** When the pan's foot meets the rest, since the fire. */
const T_REST = (() => {
  let lo = 0
  let hi = SWING
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (beamAt(mid) < A_REST) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
})()

/**
 * The ball's place along the pan's floor, from the floor's middle,
 * outward negative: still until the pan lands on the rest, then rolling
 * down whatever slope the pan has at each instant, until its centre
 * passes the rim.
 */
const DT = 1 / 240
const TRACK: number[] = [0]
let leftAt = -1
{
  let u = 0
  let v = 0
  for (let i = 1; i < 480; i++) {
    const since = T_REST + i * DT
    const { phi } = panL(beamAt(since))
    v += G_PAN * Math.sin(phi) * DT
    u -= v * DT
    TRACK.push(u)
    if (u <= -PW) {
      leftAt = since
      break
    }
  }
}
const LEAVE_SINCE = leftAt > 0 ? leftAt : T_REST + (TRACK.length - 1) * DT
const LEAVE = FIRE + LEAVE_SINCE
const uAt = (since: number): number => {
  if (since <= T_REST) return 0
  const f = (since - T_REST) / DT
  const i = Math.min(TRACK.length - 1, Math.floor(f))
  const j = Math.min(TRACK.length - 1, i + 1)
  return TRACK[i] + (TRACK[j] - TRACK[i]) * (f - i)
}

/** The ball's centre, on the left pan's floor, `t` seconds into the piece. */
function seatAt(t: number): Pt {
  const since = t - FIRE
  const { c, phi } = panL(beamAt(since))
  const o = inPan([uAt(since), -R], phi)
  return [c[0] + o[0], c[1] + o[1]]
}

/** Where the ball leaves the rim, the line it falls on, and how long it falls to the bend. */
const OFF = seatAt(LEAVE)
const XF = OFF[0] - 0.02
const FALL = Math.sqrt((2 * (1 - ARC - OFF[1])) / G_FALL)
/** When the ball reaches the bend, since the fire. */
const LAND = LEAVE_SINCE + FALL

/** A point on a pan's rim, `u` along it from the middle, for a pan whose floor's middle is `c`, tipped `phi`. */
const rim = (c: Pt, phi: number, u: number): Pt => {
  const v = inPan([u, -LIP], phi)
  return [c[0] + v[0], c[1] + v[1]]
}

/** A pan in its own frame — the floor's middle at the origin, the rim up, the foot ring under — as one shape. */
function dish(p: p5, k: number, ink: string, weight: number, color: string): void {
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex((-PW - FLARE) * k, -LIP * k)
  p.vertex(-PW * k, 0)
  p.vertex(-FOOT_W * k, 0)
  p.vertex(-FOOT_W * k, FOOT * k)
  p.vertex(FOOT_W * k, FOOT * k)
  p.vertex(FOOT_W * k, 0)
  p.vertex(PW * k, 0)
  p.vertex((PW + FLARE) * k, -LIP * k)
  p.endShape(p.CLOSE)
}

/**
 * A cord from the beam's end `e` to a point `q` on a pan's rim, `natural`
 * cells long: straight while it carries, and bowed out to `side` by what
 * it has to spare once the pan is resting and it does not.
 */
function cord(p: p5, k: number, e: Pt, q: Pt, natural: number, side: number): void {
  const dx = q[0] - e[0]
  const dy = q[1] - e[1]
  const len = Math.hypot(dx, dy)
  const slack = natural - len
  if (slack < 0.004) {
    p.line(e[0] * k, e[1] * k, q[0] * k, q[1] * k)
    return
  }
  // A quadratic bow whose extra length is the slack.
  const h = Math.sqrt(1.5 * slack * len)
  const nx = (-dy / len) * side * h
  const ny = (dx / len) * side * h
  p.beginShape()
  p.vertex(e[0] * k, e[1] * k)
  p.quadraticVertex(((e[0] + q[0]) / 2 + nx) * k, ((e[1] + q[1]) / 2 + ny) * k, q[0] * k, q[1] * k)
  p.endShape()
}

export const scales = definePiece<ScalesState>({
  name: 'scales',
  weight: 1,
  place: ({ rng, color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    for (const turn of rankBy(rng, [1, -1] as const, (d) => (d > 0 ? 1 : 0.8))) {
      const exit: Pt = [turn, 1]
      if (!fits(cells, exit)) continue
      const bend = chain(arcPts(XF + turn * ARC, 1 - ARC, ARC, turn > 0 ? Math.PI : 0, Math.PI / 2, 4), ((Math.PI / 2) * ARC) / FAST)
      const segs: Seg[] = [
        ...arrive([-0.5, 0], seatAt(ARRIVE)),
        ...trace(seatAt, ARRIVE, FIRE + T_REST, 6),
        ...trace(seatAt, FIRE + T_REST, LEAVE, 10),
        { from: OFF, to: [XF, 1 - ARC], dur: FALL, ease: 'in' },
        ...bend,
        ramp([XF + turn * ARC, 1], [turn * 0.5, 1], FAST, ROLL),
      ]
      const lane: Lane = { segs, fire: FIRE }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, since, ink, weight }) => {
    const a = beamAt(since)
    const eL = endL(a)
    const eR = endR(a)
    const L = panL(a)
    const cR: Pt = [eR[0], eR[1] + CORD]

    // The rail, up to the pan's lip.
    rail(p, k, ink, weight, -0.5, SEAT_X - PW - FLARE - 0.01)

    // The pillar, one silhouette: a foot plate, the shaft, the knife-edge.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((PX - 0.13) * k, 1.5 * k)
    p.vertex((PX + 0.13) * k, 1.5 * k)
    p.vertex((PX + 0.13) * k, 1.45 * k)
    p.vertex((PX + PILLAR) * k, 1.45 * k)
    p.vertex((PX + PILLAR) * k, (BY + 0.06) * k)
    p.vertex(PX * k, BY * k)
    p.vertex((PX - PILLAR) * k, (BY + 0.06) * k)
    p.vertex((PX - PILLAR) * k, 1.45 * k)
    p.vertex((PX - 0.13) * k, 1.45 * k)
    p.endShape(p.CLOSE)
    // The stop the right arm rests on, and the rest the left pan lands on.
    const stop0 = PX + PILLAR - 0.01
    p.rect(((stop0 + STOP_X) / 2) * k, (BY + 0.0175) * k, (STOP_X - stop0) * k, 0.035 * k)
    const rest0 = PX - PILLAR + 0.01
    const rest1 = PIVOT[0] - 0.015
    p.rect(((rest0 + rest1) / 2) * k, (RY + 0.0175) * k, (rest0 - rest1) * k, 0.035 * k)

    // The catch below: a quarter-pipe onto the rail out, the way the ball leaves.
    const squash = since < LAND ? 0 : 1 - over(since, LAND, LAND + 0.35)
    p.push()
    p.translate(XF * k, 1 * k)
    catchBend(p, k, ink, weight, s.color, s.turn, ARC, squash, s.turn > 0 ? 0.5 - XF : XF + 0.5)
    p.pop()

    // The cords: three to each pan, to the rim's two corners and its near side. The right pan's
    // always carry; the left pan's slacken once it rests, all but the outer one. The left pan's
    // near cord is in the over pass, in front of the ball.
    outline(p, ink, weight * 0.8)
    cord(p, k, eL, rim(L.c, L.phi, -PW), LC, 1)
    cord(p, k, eL, rim(L.c, L.phi, PW), LC, 1)
    for (const u of [-PW, 0, PW]) {
      const q = rim(cR, 0, u)
      p.line(eR[0] * k, eR[1] * k, q[0] * k, q[1] * k)
    }

    // The right pan, and the brass weight sitting in it. The left pan is in the over pass, round the ball.
    p.push()
    p.translate(cR[0] * k, cR[1] * k)
    dish(p, k, ink, weight, s.color)
    p.fill(ink)
    p.stroke(ink)
    p.strokeWeight(weight)
    p.beginShape()
    p.vertex(-0.045 * k, 0)
    p.vertex(0.045 * k, 0)
    p.vertex(0.03 * k, -0.075 * k)
    p.vertex(-0.03 * k, -0.075 * k)
    p.endShape(p.CLOSE)
    p.circle(0, -0.088 * k, 0.028 * k)
    p.pop()

    // The beam on its knife-edge, and the pointer standing up from its middle.
    p.push()
    p.translate(PX * k, BY * k)
    p.rotate(-a)
    solid(p, ink, weight, s.color)
    p.rect(0, (-BEAM_T / 2) * k, (2 * ARM + 0.06) * k, BEAM_T * k)
    p.fill(ink)
    p.noStroke()
    p.beginShape()
    p.vertex(-0.02 * k, -BEAM_T * k)
    p.vertex(0.02 * k, -BEAM_T * k)
    p.vertex(0, -(BEAM_T + POINTER) * k)
    p.endShape(p.CLOSE)
    p.pop()

    // The pan's foot landing on the rest; later, the arm landing back on its stop.
    if (since > T_REST && since < T_REST + 0.14) {
      const f = easeOutCubic(over(since, T_REST, T_REST + 0.14))
      outline(p, ink, weight * 0.8)
      burst(p, (PIVOT[0] - 0.02) * k, (PIVOT[1] - 0.01) * k, (0.04 + 0.05 * f) * k, (0.07 + 0.06 * f) * k, 4, 3.6)
    }
    if (since > BACK && since < BACK + 0.2) {
      const f = easeOutCubic(over(since, BACK, BACK + 0.2))
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, (STOP_X - 0.04) * k, BY * k, (0.05 + 0.08 * f) * k, (0.08 + 0.1 * f) * k, 5, 3.4)
      p.pop()
    }
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The left pan stands round the ball: its near cord comes down in front of it to the
    // rim's near side, and the dish's near wall is in front of its foot.
    const a = beamAt(since)
    const L = panL(a)
    outline(p, ink, weight * 0.8)
    cord(p, k, endL(a), rim(L.c, L.phi, 0), LC_MID, 1)
    p.push()
    p.translate(L.c[0] * k, L.c[1] * k)
    p.rotate(-L.phi)
    dish(p, k, ink, weight, s.color)
    p.pop()
  },
})
