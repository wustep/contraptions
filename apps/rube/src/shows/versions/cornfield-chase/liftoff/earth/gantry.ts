import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { FLOOR, R, type Pt } from '../../../../../parts'
import { alpha, box, carried, knock, part, route, type Companion, type Ctx, type Way } from '../kit'
import { beat, IGNITION } from '../music'
import { DUST } from '../worlds'
import { drawPickup, glassPickup, nearPickup, SEAT, type Pickup } from './truck'

/**
 * The gantry. The ball rolls into the cage at the foot of the tower on beat
 * 117 and goes up, and as it passes each of the ten lamps up the tower's
 * side the lamp comes on: one to an eighth, ten eighths, the top one as the
 * cage arrives. Along the arm and into the round window in the rocket's
 * nose, on beat 124. Then the lamps go out again, from the top, one a beat —
 * ten, nine, eight — the arm swings back on the downbeat of 128, and on 133
 * the last one is dark. The rocket takes it from there.
 *
 * The gold ball comes with him. The pickup that brought her through the gate
 * has pulled up at the tower's foot (the gate draws it); she jumps down out
 * of the cab as he rolls past, lands behind him on the eighth, hurries, and
 * they come into the cage together. Up, and along the arm a step behind him,
 * and into the window beside him on 124.
 *
 * The part's frame: the ball comes in rolling on the ground (y = 0); the
 * rocket's axis stands at RX; the pad's top is the ground.
 */

const RX = 2.68
/** The rocket's window, where the ball sits: the rocket part's (-0.5, 0). Its base stands 0.35 under the pad on its mount. */
const WIN: Pt = [RX, FLOOR - 0.35 - 7.3]
const LEG0 = RX - 2.2
const LEG1 = RX - 1.35
const CAGE_X = (LEG0 + LEG1) / 2
/** In the cage he stands to the right, and she to the left of him, touching. */
const HERO_X = CAGE_X + 0.1
const HER_X = HERO_X - 2 * R - 0.01
const TOP = -8.7
const IN = beat(117)
const RISE = [beat(117), beat(122)]
const LAMPS = Array.from({ length: 10 }, (_, i) => beat(117.5 + i * 0.5))
const SEATED = beat(124)
const DARK = Array.from({ length: 10 }, (_, i) => beat(124 + i))
const ARM_BACK = beat(128)

export const GANTRY_HITS = [IN, ...LAMPS, SEATED, ...DARK.slice(1), ARM_BACK]

/* ------------------------------------------------------------------ her way from the pickup to the window */

/** Where the pickup stands at the tower's foot (the back of its bed), in this part's frame. */
export const PARK = -3.0
/** It pulls up on this beat, the jolt swings its door open, and she jumps a moment later, as he rolls by under her. */
export const HALT = beat(115)
export const LEAP = HALT + 0.1
/** The pickup as it stands at the tower's foot once she is out: the door left open, the lamp off. */
const PARKED: Pickup = { rear: PARK, road: FLOOR, pitch: 0, lift: 0, air: 0, turn: 0, door: 1, lamp: 0 }
/** She is down on the road behind him on this beat. */
export const OUT = beat(116)
/** Where she lands, and how fast she is going along the road as she does. */
const LAND_X = -0.85
export const LAND: Pt = [LAND_X, 0]
export const V_LAND = (LAND_X - (PARK + SEAT[0])) / (OUT - LEAP)
/** She leaves the cage a moment after him, and catches him up at the window. */
const HER_GO = RISE[1] + 0.27
const HIS_GO = RISE[1] + 0.15

/** The gold ball in this part's frame from the moment she lands on the road (OUT) to ignition. */
export function goldGantry(t: number): Pt {
  if (t < IN) {
    // A small bounce where she lands; then after him, quicker than he is, into the cage as he stops.
    const T = IN - OUT
    const w = clamp((t - OUT) / T)
    const m0 = V_LAND * T
    const m1 = 2.4 * T
    const x = (2 * w ** 3 - 3 * w ** 2 + 1) * LAND_X + (w ** 3 - 2 * w ** 2 + w) * m0 + (-2 * w ** 3 + 3 * w ** 2) * HER_X + (w ** 3 - w ** 2) * m1
    const b = (t - OUT) / 0.19
    const y = b > 0 && b < 1 ? -0.05 * 4 * b * (1 - b) : 0
    return [x, y]
  }
  if (t < HER_GO) return [HER_X, cageY(t)]
  if (t < SEATED) {
    // Along the arm: slow off the mark, faster, and against him in the window on the beat.
    const T = SEATED - HER_GO
    const d = WIN[0] - 2 * R - 0.01 - HER_X
    const v0 = 0.3
    const v1 = (2 * d) / T - v0
    const u = t - HER_GO
    const s = (v0 * u + 0.5 * ((v1 - v0) / T) * u * u) / d
    const y0 = cageY(HER_GO)
    return [HER_X + d * s, y0 + (WIN[1] - y0) * s]
  }
  return [WIN[0] - 2 * R - 0.01, WIN[1]]
}

