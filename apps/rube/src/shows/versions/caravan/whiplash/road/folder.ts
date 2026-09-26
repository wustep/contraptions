import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { KIT_LAND, drawKit, type KitPiece } from '../drums'
import { POSES, beatPose, blendPose, drawConductor, type ArmPose, type Pose } from '../fletcher'
import { box, carried, frame, hash, part, type Companion, type Ctx, type PartShot, type Slot } from '../kit'
import { DRIVE, LOUD, TUNE_ORIGIN, TUNE_PERIOD, strength, tune } from '../music'
import { G_EARTH, G_SNAP } from '../physics'
import { KIT, ROAD } from '../worlds'
import { SEAT } from './crash-car'
import { ease, kick, ring } from './crash-paint'
import {
  BAY_Y, BUTTON, CAN_X, FL, FLETCH, KX, MACHINE, SHELF_Y, WALL, WING_L, WING_R, drawBackstage, drawBackstageLight, drawBand, drawCases, drawDoorLight, drawFolder,
  drawMachine, drawMachineLight, drawStage, drawStageLight, drawWall, drawWing, type MachineLook,
} from './folder-set'

/**
 * The road's first half, 172.07 → `FOLDER_END` (205.92, the band's second chorus, loud): the Overbrook competition.
 * The film: backstage, Tanner hands Andrew his folder to hold; Andrew sets it down and goes to a vending machine;
 * when he turns back, the folder is gone (the film never says who took it). Tanner, lost without his chart;
 * Fletcher, furious; Andrew knows it by heart, and Fletcher sends him to the kit. He plays; the core seat is his.
 *
 * On the match cut from the practice room he is sitting on a drum case in the dark, backstage; the tubes flicker
 * on (172.71). Tanner pushes his folder along the cases to him and leaves it with him ("hold this"), and goes. He
 * leaves it there and goes to the machine down the corridor: jumps up to its button (177.43); the coil turns and the
 * can sticks on the edge of its shelf; he shoulders the machine on the biggest hit of the stretch (178.71), and the
 * can drops into the bay (179.35). Meanwhile, out of the frame, the folder is gone. He climbs back to the cases and
 * finds the lid bare. Tanner comes back, and cannot find it; Fletcher comes off the stage at them, hands up, and
 * on the band's hit points at Andrew (186.00). Tanner slinks off. Andrew rolls along the cases and leaps from their
 * end, past the wing, onto the kit's floor tom; the stage lights come up on Fletcher's downbeat (190.07) and he
 * plays: the band's hits, from memory, on the kit, Fletcher conducting him. On the last hit of the phrase
 * (200.78) Fletcher points at him again: core. The stage goes dark; he drops off the kit and rolls out past the band
 * to the loading door, which rolls up on the lot's sodium light (202.42), and into the rental car waiting there,
 * whose door slams as he lands in the seat on 205.92: the drive (`crash.ts`).
 *
 * The set is `folder-set.ts`. Tanner and Fletcher are company; Fletcher's rig is drawn here at his ball.
 */

/**
 * When the folder part hands the ball to the crash: the downbeat of the drive (`DRIVE`, beat 480, one of the
 * chorus's strongest). Kept where the director put it: the band's texture changes there, and the car door's slam
 * and its lamps are the part's first beat.
 */
export const FOLDER_END = DRIVE
/** Where the crash part's frame begins: the rental car's seat (+ half a cell), outside the hall's loading door. */
export const FOLDER_EXIT: Pt = [22.15, FL - SEAT[1]]

/* ------------------------------------------------------------------ paths */

