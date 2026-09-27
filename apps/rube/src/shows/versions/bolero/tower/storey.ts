import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { mixHex, type PieceCtx } from '../../../../parts'
import { STATEMENTS } from './music'
import { LOOPS, R, TOWER, UNFOLD, lapOf, onLoop, sOf, statementsOn, unfoldsAt, type Key, type Storey } from './plan'
import { GOLD, INK, IRON, PAPER, STOREY_COLORS, clamp, deep, easeOut, pale, ring, smooth } from './look'
import { where } from './ball'
import { gilt } from './gold'

/**
 * A storey: its frame, its two rails of keys with a chime hung under every key, the U-turn at the right end, and
 * (in `engines.ts`) the engine in its roof. Before its turn it is folded into the bud at the top of the mast; in the
 * two bars before its first statement it unfolds, a key a stroke (`open`).
 *
 * A key is played when the ball's middle crosses its left edge (its right edge, on the lower rail): it gives under
 * the ball, and its chime swings. The first time round, each key takes its colour as it is played. From the ninth
 * statement on, the storeys under the ball that have its theme play along with it, a key at a time, as the tune is
 * doubled in more and more of the orchestra (`ALONG`).
 */

/** The storeys that play along with each statement: the doublings grow as the orchestra does. */
export const ALONG: number[][] = STATEMENTS.map((_, k) => {
  if (k < 8) return []
  if (k < 12) return [k < 10 ? 0 : 1]
  if (k < 16) return k < 14 ? [0, 2] : [1, 3]
  return k === 16 ? [0, 2, 4, 6] : [1, 3, 5, 7]
})

/** Every time each storey's keys are played: the ball's own statements, then any it plays along with. */
interface Played {
  own: number[][]
  along: number[][]
}
const PLAYED: Played[] = TOWER.map((st) => {
  const loop = LOOPS[st.n]
  const own = loop.keys.map((key) => statementsOn(st.n).map((k) => sOf(k, key.q)))
  const along = loop.keys.map((key) => STATEMENTS.flatMap((_, k) => (ALONG[k].includes(st.n) ? [sOf(k, key.q)] : [])))
  return { own, along }
})

/** The last of `times` at or before `t`, and how long ago (Infinity when none yet). */
function since(times: number[], t: number): number {
  let best = Infinity
  for (const a of times) if (a <= t && t - a < best) best = t - a
  return best
}

/** How far a storey has unfolded, 0 (folded into the bud) to 1. */
export const openOf = (n: number, t: number): number => clamp((t - unfoldsAt(n)) / UNFOLD)

/** The chime under a key: how long, for how low its note is. */
function chime(n: number, key: Key): number {
  const loop = LOOPS[n]
  const f = (loop.high - key.midi) / Math.max(1, loop.high - loop.low)
  return 0.1 + 0.24 * f
}
/** A key's depth, under the rail's surface. */
const KEY = 0.045

/** A point on the rail's surface (under the ball's middle) at arc length `s`, and the rail's slope there. */
function railAt(st: Storey, s: number): { x: number; y: number; a: number } {
  const at = onLoop(st, LOOPS[st.n], s)
  return { x: at.p[0], y: at.p[1] + R, a: at.angle }
}

