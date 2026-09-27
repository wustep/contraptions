import type p5 from 'p5'
import { ball, laneAt, mixHex, R, type Lane, type Pt } from '../../../../../parts'
import { drawCalcifer, drawWarship } from '../cast'
import { alpha, box, carried, frame, hash, knock, part, smooth, type Company, type PartShot } from '../kit'
import { AIR_STEPS, bar, CHORD, DURATION, SEAM } from '../music'
import { drawDeck, drawGrate, drawPipes, drawStar, PLANK_AFTER, PLANK_END } from '../plank/plank'
import { calciferAt, DECK, LAND, T1 } from '../plank/plank-rig'
import { CASTLE, doorAt, drawCastle, drawChimneyFire, drawLeg, FAR, feetAt, MODULE_PIVOT, onBody, puff, STRIDE, type CastlePose, type ModuleId, type ModuleMove } from '../wastes/castle'
import { skyGradient, wastesSky } from '../wastes/sky'
import { CALCIFER, MARKL, MARKL_SCALE, WASTES } from '../worlds'

/**
 * The finale (292.734 → the end): the director's. The last tutti, the last chord, and the credits over the sky.
 *
 * The plank is at rest at the cliff's edge, Sophie and Howl on it, Turnip Head at the brink, and the little star
 * that was Calcifer turning over them. On the tutti's first clear beat he dives, and on its first downbeat he is
 * back in the plank's grate, a flame again, flaring; on the next three beats the plank heaves up off the ledge on
 * his fire. Then the castle comes home: its pieces fly back out of the wreck behind and lock on, one a downbeat,
 * the collapse played backwards: the hull and its folded legs round the plank on the tutti's great note (294.934),
 * the face (its eye lights), the cottage and the back turret, Calcifer's chimney with the front turret (his smoke
 * comes up it at once), and last the flag, fluttering in on the wind that took it. In the breath the windows light,
 * the door swings open, the castle drifts out over the gorge and lets its legs down; and on the last chord its first
 * foot comes down on the air, three roars of fire out of the chimney, and it walks away up the sky, as she and Howl
 * once walked on the air over the town. The credits come over the sky while it goes.
 *
 * Everything is worked out in the plank part's frame (its `PLANK_END` is where the plank stops), and moved to this
 * part's own frame (Sophie comes in at (-0.5, 0)) for the lane and the camera. The castle is the master: where it
 * is and how it holds itself (`look`), and Sophie and Howl stand on its porch left of the door, read from the same
 * numbers (`onBody`), so they never slide.
 */

/* ------------------------------------------------------------------ the clock */

const F = (n: number, pos = 1): number => bar('finale', n, pos)
/** Calcifer back in the grate. */
export const DIVE = F(1)
/** The plank heaves up off the ledge on his fire, a beat a heave. */
const HEAVES = [F(1, 2), F(1, 3), F(2)]
/** The pieces lock on (the hull on the tutti's great note). */
const HULL = F(2, 2)
const FACE = F(3)
const HOUSE = F(4)
const CHIMNEY = F(5)
const FLAG = F(6)
/** The breath: the legs let down; then the walk on the air, its first foot on the last chord. */
const UNFOLD0 = 300.2
const UNFOLD1 = 301.25
const WALK0 = 301.3
/** Out over the gorge, before it goes. */
const DRIFT0 = 297.0
const DRIFT1 = 301.25
const DRIFT = 3.2
/** How steep the stair of air is it walks up (cells up a cell along). */
const SLOPE = 0.27
/**
 * The breath's two-shot on the porch (the in-shot from f4 comes to it by the flag, f6), how many cells tall, and where
 * she sits in it (how far right of and below the middle, in frames; left and up are negative): the two of them side by
 * side, the door right of them swinging open on the warm room, the windows over them lighting. Held through the
 * breath, riding the castle, easing in a touch, until the chord's cut.
 */
const PORCH = 4.6
const PORCH_TO = 4.3
const PORCH_FX = -0.07
const PORCH_FY = 0.14
/**
 * The chord: a cut from the porch to the whole castle, on its first stroke. How many cells tall, and how far down the
 * frame Calcifer's chimney mouth sits (three tenths: under Zoom, half as close again, it is a fifth down, so the three
 * roars and the smoke thrown up on them are in the frame either way; the two of them on the porch in the lower middle,
 * the feet and the cloud under the first on the air in). Then held while the roars ring, and eased out, one slow
 * move, into the credits' frame as it walks away up the sky (`OPEN_TO`).
 */
const CHORD_CELLS = 34
const CHIMNEY_DOWN = 0.3
const OPEN_TO = 306.2
/** Where she sits in the frame gets to the credits' place sooner than the scale does. */
const PLACED = 305.4
/**
 * Under the credits: [time, cells, fx, fy] of the follow (where she sits right of and below the middle, in frames).
 * The castle low and right of middle, small enough that flag to feet sit inside the middle two-thirds of the frame
 * (what Zoom shows), and going smaller as it climbs away.
 */
export const CREDITS_FRAMES: [t: number, cells: number, fx: number, fy: number][] = [
  [OPEN_TO, 52, 0.15, 0.12],
  [312, 56, 0.15, 0.13],
  [318, 60, 0.15, 0.14],
  [326, 65, 0.145, 0.15],
  [DURATION, 72, 0.14, 0.16],
]

/**
 * A move's progress, 0 → 1 over [t0, t1]: eased in over `a` seconds and out over `b` (half-cosine ramps) with an
 * even pace between, so its fastest is 1 / (t1 - t0 - (a + b) / 2) of the move a second.
 */
function cruise(t: number, t0: number, t1: number, a: number, b: number): number {
  const v = 1 / (t1 - t0 - (a + b) / 2)
  const s = t - t0
  const r = t1 - t
  if (s <= 0) return 0
  if (r <= 0) return 1
  if (s < a) return v * (s / 2 - (a / (2 * Math.PI)) * Math.sin((Math.PI * s) / a))
  if (r < b) return 1 - v * (r / 2 - (b / (2 * Math.PI)) * Math.sin((Math.PI * r) / b))
  return v * (a / 2 + s - a)
}

/* ------------------------------------------------------------------ placing the castle on the plank */

/** The plank's deck middle, on its boards, as the plank part leaves it (the plank part's frame). */
const DM: Pt = PLANK_END.middle
/** Sophie's place on the porch, left of the door, and Howl's (castle x). */
const XS = -2.15
const XH = XS + 0.36
/** The castle's x of the deck's u = 0, so that the porch comes to where she stands. */
const OX = XS - DECK.sophieEnd
/** The door's sill along the deck. */
const SILL_U = CASTLE.door[0] - OX
/** This part's origin in the plank part's frame: where the plank's lane ends, half a cell on. */
const FO: Pt = [PLANK_END.sophie[0] + 0.5, PLANK_END.sophie[1]]

/** A step that comes in at once and settles without overshoot (critically damped), 0 → 1. */
const settle = (u: number, tau: number): number => (u <= 0 ? 0 : 1 - (1 + u / tau) * Math.exp(-u / tau))
/** A hit that rings down: 0 at the hit, a few damped swings. */
const ring = (u: number, period: number, tau: number): number => (u <= 0 ? 0 : Math.sin((2 * Math.PI * u) / period) * Math.exp(-u / tau))

/* ------------------------------------------------------------------ the pieces coming home */

interface Group {
  ids: ModuleId[]
  /** The hull brings the legs, folded. */
  legs?: boolean
  /** When it locks on (on the recording), and how long it flies. */
  at: number
  dur: number
  /** Where it flies from (world cells from its place), how high its arc, how far turned it starts. */
  from: Pt
  arc: number
  rot: number
  pivot: Pt
  /** Drawn over the castle as it comes (the face is drawn after the hull), or behind it. */
  front: boolean
  /** How hard it lands: the castle's jolt. */
  bump: number
  /** Where it joins, for the steam (castle cells, standing), and how wide. */
  seam: Pt
  wide: number
}

