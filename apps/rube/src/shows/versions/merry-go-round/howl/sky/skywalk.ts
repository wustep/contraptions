import type p5 from 'p5'
import { mixHex, R, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, hash, part, type Company, type Ctx, type PartShot } from '../kit'
import { beatsIn } from '../music'
import { DIAL, TOWN } from '../worlds'
import { drawPerched, drawPigeon, drawSoldier } from './figures'
import { ALLEY_EXIT, BALCONY, barAt, ease, END, foot, HOP_OFF, howlWalk, LAND, LAND_AT, LIFT, NOON_BAR, pchip, RAIL_TOP, sophieWalk, STROKES, TOWER_X, W, walkBase } from './path'
import { CAFE, G, LINE, lightAt, POTS, SQUARE, TOWER } from './set'

/**
 * The walk on the air (49.035 → 85.8): the sky builder's. The film's most famous minute.
 *
 * On the waltz's first downbeat the two step up off the lane's stones, and climb the air between its walls a step a
 * bar (each step a push on the downbeat that settles at its top by the next), Howl going up and over her to lead on
 * her right, the blob men's arms stretching up after them and falling short. At the eaves the town opens under
 * them; they walk on over the roofs, a step on every downbeat, hers small and stiff at first and freer bar by bar;
 * each chimney they pass over puffs up soft smoke on their step. On the swell (70.002) her step goes right over the
 * town hall's weathercock and sets it spinning, the clock's hand clicks onto noon, the bell below them swings into
 * its first stroke and the pigeons burst out of the belfry, and the camera pulls out to the tower whole (bell, clock,
 * weathercock), the two of them a fifth down against the sky, crossing past it. Twelve strokes of noon, one a bar,
 * while they cross the sky over the square and come down, stepping, in a long S onto the café's balcony, the last
 * step small (81.369); the camera comes down with them, and the square rises into the frame with the parade marching
 * across it under them the other way, each man glancing up as they pass over. He bows, hops up onto the rail's end on the next downbeat, and
 * climbs the air away over the roofs, a step a bar, out of shot; she steps to the rail to watch him go. At 85.8 she is
 * at rest on the balcony, alone, and the cut takes her home.
 */

interface WalkState {
  begin: number
}

/**
 * Every strike: her step on each downbeat from bar 1 to 18 (the chimneys puff on some of them); from the swell the
 * bell's twelve strokes (bars 19 to 30, with the pigeons and the weathercock on the first); her steps down and the
 * landing (bars 25 to 29); Howl's hop off the balcony, onto the rail (bar 30) and his push up off it (31); his next
 * step up the air (32) is as he leaves the frame, so it is not counted.
 */
export const SKYWALK_HITS: number[] = [...new Set([...W.slice(1, 33), HOP_OFF])].sort((a, b) => a - b)

const E = ALLEY_EXIT
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const sm = (t: number, a: number, b: number) => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ the two of them, arm in arm */

/*
 * `path.ts` keeps the way over the town (the footholds the chimneys, the tower and the café are built under); here the
 * two of them walk it as the film has them, his arm round her:
 * - The rise keeps to the plain middle of the tall house's front (between its window columns) until they are over its
 *   top floor's windows, then sweeps right over its eaves: they climb against bare plaster and then the sky, never
 *   across a window.
 * - Howl rides a hair from her shoulder, a touch above (HOWL_AT, from 0.37 level on her right), and his step leads
 *   hers by 60 ms, so he carries her into each step.
 * - Her first four steps out over the roofs (bars 8 to 11) come late and too high, less so each bar; from bar 12 she
 *   lifts exactly as he does, and they move as one.
 */

