import type { Pt } from '../../../../../parts'
import { shade, type Frame } from '../depth'
import { smooth } from '../kit'
import { WIN } from '../music'
import { ctxOf, ellipse, line, mix, path, rect, rgba, ring, shape, vgrad, type Pen } from '../pen'
import { box, Fills, toned } from './batch'
import { drawThrown } from './confetti'
import { drawCaps, drawFarStands, drawStands } from './crowd'
import {
  armAngle,
  BAT_STRIKE,
  BELL,
  BOARD,
  BOARD_TOP,
  carryHand,
  CM,
  ENDO_STEPS,
  endoBat,
  endoFace,
  endoLean,
  endoLunge,
  endoSquat,
  endoX,
  FLOOR,
  IN_PAN,
  JUDGE,
  LAMP,
  NET_TOP,
  NET_X,
  PICK,
  PIVOT,
  SECTIONS,
  SERVE,
  SET,
  STEP1,
  T1,
  TOP,
  XL,
  XR,
} from './geo'
import { drawBalcony, drawLowLanterns, drawRigging, drawWallBunting } from './house'
import { drawBeams, drawFlashIn } from './light'
import { lit, spill } from './mood'
import { C } from './palette'
import { drawPress } from './press'

/**
 * Tokyo: one table under a hard white lamp in a packed arena. The stands rise into the dark in dark blues and
 * browns, the GIs' olive in one block of them; red-and-white bunting and paper lanterns; the judge's table. The table's
 * green is the darkest, richest thing in the light; everything else is the crowd, which the house lights find and
 * lose.
 *
 * The house is laid in depth (`mood.ts`): the upper tier far back over the balcony and the roof's truss drift slower
 * than the table as the camera goes, each row of the lower tier a little slower than the one in front, and the front
 * row in the lens passes faster. This file draws the arena's ground and the match; the house is drawn by `crowd.ts`
 * (the people), `house.ts` (the truss, the balcony, the banners and lanterns), `light.ts` (the spotlights' still pair,
 * the dust and smoke in the lamp, the flash on the broken-off line), `press.ts` (the photographers), `confetti.ts` (the
 * paper of the eruption) and `near.ts` (the front row), all gathered into a few fills a frame (`batch.ts`).
 *
 * The light is the arena's own and it falls on things: the lamp's white on the table and its pool on the floor, the
 * house lights finding their sections of the crowd. Nothing glows round a lamp, and nothing lights up on a stroke: the
 * match is in the bats, the ball and the house.
 */

const ctxRot = (pen: Pen, c: Pt, ang: number, fn: () => void): void => {
  const { p, k } = pen
  p.push()
  p.translate(c[0] * k, c[1] * k)
  p.rotate(ang)
  p.translate(-c[0] * k, -c[1] * k)
  fn()
  p.pop()
}

/* ------------------------------------------------------------------ the arena (the set) */

/**
 * The arena, back to front: the roof's dark; the upper tier over the balcony; the house lights' faint haze over their
 * sections; the roof's truss with its banks, spotlights and scoreboard; the lower tier and everyone in it; the
 * balcony's front and its banners; the caps in the air; the lanterns; the confetti thrown up out of the stands; the red
 * wall and its bunting; the floor, the lamp's pool on it and the table's shadow; the one flash on the broken-off line;
 * the press at the court's side; the judges; the boards; and the spotlights' still pair over all of it.
 */
