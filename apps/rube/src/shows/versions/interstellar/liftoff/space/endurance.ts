import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, lastOf, part, smooth, type Companion, type Ctx } from '../kit'
import { beat } from '../music'
import { brandDrift } from '../rocket'
import { G_LOW } from '../physics'
import { BALL, DARK } from '../worlds'

/**
 * Orbit: the ring station, and the sphere.
 *
 * Five machines, each a bar or less, every one on the beat:
 *
 *   1. The mass driver. Its beacon calls the drifting ball in (149–151) and
 *      its cradle takes it on the downbeat (152); the coils fire up the rail
 *      on the eighths, each farther on than the last because the ball is
 *      going faster, and it leaves the muzzle (154½) on a slow low-g lob.
 *   2. The dock. The ring turns so its rim runs at the lob's own sideways
 *      speed: the port comes down over the rising ball, the jaws open (155),
 *      they meet at the top of the lob moving together, and the jaws shut on
 *      the downbeat (156). Docking by matching spin.
 *   3. The airlock. The hatch opens and the jaws draw the ball in (157); it
 *      shuts under it and a kicker sends it along the corridor (158).
 *   4. The centrifuge run. Inside the rim the spin is gravity: the ball runs
 *      along the corridor floor ahead of the ring, past a bulkhead lamp
 *      (159), and falls outward through a trapdoor into a catapult's cup on
 *      the downbeat (160).
 *   5. The catapult. Its arm ratchets down a notch a beat as the ring brings
 *      it over the top (161–163), and on the downbeat (164) it throws — back
 *      against the spin, so the ball goes up and away from the ring.
 *
 * Out there is the sphere: a glass ball of other stars with a bright edge,
 * near a small ringed planet. Its pull bends the throw; the ball meets the
 * edge on the next beat (165) and its image wraps the rim; by 166 it is
 * inside, out of sight, at the centre.
 *
 * Brand rides all of it with him, at his back: she drifts in after
 * him on the beacon's blinks, the cradle takes them both, they go up the
 * rail and over on the lob one behind the other, the long jaws hold the two
 * of them, and the airlock lets them in together. The kick sends her into
 * him and him on, a little faster than her; she passes the lamp an eighth
 * after him (159½). On 160 the trapdoor takes him and slaps shut a ball's
 * width in front of her. She slows over it, and runs on round the inside of
 * the ring without him.
 */

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The driver's beacon, calling the ball in. */
const BEACON = [149, 150, 151].map(beat)
const CATCH = beat(152)
const COILS = [152.5, 153, 153.5, 154].map(beat)
const MUZZLE = beat(154.5)
/** The jaws open as the ball comes up at them. */
const READY = beat(155)
const CLAMP = beat(156)
const HATCH = beat(157)
const KICK = beat(158)
const GATE = beat(159)
const DROP = beat(160)
const CLICKS = [161, 162, 163].map(beat)
const FIRE = beat(164)
const TOUCH = beat(165)
const END = beat(166)

export const ENDURANCE_HITS = [...BEACON, CATCH, ...COILS, MUZZLE, READY, CLAMP, HATCH, KICK, GATE, DROP, ...CLICKS, FIRE, TOUCH]

/* ------------------------------------------------------------------ the ring */

const MODULES = 12
const SLOT = TAU / MODULES
const HUB = 0.34
const MOD_IN = 1.62
/** The corridor round the rim: its floor is on the outside, where the spin holds things down. */
const COR_OUT = 2.37
const COR_IN = COR_OUT - 0.34
/** The tube between modules: its inner skin, and the hull outside the floor. */
const TUBE_IN = COR_IN - 0.06
const HULL = 2.45
/** A module stands a little proud of the tube, in and out. */
const MOD_OUT = 2.52
/** Half a module's length, as an angle. */
const MOD_HALF = 0.19
/** Spokes to modules 1, 4, 7, 10: the port (module 0) and the catapult's (module 10) are clear of them on the outside. */
const SPOKES = [1, 4, 7, 10]
/** Where the ball's centre is held in the jaws, outside module 0's face, and where it rolls on the corridor floor. */
const SEAT = MOD_OUT + R + 0.01
const RUN_R = COR_OUT - R
/** 15° a beat, counterclockwise on the screen (the angle falls). */
const OMEGA = Math.PI / 12 / 0.625
/** The run: a module a beat, ahead of the ring. */
const RHO = Math.PI / 6 / 0.625
const V_RIM = SEAT * OMEGA
/** Where the sun is, seen from the ring's centre: low on the left. */
const SUN = (150 * Math.PI) / 180
/** Seconds to be drawn in through the hatch, and to fall through the trapdoor into the cup. */
const D_IN = 0.24
const D_DROP = 0.16

/* ------------------------------------------------------------------ Brand */

/** Two balls touching, centre to centre (a hair over two radii). */
const GAP = 2 * R + 0.01
/** She comes in through the hatch a moment after him, and takes a little longer about it. */
const IN_LAG = 0.06
const IN_DUR = 0.48
/** On the corridor floor she rests at his back. */
const PSI_IN = GAP / RUN_R
/** Her eighth: she passes the bulkhead lamp on the and after him. */
const GATE2 = beat(159.5)
/** Too late: she hops the last of the way and comes down on the shut trapdoor on the and, stops there a beat, and runs on. */
const HOP = beat(160.1)
const KNOCK = beat(160.5)
const ON = beat(161.5)
const HOP_H = 0.08
/** How nearly she stops on the door: 1 would be dead still. */
const STILL = 0.93

/** The catapult: an arm lying forward along a module's face from a pivot behind, a cup at its end. */
const ARM = 0.56
const PIVOT_R = MOD_OUT + 0.07
/** The ball's centre off the arm, on its outward side. */
const CUP_OFF = R + 0.05
/** The arm's lift off the face (radians): as it catches, notched down by the clicks, and where it stops on the throw. */
const ARM_CATCH = 0.36
const SWING = 0.13
const ARM_STOP = 0.6

/* ------------------------------------------------------------------ the mass driver */

/** From the cradle, the ball is let go at rest and runs up the rail, evenly faster, to the muzzle. */
const RAIL_TIME = MUZZLE - CATCH
/** The lob to the port: the rising half of one. */
const LOB = CLAMP - MUZZLE
/** Half the rail's channel: the ball runs between two rails this far either side. */
const CH = 0.19

/* ------------------------------------------------------------------ the sphere and the planet */

const RS = 1.2
const PLANET_R = 0.4

/** The speed the fairing gives the ball. */
const V_IN = 1.4

interface Flight {
  r0: number
  vr0: number
  b: number
  c: number
  phi0: number
  w0: number
  swing: number
  dur: number
}

interface EnduranceState {
  begin: number
  /** The cradle at the breech: where the ball is caught. */
  cup: Pt
  /** Up the rail. */
  dir: Pt
  rail: number
  /** The ring's centre. */
  c: Pt
  sphere: Pt
  planet: Pt
  flight: Flight
  /** Show time the ball goes out of sight inside the sphere. */
  hide: number
}

