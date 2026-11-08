/**
 * The physics: balls under gravity among fixed parts, in two dimensions, stepped at 2 kHz.
 *
 * A part is a segment with a thickness (a capsule): a bar, a string, a length of rail, a pipe's wall. A ball that
 * comes into one is put back out along the normal and its velocity reflected with the part's restitution, the
 * tangential part kept (polished balls on lacquered parts: no friction to speak of). The step is exact for a body
 * under gravity alone, and a contact is resolved at the moment it happened, not at the end of the step it was found
 * in: the ball is wound back to the touch, turned, and run on for the rest of the step. So a ball bounces down a row
 * of bars where the bars were placed for it to (`design.ts`), to a tenth of a millisecond.
 *
 * Every contact harder than a whisper is written down: when, which part, how hard (the normal speed), and where
 * along the part. Those contacts are the score. Nothing else makes a sound.
 */

/**
 * What a ball is made of. All are the same size and all are hard, so all take the same path through a bay (the
 * restitution is the part's); what differs is how they strike. By Hertz, a ball meeting a part stays on it for a time
 * that goes as m^(2/5) / E*^(2/5) (E*, the pair's combined stiffness), and the blow it gives is its momentum. So:
 *
 * - **ivory** is the reference: 1.85 g/cm³, and soft beside the parts (E 17 GPa; 15 GPa against aluminium);
 * - **glass** is a little heavier (2.5 g/cm³, so ×1.35 the blow, +2.6 dB) and much stiffer (E* 38 GPa): its contact is
 *   0.78 of ivory's, so it reaches higher partials: brighter, a little louder;
 * - **brass**, a hollow shell twice an ivory ball's weight (+6 dB), and stiff (E* 46 GPa): contact 0.84 of ivory's.
 */
export type BallKind = 'ivory' | 'glass' | 'brass'
export const BALLS: Record<BallKind, { mass: number; contact: number }> = {
  ivory: { mass: 1, contact: 1 },
  glass: { mass: 1.35, contact: 0.78 },
  brass: { mass: 2, contact: 0.84 },
}

/** Cells per second², down. A slower world than ours: the arcs are there to be watched. */
export const G = 60
/** The balls' radius, in cells. */
export const BALL_R = 0.2
/** The step. */
export const DT = 1 / 2000
/** Below this normal speed a contact is a resting one: no bounce and no sound (a ball rolling on a rail). */
const REST = 0.35
/** Below this a contact is too soft to hear and is not written down. */
const AUDIBLE = 0.6

export type Material = 'bar' | 'string' | 'rail' | 'gate' | 'wood' | 'brass' | 'glass'

export interface Seg {
  ax: number
  ay: number
  bx: number
  by: number
  /** Half its thickness. */
  half: number
  /** Restitution. */
  e: number
  material: Material
  /** Whether its round ends collide. A rail's do not, so a ball runs over the joins and drops off the end. */
  caps: boolean
  /** The sounding part it belongs to, or -1. */
  part: number
  /** Whether it is there at time `t` (a gate's flap). Left out, always. */
  solid?: (t: number) => boolean
}

interface Prepared extends Seg {
  ux: number
  uy: number
  len: number
}

export interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
}

export interface Contact {
  t: number
  ball: number
  /** Index of the segment. */
  seg: number
  part: number
  material: Material
  /** Normal speed going in, cells per second. */
  v: number
  /** Where along the segment, 0 at a to 1 at b. */
  u: number
  x: number
  y: number
}

/** A region a ball passes through (the bore of a pipe): when it went in and came out, and how fast. */
export interface Sensor {
  part: number
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Passage {
  part: number
  ball: number
  tIn: number
  vIn: number
  tOut: number
  vOut: number
}

const GRID = 1

export class World {
  readonly segs: Prepared[]
  private readonly grid = new Map<number, number[]>()
  private readonly inside = new Map<string, { tIn: number; vIn: number }>()

