import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, laneAt, mixHex, type Lane, type Pt, type Seg } from '../../../../../parts'
import { beam, box, carried, glow, hash, knock, part, rgba, ring, smooth, type Ctx, type Way } from '../kit'
import { dream, snap } from '../music'
import { G, hop } from '../physics'
import { MIA, STUDIO_MAT as M } from '../worlds'
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
export const OUT = [169.993, 170.539, 170.841, 171.085].map(onset)
/** Mia is ours until the dark is whole. */
const MIA_TO = 171.96

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
/**
 * The chorus: the kick-line answers the band's brass stabs on its own while he is elsewhere (the off-beats after the
 * burst, and the climb), a lower kick in unison, the ensemble keeping the number going behind him.
 */
const CHORUS = [144.34, 146.69, 147.17, 152.44, 154.31, 154.9, 156.19, 162.39].map(onset)
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
/** The road's stretches, drawn: left and right ends (each at a hairpin), surface height. */
const ROAD: [number, number, number][] = [
  [12.1, 16.95, Y1 + FLOOR],
  [12.95, 16.95, Y2 + FLOOR],
  [12.95, 17.1, Y3 + FLOOR],
]
/** How thick the road is drawn: the balls roll on its top. */
const ROAD_W = 0.17
/** A hairpin's centreline: half an ellipse from the stretch at `yLow` round to the one at `yHigh`, out on `side`. */
function hairpin(x: number, yLow: number, yHigh: number, side: 1 | -1, n = 20): Pt[] {
  const r = (yLow - yHigh) / 2
  const cy = (yLow + yHigh) / 2 + ROAD_W / 2
  return Array.from({ length: n + 1 }, (_, j): Pt => {
    const a = Math.PI / 2 - (Math.PI * j) / n
    return [x + side * 0.7 * r * Math.cos(a), cy + r * Math.sin(a)]
  })
}
/**
 * The road as one ribbon, its centreline: up out of the floor round the hill's foot, along each stretch, round each
 * hairpin to the next, and round the shoulder toward the crest, where it goes behind the hill.
 */
const ROAD_LINE: Pt[] = [
  ...hairpin(ROAD[0][0], FLOOR, ROAD[0][2], -1),
  ...hairpin(ROAD[0][1], ROAD[0][2], ROAD[1][2], 1),
  ...hairpin(ROAD[1][0], ROAD[1][2], ROAD[2][2], -1),
  ...hairpin(ROAD[2][1], ROAD[2][2], YC + FLOOR, 1),
]
/** The crest's plateau. */
const CREST: [number, number] = [14.05, 16.45]

/** The bushes' beats: him, then her two beats later. Landing on each stretch a beat and a half after. */
const SEB_BUSH = [183, 191, 199, 207]
const MIA_BUSH = SEB_BUSH.map((k) => k + 2)

/* ------------------------------------------------------------------ the paths */

