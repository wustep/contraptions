import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { hash } from '../kit'
import { SEAM, nearestBeat } from '../music'
import { HANNAH_BY } from '../seams'
import { HOUSE, IAN, LOUISE } from '../worlds'
import { FLOOR, hermite, ss, type Light } from './time'

/**
 * The flash (169.610 → 177.186): in the middle of the language, as she touches the glass, the film cuts to Hannah, and
 * so does the show. The lake house on an afternoon years on, the sun full through the long window: Hannah, a child, on
 * a tall stool at the glass, drawing on a sheet she has taped to it, and Louise on the floor beside her. Hannah draws on
 * the beats: two great grey animals on seven legs; then, when her mother comes to her and touches the stool (the
 * chord, 173.441), her mother, in gold, and her father, in blue; and between them and the animals a ring, as the
 * heptapods write. "Mommy and Daddy talk with animals." Louise draws back to see it whole, and the show cuts back to
 * her touch on the glass, where Abbott's ring is forming.
 *
 * The house's world cells; she rests on the floor at (FLASH_X, 0), Hannah on her right a little above (HANNAH_BY).
 */

const b = (t: number): number => nearestBeat(t)

/** Where Louise rests, and Hannah on the stool on her right, a little above. */
export const FLASH_X = -4.25
export const HANNAH_AT: Pt = [FLASH_X + HANNAH_BY[0], HANNAH_BY[1]]

/** Hannah's strokes, on the beats; Louise's touch on the stool, on the chord. */
export const F = {
  in: SEAM.flash,
  first: b(170.62),
  second: b(172.501),
  touch: b(173.441),
  mommy: b(174.428),
  daddy: b(175.363),
  ring: b(176.222),
  out: SEAM.share,
}
/** Every strike of the flash. */
export const FLASH_HITS = [F.first, F.second, F.touch, F.mommy, F.daddy, F.ring]

/* ------------------------------------------------------------------ the stool */

/** The stool under Hannah: its seat's top (where her ball rests), its width, its legs' spread at the floor. */
const SEAT_TOP = HANNAH_AT[1] + R * 0.5
const SEAT = { w: 0.27, t: 0.04 }
const SPLAY = 0.2
const LEG_W = 0.032
/** Where Louise's middle is when her front meets the left leg (slanted out from under the seat to the floor). */
const TOUCH_X = (() => {
  const top = SEAT_TOP + SEAT.t
  const inset = SEAT.w / 2 - 0.02
  const at0 = HANNAH_AT[0] - inset - ((SPLAY - inset) * (0 - top)) / (FLOOR - top)
  const slant = Math.atan((SPLAY - inset) / (FLOOR - top))
  return at0 - (R + LEG_W / 2) / Math.cos(slant)
})()

/** How the stool rocks when she bumps it: a little, damped. */
const rock = (T: number): number => {
  const u = T - F.touch
  return u <= 0 ? 0 : 0.035 * Math.exp(-u / 0.35) * Math.sin(u * 15)
}

/** The stool, the shadow it throws on the floor (the room's floor light keeps the sun off behind it). */
export const STOOL_HULL: Pt[] = [
  [HANNAH_AT[0] - SPLAY, FLOOR],
  [HANNAH_AT[0] - SEAT.w / 2, SEAT_TOP],
  [HANNAH_AT[0] + SEAT.w / 2, SEAT_TOP],
  [HANNAH_AT[0] + SPLAY, FLOOR],
]

/* ------------------------------------------------------------------ Louise and Hannah */

/**
 * Louise's place on the floor at show time T: at rest as Hannah draws the animals; to her on the chord, rolling into
 * the stool's leg (her touch); there while Hannah draws them; then back to where she was, to see it whole.
 */
export function flashX(T: number): number {
  const go = F.touch - 0.85
  if (T <= go) return FLASH_X
  if (T < F.touch) return hermite(T - go, F.touch - go, FLASH_X, 0, TOUCH_X, 0.45)
  const back = F.daddy + 0.35
  const settle = F.ring + 0.55
  // Off the leg a hair as it gives, then still beside her.
  if (T < back) return TOUCH_X - 0.03 * ss(T, F.touch, F.touch + 0.3)
  if (T < settle) return hermite(T - back, settle - back, TOUCH_X - 0.03, 0, FLASH_X, 0)
  return FLASH_X
}

