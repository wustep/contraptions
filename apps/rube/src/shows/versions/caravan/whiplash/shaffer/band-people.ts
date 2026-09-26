import type { Pt } from '../../../../../parts'
import { clamp, easeInOutSine, easeOutQuad, lerp } from '../../../../../../../../src/core/ease'
import { RIG, POSES, beatPose, blendPose, type ArmPose, type HandShape, type Pose } from '../fletcher'
import { smooth } from '../kit'
import { BAND, QUIET, TEMPO, TUNE_ORIGIN, TUNE_PERIOD, level, tune } from '../music'
import type { KitPiece } from '../drums'
import {
  BACK_H, CHAIR_X, FLETCHER_H, FLETCHER_HOME, KX, KY, PIT, PIT_Y, PODIUM, PODIUM_TOP, SEAT_H, TANNER_ASIDE, kitLand,
} from './band-plan'
import {
  BUMP, FILL, OFF, PEAK, ANSWER as BREATH, THERE, TANNER_DOWN, TANNER_OFF, TURNS, TUTTI, YOU, bandHits, heroBand,
} from './band-motion'
import {
  AGAIN1, COUNT1, COUNT2, CRASH, DRAG, DUCK, LEAN, POINT, RUSH, SLAP1, SLAP2, SLAP3, STEADY, STOP1, STOP2,
  STOP3, TANNER_GO, TANNER_ON, THROW, WALL, WITH, heroTempo,
} from './tempo-motion'

/**
 * The people in the band room, both parts through (30.65 → 130.5), in the band's frame: where Fletcher's head is and
 * what his hands do, the chair he carries and throws, and Tanner. The band part hands the stage their company spans
 * from here; the room's drawing draws Fletcher's rig and the chair from the same functions.
 */

/* ------------------------------------------------------------------ paths through keys */

type Key = [number, number, number]

/** A path through timed keys, monotone cubic in each axis: it carries its speed through a key it passes on the same way, and rests on one it turns at or holds. */
function path(keys: Key[]): (T: number) => Pt {
  const n = keys.length
  const ts = keys.map((k) => k[0])
  const slopes = (ax: 1 | 2) => {
    const d = (i: number) => (keys[i + 1][ax] - keys[i][ax]) / (ts[i + 1] - ts[i])
    const m = new Array(n).fill(0)
    for (let i = 1; i < n - 1; i++) {
      const a = d(i - 1)
      const b = d(i)
      if (a * b <= 0) continue
      const h0 = ts[i] - ts[i - 1]
      const h1 = ts[i + 1] - ts[i]
      const w1 = 2 * h1 + h0
      const w2 = h1 + 2 * h0
      m[i] = (w1 + w2) / (w1 / a + w2 / b)
    }
    return m
  }
  const mx = slopes(1)
  const my = slopes(2)
  return (T: number): Pt => {
    if (T <= ts[0]) return [keys[0][1], keys[0][2]]
    if (T >= ts[n - 1]) return [keys[n - 1][1], keys[n - 1][2]]
    let i = 0
    while (i + 1 < n && ts[i + 1] <= T) i++
    const H = ts[i + 1] - ts[i]
    const u = (T - ts[i]) / H
    const h = (a: number, b: number, ma: number, mb: number) => {
      const u2 = u * u
      const u3 = u2 * u
      return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * H * ma + (-2 * u3 + 3 * u2) * b + (u3 - u2) * H * mb
    }
    return [h(keys[i][1], keys[i + 1][1], mx[i], mx[i + 1]), h(keys[i][2], keys[i + 1][2], my[i], my[i + 1])]
  }
}

/* ------------------------------------------------------------------ Fletcher: where he is */

const FLOOR_HEAD = PIT - FLETCHER_H
/** When he leaves his podium for the kit (Andrew is off the chart's ledge by then, ahead of him). */
export const LEAVE = 78.55
/**
 * For the test he stands up beside the kit, tall, just behind the hi-hat (his column's foot planted there,
 * `STAND_X`, the snare's right edge), towering over Andrew: his near hand (his right) reaches the snare's hoop; the far one
 * rests on his hip. He leans in from the planted foot: close at his ear for "rushing or dragging?", and a little
 * for the counts.
 */
