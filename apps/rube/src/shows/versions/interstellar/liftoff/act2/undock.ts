import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { mixHex, R, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, farSide, frame, hash, knock, part, smooth, type Ctx, type PartShot } from '../kit'
import { cue, UNDOCK } from '../music'
import { BALL, DARK, VOID } from '../worlds'
import { drawFar, drawLensing, drawNear } from './undock-far'

/**
 * Undocking: the film's docking run backwards.
 *
 * The cut, on the big step (184), is a match on the ship: the first frame
 * outside keeps the hub's last framing, the Ranger still on the screen while
 * the bay turns to the dark round it; then the camera goes back off it to
 * Cooper Station from outside, a long
 * cylinder seen from the side, its three window strips of farm light
 * streaming round as it turns. The Ranger (the hub's ship, the ball in its
 * bubble canopy) is nosed into the port on the end cap, upright as the hub
 * left it, and turns with it: half a turn, rolling its canopy round toward
 * us, so the ball is never behind the hull.
 *
 *   184  the port's red clamps spring open.
 *   185  the umbilical's plug fires out of the Ranger's flank; the cable whips back
 *   187  and seats in its socket on the hub (a spark).
 *   186  the nose jets fire and the Ranger backs off the port, still turning with it.
 *   188–190  a pair of roll jets at the wingtips on each beat: the spin comes off
 *            in three equal steps and stops dead, level, on the loudest beat.
 *   191  the docking probe snaps back into the nose.
 *   192  nose and tail jets: it pitches up and over, end for end.
 *   193  the port's collar slides home into the station.
 *   194  the counter-jets stop it pointing away, and the engine lights.
 *   195–205  the burn pulses with the organ, each kick as hard as the beat it is
 *            on (the onsets' own strengths), out over Saturn's cloud tops and
 *            then over its rings. The way is marked: on each kick the ship goes
 *            over a sleeping beacon left by whoever went first, and it wakes,
 *            vanes out and lamp lit, so the lit line grows behind it. On 197
 *            the camera draws all the way back: Saturn rising out of the
 *            bottom of the frame, banded, its rings across it and the globe's
 *            shadow thrown back over them, and the ship small along its top,
 *            lighting its beacons; then in again over the cloud tops on 200.
 *   206–209  engine off; the nose jets brake, a beat at a time, down to a crawl.
 *   210  the nose touches the wormhole and it ripples.
 *   211  the cockpit goes in: the ball's light wraps the rim; the ship sinks
 *        toward the centre as an image in the glass.
 *   212  the ball is out of sight at the sphere's centre (1 s hidden).
 *
 * The part's frame: the ball in the cockpit at (-0.5, 0), the station's axis
 * along y = 0, its end cap to the left. Saturn is in the same plane, under the
 * way out: the bend over it is centred on the planet.
 */

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the clock (show seconds) */

const CLAMPS = UNDOCK
const UMBILICAL = cue(185)
const SEPARATE = cue(186)
const SEAT = cue(187)
const DESPIN = [cue(188), cue(189), cue(190)]
const PROBE = cue(191)
const PITCH = cue(192)
const STOW = cue(193)
const IGNITE = cue(194)
const PULSES = [195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205].map(cue)
/** Each pulse is as hard as the organ's accent on its beat (the strengths in the onsets file): the burn plays the bar's shape. */
const PULSE_S = [0.47, 0.89, 1.16, 1.44, 0.5, 0.68, 0.85, 0.82, 0.58, 0.7, 0.81]
const BRAKES = [206, 207, 208, 209].map(cue)
const CONTACT = cue(210)
const CROSS = cue(211)
const END = cue(212)

export const UNDOCK_HITS = [CLAMPS, UMBILICAL, SEPARATE, SEAT, ...DESPIN, PROBE, PITCH, STOW, IGNITE, ...PULSES, ...BRAKES, CONTACT, CROSS]

/* ------------------------------------------------------------------ motion */

/** Up to `t`, the integral of a step that ramps from 0 to 1 over `d` seconds from `t0`. */
const ramped = (t: number, t0: number, d: number): number => {
  const x = t - t0
  if (x <= 0) return 0
  return x < d ? (x * x) / (2 * d) : x - d / 2
}
const easeOut = (u: number): number => 1 - (1 - clamp(u)) ** 3

/**
 * The station turns about its axis, and the Ranger with it while it is in the
 * port: from upright as the hub left it (nose to the port, canopy up), rolling
 * its canopy round toward us, square on at the middle of the turn, until the
 * roll jets take the spin off a third a beat and leave it on its back, level,
 * on 190, so that the half loop on 192–194 brings it out upright and nose
 * away. Half a turn, all of it with the canopy on our side: the ball is never
 * behind the hull.
 */
const SPIN_D = 0.14
const SPIN = Math.PI / (DESPIN.reduce((a, d) => a + d + SPIN_D / 2, 0) / 3 - UNDOCK)
/** How far round the station has turned (radians, in the station's own sense: features go round 0 on top, π/2 toward us). */
const stationTurn = (t: number): number => SPIN * (t - UNDOCK)
/** The Ranger's roll about its own nose-ward axis: 0 upright in its own frame; -π at the cut, which nosed left is upright on the screen. */
const rangerRoll = (t: number): number => -Math.PI + SPIN * (t - UNDOCK - DESPIN.reduce((a, d) => a + ramped(t, d, SPIN_D), 0) / 3)

/** The Ranger is the hub's, drawn in the hub's ship units scaled by SHIP: the ball to its nose's tip, and its middle behind the ball. */
const SHIP = 0.86
const NOSE = 1.4 * SHIP
const BALL_OFF = 0.37
/** Backing off the port, from the nose jets on 186. *//** Backing off the port, from the nose jets on 186. */
const V_BACK = 0.55
const PUSH_D = 0.3
const DOCK_X = -0.5 + BALL_OFF
const driftX = (t: number): number => DOCK_X + V_BACK * ramped(t, SEPARATE, PUSH_D)
/** End for end: nose up and over, from the jets on 192 to the counter-jets as the engine lights. */
const FLIP_D = 0.14
const W_FLIP = Math.PI / (IGNITE - PITCH - FLIP_D)
const flipHeading = (t: number): number => Math.PI + W_FLIP * (ramped(t, PITCH, FLIP_D) - ramped(t, IGNITE - FLIP_D, FLIP_D))

/** The burn: a kick a beat, each the size of the beat. */
const BURNS = [IGNITE, ...PULSES]
const DV = [1.5, ...PULSE_S.map((s) => 0.55 * s)]
const PULSE_D = 0.35
const V_TOP = V_BACK + DV.reduce((a, b) => a + b, 0)
/** Braked, on the nose jets, to this by the touch; then the sphere takes it. */
const V_IN = 0.6
const BRAKE_DV = -(V_TOP - V_IN) / BRAKES.length
const BRAKE_D = 0.3
const PULL_D = CROSS - CONTACT
/** From the nose touching to the cockpit crossing, the ball goes a nose's length. */
const PULL = 2 * (NOSE / PULL_D - V_IN)

function flown(t: number): number {
  let s = V_BACK * (t - IGNITE)
  for (let i = 0; i < BURNS.length; i++) s += DV[i] * ramped(t, BURNS[i], PULSE_D)
  for (const b of BRAKES) s += BRAKE_DV * ramped(t, b, BRAKE_D)
  return s + PULL * ramped(t, CONTACT, PULL_D)
}
/** The way out: straight off the station, a bend over Saturn's cloud tops, on over its rings and down to the sphere. */
const L1 = 22
const RHO = 19
const TURN = 0.3
const P0: Pt = [driftX(IGNITE), 0]
/** The bend's centre, which is Saturn's. */
const ARC_O: Pt = [P0[0] + L1, RHO]
const ARC_END: Pt = [ARC_O[0] + RHO * Math.sin(TURN), ARC_O[1] - RHO * Math.cos(TURN)]
const DIR_IN: Pt = [Math.cos(TURN), Math.sin(TURN)]

function pathAt(s: number): { p: Pt; h: number } {
  if (s <= L1) return { p: [P0[0] + s, 0], h: 0 }
  const arc = RHO * TURN
  if (s <= L1 + arc) {
    const a = (s - L1) / RHO
    return { p: [ARC_O[0] + RHO * Math.sin(a), ARC_O[1] - RHO * Math.cos(a)], h: a }
  }
  const d = s - L1 - arc
  return { p: [ARC_END[0] + d * DIR_IN[0], ARC_END[1] + d * DIR_IN[1]], h: TURN }
}

/* ------------------------------------------------------------------ the sphere and Saturn */

const RS = 3.2
const S_CROSS = flown(CROSS)
const BALL_CROSS: Pt = (() => {
  const { p } = pathAt(S_CROSS)
  return [p[0] + BALL_OFF * DIR_IN[0], p[1] + BALL_OFF * DIR_IN[1]]
})()
const SPHERE: Pt = [BALL_CROSS[0] + RS * DIR_IN[0], BALL_CROSS[1] + RS * DIR_IN[1]]
/** Inside, out of sight: from the rim to the centre by 212, gathering speed. */
const V_CROSS = V_IN + PULL
const HIDE = END - CROSS
const V_CENTRE = (2 * RS) / HIDE - V_CROSS
const sunk = (t: number): number => {
  const x = clamp((t - CROSS) / HIDE) * HIDE
  return V_CROSS * x + (0.5 * (V_CENTRE - V_CROSS) * x * x) / HIDE
}

/** Saturn: under the bend, the Ranger skimming its cloud tops. */
const SAT: Pt = ARC_O
const SAT_R = RHO - 3.2
/** From the sphere toward Saturn: the side its image lies on in the glass. */
const SAT_DIR = Math.atan2(SAT[1] - SPHERE[1], SAT[0] - SPHERE[0])
/** The rings, open to us a little from above, rising to the right: the Ranger runs out over them. */
const RING_TILT = -0.05
const RING_FLAT = 0.3
/** How far the pole leans toward us: what bends the bands. */
const LEAN = Math.asin(RING_FLAT)
/** Where the light comes from: high on the left. */
const SUN: Pt = [-0.62, -0.78]
/** Saturn's reveal: the frame's middle and height, the globe's top two thirds and the rings in it, the ship near its top. */
const REVEAL: Pt = [SAT[0] - 4, SAT[1] - 10.5]
const REVEAL_CELLS = 24
/**
 * The same light in the round (x right, y up, z toward us): high on the left and from our side, so the face we see is
 * lit but for a dusk round its lower right. In the rings' plane it falls at a slant from above, which is what throws
 * the globe's shadow back across them.
 */
