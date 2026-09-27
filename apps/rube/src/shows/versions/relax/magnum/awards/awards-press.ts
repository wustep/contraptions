import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { flashBurst, rgba } from '../cast'
import { frame, hash, type Ctx } from '../kit'
import { bar, beat, half, level } from '../music'
import { AWARDS as A } from '../worlds'
import {
  ARRIVE,
  CROWNED,
  CUT,
  derekAt,
  ease,
  HANSEL_STOP,
  HOUSE,
  RUNWAY_FLASHES,
  hanselAt,
  JOY,
  LEG_R,
  LIP_VOLLEY,
  mugatuAt,
  PASS,
  RAISE,
  settle,
  SWING,
  VOLLEY,
} from './awards-clock'
import { lightAt } from './awards-rig'
import { pitSpill } from './awards-set'
import { hairOf, person, personRim } from './awards-crowd'

/**
 * The press and the house in front (the AWARDS builder's): silhouettes, never balls, never faces. The press pit stands
 * past the runway's end, cameras up; a row of them crouches at the stage's lip in front of the seats; the seats are
 * one dark mass of heads and shoulders along the bottom of the frame, rimmed where the stage's light reaches them.
 *
 * Everyone's camera is on whoever has the light: Derek until the drums, then (the press turn: their cameras swing
 * round over their heads, a camera at a time) Hansel. They fire on the look (the volley on 5.126), a volley at Hansel as
 * he rolls into the light (11.268, 11.529, 11.785), on his downbeats, and one in the wings fires the flash the cut is
 * made in.
 */

interface Shooter {
  /** Where they stand (for the foreground, in its own nearer space: see `near`). */
  x: number
  /** The top of their head. */
  top: number
  /** How big: the foreground is nearer, and bigger. */
  scale: number
  flashes: number[]
  /** How much later than the first they turn on the drums. */
  turn: number
  /** Their hair (`hairOf`). */
  hair?: number
}

/** From angle `a` to `b` by the shorter way round, `u` of the way. */
function turnTo(a: number, b: number, u: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return a + d * u
}
/** Where a camera held at `cam` points at `t`: at Derek until the drums, then swung round (over the top) onto Hansel. */
function aimOf(s: Shooter, cam: Pt, t: number): number {
  const at = (q: Pt) => Math.max(-Math.PI + 0.15, Math.min(-0.15, Math.atan2(q[1] - cam[1], q[0] - cam[0])))
  const d = at(derekAt(t))
  if (t <= SWING + s.turn) return d
  return turnTo(d, at(hanselAt(t)), settle(t - SWING - s.turn, 0.1, 5.5))
}

/** The press pit, past the runway's end, down on the house floor: their heads at the runway's edge, cameras up over them. */
const PIT: Shooter[] = [
  { x: -4.98, top: 0.1, scale: 1, flashes: [VOLLEY[1], ARRIVE, beat(41)], turn: 0.05 },
  { x: -5.66, top: 0.02, scale: 1, flashes: [VOLLEY[0], half(32), bar(11)], turn: 0.2 },
  { x: -6.36, top: 0.12, scale: 1, flashes: [VOLLEY[2], beat(33), bar(9)], turn: 0.12 },
  { x: -7.06, top: 0.0, scale: 1, flashes: [VOLLEY[0], half(33), bar(12)], turn: 0.3 },
  { x: -7.78, top: 0.1, scale: 1, flashes: [VOLLEY[3], ARRIVE, bar(10), beat(46)], turn: 0.18 },
  { x: -8.5, top: 0.05, scale: 1, flashes: [], turn: 0.4 },
]
/** At the stage's lip, down in front of the seats, cameras up over their heads. */
const LIP: Shooter[] = [
  { x: -1.0, top: 0.7, scale: 1.2, flashes: RUNWAY_FLASHES, turn: 0.14, hair: 2 },
  // The press row under the podium, between Derek and the wings: on the drums their cameras swing round off him onto
  // Hansel, and fire a volley at him as he rolls into the light.
  { x: 2.9, top: 0.66, scale: 1.2, flashes: [LIP_VOLLEY[2], CROWNED, PASS], turn: 0.06, hair: 1 },
  { x: 3.55, top: 0.61, scale: 1.2, flashes: [LIP_VOLLEY[0], JOY], turn: 0.0 },
  { x: 4.4, top: 0.68, scale: 1.2, flashes: [LIP_VOLLEY[1], HANSEL_STOP, CROWNED], turn: 0.03, hair: 3 },
]
/** The one who has come round into the wings, and fires the cut. */
const WINGS: Shooter = { x: 9.3, top: 0.66, scale: 1.25, flashes: [CUT], turn: 0 }
const WINGS_UP = RAISE - 0.6