const GROUPS: Group[] = [
  { ids: ['hull'], legs: true, at: HULL, dur: 1.3, from: [-31, 3], arc: 5, rot: -0.45, pivot: MODULE_PIVOT.hull, front: false, bump: 0.16, seam: [-0.8, -6.4], wide: 6.5 },
  { ids: ['eye', 'nose', 'jaw'], at: FACE, dur: 1.2, from: [-34, -9], arc: 4, rot: 0.9, pivot: MODULE_PIVOT.eye, front: true, bump: 0.07, seam: [6.6, -10.2], wide: 1.6 },
  { ids: ['house', 'turretBack', 'cannonTop'], at: HOUSE, dur: 1.3, from: [-27, -15], arc: 3, rot: -0.55, pivot: MODULE_PIVOT.house, front: false, bump: 0.11, seam: [-2.5, -12.3], wide: 4.5 },
  { ids: ['chimney', 'turretFront', 'pipes'], at: CHIMNEY, dur: 1.3, from: [-25, -19], arc: 3, rot: 0.7, pivot: MODULE_PIVOT.chimney, front: false, bump: 0.08, seam: [3.0, -12.4], wide: 3.5 },
  { ids: ['flag'], at: FLAG, dur: 1.55, from: [-16, -8], arc: 2.5, rot: 2.3, pivot: MODULE_PIVOT.flag, front: false, bump: 0.02, seam: [-6.9, -23.6], wide: 0.4 },
]
const ALL_IDS: ModuleId[] = ['hull', 'jaw', 'nose', 'eye', 'house', 'chimney', 'turretBack', 'turretFront', 'pipes', 'flag', 'cannonTop']

/** How far a piece has come, 0 → 1: out of rest out of shot, arriving at speed (it lands on the note). */
const arrive = (u: number): number => u * u * (2 - u)

/* ------------------------------------------------------------------ where the castle is */

/** How far the plank (and then the castle round it) has risen off the ledge. */
function rise(t: number): number {
  let r = 0
  for (const h of HEAVES) r += 1.07 * settle(t - h, 0.1)
  r += 0.45 * smooth(t, HULL + 0.3, 300.6)
  // Hanging on Calcifer's fire: a slow breath up and down, stilled before it walks.
  r += 0.07 * Math.sin((2 * Math.PI * (t - HULL)) / 2.6) * smooth(t, HULL, HULL + 1.2) * (1 - smooth(t, UNFOLD0 - 0.6, WALK0))
  return r
}

/** The jolt of each piece locking on (down positive), and the rock it gives the body. */
function jolt(t: number): { y: number; lean: number } {
  let y = 0
  let lean = 0
  GROUPS.forEach((g, i) => {
    y += g.bump * ring(t - g.at, 0.42, 0.16)
    lean += (i % 2 ? -1 : 1) * 0.06 * g.bump * ring(t - g.at, 0.6, 0.25)
  })
  return { y, lean }
}

/** The footfalls on the air: the first on the last chord, then its own slow pace. [time, step] keys. */
const STEP_KEYS: [number, number][] = (() => {
  const out: [number, number][] = [[WALK0, 0], [CHORD[0], 1], ...AIR_STEPS.map((a, i): [number, number] => [a, i + 2])]
  let t = AIR_STEPS[2]
  let per = 1.08
  let n = 4
  while (t < DURATION + 4) {
    per = Math.min(1.42, per + 0.022)
    t += per
    n++
    out.push([t, n])
  }
  return out
})()
/** Their slopes (monotone cubic, Fritsch-Carlson), the first from rest. */
const STEP_M: number[] = (() => {
  const k = STEP_KEYS
  const m = k.map(() => 0)
  for (let i = 1; i < k.length - 1; i++) {
    const a = (k[i][1] - k[i - 1][1]) / (k[i][0] - k[i - 1][0])
    const b = (k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0])
    m[i] = a * b <= 0 ? 0 : 2 / (1 / a + 1 / b)
  }
  const n = k.length - 1
  m[n] = (k[n][1] - k[n - 1][1]) / (k[n][0] - k[n - 1][0])
  return m
})()
function stepAt(t: number): number {
  const k = STEP_KEYS
  if (t <= k[0][0]) return 0
  let i = 0
  while (i + 2 < k.length && k[i + 1][0] <= t) i++
  const [t0, s0] = k[i]
  const [t1, s1] = k[i + 1]
  const h = t1 - t0
  const u = Math.min(1, (t - t0) / h)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * s0 + (u3 - 2 * u2 + u) * h * STEP_M[i] + (-2 * u3 + 3 * u2) * s1 + (u3 - u2) * h * STEP_M[i + 1]
}
/** The footfalls it strikes: the first three on the air, on the recording. */
const STEPS_STRUCK = [CHORD[0], AIR_STEPS[0], AIR_STEPS[1]]

/** The chord: three roars of fire out of the chimney, and how long each takes to die back (the last the longest). */
const ROARS: [number, number, number][] = [[CHORD[0], 1, 0.34], [CHORD[1], 0.8, 0.3], [CHORD[2], 1, 0.95]]

/** Calcifer's fire out of the chimney, 0..1: licking up before the chord, then the three roars, dying back slow. */
function fireAt(t: number): number {
  let f = 0.2 * smooth(t, 301.75, CHORD[0]) * (1 - smooth(t, CHORD[2] + 0.6, CHORD[2] + 3))
  for (const [at, s, tau] of ROARS) f = Math.max(f, s * knock(t - at, tau))
  return f
}

/** How the castle holds itself at `t` (no position). */
function poseAt(t: number): CastlePose {
  const mods: Partial<Record<ModuleId, ModuleMove>> = {}
  for (const g of GROUPS) if (t < g.at) for (const id of g.ids) mods[id] = { gone: 1 }
  const j = jolt(t)
  const walk = t > WALK0
  const step = walk ? stepAt(t) : 0
  // The chimney's lock flares in the castle's own drawing; the chord's roars are this part's (`drawFire`).
  const roar = 0.55 * knock(t - CHIMNEY, 0.3)
  return {
    t,
    step,
    sit: 1 - smooth(t, UNFOLD0, UNFOLD1),
    lean: j.lean - 0.07 * smooth(t, WALK0, WALK0 + 2.6),
    // Sat on the air it sits level; as its legs let down its feet find the stair of air it will walk up.
    ground: (x: number) => -SLOPE * x * smooth(t, UNFOLD0, UNFOLD1),
    // Its legs are this part's to draw (folded for flight) until they have let down.
    noLegs: t < UNFOLD1,
    modules: mods,
    lights: smooth(t, 299.3, 301.6),
    // It swings open behind the two of them once the camera is in on the porch.
    door: smooth(t, 299.95, 300.95),
    dial: 0,
    eye: 0.35 * smooth(t, FACE, FACE + 0.1) + 0.65 * knock(t - FACE, 0.5),
    jaw: 0.7 * Math.max(0, ring(t - FACE, 1.1, 0.5)),
    roar,
    steam: 1 - 0.65 * smooth(t, 306, 310),
    smoke: 0,
  }
}

/** The door's sill in the world before it walks: on the plank's deck, lifted, drifting out, jolted. */
function sillAt(t: number): Pt {
  return [DM[0] + SILL_U + DRIFT * smooth(t, DRIFT0, DRIFT1), DM[1] - rise(t) + jolt(t).y]
}

interface Look {
  /** The castle's origin (the ground between its feet), in the plank part's frame. */
  O: Pt
  pose: CastlePose
}

/** Where it is when it takes its first step, once. */
const O_WALK: Pt = (() => {
  const pose = poseAt(WALK0)
  const s = sillAt(WALK0)
  const d = doorAt(pose)
  return [s[0] - d[0], s[1] - d[1]]
})()

function look(t: number): Look {
  const pose = poseAt(t)
  if (t <= WALK0) {
    const s = sillAt(t)
    const d = doorAt(pose)
    return { O: [s[0] - d[0], s[1] - d[1]], pose }
  }
  const go = STRIDE * pose.step
  return { O: [O_WALK[0] + go, O_WALK[1] - SLOPE * go], pose }
}

/** A standing point of the castle, in the plank part's frame. */
function onCastle(L: Look, at: Pt): Pt {
  const b = onBody(L.pose, at)
  return [L.O[0] + b[0], L.O[1] + b[1]]
}

/**
 * The cottage and the back turret come down over their heads and lock on (f4): the porch jolts under them, and they
 * look up at it, up on their toes (Howl a moment after her), and come down again before the chimney comes. How far
 * up, cells (negative is up), `d` seconds after her.
 */
const lookUp = (t: number, d: number): number =>
  -0.1 * smooth(t, HOUSE + d + 0.05, HOUSE + d + 0.36) * (1 - smooth(t, CHIMNEY - 0.55, CHIMNEY - 0.12))

/** Sophie and Howl on the porch (their centres), the plank part's frame. */
const sophieP = (t: number): Pt => {
  const [x, y] = onCastle(look(t), [XS, CASTLE.door[1]])
  return [x, y - R + lookUp(t, 0)]
}
const howlP = (t: number): Pt => {
  const [x, y] = onCastle(look(t), [XH, CASTLE.door[1]])
  return [x, y - R + lookUp(t, 0.1)]
}

