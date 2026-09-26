import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, box, part, smooth, type Companion, type Ctx, type Pose } from '../kit'
import { AT, bar, beat, CUT, SEAM } from '../music'
import { HOME, INK } from '../worlds'
import { drawBook } from '../props/book'
import { INSIDE } from './inside'
import { clamp01, hermite, hopAt, inout, laneOf, pchip, settle } from './home-motion'

/**
 * YARD (84.376 to 103.288): the piano alone, and the waltz's return. The film's own restraint: nothing strikes but
 * what he does.
 *
 * From the doctor's office, the cut: Carl at rest just inside the back door, looking out through its screen; out
 * in the yard, under the big tree, Ellie on its old stump, turned away from the house, still. The sky is grey (the
 * set's). The wind is the only thing that moves: the grass, the tree, a sheet on the line.
 *
 * On the piano's first phrase he takes a step toward the door, and stops. Then (88.886, the phrase's strongest
 * note) he leans into the little bookcase by the door: it rocks, and her adventure book, left overhanging its top,
 * tips off onto him (89.304). He pushes out through the screen door (90.813: it swings out and back on its spring
 * hinges, ringing down), stops outside, and as the music gathers walks out to her, slowly, under the sheet, round
 * in front of the stump (under her) and stops a little way off, where she is looking.
 *
 * On the waltz's return (100.357) the book opens on his top: the board stands up with her painting of Paradise
 * Falls inside it, at her eye level, and on bar 1 (100.78) a cut-paper jungle folds up in front. She turns to it,
 * and lights up: she hops down off the stump on the house's side (101.314) and is away home ahead of him; she bumps
 * the door in on bar 2 (102.046); he follows her in with the book open, and it folds shut (102.899) and slides off
 * his top onto the bookcase's bottom shelf, where it lives. At the seam (`SEAM.jar`) he is at the house's (0.3, 0)
 * moving right at 0.8, and she a step ahead: the living room, the jar.
 *
 * Frame: this part's cells are the house's inside moved by `YARD_AT` (so the house's x is this frame's x - 0.1);
 * everything below is written in the house's cells and moved once.
 */

/** Where this part's entry cell is, in the house's inside: Carl just inside the back door, at (-0.6, 0) in the house's inside (`inside.ts`); the score adds INSIDE_AT. */
export const YARD_AT: Pt = [-0.1, INSIDE.floor]

const OX = YARD_AT[0]
/** The house's x in this frame. */
const at = (x: number): number => x - OX

/* ------------------------------------------------------------------ the yard, in the house's cells */

const GROUND = INSIDE.ground
/** The back door's leaf: a screen door on spring hinges that swing both ways, hung in the middle of the wall. */
const DOOR = { x: (INSIDE.backWall[0] + INSIDE.backWall[1]) / 2, w: 0.95, top: INSIDE.backDoorTop + 0.05, t: 0.05 }
/** The little bookcase by the back door: its top, its shelves (the bottom one is where the book lives). */
const CASE = { x0: -0.45, x1: 0.45, top: GROUND - 0.95, mid: -0.5, low: -0.13 }
/** Where the book is left at first: on the bookcase's top, hanging over its edge. */
const BOOK_X0 = -0.41
/** Where it comes to rest at the end: the middle of the bottom shelf. */
const BOOK_HOME = 0
/** The tree, and Ellie under it (her dot, the ball's own mark, turned down and away from the house). */
const TREE = { x: -4.3, cx: -3.75, cy: -2.75 }
const ELLIE_X = -2.666
/** She sits on the tree's old stump, up out of his way: he passes in front of it, under her. */
const STUMP = { x: ELLIE_X, w: 0.52, top: GROUND - 0.45 }
const SEAT = STUMP.top - 0.13
/** How far she rolls back on it to look at the book: her dot turns from down and away to the picture. */
const TURN = 0.064
/** Where he stops: round in front of her, where she is looking, a little way off. */
const STOP = ELLIE_X - 0.74
/** The clothesline, from a hook on the house to the tree, and the sheet on it. */
const LINE: [Pt, Pt] = [
  [INSIDE.backWall[0], -1.72],
  [TREE.x + 0.08, -1.62],
]
const SHEET = { x0: -2.05, x1: -1.45, drop: 0.8 }

