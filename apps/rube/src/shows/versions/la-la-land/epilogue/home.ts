import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp, easeInQuad, easeOutCubic } from '../../../../../../../src/core/ease'
import { FLOOR, laneAt, mixHex, type Lane, type Pt, type Seg } from '../../../../parts'
import { alpha, box, hash, knock, part, route, smooth, type Companion, type Ctx, type PartShot, type Way } from './kit'
import { batten, beam, flat, glow, hexA } from './rig'
import { DREAM, MIA, PAINT, SEB } from './worlds'

/**
 * Home: a little house on the stage, soft and warm.
 *
 * The number leaves the two at rest at the foot of its staircase. The light
 * changes: a night flat comes up behind a small house standing dark in the
 * stage's right, and a rain border (a long cloud on a batten) is lowered in
 * over it and settles on the first note of the soft run; on the run's notes
 * the rain comes down out of the cloud string by string, sweeping across the
 * stage, each string landing on the stage floor or on the roof.
 *
 * They roll to the door through the rain, and as he stops on the mat the
 * door opens on the big accent, warm light spilling out onto the porch; on
 * the four-note flourish the house lights up ahead of them, lamp by lamp:
 * the porch lantern, the living room's pendant, the nursery's night-light,
 * the moon on the mobile. They go in. He bumps the rocking chair; the chair
 * rocks, and its first rock forward pulls a cord that switches on an 8 mm
 * projector: the reels turn and a bright, empty rectangle lights on the wall
 * (the home movies: the light, not the pictures). She stays a moment to
 * watch. He rolls on under the chair to the crib and nudges it: the music
 * box's catch lets go, its key turns, the cam works the comb, and the mobile
 * turns over the crib; on each plucked note a star on it lights, and the
 * child (a small ball, yellow and blue: theirs) stirs. She comes to him.
 *
 * On the first big hit at the end the back door opens on the night; he goes,
 * she lingers by the crib and hurries after; the door closes behind them on
 * the second, and a streetlamp lights ahead of them. They walk on into the
 * chorus, the nursery window still lit behind them.
 *
 * The part's frame: the ball comes in at rest on the floor (y = 0, the floor
 * at FLOOR) and leaves the same level walking at 1 cell/s. The house is a
 * stage set: the night flat behind, the front and the back of the house as
 * flats turned to face the audience with a door in each, and the rooms
 * open between them.
 */

/* ------------------------------------------------------------------ the notes, as measured */

/** The rain border settles on its batten. */
const CLOUD = 239.258
/** The rain comes down a string a note, sweeping left to right. */
const RAIN = [239.421, 239.595, 239.769, 239.967, 240.187, 240.419, 240.582, 240.791, 241.139, 241.569, 241.94]
/** The front door opens as he stops on the mat: the big accent. */
const DOOR = 245.679
/** The flourish: four lamps light, left to right. */
const LAMPS = [246.352, 246.608, 246.863, 247.095]
/** He bumps the rocking chair; its rock forward switches the projector on. */
const CHAIR = 254.386
const MOVIE = 254.978
/** He nudges the crib: the music box lets go. Its five notes. */
const MUSIC_BOX = 259.587
const PLUCKS = [261.062, 261.259, 261.538, 261.863, 262.258]
/** The back door opens; it closes behind them; the streetlamp lights ahead of them. */
const OUT = 264.533
const SHUT = 268.469
const LAMP_POST = 269.491
export const HOME_HITS = [CLOUD, ...RAIN, DOOR, ...LAMPS, CHAIR, MOVIE, MUSIC_BOX, ...PLUCKS, OUT, SHUT, LAMP_POST]

/* ------------------------------------------------------------------ where things stand */

/** Where he goes: the mat before the door, inside the door, against the chair's runner, against the crib, past the back door. */
const MAT_X = 1.7
const IN_X = 2.95
const CHAIR_STOP = 3.42
const CRIB_STOP = 5.84
const OUT_X = 9.5
/** When he sets off each time. */
const SET_OFF = 241.55
const GO_IN = 247.35
const IN_AT = 249.6
const TO_CHAIR = 252.5
const TO_CRIB = 255.9
const LEAVE = 264.75
/** Walking pace on the street, and where the part ends. */
const WALK = 1.0
const EXIT_X = OUT_X + WALK * (272.44 - SHUT)

/** The night flat, and the batten the rain border hangs from. */
const SKY = { x0: 0.6, y0: -4.7, x1: 13.2, y1: FLOOR }
const BATTEN = { x0: 0.75, x1: 9.35, y: -3.85, parked: -7.4 }
const CLOUD_DROP = 0.5
/** The strings of rain, left to right: three on the floor before the house, eight on the roof. Two more seen in the window. */
const RAIN_X = [0.3, 0.75, 1.2, 2.2, 3.1, 4.0, 4.9, 5.75, 6.6, 7.5, 8.4]
const WINDOW_RAIN: [number, number][] = [
  [7.3, RAIN[8]],
  [7.68, RAIN[9]],
]

/** The house: the roof over everything, the front flat with its door, the rooms, the back flat with its door. */
const ROOF = { x0: 1.3, x1: 9.2, eave: -2.05, ridge: -3.1, mid: 5.25, fascia: 0.11 }
const CEIL = -2.05
const FRONT = { x0: 1.6, x1: 2.7 }
const BACK = { x0: 8.0, x1: 8.9 }
const DOOR_W = 0.6
const DOOR_H = 1.5
const FRONT_DOOR = { x0: 2.05, x1: 2.65 }
const BACK_DOOR = { x0: 8.05, x1: 8.65 }
const ROOM = { x0: 2.7, x1: 8.0 }
/** The living room: the projector on its stand, the rocking chair, the picture on the wall, the pendant. */
const PROJ = { x: 2.98, y: -1.22 }
const SCREEN = { x0: 4.5, y0: -1.92, x1: 5.5, y1: -1.27 }
const CHAIR_X = 3.95
const PENDANT: Pt = [4.1, -1.74]
/** The nursery: the night-light, the crib with the mobile over it, the window beside the back door. */
const NIGHT: Pt = [5.62, -1.42]
const CRIB = { x0: 6.0, x1: 7.05, rail: -0.98, mattress: -0.5 }
const WINDOW = { x0: 7.15, x1: 7.85, y0: -1.95, y1: -1.2 }
const HUB: Pt = [6.5, -1.55]
const MOBILE_R = 0.34
const CHILD_R = 0.07
/** The streetlamp beyond the back door. */
const POST: Pt = [11.8, -2.05]

