import { solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { gardenGreen, nearestHue, soil, tuft } from './green'

/**
 * A big pumpkin on the ground of the cell below, five fat lobes and a
 * stub of stem, and the path ending in the air over its shoulder. The ball
 * slows to the path's end, rolls off it and drops onto the dome beside the
 * stem. A pumpkin is hard, heavy and round underneath: it does not give, it
 * rocks — over toward the shoulder the ball came down on, and back, and
 * still — and the ball rolls down that flank, faster as it steepens, and
 * straight off it onto the path a floor down, on its way. Or, when the path
 * stops shorter, it lands short of the crown and comes back down the near
 * flank instead, a floor down and heading back.
 *
 * The ball's roll over the dome is the pumpkin's own outline, a ball's
 * radius out, turned about the pumpkin's foot by whatever the rock is at
 * that instant, so it stays on the skin while the pumpkin moves under it.
 * The lobes are drawn inside that outline and touch it at their crowns.
 */
export interface PumpkinState {
  color: string
  stem: string
  turn: 1 | -1
}

/** The pumpkin: its half-widths, standing on the ground of the cell below, and how far its centre stands off the cell's middle, away from the way out. */
const RX = 0.4
const RY = 0.33
const OFF = 0.1
/** Its lobes: where each one's middle is across the body, as a share of the half-width, and its own half-width. The outer ones first, the middle one last and in front. */
const LOBES: [number, number][] = [
  [-0.64, 0.36],
  [0.64, 0.36],
  [-0.34, 0.4],
  [0.34, 0.4],
  [0, 0.4],
]
/** How far it rocks over under the landing, how fast, and how soon it is still. */
const ROCK = 0.1
const SWING = 9
const DAMP = 3.2
/** How far off the crown the stem stands, on the shoulder away from the landing. */
const STEM = 0.07
/** Where on the dome the ball lands, and where the flank is steep enough to have let it go, as angles from the crown toward the way out. */
const LAND_A = 0.3
const OFF_A = 1.28
/** The pace the ball has left at the path's end, going on and coming back; gravity for the drop and the roll. */
const V_END = { on: 0.9, back: 0.5790 }
const G = 14
const G_ROLL = 6.0081
const V0 = 0.5

/** How far over it is, `tau` seconds after the landing: toward the landing first. */
const rock = (tau: number) => (tau <= 0 ? 0 : ROCK * Math.exp(-DAMP * tau) * Math.sin(SWING * tau))

/** The ball's centre against the skin at angle `a` from straight up, toward `turn`, on a pumpkin centred at `cx` and standing upright. */
function onSkin(turn: 1 | -1, cx: number, a: number): Pt {
  const th = -Math.PI / 2 + turn * a
  const px = cx + RX * Math.cos(th)
  const py = 1.5 - RY + RY * Math.sin(th)
  const nx = Math.cos(th) / RX
  const ny = Math.sin(th) / RY
  const n = Math.hypot(nx, ny)
  return [px + (R * nx) / n, py + (R * ny) / n]
}

/** `at`, carried round the pumpkin's foot as it rocks `phi` over toward +x. */
function rocked(at: Pt, cx: number, phi: number): Pt {
  const dx = at[0] - cx
  const dy = at[1] - 1.5
  return [cx + dx * Math.cos(phi) - dy * Math.sin(phi), 1.5 + dx * Math.sin(phi) + dy * Math.cos(phi)]
}

interface Variant {
  cx: number
  end: number
  tLand: number
  lane: Lane
}
const VARIANTS = new Map<number, Variant>()
function variantFor(turn: 1 | -1): Variant {
  const had = VARIANTS.get(turn)
  if (had) return had
  const cx = -turn * OFF
  const landAt = onSkin(turn, cx, LAND_A)
  const drop = landAt[1]
  const fall = Math.sqrt((2 * drop) / G)
  // Off the end at its last pace, the fall's horizontal way is set by the fall's time.
  const vEnd = turn > 0 ? V_END.on : V_END.back
  const end = landAt[0] - vEnd * fall
  // It slows over the path's last stretch, or over all the path there is when that is shorter.
  const slow = Math.min(0.2, end + 0.5 - 0.02)
  // The roll over the dome, under gravity along the skin, tabulated in time; the last step is the part of one that reaches the flank's let-go.
  const dt = 0.01
  const angles: number[] = [LAND_A]
  const y0 = landAt[1]
  while (angles[angles.length - 1] < OFF_A) {
    const a = angles[angles.length - 1]
    const here = onSkin(turn, cx, a)
    const there = onSkin(turn, cx, a + 0.01)
    const ds = Math.hypot(there[0] - here[0], there[1] - here[1])
    const v = Math.sqrt(V0 * V0 + 2 * G_ROLL * (here[1] - y0))
    angles.push(a + (0.01 * v * dt) / ds)
  }
  const n = angles.length
  const steps = n - 2 + (OFF_A - angles[n - 2]) / (angles[n - 1] - angles[n - 2])
  const tEnd = (end - slow + 0.5) / ROLL + slow / ((ROLL + vEnd) / 2)
  const tLand = tEnd + fall
  const tOff = tLand + steps * dt
  const at = (t: number): Pt => {
    const i = Math.min(steps, Math.max(0, (t - tLand) / dt))
    const lo = Math.min(n - 2, Math.floor(i))
    return rocked(onSkin(turn, cx, angles[lo] + (angles[lo + 1] - angles[lo]) * (i - lo)), cx, turn * rock(t - tLand))
  }
  const ride = trace(at, tLand, tOff, 24)
  const last = ride[ride.length - 1]
  const vOff = Math.hypot(last.to[0] - last.from[0], last.to[1] - last.from[1]) / last.dur
  const lane: Lane = {
    segs: [
      roll([-0.5, 0], [end - slow, 0], ROLL),
      ramp([end - slow, 0], [end, 0], ROLL, vEnd),
      fly([end, 0], landAt, fall, drop / 4),
      ...ride,
      ramp(last.to, [turn * 0.5, 1], vOff, ROLL),
    ],
    fire: tLand,
  }
  const out = { cx, end, tLand, lane }
  VARIANTS.set(turn, out)
  return out
}

export const pumpkin = definePiece<PumpkinState>({
  name: 'pumpkin',
  weight: 1,
  place: ({ rng, fits, theme, ball }) => {
    for (const turn of rng.shuffle([1, -1] as (1 | -1)[])) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
      ]
      if (!fits(cells, [turn, 1])) continue
      // A pumpkin is pumpkin-coloured and its stem is green, whatever colour the map hands the piece.
      return { cells, exit: { at: [turn, 1], dir: turn }, lane: variantFor(turn).lane, state: { color: nearestHue(theme, 28, ball.color), stem: gardenGreen(theme), turn } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const { turn } = s
    const v = variantFor(turn)

    // The path in, on a post to its own floor, set back from the end so the ball drops clear of it.
    rail(p, k, ink, weight, -0.5, v.end)
    post(p, k, ink, weight, Math.max(-0.46, v.end - 0.22))
    soil(p, k, ink, weight, -0.5, 0.5, 1.5)
    // The path out a floor down, run in under the flank so the ball comes off the skin onto it.
    rail(p, k, ink, weight, v.cx + turn * RX * 0.9, turn * 0.5, 1 + FLOOR)
    post(p, k, ink, weight, turn * 0.46, 1 + FLOOR, 1.5)
    tuft(p, k, ink, weight, -turn * 0.44, 1.5, 0.1, 0.02)

    // The pumpkin, rocking about its foot: the stem behind the body, then the lobes, the outer ones first.
    p.push()
    p.translate(v.cx * k, 1.5 * k)
    p.rotate(turn * rock(t - v.tLand))
    p.translate(0, -RY * k)
    solid(p, ink, weight, s.stem)
    p.beginShape()
    const sx = -turn * STEM
    p.vertex((sx - 0.045) * k, (-RY + 0.04) * k)
    p.vertex((sx - 0.03 - turn * 0.03) * k, (-RY - 0.085) * k)
    p.vertex((sx + 0.035 - turn * 0.03) * k, (-RY - 0.095) * k)
    p.vertex((sx + 0.045) * k, (-RY + 0.04) * k)
    p.endShape(p.CLOSE)
    solid(p, ink, weight, s.color)
    for (const [mid, half] of LOBES) {
      // Each lobe stands as tall as the body is at its middle, so its crown is on the outline the ball rolls on.
      const tall = RY * Math.sqrt(1 - mid * mid)
      p.ellipse(mid * RX * k, 0, half * RX * 2 * k, tall * 2 * k)
    }
    p.pop()
  },
})