/* ------------------------------------------------------------------ the clock (show seconds) */

const B = CUT.yard
const E = SEAM.jar
/** The phrase's strongest note: he leans into the bookcase. The next: the book lands on him. */
const NUDGE = 88.886
const LAND = 89.304
/** He pushes out through the screen door. */
const PUSH_OUT = 90.813
/** The waltz returns: the book opens. Bar 1: the jungle folds up. Bar 2: she bumps the door in. */
const OPEN = AT.book
const FLAP = bar('jar', 1)
const PUSH_IN = bar('jar', 2)
/** Bar 2's third beat: the book claps shut and slides onto its shelf. */
const SHUT = beat('jar', 2, 3)
/** She hops down off the stump, and lands on the grass on the note after bar 1. */
const E_HOP = 101.0
const E_DOWN = 101.314

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const YARD_HITS: number[] = [NUDGE, LAND, PUSH_OUT, OPEN, FLAP, E_DOWN, PUSH_IN, SHUT]

/* ------------------------------------------------------------------ Carl */

const C0 = -0.6
const C_DOOR = DOOR.x + 0.13
const C_OUT = -1.62
const C_GO = 101.2
/** Out to her, slowly; round in front of her (a little quicker as he passes), and stopping where she is looking. */
const walk = pchip([94.348, 95.9, 97.036, 97.7, 98.836], [C_OUT, -1.95, -2.35, -2.95, STOP])

/** Carl's x (he stays on the ground throughout). */
function carlX(T: number): number {
  if (T <= 86.0) return C0
  // A step toward the door, and a stop; then back.
  if (T <= 86.639) return C0 - 0.18 * inout((T - 86.0) / 0.639)
  if (T <= 87.3) return C0 - 0.18
  if (T <= 88.3) return C0 - 0.18 + 0.18 * inout((T - 87.3) / 1.0)
  // The nudge: into the bookcase, and back.
  if (T <= 88.78) return C0
  if (T <= NUDGE) return C0 + 0.035 * ((T - 88.78) / (NUDGE - 88.78)) ** 2
  if (T <= 89.95) return C0 + 0.035 * (1 - settle((T - NUDGE) / 0.45, 2))
  // To the door, and through it, pushing.
  if (T <= PUSH_OUT) return hermite(C0, 0, C_DOOR, -0.5, PUSH_OUT - 89.95, (T - 89.95) / (PUSH_OUT - 89.95))
  if (T <= 92.3) return hermite(C_DOOR, -0.5, C_OUT, 0, 92.3 - PUSH_OUT, (T - PUSH_OUT) / (92.3 - PUSH_OUT))
  // Outside, a while; then out to her.
  if (T <= 94.348) return C_OUT
  if (T <= 98.836) return walk(T)
  if (T <= C_GO) return STOP
  // After her, home.
  return hermite(STOP, 0, 0.3, 0.8, E - C_GO, (T - C_GO) / (E - C_GO))
}
const carl = (T: number): Pt => [carlX(T), 0]

/** How he holds himself: a lean out toward her, a lean into the bookcase, the book's weight, up on his toes as it opens. */
function carlPose(T: number): { tilt: number; squash: number } {
  let tilt = -0.035 * inout((T - 84.7) / 1.2) * (1 - inout((T - 87.3) / 0.8))
  tilt += 0.12 * inout((T - 88.62) / (NUDGE - 88.62)) * (1 - inout((T - NUDGE) / 0.38))
  let squash = 0
  if (T >= LAND) squash += 0.13 * Math.min(1, (T - LAND) / 0.04) * Math.exp(-(T - LAND) / 0.13)
  squash += 0.025 * smooth(T, LAND, LAND + 0.5) * (1 - smooth(T, C_GO - 0.2, C_GO + 0.2))
  squash -= 0.05 * smooth(T, OPEN - 0.3, OPEN) * (1 - smooth(T, OPEN + 0.15, OPEN + 0.7))
  return { tilt, squash }
}