export function drawArena(pen: Pen, t: number, f: Frame): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  vgrad(pen, x0, f.y0 - 1, x1, f.y1 + 1, [
    [0, C.roof, 1],
    [0.6, C.roofHi, 1],
    [1, C.roof, 1],
  ])
  drawFarStands(pen, t, f)
  // The faint haze the house lights find in the air over their sections.
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = SECTIONS[i]
    const b = SECTIONS[i + 1]
    if (b < x0 || a > x1) continue
    const L = Math.min(1, lit(i, t))
    if (L > 0.01) {
      vgrad(pen, a, -11, b, 0.4, [
        [0, '#E8E4D8', 0.05 * L],
        [0.7, '#E8E4D8', 0.016 * L],
        [1, '#E8E4D8', 0],
      ])
    }
  }
  drawRigging(pen, t, f)
  drawStands(pen, t, f)
  drawBalcony(pen, t, f)
  drawCaps(pen, t, f)
  drawLowLanterns(pen, t, f)
  drawThrown(pen, t, f)
  // The front of the stands: a red wall with a pale rail, the bunting along it.
  const W0 = 0.3
  const W1 = 0.66
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = Math.max(SECTIONS[i], x0)
    const b = Math.min(SECTIONS[i + 1], x1)
    if (b <= a) continue
    const L = Math.min(1, lit(i, t)) * 0.75 + spill((a + b) / 2, 0.4) * 0.6
    rect(pen, a, W0, b, W1, mix(C.dark, C.wall, 0.25 + 0.75 * L))
    rect(pen, a, W0 - 0.05, b, W0 + 0.02, mix(C.dark, C.rail, 0.15 + 0.7 * L))
  }
  drawWallBunting(pen, t, x0, x1, W0 + 0.02)
  // The court's floor going back to the stands, and the near floor.
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = Math.max(SECTIONS[i], x0)
    const b = Math.min(SECTIONS[i + 1], x1)
    if (b <= a) continue
    const L = Math.min(1, lit(i, t)) * 0.45
    vgrad(pen, a, W1, b, FLOOR, [
      [0, mix(C.dark, C.floorFar, 0.35 + 0.65 * L), 1],
      [1, mix(C.dark, C.floorFarHi, 0.3 + 0.6 * L), 1],
    ])
  }
  for (let x = Math.ceil(x0 / 1.4) * 1.4; x < x1; x += 1.4) line(pen, [x, W1], [x + (x - NET_X) * 0.06, FLOOR], mix(C.dark, C.floorFar, 0.6), 0.35)
  // The lamp's pool on the boards under the table, laid flat on the floor (not hanging in the air over it).
  shade(pen, [NET_X, FLOOR - 0.25], 4.2, 0.55, C.lamp, 0.13)
  rect(pen, x0, FLOOR, x1, f.y1 + 1, C.floorNear)
  vgrad(pen, x0, FLOOR, x1, FLOOR + 1.2, [
    [0, '#3A2A1E', 1],
    [1, C.floorNear, 1],
  ])
  shade(pen, [NET_X, FLOOR + 0.08], 3.4, 0.32, C.lamp, 0.09)
  // The table's own shadow, straight down under the lamp.
  shade(pen, [NET_X, FLOOR - 0.1], (XR - XL) / 2 + 0.2, 0.2, '#000000', 0.5)
  drawFlashIn(pen, t, f)
  drawPress(pen, t, f)
  drawJudges(pen, t, f)
  drawBoard(pen, t, f)
  drawBeams(pen, t, f)
}

