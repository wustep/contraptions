import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { mixHex } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { glow } from '../lantern'
import { BLOW, RUIN, ruinLight } from '../music'
import type { Pen } from '../troll'
import { LAMP, STONE } from '../worlds'
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
 * Each room's one great thing comes down on its chord while the room is still lit, drawn by its own set (the heart's
 * flywheel frame splays and drops onto the broken halves, the great drum's trestle buckles and it lurches into the
 * pit's mouth, the mine's timbering racks over): a silhouette big enough to read at 56 cells, where a roof slab is a
 * few pixels. Its lights die after it has landed (`fall`), to a few embers (nothing is lit again); its roof's slabs
 * let go on the chord and crash onto its floor, and its dust rolls down from the roof and hangs there through the
 * silence and after. Drawn over the rooms (the fall part's `over`), so nothing a room's own set draws on
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
  /** The chord it falls on (its great thing comes down, the roof lets go), and a second chord that brings more down. */
  at: number
  then?: number
  /** How long its great thing takes to come down (s): its lights begin to die only then. */
  fall: number
  /** How long its lights take to die (s), and how dark it ends (the rest is its embers). */
  out: number
  dark: number
  /** How many slabs, and how big. */
  slabs: number
  size: [number, number]
}

const HEART_AT = RUIN.heart
const DRUM_AT = RUIN.drum
const MINE_AT = RUIN.mine
const VAULT_AT = RUIN.vault

/**
 * The rooms, bottom up. Their boxes meet on the rock between them, so no two overlap (a double dark would show as a
 * band where two boxes cross a hollow).
 */
export const ROOMS: Room[] = [
  { name: 'heart', x0: 44.0, x1: 64.0, y0: 26.3, y1: 36.6, roof: 26.8, floor: 33.13, from: 45.6, to: 62.4, at: HEART_AT, fall: 0.45, out: 0.35, dark: 0.9, slabs: 3, size: [0.6, 1.0] },
  { name: 'drum', x0: 43.6, x1: 64.4, y0: 18.3, y1: 26.3, roof: 19.0, floor: 25.95, from: 45.6, to: 62.4, at: DRUM_AT[0], then: DRUM_AT[1], fall: 0.45, out: 0.3, dark: 0.9, slabs: 3, size: [0.6, 1.0] },
  // The mine's roof is the stope's timbered top (~13.5), not the box's: slabs from higher fell out of solid rock.
  { name: 'mine', x0: 42.0, x1: 74.0, y0: 9.7, y1: 18.3, roof: 13.4, floor: 17.13, from: 44.5, to: 70.5, at: MINE_AT[0], then: MINE_AT[1], fall: 0.7, out: 0.3, dark: 0.9, slabs: 3, size: [0.55, 0.9] },
  // The hall and the tunnels behind it, one box (they go dark together, so no seam where they meet): its dust only
  // in the hall (from..to), its slabs the vault's own (`fall.ts`).
  { name: 'hall', x0: 20.3, x1: 72.0, y0: -9.2, y1: 9.7, roof: -2.6, floor: 8.13, from: 41.0, to: 69.0, at: VAULT_AT, fall: 0, out: 0.8, dark: 0.86, slabs: 0, size: [1.4, 2.6] },
]

