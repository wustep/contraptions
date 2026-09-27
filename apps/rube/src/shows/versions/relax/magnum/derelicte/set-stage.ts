import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import { bloom, rgba } from '../cast'
import { hash, type frame } from '../kit'
import { DERELICTE } from '../worlds'
import { FLOOR_Y, MUGATU_PERCH, PM_SEAT, RUNWAY, STEPS, WINGS } from './geo'
import { AIR, bankAt, BANKS_ON, CANOPY, HEAP, heapAt, hoistAt, LADDER_X } from './runway-clock'
import { MUGATU_LAMP, type Ink } from './set-hall'

/**
 * Mugatu's stage (the runway builder's): the runway of pallets and scaffold with its lit edge, the steps down off its
 * end, the curtain of bin bags at its head, the wings behind it and Mugatu's perch over them, the canopy over the
 * runway's end with its heap of bags hanging, and the Prime Minister's chair. Drawn in the runway's frame.
 */

type Frame = ReturnType<typeof frame>
const TOP = RUNWAY.top
const DECK = 0.25
const PALLET = mixHex(DERELICTE.cardboard, DERELICTE.roof, 0.6)
const PALLET_DARK = mixHex(DERELICTE.cardboard, DERELICTE.roof, 0.78)
const FACE = mixHex(DERELICTE.runway, DERELICTE.roof, 0.35)
const TUBE = mixHex(DERELICTE.steel, DERELICTE.roof, 0.35)
/** In the dark of the wings, the scaffold is hardly there. */
const TUBE_DARK = mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.45)

/** The runway's lit edge, in the banks' four sections: each comes on with its bank. */
const EDGE_SECTIONS = [RUNWAY.head - 0.4, 5.7, 10.7, 15.7, RUNWAY.end]

/* ------------------------------------------------------------------ the runway */

