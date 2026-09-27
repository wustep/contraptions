import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { beam, bloom, pool, rgba } from '../cast'
import { frame, type Ctx } from '../kit'
import { AWARDS as A } from '../worlds'
import {
  ARRIVE,
  clamp01,
  derekAt,
  ease,
  hanselLag,
  LURCH,
  MOUTH,
  settle,
  snapOn,
  SURF,
  SWING,
  TROPHY_H,
  TROPHY_LAMP,
  trophyAt,
  TRUSS,
  trussDrop,
  AHEAD,
  UP2,
} from './awards-clock'

/**
 * The rig over the stage (the AWARDS builder's): a truss of spots hung on chains, the house's follow spot, and the
 * trolley on the truss that flies the trophy. Where each lamp points and how bright it is, as a function of show time,
 * so the light, the rims and the drawing all agree.
 *
 * - The follow spot has Derek from the first frame, its iris opening over the pad's first seconds.
 * - On the intro's hardest onset (6.920) a lamp snaps on over the stage ahead of him, and takes him as he walks into
 *   it; the trophy's own lamp on 7.210; one more on him as he reaches the podium's top (9.347).
 * - The pickup (10.246): the truss lurches on its chains and every pool shivers. The drums (10.746): the follow spot
 *   and the podium's lamp swing off him onto the far wings (a sharp start and a long damped settle), the house side's
 *   lamp goes out on him, and he is left in the dark; they find Hansel as he rolls out and stay on him. The trophy's
 *   lamp follows the trophy: three beams in the frame, all of them going to Hansel.
 * - On bar 8 (16.986) the runway's lamp snaps on over Hansel at its end.
 */

/** The follow spot's lens: far back in the house, high up. */
export const FOLLOW: Pt = [-11.5, -8.6]

/** Derek's feet: the surface he is on. */
const feet = (t: number): Pt => {
  const [x, y] = derekAt(t)
  return [x, y + 0.13]
}
/** The spot on Hansel: the mouth of the wings until he rolls into it, then on him, a little behind. */
const onHansel = (t: number): Pt => {
  const h = hanselLag(t, 0.32)
  // A soft minimum: the pool waits at the mouth, and takes him as he comes.
  const d = h - MOUTH
  const x = MOUTH + (d - Math.sqrt(d * d + 0.09)) / 2 + 0.15
  return [x, SURF]
}
/** A lamp on Derek until the drums, then swung onto Hansel; `wait` is where it waits for him to walk into it. */
const swung = (delay: number, wait?: number) => (t: number): Pt => {
  const on = (q: number): Pt => {
    const f = feet(q)
    if (wait === undefined) return f
    // A soft maximum: the pool waits ahead of him, and takes him as he comes into it.
    const d = f[0] - wait
    return [wait + (d + Math.sqrt(d * d + 0.06)) / 2, f[1]]
  }
  if (t <= SWING + delay) return on(t)
  const s = settle(t - SWING - delay)
  const a = on(t)
  const b = onHansel(t)
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]
}

interface Lamp {
  /** Where it hangs on the truss. */
  x: number
  /** What it points at (a point on a surface, or the trophy). */
  aim: (t: number) => Pt
  /** How bright it is, 0..1. */
  bright: (t: number) => number
  /** Whether its light falls on a floor (a pool), or on a thing in the air. */
  pools: (t: number) => boolean
}

const trophyMid = (t: number): Pt => {
  const q = trophyAt(t)
  return q.flying ? [(q.foot[0] + q.crown[0]) / 2, (q.foot[1] + q.crown[1]) / 2] : q.foot
}