/** The judges' table on the floor: a cloth, two judges, the flip-cards (bars, no figures), the bell. */
function drawJudges(pen: Pen, t: number, f: Frame): void {
  const [a, b] = JUDGE
  if (b + 0.4 < f.x0 || a - 0.4 > f.x1) return
  const top = FLOOR - 0.95
  const L = Math.min(1, lit(2, t)) * 0.6 + 0.35
  const tone = (c: string) => mix(C.dark, c, L)
  const { k } = pen
  const ctx = ctxOf(pen.p)
  // The judges behind it, seated.
  for (const [jx, s] of [[a + 0.5, 0], [b - 0.55, 1]] as const) {
    const lean = s === 0 ? 0 : 0.04 * Math.sin(t * 0.8)
    shape(pen, [[jx - 0.28, top], [jx - 0.25, top - 0.72], [jx - 0.12, top - 0.84], [jx + 0.12, top - 0.84], [jx + 0.25, top - 0.72], [jx + 0.28, top]], tone(C.suit))
    shape(pen, [[jx - 0.05, top - 0.84], [jx + 0.05, top - 0.84], [jx, top - 0.62]], tone(C.cloth))
    ellipse(pen, [jx + lean, top - 1.07], 0.17, 0.2, tone(C.skin))
    ellipse(pen, [jx + lean, top - 1.17], 0.17, 0.11, tone(C.hair))
  }
  // The cloth, with its red skirt band.
  rect(pen, a - 0.1, top, b + 0.1, FLOOR - 0.12, tone(C.cloth))
  rect(pen, a - 0.1, FLOOR - 0.42, b + 0.1, FLOOR - 0.22, tone(C.red))
  rect(pen, a - 0.1, top, b + 0.1, top + 0.05, tone('#FFFFFF'))
  const folds = new Fills()
  const fold = folds.at(toned(pen, C.cloth, L * 0.8))
  for (let x = a + 0.1; x < b; x += 0.32) {
    fold.moveTo(x * k, (top + 0.08) * k)
    fold.lineTo((x + 0.02) * k, (FLOOR - 0.13) * k)
  }
  ctx.save()
  folds.stroke(ctx, pen.w * 0.4)
  ctx.restore()
  rect(pen, a - 0.05, FLOOR - 0.12, a + 0.05, FLOOR, tone(C.leg))
  rect(pen, b - 0.05, FLOOR - 0.12, b + 0.05, FLOOR, tone(C.leg))
  // The flip-cards: Endo's on the left, Marty's on the right, bars for points.
  const cx = (a + b) / 2
  shape(pen, [[cx - 0.4, top], [cx - 0.33, top - 0.55], [cx + 0.33, top - 0.55], [cx + 0.4, top]], tone(C.iron))
  const cards = new Fills()
  const pip = toned(pen, C.white, L)
  for (const [side, n] of [[-1, 10], [1, t >= WIN ? 11 : 10]] as const) {
    const x0c = cx + (side < 0 ? -0.31 : 0.03)
    box(cards.at(toned(pen, C.card, L)), k, x0c, top - 0.5, x0c + 0.28, top - 0.05)
    for (let q = 0; q < n; q++) {
      const col = q % 6
      const row = Math.floor(q / 6)
      box(cards.at(pip), k, x0c + 0.035 + col * 0.04, top - 0.44 + row * 0.2, x0c + 0.06 + col * 0.04, top - 0.28 + row * 0.2)
    }
  }
  ctx.save()
  cards.fill(ctx)
  ctx.restore()
  // The bell, rung for the exhibition.
  const swing = 0.45 * ring(t - BELL, 3, 0.35)
  const bx = b - 0.12
  ctxRot(pen, [bx, top - 0.3], swing, () => {
    rect(pen, bx - 0.025, top - 0.42, bx + 0.025, top - 0.2, tone(C.handle))
    shape(pen, [[bx - 0.14, top], [bx - 0.1, top - 0.14], [bx - 0.06, top - 0.2], [bx + 0.06, top - 0.2], [bx + 0.1, top - 0.14], [bx + 0.14, top]], tone(C.brass))
  })
}

/** The barrier boards behind Endo, which the smash hits. */
function drawBoard(pen: Pen, t: number, f: Frame): void {
  const [a, b] = BOARD
  if (b + 0.5 < f.x0 || a - 0.2 > f.x1) return
  const L = Math.min(1, lit(5, t)) * 0.6 + 0.3
  const hit = ring(t - 190.451, 9, 0.18)
  shape(pen, [[a + hit * 0.03, BOARD_TOP], [b + 0.18, BOARD_TOP - 0.22], [b + 0.18, FLOOR - 0.2], [a, FLOOR]], mix(C.dark, C.board, L))
  shape(pen, [[a + hit * 0.03, BOARD_TOP], [b, BOARD_TOP - 0.04], [b, FLOOR], [a, FLOOR]], mix(C.dark, C.boardHi, L))
  rect(pen, a - 0.08, FLOOR - 0.04, b + 0.25, FLOOR, C.leg)
}

/* ------------------------------------------------------------------ the match (the part) */

/**
 * The lamp over the table: its cord, its shade with the bulb lit under it, and the faint cone its light makes in the
 * house's air on the way down to the green.
 */
