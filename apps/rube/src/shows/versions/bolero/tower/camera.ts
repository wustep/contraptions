import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { BAR, COLLAPSE, EMAJOR, LAST, RETURN, STATEMENTS, bar } from './music'
import { DRUM, FOOT, TOWER, lapOf, statementsOn } from './plan'
import { ROOF } from './finale'
import { CREDITS_AT } from './credits'

/**
 * The camera is authored, one take from the drum to the night. Keys are framings (a point held, or the ball followed,
 * or a mix, and how many cells a 16:9 frame shows top to bottom); between keys every channel moves on a monotone
 * cubic, so a move that goes on the same way through a key carries its speed through it, and one that turns comes
 * to rest there (after the house's authored cameras).
 *
 * The rhythm of it follows the tune's: each storey's first time round (a new voice) the frame pushes in and travels
 * with the ball along its rails, the keys lighting as they are played; its second time round (the engine let in) it
 * holds the storey whole, and on the lower rail pulls back to the tower so far, then rides up with the ball to the
 * next storey as it unfolds. In E major the whole tower in its gold; the roof's apex for C's return; the tower whole
 * for the collapse; down to the drum for the ball's landing, and back a little for the credits.
 */

interface Key {
  t: number
  cells: number
  /** A point to hold, in cells. */
  hold?: Pt
  /** How much of the hold: 0 follows the ball, 1 holds. Defaults to 1 with a hold, 0 without. */
  w?: number
  /** Up and down, where it differs. */
  wy?: number
}

const mid = (n: number): number => (TOWER[n].top + TOWER[n].floor) / 2
/** The storey whole, a little of the storey over it and the one under it. */
const whole = (n: number): number => Math.max(TOWER[n].w * 0.84, TOWER[n].floor - TOWER[n].top + 1.6)
/** How much a frame of the storey whole leans to follow the ball along it (so it never leaves a closer frame). */
const LEAN = 0.12
/** Close on the ball along a rail: the storey's height and some. */
const close = (n: number): number => Math.max(3.4, Math.min(5.8, (TOWER[n].floor - TOWER[n].top) * 1.45))
/** The tower so far, from the drum to storey n's top, and the bud over it. */
function sofar(n: number): { hold: Pt; cells: number } {
  const top = TOWER[n].top - 1.2
  const bottom = 0.6
  return { hold: [0, (top + bottom) / 2], cells: Math.max(bottom - top, TOWER[n].w * 0.6) }
}

function keys(): Key[] {
  const out: Key[] = []
  // The drum, close, with the ball waiting in the lift's cup; then up with it to the first storey as it unfolds.
  const drum: Pt = [(FOOT[0] + 0.9) / 2, -0.7]
  out.push({ t: 0, cells: 3.3, hold: drum })
  out.push({ t: bar(2, 2), cells: 3.3, hold: drum })
  for (let k = 0; k < STATEMENTS.length; k++) {
    const S = STATEMENTS[k].t
    const { storey: n, round } = lapOf(k)
    const ks = statementsOn(n)
    const single = ks.length === 1
    const at = (b: number) => S + b * BAR
    const hold: Pt = [0, mid(n)]
    if (round === 0) {
      // The ball comes onto the new storey at its upper left: the storey whole.
      out.push({ t: S - 0.3, cells: whole(n), hold, w: 1 - LEAN })
      // In on it, and along the upper rail with it; round the U-turn; back along the lower rail.
      out.push({ t: at(3), cells: close(n), hold: [0, mid(n) - 0.15], w: 0, wy: 0.9 })
      if (k >= 8) {
        // From the ninth statement the storeys under it with its theme play along: on the lower rail, back to see
        // them, three storeys (five for the tuttis) all playing the tune at once.
        const below = Math.max(0, n - (single ? 4 : 2))
        const top = TOWER[n].top - 0.3
        const bottom = TOWER[below].floor + 0.3
        out.push({ t: at(8.2), cells: close(n) * 1.1, hold: [0, mid(n) - 0.1], w: 0, wy: 0.9 })
        out.push({ t: at(11), cells: bottom - top, hold: [0, (top + bottom) / 2], w: 0.75 })
        out.push({ t: at(13.4), cells: bottom - top, hold: [0, (top + bottom) / 2], w: 0.75 })
      } else {
        out.push({ t: at(14.5), cells: close(n) * 1.05, hold: [0, mid(n) + 0.1], w: 0, wy: 0.9 })
      }
      if (!single) {
        // Out to the storey whole for the lift up to the upper rail again.
        out.push({ t: at(16.6), cells: whole(n), hold, w: 1 - LEAN })
      }
    } else {
      // The engine is let in as the ball starts round again: the storey whole.
      out.push({ t: S + 0.6, cells: whole(n), hold, w: 1 - LEAN })
      out.push({ t: at(6), cells: whole(n) * 0.92, hold: [0, mid(n) - 0.1], w: 0.55, wy: 1 })
      // On the lower rail, back to the tower so far.
      const far = sofar(n)
      out.push({ t: at(10), cells: whole(n), hold, w: 1 - LEAN })
      out.push({ t: at(14.2), cells: far.cells, hold: far.hold })
      out.push({ t: at(15.6), cells: far.cells, hold: far.hold })
    }
    // The ride to the next storey: up with the ball as it unfolds.
    if (k + 1 < STATEMENTS.length && lapOf(k + 1).storey !== n) {
      const m = lapOf(k + 1).storey
      out.push({ t: at(17.2), cells: (whole(n) + whole(m)) / 2, hold: [0, (mid(n) + mid(m)) / 2 - 0.4], w: 1 - LEAN })
    }
    if (single && k < STATEMENTS.length - 1) out.push({ t: at(16.4), cells: whole(n), hold, w: 1 - LEAN })
  }
  // E major: the ball rides up to the roof and climbs its stair. The whole tower in its gold, then the roof's apex.
  const top = TOWER[TOWER.length - 1]
  const all: Pt = [0, (ROOF.apex - 1.4 + 0.6) / 2]
  const allCells = 0.6 - (ROOF.apex - 1.4)
  out.push({ t: EMAJOR - 0.2, cells: whole(9), hold: [0, mid(9) - 0.4], w: 1 - LEAN })
  out.push({ t: bar(328), cells: whole(9) * 1.02, hold: [0, top.top - 0.2], w: 1 - LEAN })
  out.push({ t: bar(330), cells: allCells, hold: all })
  out.push({ t: bar(331.5), cells: allCells, hold: all })
  out.push({ t: bar(333.3), cells: 13, hold: [0, ROOF.apex + 2.6], w: 0.5, wy: 0.6 })
  out.push({ t: RETURN - 0.3, cells: 8.6, hold: [0, ROOF.apex + 1.2] })
  // C again: the ball in the finial, the bell struck; the tower rocking in a frame of its top.
  out.push({ t: bar(336.5), cells: 9.6, hold: [0, ROOF.apex + 1.9] })
  // Back to the whole tower for the collapse.
  out.push({ t: COLLAPSE - 0.15, cells: allCells + 2, hold: [0, all[1] + 1] })
  out.push({ t: COLLAPSE + 1.2, cells: allCells + 3, hold: [0, all[1] + 3.5] })
  // Down to the drum as the ball lands on it, and back a little into the night for the credits.
  out.push({ t: LAST + 0.1, cells: 16, hold: [0, -5.5] })
  out.push({ t: LAST + 2.8, cells: 6.2, hold: [0, DRUM.head - 1.5] })
  out.push({ t: CREDITS_AT + 1, cells: 8.2, hold: [0, DRUM.head - 2.3] })
  out.push({ t: CREDITS_AT + 14, cells: 9.4, hold: [0, DRUM.head - 2.6] })
  return out.sort((a, b) => a.t - b.t)
}