export function drawStorey(p: p5, n: number, c: PieceCtx, t: number): void {
  const st = TOWER[n]
  const open = openOf(n, t)
  if (open <= 0) return
  const { k, weight } = c
  const color = STOREY_COLORS[n]
  const loop = LOOPS[n]
  const played = PLAYED[n]
  const here = where(t)
  const ours = here.phase === 'lap' && lapOf(here.k).storey === n
  const gold = gilt(t)

  // The unfold, in overlapping steps over its two bars: the floor swings down, the posts stand, the rails run out,
  // the keys flip up in the order they will be played, the U-turn closes.
  const floorOpen = easeOut(smooth(open, 0, 0.32))
  const posts = easeOut(smooth(open, 0.26, 0.5))
  const rails = smooth(open, 0.38, 0.62)
  const keysFrom = 0.5
  const keysTo = 0.96

  const floorFill = deep(color, 0.35)
  // The floor, in two halves hinged at the mast.
  for (const side of [-1, 1]) {
    p.push()
    p.translate(0, st.floor * k)
    p.rotate(-side * (Math.PI / 2) * (1 - floorOpen))
    solid(p, INK, weight, floorFill)
    p.rectMode(p.CORNER)
    p.rect(side < 0 ? -(st.w / 2) * k : 0, -0.06 * k, (st.w / 2) * k, 0.12 * k, 0.03 * k)
    p.pop()
  }
  if (posts <= 0) return

  // The posts at the ends, slanting out to the storey over it (or standing straight at the top).
  const next = TOWER[n + 1]
  const topHalf = next ? next.w / 2 : st.w / 2
  outline(p, INK, weight * 1.4)
  for (const side of [-1, 1]) {
    const x0 = side * st.w / 2
    const x1 = side * topHalf
    const y1 = st.floor + (st.top - st.floor) * posts
    const x = x0 + (x1 - x0) * posts
    p.stroke(INK)
    p.line(x0 * k, st.floor * k, x * k, y1 * k)
  }
  // Its own ceiling beam, until the storey over it has unfolded and its floor is the ceiling.
  const over = next ? openOf(n + 1, t) : 0
  if (over < 0.3) {
    solid(p, INK, weight, floorFill)
    p.rectMode(p.CENTER)
    p.rect(0, st.top * k, 2 * (st.w / 2 + (topHalf - st.w / 2)) * k * posts, 0.1 * k, 0.03 * k)
  }
  if (rails <= 0) return

  // Hangers: the rails hang from the ceiling at four points.
  outline(p, INK, weight * 0.45)
  p.stroke(deep(IRON, 0.1))
  for (const f of [-0.36, -0.14, 0.14, 0.36]) {
    const x = f * st.w
    if (Math.abs(x) > (st.w / 2) * rails) continue
    const lowY = st.lower.left + (st.lower.right - st.lower.left) * ((x - st.xa) / (st.xb - st.xa)) + R + KEY
    p.line(x * k, st.top * k, x * k, lowY * k)
  }

  // The U-turn: a trough the ball runs round inside, from the upper rail's end to the lower's.
  const turnOpen = smooth(open, 0.55, 0.8)
  if (turnOpen > 0) {
    const { x, y, r } = st.turn
    const rr = (r + R + 0.02) * k
    p.push()
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.globalAlpha *= turnOpen
    p.noStroke()
    p.fill(pale(color, 0.45))
    p.arc(x * k, y * k, (rr + 0.06 * k) * 2, (rr + 0.06 * k) * 2, -Math.PI / 2, Math.PI / 2, p.PIE)
    p.fill(PAPER)
    p.arc(x * k, y * k, rr * 2, rr * 2, -Math.PI / 2, Math.PI / 2, p.PIE)
    outline(p, INK, weight * 0.9)
    p.arc(x * k, y * k, rr * 2, rr * 2, -Math.PI / 2, Math.PI / 2)
    outline(p, INK, weight * 0.6)
    p.arc(x * k, y * k, (rr + 0.06 * k) * 2, (rr + 0.06 * k) * 2, -Math.PI / 2, Math.PI / 2)
    p.pop()
  }

  // The keys and their chimes, flipping up in the order they will be played.
  const N = loop.keys.length
  const [lin, lu, lt, ll] = loop.lengths
  const reach = (st.w / 2) * rails
  const chimeFill = pale(color, 0.35)
  const unplayed = pale(IRON, 0.78)
  const thin = weight * 0.42
  for (const key of loop.keys) {
    const up = easeOut(smooth(open, keysFrom + ((keysTo - keysFrom) * key.i) / N, keysFrom + ((keysTo - keysFrom) * key.i) / N + 0.08))
    if (up <= 0) continue
    const a = railAt(st, key.s0 + 0.008)
    const b = railAt(st, key.s1 - 0.008)
    const own = played.own[key.i]
    const along = played.along[key.i]
    const lit = t >= own[0]
    const ago = since(own, t)
    const agoAlong = since(along, t)
    // The ball on it: it gives, a little.
    let press = 0
    if (ours) {
      const mid = (a.x + b.x) / 2
      const halfw = Math.abs(b.x - a.x) / 2 + R * 0.6
      const d = Math.abs(here.p[0] - mid)
      if (d < halfw && Math.abs(here.p[1] + R - (a.y + b.y) / 2) < 0.2) press = 1 - d / halfw
    }
    const tap = agoAlong < 0.5 ? Math.exp(-agoAlong / 0.09) : 0
    const dip = 0.025 * Math.max(press, tap)
    const swing = 0.2 * ring(ago, 1.6, 0.9) + 0.14 * ring(agoAlong, 1.6, 0.7)
    const fresh = Math.exp(-Math.min(ago, agoAlong) / 0.3)
    const fill = gold > 0 ? mixGold(color, gold) : color

    // The chime: a thin tube hung from the key, swinging when struck, bright with it a moment.
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2 + dip + KEY
    const len = chime(n, key) * up
    const tw = Math.min(0.06, Math.abs(b.x - a.x) * 0.5)
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(swing * (key.rail === 0 ? 1 : -1))
    outline(p, INK, thin)
    p.line(0, 0, 0, 0.035 * k)
    p.stroke(deep(lit ? fill : IRON, 0.45))
    p.strokeWeight(thin * 0.8)
    p.fill(lit ? mixHex(chimeFill, fill, fresh) : unplayed)
    p.rectMode(p.CORNER)
    p.rect((-tw / 2) * k, 0.035 * k, tw * k, len * k, 0.01 * k)
    p.pop()

    // The key: a block along the rail, flipped up from lying under it.
    p.push()
    p.translate(a.x * k, (a.y + dip) * k)
    p.rotate(Math.atan2(b.y - a.y, b.x - a.x) + (1 - up) * (key.rail === 0 ? 1.4 : -1.4))
    solid(p, INK, thin, lit ? mixHex(fill, '#FFF4DC', 0.5 * fresh) : PAPER)
    p.rectMode(p.CORNER)
    p.rect(0, 0, Math.hypot(b.x - a.x, b.y - a.y) * k, KEY * k, 0.012 * k)
    p.pop()
  }

  // The rails under the keys, running out from the mast: one ink line each, like any rail of the Machine.
  outline(p, INK, weight)
  for (const [s0, s1] of [[lin, lin + lu], [lin + lu + lt, lin + lu + lt + ll]]) {
    const p0 = railAt(st, s0)
    const p1 = railAt(st, s1)
    const clip = (x: number) => Math.max(-reach, Math.min(reach, x))
    const xa = clip(p0.x)
    const xb = clip(p1.x)
    const ya = p0.y + ((xa - p0.x) * (p1.y - p0.y)) / (p1.x - p0.x)
    const yb = p0.y + ((xb - p0.x) * (p1.y - p0.y)) / (p1.x - p0.x)
    p.line(xa * k, (ya + KEY) * k, xb * k, (yb + KEY) * k)
  }
}

/** E major: every storey lit gold for its eight bars, and back. */
const mixGold = (color: string, f: number): string => mixHex(color, GOLD, 0.55 * f)