export const LAMPS: Lamp[] = [
  // The runway's end: dark until Hansel reaches it.
  { x: -3.3, aim: () => [hanselLag(ARRIVE, 0.01), SURF], bright: (t) => snapOn(t - ARRIVE), pools: () => true },
  // The house side's: it takes Derek on the stage and up the podium, and on the drums it goes out on him.
  { x: -0.3, aim: swung(0.03, -0.35), bright: (t) => snapOn(t - AHEAD) * (1 - ease(t, SWING, SWING + 0.14)), pools: () => true },
  // The trophy's own.
  { x: 2.0, aim: trophyMid, bright: (t) => snapOn(t - TROPHY_LAMP), pools: (t) => !trophyAt(t).flying },
  // The podium's, from the wings side: on the drums it swings off him onto the far wings, finds Hansel, and loses
  // him as he goes off down the runway.
  { x: 4.4, aim: swung(0.05), bright: (t) => snapOn(t - UP2) * (1 - ease(onHansel(t)[0], 1.2, -1.6)), pools: () => true },
]

/** The follow spot: on Derek from the start; on the drums, on Hansel. */
// The show opens on it: the iris opens out over the pad's first seconds.
export const FOLLOW_SPOT: Lamp = { x: FOLLOW[0], aim: swung(0), bright: (t) => 0.4 + 0.6 * ease(t, 0.1, 2.0), pools: () => true }

/** The shiver every pool has after the rig lurches. */
const shiver = (t: number, i: number): number => {
  const u = t - LURCH
  if (u <= 0) return 0
  return 0.2 * Math.exp(-u / 0.35) * Math.sin(u * 15 + i * 1.3)
}

/** Where lamp `i` points at `t`, the lurch's shiver in it. */
export function aimOf(l: Lamp, i: number, t: number): Pt {
  const [x, y] = l.aim(t)
  return [x + shiver(t, i), y]
}

/** Where a truss lamp's yoke hangs from. */
const pivotOf = (l: Lamp, t: number): Pt => [l.x, TRUSS.y + trussDrop(t) + 0.14]

/**
 * How much of the rig's light falls near `x` at `t`: the pools, each a soft hump; for the rims of curtains, heads and
 * the podium. About 0..1.5.
 */
export function lightAt(x: number, t: number): number {
  let v = 0
  const add = (l: Lamp, i: number) => {
    const b = l.bright(t)
    if (b <= 0.01) return
    const [ax] = aimOf(l, i, t)
    v += b * Math.exp(-(((x - ax) / 1.6) ** 2))
  }
  LAMPS.forEach(add)
  add(FOLLOW_SPOT, 9)
  return Math.min(1.5, v * 0.6)
}

/* ------------------------------------------------------------------ drawing */

type Frame = ReturnType<typeof frame>

function drawTruss(p: p5, c: Ctx, f: Frame, t: number): void {
  const k = c.k
  const yb = TRUSS.y + trussDrop(t)
  const yt = yb - TRUSS.h
  if (f.y0 > yb + 1) return
  const x0 = Math.max(TRUSS.x0, f.x0 - 1)
  const x1 = Math.min(TRUSS.x1, f.x1 + 1)
  // The chains it hangs from.
  p.stroke(mixHex(A.stageEdge, A.crowd, 0.35))
  p.strokeWeight(Math.max(1, 0.025 * k))
  for (const cx of [-4.6, 3.1, 10.2]) if (cx > f.x0 - 1 && cx < f.x1 + 1) p.line(cx * k, yt * k, cx * k, (yt - 12) * k)
  if (x1 <= x0) return
  // The lacing between the chords, then the chords.
  p.stroke(mixHex(A.stageEdge, A.crowd, 0.25))
  p.strokeWeight(Math.max(1, 0.022 * k))
  const step = 0.34
  for (let x = Math.floor(x0 / step) * step; x < x1; x += step) {
    p.line(x * k, yb * k, (x + step / 2) * k, yt * k)
    p.line((x + step / 2) * k, yt * k, (x + step) * k, yb * k)
  }
  p.stroke(A.stageEdge)
  p.strokeWeight(Math.max(1.2, 0.05 * k))
  p.line(x0 * k, yb * k, x1 * k, yb * k)
  p.line(x0 * k, yt * k, x1 * k, yt * k)
  // A thread of the lamps' light along the bottom chord's underside.
  p.stroke(rgba(A.spot, 0.16))
  p.strokeWeight(Math.max(1, 0.018 * k))
  p.line(x0 * k, (yb + 0.03) * k, x1 * k, (yb + 0.03) * k)
}