export function drawRunway(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  const x0 = Math.max(WINGS.x0 - 0.2, f.x0 - 1)
  const x1 = Math.min(RUNWAY.end, f.x1 + 1)
  if (x1 <= x0 || f.y0 > FLOOR_Y + 1 || f.y1 < TOP - 1) return
  p.push()
  p.rectMode(p.CORNER)
  // The body: pallets stacked on their sides between scaffold tubes; the dark under them.
  p.noStroke()
  p.fill(FACE)
  p.rect(X(x0), X(TOP + DECK), X(x1 - x0), X(FLOOR_Y - TOP - DECK))
  const lay = 0.36
  for (let row = 0; row < 3; row++) {
    const y = TOP + DECK + 0.03 + row * lay
    for (let i = Math.floor((x0 - RUNWAY.head) / 1.2); i * 1.2 + RUNWAY.head < x1; i++) {
      const px = RUNWAY.head + i * 1.2 + (row % 2 ? 0.6 : 0)
      if (px + 1.2 < x0 || px > x1 || px < WINGS.curtain - 0.05) continue
      const w = Math.min(1.16, RUNWAY.end - px - 0.02)
      if (w <= 0.1) continue
      solid(p, ink.ink, ink.weight * 0.35, row === 0 ? PALLET : PALLET_DARK)
      p.rect(X(px + 0.02), X(y), X(w), X(0.07))
      p.rect(X(px + 0.02), X(y + lay - 0.1), X(w), X(0.07))
      p.noStroke()
      p.fill(row === 0 ? PALLET_DARK : mixHex(PALLET_DARK, DERELICTE.roof, 0.4))
      for (const b of [0.06, 0.53, 1.0]) if (b + 0.12 < w) p.rect(X(px + 0.02 + b), X(y + 0.07), X(0.12), X(lay - 0.17))
      // Newspaper pasted over a few of them: a pale sheet, a fold's shade.
      if (row === 0 && hash(i, 7) > 0.72) {
        p.fill(rgba(DERELICTE.paper, 0.16))
        p.quad(X(px + 0.2), X(y + 0.05), X(px + 0.7), X(y + 0.02), X(px + 0.76), X(y + lay - 0.06), X(px + 0.24), X(y + lay - 0.03))
        p.fill(rgba(DERELICTE.paperShade, 0.12))
        p.triangle(X(px + 0.5), X(y + 0.035), X(px + 0.7), X(y + 0.02), X(px + 0.73), X(y + lay * 0.5))
      }
    }
  }
  // Scaffold tubes: uprights every 2.4 cells, and a ledger.
  p.stroke(TUBE)
  p.strokeWeight(Math.max(1, X(0.07)))
  for (let x = RUNWAY.head + 0.2; x <= RUNWAY.end; x += 2.4) if (x > x0 - 0.2 && x < x1 + 0.2) p.line(X(x), X(TOP + DECK), X(x), X(FLOOR_Y))
  p.line(X(Math.max(x0, WINGS.curtain)), X(TOP + DECK + 3 * lay + 0.08), X(x1), X(TOP + DECK + 3 * lay + 0.08))
  // The deck, and the wings' platform on its level (unlit).
  solid(p, ink.ink, ink.weight, DERELICTE.runway)
  p.rect(X(Math.max(x0, WINGS.curtain)), X(TOP), X(x1 - Math.max(x0, WINGS.curtain)), X(DECK))
  if (x0 < WINGS.curtain) {
    solid(p, ink.ink, ink.weight * 0.8, mixHex(DERELICTE.runway, DERELICTE.roof, 0.5))
    p.rect(X(x0), X(TOP), X(WINGS.curtain - x0), X(DECK))
    // The wings' front, masked with corrugated sheet.
    p.noStroke()
    p.fill(mixHex(DERELICTE.corrugated, DERELICTE.roof, 0.86))
    p.rect(X(x0), X(TOP + DECK), X(WINGS.curtain - x0), X(FLOOR_Y - TOP - DECK))
    p.stroke(mixHex(DERELICTE.corrugated, DERELICTE.roof, 0.74))
    p.strokeWeight(Math.max(1, X(0.03)))
    for (let x = Math.ceil(x0 / 0.22) * 0.22; x < WINGS.curtain; x += 0.22) p.line(X(x), X(TOP + DECK + 0.02), X(x), X(FLOOR_Y))
  }
  p.pop()
  // Its lit edge, a section at a time as the banks come up.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (let i = 0; i < 4; i++) {
    const a = Math.min(1, bankAt(i, t))
    if (a <= 0) continue
    const s0 = Math.max(EDGE_SECTIONS[i], x0)
    const s1 = Math.min(EDGE_SECTIONS[i + 1], x1)
    if (s1 <= s0) continue
    const g = ctx.createLinearGradient(0, X(TOP - 0.1), 0, X(TOP + 0.12))
    g.addColorStop(0, rgba(DERELICTE.runwayEdge, 0))
    g.addColorStop(0.45, rgba(DERELICTE.runwayEdge, 0.35 * a))
    g.addColorStop(0.55, rgba(DERELICTE.runwayEdge, 0.35 * a))
    g.addColorStop(1, rgba(DERELICTE.runwayEdge, 0))
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(X(s0), X(TOP - 0.1), X(s1 - s0), X(0.22))
    ctx.restore()
    p.push()
    p.stroke(rgba(DERELICTE.runwayEdge, 0.95 * a))
    p.strokeWeight(Math.max(1, X(0.03)))
    p.line(X(s0), X(TOP + 0.01), X(s1), X(TOP + 0.01))
    p.pop()
  }
}

/** The steps down off the runway's end: crates, their treads' edges lit. */
export function drawSteps(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  if (STEPS.x1 < f.x0 - 1 || STEPS.x0 > f.x1 + 1) return
  const rise = (FLOOR_Y - TOP) / STEPS.n
  const run = (STEPS.x1 - STEPS.x0) / STEPS.n
  p.push()
  p.rectMode(p.CORNER)
  for (let i = 0; i < STEPS.n - 1; i++) {
    const x = STEPS.x0 + i * run
    const y = TOP + (i + 1) * rise
    solid(p, ink.ink, ink.weight * 0.7, i % 2 ? mixHex(DERELICTE.cardboard, DERELICTE.roof, 0.72) : mixHex(DERELICTE.cardboard, DERELICTE.roof, 0.64))
    p.rect(X(x), X(y), X(run), X(FLOOR_Y - y))
    // A crate's slats.
    p.stroke(rgba(DERELICTE.roof, 0.45))
    p.strokeWeight(Math.max(1, X(0.02)))
    for (let j = 1; j * 0.25 < FLOOR_Y - y; j++) p.line(X(x + 0.03), X(y + j * 0.25), X(x + run - 0.03), X(y + j * 0.25))
  }
  // Each tread's front edge lit, like the runway's.
  const a = Math.min(1, bankAt(3, t))
  if (a > 0) {
    p.stroke(rgba(DERELICTE.runwayEdge, 0.8 * a))
    p.strokeWeight(Math.max(1, X(0.03)))
    for (let i = 0; i < STEPS.n - 1; i++) p.line(X(STEPS.x0 + i * run), X(TOP + (i + 1) * rise + 0.01), X(STEPS.x0 + (i + 1) * run), X(TOP + (i + 1) * rise + 0.01))
  }
  p.pop()
}

