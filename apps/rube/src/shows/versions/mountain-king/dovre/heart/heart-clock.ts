import { R, type Pt } from '../../../../../parts'
import { beat, beatAt } from '../music'
import { PLAN } from '../seams'

/**
 * The mountain's heart: its clock, its geometry and its motion, in the gears part's own frame (the runaway part's
 * frame is this one moved 10 cells left: its entry is gears' exit). The drawing (`heart-set.ts`) and both lanes
 * (`gears.ts`, `runaway.ts`) read these, so Peer never slides off what carries him.
 *
 * The heart is one room at the bottom of the mountain: a gallery on the left under the drum's shaft, a pit with the
 * machine in it, a ledge on the right under the chimney. The machine, left to right:
 *
 *   the trip hammer: its tail on the gallery under the shaft, its head over the anvil in the pit; a cam over the tail
 *     presses the tail down, the head rises, the cam lets go and the head falls. Every 1 and 3: the oom.
 *   the furnace in the pit's back wall, and the stoker's bellows: a flare on every 2 and 4 (the cymbals): the pah.
 *   the flywheel, the room's great wheel, driven by a pinion the stoker shoves into its teeth (107.75).
 *   three pumps in a row (113.36): the trolls drain their mines with them, up a pipe to the rising main at the
 *     chimney's foot (the finale's collar); the great bellows a troll works beside them (118.72).
 *   the governor on the ledge, a diamond of arms and iron weights that opens as it spins (124.01), its yoke under
 *     the chimney; the pipe's safety valve beside it (129.11).
 *
 * The story on the fortissimo (the third statement, quarter 0.37 s down to 0.29 s):
 *
 *   101.95  he drops onto the hammer's tail (the fortissimo's downbeat): his weight knocks the catch out, and the
 *           head, cocked in the dark, falls at once
 *   102.32  the first blow, on the first crash of the cymbals: sparks into the furnace, which catches with a flare,
 *           and the tail flings him high; the stoker and the keeper wake, the lamps catch behind them
 *   103–106 the hammer bats him up on the blows (every 1 and 3 from 103.43), and at 106.30 flings him across the room
 *   107.75  he lands on the flywheel's rim as the pinion goes into its teeth: the flywheel lurches into motion
 *   107–112 carried up and over the top of the great wheel; 112.66 a tooth flicks him off its shoulder
 *   113.36  onto the first pump as the pumps start: from head to head, landing on 1 and 3, flung off on 2 and 4
 *   118.72  the great bellows: the furnace roars white, the strokes double, he is bounced higher, end to end
 *   124.01  back on the first head; the keeper throws the governor in; the head flings him onto its yoke (125.30)
 *   125–133 the governor spins up and lifts him toward the chimney, the yoke bucking under him on the blows
 *   129.11  the pipe's safety valve blows: the keeper sits on it; 131.58 it throws him off
 *   132.79  the governor's arms hit their stops; 133.09, 133.38 its weights fly off; 133.52 the yoke drops him
 *   133.67  the spindle snaps and topples; 134.25 its top comes down on the flywheel, which splits, as he lands
 *           straight down at the chimney's foot on the coda's first chord
 */

/* ------------------------------------------------------------------ the clock */

/** The gears part's slot and the runaway's (show seconds). */
export const T0 = PLAN.gears.begin
export const T1 = PLAN.runaway.begin
export const T2 = PLAN.runaway.end
/** Quarter note `k` of the tune (beat 192 is T0, the third statement's first note). */
export const kt = (k: number): number => beat(k)
/** The runaway part's frame, in gears' frame: its entry (-0.5, 0) is gears' exit less half a cell. */
export const RUN_DX = 10

/** The new mechanism on each phrase. */
export const WAKE = kt(192)
export const FLY = kt(208)
export const PISTONS = kt(224)
export const BELLOWS = kt(240)
export const GOVERNOR = kt(256)
export const VALVE_AT = kt(272)
/** The last blow (the bar line after the last phrase) and the break (the coda's first chord). */
export const LAST_BLOW = kt(288)
export const BREAK = T2

const range = (a: number, b: number, step: number): number[] => {
  const out: number[] = []
  for (let k = a; k <= b; k += step) out.push(k)
  return out
}
/**
 * The hammer's blows. The first is the fall his landing trips, on the third statement's first crash (beat 193, the
 * strongest onset of its first bar); the cam then takes over and strikes every 1 and 3 from bar 2 (beats 196 … 288).
 * Beat 194 has no blow: a weak onset, and too soon after the first for the cam to lift the head.
 */
