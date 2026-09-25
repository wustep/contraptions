import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, mixHex, type Pt } from '../../../../../parts'
import { alpha } from '../kit'
import { HOME } from '../worlds'
import { lantern, propEye, ROOM, table, type Pen } from './set'
import {
  ARM,
  APPEAR,
  armAt,
  B,
  jawsAt,
  DESK,
  EYE_AT,
  eyeScale,
  eyeSwing,
  GIFT,
  gloveAt,
  HAMMER,
  headAt,
  HINGE,
  KARAOKE,
  LANTERNS,
  lanternSway,
  SPRING_FOOT,
  STACKS,
  STEAM,
  swingAt,
  TABLE,
  TRAP,
  type ArmPose,
} from './kindness-plan'

/**
 * The party corner's drawings: the new year party set up and waiting (the table with its red cloth, the dumpling
 * steamers, the karaoke machine, paper lanterns, a gift), the back office with the taxes, and Jobu's jumpers (the
 * glove in the gift box, the steel trap, the mallet, the arm). All in the room's cells, all from show time.
 */

/* ------------------------------------------------------------------ colours */

const BAMBOO = mixHex(HOME.wood, HOME.paper, 0.38)
const BAMBOO_DEEP = mixHex(HOME.wood, HOME.steelDark, 0.25)
const TAN = mixHex(mixHex(HOME.wood, HOME.butter, 0.45), HOME.paper, 0.15)
const TAN_DEEP = mixHex(HOME.wood, HOME.butter, 0.2)
const KARAOKE_BODY = mixHex(HOME.night, HOME.denim, 0.55)
const CARDBOARD = mixHex(HOME.wood, HOME.paper, 0.2)
const IRON = mixHex(HOME.steelDark, HOME.night, 0.35)
const TAPE = HOME.paper

/** A faint ink line: the ink at `a` alpha. */
function faint(pen: Pen, a: number, weight: number): void {
  const { p } = pen
  p.stroke(alpha(p, pen.ink, a))
  p.strokeWeight(weight)
  p.noFill()
}

/** A shape through points, closed. */
function poly(pen: Pen, pts: Pt[]): void {
  const { p, k } = pen
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the party: lanterns, table, steamers, karaoke */

/** The paper lanterns on their cords from the ceiling, each swinging about its hook in the ceiling. */
export function drawLanterns(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  LANTERNS.forEach((ln, i) => {
    const a = lanternSway(i, t)
    const top: Pt = [ln.x, ROOM.ceiling]
    const hook: Pt = [ln.x + ln.cord * Math.sin(a), ROOM.ceiling + ln.cord * Math.cos(a)]
    outline(p, ink, w * 0.5)
    p.line(top[0] * k, top[1] * k, hook[0] * k, hook[1] * k)
    lantern(pen, hook[0], hook[1], { open: 1, lit: 0, sway: -a, size: ln.size })
  })
}

/** The party table: its folding frame, a red cloth with a gold hem over it. */
export function drawTable(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x0, x1, top } = TABLE
  table(pen, x0, x1, top)
  // The cloth: hangs a little over each end and down the front, with a gold band near its hem.
  const drop = 0.34
  solid(p, ink, w, HOME.red)
  p.beginShape()
  p.vertex((x0 - 0.05) * k, (top - 0.005) * k)
  p.vertex((x1 + 0.05) * k, (top - 0.005) * k)
  p.vertex((x1 + 0.06) * k, (top + drop) * k)
  for (let i = 0; i <= 12; i++) {
    const x = x1 + 0.06 - ((x1 - x0 + 0.12) * i) / 12
    p.vertex(x * k, (top + drop + (i % 2 === 0 ? 0 : 0.03)) * k)
  }
  p.vertex((x0 - 0.06) * k, (top + drop) * k)
  p.endShape(p.CLOSE)
  outline(p, HOME.gold, Math.max(1, w * 0.9))
  p.line((x0 - 0.05) * k, (top + drop - 0.07) * k, (x1 + 0.05) * k, (top + drop - 0.07) * k)
  // A soft fold or two.
  faint(pen, 0.35, w * 0.4)
  for (const fx of [x0 + 0.9, x0 + 2.1]) p.line(fx * k, (top + 0.04) * k, (fx - 0.03) * k, (top + drop - 0.1) * k)
}