/** A stage lamp: its yoke, its barrel, the barn doors at its lens; the lens aglow when it is on. */
function drawLamp(p: p5, c: Ctx, pivot: Pt, aim: Pt, b: number): Pt {
  const k = c.k
  const dx = aim[0] - pivot[0]
  const dy = aim[1] - pivot[1]
  const L = Math.hypot(dx, dy) || 1
  const d: Pt = [dx / L, dy / L]
  const n: Pt = [-d[1], d[0]]
  const lens: Pt = [pivot[0] + d[0] * 0.3, pivot[1] + d[1] * 0.3]
  const back: Pt = [pivot[0] - d[0] * 0.26, pivot[1] - d[1] * 0.26]
  const w = 0.105
  // The clamp and the yoke.
  p.stroke(mixHex(A.stageEdge, A.crowd, 0.2))
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.line(pivot[0] * k, (pivot[1] - 0.14) * k, pivot[0] * k, pivot[1] * k)
  p.noFill()
  p.line((pivot[0] + n[0] * (w + 0.03)) * k, (pivot[1] + n[1] * (w + 0.03)) * k, (pivot[0] - n[0] * (w + 0.03)) * k, (pivot[1] - n[1] * (w + 0.03)) * k)
  // The barrel.
  p.stroke(rgba(c.ink, 0.5))
  p.strokeWeight(c.weight * 0.6)
  p.fill(A.runway)
  p.beginShape()
  p.vertex((back[0] + n[0] * w * 0.8) * k, (back[1] + n[1] * w * 0.8) * k)
  p.vertex((lens[0] + n[0] * w) * k, (lens[1] + n[1] * w) * k)
  p.vertex((lens[0] - n[0] * w) * k, (lens[1] - n[1] * w) * k)
  p.vertex((back[0] - n[0] * w * 0.8) * k, (back[1] - n[1] * w * 0.8) * k)
  p.endShape(p.CLOSE)
  // Barn doors: two flaps opening off the lens.
  for (const s of [1, -1]) {
    const a: Pt = [lens[0] + n[0] * w * s, lens[1] + n[1] * w * s]
    const e: Pt = [a[0] + d[0] * 0.1 + n[0] * 0.05 * s, a[1] + d[1] * 0.1 + n[1] * 0.05 * s]
    p.line(a[0] * k, a[1] * k, e[0] * k, e[1] * k)
  }
  // The lens.
  p.noStroke()
  p.fill(b > 0.02 ? mixHex(A.stageEdge, A.spot, clamp01(b)) : A.stageEdge)
  p.beginShape()
  p.vertex((lens[0] + n[0] * w * 0.85) * k, (lens[1] + n[1] * w * 0.85) * k)
  p.vertex((lens[0] + n[0] * w * 0.85 + d[0] * 0.03) * k, (lens[1] + n[1] * w * 0.85 + d[1] * 0.03) * k)
  p.vertex((lens[0] - n[0] * w * 0.85 + d[0] * 0.03) * k, (lens[1] - n[1] * w * 0.85 + d[1] * 0.03) * k)
  p.vertex((lens[0] - n[0] * w * 0.85) * k, (lens[1] - n[1] * w * 0.85) * k)
  p.endShape(p.CLOSE)
  if (b > 0.01) bloom(p, k, [lens[0] + d[0] * 0.05, lens[1] + d[1] * 0.05], 0.34, A.spot, 0.5 * clamp01(b))
  return [lens[0] + d[0] * 0.03, lens[1] + d[1] * 0.03]
}

