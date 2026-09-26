import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, knock, scenery, smooth } from '../kit'
import { AT, bar, beat, beatsIn } from '../music'
import { CHURCH, CLINIC, HILL, HOME, INK } from '../worlds'

/**
 * The church (the church builder's set): a small white chapel cut open down its length, like the house, seen from the
 * side, under a steep gable. The organ and the altar at the left, three oak pews along the aisle, the porch and the
 * doors at the right under the bell tower, and outside them the landing and a short flight of stone steps down to the
 * street.
 *
 * The same set in two lights. The wedding (0 to 21.577): morning, warm plaster, the glass lit and throwing its colour,
 * the organ playing the march, the bell pealing, the doors thrown open. The funeral (189.452 to 201.944): grey, the
 * glass dull, the organ silent, white lilies and the wedding photograph on an easel where the two of them stood, and
 * the same bell tolling once.
 *
 * Drawn from show time (`c.t`) in the church world's cells from its origin. The wedding and the funeral parts draw
 * what stands in front of Carl (the near congregation, the photographer, the petals, the flash) in their `over`, and
 * read the clocks and the geometry here.
 */

/* ------------------------------------------------------------------ the geometry */

export const CH = {
  /** The floor's surface; a standing ball's (or Carl's) centre is at y = 0. */
  floor: 0.13,
  /** The apse wall behind the organ, in section. */
  apse: [-3.75, -3.45] as Pt,
  /** The walls' top inside (a tie beam runs along it), and the roof over the nave: a steep gable, its eaves and its peak. */
  wallTop: -2.5,
  eaves: [-4.1, -2.42] as Pt,
  peak: [-0.05, -4.72] as Pt,
  roofTh: 0.3,
  /** The tower at the front: its inner wall over the arch into the nave, its outer wall (the front, with the doors). */
  tower: [3.72, 4.98] as Pt,
  wall: 0.14,
  archTop: -2.35,
  doorTop: -2.05,
  /** The belfry: its openings' top, its floor; the spire's point. */
  belfry: [-4.98, -3.95] as Pt,
  spire: -7.6,
  /** The bell's pivot (its headstock). */
  bell: [4.35, -4.76] as Pt,
  /** The organ: its case (x), the impost the pipes stand on (y). */
  organ: [-3.35, -1.75] as Pt,
  impost: -0.95,
  /** The altar table: [x0, x1, top]. */
  altar: [-1.4, -0.6, -0.55] as [number, number, number],
  /** The pews' seat centres (x), the front pew first; their seats' surface; their backs' tops. */
  pews: [1.75, 2.5, 3.25],
  seat: -0.39,
  pewBack: -0.98,
  /** The landing outside the doors, level with the floor, and the steps down from it to the street. */
  landing: [4.98, 5.45] as Pt,
  tread: 0.35,
  rise: 0.22,
  /** Three risers: two treads, then the street. */
  risers: 3,
  /** The street's surface (the steps' foot). */
  street: 0.13 + 0.66,
}

/** Where the two stand at the altar (Carl, and Ellie a step to his right). */
export const ALTAR_CARL = 0.1
export const ALTAR_ELLIE = 0.46
/** Carl seated in the front pew: his centre 0.65 above the floor, like a chair. */
export const SEATED: Pt = [CH.pews[0], CH.floor - 0.65]
/** Where he comes to rest at the foot of the steps. */
export const FOOT: Pt = [6.4, CH.street - 0.13]
/** The underside of the roof over x: up the left slope to the peak, down the right to the tower. */
export function roofY(x: number): number {
  const [ex, ey] = CH.eaves
  const [px, py] = CH.peak
  const slope = (ey - py) / (px - ex)
  return x <= px ? ey - (x - ex) * slope : py + (x - px) * slope
}

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const CHURCH_BOX: [number, number, number, number] = [-6, -8, 9, 2]

/* ------------------------------------------------------------------ the clocks (show seconds) */

/** The wedding's clock: the flash, the march the organ plays, the kiss, the peal, the doors. */
export const WED = {
  flash: AT.flash,
  /** The march's onsets the organ strikes (the ones strong enough to read), and which of its five ranks speak on each. */
  march: [
    [1.37, [1]],
    [1.654, [3]],
    [2.078, [2, 0, 4]],
    [2.421, [1]],
    [3.448, [2, 1, 3]],
    [3.686, [4]],
    [3.994, [0]],
    [4.429, [2, 3]],
    [5.306, [1]],
    [6.211, [3]],
    [7.848, [0]],
    [8.649, [2, 4]],
    [8.969, [1]],
    [9.613, [2, 0, 4]],
    [10.246, [3]],
    [12.202, [2, 1, 3]],
    [13.247, [0]],
    [14.251, [4]],
    [15.412, [1]],
    [16.811, [2, 3]],
  ] as [number, number[]][],
  /** Waltz bar 1: the kiss, and the organ's great chord. */
  kiss: AT.waltz,
  /** The peal: the bell's clapper on the downbeats of waltz bars 2, 3 and 4 (and on, out of sight). */
  peal: [bar('waltz', 2), bar('waltz', 3), bar('waltz', 4), bar('waltz', 5), bar('waltz', 6)],
  /** The doors flung open as she reaches them, on bar 4's second beat. */
  doors: beat('waltz', 4, 2),
}

/** The funeral's clock: the one toll on the cue's strongest onset, and its answer as the bell swings back. */
export const FUN = {
  from: 189.452,
  toll: AT.church,
  answer: 198.409,
}

/** Whether a show time is the funeral's light (the church is seen twice: the wedding, and the funeral). */
export const gloomy = (t: number): boolean => t > 100

/**
 * The funeral opens under the hospital's night (Stephen's note on transitions: open a cut under the last scene's
 * light before waking it): at the cut the church is dim and blue, the glass dark, no beam; the grey morning comes up
 * over it slowly, and the one pale beam and its dust come last. 0 at the cut, 1 once it is morning.
 */
export const waking = (t: number): number => smooth(t, FUN.from, FUN.from + 2.9)
/** The beam and the dust in it: the last of the light to come. */
export const beamUp = (t: number): number => smooth(t, FUN.from + 1.3, FUN.from + 3.4)

/** The march's beats and the waltz's: the families' bounce and the organ's pump. */
const PULSE = beatsIn(0, 24).map((b) => b.t)

/** Where `t` is in the pulse: the beat's index plus how far through it (negative before the first). */
export function pulse(t: number): number {
  if (t < PULSE[0]) return (t - PULSE[0]) / 0.34
  for (let i = 0; i < PULSE.length - 1; i++) if (t < PULSE[i + 1]) return i + (t - PULSE[i]) / (PULSE[i + 1] - PULSE[i])
  return PULSE.length - 1 + (t - PULSE[PULSE.length - 1]) / 0.34
}

/** A bounce that lands on the beat: 0 on it, 1 halfway to the next. `every` 2 bounces on every other beat. */
export function bounce(t: number, every = 1, offset = 0): number {
  const ph = (pulse(t) - offset) / every
  const u = ph - Math.floor(ph)
  return 4 * u * (1 - u)
}

/** How lit the organ's rank `r` is at `t`: 1 as it speaks, dying away. The great chord lights every rank. */
export function rankLight(r: number, t: number): number {
  let v = 0
  for (const [s, ranks] of WED.march) if (ranks.includes(r) && t >= s) v = Math.max(v, knock(t - s, 0.34) * (ranks.length > 1 ? 1 : 0.85))
  if (t >= WED.kiss) v = Math.max(v, knock(t - WED.kiss, 1.1))
  // A soft sustain while it plays, so the façade is alive between the notes.
  const playing = smooth(t, 1.2, 1.6) * (1 - smooth(t, 17.6, 19.5))
  return Math.max(v, 0.14 * playing)
}

/** The reservoir's fill (0 empty, 1 full): drawn down by every note, pumped back up by the feeder on the beat. */
export function bellowsFill(t: number): number {
  if (gloomy(t)) return 0.2
  let f = 0.72
  const on = smooth(t, 0.8, 1.4)
  f += 0.05 * Math.sin(pulse(t) * Math.PI) * on
  for (const [s, ranks] of WED.march) if (t >= s) f -= 0.05 * ranks.length * (1 - Math.exp(-(t - s) / 0.05)) * Math.exp(-(t - s) / 0.9)
  if (t >= WED.kiss) f -= 0.42 * (1 - Math.exp(-(t - WED.kiss) / 0.08)) * Math.exp(-(t - WED.kiss) / 2.2)
  return Math.max(0.12, Math.min(1, f))
}

/**
 * The bell's swing at `t` (radians from hanging, clockwise), and how hard its clapper has just struck (1 on a
 * strike, dying). At the wedding it is pulled off on the kiss and peals on every downbeat after; at the funeral it is
 * pulled once, tolls, answers softly on the swing back, and dies away.
 */
