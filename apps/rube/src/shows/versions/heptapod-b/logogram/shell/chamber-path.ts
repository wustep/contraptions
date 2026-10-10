import { FLOOR, type Pt } from '../../../../../parts'
import type { Way } from '../kit'
import { onset, pulse, SEAM } from '../music'

/**
 * The chamber's fixed geometry and its clock: where the glass is, where she walks to, where the palm comes down, and
 * the two of them (Louise and Ian) across the floor. Everything is in the chamber part's own frame: its origin is the
 * shaft's exit, the ball comes in at (-0.5, 0) rolling right, and the floor's surface is y = FLOOR throughout.
 *
 * Staged side on: the glass is the far wall behind the floor, a rectangle of white 30 wide and 17 tall standing on the
 * floor's line, a few cells in from the shaft's mouth; the floor is a dark ledge in front of it, and the two of them
 * roll along its front edge, silhouettes against the light.
 */

/* ------------------------------------------------------------------ the room */

/** The chamber's left wall (the shaft's mouth), its ceiling and its right wall. */
export const WALL_X = -0.5
export const CEIL = -21.5
export const WALL_X1 = 37
/** The glass: its left and right edges and its top; its foot is the floor's line (the floor hides it). */
export const GLASS_X0 = 3
export const GLASS_X1 = 33
export const GLASS_TOP = FLOOR - 17
export const GLASS_BOT = FLOOR

/* ------------------------------------------------------------------ the clock */

/** Out of the shaft (the slot's first moment). */
export const IN = SEAM.chamber
/** The glass wakes in two steps: the fog behind it lights (pulses 365 and 366). */
export const WAKE: readonly [number, number] = [pulse(365), pulse(366)]
/** Abbott's first sight (pulse 407), and Costello's (pulse 424). */
export const ABBOTT_SEEN = pulse(407)
export const COSTELLO_SEEN = pulse(424)
/** Abbott's front limb leaves the fog floor to reach for the glass (the onset at 109.308). */
export const REACH_OFF = onset(109.308, 0.5)
/** She sets off for the glass as the limb comes down (pulse 496); its tip opens into a palm (497). */
export const SET_OFF = pulse(496)
export const OPENS = pulse(497)
/** The palm on the glass, and her touch (pulse 501). */
export const PALM = pulse(501)
/** Costello's ink leaves its limb (509); it reaches the fog and the ring begins (511); the ring's surges. */
export const SPRAY = pulse(509)
export const INK_IN = pulse(511)
export const SURGES: readonly number[] = [pulse(516), pulse(520)]
/**
 * The ring closes, its two ends meeting on the side toward her, on the last pulse with an attack before the swell
 * (528): after it the pulse sinks under the held voices, and the whole logogram hangs there through the swell (four
 * seconds) before the light takes it. Its tendrils put out on the next (533), and go on reaching with the swell.
 */
export const CLOSE = pulse(528)
export const REACH = pulse(533)
/** Her lean toward the ring (pulse 520: its second surge). */
export const LEAN = pulse(520)
/** The cut: through the glass into the fog, on the cue's loudest swell. */
export const OUT = SEAM.fog1

/* ------------------------------------------------------------------ tracks */

/** A stretch of a track: to `until` (show time), the speed changing linearly to `v`; or eased from rest to rest to `to`. */
type Stretch = { until: number; v: number } | { until: number; to: number }

interface Track {
  /** Position along x at show time `t` (held at the ends). */
  x(t: number): number
  /** Velocity at `t`. */
  v(t: number): number
  /** The waypoints, for `route`: `at` in seconds from `t0`. */
  ways(t0: number): Way[]
  /** Where it ends. */
  end: number
}

interface Piece {
  t0: number
  t1: number
  x0: number
  x1: number
  v0: number
  v1: number
  eased: boolean
}

