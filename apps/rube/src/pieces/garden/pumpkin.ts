import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { leaf, soil, tuft } from './green'

/**
 * A big ridged pumpkin on the ground of the cell below, its curled stem
 * and one leaf on the shoulder the ball keeps clear of, and the path
 * ending in the air over its near shoulder. The ball rolls off the end
 * and drops onto the dome beside the stem — the pumpkin squashes a hair
 * and the stem bobs — then rolls down the far side, faster as it steepens,
 * and straight off the pumpkin's flank onto the path a floor down, on its
 * way. Or, when the path stops shorter, it lands short of the crown and
 * comes back down the near side instead, a floor down and heading back,
 * which is why the path's end is a bare stub: a stake under it would
 * stand in the ball's way down.
 *
 * The ball's roll over the dome is the pumpkin's own outline, a ball's
 * radius out, with the squash the landing gives the pumpkin folded into
 * both, so it sits on the skin while the skin gives.
 */
export interface PumpkinState {
  color: string
  turn: 1 | -1
}

/** The pumpkin: its half-widths, standing on the ground of the cell below, and how far its centre stands off the cell's middle, away from the way out. */
const RX = 0.4
const RY = 0.34
const OFF = 0.1
/** How much it gives under the landing. */
const SQUASH = 0.07
/** How far off the crown the stem stands, on the shoulder away from the landing, so the ball comes down beside it and not on it. */
const STEM = 0.11
/** Where on the dome the ball lands, and where the flank is steep enough to have let it go, as angles from the crown toward the way out. */
const LAND_A = 0.15
const OFF_A = 1.28
/** The ball slows to this over the path's last stretch before it runs off the end; gravity for the drop and the roll. */
const V_END = 0.9
const G = 14
const G_ROLL = 9
const V0 = 0.5

/** The landing's give: down hard, up past level, and still. */
const squash = (tau: number) => (tau <= 0 ? 0 : 1.25 * Math.exp(-6 * tau) * Math.sin(14 * tau))

/** The pumpkin's half-widths at piece time `t`, given when the ball landed. */
function shape(t: number, tLand: number): Pt {
  const q = squash(t - tLand) * SQUASH
  return [RX * (1 + 0.6 * q), RY * (1 - q)]
}

/** The ball's centre against the skin at angle `a` from straight up, toward `turn`, on a pumpkin of half-widths `rx, ry` centred at `cx`. */
function onSkin(turn: 1 | -1, cx: number, rx: number, ry: number, a: number): Pt {
  const th = -Math.PI / 2 + turn * a
  const px = cx + rx * Math.cos(th)
  const py = 1.5 - ry + ry * Math.sin(th)
  const nx = Math.cos(th) / rx
  const ny = Math.sin(th) / ry
  const n = Math.hypot(nx, ny)
  return [px + (R * nx) / n, py + (R * ny) / n]
}

interface Variant {
  cx: number
  end: number
  tEnd: number
  tLand: number
  /** The roll: the angle reached at each step of time from the landing. */
  angles: number[]
  dt: number
  lane: Lane
}
const VARIANTS = new Map<number, Variant>()
function variantFor(turn: 1 | -1): Variant {
  const had = VARIANTS.get(turn)
  if (had) return had
  const cx = -turn * OFF
  const landAt = onSkin(turn, cx, RX, RY, LAND_A)
  const drop = landAt[1]
  const fall = Math.sqrt((2 * drop) / G)
  // Off the end at V_END, the fall's horizontal way is set by the fall's time.
  const end = landAt[0] - V_END * fall
  const tEnd = (end + 0.5 - 0.2) / ROLL + 0.2 / ((ROLL + V_END) / 2)
  const tLand = tEnd + fall
  // The roll over the dome, under gravity along the skin, tabulated in time.
  const dt = 0.01
  const angles: number[] = [LAND_A]
  let a = LAND_A
  let v = V0
  const y0 = landAt[1]
  while (a < OFF_A) {
    const here = onSkin(turn, cx, RX, RY, a)
    const there = onSkin(turn, cx, RX, RY, a + 0.01)
    const ds = Math.hypot(there[0] - here[0], there[1] - here[1])
    v = Math.sqrt(V0 * V0 + 2 * G_ROLL * (here[1] - y0))
    a += (0.01 * v * dt) / ds
    angles.push(Math.min(a, OFF_A))
  }
  const tOff = tLand + (angles.length - 1) * dt
  const at = (t: number): Pt => {
    const i = Math.min(angles.length - 1, Math.max(0, (t - tLand) / dt))
    const lo = Math.floor(i)
    const ang = angles[lo] + (angles[Math.min(angles.length - 1, lo + 1)] - angles[lo]) * (i - lo)
    const [rx, ry] = shape(t, tLand)
    return onSkin(turn, cx, rx, ry, ang)
  }
  const ride = trace(at, tLand, tOff, 24)
  const off = ride[ride.length - 1].to
  const vOff = Math.hypot(off[0] - ride[ride.length - 1].from[0], off[1] - ride[ride.length - 1].from[1]) / ride[ride.length - 1].dur
  const lane: Lane = {
    segs: [
      roll([-0.5, 0], [end - 0.2, 0], ROLL),
      ramp([end - 0.2, 0], [end, 0], ROLL, V_END),
      fly([end, 0], landAt, fall, drop / 4),
      ...ride,
      ramp(off, [turn * 0.5, 1], vOff, ROLL),
    ],
    fire: tLand,
  }
  const out = { cx, end, tEnd, tLand, angles, dt, lane }
  VARIANTS.set(turn, out)
  return out
}

