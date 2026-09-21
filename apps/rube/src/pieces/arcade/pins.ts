import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, post, rail, ramp, roll, segTime, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score, tube } from './neon'

/**
 * A bowling lane two cells long. The rail becomes a polished alley and the
 * ball picks up pace down it; at the far end the alley stops and the rail
 * runs on alone over the pit, an open bin, and on the rail over the pit ten
 * pins stand in four ranks, the ranks behind peeping up over the ones in
 * front. The ball ploughs into them: the pins go up off the rail one rank
 * after another, each on its own arc, tumbling end over end, and come down
 * past the rail into the pit, where each lands, hops once and lies on its
 * side on the ones that fell before it; the strike lamp in the hood over
 * the deck flares, three hundred pops, and the ball, slowed by the hit,
 * rolls on under them and out along the rail. Then the pit clears itself:
 * its floor carries the heap to the back wall, the lift there takes the
 * pins up into the hood one after another, and the setter comes down out of
 * the hood with a fresh rack, stands it on the rail and goes back up.
 */
export interface PinsState {
  color: string
  pin: string
  /** What each pin adds of its own to its flight off the strike: `vy` to how high it goes, `spin` to how far round it still has to come when it lands. */
  scatter: { vx: number; vy: number; spin: number }[]
}

/** The alley starts here and the deck's back wall stands here. */
const LANE0 = -0.3
const DECK_END = 1.44
/** The first rank, the space between ranks, and how wide a pin is where the ball meets it. */
const PIN0 = 0.95
const RANK = 0.11
const PIN_W = 0.075
/** The alley's slab under the rail. */
const SLAB = 0.12
const PIT_TOP = FLOOR + SLAB
/** Down the alley, and after the hit. */
const V_LANE = 4.0
const V_HIT = 2.2
/** The ball's centre when its front meets the first pin. */
const HIT = PIN0 - R - PIN_W / 2
const RUN = [roll([-0.5, 0], [LANE0, 0], ROLL), ramp([LANE0, 0], [0.4, 0], ROLL, V_LANE), roll([0.4, 0], [HIT, 0], V_LANE)]
const T_HIT = segTime(RUN)
const LANE: Lane = {
  segs: [...RUN, ramp([HIT, 0], [1.3, 0], V_LANE, V_HIT), ramp([1.3, 0], [1.5, 0], V_HIT, ROLL)],
  fire: T_HIT,
}

/** A pin: as tall as the ball is wide, its weight low in the belly, this share of its height up from the base; in the air it turns about that. */
const TALL = 0.26
const LOW = 0.4
/** Half a pin's outline from the crown down: how far down, and how far out, in heights. A round head, a neck, a belly, a foot. */
const PROFILE: Pt[] = [
  [0, 0],
  [0.013, 0.05],
  [0.05, 0.087],
  [0.1, 0.1],
  [0.15, 0.091],
  [0.2, 0.078],
  [0.26, 0.072],
  [0.33, 0.08],
  [0.41, 0.107],
  [0.5, 0.146],
  [0.59, 0.17],
  [0.67, 0.178],
  [0.76, 0.17],
  [0.85, 0.148],
  [0.93, 0.122],
  [1, 0.105],
]
const PIN_SHAPE: Pt[] = [
  ...PROFILE.map(([d, w]): Pt => [w * TALL, (d - 1 + LOW) * TALL]),
  ...PROFILE.slice(1)
    .reverse()
    .map(([d, w]): Pt => [-w * TALL, (d - 1 + LOW) * TALL]),
]
const BELLY = 0.178 * TALL
/** The band round the neck: how far up from the pin's middle, and how wide the neck is there. */
const BAND = { y: (0.245 - 1 + LOW) * TALL, w: 0.12 * TALL, h: 0.05 * TALL }

/** The rack: rank r has r + 1 pins, the ones behind a little up and along; the head pin's belly is where the ball's front meets it, and each rank is struck as the ball reaches it, so long after the strike. */
const RACK: { x: number; y: number; at: number }[] = []
for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++) RACK.push({ x: PIN0 - PIN_W / 2 + BELLY + r * RANK + j * 0.022, y: FLOOR - LOW * TALL - j * 0.028, at: r * 0.032 + j * 0.008 })

/** The pit: the alley's end turned down into an open bin under the pins, from the rail to the ground; its walls, and the top of its floor. */
const BIN0 = 0.76
const BIN1 = 1.47
const WALL = 0.04
const BED = 0.475
/** The alley and the pit, one body: the slab's top, down into the bin and up its back wall, and back along underneath. */
const BODY: Pt[] = [
  [LANE0, FLOOR],
  [BIN0 + WALL, FLOOR],
  [BIN0 + WALL, BED],
  [BIN1 - WALL, BED],
  [BIN1 - WALL, FLOOR],
  [BIN1, FLOOR],
  [BIN1, 0.5],
  [BIN0, 0.5],
  [BIN0, PIT_TOP],
  [LANE0, PIT_TOP],
]

