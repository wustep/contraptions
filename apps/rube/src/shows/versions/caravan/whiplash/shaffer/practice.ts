import type p5 from 'p5'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { R, laneAt, mixHex, type Lane, type Pt } from '../../../../../parts'
import { HAT, KIT_FLOOR, KIT_LAND, SNARE, drawKit, drawStick, type KitPiece } from '../drums'
import { POSES, beatPose, drawConductor, type ArmPose, type Pose } from '../fletcher'
import { alpha, box, part, smooth, type Companion, type Ctx, type PartShot, type Slot } from '../kit'
import { BAND, BASS, FIRST, TUNE_ORIGIN, TUNE_PERIOD, tune } from '../music'
import { G_EARTH, G_SNAP } from '../physics'
import { KIT, SHOP } from '../worlds'
import { Path, beat, loudAt, since, swing, type Hit } from './room-path'
import { ROOM, box4, drawPracticeRoom, inked, litAt, type RoomLook } from './room'

/**
 * The practice room, the film's first shot (0 → 30.65: the drum intro alone, the bass from 21.11, the band on 30.65).
 *
 * A long dark corridor at Shaffer, the camera pushing along it toward the one lit room at its end, and Andrew alone
 * in it at the old oxblood kit. The kit is the first machine, and its hands are a pair of sticks: one chrome post
 * clamped to the snare's hoop, the left stick hinged low on it and reaching down to the snare, the right hinged high
 * and reaching over to the hi-hat, each sprung up off its head. He is what drives them: he lands on a stick, his
 * weight throws its tip onto the head, and its spring tosses him to the other, low and quick (a stick's height), so
 * the groove is the pair going left, right, left. The kick's pedal is the big throw: he falls onto it on the first
 * stroke and it flings him up onto the pair; the phrase's loudest stroke takes him off the rack tom up onto the
 * crash; a fill down the toms, onto the pedal again, and it throws him back up onto the sticks for the wash, a slow
 * stroke a bar from stick to stick, the lamp over him still swinging from the loud part, dust in its light. (The
 * night part's two-stick drill rig on the snare is this pair's return.)
 *
 * On the bass (21.11) Fletcher is in the far doorway, black against the corridor. He keeps time with his hand, a
 * beat a stroke, twice the ball's: and the pair doubles (the film's "double-time"). He points: you. Andrew waits on
 * the right stick; Fletcher goes, fast, down the corridor toward the band room; Andrew goes after him, off the
 * hi-hat's far edge and out through the door, rolling right at 1.6 cells a second as the band comes in (the band
 * part takes him on in the corridor).
 *
 * Frame: the kit's origin (the ball on the snare's head) is `K`; the room (`room.ts`) is drawn round it.
 */

/* ------------------------------------------------------------------ the frame */

/** The ball comes in falling from rest onto the kick's pedal, landing on the first stroke. */
const DROP = 0.5 * G_EARTH * FIRST * FIRST
/** The kit's origin in the part's frame: the pedal's landing point is the drop's end below the entry. */
export const K: Pt = [-0.5 - KIT_LAND.kick[0], DROP - KIT_LAND.kick[1]]
/** A point of the kit's frame in the part's. */
const at = (q: Pt): Pt => [K[0] + q[0], K[1] + q[1]]
/** The ball on the room's floor, in the kit's frame. */
const GROUND = KIT_FLOOR - R
/** He leaves at this pace, level along the corridor's floor. */
const V_OUT = 1.6
/** The left corridor's far end (the opening's long corridor), in the kit's frame. */
const HALL_L = -14.6

/* ------------------------------------------------------------------ the pair of sticks */

/**
 * The pair: one chrome post clamped to the snare's hoop on its right, between the snare and the hi-hat. The left
 * stick (`S`) is hinged low on it and reaches down-left to the snare's head; the right stick (`H`) is hinged high and
 * reaches down-right to the hi-hat's top cymbal. Each is sprung up off its head; his weight throws it down.
 */
