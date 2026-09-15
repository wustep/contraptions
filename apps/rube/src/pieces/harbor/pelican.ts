import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { piling, water } from './sea'

/**
 * A pelican on a mooring post. The deck stops short over open water; the
 * pelican perches on a post standing in the water just past the end, bent
 * down with its beak open and its lower bill laid level with the deck, so
 * the ball rolls off the end straight into its mouth and sinks into the
 * pouch. The upper bill closes on it, the head comes up with the pouch
 * swinging heavy under the chin, and the bird hops round on its post to
 * face the way out, springs off, flaps across the water to the post at the
 * far deck's start, lands, tips its head down over the deck and opens: the
 * ball slides down the lower bill, off its tip, and drops onto the deck
 * and rolls on. The beak closes and the pelican settles there and stays.
 *
 * The bird is one drawing in its own frame, facing +x and flipped to face
 * the pier while it waits. Its pose is one function of time, and the
 * ball's lane while it is carried is traced from that same pose, so the
 * ball is always exactly where the pouch is — through the sink, the lift,
 * the hop-turn, the flight and the tip.
 */

/* ------------------------------------------------------------------ the pier */

/** The near deck's end and the far deck's start. */
const EDGE = 0.12
const DECK2 = 1.58
/** The mooring posts, standing in the water past each deck's end, and their height. */
const P_NEAR = 0.7
const P_FAR = 1.42
const POST_TOP = -0.08

/* ------------------------------------------------------------------ the bird */

/** The body's centre when perched, and when flying. */
const SIT_Y = POST_TOP - 0.2
const FLY_Y = -0.35
/**
 * The beak: the hinge off the head's centre, the lower bill's length, and the ball's seat in the
 * lower bill's frame. The hinge sits at the head's front edge, so the root of the upper bill swings
 * up ahead of the eye when the mouth is wide rather than back across the head over it.
 */
const HINGE: Pt = [0.075, 0.01]
const BILL = 0.32
const SEAT: Pt = [0.18, -0.02]
/** Where the pouch meets the throat, off the hinge, in the head's frame. */
const THROAT: Pt = [-0.07, 0.1]
/** The gape that wedges the ball, and the wide one it waits with and lets go with. */
const GAPE_HELD = 0.95
const GAPE_WIDE = 1.2
/** The wing's length, and the near wing's shoulder. */
const WING = 0.32
const SHOULDER: Pt = [0.02, -0.07]
/** Flaps a second. */
const FLAP = 2.4

/** The head, in the bird's frame, when it is bent down to the deck: the lower bill's hinge lands at the deck's height, a bill's length past the end. */
const HEAD_CATCH: Pt = [P_NEAR - (EDGE + 0.02 + BILL) - HINGE[0], FLOOR - SIT_Y - HINGE[1]]
/** Tucked against the breast, the beak pointing down: how it rests, and how it turns. */
const HEAD_TUCK: Pt = [0.1, 0.1]
/** Reaching forward in flight, the beak down a little under the weight. */
const HEAD_FLY: Pt = [0.25, -0.1]
/** Out over the deck, tipping. */
const HEAD_TIP: Pt = [0.2, -0.06]
/** Settled after: looking ahead. */
const HEAD_REST: Pt = [0.2, -0.14]
const LOW_TUCK = 0.9
const LOW_FLY = 0.5
const LOW_TIP = 0.85
const LOW_FLICK = 0.65
const LOW_REST = 0.15
const FOLDED = 0.12

/* ------------------------------------------------------------------ timing */