/** The pins fall slower than the ball would, so that each can be followed down. */
const G = 5.5
/**
 * Where each pin ends up, in the rack's order: where its middle lies in the
 * heap, the angle it has turned through by the time it lies still (on its
 * side, head down a little, or leaning on a wall or a neighbour), how high
 * it is thrown, and how high it hops where it lands. The front ranks are
 * bowled over low and land first, along the pit's floor; the back ranks are
 * thrown highest and land last, on top.
 */
const FALLS: [number, number, number, number, number][] = [
  [1.14, 0.405, 263, 0.04, 0.05],
  [0.92, 0.405, 97, 0.07, 0.055],
  [1.31, 0.4, -97, 0.08, 0.05],
  [0.97, 0.33, -428, 0.1, 0.045],
  [1.31, 0.33, -425, 0.12, 0.04],
  [1.12, 0.335, 457, 0.13, 0.04],
  [1.2, 0.205, 440, 0.27, 0.03],
  [1.04, 0.27, -457, 0.25, 0.035],
  [1.25, 0.268, 263, 0.2, 0.035],
  [1.1, 0.21, -260, 0.17, 0.03],
]
/** The heap is laid from the floor up: the order the fallen pins are drawn in. */
const LAID = FALLS.map((_, i) => i).sort((a, b) => FALLS[b][1] - FALLS[a][1] || a - b)

/**
 * The pit clears itself this long after the strike: its floor runs the heap
 * back to the lift on the back wall at one pace, the lift takes each pin up
 * at another, and once the last is in the hood the setter brings the fresh
 * rack down this far, lets go, and goes back up.
 */
const T_CLEAR = 2.0
const V_BED = 0.9
const V_LIFT = 2.0
const LIFT_X = 1.365
const T_SET = T_CLEAR + 0.98
const T_STOOD = T_SET + 0.5
const T_DONE = T_STOOD + 0.35
const LOWERED = 0.54
/** The setter's bar, across the heads of the front pins of each rank, and the two rods it hangs on. */
const BAR = { x0: 0.9, x1: 1.41, y: FLOOR - TALL - 0.03, h: 0.035 }
const RODS = [1.0, 1.32]

/** The hood over the deck, on a post at the deck's back, and the strike lamp in it. */
const HOOD = { x0: 0.8, x1: DECK_END + 0.02, y0: -0.5, y1: -0.37 }
const LAMP: Pt = [(HOOD.x0 + HOOD.x1) / 2, (HOOD.y0 + HOOD.y1) / 2]

/** How far above its place on the rail the fresh rack hangs. */
const hung = (since: number) => LOWERED * (1 - easeInOutSine(over(since, T_SET, T_STOOD)))

/**
 * Where pin `i` is, `since` the strike: standing; thrown, on a parabola from
 * its place in the rack to where it first touches down; hopping from there
 * to where it lies; lying; carried along the pit's floor to the lift and up
 * it into the hood; and coming down again in the setter's grip.
 */
function pinAt(i: number, since: number, scatter: PinsState['scatter']): { x: number; y: number; a: number } {
  const { x, y, at } = RACK[i]
  const u = since - at
  if (u <= 0) return { x, y, a: 0 }
  if (since >= T_SET) return { x, y: y - hung(since), a: 0 }
  const [hx, hy, deg, rise, hop] = FALLS[i]
  const turn = (deg * Math.PI) / 180
  if (since >= T_CLEAR) {
    const v = since - T_CLEAR
    const ride = (LIFT_X - hx) / V_BED
    if (v < ride) return { x: hx + V_BED * v, y: hy, a: turn }
    const w = v - ride
    const up = Math.round(turn / (2 * Math.PI)) * 2 * Math.PI
    return { x: LIFT_X, y: hy - V_LIFT * w, a: turn + (up - turn) * easeOutQuad(over(w, 0, 0.16)) }
  }
  const mine = scatter[i]
  const v0 = Math.sqrt(2 * G * rise * (0.92 + 0.16 * over(-mine.vy, 1.6, 3)))
  const T1 = (v0 + Math.sqrt(v0 * v0 + 2 * G * (hy - y))) / G
  const T2 = Math.sqrt((8 * hop) / G)
  // It keeps half its pace along through the landing, and still has this much of its turn to come.
  const c = (0.5 * T2) / T1
  const tx = (hx + c * x) / (1 + c)
  const cock = Math.sign(turn) * (0.3 + 0.03 * Math.abs(mine.spin))
  if (u < T1) return { x: x + ((tx - x) * u) / T1, y: y - v0 * u + (G / 2) * u * u, a: ((turn - cock) * u) / T1 }
  const f = (u - T1) / T2
  if (f < 1) return { x: tx + (hx - tx) * f, y: hy - 4 * hop * f * (1 - f), a: turn - cock * (1 - easeOutQuad(f)) }
  // Lying, it rocks a moment on its belly and is still.
  const w = u - T1 - T2
  return { x: hx, y: hy, a: turn + Math.sign(turn) * 0.09 * Math.sin(24 * w) * Math.exp(-9 * w) }
}

