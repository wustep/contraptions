import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { drawDeck, shellHalf } from '../cast'
import { box, carried, hash, knock, lastOf, lookFrom, looks, part, type Ctx, type Look } from '../kit'
import { pulse, SEAM } from '../music'
import { VALLEY } from '../worlds'
import { LIFT_AT, LIFT_EXIT, SHELL_H, SHELL_W, SHELL_X, SLOT_W } from './geo'
import {
  ARM,
  ARM_W,
  EXT,
  extAt,
  BEAM_T,
  BELLY_Y,
  CX,
  DECK,
  FOLDED,
  FOOT,
  ianX,
  LATCHES,
  liftOff,
  louiseX,
  MEAD,
  PLATE_BOT,
  riseAt,
  stagesAt,
  STAGES,
  STRIKES_LIFT,
} from './lift-motion'

/**
 * The scissor lift (43.758 → 65.985): the film's hydraulic lift, which carries Louise and Ian up out of the camp,
 * through the band of fog under the shell's belly, and into the slot.
 *
 * A low trailer stands on the meadow under the slot on its jacks, its hydraulic power unit at one end; in its well, a
 * tower of seven scissor stages folded flat under the deck. The pump starts on 43.758: the engine catches, the jacks
 * bite and the first stage goes. The stages open one after another from the bottom, each its own X on its own ram: a
 * surge, the ram hitting the end of its stroke (a sharp stop, a small bounce), the latch, the settle, and the next.
 * The fourth strains under the fog and surges up through it on the lift's burst, out on 54.509, under the belly, dark
 * and vast. The last stages slow; the top one takes them up into the dark of the slot at 0.55 cells a second, which
 * is the cut.
 *
 * The part's frame: the ball's rest line on the deck at its lowest is y = 0 (the deck's top 1 cell over the meadow);
 * the meadow is y = MEAD. The valley's set (sky, meadow, the shell and its slot, the fog) is the valley builder's; the
 * lift draws only itself and what it does, hidden behind the shell's belly where it goes up into it.
 */

interface LiftState {
  begin: number
}

/* ------------------------------------------------------------------ the trailer's measures */

/** The trailer's side: its ends, its top (just under the deck at rest) and its bottom. */
const CH_X0 = DECK[0] - 0.1
const CH_X1 = CX + 2.6
const CH_TOP = FOOT - 0.62
const CH_BOT = FOOT + 0.1
/** The power unit on the trailer's far end, and its exhaust stack. */
const PU_X0 = CX + 1.55
const PU_X1 = CX + 2.5
const PU_TOP = CH_TOP - 0.72
const STACK_X = CX + 2.3
const STACK_TOP = PU_TOP - 0.5
/** The wheels: a tandem pair under the power unit. */
const WHEELS = [CX + 1.75, CX + 2.28]
const WHEEL_R = 0.23
/** The jacks: one at each end, a housing on the trailer and a foot on the meadow. */
const JACKS = [CH_X0 + 0.08, CH_X1 + 0.3]
/** The beams between stages: as long as the deck's plate. */
const BEAM_HALF = 1.2
/** The arms as drawn (a little stouter than the gap they fold into: the folded pack is drawn as one). */
const ARM_DRAW = 0.085
/** Where a stage's ram is fixed on the beam under it, and how far along its near arm it pushes. */
const RAM_FOOT = -0.9
const RAM_AT = 0.55
const BARREL = 0.9

/** The slot's mouth in this frame: its sides, and how deep the set draws its dark (drawShell's). */
const SLOT_L = SHELL_X - SLOT_W / 2 - LIFT_AT[0]
const SLOT_R = SHELL_X + SLOT_W / 2 - LIFT_AT[0]
const SLOT_DEEP = 0.9