  constructor(
    segs: Seg[],
    readonly sensors: Sensor[] = [],
  ) {
    this.segs = segs.map((s) => {
      const dx = s.bx - s.ax
      const dy = s.by - s.ay
      const len = Math.hypot(dx, dy) || 1e-9
      return { ...s, ux: dx / len, uy: dy / len, len }
    })
    const reach = BALL_R + 0.05
    this.segs.forEach((s, i) => {
      const x0 = Math.floor((Math.min(s.ax, s.bx) - s.half - reach) / GRID)
      const x1 = Math.floor((Math.max(s.ax, s.bx) + s.half + reach) / GRID)
      const y0 = Math.floor((Math.min(s.ay, s.by) - s.half - reach) / GRID)
      const y1 = Math.floor((Math.max(s.ay, s.by) + s.half + reach) / GRID)
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const key = gx * 4096 + gy
          let list = this.grid.get(key)
          if (!list) this.grid.set(key, (list = []))
          list.push(i)
        }
      }
    })
  }

  private near(x: number, y: number): number[] {
    return this.grid.get(Math.floor(x / GRID) * 4096 + Math.floor(y / GRID)) ?? []
  }

  /**
   * One step of `dt` from time `t` for every ball in `balls`, which it moves. Contacts and finished passages are
   * pushed onto the lists given.
   */
  step(t: number, dt: number, balls: Ball[], contacts: Contact[], passages: Passage[]): void {
    for (const b of balls) {
      // Exact under gravity alone.
      b.x += b.vx * dt
      b.y += b.vy * dt + 0.5 * G * dt * dt
      b.vy += G * dt
      for (let pass = 0; pass < 3; pass++) {
        let hit = false
        for (const i of this.near(b.x, b.y)) {
          const s = this.segs[i]
          if (s.solid && !s.solid(t + dt)) continue
          const along = (b.x - s.ax) * s.ux + (b.y - s.ay) * s.uy
          if (!s.caps && (along < 0 || along > s.len)) continue
          const a = Math.max(0, Math.min(s.len, along))
          const qx = s.ax + s.ux * a
          const qy = s.ay + s.uy * a
          let nx = b.x - qx
          let ny = b.y - qy
          const dist = Math.hypot(nx, ny)
          const reach = BALL_R + s.half
          if (dist >= reach) continue
          if (dist > 1e-9) {
            nx /= dist
            ny /= dist
          } else {
            nx = -s.uy
            ny = s.ux
          }
          const pen = reach - dist
          const vn = b.vx * nx + b.vy * ny
          if (vn >= 0) {
            // Already leaving: only put it back outside.
            b.x += nx * pen
            b.y += ny * pen
            continue
          }
          hit = true
          // How long ago it touched, and so where and how fast: wound back along its fall to the moment of contact.
          const back = Math.min(dt, pen / -vn)
          const cx = b.x - b.vx * back
          const cy = b.y - b.vy * back + 0.5 * G * back * back
          let vx = b.vx
          let vy = b.vy - G * back
          const vc = vx * nx + vy * ny
          const resting = -vc < REST
          const e = resting ? 0 : s.e
          if (vc < 0) {
            vx -= (1 + e) * vc * nx
            vy -= (1 + e) * vc * ny
          }
          // Run on from the touch for the rest of the step with the new velocity, and outside the part.
          b.vx = vx
          b.vy = vy + G * back
          b.x = cx + vx * back
          b.y = cy + vy * back + 0.5 * G * back * back
          const d2 = Math.hypot(b.x - qx, b.y - qy)
          if (d2 < reach) {
            b.x += nx * (reach - d2)
            b.y += ny * (reach - d2)
          }
          if (-vc >= AUDIBLE) {
            contacts.push({ t: t + dt - back, ball: b.id, seg: i, part: s.part, material: s.material, v: -vc, u: a / s.len, x: qx, y: qy })
          }
        }
        if (!hit) break
      }
      for (const s of this.sensors) {
        const key = `${s.part}:${b.id}`
        const inNow = b.x >= s.x0 && b.x <= s.x1 && b.y >= s.y0 && b.y <= s.y1
        const was = this.inside.get(key)
        const speed = Math.hypot(b.vx, b.vy)
        if (inNow && !was) this.inside.set(key, { tIn: t + dt, vIn: speed })
        else if (!inNow && was) {
          this.inside.delete(key)
          passages.push({ part: s.part, ball: b.id, tIn: was.tIn, vIn: was.vIn, tOut: t + dt, vOut: speed })
        }
      }
    }
    // Ball on ball: rare (the bays keep them a beat apart), but a collision is a collision.
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]
        const c = balls[j]
        const dx = c.x - a.x
        const dy = c.y - a.y
        const d = Math.hypot(dx, dy)
        if (d >= 2 * BALL_R || d < 1e-9) continue
        const nx = dx / d
        const ny = dy / d
        const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny
        const push = (2 * BALL_R - d) / 2
        a.x -= nx * push
        a.y -= ny * push
        c.x += nx * push
        c.y += ny * push
        if (rel >= 0) continue
        const j2 = (-(1 + 0.9) * rel) / 2
        a.vx -= j2 * nx
        a.vy -= j2 * ny
        c.vx += j2 * nx
        c.vy += j2 * ny
        if (-rel >= AUDIBLE) contacts.push({ t: t + dt, ball: a.id, seg: -1, part: -1, material: 'glass', v: -rel, u: 0.5, x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 })
      }
    }
  }

  /** Forget a ball that has left the simulation, so it does not finish a passage it never ended. */
  forget(id: number): void {
    for (const key of [...this.inside.keys()]) if (key.endsWith(`:${id}`)) this.inside.delete(key)
  }
}