type Ease = 'lin' | 'in' | 'out' | 'inout' | [number, number]
interface Move {
  t0: number
  t1: number
  at: (u: number) => Pt
}
/** A path through timed moves: rests, rolls with an ease, hops on a parabola. Each move starts where the last ended. */
class Path {
  readonly moves: Move[] = []
  constructor(public t: number, public p: Pt) {}
  private add(t1: number, at: (u: number) => Pt): this {
    this.moves.push({ t0: this.t, t1, at })
    this.t = t1
    this.p = at(1)
    return this
  }
  rest(t1: number): this {
    const p = this.p
    return this.add(t1, () => p)
  }
  go(to: Pt, t1: number, e: Ease = 'inout'): this {
    const a = this.p
    const f = shape(e)
    return this.add(t1, (u) => {
      const s = f(u)
      return [a[0] + (to[0] - a[0]) * s, a[1] + (to[1] - a[1]) * s]
    })
  }
  /** A flight to `to`, landing at `t1`: under gravity `g`, or with an explicit lift `arc` over the chord's middle. */
  hop(to: Pt, t1: number, g = G_EARTH, arc?: number): this {
    const a = this.p
    const T = t1 - this.t
    const lift = arc ?? (g * T * T) / 8
    return this.add(t1, (u) => [a[0] + (to[0] - a[0]) * u, a[1] + (to[1] - a[1]) * u - lift * 4 * u * (1 - u)])
  }
  at(t: number): Pt {
    const m = this.moves
    if (t <= m[0].t0) return m[0].at(0)
    let lo = 0
    let hi = m.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (m[mid].t0 <= t) lo = mid
      else hi = mid - 1
    }
    const mv = m[lo]
    const u = mv.t1 > mv.t0 ? Math.min(1, (t - mv.t0) / (mv.t1 - mv.t0)) : 1
    return mv.at(u)
  }
}
function shape(e: Ease): (u: number) => number {
  if (e === 'lin') return (u) => u
  if (e === 'in') return (u) => u * u
  if (e === 'out') return (u) => 1 - (1 - u) * (1 - u)
  if (e === 'inout') return (u) => 0.5 - 0.5 * Math.cos(Math.PI * u)
  const [v0, v1] = e
  const mean = (v0 + v1) / 2
  return (u) => (v0 * u + ((v1 - v0) * u * u) / 2) / mean
}

/* ------------------------------------------------------------------ the clock */

const CUT = LOUD
/** The tubes come on. */
const LIGHTS = tune(402.5)
/** Tanner's folder comes to rest beside him. */
const HANDED = tune(406)
/** He drops onto the step case, and to the floor. */
const DOWN1 = tune(410)
const DOWN2 = tune(412)
/** The button; back on the floor; the shoulder into the machine; the can in the bay. */
const PRESS = tune(413.5)
const BACKDOWN = tune(414.5)
const SLAM = tune(416.5)
const OFF = tune(417.5)
const THUNK = tune(418)
/** Up the cases again. */
const UP1 = tune(419.75)
const UP2 = tune(421)
/** Out of the frame, the folder goes; where it lay. */
const VANISH = 177.9
const FOLDER_SPOT = 0.3
/** Tanner back up the cases. */
const T_UP1 = tune(424.5)
const T_UP2 = tune(425.5)
/** Fletcher's hands up ("what is this"); his point at Andrew ("you"). */
const WHAT = tune(431)
const POINT = tune(433.5)
/** Tanner off the cases. */
const T_DOWN1 = tune(435)
const T_DOWN2 = tune(436.5)
/** The leap onto the kit, and the band's first hit: the stage lights and Fletcher's downbeat. */
const DOWNBEAT = tune(443)
/** The last hit of the phrase: Fletcher's point, core. */
const CORE = tune(468)
/** Off the kit, the hi-hat on the way down, the floor. */
const OFF_HAT = 201.124
const OFF_FLOOR = 201.675
/** The loading door rolls up, and the lot's lamp outside comes on. */
const DOOR_UP = 202.42
export const LOT_ON = DOOR_UP
/** The launches: each jump leaves on an eighth of the tune. */
const JUMP = tune(412.5)
const WOUND = tune(415.5)
const CLIMB1 = tune(418.75)
const CLIMB2 = tune(420)
const LEAP = tune(440.25)
const INTO = tune(479)