/** The belly's underside at `x` (this frame): the shell's outline, from `shellHalf`. */
function bellyAt(x: number): number {
  const d = Math.abs(x + LIFT_AT[0] - SHELL_X)
  if (d >= SHELL_W * 0.5) return -Infinity
  // shellHalf falls from its widest to 0 at the belly (u = 1): find where it is `d` wide on that side.
  let lo = 0.55
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (shellHalf(mid) * SHELL_W > d) lo = mid
    else hi = mid
  }
  return BELLY_Y - (1 - (lo + hi) / 2) * SHELL_H
}
/** The belly's outline over the lift, sampled once (the shell never moves while the lift is there). */
const BELLY_LINE: Pt[] = (() => {
  const out: Pt[] = []
  for (let x = -14; x <= 14.001; x += 0.25) out.push([x, bellyAt(x)])
  return out
})()

/** Everything below the belly, and up into the slot's mouth: where the lift can be seen. */
function clipBelly(p: p5, k: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.moveTo(-14 * k, 40 * k)
  let inSlot = false
  for (const [x, y] of BELLY_LINE) {
    if (x > SLOT_L && x < SLOT_R) {
      if (!inSlot) {
        ctx.lineTo(SLOT_L * k, bellyAt(SLOT_L) * k)
        ctx.lineTo(SLOT_L * k, (BELLY_Y - SLOT_DEEP) * k)
        ctx.lineTo(SLOT_R * k, (BELLY_Y - SLOT_DEEP) * k)
        ctx.lineTo(SLOT_R * k, bellyAt(SLOT_R) * k)
        inSlot = true
      }
      continue
    }
    ctx.lineTo(x * k, (Number.isFinite(y) ? y : -200) * k)
  }
  ctx.lineTo(14 * k, 40 * k)
  ctx.closePath()
  ctx.clip()
}

/* ------------------------------------------------------------------ drawing helpers */

type Painter = { p: p5; k: number; ink: string; w: number }

function quad(d: Painter, pts: Pt[], fill: string | p5.Color, w = d.w): void {
  const { p, k } = d
  p.stroke(d.ink)
  p.strokeWeight(w)
  p.fill(fill as string)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A flat bar of thickness `th` from `a` to `b`, outlined. */
function bar(d: Painter, a: Pt, b: Pt, th: number, fill: string, w = d.w): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = (-dy / l) * th * 0.5
  const ny = (dx / l) * th * 0.5
  quad(d, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], fill, w)
}

function pin(d: Painter, at: Pt, r: number, fill: string): void {
  const { p, k } = d
  p.stroke(d.ink)
  p.strokeWeight(d.w * 0.7)
  p.fill(fill)
  p.circle(at[0] * k, at[1] * k, r * 2 * k)
}

/* ------------------------------------------------------------------ the tower */

interface StageShape {
  /** Its foot and its top (the beam it lifts, or the deck's underside). */
  bot: number
  top: number
  /** The half-span of its X, and how far it has opened (its rise). */
  half: number
  open: number
}

/** Every stage's X, bottom to top, for the tower as it stands at `t`. */
function towerAt(t: number): StageShape[] {
  const open = stagesAt(t)
  const out: StageShape[] = []
  let y = FOOT - liftOff(t)
  for (let i = 0; i < STAGES; i++) {
    const hx = FOLDED + open[i]
    const v = Math.max(0, Math.min(ARM * 0.995, hx - ARM_W))
    out.push({ bot: y, top: y - hx, half: Math.sqrt(ARM * ARM - v * v) / 2, open: open[i] })
    y -= hx + BEAM_T
  }
  return out
}

/** The arms: bare steel, the near one catching the light, the far one in its shade. */
const ARM_NEAR = mixHex(VALLEY.steel, VALLEY.cloud, 0.12)
const ARM_FAR = mixHex(VALLEY.steel, VALLEY.steelDark, 0.6)

/** A stage still folded flat: part of the pack under the deck. */
const FLAT = 0.04