export const STAND_X = KX + 0.85
const TEST_HEAD: Pt = [STAND_X, FLOOR_HEAD]
const CLOSE_HEAD: Pt = [KX + 0.58, FLOOR_HEAD + 0.24]
const GRAB_HEAD: Pt = [17.85, 0.1]
const CARRY_HEAD: Pt = [18.55, FLOOR_HEAD - 0.1]
const THROW_HEAD: Pt = [18.85, FLOOR_HEAD - 0.06]
const EAR_HEAD: Pt = [KX + 0.74, FLOOR_HEAD + 0.06]

const walkKeys: Key[] = [
  [BAND, ...FLETCHER_HOME],
  [LEAVE, ...FLETCHER_HOME],
  // Off the podium, and round behind the chair, the chart and the drums to stand over Andrew's shoulder.
  [LEAVE + 0.45, PODIUM.x + PODIUM.w / 2 + 0.25, FLOOR_HEAD],
  // Behind the drums (his head clear of the rack tom), to his place behind the hi-hat.
  [81.05, KX - 0.1, FLOOR_HEAD - 0.08],
  [81.75, ...TEST_HEAD],
  [LEAN, ...TEST_HEAD],
  [LEAN + 0.9, ...CLOSE_HEAD],
  [STEADY[0] - 0.1, ...CLOSE_HEAD],
  [STEADY[0] + 0.45, KX + 0.7, FLOOR_HEAD],
  // Away behind the drums to the chair, down to it, up with it, back toward the kit, the wind-up and the throw.
  [94.3, ...GRAB_HEAD],
  [94.55, ...GRAB_HEAD],
  [95.2, GRAB_HEAD[0] + 0.1, FLOOR_HEAD - 0.12],
  [96.95, ...CARRY_HEAD],
  [97.62, CARRY_HEAD[0] - 0.18, CARRY_HEAD[1] - 0.06],
  [THROW, ...THROW_HEAD],
  [THROW + 0.5, THROW_HEAD[0] + 0.12, THROW_HEAD[1] + 0.04],
  [CRASH + 0.2, THROW_HEAD[0] + 0.12, THROW_HEAD[1] + 0.04],
  // Back behind the drums, clear over the rack tom, and close at his ear for the counts.
  [100.55, KX - 0.35, FLOOR_HEAD - 0.08],
  [101.2, ...EAR_HEAD],
  [SLAP3 + 0.5, ...EAR_HEAD],
  [WITH[0] - 0.1, ...TEST_HEAD],
  [POINT + 0.6, ...TEST_HEAD],
  // Up, and back behind the drums to his podium.
  [POINT + 1.3, KX + 0.2, FLOOR_HEAD],
  [tune(290), PODIUM.x + PODIUM.w / 2 + 0.25, FLOOR_HEAD],
  [tune(291.5), ...FLETCHER_HOME],
  [QUIET, ...FLETCHER_HOME],
]
const walk = path(walkKeys)

/** What his column stands on under his head at `x`: the podium's top over the podium, else the pit floor. */
export function standsOn(x: number): number {
  const edge = PODIUM.x + PODIUM.w / 2
  return lerp(PODIUM_TOP, PIT, smooth(x, edge - 0.1, edge + 0.2))
}

/** Where Fletcher's head (his ball) is at `T`, band frame: the walk, the small bob of his time, and his glances. */
export function fletcherHead(T: number): Pt {
  let [x, y] = walk(T)
  // At the kit: his head goes in toward Andrew with each stop, and down hard with each slap, and eases back.
  for (const at of [STOP1, STOP2, SLAP1, SLAP2, SLAP3, STOP3]) {
    const a = T - (at - 0.06)
    if (a <= 0 || a > 1.6) continue
    const slap = at === SLAP1 || at === SLAP2 || at === SLAP3
    const hard = at === SLAP3 ? 1.4 : at === STOP3 ? 1.2 : 1
    const j = hard * (1 - Math.exp(-a / 0.05)) * Math.exp(-a / 0.35)
    x -= (slap ? 0.12 : 0.1) * j
    y += (slap ? 0.14 : 0.07) * j
  }
  if (conducting(T)) {
    // Keeping time: a nod into each ictus.
    const u = ((T - TUNE_ORIGIN) / TUNE_PERIOD) % 1
    y += 0.025 * Math.exp(-u / 0.12) * (0.6 + 0.4 * level(T))
    // The glare: his head snaps down toward the ball at his feet, and holds; then back.
    const g = smooth(T, BUMP - 0.04, BUMP + 0.06) * (1 - smooth(T, THERE + 0.3, THERE + 1.2))
    x -= 0.2 * g
    y += 0.2 * g
    // Glances at the page turner as each page goes over, and on the tutti's breath.
    for (const turn of TURNS) {
      if (turn.page === undefined) continue
      const a = smooth(T, turn.page - 0.9, turn.page - 0.4) * (1 - smooth(T, turn.page + 0.3, turn.page + 1.1))
      x += 0.1 * a
      y += 0.03 * a
    }
    // "You": he leans toward Andrew as he points.
    const you = smooth(T, YOU - 0.1, YOU + 0.15) * (1 - smooth(T, OFF, OFF + 0.4))
    x += 0.1 * you
  }
  return [x, y]
}