/** Sophie's lift a bar as `path.ts` has it (bars 7 to 28, the only ones re-shaped here). */
function pathLift(i: number): number {
  if (i >= 7 && i <= 18) return 0.1 + 0.16 * Math.min(1, (i - 7) / 5)
  if (i >= 19 && i <= 23) return 0.12
  if (i >= 24 && i <= 27) return 0.16
  if (i === 28) return 0.1
  return 0
}
/** Howl's, as `path.ts` has it: an easy lilt over the roofs, her own steps on the stairs and the way down. */
const pathHowlLift = (i: number): number => (i >= 7 && i <= 18 ? 0.24 : pathLift(i))
/** His here: as the path's, but on the last stair (bar 7) no higher than hers, so he never stands on her head. */
const howlLift = (i: number): number => (i === 7 ? 0.12 : pathHowlLift(i))
const bump = (u: number) => 4 * u * (1 - u) * (1 - 0.18 * (u - 0.5))
const lilt = (u: number, dx: number) => (dx * 0.16 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI)
const barDx = (i: number) => walkBase(W[Math.min(i + 1, W.length - 1)])[0] - walkBase(W[i])[0]

/** Her first steps onto the open air: how late (a warp of the bar) and how much too high, bars 8 to 11. */
const LATE = [0.2, 0.14, 0.08, 0.03]
const OVER = [0.5, 0.32, 0.16, 0.05]
function herLift(i: number, u: number): number {
  if (i >= 8 && i <= 11) {
    const late = LATE[i - 8]
    return 0.24 * (1 + OVER[i - 8]) * bump(u - late * Math.sin(Math.PI * u))
  }
  if (i >= 12 && i <= 18) return 0.24 * bump(u)
  return pathLift(i) * bump(u)
}

/** The rise kept between the tall house's window columns until it is over its top floor's windows. */
const riseDx = pchip([
  [W[2], 0],
  [W[3], -0.28],
  [W[4], -0.66],
  [54.3, -0.95],
  [W[5] + 0.35, -0.42],
  [W[6] + 0.1, 0],
])
const riseShift = (t: number) => (t <= W[2] || t >= W[6] + 0.1 ? 0 : riseDx(t))

/** Sophie on the walk on the air (the alley's frame). */
export function sophieSky(t: number): Pt {
  const [x, y] = sophieWalk(t)
  if (t <= W[0] || t >= LAND) return [x, y]
  const { i, u } = barAt(t)
  const dy = i >= 7 ? pathLift(i) * bump(u) - herLift(i, u) : 0
  return [x + riseShift(t), y + dy]
}

/** Where Howl rides from her, once he has come round onto her right: a hair from her shoulder, a touch above. */
const HOWL_AT: Pt = [0.23, -0.15]
const HOWL_PATH: Pt = [0.37, 0]
/** Never closer than this, centre to centre: two balls a hair apart. */
const HAIR = 2 * R + 0.02
/** How far his step leads hers. */
const LEAD = 0.06

export function howlSky(t: number): Pt {
  const h = howlWalk(t)
  if (t <= W[0] || t >= LAND) return h
  let [x, y] = h
  // The step: path.ts's taken out, the same step 60 ms early put in.
  const lead = LEAD * ease(t, W[7], W[8]) * (1 - ease(t, W[27], W[28]))
  const a = barAt(t)
  const b = barAt(t + lead)
  x += lilt(b.u, barDx(b.i)) - lilt(a.u, barDx(a.i))
  y += pathHowlLift(a.i) * bump(a.u) - howlLift(b.i) * bump(b.u)
  // He keeps to her side up the plain front of the tall house, as she does.
  x += riseShift(t)
  // Round from the path's 0.37 to his arm's place, on the way up; back to it for the landing.
  const k = ease(t, W[2], W[4]) * (1 - ease(t, W[27], W[28] + 0.5))
  x += (HOWL_AT[0] - HOWL_PATH[0]) * k
  y += (HOWL_AT[1] - HOWL_PATH[1]) * k
  // A hair's gap, never touching: when her late high steps bring her up to him, he gives way along the line between.
  const [sx, sy] = sophieSky(t)
  const dx = x - sx
  const dy = y - sy
  const r = Math.hypot(dx, dy)
  if (k > 0 && r > 1e-6) {
    const soft = (r + HAIR + Math.sqrt((r - HAIR) ** 2 + 0.0004)) / 2
    const rr = r + (soft - r) * k
    x = sx + (dx / r) * rr
    y = sy + (dy / r) * rr
  }
  return [x, y]
}

/* ------------------------------------------------------------------ her steps finding the air */