/** The strokes he plays at Overbrook: the band's hits, from memory. */
const STROKES: [number, KitPiece][] = [
  [tune(442), 'floor'],
  [tune(443), 'snare'],
  [tune(444), 'crash'],
  [tune(446), 'rack'],
  [tune(447), 'snare'],
  [tune(447.75), 'hat'],
  [tune(448.75), 'snare'],
  [tune(449.75), 'floor'],
  [tune(451), 'rack'],
  [tune(451.75), 'snare'],
  [tune(453.75), 'crash'],
  [tune(455), 'hat'],
  [tune(455.75), 'snare'],
  [tune(457), 'rack'],
  [tune(457.75), 'ride'],
  [tune(459), 'crash'],
  [tune(460), 'snare'],
  [tune(460.75), 'hat'],
  [tune(462), 'hat'],
  [tune(463), 'hat'],
  [tune(464), 'hat'],
  [tune(465.25), 'rack'],
  [tune(465.75), 'snare'],
  [tune(466.25), 'hat'],
  [tune(467), 'snare'],
  [tune(468), 'crash'],
  [OFF_HAT, 'hat'],
]
const onKit = (piece: KitPiece): Pt => [KX + KIT_LAND[piece][0], KIT_LAND[piece][1]]

/** The band's hits through the number: the beats and eighths of the tune strong enough to lift the horns. */
const ACCENTS: number[] = (() => {
  const out: number[] = []
  for (let k = 443; k <= 468; k += 0.25) if (strength('tune', k) >= 0.9) out.push(tune(k))
  return out
})()

/* ------------------------------------------------------------------ Andrew */

const STEP_Y = 1.15 - R
const FLOOR_Y = FL - R
const ANDREW = (() => {
  const a = new Path(CUT, [-0.5, 0])
  // At rest on the case; a look at the folder as it arrives, and off to the machine.
  a.rest(174.35).go([-0.44, 0], 174.52).go([-0.5, 0], 174.7)
  a.go([-1.1, 0], 175.51, 'in').hop([-1.71, STEP_Y], DOWN1)
  a.go([-2.25, STEP_Y], DOWN2 - 0.428, [1.48, 1.04]).hop([-2.7, FLOOR_Y], DOWN2)
  a.go([-2.86, FLOOR_Y], JUMP, [1.0, 0.9])
  // Up to the button: the top of the jump is the press.
  a.hop(BUTTON, PRESS, G_EARTH, (FLOOR_Y - BUTTON[1]) / 4)
  a.hop([-2.92, FLOOR_Y], BACKDOWN, G_EARTH, (FLOOR_Y - BUTTON[1]) / 4)
  // The can sticks. He backs off, and shoulders the machine's side at the top of a jump.
  a.go([-2.45, FLOOR_Y], 178.22, 'out').rest(WOUND)
  a.hop([MACHINE.x1 + R, 1.1], SLAM, G_EARTH, (FLOOR_Y - 1.1) / 4)
  a.hop([-2.6, FLOOR_Y], OFF, G_EARTH, (FLOOR_Y - 1.1) / 4)
  // Back up the cases: the step, the trap case; the lid is bare.
  a.go([-2.55, FLOOR_Y], CLIMB1, 'out').hop([-1.8, STEP_Y], UP1, 16).rest(CLIMB2).hop([-0.5, 0], UP2, 14)
  a.rest(180.95).go([0.2, 0], 181.6).rest(181.8).go([0.3, 0], 182.1).go([0.2, 0], 182.45)
  // Fletcher: he shrinks at the shout, then rolls toward him ("I know it"); the point.
  a.rest(184.85).go([0.1, 0], 185.15).go([0.55, 0], 185.85).rest(186.3)
  // Along the cases and off their end, past the wing, onto the kit.
  a.go([4.46, 0], LEAP, 'in').hop(onKit('floor'), STROKES[0][0])
  // The number: from piece to piece on the band's hits.
  for (let i = 1; i < STROKES.length; i++) {
    const [t, piece] = STROKES[i]
    const from = a.p
    const to = onKit(piece)
    const T = t - a.t
    const rise = from[1] - to[1]
    // Quick and low for a stroke close to the last, never so low that it arrives from below; a little bounce in place.
    const same = Math.hypot(to[0] - from[0], to[1] - from[1]) < 0.05
    const want = same ? 0.2 : Math.min(0.9, (G_SNAP * T * T) / 8)
    a.hop(to, t, G_SNAP, Math.max(want, (rise + 0.2) / 4))
  }
  // Down off the kit to the floor, and out through the dark to the car.
  a.hop([11.35, FLOOR_Y], OFF_FLOOR, G_SNAP, 0.8)
  // Speeding up out of the landing, a steady roll, easing for the hop in: the three add up to the way to the car.
  const x0 = 11.35
  const x1 = FOLDER_EXIT[0] - 0.5 - 1.4 * (FOLDER_END - INTO)
  const cruise = (x1 - x0 - (1.05 * 0.9) / 2 - (1.4 * 1.0) / 2) / ((INTO - OFF_FLOOR) - 0.9 - 1.0 + 0.9 / 2 + 1.0 / 2)
  a.go([x0 + ((1.05 + cruise) / 2) * 0.9, FLOOR_Y], OFF_FLOOR + 0.9, [1.05, cruise])
  a.go([x1 - ((cruise + 1.4) / 2) * 1.0, FLOOR_Y], INTO - 1.0, 'lin')
  a.go([x1, FLOOR_Y], INTO, [cruise, 1.4])
  a.hop([FOLDER_EXIT[0] - 0.5, FOLDER_EXIT[1]], FOLDER_END)
  return a
})()

