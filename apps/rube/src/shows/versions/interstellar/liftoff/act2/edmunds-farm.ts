import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, smooth, type Ctx } from '../kit'
import { DARK, DUST as FARM, VOID } from '../worlds'

/**
 * Brand's settlement on Edmunds' planet, and the weather over it: what the camera finds as it comes down onto the
 * plain and what the credits' draw-back reveals. She has been here a while. Behind the Ranger a farm windmill (the
 * yard's, again) pumps into a tank, and a channel from it runs across the plain, catching the dawn, to a field of
 * young corn in rows; a hoop house with more corn in it stands on the left, panels on the right turn to the sun as it
 * comes up, and her rover is parked near, its tracks running back to the horizon. Over it all: high cirrus going
 * from slate to rose to gold, dust devils walking far off, and sand blowing low across the near ground.
 *
 * The plain is painted in depth as `edmunds.ts` paints it: a thing on the ground `s` times nearer than the landing
 * site stands `s` times as far below the horizon as the site does, `s` times its size, and slides `s` times as far
 * across the frame for a move of the camera. Everything here is placed in the site's measure (cells along the
 * landing ground, from the Ranger's touchdown `lx`) and depth.
 */

/** The plain as the eye sees it (`edmunds.ts`, `View`). */
export interface Plain {
  f: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }
  /** The horizon. */
  E: number
  /** The eye over the landing ground. */
  A: number
}

/** The site, and the hour. */
export interface Site {
  /** Where the Ranger touches down, along the ground, and the landing ground's height. */
  lx: number
  g: number
  /** The sun, across the frame. */
  sunX: number
  T: number
  /** 0 to 1 from the far mouth to the music's end. */
  dawn: number
  /** The sun coming up: to its edge by the music's end (1), clear by the end of the credits (2). */
  rise: number
}

const TAU = Math.PI * 2
const HAZE = mixHex(mixHex(DARK.slate, DARK.violet, 0.3), DARK.gold, 0.42)
const LAND = mixHex(mixHex(DARK.slate, DARK.deep, 0.25), DARK.amber, 0.28)
const ROCK = mixHex(DARK.deep, DARK.slate, 0.62)
const SAND = mixHex(LAND, DARK.gold, 0.42)
/** The farm's green, in the dawn: Act I's leaf, cooled. */
const LEAF = mixHex(FARM.leaf, DARK.slate, 0.25)
const LEAF_LIT = mixHex(FARM.husk, DARK.gold, 0.4)

/** A point of the plain: `gx` along (site measure), `s` nearness. */
const at = (v: Plain, gx: number, s: number): Pt => [v.f.cx + (gx - v.f.cx) * s, v.E + v.A * s]
/** Paint at depth `s`: hazed toward the horizon's colour the farther it is. */
const far = (hex: string, s: number): string => mixHex(hex, HAZE, Math.max(0, Math.min(0.8, 0.75 * (1 - s))))

/* ------------------------------------------------------------------ where things stand */

/** In the site's measure from touchdown, and nearness: placed to be read in the credits' last, widest frame. */
const MILL = { gx: -6.35, s: 0.5 }
const TANK = { gx: -4.35, s: 0.5 }
const HOOP = { gx: -7.9, s: 0.62, len: 3.3 }
const PANELS = { gx: 12.5, s: 0.72, n: 4, gap: 0.85 }
const ROVER = { gx: -1.55, s: 1.3 }
/** The field: rows along the ground away from us, between these, from `s0` back to `s1`. */
const FIELD = { gx0: 6.2, gx1: 14.6, rows: 16, s0: 0.86, s1: 0.32 }
/** The channel from the tank, across behind the camp, to the field's near edge. */
const CHANNEL_S = 0.5

/** The plain's stones and craters keep off the field and the settlement. */
export function clearOfFarm(gx: number, s: number, lx: number): boolean {
  const x = gx - lx
  if (s > FIELD.s1 - 0.04 && s < FIELD.s0 + 0.06 && x > FIELD.gx0 - 0.4 && x < FIELD.gx1 + 0.6) return false
  if (s > 0.42 && s < 0.78 && x > HOOP.gx - 2.3 && x < TANK.gx + 0.8) return false
  if (Math.abs(s - CHANNEL_S) < 0.035 && x > TANK.gx && x < FIELD.gx0) return false
  return true
}

/* ------------------------------------------------------------------ the sky */

/**
 * The dawn's light on the sky over the sun: flat, stepped bands, as a colorist grades a sky, not a bloom. Wider and
 * warmer as it comes up.
 */
export function dawnBands(p: p5, c: Ctx, v: Plain, site: Site): void {
  const X = (x: number) => x * c.k
  const strength = 0.55 + 0.25 * site.dawn + 0.2 * Math.min(1, site.rise)
  p.noStroke()
  const bands: [number, number, string, number][] = [
    [8.5, 1.9, DARK.violet, 0.07],
    [6.2, 1.35, mixHex(DARK.violet, DARK.amber, 0.5), 0.07],
    [4.2, 0.95, DARK.amber, 0.08],
    [2.6, 0.62, DARK.gold, 0.09],
    [1.4, 0.36, mixHex(DARK.gold, VOID.ink, 0.4), 0.1],
  ]
  for (const [rx, ry, hex, a] of bands) {
    p.fill(alpha(p, hex, a * strength))
    p.arc(X(site.sunX), X(v.E + 0.02), X(2 * rx * (1 + 0.25 * site.dawn)), X(2 * ry * (1 + 0.2 * site.rise)), Math.PI, TAU, p.CHORD)
  }
}