type Build = { segs: Seg[]; last: Way }
const start = (at: number, p: Pt): Build => ({ segs: [], last: { at, p } })
function hopTo(b: Build, p: Pt, at: number, g?: number): void {
  const w = hop(b.last, p, at, g)
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
  // Leapfrog: she waits on her star while he vaults over her, then a short hop of one beat to the next, landing on its
  // star as he goes over the one ahead. While he is over her she is on the ground, and they never pass through each other.
  for (let i = 0; i < 4; i++) {
    rollTo(b, b.last.p, t(167 + 2 * i))
    hopTo(b, [STARS[2 * i + 1].x, 0], t(168 + 2 * i))
  }
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
  ...new Set([...TRAP_AT, ...SIGN_AT, ...STARS.map((s) => s.at), ...KICKS, ...CHORUS, ...SEB_LANDS, ...MIA_LANDS, ...LAMP_AT, CREST_LAMP_AT, ...FLOURISH, ...OUT].map((t) => Math.round(t * 1e4) / 1e4)),
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
  // Whose dream this is: over the flourish's six hits the sign goes from white to her yellow, a block a hit from the
  // middle outward, and blazes in it on the last: her name in lights, without a letter.
  const hers = (i: number): number => {
    const from = FLOURISH[Math.min(5, Math.floor(Math.abs(i - 4) * 1.3))] - 0.05
    return smooth(t, from, from + 0.18)
  }
  SIGN.forEach((b, i) => {
    const on = lampLevel(t, SIGN_AT[i], OUT[3])
    if (on <= 0) return
    const lift = on + 0.5 * blaze
    const y = hers(i)
    // Its light on the mountain's face under it.
    glow(p, k, b.x, b.y + 0.15 + dy, 0.9 + 0.2 * y, mixHex(M.lamp, MIA, 0.8 * y), (0.22 + 0.1 * y) * lift, 1.1, 0.45)
    p.push()
    p.translate(X(k, b.x), X(k, b.y + dy))
    p.rotate(b.tilt)
    p.noStroke()
    p.fill(mixHex(mixHex(mixHex(M.sign, M.mountain, 0.42), M.sign, Math.min(1, lift)), MIA, 0.85 * y))
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
    return { a, on: off * 0.8 * smooth(s, -0.02, 0.06) }
  }
  if (t < lockAt) return { a: FAN[i], on: 0 }
  return { a: FAN[i], on: off * 0.8 * smooth(t - lockAt, 0, 0.06) }
}

function drawBeams(p: p5, c: Ctx, t: number): void {
  const { k } = c
  for (let i = 0; i < 6; i++) {
    const { a, on } = searchlight(i, t)
    if (on <= 0.01) continue
    const L = 17
    const x1 = SL_X[i] + Math.sin(a) * L
    const y1 = SL_Y - Math.cos(a) * L
    beam(p, k, SL_X[i], SL_Y, x1, y1, 0.16, 2.1, M.lamp, 0.2 * on)
  }
}

/** The hill: a painted mound, the road winding up its face in stretches and hairpins. */
const HILL: Pt[] = (() => {
  const pts: Pt[] = []
  const left: Pt[] = [[10.75, FLOOR], [11.25, -0.32], [11.58, -1.05], [11.86, -2.1], [12.05, -3.2], [12.3, -4.4], [12.75, -5.3], [13.4, -5.95], [14.05, YC + FLOOR]]
  const right: Pt[] = [[16.45, YC + FLOOR], [17.1, -5.9], [17.65, -5.0], [17.95, -3.9], [18.25, -2.6], [18.65, -1.3], [19.3, -0.3], [20.1, FLOOR]]
  pts.push(...left, ...right)
  return pts
})()

/** Where the hill's left and right outlines are at height `y` (between the floor and the crest). */
function hillSpan(y: number): [number, number] {
  const side = (pts: Pt[]) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[i + 1]
      if ((y <= y0 && y >= y1) || (y >= y0 && y <= y1)) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1)
    }
    return pts[0][0]
  }
  const i = HILL.findIndex(([x]) => x === CREST[1])
  return [side(HILL.slice(0, i)), side(HILL.slice(i))]
}
/** How far a point is from the road's centreline, and whether it is above the road there. */
function fromRoad(x: number, y: number): { d: number; above: boolean } {
  let d = Infinity
  let above = false
  for (let i = 0; i + 1 < ROAD_LINE.length; i++) {
    const [ax, ay] = ROAD_LINE[i]
    const [bx, by] = ROAD_LINE[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    const e = Math.hypot(x - ax - u * dx, y - ay - u * dy)
    if (e < d) {
      d = e
      above = y < ay + u * dy
    }
  }
  return { d, above }
}
/**
 * The chaparral: a hedge of dark scrub along the hill's foot, its tops uneven, the way a scenic painter grounds a hill;
 * the face above is left to the road. Each clump is a few round lobes, kept clear of the road and of the bushes.
 */
const SCRUB: { x: number; y: number; lobes: [number, number, number][] }[] = (() => {
  const out: { x: number; y: number; r: number; lobes: [number, number, number][] }[] = []
  const tryAt = (i: number, x: number, y: number, r: number) => {
    const road = fromRoad(x, y)
    if (road.d < ROAD_W / 2 + r + 0.08 + (road.above ? 2 * R + 0.08 : 0)) return
    if (BUSH.some(([bx, by]) => Math.hypot(x - bx, y - by) < RB + r + 0.1)) return
    if (out.some((s) => Math.hypot(x - s.x, y - s.y) < (r + s.r) * 0.75)) return
    const n = 3 + (hash(i, 44) > 0.55 ? 1 : 0)
    const lobes = Array.from({ length: n }, (_, j): [number, number, number] => {
      const u = j / (n - 1) - 0.5
      return [x + u * r * 1.6, y + r * (0.15 + 0.55 * Math.abs(u) - 0.3 * hash(i, j, 45)), r * (1 - 0.45 * Math.abs(u)) * (0.8 + 0.3 * hash(i, j, 46))]
    })
    out.push({ x, y, r, lobes })
  }
  // The hedge along the foot, its tops uneven.
  const [a0, b0] = hillSpan(FLOOR - 0.2)
  for (let i = 0, x = a0 + 0.15; x < b0 - 0.15; i++) {
    const r = 0.11 + 0.08 * hash(i, 47)
    tryAt(i, x, FLOOR - 0.08 - 0.14 * hash(i, 48), r)
    x += r * (1.1 + 0.6 * hash(i, 49))
  }
  return out
})()

/** The hill's outline as a canvas path: the same Catmull-Rom curve p5's `curveVertex` draws through `HILL`. */
let hillPath: { k: number; path: Path2D } | null = null
function hillOutline(k: number): Path2D {
  if (hillPath?.k === k) return hillPath.path
  const pts = [HILL[0], ...HILL, HILL[HILL.length - 1]]
  const path = new Path2D()
  path.moveTo(X(k, pts[1][0]), X(k, pts[1][1]))
  for (let i = 1; i + 2 < pts.length; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]]
    path.bezierCurveTo(
      X(k, p1[0] + (p2[0] - p0[0]) / 6), X(k, p1[1] + (p2[1] - p0[1]) / 6),
      X(k, p2[0] - (p3[0] - p1[0]) / 6), X(k, p2[1] - (p3[1] - p1[1]) / 6),
      X(k, p2[0]), X(k, p2[1]),
    )
  }
  path.closePath()
  hillPath = { k, path }
  return path
}