/**
 * Where his column's foot is across the room at `T`: under his head, except at the kit for the test, where it stays
 * planted behind the hi-hat and he leans in from it.
 */
export function fletcherBase(T: number): number {
  const x = walk(T)[0]
  const planted =
    smooth(T, 81.55, 81.8) * (1 - smooth(T, STEADY[0] - 0.1, STEADY[0] + 0.25)) + smooth(T, 100.9, 101.3) * (1 - smooth(T, POINT + 0.6, POINT + 0.95))
  return lerp(x, STAND_X, planted)
}

/** Fletcher's column stands on this (the podium's top or the pit floor), at `T`. */
export const fletcherFloor = (T: number): number => standsOn(fletcherBase(T))

/** How far his chest is tipped off upright by the lean from his planted foot (as `drawConductor` tips it). */
function leanOf(T: number): number {
  const [hx, hy] = fletcherHead(T)
  return Math.atan2(fletcherFloor(T) - hy, fletcherBase(T) - hx) - Math.PI / 2
}

/** While he is on his podium, conducting the band. */
export const conducting = (T: number): boolean => T < LEAVE || T > tune(291.3)

/* ------------------------------------------------------------------ Fletcher: his hands */

const arm = (up: number, bend: number, wrist: number, hand: HandShape): ArmPose => ({ up, bend, wrist, hand })

/** The shoulders under a head. */
export const shoulders = (head: Pt): { right: Pt; left: Pt } => ({
  right: [head[0] - RIG.shoulder, head[1] + RIG.drop],
  left: [head[0] + RIG.shoulder, head[1] + RIG.drop],
})

/**
 * An arm reaching its wrist to `target` from `shoulder` (two links, the elbow on the side that keeps it up), the
 * hand pointing along `dir` (radians) in `shape`.
 */
export function reach(shoulder: Pt, target: Pt, dir: number, shape: HandShape, elbow: 'up' | 'down' = 'up'): ArmPose {
  const U = RIG.upper
  const F = RIG.fore
  const dx = target[0] - shoulder[0]
  const dy = target[1] - shoulder[1]
  const d = clamp(Math.hypot(dx, dy), Math.abs(U - F) + 0.02, U + F - 0.002)
  const base = Math.atan2(dy, dx)
  const a = Math.acos(clamp((U * U + d * d - F * F) / (2 * U * d), -1, 1))
  const pick = (up: number) => {
    const e: Pt = [shoulder[0] + Math.cos(up) * U, shoulder[1] + Math.sin(up) * U]
    const fa = Math.atan2(target[1] - e[1], target[0] - e[0])
    return { up, e, fa }
  }
  const s1 = pick(base - a)
  const s2 = pick(base + a)
  const s = (s1.e[1] <= s2.e[1]) === (elbow === 'up') ? s1 : s2
  return arm(s.up, s.fa - s.up, dir - s.fa, shape)
}

/** Where a wrist is for an arm pose from a shoulder (the drawing's own sum). */
export function wristOf(shoulder: Pt, a: ArmPose): Pt {
  const e: Pt = [shoulder[0] + Math.cos(a.up) * RIG.upper, shoulder[1] + Math.sin(a.up) * RIG.upper]
  const fa = a.up + a.bend
  return [e[0] + Math.cos(fa) * RIG.fore, e[1] + Math.sin(fa) * RIG.fore]
}

/** The snare's head in the band's frame: where the palm comes down flat, just left of the ball, and the hoop by his ear. */
const PALM: Pt = [KX + 0.64, KY - 0.02]
const HOOP: Pt = [KX + 0.62, KY - 0.0]
/** The top of his hand's stroke over the snare. */
const TOP: Pt = [KX + 0.7, KY - 0.5]
/** The counts: his open palm up over Andrew's head, fingers up. */
const RAISED: Pt = [KX + 0.14, KY - 1.18]
/** His far hand on his hip (his left, on the house's right): the upper arm out, the forearm back in to the waist. */
const AKIMBO: ArmPose = { up: 1.0, bend: 1.414, wrist: -0.84, hand: 'beat' }

