import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FAST, R, ROLL, burst, definePiece, over, rail, ramp, roll, type Lane } from '../../parts'
import { soil, tuft } from './green'

/**
 * A garden gate. A picket gate hangs shut across the path between two
 * posts with a ball on top of each, its latch bar lying in the keeper on
 * the far post; a cord runs from its top corner through a ring on that
 * post and down to a flowerpot hung by its hole, which is what keeps the
 * gate shut. The ball runs into it: the knock hops the latch out of its
 * keeper and the gate gives, swinging away on the near post with the ball
 * shouldering through after it, slowly — the ball is paying to haul the
 * pot up. The gate comes to the end of its swing; the pot comes down and
 * hauls it shut, faster all the way, and it catches the ball on the back
 * before it is clear and sends it off down the path quicker than it came.
 * The gate bangs on its post, the latch rides up over the keeper and drops
 * in, and the pot bobs on its cord.
 *
 * The gate is drawn as the garden's hoops are: face on, the ball going by
 * in front. Swung open it is edge on at its hinges, and its width on the
 * way there is what is seen of it.
 */
const POST_W = 0.075
const POST_TOP = -0.39
const HINGE_X = 0.2
const LATCH_X = 1.02
/** The gate's hung edge, and how wide it is shut. */
const X0 = HINGE_X + POST_W / 2 + 0.015
const W = LATCH_X - POST_W / 2 - 0.015 - X0
/** The pickets stand from just over the path up to an arched top. */
const FOOT = 0.08
const SHOULDER = -0.26
const ARCH = 0.09
const TIP = 0.05
const PICKETS = 5
const PICKET_W = 0.1
/** The two ledges the pickets are nailed to; the latch lies along the upper one. */
const LEDGES = [-0.16, 0.0]
/** The ring the cord runs through, out on an arm off the far post, and the pot under it. */
const RING: [number, number] = [LATCH_X + 0.16, -0.31]
const POT_Y = 0.17
const POT_W = 0.16
const POT_H = 0.13
/** The pot goes up this much of what the gate's edge comes away by. */
const HAUL = 0.35

/** The ball meets the near post's face here, and shoulders on at this pace. */
const SEAT = HINGE_X - POST_W / 2 - R
const IMPACT = 0.04
const V_PUSH = 1.1
const T_HIT = (SEAT - IMPACT + 0.5) / ROLL + IMPACT / ((ROLL + V_PUSH) / 2)
const OPEN = 0.3
const T_BACK = 0.42
const CLOSE = 0.26
const T_SHUT = T_BACK + CLOSE
const KICK = FAST * 0.95

/** How much of the gate's face is seen, by seconds since the knock: 1 shut, 0 edge on. */
function faceAt(since: number): number {
  if (since < 0) return 1
  if (since < OPEN) return 1 - easeOutCubic(since / OPEN)
  if (since < T_BACK) return 0
  if (since < T_SHUT) return easeInQuad((since - T_BACK) / CLOSE)
  // It bangs on the post and comes off it a hair, twice.
  const s = since - T_SHUT
  return 1 - 0.06 * Math.abs(Math.sin(s * 17)) * Math.exp(-s * 8)
}

/** When the closing edge catches up with the ball's back, since the knock: found, not guessed. */
const S_KICK = (() => {
  const gap = (s: number) => X0 + W * faceAt(s) - (SEAT + V_PUSH * s - R)
  let lo = T_BACK
  let hi = T_SHUT
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (gap(mid) < 0) lo = mid
    else hi = mid
  }
  return hi
})()
const X_KICK = SEAT + V_PUSH * S_KICK

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [SEAT - IMPACT, 0], ROLL),
    // The gate takes the pace off it, and it goes through at what is left.
    ramp([SEAT - IMPACT, 0], [SEAT, 0], ROLL, V_PUSH),
    roll([SEAT, 0], [X_KICK, 0], V_PUSH),
    ramp([X_KICK, 0], [1.5, 0], KICK, ROLL),
  ],
  fire: T_HIT,
}

