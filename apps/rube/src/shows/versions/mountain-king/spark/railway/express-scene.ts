import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { RAILWAY } from '../worlds'
import { BUFFER_STOP, HALT, LEAD, POLES, RAIL_Y, SIGNAL_X, TRESTLE, TURN, T_STOP } from './express-line'
import { HORIZON, moonAt } from './night'

/**
 * The line the express runs on, in world cells: the halt it stands at, the telegraph poles, the embankment and the
 * track, the trestle over the river under the moon, the red signal before the terminus and the buffer stops at the end
 * of the line. EXPRESS's; drawn behind the train.
 */

export interface View {
  x0: number
  x1: number
  y0: number
  y1: number
  cx: number
  cy: number
}

const TIMBER = mixHex(RAILWAY.sleeper, RAILWAY.iron, 0.25)
const TIMBER_LIT = mixHex(RAILWAY.sleeper, RAILWAY.moon, 0.28)
const BALLAST = mixHex(RAILWAY.sleeper, RAILWAY.smoke, 0.35)
const GRASS = mixHex(RAILWAY.plain, RAILWAY.iron, 0.3)
const GRASS_LIT = mixHex(RAILWAY.plain, RAILWAY.moonHalo, 0.28)
const STONE = mixHex(RAILWAY.rail, RAILWAY.plain, 0.55)
const WIRE = mixHex(RAILWAY.rail, RAILWAY.sky, 0.45)

/** The valley's floor under the trestle: the embankment's foot outside it, the river's bed in its middle. */
export function floorY(x: number): number {
  const { x0, x1, depth } = TRESTLE
  const bowl = smooth(x, x0, x0 + 9) * (1 - smooth(x, x1 - 9, x1))
  return RAIL_Y + 0.55 + (depth - 0.55) * bowl
}
const RIVER = { x0: 90.5, x1: 99.5 }

/* ------------------------------------------------------------------ behind the train, far side */

/** The telegraph poles and their wires, behind the line. */
export function poles(p: p5, k: number, f: View, w: number): void {
  const X = (v: number) => v * k
  const top = RAIL_Y - 6.3
  const arms = [top + 0.25, top + 0.8]
  const seen = POLES.filter((x) => x > f.x0 - TURN * 1.2 && x < f.x1 + TURN * 1.2)
  if (!seen.length) return
  p.push()
  // The wires first, sagging from arm to arm, off the frame's edges to the next pole.
  p.noFill()
  p.stroke(WIRE)
  p.strokeWeight(Math.max(1, w * 0.35))
  for (let i = 0; i < POLES.length - 1; i++) {
    const a = POLES[i]
    const b = POLES[i + 1]
    if (b < f.x0 || a > f.x1 || b - a > TURN * 1.5) continue
    for (const y of arms) {
      for (const dx of [-0.42, 0.42]) {
        p.beginShape()
        for (let j = 0; j <= 10; j++) {
          const s = j / 10
          p.vertex(X(a + dx + (b - a) * s), X(y - 0.04 + 0.32 * 4 * s * (1 - s)))
        }
        p.endShape()
      }
    }
  }
  for (const x of seen) {
    p.noStroke()
    p.fill(TIMBER)
    p.quad(X(x - 0.09), X(RAIL_Y - 0.1), X(x - 0.065), X(top), X(x + 0.065), X(top), X(x + 0.09), X(RAIL_Y - 0.1))
    p.fill(TIMBER_LIT)
    p.quad(X(x + 0.02), X(RAIL_Y - 0.1), X(x + 0.03), X(top), X(x + 0.065), X(top), X(x + 0.09), X(RAIL_Y - 0.1))
    for (const [j, y] of arms.entries()) {
      const half = j === 0 ? 0.62 : 0.5
      p.fill(TIMBER)
      p.rect(X(x), X(y), X(half * 2), X(0.09))
      p.fill(alpha(p, RAILWAY.steam, 0.75))
      for (const dx of [-0.42, 0.42]) p.rect(X(x + dx), X(y - 0.07), X(0.06), X(0.09))
    }
  }
  p.pop()
}