/**
 * On each of her downbeats the air her foot finds is pressed out under it: a few soft lobes of pale air (volume, like
 * the chimneys' smoke, each its own size, fanned out flat and never a ring), gone in about 0.6 s. On the swell's step
 * over the tower the breath goes on down onto the weathercock and sets it spinning.
 */
function drawSteps(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const L = lightAt(t)
  if (L.dark > 0.5) return
  const air = L.tone(mixHex(TOWN.plaster, '#FFFFFF', 0.8))
  for (let i = 1; i <= 28; i++) {
    const a = t - W[i]
    if (a < 0 || a > 0.75) continue
    const [fx, fy0] = sophieSky(W[i])
    const fy = fy0 + R * 0.85
    const cock = i === NOON_BAR
    const big = cock ? 1.7 : 1
    const grow = 1 - Math.exp(-a / 0.16)
    const fade = Math.min(1, a / 0.04) * Math.max(0, 1 - a / 0.62) ** 1.4
    if (fade <= 0) continue
    const n = cock ? 7 : 5
    for (let j = 0; j < n; j++) {
      const h1 = hash(i, j, 91)
      const h2 = hash(i, j, 92)
      const h3 = hash(i, j, 93)
      const h4 = hash(i, j, 94)
      // Fanned out flat either side of her foot, each lobe its own way and size.
      const side = j % 2 ? 1 : -1
      const reach = (0.12 + 0.26 * h1) * big * (j === 0 ? 0.3 : 1)
      const x = fx + side * reach * grow + 0.04 * (h2 - 0.5)
      const down = (0.02 + 0.08 * h3) * big + (cock ? (0.25 + 0.3 * h1) : 0)
      const y = fy + down * grow
      const r = (0.06 + 0.07 * h4) * (0.5 + 0.9 * grow) * big
      lobe(p, k, x, y, r, r * 0.62, air, 0.72 * fade * (0.65 + 0.35 * h2))
    }
  }
}

/* ------------------------------------------------------------------ chimney smoke */

/** A soft lobe of smoke: dense in the middle, fading to nothing at its edge (volume, never a disc). */
function lobe(p: p5, k: number, x: number, y: number, rx: number, ry: number, hex: string, a: number): void {
  if (a <= 0.005 || rx <= 0.005) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const n = parseInt(hex.slice(1), 16)
  const rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.7})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** The smoke from the chimneys under the walk: a lazy wisp always, and on her step over one a burst rising to her. */
function drawSmoke(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const L = lightAt(t)
  const smoke = L.tone(mixHex(TOWN.plaster, TOWN.slate, 0.2))
  const shade = L.tone(mixHex(TOWN.plasterShade, TOWN.slate, 0.55))
  POTS.forEach(({ bar, at }, n) => {
    const [x, top] = at
    // The wisp: soft lobes drifting up and to the right, thinning.
    for (let i = 0; i < 4; i++) {
      const age = ((t * 0.4 + i / 4 + n * 0.37) % 1) * 3.4
      const r = 0.16 + 0.2 * age
      const a = 0.42 * (1 - age / 3.4) * Math.min(1, age * 2.5)
      lobe(p, k, x + 0.2 * age + 0.07 * Math.sin(age * 2 + n), top - 0.12 - 0.45 * age, r, r * 0.85, smoke, a)
    }
    // The puff: on the downbeat a burst of smoke leaves the pots, lobe after lobe, and rises in a column that
    // swells and leans off on the wind, thinning; the first lobe is the highest and the widest.
    const since = t - W[bar]
    if (since < 0 || since > 5) return
    for (let j = 5; j >= 0; j--) {
      const a = since - j * 0.1
      if (a <= 0) continue
      // Up fast to her foot on the one (it is under her step), then rolling on up past her, slowing.
      const rise = 1.9 * (1 - Math.exp(-a / 0.42)) * (1 - j * 0.06) + 0.12 * a
      const y = top - 0.12 - rise
      const px = x + 0.22 * a + 0.06 * Math.sin(a * 3 + j) + (j % 2 ? 0.06 : -0.06)
      const r = 0.18 + 0.42 * (1 - Math.exp(-a / 0.9)) * (1 - j * 0.05)
      const fade = 0.75 * Math.exp(-a / 1.6) * Math.min(1, a / 0.06)
      lobe(p, k, px + r * 0.12, y + r * 0.14, r, r * 0.85, shade, 0.5 * fade)
      lobe(p, k, px - r * 0.08, y - r * 0.08, r * 0.9, r * 0.78, smoke, fade)
    }
  })
  p.noStroke()
}

