import type p5 from 'p5'
import { outline, solid, teeth } from '../../../../../../../../src/core/draw'
import { mixHex, type PieceCtx } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, bar } from '../music'
import { BRASS, DRUM_RED, GOLD, INK, IRON, PAPER, clamp, deep, pale, smooth } from '../look'

/**
 * Storey 9, the top, the last tutti: a pair of kettledrums either side of the mast, the left played on every downbeat
 * (the strings' low pluck), the right on the third beat and, in the second bar of each pair, on its "and" too (the
 * high pluck).
 *
 * Each drum stands on a shelf hung across the storey, and each has a mallet on a long arm pivoted from the ceiling
 * near the mast. The arm's short tail rides under a cam, and the cams turn on two gears driven by a third on the mast
 * (the camshaft off the mast), once every two bars. A cam's lobe presses the tail down, so the mallet climbs high over
 * its drum through the beat before its stroke; then the lobe's cliff lets the tail go, and the mallet falls hard onto
 * the head on the pluck, bounces off, and the head gives under it and springs back.
 *
 * Until it is let in, a pawl holds the mast's gear still; it lifts out as the engine is let in. After the collapse's
 * downbeat (the left drum's last stroke) the gears coast to a stop and the mallets rest on the heads.
 */

// Cells. x from the mast, y down from the box's top (just under the ceiling).
/** The drums: their middles, the heads' half width, where the heads are and how deep the bowls. */
const DX = 3.3
const HW = 0.7
const HEAD = 0.8
const HOOP = 0.07
const BOWL = 0.52
/** The shelf the drums stand on. */
const SHELF = 1.52
const SHELF_W = 4.35
/** Where each mallet strikes: a third of the way in from the head's inner rim. */
const STRIKE = DX - 0.4
/** The felt: its half length and half height. */
const FELT_A = 0.11
const FELT_B = 0.072
/** The arms' pivots (hung from the ceiling), their tails' length. */
const PX = 0.88
const PY = 0.42
const TAIL = 0.36
/** The cams: base circle and rise; the tails' rollers. */
const CAM_R = 0.12
const LIFT = 0.08
const ROLLER = 0.036
/** The gears: the side ones carry the cams; the middle one is on the mast. */
const GEAR_R = 0.2
/** The head's rise seen from a little above: a flat ellipse. */
const HEAD_RY = 0.07

/** How far the head's top is above its rim line at `dx` from its middle. */
const headTop = (dx: number): number => HEAD_RY * Math.sqrt(Math.max(0, 1 - (dx / (HW - 0.02)) ** 2))
/** Where the felt rests, on the head at the strike. */
const FELT_REST = HEAD - headTop(STRIKE - DX) - FELT_B
/** The arm at rest: from the pivot out to the felt. */
const ARM = Math.hypot(STRIKE - PX, FELT_REST - PY)
const ARM_A = Math.atan2(FELT_REST - PY, STRIKE - PX)
/** The tail's roller at rest, and so the cam (and its gear) just over it. */
const TAIL_X = PX - Math.cos(ARM_A) * TAIL
const CAM_Y = PY - Math.sin(ARM_A) * TAIL - ROLLER - CAM_R
const HUB_R = TAIL_X - GEAR_R - 0.035

/** The hits in each two-bar figure, in bars: the left on both downbeats, the right on beat 3, beat 3 and its "and". */
interface Hit {
  at: number
  ramp: number
  size: number
}
const LOW: Hit[] = [
  { at: 0, ramp: 0.3, size: 1 },
  { at: 1, ramp: 0.3, size: 1 },
]
const HIGH: Hit[] = [
  { at: 2 / 3, ramp: 0.3, size: 1 },
  { at: 5 / 3, ramp: 0.3, size: 1 },
  { at: 11 / 6, ramp: 0.15, size: 0.55 },
]
/** The fall, from the cliff to the head, and the lobe's top held a moment before it: bars. */
const FALL = 0.09 / BAR
const HOLD = 0.06 / BAR
/** The collapse's downbeat: the last stroke, and the gears coast to a stop. */
const END = bar(339)

/** The camshaft's turn in bars (two bars a turn): held still until let in, then a bar a bar. */
function phase(t: number, since: number): number {
  const drive = (s: number): number => (s <= 0 ? 0 : s < 1 ? s ** 3 - s ** 4 / 2 : s - 0.5)
  // Let in on the first downbeat of a pair, the shaft stands a fifth of a bar on, so it keeps time from its first stroke.
  const rest = 0.5 / BAR
  if (t <= END) return rest + drive(since) / BAR
  return rest + (drive(END - (t - since)) + 0.25 * (1 - Math.exp(-(t - END) / 0.25))) / BAR
}