/** A semaphore signal: a post, its arm (raised clear, or level at danger) and its lamp's coloured light. */
function signal(p: p5, k: number, x: number, w: number, clear: boolean): void {
  const X = (v: number) => v * k
  const top = RAIL_Y - 5.9
  p.push()
  p.noStroke()
  p.fill(TIMBER)
  p.rect(X(x), X((RAIL_Y + top) / 2), X(0.15), X(RAIL_Y - top))
  p.fill(TIMBER_LIT)
  p.rect(X(x + 0.045), X((RAIL_Y + top) / 2), X(0.05), X(RAIL_Y - top))
  p.fill(RAILWAY.iron)
  p.triangle(X(x - 0.1), X(top), X(x + 0.1), X(top), X(x), X(top - 0.22))
  // The ladder up its side.
  p.stroke(alpha(p, TIMBER_LIT, 0.7))
  p.strokeWeight(Math.max(1, w * 0.35))
  p.line(X(x - 0.22), X(RAIL_Y - 0.1), X(x - 0.22), X(top + 0.9))
  for (let y = RAIL_Y - 0.4; y > top + 1; y -= 0.4) p.line(X(x - 0.22), X(y), X(x - 0.08), X(y))
  // The arm: pivoted at the post, pointing toward the line; red with a white band.
  const pivot: Pt = [x + 0.08, top + 0.55]
  const a = clear ? -0.75 : 0
  p.push()
  p.translate(X(pivot[0]), X(pivot[1]))
  p.rotate(a)
  p.noStroke()
  p.fill(RAILWAY.signalRed)
  p.rect(X(0.62), 0, X(1.1), X(0.2))
  p.fill(RAILWAY.fwWhite)
  p.rect(X(0.95), 0, X(0.12), X(0.2))
  p.fill(RAILWAY.iron)
  p.rect(X(-0.12), X(0.1), X(0.3), X(0.36))
  p.pop()
  // The lamp behind the arm's spectacle: a small square lens, its light soft and wide.
  const lens: Pt = [x - 0.15, top + 0.9]
  const col = clear ? RAILWAY.signalGreen : RAILWAY.signalRed
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(X(lens[0]), X(lens[1]), 0, X(lens[0]), X(lens[1]), X(0.9))
  const c = p.color(col)
  g.addColorStop(0, `rgba(${p.red(c)}, ${p.green(c)}, ${p.blue(c)}, 0.35)`)
  g.addColorStop(1, `rgba(${p.red(c)}, ${p.green(c)}, ${p.blue(c)}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(X(lens[0] - 0.9), X(lens[1] - 0.9), X(1.8), X(1.8))
  p.noStroke()
  p.fill(RAILWAY.iron)
  p.rect(X(lens[0]), X(lens[1]), X(0.24), X(0.24))
  p.fill(col)
  p.rect(X(lens[0]), X(lens[1]), X(0.13), X(0.13))
  p.pop()
}

/** The halt: a wooden station hut with a lit window, the platform, a lantern on its post, the starting signal. */
export function halt(p: p5, k: number, f: View, w: number): void {
  if (f.x1 < HALT.x0 - 2 || f.x0 > HALT.x1 + 4) return
  const X = (v: number) => v * k
  p.push()
  p.noStroke()
  // The hut behind the platform: plank walls, a pitched roof, a window with the lamp lit inside, a door.
  const h0 = 1.4
  const h1 = 7.2
  const eave = RAIL_Y - 3.6
  p.fill(mixHex(TIMBER, RAILWAY.plain, 0.3))
  p.rect(X((h0 + h1) / 2), X((RAIL_Y - 1 + eave) / 2), X(h1 - h0), X(RAIL_Y - 1 - eave))
  p.stroke(alpha(p, RAILWAY.iron, 0.6))
  p.strokeWeight(Math.max(1, w * 0.3))
  for (let x = h0 + 0.3; x < h1; x += 0.3) p.line(X(x), X(eave + 0.05), X(x), X(RAIL_Y - 1.05))
  p.noStroke()
  p.fill(TIMBER)
  p.quad(X(h0 - 0.4), X(eave), X(h1 + 0.4), X(eave), X(h1 - 0.8), X(eave - 1.05), X(h0 + 0.8), X(eave - 1.05))
  p.stroke(TIMBER_LIT)
  p.strokeWeight(w * 0.6)
  p.line(X(h0 + 0.8), X(eave - 1.05), X(h1 - 0.8), X(eave - 1.05))
  p.line(X(h1 - 0.8), X(eave - 1.05), X(h1 + 0.4), X(eave))
  p.noStroke()
  const win: Pt = [5.3, RAIL_Y - 2.55]
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(X(win[0]), X(win[1]), 0, X(win[0]), X(win[1]), X(1.6))
  g.addColorStop(0, 'rgba(246, 201, 110, 0.28)')
  g.addColorStop(1, 'rgba(246, 201, 110, 0)')
  ctx.fillStyle = g
  ctx.fillRect(X(win[0] - 1.6), X(win[1] - 1.6), X(3.2), X(3.2))
  p.fill(RAILWAY.lamp)
  p.rect(X(win[0]), X(win[1]), X(0.9), X(0.75))
  p.fill(TIMBER)
  p.rect(X(win[0]), X(win[1]), X(0.06), X(0.75))
  p.rect(X(win[0]), X(win[1]), X(0.9), X(0.06))
  p.fill(mixHex(TIMBER, RAILWAY.iron, 0.5))
  p.rect(X(2.6), X(RAIL_Y - 1.95), X(0.7), X(1.9))
  // The platform: a stone face along the line with a lit coping.
  p.fill(STONE)
  p.rect(X((HALT.x0 + HALT.x1) / 2), X(RAIL_Y - 0.55), X(HALT.x1 - HALT.x0), X(0.9))
  p.fill(mixHex(STONE, RAILWAY.moon, 0.35))
  p.rect(X((HALT.x0 + HALT.x1) / 2), X(RAIL_Y - 1.0), X(HALT.x1 - HALT.x0 + 0.2), X(0.1))
  p.stroke(alpha(p, RAILWAY.iron, 0.5))
  p.strokeWeight(Math.max(1, w * 0.3))
  for (let x = HALT.x0 + 0.9; x < HALT.x1; x += 0.9) p.line(X(x), X(RAIL_Y - 0.95), X(x), X(RAIL_Y - 0.1))
  // The lantern on its post at the platform's edge, behind the engine: warm, square, its light wide and faint.
  const lx = -3.4
  const ly = RAIL_Y - 4.95
  p.noStroke()
  p.fill(RAILWAY.iron)
  p.rect(X(lx), X((RAIL_Y - 1 + ly) / 2), X(0.09), X(RAIL_Y - 1 - ly))
  const lg = ctx.createRadialGradient(X(lx), X(ly - 0.25), 0, X(lx), X(ly - 0.25), X(2.2))
  lg.addColorStop(0, 'rgba(246, 201, 110, 0.22)')
  lg.addColorStop(1, 'rgba(246, 201, 110, 0)')
  ctx.fillStyle = lg
  ctx.fillRect(X(lx - 2.2), X(ly - 2.45), X(4.4), X(4.4))
  p.fill(RAILWAY.iron)
  p.rect(X(lx), X(ly - 0.25), X(0.34), X(0.42))
  p.triangle(X(lx - 0.22), X(ly - 0.46), X(lx + 0.22), X(ly - 0.46), X(lx), X(ly - 0.66))
  p.fill(RAILWAY.lamp)
  p.rect(X(lx), X(ly - 0.25), X(0.22), X(0.3))
  p.pop()
  // The starting signal at the platform's end, cleared: off the special goes.
  signal(p, k, HALT.x1 + 2.2, w, true)
}

/** The red signal before the terminus, and the buffer stops at the end of the line with their red lamp. */
export function terminus(p: p5, k: number, f: View, w: number, t: number): void {
  const X = (v: number) => v * k
  if (f.x1 > SIGNAL_X - 2 && f.x0 < SIGNAL_X + 2) signal(p, k, SIGNAL_X, w, false)
  if (f.x1 < BUFFER_STOP - 1 || f.x0 > BUFFER_STOP + 4) return
  const x = BUFFER_STOP
  p.push()
  // The engine hits them at the festival: they take it with a shudder, rammed back a hair and ringing to rest.
  const hit = t - T_STOP
  if (hit > 0) p.translate(X(0.06 * Math.sin(Math.min(Math.PI / 2, hit * 30)) * Math.exp(-hit / 0.12) + 0.025 * Math.sin(hit * 34) * Math.exp(-hit / 0.3)), 0)
  // Two old rails bent up into a frame, a heavy baulk across them at buffer height, painted red, a lamp on it.
  p.stroke(mixHex(RAILWAY.rail, RAILWAY.iron, 0.35))
  p.strokeWeight(X(0.09))
  p.noFill()
  p.line(X(x + 0.2), X(RAIL_Y - 1.0), X(x + 1.9), X(RAIL_Y - 0.05))
  p.line(X(x + 0.2), X(RAIL_Y - 1.7), X(x + 0.5), X(RAIL_Y - 0.05))
  p.line(X(x + 0.2), X(RAIL_Y - 1.2), X(x + 0.2), X(RAIL_Y - 0.05))
  p.noStroke()
  p.fill(TIMBER)
  p.rect(X(x + 0.24), X(RAIL_Y - 1.4), X(0.48), X(0.8))
  p.fill(RAILWAY.wheel)
  p.rect(X(x + 0.24), X(RAIL_Y - 1.4), X(0.48), X(0.5))
  p.fill(RAILWAY.fwWhite)
  p.rect(X(x + 0.24), X(RAIL_Y - 1.4), X(0.48), X(0.08))
  p.stroke(TIMBER_LIT)
  p.strokeWeight(w * 0.5)
  p.line(X(x), X(RAIL_Y - 1.8), X(x + 0.48), X(RAIL_Y - 1.8))
  p.noStroke()
  const lamp: Pt = [x + 0.24, RAIL_Y - 2.1]
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(X(lamp[0]), X(lamp[1]), 0, X(lamp[0]), X(lamp[1]), X(1.4))
  g.addColorStop(0, 'rgba(229, 70, 59, 0.3)')
  g.addColorStop(1, 'rgba(229, 70, 59, 0)')
  ctx.fillStyle = g
  ctx.fillRect(X(lamp[0] - 1.4), X(lamp[1] - 1.4), X(2.8), X(2.8))
  p.fill(RAILWAY.iron)
  p.rect(X(lamp[0]), X(lamp[1]), X(0.3), X(0.34))
  p.triangle(X(lamp[0] - 0.2), X(lamp[1] - 0.17), X(lamp[0] + 0.2), X(lamp[1] - 0.17), X(lamp[0]), X(lamp[1] - 0.34))
  p.fill(RAILWAY.signalRed)
  p.rect(X(lamp[0]), X(lamp[1]), X(0.18), X(0.2))
  p.pop()
}

/* ------------------------------------------------------------------ the valley and the trestle */

/**
 * The river's course on the screen at world `y` (between the horizon and the frame's foot): its middle and its
 * half-width, and `s`, how near it is (0 at the horizon, 1 at the trestle's foot, more toward us). Seen from
 * downstream: it comes out of the distance in wide soft bends, runs straight under the middle of the trestle, and on
 * toward us, widening.
 */
function course(f: View, y: number): { cx: number; half: number; s: number } {
  const H = f.y1 - f.y0
  const hy = f.y0 + HORIZON * H
  const mid = (RIVER.x0 + RIVER.x1) / 2
  const vx = f.cx + (mid - f.cx) * 0.18
  const bed = floorY(mid)
  const s = Math.max(0.003, (y - hy) / (bed - hy))
  const z = 1 / s
  const wander = 5 * Math.sin(2.4 * Math.log(z)) * Math.min(1, 0.4 + 0.1 * z)
  return { cx: vx + (mid - vx + wander) * s, half: ((RIVER.x1 - RIVER.x0) / 2) * s, s }
}

/** The river's outline from world y `ya` to `yb`, `widen` times its width, as a path on the canvas. */
function riverPath(ctx: CanvasRenderingContext2D, k: number, f: View, ya: number, yb: number, widen: number): void {
  const n = 56
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const y = ya + (yb - ya) * Math.pow(i / n, 1.7)
    const c = course(f, y)
    left.push([c.cx - c.half * widen, y])
    right.push([c.cx + c.half * widen, y])
  }
  ctx.beginPath()
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0] * k, right[i][1] * k)
  ctx.closePath()
}

/**
 * The river from world y `ya` to `yb`: its dark banks, a feathered edge, the water paling toward the horizon, and the
 * moon's glade on it: soft glints under the moon, shivering, only where the water is.
 */
function river(p: p5, k: number, f: View, t: number, ya: number, yb: number): void {
  if (yb <= ya) return
  const X = (v: number) => v * k
  const H = f.y1 - f.y0
  const hy = f.y0 + HORIZON * H
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.fillStyle = `rgba(23, 24, 30, 0.3)`
  riverPath(ctx, k, f, ya, yb, 1.9)
  ctx.fill()
  const water = ctx.createLinearGradient(0, X(hy), 0, X(f.y1 + 0.5))
  water.addColorStop(0, mixHex(RAILWAY.river, RAILWAY.moonHalo, 0.5))
  water.addColorStop(0.3, RAILWAY.river)
  water.addColorStop(1, mixHex(RAILWAY.river, RAILWAY.iron, 0.3))
  ctx.fillStyle = water
  for (const [widen, a] of [[1.3, 0.2], [1.13, 0.4], [1, 1]] as const) {
    ctx.globalAlpha = a
    riverPath(ctx, k, f, ya, yb, widen)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  riverPath(ctx, k, f, ya, yb, 0.96)
  ctx.clip()
  const m = moonAt(p, k, t)
  p.noStroke()
  for (let i = 0; i < 44; i++) {
    const q = (i + 0.5) / 44
    const y = ya + (yb - ya) * Math.pow(q, 1.6)
    const c = course(f, y)
    const near = Math.min(1.6, c.s)
    const spread = m.r * (0.5 + 0.9 * near)
    const x = m.x + (hash(i, Math.floor(t * 6), 5) - 0.5) * spread
    if (Math.abs(x - c.cx) > c.half * 0.95) continue
    const len = (0.25 + 0.75 * hash(i, 7)) * spread * 0.55
    const hgt = Math.max(0.015, 0.012 * H * near)
    p.fill(alpha(p, RAILWAY.moon, (0.25 + 0.4 * hash(i, Math.floor(t * 4), 9)) * (0.4 + 0.6 * Math.min(1, near))))
    p.ellipse(X(x), X(y), X(len), X(hgt))
  }
  ctx.restore()
}

/** The valley the trestle crosses, seen from downstream: the river's far reaches, out of the distance to its foot. */
export function valley(p: p5, k: number, f: View, _w: number, t: number): void {
  const { x0, x1 } = TRESTLE
  if (f.x1 < x0 - 1 || f.x0 > x1 + 1) return
  const H = f.y1 - f.y0
  const hy = f.y0 + HORIZON * H
  const bed = floorY((RIVER.x0 + RIVER.x1) / 2)
  p.push()
  river(p, k, f, t, hy + 0.001 * H, bed)
  p.pop()
}

/** The trestle: timber bents from the deck down to the valley floor, braced across, the deck and its stringers. */
export function trestle(p: p5, k: number, f: View, w: number): void {
  const { x0, x1 } = TRESTLE
  if (f.x1 < x0 - 1 || f.x0 > x1 + 1) return
  const X = (v: number) => v * k
  const deck = RAIL_Y + 0.55
  const step = 2.4
  const bents: number[] = []
  for (let x = x0 + 1.4; x < x1 - 1.2; x += step) bents.push(x)
  p.push()
  p.strokeCap(p.SQUARE)
  // The bracing: in every panel between two bents, an X of timber, and girts across every two cells down.
  p.stroke(TIMBER)
  p.strokeWeight(X(0.07))
  for (let i = 0; i < bents.length - 1; i++) {
    const a = bents[i]
    const b = bents[i + 1]
    if (b < f.x0 - 1 || a > f.x1 + 1) continue
    const foot = Math.min(floorY(a), floorY(b))
    for (let y = deck; y < foot - 0.3; y += 2.1) {
      const y2 = Math.min(foot, y + 2.1)
      p.line(X(a), X(y), X(b), X(y2))
      p.line(X(b), X(y), X(a), X(y2))
      p.strokeWeight(X(0.1))
      p.line(X(a), X(y2), X(b), X(y2))
      p.strokeWeight(X(0.07))
    }
  }
  // The bents, each a stout post from the deck to its footing, lit on its moon side.
  for (const x of bents) {
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const foot = floorY(x)
    p.noStroke()
    p.fill(TIMBER)
    p.quad(X(x - 0.1), X(deck), X(x + 0.1), X(deck), X(x + 0.16), X(foot), X(x - 0.16), X(foot))
    p.fill(TIMBER_LIT)
    p.quad(X(x + 0.04), X(deck), X(x + 0.1), X(deck), X(x + 0.16), X(foot), X(x + 0.07), X(foot))
    p.fill(mixHex(STONE, RAILWAY.iron, 0.3))
    p.rect(X(x), X(foot - 0.08), X(0.5), X(0.22))
  }
  // The deck: a deep stringer under the sleepers, its top edge in the moon.
  p.noStroke()
  p.fill(TIMBER)
  p.rect(X((x0 + x1) / 2), X(RAIL_Y + 0.37), X(x1 - x0 + 0.4), X(0.36))
  p.stroke(TIMBER_LIT)
  p.strokeWeight(w * 0.5)
  p.line(X(x0 - 0.2), X(RAIL_Y + 0.55), X(x1 + 0.2), X(RAIL_Y + 0.55))
  p.pop()
}

/* ------------------------------------------------------------------ the ground and the track */

/** The near ground: the embankment's grass under the ballast, cut away where the valley is; the river's near reach. */
export function ground(p: p5, k: number, f: View, w: number, t: number): void {
  const X = (v: number) => v * k
  const { x0, x1 } = TRESTLE
  const a = Math.max(f.x0 - 1, -40)
  const b = f.x1 + 1
  p.push()
  p.noStroke()
  // Grass from the ballast's foot down, following the valley's floor where there is one.
  p.fill(GRASS)
  p.beginShape()
  p.vertex(X(a), X(f.y1 + 1))
  for (let x = a; x <= b; x += 0.5) p.vertex(X(x), X(Math.max(RAIL_Y + 0.5, floorY(x))))
  p.vertex(X(b), X(RAIL_Y + 0.5))
  p.vertex(X(b), X(f.y1 + 1))
  p.endShape(p.CLOSE)
  // Where the valley is, its near banks go on down toward us either side of the river (drawn over by `river`).
  p.stroke(GRASS_LIT)
  p.strokeWeight(w * 0.5)
  p.noFill()
  p.beginShape()
  for (let x = a; x <= b; x += 0.5) p.vertex(X(x), X(Math.max(RAIL_Y + 0.5, floorY(x))))
  p.endShape()
  // Tufts along the ballast's foot, off the valley.
  p.stroke(GRASS_LIT)
  p.strokeWeight(Math.max(1, w * 0.4))
  for (let i = Math.floor(a / 0.7); i < b / 0.7; i++) {
    const x = i * 0.7 + hash(i, 3) * 0.5
    if (x > x0 - 0.5 && x < x1 + 0.5) continue
    if (hash(i, 4) > 0.55) continue
    const h = 0.12 + 0.12 * hash(i, 5)
    const y = RAIL_Y + 0.52
    p.line(X(x), X(y), X(x - 0.05), X(y - h))
    p.line(X(x + 0.06), X(y), X(x + 0.08), X(y - h * 0.8))
  }
  p.pop()
  // The river's near reach, over the near banks: the valley's middle, widening to the frame's foot.
  if (f.x1 > x0 && f.x0 < x1) nearRiver(p, k, f, t)
}

function nearRiver(p: p5, k: number, f: View, t: number): void {
  const bed = floorY((RIVER.x0 + RIVER.x1) / 2)
  p.push()
  river(p, k, f, t, bed, f.y1 + 0.5)
  p.pop()
}

/** The ballast, the sleepers' ends, the rails with a joint every wheel-turn: along the embankment and over the deck. */
export function track(p: p5, k: number, f: View, _w: number): void {
  const X = (v: number) => v * k
  const a = Math.max(f.x0 - 1, -40)
  const b = Math.min(f.x1 + 1, BUFFER_STOP + 1.95)
  if (b <= a) return
  const { x0, x1 } = TRESTLE
  p.push()
  p.noStroke()
  // The ballast shoulder, off the trestle.
  p.fill(BALLAST)
  const bal = (u: number, v: number) => {
    if (v <= u) return
    p.rect(X((u + v) / 2), X(RAIL_Y + 0.33), X(v - u), X(0.36))
  }
  bal(a, Math.min(b, x0))
  bal(Math.max(a, x1), b)
  p.fill(alpha(p, RAILWAY.moon, 0.12))
  for (let i = Math.floor(a / 0.23); i < b / 0.23; i++) {
    const x = i * 0.23 + hash(i, 1) * 0.15
    if (x > x0 && x < x1) continue
    p.rect(X(x), X(RAIL_Y + 0.2 + hash(i, 2) * 0.28), X(0.05), X(0.035))
  }
  // Sleepers' ends.
  p.fill(RAILWAY.sleeper)
  for (let i = Math.floor(a / 0.62); i < b / 0.62; i++) p.rect(X(i * 0.62), X(RAIL_Y + 0.14), X(0.3), X(0.13))
  // The rail: its web in shadow, its head bright in the moon.
  p.fill(mixHex(RAILWAY.rail, RAILWAY.iron, 0.55))
  p.rect(X((a + b) / 2), X(RAIL_Y + 0.045), X(b - a), X(0.09))
  p.fill(RAILWAY.rail)
  p.rect(X((a + b) / 2), X(RAIL_Y + 0.015), X(b - a), X(0.03))
  // The joints: a fishplate and a hairline gap, one every turn of the drivers (the knock on every backbeat).
  const first = -0.5 + LEAD
  for (let i = Math.ceil((a - first) / TURN); i <= (b - first) / TURN; i++) {
    const x = first + i * TURN
    p.fill(mixHex(RAILWAY.rail, RAILWAY.iron, 0.4))
    p.rect(X(x), X(RAIL_Y + 0.05), X(0.34), X(0.07))
    p.fill(RAILWAY.iron)
    p.rect(X(x), X(RAIL_Y + 0.02), X(0.02), X(0.04))
  }
  p.pop()
}