/* ------------------------------------------------------------------ his last step up the air */

/**
 * His last step up the air off the balcony, on the downbeat (84.72): the breath of it comes down over the rail, the
 * geraniums in the box there toss, and a few petals lift off them and go tumbling down past her and over the edge,
 * turning as they fall (each its own size and colour: never beads).
 */
const AIR_STEP = W[32]
const PETALS = 9
function drawPetals(p: p5, c: Ctx, t: number): void {
  const since = t - AIR_STEP
  if (since < 0 || since > 3.4) return
  const { k } = c
  const L = lightAt(t)
  const fx0 = BALCONY[0] + 0.26
  const fx1 = BALCONY[0] + 0.9
  p.noStroke()
  for (let i = 0; i < PETALS; i++) {
    const a = since - 0.05 * hash(i, 1, 77)
    if (a <= 0) continue
    const x0 = fx0 + (fx1 - fx0) * hash(i, 2, 77)
    const y0 = RAIL_TOP - 0.08 - 0.06 * hash(i, 3, 77)
    // Up off the flowers on the breath, then carried right on it and sinking, faster as it slows.
    const lift = 0.28 * (0.6 + 0.8 * hash(i, 4, 77)) * (1 - Math.exp(-a / 0.25))
    const drift = (1.6 + 1.3 * hash(i, 5, 77)) * (1 - Math.exp(-a / 1.2))
    const sink = 0.42 * a * a * (0.6 + 0.6 * hash(i, 6, 77))
    const x = x0 + drift + 0.06 * Math.sin(a * (4 + 2 * hash(i, 7, 77)) + i)
    const y = y0 - lift + sink
    const turn = a * (5 + 4 * hash(i, 8, 77)) + i
    const size = 0.035 + 0.03 * hash(i, 9, 77)
    const fade = Math.min(1, a / 0.05) * (1 - Math.max(0, (a - 2.4) / 1.0))
    if (fade <= 0) continue
    p.push()
    p.translate(x * k, y * k)
    p.rotate(turn * 0.6)
    p.fill(alpha(p, L.tone(i % 3 === 1 ? TOWN.rose : TOWN.ribbon), 0.95 * fade))
    // A petal turning over: its width comes and goes as it tumbles.
    p.ellipse(0, 0, 2 * size * k * (0.35 + 0.65 * Math.abs(Math.cos(turn))), 1.2 * size * k)
    p.pop()
  }
}

/* ------------------------------------------------------------------ the washing */

