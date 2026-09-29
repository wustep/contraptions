import type p5 from 'p5'
import { mixHex, type Piece, type PieceCtx } from '../../../../parts'
import { PERIOD, STARTS, VARIATIONS, wrap, type Variation } from './music'
import { COLUMNS, HEIGHT, RAIL, RING, SEAT, depth, floorPt, lapAt, lapsAt, project, ridersAt, viewAt, type View } from './path'
import { COOL, GOLD, IVORY, SILVER, clamp, hash, pulse, rgba, smooth } from './world'

/**
 * Everything in the room but the ball, each a drawing told show time, with one job to a thing:
 *
 * - the columns are the bars: thirty-two of them, the length of the ground bass every variation is built on. The lamp
 *   in the band over each is lit as the ball goes by and burns down to a glow, and the ground is the one thing that
 *   never changes, so the lamps stay lit variation after variation, and go out in the one variation that has no bass;
 * - the floor keeps what has been played: a lap of the ball engraves a ring in it, tinted for what the variation was,
 *   the Aria opens a rose in the middle and the da capo closes the outermost ring round all of it;
 * - the light that comes down into the room from above is the second half: it opens with the French overture;
 * - the minor variations cool the lamps.
 *
 * At the ends of the period the room is dark and empty, so that it closes on itself: the da capo's last minute puts
 * out the lamps, the rings, the rose and the light, and the Aria's first lights them again.
 */

const scenery = <S>(name: string, draw: (p: p5, s: S, c: PieceCtx) => void, over?: (p: p5, s: S, c: PieceCtx) => void): Piece<S> => ({
  name,
  weight: 0,
  place: () => null,
  draw,
  over,
})

type Ctx2D = CanvasRenderingContext2D

const LAST = STARTS[VARIATIONS.length]
const two = 2 * Math.PI
const BAR = 1 / COLUMNS

/** A thin line, a device pixel or so: `k` pixels to the cell. */
const hairs = (k: number): number => Math.max(1, k / 620) / k

// ---------------------------------------------------------------- the room's state

export interface Room {
  /** The last minute puts everything out: 1 through the piece, 0 at the ends of the period. */
  lit: number
  /** The second half, from the overture: how much light comes in from above. */
  second: number
  /** The minor variations: 0 warm, 1 cool. */
  cool: number
  /** The bass: 1, and 0 in the canon at the ninth, which has none. */
  bass: number
  /** How full of light the room is, growing as the piece does. */
  warm: number
}

export function roomAt(time: number): Room {
  const t = wrap(time)
  const lit = 1 - smooth(t, LAST - 44, LAST - 6)
  let cool = 0
  for (const v of VARIATIONS) {
    if (v.minor) cool = Math.max(cool, pulse(t, STARTS[v.n] - 3, STARTS[v.n] + 6, STARTS[v.n + 1] - 6, STARTS[v.n + 1] + 3))
  }
  const ninth = VARIATIONS.find((v) => v.bassless)!.n
  return {
    lit,
    second: smooth(t, STARTS[16], STARTS[16] + 40) * lit,
    cool,
    bass: 1 - pulse(t, STARTS[ninth] - 1.5, STARTS[ninth] + 5, STARTS[ninth + 1] - 3, STARTS[ninth + 1] + 4),
    warm: smooth(t, 0, 60) * lit * (0.3 + 0.7 * smooth(t, STARTS[1], STARTS[30])),
  }
}

/** The lamp light's colour: gold, and cooler in the minor. */
const lampColor = (cool: number): string => mixHex(GOLD, COOL, cool * 0.85)

/**
 * How bright the lamp over column `b` burns at `time`, 0 to 1: it catches as the ball goes by, flares, and settles to a
 * glow that it keeps until the ball comes by again. Where the ball has not yet come by in the Aria it is out.
 */