function drawStage(d: Painter, s: StageShape, i: number, t: number): void {
  const th = ARM_DRAW
  const yb = s.bot - th / 2
  const yt = s.top + th / 2
  const l0: Pt = [CX - s.half, yb]
  const r0: Pt = [CX + s.half, yb]
  const l1: Pt = [CX - s.half, yt]
  const r1: Pt = [CX + s.half, yt]
  const mid: Pt = [CX, (yb + yt) / 2]
  // The far arm, then the ram (behind the near arm, in front of the far one), then the near arm.
  bar(d, r0, l1, th, ARM_FAR, d.w * 0.8)
  const foot: Pt = [CX + RAM_FOOT, s.bot - 0.02]
  const head: Pt = [l0[0] + (r1[0] - l0[0]) * RAM_AT, l0[1] + (r1[1] - l0[1]) * RAM_AT]
  const len = Math.hypot(head[0] - foot[0], head[1] - foot[1])
  const ux = (head[0] - foot[0]) / len
  const uy = (head[1] - foot[1]) / len
  const bl = Math.min(BARREL, len - 0.08)
  const rodEnd: Pt = [foot[0] + ux * bl, foot[1] + uy * bl]
  bar(d, rodEnd, head, 0.04, mixHex(VALLEY.steel, VALLEY.slotLight, 0.35), d.w * 0.6)
  bar(d, foot, rodEnd, 0.095, VALLEY.steelDark, d.w * 0.7)
  pin(d, foot, 0.04, VALLEY.steelDark)
  bar(d, l0, r1, th, ARM_NEAR, d.w * 0.85)
  pin(d, head, 0.03, VALLEY.steel)
  pin(d, mid, 0.045, VALLEY.steel)
  for (const q of [l0, r0, l1, r1]) pin(d, q, 0.032, VALLEY.steelDark)
  // The latch: a short pawl by the X's right foot, cocked while the stage opens, snapping down as it latches.
  if (i < STAGES - 1) {
    const since = t - LATCHES[i]
    const down = since < 0 ? 0 : 1 - Math.exp(-since / 0.05) * Math.cos(Math.min(Math.PI, since * 30))
    const a = -1.0 + 1.0 * Math.min(1.15, down)
    // Hung from the beam over it, never past the beam's end (a stage barely open spreads its X wider than the beam).
    const base: Pt = [CX + Math.min(s.half + 0.1, BEAM_HALF - 0.03), s.top + 0.01]
    const tip: Pt = [base[0] + Math.cos(a) * 0.17, base[1] - Math.sin(a) * 0.17 + 0.025]
    bar(d, base, tip, 0.035, VALLEY.steelDark, d.w * 0.6)
  }
}

function beam(d: Painter, y: number): void {
  quad(d, [[CX - BEAM_HALF, y - BEAM_T], [CX + BEAM_HALF, y - BEAM_T], [CX + BEAM_HALF, y], [CX - BEAM_HALF, y]], VALLEY.steelDark, d.w * 0.7)
}

/**
 * The tower: the stages that have opened, each an X on its ram with a beam over it, and on top of them the stages
 * still folded, as one flat pack under the deck (their arms lying flat, a line where each beam is).
 */
function drawTower(d: Painter, t: number): StageShape[] {
  const tower = towerAt(t)
  let flat = STAGES
  while (flat > 0 && tower[flat - 1].open < FLAT) flat--
  for (let i = 0; i < flat; i++) {
    drawStage(d, tower[i], i, t)
    if (i < STAGES - 1) beam(d, tower[i].top)
  }
  if (flat < STAGES) {
    const bot = tower[flat].bot
    const top = tower[STAGES - 1].top
    const half = ARM / 2 + ARM_DRAW / 2
    quad(d, [[CX - half, top], [CX + half, top], [CX + half, bot], [CX - half, bot]], ARM_NEAR, d.w * 0.85)
    const { p, k } = d
    p.stroke(mixHex(d.ink, ARM_NEAR, 0.35))
    p.strokeWeight(d.w * 0.55)
    for (let i = flat; i < STAGES - 1; i++) {
      const y = tower[i].top - BEAM_T / 2
      p.line((CX - half) * k, y * k, (CX + half) * k, y * k)
    }
    // The pins at the pack's ends, one pair for the whole pack: where the arms' ends ride.
    for (const x of [CX - ARM / 2, CX + ARM / 2]) pin(d, [x, (top + bot) / 2], Math.min(0.045, (bot - top) * 0.3), VALLEY.steelDark)
  }
  return tower
}

