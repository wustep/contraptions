import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { R, mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash } from '../kit'
import { LOFT } from '../worlds'
import { BENCH, FLOOR_Y } from './layout'
import { ROOM_LAYERS, SHELF, shade } from './set'
import {
  ARM,
  BAL,
  BEAT,
  HANK,
  LATCH,
  LIFT,
  PAIRS,
  PAIR_HALF,
  PIVOT,
  POLE,
  SNUFF,
  WICK_DROP,
  armAngle,
  armTip,
  beamEnd,
  beamTilt,
  cone,
  drumTurn,
  latchTurn,
  pairSwing,
  panUnder,
  panY,
  pawlLift,
  poleSag,
} from './sneak-plan'

/**
 * LOFT-A's drawings of the sneak's machines. They are drawn inside the room (`ROOM_LAYERS`), before its light, in
 * their lit colours, so the spark's warm pool and the moon's shaft fall on them as on the walls; what stands in front
 * of the spark (the lips of the pans and the socket it sits in) is drawn over it, in `sneakOver`, shaded by hand.
 *
 * Every drawing reads show time: armed before the spark, moving as it passes, settled after (the balance tipped with
 * the snuffer's cone in its west pan, the lift's pan on the bench, the arm back up), and seen so for the whole show.
 */

type See = (x0: number, x1: number, y0: number, y1: number) => boolean

const V = (p: p5, k: number, x: number, y: number) => p.vertex(x * k, y * k)
function poly(p: p5, k: number, pts: readonly Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) V(p, k, x, y)
  p.endShape(p.CLOSE)
}
function line(p: p5, k: number, a: Pt, b: Pt): void {
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}
/** A bar of width `w` from a to b, as a filled quad (so it takes the fill and the ink like any shape). */
function bar(p: p5, k: number, a: Pt, b: Pt, w: number): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = (-dy / l) * (w / 2)
  const ny = (dx / l) * (w / 2)
  poly(p, k, [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ])
}
/** Points of a shape given in a local frame (x across, y down from `at`), turned by `a` about `at`. */
const turned = (at: Pt, a: number, pts: readonly Pt[]): Pt[] => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return pts.map(([x, y]) => [at[0] + x * c - y * s, at[1] + x * s + y * c])
}

const BRASS = LOFT.brass
const BRASS_DEEP = mixHex(LOFT.brass, LOFT.wood, 0.45)
const PEWTER = LOFT.pewter
const IRON = LOFT.ironLit
const OAK = LOFT.woodLit
const CORD = mixHex(LOFT.wick, LOFT.woodLit, 0.35)
const PAN_IN = mixHex(LOFT.brass, LOFT.soot, 0.45)

/* ------------------------------------------------------------------ the pan lift */

/** A shallow brass pan, centre x, floor y, `w` across and `d` deep: its body (the back, drawn behind the spark). */
function panBody(p: p5, k: number, ink: string, w: number, x: number, floor: number, half: number, d: number): void {
  solid(p, ink, w * 0.8, PAN_IN)
  poly(p, k, [
    [x - half, floor - d],
    [x + half, floor - d],
    [x + half - 0.05, floor - d + 0.05],
    [x - half + 0.05, floor - d + 0.05],
  ])
  solid(p, ink, w * 0.8, BRASS)
  p.beginShape()
  V(p, k, x - half - 0.02, floor - d)
  V(p, k, x + half + 0.02, floor - d)
  p.bezierVertex((x + half) * k, (floor - d * 0.2) * k, (x + half * 0.72) * k, (floor + 0.035) * k, (x + half * 0.55) * k, (floor + 0.035) * k)
  V(p, k, x - half * 0.55, floor + 0.035)
  p.bezierVertex((x - half * 0.72) * k, (floor + 0.035) * k, (x - half) * k, (floor - d * 0.2) * k, (x - half - 0.02) * k, (floor - d) * k)
  p.endShape(p.CLOSE)
}