/** One steamer basket from (x0, foot) up: bamboo, two bands; `lid` for the top one. */
function steamer(pen: Pen, x0: number, foot: number, lid: boolean): void {
  const { p, k, ink, w } = pen
  const { w: W, h: H } = STEAM
  solid(p, ink, w * 0.8, BAMBOO)
  p.rect((x0 + W / 2) * k, (foot - H / 2) * k, W * k, H * k, 0.03 * k)
  outline(p, BAMBOO_DEEP, Math.max(1, w * 0.45))
  p.line((x0 + 0.04) * k, (foot - H * 0.3) * k, (x0 + W - 0.04) * k, (foot - H * 0.3) * k)
  if (lid) {
    solid(p, ink, w * 0.6, mixHex(BAMBOO, HOME.paper, 0.3))
    p.rect((x0 + W / 2) * k, (foot - H + 0.025) * k, (W - 0.02) * k, 0.05 * k, 0.02 * k)
  } else {
    p.line((x0 + 0.04) * k, (foot - H * 0.72) * k, (x0 + W - 0.04) * k, (foot - H * 0.72) * k)
  }
}

/** The dumpling steamers: three stacks stepping down to the right, the steps she comes down at the end. */
export function drawSteamers(pen: Pen): void {
  for (const st of STACKS) for (let i = 0; i < st.n; i++) steamer(pen, st.x0, TABLE.top - i * STEAM.h, i === st.n - 1)
}

/** The karaoke machine on the table's near end: a speaker box with its grille, a little screen, a microphone. */
export function drawKaraoke(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x0, x1, h } = KARAOKE
  const top = TABLE.top - h
  solid(p, ink, w, KARAOKE_BODY)
  p.rect(((x0 + x1) / 2) * k, (TABLE.top - h / 2) * k, (x1 - x0) * k, h * k, 0.05 * k)
  // Its handle.
  outline(p, ink, w * 0.9)
  p.arc(((x0 + x1) / 2) * k, top * k, 0.34 * k, 0.16 * k, Math.PI, Math.PI * 2)
  // The speaker.
  solid(p, ink, w * 0.7, HOME.steel)
  p.circle((x0 + 0.2) * k, (TABLE.top - h * 0.45) * k, 0.26 * k)
  solid(p, ink, w * 0.5, HOME.steelDark)
  p.circle((x0 + 0.2) * k, (TABLE.top - h * 0.45) * k, 0.1 * k)
  // The screen, dark, with a line of colour across it.
  solid(p, ink, w * 0.6, HOME.glassDeep)
  p.rect((x1 - 0.17) * k, (top + 0.12) * k, 0.2 * k, 0.12 * k, 0.015 * k)
  p.noStroke()
  p.fill(HOME.rose)
  p.rect((x1 - 0.19) * k, (top + 0.14) * k, 0.1 * k, 0.018 * k)
  // Two knobs.
  solid(p, ink, w * 0.5, HOME.steel)
  for (const kx of [x1 - 0.22, x1 - 0.12]) p.circle(kx * k, (TABLE.top - 0.1) * k, 0.045 * k)
  // The microphone, stood in its clip on the side.
  solid(p, ink, w * 0.6, HOME.steelDark)
  p.rect((x1 + 0.035) * k, (TABLE.top - 0.2) * k, 0.045 * k, 0.26 * k, 0.015 * k)
  solid(p, ink, w * 0.6, HOME.steel)
  p.ellipse((x1 + 0.035) * k, (TABLE.top - 0.36) * k, 0.1 * k, 0.11 * k)
}

/* ------------------------------------------------------------------ the back office: the taxes */