/* ------------------------------------------------------------------ the chain-link */

/** A panel of chain-link on a steel frame behind the runway's head: the collection's fence, lit from below. */
const FENCE = { x0: 1.55, x1: 5.05, top: -3.2 }
export function drawFence(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  if (FENCE.x1 < f.x0 - 0.5 || FENCE.x0 > f.x1 + 0.5 || FENCE.top > f.y1) return
  const lit = Math.min(1, bankAt(0, t))
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(FENCE.x0), X(FENCE.top), X(FENCE.x1 - FENCE.x0), X(TOP - FENCE.top))
  ctx.clip()
  // The mesh: two sets of thin diagonals, fading up away from the runway's light.
  const cell = 0.2
  if (cell * k > 4) {
    const g = ctx.createLinearGradient(0, X(TOP), 0, X(FENCE.top))
    g.addColorStop(0, rgba(DERELICTE.chain, 0.2 + 0.25 * lit))
    g.addColorStop(1, rgba(DERELICTE.chain, 0.06))
    ctx.strokeStyle = g
    ctx.lineWidth = Math.max(0.8, X(0.012))
    ctx.beginPath()
    const h = TOP - FENCE.top
    for (let x = FENCE.x0 - h; x < FENCE.x1 + h; x += cell) {
      ctx.moveTo(X(x), X(TOP))
      ctx.lineTo(X(x + h), X(FENCE.top))
      ctx.moveTo(X(x + h), X(TOP))
      ctx.lineTo(X(x), X(FENCE.top))
    }
    ctx.stroke()
  } else {
    ctx.fillStyle = rgba(DERELICTE.chain, 0.08 + 0.06 * lit)
    ctx.fillRect(X(FENCE.x0), X(FENCE.top), X(FENCE.x1 - FENCE.x0), X(TOP - FENCE.top))
  }
  ctx.restore()
  // Its frame.
  p.noFill()
  p.stroke(mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.2))
  p.strokeWeight(Math.max(1, X(0.06)))
  p.rectMode(p.CORNER)
  p.rect(X(FENCE.x0), X(FENCE.top), X(FENCE.x1 - FENCE.x0), X(TOP - FENCE.top))
  p.line(X((FENCE.x0 + FENCE.x1) / 2), X(FENCE.top), X((FENCE.x0 + FENCE.x1) / 2), X(TOP))
  void ink
  p.pop()
}

/* ------------------------------------------------------------------ the curtain */

const CURTAIN = { x0: WINGS.curtain - 0.42, x1: WINGS.curtain + 0.4, header: -3.75 }
/** The curtain's hem: the runway's deck down, hoisted up to under its header. */
const hemAt = (t: number) => TOP - (TOP - (CURTAIN.header + 1.4)) * hoistAt(t)

/** The light from the first bank, leaking round the curtain before it goes up. */
export function drawCurtainLeak(p: p5, k: number, t: number): void {
  const a = Math.min(1, bankAt(0, t))
  if (a <= 0) return
  const up = hoistAt(t)
  bloom(p, k, [CURTAIN.x1 + 0.25, -1.4], 1.9, DERELICTE.spot, 0.12 * a * (1 - 0.5 * up))
  bloom(p, k, [CURTAIN.x0 - 0.1, hemAt(t) + 0.05], 0.9, DERELICTE.spot, 0.1 * a * (1 - up))
}