/** High cirrus, far over the plain: unlit slate before the dawn, then rose and gold on their undersides. */
export function drawCirrus(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k } = c
  const X = (x: number) => x * k
  const { f, E } = v
  // Fixed to the sky like the stars (a little parallax), drifting downwind.
  const ox = f.cx * 0.94 + site.T * 0.05
  const span = 26
  const body = mixHex(mixHex(DARK.slate, DARK.violet, 0.45), mixHex(DARK.violet, '#D98C7C', 0.55), site.dawn)
  const lit = mixHex('#D98C7C', DARK.gold, Math.min(1, 0.3 + 0.5 * site.rise))
  p.noStroke()
  for (let i = 0; i < 14; i++) {
    const w = 2.2 + 3.6 * hash(i, 401)
    const th = 0.05 + 0.1 * hash(i, 402)
    let x = ((((hash(i, 403) * span + ox - f.cx) % span) + span) % span) + f.cx - span / 2
    // Each sits at its own height over the horizon; the higher, the thinner and the less lit.
    const hgt = 0.8 + 4.6 * hash(i, 404) ** 1.3
    const y = E - hgt
    if (x + w < f.x0 - 1 || x - w > f.x1 + 1 || y < f.y0 - 0.5) continue
    x += 0.15 * Math.sin(site.T * 0.07 + i)
    const lift = Math.max(0.15, 1 - hgt / 6.5)
    const a = (0.16 + 0.14 * hash(i, 405)) * (0.5 + 0.5 * site.dawn)
    // The body: a long lens, swept a little.
    p.fill(alpha(p, body, a))
    p.beginShape()
    p.vertex(X(x - w / 2), X(y))
    p.quadraticVertex(X(x - w * 0.1), X(y - th * 1.6), X(x + w / 2), X(y - th * 0.3))
    p.quadraticVertex(X(x + w * 0.05), X(y + th * 0.7), X(x - w / 2), X(y))
    p.endShape(p.CLOSE)
    // Its underside, lit from the sun below the horizon: brighter low and toward the sun.
    const toward = 1 - Math.min(1, Math.abs(x - site.sunX) / 9)
    p.fill(alpha(p, lit, (0.12 + 0.35 * toward) * lift * (0.35 + 0.65 * site.dawn)))
    p.beginShape()
    p.vertex(X(x - w * 0.42), X(y + th * 0.08))
    p.quadraticVertex(X(x), X(y + th * 0.55), X(x + w * 0.45), X(y - th * 0.25))
    p.quadraticVertex(X(x + w * 0.02), X(y + th * 0.25), X(x - w * 0.42), X(y + th * 0.08))
    p.endShape(p.CLOSE)
  }
}

/* ------------------------------------------------------------------ the far plain */

/** Dust devils walking downwind far off: a few at a time, each living some twenty seconds. */
export function drawDevils(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, weight } = c
  const X = (x: number) => x * k
  const LIFE = 22
  for (let i = 0; i < 6; i++) {
    // Staggered lives, each at its own depth and place.
    const age = (site.T + hash(i, 501) * LIFE) % LIFE
    const n = Math.floor((site.T + hash(i, 501) * LIFE) / LIFE)
    const s = 0.12 + 0.22 * hash(i, n, 502)
    const gx = site.lx + (hash(i, n, 503) - 0.35) * 34 + age * 0.55
    const [x, y] = at(v, gx, s)
    if (x < v.f.x0 - 1 || x > v.f.x1 + 1) continue
    const life = smooth(age, 0, 3) * (1 - smooth(age, LIFE - 4, LIFE))
    if (life <= 0.02) continue
    const H = (4 + 3 * hash(i, n, 504)) * s
    const lean = 0.25 * s * Math.sin(site.T * 0.4 + i)
    p.noFill()
    p.strokeWeight(Math.max(0.8, weight * 0.5))
    // Rings of dust up the column, widening as they go, each turning on its own.
    for (let j = 0; j < 9; j++) {
      const u = j / 8
      const r = (0.08 + 0.55 * u * u) * s * 1.6
      const cy = y - H * u
      const cx = x + lean * u + 0.06 * s * Math.sin(site.T * 3 + j * 1.3)
      p.stroke(alpha(p, SAND, 0.4 * life * (1 - 0.55 * u)))
      p.arc(X(cx), X(cy), X(2 * r), X(r * 0.5), Math.PI * (0.1 + 0.2 * Math.sin(site.T * 2 + j)), Math.PI * (1.6 + 0.2 * Math.sin(site.T * 2 + j)))
    }
    // Its skirt on the ground.
    p.noStroke()
    p.fill(alpha(p, SAND, 0.18 * life))
    p.ellipse(X(x), X(y), X(0.9 * s * 1.6), X(0.12 * s))
  }
}

/** Sand blowing low across the near ground, faster the nearer: thin skeins that come, run and go. */
export function drawSkeins(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, weight } = c
  const X = (x: number) => x * k
  const { f } = v
  // The wash of the landing whips them up; otherwise a steady dawn wind.
  const wind = 0.9
  p.noFill()
  p.strokeCap(p.ROUND)
  for (let row = 0; row < 7; row++) {
    const s = 1.15 * Math.pow(1.22, row)
    const yRow = v.E + v.A * s
    if (yRow > f.y1 + 0.3 || yRow < v.E) continue
    const step = 2.6
    const drift = site.T * wind
    const b0 = f.cx + (f.x0 - 1 - f.cx) / s - drift
    const b1 = f.cx + (f.x1 + 1 - f.cx) / s - drift
    for (let i = Math.floor(b0 / step) - 1; i <= Math.ceil(b1 / step); i++) {
      const ph = (site.T * 0.33 + hash(i, row, 601)) % 1
      const life = Math.sin(Math.PI * ph)
      if (life < 0.05) continue
      const gx = (i + hash(i, row, 602)) * step + drift
      const len = (0.6 + 0.9 * hash(i, row, 603)) * s * 0.6
      const [x, y] = at(v, gx, s)
      const yy = y - 0.01 * s - 0.02 * s * hash(i, row, 604)
      p.stroke(alpha(p, SAND, 0.38 * life * Math.min(1, 2.2 / s)))
      p.strokeWeight(Math.max(0.7, weight * 0.45 * Math.min(1.6, s)))
      p.beginShape()
      for (let q = 0; q <= 6; q++) {
        const u = q / 6
        p.vertex(X(x - len / 2 + len * u), X(yy + 0.012 * s * Math.sin(u * 6 + site.T * 5 + i)))
      }
      p.endShape()
    }
  }
}