/** The desk against the far wall: the adding machine and its tape, receipts, the audit letter, a lamp, a chair. */
export function drawDesk(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x0, x1, top } = DESK
  // The wall calendar over it: a page of little squares, one ringed in red.
  solid(p, ink, w * 0.7, HOME.paper)
  p.rect(37.55 * k, -2.75 * k, 0.56 * k, 0.66 * k, 0.02 * k)
  solid(p, ink, w * 0.5, HOME.red)
  p.rect(37.55 * k, -3.02 * k, 0.56 * k, 0.12 * k)
  faint(pen, 0.45, w * 0.35)
  for (let i = 1; i < 4; i++) p.line((37.27 + 0.14 * i) * k, -2.94 * k, (37.27 + 0.14 * i) * k, -2.44 * k)
  for (let j = 1; j < 4; j++) p.line(37.29 * k, (-2.94 + 0.125 * j) * k, 37.81 * k, (-2.94 + 0.125 * j) * k)
  outline(p, HOME.red, Math.max(1, w * 0.7))
  p.circle(37.62 * k, -2.56 * k, 0.13 * k)
  // File boxes under it.
  solid(p, ink, w * 0.8, CARDBOARD)
  p.rect(37.05 * k, (FLOOR - 0.18) * k, 0.42 * k, 0.36 * k, 0.02 * k)
  p.rect(37.4 * k, (FLOOR - 0.14) * k, 0.3 * k, 0.28 * k, 0.02 * k)
  outline(p, ink, w * 0.5)
  p.line(36.95 * k, (FLOOR - 0.28) * k, 37.15 * k, (FLOOR - 0.28) * k)
  // The desk: a top, a leg at the near end, a pedestal of drawers at the far end.
  solid(p, ink, w, HOME.wood)
  p.rect((x0 + 0.07) * k, ((top + FLOOR) / 2) * k, 0.07 * k, (FLOOR - top) * k)
  p.rect((x1 - 0.28) * k, ((top + FLOOR) / 2) * k, 0.52 * k, (FLOOR - top) * k, 0.02 * k)
  p.rect(((x0 + x1) / 2) * k, (top + 0.035) * k, (x1 - x0 + 0.08) * k, 0.07 * k, 0.02 * k)
  outline(p, ink, w * 0.5)
  for (let i = 1; i < 3; i++) p.line((x1 - 0.52) * k, (top + 0.07 + ((FLOOR - top) * i) / 3) * k, (x1 - 0.04) * k, (top + 0.07 + ((FLOOR - top) * i) / 3) * k)
  solid(p, ink, w * 0.5, HOME.steel)
  for (let i = 0; i < 3; i++) p.rect((x1 - 0.28) * k, (top + 0.22 + ((FLOOR - top) * i) / 3) * k, 0.12 * k, 0.03 * k, 0.01 * k)
  // The adding machine, its paper roll, and the tape run out over the desk's edge.
  const ax = 36.98
  solid(p, ink, w * 0.8, HOME.enamel)
  poly(pen, [
    [ax - 0.17, top],
    [ax + 0.2, top],
    [ax + 0.16, top - 0.2],
    [ax - 0.13, top - 0.12],
  ])
  solid(p, ink, w * 0.5, HOME.steelDark)
  for (let i = 0; i < 3; i++) p.rect((ax - 0.06 + i * 0.08) * k, (top - 0.09 - i * 0.02) * k, 0.05 * k, 0.03 * k, 0.01 * k)
  solid(p, ink, w * 0.6, TAPE)
  p.circle((ax + 0.12) * k, (top - 0.27) * k, 0.12 * k)
  outline(p, ink, w * 0.55)
  p.fill(TAPE)
  p.beginShape()
  p.vertex((ax + 0.14) * k, (top - 0.22) * k)
  p.bezierVertex((ax - 0.3) * k, (top - 0.35) * k, (ax - 0.32) * k, (top + 0.1) * k, (x0 - 0.02) * k, (top + 0.16) * k)
  p.vertex((x0 - 0.02) * k, (top + 0.5) * k)
  p.vertex((x0 + 0.04) * k, (top + 0.5) * k)
  p.bezierVertex((x0 + 0.04) * k, (top + 0.18) * k, (ax - 0.22) * k, (top - 0.25) * k, (ax + 0.1) * k, (top - 0.2) * k)
  p.endShape(p.CLOSE)
  // The receipts, stacked and clipped.
  for (let i = 0; i < 5; i++) {
    solid(p, ink, w * 0.45, HOME.paper)
    p.rect((37.52 + 0.015 * ((i * 7) % 3)) * k, (top - 0.02 - i * 0.035) * k, 0.3 * k, 0.03 * k)
  }
  solid(p, ink, w * 0.5, HOME.steelDark)
  p.rect(37.52 * k, (top - 0.2) * k, 0.07 * k, 0.05 * k)
  // The audit letter, propped against the lamp, with its red seal.
  p.push()
  p.translate(37.86 * k, (top - 0.17) * k)
  p.rotate(0.12)
  solid(p, ink, w * 0.55, HOME.paper)
  p.rect(0, 0, 0.2 * k, 0.32 * k)
  faint(pen, 0.4, w * 0.3)
  for (let i = 0; i < 3; i++) p.line(-0.07 * k, (-0.09 + i * 0.05) * k, 0.07 * k, (-0.09 + i * 0.05) * k)
  solid(p, ink, w * 0.4, HOME.red)
  p.circle(0.04 * k, 0.09 * k, 0.07 * k)
  p.pop()
  // The desk lamp: a base, a stem, a green-glass-less shade in denim.
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.rect(38.1 * k, (top - 0.02) * k, 0.2 * k, 0.04 * k, 0.01 * k)
  outline(p, ink, w * 0.9)
  p.line(38.1 * k, (top - 0.04) * k, 38.1 * k, (top - 0.36) * k)
  solid(p, ink, w * 0.8, HOME.denim)
  p.arc(38.06 * k, (top - 0.34) * k, 0.36 * k, 0.2 * k, Math.PI, Math.PI * 2, p.CHORD)
  // The chair, pushed in.
  const cx = 37.2
  solid(p, ink, w * 0.8, IRON)
  p.rect(cx * k, (FLOOR - 0.56) * k, 0.46 * k, 0.07 * k, 0.03 * k)
  p.rect((cx - 0.21) * k, (FLOOR - 0.83) * k, 0.07 * k, 0.5 * k, 0.03 * k)
  outline(p, ink, w)
  p.line(cx * k, (FLOOR - 0.52) * k, cx * k, (FLOOR - 0.12) * k)
  p.line((cx - 0.22) * k, (FLOOR - 0.1) * k, (cx + 0.22) * k, (FLOOR - 0.1) * k)
  solid(p, ink, w * 0.6, HOME.steelDark)
  for (const s of [-1, 1]) p.circle((cx + s * 0.21) * k, (FLOOR - 0.045) * k, 0.07 * k)
}

