import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { beam, bloom, pool, rgba } from '../cast'
import { hash, type Ctx } from '../kit'
import { level } from '../music'
import { DERELICTE } from '../worlds'
import { FLOOR_Y, PLUG, PULLED } from './geo'
import {
  ARM_PIVOT,
  BAG,
  BAG_TOP,
  BAG_X,
  BOX,
  BUCKET,
  BUCKET_X,
  BX0,
  BX1,
  CASE,
  DAVIT_Y,
  DECK,
  GIVE_LEN,
  GIVE_PIVOT,
  L1,
  L2,
  L3,
  LAMP,
  LIFTS,
  MID,
  MIXER,
  PLATTER,
  PLINTH,
  PLUG_H,
  PLUG_LEN,
  RAIL_Y,
  RIG,
  SKIRT,
  SPK,
  SUB,
  SUB_X,
  TOP,
  WHEEL,
  WHEEL_R,
  W,
  ambient,
  boxJolt,
  X0,
  X1,
  XM,
  arm,
  bucket,
  cone,
  lamp,
  lead,
  platterTurn,
  plugOut,
  powered,
  railAngle,
  subLift,
} from './tower-plan'

/**
 * The tower drawn (the tower builder's): the scaffold, the shaft and its sub, the booth and its gear and light, the
 * power and its lead, the gin wheel and its bucket and bag. Side on, from the front row; flat fills and one ink for the
 * machine, light as soft volume. Everything from show time, through `tower-plan.ts`.
 */

/** The tubes in the hall's dark; the braces further back and darker; their lit edge. */
const TUBE_C = mixHex(DERELICTE.steel, DERELICTE.roof, 0.34)
const BRACE_C = mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.45)
const TUBE_LIT = mixHex(DERELICTE.steel, DERELICTE.spot, 0.45)
/** Scaffold boards: old timber in the dark, a lit edge along their tops. */
const BOARD_C = mixHex(DERELICTE.cardboard, DERELICTE.roof, 0.5)
const BOARD_TOP = mixHex(DERELICTE.cardboard, DERELICTE.spot, 0.15)
const BOARD_END = mixHex(DERELICTE.cardboard, DERELICTE.roof, 0.7)
/** The gear: black boxes, steel, the record. */
const GEAR = DERELICTE.booth
const GEAR_LIT = mixHex(DERELICTE.booth, DERELICTE.spot, 0.22)
const STEEL = DERELICTE.steel
const ROPE = mixHex(DERELICTE.paperShade, DERELICTE.roof, 0.5)
/** The booth's power lead: an orange industrial cable, dulled by the dark: the line from the roof to the plug. */
const LEAD_C = mixHex(DERELICTE.rust, DERELICTE.fire, 0.35)
/** The bag of sand behind the tower: dull canvas, low against the dark. */
const CANVAS = mixHex(DERELICTE.paperShade, DERELICTE.roof, 0.64)

type Draw = { p: p5; k: number; ink: string; w: number; t: number; amb: number; cold: number }
/** A lit edge in the light there is: the show's warm white, the dark of the drop, the house's flat cold white. */
const lit = (d: Draw, base: string, hi: string): string => mixHex(base, mixHex(hi, DERELICTE.star, 0.7 * d.cold), d.amb)
const X = (d: Draw, v: number): number => v * d.k

function tube(d: Draw, a: Pt, b: Pt, color = TUBE_C, thick = 0.07): void {
  const { p } = d
  p.stroke(color)
  p.strokeWeight(Math.max(1, X(d, thick)))
  p.line(X(d, a[0]), X(d, a[1]), X(d, b[0]), X(d, b[1]))
}

function box(d: Draw, x0: number, y0: number, x1: number, y1: number, fill: string, w = 0.6, r = 0): void {
  const { p } = d
  p.stroke(d.ink)
  p.strokeWeight(d.w * w)
  p.fill(fill)
  p.rect(X(d, x0), X(d, y0), X(d, x1 - x0), X(d, y1 - y0), X(d, r))
}

function poly(d: Draw, pts: Pt[], fill: string, w = 0.6): void {
  const { p } = d
  p.stroke(d.ink)
  p.strokeWeight(d.w * w)
  p.fill(fill)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(d, x), X(d, y))
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the scaffold */