/* ------------------------------------------------------------------ motion */

/** The port's angle about the ring's centre at show time `T`: at the bottom on the clamp. */
function portAngle(T: number): number {
  const since = T - CLAMP
  const shudder = since > 0 ? 0.005 * Math.exp(-since / 0.3) * Math.sin(since * 16) : 0
  return Math.PI / 2 + OMEGA * (CLAMP - T) + shudder
}

/** A point of the ring, `out` from its centre at `rel` radians from the port, at show time `T`. */
function ringPt(c: Pt, T: number, rel: number, out: number): Pt {
  const a = portAngle(T) + rel
  return [c[0] + Math.cos(a) * out, c[1] + Math.sin(a) * out]
}

/** The ring's local axes at `rel` from the port: outward, and forward (the way it turns). */
function axes(T: number, rel: number): { ox: number; oy: number; fx: number; fy: number } {
  const a = portAngle(T) + rel
  return { ox: Math.cos(a), oy: Math.sin(a), fx: Math.sin(a), fy: -Math.cos(a) }
}

/** On the ring, from the clamp to the cup: where the ball is relative to the port (radians, negative is ahead), and how far out. */
function onRing(T: number): { psi: number; r: number } {
  let psi = 0
  const fall = DROP - D_DROP
  if (T > KICK) {
    psi -= RHO * (Math.min(T, fall) - KICK)
    if (T > fall) {
      const u = Math.min(T - fall, D_DROP)
      psi -= RHO * (u - (u * u) / (2 * D_DROP))
    }
  }
  let r = SEAT - 0.02 * smooth(T, CLAMP, CLAMP + 0.12)
  if (T > HATCH) {
    const u = Math.min(1, (T - HATCH) / D_IN)
    r = r + (RUN_R - r) * (u * u * (3 - 2 * u))
  }
  if (T > fall) {
    const u = Math.min(1, (T - fall) / D_DROP)
    r = RUN_R + (CATCH_R - RUN_R) * u * u
  }
  return { psi, r }
}

/** Where the catapult's cup catches: on the line out from the trapdoor. */
const PSI_CUP = -RHO * (DROP - D_DROP - KICK) - (RHO * D_DROP) / 2
/** How far out the caught ball sits: the pivot's height, plus the arm's lift and the cup's offset at the catch. */
const CATCH_R = PIVOT_R + ARM * Math.sin(ARM_CATCH) + CUP_OFF * Math.cos(ARM_CATCH)
/** The pivot, behind the catch by the arm's reach along the face. */
const PSI_PIVOT = PSI_CUP + (ARM * Math.cos(ARM_CATCH) - CUP_OFF * Math.sin(ARM_CATCH)) / PIVOT_R

/** The catapult arm's lift off the face at show time `T`. */
/** When each notch's fall starts, so that it lands on its click. */
const FALLS = CLICKS.map((t) => t - 0.05)
function armAt(T: number): number {
  // Against its stop on the throw, the arm shudders and settles: slower than the throw itself.
  if (T >= FIRE) return ARM_STOP + 0.06 * Math.exp(-(T - FIRE) / 0.18) * Math.sin((T - FIRE) * 20)
  if (T > FIRE - SWING) {
    const u = (T - (FIRE - SWING)) / SWING
    return u * u * ARM_STOP
  }
  // Each click lets it fall a notch (quick, onto the pawl: it lands on the click), and it bounces once off the pawl.
  const fall = 0.05
  const { i, ago } = lastOf(FALLS, T)
  const f = i >= 0 ? Math.min(1, ago / fall) ** 2 : 0
  const k = ago - fall
  const bounce = i >= 0 && k > 0 ? 0.03 * Math.exp(-k / 0.12) * Math.sin(k * 20) : 0
  return ARM_CATCH * (1 - (i + f) / CLICKS.length) + bounce
}

/** The catapult at show time `T`: its pivot, the arm's tip, and the ball's centre in the cup. */
function catapult(c: Pt, T: number): { pivot: Pt; tip: Pt; ball: Pt; dx: number; dy: number; nx: number; ny: number } {
  const pivot = ringPt(c, T, PSI_PIVOT, PIVOT_R)
  const ax = axes(T, PSI_PIVOT)
  const lift = armAt(T)
  const dx = ax.fx * Math.cos(lift) + ax.ox * Math.sin(lift)
  const dy = ax.fy * Math.cos(lift) + ax.oy * Math.sin(lift)
  const nx = -ax.fx * Math.sin(lift) + ax.ox * Math.cos(lift)
  const ny = -ax.fy * Math.sin(lift) + ax.oy * Math.cos(lift)
  const tip: Pt = [pivot[0] + dx * ARM, pivot[1] + dy * ARM]
  return { pivot, tip, ball: [tip[0] + nx * CUP_OFF, tip[1] + ny * CUP_OFF], dx, dy, nx, ny }
}

/** The ball on the ring at show time `T` (between the clamp and the throw). */
function ringBall(c: Pt, T: number): Pt {
  if (T < DROP) {
    const { psi, r } = onRing(T)
    return ringPt(c, T, psi, r)
  }
  // In the cup: it came down onto it at the catch, sinks into it a little (the cup gives), and rides it from there.
  const held = catapult(c, T).ball
  const u = smooth(T, DROP, DROP + 0.05)
  const fell = ringPt(c, T, PSI_CUP, CATCH_R)
  const k = T - DROP
  const give = 0.04 * Math.exp(-k / 0.14) * Math.sin(k * 22)
  const out = Math.hypot(held[0] - c[0], held[1] - c[1]) || 1
  return [fell[0] + (held[0] - fell[0]) * u + ((held[0] - c[0]) / out) * give, fell[1] + (held[1] - fell[1]) * u + ((held[1] - c[1]) / out) * give]
}

/* ------------------------------------------------------------------ her, on the ring */

/** Her pace off the kick, as a share of his: what puts her past the lamp an eighth after him (and on the door on 160½). */
const F_RUN = (PSI_IN + RHO * (GATE - KICK)) / (RHO * (GATE2 - KICK))
/** The smoothstep's integral, 0..1 → 0..½. */
const ramp = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v - (v * v * v * v) / 2
}
/** How long she has been stopped on the door by `T` (seconds of her pace lost): she stops as she lands, and goes on from ON. */
function stopped(T: number): number {
  const a = KNOCK
  const b = KNOCK + 0.12
  const c = ON
  const d = ON + 0.5
  if (T <= a) return 0
  if (T <= b) return (b - a) * ramp((T - a) / (b - a))
  if (T <= c) return (b - a) / 2 + (T - b)
  // Easing back into her pace, and from then on no more lost: going at his old pace again.
  return (b - a) / 2 + (c - b) + (Math.min(T, d) - c) - (d - c) * ramp((T - c) / (d - c))
}