/** The light of every lamp: beams in the air, pools on the floor. */
function drawLight(p: p5, c: Ctx, t: number): void {
  const k = c.k
  // The follow spot: a long narrow shaft from the back of the house.
  const fb = FOLLOW_SPOT.bright(t)
  const fa = aimOf(FOLLOW_SPOT, 9, t)
  beam(p, k, FOLLOW, fa, 0.3, 0.66, A.spot, 0.42 * fb)
  pool(p, k, [fa[0], fa[1] + 0.04], 0.52, 0.085, A.warm, 0.62 * fb)
  pool(p, k, [fa[0], fa[1] + 0.03], 0.26, 0.05, A.spot, 0.5 * fb)
  LAMPS.forEach((l, i) => {
    const b = clamp01(l.bright(t))
    if (b <= 0.01) return
    const pivot = pivotOf(l, t)
    const aim = aimOf(l, i, t)
    const dx = aim[0] - pivot[0]
    const dy = aim[1] - pivot[1]
    const L = Math.hypot(dx, dy) || 1
    const lens: Pt = [pivot[0] + (dx / L) * 0.33, pivot[1] + (dy / L) * 0.33]
    const far = l.pools(t) ? aim : [aim[0] + (dx / L) * 0.6, aim[1] + (dy / L) * 0.6] as Pt
    beam(p, k, lens, far, 0.16, 0.95, A.spot, 0.22 * b)
    if (l.pools(t)) {
      pool(p, k, [aim[0], aim[1] + 0.04], 0.62, 0.09, A.warm, 0.42 * b)
      pool(p, k, [aim[0], aim[1] + 0.03], 0.3, 0.05, A.spot, 0.34 * b)
    }
  })
}

/**
 * The trophy: a gold figure striking a pose (a hand on its cocked hip, its head tilted) on a stepped black base, no
 * plaque; a ring on its head for the wire. Drawn from its foot, turned by `tilt`.
 */
function drawTrophy(p: p5, c: Ctx, foot: Pt, tilt: number, lit: number, dark = 0): void {
  const gold = mixHex(A.trophy, A.crowd, dark)
  const k = c.k
  const X = (v: number) => v * k
  p.push()
  p.translate(X(foot[0]), X(foot[1]))
  p.rotate(tilt)
  const ink = rgba(c.ink, 0.62)
  const w = c.weight * 0.65
  // The base.
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(A.runway)
  p.rect(X(-0.15), X(-0.1), X(0.3), X(0.1))
  p.rect(X(-0.115), X(-0.185), X(0.23), X(0.085))
  p.stroke(A.gold)
  p.strokeWeight(Math.max(1, X(0.016)))
  p.line(X(-0.145), X(-0.1), X(0.145), X(-0.1))
  // The raised arm, hand on the hip: under the body, so the body's outline closes over its shoulder.
  const arm: Pt[] = [
    [0.07, -0.7],
    [0.158, -0.616],
    [0.08, -0.535],
  ]
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(X(0.036) + w * 2)
  p.beginShape()
  for (const [x, y] of arm) p.vertex(X(x), X(y))
  p.endShape()
  p.stroke(gold)
  p.strokeWeight(X(0.036))
  p.beginShape()
  for (const [x, y] of arm) p.vertex(X(x), X(y))
  p.endShape()
  // The body.
  const body: Pt[] = [
    [0.045, -0.185],
    [0.05, -0.34],
    [0.082, -0.48],
    [0.05, -0.575],
    [0.062, -0.66],
    [0.078, -0.712],
    [0.022, -0.758],
    [-0.022, -0.758],
    [-0.076, -0.71],
    [-0.093, -0.66],
    [-0.1, -0.55],
    [-0.086, -0.5],
    [-0.07, -0.515],
    [-0.066, -0.64],
    [-0.046, -0.58],
    [-0.064, -0.48],
    [-0.04, -0.34],
    [-0.04, -0.185],
  ]
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(gold)
  p.beginShape()
  for (const [x, y] of body) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
  // Its shaded side, away from the light.
  p.noStroke()
  p.fill(mixHex(mixHex(A.gold, A.curtainShade, 0.3), A.crowd, dark))
  p.beginShape()
  for (const [x, y] of body.slice(9)) p.vertex(X(x * 0.92), X(y))
  p.vertex(X(-0.01), X(-0.185))
  p.vertex(X(-0.012), X(-0.74))
  p.endShape(p.CLOSE)
  // The head, tilted: the pout.
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(gold)
  p.push()
  p.translate(X(0.014), X(-0.812))
  p.rotate(0.35)
  p.ellipse(0, 0, X(0.07), X(0.086))
  p.pop()
  // The ring for the wire.
  p.noFill()
  p.stroke(A.gold)
  p.strokeWeight(Math.max(1, X(0.014)))
  p.circle(X(0.016), X(-0.878), X(0.04))
  // The light down its lit side.
  if (lit > 0.02) {
    p.stroke(rgba(A.bulb, 0.85 * clamp01(lit)))
    p.strokeWeight(Math.max(1, X(0.014)))
    p.noFill()
    p.beginShape()
    for (const [x, y] of body.slice(1, 6)) p.vertex(X(x - 0.014), X(y))
    p.endShape()
  }
  p.pop()
}