export const OOM_K = [193, ...range(196, 288, 2)]
export const OOM = OOM_K.map(kt)
/** The furnace's flares, on every 2 and 4 (beats 193 … 287): the cymbals. The first is the first blow's: it catches. */
export const PAH_K = range(193, 287, 2)
export const PAH = PAH_K.map(kt)

/* ------------------------------------------------------------------ small maths */

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
export const ease = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
export const smoothstep = (t: number, a: number, b: number): number => ease((t - a) / (b - a))
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
/** The most recent of a sorted list at or before t, and how long ago. */
export function since(list: readonly number[], t: number): { i: number; ago: number } {
  let lo = -1
  let hi = list.length
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (list[mid] <= t) lo = mid
    else hi = mid
  }
  return { i: lo, ago: lo < 0 ? Infinity : t - list[lo] }
}
/** A struck thing's ring: 1 at the strike, a damped wobble after. */
export const ring = (ago: number, decay = 0.12, rate = 26): number => (ago < 0 || !Number.isFinite(ago) ? 0 : Math.exp(-ago / decay) * Math.cos(ago * rate))
/** A knock: 1 at the strike, decaying. */
export const knock = (ago: number, decay = 0.15): number => (ago < 0 || !Number.isFinite(ago) ? 0 : Math.exp(-ago / decay))
export const rot = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
export const polar = (c: Pt, r: number, a: number): Pt => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]

/* ------------------------------------------------------------------ the room */

/** Deck tops (the gallery, the ledge), the pit's floor, the walls and the ceiling. */
export const DECK = R
export const PIT = 2.55
export const GALLERY_LIP = 1.0
export const LEDGE_LIP = 12.3
export const WALL_L = -1.3
export const WALL_R = 15.25
export const CEIL = -6.15
/** The drum's shaft comes down through the ceiling here (its x span), and the chimney goes up here. */
export const SHAFT: [number, number] = [-1.5, 0.5]
export const CHIMNEY_X = 13.5
export const CHIMNEY_HALF = 0.62

/* ------------------------------------------------------------------ the hammer */

/**
 * The trip hammer: a timber helve on an iron trunnion, its tail on the gallery (under the shaft, where he lands), its
 * head over the anvil in the pit. Angle `phi` about the pivot: 0 is level; negative is head up (tail down).
 */
export const HAMMER = {
  pivot: [1.05, -0.45] as Pt,
  tail: 1.95,
  head: 2.2,
  thick: 0.18,
  headW: 0.64,
  headH: 0.54,
}
/** Where Peer sits along the helve when he lands (from the pivot; negative is the tail side). */
const D_ON = HAMMER.thick / 2 + R
/** The helve's angle with its head raised (cocked), from where he lands: his centre on the tail at (-0.5, 0). */
export const PHI_UP = (() => {
  // His centre is D_ON off the helve's centreline along its upper normal n = (sin φ, -cos φ): Q·n = D_ON.
  const Q: Pt = [-0.5 - HAMMER.pivot[0], 0 - HAMMER.pivot[1]]
  const f = (phi: number) => Q[0] * Math.sin(phi) - Q[1] * Math.cos(phi) - D_ON
  let lo = -0.9
  let hi = 0
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (f(lo) * f(mid) <= 0) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
})()
/** Along the helve where he sits when he lands (negative: the tail side). */
export const S_LAND = (() => {
  const Q: Pt = [-0.5 - HAMMER.pivot[0], 0 - HAMMER.pivot[1]]
  return Q[0] * Math.cos(PHI_UP) + Q[1] * Math.sin(PHI_UP)
})()
/** The helve's angle with the head on the anvil. */
export const PHI_DOWN = 0.1
/** The head's fall, seconds: quick and heavy. */
const FALL = 0.2
/** How long after he lands the catch lets go (his weight jars it out): the first fall runs from then to the first blow. */
const TRIP = 0.05

/** A point along the helve (distance `s` from the pivot) and `h` above its centreline, at angle phi. */
export function onHelve(phi: number, s: number, h = 0): Pt {
  const [px, py] = HAMMER.pivot
  return [px + s * Math.cos(phi) + h * Math.sin(phi), py + s * Math.sin(phi) - h * Math.cos(phi)]
}
/** Where Peer's centre is when he sits `s` along the helve at angle phi. */
export const onTail = (phi: number, s: number): Pt => onHelve(phi, s, D_ON)