export type Side = 'S' | 'H'
/** The post's line, and the clamp on the hoop it stands on. */
export const POST = { x: 0.64, foot: 0.2, clamp: SNARE.w / 2 }
/** How open the hi-hat is: closed, a tight hat for a stick. */
const HAT_OPEN = 0.08
/** The top cymbal's surface at `x` (the house's hat, at `HAT_OPEN`). */
const hatTop = (x: number): number => {
  const u = Math.max(0, Math.min(1, (x - HAT.x) / HAT.w + 0.5))
  return HAT.y - (0.02 + 0.13 * HAT_OPEN) - 0.07 * Math.sin(u * Math.PI)
}
/** Half the stick's drawn thickness plus the ball's radius: how far his centre sits from a stick he is on. */
const ON_STICK = R + 0.036
/** How far a stick's spring lifts it off its head when nothing is on it, radians. */
const RAISE = 0.25
interface Stick {
  hinge: Pt
  len: number
  /** Which way it points: -1 to the left (the snare's), 1 to the right (the hat's). */
  m: -1 | 1
  /** Its angle in its own hand (0 level, positive tip-down) when the tip is on the head. */
  down: number
}
function stickTo(hinge: Pt, tip: Pt): Stick {
  const m = tip[0] < hinge[0] ? -1 : 1
  const dx = (tip[0] - hinge[0]) * m
  const dy = tip[1] - hinge[1]
  return { hinge, len: Math.hypot(dx, dy), m, down: Math.atan2(dy, dx) }
}
export const PAIR: Record<Side, Stick> = {
  S: stickTo([POST.x, -0.3], [-0.04, SNARE.top - 0.04]),
  H: stickTo([POST.x, -0.9], [1.4, hatTop(1.4) - 0.025]),
}
/** A point `s` along a stick (0 the hinge, 1 the tip) at angle `a`, kit frame. */
function along(side: Side, a: number, s: number): Pt {
  const k = PAIR[side]
  return [k.hinge[0] + k.m * Math.cos(a) * k.len * s, k.hinge[1] + Math.sin(a) * k.len * s]
}
/** His centre when he sits `s` along a stick that is down on its head. */
function onStick(side: Side, s: number): Pt {
  const k = PAIR[side]
  const [x, y] = along(side, k.down, s)
  return [x + k.m * Math.sin(k.down) * ON_STICK, y - Math.cos(k.down) * ON_STICK]
}
/** Where he lands on each stick. */
export const SEAT: Record<Side, Pt> = { S: onStick('S', 0.64), H: onStick('H', 0.64) }

/**
 * A stick's angle at `T`: sprung up at rest; after a stroke back up quickly, ringing a little; and pressed down by
 * him wherever he is on it, so it meets him as he lands and never passes through him.
 */
export function pairAngle(side: Side, T: number, strokes: readonly number[], ball: Pt): number {
  const k = PAIR[side]
  const rest = k.down - RAISE
  let last = -Infinity
  for (const t of strokes) {
    if (t > T) break
    last = t
  }
  const s = T - last
  let a = rest + (s < 2 ? RAISE * Math.exp(-s / 0.1) * Math.cos(s * 16) : 0)
  const bx = (ball[0] - k.hinge[0]) * k.m
  const by = ball[1] - k.hinge[1]
  const d = Math.hypot(bx, by)
  if (d > ON_STICK + 0.01) {
    const phi = Math.atan2(by, bx)
    const touch = phi + Math.asin(Math.min(1, ON_STICK / d))
    const proj = d * Math.cos(touch - phi)
    // Only from above: a ball under the stick's line (past its tip, or below the hinge) never pulls it down.
    if (proj > 0.04 && proj < k.len + 0.06 && touch - rest < 0.6) a = Math.max(a, touch)
  }
  return Math.min(a, k.down)
}