/**
 * Her way in through the hatch, 0..1: up the hatch under him while he goes in, and rolled round his back onto the
 * floor, in one move: she closes on him and swings round him together, so she never stops between the two.
 */
function herIn(v: number): { psi: number; r: number } {
  const u = Math.max(0, Math.min(1, v))
  // Smoother than a smoothstep: no kick in the acceleration either, at either end.
  const soft = (x: number, a: number, b: number): number => {
    const w = Math.max(0, Math.min(1, (x - a) / (b - a)))
    return w * w * w * (10 - 15 * w + 6 * w * w)
  }
  const far = SEAT - 0.02 - RUN_R
  const d = GAP + far * (1 - soft(u, 0, 0.75))
  const th = (Math.PI / 2) * soft(u, 0.2, 1)
  return { psi: (d * Math.sin(th)) / RUN_R, r: RUN_R + d * Math.cos(th) }
}

/** Where she is on the ring at show time `T`, from the clamp on: her angle from the port, and how far out. */
function herRing(T: number): { psi: number; r: number } {
  if (T < HATCH + IN_LAG) return { psi: 0, r: SEAT + GAP - 0.02 * smooth(T, CLAMP, CLAMP + 0.12) }
  if (T < KICK) return herIn((T - HATCH - IN_LAG) / IN_DUR)
  // The hop: up off the floor and down onto the door on the and, eased at both ends (a low-g hop, no kick).
  const w = (T - HOP) / (KNOCK - HOP)
  const hop = w > 0 && w < 1 ? HOP_H * Math.sin(Math.PI * w) ** 2 : 0
  // When she goes on, it is at his old pace, a module a beat.
  const on = T <= ON ? 0 : 0.5 * ramp((T - ON) / 0.5) + Math.max(0, T - ON - 0.5)
  return { psi: PSI_IN - RHO * F_RUN * (T - KICK - STILL * stopped(T)) - RHO * (1 - F_RUN) * on, r: RUN_R - hop }
}

/** The kicker: a paddle standing on the corridor floor at her back, cocked, that snaps up into her on 158. */
const KICK_PSI = PSI_IN + 0.2 / COR_OUT
const PADDLE = 0.3
const COCKED = -0.95
/** Where the paddle meets her: the lean at which its face is a ball's radius (and its own half-width) from her centre. */
const STRIKE = (() => {
  const u = 0.2 * (RUN_R / COR_OUT)
  const v = COR_OUT - RUN_R
  let b = 0
  while (b < 1 && u * Math.cos(b) - v * Math.sin(b) > R + 0.03) b += 0.001
  return b
})()
function paddleAt(T: number): number {
  if (T < KICK - 0.09) return COCKED
  if (T < KICK) {
    const u = (T - (KICK - 0.09)) / 0.09
    return COCKED + (STRIKE - COCKED) * u * u
  }
  // Through, a touch past where it met her, and slowly back down to cocked.
  const through = STRIKE + 0.14 * (1 - Math.exp(-(T - KICK) / 0.05))
  return through + (COCKED - through) * smooth(T, KICK + 0.3, KICK + 1.1)
}

/** After the throw: about the sphere, the radius closes (a cubic) while the angle swings on. */
function flightAt(sphere: Pt, fl: Flight, tau: number): Pt {
  const u = Math.max(0, Math.min(fl.dur, tau))
  const r = Math.max(0, fl.r0 + fl.vr0 * u + fl.b * u * u + fl.c * u * u * u)
  const phi = fl.phi0 + fl.w0 * u + fl.swing * (u / fl.dur) ** 3
  return [sphere[0] + Math.cos(phi) * r, sphere[1] + Math.sin(phi) * r]
}

/* ------------------------------------------------------------------ the part */

