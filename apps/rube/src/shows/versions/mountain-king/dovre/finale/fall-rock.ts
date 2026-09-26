import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import type { Pen } from '../troll'
import { SKY, STONE, WORKS } from '../worlds'

/**
 * The finale's stone: what the geyser breaks on its way up, and what comes down round it. Everything here is laid out
 * in world cells and drawn in the fall part's frame (`o` is that frame's origin in the world), so it lines up with the
 * rooms the other parts drew: the heart (floor 33.13), the drum (floor 25.13, the heart's ceiling 26.5), the mine
 * (floor 17.13, the drum's ceiling 18.5), the hall (floor 8.13, the mine's ceiling 10), the vent from the hall's vault
 * (-3.2) up to the summit's cap (-19.4), and the cap itself up to the surface (≈ -21).
 */

/** Gravity for falling stone, cells/s². The house's `G_EARTH`. */
export const G = 12

/** The colour of the rock's own hollow (a shaft's back wall), unlit to lit: `rock.ts`'s `hollow` colour. */
export const hollowOf = (lit: number): string => mixHex(mixHex(STONE.deep, STONE.dark, 0.45), STONE.dark, Math.max(0, Math.min(1, lit)))

/* ------------------------------------------------------------------ a floor breaking */

/** A floor between two rooms that the geyser breaks: its top and underside (world y), when it cracks and when it bursts. */
export interface Floor {
  top: number
  bot: number
  crack: number
  burst: number
}

/**
 * A floor's breach at world column `x`: nothing before it cracks; dark cracks running out through the slab from
 * where he is rammed against its underside; then, from the burst, a ragged hole through it (the chunks are stones).
 */