const SUN3 = (() => {
  const v = [-0.26, 0.33, 0.91]
  const n = Math.hypot(v[0], v[1], v[2])
  return v.map((x) => x / n)
})()
/** The light's height over the rings' plane (its sine), and, in the plane, the way away from it: x right, y toward us. */
const SUN_UP = SUN3[1] * Math.cos(LEAN) + SUN3[2] * Math.sin(LEAN)
const SHADOW_WAY = (() => {
  const u = -SUN3[0]
  const w = -(SUN3[1] * Math.sin(LEAN) - SUN3[2] * Math.cos(LEAN))
  return Math.atan2(-w, u)
})()

/* ------------------------------------------------------------------ the pose */

interface Pose {
  /** The centre of mass. */
  c: Pt
  /** Heading: 0 is nose right, π nose left. */
  h: number
  /** Roll about its own nose-ward axis (0 is level, fin up in its own frame). */
  roll: number
  ball: Pt
}

function pose(t: number): Pose {
  let c: Pt
  let h: number
  if (t < IGNITE) {
    c = [driftX(t), 0]
    h = flipHeading(t)
  } else if (t < CROSS) {
    const q = pathAt(flown(t))
    c = q.p
    h = q.h
  } else {
    const d = sunk(t)
    c = [BALL_CROSS[0] + (d - BALL_OFF) * DIR_IN[0], BALL_CROSS[1] + (d - BALL_OFF) * DIR_IN[1]]
    h = TURN
  }
  const roll = rangerRoll(t)
  return { c, h, roll, ball: [c[0] + BALL_OFF * Math.cos(h), c[1] + BALL_OFF * Math.sin(h)] }
}

/* ------------------------------------------------------------------ the beacons */

/**
 * The way to the sphere is marked. Whoever went before left a line of small
 * beacons along it, asleep; each wakes as the Ranger burns over it, on the
 * beat of its burn: a ring goes out from its lamp (as wide as the kick was
 * hard), the lamp stays lit, and the two vanes swing open. Behind the ship
 * the line stays lit.
 */
const BEACONS = PULSES.map((when, i) => {
  const { p, h } = pathAt(flown(when))
  // Just under the ship's way (on Saturn's side), where the ship is on its beat.
  const n: Pt = [-Math.sin(h), Math.cos(h)]
  return { when, s: PULSE_S[i], at: [p[0] + n[0] * 1.2, p[1] + n[1] * 1.2] as Pt, h, tilt: (hash(i, 31) - 0.5) * 0.5 }
})

function drawBeacons(p: p5, c: Ctx, t: number, f: Frame): void {
  if (t < IGNITE - 1) return
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  for (const b of BEACONS) {
    if (b.at[0] < f.x0 - 1 || b.at[0] > f.x1 + 1 || b.at[1] < f.y0 - 1 || b.at[1] > f.y1 + 1) continue
    const since = t - b.when
    const open = since < 0 ? 0 : Math.min(1.1, 1.1 * clamp(since / 0.16)) - 0.1 * clamp((since - 0.16) / 0.12)
    p.push()
    p.translate(X(b.at[0]), X(b.at[1]))
    p.rotate(b.h + b.tilt)
    // The vanes, folded flat along the drum, swing out to either side.
    for (const side of [-1, 1]) {
      p.push()
      p.translate(X(side * 0.13), 0)
      p.rotate(side * (Math.PI / 2) * (1 - open))
      solid(p, ink, weight * 0.6, DARK.slate)
      p.rect(X(side * 0.17), 0, X(0.34), X(0.1))
      p.stroke(alpha(p, DARK.ice, 0.5))
      p.strokeWeight(Math.max(0.6, weight * 0.4))
      for (const u of [0.33, 0.66]) p.line(X(side * 0.34 * u), X(-0.04), X(side * 0.34 * u), X(0.04))
      p.pop()
    }
    // The drum, its band, and the mast with its lamp.
    solid(p, ink, weight * 0.8, DARK.hull)
    p.rect(0, 0, X(0.26), X(0.2), X(0.04))
    solid(p, ink, weight * 0.5, DARK.slate)
    p.rect(0, 0, X(0.26), X(0.06))
    p.stroke(ink)
    p.strokeWeight(Math.max(0.8, weight * 0.7))
    p.line(0, X(-0.1), 0, X(-0.26))
    const lit = since >= 0
    p.translate(0, X(-0.28))
    // Waking: a ring goes out from the lamp once, as wide as the kick was hard; then the lamp just stays lit.
    if (lit && since < 0.5) {
      const u = since / 0.5
      p.noFill()
      p.stroke(alpha(p, DARK.amber, (1 - u) ** 1.5 * Math.min(1, 0.4 + b.s)))
      p.strokeWeight(Math.max(1, weight * 0.6))
      p.circle(0, 0, X(0.16 + 0.7 * b.s * Math.sqrt(u)))
    }
    solid(p, ink, weight * 0.6, lit ? DARK.amber : DARK.slate)
    p.circle(0, 0, X(lit ? 0.1 : 0.08))
    p.pop()
  }
}

/* ------------------------------------------------------------------ the station's geometry */

const ST_R = 4.4
/** Its length, cap to cap: long, but not endless when the camera is far out. */
const ST_LEN = 60
const BEVEL = 0.5
/** Three window strips down its length, a twelfth of the way round each. */
const WIN_W = Math.PI / 6
const BOSS_R = 1.5
const BOSS_L = 0.45
const COLLAR_R = 0.62
const COLLAR_L = 0.45
/** The end cap's face, edge-on: set back so the collar's face meets the Ranger's nose. */
const CAP = -0.5 - NOSE - COLLAR_L - BOSS_L
/** Where the window strips are round the hull: one faces us square at the cut. */
const STRIP_PHASE = Math.PI / 2 - WIN_W / 2
/** The umbilical's socket on the hub's face (x, and out from the axis). */
const SOCKET: [number, number] = [CAP + BOSS_L + 0.1, 1.08]

const collarLen = (t: number): number => {
  const u = clamp((t - STOW) / 0.24)
  // Home with a knock: it overshoots a hair and settles, heavily, over most of a beat.
  const back = u >= 1 ? 1 + 0.05 * Math.exp(-(t - STOW - 0.24) / 0.22) * Math.sin((t - STOW - 0.24) * 12) : easeOut(u)
  return COLLAR_L - (COLLAR_L - 0.1) * back
}

/* ------------------------------------------------------------------ the Ranger's geometry */

/**
 * The hub's Ranger (`hub.ts`), the same ship: long and low, a black belly and
 * nose, a bubble canopy over the ball, a swept wing hanging under its after
 * half, a docking collar on its back, two bells. In its own units, scaled by
 * SHIP: x forward from the ball, y down, z out of its right side. Side-on it
 * is the hub's drawing; here it is a solid, so that it can roll: the side
 * profile stood out to a half-width at each x.
 */
const HULL: Pt[] = [
  [1.4, 0.27],
  [1.12, 0.19],
  [0.84, 0.13],
  [0.56, 0.1],
  [-0.46, 0.1],
  [-0.55, 0.0],
  [-0.78, -0.05],
  [-1.86, -0.06],
  [-2.02, -0.01],
  [-2.06, 0.36],
  [-1.98, 0.41],
  [0.35, 0.41],
  [0.86, 0.38],
  [1.16, 0.32],
]
/** Its top edge, nose to tail; its bottom edge, tail to nose. */
const HULL_TOP = HULL.slice(0, 9)
const HULL_BOT: Pt[] = [HULL[9], HULL[10], HULL[11], HULL[12], HULL[13], HULL[0]]
/** The black of the belly and the nose, painted down the flank. */
const BELLY: Pt[] = [
  [1.4, 0.27],
  [1.16, 0.32],
  [0.86, 0.38],
  [0.35, 0.41],
  [-1.98, 0.41],
  [-2.05, 0.33],
  [0.35, 0.335],
  [0.86, 0.305],
  [1.13, 0.25],
]
/** Its half-width along its length: a point at the nose. */
const HALF: Pt[] = [
  [1.4, 0],
  [1.12, 0.12],
  [0.84, 0.21],
  [0.56, 0.28],
  [0, 0.33],
  [-0.8, 0.36],
  [-1.8, 0.36],
  [-2.06, 0.32],
]
/** Linear in x over points given nose to tail. */
function along(pts: Pt[], x: number): number {
  if (x >= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [x0, v0] = pts[i - 1]
    const [x1, v1] = pts[i]
    if (x >= x1) return v0 + ((v1 - v0) * (x - x0)) / (x1 - x0)
  }
  return pts[pts.length - 1][1]
}
const halfAt = (x: number): number => along(HALF, x)
/** The canopy: the hub's bubble over the sill, sampled, a dome at each x as tall as the bubble and a little narrower than the hull. */
const SILL = 0.1
const DOME_H = 0.41
const DOME_W = 0.29
const DOME: Pt[] = (() => {
  const bez = (a: Pt, b: Pt, c: Pt, d: Pt, u: number): Pt => {
    const v = 1 - u
    return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]
  }
  const out: Pt[] = []
  for (let i = 0; i <= 9; i++) out.push(bez([0.56, 0.1], [0.42, -0.14], [0.14, -0.31], [-0.1, -0.3], i / 9))
  for (let i = 1; i <= 9; i++) out.push(bez([-0.1, -0.3], [-0.36, -0.29], [-0.5, -0.12], [-0.46, 0.1], i / 9))
  return out
})()
const domeTop = (x: number): number => along(DOME, x)
/** The fuel port on its left flank (z < 0), the side it shows at the cut: where the umbilical plugs in. */
const PORT: [number, number, number] = [-1.5, 0.2, -halfAt(-1.5)]
/** The two bells, as bands of the tail. */
const BELLS: [number, number][] = [
  [0.02, 0.17],
  [0.21, 0.36],
]

/* ------------------------------------------------------------------ the part */

interface UndockState {
  begin: number
}