/** The roof's underside at `x`, and its top. */
const roofAt = (x: number): number => ROOF.eave - (ROOF.eave - ROOF.ridge) * Math.max(0, 1 - Math.abs(x - ROOF.mid) / (ROOF.mid - ROOF.x0))

/* ------------------------------------------------------------------ motion */

/** A rise from 0 to 1 at `s` = 0, critically damped: crisp at first, settling without a bounce. */
const rise = (s: number, tau: number): number => (s <= 0 ? 0 : 1 - (1 + s / tau) * Math.exp(-s / tau))

/** A cubic from `a` leaving at `va` to `b` arriving at `vb`, `T` seconds apart, `u` of the way. */
function hermite(a: number, va: number, b: number, vb: number, T: number, u: number): number {
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  return h00 * a + h10 * T * va + h01 * b + h11 * T * vb
}

/** The batten's height at show time `T`: lowered in from the flies, settling on the first note with a small bob. */
function battenAt(T: number): number {
  const u = clamp((T - 238.06) / (CLOUD - 238.06))
  const y = BATTEN.parked + (BATTEN.y - BATTEN.parked) * easeOutCubic(u)
  const s = T - CLOUD
  return y + (s > 0 ? 0.05 * Math.exp(-s / 0.45) * Math.sin(s * 9) : 0)
}

/** How far a string of rain has come down at `T`, 0..1, landing at `at`: it falls, gathering. */
function strandAt(T: number, at: number): number {
  const D = 0.5
  return easeInQuad(clamp((T - (at - D)) / D))
}

/** The front door, open 0..1: shut until the accent, then swinging wide and settling. The back door: open on the hit, closing on the second. */
const frontDoor = (T: number): number => rise(T - DOOR, 0.13)
function backDoor(T: number): number {
  if (T < OUT) return 0
  const closing = SHUT - 0.5
  if (T < closing) return rise(T - OUT, 0.13)
  return T < SHUT ? 1 - easeInQuad((T - closing) / (SHUT - closing)) : 0
}

/** The rocking chair's tip (radians, forward is positive) after his knock: a rock that dies over seconds. */
function chairRock(T: number): number {
  const s = T - CHAIR
  if (s <= 0) return 0
  return 0.16 * Math.exp(-s / 2.4) * Math.sin(s * 2.65) * smooth(s, 0, 0.05)
}

/** The music box: how far its cam has turned (radians) since the catch let go; it runs down after the tune. */
function camAt(T: number): number {
  const s = T - MUSIC_BOX
  if (s <= 0) return 0
  const slow = 1 - 0.85 * smooth(s, 6, 10)
  return s * 1.5 * slow
}

/** The mobile's turn (radians): driven by the music box, gathering as the spring takes hold, and winding down after. */
const mobileAt = (T: number): number => camAt(T) * 0.55

/** A lamp lit at `at`: 0 before, on at once with a brief flare, then steady. */
const lit = (T: number, at: number): number => (T < at ? 0 : smooth(T - at, 0, 0.05) * (1 + 0.35 * knock(T - at, 0.14)))

/** The crib's shiver when he nudges it: what throws the music box's catch. */
function cribShake(T: number): number {
  const s = T - MUSIC_BOX
  return s <= 0 ? 0 : 0.022 * Math.exp(-s / 0.45) * Math.sin(s * 15)
}

/** The child stirring with the plucked notes: a little roll, back and forth, dying away. */
function stir(T: number): number {
  let d = 0
  for (const t of PLUCKS) {
    const s = T - t
    if (s > 0) d += 0.05 * Math.exp(-s / 0.7) * Math.sin(s * 6.5)
  }
  return d
}

/* ------------------------------------------------------------------ the part */

interface HomeState {
  begin: number
  lane: Lane
}

/** Two ways for a run from rest at (`x0`, `t0`) to a stop at (`x1`, `t1`): speed up, then slow down, the pace they need. */
function glide(x0: number, t0: number, x1: number, t1: number): Way[] {
  const T = t1 - t0
  const v = (2 * (x1 - x0)) / T
  return [
    { at: t0 + T / 2, p: [(x0 + x1) / 2, 0], ramp: [0, v] },
    { at: t1, p: [x1, 0], ramp: [v, 0] },
  ]
}

/** Two ways for a run from rest at (`x0`, `t0`) to (`x1`, `t1`) still moving at `v1`. */
function gather(x0: number, t0: number, x1: number, t1: number, v1: number, split = 0.46): Way[] {
  const T = t1 - t0
  const T1 = T * split
  const T2 = T - T1
  // Half the peak over T1 and the mean of peak and v1 over T2 add up to the distance.
  const v = (x1 - x0 - (v1 * T2) / 2) / (T1 / 2 + T2 / 2)
  return [
    { at: t0 + T1, p: [x0 + (v * T1) / 2, 0], ramp: [0, v] },
    { at: t1, p: [x1, 0], ramp: [v, v1] },
  ]
}