export function breach(p: p5, c: Pen, o: Pt, x: number, f: Floor, T: number, q: Pt): void {
  if (T < f.crack) return
  const k = c.k
  const X = (v: number) => (v - o[0] + q[0]) * k
  const Y = (v: number) => (v - o[1] + q[1]) * k
  p.push()
  p.noStroke()
  if (T < f.burst) {
    // The fracture: from where he is rammed against the underside, three fine cracks of different lengths run out
    // through the slab at different angles, mostly sideways (never up out of it): a break, not a sign.
    const grow = smooth(T, f.crack, f.crack + 0.2)
    const h = f.bot - f.top
    p.fill(mixHex(STONE.deep, STONE.mid, 0.25))
    const seed = Math.round(f.crack * 10)
    for (let i = 0; i < 3; i++) {
      const side = hash(seed, i, 34) < 0.5 ? -1 : 1
      const steep = 0.2 + 0.9 * hash(seed, i, 35)
      const reach = (0.3 + 0.55 * hash(seed, i, 36)) * grow
      const pts: Pt[] = [[x + side * 0.02, f.bot - 0.01]]
      for (let j = 1; j <= 3; j++) {
        const u = j / 3
        pts.push([x + side * reach * u, f.bot - Math.min(h * 0.8, reach * u * steep) + 0.05 * (hash(seed, i * 5 + j, 3) - 0.5)])
      }
      const w = 0.013 * grow
      p.beginShape()
      for (const [a, b] of pts) p.vertex(X(a), Y(b - w))
      for (let j = pts.length - 1; j >= 0; j--) p.vertex(X(pts[j][0]), Y(pts[j][1] + w * (1 - j / 4)))
      p.endShape(p.CLOSE)
    }
    const fell = T - f.crack
    p.fill(STONE.mid)
    for (let i = 0; i < 4; i++) {
      const u = fell - 0.06 * i
      if (u < 0 || u > 0.7) continue
      const gx = x + (i % 2 ? 1 : -1) * (0.2 + 0.12 * hash(i, 33))
      const gy = f.bot + 0.5 * G * u * u
      p.push()
      p.translate(X(gx), Y(gy))
      p.rotate(u * 7 + i)
      p.triangle(-0.025 * k, 0.02 * k, 0.03 * k, 0.015 * k, 0, -0.03 * k)
      p.pop()
    }
  } else {
    // The hole: through the slab, ragged at its sides; you see the chimney's own dark through it.
    const open = smooth(T, f.burst, f.burst + 0.12)
    const hw = 0.66 * (0.3 + 0.7 * open)
    p.fill(hollowOf(0.1))
    p.beginShape()
    const n = 7
    for (let j = 0; j <= n; j++) {
      const y = f.top - 0.04 + ((f.bot - f.top + 0.1) * j) / n
      p.vertex(X(x - hw - 0.22 * hash(j, Math.round(f.burst * 10), 41) + 0.1), Y(y))
    }
    for (let j = n; j >= 0; j--) {
      const y = f.top - 0.04 + ((f.bot - f.top + 0.1) * j) / n
      p.vertex(X(x + hw + 0.22 * hash(j, Math.round(f.burst * 10), 42) - 0.1), Y(y))
    }
    p.endShape(p.CLOSE)
    // The broken ends of the floor's lit lip, turned down a little into the hole.
    p.fill(STONE.mid)
    for (const s of [-1, 1]) {
      const e = x + s * (hw + 0.02)
      p.triangle(X(e), Y(f.top), X(e + s * 0.22), Y(f.top), X(e + s * 0.02), Y(f.top + 0.16))
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the vent */

/** The vent over the hall: a crooked natural shaft from the vault to the summit's cap, world cells. */
export const VENT = { bottom: -3.2, top: -19.4 }

/** The vent's middle and half-width at world height y (x is its column). */
function ventAt(y: number, x: number): [number, number] {
  const u = (y - VENT.top) / (VENT.bottom - VENT.top)
  // Its walls are broken rock: straight between knots a little under a cell apart, each knot pushed in or out.
  const step = 0.85
  const j = Math.floor((y - VENT.top) / step)
  const f = (y - VENT.top) / step - j
  const knot = (i: number, s: number) => 0.14 * (hash(i, s) - 0.5)
  const mid = x + 0.14 * Math.sin(y * 0.33 + 0.8)
  const left = 0.62 + knot(j, 101) * (1 - f) + knot(j + 1, 101) * f
  const right = 0.62 + knot(j, 102) * (1 - f) + knot(j + 1, 102) * f
  let hw = (left + right) / 2
  let shift = (right - left) / 2
  // It narrows under the cap and flares into the vault like a mouth.
  const narrow = 0.72 + 0.28 * smooth(u, 0, 0.1)
  hw = hw * narrow + 0.55 * smooth(u, 0.88, 1)
  shift *= narrow
  return [mid + shift, hw]
}

/**
 * The vent: a hollow a step above the rock, faint before the finale (a crack over the hall that only a wide shot
 * sees). Once the geyser's spray is in it its back wall shows wet and its sides round off, so it reads as a shaft;
 * then day comes down it from the top once the cap is gone.
 */
export function vent(p: p5, c: Pen, o: Pt, x: number, q: Pt, light: { wet: number; day: number; shut?: number }): void {
  const k = c.k
  const X = (v: number) => (v - o[0] + q[0]) * k
  const Y = (v: number) => (v - o[1] + q[1]) * k
  const n = 120
  const rows: [number, number, number][] = []
  for (let j = 0; j <= n; j++) {
    const y = VENT.top + ((VENT.bottom - VENT.top) * j) / n
    const [m, hw] = ventAt(y, x)
    rows.push([m - hw, m + hw, y])
  }
  const band = (from: (r: [number, number, number]) => number, to: (r: [number, number, number]) => number) => {
    p.beginShape()
    for (const r of rows) p.vertex(X(from(r)), Y(r[2]))
    for (let j = rows.length - 1; j >= 0; j--) p.vertex(X(to(rows[j])), Y(rows[j][2]))
    p.endShape(p.CLOSE)
  }
  // Once the crater's rubble has closed it, the shaft goes back to the dark of the rock round it (a trace of his way).
  const back = mixHex(mixHex(hollowOf(0.2), STONE.mid, 0.2 * light.wet), STONE.deep, 0.7 * (light.shut ?? 0))
  p.push()
  p.noStroke()
  p.fill(back)
  band((r) => r[0], (r) => r[1])
  if (light.wet * (1 - (light.shut ?? 0)) > 0.01) {
    // One side a shade lighter where the rock turns toward us, broad and soft, so it reads as a shaft.
    p.fill(alpha(p, STONE.mid, 0.2 * light.wet))
    band((r) => r[0], (r) => r[0] + (r[1] - r[0]) * 0.22)
  }
  p.pop()
  // Day coming down the shaft from the top (light: the one kind of gradient allowed).
  if (light.day > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, Y(VENT.top - 0.3), 0, Y(VENT.top + 5))
    g.addColorStop(0, `rgba(143,180,216,${0.32 * light.day})`)
    g.addColorStop(1, 'rgba(143,180,216,0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(X(rows[0][0]), Y(rows[0][2]))
    for (const r of rows) ctx.lineTo(X(r[0]), Y(r[2]))
    for (let j = rows.length - 1; j >= 0; j--) ctx.lineTo(X(rows[j][1]), Y(rows[j][2]))
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the cap */

/**
 * The cracks the roll opens in the summit's cap, one on each of its accents, the dawn's light showing through them:
 * fine, irregular, widening a little until the cap bursts; a pale wash of that light falls down the vent under
 * them, and grit sifts out of them.
 */
export function capCracks(p: p5, c: Pen, o: Pt, x: number, T: number, q: Pt, at: number[], burst: number, surf: (x: number) => number): void {
  if (T < at[0] || T >= burst) return
  const k = c.k
  const X = (v: number) => (v - o[0] + q[0]) * k
  const Y = (v: number) => (v - o[1] + q[1]) * k
  const press = smooth(T, at[0], burst)
  const opened = at.filter((t0) => T >= t0).length
  // The light through them, down the vent: a soft pale wash widening downward (light, so a gradient).
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const top = Y(VENT.top)
  const g = ctx.createLinearGradient(0, top, 0, Y(VENT.top + 3.2))
  g.addColorStop(0, `rgba(242,196,141,${(0.1 + 0.07 * opened) * (0.6 + 0.4 * press)})`)
  g.addColorStop(1, 'rgba(242,196,141,0)')
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(X(x - 0.22), top)
  ctx.lineTo(X(x + 0.22), top)
  ctx.lineTo(X(x + 0.62), Y(VENT.top + 3.2))
  ctx.lineTo(X(x - 0.62), Y(VENT.top + 3.2))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  p.push()
  p.noStroke()
  at.forEach((t0, i) => {
    if (T < t0) return
    // A fissure opening down through the cap from the sky: widest at the surface, where the dawn gets in, narrowing to
    // nothing short of the vent's roof, and clear of him to either side (never a line from the ball to the sky).
    const grow = smooth(T, t0, t0 + 0.2)
    const side = i % 2 === 0 ? -1 : 1
    const x1 = x + side * (0.45 + 0.28 * i + 0.1 * hash(i, 52))
    const x0 = x + side * (0.3 + 0.12 * i)
    const ceil = surf(x1)
    const floor = VENT.top - 0.3
    const mouth = (0.07 + 0.05 * hash(i, 54)) * (0.5 + 0.5 * smooth(T, t0, burst))
    const n = 6
    const mid: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const y = ceil + (floor - ceil) * u * grow
      mid.push([x1 + (x0 - x1) * u + 0.07 * (hash(i, j, 53) - 0.5) * (j > 0 && j < n ? 1 : 0), y])
    }
    const band = (w: number, col: string, a: number) => {
      p.fill(alpha(p, col, a))
      p.beginShape()
      for (const [j, [a0, b0]] of mid.entries()) p.vertex(X(a0 - w * (1 - j / n) - 0.004), Y(b0))
      for (let j = n; j >= 0; j--) p.vertex(X(mid[j][0] + w * (1 - j / n) + 0.004), Y(mid[j][1]))
      p.endShape(p.CLOSE)
    }
    band(mouth * 2.6, SKY.dawn, 0.14)
    band(mouth, mixHex(SKY.dawn, SKY.sun, 0.4), 0.8)
    // Grit sifting out of it, down the vent past him.
    p.fill(STONE.mid)
    for (let j = 0; j < 3; j++) {
      const u = (T - t0 + j * 0.23) % 0.7
      const gx = x0 + side * 0.05 * j
      const gy = VENT.top + 0.5 * G * u * u
      p.ellipse(X(gx), Y(gy), 0.022 * k, 0.03 * k)
    }
  })
  p.pop()
}

/* ------------------------------------------------------------------ stones */

/**
 * A stone: from `from` at t0 to `to` at t1 (world cells), on the parabola gravity draws between them (a stone let go
 * from a ceiling falls from rest: make t1 − t0 its fall time; a chunk thrown by the burst flies). It lies where it
 * lands, settling flat, and throws up dust; `shatter` breaks it on landing instead. `emerge`: it shows in the ceiling,
 * loosening, for that long before it goes.
 */
export interface Stone {
  from: Pt
  t0: number
  to: Pt
  t1: number
  size: number
  seed: number
  spin: number
  shatter?: boolean
  emerge?: number
  /** A stalactite: a hanging spike that falls point down. */
  spike?: boolean
}

/** A stone let go from rest at `from` (world), falling straight down to land at `floorTop` at show time `t1`. */
export function dropped(x: number, y: number, floorTop: number, t1: number, size: number, seed: number, extra: Partial<Stone> = {}): Stone {
  const rest = floorTop - 0.36 * size
  const h = Math.max(0.01, rest - y)
  return { from: [x, y], t0: t1 - Math.sqrt((2 * h) / G), to: [x, rest], t1, size, seed, spin: 0.6 * (hash(seed, 61) - 0.5), emerge: 0.45, ...extra }
}

/** A chunk thrown from `from` at t0 to land on a floor (world y of its top) at `x` at t1. */
export function thrown(from: Pt, t0: number, x: number, floorTop: number, t1: number, size: number, seed: number, extra: Partial<Stone> = {}): Stone {
  return { from, t0, to: [x, floorTop - 0.36 * size], t1, size, seed, spin: (hash(seed, 62) - 0.5) * 9, ...extra }
}

/** A stone's outline: a rough shard of 6 or 7 corners, `size` across, around its middle. */
function shard(seed: number, size: number): Pt[] {
  const n = 6 + Math.floor(hash(seed, 71) * 2)
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4 * (hash(seed, i, 72) - 0.5)
    const r = size * (0.36 + 0.16 * hash(seed, i, 73))
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.82])
  }
  return pts
}

/** Where a stone is at show time T (world), its angle, and how long since it landed (negative in flight). */
export function stoneAt(s: Stone, T: number): { at: Pt; angle: number; since: number } | null {
  if (T < s.t0 - (s.emerge ?? 0)) return null
  const dur = s.t1 - s.t0
  const u = Math.max(0, Math.min(dur, T - s.t0))
  const vx = (s.to[0] - s.from[0]) / dur
  const vy = (s.to[1] - s.from[1] - 0.5 * G * dur * dur) / dur
  const at: Pt = [s.from[0] + vx * u, s.from[1] + vy * u + 0.5 * G * u * u]
  const a0 = s.spike ? 0 : hash(s.seed, 74) * Math.PI
  const land = a0 + s.spin * dur
  const flat = Math.round(land / (Math.PI / 3)) * (Math.PI / 3)
  const angle = T <= s.t1 ? a0 + s.spin * u : land + (flat - land) * smooth(T, s.t1, s.t1 + 0.4)
  return { at, angle, since: T - s.t1 }
}

/** Draw a stone at show time T, and its dust once it has landed. */
export function stone(p: p5, c: Pen, o: Pt, s: Stone, T: number, q: Pt, lit: number): void {
  const where = stoneAt(s, T)
  if (!where) return
  const { k, ink, weight } = c
  const loosen = T < s.t0 ? smooth(T, s.t0 - (s.emerge ?? 0), s.t0) : 1
  const settled = where.since > 0
  const qq: Pt = settled || T < s.t0 ? q : [0, 0]
  const x = where.at[0] - o[0] + qq[0]
  const y = where.at[1] - o[1] + qq[1]
  const face = mixHex(STONE.dark, STONE.mid, 0.35 + 0.65 * lit)
  const top = mixHex(STONE.mid, STONE.light, 0.3 + 0.7 * lit)
  if (s.shatter && where.since > 0) {
    // In three pieces, thrown a little apart, gone into the dust.
    const u = Math.min(1, where.since / 0.6)
    if (u < 1) {
      p.push()
      p.noStroke()
      p.fill(alpha(p, face, 1 - u))
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 0.5 * s.size * Math.sqrt(u)
        const dy = -0.3 * s.size * Math.sin(Math.PI * u) * (i === 1 ? 1.4 : 1)
        p.push()
        p.translate((x + dx) * k, (y + dy + 0.2 * s.size) * k)
        p.rotate(where.angle + i * 1.3 + u * 2 * (i - 1))
        p.beginShape()
        for (const [a, b] of shard(s.seed * 7 + i, s.size * 0.45)) p.vertex(a * k, b * k)
        p.endShape(p.CLOSE)
        p.pop()
      }
      p.pop()
    }
  } else {
    p.push()
    p.translate(x * k, y * k)
    p.rotate(where.angle)
    const edge = alpha(p, mixHex(ink, STONE.deep, 0.55), loosen)
    p.stroke(edge)
    p.strokeWeight(weight * 0.7)
    if (s.spike) {
      // A stalactite, point down: broad at its broken root, a wet tip.
      const L = s.size
      const w = s.size * 0.32
      p.fill(alpha(p, face, loosen))
      p.beginShape()
      p.vertex(-w * k * 0.5, -L * 0.45 * k)
      p.vertex(w * k * 0.5, -L * 0.42 * k)
      p.bezierVertex(w * 0.4 * k, -L * 0.1 * k, w * 0.12 * k, L * 0.3 * k, 0, L * 0.55 * k)
      p.bezierVertex(-w * 0.12 * k, L * 0.3 * k, -w * 0.4 * k, -L * 0.1 * k, -w * 0.5 * k, -L * 0.45 * k)
      p.endShape(p.CLOSE)
      p.noStroke()
      p.fill(alpha(p, STONE.wet, 0.6 * loosen))
      p.triangle(-w * 0.1 * k, L * 0.4 * k, w * 0.1 * k, L * 0.4 * k, 0, L * 0.55 * k)
    } else {
      const pts = shard(s.seed, s.size)
      p.fill(alpha(p, face, loosen))
      p.beginShape()
      for (const [a, b] of pts) p.vertex(a * k, b * k)
      p.endShape(p.CLOSE)
      // The lit top facet.
      p.noStroke()
      p.fill(alpha(p, top, loosen))
      p.beginShape()
      for (const [a, b] of pts) if (b < 0.05 * s.size) p.vertex(a * 0.78 * k, (b * 0.78 - 0.03 * s.size) * k)
      p.endShape(p.CLOSE)
    }
    p.pop()
  }
  if (settled) puff(p, c, s.to[0] - o[0] + q[0], s.to[1] - o[1] + q[1] + 0.36 * s.size, where.since, s.size, lit)
}