export const undock = part<UndockState>(
  {
    name: 'undock',
    flight: true,
    draw: (p, s, c) => {
      const t = c.t + s.begin
      const f = frame(p, c.k)
      const q = pose(t)
      drawFar(p, c, t)
      drawSaturn(p, c, t, f)
      drawSphere(p, c, t, f, q)
      drawBeacons(p, c, t, f)
      if (f.x0 < CAP + 3) {
        drawStation(p, c, t, f)
        drawDock(p, c, t, false)
        drawUmbilical(p, c, t, false)
      }
      drawRanger(p, c, t, q)
      if (f.x0 < CAP + 3) drawDock(p, c, t, true)
    },
    over: (p, s, c) => {
      const t = c.t + s.begin
      const q = pose(t)
      drawGlassOver(p, c, t, q)
      drawUmbilical(p, c, t, true)
      drawNear(p, c, t)
    },
  },
  (slot) => {
    const rel = (T: number) => T - slot.begin
    const at = (x: number): Pt => pose(x + slot.begin).ball
    const segs: Seg[] = [
      ...carried(at, 0, rel(CROSS), Math.ceil(rel(CROSS) * 40)),
      { from: BALL_CROSS, to: SPHERE, dur: slot.end - CROSS, ramp: [V_CROSS, V_CENTRE], hidden: true },
    ]
    const x1 = SPHERE[0] + RS + 4
    const y1 = Math.max(SPHERE[1] + RS + 4, SAT[1] + SAT_R + 1)
    return {
      cells: box(CAP - ST_LEN - 2, -8, x1, y1, 2),
      exit: [SPHERE[0] + 0.5, SPHERE[1]],
      lane: { segs, fire: 0 },
      state: { begin: slot.begin },
    }
  },
  (slot) => {
    const ballAt = (t: number) => pose(t).ball
    const near = ballAt(cue(207))
    /** The ship's middle. */
    const ship = (t: number): Pt => pose(t).c
    const shots: PartShot[] = [
      // The cut is a match on the ship (the score gives this key the hub's last framing, close on the nose in the
      // port): the port's clamps spring open right there. Back a little for the umbilical, the port, the ship and the
      // cable whipping home in one frame; then close with the ship as it backs off and the spin comes off it.
      { t: slot.begin, cells: 2.9, hold: [-1.3, 0.1], w: 1 },
      { t: cue(185.5), cells: 3.9, hold: [-1.05, 0.15], w: 1 },
      // The despin is the film's docking the other way about: the station goes on turning behind, and the ship's
      // turn comes off it a third a beat. So the port stays in the frame with the ship while it does.
      { t: cue(187.2), cells: 4.2, hold: [-0.5, 0.1], w: 1 },
      { t: cue(190.2), cells: 4.5, hold: [0.3, 0.05], w: 1 },
      { t: cue(191.2), cells: 4.9, hold: [0.8, 0], w: 1 },
      // Out for the pitch and the ignition: the end of the station turning, its port's collar going home, and the
      // ship going end for end off it and lighting.
      { t: cue(192), cells: 5.6, hold: [ship(cue(192))[0] - 1.6, 0], w: 1 },
      { t: cue(193.4), cells: 8.4, hold: [ship(cue(193.4))[0] - 2.4, 0.3], w: 1 },
      // Following from the ignition on (the blend from holding to following done while the ship is all but still, so
      // the burn does not drag the frame): where it would be held, as an offset from the ship.
      { t: cue(194.4), cells: 9.4, off: [ship(cue(194.4))[0] - 1.9 - ballAt(cue(194.4))[0], 0.5 - ballAt(cue(194.4))[1]], w: 0 },
      // Away: out wider as it goes, and Saturn's limb comes up on the right.
      { t: cue(195.5), cells: 8.6, off: [2.2, 0.8], w: 0 },
      // Then all the way out: Saturn coming up out of the bottom of the frame, its rings across it, and the ship
      // small over it, lighting its line of beacons one a beat.
      { t: cue(197.4), cells: REVEAL_CELLS, hold: REVEAL, w: 1 },
      { t: cue(199.1), cells: REVEAL_CELLS * 1.06, hold: [REVEAL[0] + 0.8, REVEAL[1]], w: 1 },
      // Back in over the cloud tops, close; then out over the rings.
      { t: cue(200.8), cells: 7.8, off: [1.9, 0.8], w: 0 },
      { t: cue(203.2), cells: 8.4, off: [2.1, 1.0], w: 0 },
      // Looking ahead as the engine stops: the sphere comes up on the right.
      { t: cue(205.3), cells: 9, off: [2.8, 0.9], w: 0 },
      // The two in one frame as it brakes, then in on the sphere.
      { t: cue(207), cells: 10.8, hold: [(near[0] + SPHERE[0]) / 2 - 0.25, (near[1] + SPHERE[1]) / 2 + 0.4], w: 0.9 },
      { t: cue(208.6), cells: 9.6, hold: [SPHERE[0] - DIR_IN[0] * 1.9, SPHERE[1] - DIR_IN[1] * 1.9], w: 0.9 },
      { t: CONTACT, cells: 8, hold: [SPHERE[0] - DIR_IN[0] * 1.2, SPHERE[1] - DIR_IN[1] * 1.2], w: 0.95 },
      { t: slot.end - 0.02, cells: 7.5, hold: SPHERE, w: 1 },
    ]
    return shots
  },
)

/* ------------------------------------------------------------------ small helpers */

type Frame = ReturnType<typeof frame>

const ICE_RGB = '143, 198, 230'
const GOLD_RGB = '217, 164, 65'
/** The dark's ink, as light: a flame's core, a flash. */
const BONE_RGB = '236, 229, 211'

/** A thick stroke with an ink edge: a clamp's arm, a cable. */
function bar(p: p5, ink: string, weight: number, fill: string, w: number, pts: Pt[]): void {
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w + weight * 2)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x, y)
  p.endShape()
  p.stroke(fill)
  p.strokeWeight(Math.max(1, w))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x, y)
  p.endShape()
}

/**
 * The part of the band of angles [a0, a1] round an axis that faces us
 * (angle 0 on top, π at the bottom, the near side between), as heights:
 * where a strip of the hull shows on a cylinder seen from the side.
 */
function nearBand(a0: number, a1: number, r: number): [number, number][] {
  const out: [number, number][] = []
  let lo = a0 % TAU
  if (lo < 0) lo += TAU
  const hi = lo + (a1 - a0)
  for (const [s0, s1] of [
    [0, Math.PI],
    [TAU, TAU + Math.PI],
  ]) {
    const x0 = Math.max(lo, s0)
    const x1 = Math.min(hi, s1)
    if (x1 > x0) out.push([-r * Math.cos(x0), -r * Math.cos(x1)])
  }
  return out
}

/**
 * A jet's breath: a short tapered plume out of the nozzle for the first instant, and the vapour it leaves, blown on
 * along `dir`, spreading and thinning, gone in a little over half a second. Vapour, not a cloud: no ink.
 */