/* ------------------------------------------------------------------ the strokes */

type Piece = KitPiece | 'ground'
interface Stroke {
  t: number
  piece: Piece
  /** Where he lands, in the kit's frame (the piece's own landing point when unset). */
  p?: Pt
  /** The flight that lands here: its height over the straight line between its ends (cells). */
  arc: number
  /** The stick of the pair this stroke is played with, if any. */
  on?: Side
}
const S = (t: number, piece: Piece, arc: number, p?: Pt): Stroke => ({ t, piece, arc, p })
/** A stroke of the pair: he lands on stick `on`, and it strikes its head. */
const P = (t: number, on: Side, arc = 0.62): Stroke => ({ t, piece: on === 'S' ? 'snare' : 'hat', arc, p: SEAT[on], on })
/** The height a flight of `d` seconds under gravity `g` rises over its chord. */
const arcOf = (g: number, d: number): number => (g * d * d) / 8

/**
 * The strokes of the drum intro before he leaves, in order. Beat k is `tune(k)` (a half note); k.75 the last eighth.
 * Hops between the sticks are about half a cell high (they clear the post's top); the pedal's throws and the leap to
 * the crash are the only tall flights.
 */
const GROOVE: Stroke[] = [
  // The first stroke: he falls onto the pedal, the kick booms, and it throws him up onto the pair.
  S(beat(0), 'kick', arcOf(G_EARTH, FIRST)),
  P(beat(1.75), 'S', 1.8),
  // The groove on the pair: left, right, on the second beat and the last eighth of every bar.
  P(beat(3), 'S', 0.28),
  P(beat(3.75), 'H'),
  P(beat(5), 'S'),
  P(beat(5.75), 'H'),
  P(beat(7), 'S'),
  P(beat(7.75), 'H'),
  P(beat(9), 'S'),
  P(beat(9.75), 'H'),
  P(beat(11), 'S'),
  P(beat(12.25), 'H'),
  P(beat(13), 'S'),
  // Off the left stick onto the rack tom; the phrase's loudest stroke, up from it over the crash's edge onto it.
  S(beat(13.75), 'rack', 0.4),
  S(beat(15), 'crash', 0.9),
  // Off the crash's far edge back onto the rack, and the pair again.
  S(beat(17), 'rack', 0.9),
  P(beat(17.75), 'S', 0.35),
  P(beat(19), 'H'),
  P(beat(20), 'S'),
  P(beat(20.75), 'H'),
  P(beat(21.75), 'S'),
  P(beat(23), 'H'),
  P(beat(23.75), 'S'),
  // The fill, off the click (the recording's own strokes): down the toms, low.
  S(beat(24.5), 'rack', 0.4),
  S(11.191, 'rack', 0.26),
  S(11.741, 'floor', 0.45),
  S(12.27, 'rack', 0.45),
  S(12.609, 'floor', 0.35),
  // Onto the pedal: the kick, and it throws him back up onto the pair.
  S(beat(30), 'kick', 0.72),
  P(beat(32), 'S', 1.8),
]
// The wash: a slow stroke a bar from stick to stick (34 to 46), on into 48 and 50; then Fletcher's time, a stroke a
// beat (51 to 62), and he ends on the right stick.
for (let k = 34; k <= 50; k += 2) GROOVE.push(P(beat(k), (k / 2) % 2 === 1 ? 'H' : 'S', 0.62))
for (let k = 51; k <= 62; k++) GROOVE.push(P(beat(k), k % 2 === 1 ? 'S' : 'H'))