/** The foreground's nearness: it slides past faster than the stage as the camera moves. */
const NEAR = 1.18
const near = (x: number, cx: number): number => cx + (x - cx) * NEAR

/** The newest flash of `s` at `t`, as seconds since, or Infinity. */
const lastFlash = (s: Shooter, t: number): number => {
  let best = Infinity
  for (const at of s.flashes) if (at <= t && t - at < best) best = t - at
  return best
}

/**
 * One photographer in silhouette at `x` (as drawn): head and shoulders in one dark mass down to `floor`, both arms up,
 * the camera held over the head (or, `raise` below 1, still coming up from the chest) and turned to its target, the
 * flash gun on it. Returns the flash gun's face, where it fires from.
 */
function drawShooter(p: p5, c: Ctx, s: Shooter, x: number, top: number, floor: number, t: number, rim: number, raise = 1, target?: Pt): Pt {
  const k = c.k
  const S = s.scale
  const X = (v: number) => v * k
  const up: Pt = [x + 0.03 * S, top - 0.1 * S]
  const low: Pt = [x - 0.2 * S, top + 0.55 * S]
  const cam: Pt = [low[0] + (up[0] - low[0]) * raise, low[1] + (up[1] - low[1]) * raise]
  let aim = target ? Math.max(-Math.PI + 0.15, Math.min(-0.15, Math.atan2(target[1] - cam[1], target[0] - cam[0]))) : aimOf(s, cam, t)
  // Held low it points down at the floor; raised, at its target.
  if (raise < 1) aim = turnTo(Math.PI - 1.0, aim, raise)
  p.noStroke()
  p.fill(A.crowd)
  person(p, k, x, top, S, floor, s.hair ?? 0)
  // The arms, up from the shoulders to the camera.
  const ys = top + 0.37 * S
  p.stroke(A.crowd)
  p.strokeWeight(X(0.075 * S))
  p.line(X(x - 0.2 * S), X(ys + 0.05 * S), X(cam[0] - 0.07 * S), X(cam[1] + 0.05 * S))
  p.line(X(x + 0.2 * S), X(ys + 0.05 * S), X(cam[0] + 0.07 * S), X(cam[1] + 0.05 * S))
  p.noStroke()
  // The camera and its lens, turned to the target.
  p.push()
  p.translate(X(cam[0]), X(cam[1]))
  p.rotate(aim)
  p.fill(A.crowd)
  p.rect(X(-0.11 * S), X(-0.075 * S), X(0.23 * S), X(0.15 * S), X(0.02 * S))
  p.rect(X(0.11 * S), X(-0.05 * S), X(0.09 * S), X(0.1 * S))
  p.pop()
  // The flash gun on top, upright, its reflector's face (the only thing of them that shines) toward where it points.
  const side = Math.max(-1, Math.min(1, Math.cos(aim) * 4))
  p.fill(A.crowd)
  p.rect(X(cam[0] - 0.018 * S), X(cam[1] - 0.2 * S), X(0.036 * S), X(0.14 * S))
  p.rect(X(cam[0] - 0.07 * S), X(cam[1] - 0.29 * S), X(0.14 * S), X(0.085 * S), X(0.012 * S))
  p.fill(mixHex(A.stageEdge, A.spot, 0.3))
  p.rect(X(cam[0] + side * 0.06 * S - 0.01 * S), X(cam[1] - 0.285 * S), X(0.02 * S), X(0.075 * S))
  personRim(p, k, x, top, S, mixHex(A.crowdRim, A.warm, 0.35), rim)
  return [cam[0] + side * 0.075 * S, cam[1] - 0.248 * S]
}

/** The press pit: drawn with the set, under the balls. */
export function drawPit(p: p5, c: Ctx, t: number): void {
  const f = frame(p, c.k)
  if (f.x0 > -4.3 || f.x1 < -9.4) return
  p.push()
  p.rectMode(p.CORNER)
  for (const s of [...PIT].reverse()) {
    const rim = 0.9 * Math.max(0, Math.min(1, lightAt(s.x + 1.0, t)) - 0.1)
    const face = drawShooter(p, c, s, s.x, s.top, HOUSE, t, rim)
    const u = lastFlash(s, t)
    if (u < 1.2) flashBurst(p, c.k, face, u, 1.45)
  }
  p.pop()
}