/** 0..1: how far a room's lights have died at T (a flicker on the way out, never back on), after its great thing lands. */
export function outOf(r: Room, T: number): number {
  const at = r.at + r.fall
  if (T < at) return 0
  const u = smooth(T, at, at + r.out)
  const flick = 0.18 * Math.sin((T - at) * 53 + r.x0) * (1 - u) * smooth(T, at, at + 0.06)
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

/**
 * Each room's roof coming down as two or three great slabs (a room's width is 17 to 26 cells, so a slab 4 to 6 cells
 * across and more than a cell thick reads at the cross-section's size, where the small stones are a few pixels):
 * cracked free of the roof a moment before it goes, falling flat and turning a little, and landing across the floor
 * on the room's chord (or chords), rocking to rest. Its underside is the lit ceiling it was, lit by the room's flare.
 */
interface Great {
  room: Room
  /** Middle, world x; width and thickness, cells. */
  x: number
  w: number
  h: number
  /** Lets go of the roof, lands on the floor (show time). */
  go: number
  land: number
  /** How far it turns in the fall (rad, signed), and how it lies once it has landed. */
  turn: number
  lie: number
  seed: number
}
const GREAT: Great[] = (
  [
    // [room, x, w, h, lands on, turn, lies]: clear of the chimney's column (47.5 ± 1.4), the jet's line.
    ['heart', 53.6, 4.6, 1.7, RUIN.heart, 0.14, 0.06],
    ['heart', 59.8, 3.8, 1.5, RUIN.heart + 0.22, -0.18, -0.08],
    ['drum', 52.2, 4.8, 1.8, RUIN.drum[0], -0.12, -0.05],
    ['drum', 58.8, 4.0, 1.5, RUIN.drum[1], 0.16, 0.07],
    ['mine', 55.6, 4.9, 1.6, RUIN.mine[0], 0.12, 0.05],
    ['mine', 64.2, 4.2, 1.45, RUIN.mine[1], -0.15, -0.06],
    ['mine', 51.8, 3.6, 1.3, RUIN.mine[1] + 0.18, 0.19, 0.08],
  ] as const
).map(([name, x, w, h, land, turn, lie], i) => {
  const room = ROOMS.find((r) => r.name === name)!
  const drop = room.floor - h / 2 - (room.roof + h / 2)
  return { room, x, w, h, go: land - Math.sqrt((2 * drop) / G), land, turn, lie, seed: 500 + i * 7 }
})
/** How long a great slab takes to crack free of the roof before it goes. */
const LOOSEN = 0.3
/** The first moment any great slab shows (the heart's, cracking free as the frame pulls back to it). */
const FIRST_GREAT = Math.min(...GREAT.map((g) => g.go - LOOSEN))

/**
 * A great slab's outline about its middle, as the pieces it breaks into when it lands (it falls whole, the pieces
 * together): a broken, jagged top and ends (the rock it tore out of) over a flatter underside (the ceiling it was).
 * Each piece is [its outline about the slab's middle, its own middle].
 */
function slabPieces(g: Great): { pts: Pt[]; mid: Pt }[] {
  const hw = g.w / 2
  const hh = g.h / 2
  // Where it splits: two uneven cracks down through it.
  const cuts = [-hw + g.w * (0.3 + 0.08 * hash(g.seed, 11)), -hw + g.w * (0.64 + 0.1 * hash(g.seed, 12))]
  const edges = [-hw, ...cuts, hw]
  const out: { pts: Pt[]; mid: Pt }[] = []
  for (let j = 0; j < 3; j++) {
    const a = edges[j]
    const b = edges[j + 1]
    const pts: Pt[] = []
    // The top: jagged.
    const n = 4
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n
      const endDrop = j === 0 && i === 0 ? 0.35 * g.h : j === 2 && i === n ? 0.3 * g.h : 0
      pts.push([x, -hh + endDrop + 0.28 * g.h * hash(g.seed, j * 7 + i, 3)])
    }
    // Its right side: the crack (or the broken end), a kink half way.
    pts.push([b + (j === 2 ? 0.12 : 0.1) * (hash(g.seed, j, 4) - 0.5), 0.05 * g.h], [b - (j === 2 ? 0.1 : 0), hh])
    // The underside: nearly flat.
    pts.push([a + (j === 0 ? 0.12 : 0), hh - 0.04 * g.h * hash(g.seed, j, 5)])
    pts.push([a - (j === 0 ? 0.14 : -0.06) * hash(g.seed, j, 6), 0.1 * g.h])
    out.push({ pts, mid: [(a + b) / 2, 0] })
  }
  return out
}

/** Where a great slab is at T, world: its middle, its angle, how long since it landed (negative before), how seen. */
function greatAt(g: Great, T: number): { x: number; y: number; angle: number; since: number; seen: number } | null {
  if (T < g.go - LOOSEN) return null
  const seat = g.room.roof + g.h / 2
  const rest = g.room.floor - g.h / 2
  const tip = 0.04 * Math.sign(g.turn)
  if (T < g.go) {
    // Cracking free: it sags a hair at one end, and shows.
    const u = smooth(T, g.go - LOOSEN, g.go)
    return { x: g.x, y: seat - 0.25 * (1 - u) + 0.05 * u, angle: tip * u, since: -1, seen: u }
  }
  if (T < g.land) {
    const u = T - g.go
    const dur = g.land - g.go
    return { x: g.x, y: Math.min(rest, seat + 0.05 + 0.5 * G * u * u), angle: tip + g.turn * (u / dur) * (u / dur), since: T - g.land, seen: 1 }
  }
  // Landed: it slams down and breaks, the pieces rocking to rest (a sharp hit, a long damped settle).
  const a = T - g.land
  const angle = g.lie + (tip + g.turn - g.lie) * Math.exp(-a / 0.12)
  return { x: g.x, y: rest, angle, since: a, seen: 1 }
}

