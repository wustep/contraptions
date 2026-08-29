import type p5 from 'p5'
import { LOOP } from '../../core/constants'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, mod, seg } from '../../core/ease'
import { FIRE_DECAY } from '../../core/wiring'
import { BY, D, FLOOR } from '../../worlds/lanes'

/**
 * The shop vocabulary. Every machine in the catalog is a bench on one shop
 * floor, and a part is the thing handed from one bench to the next, so the
 * heights and speeds a part is handled at are fixed here rather than in each
 * machine. The bench is the same line the ports and tracks worlds roll their
 * balls on, and the part is the same size as their ball: all three worlds
 * share a floor.
 *
 * Units are cells, y down. Multiply by the cell size to draw.
 */

/** The bench surface. Parts sit on it, belts run along it. */
export const BENCH = FLOOR
/**
 * West end of a feeder deck. Starting the belt at the cell edge left a
 * 1–2px stub in the empty cell to the west; the feeder body is the start.
 */
export const FEED_WEST = -0.16
/** Centre of a part resting on the bench. */
export const PART_Y = BY
/** A part's edge. Square, so it stacks, tips, and gets stamped. */
export const PART = D
/** A high shelf: where a lift delivers to and a chute takes from. */
export const SHELF = -0.16
/** Centre of a part riding the shelf. */
export const HIGH_Y = SHELF - PART / 2
/** The overhead rail a hook trolley runs on. */
export const RAIL = -0.44
/** Belt speed in cells per loop. A part crosses a cell in half a loop. */
export const BELT_V = 2
/**
 * Roller radius. A roller with four spokes looks the same every quarter turn,
 * and at this radius a belt moving any whole number of ninths of a cell per
 * loop turns it a whole number of quarter turns, so rollers close the loop
 * exactly instead of jumping at the seam.
 */
export const ROLLER_R = 2 / (9 * Math.PI)
/** Pitch of the cleats on a belt. Divides a cell, so a belt closes the loop. */
export const TICK = 0.125

/**
 * The station beat, shared by every machine that stops a part to work it: the
 * part rolls in from the west edge, waits under the tool, is struck, and rolls
 * out. Every station fires at HIT, so a chain of them reads at one tempo.
 */
export const ARRIVE = 0.31
export const HIT = 0.42
/**
 * When the part leaves the middle. Its journey then fills the loop exactly —
 * it crosses the west edge at u = 0 and the east edge at u = 1 — so a line of
 * benches never stands empty and the part on one seam is the part on the next.
 */
export const DEPART = 1 - (0.5 + PART / 2) / BELT_V
export const GONE = DEPART + ARRIVE

export type Mark = 'blank' | 'dot' | 'hole'

/** 1 at `at`, decaying to 0 over `frames`. What `fired` is, derived from `u`. */
export const pulse = (u: number, at: number, frames = FIRE_DECAY, period = LOOP) =>
  Math.max(0, 1 - (mod(u - at, 1) * period) / frames)

/** `u` with the end of the loop folded to just below zero, for lead-ins. */
export const fold = (u: number) => (u > 0.5 ? u - 1 : u)

/**
 * A 1×1 bench's place on a shop line. The workshop composer writes this;
 * without it a machine is treated as closed (no inbound, no outbound).
 */
export type Line = {
  in: boolean
  out: boolean
  color: string
  /** +1 east, -1 west. A westbound bench is the return of the snake. */
  along?: number
  /** This cell dumps the part south into the bench below. */
  drop?: boolean
  /** This cell receives a part from the bench above. */
  catch?: boolean
  /** Place on an elevator stack. The composer stamps this on the pair. */
  ride?: { index: number; floors: number }
}

export function lineOf(s: unknown): Line | undefined {
  if (!s || typeof s !== 'object' || !('line' in s)) return undefined
  const line = (s as { line?: Line }).line
  return line && typeof line.out === 'boolean' ? line : undefined
}

