import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutBack, easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import type { Theme } from '../../../../../src/core/themes'
import { FLOOR, R, ROLL, definePiece, laneAt, laneTime, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, luminance, water } from './sea'

/**
 * A sandcastle. For one cell the pier gives way to a sandbank, an island
 * of sand standing out of the sea as high as the deck, and a sandcastle
 * stands on it in the ball's way: two round
 * towers with a wall between, crenellated, a flag on the far tower. The
 * ball runs into the near tower and does not stop, and the castle goes
 * part by part as the ball gets to it. The near tower cracks into its
 * courses and they are thrown up and on, turning; the wall's top goes
 * after them; the far tower bursts last and flings the flag off its head.
 * Sand sprays up from each blow, a bow wave of it rides ahead of the ball
 * and a furrow is left behind. The blocks come down and break into lumps,
 * the lumps hop and break again; the near tower's cap lands whole on the
 * ruin, battlements and all. Then the flag comes down out of its spin and
 * sticks in the heap, quivering, and the jolt is too much for the cap:
 * its battlements crumble, it slumps, sand runs down the heap's sides and
 * the whole ruin settles. Some time later the castle is patted back up
 * out of the heap, tower by tower, and lifts the flag with it.
 */
/** The castle: the towers' footprints and height, the wall's, the merlons on top. */
const T0 = -0.11
const T1 = 0.21
const TW = 0.18
const TOWER_H = 0.38
const WALL_H = 0.22
const MERLON = 0.05
/** Where the ball first meets it, and how slow the sand makes it. */
const HIT = T0 - 0.13
const V_SAND = 1.1
const FIRE = (HIT + 0.5) / ROLL
/** The flag on the far tower. */
const POLE = 0.17
/** The bank's top runs this far either side; its flanks go down into the sea from there, and a plank of deck bridges each. */
const BANK = 0.37

/** How sandy a colour is: what yellow has over its blue. */
const sandy = (hex: string) => Math.min(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16)) - parseInt(hex.slice(5, 7), 16)
/** Sand is sand-coloured: the palette's sandiest colour that is not the ball's and stands off the paper; failing one, a body's colour. */
function sandColor(theme: Theme, color: string, ball: string): string {
  const paper = luminance(theme.bg)
  const sand = theme.colors.filter((c) => c !== ball && sandy(c) > 60 && Math.abs(luminance(c) - paper) > 0.12).sort((a, b) => sandy(b) - sandy(a))[0]
  return sand ?? bodyColor(theme, color, ball)
}

const LANE: Lane = {
  segs: [roll([-0.5, 0], [HIT, 0], ROLL), ramp([HIT, 0], [0.3, 0], ROLL, V_SAND), ramp([0.3, 0], [0.5, 0], V_SAND, ROLL)],
  fire: FIRE,
}

/** Where the ball is, `since` the fire: at the cell's edge before it comes and after it has gone. */
const ballX = (since: number) => laneAt(LANE, since + FIRE).x
/** Seconds after the fire at which the ball's front gets to `x`. */
function reach(x: number): number {
  let lo = 0
  let hi = laneTime(LANE)
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (laneAt(LANE, mid).x + R < x) lo = mid
    else hi = mid
  }
  return hi - FIRE
}

/** The three parts, in the order the ball meets them: where each stands, how high, and when the ball's front reaches its face. */
const NEAR = { x0: T0, w: TW, h: TOWER_H, at: reach(T0) }
const WALL = { x0: T0 + TW - 0.01, w: T1 - T0 - TW + 0.02, h: WALL_H, at: reach(T0 + TW) }
const FAR = { x0: T1, w: TW, h: TOWER_H, at: reach(T1) }
/** The course of each the ball goes through; what stands on it is thrown off whole. */
const COURSE = 0.13
const WALL_COURSE = 0.12

/** Sand falls slowly enough to follow. */
const G = 4.6
/** Nothing thrown leaves the cell: this far inside its edges. */
const EDGE = 0.46
const hash = (i: number, s: number) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return v - Math.floor(v)
}
/** How long a thing thrown up at `vy` from `y0` takes to come down to `land`. */
const flight = (y0: number, vy: number, land: number) => (-vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, land - y0))) / G
/** A throw held inside the cell: no higher than its roof, no further than its edges by the time it lands. */
function held(x: number, y: number, vx: number, vy: number, land: number, size: number): [number, number, number] {
  const up = -Math.min(-vy, Math.sqrt(2 * G * Math.max(0, y + EDGE - size)))
  const dur = flight(y, up, land)
  return [clamp(vx, (-EDGE + size - x) / dur, (EDGE - size - x) / dur), up, dur]
}