/** The pan's front lip, over the spark sitting in it: a band of the pan's wall below its rim. Shaded by hand. */
function panLip(p: p5, k: number, ink: string, w: number, x: number, floor: number, half: number, d: number, t: number): void {
  const fill = shade(BRASS, x, floor - d, t)
  solid(p, shade(ink, x, floor, t), w * 0.8, fill)
  p.beginShape()
  V(p, k, x - half - 0.02, floor - d)
  V(p, k, x + half + 0.02, floor - d)
  p.bezierVertex((x + half) * k, (floor - d * 0.2) * k, (x + half * 0.72) * k, (floor + 0.035) * k, (x + half * 0.55) * k, (floor + 0.035) * k)
  V(p, k, x - half * 0.55, floor + 0.035)
  p.bezierVertex((x - half * 0.72) * k, (floor + 0.035) * k, (x - half) * k, (floor - d * 0.2) * k, (x - half - 0.02) * k, (floor - d) * k)
  p.endShape(p.CLOSE)
}

/** The windlass under the shelf, its cord, the bridle and the pan. */
function lift(p: p5, k: number, ink: string, w: number, t: number, see: See): void {
  const [dx, dy] = LIFT.drum
  const floor = panY(t)
  const half = LIFT.w / 2
  const ring: Pt = [LIFT.x, floor - LIFT.depth - LIFT.bridle]
  if (see(dx - 0.8, LIFT.x + 0.8, SHELF.y, floor + 0.2)) {
    // The cord, from the drum down to the bridle's ring; the bridle's two chains to the rim.
    p.stroke(ink)
    p.strokeWeight(w * 0.6 + 0.035 * k)
    line(p, k, [LIFT.x, dy], ring)
    p.stroke(CORD)
    p.strokeWeight(0.035 * k)
    line(p, k, [LIFT.x, dy], ring)
    p.stroke(IRON)
    p.strokeWeight(Math.max(w * 0.7, 0.022 * k))
    line(p, k, ring, [LIFT.x - half + 0.06, floor - LIFT.depth])
    line(p, k, ring, [LIFT.x + half - 0.06, floor - LIFT.depth])
    solid(p, ink, w * 0.5, IRON)
    poly(p, k, [
      [ring[0] - 0.05, ring[1] - 0.02],
      [ring[0] + 0.05, ring[1] - 0.02],
      [ring[0] + 0.03, ring[1] + 0.05],
      [ring[0] - 0.03, ring[1] + 0.05],
    ])
  }
  if (see(dx - 0.8, dx + 0.8, SHELF.y - 0.2, dy + 0.6)) {
    // The yoke: an iron strap down from the shelf to the drum's axle, and its foot-plate on the shelf's underside.
    solid(p, ink, w * 0.8, IRON)
    p.push()
    p.rectMode(p.CORNER)
    p.rect((dx - 0.5) * k, (SHELF.y + 0.2) * k, 1.0 * k, 0.07 * k)
    p.pop()
    bar(p, k, [dx - 0.34, SHELF.y + 0.24], [dx - 0.05, dy], 0.07)
    bar(p, k, [dx + 0.34, SHELF.y + 0.24], [dx + 0.05, dy], 0.07)
    // The drum, end-on: the cord wound on it, a brass ratchet on its face, turning as it pays out.
    const turn = drumTurn(t)
    solid(p, ink, w * 0.8, CORD)
    p.circle(dx * k, dy * k, 2 * LIFT.r * k)
    solid(p, ink, w * 0.6, BRASS)
    const teeth: Pt[] = []
    const n = 12
    for (let i = 0; i < n; i++) {
      const a0 = turn + (i / n) * Math.PI * 2
      const a1 = a0 + (0.62 / n) * Math.PI * 2
      teeth.push([dx + Math.cos(a0) * 0.2, dy + Math.sin(a0) * 0.2], [dx + Math.cos(a1) * 0.25, dy + Math.sin(a1) * 0.25], [dx + Math.cos(a1) * 0.2, dy + Math.sin(a1) * 0.2])
    }
    poly(p, k, teeth)
    solid(p, ink, w * 0.5, BRASS_DEEP)
    for (let i = 0; i < 4; i++) {
      const a = turn + (i / 4) * Math.PI * 2
      bar(p, k, [dx, dy], [dx + Math.cos(a) * 0.17, dy + Math.sin(a) * 0.17], 0.035)
    }
    solid(p, ink, w * 0.5, IRON)
    poly(p, k, [
      [dx - 0.045, dy],
      [dx, dy - 0.045],
      [dx + 0.045, dy],
      [dx, dy + 0.045],
    ])
    // The pawl on the yoke, riding the ratchet: it lifts as a tooth slips under it and drops, a click, on each notch.
    const lift0: Pt = [dx - 0.36, dy - 0.24]
    const pa = 0.5 - 0.35 * pawlLift(t)
    solid(p, ink, w * 0.5, IRON)
    poly(p, k, turned(lift0, pa, [
      [0, -0.03],
      [0.26, -0.015],
      [0.28, 0.02],
      [0, 0.03],
    ]))
  }
  if (see(LIFT.x - half - 0.2, LIFT.x + half + 0.2, floor - 0.3, floor + 0.2)) panBody(p, k, ink, w, LIFT.x, floor, half, LIFT.depth)
}

