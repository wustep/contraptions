import type p5 from 'p5'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { box, carried, frame, part, type Ctx, type PartShot } from '../kit'
import { JUMPS } from '../music'
import { SEAMS } from '../seams'
import { DOJO, DOJO_THEME, EVELYN, HIBACHI, HIBACHI_THEME, HOME, HOTDOG, HOTDOG_THEME, JOY, LAUNDROMAT, MULTI_THEME, PREMIERE, ROCKS, ROCKS_THEME, STAR } from '../worlds'
import { backdrop, SKINS, type Moment, type Skin } from './skins'
import { at, beam, circle, ellipse, glow, hash, line, lodFor, poly, rect, rgba, round, type Pen } from './skins-pen'

/**
 * The surf: she has learned to jump, and now it comes faster than she can land. The spatula's flip carries on as
 * one long flight, slowing as it rises, and on every big hit the world round her is somewhere else. The ball holds
 * its line through all of them; only the worlds change.
 *
 *   120.953  a birthday party: she bursts out through a star piñata, sweets everywhere
 *   121.510  a street corner: a sign spinner throws his arrow into a spin as she goes past it
 *   122.381  the IRS: the auditor's stamp comes down, and the receipts go up
 *   123.031  karaoke: the mirror ball's beams come on
 *   123.995  a canyon, and two rocks on a ledge: the one quiet world, held (it comes back at 200 s)
 *   125.852  then faster than she can see them, the worlds she has been through, backwards: the kitchen, the hot
 *            dogs, the dojo, the premiere, the laundromat
 *   126.943  black, and she drifts; then every world she flew through comes back at her out of the black, in slivers,
 *            and rings her on 127.663; on 127.791 the ring collapses into her, to a point, and it is the dark, where
 *            Jobu is waiting
 *
 * Each world is drawn round the place she is as it begins, so it is composed on her, and slides past her as she
 * flies on: its far things with her almost, its near things staying where they are.
 */

const BEGIN = JUMPS.surf
const END = JUMPS.void
const SPAN = END - BEGIN

/* ------------------------------------------------------------------ the flight */

/**
 * A throw slowed by the air: velocity eases from the spatula's (2.2, -4.0) towards a slow fall, so that she is
 * drifting down and to the right at (0.8, 0.6) as the dark takes her, as the seams ask.
 */
const V0 = SEAMS.surf.v
const V1 = SEAMS.void.v
const DECAY = V1[0] / V0[0]
const TAU = SPAN / Math.log(1 / DECAY)
const VT = (V1[1] - V0[1] * DECAY) / (1 - DECAY)
export const flight = (x: number): Pt => {
  const f = TAU * (1 - Math.exp(-Math.max(0, x) / TAU))
  return [-0.5 + V0[0] * f, VT * Math.max(0, x) + (V0[1] - VT) * f]
}

/* ------------------------------------------------------------------ the worlds, and when */

type Kind = 'pinata' | 'spinner' | 'irs' | 'karaoke' | 'canyon' | 'flash' | 'black'
interface World {
  at: number
  kind: Kind
  skin?: Skin
}
const WORLDS: World[] = [
  { at: 120.953, kind: 'pinata' },
  { at: 121.51, kind: 'spinner' },
  { at: 122.381, kind: 'irs' },
  { at: 123.031, kind: 'karaoke' },
  { at: 123.995, kind: 'canyon' },
  { at: 125.852, kind: 'flash', skin: SKINS.hibachi },
  { at: 125.957, kind: 'flash', skin: SKINS.hotdog },
  { at: 126.293, kind: 'flash', skin: SKINS.dojo },
  { at: 126.514, kind: 'flash', skin: SKINS.premiere },
  { at: 126.618, kind: 'flash', skin: SKINS.home },
  { at: 126.943, kind: 'black' },
]

/** The ring of worlds: they come in from the black, ring her on the hit, and collapse into her on the jump. */
const RING_FROM = 127.4
const RING_AT = 127.663

/** Every world's first instant is a strike, on the recording's hit; then the ring closing round her, and its collapse. */
export const SURF_HITS: number[] = [...WORLDS.map((w) => w.at), RING_AT, END]

/* ------------------------------------------------------------------ helpers */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (u: number) => {
  const x = clamp01(u)
  return x * x * (3 - 2 * x)
}
const easeOut = (u: number) => 1 - Math.pow(1 - clamp01(u), 3)

interface Scene {
  pen: Pen
  /** Show seconds, and seconds into this world. */
  t: number
  x: number
  /** Where she was as it began, and is now (part cells). */
  b0: Pt
  b: Pt
  /** The frame, in part cells. */
  f: { x0: number; y0: number; x1: number; y1: number }
}