export const home = part<HomeState>(
  {
    name: 'home',
    draw: (p, s, c) => drawHome(p, s, c),
    over: (p, s, c) => drawOver(p, s, c),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const end = slot.end - slot.begin
    const ways: Way[] = [
      { at: 0, p: [-0.5, 0] },
      { at: at(SET_OFF), p: [-0.5, 0] },
      ...glide(-0.5, at(SET_OFF), MAT_X, at(DOOR)),
      { at: at(GO_IN), p: [MAT_X, 0] },
      ...glide(MAT_X, at(GO_IN), IN_X, at(IN_AT)),
      { at: at(TO_CHAIR), p: [IN_X, 0] },
      // Against the chair's runner with a little pace, and a small recoil off it.
      { at: at(CHAIR), p: [CHAIR_STOP, 0], ramp: [0, (2 * (CHAIR_STOP - IN_X)) / (CHAIR - TO_CHAIR)] },
      { at: at(CHAIR) + 0.3, p: [CHAIR_STOP - 0.05, 0], ease: 'out' },
      { at: at(TO_CRIB), p: [CHAIR_STOP - 0.05, 0] },
      ...gather(CHAIR_STOP - 0.05, at(TO_CRIB), CRIB_STOP, at(MUSIC_BOX), 0.45),
      { at: at(MUSIC_BOX) + 0.3, p: [CRIB_STOP - 0.04, 0], ease: 'out' },
      { at: at(LEAVE), p: [CRIB_STOP - 0.04, 0] },
      ...gather(CRIB_STOP - 0.04, at(LEAVE), OUT_X, at(SHUT), WALK),
      { at: end, p: [EXIT_X, 0], ramp: [WALK, WALK] },
    ]
    const segs: Seg[] = route(ways)
    const lane: Lane = { segs, fire: at(DOOR) }
    const seb = (T: number): number => laneAt(lane, at(T)).x
    return {
      cells: box(-1, -8, EXIT_X + 1, 1),
      exit: [EXIT_X + 0.5, 0],
      lane,
      state: { begin: slot.begin, lane },
      company: [{ from: slot.begin, to: slot.end, at: (T) => miaAt(T, seb) }],
    }
  },
  (slot) => shotsFor(slot),
)

/* ------------------------------------------------------------------ Mia */

const LAG = 0.14
/** She lets him go first to the movie, then goes to the crib herself; she lingers there, and hurries after him. */
const HER_TO_CRIB: [number, number] = [258.4, 262.6]
const HER_LINGER = 265.3
const HER_CAUGHT = 269.0

/** Where she is, in his wake: a step behind him and a beat late, until the movie; her own way to the crib; after him. */
function miaAt(T: number, seb: (T: number) => number): Companion {
  const behind = (t: number) => seb(t) - 0.32
  let x: number
  if (T < TO_CRIB + LAG) x = behind(T - LAG)
  else if (T < HER_TO_CRIB[0]) x = behind(TO_CRIB)
  else if (T < HER_TO_CRIB[1]) {
    // Slow to start, gathering, easing in to a stop.
    const u = (T - HER_TO_CRIB[0]) / (HER_TO_CRIB[1] - HER_TO_CRIB[0])
    const e = 4 * u ** 3 - 3 * u ** 4
    x = behind(TO_CRIB) + (CRIB_STOP - 0.04 - 0.32 - behind(TO_CRIB)) * e
  } else if (T < HER_LINGER) x = CRIB_STOP - 0.04 - 0.32
  else if (T < HER_CAUGHT) {
    const D = HER_CAUGHT - HER_LINGER
    x = hermite(CRIB_STOP - 0.04 - 0.32, 0, behind(HER_CAUGHT), WALK, D, (T - HER_LINGER) / D)
  } else x = behind(T)
  return { x, y: 0 }
}

/* ------------------------------------------------------------------ camera */

function shotsFor(slot: { begin: number; end: number }): PartShot[] {
  return [
    // The number's last framing; a drift up and right as the rain border comes in and the house takes the light.
    { t: slot.begin, cells: 5.0, off: [0.4, -1.2] },
    { t: CLOUD, cells: 5.2, hold: [2.3, -1.5], w: 0.55 },
    { t: 242.0, cells: 5.5, hold: [3.5, -1.6], w: 0.62 },
    // In on the door as they reach it; then along the rooms with them.
    { t: DOOR, cells: 4.7, hold: [2.6, -1.0], w: 0.6 },
    { t: IN_AT, cells: 4.7, hold: [3.6, -1.05], w: 0.6 },
    { t: CHAIR, cells: 4.5, hold: [4.2, -1.1], w: 0.65 },
    { t: MUSIC_BOX, cells: 4.3, hold: [5.8, -0.95], w: 0.65 },
    { t: OUT, cells: 4.6, hold: [6.9, -1.0], w: 0.6 },
    // Out with them: a follow, ahead of them, onto the street.
    { t: SHUT, cells: 5.0, off: [0.6, -1.0] },
    { t: slot.end, cells: 5.4, off: [0.8, -1.1] },
  ]
}

/* ------------------------------------------------------------------ drawing */

const WALL_IN = mixHex(DREAM.bg, PAINT.rose, 0.3)
const WALL_OUT = mixHex(DREAM.bg, PAINT.rose, 0.55)
const ROOF_IN = mixHex(DREAM.bg, PAINT.deep, 0.7)
const CLOUD_PAINT = mixHex(DREAM.bg, PAINT.cream, 0.5)
const CHILD_YELLOW = MIA
const CHILD_BLUE = SEB

function drawHome(p: p5, s: HomeState, c: Ctx): void {
  const { k, ink, weight } = c
  const T = c.t + s.begin
  const X = (v: number) => v * k
  // The light comes up on the set as the number's goes down: nothing of this is seen before the ball is here.
  const L = smooth(T, s.begin, s.begin + 1.4)
  if (L <= 0) return

  // The night flat, its edge showing: the set stands in front of it.
  flat(p, c, SKY.x0, SKY.y0, SKY.x1 - SKY.x0, SKY.y1 - SKY.y0, PAINT.deep, PAINT.violet)
  // The stage floor.
  outline(p, ink, weight * 0.8)
  p.line(X(-0.5), X(FLOOR), X(EXIT_X + 1), X(FLOOR))

  drawRain(p, c, T)
  drawHouse(p, c, T)
  drawLivingRoom(p, c, T)
  drawNursery(p, c, T)
  drawStreet(p, c, T)

  // The dimmer: the whole set is dark until the number has finished with the stage.
  if (L < 1) {
    p.noStroke()
    p.fill(alpha(p, DREAM.bg, 1 - L))
    p.rect(X((0.55 + EXIT_X - 0.3) / 2), X(-3.5), X(EXIT_X - 0.3 - 0.55), X(10))
  }
}