/** The lobe under the tail with `d` bars to go to a hit: rising, a moment's hold at the top, then the cliff. */
function lobe(d: number, hit: Hit): number {
  if (d <= FALL || d > hit.ramp) return 0
  const u = clamp((hit.ramp - d) / (hit.ramp - FALL - HOLD))
  return hit.size * u * u * (3 - 2 * u)
}

/** The hits of a figure around phase `P`: every one within a figure either side, as absolute phases. */
function around(P: number, hits: Hit[]): { ph: number; hit: Hit }[] {
  const base = Math.floor(P / 2) * 2
  const out: { ph: number; hit: Hit }[] = []
  for (const b of [base - 2, base, base + 2]) for (const hit of hits) out.push({ ph: b + hit.at, hit })
  return out
}

/** The cam's lift under the tail at phase `P` (the cam's own shape, in lifts). */
function camAt(P: number, hits: Hit[]): number {
  let v = 0
  for (const { ph, hit } of around(P, hits)) v = Math.max(v, lobe(ph - P, hit))
  return v
}

type Pt = [number, number]

function rod(p: p5, c: PieceCtx, a: Pt, b: Pt, wid: number, fill: string): void {
  const { k, weight } = c
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(wid * k + weight * 1.6)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.stroke(fill)
  p.strokeWeight(Math.max(0.6, wid * k))
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

function pin(p: p5, c: PieceCtx, at: Pt, r = 0.03): void {
  solid(p, INK, c.weight * 0.6, BRASS)
  p.circle(at[0] * c.k, at[1] * c.k, r * 2 * c.k)
}

function gear(p: p5, c: PieceCtx, at: Pt, r: number, n: number, turn: number, fill: string): void {
  const { k, weight } = c
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(turn)
  outline(p, INK, weight * 0.9)
  teeth(p, r * k, n, 0.035 * k)
  solid(p, INK, weight, fill)
  p.circle(0, 0, r * 2 * k)
  outline(p, INK, weight * 0.6)
  for (let i = 0; i < 3; i++) {
    p.line(0, 0, 0, -r * 0.78 * k)
    p.rotate((Math.PI * 2) / 3)
  }
  p.pop()
}

/** A kettledrum, its middle at x = 0 and its head's rim line on y = 0: the bowl, the legs, the hoop and its handles, the head. */
function drum(p: p5, c: PieceCtx, copper: string, dip: number, at: number, legs: number): void {
  const { k, weight } = c
  // The legs, splayed, down to the shelf.
  for (const f of [-0.62, 0, 0.62]) {
    const x0 = f * HW * 0.78
    const y0 = HOOP + BOWL * Math.sqrt(Math.max(0, 1 - Math.abs(x0 / HW) ** 1.8)) - 0.02
    rod(p, c, [x0, y0], [f * HW * 0.95, legs], 0.05, deep(IRON, 0.1))
    solid(p, INK, weight * 0.7, deep(IRON, 0.2))
    p.rectMode(p.CENTER)
    p.rect(f * HW * 0.95 * k, (legs - 0.02) * k, 0.12 * k, 0.04 * k, 0.01 * k)
  }
  // The bowl: full at the shoulders, round underneath.
  solid(p, INK, weight, copper)
  p.beginShape()
  const M = 24
  for (let i = 0; i <= M; i++) {
    const a = (Math.PI * i) / M
    const cx = Math.cos(a)
    const x = Math.sign(cx) * Math.abs(cx) ** 0.8 * HW
    p.vertex(x * k, (HOOP - 0.01 + BOWL * Math.sin(a)) * k)
  }
  p.endShape(p.CLOSE)
  // Its shine: one line along the shoulder.
  outline(p, pale(copper, 0.45), weight * 1.1)
  p.noFill()
  p.beginShape()
  for (let i = 4; i <= 10; i++) {
    const a = (Math.PI * i) / M
    const cx = Math.cos(a)
    p.vertex(Math.sign(cx) * Math.abs(cx) ** 0.8 * HW * 0.8 * k, (HOOP + BOWL * 0.8 * Math.sin(a) - 0.03) * k)
  }
  p.endShape()
  // The head: a flat ellipse seen from a little above, giving under the mallet.
  const rx = HW - 0.02
  solid(p, INK, weight, mixHex(PAPER, BRASS, 0.28))
  p.beginShape()
  const S = 22
  for (let i = 0; i <= S; i++) {
    const x = -rx + (2 * rx * i) / S
    const bump = Math.exp(-(((x - at) / 0.32) ** 2)) * (1 - (x / rx) ** 2)
    p.vertex(x * k, (-headTop(x) + dip * bump) * k)
  }
  p.vertex(rx * k, 0.02 * k)
  p.vertex(-rx * k, 0.02 * k)
  p.endShape(p.CLOSE)
  // The counter-hoop, and the tuning handles round it: T-handles over the rim, their rods down to lugs on the bowl.
  const handles = 7
  for (let i = 0; i < handles; i++) {
    const x = -Math.cos((Math.PI * (i + 0.5)) / handles) * (HW + 0.01)
    outline(p, INK, weight * 0.7)
    p.line(x * k, -0.095 * k, x * k, (HOOP + 0.15) * k)
    solid(p, INK, weight * 0.6, deep(IRON, 0.15))
    p.rectMode(p.CENTER)
    p.rect(x * k, -0.1 * k, 0.1 * k, 0.03 * k, 0.01 * k)
    solid(p, INK, weight * 0.6, BRASS)
    p.rect(x * k, (HOOP + 0.15) * k, 0.045 * k, 0.07 * k, 0.01 * k)
  }
  solid(p, INK, weight, pale(IRON, 0.35))
  p.rectMode(p.CORNERS)
  p.rect((-HW - 0.04) * k, -0.01 * k, (HW + 0.04) * k, HOOP * k, 0.02 * k)
}

export const timpani: Engine = (p, c, _st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const unfold = smooth(e.open, 0.75, 1)
  const y0 = e.box.y0
  const at = (x: number, y: number): Pt => [x, y0 + y]
  const X = (x: number): number => x * k
  const Y = (y: number): number => (y0 + y) * k
  const tint = (hex: string, f = 0.5): string => (e.gold > 0 ? mixHex(hex, GOLD, f * e.gold) : hex)
  const grow = (px: number, py: number, s: number, draw: () => void): void => {
    p.push()
    p.translate(X(px), Y(py))
    p.scale(s)
    p.translate(-X(px), -Y(py))
    draw()
    p.pop()
  }

  const P = phase(t, e.since)
  const letIn = t - e.since
  const turn = Math.PI * P
  const big = smooth(t, bar(335), bar(336))
  const copper = tint(mixHex(BRASS, DRUM_RED, 0.45))
  const armFill = tint(e.color)

  // The shelf across the storey, hung from the ceiling at its ends and clamped to the mast.
  grow(0, SHELF, unfold, () => {
    for (const side of [-1, 1]) {
      outline(p, INK, weight * 0.9)
      p.stroke(deep(IRON, 0.1))
      p.line(X(side * (SHELF_W - 0.1)), Y(-0.08), X(side * (SHELF_W - 0.1)), Y(SHELF))
    }
    solid(p, INK, weight, deep(e.color, 0.2))
    p.rectMode(p.CORNERS)
    p.rect(X(-SHELF_W), Y(SHELF), X(SHELF_W), Y(SHELF + 0.08), 0.02 * k)
    solid(p, INK, weight * 0.8, pale(IRON, 0.2))
    p.triangle(X(-0.34), Y(SHELF), X(0.34), Y(SHELF), 0, Y(SHELF - 0.28))
  })

  // The two drums, each with its mallet: the left on the downbeats, the right on the third beats.
  for (const side of [-1, 1]) {
    const hits = side < 0 ? LOW : HIGH
    // The tail's press: the cam's lobe, the fall after its cliff, the bounce off the head.
    let press = 0
    let since = Infinity
    for (const { ph, hit } of around(P, hits)) {
      const d = ph - P
      if (d > 0) {
        if (d <= FALL) {
          const u = 1 - d / FALL
          press = Math.max(press, hit.size * (1 - u * u))
        } else press = Math.max(press, lobe(d, hit))
      } else if (ph >= 0.4) since = Math.min(since, t - (letIn + ph * BAR))
    }
    press *= 1 + 0.22 * big
    const bounce = Number.isFinite(since) ? (0.16 + 0.1 * big) * (since / 0.06) * Math.exp(1 - since / 0.06) : 0
    press = Math.max(press, bounce)
    const dip = Number.isFinite(since) ? (0.04 + 0.03 * big) * (0.6 + 0.4 * e.amp) * Math.exp(-since / 0.16) * Math.cos(2 * Math.PI * 5 * since) * smooth(since, 0, 0.025) : 0

    // The arm: pressing the tail down by `press` lifts the mallet.
    const pivot: Pt = [side * PX, PY]
    const rest = side > 0 ? ARM_A : Math.PI - ARM_A
    const a = rest - side * (press * LIFT) / TAIL
    const tail: Pt = [pivot[0] - Math.cos(a) * TAIL, pivot[1] - Math.sin(a) * TAIL]
    const tip: Pt = [pivot[0] + Math.cos(a) * ARM, pivot[1] + Math.sin(a) * ARM]
    const clamp1: Pt = [pivot[0] + Math.cos(a) * ARM * 0.62, pivot[1] + Math.sin(a) * ARM * 0.62]

    // The drum.
    grow(side * DX, SHELF, unfold, () => {
      p.push()
      p.translate(X(side * DX), Y(HEAD))
      drum(p, c, copper, dip, side * (STRIKE - DX), SHELF - HEAD)
      p.pop()
    })

    // The cam's gear, the cam on it, and the arm hung from its strap.
    grow(0, CAM_Y, unfold, () => {
      gear(p, c, at(side * TAIL_X, CAM_Y), GEAR_R, 12, turn, pale(IRON, 0.5))
      p.push()
      p.translate(X(side * TAIL_X), Y(CAM_Y))
      p.rotate(turn)
      solid(p, INK, weight, tint(pale(e.color, 0.3)))
      p.beginShape()
      const S = 72
      for (let i = 0; i < S; i++) {
        const psi = (2 * Math.PI * i) / S
        // The phase at which this edge of the cam is under the tail.
        const q = P + (((Math.PI / 2 - psi - turn) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / Math.PI
        const r = CAM_R + LIFT * camAt(q, hits)
        p.vertex(Math.cos(psi) * r * k, Math.sin(psi) * r * k)
      }
      p.endShape(p.CLOSE)
      solid(p, INK, weight * 0.7, BRASS)
      p.circle(0, 0, 0.07 * k)
      p.pop()
    })
    grow(pivot[0], -0.08, unfold, () => {
      // The strap from the ceiling to the pivot.
      solid(p, INK, weight * 0.8, pale(IRON, 0.35))
      p.rectMode(p.CORNERS)
      p.rect(X(pivot[0] - 0.035), Y(-0.08), X(pivot[0] + 0.035), Y(PY + 0.04), 0.015 * k)
      // The lever to the clamp, the stick on to the felt.
      rod(p, c, at(tail[0], tail[1]), at(clamp1[0], clamp1[1]), 0.085, armFill)
      rod(p, c, at(clamp1[0], clamp1[1]), at(tip[0], tip[1]), 0.055, '#8A6A45')
      solid(p, INK, weight * 0.7, BRASS)
      p.push()
      p.translate(X(clamp1[0]), Y(clamp1[1]))
      p.rotate(a)
      p.rectMode(p.CENTER)
      p.rect(0, 0, 0.12 * k, 0.1 * k, 0.015 * k)
      p.pop()
      solid(p, INK, weight * 0.7, BRASS)
      p.circle(X(tail[0]), Y(tail[1]), ROLLER * 2 * k)
      pin(p, c, at(pivot[0], pivot[1]), 0.035)
      // The felt.
      p.push()
      p.translate(X(tip[0]), Y(tip[1]))
      p.rotate(a)
      solid(p, INK, weight, '#E7D2A8')
      p.ellipse(0, 0, FELT_A * 2 * k, FELT_B * 2 * k)
      p.pop()
    })
  }

  // The mast's gear, driving both, and the pawl that held it until the engine was let in.
  grow(0, CAM_Y, unfold, () => {
    gear(p, c, at(0, CAM_Y), HUB_R, 14, -turn * (GEAR_R / HUB_R) + Math.PI / 14, tint(pale(BRASS, 0.2), 0.3))
    solid(p, INK, weight * 0.7, deep(IRON, 0.1))
    p.circle(0, Y(CAM_Y), 0.08 * k)
    const free = smooth(e.on, 0, 0.8)
    const lp: Pt = [0.16, CAM_Y + HUB_R + 0.2]
    const la = Math.atan2(-0.19, -0.13) - 0.9 * free
    const len = Math.hypot(0.19, 0.13)
    rod(p, c, at(lp[0], lp[1]), at(lp[0] + Math.cos(la) * len, lp[1] + Math.sin(la) * len), 0.035, deep(IRON, 0.05))
    pin(p, c, at(lp[0], lp[1]), 0.022)
  })
}