/** The ball starts to sink into the pouch this far before its seat, and takes this long over it. */
const SINK_X = 0.18
const SEAT_X = EDGE + 0.02 + BILL - SEAT[0]
const T_MOUTH = (0.5 + SEAT_X - SINK_X) / ROLL
const SINK = (2 * SINK_X) / ROLL
const T_HELD = T_MOUTH + SINK
const CLAMP = 0.12
const T_LIFT = T_HELD + CLAMP
const LIFT = 0.26
const T_HOP = T_LIFT + LIFT
const HOP = 0.32
const T_LEAP = T_HOP + HOP
const LEAP = 0.22
const T_FLY = T_LEAP + LEAP
const FLIGHT = 0.44
const T_LAND = T_FLY + FLIGHT
const LAND = 0.22
const T_TIP = T_LAND + LAND
const TIP = 0.18
const FIRE = T_TIP + TIP
const OUT = 0.15
const T_OFF = FIRE + OUT
const SETTLE = 0.5

interface Pose {
  bx: number
  by: number
  /** The bird's x-scale: -1 facing the pier it came from, 1 facing on; through 0 in the hop-turn. */
  face: number
  /** The head's centre, in the bird's frame. */
  head: Pt
  /** The lower bill's angle in the bird's frame, radians, positive tipping down. The pouch hangs from it. */
  low: number
  /** The gape: how far the upper bill is lifted off the lower. */
  open: number
  /** The near wing's angle off the body: negative raised. */
  wing: number
  /** 0 perched, 1 flying: the legs trail and the far wing shows. */
  air: number
}

const mix = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]
const smooth = (t: number, a: number, b: number) => easeInOutSine(over(t, a, b))
/** 0 → 1 → 0 over [0, 1], flat at both ends. */
const bump = (f: number) => Math.pow(Math.sin(Math.PI * f), 2)

/** The beat of the wings, from the leap on. */
const flapAt = (t: number) => -0.2 + 0.5 * Math.sin(2 * Math.PI * FLAP * (t - T_LEAP))

function poseAt(t: number): Pose {
  // The body: on the near post, a hop, one smooth push across to the far post, and down onto it.
  const across = smooth(t, T_LEAP, T_TIP)
  const bx = lerp(P_NEAR, P_FAR, across)
  let by = SIT_Y
  if (t >= T_HOP && t < T_LEAP) by = SIT_Y - 0.09 * bump(over(t, T_HOP, T_LEAP))
  else if (t >= T_LEAP && t < T_FLY) by = lerp(SIT_Y, FLY_Y, smooth(t, T_LEAP, T_FLY))
  else if (t >= T_FLY && t < T_LAND) by = FLY_Y - 0.02 * Math.sin(2 * Math.PI * FLAP * (t - T_LEAP))
  else if (t >= T_LAND && t < T_TIP) by = lerp(FLY_Y, SIT_Y, smooth(t, T_LAND, T_TIP))

  const face = t < T_HOP ? -1 : t < T_LEAP ? -Math.cos(Math.PI * over(t, T_HOP, T_LEAP)) : 1
  const air = t < T_LEAP ? 0 : t < T_FLY ? over(t, T_LEAP, T_FLY) : t < T_TIP ? 1 - smooth(t, T_LAND, T_TIP) : 0

  // The head and the bill: down at the deck, up against the breast, forward for the flight, out over the deck, then at rest.
  let head: Pt = HEAD_CATCH
  let low = 0
  if (t >= T_LIFT && t < T_HOP) {
    head = mix(HEAD_CATCH, HEAD_TUCK, smooth(t, T_LIFT, T_HOP))
    low = LOW_TUCK * smooth(t, T_LIFT, T_HOP)
  } else if (t >= T_HOP && t < T_LEAP) {
    head = HEAD_TUCK
    low = LOW_TUCK
  } else if (t >= T_LEAP && t < T_TIP) {
    // The head reaches out as the bird springs.
    const f = smooth(t, T_LEAP, T_LEAP + 0.34)
    head = mix(HEAD_TUCK, HEAD_FLY, f)
    low = lerp(LOW_TUCK, LOW_FLY, f)
  } else if (t >= T_TIP && t < FIRE) {
    head = mix(HEAD_FLY, HEAD_TIP, smooth(t, T_TIP, FIRE))
    low = lerp(LOW_FLY, LOW_TIP, smooth(t, T_TIP, FIRE))
  } else if (t >= FIRE && t < T_OFF) {
    // A toss: the head jerks forward as the mouth opens and the ball slides, so it leaves the tip with a push.
    const f = over(t, FIRE, T_OFF)
    head = [HEAD_TIP[0] + 0.04 * easeInQuad(f), HEAD_TIP[1]]
    low = lerp(LOW_TIP, LOW_FLICK, easeInOutSine(f))
  } else if (t >= T_OFF) {
    const f = smooth(t, T_OFF, T_OFF + SETTLE)
    head = mix([HEAD_TIP[0] + 0.04, HEAD_TIP[1]], HEAD_REST, f)
    low = lerp(LOW_FLICK, LOW_REST, f)
  }
  const open =
    t < T_HELD
      ? GAPE_WIDE
      : t < T_LIFT
        ? lerp(GAPE_WIDE, GAPE_HELD, smooth(t, T_HELD, T_LIFT))
        : t < FIRE
          ? GAPE_HELD
          : t < T_OFF
            ? lerp(GAPE_HELD, GAPE_WIDE, easeOutQuad(over(t, FIRE, FIRE + 0.08)))
            : lerp(GAPE_WIDE, 0.06, smooth(t, T_OFF, T_OFF + SETTLE))

  // The wings: folded, a flick in the hop, open through the flight, folded again with a shrug after the drop.
  let wing = FOLDED
  if (t >= T_HOP && t < T_LEAP) wing = FOLDED - 0.45 * Math.sin(Math.PI * over(t, T_HOP, T_LEAP))
  else if (t >= T_LEAP && t < T_LAND) wing = lerp(FOLDED, flapAt(t), smooth(t, T_LEAP, T_LEAP + 0.14))
  else if (t >= T_LAND && t < T_TIP) wing = lerp(flapAt(t), FOLDED, smooth(t, T_LAND, T_TIP))
  else if (t >= T_OFF + 0.1 && t < T_OFF + 0.5) wing = FOLDED - 0.3 * Math.sin(Math.PI * over(t, T_OFF + 0.1, T_OFF + 0.5))

  return { bx, by, face, head, low, open, wing, air }
}