/** A board at a lift, `x0` to `x1`, its top at `y`: a slab with its lit top and dark end grain. */
function board(d: Draw, x0: number, x1: number, y: number, glow: number): void {
  const { p } = d
  box(d, x0, y, x1, y + 0.09, BOARD_C, 0.5)
  p.noStroke()
  p.fill(lit(d, BOARD_C, mixHex(BOARD_TOP, DERELICTE.spot, 0.3 * glow)))
  p.rect(X(d, x0 + 0.01), X(d, y + 0.005), X(d, x1 - x0 - 0.02), Math.max(1, X(d, 0.022)))
  p.fill(BOARD_END)
  p.rect(X(d, x0 + 0.01), X(d, y + 0.03), X(d, 0.03), X(d, 0.05))
  p.rect(X(d, x1 - 0.04), X(d, y + 0.03), X(d, 0.03), X(d, 0.05))
}

function drawScaffold(d: Draw, on: number): void {
  const { p, t } = d
  const base = FLOOR_Y
  // The braces, on the back face: one diagonal a lift, in the boarded bay.
  const braces: [Pt, Pt][] = [
    [[X0, base - 0.08], [XM, L1 + 0.12]],
    [[XM, L1 + 0.02], [X0, L2 + 0.12]],
    [[X0, L2 + 0.02], [XM, L3 + 0.12]],
    [[XM, L3 + 0.02], [X0, DECK + 0.14]],
  ]
  for (const [a, b] of braces) tube(d, a, b, BRACE_C, 0.045)
  // The standards: the left one up to the davit, the right one to the booth's rail, the middle one to the deck.
  tube(d, [X0, base], [X0, DAVIT_Y - 0.08])
  tube(d, [XM, base], [XM, DECK + 0.1])
  tube(d, [X1, base], [X1, RAIL_Y])
  // Their feet: base plates on the concrete.
  p.noStroke()
  p.fill(DERELICTE.steelDark)
  for (const x of [X0, XM, X1]) p.rect(X(d, x - 0.12), X(d, base - 0.035), X(d, 0.24), X(d, 0.035))
  // The ledgers under the boards, and the guard rails over them, in the boarded bay.
  for (const y of LIFTS) {
    tube(d, [X0, y + 0.12], [XM, y + 0.12])
    tube(d, [X0, y - MID], [XM, y - MID])
    tube(d, [X0, y - TOP], [XM, y - TOP])
  }
  tube(d, [X0, DECK + 0.12], [X1, DECK + 0.12])
  // The shaft's one rail, at the third lift's top: its coupler on the middle standard, until it lets go.
  const th = railAngle(t)
  const [px, py] = GIVE_PIVOT
  const end: Pt = [px - GIVE_LEN * Math.cos(th), py + GIVE_LEN * Math.sin(th)]
  tube(d, [px, py], end)
  p.noStroke()
  p.fill(DERELICTE.steelDark)
  p.rect(X(d, px - 0.06), X(d, py - 0.06), X(d, 0.12), X(d, 0.12))
  // Its coupler on the middle standard: it holds it until it lets go, and stays on the standard after.
  p.rect(X(d, XM - 0.06), X(d, py - 0.06), X(d, 0.12), X(d, 0.12))
  // The boards: the three lifts in the left bay.
  for (const y of LIFTS) board(d, BX0, XM, y, y < -3 ? on * 0.4 : 0)
  // The booth's light along the top of its tubes.
  if (on > 0.01) {
    p.stroke(rgba(TUBE_LIT, 0.5 * on))
    p.strokeWeight(Math.max(1, X(d, 0.022)))
    p.line(X(d, X0 + 0.03), X(d, DECK + 0.08), X(d, X0 + 0.03), X(d, L3 - TOP))
    p.line(X(d, X1 - 0.03), X(d, DECK + 0.08), X(d, X1 - 0.03), X(d, L3 - TOP))
  }
}

/* ------------------------------------------------------------------ the sub */