/** The anvil's face: under the head's striking face when the helve is down. */
export const ANVIL: Pt = onHelve(PHI_DOWN, HAMMER.head, -(HAMMER.thick / 2 + HAMMER.headH))

/**
 * The helve's angle at show time T. Cocked (head up) and still until he lands; the catch lets go and the head falls
 * onto the first blow; after each blow a short rebound, the cam presses the tail down again (the head rises), holds,
 * and lets it fall onto the next blow. After the last blow it lies on the anvil.
 */
export function hammerPhi(T: number): number {
  const { i, ago } = since(OOM, T)
  const next = OOM[i + 1]
  if (i < 0) {
    // Armed in the dark; his landing jars it (the tail gives under him) and knocks the catch out: the head falls
    // from rest, heavy, onto the first blow.
    const a = T - T0
    const jar = a >= 0 ? 0.04 * Math.exp(-a / 0.1) * Math.sin(a * 24) : 0
    const u = clamp01((T - (T0 + TRIP)) / (OOM[0] - T0 - TRIP))
    return PHI_UP - jar + (PHI_DOWN - PHI_UP) * u * u
  }
  // After blow i: a rebound off the anvil, then the lift (the cam), a hold, the fall onto blow i + 1.
  const rebound = 0.07 * Math.exp(-ago / 0.045) * Math.abs(Math.sin(ago * 38))
  if (next === undefined || T >= BREAK) return PHI_DOWN - rebound
  const liftFrom = OOM[i] + 0.07
  const liftTo = next - FALL - 0.035
  if (T < liftFrom) return PHI_DOWN - rebound
  if (T < liftTo) return PHI_DOWN + (PHI_UP - PHI_DOWN) * ease((T - liftFrom) / (liftTo - liftFrom)) - rebound
  if (T < next - FALL) return PHI_UP
  const u = clamp01((T - (next - FALL)) / FALL)
  return PHI_UP + (PHI_DOWN - PHI_UP) * u * u
}

/** The cam over the tail, on the hammer's frame: its axle, its base radius and its nose. One turn a blow. */
export const CAM = { at: [0.45, -1.05] as Pt, base: 0.27, nose: 0.62 }
/** The cam's angle: still until the first blow; a turn per blow after, its nose down on the tail as the head rises. */
export function camAngle(T: number): number {
  if (T < OOM[0]) return -Math.PI / 2 - 0.5
  const { i } = since(OOM, T)
  const a = OOM[i]
  const b = OOM[Math.min(OOM.length - 1, i + 1)]
  const u = b > a ? clamp01((T - a) / (b - a)) : 1
  // The nose points down (π/2) mid-lift; it swings round once a blow.
  return Math.PI / 2 + (i + u - 0.5) * Math.PI * 2 - 0.5
}

/* ------------------------------------------------------------------ the furnace */

/** The furnace's mouth in the back wall of the pit, under the flywheel: its arch. */
export const FURNACE = { x: 6.1, w: 3.2, top: -0.35, bottom: PIT }
/** The furnace's bellows (small, from the first flare) and the great bellows the trolls work (from BELLOWS). */
export const BELLOWS_SMALL = { x0: 3.72, x1: 4.55, y: PIT }
export const BELLOWS_GREAT = { x0: 7.72, x1: 9.25, y: PIT }

/**
 * How much the furnace is burning at T, 0..~2: out (a dull ember) until the first blow's sparks reach it, then a
 * flare on every 2 and 4 (a sharp rise, a long damped fall) over a base that grows with the machine; white-hot from
 * the great bellows; it gutters after the break.
 */
export function furnace(T: number): { base: number; flare: number; heat: number } {
  // The first blow shakes the banked coals up and throws its sparks in: it catches on the blow, all at once, and
  // is burning steadily before the bar is out.
  const lit = smoothstep(T, PAH[0] - 0.02, PAH[0] + 0.05)
  const settle = smoothstep(T, PAH[0], PAH[0] + 0.7)
  const base = lit * (0.34 + 0.13 * settle + 0.2 * smoothstep(T, FLY, PISTONS) + 0.2 * smoothstep(T, BELLOWS, BELLOWS + 2) + 0.15 * smoothstep(T, GOVERNOR, BREAK))
  const { i, ago } = since(PAH, T)
  const rise = 0.035
  let flare = 0
  // The catch is the biggest flare before the great bellows, and the slowest to die down.
  if (i >= 0) flare = (i === 0 ? 1.3 : 1) * Math.exp(-ago / (0.16 + 0.1 * smoothstep(T, BELLOWS, BELLOWS + 1) + (i === 0 ? 0.3 : 0)))
  // The rise before the next flare (so it swells onto the beat instead of switching on).
  const next = PAH[i + 1]
  if (next !== undefined && next - T < rise && i >= 0) flare = Math.max(flare, 1 - (next - T) / rise)
  const heat = smoothstep(T, BELLOWS, BELLOWS + 1.5)
  const out = T >= BREAK ? Math.exp(-(T - BREAK) / 3) : 1
  return { base: base * (T >= BREAK ? 0.6 + 0.4 * out : 1), flare: flare * (1 + 0.6 * heat) * out, heat }
}