export const endurance = part<EnduranceState>(
  {
    name: 'endurance',
    flight: true,
    draw: (p, s, c) => {
      const T = c.t + s.begin
      // Saturn is on this side of the wormhole only: it goes as the camera whips through to Miller's sky.
      const here = 1 - smooth(T, END - 0.05, END + 0.15)
      if (here > 0.004) {
        const ctx = p.drawingContext as CanvasRenderingContext2D
        ctx.save()
        ctx.globalAlpha *= here
        drawPlanet(p, s, c)
        ctx.restore()
      }
      drawSphere(p, s, c, T)
      drawDriver(p, s, c, T)
      drawRing(p, s, c, T)
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      drawDriverOver(p, s, c, T)
      drawJaws(p, s, c, T)
      drawCatapult(p, s, c, T)
      drawSphereOver(p, s, c, T)
    },
  },
  (slot) => {
    const rel = (T: number) => T - slot.begin
    // The drift: straight on at the fairing's pace, into the cradle.
    const drift = (t: number): Pt => [-0.5 + V_IN * t, 0]
    const cup = drift(rel(CATCH))
    // Out of the muzzle: sideways at the rim's speed, up at what takes a lob exactly to its top at the clamp.
    const vm: Pt = [V_RIM, -G_LOW * LOB]
    const speed = Math.hypot(vm[0], vm[1])
    const dir: Pt = [vm[0] / speed, vm[1] / speed]
    const railLen = (speed * RAIL_TIME) / 2
    const acc = speed / RAIL_TIME
    const muzzle: Pt = [cup[0] + dir[0] * railLen, cup[1] + dir[1] * railLen]
    const top: Pt = [muzzle[0] + vm[0] * LOB, muzzle[1] + vm[1] * LOB + 0.5 * G_LOW * LOB * LOB]
    const c: Pt = [top[0], top[1] - SEAT]

    // The throw: where it leaves the cup, and how fast (the cup's own motion as the arm hits its stop).
    const pf = catapult(c, FIRE).ball
    const pb = catapult(c, FIRE - 1e-4).ball
    const vf: Pt = [(pf[0] - pb[0]) / 1e-4, (pf[1] - pb[1]) / 1e-4]
    // The sphere: ahead of the throw and a little to its right, so its pull bends the path in.
    const vlen = Math.hypot(vf[0], vf[1])
    const head = Math.atan2(vf[1], vf[0]) + 0.3
    const reach = vlen * 0.62 + RS
    const sphere: Pt = [pf[0] + Math.cos(head) * reach, pf[1] + Math.sin(head) * reach]
    const planet: Pt = [sphere[0] + 3.4, sphere[1] - 1.7]
    const dx = pf[0] - sphere[0]
    const dy = pf[1] - sphere[1]
    const r0 = Math.hypot(dx, dy)
    const phi0 = Math.atan2(dy, dx)
    const vr0 = (vf[0] * dx + vf[1] * dy) / r0
    const vt0 = (-vf[0] * dy + vf[1] * dx) / r0
    const dur = END - FIRE
    const dt = TOUCH - FIRE
    // r(u) = r0 + vr0 u + b u² + c u³, through RS at the touch and 0 at the end.
    const e1 = RS - r0 - vr0 * dt
    const e2 = -r0 - vr0 * dur
    const cc = (e2 - (e1 * dur * dur) / (dt * dt)) / (dur ** 3 - dt * dur * dur)
    const bb = (e1 - cc * dt ** 3) / (dt * dt)
    const flight: Flight = { r0, vr0, b: bb, c: cc, phi0, w0: vt0 / r0, swing: 0.5, dur }

    // Out of sight once it is wholly inside the edge.
    let lo = TOUCH
    let hi = END
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      const [x, y] = flightAt(sphere, flight, mid - FIRE)
      if (Math.hypot(x - sphere[0], y - sphere[1]) > RS - 1.1 * R) lo = mid
      else hi = mid
    }
    const hide = hi

    const state: EnduranceState = { begin: slot.begin, cup, dir, rail: railLen, c, sphere, planet, flight, hide }
    const rail = (t: number): Pt => {
      const u = t + slot.begin - CATCH
      const d = 0.5 * acc * u * u
      return [cup[0] + dir[0] * d, cup[1] + dir[1] * d]
    }
    const lob = (t: number): Pt => {
      const u = t + slot.begin - MUZZLE
      return [muzzle[0] + vm[0] * u, muzzle[1] + vm[1] * u + 0.5 * G_LOW * u * u]
    }
    const ring = (t: number) => ringBall(c, t + slot.begin)
    const fly = (t: number) => flightAt(sphere, flight, t + slot.begin - FIRE)
    // Brand, at his back: behind him up the rail, and under him in the jaws.
    const back: Pt = [-dir[0] * GAP, -dir[1] * GAP]
    const under: Pt = [0, GAP]
    const gold = (T: number): Companion | null => {
      let h: Pt
      let o: Pt
      if (T < CATCH) {
        h = drift(rel(T))
        o = brandDrift(T, back)
      } else if (T < MUZZLE) {
        h = rail(rel(T))
        o = back
      } else if (T < CLAMP) {
        h = lob(rel(T))
        const u = smooth(T, MUZZLE, CLAMP)
        o = [back[0] + (under[0] - back[0]) * u, back[1] + (under[1] - back[1]) * u]
      } else {
        const { psi, r } = herRing(T)
        const [x, y] = ringPt(c, T, psi, r)
        return { x, y }
      }
      return { x: h[0] + o[0], y: h[1] + o[1] }
    }
    const segs = [
      ...carried(drift, 0, rel(CATCH), 16),
      ...carried(rail, rel(CATCH), rel(MUZZLE), 48),
      ...carried(lob, rel(MUZZLE), rel(CLAMP), 30),
      ...carried(ring, rel(CLAMP), rel(FIRE), Math.ceil((FIRE - CLAMP) * 60)),
      ...carried(fly, rel(FIRE), rel(hide), Math.ceil((hide - FIRE) * 60)),
      ...carried(fly, rel(hide), rel(END), 12, true),
    ]
    const x0 = Math.min(-1, cup[0] - 1)
    const x1 = Math.max(c[0] + 4, planet[0] + 2, sphere[0] + 3)
    const y0 = Math.min(c[1] - 4, sphere[1] - 3, planet[1] - 2)
    return {
      cells: box(x0, y0, x1, 2),
      exit: [sphere[0] + 0.5, sphere[1]],
      lane: { segs, fire: rel(CATCH) },
      state,
      // Hers ends as the camera whips off through the sphere, once she has run out of the frame round the ring.
      company: [{ from: slot.begin, to: END + 0.1, at: gold }],
    }
  },
  (slot, built) => {
    const { c, cup, sphere } = built.state
    return [
      // Handed over from the rocket as it was; then down onto the driver, with the ring's underside coming in over it.
      { t: slot.begin, cells: 6.2, off: [0.8, 0] },
      { t: beat(151), cells: 6.4, hold: [cup[0] + 0.2, cup[1] - 1.5], w: 0.85 },
      { t: beat(153.5), cells: 7.4, hold: [c[0] - 0.6, c[1] + 3.3], w: 0.85 },
      // The ring whole as the ball comes up at it; in a little for the clamp.
      { t: beat(155.2), cells: 8.2, hold: [c[0], c[1] + 1.1], w: 0.9 },
      { t: beat(156), cells: 6.6, hold: [c[0] + 0.05, c[1] + 1.5], w: 0.9 },
      // In on the two of them at the airlock and the kick, low on the right.
      { t: beat(157), cells: 4.8, hold: [c[0] + 0.62, c[1] + 2.1], w: 0.9 },
      { t: beat(158), cells: 4.8, hold: [c[0] + 1.15, c[1] + 1.8], w: 0.85 },
      // Then with them up the side, closer: the trapdoor takes him and shuts, and the frame stays a beat on her.
      { t: beat(159), cells: 4.3, off: [-0.25, 0.1], w: 0 },
      { t: beat(160), cells: 3.6, off: [-0.3, 0.2], w: 0 },
      { t: beat(161), cells: 3.5, off: [-0.35, 0.15], w: 0 },
      { t: beat(161.5), cells: 3.8, off: [-0.4, 0.05], w: 0 },
      // Over the top with the catapult, the sphere waiting in the frame; out for the throw.
      { t: beat(163), cells: 7.2, hold: [c[0] + 1.4, c[1] - 2.2], w: 0.9 },
      { t: FIRE + 0.2, cells: 7.4, hold: [(c[0] + sphere[0]) / 2 + 0.4, sphere[1] + 0.5], w: 0.9 },
      // On the sphere as he goes in; from here the whip to the far side is one long move (Miller's first key is its end).
      { t: END - 0.36, cells: 7, hold: sphere, w: 1 },
    ]
  },
)

/* ------------------------------------------------------------------ small helpers */

/** An annulus sector: the shape of a module, a length of corridor. */
function sector(p: p5, k: number, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, n = 6): void {
  p.beginShape()
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    p.vertex((cx + Math.cos(a) * r1) * k, (cy + Math.sin(a) * r1) * k)
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n
    p.vertex((cx + Math.cos(a) * r0) * k, (cy + Math.sin(a) * r0) * k)
  }
  p.endShape(p.CLOSE)
}

/** 1 on the sunlit half, 0 in the ring's night: a module crosses the line every second beat. */
const litAt = (a: number) => smooth(Math.cos(a - SUN), -0.012, 0.012)

const mixCol = (p: p5, a: string, b: string, f: number): p5.Color => p.lerpColor(p.color(a), p.color(b), Math.max(0, Math.min(1, f)))

function glow(p: p5, x: number, y: number, r: number, rgb: string, a: number): void {
  if (a <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb}, ${Math.min(1, a)})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

const AMBER_RGB = '240, 147, 64'
const ICE_RGB = '143, 198, 230'
const BONE_RGB = '236, 229, 211'
/** The ball's colour as r, g, b, for gradients. */
const BALL_RGB = [1, 3, 5].map((i) => parseInt(BALL.slice(i, i + 2), 16)).join(', ')

