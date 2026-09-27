import type p5 from 'p5'
import { R, laneAt, type Lane, type Pt } from '../../../../../parts'
import { KIT_FLOOR, KIT_LAND, drawKit, type KitPiece } from '../drums'
import { box, hash, part, smooth, type Ctx, type PartShot, type Slot } from '../kit'
import { LOUD, QUIET, tune } from '../music'
import { G_EARTH, G_SNAP } from '../physics'
import { KIT } from '../worlds'
import { Path, beat, since, swing, type Hit } from './room-path'
import { LAMP, PULL, ROOM, drawPracticeRoom, drawRoomDark, lampMouth, litAt, rgba, type RoomLook } from './room'
import {
  GLASS, GLASS_FLOOR, GLASS_SURFACE, METRONOME, STICKS, drawGlassBack, drawGlassFront, drawMetronome, drawRig, drawStool, onStick, stickAngle,
  type Side,
} from './night-rig'

/**
 * The practice room again, at night (130.5 → 172.07: the band drops out; a quiet stretch over the rhythm section).
 *
 * He comes back along the corridor alone, rolling, into the dark room; knocks the pull-cord by the door and the lamp
 * comes on; jostles the ride's stand in passing; and rolls onto the kick's pedal, which throws him up onto the
 * drill: two sticks on hinged posts clamped to the snare's hoop, one for each hand, sprung up, slapped down onto the
 * head by his landings. Against the metronome ticking on its shelf (a stroke on every tick, then two, then four) the
 * drill goes faster and faster, until a stroke of the right hand leaves one red dab on the head.
 *
 * He goes over the hi-hat into the glass of ice water on the stool, down among the ice, holds there, and pops out;
 * back over the hi-hat onto the grip of the stick that bled, and rolls down it, taping it as he goes. And back at it:
 * the drill again, grimmer, and the lamp over him swinging wider and wider with it, until his last hard stroke (the
 * band's return is a breath away) and the bulb goes. He settles on the rack tom in the dark; on 172.07 the stage
 * becomes the road (a match cut: he holds still on the screen, the camera held on him).
 *
 * Frame: the kit's origin (the ball on the snare's head) is `KN`; the room (`room.ts`) is drawn round it.
 */

/* ------------------------------------------------------------------ the clock */

/** He comes in at this pace, level. */
const V_IN = 1.2
/** The lamp: switched on by his knock on the pull-cord, dead on his last stroke. */
export const LAMP_ON = 131.791
export const BULB = 171.536
/** The ride's stand, knocked in passing. */
const RIDE_KNOCK = 133.525
/** The kick's pedal: onto it, and up. */
const KICK = 135.534
/** The drill: from his first landing on the sticks to the stroke that bleeds. */
const DRILL = beat(318)
export const BLOOD = beat(339)
/** Over the hi-hat into the water; out; back over the hi-hat; onto the stick that bled. */
const HAT_IN = beat(340.5)
const SPLASH = beat(341.75)
const POP = tune(346)
const HAT_OUT = beat(347.5)
const GRIP = beat(349)
const TAPED = beat(350.5)
/** The last hard stroke (the bulb), and where he comes to rest. */
const REST_AT = tune(400.25)

/* ------------------------------------------------------------------ the frame */

/** The kit's origin in the part's frame: he rolls in on the floor, and meets the pull-cord on the knock. */
export const KN: Pt = [-0.5 + V_IN * (LAMP_ON - QUIET) - (PULL.x - 0.1), R - KIT_FLOOR]
const at = (q: Pt): Pt => [KN[0] + q[0], KN[1] + q[1]]
const GROUND = KIT_FLOOR - R
/** Where he enters, in the kit's frame: the corridor is drawn from there. */
const ENTRY_X = -0.5 - KN[0]
/** Where he comes to rest. */
const REST: Pt = KIT_LAND.rack

/* ------------------------------------------------------------------ the strokes */

