import type p5 from 'p5'
import { laneAt, mixHex, R, type Lane, type Pt } from '../../../../../parts'
import { drawCalcifer } from '../cast'
import { alpha, box, carried, frame, hash, knock, part, smooth, type Company, type PartShot } from '../kit'
import { bar, CHORD, DURATION, SEAM } from '../music'
import { drawDeck, drawGrate, drawPipes, drawStar, PLANK_AFTER, PLANK_END } from '../plank/plank'
import { calciferAt, DECK, LAND, T1 } from '../plank/plank-rig'
import { CASTLE, doorAt, drawCastle, drawLeg, FAR, feetAt, MODULE_PIVOT, onBody, puff, STRIDE, type CastlePose, type ModuleId, type ModuleMove } from '../wastes/castle'
import { wastesSky } from '../wastes/sky'
import { CALCIFER, WASTES } from '../worlds'

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
  const out: [number, number][] = [[WALK0, 0], [CHORD[0], 1], [303.444, 2], [304.431, 3], [305.459, 4]]
  let t = 305.459
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
const STEPS_STRUCK = [CHORD[0], 303.444, 304.431]

/** The chord: three roars of fire out of the chimney. */
const ROARS: [number, number][] = [[CHORD[0], 1], [CHORD[1], 0.75], [CHORD[2], 1]]