/** He waits on the right stick while Fletcher points, and goes on this beat: his weight off it is its last stroke. */
const GO = tune(64)
/** Off the stick's tip onto the hi-hat's far edge; then three skips along the floor to the doorway, at his leaving pace. */
const OUT_HAT = beat(65)
const HAT_EDGE: Pt = [1.8, hatTop(1.8) - R]
const SKIPS = [beat(67), beat(68), beat(69)]
/** Where he is when the band comes in (kit frame): the far end of this part's corridor. */
const X_END = HAT_EDGE[0] + V_OUT * (BAND - OUT_HAT)
const OUT: Stroke[] = [
  { t: GO, piece: 'hat', arc: 0, p: SEAT.H, on: 'H' },
  S(OUT_HAT, 'hat', 0.36, HAT_EDGE),
  ...SKIPS.map((t, i) => S(t, 'ground', i === 0 ? arcOf(G_EARTH, t - OUT_HAT) : arcOf(G_EARTH, t - SKIPS[i - 1]), [X_END - V_OUT * (BAND - t), GROUND] as Pt)),
]

const STROKES: Stroke[] = [...GROOVE, ...OUT]

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const PRACTICE_HITS: number[] = STROKES.map((s) => s.t)

/** What the kit answers. */
const KIT_HITS: Hit<KitPiece>[] = STROKES.filter((s) => s.piece !== 'ground').map((s) => ({ t: s.t, piece: s.piece as KitPiece }))
/** What each stick of the pair plays. */
const PAIR_HITS: Record<Side, number[]> = {
  S: STROKES.filter((s) => s.on === 'S').map((s) => s.t),
  H: STROKES.filter((s) => s.on === 'H').map((s) => s.t),
}

/* ------------------------------------------------------------------ the path */

function build(begin: number): Path {
  const path = new Path(begin, [-0.5, 0])
  for (const s of STROKES) {
    const q = s.p ?? KIT_LAND[s.piece as KitPiece]
    // He waits on the right stick while Fletcher points, and his weight comes off it on the beat he goes.
    if (s.t === GO) {
      path.hold(GO)
      continue
    }
    const d = s.t - path.T
    path.hop(at(q), s.t, d > 1e-6 ? (8 * s.arc) / (d * d) : G_SNAP)
  }
  path.v = V_OUT
  path.roll(at([X_END, GROUND]), BAND)
  return path
}

/* ------------------------------------------------------------------ the room's answer */

/** The lamp on its cord: the kicks, the crashes and the loudest strokes knock it swinging. */
const BLOWS = STROKES.map((s) => {
  const loud = loudAt(s.t)
  const big = s.piece === 'kick' ? 0.05 : s.piece === 'crash' ? 0.034 : loud >= 1.45 ? 0.012 * (loud - 1.1) : 0
  const x = (s.p ?? KIT_LAND[s.piece as KitPiece])[0]
  return { t: s.t, amp: big * (x < -0.5 ? -1 : 1) }
}).filter((b) => b.amp !== 0)

/** How stirred the dust is: every stroke shakes some loose, and it settles. */
function stir(T: number): number {
  let d = 0
  for (const s of STROKES) {
    const a = T - s.t
    if (a < 0) break
    if (a < 3) d += 0.12 * Math.exp(-a / 0.8)
  }
  return Math.min(1, d)
}

/** The pair: the post and its clamp, the two sticks at their angles, a hinge block over each butt. */
function drawPair(p: p5, c: Ctx, angle: Record<Side, number>): void {
  const { k, ink, weight, bg } = c
  const chrome = KIT.chrome
  p.push()
  // The clamp on the snare's hoop and the post up from it to the high hinge.
  p.stroke(chrome)
  p.strokeWeight(weight * 1.1)
  p.line(POST.x * k, POST.foot * k, POST.x * k, PAIR.H.hinge[1] * k)
  inked(p, alpha(p, ink, 0.75), weight * 0.5, chrome)
  box4(p, k, POST.clamp - 0.03, POST.foot - 0.05, POST.x + 0.04, POST.foot + 0.05)
  // The sticks: hickory, the house's stick, from each hinge.
  for (const side of ['S', 'H'] as const) {
    const st = PAIR[side]
    const a = angle[side]
    drawStick(p, c, st.hinge, st.m === 1 ? a : Math.PI - a, st.len)
  }
  // The hinge blocks over the butts.
  for (const side of ['S', 'H'] as const) {
    const [hx, hy] = PAIR[side].hinge
    inked(p, alpha(p, ink, 0.85), weight * 0.6, mixHex(bg, SHOP.black, 0.5))
    box4(p, k, hx - 0.05, hy - 0.045, hx + 0.05, hy + 0.045)
  }
  p.pop()
}