function drawSub(d: Draw): void {
  const { p, t } = d
  const lift = subLift(t)
  const cx = SUB_X
  const w = SUB.x1 - SUB.x0
  // The cabinet's front: its port, its grille.
  box(d, SUB.x0, SUB.top, SUB.x1, FLOOR_Y, GEAR, 0.6, 0.02)
  p.noStroke()
  p.fill(DERELICTE.vinyl)
  p.rect(X(d, SUB.x0 + 0.14), X(d, SUB.top + 0.46), X(d, w - 0.28), X(d, 0.09), X(d, 0.04))
  p.fill(lit(d, GEAR, GEAR_LIT))
  p.rect(X(d, SUB.x0 + 0.04), X(d, SUB.top + 0.05), X(d, w - 0.08), Math.max(1, X(d, 0.02)))
  // Its top, looking up, tipped to us: the cone in its surround, standing up with the kick.
  const top = SUB.top - 0.1
  poly(d, [[SUB.x0, SUB.top], [SUB.x0 + 0.05, top], [SUB.x1 - 0.05, top], [SUB.x1, SUB.top]], mixHex(GEAR, DERELICTE.steelDark, 0.4), 0.5)
  const cy = SUB.top - 0.05
  p.noStroke()
  p.fill(mixHex(DERELICTE.steel, DERELICTE.roof, 0.2))
  p.ellipse(X(d, cx), X(d, cy), X(d, w * 0.82), X(d, 0.12))
  p.fill(DERELICTE.vinyl)
  p.ellipse(X(d, cx), X(d, cy - lift * 0.6), X(d, w * 0.66), X(d, 0.085 + lift * 0.3))
  p.fill(DERELICTE.bagSheen)
  p.ellipse(X(d, cx), X(d, cy - lift), X(d, 0.16), X(d, 0.035))
  // The air it moves: a breath of light off the cone on the hard kicks.
  if (lift > 0.02) bloom(p, d.k, [cx, cy - 0.15], 0.55, DERELICTE.spot, Math.min(0.12, lift * 0.9))
}

/* ------------------------------------------------------------------ the booth */

function woofer(d: Draw, cx: number, cy: number, r: number, pump: number): void {
  const { p } = d
  p.noStroke()
  p.fill(DERELICTE.steelDark)
  p.circle(X(d, cx), X(d, cy), X(d, 2 * r))
  p.fill(DERELICTE.vinyl)
  p.circle(X(d, cx), X(d, cy), X(d, 2 * r * (0.8 + 0.07 * pump)))
  p.fill(mixHex(DERELICTE.vinyl, DERELICTE.bagSheen, 0.6 + 0.4 * pump))
  p.circle(X(d, cx), X(d, cy), X(d, 2 * r * (0.26 + 0.05 * pump)))
  // The surround's sheen, up and to the left.
  p.noFill()
  p.stroke(rgba(DERELICTE.spot, 0.18 * d.amb))
  p.strokeWeight(Math.max(1, X(d, 0.02)))
  p.arc(X(d, cx), X(d, cy), X(d, 2 * r * 0.9), X(d, 2 * r * 0.9), Math.PI * 1.05, Math.PI * 1.45)
}

function drawSpeakers(d: Draw): void {
  const { p, t } = d
  const pump = cone(t)
  const jolt = 0.012 * pump
  box(d, SPK.x0, SPK.mid, SPK.x1, DECK, GEAR, 0.6, 0.02)
  box(d, SPK.x0 + 0.02, SPK.top - jolt, SPK.x1 - 0.02, SPK.mid, GEAR, 0.6, 0.02)
  const cx = (SPK.x0 + SPK.x1) / 2
  woofer(d, cx, (SPK.mid + DECK) / 2, 0.25, pump)
  woofer(d, cx, SPK.mid - 0.27 - jolt, 0.19, pump)
  // The horn on top.
  p.noStroke()
  p.fill(DERELICTE.vinyl)
  p.quad(X(d, cx - 0.18), X(d, SPK.top + 0.1 - jolt), X(d, cx + 0.18), X(d, SPK.top + 0.1 - jolt), X(d, cx + 0.1), X(d, SPK.top + 0.16 - jolt), X(d, cx - 0.1), X(d, SPK.top + 0.16 - jolt))
}