/* ------------------------------------------------------------------ the flywheel and its pinion */

/** Gear tooth pitch (cells): every gear in the heart meshes with every other. */
export const PITCH = 0.3
export const radiusOf = (teeth: number): number => (teeth * PITCH) / (2 * Math.PI)
export const FLYWHEEL = { at: [6.12, -2.2] as Pt, teeth: 56, spokes: 6 }
export const FLY_R = radiusOf(FLYWHEEL.teeth)
/** The pinion that drives it, on an arm that swings it up into the flywheel's teeth on FLY. */
export const PINION = { teeth: 12, arm: 1.25, pivotAngle: 2.35 }
export const PINION_R = radiusOf(PINION.teeth)
/** Where the pinion meshes with the flywheel: the direction from the flywheel's centre (lower left). */
const MESH_DIR = 1.85
export const PINION_AT: Pt = polar(FLYWHEEL.at, FLY_R + PINION_R, MESH_DIR)
/** The arm's pivot (the pinion swings about it), below and left of the mesh; the pinion hangs clear before FLY. */
export const PINION_PIVOT: Pt = [PINION_AT[0] - 0.55, PINION_AT[1] + 1.05]
const PINION_SWING = 0.3

/**
 * The machine's pace: how many beats of turning have passed at T, for the parts driven from the mountain's axle (the
 * pinion and so the flywheel). One for one with the music until the runaway, then gathering past it: at the brake it
 * runs twice the beat, at the break nine times.
 */
export function drive(T: number): number {
  const b = beatAt(T)
  const b0 = OOM_K[0]
  if (b <= b0) return 0
  // A soft start over a beat (the heart's first turn), then the beat.
  const tau = 0.6
  const x = b - b0
  let g = x - tau * (1 - Math.exp(-x / tau))
  // The runaway: from beat 256, the pace gathers (its integral, in beats).
  if (b > 256) {
    const y = b - 256
    // pace(y) = 1 + (y/16)^2 * 1.2 up to 16, then growing by e every 7 beats.
    const quad = (u: number) => u + (1.2 * u * u * u) / (3 * 256)
    if (y <= 16) g += quad(y) - y
    else {
      const p16 = 1 + 1.2
      const e = (u: number) => p16 * 7 * (Math.exp(u / 7) - 1)
      g += quad(16) - 16 + e(y - 16) - (y - 16)
    }
  }
  return g
}

/** The pinion's arm: 0 hanging clear, 1 swung up into mesh (on FLY, with a clank). */
export const pinionIn = (T: number): number => {
  if (T < FLY - 0.16) return 0
  if (T < FLY) {
    const u = (T - (FLY - 0.16)) / 0.16
    return u * u
  }
  return 1 + 0.12 * ring(T - FLY, 0.06, 40) * (T < BREAK ? 1 : 0)
}
/** Where the pinion's centre is at T (swung up about its pivot into the mesh). */
export function pinionAt(T: number): Pt {
  const v: Pt = [PINION_AT[0] - PINION_PIVOT[0], PINION_AT[1] - PINION_PIVOT[1]]
  const a = (1 - pinionIn(T)) * PINION_SWING
  return add(PINION_PIVOT, rot(v, a))
}

/** Radians the pinion turns per beat of drive: the flywheel's rim covers ~one cell a second at the start. */
const PINION_RATE = 0.5
/** The pinion's angle (clockwise turns are positive, y down): it turns from the first blow, meshed or not. */
export const pinionAngle = (T: number): number => -drive(T) * PINION_RATE
/**
 * The flywheel's angle. Still until the pinion is in its teeth; from then it turns with the pinion, the other way,
 * rim for rim; after the break it stops, split.
 */