/** Draw `fn` with the pen at her start place, carried after her by `1 - stick` of how far she has gone. */
function layer(s: Scene, stick: number, fn: () => void): void {
  const u = 1 - stick
  at(s.pen, s.b0[0] + u * (s.b[0] - s.b0[0]), s.b0[1] + u * (s.b[1] - s.b0[1]), 0, 1, fn)
}

function fill(s: Scene, colour: string): void {
  const { f } = s
  rect(s.pen, f.x0 - 0.5, f.y0 - 0.5, f.x1 - f.x0 + 1, f.y1 - f.y0 + 1, colour, 0)
}

/** A ballistic thing thrown from the origin: where it is `x` seconds on. */
const thrown = (vx: number, vy: number, x: number, g = 12, drag = 0): Pt => {
  if (drag <= 0) return [vx * x, vy * x + 0.5 * g * x * x]
  const e = 1 - Math.exp(-drag * x)
  const vt = g / drag
  return [(vx / drag) * e, vt * x + ((vy - vt) / drag) * e]
}

/* ------------------------------------------------------------------ 1. the piñata */

const PINK = STAR.neonPink
const TEAL = STAR.neonTeal
const SWEETS = [PINK, TEAL, HOTDOG.mustard, HOTDOG.relish, HOTDOG.lilac, HIBACHI.flame]

function pinata(s: Scene): void {
  const { pen, x } = s
  fill(s, HOTDOG.bun)
  // Flags on a string across the top, far behind.
  layer(s, 0.25, () => {
    const y0 = -2.35
    const n = 12
    for (let i = 0; i < n; i++) {
      const fx = -5.2 + i * 0.95
      const sag = 0.45 * (1 - ((fx - 0.2) / 5.4) ** 2)
      const top = y0 + sag
      const c = SWEETS[i % 5]
      poly(pen, [[fx - 0.36, top], [fx + 0.36, top], [fx + 0.36, top + 0.72], [fx + 0.18, top + 0.62], [fx, top + 0.74], [fx - 0.18, top + 0.62], [fx - 0.36, top + 0.72]], c, 0.8)
      if (pen.lod === 0) poly(pen, [[fx, top + 0.18], [fx + 0.11, top + 0.36], [fx, top + 0.54], [fx - 0.11, top + 0.36]], HOTDOG.bun, 0)
    }
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.moveTo(-5.8, y0 - 0.02)
      pen.ctx.quadraticCurveTo(0.2, y0 + 0.9, 6.2, y0 - 0.02)
      pen.ctx.strokeStyle = pen.ink
      pen.ctx.lineWidth = pen.lw * 0.8
      pen.ctx.stroke()
    }
  })
  // The garden.
  layer(s, 1, () => {
    rect(pen, -6, 2.3, 14, 4, HOTDOG.relish)
    line(pen, -6, 2.3, 8, 2.3, pen.ink, pen.lw)
  })
  // The star, where she comes through it: whole before, in pieces after.
  layer(s, 1, () => {
    if (x < 0) {
      const sw = 0.08 * Math.sin(s.t * 2.3)
      line(pen, 0, -4, Math.sin(sw) * 0.5, -0.5, pen.ink, pen.lw)
      at(pen, 0, 0, sw, 1, () => star(pen, 1))
      return
    }
    // The rope, cut, springs up.
    const up = easeOut(x / 0.35) * 1.6
    line(pen, 0, -4, 0, -0.5 - up, pen.ink, pen.lw)
    glow(pen, 0, 0, 2.2, HOME.light, 0.95 * Math.exp(-x / 0.12))
    // The five points, and the body in pieces, flying apart and turning as they fall.
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 11 + 0.3
      const sp = 3.4 + 1.6 * hash(i, 1, 7)
      const [px, py] = thrown(Math.cos(a) * sp, Math.sin(a) * sp - 1.4, x, 12, 1.2)
      at(pen, px, py, (hash(i, 2, 7) - 0.5) * 12 * x + a, 1, () => {
        if (i % 2 === 0) poly(pen, [[-0.26, 0.14], [0, -0.66], [0.26, 0.14]], i % 4 ? TEAL : HOTDOG.mustard, 1)
        else poly(pen, [[-0.3, -0.12], [0.22, -0.28], [0.32, 0.16], [-0.16, 0.24]], PINK, 1)
      })
    }
    // Sweets, and streamers.
    for (let i = 0; i < 36; i++) {
      const a = hash(i, 3, 7) * Math.PI * 2
      const sp = 2 + 4 * hash(i, 4, 7)
      const [px, py] = thrown(Math.cos(a) * sp, Math.sin(a) * sp - 1.8, x, 12, 1.0)
      const c = SWEETS[i % SWEETS.length]
      at(pen, px, py, a + x * 9 * (hash(i, 5, 7) - 0.5), 1.3, () => {
        if (i % 4 === 0) {
          rect(pen, -0.03, -0.3, 0.06, 0.6, c, 0)
        } else {
          poly(pen, [[-0.05, 0], [-0.14, -0.08], [-0.14, 0.08]], c, 0.6)
          poly(pen, [[0.05, 0], [0.14, -0.08], [0.14, 0.08]], c, 0.6)
          ellipse(pen, 0, 0, 0.07, 0.055, c, 0.7)
        }
      })
    }
  })
}

