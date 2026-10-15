import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash, rgba, smooth } from '../kit'
import { level, notes as measured } from '../music'
import { SEBS_MAT } from '../worlds'
import type p5 from 'p5'

/**
 * The people of Seb's, and what the club has on its walls and ceiling: everyone who is not one of the four.
 *
 * No one here is a ball. A person is a dark figure, shoulders and a smaller head, lit along an edge by what lights
 * them (a candle, the stage light, the band's clip lamps), so nothing here reads as Mia, Seb, David or their son.
 *
 * The room as it is is a working club late at night: a bartender polishing glasses, a waiter, a couple at one table
 * and a man smoking at the bar, a few heads in the house between us and the stage, the band away on its break. The
 * dream's last room is the same room full: every chair, both stools, a full house in front of us and the band
 * playing. At the waking the dream's people go with its rose, and what is left is the late-night few, who were there
 * all along.
 *
 * Everything here is in the room's own frame (the piano's: the lowest key's left edge is x = 0, a ball on a white key
 * is y = 0), and is drawn with the canvas's own paths, one fill a shape, inside a save and restore.
 */

const M = SEBS_MAT
type G = CanvasRenderingContext2D

/** The room's numbers this file needs (the same as `room.ts`'s, which imports this file). */
const FLOOR = 3.1
const STAGE = 2.6
const CEIL = -5.7
const COUNTER = 2.26

/** The dream's band plays and its house is full while the dream's rose is in the room; the real band comes on in the dark after she has gone. */
export const DREAM_BAND: [number, number] = [423.3, 453.4]
export const REAL_BAND = 469.0

/* ------------------------------------------------------------------ drawing helpers */

const disc = (g: G, k: number, x: number, y: number, r: number) => {
  g.moveTo((x + r) * k, y * k)
  g.arc(x * k, y * k, r * k, 0, Math.PI * 2)
}
const seg = (g: G, k: number, a: Pt, b: Pt) => {
  g.moveTo(a[0] * k, a[1] * k)
  g.lineTo(b[0] * k, b[1] * k)
}
const poly = (g: G, k: number, pts: Pt[]) => {
  g.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] * k, pts[i][1] * k)
  g.closePath()
}
/** A limb: a thick stroke with round ends. */
function limbs(g: G, k: number, color: string, w: number, lines: [Pt, Pt][]): void {
  g.strokeStyle = color
  g.lineWidth = w * k
  g.lineCap = 'round'
  g.beginPath()
  for (const [a, b] of lines) seg(g, k, a, b)
  g.stroke()
}
/** A light along one edge of a round shape, from angle a0 to a1 (radians, 0 is to the right, going down). */
function rim(g: G, k: number, x: number, y: number, r: number, a0: number, a1: number, color: string, a: number, w: number): void {
  if (a < 0.02) return
  g.strokeStyle = rgba(color, a)
  g.lineWidth = w
  g.beginPath()
  g.arc(x * k, y * k, r * k, a0, a1)
  g.stroke()
}

/* ------------------------------------------------------------------ the seated */

/** Someone at a table: where they sit (the seat's ball height, as the chairs are set), and which way they face. */
export interface Sitter {
  x: number
  y: number
  face: 1 | -1
  seed: number
}

export interface Light {
  /** The figure's own dark, and the light along its edge and how much. */
  tone: string
  rim: string
  rimA: number
  /** How much they move with the music, 0..1. */
  sway: number
}

/** A seated figure, at show time `t`: they sway a little, turn to the stage now and then, and lift a glass. */
export function sitter(g: G, k: number, s: Sitter, t: number, L: Light, top: number): void {
  const ph = s.seed * 6.283
  const sway = 0.014 * L.sway * Math.sin(t * 0.85 + ph)
  // A sip every so often: the hand comes up to the face and goes back to the table.
  const every = 10 + 7 * hash(s.seed * 97, 3)
  const u = ((t + 23 * s.seed) % every) / 1.9
  const sip = u < 1 ? Math.sin(Math.PI * u) : 0
  // Now and then a look at the stage (to the right), and back to their company.
  const lookEvery = 13 + 9 * hash(s.seed * 41, 5)
  const v = ((t + 31 * s.seed) % lookEvery) / 3.2
  const look = v < 1 ? Math.sin(Math.PI * v) : 0
  const x = s.x + sway
  const hy = s.y - 0.2 + 0.012 * sip
  const hx = x + s.face * 0.018 * (1 - look) + 0.03 * look
  const shoulder: Pt = [x + s.face * 0.08, s.y - 0.03]
  const rest: Pt = [s.x + s.face * 0.25, top - 0.02]
  const mouth: Pt = [hx + s.face * 0.07, hy + 0.05]
  const hand: Pt = [rest[0] + (mouth[0] - rest[0]) * sip, rest[1] + (mouth[1] - rest[1]) * sip]
  g.fillStyle = L.tone
  g.beginPath()
  g.ellipse(x * k, (s.y + 0.05) * k, 0.17 * k, 0.15 * k, 0, 0, Math.PI * 2)
  disc(g, k, hx, hy, 0.085)
  g.fill()
  const elbow: Pt = [shoulder[0] + (hand[0] - shoulder[0]) * 0.55, shoulder[1] + 0.1 - 0.06 * sip]
  limbs(g, k, L.tone, 0.06, [[shoulder, elbow], [elbow, hand]])
  // The glass in the hand, or on the table: the candle catches its rim.
  g.fillStyle = rgba(M.ivory, 0.22 + 0.25 * L.rimA)
  g.beginPath()
  poly(g, k, [[hand[0] - 0.022, hand[1] - 0.075], [hand[0] + 0.022, hand[1] - 0.075], [hand[0] + 0.016, hand[1]], [hand[0] - 0.016, hand[1]]])
  g.fill()
  const lw = Math.max(1, 0.012 * k)
  rim(g, k, hx, hy, 0.085, Math.PI * 1.15, Math.PI * 1.95, L.rim, 0.7 * L.rimA, lw)
  g.save()
  g.translate(x * k, (s.y + 0.05) * k)
  g.scale(1, 0.15 / 0.17)
  rim(g, k, 0, 0, 0.17, Math.PI * 1.15, Math.PI * 1.5, L.rim, 0.6 * L.rimA, lw)
  g.restore()
}