/* ------------------------------------------------------------------ the plain's story, seen from the air */

/**
 * The plain on the ground's own terms: a place along it (cells from touchdown) and a distance out (cells, the site
 * itself at `SITE` out), so a river and a track can wind across it and keep their width as they go away. The eye's
 * nearness `s` is SITE / distance.
 */
const SITE = 12
type Ground = [number, number]
/** A smooth line through ground points (Catmull-Rom), `n` samples a span. */
function winding(pts: Ground[], n: number): Ground[] {
  const out: Ground[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < n; j++) {
      const u = j / n
      const u2 = u * u
      const u3 = u2 * u
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}
/** The two sides of a line `w` wide across the ground, on the screen. */
function sides(v: Plain, lx: number, line: Ground[], w: number): [Pt[], Pt[]] {
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)]
    const b = line[Math.min(line.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const l = Math.hypot(dx, dz) || 1
    const nx = (-dz / l) * (w / 2)
    const nz = (dx / l) * (w / 2)
    const [gx, z] = line[i]
    left.push(at(v, lx + gx + nx, SITE / Math.max(1, z + nz)))
    right.push(at(v, lx + gx - nx, SITE / Math.max(1, z - nz)))
  }
  return [left, right]
}

/** A dry river winding across the plain behind the camp: what her windmill draws its water from, under the sand. */
const RIVER = winding([[-70, 260], [-44, 140], [-30, 92], [-17, 118], [-6, 74], [3, 52], [13, 62], [25, 45], [41, 34], [64, 30]], 10)
/** Her rover's ways out of the camp and back, worn into the plain: to the river, and out to his lander. */
const ROUTES: Ground[][] = [
  winding([[-1.6, 9.3], [-3.2, 15], [-7, 23], [-13, 32], [-20, 41], [-26, 49], [-29.4, 53.5]], 8),
  winding([[-1.4, 9.3], [1.5, 16], [5, 24], [7.5, 34], [9.5, 45], [12, 56]], 8),
]
/** Edmunds' lander, where he came down: far out on the plain, half in the sand. */
const EDMUNDS: Ground = [-31, 55]

/** The river, the ways, and his lander: laid on the plain before the stones and the near ground. */
export function drawPlainStory(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, weight } = c
  const X = (x: number) => x * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const poly = (pts: Pt[]) => pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y))))
  // The river's bed: a darker band, its sunward bank caught by the dawn, a pale streak of salt down its middle.
  const [l, r] = sides(v, site.lx, RIVER, 3.2)
  ctx.fillStyle = mixHex(LAND, VOID.bg, 0.32)
  ctx.beginPath()
  poly(l)
  for (let i = r.length - 1; i >= 0; i--) ctx.lineTo(X(r[i][0]), X(r[i][1]))
  ctx.closePath()
  ctx.fill()
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(0.8, weight * 0.55)
  ctx.strokeStyle = `rgba(217, 164, 65, ${0.28 + 0.2 * site.dawn})`
  ctx.beginPath()
  poly(r)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(11, 15, 29, 0.35)'
  ctx.beginPath()
  poly(l)
  ctx.stroke()
  const [sl] = sides(v, site.lx, RIVER, 0.5)
  ctx.strokeStyle = `rgba(236, 229, 211, ${0.1 + 0.06 * site.dawn})`
  ctx.beginPath()
  poly(sl)
  ctx.stroke()
  // Her ways: two ruts each, worn by many runs out and back.
  ctx.strokeStyle = 'rgba(11, 15, 29, 0.24)'
  ctx.lineWidth = Math.max(0.7, weight * 0.45)
  ctx.beginPath()
  for (const route of ROUTES) {
    for (const off of [0.42, -0.42]) {
      const [a] = sides(v, site.lx + off, route, 0)
      poly(a)
    }
  }
  ctx.stroke()
  drawLander(p, c, v, site)
}