/* ------------------------------------------------------------------ the gift, and the glove in it */

/** The gift box on the floor (without its lid, which is drawn on its own). */
export function drawGiftBox(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x, w: W, h: H } = GIFT
  solid(p, ink, w, HOME.red)
  p.rect(x * k, (FLOOR - H / 2) * k, W * k, H * k, 0.02 * k)
  p.noStroke()
  p.fill(HOME.gold)
  p.rect(x * k, (FLOOR - H / 2) * k, 0.08 * k, (H - 0.01) * k)
  outline(p, ink, w * 0.5)
  p.line((x - 0.04) * k, (FLOOR - H) * k, (x - 0.04) * k, FLOOR * k)
  p.line((x + 0.04) * k, (FLOOR - H) * k, (x + 0.04) * k, FLOOR * k)
}

/** The lid, with its ribbon and bow, at `at` turned `turn`. */
export function drawLid(pen: Pen, at: Pt, turn: number): void {
  const { p, k, ink, w } = pen
  const W = GIFT.w + 0.05
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(turn)
  solid(p, ink, w, mixHex(HOME.red, HOME.paper, 0.08))
  p.rect(0, 0, W * k, 0.1 * k, 0.02 * k)
  p.noStroke()
  p.fill(HOME.gold)
  p.rect(0, 0, 0.08 * k, 0.09 * k)
  // The bow: two loops and a knot.
  solid(p, ink, w * 0.7, HOME.gold)
  for (const s of [-1, 1]) {
    p.beginShape()
    p.vertex(0, -0.05 * k)
    p.bezierVertex(s * 0.05 * k, -0.2 * k, s * 0.2 * k, -0.2 * k, s * 0.14 * k, -0.07 * k)
    p.endShape(p.CLOSE)
  }
  p.circle(0, -0.06 * k, 0.05 * k)
  p.pop()
}

/** The spring the glove is on: a steel coil from its foot in the box to `end`. */
function coil(pen: Pen, from: Pt, to: Pt): void {
  const { p, k, ink, w } = pen
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const L = Math.hypot(dx, dy) || 1e-6
  const ux = dx / L
  const uy = dy / L
  const n = 11
  outline(p, ink, w * 1.1)
  p.beginShape()
  for (let i = 0; i <= n * 2; i++) {
    const f = i / (n * 2)
    const s = i === 0 || i === n * 2 ? 0 : i % 2 === 0 ? -1 : 1
    const x = from[0] + dx * f - uy * s * 0.06
    const y = from[1] + dy * f + ux * s * 0.06
    p.vertex(x * k, y * k)
  }
  p.endShape()
  outline(p, HOME.steel, Math.max(1, w * 0.5))
  p.beginShape()
  for (let i = 0; i <= n * 2; i++) {
    const f = i / (n * 2)
    const s = i === 0 || i === n * 2 ? 0 : i % 2 === 0 ? -1 : 1
    p.vertex((from[0] + dx * f - uy * s * 0.06) * k, (from[1] + dy * f + ux * s * 0.06) * k)
  }
  p.endShape()
}

