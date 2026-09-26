import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { glow } from '../lantern'
import { BLOW } from '../music'
import type { Pen } from '../troll'
import { G, stone, type Stone } from './fall-rock'

/**
 * The mountain comes down, bottom up, on the coda's hammered chords (143.20 → 146.35), seen in one wide of the whole
 * mountain in cross-section while the geyser carries Peer up the vent over it all: the lighting rule reversed. Every
 * room he lit on his way down goes dark on its chord as its roof comes down, the lowest first, so the fall climbs
 * after him:
 *
 *   143.20          the heart (the gear works): its roof lets go onto the broken machine, its furnace goes out;
 *   143.93 / 144.12 the drum room: its roof, then the rest of it, onto the drums;
 *   144.84 / 145.08 the mine: the timbered stope's roof onto the rails and the carts;
 *   145.35 → 146.11 the hall's own collapse (`hall.ts`: the court's ledges, then the throne and the pillars);
 *   146.35          the hall's vault, and the tunnels behind it go dark with it.
 *
 * Each room's lights die over a fraction of a second after its chord (to a few embers: nothing is lit again), its
 * roof's slabs let go on the chord and crash onto its floor, and its dust rolls down from the roof and hangs there
 * through the silence and after. Drawn over the rooms (the fall part's `over`), so nothing a room's own set draws on
 * top shows through; Peer is above all of it by then, in the vent.
 *
 * World cells, drawn in the fall part's frame (`o` is that frame's origin in the world).
 */

export interface Room {
  name: string
  /** A box round the hollow and a margin of the rock round it (the dark changes nothing on the rock). */
  x0: number
  x1: number
  y0: number
  y1: number
  /** Where its slabs let go from (its roof) and land (its floor's top), world y; the span of roof that comes down. */
  roof: number
  floor: number
  from: number
  to: number
  /** The chord it falls on (the lights begin to die, the roof lets go), and a second chord that brings more down. */
  at: number
  then?: number
  /** How long its lights take to die (s), and how dark it ends (the rest is its embers). */
  out: number
  dark: number
  /** How many slabs, and how big. */
  slabs: number
  size: [number, number]
}

const HEART_AT = 143.199
const DRUM_AT = [143.926, 144.12] as const
const MINE_AT = [144.84, 145.079] as const
const VAULT_AT = 146.348

/**
 * The rooms, bottom up. Their boxes meet on the rock between them, so no two overlap (a double dark would show as a
 * band where two boxes cross a hollow).
 */
export const ROOMS: Room[] = [
  { name: 'heart', x0: 44.0, x1: 64.0, y0: 26.3, y1: 34.2, roof: 26.8, floor: 33.13, from: 45.6, to: 62.4, at: HEART_AT, out: 0.35, dark: 0.84, slabs: 6, size: [1.2, 2.4] },
  { name: 'drum', x0: 44.0, x1: 64.0, y0: 18.3, y1: 26.3, roof: 19.0, floor: 25.95, from: 45.6, to: 62.4, at: DRUM_AT[0], then: DRUM_AT[1], out: 0.3, dark: 0.84, slabs: 6, size: [1.1, 2.2] },
  { name: 'mine', x0: 42.0, x1: 74.0, y0: 9.7, y1: 18.3, roof: 10.6, floor: 17.13, from: 44.5, to: 70.5, at: MINE_AT[0], then: MINE_AT[1], out: 0.3, dark: 0.84, slabs: 8, size: [1.0, 2.2] },
  // The hall and the tunnels behind it, one box (they go dark together, so no seam where they meet): its dust only
  // in the hall (from..to), its slabs the vault's own (`fall.ts`).
  { name: 'hall', x0: 20.3, x1: 72.0, y0: -9.2, y1: 9.7, roof: -2.6, floor: 8.13, from: 41.0, to: 69.0, at: VAULT_AT, out: 0.8, dark: 0.8, slabs: 0, size: [1.4, 2.6] },
]