/** His lander: a squat stage on splayed legs, one buckled, a panel torn off and lying by it, sand drifted up its side. */
function drawLander(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const s = SITE / EDMUNDS[1]
  const [x, y] = at(v, site.lx + EDMUNDS[0], s)
  if (x < v.f.x0 - 1 || x > v.f.x1 + 1 || y > v.f.y1 + 0.5) return
  const u = 1.5 * s
  shadow(p, c, v, site, x - 1.1 * u, x + 1.1 * u, s, 4)
  const line = alpha(p, ink, 0.5)
  p.stroke(line)
  p.strokeWeight(Math.max(0.7, weight * 0.5))
  // The legs: three seen, the near right one buckled under, so it sits askew.
  p.noFill()
  p.line(X(x - 0.55 * u), X(y - 0.45 * u), X(x - 1.05 * u), X(y))
  p.line(X(x + 0.5 * u), X(y - 0.4 * u), X(x + 0.85 * u), X(y - 0.05 * u))
  p.line(X(x - 0.05 * u), X(y - 0.4 * u), X(x + 0.05 * u), X(y))
  // The stage, tipped a little, its top module and its hatch open.
  p.push()
  p.translate(X(x), X(y - 0.5 * u))
  p.rotate(0.12)
  p.fill(far(mixHex(DARK.hull, LAND, 0.2), s + 0.15))
  p.beginShape()
  p.vertex(X(-0.7 * u), X(0.12 * u))
  p.vertex(X(-0.55 * u), X(-0.32 * u))
  p.vertex(X(0.55 * u), X(-0.32 * u))
  p.vertex(X(0.7 * u), X(0.12 * u))
  p.endShape(p.CLOSE)
  p.fill(far(DARK.hull, s + 0.2))
  p.rect(X(-0.32 * u), X(-0.62 * u), X(0.6 * u), X(0.3 * u), X(0.04 * u))
  p.fill(far(VOID.bg, s + 0.3))
  p.rect(X(0.02 * u), X(-0.56 * u), X(0.16 * u), X(0.2 * u))
  // A mast with its dish, still pointed at a sky he never heard back from.
  p.noFill()
  p.line(X(-0.2 * u), X(-0.62 * u), X(-0.32 * u), X(-1.1 * u))
  p.arc(X(-0.36 * u), X(-1.12 * u), X(0.26 * u), X(0.16 * u), Math.PI * 1.1, Math.PI * 2.1)
  p.stroke(alpha(p, DARK.gold, 0.4 + 0.2 * site.dawn))
  p.line(X(-0.55 * u), X(-0.32 * u), X(0.55 * u), X(-0.32 * u))
  p.pop()
  // The torn panel, lying on the sand beside it.
  p.stroke(line)
  p.fill(far(mixHex(DARK.slate, VOID.bg, 0.25), s + 0.15))
  p.quad(X(x + 1.0 * u), X(y), X(x + 1.9 * u), X(y - 0.04 * u), X(x + 1.95 * u), X(y - 0.16 * u), X(x + 1.08 * u), X(y - 0.14 * u))
  // Sand drifted up its windward side.
  p.noStroke()
  p.fill(far(SAND, s + 0.2))
  p.beginShape()
  p.vertex(X(x - 1.3 * u), X(y + 0.02 * u))
  p.quadraticVertex(X(x - 0.9 * u), X(y - 0.32 * u), X(x - 0.35 * u), X(y - 0.18 * u))
  p.vertex(X(x - 0.2 * u), X(y + 0.02 * u))
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the settlement */

/** A long flat shadow along the ground at depth `s`, away from the sun, shortening as it comes up. */
function shadow(p: p5, c: Ctx, v: Plain, site: Site, x0: number, x1: number, s: number, len: number): void {
  const X = (x: number) => x * c.k
  const y = v.E + v.A * s
  const away = (x0 + x1) / 2 < site.sunX ? -1 : 1
  const l = len * s * (1 - 0.4 * Math.min(1, site.rise / 2))
  const from = away < 0 ? x1 : x0
  const to = away < 0 ? x0 - l : x1 + l
  p.noStroke()
  p.fill(alpha(p, VOID.bg, 0.3))
  p.beginShape()
  p.vertex(X(from), X(y - 0.004))
  p.vertex(X(to), X(y + 0.01 * s))
  p.vertex(X(to), X(y + 0.03 * s))
  p.vertex(X(from), X(y + 0.035 * s))
  p.endShape(p.CLOSE)
}

/** Everything of hers behind the camp, and the rover in front of it: drawn before the camp. */
export function drawSettlement(p: p5, c: Ctx, v: Plain, site: Site): void {
  drawField(p, c, v, site)
  drawChannel(p, c, v, site)
  drawHoop(p, c, v, site)
  drawMill(p, c, v, site)
  drawPanels(p, c, v, site)
  drawRover(p, c, v, site)
}

/** Rows of young corn going back across the plain, the furrows between them wet from the channel. */
function drawField(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, weight } = c
  const X = (x: number) => x * k
  const { f } = v
  const left = at(v, site.lx + FIELD.gx0, FIELD.s0)[0]
  const right = at(v, site.lx + FIELD.gx1, FIELD.s0)[0]
  // Seen from low it is a sliver behind the camp, so it comes in as the eye rises over the plain.
  const seen = smooth(v.A, 0.3, 0.9)
  if (seen <= 0.01 || right < f.x0 - 0.5 || at(v, site.lx + FIELD.gx0, FIELD.s1)[0] > f.x1 + 0.5) return
  void left
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalAlpha = seen
  // The tilled ground, darker than the plain.
  const corners = [at(v, site.lx + FIELD.gx0 - 0.3, FIELD.s0 + 0.03), at(v, site.lx + FIELD.gx1 + 0.3, FIELD.s0 + 0.03), at(v, site.lx + FIELD.gx1 + 0.3, FIELD.s1 - 0.02), at(v, site.lx + FIELD.gx0 - 0.3, FIELD.s1 - 0.02)]
  ctx.fillStyle = mixHex(LAND, VOID.bg, 0.3)
  ctx.beginPath()
  corners.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y))))
  ctx.closePath()
  ctx.fill()
  // Furrows: every other one holds water, which takes the sky's gold.
  const sway = (i: number, j: number) => 0.012 * Math.sin(site.T * 1.7 + i * 0.7 + j * 0.45)
  ctx.lineCap = 'round'
  for (const wet of [false, true]) {
    ctx.strokeStyle = wet ? `rgba(217, 164, 65, ${0.22 + 0.25 * site.dawn})` : 'rgba(11, 15, 29, 0.35)'
    ctx.lineWidth = Math.max(0.7, weight * (wet ? 0.45 : 0.6))
    ctx.beginPath()
    for (let r = 0; r <= FIELD.rows; r++) {
      if (wet !== (r % 2 === 1)) continue
      const gx = site.lx + FIELD.gx0 + ((FIELD.gx1 - FIELD.gx0) * (r - 0.5)) / FIELD.rows
      const [ax, ay] = at(v, gx, FIELD.s0)
      const [bx, by] = at(v, gx, FIELD.s1)
      ctx.moveTo(X(ax), X(ay))
      ctx.lineTo(X(bx), X(by))
    }
    ctx.stroke()
  }
  // The plants: a tuft every so far back along each row, each a few leaves, swaying in the wind.
  const leaves = new Path2D()
  const tips = new Path2D()
  const n = 15
  for (let r = 0; r < FIELD.rows; r++) {
    const gx = site.lx + FIELD.gx0 + ((FIELD.gx1 - FIELD.gx0) * r) / FIELD.rows
    for (let j = 0; j < n; j++) {
      const s = FIELD.s0 + ((FIELD.s1 - FIELD.s0) * (j + 0.3 * hash(r, j, 701))) / n
      const [x, y] = at(v, gx + 0.08 * (hash(r, j, 702) - 0.5), s)
      if (x < f.x0 - 0.2 || x > f.x1 + 0.2) continue
      const h = (0.24 + 0.1 * hash(r, j, 703)) * s
      const w = sway(r, j) * s * 3
      leaves.moveTo(X(x), X(y))
      leaves.quadraticCurveTo(X(x - 0.02 * s), X(y - h * 0.6), X(x - 0.07 * s + w), X(y - h * 0.85))
      leaves.moveTo(X(x), X(y))
      leaves.quadraticCurveTo(X(x + 0.03 * s), X(y - h * 0.55), X(x + 0.08 * s + w), X(y - h * 0.7))
      tips.moveTo(X(x), X(y))
      tips.lineTo(X(x + w * 0.6), X(y - h))
    }
  }
  ctx.strokeStyle = LEAF
  ctx.lineWidth = Math.max(0.8, k * 0.02)
  ctx.stroke(leaves)
  ctx.strokeStyle = LEAF_LIT
  ctx.lineWidth = Math.max(0.7, k * 0.014)
  ctx.stroke(tips)
  ctx.restore()
}