/** A track along the floor from `x` at `t` moving at `v`, through the stretches in order. */
function track(t: number, x: number, v: number, stretches: Stretch[]): Track {
  const pieces: Piece[] = []
  let ct = t
  let cx = x
  let cv = v
  for (const s of stretches) {
    const dur = s.until - ct
    if (dur <= 1e-9) continue
    if ('to' in s) {
      pieces.push({ t0: ct, t1: s.until, x0: cx, x1: s.to, v0: 0, v1: 0, eased: true })
      cx = s.to
      cv = 0
    } else {
      const nx = cx + ((cv + s.v) / 2) * dur
      pieces.push({ t0: ct, t1: s.until, x0: cx, x1: nx, v0: cv, v1: s.v, eased: false })
      cx = nx
      cv = s.v
    }
    ct = s.until
  }
  const at = (q: number): { x: number; v: number } => {
    if (!pieces.length) return { x, v: 0 }
    if (q <= pieces[0].t0) return { x: pieces[0].x0 + v * (q - pieces[0].t0), v }
    for (const p of pieces) {
      if (q > p.t1) continue
      const d = p.t1 - p.t0
      const u = (q - p.t0) / d
      if (p.eased) {
        const e = (1 - Math.cos(Math.PI * u)) / 2
        return { x: p.x0 + (p.x1 - p.x0) * e, v: ((p.x1 - p.x0) * Math.PI * Math.sin(Math.PI * u)) / (2 * d) }
      }
      const s = q - p.t0
      return { x: p.x0 + p.v0 * s + ((p.v1 - p.v0) / (2 * d)) * s * s, v: p.v0 + (p.v1 - p.v0) * u }
    }
    const last = pieces[pieces.length - 1]
    return { x: last.x1, v: 0 }
  }
  return {
    x: (q) => at(q).x,
    v: (q) => at(q).v,
    ways: (t0) => {
      const out: Way[] = [{ at: pieces[0].t0 - t0, p: [pieces[0].x0, 0] }]
      for (const p of pieces) {
        const w: Way = { at: p.t1 - t0, p: [p.x1, 0] }
        if (p.eased) w.ease = 'inout'
        else if (Math.abs(p.v0 - p.v1) > 1e-9 || p.v0 > 1e-9) w.ramp = [p.v0, p.v1]
        out.push(w)
      }
      return out
    },
    end: cx,
  }
}

/* ------------------------------------------------------------------ Louise */

/**
 * Louise: out of the shaft at 0.9, slowing into the dark; at rest as the glass wakes; the long walk to it, stopping
 * when Abbott comes out of the white; on to the glass's foot; at rest through the wide; then, as the limb comes down,
 * to the palm, arriving on it (the touch); a small lean toward the ring as it blooms.
 */
const WALK: Stretch[] = [
  { until: WAKE[0], v: 0.35 },
  { until: 87.95, v: 0 },
  { until: 89.2, v: 0 },
  { until: 90.7, v: 0.7 },
  { until: 96.9, v: 0.7 },
  { until: 98.2, v: 0 },
  { until: 99.4, v: 0 },
  { until: 100.9, v: 0.6 },
  { until: 103.6, v: 0.6 },
  { until: 105.4, v: 0 },
]
/** Where she comes to rest at the glass's foot, and where the palm comes down: a short roll to it. */
export const X_REST = track(IN, -0.5, 0.9, WALK).end
export const X_PALM = X_REST + 0.45
/** Her place at the cut: at the palm, leaning a little toward the ring. */
export const X_LEAN = X_PALM + 0.1

export const LOUISE_PATH = track(IN, -0.5, 0.9, [
  ...WALK,
  { until: SET_OFF, v: 0 },
  { until: PALM, to: X_PALM },
  { until: LEAN, v: 0 },
  { until: LEAN + 1.7, to: X_LEAN },
  { until: OUT, v: 0 },
])

/* ------------------------------------------------------------------ Ian */

/** Where Ian stops, behind her at the glass (in shot with her at the palm; he backs off out of the cut's framing after). */
export const IAN_REST = X_PALM - 2.95

/**
 * Ian: half a cell behind her out of the shaft; he stops when she does, and sets off after her a little later; he
 * stops short when Abbott comes out of the white, and waits until Costello has come too; then on, and stops a way
 * behind her. When the palm comes down on the glass he backs off a little, out of shot while the ring is written;
 * once it has closed he comes forward to stand a step behind her and watch her go into the white. He never goes to
 * the glass.
 */
function ianTrack(): Track {
  const pre: Stretch[] = [
    { until: 87.5, v: 0.2 },
    { until: 88.3, v: 0 },
    { until: 90.0, v: 0 },
    { until: 91.5, v: 0.66 },
    { until: ABBOTT_SEEN, v: 0.66 },
    { until: 97.8, v: 0 },
    { until: 101.6, v: 0 },
    { until: 102.8, v: 0.42 },
  ]
  const head = track(IN, -0.98, 0.9, pre)
  // The cruise's length is what brings him to rest at IAN_REST after a 1.7 s ease to a stop from 0.42.
  const brake = (0.42 / 2) * 1.7
  const cruise = Math.max(0, (IAN_REST - head.end - brake) / 0.42)
  const back = pulse(502)
  return track(IN, -0.98, 0.9, [
    ...pre,
    { until: 102.8 + cruise, v: 0.42 },
    { until: 102.8 + cruise + 1.7, v: 0 },
    { until: back, v: 0 },
    { until: back + 0.7, v: -0.95 },
    { until: back + 1.9, v: 0 },
    // Out of shot while the ring is written; and when it has closed (126.131) he comes forward again, to the edge of
    // the light a step behind her, and is there watching as the glass goes white. He does not go through.
    { until: 126.2, v: 0 },
    { until: 127.3, v: 1.65 },
    { until: 129.2, v: 0 },
    { until: OUT + 1, v: 0 },
  ])
}
export const IAN_PATH = ianTrack()

/** Ian's place in the chamber's frame. */
export const ianAt = (t: number): Pt => [IAN_PATH.x(t), 0]