/**
 * The deck's roll-out extension: a plate out past the deck's left end with its own end post and rails, which run
 * back inside the deck's as it rolls in. Drawn before the deck, which covers it where they overlap.
 */
function drawExtension(d: Painter, t: number): void {
  const out = extAt(t)
  const x0 = DECK[0] - EXT * out
  if (out <= 0.001) return
  const { p, k } = d
  const top = R
  p.push()
  p.stroke(mixHex(d.ink, VALLEY.steel, 0.35))
  p.strokeWeight(d.w * 0.9)
  const post = x0 + 0.06
  const rail = 1.05
  p.line(post * k, top * k, post * k, (top - rail) * k)
  p.line(post * k, (top - rail) * k, (DECK[0] + 0.1) * k, (top - rail) * k)
  p.line(post * k, (top - rail * 0.5) * k, (DECK[0] + 0.1) * k, (top - rail * 0.5) * k)
  p.pop()
  quad(d, [[x0, top], [DECK[0] + 0.2, top], [DECK[0] + 0.2, top + 0.1], [x0, top + 0.1]], mixHex(VALLEY.steel, d.ink, 0.1))
}

/* ------------------------------------------------------------------ the trailer */

function drawTrailer(d: Painter, t: number, begin: number): void {
  const { p, k } = d
  const lift = liftOff(t)
  const X = (x: number) => x * k
  // The jacks: a housing fixed to the trailer (it rises with it as they bite), the rod down to the foot on the meadow.
  for (const jx of JACKS) {
    const top = CH_TOP + 0.08 - lift
    const hb = CH_BOT + 0.02 - lift
    // The outrigger arm from the trailer out to the far jack.
    if (jx > CH_X1) quad(d, [[CH_X1 - 0.05, CH_TOP + 0.12 - lift], [jx + 0.09, CH_TOP + 0.12 - lift], [jx + 0.09, CH_TOP + 0.3 - lift], [CH_X1 - 0.05, CH_TOP + 0.3 - lift]], VALLEY.oliveDark)
    bar(d, [jx, hb - 0.05], [jx, MEAD - 0.05], 0.06, VALLEY.steel, d.w * 0.6)
    quad(d, [[jx - 0.08, top], [jx + 0.08, top], [jx + 0.08, hb], [jx - 0.08, hb]], VALLEY.oliveDark)
    quad(d, [[jx - 0.2, MEAD - 0.06], [jx + 0.2, MEAD - 0.06], [jx + 0.22, MEAD], [jx - 0.22, MEAD]], VALLEY.steelDark, d.w * 0.8)
  }
  // The wheels, off the meadow by what the jacks have lifted it.
  for (const wx of WHEELS) {
    const wy = MEAD - WHEEL_R - lift
    p.stroke(d.ink)
    p.strokeWeight(d.w)
    p.fill(d.ink)
    p.circle(X(wx), X(wy), X(WHEEL_R * 2))
    p.fill(VALLEY.steelDark)
    p.strokeWeight(d.w * 0.6)
    p.circle(X(wx), X(wy), X(WHEEL_R * 1.05))
    p.fill(VALLEY.steel)
    p.circle(X(wx), X(wy), X(0.07))
  }
  // The side of the trailer, in front of the tower's foot: the well the stages fold down into.
  quad(d, [[CH_X0, CH_TOP - lift], [CH_X1, CH_TOP - lift], [CH_X1, CH_BOT - 0.05 - lift], [CH_X1 - 0.08, CH_BOT - lift], [CH_X0 + 0.08, CH_BOT - lift], [CH_X0, CH_BOT - 0.05 - lift]], VALLEY.oliveDark)
  // Its top flange, and a few ribs down the side.
  p.stroke(mixHex(d.ink, VALLEY.oliveDark, 0.3))
  p.strokeWeight(d.w * 0.6)
  p.line(X(CH_X0 + 0.04), X(CH_TOP + 0.08 - lift), X(CH_X1 - 0.04), X(CH_TOP + 0.08 - lift))
  for (const rx of [CX - 1.0, CX - 0.35, CX + 0.3, CX + 0.95]) p.line(X(rx), X(CH_TOP + 0.14 - lift), X(rx), X(CH_BOT - 0.1 - lift))
  // The fender over the wheels.
  quad(d, [[WHEELS[0] - WHEEL_R - 0.08, CH_BOT - 0.2 - lift], [WHEELS[1] + WHEEL_R + 0.08, CH_BOT - 0.2 - lift], [WHEELS[1] + WHEEL_R + 0.08, CH_BOT - 0.12 - lift], [WHEELS[0] - WHEEL_R - 0.08, CH_BOT - 0.12 - lift]], VALLEY.olive, d.w * 0.7)

  // The power unit: the engine and pump in their box, a louvred side, the stack. It rocks back as the engine catches,
  // shivers while it runs, and its flap jumps on every hard stroke.
  const puffs = puffTimes(begin)
  const { ago } = lastOf(puffs, t)
  const run = t > begin && t < begin + 23.5
  const caught = t - begin
  const rock = run ? -0.045 * Math.exp(-caught / 0.35) * Math.sin((2 * Math.PI * caught) / 0.3) - 0.012 * knock(ago, 0.1) + 0.003 * Math.sin(t * 41) : 0
  p.push()
  p.translate(X(PU_X0), X(CH_TOP - lift))
  p.rotate(rock)
  p.translate(-X(PU_X0), -X(CH_TOP - lift))
  quad(d, [[PU_X0, PU_TOP - lift], [PU_X1, PU_TOP - lift], [PU_X1, CH_TOP - lift], [PU_X0, CH_TOP - lift]], VALLEY.olive)
  p.stroke(mixHex(d.ink, VALLEY.olive, 0.25))
  p.strokeWeight(d.w * 0.6)
  for (let j = 0; j < 4; j++) {
    const ly = PU_TOP + 0.16 + j * 0.1 - lift
    p.line(X(PU_X0 + 0.14), X(ly), X(PU_X0 + 0.5), X(ly))
  }
  // Its run lamp, the generator's kind: dark until she is on the deck and the engine catches under her, then lit.
  p.noStroke()
  p.fill(run ? VALLEY.lamp : mixHex(VALLEY.steelDark, d.ink, 0.4))
  p.rect(X(PU_X0 + 0.58), X(PU_TOP + 0.15 - lift), X(0.1), X(0.1))
  // The hydraulic tank on its end, and the hose from the pump down into the well.
  quad(d, [[PU_X1 - 0.3, PU_TOP + 0.1 - lift], [PU_X1 - 0.08, PU_TOP + 0.1 - lift], [PU_X1 - 0.08, CH_TOP - 0.05 - lift], [PU_X1 - 0.3, CH_TOP - 0.05 - lift]], VALLEY.steelDark, d.w * 0.7)
  p.noFill()
  p.stroke(d.ink)
  p.strokeWeight(Math.max(d.w, 0.05 * k))
  p.bezier(X(PU_X0), X(CH_TOP - 0.2 - lift), X(PU_X0 - 0.3), X(CH_TOP - 0.2 - lift), X(PU_X0 - 0.35), X(CH_TOP + 0.05 - lift), X(PU_X0 - 0.45), X(CH_TOP + 0.12 - lift))
  // The stack, and its flap.
  bar(d, [STACK_X, PU_TOP + 0.02 - lift], [STACK_X, STACK_TOP - lift], 0.07, VALLEY.steelDark, d.w * 0.7)
  const flap = run ? 0.25 + 1.0 * knock(ago, 0.12) + 0.08 * Math.sin(t * 38) : 0
  const fx = STACK_X - 0.05
  const fy = STACK_TOP - lift
  bar(d, [fx, fy], [fx + Math.cos(-flap) * 0.14, fy + Math.sin(-flap) * 0.14], 0.025, VALLEY.steelDark, d.w * 0.6)
  p.pop()
}