/* ------------------------------------------------------------------ the hank of wick */

function hank(p: p5, k: number, ink: string, w: number, see: See): void {
  const { x0, x1, h } = HANK
  if (!see(x0 - 0.3, x1 + 0.3, BENCH.top - 0.5, BENCH.top)) return
  const y = BENCH.top
  const cx = (x0 + x1) / 2
  const rx = (x1 - x0) / 2
  // A neat coil of cotton wick lying on the bench, three turns seen a little from above, its end standing up out of
  // the top turn: a wick, waiting for a flame.
  const turns = 3
  const ry = 0.05
  const step = (h - 2 * ry) / (turns - 1)
  const ring = (i: number, front: boolean) => {
    const yc = y - ry - i * step
    const x = cx + (i - 1) * 0.012
    p.beginShape()
    for (let j = 0; j <= 16; j++) {
      const q = (front ? 0 : Math.PI) + (Math.PI * j) / 16
      V(p, k, x + Math.cos(q) * rx * (1 - 0.06 * i), yc + Math.sin(q) * ry)
    }
    p.endShape()
  }
  p.noFill()
  for (const front of [false, true]) {
    for (let i = 0; i < turns; i++) {
      p.stroke(ink)
      p.strokeWeight(w * 0.4 + 0.04 * k)
      ring(i, front)
      p.stroke(LOFT.wick)
      p.strokeWeight(0.034 * k)
      ring(i, front)
    }
  }
  // The end, up out of the top turn, and a little bent.
  const top = y - ry - (turns - 1) * step
  for (const [col, wt] of [
    [ink, w * 0.4 + 0.04 * k],
    [LOFT.wick, 0.034 * k],
  ] as [string, number][]) {
    p.stroke(col)
    p.strokeWeight(wt)
    p.beginShape()
    V(p, k, cx + rx * 0.5, top + ry * 0.4)
    p.quadraticVertex((cx + rx * 0.62) * k, (top - 0.07) * k, (cx + rx * 0.38) * k, (top - 0.12) * k)
    p.endShape()
  }
}

/* ------------------------------------------------------------------ the balance */

function balance(p: p5, k: number, ink: string, w: number, t: number, see: See): void {
  if (!see(BAL.x - 1.5, BAL.x + 1.5, BAL.y - 1, BENCH.top)) return
  const a = beamTilt(t)
  const E = beamEnd(a, 1)
  const W = beamEnd(a, -1)
  // The oak base on the bench, and the brass pillar up to the pivot.
  solid(p, ink, w, OAK)
  poly(p, k, [
    [BAL.x - BAL.base / 2, BENCH.top],
    [BAL.x + BAL.base / 2, BENCH.top],
    [BAL.x + BAL.base / 2 - 0.08, BENCH.top - 0.24],
    [BAL.x - BAL.base / 2 + 0.08, BENCH.top - 0.24],
  ])
  solid(p, ink, w * 0.8, BRASS)
  poly(p, k, [
    [BAL.x - 0.16, BENCH.top - 0.24],
    [BAL.x + 0.16, BENCH.top - 0.24],
    [BAL.x + 0.07, BENCH.top - 0.42],
    [BAL.x + 0.06, BAL.y + 0.1],
    [BAL.x - 0.06, BAL.y + 0.1],
    [BAL.x - 0.07, BENCH.top - 0.42],
  ])
  // The pointer, square to the beam, up from the pivot.
  solid(p, ink, w * 0.5, BRASS_DEEP)
  poly(p, k, turned([BAL.x, BAL.y], a, [
    [-0.03, 0],
    [0.03, 0],
    [0.008, -0.62],
    [-0.008, -0.62],
  ]))
  // Chains from each end to its pan's rim; the pans.
  for (const [end, side] of [
    [E, 1],
    [W, -1],
  ] as [Pt, number][]) {
    const [x, floor] = panUnder(end)
    p.stroke(IRON)
    p.strokeWeight(Math.max(w * 0.6, 0.02 * k))
    line(p, k, end, [x - BAL.pan / 2 + 0.05, floor - BAL.depth])
    line(p, k, end, [x + BAL.pan / 2 - 0.05, floor - BAL.depth])
    panBody(p, k, ink, w, x, floor, BAL.pan / 2, BAL.depth)
    void side
  }
  // The beam, over its chains: a brass bar with a boss at the pivot and hooks at the ends.
  solid(p, ink, w * 0.9, BRASS)
  bar(p, k, W, E, 0.075)
  poly(p, k, turned([BAL.x, BAL.y], a, [
    [-0.12, 0],
    [0, -0.11],
    [0.12, 0],
    [0, 0.11],
  ]))
  solid(p, ink, w * 0.5, IRON)
  for (const end of [E, W]) poly(p, k, [
    [end[0] - 0.035, end[1] - 0.05],
    [end[0] + 0.035, end[1] - 0.05],
    [end[0] + 0.035, end[1] + 0.06],
    [end[0] - 0.035, end[1] + 0.06],
  ])
}