/** The ruin: humps of sand, each its middle, its half-width, its height, and when it is laid down (0 for what the ball leaves as it passes). */
const RUIN: [number, number, number, number][] = [
  [-0.2, 0.1, 0.03, 0],
  [-0.05, 0.17, 0.085, 0],
  [0.05, 0.07, 0.03, 0],
  [0.13, 0.15, 0.06, 0],
  [0.3, 0.17, 0.095, 0],
  [0.4, 0.07, 0.03, 0],
]
/** The near lip of the furrow, in front of the ball's path: lower, and left behind it as it goes. */
const LIP: [number, number, number][] = [
  [-0.12, 0.16, 0.04],
  [0.08, 0.13, 0.03],
  [0.27, 0.18, 0.042],
]

/** A grain of sand in the air. */
interface Grain {
  x: number
  y: number
  at: number
  vx: number
  vy: number
  r: number
  dur: number
}
const GRAINS: Grain[] = []
/** A spray: `n` grains from round (x, y) at `at`, fanned from angle `a0` to `a1`, at speeds from `v0` to `v1`. */
function spray(seed: number, n: number, x: number, y: number, dx: number, dy: number, at: number, a0: number, a1: number, v0: number, v1: number): void {
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + hash(i, seed))) / n
    const v = v0 + (v1 - v0) * hash(i, seed + 1)
    const gx = x + dx * (hash(i, seed + 2) - 0.5)
    const gy = y + dy * (hash(i, seed + 3) - 0.5)
    const r = 0.011 + 0.009 * hash(i, seed + 4)
    const [vx, vy, dur] = held(gx, gy, Math.cos(a) * v, Math.sin(a) * v, FLOOR - r, r)
    GRAINS.push({ x: gx, y: gy, at: at + 0.04 * hash(i, seed + 5), vx, vy, r, dur })
  }
}

/** A lump of wet sand: thrown, it lands and either breaks in two or hops once and lies there. */
interface Lump {
  x: number
  y: number
  at: number
  vx: number
  vy: number
  r: number
  dur: number
  turn: number
  breaks: boolean
  /** The hop after landing: how long, how high, how far. */
  hop: [number, number, number]
}
const LUMPS: Lump[] = []
function lump(seed: number, x: number, y: number, at: number, vx0: number, vy0: number, r: number): void {
  const ground = FLOOR - r * 0.7
  const [vx, vy, dur] = held(x, y, vx0, vy0, ground, r)
  const breaks = r > 0.036
  const lx = x + vx * dur
  const far = clamp(vx * 0.12, -0.05, 0.05)
  const hop: [number, number, number] = [0.2 + 0.06 * hash(seed, 1), 0.035 + 0.03 * hash(seed, 2), clamp(lx + far, -EDGE + r, EDGE - r) - lx]
  LUMPS.push({ x, y, at, vx, vy, r, dur, turn: (1 + Math.floor(hash(seed, 3) * 3)) * (Math.PI / 2) * Math.sign(vx || 1) + 0.5 * (hash(seed, 4) - 0.5), breaks, hop })
  if (!breaks) return
  // What it breaks into: two smaller, one on and one back, and a puff of grains.
  lump(seed + 17, lx, ground, at + dur, 0.28 + 0.2 * hash(seed, 5), -0.75, r * 0.62)
  lump(seed + 31, lx, ground, at + dur, -0.2 - 0.15 * hash(seed, 6), -0.6, r * 0.55)
  spray(seed + 47, 3, lx, ground, 0.03, 0.01, at + dur, -2.4, -0.7, 0.4, 0.75)
}