/** A point in the lower bill's frame — along the bill, and across it, pouch side positive — in the world. */
function billToWorld(q: Pose, [d, y]: Pt): Pt {
  const c = Math.cos(q.low)
  const s = Math.sin(q.low)
  const lx = q.head[0] + HINGE[0] + d * c - y * s
  const ly = q.head[1] + HINGE[1] + d * s + y * c
  return [q.bx + q.face * lx, q.by + ly]
}

/** How far along the lower bill the ball sits: in its seat until the mouth opens, then sliding to the tip and off. */
const alongAt = (t: number) => (t < FIRE ? SEAT[0] : lerp(SEAT[0], BILL + 0.02, easeInQuad(over(t, FIRE, T_OFF))))
/** The ball while the pelican has it. */
const carried = (t: number): Pt => billToWorld(poseAt(t), [alongAt(t), SEAT[1]])
/** The ball rolling into the mouth and sinking into the pouch: slowing to a stop as it settles. */
function sinkAt(t: number): Pt {
  const f = over(t, T_MOUTH, T_HELD)
  const seat = carried(T_HELD)
  return [seat[0] - SINK_X + SINK_X * easeOutQuad(f), seat[1] * easeInOutSine(f)]
}

// Off the bill's tip with the speed the slide gave it, under gravity, to the deck.
const OFF = carried(T_OFF)
const EPS = 0.004
const BEFORE = carried(T_OFF - EPS)
const V_OFF: Pt = [(OFF[0] - BEFORE[0]) / EPS, (OFF[1] - BEFORE[1]) / EPS]
const G = 10
const T_FALL = (-V_OFF[1] + Math.sqrt(V_OFF[1] * V_OFF[1] + 2 * G * Math.max(0.02, -OFF[1]))) / G
const LANDING: Pt = [OFF[0] + V_OFF[0] * T_FALL, 0]

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [sinkAt(T_MOUTH)[0], 0], ROLL),
    ...trace(sinkAt, T_MOUTH, T_HELD, 8),
    ...trace(carried, T_HELD, T_OFF, 84),
    fly(OFF, LANDING, T_FALL, (G * T_FALL * T_FALL) / 8),
    ramp(LANDING, [2.5, 0], V_OFF[0], ROLL),
  ],
  fire: FIRE,
}