/** 0..1: how far a room's lights have died at T (a flicker on the way out, never back on). */
export function outOf(r: Room, T: number): number {
  if (T < r.at) return 0
  const u = smooth(T, r.at, r.at + r.out)
  const flick = 0.18 * Math.sin((T - r.at) * 53 + r.x0) * (1 - u) * smooth(T, r.at, r.at + 0.06)
  return Math.max(0, Math.min(1, u + flick))
}

/**
 * Each room's slabs: a few great ones and some smaller, let go from its roof across its chord (and its second chord,
 * where it has one), at uneven places and uneven moments, crashing onto its floor. Never a row of equal stones.
 */
const SLABS: { room: Room; s: Stone }[] = ROOMS.flatMap((r, ri) => {
  const out: { room: Room; s: Stone }[] = []
  for (let i = 0; i < r.slabs; i++) {
    const seed = 300 + ri * 20 + i
    // Where along the roof it lets go: clumped toward the room's ends and middle, not spaced, and clear of the
    // chimney's column (the jet's line).
    let u = hash(seed, 2)
    u = u < 0.5 ? 0.5 * Math.pow(2 * u, 1.4) : 1 - 0.5 * Math.pow(2 * (1 - u), 1.4)
    let x = r.from + (r.to - r.from) * u
    if (Math.abs(x - 47.5) < 1.4) x = 47.5 + Math.sign(x - 47.5 || 1) * (1.4 + 0.6 * hash(seed, 6))
    const big = i % 3 === 0
    const size = big ? r.size[1] * (0.85 + 0.3 * hash(seed, 3)) : r.size[0] * (0.45 + 0.6 * hash(seed, 3))
    const second = r.then !== undefined && hash(seed, 7) < 0.45
    const go = (second ? r.then! : r.at) + (big ? 0.02 : 0.05 + 0.3 * hash(seed, 1))
    const rest = r.floor - 0.36 * size
    const y = r.roof + 0.3 * size
    const fall = Math.sqrt((2 * Math.max(0.05, rest - y)) / G)
    out.push({ room: r, s: { from: [x, y], t0: go, to: [x + 0.5 * (hash(seed, 4) - 0.5), rest], t1: go + fall, size, seed, spin: 1.6 * (hash(seed, 5) - 0.5), emerge: 0.18 } })
  }
  return out
})

/** A few embers glowing on in each fallen room, where its fires were: the only light left in it. */
const EMBERS: { room: string; at: Pt }[] = [
  { room: 'heart', at: [54.9, 32.95] },
  { room: 'heart', at: [51.6, 33.0] },
  { room: 'drum', at: [48.6, 25.85] },
  { room: 'drum', at: [54.75, 25.85] },
  { room: 'mine', at: [55.2, 17.0] },
  { room: 'mine', at: [63.4, 17.0] },
  { room: 'hall', at: [44.2, 8.0] },
  { room: 'hall', at: [52.3, 8.0] },
  { room: 'hall', at: [33.5, 5.4] },
]

/** Soft-edged: a box of dark or dust laid with a blur, so its edge never shows where a room's glow ran past it. */
function soft(ctx: CanvasRenderingContext2D, k: number, fill: () => void): void {
  ctx.save()
  ctx.filter = `blur(${Math.max(1, 0.45 * k).toFixed(1)}px)`
  fill()
  ctx.restore()
}

/**
 * Over the rooms (the fall part's `over`): each room's dark, its dust hanging, its slabs coming down, its embers.
 * `jet` redraws the geyser's column over a dark room, clipped to it, so the one line through every room stays the
 * white it was.
 */