/** A point of the glove's own frame (x forward from the cuff's end, y across) in the room's cells. */
function onGlove(g: { end: Pt; aim: number }, x: number, y: number): Pt {
  const c = Math.cos(g.aim)
  const sn = Math.sin(g.aim)
  return [g.end[0] + x * c - y * sn, g.end[1] + x * sn + y * c]
}

/** Where the glove's eye sits (on the back of the mitt), and its size. */
export function gloveEye(t: number): { at: Pt; r: number } {
  return { at: onGlove(gloveAt(t), 0.44, -0.1), r: 0.09 }
}

/** The boxing glove on its spring, if it is out: a laced white cuff, a tan leather mitt, its thumb; its eye from the touch. */
export function drawGlove(pen: Pen, t: number): void {
  const g = gloveAt(t)
  if (!g.out) return
  const { p, k, ink, w } = pen
  coil(pen, SPRING_FOOT, g.end)
  p.push()
  p.translate(g.end[0] * k, g.end[1] * k)
  p.rotate(g.aim)
  const V = (x: number, y: number) => p.vertex(x * k, y * k)
  const Bz = (a: number, b: number, c: number, d: number, e: number, f: number) => p.bezierVertex(a * k, b * k, c * k, d * k, e * k, f * k)
  // The cuff: white, laced up its back, a red band where it meets the mitt.
  solid(p, ink, w * 0.8, HOME.paper)
  p.rect(0.1 * k, 0, 0.21 * k, 0.23 * k, 0.03 * k)
  outline(p, ink, w * 0.45)
  for (let i = 0; i < 3; i++) {
    const x = 0.035 + i * 0.055
    p.line(x * k, -0.1 * k, (x + 0.04) * k, -0.02 * k)
    p.line((x + 0.04) * k, -0.1 * k, x * k, -0.02 * k)
  }
  solid(p, ink, w * 0.6, HOME.red)
  p.rect(0.22 * k, 0, 0.04 * k, 0.25 * k, 0.01 * k)
  // The mitt: long, round-knuckled, squashed on a touch.
  p.push()
  p.translate(0.24 * k, 0)
  p.scale(1 - 0.26 * g.squash, 1 + 0.16 * g.squash)
  solid(p, ink, w, TAN)
  p.beginShape()
  V(0, -0.12)
  Bz(0.04, -0.2, 0.2, -0.24, 0.3, -0.19)
  Bz(0.4, -0.15, 0.43, -0.07, 0.42, 0.01)
  Bz(0.41, 0.1, 0.34, 0.16, 0.22, 0.16)
  Bz(0.12, 0.16, 0.03, 0.15, 0, 0.12)
  p.endShape(p.CLOSE)
  // The thumb, a lobe along its near side, pointing forward.
  solid(p, ink, w * 0.8, TAN_DEEP)
  p.beginShape()
  V(0.04, 0.06)
  Bz(0.1, -0.01, 0.26, -0.02, 0.31, 0.04)
  Bz(0.34, 0.08, 0.3, 0.13, 0.24, 0.12)
  Bz(0.16, 0.11, 0.08, 0.12, 0.04, 0.06)
  p.endShape(p.CLOSE)
  // Its seam over the knuckles, and the shine on its back.
  outline(p, ink, w * 0.45)
  p.arc(0.3 * k, -0.02 * k, 0.16 * k, 0.28 * k, -Math.PI * 0.45, Math.PI * 0.05)
  p.stroke(alpha(p, HOME.paper, 0.5))
  p.strokeWeight(Math.max(1, w * 0.7))
  p.noFill()
  p.arc(0.2 * k, -0.06 * k, 0.26 * k, 0.2 * k, Math.PI * 1.1, Math.PI * 1.5)
  p.pop()
  p.pop()
  const sc = eyeScale(t, EYE_AT.glove)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.glove)
    const eye = gloveEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, e.swing - (g.aim + Math.PI / 2) * 0.15, e.lift)
  }
}

/* ------------------------------------------------------------------ the jaws */