/** One channel across the keys: monotone cubic (Fritsch-Carlson) through each key's value. */
function channel(ts: number[], vs: number[]): (t: number) => number {
  const n = ts.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / Math.max(1e-6, ts[i + 1] - ts[i]))
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = ts[i] - ts[i - 1]
    const h1 = ts[i + 1] - ts[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t: number) => {
    if (t <= ts[0]) return vs[0]
    if (t >= ts[n - 1]) return vs[n - 1]
    let i = 0
    let hi = n - 1
    while (hi - i > 1) {
      const c = (i + hi) >> 1
      if (ts[c] <= t) i = c
      else hi = c
    }
    const h = ts[i + 1] - ts[i]
    const u = (t - ts[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/** A camera over `where` (the ball in the world) from the keys. */
export function makeCamera(where: (t: number) => Pt, duration: number): (t: number) => Framing {
  const ks = keys()
  const ts = ks.map((k) => k.t)
  const cells = channel(ts, ks.map((k) => Math.log(k.cells)))
  const wx = channel(ts, ks.map((k) => k.w ?? (k.hold ? 1 : 0)))
  const wy = channel(ts, ks.map((k) => k.wy ?? k.w ?? (k.hold ? 1 : 0)))
  const hx = channel(ts, ks.map((k, i) => (k.hold ?? ks[i + 1]?.hold ?? ks[i - 1]?.hold ?? [0, 0])[0]))
  const hy = channel(ts, ks.map((k, i) => (k.hold ?? ks[i + 1]?.hold ?? ks[i - 1]?.hold ?? [0, 0])[1]))
  // The follow: the ball's place averaged over a short window leaning a little ahead.
  const follow = (t: number): Pt => {
    let x = 0
    let y = 0
    let sum = 0
    for (let j = -12; j <= 16; j++) {
      const w = 1 - Math.abs(j - 2) / 15
      const [px, py] = where(Math.max(0, Math.min(duration, t + j * 0.06)))
      x += px * w
      y += py * w
      sum += w
    }
    return [x / sum, y / sum]
  }
  return (t: number): Framing => {
    const a = Math.max(0, Math.min(1, wx(t)))
    const b = Math.max(0, Math.min(1, wy(t)))
    const h: Pt = [hx(t), hy(t)]
    const f = a >= 1 && b >= 1 ? h : follow(t)
    return { x: f[0] + (h[0] - f[0]) * a, y: f[1] + (h[1] - f[1]) * b, cells: Math.exp(cells(t)) }
  }
}
