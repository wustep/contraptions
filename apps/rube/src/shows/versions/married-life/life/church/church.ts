import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { along, clouds, type Frame, grass, gust, smoke, wobble } from '../depth'
import { alpha, frame, hash, knock, scenery, smooth } from '../kit'
import { AT, bar, beat, beatsIn, CUT } from '../music'
import { CARL, CHURCH, CLINIC, ELLIE, HILL, HOME, INK } from '../worlds'

/**
 * The church (the church builder's set): a small white chapel cut open down its length, like the house, seen from the
 * side, under a steep gable. The organ and the altar at the left, three oak pews along the aisle, the porch and the
 * doors at the right under the bell tower, and outside them the landing and a short flight of stone steps down to the
 * street.
 *
 * The same set in two lights. The wedding (0 to 21.577): morning, warm plaster, the glass lit and throwing its colour
 * onto the floor and the pews, the organ playing the march, posies on the pews and a garland on the altar, the bell
 * pealing and the doves on the roof wheeling off at it, the doors thrown open. The funeral (189.452 to 201.944): grey,
 * the glass dull, the organ silent, a wreath and white lilies by the wedding photograph on an easel where the two of
 * them stood, the dawn through the east window falling on it, and the same bell tolling once, sending the rooks off
 * the roof.
 *
 * It stands in a world: past it the far hills with their picnic hill and its tree, the nearer hills with the town,
 * a row of trees and a hedge, clouds at two depths, each sliding at its own depth as the camera moves; at its foot
 * the verge, and across the bottom of the frame a bank nearer than the church.
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
 * over it slowly, and the one pale beam comes last. 0 at the cut, 1 once it is morning.
 */
export const waking = (t: number): number => smooth(t, FUN.from, FUN.from + 2.9)
/** The beam: the last of the light to come. */
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

/**
 * The empty church at the funeral: nobody plays, but the one toll fills it, and the organ's pipes ring with it (the
 * gold they went on every note of the march), fading as the bell dies away.
 */