/** The curtain of black bin bags at the runway's head: hoisted in three jerks on the trigger, and left up. */
export function drawCurtain(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  if (CURTAIN.x1 + 1 < f.x0 || CURTAIN.x0 - 1 > f.x1) return
  const tw = AIR(t)
  const hem = hemAt(t)
  const up = hoistAt(t)
  const n = 6
  const sw = (CURTAIN.x1 - CURTAIN.x0) / n
  p.push()
  for (let i = 0; i < n; i++) {
    const cx = CURTAIN.x0 + sw * (i + 0.5)
    const sway = 0.025 * Math.sin(tw * 0.8 + i * 1.7) + 0.05 * up * Math.sin(tw * 2 + i) * Math.exp(-Math.max(0, t - 123.1) / 1.2)
    const bulge = sw * (0.62 + 0.55 * up)
    const bot = hem + 0.06 * Math.sin(i * 2.3)
    solid(p, ink.ink, ink.weight * 0.45, i % 2 ? DERELICTE.bag : mixHex(DERELICTE.bag, DERELICTE.bagSheen, 0.25))
    p.beginShape()
    p.vertex(X(cx - sw * 0.55), X(CURTAIN.header))
    p.bezierVertex(X(cx - bulge - 0.02), X(CURTAIN.header + (bot - CURTAIN.header) * 0.4), X(cx - sw * 0.5 + sway), X(bot - 0.2), X(cx - sw * 0.45 + sway), X(bot))
    p.vertex(X(cx + sw * 0.45 + sway), X(bot + 0.03))
    p.bezierVertex(X(cx + sw * 0.5 + sway), X(bot - 0.2), X(cx + bulge + 0.02), X(CURTAIN.header + (bot - CURTAIN.header) * 0.4), X(cx + sw * 0.55), X(CURTAIN.header))
    p.endShape(p.CLOSE)
    // A sheen down its fold, catching the light beyond.
    p.noFill()
    p.stroke(rgba(DERELICTE.bagSheen, 0.9))
    p.strokeWeight(Math.max(1, X(0.025)))
    p.line(X(cx + sw * 0.15 + sway * 0.5), X(CURTAIN.header + 0.25), X(cx + sw * 0.2 + sway), X(bot - 0.12))
  }
  // The header it hangs from: a scaffold tube's end, clamped.
  solid(p, ink.ink, ink.weight * 0.6, TUBE)
  p.rectMode(p.CORNER)
  p.rect(X(CURTAIN.x0 - 0.12), X(CURTAIN.header - 0.12), X(CURTAIN.x1 - CURTAIN.x0 + 0.24), X(0.12))
  p.pop()
}

/* ------------------------------------------------------------------ the wings and the perch */

const PERCH = { x0: -3.75, x1: -0.45, deck: MUGATU_PERCH[1] + 0.13 }