/* ------------------------------------------------------------------ Fletcher */

/** The doorway he stands in (its middle), and his head there. */
const DOOR_X = ROOM.x1 + ROOM.wall / 2
const HEAD_Y = KIT_FLOOR - 3.2
/** He comes down the corridor from the band room, and stands in the doorway on the bass. */
const F_FROM = BASS - 2.4
const F_START = DOOR_X + 3.6
/** He leaves on this, fast. */
const F_LEAVE = GO + 0.05
const F_GONE = BAND - 0.35

/** Where his head is, kit frame. */
function fletcherAt(T: number): Pt {
  if (T < BASS) {
    // Walking in, slowing to a stop in the doorway.
    const u = clamp((T - F_FROM) / (BASS - F_FROM))
    return [F_START + (DOOR_X - F_START) * (1 - (1 - u) * (1 - u) * (1 - u)), HEAD_Y]
  }
  if (T < F_LEAVE) return [DOOR_X, HEAD_Y]
  // Away down the corridor: gathering pace, then striding.
  const a = T - F_LEAVE
  const acc = 4.2
  const vmax = 4.4
  const tv = vmax / acc
  const d = a < tv ? 0.5 * acc * a * a : 0.5 * acc * tv * tv + vmax * (a - tv)
  return [DOOR_X + d, HEAD_Y]
}

/**
 * Between two poses, `u` 0..1, each arm turning the short way round (the house's `blendPose` turns an arm from
 * hanging to raised through the horizontal on the wrong side).
 */
export function turnPose(a: Pose, b: Pose, u: number): Pose {
  const arm = (x: ArmPose, y: ArmPose): ArmPose => {
    let d = y.up - x.up
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    return { up: x.up + d * u, bend: x.bend + (y.bend - x.bend) * u, wrist: x.wrist + (y.wrist - x.wrist) * u, hand: u < 0.5 ? x.hand : y.hand }
  }
  return { left: arm(a.left, b.left), right: arm(a.right, b.right) }
}

const BEAT_IN = BASS + 0.3
const POINT_AT = tune(62.5)
const POINT_HELD = GO - 0.2
/** What his hands do: at rest; keeping time a beat a stroke; pointing at the kit; at rest again as he goes. */
function fletcherPose(T: number): Pose {
  const time = (T - TUNE_ORIGIN) / TUNE_PERIOD
  // One hand up keeping time, big enough to read from the kit; the other hangs.
  const beating: Pose = { right: beatPose(time, 1).right, left: POSES.rest.left }
  if (T < BEAT_IN) return POSES.rest
  if (T < BEAT_IN + 0.45) return turnPose(POSES.rest, beating, easeInOutSine(clamp((T - BEAT_IN) / 0.45)))
  if (T < POINT_AT) return beating
  if (T < POINT_AT + 0.35) {
    const from: Pose = { right: beatPose((POINT_AT - TUNE_ORIGIN) / TUNE_PERIOD, 1).right, left: POSES.rest.left }
    return turnPose(from, POSES.point, easeInOutSine(clamp((T - POINT_AT) / 0.35)))
  }
  if (T < POINT_HELD) return POSES.point
  return turnPose(POSES.point, POSES.rest, easeInOutSine(clamp((T - POINT_HELD) / 0.5)))
}

/* ------------------------------------------------------------------ the part */

interface PracticeState {
  begin: number
  lane: Lane
}