/** How far the wings photographer has risen into the frame (0 down, 1 up), and his camera raised over his head. */
const wingsUp = (t: number) => ease(t, WINGS_UP, RAISE - 0.08)
const wingsRaise = (t: number) => ease(t, RAISE - 0.03, RAISE + 0.2)

/**
 * The seats in front, the lip's photographers and the one in the wings: drawn over everything but the flash, in their
 * nearer space.
 */
export function drawFront(p: p5, c: Ctx, t: number): void {
  const k = c.k
  const f = frame(p, k)
  if (f.y1 < 0.55) return
  p.push()
  p.rectMode(p.CORNER)
  const cx = f.cx
  // The seats: heads and shoulders, one mass, ending at the house's side wall under the proscenium (the wings have none).
  const gap = 0.64
  const S = 1.22
  const u0 = cx + (f.x0 - 1 - cx) / NEAR
  const u1 = Math.min(LEG_R.x1 - 0.2, cx + (f.x1 + 1 - cx) / NEAR)
  const heave = level(t)
  const row: [number, number][] = []
  p.noStroke()
  p.fill(A.crowd)
  for (let i = Math.floor(u0 / gap) - 1; i <= Math.ceil(u1 / gap) + 1; i++) {
    const u = i * gap + (hash(i, 4) - 0.5) * 0.2
    if (u > u1) continue
    if (LIP.some((s) => Math.abs(s.x - u) < 0.4)) continue
    const x = near(u, cx)
    const bob = 0.02 * heave * (0.5 + 0.5 * Math.sin(1.9 * t + i * 2.3))
    const top = 0.8 + (hash(i, 6) - 0.5) * 0.12 - bob
    row.push([x, top])
    p.fill(A.crowd)
    person(p, k, x, top, S * (0.92 + 0.14 * hash(i, 5)), f.y1 + 1, hairOf(i, 7))
  }
  // Rimmed only where the stage's light reaches over the lip: one dark mass elsewhere.
  for (const [x, top] of row) personRim(p, k, x, top, S, A.crowdRim, 1.3 * Math.max(0, Math.min(1, lightAt(x, t)) - 0.15))
  // The lip's photographers.
  for (const s of LIP) {
    const x = near(s.x, cx)
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const rim = 1.0 * Math.max(0, Math.min(1, lightAt(x, t)) - 0.1)
    const face = drawShooter(p, c, s, x, s.top, f.y1 + 1, t, rim)
    const u = lastFlash(s, t)
    if (u < 1.2) flashBurst(p, k, face, u, 1.5)
  }
  // The one in the wings: he comes up over the lip of the stage near the end, raises his camera on beat 50, and fires
  // the flash the cut is made in.
  const up = wingsUp(t)
  if (up > 0.001) {
    const x = near(WINGS.x, cx)
    if (x > f.x0 - 1 && x < f.x1 + 1) {
      const top = WINGS.top + (1 - up) * 1.0
      const d = derekAt(t)
      const m = mugatuAt(t)
      const target: Pt = [(d[0] + m[0]) / 2, d[1] - 0.05]
      const rim = 0.25 + 0.35 * Math.min(1, lightAt(LEG_R.x0, t)) + 0.4 * pitSpill(t)
      const face = drawShooter(p, c, WINGS, x, top, f.y1 + 1, t, rim, wingsRaise(t), target)
      const u = lastFlash(WINGS, t)
      if (u < 1.2) flashBurst(p, k, face, u, 1.9)
    }
  }
  p.pop()
}

/** The flashes out at the runway's end, seen from the wings: a flicker of white from the left of the frame. */
export function drawSpill(p: p5, c: Ctx, t: number): void {
  if (t < ARRIVE) return
  const s = pitSpill(t)
  if (s < 0.01) return
  const k = c.k
  const f = frame(p, k)
  if (f.x0 < -1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const w = (f.x1 - f.x0) * 0.45
  const g = ctx.createLinearGradient(f.x0 * k, 0, (f.x0 + w) * k, 0)
  g.addColorStop(0, rgba(A.spot, 0.08 * s))
  g.addColorStop(1, rgba(A.spot, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, f.y0 * k, w * k, (f.y1 - f.y0) * k)
  ctx.restore()
}
