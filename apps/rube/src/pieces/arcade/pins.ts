import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, over, post, rail, ramp, roll, segTime, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score, tube } from './neon'

/**
 * A bowling lane two cells long. The rail becomes a polished alley and the
 * ball picks up pace down it; at the far end ten pins stand on the deck in
 * four ranks, the ranks behind peeping up over the ones in front. The ball
 * ploughs into them: the pins go up and over, each on its own arc and its
 * own spin, and come down behind the deck in the pit, where they lie; the
 * strike lamp in the hood over the deck flares, three hundred pops, and
 * the ball, slowed by the hit, rolls on out the back of the deck onto the
 * rail. The pins stay down.
 */
export interface PinsState {
  color: string
  pin: string
  /** Each pin's flight off the strike: its pace forward and up, and its spin. */
  scatter: { vx: number; vy: number; spin: number }[]
}

/** The alley starts here and the deck's back wall stands here. */
const LANE0 = -0.3
const DECK_END = 1.44
/** The first rank, the space between ranks, and a pin's size. */
const PIN0 = 0.95
const RANK = 0.11
const PIN_H = 0.2
const PIN_W = 0.075
/** The alley's slab under the rail, and the pit behind it the pins come down in; where a fallen pin's centre lies. */
const SLAB = 0.12
const PIT_TOP = FLOOR + SLAB
const PIT_X0 = 0.82
const LIE = 0.5 - PIN_W / 2
/** A fallen pin lies wholly inside the pit's walls; and how far along the flung pins would have come down, nearest and farthest. */
const LIE_X0 = PIT_X0 + PIN_H / 2 + 0.03
const LIE_X1 = DECK_END - PIN_H / 2 - 0.03
const FLUNG0 = 0.6
const FLUNG1 = 2.4
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
const G = 10
/** The ten pins: rank r has r + 1 pins, the ones behind a little up and along; each is struck as the ball reaches its rank. */
const PINS: { x: number; y: number; at: number }[] = []
for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++) PINS.push({ x: PIN0 + r * RANK + j * 0.02, y: FLOOR - PIN_H / 2 - j * 0.03, at: T_HIT + r * 0.032 + j * 0.008 })
/** The hood over the deck, on a post at the deck's back, and the strike lamp in it. */
const HOOD = { x0: 0.8, x1: DECK_END + 0.02, y0: -0.5, y1: -0.37 }
const LAMP: Pt = [(HOOD.x0 + HOOD.x1) / 2, (HOOD.y0 + HOOD.y1) / 2]
/** A pin, standing: neck up, belly down. */
const PIN_SHAPE: Pt[] = [
  [-0.016, -0.1],
  [0.016, -0.1],
  [0.02, -0.06],
  [0.03, -0.02],
  [0.037, 0.03],
  [0.034, 0.08],
  [0.024, 0.1],
  [-0.024, 0.1],
  [-0.034, 0.08],
  [-0.037, 0.03],
  [-0.03, -0.02],
  [-0.02, -0.06],
]

/**
 * Where pin `i` is at `t`: standing, in the air, or lying in the pit.
 * Wherever its flight would have taken it, it comes down in the pit, whole:
 * the spread of the ten landings is squeezed to the pit's width, and each
 * pin's pace along is the one that takes it there.
 */
function pinAt(i: number, t: number, scatter: PinsState['scatter']): { x: number; y: number; a: number } {
  const { x, y, at } = PINS[i]
  const s = t - at
  if (s <= 0) return { x, y, a: 0 }
  const { vx, vy, spin } = scatter[i]
  const drop = LIE - y
  const T = (-vy + Math.sqrt(vy * vy + 2 * G * drop)) / G
  const land = LIE_X0 + (LIE_X1 - LIE_X0) * over(x + vx * T, FLUNG0, FLUNG1)
  if (s < T) return { x: x + ((land - x) * s) / T, y: y + vy * s + (G / 2) * s * s, a: spin * s }
  const al = spin * T
  const flat = Math.round((al - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2
  return { x: land, y: LIE, a: al + (flat - al) * Math.min(1, (s - T) / 0.08) }
}

function pin(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, a: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  solid(p, ink, weight * 0.8, color)
  p.beginShape()
  for (const [px, py] of PIN_SHAPE) p.vertex(px * k, py * k)
  p.endShape(p.CLOSE)
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
    const scatter = PINS.map(() => ({
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

    // The pit: a dark box under the deck's end, behind the alley, that the pins come down into.
    solid(p, ink, weight, bg)
    p.rect(((PIT_X0 + DECK_END) / 2) * k, ((PIT_TOP + 0.5) / 2) * k, (DECK_END - PIT_X0) * k, (0.5 - PIT_TOP) * k)
    // The pins, back ranks first, so the front ones stand in front.
    for (let i = PINS.length - 1; i >= 0; i--) {
      const q = pinAt(i, t, s.scatter)
      pin(p, k, ink, weight, s.pin, q.x, q.y, q.a)
    }
    // The alley: a slab under the rail from the lane's start to the back wall, on legs, the rail its surface.
    solid(p, ink, weight, s.color)
    p.rect(((LANE0 + DECK_END) / 2) * k, (FLOOR + SLAB / 2) * k, (DECK_END - LANE0) * k, SLAB * k, 0.01 * k)
    for (const x of [-0.2, 0.5]) post(p, k, ink, weight, x, PIT_TOP, 0.5)
    rail(p, k, ink, weight, -0.5, 1.5)
    // The lane's light along the slab's side, on as the ball goes down it: in the pins' colour, since the slab's own is lost on it.
    tube(p, k, ink, weight, s.pin, LANE0 + 0.06, FLOOR + SLAB / 2, 0.74, FLOOR + SLAB / 2, lit)
    // The hood over the deck on its post, and the strike lamp in it.
    post(p, k, ink, weight, HOOD.x1 - 0.03, HOOD.y1, FLOOR)
    glow(p, k, s.color, LAMP[0], LAMP[1], 0.24, struck)
    solid(p, ink, weight, s.color)
    p.rect(((HOOD.x0 + HOOD.x1) / 2) * k, ((HOOD.y0 + HOOD.y1) / 2) * k, (HOOD.x1 - HOOD.x0) * k, (HOOD.y1 - HOOD.y0) * k, 0.02 * k)
    lamp(p, k, ink, weight, s.color, bg, LAMP[0], LAMP[1], 0.045, struck)
    // The strike.
    flash(p, k, s.color, weight, PIN0, 0, since, 0.22, 0.12, 0.28)
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, LAMP[0], HOOD.y0 + 0.1, '+300', since, 1),
})