export const gate = definePiece<{ color: string }>({
  name: 'gate',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: [number, number][] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const shut = since - T_SHUT
    // The knock shakes the gate on its hinges; the bang on the post shakes it less.
    const shake = since < 0 ? 0 : 0.008 * Math.sin(since * 70) * Math.exp(-since * 12)
    const face = faceAt(since)
    const edge = X0 + W * face + shake

    soil(p, k, ink, weight, -0.5, 1.5)
    tuft(p, k, ink, weight, HINGE_X - 0.09, 0.5, 0.1, -0.03)
    tuft(p, k, ink, weight, LATCH_X + 0.27, 0.5, 0.09, 0.03)

    // The posts: square timber up from the ground, a ball on each, and the arm the ring hangs from.
    for (const x of [HINGE_X, LATCH_X]) {
      solid(p, ink, weight, bg)
      p.rect(x * k, ((POST_TOP + 0.5) / 2) * k, POST_W * k, (0.5 - POST_TOP) * k, 0.008 * k)
      solid(p, ink, weight, s.color)
      p.circle(x * k, (POST_TOP - 0.04) * k, 0.09 * k)
    }
    outline(p, ink, weight)
    p.line((LATCH_X + POST_W / 2) * k, RING[1] * k, (RING[0] - 0.02) * k, RING[1] * k)
    // The path runs on between them.
    rail(p, k, ink, weight, -0.5, 1.5)

    // The gate, face on: the ledges behind, the pickets nailed over them, paper between. Swinging, it is
    // one shape with its boards ruled on it, and edge on it is one stile: five pickets a finger wide are a blot.
    const pitch = (W - PICKET_W) / (PICKETS - 1)
    const tops = Array.from({ length: PICKETS }, (_, i) => SHOULDER - ARCH * Math.sin((Math.PI * (i + 0.5)) / PICKETS))
    const at = (i: number) => X0 + shake + (PICKET_W / 2 + i * pitch) * face
    const half = (PICKET_W / 2) * face
    if (face < 0.12) {
      solid(p, ink, weight, s.color)
      p.rect((X0 + 0.0225 + shake) * k, ((SHOULDER - ARCH + TIP + FOOT) / 2) * k, 0.045 * k, (FOOT - SHOULDER + ARCH - TIP) * k, 0.008 * k)
    } else if (face < 0.85) {
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex((at(0) - half) * k, FOOT * k)
      for (let i = 0; i < PICKETS; i++) {
        p.vertex((at(i) - half) * k, (tops[i] + TIP) * k)
        p.vertex(at(i) * k, tops[i] * k)
        p.vertex((at(i) + half) * k, (tops[i] + TIP) * k)
      }
      p.vertex((at(PICKETS - 1) + half) * k, FOOT * k)
      p.endShape(p.CLOSE)
      if (face > 0.3) {
        outline(p, ink, weight * 0.6)
        for (let i = 1; i < PICKETS; i++) {
          const x = (at(i - 1) + at(i)) / 2
          p.line(x * k, (Math.max(tops[i - 1], tops[i]) + TIP + 0.02) * k, x * k, (FOOT - 0.02) * k)
        }
      }
    } else {
      solid(p, ink, weight, bg)
      for (const y of LEDGES) p.rect((X0 + shake + (W * face) / 2) * k, y * k, (W * face - 0.02) * k, 0.055 * k)
      for (let i = 0; i < PICKETS; i++) {
        solid(p, ink, weight, s.color)
        p.beginShape()
        p.vertex((at(i) - half) * k, FOOT * k)
        p.vertex((at(i) - half) * k, (tops[i] + TIP) * k)
        p.vertex(at(i) * k, tops[i] * k)
        p.vertex((at(i) + half) * k, (tops[i] + TIP) * k)
        p.vertex((at(i) + half) * k, FOOT * k)
        p.endShape(p.CLOSE)
      }
    }
    // The hinges: two straps from the post onto the gate.
    outline(p, ink, weight * 1.2)
    for (const y of LEDGES) p.line((HINGE_X + POST_W / 2 + 0.012) * k, y * k, (X0 + 0.03 * Math.max(face, 0.3)) * k, y * k)

    // The keeper on the far post, and the latch on the gate, a bar on a pin: hopped out by the knock, up over the
    // keeper and in as it shuts.
    const keep = LATCH_X - POST_W / 2
    outline(p, ink, weight)
    p.line((keep - 0.015) * k, (LEDGES[0] + 0.035) * k, (keep + 0.03) * k, (LEDGES[0] + 0.035) * k)
    const hop = since < 0 ? 0 : since < 0.3 ? Math.sin(Math.PI * over(since, 0, 0.3)) : shut > -0.07 && shut < 0.07 ? 0.6 * Math.sin(Math.PI * over(shut, -0.07, 0.07)) : 0
    const bar = 0.05 + 0.12 * Math.max(face, 0.12)
    p.push()
    p.translate((edge - 0.09 * face) * k, LEDGES[0] * k)
    p.rotate(-0.95 * hop)
    outline(p, ink, weight * 1.7)
    p.line(0, 0, bar * k, 0)
    solid(p, ink, weight * 0.8, bg)
    p.circle(0, 0, 0.04 * k)
    p.pop()

    // The cord from the gate's corner through the ring, and the pot on the end of it, hung by its hole.
    const bob = shut < 0 ? 0 : 0.025 * Math.sin(shut * 15) * Math.exp(-shut * 4)
    const potY = POT_Y - HAUL * W * (1 - face) + bob
    outline(p, ink, weight * 0.7)
    p.line(edge * k, (SHOULDER + 0.02) * k, RING[0] * k, RING[1] * k)
    p.line(RING[0] * k, RING[1] * k, RING[0] * k, potY * k)
    solid(p, ink, weight * 0.8, bg)
    p.circle(RING[0] * k, RING[1] * k, 0.04 * k)
    solid(p, ink, weight, s.color)
    p.quad((RING[0] - POT_W * 0.36) * k, potY * k, (RING[0] + POT_W * 0.36) * k, potY * k, (RING[0] + POT_W / 2) * k, (potY + POT_H) * k, (RING[0] - POT_W / 2) * k, (potY + POT_H) * k)
    p.rect(RING[0] * k, (potY + POT_H) * k, (POT_W + 0.04) * k, 0.045 * k)

    // The knock on the post, the gate's edge on the ball's back, and the latch going home.
    p.push()
    p.strokeWeight(weight)
    if (since > 0 && since < 0.18) {
      const f = over(since, 0, 0.18)
      p.stroke(ink)
      for (const a of [-0.55, 0, 0.55]) {
        const r0 = 0.04 + 0.06 * f
        const r1 = r0 + 0.05 * (1 - f)
        p.line((HINGE_X + POST_W / 2 + Math.cos(a) * r0) * k, (-0.27 + Math.sin(a) * r0) * k, (HINGE_X + POST_W / 2 + Math.cos(a) * r1) * k, (-0.27 + Math.sin(a) * r1) * k)
      }
    }
    const kicked = since - S_KICK
    if (kicked > 0 && kicked < 0.2) {
      const f = over(kicked, 0, 0.2)
      p.stroke(ink)
      burst(p, (X_KICK - R) * k, -0.02 * k, (0.14 + 0.12 * f) * k, (0.2 + 0.16 * f) * k, 5, 2.2)
    }
    if (shut > 0 && shut < 0.16) {
      const f = over(shut, 0, 0.16)
      p.stroke(ink)
      for (const dx of [-0.035, 0.035]) p.line((keep + dx) * k, (LEDGES[0] - 0.05 - 0.04 * f) * k, (keep + dx * 1.8) * k, (LEDGES[0] - 0.09 - 0.05 * f) * k)
    }
    p.pop()
  },
})