/** One jaw, upright in its own frame (hinge at 0,0, reaching up), `side` -1 the near (left) one, 1 the far. */
function jaw(pen: Pen, side: number): void {
  const { p, k, ink, w } = pen
  const L = TRAP.jaw
  const n = 8
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const v = i / n
    const bow = 0.13 * Math.sin(Math.PI * v) + 0.02
    outer.push([side * (bow + 0.035), -L * v])
    inner.push([side * Math.max(0.004, bow - 0.035 - 0.07 * Math.sin(Math.PI * v)), -L * v])
  }
  solid(p, ink, w, IRON)
  p.beginShape()
  for (const [x, y] of outer) p.vertex(x * k, y * k)
  for (let i = inner.length - 1; i >= 0; i--) p.vertex(inner[i][0] * k, inner[i][1] * k)
  p.endShape(p.CLOSE)
  // Its teeth, along the inner edge.
  solid(p, ink, w * 0.5, HOME.steel)
  for (let i = 1; i < n; i++) {
    const [x, y] = inner[i]
    const half = (L / n) * 0.42
    p.triangle(x * k, (y - half) * k, x * k, (y + half) * k, (x - side * 0.055) * k, (y + (side > 0 ? half * 0.3 : -half * 0.3)) * k)
  }
  p.stroke(alpha(p, HOME.steel, 0.8))
  p.strokeWeight(Math.max(1, w * 0.5))
  p.noFill()
  p.beginShape()
  for (let i = 1; i < n; i++) p.vertex((outer[i][0] - side * 0.025) * k, outer[i][1] * k)
  p.endShape()
}

/** The steel trap: a base plate with its springs and pan, two toothed jaws on one hinge, and its eye from the snap. */
export function drawTrap(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x0, x1, plate } = TRAP
  const j = jawsAt(t)
  // The base plate and its two leaf springs.
  solid(p, ink, w, IRON)
  p.rect(((x0 + x1) / 2) * k, (FLOOR - plate / 2) * k, (x1 - x0) * k, plate * k, 0.015 * k)
  outline(p, ink, w * 0.9)
  for (const s of [-1, 1]) {
    const sx = HINGE[0] + s * 0.3
    p.arc(sx * k, (FLOOR - plate) * k, 0.18 * k, 0.1 * k, Math.PI, Math.PI * 2)
  }
  // The pan: a disc on its post, dipping as she drops on it.
  const dip = t >= B(127) ? 0.015 : 0
  solid(p, ink, w * 0.6, HOME.steel)
  p.ellipse(HINGE[0] * k, (FLOOR - plate - 0.02 + dip) * k, 0.26 * k, 0.035 * k)
  // The jaws, on their hinge; the whole trap bobs on it once it has shut.
  p.push()
  p.translate(HINGE[0] * k, HINGE[1] * k)
  p.rotate(j.sway)
  for (const side of [1, -1]) {
    p.push()
    p.rotate(side * j.open)
    jaw(pen, side)
    p.pop()
  }
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.circle(0, 0, 0.1 * k)
  p.pop()
  // Its eye, on the near jaw, high: shut and bobbing, it is a creature with a beak.
  const sc = eyeScale(t, EYE_AT.trap)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.trap)
    const eye = trapEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, e.swing + j.sway * 1.5, e.lift)
  }
}

/** Where the trap's eye sits (high on its near jaw), and its size. */
export function trapEye(t: number): { at: Pt; r: number } {
  const j = jawsAt(t)
  const a = j.sway - j.open
  const lx = -0.13
  const ly = -0.3
  return { at: [HINGE[0] + lx * Math.cos(a) - ly * Math.sin(a), HINGE[1] + lx * Math.sin(a) + ly * Math.cos(a)], r: 0.092 }
}

/* ------------------------------------------------------------------ the mallet */

export function drawHammer(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const [px, py] = HAMMER.pivot
  const phi = swingAt(t)
  const [hx, hy] = headAt(phi)
  // The bracket in the ceiling, the drop rod, the pivot.
  solid(p, ink, w * 0.8, HOME.steelDark)
  p.rect(px * k, (ROOM.ceiling + 0.04) * k, 0.34 * k, 0.08 * k, 0.01 * k)
  outline(p, ink, w * 1.1)
  p.line(px * k, ROOM.ceiling * k, px * k, py * k)
  // The handle.
  const ex = hx - Math.sin(phi) * HAMMER.headH * 0.5
  const ey = hy - Math.cos(phi) * HAMMER.headH * 0.5
  outline(p, ink, w * 2.2)
  p.line(px * k, py * k, ex * k, ey * k)
  outline(p, HOME.wood, Math.max(1, w * 1.2))
  p.line(px * k, py * k, ex * k, ey * k)
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.circle(px * k, py * k, 0.1 * k)
  // The head: a wooden mallet, banded with iron at its two faces.
  p.push()
  p.translate(hx * k, hy * k)
  p.rotate(-phi)
  solid(p, ink, w, HOME.wood)
  p.rect(0, 0, HAMMER.headW * k, HAMMER.headH * k, 0.05 * k)
  solid(p, ink, w * 0.8, IRON)
  for (const s of [-1, 1]) p.rect(s * (HAMMER.headW / 2 - 0.04) * k, 0, 0.08 * k, (HAMMER.headH + 0.02) * k, 0.02 * k)
  faint(pen, 0.35, w * 0.4)
  p.line(-0.12 * k, -0.07 * k, 0.12 * k, -0.07 * k)
  p.pop()
  // Its eye, on the head's side, looking out.
  const sc = eyeScale(t, EYE_AT.hammer)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.hammer)
    const eye = hammerEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, e.swing + phi * 0.8, e.lift)
  }
}