export const pumpkin = definePiece<PumpkinState>({
  name: 'pumpkin',
  weight: 1,
  place: ({ rng, color, fits }) => {
    for (const turn of rng.shuffle([1, -1] as (1 | -1)[])) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
      ]
      if (!fits(cells, [turn, 1])) continue
      return { cells, exit: { at: [turn, 1], dir: turn }, lane: variantFor(turn).lane, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const { turn } = s
    const v = variantFor(turn)
    const [rx, ry] = shape(t, v.tLand)
    const cy = 1.5 - ry
    const bob = t > v.tLand ? 0.5 * Math.exp(-(t - v.tLand) * 4) * Math.sin((t - v.tLand) * 18) : 0

    // The path in, a stub ending in the air: a stake to the ground would stand in the way of a ball coming back down the near side.
    rail(p, k, ink, weight, -0.5, v.end)
    soil(p, k, ink, weight, -0.5, 0.5, 1.5)
    // The path out a floor down, run in under the flank so the ball comes off the skin onto it.
    rail(p, k, ink, weight, v.cx + turn * RX * 0.9, turn * 0.5, 1 + FLOOR)
    post(p, k, ink, weight, turn * 0.46, 1 + FLOOR, 1.5)
    tuft(p, k, ink, weight, -turn * 0.44, 1.5, 0.1, 0.02)

    // The pumpkin: one body with three ribs.
    solid(p, ink, weight, s.color)
    p.ellipse(v.cx * k, cy * k, rx * 2 * k, ry * 2 * k)
    outline(p, ink, weight * 0.7)
    for (const f of [-0.5, 0, 0.5]) {
      const w = rx * (0.55 + 0.45 * (1 - Math.abs(f)))
      p.arc((v.cx + f * rx * 0.9) * k, cy * k, w * 0.9 * k, ry * 1.94 * k, f < 0 ? Math.PI / 2 : -Math.PI / 2, f < 0 ? (Math.PI * 3) / 2 : Math.PI / 2)
    }
    // The stem and its leaf, on the shoulder the ball does not land on, curled away from it.
    p.push()
    p.translate(v.cx * k, (cy - ry) * k)
    p.scale(-turn, 1)
    leaf(p, k, ink, weight * 0.9, s.color, STEM + 0.03, 0.035, 0.16, 0.42 - bob * 0.3, 0.5)
    p.translate(STEM * k, 0.02 * k)
    p.rotate(bob * 0.5)
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-0.04 * k, 0)
    p.bezierVertex(-0.04 * k, -0.08 * k, 0.01 * k, -0.1 * k, (0.075 + bob * 0.03) * k, (-0.135 - bob * 0.03) * k)
    p.bezierVertex(0.055 * k, -0.08 * k, 0.04 * k, -0.06 * k, 0.045 * k, 0)
    p.endShape(p.CLOSE)
    p.pop()
  },
})
