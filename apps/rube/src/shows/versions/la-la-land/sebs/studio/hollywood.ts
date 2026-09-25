import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, laneAt, mixHex, type Lane, type Pt, type Seg } from '../../../../../parts'
import { beam, box, carried, glow, knock, part, rgba, ring, smooth, type Ctx, type Way } from '../kit'
import { dream, snap } from '../music'
import { G, hop } from '../physics'
import { STUDIO_MAT as M } from '../worlds'
import { BURST, EXIT, MIA_AT_BURST, SIGN, clothDrop, flood as studioFlood, monotone } from './studio'

/**
 * Hollywood (143.639 = dream(165), the burst, to 172): the show's biggest
 * machine, at the dream's 128 bpm at full strength.
 *
 * On the burst the painted cloth lands (the studio part drops it) and a trap
 * in the floor by the stage door throws him out into the colour; a beat later
 * it throws her. They leapfrog down a walk of fame, a star lighting under each
 * landing, while on the painted mountain the sign's nine blocks light one a
 * beat, and two searchlights come on behind the hill on the loudest hit of the
 * number. A kick-line of hinged legs in the ensemble's colours juggles him
 * along its toes on the band's pattern (1, 2, 3, and-4) while she rolls along
 * in front and stops to watch. At the foot of the hill a round yellow bush on
 * its spring throws them up onto the winding road; at every hairpin another
 * bush catches them on its shoulder and throws them back and up to the next
 * stretch, a lamp lighting on each stretch as he passes. On the crest the
 * flourish: six hits, and on each one more searchlight swings into a fan behind
 * them, the kick-line below kicking with every one; on the last the sign blazes
 * and they hop together. Then the lamps go out one by one, up the hill, into
 * the dark.
 *
 * Frame: its x is the studio's minus `EXIT[0]`. The ball comes in on the trap
 * at (-0.5, 0) and ends on the crest.
 */

const beat = (k: number) => dream(k)
const onset = (t: number) => snap(t, 0.02)?.t ?? t
/** The flourish: six hits, gathering. */
const FLOURISH = [166.15, 166.487, 166.847, 167.114, 167.462, 167.845].map(onset)
const BUTTON = FLOURISH[5]
/** The lamps going out, one by one, into the blackout. */
const OUT = [169.993, 170.539, 170.841, 171.085].map(onset)
/** Mia is ours until the dark is whole. */
const MIA_TO = 171.4

/* ------------------------------------------------------------------ the set */

/** The trap by the door. */
const TRAP: Pt = [-0.5, 0]
const TRAP_AT = [beat(165), beat(166)]
/** The walk of fame: where each of them lands, one beat apart, leapfrogging. */
const STARS: { x: number; at: number }[] = []
for (let i = 0; i < 4; i++) {
  STARS.push({ x: 1.0 + 1.4 * i, at: beat(167 + 2 * i) })
  STARS.push({ x: 1.7 + 1.4 * i, at: beat(168 + 2 * i) })
}
/** The sign lights a block a beat from the cloth's landing. */
const SIGN_AT = SIGN.map((_, i) => beat(166 + i))
/** The searchlights: two come on with the number's loudest hit and sweep; the flourish swings all six into a fan. */
const SWEEP_ON = beat(169)

/** The kick-line: eight hinged legs from a bar, kicking in unison on the band's pattern. */
const HIP = -1.72
const THIGH = 0.88
const SHIN = 0.86
const LEGS = 8
const legX = (i: number) => 6.95 + 0.62 * i
const toe = (i: number): Pt => [legX(i) + 0.15, -0.12]
const KICK_BEATS = [175, 176.5, 177, 178, 179, 180.5, 181, 182]
const KICKS = [...KICK_BEATS.map(beat), ...FLOURISH]
const LEG_COLORS = [M.costume[0], M.costume[5], M.costume[3], M.costume[4]]