/* ------------------------------------------------------------------ Ellie */

const E_DOWN_X = -2.25
const E_HOP_V = (E_DOWN_X - (ELLIE_X + TURN)) / (E_DOWN - E_HOP)
const ellieHome = pchip([E_DOWN, PUSH_IN, E], [E_DOWN_X, DOOR.x - 0.13, 0.66], E_HOP_V, 0.8)
/** Ellie: on the stump, still; turning to the book as it opens; down off the stump and away home ahead of him. */
function ellie(T: number): Pt {
  if (T <= OPEN) return [ELLIE_X, SEAT]
  if (T <= OPEN + 0.55) return [ELLIE_X + TURN * inout((T - OPEN) / 0.55), SEAT]
  if (T <= E_HOP) return [ELLIE_X + TURN, SEAT]
  if (T <= E_DOWN) return hopAt([ELLIE_X + TURN, SEAT], [E_DOWN_X, 0], E_DOWN - E_HOP, 12, (T - E_HOP) / (E_DOWN - E_HOP))
  return [ellieHome(T), 0]
}

/* ------------------------------------------------------------------ the door, the bookcase, the book */

/** One push: the leaf swings open (dir 1 out into the yard, -1 into the room), and the spring swings it back, ringing down. */
function swing(s: number, dir: number): number {
  if (s <= 0) return 0
  const open = 1.3
  const t0 = 0.55
  if (s < t0) return dir * hermite(0, 2.2, open, 0, t0, s / t0)
  const r = s - t0
  const zeta = 0.24
  const wn = (2 * Math.PI) / 1.15
  const wd = wn * Math.sqrt(1 - zeta * zeta)
  return dir * open * Math.exp(-zeta * wn * r) * (Math.cos(wd * r) + ((zeta * wn) / wd) * Math.sin(wd * r))
}
/** At rest it hangs a little open (so it reads as a door, and he can see her through it). */
const AJAR = 0.17
const doorAt = (T: number): number => AJAR + swing(T - PUSH_OUT, 1) + swing(T - PUSH_IN, -1)

/** The bookcase rocking back on its far foot from his nudge, and settling. */
function rockAt(T: number): number {
  const s = T - NUDGE
  if (s <= 0) return 0
  return 0.075 * (s / 0.12) * Math.exp(1 - s / 0.12)
}

/** Where his top is, and how he is turned: what the book rides on. */
function top(T: number): { x: number; y: number; tilt: number } {
  const [x, y] = carl(T)
  const { tilt, squash } = carlPose(T)
  const h = 0.13 - 0.26 * squash
  return { x: x + Math.sin(tilt) * h, y: y - Math.cos(tilt) * h, tilt }
}

/** When it starts to fall from the bookcase: so that from its top it lands on his on the note. */
const FALL_FROM = LAND - Math.sqrt((2 * (GROUND - 0.26 - CASE.top)) / 12)
/** The book slides off his top onto its shelf from the moment it shuts, and comes to rest. */
const REST = SHUT + 0.3

interface BookAt {
  x: number
  y: number
  tilt: number
  open: number
  flap: number
  /** Drawn in front of him (riding him or falling), or with the bookcase. */
  front: boolean
}