/** A thick stroke with an ink edge: a finger, an arm. */
function bar(p: p5, ink: string, weight: number, fill: string, w: number, pts: [number, number][]): void {
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

/** A lamp: a small disc, lit or not, with its glow. */
function lamp(p: p5, c: Ctx, x: number, y: number, on: number, fill: string, rgb: string, size = 0.08): void {
  const { k, ink, weight } = c
  glow(p, x * k, y * k, k * (0.12 + 0.2 * Math.min(1, on)), rgb, 0.75 * on)
  solid(p, ink, weight * 0.5, on > 0.35 ? fill : DARK.slate)
  p.circle(x * k, y * k, k * size)
}

/* ------------------------------------------------------------------ drawing: the mass driver */

/** The driver's own frame: `d` up the rail from the cradle, `side` across it (positive is the spine's side, down and right). */
function driverFrame(s: EnduranceState, k: number) {
  const [dx, dy] = s.dir
  const nx = -dy
  const ny = dx
  return (d: number, side: number): [number, number] => [(s.cup[0] + dx * d + nx * side) * k, (s.cup[1] + dy * d + ny * side) * k]
}

/** Where the coils stand along the rail: where the ball is on each eighth, so their spacing is its speed. */
function coilSpots(s: EnduranceState): number[] {
  const acc = (2 * s.rail) / (RAIL_TIME * RAIL_TIME)
  return [...COILS, MUZZLE].map((t) => 0.5 * acc * (t - CATCH) ** 2)
}

function quad(p: p5, at: (d: number, side: number) => [number, number], pts: Pt[]): void {
  p.beginShape()
  for (const [d, side] of pts) p.vertex(...at(d, side))
  p.endShape(p.CLOSE)
}

function drawDriver(p: p5, s: EnduranceState, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const at = driverFrame(s, k)
  const end = s.rail + 0.12
  // A solar wing off the spine's back, edge-on and dark, ruled into cells.
  solid(p, ink, weight * 0.6, DARK.deep)
  quad(p, at, [[0.35, CH + 0.16], [1.45, CH + 0.16], [1.45, CH + 0.62], [0.35, CH + 0.62]])
  outline(p, ink, weight * 0.4)
  for (const d of [0.62, 0.9, 1.18]) p.line(...at(d, CH + 0.16), ...at(d, CH + 0.62))
  // The spine: a beam along the rail's back, from the cradle to the muzzle.
  const foot = -GAP
  solid(p, ink, weight * 0.9, DARK.slate)
  quad(p, at, [[foot - 0.26, CH], [end, CH], [end, CH + 0.16], [foot - 0.26, CH + 0.16]])
  // The channel between the rails, dark, and the rails: the near one starts above the cradle's mouth.
  p.noStroke()
  p.fill(alpha(p, DARK.deep, 0.85))
  quad(p, at, [[foot - 0.2, -CH], [end, -CH], [end, CH], [foot - 0.2, CH]])
  outline(p, ink, weight)
  p.line(...at(foot - 0.2, CH), ...at(end, CH))
  p.line(...at(0.3, -CH), ...at(end, -CH))
  // The cradle: a stop across the rail's foot, room for two above it; they come in under the near rail.
  solid(p, ink, weight * 0.8, DARK.hull)
  quad(p, at, [[foot - 0.26, -CH - 0.02], [foot - 0.16, -CH - 0.02], [foot - 0.16, CH + 0.02], [foot - 0.26, CH + 0.02]])
  // The coils: gold bands round the channel. Their backs here; the straps across the front go over the ball.
  const coils = coilSpots(s)
  const times = [...COILS, MUZZLE]
  for (let i = 0; i < coils.length; i++) {
    const d = coils[i]
    const hit = knock(T - times[i], 0.18)
    const w = i === coils.length - 1 ? 0.1 : 0.065
    const out = i === coils.length - 1 ? 0.36 : 0.31
    if (hit > 0.02) glow(p, ...at(d, 0), k * (0.5 + 0.2 * hit), AMBER_RGB, 0.85 * hit)
    solid(p, ink, weight * 0.8, hit > 0.3 ? DARK.amber : DARK.gold)
    quad(p, at, [[d - w, -out], [d + w, -out], [d + w, out], [d - w, out]])
    p.noStroke()
    p.fill(alpha(p, DARK.deep, 0.9))
    quad(p, at, [[d - w + 0.02, -CH + 0.02], [d + w - 0.02, -CH + 0.02], [d + w - 0.02, CH - 0.02], [d - w + 0.02, CH - 0.02]])
  }
}

/** The fronts of the coils, and the beacon, over the ball. */
function drawDriverOver(p: p5, s: EnduranceState, c: Ctx, T: number): void {
  const { k } = c
  const at = driverFrame(s, k)
  const coils = coilSpots(s)
  const times = [...COILS, MUZZLE]
  for (let i = 0; i < coils.length; i++) {
    const d = coils[i]
    const hit = knock(T - times[i], 0.18)
    p.stroke(alpha(p, hit > 0.3 ? DARK.amber : DARK.gold, 0.6 + 0.35 * hit))
    p.strokeWeight(Math.max(1, k * 0.035))
    p.line(...at(d, -CH), ...at(d, CH))
  }
  // The beacon at the cradle's mouth: a blink a beat to call the ball in, and a flash as it takes it.
  const { ago } = lastOf(BEACON, T)
  const hit = knock(T - CATCH, 0.2)
  const on = T < CATCH ? 0.25 + 0.9 * Math.exp(-ago / 0.18) : 0.15 + hit
  const [bx, by] = at(0.3, -CH - 0.07)
  lamp(p, c, bx / k, by / k, on, DARK.ice, ICE_RGB)
}

/* ------------------------------------------------------------------ drawing: the ring */

function drawRing(p: p5, s: EnduranceState, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const [cx, cy] = s.c
  const X = (v: number) => v * k
  const th = portAngle(T)
  const fill = (a: number, dim = 0) => mixCol(p, DARK.slate, DARK.hull, litAt(a) * (1 - dim)) as unknown as string

  // Spokes, thin, to the modules' inner faces.
  for (const i of SPOKES) {
    const a = th + i * SLOT
    const w = 0.045
    const nx = -Math.sin(a) * w
    const ny = Math.cos(a) * w
    solid(p, ink, weight * 0.6, fill(a, 0.15))
    p.beginShape()
    p.vertex(X(cx + Math.cos(a) * (HUB - 0.04) + nx), X(cy + Math.sin(a) * (HUB - 0.04) + ny))
    p.vertex(X(cx + Math.cos(a) * (MOD_IN + 0.02) + nx), X(cy + Math.sin(a) * (MOD_IN + 0.02) + ny))
    p.vertex(X(cx + Math.cos(a) * (MOD_IN + 0.02) - nx), X(cy + Math.sin(a) * (MOD_IN + 0.02) - ny))
    p.vertex(X(cx + Math.cos(a) * (HUB - 0.04) - nx), X(cy + Math.sin(a) * (HUB - 0.04) - ny))
    p.endShape(p.CLOSE)
  }

  // The tubes between modules.
  for (let i = 0; i < MODULES; i++) {
    const a0 = th + i * SLOT + MOD_HALF
    const a1 = th + (i + 1) * SLOT - MOD_HALF
    solid(p, ink, weight * 0.8, fill((a0 + a1) / 2, 0.18))
    sector(p, k, cx, cy, TUBE_IN, HULL, a0 - 0.01, a1 + 0.01, 3)
  }
  // The modules: sunlit bone or night slate; by night their windows are lit.
  for (let i = 0; i < MODULES; i++) {
    const a = th + i * SLOT
    const l = litAt(a)
    solid(p, ink, weight, fill(a))
    sector(p, k, cx, cy, MOD_IN, MOD_OUT, a - MOD_HALF, a + MOD_HALF, 5)
    p.noStroke()
    // By night the windows are lit, and brighten a little on every beat: the station keeping time.
    const pulse = knock(T - beat(Math.floor((T - beat(0)) / (beat(1) - beat(0)))), 0.22)
    p.fill(l > 0.5 ? alpha(p, DARK.slate, 0.8) : alpha(p, mixHex(DARK.amber, '#FFE3B0', 0.5 * pulse), (0.75 + 0.25 * pulse) * (1 - l)))
    for (const off of [-0.09, 0.09]) sector(p, k, cx, cy, MOD_IN + 0.13, MOD_IN + 0.22, a + off - 0.035, a + off + 0.035, 2)
  }
  // The corridor, cut away all round: a dark channel with the floor on the outside.
  p.noStroke()
  p.fill(DARK.deep)
  sector(p, k, cx, cy, COR_IN, COR_OUT, 0, TAU, 96)
  outline(p, ink, weight * 0.55)
  p.circle(X(cx), X(cy), X(COR_IN * 2))
  p.circle(X(cx), X(cy), X(COR_OUT * 2))
  // Bulkhead frames where the corridor passes into each module.
  p.stroke(alpha(p, ink, 0.45))
  for (let i = 0; i < MODULES; i++) {
    for (const e of [-MOD_HALF, MOD_HALF]) {
      const a = th + i * SLOT + e
      p.line(X(cx + Math.cos(a) * COR_IN), X(cy + Math.sin(a) * COR_IN), X(cx + Math.cos(a) * COR_OUT), X(cy + Math.sin(a) * COR_OUT))
    }
  }

  // The hub, half in the sun.
  const hx = X(cx)
  const hy = X(cy)
  solid(p, ink, weight, DARK.slate)
  p.circle(hx, hy, X(HUB * 2))
  p.noStroke()
  p.fill(DARK.hull)
  p.arc(hx, hy, X(HUB * 2) - weight, X(HUB * 2) - weight, SUN - Math.PI / 2, SUN + Math.PI / 2, p.PIE)
  outline(p, ink, weight * 0.8)
  p.circle(hx, hy, X(HUB * 2))
  solid(p, ink, weight * 0.6, DARK.deep)
  p.circle(hx, hy, X(0.3))

  // The airlock hatch in module 0's floor: slides open for the two on 157, shut again once she is in after him.
  const shut = HATCH + IN_LAG + IN_DUR
  const open = smooth(T, HATCH - 0.08, HATCH) * (1 - smooth(T, shut, shut + 0.12))
  hatch(p, c, s.c, T, PSI_IN * 0.3, open, 0.26)
  // The trapdoor over the catapult: opens as he comes, and slaps shut on 160, the moment he is through.
  const trap = smooth(T, DROP - D_DROP - 0.1, DROP - D_DROP) * (1 - smooth(T, DROP - 0.035, DROP))
  hatch(p, c, s.c, T, PSI_CUP, trap)
  // Where she comes down on it, too late: a knock off the shut leaves.
  const rap = T >= KNOCK ? knock(T - KNOCK, 0.12) : 0
  if (rap > 0.02) {
    const d = ringPt(s.c, T, PSI_CUP, COR_OUT)
    glow(p, X(d[0]), X(d[1]), X(0.3), BONE_RGB, 0.55 * rap)
  }

  // The kicker: a paddle on the corridor floor at her back, cocked; on 158 it snaps up into her, and she into him.
  const beta = paddleAt(T)
  const ka = axes(T, KICK_PSI)
  const kb = ringPt(s.c, T, KICK_PSI, COR_OUT - 0.01)
  const kt: Pt = [kb[0] + PADDLE * (-ka.ox * Math.cos(beta) + ka.fx * Math.sin(beta)), kb[1] + PADDLE * (-ka.oy * Math.cos(beta) + ka.fy * Math.sin(beta))]
  bar(p, ink, weight * 0.6, DARK.hull, X(0.05), [[X(kb[0]), X(kb[1])], [X(kt[0]), X(kt[1])]])
  solid(p, ink, weight * 0.5, DARK.slate)
  p.circle(X(kb[0]), X(kb[1]), X(0.07))
  // The knock: a spark where she meets him, the moment it goes through her.
  const kick = T >= KICK ? knock(T - KICK, 0.1) : 0
  if (kick > 0.02) {
    const now = ringPt(s.c, T, PSI_IN / 2, RUN_R)
    glow(p, X(now[0]), X(now[1]), X(0.4), BONE_RGB, 0.85 * kick)
  }

  // The bulkhead lamp the run passes on 159, a module on from the port, on the corridor's inner wall: his blink, and hers on the and.
  const g = ringPt(s.c, T, -RHO * (GATE - KICK), COR_IN - 0.02)
  lamp(p, c, g[0], g[1], 0.2 + Math.max(knock(T - GATE, 0.22), 0.75 * knock(T - GATE2, 0.22)), DARK.amber, AMBER_RGB, 0.075)

  // The port's lamp, beside the jaws: amber waiting (and bright as they open), ice while it holds the two.
  const pl = ringPt(s.c, T, -0.17, MOD_OUT + 0.05)
  const holding = T >= CLAMP && T < HATCH + 0.3
  const on = holding ? 0.6 + 0.6 * knock(T - CLAMP, 0.25) : T < CLAMP ? 0.25 + 0.9 * knock(T - READY, 0.25) : 0.15
  lamp(p, c, pl[0], pl[1], on, holding ? DARK.ice : DARK.amber, holding ? ICE_RGB : AMBER_RGB, 0.07)
}

/** A hatch in a module's floor at `rel` from the port: two leaves, `width` each, that slide apart as `open` goes to 1. */
function hatch(p: p5, c: Ctx, ctr: Pt, T: number, rel: number, open: number, width = 0.19): void {
  const { k, ink, weight } = c
  const a = portAngle(T) + rel
  const half = width / MOD_OUT
  if (open > 0.02) {
    // The opening, and the corridor's light spilling out of it.
    p.noStroke()
    p.fill(DARK.deep)
    sector(p, k, ctr[0], ctr[1], COR_OUT - 0.01, MOD_OUT + 0.01, a - half * open, a + half * open, 3)
    p.fill(alpha(p, DARK.amber, 0.55 * open))
    sector(p, k, ctr[0], ctr[1], COR_OUT - 0.01, MOD_OUT + 0.01, a - half * open, a + half * open, 3)
    const ox = ctr[0] + Math.cos(a) * (MOD_OUT + 0.05)
    const oy = ctr[1] + Math.sin(a) * (MOD_OUT + 0.05)
    glow(p, ox * k, oy * k, k * 0.45, AMBER_RGB, 0.45 * open)
  }
  // The leaves: heavy lines along the module's face either side of the opening.
  const slide = half * open
  outline(p, ink, weight * 1.5)
  for (const side of [-1, 1]) {
    const a0 = a + side * slide
    const a1 = a + side * (slide + half)
    p.arc(ctr[0] * k, ctr[1] * k, MOD_OUT * 2 * k, MOD_OUT * 2 * k, Math.min(a0, a1), Math.max(a0, a1))
  }
}

/** The jaws, in front of the two: long enough for both, one under the other. Folded flat, open wide on 155, shut on 156, open to let them in. */
function drawJaws(p: p5, s: EnduranceState, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const ax = axes(T, 0)
  const base = ringPt(s.c, T, 0, MOD_OUT - 0.01)
  let open = 1.45 - 0.85 * smooth(T, READY - 0.12, READY)
  if (T > CLAMP - 0.07) {
    const u = smooth(T, CLAMP - 0.07, CLAMP)
    const over = T > CLAMP ? -0.1 * Math.exp(-(T - CLAMP) / 0.16) * Math.sin((T - CLAMP) * 16) : 0
    open = 0.6 * (1 - u) + over
  }
  // They let go as she, the lower, starts up through the hatch, and draw back into the module once she is in.
  const letGo = HATCH + IN_LAG
  if (T > letGo) open = 1.62 * smooth(T, letGo, letGo + 0.3)
  const stow = 1 - smooth(T, letGo + 0.15, letGo + 0.5)
  if (stow <= 0.02) return
  const W = (along: number, out: number): [number, number] => [(base[0] + ax.ox * out + ax.fx * along) * k, (base[1] + ax.oy * out + ax.fy * along) * k]
  const reach = 0.02 + (0.18 + GAP) * stow
  for (const side of [-1, 1]) {
    const piv: Pt = [side * 0.21, 0.02]
    const pts: Pt[] = [
      [side * 0.21, 0.02],
      [side * 0.21, reach],
      [side * (0.21 - 0.11 * stow), reach + 0.12 * stow],
    ]
    const ang = side * open
    const rot = pts.map(([a, o]) => {
      const da = a - piv[0]
      const dO = o - piv[1]
      return W(piv[0] + da * Math.cos(ang) + dO * Math.sin(ang), piv[1] - da * Math.sin(ang) + dO * Math.cos(ang))
    })
    bar(p, ink, weight * 0.6, DARK.hull, k * 0.06, rot)
  }
}

/** The catapult: its mount, the ratchet at the pivot, the arm and the cup, over the ball; a breath of gas at the throw. */
function drawCatapult(p: p5, s: EnduranceState, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const { pivot, tip, ball, dx, dy, nx, ny } = catapult(s.c, T)
  const ax = axes(T, PSI_PIVOT)
  const foot = ringPt(s.c, T, PSI_PIVOT, MOD_OUT - 0.01)
  solid(p, ink, weight * 0.7, DARK.slate)
  p.beginShape()
  for (const [a, o] of [[-0.13, 0], [0.13, 0], [0.05, 0.08], [-0.05, 0.08]] as Pt[]) p.vertex(X(foot[0] + ax.fx * a + ax.ox * o), X(foot[1] + ax.fy * a + ax.oy * o))
  p.endShape(p.CLOSE)
  // The arm, then the cup at its end: a scoop round the ball's inner half, open on the side it throws to.
  bar(p, ink, weight * 0.6, DARK.hull, X(0.065), [[X(pivot[0]), X(pivot[1])], [X(tip[0]), X(tip[1])]])
  const pts: [number, number][] = []
  for (let j = 0; j <= 10; j++) {
    const a = ((170 + (200 * j) / 10) * Math.PI) / 180
    pts.push([X(ball[0] + (R + 0.045) * (Math.cos(a) * dx + Math.sin(a) * nx)), X(ball[1] + (R + 0.045) * (Math.cos(a) * dy + Math.sin(a) * ny))])
  }
  bar(p, ink, weight * 0.6, DARK.hull, X(0.05), pts)
  // The ratchet at the pivot: a gold wheel with a tooth that lights on each click.
  const { ago } = lastOf(CLICKS, T)
  const clicked = T < FIRE - SWING ? knock(ago, 0.14) : 0
  const fired = knock(T - FIRE, 0.2)
  glow(p, X(pivot[0]), X(pivot[1]), X(0.32), AMBER_RGB, 0.85 * Math.max(clicked, fired))
  solid(p, ink, weight * 0.6, clicked > 0.3 || fired > 0.3 ? DARK.amber : DARK.gold)
  p.circle(X(pivot[0]), X(pivot[1]), X(0.17))
  outline(p, ink, weight * 0.6)
  const turn = armAt(T) * 3
  for (let j = 0; j < 3; j++) {
    const a = turn + (j * TAU) / 3
    p.line(X(pivot[0]), X(pivot[1]), X(pivot[0] + Math.cos(a) * 0.075), X(pivot[1] + Math.sin(a) * 0.075))
  }
  // A breath of gas from the mount as it throws.
  const rel = T - FIRE
  if (rel >= 0 && rel < 1.0) {
    const u = rel / 1.0
    // Vapour, not a cloud: in the vacuum it spreads and thins, uninked.
    const gx = foot[0] + ax.ox * (0.2 + 0.3 * Math.sqrt(u)) + ax.fx * 0.25 * u
    const gy = foot[1] + ax.oy * (0.2 + 0.3 * Math.sqrt(u)) + ax.fy * 0.25 * u
    glow(p, X(gx), X(gy), X(0.08 + 0.2 * Math.sqrt(u)), BONE_RGB, 0.55 * (1 - u) ** 1.5)
  }
}

/* ------------------------------------------------------------------ drawing: the planet and the sphere */

function drawPlanet(p: p5, s: EnduranceState, c: Ctx): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [gx, gy] = s.planet
  const X = (v: number) => v * k
  const tilt = -0.32
  const ring = (a0: number, a1: number) => {
    ctx.save()
    ctx.translate(X(gx), X(gy))
    ctx.rotate(tilt)
    ctx.strokeStyle = `rgba(${BONE_RGB}, 0.5)`
    ctx.lineWidth = X(0.09)
    ctx.beginPath()
    ctx.ellipse(0, 0, X(PLANET_R * 2.1), X(PLANET_R * 0.48), 0, a0, a1)
    ctx.stroke()
    ctx.strokeStyle = ink
    ctx.lineWidth = weight * 0.5
    for (const f of [2.26, 1.93]) {
      ctx.beginPath()
      ctx.ellipse(0, 0, X(PLANET_R * f), X(PLANET_R * f * 0.228), 0, a0, a1)
      ctx.stroke()
    }
    ctx.restore()
  }
  ring(Math.PI, TAU)
  solid(p, ink, weight * 0.8, DARK.gold)
  p.circle(X(gx), X(gy), X(PLANET_R * 2))
  ctx.save()
  ctx.beginPath()
  ctx.arc(X(gx), X(gy), X(PLANET_R), 0, TAU)
  ctx.clip()
  p.noStroke()
  p.fill(alpha(p, DARK.amber, 0.55))
  for (const [o, h] of [[-0.18, 0.08], [0.05, 0.12], [0.26, 0.06]]) {
    ctx.save()
    ctx.translate(X(gx), X(gy))
    ctx.rotate(tilt)
    p.rect(0, X(o * PLANET_R * 2), X(PLANET_R * 2.2), X(h * PLANET_R * 2))
    ctx.restore()
  }
  p.fill(alpha(p, DARK.deep, 0.78))
  p.circle(X(gx + PLANET_R * 0.55), X(gy - PLANET_R * 0.2), X(PLANET_R * 2.1))
  ctx.restore()
  outline(p, ink, weight * 0.8)
  p.circle(X(gx), X(gy), X(PLANET_R * 2))
  ring(0, Math.PI)
}