interface Stroke {
  t: number
  side: Side
}
/** The drill's first run: a stroke a beat, then two, then four, alternating hands, the last (the blood) the right's. */
function drill1(): Stroke[] {
  const ks: number[] = []
  for (let k = 318; k <= 325; k++) ks.push(k)
  for (let k = 325.5; k <= 333; k += 0.5) ks.push(k)
  for (let k = 333.25; k <= 339 + 1e-6; k += 0.25) ks.push(k)
  const n = ks.length
  return ks.map((k, i) => ({ t: beat(k), side: (n - 1 - i) % 2 === 0 ? 'R' : 'L' }))
}
/** The second: back at it after the tape, two a beat through the loud horn, one a beat through the quiet, then faster to the end. */
function drill2(): Stroke[] {
  const ks: number[] = []
  for (let k = 351.5; k <= 368; k += 0.5) ks.push(k)
  for (let k = 369; k <= 384; k++) ks.push(k)
  for (let k = 384.5; k <= 392; k += 0.5) ks.push(k)
  for (let k = 392.25; k <= 399 + 1e-6; k += 0.25) ks.push(k)
  ks.push(399.75)
  const n = ks.length
  // The last (the bulb) is the left hand's, so he comes off it toward the rack tom; and the first is the left's too,
  // across from the right stick he has just taped (the run has an odd number of strokes).
  if (n % 2 === 0) console.warn('caravan: night: the second drill should have an odd number of strokes')
  return ks.map((k, i) => ({ t: k === 399 ? 171.232 : k === 399.75 ? BULB : beat(k), side: (n - 1 - i) % 2 === 0 ? 'L' : 'R' }))
}
const DRILL1 = drill1()
const DRILL2 = drill2()
const STROKES = [...DRILL1, ...DRILL2]
/** Each stick's strokes (its tip on the head): the drills, and the landing on the grip. */
const STICK_HITS: Record<Side, number[]> = {
  L: STROKES.filter((s) => s.side === 'L').map((s) => s.t),
  R: [...STROKES.filter((s) => s.side === 'R').map((s) => s.t), GRIP].sort((a, b) => a - b),
}

/** What the kit answers: the sticks on the snare, the stand, the pedal, the hi-hat, the rack tom. */
const KIT_HITS: Hit<KitPiece>[] = [
  { t: RIDE_KNOCK, piece: 'ride' as KitPiece },
  { t: KICK, piece: 'kick' as KitPiece },
  ...STROKES.map((s) => ({ t: s.t, piece: 'snare' as KitPiece })),
  { t: HAT_IN, piece: 'hat' as KitPiece },
  { t: HAT_OUT, piece: 'hat' as KitPiece },
  { t: GRIP, piece: 'snare' as KitPiece },
  { t: TAPED, piece: 'snare' as KitPiece },
  { t: REST_AT, piece: 'rack' as KitPiece },
].sort((a, b) => a.t - b.t)

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const NIGHT_HITS: number[] = [...new Set([LAMP_ON, ...KIT_HITS.map((h) => h.t), SPLASH, POP])].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the path */

/** Where he sits on each stick for a stroke (halfway along), and on the right stick's grip. */
const LAND: Record<Side, Pt> = { L: onStick('L', 0.5), R: onStick('R', 0.5) }
const ON_GRIP = onStick('R', 0.1)
const OFF_TIP = onStick('R', 0.97)

