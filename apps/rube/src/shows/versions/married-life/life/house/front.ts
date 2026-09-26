import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { AGE } from '../music'
import { HOME, INK } from '../worlds'
import { drawHouse, dusk, type Look } from './front-house'
import { ALONE, CHAIR_LIFT, darkAt, G, HALT, HOUSE, LAMPS, SHOVE, STAR, SWINGS, W } from './front-plan'

/**
 * The front set (the house builder's): the house from the street, the lawn and the pavement, the sky, the mailbox
 * and the street lamps. Standing scenery for the whole show, drawn from show time (`c.t`) in the house world's cells
 * from the set's origin. Seen twice: the fix-up (the derelict clubhouse made new on the waltz, left to right behind
 * the machine's rollers) and the end (the same house fifty years on, faded and patched, at dusk, the lamp lit in the
 * window, the street lamps coming on, the first stars).
 *
 * What is where, and when, is `front-plan.ts`; the house itself is `front-house.ts`.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const FRONT_BOX: [number, number, number, number] = [-24, -22, 36, 12]

/** The house's condition at T, old or new. */
export function lookAt(T: number, old = false): Look {
  return {
    old,
    age: old ? 0 : AGE(T),
    dark: darkAt(T),
    lamp: T < ALONE.lamp ? 0 : smooth(T, ALONE.lamp, ALONE.lamp + 0.1),
    T,
  }
}

/** From when the bay's frame, the wall by the door and its jambs are drawn by the parts over the two of them (indoors). */
export const FRONT_OVER = 42.0

/** Which chairs stand in the room at T. */
export const chairsIn = (T: number) => ({ carl: T >= CHAIR_LIFT.carl[2], ellie: T >= CHAIR_LIFT.ellie[2] })

/** The sky: a day's blue for the fix-up; for the end, an evening's warmth low down going to night. */
function skyAt(T: number): { top: string; low: string } {
  const d = darkAt(T)
  if (d <= 0) return { top: '#A8CFE3', low: '#DDEDF1' }
  const u = Math.max(0, Math.min(1, (d - 0.3) / 0.52))
  return {
    top: mixHex('#7C86AE', HOME.night, u),
    low: mixHex(HOME.dusk, '#4E5277', Math.pow(u, 0.8)),
  }
}