/** A block of the castle thrown off whole: a course of a tower, a cap with its merlons, the top of the wall. */
interface Block {
  x: number
  y: number
  w: number
  h: number
  /** Which merlons it carries: the near one, the far one. */
  merlons: [boolean, boolean]
  at: number
  vx: number
  vy: number
  dur: number
  turn: number
  /** It lands whole and sits on the ruin, rather than breaking. */
  sits: boolean
}
const BLOCKS: Block[] = []
function block(seed: number, x: number, y: number, w: number, h: number, merlons: [boolean, boolean], at: number, vx0: number, vy0: number, turn: number, rest: number, sits = false): Block {
  const [vx, vy, dur] = held(x, y, vx0, vy0, FLOOR - rest, Math.hypot(w, h) / 2)
  const b: Block = { x, y, w, h, merlons, at, vx, vy, dur, turn, sits }
  BLOCKS.push(b)
  if (sits) return b
  // It breaks where it lands: lumps on and back, a puff of grains, and a hump more on the ruin.
  const lx = x + vx * dur
  lump(seed, lx, FLOOR - rest, at + dur, 0.32, -0.8, Math.min(0.045, w * 0.26))
  lump(seed + 5, lx, FLOOR - rest, at + dur, -0.26, -0.65, Math.min(0.034, w * 0.2))
  spray(seed + 9, 5, lx, FLOOR - rest, 0.08, 0.02, at + dur, -2.6, -0.55, 0.45, 0.9)
  RUIN.push([lx, 0.09, 0.028, at + dur])
  return b
}

// The near tower: its middle course on over the wall, its cap up and on to land whole where the wall stood.
block(1, NEAR.x0 + TW / 2, FLOOR - COURSE - 0.065, TW, 0.13, [false, false], NEAR.at, 0.36, -1.35, 2.5 * Math.PI, 0.06)
const CAP = block(2, NEAR.x0 + TW / 2, FLOOR - 0.26 - 0.06, TW, 0.12, [true, true], NEAR.at, 0.2, -1.22, 2 * Math.PI - 0.2, 0.095, true)
// The wall's top, on toward where the far tower stood.
block(3, WALL.x0 + WALL.w / 2, FLOOR - WALL_COURSE - 0.05, WALL.w, 0.1, [false, false], WALL.at, 0.27, -1.15, 1.5 * Math.PI, 0.05)
// The far tower: its middle course up and back over the ruin, its cap split in two, a merlon each, one back and one on.
block(4, FAR.x0 + TW / 2, FLOOR - COURSE - 0.065, TW, 0.13, [false, false], FAR.at, -0.42, -1.5, -2.5 * Math.PI, 0.06)
block(5, FAR.x0 + TW / 4, FLOOR - 0.26 - 0.06, TW / 2, 0.12, [true, false], FAR.at, -0.62, -1.05, -1.5 * Math.PI, 0.05)
block(6, FAR.x0 + (TW * 3) / 4, FLOOR - 0.26 - 0.06, TW / 2, 0.12, [false, true], FAR.at, 0.12, -1.3, 1.5 * Math.PI, 0.05)

// Loose lumps knocked out of each part, and the sand each blow throws up: the near tower's both ways, the rest up and on.
lump(11, NEAR.x0 + 0.05, -0.02, NEAR.at + 0.01, -0.5, -0.95, 0.04)
lump(12, NEAR.x0 + 0.12, 0.02, NEAR.at + 0.02, 0.62, -1.1, 0.032)
lump(13, WALL.x0 + 0.08, 0.0, WALL.at + 0.01, 0.4, -1.4, 0.042)
lump(14, FAR.x0 + 0.1, 0.0, FAR.at + 0.01, 0.16, -1.0, 0.03)
lump(15, FAR.x0 + 0.06, -0.04, FAR.at + 0.02, -0.2, -1.6, 0.034)
spray(21, 12, NEAR.x0 + 0.07, -0.02, 0.14, 0.22, NEAR.at, -2.75, -0.6, 0.8, 1.7)
spray(22, 8, WALL.x0 + 0.08, 0.02, 0.12, 0.14, WALL.at, -2.0, -0.7, 0.8, 1.5)
spray(23, 12, FAR.x0 + 0.09, -0.02, 0.14, 0.22, FAR.at, -2.4, -0.95, 0.9, 1.8)

