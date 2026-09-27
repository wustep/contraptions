import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { flashAt, flashBurst, rgba } from '../cast'
import { hash, smooth, type frame } from '../kit'
import { beat, beatAt, half, level } from '../music'
import { DERELICTE } from '../worlds'
import { FLOOR_Y, MAGNUM } from './geo'
import { AIR, B0, BACKS, BAND, derekAt, FOLLOW_ON, houseAt, LANDS, powerAt, W, worksAt } from './runway-clock'

/**
 * The audience and the press (the runway builder's), downstage, in front of everything: silhouettes, heads and
 * shoulders merged into one dark mass, rimmed where the runway's light catches them, heaving with the loudness. The
 * press pit along the runway's last third, cameras up, and the photographers crouched in the front row past its end;
 * their flashes (`flashBurst`) on the beats. Drawn over the balls.
 */

type Frame = ReturnType<typeof frame>
const CROWD = DERELICTE.crowd
const RIM = mixHex(DERELICTE.crowdRim, DERELICTE.spot, 0.35)
/** The nearest row is nearer us than the runway: it slides past faster than the set when the camera travels. */
const FRONT_PARALLAX = -0.45
const FIRE_RIM = mixHex(DERELICTE.crowdRim, DERELICTE.fire, 0.45)
const COLD_RIM = mixHex(DERELICTE.crowdRim, DERELICTE.star, 0.55)

/** The photographers crouched in the front row past the runway's end. */
const PRESS_FRONT_X = [20.75, 24.95, 25.75, 26.55]

interface Person {
  x: number
  head: number
  r: number
  seed: number
  hat: boolean
}
const person = (x: number, head: number, i: number): Person => ({ x, head: head + 0.14 * (hash(i, 2) - 0.5), r: 0.1 + 0.04 * hash(i, 3), seed: i, hat: hash(i, 6) > 0.92 })
/** Seated along the runway, a row behind (with the press pit standing at its far end) and a row in front. */
const BACK: Person[] = []
const FRONT: Person[] = []
/** The front row past the runway's end, low (with the photographers crouched in it), and the row just behind it. */
const LOW: Person[] = []
const LOW_FAR: Person[] = []
{
  let i = 0
  const gap = (j: number) => 0.3 + 0.32 * hash(j, 1) + (hash(j, 9) > 0.9 ? 0.3 : 0)
  for (let x = 0.62; x < 12.9; x += gap(i)) BACK.push(person(x, 0.98, i++))
  // (The front row runs on past the runway's ends: it is drawn with parallax, and only the part before the runway shows.)
  for (let x = -14; x < 40; x += gap(i)) FRONT.push(person(x, 1.47, i++))
  for (let x = 20.3; x < 37; x += gap(i)) LOW_FAR.push(person(x, 2.66, i++))
  for (let x = 20.45; x < 37; x += gap(i)) {
    if (PRESS_FRONT_X.some((px) => Math.abs(px - x) < 0.3)) continue
    LOW.push(person(x, 2.9, i++))
  }
}

/* ------------------------------------------------------------------ the press */

interface Shooter {
  x: number
  head: number
  low: boolean
  hat: boolean
  side: 1 | -1
  flashes: number[]
}
const PIT_X = Array.from({ length: 11 }, (_, i) => 13.25 + 0.62 * i)
export const PRESS: Shooter[] = [
  ...PIT_X.map((x, i): Shooter => ({ x, head: 0.74 + 0.06 * (hash(i, 11) - 0.5), low: false, hat: hash(i, 12) > 0.8, side: hash(i, 13) > 0.5 ? 1 : -1, flashes: [] })),
  ...PRESS_FRONT_X.map((x, i): Shooter => ({ x, head: 2.74, low: true, hat: i === 2, side: i === 0 ? 1 : -1, flashes: [] })),
]
const pit = (i: number) => PRESS[i]
const front = (i: number) => PRESS[PIT_X.length + i]