/**
 * The castle's box at `t` (walking, from `WALK0`), flag to toes and gun to gun, from Sophie's centre (cells): for the
 * check that under the credits the whole castle stays inside what Zoom shows.
 */
export function flightCastleBox(t: number): { x0: number; y0: number; x1: number; y1: number } {
  const L = look(t)
  const [hx, hy] = sophieP(t)
  const edges: Pt[] = [[-6.9, -25.75], [-8.9, -25.3], [-9.9, -15.6], [-9.5, -9.6], [10.9, -10.3], [6.9, -15.5]]
  const pts: Pt[] = edges.map((q) => onCastle(L, q))
  for (const f of feetAt(L.pose)) pts.push([L.O[0] + f.at[0] - 0.9, L.O[1] + f.at[1] + 0.2], [L.O[0] + f.at[0] + 1.1, L.O[1] + f.at[1] + 0.2])
  const xs = pts.map((q) => q[0] - hx)
  const ys = pts.map((q) => q[1] - hy)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/* ------------------------------------------------------------------ its legs, folded for flight */

/**
 * Flying, the castle carries its legs folded up under it as a bird does: each thigh laid back under the belly, the
 * shin folded forward under it, the toes curled. Where each foot is tucked, from its own hip (standing cells).
 */
const TUCK_FRONT: Pt = [0.1, 0.4]
const TUCK_BACK: Pt = [0.3, 0.6]
const FLEGS: { hip: Pt; far: boolean; foot: number; tuck: Pt }[] = [
  { hip: [CASTLE.hips[1][0] + FAR[0], CASTLE.hips[1][1] + FAR[1]], far: true, foot: 3, tuck: TUCK_BACK },
  { hip: [CASTLE.hips[0][0] + FAR[0], CASTLE.hips[0][1] + FAR[1]], far: true, foot: 2, tuck: TUCK_FRONT },
  { hip: CASTLE.hips[1], far: false, foot: 1, tuck: TUCK_BACK },
  { hip: CASTLE.hips[0], far: false, foot: 0, tuck: TUCK_FRONT },
]
const LEG_NEAR = WASTES.iron
const LEG_FAR = mixHex(WASTES.ironDark, WASTES.night, 0.2)

/**
 * The legs while they are this part's (the castle draws its own once they are down): folded, then over the breath
 * let down to where the castle's own standing legs are, so the hand-over at `UNFOLD1` is seamless. The far pair
 * goes behind the castle, the near pair over it. Drawn in the castle's frame (the caller is at its origin).
 */
function flightLegs(p: p5, k: number, W: number, ink: string, pose: CastlePose, which: 'far' | 'near') {
  const down = smooth(pose.t, UNFOLD0, UNFOLD1)
  const stand: CastlePose = { ...pose, sit: 0 }
  const feet = down > 0 ? feetAt(stand) : null
  for (const leg of FLEGS) {
    if (leg.far !== (which === 'far')) continue
    const hip = onBody(pose, leg.hip)
    const tucked = onBody(pose, [leg.hip[0] + leg.tuck[0], leg.hip[1] + leg.tuck[1]])
    let foot = tucked
    if (feet) {
      // The castle's own standing foot, hung from where the hip is now.
      const h0 = onBody(stand, leg.hip)
      const f = feet[leg.foot].at
      const to: Pt = [f[0] + hip[0] - h0[0], f[1] + hip[1] - h0[1]]
      foot = [tucked[0] + (to[0] - tucked[0]) * down, tucked[1] + (to[1] - tucked[1]) * down]
    }
    drawLeg(p, k, W, ink, hip, foot, leg.far ? LEG_FAR : LEG_NEAR, 1 - down, 0.5 * (1 - down))
  }
}

/** The plank's deck while it is still to be seen: its middle and its turn. */
function deckAt(t: number): { x: number; y: number; rot: number } {
  const L = look(t)
  const [sx, sy] = onCastle(L, CASTLE.door)
  const rot = L.pose.lean ?? 0
  return { x: sx - SILL_U * Math.cos(rot), y: sy - SILL_U * Math.sin(rot), rot }
}
const onDeckF = (t: number, u: number, v: number): Pt => {
  const d = deckAt(t)
  const c = Math.cos(d.rot)
  const s = Math.sin(d.rot)
  return [d.x + u * c - v * s, d.y + u * s + v * c]
}

/**
 * The plank's back end runs far out behind the hull's stern, where the hull cannot hide it: as the hull comes down
 * over it, it goes, a soft edge sweeping from the broken end forward, done by the lock, stopping short of the grate
 * (Calcifer is still in it) and well short of where they stand. Deck u left of which it is gone.
 */
const FEATHER = 1.5
const WIPE_STEPS = 16
const WIPE_TO = DECK.grate - 1.7
const plankWipe = (t: number): number => {
  const from = DECK.back - FEATHER - 0.4
  return from + (WIPE_TO - from) * smooth(t, HULL - 0.5, HULL)
}

/* ------------------------------------------------------------------ Calcifer */

interface Cal {
  at: Pt
  size: number
  star: number
  lean: number
  mouth: number
  look: Pt
}

/** Calcifer: the star turning over them, the dive, a flame again in the grate; inside the castle once the hull is on. */
function calAt(t: number): Cal | null {
  if (t > HULL + 0.6) return null
  const grate = onDeckF(t, DECK.grate, -0.16)
  if (t < DIVE) {
    const was = calciferAt(t)
    const u = Math.max(0, (t - T1) / (DIVE - T1))
    const e = arrive(u)
    const at: Pt = [was.at[0] + (grate[0] - was.at[0]) * e, was.at[1] + (grate[1] - was.at[1]) * e - 0.9 * Math.sin(Math.PI * u) * (1 - u)]
    return {
      at,
      size: was.size + (0.58 - was.size) * smooth(u, 0.45, 1),
      star: 1 - smooth(u, 0.3, 0.95),
      lean: was.lean * (1 - smooth(u, 0, 0.3)) - 0.7 * Math.sin(Math.PI * u),
      mouth: 0.4 + 0.3 * u,
      look: [-1, 0.6],
    }
  }
  const f = knock(t - DIVE, 0.35)
  let heave = 0
  for (const h of HEAVES) heave += knock(t - h, 0.2)
  return {
    at: grate,
    size: 0.62 * (1 + 0.45 * f + 0.12 * heave),
    star: 0,
    lean: -0.3 * heave,
    mouth: 0.35 + 0.5 * f + 0.25 * heave,
    look: [1, -0.4],
  }
}

/* ------------------------------------------------------------------ the sky: clouds it walks past */

/**
 * Fair-weather clouds along the way (plank-frame cells), laid along the stair of air it climbs: behind it at its
 * own height and below it, never high above it, where the credits' words come.
 */
const CLOUDS: { x: number; y: number; w: number; s: number }[] = (() => {
  const out: { x: number; y: number; w: number; s: number }[] = []
  // Sophie's height on the porch as it walks, cell by cell along.
  const her = (x: number) => DM[1] - 3.8 - SLOPE * (x - 72)
  for (let i = 0; i < 26; i++) {
    const x = 60 + i * 7 + (hash(i, 61) - 0.5) * 5
    const below = hash(i, 62) < 0.5
    const y = below ? her(x) + 3.5 + hash(i, 64) * 8 : her(x) - 3 - hash(i, 63) * 9
    out.push({ x, y: Math.min(y, DM[1] - 7), w: 7 + hash(i, 65) * 12, s: i })
  }
  return out
})()

/** A soft round of colour: solid through its middle, fading out over its edge (a cloud's heap, never an outline). */
function softHeap(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rgb: string, a: number): void {
  if (a <= 0.004 || rx <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(0.55, `rgba(${rgb}, ${a})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
const rgbHex = (hex: string): string => {
  const n = parseInt(hex.slice(1, 7), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * The clouds the castle walks up among: two heaps of uneven size on each, on a long soft cool underside, lit from
 * above (and gold as the evening comes); soft volume with soft edges, never a row of even beads on a ruled base.
 * The town's clouds, drawn the same way.
 */
function drawClouds(p: p5, k: number, t: number, f: { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number }) {
  const show = smooth(t, 295, 299.5)
  if (show <= 0.01) return
  const gold = smooth(t, 304, 322)
  const lit = rgbHex(mixHex(WASTES.cloud, WASTES.gold, 0.35 * gold))
  const under = rgbHex(mixHex(mixHex(WASTES.cloud, WASTES.slate, 0.3), WASTES.dusk, 0.3 * gold))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const cl of CLOUDS) {
    const cx = cl.x + (t - T1) * 0.12
    const base = cl.y
    if (cx + cl.w < f.x0 - 2 || cx - cl.w > f.x1 + 2 || base - cl.w * 0.4 > f.y1 + 1 || base < f.y0 - 2) continue
    const a = show * (0.7 + 0.25 * hash(cl.s, 67))
    const n = Math.max(6, Math.round(cl.w / 0.9))
    const p1 = 0.3 + 0.15 * hash(cl.s, 9)
    const p2 = 0.62 + 0.18 * hash(cl.s, 10)
    const h2 = 0.45 + 0.3 * hash(cl.s, 11)
    const puffs: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const u = (i + 0.3 + 0.4 * hash(i, cl.s, 4)) / n
      const bell = Math.max(Math.exp(-(((u - p1) / 0.2) ** 2)), h2 * Math.exp(-(((u - p2) / 0.16) ** 2)))
      const r = cl.w * (0.05 + 0.13 * bell) * (0.7 + 0.6 * hash(i, cl.s))
      const x = cx - cl.w / 2 + u * cl.w + (hash(i, cl.s, 2) - 0.5) * 0.6
      puffs.push([x, base - r * (0.35 + 0.5 * bell) - 0.25 * hash(i, cl.s, 3), r])
    }
    // The underside: a long soft shadow, flatter than the heaps and thinning out at the ends.
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const end = Math.sin(Math.PI * u)
      softHeap(ctx, (cx - cl.w / 2 + u * cl.w) * k, (base - 0.35) * k, (0.9 + 1.1 * end) * k, (0.45 + 0.4 * end) * k, under, 0.42 * end * a)
    }
    for (const [x, y, r] of puffs) softHeap(ctx, x * k, (y + r * 0.18) * k, 1.05 * r * k, 0.9 * r * k, under, 0.5 * a)
    // The lit tops, a little up and to the left of each heap.
    for (const [x, y, r] of puffs) softHeap(ctx, (x - r * 0.12) * k, (y - r * 0.18) * k, 0.95 * r * k, 0.82 * r * k, lit, 0.85 * a)
  }
}

/**
 * The war going home, as the film ends on it: once the castle is away up the sky, far off and low in the evening the
 * fleet's warships cross the other way in echelon, slow, their wing-oars barely beating, hazed by the distance.
 * So far off that the camera's moves do not shift them, they are placed in the frame (the 16:9 box the sky is placed
 * in): under the castle's feet and below the words, behind the clouds it walks past. [how far behind the lead along
 * the way (box widths), up or down (box heights), size]
 */
const HOME: [number, number] = [313.5, 331.5]
const HOMEWARD: [number, number, number][] = [[0, 0, 1], [0.11, -0.03, 0.86], [0.2, -0.055, 0.74]]
function homeward(p: p5, k: number, W: number, ink: string, t: number, f: { x0: number; x1: number; y0: number; y1: number }) {
  const u0 = (t - HOME[0]) / (HOME[1] - HOME[0])
  if (u0 < -0.05 || u0 > 1.3) return
  const w = f.x1 - f.x0
  const h = Math.min(f.y1 - f.y0, (w * 9) / 16)
  const my = (f.y0 + f.y1) / 2
  const { low } = wastesSky(t)
  const far = mixHex(WASTES.warship, low, 0.45)
  const inkFar = mixHex(ink, low, 0.45)
  HOMEWARD.forEach(([lag, dy, size], i) => {
    const u = u0 - lag
    const len = 0.075 * w * size
    const x = f.x1 + len - u * (w + 2.5 * len)
    if (x < f.x0 - len || x > f.x1 + len) return
    const y = my + (0.31 + dy) * h + 0.004 * h * Math.sin(t * 0.7 + i * 1.7)
    const sc = len / 6
    p.push()
    p.translate(x * k, y * k)
    p.scale(sc)
    drawWarship(p, k, W / sc, mixHex(inkFar, low, 0.15 * i), { t: 0.6 * t + i * 0.8, face: -1, color: mixHex(far, low, 0.12 * i), light: 1 })
    p.pop()
  })
}

/**
 * High up: the land far below goes into the haze of the sky itself as it climbs (the sky's own gradient laid over
 * the frame, thicker as it goes), so the credits come over sky and clouds.
 */
function veil(p: p5, k: number, t: number, f: { x0: number; x1: number; y0: number; y1: number }) {
  // The sky's own gradient, placed exactly as the sky places it (so on a tall phone too), and whole by 311: the land
  // is gone under the credits, top to bottom of any screen.
  const a = smooth(t, 303, 311)
  if (a < 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalAlpha *= a
  ctx.fillStyle = skyGradient(ctx, k, t, f)
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ steam, dust and smoke */

const STEAM = WASTES.steam
const DUST = mixHex(WASTES.rock, WASTES.mist, 0.5)

/**
 * The plank heaving up: a breath of steam pushed down out from under its whole keel on every heave (what lifts it),
 * spreading as it goes, and dust off the ledge on the first. Soft and uneven, never a row of beads.
 */
function heaveBreath(p: p5, k: number, t: number) {
  HEAVES.forEach((h, n) => {
    const a = t - h
    if (a < 0 || a > 1.6) return
    const fade = 1 - a / 1.6
    for (let i = 0; i < 7; i++) {
      const u = DECK.back + 0.6 + (i + hash(i, n, 91) * 0.8) * ((DECK.front - DECK.back - 1.2) / 7)
      const [x, y] = onDeckF(h, u, DECK.keel)
      const g = a * (0.7 + 0.5 * hash(i, n, 92))
      const r = (0.45 + 0.35 * hash(i, n, 93)) * (1 + g * 2.2)
      puff(p, k, x + (hash(i, n, 94) - 0.5) * g * 1.4, y + 0.3 + g * 1.3, r, STEAM, 0.26 * fade * (0.7 + 0.3 * hash(i, n, 95)), 0.75)
    }
    if (n === 0) {
      for (let i = 0; i < 5; i++) {
        const x = DM[0] - 4.2 + i * 2.1 + hash(i, 96) * 0.8
        const side = i % 2 ? 1 : -1
        puff(p, k, x + side * a * 0.7, LAND.ledge - 0.25 - a * 0.45, (0.4 + 0.3 * hash(i, 97)) * (1 + a * 2), DUST, 0.28 * fade, 0.6)
      }
    }
  })
}

/** Each piece locking on: a breath of steam out of its seam, a few soft uneven clouds, rolling out and up. */
function lockBreath(p: p5, k: number, t: number, L: Look) {
  GROUPS.forEach((g, gi) => {
    const a = t - g.at
    if (a < 0 || a > 2) return
    const fade = 1 - a / 2
    const n = Math.max(2, Math.round(g.wide * 0.7))
    for (let i = 0; i < n; i++) {
      const along = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * g.wide + (hash(i, gi, 98) - 0.5) * 1.2
      const [x, y] = onCastle(L, [g.seam[0] + along, g.seam[1]])
      const side = along < 0 ? -1 : 1
      const g2 = a * (0.6 + 0.6 * hash(i, gi, 71))
      const r = (0.5 + 0.6 * hash(i, gi, 72)) * (1 + g2 * 1.8) * (0.7 + 0.06 * g.wide)
      puff(p, k, x + side * g2 * 0.9 - g2 * 0.5, y - g2 * (0.6 + 0.5 * hash(i, gi, 73)), r, STEAM, 0.3 * fade * (0.6 + 0.4 * hash(i, gi, 74)))
    }
  })
}

/** Calcifer's smoke up his chimney once it is on: puffs let go where the chimney was, rising and trailing back. */
function plume(p: p5, k: number, t: number) {
  if (t < CHIMNEY) return
  const every = 0.15
  const life = 5
  const col = mixHex(STEAM, WASTES.rock, 0.12)
  const last = Math.floor(t / every) * every
  for (let j = Math.ceil(life / every); j >= 0; j--) {
    const tau = last - j * every
    if (tau < CHIMNEY) continue
    const age = t - tau
    if (age < 0 || age > life) continue
    const [ex, ey] = onCastle(look(tau), [CASTLE.chimney[0] - 0.05, CASTLE.chimney[1] + 0.1])
    // Under the credits, walking up the sky, each puff let go from 305 on is left behind by the castle (it drifts on
    // at a third of its pace and rises less than it climbs), so the smoke strings out low and back from the chimney, a
    // thin leaning wisp that spreads and thins as it goes: short-lived and faint, never heaped into one bright round
    // thing on the chimney's top.
    const wind = smooth(tau, 305, 308)
    const span = life - 2.5 * wind
    if (age > span) continue
    // (It falls back from the chimney faster than it swells, so it draws out into a line and never balls up.)
    const x = ex + (-0.55 + 1.35 * wind) * age + Math.sin(tau * 3.1) * 0.25 * age
    const y = ey - (1.3 - 0.8 * wind) * age + (0.06 + 0.06 * wind) * age * age
    const r = 0.45 - 0.2 * wind + (0.75 - 0.15 * wind) * age
    const left = 1 - age / span
    const a = (0.42 - 0.2 * wind) * left ** (1 + 0.8 * wind) * Math.min(1, age * 5)
    puff(p, k, x, y, r, col, a, 0.9)
  }
}

/**
 * The chord's three roars of smoke: great soft billows thrown up out of the chimney on each, lit orange from under
 * by the fire as they leave it and cooling to a warm white, rolling up and back on the wind of its walking. Each
 * billow is a volume (a shaded underside, a lit top), never an outline; the three run together into one column.
 */
function bursts(p: p5, k: number, t: number) {
  const shade = mixHex(STEAM, WASTES.rock, 0.4)
  for (const [n, [at, s]] of ROARS.entries()) {
    const age = t - at
    if (age < 0 || age > 6) continue
    const [ex, ey] = onCastle(look(at), CASTLE.chimney)
    // The column stands through the chord and its ring, and is thinned away by the time the first card comes up
    // over the sky where it was (304.2 →), so it never lies under the words.
    const fade = s * Math.min(1, age * 10) * Math.exp(-age / 1.4) * (1 - smooth(age, 1.1, 2.5))
    const warm = 0.3 * Math.exp(-age / 0.45)
    const lit = mixHex(STEAM, CALCIFER.body, warm)
    for (let i = 0; i < 11; i++) {
      const h1 = hash(i, n, 81)
      const h2 = hash(i, n, 82)
      const h3 = hash(i, n, 83)
      // Thrown up fast in a column that leans back on the wind of its walking, slowing as it rolls out, each billow
      // its own size and height (never one round mass); the later billows of a roar a touch behind the first.
      const go = 1 - Math.exp(-Math.max(0, age - 0.03 * i) / 0.5)
      const side = (h1 - 0.5) * 2
      const up = i / 10
      const x = ex + side * (0.4 + 1.3 * go) - (1.4 + 0.6 * h2) * age - 1.6 * up * go
      const y = ey - 0.6 - (1.4 + 7.2 * up + 1.2 * h2) * go - 0.45 * age
      const r = (0.7 + (0.9 + 1.6 * h3 * (1 - 0.4 * up)) * go + 0.28 * age) * (0.75 + 0.25 * s)
      const a = fade * (0.6 + 0.3 * h3)
      puff(p, k, x + 0.18 * r, y + 0.3 * r, r, shade, 0.6 * a, 0.9)
      puff(p, k, x - 0.12 * r, y - 0.14 * r, r * 0.86, lit, 0.9 * a, 0.9)
    }
  }
}

/* ------------------------------------------------------------------ the chord: fire out of the chimney, every window */

/** The castle's windows (standing cells: x, y, w, h), as `drawCastle` draws them, for their flare. */
const WINDOWS: [number, number, number, number][] = [
  [-6.95, -18.85, 0.5, 0.85], [-6.95, -16.35, 0.5, 0.85], [-6.95, -13.95, 0.5, 0.75], [-8.55, -18.05, 0.3, 0.55],
  [-4.7, -16.6, 0.62, 0.85], [-4.7, -14.1, 0.62, 0.8], [-1.5, -20.2, 0.55, 0.6],
  [-2.55, -15.95, 0.72, 0.9], [-0.6, -15.95, 0.72, 0.9], [1.3, -13.95, 0.68, 0.85], [-2.45, -13.95, 0.62, 0.8],
  [-1.05, -17.75, 0.6, 0.7], [3.66, -14.9, 0.46, 0.7], [6.95, -15.45, 0.45, 0.8], [-5.75, -9.75, 0.62, 0.7], [3.1, -9.55, 0.62, 0.7],
]
const FLARE = mixHex(WASTES.window, '#FFFFFF', 0.45)

/**
 * Every window flares with each roar, the fire running out through the house from the hearth (a few hundredths of
 * a second from the chimney to the farthest): the glass goes near white and a warm light spills round it.
 */
function flareWindows(p: p5, k: number, t: number, L: Look) {
  if (t < CHORD[0] - 0.05 || t > CHORD[2] + 4) return
  const [ax, ay] = onCastle(L, [0, -6.9])
  const [bx, by] = onCastle(L, [1, -6.9])
  const ang = Math.atan2(by - ay, bx - ax)
  const chim = CASTLE.chimney
  p.push()
  p.noStroke()
  p.rectMode(p.CORNER)
  for (const [x, y, w, h] of WINDOWS) {
    const c: Pt = [x + w / 2, y + h / 2]
    const f = fireAt(t - 0.0015 * Math.hypot(c[0] - chim[0], c[1] - chim[1])) - 0.2 * smooth(t, 301.75, CHORD[0])
    if (f < 0.01) continue
    const [cx, cy] = onCastle(L, c)
    puff(p, k, cx, cy, Math.max(w, h) * (1.3 + 1.4 * f), mixHex(WASTES.window, CALCIFER.core, 0.45), 0.5 * f, 1.15)
    p.push()
    p.translate(cx * k, cy * k)
    p.rotate(ang)
    p.fill(alpha(p, FLARE, Math.min(1, 1.3 * f)))
    p.rect((-w / 2 + 0.05) * k, (-h / 2 + 0.05) * k, (w - 0.1) * k, (h - 0.1) * k, 0.05 * k)
    p.pop()
  }
  p.pop()
}

/**
 * Calcifer's roars out of the chimney: a sheaf of tongues of his fire leaping up out of its mouth and swept back on
 * the wind, his three colours one inside the other, flames tearing off the tips as they die, and a warm light
 * thrown on the sky and the roofs round it (a long soft haze, never a disc). The castle's own (`drawChimneyFire`),
 * as on the walk's roar: the same fire.
 */
function drawFire(p: p5, k: number, t: number, L: Look) {
  const f = fireAt(t)
  if (f < 0.01) return
  const [ex, ey] = onCastle(L, CASTLE.chimney)
  drawChimneyFire(p, k, t, ex, ey, f, ROARS)
}

/**
 * The room's light out of the open door onto the porch, where the two of them stand: a long low wash on the iron
 * round the doorway and a pool along the porch's boards under their feet, warm (the hearth's). Soft all the way out
 * from its middle (no rim, no core), so it lights them and never reads as a round thing by them. It opens with the
 * door and stays lit under the credits, so as the castle goes small the porch is the warm point where they are.
 */
function porchLight(t: number, ctx: CanvasRenderingContext2D, k: number, L: Look) {
  const a = smooth(t, 299.95, 300.95) * (L.pose.lights ?? 0) * (1 + 0.6 * smooth(t, 304, 312))
  if (a < 0.01) return
  const warm = rgbHex(mixHex(WASTES.window, CALCIFER.body, 0.35))
  const wash = (at: Pt, rx: number, ry: number, alpha: number) => {
    const [x, y] = onCastle(L, at)
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.scale(1, ry / rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
    g.addColorStop(0, `rgba(${warm}, ${alpha})`)
    g.addColorStop(0.35, `rgba(${warm}, ${0.6 * alpha})`)
    g.addColorStop(0.7, `rgba(${warm}, ${0.18 * alpha})`)
    g.addColorStop(1, `rgba(${warm}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, rx * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const [dx, dy] = CASTLE.door
  // On the iron round the doorway, leaning out toward them.
  wash([dx - 0.45, dy - 1.0], 2.3, 1.45, 0.2 * a)
  // The pool along the boards, from the sill out past where they stand.
  wash([dx - 0.9, dy + 0.05], 1.8, 0.38, 0.34 * a)
}

/* ------------------------------------------------------------------ the cottage comes down over the porch */

/**
 * The cottage locking on over the porch (f4) shakes loose what the flight left on it: dust sifting down past the two
 * of them in soft clumps from the seam under the house, and a few slates off its roof tumbling down past the porch's
 * ends (never onto them) and on down into the gorge. The chimney's lock (f5) shakes down soot from the same seam, a
 * little darker and fewer, and one more slate. Each is let go from the castle where it was at the lock, then falls in
 * the world. Castle x, seconds after the lock, how fast.
 */
interface Shaken {
  at: number
  dust: string
  a: number
  sift: { x: number; at: number; r: number; v: number; dy: number }[]
  slates: { x: number; at: number; vx: number; spin: number; w: number }[]
}
const sift = (n: number, x0: number, span: number, s: number) =>
  Array.from({ length: n }, (_, i) => ({
    x: x0 + span * ((i + 0.5 * hash(i, 41, s)) / n),
    at: 0.02 + 0.55 * hash(i, 42, s),
    r: 0.1 + 0.2 * hash(i, 43, s),
    v: 1.2 + 1.3 * hash(i, 44, s),
    dy: 0.9 * hash(i, 45, s),
  }))
const SHAKEN: Shaken[] = [
  {
    at: HOUSE,
    dust: DUST,
    a: 0.42,
    sift: sift(8, -3.3, 4.1, 0),
    slates: [
      { x: -3.1, at: 0.03, vx: -0.35, spin: 7.5, w: 0.24 },
      { x: 0.55, at: 0.1, vx: 0.3, spin: -9, w: 0.2 },
      { x: 1.05, at: 0.22, vx: 0.4, spin: 6, w: 0.26 },
      { x: -3.5, at: 0.34, vx: -0.2, spin: -6.5, w: 0.18 },
      { x: 0.75, at: 0.47, vx: 0.2, spin: 8.5, w: 0.22 },
    ],
  },
  {
    at: CHIMNEY,
    dust: mixHex(WASTES.ironDark, DUST, 0.45),
    a: 0.36,
    sift: sift(6, -3.0, 3.8, 7),
    slates: [{ x: 0.95, at: 0.12, vx: 0.35, spin: -8, w: 0.21 }],
  },
]
function shakenLoose(p: p5, k: number, W: number, ink: string, t: number) {
  const seam = CASTLE.deck + 0.25
  for (const sh of SHAKEN) {
    const u0 = t - sh.at
    if (u0 < 0 || u0 > 1.9) continue
    for (const d of sh.sift) {
      const u = u0 - d.at
      if (u <= 0) continue
      const [x0, y0] = onCastle(look(sh.at + d.at), [d.x, seam + d.dy])
      const y = y0 + d.v * u + 1.5 * u * u
      const a = sh.a * smooth(u, 0, 0.1) * Math.exp(-u / 0.75)
      // A clump: two or three soft puffs strung down its fall, spreading as it goes.
      for (let j = 0; j < 3; j++) puff(p, k, x0 + 0.05 * Math.sin(u * 3 + j), y - j * 0.14 * (1 + u), (d.r + 0.25 * u) * (1 - 0.2 * j), sh.dust, a * (1 - 0.3 * j), 0.8)
    }
    p.push()
    p.rectMode(p.CENTER)
    for (const sl of sh.slates) {
      const u = u0 - sl.at
      if (u <= 0) continue
      const [x0, y0] = onCastle(look(sh.at + sl.at), [sl.x, CASTLE.deck - 1.3])
      const x = x0 + sl.vx * u
      const y = y0 + 3 * u + 6 * u * u
      p.push()
      p.translate(x * k, y * k)
      p.rotate(sl.spin * u)
      p.stroke(ink)
      p.strokeWeight(W * 0.6)
      p.fill(WASTES.slate)
      p.rect(0, 0, sl.w * k, sl.w * 0.42 * k, 0.015 * k)
      p.pop()
    }
    p.pop()
  }
}

/**
 * Over the two of them on the porch, while the in-shot holds on them: Calcifer's flare as his chimney locks on (f5),
 * a warm light coming down on them from above (his fire out of sight over the frame), strongest at the top and gone
 * by the boards; and on f6 the flag's shadow crossing them as it flutters home high over the porch, a soft dark shape
 * rippling across left to right. Drawn over the balls (it lights and shades them too). The plank part's frame.
 */
function overPorch(p: p5, k: number, t: number) {
  const fl = smooth(t, CHIMNEY - 0.02, CHIMNEY + 0.04) * Math.exp(-Math.max(0, t - CHIMNEY - 0.04) / 0.7)
  const sh = smooth(t, FLAG - 0.75, FLAG - 0.55) * (1 - smooth(t, FLAG - 0.05, FLAG + 0.15))
  if (fl < 0.01 && sh < 0.01) return
  const L = look(t)
  const [hx, hy] = onCastle(L, [XS, CASTLE.door[1]])
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (fl > 0.01) {
    // From the chimney's side, up and right of them out of the frame: a long soft fall of light, no edge anywhere.
    const [cx, cy] = [hx + 3.4, hy - 4.6]
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.translate(cx * k, cy * k)
    ctx.scale(1.5, 1)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 6.2 * k)
    const warm = rgbHex(mixHex(CALCIFER.body, CALCIFER.core, 0.4))
    g.addColorStop(0, `rgba(${warm}, ${(0.56 * fl).toFixed(4)})`)
    g.addColorStop(0.45, `rgba(${warm}, ${(0.36 * fl).toFixed(4)})`)
    g.addColorStop(0.8, `rgba(${warm}, ${(0.09 * fl).toFixed(4)})`)
    g.addColorStop(1, `rgba(${warm}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 6.2 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  if (sh > 0.01) {
    // Its way across: from off the frame's left to off its right in 0.7 s, rippling as the cloth does.
    const u = (t - (FLAG - 0.75)) / 0.7
    const x = hx - 5.5 + 11 * u
    const y = hy - 0.9 + 0.35 * Math.sin(u * 2.2)
    const shade = mixHex(WASTES.ironDark, WASTES.night, 0.5)
    for (let i = 0; i < 5; i++) {
      const along = i / 4
      const wave = 0.18 * Math.sin(t * 11 - i * 1.3)
      puff(p, k, x - along * 1.5, y + wave + along * 0.15, 0.62 - 0.08 * i, shade, 0.2 * sh * (1 - 0.12 * i), 0.5)
    }
  }
}

/**
 * The porch lantern (the walk's, `wastes/walk.ts`): a small square brass lantern on a short chain from the hood's
 * left end, two and a half cells over them. It comes home with the hull, swings as each piece locks on (hardest as
 * the cottage comes down over it), sways to the walk on the air, and is lit with the windows. Square and high over
 * them: never a round bright thing by her. Drawn in the castle's frame (the caller is at its origin).
 */
function porchLantern(p: p5, k: number, W: number, ink: string, pose: CastlePose): void {
  const t = pose.t
  const [dx, dy] = CASTLE.door
  const hook = onBody(pose, [dx - 0.9, dy - 2.62])
  let angle = 0
  for (const [at, a] of [[HULL, 0.2], [FACE, 0.08], [HOUSE, 0.4], [CHIMNEY, 0.18], [FLAG, 0.05]] as const) angle += a * ring(t - at, 0.95, 0.85)
  if (t > WALK0) angle += 0.07 * Math.sin(2 * Math.PI * stepAt(t) - 2.2) * smooth(t, WALK0, WALK0 + 0.9)
  const lit = pose.lights ?? 0
  const L = 0.28
  const lx = hook[0] - L * Math.sin(angle)
  const ly = hook[1] + L * Math.cos(angle)
  const X = (v: number) => v * k
  p.push()
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.line(X(hook[0]), X(hook[1]), X(lx), X(ly))
  p.translate(X(lx), X(ly))
  p.rotate(angle)
  p.rectMode(p.CENTER)
  p.strokeWeight(W * 0.7)
  p.fill(mixHex(WASTES.ironDark, WASTES.window, 0.85 * lit))
  p.rect(0, X(0.14), X(0.15), X(0.2), X(0.02))
  p.fill(WASTES.brass)
  p.triangle(X(-0.11), X(0.04), X(0.11), X(0.04), 0, X(-0.06))
  p.rect(0, X(0.26), X(0.17), X(0.04))
  p.pop()
  if (lit > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const cx = lx - 0.14 * Math.sin(angle)
    const cy = ly + 0.14 * Math.cos(angle)
    const g = ctx.createRadialGradient(X(cx), X(cy), 0, X(cx), X(cy), X(0.45))
    g.addColorStop(0, `rgba(255, 227, 163, ${0.4 * lit})`)
    g.addColorStop(1, 'rgba(255, 227, 163, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(cx - 0.45), X(cy - 0.45), X(0.9), X(0.9))
  }
}

/**
 * Markl, home: the door swinging open on the warm room behind the two of them shows him inside it, standing on the
 * threshold in the hearth's light (the household together again, as the film ends on it), and he gives a little hop
 * once it is wide. Drawn inside the door's opening (the door's frame, the sill's middle at the origin) by the castle,
 * under the leaf, so the leaf opening is what shows him; the same small sage ball as at breakfast.
 */
const MARKL_X = 0.12
const MARKL_HOP = 301.05
function marklInDoor(k: number, W: number, ink: string, t: number) {
  return (q: p5) => {
    const u = (t - MARKL_HOP) / 0.36
    const hop = u > 0 && u < 1 ? 0.11 * Math.sin(Math.PI * u) : 0
    ball(q, k, ink, W, MARKL, MARKL_X * k, (-R * MARKL_SCALE - hop) * k, -2.5, MARKL_SCALE)
  }
}

/* ------------------------------------------------------------------ the stair of air: a cloud under every foot */

/**
 * Walking on the air, each foot comes down on a little cloud that gathers under it as it lands (the first on the
 * last chord, blooming out soft under the weight) and melts away behind once the foot has lifted, so the stair of
 * air it climbs reads as steps. Worked out once from the gait: where and when each foot lands and lifts.
 */
interface Footfall {
  t: number
  lift: number
  at: Pt
  far: boolean
  size: number
  /** How long before it lands the cloud gathers. */
  form: number
}
/** When the walk reaches a step (it only climbs). */
function timeOfStep(s: number): number {
  let a = WALK0
  let b = DURATION + 6
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    if (stepAt(m) < s) a = m
    else b = m
  }
  return b
}
const FOOTFALLS: Footfall[] = (() => {
  // As `feetAt` lists them: near front, near back, far front, far back; each leg lands every other step, on its phase.
  const PHASE = [0, 1, 1, 0]
  const out: Footfall[] = []
  for (const [T, n] of STEP_KEYS) {
    if (T > DURATION + 1) break
    const L = look(T)
    feetAt(L.pose).forEach((f, i) => {
      if (n > 0 && PHASE[i] !== n % 2) return
      const far = i >= 2
      // All four let down onto the air in the breath; after that each lands on its step and lifts DUTY on.
      const liftStep = n === 0 ? (PHASE[i] === 1 ? 0.2 : 1.2) : n + 1.2
      out.push({
        t: n === 0 ? UNFOLD1 : T,
        lift: timeOfStep(liftStep),
        at: [L.O[0] + f.at[0], L.O[1] + f.at[1]],
        far,
        size: (n === 1 ? 2.1 : 1.35) * (far ? 0.75 : 1),
        form: n === 0 ? 0.6 : 0.35,
      })
    })
  }
  return out
})()

function footClouds(p: p5, k: number, t: number, far: boolean) {
  const gold = smooth(t, 304, 322)
  const lit = mixHex(WASTES.cloud, WASTES.gold, 0.35 * gold)
  const under = mixHex(mixHex(WASTES.cloud, WASTES.slate, 0.45), WASTES.dusk, 0.25 * gold)
  FOOTFALLS.forEach((ff, fi) => {
    if (ff.far !== far || t < ff.t - ff.form || t > ff.lift + 2.2) return
    const g = smooth(t, ff.t - ff.form, ff.t)
    const left = Math.max(0, t - ff.lift)
    const a = g * (1 - smooth(t, ff.lift, ff.lift + 2.2)) * (far ? 0.8 : 1)
    if (a < 0.01) return
    const since = Math.max(0, t - ff.t)
    const spread = 1 - Math.exp(-since / 0.45)
    const w = 2.6 * ff.size * (0.55 + 0.45 * g) * (1 + 0.18 * spread) + 1.2 * left
    const cx = ff.at[0] + 0.35 - 0.3 * left
    const top = ff.at[1] + 0.02
    const n = Math.max(5, Math.round(w * 2.4))
    const puffs: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const bell = Math.exp(-(((u - 0.45) / 0.32) ** 2))
      const r = w * (0.07 + 0.12 * bell) * (0.8 + 0.4 * hash(i, fi, 41))
      const x = cx - w / 2 + u * w + (hash(i, fi, 42) - 0.5) * 0.3
      // Flat along its underside, heaped up under the foot, the foot resting on its top.
      puffs.push([x, top + 0.19 * w - 0.55 * r * bell + 0.1 * hash(i, fi, 43), r])
    }
    p.push()
    for (const [x, y, r] of puffs) puff(p, k, x + 0.08 * r, y + 0.3 * r, r, under, 0.6 * a, 0.8)
    for (const [x, y, r] of puffs) puff(p, k, x - 0.06 * r, y - 0.1 * r, r * 0.88, lit, 0.9 * a, 0.8)
    // The weight coming down on it: soft billows rolled out along it either side from under the foot.
    const bl = knock(since, 0.9) * (since > 0 ? 1 : 0)
    if (bl > 0.02) {
      for (let j = 0; j < 6; j++) {
        const side = j % 2 ? 1 : -1
        const d = (0.6 + 0.35 * j) * (0.4 + 1.1 * spread) * ff.size
        const r = (0.35 + 0.5 * spread + 0.1 * j) * ff.size
        puff(p, k, cx + side * d, top + 0.35 * ff.size - 0.25 * spread, r, lit, 0.55 * bl * a, 0.75)
      }
    }
    p.pop()
  })
}

/* ------------------------------------------------------------------ the part */

// Once the finale has the place, the plank part draws only its land and Turnip Head: the plank and the star are
// this part's to draw from the seam on.
PLANK_AFTER.plank = false
PLANK_AFTER.star = false

export const flight = part<null>(
  {
    name: 'flight',
    draw: (p, _s, c) => {
      if (c.t < 0) return
      const t = SEAM.flight + c.t
      const { k, weight: W, ink } = c
      p.push()
      p.translate(-FO[0] * k, -FO[1] * k)
      const f = frame(p, k)
      veil(p, k, t, f)
      homeward(p, k, W, ink, t, f)
      drawClouds(p, k, t, f)
      const L = look(t)
      // The plank, until the hull has it: its deck, its pipes, the grate (lit once he is back in it), then him. Its
      // back end, which the hull cannot cover, goes first, as the hull comes down over it (`plankWipe`); what is
      // left, inside the hull and under the porch, goes under the lock's steam.
      const fade = 1 - smooth(t, HULL, HULL + 0.4)
      if (fade > 0.001) {
        const ctx = p.drawingContext as CanvasRenderingContext2D
        const was = ctx.globalAlpha
        const d = deckAt(t)
        const plank = () => {
          drawDeck(p, k, W, ink)
          drawPipes(p, k, W, ink, smooth(t, DIVE, DIVE + 0.4))
          drawGrate(p, k, W, ink, t, 0.35 + 0.65 * smooth(t, DIVE - 0.05, DIVE + 0.05), 0)
        }
        p.push()
        p.translate(d.x * k, d.y * k)
        p.rotate(d.rot)
        const edge = plankWipe(t)
        if (edge <= DECK.back - 0.3) {
          ctx.globalAlpha = was * fade
          plank()
        } else {
          // A soft edge: nested copies, each from its own step of the feather on, each adding to the last, so the
          // plank goes from gone to whole across it with no seam between the steps.
          for (let i = 0; i < WIPE_STEPS; i++) {
            p.push()
            ctx.beginPath()
            ctx.rect((edge + (FEATHER * i) / (WIPE_STEPS - 1)) * k, -6 * k, 40 * k, 12 * k)
            ctx.clip()
            ctx.globalAlpha = was * (1 - (1 - (fade * (i + 1)) / WIPE_STEPS) / (1 - (fade * i) / WIPE_STEPS))
            plank()
            p.pop()
          }
        }
        p.pop()
        ctx.globalAlpha = was
      }
      const cal = calAt(t)
      if (cal) {
        if (cal.star > 0.01) drawStar(p, k, t, cal.at, cal.star)
        p.push()
        p.translate(cal.at[0] * k, cal.at[1] * k)
        drawCalcifer(p, k, W, ink, { t, size: cal.size, weak: 0, look: cal.look, lean: cal.lean, mouth: cal.mouth, shut: 0 })
        p.pop()
        // His flare as he lands: a warm breath of light over the grate (never a disc).
        const fl = knock(t - DIVE, 0.4)
        if (fl > 0.01) puff(p, k, cal.at[0], cal.at[1] - 0.35, 0.9 + 0.8 * (1 - fl), CALCIFER.core, 0.3 * fl)
      }
      heaveBreath(p, k, t)
      // The pieces behind the castle as they come, the castle, then those that come in front of it.
      const flying = (front: boolean) => {
        for (const g of GROUPS) {
          if (g.front !== front) continue
          const u = (t - (g.at - g.dur)) / g.dur
          if (u <= 0 || u >= 1) continue
          const e = arrive(u)
          const [px, py] = onCastle(L, g.pivot)
          const ox = g.from[0] * (1 - e)
          const oy = g.from[1] * (1 - e) - g.arc * Math.sin(Math.PI * u)
          const mods: Partial<Record<ModuleId, ModuleMove>> = {}
          for (const id of ALL_IDS) if (!g.ids.includes(id)) mods[id] = { gone: 1 }
          p.push()
          p.translate((px + ox) * k, (py + oy) * k)
          p.rotate(g.rot * (1 - u) * (1 - u))
          p.translate((L.O[0] - px) * k, (L.O[1] - py) * k)
          if (g.legs) flightLegs(p, k, W, ink, L.pose, 'far')
          drawCastle(p, k, W, ink, { ...L.pose, modules: mods, noLegs: true, roar: 0, eye: 0, jaw: 0, lights: 0, door: 0 })
          if (g.legs) porchLantern(p, k, W, ink, { ...L.pose, lights: 0 })
          if (g.legs) flightLegs(p, k, W, ink, L.pose, 'near')
          p.pop()
        }
      }
      flying(false)
      // The clouds under its far feet go behind it, those under the near feet over their toes.
      footClouds(p, k, t, true)
      if (t >= HULL) {
        p.push()
        p.translate(L.O[0] * k, L.O[1] * k)
        const folded = t < UNFOLD1
        if (folded) flightLegs(p, k, W, ink, L.pose, 'far')
        drawCastle(p, k, W, ink, { ...L.pose, doorView: marklInDoor(k, W, ink, t) })
        porchLantern(p, k, W, ink, L.pose)
        if (folded) flightLegs(p, k, W, ink, L.pose, 'near')
        p.pop()
      }
      flareWindows(p, k, t, L)
      porchLight(t, p.drawingContext as CanvasRenderingContext2D, k, L)
      footClouds(p, k, t, false)
      shakenLoose(p, k, W, ink, t)
      flying(true)
      lockBreath(p, k, t, L)
      plume(p, k, t)
      bursts(p, k, t)
      drawFire(p, k, t, L)
      p.pop()
    },
    over: (p, _s, c) => {
      if (c.t < 0) return
      const t = SEAM.flight + c.t
      if (t < CHIMNEY - 0.1 || t > FLAG + 0.3) return
      p.push()
      p.translate(-FO[0] * c.k, -FO[1] * c.k)
      overPorch(p, c.k, t)
      p.pop()
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const at = (u: number): Pt => {
      const [x, y] = sophieP(slot.begin + u)
      return [x - FO[0], y - FO[1]]
    }
    const segs = carried(at, 0, dur, Math.round(dur * 40))
    const lane: Lane = { segs, fire: DIVE - slot.begin }
    const end = laneAt(lane, dur)
    const howl: Company = {
      who: 'howl',
      from: slot.begin,
      to: slot.end,
      at: (t) => {
        const [x, y] = howlP(t)
        return { x: x - FO[0], y: y - FO[1] }
      },
    }
    return {
      cells: box(-24, -90, 150, 10, 3),
      exit: [end.x + 0.5, end.y] as Pt,
      lane,
      state: null,
      company: [howl],
    }
  },
  () => {
    // Holds and follows, in the plank part's frame, moved to this part's.
    const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: [at[0] - FO[0], at[1] - FO[1]], w: 1 })
    // Following her, framed so she sits low and right of middle (the credits come over the sky above the castle).
    const follow = (t: number, cells: number, fx: number, fy: number): PartShot => ({ t, cells, off: [-fx * cells * (16 / 9), -fy * cells], w: 0 })
    const mid = (t: number, dx: number, dy: number): Pt => {
      const [x, y] = onCastle(look(t), [0, -9])
      return [x + dx, y + dy]
    }
    const her = sophieP(T1)
    // Where the camera is when it frames her as `follow` does, at `t` (a hold there does not ride her).
    const onPorch = (t: number, cells: number, fx: number, fy: number): Pt => {
      const [x, y] = sophieP(t)
      return [x - fx * cells * (16 / 9), y - fy * cells]
    }
    // A move of the follow between two framings (cells, and where she sits in the frame), along a progress 0 → 1
    // for the scale (`at`) and one for her place in the frame (`place`, the same unless given), laid down as a key at
    // each of `times` so the camera's curve through them is the move's own.
    type Framed = [cells: number, fx: number, fy: number]
    const glide = (times: number[], from: Framed, to: Framed, at: (t: number) => number, place = at): PartShot[] =>
      times.map((t) => {
        const q = at(t)
        const r = place(t)
        const cells = Math.exp(Math.log(from[0]) + (Math.log(to[0]) - Math.log(from[0])) * q)
        return follow(t, cells, from[1] + (to[1] - from[1]) * r, from[2] + (to[2] - from[2]) * r)
      })
    /** Every `dt` strictly inside (t0, t1). */
    const every = (t0: number, t1: number, dt: number): number[] => {
      const n = Math.max(1, Math.round((t1 - t0) / dt))
      return Array.from({ length: n - 1 }, (_, i) => t0 + ((t1 - t0) * (i + 1)) / n)
    }
    const porch: Framed = [PORCH, PORCH_FX, PORCH_FY]
    // The chord's cut: the whole castle, Calcifer's chimney mouth three tenths down the frame (the three roars go up
    // into the sky over it, under Zoom too), the castle a little left of middle (its smoke leans back, it walks on to
    // the right).
    const chord = ((): Framed => {
      const L = look(CHORD[0])
      const [, ey] = onCastle(L, CASTLE.chimney)
      const [cx] = onCastle(L, [1.2, -9])
      const [hx, hy] = sophieP(CHORD[0])
      const cy = ey + (0.5 - CHIMNEY_DOWN) * CHORD_CELLS
      return [CHORD_CELLS, (hx - cx) / (CHORD_CELLS * (16 / 9)), (hy - cy) / CHORD_CELLS]
    })()
    const [first, ...later] = CREDITS_FRAMES
    return [
      // The dive over their heads into the grate, Calcifer's flare, and the plank heaving up off the ledge on his fire:
      // close on the two of them, riding it up.
      hold(DIVE, 7.3, [her[0] + 0.7, her[1] - 0.99]),
      follow(DIVE + 1.2, 7.5, -0.06, 0.15),
      follow(HULL - 0.03, 7.7, -0.06, 0.17),
      // The castle comes home, cut on the tutti's downbeats. On its great note (the hull and its legs locking on round
      // the plank) a cut out to the whole of it arriving, sky over it for what is to come, the face flying in on f3;
      // on f4 in to the two of them as the cottage and the back turret come down over their heads and lock on, and
      // there it stays until the chord: the rest of the castle comes home on the two of them. Held on the porch (not
      // riding it) through the cottage's lock and the chimney's (f5), so each jolt shows, the lantern swings, dust and
      // slates come down past them, soot after the chimney, Calcifer's flare washes them warm from above, and they
      // look up; then riding the castle as it drifts out over the gorge, the flag's shadow crossing them on f6, the
      // windows over them lighting and the door swinging open on the warm room behind them (Markl in it), easing in
      // into the breath. The chord's cut is the first wide since the hull: the whole castle lands on the biggest note.
      { ...hold(HULL, 19, mid(HULL, 0.4, -2.2)), cut: true },
      hold(HOUSE - 0.03, 21, mid(FACE + 0.3, 0.6, -2.6)),
      { ...hold(HOUSE, 5.2, onPorch(HOUSE, 5.2, -0.08, 0.2)), cut: true },
      hold(CHIMNEY - 0.03, 5.0, onPorch(CHIMNEY - 0.03, 5.0, -0.08, 0.2)),
      hold(CHIMNEY + 0.55, 4.9, onPorch(CHIMNEY + 0.55, 4.9, -0.075, 0.18)),
      follow(FLAG - 0.2, 4.72, -0.072, 0.155),
      follow(FLAG + 0.45, ...porch),
      follow(CHORD[0] - 0.03, PORCH_TO, PORCH_FX, PORCH_FY),
      // The chord is a cut, on its first stroke: from the porch to the whole castle, its first foot coming down on the
      // air, every window flaring, and the three roars of fire out of the chimney in the sky over it. Held (barely
      // moving) while they ring, then one slow move out into the credits' frame as it walks away up the sky.
      { ...follow(CHORD[0], ...chord), cut: true },
      // (Her place in the frame leads the scale, so the castle is low and right, clear of the first card, as it
      // comes up.)
      ...glide(
        every(CHORD[0], OPEN_TO, 0.2),
        chord,
        [first[1], first[2], first[3]],
        (t) => cruise(t, CHORD[0], OPEN_TO, 1.4, 1.6),
        (t) => cruise(t, CHORD[0], PLACED, 1.2, 1.4),
      ),
      follow(...first),
      // Then with it, up the sky, going small, under the credits.
      ...later.map((f) => follow(...f)),
    ]
  },
)

/** Every strike of the finale, in show seconds: Calcifer back in the grate, the heaves, each piece home, the chord. */
export const FLIGHT_HITS: number[] = [...new Set([DIVE, ...HEAVES, ...GROUPS.map((g) => g.at), ...STEPS_STRUCK, CHORD[1], CHORD[2]])].sort((a, b) => a - b)