/* ------------------------------------------------------------------ the standing */

export interface Stance {
  x: number
  feet: number
  /** Height, cells. */
  h: number
  face: 1 | -1
  /** Walking: the stride's phase (radians); standing still: NaN. */
  stride: number
  arms: 'none' | 'down' | 'tray' | 'polish' | 'wipe'
  t: number
}

/** A standing figure: a waiter (white apron, a tray on one hand), a bartender (a white shirt front). */
export function stander(g: G, k: number, s: Stance, L: Light, dress: 'apron' | 'shirt' | 'none', clip?: number): void {
  const { x, feet, h, face } = s
  const walking = Number.isFinite(s.stride)
  const bob = walking ? 0.012 * Math.abs(Math.sin(s.stride)) : 0
  const top = feet - h - bob
  const hy = top + 0.075
  const sy = top + 0.2
  const wy = feet - h * 0.46
  const hipY = feet - h * 0.42
  g.save()
  if (clip !== undefined) {
    g.beginPath()
    g.rect((x - 2) * k, (top - 1) * k, 4 * k, (clip - top + 1) * k)
    g.clip()
  }
  // Legs, swinging as they walk.
  const sw = walking ? 0.3 * Math.sin(s.stride) : 0
  const leg = feet - hipY
  limbs(g, k, L.tone, 0.07, [
    [[x - 0.03, hipY], [x - 0.03 + Math.sin(sw) * leg, feet - (1 - Math.cos(sw)) * leg]],
    [[x + 0.03, hipY], [x + 0.03 - Math.sin(sw) * leg, feet - (1 - Math.cos(sw)) * leg]],
  ])
  g.fillStyle = L.tone
  g.beginPath()
  poly(g, k, [[x - 0.105, sy], [x + 0.105, sy], [x + 0.085, wy], [x + 0.09, hipY + 0.02], [x - 0.09, hipY + 0.02], [x - 0.085, wy]])
  disc(g, k, x + face * 0.012, hy, 0.072)
  g.fill()
  if (dress === 'apron') {
    g.fillStyle = rgba(M.ivory, 0.18 + 0.3 * L.rimA)
    g.beginPath()
    poly(g, k, [[x - 0.085, wy], [x + 0.085, wy], [x + 0.095, feet - h * 0.16], [x - 0.095, feet - h * 0.16]])
    g.fill()
  } else if (dress === 'shirt') {
    g.fillStyle = rgba(M.ivory, 0.16 + 0.28 * L.rimA)
    g.beginPath()
    poly(g, k, [[x - 0.045, sy + 0.005], [x + 0.045, sy + 0.005], [x, wy - 0.02]])
    g.fill()
  }
  // Arms.
  const sh: Pt[] = [[x - 0.09, sy + 0.02], [x + 0.09, sy + 0.02]]
  const swing = walking ? 0.05 * Math.sin(s.stride) : 0
  if (s.arms === 'none') {
    // (The caller draws the arms.)
  } else if (s.arms === 'down') {
    limbs(g, k, L.tone, 0.05, [[sh[0], [sh[0][0] - 0.02 - swing, wy + 0.05]], [sh[1], [sh[1][0] + 0.02 + swing, wy + 0.05]]])
  } else if (s.arms === 'tray') {
    // The near arm down, swinging; the far one up, the tray flat on its hand at the shoulder, two glasses on it.
    const far = face > 0 ? sh[1] : sh[0]
    const near = face > 0 ? sh[0] : sh[1]
    const elbow: Pt = [far[0] + face * 0.1, far[1] + 0.1]
    const hand: Pt = [far[0] + face * 0.16, far[1] - 0.03 + bob]
    limbs(g, k, L.tone, 0.05, [[far, elbow], [elbow, hand], [near, [near[0] - face * 0.02 - swing, wy + 0.05]]])
    g.fillStyle = rgba(M.brass, 0.35 + 0.4 * L.rimA)
    g.beginPath()
    g.rect((hand[0] - 0.14) * k, (hand[1] - 0.012) * k, 0.28 * k, 0.018 * k)
    g.fill()
    g.fillStyle = rgba(M.ivory, 0.2 + 0.3 * L.rimA)
    g.beginPath()
    for (const dx of [-0.06, 0.05]) poly(g, k, [[hand[0] + dx - 0.02, hand[1] - 0.085], [hand[0] + dx + 0.02, hand[1] - 0.085], [hand[0] + dx + 0.014, hand[1] - 0.012], [hand[0] + dx - 0.014, hand[1] - 0.012]])
    g.fill()
  } else {
    // Polishing a glass at the chest, or wiping a table: the hands go round.
    const a = s.t * (s.arms === 'polish' ? 5.2 : 3.4)
    const r = s.arms === 'polish' ? 0.03 : 0.06
    const at: Pt = s.arms === 'polish' ? [x + face * 0.1, sy + 0.12] : [x + face * 0.24, feet - h * 0.37]
    const h1: Pt = [at[0] + r * Math.cos(a), at[1] + r * 0.6 * Math.sin(a)]
    const h2: Pt = s.arms === 'polish' ? [at[0] - face * 0.01, at[1] + 0.04] : [at[0] - face * 0.12, at[1] + 0.02]
    limbs(g, k, L.tone, 0.05, [[sh[0], h1[0] < h2[0] ? h1 : h2], [sh[1], h1[0] < h2[0] ? h2 : h1]])
    if (s.arms === 'polish') {
      g.fillStyle = rgba(M.ivory, 0.25 + 0.35 * L.rimA)
      g.beginPath()
      poly(g, k, [[h2[0] - 0.028, h2[1] - 0.1], [h2[0] + 0.028, h2[1] - 0.1], [h2[0] + 0.018, h2[1]], [h2[0] - 0.018, h2[1]]])
      g.fill()
    }
  }
  const lw = Math.max(1, 0.012 * k)
  rim(g, k, x + face * 0.012, hy, 0.072, face > 0 ? -Math.PI * 0.5 : Math.PI * 1.0, face > 0 ? Math.PI * 0.15 : Math.PI * 1.55, L.rim, 0.7 * L.rimA, lw)
  g.strokeStyle = rgba(L.rim, 0.45 * L.rimA)
  g.lineWidth = lw
  g.beginPath()
  const ex = x + face * 0.102
  seg(g, k, [ex, sy + 0.01], [x + face * 0.086, wy])
  g.stroke()
  g.restore()
}