export function bellAt(t: number): { a: number; strike: number } {
  const swing = (ext: number[], from: number, amp: (t: number) => number, strikes: number[]) => {
    if (t < from) return { a: 0, strike: 0 }
    let phi: number
    if (t < ext[0]) phi = -Math.PI / 2 + (Math.PI / 2) * ((t - from) / (ext[0] - from))
    else {
      let i = 0
      while (i < ext.length - 1 && t >= ext[i + 1]) i++
      const next = i < ext.length - 1 ? ext[i + 1] : ext[i] + (ext[i] - ext[i - 1])
      phi = i * Math.PI + Math.PI * Math.min(1, (t - ext[i]) / (next - ext[i]))
    }
    let strike = 0
    for (let i = 0; i < strikes.length; i++) if (t >= ext[i]) strike = Math.max(strike, strikes[i] * knock(t - ext[i], 0.3))
    return { a: amp(t) * Math.cos(phi), strike }
  }
  if (!gloomy(t)) {
    const ext = WED.peal
    return swing(ext, WED.kiss, (s) => 0.52 * smooth(s, WED.kiss, ext[0]), [1, 1, 1, 1, 1])
  }
  const T = FUN.toll
  const half = FUN.answer - T
  const ext = [T, FUN.answer, FUN.answer + half * 1.02, FUN.answer + half * 2.05, FUN.answer + half * 3.1, FUN.answer + half * 4.2]
  return swing(ext, T - 0.72, (s) => (s < T ? 0.46 * smooth(s, T - 0.72, T) : 0.46 * Math.exp(-(s - T) / 1.15)), [1, 0.4])
}

/** How far open the doors are (0 shut, 1 wide): flung open as she reaches them, settling; open all through the funeral. */
export function doorsOpen(t: number): number {
  if (gloomy(t)) return 1
  if (t < WED.doors) return 0
  const s = t - WED.doors
  // Most of the way in a fifth of a second, a little past, and a long damped settle back.
  return Math.min(1.06, 1 - Math.exp(-s / 0.07) + 0.07 * Math.sin(Math.min(s, 2) * 5.2) * Math.exp(-s / 0.35))
}

/* ------------------------------------------------------------------ motion helpers (shared by both parts) */

/**
 * A monotone cubic through (t, x) anchors (Fritsch-Carlson): a walk paced by phrases, whose speed is continuous
 * and which never overshoots an anchor. `v0` and `v1` are the speeds at the two ends.
 */
export function pchip(ts: number[], xs: number[], v0 = 0, v1 = 0): (t: number) => number {
  const n = ts.length
  const h: number[] = []
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(ts[i + 1] - ts[i])
    d.push((xs[i + 1] - xs[i]) / (ts[i + 1] - ts[i]))
  }
  const m: number[] = new Array(n).fill(0)
  m[0] = v0
  m[n - 1] = v1
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const w1 = 2 * h[i] + h[i - 1]
    const w2 = h[i] + 2 * h[i - 1]
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t: number): number => {
    if (t <= ts[0]) return xs[0] + v0 * (t - ts[0])
    if (t >= ts[n - 1]) return xs[n - 1] + v1 * (t - ts[n - 1])
    let i = 0
    while (i < n - 2 && ts[i + 1] <= t) i++
    const H = h[i]
    const u = (t - ts[i]) / H
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * xs[i] + (u3 - 2 * u2 + u) * H * m[i] + (-2 * u3 + 3 * u2) * xs[i + 1] + (u3 - u2) * H * m[i + 1]
  }
}

/** A hop's lift at `t` (cells up, positive), for a hop taking off at `a` and landing at `b` under gravity `g`. */
export function lift(t: number, a: number, b: number, g = 12): number {
  if (t <= a || t >= b) return 0
  const T = b - a
  const u = (t - a) / T
  return ((g * T * T) / 8) * 4 * u * (1 - u)
}

/** 0 → 1, easing in and out with no speed at either end (a quintic: no lurch at the start or at the stop). */
export const ease = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * u * (u * (u * 6 - 15) + 10)
}

/* ------------------------------------------------------------------ the palette, in its two lights */

/** The church's colours at `t`: morning for the wedding, grey for the funeral. */
export function paint(t: number) {
  const g = gloomy(t) ? 1 : 0
  const grey = (hex: string, f: number) => mixHex(hex, HILL.skyGrey, f * g)
  return {
    g,
    sky: g ? mixHex(HILL.skyGrey, CLINIC.wall, 0.35) : HILL.sky,
    skyLow: g ? mixHex(HILL.skyGrey, CHURCH.plaster, 0.2) : mixHex(HILL.sky, CHURCH.candle, 0.5),
    grass: g ? mixHex(HILL.grass, HILL.skyGrey, 0.5) : HILL.grass,
    earth: mixHex('#A8927A', HILL.skyGrey, 0.35 * g),
    trees: g ? mixHex(HILL.leaf, HILL.skyGrey, 0.72) : mixHex(HILL.leaf, HILL.sky, 0.5),
    plaster: grey(CHURCH.plaster, 0.45),
    plasterShade: grey(mixHex(CHURCH.plaster, CHURCH.stone, 0.45), 0.45),
    ceiling: grey(mixHex(HOME.wood, CHURCH.plaster, 0.35), 0.4),
    ceilingDeep: grey(mixHex(HOME.woodDark, HOME.wood, 0.4), 0.35),
    outside: grey(CHURCH.cloth, 0.35),
    stone: grey(CHURCH.stone, 0.3),
    section: HOME.section,
    pew: grey(CHURCH.pew, 0.2),
    pewLight: grey(CHURCH.pewLight, 0.25),
    roof: grey(mixHex(CLINIC.steel, HOME.section, 0.35), 0.2),
    timber: grey(HOME.woodDark, 0.2),
    tin: grey(mixHex(CLINIC.blind, CHURCH.stone, 0.4), 0.3),
    tinDeep: grey(mixHex(CLINIC.steel, CHURCH.stone, 0.35), 0.3),
    bronze: grey(mixHex(HOME.brass, HOME.woodDark, 0.38), 0.25),
    cloth: grey(CHURCH.cloth, 0.2),
    gold: grey(CHURCH.glassGold, 0.35),
    // At the funeral the glass is dull, nearly grey; at its cut, dark, as night glass is, lightening with the morning.
    glass: [CHURCH.glassRed, CHURCH.glassBlue, CHURCH.glassGold, CHURCH.glassGreen].map((c) =>
      g ? mixHex(mixHex(c, HILL.skyGrey, 0.8), HOME.night, 0.6 * (1 - waking(t))) : c),
  }
}
export type Paint = ReturnType<typeof paint>

/* ------------------------------------------------------------------ drawing helpers */

/** A rectangle by its corners, in cells, whatever the rectMode (the stage's is CENTER). */
export function box2(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0): void {
  p.push()
  p.rectMode(p.CORNER)
  p.rect(Math.min(x0, x1) * k, Math.min(y0, y1) * k, Math.abs(x1 - x0) * k, Math.abs(y1 - y0) * k, r * k)
  p.pop()
}

/** A closed polygon through points in cells. */
export function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** An rgba() string for a hex colour and an alpha, for gradients painted straight onto the canvas. */
function rgba(p: p5, hex: string, a: number): string {
  const c = p.color(hex)
  return `rgba(${p.red(c)},${p.green(c)},${p.blue(c)},${Math.max(0, Math.min(1, a))})`
}