function drawHill(p: p5, c: Ctx, t: number, s: HollyState): void {
  const { k, ink, weight } = c
  // The near hill stands in its own shadow against the sunset: deep indigo at its foot, a little lighter toward the
  // crest, and a rim of the sun's coral along the side and the crest that face it.
  const hill = paint(15, t, M.hillLit)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const path = hillOutline(k)
  const shade = ctx.createLinearGradient(0, X(k, YC + FLOOR), 0, X(k, FLOOR))
  shade.addColorStop(0, hill)
  shade.addColorStop(1, paint(15, t, M.hillDeep))
  ctx.fillStyle = shade
  ctx.fill(path)
  const rim = paintAt(15, t)
  ctx.save()
  ctx.clip(path)
  if (rim > 0.02) {
    // The chaparral, each clump catching the sunset on its upper right, more on the sunward side. One path a layer.
    const lit = new Path2D()
    const body = new Path2D()
    for (const { lobes } of SCRUB) {
      for (const [x0, ly, r] of lobes) {
        // Stirring: a breeze runs along the hedge, the clumps' tops leaning with it.
        const lx = x0 + 0.03 * Math.sin(t * 1.4 - x0 * 1.1) * (0.4 + r * 4)
        lit.moveTo(X(k, lx + r * 1.17), X(k, ly - r * 0.26))
        lit.arc(X(k, lx + r * 0.22), X(k, ly - r * 0.26), X(k, 0.95 * r), 0, Math.PI * 2)
        body.moveTo(X(k, lx + r), X(k, ly))
        body.arc(X(k, lx), X(k, ly), X(k, r), 0, Math.PI * 2)
      }
    }
    const sun = ctx.createLinearGradient(X(k, 12.5), 0, X(k, 18.5), 0)
    sun.addColorStop(0, rgba(mixHex(M.hillLit, M.skyCoral, 0.5), 0.45 * rim))
    sun.addColorStop(1, rgba(mixHex(M.hillLit, M.skyCoral, 0.5), 0.95 * rim))
    ctx.fillStyle = sun
    ctx.fill(lit)
    ctx.fillStyle = rgba(mixHex(M.scrub, M.hillLit, 0.3), rim)
    ctx.fill(body)
    // The shade each stretch of road casts on the slope just below it: deepest under its middle, soft at its ends.
    for (const [x0, x1, y] of ROAD) {
      const half = (x1 - x0) / 2 + 0.3
      ctx.save()
      ctx.beginPath()
      ctx.rect(X(k, x0 - 0.5), X(k, y + ROAD_W), X(k, x1 - x0 + 1), X(k, 0.6))
      ctx.clip()
      ctx.translate(X(k, (x0 + x1) / 2), X(k, y + ROAD_W))
      ctx.scale(1, 0.45 / half)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, X(k, half))
      g.addColorStop(0, rgba(M.scrub, 0.55 * rim))
      g.addColorStop(0.75, rgba(M.scrub, 0.4 * rim))
      g.addColorStop(1, rgba(M.scrub, 0))
      ctx.fillStyle = g
      ctx.fillRect(X(k, -half), X(k, -half), X(k, 2 * half), X(k, 2 * half))
      ctx.restore()
    }
  }
  // The road, one painted ribbon up the face: inked at its edges, the sunset's dusty rose on it, a dashed line down its
  // middle; on each stretch, where they roll, the light along its top and the shade along its underside. Round the
  // shoulder at the top it goes behind the hill, so it is drawn inside the hill's outline.
  const ribbon = (color: string, w: number) => {
    p.noFill()
    p.stroke(color)
    p.strokeWeight(w)
    p.beginShape()
    for (const [x, y] of ROAD_LINE) p.vertex(X(k, x), X(k, y))
    p.endShape()
  }
  p.strokeJoin(p.ROUND)
  p.strokeCap(p.ROUND)
  ribbon(ink, X(k, ROAD_W) + 2 * weight * 0.7)
  ribbon(paint(15, t, M.road), X(k, ROAD_W))
  p.strokeCap(p.SQUARE)
  for (const [x0, x1, y] of ROAD) {
    p.stroke(paint(15, t, M.roadUnder))
    p.strokeWeight(X(k, 0.05))
    p.line(X(k, x0), X(k, y + ROAD_W - 0.025), X(k, x1), X(k, y + ROAD_W - 0.025))
    p.stroke(paint(15, t, M.roadKerb))
    p.strokeWeight(X(k, 0.035))
    p.line(X(k, x0), X(k, y + 0.0175), X(k, x1), X(k, y + 0.0175))
  }
  ctx.setLineDash([X(k, 0.14), X(k, 0.12)])
  ribbon(rgba(M.flat, 0.55 * rim), Math.max(1, X(k, 0.022)))
  ctx.setLineDash([])
  p.strokeCap(p.ROUND)
  ctx.restore()
  // The outline over it all, and the coral rim just inside it on the crest and the sunward flank.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight)
  ctx.stroke(path)
  if (rim > 0.02) {
    p.noFill()
    p.stroke(rgba(M.skyCoral, 0.75 * rim))
    p.strokeWeight(X(k, 0.05))
    p.beginShape()
    const lit = HILL.slice(HILL.findIndex(([x]) => x === CREST[0]) - 1, HILL.length - 1)
    p.curveVertex(X(k, lit[0][0] + 0.04), X(k, lit[0][1] + 0.05))
    for (const [x, y] of lit) p.curveVertex(X(k, x - (x > CREST[1] ? 0.05 : 0)), X(k, y + 0.05))
    p.curveVertex(X(k, lit[lit.length - 1][0] - 0.05), X(k, lit[lit.length - 1][1]))
    p.endShape()
  }
  // The crest's plateau, a shade lighter where they stand: a band just under the outline's own curve (the same
  // Catmull-Rom span the hill is drawn with), thinning to nothing at each shoulder.
  p.noStroke()
  p.fill(mixHex(hill, M.flat, 0.18))
  const i1 = HILL.findIndex(([x]) => x === CREST[0])
  const [P0, P1, P2, P3] = [HILL[i1 - 1], HILL[i1], HILL[i1 + 1], HILL[i1 + 2]]
  const cr = (u: number, j: 0 | 1) =>
    0.5 * (2 * P1[j] + (P2[j] - P0[j]) * u + (2 * P0[j] - 5 * P1[j] + 4 * P2[j] - P3[j]) * u * u + (3 * P1[j] - P0[j] - 3 * P2[j] + P3[j]) * u * u * u)
  p.beginShape()
  for (let j = 0; j <= 24; j++) p.vertex(X(k, cr(j / 24, 0)), X(k, cr(j / 24, 1) + 0.02))
  for (let j = 24; j >= 0; j--) p.vertex(X(k, cr(j / 24, 0)), X(k, cr(j / 24, 1) + 0.02 + 0.14 * Math.sin((Math.PI * j) / 24)))
  p.endShape(p.CLOSE)
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
  // Its light on the road under it.
  if (lit > 0) glow(p, k, x, y + 0.05, 0.9, M.lamp, 0.3 * lit, 1.3, 0.32)
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