/** The washing on the line over the roofs: a sheet, a shirt, a towel, a pinafore; they lift and stream on her step over them, and settle. */
const WASHING = [
  { u: 0.16, w: 0.62, h: 0.6, col: TOWN.plaster },
  { u: 0.42, w: 0.42, h: 0.46, col: TOWN.shutter },
  { u: 0.64, w: 0.46, h: 0.38, col: TOWN.straw },
  { u: 0.86, w: 0.34, h: 0.52, col: TOWN.rose },
]
function drawWashing(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const L = lightAt(t)
  const [ax, ay] = LINE.a
  const [bx, by] = LINE.b
  const on = (u: number): Pt => [ax + (bx - ax) * u, ay + (by - ay) * u + LINE.sag * 4 * u * (1 - u)]
  // The gust of their passing: a lift on the downbeat, streaming out and settling back, ringing a little.
  const since = t - W[LINE.bar]
  const gust = since < 0 ? 0 : (1 - Math.exp(-since / 0.08)) * Math.exp(-since / 0.9)
  const breeze = 0.08 * Math.sin(t * 1.9) + 0.05 * Math.sin(t * 3.3 + 1)
  p.noFill()
  p.stroke(alpha(p, ink, 0.8))
  p.strokeWeight(weight * 0.5)
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const [x, y] = on(i / 16)
    p.vertex(x * k, (y - 0.06 * gust * Math.sin((i / 16) * Math.PI)) * k)
  }
  p.endShape()
  WASHING.forEach((w, i) => {
    const [x, y0] = on(w.u)
    const y = y0 - 0.06 * gust * Math.sin(w.u * Math.PI)
    // The hem swings out with the breeze, and on the gust it streams up and away to the right.
    const swing = breeze * (1 + 0.3 * i) + gust * (0.55 + 0.1 * i)
    const lift = gust * (0.55 + 0.1 * (i % 2))
    const hx = x + swing * w.h
    const hy = y + w.h * (1 - lift)
    p.stroke(alpha(p, ink, 0.85))
    p.strokeWeight(weight * 0.55)
    p.fill(L.tone(w.col))
    p.beginShape()
    p.vertex((x - w.w / 2) * k, y * k)
    p.vertex((x + w.w / 2) * k, y * k)
    p.quadraticVertex((hx + w.w / 2 + 0.04) * k, ((y + hy) / 2) * k, (hx + w.w / 2) * k, hy * k)
    p.vertex((hx - w.w / 2) * k, (hy + 0.03 * Math.sin(t * 5 + i)) * k)
    p.quadraticVertex((hx - w.w / 2 - 0.04) * k, ((y + hy) / 2) * k, (x - w.w / 2) * k, y * k)
    p.endShape(p.CLOSE)
    // Two pegs.
    p.noStroke()
    p.fill(L.tone(TOWN.timber))
    for (const d of [-0.36, 0.36]) p.rect((x + d * w.w - 0.02) * k, (y - 0.05) * k, 0.04 * k, 0.09 * k)
  })
}

/* ------------------------------------------------------------------ the pigeons */

interface Bird {
  start: Pt
  perched: boolean
  p1: Pt
  p2: Pt
  p3: Pt
  delay: number
  dur: number
}
const NOON = STROKES[0]
const BIRDS: Bird[] = Array.from({ length: 7 }, (_, i) => {
  const perched = i < 3
  const start: Pt = perched ? [TOWER_X - 0.6 + i * 0.6, TOWER.sill - 0.12] : [TOWER_X - 0.45 + (i - 3) * 0.3, -10.25 - 0.2 * (i % 2)]
  const side = i % 2 ? 1 : -1
  return {
    start,
    perched,
    p1: [start[0] + side * (0.6 + 0.6 * hash(i, 2)) - 0.9, start[1] - 1.6 - 0.8 * hash(i, 3)],
    p2: [TOWER_X - 5 - 3 * hash(i, 4), -13.4 - 1.4 * hash(i, 5)],
    p3: [TOWER_X - 19 - 6 * hash(i, 6), -17.5 - 3 * hash(i, 7)],
    delay: (perched ? 0 : 0.12) + 0.1 * hash(i, 8),
    dur: 6.2 + 1.8 * hash(i, 9),
  }
})
const bez = (a: Pt, b: Pt, c: Pt, d: Pt, u: number): Pt => {
  const v = 1 - u
  return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]
}

function drawPigeons(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const L = lightAt(t)
  if (L.dark > 0.5) return
  BIRDS.forEach((b, i) => {
    const t0 = NOON + b.delay
    if (t < t0) {
      if (!b.perched) return
      const bob = Math.max(0, Math.sin(t * 2.3 + i * 2.1)) ** 6
      p.push()
      p.translate(b.start[0] * k, b.start[1] * k)
      drawPerched(p, k, weight, ink, i === 1 ? -1 : 1, bob)
      p.pop()
      return
    }
    const s = (t - t0) / b.dur
    if (s >= 1) return
    // Off the sill in a burst, then easing into a long glide away.
    const u = 1 - Math.pow(1 - s, 1.6)
    const at = bez(b.start, b.p1, b.p2, b.p3, u)
    const ahead = bez(b.start, b.p1, b.p2, b.p3, Math.min(1, u + 0.01))
    const face = ahead[0] >= at[0] ? 1 : -1
    const flap = (t - t0) * (13 + 3 * hash(i, 11)) * (1 - 0.5 * s)
    p.push()
    p.translate(at[0] * k, at[1] * k)
    p.rotate(Math.atan2(ahead[1] - at[1], Math.abs(ahead[0] - at[0]) + 1e-6) * 0.5 * face)
    // Seen from the swell's wide: drawn larger than life, so they read as birds and never as marks.
    const big = 1 + 0.8 * sm(s, 0, 0.25)
    p.scale(big)
    drawPigeon(p, k, weight / big, ink, face, flap, 1 - sm(s, 0.85, 1))
    p.pop()
  })
}

