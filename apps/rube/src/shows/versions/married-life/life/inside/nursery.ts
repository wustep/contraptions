import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, box, part, type Companion, type Ctx, type Pose } from '../kit'
import { AT, bar, beat, BEATS, CUT, onsets } from '../music'
import { G_EARTH } from '../physics'
import { CARL, HILL, HOME, INK } from '../worlds'
import { INSIDE } from './inside'
import { clamp01, hermite, hopAt, inout, laneOf, pchip, settle, spring } from './home-motion'

/**
 * NURSERY (63.251 to 73.456): the nursery upstairs, waltz bars 46 to 52 and the slowing that ends the first waltz.
 *
 * From the baby in the clouds to the mobile over the crib: they are at rest side by side at the crib, looking up,
 * and the mobile is turning on its music box, which plays the waltz (a brass cylinder, cut away in the box's front,
 * its pins plucking a steel comb on the beats; the butterfly key on top turning back as the spring unwinds).
 *
 * Then they paint the nursery, and the machine is theirs: she rolls to a painter's cradle lying on the floor under
 * the bare wall and hops onto it (bar 46); he hops up onto the treadle of a ratchet winch at the far side of the crib
 * (bar 46's third beat) and, on each downbeat of bars 47 to 50, stamps it down: the pawl clicks a tooth, the rope
 * hauls the cradle up the wall a band on its hemp, and the long roller behind her lays the mural a band at a time:
 * the green hills, low clouds, birds, the deep sky. On bar 51 he hops off and his foot trips the pawl; the brake lets
 * her down, and the plank touches the floor on bar 52. They come back to the crib from either side and look up.
 *
 * The waltz slows and stops (71.0 to 73.456), and so does the music box, with it: the plucks come further apart, the
 * key turns slower, the mobile turns once more and stops on the last note. The cut (`CUTS.doctor`): at rest, a little
 * apart (she is 0.62 to his right), the mobile between them. After the doctor the room is left as it was: the rig
 * taken down, the mural on the wall, the mobile still, the curtains drawn, dimmer.
 *
 * Frame: Carl enters at (-0.5, 0) on the nursery's floor (`NURSERY_AT`); a point (x, y) here is (x + 7.5, y - 3.85)
 * in the house's inside (`inside.ts`). The window on the far wall is x -3.1 to 0.1 here.
 */

/** Where this part's entry cell is, in the house's inside: Carl at the crib upstairs, at (7, INSIDE.up); the score adds INSIDE_AT. */
export const NURSERY_AT: Pt = [7.5, INSIDE.up]

/* ------------------------------------------------------------------ the room, in this frame */

const OX = NURSERY_AT[0]
const OY = NURSERY_AT[1]
/** The floor's surface and the ceiling's underside. */
const FLOOR = INSIDE.groundUp - OY
const CEIL = INSIDE.ceilUp - OY
/** The nursery, wall to wall. */
const ROOM: [number, number] = [INSIDE.nursery[0] - OX, INSIDE.nursery[1] - OX]
/** Its window on the far wall: x0, x1, y0, y1. */
const WIN = ((w) => [w[0] - OX, w[1] - OX, w[2] - OY, w[3] - OY])(INSIDE.windows[2])

/** The crib, and the music box over it (the mobile hangs from the box): the middle of both is `HUB`. */
const HUB = -0.49
const CRIB = { x0: HUB - 0.85, x1: HUB + 0.85, rail: -0.87, bottom: -0.15, mattress: -0.4 }
const BOX = { x0: HUB - 0.25, x1: HUB + 0.25, y0: -2.13, y1: -1.87 }
/** The mobile's cross-arms: their height and reach; each figure hangs from an arm's end on its own thread. */
const ARMS_Y = -1.76
const REACH = 0.46

/** The winch: the ratchet wheel's axle, its treadle lever (pivoting on the axle), the pedal plate at its end. */
const AXLE: Pt = [-3.5, -0.45]
const LEVER = 0.72
const TH_UP = Math.atan2(0.4, 0.6)
const TH_DOWN = Math.asin((FLOOR - 0.05 - AXLE[1]) / LEVER)
const PLATE = 0.04
const WHEEL = 0.2
/** Where the rope leaves the drum, and the three pulleys at the ceiling (the winch's, and one over each end of the plank). */
const ROPE_X = AXLE[0] - 0.09
const PULLEY_Y = CEIL + 0.13
const PLANK = { x0: 0.55, x1: 3.15, h: 0.07 }
const HANG: [number, number] = [0.6, 3.1]

/** The mural: its left and right, its bottom (the roller's line with the plank on the floor), its bands. */
const MURAL = { x0: 0.7, x1: 3.0, y0: FLOOR - PLANK.h - 0.35 }
const BAND = 0.55
const BANDS = 4
/** The roller stands this far above the plank's top. */
const ROLLER_UP = 0.35

/* ------------------------------------------------------------------ the clock (show seconds) */

const B = CUT.nursery
const E = CUT.doctor
/** Bar 46: she lands on the cradle. Its third beat: he lands on the treadle. */
const LAND_E = bar('waltz', 46)
const ON_PEDAL = beat('waltz', 46, 3)
/** Bars 47 to 50: the four stamps, the four bands. */
const STAMPS = [47, 48, 49, 50].map((n) => bar('waltz', n))
/** Bar 51: he hops off and trips the pawl. Bar 52: the plank touches the floor. */
const OFF = bar('waltz', 51)
const DOWN = bar('waltz', 52)
/** The last beat of the waltz; from here the music box runs down with the music, plucking on the ritard's notes. */
const RIT = AT.halt
const RUNDOWN = onsets(RIT + 0.2, E + 0.01, 0.3)