export function tollRing(t: number): number {
  if (!gloomy(t) || t < FUN.toll) return 0
  const on = (s: number, a: number, d: number) => (t < s ? 0 : a * Math.min(1, (t - s) / 0.05) * Math.exp(-(t - s) / d))
  return on(FUN.toll, 0.55, 0.9)
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
  const sky = g ? mixHex(HILL.skyGrey, CLINIC.wall, 0.35) : HILL.sky
  // At the funeral the low sky warms a shade as the grey morning comes up.
  const skyLow = g ? mixHex(mixHex(HILL.skyGrey, CHURCH.plaster, 0.2), HOME.dusk, 0.12 * waking(t)) : mixHex(HILL.sky, CHURCH.candle, 0.5)
  const grass = g ? mixHex(HILL.grass, HILL.skyGrey, 0.5) : HILL.grass
  const leaf = g ? mixHex(HILL.leaf, HILL.skyGrey, 0.45) : HILL.leaf
  // The haze the far things go toward: the sky low down, where they stand.
  const haze = mixHex(sky, skyLow, 0.6)
  return {
    g,
    sky,
    skyLow,
    grass,
    earth: mixHex('#A8927A', HILL.skyGrey, 0.35 * g),
    trees: g ? mixHex(HILL.leaf, HILL.skyGrey, 0.72) : mixHex(HILL.leaf, HILL.sky, 0.5),
    // The country round the church, hazed as it goes back: the far hills, the nearer ones, a hedge along the lane.
    hillFar: mixHex(grass, haze, 0.66),
    hillNear: mixHex(mixHex(grass, leaf, 0.3), haze, 0.5),
    hedge: mixHex(leaf, haze, 0.3),
    // Their tree on its far hill: in leaf at the wedding; turned, years later.
    farLeaf: mixHex(g ? HILL.leafAutumn : HILL.leaf, haze, 0.55),
    farBark: mixHex(HILL.bark, haze, 0.55),
    // The town's walls and roofs, small and pale with distance; one house sea-green.
    townWall: mixHex(HOME.trim, haze, 0.4),
    townRoof: mixHex(g ? HOME.roofOld : HOME.roof, haze, 0.55),
    townGreen: mixHex(HOME.siding, haze, 0.45),
    // A fair summer morning's clouds; the funeral's low grey ones.
    cloud: g ? mixHex(HILL.cloud, HILL.skyGrey, 0.5) : HILL.cloud,
    cloudShade: g ? mixHex(HILL.cloudShade, CLINIC.steel, 0.45) : mixHex(HILL.cloudShade, HILL.sky, 0.25),
    // The verge along the lane, and the bank in front of us: deeper green the nearer it is.
    tuft: mixHex(grass, leaf, 0.75),
    bank: mixHex(grass, leaf, 0.72),
    bankDark: mixHex(leaf, INK, 0.3),
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
 * The congregation, at the leads' own scale and in their language (Carl boxy, Ellie round): each one a flat,
 * unoutlined heads-and-shoulders silhouette on a pew's seat, the seat's front hiding everything below the shoulders,
 * so they peek up out of the pew as Carl does at the funeral. Head and shoulders are one colour, one shape; the head
 * is half a ball across and always wears a hat or hair, and a small nose turns it to the altar (left), so no head reads
 * as a ball. The tallest, hat and all, stands about 1.5 of Carl above the seat.
 */
export type Hat = 'bowler' | 'pillbox' | 'feather' | 'flowers' | 'bouffant' | 'sunhat' | 'bow' | 'cap'

export interface Sit {
  /** How far off the seat (cells): a bob. */
  lift?: number
  /** 0: the hand down, out of sight; 1: the arm up over the head. */
  arm?: number
  /** Tipped back (positive) or forward, radians, about the seat. */
  lean?: number
  trim?: string
}

/** A boxy head and shoulders (his family): square shoulders, a square head, a flat-crowned hat. */
function boxyBust(p: p5, U: (v: number) => number, bottom: number, color: string, hat: Hat, trim: string): void {
  p.push()
  p.rectMode(p.CORNER)
  p.fill(color)
  // Shoulders: a block, its top corners a little rounded, square at the bottom (hidden in the pew).
  p.rect(U(-0.13), U(-0.19), U(0.25), U(bottom + 0.19), U(0.05), U(0.05), 0, 0)
  // The head: a rounded square set forward on them, and the nose's nub toward the altar.
  p.rect(U(-0.09), U(-0.325), U(0.14), U(0.15), U(0.03))
  p.rect(U(-0.115), U(-0.27), U(0.03), U(0.035), U(0.01))
  p.fill(trim)
  if (hat === 'bowler') {
    // A hard hat, flat-crowned: the brim, then the crown.
    p.rect(U(-0.12), U(-0.335), U(0.2), U(0.022), U(0.01))
    p.rect(U(-0.085), U(-0.395), U(0.13), U(0.065), U(0.025), U(0.025), 0, 0)
  } else if (hat === 'pillbox') {
    // A pillbox hat, and her hair in a square roll at the back of her neck.
    p.rect(U(-0.07), U(-0.37), U(0.11), U(0.05), U(0.012))
    p.rect(U(0.02), U(-0.255), U(0.05), U(0.07), U(0.015))
  }
  p.pop()
}

/** A round head and shoulders (her family): sloped round shoulders, a round head, a hat that is never a dome alone. */
function roundBust(p: p5, U: (v: number) => number, bottom: number, color: string, hat: Hat, trim: string): void {
  p.fill(color)
  // Shoulders: a soft dome down into the pew.
  p.beginShape()
  p.vertex(U(-0.14), U(bottom))
  p.vertex(U(-0.14), U(-0.05))
  p.bezierVertex(U(-0.14), U(-0.15), U(-0.08), U(-0.2), U(0), U(-0.2))
  p.bezierVertex(U(0.08), U(-0.2), U(0.13), U(-0.15), U(0.13), U(-0.05))
  p.vertex(U(0.13), U(bottom))
  p.endShape(p.CLOSE)
  // The head, a little forward, and the nose.
  p.ellipse(U(-0.015), U(-0.255), U(0.13), U(0.14))
  p.ellipse(U(-0.078), U(-0.25), U(0.035), U(0.028))
  p.fill(trim)
  switch (hat) {
    case 'feather':
      // A small round hat and one long feather curling up and back.
      p.arc(U(0), U(-0.305), U(0.15), U(0.09), Math.PI, 2 * Math.PI, p.CHORD)
      p.beginShape()
      p.vertex(U(0.01), U(-0.33))
      p.bezierVertex(U(0.04), U(-0.39), U(0.1), U(-0.42), U(0.17), U(-0.42))
      p.bezierVertex(U(0.12), U(-0.4), U(0.07), U(-0.36), U(0.05), U(-0.315))
      p.endShape(p.CLOSE)
      break
    case 'flowers':
      // A band of flowers across the crown, three small blooms of two sizes.
      p.arc(U(-0.005), U(-0.3), U(0.14), U(0.08), Math.PI, 2 * Math.PI, p.CHORD)
      p.fill(mixHex(trim, CHURCH.cloth, 0.6))
      p.ellipse(U(-0.05), U(-0.335), U(0.04), U(0.034))
      p.ellipse(U(0.0), U(-0.35), U(0.05), U(0.042))
      p.ellipse(U(0.05), U(-0.33), U(0.036), U(0.03))
      break
    case 'bouffant':
      // Her hair piled high and back, over the head's crown (the face left clear).
      p.beginShape()
      p.vertex(U(-0.07), U(-0.29))
      p.bezierVertex(U(-0.08), U(-0.37), U(0.02), U(-0.39), U(0.07), U(-0.36))
      p.bezierVertex(U(0.11), U(-0.33), U(0.1), U(-0.25), U(0.06), U(-0.21))
      p.bezierVertex(U(0.03), U(-0.25), U(-0.02), U(-0.28), U(-0.07), U(-0.29))
      p.endShape(p.CLOSE)
      break
    case 'sunhat':
      // A wide soft brim, the crown on it.
      p.ellipse(U(-0.01), U(-0.31), U(0.26), U(0.035))
      p.arc(U(0), U(-0.315), U(0.12), U(0.1), Math.PI, 2 * Math.PI, p.CHORD)
      break
    case 'cap':
      // A boy's cap: the crown, its peak toward the altar.
      p.arc(U(0.005), U(-0.3), U(0.14), U(0.1), Math.PI, 2 * Math.PI, p.CHORD)
      p.ellipse(U(-0.085), U(-0.303), U(0.08), U(0.022))
      break
    case 'bow':
      // A child's hair bow: two little wings and the knot.
      p.triangle(U(0.0), U(-0.335), U(-0.06), U(-0.37), U(-0.055), U(-0.305))
      p.triangle(U(0.0), U(-0.335), U(0.06), U(-0.37), U(0.055), U(-0.305))
      p.rect(U(-0.015), U(-0.35), U(0.03), U(0.03), U(0.008))
      break
  }
}

/**
 * Someone in a pew. `x` is the middle of the shoulders, `seat` the seat's top; `s` the scale (1 a grown-up);
 * `boxy` his family's shapes, or hers. Everything below the seat's top is left to the pew (drawn after) to hide.
 */
export function sitter(p: p5, k: number, x: number, seat: number, s: number, color: string, hat: Hat, boxy: boolean, o: Sit = {}): void {
  const lift = o.lift ?? 0
  const arm = Math.max(0, Math.min(1, o.arm ?? 0))
  const U = (v: number) => v * s * k
  // Down past the seat's top even at the highest bob, so no hem ever shows over the pew.
  const bottom = (0.09 + lift) / s
  const trim = o.trim ?? color
  p.push()
  p.translate(x * k, (seat - lift) * k)
  p.rotate(o.lean ?? 0)
  p.noStroke()
  // The arm up (hers, on the kiss): from the shoulder, the elbow out toward the altar, the hand over the hat.
  if (arm > 0.02) {
    const mix = (a: Pt, b: Pt): Pt => [a[0] + (b[0] - a[0]) * arm, a[1] + (b[1] - a[1]) * arm]
    const elbow = mix([0.02, -0.08], [-0.1, -0.27])
    const hand = mix([0.0, -0.06], [-0.07, -0.43])
    p.noFill()
    p.stroke(color)
    p.strokeWeight(U(0.05))
    p.strokeCap(p.ROUND)
    p.strokeJoin(p.ROUND)
    p.beginShape()
    p.vertex(U(0.02), U(-0.13))
    p.vertex(U(elbow[0]), U(elbow[1]))
    p.vertex(U(hand[0]), U(hand[1]))
    p.endShape()
    p.noStroke()
  }
  if (boxy) boxyBust(p, U, bottom, color, hat, trim)
  else roundBust(p, U, bottom, color, hat, trim)
  p.pop()
}

/** Where a sitter's raised hand is, in cells: where the petals leave from. */
export const handOf = (x: number, seat: number, s: number, lift: number): Pt => [x - 0.07 * s, seat - lift - 0.42 * s]

/**
 * A pew in profile: a solid oak bench, not a chair. Its end board runs from the floor up under the seat and rises
 * behind it into the back (the side away from the altar), scrolled at the top; a carved panel on its face, and a
 * shadow under the seat's nose. `x` is the seat's centre.
 */
function pewAt(p: p5, k: number, c: Paint, weight: number, x: number): void {
  const { floor, seat } = CH
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.8)
  p.fill(c.pew)
  pewShape(p, k, x)
  // The carved panel on the end board's face, and the back's panel.
  p.noStroke()
  p.fill(c.pewLight)
  box2(p, k, x - 0.2, seat + 0.1, x + 0.26, floor - 0.2, 0.03)
  box2(p, k, x + 0.265, CH.pewBack + 0.18, x + 0.315, seat - 0.06, 0.02)
  p.fill(alpha(p, INK, 0.28))
  box2(p, k, x - 0.27, seat + 0.07, x + 0.19, seat + 0.1)
}

/** The pew's end board and back in profile, one closed shape (in the current fill and stroke). */
function pewShape(p: p5, k: number, x: number): void {
  const { floor, seat, pewBack } = CH
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
  const lit = (r: number) => (c.g ? tollRing(t) : rankLight(r, t))
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

/**
 * A candle's flame on its wick at (`x`, `y`): a flame, not a glow. Its height, its width and the lean of its tip each
 * wander on their own slow breath of air (`wobble`), so it never sways like a metronome; a paler core low in it, and the
 * wick's black stub.
 */
function candleFlame(p: p5, k: number, weight: number, x: number, y: number, t: number, seed: number): void {
  const h = 0.12 * (1 + 0.13 * wobble(t, seed, 0.47) + 0.06 * wobble(t, seed + 10, 0.19))
  const w = 0.035 * (1 + 0.14 * wobble(t, seed + 20, 0.38))
  const lean = 0.016 * wobble(t, seed + 30, 0.66) + 0.006 * wobble(t, seed + 40, 0.23)
  const shape = (s: number, base: number) => {
    p.beginShape()
    p.vertex(x * k, (base - 0.005) * k)
    p.bezierVertex((x - w * s) * k, (base - 0.03 * s) * k, (x - w * 0.6 * s + lean * 0.4) * k, (base - h * 0.66 * s) * k, (x + lean * s) * k, (base - h * s) * k)
    p.bezierVertex((x + w * 0.6 * s + lean * 0.4) * k, (base - h * 0.66 * s) * k, (x + w * s) * k, (base - 0.03 * s) * k, x * k, (base - 0.005) * k)
    p.endShape(p.CLOSE)
  }
  p.noStroke()
  p.fill(alpha(p, CHURCH.flame, 0.95))
  shape(1, y)
  p.fill(mixHex(CHURCH.candle, CHURCH.flame, 0.25))
  shape(0.5, y - 0.004)
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(Math.max(1, weight * 0.4))
  p.line(x * k, y * k, (x + lean * 0.1) * k, (y - 0.018) * k)
  p.noStroke()
}

/**
 * The wedding's garland on the altar: a swag of greenery across the cloth's front in two loops, pinned at its ends and
 * its middle with a rosette, small pink and white flowers along it, and a ribbon's tails at either end.
 */
function drawGarland(p: p5, k: number, weight: number, t: number): void {
  const [ax0, ax1, top] = CH.altar
  const y = top + 0.075
  const pins = [ax0 - 0.02, (ax0 + ax1) / 2, ax1 + 0.02]
  const dip = 0.13
  // Each loop as points, for the leaves and flowers along it.
  const along2 = (a: number, b: number, u: number): Pt => [a + (b - a) * u, y + dip * 4 * u * (1 - u)]
  // The ribbon's tails, stirring a little in the church's air (more as the bell rings).
  p.stroke(alpha(p, CHURCH.cloth, 0.95))
  p.strokeWeight(Math.max(1, 0.022 * k))
  p.noFill()
  for (const [i, x] of [pins[0], pins[2]].entries()) {
    const sway = 0.02 * wobble(t, 60 + i, 1.4) + airStir(t, i) * 0.6
    p.beginShape()
    p.vertex(x * k, y * k)
    p.quadraticVertex((x + sway * 0.5) * k, (y + 0.1) * k, (x + sway - 0.02) * k, (y + 0.2) * k)
    p.endShape()
  }
  // The greenery: a thick soft rope of leaf, a little darker underneath.
  p.strokeCap(p.ROUND)
  for (const [col, w, dy] of [
    [mixHex(HOME.leaf, INK, 0.3), 0.06, 0.008],
    [mixHex(HOME.leaf, CHURCH.cloth, 0.12), 0.045, 0],
  ] as [string, number, number][]) {
    p.stroke(col)
    p.strokeWeight(w * k)
    for (let j = 0; j < 2; j++) {
      p.beginShape()
      for (let i = 0; i <= 8; i++) {
        const [x, yy] = along2(pins[j], pins[j + 1], i / 8)
        p.vertex(x * k, (yy + dy) * k)
      }
      p.endShape()
    }
  }
  p.noStroke()
  // Flowers along it, and a rosette at each pin.
  for (let j = 0; j < 2; j++) {
    for (let i = 1; i < 6; i++) {
      const [x, yy] = along2(pins[j], pins[j + 1], i / 6)
      p.fill(i % 2 ? CHURCH.flowers : CHURCH.cloth)
      p.circle(x * k, (yy - 0.006) * k, 0.034 * k)
    }
  }
  for (const x of pins) {
    p.stroke(alpha(p, INK, 0.6))
    p.strokeWeight(weight * 0.4)
    p.fill(CHURCH.flowers)
    p.circle(x * k, y * k, 0.07 * k)
    p.noStroke()
    p.fill(CHURCH.cloth)
    p.circle(x * k, y * k, 0.03 * k)
  }
}

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
    candleFlame(p, k, weight, cx, top - 0.23 - tall, t, cx < (ax0 + ax1) / 2 ? 1 : 2)
  }
  if (!c.g) drawGarland(p, k, weight, t)
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
 * in sepia, a square and a round one, touching, each with a hint of the colour they were that day (his young blue,
 * her coral), so it reads as them and as the picture the show opened on, not as a sign. A black ribbon across its
 * corner. As the grey morning comes up, the low sun through the east window lands on it (`drawDawnPatch`), the one warm
 * thing at the altar end: she is there, in the picture. Drawn a third larger than the hall's copy, so it holds the
 * frame from the pew.
 */
const PHOTO_S = 1.3
function drawPhotograph(p: p5, k: number, c: Paint, weight: number, t: number): void {
  const x = (ALTAR_CARL + ALTAR_ELLIE) / 2
  const foot = CH.floor
  const s = PHOTO_S
  const top = -1.25 - 0.48 * (s - 1)
  const warm = beamUp(t)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.line((x - 0.22) * k, foot * k, (x - 0.02) * k, (top - 0.06) * k)
  p.line((x + 0.22) * k, foot * k, (x + 0.02) * k, (top - 0.06) * k)
  p.line((x + 0.05) * k, foot * k, (x + 0.01) * k, (top + 0.1) * k)
  p.fill(c.timber)
  box2(p, k, x - 0.28 * s, top + 0.48 * s, x + 0.28 * s, top + 0.52 * s)
  p.strokeWeight(weight * 0.8)
  p.fill(c.gold)
  box2(p, k, x - 0.26 * s, top, x + 0.26 * s, top + 0.48 * s, 0.01)
  p.noStroke()
  const sepia = mixHex(HOME.paper, HOME.wood, 0.3)
  p.fill(mixHex(sepia, '#FFE6B0', 0.25 * warm))
  box2(p, k, x - 0.21 * s, top + 0.05 * s, x + 0.21 * s, top + 0.43 * s)
  p.fill(alpha(p, mixHex(HOME.wood, INK, 0.2), 0.45))
  box2(p, k, x - 0.21 * s, top + 0.34 * s, x + 0.21 * s, top + 0.43 * s)
  const figure = mixHex(HOME.wood, INK, 0.35)
  p.fill(mixHex(figure, CARL, 0.45))
  p.push()
  p.translate((x - 0.05 * s) * k, (top + 0.29 * s) * k)
  p.rotate(0.14)
  box2(p, k, -0.045 * s, -0.045 * s, 0.045 * s, 0.045 * s, 0.01)
  p.pop()
  p.fill(mixHex(figure, ELLIE, 0.5))
  p.circle((x + 0.042 * s) * k, (top + 0.29 * s) * k, 0.09 * s * k)
  p.fill(alpha(p, INK, 0.92))
  poly(p, k, [
    [x + 0.1 * s, top],
    [x + 0.19 * s, top],
    [x + 0.26 * s, top + 0.07 * s],
    [x + 0.26 * s, top + 0.16 * s],
  ])
}

/**
 * The funeral's dawn on her picture: the low sun through the east window over the altar lands on the picture and the
 * wall round it as the window's own shape, its lights of glass laid out sheared and stretched across the plaster, the
 * lead between them left in shadow, each light faintly tinted by its glass. It comes up with the morning's beam and
 * creeps down the wall as the sun climbs. Light on a surface, with edges: not a glow.
 */
function drawDawnPatch(p: p5, k: number, c: Paint, t: number): void {
  const up = beamUp(t)
  if (up <= 0.003) return
  const [x0, x1, y0, y1] = WINDOWS[0]
  const w = x1 - x0
  const spring = y0 + w * 0.6
  const wx = (x0 + x1) / 2
  const wy = (y0 + y1) / 2
  // Where the window's middle lands (round the picture), how much larger its image is, and its shear (the low sun
  // comes from the left, so the image leans that way).
  const creep = Math.max(0, t - FUN.from - 2.5)
  const cx = 0.14 + 0.006 * creep
  const cy = -1.16 + 0.012 * creep
  const sx = 1.16
  const sy = 1.04
  const shear = -0.2
  const at = (x: number, y: number): Pt => {
    const v = (y - wy) * sy
    return [cx + (x - wx) * sx + shear * v, cy + v]
  }
  const warm = '#FFD898'
  const a = 0.26 * up
  const gap = 0.02
  p.noStroke()
  const lights = 3
  for (let i = 0; i < lights; i++) {
    const lx0 = x0 + 0.02 + ((w - 0.04) * i) / lights + gap
    const lx1 = x0 + 0.02 + ((w - 0.04) * (i + 1)) / lights - gap
    for (let j = 0; j < 4; j++) {
      const ly0 = spring + ((y1 - spring) * j) / 4 + gap
      const ly1 = spring + ((y1 - spring) * (j + 1)) / 4 - gap
      p.fill(alpha(p, mixHex(warm, c.glass[(i + j) % 4], 0.22), a))
      poly(p, k, [at(lx0, ly0), at(lx1, ly0), at(lx1, ly1), at(lx0, ly1)])
    }
  }
  // The window's head: its pointed arch over the lights, in one piece.
  p.fill(alpha(p, mixHex(warm, c.glass[1], 0.18), a))
  const head: Pt[] = []
  const m = (x0 + x1) / 2
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    const ang = (Math.PI / 2) * u
    head.push(at(x0 + 0.02 + gap + (m - x0 - 0.02 - gap) * (1 - Math.cos(ang)), spring - gap - (spring - y0 - 0.03) * Math.sin(ang)))
  }
  for (let i = 9; i >= 0; i--) {
    const u = i / 10
    const ang = (Math.PI / 2) * u
    head.push(at(x1 - 0.02 - gap - (x1 - 0.02 - gap - m) * (1 - Math.cos(ang)), spring - gap - (spring - y0 - 0.03) * Math.sin(ang)))
  }
  poly(p, k, head)
}