export function drawLamp(pen: Pen): void {
  const [lx, ly] = LAMP
  const k = pen.k
  const ctx = ctxOf(pen.p)
  // The cone.
  const g = ctx.createLinearGradient(0, (ly + 0.2) * k, 0, TOP * k)
  g.addColorStop(0, rgba(pen, C.lamp, 0.1))
  g.addColorStop(1, rgba(pen, C.lamp, 0.025))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((lx - 0.3) * k, (ly + 0.22) * k)
  ctx.lineTo((lx + 0.3) * k, (ly + 0.22) * k)
  ctx.lineTo((XR + 0.6) * k, TOP * k)
  ctx.lineTo((XL - 0.6) * k, TOP * k)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  line(pen, [lx, ly - 12], [lx, ly - 0.2], '#0E0F12', 0.9)
  shape(pen, [[lx - 0.08, ly - 0.22], [lx + 0.08, ly - 0.22], [lx + 0.42, ly + 0.22], [lx - 0.42, ly + 0.22]], C.lampShade, 0.4, '#0A0B0C')
  rect(pen, lx - 0.42, ly + 0.19, lx + 0.42, ly + 0.24, '#E8E6DE')
  ellipse(pen, [lx, ly + 0.23], 0.16, 0.07, '#FFFFFF')
}

/** The table: the trestle legs, the slab, the green top (paler where the lamp is on it) with its white lines, the net. */
export function drawTable(pen: Pen): void {
  // Legs and their cross rail.
  for (const x of [XL + 0.35, XR - 0.35]) {
    rect(pen, x - 0.05, TOP + 0.08, x + 0.05, FLOOR, C.leg)
    rect(pen, x - 0.28, FLOOR - 0.04, x + 0.28, FLOOR, C.leg)
  }
  for (const x of [NET_X - 0.4, NET_X + 0.4]) rect(pen, x - 0.04, TOP + 0.08, x + 0.04, FLOOR, C.leg)
  rect(pen, XL + 0.35, FLOOR - 0.6, XR - 0.35, FLOOR - 0.54, C.leg)
  // The top seen a little from above (the ball sits on its near half), the slab's edge.
  const T0y = TOP - 0.16
  const k = pen.k
  const ctx = ctxOf(pen.p)
  const lamp = ctx.createLinearGradient(XL * k, 0, XR * k, 0)
  lamp.addColorStop(0, pen.tone(C.tableTop))
  lamp.addColorStop(0.5, pen.tone(mix(C.tableTop, C.lamp, 0.16)))
  lamp.addColorStop(1, pen.tone(C.tableTop))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((XL + 0.06) * k, T0y * k)
  ctx.lineTo((XR - 0.06) * k, T0y * k)
  ctx.lineTo(XR * k, TOP * k)
  ctx.lineTo(XL * k, TOP * k)
  ctx.closePath()
  ctx.fillStyle = lamp
  ctx.fill()
  ctx.restore()
  rect(pen, XL, TOP, XR, TOP + 0.09, C.table)
  rect(pen, XL, TOP + 0.07, XR, TOP + 0.09, C.tableEdge)
  // The lines: the edge, both end lines, the centre line.
  line(pen, [XL, TOP], [XR, TOP], C.line, 0.8)
  line(pen, [XL + 0.06, T0y], [XR - 0.06, T0y], mix(C.tableTop, C.line, 0.6), 0.5)
  line(pen, [XL, TOP], [XL + 0.06, T0y], C.line, 0.9)
  line(pen, [XR, TOP], [XR - 0.06, T0y], C.line, 0.9)
  line(pen, [XL + 0.03, (TOP + T0y) / 2], [XR - 0.03, (TOP + T0y) / 2], mix(C.tableTop, C.line, 0.75), 0.4)
  // The net: its posts at the near edge and the mesh, edge-on, a little turned.
  const nx = NET_X
  rect(pen, nx - 0.05, NET_TOP, nx + 0.05, TOP, '#0E1A14')
  for (let y = NET_TOP + 0.05; y < TOP; y += 0.06) line(pen, [nx - 0.05, y], [nx + 0.05, y - 0.02], '#3A4A42', 0.3)
  line(pen, [nx - 0.06, NET_TOP], [nx + 0.06, NET_TOP - 0.03], C.line, 1.1)
  rect(pen, nx - 0.02, NET_TOP - 0.04, nx + 0.02, TOP + 0.09, '#9A9C98')
}