/** Draw a part only while its body still sits inside the cell. */
export function showPart(
  p: p5,
  k: number,
  ink: string,
  weight: number,
  fill: string,
  x: number,
  y: number,
  opts: { mark?: Mark; angle?: number; bg?: string; w?: number; h?: number } = {},
): void {
  const hw = (opts.w ?? PART) / 2
  const hh = (opts.h ?? PART) / 2
  if (x < -0.5 - hw - 0.02 || x > 0.5 + hw + 0.02) return
  if (y < -0.5 - hh - 0.02 || y > 0.5 + hh + 0.02) return
  part(p, k, ink, weight, fill, x, y, opts)
}

/** Clamp a travelling x so a closed end holds at centre and nothing leaves the cell. */
export function keepX(x: number, line?: Line): number | null {
  if (line && !line.in && x < -0.4) return null
  if (line && !line.out && x > 0.02) return 0
  if (x < -0.56 || x > 0.56) return null
  return x
}

/**
 * Where a part is on the station beat: entering from the west, held at the
 * centre between `arrive` and `depart`, leaving east. A closed outlet holds
 * the part at centre; a closed inlet starts the part inside the cell.
 */
function shuttleAt(u: number, arrive: number, depart: number, line?: Line): number | null {
  const edge = 0.5 + PART / 2
  const cross = edge / BELT_V
  if (line && !line.in) {
    if (u < arrive - 0.12) return null
    if (u < arrive) return -0.18 + ((u - (arrive - 0.12)) / 0.12) * 0.18
  } else {
    if (u < arrive - cross) return null
    if (u < arrive) return -edge + (u - (arrive - cross)) * BELT_V
  }
  if (u < depart) return 0
  if (line && !line.out) return 0
  if (u < depart + cross) return (u - depart) * BELT_V
  return null
}

/**
 * Where this bench's parts are, in cell units along the line.
 *
 * Every bench on a line runs off the same clock, so the part crossing a seam
 * is drawn by the machine on each side — one of them at `x`, the other at
 * `x` plus or minus a cell. Without the neighbouring copies each cell clipped
 * its half of the part at the wall and the other half was never drawn, so a
 * part crossing a seam looked like a box growing out of a post.
 */
export function shuttle(u: number, arrive = ARRIVE, depart = DEPART, line?: Line): number[] {
  const at = shuttleAt(u, arrive, depart, line)
  if (at === null) return []
  const edge = 0.5 + PART / 2
  return [at, at - 1, at + 1].filter((x) => Math.abs(x) < edge)
}

/**
 * The colour of the thing being made. It belongs to the line, not to the
 * bench: a part half-way across a seam is drawn by the machine on each side,
 * and if each used its own colour the part came out in two.
 */
export function partColor(s: unknown): string {
  const line = lineOf(s)
  if (line) return line.color
  return (s as { color?: string } | null)?.color ?? '#000000'
}

/** The bench line, with a leg at each end down to the floor. */
export function bench(p: p5, k: number, ink: string, weight: number, x0 = -0.5, x1 = 0.5, legs = true): void {
  outline(p, ink, weight)
  p.line(x0 * k, BENCH * k, x1 * k, BENCH * k)
  if (!legs) return
  for (const x of [x0 + 0.07, x1 - 0.07]) p.line(x * k, BENCH * k, x * k, 0.5 * k)
}

/** A part. Square, one flat fill, optionally worked. */
export function part(
  p: p5,
  k: number,
  ink: string,
  weight: number,
  fill: string,
  x: number,
  y: number,
  opts: { mark?: Mark; angle?: number; bg?: string; w?: number; h?: number } = {},
): void {
  const w = (opts.w ?? PART) * k
  const h = (opts.h ?? PART) * k
  p.push()
  p.translate(x * k, y * k)
  if (opts.angle) p.rotate(opts.angle)
  solid(p, ink, weight, fill)
  p.rect(0, 0, w, h, k * 0.02)
  if (opts.mark === 'dot') {
    p.fill(ink)
    p.circle(0, 0, k * 0.07)
  } else if (opts.mark === 'hole') {
    p.fill(opts.bg ?? fill)
    p.circle(0, 0, k * 0.1)
  }
  p.pop()
}