/** The bow wave: how high the sand stands ahead of the ball while there is castle left to push. */
const BOW = 0.12
const bowHeight = (since: number, bx: number) => BOW * over(since, 0, 0.07) * (1 - over(bx, 0.1, 0.3))
// Sand flicked off the bow wave's crest as it goes.
for (let i = 0; i < 8; i++) {
  const at = 0.03 + 0.026 * i
  const bx = ballX(at)
  spray(40 + i, 1, bx + R + 0.035, FLOOR - bowHeight(at, bx), 0.02, 0.01, at, -1.35, -0.9, 0.9, 1.4)
}

/** The flag: its pole stands in the far tower's crenel; flung, it turns about its middle under a lighter pull than sand. */
const FX = T1 + TW / 2
const STAFF = POLE + MERLON
const HALF = STAFF / 2
const G_FLAG = 2.4
const FLAG_RISE = 0.06
/** Where it sticks in the heap, and how far over it leans. */
const STUCK: Pt = [0.27, FLOOR - 0.025]
const LEAN = -0.45
const FLAG_FROM: Pt = [FX, FLOOR - TOWER_H + MERLON - HALF]
const FLAG_TO: Pt = [STUCK[0] + HALF * Math.sin(LEAN), STUCK[1] - HALF * Math.cos(LEAN)]
const FLAG_VY = -Math.sqrt(2 * G_FLAG * FLAG_RISE)
const FLAG_DUR = -FLAG_VY / G_FLAG + Math.sqrt((2 * (FLAG_TO[1] - FLAG_FROM[1] + FLAG_RISE)) / G_FLAG)
const FLAG_TURNS = 2
/** When it sticks: the jolt that the cap on the ruin does not survive. */
const THUNK = FAR.at + FLAG_DUR
spray(50, 5, STUCK[0], FLOOR - 0.07, 0.05, 0.02, THUNK, -2.5, -0.6, 0.4, 0.8)

/** The cap that landed whole: its battlements crumble at the jolt, then it slumps into the ruin. */
const CAP_X = CAP.x + CAP.vx * CAP.dur
const CAP_LANDS = CAP.at + CAP.dur
const CAP_TILT = CAP.turn - 2 * Math.PI
RUIN.push([CAP_X, 0.11, 0.035, THUNK + 0.2])
spray(51, 4, CAP_X, FLOOR - 0.06, 0.12, 0.02, CAP_LANDS, -2.6, -0.5, 0.4, 0.8)
spray(52, 5, CAP_X, FLOOR - 0.15, 0.14, 0.02, THUNK + 0.05, -2.3, -0.8, 0.25, 0.5)

/** The heap settles: lower and wider, over this long. */
const SETTLE: [number, number] = [0.5, 2.2]
/** Sand running down the ruin's sides as it settles: from where, which way, when, and how far. */
const RUNS: [number, number, number, number][] = [
  [0.22, 1, THUNK + 0.06, 0.2],
  [CAP_X - 0.04, -1, THUNK + 0.3, 0.16],
  [CAP_X + 0.06, 1, THUNK + 0.42, 0.12],
  [-0.1, -1, 1.35, 0.17],
  [0.33, 1, 1.5, 0.13],
  [0.02, -1, 1.75, 0.2],
  [0.26, 1, 1.95, 0.15],
]
const RUN = 0.55

/** The castle is patted back up: when each part starts to rise out of the heap, and how long it takes. */
const REBUILD = 2.5
const RISES = [REBUILD, REBUILD + 0.3, REBUILD + 0.6]
const RISE = 0.6
const PATS = 3
/** Up in pats: each a quick shove a little too far, and a hold. */
function pat(f: number): number {
  if (f <= 0) return 0
  if (f >= 1) return 1
  const n = Math.floor(f * PATS)
  return (n + easeOutBack(clamp((f * PATS - n) / 0.6))) / PATS
}
/** How far from whole a part is: 0 standing, 1 a heap; -1 while the ball has broken it and nothing has built it up again. */
function state(since: number, at: number, rises: number): number {
  if (since < at) return 0
  if (since < rises - 0.15) return -1
  return 1 - pat(over(since, rises, rises + RISE))
}