/* ------------------------------------------------------------------ Tanner and Fletcher */

/** Tanner, the first time: along the cases with his folder, pushing it to Andrew; a look; away to the stage. */
const TANNER_A = new Path(CUT, [4.4, 0])
  .go([FOLDER_SPOT + 0.51 + R + 0.01, 0], HANDED, 'inout')
  .rest(174.45)
  .go([0.74, 0], 174.62)
  .go([0.86, 0], 174.8)
  .go([4.46, 0], 175.9, 'in')
  .hop([5.3, FLOOR_Y], 176.3)
  .go([7.5, FLOOR_Y], 177.0, 'lin')
const TANNER_A_END = 176.2
/** Tanner, back from the corridor: up the cases, the bare lid, lost; off again when Fletcher chooses Andrew. */
const TANNER_B = new Path(180.7, [-6.0, FLOOR_Y])
  .go([-2.6, FLOOR_Y], 181.6, [3.2, 2.2])
  .hop([-1.8, STEP_Y], T_UP1)
  .hop([-0.5, 0], T_UP2, 15)
  .rest(182.75)
  .go([-0.24, 0], 183.1)
  .go([-0.6, 0], 183.55)
  .go([-0.36, 0], 183.95)
  .go([-0.58, 0], 184.4)
  .rest(186.15)
  .go([-1.1, 0], 186.3, 'in')
  .hop([-1.7, STEP_Y], T_DOWN1)
  .go([-2.25, STEP_Y], T_DOWN2 - 0.428, [1.6, 1.0])
  .hop([-2.7, FLOOR_Y], T_DOWN2)
  .go([-7.0, FLOOR_Y], 188.6, [1.2, 3.6])
const TANNER_B_START = 180.7
const TANNER_B_END = 188.4

/** Fletcher: waiting on stage; off it at them; back to conduct; through the number; at his place in the dark. */
const FLETCHER_PATH = new Path(CUT, FLETCH)
  .rest(181.4)
  .go([3.4, FLETCH[1]], 184.5, 'inout')
  .rest(186.3)
  .go(FLETCH, 189.5, 'inout')
  .rest(FOLDER_END + 1)