/** Where the mallet's eye sits (on its head's side), and its size. */
export function hammerEye(t: number): { at: Pt; r: number } {
  const phi = swingAt(t)
  const [hx, hy] = headAt(phi)
  return { at: [hx + 0.02 * Math.cos(phi), hy - 0.02], r: 0.118 }
}

/* ------------------------------------------------------------------ the arm */

interface ArmGeom {
  /** The axis's angle from the mount, and the tongs' reach along it. */
  a: number
  reach: number
  /** Where the tongs end and the claw's block is. */
  end: Pt
}

function armGeom(pose: ArmPose): ArmGeom {
  const [mx, my] = ARM.mount
  const dx = pose.cup[0] - mx
  const dy = pose.cup[1] - my
  const d = Math.hypot(dx, dy)
  const a = Math.atan2(dy, dx)
  const reach = Math.max(0.3, d - ARM.palm)
  return { a, reach, end: [mx + Math.cos(a) * reach, my + Math.sin(a) * reach] }
}

/** A finger of the claw, in the arm's own frame (x along the arm from the block, y across): `side` -1 upper, 1 lower. */
function finger(pen: Pen, reach: number, side: number, open: number): void {
  const { p, k, ink, w } = pen
  const cx = reach + ARM.palm
  const rr = R + 0.045
  p.push()
  // Hinged at its root on the block, swung open outward.
  const root: Pt = [reach + 0.05, side * 0.07]
  p.translate(root[0] * k, root[1] * k)
  p.rotate(side * -open * 0.85)
  p.translate(-root[0] * k, -root[1] * k)
  const pts: Pt[] = []
  const a0 = side * (Math.PI * 0.86)
  const a1 = side * (Math.PI * 0.12)
  for (let i = 0; i <= 10; i++) {
    const a = a0 + ((a1 - a0) * i) / 10
    pts.push([cx + Math.cos(a) * rr, Math.sin(a) * rr])
  }
  outline(p, ink, w * 2.2)
  p.beginShape()
  p.vertex(root[0] * k, root[1] * k)
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
  outline(p, HOME.steel, Math.max(1, w * 1.1))
  p.beginShape()
  p.vertex(root[0] * k, root[1] * k)
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
  // A rubber tip.
  const [tx, ty] = pts[pts.length - 1]
  solid(p, ink, w * 0.6, IRON)
  p.circle(tx * k, ty * k, 0.05 * k)
  p.pop()
}