/** A vertical gradient over a rectangle. */
function vgrad(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, stops: [number, string, number][]): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [at, hex, a] of stops) g.addColorStop(at, rgba(p, hex, a))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** A soft beam of light: a quad from its source's two corners to the floor, fading along its length. */
export function beam(p: p5, k: number, top: [Pt, Pt], foot: [Pt, Pt], hex: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(((top[0][0] + top[1][0]) / 2) * k, ((top[0][1] + top[1][1]) / 2) * k, ((foot[0][0] + foot[1][0]) / 2) * k, ((foot[0][1] + foot[1][1]) / 2) * k)
  g.addColorStop(0, rgba(p, hex, a))
  g.addColorStop(0.7, rgba(p, hex, a * 0.55))
  g.addColorStop(1, rgba(p, hex, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(top[0][0] * k, top[0][1] * k)
  ctx.lineTo(top[1][0] * k, top[1][1] * k)
  ctx.lineTo(foot[1][0] * k, foot[1][1] * k)
  ctx.lineTo(foot[0][0] * k, foot[0][1] * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * A head in profile, facing left, centred on (0, 0) in the figure's scaled units, with its hat: brow, nose and chin
 * toward the altar, the skull's round at the back, and a hat or hair on every one of them, so no head reads as a ball.
 */
function head(p: p5, X: (v: number) => number, color: string, hat: Hat, trim?: string): void {
  p.fill(color)
  p.beginShape()
  p.vertex(X(0.04), X(0.12))
  p.bezierVertex(X(0.13), X(0.08), X(0.14), X(-0.08), X(0.08), X(-0.12))
  p.bezierVertex(X(0.03), X(-0.16), X(-0.08), X(-0.15), X(-0.1), X(-0.07))
  p.bezierVertex(X(-0.105), X(-0.045), X(-0.11), X(-0.03), X(-0.135), X(0.0))
  p.vertex(X(-0.11), X(0.03))
  p.bezierVertex(X(-0.11), X(0.07), X(-0.1), X(0.11), X(-0.05), X(0.12))
  p.endShape(p.CLOSE)
  p.fill(trim ?? color)
  const top = -0.13
  switch (hat) {
    case 'fedora':
      p.rect(X(-0.2), X(top + 0.005), X(0.36), X(0.035), X(0.015))
      p.beginShape()
      p.vertex(X(-0.11), X(top + 0.01))
      p.vertex(X(-0.1), X(top - 0.1))
      p.bezierVertex(X(-0.05), X(top - 0.14), X(-0.01), X(top - 0.07), X(0.02), X(top - 0.12))
      p.bezierVertex(X(0.06), X(top - 0.14), X(0.1), X(top - 0.12), X(0.11), X(top - 0.1))
      p.vertex(X(0.12), X(top + 0.01))
      p.endShape(p.CLOSE)
      break
    case 'bowler':
      p.rect(X(-0.16), X(top + 0.01), X(0.31), X(0.03), X(0.015))
      p.arc(X(-0.005), X(top + 0.025), X(0.23), X(0.26), Math.PI, 2 * Math.PI, p.CHORD)
      break
    case 'cap':
      p.arc(X(0.01), X(top + 0.05), X(0.26), X(0.16), Math.PI, 2 * Math.PI, p.CHORD)
      p.rect(X(-0.22), X(top + 0.03), X(0.14), X(0.03), X(0.015))
      break
    case 'cloche':
      p.beginShape()
      p.vertex(X(0.15), X(top + 0.13))
      p.bezierVertex(X(0.17), X(top - 0.1), X(-0.14), X(top - 0.12), X(-0.14), X(top + 0.06))
      p.vertex(X(-0.18), X(top + 0.09))
      p.endShape(p.CLOSE)
      break
    case 'flowers':
      p.rect(X(-0.12), X(top - 0.05), X(0.24), X(0.07), X(0.03))
      p.fill(mixHex(trim ?? color, CHURCH.cloth, 0.65))
      for (let i = 0; i < 3; i++) p.ellipse(X(0.07 - i * 0.055), X(top - 0.065 - (i === 1 ? 0.02 : 0)), X(0.06), X(0.045))
      break
    case 'feather':
      p.rect(X(-0.12), X(top - 0.035), X(0.24), X(0.06), X(0.025))
      p.beginShape()
      p.vertex(X(-0.01), X(top - 0.03))
      p.bezierVertex(X(0.02), X(top - 0.19), X(0.1), X(top - 0.27), X(0.22), X(top - 0.3))
      p.bezierVertex(X(0.14), X(top - 0.22), X(0.09), X(top - 0.13), X(0.08), X(top - 0.03))
      p.endShape(p.CLOSE)
      break
    case 'bun':
      p.beginShape()
      p.vertex(X(-0.08), X(top + 0.02))
      p.bezierVertex(X(-0.05), X(top - 0.09), X(0.12), X(top - 0.12), X(0.17), X(top - 0.01))
      p.bezierVertex(X(0.2), X(top + 0.05), X(0.17), X(top + 0.13), X(0.11), X(top + 0.14))
      p.endShape(p.CLOSE)
      break
    case 'bald':
      break
  }
}

export type Hat = 'fedora' | 'bowler' | 'cloche' | 'flowers' | 'feather' | 'bun' | 'bald' | 'cap'

export interface Sit {
  /** How far the hips are off the seat (cells): a bounce. */
  lift?: number
  /** 0: the hand in the lap; 1: the arm straight up. */
  arm?: number
  /** Tipped back (positive) or forward from the hips, radians. */
  lean?: number
  trim?: string
}

/**
 * Someone sitting in a pew, as the congregation are drawn: one flat, unoutlined silhouette in profile, facing left to
 * the altar: the shin down to the floor, the thigh along the seat, the back, the head with its hat, and an arm that
 * lies in the lap or goes up. `x` is the hip on the seat at height `seat`; `s` the scale (1 a grown man).
 */
export function sitter(p: p5, k: number, x: number, seat: number, s: number, color: string, hat: Hat, o: Sit = {}): void {
  const lift = o.lift ?? 0
  const arm = Math.max(0, Math.min(1, o.arm ?? 0))
  const X = (v: number) => v * s * k
  const hip = seat - lift
  const floor = (CH.floor - hip) / s
  p.push()
  p.translate(x * k, hip * k)
  p.noStroke()
  // Legs a shade darker than the rest (trousers, stockings), so they read as legs and sit back.
  p.fill(mixHex(color, INK, 0.22))
  // The shin and the foot, from the knee down to the floor.
  p.beginShape()
  p.vertex(X(-0.44), X(-0.07))
  p.vertex(X(-0.28), X(-0.07))
  p.vertex(X(-0.26), X(floor - 0.07))
  p.vertex(X(-0.22), X(floor - 0.035))
  p.vertex(X(-0.22), X(floor))
  p.vertex(X(-0.5), X(floor))
  p.vertex(X(-0.48), X(floor - 0.06))
  p.vertex(X(-0.4), X(floor - 0.08))
  p.endShape(p.CLOSE)
  // The body in one piece: the lap along the seat out to the knee, up the front to the shoulder, over it and down the
  // back to the seat (tipped back a little by `lean` about the hips).
  p.fill(color)
  p.push()
  p.rotate(o.lean ?? 0)
  p.beginShape()
  p.vertex(X(0.11), X(0))
  p.vertex(X(-0.44), X(0))
  p.bezierVertex(X(-0.5), X(0), X(-0.5), X(-0.15), X(-0.44), X(-0.15))
  p.vertex(X(-0.16), X(-0.15))
  p.bezierVertex(X(-0.13), X(-0.22), X(-0.12), X(-0.34), X(-0.1), X(-0.4))
  p.bezierVertex(X(-0.08), X(-0.47), X(0.07), X(-0.48), X(0.1), X(-0.42))
  p.bezierVertex(X(0.14), X(-0.3), X(0.14), X(-0.12), X(0.11), X(0))
  p.endShape(p.CLOSE)
  p.pop()
  p.rotate(o.lean ?? 0)
  // The neck, the head.
  p.rect(X(-0.045), X(-0.53), X(0.085), X(0.1))
  p.push()
  p.translate(X(-0.01), X(-0.61))
  head(p, X, color, hat, o.trim)
  p.pop()
  // The arm, from the shoulder to the lap, or up over the head.
  const mix = (a: Pt, b: Pt): Pt => [a[0] + (b[0] - a[0]) * arm, a[1] + (b[1] - a[1]) * arm]
  const elbow = mix([0.05, -0.2], [-0.1, -0.62])
  const hand = mix([-0.08, -0.2], [-0.12, -0.88])
  p.noFill()
  p.stroke(color)
  p.strokeWeight(X(0.1))
  p.strokeCap(p.ROUND)
  p.strokeJoin(p.ROUND)
  p.beginShape()
  p.vertex(X(0.01), X(-0.39))
  p.vertex(X(elbow[0]), X(elbow[1]))
  p.vertex(X(hand[0]), X(hand[1]))
  p.endShape()
  p.pop()
}

/** Where a sitter's raised hand is, in cells: where the petals leave from. */
export const handOf = (x: number, seat: number, s: number, lift: number): Pt => [x - 0.12 * s, seat - lift - 0.88 * s]

/**
 * A pew in profile: a solid oak bench, not a chair. Its end board runs from the floor up under the seat and rises
 * behind it into the back (the side away from the altar), scrolled at the top; a carved panel on its face, and a
 * shadow under the seat's nose. `x` is the seat's centre.
 */
function pewAt(p: p5, k: number, c: Paint, weight: number, x: number): void {
  const { floor, seat, pewBack } = CH
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.8)
  p.fill(c.pew)
  p.beginShape()
  p.vertex((x - 0.27) * k, floor * k)
  p.vertex((x - 0.27) * k, (seat + 0.1) * k)
  p.bezierVertex((x - 0.32) * k, (seat + 0.08) * k, (x - 0.33) * k, seat * k, (x - 0.28) * k, seat * k)
  p.vertex((x + 0.19) * k, seat * k)
  p.vertex((x + 0.24) * k, (pewBack + 0.1) * k)
  p.bezierVertex((x + 0.24) * k, (pewBack - 0.03) * k, (x + 0.4) * k, (pewBack - 0.05) * k, (x + 0.41) * k, (pewBack + 0.05) * k)
  p.bezierVertex((x + 0.41) * k, (pewBack + 0.1) * k, (x + 0.37) * k, (pewBack + 0.12) * k, (x + 0.35) * k, (pewBack + 0.12) * k)
  p.vertex((x + 0.35) * k, floor * k)
  p.vertex((x + 0.25) * k, floor * k)
  p.bezierVertex((x + 0.25) * k, (floor - 0.12) * k, (x - 0.17) * k, (floor - 0.12) * k, (x - 0.17) * k, floor * k)
  p.endShape(p.CLOSE)
  // The carved panel on the end board's face, and the back's panel.
  p.noStroke()
  p.fill(c.pewLight)
  box2(p, k, x - 0.2, seat + 0.1, x + 0.26, floor - 0.2, 0.03)
  box2(p, k, x + 0.265, pewBack + 0.18, x + 0.315, seat - 0.06, 0.02)
  p.fill(alpha(p, INK, 0.28))
  box2(p, k, x - 0.27, seat + 0.07, x + 0.19, seat + 0.1)
}

/* ------------------------------------------------------------------ the organ */

/** The organ's façade: eleven tin pipes in a mitre, tallest in the middle, in five ranks; a darker row behind. */
const PIPES = (() => {
  const out: { x: number; h: number; w: number; rank: number; back: boolean }[] = []
  const heights = [1.02, 1.16, 1.32, 1.5, 1.7, 1.9, 1.7, 1.5, 1.32, 1.16, 1.02].map((h) => h * 0.78)
  const ranks = [0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4]
  const x0 = -3.24
  const step = 0.139
  for (let i = 0; i < 10; i++) out.push({ x: x0 + step * (i + 0.5), h: Math.min(heights[i], heights[i + 1]) * 0.9 + 0.2, w: 0.1, rank: ranks[i], back: true })
  for (let i = 0; i < 11; i++) out.push({ x: x0 + step * i, h: heights[i], w: 0.112, rank: ranks[i], back: false })
  return out
})()

function drawOrgan(p: p5, k: number, c: Paint, weight: number, t: number): void {
  const [ox0, ox1] = CH.organ
  const imp = CH.impost
  const lit = (r: number) => (c.g ? 0 : rankLight(r, t))
  // The pipes, back row first: body, gleam, mouth, conical foot; lit gold as their rank speaks.
  for (const pipe of PIPES) {
    const L = lit(pipe.rank)
    const top = imp - pipe.h
    const mouth = imp - 0.2 - pipe.h * 0.04
    p.stroke(alpha(p, INK, pipe.back ? 0.6 : 0.85))
    p.strokeWeight(weight * (pipe.back ? 0.5 : 0.65))
    p.fill(mixHex(pipe.back ? c.tinDeep : c.tin, CHURCH.candle, Math.min(1, L * 0.95)))
    box2(p, k, pipe.x - pipe.w / 2, top, pipe.x + pipe.w / 2, mouth, 0.012)
    poly(p, k, [
      [pipe.x - pipe.w / 2, mouth],
      [pipe.x + pipe.w / 2, mouth],
      [pipe.x + 0.016, imp],
      [pipe.x - 0.016, imp],
    ])
    if (pipe.back) continue
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', 0.28 + 0.3 * L))
    box2(p, k, pipe.x - pipe.w * 0.28, top + 0.05, pipe.x - pipe.w * 0.1, mouth - 0.04)
    // The mouth: a dark slot under an arched lip.
    p.fill(alpha(p, INK, 0.85))
    p.arc(pipe.x * k, (mouth - 0.005) * k, pipe.w * 0.62 * k, 0.1 * k, Math.PI, 2 * Math.PI, p.CHORD)
    if (L > 0.02) {
      p.fill(alpha(p, CHURCH.flame, 0.35 * L))
      box2(p, k, pipe.x - pipe.w / 2, top, pipe.x + pipe.w / 2, mouth)
    }
  }
  // Breath: from each mouth of a rank as it speaks, a wisp of air curling up, gone in under a second.
  if (!c.g) {
    p.noStroke()
    const notes: [number, number[]][] = [...WED.march, [WED.kiss, [0, 1, 2, 3, 4]]]
    for (const [s, ranks] of notes) {
      const age = t - s
      if (age < 0 || age > 0.9) continue
      const big = s === WED.kiss ? 1.5 : 1
      for (const pipe of PIPES) {
        if (pipe.back || !ranks.includes(pipe.rank)) continue
        const mouth = imp - 0.2 - pipe.h * 0.04
        const u = age / 0.9
        const a = 0.4 * (1 - u) * Math.min(1, age / 0.06)
        const rise = 0.34 * big * (1 - Math.pow(1 - u, 2))
        const curl = 0.05 * Math.sin(u * 4 + pipe.x * 9) * big
        p.fill(alpha(p, '#FFFFFF', a))
        p.ellipse((pipe.x + curl) * k, (mouth - 0.06 - rise) * k, (0.05 + 0.07 * u) * big * k, (0.1 + 0.16 * u) * big * k)
        p.fill(alpha(p, '#FFFFFF', a * 0.6))
        p.ellipse((pipe.x - curl * 1.5) * k, (mouth - 0.12 - rise * 1.3) * k, (0.04 + 0.06 * u) * big * k, (0.08 + 0.12 * u) * big * k)
      }
    }
  }
  // The case: two carved posts either side of the pipes, a crest on each, the impost's moulding.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(c.pew)
  for (const px of [ox0, ox1 - 0.14]) {
    box2(p, k, px, imp - 1.3, px + 0.14, imp)
    poly(p, k, [
      [px - 0.03, imp - 1.3],
      [px + 0.07, imp - 1.5],
      [px + 0.17, imp - 1.3],
    ])
  }
  box2(p, k, ox0 - 0.05, imp - 0.06, ox1 + 0.05, imp + 0.04, 0.02)
  // The cabinet under them, cut open on the wind's machinery.
  box2(p, k, ox0, imp + 0.04, ox1, CH.floor)
  p.noStroke()
  p.fill(mixHex(c.pew, INK, 0.55))
  box2(p, k, ox0 + 0.08, imp + 0.12, ox1 - 0.08, CH.floor - 0.03)
  // The reservoir: a hinged top board on pleated sides, two brass weights on it. Every note draws it down; the great
  // chord all but empties it. The feeder beside it, pumped by a crank on a wheel, fills it again on the beat.
  const fill = bellowsFill(t)
  const base = CH.floor - 0.08
  const rx0 = ox0 + 0.16
  const rx1 = ox0 + 0.86
  const top = base - 0.14 - 0.44 * fill
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.6)
  p.fill(c.pewLight)
  box2(p, k, rx0 - 0.03, base, rx1 + 0.03, base + 0.04)
  p.fill(mixHex(CHURCH.flowers, c.pew, 0.55))
  const folds = 3
  const pts: Pt[] = [[rx0, base]]
  for (let i = 1; i <= folds * 2 - 1; i++) pts.push([rx0 + (i % 2 ? 0.07 : 0), base + ((top - base) * i) / (folds * 2)])
  pts.push([rx0, top], [rx1, top])
  for (let i = folds * 2 - 1; i >= 1; i--) pts.push([rx1 - (i % 2 ? 0.07 : 0), base + ((top - base) * i) / (folds * 2)])
  pts.push([rx1, base])
  poly(p, k, pts)
  p.fill(c.pewLight)
  box2(p, k, rx0 - 0.04, top - 0.05, rx1 + 0.04, top)
  p.fill(c.gold)
  box2(p, k, rx0 + 0.1, top - 0.13, rx0 + 0.26, top - 0.05, 0.01)
  box2(p, k, rx1 - 0.26, top - 0.13, rx1 - 0.1, top - 0.05, 0.01)
  // The wind trunk up from the reservoir to the pipes' chest.
  p.fill(mixHex(c.pew, INK, 0.3))
  box2(p, k, (rx0 + rx1) / 2 - 0.05, imp + 0.12, (rx0 + rx1) / 2 + 0.05, top - 0.13)
  // The feeder: a smaller wedge hinged at its left, its lip lifted and dropped by the crank's rod.
  const on = c.g ? 0 : smooth(t, 0.8, 1.4) * (1 - smooth(t, 21.8, 23))
  const turn = pulse(t) * Math.PI * on
  const wx = ox1 - 0.3
  const wy = CH.floor - 0.36
  const wr = 0.15
  const crank: Pt = [wx + Math.cos(turn) * wr * 0.7, wy + Math.sin(turn) * wr * 0.7]
  const fx0 = rx1 + 0.1
  const fx1 = wx - 0.2
  const lip = 0.06 + 0.07 * (1 - Math.cos(turn))
  p.fill(mixHex(CHURCH.flowers, c.pew, 0.55))
  poly(p, k, [
    [fx0, base],
    [fx0, base - 0.03],
    [fx1, base - lip],
    [fx1, base],
  ])
  p.stroke(alpha(p, INK, 0.85))
  p.line(fx0 * k, (base - 0.03) * k, fx1 * k, (base - lip) * k)
  // The wheel and its crank, and the rod from the crank down to the feeder's lip.
  p.fill(c.timber)
  p.circle(wx * k, wy * k, 2 * wr * k)
  p.stroke(alpha(p, c.pewLight, 0.9))
  for (let i = 0; i < 3; i++) {
    const a = turn + (i * Math.PI * 2) / 3
    p.line(wx * k, wy * k, (wx + Math.cos(a) * wr * 0.85) * k, (wy + Math.sin(a) * wr * 0.85) * k)
  }
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.7)
  p.line(crank[0] * k, crank[1] * k, fx1 * k, (base - lip) * k)
  p.noStroke()
  p.fill(c.gold)
  p.circle(crank[0] * k, crank[1] * k, 0.045 * k)
}

/* ------------------------------------------------------------------ the altar, the photograph */

function drawAltar(p: p5, k: number, c: Paint, weight: number, t: number): void {
  const [ax0, ax1, top] = CH.altar
  const floor = CH.floor
  // The table, and its white cloth falling over the front with a gold band at its hem.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(c.pew)
  box2(p, k, ax0 + 0.04, top, ax1 - 0.04, floor)
  p.fill(c.cloth)
  poly(p, k, [
    [ax0 - 0.05, top],
    [ax1 + 0.05, top],
    [ax1 + 0.05, top + 0.1],
    [ax1 - 0.05, floor - 0.08],
    [ax0 + 0.05, floor - 0.08],
    [ax0 - 0.05, top + 0.1],
  ])
  p.noStroke()
  p.fill(c.gold)
  box2(p, k, ax0 + 0.02, floor - 0.2, ax1 - 0.02, floor - 0.14)
  // Two candlesticks and their candles, lit (at the funeral they have burned low).
  for (const cx of [ax0 + 0.14, ax1 - 0.14]) {
    p.stroke(alpha(p, INK, 0.9))
    p.strokeWeight(weight * 0.6)
    p.fill(c.gold)
    poly(p, k, [
      [cx - 0.07, top],
      [cx + 0.07, top],
      [cx + 0.025, top - 0.05],
      [cx + 0.02, top - 0.2],
      [cx + 0.05, top - 0.23],
      [cx - 0.05, top - 0.23],
      [cx - 0.02, top - 0.2],
      [cx - 0.025, top - 0.05],
    ])
    const tall = c.g ? 0.12 : 0.3
    p.fill(CHURCH.candle)
    box2(p, k, cx - 0.025, top - 0.23 - tall, cx + 0.025, top - 0.23)
    const fl = top - 0.23 - tall
    const sway = 0.012 * Math.sin(t * 7.1 + cx * 5) + 0.008 * Math.sin(t * 13.3)
    p.noStroke()
    p.fill(alpha(p, CHURCH.flame, 0.95))
    p.beginShape()
    p.vertex(cx * k, (fl - 0.005) * k)
    p.bezierVertex((cx - 0.035) * k, (fl - 0.03) * k, (cx - 0.02) * k, (fl - 0.08) * k, (cx + sway) * k, (fl - 0.12) * k)
    p.bezierVertex((cx + 0.02) * k, (fl - 0.08) * k, (cx + 0.035) * k, (fl - 0.03) * k, cx * k, (fl - 0.005) * k)
    p.endShape(p.CLOSE)
  }
  // Flowers in a vase at its middle: the wedding's pink and white; the funeral's white lilies.
  const vx = (ax0 + ax1) / 2
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.6)
  p.fill(c.gold)
  poly(p, k, [
    [vx - 0.07, top],
    [vx + 0.07, top],
    [vx + 0.09, top - 0.14],
    [vx + 0.05, top - 0.2],
    [vx - 0.05, top - 0.2],
    [vx - 0.09, top - 0.14],
  ])
  p.stroke(alpha(p, mixHex(HOME.leaf, INK, 0.2), 0.95))
  p.strokeWeight(weight * 0.55)
  const stems = [-0.16, -0.08, 0, 0.08, 0.16]
  for (const s of stems) p.line(vx * k, (top - 0.18) * k, (vx + s) * k, (top - 0.42 + Math.abs(s) * 0.6) * k)
  p.noStroke()
  stems.forEach((s, i) => {
    const hx = vx + s
    const hy = top - 0.44 + Math.abs(s) * 0.6
    if (c.g) {
      // A lily: three pointed white petals opening up and out.
      p.fill(CHURCH.cloth)
      for (const a of [-0.9, 0, 0.9]) {
        p.push()
        p.translate(hx * k, hy * k)
        p.rotate(a)
        p.triangle(-0.028 * k, 0, 0.028 * k, 0, 0, -0.11 * k)
        p.pop()
      }
    } else {
      p.fill(i % 2 ? CHURCH.flowers : CHURCH.cloth)
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2
        p.ellipse((hx + Math.cos(a) * 0.028) * k, (hy + Math.sin(a) * 0.028) * k, 0.045 * k, 0.035 * k)
      }
    }
  })
}