const bump = (u: number) => {
  const v = 1 - u * u
  return v > 0 ? v * v : 0
}
/** How high the ruin stands at `x`: what the ball has left behind it so far, settling, and sinking as the castle is built out of it. */
function ruinAt(x: number, since: number, bx: number): number {
  const shown = over(bx - x, 0.02, 0.14)
  if (shown <= 0 || since <= 0) return 0
  const settle = easeOutCubic(over(since, SETTLE[0], SETTLE[1]))
  let h = 0
  for (let i = 0; i < RUIN.length; i++) {
    const hump = RUIN[i]
    const laid = hump[3] > 0 ? easeOutQuad(over(since, hump[3], hump[3] + 0.14)) : 1
    if (laid > 0) h += hump[2] * laid * bump((x - hump[0]) / (hump[1] * (1 + 0.22 * settle)))
  }
  return h * shown * (1 - 0.26 * settle) * (1 - easeInOutSine(over(since, REBUILD - 0.1, REBUILD + 1.05)))
}

/** A tower or a wall, standing at `x0..x0+w` to `h` over the sand, slumped by `c`: lower, wider, rounder. */
function heapShape(p: import('p5'), k: number, x0: number, w: number, h: number, c: number, merlons: boolean, fat = 0): void {
  const hh = h * (1 - 0.82 * c)
  const ww = w * (1 + 0.55 * c) * (1 + fat)
  const cx = x0 + w / 2
  const top = FLOOR - hh
  const r = Math.min(hh, ww / 2) * clamp(0.1 + 0.9 * c)
  if (!merlons || c > 0.35) {
    // A slumped heap: one rounded hump.
    p.beginShape()
    p.vertex((cx - ww / 2) * k, FLOOR * k)
    p.bezierVertex((cx - ww / 2) * k, (top + r * 0.2) * k, (cx - ww / 2 + r) * k, top * k, (cx - ww / 2 + r) * k, top * k)
    p.vertex((cx + ww / 2 - r) * k, top * k)
    p.bezierVertex((cx + ww / 2 - r) * k, top * k, (cx + ww / 2) * k, (top + r * 0.2) * k, (cx + ww / 2) * k, FLOOR * k)
    p.endShape(p.CLOSE)
    return
  }
  // Standing: a tower with two merlons on top.
  const m = MERLON * (1 - c / 0.35)
  p.beginShape()
  p.vertex((cx - ww / 2) * k, FLOOR * k)
  p.vertex((cx - ww / 2) * k, top * k)
  p.vertex((cx - ww / 2 + ww * 0.28) * k, top * k)
  p.vertex((cx - ww / 2 + ww * 0.28) * k, (top + m) * k)
  p.vertex((cx + ww / 2 - ww * 0.28) * k, (top + m) * k)
  p.vertex((cx + ww / 2 - ww * 0.28) * k, top * k)
  p.vertex((cx + ww / 2) * k, top * k)
  p.vertex((cx + ww / 2) * k, FLOOR * k)
  p.endShape(p.CLOSE)
}

/** A block about its own middle: `w` by `h`, a merlon `m` high at either top corner it still has, slumped by `c` into a rounder, lower lump. */
function blockShape(p: import('p5'), k: number, w: number, h: number, near: number, far: number, c: number): void {
  const mw = TW * 0.28
  const hw = (w / 2) * (1 + 0.5 * c)
  const top = h / 2 - h * (1 - 0.7 * c)
  const r = Math.min(h * (1 - 0.7 * c), hw) * (0.12 + 0.8 * c)
  p.beginShape()
  p.vertex(-hw * k, (h / 2) * k)
  if (near > 0.004) {
    p.vertex(-hw * k, top * k)
    p.vertex((-hw + mw) * k, top * k)
    p.vertex((-hw + mw) * k, (top + near) * k)
  } else {
    p.vertex(-hw * k, (top + near + r) * k)
    p.quadraticVertex(-hw * k, (top + near) * k, (-hw + r) * k, (top + near) * k)
  }
  if (far > 0.004) {
    p.vertex((hw - mw) * k, (top + far) * k)
    p.vertex((hw - mw) * k, top * k)
    p.vertex(hw * k, top * k)
  } else {
    p.vertex((hw - r) * k, (top + far) * k)
    p.quadraticVertex(hw * k, (top + far) * k, hw * k, (top + far + r) * k)
  }
  p.vertex(hw * k, (h / 2) * k)
  p.endShape(p.CLOSE)
}