/** Who fires when: every flash is on a beat or an off-beat. */
function schedule(): void {
  const fire = (s: Shooter, t: number) => s.flashes.push(t)
  // The stride down the runway: on its downbeats and hard beats, whoever is just ahead of him.
  for (let k = 256; k <= 295; k++) {
    const b = beatAt(k)
    if (!b || !(k % 4 === 0 || b.s >= 0.62)) continue
    const x = derekAt(beat(k))[0]
    if (x < 9.6) continue
    const want = x + 1.1 + (hash(k, 5) - 0.5) * 1.8
    let best = 0
    for (let i = 1; i < PIT_X.length; i++) if (Math.abs(PIT_X[i] - want) < Math.abs(PIT_X[best] - want)) best = i
    fire(pit(best), beat(k))
  }
  // In his face as the camera travels with him: a flash on every downbeat and third beat, whoever is at his shoulder.
  for (let k = 276; k <= 295; k++) {
    if (k % 4 !== 0 && k % 4 !== 2) continue
    const x = derekAt(beat(k))[0] + 0.45
    let best = 0
    for (let i = 1; i < PIT_X.length; i++) if (Math.abs(PIT_X[i] - x) < Math.abs(PIT_X[best] - x)) best = i
    if (Math.abs(PIT_X[best] - x) < 1.2) fire(pit(best), beat(k))
  }
  // The end of the runway: the model's stop, and the volley.
  for (const i of [7, 8, 9, 10]) fire(pit(i), beat(296))
  fire(pit(6), half(296))
  fire(pit(10), beat(297))
  fire(pit(8), beat(298))
  // Down the steps, and across the front.
  fire(front(0), beat(300))
  fire(pit(10), beat(302))
  fire(front(1), beat(304))
  fire(pit(9), beat(306))
  fire(front(2), beat(312))
  fire(front(0), beat(320))
  // The rock: on its hard beats.
  fire(pit(10), beat(331))
  fire(front(1), beat(332))
  fire(front(2), beat(339))
  fire(pit(9), beat(340))
  fire(front(0), beat(347))
  fire(front(3), beat(348))
  fire(pit(10), beat(349))
  // Let go: the front row's photographers, as the band comes back.
  fire(front(1), BAND)
  fire(front(3), BAND)
  // They find Mugatu: one lights him up; then the heap, and a volley on it.
  fire(pit(7), BACKS)
  for (const i of [6, 7, 8]) fire(pit(i), LANDS)
  fire(pit(5), beat(366))
  fire(pit(8), beat(367))
  fire(pit(6), beat(368))
  fire(pit(7), half(369))
  // The two of them, posing, to the cut.
  fire(front(0), beat(380))
  fire(front(1), beat(380))
  fire(front(2), beat(381))
  fire(front(0), beat(382))
  fire(front(1), beat(384))
  fire(pit(10), beat(384))
  fire(front(3), beat(385))
  fire(front(0), beat(386))
  fire(front(2), beat(387))
  fire(front(3), half(387))
  // The one that fires the cut into the Center, on the finale's downbeat.
  fire(front(1), beat(388))
  for (const s of PRESS) s.flashes.sort((a, b) => a - b)
}
schedule()

/** Every flash's time, for the strikes. */
export const PRESS_HITS: number[] = [...new Set(PRESS.flatMap((s) => s.flashes))].sort((a, b) => a - b)

/** Seconds since a flash fired, on the world's clock: the look holds a flash fired on it at its brightest. */
function flashU(fired: number, t: number): number {
  if (Math.abs(fired - MAGNUM) < 1e-6) {
    if (t < MAGNUM) return -1
    if (t < BAND) return Math.min(t - MAGNUM, 0.028)
    return 0.028 + (t - BAND)
  }
  return W(t) - W(fired)
}
/** The most recent flash of a shooter: its `u`. */
function lastFlash(s: Shooter, t: number): number {
  let best = Infinity
  for (const at of s.flashes) {
    const u = flashU(at, t)
    if (u >= 0 && u < best) best = u
  }
  return best
}

/** How far their cameras are up: down in the break, up as he comes out. */
const raised = (s: Shooter, t: number) => (s.low ? 1 : smooth(t, FOLLOW_ON + 0.1 + 0.07 * (s.x % 3), FOLLOW_ON + 0.6 + 0.07 * (s.x % 3)))
/** A shooter's head at `t`: a bob with the loudness, and a kick as the flash goes. */
function shooterHead(s: Shooter, t: number, tw: number): number {
  const u = lastFlash(s, t)
  const kick = u < 0.3 ? 0.03 * Math.exp(-u / 0.08) : 0
  return s.head + 0.03 * Math.sin(tw * 5.1 + s.x * 3) * level(t) + kick
}
/** Where a shooter's camera and its flash gun's reflector are. */
function camera(s: Shooter, t: number, tw: number): { cx: number; cy: number; rx: number; ry: number; up: number } {
  const up = raised(s, t)
  const hy = shooterHead(s, t, tw)
  const cx = s.x + s.side * 0.13
  const cy = hy + 0.02 + (1 - up) * 0.42
  return { cx, cy, rx: cx + s.side * 0.05, ry: cy - 0.3, up }
}

/* ------------------------------------------------------------------ silhouettes */

/**
 * A row of people as one dark mass: its top edge sampled across the frame as the highest of every head, shoulder,
 * hat and camera over each point, then filled down to the bottom, and rimmed along that edge where the light is.
 */