function star(pen: Pen, s: number): void {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
    poly(pen, [[Math.cos(a - 0.32) * 0.42 * s, Math.sin(a - 0.32) * 0.42 * s], [Math.cos(a) * 1.0 * s, Math.sin(a) * 1.0 * s], [Math.cos(a + 0.32) * 0.42 * s, Math.sin(a + 0.32) * 0.42 * s]], i % 2 ? TEAL : HOTDOG.mustard, 1)
    if (pen.lod <= 1) circle(pen, Math.cos(a) * 1.02 * s, Math.sin(a) * 1.02 * s, 0.05, PINK, 0)
  }
  circle(pen, 0, 0, 0.5 * s, PINK, 1)
  if (pen.lod === 0) for (let i = 0; i < 3; i++) line(pen, -0.2 + i * 0.2, 0.46, -0.24 + i * 0.2, 1.1, SWEETS[i + 1], 0.06)
}

/* ------------------------------------------------------------------ 2. the sign spinner */

function spinner(s: Scene): void {
  const { pen, x } = s
  fill(s, HOME.glass)
  // The block across the street, far.
  layer(s, 0.2, () => {
    const c = mixHex(HOME.glass, HOME.glassDeep, 0.55)
    const tops = [1.1, 0.2, 0.7, -0.4, 0.5, 1.3, -0.1, 0.8]
    tops.forEach((y, i) => rect(pen, -5 + i * 1.3, y, 1.25, 4, c, 0))
    if (pen.lod === 0) tops.forEach((y, i) => { for (let r = 0; r < 3; r++) rect(pen, -4.8 + i * 1.3, y + 0.3 + r * 0.5, 0.85, 0.16, mixHex(c, HOME.glass, 0.45), 0) })
  })
  // The kerb he stands on.
  layer(s, 1, () => {
    rect(pen, -6, 2.4, 14, 3, HOME.steel)
    rect(pen, -6, 2.4, 14, 0.12, HOME.steelDark, 0)
    line(pen, -6, 2.4, 8, 2.4, pen.ink, pen.lw)
  })
  // The spinner: a figure against the sky, arms up, his arrow over his head, sent spinning on the hit.
  layer(s, 1, () => {
    const cx = 2.5
    const foot = 2.4
    const ink = LAUNDROMAT.ink
    // He dips as he throws, and comes up again.
    const dip = x < 0 ? 0 : 0.12 * Math.sin(Math.min(Math.PI, (x / 0.4) * Math.PI))
    at(pen, cx, foot, 0, 1, () => {
      // Legs, planted wide.
      poly(pen, [[-0.62, 0], [-0.3, 0], [-0.08, -2.3 + dip], [-0.36, -2.3 + dip]], ink, 0)
      poly(pen, [[0.62, 0], [0.3, 0], [0.08, -2.3 + dip], [0.36, -2.3 + dip]], ink, 0)
      poly(pen, [[-0.26, 0.02], [-0.74, 0.02], [-0.7, -0.14], [-0.3, -0.14]], ink, 0)
      poly(pen, [[0.26, 0.02], [0.78, 0.02], [0.74, -0.14], [0.3, -0.14]], ink, 0)
      // The body: hips to shoulders.
      poly(pen, [[-0.4, -2.2 + dip], [0.4, -2.2 + dip], [0.56, -3.75 + dip], [-0.56, -3.75 + dip]], ink, 0)
      rect(pen, -0.1, -3.95 + dip, 0.2, 0.25, ink, 0)
      circle(pen, 0, -4.25 + dip, 0.34, ink, 0)
      // A cap, its peak forward.
      poly(pen, [[-0.34, -4.36 + dip], [0.3, -4.44 + dip], [0.68, -4.32 + dip], [0.3, -4.28 + dip]], ink, 0)
      // Arms up to the sign.
      pen.ctx.lineCap = 'round'
      pen.ctx.beginPath()
      pen.ctx.moveTo(-0.48, -3.65 + dip)
      pen.ctx.lineTo(-0.72, -4.4 + dip)
      pen.ctx.lineTo(-0.34, -5.0 + dip * 0.5)
      pen.ctx.moveTo(0.48, -3.65 + dip)
      pen.ctx.lineTo(0.74, -4.4 + dip)
      pen.ctx.lineTo(0.18, -5.02 + dip * 0.5)
      pen.ctx.strokeStyle = ink
      pen.ctx.lineWidth = 0.24
      pen.ctx.stroke()
    })
    // The arrow, turning about his hands: flung round twice on the hit, and settling pointing up and on, the way
    // she is going.
    const turn = easeOut(x / 0.8)
    const ring = x > 0.8 ? 0.1 * Math.exp(-(x - 0.8) / 0.15) * Math.sin((x - 0.8) * 22) : 0
    const a = -0.3 + Math.PI * 4 * turn + ring
    at(pen, cx - 0.08, foot - 5.0, a, 1, () => {
      poly(pen, [[-1.7, -0.36], [0.9, -0.36], [0.9, -0.6], [1.75, 0], [0.9, 0.6], [0.9, 0.36], [-1.7, 0.36]], HOME.gold, 1.2)
      if (pen.lod <= 1) poly(pen, [[-1.35, -0.13], [0.7, -0.13], [0.7, -0.3], [1.28, 0], [0.7, 0.3], [0.7, 0.13], [-1.35, 0.13]], HOME.red, 0)
    })
  })
}

