import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { BAR, COLLAPSE, LAST, T0, swell } from './music'
import { DRUM, TOWER } from './plan'
import { smooth } from './look'

/**
 * Where the tower is: every drawing of it, and the ball while it is on it, is laid in the tower's own cells and
 * moved here.
 *
 * - **The sway.** The tower rocks on the drum head, once over each two-bar turn of the drum, a little more as it
 *   gets taller and the orchestra louder; from C's return (bar 335) it rocks hard.
 * - **The collapse.** On bar 339 (the trombones' glissandi) it splits down its mast, and each storey's two halves
 *   fall away either side as they let go, the roof first and the lowest storey last, each turning outward as it
 *   drops, the whole tower down in a heap round the drum on the last chord. The drum stands.
 */

const PIVOT: Pt = [0, DRUM.head]
const RETURN = T0 + 334 * BAR

/** The tower's lean, radians (positive leans it right). */
export function sway(t: number): number {
  if (t >= COLLAPSE) return swayAt(COLLAPSE) * (1 - smooth(t, COLLAPSE, COLLAPSE + 0.3))
  return swayAt(t)
}
function swayAt(t: number): number {
  const phase = (2 * Math.PI * (t - T0)) / (2 * BAR)
  const grow = 0.0006 + 0.0034 * smooth(swell(t), 0.1, 1)
  const hard = 0.011 * smooth(t, RETURN, RETURN + 2 * BAR)
  return (grow + hard) * Math.sin(phase)
}

/** The roof is storey 10 here: its box over the top storey. */
const ROOF_H = 3.1
function boxOf(n: number): { floor: number; top: number; w: number } {
  if (n < TOWER.length) return TOWER[n]
  const top = TOWER[TOWER.length - 1]
  return { floor: top.top, top: top.top - ROOF_H, w: top.w }
}

/** Gravity for the falling halves, cells a second squared. */
export const FALL_G = 9.78
interface Fall {
  release: number
  /** The half's middle before it falls. */
  c0: Pt
  /** How fast it goes out, and how fast it turns (radians a second, signed so its outer end goes down). */
  vx: number
  spin: number
  /** When it has come down, seconds after its release. */
  land: number
}
/** A half's corners, from its middle. */
const corners = (n: number): Pt[] => {
  const b = boxOf(n)
  const hw = b.w / 4
  const hh = (b.floor - b.top) / 2
  return [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]
}
const FALLS: Record<string, Fall> = (() => {
  const out: Record<string, Fall> = {}
  for (let n = 0; n <= TOWER.length; n++) {
    for (const side of [-1, 1] as const) {
      const b = boxOf(n)
      const c0: Pt = [(side * b.w) / 4, (b.floor + b.top) / 2]
      // The roof lets go on the collapse's first stroke, and every storey after the one over it, down to the lowest.
      const release = COLLAPSE + (TOWER.length - n) * 0.1
      const vx = side * (0.7 + 0.22 * n)
      const spin = side * (0.55 + 0.05 * n)
      // Falling until its lowest corner is on the ground (the heap: a little higher for each storey already down).
      const floor = -0.04 - 0.07 * (TOWER.length - n)
      let land = 0
      for (let d = 0; d < 6; d += 0.004) {
        const a = spin * d
        const cx = c0[0] + vx * d
        const cy = c0[1] + 0.5 * FALL_G * d * d
        const low = Math.max(...corners(n).map(([x, y]) => cy + x * Math.sin(a) + y * Math.cos(a)))
        if (low >= floor) {
          land = d
          break
        }
        void cx
      }
      out[`${n}${side}`] = { release, c0, vx, spin, land }
    }
  }
  return out
})()

/** A half's pose at `t`: how far its middle has moved and how far it has turned about it. */
export function fall(n: number, side: -1 | 1, t: number): { dx: number; dy: number; a: number; c0: Pt; u: number } {
  const f = FALLS[`${n}${side}`]
  if (t <= f.release) return { dx: 0, dy: 0, a: 0, c0: f.c0, u: 0 }
  const d = Math.min(t - f.release, f.land)
  // After it lands: a short settle, a rock of its turn, and still.
  const after = t - f.release - f.land
  const settle = after > 0 ? Math.exp(-after / 0.18) * Math.sin(after * 26) * 0.035 : 0
  return { dx: f.vx * d, dy: 0.5 * FALL_G * d * d, a: f.spin * d + settle * Math.sign(f.spin), c0: f.c0, u: Math.min(1, d / f.land) }
}
/** When the last half comes down. */
export const DOWN = Math.max(...Object.values(FALLS).map((f) => f.release + f.land))
export const RELEASES = Object.values(FALLS).map((f) => f.release)

/** A point of storey `n`'s half `side`, in the tower's cells, moved to the world at `t`. */
export function place(pt: Pt, n: number, side: -1 | 1, t: number): Pt {
  let [x, y] = rot(pt, PIVOT, sway(t))
  if (t > COLLAPSE - 0.001) {
    const f = fall(n, side, t)
    if (f.u > 0) {
      ;[x, y] = rot([x, y], f.c0, f.a)
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
 * Draw `fn` in storey `n`'s frame at `t` (the roof is storey 10): whole (side 0) while it stands; each half in its
 * own falling frame, clipped to its side of the mast, once it has let go. `k` is the stage's cell size.
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
    p.push()
    p.translate(f.dx * k, f.dy * k)
    p.translate(f.c0[0] * k, f.c0[1] * k)
    p.rotate(f.a)
    p.translate(-f.c0[0] * k, -f.c0[1] * k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    if (side < 0) ctx.rect(-1000 * k, -1000 * k, 1000 * k, 2000 * k)
    else ctx.rect(0, -1000 * k, 1000 * k, 2000 * k)
    ctx.clip()
    fn(side)
    p.pop()
  }
}

void LAST