/** A roller: rim, four spokes, a coloured hub. `angle` is its rotation. */
export function roller(p: p5, k: number, ink: string, weight: number, fill: string, x: number, y: number, r: number, angle: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  outline(p, ink, weight)
  p.circle(0, 0, r * 2 * k)
  p.line(-r * k, 0, r * k, 0)
  p.line(0, -r * k, 0, r * k)
  solid(p, ink, weight, fill)
  p.circle(0, 0, Math.min(r, 0.045) * 2 * k)
  p.pop()
}

/**
 * A run of powered rollers set into the bench between x0 and x1, all turning
 * together. `travel` is how far the surface has moved, in cells.
 */
export function rollers(p: p5, k: number, ink: string, weight: number, fill: string, x0: number, x1: number, travel: number, y = BENCH): void {
  const pitch = ROLLER_R * 2 + 0.03
  const n = Math.max(1, Math.floor((x1 - x0) / pitch))
  const start = x0 + ((x1 - x0) - (n - 1) * pitch) / 2
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
  for (let i = 0; i < n; i++) {
    roller(p, k, ink, weight, fill, start + i * pitch, y + ROLLER_R, ROLLER_R, travel / ROLLER_R)
  }
}

/**
 * A belt between two rollers, its top run on the bench line. Cleats scroll
 * along the top run so the belt is visibly moving even when it is empty.
 */
export function belt(p: p5, k: number, ink: string, weight: number, fill: string, x0: number, x1: number, travel: number, y = BENCH): void {
  const r = ROLLER_R
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
  p.line(x0 * k, (y + 2 * r) * k, x1 * k, (y + 2 * r) * k)
  const off = mod(travel, TICK)
  for (let x = x0 + off; x < x1; x += TICK) {
    if (x > x0 + r * 0.5 && x < x1 - r * 0.5) p.line(x * k, y * k, x * k, (y + 0.03) * k)
  }
  roller(p, k, ink, weight, fill, x0, y + r, r, travel / r)
  roller(p, k, ink, weight, fill, x1, y + r, r, travel / r)
}

/** Lines radiating from a point: an impact, a lamp coming on, a ring. */
export function burst(p: p5, k: number, color: string, weight: number, x: number, y: number, amount: number, inner: number, outer: number, n = 8, phase = 0): void {
  if (amount <= 0.02) return
  p.push()
  p.stroke(color)
  p.strokeWeight(weight)
  p.noFill()
  const reach = inner + (outer - inner) * amount
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2
    p.line((x + Math.cos(a) * inner) * k, (y + Math.sin(a) * inner) * k, (x + Math.cos(a) * reach) * k, (y + Math.sin(a) * reach) * k)
  }
  p.pop()
}

/**
 * Sparks or chips thrown from a point: `n` motes on short arcs, each on its
 * own phase, `cycles` times a loop. `dir` is which way they fly, `lift` how
 * high, `range` how far the longest arc carries — a fountain near a wall
 * passes the room it actually has. Periodic because every mote makes whole
 * cycles.
 */
export function sparks(p: p5, k: number, color: string, x: number, y: number, u: number, dir: number, on: number, n = 4, cycles = 3, lift = 0.16, range = 0.22): void {
  if (on <= 0.02) return
  p.push()
  p.noStroke()
  p.fill(color)
  for (let j = 0; j < n; j++) {
    const t = mod(u * cycles + j / n, 1)
    const spread = 0.5 + (j % 3) * 0.35
    const sx = x + dir * t * range * spread
    const sy = y - lift * spread * t + lift * 1.6 * t * t
    p.circle(sx * k, sy * k, k * 0.035 * (1 - t * 0.5) * on)
  }
  p.pop()
}

/** A ramp that moves in steps: `steps` moves a loop, each taking `dwell` of its slot. */
export const indexed = (u: number, steps: number, dwell = 0.5) => {
  const slot = u * steps
  const i = Math.floor(slot)
  return (i + easeInOutCubic(seg(slot - i, 0, 1 - dwell))) / steps
}