/* ------------------------------------------------------------------ the vanes, and the pigeons on the ridge */

/**
 * The weathervanes on the roofs under her steps where no chimney is: a banner vane on the dormer (bar 9) and on the
 * last gable before the tower (bar 17), each spun round by the air of her step on its downbeat and settling back to
 * the wind. An iron rod and a swallow-tailed plate turning on it (drawn foreshortened as it turns).
 */
const VANES: { at: Pt; bar: number }[] = [
  { at: [13.6, -11.75], bar: 9 },
  { at: [25.385, -12.2], bar: 17 },
]
function drawVanes(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const L = lightAt(t)
  VANES.forEach(({ at, bar }, n) => {
    const [x, y] = at
    const since = t - W[bar]
    const spin = since < 0 ? 0 : 2 * Math.PI * 2.25 * (1 - Math.exp(-since / 0.75))
    const th = 0.35 + 0.18 * Math.sin(t * 0.9 + n * 2) + spin
    const c0 = Math.cos(th)
    const top = y - 0.52
    p.push()
    p.stroke(ink)
    p.strokeWeight(weight * 0.9)
    p.line(x * k, y * k, x * k, (top - 0.08) * k)
    p.strokeWeight(weight * 0.6)
    p.fill(L.tone(mixHex(TOWN.slateDark, TOWN.straw, 0.35)))
    p.beginShape()
    const plate: Pt[] = [[0, -0.02], [0.38, -0.02], [0.3, 0.07], [0.38, 0.16], [0, 0.16]]
    for (const [px, py] of plate) p.vertex((x + px * c0) * k, (top + py) * k)
    p.endShape(p.CLOSE)
    p.pop()
  })
}

/** Three pigeons on the ridge of the dormer's house; on bar 11 her step goes over them and they burst off it. */
const RIDGE_BIRDS = [
  { x: 15.12, face: 1, dx: -2.6, dy: -2.1 },
  { x: 15.32, face: -1, dx: 1.6, dy: -2.8 },
  { x: 15.52, face: 1, dx: 3.4, dy: -1.7 },
]
function drawRidgeBirds(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  if (lightAt(t).dark > 0.5) return
  const off = W[11]
  RIDGE_BIRDS.forEach((b, i) => {
    const y0 = -11.5
    const t0 = off + 0.04 * i
    if (t < t0) {
      const bob = Math.max(0, Math.sin(t * 2.1 + i * 2.4)) ** 6
      p.push()
      p.translate(b.x * k, y0 * k)
      drawPerched(p, k, weight, ink, b.face, bob)
      p.pop()
      return
    }
    const u = (t - t0) / 3.2
    if (u >= 1) return
    // Off the ridge in a burst, then away in a long glide, fading into the distance.
    const e = 1 - Math.pow(1 - u, 2.2)
    const x = b.x + b.dx * e
    const y = y0 - 0.15 - b.dy * (e + 0.4 * Math.sin(Math.PI * e) * 0.3)
    const face = b.dx >= 0 ? 1 : -1
    p.push()
    p.translate(x * k, y * k)
    p.rotate(-0.25 * face * (1 - u))
    drawPigeon(p, k, weight, ink, face, (t - t0) * 15 * (1 - 0.4 * u), 1 - sm(u, 0.75, 1))
    p.pop()
  })
}

/* ------------------------------------------------------------------ the parade */

/**
 * The parade crossing the square right to left: a flag-bearer and seven men, a step on every beat of the waltz. It
 * comes out along the café's front and into the square just as the camera comes down with the two of them onto it
 * (the ground in the frame from about 77), so the two pass over the column going the other way: the standard under
 * her at 77, the column's middle under them at 78, its tail at 79 as they come in over the café.
 */