function drawPractice(p: p5, s: PracticeState, c: Ctx): void {
  const T = c.t + s.begin
  const { k } = c
  const b = laneAt(s.lane, c.t)
  const ball: Pt = [b.x - K[0], b.y - K[1]]
  const look: RoomLook = {
    T,
    light: 1,
    sway: swing(BLOWS, T),
    ambient: 0.13,
    hall: 0.2,
    left: HALL_L,
    right: X_END,
    dust: stir(T),
    backlit: smooth(T, F_FROM, BASS - 0.4) * (1 - smooth(T, F_GONE - 0.8, F_GONE + 0.6)),
  }
  p.push()
  p.translate(K[0] * k, K[1] * k)
  drawPracticeRoom(p, c, look)
  if (T >= F_FROM && T < F_GONE) {
    const head = fletcherAt(T)
    drawConductor(p, c, head, fletcherPose(T), { floor: KIT_FLOOR, light: Math.min(1, litAt(look, head[0], 0) + 0.25) })
  }
  drawKit(p, c, {
    shell: KIT.oxblood,
    since: (piece) => since(KIT_HITS, piece, T),
    hat: HAT_OPEN,
    light: 0.9,
  })
  drawPair(p, c, { S: pairAngle('S', T, PAIR_HITS.S, ball), H: pairAngle('H', T, PAIR_HITS.H, ball) })
  p.pop()
}

export const practice = part<PracticeState>(
  {
    name: 'practice',
    draw: (p, s, c) => drawPractice(p, s, c),
  },
  (slot: Slot) => {
    const path = build(slot.begin)
    const fletcher = (T: number): Companion => {
      const [x, y] = fletcherAt(T)
      return { x: x + K[0], y: y + K[1] }
    }
    return {
      cells: box(HALL_L + K[0] - 0.5, K[1] - 4.3, DOOR_X + 9 + K[0], K[1] + KIT_FLOOR + 0.6),
      exit: [X_END + 0.5 + K[0], GROUND + K[1]] as Pt,
      lane: path.lane(STROKES[0].t),
      state: { begin: slot.begin, lane: path.lane(STROKES[0].t) },
      company: [{ who: 'fletcher' as const, from: F_FROM, to: F_GONE, at: fletcher }],
    }
  },
  (slot: Slot): PartShot[] => [
    // The film's first shot: down the long dark corridor to the one lit room at its end, pushing in to the kit.
    { t: slot.begin, cells: 9.2, hold: at([-3.9, -0.5]) },
    { t: beat(7), cells: 7.2, hold: at([-2.3, -0.35]) },
    // The whole kit, its floor and its lamp, for the pair's first phrase, up to the crash; then in, close on the pair
    // for the backbeat; out with him down the toms for the fill, and the dive onto the pedal.
    { t: beat(15), cells: 5.55, hold: at([-0.55, -1.05]) },
    { t: beat(19), cells: 3.5, hold: at([0.45, -0.45]) },
    { t: beat(23), cells: 3.35, hold: at([0.5, -0.45]) },
    { t: 11.741, cells: 5.3, hold: at([-1.15, -0.4]) },
    { t: beat(30), cells: 5.45, hold: at([-0.6, -0.2]) },
    // The wash: the pair under the lamp, a slow stroke a bar, drifting in.
    { t: beat(34), cells: 4.9, hold: at([0.2, -0.75]) },
    { t: beat(46), cells: 4.4, hold: at([0.45, -0.8]) },
    { t: BASS - 0.1, cells: 4.5, hold: at([0.6, -0.65]) },
    // Back, for Fletcher in the doorway, and hold on the two of them.
    { t: beat(53), cells: 6.3, hold: at([1.4, -0.25]) },
    { t: GO, cells: 6.1, hold: at([1.55, -0.2]) },
    // After him, following as the band comes in.
    { t: slot.end, cells: 5, off: [0.9, -0.8] },
  ],
)