/** The hill: the road's stretches (ball-centre heights), the crest. */
const Y1 = -1.8
const Y2 = -3.3
const Y3 = -4.8
const YC = -6.3
const RB = 0.4
/** The bushes: centres. B0 stands on the floor at the hill's foot; the others at the hairpins, each on the stretch below. */
const BUSH: Pt[] = [
  [12.15, -0.62],
  [17.35, Y1 + 0.76],
  [12.55, Y2 + 0.76],
  [17.2, Y3 + 0.76],
]
/** Where a ball meets a hairpin bush: on the shoulder facing the road it came along, so it goes back the other way. */
const shoulder = (c: Pt, side: -1 | 1): Pt => [c[0] + side * (RB + R) * Math.sin(0.7), c[1] - (RB + R) * Math.cos(0.7)]
const B0_TOP: Pt = [BUSH[0][0], BUSH[0][1] - RB - R]
const CONTACT: Pt[] = [B0_TOP, shoulder(BUSH[1], -1), shoulder(BUSH[2], 1), shoulder(BUSH[3], -1)]
/** Where each stretch is landed on, coming off a bush. */
const LAND: Pt[] = [[13.05, Y1], [16.35, Y2], [13.55, Y3]]
/** The crest: where each ends, touching. */
const CREST_SEB = 15.05
const CREST_MIA = 15.8
const MEET = 15.42
/** The road's stretches, drawn: left and right ends, surface height. */
const ROAD: [number, number, number][] = [
  [12.1, 16.95, Y1 + FLOOR],
  [12.95, 17.55, Y2 + FLOOR],
  [13.0, 17.1, Y3 + FLOOR],
]
/** The crest's plateau. */
const CREST: [number, number] = [14.05, 16.45]

/** The bushes' beats: him, then her two beats later. Landing on each stretch a beat and a half after. */
const SEB_BUSH = [183, 191, 199, 207]
const MIA_BUSH = SEB_BUSH.map((k) => k + 2)

/* ------------------------------------------------------------------ the paths */

type Build = { segs: Seg[]; last: Way }
const start = (at: number, p: Pt): Build => ({ segs: [], last: { at, p } })
function hopTo(b: Build, p: Pt, at: number): void {
  const w = hop(b.last, p, at)
  b.segs.push({ from: b.last.p, to: p, dur: at - b.last.at, arc: w.arc })
  b.last = { at, p }
}
function rollTo(b: Build, p: Pt, at: number, extra: Partial<Seg> = {}): void {
  b.segs.push({ from: b.last.p, to: p, dur: at - b.last.at, ...extra })
  b.last = { at, p }
}
/**
 * Along a stretch and off its end onto a bush: the roll keeps the pace it landed with and eases to the pace it goes
 * over the edge at, and the drop off the edge is a fall, so the contact comes exactly on the beat.
 */
function stretch(b: Build, vin: number, contact: Pt, at: number): void {
  const [xL, y] = b.last.p
  const h = contact[1] - y
  const Td = Math.sqrt((2 * h) / G)
  const te = at - Td
  const Tr = te - b.last.at
  const dir = Math.sign(contact[0] - xL)
  const v1 = (dir * (contact[0] - xL) - (Tr * Math.abs(vin)) / 2) / (Td + Tr / 2)
  const xe = contact[0] - dir * v1 * Td
  rollTo(b, [xe, y], te, { ramp: [Math.abs(vin), v1] })
  hopTo(b, contact, at)
}
const vOf = (b: Build, from: Pt, dur: number) => (b.last.p[0] - from[0]) / dur

function sebPath(): Build {
  const t = (k: number) => beat(k) - BURST
  const b = start(0, TRAP)
  for (let i = 0; i < 4; i++) hopTo(b, [STARS[2 * i].x, 0], t(167 + 2 * i))
  KICK_BEATS.forEach((k, i) => hopTo(b, toe(i), t(k)))
  hopTo(b, B0_TOP, t(SEB_BUSH[0]))
  for (let n = 0; n < 3; n++) {
    const from = b.last.p
    hopTo(b, LAND[n], t(SEB_BUSH[n] + 1.5))
    stretch(b, vOf(b, from, beat(SEB_BUSH[n] + 1.5) - beat(SEB_BUSH[n])), CONTACT[n + 1], t(SEB_BUSH[n + 1]))
  }
  hopTo(b, [CREST_SEB, YC], t(209))
  // On the crest through the flourish; on its fifth hit a small hop to her, landing together on the last.
  rollTo(b, [CREST_SEB, YC], FLOURISH[4] - BURST)
  hopTo(b, [MEET - R, YC], BUTTON - BURST)
  return b
}