/**
 * At the funeral, where the wedding's garland and posies were: a wreath on a stand beside her easel (dark leaves round
 * a ring, white flowers in it, a black ribbon), and on the other side a stone urn of tall white lilies.
 */
function drawMourning(p: p5, k: number, c: Paint, weight: number): void {
  const floor = CH.floor
  const leaf = mixHex(mixHex(HOME.leaf, INK, 0.35), HILL.skyGrey, 0.3)
  const leafLight = mixHex(HOME.leaf, HILL.skyGrey, 0.35)
  const white = CHURCH.cloth
  // The wreath's stand: three thin legs from the floor up behind the ring.
  const wx = -0.28
  const wy = -0.97
  const r = 0.17
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.55)
  p.line((wx - 0.16) * k, floor * k, wx * k, (wy - 0.05) * k)
  p.line((wx + 0.16) * k, floor * k, wx * k, (wy - 0.05) * k)
  p.line((wx + 0.02) * k, floor * k, wx * k, (wy + r) * k)
  // The ring: leaves round it, overlapping, darker beneath, and white flowers set into it.
  p.noFill()
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(0.085 * k)
  p.circle(wx * k, wy * k, 2 * r * k)
  p.noStroke()
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    p.push()
    p.translate((wx + Math.cos(a) * r) * k, (wy + Math.sin(a) * r) * k)
    p.rotate(a + Math.PI / 2 + 0.5)
    p.fill(i % 2 ? leaf : leafLight)
    p.ellipse(0, 0, 0.1 * k, 0.05 * k)
    p.pop()
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    p.fill(white)
    p.circle((wx + Math.cos(a) * r) * k, (wy + Math.sin(a) * r) * k, 0.055 * k)
    p.fill(mixHex(CHURCH.flame, white, 0.5))
    p.circle((wx + Math.cos(a) * r) * k, (wy + Math.sin(a) * r) * k, 0.018 * k)
  }
  // The ribbon: a black bow at the ring's foot and its two tails.
  p.fill(alpha(p, INK, 0.92))
  const by = wy + r
  p.triangle((wx - 0.01) * k, by * k, (wx - 0.08) * k, (by - 0.04) * k, (wx - 0.07) * k, (by + 0.04) * k)
  p.triangle((wx + 0.01) * k, by * k, (wx + 0.08) * k, (by - 0.04) * k, (wx + 0.07) * k, (by + 0.04) * k)
  p.triangle((wx - 0.015) * k, by * k, (wx - 0.06) * k, (by + 0.2) * k, (wx - 0.025) * k, (by + 0.2) * k)
  p.triangle((wx + 0.015) * k, by * k, (wx + 0.055) * k, (by + 0.19) * k, (wx + 0.02) * k, (by + 0.19) * k)
  // The lilies: a stone urn on the floor, tall stems with their leaves, and the white trumpets opening.
  const ux = 0.86
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.fill(c.stone)
  poly(p, k, [
    [ux - 0.07, floor],
    [ux + 0.07, floor],
    [ux + 0.05, floor - 0.05],
    [ux + 0.1, floor - 0.26],
    [ux - 0.1, floor - 0.26],
    [ux - 0.05, floor - 0.05],
  ])
  box2(p, k, ux - 0.12, floor - 0.3, ux + 0.12, floor - 0.26, 0.01)
  const stems: [number, number][] = [
    [-0.2, -0.86],
    [-0.08, -1.0],
    [0.04, -1.06],
    [0.15, -0.92],
    [0.24, -0.78],
  ]
  p.stroke(alpha(p, leaf, 0.95))
  p.strokeWeight(weight * 0.55)
  p.noFill()
  for (const [dx, hy] of stems) {
    p.beginShape()
    p.vertex(ux * k, (floor - 0.3) * k)
    p.quadraticVertex((ux + dx * 0.3) * k, ((floor - 0.3 + hy) / 2) * k, (ux + dx) * k, hy * k)
    p.endShape()
  }
  p.noStroke()
  p.fill(leaf)
  for (const [dx, a] of [
    [-0.09, -0.7],
    [0.1, 0.6],
    [-0.04, -0.3],
  ] as [number, number][]) {
    p.push()
    p.translate((ux + dx) * k, (floor - 0.5) * k)
    p.rotate(a)
    p.ellipse(0, 0, 0.05 * k, 0.2 * k)
    p.pop()
  }
  for (const [dx, hy] of stems) {
    p.push()
    p.translate((ux + dx) * k, hy * k)
    p.rotate(dx * 1.6)
    p.fill(white)
    for (const a of [-0.75, 0, 0.75]) {
      p.push()
      p.rotate(a)
      p.triangle(-0.03 * k, 0, 0.03 * k, 0, 0, -0.13 * k)
      p.pop()
    }
    p.fill(mixHex(CHURCH.flame, white, 0.4))
    p.circle(0, -0.01 * k, 0.025 * k)
    p.pop()
  }
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