/** Mugatu's gantry over the wings: a scaffold with a deck and a rail, a ladder down. */
export function drawPerch(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  if (PERCH.x1 + 1 < f.x0 || PERCH.x0 - 1 > f.x1 || PERCH.deck - 1 > f.y1) return
  void t
  p.push()
  // The wings' dark: a black drape behind them, from the platform up into the roof's dark.
  p.noStroke()
  p.rectMode(p.CORNER)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(X(WINGS.x0 - 0.6), 0, X(WINGS.curtain - 0.3), 0)
  g.addColorStop(0, rgba(DERELICTE.roof, 0))
  g.addColorStop(0.2, rgba(DERELICTE.roof, 0.85))
  g.addColorStop(1, rgba(DERELICTE.roof, 0.92))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(X(WINGS.x0 - 0.6), X(-7), X(WINGS.curtain - 0.3 - WINGS.x0 + 0.6), X(7 + TOP))
  ctx.restore()
  p.stroke(rgba(DERELICTE.bagSheen, 0.35))
  p.strokeWeight(Math.max(1, X(0.02)))
  for (let x = WINGS.x0 + 0.25; x < WINGS.curtain - 0.4; x += 0.55) p.line(X(x), X(-6), X(x + 0.05 * Math.sin(x * 3)), X(TOP))
  // Legs and braces, down to the wings' platform.
  p.stroke(TUBE_DARK)
  p.strokeWeight(Math.max(1, X(0.07)))
  for (const x of [-3.62, -1.3]) p.line(X(x), X(PERCH.deck), X(x), X(TOP))
  p.strokeWeight(Math.max(1, X(0.045)))
  p.line(X(-3.62), X(PERCH.deck + 0.2), X(-1.3), X(TOP - 0.1))
  p.line(X(-3.62), X(TOP - 0.1), X(-1.3), X(PERCH.deck + 0.2))
  // The rail behind him.
  p.strokeWeight(Math.max(1, X(0.045)))
  for (const x of [-3.62, -2.1, -0.55]) p.line(X(x), X(PERCH.deck), X(x), X(PERCH.deck - 0.62))
  p.line(X(-3.62), X(PERCH.deck - 0.62), X(-0.55), X(PERCH.deck - 0.62))
  p.line(X(-3.62), X(PERCH.deck - 0.33), X(-0.55), X(PERCH.deck - 0.33))
  // The deck.
  solid(p, ink.ink, ink.weight * 0.8, DERELICTE.booth)
  p.rectMode(p.CORNER)
  p.rect(X(PERCH.x0), X(PERCH.deck), X(PERCH.x1 - PERCH.x0), X(0.14))
  // The ladder, down which he goes.
  p.stroke(TUBE_DARK)
  p.strokeWeight(Math.max(1, X(0.04)))
  const l0 = LADDER_X - 0.18
  const l1 = LADDER_X + 0.18
  p.line(X(l0), X(PERCH.deck - 0.5), X(l0), X(TOP))
  p.line(X(l1), X(PERCH.deck - 0.5), X(l1), X(TOP))
  p.strokeWeight(Math.max(1, X(0.03)))
  for (let y = PERCH.deck + 0.28; y < TOP - 0.05; y += 0.3) p.line(X(l0), X(y), X(l1), X(y))
  // His lamp, clamped to the rail's end, turned on whatever it is aimed at.
  const [mx, my] = MUGATU_LAMP.at
  const [ax, ay] = MUGATU_LAMP.aim(t)
  p.push()
  p.translate(X(mx), X(my))
  p.rotate(Math.atan2(ay - my, ax - mx))
  solid(p, ink.ink, ink.weight * 0.5, DERELICTE.booth)
  p.rectMode(p.CENTER)
  p.rect(X(0.08), 0, X(0.36), X(0.19), X(0.03))
  const on = Math.min(1, MUGATU_LAMP.on(t))
  p.noStroke()
  p.fill(mixHex(DERELICTE.booth, DERELICTE.spot, 0.15 + 0.8 * on))
  p.rect(X(0.27), 0, X(0.04), X(0.15))
  p.pop()
  p.pop()
  // His own dim light up there: a work lamp's glow on the rail.
  bloom(p, k, [-2.9, PERCH.deck - 0.9], 1.1, DERELICTE.fire, 0.07)
}

/* ------------------------------------------------------------------ the canopy */

/**
 * The canopy over the runway's end, the show's arch for the pose: two scaffold uprights hung with bags, a valance of
 * bags along its bar, and the heap's line: from the heap over a pulley in the bar, along it, and down the left upright
 * to a cleat.
 */