export function lampAt(b: number, time: number): number {
  const room = roomAt(time)
  const { v, p } = lapAt(time)
  const a = p * COLUMNS - b
  if (v === 0 && a < 0) return 0
  const since = v === 0 ? a : ((a % COLUMNS) + COLUMNS) % COLUMNS
  const base = v === 0 ? 0.3 * smooth(since, 0, 2) : 0.3
  return clamp((base + 0.7 * Math.exp(-since / 4.5) * smooth(since, 0, 0.12)) * room.bass * room.lit)
}

/** How lit the Aria's petal `b` is: it opens as the ball passes in the Aria, and glimmers as it passes after. */
export function petalAt(b: number, time: number): number {
  const room = roomAt(time)
  const { v, p } = lapAt(time)
  const a = p * COLUMNS - b
  if (v === 0 && a < 0) return 0
  const since = v === 0 ? a : ((a % COLUMNS) + COLUMNS) % COLUMNS
  const open = v === 0 ? smooth(since, 0, 2) : 1
  return clamp(open * (0.55 + 0.45 * Math.exp(-since / 5) * (v === 0 ? 1 : 0.4)) * room.lit)
}

/**
 * The ring a variation engraves, as a share of the ring's radius: the Aria's rose tip, each variation's ring, the last,
 * closing one. The thirty variations go in from the outside in Bach's ten groups of three (each closed by a canon, the
 * last by the quodlibet), so the floor is ten bands with dark between them rather than thirty lines evenly spaced.
 */
export const ROSE = 0.29
const OUTER = 0.9
const INNER = 0.36
/** The dark between two groups, in the steps between two rings of a group. */
const GAP = 2.2
const STEP = (OUTER - INNER) / (10 * 2 + 9 * GAP)
export function ringRadius(n: number): number {
  if (n === 0) return ROSE
  if (n === 31) return 0.985
  const g = Math.floor((n - 1) / 3)
  return OUTER - STEP * (g * (2 + GAP) + ((n - 1) % 3))
}

/** The colour a variation engraves in the floor: gold, ivory for the canons and the ends, and cool for the minor. */
export function ringTint(spec: Variation, cool = 0): string {
  const base = spec.kind === 'hands' ? mixHex(GOLD, IVORY, 0.35) : spec.kind === 'free' || spec.kind === 'overture' ? GOLD : spec.kind === 'pearl' ? COOL : IVORY
  return spec.minor ? mixHex(base, COOL, 0.55 + 0.4 * cool) : base
}

/**
 * How deep a variation's ring is cut, once it is cut: how bright it rests, and how wide it is in device pixels. The
 * canons that close the groups are the floor's spine; the overture, the Adagio and the ends are its landmarks; the rest
 * are fine lines, there to be counted but not to be looked at.
 */
function ringCut(spec: Variation): { a: number; w: number } {
  if (spec.kind === 'overture' || spec.kind === 'pearl') return { a: 0.55, w: 2.2 }
  if (spec.kind === 'canon' || spec.kind === 'quodlibet' || spec.kind === 'capo') return { a: 0.4, w: 1.5 }
  return { a: 0.16, w: 1 }
}

// ---------------------------------------------------------------- the air

const GRID: [number, number][] = []
for (let x = -30; x <= 30; x += 2) for (let y = -22; y <= 14; y += 2) GRID.push([x, y])
export const everywhere = GRID

const MOTES = 84