/** What stands in front of the ball: the chair's near runner and spindles (he passes under it), the crib's near rail. */
function drawOver(p: p5, s: HomeState, c: Ctx): void {
  const T = c.t + s.begin
  const L = smooth(T, s.begin, s.begin + 1.4)
  if (L <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const was = ctx.globalAlpha
  ctx.globalAlpha = was * L
  chairNear(p, c, T)
  cribNear(p, c, T)
  ctx.globalAlpha = was
}

/* ------------------------------------------------------------------ the rain */

function drawRain(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const by = battenAt(T)
  if (by > 1) return
  batten(p, c, BATTEN.x0, BATTEN.x1, by)
  // The rain border: a long night cloud cut out of board, hung from the batten on short lines: a row of soft lobes
  // along its top and a heavier, lower row along its foot, where the rain comes out.
  const top = by + 0.12
  const foot = by + CLOUD_DROP
  outline(p, ink, weight * 0.45)
  for (const x of [BATTEN.x0 + 0.9, (BATTEN.x0 + BATTEN.x1) / 2, BATTEN.x1 - 0.9]) p.line(X(x), X(by), X(x), X(top + 0.1))
  solid(p, ink, weight * 0.7, CLOUD_PAINT)
  p.beginShape()
  const lobes = 7
  const span = BATTEN.x1 - BATTEN.x0 - 0.3
  for (let i = 0; i <= lobes * 6; i++) {
    const u = i / (lobes * 6)
    const bump = Math.abs(Math.sin(u * Math.PI * lobes))
    p.vertex(X(BATTEN.x0 + 0.15 + span * u), X(top + 0.16 - 0.16 * bump - 0.03 * hash(i, 3)))
  }
  for (let i = lobes * 6; i >= 0; i--) {
    const u = i / (lobes * 6)
    const bump = Math.abs(Math.sin(u * Math.PI * lobes + 0.9))
    p.vertex(X(BATTEN.x0 + 0.15 + span * u), X(foot - 0.14 + 0.14 * bump + 0.02 * hash(i, 5)))
  }
  p.endShape(p.CLOSE)

  // The strings: each comes down on its note, to the floor before the house or onto the roof, and hangs there, shimmering.
  const strand = (x: number, at: number, ground: number, from = foot) => {
    const u = strandAt(T, at)
    if (u <= 0) return
    const end = from + (ground - from) * u
    p.noFill()
    p.stroke(hexA(PAINT.beam, 0.62))
    p.strokeWeight(weight * 0.5)
    p.beginShape()
    const n = 12
    for (let i = 0; i <= n; i++) {
      const y = from + (end - from) * (i / n)
      const wave = u >= 1 ? 0.014 * Math.sin(y * 9 - T * 5.5 + x * 3) : 0
      p.vertex(X(x + wave), X(y))
    }
    p.endShape()
    // The landing: a splash of two drops, and the string's foot.
    const since = T - at
    if (since > 0 && since < 0.32) {
      const f = since / 0.32
      p.noStroke()
      p.fill(hexA(PAINT.beam, 0.7 * (1 - f)))
      for (const side of [-1, 1]) p.circle(X(x + side * (0.03 + 0.09 * f)), X(ground - 0.09 * Math.sin(Math.PI * f) - 0.01), X(0.035))
    }
  }
  RAIN_X.forEach((x, i) => strand(x, RAIN[i], x < FRONT.x0 ? FLOOR : roofAt(x) - 0.08))
  // Seen through the nursery window: two strings falling past it, behind the house. Clipped to the pane.
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(WINDOW.x0), X(WINDOW.y0), X(WINDOW.x1 - WINDOW.x0), X(WINDOW.y1 - WINDOW.y0))
  ctx.clip()
  // The pane shows the night behind.
  flat(p, c, WINDOW.x0, SKY.y0, WINDOW.x1 - WINDOW.x0, SKY.y1 - SKY.y0, PAINT.deep, PAINT.violet, false)
  for (const [x, at] of WINDOW_RAIN) strand(x, at, FLOOR, foot)
  ctx.restore()
  p.pop()
}

/* ------------------------------------------------------------------ the house */