/** The book at `T`: on the bookcase's top, falling, on his top (opening, standing, folding), sliding onto its shelf. */
function bookAt(T: number): BookAt {
  const shut = { open: 0, flap: 0 }
  if (T < NUDGE) return { x: BOOK_X0, y: CASE.top, tilt: 0, ...shut, front: false }
  if (T < FALL_FROM) {
    // The bookcase goes out from under it: it stays, and tips over the edge.
    const u = (T - NUDGE) / (FALL_FROM - NUDGE)
    return { x: BOOK_X0, y: CASE.top, tilt: -0.3 * inout(u), ...shut, front: true }
  }
  if (T < LAND) {
    const u = (T - FALL_FROM) / (LAND - FALL_FROM)
    const s = T - FALL_FROM
    const t = top(LAND)
    return { x: BOOK_X0 + (t.x - BOOK_X0) * inout(u), y: CASE.top + 6 * s * s, tilt: -0.3 * Math.sin((Math.PI / 2) * (1 + u)), ...shut, front: true }
  }
  // Opening on the waltz's return: the board stands with the note, a paper wobble after; the jungle on bar 1.
  const openUp = T < OPEN ? clamp01((T - (OPEN - 0.4)) / 0.4) ** 2 : 1 - 0.05 * Math.exp(-(T - OPEN) / 0.14) * Math.abs(Math.sin((T - OPEN) * 16))
  const flapUp = T < FLAP ? clamp01((T - (FLAP - 0.2)) / 0.2) ** 2 : 1 - 0.08 * Math.exp(-(T - FLAP) / 0.12) * Math.abs(Math.sin((T - FLAP) * 18))
  // Folding as they come in: the jungle first, then the board claps shut on its beat.
  const fold = 1 - clamp01((T - (SHUT - 0.34)) / 0.34) ** 2
  const flapFold = 1 - inout((T - (SHUT - 0.55)) / 0.25)
  const open = T >= SHUT ? 0 : Math.min(openUp, fold)
  const flap = T >= SHUT ? 0 : Math.min(flapUp, flapFold)
  const t = top(Math.min(T, SHUT))
  if (T < SHUT) return { x: t.x, y: t.y, tilt: t.tilt, open, flap, front: true }
  // Off his top and onto the shelf (the shelf is his height), coming to rest.
  const v = (top(SHUT + 0.01).x - top(SHUT - 0.01).x) / 0.02
  const x = hermite(t.x, v, BOOK_HOME, 0, REST - SHUT, (T - SHUT) / (REST - SHUT))
  return { x, y: CASE.low, tilt: 0, open: 0, flap: 0, front: T < REST }
}

/* ------------------------------------------------------------------ drawing */

const px = (p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0) => p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, r * k)

/** How grey the yard is: greyed with the sky through the loss, back with the waltz. */
const greyAt = (T: number): number => smooth(T, B, B + 2) * (1 - smooth(T, 95, 101))
/** The wind: gusting through the loss, falling away as the waltz comes back. It blows out from the house. */
const windAt = (T: number): number => (0.55 + 0.25 * Math.sin(T * 0.8) + 0.15 * Math.sin(T * 2.1 + 1.3)) * (1 - 0.6 * smooth(T, 98.5, 101.5))
const grey = (hex: string, g: number): string => mixHex(hex, '#A9AEA8', 0.32 * g)