/** His beating hand over the snare: down to the head's height on each `ictus`, a quick lift, a float back up. */
function patHand(T: number, ictus: (T: number) => number, size = 1): Pt {
  const u = ictus(T)
  const lift = u < 0.1 ? 1 - u / 0.1 : Math.pow(Math.sin(((u - 0.1) / 0.9) * Math.PI * 0.5), 0.7)
  return [lerp(PALM[0] - 0.02, TOP[0], lift), lerp(PALM[1] - 0.06, TOP[1], lift * size + (1 - size) * 0.4)]
}
/** Phase in beats from the tune's clock: 0 on each beat. */
const onBeat = (T: number): number => {
  const k = (T - TUNE_ORIGIN) / TUNE_PERIOD
  return k - Math.floor(k)
}

/** Fletcher's pose at `T`: conducting, pointing, testing, carrying, throwing, slapping. */
export function fletcherPose(T: number): Pose {
  const head = fletcherHead(T)
  const sh = shoulders(head)
  const beatAt = (size: number) => conduct(T, head, size)
  const size = 0.55 + 0.45 * level(T)

  // On the podium: the band's time, with his cues.
  if (T < LEAVE) {
    let pose = beatAt(size)
    // The tutti: bigger, and both hands flung up on the biggest hit, held through the breath.
    if (T > TUTTI - 0.3 && T < BREATH + 0.3) pose = beatAt(Math.min(1.15, size + 0.3))
    const flung: Pose = { right: arm(-Math.PI * 0.72, 0.35, -0.1, 'open'), left: arm(-Math.PI * 0.28, -0.35, 0.1, 'open') }
    const up = smooth(T, PEAK - 0.1, PEAK) * (1 - smooth(T, BREATH - 0.05, BREATH + 0.25))
    if (up > 0) pose = blendPose(pose, flung, up)
    // "There": his left hand points him to his place.
    const there = smooth(T, THERE - 0.15, THERE + 0.05) * (1 - smooth(T, THERE + 1.2, THERE + 1.8))
    if (there > 0) pose = { ...pose, left: blend(pose.left, pointFrom(sh.left, [16.7, 1.6]), there) }
    // "You", then the kit: "off".
    const you = smooth(T, YOU - 0.15, YOU + 0.05) * (1 - smooth(T, OFF - 0.1, OFF + 0.1))
    const off = smooth(T, OFF - 0.1, OFF + 0.1) * (1 - smooth(T, TANNER_DOWN - 0.2, TANNER_DOWN + 0.4))
    if (you > 0) pose = { ...pose, left: blend(pose.left, pointFrom(sh.left, heroBand(T)), you) }
    if (off > 0) pose = { ...pose, left: blend(pose.left, pointFrom(sh.left, [KX, KY - 0.1]), off) }
    return pose
  }

  // Back on his podium after the test.
  if (conducting(T)) return blendPose(POSES.rest, beatAt(size), smooth(T, tune(291.3), tune(292.5)))

  // Walking to the kit.
  if (T < 81.2) return blendPose(beatAt(size), POSES.rest, smooth(T, LEAVE - 0.1, LEAVE + 0.4))

  const rest = POSES.rest
  // At the kit his chest leans off the planted column: a target is taken into the leaning chest's frame first.
  const lean = leanOf(T)
  const into = (q: Pt): Pt => {
    const dx = q[0] - head[0]
    const dy = q[1] - head[1]
    const c = Math.cos(-lean)
    const s = Math.sin(-lean)
    return [head[0] + dx * c - dy * s, head[1] + dx * s + dy * c]
  }
  /** His near hand (his right, toward Andrew) at `target`; the far one on his hip, out of the way. */
  const near = (target: Pt, dir: number, shape: HandShape, u = 1): Pose => ({
    right: blend(rest.right, reach(sh.right, into(target), dir - lean, shape), u),
    left: blend(rest.left, AKIMBO, u),
  })

  // Trials one and two: his near hand counts in and keeps time over the snare; the palm comes down flat on each stop.
  if (T < STEADY[0] - 0.2) {
    const inn = smooth(T, 81.2, 81.6)
    let target = patHand(T, onBeat)
    let shape: HandShape = 'beat'
    let dir = Math.PI - 0.3
    for (const [stop, again] of [[STOP1, AGAIN1], [STOP2, LEAN + 0.4]] as const) {
      const down = smooth(T, stop - 0.09, stop)
      const up = smooth(T, again - 0.25, again)
      if (T > stop - 0.09 && T < again) {
        target = [lerp(target[0], PALM[0], down), lerp(target[1], PALM[1], down)]
        target = [lerp(target[0], TOP[0], up), lerp(target[1], TOP[1], up)]
        shape = down > 0.5 ? 'open' : shape
        dir = lerp(dir, Math.PI + 0.02, down)
      }
    }
    // Leaning in close, his hand open and hovering over the drum: rushing or dragging?
    const hover = smooth(T, LEAN + 0.3, LEAN + 1.0)
    if (hover > 0) {
      target = [lerp(target[0], KX + 0.56, hover), lerp(target[1], KY - 0.28, hover)]
      shape = 'open'
      dir = lerp(dir, Math.PI + 0.2, hover)
    }
    return near(target, dir, shape, inn)
  }

  // Trial three: he leaves the hand and goes for the chair.
  if (T < 94.2) return blendPose(near(TOP, Math.PI - 0.2, 'open'), rest, smooth(T, STEADY[0] - 0.2, STEADY[0] + 0.5))
  if (T < CRASH + 0.4) {
    const grip = chairGrip(T)
    const rightDir = Math.atan2(grip[1] - sh.right[1], grip[0] - sh.right[0])
    const r = reach(sh.right, grip, rightDir + 0.4, 'open')
    const reachIn = smooth(T, 93.6, 94.3)
    // Both hands on it once it is up; open, and flung on through after it goes.
    const both = smooth(T, 95.0, 95.6) * (T < THROW ? 1 : 0)
    const l = reach(sh.left, [grip[0] + 0.14, grip[1] + 0.05], rightDir + 0.2, 'open')
    if (T < THROW) return { right: blend(rest.right, r, reachIn), left: blend(rest.left, l, both) }
    const after = smooth(T, THROW, THROW + 0.18)
    const through: Pose = { right: arm(-0.35, 0.3, 0.1, 'open'), left: arm(-0.15, 0.2, 0.05, 'open') }
    const settle = smooth(T, THROW + 0.5, CRASH + 0.4)
    return blendPose(blendPose({ right: r, left: l }, through, after), rest, settle * 0.6)
  }

  // The counts: his open palm raised by Andrew's ear, chopping down with him on one, two, three; on four a wind-up,
  // high and back, and the palm slapped down flat on the hoop by his ear.
  const counting = (): Pose => {
    const raise = smooth(T, 100.3, 101.1)
    let target: Pt = [...RAISED]
    let dir = -Math.PI / 2 - 0.35
    for (const c of [...COUNT1, ...COUNT2]) {
      const chop = smooth(T, c - 0.09, c) * (1 - smooth(T, c + 0.03, c + 0.34))
      target = [target[0] - 0.03 * chop, target[1] + 0.16 * chop]
    }
    for (const s of [SLAP1, SLAP2, SLAP3]) {
      const wind = smooth(T, s - 0.6, s - 0.14) * (1 - smooth(T, s - 0.12, s))
      const hit = smooth(T, s - 0.1, s) * (1 - smooth(T, s + 0.45, s + 1.1))
      target = [target[0] + 0.14 * wind, target[1] - 0.34 * wind]
      target = [lerp(target[0], HOOP[0], hit), lerp(target[1], HOOP[1], hit)]
      dir = lerp(dir - 0.3 * wind, Math.PI + 0.05, hit)
    }
    return near(target, dir, 'open', raise)
  }
  if (T < WITH[0] - 0.3) return counting()

  // Trial four: in time with him, stroke for stroke, to the last stop; then his far hand points him off, at Tanner.
  if (T < POINT + 1.3) {
    const inn = smooth(T, WITH[0] - 0.3, WITH[0])
    let target = patHand(T, onBeat)
    let shape: HandShape = 'beat'
    let dir = Math.PI - 0.3
    const down = smooth(T, STOP3 - 0.09, STOP3)
    if (down > 0) {
      target = [lerp(target[0], PALM[0], down), lerp(target[1], PALM[1], down)]
      shape = down > 0.5 ? 'open' : shape
      dir = lerp(dir, Math.PI + 0.02, down)
    }
    // From where the counts leave his palm (on the hoop after the last slap) into the time.
    let pose = blendPose(counting(), near(target, dir, shape), inn)
    const point = smooth(T, POINT - 0.2, POINT + 0.05)
    if (point > 0) pose = { ...pose, left: blend(pose.left, pointFrom(sh.left, into(TANNER_ASIDE)), point) }
    return pose
  }

  // Walking back to his podium.
  return rest
}