function drawGreat(p: p5, c: Pen, g: Great, T: number, o: Pt, q: Pt, fl: number, out: number): void {
  const at = greatAt(g, T)
  if (!at) return
  const k = c.k
  const settled = at.since >= 0
  const x = at.x - o[0] + (settled || T < g.go ? q[0] : 0)
  const y = at.y - o[1] + (settled || T < g.go ? q[1] : 0)
  const light = 1 - out
  // The roof's own rock, a step out of the dark by the room's light, and its underside the lit ceiling it was.
  const rock = mixHex(STONE.deep, STONE.dark, 0.55 + 0.45 * light)
  const top = mixHex(rock, STONE.mid, 0.35 * light)
  const under = mixHex(mixHex(STONE.mid, STONE.light, 0.35), LAMP.glow, (0.35 + 0.35 * fl) * light)
  const edge = mixHex(STONE.deep, '#000000', 0.25)
  const a = Math.max(0, at.since)
  const hh = g.h / 2
  p.push()
  p.translate(x * k, y * k)
  p.rotate(at.angle)
  const pieces = slabPieces(g)
  if (!settled) {
    // Whole in its fall: one outline round the three pieces (their tops, the far end, the underside, the near end),
    // so it reads as one slab of roof and not a row of blocks.
    p.stroke(alpha(p, edge, at.seen))
    p.strokeWeight(Math.max(1, c.weight * 0.8))
    p.fill(alpha(p, rock, at.seen))
    p.beginShape()
    for (const { pts } of pieces) for (const [u, v] of pts.slice(0, 5)) p.vertex(u * k, v * k)
    const last = pieces[2].pts
    p.vertex(last[5][0] * k, last[5][1] * k)
    p.vertex(last[6][0] * k, last[6][1] * k)
    const first = pieces[0].pts
    p.vertex(first[7][0] * k, first[7][1] * k)
    p.vertex(first[8][0] * k, first[8][1] * k)
    p.endShape(p.CLOSE)
  }
  pieces.forEach(({ pts, mid }, j) => {
    // On landing the pieces part along the cracks: the ends drop and tip outward, the middle settles; damped.
    const part = settled ? 1 - Math.exp(-a / 0.1) : 0
    const side = j - 1
    const dx = side * 0.16 * part
    const dy = (side === 0 ? 0.05 : 0.12) * part
    const rot = side * (0.1 + 0.05 * hash(g.seed, j, 8)) * part + (settled ? 0.04 * side * Math.exp(-a / 0.2) * Math.sin(a * 20) : 0)
    p.push()
    p.translate((mid[0] + dx) * k, (mid[1] + dy) * k)
    p.rotate(rot)
    if (settled) {
      p.stroke(alpha(p, edge, at.seen))
      p.strokeWeight(Math.max(1, c.weight * 0.8))
    } else p.noStroke()
    p.fill(alpha(p, rock, at.seen))
    p.beginShape()
    for (const [u, v] of pts) p.vertex((u - mid[0]) * k, (v - mid[1]) * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    // The broken top catches a little of the room's light; the underside is the lit ceiling.
    p.fill(alpha(p, top, 0.8 * at.seen))
    const tp = pts.slice(0, 5)
    p.beginShape()
    for (const [u, v] of tp) p.vertex((u - mid[0]) * k, (v - mid[1]) * k)
    for (let i = tp.length - 1; i >= 0; i--) p.vertex((tp[i][0] - mid[0]) * k, (tp[i][1] + 0.16 * g.h - mid[1]) * k)
    p.endShape(p.CLOSE)
    // The underside's two ends: the piece's bottom left and bottom right corners.
    const [ua, ub] = [pts[7], pts[6]]
    p.fill(alpha(p, under, at.seen))
    p.beginShape()
    p.vertex((ua[0] + 0.05 - mid[0]) * k, (hh - 0.26 * g.h - mid[1]) * k)
    p.vertex((ub[0] - 0.05 - mid[0]) * k, (hh - 0.24 * g.h - mid[1]) * k)
    p.vertex((ub[0] - 0.05 - mid[0]) * k, (ub[1] - 0.02 - mid[1]) * k)
    p.vertex((ua[0] + 0.05 - mid[0]) * k, (ua[1] - 0.02 - mid[1]) * k)
    p.endShape(p.CLOSE)
    p.pop()
  })
  p.pop()
}

/**
 * The dust a great slab raises as it lands: a low warm bank rolling out along the floor both ways from under it,
 * lit by the room's fires, thinning as it spreads and settling into the room's haze. Soft gradients, wider than they
 * are tall, overlapping into one bank (never round puffs).
 */
function drawBurst(ctx: CanvasRenderingContext2D, k: number, g: Great, T: number, o: Pt, fl: number, out: number): void {
  const a = T - g.land
  if (a < 0 || a > 2.4) return
  const u = a / 2.4
  const roll = 1 - Math.exp(-a / 0.22)
  const hw = g.w / 2
  const col = mixHex(mixHex(STONE.light, '#9A8F80', 0.5), LAMP.glow, Math.min(0.75, 0.35 + 0.3 * fl) * (1 - 0.6 * out))
  const n = parseInt(col.slice(1, 7), 16)
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
  const A = 0.42 * Math.pow(1 - u, 1.6) * smooth(a, 0, 0.06)
  const floorY = (g.room.floor - o[1]) * k
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 5; i++) {
      const reach = hw * (0.3 + 0.2 * i) + (1.2 + 0.9 * i) * roll
      const cx = (g.x + side * reach - o[0]) * k
      const rx = (0.9 + 0.35 * i + 0.9 * roll) * k
      const ry = (0.32 + 0.1 * i + 0.45 * roll) * (1 - 0.15 * i / 4) * k
      const cy = floorY - ry * 0.55
      const aa = A * (1 - 0.13 * i)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1, ry / rx)
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
      gr.addColorStop(0, `rgba(${rgb},${aa.toFixed(3)})`)
      gr.addColorStop(0.5, `rgba(${rgb},${(aa * 0.55).toFixed(3)})`)
      gr.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(0, 0, rx, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}

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
 * Over the rooms (the fall part's `over`): its slabs coming down (under its dark), each room's dark, its dust
 * hanging, its embers.
 * `jet` redraws the geyser's column over a dark room, clipped to it, so the one line through every room stays the
 * white it was.
 */
export function drawRuin(p: p5, c: Pen, T: number, o: Pt, q: Pt, jet: () => void): void {
  if (T < Math.min(HEART_AT - 0.35, FIRST_GREAT)) return
  const k = c.k
  const X = (v: number) => (v - o[0]) * k
  const Y = (v: number) => (v - o[1]) * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Once the mountain is quiet (the credits), the dead rooms sink the rest of the way into the rock: their lit boxes
  // stood as paler rectangles under the dawn on a tall phone. Only the embers are left.
  const deeper = smooth(T, BLOW + 3, BLOW + 12)
  const dark = ROOMS.map((r) => outOf(r, T) * (r.dark + (0.975 - r.dark) * deeper))
  // What comes down, and the dust it raises where it lands: the roof's great slabs, and a few stones after them. They
  // land while the room is lit, and go under its dark with everything else in it (drawn over it, their lit undersides
  // and pale edges stood in the dead rooms as rows of floating slabs and grey diamonds through the credits).
  for (const { room, s } of SLABS) {
    if (T < s.t0 - (s.emerge ?? 0)) continue
    stone(p, c, o, s, T, q, 0.12 + 0.5 * (1 - outOf(room, T)))
  }
  for (const g of GREAT) {
    const chords = g.room.then !== undefined ? [g.room.at, g.room.then] : [g.room.at]
    const fl = ruinLight(T, chords).flare
    const out = outOf(g.room, T)
    drawGreat(p, c, g, T, o, q, fl, out)
    drawBurst(ctx, k, g, T, o, fl, out)
  }
  // The rooms' lights going out: the rock's own dark (STONE.deep) laid over each, box by box, feathered.
  ROOMS.forEach((r, i) => {
    if (dark[i] <= 0.003) return
    soft(ctx, k, () => {
      ctx.fillStyle = `rgba(21,24,29,${dark[i].toFixed(3)})`
      ctx.fillRect(X(r.x0 + 0.4), Y(r.y0 + 0.3), (r.x1 - r.x0 - 0.8) * k, (r.y1 - r.y0 - 0.6) * k)
    })
  })
  // The dust it is full of: a haze that settles as the roof lets go and hangs, thickest low, catching what light is
  // left (never clouds or discs).
  ROOMS.forEach((r) => {
    const since = T - r.at
    if (since <= 0) return
    // Only in the room's lower half, which is as wide as the room (a vault's arch would show a box's corners).
    const front = smooth(since, 0, 0.9)
    const a = 0.11 * smooth(since, 0, 0.3) * (1 - 0.5 * smooth(T, BLOW + 4, BLOW + 16)) * (1 - 0.8 * deeper)
    const y0 = r.roof + (r.floor - r.roof) * 0.45
    const y1 = y0 + (r.floor - y0) * (0.3 + 0.7 * front)
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
  // The embers: small, low, warm, breathing; they dim over the credits but never quite go.
  for (const e of EMBERS) {
    const r = ROOMS.find((x) => x.name === e.room)!
    const on = smooth(T, r.at + r.fall + 0.2, r.at + r.fall + r.out + 0.4)
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