/** The cage's floor, where the ball rides, at show time `t`: a steady climb, eased at each end. */
function cageY(t: number): number {
  const u = clamp((t - RISE[0]) / (RISE[1] - RISE[0]))
  // Mostly linear, so the lamps pass on even eighths; a short ease at the two ends (joined up, so the cage never jumps).
  const a = 0.06
  const e = (u < a ? (u * u) / (2 * a) : u > 1 - a ? 1 - a - ((1 - u) * (1 - u)) / (2 * a) : u - a / 2) / (1 - a)
  const y = 0 + (WIN[1] - 0) * e
  // A small settle when it arrives.
  const settle = t > RISE[1] ? 0.04 * Math.exp(-(t - RISE[1]) / 0.12) * Math.sin((t - RISE[1]) * 40) : 0
  return y + settle
}

/** Height of lamp i: where the cage is at its eighth. */
const lampY = (i: number): number => cageY(LAMPS[i]) - 0.35

interface GantryState {
  begin: number
}

export const gantry = part<GantryState>(
  {
    name: 'gantry',
    draw: (p, s, c) => drawGantry(p, s, c),
    over: (p, s, c) => {
      // The cage's front bars, over the two balls in it.
      const t = c.t + s.begin
      const { k, ink, weight } = c
      const y = cageY(t)
      outline(p, ink, weight * 0.7)
      for (const dx of [-0.24, -0.08, 0.08, 0.24]) p.line((CAGE_X + dx) * k, (y + FLOOR) * k, (CAGE_X + dx) * k, (y + FLOOR - 0.42) * k)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const arrive = at(IN)
    const ways: Way[] = [
      { at: 0, p: [-0.5, 0] },
      { at: arrive, p: [HERO_X, 0], ramp: [2.2, 2 * (HERO_X + 0.5) / arrive - 2.2] },
    ]
    const segs = [...route(ways), ...carried((t) => [HERO_X, cageY(t + slot.begin)], arrive, at(HIS_GO), 90)]
    // Out along the arm to the window.
    const from: Way = { at: at(HIS_GO), p: [HERO_X, cageY(HIS_GO)] }
    segs.push(...route([from, { at: at(SEATED), p: WIN, ramp: [0.5, 2 * (WIN[0] - HERO_X) / (at(SEATED) - from.at) - 0.5] }, { at: slot.end - slot.begin, p: WIN }]))
    const gold = (t: number): Companion => {
      const [x, y] = goldGantry(t)
      return { x, y }
    }
    return {
      cells: box(PARK - 0.5, TOP - 1, RX + 3, 2),
      exit: [WIN[0] + 0.5, WIN[1]],
      lane: { segs, fire: arrive },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: IGNITION, at: gold }],
    }
  },
  () => [
    // From the gate's wide framing (the pickup at the tower's foot, the cage) straight into the climb: no push in.
    { t: RISE[0] + 0.6, cells: 7.4, off: [0.9, -0.4] },
    { t: RISE[1] - 0.3, cells: 7.4, off: [0.9, 0.6] },
    { t: SEATED, cells: 11, hold: [RX - 0.5, -4.4] },
    // The countdown: a slow push in on the two in the window as the lamps go out, and the ignition throws it wide again.
    // Close enough, by the last lamp, that the two of them read as two, side by side at the glass.
    { t: beat(133), cells: 5.4, hold: [RX - 0.4, -6.5] },
  ],
)

