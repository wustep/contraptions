import type p5 from 'p5'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { R, laneAt, type Lane, type Pt } from '../../../../../parts'
import { KIT_FLOOR, KIT_LAND, drawKit, type KitPiece } from '../drums'
import { POSES, beatPose, drawConductor, type ArmPose, type Pose } from '../fletcher'
import { box, part, smooth, type Companion, type Ctx, type PartShot, type Slot } from '../kit'
import { BAND, BASS, FIRST, TUNE_ORIGIN, TUNE_PERIOD, tune } from '../music'
import { G_EARTH, G_SNAP } from '../physics'
import { KIT } from '../worlds'
import { Path, beat, loudAt, since, swing, type Hit } from './room-path'
import { ROOM, drawPracticeRoom, litAt, type RoomLook } from './room'

/**
 * The practice room, the film's first shot (0 → 30.65: the drum intro alone, the bass from 21.11, the band on 30.65).
 *
 * A long dark corridor at Shaffer, the camera pushing along it toward the one lit room at its end, and Andrew alone
 * in it at the old oxblood kit. The kit is the first machine: he plays it by landing on it. The kick's pedal throws
 * him up into the kit; the heads bounce him from drum to drum on the groove's strokes (the snare, the hi-hat he
 * works, the rack tom, the floor tom), the crash on the phrase's biggest stroke; a fill down the toms and a dive back
 * onto the pedal. Then the cymbals' wash: the pedal throws him up to the ride, and a bar a stroke he floats from the
 * ride to the crash and back across the top of the kit, each cymbal rocking long after, the lamp over him still
 * swinging from the loud part, dust in its light.
 *
 * On the bass (21.11) Fletcher is in the far doorway, black against the corridor. He keeps time with his hand, a
 * beat a stroke, twice the ball's: and the ball doubles (the film's "double-time"). He points: you. He goes, fast,
 * down the corridor toward the band room; Andrew goes after him, skipping off the hi-hat and out through the door,
 * rolling right at 1.6 cells a second as the band comes in (the band part takes him on in the corridor).
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

/* ------------------------------------------------------------------ the strokes */

type Piece = KitPiece | 'ground'
interface Stroke {
  t: number
  piece: Piece
  /** Where he lands, in the kit's frame (the piece's own landing point when unset). */
  p?: Pt
  /** The gravity of the flight that lands here. */
  g: number
}
const S = (t: number, piece: Piece, g = G_SNAP, p?: Pt): Stroke => ({ t, piece, g, p })

/** The strokes of the drum intro before he leaves, in order. Beat k is `tune(k)` (a half note); k.75 the last eighth. */
const GROOVE: Stroke[] = [
  // The first stroke: he falls onto the pedal, the kick booms, and it throws him up onto the rack tom.
  S(beat(0), 'kick', G_EARTH),
  S(beat(1.75), 'rack', G_EARTH),
  // The groove: the second beat and the last eighth of every bar, across the kit and back.
  S(beat(3), 'snare'),
  S(beat(3.75), 'hat'),
  S(beat(5), 'snare'),
  S(beat(5.75), 'rack'),
  S(beat(7), 'floor'),
  S(beat(7.75), 'rack'),
  S(beat(9), 'snare'),
  S(beat(9.75), 'hat'),
  S(beat(11), 'snare'),
  S(beat(12.25), 'rack'),
  S(beat(13), 'floor'),
  S(beat(13.75), 'rack'),
  // The phrase's loudest stroke: up onto the crash.
  S(beat(15), 'crash'),
  S(beat(17), 'snare', G_EARTH),
  S(beat(17.75), 'hat'),
  S(beat(19), 'snare'),
  S(beat(20), 'rack'),
  S(beat(20.75), 'floor'),
  S(beat(21.75), 'rack'),
  S(beat(23), 'snare'),
  S(beat(23.75), 'hat'),
  // The fill, off the click (the recording's own strokes): back across the toms and up to the crash.
  S(beat(24.5), 'snare'),
  S(11.191, 'rack'),
  S(11.741, 'floor'),
  S(12.27, 'rack'),
  S(12.609, 'crash'),
  // And down onto the pedal: the kick throws him to the hi-hat.
  S(beat(30), 'kick', G_EARTH),
]
/** The cymbals' gravity: a cymbal throws him gently, a slow lob across the top of the kit under the lamp. */
const G_CYMBAL = 4.6
// The wash: from the ride to the crash and back, one stroke a bar (the downbeats, 32 to 46); down to the hi-hat and
// the snare for Fletcher's time.
GROOVE.push(S(beat(32), 'ride', G_EARTH))
for (let k = 34; k <= 46; k += 2) GROOVE.push(S(beat(k), k % 4 === 0 ? 'ride' : 'crash', G_CYMBAL))
GROOVE.push(S(beat(48), 'hat', G_EARTH))
GROOVE.push(S(beat(50), 'snare', G_EARTH))
// Fletcher's time, a stroke a beat (51 to 62).
for (let k = 51; k <= 62; k++) GROOVE.push(S(beat(k), k % 2 === 1 ? 'hat' : 'snare'))