function drawTurntable(d: Draw, on: number): void {
  const { p, t } = d
  // The flight case the decks stand on, and the turntable's plinth, its top tipped to us.
  box(d, CASE.x0, CASE.top, CASE.x1, DECK, GEAR, 0.6)
  p.noStroke()
  p.fill(DERELICTE.steelDark)
  for (const x of [CASE.x0 + 0.02, CASE.x1 - 0.06]) p.rect(X(d, x), X(d, CASE.top + 0.02), X(d, 0.04), X(d, 0.1))
  poly(d, [[PLINTH.x0, CASE.top], [PLINTH.x0 + 0.02, PLINTH.top - 0.1], [PLINTH.x1 - 0.02, PLINTH.top - 0.1], [PLINTH.x1, CASE.top]], mixHex(GEAR, DERELICTE.steelDark, 0.5), 0.5)
  // The platter and the record on it: a dark disc, seen a little from above.
  const [cx, cy] = PLATTER.at
  p.noStroke()
  p.fill(STEEL)
  p.ellipse(X(d, cx), X(d, cy + 0.012), X(d, 2 * PLATTER.rx), X(d, 2 * PLATTER.ry))
  p.fill(DERELICTE.vinyl)
  p.ellipse(X(d, cx), X(d, cy), X(d, 2 * PLATTER.rx * 0.93), X(d, 2 * PLATTER.ry * 0.9))
  // Its sheen, turning with it: two soft highlights opposite each other.
  const turn = platterTurn(t)
  // Its sheen: the lamp's light in the grooves, a soft band across the near side, and a glint going round with it.
  p.noFill()
  p.stroke(rgba(DERELICTE.spot, (0.1 + 0.16 * on) * d.amb))
  p.strokeWeight(Math.max(1, X(d, 0.02)))
  p.arc(X(d, cx), X(d, cy), X(d, 2 * PLATTER.rx * 0.7), X(d, 2 * PLATTER.ry * 0.7), Math.PI * 0.2, Math.PI * 0.8)
  const g = turn % (2 * Math.PI)
  p.noStroke()
  p.fill(rgba(DERELICTE.spot, (0.25 + 0.3 * on) * d.amb))
  p.circle(X(d, cx + PLATTER.rx * 0.62 * Math.cos(g)), X(d, cy + PLATTER.ry * 0.62 * Math.sin(g)), Math.max(1, X(d, 0.03)))
  // The tonearm: from its pivot at the back to the record's edge, lifted as it swings over.
  const { swing, lift } = arm(t)
  const park: Pt = [PLINTH.x1 - 0.03, PLINTH.top + 0.01]
  const play: Pt = [cx + PLATTER.rx * 0.84, cy + 0.02]
  const hx = park[0] + (play[0] - park[0]) * swing
  const hy = park[1] + (play[1] - park[1]) * swing - 0.05 * lift
  p.stroke(STEEL)
  p.strokeWeight(Math.max(1, X(d, 0.022)))
  p.line(X(d, ARM_PIVOT[0]), X(d, ARM_PIVOT[1]), X(d, hx), X(d, hy))
  p.noStroke()
  p.fill(STEEL)
  p.rect(X(d, hx - 0.03), X(d, hy - 0.015), X(d, 0.05), X(d, 0.028))
  p.fill(DERELICTE.steelDark)
  p.circle(X(d, ARM_PIVOT[0]), X(d, ARM_PIVOT[1]), X(d, 0.06))
  // The mixer beside it, its meter glowing with the song.
  box(d, MIXER.x0, MIXER.top, MIXER.x1, CASE.top, GEAR, 0.5)
  p.noStroke()
  p.fill(lit(d, GEAR, GEAR_LIT))
  p.rect(X(d, MIXER.x0 + 0.02), X(d, MIXER.top + 0.01), X(d, MIXER.x1 - MIXER.x0 - 0.04), Math.max(1, X(d, 0.018)))
  if (powered(t)) {
    const lv = level(t)
    bloom(p, d.k, [MIXER.x1 - 0.1, MIXER.top + 0.05], 0.12, DERELICTE.fireCore, 0.2 + 0.4 * lv * cone(t))
  }
}