export const air = scenery<null>('air', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const t = wrap(c.t)
  const room = roomAt(t)
  ctx.save()
  ctx.scale(k, k)
  // The dark of the room, and a warm haze behind the colonnade that grows with what has been played.
  const haze = ctx.createRadialGradient(0, -1.8, 0.5, 0, -1.8, 12)
  haze.addColorStop(0, rgba('#5A3D4C', 0.1 + 0.34 * room.warm))
  haze.addColorStop(0.5, rgba('#2A1D33', 0.16 + 0.2 * room.warm))
  haze.addColorStop(1, rgba('#0B0910', 0))
  ctx.fillStyle = haze
  ctx.fillRect(-32, -24, 64, 48)

  // Motes that fall slowly through the light: a whole number of times a period, so they are where they were at the end.
  const beam = room.second
  for (let i = 0; i < MOTES; i++) {
    const cycles = 28 + Math.floor(hash(i, 1) * 44)
    const phase = hash(i, 2)
    const fall = (((cycles * t) / PERIOD + phase) % 1 + 1) % 1
    const x0 = (hash(i, 3) - 0.5) * 17
    const x = x0 + 0.4 * Math.sin((two * (6 + Math.floor(hash(i, 4) * 10)) * t) / PERIOD + hash(i, 5) * two)
    const y = -7.6 + fall * 11.2
    const inBeam = beam * smooth(0.55 + (y + 7.6) * 0.09 - Math.abs(x), 0, 0.5)
    const twinkle = 0.75 + 0.25 * Math.sin((two * (90 + Math.floor(hash(i, 6) * 60)) * t) / PERIOD + hash(i, 7) * two)
    const a = (0.06 + 0.14 * hash(i, 8) + 0.5 * inBeam) * Math.sin(Math.PI * fall) ** 2 * twinkle * (0.35 + 0.65 * Math.max(room.lit, 0.4)) * room.lit
    if (a < 0.01) continue
    ctx.fillStyle = rgba(mixHex(IVORY, GOLD, inBeam), a)
    ctx.beginPath()
    ctx.arc(x, y, 0.018 + 0.03 * hash(i, 9) + 0.01 * inBeam, 0, two)
    ctx.fill()
  }
  ctx.restore()
})

// ---------------------------------------------------------------- the floor

/** A ring of the floor on the screen from `phi0` to `phi1` (clockwise from above), as a path in world cells. */
function arc(ctx: Ctx2D, view: View, r: number, phi0: number, phi1: number): void {
  ctx.beginPath()
  ctx.ellipse(0, 0, r, r * view.sin, 0, Math.PI / 2 - phi0 + view.turn, Math.PI / 2 - phi1 + view.turn, true)
}

/** How many bars of a ring behind the ball's head are still bright with being cut, and how fast they settle. */
const HEAD = 6
const SETTLE = 1.5