class Contour {
  xs: number[] = []
  ys: number[] = []
  constructor(readonly x0: number, readonly dx: number, n: number, base: number) {
    for (let i = 0; i < n; i++) {
      this.xs.push(x0 + i * dx)
      this.ys.push(base)
    }
  }
  private span(a: number, b: number, fn: (x: number) => number): void {
    const i0 = Math.max(0, Math.ceil((a - this.x0) / this.dx))
    const i1 = Math.min(this.xs.length - 1, Math.floor((b - this.x0) / this.dx))
    for (let i = i0; i <= i1; i++) {
      const y = fn(this.xs[i])
      if (y < this.ys[i]) this.ys[i] = y
    }
  }
  circle(cx: number, cy: number, r: number): void {
    this.span(cx - r, cx + r, (x) => cy - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx))))
  }
  dome(cx: number, top: number, hw: number, h: number): void {
    this.span(cx - hw, cx + hw, (x) => top + h * (1 - Math.sqrt(Math.max(0, 1 - ((x - cx) / hw) ** 2))))
  }
  rect(x0: number, x1: number, top: number): void {
    this.span(x0, x1, () => top)
  }
  /** Shoulders falling away from the neck. */
  slope(cx: number, top: number, hw: number, h: number): void {
    this.span(cx - hw, cx + hw, (x) => top + h * Math.pow(Math.abs(x - cx) / hw, 1.6))
  }
}

/**
 * One person into a contour: head on a neck on falling shoulders, and hair of their own: a bob, a knot, a quiff, a
 * crop, big hair, a hood; a cap turned round on a few. Bare heads mostly: a fashion crowd, not a newsreel's.
 */
function figure(c: Contour, x: number, hy: number, r: number, cap: boolean, seed = 0): void {
  const tilt = (hash(seed, 21) - 0.5) * 0.07
  const side = hash(seed, 25) > 0.5 ? 1 : -1
  const hair = hash(seed, 22)
  if (hair < 0.62 || hair >= 0.72) c.circle(x + tilt, hy, r)
  if (hair < 0.3) c.circle(x + tilt - side * 0.035, hy - 0.015, r * 0.95) // a bob
  else if (hair < 0.42) c.circle(x + tilt + 0.02, hy - r * 0.95, r * 0.42) // a knot
  else if (hair < 0.52) c.circle(x + tilt + side * r * 0.5, hy - r * 0.78, r * 0.5) // a quiff
  else if (hair < 0.62) c.dome(x + tilt, hy - r * 0.2, r * 1.25, r * 1.6) // big hair
  else if (hair < 0.72) c.dome(x + tilt, hy - r * 1.05, r * 1.3, r * 2.3) // a hood
  if (cap) c.rect(x + tilt + side * r * 0.3, x + tilt + side * (r + 0.09), hy - r * 0.55) // a cap's peak
  // Shoulders falling from the neck, one a little higher.
  c.slope(x + 0.03 * (hash(seed, 23) - 0.5), hy + r * 0.8, 0.42 + 0.06 * hash(seed, 24), 0.3)
}

function fillContour(p: p5, k: number, c: Contour, bottom: number, fill: string, rim: number, rimColor: string): void {
  const X = (v: number) => v * k
  const n = c.xs.length
  if (n < 2) return
  p.push()
  p.noStroke()
  p.fill(fill)
  p.beginShape()
  p.vertex(X(c.xs[0]), X(bottom))
  for (let i = 0; i < n; i++) p.vertex(X(c.xs[i]), X(c.ys[i]))
  p.vertex(X(c.xs[n - 1]), X(bottom))
  p.endShape(p.CLOSE)
  // Rimmed only where the light falls: the tops of heads and shoulders, never round their sides (no ringed heads).
  if (rim > 0.01) {
    p.noFill()
    p.stroke(rgba(rimColor, rim))
    p.strokeWeight(Math.max(1, X(0.02)))
    let open = false
    for (let i = 0; i + 1 < n; i++) {
      const flat = Math.abs(c.ys[i + 1] - c.ys[i]) / (c.xs[i + 1] - c.xs[i]) < 0.55
      if (flat && !open) {
        p.beginShape()
        p.vertex(X(c.xs[i]), X(c.ys[i]))
        open = true
      }
      if (flat) p.vertex(X(c.xs[i + 1]), X(c.ys[i + 1]))
      if (!flat && open) {
        p.endShape()
        open = false
      }
    }
    if (open) p.endShape()
  }
  p.pop()
}