/** Every pluck of the comb: the waltz's beats while it plays, then the ritard's notes, the last on the cut. */
const PLUCKS = [...BEATS.filter((b) => b.stretch === 'waltz' && b.pos !== undefined && b.t > B - 3 && b.t <= RIT + 0.01).map((b) => b.t), ...RUNDOWN]

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const NURSERY_HITS: number[] = [LAND_E, ON_PEDAL, ...STAMPS, OFF, DOWN, ...PLUCKS.filter((t) => t >= B)].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the music box and the mobile */

/** The cylinder's speed while the waltz plays (radians a second), and how it runs down. */
const W0 = 1.2
const DECAY = 1.2
/** The cylinder's angle: steady, then running down from the halt to nothing on the cut. */
function phi(T: number): number {
  const t = Math.min(T, E)
  if (t <= RIT) return W0 * (t - B)
  const L = E - RIT
  const u = (t - RIT) / L
  return W0 * (RIT - B) + (W0 * L * (1 - Math.pow(1 - u, DECAY + 1))) / (DECAY + 1)
}
/** The mobile turns with it, geared up a little. */
const mobileAt = (T: number): number => 1.35 * phi(T) + 0.55
/** Each pin is where the cylinder stood when it plucked. */
const PINS = PLUCKS.map((t, i) => ({ t, at: phi(t), tooth: (i * 3) % 7 }))

/* ------------------------------------------------------------------ the cradle and the treadle */

/** When the rope has hauled a notch: the stamp takes up the slack a little before its downbeat. */
const HAUL = 0.06
const SPRING = { period: 0.46, zeta: 0.72 }
const firstPeak = SPRING.period / 2 / Math.sqrt(1 - SPRING.zeta * SPRING.zeta)
/** The brake lets her down from the trip to the touch. */
const LET = OFF - 0.3

/** How far the cradle has been hauled up (cells). */
function lift(T: number): number {
  let y = 0
  for (const s of STAMPS) y += BAND * spring(T - (s - HAUL), SPRING.period, SPRING.zeta)
  if (T <= LET) return y
  const u = clamp01((T - LET) / (DOWN - LET))
  // Let down on the brake: easing out of the hold, and meeting the floor with a little way still on.
  const d = 0.88 * inout(u) + 0.12 * u
  const bump = T > DOWN ? 0.012 * Math.exp(-(T - DOWN) / 0.18) * Math.sin(((T - DOWN) / 0.3) * Math.PI) : 0
  return y * (1 - d) - bump
}
/** The plank's top. */
const plankTop = (T: number): number => FLOOR - PLANK.h - lift(T)
/** How much of the mural is painted (cells up from its bottom): what the roller has passed, never less. */
function painted(T: number): number {
  let y = 0
  for (const s of STAMPS) {
    const a = T - (s - HAUL)
    y += BAND * (a >= firstPeak ? 1 : Math.min(1, spring(a, SPRING.period, SPRING.zeta)))
  }
  return y
}

/** How far down the treadle is: 0 up, 1 at the bottom. A give when he lands on it; each stamp down on its downbeat, and the spring back. */
function press(T: number): number {
  let p = 0
  const g = T - ON_PEDAL
  if (g >= 0) p = Math.max(p, 0.28 * (g < 0.07 ? settle(g / 0.07, 2) : 1 - inout((g - 0.07) / 0.32)))
  for (const s of STAMPS) {
    const a = T - (s - 0.11)
    if (a < 0) continue
    p = Math.max(p, a < 0.11 ? (a / 0.11) ** 2 : 1 - inout((a - 0.11) / 0.55))
  }
  return p
}
const leverAngle = (T: number): number => TH_UP + (TH_DOWN - TH_UP) * press(T)
function pedalEnd(T: number): Pt {
  const th = leverAngle(T)
  return [AXLE[0] + LEVER * Math.cos(th), AXLE[1] + LEVER * Math.sin(th)]
}
/** Carl standing on the pedal plate. */
function onPedal(T: number): Pt {
  const [x, y] = pedalEnd(T)
  return [x, y - PLATE - 0.13]
}
/** The ratchet wheel turns as the rope winds (and back as the brake lets it out). */
const wheelAt = (T: number): number => lift(T) * 1.15
/** The pawl: lifted by each tooth as it passes, and lifted clear once his foot trips it. */
function pawlAt(T: number): number {
  let a = 0
  for (const s of STAMPS) {
    const u = (T - (s - 0.11)) / 0.16
    if (u > 0 && u < 1) a = Math.max(a, 0.18 * Math.sin(u * Math.PI))
  }
  return a + 0.42 * inout((T - (OFF - 0.3)) / 0.18)
}

/* ------------------------------------------------------------------ the two of them */

const G = G_EARTH
/** Carl: sets off from the crib, hops up onto the treadle, rides it through four stamps, hops off, and comes back. */
const C0: Pt = [-0.5, 0]
const C_GO = B + 0.04
const C_HOP = 0.38
const C_TAKE = ON_PEDAL - C_HOP
const C_TAKE_X = -2.45
const C_ON: Pt = onPedal(ON_PEDAL - 1e-6)
const C_VX = (C_ON[0] - C_TAKE_X) / C_HOP
const C_OFF_HOP = 0.306
const C_OFF_T = OFF - C_OFF_HOP
const C_FLOOR = -2.45
const C_SKID = 0.07
const C_END = -0.8
const carlHome = pchip([69.8, 71.2, 72.35], [C_FLOOR + C_SKID, -1.32, C_END])