/** Stars of the far side, as the sphere shows them: squeezed toward its edge, drawn out along it. */
function drawSphere(p: p5, s: EnduranceState, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const [sx, sy] = s.sphere
  const X = (v: number) => v * k
  glow(p, X(sx), X(sy), X(RS * 1.75), ICE_RGB, 0.2)
  ctx.save()
  ctx.beginPath()
  ctx.arc(X(sx), X(sy), X(RS), 0, TAU)
  ctx.clip()
  p.noStroke()
  p.fill(DARK.deep)
  p.circle(X(sx), X(sy), X(RS * 2))
  const shift = (f.cx - sx) * -0.08
  const turn = T * 0.03 + (f.cy - sy) * 0.02
  ctx.save()
  ctx.translate(X(sx + shift * 0.5), X(sy))
  ctx.rotate(-0.5 + turn)
  const band = ctx.createLinearGradient(0, X(-RS * 0.5), 0, X(RS * 0.5))
  band.addColorStop(0, 'rgba(110, 99, 201, 0)')
  band.addColorStop(0.5, 'rgba(110, 99, 201, 0.32)')
  band.addColorStop(1, 'rgba(110, 99, 201, 0)')
  ctx.fillStyle = band
  ctx.fillRect(X(-RS * 1.3), X(-RS * 0.5), X(RS * 2.6), X(RS))
  ctx.restore()
  for (let j = 0; j < 120; j++) {
    const rho = hash(j, 11) ** 0.38
    const a = hash(j, 12) * TAU + turn + shift * (1 - rho) * 0.6
    const r = RS * rho * 0.98
    const bright = 0.35 + 0.65 * hash(j, 13)
    const len = 0.02 + 0.5 * rho ** 8
    if (len < 0.06) {
      p.noStroke()
      p.fill(alpha(p, ink, bright * 0.85))
      p.circle(X(sx + Math.cos(a) * r), X(sy + Math.sin(a) * r), Math.max(1.2, X(0.025) * (0.6 + bright)))
    } else {
      p.noFill()
      p.stroke(alpha(p, ink, bright * 0.75))
      p.strokeWeight(Math.max(1, X(0.018)))
      p.arc(X(sx), X(sy), X(r * 2), X(r * 2), a, a + len)
    }
  }
  p.noFill()
  p.stroke(alpha(p, DARK.hull, 0.22))
  p.strokeWeight(X(0.07))
  p.arc(X(sx), X(sy), X(RS * 1.62), X(RS * 1.62), Math.PI * 1.08, Math.PI * 1.36)
  ctx.restore()
  p.noFill()
  p.stroke(DARK.hull)
  p.strokeWeight(weight * 1.1)
  p.circle(X(sx), X(sy), X(RS * 2))
}