/** His hands through the part. */
const arm = (up: number, bend: number, wrist: number, hand: ArmPose['hand']): ArmPose => ({ up, bend, wrist, hand })
function fletcherPose(t: number, at: Pt): Pose {
  const rest = POSES.rest
  const ready = POSES.ready
  // At Andrew: the right hand out along the line from his head to the ball.
  const aim = (to: Pt, left: ArmPose = rest.left): Pose => ({ right: arm(Math.atan2(to[1] - at[1], to[0] - at[0]), 0.03, 0, 'point'), left })
  const go = { right: rest.right, left: arm(-0.12, 0.05, 0, 'point') }
  if (t < WHAT - 0.3) return rest
  if (t < WHAT) return blendPose(rest, ready, ease(t, WHAT - 0.3, WHAT))
  if (t < POINT - 0.14) return ready
  const him = ANDREW.at(t)
  if (t < POINT + 0.3) {
    const u = ease(t, POINT - 0.14, POINT)
    const p = blendPose(ready, aim(him), u)
    p.right.up += 0.05 * ring(t - POINT, 0.12, 20)
    return p
  }
  if (t < 186.6) return aim(him)
  // Leading the way to the stage, the other hand pointing ahead; up for the downbeat.
  if (t < 187.2) return blendPose(aim(him), go, ease(t, 186.6, 187.2))
  if (t < 189.1) return go
  if (t < DOWNBEAT - 0.08) return blendPose(go, ready, ease(t, 189.1, 189.7))
  // The number, conducted in two.
  const phase = (t - TUNE_ORIGIN) / TUNE_PERIOD
  const hot = ACCENTS.reduce((s, b) => s + kick(t - b, 0.25), 0)
  if (t < CORE - 0.14) return blendPose(ready, beatPose(phase, 0.65 + 0.3 * Math.min(1, hot)), ease(t, DOWNBEAT - 0.08, DOWNBEAT))
  // The last hit: the hand snaps out at Andrew on the crash, and holds; then down, slowly, in the dark.
  const him2 = ANDREW.at(Math.min(t, CORE))
  if (t < CORE + 0.7) return blendPose(beatPose(phase, 0.9), aim(him2), ease(t, CORE - 0.14, CORE))
  return blendPose(aim(him2), rest, ease(t, CORE + 0.7, CORE + 2.4))
}

/* ------------------------------------------------------------------ light, the folder, the machine */

/** The backstage tubes: dark at the cut, on at LIGHTS. */
const backLight = (t: number): number => 0.04 + 0.96 * ease(t, LIGHTS - 0.06, LIGHTS + 0.16)
/** The stage: its work light while the band waits; the lamps on the downbeat; down into the dark after the last hit. */
function stageLight(t: number): number {
  if (t < DOWNBEAT - 0.04) return 0.2
  if (t < CORE + 0.3) return 0.2 + 0.8 * ease(t, DOWNBEAT - 0.04, DOWNBEAT + 0.05)
  return 0.1 + 0.9 * (1 - ease(t, CORE + 0.3, CORE + 1.8))
}
const hotAt = (t: number): number => (t < DOWNBEAT || t > CORE + 0.5 ? 0 : Math.min(1, ACCENTS.reduce((s, b) => s + kick(t - b, 0.22), 0)))

/** Where the folder is: pushed by Tanner, set beside Andrew; gone once nobody is looking. */
function folderAt(t: number): { x: number; rock: number } | null {
  if (t >= VANISH) return null
  if (t < HANDED) return { x: TANNER_A.at(t)[0] - 0.51 - R - 0.01, rock: 0 }
  return { x: FOLDER_SPOT, rock: -0.06 * ring(t - HANDED, 0.18, 22) }
}