/**
 * Conducting: both hands out at his sides at chest height, elbows down. The right hand (toward the band) beats the
 * tune's half notes: down into each ictus, a quick rebound, a float back up, a little in and out across the bar;
 * the left, toward the rhythm section, keeps a smaller time.
 */
function conduct(T: number, _head: Pt, size: number): Pose {
  // The house's beat pattern (small and tight at the chest), on the tune's beats, sized by the band.
  return beatPose((T - TUNE_ORIGIN) / TUNE_PERIOD, Math.min(1, size))
}

/** An arm pointing from `shoulder` at `target`, straight. */
function pointFrom(shoulder: Pt, target: Pt): ArmPose {
  const a = Math.atan2(target[1] - shoulder[1], target[0] - shoulder[0])
  return arm(a - 0.12, 0.14, -0.02, 'point')
}

function blend(a: ArmPose, b: ArmPose, u: number): ArmPose {
  return blendPose({ left: a, right: a }, { left: b, right: b }, easeInOutSine(clamp(u))).left
}

/* ------------------------------------------------------------------ the chair */

/**
 * The alternate's chair: by the stand, facing it, until Fletcher takes it by its back rail (94.5); carried, swung
 * back, thrown on 228 (it flies over Andrew, ducked behind the snare, and hits the wall behind the kit on 229½);
 * down behind the drums on 231, on its side, where it lies. `x, y` is the middle of its seat; `turn` its roll;
 * `scale` smaller as it goes back toward the wall; `behind` once it is behind the kit.
 */