function build(begin: number): Path {
  const path = new Path(begin, [-0.5, 0])
  // In along the corridor at his pace, through the doorway, into the pull-cord.
  path.v = V_IN
  path.roll(at([PULL.x - 0.1, GROUND]), LAMP_ON)
  // On to the ride's stand, over its front foot.
  path.roll(at([-2.76, GROUND]), RIDE_KNOCK)
  path.hop(at([-2.6, GROUND]), RIDE_KNOCK + 0.12, 16)
  path.v = (0.16 / 0.12) * 0.9
  // Slowing, onto the pedal's footboard.
  path.roll(at(KIT_LAND.kick), KICK)
  // The kick throws him onto the drill.
  path.hop(at(LAND[DRILL1[0].side]), DRILL, G_EARTH)
  for (const s of DRILL1.slice(1)) path.hop(at(LAND[s.side]), s.t, G_SNAP)
  // Over the hi-hat, into the water, down among the ice; he holds there; up, and out.
  path.hop(at(KIT_LAND.hat), HAT_IN, G_EARTH)
  path.hop(at([GLASS.x - 0.03, GLASS_SURFACE]), SPLASH, G_EARTH)
  path.v = 3
  path.roll(at([GLASS.x + 0.02, GLASS_FLOOR]), SPLASH + 0.3)
  path.hold(POP - 0.17)
  path.v = 0
  path.roll(at([GLASS.x - 0.1, GLASS_SURFACE]), POP)
  path.hop(at(KIT_LAND.hat), HAT_OUT, G_EARTH)
  // Onto the grip of the stick that bled; down it, taping it; off its tip onto the head.
  path.hop(at(ON_GRIP), GRIP, G_EARTH)
  path.v = 0.35
  path.roll(at(OFF_TIP), TAPED)
  // The drill again, to the last stroke; off it onto the rack tom, and still.
  // (The last stroke comes from higher: the hardest of the night.)
  for (const s of DRILL2) path.hop(at(LAND[s.side]), s.t, s.t === BULB ? G_SNAP * 1.5 : G_SNAP)
  path.hop(at(REST), REST_AT, G_SNAP)
  path.hold(LOUD)
  return path
}

/* ------------------------------------------------------------------ the room's answer */

/** The lamp: off; on at the knock (a quick warm-up); a failing bulb's flicker near the end; out on the last stroke. */
function lampLight(T: number): number {
  if (T < LAMP_ON) return 0
  const on = T - LAMP_ON
  if (on < 0.14) return Math.min(1, on / 0.05) * (1 - 0.35 * Math.exp(-((on - 0.07) ** 2) / 0.0006))
  if (T < BULB) {
    // The last few seconds, swinging hard, the filament flickers; in the last half second it browns out, so the
    // room is already going dark round him when it blows.
    const late = smooth(T, BULB - 4, BULB - 0.3)
    const f = hash(Math.floor(T * 24), 3, 11)
    const brown = 1 - 0.5 * smooth(T, BULB - 0.6, BULB - 0.04)
    return brown * (1 - late * (f > 0.72 ? 0.18 * (f - 0.72) / 0.28 : 0))
  }
  const s = T - BULB
  if (s < 0.045) return 1.3
  return 0.32 * Math.exp(-(s - 0.045) / 0.11)
}

/** The lamp's swing: knocked by the kick, and pumped wider and wider by the second drill. */
const BLOWS = [
  { t: KICK, amp: -0.035 },
  { t: BLOOD, amp: 0.02 },
]
function lampSway(T: number): number {
  const build = 0.23 * smooth(T, TAPED, BULB - 0.6) ** 1.3
  return swing(BLOWS, T) + build * Math.sin(((T - TAPED) * Math.PI * 2) / 1.34)
}

/** The pull-cord's toggle, knocked aside by him and swinging back, damped. */
function pullSwing(T: number): number {
  const s = T - LAMP_ON
  if (s <= 0) return 0
  // A long cord: a nudge at its foot is a small angle, and it swings slowly back.
  return 0.035 * Math.exp(-s / 3) * Math.sin((s * Math.PI * 2) / 4.2)
}

/** The dust, stirred by the drill. */
function stir(T: number): number {
  if (T < DRILL) return 0.1
  const d = T < BLOOD ? smooth(T, DRILL, BLOOD) : T < TAPED ? 0.4 : 0.4 + 0.6 * smooth(T, TAPED, BULB)
  return d
}

/** How much of the right stick's grip is taped: from its butt to where he has rolled, up to its grip's end. */
function taped(ball: Pt, T: number): [number, number] {
  if (T < GRIP) return [0.06, 0.06]
  if (T >= TAPED) return [0.06, 0.46]
  const st = STICKS.R
  const dx = -(ball[0] - st.hinge[0])
  const dy = ball[1] - st.hinge[1]
  const s = (dx * Math.cos(st.down) + dy * Math.sin(st.down)) / st.len
  return [0.06, Math.max(0.06, Math.min(0.46, s))]
}