/** The arm: its wall mount, the lazy tongs, the claw's block and its back finger (and its front one, if empty). */
export function drawArm(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const pose = armAt(t)
  const g = armGeom(pose)
  const [mx, my] = ARM.mount
  const n = ARM.units
  const u = g.reach / n
  const h = Math.sqrt(Math.max(0, ARM.link * ARM.link - u * u)) / 2
  // The mount: a slotted steel plate on the wall.
  solid(p, ink, w, HOME.steelDark)
  p.rect((mx + 0.06) * k, my * k, 0.16 * k, (2 * h + 0.2) * k, 0.03 * k)
  outline(p, ink, w * 0.5)
  p.line((mx + 0.06) * k, (my - h) * k, (mx + 0.06) * k, (my + h) * k)
  p.push()
  p.translate(mx * k, my * k)
  p.rotate(g.a)
  // The tongs: two runs of links crossing, pinned at every crossing.
  for (const pass of [0, 1]) {
    if (pass === 0) outline(p, ink, w * 2.1)
    else outline(p, HOME.steel, Math.max(1, w * 1.0))
    for (let i = 0; i < n; i++) {
      p.line(i * u * k, -h * k, (i + 1) * u * k, h * k)
      p.line(i * u * k, h * k, (i + 1) * u * k, -h * k)
    }
  }
  solid(p, ink, w * 0.5, HOME.steelDark)
  for (let i = 0; i <= n; i++) {
    p.circle(i * u * k, -h * k, 0.045 * k)
    p.circle(i * u * k, h * k, 0.045 * k)
    if (i < n) p.circle((i + 0.5) * u * k, 0, 0.045 * k)
  }
  // The claw's block.
  solid(p, ink, w, IRON)
  p.rect((g.reach + 0.02) * k, 0, 0.1 * k, Math.max(0.16, 2 * h * 0.6) * k, 0.02 * k)
  outline(p, ink, w * 0.9)
  p.line(g.reach * k, -h * k, (g.reach + 0.02) * k, -0.06 * k)
  p.line(g.reach * k, h * k, (g.reach + 0.02) * k, 0.06 * k)
  // The lower finger (behind her), and the upper one while there is nothing in the claw.
  finger(pen, g.reach, 1, pose.open)
  if (!pose.holding) finger(pen, g.reach, -1, pose.open)
  p.pop()
  // Its eye, on the top of the block.
  const sc = eyeScale(t, EYE_AT.claw)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.claw)
    const eye = clawEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, e.swing, e.lift)
  }
}

/** Where the claw's eye sits (on top of its block), and its size. */
export function clawEye(t: number): { at: Pt; r: number } {
  const g = armGeom(armAt(t))
  const up = g.a - Math.PI / 2
  const flip = Math.cos(g.a) < 0 ? -1 : 1
  return { at: [g.end[0] + Math.cos(g.a) * 0.03 + Math.cos(up) * 0.12 * flip, g.end[1] + Math.sin(g.a) * 0.03 + Math.sin(up) * 0.12 * flip], r: 0.1 }
}

/* ------------------------------------------------------------------ the eyes she gives them */

/** How long an eye takes to fly from her eye to the machine, landing on the beat. */
const FLIGHT = 0.22
const GIVEN: { at: number; target: (t: number) => { at: Pt; r: number } }[] = [
  { at: EYE_AT.glove, target: gloveEye },
  { at: EYE_AT.trap, target: trapEye },
  { at: EYE_AT.hammer, target: hammerEye },
  { at: EYE_AT.claw, target: clawEye },
]

/**
 * The eyes she gives: on each machine's beat a copy of her own googly eye pops off hers, flies in a quick arc,
 * turning, its pupil flapping round, and slaps onto the machine as it touches her. Drawn over her (the part's
 * `over`). Her eye (`fx.ts`) is centred on her ball, its white 0.6 of her radius.
 */
export function drawGivenEyes(pen: Pen, t: number, her: (t: number) => Pt): void {
  for (const g of GIVEN) {
    const u = t - (g.at - FLIGHT)
    if (u < 0 || u >= FLIGHT) continue
    const s = u / FLIGHT
    const from = her(g.at - FLIGHT)
    const to = g.target(g.at).at
    const d = Math.hypot(to[0] - from[0], to[1] - from[1])
    const f = 1 - (1 - s) * (1 - s) * (1 - 0.4 * s)
    const lift = (0.1 + 0.35 * d) * 4 * s * (1 - s)
    const x = from[0] + (to[0] - from[0]) * f
    const y = from[1] + (to[1] - from[1]) * f - lift
    // Peeled off hers at her eye's size, it swells to the machine's as it goes.
    const r0 = 0.6 * R
    const r = (r0 + (g.target(g.at).r - r0) * s) * (0.7 + 0.3 * Math.min(1, s / 0.2))
    propEye(pen, x, y, r, s * Math.PI * 2.6 + 0.5 * Math.sin(s * 19), 0.7 * Math.sin(Math.PI * s))
  }
}

/** The claw's upper finger, over her while she is in it. */
export function drawArmFront(pen: Pen, t: number): void {
  const pose = armAt(t)
  if (!pose.holding) return
  const g = armGeom(pose)
  const { p, k } = pen
  const [mx, my] = ARM.mount
  p.push()
  p.translate(mx * k, my * k)
  p.rotate(g.a)
  finger(pen, g.reach, -1, pose.open)
  p.pop()
}

/** Whether Jobu's jumpers are in the room yet. */
export const jumpersIn = (t: number): boolean => t >= APPEAR