function machineAt(t: number): MachineLook {
  // The coil turns after the press; the can walks to the shelf's edge and tips over it, and hangs.
  const turn = ease(t, PRESS + 0.05, PRESS + 0.7)
  const tip = ease(t, PRESS + 0.45, PRESS + 0.75)
  const fall0 = THUNK - Math.sqrt((2 * (BAY_Y - 0.11 - (SHELF_Y - 0.1))) / G_EARTH)
  let can: MachineLook['can'] = { x: CAN_X + 0.04 * turn, y: SHELF_Y - 0.19 + 0.09 * tip - 0.015 * Math.sin(Math.PI * 4 * turn), tilt: 0.42 * tip + 0.05 * ring(t - (PRESS + 0.75), 0.2, 16) }
  if (t >= fall0) {
    const tau = t - fall0
    if (t < THUNK) can = { x: CAN_X + 0.04, y: SHELF_Y - 0.1 + 0.5 * G_EARTH * tau * tau, tilt: 0.42 + 3.2 * tau }
    else can = { x: CAN_X + 0.04 + 0.03 * Math.min(1, (t - THUNK) / 0.2), y: BAY_Y - 0.11 - 0.03 * Math.abs(ring(t - THUNK, 0.08, 30)), tilt: Math.PI / 2 }
  }
  return {
    light: backLight(t),
    glow: backLight(t) * (1 - 0.35 * kick(t - SLAM, 0.12)),
    coil: turn * Math.PI * 2 * 1.2,
    can,
    rock: 0.045 * Math.exp(-Math.max(0, t - SLAM) / 0.4) * Math.sin(Math.max(0, t - SLAM) * 14) * (t >= SLAM ? 1 : 0),
    press: kick(t - PRESS, 0.6),
  }
}

/** Seconds since each piece of the kit was last struck. */
function sinceOf(t: number): (piece: KitPiece) => number {
  return (piece) => {
    let best = Infinity
    for (const [s, pc] of STROKES) if (pc === piece && s <= t) best = t - s
    return best
  }
}

/* ------------------------------------------------------------------ the strikes */