const PARADE_BEATS = beatsIn(58, END + 1).map((b) => b.t)
const LEAD_AT = 78.0
const LEAD_X = SQUARE[1] - 3.6
const PACE = 0.33
/** How long the column is (the standard and seven men behind it). */
const FILE = 0.74
function drawParade(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const L = lightAt(t)
  let j = 0
  while (j + 1 < PARADE_BEATS.length && PARADE_BEATS[j + 1] <= t) j++
  const a = PARADE_BEATS[j]
  const b = PARADE_BEATS[j + 1] ?? a + 0.37
  const u = clamp01((t - a) / Math.max(0.05, b - a))
  const stride = 0.22 * (1 - 2 * u) * (j % 2 ? -1 : 1)
  const bob = 0.025 * Math.sin(Math.PI * u)
  const lead = LEAD_X - PACE * (t - LEAD_AT)
  // Where the two of them are over the square: each man tips his head back a little as they pass over him (a glance
  // up, never a stop in the step), and back to the front as they go on.
  const [px, py] = sophieSky(t)
  const low = sm(py, -14.5, -9.5)
  for (let n = 0; n < 8; n++) {
    const x = lead + n * FILE
    // Out of the frame on both sides whenever the square is in it (the street runs on past the café).
    if (x > CAFE[1] + 6 || x < SQUARE[0] - 2) continue
    const d = (px + 0.2 - x) / 1.4
    const glance = low * Math.exp(-d * d)
    p.push()
    p.translate(x * k, (G - bob) * k)
    if (n === 0) {
      // The standard: a tall pole and one long swallow-tailed pennant of the king's wine red, streaming back over the
      // column (one colour: no nation's flag).
      p.stroke(ink)
      p.strokeWeight(weight * 0.7)
      p.line(-0.1 * k, -0.6 * k, -0.1 * k, -2.55 * k)
      p.strokeWeight(weight * 0.55)
      p.fill(L.tone(mixHex(DIAL.red, TOWN.soldier, 0.35)))
      const wave = (v: number) => Math.sin(t * 3.4 - v * 4.5) * 0.09 * v
      p.beginShape()
      for (let q = 0; q <= 8; q++) {
        const v = q / 8
        p.vertex((-0.1 + v * 1.45) * k, (-2.5 + wave(v) + v * 0.16) * k)
      }
      p.vertex((-0.1 + 1.12) * k, (-2.5 + 0.28 + wave(0.78) + 0.12) * k)
      for (let q = 8; q >= 0; q--) {
        const v = q / 8
        p.vertex((-0.1 + v * 1.45) * k, (-2.5 + 0.56 - 0.1 * v + wave(v) + v * 0.16) * k)
      }
      p.endShape(p.CLOSE)
    }
    drawSoldier(p, k, weight, ink, { face: -1, stride: n % 2 ? -stride : stride, stiff: 1, arm: n === 0 ? 0.55 : 0, dark: L.dark, lean: -0.1 * glance })
    p.pop()
  }
}

/* ------------------------------------------------------------------ the part */