function drawLamp(d: Draw, on: number, ember: number): void {
  const { p } = d
  const [hx, hy] = LAMP.head
  tube(d, [LAMP.post, CASE.top], [LAMP.post, LAMP.top], DERELICTE.steelDark, 0.035)
  tube(d, [LAMP.post + 0.02, LAMP.top], [hx + 0.02, LAMP.top], DERELICTE.steelDark, 0.03)
  tube(d, [hx, LAMP.top], [hx, hy - 0.07], DERELICTE.steelDark, 0.025)
  poly(d, [[hx - 0.05, hy - 0.08], [hx + 0.05, hy - 0.08], [hx + 0.12, hy + 0.07], [hx - 0.12, hy + 0.07]], GEAR, 0.5)
  // Its mouth: lit, or its filament's last glow.
  p.noStroke()
  p.fill(mixHex(GEAR, DERELICTE.spot, Math.min(1, on * 0.9)))
  p.rect(X(d, hx - 0.11), X(d, hy + 0.055), X(d, 0.22), Math.max(1, X(d, 0.025)))
  if (ember > 0.01) bloom(p, d.k, [hx, hy + 0.07], 0.12, DERELICTE.fire, 0.55 * ember)
}

/** The lamp's light over the decks: its beam, its pool, and the booth glowing in the hall. */
function drawBoothLight(d: Draw, on: number): void {
  if (on <= 0.01) return
  const { p, k } = d
  const [hx, hy] = LAMP.head
  bloom(p, k, [27.4, DECK - 0.7], 3.0, DERELICTE.spot, 0.11 * on)
  beam(p, k, [hx, hy + 0.07], [PLATTER.at[0] + 0.15, CASE.top], 0.2, 1.05, DERELICTE.spot, 0.42 * on)
  pool(p, k, [PLATTER.at[0] + 0.2, DECK - 0.05], 1.0, 0.12, DERELICTE.spot, 0.38 * on)
  bloom(p, k, [hx, hy + 0.07], 0.35, DERELICTE.spot, 0.6 * on)
}

/** The skirt of bin bags round the deck: Derelicte's couture, as a booth's fascia. */
function drawSkirt(d: Draw): void {
  const { p, t } = d
  const lobes = 4
  const w = (BX1 - BX0) / lobes
  const tw = W(t)
  p.stroke(d.ink)
  p.strokeWeight(d.w * 0.5)
  p.fill(DERELICTE.bag)
  p.beginShape()
  p.vertex(X(d, BX0), X(d, DECK + 0.08))
  p.vertex(X(d, BX1), X(d, DECK + 0.08))
  for (let i = lobes - 1; i >= 0; i--) {
    const x0 = BX0 + i * w
    const sway = 0.012 * Math.sin(tw * 1.1 + i * 1.7)
    const low = SKIRT + 0.05 * hash(i, 3) + sway
    p.vertex(X(d, x0 + w), X(d, low - 0.1))
    p.bezierVertex(X(d, x0 + w * 0.95), X(d, low + 0.02), X(d, x0 + w * 0.6), X(d, low + 0.04), X(d, x0 + w * 0.5), X(d, low + 0.03))
    p.bezierVertex(X(d, x0 + w * 0.35), X(d, low + 0.04), X(d, x0 + w * 0.05), X(d, low + 0.02), X(d, x0), X(d, low - 0.1))
  }
  p.endShape(p.CLOSE)
  // The plastic's sheen on each.
  p.noFill()
  p.stroke(rgba(DERELICTE.bagSheen, 0.35 + 0.55 * d.amb))
  p.strokeWeight(Math.max(1, X(d, 0.025)))
  for (let i = 0; i < lobes; i++) {
    const x0 = BX0 + i * w
    p.arc(X(d, x0 + w * 0.45), X(d, SKIRT - 0.12), X(d, w * 0.5), X(d, 0.2), Math.PI * 0.6, Math.PI * 0.95)
  }
}