/* ------------------------------------------------------------------ the snuffer */

function snuffer(p: p5, k: number, ink: string, w: number, t: number, see: See): void {
  const [hx, hy] = SNUFF.hinge
  if (!see(hx - 1.2, hx + 1.9, SNUFF.top - 1.2, BENCH.top)) return
  // The iron stand: a foot on the bench, a post up past the hinge to the latch's pivot.
  solid(p, ink, w * 0.8, IRON)
  poly(p, k, [
    [hx - 0.3, BENCH.top],
    [hx + 0.3, BENCH.top],
    [hx + 0.2, BENCH.top - 0.08],
    [hx - 0.2, BENCH.top - 0.08],
  ])
  bar(p, k, [hx - 0.05, BENCH.top - 0.08], [hx - 0.05, LATCH.pivot[1] - 0.04], 0.1)
  // The latch: a brass bar pivoted on the post's top, its tail out over the balance's west end, and a hook hanging
  // from it that holds the arm's end up. Lifted by the tail, the hook comes off the arm and the arm falls.
  const lt = latchTurn(t)
  const hk = LATCH.hook
  solid(p, ink, w * 0.6, BRASS)
  poly(p, k, turned(LATCH.pivot, -lt, [
    [-0.06, -0.03],
    [LATCH.tail - LATCH.pivot[0] + 0.04, -0.028],
    [LATCH.tail - LATCH.pivot[0] + 0.06, 0.0],
    [LATCH.tail - LATCH.pivot[0] + 0.04, 0.028],
    [hk + 0.05, 0.03],
    [hk + 0.05, 0.19],
    [hk - 0.06, 0.2],
    [hk - 0.06, 0.15],
    [hk - 0.0, 0.15],
    [hk - 0.0, 0.03],
    [-0.06, 0.03],
  ]))
  solid(p, ink, w * 0.5, IRON)
  poly(p, k, [
    [LATCH.pivot[0] - 0.045, LATCH.pivot[1]],
    [LATCH.pivot[0], LATCH.pivot[1] - 0.045],
    [LATCH.pivot[0] + 0.045, LATCH.pivot[1]],
    [LATCH.pivot[0], LATCH.pivot[1] + 0.045],
  ])
  // The arm, from its hinge on the post to the pin the bell hangs from.
  const c = cone(t)
  solid(p, ink, w * 0.8, BRASS_DEEP)
  bar(p, k, [hx, hy], c.apex, 0.065)
  // The bell: a brass cone hung mouth-down on the pin, a ring at its top, its rim rolled.
  const [ax, ay] = c.axis
  const bx = -ay
  const by = ax
  const at = (u: number, v: number): Pt => [c.apex[0] + ax * u + bx * v, c.apex[1] + ay * u + by * v]
  const m = SNUFF.mouth / 2
  const L = SNUFF.cone
  // The ring it hangs by: a short loop round the pin.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.5 + 0.045 * k)
  p.beginShape()
  for (let i = 0; i <= 10; i++) {
    const q = Math.PI * (i / 10)
    const [x, y] = at(0.05 - 0.05 * Math.sin(q), 0.045 * Math.cos(q))
    V(p, k, x, y)
  }
  p.endShape()
  p.stroke(BRASS)
  p.strokeWeight(0.03 * k)
  p.beginShape()
  for (let i = 0; i <= 10; i++) {
    const q = Math.PI * (i / 10)
    const [x, y] = at(0.05 - 0.05 * Math.sin(q), 0.045 * Math.cos(q))
    V(p, k, x, y)
  }
  p.endShape()
  // The bell's body: a slim neck flaring to its mouth, the sides a little hollow, as a snuffer's are.
  solid(p, ink, w * 0.9, BRASS)
  const side: Pt[] = []
  const n = 8
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const half = 0.045 + (m - 0.045) * Math.pow(u, 1.6)
    side.push([0.07 + (L - 0.07) * u, half])
  }
  const body: Pt[] = [...side.map(([u, v]) => at(u, -v)), at(L, -m - 0.03), at(L + 0.035, -m - 0.02), at(L + 0.035, m + 0.02), at(L, m + 0.03), ...[...side].reverse().map(([u, v]) => at(u, v))]
  poly(p, k, body)
  // A band round the bell's shoulder, and its shine on the lit side.
  p.noStroke()
  p.fill(alpha(p, BRASS_DEEP, 0.9))
  poly(p, k, [at(0.15, -0.075), at(0.15, 0.075), at(0.19, 0.09), at(0.19, -0.09)])
  p.fill(alpha(p, LOFT.tallow, 0.3))
  poly(p, k, [at(0.12, 0.03), at(L - 0.05, m * 0.55), at(L - 0.05, m * 0.3), at(0.12, 0.012)])
  // The hinge pin.
  solid(p, ink, w * 0.5, IRON)
  poly(p, k, [
    [hx - 0.05, hy],
    [hx, hy - 0.05],
    [hx + 0.05, hy],
    [hx, hy + 0.05],
  ])
}