/** A lean in to the sheet as she makes each stroke: up toward it and down again. */
const STROKES = [F.first, F.second, F.mommy, F.daddy, F.ring]
function lean(T: number): number {
  let v = 0
  for (const t of STROKES) {
    const u = T - t
    if (u > -0.25 && u < 0.7) v = Math.max(v, u < 0 ? ss(u, -0.25, 0) : 1 - ss(u, 0.1, 0.7))
  }
  return v
}
/** Hannah at T: on the stool, leaning in to her strokes, rocking with it when her mother bumps it. */
export function hannahFlashAt(T: number): Pt {
  return [HANNAH_AT[0] + rock(T) * (SEAT_TOP - FLOOR) * -1 + 0.02 * lean(T), HANNAH_AT[1] - 0.035 * lean(T)]
}
/** Where she looks: up at her sheet; round at her mother when she comes, and back. */
export function hannahFlashLook(T: number): number {
  const at = -Math.PI / 2 + 0.25
  const her = Math.PI - 0.35
  return at + (her - at) * (ss(T, F.touch + 0.05, F.touch + 0.45) - ss(T, F.mommy - 0.45, F.mommy - 0.1))
}

/* ------------------------------------------------------------------ the drawing */

/** The sheet taped to the glass over her: its middle and size, in cells. */
const SHEET = { x: HANNAH_AT[0] + 0.06, y: -0.68, w: 0.68, h: 0.5 }
/** How long a stroke takes to draw. */
const DRAW = 0.55

/**
 * A crayon line: points along a path in the sheet's own units (its width is 1: -0.5..0.5 across, and down as far as its
 * height goes, about -0.37..0.37), and its colour.
 */
interface Mark {
  at: number
  color: string
  pts: Pt[]
  w: number
}

/** A child's wobble on a point: steady for a mark, so it never shimmers. */
const wob = (p: Pt, i: number, seed: number, a = 0.012): Pt => [p[0] + a * (hash(i, seed, 3) - 0.5) * 2, p[1] + a * (hash(i, seed, 5) - 0.5) * 2]
/** A loop: a circle drawn round once and a little past, as a child closes one. */
const loop = (c: Pt, r: number, seed: number, rx = 1, n = 30): Pt[] =>
  Array.from({ length: n + 4 }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2 * 1.06
    return wob([c[0] + r * rx * Math.cos(a), c[1] + r * Math.sin(a)], i, seed, r * 0.08)
  })
/** One of the animals: a tall body, round at the top, and seven legs down to the ground, each a wavy line. */
function animal(cx: number, top: number, seed: number): Pt[][] {
  const body = loop([cx, top + 0.12], 0.11, seed, 0.72)
  const legs: Pt[][] = []
  for (let i = 0; i < 7; i++) {
    const x0 = cx - 0.055 + (0.11 * i) / 6
    const x1 = cx - 0.17 + (0.34 * i) / 6
    const leg: Pt[] = []
    for (let j = 0; j <= 8; j++) {
      const u = j / 8
      leg.push(wob([x0 + (x1 - x0) * u + 0.012 * Math.sin(u * 7 + i), top + 0.22 + (GROUND - top - 0.22) * u], j, seed + i, 0.006))
    }
    legs.push(leg)
  }
  return [body, ...legs]
}
/** The ground line across the sheet's foot, drawn before we come in. */
const GROUND = 0.28
const INK = mix(HOUSE.mullion, HOUSE.night, 0.4)
const GREY = mix(HOUSE.pinesFar, HOUSE.mullion, 0.25)
const MARKS: Mark[] = [
  { at: -Infinity, color: HOUSE.grassDark, w: 0.016, pts: Array.from({ length: 12 }, (_, i) => wob([-0.44 + (0.88 * i) / 11, GROUND], i, 11, 0.008)) },
  ...animal(0.06, -0.31, 21).map((pts) => ({ at: F.first, color: GREY, w: 0.018, pts })),
  ...animal(0.3, -0.26, 41).map((pts) => ({ at: F.second, color: GREY, w: 0.018, pts })),
  { at: F.mommy, color: LOUISE, w: 0.022, pts: loop([-0.35, GROUND - 0.08], 0.075, 61) },
  { at: F.daddy, color: IAN, w: 0.022, pts: loop([-0.18, GROUND - 0.08], 0.075, 71) },
  { at: F.ring, color: INK, w: 0.016, pts: loop([-0.12, -0.13], 0.08, 81, 1.1) },
]