function carl(T: number): Pt {
  if (T <= C_GO) return C0
  if (T < C_TAKE) return [hermite(C0[0], 0, C_TAKE_X, C_VX, C_TAKE - C_GO, (T - C_GO) / (C_TAKE - C_GO)), 0]
  if (T < ON_PEDAL) return hopAt([C_TAKE_X, 0], C_ON, C_HOP, G, (T - C_TAKE) / C_HOP)
  if (T < C_OFF_T) return onPedal(T)
  if (T < OFF) return hopAt(onPedal(C_OFF_T), [C_FLOOR, 0], C_OFF_HOP, G, (T - C_OFF_T) / C_OFF_HOP)
  if (T < 69.8) return [C_FLOOR + C_SKID * settle((T - OFF) / 0.3), 0]
  return [carlHome(T), 0]
}

/** How he holds himself: a stretch before each stamp and a squash on it, a squash on each landing, and at the end a lean up at the mobile that settles as it stops. */
function carlPose(T: number): { tilt: number; squash: number } {
  let squash = 0
  for (const s of STAMPS) {
    const pre = T - (s - 0.24)
    if (pre > 0 && T < s) squash -= 0.05 * Math.sin((pre / 0.24) * Math.PI * 0.5)
    if (T >= s) squash += 0.17 * Math.exp(-(T - s) / 0.14)
  }
  if (T >= ON_PEDAL) squash += 0.12 * Math.exp(-(T - ON_PEDAL) / 0.12)
  if (T >= OFF) squash += 0.11 * Math.exp(-(T - OFF) / 0.13)
  const look = 0.07 * inout((T - 71.6) / 0.9) * (1 - inout((T - 72.75) / 0.6))
  // Upright in the air: the stage's slope-lean would tip him on the hops.
  return { tilt: look, squash: Math.max(-0.06, squash) }
}

/** Ellie: rolls to the cradle and hops on (bar 46), rides it up rolling along the plank as it paints, rides it down, and comes back to the crib. */
const E0: Pt = [-0.14, 0]
const E_GO = B + 0.15
const E_HOP = 0.25
const E_TAKE = LAND_E - E_HOP
const E_TAKE_X = 0.4
const E_LAND_X = 0.85
const E_VX = (E_LAND_X - E_TAKE_X) / E_HOP
const E_RIDE = pchip([LAND_E, 64.62, 67.9], [E_LAND_X, 1.12, 1.7], E_VX, 0)
const E_LEAVE = 70.55
const E_END = C_END + 0.62
const E_HOME = pchip([E_LEAVE, 71.35, 72.45], [1.7, 0.62, E_END])

function ellie(T: number): Pt {
  if (T <= E_GO) return E0
  if (T < E_TAKE) return [hermite(E0[0], 0, E_TAKE_X, E_VX, E_TAKE - E_GO, (T - E_GO) / (E_TAKE - E_GO)), 0]
  if (T < LAND_E) return hopAt([E_TAKE_X, 0], [E_LAND_X, plankTop(LAND_E) - 0.13], E_HOP, G, (T - E_TAKE) / E_HOP)
  if (T < E_LEAVE) return [E_RIDE(T), plankTop(T) - 0.13]
  const x = E_HOME(T)
  // Off the plank's end: down its thickness onto the floor.
  const on = clamp01((x - (PLANK.x0 - 0.1)) / 0.2)
  return [x, (plankTop(T) - 0.13) * (on * on * (3 - 2 * on))]
}

/* ------------------------------------------------------------------ drawing */

const px = (p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0) => p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, r * k)

/** The mural's sky, band by band from the bottom, and what is in each band. */
const SKY = [mixHex(HOME.nursery, HOME.glass, 0.55), HOME.glass, mixHex(HOME.glass, HOME.sky, 0.6), mixHex(HOME.sky, CARL, 0.22)]
/** The roller's cover takes the tint of the band it is laying. */
const ROLLER_TINT = [HOME.grass, HOME.glass, mixHex(HOME.glass, HOME.sky, 0.6), mixHex(HOME.sky, CARL, 0.22)]

/** A cloud: soft, flat-bottomed, uninked lobes. */
function cloud(p: p5, k: number, x: number, y: number, w: number, h: number, color: p5.Color): void {
  p.noStroke()
  p.fill(color)
  p.beginShape()
  p.vertex((x - w / 2) * k, y * k)
  p.bezierVertex((x - w / 2) * k, (y - h * 0.55) * k, (x - w * 0.22) * k, (y - h * 0.7) * k, (x - w * 0.12) * k, (y - h * 0.62) * k)
  p.bezierVertex((x - w * 0.05) * k, (y - h * 1.1) * k, (x + w * 0.25) * k, (y - h * 1.05) * k, (x + w * 0.28) * k, (y - h * 0.6) * k)
  p.bezierVertex((x + w * 0.4) * k, (y - h * 0.72) * k, (x + w / 2) * k, (y - h * 0.4) * k, (x + w / 2) * k, y * k)
  p.endShape(p.CLOSE)
}

/**
 * A bird in flight, side on, facing `face` (1 right, -1 left), `f` its width as seen (1 full side, near 0 edge on):
 * a body, a raised wing, a forked tail, a beak. `ink` outlines it (the mobile's cut-outs), or not (the mural's).
 */
