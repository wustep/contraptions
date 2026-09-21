import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'

/**
 * A wringer: two rubber rollers, one over the other, in an iron frame, the
 * nip between them on the ball's own line and a good deal narrower than the
 * ball. The ball rolls over a switch in the rail and the rollers wind up,
 * turning in towards each other; it meets the two of them at once, is
 * drawn into the nip, wrung flat between them, and shot out of the far side
 * at the rollers' own pace, twice its own. The rollers run on and run down.
 *
 * The rollers stand in front of the ball, so what is seen of it in the nip
 * is what would be: a flat lozenge of its colour in the slot between them,
 * going through. The show's ball is out of sight only for that, under a
 * tenth of a second, and its lane through the nip is the rollers' rim pace.
 */
/** The nip, the rollers' radius, and half the slot between them. */
const NIP = 0.6
const RAD = 0.2
const SLOT = 0.05
const AXLE = RAD + SLOT
/** Where the ball first touches both rollers, and where it is let go: a ball's radius off both rims. */
const REACH = Math.sqrt((RAD + R) ** 2 - AXLE ** 2)
const X_IN = NIP - REACH
const X_OUT = NIP + REACH
/** The rollers' rim pace at full speed: what the ball leaves at. */
const RIM = ROLL * 2
/** The switch in the rail, and how long the rollers take to wind up from it. */
const SWITCH = -0.38
const T_SWITCH = (SWITCH + 0.5) / ROLL
const WIND = 0.3
/** Through the nip: picked up from a roll to the rim's pace over the way in, and carried at it. */
const T_IN = (X_IN + 0.5) / ROLL
const GRAB = (2 * (NIP - X_IN)) / (ROLL + RIM)
const CARRY = (X_OUT - NIP) / RIM
const FIRE = T_IN + GRAB
/** How long they run on, and run down. */
const RUN_ON = 0.7
const RUN_DOWN = 1.1

/** The ball's place `u` seconds after it meets the rollers. */
const through = (u: number): Pt => [u <= GRAB ? X_IN + ROLL * u + ((RIM - ROLL) * u * u) / (2 * GRAB) : NIP + RIM * (u - GRAB), 0]

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [X_IN, 0], ROLL),
    // Out of sight only where the rollers' faces are between us and it.
    ...trace(through, 0, GRAB + CARRY, 8).map((seg) => ({ ...seg, hidden: true })),
    ramp([X_OUT, 0], [1.5, 0], RIM, ROLL),
  ],
  fire: FIRE,
}

/** How far the rims have run, in cells, `t` seconds into the piece: wound up from the switch, run on, run down. */
function rimRun(t: number): number {
  const u = t - T_SWITCH
  if (u <= 0) return 0
  const stop = FIRE - T_SWITCH + RUN_ON
  // Wound up on a smooth start: the pace is RIM times a smoothstep, whose integral this is.
  const wound = (v: number) => (v >= WIND ? WIND / 2 + (v - WIND) : (v * v * v) / (WIND * WIND) - (v * v * v * v) / (2 * WIND * WIND * WIND))
  if (u <= stop) return RIM * wound(u)
  const d = Math.min(u - stop, RUN_DOWN)
  return RIM * (wound(stop) + d - (d * d) / (2 * RUN_DOWN))
}

/** The slot's height at `x`: the ball's own until the rims close on it. */
const slotAt = (x: number) => Math.min(2 * R, 2 * (AXLE - Math.sqrt(Math.max(0, RAD * RAD - (x - NIP) ** 2))))

function roller(p: p5, k: number, ink: string, weight: number, color: string, bg: string, y: number, angle: number): void {
  solid(p, ink, weight, color)
  p.circle(NIP * k, y * k, RAD * 2 * k)
  // The axle's end, with a flat on it to show the turning.
  solid(p, ink, weight, bg)
  p.circle(NIP * k, y * k, 0.11 * k)
  p.push()
  p.translate(NIP * k, y * k)
  p.rotate(angle)
  outline(p, ink, weight)
  p.line(-0.03 * k, 0, 0.03 * k, 0)
  p.pop()
}

export const wringer = definePiece<{ color: string }>({
  name: 'wringer',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight, color }) => {
    // The rails either side, each to the rollers' flank, and the frame: one iron upright behind both axles, on a foot.
    rail(p, k, ink, weight, -0.5, X_IN + 0.06)
    post(p, k, ink, weight, -0.12)
    rail(p, k, ink, weight, X_OUT - 0.06, 1.5)
    post(p, k, ink, weight, 1.22)
    solid(p, ink, weight, bg)
    p.rect(NIP * k, 0.01 * k, 0.15 * k, 0.94 * k, 0.03 * k)
    outline(p, ink, weight)
    p.line((NIP - 0.2) * k, 0.5 * k, (NIP + 0.2) * k, 0.5 * k)

    // The switch: a lever in the rail, knocked over as the ball goes by.
    const thrown = over(t, T_SWITCH - 0.04, T_SWITCH + 0.02)
    p.push()
    p.translate(SWITCH * k, (FLOOR - 0.02) * k)
    p.rotate(-0.6 + 1.5 * thrown)
    solid(p, ink, weight, s.color)
    p.rect(0, -0.06 * k, 0.03 * k, 0.12 * k)
    p.pop()

    // The ball in the nip: wrung to the slot's height, and as much longer as that makes it.
    const u = t - T_IN
    if (u > 0 && u < GRAB + CARRY) {
      const [x] = through(u)
      const h = Math.max(2 * SLOT, slotAt(x))
      const w = Math.min(0.46, (4 * R * R) / h)
      solid(p, ink, weight, color)
      p.ellipse(x * k, 0, w * k, h * k)
    }
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    // The rollers, in front of the ball, turning in towards each other.
    const turned = rimRun(t) / RAD
    roller(p, k, ink, weight, s.color, bg, -AXLE, -turned)
    roller(p, k, ink, weight, s.color, bg, AXLE, turned)
  },
})