/**
 * The wedding photograph on an easel where they stood, at the funeral (the flash at the start of the show took it):
 * in sepia, a square and a round one, touching. A black ribbon across its corner.
 */
function drawPhotograph(p: p5, k: number, c: Paint, weight: number): void {
  const x = (ALTAR_CARL + ALTAR_ELLIE) / 2
  const foot = CH.floor
  const top = -1.25
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.line((x - 0.22) * k, foot * k, (x - 0.02) * k, (top - 0.06) * k)
  p.line((x + 0.22) * k, foot * k, (x + 0.02) * k, (top - 0.06) * k)
  p.line((x + 0.05) * k, foot * k, (x + 0.01) * k, (top + 0.1) * k)
  p.fill(c.timber)
  box2(p, k, x - 0.28, top + 0.48, x + 0.28, top + 0.52)
  p.strokeWeight(weight * 0.8)
  p.fill(c.gold)
  box2(p, k, x - 0.26, top, x + 0.26, top + 0.48, 0.01)
  p.noStroke()
  p.fill(mixHex(HOME.paper, HOME.wood, 0.35))
  box2(p, k, x - 0.21, top + 0.05, x + 0.21, top + 0.43)
  p.fill(alpha(p, mixHex(HOME.wood, INK, 0.2), 0.45))
  box2(p, k, x - 0.21, top + 0.34, x + 0.21, top + 0.43)
  p.fill(mixHex(HOME.wood, INK, 0.4))
  p.push()
  p.translate((x - 0.05) * k, (top + 0.29) * k)
  p.rotate(0.14)
  box2(p, k, -0.045, -0.045, 0.045, 0.045, 0.01)
  p.pop()
  p.circle((x + 0.042) * k, (top + 0.29) * k, 0.09 * k)
  p.fill(alpha(p, INK, 0.92))
  poly(p, k, [
    [x + 0.1, top],
    [x + 0.19, top],
    [x + 0.26, top + 0.07],
    [x + 0.26, top + 0.16],
  ])
}