function drawHouse(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k

  // The rooms' back wall, with the window cut in it (the pane was painted with the rain).
  p.noStroke()
  p.fill(WALL_IN)
  p.rect(X((ROOM.x0 + WINDOW.x0) / 2), X((CEIL + FLOOR) / 2), X(WINDOW.x0 - ROOM.x0), X(FLOOR - CEIL))
  p.rect(X((WINDOW.x1 + ROOM.x1) / 2), X((CEIL + FLOOR) / 2), X(ROOM.x1 - WINDOW.x1), X(FLOOR - CEIL))
  p.rect(X((WINDOW.x0 + WINDOW.x1) / 2), X((CEIL + WINDOW.y0) / 2), X(WINDOW.x1 - WINDOW.x0), X(WINDOW.y0 - CEIL))
  p.rect(X((WINDOW.x0 + WINDOW.x1) / 2), X((WINDOW.y1 + FLOOR) / 2), X(WINDOW.x1 - WINDOW.x0), X(FLOOR - WINDOW.y1))
  // The window's frame and its cross.
  outline(p, ink, weight * 0.8)
  p.rect(X((WINDOW.x0 + WINDOW.x1) / 2), X((WINDOW.y0 + WINDOW.y1) / 2), X(WINDOW.x1 - WINDOW.x0), X(WINDOW.y1 - WINDOW.y0))
  outline(p, ink, weight * 0.55)
  p.line(X((WINDOW.x0 + WINDOW.x1) / 2), X(WINDOW.y0), X((WINDOW.x0 + WINDOW.x1) / 2), X(WINDOW.y1))
  p.line(X(WINDOW.x0), X((WINDOW.y0 + WINDOW.y1) / 2), X(WINDOW.x1), X((WINDOW.y0 + WINDOW.y1) / 2))
  // The sill.
  solid(p, ink, weight * 0.7, PAINT.timber)
  p.rect(X((WINDOW.x0 + WINDOW.x1) / 2), X(WINDOW.y1 + 0.03), X(WINDOW.x1 - WINDOW.x0 + 0.14), X(0.06))
  // The ceiling line and the floor's skirting.
  outline(p, ink, weight * 0.7)
  p.line(X(ROOM.x0), X(CEIL), X(ROOM.x1), X(CEIL))

  // The front and the back of the house: flats turned to face the audience, a door in each.
  for (const [f, door, open, x0, x1] of [
    [FRONT, FRONT_DOOR, frontDoor(T), FRONT.x0, FRONT.x1],
    [BACK, BACK_DOOR, backDoor(T), BACK.x0, BACK.x1],
  ] as [typeof FRONT, typeof FRONT_DOOR, number, number, number][]) {
    void f
    const top = Math.min(roofAt(x0), roofAt(x1))
    p.noStroke()
    p.fill(WALL_OUT)
    p.rect(X((x0 + x1) / 2), X((top + FLOOR) / 2), X(x1 - x0), X(FLOOR - top))
    // The doorway: the light through it, then the door on its hinge at the left jamb, foreshortening as it swings.
    const dx0 = door.x0
    const dx1 = door.x1
    const dtop = FLOOR - DOOR_H
    const inside = f === FRONT
    if (open > 0.01) {
      // The light is through the crack at once; the door's swing uncovers the doorway.
      const spill = inside ? smooth(T - DOOR, 0, 0.03) * (1 + 0.35 * knock(T - DOOR, 0.14)) * (0.55 + 0.45 * open) : open
      p.noStroke()
      p.fill(inside ? hexA(PAINT.beam, 0.6) : hexA(PAINT.blue, 0.3 * open))
      p.rect(X((dx0 + dx1) / 2), X((dtop + FLOOR) / 2), X(dx1 - dx0), X(FLOOR - dtop))
      if (inside) glow(p, c, (dx0 + dx1) / 2, -0.6, 1.5, 0.42 * spill, PAINT.gold)
      else glow(p, c, (dx0 + dx1) / 2, -0.7, 1.1, 0.22 * open, PAINT.blue)
    }
    const w = DOOR_W * Math.cos(open * 1.38) + 0.03
    solid(p, ink, weight * 0.85, PAINT.sea)
    p.rect(X(dx0 + w / 2), X((dtop + FLOOR) / 2), X(w), X(FLOOR - dtop))
    if (w > 0.25) {
      // Two panels and a knob.
      outline(p, ink, weight * 0.5)
      p.rect(X(dx0 + w / 2), X(dtop + 0.42), X(w - 0.16), X(0.5))
      p.rect(X(dx0 + w / 2), X(dtop + 1.1), X(w - 0.16), X(0.5))
      p.noStroke()
      p.fill(PAINT.gold)
      p.circle(X(dx0 + w - 0.09), X(dtop + 0.78), X(0.045))
    }
    // The frame: jambs and head.
    outline(p, ink, weight * 0.9)
    p.line(X(dx0), X(FLOOR), X(dx0), X(dtop))
    p.line(X(dx1), X(FLOOR), X(dx1), X(dtop))
    p.line(X(dx0 - 0.04), X(dtop), X(dx1 + 0.04), X(dtop))
    // The flat's edges: the outer one full height, the inner one only above the door, so the doorway leads into the rooms.
    outline(p, ink, weight * 0.8)
    const outer = inside ? x0 : x1
    const inner = inside ? x1 : x0
    p.line(X(outer), X(FLOOR), X(outer), X(roofAt(outer)))
    p.line(X(inner), X(dtop - 0.1), X(inner), X(roofAt(inner)))
  }

  // The doormat before the front door, where he stops.
  p.noStroke()
  p.fill(hexA(PAINT.red, 0.7))
  p.rect(X(MAT_X + 0.05), X(FLOOR - 0.02), X(0.5), X(0.045))

  // The roof: the dark of the attic, and the fascia along the slopes, a chimney on the right.
  solid(p, ink, weight * 0.8, ROOF_IN)
  p.triangle(X(ROOF.x0), X(ROOF.eave), X(ROOF.mid), X(ROOF.ridge), X(ROOF.x1), X(ROOF.eave))
  solid(p, ink, weight * 0.8, PAINT.timber)
  const chimney = 7.6
  p.rect(X(chimney), X((roofAt(chimney) - 0.75 + roofAt(chimney) + 0.1) / 2), X(0.3), X(0.85))
  p.beginShape()
  p.vertex(X(ROOF.x0), X(ROOF.eave))
  p.vertex(X(ROOF.mid), X(ROOF.ridge))
  p.vertex(X(ROOF.x1), X(ROOF.eave))
  p.vertex(X(ROOF.x1), X(ROOF.eave + ROOF.fascia))
  p.vertex(X(ROOF.mid), X(ROOF.ridge + ROOF.fascia))
  p.vertex(X(ROOF.x0), X(ROOF.eave + ROOF.fascia))
  p.endShape(p.CLOSE)

  // The porch lantern under the eave over the front door.
  const lantern: Pt = [(FRONT_DOOR.x0 + FRONT_DOOR.x1) / 2, FLOOR - DOOR_H - 0.3]
  const lamp0 = lit(T, LAMPS[0])
  outline(p, ink, weight * 0.6)
  p.line(X(lantern[0]), X(roofAt(lantern[0]) + ROOF.fascia), X(lantern[0]), X(lantern[1] - 0.09))
  solid(p, ink, weight * 0.7, lamp0 > 0 ? PAINT.beam : PAINT.deep)
  p.rect(X(lantern[0]), X(lantern[1]), X(0.12), X(0.16), X(0.01))
  if (lamp0 > 0) glow(p, c, lantern[0], lantern[1], 1.0, 0.5 * lamp0, PAINT.gold)
}

/* ------------------------------------------------------------------ the living room */

/** A point of the chair, in its own cells (x back from its middle, y up from the floor), turned by its rock. */
function onChair(T: number, lx: number, ly: number): Pt {
  const a = chairRock(T)
  // It rocks on its runners: about a centre well above them, which is near enough to rolling for a small tip.
  const cy = FLOOR - 0.85
  const x = CHAIR_X + lx
  const y = FLOOR - ly
  const dx = x - CHAIR_X
  const dy = y - cy
  return [CHAIR_X + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]
}

