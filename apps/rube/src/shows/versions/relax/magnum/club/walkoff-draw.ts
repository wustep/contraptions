import type p5 from 'p5'
import { FLOOR, mixHex, R, type Pt } from '../../../../../parts'
import { beam, bloom, flashBurst, glint, pool, rgba } from '../cast'
import { frame, hash } from '../kit'
import { level, PERIOD, PHASE } from '../music'
import { CLUB } from '../worlds'
import {
  barY,
  CEIL,
  cheer,
  CONVERGE,
  D_LINE_LAND,
  D_LUNGE,
  D_POP_TOP,
  D_WALK_STOP,
  ECHOES,
  GATES,
  GRID_HALF,
  GRID_OFF,
  GRID_ON,
  gridBeams,
  gridOn,
  H_CENTRE,
  H_HUM,
  FLARES,
  H_JUMP_TOP,
  H_POP_TOP,
  H_WALK_STOP,
  hanselAt,
  hush,
  IN,
  LAMP,
  lampAt,
  MID,
  OUT,
  plateAt,
  PLATES,
  PRESS,
  RIGS,
  RUN_X0,
  RUN_X1,
  TOUCH,
  WIN,
} from './walkoff-plan'

/**
 * The walk-off, drawn (the CLUB builder's). Underground: a low concrete ceiling with its duct and pipe, the laser
 * rigs hung from it and the judge's lamp; the crowd pressed in the dark behind the floor and in front of it; smoke;
 * and the floor itself, a runway of light with its machines in it (kick plates, laser gates, and in the middle the
 * lenses of the grid). Machines and the room are dark masses, rimmed where the light catches them; light is soft
 * volume, never outlined; lasers are solid thin beams with a soft edge.
 */

type F = ReturnType<typeof frame>
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const sm = (t: number, a: number, b: number) => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/** Steel in the dark; where the runway's light catches it from below; the light itself. */
const STEEL = CLUB.pipe
const RIM = mixHex(CLUB.pipe, CLUB.spot, 0.3)
const LIT = CLUB.spot
const DARK = CLUB.crowd

function rgbOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
const SMOKE = rgbOf(CLUB.smoke)
const SPOT = rgbOf(CLUB.spot)

/* ------------------------------------------------------------------ air and light */