/* ------------------------------------------------------------------ the drying rack */

/** A dipped taper hanging from its wick at `top`, swung `a`: thick at the belly, a drip at its foot. */
function taper(p: p5, k: number, ink: string, w: number, top: Pt, a: number, len: number, wax: string): void {
  const pts: Pt[] = []
  const n = 10
  for (let i = 0; i <= n; i++) {
    const v = i / n
    const half = 0.07 + 0.035 * Math.sin(Math.PI * Math.min(1, v * 1.25)) - 0.03 * v * v
    pts.push([half, v * len])
  }
  const outline: Pt[] = [[0, -0.03], ...pts, [0.012, len + 0.07], [-0.012, len + 0.07], ...pts.map(([x, y]) => [-x, y] as Pt).reverse()]
  solid(p, ink, w * 0.7, wax)
  poly(p, k, turned(top, -a, outline))
  // The dipped layers show as a faint band at the shoulder.
  p.noStroke()
  p.fill(alpha(p, mixHex(wax, LOFT.wood, 0.4), 0.35))
  poly(p, k, turned(top, -a, [
    [-0.075, 0.1],
    [0.075, 0.1],
    [0.08, 0.14],
    [-0.08, 0.14],
  ]))
}

function rack(p: p5, k: number, ink: string, w: number, t: number, see: See): void {
  if (!see(POLE.to - 0.5, POLE.from + 0.5, POLE.y - 0.6, BENCH.top)) return
  const poleAt = (x: number): number => POLE.y + poleSag(x, t)
  // The drip tray along the bench under the rack, with the drips that have set in it.
  solid(p, ink, w * 0.8, PEWTER)
  poly(p, k, [
    [POLE.west - 0.2, BENCH.top],
    [POLE.east + 0.1, BENCH.top],
    [POLE.east + 0.14, BENCH.top - 0.12],
    [POLE.west - 0.24, BENCH.top - 0.12],
  ])
  p.noStroke()
  p.fill(LOFT.tallow)
  for (const x of [-9.6, -10.9, -13.7, -14.1]) p.ellipse(x * k, (BENCH.top - 0.12) * k, (0.14 + 0.05 * hash(x * 10)) * k, 0.035 * k)
  // The uprights: oak posts on feet, forked at the top to hold the pole.
  for (const x of [POLE.east, POLE.mid, POLE.west]) {
    const top = poleAt(x)
    solid(p, ink, w * 0.9, OAK)
    poly(p, k, [
      [x - 0.26, BENCH.top - 0.12],
      [x + 0.26, BENCH.top - 0.12],
      [x + 0.16, BENCH.top - 0.3],
      [x - 0.16, BENCH.top - 0.3],
    ])
    poly(p, k, [
      [x - 0.1, BENCH.top - 0.3],
      [x + 0.1, BENCH.top - 0.3],
      [x + 0.1, top + 0.02],
      [x + 0.13, top - POLE.r - 0.09],
      [x + 0.06, top - POLE.r - 0.09],
      [x + 0.05, top],
      [x - 0.05, top],
      [x - 0.06, top - POLE.r - 0.09],
      [x - 0.13, top - POLE.r - 0.09],
      [x - 0.1, top + 0.02],
    ])
  }
  // The pairs: each wick's two ends hang either side, a taper on each.
  PAIRS.forEach((pair, i) => {
    const [aw, ae] = pairSwing(i, t)
    const py = poleAt(pair.x) + POLE.r * 0.6
    const wax = pair.wax === 'tallow' ? LOFT.tallow : LOFT.beeswax
    for (const [dx, a, len] of [
      [-PAIR_HALF, aw, pair.len],
      [PAIR_HALF, ae, pair.len - 0.04],
    ] as [number, number, number][]) {
      const top: Pt = [pair.x + dx, py]
      const foot: Pt = [top[0] + Math.sin(a) * WICK_DROP, top[1] + Math.cos(a) * WICK_DROP]
      p.stroke(ink)
      p.strokeWeight(w * 0.4 + 0.03 * k)
      line(p, k, top, foot)
      p.stroke(LOFT.wick)
      p.strokeWeight(0.026 * k)
      line(p, k, top, foot)
      taper(p, k, ink, w, foot, a, len, wax)
    }
  })
  // The pole: an oak rod, bowing and ringing where the spark lands.
  const xs: number[] = []
  for (let x = POLE.from; x >= POLE.to - 1e-6; x -= 0.2) xs.push(x)
  if (xs[xs.length - 1] > POLE.to) xs.push(POLE.to)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(2 * POLE.r * k + w * 1.6)
  p.beginShape()
  for (const x of xs) V(p, k, x, poleAt(x))
  p.endShape()
  p.stroke(OAK)
  p.strokeWeight(2 * POLE.r * k)
  p.beginShape()
  for (const x of xs) V(p, k, x, poleAt(x))
  p.endShape()
  p.stroke(alpha(p, LOFT.tallow, 0.35))
  p.strokeWeight(0.025 * k)
  p.beginShape()
  for (const x of xs) V(p, k, x, poleAt(x) - POLE.r * 0.45)
  p.endShape()
  // Each wick's loop over the pole: what the spark must not touch.
  for (const pair of PAIRS) {
    const y = poleAt(pair.x) - POLE.r
    p.stroke(ink)
    p.strokeWeight(w * 0.4 + 0.03 * k)
    p.beginShape()
    V(p, k, pair.x - PAIR_HALF, y + 0.07)
    p.bezierVertex((pair.x - PAIR_HALF) * k, (y - 0.06) * k, (pair.x + PAIR_HALF) * k, (y - 0.06) * k, (pair.x + PAIR_HALF) * k, (y + 0.07) * k)
    p.endShape()
    p.stroke(LOFT.wick)
    p.strokeWeight(0.028 * k)
    p.beginShape()
    V(p, k, pair.x - PAIR_HALF, y + 0.07)
    p.bezierVertex((pair.x - PAIR_HALF) * k, (y - 0.06) * k, (pair.x + PAIR_HALF) * k, (y - 0.06) * k, (pair.x + PAIR_HALF) * k, (y + 0.07) * k)
    p.endShape()
  }
}