export function drawCanopy(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  if (CANOPY.x1 + 1 < f.x0 || CANOPY.x0 - 1 > f.x1 || CANOPY.top - 1 > f.y1) return
  const h = heapAt(t)
  const tw = AIR(t)
  const pulley = 17.95
  p.push()
  // The left upright shivers when he backs into it (about its foot), and the whole arch with it.
  const lean = h.knock
  const up = (y: number): [number, number] => [CANOPY.x0 + (TOP - y) * Math.sin(lean), y]
  const [lx, ly] = up(CANOPY.top)
  const tube = mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.3)
  p.stroke(tube)
  p.strokeWeight(Math.max(1, X(0.1)))
  p.line(X(CANOPY.x0), X(TOP), X(lx), X(ly))
  p.line(X(CANOPY.x1), X(TOP), X(CANOPY.x1), X(CANOPY.top))
  p.line(X(lx - 0.05), X(CANOPY.top), X(CANOPY.x1 + 0.05), X(CANOPY.top))
  // Bags hung down each upright's outer side, and the valance along the bar.
  const drape = (x: number, side: number, shiver: number) => {
    for (let i = 0; i < 3; i++) {
      const sx = x + side * (0.08 + i * 0.1)
      const len = 1.6 - i * 0.35 + 0.1 * Math.sin(i * 2.1)
      const sway = 0.02 * Math.sin(tw * 0.9 + i + x) + shiver * (1.5 - i * 0.3)
      solid(p, ink.ink, ink.weight * 0.4, i % 2 ? DERELICTE.bag : mixHex(DERELICTE.bag, DERELICTE.bagSheen, 0.2))
      p.beginShape()
      p.vertex(X(sx - 0.07), X(CANOPY.top + 0.1))
      p.bezierVertex(X(sx - 0.12), X(CANOPY.top + len * 0.5), X(sx - 0.06 + sway), X(CANOPY.top + len * 0.85), X(sx + sway), X(CANOPY.top + len))
      p.bezierVertex(X(sx + 0.06 + sway), X(CANOPY.top + len * 0.85), X(sx + 0.12), X(CANOPY.top + len * 0.5), X(sx + 0.07), X(CANOPY.top + 0.1))
      p.endShape(p.CLOSE)
    }
  }
  drape(lx, -1, lean * 2)
  drape(CANOPY.x1, 1, 0)
  solid(p, ink.ink, ink.weight * 0.5, DERELICTE.bag)
  p.beginShape()
  const n = 14
  p.vertex(X(lx - 0.15), X(CANOPY.top - 0.12))
  p.vertex(X(CANOPY.x1 + 0.15), X(CANOPY.top - 0.12))
  for (let i = n; i >= 0; i--) {
    const x = lx - 0.15 + ((CANOPY.x1 - lx + 0.3) * i) / n
    const dip = 0.2 + 0.12 * Math.abs(Math.sin(i * 1.7)) + 0.1 * Math.sin((i / n) * Math.PI)
    p.vertex(X(x), X(CANOPY.top + dip + lean * 3 * (1 - i / n)))
  }
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(rgba(DERELICTE.bagSheen, 0.9))
  p.strokeWeight(Math.max(1, X(0.025)))
  p.line(X(lx + 0.1), X(CANOPY.top - 0.02), X(CANOPY.x1 - 0.1), X(CANOPY.top - 0.02))
  // The swag's release line: from its left end up in the dark, down to the cleat on the left upright, until it runs.
  const cleat = up(-1.2)
  const rope = rgba(DERELICTE.paperShade, 0.7)
  solid(p, ink.ink, ink.weight * 0.4, DERELICTE.steelDark)
  p.rectMode(p.CENTER)
  p.rect(X(cleat[0] + 0.08), X(cleat[1]), X(0.06), X(0.18))
  const from: [number, number] = [HEAP.x - HEAP.w + 0.06, HEAP.top + 0.1 + h.drop * 3.2]
  if (h.run < 1) {
    p.noFill()
    p.stroke(rope)
    p.strokeWeight(Math.max(1, X(0.025)))
    // Running, its tail goes up the line and away.
    const f0 = Math.min(1, h.run * 1.4)
    const end: [number, number] = [cleat[0] + 0.07 + (from[0] - cleat[0] - 0.07) * f0, cleat[1] + (from[1] - cleat[1]) * f0]
    if (f0 < 0.98) p.line(X(from[0]), X(from[1]), X(end[0]), X(end[1]))
    if (h.run <= 0) {
      p.ellipse(X(cleat[0] + 0.1), X(cleat[1] + 0.02), X(0.12), X(0.08))
      p.line(X(cleat[0] + 0.1), X(cleat[1] + 0.06), X(cleat[0] + 0.13), X(cleat[1] + 0.3))
    }
  }
  void pulley
  p.pop()
}

/* ------------------------------------------------------------------ the front row */

/** The Prime Minister's chair: steel, a dark cushion, its back behind him. */
export function drawChair(p: p5, k: number, f: Frame, ink: Ink): void {
  const X = (v: number) => v * k
  const [x] = PM_SEAT
  if (x + 1 < f.x0 || x - 1 > f.x1) return
  const seat = PM_SEAT[1] + 0.13
  p.push()
  p.stroke(DERELICTE.steel)
  p.strokeWeight(Math.max(1, X(0.05)))
  p.line(X(x - 0.2), X(seat + 0.06), X(x - 0.24), X(FLOOR_Y))
  p.line(X(x + 0.26), X(seat - 0.8), X(x + 0.3), X(FLOOR_Y))
  p.line(X(x - 0.22), X(seat + 0.35), X(x + 0.28), X(seat + 0.35))
  solid(p, ink.ink, ink.weight * 0.6, DERELICTE.bagSheen)
  p.rectMode(p.CORNER)
  p.rect(X(x - 0.24), X(seat), X(0.52), X(0.08), X(0.02))
  solid(p, ink.ink, ink.weight * 0.6, DERELICTE.steelDark)
  p.rect(X(x + 0.22), X(seat - 0.82), X(0.08), X(0.84), X(0.02))
  p.pop()
}

export { BANKS_ON }