export const FOLDER_HITS: number[] = [
  ...new Set(
    [LIGHTS, HANDED, DOWN1, DOWN2, JUMP, PRESS, BACKDOWN, WOUND, SLAM, OFF, THUNK, CLIMB1, UP1, CLIMB2, UP2, T_UP1, T_UP2, WHAT, POINT, T_DOWN1, T_DOWN2, LEAP, ...STROKES.map((s) => s[0]), DOWNBEAT, OFF_FLOOR, DOOR_UP, INTO, FOLDER_END].map(
      (t) => Math.round(t * 1e4) / 1e4,
    ),
  ),
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the part */

interface FolderState {
  begin: number
}

function drawFolderPart(p: p5, s: FolderState, c: Ctx): void {
  const T = c.t + s.begin
  const { k } = c
  const f = frame(p, k)
  const back = backLight(T)
  const stage = stageLight(T)
  const hot = hotAt(T)
  const door = ease(T, DOOR_UP, DOOR_UP + 0.8)
  p.push()
  drawBackstage(p, c, back, f)
  drawStage(p, c, stage, f)
  drawWing(p, c, WING_L.x0, WING_L.x1, Math.max(back * 0.6, stage), 'left')
  drawWing(p, c, WING_R.x0, WING_R.x1, stage, 'right')
  drawBackstageLight(p, c, back)
  const mach = machineAt(T)
  if (f.x0 < MACHINE.x1 + 1) {
    drawMachine(p, c, mach)
    drawMachineLight(p, c, mach)
  }
  drawCases(p, c, back)
  const fo = folderAt(T)
  if (fo) drawFolder(p, c, fo.x, 0.13, fo.rock, back)
  // Out of the dark on the cut: the backstage opens under the practice room's darkness and wakes with the tubes.
  if (back < 0.99) {
    p.noStroke()
    p.fill(c.bg)
    ;(p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1 - back
    p.rect(((f.x0 + Math.min(f.x1, WING_L.x1)) / 2) * k, ((f.y0 + f.y1) / 2) * k, (Math.min(f.x1, WING_L.x1) - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    ;(p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1
  }
  // The stage: the band behind Fletcher's place, the kit, Fletcher's rig.
  const up = ease(T, DOWNBEAT - 0.55, DOWNBEAT - 0.05) * (1 - ease(T, CORE + 1.2, CORE + 2.4))
  drawBand(p, c, {
    light: stage,
    up,
    accent: (seat) => (T < DOWNBEAT ? 0 : Math.min(1, ACCENTS.reduce((acc, b) => acc + kick(T - b, 0.2), 0)) * (0.75 + 0.25 * hash(seat, 3))),
  })
  p.push()
  p.translate(KX * k, 0)
  drawKit(p, c, { shell: KIT.lacquer, since: sinceOf(T), light: Math.max(0.25, stage) })
  p.pop()
  const fl = FLETCHER_PATH.at(T)
  drawConductor(p, c, fl, fletcherPose(T, fl), { floor: FL, light: Math.max(0.35, Math.max(stage, fl[0] < WING_L.x1 ? back : 0)) })
  drawStageLight(p, c, stage, hot)
  drawWall(p, c, door, Math.max(stage, 0.2 + 0.8 * door), f)
  drawDoorLight(p, c, door)
  p.pop()
}

const company = (path: Path, from: number, to: number, who: 'tanner' | 'fletcher') => ({
  who,
  from,
  to,
  at: (t: number): Companion => {
    const [x, y] = path.at(t)
    return { x, y }
  },
})

export const folder = part<FolderState>(
  { name: 'folder', flight: true, draw: drawFolderPart },
  (slot: Slot) => {
    const span = slot.end - slot.begin
    const segs = carried((t) => ANDREW.at(t + slot.begin), 0, span, Math.ceil(span / 0.02))
    return {
      cells: box(-9, -6, WALL.x1 + 1, FL + 2, 2),
      exit: FOLDER_EXIT,
      lane: { segs, fire: HANDED - slot.begin },
      state: { begin: slot.begin },
      company: [
        company(TANNER_A, CUT, TANNER_A_END, 'tanner'),
        company(TANNER_B, TANNER_B_START, TANNER_B_END, 'tanner'),
        company(FLETCHER_PATH, CUT, FOLDER_END, 'fletcher'),
      ],
    }
  },
  (slot: Slot): PartShot[] => [
    // The match cut: held on him in the dark; the room waking round him; Tanner and the folder.
    { t: slot.begin, cells: 3.5, hold: [-0.5, 0], w: 1 },
    { t: LIGHTS + 0.3, cells: 3.9, hold: [-0.1, -0.15], w: 1 },
    { t: HANDED, cells: 4.6, hold: [0.6, -0.3], w: 1 },
    // Down the cases with him, and over to the machine (the folder left out of the frame).
    { t: 175.4, cells: 4.6, hold: [-1.2, 0.35], w: 1 },
    { t: 176.6, cells: 4.9, hold: [-4.7, 0.62], w: 1 },
    { t: 179.1, cells: 4.9, hold: [-4.65, 0.62], w: 1 },
    // Back up: the bare lid.
    { t: 180.2, cells: 4.4, hold: [-1.5, 0.82], w: 1 },
    { t: 181.4, cells: 4.4, hold: [-0.3, -0.05], w: 1 },
    { t: 182.6, cells: 4.8, hold: [0.15, -0.25], w: 1 },
    // Fletcher comes off the stage at them.
    { t: 184.5, cells: 5.6, hold: [1.5, -0.55], w: 1 },
    { t: POINT, cells: 5.4, hold: [1.4, -0.5], w: 1 },
    // Along the cases, onto the kit; the number.
    { t: 187.6, cells: 5.4, hold: [3.4, -0.6], w: 1 },
    { t: tune(442), cells: 5.6, hold: [8.4, -0.8], w: 1 },
    { t: tune(444), cells: 6.2, hold: [10.0, -1.0], w: 1 },
    { t: tune(453.75), cells: 6.8, hold: [10.4, -1.1], w: 1 },
    { t: tune(459), cells: 6.2, hold: [10.0, -1.1], w: 1 },
    { t: tune(462), cells: 4.8, hold: [9.8, -0.95], w: 1 },
    { t: tune(465), cells: 5.0, hold: [9.8, -0.95], w: 1 },
    { t: CORE, cells: 6.4, hold: [10.4, -1.0], w: 1 },
    // Out through the dark to the door and the car.
    { t: OFF_FLOOR + 0.2, cells: 5.4, hold: [12.3, 0.4], w: 0.55 },
    { t: 203.6, cells: 4.8, off: [1.2, -0.9] },
    { t: 205.4, cells: 4.5, off: [0.9, -0.7] },
  ],
)

void ROAD