export const skywalk = part<WalkState>(
  {
    name: 'skywalk',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      // Into the alley's frame, which the set and the paths are in.
      p.translate(-E[0] * c.k, -E[1] * c.k)
      p.rectMode(p.CORNER)
      drawWashing(p, c, t)
      if (t > W[6] && t < W[20]) {
        drawVanes(p, c, t)
        drawRidgeBirds(p, c, t)
      }
      drawSmoke(p, c, t)
      if (t > W[1] - 0.05 && t < W[28] + 1) drawSteps(p, c, t)
      drawPetals(p, c, t)
      if (t > 60 && t < END + 1) drawParade(p, c, t)
      drawPigeons(p, c, t)
      p.pop()
    },
  },
  (slot) => {
    const fn = (s: number): Pt => {
      const [x, y] = sophieSky(slot.begin + s)
      return [x - E[0], y - E[1]]
    }
    // Sampled a bar at a time, so every downbeat (where a step changes speed) falls on a joint.
    const marks = [...W.slice(0, 30).map((w) => w - slot.begin), slot.end - slot.begin]
    const segs: Seg[] = []
    for (let i = 0; i < marks.length - 1; i++) segs.push(...carried(fn, marks[i], marks[i + 1], i < 29 ? 28 : 90))
    const last = fn(slot.end - slot.begin)
    const company: Company[] = [
      {
        who: 'howl',
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const [x, y] = howlSky(t)
          return { x: x - E[0], y: y - E[1] }
        },
      },
    ]
    return {
      cells: box(6 - E[0], -21, 62 - E[0], 2),
      exit: [last[0] + 0.5, last[1]],
      lane: { segs, fire: W[1] - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  (slot): PartShot[] => {
    const at = (t: number): Pt => {
      const [x, y] = sophieSky(t)
      return [x - E[0], y - E[1]]
    }
    const end = at(slot.end)
    const land = [LAND_AT[0] - E[0], LAND_AT[1] - E[1]]
    return [
      // The lift: the frame goes on from the alley's (a head of sky over her) and rises with them from the downbeat,
      // letting them climb up the frame only as fast as it keeps rising itself: never a dip under the lift.
      { t: LIFT + 0.6, cells: 5.6, off: [0.35, -0.8] },
      { t: W[2], cells: 6.9, off: [0.4, 0.4] },
      { t: W[4], cells: 7.1, off: [0.5, 0.95] },
      // Coming in on them as they clear the eaves, so the walk over the roofs opens on the two of them.
      { t: W[6], cells: 5.0, off: [0.6, 1.0] },
      // The walk over the roofs is a close two-shot (3.2 to 3.6 cells): the pair a third down with open sky round
      // them, his arm at her shoulder, the lift and glide of every step whole, and only chimney tops, ridges and what
      // answers her step (a puff, a vane, the ridge's pigeons) coming in at the foot as the roofs pass under.
      { t: W[8], cells: 3.4, off: [0.42, 0.57] },
      { t: W[10], cells: 3.3, off: [0.4, 0.55] },
      { t: W[12], cells: 3.4, off: [0.42, 0.57] },
      { t: W[14], cells: 3.5, off: [0.42, 0.58] },
      { t: W[16], cells: 3.5, off: [0.45, 0.58] },
      { t: W[18], cells: 3.6, off: [0.45, 0.6] },
      // The swell (a cut on its downbeat): out to the whole town far below them, the street, the square and the
      // parade at the foot of the frame, the weathercock spinning under her step, the two of them small and high in
      // open sky. The frame draws in on them at once, softly, while the bell's first strokes ring.
      { t: W[NOON_BAR], cells: 23, hold: [TOWER_X + 5 - E[0], -15.55 + 6.9 - E[1]], w: 1, cut: true },
      { t: W[21] - 0.02, cells: 14, hold: [foot(21)[0] + 3.1 - E[0], -15.73 + 4.2 - E[1]], w: 1 },
      // In to a medium on the next stroke (a cut), walking with them past the tower for the strokes of noon and down
      // the long S, a quarter down the frame so that the square comes up into its foot with the parade marching under
      // them, and in to the balcony.
      { t: W[21], cells: 7.5, off: [0.6, 1.6], cut: true },
      { t: W[22] + 0.5, cells: 7.5, off: [0.6, 1.7] },
      { t: W[24], cells: 7.5, off: [0.55, 1.5] },
      { t: W[25] + 0.3, cells: 7.5, off: [0.6, 1.5] },
      { t: W[26] + 0.1, cells: 7.4, off: [0.65, 1.6] },
      { t: W[27], cells: 7.2, off: [0.65, 1.8] },
      { t: W[28], cells: 5.8, off: [0.6, -0.6], w: 0 },
      { t: W[29] + 0.1, cells: 4.8, hold: [land[0] + 0.62, land[1] - 0.55], w: 1 },
      { t: W[31] - 0.2, cells: 4.4, hold: [land[0] + 0.7, land[1] - 0.62], w: 1 },
      // She watches him go: the frame eases back and up after him, so his last step up the air (84.72) is in it (its
      // breath sends petals off the rail's geraniums down past her), and he goes on up out of the top before the cut;
      // the shop opens on this framing.
      { t: AIR_STEP, cells: 5.3, hold: [end[0] + 0.95, end[1] - 1.15], w: 1 },
      { t: slot.end, cells: 5.0, hold: [end[0] + 0.8, end[1] - 1.0], w: 1 },
    ]
  },
)