/** The channel from the tank across the plain to the field, its water the sky's colour. */
function drawChannel(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, weight } = c
  const X = (x: number) => x * k
  const [ax, ay] = at(v, site.lx + TANK.gx + 0.3, CHANNEL_S)
  const [bx] = at(v, site.lx + FIELD.gx0 - 0.3, CHANNEL_S)
  // Then along the field's near edge.
  const [cx, cy] = at(v, site.lx + FIELD.gx0 - 0.3, FIELD.s0 + 0.02)
  const [dx, dy] = at(v, site.lx + FIELD.gx1 + 0.3, FIELD.s0 + 0.02)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // From low it would be a line across the camp at the height of the two of them: it comes in as the eye rises.
  const seen = smooth(v.A, 0.45, 1.2)
  if (seen <= 0.01) return
  ctx.save()
  ctx.globalAlpha = seen
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(11, 15, 29, 0.45)'
  ctx.lineWidth = Math.max(1.4, X(0.07 * CHANNEL_S))
  ctx.beginPath()
  ctx.moveTo(X(ax), X(ay))
  ctx.lineTo(X(bx), X(ay))
  ctx.lineTo(X(cx), X(cy))
  ctx.lineTo(X(dx), X(dy))
  ctx.stroke()
  // The water: lit gold where it faces the dawn, brightest toward the sun, with a slow run of ripples along it.
  ctx.lineWidth = Math.max(0.8, weight * 0.55)
  const segs = 40
  for (let i = 0; i < segs; i++) {
    const u0 = i / segs
    const u1 = (i + 1.02) / segs
    const along = (u: number): Pt => (u < 0.7 ? [ax + (bx - ax) * (u / 0.7), ay] : u < 0.8 ? [bx + (cx - bx) * ((u - 0.7) / 0.1), ay + (cy - ay) * ((u - 0.7) / 0.1)] : [cx + (dx - cx) * ((u - 0.8) / 0.2), cy + (dy - cy) * ((u - 0.8) / 0.2)])
    const [x0, y0] = along(u0)
    const [x1, y1] = along(u1)
    const toward = 1 - Math.min(1, Math.abs(x0 - site.sunX) / 8)
    const ripple = 0.7 + 0.3 * Math.sin(i * 0.9 - site.T * 1.6)
    ctx.strokeStyle = `rgba(232, 190, 110, ${(0.2 + 0.5 * toward) * ripple * (0.4 + 0.6 * site.dawn)})`
    ctx.beginPath()
    ctx.moveTo(X(x0), X(y0 - 0.006))
    ctx.lineTo(X(x1), X(y1 - 0.006))
    ctx.stroke()
  }
  ctx.restore()
}