export const floor = scenery<null>('floor', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const t = wrap(c.t)
  const room = roomAt(t)
  const view = viewAt(t)
  const px = Math.max(1, k / 620) / k
  const { v, p: lap } = lapAt(t)
  const laps = lapsAt(t)
  ctx.save()
  ctx.scale(k, k)
  ctx.save()
  ctx.scale(1, view.sin)
  // Plan coordinates for the fills: the ellipse of a circle on the floor is the circle of the plan.
  const wide = RING * 1.14
  const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, wide)
  disc.addColorStop(0, mixHex('#1B141F', '#2E2028', room.warm))
  disc.addColorStop(0.75, mixHex('#140F18', '#1E1620', room.warm))
  disc.addColorStop(1, '#0F0B13')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(0, 0, wide, 0, two)
  ctx.fill()
  // The pool of light under the middle, from the rose.
  const rose = ctx.createRadialGradient(0, 0, 0, 0, 0, RING * 0.5)
  rose.addColorStop(0, rgba(lampColor(room.cool), 0.22 * room.warm * room.lit))
  rose.addColorStop(1, rgba(lampColor(room.cool), 0))
  ctx.fillStyle = rose
  ctx.beginPath()
  ctx.arc(0, 0, RING * 0.5, 0, two)
  ctx.fill()

  // The Aria's rose: thirty-two petals, one to a bar, each opening as the ball passes its column.
  for (let b = 0; b < COLUMNS; b++) {
    const a = petalAt(b, t)
    if (a < 0.01) continue
    const phi = (b / COLUMNS) * two - view.turn
    const half = 0.1
    const tip = (phi0: number, r0: number): [number, number] => [r0 * Math.sin(phi0), r0 * Math.cos(phi0)]
    const [bx, bz] = tip(phi, RING * 0.05)
    const [tx, tz] = tip(phi, RING * ROSE)
    const [lx, lz] = tip(phi - half, RING * 0.2)
    const [rx, rz] = tip(phi + half, RING * 0.2)
    ctx.beginPath()
    ctx.moveTo(bx, bz)
    ctx.quadraticCurveTo(lx, lz, tx, tz)
    ctx.quadraticCurveTo(rx, rz, bx, bz)
    ctx.fillStyle = rgba(mixHex(lampColor(room.cool), IVORY, 0.15), 0.32 * a)
    ctx.fill()
    ctx.lineWidth = 0.022
    ctx.strokeStyle = rgba(IVORY, 0.55 * a)
    ctx.stroke()
  }
  ctx.restore()

  // The step the colonnade stands on.
  ctx.lineWidth = px
  ctx.strokeStyle = rgba(GOLD, 0.1 + 0.08 * room.warm)
  arc(ctx, view, RING * 1.1, 0, two)
  ctx.stroke()

  // The rings: a lap of the ball cuts one, bright at the head and settling as the ball goes on. The da capo dims them
  // as it closes the last round all of them.
  const gather = v === 31 ? smooth(lap, 0.05, 0.6) : 0
  for (let n = 1; n <= Math.min(v, 31); n++) {
    const spec = VARIATIONS[n]
    const cut = ringCut(spec)
    const done = clamp(laps - n)
    if (done <= 0) continue
    const dim = n === 31 ? 1 : 1 - 0.62 * gather
    ctx.lineWidth = cut.w * px
    ctx.strokeStyle = rgba(ringTint(spec, room.cool), cut.a * dim * room.lit)
    arc(ctx, view, ringRadius(n) * RING, 0, two * done)
    ctx.stroke()
  }
  // The head: the last few bars cut, the ring's own line brighter and a little wider the more lately it was cut.
  for (const n of [v - 1, v]) {
    if (n < 1 || n > 31) continue
    const spec = VARIATIONS[n]
    const cut = ringCut(spec)
    const done = clamp(laps - n)
    const from = Math.max(0, done - HEAD * BAR)
    if (done - from < 1e-4) continue
    const pieces = 18
    for (let j = 0; j < pieces; j++) {
      const f0 = from + ((done - from) * j) / pieces
      const f1 = from + ((done - from) * (j + 1)) / pieces
      const since = (laps - n - (f0 + f1) / 2) * COLUMNS
      const fresh = Math.exp(-since / SETTLE)
      if (fresh < 0.02) continue
      ctx.lineWidth = (cut.w + 0.8 * fresh) * px
      ctx.strokeStyle = rgba(mixHex(ringTint(spec, room.cool), IVORY, 0.5 * fresh), 0.55 * fresh * room.lit)
      arc(ctx, view, ringRadius(n) * RING, two * f0, two * f1 + 0.002)
      ctx.stroke()
    }
  }
  ctx.restore()
})

// ---------------------------------------------------------------- the colonnade

const capital = (a: number): string => mixHex('#1E1724', '#5B4538', a)