export interface ChairState {
  x: number
  y: number
  turn: number
  scale: number
  /** Past his hands: flying back over the kit, or down behind it. Drawn behind the drums. */
  behind: boolean
  /** In Fletcher's hand (drawn under his rig, so his hand is on its rail). */
  held: boolean
}

/** The top of its back, where a hand takes it, from the seat's middle (the chair faces left: its back is on the right). */
export const GRIP: Pt = [0.42, -(BACK_H - SEAT_H)]
const turnPt = (p: Pt, a: number, s = 1): Pt => [(p[0] * Math.cos(a) - p[1] * Math.sin(a)) * s, (p[0] * Math.sin(a) + p[1] * Math.cos(a)) * s]

const REST: ChairState = { x: CHAIR_X, y: PIT - SEAT_H, turn: 0, scale: 1, behind: false, held: false }
/** The grip as it rests. */
const GRIP_REST: Pt = [REST.x + GRIP[0], REST.y + GRIP[1]]

/** Where his right hand has the chair's back rail at `T` (while he has it). */
function chairGrip(T: number): Pt {
  const head = fletcherHead(T)
  const sh = shoulders(head)
  // Reaching down to it, then lifting it clear; carried at his side; swung back and up; flung forward.
  const lift = smooth(T, 94.55, 95.2)
  const carried: Pt = [sh.right[0] - 0.2, sh.right[1] + 0.62]
  const back: Pt = [sh.right[0] - 0.5, sh.right[1] - 0.2]
  const fling: Pt = [sh.right[0] + 0.55, sh.right[1] - 0.52]
  const wind = smooth(T, 96.95, 97.62)
  const go = smooth(T, 97.62, THROW)
  let p: Pt = [lerp(GRIP_REST[0], carried[0], lift), lerp(GRIP_REST[1], carried[1], lift)]
  p = [lerp(p[0], back[0], wind), lerp(p[1], back[1], wind)]
  p = [lerp(p[0], fling[0], go), lerp(p[1], fling[1], go)]
  return p
}
/** How the chair turns in his hand: hanging, swung back, flung over. */
function chairTurnHeld(T: number): number {
  return 0.1 * smooth(T, 94.55, 95.2) + 0.55 * smooth(T, 96.95, 97.62) - 1.0 * smooth(T, 97.62, THROW)
}

function heldChair(T: number): ChairState {
  const g = chairGrip(T)
  const turn = chairTurnHeld(T)
  const off = turnPt(GRIP, turn)
  return { x: g[0] - off[0], y: g[1] - off[1], turn, scale: 1, behind: false, held: true }
}