/** The windmill, as the yard's: a lattice tower, a wheel of blades turning in the dawn wind, the tail vane, the pump rod. */
function drawMill(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const s = MILL.s
  const [bx, by] = at(v, site.lx + MILL.gx, s)
  if (bx < v.f.x0 - 2 || bx > v.f.x1 + 2) return
  const H = 3.4 * s
  const turn = site.T * 1.9 + 0.5 * Math.sin(site.T * 0.31)
  const line = alpha(p, ink, 0.55)
  shadow(p, c, v, site, bx - 0.45 * s, bx + 0.45 * s, s, 5.5)
  // The tank by it, on its stand, and the pipe from the mill.
  const [tx, ty] = at(v, site.lx + TANK.gx, TANK.s)
  shadow(p, c, v, site, tx - 0.35 * s, tx + 0.35 * s, s, 2)
  p.stroke(line)
  p.strokeWeight(Math.max(0.7, weight * 0.5))
  p.fill(far(DARK.hull, s * 1.1))
  p.line(X(tx - 0.28 * s), X(ty), X(tx - 0.28 * s), X(ty - 0.35 * s))
  p.line(X(tx + 0.28 * s), X(ty), X(tx + 0.28 * s), X(ty - 0.35 * s))
  p.beginShape()
  p.vertex(X(tx - 0.4 * s), X(ty - 0.35 * s))
  p.vertex(X(tx - 0.4 * s), X(ty - 0.95 * s))
  p.quadraticVertex(X(tx), X(ty - 1.08 * s), X(tx + 0.4 * s), X(ty - 0.95 * s))
  p.vertex(X(tx + 0.4 * s), X(ty - 0.35 * s))
  p.quadraticVertex(X(tx), X(ty - 0.28 * s), X(tx - 0.4 * s), X(ty - 0.35 * s))
  p.endShape(p.CLOSE)
  p.noFill()
  for (const u of [-0.2, 0.05, 0.28]) p.line(X(tx + u * s), X(ty - 0.32 * s), X(tx + u * s), X(ty - 0.99 * s))
  p.stroke(alpha(p, DARK.gold, 0.45 + 0.2 * site.dawn))
  p.line(X(tx + 0.34 * s), X(ty - 0.38 * s), X(tx + 0.34 * s), X(ty - 0.94 * s))
  p.line(X(bx + 0.2 * s), X(by - 0.1 * s), X(tx - 0.42 * s), X(ty - 0.5 * s))
  // The tower: two legs seen side on, girts, and braces.
  const top = by - H
  const legL = (u: number): Pt => [bx - 0.45 * s + 0.36 * s * u, by - H * u]
  const legR = (u: number): Pt => [bx + 0.45 * s - 0.36 * s * u, by - H * u]
  p.stroke(line)
  p.strokeWeight(Math.max(0.8, weight * 0.6))
  p.line(X(legL(0)[0]), X(legL(0)[1]), X(legL(1)[0]), X(legL(1)[1]))
  p.line(X(legR(0)[0]), X(legR(0)[1]), X(legR(1)[0]), X(legR(1)[1]))
  p.strokeWeight(Math.max(0.6, weight * 0.4))
  const girts = [0, 0.25, 0.5, 0.75, 1]
  for (let i = 0; i < girts.length; i++) {
    const a = legL(girts[i])
    const b = legR(girts[i])
    p.line(X(a[0]), X(a[1]), X(b[0]), X(b[1]))
    if (i < girts.length - 1) {
      const a2 = legL(girts[i + 1])
      const b2 = legR(girts[i + 1])
      p.line(X(a[0]), X(a[1]), X(b2[0]), X(b2[1]))
      p.line(X(b[0]), X(b[1]), X(a2[0]), X(a2[1]))
    }
  }
  // The pump rod, up and down with the wheel.
  const stroke = 0.08 * s * Math.sin(turn)
  p.strokeWeight(Math.max(0.7, weight * 0.5))
  p.line(X(bx), X(top + 0.2 * s + stroke), X(bx), X(by - 0.15 * s + stroke))
  // The head, the tail vane downwind, the wheel into the wind (seen a little from the side, so an ellipse).
  const hx = bx
  const hy = top - 0.08 * s
  p.fill(far(DARK.hull, s * 1.1))
  p.rect(X(hx - 0.06 * s), X(hy - 0.06 * s), X(0.32 * s), X(0.12 * s), X(0.03 * s))
  p.line(X(hx + 0.2 * s), X(hy), X(hx + 1.15 * s), X(hy - 0.04 * s))
  p.fill(far(DARK.red, s * 1.2))
  p.beginShape()
  p.vertex(X(hx + 0.85 * s), X(hy - 0.04 * s))
  p.vertex(X(hx + 1.25 * s), X(hy - 0.32 * s))
  p.vertex(X(hx + 1.3 * s), X(hy + 0.16 * s))
  p.vertex(X(hx + 0.85 * s), X(hy + 0.04 * s))
  p.endShape(p.CLOSE)
  const wx = hx - 0.14 * s
  const rw = 0.72 * s
  const squash = 0.62
  const blades = 16
  p.fill(far(DARK.hull, s * 1.15))
  for (let i = 0; i < blades; i++) {
    const a = turn + (i / blades) * TAU
    const a2 = a + (TAU / blades) * 0.55
    // Each blade a narrow vane from the hub ring out to the rim.
    p.beginShape()
    p.vertex(X(wx + Math.cos(a) * rw * 0.3 * squash), X(hy + Math.sin(a) * rw * 0.3))
    p.vertex(X(wx + Math.cos(a) * rw * squash), X(hy + Math.sin(a) * rw))
    p.vertex(X(wx + Math.cos(a2) * rw * squash), X(hy + Math.sin(a2) * rw))
    p.vertex(X(wx + Math.cos(a2) * rw * 0.34 * squash), X(hy + Math.sin(a2) * rw * 0.34))
    p.endShape(p.CLOSE)
  }
  p.noFill()
  p.ellipse(X(wx), X(hy), X(2 * rw * squash), X(2 * rw))
  p.fill(far(DARK.slate, s))
  p.ellipse(X(wx), X(hy), X(0.16 * s), X(0.22 * s))
  // The dawn along its sunward edges.
  p.noFill()
  p.stroke(alpha(p, DARK.gold, 0.4 + 0.2 * site.dawn))
  p.strokeWeight(Math.max(0.7, weight * 0.45))
  p.arc(X(wx), X(hy), X(2 * rw * squash), X(2 * rw), -Math.PI * 0.45, Math.PI * 0.2)
}

