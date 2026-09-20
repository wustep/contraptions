import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, definePiece, fly, over, post, rail, ramp, segTime, trace, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A stump at the path's end with an axe left in it: the blade bitten into
 * the top by the far rim, the head hanging out over it, the handle laid back
 * across the stump and out over the path's end, level with the rail. The
 * ball rolls out along the handle and stops against the knob at its end;
 * the handle dips under it, the bite creaks — and the blade tears out.
 * Chips fly. The axe is loose on the far rim now with its heavy head over
 * the side, and the head drops: the handle whips up about the rim and
 * flings the ball off its end, up over the stump onto a shelf of path a
 * floor above. The axe slides off the stump behind it and comes to rest
 * on its head, leaning on the far side.
 *
 * The axe is one drawing in its own frame, posed by a pivot and an angle;
 * the ball's seat on the handle rides that pose, so the lane through the
 * dip and the fling is the axe's own motion.
 */
/** The stump's top, its rims, and its foot. */
const TOP = 0.2
const RIM_L = -0.16
const RIM_R = 0.22
/** The axe's frame: the handle's centreline is y = 0, from its knob to the head. The bite point is where the blade's edge sits in the wood. */
const HANDLE = -0.55
const HW = 0.028
const BITE: Pt = [-0.1, 0.13]
const HEAD: Pt[] = [
  [-0.19, -0.06],
  [-0.03, -0.055],
  [0.0, 0.12],
  [-0.21, 0.13],
]
/** Where the axe's origin (the handle over the far rim) rests before anything happens: the bite sunk this far into the top. */
const SUNK = 0.05
const O0: Pt = [RIM_R, TOP + SUNK - BITE[1]]
/** The ball's seat along the handle, against the knob. */
const SEAT_X = HANDLE + 0.06
/** How far the handle dips (radians, the near end down) before the bite gives; how long it takes and the beat before the tear. */
const DIP = 0.26
const DIP_T = 0.3
const CREAK = 0.1
/** The seesaw after the tear: the head's fall accelerates the axe, the ball is let go at this angle (the near end up), and the axe is over at this one. */
const ALPHA = 55
const LET_GO = 0.35
const OVER = 1.15
/** Where the axe comes to rest: on its head at the stump's far foot. */
const O_END: Pt = [0.34, 0.4]
/** Where the ball lands on the shelf. */
const LAND: Pt = [0.42, -1]
const FLIGHT = 0.5
const ARC = 0.5
const LEDGE = 0.32

interface Pose {
  o: Pt
  a: number
}
const rot = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
/** A point of the axe's frame in the piece's, for a pose. */
const place = (pose: Pose, q: Pt): Pt => add(pose.o, rot(q, pose.a))

const BITE_W = add(O0, BITE)
/** The axe rotated by `a` about its bite. */
const aboutBite = (a: number): Pose => ({ o: add(BITE_W, rot([-BITE[0], -BITE[1]], a)), a })

const SEAT_L: Pt = [SEAT_X, -(R + HW)]
const SEAT0 = place(aboutBite(0), SEAT_L)
const IN = arrive([-0.5, 0], [SEAT0[0], 0])
const ARRIVE = segTime(IN)
const T_TEAR = ARRIVE + DIP_T + CREAK
const FIRE = T_TEAR
const T_GO = FIRE + Math.sqrt((2 * (LET_GO + DIP)) / ALPHA)
const T_OVER = FIRE + Math.sqrt((2 * (OVER + DIP)) / ALPHA)
const O_TEAR = aboutBite(-DIP).o

/** The axe at piece time `t`. */
function poseAt(t: number): Pose {
  if (t < ARRIVE) return aboutBite(0)
  if (t < ARRIVE + DIP_T) return aboutBite(-DIP * easeInOutSine(over(t, ARRIVE, ARRIVE + DIP_T)))
  if (t < FIRE) {
    // Creaking in the wood.
    return aboutBite(-DIP + 0.012 * Math.sin(t * 70) * over(t, ARRIVE + DIP_T, FIRE))
  }
  const tau = t - FIRE
  if (t < T_OVER) {
    const a = -DIP + 0.5 * ALPHA * tau * tau
    const slide = easeInQuad(over(t, T_GO, T_OVER))
    return { o: [lerp(O_TEAR[0], O_END[0], slide), lerp(O_TEAR[1], O_END[1], slide)], a }
  }
  const s = t - T_OVER
  return { o: O_END, a: OVER + 0.05 * Math.exp(-s * 8) * Math.sin(s * 30) }
}

const ballAt = (t: number): Pt => place(poseAt(t), SEAT_L)

