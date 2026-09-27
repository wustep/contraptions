import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { BAR, COLLAPSE, LAST, T0, swell } from './music'
import { DRUM, TOWER } from './plan'
import { clamp, smooth } from './look'

/**
 * Where the tower is: every drawing of it, and the ball while it is on it, is laid in the tower's own cells and
 * moved here.
 *
 * - **The sway.** The tower rocks on the drum head, once over each two-bar turn of the drum, a little more as it
 *   gets taller and the orchestra louder; from C's return (bar 335) it rocks hard.
 * - **The collapse.** From bar 339 it splits down its mast, and each storey's two halves fall away either side,
 *   turning outward about the mast as they drop, the top first, and all of them come down on the last chord.
 */

const PIVOT: Pt = [0, DRUM.head]
const RETURN = T0 + 334 * BAR

/** The tower's lean, radians (positive leans it right). */
export function sway(t: number): number {
  if (t >= COLLAPSE) return swayAt(COLLAPSE) * (1 - smooth(t, COLLAPSE, COLLAPSE + 0.4))
  return swayAt(t)
}
function swayAt(t: number): number {
  const phase = (2 * Math.PI * (t - T0)) / (2 * BAR)
  const grow = 0.0006 + 0.0034 * smooth(swell(t), 0.1, 1)
  const hard = 0.012 * smooth(t, RETURN, RETURN + 2 * BAR)
  return (grow + hard) * Math.sin(phase)
}

/** Gravity for the falling halves, cells a second squared. */
export const FALL_G = 9
/** A storey (the roof is storey 10) half: when it lets go, how far it has fallen and turned, and how far out it has gone. */
export function fall(n: number, side: -1 | 1, t: number): { dx: number; dy: number; a: number; u: number } {
  const floor = n < TOWER.length ? TOWER[n].floor : TOWER[TOWER.length - 1].top
  // It lands when its floor reaches the heap: the lower storeys lie on the ground, the upper on them.
  const heap = -0.25 - 0.18 * n
  const drop = heap - floor
  const dur = Math.sqrt((2 * drop) / FALL_G)
  const from = LAST - dur
  if (t <= from) return { dx: 0, dy: 0, a: 0, u: 0 }
  const d = Math.min(t, LAST) - from
  const u = clamp(d / dur)
  // Out from the mast and over, a little more for the higher (and wider) storeys.
  const out = side * (0.9 + 0.55 * n) * u * u
  const a = side * (0.25 + 0.05 * n) * Math.PI * u * u
  // After the chord: a little settle, and still.
  const settle = t > LAST ? Math.exp(-(t - LAST) / 0.12) * Math.sin((t - LAST) * 30) * 0.03 : 0
  return { dx: out, dy: 0.5 * FALL_G * d * d + settle, a, u }
}

/** Whether the tower is in halves at `t`. */
export const broken = (t: number): boolean => t > LAST - Math.sqrt((2 * (-0.25 - TOWER[TOWER.length - 1].top)) / FALL_G) - 0.001

/** A point of storey `n`'s half `side`, in the tower's cells, moved to the world at `t`. */
export function place(pt: Pt, n: number, side: -1 | 1, t: number): Pt {
  const s = sway(t)
  let [x, y] = rot(pt, PIVOT, s)
  if (t > COLLAPSE - 0.001) {
    const f = fall(n, side, t)
    if (f.u > 0) {
      const pivot = rot([0, n < TOWER.length ? TOWER[n].floor : TOWER[TOWER.length - 1].top], PIVOT, s)
      ;[x, y] = rot([x, y], pivot, f.a)
      x += f.dx
      y += f.dy
    }
  }
  return [x, y]
}

function rot(p: Pt, c: Pt, a: number): Pt {
  if (!a) return p
  const cs = Math.cos(a)
  const sn = Math.sin(a)
  const dx = p[0] - c[0]
  const dy = p[1] - c[1]
  return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs]
}

/**
 * Draw `fn` in storey `n`'s frame at `t`: in its half `side`, clipped to that side of the mast, once it has broken;
 * whole (side 0) while it stands. `k` is the stage's cell size.
 */
export function inFrame(p: p5, k: number, n: number, t: number, fn: (side: -1 | 0 | 1) => void): void {
  const s = sway(t)
  const halves: (-1 | 1)[] = [-1, 1]
  const apart = t > COLLAPSE - 0.001 && halves.some((side) => fall(n, side, t).u > 0)
  if (!apart) {
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(s)
    p.translate(-PIVOT[0] * k, -PIVOT[1] * k)
    fn(0)
    p.pop()
    return
  }
  for (const side of halves) {
    const f = fall(n, side, t)
    const floor = n < TOWER.length ? TOWER[n].floor : TOWER[TOWER.length - 1].top
    p.push()
    p.translate(f.dx * k, f.dy * k)
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(s)
    p.translate(-PIVOT[0] * k, -PIVOT[1] * k)
    p.translate(0, floor * k)
    p.rotate(f.a)
    p.translate(0, -floor * k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    if (side < 0) ctx.rect(-1000 * k, -1000 * k, 1000 * k, 2000 * k)
    else ctx.rect(0, -1000 * k, 1000 * k, 2000 * k)
    ctx.clip()
    fn(side)
    p.pop()
  }
}