/* ------------------------------------------------------------------ the candle arm */

function candleArm(p: p5, k: number, ink: string, w: number, t: number, see: See): void {
  const [px, py] = PIVOT
  if (!see(px - 2.2, px + 1, py - 1.2, FLOOR_Y)) return
  const a = armAngle(t)
  const tip = armTip(a)
  const back: Pt = [px + ARM.short * Math.cos(a), py - ARM.short * Math.sin(a)]
  // The standard: an iron rod from a three-legged foot on the floor up past the pivot to a finial.
  solid(p, ink, w * 0.8, IRON)
  for (const d of [-1, 1]) bar(p, k, [px, FLOOR_Y - 0.9], [px + d * 0.62, FLOOR_Y], 0.07)
  bar(p, k, [px, FLOOR_Y - 0.95], [px, py - 0.3], 0.085)
  poly(p, k, [
    [px - 0.07, py - 0.3],
    [px + 0.07, py - 0.3],
    [px, py - 0.52],
  ])
  poly(p, k, [
    [px - 0.1, FLOOR_Y - 1.02],
    [px + 0.1, FLOOR_Y - 1.02],
    [px + 0.1, FLOOR_Y - 0.9],
    [px - 0.1, FLOOR_Y - 0.9],
  ])
  // The counterweight on the short end, hanging from a link.
  const wy = back[1] + 0.08
  p.stroke(IRON)
  p.strokeWeight(Math.max(w * 0.6, 0.02 * k))
  line(p, k, back, [back[0], wy])
  solid(p, ink, w * 0.8, BRASS)
  poly(p, k, [
    [back[0] - 0.08, wy],
    [back[0] + 0.08, wy],
    [back[0] + 0.105, wy + 0.08],
    [back[0] + 0.105, wy + 0.42],
    [back[0] - 0.105, wy + 0.42],
    [back[0] - 0.105, wy + 0.08],
  ])
  // The arm, and the collar on its pivot.
  solid(p, ink, w * 0.8, IRON)
  bar(p, k, back, tip, 0.065)
  solid(p, ink, w * 0.6, BRASS_DEEP)
  poly(p, k, [
    [px - 0.08, py],
    [px, py - 0.08],
    [px + 0.08, py],
    [px, py + 0.08],
  ])
  // The drip pan on its pin, level, and the socket's back: the spark sits in the socket.
  const [tx, ty] = tip
  solid(p, ink, w * 0.7, BRASS)
  poly(p, k, [
    [tx - 0.31, ty - 0.05],
    [tx + 0.31, ty - 0.05],
    [tx + 0.24, ty + 0.03],
    [tx - 0.24, ty + 0.03],
  ])
  solid(p, ink, w * 0.6, PAN_IN)
  poly(p, k, [
    [tx - 0.17, ty - 0.24],
    [tx + 0.17, ty - 0.24],
    [tx + 0.15, ty - 0.05],
    [tx - 0.15, ty - 0.05],
  ])
}