function drawLivingRoom(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const L = (q: Pt, r: Pt) => p.line(X(q[0]), X(q[1]), X(r[0]), X(r[1]))

  // The pendant over the room.
  const lamp1 = lit(T, LAMPS[1])
  outline(p, ink, weight * 0.55)
  p.line(X(PENDANT[0]), X(CEIL), X(PENDANT[0]), X(PENDANT[1] - 0.12))
  solid(p, ink, weight * 0.7, lamp1 > 0 ? PAINT.beam : PAINT.deep)
  p.quad(X(PENDANT[0] - 0.1), X(PENDANT[1] - 0.12), X(PENDANT[0] + 0.1), X(PENDANT[1] - 0.12), X(PENDANT[0] + 0.19), X(PENDANT[1] + 0.06), X(PENDANT[0] - 0.19), X(PENDANT[1] + 0.06))
  if (lamp1 > 0) glow(p, c, PENDANT[0], PENDANT[1] + 0.1, 1.25, 0.42 * lamp1, PAINT.gold)

  // The picture on the wall: the projector's light, an empty frame of it, flickering a little as the film runs.
  const movie = lit(T, MOVIE)
  if (movie > 0) {
    const flicker = 0.9 + 0.1 * Math.sin(T * 41) * Math.sin(T * 13)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = hexA(PAINT.beam, 0.72 * Math.min(1, movie) * flicker)
    ctx.fillRect(X(SCREEN.x0), X(SCREEN.y0), X(SCREEN.x1 - SCREEN.x0), X(SCREEN.y1 - SCREEN.y0))
    ctx.restore()
    beam(p, c, [PROJ.x + 0.22, PROJ.y], [(SCREEN.x0 + SCREEN.x1) / 2, (SCREEN.y0 + SCREEN.y1) / 2], SCREEN.y1 - SCREEN.y0, 0.22 * Math.min(1, movie))
  }

  // The projector on its stand: a tall stool, the body, two reels on their arms, the lens toward the wall.
  solid(p, ink, weight * 0.8, PAINT.timber)
  p.rect(X(PROJ.x), X((PROJ.y + 0.16 + FLOOR) / 2), X(0.07), X(FLOOR - PROJ.y - 0.16))
  p.rect(X(PROJ.x), X(PROJ.y + 0.16), X(0.36), X(0.05))
  for (const dx of [-0.13, 0.13]) p.line(X(PROJ.x + dx), X(PROJ.y + 0.18), X(PROJ.x + dx * 1.6), X(FLOOR))
  solid(p, ink, weight * 0.8, PAINT.deep)
  p.rect(X(PROJ.x), X(PROJ.y), X(0.36), X(0.26), X(0.02))
  p.rect(X(PROJ.x + 0.22), X(PROJ.y), X(0.1), X(0.12))
  const turn = T > MOVIE ? (T - MOVIE) * 5 : 0
  for (const [dx, dy, r, rate] of [
    [-0.13, -0.3, 0.15, 1],
    [0.11, -0.28, 0.12, 1.25],
  ]) {
    outline(p, ink, weight * 0.7)
    p.line(X(PROJ.x + dx), X(PROJ.y - 0.13), X(PROJ.x + dx), X(PROJ.y + dy))
    solid(p, ink, weight * 0.7, PAINT.deep)
    p.circle(X(PROJ.x + dx), X(PROJ.y + dy), X(2 * r))
    outline(p, ink, weight * 0.5)
    for (let i = 0; i < 3; i++) {
      const a = turn * rate + (i * Math.PI * 2) / 3
      p.line(X(PROJ.x + dx), X(PROJ.y + dy), X(PROJ.x + dx + Math.cos(a) * r * 0.85), X(PROJ.y + dy + Math.sin(a) * r * 0.85))
    }
    solid(p, ink, weight * 0.6, PAINT.gold)
    p.circle(X(PROJ.x + dx), X(PROJ.y + dy), X(0.05))
  }
  // The film, from the full reel over to the take-up.
  outline(p, ink, weight * 0.45)
  p.line(X(PROJ.x - 0.13), X(PROJ.y - 0.45), X(PROJ.x + 0.11), X(PROJ.y - 0.4))
  // The switch: a small lever on the body's near side that the cord from the chair pulls over.
  const flipped = smooth(T, MOVIE - 0.02, MOVIE + 0.06)
  const sw: Pt = [PROJ.x + 0.05, PROJ.y + 0.14]
  outline(p, ink, weight * 0.8)
  p.line(X(sw[0]), X(sw[1]), X(sw[0] + 0.07 * (flipped * 2 - 1)), X(sw[1] + 0.09))

  // The rocking chair, the far side of it: the far runner, the back's far post, the seat; the near side is drawn over the ball.
  const runner = (lift: number) => {
    p.beginShape()
    for (let i = 0; i <= 12; i++) {
      const u = i / 12
      const lx = -0.42 + 0.84 * u
      const ly = lift + 0.09 * (4 * (u - 0.5) * (u - 0.5))
      const q = onChair(T, lx, ly)
      p.vertex(X(q[0]), X(q[1]))
    }
    p.endShape()
  }
  outline(p, ink, weight * 0.7)
  p.noFill()
  runner(0.05)
  // The far legs and the far back post, fainter.
  outline(p, ink, weight * 0.6)
  L(onChair(T, -0.19, 0.06), onChair(T, -0.19, 0.42))
  L(onChair(T, 0.2, 0.06), onChair(T, 0.2, 0.42))
  L(onChair(T, -0.19, 0.42), onChair(T, -0.26, 1.06))
  // The seat.
  solid(p, ink, weight * 0.8, PAINT.timber)
  const s0 = onChair(T, -0.24, 0.42)
  const s1 = onChair(T, 0.28, 0.42)
  const s2 = onChair(T, 0.28, 0.48)
  const s3 = onChair(T, -0.24, 0.48)
  p.quad(X(s0[0]), X(s0[1]), X(s1[0]), X(s1[1]), X(s2[0]), X(s2[1]), X(s3[0]), X(s3[1]))
  // The cord from the top of the chair's back to the projector's switch, over a screw eye on the stand: slack while it rests.
  const top = onChair(T, -0.26, 1.08)
  const eye: Pt = [PROJ.x + 0.19, PROJ.y + 0.2]
  outline(p, ink, weight * 0.45)
  p.noFill()
  const sag = 0.08 * (1 - clamp(chairRock(T) / 0.12))
  p.bezier(X(top[0]), X(top[1]), X(top[0] - 0.2), X(top[1] + sag), X(eye[0] + 0.15), X(eye[1] + sag), X(eye[0]), X(eye[1]))
  p.line(X(eye[0]), X(eye[1]), X(sw[0] + 0.07 * (flipped * 2 - 1)), X(sw[1] + 0.09))
}