/** How the castle holds itself at `t` (no position). */
function poseAt(t: number): CastlePose {
  const mods: Partial<Record<ModuleId, ModuleMove>> = {}
  for (const g of GROUPS) if (t < g.at) for (const id of g.ids) mods[id] = { gone: 1 }
  const j = jolt(t)
  const walk = t > WALK0
  const step = walk ? stepAt(t) : 0
  let roar = 0.55 * knock(t - CHIMNEY, 0.3)
  for (const [at, s] of ROARS) roar = Math.max(roar, s * knock(t - at, 0.3))
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
    door: smooth(t, 299.4, 300.6),
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

/** Sophie and Howl on the porch (their centres), the plank part's frame. */
const sophieP = (t: number): Pt => {
  const [x, y] = onCastle(look(t), [XS, CASTLE.door[1]])
  return [x, y - R]
}
const howlP = (t: number): Pt => {
  const [x, y] = onCastle(look(t), [XH, CASTLE.door[1]])
  return [x, y - R]
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

function drawClouds(p: p5, k: number, t: number, f: { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number }) {
  const show = smooth(t, 295, 299.5)
  if (show <= 0.01) return
  const gold = smooth(t, 304, 322)
  const lit = mixHex(WASTES.cloud, WASTES.gold, 0.35 * gold)
  const under = mixHex(mixHex(WASTES.cloud, WASTES.slate, 0.25), WASTES.dusk, 0.25 * gold)
  p.push()
  p.noStroke()
  p.rectMode(p.CORNER)
  for (const cl of CLOUDS) {
    const cx = cl.x + (t - T1) * 0.12
    const base = cl.y
    if (cx + cl.w < f.x0 - 2 || cx - cl.w > f.x1 + 2 || base - cl.w * 0.4 > f.y1 + 1 || base < f.y0 - 2) continue
    const n = Math.max(4, Math.round(cl.w / 1.05))
    const puffs: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const peak = 0.4 + 0.2 * hash(cl.s, 9)
      const bell = Math.exp(-(((u - peak) / 0.3) ** 2))
      const r = cl.w * (0.045 + 0.12 * bell) * (0.75 + 0.5 * hash(i, cl.s))
      const x = cx - cl.w / 2 + u * cl.w + (hash(i, cl.s, 2) - 0.5) * 0.5
      puffs.push([x, base - r * (0.5 + 0.45 * bell) - 0.2 * hash(i, cl.s, 3), r])
    }
    const a = show * (0.55 + 0.25 * hash(cl.s, 67))
    p.fill(alpha(p, under, 0.55 * a))
    for (const [x, y, r] of puffs) p.ellipse(x * k, (y + r * 0.12) * k, 2 * r * k, 1.8 * r * k)
    p.rect((cx - cl.w / 2 + 0.4) * k, (base - 0.5) * k, (cl.w - 0.8) * k, 0.5 * k, 0.25 * k)
    p.fill(alpha(p, lit, 0.8 * a))
    for (const [x, y, r] of puffs) p.ellipse((x - r * 0.1) * k, (y - r * 0.16) * k, 1.66 * r * k, 1.42 * r * k)
  }
  p.pop()
}

/**
 * High up: the land far below goes into the haze of the sky itself as it climbs (the sky's own gradient laid over
 * the frame, thicker as it goes), so the credits come over sky and clouds.
 */
function veil(p: p5, k: number, t: number, f: { x0: number; x1: number; y0: number; y1: number }) {
  const a = 0.9 * smooth(t, 303, 311)
  if (a < 0.01) return
  const { top, low } = wastesSky(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalAlpha *= a
  const g = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
  g.addColorStop(0, top)
  g.addColorStop(1, low)
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
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
    const x = ex - 0.55 * age + Math.sin(tau * 3.1) * 0.25 * age
    const y = ey - 1.3 * age + 0.06 * age * age
    puff(p, k, x, y, 0.45 + 0.75 * age, col, 0.42 * (1 - age / life) * Math.min(1, age * 5), 0.9)
  }
  // The chord's three roars: great soft bursts, billowing up and back.
  for (const [n, [at, s]] of ROARS.entries()) {
    const age = t - at
    if (age < 0 || age > 4) continue
    const [ex, ey] = onCastle(look(at), CASTLE.chimney)
    for (let i = 0; i < 12; i++) {
      const a0 = hash(i, n, 81) * Math.PI * 2
      const out = 0.5 + hash(i, n + 3, 81) * 1.6
      const grow = 1 - Math.exp(-age / 0.55)
      const x = ex + Math.cos(a0) * out * grow * 1.8 - 1.6 * age
      const y = ey - 0.5 - (3.6 + 2.6 * hash(i, n + 5, 81)) * grow - 0.5 * age + Math.sin(a0) * out * grow * 0.9
      puff(p, k, x, y, 0.8 + 2.4 * grow + 0.6 * age, STEAM, 0.3 * s * Math.exp(-age / 1.3), 0.9)
    }
  }
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
          if (g.legs) flightLegs(p, k, W, ink, L.pose, 'near')
          p.pop()
        }
      }
      flying(false)
      if (t >= HULL) {
        p.push()
        p.translate(L.O[0] * k, L.O[1] * k)
        const folded = t < UNFOLD1
        if (folded) flightLegs(p, k, W, ink, L.pose, 'far')
        drawCastle(p, k, W, ink, L.pose)
        if (folded) flightLegs(p, k, W, ink, L.pose, 'near')
        p.pop()
      }
      flying(true)
      lockBreath(p, k, t, L)
      plume(p, k, t)
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
    // Close on the two of them on the porch, the door behind them (a follow: the castle is still drifting).
    const close = (t: number, cells: number): PartShot => ({ t, cells, off: [0.9, -1.4], w: 0 })
    return [
      // The dive over their heads into the grate, and the plank heaving up. (Out, carrying on through each key to the
      // next, until the breath.)
      hold(294.05, 8.8, [her[0] + 0.7, her[1] - 0.99]),
      // Out as the pieces come home, a piece a bar, until the whole castle is in the frame, always with sky over
      // what has come (the hull on the tutti's great note, the turrets, the chimney, the flag).
      hold(294.8, 17.5, mid(HULL, 0.3, 1.2)),
      hold(295.9, 22, mid(FACE + 0.2, 0.5, 0.2)),
      hold(297.1, 28.5, mid(HOUSE + 0.3, 0.6, -2.0)),
      hold(298.6, 31, mid(298.6, 0.8, -3.2)),
      hold(299.2, 30, mid(299.2, 0.5, -2.8)),
      // The breath: in to the two of them side by side on its porch as the windows light and the door swings open on
      // the warm room behind them, while its legs let down.
      close(300.5, 8.6),
      close(301.0, 8.0),
      // The chord: out again as it takes its first step, the whole castle and the sky over its chimney for the three
      // roars, the bursts blooming up and back into the frame's open left.
      hold(302.35, 31, mid(302.35, -4, -5)),
      hold(303.7, 37, mid(303.7, -8.5, -5.5)),
      // Then with it, up the sky, going small, under the credits.
      follow(305.3, 42, 0.17, 0.23),
      follow(312, 48, 0.2, 0.25),
      follow(324, 55, 0.21, 0.25),
      follow(DURATION, 60, 0.21, 0.25),
    ]
  },
)

/** Every strike of the finale, in show seconds: Calcifer back in the grate, the heaves, each piece home, the chord. */
export const FLIGHT_HITS: number[] = [...new Set([DIVE, ...HEAVES, ...GROUPS.map((g) => g.at), ...STEPS_STRUCK, CHORD[1], CHORD[2]])].sort((a, b) => a - b)