function miaPath(): Build {
  const t = (k: number) => beat(k) - BURST
  // Stopped a step behind him when the colour comes; onto the trap as it resets, and out on the next beat.
  const b = start(0, [MIA_AT_BURST, 0])
  rollTo(b, TRAP, t(166), { ease: 'inout' })
  for (let i = 0; i < 4; i++) hopTo(b, [STARS[2 * i + 1].x, 0], t(168 + 2 * i))
  // Along the front of the kick-line: on at the pace she landed with, stopping to watch him go up the toes, then after him.
  const x0 = STARS[7].x
  const along = monotone([
    [beat(174), x0],
    [beat(174) + 0.3, x0 + 0.42],
    [beat(176.2), 7.35],
    [beat(178.4), 7.72],
    [beat(181.2), 9.55],
    [beat(183.4), 11.02],
    [beat(184), 11.45],
  ])
  b.segs.push(...carried((s) => [along(s + BURST), 0], t(174), t(184), 40))
  b.last = { at: t(184), p: [11.45, 0] }
  hopTo(b, B0_TOP, t(MIA_BUSH[0]))
  for (let n = 0; n < 3; n++) {
    const from = b.last.p
    hopTo(b, LAND[n], t(MIA_BUSH[n] + 1.5))
    stretch(b, vOf(b, from, beat(MIA_BUSH[n] + 1.5) - beat(MIA_BUSH[n])), CONTACT[n + 1], t(MIA_BUSH[n + 1]))
  }
  hopTo(b, [CREST_MIA, YC], t(211))
  rollTo(b, [CREST_MIA, YC], FLOURISH[4] - BURST)
  hopTo(b, [MEET + R, YC], BUTTON - BURST)
  rollTo(b, [MEET + R, YC], MIA_TO - BURST)
  return b
}

/* ------------------------------------------------------------------ strikes */