function sky(p: p5, k: number, f: ReturnType<typeof frame>, T: number): void {
  const { top, low } = skyAt(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const y0 = Math.min(f.y0, G)
  const y1 = Math.min(f.y1, G)
  if (y1 <= y0) return
  ctx.save()
  const g = ctx.createLinearGradient(0, -13 * k, 0, G * k)
  g.addColorStop(0, top)
  g.addColorStop(1, low)
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, y0 * k, (f.x1 - f.x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** The evening star first, on its note; then the others, one by one as the dark comes: small and still, high over the house. */
function stars(p: p5, k: number, f: ReturnType<typeof frame>, T: number): void {
  if (T < STAR.on) return
  const d = darkAt(T)
  p.noStroke()
  // The evening star: a little larger and warmer than the rest, brightening on the note and settling.
  const s = T - STAR.on
  const on = smooth(s, 0, 0.35)
  const [sx, sy] = STAR.at
  p.fill(alpha(p, '#FFF3D6', 0.16 * on))
  p.circle(sx * k, sy * k, 0.36 * k)
  p.fill(alpha(p, '#FFF6E0', 0.95 * on))
  p.circle(sx * k, sy * k, (0.14 + 0.03 * Math.exp(-s / 0.5)) * k)
  for (let i = 0; i < 90; i++) {
    const x = -26 + hash(i, 71) * 64
    const y = -17.5 + hash(i, 72) * 13
    if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const a = smooth(T, STAR.on + 1.5 + hash(i, 73) * 12, STAR.on + 3 + hash(i, 73) * 12) * smooth(d, 0.5, 0.7)
    if (a <= 0) continue
    const r = 0.025 + hash(i, 74) * 0.03
    p.fill(alpha(p, '#FFF3D6', 0.7 * a))
    p.circle(x * k, y * k, 2 * r * k)
  }
}

/** The lawn, the pavement and its kerb, the road: bands under the ground line, as far as the frame shows. */
function ground(p: p5, k: number, f: ReturnType<typeof frame>, T: number): void {
  if (f.y1 <= G) return
  const L = lookAt(T)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const band = (y0: number, y1: number, hex: string) => {
    p.fill(dusk(L, hex))
    p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  p.noStroke()
  band(G, G + 0.24, mixHex(HOME.grass, '#9DAA78', L.age * 0.6))
  band(G + 0.24, G + 0.55, mixHex(HOME.stone, '#B8AD9A', L.age))
  band(G + 0.55, G + 0.66, mixHex('#9C9282', '#8E8578', L.age))
  band(G + 0.66, Math.max(G + 0.66, f.y1 + 1), mixHex('#77716B', '#6C6862', L.age))
}

/** A street lamp: an iron post and a lantern; lit on its note, the glass warm and a soft pool of light round it. */
function lampPost(p: p5, k: number, weight: number, x: number, at: number, T: number): void {
  const L = lookAt(T)
  const lit = T < at ? 0 : smooth(T, at, at + 0.15)
  const top = -3.35
  const iron = dusk(L, '#4F5A57')
  if (lit > 0) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    const g = ctx.createRadialGradient(x * k, (top - 0.2) * k, 0, x * k, (top - 0.2) * k, 1.7 * k)
    g.addColorStop(0, `rgba(255, 227, 166, ${0.24 * lit})`)
    g.addColorStop(1, 'rgba(255, 227, 166, 0)')
    ctx.fillStyle = g
    ctx.fillRect((x - 1.7) * k, (top - 1.9) * k, 3.4 * k, 3.4 * k)
    // And its pool on the pavement.
    ctx.scale(1, 0.25)
    const cy = ((G + 0.3) * k) / 0.25
    const h = ctx.createRadialGradient(x * k, cy, 0, x * k, cy, 1.6 * k)
    h.addColorStop(0, `rgba(255, 227, 166, ${0.28 * lit})`)
    h.addColorStop(1, 'rgba(255, 227, 166, 0)')
    ctx.fillStyle = h
    ctx.fillRect((x - 1.6) * k, cy - 1.6 * k, 3.2 * k, 3.2 * k)
    ctx.restore()
  }
  p.stroke(dusk(L, INK))
  p.strokeWeight(weight * 0.8)
  p.fill(iron)
  p.rect((x - 0.05) * k, top * k, 0.1 * k, (G - top) * k)
  p.rect((x - 0.14) * k, (G - 0.12) * k, 0.28 * k, 0.12 * k, 0.03 * k)
  // The lantern: a small glass box under a cap.
  p.fill(lit > 0 ? mixHex(dusk(L, '#9AA7A4'), HOME.lamp, lit) : dusk(L, '#9AA7A4'))
  p.quad((x - 0.11) * k, (top - 0.02) * k, (x + 0.11) * k, (top - 0.02) * k, (x + 0.15) * k, (top - 0.42) * k, (x - 0.15) * k, (top - 0.42) * k)
  p.fill(iron)
  p.triangle((x - 0.22) * k, (top - 0.42) * k, (x + 0.22) * k, (top - 0.42) * k, x * k, (top - 0.62) * k)
}

/** The light from the lit room out through the bay, falling on the lawn in front of it. */
function spill(p: p5, k: number, T: number): void {
  const L = lookAt(T)
  const a = L.lamp * L.dark
  if (a <= 0.01) return
  const { x0, x1 } = HOUSE.bay
  p.noStroke()
  p.fill(alpha(p, HOME.lamp, 0.22 * a))
  p.quad(x0 * k, G * k, x1 * k, G * k, (x1 + 0.5) * k, (G + 0.55) * k, (x0 - 0.5) * k, (G + 0.55) * k)
}

function drawFront(p: p5, k: number, weight: number, T: number): void {
  const f = frame(p, k)
  p.push()
  p.rectMode(p.CORNER)
  sky(p, k, f, T)
  stars(p, k, f, T)
  ground(p, k, f, T)
  for (const lamp of LAMPS) if (lamp.x > f.x0 - 3 && lamp.x < f.x1 + 3) lampPost(p, k, weight, lamp.x, lamp.at, T)
  const chairs = chairsIn(T)
  const here = T < FRONT_OVER
  if (T < SHOVE) drawHouse(p, k, weight, lookAt(T, true), chairs, SWINGS, here)
  else if (T >= HALT) drawHouse(p, k, weight, lookAt(T), chairs, SWINGS, here)
  else {
    // Mid fix-up: new left of the rollers, old right of them.
    const w = W(T)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const Y0 = (f.y0 - 2) * k
    const Hh = (f.y1 - f.y0 + 4) * k
    ctx.save()
    ctx.beginPath()
    ctx.rect((f.x0 - 2) * k, Y0, (w - f.x0 + 2) * k, Hh)
    ctx.clip()
    drawHouse(p, k, weight, lookAt(T), chairs, SWINGS, here)
    ctx.restore()
    ctx.save()
    ctx.beginPath()
    ctx.rect(w * k, Y0, (f.x1 - w + 2) * k, Hh)
    ctx.clip()
    drawHouse(p, k, weight, lookAt(T, true), chairs, SWINGS, here)
    ctx.restore()
  }
  spill(p, k, T)
  p.pop()
}

export const front = scenery<null>({
  name: 'front',
  draw: (p, _s, c) => drawFront(p, c.k, c.weight, c.t),
})