/* ------------------------------------------------------------------ drawing */

/** A wing: a long feather-shape from the shoulder, lying back along the body at `a` = 0, raised as `a` goes negative. */
function wing(p: p5, k: number, ink: string, weight: number, color: string, a: number): void {
  p.push()
  p.translate(SHOULDER[0] * k, SHOULDER[1] * k)
  p.rotate(Math.PI + a)
  const L = WING * k
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex(0, 0.035 * k)
  p.bezierVertex(0.3 * L, 0.1 * k, 0.75 * L, 0.07 * k, L, 0)
  p.bezierVertex(0.8 * L, -0.04 * k, 0.45 * L, -0.1 * k, 0.1 * L, -0.08 * k)
  p.vertex(0, -0.045 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The pouch, in the lower bill's frame: a sack from the bill's tip round to the throat, slack or bulging round the ball at `d` along the bill. */
function pouch(p: p5, k: number, ink: string, weight: number, bg: string, low: number, d: number, load: number): void {
  const c = Math.cos(-low)
  const s = Math.sin(-low)
  const tx = THROAT[0] * c - THROAT[1] * s
  const ty = THROAT[0] * s + THROAT[1] * c
  const c1: Pt = [lerp(BILL * 0.9, d + 0.19, load), lerp(0.1, 0.24, load)]
  const c2: Pt = [lerp(0.04, d - 0.2, load), lerp(0.14, 0.27, load)]
  solid(p, ink, weight, bg)
  p.beginShape()
  p.vertex(BILL * k, 0.02 * k)
  p.bezierVertex(c1[0] * k, c1[1] * k, c2[0] * k, c2[1] * k, tx * k, ty * k)
  p.vertex(0, 0.02 * k)
  p.endShape(p.CLOSE)
}

/**
 * The bird in its own frame. `back` is everything behind the ball: wings,
 * legs, neck, body, head, and the whole pouch. `front` is what stands
 * between the viewer and the ball: the pouch's near side from the bill's
 * line down, the lower bill, and the upper bill resting on the ball.
 */
function bird(p: p5, k: number, ink: string, weight: number, color: string, bg: string, q: Pose, d: number, load: number, layer: 'back' | 'front'): void {
  p.push()
  p.translate(q.bx * k, q.by * k)
  p.scale(q.face, 1)
  const [hx, hy] = q.head
  const gx = hx + HINGE[0]
  const gy = hy + HINGE[1]
  if (layer === 'back') {
    if (q.air > 0) wing(p, k, ink, weight, color, q.wing - 0.25 * q.air)
    // The legs: down to the post's cap, or trailing.
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      const x0 = lerp(0.04 * side, 0.02, q.air)
      const x1 = lerp(0.05 * side, -0.13, q.air)
      const y1 = lerp(POST_TOP - SIT_Y, 0.15, q.air)
      p.line(x0 * k, 0.09 * k, x1 * k, y1 * k)
      p.line((x1 - 0.03) * k, y1 * k, (x1 + 0.035) * k, y1 * k)
    }
    // The neck: one band, ink under colour, from the breast to the head. With the head up it bows
    // forward, the S of a pelican's neck; as the head goes down to the deck it hangs from the breast
    // and comes into the head from above and behind, at the nape, so the open bill stands clear of it.
    const s: Pt = [0.14, -0.02]
    const drop = over(hy - s[1], 0.14, 0.4)
    const cx = lerp(Math.max(s[0], hx) + 0.12, hx - 0.1, drop)
    const cy = (s[1] + hy) / 2 - 0.02
    p.noFill()
    p.strokeCap(p.ROUND)
    for (const [c, w] of [
      [ink, 0.1 * k + 2 * weight],
      [color, 0.1 * k],
    ] as [string, number][]) {
      p.stroke(c)
      p.strokeWeight(w)
      p.beginShape()
      p.vertex(s[0] * k, s[1] * k)
      p.quadraticVertex(cx * k, cy * k, hx * k, hy * k)
      p.endShape()
    }
    // The tail, the body, the near wing.
    solid(p, ink, weight, color)
    p.quad(-0.14 * k, -0.03 * k, -0.28 * k, -0.11 * k, -0.27 * k, 0.02 * k, -0.14 * k, 0.06 * k)
    p.ellipse(0, 0, 0.36 * k, 0.24 * k)
    wing(p, k, ink, weight, color, q.wing)
    // The head, and the eye high on it, behind the bill's root.
    solid(p, ink, weight, color)
    p.circle(hx * k, hy * k, 0.16 * k)
    p.noStroke()
    p.fill(ink)
    p.circle((hx - 0.01) * k, (hy - 0.03) * k, 0.034 * k)
    // The pouch, whole, behind the ball.
    p.push()
    p.translate(gx * k, gy * k)
    p.rotate(q.low)
    pouch(p, k, ink, weight, bg, q.low, d, load)
    p.pop()
  } else {
    p.push()
    p.translate(gx * k, gy * k)
    p.rotate(q.low)
    // The pouch's near side, from the bill's line down: the ball sits in it, its top showing.
    // (p5's own push/pop, so the clip is dropped and its fill cache resynced with it.)
    p.push()
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    ctx.rect(-k, 0, 3 * k, 2 * k)
    ctx.clip()
    pouch(p, k, ink, weight, bg, q.low, d, load)
    p.pop()
    // The lower bill, and the upper one hinged open.
    solid(p, ink, weight, bg)
    p.triangle(0, 0, BILL * k, 0.012 * k, 0, 0.04 * k)
    p.rotate(-q.open)
    p.beginShape()
    p.vertex(0, -0.055 * k)
    p.vertex((BILL + 0.05) * k, -0.012 * k)
    p.vertex((BILL + 0.04) * k, 0.022 * k)
    p.vertex(0, 0)
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.pop()
}

/** How full the pouch is: the ball sinking into it, in it, and sliding out. */
function loadAt(t: number): number {
  if (t < T_MOUTH) return 0
  if (t < T_HELD) return easeInOutSine(over(t, T_MOUTH, T_HELD))
  if (t < FIRE) return 1
  return 1 - over(t, FIRE + 0.04, T_OFF + 0.06)
}

export const pelican = definePiece<{ color: string }>({
  name: 'pelican',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const q = poseAt(t)
    // The two decks, the water between, the pilings, and the two mooring posts standing in the water.
    water(p, k, ink, weight, -0.5, 2.5)
    rail(p, k, ink, weight, -0.5, EDGE)
    rail(p, k, ink, weight, DECK2, 2.5)
    piling(p, k, ink, weight, EDGE - 0.07)
    piling(p, k, ink, weight, DECK2 + 0.07)
    for (const x of [P_NEAR, P_FAR]) {
      post(p, k, ink, weight * 1.4, x, POST_TOP, 0.5)
      outline(p, ink, weight)
      p.line((x - 0.07) * k, POST_TOP * k, (x + 0.07) * k, POST_TOP * k)
    }
    bird(p, k, ink, weight, s.color, bg, q, alongAt(t), loadAt(t), 'back')
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    bird(p, k, ink, weight, s.color, bg, poseAt(t), alongAt(t), loadAt(t), 'front')
  },
})