function drawDeck(d: Draw, on: number): void {
  const { p } = d
  // The rail behind the gear, and the deck's boards.
  tube(d, [X0, RAIL_Y], [X1, RAIL_Y])
  box(d, BX0, DECK, BX1, DECK + 0.1, BOARD_C, 0.55)
  p.noStroke()
  p.fill(lit(d, BOARD_C, mixHex(BOARD_TOP, DERELICTE.spot, 0.45 * on)))
  p.rect(X(d, BX0 + 0.01), X(d, DECK + 0.005), X(d, BX1 - BX0 - 0.02), Math.max(1, X(d, 0.024)))
}

/** The power: the box, its socket, and the plug in it while it is in. */
function drawBox(d: Draw): void {
  const { p, t } = d
  // It jolts toward him on each tug, rocking up on its foot on his side, and settles.
  const { dx, tilt } = boxJolt(t)
  p.push()
  p.translate(X(d, BOX.x1 + dx), X(d, DECK))
  p.rotate(Math.max(0, tilt))
  p.translate(-X(d, BOX.x1), -X(d, DECK))
  box(d, BOX.x0, BOX.top, BOX.x1, DECK, GEAR, 0.6, 0.01)
  p.noStroke()
  p.fill(DERELICTE.rust)
  p.rect(X(d, BOX.x0 + 0.02), X(d, BOX.top + 0.03), X(d, BOX.x1 - BOX.x0 - 0.04), X(d, 0.04))
  p.fill(DERELICTE.vinyl)
  p.rect(X(d, BOX.x1 - 0.02), X(d, PLUG[1] - 0.07), X(d, 0.03), X(d, 0.14))
  p.pop()
}

/** A plug: its body `at` (its middle), turned `a`: orange, its grip toward the lead. */
function plug(d: Draw, at: Pt, a: number): void {
  const { p } = d
  p.push()
  p.translate(X(d, at[0]), X(d, at[1]))
  p.rotate(a)
  p.stroke(d.ink)
  p.strokeWeight(d.w * 0.5)
  p.fill(DERELICTE.fire)
  p.rect(X(d, -PLUG_LEN / 2), X(d, -PLUG_H / 2), X(d, PLUG_LEN * 0.62), X(d, PLUG_H), X(d, 0.02))
  p.fill(DERELICTE.rust)
  p.rect(X(d, -PLUG_LEN / 2 + PLUG_LEN * 0.62), X(d, -PLUG_H * 0.4), X(d, PLUG_LEN * 0.38), X(d, PLUG_H * 0.8), X(d, 0.02))
  p.pop()
}

/** The heavy lead from the rig in the roof, and the plug on its end: in its socket, or torn out and swinging. */
function drawLead(d: Draw): void {
  const { p, t } = d
  // The rig's box under the truss.
  box(d, RIG[0] - 0.2, RIG[1] - 0.3, RIG[0] + 0.2, RIG[1], GEAR, 0.6, 0.02)
  tube(d, [RIG[0] - 0.12, RIG[1] - 0.3], [RIG[0] - 0.12, -9.62], DERELICTE.steelDark, 0.03)
  tube(d, [RIG[0] + 0.12, RIG[1] - 0.3], [RIG[0] + 0.12, -9.62], DERELICTE.steelDark, 0.03)
  const pts = lead(t)
  const n = pts.length
  const line = (color: string, w: number) => {
    p.stroke(color)
    p.strokeWeight(w)
    p.beginShape()
    p.curveVertex(X(d, pts[0][0]), X(d, pts[0][1]))
    for (const [x, y] of pts) p.curveVertex(X(d, x), X(d, y))
    p.curveVertex(X(d, pts[n - 1][0]), X(d, pts[n - 1][1]))
    p.endShape()
  }
  p.noFill()
  line(DERELICTE.vinyl, Math.max(2, X(d, 0.09)))
  line(mixHex(LEAD_C, DERELICTE.roof, 0.35 * (1 - d.amb)), Math.max(1.3, X(d, 0.06)))
  // Its sheen.
  p.stroke(rgba(DERELICTE.fireCore, 0.3 * d.amb))
  p.strokeWeight(Math.max(1, X(d, 0.014)))
  p.beginShape()
  p.curveVertex(X(d, pts[0][0] - 0.015), X(d, pts[0][1]))
  for (const [x, y] of pts) p.curveVertex(X(d, x - 0.015), X(d, y - 0.01))
  p.curveVertex(X(d, pts[n - 1][0] - 0.015), X(d, pts[n - 1][1]))
  p.endShape()
  if (t < PULLED) {
    const out = plugOut(t) + boxJolt(t).dx
    plug(d, [PLUG[0] + out, PLUG[1]], 0)
  } else {
    // Torn out: on the lead's end, lying along it.
    const [ax, ay] = pts[n - 2]
    const [bx, by] = pts[n - 1]
    const a = Math.atan2(by - ay, bx - ax)
    plug(d, [bx + Math.cos(a) * (PLUG_LEN / 2 - 0.02), by + Math.sin(a) * (PLUG_LEN / 2 - 0.02)], a + Math.PI)
    // The spark as it comes out.
    const u = t - PULLED
    if (u >= 0 && u < 0.25) bloom(p, d.k, [PLUG[0] - PLUG_LEN / 2 + 0.02, PLUG[1]], 0.3, DERELICTE.fireCore, 0.9 * Math.exp(-u / 0.05))
  }
}