/** Where it flies from, hits, and lies. */
export const RELEASE: ChairState = heldChair(THROW)
export const IMPACT: Pt = [23.2, -0.85]
export const LIES: Pt = [23.05, PIT - 0.4]

export function chairAt(T: number): ChairState {
  if (T < 94.55) return REST
  if (T < THROW) return heldChair(T)
  if (T < WALL) {
    const u = (T - THROW) / (WALL - THROW)
    const x = RELEASE.x + (IMPACT[0] - RELEASE.x) * u
    const y = RELEASE.y + (IMPACT[1] - RELEASE.y) * u - 0.3 * 4 * u * (1 - u)
    return { x, y, turn: RELEASE.turn + 3.0 * u, scale: 1 - 0.22 * u, behind: true, held: false }
  }
  if (T < CRASH) {
    // Off the wall: knocked back a little, and down under gravity, turning onto its side.
    const u = (T - WALL) / (CRASH - WALL)
    const x = IMPACT[0] + (LIES[0] - IMPACT[0]) * easeOutQuad(u)
    const y = IMPACT[1] - 0.18 * Math.sin(Math.PI * Math.min(1, u * 1.6)) + (LIES[1] - IMPACT[1]) * u * u
    const t0 = RELEASE.turn + 3.0
    return { x, y, turn: t0 + (Math.PI * 1.5 - (t0 % (Math.PI * 2))) * easeInOutSine(u), scale: 0.78, behind: true, held: false }
  }
  // Down on its side: a heavy rock, settling.
  const a = T - CRASH
  const rock = 0.1 * Math.exp(-a / 0.22) * Math.sin(a * 17)
  return { x: LIES[0], y: LIES[1], turn: Math.PI * 1.5 + rock, scale: 0.78, behind: true, held: false }
}

/* ------------------------------------------------------------------ Tanner */

const SNARE_AT: Pt = kitLand('snare')
const TANNER_LANDS: Pt = [KX + 1.9, PIT_Y]

/** Tanner at `T` (band frame): on his kit, bobbing to his own playing; off it, aside; up over Andrew, back on. */
export function tannerAt(T: number): Pt {
  if (T < TANNER_OFF) return onKit(T)
  if (T < TANNER_DOWN) {
    // A hop down off the snare's far side, over the hi-hat's foot, to the floor.
    const u = (T - TANNER_OFF) / (TANNER_DOWN - TANNER_OFF)
    const arc = (12 * (TANNER_DOWN - TANNER_OFF) ** 2) / 8
    return [lerp(SNARE_AT[0], TANNER_LANDS[0], u), lerp(SNARE_AT[1], TANNER_LANDS[1], u) - arc * 4 * u * (1 - u)]
  }
  if (T < TANNER_GO) {
    // Aside, by the far wall: out of the way, watching; a flinch back when the chair comes down.
    const x = lerp(TANNER_LANDS[0], TANNER_ASIDE[0], easeInOutSine(clamp((T - TANNER_DOWN) / 1.2)))
    const flinch = 0.12 * smooth(T, CRASH - 0.05, CRASH + 0.1) * (1 - smooth(T, CRASH + 0.6, CRASH + 2))
    // Back to where he hops from, a step closer to the kit, as Fletcher points to him.
    const ready = 0.05 * smooth(T, POINT, POINT + 1)
    return [x + flinch - ready, PIT_Y]
  }
  if (T < TANNER_ON) {
    const from: Pt = [TANNER_ASIDE[0] - 0.05, PIT_Y]
    const u = (T - TANNER_GO) / (TANNER_ON - TANNER_GO)
    const arc = (7.5 * (TANNER_ON - TANNER_GO) ** 2) / 8
    return [lerp(from[0], SNARE_AT[0], u), lerp(from[1], SNARE_AT[1], u) - arc * 4 * u * (1 - u)]
  }
  return onKit(T)
}

/**
 * On the snare, playing: a real bounce off the head between his strokes (a beat apart, the band's time, and the
 * band's hits between), landing on each one; the head gives a little under him as it answers.
 */