/** The pump's puffs at the stack: the engine catching, and every hard stroke while it works. */
function puffTimes(begin: number): number[] {
  return STRIKES_LIFT.filter((t) => t >= begin && t < begin + 23)
}

/** A soft lobe of air, dense in the middle and nothing at its edge (never a disc): `rgb` as "r, g, b". */
function lobe(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, rgb: string, a: number): void {
  if (a <= 0.004 || rx * k < 0.8) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(0.4, `rgba(${rgb}, ${a * 0.7})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}
const rgbOf = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
const EXHAUST = rgbOf(mixHex(VALLEY.cloudShade, VALLEY.steelDark, 0.55))

/** The engine's breath at the stack: a soft grey puff on each hard stroke, drawn out and thinned by the air. */
function drawExhaust(p: p5, k: number, t: number, begin: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const lift = liftOff(t)
  for (const at of puffTimes(begin)) {
    const age = t - at
    if (age < 0 || age > 2.4) continue
    const u = age / 2.4
    const big = at === begin ? 1.5 : 1
    for (let j = 0; j < 3; j++) {
      const a = age - j * 0.07
      if (a <= 0) continue
      const r = (0.07 + 0.26 * Math.sqrt(a)) * big * (0.8 + 0.35 * hash(j, Math.round(at * 100), 5))
      const x = STACK_X + a * 0.5 + j * 0.05
      const y = STACK_TOP - lift - 0.06 - a * 0.55 - j * 0.04
      lobe(ctx, k, x, y, r * 1.5, r, EXHAUST, (at === begin ? 0.55 : 0.42) * (1 - u) * (1 - u) * (1 - 0.25 * j))
    }
  }
}

/**
 * What of the lift has gone up into the slot goes into its dark: from the belly's line up, the slot's own black, deeper
 * the higher. Only while the rail is up in it (the balls are drawn after, and stay lit by the day below).
 */
function intoTheDark(ctx: CanvasRenderingContext2D, k: number, deck: number): void {
  const railTop = deck + R - 1.05
  const inside = smoothUp(BELLY_Y - railTop, 0, 0.35)
  if (inside <= 0.001) return
  const g = ctx.createLinearGradient(0, BELLY_Y * k, 0, (BELLY_Y - SLOT_DEEP) * k)
  const dark = rgbOf(VALLEY.slot)
  g.addColorStop(0, `rgba(${dark}, 0)`)
  g.addColorStop(0.3, `rgba(${dark}, ${0.3 * inside})`)
  g.addColorStop(1, `rgba(${dark}, ${0.9 * inside})`)
  ctx.fillStyle = g
  ctx.fillRect(SLOT_L * k, (BELLY_Y - SLOT_DEEP) * k, (SLOT_R - SLOT_L) * k, SLOT_DEEP * k)
}

/* ------------------------------------------------------------------ the part */

function drawLift(p: p5, s: LiftState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const d: Painter = { p, k, ink, w: weight }
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  clipBelly(p, k)
  const tower = drawTower(d, t)
  drawTrailer(d, t, s.begin)
  // The deck, on the top stage.
  const top = tower[STAGES - 1].top
  p.push()
  p.translate(0, (top - PLATE_BOT) * k)
  drawExtension(d, t)
  // The work light on the far post is the shaft's (it lights it in the mouth); here it is dark, so the deck is one deck.
  drawDeck(p, k, DECK[0], DECK[1], { ink, weight, lamp: { on: 0, switchAt: 0.49 } })
  p.pop()
  intoTheDark(ctx, k, top - PLATE_BOT)
  ctx.restore()
  drawExhaust(p, k, t, s.begin)
  p.pop()
}

/* ------------------------------------------------------------------ the fog it goes through */

/** The band of fog under the belly (the set draws it, 7 to 9 over the meadow): its underside, in this frame. */
const BAND_LO = MEAD - 7
/** The moment the deck tears free of the fog: the lift's burst's hardest pulse. */
const TEAR = pulse(228)
const FOGGY = rgbOf(VALLEY.fog)
/** The torn fog's underside, in its own shadow: what gives it a shape against a sky as pale as it is. */
const FOG_UNDER = rgbOf(mixHex(VALLEY.cloudShade, VALLEY.ridge, 0.25))

/** The fog the deck drags up through the band with it: where each lobe sits on the deck, its size and weight. */
const CLING: { x: number; y: number; rx: number; ry: number; a: number }[] = [
  // The envelope: wide and thin, round the whole deck.
  { x: CX - 0.7, y: 0.1, rx: 1.9, ry: 0.9, a: 0.45 },
  { x: CX + 0.8, y: -0.2, rx: 1.8, ry: 0.95, a: 0.45 },
  // Under the plate, carried on it.
  { x: DECK[0] + 0.25, y: 0.42, rx: 0.95, ry: 0.35, a: 0.8 },
  { x: CX, y: 0.48, rx: 1.15, ry: 0.36, a: 0.9 },
  { x: DECK[1] - 0.25, y: 0.42, rx: 0.95, ry: 0.35, a: 0.8 },
  // Round the two of them and the rail: what veils them.
  { x: DECK[0] + 0.35, y: -0.25, rx: 0.8, ry: 0.55, a: 0.85 },
  { x: CX - 0.15, y: -0.2, rx: 0.85, ry: 0.55, a: 0.8 },
  { x: DECK[1] - 0.35, y: -0.35, rx: 0.8, ry: 0.55, a: 0.85 },
  { x: CX - 0.5, y: -1.0, rx: 1.0, ry: 0.4, a: 0.7 },
  { x: CX + 0.6, y: -0.95, rx: 0.95, ry: 0.4, a: 0.7 },
  // Trailing off the plate's ends, down the tower.
  { x: DECK[0] - 0.1, y: 1.0, rx: 0.32, ry: 0.9, a: 0.6 },
  { x: DECK[1] + 0.1, y: 0.95, rx: 0.32, ry: 0.9, a: 0.6 },
]

/**
 * Going up through the band, the deck drags its fog up with it: it gathers round the plate and the rail as they go
 * into the band, thickest in its middle, veiling the two of them; on 54.509 the deck surges clear of it, and the fog
 * it carried tears off, flung up a little and out, shadowed underneath against the sky, thinning over half a second,
 * and what is left sinks back into the band.
 */
function drawCling(p: p5, k: number, t: number): void {
  if (t < 51 || t > TEAR + 3.5) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const torn = t > TEAR
  const rise = riseAt(torn ? TEAR : t)
  // How deep in the band the deck is: it gathers its fog once it is moving up through it (the plate past the band's
  // soft underside), full in its middle.
  const depth = smoothUp(-rise + R, BAND_LO - 0.35, BAND_LO - 1.3)
  if (depth <= 0.01) return
  const since = torn ? t - TEAR : 0
  // Flung up on the surge and spent at once; spreading off the deck and thinning over half a second; then what is left
  // drifts apart, sinks, and thins away.
  const up = torn ? 0.8 * (1 - Math.exp(-since / 0.12)) - 0.16 * since : 0
  const fade = torn ? (0.5 * Math.exp(-since / 0.75) + 0.5 * Math.exp(-since / 0.22)) * (1 - smoothUp(since, 1.8, 3.4)) : 1
  CLING.forEach((l, i) => {
    const swirl = 0.08 * Math.sin(t * 0.9 + i * 1.7)
    const out = torn ? (l.x - CX) * 0.8 * (1 - Math.exp(-since / 0.3)) : 0
    const x = l.x + swirl + out
    const trail = l.ry > l.rx
    const y = -rise + l.y + 0.05 * Math.sin(t * 1.3 + i) - (trail ? -0.4 * since : up)
    const grow = 1 + (torn ? 0.6 * (1 - Math.exp(-since / 0.6)) : 0)
    const a = 0.62 * l.a * depth * fade
    // Torn off, it is fog against sky: its underside in shadow, its top lit, so it reads as thrown.
    if (torn && !trail) lobe(ctx, k, x, y + l.ry * grow * 0.32, l.rx * grow * 0.92, l.ry * grow * 0.8, FOG_UNDER, a * 0.75)
    lobe(ctx, k, x, y, l.rx * grow, l.ry * grow, FOGGY, a)
  })
}

const smoothUp = (v: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

function overLift(p: p5, s: LiftState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const top = towerAt(t)[STAGES - 1].top
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  clipBelly(p, k)
  p.translate(0, (top - PLATE_BOT) * k)
  drawDeck(p, k, DECK[0], DECK[1], { ink, weight, over: true })
  ctx.restore()
  p.pop()
  drawCling(p, k, t)
}

/**
 * Where they look, riding the deck up: up at the belly they are rising to, through the fog, out of it and through the
 * look up at its dome, and back to their rolls before the cut into the shaft (where her eye already holds on the
 * screen across the camera's quarter turn).
 */
const LOOKS: Look[] = [{ from: 47.0, to: SEAM.shaft - 0.6, at: () => -Math.PI / 2 + 0.1 }]

export const lift = part<LiftState>(
  {
    name: 'lift',
    draw: drawLift,
    over: overLift,
  },
  (slot) => {
    const dur = slot.end - slot.begin
    if (Math.abs(slot.begin - SEAM.lift) > 1e-6 || Math.abs(slot.end - SEAM.shaft) > 1e-6) console.warn('logogram: the lift was timed to its own slot')
    // She rides the deck: where the tower puts it, and where she is along it.
    const at = (u: number): Pt => [louiseX(u + slot.begin), -riseAt(u + slot.begin)]
    const segs = carried(at, 0, dur, Math.ceil(dur * 60))
    return {
      cells: box(DECK[0] - 2, BELLY_Y - 2, JACKS[1] + 2, MEAD + 1),
      exit: LIFT_EXIT,
      lane: { segs, fire: 0 },
      state: { begin: slot.begin },
      riders: looks(LOOKS),
      company: [{ who: 'ian', from: slot.begin, to: slot.end, at: (t) => ({ x: ianX(t), y: -riseAt(t), look: (roll: number) => lookFrom(LOOKS, t, roll) }) }],
    }
  },
  (slot) => {
    const b = slot.begin
    return [
      // At rest on the deck as the pump starts, the seam's framing, held still through the first stage: it unfolds,
      // stops and latches across the frame.
      { t: b + 0.55, cells: 5, hold: [-0.1, -1.4] },
      { t: 45.45, cells: 5, hold: [-0.1, -1.4] },
      // Back to a locked-off wide: the meadow at its foot, the fog band across its top; the deck climbs across it.
      { t: 47.7, cells: 11, hold: [CX + 0.4, -3.3] },
      { t: 51.3, cells: 11, hold: [CX + 0.4, -3.3] },
      // Up to the fog's top, and hold there, the belly's lowest just in the top of the frame: the deck comes up out of
      // the fog on 54.509.
      { t: 53.3, cells: 8.5, hold: [CX, BELLY_Y + 3.6] },
      { t: 54.75, cells: 8.5, hold: [CX, BELLY_Y + 3.6] },
      // The look up: the belly over the whole frame, the lift a thread under it.
      { t: 58.6, cells: 26, hold: [CX, BELLY_Y + 3.4] },
      { t: 60.4, cells: 23, hold: [CX, BELLY_Y + 2.4] },
      // In for the cut: her centred, a little low, going up into the dark.
      { t: slot.end, cells: 4.5, w: 0, off: [0, -0.645] },
    ]
  },
)

export const LIFT_HITS: number[] = STRIKES_LIFT