/* ------------------------------------------------------------------ the part */

interface NightState {
  begin: number
  lane: Lane
}

function lookAt(T: number): RoomLook {
  return {
    T,
    light: lampLight(T),
    sway: lampSway(T),
    // Night: the lamp is the only light. What the room shows beyond its cone is next to nothing, and the corridors'
    // fixtures are all but out (`nightDark` takes the rest down to black).
    ambient: 0.02,
    hall: 0.03,
    left: ENTRY_X,
    right: ROOM.x1 + ROOM.wall + 1.4,
    pull: pullSwing(T),
    dust: stir(T),
  }
}

function ballAt(s: NightState, c: Ctx): Pt {
  const b = laneAt(s.lane, c.t)
  return [b.x - KN[0], b.y - KN[1]]
}

function drawNight(p: p5, s: NightState, c: Ctx): void {
  const T = c.t + s.begin
  const { k } = c
  const ball = ballAt(s, c)
  const look = lookAt(T)
  const lit = (x: number, y: number) => Math.min(1, litAt(look, x, y))
  p.push()
  p.translate(KN[0] * k, KN[1] * k)
  drawPracticeRoom(p, c, look)
  nightDark(p, c, look, 'wall')
  drawMetronome(p, c, T, lit(2.9, -1.3))
  drawStool(p, c, lit(2.85, 1.2))
  drawGlassBack(p, c, lit(3.0, 0.4))
  drawKit(p, c, {
    shell: KIT.oxblood,
    since: (piece) => since(KIT_HITS, piece, T),
    hat: hatOpen(ball),
    blood: T >= BLOOD,
    light: Math.max(0.05, Math.min(0.92, lit(0, 0))),
  })
  const onRig = T >= DRILL - 0.3 && T <= LOUD + 0.5 ? ball : null
  drawRig(p, c, {
    L: stickAngle('L', T, STICK_HITS.L, onRig),
    R: stickAngle('R', T, STICK_HITS.R, onRig),
    tape: taped(ball, T),
    light: lit(0, -0.3),
    // The strip from the roll shows while he lays the tape, and is torn off as he reaches the grip's end.
    laying: T > GRIP && T < TAPED ? smooth(T, GRIP, GRIP + 0.08) * (1 - smooth(taped(ball, T)[1], 0.43, 0.46)) : 0,
  })
  nightDark(p, c, look, 'reach')
  drawRoomDark(p, c, look)
  p.pop()
}

let darkCanvas: HTMLCanvasElement | null = null

/**
 * The night itself: beyond the lamp's reach the set goes to black. A layer of the paper's dark with the light cut out
 * of it, laid twice:
 *
 * - `wall`, over the room and the corridors before anything stands in them: nearly black, cut only by the cone (from
 *   the shade to the floor, swinging with it) and the floor's spill. The panels, the doors and the corridors fall
 *   away; only the wedge of wall behind the cone keeps its grain.
 * - `reach`, over the kit and the props, lighter: the pool round the drill, the cone, and the clock on its shelf and
 *   the glass on its stool (at the cone's edge, caught by it). The kit's far drums and stands go into the dark.
 *
 * So what reads is the kit under the lamp, the metronome, the ice water, the red dab and the tape. The ball, drawn by
 * the stage after the part, keeps his own colour.
 */