/** The hoop house: ribs and film over rows of corn, its grow lights on until the sun is up, its ridge vent opening. */
function drawHoop(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const s = HOOP.s
  const [x0, y] = at(v, site.lx + HOOP.gx - HOOP.len / 2, s)
  const [x1] = at(v, site.lx + HOOP.gx + HOOP.len / 2, s)
  if (x1 < v.f.x0 - 1 || x0 > v.f.x1 + 1) return
  const h = 0.95 * s
  const r = Math.min(h, (x1 - x0) / 2) * 0.55
  shadow(p, c, v, site, x0, x1, s, 3.2)
  const lights = 1 - smooth(site.rise, 1.15, 1.45)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(X(x0), X(y))
    ctx.lineTo(X(x0), X(y - h + r))
    ctx.quadraticCurveTo(X(x0), X(y - h), X(x0 + r), X(y - h))
    ctx.lineTo(X(x1 - r), X(y - h))
    ctx.quadraticCurveTo(X(x1), X(y - h), X(x1), X(y - h + r))
    ctx.lineTo(X(x1), X(y))
    ctx.closePath()
  }
  // Inside: the lit air (flat), and the corn in rows behind the film.
  body()
  ctx.fillStyle = mixHex(far(DARK.slate, s), mixHex(DARK.amber, DARK.gold, 0.5), 0.45 * lights)
  ctx.fill()
  ctx.save()
  body()
  ctx.clip()
  const corn = new Path2D()
  for (let i = 0; i < 22; i++) {
    const u = (i + 0.5) / 22
    const x = x0 + (x1 - x0) * u
    const ch = h * (0.42 + 0.18 * hash(i, 801))
    const w = 0.02 * Math.sin(site.T * 1.1 + i)
    corn.moveTo(X(x), X(y))
    corn.lineTo(X(x + w), X(y - ch))
    corn.moveTo(X(x), X(y - ch * 0.45))
    corn.quadraticCurveTo(X(x - 0.06 * s), X(y - ch * 0.62), X(x - 0.12 * s + w), X(y - ch * 0.55))
    corn.moveTo(X(x), X(y - ch * 0.65))
    corn.quadraticCurveTo(X(x + 0.06 * s), X(y - ch * 0.8), X(x + 0.12 * s + w), X(y - ch * 0.75))
  }
  ctx.strokeStyle = far(LEAF, s + 0.2)
  ctx.lineWidth = Math.max(0.8, X(0.025 * s))
  ctx.lineCap = 'round'
  ctx.stroke(corn)
  // The film over them: pale, and paler toward the dawn.
  ctx.fillStyle = `rgba(236, 229, 211, ${0.16 + 0.1 * site.dawn})`
  ctx.fillRect(X(x0), X(y - h), X(x1 - x0), X(h))
  ctx.restore()
  // The ribs, the ends, and the outline.
  ctx.strokeStyle = `rgba(236, 229, 211, 0.5)`
  ctx.lineWidth = Math.max(0.7, weight * 0.45)
  ctx.beginPath()
  const ribs = 9
  for (let i = 1; i < ribs; i++) {
    const x = x0 + ((x1 - x0) * i) / ribs
    ctx.moveTo(X(x), X(y))
    ctx.lineTo(X(x), X(y - h))
  }
  ctx.stroke()
  p.noFill()
  p.stroke(alpha(p, ink, 0.6))
  p.strokeWeight(Math.max(0.8, weight * 0.6))
  body()
  ctx.stroke()
  // The door at the near end.
  p.fill(far(DARK.slate, s))
  p.rect(X(x1 - 0.42 * s), X(y - 0.52 * s), X(0.3 * s), X(0.52 * s))
  // The ridge vent, a flap along the top, lifting as the day comes.
  const open = smooth(site.rise, 1.2, 1.8)
  const vx0 = x0 + (x1 - x0) * 0.22
  const vx1 = x0 + (x1 - x0) * 0.7
  p.fill(far(DARK.hull, s))
  p.quad(X(vx0), X(y - h), X(vx1), X(y - h), X(vx1 - 0.02), X(y - h - 0.16 * s * open - 0.01), X(vx0 - 0.02), X(y - h - 0.16 * s * open - 0.01))
  // The dawn along its roof.
  p.noFill()
  p.stroke(alpha(p, DARK.gold, 0.35 + 0.3 * site.dawn))
  p.strokeWeight(Math.max(0.8, weight * 0.55))
  p.line(X(x0 + r), X(y - h), X(x1 - r), X(y - h))
}

/**
 * Panels on posts by the sun, turning to it as it comes up. They face it, so we see their backs against the dawn:
 * dark frames, foreshortened by their tilt, which leans back (and shows less of them) as the sun climbs.
 */