/* ------------------------------------------------------------------ the windows and their light */

/** The far wall's windows: [x0, x1, top of the arch, sill]. The east window over the altar; two lancets by the pews. */
const WINDOWS: [number, number, number, number][] = [
  [-1.33, -0.67, -2.3, -1.05],
  [0.98, 1.4, -2.25, -1.3],
  [2.74, 3.16, -2.25, -1.3],
]

function drawWindows(p: p5, k: number, c: Paint, weight: number): void {
  WINDOWS.forEach(([x0, x1, y0, y1], wi) => {
    const w = x1 - x0
    const spring = y0 + w * 0.6
    const arch = (inset: number) => {
      const m = (x0 + x1) / 2
      p.beginShape()
      p.vertex((x0 + inset) * k, (y1 - inset) * k)
      p.vertex((x0 + inset) * k, spring * k)
      p.bezierVertex((x0 + inset) * k, (spring - w * 0.35) * k, (m - 0.02) * k, (y0 + inset + 0.02) * k, m * k, (y0 + inset) * k)
      p.bezierVertex((m + 0.02) * k, (y0 + inset + 0.02) * k, (x1 - inset) * k, (spring - w * 0.35) * k, (x1 - inset) * k, spring * k)
      p.vertex((x1 - inset) * k, (y1 - inset) * k)
      p.endShape(p.CLOSE)
    }
    // The stone surround, then the glass in its lead: lights of colour in rows, a diamond in the head.
    p.stroke(alpha(p, INK, 0.85))
    p.strokeWeight(weight * 0.7)
    p.fill(c.stone)
    arch(-0.07)
    p.noStroke()
    p.fill(c.glass[1])
    arch(0.02)
    const lights = wi === 0 ? 3 : 2
    for (let i = 0; i < lights; i++) {
      const lx0 = x0 + 0.02 + ((w - 0.04) * i) / lights
      const lx1 = x0 + 0.02 + ((w - 0.04) * (i + 1)) / lights
      for (let j = 0; j < 4; j++) {
        const ly0 = spring + ((y1 - spring) * j) / 4
        const ly1 = spring + ((y1 - spring) * (j + 1)) / 4
        p.fill(c.glass[(i + j + wi) % 4])
        box2(p, k, lx0, ly0, lx1, ly1)
      }
    }
    p.fill(c.glass[2])
    const mx = (x0 + x1) / 2
    const my = (y0 + spring) / 2 + 0.06
    poly(p, k, [
      [mx, my - 0.11],
      [mx + 0.08, my],
      [mx, my + 0.11],
      [mx - 0.08, my],
    ])
    // The morning through it (none at the funeral).
    if (!c.g) {
      p.fill(alpha(p, '#FFFFFF', 0.2))
      arch(0.02)
    }
    // The lead, then the edge.
    p.stroke(alpha(p, INK, 0.7))
    p.strokeWeight(weight * 0.45)
    for (let i = 1; i < lights; i++) {
      const lx = x0 + 0.02 + ((w - 0.04) * i) / lights
      p.line(lx * k, (spring - 0.04) * k, lx * k, (y1 - 0.02) * k)
    }
    for (let j = 1; j < 4; j++) {
      const ly = spring + ((y1 - spring) * j) / 4
      p.line((x0 + 0.02) * k, ly * k, (x1 - 0.02) * k, ly * k)
    }
    p.noFill()
    p.stroke(alpha(p, INK, 0.85))
    p.strokeWeight(weight * 0.7)
    arch(0.02)
    p.fill(c.stone)
    box2(p, k, x0 - 0.1, y1, x1 + 0.1, y1 + 0.07, 0.01)
  })
}