/** A soft lobe of smoke: dense in the middle, nothing at its edge. */
function lobe(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, rgb: string, a: number): void {
  if (a <= 0.004 || rx * k < 1) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(0.45, `rgba(${rgb}, ${a * 0.7})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** A laser: a solid thin core, a soft edge, a faint wide glow in the smoke. Never dashed. */
function laser(ctx: CanvasRenderingContext2D, k: number, a: Pt, b: Pt, color: string, amount: number): void {
  if (amount <= 0.01) return
  ctx.save()
  ctx.lineCap = 'round'
  const path = () => {
    ctx.beginPath()
    ctx.moveTo(a[0] * k, a[1] * k)
    ctx.lineTo(b[0] * k, b[1] * k)
  }
  ctx.strokeStyle = rgba(color, 0.08 * amount)
  ctx.lineWidth = Math.max(3, 0.12 * k)
  path()
  ctx.stroke()
  ctx.strokeStyle = rgba(color, 0.2 * amount)
  ctx.lineWidth = Math.max(1.6, 0.04 * k)
  path()
  ctx.stroke()
  ctx.strokeStyle = rgba(mixHex(color, LIT, 0.4), Math.min(1, 0.95 * amount))
  ctx.lineWidth = Math.max(0.9, 0.012 * k)
  path()
  ctx.stroke()
  ctx.restore()
}

/** Where a beam from `a` to `b` first meets one of `balls` (a disc of the ball's radius), or `b`. */
function cut(a: Pt, b: Pt, balls: Pt[]): { end: Pt; broken: boolean } {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  let best = 1
  for (const c of balls) {
    const fx = a[0] - c[0]
    const fy = a[1] - c[1]
    const A = dx * dx + dy * dy
    const B = 2 * (fx * dx + fy * dy)
    const C = fx * fx + fy * fy - R * R
    const D = B * B - 4 * A * C
    if (D < 0) continue
    const s = (-B - Math.sqrt(D)) / (2 * A)
    if (s > 0 && s < best) best = s
  }
  return { end: [a[0] + dx * best, a[1] + dy * best], broken: best < 1 }
}

/* ------------------------------------------------------------------ the room (the set) */

/** The back of the room: its wall, the ceiling with its duct and pipe, the far smoke, the crowd behind the floor. */
export function drawRoom(p: p5, k: number, t: number, weight: number, derek: Pt | null): void {
  const f = frame(p, k)
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  p.push()
  p.noStroke()
  p.rectMode(p.CORNER)
  // The back wall, raw concrete in the dark, the runway's light come up on it.
  p.fill(CLUB.dark)
  p.rect(X(x0), X(CEIL), X(x1 - x0), X(FLOOR - CEIL + 0.5))
  const g = ctx.createLinearGradient(0, X(FLOOR), 0, X(CEIL))
  g.addColorStop(0, rgba(CLUB.concreteLit, 0.5))
  g.addColorStop(0.3, rgba(CLUB.concrete, 0.45))
  g.addColorStop(1, rgba(CLUB.concrete, 0.12))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(X(x0), X(CEIL), X(x1 - x0), X(FLOOR - CEIL))
  ctx.restore()
  // Its pours: a faint joint every so often, darker than the wall.
  p.fill(rgba(DARK, 0.3))
  for (let x = Math.floor(x0 / 3.6) * 3.6 + 1.1; x < x1; x += 3.6) p.rect(X(x), X(CEIL), Math.max(1, X(0.025)), X(FLOOR - CEIL))
  p.pop()

  // The far smoke: slow banks drifting through the dark over the crowd, thicker up under the ceiling.
  for (let i = 0; i < 18; i++) {
    const w = 2.0 + 1.8 * hash(i, 3)
    const x = -9 + i * 1.7 + ((t * (0.05 + 0.07 * hash(i, 4)) + 6 * hash(i, 5)) % 3.4) - 1.7
    if (x + w < x0 || x - w > x1) continue
    const y = CEIL + 0.7 + 2.3 * hash(i, 6) + 0.2 * Math.sin(t * 0.3 + i)
    lobe(ctx, k, x, y, w, 0.55 + 0.45 * hash(i, 7), SMOKE, 0.07 + 0.06 * hash(i, 8))
  }
  // The runway's own light, rising into the smoke over it and falling off past its ends.
  lobe(ctx, k, MID, FLOOR, (RUN_X1 - RUN_X0) / 2 + 1.6, 2.1, SPOT, 0.13)
  lobe(ctx, k, MID, FLOOR, (RUN_X1 - RUN_X0) / 2 + 0.6, 0.7, SPOT, 0.12)

  backCrowd(p, k, t, weight, f, derek)
  ceiling(p, k, weight, x0, x1, f)
}

/** The ceiling: its slab and downstand beams, the duct along it and a pipe on hangers, lit only from below. */
function ceiling(p: p5, k: number, weight: number, x0: number, x1: number, f: F): void {
  if (f.y0 > CEIL + 0.6) return
  const X = (v: number) => v * k
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  const top = Math.min(f.y0 - 1, CEIL - 2)
  p.fill(CLUB.concrete)
  p.rect(X(x0), X(top), X(x1 - x0), X(CEIL - top))
  for (const bx of [-7.2, -3.9, 0.3, 9.3, 13.1, 17.0]) {
    if (bx < x0 - 1 || bx > x1 + 1) continue
    p.fill(CLUB.concrete)
    p.rect(X(bx - 0.22), X(CEIL - 0.05), X(0.44), X(0.36))
    p.fill(rgba(CLUB.concreteLit, 0.8))
    p.rect(X(bx - 0.22), X(CEIL + 0.29), X(0.44), Math.max(1, X(0.02)))
  }
  // The duct: a dark run, its seams, the runway's light along its underside.
  p.fill(STEEL)
  p.rect(X(x0), X(CEIL), X(x1 - x0), X(0.2))
  p.fill(rgba(DARK, 0.6))
  for (let x = Math.floor(x0 / 1.2) * 1.2; x < x1; x += 1.2) p.rect(X(x), X(CEIL), Math.max(1, X(0.02)), X(0.2))
  p.fill(RIM)
  p.rect(X(x0), X(CEIL + 0.185), X(x1 - x0), Math.max(1, X(0.015)))
  // The pipe on its hangers.
  p.fill(rgba(STEEL, 0.9))
  for (let x = Math.floor(x0 / 1.7) * 1.7 + 0.5; x < x1; x += 1.7) p.rect(X(x), X(CEIL + 0.2), Math.max(1, X(0.02)), X(0.1))
  p.fill(STEEL)
  p.rect(X(x0), X(CEIL + 0.3), X(x1 - x0), X(0.1))
  p.fill(RIM)
  p.rect(X(x0), X(CEIL + 0.385), X(x1 - x0), Math.max(1, X(0.013)))
  p.pop()
  void weight
}

/* ------------------------------------------------------------------ the crowd */

interface Figure {
  x: number
  s: number
  head: number
  arm: number
  side: number
  phase: number
  /** The head's shape: bare, a quiff, a bob, a cap, a hood, long hair. */
  hair: number
  /** Holds a camera up when the arms go up. */
  cam: boolean
  /** Turned side-on: narrower shoulders. */
  turn: number
}
const make = (i: number, x: number, s: number, head: number, seed: number): Figure => ({
  x,
  s,
  head,
  arm: hash(i, seed + 4),
  side: hash(i, seed + 5) < 0.5 ? -1 : 1,
  phase: hash(i, seed + 6),
  hair: Math.floor(hash(i, seed + 7) * 6),
  cam: hash(i, seed + 9) < 0.22,
  turn: hash(i, seed + 8) < 0.35 ? 0.72 : 1,
})
/** Behind the floor, two ranks deep, shoulder to shoulder. */
const BACK: Figure[] = []
for (let i = 0; i < 78; i++) {
  const far = i % 2 === 0
  const x = -13 + i * 0.41 + (hash(i, 11) - 0.5) * 0.2
  BACK.push(make(i, x, far ? 0.82 + 0.1 * hash(i, 12) : 0.95 + 0.12 * hash(i, 12), far ? -1.42 - 0.12 * hash(i, 13) : -1.22 - 0.16 * hash(i, 13), 10))
}
/** In front of it, between us and the floor: bigger, nearer, only heads and shoulders in the frame. */
const FRONT: Figure[] = []
for (let i = 0; i < 44; i++) {
  const x = -13 + i * 0.68 + (hash(i, 21) - 0.5) * 0.3
  FRONT.push(make(i, x, 1.3 + 0.2 * hash(i, 22), 1.26 + 0.16 * hash(i, 23), 20))
}

/** How far up the crowd's arms are: the music's loudness, their cheers; down in the hush while Hansel is in the grid. */
function arms(t: number): number {
  return clamp01(0.1 + 0.5 * (level(t) - 0.8) + 0.6 * cheer(t)) * (1 - 0.9 * hush(t))
}

/** The crowd making room as he comes in: those near him lean away from him (heads first), and settle after. */
function wake(x: number, t: number, derek: Pt | null): number {
  if (!derek || t > IN + 4.5) return 0
  const d = x - derek[0]
  const on = 1 - sm(t, IN + 2.4, IN + 4.5)
  return Math.sign(d) * 0.16 * Math.exp(-(d * d) / 1.3) * on
}

function figures(p: p5, k: number, list: Figure[], t: number, f: F, lift: number, derek: Pt | null, front: boolean, dy: number): void {
  const X = (v: number) => v * k
  const Y = (v: number) => (v + dy) * k
  const up = arms(t)
  const b = (t - PHASE) / PERIOD
  const lv = level(t)
  for (const fg of list) {
    if (fg.x < f.x0 - 1.2 || fg.x > f.x1 + 1.2) continue
    const s = fg.s
    // A pump on each beat, a sway over the bar; the lean out of his way; the lift of a cheer.
    const ph = (((b + fg.phase * 0.3) % 1) + 1) % 1
    const pump = 0.03 * lv * Math.exp(-ph / 0.3)
    const sway = 0.04 * Math.sin((t / (4 * PERIOD)) * 2 * Math.PI + fg.phase * 6.28) * lv
    const lean = wake(fg.x, t, derek)
    const back = Math.abs(lean) * (front ? -0.35 : 0.35)
    const hy = fg.head - pump - lift * (0.6 + 0.4 * fg.phase) - back
    const hx = fg.x + sway + lean
    const sy = hy + 0.36 * s
    const sw = 0.4 * s * fg.turn
    const bx = fg.x + sway * 0.4
    // Shoulders and the body under them, one mass.
    p.ellipse(X(bx), Y(sy + 0.08 * s), X(2 * sw), X(0.36 * s))
    p.rect(X(bx - 1.25 * sw), Y(sy + 0.12 * s), X(2.5 * sw), X(front ? 3 : FLOOR + 0.2 - sy))
    p.quad(X(hx - 0.07 * s), Y(hy + 0.1 * s), X(hx + 0.07 * s), Y(hy + 0.1 * s), X(hx + 0.1 * s), Y(sy + 0.05 * s), X(hx - 0.1 * s), Y(sy + 0.05 * s))
    // The head, and its shape: bare, a quiff, a bob, a cap, a hood, long hair. No hats.
    const hs = fg.side
    if (fg.hair === 4) {
      // A hood: one soft peak over the head, down into the shoulders.
      p.ellipse(X(hx - 0.02 * hs * s), Y(hy - 0.02 * s), X(0.37 * s), X(0.46 * s))
      p.quad(X(hx - 0.18 * s), Y(hy), X(hx + 0.18 * s), Y(hy), X(hx + 0.26 * s), Y(sy + 0.08 * s), X(hx - 0.26 * s), Y(sy + 0.08 * s))
    } else {
      p.ellipse(X(hx), Y(hy), X(0.29 * s), X(0.36 * s))
      if (fg.hair === 1) p.ellipse(X(hx + 0.08 * s * hs), Y(hy - 0.16 * s), X(0.25 * s), X(0.12 * s))
      else if (fg.hair === 2) {
        // A bob: full at the jaw, flat across the fringe.
        p.ellipse(X(hx), Y(hy + 0.01 * s), X(0.38 * s), X(0.36 * s))
        p.rect(X(hx - 0.19 * s), Y(hy - 0.02 * s), X(0.38 * s), X(0.14 * s))
      } else if (fg.hair === 3) {
        // A cap: its crown, its peak out to one side.
        p.ellipse(X(hx), Y(hy - 0.1 * s), X(0.31 * s), X(0.18 * s))
        p.rect(X(hs > 0 ? hx : hx - 0.26 * s), Y(hy - 0.08 * s), X(0.26 * s), X(0.04 * s))
      } else if (fg.hair === 5) {
        // Long hair, down the back to the shoulders.
        p.rect(X(hx - 0.15 * s - 0.04 * hs * s), Y(hy - 0.04 * s), X(0.3 * s), X(0.4 * s), X(0.08 * s))
      }
    }
    // An arm up (or two) when the crowd goes up: a thin limb from the shoulder, a hand; or a camera held up over the
    // head in both hands.
    const u = clamp01((up - fg.arm * 0.9) / 0.22)
    if (u < 0.02) continue
    if (fg.cam) {
      const cx = hx + 0.05 * fg.side * s
      const cy = hy - (0.2 + 0.28 * u) * s
      for (const side of [-1, 1]) {
        const sx = bx + side * (sw - 0.07 * s)
        const syy = sy + 0.02 * s
        const hxx = cx + side * 0.1 * s
        p.quad(X(sx - 0.05 * s), Y(syy), X(sx + 0.05 * s), Y(syy), X(hxx + 0.03 * s), Y(cy + 0.04 * s), X(hxx - 0.03 * s), Y(cy + 0.04 * s))
      }
      p.rect(X(cx - 0.12 * s), Y(cy - 0.08 * s), X(0.24 * s), X(0.14 * s), X(0.025 * s))
      continue
    }
    for (const side of fg.arm < 0.2 ? [-1, 1] : [fg.side]) {
      const sx = bx + side * (sw - 0.06 * s)
      const syy = sy + 0.02 * s
      const reach = (0.45 + 0.35 * u) * s
      const hxx = sx + side * (0.06 + 0.12 * (1 - u)) * s + 0.025 * Math.sin(t * 2.2 + fg.phase * 9)
      const hyy = syy - reach
      p.quad(X(sx - 0.05 * s), Y(syy), X(sx + 0.05 * s), Y(syy), X(hxx + 0.028 * s), Y(hyy), X(hxx - 0.028 * s), Y(hyy))
      p.ellipse(X(hxx), Y(hyy - 0.03 * s), X(0.075 * s), X(0.09 * s))
    }
  }
}

/**
 * One silhouette: the whole crowd filled as one dark mass, and under it the same shapes lifted a hair in the colour of
 * the light behind them, so only their top edges catch it: rimmed where the light falls, never a row of outlined heads.
 */
function crowd(p: p5, k: number, list: Figure[], t: number, f: F, lift: number, derek: Pt | null, front: boolean, rim: string): void {
  const w = Math.max(1.2 / k, 0.026)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(rgba(rim, 0.45))
  figures(p, k, list, t, f, lift, derek, front, -2 * w)
  p.fill(rim)
  figures(p, k, list, t, f, lift, derek, front, -w)
  p.fill(DARK)
  figures(p, k, list, t, f, lift, derek, front, 0)
  p.pop()
}

/** How high the crowd is lifted: a cheer lifts it, and a big one sets it bouncing on the beats. */
function heave(t: number): number {
  const c = cheer(t)
  const ph = ((((t - PHASE) / PERIOD) % 1) + 1) % 1
  return 0.08 * c + 0.16 * Math.max(0, c - 0.55) * Math.sin(Math.PI * ph)
}

function backCrowd(p: p5, k: number, t: number, weight: number, f: F, derek: Pt | null): void {
  crowd(p, k, BACK, t, f, heave(t), derek, false, mixHex(CLUB.crowdRim, CLUB.smoke, 0.35))
  void weight
}

/** The crowd between us and the floor: heads and shoulders along the frame's foot. */
function frontCrowd(p: p5, k: number, t: number, weight: number, f: F, derek: Pt | null): void {
  if (f.y1 < 1.2) return
  crowd(p, k, FRONT, t, f, 0.8 * heave(t), derek, true, mixHex(CLUB.floorLit, CLUB.smoke, 0.5))
  void weight
}

/* ------------------------------------------------------------------ the lights */

/** The ceiling's roaming lasers: each rig's colour and the sweep of where it lands on the floor. */
interface Rig {
  at: Pt
  color: string
  base: number
  amp: number
  per: number
  phase: number
  /** Where it comes to rest once the two of them have touched: clear of them. */
  rest: number
}
const ROAM: Rig[] = [
  { at: RIGS[0], color: CLUB.laserRed, base: 1.0, amp: 2.4, per: 16, phase: 0.1, rest: -1.3 },
  { at: RIGS[1], color: CLUB.laserGreen, base: -0.6, amp: 2.0, per: 12, phase: 0.55, rest: 5.3 },
  { at: RIGS[2], color: CLUB.laserRed, base: 10.4, amp: 2.0, per: 14, phase: 0.3, rest: 6.6 },
  { at: RIGS[3], color: CLUB.laserGreen, base: 8.6, amp: 2.6, per: 18, phase: 0.8, rest: 9.4 },
]

/** How much the roaming lasers are on: all the verse, off while the grid is lit, back softly after. */
function roamOn(t: number): number {
  if (t < GRID_ON) return 1
  if (t < GRID_OFF + 0.4) return 0
  return 0.6 * sm(t, GRID_OFF + 0.4, GRID_OFF + 2)
}

function roamTarget(r: Rig, t: number): number {
  const b = (t - PHASE) / PERIOD
  const x = r.base + r.amp * Math.sin((b / r.per + r.phase) * 2 * Math.PI)
  // On the last line's answer they all swing down to the middle of the floor, between the two of them; once the grid
  // has gone off they drift back to their sweeps.
  const swept = x + (MID - x) * sm(t, CONVERGE, CONVERGE + 0.85) * (1 - sm(t, GRID_OFF + 0.4, GRID_OFF + 4))
  // Once they have touched, the lasers slow and settle away from them.
  return swept + (r.rest - swept) * sm(t, TOUCH, TOUCH + 2.4)
}

function drawRigs(p: p5, k: number, t: number, weight: number, balls: Pt[]): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const on = roamOn(t)
  const b = (t - PHASE) / PERIOD
  const pulse = 0.82 + 0.18 * Math.exp(-((((b % 1) + 1) % 1) / 0.2)) + FLARES.reduce((a, h) => a + (t >= h ? 0.9 * Math.exp(-(t - h) / 0.14) : 0), 0)
  for (const r of ROAM) {
    const tx = roamTarget(r, t)
    const aim = Math.atan2(FLOOR - r.at[1], tx - r.at[0])
    const from: Pt = [r.at[0] + Math.cos(aim) * 0.1, r.at[1] + Math.sin(aim) * 0.1]
    if (on > 0.01) {
      const c = cut(from, [tx, FLOOR], balls)
      laser(ctx, k, from, c.end, r.color, 0.85 * on * pulse)
      if (!c.broken) bloom(p, k, [tx, FLOOR], 0.14, r.color, 0.4 * on)
    }
    // The rig: a small dark box on a hanger from the duct, turned to where it points, its lens alight.
    p.push()
    p.stroke(RIM)
    p.strokeWeight(weight * 0.5)
    p.line(X(r.at[0]), X(CEIL + 0.2), X(r.at[0]), X(r.at[1] - 0.08))
    p.translate(X(r.at[0]), X(r.at[1]))
    p.rotate(aim - Math.PI / 2)
    p.fill(DARK)
    p.rect(0, X(-0.02), X(0.22), X(0.18), X(0.02))
    p.noStroke()
    p.fill(on > 0.05 ? mixHex(DARK, r.color, 0.85 * on) : STEEL)
    p.rect(0, X(0.08), X(0.08), X(0.03))
    p.pop()
  }
}

/** The judge's lamp: its hard white light on whoever is on, and the lamp itself, on its yoke from the ceiling. */
/** Where the lamp's light ends: on through whoever it is aimed at, to the floor behind them (never much past them). */
function lampEnd(lens: Pt, at: Pt): { end: Pt; onFloor: number } {
  const dx = at[0] - lens[0]
  const dy = at[1] - lens[1]
  const L = Math.hypot(dx, dy)
  const toFloor = dy > 0.05 ? (FLOOR - 0.05 - lens[1]) / dy : Infinity
  const most = (L + 0.9) / L
  const f = Math.min(toFloor, most)
  return { end: [lens[0] + dx * f, lens[1] + dy * f], onFloor: clamp01(1 - (toFloor - f) / 0.4) }
}

function drawLamp(p: p5, k: number, t: number, weight: number, derek: Pt): void {
  const X = (v: number) => v * k
  const { x, y, wide } = lampAt(t, derek)
  const aim = Math.atan2(y - LAMP[1], x - LAMP[0])
  const lens: Pt = [LAMP[0] + Math.cos(aim) * 0.34, LAMP[1] + Math.sin(aim) * 0.34]
  const { end } = lampEnd(lens, [x, y])
  // Brighter as it settles on the winner.
  const hard = 1 + (t > WIN - 0.1 && t < TOUCH + 2 ? 0.3 * sm(t, WIN - 0.1, WIN + 0.2) : 0)
  beam(p, k, lens, end, 0.2, 0.5 + wide, CLUB.spot, 0.42 * hard)
  beam(p, k, lens, end, 0.12, 0.25 + wide * 0.5, CLUB.spot, 0.3 * hard)
  p.push()
  p.stroke(RIM)
  p.strokeWeight(weight * 0.6)
  p.fill(STEEL)
  p.rect(X(LAMP[0]), X((CEIL + 0.2 + LAMP[1] - 0.24) / 2), X(0.05), X(LAMP[1] - 0.24 - CEIL - 0.2))
  p.translate(X(LAMP[0]), X(LAMP[1]))
  p.noFill()
  p.strokeWeight(weight * 0.9)
  p.stroke(STEEL)
  p.arc(0, 0, X(0.5), X(0.5), Math.PI + 0.45, 2 * Math.PI - 0.45)
  p.rotate(aim)
  p.stroke(RIM)
  p.strokeWeight(weight * 0.6)
  p.fill(DARK)
  p.rect(X(0.02), 0, X(0.62), X(0.3), X(0.04))
  p.rect(X(-0.31), 0, X(0.07), X(0.22), X(0.02))
  p.stroke(STEEL)
  p.strokeWeight(weight * 0.8)
  p.line(X(0.33), X(-0.15), X(0.44), X(-0.22))
  p.line(X(0.33), X(0.15), X(0.44), X(0.22))
  p.noStroke()
  p.fill(LIT)
  p.rect(X(0.33), 0, X(0.035), X(0.25))
  p.pop()
  bloom(p, k, lens, 0.3, CLUB.spot, 0.55 * hard)
}

/** The grid's bar: stowed under the ceiling on its cables, dropped on the downbeat, wound back up after. */
function drawGridBar(p: p5, k: number, t: number, weight: number): void {
  const X = (v: number) => v * k
  const y = barY(t)
  const on = gridOn(t)
  p.push()
  p.stroke(STEEL)
  p.strokeWeight(weight * 0.6)
  for (const x of [MID - GRID_HALF + 0.05, MID + GRID_HALF - 0.05]) p.line(X(x), X(CEIL + 0.2), X(x), X(y - 0.06))
  p.stroke(RIM)
  p.strokeWeight(weight * 0.6)
  p.fill(DARK)
  p.rect(X(MID), X(y), X(2 * GRID_HALF + 0.16), X(0.13), X(0.02))
  p.noStroke()
  for (let i = 0; i <= 10; i++) {
    const x = MID - GRID_HALF + (2 * GRID_HALF * i) / 10
    p.fill(on > 0.05 ? mixHex(STEEL, i % 2 ? CLUB.laserRed : CLUB.laserGreen, on) : STEEL)
    p.rect(X(x), X(y + 0.075), X(0.05), X(0.03))
  }
  p.pop()
}

/** The laser gates: posts up out of their slots, and their beams across when they are on. */
function drawGates(p: p5, k: number, t: number, weight: number, balls: Pt[]): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const g of GATES) {
    const up = sm(t, g.up, g.up + 0.42) * (1 - sm(t, g.down, g.down + 0.45))
    if (up <= 0.002) continue
    const h = g.tall * up
    p.push()
    p.stroke(RIM)
    p.strokeWeight(weight * 0.6)
    for (const x of g.x) {
      p.fill(STEEL)
      p.rect(X(x), X(FLOOR - h / 2), X(0.06), X(h))
      p.fill(DARK)
      p.rect(X(x), X(FLOOR - h - 0.02), X(0.1), X(0.07), X(0.015))
    }
    p.pop()
    const on = t >= g.on && t < g.down ? 1 : 0
    const flare = 1 + 0.6 * Math.exp(-(t - g.on) / 0.12)
    g.beams.forEach((hb, j) => {
      if (hb > h - 0.05) return
      const y = FLOOR - hb
      const color = j === 0 ? CLUB.laserRed : CLUB.laserGreen
      p.push()
      p.noStroke()
      p.fill(on ? color : DARK)
      for (const x of g.x) p.rect(X(x), X(y), X(0.09), X(0.045))
      p.pop()
      if (!on) return
      const a: Pt = [g.x[0] + 0.045, y]
      const c = cut(a, [g.x[1] - 0.045, y], balls)
      laser(ctx, k, a, c.end, color, 0.95 * flare)
    })
  }
}

/* ------------------------------------------------------------------ the floor */

function drawFloor(p: p5, k: number, t: number, weight: number, f: F, derek: Pt, hansel: Pt): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const foot = Math.max(f.y1 + 1, FLOOR + 3)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  // The floor between us and the runway: black and glossy, the runway's light lying along it.
  p.fill(mixHex(CLUB.floor, DARK, 0.45))
  p.rect(X(x0), X(FLOOR), X(x1 - x0), X(foot - FLOOR))
  p.pop()
  // Only below the floor's edge: nothing of the floor is ever over them.
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(x0), X(FLOOR), X(x1 - x0), X(foot - FLOOR))
  ctx.clip()
  lobe(ctx, k, MID, FLOOR, (RUN_X1 - RUN_X0) / 2 + 0.9, 0.6, rgbOf(CLUB.floorLit), 0.9)
  lobe(ctx, k, MID, FLOOR, (RUN_X1 - RUN_X0) / 2 + 0.2, 0.18, SPOT, 0.14)
  ctx.restore()
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  // Off the runway, plain concrete.
  p.fill(CLUB.concrete)
  if (x0 < RUN_X0) p.rect(X(x0), X(FLOOR), X(RUN_X0 - x0), X(0.07))
  if (x1 > RUN_X1) p.rect(X(RUN_X1), X(FLOOR), X(x1 - RUN_X1), X(0.07))
  // The runway: panels of light flush in the floor, a seam between each.
  p.fill(mixHex(CLUB.floorLit, LIT, 0.62))
  p.rect(X(RUN_X0), X(FLOOR), X(RUN_X1 - RUN_X0), X(0.07))
  p.fill(LIT)
  p.rect(X(RUN_X0), X(FLOOR), X(RUN_X1 - RUN_X0), Math.max(1, X(0.014)))
  p.fill(CLUB.floorLit)
  const panel = 0.47
  for (let x = MID - 10 * panel; x <= RUN_X1 + 0.01; x += panel) if (x > RUN_X0 + 0.05 && x < RUN_X1 - 0.05) p.rect(X(x - 0.012), X(FLOOR), Math.max(1, X(0.024)), X(0.07))
  p.pop()

  // The kick plates: set in the runway on their rams, alight when they fire.
  for (const pl of PLATES) {
    const y = plateAt(pl, t)
    const w = 0.38
    let fired = 0
    for (const fi of pl.fires) if (t >= fi.at) fired = Math.max(fired, Math.exp(-(t - fi.at) / 0.25))
    p.push()
    p.rectMode(p.CORNER)
    p.noStroke()
    // The socket, dark, while the plate is up out of it; the ram under it.
    if (y < -0.004) {
      p.fill(DARK)
      p.rect(X(pl.x - w / 2), X(FLOOR), X(w), X(0.07))
      p.fill(STEEL)
      p.rect(X(pl.x - 0.035), X(FLOOR + y + 0.05), X(0.07), X(-y + 0.02))
    }
    p.fill(DARK)
    p.rect(X(pl.x - w / 2 - 0.02), X(FLOOR + Math.max(0, y)), X(w + 0.04), X(0.07))
    p.fill(mixHex(STEEL, LIT, 0.35 + 0.65 * fired))
    p.rect(X(pl.x - w / 2), X(FLOOR + y), X(w), X(0.06))
    p.fill(LIT)
    p.rect(X(pl.x - w / 2 + 0.02), X(FLOOR + y), X(w - 0.04), Math.max(1, X(0.016)))
    p.pop()
    if (fired > 0.02) pool(p, k, [pl.x, FLOOR + y], 0.45, 0.07, CLUB.spot, 0.6 * fired)
  }

  // The grid's lenses: a row of points in the floor where its beams come down, alight while the beam is whole.
  const on = gridOn(t)
  if (on > 0.01) {
    const lit = new Map<number, boolean>()
    for (const b of gridBeams(t)) {
      const c = cut(b.a, b.b, [derek])
      const key = Math.round(b.b[0] * 100)
      lit.set(key, (lit.get(key) ?? true) && !c.broken)
    }
    for (const [key, ok] of lit) {
      const x = key / 100
      p.push()
      p.noStroke()
      p.fill(ok ? mixHex(CLUB.laserRed, LIT, 0.35) : DARK)
      p.rect(X(x), X(FLOOR + 0.025), X(0.07), X(0.03))
      p.pop()
      if (ok) bloom(p, k, [x, FLOOR], 0.12, CLUB.laserRed, 0.4 * on)
    }
  }

  // The runway answering them: brighter where they are on it.
  for (const b of [derek, hansel]) {
    if (b[1] < -0.5 || b[0] < RUN_X0 || b[0] > RUN_X1) continue
    const near = 1 - clamp01(-b[1] / 0.5)
    pool(p, k, [b[0], FLOOR + 0.02], 0.4, 0.06, CLUB.spot, 0.5 * near)
  }
  void weight
}

/* ------------------------------------------------------------------ smoke from the floor */

function drawPuffs(p: p5, k: number, t: number, f: F): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const pl of PLATES) {
    for (const fi of pl.fires) {
      const s = t - fi.at
      if (s < 0 || s > 2.2) continue
      const big = fi.kick > 0.13 ? 1.3 : 1
      for (const side of [-1, 1]) {
        const r = (0.16 + 0.5 * Math.sqrt(s)) * big
        const x = pl.x + side * (0.22 + 0.4 * Math.sqrt(s)) * big
        const y = FLOOR - 0.05 - 0.3 * Math.pow(s, 0.6) * big
        lobe(ctx, k, x, y, r, r * 0.55, SMOKE, 0.26 * Math.exp(-s / 0.6))
      }
    }
  }
  // The grid's landing: its breath along the floor.
  const s = t - GRID_ON
  if (s > 0 && s < 2.5) {
    for (const side of [-1, 1]) lobe(ctx, k, MID + side * (0.8 + 0.9 * Math.sqrt(s)), FLOOR - 0.15, 0.5 + 0.9 * Math.sqrt(s), 0.28, SMOKE, 0.22 * Math.exp(-s / 0.8))
  }
  // The haze that lies along the floor, rolling.
  for (let i = 0; i < 14; i++) {
    const x = -8 + i * 2.0 + ((t * 0.12 + 5 * hash(i, 41)) % 2.4)
    if (x < f.x0 - 2 || x > f.x1 + 2) continue
    lobe(ctx, k, x, FLOOR - 0.28 - 0.3 * hash(i, 42), 1.4 + 0.6 * hash(i, 43), 0.4, SMOKE, 0.06)
  }
}

/* ------------------------------------------------------------------ the spark */

/** Where the grid's first beam cuts on Derek's nose as it lands: the top of him, at the grid's edge. */
const NOSE: Pt = [MID - GRID_HALF, -Math.sqrt(Math.max(0, R * R - (MID - GRID_HALF - D_LUNGE) ** 2))]

/** The beam burning on his nose: a spray of hot sparks off the cut, falling and going out; a red flash at it. */
function spark(p: p5, k: number, t: number): void {
  const s = t - GRID_ON
  if (s < 0 || s > 0.7) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  bloom(p, k, NOSE, 0.22, CLUB.laserRed, 0.5 * Math.exp(-s / 0.08))
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < 16; i++) {
    const life = 0.3 + 0.35 * hash(i, 61)
    if (s > life) continue
    const a = -Math.PI / 2 + (hash(i, 62) - 0.5) * 2.8
    const v = 2.0 + 2.4 * hash(i, 63)
    const vx = Math.cos(a) * v
    const vy = Math.sin(a) * v
    const g = 7
    const x = NOSE[0] + vx * s
    const y = NOSE[1] + vy * s + 0.5 * g * s * s
    const dx = vx
    const dy = vy + g * s
    const d = Math.hypot(dx, dy) || 1
    const len = 0.07 + 0.08 * (v / 4.4)
    const fade = 1 - s / life
    ctx.strokeStyle = rgba(mixHex(CLUB.laserRed, LIT, 0.35 + 0.5 * fade), fade)
    ctx.lineWidth = Math.max(1.2, 0.02 * k)
    ctx.beginPath()
    ctx.moveTo(x * k, y * k)
    ctx.lineTo((x - (dx / d) * len) * k, (y - (dy / d) * len) * k)
    ctx.stroke()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the looks */

/** Every look in the walk-off: who gives it, when, how big. */
const LOOKS: { who: 'derek' | 'hansel'; at: number; size: number }[] = [
  { who: 'derek', at: D_POP_TOP, size: 0.3 },
  { who: 'hansel', at: H_POP_TOP, size: 0.36 },
  { who: 'hansel', at: H_JUMP_TOP, size: 0.36 },
  { who: 'derek', at: D_WALK_STOP, size: 0.32 },
  { who: 'hansel', at: H_WALK_STOP, size: 0.34 },
  { who: 'derek', at: D_LINE_LAND[2], size: 0.4 },
  { who: 'hansel', at: ECHOES[2], size: 0.4 },
  { who: 'hansel', at: H_CENTRE, size: 0.45 },
]
export const LOOK_TIMES = LOOKS.map((l) => l.at)

/* ------------------------------------------------------------------ all of it */

/** The walk-off's machines and lights behind the balls. */
export function drawBack(p: p5, k: number, t: number, weight: number, derek: Pt): void {
  if (t < IN - 1 || t > OUT + 1.5) return
  const hansel = hanselAt(t)
  const balls = [derek, hansel]
  drawRigs(p, k, t, weight, balls)
  drawGridBar(p, k, t, weight)
  drawLamp(p, k, t, weight, derek)
  drawGates(p, k, t, weight, balls)
  drawPuffs(p, k, t, frame(p, k))
}

/** In front of the balls: the floor (it hides what goes into it), the grid's beams, the looks, the smoke, the crowd. */
export function drawFront(p: p5, k: number, t: number, weight: number, derek: Pt): void {
  if (t < IN - 1 || t > OUT + 1.5) return
  const f = frame(p, k)
  const hansel = hanselAt(t)
  drawFloor(p, k, t, weight, f, derek, hansel)
  // The lamp's pool, where its light meets the floor.
  const lamp = lampAt(t, derek)
  const la = Math.atan2(lamp.y - LAMP[1], lamp.x - LAMP[0])
  const lens: Pt = [LAMP[0] + Math.cos(la) * 0.34, LAMP[1] + Math.sin(la) * 0.34]
  const le = lampEnd(lens, [lamp.x, lamp.y])
  if (le.onFloor > 0.01) pool(p, k, [le.end[0], FLOOR + 0.01], 0.3 + lamp.wide, 0.09, CLUB.spot, 0.75 * le.onFloor)
  // The grid: every beam from the bar to the floor, broken where Derek's nose is in it; through Hansel, whole.
  const on = gridOn(t)
  if (on > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // It lands on his nose: the whole grid flares, and flares again as it throws him off.
    const s0 = t - GRID_ON
    const alarm = s0 >= 0 ? 1.6 * Math.exp(-s0 / 0.28) + (s0 > 0.06 ? 0.6 * Math.exp(-(s0 - 0.06) / 0.12) : 0) : 0
    const flare = 1 + alarm + H_HUM.reduce((a, h) => a + (t >= h ? 0.35 * Math.exp(-(t - h) / 0.15) : 0), 0)
    for (const b of gridBeams(t)) {
      const c = cut(b.a, b.b, [derek])
      laser(ctx, k, b.a, c.end, b.red ? CLUB.laserRed : CLUB.laserGreen, 0.8 * on * flare * (c.broken ? 1.5 : 1))
    }
    spark(p, k, t)
  }
  for (const l of LOOKS) {
    const u = t - l.at
    if (u < 0 || u > 0.6) continue
    const at = l.who === 'derek' ? derek : hansel
    glint(p, k, [at[0] + 0.09, at[1] - 0.09], u, l.size)
  }
  frontCrowd(p, k, t, weight, f, derek)
  // The press in the crowd: a camera held up over the heads, its flash gun.
  const X = (v: number) => v * k
  for (const pr of PRESS) {
    const u = t - pr.at
    if (u < -0.6 || u > 1.3) continue
    if (pr.x < f.x0 - 2 || pr.x > f.x1 + 2) continue
    const up = sm(t, pr.at - 0.6, pr.at - 0.25) * (1 - sm(t, pr.at + 0.7, pr.at + 1.2))
    const y = pr.y + 0.5 * (1 - up)
    p.push()
    p.rectMode(p.CENTER)
    p.stroke(mixHex(CLUB.crowdRim, CLUB.floorLit, 0.6))
    p.strokeWeight(weight)
    p.fill(DARK)
    p.quad(X(pr.x - 0.05), X(y + 0.16), X(pr.x + 0.01), X(y + 0.16), X(pr.x - 0.08), X(y + 0.9), X(pr.x - 0.15), X(y + 0.9))
    p.rect(X(pr.x), X(y + 0.1), X(0.25), X(0.16), X(0.03))
    p.rect(X(pr.x + 0.13 * Math.sign(MID - pr.x)), X(y + 0.1), X(0.1), X(0.11), X(0.015))
    p.rect(X(pr.x - 0.04), X(y - 0.03), X(0.08), X(0.1))
    p.rect(X(pr.x - 0.04), X(y - 0.1), X(0.13), X(0.07), X(0.01))
    p.pop()
    flashBurst(p, k, [pr.x + 0.02, y - 0.1], u, 1.5)
  }
}

export { hanselAt }
