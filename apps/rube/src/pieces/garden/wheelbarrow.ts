import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, definePiece, over, rail, ramp, segTime, trace, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A wheelbarrow parked on the path, tipped back on its legs with its tray
 * open to the rail. The ball rolls off the rail's end into the tray; the
 * weight brings the barrow forward onto its wheel and it trundles off
 * along the path — gently at first, then slowing — until the wheel meets
 * a chock: the barrow tips forward over its wheel and the ball is dumped
 * out over the tray's lip onto the rail beyond. The barrow stays tipped,
 * handles in the air.
 *
 * The ball rides the tray: through the creak, the run and the tip its lane
 * is sampled from the one motion the barrow is drawn with, so it never
 * runs ahead of the tray or lags behind it.
 */
const SEAT = 0.3
const STOP = 2.0
const CREAK = 0.3
const RUN = 1.0
/** The wheel's axle sits this far ahead of the tray's centre, on the ground. */
const AXLE = 0.22
const WHEEL = 0.11
const AY = 0.5 - WHEEL
/** Tipped back on its legs by this much before the ball comes; tipped forward by this much at the chock. */
const BACK = -0.16
const DUMP = 0.5
const TIP_T = 0.14
/** The ball's seat in the tray, relative to the axle when the barrow is level. */
const SEAT_REL: Pt = [-AXLE, 0.02 - AY]
/** The ball's centre as it rolls out over the lip, and how hard it rolls down the tipped tray. */
const LIP: Pt = [STOP + 0.44, 0]
const SLIDE_A = 12

/**
 * The run along the path, as a fraction of the way: a soft start, a peak
 * before the middle, and a long slowing to the chock with a little pace
 * left to bump it. The speed profile integrated once, at module load.
 */
const RUN_TABLE: number[] = (() => {
  const n = 64
  const acc = [0]
  for (let i = 1; i <= n; i++) {
    const r = (i - 0.5) / n
    acc.push(acc[i - 1] + 0.12 + Math.sin(Math.PI * r) * (1.5 - r))
  }
  return acc.map((a) => a / acc[n])
})()
const runF = (r: number) => {
  const i = Math.min(63, Math.floor(r * 64))
  return RUN_TABLE[i] + (RUN_TABLE[i + 1] - RUN_TABLE[i]) * (r * 64 - i)
}

/** The ball comes to rest in the tipped-back tray. */
const SEAT0: Pt = [SEAT + AXLE + SEAT_REL[0] * Math.cos(BACK) - SEAT_REL[1] * Math.sin(BACK), AY + SEAT_REL[0] * Math.sin(BACK) + SEAT_REL[1] * Math.cos(BACK)]
const IN = arrive([-0.5, 0], SEAT0)
const ARRIVE = segTime(IN)
const T_RUN = ARRIVE + CREAK
const FIRE = T_RUN + RUN

const barrowX = (t: number) => (t < T_RUN ? SEAT : t < FIRE ? SEAT + (STOP - SEAT) * runF(over(t, T_RUN, FIRE)) : STOP)
/** The barrow's tilt about its axle: back on its legs, level as it runs, forward at the chock, with a shudder once the ball is off. */
function tiltAt(t: number): number {
  if (t < ARRIVE) return BACK
  if (t < T_RUN) return BACK * (1 - easeInOutSine(over(t, ARRIVE, T_RUN)))
  if (t < FIRE) return 0
  const since = t - FIRE
  if (since < TIP_T) return DUMP * easeOutQuad(since / TIP_T)
  const s = since - TIP_T
  return DUMP - 0.04 * Math.exp(-s * 3) * Math.sin(s * 20)
}
/** Where the ball's seat is: in the tray, about the axle, wherever the barrow is and however it leans. */
function seatAt(t: number): Pt {
  const a = tiltAt(t)
  const ax = barrowX(t) + AXLE
  return [ax + SEAT_REL[0] * Math.cos(a) - SEAT_REL[1] * Math.sin(a), AY + SEAT_REL[0] * Math.sin(a) + SEAT_REL[1] * Math.cos(a)]
}
/** The tip: the tray flicks the ball up and forward, and it rolls on down the tipped tray to the lip. */
const TIPPED = seatAt(FIRE + TIP_T)
const SLIDE = Math.hypot(LIP[0] - TIPPED[0], LIP[1] - TIPPED[1])
const SLIDE_DIR: Pt = [(LIP[0] - TIPPED[0]) / SLIDE, (LIP[1] - TIPPED[1]) / SLIDE]
const T_LIP = FIRE + Math.sqrt((2 * SLIDE) / SLIDE_A)
const V_LIP = SLIDE_A * (T_LIP - FIRE)
function spillAt(t: number): Pt {
  const [sx, sy] = seatAt(Math.min(t, FIRE + TIP_T))
  const d = (SLIDE_A * Math.pow(t - FIRE, 2)) / 2
  return [sx + SLIDE_DIR[0] * d, sy + SLIDE_DIR[1] * d]
}