/**
 * The sheet and what is on it at T: each mark's strokes drawn on in turn over DRAW seconds from its beat (the animal's
 * body first, then its legs, quickly), a crayon's grain in it.
 */
export function drawSheet(p: p5, k: number, T: number, L: Light): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const px = (v: number) => v * k
  const { x, y, w, h } = SHEET
  ctx.save()
  // The sun through the glass behind it: the paper glows warm, the light through it.
  const paper = mix(HOUSE.linen, HOUSE.lamp, 0.18 * L.sun)
  ctx.fillStyle = rgba(HOUSE.night, 0.12)
  ctx.fillRect(px(x - w / 2 + 0.012), px(y - h / 2 + 0.016), px(w), px(h))
  ctx.fillStyle = paper
  ctx.fillRect(px(x - w / 2), px(y - h / 2), px(w), px(h))
  // Tape at its top corners.
  ctx.fillStyle = rgba(HOUSE.linenShade, 0.85)
  for (const s of [-1, 1]) {
    ctx.save()
    ctx.translate(px(x + s * (w / 2 - 0.02)), px(y - h / 2))
    ctx.rotate(s * 0.5)
    ctx.fillRect(px(-0.05), px(-0.016), px(0.1), px(0.032))
    ctx.restore()
  }
  ctx.translate(px(x), px(y))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // The strokes of one mark come one after another within its DRAW seconds.
  const groups = new Map<number, Mark[]>()
  for (const m of MARKS) groups.set(m.at, [...(groups.get(m.at) ?? []), m])
  for (const [at, marks] of groups) {
    const u = at === -Infinity ? 1 : (T - at) / DRAW
    if (u <= 0) continue
    const each = 1 / marks.length
    marks.forEach((m, i) => {
      const v = Math.max(0, Math.min(1, (u - i * each * 0.7) / (each * 1.3)))
      if (v <= 0) return
      const n = Math.max(2, Math.ceil(m.pts.length * v))
      ctx.strokeStyle = rgba(m.color, 0.9)
      ctx.lineWidth = Math.max(1, px(m.w))
      ctx.beginPath()
      for (let j = 0; j < n; j++) {
        const [mx, my] = m.pts[j]
        if (j === 0) ctx.moveTo(px(mx * w), px(my * w))
        else ctx.lineTo(px(mx * w), px(my * w))
      }
      ctx.stroke()
    })
  }
  ctx.restore()
}

/** The stool: a tall child's stool of the room's grey oak, its seat under her, splayed legs, a rung. */
export function drawStool(p: p5, k: number, T: number, L: Light): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const px = (v: number) => v * k
  const cx = HANNAH_AT[0]
  const a = rock(T)
  const wood = mix(HOUSE.wood, HOUSE.night, 0.25 * (1 - L.amb))
  const dark = mix(HOUSE.woodDark, HOUSE.night, 0.3 * (1 - L.amb))
  ctx.save()
  // It rocks about the foot of its right leg.
  ctx.translate(px(cx + SPLAY), px(FLOOR))
  ctx.rotate(a)
  ctx.translate(-px(cx + SPLAY), -px(FLOOR))
  ctx.strokeStyle = dark
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1, px(LEG_W))
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(px(cx + s * (SEAT.w / 2 - 0.02)), px(SEAT_TOP + SEAT.t))
    ctx.lineTo(px(cx + s * SPLAY), px(FLOOR))
    ctx.stroke()
  }
  ctx.lineWidth = Math.max(1, px(0.02))
  const ry = SEAT_TOP + 0.6 * (FLOOR - SEAT_TOP)
  const spread = SEAT.w / 2 - 0.02 + (SPLAY - (SEAT.w / 2 - 0.02)) * 0.6
  ctx.beginPath()
  ctx.moveTo(px(cx - spread), px(ry))
  ctx.lineTo(px(cx + spread), px(ry))
  ctx.stroke()
  ctx.fillStyle = wood
  ctx.beginPath()
  ctx.roundRect(px(cx - SEAT.w / 2), px(SEAT_TOP), px(SEAT.w), px(SEAT.t), px(0.012))
  ctx.fill()
  ctx.fillStyle = rgba(HOUSE.lamp, 0.25 * L.sun)
  ctx.fillRect(px(cx - SEAT.w / 2 + 0.01), px(SEAT_TOP), px(SEAT.w - 0.02), px(0.008))
  ctx.restore()
}
