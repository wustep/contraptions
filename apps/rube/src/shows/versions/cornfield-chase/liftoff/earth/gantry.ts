import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { FLOOR, laneAt, R, type Lane, type Pt } from '../../../../../parts'
import { alpha, box, carried, knock, part, route, type Companion, type Ctx } from '../kit'
import { beat, IGNITION } from '../music'
import { DUST } from '../worlds'

/**
 * The gantry. The ball rolls into the cage at the foot of the tower on beat
 * 117 and goes up, and as it passes each of the ten lamps up the tower's
 * side the lamp comes on: one to an eighth, ten eighths, the top one as the
 * cage arrives. Along the arm and into the round window in the rocket's
 * nose, on beat 124. Then the lamps go out again, from the top, one a beat —
 * ten, nine, eight — the arm swings back on the downbeat of 128, and on 133
 * the last one is dark. The rocket takes it from there.
 *
 * Brand comes with him. She came out of the bunker after him and caught him
 * up; they are coasting on toward the tower when TARS, behind them, swings
 * its front slab through and knocks them the rest of the way (116½): into
 * the cage hard against its far bars on 117, and they go up together.
 * Along the arm a step behind him, and into the window beside him on 124.
 *
 * The part's frame: the ball comes in rolling on the ground (y = 0); the
 * rocket's axis stands at RX; the pad's top is the ground.
 */

const RX = 2.68
/** The rocket's window, where the ball sits: the rocket part's (-0.5, 0). Its base stands 0.35 under the pad on its mount. */
const WIN: Pt = [RX, FLOOR - 0.35 - 7.3]
const LEG0 = RX - 2.2
const LEG1 = RX - 1.35
/** The tower's near foot (x, this part's frame): TARS stands guard just short of it. */
export const TOWER_FOOT = LEG0
const CAGE_X = (LEG0 + LEG1) / 2
/** In the cage he stands to the right, and she to the left of him, touching. */
const HERO_X = CAGE_X + 0.1
const HER_X = HERO_X - 2 * R - 0.01
const TOP = -8.7
const IN = beat(117)
/** TARS's knock (it is drawn by the gate part, and swings through Brand's back here). */
export const KNOCK = beat(116.5)
/** How fast they come off the gate's apron, coasting (the gate part leaves them at this pace). */
export const V_SEAM = 0.9
/** Coasting, how fast they are going when it knocks them; how fast it sends them; how fast he meets the far bars. */
const V_PRE = 0.6
const V_KNOCK = 5.0
/** Where they are, coasting, from the seam to the knock (x, this part's frame). */
const coastX = (u: number): number => -0.5 + V_SEAM * u - (0.5 * (V_SEAM - V_PRE) / (KNOCK - beat(116))) * u * u
/** The far bars bounce him back a little, and her with him; they settle as the cage lifts. */
/** Brand's back as TARS's slab meets it (x, this part's frame): she coasts at his back. */
export const KNOCK_BACK = coastX(KNOCK - beat(116)) - 3 * R - 0.01
const bounce = (t: number): number => {
  const k = t - IN
  return k <= 0 ? 0 : 0.06 * Math.sin(Math.min(Math.PI, (k * Math.PI) / 0.2)) * Math.exp(-k / 0.2)
}
const RISE = [beat(117), beat(122)]
const LAMPS = Array.from({ length: 10 }, (_, i) => beat(117.5 + i * 0.5))
const SEATED = beat(124)
const DARK = Array.from({ length: 10 }, (_, i) => beat(124 + i))
const ARM_BACK = beat(128)

export const GANTRY_HITS = [KNOCK, IN, ...LAMPS, SEATED, ...DARK.slice(1), ARM_BACK]

/* ------------------------------------------------------------------ her way to the window */

/** She leaves the cage a moment after him, and catches him up at the window. */
const HER_GO = RISE[1] + 0.27
const HIS_GO = RISE[1] + 0.15

/** Brand in this part's frame, given his lane: at his back into the cage, up, along the arm, and in the window beside him. */
function goldGantry(t: number, lane: Lane, begin: number): Pt {
  if (t < IN) return [laneAt(lane, t - begin).x - 2 * R - 0.01, 0]
  if (t < HER_GO) return [HER_X - bounce(t), cageY(t)]
  const seat: Pt = [WIN[0] - 2 * R - 0.01, WIN[1]]
  if (t < SEATED) {
    // Along the arm: slow off the mark, quicker, and easing into the window against him on the beat.
    const y0 = cageY(HER_GO)
    return alongArm([HER_X, y0], seat, 0, SEATED - HER_GO, t - HER_GO)
  }
  const k = settle(t)
  return [seat[0] + k, seat[1]]
}