const SEB_LANDS = [183, 184.5, 191, 192.5, 199, 200.5, 207, 209].map(beat)
const MIA_LANDS = [185, 186.5, 193, 194.5, 201, 202.5, 209, 211].map(beat)
/** The lamps on the road light as he passes, one a stretch; the crest's when he lands on it. */
const LAMP_AT = [187, 195, 203].map(beat)
const CREST_LAMP_AT = beat(209)
export const HOLLYWOOD_HITS: number[] = [
  ...new Set([...TRAP_AT, ...SIGN_AT, ...STARS.map((s) => s.at), ...KICKS, ...SEB_LANDS, ...MIA_LANDS, ...LAMP_AT, CREST_LAMP_AT, ...FLOURISH, ...OUT].map((t) => Math.round(t * 1e4) / 1e4)),
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ drawing */

interface HollyState {
  begin: number
  /** Where each road lamp stands (x), found from where he is on its beat. */
  lamps: Pt[]
}

const X = (k: number, v: number) => v * k
/** The colour at this frame's x, at show time t: white until the flood reaches it. */
const paintAt = (x: number, t: number) => studioFlood(x + EXIT[0], t)
const paint = (x: number, t: number, color: string) => mixHex(M.flat, color, paintAt(x, t))

/** How lit a lamp is: off until `on` (a flash, settling), off again at `off`. */
function lampLevel(t: number, on: number, off: number): number {
  if (t < on || t >= off) return 0
  return 0.62 + 0.38 * knock(t - on, 0.3)
}

/** The sign's lights, on the landed cloth. */
function drawSign(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const dy = -clothDrop(t)
  const blaze = knock(t - BUTTON, 0.5)
  SIGN.forEach((b, i) => {
    const on = lampLevel(t, SIGN_AT[i], OUT[3])
    if (on <= 0) return
    const lift = on + 0.5 * blaze
    glow(p, k, b.x, b.y - b.h / 2 + dy, 0.95 + 0.4 * blaze, M.lamp, 0.42 * lift, 1, 1.15)
    p.push()
    p.translate(X(k, b.x), X(k, b.y + dy))
    p.rotate(b.tilt)
    p.noStroke()
    p.fill(mixHex(mixHex(M.sign, M.hill, 0.42), M.sign, Math.min(1, lift)))
    p.rect(X(k, -b.w / 2), X(k, -b.h), X(k, b.w), X(k, b.h))
    p.pop()
  })
}

/** The searchlights: where each beam points (radians from straight up) and how bright, at t. */
const FAN = [-0.66, -0.4, -0.14, 0.14, 0.4, 0.66]
/** Which hit of the flourish brings each beam to its place: the two sweeping first, then in from the outside. */
const LOCK = [0, 2, 4, 5, 3, 1]
const SL_X = [14.55, 14.95, 15.3, 15.6, 15.95, 16.3]
const SL_Y = YC + FLOOR + 0.28
function searchlight(i: number, t: number): { a: number; on: number } {
  const lockAt = FLOURISH[LOCK[i]]
  const sweeping = i === 0 || i === 5
  const off = t >= OUT[3] ? 0 : 1
  if (sweeping && t >= SWEEP_ON) {
    const side = i === 0 ? -1 : 1
    const s = t - SWEEP_ON
    // Up out of the hill, then a slow sway across the painted sky, the two crossing.
    const swing = side * (0.1 + 0.42 * (1 - Math.cos(s * 1.05 + (side > 0 ? 0.9 : 0))) * smooth(s, 0, 1.4))
    const a = t < lockAt ? swing : FAN[i] + (swing - FAN[i]) * Math.exp(-(t - lockAt) / 0.06)
    return { a, on: off * (0.75 + 0.25 * knock(s, 0.25)) * smooth(s, -0.02, 0.06) }
  }
  if (t < lockAt) return { a: FAN[i], on: 0 }
  return { a: FAN[i], on: off * (0.75 + 0.5 * knock(t - lockAt, 0.22)) }
}

function drawBeams(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const blaze = knock(t - BUTTON, 0.6)
  for (let i = 0; i < 6; i++) {
    const { a, on } = searchlight(i, t)
    if (on <= 0.01) continue
    const L = 17
    const x1 = SL_X[i] + Math.sin(a) * L
    const y1 = SL_Y - Math.cos(a) * L
    beam(p, k, SL_X[i], SL_Y, x1, y1, 0.16, 2.1, M.lamp, (0.2 + 0.08 * blaze) * on)
  }
}

/** The hill: a painted mound, the road winding up its face in stretches and hairpins. */
const HILL: Pt[] = (() => {
  const pts: Pt[] = []
  const left: Pt[] = [[11.45, FLOOR], [11.62, -0.9], [11.9, -2.1], [12.05, -3.2], [12.3, -4.4], [12.75, -5.3], [13.4, -5.95], [14.05, YC + FLOOR]]
  const right: Pt[] = [[16.45, YC + FLOOR], [17.1, -5.9], [17.65, -5.0], [17.95, -3.9], [18.25, -2.6], [18.6, -1.3], [19.15, -0.2], [19.5, FLOOR]]
  pts.push(...left, ...right)
  return pts
})()

function drawHill(p: p5, c: Ctx, t: number, s: HollyState): void {
  const { k, ink, weight } = c
  const hill = paint(15, t, M.hill)
  solid(p, ink, weight, hill)
  p.beginShape()
  p.curveVertex(X(k, HILL[0][0]), X(k, HILL[0][1]))
  for (const [x, y] of HILL) p.curveVertex(X(k, x), X(k, y))
  p.curveVertex(X(k, HILL[HILL.length - 1][0]), X(k, HILL[HILL.length - 1][1]))
  p.endShape(p.CLOSE)
  // The road: its hairpins first (up the face behind the bushes), then the stretches, blue, a pale line down each.
  const road = paint(15, t, M.road)
  const edge = mixHex(road, ink, 0.35)
  const W = 0.17
  p.noFill()
  p.strokeCap(p.SQUARE)
  const bend = (x: number, yLow: number, yHigh: number, side: 1 | -1) => {
    p.stroke(edge)
    p.strokeWeight(X(k, W) + 2 * weight * 0.6)
    const r = (yLow - yHigh) / 2
    p.arc(X(k, x), X(k, (yLow + yHigh) / 2 + W / 2), X(k, 2 * r * 0.7), X(k, 2 * r), side > 0 ? -Math.PI / 2 : Math.PI / 2, side > 0 ? Math.PI / 2 : (3 * Math.PI) / 2)
    p.stroke(road)
    p.strokeWeight(X(k, W))
    p.arc(X(k, x), X(k, (yLow + yHigh) / 2 + W / 2), X(k, 2 * r * 0.7), X(k, 2 * r), side > 0 ? -Math.PI / 2 : Math.PI / 2, side > 0 ? Math.PI / 2 : (3 * Math.PI) / 2)
  }
  bend(ROAD[0][1], ROAD[0][2], ROAD[1][2], 1)
  bend(ROAD[1][0], ROAD[1][2], ROAD[2][2], -1)
  bend(ROAD[2][1], ROAD[2][2], YC + FLOOR, 1)
  // From the floor up to the first stretch, round the hill's foot.
  bend(ROAD[0][0], FLOOR, ROAD[0][2], -1)
  p.strokeCap(p.ROUND)
  for (const [x0, x1, y] of ROAD) {
    solid(p, ink, weight * 0.7, road)
    p.rect(X(k, x0), X(k, y), X(k, x1 - x0), X(k, W))
    p.stroke(rgba(M.flat, 0.55))
    p.strokeWeight(Math.max(1, weight * 0.6))
    p.line(X(k, x0 + 0.15), X(k, y + W / 2), X(k, x1 - 0.15), X(k, y + W / 2))
  }
  // The crest's plateau, a shade lighter where they stand.
  p.noStroke()
  p.fill(mixHex(hill, M.flat, 0.18))
  p.rect(X(k, CREST[0] + 0.1), X(k, YC + FLOOR), X(k, CREST[1] - CREST[0] - 0.2), X(k, 0.12))
  // The lamps on the road and the crest: posts first; their light after the bushes.
  for (const [x, y] of s.lamps) drawLampPost(p, c, t, x, y)
}

const LAMP_H = 0.95
function drawLampPost(p: p5, c: Ctx, t: number, x: number, y: number): void {
  const { k, ink, weight } = c
  const post = paint(x, t, mixHex(M.purple, ink, 0.5))
  solid(p, ink, weight * 0.6, post)
  p.rect(X(k, x - 0.035), X(k, y - LAMP_H), X(k, 0.07), X(k, LAMP_H))
  p.rect(X(k, x - 0.09), X(k, y - 0.1), X(k, 0.18), X(k, 0.1))
}

function drawLampHead(p: p5, c: Ctx, t: number, x: number, y: number, on: number, off: number): void {
  const { k, ink, weight } = c
  const lit = lampLevel(t, on, off)
  const top = y - LAMP_H
  if (lit > 0) {
    glow(p, k, x, top - 0.12, 0.85, M.lamp, 0.55 * lit)
    glow(p, k, x, y + 0.05, 0.9, M.lamp, 0.3 * lit, 1.3, 0.32)
  }
  const head = lit > 0 ? M.lamp : mixHex(M.lamp, M.purple, 0.55)
  solid(p, ink, weight * 0.6, paint(x, t, head))
  p.beginShape()
  p.vertex(X(k, x - 0.13), X(k, top))
  p.vertex(X(k, x - 0.09), X(k, top - 0.26))
  p.vertex(X(k, x + 0.09), X(k, top - 0.26))
  p.vertex(X(k, x + 0.13), X(k, top))
  p.endShape(p.CLOSE)
  solid(p, ink, weight * 0.6, paint(x, t, mixHex(M.purple, ink, 0.5)))
  p.triangle(X(k, x - 0.12), X(k, top - 0.26), X(k, x + 0.12), X(k, top - 0.26), X(k, x), X(k, top - 0.36))
}

/** A bush's squash: each time a ball lands on it, pressed down hard and springing back, ringing out heavy. */
function bushSquash(i: number, t: number): number {
  let q = 0
  for (const at of [beat(SEB_BUSH[i]), beat(MIA_BUSH[i])]) {
    const s = t - at
    if (s < -0.05) continue
    // A hair before the beat the ball is already pressing in; on it, all the way; then the ring.
    q += s < 0 ? 0.5 * smooth(s, -0.05, 0) : ring(s, 2.3, 0.2)
  }
  return q
}

function drawBush(p: p5, c: Ctx, t: number, i: number): void {
  const { k, ink, weight } = c
  const [cx, cy] = BUSH[i]
  const q = bushSquash(i, t)
  const squash = 0.2 * q
  const w = RB * (1 + 0.6 * squash)
  const h = RB * (1 - squash)
  const by = cy + RB * squash
  // The spring: from the ground (or the stretch below) up to the bush's foot, compressing with it.
  const foot = i === 0 ? FLOOR : ROAD[i - 1][2]
  const top = by + h * 0.85
  const turns = 5
  outline(p, ink, weight * 0.8)
  p.stroke(paint(cx, t, mixHex(M.purple, ink, 0.55)))
  p.strokeWeight(Math.max(1, X(k, 0.035)))
  p.beginShape()
  for (let j = 0; j <= turns * 2; j++) {
    const y = foot + ((top - foot) * j) / (turns * 2)
    p.vertex(X(k, cx + (j % 2 === 0 ? -0.1 : 0.1)), X(k, y))
  }
  p.endShape()
  // The bush: a round clump, bumped at its edge, shaded under.
  const fill = paint(cx, t, M.bush)
  const shade = paint(cx, t, M.bushShade)
  solid(p, ink, weight, fill)
  p.beginShape()
  const n = 11
  for (let j = 0; j <= n * 4; j++) {
    const a = (j / (n * 4)) * Math.PI * 2
    const bump = 1 + 0.07 * Math.abs(Math.sin((a * n) / 2))
    p.vertex(X(k, cx + Math.cos(a) * w * bump), X(k, by + Math.sin(a) * h * bump))
  }
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(shade)
  p.beginShape()
  for (let j = 0; j <= 16; j++) {
    const a = (j / 16) * Math.PI
    p.vertex(X(k, cx + Math.cos(a) * w * 0.86), X(k, by + h * 0.18 + Math.sin(a) * h * 0.62))
  }
  p.endShape(p.CLOSE)
}

/** The trap: a plate in the floor, hinged at the door side, that flips up and throws whoever is standing on it. */
function drawTrap(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  let a = 0
  for (const at of TRAP_AT) {
    const s = t - at
    if (s < 0) continue
    a = Math.max(a, s < 0.06 ? 0.7 * (s / 0.06) : 0.7 * Math.exp(-(s - 0.06) / 0.09) * Math.cos((s - 0.06) * 9))
  }
  a = Math.max(0, a)
  const x1 = TRAP[0] + 0.32
  const L = 0.64
  // The pit under it, dark.
  p.noStroke()
  p.fill(mixHex(M.skyTop, ink, 0.7))
  p.rect(X(k, x1 - L), X(k, FLOOR), X(k, L), X(k, 0.1))
  p.push()
  p.translate(X(k, x1), X(k, FLOOR))
  p.rotate(a)
  solid(p, ink, weight * 0.7, paint(TRAP[0], t, M.purple))
  p.rect(X(k, -L), X(k, -0.02), X(k, L), X(k, 0.06))
  p.pop()
}

/** The walk of fame: a star under each landing, dim until it is landed on, then lit. */
function drawStars(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const fade = 1 - 0.75 * smooth(t, 168.4, 171)
  for (const s of STARS) {
    const f = paintAt(s.x, t)
    if (f <= 0) continue
    const since = t - s.at
    const lit = since < 0 ? 0 : (0.5 + 0.5 * knock(since, 0.28)) * fade
    if (lit > 0) glow(p, k, s.x, FLOOR + 0.02, 0.55 + 0.25 * knock(since, 0.2), M.star, 0.55 * lit, 1, 0.45)
    p.push()
    p.translate(X(k, s.x), X(k, FLOOR + 0.03))
    p.scale(1, 0.34)
    p.drawingContext.globalAlpha = f
    solid(p, rgba(ink, 0.8), weight * 0.5, mixHex(mixHex(M.star, M.skyTop, 0.55), M.star, Math.min(1, lit * 1.4)))
    p.beginShape()
    for (let j = 0; j < 10; j++) {
      const a = -Math.PI / 2 + (j * Math.PI) / 5
      const r = j % 2 === 0 ? 0.24 : 0.1
      p.vertex(X(k, Math.cos(a) * r), X(k, Math.sin(a) * r))
    }
    p.endShape(p.CLOSE)
    p.pop()
  }
}

/** A leg's pose after a kick at `s` seconds ago: the hip's swing and the knee's bend. A kick is up hard and down heavy. */
function kickPose(s: number, held: boolean): { hip: number; knee: number } {
  if (s < 0) return { hip: 0, knee: 0 }
  const up = 0.085
  const HIGH = 1.95
  if (s < up) {
    const u = s / up
    return { hip: HIGH * (1 - (1 - u) * (1 - u)), knee: 0.75 * (1 - u) }
  }
  if (held) return { hip: HIGH, knee: 0 }
  const d = s - up
  const fall = 0.2
  if (d < fall) {
    const u = d / fall
    const e = u * u * (3 - 2 * u)
    return { hip: HIGH * (1 - e), knee: 0.35 * Math.sin(Math.PI * u) }
  }
  return { hip: -0.08 * ring(d - fall, 2.2, 0.14), knee: 0 }
}

function legPose(t: number): { hip: number; knee: number } {
  let hip = 0
  let knee = 0
  for (const at of KICKS) {
    const s = t - at
    if (s < 0 || s > 1.2) continue
    // After the last hit of the flourish the line holds its kick up, then lets it down slowly as the lights go.
    const held = at === BUTTON
    let q = kickPose(s, held)
    if (held && t > BUTTON + 0.6) {
      const u = smooth(t, BUTTON + 0.6, BUTTON + 2.2)
      q = { hip: q.hip * (1 - u), knee: 0.3 * Math.sin(Math.PI * u) }
    }
    if (q.hip > hip) {
      hip = q.hip
      knee = q.knee
    }
  }
  if (t > BUTTON + 0.6 && t < BUTTON + 2.4) {
    const u = smooth(t, BUTTON + 0.6, BUTTON + 2.2)
    hip = Math.max(hip, 1.95 * (1 - u))
  }
  return { hip, knee }
}

function drawKickLine(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x0 = legX(0) - 0.4
  const x1 = legX(LEGS - 1) + 0.4
  const pose = legPose(t)
  // The frame: two slim posts and the bar the legs hang from, gold, trimmed red.
  solid(p, ink, weight * 0.7, paint(x0, t, mixHex(M.purple, ink, 0.45)))
  p.rect(X(k, x0 - 0.06), X(k, HIP - 0.1), X(k, 0.08), X(k, FLOOR - HIP + 0.1))
  p.rect(X(k, x1 - 0.02), X(k, HIP - 0.1), X(k, 0.08), X(k, FLOOR - HIP + 0.1))
  for (let i = 0; i < LEGS; i++) {
    const hx = legX(i)
    const color = paint(hx, t, LEG_COLORS[i % LEG_COLORS.length])
    const dark = mixHex(color, ink, 0.25)
    // Hip, knee, ankle.
    const a = pose.hip
    const kx = hx + Math.sin(a) * THIGH
    const ky = HIP + Math.cos(a) * THIGH
    const b = a - pose.knee
    const ax = kx + Math.sin(b) * SHIN
    const ay = ky + Math.cos(b) * SHIN
    const limb = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, fill: string) => {
      const dx = x1 - x0
      const dy = y1 - y0
      const L = Math.hypot(dx, dy) || 1
      const nx = -dy / L
      const ny = dx / L
      solid(p, ink, weight * 0.7, fill)
      p.beginShape()
      p.vertex(X(k, x0 + (nx * w0) / 2), X(k, y0 + (ny * w0) / 2))
      p.vertex(X(k, x1 + (nx * w1) / 2), X(k, y1 + (ny * w1) / 2))
      p.vertex(X(k, x1 - (nx * w1) / 2), X(k, y1 - (ny * w1) / 2))
      p.vertex(X(k, x0 - (nx * w0) / 2), X(k, y0 - (ny * w0) / 2))
      p.endShape(p.CLOSE)
    }
    limb(kx, ky, ax, ay, 0.12, 0.075, color)
    limb(hx, HIP, kx, ky, 0.17, 0.12, color)
    // The shoe: pointing along the foot, which is square to the shin, toe forward.
    const fx = Math.cos(b)
    const fy = -Math.sin(b)
    solid(p, ink, weight * 0.7, paint(hx, t, M.door))
    p.beginShape()
    p.vertex(X(k, ax - fx * 0.06 - Math.sin(b) * 0.02), X(k, ay - fy * 0.06 - Math.cos(b) * 0.02))
    p.vertex(X(k, ax + fx * 0.22), X(k, ay + fy * 0.22 + 0.02 * Math.cos(b)))
    p.vertex(X(k, ax + fx * 0.22 + Math.sin(b) * 0.1), X(k, ay + fy * 0.22 + Math.cos(b) * 0.1))
    p.vertex(X(k, ax - fx * 0.06 + Math.sin(b) * 0.1), X(k, ay - fy * 0.06 + Math.cos(b) * 0.1))
    p.endShape(p.CLOSE)
    // The knee's pin.
    solid(p, ink, weight * 0.5, dark)
    p.circle(X(k, kx), X(k, ky), X(k, 0.07))
  }
  // The bar over the hips, and the pins.
  solid(p, ink, weight * 0.8, paint(x0, t, M.bush))
  p.rect(X(k, x0 - 0.1), X(k, HIP - 0.16), X(k, x1 - x0 + 0.2), X(k, 0.16))
  p.noStroke()
  p.fill(paint(x0, t, M.door))
  p.rect(X(k, x0 - 0.1), X(k, HIP - 0.05), X(k, x1 - x0 + 0.2), X(k, 0.05))
  for (let i = 0; i < LEGS; i++) {
    solid(p, ink, weight * 0.5, paint(legX(i), t, mixHex(M.purple, ink, 0.4)))
    p.circle(X(k, legX(i)), X(k, HIP), X(k, 0.08))
  }
}