/** The chair's near side, in front of the ball: the near runner, legs, arm, and the back's spindles. */
function chairNear(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const L = (q: Pt, r: Pt) => p.line(X(q[0]), X(q[1]), X(r[0]), X(r[1]))
  outline(p, ink, weight * 0.9)
  p.noFill()
  p.beginShape()
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    const q = onChair(T, -0.46 + 0.92 * u, 0.02 + 0.1 * (4 * (u - 0.5) * (u - 0.5)))
    p.vertex(X(q[0]), X(q[1]))
  }
  p.endShape()
  // Legs to the seat; the back's posts and spindles; the arm.
  L(onChair(T, -0.16, 0.06), onChair(T, -0.16, 0.42))
  L(onChair(T, 0.23, 0.06), onChair(T, 0.23, 0.42))
  L(onChair(T, -0.22, 0.42), onChair(T, -0.3, 1.1))
  // The spindles of the back, leaning with the posts.
  outline(p, ink, weight * 0.55)
  for (let i = 1; i <= 3; i++) {
    const f = i / 4
    L(onChair(T, -0.22 + 0.1 * f, 0.48), onChair(T, -0.3 + 0.1 * f, 1.0 + 0.04 * f))
  }
  outline(p, ink, weight * 0.9)
  L(onChair(T, -0.3, 1.1), onChair(T, -0.16, 1.14))
  L(onChair(T, -0.16, 1.14), onChair(T, -0.2, 1.0))
  // The arm.
  L(onChair(T, -0.26, 0.78), onChair(T, 0.24, 0.76))
  L(onChair(T, 0.24, 0.76), onChair(T, 0.22, 0.48))
}

/* ------------------------------------------------------------------ the nursery */

/** A five-pointed star, radius `r`, at (x, y). */
function star(p: p5, k: number, x: number, y: number, r: number): void {
  p.beginShape()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    p.vertex((x + Math.cos(a) * rr) * k, (y + Math.sin(a) * rr) * k)
  }
  p.endShape(p.CLOSE)
}

/** The stars' places on the mobile's ring at `T`: side-on, the ring an ellipse, each hanging at its own length. */
function mobileStars(T: number): { x: number; y: number; depth: number }[] {
  const a0 = mobileAt(T)
  const out: { x: number; y: number; depth: number }[] = []
  for (let i = 0; i < PLUCKS.length; i++) {
    const a = a0 + (i * Math.PI * 2) / PLUCKS.length
    out.push({ x: HUB[0] + Math.cos(a) * MOBILE_R, y: HUB[1] + 0.06 + Math.sin(a) * MOBILE_R * 0.22, depth: Math.sin(a) })
  }
  return out
}