/** The big tree: a trunk and two limbs, and a canopy of soft masses, swaying a little. */
function tree(p: p5, c: Ctx, T: number, g: number, w: number): void {
  const { k, weight } = c
  const bark = grey(HOME.bark, g)
  const sway = (h: number) => -0.035 * w * h
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.9)
  p.fill(bark)
  const x = TREE.x
  p.beginShape()
  p.vertex((x - 0.17) * k, GROUND * k)
  p.bezierVertex((x - 0.1) * k, -0.7 * k, (x - 0.12) * k, -1.4 * k, (x - 0.02 + sway(0.6)) * k, -2.3 * k)
  p.vertex((x + 0.14 + sway(0.6)) * k, -2.3 * k)
  p.bezierVertex((x + 0.1) * k, -1.4 * k, (x + 0.1) * k, -0.7 * k, (x + 0.2) * k, GROUND * k)
  p.endShape(p.CLOSE)
  // Two limbs up into the leaves.
  p.noFill()
  p.strokeWeight(weight * 0.9)
  p.stroke(alpha(p, INK, 0.9))
  const limbs: [number, number][] = [[0.95, -0.5], [-0.7, -0.45]]
  for (const [wgt, col] of [[weight * 0.9 + 0.07 * k, alpha(p, INK, 0.9)], [0.05 * k, p.color(bark)]] as [number, p5.Color][]) {
    p.stroke(col)
    p.strokeWeight(wgt)
    for (const [dx, dy] of limbs) {
      p.beginShape()
      p.vertex(x * k, -1.55 * k)
      p.quadraticVertex((x + dx * 0.4) * k, (-1.7 + dy * 0.2) * k, (x + dx + sway(0.9)) * k, (-1.95 + dy) * k)
      p.endShape()
    }
  }
  // The canopy: shade first, the lit masses over it.
  const dark = grey(mixHex(HOME.leaf, INK, 0.18), g)
  const lit = grey(mixHex(HOME.leaf, HOME.grass, 0.45), g)
  const masses: [number, number, number, number, number][] = [
    [-1.3, 0.35, 0.78, 0.5, 0],
    [1.25, 0.35, 0.72, 0.46, 0],
    [0.1, 0.5, 1.05, 0.44, 0],
    [-0.55, -0.3, 0.98, 0.66, 0],
    [0.45, -0.1, 0.98, 0.64, 0],
    [-0.2, -0.85, 0.72, 0.46, 0],
    [0.95, -0.62, 0.62, 0.42, 0],
    [-1.05, 0.12, 0.6, 0.38, 1],
    [-0.35, -0.55, 0.66, 0.42, 1],
    [0.55, -0.42, 0.62, 0.4, 1],
    [1.05, 0.1, 0.5, 0.32, 1],
    [-0.05, 0.1, 0.62, 0.34, 1],
  ]
  p.noStroke()
  for (const [dx, dy, rx, ry, l] of masses) {
    const s = sway(1.2 + dy * -0.3) + 0.012 * Math.sin(T * 1.3 + dx * 3)
    p.fill(l ? lit : dark)
    p.ellipse((TREE.cx + dx + s) * k, (TREE.cy + dy - (l ? 0.05 : 0)) * k, 2 * rx * k, 2 * ry * k)
  }
}

/** The tree's old stump, her seat: sawn flat, its bark, a root or two flaring into the grass. */
function stump(p: p5, c: Ctx, g: number): void {
  const { k, weight } = c
  const { x, w, top } = STUMP
  const bark = grey(mixHex(HOME.bark, HOME.woodDark, 0.3), g)
  p.stroke(alpha(p, INK, 0.95))
  p.strokeWeight(weight * 0.85)
  p.fill(bark)
  p.beginShape()
  p.vertex((x - w / 2 - 0.1) * k, GROUND * k)
  p.bezierVertex((x - w / 2 - 0.03) * k, (GROUND - 0.04) * k, (x - w / 2 - 0.005) * k, (GROUND - 0.1) * k, (x - w / 2) * k, (GROUND - 0.2) * k)
  p.vertex((x - w / 2 + 0.01) * k, top * k)
  p.vertex((x + w / 2 - 0.01) * k, top * k)
  p.vertex((x + w / 2) * k, (GROUND - 0.2) * k)
  p.bezierVertex((x + w / 2 + 0.01) * k, (GROUND - 0.1) * k, (x + w / 2 + 0.05) * k, (GROUND - 0.04) * k, (x + w / 2 + 0.13) * k, GROUND * k)
  p.endShape(p.CLOSE)
  // The sawn face, pale, seen nearly edge on; and the bark's furrows.
  p.fill(grey(mixHex(HOME.wood, HOME.trim, 0.35), g))
  px(p, k, x - w / 2 - 0.005, top - 0.035, x + w / 2 + 0.005, top + 0.012, 0.012)
  p.stroke(alpha(p, INK, 0.3))
  p.strokeWeight(weight * 0.5)
  for (const f of [-0.14, 0.02, 0.15]) p.line((x + f) * k, (top + 0.07) * k, (x + f + 0.015) * k, (GROUND - 0.06) * k)
}

