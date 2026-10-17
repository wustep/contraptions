import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { clamp, easeInOut, lerp, smooth } from './brush'

/**
 * The camera's grammar: a shot is a stretch of show time with one way of framing, and a cut is where one shot gives
 * way to the next. Inside a shot the frame may hold, glide from one framing to another, or follow the ball, eased
 * (a follow is the ball's place averaged over a short window, so it never jerks with a bounce).
 */

export type Frame = (t: number) => Framing

export interface Shot {
  /** Show time the shot starts: a cut, unless the shot before ends on the same framing. */
  from: number
  frame: Frame
  /** What the shot is about, for Zoom. */
  focus?: (t: number) => Pt
}

export const hold = (x: number, y: number, cells: number, extra: Partial<Framing> = {}): Frame => () => ({ x, y, cells, ...extra })

/** From framing `a` at `t0` to `b` at `t1`, eased both ends. */
export function glide(t0: number, t1: number, a: Framing, b: Framing, ease: (u: number) => number = easeInOut): Frame {
  return (t) => {
    const u = ease(clamp((t - t0) / (t1 - t0)))
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), cells: lerp(a.cells, b.cells, u) }
  }
}

/** The ball's place averaged over `win` seconds round `t`, a little behind it (`lag`). */
export function smoothed(where: (t: number) => Pt, t: number, win: number, lag = 0): Pt {
  let x = 0
  let y = 0
  let w = 0
  const n = 8
  for (let i = -n; i <= n; i++) {
    const k = 1 - Math.abs(i) / (n + 1)
    const [px, py] = where(t - lag + (i / n) * win)
    x += px * k
    y += py * k
    w += k
  }
  return [x / w, y / w]
}

/** Follow the ball, smoothed, set off by `[dx, dy]` (the ball left of centre leaves room for where it is going). */
export function follow(where: (t: number) => Pt, cells: number, dx = 0, dy = 0, win = 0.6, lag = 0.1, box?: { x0?: number; x1?: number; y0?: number; y1?: number }): Frame {
  return (t) => {
    const [x, y] = smoothed(where, t, win, lag)
    let fx = x + dx
    let fy = y + dy
    if (box) {
      if (box.x0 !== undefined) fx = Math.max(box.x0, fx)
      if (box.x1 !== undefined) fx = Math.min(box.x1, fx)
      if (box.y0 !== undefined) fy = Math.max(box.y0, fy)
      if (box.y1 !== undefined) fy = Math.min(box.y1, fy)
    }
    return { x: fx, y: fy, cells }
  }
}

/** One frame eased into another over `[t0, t1]`: a move inside a shot, from whatever the first is doing. */
export function blend(a: Frame, b: Frame, t0: number, t1: number): Frame {
  return (t) => {
    if (t <= t0) return a(t)
    if (t >= t1) return b(t)
    const u = smooth(t, t0, t1)
    const fa = a(t)
    const fb = b(t)
    return { x: lerp(fa.x, fb.x, u), y: lerp(fa.y, fb.y, u), cells: lerp(fa.cells, fb.cells, u) }
  }
}

export class Camera {
  constructor(readonly shots: Shot[]) {}

  shotAt(t: number): number {
    let i = 0
    while (i + 1 < this.shots.length && t >= this.shots[i + 1].from) i++
    return i
  }

  at(t: number): Framing {
    const s = this.shots[this.shotAt(t)]
    const f = s.frame(t)
    return s.focus ? { ...f, focus: s.focus(t) } : f
  }

  /** The show times of the cuts. */
  cuts(): number[] {
    return this.shots.slice(1).map((s) => s.from)
  }
}