/* ------------------------------------------------------------------ 3. the IRS */

function irs(s: Scene): void {
  const { pen, x } = s
  fill(s, ROCKS.sky)
  // Blinds on a window, far, and a strip light.
  layer(s, 0.25, () => {
    rect(pen, -4.2, -2.2, 2.4, 2.6, mixHex(ROCKS.sky, HOME.glass, 0.6), 1)
    if (pen.lod <= 1) for (let i = 1; i < 10; i++) line(pen, -4.2, -2.2 + i * 0.26, -1.8, -2.2 + i * 0.26, HOME.steel, pen.lw * 1.4)
    round(pen, -0.6, -2.9, 3.4, 0.14, 0.07, HOME.light, 1)
  })
  // The auditor's desk under her: her in-tray, her trophies, her stamp, and the receipts.
  layer(s, 1, () => {
    const top = 1.2
    rect(pen, -2.4, top, 5.4, 0.16, HOME.wood)
    rect(pen, -2.2, top + 0.16, 1.4, 1.6, mixHex(HOME.wood, LAUNDROMAT.ink, 0.15))
    if (pen.lod <= 1) for (let i = 1; i < 3; i++) {
      line(pen, -2.2, top + 0.16 + i * 0.53, -0.8, top + 0.16 + i * 0.53, pen.ink, pen.lw)
      rect(pen, -1.62, top + i * 0.53 - 0.16, 0.24, 0.05, HOME.steelDark, 0)
    }
    rect(pen, 2.5, top + 0.16, 0.14, 1.6, HOME.wood)
    // Trophies.
    for (const [tx, sc] of [[1.7, 1.2], [2.35, 0.9]] as const) {
      at(pen, tx, top, 0, sc, () => {
        rect(pen, -0.2, -0.12, 0.4, 0.12, HOME.steelDark, 1)
        rect(pen, -0.05, -0.5, 0.1, 0.38, STAR.gold, 1)
        poly(pen, [[-0.28, -1.05], [0.28, -1.05], [0.2, -0.66], [0.06, -0.5], [-0.06, -0.5], [-0.2, -0.66]], STAR.gold, 1)
      })
    }
    // The stack of receipts, which goes up on the hit.
    const sheets = 18
    for (let i = 0; i < sheets; i++) {
      const sx = -1.9 + 0.02 * ((i * 7) % 3)
      const sy = top - 0.07 - i * 0.07
      if (x < 0.02) {
        rect(pen, sx - 0.36, sy - 0.03, 0.72, 0.06, HOME.paper, 0.6)
        continue
      }
      const vx = -1.5 + 3 * hash(i, 1, 11)
      const vy = -4.5 - 3 * hash(i, 2, 11)
      const [px, py] = thrown(vx, vy, x, 6, 2.6)
      const flutter = Math.sin(x * (6 + 4 * hash(i, 3, 11)) + i)
      at(pen, sx + px + 0.1 * flutter, sy + py, flutter * 0.9 + (hash(i, 4, 11) - 0.5), 1, () => {
        rect(pen, -0.3, -0.2, 0.6, 0.4, HOME.paper, 1)
        if (pen.lod === 0) for (let r = 0; r < 3; r++) line(pen, -0.2, -0.1 + r * 0.1, 0.15, -0.1 + r * 0.1, HOME.steel, pen.lw * 0.8)
      })
    }
    // The form, and the stamp slamming down on it: the red mark it leaves.
    rect(pen, 0.1, top - 0.03, 1.0, 0.04, HOME.paper, 0.7)
    const down = x < 0 ? 0 : x < 0.06 ? 1 : Math.max(0, 1 - easeOut((x - 0.06) / 0.35))
    const lift = x < -0.15 ? 0.9 : x < 0 ? 0.9 + 0.3 * smooth((x + 0.15) / 0.15) : 1.2 * (1 - down)
    const sy = top - 0.05 - lift
    if (x > 0) rect(pen, 0.35, top - 0.05, 0.5, 0.02, HOME.red, 0)
    rect(pen, 0.33, sy - 0.14, 0.54, 0.14, HOME.red, 1)
    rect(pen, 0.38, sy - 0.26, 0.44, 0.12, HOME.steelDark, 1)
    rect(pen, 0.54, sy - 0.66, 0.12, 0.4, HOME.wood, 1)
    ellipse(pen, 0.6, sy - 0.74, 0.18, 0.12, HOME.wood, 1)
    if (x >= 0 && x < 0.25) glow(pen, 0.6, top, 0.9, HOME.light, 0.6 * (1 - x / 0.25))
  })
}