function bird(p: p5, k: number, x: number, y: number, s: number, face: number, f: number, fill: p5.Color, ink: p5.Color | null, w: number, flap = 0): void {
  p.push()
  p.translate(x * k, y * k)
  p.scale(face * Math.max(0.12, f), 1)
  if (ink) {
    p.stroke(ink)
    p.strokeWeight(w / Math.max(0.12, f) ** 0.5)
  } else p.noStroke()
  p.fill(fill)
  const K = s * k
  // The body: a long teardrop from the forked tail to the head.
  p.beginShape()
  p.vertex(-0.62 * K, -0.02 * K)
  p.vertex(-0.46 * K, -0.08 * K)
  p.bezierVertex(-0.2 * K, -0.2 * K, 0.22 * K, -0.2 * K, 0.36 * K, -0.1 * K)
  p.vertex(0.5 * K, -0.05 * K)
  p.vertex(0.36 * K, 0.0 * K)
  p.bezierVertex(0.2 * K, 0.12 * K, -0.2 * K, 0.1 * K, -0.46 * K, 0.02 * K)
  p.vertex(-0.62 * K, 0.08 * K)
  p.vertex(-0.5 * K, 0.0 * K)
  p.endShape(p.CLOSE)
  // The wing, raised from the back, beating a little.
  const lift = 0.42 + 0.12 * flap
  p.beginShape()
  p.vertex(-0.14 * K, -0.12 * K)
  p.bezierVertex(-0.2 * K, -(lift + 0.05) * K, -0.02 * K, -(lift + 0.12) * K, 0.08 * K, -(lift + 0.1) * K)
  p.bezierVertex(0.02 * K, -0.3 * K, 0.12 * K, -0.2 * K, 0.18 * K, -0.14 * K)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The paper aeroplane, side on: a folded dart, its keel a shade darker. */
function plane(p: p5, k: number, x: number, y: number, s: number, face: number, f: number, light: number, w: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.scale(face * Math.max(0.12, f), 1)
  const K = s * k
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(w / Math.max(0.12, f) ** 0.5)
  p.fill(alpha(p, mixHex(HOME.paper, INK, 0.12), light))
  p.triangle(0.55 * K, 0, -0.45 * K, 0.02 * K, -0.4 * K, 0.18 * K)
  p.fill(alpha(p, HOME.trim, light))
  p.triangle(0.55 * K, 0, -0.5 * K, -0.2 * K, -0.45 * K, 0.02 * K)
  p.pop()
}

/** The mural as painted so far: revealed from its bottom up to where the roller has been. */
function mural(p: p5, c: Ctx, T: number, light: number): void {
  const h = painted(T)
  if (h <= 0.002) return
  const { k } = c
  const { x0, x1, y0 } = MURAL
  const top = y0 - Math.min(BAND * BANDS, h)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, top * k, (x1 - x0) * k, (y0 - top) * k)
  ctx.clip()
  p.noStroke()
  for (let b = 0; b < BANDS; b++) {
    p.fill(alpha(p, SKY[b], light))
    px(p, k, x0, y0 - (b + 1) * BAND - 0.002, x1, y0 - b * BAND)
  }
  const bandTop = (b: number) => y0 - (b + 1) * BAND
  // Band 1: the green hills (their picnic hill in front).
  p.fill(alpha(p, mixHex(HOME.leaf, HOME.grass, 0.35), light))
  p.beginShape()
  p.vertex(x0 * k, y0 * k)
  p.vertex(x0 * k, (y0 - 0.24) * k)
  p.bezierVertex((x0 + 0.7) * k, (bandTop(0) + 0.14) * k, (x0 + 1.3) * k, (bandTop(0) + 0.08) * k, (x0 + 1.75) * k, (y0 - 0.34) * k)
  p.bezierVertex((x0 + 2.0) * k, (y0 - 0.4) * k, (x1 - 0.2) * k, (y0 - 0.36) * k, x1 * k, (y0 - 0.3) * k)
  p.vertex(x1 * k, y0 * k)
  p.endShape(p.CLOSE)
  p.fill(alpha(p, HOME.grass, light))
  p.beginShape()
  p.vertex(x0 * k, y0 * k)
  p.vertex(x0 * k, (y0 - 0.14) * k)
  p.bezierVertex((x0 + 0.5) * k, (y0 - 0.26) * k, (x0 + 0.95) * k, (y0 - 0.44) * k, (x0 + 1.45) * k, (y0 - 0.42) * k)
  p.bezierVertex((x0 + 1.9) * k, (y0 - 0.4) * k, (x0 + 2.1) * k, (y0 - 0.16) * k, x1 * k, (y0 - 0.1) * k)
  p.vertex(x1 * k, y0 * k)
  p.endShape(p.CLOSE)
  // Band 2: low clouds on the pale sky.
  const cl = alpha(p, HILL.cloud, light)
  cloud(p, k, x0 + 0.62, bandTop(1) + 0.36, 0.62, 0.2, cl)
  cloud(p, k, x0 + 1.75, bandTop(1) + 0.28, 0.5, 0.16, cl)
  // Band 3: birds.
  bird(p, k, x0 + 0.45, bandTop(2) + 0.3, 0.2, 1, 1, alpha(p, HOME.pink, light), null, 0, 0.4)
  bird(p, k, x0 + 1.12, bandTop(2) + 0.19, 0.16, 1, 1, alpha(p, HOME.yellow, light), null, 0, -0.3)
  bird(p, k, x0 + 1.85, bandTop(2) + 0.34, 0.18, 1, 1, alpha(p, HOME.pink, light), null, 0, 0.1)
  // Band 4: the deep sky, a long thin cloud and one more bird, high.
  cloud(p, k, x0 + 1.2, bandTop(3) + 0.33, 1.1, 0.1, alpha(p, HILL.cloud, 0.85 * light))
  bird(p, k, x0 + 1.95, bandTop(3) + 0.2, 0.2, 1, 1, alpha(p, HOME.yellow, light), null, 0, 0.6)
  ctx.restore()
}