const LANE: Lane = {
  segs: [...IN, ...trace(seatAt, ARRIVE, T_RUN, 6), ...trace(seatAt, T_RUN, FIRE, 30), ...trace(spillAt, FIRE, T_LIP, 12), ramp(LIP, [2.5, 0], V_LIP, ROLL)],
  fire: FIRE,
}

export const wheelbarrow = definePiece<{ color: string }>({
  name: 'wheelbarrow',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const x = barrowX(t)
    const tilt = tiltAt(t)

    // The rails in and out, the path between, the chock.
    rail(p, k, ink, weight, -0.5, SEAT - 0.24)
    rail(p, k, ink, weight, STOP + 0.2, 2.5)
    soil(p, k, ink, weight, -0.5, 2.5)
    outline(p, ink, weight)
    p.line((SEAT - 0.24) * k, FLOOR * k, (SEAT - 0.24) * k, 0.5 * k)
    p.line((STOP + 0.2) * k, FLOOR * k, (STOP + 0.2) * k, 0.5 * k)
    solid(p, ink, weight, ink)
    p.triangle((STOP + AXLE + WHEEL - 0.02) * k, 0.5 * k, (STOP + AXLE + WHEEL + 0.1) * k, 0.5 * k, (STOP + AXLE + WHEEL + 0.08) * k, 0.4 * k)
    // A wheel track behind the barrow.
    if (x > SEAT + 0.05) {
      outline(p, ink, weight * 0.6)
      p.line((SEAT + AXLE) * k, 0.49 * k, (x + AXLE) * k, 0.49 * k)
    }

    // The barrow, about its axle.
    const ax = x + AXLE
    p.push()
    p.translate(ax * k, AY * k)
    p.rotate(tilt)
    p.translate(-ax * k, -AY * k)
    // The legs at the back, and the handles.
    outline(p, ink, weight)
    for (const dx of [-0.34, -0.3]) p.line((x + dx) * k, (FLOOR + 0.14) * k, (x + dx - 0.02) * k, 0.5 * k)
    p.line((x - 0.3) * k, (FLOOR + 0.12) * k, (x - 0.6) * k, (FLOOR + 0.02) * k)
    solid(p, ink, weight, ink)
    p.rect((x - 0.6) * k, (FLOOR + 0.02) * k, 0.06 * k, 0.03 * k)
    // The tray: back wall, floor, front wall; the ball sits on its floor.
    solid(p, ink, weight, s.color)
    p.quad((x - 0.38) * k, (FLOOR - 0.12) * k, (x + 0.3) * k, (FLOOR - 0.08) * k, (x + 0.22) * k, (FLOOR + 0.16) * k, (x - 0.24) * k, (FLOOR + 0.16) * k)
    p.fill(ink)
    p.noStroke()
    p.rect((x - 0.01) * k, (FLOOR + 0.13) * k, 0.46 * k, 0.04 * k)
    // The wheel, turning with the ground covered.
    solid(p, ink, weight, bg)
    p.circle(ax * k, AY * k, WHEEL * 2 * k)
    p.push()
    p.translate(ax * k, AY * k)
    p.rotate((x - SEAT) / WHEEL)
    outline(p, ink, weight)
    for (let i = 0; i < 3; i++) {
      p.line(-WHEEL * 0.8 * k, 0, WHEEL * 0.8 * k, 0)
      p.rotate(Math.PI / 3)
    }
    p.pop()
    p.pop()
    // A puff of dust off the wheel at the chock.
    if (since > 0 && since < 0.3) {
      const f = over(since, 0, 0.3)
      p.push()
      p.noStroke()
      const dust = p.color(ink)
      dust.setAlpha(120 * (1 - f))
      p.fill(dust)
      for (const [dx, dy] of [
        [-0.06, -0.04],
        [0.02, -0.08],
        [0.08, -0.03],
      ]) {
        p.circle((STOP + AXLE + dx * (1 + f)) * k, (0.5 + dy * (1 + f * 2)) * k, (0.03 + 0.03 * f) * k)
      }
      p.pop()
    }
    tuft(p, k, ink, weight, 1.1, 0.5, 0.1, 0.02)
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The tray's front wall stands between the viewer and the ball while it rides; its lip comes down to the rail as it tips.
    if (t < ARRIVE - 0.1) return
    const x = barrowX(t)
    const tilt = tiltAt(t)
    const ax = x + AXLE
    p.push()
    p.translate(ax * k, AY * k)
    p.rotate(tilt)
    p.translate(-ax * k, -AY * k)
    solid(p, ink, weight, s.color)
    p.quad((x - 0.36) * k, (FLOOR - R * 0.3) * k, (x + 0.28) * k, (FLOOR - 0.08) * k, (x + 0.22) * k, (FLOOR + 0.16) * k, (x - 0.24) * k, (FLOOR + 0.16) * k)
    outline(p, ink, weight * 0.7)
    for (const dx of [-0.16, 0, 0.14]) p.line((x + dx) * k, (FLOOR - 0.01) * k, (x + dx) * k, (FLOOR + 0.13) * k)
    p.pop()
  },
})