/** Someone who walks a timetable: [show time, x] stops; between two stops at the same x they stand. */
export function walker(plan: [number, number][], t: number): { x: number; face: 1 | -1; stride: number } | null {
  if (t < plan[0][0] || t > plan[plan.length - 1][0]) return null
  let i = 0
  while (i + 1 < plan.length && plan[i + 1][0] <= t) i++
  const [t0, x0] = plan[i]
  const [t1, x1] = plan[Math.min(i + 1, plan.length - 1)]
  if (t1 <= t0 || x1 === x0) {
    // Standing: facing the way they came, or the way they go next.
    const next = plan.slice(i + 1).find(([, x]) => x !== x0)
    const prev = [...plan.slice(0, i)].reverse().find(([, x]) => x !== x0)
    const face: 1 | -1 = next ? (next[1] > x0 ? 1 : -1) : prev ? (x0 > prev[1] ? 1 : -1) : 1
    return { x: x0, face, stride: NaN }
  }
  const u = (t - t0) / (t1 - t0)
  const e = u * u * (3 - 2 * u)
  const x = x0 + (x1 - x0) * e
  // The stride runs with the distance walked: a step every 0.36 cells.
  const walked = Math.abs(x - x0)
  return { x, face: x1 > x0 ? 1 : -1, stride: (walked / 0.36) * Math.PI }
}

/* ------------------------------------------------------------------ the near house */

/**
 * The house between us and the stage: heads and shoulders along the foot of the picture, nearer than anything in the
 * room, so they slide a little faster than it as the camera goes, and sink out of the picture as it draws back out of
 * the room. In the room as it is a few are there; in the dream, all of them.
 */
const NEAR = Array.from({ length: 34 }, (_, i) => ({
  x: -11.3 + i * 0.66 + 0.24 * (hash(i, 81) - 0.5),
  size: 0.85 + 0.3 * hash(i, 82),
  lag: 0.03 + 0.12 * hash(i, 83),
  real: hash(i, 85) < 0.4,
  seed: hash(i, 84),
}))
/** The strong notes of the piano the real house nods to, and the dream's. */
const NODS = measured(0, 470, 0.45).map((n) => n.t)