/** Marty's own bat: a red-rubber bat on a sprung, hinged arm clamped to his end; the pan he serves from. */
export function drawSprungBat(pen: Pen, t: number): void {
  const φ = armAngle(t)
  const v: Pt = [BAT_STRIKE[0] - PIVOT[0], BAT_STRIKE[1] - PIVOT[1]]
  const len = Math.hypot(v[0], v[1])
  const a0 = Math.atan2(v[1], v[0])
  const a = a0 + φ
  const tip: Pt = [PIVOT[0] + Math.cos(a) * len, PIVOT[1] + Math.sin(a) * len]
  const mid: Pt = [PIVOT[0] + Math.cos(a) * len * 0.45, PIVOT[1] + Math.sin(a) * len * 0.45]
  // The clamp on the table's end and its bracket down to the pivot.
  rect(pen, XL - 0.1, TOP - 0.06, XL + 0.12, TOP - 0.01, C.iron)
  rect(pen, XL - 0.1, TOP + 0.1, XL + 0.12, TOP + 0.15, C.iron)
  rect(pen, XL - 0.1, TOP - 0.06, XL - 0.05, PIVOT[1] + 0.05, C.iron)
  line(pen, [XL - 0.08, PIVOT[1]], [PIVOT[0], PIVOT[1]], C.iron, 1.6)
  // The spring from the bracket to the arm: coils that stretch as it cocks.
  const s0: Pt = [XL - 0.07, TOP + 0.02]
  const pts: Pt[] = []
  const n = 9
  const dx = mid[0] - s0[0]
  const dy = mid[1] - s0[1]
  const dl = Math.hypot(dx, dy) || 1
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const w = i === 0 || i === n ? 0 : (i % 2 ? 1 : -1) * 0.06
    pts.push([s0[0] + dx * u - (dy / dl) * w, s0[1] + dy * u + (dx / dl) * w])
  }
  path(pen, pts, C.ironHi, 0.8)
  // The pan, on its little lever: it dips under him while he waits to serve.
  const dip = t >= IN_PAN && t < SERVE ? 0.05 + 0.03 * ring(t - IN_PAN, 7, 0.15) : 0.02 * ring(t - SERVE, 9, 0.12)
  const pan: Pt = [CM[0], CM[1] + 0.135 + dip]
  line(pen, [XL - 0.06, TOP - 0.02], [pan[0] + 0.05, pan[1] + 0.03], C.iron, 0.9)
  shape(pen, [[pan[0] - 0.12, pan[1] - 0.04], [pan[0] + 0.12, pan[1] - 0.04], [pan[0] + 0.08, pan[1] + 0.03], [pan[0] - 0.08, pan[1] + 0.03]], C.brass, 0.3, '#5A4520')
  // The arm and the bat.
  line(pen, PIVOT, tip, C.iron, 2.0)
  line(pen, PIVOT, tip, C.ironHi, 0.5)
  ellipse(pen, PIVOT, 0.06, 0.06, C.ironHi)
  ctxRot(pen, tip, a + Math.PI / 2, () => {
    ellipse(pen, tip, 0.12, 0.235, '#4A2A18')
    ellipse(pen, [tip[0] + 0.025, tip[1]], 0.1, 0.225, C.rubber)
    ellipse(pen, [tip[0] + 0.04, tip[1] - 0.06], 0.035, 0.09, C.rubberHi)
  })
}

/* ------------------------------------------------------------------ Endo */

function ik(a: Pt, b: Pt, l1: number, l2: number, bend: number): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3)
  const ang = Math.atan2(dy, dx)
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1)))
  const off = Math.acos(c) * bend
  return [a[0] + Math.cos(ang + off) * l1, a[1] + Math.sin(ang + off) * l1]
}

export interface EndoPose {
  hip: Pt
  shoulder: Pt
  head: Pt
  face: number
}

export function endoPose(t: number): EndoPose {
  const x = endoX(t)
  const face = endoFace(t)
  const lean = endoLean(t)
  const q = endoSquat(t)
  const hip: Pt = [x - face * 0.08 * q, FLOOR - 1.55 + 0.85 * q]
  const dir: Pt = [face * Math.sin(lean), -Math.cos(lean)]
  return { hip, shoulder: [hip[0] + dir[0] * 1.0, hip[1] + dir[1] * 1.0], head: [hip[0] + dir[0] * 1.38, hip[1] + dir[1] * 1.38], face }
}