/** The line and the sheet on it, billowing out from the house on the wind. */
function sheet(p: p5, c: Ctx, T: number, w: number): void {
  const { k, weight } = c
  const [[ax, ay], [bx, by]] = LINE
  const sag = 0.1
  const lineY = (x: number) => {
    const u = (x - ax) / (bx - ax)
    return ay + (by - ay) * u + sag * 4 * u * (1 - u)
  }
  p.noFill()
  p.stroke(alpha(p, INK, 0.7))
  p.strokeWeight(weight * 0.55)
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const x = ax + ((bx - ax) * i) / 16
    p.vertex(x * k, lineY(x) * k)
  }
  p.endShape()
  const { x0, x1, drop } = SHEET
  const y0 = lineY(x0)
  const y1 = lineY(x1)
  const b = -(0.1 * w + 0.035 * Math.sin(T * 2.3) + 0.02 * Math.sin(T * 3.7 + 1))
  const lift = 0.06 * w
  const bl: Pt = [x0 + b * 1.1, y0 + drop - lift]
  const br: Pt = [x1 + b * 0.8, y1 + drop - lift * 0.6]
  const wave = 0.03 * Math.sin(T * 2.9)
  p.stroke(alpha(p, INK, 0.75))
  p.strokeWeight(weight * 0.6)
  p.fill(HOME.trim)
  p.beginShape()
  p.vertex(x0 * k, y0 * k)
  p.vertex(x1 * k, y1 * k)
  p.bezierVertex((x1 + b * 0.2) * k, (y1 + drop * 0.35) * k, (br[0] - b * 0.3) * k, (br[1] - drop * 0.3) * k, br[0] * k, br[1] * k)
  p.bezierVertex((br[0] * 0.66 + bl[0] * 0.34) * k, (br[1] + wave) * k, (br[0] * 0.33 + bl[0] * 0.67) * k, (bl[1] - wave) * k, bl[0] * k, bl[1] * k)
  p.bezierVertex((bl[0] - b * 0.4) * k, (bl[1] - drop * 0.3) * k, (x0 + b * 0.25) * k, (y0 + drop * 0.35) * k, x0 * k, y0 * k)
  p.endShape(p.CLOSE)
  // A soft fold down it, and the two pegs.
  p.noStroke()
  p.fill(alpha(p, mixHex(HOME.trim, INK, 0.25), 0.25))
  const mx = (x0 + x1) / 2
  p.beginShape()
  p.vertex((mx - 0.04) * k, (lineY(mx) + 0.02) * k)
  p.bezierVertex((mx + b * 0.3) * k, (lineY(mx) + drop * 0.4) * k, (mx + b * 0.8) * k, (lineY(mx) + drop * 0.7) * k, (mx + b * 0.95 - 0.05) * k, (lineY(mx) + drop - lift * 0.8) * k)
  p.vertex((mx + b * 0.95 + 0.05) * k, (lineY(mx) + drop - lift * 0.8) * k)
  p.bezierVertex((mx + b * 0.8 + 0.06) * k, (lineY(mx) + drop * 0.7) * k, (mx + b * 0.3 + 0.05) * k, (lineY(mx) + drop * 0.4) * k, (mx + 0.04) * k, (lineY(mx) + 0.02) * k)
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.6)
  p.fill(HOME.wood)
  for (const x of [x0 + 0.06, x1 - 0.06]) px(p, k, x - 0.018, lineY(x) - 0.05, x + 0.018, lineY(x) + 0.05, 0.008)
}

/** Tufts of grass along the yard, leaning out from the house on the wind. */
function grass(p: p5, c: Ctx, T: number, g: number, w: number): void {
  const { k } = c
  p.noStroke()
  p.fill(grey(mixHex(HOME.grass, HOME.leaf, 0.45), g))
  for (let i = 0; i < 26; i++) {
    const x = -8.4 + i * 0.27 + (((i * 7919) % 13) / 13) * 0.12
    if (x > INSIDE.backWall[0] - 0.12) break
    const h0 = 0.07 + (((i * 104729) % 7) / 7) * 0.06
    for (let j = -1; j <= 1; j++) {
      const bx = x + j * 0.028
      const lean = -(0.05 * w + 0.012 * Math.sin(T * 2.4 + i)) * (1 + 0.3 * j) - j * 0.025
      const h = h0 * (1 - 0.25 * Math.abs(j))
      p.triangle((bx - 0.013) * k, GROUND * k, (bx + 0.013) * k, GROUND * k, (bx + lean) * k, (GROUND - h) * k)
    }
  }
}