/* ------------------------------------------------------------------ the gin wheel */

function drawGin(d: Draw): void {
  const { p, t } = d
  const { turn } = bucket(t)
  const [wx, wy] = WHEEL
  // The short davit off the top of the booth's left standard, and the wheel's strap.
  tube(d, [X0, DAVIT_Y], [wx - 0.1, DAVIT_Y])
  tube(d, [wx, DAVIT_Y], [wx, wy], DERELICTE.steelDark, 0.04)
  // The bucket's fall, off the wheel's outer side.
  const { rim } = bucket(t)
  p.stroke(ROPE)
  p.strokeWeight(Math.max(1, X(d, 0.024)))
  p.line(X(d, BUCKET_X), X(d, wy), X(d, BUCKET_X), X(d, rim - 0.25))
  // The wheel: a sheave with its spokes, turning as the rope runs.
  p.noFill()
  p.stroke(STEEL)
  p.strokeWeight(Math.max(1, X(d, 0.045)))
  p.circle(X(d, wx), X(d, wy), X(d, 2 * WHEEL_R - 0.04))
  p.strokeWeight(Math.max(1, X(d, 0.025)))
  for (let i = 0; i < 3; i++) {
    const a = turn + (i * Math.PI) / 3
    p.line(X(d, wx - Math.cos(a) * (WHEEL_R - 0.03)), X(d, wy - Math.sin(a) * (WHEEL_R - 0.03)), X(d, wx + Math.cos(a) * (WHEEL_R - 0.03)), X(d, wy + Math.sin(a) * (WHEEL_R - 0.03)))
  }
  p.noStroke()
  p.fill(DERELICTE.steelDark)
  p.circle(X(d, wx), X(d, wy), X(d, 0.07))
}

/**
 * The bag of sand: its two falls come down the back of the shaft from under the booth to the running block on its
 * neck; a dull canvas sack, sitting on the floor behind the sub until the bucket ride takes it up. Drawn first: the
 * tower stands in front of it.
 */