/** The curtains: tied back while the room is being made; drawn shut after the doctor. */
function curtains(p: p5, c: Ctx, T: number, light: number): void {
  const { k, weight } = c
  const [x0, x1, y0, y1] = WIN
  const cloth = alpha(p, mixHex(HOME.pink, HOME.trim, 0.45), light)
  const fold = alpha(p, INK, 0.07 * light)
  const top = y0 - 0.12
  const hem = y1 + 0.18
  // The rod.
  p.stroke(alpha(p, INK, 0.8 * light))
  p.strokeWeight(weight * 0.7)
  p.fill(alpha(p, HOME.woodDark, light))
  px(p, k, x0 - 0.3, top - 0.04, x1 + 0.3, top + 0.01, 0.02)
  const panel = (a: number, b: number, tie: number | null) => {
    p.stroke(alpha(p, INK, 0.55 * light))
    p.strokeWeight(weight * 0.6)
    p.fill(cloth)
    p.beginShape()
    if (tie === null) {
      p.vertex(a * k, top * k)
      p.vertex(b * k, top * k)
      p.bezierVertex((b + 0.02) * k, (top + 0.8) * k, (b - 0.02) * k, (hem - 0.6) * k, b * k, hem * k)
      p.bezierVertex(((a + b) / 2) * k, (hem + 0.04) * k, ((a + b) / 2) * k, (hem - 0.03) * k, a * k, hem * k)
    } else {
      // Gathered at the tie: narrow there, spreading to the hem.
      const m = (a + b) / 2
      p.vertex(a * k, top * k)
      p.vertex(b * k, top * k)
      p.bezierVertex(b * k, (tie - 0.3) * k, (m + 0.06) * k, (tie - 0.1) * k, (m + 0.06) * k, tie * k)
      p.bezierVertex((m + 0.06) * k, (tie + 0.15) * k, (b + 0.03) * k, (hem - 0.3) * k, (b + 0.03) * k, hem * k)
      p.vertex((a - 0.03) * k, hem * k)
      p.bezierVertex((a - 0.03) * k, (hem - 0.3) * k, (m - 0.06) * k, (tie + 0.15) * k, (m - 0.06) * k, tie * k)
      p.bezierVertex((m - 0.06) * k, (tie - 0.1) * k, a * k, (tie - 0.3) * k, a * k, top * k)
    }
    p.endShape(p.CLOSE)
    // A few soft folds.
    p.stroke(fold)
    p.strokeWeight(weight * 0.9)
    const n = tie === null ? 5 : 2
    for (let i = 1; i <= n; i++) {
      const x = a + ((b - a) * i) / (n + 1)
      if (tie === null) p.line(x * k, (top + 0.06) * k, (x + 0.02) * k, (hem - 0.04) * k)
      else p.line(x * k, (top + 0.06) * k, ((a + b) / 2 + (x - (a + b) / 2) * 0.3) * k, (tie - 0.05) * k)
    }
  }
  if (T < E) {
    const tie = (y0 + y1) / 2 + 0.2
    panel(x0 - 0.28, x0 + 0.1, tie)
    panel(x1 - 0.1, x1 + 0.28, tie)
  } else {
    const mid = (x0 + x1) / 2
    panel(x0 - 0.28, mid + 0.02, null)
    panel(mid - 0.02, x1 + 0.28, null)
  }
}