/**
 * Dust thrown up where something lands on a floor at (x, y) (the caller's frame), `since` seconds ago: a low, wide,
 * soft skirt that spreads and settles. Never a round cloud.
 */
export function puff(p: p5, c: Pen, x: number, y: number, since: number, size: number, lit: number, colour?: string): void {
  if (since < 0 || since > 1.8) return
  const k = c.k
  const u = since / 1.8
  const col = colour ?? mixHex(STONE.mid, STONE.light, 0.5 + 0.5 * lit)
  p.push()
  p.noStroke()
  for (let i = 0; i < 3; i++) {
    const spread = size * (0.6 + 1.4 * Math.sqrt(u)) * (1 + 0.3 * i)
    const rise = size * (0.12 + 0.28 * Math.sqrt(u)) * (1 - 0.25 * i)
    p.fill(alpha(p, col, 0.28 * (1 - u) * (1 - 0.25 * i)))
    p.ellipse((x + (i - 1) * 0.12 * size * u) * k, (y - rise * 0.5) * k, spread * 2 * k, rise * 2 * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the foot */

/**
 * The standpipe at the chimney's foot: an iron pipe coming up through the heart's floor, a short riveted stub of it
 * standing above the floor with a flanged mouth a little narrower than Peer, so a ball dropped on it sits in it and
 * stops it. (x, top) is the middle of the floor's top there, world cells. `collar` draws the pipe and the back of the
 * mouth (behind the ball); `collarFront` the front of the stub, over the ball, so he sits down inside it.
 */
const STUB = { half: 0.17, rise: 0.075, lip: 0.2 }

export function collar(p: p5, c: Pen, o: Pt, x: number, top: number, q: Pt): void {
  const { k, ink, weight } = c
  const X = x - o[0] + q[0]
  const Y = top - o[1] + q[1]
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(mixHex(ink, WORKS.iron, 0.45))
  p.strokeWeight(weight * 0.8)
  // The pipe going down through the floor, and a flange where it meets the floor.
  p.fill(mixHex(WORKS.iron, STONE.deep, 0.3))
  p.rect((X - 0.13) * k, Y * k, 0.26 * k, 1.1 * k)
  p.fill(WORKS.iron)
  p.rect((X - 0.24) * k, (Y + 0.35) * k, 0.48 * k, 0.07 * k)
  p.rect((X - 0.3) * k, (Y - 0.035) * k, 0.6 * k, 0.05 * k)
  // The back of the mouth: the dark inside of the pipe.
  p.noStroke()
  p.fill(mixHex(WORKS.iron, '#000000', 0.4))
  p.ellipse(X * k, (Y - STUB.rise) * k, 2 * STUB.half * 0.8 * k, 0.07 * k)
  p.pop()
}

export function collarFront(p: p5, c: Pen, o: Pt, x: number, top: number, q: Pt): void {
  const { k, ink, weight } = c
  const X = x - o[0] + q[0]
  const Y = top - o[1] + q[1]
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(mixHex(ink, WORKS.iron, 0.45))
  p.strokeWeight(weight * 0.8)
  // The stub, standing a little above the floor, and its flanged lip.
  p.fill(WORKS.iron)
  p.rect((X - STUB.half) * k, (Y - STUB.rise) * k, 2 * STUB.half * k, STUB.rise * k)
  p.fill(WORKS.steel)
  p.rect((X - STUB.lip) * k, (Y - STUB.rise - 0.03) * k, 2 * STUB.lip * k, 0.05 * k)
  // Rivets round the stub: small, not beads.
  p.noStroke()
  p.fill(mixHex(WORKS.steel, ink, 0.25))
  for (const dx of [-0.11, 0, 0.11]) p.ellipse((X + dx) * k, (Y - STUB.rise * 0.45) * k, 0.025 * k, 0.025 * k)
  p.pop()
}
