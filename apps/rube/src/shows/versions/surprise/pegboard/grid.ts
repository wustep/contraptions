import { type Brush, hash, hex, mix, ring, rgb, smooth } from './brush'
import { PEGS, PEG_R } from './geo'
import { INK, PAPER } from './look'
import { SHOTS, reach } from './score'

/**
 * The board: the pegs, still, and what a burst does to them. A pellet lands in a gap and the colour goes out through
 * the pegs round it, peg by peg, quick at first and slower as it goes, further in some directions than others, and
 * thinning out at its edge. Each peg it reaches takes the colour, swells a little, and is pushed outward; it swings back
 * through its place and settles there, and the colour drains from the edge of the burst inward. A peg is a peg again,
 * black, in its place, a few seconds after: as if nothing had happened.
 */

/** How long a peg takes its colour, and gives it up. */
const RISE = 0.07
const FADE = 0.8
/** How a pushed peg swings: its frequency, Hz, and how fast it dies away, per second. */
const SWING = 1.45
const DAMP = 3.3
/** After this long a swing is under a hundredth of its push. */
const RINGS = 1.5

interface Touch {
  peg: number
  /** When the burst reaches it. */
  ta: number
  /** How much of the colour it takes, 0 to 1. */
  w: number
  /** How long it keeps it before it drains. */
  hold: number
  /** How far it is pushed, cells, and which way. */
  amp: number
  ux: number
  uy: number
  /** How far toward the colour's lighter shade. */
  shade: number
}

export interface Burst {
  at: number
  x: number
  y: number
  color: string
  /** Its lighter shade. */
  light: string
  s: number
  /** The last moment it does anything. */
  until: number
  touches: Touch[]
}

/** A burst's reach in the direction `a`: lobed, so no two are the same shape and none is a circle. */
function lobes(seed: number): (a: number) => number {
  const ph = [hash(seed, 1, 7), hash(seed, 2, 7), hash(seed, 3, 7)].map((h) => h * Math.PI * 2)
  const amp = [0.15 + 0.1 * hash(seed, 4, 7), 0.1 + 0.08 * hash(seed, 5, 7), 0.06]
  return (a) => 1 + amp[0] * Math.sin(2 * a + ph[0]) + amp[1] * Math.sin(3 * a + ph[1]) + amp[2] * Math.sin(5 * a + ph[2])
}

function burstOf(i: number): Burst {
  const shot = SHOTS[i]
  const [x, y] = shot.target
  const s = shot.s
  const R = reach(s)
  const shape = lobes(i + 11)
  // The front slows as it goes: it is at 1 - e^(-u/tau) of its reach after u seconds.
  const tau = 0.32 + 0.3 * s
  const touches: Touch[] = []
  let until = shot.at
  PEGS.forEach(([px, py], peg) => {
    const dx = px - x
    const dy = py - y
    const d = Math.hypot(dx, dy)
    const a = Math.atan2(dy, dx)
    const r = R * shape(a)
    const f = d / r
    if (f >= 0.97) return
    const ta = shot.at - tau * Math.log(1 - f)
    // Loose at the edge: past a third of its reach a peg takes the colour only by chance, less often the further out it
    // is, and less of it.
    const chance = 1 - smooth(f, 0.35, 0.97)
    const w = hash(peg, i, 3) < chance ? 0.6 + 0.4 * (1 - smooth(f, 0.25, 0.95)) * hash(peg, i, 4) ** 0.3 : 0
    // A peg keeps the colour only a moment after the front has passed it, a little longer the further out: so the burst
    // is a ring going out, the board composed again behind it, and the ring thins and goes at its edge.
    const hold = 0.3 + (0.3 + 0.5 * s) * f + 0.35 * hash(peg, i, 5)
    // Not all one colour: some pegs take a lighter shade of it.
    const shade = 0.55 * hash(peg, i, 6) ** 2
    // Pushed hardest near the middle, falling off with distance, and nothing at the edge of its reach.
    const amp = (0.06 + 0.26 * s) / (1 + (d / (1.4 + 1.2 * s)) ** 2) * (1 - smooth(f, 0.6, 0.97))
    // Out from the middle, give or take a little.
    const turn = (hash(peg, i, 9) - 0.5) * 0.4
    const ux = Math.cos(a + turn)
    const uy = Math.sin(a + turn)
    touches.push({ peg, ta, w, hold, amp, ux, uy, shade })
    until = Math.max(until, ta + Math.max(w > 0 ? hold + FADE : 0, RINGS))
  })
  return { at: shot.at, x, y, color: shot.color, light: mix(shot.color, PAPER, 0.42), s, until, touches }
}