/** Along the arm from `a` to `b` in `T` seconds, `u` in: off at `v0` cells a second, in at a touch (ARRIVE). */
function alongArm(a: Pt, b: Pt, v0: number, T: number, u: number): Pt {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  const w = Math.max(0, Math.min(1, u / T))
  const m0 = (v0 * T) / L
  const m1 = (ARRIVE * T) / L
  const s = (w ** 3 - 2 * w ** 2 + w) * m0 + (-2 * w ** 3 + 3 * w ** 2) + (w ** 3 - w ** 2) * m1
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]
}

/** How fast the two come into the window, and the little give as they settle against its far side: both the same, so they touch. */
const ARRIVE = 0.4
const settle = (t: number): number => {
  const k = t - SEATED
  return k <= 0 ? 0 : (ARRIVE / 13) * Math.exp(-k / 0.2) * Math.sin(k * 13)
}

/** The cage's floor, where the ball rides, at show time `t`: a steady climb, eased at each end. */
function cageY(t: number): number {
  const u = clamp((t - RISE[0]) / (RISE[1] - RISE[0]))
  // Mostly linear, so the lamps pass on even eighths; a short ease at the two ends (joined up, so the cage never jumps).
  const a = 0.06
  const e = (u < a ? (u * u) / (2 * a) : u > 1 - a ? 1 - a - ((1 - u) * (1 - u)) / (2 * a) : u - a / 2) / (1 - a)
  const y = 0 + (WIN[1] - 0) * e
  // A small settle when it arrives: the cable giving a little as it stops, and taking up again.
  const k = t - RISE[1]
  const settle = k > 0 ? 0.03 * Math.exp(-k / 0.28) * (1 - Math.cos(k * 13)) * 0.5 : 0
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
    // Coasting off the apron, slowing; knocked on 116½ and sent hard across into the cage, meeting its far bars on the
    // beat (a hit, then a small bounce back and settle as it lifts).
    const kn = at(KNOCK)
    const x0 = coastX(kn)
    const T = arrive - kn
    const vHit = (2 * (HERO_X - x0)) / T - V_KNOCK
    const knocked = (u: number): Pt => {
      const k = u - kn
      return [x0 + V_KNOCK * k + (0.5 * (vHit - V_KNOCK) / T) * k * k, 0]
    }
    const segs = [
      ...carried((u) => [coastX(u), 0], 0, kn, 12),
      ...carried(knocked, kn, arrive, 16),
      ...carried((t) => [HERO_X - bounce(t + slot.begin), cageY(t + slot.begin)], arrive, at(HIS_GO), 90),
    ]
    // Out along the arm to the window.
    const from: Pt = [HERO_X, cageY(HIS_GO)]
    segs.push(...carried((t) => alongArm(from, WIN, 0, SEATED - HIS_GO, t + slot.begin - HIS_GO), at(HIS_GO), at(SEATED), 60))
    // Into the window on the beat, a small give against its far side, and still.
    segs.push(...carried((t) => [WIN[0] + settle(t + slot.begin), WIN[1]], at(SEATED), at(SEATED) + 1.2, 48))
    segs.push(...route([{ at: at(SEATED) + 1.2, p: WIN }, { at: slot.end - slot.begin, p: WIN }]))
    const lane: Lane = { segs, fire: arrive }
    const gold = (t: number): Companion => {
      const [x, y] = goldGantry(t, lane, slot.begin)
      return { x, y }
    }
    return {
      cells: box(-0.5, TOP - 1, RX + 3, 2),
      exit: [WIN[0] + 0.5, WIN[1]],
      lane,
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: IGNITION, at: gold }],
    }
  },
  () => [
    // From the gate's framing of the tower's foot straight into the climb: no push in.
    { t: RISE[0] + 0.6, cells: 7.4, off: [0.9, -0.4] },
    // The tower's foot and the cage going up out of it: Murph racing up the apron after them, TARS's slab across her
    // way (120), into it (120½), and again (122). Held, the cage rising up through the top of the frame.
    { t: beat(119.6), cells: 7.0, hold: [0.1, -2.5], w: 0.95 },
    { t: beat(122.2), cells: 7.6, hold: [0.2, -2.9], w: 0.95 },
    // The two-shot of the countdown: the two of them in the window at the top of the frame, and at the foot of the
    // tower, at the bottom, Murph, kept back by TARS, looking up. Held while the lamps go out, to the arm swinging back.
    { t: SEATED, cells: 9.6, hold: [RX - 1.5, -3.85] },
    { t: beat(130.5), cells: 9.4, hold: [RX - 1.4, -3.9] },
    // The countdown: a slow push in on the two in the window as the lamps go out, and the ignition throws it wide again.
    // Close enough, by the last lamp, that the two of them read as two, side by side at the glass.
    { t: beat(133), cells: 6.0, hold: [RX - 0.4, -6.6] },
  ],
)

function drawGantry(p: p5, s: GantryState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k
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