function drawHollywood(p: p5, s: HollyState, c: Ctx): void {
  const t = c.t + s.begin
  p.rectMode(p.CORNER)
  p.ellipseMode(p.CENTER)
  drawSign(p, c, t)
  drawBeams(p, c, t)
  drawHill(p, c, t, s)
  for (let i = 0; i < BUSH.length; i++) drawBush(p, c, t, i)
  s.lamps.forEach(([x, y], i) => drawLampHead(p, c, t, x, y, i < 3 ? LAMP_AT[i] : CREST_LAMP_AT, OUT[i]))
  drawKickLine(p, c, t)
  drawStars(p, c, t)
  drawTrap(p, c, t)
}

export const hollywood = part<HollyState>(
  { name: 'hollywood', flight: true, draw: drawHollywood },
  (slot) => {
    const T = slot.end - slot.begin
    const seb = sebPath()
    rollTo(seb, seb.last.p, T)
    const lane: Lane = { segs: seb.segs, fire: 0 }
    const mia = miaPath()
    const miaLane: Lane = { segs: mia.segs, fire: 0 }
    // Each road lamp stands where he is on its beat, at the back of the road; the crest's beside where he lands.
    const lamps: Pt[] = LAMP_AT.map((at, i) => [laneAt(lane, at - slot.begin).x + (i === 1 ? -0.35 : 0.35), ROAD[i][2]] as Pt)
    lamps.push([CREST[0] + 0.3, YC + FLOOR])
    return {
      cells: box(-2, -20, 36, 4, 2),
      exit: [seb.last.p[0] + 0.5, seb.last.p[1]],
      lane,
      state: { begin: slot.begin, lamps },
      company: [{ from: slot.begin, to: MIA_TO, who: 'mia', at: (t) => {
        const q = laneAt(miaLane, t - slot.begin)
        return { x: q.x, y: q.y }
      } }],
    }
  },
  () => [
    // The burst, close by the door; then back, all the way, to the whole painted set as the sign lights.
    { t: BURST - 0.04, cells: 5.4, off: [0.35, -1.35], w: 0 },
    { t: BURST + 0.45, cells: 6.2, off: [0.6, -1.5], w: 0 },
    { t: beat(170), cells: 17, hold: [8.4, -5.0], w: 1 },
    { t: beat(174.5), cells: 17, hold: [8.6, -5.0], w: 1 },
    // In on the kick-line.
    { t: beat(176.5), cells: 6.4, hold: [9.2, -1.25], w: 0.85 },
    { t: beat(181.5), cells: 6.6, hold: [10.4, -1.3], w: 0.85 },
    // The hill, whole, rising with them.
    { t: beat(185.5), cells: 8.6, hold: [14.9, -2.8], w: 0.7 },
    { t: beat(197), cells: 8.4, hold: [15.0, -3.6], w: 0.7 },
    { t: beat(207), cells: 9, hold: [15.0, -4.6], w: 0.7 },
    // The crest and its fan of light, wide.
    { t: FLOURISH[0] - 0.3, cells: 13, hold: [14.6, -5.7], w: 1 },
    { t: OUT[0], cells: 13.4, hold: [14.6, -5.7], w: 1 },
    { t: MIA_TO, cells: 14, hold: [14.6, -5.8], w: 1 },
  ],
)