/** The socket's front, in front of the spark sitting in it. */
function socketFront(p: p5, k: number, ink: string, w: number, t: number): void {
  const [tx, ty] = armTip(armAngle(t))
  solid(p, shade(ink, tx, ty, t), w * 0.7, shade(BRASS, tx, ty - 0.14, t))
  poly(p, k, [
    [tx - 0.18, ty - 0.2],
    [tx + 0.18, ty - 0.2],
    [tx + 0.17, ty - 0.12],
    [tx + 0.15, ty - 0.05],
    [tx - 0.15, ty - 0.05],
    [tx - 0.17, ty - 0.12],
  ])
}

/* ------------------------------------------------------------------ into the room */

/** Everything of the sneak, in the room's light: the rack and the arm at the back, then the bench's machines. */
export function drawSneak(p: p5, k: number, ink: string, w: number, t: number): void {
  const f = frame(p, k)
  const see: See = (x0, x1, y0, y1) => x1 >= f.x0 - 0.5 && x0 <= f.x1 + 0.5 && y1 >= f.y0 - 0.5 && y0 <= f.y1 + 0.5
  rack(p, k, ink, w, t, see)
  candleArm(p, k, ink, w, t, see)
  lift(p, k, ink, w, t, see)
  hank(p, k, ink, w, see)
  balance(p, k, ink, w, t, see)
  snuffer(p, k, ink, w, t, see)
}
ROOM_LAYERS.set('loft-sneak', drawSneak)

/** What stands in front of the spark while it sits in something: the lift pan's lip, the balance pan's, the socket's. */
export function sneakOver(p: p5, k: number, ink: string, w: number, t: number): void {
  if (t > BEAT.pan - 0.05 && t < BEAT.out + 0.1) panLip(p, k, ink, w, LIFT.x, panY(t), LIFT.w / 2, LIFT.depth, t)
  if (t > BEAT.balance - 0.05 && t < BEAT.clang + 0.08) {
    const [x, floor] = panUnder(beamEnd(beamTilt(t), 1))
    panLip(p, k, ink, w, x, floor, BAL.pan / 2, BAL.depth, t)
  }
  if (t > BEAT.cup - 0.05 && t < BEAT.leave2 + 0.05) socketFront(p, k, ink, w, t)
}

/** The spark's size, for anything that must keep clear of it. */
export const SPARK_R = R