/** The index of the last of sorted `times` at or before `t` (-1 if none). */
function lastAt(times: number[], t: number): number {
  let lo = 0
  let hi = times.length - 1
  if (hi < 0 || times[0] > t) return -1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (times[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

export interface NearLight {
  /** How much of the dream's full house is there (0 in the room as it is). */
  dream: number
  /** The stage light on the nearest of them, and the candles' warmth. */
  stage: string
  warm: string
  /** The room's walls, left and right, inside which they sit. */
  x0: number
  x1: number
}

export function nearHouse(p: p5, k: number, t: number, L: NearLight): void {
  const f = frame(p, k)
  const fh = f.y1 - f.y0
  const vis = 1 - smooth(fh, 7.2, 9.6)
  if (vis <= 0.001) return
  const g = p.drawingContext as G
  g.save()
  const lw = Math.max(1, 0.006 * fh * k * 1.2)
  const loud = level(t)
  for (const h of NEAR) {
    const a = h.real ? 1 : L.dream
    if (a < 0.01) continue
    const x = f.cx + (h.x - f.cx) * 1.35
    if (x < L.x0 + 0.2 || x > L.x1 - 0.2 || x < f.x0 - 0.5 || x > f.x1 + 0.5) continue
    const s = 1.25 * h.size * fh
    let nod = 0
    for (let j = lastAt(NODS, t - h.lag); j >= 0; j--) {
      const d = t - NODS[j] - h.lag
      if (d > 0.5) break
      nod = Math.max(nod, Math.exp(-d / 0.14))
    }
    // The dream's house sways with the music; the real one is still but for the nods.
    const sway = L.dream * 0.014 * s * (0.3 + loud) * Math.sin(t * 1.25 + h.seed * 9)
    const base = f.y1 + 0.01 * fh + (1 - vis) * 0.22 * fh
    const headY = base - 0.075 * s + 0.005 * s * nod * (h.real ? 1 : 0.5)
    const xh = x + sway
    const r = 0.03 * s
    g.globalAlpha = a
    g.fillStyle = h.real ? '#0B0A12' : '#140E1C'
    g.beginPath()
    g.ellipse(x * k, (base - 0.02 * s) * k, 0.07 * s * k, 0.045 * s * k, 0, Math.PI, Math.PI * 2)
    disc(g, k, xh, headY, r)
    g.fill()
    // The stage light along the top of the heads nearest the piano; the candles' warmth on the others.
    const near = Math.max(0, 1 - Math.abs(x - 2.7) / 5)
    g.lineWidth = lw
    g.strokeStyle = rgba(L.stage, 0.18 + 0.4 * near)
    g.beginPath()
    g.arc(xh * k, headY * k, r * k, Math.PI * 1.25, Math.PI * 1.9)
    g.stroke()
    g.strokeStyle = rgba(L.warm, 0.22 + 0.25 * L.dream)
    g.beginPath()
    g.arc(xh * k, headY * k, r * k, Math.PI * 1.05, Math.PI * 1.25)
    g.stroke()
  }
  g.restore()
}

/* ------------------------------------------------------------------ the wall */

type Shot = 'sax' | 'trumpet' | 'bass' | 'piano' | 'singer' | 'drums' | 'record'
/** The photographs of the greats on the back wall, salon-hung between the sconces: where, how big, of what. */
const GALLERY: { x: number; y: number; w: number; h: number; of: Shot }[] = [
  { x: -8.55, y: 0.95, w: 0.62, h: 0.82, of: 'sax' },
  { x: -7.85, y: 1.55, w: 0.4, h: 0.4, of: 'record' },
  { x: -6.3, y: 1.3, w: 0.78, h: 0.58, of: 'trumpet' },
  { x: -6.6, y: 0.45, w: 0.38, h: 0.48, of: 'singer' },
  { x: -5.95, y: 0.42, w: 0.36, h: 0.46, of: 'bass' },
  { x: -4.35, y: 1.05, w: 0.84, h: 0.62, of: 'piano' },
  { x: -4.6, y: 0.2, w: 0.34, h: 0.34, of: 'record' },
  { x: -2.62, y: 1.48, w: 0.6, h: 0.74, of: 'drums' },
  { x: -2.15, y: 0.75, w: 0.36, h: 0.46, of: 'singer' },
]

/** One photograph: a dark frame, a pale mat, and in it a player in silhouette against a lit backdrop. */
function photo(g: G, k: number, ph: (typeof GALLERY)[number], lit: number, warm: string): void {
  const { x, y, w, h, of } = ph
  const fw = 0.035
  g.fillStyle = M.lacquer
  g.fillRect((x - w / 2) * k, (y - h / 2) * k, w * k, h * k)
  const mat = mixHex(M.ivory, M.wall, 0.62 - 0.3 * lit)
  g.fillStyle = mat
  g.fillRect((x - w / 2 + fw) * k, (y - h / 2 + fw) * k, (w - 2 * fw) * k, (h - 2 * fw) * k)
  const m = Math.min(w, h) * 0.12
  const ix0 = x - w / 2 + fw + m
  const iy0 = y - h / 2 + fw + m
  const iw = w - 2 * (fw + m)
  const ih = h - 2 * (fw + m)
  // The print: grey, lit from one side, a little of the room's warmth in it.
  const paper = mixHex(mixHex('#8C8A90', warm, 0.18), M.deep, 0.55 - 0.35 * lit)
  g.fillStyle = paper
  g.fillRect(ix0 * k, iy0 * k, iw * k, ih * k)
  const X = (u: number) => (ix0 + u * iw) * k
  const Y = (v: number) => (iy0 + v * ih) * k
  g.fillStyle = mixHex(paper, '#FFFFFF', 0.12 + 0.1 * lit)
  g.beginPath()
  g.ellipse(X(0.55), Y(0.45), 0.36 * iw * k, 0.46 * ih * k, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#121019'
  g.strokeStyle = '#121019'
  g.lineCap = 'round'
  g.beginPath()
  const S = (u: number) => u * Math.min(iw, ih) * k
  if (of === 'record') {
    g.fillStyle = mixHex(paper, M.deep, 0.5)
    g.fillRect(X(0.06), Y(0.06), iw * 0.88 * k, ih * 0.88 * k)
    g.fillStyle = '#121019'
    g.beginPath()
    g.arc(X(0.5), Y(0.5), S(0.4), 0, Math.PI * 2)
    g.fill()
    g.fillStyle = mixHex(M.velvet, M.ivory, 0.2)
    g.beginPath()
    g.arc(X(0.5), Y(0.5), S(0.12), 0, Math.PI * 2)
    g.fill()
    return
  }
  // The player: a figure from the waist up, or seated, and the instrument's line.
  if (of === 'piano') {
    // At a grand, side on: the lid up, the player hunched over the keys at the left.
    g.moveTo(X(0.35), Y(0.62))
    g.lineTo(X(0.92), Y(0.62))
    g.lineTo(X(0.92), Y(0.7))
    g.lineTo(X(0.35), Y(0.7))
    g.closePath()
    g.moveTo(X(0.4), Y(0.6))
    g.lineTo(X(0.9), Y(0.18))
    g.lineTo(X(0.9), Y(0.6))
    g.closePath()
    g.rect(X(0.4), Y(0.7), S(0.03), Y(0.92) - Y(0.7))
    g.rect(X(0.86), Y(0.7), S(0.03), Y(0.92) - Y(0.7))
    g.moveTo(X(0.27), Y(0.38))
    g.arc(X(0.22), Y(0.38), S(0.07), 0, Math.PI * 2)
    g.moveTo(X(0.12), Y(0.5))
    g.quadraticCurveTo(X(0.18), Y(0.42), X(0.3), Y(0.5))
    g.lineTo(X(0.32), Y(0.78))
    g.lineTo(X(0.12), Y(0.78))
    g.closePath()
    g.fill()
    return
  }
  if (of === 'drums') {
    g.moveTo(X(0.55), Y(0.3))
    g.arc(X(0.5), Y(0.3), S(0.08), 0, Math.PI * 2)
    g.moveTo(X(0.36), Y(0.42))
    g.quadraticCurveTo(X(0.5), Y(0.36), X(0.64), Y(0.42))
    g.lineTo(X(0.62), Y(0.62))
    g.lineTo(X(0.38), Y(0.62))
    g.closePath()
    g.ellipse(X(0.5), Y(0.76), S(0.17), S(0.15), 0, 0, Math.PI * 2)
    g.rect(X(0.14), Y(0.55), S(0.16), S(0.06))
    g.rect(X(0.7), Y(0.55), S(0.16), S(0.06))
    g.fill()
    g.lineWidth = S(0.025)
    g.beginPath()
    g.moveTo(X(0.08), Y(0.36))
    g.lineTo(X(0.32), Y(0.39))
    g.moveTo(X(0.7), Y(0.32))
    g.lineTo(X(0.94), Y(0.27))
    g.moveTo(X(0.38), Y(0.48))
    g.lineTo(X(0.22), Y(0.53))
    g.moveTo(X(0.62), Y(0.48))
    g.lineTo(X(0.78), Y(0.53))
    g.stroke()
    return
  }
  // A standing player: head, shoulders down to the print's foot.
  const lean = of === 'sax' ? -0.08 : of === 'trumpet' ? -0.05 : 0
  const hx = of === 'bass' ? 0.42 : 0.5
  g.moveTo(X(hx + lean + 0.09), Y(0.3))
  g.arc(X(hx + lean), Y(0.3), S(0.09), 0, Math.PI * 2)
  g.moveTo(X(hx - 0.17), Y(1))
  g.lineTo(X(hx - 0.15 + lean * 0.5), Y(0.47))
  g.quadraticCurveTo(X(hx + lean * 0.7), Y(0.4), X(hx + 0.15 + lean * 0.5), Y(0.47))
  g.lineTo(X(hx + 0.17), Y(1))
  g.closePath()
  g.fill()
  g.lineWidth = S(0.05)
  g.beginPath()
  if (of === 'sax') {
    // The horn from his mouth down and out in its curve, its bell up.
    g.moveTo(X(hx + lean + 0.05), Y(0.36))
    g.quadraticCurveTo(X(0.66), Y(0.5), X(0.62), Y(0.78))
    g.quadraticCurveTo(X(0.62), Y(0.88), X(0.72), Y(0.8))
    g.stroke()
    g.beginPath()
    g.moveTo(X(0.7), Y(0.8))
    g.lineTo(X(0.8), Y(0.66))
    g.lineTo(X(0.84), Y(0.72))
    g.closePath()
    g.fill()
  } else if (of === 'trumpet') {
    // The horn raised to the lights.
    g.moveTo(X(hx + lean + 0.06), Y(0.3))
    g.lineTo(X(0.86), Y(0.12))
    g.stroke()
    g.beginPath()
    g.moveTo(X(0.84), Y(0.13))
    g.lineTo(X(0.95), Y(0.02))
    g.lineTo(X(0.97), Y(0.16))
    g.closePath()
    g.fill()
  } else if (of === 'bass') {
    // The upright bass beside him, taller than he is.
    g.moveTo(X(0.72), Y(0.02))
    g.lineTo(X(0.66), Y(0.55))
    g.stroke()
    g.beginPath()
    g.ellipse(X(0.66), Y(0.76), S(0.2), S(0.26), 0.1, 0, Math.PI * 2)
    g.fill()
  } else {
    // The singer at the old stand microphone.
    g.lineWidth = S(0.03)
    g.moveTo(X(0.78), Y(1))
    g.lineTo(X(0.7), Y(0.36))
    g.stroke()
    g.beginPath()
    g.ellipse(X(0.69), Y(0.33), S(0.035), S(0.05), 0, 0, Math.PI * 2)
    g.fill()
  }
}

/** The gallery on the back wall, lit by the sconces (and in the dream warm with its rose). */
export function gallery(p: p5, k: number, house: number, sconces: number[], sconceY: number, warm: string): void {
  const g = p.drawingContext as G
  const f = frame(p, k)
  g.save()
  for (const ph of GALLERY) {
    if (ph.x + ph.w < f.x0 || ph.x - ph.w > f.x1 || ph.y + ph.h < f.y0 || ph.y - ph.h > f.y1) continue
    // How much the nearest sconce lights it: up close a print is lit, between them it is in the wall's own dark.
    let d = Infinity
    for (const sx of sconces) d = Math.min(d, Math.hypot(sx - ph.x, (sconceY - ph.y) * 0.7))
    const lit = (0.25 + 0.75 * house) * Math.max(0.2, 1 - d / 1.9)
    photo(g, k, ph, lit, warm)
  }
  g.restore()
}

/** The ceiling fans over the floor, turning slowly: their blades come round edge-on and broad by turns. */
const FANS = [-8.2, -4.7]
export function fans(p: p5, k: number, t: number, ink: string, lit: string): void {
  const g = p.drawingContext as G
  const f = frame(p, k)
  g.save()
  for (const [i, fx] of FANS.entries()) {
    if (fx + 1 < f.x0 || fx - 1 > f.x1 || CEIL > f.y1 || CEIL + 1 < f.y0) continue
    const hub = CEIL + 0.62
    g.strokeStyle = ink
    g.lineWidth = Math.max(1, 0.025 * k)
    g.beginPath()
    seg(g, k, [fx, CEIL], [fx, hub - 0.05])
    g.stroke()
    const a0 = t * 2.6 + i * 1.1
    // Four blades seen from the side: each a long thin shape whose far half is behind the hub.
    const blades: { x: number; depth: number }[] = []
    for (let j = 0; j < 4; j++) {
      const a = a0 + (j * Math.PI) / 2
      blades.push({ x: Math.cos(a) * 0.58, depth: Math.sin(a) })
    }
    blades.sort((a, b) => a.depth - b.depth)
    for (const b of blades) {
      const tone = mixHex(M.lacquer, lit, 0.15 + 0.12 * (b.depth + 1))
      g.fillStyle = tone
      g.beginPath()
      const tip = fx + b.x
      const th = 0.022 + 0.012 * Math.abs(b.depth)
      poly(g, k, [[fx, hub - 0.015], [tip, hub - th * 0.5 + 0.03 * b.depth], [tip, hub + th * 0.5 + 0.03 * b.depth], [fx, hub + 0.015]])
      g.fill()
    }
    g.fillStyle = M.lacquer
    g.beginPath()
    g.ellipse(fx * k, hub * k, 0.09 * k, 0.05 * k, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = rgba(lit, 0.35)
    g.lineWidth = Math.max(1, 0.012 * k)
    g.beginPath()
    g.ellipse(fx * k, hub * k, 0.09 * k, 0.05 * k, 0, Math.PI * 1.1, Math.PI * 1.9)
    g.stroke()
  }
  g.restore()
}

/** A cigarette's smoke from (x, y): three thin strands curling up and thinning out into the dark. */
export function smoke(p: p5, k: number, x: number, y: number, t: number, a: number, seed: number): void {
  if (a < 0.02) return
  const g = p.drawingContext as G
  g.save()
  g.lineCap = 'round'
  for (let s = 0; s < 3; s++) {
    const ph = seed * 5 + s * 2.1
    g.beginPath()
    const n = 14
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const yy = y - u * 1.1
      // The strand rises, wavering more the higher it goes, and drifts toward the stage.
      const xx = x + 0.06 * s * u + 0.18 * u * u + (0.02 + 0.09 * u) * Math.sin(u * 7 + t * (0.9 + 0.2 * s) + ph)
      if (i === 0) g.moveTo(xx * k, yy * k)
      else g.lineTo(xx * k, yy * k)
    }
    const grad = g.createLinearGradient(0, y * k, 0, (y - 1.1) * k)
    grad.addColorStop(0, rgba('#C9C6D6', 0.32 * a))
    grad.addColorStop(1, rgba('#C9C6D6', 0))
    g.strokeStyle = grad
    g.lineWidth = Math.max(1, (0.012 + 0.006 * s) * k)
    g.stroke()
  }
  g.restore()
}

/* ------------------------------------------------------------------ the band */

/** The band's places on the stage: the bass, the drummer behind the kit, the tenor at the far stand. */
const BASS_X = 6.95
const KIT_X = 8.75
const TENOR_X = 10.08

/** The band's strong onsets (the real band's from its first hit, the dream's under the self-playing piano). */
const BAND_HITS = measured(423, 510, 0.3).map((n) => n.t)

/** How hard the band is playing at `t`: the last hit's knock, and how long ago. */
function hitAt(t: number, lag = 0): number {
  const j = lastAt(BAND_HITS, t - lag)
  return j < 0 ? 0 : Math.exp(-(t - lag - BAND_HITS[j]) / 0.12)
}

/** An upright bass standing on its endpin, its body at `x`. */
function uprightBass(g: G, k: number, x: number, wood: string, ink: string, lit: string, litA: number): void {
  const b = STAGE - 0.06
  const body: Pt[] = []
  const prof: [number, number][] = [[0, 0.17], [0.1, 0.22], [0.2, 0.21], [0.3, 0.15], [0.36, 0.14], [0.45, 0.17], [0.55, 0.16], [0.62, 0.08]]
  for (const [v, w] of prof) body.push([x + w, b - v])
  for (let i = prof.length - 1; i >= 0; i--) body.push([x - prof[i][1], b - prof[i][0]])
  g.fillStyle = wood
  g.strokeStyle = ink
  g.lineWidth = Math.max(1, 0.012 * k)
  g.beginPath()
  poly(g, k, body)
  g.fill()
  g.stroke()
  g.fillStyle = M.lacquer
  g.beginPath()
  g.rect((x - 0.03) * k, (b - 1.15) * k, 0.06 * k, 0.6 * k)
  g.ellipse(x * k, (b - 1.17) * k, 0.045 * k, 0.05 * k, 0, 0, Math.PI * 2)
  g.rect((x - 0.008) * k, b * k, 0.016 * k, 0.06 * k)
  g.fill()
  g.strokeStyle = rgba(M.ivory, 0.45)
  g.lineWidth = Math.max(1, 0.006 * k)
  g.beginPath()
  for (const d of [-0.012, 0.012]) seg(g, k, [x + d, b - 1.12], [x + d * 1.6, b - 0.12])
  g.stroke()
  if (litA > 0.02) {
    g.strokeStyle = rgba(lit, 0.6 * litA)
    g.lineWidth = Math.max(1, 0.012 * k)
    g.beginPath()
    g.moveTo(body[0][0] * k, body[0][1] * k)
    for (let i = 1; i < prof.length; i++) g.lineTo(body[i][0] * k, body[i][1] * k)
    g.stroke()
  }
}

/**
 * The band, playing: the bassist behind his bass, the drummer behind the kit, the tenor at the far stand. `there` is
 * how much of them there is; `lamps` the clip lamps' light on them, `blaze` the stage's. In the dream they play soft
 * under the piano; the real band comes on in the dark after she has gone and plays from The End's band.
 */
export function bandPlayers(p: p5, k: number, t: number, ink: string, there: number, lamps: number, blaze: number, rose: number, playing: number): void {
  if (there < 0.01) return
  const g = p.drawingContext as G
  g.save()
  g.globalAlpha = there
  const tone = mixHex('#120F1C', M.velvet, 0.12 * rose)
  const lit = mixHex(M.candle, M.rose, 0.5 * rose)
  const litA = Math.min(1, 0.25 + 0.6 * lamps + 0.4 * blaze)
  const L: Light = { tone, rim: lit, rimA: litA, sway: 1 }
  const wood = mixHex(M.brass, M.velvet, 0.35)
  const loud = level(t)
  const groove = playing * (0.4 + 0.6 * loud)
  // The bassist, behind his bass and to its right, his left hand up its neck, his right plucking on the hits.
  {
    const x = BASS_X + 0.3
    const sway = groove * 0.02 * Math.sin(t * 3.2)
    stander(g, k, { x: x + sway, feet: STAGE, h: 1.08, face: -1, stride: NaN, arms: 'none', t }, L, 'none')
    uprightBass(g, k, BASS_X, wood, ink, lit, litA)
    const pluck = hitAt(t, 0.01) * playing
    const sh: Pt = [x + sway - 0.09, STAGE - 1.08 + 0.22]
    limbs(g, k, tone, 0.05, [
      [sh, [BASS_X + 0.08, STAGE - 1.0]],
      [[BASS_X + 0.08, STAGE - 1.0], [BASS_X + 0.01, STAGE - 0.98]],
      [[x + sway - 0.05, STAGE - 0.78], [BASS_X + 0.1, STAGE - 0.52 - 0.05 * pluck]],
    ])
  }
  // The drummer, behind the kit: head and shoulders over it, sticks to the snare and the ride.
  {
    const x = KIT_X + 0.12
    const hit = hitAt(t, 0) * playing
    const ride = groove * Math.max(0, Math.sin(t * Math.PI * 2 * 2.05))
    const top = STAGE - 1.0
    g.fillStyle = tone
    g.beginPath()
    poly(g, k, [[x - 0.11, top + 0.2], [x + 0.11, top + 0.2], [x + 0.1, STAGE - 0.3], [x - 0.1, STAGE - 0.3]])
    disc(g, k, x - 0.01, top + 0.08 + 0.01 * hit, 0.072)
    g.fill()
    const lh: Pt = [8.4, 2.0 - 0.06 + 0.06 * hit]
    const rh: Pt = [9.2, 1.5 + 0.05 * ride]
    limbs(g, k, tone, 0.05, [[[x - 0.09, top + 0.24], lh], [[x + 0.09, top + 0.24], rh]])
    g.strokeStyle = rgba(M.ivory, 0.55)
    g.lineWidth = Math.max(1, 0.012 * k)
    g.beginPath()
    seg(g, k, lh, [lh[0] - 0.2, lh[1] + 0.02 - 0.12 * (1 - hit) * playing])
    seg(g, k, rh, [rh[0] + 0.24, rh[1] - 0.12 + 0.1 * ride])
    g.stroke()
    rim(g, k, x - 0.01, top + 0.08 + 0.01 * hit, 0.072, Math.PI * 1.0, Math.PI * 1.6, lit, 0.7 * litA, Math.max(1, 0.012 * k))
  }
  // The tenor: at the far stand, turned to the piano, the horn's curve down his front and its bell up; he leans into
  // the band's loud bars and back in the soft.
  {
    const x = TENOR_X
    const lean = groove * (0.03 * Math.sin(t * 1.7) + 0.02)
    stander(g, k, { x: x + lean, feet: STAGE, h: 1.08, face: -1, stride: NaN, arms: 'none', t }, L, 'none')
    const mouth: Pt = [x + lean - 0.07, STAGE - 1.08 + 0.12]
    g.strokeStyle = mixHex(M.brass, lit, 0.3 * litA)
    g.lineWidth = Math.max(1, 0.035 * k)
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(mouth[0] * k, mouth[1] * k)
    g.quadraticCurveTo((x + lean - 0.2) * k, (STAGE - 0.85) * k, (x + lean - 0.16) * k, (STAGE - 0.55) * k)
    g.quadraticCurveTo((x + lean - 0.14) * k, (STAGE - 0.45) * k, (x + lean - 0.06) * k, (STAGE - 0.55) * k)
    g.stroke()
    g.fillStyle = mixHex(M.brass, lit, 0.3 * litA)
    g.beginPath()
    poly(g, k, [[x + lean - 0.08, STAGE - 0.54], [x + lean + 0.0, STAGE - 0.7], [x + lean + 0.05, STAGE - 0.64]])
    g.fill()
    limbs(g, k, tone, 0.045, [[[x + lean - 0.08, STAGE - 0.95], [x + lean - 0.18, STAGE - 0.8]], [[x + lean - 0.06, STAGE - 0.92], [x + lean - 0.15, STAGE - 0.62]]])
  }
  g.restore()
}

/** The band's clip lamps' light on the players and the stage under them: pools, not halos. */
export const BAND_X: [number, number] = [BASS_X - 0.4, TENOR_X + 0.3]
/** The bar's counter top, for the bartender behind it. */
export const BAR_COUNTER = COUNTER
export const ROOM_FLOOR = FLOOR