function onKit(T: number): Pt {
  const since = sinceStroke('snare', T)
  const dip = since < 0.5 ? 0.03 * Math.exp(-since / 0.07) * (1 - Math.exp(-since / 0.012)) : 0
  let bounce = 0
  const list = BY_PIECE.get('snare') ?? []
  const j = list.findIndex((t) => t > T)
  if (j > 0 && (T < TANNER_OFF - 0.02 || T > TANNER_ON + 0.02)) {
    const a = list[j - 1]
    const b = list[j]
    const gap = b - a
    // A stroke a beat or less apart is one bounce; a longer rest sits on the head and lifts off for the next.
    const lift = Math.min(gap, 0.46)
    const u = (T - (b - lift)) / lift
    if (u > 0 && gap > 0.09) bounce = Math.min(0.13, Math.max(0.045, 0.28 * lift)) * 4 * u * (1 - u)
  }
  // He reads his chart, to his left, as a page is due; and once, a long look at the alternate keeping time on
  // his chair (70 to 72.5).
  let look = 0
  for (const turn of TURNS) if (turn.page !== undefined) look += smooth(T, turn.page - 1.4, turn.page - 0.8) * (1 - smooth(T, turn.page, turn.page + 0.6))
  look += 1.6 * smooth(T, 70.0, 70.5) * (1 - smooth(T, 72.2, 73.0))
  return [SNARE_AT[0] - 0.05 * Math.min(1.6, look), SNARE_AT[1] + dip - bounce]
}

/* ------------------------------------------------------------------ the kit */

/**
 * Every stroke on the band room's kit, both parts through: Tanner's time (the ride on each beat, the snare and kick
 * on the band's hits, the crash on the biggest), Andrew's fill onto it, every stroke of the test, the chair
 * coming down behind it, and Tanner's playing once he has it back.
 */
function strokes(): { t: number; piece: KitPiece }[] {
  const out: { t: number; piece: KitPiece }[] = []
  const tanner = (a: number, b: number) => {
    // His time: a stroke on the snare every beat, his own (he is the ball on it). The band's hits between.
    const beats: number[] = []
    for (let k = Math.ceil((a - TUNE_ORIGIN) / TUNE_PERIOD); tune(k) < b; k++) beats.push(tune(k))
    for (const t of beats) out.push({ t, piece: 'snare' })
    for (const o of bandHits(a, b, 0.9)) {
      if (o.mid >= 0.8 && beats.every((t) => Math.abs(t - o.t) > 0.1)) out.push({ t: o.t, piece: 'snare' })
      if (o.mid >= 0.8 && o.s >= 1.2) out.push({ t: o.t, piece: 'ride' })
      if (o.lo >= 0.7) out.push({ t: o.t, piece: 'kick' })
      if (o.s >= 1.5) out.push({ t: o.t, piece: 'crash' })
    }
  }
  tanner(BAND, TANNER_OFF - 0.05)
  const pieces: KitPiece[] = ['floor', 'floor', 'rack', 'rack', 'snare']
  FILL.forEach((t, i) => out.push({ t, piece: pieces[i] }))
  for (const t of [...RUSH, STOP1, ...DRAG, STOP2, ...STEADY, DUCK, ...COUNT1, SLAP1, ...COUNT2, SLAP2, SLAP3, ...WITH, STOP3]) out.push({ t, piece: 'snare' })
  for (const t of [WALL, CRASH]) {
    out.push({ t, piece: 'crash' })
    out.push({ t, piece: 'ride' })
    out.push({ t, piece: 'hat' })
  }
  tanner(TANNER_ON, QUIET)
  out.push({ t: TANNER_ON, piece: 'snare' })
  return out.sort((a, b) => a.t - b.t)
}
export const ROOM_KIT = strokes()
const BY_PIECE = new Map<KitPiece, number[]>()
for (const s of ROOM_KIT) {
  if (!BY_PIECE.has(s.piece)) BY_PIECE.set(s.piece, [])
  BY_PIECE.get(s.piece)!.push(s.t)
}
/** Seconds since `piece` was last struck at `T`, Infinity if never. */
export function sinceStroke(piece: KitPiece, T: number): number {
  const list = BY_PIECE.get(piece)
  if (!list || !list.length || list[0] > T) return Infinity
  let lo = 0
  let hi = list.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (list[mid] <= T) lo = mid
    else hi = mid - 1
  }
  return T - list[lo]
}

/** Where Andrew is at `T`, whichever part has him (band frame). */
export const heroAt = (T: number): Pt => (T < TEMPO ? heroBand(T) : heroTempo(T))

/** How high his head rides when he stands on the pit floor. */
export { FLOOR_HEAD }