/** His free hand: at his side, or reaching down for the ball, carrying it, and letting it go. */
export function endoFreeHand(t: number, pose: EndoPose): Pt {
  const hang: Pt = [pose.shoulder[0] - pose.face * 0.05, pose.shoulder[1] + 1.1]
  if (t >= PICK && t <= SET) return carryHand(t)
  if (t > STEP1 && t < PICK) {
    const u = smooth(t, STEP1, PICK)
    const c = carryHand(PICK)
    return [hang[0] + (c[0] - hang[0]) * u, hang[1] + (c[1] - hang[1]) * u]
  }
  if (t > SET && t < SET + 0.4) {
    const u = smooth(t, SET, SET + 0.4)
    const c = carryHand(SET)
    return [c[0] + (hang[0] - c[0]) * u, c[1] + (hang[1] - c[1]) * u]
  }
  return hang
}

export function drawEndo(pen: Pen, t: number): void {
  if (t > T1 + 0.5) return
  const pose = endoPose(t)
  const { hip, shoulder, head, face } = pose
  const x = endoX(t)
  // Feet: a stance, and a lift on each step.
  const lift = (i: number) => {
    let v = 0
    ENDO_STEPS.forEach((s, j) => {
      if (j % 2 !== i) return
      const u = (t - (s - 0.28)) / 0.28
      if (u > 0 && u < 1) v = Math.max(v, Math.sin(Math.PI * u) * 0.14)
    })
    return v
  }
  const q = endoSquat(t)
  const lunge = endoLunge(t)
  const feet: Pt[] = [
    [x - face * (0.22 + 0.1 * q), FLOOR - lift(0)],
    [x + face * (0.24 + 0.12 * q + 0.35 * lunge), FLOOR - lift(1)],
  ]
  // His shadow on the floor under him, from the lamp and the house.
  shade(pen, [x, FLOOR - 0.01], 0.6 + 0.25 * q + 0.2 * lunge, 0.075, '#000000', 0.5)
  const lh = Math.min(1, Math.max(lit(4, t), lit(5, t)))
  const near = Math.exp(-(((x - NET_X) / 3.6) ** 2))
  const light = 0.2 + 0.8 * Math.max(lh * 0.85, near)
  const tone = (c: string, f = 1) => mix(C.dark, c, 0.78 * light * f)
  // The far leg and arm first, darker.
  const legs = feet.map((ft) => ({ ft, knee: ik(hip, [ft[0], ft[1] - 0.06], 0.82, 0.8, face > 0 ? -1 : 1) }))
  const leg = (l: { ft: Pt; knee: Pt }, f: number) => {
    line(pen, hip, l.knee, tone(C.trousers, f), 5.2)
    line(pen, l.knee, [l.ft[0], l.ft[1] - 0.08], tone(C.trousers, f), 4.6)
    shape(pen, [[l.ft[0] - 0.1 * face, l.ft[1] - 0.1], [l.ft[0] + 0.2 * face, l.ft[1] - 0.06], [l.ft[0] + 0.22 * face, l.ft[1]], [l.ft[0] - 0.1 * face, l.ft[1]]], C.shoe)
  }
  leg(legs[0], 0.8)
  const free = endoFreeHand(t, pose)
  const fElbow = ik(shoulder, free, 0.6, 0.6, face > 0 ? 1 : -1)
  line(pen, shoulder, fElbow, tone(C.shirtShade, 0.9), 3.6)
  line(pen, fElbow, free, tone(C.skin, 0.9), 2.8)
  ellipse(pen, free, 0.06, 0.06, tone(C.skin, 0.9))
  leg(legs[1], 1)
  // The torso: white shirt, a little lit by the lamp on the side toward it.
  const d: Pt = [(shoulder[0] - hip[0]) / 1.0, (shoulder[1] - hip[1]) / 1.0]
  const n: Pt = [-d[1], d[0]]
  const w0 = 0.2
  const w1 = 0.27
  shape(pen, [[hip[0] + n[0] * w0, hip[1] + n[1] * w0], [shoulder[0] + n[0] * w1, shoulder[1] + n[1] * w1], [shoulder[0] - n[0] * w1, shoulder[1] - n[1] * w1], [hip[0] - n[0] * w0, hip[1] - n[1] * w0]], tone(C.shirt))
  shape(pen, [[hip[0] + n[0] * w0 * 1.05, hip[1] + n[1] * w0 * 1.05 + 0.02], [hip[0] - n[0] * w0 * 1.05, hip[1] - n[1] * w0 * 1.05 + 0.02], [hip[0] - n[0] * w0 + d[0] * 0.15, hip[1] - n[1] * w0 + d[1] * 0.15], [hip[0] + n[0] * w0 + d[0] * 0.15, hip[1] + n[1] * w0 + d[1] * 0.15]], tone(C.trousers))
  // Head: the hair dark and short, the face turned the way he faces.
  line(pen, [shoulder[0] + d[0] * 0.05, shoulder[1] + d[1] * 0.05], [head[0] - d[0] * 0.12, head[1] - d[1] * 0.12], tone(C.skin), 3)
  ctxRot(pen, head, Math.atan2(d[1], d[0]) + Math.PI / 2, () => {
    // Upright, this frame is the world's: his face is on the side he faces, the hair over the top and the back.
    const fx = face
    ellipse(pen, [head[0] + fx * 0.01, head[1]], 0.19, 0.22, tone(C.skin))
    shape(pen, [[head[0] - fx * 0.2, head[1] + 0.06], [head[0] - fx * 0.21, head[1] - 0.1], [head[0] - fx * 0.12, head[1] - 0.21], [head[0] + fx * 0.04, head[1] - 0.24], [head[0] + fx * 0.17, head[1] - 0.16], [head[0] + fx * 0.19, head[1] - 0.08], [head[0] + fx * 0.02, head[1] - 0.1], [head[0] - fx * 0.06, head[1] + 0.02], [head[0] - fx * 0.12, head[1] + 0.12]], tone(C.hair))
    ellipse(pen, [head[0] - fx * 0.08, head[1] + 0.0], 0.035, 0.05, tone(C.skinDark))
  })
  // The bat arm, and the thick pale sponge bat.
  const bat = endoBat(t)
  const batC: Pt = bat ?? [shoulder[0] + face * 0.12, shoulder[1] + 1.25]
  const toS: Pt = [shoulder[0] - batC[0], shoulder[1] - batC[1]]
  const ls = Math.hypot(toS[0], toS[1]) || 1
  const hand: Pt = [batC[0] + (toS[0] / ls) * 0.3, batC[1] + (toS[1] / ls) * 0.3]
  const elbow = ik(shoulder, hand, 0.6, 0.6, face > 0 ? -1 : 1)
  line(pen, shoulder, elbow, tone(C.shirt), 4)
  line(pen, elbow, hand, tone(C.skin), 3)
  const ang = Math.atan2(toS[1], toS[0])
  line(pen, batC, [hand[0] + (toS[0] / ls) * 0.06, hand[1] + (toS[1] / ls) * 0.06], tone(C.handle, 1.2), 2.6)
  ctxRot(pen, batC, ang + Math.PI / 2, () => {
    const wv = bat ? 1 : 0.55
    ellipse(pen, [batC[0] + 0.035 * wv, batC[1]], 0.1 * wv, 0.225, tone(C.handle, 1.1))
    ellipse(pen, [batC[0] - 0.02 * wv, batC[1]], 0.1 * wv, 0.225, tone(C.spongeEdge, 1.2))
    ellipse(pen, [batC[0] - 0.045 * wv, batC[1]], 0.075 * wv, 0.21, tone(C.sponge, 1.25))
  })
  ellipse(pen, hand, 0.065, 0.065, tone(C.skin))
}

/** His fingers over the ball while he carries it. */
export function drawEndoOver(pen: Pen, t: number): void {
  if (t < PICK || t > SET + 0.05) return
  const h = carryHand(Math.min(t, SET))
  const face = endoFace(t)
  shape(pen, [[h[0] - 0.12, h[1] - 0.1], [h[0] + 0.06 * face, h[1] - 0.16], [h[0] + 0.16 * face, h[1] - 0.04], [h[0] + 0.1 * face, h[1] + 0.02], [h[0] - 0.08, h[1] - 0.02]], mix(C.dark, C.skin, 0.62))
}