export function drawRuin(p: p5, c: Pen, T: number, o: Pt, q: Pt, jet: () => void): void {
  if (T < HEART_AT - 0.35) return
  const k = c.k
  const X = (v: number) => (v - o[0]) * k
  const Y = (v: number) => (v - o[1]) * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dark = ROOMS.map((r) => outOf(r, T) * r.dark)
  // The rooms' lights going out: the rock's own dark (STONE.deep) laid over each, box by box, feathered.
  ROOMS.forEach((r, i) => {
    if (dark[i] <= 0.003) return
    soft(ctx, k, () => {
      ctx.fillStyle = `rgba(21,24,29,${dark[i].toFixed(3)})`
      ctx.fillRect(X(r.x0 + 0.4), Y(r.y0 + 0.3), (r.x1 - r.x0 - 0.8) * k, (r.y1 - r.y0 - 0.6) * k)
    })
  })
  // The dust it is full of: a haze that rolls down from the roof as it lets go and hangs, thickest low, catching
  // what light is left (never clouds or discs).
  ROOMS.forEach((r) => {
    const since = T - r.at
    if (since <= 0) return
    const front = smooth(since, 0, 0.9)
    const a = 0.13 * smooth(since, 0, 0.3) * (1 - 0.5 * smooth(T, BLOW + 4, BLOW + 16))
    const y0 = r.roof
    const y1 = r.roof + (r.floor - r.roof) * (0.25 + 0.75 * front)
    soft(ctx, k, () => {
      // STONE.light's grey.
      const g = ctx.createLinearGradient(0, Y(y0), 0, Y(y1))
      g.addColorStop(0, `rgba(95,103,115,${(0.25 * a).toFixed(3)})`)
      g.addColorStop(1, `rgba(95,103,115,${a.toFixed(3)})`)
      ctx.fillStyle = g
      ctx.fillRect(X(r.from - 0.6), Y(y0), (r.to - r.from + 1.2) * k, (y1 - y0) * k)
    })
  })
  // The jet, over the dark, where a room has gone dark round it.
  const gone = ROOMS.filter((_, i) => dark[i] > 0.003)
  if (gone.length) {
    ctx.save()
    ctx.beginPath()
    for (const r of gone) ctx.rect(X(r.x0), Y(r.y0), (r.x1 - r.x0) * k, (r.y1 - r.y0) * k)
    ctx.clip()
    jet()
    ctx.restore()
  }
  // What comes down, and the dust it raises where it lands.
  for (const { room, s } of SLABS) {
    if (T < s.t0 - (s.emerge ?? 0)) continue
    stone(p, c, o, s, T, q, 0.12 + 0.5 * (1 - outOf(room, T)))
  }
  // The embers: small, low, warm, breathing; they dim over the credits but never quite go.
  for (const e of EMBERS) {
    const r = ROOMS.find((x) => x.name === e.room)!
    const on = smooth(T, r.at + 0.2, r.at + r.out + 0.4)
    if (on <= 0) continue
    const breathe = 0.75 + 0.25 * Math.sin(T * 1.7 + e.at[0])
    const a = on * breathe * (1 - 0.45 * smooth(T, BLOW + 6, BLOW + 20))
    glow(p, c, e.at[0] - o[0] + q[0], e.at[1] - o[1] + q[1], 0.7, 0.2 * a, '#C0622E')
    p.push()
    p.noStroke()
    for (let j = 0; j < 4; j++) {
      const dx = (j - 1.5) * 0.09 + 0.03 * Math.sin(j * 2.3)
      p.fill(alpha(p, j % 2 ? '#E0833A' : '#A3542B', 0.8 * a * (0.6 + 0.4 * Math.sin(T * 2.3 + j * 1.9))))
      p.ellipse((e.at[0] + dx - o[0] + q[0]) * k, (e.at[1] - 0.02 - o[1] + q[1]) * k, 0.07 * k, 0.04 * k)
    }
    p.pop()
  }
}

/** For the check and the log: the chords the rooms fall on, bottom up. */
export const RUIN_CHORDS: number[] = [...new Set(ROOMS.flatMap((r) => (r.then !== undefined ? [r.at, r.then] : [r.at])))].sort((a, b) => a - b)