/* ------------------------------------------------------------------ 4. karaoke */

function karaoke(s: Scene): void {
  const { pen, x } = s
  fill(s, PREMIERE.bg)
  const on = x < 0 ? 0 : 1 - Math.exp(-x / 0.05)
  const flare = x < 0 ? 0 : Math.exp(-x / 0.3)
  // The mirror ball, up and ahead of her, and its beams sweeping the room.
  layer(s, 0.35, () => {
    const bx = 1.9
    const by = -1.5
    const turn = s.t * 1.1
    for (let i = 0; i < 7; i++) {
      const a = turn + (i * Math.PI * 2) / 7
      const c = i % 2 ? TEAL : PINK
      beam(pen, bx, by, bx + Math.cos(a) * 6, by + 2 + Math.sin(a) * 3.4, 0.08, 1.4, c, (0.18 + 0.4 * flare) * on)
    }
    line(pen, bx, -4, bx, by - 0.62, pen.ink, pen.lw)
    circle(pen, bx, by, 0.62, HIBACHI.steel, 1)
    if (pen.lod <= 1) {
      const g = pen.ctx
      g.save()
      g.beginPath()
      g.arc(bx, by, 0.62, 0, Math.PI * 2)
      g.clip()
      const sq = 0.13
      for (let gx = -0.62; gx < 0.62; gx += sq) {
        for (let gy = -0.62; gy < 0.62; gy += sq) {
          const lit = hash(Math.round((gx + turn * 0.5) / sq), Math.round(gy / sq), 5)
          if (lit > 0.5) rect(pen, bx + gx + 0.01, by + gy + 0.01, sq - 0.02, sq - 0.02, lit > 0.8 && on > 0.5 ? STAR.flash : STAR.cream, 0)
        }
      }
      g.restore()
      circle(pen, bx, by, 0.62, null, 1)
    }
    glow(pen, bx, by, 1.4, STAR.flash, (0.2 + 0.6 * flare) * on)
    // Flecks of light thrown on the walls.
    if (pen.lod <= 1 && on > 0.1) {
      for (let i = 0; i < 22; i++) {
        const a = hash(i, 1, 13) * Math.PI * 2 + turn * 0.6
        const d = 1.6 + 3.4 * hash(i, 2, 13)
        rect(pen, bx + Math.cos(a) * d * 1.3, by + 0.6 + Math.sin(a) * d * 0.55, 0.07, 0.07, i % 3 ? STAR.cream : i % 2 ? PINK : TEAL, 0)
      }
    }
  })
  // The stage, the microphone on its stand in a spot.
  layer(s, 1, () => {
    const floor = 2.2
    beam(pen, -1.9, -4, -1.9, floor, 0.3, 1.8, STAR.spot, 0.25 * on)
    rect(pen, -6, floor, 14, 3, STAR.wet)
    rect(pen, -6, floor, 14, 0.1, STAR.brass, 0)
    line(pen, -6, floor, 8, floor, pen.ink, pen.lw)
    line(pen, -1.9, floor, -1.9, floor - 2.1, HIBACHI.steel, 0.07)
    line(pen, -2.2, floor, -1.6, floor, HIBACHI.steel, 0.08)
    at(pen, -1.9, floor - 2.1, -0.4, 1, () => {
      poly(pen, [[-0.06, 0], [0.06, 0], [0.09, -0.45], [-0.09, -0.45]], HOTDOG.piano, 1)
      circle(pen, 0, -0.56, 0.15, HIBACHI.steel, 1)
    })
    rect(pen, -4.3, floor - 1.6, 1.1, 1.6, HOTDOG.piano, 1)
    circle(pen, -3.75, floor - 0.55, 0.36 * (1 + 0.1 * flare), HIBACHI.steelDeep, 1)
    circle(pen, -3.75, floor - 1.25, 0.18, HIBACHI.steelDeep, 1)
  })
}