/** The columns and the band over them, from the back to the front. */
export const colonnade = scenery<null>('colonnade', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const t = wrap(c.t)
  const room = roomAt(t)
  const hair = hairs(k)
  const lamp = lampColor(room.cool)
  const view = viewAt(t)
  ctx.save()
  ctx.scale(k, k)

  const lit = (b: number) => lampAt(b, t)
  const order = Array.from({ length: COLUMNS }, (_, b) => b).sort((a, b) => depth((a / COLUMNS) * two, RING, view) - depth((b / COLUMNS) * two, RING, view))

  const column = (b: number): void => {
    const phi = (b / COLUMNS) * two
    const [x, yb] = floorPt(phi, RING, view)
    const z = RING * Math.cos(phi - view.turn)
    const s = 1 + 0.12 * (z / RING)
    const top = yb - HEIGHT * view.cos
    const wb = 0.135 * s
    const wt = 0.105 * s
    const face = 0.5 - 0.5 * Math.cos(phi - view.turn)
    const glow = lit(b)
    // Its shadow on the floor.
    ctx.fillStyle = rgba('#000000', 0.32)
    ctx.beginPath()
    ctx.ellipse(x, yb + 0.02, 0.34 * s, 0.11 * s, 0, 0, two)
    ctx.fill()
    // The shaft: lit from the middle of the room, so the back ones show their lit faces and the front ones are dark, with a lit edge.
    const g = ctx.createLinearGradient(0, top, 0, yb)
    const body = mixHex('#17111D', '#3F312F', face * (0.35 + 0.65 * room.warm))
    g.addColorStop(0, mixHex(body, lamp, 0.62 * glow))
    g.addColorStop(0.6, mixHex(body, lamp, 0.14 * glow))
    g.addColorStop(1, mixHex(body, '#0E0A12', 0.4))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x - wt, top)
    ctx.lineTo(x + wt, top)
    ctx.lineTo(x + wb, yb)
    ctx.lineTo(x - wb, yb)
    ctx.closePath()
    ctx.fill()
    // The edge that faces the middle of the room catches its light.
    const side = x > 0.02 ? -1 : x < -0.02 ? 1 : 0
    if (side) {
      ctx.strokeStyle = rgba(lamp, (0.1 + 0.5 * glow) * (0.4 + 0.6 * room.warm) * (0.4 + 0.6 * face))
      ctx.lineWidth = hair * 1.2
      ctx.beginPath()
      ctx.moveTo(x + side * wt * 0.9, top)
      ctx.lineTo(x + side * wb * 0.9, yb)
      ctx.stroke()
    }
    // Foot and head.
    ctx.fillStyle = capital(face * 0.5 + 0.3 * glow)
    ctx.fillRect(x - wb * 1.35, yb - 0.07, wb * 2.7, 0.07)
    ctx.fillRect(x - wt * 1.5, top, wt * 3, 0.06)
  }

  /** The band over the columns from `phi0` to `phi1`, and the lamp panes in it. */
  const band = (phi0: number, phi1: number, inside: boolean): void => {
    const steps = 48
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const [x, y] = project(phi0 + ((phi1 - phi0) * i) / steps, RING, RAIL, view)
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    for (let i = steps; i >= 0; i--) {
      const [x, y] = project(phi0 + ((phi1 - phi0) * i) / steps, RING, HEIGHT, view)
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    const face = inside ? 0.6 : 0.05
    ctx.fillStyle = mixHex('#191220', '#3A2C30', face * (0.4 + 0.6 * room.warm))
    ctx.fill()
    // The rail: its top edge.
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const [x, y] = project(phi0 + ((phi1 - phi0) * i) / steps, RING, RAIL, view)
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.strokeStyle = rgba(GOLD, 0.34 + 0.26 * room.warm)
    ctx.lineWidth = hair * 1.5
    ctx.stroke()
    // The lamps.
    for (let b = 0; b < COLUMNS; b++) {
      const phi = (b / COLUMNS) * two
      const rel = ((phi - phi0 + 4 * two) % two)
      if (rel > phi1 - phi0) continue
      const w = 0.11 * Math.abs(Math.cos(phi - view.turn))
      if (w < 0.012) continue
      const [x, y] = project(phi, RING, (RAIL + HEIGHT) / 2, view)
      const a = lit(b)
      ctx.fillStyle = rgba(lamp, 0.1 + 0.9 * a)
      ctx.fillRect(x - w, y - 0.115 * view.cos, w * 2, 0.23 * view.cos)
      ctx.strokeStyle = rgba(lamp, 0.25 + 0.4 * a)
      ctx.lineWidth = hair
      ctx.strokeRect(x - w, y - 0.115 * view.cos, w * 2, 0.23 * view.cos)
    }
  }

  // Back: the far half of the band, and the columns from the back to the front. Then the near half of the band.
  band(view.turn + Math.PI / 2, view.turn + (3 * Math.PI) / 2, true)
  for (const b of order) column(b)
  band(view.turn - Math.PI / 2, view.turn + Math.PI / 2, false)

  // A canon's second rail, higher by its interval, that its second voice goes round on.
  const { v, p: lap } = lapAt(t)
  const spec = VARIATIONS[v]
  if (spec.kind === 'canon' && (spec.interval ?? 1) > 1) {
    const e = smooth(lap, 0, 3 * BAR) * (1 - smooth(lap, 1 - 3 * BAR, 1))
    const h = SEAT + ((spec.interval ?? 1) - 1) * 0.15 - 0.2
    ctx.setLineDash([0.05, 0.1])
    ctx.strokeStyle = rgba(SILVER, 0.22 * e)
    ctx.lineWidth = hair * 1.2
    ctx.beginPath()
    for (let i = 0; i <= 96; i++) {
      const [x, y] = project((i / 96) * two, RING, h, view)
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
})

// ---------------------------------------------------------------- the light

/** What is over the balls: the lamps' glow, the light that comes in from above, the balls' own light. All of it added. */
export const glow = scenery<null>('glow', () => {}, (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const t = wrap(c.t)
  const room = roomAt(t)
  const lamp = lampColor(room.cool)
  const view = viewAt(t)
  ctx.save()
  ctx.scale(k, k)
  ctx.globalCompositeOperation = 'lighter'

  for (let b = 0; b < COLUMNS; b++) {
    const a = lampAt(b, t)
    if (a < 0.02) continue
    const phi = (b / COLUMNS) * two
    const [x, y] = project(phi, RING, (RAIL + HEIGHT) / 2, view)
    const r = 0.5 + 1.1 * a
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, rgba(lamp, 0.34 * a * a + 0.06 * a))
    g.addColorStop(1, rgba(lamp, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // From above, into the middle of the room: the second half.
  if (room.second > 0.01) {
    const [, top] = project(0, 0, HEIGHT + 4.2, view)
    const [, foot] = project(0, 0, 0, view)
    const g = ctx.createLinearGradient(0, top, 0, foot)
    g.addColorStop(0, rgba(GOLD, 0))
    g.addColorStop(0.5, rgba(GOLD, 0.05 * room.second))
    g.addColorStop(1, rgba(GOLD, 0.13 * room.second))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-0.7, top)
    ctx.lineTo(0.7, top)
    ctx.lineTo(1.9, foot)
    ctx.lineTo(-1.9, foot)
    ctx.closePath()
    ctx.fill()
  }

  // The balls' light.
  for (const r of ridersAt(t)) {
    if ((r.scale ?? 1) < 0.05) continue
    const s = r.scale ?? 1
    const rad = 0.75 * s
    const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad)
    g.addColorStop(0, rgba(r.color, 0.3 * Math.min(1, s)))
    g.addColorStop(1, rgba(r.color, 0))
    ctx.fillStyle = g
    ctx.fillRect(r.x - rad, r.y - rad, rad * 2, rad * 2)
  }
  // The point of the ring being cut, under the ball: it lifts between one ring and the next.
  const { v, p: lap } = lapAt(t)
  const pen = smooth(lap, 0, BAR) * (1 - smooth(lap, 1 - BAR, 1)) * room.lit * (v === 0 ? smooth(t, 3, 12) : 1)
  if (pen > 0.01) {
    const [px, py] = floorPt(two * lap, ringRadius(v) * RING, view)
    const rad = 0.16
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad)
    g.addColorStop(0, rgba(IVORY, 0.8 * pen))
    g.addColorStop(0.35, rgba(GOLD, 0.25 * pen))
    g.addColorStop(1, rgba(GOLD, 0))
    ctx.fillStyle = g
    ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2)
  }
  ctx.restore()
})