const LANE: Lane = (() => {
  const ride = [...trace(ballAt, ARRIVE, ARRIVE + DIP_T, 8), ...trace(ballAt, FIRE, T_GO, 8)]
  const go = ride[ride.length - 1].to
  return {
    segs: [
      ...IN,
      { from: [SEAT0[0], 0], to: SEAT0, dur: 0.02 },
      ...ride.slice(0, 8),
      wait(ride[7].to, CREAK),
      ...ride.slice(8),
      fly(go, LAND, FLIGHT, ARC),
      fly(LAND, [LAND[0] + 0.03, -1], 0.03, 0.006),
      ramp([LAND[0] + 0.03, -1], [0.5, -1], 1.6, ROLL),
    ],
    fire: FIRE,
  }
})()

/** The chips: which way each flies from the bite, and how hard. */
const CHIPS: [number, number, number][] = [
  [-1.4, 2.6, 0.4],
  [-0.6, 3.2, -0.8],
  [0.2, 3.4, 0.2],
  [0.9, 2.8, 1.1],
  [1.5, 2.0, -0.5],
]

export const stump = definePiece<{ color: string }>({
  name: 'stump',
  weight: 1,
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
    const pose = poseAt(t)

    // The path in to its last stake, the ground, and the shelf a floor up on a tall stake.
    const railEnd = place(aboutBite(0), [HANDLE - 0.02, 0])[0]
    rail(p, k, ink, weight, -0.5, railEnd)
    post(p, k, ink, weight, railEnd - 0.03)
    soil(p, k, ink, weight, -0.5, 0.5)
    tuft(p, k, ink, weight, -0.3, 0.5, 0.1, 0.02)
    rail(p, k, ink, weight, LEDGE, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.46, -1 + FLOOR, 0.5)

    // The stump: a trunk with a root flare and a sawn top seen a little from above, a ring on it.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(RIM_L * k, TOP * k)
    p.vertex(RIM_L * k, 0.42 * k)
    p.quadraticVertex((RIM_L - 0.01) * k, 0.49 * k, (RIM_L - 0.07) * k, 0.5 * k)
    p.vertex((RIM_R + 0.07) * k, 0.5 * k)
    p.quadraticVertex((RIM_R + 0.01) * k, 0.49 * k, RIM_R * k, 0.42 * k)
    p.vertex(RIM_R * k, TOP * k)
    p.endShape(p.CLOSE)
    solid(p, ink, weight, bg)
    p.ellipse(((RIM_L + RIM_R) / 2) * k, TOP * k, (RIM_R - RIM_L) * k, 0.07 * k)
    outline(p, ink, weight * 0.6)
    p.ellipse(((RIM_L + RIM_R) / 2 + 0.01) * k, TOP * k, (RIM_R - RIM_L) * 0.55 * k, 0.035 * k)
    outline(p, ink, weight * 0.7)
    p.line((RIM_L + 0.07) * k, 0.3 * k, (RIM_L + 0.07) * k, 0.42 * k)
    p.line((RIM_R - 0.08) * k, 0.27 * k, (RIM_R - 0.08) * k, 0.35 * k)

    // The bite left in the top once the blade is out.
    if (since > 0) {
      solid(p, ink, weight * 0.8, ink)
      p.quad((BITE_W[0] - 0.09) * k, (TOP - 0.01) * k, (BITE_W[0] + 0.09) * k, (TOP - 0.01) * k, (BITE_W[0] + 0.06) * k, (TOP + 0.03) * k, (BITE_W[0] - 0.06) * k, (TOP + 0.03) * k)
    }

    // The axe, in its pose: the handle with its knob, and the head with the blade's bright edge.
    p.push()
    p.translate(pose.o[0] * k, pose.o[1] * k)
    p.rotate(pose.a)
    solid(p, ink, weight, bg)
    p.rect(((HANDLE + HEAD[0][0]) / 2) * k, 0, (HEAD[0][0] - HANDLE) * k, HW * 2 * k, HW * k)
    p.ellipse((HANDLE + 0.02) * k, 0, 0.06 * k, 0.075 * k)
    solid(p, ink, weight, bg)
    p.beginShape()
    for (const [x, y] of HEAD) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 2.4)
    p.line(HEAD[2][0] * k, (HEAD[2][1] - 0.006) * k, HEAD[3][0] * k, (HEAD[3][1] - 0.006) * k)
    p.pop()

    // Chips out of the bite as the blade tears free, falling to the ground.
    if (since > 0 && since < 0.6) {
      solid(p, ink, weight * 0.8, s.color)
      for (const [vx, vy, spin] of CHIPS) {
        const x = BITE_W[0] + vx * since * 0.5
        const y = Math.min(0.48, TOP - vy * since + 9 * since * since)
        chip(p, k, x, y, spin + since * 12 * spin, 1 - over(since, 0.45, 0.6))
      }
    }
  },
})

/** A wood chip: a small sliver, turning. */
function chip(p: p5, k: number, x: number, y: number, a: number, f: number): void {
  if (f <= 0) return
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  p.triangle(-0.03 * f * k, 0.01 * k, 0.03 * f * k, 0.005 * k, 0, -0.02 * f * k)
  p.pop()
}