/* ------------------------------------------------------------------ 5. the canyon */

function canyon(s: Scene): void {
  const { pen } = s
  fill(s, ROCKS.sky)
  // The far rim, flat-topped, a long way off.
  layer(s, 0.08, () => {
    poly(pen, [[-8, 0.9], [-5.6, 0.85], [-5.2, 0.25], [-3.1, 0.2], [-2.8, 0.8], [0.9, 0.75], [1.2, 0.05], [4.4, 0.0], [4.7, 0.65], [9, 0.6], [9, 6], [-8, 6]], ROCKS.far, 0)
  })
  // The canyon's far wall, across the gulf, in its layers, and the gulf's shadow going down and down.
  layer(s, 0.3, () => {
    const face = mixHex(ROCKS.canyon, ROCKS.far, 0.25)
    poly(pen, [[2.1, 7], [2.3, 1.05], [3.0, 0.8], [4.6, 0.85], [5.3, 0.6], [10, 0.65], [10, 7]], face, 1)
    if (pen.lod <= 1) for (const [y, x0] of [[1.35, 2.25], [1.8, 2.2], [2.4, 2.15], [3.1, 2.1], [4.0, 2.05]] as const) line(pen, x0 + 0.1, y, 10, y - 0.1, ROCKS.canyonShade, pen.lw * 1.1)
    poly(pen, [[-0.6, 1.6], [2.3, 1.05], [2.1, 7], [-0.6, 7]], ROCKS.canyonShade, 0)
    poly(pen, [[0.4, 3.0], [2.2, 2.2], [2.1, 7], [0.2, 7]], mixHex(ROCKS.canyonShade, ROCKS_THEME.ink, 0.25), 0)
  })
  // The ledge, near, in the foreground low on the left, and the two rocks sitting on its lip, side by side: hers,
  // and Joy's nearer the edge. They are the rocks of the rocks leg (200 s), before anything has happened to them.
  layer(s, 1, () => {
    at(pen, -0.8, 1.3, 0, 2.6, () => {
      const lw = pen.lw
      pen.lw = lw / 2.6
      poly(pen, [[-9, 0], [0.35, 0], [0.43, 0.12], [0.34, 0.34], [0.46, 0.7], [0.3, 3], [-9, 3]], ROCKS.stone, 1)
      poly(pen, [[0.35, 0], [0.43, 0.12], [0.34, 0.34], [0.46, 0.7], [0.3, 3], [0.2, 3], [0.26, 0.6], [0.2, 0.2]], ROCKS.stoneDeep, 0)
      if (pen.lod <= 1) line(pen, -3, 0.2, -0.3, 0.23, ROCKS.stoneDeep, pen.lw * 1.2)
      stone(pen, -0.46, 0, 0.46, 0.34, EVELYN_STONE, 3, false)
      stone(pen, 0.03, 0, 0.34, 0.27, JOY_STONE, 8, true)
      pen.lw = lw
    })
  })
}

/** Gone to stone, as the rocks leg has them: their own colours, but only a hint left. */
const EVELYN_STONE = mixHex(EVELYN, ROCKS.stoneDeep, 0.68)
const JOY_STONE = mixHex(JOY, ROCKS.stoneDeep, 0.66)
const GRIT = mixHex(ROCKS.stoneDeep, ROCKS.canyonShade, 0.4)

/**
 * A stone sitting on the ground at `base`, `w` wide and `h` tall: a lumpy pebble with a flatter underside (or, for
 * Joy's, fewer and sharper facets), a light face on top where the sky falls on it, and grit speckled over it.
 */