export function flyAngle(T: number): number {
  if (T < FLY) return 0
  const d = Math.min(drive(T), drive(BREAK))
  return (d - drive(FLY)) * PINION_RATE * (PINION_R / FLY_R)
}
/** The flywheel's angular pace, radians a second (for its blur). */
export function flySpin(T: number): number {
  const dt = 0.01
  return (flyAngle(T + dt) - flyAngle(T - dt)) / (2 * dt)
}

/* ------------------------------------------------------------------ the pistons */

/** The three pistons: where they stand, their heads' width, bottom (a head's top level with the decks) and stroke. */
export const PISTON_X = [9.78, 10.7, 11.62]
export const HEAD_W = 0.74
export const HEAD_T = 0.16
export const BDC = DECK
/** The stroke: short at first, doubled by the great bellows. */
export const stroke = (T: number): number => 0.85 + 0.55 * smoothstep(T, BELLOWS - 0.2, BELLOWS + 0.9)

/**
 * A piston head's top at T (y). Still at the bottom until the pistons start (each a beat after the last); then a
 * stroke every two beats, bottom on 1 and 3 (the heavy beats), top on 2 and 4. From the great bellows the stroke
 * doubles and the three run as a wave; in the runaway they race.
 */
export function pistonTop(i: number, T: number): number {
  const t = Math.min(T, BREAK)
  if (t < PISTONS - 0.02) return BDC
  const b = beatAt(t)
  // Phase in cycles: 0 at the bottom. Two beats a cycle.
  let phase = (b - 224) / 2
  // From the great bellows the middle head runs half a stroke behind the outer two: a wave.
  if (i === 1) phase += 0.5 * smoothstep(t, BELLOWS, BELLOWS + 0.7)
  // In the runaway they race with the drive.
  if (b > 256) phase += (drive(t) - drive(GOVERNOR) - (b - 256)) / 2
  // The first stroke comes in softly.
  const on = smoothstep(b, 224, 224.25)
  return BDC - (stroke(t) * on * (1 - Math.cos(phase * Math.PI * 2))) / 2
}
/** Where Peer's centre is on piston i's head at T, `dx` from its middle. */
export const onPiston = (i: number, T: number, dx = 0): Pt => [PISTON_X[i] + dx, pistonTop(i, T) - R]

/* ------------------------------------------------------------------ the governor */

/**
 * The governor on the ledge: its spindle, its top pivot, its arms (upper and lower the same length: a diamond with
 * the weights at its side corners and the sleeve at its foot), and the yoke that hangs from the sleeve's collar (it
 * does not turn) with a seat at its end, under the chimney.
 */
export const GOV = { x: 12.72, top: -5.35, arm: 2.05, base: DECK }
export const YOKE_DROP = 1.35
/** The arms' angle from the spindle, radians: hanging at rest, opening as it spins up, past its stops at the end. */
export function govAlpha(T: number): number {
  const rest = 0.5
  if (T < GOVERNOR) return rest
  const up = smoothstep(T, GOVERNOR, kt(284)) // to its stops by 132.79
  let a = rest + (1.2 - rest) * (0.35 * smoothstep(T, GOVERNOR, GOVERNOR + 1.6) + 0.65 * up)
  // The stops, then past them as it comes apart.
  a += 0.2 * smoothstep(T, kt(284), kt(286))
  // Shuddering on the blows in the runaway.
  const { ago } = since(OOM, T)
  a += 0.03 * smoothstep(T, VALVE_AT, VALVE_AT + 1) * (ago < 0 || !Number.isFinite(ago) ? 0 : Math.exp(-ago / 0.08) * Math.sin(ago * 30))
  return a
}
/** The governor's turn (radians): it spins with the drive, fast. */
export const govSpin = (T: number): number => (T < GOVERNOR ? 0 : (drive(T) - drive(GOVERNOR)) * 1.9)
/** The sleeve's collar (its middle): twice the arm's drop below the pivot. */
export const sleeveY = (T: number): number => GOV.top + 2 * GOV.arm * Math.cos(govAlpha(T))
/** When the yoke gives way under him, and he falls straight down to the chimney's foot. */
export const YOKE_GOES = kt(286.5)
/** Where he sits on the yoke. */
export const YOKE_SEAT = CHIMNEY_X
/** The yoke's seat under him at T (y of its top): hung below the collar; it stops where it gave way. */
export const yokeSeatY = (T: number): number => sleeveY(Math.min(T, YOKE_GOES)) + YOKE_DROP