/** The painter's rig: the ropes and pulleys, the plank with its roller, the winch, the treadle. Taken down after the doctor. */
function rig(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const ink = alpha(p, INK, 1)
  const hemp = mixHex(HOME.wood, HOME.paper, 0.35)
  const iron = mixHex(INK, CARL, 0.18)
  const pt = plankTop(T)
  const ry = pt - ROLLER_UP
  // Loaded with the next band's colour once the last one is laid.
  const done = STAMPS.reduce((n, s) => n + inout((T - s - 0.3) / 0.35), 0)
  const band = Math.min(BANDS - 1, Math.floor(done))
  const tint = mixHex(ROLLER_TINT[band], ROLLER_TINT[Math.min(BANDS - 1, band + 1)], done - Math.floor(done))

  // The ropes: up from the drum, along the ceiling, down to the plank's two ends (slack a hair once it is down).
  const slack = T > DOWN ? 0.03 * clamp01((T - DOWN) / 0.25) : 0
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight * 1.05)
  p.line(ROPE_X * k, (AXLE[1] - 0.02) * k, ROPE_X * k, PULLEY_Y * k)
  p.line(ROPE_X * k, (PULLEY_Y - 0.06) * k, HANG[1] * k, (PULLEY_Y - 0.06) * k)
  for (const hx of HANG) {
    p.beginShape()
    p.vertex(hx * k, PULLEY_Y * k)
    p.quadraticVertex((hx + slack) * k, ((PULLEY_Y + pt) / 2) * k, hx * k, pt * k)
    p.endShape()
  }
  p.stroke(hemp)
  p.strokeWeight(weight * 0.45)
  p.line(ROPE_X * k, (AXLE[1] - 0.02) * k, ROPE_X * k, PULLEY_Y * k)
  p.line(ROPE_X * k, (PULLEY_Y - 0.06) * k, HANG[1] * k, (PULLEY_Y - 0.06) * k)
  for (const hx of HANG) p.line(hx * k, PULLEY_Y * k, hx * k, pt * k)

  // The pulleys: a block hung from the ceiling, its sheave inside.
  for (const x of [ROPE_X + 0.05, HANG[0] - 0.05, HANG[1] - 0.05]) {
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.fill(mixHex(HOME.woodDark, INK, 0.2))
    px(p, k, x - 0.04, CEIL, x + 0.04, CEIL + 0.05)
    p.fill(mixHex(CARL, HOME.trim, 0.55))
    px(p, k, x - 0.075, PULLEY_Y - 0.1, x + 0.075, PULLEY_Y + 0.03, 0.03)
    p.fill(hemp)
    p.circle(x * k, (PULLEY_Y - 0.035) * k, 0.07 * k)
  }

  // The roller behind her, on its two arms from the plank's back edge; its cover the tint of the band it lays.
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(iron)
  for (const ax of [MURAL.x0 + 0.08, MURAL.x1 - 0.08]) px(p, k, ax - 0.02, ry, ax + 0.02, pt)
  p.fill(mixHex(HOME.trim, tint, 0.7))
  p.strokeWeight(weight * 0.85)
  px(p, k, MURAL.x0 - 0.02, ry - 0.065, MURAL.x1 + 0.02, ry + 0.065, 0.06)
  p.stroke(alpha(p, INK, 0.25))
  p.strokeWeight(weight * 0.5)
  for (let i = 1; i < 8; i++) {
    const x = MURAL.x0 + ((MURAL.x1 - MURAL.x0) * i) / 8
    p.line(x * k, (ry - 0.05) * k, (x + 0.04) * k, (ry + 0.05) * k)
  }

  // The plank.
  p.stroke(ink)
  p.strokeWeight(weight * 0.85)
  p.fill(HOME.wood)
  px(p, k, PLANK.x0, pt, PLANK.x1, pt + PLANK.h, 0.015)

  // The winch: its A-frame stand, the ratchet wheel and the drum on the axle, the pawl.
  const [ax, ay] = AXLE
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.woodDark)
  p.quad((ax - 0.3) * k, FLOOR * k, (ax - 0.22) * k, FLOOR * k, (ax + 0.02) * k, (ay - 0.02) * k, (ax - 0.04) * k, (ay - 0.08) * k)
  p.quad((ax + 0.3) * k, FLOOR * k, (ax + 0.22) * k, FLOOR * k, (ax - 0.02) * k, (ay - 0.02) * k, (ax + 0.04) * k, (ay - 0.08) * k)
  px(p, k, ax - 0.2, FLOOR - 0.2, ax + 0.2, FLOOR - 0.16)
  const turn = wheelAt(T)
  const teeth = 10
  p.fill(iron)
  p.beginShape()
  for (let i = 0; i < teeth; i++) {
    const a0 = turn + (i / teeth) * Math.PI * 2
    const a1 = turn + ((i + 0.78) / teeth) * Math.PI * 2
    p.vertex((ax + Math.cos(a0) * WHEEL * 0.8) * k, (ay + Math.sin(a0) * WHEEL * 0.8) * k)
    p.vertex((ax + Math.cos(a1) * WHEEL) * k, (ay + Math.sin(a1) * WHEEL) * k)
  }
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, HOME.trim, 0.5))
  p.strokeWeight(weight * 0.6)
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2
    p.line((ax + Math.cos(a) * 0.1) * k, (ay + Math.sin(a) * 0.1) * k, (ax + Math.cos(a) * WHEEL * 0.7) * k, (ay + Math.sin(a) * WHEEL * 0.7) * k)
  }
  // The drum in front, the rope wound on it.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.wood)
  p.circle(ax * k, ay * k, 0.13 * k)
  // The pawl, pivoting on the stand, its nose in the teeth: it lifts over each tooth, and clear when tripped.
  const pa = pawlAt(T)
  const pv: Pt = [ax - 0.2, ay - 0.3]
  const nose: Pt = [pv[0] + Math.cos(0.9 - pa) * 0.2, pv[1] + Math.sin(0.9 - pa) * 0.2]
  p.stroke(ink)
  p.strokeWeight(weight * 1.1)
  p.line(pv[0] * k, pv[1] * k, nose[0] * k, nose[1] * k)
  p.fill(iron)
  p.strokeWeight(weight * 0.6)
  p.circle(pv[0] * k, pv[1] * k, 0.045 * k)

  // The treadle: a lever on the axle, its pedal plate kept level.
  const [ex, ey] = pedalEnd(T)
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.woodDark)
  const th = leverAngle(T)
  const nx = -Math.sin(th) * 0.025
  const ny = Math.cos(th) * 0.025
  p.quad((ax - nx) * k, (ay - ny) * k, (ex - nx) * k, (ey - ny) * k, (ex + nx) * k, (ey + ny) * k, (ax + nx) * k, (ay + ny) * k)
  p.fill(iron)
  px(p, k, ex - 0.17, ey - PLATE, ex + 0.17, ey, 0.012)
  p.fill(ink)
  p.circle(ax * k, ay * k, 0.04 * k)
}

/** The crib: posts, rails and slats, the mattress seen between them, a folded blanket. */
function crib(p: p5, c: Ctx, light: number): void {
  const { k, weight } = c
  const { x0, x1, rail, bottom, mattress } = CRIB
  const paint = alpha(p, mixHex(HOME.trim, HOME.paper, 0.2), light)
  const ink = alpha(p, INK, light)
  // The mattress and a folded blanket, behind the slats.
  p.noStroke()
  p.fill(alpha(p, mixHex(HOME.trim, HOME.glass, 0.4), light))
  px(p, k, x0 + 0.06, mattress, x1 - 0.06, bottom)
  p.fill(alpha(p, mixHex(HOME.pink, HOME.trim, 0.25), light))
  px(p, k, x1 - 0.55, mattress - 0.06, x1 - 0.1, mattress + 0.05, 0.03)
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(paint)
  // The legs and the posts.
  for (const x of [x0, x1 - 0.08]) px(p, k, x, -1.0, x + 0.08, FLOOR, 0.015)
  // The rails.
  px(p, k, x0 + 0.08, rail - 0.07, x1 - 0.08, rail)
  px(p, k, x0 + 0.08, bottom - 0.07, x1 - 0.08, bottom)
  // The slats.
  p.strokeWeight(weight * 0.55)
  const n = 11
  for (let i = 1; i <= n; i++) {
    const x = x0 + 0.08 + ((x1 - x0 - 0.16) * i) / (n + 1)
    px(p, k, x - 0.016, rail, x + 0.016, bottom - 0.07)
  }
  // The posts' caps.
  p.strokeWeight(weight * 0.8)
  for (const x of [x0 + 0.04, x1 - 0.04]) px(p, k, x - 0.06, -1.06, x + 0.06, -1.0, 0.025)
}

