import type p5 from 'p5'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, hash, part, type Company, type Ctx, type PartShot } from '../kit'
import { beatsIn } from '../music'
import { DIAL, TOWN } from '../worlds'
import { drawPerched, drawPigeon, drawSoldier } from './figures'
import { ALLEY_EXIT, END, HOP_OFF, howlWalk, LAND_AT, LIFT, NOON_BAR, sophieWalk, STROKES, TOWER_X, W } from './path'
import { G, LINE, lightAt, POTS, SQUARE, TOWER } from './set'

/**
 * The walk on the air (49.035 → 85.8): the sky builder's. The film's most famous minute.
 *
 * On the waltz's first downbeat the two step up off the lane's stones, and climb the air between its walls a step a
 * bar (each step a push on the downbeat that settles at its top by the next), Howl going up and over her to lead on
 * her right, the blob men's arms stretching up after them and falling short. At the eaves the town opens under
 * them; they walk on over the roofs, a step on every downbeat, hers small and stiff at first and freer bar by bar;
 * each chimney they pass over puffs up soft smoke on their step. On the swell (70.002) her step goes right over the
 * town hall's weathercock and sets it spinning, the clock's hand clicks onto noon, the bell below them swings into
 * its first stroke and the pigeons burst out of the belfry, and the camera pulls out to the whole town: the tower,
 * the square with the parade marching across it, the café, the two of them small and high over it all. Twelve
 * strokes of noon, one a bar, while they cross the sky over the square and come down, stepping, in a long S onto
 * the café's balcony, the last step small (81.369). He bows, hops up onto the rail's end on the next downbeat, and
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
export const SKYWALK_HITS: number[] = [...new Set([...W.slice(1, 32), HOP_OFF])].sort((a, b) => a - b)

const E = ALLEY_EXIT
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const sm = (t: number, a: number, b: number) => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
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
      const rise = 1.7 * (1 - Math.exp(-a / 0.75)) * (1 - j * 0.06)
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
    drawPigeon(p, k, weight, ink, face, flap, 1 - sm(s, 0.85, 1))
    p.pop()
  })
}

/* ------------------------------------------------------------------ the parade */

/** The parade crossing the square right to left: a flag-bearer and seven men, a step on every beat of the waltz. */
const PARADE_BEATS = beatsIn(58, END + 1).map((b) => b.t)
const LEAD_AT = 72.3
const LEAD_X = SQUARE[0] + 2.0
const PACE = 0.33
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
  for (let n = 0; n < 8; n++) {
    const x = lead + n * 0.74
    if (x > SQUARE[1] + 3 || x < SQUARE[0] - 2) continue
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
    drawSoldier(p, k, weight, ink, { face: -1, stride: n % 2 ? -stride : stride, stiff: 1, arm: n === 0 ? 0.55 : 0, dark: L.dark })
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
      drawSmoke(p, c, t)
      if (t > 60 && t < END + 1) drawParade(p, c, t)
      drawPigeons(p, c, t)
      p.pop()
    },
  },
  (slot) => {
    const fn = (s: number): Pt => {
      const [x, y] = sophieWalk(slot.begin + s)
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
          const [x, y] = howlWalk(t)
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
      const [x, y] = sophieWalk(t)
      return [x - E[0], y - E[1]]
    }
    const end = at(slot.end)
    const land = [LAND_AT[0] - E[0], LAND_AT[1] - E[1]]
    const wide: Pt = [37 - E[0], -9.55]
    return [
      { t: LIFT + 0.6, cells: 5.6, off: [0.35, 0.8] },
      { t: W[2], cells: 5.8, off: [0.4, 1.05] },
      { t: W[4], cells: 6.2, off: [0.5, 1.2] },
      { t: W[6], cells: 6.8, off: [0.8, 1.5] },
      // Over the roofs the camera goes a little slower than they walk: they cross the frame, the roofs pass under.
      // (Framed with a fifth of the frame over them, so they keep a margin under Zoom.)
      { t: W[8], cells: 6.0, hold: [12.9 - E[0], -12.0], w: 1 },
      { t: W[13], cells: 5.7, hold: [18.1 - E[0], -12.15], w: 1 },
      { t: W[16], cells: 6.2, hold: [23.0 - E[0], -12.35], w: 1 },
      { t: W[18], cells: 7.8, hold: [28.0 - E[0], -13.3], w: 1 },
      { t: W[NOON_BAR], cells: 9.5, hold: [30.1 - E[0], -13.8], w: 1 },
      // The swell: the whole town under them, the two of them against clear sky a fifth down; held while the town
      // lands, then down to the balcony.
      { t: W[21], cells: 20, hold: [wide[0], wide[1] - 1.0], w: 1 },
      { t: W[23] + 0.6, cells: 20, hold: [wide[0] + 0.3, wide[1] - 0.95], w: 1 },
      { t: W[26] + 0.1, cells: 10.5, off: [0.8, 1.2], w: 0 },
      { t: W[28], cells: 5.8, off: [0.6, -0.2], w: 0 },
      { t: W[29] + 0.1, cells: 4.8, hold: [land[0] + 0.62, land[1] - 0.55], w: 1 },
      { t: W[31] - 0.2, cells: 4.4, hold: [land[0] + 0.7, land[1] - 0.62], w: 1 },
      { t: slot.end, cells: 3.6, hold: [end[0] + 0.6, end[1] - 0.5], w: 1 },
    ]
  },
)