export const BURSTS: readonly Burst[] = SHOTS.map((_, i) => burstOf(i))

/** What a peg is doing at a moment: how far it is pushed, how fast, and how much colour it has, of what. */
interface PegNow {
  dx: number
  dy: number
  vx: number
  vy: number
  /** How much colour, 0 to 1. */
  c: number
  r: number
  g: number
  b: number
  /** Colour weights summed, for the mix. */
  sum: number
}

const now: PegNow[] = PEGS.map(() => ({ dx: 0, dy: 0, vx: 0, vy: 0, c: 0, r: 0, g: 0, b: 0, sum: 0 }))
const touched = new Set<number>()

/** The derivative of `ring`, per second, for how fast a peg is moving. */
function ringV(u: number): number {
  const h = 1e-3
  return (ring(u + h, SWING, DAMP) - ring(u - h, SWING, DAMP)) / (2 * h)
}

/** Every burst that is doing anything at `t`. */
export function active(t: number): Burst[] {
  return BURSTS.filter((b) => t >= b.at - 0.001 && t <= b.until)
}

/** Where the pegs are at `t`, and their colour: `now` for every peg a burst is touching (`touched`), at rest for the rest. */
function settle(t: number): void {
  for (const i of touched) {
    const n = now[i]
    n.dx = n.dy = n.vx = n.vy = n.c = n.r = n.g = n.b = n.sum = 0
  }
  touched.clear()
  for (const burst of active(t)) {
    const [cr, cg, cb] = rgb(burst.color)
    const [lr, lg, lb] = rgb(burst.light)
    for (const tc of burst.touches) {
      const u = t - tc.ta
      if (u <= 0) continue
      const n = now[tc.peg]
      touched.add(tc.peg)
      if (u < RINGS) {
        const push = tc.amp * ring(u, SWING, DAMP)
        const speed = tc.amp * ringV(u)
        n.dx += push * tc.ux
        n.dy += push * tc.uy
        n.vx += speed * tc.ux
        n.vy += speed * tc.uy
      }
      if (tc.w > 0) {
        const c = tc.w * smooth(u, 0, RISE) * (1 - smooth(u, tc.hold, tc.hold + FADE))
        if (c > 0) {
          // More than one burst on a peg: the colour is how much of each, and the amount is all of them together.
          n.c = 1 - (1 - n.c) * (1 - c)
          n.r += (cr + (lr - cr) * tc.shade) * c
          n.g += (cg + (lg - cg) * tc.shade) * c
          n.b += (cb + (lb - cb) * tc.shade) * c
          n.sum += c
        }
      }
    }
  }
}

/** A peg at `t`: how far it is from its place, cells, and how much colour it has, 0 to 1 (for the checks). */
export function pegAt(i: number, t: number): { dx: number; dy: number; c: number; color: string | null } {
  settle(t)
  if (!touched.has(i)) return { dx: 0, dy: 0, c: 0, color: null }
  const n = now[i]
  return { dx: n.dx, dy: n.dy, c: n.c, color: n.sum > 0 ? hex(n.r / n.sum, n.g / n.sum, n.b / n.sum) : null }
}

/** The pegs at `t`. */
export function drawPegs(b: Brush, t: number): void {
  settle(t)
  const { g } = b
  // The still pegs, all in one path.
  g.beginPath()
  PEGS.forEach(([x, y], i) => {
    if (touched.has(i)) return
    g.moveTo(x + PEG_R, y)
    g.arc(x, y, PEG_R, 0, Math.PI * 2)
  })
  g.fillStyle = INK
  g.fill()
  // The pegs a burst has reached: pushed, swelling with their colour, drawn a little longer along the way they move.
  for (const i of touched) {
    const n = now[i]
    const [x, y] = PEGS[i]
    const color = n.sum > 0 ? mix(INK, hex(n.r / n.sum, n.g / n.sum, n.b / n.sum), Math.min(1, n.c * 1.15)) : INK
    const r = PEG_R * (1 + 0.85 * n.c)
    const v = Math.hypot(n.vx, n.vy)
    const stretch = Math.min(0.32, v * 0.11)
    g.beginPath()
    if (stretch > 0.01) {
      g.ellipse(x + n.dx, y + n.dy, r * (1 + stretch), r / (1 + 0.6 * stretch), Math.atan2(n.vy, n.vx), 0, Math.PI * 2)
    } else {
      g.arc(x + n.dx, y + n.dy, r, 0, Math.PI * 2)
    }
    g.fillStyle = color
    g.fill()
  }
}