/* ------------------------------------------------------------------ the pipe and its valve */

/**
 * The pistons are the mountain's pumps (the trolls drain their mines with them): they force the water up a pipe
 * under the ledge to the rising main at the chimney's foot (the finale's collar). On the ledge a safety valve on the
 * pipe, a weighted lever over it. At VALVE the pressure lifts it: it spits and bucks on every beat, and the keeper
 * sits on its lever to hold it down; it throws him off on bar 70 (VALVE_THROW) and blows wide.
 */
export const PIPE_Y = 2.08
export const VALVE = { x: 14.3, top: DECK - 0.36, pivot: [14.02, DECK - 0.5] as Pt, len: 1.08 }
export const VALVE_THROW = kt(280)
/** How far the valve's lever is lifted (radians up from resting): shut, then bucking on the beats, then thrown open. */
export function valveLift(T: number): number {
  if (T < VALVE_AT - 0.05) return 0
  const { ago } = since(OOM, T)
  const buck = (ago < 0 || !Number.isFinite(ago) ? 0 : Math.exp(-ago / 0.1) * Math.sin(Math.min(Math.PI, ago * 14)))
  if (T < VALVE_THROW) {
    // Held down by the keeper from just after it first lifts; still it bucks on every blow.
    const first = 0.32 * Math.exp(-Math.max(0, T - VALVE_AT) / 0.25) * smoothstep(T, VALVE_AT - 0.05, VALVE_AT)
    return first + (0.06 + 0.04 * smoothstep(T, VALVE_AT, VALVE_THROW)) * buck
  }
  // Thrown open: it flies up and stays up, rattling.
  return 0.55 * ease((T - VALVE_THROW) / 0.12) + 0.05 * buck
}
/** How hard it is spitting (0..1): a jet on each lift. */
export const valveSpit = (T: number): number => {
  if (T < VALVE_AT - 0.02 || T > BREAK + 0.6) return 0
  // Full as it first blows, choked while he sits on it, full again once it throws him; gone when the heart breaks.
  const held = T < VALVE_THROW ? 0.35 + 0.65 * Math.exp(-Math.max(0, T - VALVE_AT) / 0.35) : 1
  return clamp01(held * (T > BREAK ? 1 - (T - BREAK) / 0.6 : 1))
}

/* ------------------------------------------------------------------ the break */

/** The governor coming apart: the stops, a weight, the other weight, the spindle. */
export const GOV_STOPS = kt(284)
export const GOV_WEIGHTS = [kt(285), kt(286)]
export const GOV_SNAP = kt(287)
/** The spindle's fall (radians from upright, toward the pistons: negative x), once it has snapped at its foot. */
export function spindleFall(T: number): number {
  if (T < GOV_SNAP) return 0
  const a = T - GOV_SNAP
  // It topples under its own weight, and its top comes down on the flywheel's rim on the break.
  const land = BREAK - GOV_SNAP
  if (a < land) return SPINDLE_REST * (a / land) ** 2
  return SPINDLE_REST + 0.04 * Math.exp(-(a - land) / 0.1) * Math.sin((a - land) * 34)
}
/** The spindle's lean when its top meets the flywheel's teeth (radians from upright, negative: toward the wheel). */
export const SPINDLE_REST = (() => {
  const px = GOV.x
  const py = DECK - 0.55
  const L = py - GOV.top
  const R2 = FLY_R + 0.11
  let lo = 0.2
  let hi = 1.5
  const f = (th: number) => Math.hypot(px - L * Math.sin(th) - FLYWHEEL.at[0], py - L * Math.cos(th) - FLYWHEEL.at[1]) - R2
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (f(lo) * f(mid) <= 0) hi = mid
    else lo = mid
  }
  return -(lo + hi) / 2
})()
/** Where the spindle's top strikes the flywheel: the direction (from the wheel's centre) along which it splits. */
export const SPLIT_DIR = (() => {
  const px = GOV.x
  const py = DECK - 0.55
  const L = py - GOV.top
  const th = -SPINDLE_REST
  return Math.atan2(py - L * Math.cos(th) - FLYWHEEL.at[1], px - L * Math.sin(th) - FLYWHEEL.at[0])
})()
/** The flywheel's split on the break: 0 whole, 1 its halves come to rest apart. */
export const flySplit = (T: number): number => (T < BREAK ? 0 : 1 - Math.exp(-(T - BREAK) / 0.22))