function nightDark(p: p5, c: Ctx, look: RoomLook, pass: 'wall' | 'reach'): void {
  if (typeof document === 'undefined') return
  // The dark comes up with the lamp (the eye adjusting to it), and stays when the bulb goes: one pool of light, then
  // black. Before the lamp the corridor keeps its faint read and the room its own dark (`drawRoomDark`).
  const T = look.T
  const on = Math.min(1, Math.max(0, look.light))
  const full = pass === 'wall' ? 0.94 : 0.8
  const A = T < LAMP_ON ? 0 : full * (T < BULB ? Math.min(1, on / 0.5) : 1 - 0.25 * smooth(T, BULB + 0.1, BULB + 0.9))
  if (A < 0.005) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  if (!darkCanvas) darkCanvas = document.createElement('canvas')
  if (darkCanvas.width !== cw || darkCanvas.height !== ch) {
    darkCanvas.width = cw
    darkCanvas.height = ch
  }
  const g = darkCanvas.getContext('2d')
  if (!g) return
  const { k } = c
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.clearRect(0, 0, cw, ch)
  g.setTransform(ctx.getTransform())
  const x0 = look.left ?? ROOM.x0 - ROOM.wall
  const x1 = look.right ?? ROOM.x1 + ROOM.wall
  g.fillStyle = rgba(c.bg, A)
  g.fillRect(x0 * k, (ROOM.ceil - 0.6) * k, (x1 - x0) * k, (ROOM.floor + 0.02 - ROOM.ceil + 0.6) * k)
  // The light, cut out of the dark as far as the lamp is on (a flash is no brighter than the room as drawn).
  const L = Math.min(1, Math.max(0, look.light))
  if (L > 0.003) {
    g.globalCompositeOperation = 'destination-out'
    const hole = (x: number, y: number, rx: number, ry: number, a: number, core = 0.35) => {
      g.save()
      g.translate(x * k, y * k)
      g.scale(1, ry / rx)
      const q = g.createRadialGradient(0, 0, 0, 0, 0, rx * k)
      q.addColorStop(0, `rgba(0,0,0,${a})`)
      q.addColorStop(core, `rgba(0,0,0,${a})`)
      q.addColorStop(0.5 + core / 2, `rgba(0,0,0,${a * 0.4})`)
      q.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = q
      g.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
      g.restore()
    }
    // The cone: a soft-edged wedge from just inside the shade to the floor, turned with the swing (a conic gradient
    // about the wedge's apex, so its edges are soft all the way down).
    const [mx, my] = lampMouth(look.sway)
    const depth = (ROOM.floor - my) / Math.cos(look.sway)
    const spread = pass === 'wall' ? 1.8 : 2.4
    const lip = LAMP.mouth * 0.42
    const up = (lip * depth) / (spread - lip)
    const half = Math.atan(spread / (depth + up))
    g.save()
    g.translate(mx * k, my * k)
    g.rotate(-look.sway)
    g.translate(0, -up * k)
    const w = half / (Math.PI * 2)
    const cone = g.createConicGradient(0, 0, 0)
    const down = 0.25
    const peak = (pass === 'wall' ? 0.72 : 1) * L
    cone.addColorStop(down - w * 1.8, 'rgba(0,0,0,0)')
    cone.addColorStop(down - w * 1.1, `rgba(0,0,0,${0.5 * peak})`)
    cone.addColorStop(down - w * 0.5, `rgba(0,0,0,${peak})`)
    cone.addColorStop(down + w * 0.5, `rgba(0,0,0,${peak})`)
    cone.addColorStop(down + w * 1.1, `rgba(0,0,0,${0.5 * peak})`)
    cone.addColorStop(down + w * 1.8, 'rgba(0,0,0,0)')
    g.fillStyle = cone
    const reach = depth + up + 0.4
    g.fillRect(-reach * k, 0, 2 * reach * k, reach * k)
    g.restore()
    // The shade itself, and the ceiling right round it, faintly.
    hole(mx, my - 0.12, 0.5, 0.36, 0.7 * L, 0.2)
    // The floor's spill, long and low: the boards, the stands' feet, the kick's pedal.
    const fx = mx + Math.tan(look.sway) * (ROOM.floor - my)
    hole(fx, ROOM.floor - 0.25, 3.8, 0.8, 0.75 * L, 0.25)
    if (pass === 'reach') {
      // The pool round the drill: where the lamp's light is (`litAt`'s centre), the kit under it.
      hole(pool0(look.sway), 0.0, 2.9, 2.3, L, 0.35)
      // The clock on its shelf and the glass on its stool, at the cone's edge: caught by it.
      hole(METRONOME.x, METRONOME.base - 0.3, 0.6, 0.55, 0.9 * L, 0.35)
      hole(GLASS.x, (GLASS.top + GLASS.bottom) / 2, 0.55, 0.6, 0.9 * L, 0.35)
    }
  }
  g.restore()
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(darkCanvas, 0, 0)
  ctx.restore()
}