function drawGantry(p: p5, s: GantryState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k
  // The pickup that brought her, where it pulled up (the gate has it until the ball is here).
  if (t >= s.begin) {
    drawPickup(p, k, ink, weight, PARKED)
    nearPickup(p, k, ink, weight, PARKED)
    glassPickup(p, k, ink, weight, PARKED)
  }
  // The ground, up to the pad.
  outline(p, ink, weight)
  p.line(X(-0.5), X(FLOOR), X(RX - 2.75), X(FLOOR))

  // The tower: two legs, rungs, crossed braces, a crown with the cable's sheave.
  const panel = (TOP - FLOOR) / 7
  solid(p, ink, weight, DUST.rust)
  for (const x of [LEG0, LEG1]) p.rect(X(x), X((TOP + FLOOR) / 2), X(0.09), X(FLOOR - TOP))
  outline(p, ink, weight * 0.7)
  for (let i = 0; i <= 7; i++) {
    const y = FLOOR + panel * i
    p.line(X(LEG0), X(y), X(LEG1), X(y))
    if (i < 7) {
      p.line(X(LEG0), X(y), X(LEG1), X(y + panel))
      p.line(X(LEG1), X(y), X(LEG0), X(y + panel))
    }
  }
  solid(p, ink, weight, DUST.rust)
  p.rect(X(CAGE_X), X(TOP - 0.1), X(LEG1 - LEG0 + 0.3), X(0.2))
  solid(p, ink, weight * 0.8, DUST.bone)
  p.circle(X(CAGE_X), X(TOP + 0.12), X(0.2))

  // The lamps: up the tower's left side. On as the cage passes, out one a beat from the top.
  for (let i = 0; i < 10; i++) {
    const y = lampY(i)
    const on = t >= LAMPS[i] && t < DARK[9 - i]
    const flash = on ? knock(t - LAMPS[i], 0.2) : 0
    const off = t >= DARK[9 - i] ? knock(t - DARK[9 - i], 0.25) : 0
    solid(p, ink, weight * 0.8, on ? '#F4C24E' : DUST.shade)
    p.circle(X(LEG0 - 0.22), X(y), X(0.19))
    p.line(X(LEG0 - 0.12), X(y), X(LEG0 - 0.04), X(y))
    if (on || off > 0.01) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const a = on ? 0.55 + 0.4 * flash : 0.45 * off
      const g = ctx.createRadialGradient(X(LEG0 - 0.22), X(y), 0, X(LEG0 - 0.22), X(y), X(0.5))
      g.addColorStop(0, `rgba(255, 214, 120, ${a})`)
      g.addColorStop(1, 'rgba(255, 214, 120, 0)')
      ctx.fillStyle = g
      ctx.fillRect(X(LEG0 - 0.72), X(y - 0.5), X(1.0), X(1.0))
    }
  }

  // The cable, and the cage on it: a floor and a roof, bars behind (the front bars are drawn over the balls).
  const y = cageY(t)
  outline(p, ink, weight * 0.5)
  p.line(X(CAGE_X), X(TOP + 0.12), X(CAGE_X), X(y + FLOOR - 0.5))
  solid(p, ink, weight, DUST.bone)
  p.rect(X(CAGE_X), X(y + FLOOR + 0.03), X(0.62), X(0.06))
  p.rect(X(CAGE_X), X(y + FLOOR - 0.47), X(0.62), X(0.06))
  // A click at each lamp as the cage goes by it.
  for (let i = 0; i < 10; i++) {
    const since = t - LAMPS[i]
    if (since < 0 || since > 0.25) continue
    p.stroke(alpha(p, ink, 1 - since / 0.25))
    p.strokeWeight(weight)
    const ly = lampY(i)
    p.line(X(LEG0 + 0.05), X(ly), X(LEG0 + 0.18), X(ly))
  }

  // The arm: out from the tower at the window's height, to the rocket; it swings back up on the downbeat of 128.
  const back = easeInOutSine(clamp((t - ARM_BACK) / 0.7))
  const hinge: Pt = [LEG1, WIN[1] + R + 0.05]
  p.push()
  p.translate(X(hinge[0]), X(hinge[1]))
  p.rotate(-back * 1.25)
  solid(p, ink, weight, DUST.rust)
  p.rect(X((WIN[0] - 0.3 - hinge[0]) / 2), X(0.03), X(WIN[0] - 0.3 - hinge[0]), X(0.07))
  outline(p, ink, weight * 0.6)
  p.line(0, X(-0.35), X(WIN[0] - 0.3 - hinge[0]), X(-0.02))
  p.pop()
  // A stay from the tower to the arm's end, while it is out.
  if (back < 0.02) {
    outline(p, ink, weight * 0.5)
    p.line(X(LEG1), X(WIN[1] - 0.6), X(WIN[0] - 0.35), X(hinge[1]))
  }
}