/** The light the windows throw: coloured beams in the morning; one pale beam at the funeral with dust turning in it. */
function drawLight(p: p5, k: number, c: Paint, t: number): void {
  const floor = CH.floor
  if (!c.g) {
    // The sun is up on the left: each window throws its colours down and to the right, across the aisle.
    WINDOWS.forEach(([x0, x1, , y1], wi) => {
      const src = y1 - 0.75
      const run = floor - src
      for (let i = 0; i < 2; i++) {
        const a0 = x0 + ((x1 - x0) * i) / 2
        const a1 = x0 + ((x1 - x0) * (i + 1)) / 2
        beam(p, k, [[a0, src], [a1, src]], [[a0 + run * 0.5, floor], [a1 + run * 0.58, floor]], c.glass[(wi + i * 2) % 4], 0.13)
      }
    })
    // On the kiss the east window flares, and its light falls full on the two of them, fading over the swell.
    if (t >= WED.kiss - 0.05) {
      const [x0, x1, , y1] = WINDOWS[0]
      const f = smooth(t, WED.kiss - 0.05, WED.kiss + 0.08) * (0.3 + 0.2 * Math.exp(-(t - WED.kiss) / 0.5)) * (1 - smooth(t, WED.kiss + 0.6, WED.kiss + 3.2))
      beam(p, k, [[x0 + 0.04, y1 + 0.07], [x1 - 0.02, y1 + 0.07]], [[ALTAR_CARL - 0.3, floor], [ALTAR_ELLIE + 0.4, floor]], CHURCH.candle, f)
    }
    // The doors' light, once they are open: the morning pouring in along the floor.
    const o = Math.min(1, doorsOpen(t))
    if (o > 0.01) {
      const dx = CH.tower[1] - CH.wall
      beam(p, k, [[dx, CH.doorTop + 0.1], [dx, floor]], [[dx - 2.4 * o, floor - 0.25], [dx - 3.4 * o, floor]], CHURCH.candle, 0.6 * o)
    }
    return
  }
  // The funeral: one grey beam from the first lancet, and a slow drift of dust in it.
  const [x0, x1, , y1] = WINDOWS[1]
  const src = y1 - 0.75
  const run = floor - src
  const up = beamUp(t)
  if (up <= 0.001) return
  beam(p, k, [[x0, src], [x1, src]], [[x0 + run * 0.5, floor], [x1 + run * 0.58, floor]], '#FFFFFF', 0.2 * up)
  p.noStroke()
  for (let i = 0; i < 28; i++) {
    const u = (hash(i, 3) + t * (0.018 + 0.012 * hash(i, 5))) % 1
    const along = 1 - u
    const sx = x0 + (x1 - x0) * hash(i, 7) + run * 0.54 * along + 0.05 * Math.sin(t * 0.7 + i)
    const sy = src + run * along
    const a = 0.6 * up * Math.sin(Math.PI * u) * (0.45 + 0.55 * hash(i, 9))
    p.fill(alpha(p, '#FFFFFF', a))
    p.circle(sx * k, sy * k, (0.012 + 0.012 * hash(i, 11)) * k)
  }
}

/* ------------------------------------------------------------------ the families, in the pews */

/**
 * Who sits where at the wedding. The front pew is Carl's family: his parents, grey, bolt upright, still (his mother
 * leans back a little at the kiss). The two behind are Ellie's: bright, many, bobbing on every beat of the march; on the
 * kiss they are up out of their seats with their arms in the air, and the ones who throw, throw petals.
 */
interface Folk {
  pew: number
  dx: number
  s: number
  color: string
  hat: Hat
  trim?: string
  hers: boolean
  every: number
  off: number
  amp: number
  throws: boolean
}
const soft = (hex: string, f = 0.2) => mixHex(hex, CHURCH.plaster, f)
const HER = CHURCH.herSide
const HIS = CHURCH.hisSide
export const FOLK: Folk[] = [
  { pew: 0, dx: 0.08, s: 0.78, color: HIS[2], hat: 'bowler', hers: false, every: 1, off: 0, amp: 0, throws: false },
  { pew: 0, dx: -0.06, s: 0.72, color: HIS[1], hat: 'cloche', trim: HIS[0], hers: false, every: 1, off: 0, amp: 0, throws: false },
  { pew: 1, dx: 0.1, s: 0.82, color: soft(HER[4], 0.25), hat: 'fedora', trim: mixHex(HER[4], INK, 0.3), hers: true, every: 2, off: 0, amp: 0.05, throws: true },
  { pew: 1, dx: -0.03, s: 0.76, color: soft(HER[1]), hat: 'flowers', trim: soft(HER[3], 0.1), hers: true, every: 1, off: 0, amp: 0.045, throws: true },
  { pew: 1, dx: -0.16, s: 0.58, color: soft(HER[2], 0.1), hat: 'cap', trim: mixHex(HER[2], INK, 0.3), hers: true, every: 1, off: 0.5, amp: 0.07, throws: false },
  { pew: 2, dx: 0.1, s: 0.78, color: soft(HER[3], 0.1), hat: 'feather', trim: soft(HER[0], 0.15), hers: true, every: 1, off: 0, amp: 0.045, throws: true },
  { pew: 2, dx: -0.1, s: 0.72, color: soft(HER[1], 0.35), hat: 'bun', trim: mixHex(HER[1], HOME.woodDark, 0.5), hers: true, every: 1, off: 0, amp: 0.05, throws: true },
]

/** How far a sitter's hips are off the seat at `t`: still for the photograph, on the beat through the march, up on the kiss. */
export function folkLift(f: Folk, t: number): number {
  if (!f.hers) return 0
  const march = smooth(t, 1.1, 1.5)
  const up = smooth(t, WED.kiss - 0.02, WED.kiss + 0.16)
  return f.amp * bounce(t, f.every, f.off) * march * (1 + 0.8 * up) + 0.07 * up
}

/** How high a sitter's arm is: in the lap, and up from the kiss (waving on the beat), for her family. */
export function folkArm(f: Folk, t: number): number {
  if (!f.hers) return 0
  const up = smooth(t, WED.kiss, WED.kiss + 0.22)
  return up * (0.82 + 0.18 * bounce(t, 1, f.off))
}

function drawFolk(p: p5, k: number, t: number): void {
  if (gloomy(t)) return
  const lean = 0.1 * smooth(t, WED.kiss + 0.1, WED.kiss + 0.9)
  for (const f of FOLK) {
    const x = CH.pews[f.pew] + f.dx
    sitter(p, k, x, CH.seat, f.s, f.color, f.hat, {
      lift: folkLift(f, t),
      arm: folkArm(f, t),
      lean: f.hat === 'cloche' ? lean : 0,
      trim: f.trim,
    })
  }
}

/* ------------------------------------------------------------------ the petals */

interface Petal {
  x0: number
  y0: number
  vx: number
  vy: number
  at: number
  color: string
  spin: number
  sway: number
  front: boolean
}

/** When her family throw: as she spins away from the kiss, and on the peal's first two strokes. */
export const THROWS = [beat('waltz', 1, 2), bar('waltz', 2), bar('waltz', 3)]

const PETALS: Petal[] = (() => {
  const out: Petal[] = []
  const colours = [CHURCH.flowers, CHURCH.cloth, mixHex(CHURCH.flowers, CHURCH.cloth, 0.5), CHURCH.candle]
  FOLK.forEach((f, j) => {
    if (!f.throws) return
    const x = CH.pews[f.pew] + f.dx
    THROWS.forEach((at, w) => {
      const [hx, hy] = handOf(x, CH.seat, f.s, folkLift(f, at))
      for (let i = 0; i < 9; i++) {
        const h = (s: number) => hash(i + 31 * j, w, s)
        out.push({
          x0: hx - 0.04 + 0.08 * h(1),
          y0: hy,
          // Thrown up and out toward the aisle (left, over the two of them), and some back.
          vx: -0.9 + (h(2) - 0.35) * 1.8,
          vy: -(2.2 + h(3) * 1.4),
          at: at + h(4) * 0.1,
          color: colours[Math.floor(h(5) * colours.length)],
          spin: (h(6) - 0.5) * 9,
          sway: 0.6 + h(7) * 1.2,
          front: h(8) < 0.5,
        })
      }
    })
  })
  return out
})()