/**
 * The sun's slant through the glass (cells across for each cell down). It climbs as the morning goes on, so the shafts
 * steepen and the patches they lay on the floor and the pews creep back toward the wall over the minutes.
 */
const slant = (t: number): number => (gloomy(t) ? 0.5 + 0.004 * (t - FUN.from) : 0.53 - 0.003 * t)

interface Shaft {
  top: [Pt, Pt]
  foot: [Pt, Pt]
  hex: string
  a: number
}

/** The shafts the windows throw at `t`: two coloured ones from each window in the morning; at the funeral, one pale one. */
function shafts(c: Paint, t: number): Shaft[] {
  const floor = CH.floor
  const sl = slant(t)
  const out: Shaft[] = []
  const throwFrom = (wi: number, i: number, n: number, hex: string, a: number) => {
    const [x0, x1, , y1] = WINDOWS[wi]
    const src = y1 - 0.75
    const run = floor - src
    const a0 = x0 + ((x1 - x0) * i) / n
    const a1 = x0 + ((x1 - x0) * (i + 1)) / n
    out.push({ top: [[a0, src], [a1, src]], foot: [[a0 + run * sl, floor], [a1 + run * (sl + 0.08), floor]], hex, a })
  }
  if (!c.g) {
    for (let wi = 0; wi < WINDOWS.length; wi++) for (let i = 0; i < 2; i++) throwFrom(wi, i, 2, c.glass[(wi + i * 2) % 4], 0.13)
  } else if (beamUp(t) > 0.001) throwFrom(1, 0, 1, '#FFFFFF', 0.2 * beamUp(t))
  return out
}

/**
 * Where a shaft lands: over its last stretch the wall's foot behind it takes the glass's colour more and more strongly,
 * fullest at the floor (`drawFloorLight` lays the patch on the boards themselves).
 */