function drawBag(d: Draw): void {
  const { p, t } = d
  const { knot } = bucket(t)
  p.stroke(ROPE)
  p.strokeWeight(Math.max(1, X(d, 0.02)))
  for (const dx of [-0.055, 0.055]) p.line(X(d, BAG_X + dx), X(d, BAG_TOP), X(d, BAG_X + dx), X(d, knot + 0.03))
  // The block, and the hook down to the neck.
  p.noStroke()
  p.fill(mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.3))
  p.rect(X(d, BAG_X - 0.08), X(d, knot - 0.03), X(d, 0.16), X(d, 0.08), X(d, 0.02))
  const top = knot + BAG.neck
  const hw = BAG.w / 2
  const h = BAG.h
  p.stroke(ROPE)
  p.strokeWeight(Math.max(1, X(d, 0.02)))
  p.line(X(d, BAG_X), X(d, knot + 0.05), X(d, BAG_X), X(d, top))
  p.stroke(rgba(d.ink, 0.22))
  p.strokeWeight(d.w * 0.45)
  p.fill(CANVAS)
  p.beginShape()
  p.vertex(X(d, BAG_X - 0.04), X(d, top - 0.03))
  p.vertex(X(d, BAG_X + 0.04), X(d, top - 0.03))
  p.bezierVertex(X(d, BAG_X + 0.05), X(d, top), X(d, BAG_X + hw), X(d, top + 0.04), X(d, BAG_X + hw), X(d, top + h * 0.45))
  p.bezierVertex(X(d, BAG_X + hw + 0.01), X(d, top + h), X(d, BAG_X + hw * 0.7), X(d, top + h), X(d, BAG_X), X(d, top + h))
  p.bezierVertex(X(d, BAG_X - hw * 0.7), X(d, top + h), X(d, BAG_X - hw - 0.01), X(d, top + h), X(d, BAG_X - hw), X(d, top + h * 0.45))
  p.bezierVertex(X(d, BAG_X - hw), X(d, top + 0.04), X(d, BAG_X - 0.05), X(d, top), X(d, BAG_X - 0.04), X(d, top - 0.03))
  p.endShape(p.CLOSE)
}

/** The bucket, over whoever is in it. */
function drawBucket(d: Draw): void {
  const { p, t } = d
  const { rim, tilt } = bucket(t)
  const { rimW, botW, h } = BUCKET
  p.push()
  // It rocks on its bottom's edge.
  p.translate(X(d, BUCKET_X), X(d, rim + h))
  p.rotate(tilt)
  const Y = (v: number) => X(d, v - h)
  // The bail, over it to the hook.
  p.noFill()
  p.stroke(STEEL)
  p.strokeWeight(Math.max(1, X(d, 0.022)))
  p.bezier(X(d, -rimW / 2 + 0.02), Y(0.04), X(d, -rimW / 2), Y(-0.2), X(d, rimW / 2), Y(-0.2), X(d, rimW / 2 - 0.02), Y(0.04))
  // The body: galvanised, its inside dark at the rim.
  p.stroke(d.ink)
  p.strokeWeight(d.w * 0.6)
  p.fill(mixHex(STEEL, DERELICTE.roof, 0.25))
  p.beginShape()
  p.vertex(X(d, -rimW / 2), Y(0))
  p.vertex(X(d, rimW / 2), Y(0))
  p.vertex(X(d, botW / 2), Y(h))
  p.vertex(X(d, -botW / 2), Y(h))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(lit(d, mixHex(STEEL, DERELICTE.roof, 0.25), mixHex(STEEL, DERELICTE.spot, 0.2)))
  p.rect(X(d, -rimW / 2 + 0.02), Y(0.02), X(d, rimW - 0.04), Math.max(1, X(d, 0.025)))
  p.fill(mixHex(STEEL, DERELICTE.roof, 0.55))
  p.rect(X(d, -rimW / 2 + 0.05), Y(0.16), X(d, rimW - 0.12), Math.max(1, X(d, 0.02)))
  p.pop()
}

/* ------------------------------------------------------------------ the whole */

export function drawTower(p: p5, c: Ctx): void {
  const t = c.t
  const { a, cold } = ambient(t)
  const d: Draw = { p, k: c.k, ink: c.ink, w: c.weight, t, amb: a, cold }
  const { on, ember } = lamp(t)
  p.push()
  p.rectMode(p.CORNER)
  drawBag(d)
  drawGin(d)
  drawScaffold(d, on)
  drawSub(d)
  drawSkirt(d)
  drawDeck(d, on)
  drawSpeakers(d)
  drawTurntable(d, on)
  drawBox(d)
  drawLamp(d, on, ember)
  drawBoothLight(d, on)
  drawLead(d)
  p.pop()
}

export function drawTowerOver(p: p5, c: Ctx): void {
  const { a, cold } = ambient(c.t)
  const d: Draw = { p, k: c.k, ink: c.ink, w: c.weight, t: c.t, amb: a, cold }
  p.push()
  p.rectMode(p.CORNER)
  drawBucket(d)
  p.pop()
}

export { L1, L2, L3 }