/** Each bush's lobes of bloom, in its own unit circle (x, y, radius): a dome of them, each bush its own shape. */
const BLOOMS: [number, number, number][][] = BUSH.map((_, i) => [
  [0, 0.04, 0.6] as [number, number, number],
  ...Array.from({ length: 8 }, (_, j): [number, number, number] => {
    const a = (j / 8) * Math.PI * 2 + 0.45 * hash(i, j, 61)
    return [Math.cos(a) * 0.56, Math.sin(a) * 0.5, 0.36 + 0.1 * hash(i, j, 62)]
  }),
])

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
  // The first stands on the floor on its spring, compressing with it. The ones at the hairpins grow on the hill.
  if (i === 0) {
    const top = by + h * 0.85
    const turns = 5
    outline(p, ink, weight * 0.8)
    p.stroke(paint(cx, t, mixHex(M.purple, ink, 0.55)))
    p.strokeWeight(Math.max(1, X(k, 0.035)))
    p.beginShape()
    for (let j = 0; j <= turns * 2; j++) {
      const y = FLOOR + ((top - FLOOR) * j) / (turns * 2)
      p.vertex(X(k, cx + (j % 2 === 0 ? -0.1 : 0.1)), X(k, y))
    }
    p.endShape()
  }
  // The bush: bougainvillea, a round clump of magenta bloom over dark leaves, inked round its outside only. The bloom is
  // in shade low on the left and lit on its upper right, toward the sunset; the leaves show at its foot.
  // Each layer is one path of its lobes, filled once.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const lobes = (dx: number, dy: number, s: number, only?: (u: number, v: number) => boolean): Path2D => {
    const path = new Path2D()
    for (const [u, v, r] of BLOOMS[i]) {
      if (only && !only(u, v)) continue
      const ex = X(k, cx + (u + dx) * w)
      const ey = X(k, by + (v + dy) * h)
      path.moveTo(ex + X(k, r * s * w), ey)
      path.ellipse(ex, ey, X(k, r * s * w), X(k, r * s * h), 0, 0, Math.PI * 2)
    }
    return path
  }
  const all = lobes(0, 0, 1)
  ctx.fillStyle = paint(cx, t, M.leaf)
  ctx.strokeStyle = ink
  ctx.lineWidth = weight * 2
  ctx.fill(all)
  ctx.stroke(all)
  ctx.fill(all)
  // The bloom is in clusters, not one mass: two of the outer lobes are left in leaf, so the green shows between them.
  const bare = (u: number, v: number) => BLOOMS[i].findIndex(([a, b]) => a === u && b === v) % 4 !== 1 + (i % 2)
  for (const [path, color] of [
    [lobes(0.02, 0.08, 0.98, (_, v) => v > 0.2), M.leafDeep],
    [lobes(-0.03, -0.08, 0.86, bare), M.bloomDeep],
    [lobes(0.04, -0.15, 0.7, bare), M.bloom],
  ] as const) {
    ctx.fillStyle = paint(cx, t, color)
    ctx.fill(path)
  }
  // The light on the bracts toward the sunset: small clusters of them on the upper right, not round highlights.
  const bracts = new Path2D()
  for (const [u, v, r] of BLOOMS[i]) {
    if (u - v <= 0.15 || !bare(u, v)) continue
    for (const [du, dv, dr] of [[0.06, -0.2, 0.2], [0.2, -0.1, 0.16], [0.16, -0.27, 0.13]]) {
      const ex = X(k, cx + (u + du) * w)
      const ey = X(k, by + (v + dv) * h)
      bracts.moveTo(ex + X(k, r * dr * 2 * w), ey)
      bracts.ellipse(ex, ey, X(k, r * dr * 2 * w), X(k, r * dr * 2 * h), 0, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = paint(cx, t, M.bloomLit)
  ctx.fill(bracts)
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
    const lit = since < 0 ? 0 : 0.6 * smooth(since, 0, 0.08) * fade
    if (lit > 0) glow(p, k, s.x, FLOOR + 0.02, 0.55, M.star, 0.55 * lit, 1, 0.45)
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
  for (const at of CHORUS) {
    const s = t - at
    if (s < 0 || s > 1.2) continue
    const q = kickPose(s, false)
    if (q.hip * 0.62 > hip) {
      hip = q.hip * 0.62
      knee = q.knee * 0.62
    }
  }
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

/** Where each dancer's standing leg is, behind her kicking one; her torso's height, hip to shoulder; her head. */
const STAND_DX = -0.13
const TORSO = 0.78
const HEAD_R = 0.12

function drawKickLine(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const x0 = legX(0) - 0.3
  const x1 = legX(LEGS - 1) + 0.3
  const pose = legPose(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const colorOf = (i: number) => paint(legX(i), t, LEG_COLORS[i % LEG_COLORS.length])
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
  /** A leg from the hip at `hx`: swung `a` from straight down, bent `knee` at the knee; tights, garter and pump. */
  const leg = (hx: number, a: number, knee: number, color: string, pin: boolean) => {
    const kx = hx + Math.sin(a) * THIGH
    const ky = HIP + Math.cos(a) * THIGH
    const b = a - knee
    const ax = kx + Math.sin(b) * SHIN
    const ay = ky + Math.cos(b) * SHIN
    limb(kx, ky, ax, ay, 0.12, 0.075, color)
    limb(hx, HIP, kx, ky, 0.17, 0.12, color)
    // The garter, where her stocking ends, just below the skirt.
    const gx = hx + Math.sin(a) * THIGH * 0.52
    const gy = HIP + Math.cos(a) * THIGH * 0.52
    const gnx = Math.cos(a) * 0.075
    const gny = -Math.sin(a) * 0.075
    p.strokeCap(p.ROUND)
    p.stroke(ink)
    p.strokeWeight(X(k, 0.05) + weight * 0.9)
    p.line(X(k, gx - gnx), X(k, gy - gny), X(k, gx + gnx), X(k, gy + gny))
    p.stroke(paint(hx, t, M.flat))
    p.strokeWeight(X(k, 0.05))
    p.line(X(k, gx - gnx), X(k, gy - gny), X(k, gx + gnx), X(k, gy + gny))
    // The shoe, a heeled pump: pointing along the foot, which is square to the shin, toe forward; its sole arches up
    // off the floor between the ball of the foot and the heel.
    const fx = Math.cos(b)
    const fy = -Math.sin(b)
    const nx = Math.sin(b)
    const ny = Math.cos(b)
    const at = (f: number, n: number): [number, number] => [X(k, ax + fx * f + nx * n), X(k, ay + fy * f + ny * n)]
    solid(p, ink, weight * 0.7, paint(hx, t, M.door))
    p.beginShape()
    for (const [f, n] of [[-0.06, -0.02], [0.22, 0.02], [0.22, 0.1], [0.07, 0.1], [0.01, 0.055], [-0.025, 0.1], [-0.06, 0.1]]) p.vertex(...at(f, n))
    p.endShape(p.CLOSE)
    // The knee's pin: these are a machine's dancers, hinged.
    if (pin) {
      solid(p, ink, weight * 0.5, mixHex(color, ink, 0.25))
      p.circle(X(k, kx), X(k, ky), X(k, 0.07))
    }
  }
  // Each dancer stands on one leg, a little behind, and the line's other legs kick together: the machine part, the
  // one whose toes he is juggled along.
  for (let i = 0; i < LEGS; i++) leg(legX(i) + STAND_DX, 0, 0, mixHex(colorOf(i), ink, 0.12), false)
  for (let i = 0; i < LEGS; i++) leg(legX(i), pose.hip, pose.knee, colorOf(i), true)
  // Above the line's sash, the dancers: arms linked across the line, each leaning back a little into the kick, in a
  // bodice of her colour, her head a dark shape with the sunset along it, a plume of her colour above it.
  const lean = -0.07 * Math.min(1, pose.hip / 1.95)
  const body = paint(x0, t, mixHex(M.hillDeep, ink, 0.25))
  const up = (i: number, dy: number, dx = 0): [number, number] => {
    const hx = legX(i) + STAND_DX / 2
    return [hx + dx * Math.cos(lean) - dy * Math.sin(lean), HIP - 0.12 + dx * Math.sin(lean) + dy * Math.cos(lean)]
  }
  // The linked arms, behind their backs: one line along the shoulders from the first to the last, seen only where it
  // crosses from one dancer to the next, and the two ends' outer hands on their hips.
  p.noFill()
  p.strokeJoin(p.ROUND)
  for (const [col, w] of [[ink, X(k, 0.06) + weight * 1.2], [body, X(k, 0.06)]] as const) {
    p.stroke(col)
    p.strokeWeight(w)
    p.beginShape()
    const [ax, ay] = up(0, -TORSO * 0.4, -0.3)
    const [wx, wy] = up(0, -TORSO * 0.12, -0.12)
    p.vertex(X(k, wx), X(k, wy))
    p.vertex(X(k, ax), X(k, ay))
    for (let i = 0; i < LEGS; i++) {
      const [sx, sy] = up(i, -TORSO * 0.88)
      p.vertex(X(k, sx), X(k, sy))
    }
    const [ex, ey] = up(LEGS - 1, -TORSO * 0.4, 0.3)
    const [vx, vy] = up(LEGS - 1, -TORSO * 0.12, 0.12)
    p.vertex(X(k, ex), X(k, ey))
    p.vertex(X(k, vx), X(k, vy))
    p.endShape()
  }
  for (let i = 0; i < LEGS; i++) {
    const color = colorOf(i)
    // The plume, behind her head: a tall feather leaning back, ribbed.
    const [bx, by] = up(i, -TORSO - 2 * HEAD_R + 0.02)
    const [tx, ty] = up(i, -TORSO - 2 * HEAD_R - 0.5, -0.12)
    solid(p, ink, weight * 0.6, mixHex(color, M.flat, 0.15))
    p.beginShape()
    p.vertex(X(k, bx - 0.05), X(k, by))
    p.quadraticVertex(X(k, bx - 0.2), X(k, (by + ty) / 2), X(k, tx), X(k, ty))
    p.quadraticVertex(X(k, bx + 0.12), X(k, (by + ty) / 2), X(k, bx + 0.05), X(k, by))
    p.endShape(p.CLOSE)
    p.stroke(mixHex(color, ink, 0.3))
    p.strokeWeight(Math.max(1, weight * 0.5))
    p.line(X(k, bx), X(k, by), X(k, tx), X(k, ty))
    // The bodice: narrow at her waist on the sash, out to her shoulders.
    solid(p, ink, weight * 0.7, mixHex(color, ink, 0.18))
    p.beginShape()
    for (const [dx, dy] of [[-0.12, 0], [-0.17, -TORSO * 0.75], [-0.13, -TORSO], [0.13, -TORSO], [0.17, -TORSO * 0.75], [0.12, 0]]) p.vertex(...up(i, dy, dx).map((v) => X(k, v)) as [number, number])
    p.endShape(p.CLOSE)
    // Her head on its neck, the sunset along its right.
    const [nx, ny] = up(i, -TORSO - HEAD_R + 0.02)
    solid(p, ink, weight * 0.6, body)
    p.circle(X(k, nx), X(k, ny), X(k, 2 * HEAD_R))
    p.noFill()
    p.stroke(rgba(M.skyCoral, 0.8 * paintAt(legX(i), t)))
    p.strokeWeight(Math.max(1, X(k, 0.025)))
    p.arc(X(k, nx), X(k, ny), X(k, 2 * HEAD_R - 0.04), X(k, 2 * HEAD_R - 0.04), -Math.PI * 0.45, Math.PI * 0.2)
  }
  // Each dancer's skirt: a fringe of her colour hung from the sash over her hips, flaring up in front as she kicks.
  // One path of strands for the ink under them all, and one for each of the three tones.
  const under = new Path2D()
  const strands = new Map<string, Path2D>()
  for (let i = 0; i < LEGS; i++) {
    const hx = legX(i)
    const color = colorOf(i)
    const tones = [color, mixHex(color, M.flat, 0.3), mixHex(color, ink, 0.28)]
    for (let j = 0; j <= 12; j++) {
      const u = j / 12
      const sx = hx - 0.31 + 0.56 * u
      const flare = pose.hip * (0.12 + 0.55 * u * u)
      const L = 0.35 + 0.05 * hash(i, j, 71) - 0.08 * Math.abs(u - 0.5)
      const ends = [X(k, sx), X(k, HIP - 0.04), X(k, sx + Math.sin(flare) * L), X(k, HIP - 0.04 + Math.cos(flare) * L)]
      under.moveTo(ends[0], ends[1])
      under.lineTo(ends[2], ends[3])
      const tone = tones[j % 3]
      let path = strands.get(tone)
      if (!path) strands.set(tone, (path = new Path2D()))
      path.moveTo(ends[0], ends[1])
      path.lineTo(ends[2], ends[3])
    }
  }
  ctx.lineCap = 'round'
  ctx.strokeStyle = ink
  ctx.lineWidth = X(k, 0.045) + weight * 0.9
  ctx.stroke(under)
  ctx.lineWidth = X(k, 0.045)
  for (const [tone, path] of strands) {
    ctx.strokeStyle = tone
    ctx.stroke(path)
  }
  // The sash along their waists, gold, trimmed red.
  solid(p, ink, weight * 0.8, paint(x0, t, M.bush))
  p.rect(X(k, x0), X(k, HIP - 0.16), X(k, x1 - x0), X(k, 0.16), X(k, 0.05))
  p.noStroke()
  p.fill(paint(x0, t, M.door))
  p.rect(X(k, x0 + 0.03), X(k, HIP - 0.05), X(k, x1 - x0 - 0.06), X(k, 0.04))
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
    { t: beat(170), cells: 9.0, hold: [6.8, -2.9], w: 1 },
    { t: beat(174.5), cells: 8.6, hold: [7.4, -2.6], w: 1 },
    // In on the kick-line.
    { t: beat(176.5), cells: 6.4, hold: [9.2, -1.25], w: 0.85 },
    { t: beat(181.5), cells: 6.6, hold: [10.4, -1.3], w: 0.85 },
    // The hill, whole, rising with them.
    { t: beat(185.5), cells: 6.4, hold: [14.9, -2.6], w: 0.45 },
    { t: beat(197), cells: 5.9, hold: [15.0, -3.5], w: 0.4 },
    { t: beat(207), cells: 6.8, hold: [14.6, -6.2], w: 0.6 },
    // The top of the number: the two of them on the crest under the whole sign, the searchlights fanning out of it on
    // the six hits; then back to the whole hill as its lamps go out one by one.
    { t: FLOURISH[0] - 0.3, cells: 6.9, hold: [13.7, -7.55], w: 1 },
    // Pushing in on them across the six accelerating hits, so the frame builds with the music to the last.
    { t: 167.95, cells: 5.9, hold: [13.75, -7.7], w: 1 },
    { t: 168.9, cells: 6.3, hold: [13.8, -7.6], w: 1 },
    { t: OUT[0], cells: 13.4, hold: [14.6, -5.7], w: 1 },
    { t: MIA_TO, cells: 14, hold: [14.6, -5.8], w: 1 },
  ],
)