/** The music box on the end of its arm over the crib, cut away in front; the key on top; the mobile under it. */
function mobile(p: p5, c: Ctx, T: number, light: number): void {
  const { k, weight } = c
  const ink = alpha(p, INK, light)
  const brass = alpha(p, HOME.brass, light)
  // The arm: up from the crib's far corner and over to the box.
  const post = CRIB.x0 + 0.14
  const arm = (w: number, col: p5.Color) => {
    p.noFill()
    p.stroke(col)
    p.strokeWeight(w)
    p.beginShape()
    p.vertex(post * k, (CRIB.rail - 0.03) * k)
    p.vertex(post * k, (BOX.y0 + 0.2) * k)
    p.bezierVertex(post * k, (BOX.y0 + 0.02) * k, (post + 0.12) * k, (BOX.y0 + 0.08) * k, BOX.x0 * k, (BOX.y0 + 0.1) * k)
    p.endShape()
  }
  arm(0.045 * k + weight * 1.4, ink)
  arm(0.045 * k, alpha(p, HOME.trim, light))

  // The figures: two birds, a paper aeroplane, a cloud, each on its thread from an arm's end, turning round the hub.
  const M = mobileAt(T)
  const speed = mobileAt(T + 0.02) - mobileAt(T - 0.02)
  const dir = speed >= 0 ? 1 : -1
  const threads = [0.3, 0.42, 0.26, 0.36]
  const figs = [0, 1, 2, 3].map((i) => {
    const a = M + (i * Math.PI) / 2
    return { i, a, x: HUB + REACH * Math.cos(a), z: REACH * Math.sin(a) }
  })
  const drawFig = (f: (typeof figs)[number]) => {
    const scale = 1 - 0.1 * (f.z / REACH)
    const top = ARMS_Y + threads[f.i]
    const bob = 0.012 * Math.sin(T * 1.7 + f.i * 1.9)
    // The thread.
    p.stroke(alpha(p, INK, 0.55 * light))
    p.strokeWeight(weight * 0.4)
    p.line(f.x * k, ARMS_Y * k, f.x * k, (top + bob) * k)
    const face = -Math.sin(f.a) * dir >= 0 ? 1 : -1
    const wide = Math.abs(Math.sin(f.a))
    const y = top + bob + 0.05
    const s = 0.28 * scale
    if (f.i === 0) bird(p, k, f.x, y, s, face, wide, alpha(p, HOME.yellow, light), ink, weight * 0.6, Math.sin(M * 3))
    else if (f.i === 1) plane(p, k, f.x, y, s * 0.9, face, wide, light, weight * 0.6)
    else if (f.i === 2) bird(p, k, f.x, y, s * 0.92, face, wide, alpha(p, HOME.pink, light), ink, weight * 0.6, Math.sin(M * 3 + 2))
    else {
      p.push()
      p.translate(f.x * k, 0)
      p.scale(Math.max(0.45, wide) * 0.9 + 0.1, 1)
      cloud(p, k, 0, y + 0.05, 0.3 * scale, 0.13 * scale, alpha(p, HILL.cloud, light))
      p.noFill()
      p.stroke(alpha(p, INK, 0.35 * light))
      p.strokeWeight(weight * 0.4)
      p.line(-0.15 * scale * k, (y + 0.05) * k, 0.15 * scale * k, (y + 0.05) * k)
      p.pop()
    }
  }
  const far = figs.filter((f) => f.z > 0).sort((a, b) => b.z - a.z)
  const near = figs.filter((f) => f.z <= 0).sort((a, b) => b.z - a.z)
  far.forEach(drawFig)
  // The cross-arms and the spindle.
  p.stroke(ink)
  p.strokeWeight(weight * 1.1)
  for (const j of [0, 1]) {
    const a = M + (j * Math.PI) / 2
    p.line((HUB - REACH * Math.cos(a)) * k, ARMS_Y * k, (HUB + REACH * Math.cos(a)) * k, ARMS_Y * k)
  }
  p.line(HUB * k, BOX.y1 * k, HUB * k, ARMS_Y * k)
  p.noStroke()
  p.fill(alpha(p, HOME.woodDark, light))
  p.circle(HUB * k, ARMS_Y * k, 0.05 * k)
  near.forEach(drawFig)

  // The box: pink, a cream lid and base, a window cut in its front on the works.
  const { x0, x1, y0, y1 } = BOX
  p.stroke(ink)
  p.strokeWeight(weight * 0.85)
  p.fill(alpha(p, HOME.pink, light))
  px(p, k, x0, y0, x1, y1, 0.04)
  p.fill(alpha(p, HOME.trim, light))
  px(p, k, x0 - 0.02, y0 - 0.02, x1 + 0.02, y0 + 0.035, 0.02)
  px(p, k, x0 - 0.01, y1 - 0.03, x1 + 0.01, y1 + 0.01, 0.015)
  const wx0 = x0 + 0.07
  const wx1 = x1 - 0.07
  const wy0 = y0 + 0.06
  const wy1 = y1 - 0.045
  p.fill(alpha(p, mixHex(INK, HOME.woodDark, 0.35), light))
  p.strokeWeight(weight * 0.6)
  px(p, k, wx0, wy0, wx1, wy1, 0.015)
  // The cylinder, its pins where the cylinder has turned them: plucking at the comb's line, then up over the top.
  const cx0 = wx0 + 0.025
  const cx1 = wx1 - 0.025
  const cy = wy0 + 0.042
  const r = 0.033
  p.noStroke()
  p.fill(brass)
  px(p, k, cx0, cy - r, cx1, cy + r, 0.012)
  p.fill(alpha(p, HOME.shine, 0.55 * light))
  px(p, k, cx0 + 0.01, cy - r * 0.75, cx1 - 0.01, cy - r * 0.45)
  const now = phi(T)
  const contact = Math.PI / 3
  const toothX = (j: number) => cx0 + 0.02 + ((cx1 - cx0 - 0.04) * j) / 6
  p.fill(alpha(p, HOME.shine, light))
  for (const pin of PINS) {
    const a = contact + (pin.at - now)
    if (a < -Math.PI / 2 || a > Math.PI / 2) continue
    p.circle(toothX(pin.tooth) * k, (cy + r * Math.sin(a)) * k, 0.011 * k * (0.6 + 0.4 * Math.cos(a)))
  }
  // The comb: a steel plate, its teeth up to the cylinder; the one just plucked still ringing.
  const steel = alpha(p, mixHex(CARL, HOME.trim, 0.4), light)
  const base = wy1 - 0.012
  p.fill(steel)
  px(p, k, cx0, base, cx1, wy1 - 0.002)
  for (let j = 0; j < 7; j++) {
    let dy = 0
    for (const pin of PINS) {
      if (pin.tooth !== j) continue
      const since = T - pin.t
      const ahead = pin.at - now
      if (ahead > 0 && ahead < 0.22) dy = Math.max(dy, 0.012 * (1 - ahead / 0.22))
      if (since >= 0 && since < 0.5) dy -= 0.008 * Math.exp(-since / 0.09) * Math.cos(since * 44)
    }
    const tipY = cy + r * Math.sin(contact) + 0.003 - dy
    p.fill(steel)
    px(p, k, toothX(j) - 0.006, tipY, toothX(j) + 0.006, base)
  }
  // The key on top, a butterfly turning back as the spring lets go.
  const turn = -0.45 * phi(T)
  const wide = 0.16 * Math.max(0.12, Math.abs(Math.cos(turn)))
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(brass)
  px(p, k, HUB - 0.016, y0 - 0.1, HUB + 0.016, y0 - 0.02)
  const ky = y0 - 0.16
  p.beginShape()
  p.vertex(HUB * k, (ky + 0.03) * k)
  p.bezierVertex((HUB - wide * 0.6) * k, (ky + 0.08) * k, (HUB - wide) * k, (ky + 0.02) * k, (HUB - wide) * k, (ky - 0.05) * k)
  p.bezierVertex((HUB - wide) * k, (ky - 0.11) * k, (HUB - wide * 0.3) * k, (ky - 0.08) * k, HUB * k, (ky - 0.03) * k)
  p.bezierVertex((HUB + wide * 0.3) * k, (ky - 0.08) * k, (HUB + wide) * k, (ky - 0.11) * k, (HUB + wide) * k, (ky - 0.05) * k)
  p.bezierVertex((HUB + wide) * k, (ky + 0.02) * k, (HUB + wide * 0.6) * k, (ky + 0.08) * k, HUB * k, (ky + 0.03) * k)
  p.endShape(p.CLOSE)
}