/** A row of the audience, with any press in it, across the part of it in the frame. */
function drawRow(p: p5, k: number, f: Frame, t: number, tw: number, people: Person[], press: Shooter[], fill: string, rim: number, x0: number, x1: number, base: number, rimColor = RIM, shift = 0): void {
  const a = Math.max(x0, f.x0 - 0.5)
  const b = Math.min(x1, f.x1 + 0.5)
  if (b <= a) return
  const dx = Math.max(0.02, 1.2 / k)
  const c = new Contour(a, dx, Math.ceil((b - a) / dx) + 1, base)
  const lv = level(t)
  for (const q of people) {
    const qx = q.x + shift
    if (qx < a - 0.6 || qx > b + 0.6) continue
    const heave = 0.05 * lv * (0.5 + 0.5 * Math.sin(tw * (1.7 + 0.6 * hash(q.seed, 4)) + q.seed))
    const settle = 0.04 * (1 - smooth(t, B0, B0 + 3)) * Math.sin(tw * 3 + q.seed)
    figure(c, qx, q.head - heave + settle, q.r, q.hat, q.seed)
  }
  for (const s of press) {
    if (s.x < a - 0.8 || s.x > b + 0.8) continue
    const hy = shooterHead(s, t, tw)
    figure(c, s.x, hy, 0.11, s.hat, Math.round(s.x * 10))
    const { cx, cy, rx, ry, up } = camera(s, t, tw)
    // The camera at the face, its lens toward the runway, and the flash gun standing over it.
    c.rect(cx - 0.14, cx + 0.14, cy - 0.085)
    c.rect(cx + s.side * 0.12 - 0.05, cx + s.side * 0.12 + 0.05, cy - 0.04)
    if (up > 0.5) {
      c.rect(rx - 0.025, rx + 0.025, ry + 0.04)
      c.rect(rx - 0.08, rx + 0.08, ry - 0.045)
    }
  }
  fillContour(p, k, c, f.y1 + 1, fill, rim, rimColor)
}

/** The audience and the press, and their flashes. */
export function drawCrowd(p: p5, k: number, f: Frame, t: number): void {
  const X = (v: number) => v * k
  if (f.y1 < 0.6) return
  const tw = AIR(t)
  const house = houseAt(t)
  // Rimmed by the show's light; by the fires alone in the dark after the plug; by the house's cold lamps after the band.
  const show = powerAt(t)
  const works = Math.min(1, worksAt(t))
  const rim = (0.22 + 0.25 * house) * show + 0.14 * (1 - show) * (1 - works) + 0.34 * works
  const rimColor = works > 0 ? mixHex(FIRE_RIM, COLD_RIM, works) : mixHex(FIRE_RIM, RIM, show)
  const pitPress = PRESS.filter((s) => !s.low)
  const lowPress = PRESS.filter((s) => s.low)
  drawRow(p, k, f, t, tw, BACK, pitPress, mixHex(CROWD, DERELICTE.roof, 0.45), rim * 0.8, 0.35, 19.75, 1.36, rimColor)
  drawRow(p, k, f, t, tw, FRONT, [], CROWD, rim, 0.5, 19.72, 1.84, rimColor, FRONT_PARALLAX * (f.cx - 10))
  drawRow(p, k, f, t, tw, LOW_FAR, [], mixHex(CROWD, DERELICTE.roof, 0.4), rim * 0.7, 20.1, 37, 3.05, rimColor)
  drawRow(p, k, f, t, tw, LOW, lowPress, CROWD, rim * 0.5, 20.3, 37, 3.3, rimColor)
  // The reflectors catch the light; then the flashes, over everything.
  p.push()
  p.noStroke()
  p.rectMode(p.CENTER)
  for (const s of PRESS) {
    if (s.x < f.x0 - 1 || s.x > f.x1 + 1) continue
    const { rx, ry, up } = camera(s, t, tw)
    if (up < 0.5) continue
    p.fill(mixHex(DERELICTE.steelDark, DERELICTE.paper, (0.32 + 0.22 * house) * (0.25 + 0.75 * Math.max(show, works))))
    p.rect(X(rx - s.side * 0.01), X(ry - 0.04), X(0.13), X(0.06), X(0.01))
  }
  p.pop()
  for (const s of PRESS) {
    if (s.x < f.x0 - 2 || s.x > f.x1 + 2) continue
    const u = lastFlash(s, t)
    if (u > 1.2) continue
    const { rx, ry } = camera(s, t, tw)
    flashBurst(p, k, [rx, ry - 0.02], u, s.low ? 1.0 : 1.15)
  }
}

/** How much light the flashes are throwing at `t` (for the wash on the set), and from where (the brightest). */
export function flashWash(t: number): { a: number; x: number } {
  let a = 0
  let x = 0
  for (const s of PRESS) {
    const u = lastFlash(s, t)
    if (u > 1.2) continue
    const v = flashAt(u).pop
    if (v > a) {
      a = v
      x = s.x
    }
  }
  return { a, x }
}
export { FLOOR_Y }