/** He waits on the snare while Fletcher points, and goes on this beat. */
const GO = tune(64)
/** The hi-hat, then three skips along the floor to the doorway, a bar's eighths apart, at his leaving pace. */
const OUT_HAT = beat(65)
const SKIPS = [beat(67), beat(68), beat(69)]
/** Where he is when the band comes in (kit frame): the far end of this part's corridor. */
const X_END = KIT_LAND.hat[0] + V_OUT * (BAND - OUT_HAT)
const OUT: Stroke[] = [
  // He pushes off the snare with a last stroke of his own, up onto the hi-hat.
  S(GO, 'snare'),
  S(OUT_HAT, 'hat'),
  ...SKIPS.map((t) => S(t, 'ground', G_EARTH, [X_END - V_OUT * (BAND - t), GROUND] as Pt)),
]

const STROKES: Stroke[] = [...GROOVE, ...OUT]

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const PRACTICE_HITS: number[] = STROKES.map((s) => s.t)

/** What the kit answers. */
const KIT_HITS: Hit<KitPiece>[] = STROKES.filter((s) => s.piece !== 'ground').map((s) => ({ t: s.t, piece: s.piece as KitPiece }))

/* ------------------------------------------------------------------ the path */

function build(begin: number): Path {
  const path = new Path(begin, [-0.5, 0])
  for (const s of STROKES) {
    const q = s.p ?? KIT_LAND[s.piece as KitPiece]
    // He waits on the snare while Fletcher points, and pushes off it on the beat he goes.
    if (s.t === GO) {
      path.hold(GO)
      continue
    }
    path.hop(at(q), s.t, s.g)
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

/** The hi-hat: open on its spring while he is away, pressed shut under him. */
function hatOpen(ball: Pt): number {
  const [hx, hy] = KIT_LAND.hat
  const over = 1 - smooth(Math.abs(ball[0] - hx), 0.25, 0.45)
  const pressed = Math.max(0, Math.min(0.5, (hy - ball[1]) / 0.13))
  return 0.5 + (pressed - 0.5) * over
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
    hat: hatOpen(ball),
    light: 0.9,
  })
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
    // The whole kit, its floor and its lamp, for the groove's first phrase, up to the crash; then in, close on the
    // snare and the hi-hat for the backbeat; out with him down the toms for the fill, and the dive onto the pedal.
    { t: beat(15), cells: 5.55, hold: at([-0.85, -0.32]) },
    { t: beat(19), cells: 3.5, hold: at([0.25, -0.3]) },
    { t: beat(23), cells: 3.35, hold: at([0.3, -0.32]) },
    { t: 11.741, cells: 5.3, hold: at([-1.15, -0.4]) },
    { t: beat(30), cells: 5.45, hold: at([-0.6, -0.2]) },
    // The wash: up on the cymbals and the lamp, the drums below, drifting in.
    { t: beat(34), cells: 4.9, hold: at([-0.8, -1.0]) },
    { t: beat(46), cells: 4.55, hold: at([-0.8, -1.15]) },
    { t: BASS - 0.1, cells: 4.6, hold: at([-0.3, -0.95]) },
    // Back, for Fletcher in the doorway, and hold on the two of them.
    { t: beat(53), cells: 6.3, hold: at([1.4, -0.25]) },
    { t: GO, cells: 6.1, hold: at([1.55, -0.2]) },
    // After him, following as the band comes in.
    { t: slot.end, cells: 5, off: [0.9, -0.8] },
  ],
)