/** In front of the ball: its image on the far edge, the rim it goes under, and the ring of it when it touches. */
function drawSphereOver(p: p5, s: EnduranceState, c: Ctx, T: number): void {
  if (T < FIRE || T > END + 1.2) return
  const { k, weight } = c
  const [sx, sy] = s.sphere
  const X = (v: number) => v * k
  const [bx, by] = flightAt(s.sphere, s.flight, T - FIRE)
  const dist = Math.hypot(bx - sx, by - sy)
  const face = Math.atan2(by - sy, bx - sx)
  p.noFill()
  if (T < TOUCH) {
    const u = smooth(T, FIRE, TOUCH)
    const len = 0.1 + 1.1 * u * u
    p.stroke(alpha(p, BALL, 0.85 * smooth(T, FIRE, FIRE + 0.15)))
    p.strokeWeight(X(0.05 + 0.03 * u))
    const back = face + Math.PI
    p.arc(X(sx), X(sy), X(RS * 1.9), X(RS * 1.9), back - len / 2, back + len / 2)
    const near = smooth(dist, RS + 0.9, RS + 0.1)
    if (near > 0) {
      const nl = 0.1 + 1.4 * near * near
      p.stroke(alpha(p, BALL, 0.7 * near))
      p.arc(X(sx), X(sy), X(RS * 1.9), X(RS * 1.9), face - nl / 2, face + nl / 2)
    }
  }
  if (dist < RS + R * 1.5 && T < s.hide + 0.1) {
    p.stroke(DARK.hull)
    p.strokeWeight(weight * 1.1)
    p.arc(X(sx), X(sy), X(RS * 2), X(RS * 2), face - 0.6, face + 0.6)
  }
  const since = T - TOUCH
  if (since >= 0 && since < 1.2) {
    // On the rim itself, fading: the rim lit, not a ring thrown off it.
    const u = since / 1.2
    p.stroke(alpha(p, BALL, 0.9 * (1 - u) ** 1.5))
    p.strokeWeight(X(0.07 * (1 - 0.6 * u)))
    p.circle(X(sx), X(sy), X(RS * 2))
    glow(p, X(sx), X(sy), X(RS * 1.6), BALL_RGB, 0.35 * (1 - u))
    if (T < END) {
      const q = Math.max(0.15, dist / RS)
      p.noStroke()
      p.fill(alpha(p, BALL, 0.9))
      p.circle(X(bx), X(by), X(2 * R * 0.7 * q))
    }
  }
}
