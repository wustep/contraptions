import type { Framing } from '../../../registry'
import { smooth, type Pt } from './kit'
import { LAMP } from './layout'
import { PERIOD, wrap } from './music'
import { WIDE, WIDE_CELLS, auroraLight } from './room'
import { where } from './route'
import { AT_TOP } from './screw'
import { BOARD } from './rail'
import { ALIGHT } from './wheel'
import { CARDS, LAST_GONE } from './titles'
import { CATCH, INTO_SCREW, TROUGH_C } from './trough'
import { TROUGH_R } from './layout'

/**
 * The camera. At the seam it is all the way out: the whole window, the machine small in it, the night behind. As
 * the first chords come round it goes down to the cups and follows the ball down them; it stands back from the
 * trough to see the whole swing, and widens as the swing does; it follows the ball over the lip and up the screw,
 * and along the rail under the window's head; it holds on the lamp while the ball goes round it; and as the last
 * note is held it draws back to the whole window again.
 *
 * Where it looks is a blend of a few aims, each with a weight that rises and falls smoothly in show time: the whole
 * window, the ball (followed softly: its way smoothed over a second or so, and a little ahead of it), the trough,
 * the lamp. How far out it is, in cells top to bottom of a 16:9 frame, is keyed and eased in even steps of scale.
 */

/** The ball's way, smoothed round the circle: what the camera follows, so it glides through the hops. */
const STEP = 0.05
const N = Math.round(PERIOD / STEP)
const RAW: Pt[] = Array.from({ length: N }, (_, i) => where(i * STEP).p)
function gauss(sd: number): Pt[] {
  const half = Math.ceil((3 * sd) / STEP)
  const kern = Array.from({ length: 2 * half + 1 }, (_, j) => Math.exp(-0.5 * (((j - half) * STEP) / sd) ** 2))
  const total = kern.reduce((a, b) => a + b, 0)
  return RAW.map((_, i) => {
    let x = 0
    let y = 0
    for (let j = -half; j <= half; j++) {
      const q = RAW[(i + j + N) % N]
      x += q[0] * kern[j + half]
      y += q[1] * kern[j + half]
    }
    return [x / total, y / total] as Pt
  })
}
const SOFT = gauss(0.9)
const read = (arr: Pt[], t: number): Pt => {
  const x = wrap(t) / STEP
  const i = Math.floor(x)
  const f = x - i
  const a = arr[i % N]
  const b = arr[(i + 1) % N]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}
/** The ball, followed: smoothed, and a little ahead of where it is going. */
function follow(t: number): Pt {
  const a = read(SOFT, t)
  const b = read(SOFT, t + 0.7)
  return [a[0] + (b[0] - a[0]) * 0.8, a[1] + (b[1] - a[1]) * 0.8]
}

/**
 * The aims. On the trough the camera looks up a little into the sky as the aurora comes, and leans a little after
 * the ball as it swings (its swing, smoothed over a bar, and a fifth of it); on the lamp it drifts slowly in.
 */
const TROUGH_BASE: Pt = [TROUGH_C[0] + 0.6, TROUGH_C[1] + TROUGH_R - 1.35]
const SWING = gauss(2.2)
function troughAim(t: number): Pt {
  const s = read(SWING, t)
  return [TROUGH_BASE[0] + 0.2 * (s[0] - TROUGH_BASE[0]), TROUGH_BASE[1] - 1.1 * auroraLight(t)]
}
function lampAim(t: number): Pt {
  const u = wrap(t)
  const f = smooth(u, BOARD, ALIGHT)
  // While the credits are up, it looks up over the lamp, so the wheel sits under the words.
  const words = smooth(u, CARDS[1].at - 3, CARDS[1].at) * (1 - smooth(u, LAST_GONE - 1, LAST_GONE + 2))
  return [LAMP[0] + 0.25 - 0.2 * f, LAMP[1] + 0.2 - 0.15 * f - 1.05 * words]
}

/** When the camera starts to draw back to the whole window: as the coda's held note begins, the ball still on the wheel. */
const PULL_OUT = ALIGHT - 3.5

/** Each aim's weight at `u` (in [0, PERIOD)): rising and falling smoothly; they need not sum to one. */
function weights(u: number): { wide: number; ball: number; trough: number; lamp: number } {
  const wide = 1 - smooth(u, 1.2, 7.5) + smooth(u, PULL_OUT, PERIOD - 0.3)
  const trough = smooth(u, CATCH - 2.5, CATCH + 2) * (1 - smooth(u, INTO_SCREW - 3.2, INTO_SCREW + 0.8))
  const lamp = smooth(u, BOARD - 3, BOARD + 1.5) * (1 - smooth(u, PULL_OUT, PERIOD - 0.3))
  const ball = Math.max(0, 1 - wide - trough - lamp)
  return { wide, ball, trough, lamp }
}

/** Cells top to bottom, keyed. */
const KEYS: [number, number][] = [
  [0, WIDE_CELLS],
  [1.2, WIDE_CELLS],
  [7.8, 5.8],
  [CATCH - 3, 5.8],
  [CATCH + 3, 7.2],
  [CATCH + 30, 7.8],
  [INTO_SCREW - 6, 8.8],
  [INTO_SCREW + 2, 7.2],
  [AT_TOP - 4, 7],
  [AT_TOP + 3, 6.6],
  [BOARD - 3, 6.4],
  [BOARD + 2, 5.9],
  [CARDS[1].at - 3, 5.5],
  [CARDS[1].at, 6.6],
  [PULL_OUT, 6.6],
  [PERIOD - 0.3, WIDE_CELLS],
  [PERIOD, WIDE_CELLS],
]

export function cellsAt(t: number): number {
  const u = wrap(t)
  let i = 0
  while (i + 2 < KEYS.length && KEYS[i + 1][0] <= u) i++
  const [t0, c0] = KEYS[i]
  const [t1, c1] = KEYS[i + 1]
  const f = smooth(u, t0, t1)
  return Math.exp(Math.log(c0) + (Math.log(c1) - Math.log(c0)) * f)
}

export function camera(t: number): Framing {
  const u = wrap(t)
  const w = weights(u)
  const b = follow(u)
  const tr = troughAim(u)
  const la = lampAim(u)
  const total = w.wide + w.ball + w.trough + w.lamp
  const x = (w.wide * WIDE[0] + w.ball * b[0] + w.trough * tr[0] + w.lamp * la[0]) / total
  const y = (w.wide * WIDE[1] + w.ball * b[1] + w.trough * tr[1] + w.lamp * la[1]) / total
  return { x, y, cells: cellsAt(u) }
}