/** The screen door's leaf, seen as it swings: edge on when shut, its face as it opens (behind whoever goes through). */
function door(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const th = doorAt(T)
  const s = Math.sin(th)
  const span = DOOR.w * Math.abs(s)
  const edge = DOOR.t * Math.abs(Math.cos(th))
  const frame = HOME.pink
  const y0 = DOOR.top
  const y1 = GROUND - 0.015
  p.stroke(alpha(p, INK, 1))
  p.strokeWeight(weight * 0.8)
  if (span < 0.03) {
    p.fill(frame)
    px(p, k, DOOR.x - DOOR.t / 2, y0, DOOR.x + DOOR.t / 2, y1, 0.01)
    p.fill(INK)
    p.noStroke()
    px(p, k, DOOR.x - 0.012, -1.02, DOOR.x + 0.012, -0.9)
    return
  }
  const dir = s > 0 ? -1 : 1
  const a = DOOR.x
  const b = DOOR.x + dir * span
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const stile = 0.075 * Math.abs(s)
  // The mesh, a grey haze in the frame.
  p.noStroke()
  p.fill(alpha(p, mixHex(INK, HOME.glass, 0.45), 0.28))
  px(p, k, lo + stile, y0 + 0.08, hi - stile, -0.5)
  p.stroke(alpha(p, INK, 1))
  p.fill(frame)
  // The stiles, the rails, the kick panel.
  px(p, k, lo, y0, lo + stile, y1)
  px(p, k, hi - stile, y0, hi, y1)
  px(p, k, lo, y0, hi, y0 + 0.08)
  px(p, k, lo, -1.0, hi, -0.93)
  px(p, k, lo, -0.5, hi, y1)
  // The free edge's thickness, and a handle near it.
  p.fill(mixHex(frame, INK, 0.25))
  if (edge > 0.004) px(p, k, dir < 0 ? b - edge : b, y0, dir < 0 ? b : b + edge, y1)
  p.fill(INK)
  p.noStroke()
  const hx = b - dir * (stile + 0.03 * Math.abs(s))
  px(p, k, hx - 0.012, -1.03, hx + 0.012, -0.9)
}

/** The bookcase by the back door, rocking on its far foot when he leans into it. */
function bookcase(p: p5, c: Ctx, T: number, age: number): void {
  const { k, weight } = c
  const { x0, x1, top: y0, mid, low } = CASE
  p.push()
  p.translate(x1 * k, GROUND * k)
  p.rotate(rockAt(T))
  p.translate(-x1 * k, -GROUND * k)
  const wood = mixHex(HOME.wood, HOME.woodDark, 0.15 + age * 0.3)
  p.stroke(alpha(p, INK, 1))
  p.strokeWeight(weight * 0.85)
  p.fill(wood)
  px(p, k, x0, y0, x1, GROUND, 0.012)
  p.fill(mixHex(HOME.woodDark, INK, 0.2))
  px(p, k, x0 + 0.045, y0 + 0.05, x1 - 0.045, low)
  // The books on the middle shelf: standing, one leaning.
  const colours = [HOME.pink, mixHex(HOME.siding, INK, 0.25), HOME.yellow, HOME.roof, mixHex(HOME.paper, HOME.woodDark, 0.35), HOME.pink, mixHex(HOME.sky, INK, 0.2), HOME.yellow, HOME.roof]
  const widths = [0.06, 0.05, 0.075, 0.045, 0.065, 0.05, 0.07, 0.05, 0.06]
  const heights = [0.22, 0.19, 0.24, 0.2, 0.17, 0.23, 0.2, 0.18, 0.21]
  let bx = x0 + 0.05
  p.strokeWeight(weight * 0.55)
  for (let i = 0; i < widths.length; i++) {
    if (bx + widths[i] > x1 - 0.12) break
    p.fill(mixHex(colours[i], '#A9AEA8', age * 0.3))
    px(p, k, bx, mid - heights[i], bx + widths[i], mid, 0.008)
    bx += widths[i] + 0.004
  }
  p.push()
  p.translate(bx * k, mid * k)
  p.rotate(0.32)
  p.fill(mixHex(HOME.siding, INK, 0.1))
  px(p, k, 0, -0.2, 0.055, 0, 0.008)
  p.pop()
  // The shelves and the plinth, in front of what stands on them.
  p.strokeWeight(weight * 0.8)
  p.fill(wood)
  px(p, k, x0, mid, x1, mid + 0.035)
  px(p, k, x0, low, x1, low + 0.035)
  px(p, k, x0 - 0.02, y0 - 0.03, x1 + 0.02, y0 + 0.02, 0.01)
  p.pop()
}