function drawNursery(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k

  // The night-light on the wall: a small shade, rose.
  const lamp2 = lit(T, LAMPS[2])
  solid(p, ink, weight * 0.7, lamp2 > 0 ? PAINT.rose : PAINT.deep)
  p.arc(X(NIGHT[0]), X(NIGHT[1] + 0.06), X(0.26), X(0.24), Math.PI, Math.PI * 2, p.CHORD)
  if (lamp2 > 0) glow(p, c, NIGHT[0], NIGHT[1], 0.95, 0.4 * lamp2, PAINT.rose)

  // The crib and everything on it shiver with his nudge.
  p.push()
  p.translate(X(cribShake(T)), 0)
  // The crib's far side: the end posts, the far rail with its spindles, the mattress.
  const post = (x: number, w: number) => {
    solid(p, ink, weight * 0.8, PAINT.timber)
    p.rect(X(x), X((CRIB.rail - 0.08 + FLOOR) / 2), X(w), X(FLOOR - CRIB.rail + 0.08), X(0.01))
  }
  post(CRIB.x0 + 0.03, 0.06)
  post(CRIB.x1 - 0.03, 0.06)
  outline(p, ink, weight * 0.5)
  p.line(X(CRIB.x0 + 0.06), X(CRIB.rail + 0.02), X(CRIB.x1 - 0.06), X(CRIB.rail + 0.02))
  for (let i = 1; i < 8; i++) {
    const x = CRIB.x0 + ((CRIB.x1 - CRIB.x0) * i) / 8
    p.line(X(x), X(CRIB.rail + 0.02), X(x), X(CRIB.mattress))
  }
  solid(p, ink, weight * 0.7, PAINT.cream)
  p.rect(X((CRIB.x0 + CRIB.x1) / 2), X(CRIB.mattress + 0.07), X(CRIB.x1 - CRIB.x0 - 0.1), X(0.14), X(0.02))

  // The child, in the crib: a small ball, yellow and blue, rolling a hair with each note.
  const d = stir(T)
  const cx = (CRIB.x0 + CRIB.x1) / 2 + 0.1 + d
  const cy = CRIB.mattress - CHILD_R
  p.push()
  p.translate(X(cx), X(cy))
  p.rotate(d / CHILD_R)
  p.noStroke()
  p.fill(CHILD_YELLOW)
  p.arc(0, 0, X(2 * CHILD_R), X(2 * CHILD_R), Math.PI / 2, (3 * Math.PI) / 2, p.PIE)
  p.fill(CHILD_BLUE)
  p.arc(0, 0, X(2 * CHILD_R), X(2 * CHILD_R), -Math.PI / 2, Math.PI / 2, p.PIE)
  outline(p, ink, weight * 0.7)
  p.circle(0, 0, X(2 * CHILD_R))
  p.pop()

  // The music box on the crib's end: the case, the key that turns, the cam with its pins, the comb it plucks.
  const bx = CRIB.x0 - 0.02
  const by = CRIB.rail - 0.02
  const cam = camAt(T)
  solid(p, ink, weight * 0.75, PAINT.timber)
  p.rect(X(bx), X(by - 0.1), X(0.3), X(0.2), X(0.01))
  // The key, out the left side.
  p.push()
  p.translate(X(bx - 0.15), X(by - 0.1))
  p.rotate(-cam * 0.5)
  outline(p, ink, weight * 0.7)
  p.line(0, 0, X(-0.08), 0)
  solid(p, ink, weight * 0.6, PAINT.gold)
  p.ellipse(X(-0.1), 0, X(0.05), X(0.09))
  p.pop()
  // The cam: a disc with five pins, and the comb of five teeth beside it, each flicking as its pin passes.
  const cc: Pt = [bx - 0.05, by - 0.1]
  solid(p, ink, weight * 0.6, PAINT.gold)
  p.circle(X(cc[0]), X(cc[1]), X(0.13))
  p.noStroke()
  p.fill(ink)
  for (let i = 0; i < 5; i++) {
    const a = cam + (i * Math.PI * 2) / 5
    p.circle(X(cc[0] + Math.cos(a) * 0.07), X(cc[1] + Math.sin(a) * 0.07), X(0.02))
  }
  outline(p, ink, weight * 0.55)
  for (let i = 0; i < 5; i++) {
    const s = T - PLUCKS[i]
    const flick = s > 0 ? 0.018 * Math.exp(-s / 0.14) * Math.sin(s * 55) : 0
    const y = cc[1] - 0.06 + i * 0.03
    p.line(X(bx + 0.13), X(y), X(cc[0] + 0.06), X(y + flick))
  }
  // The catch: a small pawl on the cam, thrown off when he nudges the crib.
  const thrown = smooth(T, MUSIC_BOX, MUSIC_BOX + 0.12)
  outline(p, ink, weight * 0.7)
  p.line(X(cc[0] - 0.1), X(cc[1] + 0.11 + 0.06 * thrown), X(cc[0] - 0.02), X(cc[1] + 0.06 + 0.02 * thrown))

  // The mobile: a rod from the box up to the hub, the ring turning, the stars on their threads, the moon under the hub.
  outline(p, ink, weight * 0.55)
  p.line(X(bx), X(by - 0.2), X(bx), X(HUB[1] - 0.05))
  p.line(X(bx), X(HUB[1] - 0.05), X(HUB[0]), X(HUB[1] - 0.05))
  p.line(X(HUB[0]), X(HUB[1] - 0.05), X(HUB[0]), X(HUB[1] + 0.06))
  const stars = mobileStars(T)
  // The ring, side-on: an ellipse, the far half fainter.
  outline(p, ink, weight * 0.55)
  p.ellipse(X(HUB[0]), X(HUB[1] + 0.06), X(2 * MOBILE_R), X(2 * MOBILE_R * 0.22))
  const drops = [0.24, 0.34, 0.2, 0.3, 0.26]
  stars.forEach((st, i) => {
    const on = lit(T, PLUCKS[i])
    const hang = drops[i]
    outline(p, ink, weight * 0.4)
    p.line(X(st.x), X(st.y), X(st.x), X(st.y + hang))
    const size = 0.055 + 0.008 * st.depth
    if (on > 0) glow(p, c, st.x, st.y + hang, 0.28, 0.45 * Math.min(1.3, on), PAINT.gold)
    solid(p, ink, weight * 0.5, on > 0 ? PAINT.cream : PAINT.deep)
    star(p, k, st.x, st.y + hang, size)
  })
  // The moon, hung from the hub, lit last on the flourish.
  const lamp3 = lit(T, LAMPS[3])
  const moon: Pt = [HUB[0], HUB[1] + 0.3]
  outline(p, ink, weight * 0.4)
  p.line(X(HUB[0]), X(HUB[1] + 0.06), X(moon[0]), X(moon[1] - 0.07))
  if (lamp3 > 0) glow(p, c, moon[0], moon[1], 0.4, 0.45 * lamp3, PAINT.cream)
  solid(p, ink, weight * 0.55, lamp3 > 0 ? PAINT.cream : PAINT.deep)
  p.arc(X(moon[0]), X(moon[1]), X(0.16), X(0.16), Math.PI * 0.6, Math.PI * 1.6, p.CHORD)
  p.pop()
}

/** The crib's near rail, in front of the child: spindles, and the rail on top. */
function cribNear(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  p.push()
  p.translate(X(cribShake(T)), 0)
  outline(p, ink, weight * 0.6)
  for (let i = 0; i <= 8; i++) {
    const x = CRIB.x0 + 0.06 + ((CRIB.x1 - CRIB.x0 - 0.12) * i) / 8
    p.line(X(x), X(CRIB.rail), X(x), X(CRIB.mattress + 0.12))
  }
  solid(p, ink, weight * 0.8, PAINT.timber)
  p.rect(X((CRIB.x0 + CRIB.x1) / 2), X(CRIB.rail), X(CRIB.x1 - CRIB.x0), X(0.06), X(0.01))
  p.rect(X((CRIB.x0 + CRIB.x1) / 2), X(CRIB.mattress + 0.13), X(CRIB.x1 - CRIB.x0), X(0.05), X(0.01))
  p.pop()
}

/* ------------------------------------------------------------------ the street */

function drawStreet(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // The streetlamp: a post, an arm, the lantern; lit as they come out.
  const on = lit(T, LAMP_POST)
  solid(p, ink, weight * 0.9, PAINT.deep)
  p.rect(X(POST[0]), X((POST[1] + FLOOR) / 2), X(0.08), X(FLOOR - POST[1]))
  outline(p, ink, weight * 0.8)
  p.line(X(POST[0]), X(POST[1]), X(POST[0] - 0.3), X(POST[1] - 0.05))
  solid(p, ink, weight * 0.7, on > 0 ? PAINT.beam : PAINT.deep)
  p.quad(X(POST[0] - 0.4), X(POST[1] - 0.05), X(POST[0] - 0.2), X(POST[1] - 0.05), X(POST[0] - 0.17), X(POST[1] + 0.12), X(POST[0] - 0.43), X(POST[1] + 0.12))
  if (on > 0) {
    glow(p, c, POST[0] - 0.3, POST[1] + 0.06, 1.3, 0.45 * on, PAINT.beam)
    beam(p, c, [POST[0] - 0.3, POST[1] + 0.12], [POST[0] - 0.3, FLOOR], 2.2, 0.1 * Math.min(1, on))
  }
}