/** A petal thrown up, slowed by the air to a flutter at half a cell a second, swaying as it comes down. */
function petalAt(q: Petal, t: number): { x: number; y: number; a: number } | null {
  const age = t - q.at
  if (age < 0 || age > 6) return null
  const drag = 2.3
  const vt = 0.5
  const e = 1 - Math.exp(-drag * age)
  const y = q.y0 + vt * age + ((q.vy - vt) * e) / drag
  if (y > CH.floor) return null
  const x = q.x0 + (q.vx * e) / drag + 0.08 * Math.sin(age * q.sway * 3 + q.spin) * Math.min(1, age)
  return { x, y, a: q.spin * age }
}

/** The petals in the air: those behind the two of them (the set draws them), or those in front (the wedding's front). */
export function drawPetals(p: p5, k: number, t: number, front: boolean): void {
  if (gloomy(t) || t < THROWS[0]) return
  p.noStroke()
  for (const q of PETALS) {
    if (q.front !== front) continue
    const at = petalAt(q, t)
    if (!at) continue
    p.push()
    p.translate(at.x * k, at.y * k)
    p.rotate(at.a)
    p.fill(q.color)
    p.ellipse(0, 0, 0.07 * k, 0.034 * k * (0.45 + 0.55 * Math.abs(Math.cos(at.a * 0.7))))
    p.pop()
  }
}

/* ------------------------------------------------------------------ the tower and its bell */