interface NurseryState {
  begin: number
}

export const nursery = part<NurseryState>(
  {
    name: 'nursery',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      const { k } = c
      p.push()
      p.rectMode(p.CORNER)
      mural(p, c, T, 1)
      curtains(p, c, T, 1)
      if (T < E) rig(p, c, T)
      crib(p, c, 1)
      mobile(p, c, T, 1)
      if (T >= E) {
        // Left as it was: dimmer. Over the whole room, under whatever comes through its roof later.
        p.noStroke()
        p.fill(alpha(p, mixHex(INK, HOME.night, 0.4), 0.2))
        px(p, k, ROOM[0], CEIL, ROOM[1], FLOOR)
      }
      p.pop()
    },
  },
  (slot) => {
    const knots = [C_GO, C_TAKE, ON_PEDAL, ...STAMPS, C_OFF_T, OFF, 69.8, 72.35]
    const segs = laneOf(carl, slot.begin, slot.end, knots, 90)
    const her = (T: number): Companion => {
      const [x, y] = ellie(T)
      return { x, y }
    }
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: (T) => carlPose(T) }]
    return {
      cells: box(ROOM[0] - 0.5, CEIL - 0.8, ROOM[1] + 0.5, FLOOR + 0.6),
      exit: [C_END + 0.5, 0] as Pt,
      lane: { segs, fire: STAMPS[0] - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: her }],
      pose,
    }
  },
  () => [
    // Out from the crib as the two of them go to their stations: the whole room, the winch, the crib and the wall.
    { t: 64.3, cells: 4.02, hold: [-0.5, -1.02], w: 1 },
    { t: 65.7, cells: 4.55, hold: [-0.55, -1.24], w: 1 },
    // Up a little with her as the mural climbs.
    { t: 67.8, cells: 4.6, hold: [-0.5, -1.32], w: 1 },
    { t: 69.4, cells: 4.58, hold: [-0.55, -1.28], w: 1 },
    // Back in to the crib as they come back to it, and on to the two-shot the doctor's office opens on.
    { t: 71.0, cells: 4.3, hold: [-0.42, -0.95], w: 1 },
    { t: 72.4, cells: 4.08, hold: [-0.47, -0.68], w: 1 },
    { t: E, cells: 4, hold: [C_END + 0.31, -0.6], w: 1 },
  ],
)