function pin(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x: number, y: number, a: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  solid(p, ink, weight * 0.55, color)
  p.beginShape()
  for (const [px, py] of PIN_SHAPE) p.vertex(px * k, py * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(bg)
  p.rect(0, BAND.y * k, BAND.w * k, BAND.h * k)
  p.pop()
}

export const pins = definePiece<PinsState>({
  name: 'pins',
  points: 300,
  weight: 1,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // The pins in a colour of their own: not the alley's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    const scatter = RACK.map(() => ({
      vx: rng.bool(0.3) ? -0.5 * rng.next() : 0.2 + 1.3 * rng.next(),
      vy: -(1.6 + 1.4 * rng.next()),
      spin: (rng.bool() ? 1 : -1) * (5 + 7 * rng.next()),
    }))
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color, pin: pool.length ? rng.pick(pool) : color, scatter } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const struck = since < 0 ? 0 : 1 - over(since, 1.6, 2.6)
    // The alley lights come on as the ball comes down it.
    const lit = t < 0 ? 0 : 1 - over(since, 0.6, 1.6)
    const clearing = since > T_CLEAR && since < T_SET
    const setting = since >= T_SET && since < T_DONE

    // The alley and the pit: a slab under the rail from the lane's start, turned down at its end into the open bin the pins come down into.
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (const [x, y] of BODY) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    // The pit at work: cleats on its floor running back to the lift, and the lift's running up the back wall and the post into the hood.
    if (clearing) {
      const v = since - T_CLEAR
      outline(p, ink, weight * 0.8)
      for (let n = 0; n < 5; n++) {
        const x = BIN0 + WALL + 0.03 + ((n * 0.12 + v * V_BED) % 0.6)
        p.line(x * k, BED * k, x * k, (BED - 0.025) * k)
      }
      for (let n = 0; n < 6; n++) {
        const y = BED - 0.04 - ((n * 0.14 + v * V_LIFT) % 0.84)
        p.line((BIN1 - WALL) * k, y * k, (BIN1 - WALL - 0.04) * k, y * k)
      }
    }
    // Whatever goes up into the hood, or comes down out of it, is cut off at the hood's top: it is inside.
    p.push()
    if (clearing || setting) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.beginPath()
      ctx.rect(-0.5 * k, (HOOD.y0 + 0.03) * k, 2 * k, 1.1 * k)
      ctx.clip()
    }
    // The pins that stand, back ranks first, so the front ones stand in front; then the ones that are down or on their way, from the pit's floor up.
    for (let i = RACK.length - 1; i >= 0; i--) {
      if (since > RACK[i].at && since < T_SET) continue
      const q = pinAt(i, since, s.scatter)
      pin(p, k, ink, weight, s.pin, bg, q.x, q.y, q.a)
    }
    if (since < T_SET) {
      for (const i of LAID) {
        if (since <= RACK[i].at) continue
        const q = pinAt(i, since, s.scatter)
        pin(p, k, ink, weight, s.pin, bg, q.x, q.y, q.a)
      }
    }
    // The setter: a bar on two rods out of the hood, down on the fresh rack's heads until it stands, then away.
    if (setting) {
      const up = since < T_STOOD ? hung(since) : 0.3 * easeInOutSine(over(since, T_STOOD + 0.05, T_DONE))
      outline(p, ink, weight)
      for (const x of RODS) p.line(x * k, HOOD.y1 * k, x * k, (BAR.y - up) * k)
      solid(p, ink, weight, s.color)
      p.rect(((BAR.x0 + BAR.x1) / 2) * k, (BAR.y - up) * k, (BAR.x1 - BAR.x0) * k, BAR.h * k, 0.01 * k)
    }
    p.pop()
    // The alley's legs, and the rail: the alley's surface, and then alone over the pit, where the pins stand on it.
    for (const x of [-0.2, 0.5]) post(p, k, ink, weight, x, PIT_TOP, 0.5)
    rail(p, k, ink, weight, -0.5, 1.5)
    // The lane's light along the slab's side, on as the ball goes down it: in the pins' colour, since the slab's own is lost on it.
    tube(p, k, ink, weight, s.pin, LANE0 + 0.06, FLOOR + SLAB / 2, 0.68, FLOOR + SLAB / 2, lit)
    // The hood over the deck on its post, which stands on the pit's back wall, and the strike lamp in it.
    outline(p, ink, weight)
    p.line((BIN1 - WALL) * k, HOOD.y1 * k, (BIN1 - WALL) * k, FLOOR * k)
    glow(p, k, s.color, LAMP[0], LAMP[1], 0.24, struck)
    solid(p, ink, weight, s.color)
    p.rect(((HOOD.x0 + HOOD.x1) / 2) * k, ((HOOD.y0 + HOOD.y1) / 2) * k, (HOOD.x1 - HOOD.x0) * k, (HOOD.y1 - HOOD.y0) * k, 0.02 * k)
    lamp(p, k, ink, weight, s.color, bg, LAMP[0], LAMP[1], 0.045, struck)
    // The strike.
    flash(p, k, s.color, weight, PIN0, 0, since, 0.22, 0.12, 0.28)
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, LAMP[0], HOOD.y0 + 0.1, '+300', since, 1),
})