function stone(pen: Pen, cx: number, base: number, w: number, h: number, col: string, seed: number, angular: boolean): void {
  const n = angular ? 7 : 11
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3 * hash(seed, 1, 5)
    const lump = 1 + (hash(i, seed, 5) - 0.5) * (angular ? 0.34 : 0.16)
    const x = cx + Math.cos(a) * (w / 2) * lump
    const y = Math.min(base - h / 2 + Math.sin(a) * (h / 2) * lump, base)
    pts.push([x, y])
  }
  const path = () => {
    const { ctx } = pen
    ctx.beginPath()
    if (angular) {
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1])
    } else {
      const mid = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2]
      const m0 = mid(n - 1)
      ctx.moveTo(m0[0], m0[1])
      for (let i = 0; i < n; i++) {
        const m = mid(i)
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1])
      }
    }
    ctx.closePath()
  }
  const { ctx } = pen
  // Its shadow on the ledge.
  ctx.fillStyle = rgba(ROCKS.canyonShade, 0.45)
  ctx.beginPath()
  ctx.ellipse(cx + w * 0.08, base + 0.004, w * 0.55, h * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  path()
  ctx.fillStyle = col
  ctx.fill()
  ctx.save()
  path()
  ctx.clip()
  // The light top face, and a darker underside.
  ctx.fillStyle = mixHex(col, ROCKS.sky, 0.38)
  ctx.beginPath()
  ctx.ellipse(cx - w * 0.1, base - h * 0.86, w * 0.36, h * 0.28, -0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = mixHex(col, ROCKS.canyonShade, 0.35)
  ctx.fillRect(cx - w, base - h * 0.2, 2 * w, h * 0.2)
  if (pen.lod <= 1) {
    ctx.fillStyle = GRIT
    // Scattered evenly over its face (a sunflower's spiral, jittered), never in a line.
    for (let i = 0; i < 10; i++) {
      const a = i * 2.39996 + seed
      const r = Math.sqrt((i + 0.5) / 10) * 0.78
      const x = cx + Math.cos(a) * r * (w / 2) + (hash(i, seed, 9) - 0.5) * w * 0.06
      const y = base - h / 2 + Math.sin(a) * r * (h / 2)
      ctx.beginPath()
      ctx.arc(x, y, w * 0.016 * (0.7 + hash(i, seed, 11)), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
  path()
  ctx.strokeStyle = pen.ink
  ctx.lineWidth = pen.lw
  ctx.stroke()
}


/* ------------------------------------------------------------------ 6. the worlds she came through, backwards */

function flash(s: Scene, skin: Skin): void {
  const { pen, f } = s
  // The skin is drawn with its ground a little under her, carried along with her mostly: a glimpse, not a place.
  const u = 0.55
  const ox = s.b0[0] + u * (s.b[0] - s.b0[0]) + 0.4
  const oy = s.b0[1] + u * (s.b[1] - s.b0[1]) + 1.6
  const scale = 1.25
  const m: Moment = { t: s.t, since: s.x, s: 1.1, e: true }
  at(pen, ox, oy, 0, scale, () => {
    const inv = 1 / scale
    const v = { x0: (f.x0 - ox) * inv, y0: (f.y0 - oy) * inv, x1: (f.x1 - ox) * inv, y1: (f.y1 - oy) * inv }
    backdrop({ ...pen, lw: pen.lw * inv, ink: skin.ink }, skin, m, v)
  })
}

/* ------------------------------------------------------------------ 7. the ring of worlds, and the collapse */

/** The worlds she flew through, each as a sliver: its paper, the colour it is known by, and its ink. */
const SLIVERS: [string, string, string][] = [
  [HOTDOG.bun, PINK, HOTDOG_THEME.ink],
  [HOME.glass, HOME.gold, LAUNDROMAT.ink],
  [ROCKS.sky, STAR.gold, LAUNDROMAT.ink],
  [PREMIERE.bg, TEAL, PREMIERE.ink],
  [ROCKS.sky, ROCKS.canyon, ROCKS_THEME.ink],
  [HIBACHI_THEME.bg, HIBACHI.flame, HIBACHI_THEME.ink],
  [HOTDOG_THEME.bg, HOTDOG.sausage, HOTDOG_THEME.ink],
  [DOJO.screen, DOJO.lacquer, DOJO_THEME.ink],
  [PREMIERE.bg, STAR.carpet, PREMIERE.ink],
  [HOME.tile, HOME.enamel, LAUNDROMAT.ink],
]

/**
 * Out of the black the worlds come back at her, every one she flew through, in long slivers from beyond the frame,
 * and ring her on 127.663, stopping hard; then the ring turns and collapses into her, to nothing, on the jump.
 */
function ring(s: Scene): void {
  const { pen, t, b } = s
  const n = SLIVERS.length * 2
  const collapse = t < RING_AT ? 0 : Math.min(1, (t - RING_AT) / (END - RING_AT))
  const shrink = 1 - collapse * collapse
  const spin = 0.35 * smooth((t - RING_FROM) / (RING_AT - RING_FROM)) + 2.6 * collapse * collapse
  at(pen, b[0], b[1], 0, 1, () => {
    for (let i = 0; i < n; i++) {
      const [paper, mark, ink] = SLIVERS[i % SLIVERS.length]
      // Each comes in on its own clock and stops, hard, on the hit.
      const lag = 0.09 * hash(i, 1, 17)
      const u = clamp01((t - RING_FROM - lag) / (RING_AT - RING_FROM - lag))
      const come = 1 - Math.pow(1 - u, 3)
      const far = 5.5 + 1.5 * hash(i, 2, 17)
      const near = i % 2 ? 1.25 : 1.6
      const r0 = (far + (near - far) * come) * shrink
      const len = (i % 2 ? 0.9 : 1.2) * (0.6 + 0.4 * come) * shrink
      if (len < 0.01) continue
      const a = (i / n) * Math.PI * 2 + spin + (i % 2 ? Math.PI / n : 0)
      const wi = 0.05 * shrink
      const wo = (i % 2 ? 0.13 : 0.17) * shrink
      at(pen, 0, 0, a, 1, () => {
        const r1 = r0 + len
        poly(pen, [[r0, -wi], [r1, -wo], [r1, wo], [r0, wi]], paper, 0)
        poly(pen, [[r0 + len * 0.62, -wi - (wo - wi) * 0.62], [r1, -wo], [r1, wo], [r0 + len * 0.62, wi + (wo - wi) * 0.62]], mark, 0)
        pen.ctx.beginPath()
        pen.ctx.moveTo(r0, -wi)
        pen.ctx.lineTo(r1, -wo)
        pen.ctx.lineTo(r1, wo)
        pen.ctx.lineTo(r0, wi)
        pen.ctx.closePath()
        pen.ctx.strokeStyle = ink
        pen.ctx.lineWidth = pen.lw * 0.8
        pen.ctx.stroke()
      })
    }
    // The clamp on the hit: a hard white light off all of them at once; then, as it collapses into her, their light
    // gathered, going out with it.
    const x = t - RING_AT
    if (x >= 0) glow(pen, 0, 0, 2.0 * shrink + 0.3, HOME.light, 0.65 * Math.exp(-x / 0.04) + 0.35 * collapse * shrink)
  })
}

/* ------------------------------------------------------------------ the part */

interface SurfState {
  begin: number
}

function paint(p: p5, _s: SurfState, c: Ctx): void {
  const t = BEGIN + c.t
  if (t < BEGIN - 1.0 || t > END + 0.05) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, c.k)
  const q = c.k * p.pixelDensity()
  ctx.save()
  ctx.scale(c.k, c.k)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  let i = 0
  for (let j = 0; j < WORLDS.length; j++) if (t >= WORLDS[j].at) i = j
  const w = WORLDS[i]
  const x = t - w.at
  const pen: Pen = { ctx, q, lw: c.weight / c.k, lod: lodFor(q), ink: w.skin?.ink ?? inkOf(w.kind) }
  const s: Scene = { pen, t, x, b0: flight(Math.max(0, w.at - BEGIN)), b: flight(t - BEGIN), f }
  switch (w.kind) {
    case 'pinata':
      pinata(s)
      break
    case 'spinner':
      spinner(s)
      break
    case 'irs':
      irs(s)
      break
    case 'karaoke':
      karaoke(s)
      break
    case 'canyon':
      canyon(s)
      break
    case 'flash':
      flash(s, w.skin!)
      break
    case 'black':
      fill(s, MULTI_THEME.bg)
      if (t >= RING_FROM) ring(s)
      break
  }
  ctx.restore()
}

const inkOf = (k: Kind): string =>
  k === 'karaoke' ? PREMIERE.ink : k === 'canyon' ? ROCKS_THEME.ink : k === 'black' ? MULTI_THEME.ink : LAUNDROMAT.ink

export const surf = part<SurfState>(
  { name: 'surf', draw: paint },
  (slot) => {
    const span = slot.end - slot.begin
    const lane: Seg[] = carried(flight, 0, span, 140)
    const end = flight(span)
    return {
      cells: box(-5, -14, 15, 5),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs: lane, fire: 0 },
      state: { begin: slot.begin },
    }
  },
  (slot): PartShot[] => [
    { t: slot.begin + 0.45, cells: 5, off: [0.25, -0.1] },
    { t: 123.9, cells: 5.1, off: [0.2, 0] },
    { t: 124.9, cells: 6.3, off: [-0.2, 0.7] },
    { t: 125.8, cells: 6.0, off: [0, 0.5] },
    { t: 126.6, cells: 5.2, off: [0.1, 0] },
    { t: slot.end, cells: 5, off: [0, 0] },
  ],
)