function jet(p: p5, c: Ctx, age: number, at: Pt, dir: Pt, size = 1): void {
  if (age < 0 || age > 0.7) return
  const u = age / 0.7
  const go = 1 - (1 - u) ** 2
  const len = Math.hypot(dir[0], dir[1]) || 1
  const ux = dir[0] / len
  const uy = dir[1] / len
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // The plume: out to full length in a few hundredths, then back into the nozzle.
  if (age < 0.2) {
    const v = age / 0.2
    const L = 0.5 * size * Math.sin(Math.PI * Math.min(1, v * 1.6 + 0.08)) * (1 - 0.3 * v)
    const W = 0.07 * size
    const g = ctx.createLinearGradient(at[0] * k, at[1] * k, (at[0] + ux * L) * k, (at[1] + uy * L) * k)
    g.addColorStop(0, `rgba(${BONE_RGB}, ${0.95 * (1 - 0.5 * v)})`)
    g.addColorStop(1, `rgba(${BONE_RGB}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((at[0] - uy * W) * k, (at[1] + ux * W) * k)
    ctx.lineTo((at[0] + ux * L) * k, (at[1] + uy * L) * k)
    ctx.lineTo((at[0] + uy * W) * k, (at[1] - ux * W) * k)
    ctx.closePath()
    ctx.fill()
  }
  // The vapour: blown out along the way the jet went, a flat fan from the nozzle that spreads and thins.
  const a = 0.26 * (1 - u) ** 1.5
  for (const [reach, spread, share] of [
    [1, 1, 1],
    [0.6, 0.55, 0.8],
  ]) {
    const d = (0.25 + 0.75 * go) * size * reach
    const w = (0.06 + 0.24 * Math.sqrt(u)) * size * spread
    const n = 0.03 * size
    ctx.fillStyle = `rgba(${BONE_RGB}, ${(a * share).toFixed(3)})`
    ctx.beginPath()
    ctx.moveTo((at[0] - uy * n) * k, (at[1] + ux * n) * k)
    ctx.lineTo((at[0] + ux * d - uy * w) * k, (at[1] + uy * d + ux * w) * k)
    ctx.quadraticCurveTo((at[0] + ux * d * 1.18) * k, (at[1] + uy * d * 1.18) * k, (at[0] + ux * d + uy * w) * k, (at[1] + uy * d - ux * w) * k)
    ctx.lineTo((at[0] + uy * n) * k, (at[1] - ux * n) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ drawing: Saturn */

const rgbOf = (hex: string): string => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
const DEEP_RGB = rgbOf(DARK.deep)

/** The globe's colours: butterscotch under it all, cream zones, ochre belts, and a blue-grey hood over the pole that leans to us. */
const SAT_BASE = mixHex(DARK.gold, DARK.hull, 0.4)
const ZONE = mixHex(DARK.hull, DARK.gold, 0.16)
const BELT = mixHex(mixHex(DARK.gold, DARK.amber, 0.5), DARK.slate, 0.16)
const BELT_GREY = mixHex(BELT, DARK.slate, 0.35)
const HOOD = mixHex(mixHex(ZONE, DARK.ice, 0.4), DARK.slate, 0.12)
/**
 * Its cloud bands, north to south (degrees of latitude, colour, alpha). Each is soft-edged and a little wavy along
 * its edges, so that skimming a few cells of the limb the Ranger goes over cloud tops, not painted stripes. The broad
 * bright zone is the equator's. Then, south of it, the rings' own shadow: thin under the faint C ring, deep under the
 * B ring, which the light (from above the rings' plane) lays across the whole far south.
 */
const BANDS: [number, number, string, number][] = [
  [90, 76, HOOD, 0.22],
  [90, 84, HOOD, 0.12],
  [76, 72, BELT, 0.26],
  [66, 61, BELT, 0.14],
  [56, 52, BELT_GREY, 0.2],
  [47, 41, BELT, 0.3],
  [41, 35, ZONE, 0.26],
  [33, 22, BELT, 0.55],
  [29, 25, BELT_GREY, 0.2],
  [22, -10, ZONE, 0.62],
  [14, 6, ZONE, 0.3],
  [-10, -18, BELT, 0.5],
  [-18, -26, ZONE, 0.3],
  [-32, -40, BELT_GREY, 0.32],
  [-50, -90, BELT, 0.25],
  [-10, -30, DARK.deep, 0.16],
  [-30, -90, DARK.deep, 0.3],
]
/** How far a band's edge wanders (degrees), and its soft edge. */
const WOBBLE = 0.3
const FEATHER = 0.8
/** How far round the clouds have gone (radians of longitude): set for each frame, so the bands' wavy edges drift. */
let bandTurn = 0
/** Storms riding the belts: latitude (degrees), longitude at 0 s, width (planet radii), and how fast each goes round. */
const STORMS: [number, number, number, number][] = [
  [41, -8.52, 0.07, 0.044],
  [28, -4.75, 0.045, 0.031],
  [-14, -6.8, 0.055, 0.038],
  [58, -5.07, 0.04, 0.027],
]

/** A point of latitude `phi` at longitude `th` (π/2 faces us), on the unit globe as the picture sees it. */
const latPt = (phi: number, th: number): Pt => [Math.cos(phi) * Math.cos(th), -Math.sin(phi) * Math.cos(LEAN) + Math.cos(phi) * Math.sin(th) * Math.sin(LEAN)]

/**
 * Into the path, the part of the unit globe north of latitude `deg`, its edge wavy by the latitude's own seed, closed
 * round outside the limb (the globe's clip takes that away). Two of these filled even-odd are the band between them.
 */
function northOf(ctx: CanvasRenderingContext2D, deg: number, seed: number): void {
  if (deg >= 89.9) return
  const phi = (deg * Math.PI) / 180
  const wob = (t0: number) => {
    const th = t0 + bandTurn
    return ((Math.abs(deg) > 85 ? 0 : WOBBLE) * (Math.sin(th * (22 + 7 * hash(seed, 1)) + 6 * hash(seed, 2)) + 0.4 * Math.sin(th * (53 + 12 * hash(seed, 3)) + 6 * hash(seed, 4))) * Math.PI) / 180
  }
  // What of the latitude's circle faces us: all of it near the leaning pole, none near the other.
  const q = -Math.tan(phi) * Math.tan(LEAN)
  if (q >= 1) {
    ctx.rect(-2, -2, 4, 4)
    return
  }
  const N = 120
  if (q <= -1) {
    for (let i = 0; i <= N; i++) {
      const th = (TAU * i) / N
      const [x, y] = latPt(phi + wob(th), th)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    return
  }
  const t0 = Math.asin(q)
  const t1 = Math.PI - t0
  for (let i = 0; i <= N; i++) {
    const th = t0 + ((t1 - t0) * i) / N
    const [x, y] = latPt(phi + wob(th) * Math.sin((Math.PI * i) / N), th)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  // Out past the limb at the left end, over the top, and back in at the right end.
  const [rx, ry] = latPt(phi, t0)
  const [lx, ly] = latPt(phi, t1)
  const a0 = Math.atan2(ly, lx)
  let a1 = Math.atan2(ry, rx)
  while (a1 <= a0) a1 += TAU
  for (let a = a0; a < a1; a += 0.2) ctx.lineTo(1.6 * Math.cos(a), 1.6 * Math.sin(a))
  ctx.lineTo(1.6 * Math.cos(a1), 1.6 * Math.sin(a1))
  ctx.closePath()
}

/** The rings, by radius (planet radii), where they begin and end. */
const RING_IN = 1.22
const RING_OUT = 2.29
const C_RING = mixHex(mixHex(DARK.hull, DARK.slate, 0.3), DARK.gold, 0.15)
const B_RING = mixHex(DARK.hull, DARK.gold, 0.42)
const A_RING = mixHex(DARK.hull, DARK.gold, 0.22)
/**
 * Their light at radius `r`, as a photograph shows them: the faint C ring, the bright B ring, densest in its middle,
 * the dark Cassini division with its few faint ringlets, and the A ring with the Encke gap near its edge. Through all
 * of it, ringlets: fine steps of light at two scales.
 */
function ringLight(r: number): [string, number] {
  const fine = hash(Math.floor(r * 430), 7) - 0.5
  const grain = hash(Math.floor(r * 95), 8) - 0.5
  if (r < 1.24) return [C_RING, 0.04 * smooth(r, 1.22, 1.24)]
  if (r < 1.525) return [C_RING, 0.15 + 0.1 * grain + 0.06 * fine + 0.08 * smooth(r, 1.44, 1.525)]
  if (r < 1.95) return [B_RING, 0.6 + 0.3 * smooth(r, 1.525, 1.63) - 0.08 * smooth(r, 1.86, 1.95) + 0.12 * grain + 0.07 * fine]
  if (r < 2.025) return [C_RING, 0.05 + 0.08 * Math.max(0, fine)]
  if ((r > 2.211 && r < 2.221) || (r > 2.261 && r < 2.265)) return [A_RING, 0.04]
  if (r < 2.27) return [A_RING, 0.68 - 0.16 * smooth(r, 2.06, 2.27) + 0.08 * grain + 0.05 * fine]
  return [A_RING, 0]
}

/**
 * What of Saturn is the same every frame, in planet radii (filled under a scale to the globe's size), so it is built
 * once for each canvas: the rings' light across their whole width, and the globe's shading.
 */
const SAT_PAINT = new WeakMap<CanvasRenderingContext2D, { rings: CanvasGradient; limb: CanvasGradient; dusk: CanvasGradient }>()
function satPaint(ctx: CanvasRenderingContext2D) {
  let paint = SAT_PAINT.get(ctx)
  if (paint) return paint
  const rings = ctx.createRadialGradient(0, 0, RING_IN, 0, 0, RING_OUT)
  const N = 430
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const [hex, a] = ringLight(RING_IN + (RING_OUT - RING_IN) * u)
    rings.addColorStop(u, `rgba(${rgbOf(hex)}, ${clamp(a).toFixed(3)})`)
  }
  // The limb darkens a little (it is a ball of cloud, seen through more of its haze there).
  const limb = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  limb.addColorStop(0, `rgba(${DEEP_RGB}, 0)`)
  limb.addColorStop(0.8, `rgba(${DEEP_RGB}, 0)`)
  limb.addColorStop(0.96, `rgba(${DEEP_RGB}, 0.06)`)
  limb.addColorStop(1, `rgba(${DEEP_RGB}, 0.14)`)
  // Night: the globe less a disc shifted toward the sun, its terminator a soft dusk a cell or two wide rather than a
  // cut, and never quite as dark as the sky, so the night side still reads as the planet's.
  const lx = SUN[0] * 0.42
  const ly = SUN[1] * 0.42
  const dusk = ctx.createRadialGradient(lx, ly, 0.9, lx, ly, 1.16)
  dusk.addColorStop(0, `rgba(${DEEP_RGB}, 0)`)
  dusk.addColorStop(0.45, `rgba(${DEEP_RGB}, 0.42)`)
  dusk.addColorStop(1, `rgba(${DEEP_RGB}, 0.8)`)
  paint = { rings, limb, dusk }
  SAT_PAINT.set(ctx, paint)
  return paint
}

function drawSaturn(p: p5, c: Ctx, t: number, f: Frame): void {
  const { k, ink, weight } = c
  const [sx, sy] = SAT
  const reach = SAT_R * 2.4
  if (f.x1 < sx - reach || f.x0 > sx + reach || f.y1 < sy - SAT_R - 2 || f.y0 > sy + SAT_R + 2) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  const paint = satPaint(ctx)
  // In planet radii, about its middle, the rings' tilt on.
  const unit = () => {
    ctx.translate(X(sx), X(sy))
    ctx.rotate(RING_TILT)
    ctx.scale(X(SAT_R), X(SAT_R))
  }
  const rings = (front: boolean) => {
    ctx.save()
    unit()
    ctx.scale(1, RING_FLAT)
    ctx.beginPath()
    ctx.rect(-3, front ? 0 : -3, 6, 3)
    ctx.clip()
    ctx.beginPath()
    ctx.arc(0, 0, RING_OUT, 0, TAU)
    ctx.arc(0, 0, RING_IN, TAU, 0, true)
    ctx.fillStyle = paint.rings
    ctx.fill()
    if (!front) {
      // The globe's shadow, thrown back across the rings away from the light: half an ellipse, as wide as the globe
      // and as long as the light is low over them. Its near part is hidden behind the globe; what shows is a dark
      // wedge where the rings go behind it on the right.
      ctx.beginPath()
      ctx.arc(0, 0, RING_OUT + 0.02, 0, TAU)
      ctx.arc(0, 0, RING_IN, TAU, 0, true)
      ctx.clip()
      for (const [grow, a] of [
        [1.025, 0.3],
        [1, 0.62],
      ]) {
        ctx.beginPath()
        ctx.ellipse(0, 0, grow / SUN_UP, grow, SHADOW_WAY, -Math.PI / 2, Math.PI / 2)
        ctx.closePath()
        ctx.fillStyle = `rgba(${rgbOf(VOID.bg)}, ${a})`
        ctx.fill()
      }
    }
    ctx.restore()
    // The edges in ink: the B ring's sharp outer edge, and the A ring's.
    ctx.save()
    ctx.translate(X(sx), X(sy))
    ctx.rotate(RING_TILT)
    ctx.beginPath()
    ctx.rect(X(-reach - 1), front ? 0 : X(-reach), X(2 * reach + 2), X(reach))
    ctx.clip()
    for (const [r, a] of [
      [1.95, 0.3],
      [2.27, 0.45],
    ]) {
      ctx.strokeStyle = `rgba(${rgbOf(ink)}, ${a})`
      ctx.lineWidth = Math.max(0.8, weight * 0.45)
      ctx.beginPath()
      ctx.ellipse(0, 0, X(SAT_R * r), X(SAT_R * r * RING_FLAT), 0, 0, TAU)
      ctx.stroke()
    }
    // The F ring: a thread of light just outside them.
    ctx.strokeStyle = `rgba(${rgbOf(A_RING)}, 0.24)`
    ctx.lineWidth = Math.max(0.8, X(0.03))
    ctx.beginPath()
    ctx.ellipse(0, 0, X(SAT_R * 2.33), X(SAT_R * 2.33 * RING_FLAT), 0, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }
  rings(false)
  // Its air: a thin flat band on the limb, on the day side, stepping down to nothing round toward the night (three
  // arcs, each shorter and fainter than the last), so the edge stays crisp and no gold runs on into the dark.
  const toSun = Math.atan2(SUN[1], SUN[0])
  ctx.save()
  ctx.lineCap = 'butt'
  for (const [span, a] of [
    [1.9, 0.16],
    [1.45, 0.18],
    [0.95, 0.2],
  ]) {
    ctx.strokeStyle = `rgba(${rgbOf(ZONE)}, ${a})`
    ctx.lineWidth = Math.max(1, X(0.07))
    ctx.beginPath()
    ctx.arc(X(sx), X(sy), X(SAT_R + 0.035), toSun - span, toSun + span)
    ctx.stroke()
  }
  ctx.restore()
  // The globe: the butterscotch under it, then its bands, each a soft-edged strip between two wavy latitudes, their
  // edges drifting slowly round with the clouds.
  solid(p, ink, weight, SAT_BASE)
  p.circle(X(sx), X(sy), X(SAT_R * 2))
  ctx.save()
  unit()
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.clip()
  bandTurn = -0.018 * t
  for (const [n, s, hex, a] of BANDS) {
    const rgb = rgbOf(hex)
    for (const d of [FEATHER, -FEATHER]) {
      ctx.beginPath()
      northOf(ctx, s - d, Math.round(s * 10))
      if (n < 89.9) northOf(ctx, n + d, Math.round(n * 10))
      ctx.fillStyle = `rgba(${rgb}, ${a / 2})`
      ctx.fill('evenodd')
    }
  }
  // Storms: pale ovals riding the belts round, each at its own pace, foreshortened toward the limb.
  for (const [lat, lon, w, rate] of STORMS) {
    const phi = (lat * Math.PI) / 180
    const th = lon + rate * t
    const depth = Math.sin(phi) * Math.sin(LEAN) + Math.cos(phi) * Math.sin(th) * Math.cos(LEAN)
    if (depth < 0.12) continue
    const [ox, oy] = latPt(phi, th)
    ctx.fillStyle = `rgba(${rgbOf(ZONE)}, ${(0.32 * Math.min(1, (depth - 0.12) * 4)).toFixed(3)})`
    ctx.beginPath()
    ctx.ellipse(ox, oy, w * Math.max(0.15, Math.abs(Math.sin(th))) * Math.cos(phi), w * 0.42 * depth, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = `rgba(${rgbOf(BELT)}, ${(0.22 * Math.min(1, (depth - 0.12) * 4)).toFixed(3)})`
    ctx.beginPath()
    ctx.ellipse(ox, oy, w * 0.45 * Math.max(0.15, Math.abs(Math.sin(th))) * Math.cos(phi), w * 0.16 * depth, 0, 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = paint.limb
  ctx.fillRect(-1.1, -1.1, 2.2, 2.2)
  ctx.fillStyle = paint.dusk
  ctx.fillRect(-1.1, -1.1, 2.2, 2.2)
  ctx.restore()
  outline(p, ink, weight)
  p.circle(X(sx), X(sy), X(SAT_R * 2))
  rings(true)
}

/* ------------------------------------------------------------------ drawing: the sphere */

function drawSphere(p: p5, c: Ctx, t: number, f: Frame, q: Pose): void {
  const { k, ink, weight } = c
  const [sx, sy] = SPHERE
  if (f.x1 < sx - RS * 2 || f.x0 > sx + RS * 2 || f.y1 < sy - RS * 2 || f.y0 > sy + RS * 2) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  // Round it, the stars behind it drawn out along the rim by the lens, more as the ship comes near.
  drawLensing(p, c, SPHERE, RS, smooth(t, cue(203), CONTACT))
  // Inside: the other side's sky, turning slowly and sliding a little with the camera.
  farSide(p, X(sx), X(sy), X(RS), 0.4 + t * 0.025 + (f.cy - sy) * 0.015, ((f.cx - sx) * -0.06) / RS, 81, 150, ink)
  p.push()
  ctx.beginPath()
  ctx.arc(X(sx), X(sy), X(RS), 0, TAU)
  ctx.clip()
  // Saturn, behind and to the left, bent into a thin gold crescent on the limb that faces it: the glass less a
  // larger disc set off the other way, so it is thickest toward Saturn and runs out to nothing either side.
  const ux = Math.cos(SAT_DIR), uy = Math.sin(SAT_DIR)
  ctx.beginPath()
  ctx.arc(X(sx), X(sy), X(RS), 0, TAU)
  ctx.arc(X(sx - ux * RS * 0.22), X(sy - uy * RS * 0.22), X(RS * 1.15), 0, TAU, true)
  ctx.fillStyle = `rgba(${GOLD_RGB}, 0.55)`
  ctx.fill()
  // The touch: rings running out over its face from where the nose went in.
  const face = Math.atan2(-DIR_IN[1], -DIR_IN[0])
  const cp: Pt = [sx + Math.cos(face) * RS, sy + Math.sin(face) * RS]
  const touch = t - CONTACT
  if (touch >= 0 && touch < 0.9) {
    // Three, one after another, each wider and fainter, bowed to the ball's curve as they go out.
    p.noFill()
    for (let j = 0; j < 3; j++) {
      const u = (touch - j * 0.12) / 0.75
      if (u <= 0 || u >= 1) continue
      p.stroke(alpha(p, DARK.ice, 0.75 * (1 - u) ** 1.4 * (1 - j * 0.25)))
      p.strokeWeight(Math.max(1, X(0.035 * (1 - 0.5 * u))))
      const r = 0.15 + 1.6 * Math.sqrt(u)
      p.push()
      p.translate(X(cp[0]), X(cp[1]))
      p.rotate(face)
      p.ellipse(0, 0, X(2 * r * 0.55), X(2 * r))
      p.pop()
    }
  }
  p.pop()
  // The rim.
  p.noFill()
  p.stroke(DARK.hull)
  p.strokeWeight(weight * 1.2)
  p.circle(X(sx), X(sy), X(RS * 2))

  // The Ranger's image on the rim that faces it, growing as it comes, and the ball's light in it.
  if (t > IGNITE && t < CROSS) {
    const [bx, by] = q.ball
    const d = Math.hypot(bx - sx, by - sy)
    const at = Math.atan2(by - sy, bx - sx)
    const near = smooth(d, RS + 16, RS + 0.9)
    if (near > 0) {
      const len = 0.06 + 0.9 * near * near
      p.stroke(alpha(p, DARK.hull, 0.8 * near))
      p.strokeWeight(X(0.05 + 0.03 * near))
      p.arc(X(sx), X(sy), X(RS * 1.93), X(RS * 1.93), at - len / 2, at + len / 2)
      p.stroke(alpha(p, BALL, 0.9 * near))
      p.strokeWeight(X(0.06))
      p.arc(X(sx), X(sy), X(RS * 1.93), X(RS * 1.93), at - len * 0.08, at + len * 0.08)
      // And upside down on the far edge, small.
      const back = at + Math.PI
      p.stroke(alpha(p, BALL, 0.6 * near))
      p.strokeWeight(X(0.035))
      p.arc(X(sx), X(sy), X(RS * 1.93), X(RS * 1.93), back - len * 0.12, back + len * 0.12)
    }
  }
  // The cockpit goes in: the ball's light runs all round the rim.
  const since = t - CROSS
  if (since >= 0 && since < 0.8) {
    // On the rim itself, fading: the rim lit, not a ring thrown off it.
    const u = since / 0.8
    p.noFill()
    p.stroke(alpha(p, BALL, 0.9 * (1 - u) ** 1.5))
    p.strokeWeight(X(0.07 * (1 - 0.6 * u)))
    p.circle(X(sx), X(sy), X(RS * 2))
  }
}

/* ------------------------------------------------------------------ drawing: the station */

function drawStation(p: p5, c: Ctx, t: number, f: Frame): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  const V = (x: number, y: number) => p.vertex(X(x), X(y))
  const turn = stationTurn(t)
  // The strips are set round the hull so that one faces us square on every beat.
  const strips = turn + STRIP_PHASE
  const far = CAP - ST_LEN
  const xl = Math.max(f.x0 - 1, far)
  const xr = CAP - BEVEL
  if (xl > CAP || f.x1 < far - 1) return
  // The far end, when the frame is wide enough to reach it.
  const whole = xl <= far
  const shape: Pt[] = whole
    ? [[far, -ST_R + BEVEL], [far + BEVEL, -ST_R], [xr, -ST_R], [CAP, -ST_R + BEVEL], [CAP, ST_R - BEVEL], [xr, ST_R], [far + BEVEL, ST_R], [far, ST_R - BEVEL]]
    : [[xl, -ST_R], [xr, -ST_R], [CAP, -ST_R + BEVEL], [CAP, ST_R - BEVEL], [xr, ST_R], [xl, ST_R]]
  const hull = () => {
    ctx.beginPath()
    shape.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), X(y)) : ctx.lineTo(X(x), X(y))))
    ctx.closePath()
  }
  solid(p, ink, weight, DARK.hull)
  p.beginShape()
  for (const [x, y] of shape) V(x, y)
  p.endShape(p.CLOSE)
  p.push()
  hull()
  ctx.clip()
  // Round: lit high on the sun's side, falling off to both limbs and deep toward the bottom.
  const g = ctx.createLinearGradient(0, X(-ST_R), 0, X(ST_R))
  g.addColorStop(0, 'rgba(11, 15, 29, 0.5)')
  g.addColorStop(0.1, 'rgba(11, 15, 29, 0.12)')
  g.addColorStop(0.28, 'rgba(11, 15, 29, 0)')
  g.addColorStop(0.6, 'rgba(11, 15, 29, 0.22)')
  g.addColorStop(0.86, 'rgba(11, 15, 29, 0.55)')
  g.addColorStop(1, 'rgba(11, 15, 29, 0.75)')
  ctx.fillStyle = g
  ctx.fillRect(X(xl), X(-ST_R), X(CAP - xl), X(2 * ST_R))
  // The land between the windows: seams running its length, streaming as it turns.
  for (let i = 0; i < 3; i++) {
    for (let j = 1; j <= 4; j++) {
      const a = strips + (i * TAU) / 3 + WIN_W + (j * (TAU / 3 - WIN_W)) / 5
      const sn = Math.sin(a)
      if (sn <= 0.04) continue
      p.stroke(alpha(p, ink, (j === 2 || j === 3 ? 0.4 : 0.22) * sn))
      p.strokeWeight(Math.max(1, weight * (j === 2 || j === 3 ? 0.6 : 0.45)))
      const y = -ST_R * Math.cos(a)
      p.line(X(xl), X(y), X(xr), X(y))
    }
  }
  // Down the middle of each land strip, a slate spine with hatches along it.
  for (let i = 0; i < 3; i++) {
    const a0 = strips + (i * TAU) / 3 + WIN_W + (TAU / 3 - WIN_W) / 2 - 0.07
    for (const [y0, y1] of nearBand(a0, a0 + 0.14, ST_R)) {
      const top = Math.min(y0, y1)
      const h = Math.abs(y1 - y0)
      if (h < 0.004) continue
      ctx.fillStyle = 'rgba(58, 66, 87, 0.75)'
      ctx.fillRect(X(xl), X(top), X(xr - xl), X(h))
      ctx.fillStyle = 'rgba(11, 15, 29, 0.6)'
      for (let x = xr - 0.5; x > xl; x -= 0.9) ctx.fillRect(X(x - 0.16), X(top + h * 0.2), X(0.32), X(h * 0.6))
    }
  }
  // The window strips: dark glass, the farm's light behind it, framed every half cell.
  for (let i = 0; i < 3; i++) {
    const a0 = strips + (i * TAU) / 3
    for (const [y0, y1] of nearBand(a0, a0 + WIN_W, ST_R)) {
      const top = Math.min(y0, y1)
      const h = Math.abs(y1 - y0)
      if (h < 0.004) continue
      const mid = Math.asin(clamp(-(top + h / 2) / ST_R, -1, 1))
      const face = Math.cos(mid)
      ctx.fillStyle = `rgba(${GOLD_RGB}, ${0.22 * face})`
      ctx.fillRect(X(xl), X(top - 0.18), X(xr - xl), X(h + 0.36))
      ctx.fillStyle = DARK.deep
      ctx.fillRect(X(xl), X(top), X(xr - xl), X(h))
      // The farm's daylight through the glass: brightest where the strip faces us.
      const wg = ctx.createLinearGradient(0, X(top), 0, X(top + h))
      wg.addColorStop(0, `rgba(${GOLD_RGB}, ${0.55 + 0.4 * face})`)
      wg.addColorStop(0.5, `rgba(${BONE_RGB}, ${0.4 + 0.5 * face})`)
      wg.addColorStop(1, `rgba(${GOLD_RGB}, ${0.55 + 0.4 * face})`)
      ctx.fillStyle = wg
      ctx.fillRect(X(xl), X(top), X(xr - xl), X(h))
      p.stroke(alpha(p, DARK.slate, 0.7))
      p.strokeWeight(Math.max(1, weight * 0.55))
      for (let x = xr - 0.3; x > xl; x -= 0.55) p.line(X(x), X(top), X(x), X(top + h))
      outline(p, ink, weight * 0.7)
      p.line(X(xl), X(top), X(xr), X(top))
      p.line(X(xl), X(top + h), X(xr), X(top + h))
    }
  }
  // Hoops round the hull, every few cells: they stand still while it turns.
  for (let x = xr - 3.1; x > xl; x -= 4.4) {
    p.stroke(alpha(p, ink, 0.45))
    p.strokeWeight(Math.max(1, weight * 0.8))
    p.line(X(x), X(-ST_R), X(x), X(ST_R))
    p.stroke(alpha(p, c.ink, 0.25))
    p.strokeWeight(Math.max(1, weight * 0.6))
    p.line(X(x + 0.06), X(-ST_R), X(x + 0.06), X(ST_R))
  }
  // The bevel at the end, a shade darker.
  ctx.fillStyle = 'rgba(11, 15, 29, 0.25)'
  ctx.fillRect(X(xr), X(-ST_R), X(BEVEL), X(2 * ST_R))
  p.pop()
  outline(p, ink, weight)
  p.line(X(xr), X(-ST_R), X(xr), X(ST_R))
  // The cap's rim lamps, going round with it.
  p.noStroke()
  for (let j = 0; j < 12; j++) {
    const a = turn + (j * TAU) / 12
    const sn = Math.sin(a)
    if (sn <= 0) continue
    const y = -(ST_R - BEVEL - 0.25) * Math.cos(a)
    p.fill(alpha(p, DARK.amber, 0.35 + 0.65 * sn))
    p.circle(X(CAP + 0.05), X(y), X(0.08))
  }

  // The hub: a short drum on the cap, slate, its seams streaming.
  solid(p, ink, weight, DARK.slate)
  p.beginShape()
  V(CAP, -BOSS_R)
  V(CAP + BOSS_L, -BOSS_R + 0.18)
  V(CAP + BOSS_L, BOSS_R - 0.18)
  V(CAP, BOSS_R)
  p.endShape(p.CLOSE)
  for (let j = 0; j < 10; j++) {
    const a = turn + (j * TAU) / 10 + 0.2
    const sn = Math.sin(a)
    if (sn <= 0.05) continue
    p.stroke(alpha(p, ink, 0.45 * sn))
    p.strokeWeight(Math.max(1, weight * 0.5))
    const y = -(BOSS_R - 0.09) * Math.cos(a)
    p.line(X(CAP + 0.03), X(y), X(CAP + BOSS_L - 0.03), X(y * 0.88))
  }
}

/** The port: the collar on the hub, and its six red clamps (the far ones behind the Ranger, the near ones in front). */
function drawDock(p: p5, c: Ctx, t: number, near: boolean): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const turn = stationTurn(t)
  const len = collarLen(t)
  const x0 = CAP + BOSS_L
  const xf = x0 + len
  if (!near) {
    // The collar drum.
    solid(p, ink, weight, DARK.hull)
    p.beginShape()
    p.vertex(X(x0), X(-COLLAR_R))
    p.vertex(X(xf), X(-COLLAR_R))
    p.vertex(X(xf), X(COLLAR_R))
    p.vertex(X(x0), X(COLLAR_R))
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(alpha(p, DARK.deep, 0.35))
    p.beginShape()
    p.vertex(X(x0), X(0.1))
    p.vertex(X(xf), X(0.1))
    p.vertex(X(xf), X(COLLAR_R))
    p.vertex(X(x0), X(COLLAR_R))
    p.endShape(p.CLOSE)
    // Its face ring.
    solid(p, ink, weight * 0.7, DARK.slate)
    p.beginShape()
    p.vertex(X(xf - 0.07), X(-COLLAR_R - 0.04))
    p.vertex(X(xf), X(-COLLAR_R - 0.04))
    p.vertex(X(xf), X(COLLAR_R + 0.04))
    p.vertex(X(xf - 0.07), X(COLLAR_R + 0.04))
    p.endShape(p.CLOSE)
    for (let j = 0; j < 4; j++) {
      const a = turn + (j * TAU) / 4 + 0.5
      const sn = Math.sin(a)
      if (sn <= 0.05) continue
      p.stroke(alpha(p, ink, 0.5 * sn))
      p.strokeWeight(Math.max(1, weight * 0.5))
      const y = -(COLLAR_R - 0.05) * Math.cos(a)
      p.line(X(x0 + 0.03), X(y), X(xf - 0.1), X(y))
    }
  }
  // The clamps: a hooked arm on a pivot at the collar's face, over the Ranger's flange; they swing out on 184, and fold flat as the collar goes home.
  // Out on the beat, with a heavy sway against their stops; folded flat as the collar goes home.
  const since = t - CLAMPS
  const open = easeOut(since / 0.16) + (since > 0 ? 0.07 * Math.exp(-since / 0.3) * Math.sin(since * 10) : 0)
  const fold = easeOut((t - STOW) / 0.24)
  const swing = 1.15 * open + 0.55 * fold
  const arm: Pt[] = [
    [0, 0],
    [0.34, -0.04],
    [0.44, -0.24],
  ]
  for (let j = 0; j < 6; j++) {
    const a = turn + (j * TAU) / 6 + Math.PI / 6
    const sn = Math.sin(a)
    if (sn > 0 !== near) continue
    const cs = Math.cos(a)
    const pts: Pt[] = arm.map(([dx, dr]) => {
      const x = dx * Math.cos(swing) - dr * Math.sin(swing)
      const r = 0.6 + dx * Math.sin(swing) + dr * Math.cos(swing)
      return [X(xf - 0.05 + x), X(-r * cs)]
    })
    bar(p, ink, weight * 0.8, DARK.red, X(0.085), pts)
    solid(p, ink, weight * 0.5, DARK.slate)
    p.circle(pts[0][0], pts[0][1], X(0.09))
  }
  // Vents at the seam as the clamps go, and at the hub as the collar goes home.
  if (near) {
    const fl = t - CLAMPS
    for (const s of [-1, 1]) jet(p, c, fl, [xf + 0.12, s * 0.62], [0.3, s * 0.9], 0.8)
    const home = t - STOW - 0.22
    for (const s of [-1, 1]) jet(p, c, home, [x0 + 0.05, s * (COLLAR_R + 0.1)], [0.5, s * 0.8], 0.75)
  }
}

/**
 * The umbilical: a cable from a socket on the hub's face to the fuel port in
 * the Ranger's flank (where the hub's fuel line went), turning with the
 * station. It leaves the socket, twists into the port's plane and runs along
 * the ship below the ball. On 185 the plug fires out and the cable reels in,
 * whipping, and the plug seats in the socket on 187: the socket is set round
 * the hub so it is on our side for all of that.
 */
const PORT_X = -0.5 - PORT[0] * SHIP
const PORT_R = SHIP * Math.hypot(PORT[1], PORT[2])
/** The port's angle round the axis at the cut, in the station's sense (the ship is nosed left, so its y is the screen's upside down). */
const PORT_A0 = (() => {
  const r = rangerRoll(UNDOCK)
  const y = PORT[1] * Math.cos(r) - PORT[2] * Math.sin(r)
  const d = PORT[1] * Math.sin(r) + PORT[2] * Math.cos(r)
  return Math.atan2(d, y)
})()
const PSI_S = 2.55 - stationTurn(SEAT)

function umbilical(t: number): { pts: [number, number, number][]; end: [number, number, number]; socket: number } {
  const e = easeOut((t - UMBILICAL) / (SEAT - UMBILICAL))
  const whip = t > UMBILICAL ? Math.exp(-(t - UMBILICAL) / 0.6) * Math.sin((t - UMBILICAL) * 8.5) : 0
  const turn = stationTurn(t)
  const aS = PSI_S + turn
  const aP = PORT_A0 + turn
  const aE = aP + (aS - aP) * e
  const end: [number, number, number] = [PORT_X + (SOCKET[0] + 0.14 - PORT_X) * e, PORT_R + (SOCKET[1] - PORT_R) * e + 0.35 * whip * (1 - e), aE]
  const bow = (0.85 + 0.6 * whip) * (1 - e) + 0.02
  const c1: Pt = [SOCKET[0] + 0.6 * (1 - e) + 0.1, SOCKET[1] + bow]
  const c2: Pt = [end[0] - 0.6 * (1 - e), end[1] + bow * 0.9]
  const pts: [number, number, number][] = []
  for (let i = 0; i <= 18; i++) {
    const u = i / 18
    const v = 1 - u
    pts.push([
      v * v * v * SOCKET[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * end[0],
      v * v * v * SOCKET[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * end[1],
      aE + (aS - aE) * v * v * v,
    ])
  }
  return { pts, end, socket: aS }
}

function drawUmbilical(p: p5, c: Ctx, t: number, near: boolean): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const { pts, end, socket } = umbilical(t)
  const proj = ([x, r, a]: [number, number, number]): Pt => [X(x), X(-r * Math.cos(a))]
  if (Math.sin(socket) > 0 === near) {
    // The socket, a block on the hub's face.
    const s = proj([SOCKET[0], SOCKET[1], socket])
    solid(p, ink, weight * 0.6, DARK.slate)
    p.rect(s[0], s[1], X(0.18), X(0.2), X(0.03))
  }
  if (Math.sin(pts[9][2]) > 0 === near) {
    bar(p, ink, weight * 0.8, DARK.slate, X(0.08), pts.map(proj))
    const e = proj(end)
    solid(p, ink, weight * 0.7, DARK.gold)
    p.rect(e[0], e[1], X(0.18), X(0.15), X(0.03))
  }
  if (!near) return
  // The pyro that frees the plug, and the spark as it seats on the hub.
  const pyro = t - UMBILICAL
  if (pyro >= 0 && pyro < 0.7) {
    const a = PORT_A0 + stationTurn(UMBILICAL)
    const at = proj([PORT_X, PORT_R, a])
    jet(p, c, pyro, [at[0] / k, at[1] / k], [0.5, Math.cos(a) > 0 ? -0.6 : 0.6], 0.8)
  }
  const sp = t - SEAT
  if (sp >= 0 && sp < 0.35) {
    const s = proj([SOCKET[0] + 0.1, SOCKET[1], socket])
    const u = sp / 0.35
    p.stroke(alpha(p, DARK.amber, 1 - u))
    p.strokeWeight(Math.max(1, weight * 0.7))
    for (let j = 0; j < 5; j++) {
      const d = -1.2 + j * 0.6
      const r0 = 0.08 + 0.25 * u
      const r1 = r0 + 0.12
      p.line(s[0] + X(Math.cos(d) * r0), s[1] + X(Math.sin(d) * r0), s[0] + X(Math.cos(d) * r1), s[1] + X(Math.sin(d) * r1))
    }
  }
}

/* ------------------------------------------------------------------ drawing: the Ranger */

function drawRanger(p: p5, c: Ctx, t: number, q: Pose): void {
  if (t > END + 0.4) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * c.k
  const entering = t > CONTACT - 0.05
  if (!entering) {
    rangerBody(p, c, t, q, false)
    return
  }
  const [sx, sy] = SPHERE
  // What is still outside the sphere, as it is.
  p.push()
  ctx.beginPath()
  ctx.rect(X(sx - 40), X(sy - 40), X(80), X(80))
  ctx.arc(X(sx), X(sy), X(RS), 0, TAU, true)
  ctx.clip('evenodd')
  rangerBody(p, c, t, q, false)
  p.pop()
  // What is in: the same, seen through the glass, shrinking into it. While the ship straddles the rim it shrinks
  // about the point where it goes in, so what is in stays joined to what is still out (shrunk about the centre, the
  // front half came away from the tail and showed as a second, smaller ship). Once the tail is in, the point it
  // shrinks toward slides on to the centre, where the far side opens.
  const sigma = 1 - 0.88 * smooth(t, CONTACT, END + 0.1)
  const fade = 1 - smooth(t, END - 0.1, END + 0.4)
  if (fade <= 0) return
  const toCentre = smooth(t, CROSS + 0.55, END)
  const px = sx - RS * DIR_IN[0] * (1 - toCentre)
  const py = sy - RS * DIR_IN[1] * (1 - toCentre)
  p.push()
  ctx.beginPath()
  ctx.arc(X(sx), X(sy), X(RS), 0, TAU)
  ctx.clip()
  ctx.globalAlpha = fade
  p.translate(X(px), X(py))
  p.scale(sigma)
  p.translate(-X(px), -X(py))
  rangerBody(p, c, t, q, t >= CROSS)
  p.pop()
}

/** Draw in the Ranger's own frame at its pose: the ball at the origin, nose along +x, in ship units, with the stage's line weights kept. */
function inShip(p: p5, c: Ctx, q: Pose, draw: (c: Ctx) => void): void {
  p.push()
  p.translate(q.ball[0] * c.k, q.ball[1] * c.k)
  p.rotate(q.h)
  p.scale(SHIP)
  draw({ ...c, weight: c.weight / SHIP })
  p.pop()
}

/** The canopy's outline, rolled: at each x, the highest and lowest the dome over the sill reaches on the screen. */
function domeOutline(cs: number, sn: number): Pt[] {
  const lo: Pt[] = []
  const hi: Pt[] = []
  for (const [x, top] of DOME) {
    const h = Math.max(0, SILL - top)
    const w = DOME_W * Math.sqrt(h / DOME_H)
    let mn = Infinity
    let mx = -Infinity
    for (let j = 0; j <= 12; j++) {
      const th = (Math.PI * j) / 12
      const v = (SILL - h * Math.sin(th)) * cs - w * Math.cos(th) * sn
      mn = Math.min(mn, v)
      mx = Math.max(mx, v)
    }
    lo.push([x, mn])
    hi.push([x, mx])
  }
  return [...lo, ...hi.reverse()]
}

/** The Ranger at its pose, and whatever it is firing. `image` also draws the ball's light in the cockpit (inside the sphere, where the stage no longer draws the ball). */
function rangerBody(p: p5, c0: Ctx, t: number, q: Pose, image: boolean): void {
  inShip(p, c0, q, (c) => {
    const { k, ink, weight } = c
    const X = (v: number) => v * k
    const cs = Math.cos(q.roll)
    const sn = Math.sin(q.roll)
    const Y = (y: number, z: number) => y * cs - z * sn
    const D = (y: number, z: number) => y * sn + z * cs
    const poly = (pts: Pt[]) => {
      p.beginShape()
      for (const [x, y] of pts) p.vertex(X(x), X(y))
      p.endShape(p.CLOSE)
    }
    /** The hub's tin, in the dark's colours: hull, a shade down. */
    const tin = (pts: Pt[], w = weight * 0.8) => {
      solid(p, ink, w, DARK.hull)
      poly(pts)
      p.noStroke()
      p.fill(alpha(p, DARK.deep, 0.34))
      poly(pts)
    }
    // Which flank faces us, and which wing.
    const side = cs >= 0 ? 1 : -1
    const flank = (x: number, y: number): Pt => [x, Y(y, side * halfAt(x))]
    const near: 1 | -1 = D(0.54, 0.65) >= D(0.54, -0.65) ? 1 : -1

    drawPlume(p, c, t, cs)

    // The wing: swept back and hung down, one each side; the far one behind the hull.
    const wing = (s: number) => {
      tin([
        [-0.3, Y(0.36, s * 0.34)],
        [-1.72, Y(0.72, s * 0.96)],
        [-2.14, Y(0.72, s * 0.96)],
        [-1.98, Y(0.36, s * 0.34)],
      ], weight * 0.9)
      outline(p, alpha(p, ink, 0.45).toString(), weight * 0.5)
      p.line(X(-0.75), X(Y(0.47, s * 0.53)), X(-2.02), X(Y(0.47, s * 0.53)))
    }
    wing(-near)
    // The bells, round, on the tail.
    for (const [y0, y1] of BELLS) {
      const yc = ((y0 + y1) / 2) * cs
      const hh = (y1 - y0) / 2
      tin([
        [-2.05, yc - hh + 0.025],
        [-2.26, yc - hh - 0.015],
        [-2.26, yc + hh + 0.015],
        [-2.05, yc + hh - 0.025],
      ], weight * 0.7)
    }
    // The hull: its back or its belly, whichever is turned to us, and the flank that faces us.
    if (Math.abs(sn) > 0.02) {
      const edge = sn < 0 ? HULL_TOP : HULL_BOT
      const out: Pt[] = [...edge.map(([x, y]): Pt => [x, Y(y, halfAt(x))]), ...[...edge].reverse().map(([x, y]): Pt => [x, Y(y, -halfAt(x))])]
      solid(p, ink, weight, sn < 0 ? DARK.hull : DARK.deep)
      poly(out)
      if (sn < 0) {
        p.noStroke()
        p.fill(alpha(p, DARK.deep, 0.14))
        poly(out)
      }
    }
    solid(p, ink, weight, DARK.hull)
    poly(HULL.map(([x, y]) => flank(x, y)))
    p.noStroke()
    p.fill(DARK.deep)
    poly(BELLY.map(([x, y]) => flank(x, y)))
    // Panel lines, the hatch, the fuel port.
    outline(p, alpha(p, ink, 0.45).toString(), weight * 0.5)
    for (const x of [-0.78, -1.62]) {
      const [a, b] = [flank(x, -0.04), flank(x, 0.33)]
      p.line(X(a[0]), X(a[1]), X(b[0]), X(b[1]))
    }
    poly([flank(-1.25, 0.07), flank(-0.95, 0.07), flank(-0.95, 0.25), flank(-1.25, 0.25)])
    if (side < 0) {
      const [px, py] = flank(PORT[0], PORT[1])
      solid(p, ink, weight * 0.5, DARK.slate)
      p.ellipse(X(px), X(py), X(0.12), X(0.12 * Math.max(0.2, Math.abs(cs))))
    }
    // The docking collar on its back.
    if (sn < 0.35) {
      const ys = [-0.145, -0.055].flatMap((y) => [Y(y, 0.13), Y(y, -0.13)])
      tin([
        [-1.84, Math.min(...ys)],
        [-1.48, Math.min(...ys)],
        [-1.48, Math.max(...ys)],
        [-1.84, Math.max(...ys)],
      ], weight * 0.7)
    }
    // The probe: out of the nose into the port while docked, and home on 191; only what is clear of the port shows.
    const probe = 0.45 * (1 - easeOut((t - PROBE) / 0.14))
    const gap = t < IGNITE ? (driftX(t) - DOCK_X) / SHIP : Infinity
    const shown = Math.min(probe, gap)
    const yp = 0.27 * cs
    if (shown > 0.02) {
      bar(p, ink, weight * 0.7, DARK.hull, X(0.07), [
        [X(1.36), X(yp)],
        [X(1.38 + shown), X(yp)],
      ])
      if (shown >= probe - 1e-6) {
        solid(p, ink, weight * 0.7, DARK.gold)
        p.circle(X(1.38 + shown), X(yp), X(0.14))
      }
    }

    // The cockpit: its well dark under the dome, the lit panel, the red seat-back behind the ball.
    const dome = domeOutline(cs, sn)
    solid(p, ink, weight * 0.6, DARK.deep)
    poly(dome)
    // Lamplit: the well a flat warm wash, not a glow round the ball.
    p.noStroke()
    p.fill(alpha(p, DARK.amber, image ? 0.32 : 0.2))
    poly(dome)
    {
      const ys = [0.1, -0.14].flatMap((y) => [Y(y, 0.13), Y(y, -0.13)])
      solid(p, ink, weight * 0.6, DARK.red)
      poly([
        [-0.31, Math.min(...ys)],
        [-0.14, Math.min(...ys)],
        [-0.14, Math.max(...ys)],
        [-0.31, Math.max(...ys)],
      ])
    }
    for (const [x, y, col] of [
      [0.4, 0.04, DARK.amber],
      [0.33, -0.05, DARK.ice],
      [0.26, -0.12, DARK.hull],
    ] as const) {
      p.noStroke()
      p.fill(col)
      p.circle(X(x), X(y * cs), X(0.05))
    }
    if (image) {
      solid(p, ink, weight * 0.6, BALL)
      p.circle(0, 0, X((2 * R) / SHIP))
    }

    wing(near)
    // The wingtip lamp: a blink on every strike.
    const blink = knock(lastPulseOf(UNDOCK_HITS, t), 0.18)
    const tip: Pt = [-1.95, Y(0.7, near * 0.93)]
    solid(p, ink, weight * 0.5, blink > 0.3 ? DARK.amber : DARK.red)
    p.circle(X(tip[0]), X(tip[1]), X(0.075))

    drawJets(p, c, t)
  })
}

/** Over the ball: the canopy's glass, its windscreen frame, and a glint that keeps to the light. */
function drawGlassOver(p: p5, c0: Ctx, t: number, q: Pose): void {
  if (t >= CROSS) return
  const X0 = (v: number) => v * c0.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  if (t > CONTACT - 0.05) {
    const [sx, sy] = SPHERE
    ctx.beginPath()
    ctx.rect(X0(sx - 40), X0(sy - 40), X0(80), X0(80))
    ctx.arc(X0(sx), X0(sy), X0(RS), 0, TAU, true)
    ctx.clip('evenodd')
  }
  inShip(p, c0, q, (c) => {
    const { k, ink, weight } = c
    const X = (v: number) => v * k
    const cs = Math.cos(q.roll)
    const sn = Math.sin(q.roll)
    solid(p, ink, weight * 1.1, alpha(p, DARK.ice, 0.24).toString())
    p.beginShape()
    for (const [x, y] of domeOutline(cs, sn)) p.vertex(X(x), X(y))
    p.endShape(p.CLOSE)
    // The windscreen's frame: an arch over the dome, the near half drawn, the far half seen through the glass.
    const arch: [number, number, number][] = []
    for (let j = 0; j <= 12; j++) {
      const th = (Math.PI * j) / 12
      const x = 0.32 - 0.16 * Math.sin(th)
      const h = Math.max(0, SILL - domeTop(x))
      const w = DOME_W * Math.sqrt(h / DOME_H)
      const y = SILL - h * Math.sin(th)
      const z = w * Math.cos(th)
      arch.push([x, y * cs - z * sn, y * sn + z * cs])
    }
    for (let j = 1; j < arch.length; j++) {
      const [x0, y0, d0] = arch[j - 1]
      const [x1, y1, d1] = arch[j]
      p.stroke(alpha(p, ink, (d0 + d1) / 2 >= -0.02 ? 0.9 : 0.3))
      p.strokeWeight(weight * 0.8)
      p.line(X(x0), X(y0), X(x1), X(y1))
    }
  })
  // The glint: high on the glass, toward the sun, whichever way the ship is turned.
  p.noFill()
  p.stroke(alpha(p, c0.ink, 0.6))
  p.strokeWeight(Math.max(1, X0(0.03)))
  p.arc(X0(q.ball[0] - 0.02), X0(q.ball[1] - 0.02), X0(0.4), X0(0.4), Math.PI * 1.1, Math.PI * 1.45)
  p.pop()
}

/** The main engine, in the ship's frame: a low flame from each bell while it burns, a flare on every pulse, a flash and a ring as it lights. */
function drawPlume(p: p5, c: Ctx, t: number, cs: number): void {
  if (t < IGNITE) return
  const X = (v: number) => v * c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const last = PULSES[PULSES.length - 1]
  const off = smooth(t, last + 0.3, last + 0.75)
  if (off >= 1) return
  // The latest pulse: how hard, and how long ago.
  const { i, ago } = lastPulse(t)
  const s = i === 0 ? 1.7 : i > 0 ? PULSE_S[i - 1] : 0
  const flare = s * knock(ago, 0.2)
  const on = 1 - off
  const len = (0.55 * on + 2.4 * flare) / SHIP
  const w = 0.09 + 0.04 * Math.min(1.5, flare)
  const x0 = -2.27
  for (const [b0, b1] of BELLS) {
    const yc = ((b0 + b1) / 2) * cs
    // The flame: ice at the bell, gone at its tip.
    const g = ctx.createLinearGradient(X(x0), 0, X(x0 - len), 0)
    g.addColorStop(0, `rgba(${ICE_RGB}, ${0.9 * on})`)
    g.addColorStop(0.45, `rgba(${ICE_RGB}, ${0.45 * on})`)
    g.addColorStop(1, `rgba(${ICE_RGB}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(X(x0), X(yc - w))
    ctx.quadraticCurveTo(X(x0 - len * 0.4), X(yc - w * 1.3), X(x0 - len), X(yc))
    ctx.quadraticCurveTo(X(x0 - len * 0.4), X(yc + w * 1.3), X(x0), X(yc + w))
    ctx.closePath()
    ctx.fill()
    // The core, white, and on a hard pulse its shock diamonds.
    const cl = len * 0.6
    const g2 = ctx.createLinearGradient(X(x0), 0, X(x0 - cl), 0)
    g2.addColorStop(0, `rgba(${BONE_RGB}, ${on})`)
    g2.addColorStop(1, `rgba(${BONE_RGB}, 0)`)
    ctx.fillStyle = g2
    ctx.beginPath()
    ctx.moveTo(X(x0), X(yc - w * 0.5))
    ctx.quadraticCurveTo(X(x0 - cl * 0.5), X(yc - w * 0.55), X(x0 - cl), X(yc))
    ctx.quadraticCurveTo(X(x0 - cl * 0.5), X(yc + w * 0.55), X(x0), X(yc + w * 0.5))
    ctx.closePath()
    ctx.fill()
    if (flare > 0.35) {
      const n = flare > 1 ? 3 : 2
      for (let j = 0; j < n; j++) {
        const dx = x0 - 0.4 - j * 0.48 * (0.7 + 0.3 * flare)
        const a = Math.min(1, flare - 0.35) * (1 - j / (n + 0.5))
        ctx.fillStyle = `rgba(${BONE_RGB}, ${0.85 * a})`
        ctx.beginPath()
        ctx.moveTo(X(dx + 0.12), X(yc))
        ctx.lineTo(X(dx), X(yc - w * 0.42))
        ctx.lineTo(X(dx - 0.12), X(yc))
        ctx.lineTo(X(dx), X(yc + w * 0.42))
        ctx.closePath()
        ctx.fill()
      }
    }
  }
  const mid = 0.19 * cs
  // Each pulse: a ring blown off down the flames.
  if (i >= 0 && ago < 0.5) {
    const u = ago / 0.5
    p.noFill()
    p.stroke(`rgba(${BONE_RGB}, ${0.85 * (1 - u) ** 1.5})`)
    p.strokeWeight(Math.max(1, X(0.04)))
    p.ellipse(X(x0 - 0.15 - (1.6 * u * s) / SHIP), X(mid), X(0.14 + 0.24 * u), X(0.5 + 0.55 * u * s))
  }
}

function lastPulse(t: number): { i: number; ago: number } {
  let i = -1
  for (let j = 0; j < BURNS.length; j++) if (BURNS[j] <= t) i = j
  return { i, ago: i < 0 ? Infinity : t - BURNS[i] }
}

/** Seconds since the latest of `times`, Infinity before the first. */
function lastPulseOf(times: readonly number[], t: number): number {
  let ago = Infinity
  for (const x of times) if (x <= t) ago = t - x
  return ago
}

/** The jets, in the Ranger's own frame (ship units): nose, wingtips, tail. */
function drawJets(p: p5, c: Ctx, t: number): void {
  const at = (y: number, z: number, r: number): number => y * Math.cos(r) - z * Math.sin(r)
  // Backing off, and braking: the nose jets on its flanks and back, blowing forward.
  for (const [when, size] of [[SEPARATE, 1.6] as const, ...BRAKES.map((b) => [b, 1.55] as const)]) {
    const age = t - when
    if (age < 0 || age > 0.7) continue
    const r = rangerRoll(when)
    const mid = at(0.24, 0, r)
    for (const [y, z] of [
      [0.22, halfAt(1.1)],
      [0.22, -halfAt(1.1)],
      [0.15, 0],
    ]) {
      const yy = at(y, z, r)
      jet(p, c, age, [1.12, yy], [1, (yy - mid) * 2.5], size * (z === 0 ? 0.8 : 0.95))
    }
  }
  // The roll jets: a pair at the wingtips each beat, blowing the way the tips are going.
  for (const when of DESPIN) {
    const age = t - when
    if (age < 0 || age > 0.7) continue
    const r = rangerRoll(when)
    for (const s of [1, -1]) {
      const y = 0.72 * Math.cos(r) - s * 0.96 * Math.sin(r)
      const d = 0.72 * Math.sin(r) + s * 0.96 * Math.cos(r)
      const dy = Math.abs(d) < 0.3 ? (d < 0 ? 0.3 : -0.3) : -d
      jet(p, c, age, [-1.93, y], [0, dy], 1.75)
    }
  }
  // End for end: the nose jet pushes the nose one way and the tail jet the tail the other; the same again to stop it.
  for (const when of [PITCH, IGNITE - FLIP_D]) {
    const age = t - when
    if (age < 0 || age > 0.7) continue
    // To start the nose up (it is on the left) it blows down the screen; to stop it (on the right now, and going down) it blows down again.
    const q = pose(when)
    const down: Pt = [Math.sin(q.h), Math.cos(q.h)]
    const cs = Math.cos(q.roll)
    const sg = Math.sign(down[1] || 1)
    jet(p, c, age, [1.1, 0.24 * cs + 0.12 * sg], [down[0], down[1]], 1)
    jet(p, c, age, [-1.95, 0.05 * cs - 0.14 * sg], [-down[0], -down[1]], 1)
  }
}