/** The lamp's light's centre across the room, for a swing (as `litAt` has it). */
function pool0(sway: number): number {
  const [mx, my] = lampMouth(sway)
  return (mx + Math.tan(sway) * (ROOM.floor - my)) * 0.6 + LAMP.x * 0.2 - 0.18
}

function overNight(p: p5, s: NightState, c: Ctx): void {
  const T = c.t + s.begin
  const look = lookAt(T)
  p.push()
  p.translate(KN[0] * c.k, KN[1] * c.k)
  drawGlassFront(p, c, { T, light: Math.min(1, litAt(look, 3.0, 0.4)), ball: ballAt(s, c), splashes: [SPLASH, POP] })
  p.pop()
}

/** The hi-hat: open on its spring while he is away, pressed shut under him. */
function hatOpen(ball: Pt): number {
  const [hx, hy] = KIT_LAND.hat
  const over = 1 - smooth(Math.abs(ball[0] - hx), 0.25, 0.45)
  const pressed = Math.max(0, Math.min(0.5, (hy - ball[1]) / 0.13))
  return 0.5 + (pressed - 0.5) * over
}

export const night = part<NightState>(
  {
    name: 'night',
    draw: (p, s, c) => drawNight(p, s, c),
    over: (p, s, c) => overNight(p, s, c),
  },
  (slot: Slot) => {
    const path = build(slot.begin)
    const lane = path.lane(LAMP_ON)
    return {
      cells: box(ENTRY_X + KN[0] - 0.5, KN[1] + ROOM.ceil - 0.6, KN[0] + ROOM.x1 + 2.2, KN[1] + KIT_FLOOR + 0.6),
      exit: [KN[0] + REST[0] + 0.5, KN[1] + REST[1]] as Pt,
      lane,
      state: { begin: slot.begin, lane },
    }
  },
  (slot: Slot): PartShot[] => [
    // Following him in along the corridor; the room lit, and on with him along the floor.
    { t: slot.begin, cells: 5, off: [0.9, -1.55] },
    { t: LAMP_ON + 0.6, cells: 5.8, hold: at([-2.4, -0.45]), w: 0.75 },
    { t: KICK, cells: 5.5, hold: at([-0.5, -0.2]) },
    // The drill, scored to the tune's phrases, and each phrase a step closer: the sticks against the clock on its
    // shelf; nearer the sticks as it goes faster; nearer still; in to the red dab on the head when it comes.
    { t: DRILL + 0.4, cells: 4.5, hold: at([1.15, -0.75]) },
    { t: beat(326), cells: 3.7, hold: at([0.7, -0.55]) },
    { t: beat(334), cells: 3.0, hold: at([0.35, -0.4]) },
    { t: BLOOD, cells: 2.25, hold: at([0.15, -0.08]) },
    // To the glass, and back.
    { t: SPLASH, cells: 3.1, hold: at([2.3, -0.05]) },
    { t: POP, cells: 3.0, hold: at([2.5, 0.0]) },
    // The tape, close.
    { t: GRIP, cells: 2.4, hold: at([0.55, -0.35]) },
    { t: TAPED, cells: 2.5, hold: at([0.4, -0.3]) },
    // The drill again, grimmer: back to the sticks and the clock, then a step closer every phrase as it speeds up and
    // the lamp's pool swings wider across them, until the last strokes fill the frame with the sticks and the dab.
    { t: beat(356), cells: 4.6, hold: at([1.05, -0.8]) },
    { t: beat(366), cells: 3.9, hold: at([0.75, -0.6]) },
    { t: beat(376), cells: 3.3, hold: at([0.45, -0.45]) },
    { t: beat(384), cells: 2.8, hold: at([0.3, -0.35]) },
    { t: beat(391), cells: 2.4, hold: at([0.2, -0.25]) },
    // Dark, and in on him at rest: the match cut to the road.
    { t: REST_AT + 0.12, cells: 3.5, hold: at(REST), w: 1 },
    { t: slot.end, cells: 3.5, hold: at(REST), w: 1 },
  ],
)