/** The bell in its frame: swung on its headstock, a wheel beside it for the rope, the clapper striking its lip. */
function drawBell(p: p5, k: number, c: Paint, weight: number, t: number): void {
  const { a, strike } = bellAt(t)
  const [bx, by] = CH.bell
  p.push()
  p.translate(bx * k, by * k)
  // The frame it hangs in: two posts to the belfry floor.
  p.stroke(INK)
  p.strokeWeight(weight * 0.75)
  p.fill(c.timber)
  box2(p, k, -0.44, -0.02, -0.38, CH.belfry[1] - by)
  box2(p, k, 0.38, -0.02, 0.44, CH.belfry[1] - by)
  // The wheel, turning with it.
  p.push()
  p.rotate(a)
  p.noFill()
  p.stroke(alpha(p, mixHex(c.timber, INK, 0.2), 0.95))
  p.strokeWeight(weight * 0.7)
  p.circle(0, 0, 0.58 * k)
  for (let i = 0; i < 4; i++) {
    const s = (i / 4) * Math.PI * 2 + 0.4
    p.line(0, 0, Math.cos(s) * 0.29 * k, Math.sin(s) * 0.29 * k)
  }
  p.pop()
  // The rope off the wheel's rim, down through the belfry floor.
  p.stroke(alpha(p, CHURCH.stone, 0.95))
  p.strokeWeight(Math.max(1, 0.03 * k))
  const rim = 0.29
  p.line(Math.cos(a) * rim * k, Math.sin(a) * rim * k, 0.29 * k, (CH.belfry[1] - by) * k)
  p.rotate(a)
  // The headstock.
  p.stroke(INK)
  p.strokeWeight(weight * 0.75)
  p.fill(c.timber)
  box2(p, k, -0.4, -0.05, 0.4, 0.05, 0.01)
  // The clapper: it lags the bell, and at each end of the swing it meets the lip.
  p.push()
  p.rotate(-a * 0.62)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.8)
  p.line(0, 0.1 * k, 0, 0.52 * k)
  p.noStroke()
  p.fill(mixHex(c.bronze, INK, 0.45))
  p.ellipse(0, 0.54 * k, 0.06 * k, 0.09 * k)
  p.pop()
  // The bell: crown, shoulder, waist, flared lip; its shoulder catching the light as it strikes.
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(mixHex(c.bronze, CHURCH.candle, 0.35 * strike))
  p.beginShape()
  p.vertex(-0.07 * k, 0.05 * k)
  p.bezierVertex(-0.19 * k, 0.06 * k, -0.21 * k, 0.15 * k, -0.21 * k, 0.25 * k)
  p.bezierVertex(-0.21 * k, 0.4 * k, -0.24 * k, 0.51 * k, -0.34 * k, 0.6 * k)
  p.vertex(-0.34 * k, 0.64 * k)
  p.vertex(0.34 * k, 0.64 * k)
  p.vertex(0.34 * k, 0.6 * k)
  p.bezierVertex(0.24 * k, 0.51 * k, 0.21 * k, 0.4 * k, 0.21 * k, 0.25 * k)
  p.bezierVertex(0.21 * k, 0.15 * k, 0.19 * k, 0.06 * k, 0.07 * k, 0.05 * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, '#FFFFFF', 0.16 + 0.45 * strike))
  p.beginShape()
  p.vertex(-0.12 * k, 0.11 * k)
  p.bezierVertex(-0.16 * k, 0.2 * k, -0.16 * k, 0.37 * k, -0.19 * k, 0.51 * k)
  p.vertex(-0.13 * k, 0.51 * k)
  p.bezierVertex(-0.11 * k, 0.37 * k, -0.1 * k, 0.2 * k, -0.07 * k, 0.11 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The tower: its walls cut through, the arch into the nave, the ringing floor, the belfry open to the sky, the spire. */
function drawTower(p: p5, k: number, c: Paint, weight: number, t: number): void {
  const [tx0, tx1] = CH.tower
  const w = CH.wall
  const [bTop, bFloor] = CH.belfry
  // Inside, below the belfry: the porch under the tower (the doors' light falls here) and the ringing chamber.
  p.noStroke()
  p.fill(c.plasterShade)
  box2(p, k, tx0, bFloor, tx1 - w, CH.floor)
  // The sky through the belfry.
  p.fill(c.sky)
  box2(p, k, tx0 + w, bTop, tx1 - w, bFloor)
  drawBell(p, k, c, weight, t)
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(c.section)
  // The inner wall, over the arch; the front wall, over the doors; both up past the belfry's floor.
  box2(p, k, tx0, bTop, tx0 + w, CH.archTop)
  box2(p, k, tx1 - w, bTop, tx1, CH.doorTop)
  // The ringing floor and the belfry floor.
  box2(p, k, tx0 + w, bFloor, tx1 - w, bFloor + 0.12)
  box2(p, k, tx0 + w, -3.0, tx1 - w, -2.9)
  // The arch's soffit: a curve under the inner wall.
  p.noStroke()
  p.fill(c.section)
  p.beginShape()
  p.vertex(tx0 * k, CH.archTop * k)
  p.vertex((tx0 + w) * k, CH.archTop * k)
  p.vertex((tx0 + w) * k, (CH.archTop + 0.28) * k)
  p.bezierVertex((tx0 + w) * k, (CH.archTop + 0.1) * k, tx0 * k, (CH.archTop + 0.1) * k, tx0 * k, (CH.archTop + 0.28) * k)
  p.endShape(p.CLOSE)
  // The tower's outer faces: white clapboard, a cornice under the belfry and over it.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(c.outside)
  box2(p, k, tx1, bTop, tx1 + 0.07, CH.doorTop)
  box2(p, k, tx0 - 0.1, bFloor + 0.12, tx1 + 0.1, bFloor + 0.22)
  box2(p, k, tx0 - 0.1, bTop - 0.16, tx1 + 0.1, bTop)
  // The louvres' round head across the top of the opening.
  p.noStroke()
  p.fill(c.outside)
  p.beginShape()
  p.vertex((tx0 + w) * k, bTop * k)
  p.vertex((tx1 - w) * k, bTop * k)
  p.vertex((tx1 - w) * k, (bTop + 0.3) * k)
  p.bezierVertex((tx1 - w) * k, (bTop + 0.06) * k, (tx0 + w) * k, (bTop + 0.06) * k, (tx0 + w) * k, (bTop + 0.3) * k)
  p.endShape(p.CLOSE)
  // The spire: a tall slate pyramid, a gilt ball at its point.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(c.roof)
  poly(p, k, [
    [tx0 - 0.14, bTop - 0.16],
    [(tx0 + tx1) / 2, CH.spire],
    [tx1 + 0.14, bTop - 0.16],
  ])
  p.fill(c.gold)
  p.circle(((tx0 + tx1) / 2) * k, (CH.spire - 0.03) * k, 0.08 * k)
}

/**
 * The toll shaken down: at the funeral's one toll (and a little at its answer) dust sifts from under the ringing floor
 * and drifts down through the porch's grey light, onto the man standing under it.
 */
function drawSift(p: p5, k: number, t: number): void {
  if (!gloomy(t) || t < FUN.toll) return
  const [tx0, tx1] = CH.tower
  const top = -2.9
  p.noStroke()
  for (let i = 0; i < 34; i++) {
    const at = (i < 24 ? FUN.toll : FUN.answer) + hash(i, 21) * 0.35
    const age = t - at
    if (age < 0 || age > 4.5) continue
    const fall = 0.28 + 0.2 * hash(i, 22)
    const y = top + 0.05 + fall * age + 0.25 * (1 - Math.exp(-age / 0.3))
    if (y > CH.floor) continue
    const x = tx0 + CH.wall + 0.05 + (tx1 - tx0 - 2 * CH.wall - 0.1) * hash(i, 23) + 0.06 * Math.sin(age * (1.2 + hash(i, 24)) + i)
    const a = (i < 24 ? 0.6 : 0.35) * Math.min(1, age / 0.25) * (1 - age / 4.5)
    p.fill(alpha(p, '#FFFFFF', a))
    p.circle(x * k, y * k, (0.012 + 0.012 * hash(i, 25)) * k)
  }
}

/* ------------------------------------------------------------------ the set */

export const churchSet = scenery<null>({
  name: 'church',
  draw: (p, _s, ctx) => {
    const { k, weight } = ctx
    const t = ctx.t
    const c = paint(t)
    const f = frame(p, k)
    const X0 = Math.max(f.x0, -40)
    const X1 = Math.min(f.x1, 40)
    const Y0 = Math.max(f.y0, -30)
    const Y1 = Math.min(f.y1, 20)
    const [ax0, ax1] = CH.apse
    const [tx0, tx1] = CH.tower
    p.push()

    // The sky, paling to the ground; a far line of trees; the grass; the earth.
    if (X1 > X0 && Y1 > Y0) {
      vgrad(p, k, X0, Y0, X1, Math.min(Y1, CH.street), [
        [0, c.sky, 1],
        [1, c.skyLow, 1],
      ])
      p.noStroke()
      p.fill(c.trees)
      for (let i = -24; i <= 24; i++) {
        const x = i * 0.95 + hash(i, 1) * 0.45
        if (x < X0 - 1 || x > X1 + 1) continue
        const h = 0.75 + hash(i, 2) * 0.7
        p.ellipse(x * k, (CH.street - h * 0.42) * k, (1.0 + hash(i, 4) * 0.5) * k, h * k)
      }
      p.fill(c.earth)
      if (Y1 > CH.street) box2(p, k, X0, CH.street, X1, Y1)
      p.fill(c.grass)
      box2(p, k, X0, CH.street, X1, CH.street + 0.12)
    }

    // The nave, inside: the far wall's plaster up to the tie beam, and over it the open roof, boarded, to the peak.
    const ex = CH.eaves[0]
    const [pkx, pky] = CH.peak
    p.noStroke()
    p.fill(c.plaster)
    box2(p, k, ax1, CH.wallTop, tx0, CH.floor)
    const ctx2 = p.drawingContext as CanvasRenderingContext2D
    const g = ctx2.createLinearGradient(0, pky * k, 0, CH.wallTop * k)
    g.addColorStop(0, rgba(p, c.ceilingDeep, 1))
    g.addColorStop(1, rgba(p, c.ceiling, 1))
    ctx2.save()
    ctx2.fillStyle = g
    ctx2.beginPath()
    ctx2.moveTo(ax1 * k, CH.wallTop * k)
    ctx2.lineTo(ax1 * k, roofY(ax1) * k)
    ctx2.lineTo(pkx * k, pky * k)
    ctx2.lineTo(tx0 * k, roofY(tx0) * k)
    ctx2.lineTo(tx0 * k, CH.wallTop * k)
    ctx2.closePath()
    ctx2.fill()
    ctx2.restore()
    // The boards, running up the slope (seen end-on from under it), and the trusses: a tie beam along the walls'
    // top, a king post from it up to the ridge at each bay, and its two struts.
    p.stroke(alpha(p, INK, 0.3))
    p.strokeWeight(weight * 0.5)
    for (let x = ax1 + 0.35; x < tx0 - 0.1; x += 0.38) p.line(x * k, (roofY(x) + 0.02) * k, x * k, CH.wallTop * k)
    p.stroke(INK)
    p.strokeWeight(weight * 0.7)
    p.fill(c.timber)
    box2(p, k, ax1, CH.wallTop - 0.08, tx0, CH.wallTop + 0.05)
    for (const x of [-2.05, pkx, 1.95]) {
      const top = roofY(x)
      box2(p, k, x - 0.04, top, x + 0.04, CH.wallTop - 0.08)
      p.push()
      p.stroke(INK)
      p.strokeWeight(weight * 0.7)
      p.line((x - 0.04) * k, (CH.wallTop - 0.5) * k, (x - 0.7) * k, (roofY(x - 0.7) + 0.02) * k)
      p.line((x + 0.04) * k, (CH.wallTop - 0.5) * k, (x + 0.7) * k, (roofY(x + 0.7) + 0.02) * k)
      p.pop()
    }
    // A dado of panelling round the walls below the sills, and its rail.
    p.noStroke()
    p.fill(mixHex(c.plaster, c.pewLight, 0.28))
    box2(p, k, ax1, -0.5, tx0, CH.floor)
    p.stroke(alpha(p, INK, 0.3))
    p.strokeWeight(weight * 0.6)
    p.line(ax1 * k, -0.5 * k, tx0 * k, -0.5 * k)

    drawWindows(p, k, c, weight)
    drawLight(p, k, c, t)
    drawOrgan(p, k, c, weight, t)
    drawAltar(p, k, c, weight, t)
    if (c.g) drawPhotograph(p, k, c, weight)
    for (const x of CH.pews) pewAt(p, k, c, weight, x)
    drawFolk(p, k, t)
    drawPetals(p, k, t, false)

    // The tower, from the ground: the porch under it, the ringing chamber, the belfry, the spire.
    drawTower(p, k, c, weight, t)
    drawSift(p, k, t)

    // The walls and floors, cut: the apse wall up under the roof, the floor slab, all one warm dark in section; the
    // roof over them, slate, eaves to peak and down to the tower.
    p.stroke(INK)
    p.strokeWeight(weight * 0.8)
    p.fill(c.section)
    box2(p, k, ax0, roofY(ax0), ax1, CH.floor)
    box2(p, k, ax0 - 0.05, CH.floor, CH.landing[1], CH.floor + 0.26)
    const th = CH.roofTh
    const over = 0.3
    p.fill(c.roof)
    poly(p, k, [
      [ex - over, roofY(ex - over)],
      [pkx, pky],
      [tx0, roofY(tx0)],
      [tx0, roofY(tx0) - th],
      [pkx, pky - th - 0.05],
      [ex - over, roofY(ex - over) - th],
    ])
    p.fill(c.outside)
    box2(p, k, ax0 - 0.08, roofY(ax0) + 0.02, ax0, CH.floor)
    p.fill(c.stone)
    box2(p, k, ax0 - 0.2, CH.floor + 0.26, CH.landing[1], CH.street)
    p.noStroke()
    p.fill(alpha(p, INK, 0.12))
    for (let x = ax0 + 0.3; x < CH.landing[1] - 0.1; x += 0.6) box2(p, k, x, CH.floor + 0.3, x + 0.014, CH.street)

    // The steps down to the street: stone, each with a pale nosing.
    for (let i = 1; i < CH.risers; i++) {
      const sx0 = CH.landing[1] + CH.tread * (i - 1)
      const top = CH.floor + CH.rise * i
      p.stroke(INK)
      p.strokeWeight(weight * 0.8)
      p.fill(c.stone)
      box2(p, k, sx0, top, sx0 + CH.tread, CH.street)
      p.noStroke()
      p.fill(mixHex(c.stone, '#FFFFFF', 0.25))
      box2(p, k, sx0 + 0.01, top, sx0 + CH.tread, top + 0.04)
    }
    // The landing's top, under the doors.
    p.noStroke()
    p.fill(mixHex(c.stone, '#FFFFFF', 0.25))
    box2(p, k, tx1 - CH.wall, CH.floor, CH.landing[1], CH.floor + 0.04)

    // The doors' leaves: shut, a slab of oak in the opening; open, the far leaf stands out past the wall.
    const o = doorsOpen(t)
    p.stroke(INK)
    p.strokeWeight(weight * 0.8)
    if (o < 0.99) {
      const shut = 1 - Math.min(1, o)
      p.fill(c.pew)
      box2(p, k, tx1 - CH.wall, CH.doorTop, tx1 - CH.wall + CH.wall * shut + 0.001, CH.floor)
    }
    if (o > 0.01) {
      const leaf = 0.5 * Math.sin((Math.PI / 2) * Math.min(1.06, o))
      p.fill(mixHex(c.pew, CHURCH.candle, c.g ? 0.04 : 0.22))
      box2(p, k, tx1, CH.doorTop + 0.03, tx1 + Math.max(0.02, leaf), CH.floor)
      p.stroke(alpha(p, INK, 0.45))
      p.strokeWeight(weight * 0.5)
      if (leaf > 0.12) {
        box2(p, k, tx1 + leaf * 0.2, CH.doorTop + 0.2, tx1 + leaf * 0.8, -1.1)
        box2(p, k, tx1 + leaf * 0.2, -0.9, tx1 + leaf * 0.8, CH.floor - 0.15)
      }
    }
    p.pop()
  },
})