function drawPanels(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const s = PANELS.s
  // From upright to a sun on the horizon to leaning well back as it climbs, and a little hunting as they track.
  const lean = 0.15 + 0.5 * Math.min(1, site.rise / 2) + 0.03 * Math.sin(site.T * 0.25)
  for (let i = 0; i < PANELS.n; i++) {
    const gx = site.lx + PANELS.gx + i * PANELS.gap
    const [x, y] = at(v, gx, s)
    if (x < v.f.x0 - 1 || x > v.f.x1 + 1) continue
    const post = 0.3 * s
    const w = 0.62 * s
    const h = 0.42 * s * Math.cos(lean)
    shadow(p, c, v, site, x - w / 2, x + w / 2, s, 1.4)
    p.stroke(alpha(p, ink, 0.55))
    p.strokeWeight(Math.max(0.7, weight * 0.5))
    p.line(X(x), X(y), X(x), X(y - post))
    p.line(X(x), X(y - post), X(x - w * 0.3), X(y - post - h * 0.5))
    p.fill(far(mixHex(DARK.slate, VOID.bg, 0.25), s + 0.15))
    p.rect(X(x - w / 2), X(y - post - h), X(w), X(h), X(0.01))
    // Its frame's ribs, and the dawn along its top edge.
    p.stroke(alpha(p, ink, 0.3))
    p.line(X(x - w / 6), X(y - post - h), X(x - w / 6), X(y - post))
    p.line(X(x + w / 6), X(y - post - h), X(x + w / 6), X(y - post))
    p.stroke(alpha(p, DARK.gold, 0.55 + 0.25 * site.dawn))
    p.line(X(x - w / 2), X(y - post - h), X(x + w / 2), X(y - post - h))
  }
}

/** Her rover, parked: a low body on three wheels a side, a mast, and its tracks running back across the plain. */
function drawRover(p: p5, c: Ctx, v: Plain, site: Site): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const s = ROVER.s
  const gx = site.lx + ROVER.gx
  const [x, y] = at(v, gx, s)
  if (x < v.f.x0 - 1.5 || x > v.f.x1 + 1.5) return
  // The tracks: two ruts from under it, bending away back toward the horizon.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.strokeStyle = 'rgba(11, 15, 29, 0.26)'
  ctx.lineWidth = Math.max(0.8, weight * 0.6)
  ctx.beginPath()
  for (const side of [-0.22, 0.22]) {
    for (let j = 0; j <= 24; j++) {
      const ss = s - (s - 0.55) * (j / 24)
      const bend = 9 * ((s - ss) / (s - 0.55)) ** 1.6
      const [tx, ty] = at(v, gx + side - 0.4 - bend, ss)
      if (j) ctx.lineTo(X(tx), X(ty))
      else ctx.moveTo(X(tx), X(ty))
    }
  }
  ctx.stroke()
  shadow(p, c, v, site, x - 0.45 * s, x + 0.45 * s, s, 1.2)
  const wr = 0.075 * s
  solid(p, ink, weight * 0.7, mixHex(DARK.hull, LAND, 0.25))
  p.rect(X(x - 0.42 * s), X(y - 0.32 * s), X(0.84 * s), X(0.17 * s), X(0.03 * s))
  // The cab, glazed, toward the camp; a panel on its back; a mast with a dish.
  solid(p, ink, weight * 0.6, DARK.slate)
  p.quad(X(x + 0.08 * s), X(y - 0.32 * s), X(x + 0.38 * s), X(y - 0.32 * s), X(x + 0.3 * s), X(y - 0.48 * s), X(x + 0.1 * s), X(y - 0.48 * s))
  p.stroke(alpha(p, DARK.gold, 0.6))
  p.strokeWeight(Math.max(0.7, weight * 0.5))
  p.line(X(x + 0.12 * s), X(y - 0.46 * s), X(x + 0.29 * s), X(y - 0.46 * s))
  solid(p, ink, weight * 0.5, mixHex(DARK.slate, VOID.bg, 0.3))
  p.quad(X(x - 0.4 * s), X(y - 0.33 * s), X(x - 0.04 * s), X(y - 0.33 * s), X(x - 0.08 * s), X(y - 0.4 * s), X(x - 0.36 * s), X(y - 0.4 * s))
  outline(p, ink, weight * 0.5)
  p.line(X(x - 0.3 * s), X(y - 0.4 * s), X(x - 0.3 * s), X(y - 0.72 * s))
  p.arc(X(x - 0.27 * s), X(y - 0.74 * s), X(0.14 * s), X(0.1 * s), Math.PI * 0.1, Math.PI * 1.1)
  // Wheels: dark, hubbed, on short legs (so nothing round and pale stands at the camp but the two of them).
  for (const u of [-0.3, 0, 0.3]) {
    solid(p, ink, weight * 0.6, ROCK)
    p.rect(X(x + u * s - wr), X(y - 2 * wr), X(2 * wr), X(2 * wr), X(wr * 0.45))
    outline(p, alpha(p, DARK.hull, 0.6), weight * 0.4)
    p.line(X(x + u * s - wr * 0.5), X(y - wr), X(x + u * s + wr * 0.5), X(y - wr))
  }
}

function solid(p: p5, ink: string, w: number, fill: string): void {
  p.stroke(ink)
  p.strokeWeight(Math.max(0.7, w))
  p.fill(fill)
}

function outline(p: p5, ink: string | p5.Color, w: number): void {
  if (typeof ink === 'string') p.stroke(ink)
  else p.stroke(ink)
  p.strokeWeight(Math.max(0.7, w))
  p.noFill()
}

/** Mesas in a nearer band: lower, darker, more of them, on the plain at their own depth. */
export const RANGES: { s: number; gap: number; tall: number; seed: number; fill: string; lit: number }[] = [
  { s: 0.045, gap: 15, tall: 15, seed: 91, fill: mixHex(mixHex(HAZE, ROCK, 0.45), DARK.violet, 0.12), lit: 0.42 },
  { s: 0.14, gap: 6, tall: 4.4, seed: 97, fill: mixHex(ROCK, LAND, 0.35), lit: 0.6 },
]