export const sandcastle = definePiece<{ color: string }>({
  name: 'sandcastle',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: sandColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    // The bank: an island of sand, its top level with the decks, its flanks going down into the sea to the bed;
    // a plank of deck reaches it from either side.
    rail(p, k, ink, weight, -0.5, -BANK + 0.02)
    rail(p, k, ink, weight, BANK - 0.02, 0.5)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((-BANK + 0.04) * k, FLOOR * k)
    p.vertex((BANK - 0.04) * k, FLOOR * k)
    p.bezierVertex(BANK * k, FLOOR * k, (BANK + 0.03) * k, (FLOOR + 0.08) * k, 0.5 * k, (WATER + 0.05) * k)
    p.vertex(0.5 * k, 0.5 * k)
    p.vertex(-0.5 * k, 0.5 * k)
    p.vertex(-0.5 * k, (WATER + 0.05) * k)
    p.bezierVertex((-BANK - 0.03) * k, (FLOOR + 0.08) * k, -BANK * k, FLOOR * k, (-BANK + 0.04) * k, FLOOR * k)
    p.endShape(p.CLOSE)

    const bx = ballX(since)
    const cN = state(since, NEAR.at, RISES[0])
    const cW = state(since, WALL.at, RISES[1])
    const cF = state(since, FAR.at, RISES[2])

    // The flag, behind the sand, so its foot is in whatever it stands in. On the far tower, in the crenel, until
    // the tower goes; flung up off it, turning over backwards; down into the heap, where it sticks and quivers;
    // and lifted upright again on the tower's head as the tower is built up under it.
    const flown = since - FAR.at
    let fx = FX
    let fy = FLOOR - TOWER_H + MERLON
    let lean = 0
    let flutter = 0.012 * Math.sin(since * 9)
    if (flown > 0 && flown < FLAG_DUR) {
      lean = -(FLAG_TURNS * 2 * Math.PI - LEAN) * (flown / FLAG_DUR)
      fx = FLAG_FROM[0] + (FLAG_TO[0] - FLAG_FROM[0]) * (flown / FLAG_DUR) - HALF * Math.sin(lean)
      fy = FLAG_FROM[1] + FLAG_VY * flown + (G_FLAG * flown * flown) / 2 + HALF * Math.cos(lean)
      flutter = 0.02 * Math.sin(flown * 50)
    } else if (flown >= FLAG_DUR) {
      const stuck = flown - FLAG_DUR
      const up = easeInOutSine(over(since, RISES[2], RISES[2] + RISE * 0.8))
      const head = FLOOR - FAR.h * (1 - 0.82 * Math.max(0, cF)) * over(since, RISES[2] - 0.15, RISES[2]) + (cF >= 0 && cF < 0.35 ? MERLON * (1 - cF / 0.35) : 0)
      lean = (LEAN + 0.3 * Math.exp(-4 * stuck) * Math.sin(stuck * 34)) * (1 - up)
      fx = STUCK[0] + (FX - STUCK[0]) * up
      fy = Math.min(STUCK[1], head)
      flutter = 0.012 * Math.sin(since * 9) * up + 0.02 * Math.exp(-4 * stuck) * Math.sin(stuck * 34)
    }
    p.push()
    p.translate(fx * k, fy * k)
    p.rotate(lean)
    outline(p, ink, weight)
    p.line(0, 0, 0, -STAFF * k)
    solid(p, ink, weight * 0.8, bg)
    p.triangle(0, -STAFF * k, 0, (-STAFF + 0.06) * k, 0.09 * k, (-STAFF + 0.03 + flutter) * k)
    p.pop()

    // The sand that lies or stands: each part whole until the ball's front reaches it, then only the course the
    // ball is going through, eaten away from behind; the ruin it leaves; the parts rising out of the ruin again,
    // in pats; and the cap that landed whole, sunk in the ruin. Outlined once each and then filled again, so
    // whatever overlaps is one heap.
    const course = (x0: number, w: number, h: number) => {
      const from = Math.max(x0, bx)
      if (from >= x0 + w) return
      const top = FLOOR - h * (1 - 0.3 * over(bx + R, x0, x0 + w))
      p.beginShape()
      p.vertex(from * k, FLOOR * k)
      p.vertex(from * k, top * k)
      p.vertex((x0 + w) * k, top * k)
      p.vertex((x0 + w) * k, FLOOR * k)
      p.endShape(p.CLOSE)
    }
    const part = (x0: number, w: number, h: number, c: number, rises: number, merlons: boolean, low: number) => {
      if (c <= -1) return course(x0, w, low)
      const f = over(since, rises, rises + RISE) * PATS
      const fat = c > 0 ? 0.14 * Math.sin(Math.PI * clamp((f - Math.floor(f)) / 0.6)) * (since < rises + RISE ? 1 : 0) : 0
      heapShape(p, k, x0, w, h * (c > 0 ? over(since, rises - 0.15, rises) : 1), c, merlons, fat)
    }
    const capSits = since >= CAP_LANDS && since < REBUILD + 0.4
    const sand = () => {
      part(NEAR.x0, NEAR.w, NEAR.h, cN, RISES[0], true, COURSE)
      part(WALL.x0, WALL.w, WALL.h, cW, RISES[1], false, WALL_COURSE)
      part(FAR.x0, FAR.w, FAR.h, cF, RISES[2], true, COURSE)
      const to = Math.min(EDGE + 0.01, bx - 0.02)
      if (since > 0 && to > -0.3 && since < REBUILD + 1.05) {
        p.beginShape()
        p.vertex(-0.3 * k, FLOOR * k)
        for (let i = 1; i < 32; i++) {
          const x = -0.3 + ((to + 0.3) * i) / 32
          p.vertex(x * k, (FLOOR - ruinAt(x, since, bx)) * k)
        }
        p.vertex(to * k, FLOOR * k)
        p.endShape(p.CLOSE)
      }
      if (capSits) {
        // The cap, a little sunk where it landed: squashed by the landing, its merlons crumbling at the jolt, then slumping.
        const crumble = easeOutQuad(over(since, THUNK + 0.03, THUNK + 0.4))
        const c = easeInQuad(over(since, THUNK + 0.25, THUNK + 0.95))
        const thud = 0.16 * Math.exp(-9 * (since - CAP_LANDS)) * Math.cos((since - CAP_LANDS) * 30)
        const sunk = easeInOutSine(over(since, REBUILD - 0.1, REBUILD + 0.4))
        p.push()
        p.translate(CAP_X * k, (FLOOR - 0.095 + 0.03 * c + 0.12 * sunk + CAP.h / 2) * k)
        p.rotate(CAP_TILT * (1 - c))
        p.scale(1 + thud * 0.6, 1 - thud)
        p.translate(0, (-CAP.h / 2) * k)
        blockShape(p, k, CAP.w, CAP.h, MERLON * (1 - crumble), MERLON * (1 - over(crumble, 0.25, 1)), c)
        p.pop()
      }
    }
    solid(p, ink, weight, s.color)
    sand()
    if (since > 0) {
      p.push()
      p.noStroke()
      p.fill(s.color)
      p.translate(0, (weight / k) * 0.5 * k)
      sand()
      p.pop()
    }

    // The bow wave: the sand the ball shoves along ahead of itself, its crest curling on, against whatever still stands.
    const bow = bowHeight(since, bx)
    if (bow > 0.004) {
      const crest = bx + R + 0.035
      const foot = bx + R + 0.05 + bow
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex(bx * k, FLOOR * k)
      p.bezierVertex(bx * k, (FLOOR - bow * 0.9) * k, (crest - 0.04) * k, (FLOOR - bow) * k, crest * k, (FLOOR - bow) * k)
      p.bezierVertex((crest + 0.05) * k, (FLOOR - bow) * k, (foot - 0.005) * k, (FLOOR - bow * 0.4) * k, foot * k, FLOOR * k)
      p.endShape(p.CLOSE)
    }

    // The bank's top again, over the heaps' feet, so the ground is one line; and the sea, lapping its flanks.
    outline(p, ink, weight)
    p.line((-BANK + 0.04) * k, FLOOR * k, (BANK - 0.04) * k, FLOOR * k)
    water(p, k, ink, weight, -0.5, 0.5)

    if (since <= 0 || since > REBUILD + 1) return

    // The blocks in the air: each leaves from where it stood, so the tower cracks along its courses at the blow.
    solid(p, ink, weight, s.color)
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i]
      const tau = since - b.at
      if (tau <= 0 || tau >= b.dur) continue
      p.push()
      p.translate((b.x + b.vx * tau) * k, (b.y + b.vy * tau + (G * tau * tau) / 2) * k)
      p.rotate(b.turn * (tau / b.dur))
      blockShape(p, k, b.w, b.h, b.merlons[0] ? MERLON : 0, b.merlons[1] ? MERLON : 0, 0)
      p.pop()
    }

    // The lumps: through the air, a hop where they land, and then lying there, sagging, until they are gathered up.
    const settle = easeOutCubic(over(since, SETTLE[0], SETTLE[1]))
    p.strokeWeight(weight * 0.75)
    for (let i = 0; i < LUMPS.length; i++) {
      const l = LUMPS[i]
      const tau = since - l.at
      if (tau <= 0 || (l.breaks && tau >= l.dur)) continue
      const left = 1 - over(since, REBUILD - 0.1 + 0.02 * i, REBUILD + 0.25 + 0.02 * i)
      if (left <= 0) continue
      let x = l.x + l.vx * tau
      let y = l.y + l.vy * tau + (G * tau * tau) / 2
      if (tau >= l.dur) {
        const f = clamp((tau - l.dur) / l.hop[0])
        x = l.x + l.vx * l.dur + l.hop[2] * f
        y = FLOOR - l.r * 0.7 - l.hop[1] * 4 * f * (1 - f)
      }
      const lying = over(tau, l.dur + l.hop[0], l.dur + l.hop[0] + 1.2) * settle
      p.push()
      p.translate(x * k, (y + l.r * 0.85 * (1 - left) + l.r * 0.2 * lying) * k)
      p.rotate(l.turn * easeOutQuad(clamp(tau / (l.dur + l.hop[0]))))
      p.rect(0, 0, l.r * 2 * (1 + 0.25 * lying) * left * k, l.r * 1.7 * (1 - 0.3 * lying) * left * k, l.r * 0.55 * k)
      p.pop()
    }

    // The spray, grain by grain; each is gone where it comes down.
    p.strokeWeight(weight * 0.4)
    for (let i = 0; i < GRAINS.length; i++) {
      const g = GRAINS[i]
      const tau = since - g.at
      if (tau <= 0 || tau >= g.dur) continue
      p.circle((g.x + g.vx * tau) * k, (g.y + g.vy * tau + (G * tau * tau) / 2) * k, g.r * 2 * (1 - 0.6 * over(tau, g.dur * 0.7, g.dur)) * k)
    }

    // Sand running down the ruin's sides: a few grains in a file, faster as they go.
    for (let i = 0; i < RUNS.length; i++) {
      const run = RUNS[i]
      for (let j = 0; j < 3; j++) {
        const f = (since - run[2] - 0.07 * j) / RUN
        if (f <= 0 || f >= 1) continue
        const x = run[0] + run[1] * run[3] * easeInQuad(f)
        p.circle(x * k, (FLOOR - ruinAt(x, since, bx) - 0.004) * k, 0.026 * (1 - 0.5 * f) * k)
      }
    }
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The furrow's near lip, in front of the ball's path: thrown up behind the ball as it goes, never over it,
    // settling with the ruin and gathered up with it.
    if (since <= 0 || since > REBUILD + 0.9) return
    const bx = ballX(since)
    const settle = easeOutCubic(over(since, SETTLE[0], SETTLE[1]))
    const left = (1 - 0.3 * settle) * (1 - easeInOutSine(over(since, REBUILD - 0.1, REBUILD + 0.85)))
    const to = Math.min(EDGE, bx - R)
    if (to <= -0.28) return
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.28 * k, FLOOR * k)
    for (let i = 1; i < 24; i++) {
      const x = -0.28 + ((to + 0.28) * i) / 24
      let h = 0
      for (let j = 0; j < LIP.length; j++) h += LIP[j][2] * bump((x - LIP[j][0]) / (LIP[j][1] * (1 + 0.2 * settle)))
      p.vertex(x * k, (FLOOR - h * left * over(bx - x, R, R + 0.12)) * k)
    }
    p.vertex(to * k, FLOOR * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.line(-0.28 * k, FLOOR * k, to * k, FLOOR * k)
  },
})