function drawTrophyRig(p: p5, c: Ctx, f: Frame, t: number): void {
  const k = c.k
  const q = trophyAt(t)
  const yb = TRUSS.y + trussDrop(t)
  // The trolley on the truss's bottom chord: two wheels, its drum, and the wire down to the ring.
  if (q.tx > f.x0 - 1 && q.tx < f.x1 + 1 && f.y0 < yb + 1) {
    p.stroke(rgba(c.ink, 0.55))
    p.strokeWeight(c.weight * 0.6)
    p.fill(A.runway)
    p.rect((q.tx - 0.17) * k, (yb + 0.02) * k, 0.34 * k, 0.15 * k, 0.03 * k)
    p.fill(A.stageEdge)
    p.circle((q.tx - 0.1) * k, yb * k, 0.09 * k)
    p.circle((q.tx + 0.1) * k, yb * k, 0.09 * k)
  }
  const ring: Pt = [q.crown[0] + Math.sin(q.tilt) * 0.02, q.crown[1] + 0.02]
  p.stroke(rgba(c.ink, 0.45))
  p.strokeWeight(Math.max(1, 0.016 * k))
  p.line(q.tx * k, (yb + 0.17) * k, ring[0] * k, ring[1] * k)
  // Its glow in its own lamp.
  const lit = clamp01(LAMPS[2].bright(t))
  const mid: Pt = [(q.foot[0] + q.crown[0]) / 2, (q.foot[1] + q.crown[1]) / 2]
  if (lit > 0.01) bloom(p, k, mid, 0.85, A.warm, 0.2 * lit)
  drawTrophy(p, c, q.foot, q.tilt, lit, 0.55 * (1 - lit))
  void TROPHY_H
}

/** The rig and its light, and the trophy: drawn over the theatre, under the balls. */
export function drawRig(p: p5, c: Ctx, t: number): void {
  const f = frame(p, c.k)
  p.push()
  p.rectMode(p.CORNER)
  drawTruss(p, c, f, t)
  drawLight(p, c, t)
  LAMPS.forEach((l, i) => {
    const pivot = pivotOf(l, t)
    if (pivot[0] < f.x0 - 1 || pivot[0] > f.x1 + 1 || f.y0 > pivot[1] + 1) return
    drawLamp(p, c, pivot, aimOf(l, i, t), clamp01(l.bright(t)))
  })
  drawTrophyRig(p, c, f, t)
  p.pop()
}