interface YardState {
  begin: number
}

function drawBookAt(p: p5, c: Ctx, b: BookAt, age: number): void {
  drawBook(p, c.k, c.weight, b.x, b.y, { open: b.open, flap: b.flap, tilt: b.tilt, age })
}

export const yard = part<YardState>(
  {
    name: 'yard',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      const { k } = c
      const g = greyAt(T)
      const w = windAt(T)
      p.push()
      p.translate(OX * k, 0)
      p.rectMode(p.CORNER)
      tree(p, c, T, g, w)
      stump(p, c, g)
      grass(p, c, T, g, w)
      sheet(p, c, T, w)
      bookcase(p, c, T, 0.12)
      const b = bookAt(T)
      if (!b.front) drawBookAt(p, c, b, 0.15)
      door(p, c, T)
      p.pop()
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      const b = bookAt(T)
      if (!b.front) return
      p.push()
      p.translate(OX * c.k, 0)
      p.rectMode(p.CORNER)
      drawBookAt(p, c, b, 0.15)
      p.pop()
    },
  },
  (slot) => {
    const knots = [86.0, 86.639, 87.3, 88.3, 88.78, NUDGE, 89.95, PUSH_OUT, 92.3, 94.348, 98.836, C_GO]
    const segs = laneOf((T) => [at(carlX(T)), 0], slot.begin, slot.end, knots, 60)
    const her = (T: number): Companion => {
      const [x, y] = ellie(T)
      return { x: at(x), y }
    }
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: (T) => carlPose(T) }]
    return {
      cells: box(at(-8.5), -5, at(1.3), 1),
      exit: [at(0.8), 0] as Pt,
      lane: { segs, fire: NUDGE - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: her }],
      pose,
    }
  },
  () => [
    // From the doctor's framing, a slow drift to him at the door; in on him for the book.
    { t: 87.4, cells: 4.3, hold: [at(-1.7), -0.95], w: 1 },
    { t: 89.6, cells: 3.85, hold: [at(-1.1), -0.95], w: 1 },
    // Out with him, and along as he walks out to her.
    { t: 92.4, cells: 4.05, hold: [at(-1.75), -1.0], w: 1 },
    { t: 95.8, cells: 4.0, hold: [at(-2.2), -1.02], w: 1 },
    // The two of them, closer, and closer again for the book.
    { t: 98.9, cells: 3.5, hold: [at(-2.95), -0.98], w: 1 },
    { t: 100.7, cells: 3.2, hold: [at(-2.95), -1.0], w: 1 },
    // After them, home.
    { t: 101.6, cells: 3.5, hold: [at(-2.4), -0.95], w: 1 },
    { t: 102.5, cells: 3.9, hold: [at(-1.1), -0.92], w: 1 },
    { t: E, cells: 4.3, hold: [at(0.6), -0.9], w: 1 },
  ],
)