function landing(p: p5, k: number, s: Shaft, sl: number): void {
  const d = 0.42
  const [[f0x, fy], [f1x]] = s.foot
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, (fy - d) * k, 0, fy * k)
  g.addColorStop(0, rgba(p, s.hex, 0))
  g.addColorStop(1, rgba(p, s.hex, Math.min(0.3, s.a * 1.7)))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((f0x - d * sl) * k, (fy - d) * k)
  ctx.lineTo((f1x - d * (sl + 0.08)) * k, (fy - d) * k)
  ctx.lineTo(f1x * k, fy * k)
  ctx.lineTo(f0x * k, fy * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * The patches of sun on the floor: where each shaft meets the boards, a band of its colour along the floor's top,
 * spread a little wider than the shaft (the floor seen almost edge-on). Drawn over the floor's section.
 */
function drawFloorLight(p: p5, k: number, c: Paint, t: number): void {
  p.noStroke()
  for (const s of shafts(c, t)) {
    const [[f0x, fy], [f1x]] = s.foot
    p.fill(alpha(p, mixHex(s.hex, '#FFFFFF', 0.3), Math.min(0.5, s.a * 3.2)))
    poly(p, k, [
      [f0x - 0.03, fy + 0.012],
      [f1x + 0.03, fy + 0.012],
      [f1x + 0.12, fy + 0.055],
      [f0x - 0.1, fy + 0.055],
    ])
  }
}

/** The pews where the shafts cross them: each lit in its shaft's colour, cut to the shaft's edges. */
function drawLitPews(p: p5, k: number, c: Paint, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  for (const s of shafts(c, t)) {
    if (s.foot[1][0] < CH.pews[0] - 0.3) continue
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(s.top[0][0] * k, s.top[0][1] * k)
    ctx.lineTo(s.top[1][0] * k, s.top[1][1] * k)
    ctx.lineTo(s.foot[1][0] * k, s.foot[1][1] * k)
    ctx.lineTo(s.foot[0][0] * k, s.foot[0][1] * k)
    ctx.closePath()
    ctx.clip()
    p.fill(alpha(p, s.hex, Math.min(0.34, s.a * 2.2)))
    for (const x of CH.pews) pewShape(p, k, x)
    ctx.restore()
  }
}

/** The light the windows throw: coloured beams in the morning; one pale beam at the funeral. */
function drawLight(p: p5, k: number, c: Paint, t: number): void {
  const floor = CH.floor
  const sl = slant(t)
  // The sun is up on the left: each window throws its colours down and to the right, across the aisle, and they land.
  for (const s of shafts(c, t)) {
    beam(p, k, s.top, s.foot, s.hex, s.a)
    landing(p, k, s, sl)
  }
  if (!c.g) {
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
  // The funeral: the doors stand open, and the grey morning comes in along the porch floor as it comes up outside.
  const dawn = waking(t)
  if (dawn > 0.01) {
    const dx = CH.tower[1] - CH.wall
    beam(p, k, [[dx, CH.doorTop + 0.1], [dx, floor]], [[dx - 1.9, floor - 0.2], [dx - 2.7, floor]], c.skyLow, 0.32 * dawn)
  }
  // And the one grey beam from the first lancet, drawn above.
}

/* ------------------------------------------------------------------ the families, in the pews */

/**
 * Who sits where at the wedding, at the leads' scale. The front pew is Carl's family: his parents, grey, boxy, bolt
 * upright and still (his mother tips back a little at the kiss). The two behind are Ellie's: warm, round, more of
 * them, children in front, bobbing on every beat of the march; on the kiss they come up in their seats with an arm in the air, and the
 * ones who throw, throw petals. In each pew the far one sits a little to the right, paler, and is drawn first.
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
const far = (hex: string) => mixHex(hex, CHURCH.plaster, 0.3)
const HER = CHURCH.herSide
const HIS = CHURCH.hisSide
/** A warm peach and a rose for her family, from her side's own coral, yellow and pink. */
const PEACH = mixHex(HER[0], HER[1], 0.55)
const ROSE = mixHex(HER[3], HER[0], 0.35)
export const FOLK: Folk[] = [
  // His: the mother beyond, the father near the aisle.
  { pew: 0, dx: 0.1, s: 0.93, color: far(HIS[1]), hat: 'pillbox', trim: HIS[2], hers: false, every: 1, off: 0, amp: 0, throws: false },
  { pew: 0, dx: -0.07, s: 1, color: HIS[2], hat: 'bowler', trim: mixHex(HIS[2], INK, 0.45), hers: false, every: 1, off: 0, amp: 0, throws: false },
  // Hers, the first of their pews: an aunt beyond, her mother, and a girl in front of her.
  { pew: 1, dx: 0.12, s: 0.96, color: far(soft(HER[2], 0.15)), hat: 'sunhat', trim: far(soft(HER[1], 0.1)), hers: true, every: 1, off: 0.5, amp: 0.022, throws: false },
  { pew: 1, dx: -0.02, s: 1, color: soft(HER[1], 0.12), hat: 'feather', trim: soft(HER[0], 0.1), hers: true, every: 1, off: 0, amp: 0.026, throws: true },
  { pew: 1, dx: -0.14, s: 0.7, color: soft(PEACH, 0.1), hat: 'bow', trim: soft(HER[0], 0.1), hers: true, every: 1, off: 0.5, amp: 0.034, throws: false },
  // The second: a cousin beyond, her aunt with the flowers, and a boy in front.
  { pew: 2, dx: 0.12, s: 0.96, color: far(ROSE), hat: 'bouffant', trim: far(mixHex(HER[1], HOME.woodDark, 0.5)), hers: true, every: 2, off: 0, amp: 0.028, throws: true },
  { pew: 2, dx: -0.02, s: 1, color: soft(HER[3], 0.1), hat: 'flowers', trim: soft(HER[0], 0.1), hers: true, every: 1, off: 0, amp: 0.026, throws: true },
  { pew: 2, dx: -0.14, s: 0.72, color: soft(HER[2], 0.1), hat: 'cap', trim: mixHex(HER[2], INK, 0.3), hers: true, every: 1, off: 0.5, amp: 0.034, throws: false },
]

/** How far a sitter is off the seat at `t`: still for the photograph, bobbing on the beat through the march, up on the kiss. */
export function folkLift(f: Folk, t: number): number {
  if (!f.hers) return 0
  const march = smooth(t, 1.1, 1.5)
  const up = smooth(t, WED.kiss - 0.02, WED.kiss + 0.16)
  return f.amp * bounce(t, f.every, f.off) * march * (1 + 0.6 * up) + 0.04 * up
}

/** How high a sitter's arm is: out of sight, and up from the kiss (waving on the beat), for her family. */
export function folkArm(f: Folk, t: number): number {
  if (!f.hers) return 0
  const up = smooth(t, WED.kiss, WED.kiss + 0.22)
  return up * (0.82 + 0.18 * bounce(t, 1, f.off))
}

function drawFolk(p: p5, k: number, t: number): void {
  if (gloomy(t)) return
  const lean = 0.08 * smooth(t, WED.kiss + 0.1, WED.kiss + 0.9)
  for (const f of FOLK) {
    const x = CH.pews[f.pew] + f.dx
    sitter(p, k, x, CH.seat, f.s, f.color, f.hat, !f.hers, {
      lift: folkLift(f, t),
      arm: folkArm(f, t),
      lean: f.hat === 'pillbox' ? lean : 0,
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
          // Thrown up and out toward the aisle (left, over the two of them), and some back. A burst over their own heads,
          // not a fountain: thrown higher, they were up round the windows before the throwers were in the frame, and a
          // fresh viewer read them as something coming off the stained glass.
          vx: -0.9 + (h(2) - 0.35) * 1.8,
          vy: -(1.4 + h(3) * 0.8),
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

/* ------------------------------------------------------------------ small life inside */

/** What sets the church's hanging things swinging: each peal (the doors flung open, a draught), and the one toll. */
const STIRS: [number, number][] = [...WED.peal.map((s): [number, number] => [s, 0.55]), [WED.doors, 0.7]]
const STIRS_FUNERAL: [number, number][] = [
  [FUN.toll, 1],
  [FUN.answer, 0.4],
]

/**
 * How far the bell's ringing has set something hanging swinging at `t` (radians, about): every stroke goes through the
 * timbers, so a lamp or a ribbon takes up a slow swing that dies away over a few seconds. `seed` puts each a little out
 * of step with the next.
 */
function airStir(t: number, seed = 0): number {
  let a = 0
  for (const [s, f] of gloomy(t) ? STIRS_FUNERAL : STIRS) {
    if (t <= s) continue
    const u = t - s
    a += f * 0.045 * Math.min(1, u / 0.25) * Math.exp(-u / 2.4) * Math.sin((2 * Math.PI * u) / 1.9 + seed * 0.4)
  }
  return a
}

/**
 * The two lamps hanging on chains from the tie beam: one at the foot of the middle truss's king post, one over the
 * second pew (clear of where his balloon floats over the front pew at the funeral, so its chain never seems to hold it).
 */
const LAMPS = [-0.05, 2.45]
const CHAIN = 0.2

/**
 * A lamp on its chain from the tie beam: a brass cap, a glass lantern with a candle burning in it at the wedding (unlit
 * and grey at the funeral), a brass foot and its drop. It sways a hair in the church's air, and more after each stroke
 * of the bell, swinging from the hook.
 */
function drawLamps(p: p5, k: number, c: Paint, weight: number, t: number): void {
  const hook = CH.wallTop + 0.05
  LAMPS.forEach((x, i) => {
    const a = 0.01 * wobble(t, 50 + i, 3.3) + airStir(t, i + 1)
    p.push()
    p.translate(x * k, hook * k)
    p.rotate(a)
    // The chain: a link face-on, then one edge-on, down to the cap.
    p.stroke(alpha(p, INK, 0.85))
    p.strokeWeight(Math.max(1, weight * 0.45))
    p.line(0, 0, 0, CHAIN * k)
    p.noFill()
    for (let j = 0; j < 5; j++) {
      const y = (0.03 + (j * (CHAIN - 0.04)) / 4) * k
      if (j % 2 === 0) p.ellipse(0, y, 0.026 * k, 0.05 * k)
    }
    // The cap, the lantern, the foot, the drop.
    const y0 = CHAIN
    p.stroke(INK)
    p.strokeWeight(weight * 0.6)
    p.fill(c.bronze)
    poly(p, k, [
      [-0.03, y0],
      [0.03, y0],
      [0.09, y0 + 0.06],
      [-0.09, y0 + 0.06],
    ])
    const lit = !c.g
    p.fill(lit ? mixHex(HOME.lamp, CHURCH.plaster, 0.25) : mixHex(CLINIC.blind, HILL.skyGrey, 0.55))
    box2(p, k, -0.07, y0 + 0.06, 0.07, y0 + 0.25, 0.012)
    if (lit) candleFlame(p, k, weight * 0.8, 0, y0 + 0.21, t, 170 + i)
    p.stroke(alpha(p, INK, 0.75))
    p.strokeWeight(weight * 0.45)
    p.line(-0.025 * k, (y0 + 0.07) * k, -0.025 * k, (y0 + 0.24) * k)
    p.line(0.025 * k, (y0 + 0.07) * k, 0.025 * k, (y0 + 0.24) * k)
    p.stroke(INK)
    p.strokeWeight(weight * 0.6)
    p.fill(c.bronze)
    poly(p, k, [
      [-0.085, y0 + 0.25],
      [0.085, y0 + 0.25],
      [0.03, y0 + 0.3],
      [-0.03, y0 + 0.3],
    ])
    p.circle(0, (y0 + 0.33) * k, 0.04 * k)
    p.pop()
  })
}

/**
 * What a small church has on its walls: a hymn board by the altar end (an oak board, its slats blank), and at the back,
 * between the last window and the tower arch, a plain stone memorial tablet on a little bracket, its face left blank.
 */
function drawWallFittings(p: p5, k: number, c: Paint, weight: number): void {
  // The hymn board: a round-headed oak frame, three blank slats in it.
  const [hx0, hx1, hy0, hy1] = [0.31, 0.61, -2.3, -1.92]
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.fill(c.pew)
  p.beginShape()
  p.vertex(hx0 * k, hy1 * k)
  p.vertex(hx0 * k, (hy0 + 0.06) * k)
  p.bezierVertex(hx0 * k, (hy0 - 0.03) * k, hx1 * k, (hy0 - 0.03) * k, hx1 * k, (hy0 + 0.06) * k)
  p.vertex(hx1 * k, hy1 * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(mixHex(c.cloth, c.plaster, 0.3))
  for (let i = 0; i < 3; i++) {
    const y = hy0 + 0.07 + i * 0.095
    box2(p, k, hx0 + 0.04, y, hx1 - 0.04, y + 0.07, 0.008)
  }
  // The tablet: a stone slab with a moulded edge, a low pediment over it, a bracket under it.
  const [mx0, mx1, my0, my1] = [3.3, 3.62, -1.98, -1.62]
  const mid = (mx0 + mx1) / 2
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.55)
  p.fill(c.stone)
  poly(p, k, [
    [mx0 - 0.03, my0],
    [mid, my0 - 0.1],
    [mx1 + 0.03, my0],
  ])
  box2(p, k, mx0, my0, mx1, my1)
  poly(p, k, [
    [mx0 + 0.06, my1],
    [mx1 - 0.06, my1],
    [mid + 0.03, my1 + 0.08],
    [mid - 0.03, my1 + 0.08],
  ])
  p.noStroke()
  p.fill(mixHex(c.stone, CHURCH.cloth, 0.45))
  box2(p, k, mx0 + 0.035, my0 + 0.035, mx1 - 0.035, my1 - 0.035)
}

/**
 * The wedding's posies on the pew ends: a small bunch of pink and white flowers and leaves tied to each pew's back post
 * with a white bow, the bow's tails hanging and stirring as the bell rings. Gone by the funeral.
 */
function drawPosies(p: p5, k: number, weight: number, t: number): void {
  CH.pews.forEach((px, i) => {
    const x = px + 0.315
    const y = CH.pewBack + 0.2
    const sway = 0.012 * wobble(t, 80 + i, 1.6) + airStir(t, i + 3) * 0.8
    // The ribbon's tails.
    p.stroke(alpha(p, CHURCH.cloth, 0.95))
    p.strokeWeight(Math.max(1, 0.02 * k))
    p.noFill()
    for (const dx of [-0.02, 0.02]) {
      p.beginShape()
      p.vertex(x * k, (y + 0.03) * k)
      p.quadraticVertex((x + dx + sway * 1.2) * k, (y + 0.14) * k, (x + dx * 1.6 + sway * 3) * k, (y + 0.26) * k)
      p.endShape()
    }
    // The leaves and flowers, over the bow.
    p.noStroke()
    p.fill(mixHex(HOME.leaf, INK, 0.15))
    p.ellipse((x - 0.045) * k, (y - 0.035) * k, 0.07 * k, 0.04 * k)
    p.ellipse((x + 0.045) * k, (y - 0.04) * k, 0.07 * k, 0.04 * k)
    const blooms: [number, number, string][] = [
      [-0.025, -0.055, CHURCH.flowers],
      [0.022, -0.065, CHURCH.cloth],
      [0, -0.095, CHURCH.flowers],
      [-0.04, -0.09, CHURCH.cloth],
      [0.04, -0.1, mixHex(CHURCH.flowers, CHURCH.cloth, 0.5)],
    ]
    p.stroke(alpha(p, INK, 0.45))
    p.strokeWeight(weight * 0.3)
    for (const [dx, dy, col] of blooms) {
      p.fill(col)
      p.circle((x + dx) * k, (y + dy) * k, 0.042 * k)
    }
    // The bow: two loops and the knot.
    p.stroke(alpha(p, INK, 0.55))
    p.strokeWeight(weight * 0.35)
    p.fill(CHURCH.cloth)
    p.ellipse((x - 0.03) * k, (y + 0.01) * k, 0.05 * k, 0.032 * k)
    p.ellipse((x + 0.03) * k, (y + 0.01) * k, 0.05 * k, 0.032 * k)
    p.circle(x * k, (y + 0.012) * k, 0.022 * k)
  })
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
  // Through the belfry, the sky behind (painted with the world, its clouds passing behind the bell).
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
  // The arch's head, cased like the house's doorways: a moulding under the inner wall's end, a little wider than the
  // wall, so the stub reads as the wall over an opening. (A curved soffit hanging under it, two points and a hollow
  // between them, read as a drip.)
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.fill(c.outside)
  box2(p, k, tx0 - 0.05, CH.archTop, tx0 + w + 0.05, CH.archTop + 0.08)
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

/* ------------------------------------------------------------------ the world outside */

/**
 * Where the far layers stand true (`along`): about where the camera looks in the wides that see out (the peal, the
 * run out of the doors, the toll, the steps), so each is where it was placed there and slides from it as the camera
 * moves.
 */
const FAR_AT = 3.5
/** How far off each layer is: the clouds, the far hills, the nearer hills and the town, the trees, a hedge; the bank nearer than the set. */
const DEPTH = { cloudFar: 0.96, cloudNear: 0.9, hillFar: 0.85, hillNear: 0.72, trees: 0.5, hedge: 0.28, bank: -0.45 }

/** Their picnic hill (where its crest stands, at the anchor), far off over the trees. */
const PICNIC_X = 7.25
/** The far hills' height over the street at `x` (their own x): a long low swell, and their hill rising out of it. */
function farHill(x: number): number {
  const u = (x - PICNIC_X) / 1.15
  const hill = Math.abs(u) < 1 ? 0.75 * (1 - u * u) * (1 - u * u) : 0
  return 1.85 + 0.22 * Math.sin(x * 0.42 + 1) + 0.12 * Math.sin(x * 1.05 + 3) + hill
}
/** The nearer hills' height: lower, rounder, and level where the town sits on them. */
const TOWN_X: Pt = [5.15, 7.25]
function nearHill(x: number): number {
  const town = smooth(x, TOWN_X[0] - 0.8, TOWN_X[0] + 0.2) * (1 - smooth(x, TOWN_X[1] - 0.2, TOWN_X[1] + 0.9))
  return 1.22 + 0.16 * Math.sin(x * 0.75 + 2) + 0.09 * Math.sin(x * 1.9) + 0.18 * town
}

/** The town: its houses along the nearer hills, [x, half width, wall height, roof height, colour (0 white, 1 sea-green)]. */
const TOWN: [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = []
  let x = TOWN_X[0] + 0.1
  for (let i = 0; x < TOWN_X[1] - 0.1; i++) {
    const hw = 0.09 + 0.05 * hash(i, 21)
    out.push([x + hw, hw, 0.09 + 0.06 * hash(i, 22), 0.07 + 0.06 * hash(i, 23), i === 2 ? 1 : 0])
    x += 2 * hw + 0.03 + 0.08 * hash(i, 24)
  }
  return out
})()
/** Two of its chimneys that smoke: which houses. */
const SMOKING = [1, 4]

/** The row of far trees behind the church: x, height, width, each a soft dome on the street's line. */
const TREES: [number, number, number][] = Array.from({ length: 61 }, (_, j) => {
  const i = j - 30
  return [i * 0.95 + hash(i, 1) * 0.45, 0.75 + hash(i, 2) * 0.7, 1.0 + hash(i, 4) * 0.5]
})

/** The country the church stands in, behind it: clouds at two depths, the far hills with their hill and its tree, the
 * nearer hills with the town, the row of trees, a hedge along the lane. Each layer slides at its own depth. */
function drawCountry(p: p5, k: number, c: Paint, f: Frame, t: number, X0: number, X1: number): void {
  const street = CH.street
  const base = street + 0.3
  // The clouds. A fair summer morning: small high flat ones, and nearer heaped ones drifting past. The funeral: a low
  // grey lid in long soft bands, thinning as its morning comes up.
  if (!c.g) {
    clouds(p, k, f, t, { y0: -12, y1: -5.4, per: 26, size: 1.5, speed: 0.05, depth: DEPTH.cloudFar, body: mixHex(c.cloud, c.sky, 0.3), shade: mixHex(c.cloudShade, c.sky, 0.4), heap: 0.5, seed: 11, anchor: FAR_AT })
    clouds(p, k, f, t, { y0: -5.0, y1: -2.7, per: 17, size: 1.8, speed: 0.11, depth: DEPTH.cloudNear, body: c.cloud, shade: c.cloudShade, seed: 12, anchor: FAR_AT })
  } else {
    // Thinning as the morning comes up: seen as the camera rises out to the toll and goes down the steps.
    const thin = smooth(t, FUN.from + 4.5, CUT.home)
    clouds(p, k, f, t, { y0: -12, y1: -4.6, per: 34, size: 3.4, speed: 0.04, depth: DEPTH.cloudFar, body: c.cloud, shade: c.cloudShade, a: 0.75 - 0.3 * thin, heap: 0.42, seed: 13, anchor: FAR_AT })
    clouds(p, k, f, t, { y0: -4.4, y1: -1.7, per: 30, size: 2.8, speed: 0.07, depth: DEPTH.cloudNear, body: mixHex(c.cloud, c.sky, 0.25), shade: c.cloudShade, a: 0.85 - 0.45 * thin, heap: 0.55, seed: 14, anchor: FAR_AT })
  }
  p.noStroke()
  // The far hills, and their hill with its lone tree on the crest.
  const far = along(f, DEPTH.hillFar, FAR_AT)
  const band = (shift: number, height: (x: number) => number, color: string) => {
    p.fill(color)
    p.beginShape()
    p.vertex((X0 - 0.5) * k, base * k)
    for (let x = Math.floor(X0 * 4) / 4 - 0.5; x <= X1 + 0.5; x += 0.25) p.vertex(x * k, (street - height(x - shift)) * k)
    p.vertex((X1 + 0.5) * k, base * k)
    p.endShape(p.CLOSE)
  }
  band(far, farHill, c.hillFar)
  const tx = PICNIC_X + far
  if (tx > X0 - 1 && tx < X1 + 1) {
    const ty = street - farHill(PICNIC_X) + 0.03
    p.fill(c.farBark)
    box2(p, k, tx - 0.018, ty - 0.2, tx + 0.018, ty)
    p.fill(c.farLeaf)
    p.ellipse((tx - 0.09) * k, (ty - 0.25) * k, 0.2 * k, 0.15 * k)
    p.ellipse((tx + 0.09) * k, (ty - 0.24) * k, 0.2 * k, 0.14 * k)
    p.ellipse(tx * k, (ty - 0.32) * k, 0.24 * k, 0.17 * k)
  }
  // The nearer hills, and the town along them: roofs and white walls, one house sea-green, two chimneys smoking.
  const near = along(f, DEPTH.hillNear, FAR_AT)
  band(near, nearHill, c.hillNear)
  if (TOWN_X[1] + near > X0 - 1 && TOWN_X[0] + near < X1 + 1) {
    for (const [i, [hx, hw, wh, rh, green]] of TOWN.entries()) {
      const x = hx + near
      const y = street - nearHill(hx) + 0.03
      p.fill(green ? c.townGreen : c.townWall)
      box2(p, k, x - hw, y - wh, x + hw, y)
      p.fill(c.townRoof)
      p.triangle((x - hw - 0.02) * k, (y - wh) * k, x * k, (y - wh - rh) * k, (x + hw + 0.02) * k, (y - wh) * k)
      if (SMOKING.includes(i)) {
        const cx = x + hw * 0.45
        const cy = y - wh - rh * 0.55
        box2(p, k, cx - 0.015, cy - 0.06, cx + 0.015, cy + 0.02)
        smoke(p, k, t, cx, cy - 0.07, { rate: 1.1, rise: 0.11, life: 5, drift: 0.06, size: 0.045, color: mixHex(c.cloud, c.hillNear, 0.25), a: 0.4, seed: i })
      }
    }
  }
  // The row of trees: soft domes, unlined.
  const ts = along(f, DEPTH.trees, FAR_AT)
  p.noStroke()
  p.fill(c.trees)
  for (const [x, h, w] of TREES) {
    const x1 = x + ts
    if (x1 < X0 - 1 || x1 > X1 + 1) continue
    p.ellipse(x1 * k, (street - h * 0.42) * k, w * k, h * k)
  }
  // A hedge along the lane, low and broken, a shade nearer and greener.
  const hs = along(f, DEPTH.hedge, FAR_AT)
  p.fill(c.hedge)
  const i0 = Math.floor((X0 - hs) / 0.55) - 2
  const i1 = Math.ceil((X1 - hs) / 0.55) + 2
  for (let i = i0; i <= i1; i++) {
    if (hash(i, 31) > 0.62) continue
    const x = i * 0.55 + hash(i, 32) * 0.3 + hs
    const h = 0.2 + 0.18 * hash(i, 33)
    p.ellipse(x * k, (street - h * 0.32) * k, (0.5 + 0.35 * hash(i, 34)) * k, h * k)
  }
}

/**
 * Wildflowers on stalks along a ground line (`ground(x)`): `per` a cell where they grow, leaning with the wind (`gust`,
 * as the grass does) and nodding on their own; each a few small round heads in its colour.
 */
function wildflowers(p: p5, k: number, t: number, x0: number, x1: number, ground: (x: number) => number, o: { per: number; h: number; r: number; colors: string[]; stem: string; weight: number; seed: number }): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const heads: [number, number, number][] = []
  ctx.save()
  // The stalks, all in one stroke; then the heads, one fill to a colour.
  ctx.strokeStyle = o.stem
  ctx.lineWidth = o.weight
  ctx.lineCap = 'round'
  ctx.beginPath()
  const i0 = Math.floor(x0 * o.per)
  const i1 = Math.ceil(x1 * o.per)
  for (let i = i0; i <= i1; i++) {
    if (hash(i, 61, o.seed) > 0.45) continue
    const x = (i + hash(i, 62, o.seed)) / o.per
    const g = ground(x)
    const h = o.h * (0.6 + 0.4 * hash(i, 63, o.seed))
    const lean = (0.15 + 0.35 * gust(t - x * 0.12, o.seed)) * h + Math.sin(t * 1.7 + i * 2.1) * 0.03 * h
    const hx = x + lean
    const hy = g - h * (1 - 0.1 * (lean / h) * (lean / h))
    ctx.moveTo(x * k, g * k)
    ctx.quadraticCurveTo((x + lean * 0.2) * k, (g - h * 0.6) * k, hx * k, hy * k)
    heads.push([hx, hy, i])
  }
  ctx.stroke()
  o.colors.forEach((col, ci) => {
    ctx.fillStyle = col
    ctx.beginPath()
    for (const [hx, hy, i] of heads) {
      if (Math.floor(hash(i, 64, o.seed) * o.colors.length) !== ci) continue
      const n = 1 + Math.floor(hash(i, 65, o.seed) * 3)
      for (let j = 0; j < n; j++) {
        const cx = (hx + (j - (n - 1) / 2) * o.r * 0.9) * k
        const cy = (hy - (j % 2) * o.r * 0.6) * k
        ctx.moveTo(cx + o.r * k, cy)
        ctx.arc(cx, cy, o.r * k, 0, Math.PI * 2)
      }
    }
    ctx.fill()
  })
  ctx.restore()
}

/** Where the bank in front of us stands (its own x): a low rolling top, below the street. */
const BANK = 1.2
const bankTop = (x: number): number => BANK + 0.05 * Math.sin(x * 1.15 + 0.4) + 0.035 * Math.sin(x * 2.9 + 2)

/**
 * In front of the church: grass and wildflowers along the verge at the street's edge, in the wind; and nearer still, a
 * grassy bank across the bottom of the frame that slides past faster than the set as the camera moves, its tufts and
 * flowers taller and darker. Everything it grows stays below the street, so nothing of it ever stands over the two of
 * them.
 */
function drawVerge(p: p5, k: number, c: Paint, f: Frame, t: number, weight: number, X0: number, X1: number, Y1: number): void {
  const street = CH.street
  const flowers = c.g
    ? [mixHex(CHURCH.cloth, HILL.skyGrey, 0.3), mixHex(CHURCH.flowers, HILL.skyGrey, 0.55), mixHex(HOME.yellow, HILL.skyGrey, 0.6)]
    : [CHURCH.cloth, CHURCH.flowers, HOME.yellow, CHURCH.cloth]
  grass(p, k, t, X0 - 0.5, X1 + 0.5, street + 0.02, { per: 9, h: 0.11, color: c.tuft, weight: Math.max(1, weight * 0.5), seed: 3 })
  wildflowers(p, k, t, X0 - 0.5, X1 + 0.5, () => street + 0.03, { per: 1.6, h: 0.13, r: 0.022, colors: flowers, stem: c.tuft, weight: Math.max(1, weight * 0.45), seed: 4 })
  if (Y1 < BANK - 0.35) return
  const nb = along(f, DEPTH.bank, FAR_AT)
  const x0 = X0 - nb - 0.5
  const x1 = X1 - nb + 0.5
  p.push()
  p.translate(nb * k, 0)
  // The bank, darkening toward us.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, BANK * k, 0, (BANK + 0.8) * k)
  g.addColorStop(0, rgba(p, c.bank, 1))
  g.addColorStop(1, rgba(p, mixHex(c.bank, c.bankDark, 0.55), 1))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x0 * k, (Y1 + 1) * k)
  for (let x = Math.floor(x0 * 4) / 4; x <= x1 + 0.25; x += 0.25) ctx.lineTo(x * k, bankTop(x) * k)
  ctx.lineTo(x1 * k, (Y1 + 1) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Its tufts, rooted along its top and leaning with the wind as a gust runs along them (one stroke for them all).
  ctx.save()
  ctx.strokeStyle = c.bankDark
  ctx.lineWidth = Math.max(1, weight * 0.7)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = Math.floor(x0 * 7); i <= Math.ceil(x1 * 7); i++) {
    if (hash(i, 41) > 0.6) continue
    const x = (i + hash(i, 42)) / 7
    const gy = bankTop(x) + 0.03
    const h = 0.12 + 0.11 * hash(i, 43)
    const lean = (0.2 + 0.45 * gust(t - x * 0.12, 5)) * h + Math.sin(t * 2.1 + i) * 0.04 * h
    ctx.moveTo(x * k, gy * k)
    ctx.quadraticCurveTo((x + lean * 0.3) * k, (gy - h * 0.6) * k, (x + lean) * k, (gy - h * (1 - (0.15 * Math.abs(lean)) / h)) * k)
  }
  ctx.stroke()
  ctx.restore()
  wildflowers(p, k, t, x0, x1, (x) => bankTop(x) + 0.02, { per: 1.3, h: 0.22, r: 0.034, colors: flowers, stem: c.bankDark, weight: Math.max(1, weight * 0.6), seed: 6 })
  p.pop()
}

/* ------------------------------------------------------------------ the birds: the bell heard in the world */

/** The top of the roof's slates over x: up from the eaves to the ridge, and down from it to the tower. */
function roofTop(x: number): number {
  const ex = CH.eaves[0] - 0.3
  const [px, py] = CH.peak
  const ridge = py - CH.roofTh - 0.05
  if (x <= px) {
    const y0 = roofY(ex) - CH.roofTh
    return y0 + ((ridge - y0) * (x - ex)) / (px - ex)
  }
  const x1 = CH.tower[0]
  return ridge + ((roofY(x1) - CH.roofTh - ridge) * (x - px)) / (x1 - px)
}

/**
 * A bird from the side in flat shapes: body, head, a fanned tail, and the near wing raised or lowered with its beat
 * (`flap`, 1 up to -1 down) or folded along its back (`fold`). `dir` is the way it faces, narrowing as it turns; `ink`
 * outlines it (a white dove against a pale sky) or not (a rook is its own dark).
 */
function bird(p: p5, k: number, x: number, y: number, s: number, dir: number, flap: number, fold: boolean, tilt: number, fill: string, ink: string | null, weight: number): void {
  const U = (v: number) => v * s * k
  const wingTip: Pt = fold ? [-0.075, -0.022] : [-0.035, -0.014 - 0.11 * flap]
  const parts = () => {
    p.triangle(U(-0.045), U(-0.006), U(-0.118), U(-0.03), U(-0.115), U(0.014))
    p.ellipse(0, 0, U(0.12), U(0.056))
    p.circle(U(0.056), U(-0.022), U(0.05))
    p.triangle(U(0.03), U(-0.016), U(-0.03), U(-0.016), U(wingTip[0]), U(wingTip[1]))
  }
  p.push()
  p.translate(x * k, y * k)
  p.scale(dir, 1)
  p.rotate(tilt)
  if (ink) {
    // The outline first, a little larger, then the bird over it: one clean edge round the whole shape.
    p.stroke(ink)
    p.strokeWeight(Math.max(1, weight))
    p.fill(ink)
    parts()
  }
  p.noStroke()
  p.fill(fill)
  parts()
  if (!ink) {
    p.fill(mixHex(fill, CHURCH.stone, 0.45))
    p.triangle(U(0.075), U(-0.03), U(0.075), U(-0.014), U(0.105), U(-0.02))
  }
  p.pop()
}

/** A flight as a path in time: x and y through waypoints, each a monotone cubic (so a wheel turns, never overshoots). */
function flightPath(ts: number[], xs: number[], ys: number[], v0: Pt, v1: Pt): (s: number) => Pt {
  const fx = pchip(ts, xs, v0[0], v1[0])
  const fy = pchip(ts, ys, v0[1], v1[1])
  return (s) => [fx(s), fy(s)]
}

/**
 * The doves on the roof by the tower: on the bell's first peal (bar 2) they lift off together, beat out past the tower
 * below the belfry (never across the bell), climb into the sky to its right, wheel round once and away to the right
 * over the following bars.
 */
const DOVES = 8
const DOVE_PERCH = Array.from({ length: DOVES }, (_, i): Pt => {
  const x = 2.42 + 0.14 * i + 0.04 * hash(i, 70)
  return [x, roofTop(x) - 0.03]
})
const dovePath = flightPath(
  [0, 0.45, 0.9, 1.4, 1.9, 2.4, 2.9, 3.4, 3.9, 4.6, 5.6],
  [2.95, 4.35, 5.7, 6.9, 7.6, 7.45, 6.85, 6.95, 7.9, 9.6, 12],
  [-3.38, -3.3, -3.42, -3.8, -4.25, -4.55, -4.38, -3.92, -3.85, -4.3, -5.1],
  [3, 0.2],
  [2.4, -0.8],
)

function drawDoves(p: p5, k: number, f: Frame, t: number, weight: number): void {
  const up = WED.peal[0]
  for (let i = 0; i < DOVES; i++) {
    const lag = 0.05 * i + 0.08 * hash(i, 71)
    const s = t - up - lag
    const [px, py] = DOVE_PERCH[i]
    let x = px
    let y = py
    let dir = i % 3 === 0 ? -1 : 1
    let flap = 0
    let fold = true
    let tilt = -0.15 + 0.05 * wobble(t, 90 + i, 1.8)
    if (s > 0) {
      const [qx, qy] = dovePath(s)
      const [nx] = dovePath(s + 0.03)
      const b = ease(s, 0, 0.55)
      const ox = (hash(i, 72) - 0.5) * 0.55 + 0.06 * Math.sin(s * 1.3 + i)
      const oy = (hash(i, 73) - 0.5) * 0.32 + 0.04 * Math.sin(s * 1.7 + i * 2)
      x = qx + ox * b + (px - 2.95) * (1 - b)
      y = qy + oy * b + (py + 3.38) * (1 - b)
      const v = (nx - qx) / 0.03
      dir = Math.sign(v || 1) * Math.max(0.3, Math.min(1, Math.abs(v) / 0.7))
      flap = Math.sin(2 * Math.PI * 4.2 * s + 6.3 * hash(i, 74)) * (s < 1.6 ? 1 : 0.6)
      fold = false
      tilt = -0.25 * (1 - b) - 0.1 * b
    }
    if (x < f.x0 - 0.3 || x > f.x1 + 0.3 || y < f.y0 - 0.3 || y > f.y1 + 0.3) continue
    bird(p, k, x, y, 1, dir, flap, fold, tilt, CHURCH.cloth, INK, weight * 0.9)
  }
}

/**
 * The rooks on the roof at the funeral: on the toll they burst up off it, dive down the slope and out past the tower
 * below the belfry, and glide off over the street, smaller as they go, to settle in the tops of the far trees, where
 * they sit out the rest of it.
 */
const ROOKS = 4
const ROOK_PERCH = [1.0, 1.33, 1.9, 2.22].map((x): Pt => [x, roofTop(x) - 0.04])
/** The far trees they settle in, and where along each crown. */
const ROOK_TREE: [number, number][] = [
  [38, -0.18],
  [38, 0.14],
  [39, -0.1],
  [39, 0.2],
]
const rookPath = flightPath([0, 0.3, 0.75, 1.15, 1.5, 1.9], [1.6, 2.0, 2.9, 3.65, 4.4, 5.4], [-4.2, -4.7, -4.35, -3.33, -3.08, -2.85], [1.2, -2.5], [2.6, 0.8])

function drawRooks(p: p5, k: number, c: Paint, f: Frame, t: number): void {
  const black = mixHex(INK, CLINIC.steel, 0.12)
  const ts = along(f, DEPTH.trees, FAR_AT)
  for (let i = 0; i < ROOKS; i++) {
    const lag = 0.04 * i + 0.1 * hash(i, 81)
    const s = t - FUN.toll - lag
    const [px, py] = ROOK_PERCH[i]
    const [ti, dx] = ROOK_TREE[i]
    const [tx, th] = TREES[ti]
    const settle: Pt = [tx + ts + dx, CH.street - th * 0.92 - 0.02]
    let x = px
    let y = py
    let dir = i === 1 ? -1 : 1
    let flap = 0
    let fold = true
    let tilt = -0.35 + 0.06 * wobble(t, 100 + i, 2.1)
    let size = 1.15
    let tone = black
    if (s > 0) {
      const glide = ease(s, 1.7, 3.3)
      const [qx, qy] = rookPath(Math.min(s, 1.9))
      const go = Math.max(0, s - 1.9)
      // Past the tower, on toward the trees: straight at them, on a shallow arc, slowing to land.
      const fx = qx + 2.6 * go
      const fy = qy + 0.8 * go
      const b = ease(s, 0, 0.3)
      // Each keeps its own place in the loose group, drifting in it.
      const ox = (hash(i, 83) - 0.5) * 0.7 + 0.06 * Math.sin(s * 1.9 + i * 2)
      const oy = (hash(i, 84) - 0.5) * 0.34 + 0.04 * Math.sin(s * 2.3 + i)
      x = (fx + ox * b + (px - 1.6) * (1 - b)) * (1 - glide) + settle[0] * glide
      y = (fy + oy * b + (py + 4.2) * (1 - b)) * (1 - glide) + settle[1] * glide - 0.35 * Math.sin(Math.PI * glide)
      const [nx] = rookPath(Math.min(s + 0.03, 1.9))
      const v = s < 1.9 ? (nx - qx) / 0.03 : 2.6
      dir = Math.sign(v || 1) * Math.max(0.35, Math.min(1, Math.abs(v) / 0.8))
      const landed = smooth(s, 3.15, 3.4)
      flap = Math.sin(2 * Math.PI * 3.3 * s + 6.3 * hash(i, 82)) * (s < 1.9 ? 1 : 0.7 - 0.5 * glide) * (1 - landed)
      fold = landed > 0.5
      tilt = -0.3 * landed - 0.1 * (1 - b)
      size = 1.15 - 0.6 * glide
      tone = mixHex(black, c.trees, 0.4 * glide)
    }
    if (x < f.x0 - 0.3 || x > f.x1 + 0.3 || y < f.y0 - 0.3 || y > f.y1 + 0.3) continue
    bird(p, k, x, y, size, dir, flap, fold, tilt, tone, null, 0)
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

    // The sky, paling to the ground; the country behind (clouds, hills, the town, trees, a hedge); the grass; the earth.
    if (X1 > X0 && Y1 > Y0) {
      vgrad(p, k, X0, Y0, X1, Math.min(Y1, CH.street), [
        [0, c.sky, 1],
        [1, c.skyLow, 1],
      ])
      drawCountry(p, k, c, f, t, X0, X1)
      p.noStroke()
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

    drawWallFittings(p, k, c, weight)
    drawWindows(p, k, c, weight)
    drawLight(p, k, c, t)
    drawLamps(p, k, c, weight, t)
    drawOrgan(p, k, c, weight, t)
    drawAltar(p, k, c, weight, t)
    if (c.g) {
      drawMourning(p, k, c, weight)
      drawPhotograph(p, k, c, weight, t)
      drawDawnPatch(p, k, c, t)
    }
    for (const x of CH.pews) pewAt(p, k, c, weight, x)
    drawLitPews(p, k, c, t)
    drawFolk(p, k, t)
    if (!c.g) drawPosies(p, k, weight, t)
    drawPetals(p, k, t, false)

    // The tower, from the ground: the porch under it, the ringing chamber, the belfry, the spire.
    drawTower(p, k, c, weight, t)

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
    drawFloorLight(p, k, c, t)
    p.stroke(INK)
    p.strokeWeight(weight * 0.8)
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

    // The birds on the roof, that the bell sends up; the verge at the church's foot and the bank in front of us.
    if (c.g) drawRooks(p, k, c, f, t)
    else drawDoves(p, k, f, t, weight)
    if (X1 > X0) drawVerge(p, k, c, f, t, weight, X0, X1, Y1)
    p.pop()
  },
})
