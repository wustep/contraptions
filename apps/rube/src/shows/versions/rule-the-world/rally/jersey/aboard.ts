import { sway } from '../depth'
import { hash, smooth } from '../kit'
import { ctxOf, type Pen } from '../pen'
import { WIN_C, WIN_R, WIN_X } from './geo'
import { bag, box, disc, fill, oval } from './ink'

/**
 * Who is on the airliner: the night flight to Tokyo, waiting at its stair with its cabin lit. In its round windows the
 * passengers already in their seats, dark against the lamps: a hat, a head of hair, settling, turning to look out at
 * the fire across the field, one of them behind a newspaper turning its pages; and down the aisle behind them the
 * stewardess, coming aft past the windows, stopping at a row, and going on to wait by the door for him.
 * The first window aft of the door is left empty: it is his, and the way into Tokyo.
 *
 * They are seen only through the glass, so all of it is drawn inside the windows' circles; nothing here gives light.
 */

const HEAD = '#2E251C'
const PAPER = '#CBBF9E'
/** The windows the passengers are seen in: every one aft of his, to short of the nose. */
const SEATS = 7
const at = (i: number): number => WIN_X + 1.5 * (i + 1)

/**
 * When the stewardess comes down the aisle, and the windows (by index) she stops at on her way aft: the last is by the
 * door, where she waits for him.
 */
const AISLE: [number, number] = [166, 176.8]
const STOPS = [2, 0]

/** Where she is along the aisle at `t`: walking aft from beyond the windows, a pause at a row, then on to the door. */
function stewardess(t: number): number | null {
  if (t < AISLE[0] || t > AISLE[1]) return null
  const v = 1.3
  const pause = 1.4
  let x = at(6) + 0.8
  let left = t - AISLE[0]
  for (const s of STOPS) {
    const stopX = at(s) - 0.2
    const walk = (x - stopX) / v
    if (left < walk) return x - left * v
    left -= walk
    x = stopX
    if (left < pause) return x
    left -= pause
  }
  return x
}

export function drawAboard(pen: Pen, t: number, nose: number): void {
  const cy = WIN_C[1]
  const r = WIN_R
  const heads = bag()
  const paper = bag()
  for (let i = 0; i < SEATS; i++) {
    const x = at(i)
    if (x > nose - 4) break
    // Most seats taken; a couple of windows empty.
    if (i > 1 && hash(i, 31, 7) < 0.22) continue
    const look = Math.max(0, Math.sin((t + 9 * hash(i, 32, 7)) * (0.55 + 0.25 * hash(i, 33, 7))))
    const peer = smooth(look, 0.55, 0.95)
    const hx = x + (hash(i, 34, 7) - 0.5) * 0.18 + 0.035 * sway(t, i * 1.7, 5 + 2 * hash(i, 35, 7)) + 0.06 * peer
    const hy = cy + 0.07 - 0.03 * peer + 0.012 * sway(t, i * 2.3, 3.1)
    // Shoulders, the head, and a hat or a head of hair.
    oval(heads, hx - 0.02, hy + 0.27, 0.2, 0.12)
    disc(heads, hx, hy, 0.085)
    const kind = Math.floor(hash(i, 36, 7) * 3)
    if (kind === 0) {
      oval(heads, hx, hy - 0.07, 0.13, 0.025)
      box(heads, hx - 0.07, hy - 0.15, hx + 0.07, hy - 0.06)
    } else if (kind === 1) disc(heads, hx + 0.05, hy - 0.03, 0.05)
    // One reads the evening paper, turning a page now and then.
    if (i === 2) {
      const turn = Math.abs(Math.cos(Math.PI * smooth((t % 7.3) / 7.3, 0.85, 1)))
      const w = 0.16 * (0.35 + 0.65 * turn)
      box(paper, hx - 0.05 - w, hy - 0.06 + 0.02 * sway(t, 9, 2.4), hx - 0.05 + w * 0.3, hy + 0.2)
    }
  }
  // The stewardess, standing in the aisle behind the seats, taller than them: her cap, her shoulders.
  const sx = stewardess(t)
  if (sx !== null) {
    const bob = 0.012 * Math.abs(Math.sin(t * 5.2))
    disc(heads, sx, cy - 0.12 - bob, 0.08)
    oval(heads, sx, cy - 0.2 - bob, 0.07, 0.03)
    oval(heads, sx, cy + 0.13 - bob, 0.17, 0.16)
  }
  // Only through the glass.
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.beginPath()
  for (let i = 0; i < SEATS; i++) {
    const x = at(i)
    if (x > nose - 4) break
    ctx.moveTo((x + r) * k, cy * k)
    ctx.arc(x * k, cy * k, r * k, 0, Math.PI * 2)
  }
  ctx.clip()
  fill(pen, heads, HEAD, 0.82)
  fill(pen, paper, PAPER, 0.85)
  ctx.restore()
}
