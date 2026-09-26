import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { SEAM } from '../music'
import { TOWN } from '../worlds'

/**
 * The hatter's town (canonical: the town builder owns this file; the sky builder and the war builder play in this
 * town too, and use these constants and nothing else of it). Standing scenery for the whole town world, drawn from
 * show time: the sky over everything; the far roofs and the church; the houses across the street, half-timbered and
 * jettied under steep slate; the hat shop (the late Hatter's), its ground floor cut open like a doll's house (the
 * workroom on the left with its window and bench, the shop on the right with its counter, its shelves of hats and its
 * mirror), its door in its right-hand wall, its house going up over it to the roof; and the street's cobbles out to
 * the alley's mouth at x = 26, where the sky builder takes over.
 *
 * What moves in the shop (the hat line, the lamp's flame, the Witch) is the parts' (`shop.ts`, `curse.ts`); the set
 * draws what stands there all day and all night. Beyond x = 26 it draws only the sky and the ground.
 *
 * Coordinates are the town world's cells, which are the shop part's own frame: Sophie starts the show at (-0.5, 0),
 * at the left end of the workroom. A ball on the floor or the cobbles has its centre at y = 0.
 *
 * The town is seen four times, lit by show time: dawn into morning (0 → 38.3, the hat shop and the street), noon
 * (38.3 → 85.8, the alley and the sky over the roofs: the sky builder's, far to the right and up), night (85.8 →
 * 107.9, the shop, the curse) and the war (205.86 → 237.0: the street at night under the bombers: the war builder's).
 */

export const TOWN_AT = {
  floor: 0,
  ground: 0.13,
  /** The shop, cut open: its back wall from x0 to x1, its ceiling (the house goes on up to `roof`, the eaves). */
  shop: [-2.0, 8.4] as [number, number],
  ceil: -3.4,
  roof: -9.5,
  /** The counter (x0, x1, top) where the curse finds her. */
  counter: [4.75, 6.45, -0.72] as [number, number, number],
  /** The shop's right-hand wall, from x0 to x1, with the door in it: the opening's height. Out onto the street. */
  wall: [8.4, 9.2] as [number, number],
  doorTop: -2.2,
  /** The street: cobbles from the door to the alley's mouth, where the sky builder takes over. */
  street: [9.2, 26.0] as [number, number],
  /** The houses across the street: their fronts stand this far back (drawn behind the street). */
  across: -12,
  /** The workroom's window (x0, x1, top, sill): the music box stands on its sill. */
  window: [-1.85, -1.0, -2.95, -1.35] as [number, number, number, number],
  /** The workbench (x0, x1, top). */
  bench: [1.35, 4.05, -0.72] as [number, number, number],
  /** The cheval mirror by the door (x0, x1, the glass's top). */
  mirror: [7.55, 8.3, -1.75] as [number, number, number],
  /** Where the shop's lamp hangs: its shade's rim. */
  lamp: [5.6, -2.25] as Pt,
}

/** Where the night leg (the curse) starts in the town: Sophie at rest at the counter's right end. */
export const CURSE_AT: Pt = [6.55, 0]
/** Where the war leg (the raid) starts: just outside the shop's door, on the street. */
export const RAID_AT: Pt = [9.4, 0]

/* ------------------------------------------------------------------ the clock of the set */

/** The dawn: the shop dark at the first note, the light full by the theme's second phrase. */
const DAWN: [number, number] = [0, 16]

/**
 * The street's shutters, opened as Sophie passes on her way to the alley, each on a strong note of the theme's last
 * phrases: the town waking. `house` is the index in `HOUSES`, `win` the window. The shop part strikes these.
 */
export const WAKE: { t: number; house: number; win: number }[] = [
  { t: 28.177, house: 0, win: 1 },
  { t: 29.681, house: 1, win: 1 },
  { t: 31.242, house: 2, win: 1 },
  { t: 32.287, house: 3, win: 0 },
  { t: 32.821, house: 3, win: 1 },
  { t: 33.884, house: 4, win: 0 },
  { t: 34.975, house: 4, win: 2 },
  { t: 35.84, house: 5, win: 0 },
  { t: 36.966, house: 5, win: 1 },
]

/** The sky's light at show time `t`: dawn into morning, noon, night, war. `dark` 0 day .. 1 night; `war` the fires' share. */
export function skyAt(t: number): { top: string; low: string; dark: number; war: number } {
  if (t < SEAM.curse) {
    // Before the sun: violet over a peach band; then the morning; then, over the alley's first minute, the noon.
    const u = smooth(t, DAWN[0], DAWN[1])
    const v = smooth(t, 20, 60)
    const top0 = mixHex(TOWN.nightHigh, TOWN.rose, 0.32)
    const top1 = mixHex(TOWN.day, TOWN.rose, 0.18)
    const low0 = mixHex(TOWN.dusk, TOWN.rose, 0.3)
    const top = mixHex(mixHex(top0, top1, u), '#9FC6E0', v)
    const low = mixHex(mixHex(low0, TOWN.dawn, u), TOWN.day, v)
    return { top, low, dark: 0.8 * (1 - u), war: 0 }
  }
  if (t < 150) return { top: TOWN.nightHigh, low: TOWN.night, dark: 1, war: 0 }
  return { top: TOWN.nightHigh, low: mixHex(TOWN.night, TOWN.ember, 0.35), dark: 1, war: 1 }
}

/** How lit the shop's inside is: dark before the dawn, lit by the morning, lamp-dim at night. 0..1. */
export function shopLight(t: number): number {
  if (t < SEAM.curse) return 0.1 + 0.9 * smooth(t, 0.4, 13)
  // The war: the shop's lamp goes out with the town's blackout (the last house's light, 210.814), and the shop stands
  // dark, its workroom shut away in the night, until she comes back in.
  if (t > 200) return 0.2 * (1 - smooth(t, 210.6, 211.3))
  return 0.2
}

/** The war's blackout for the shop's own house: its windows go dark on the build's bar 8 with the street's. */
const blackedOut = (t: number): boolean => t >= 210.814 && t < 240

/** The door's openings: [opens from, open at, shuts from, shut at]. The morning, the curse (the Witch, then Sophie), the war. */
const OPENINGS: [number, number, number, number][] = [
  // The morning: she pushes it open on 27.638 (the bell), it swings shut behind her on 30.203.
  [27.618, 27.95, 29.2, 30.203],
  // The curse: it swings open by itself on the bell (w41), stays open while the Witch squeezes in and out, and
  // Sophie goes out through it.
  [94.645, 95.4, 108.4, 109],
  // The war: out of it on 205.38 (the build's strong note), and back in on 235.50 (the return's).
  [205.38, 205.75, SEAM.raid + 0.8, SEAM.raid + 1.6],
  [235.503, 236.1, SEAM.hearth - 0.3, SEAM.hearth + 0.2],
]

/** How open the shop's door is at show time `t`, 0 shut .. 1 wide (out at the end of the morning, at the curse, in the war). */
export function doorAt(t: number): number {
  let v = 0
  for (const [a, b, c, d] of OPENINGS) {
    if (t <= a || t >= d) continue
    v = Math.max(v, t < b ? smooth(t, a, b) : t < c ? 1 : 1 - smooth(t, c, d))
  }
  return v
}

/** The bell over the door: it swings when the door opens, and rings down slowly. Radians. */
export function bellAt(t: number): number {
  let a = 0
  for (const [open] of OPENINGS) {
    const s = t - open
    if (s < 0 || s > 6) continue
    a += 0.55 * Math.exp(-s / 1.1) * Math.sin(s * 9.5) * (1 - Math.exp(-s / 0.04))
  }
  return a
}

/**
 * The shop's display carousel by the counter (the window's carousel): a brass pole on a round plinth, three arms of
 * hats turning slowly all day. At closing, Sophie's weight on its pedal (88.33) brakes it a step on each of three
 * downbeats and it folds its arms down for the night (92.42): the curse part strikes these.
 */
export const DISPLAY = { x: 6.95, arms: [-0.98, -1.34, -1.7], top: -2.02, reach: 0.34 }
export const DISPLAY_ON = 88.329
export const DISPLAY_BRAKE = [89.101, 90.175, 91.307]
export const DISPLAY_FOLD = 92.415
const SPIN = 0.5
/** How far round it has turned at `t`: a steady turn, slowed a third on each brake, stopped on the last. */
export function displayTurn(t: number): number {
  const [b0, b1, b2] = DISPLAY_BRAKE
  if (t < b0) return SPIN * t
  let a = SPIN * b0
  a += (SPIN * 2) / 3 * (Math.min(t, b1) - b0)
  if (t > b1) a += (SPIN / 3) * (Math.min(t, b2) - b1)
  if (t > b2) a += 0.04 * Math.sin(Math.min(t - b2, 0.6) * 9) * Math.exp(-(t - b2) / 0.18)
  return a
}
/** Its arms folded down: 0 out, 1 down (for the night, and on through the war). */
export function displayFold(t: number): number {
  if (t < DISPLAY_FOLD) return 0
  const s = t - DISPLAY_FOLD
  return Math.min(1, 1 - Math.exp(-s / 0.09) * (1 + s / 0.09)) - 0.04 * Math.exp(-s / 0.25) * Math.sin(s * 14)
}
/** Its pedal, under her weight from when she steps on it until she steps off (0 up, 1 down). */
export const displayPedal = (t: number): number => smooth(t, DISPLAY_ON - 0.05, DISPLAY_ON + 0.08) * (1 - smooth(t, DISPLAY_FOLD + 0.1, DISPLAY_FOLD + 0.5))

/* ------------------------------------------------------------------ light and softness */

/** `#rrggbb` with an alpha, as a CSS colour. */
export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** A soft round volume (smoke, steam, a gust): dense at its middle, gone at its edge. Never outlined. */
export function soft(p: p5, k: number, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
  g.addColorStop(0, hexA(hex, a))
  g.addColorStop(0.55, hexA(hex, a * 0.6))
  g.addColorStop(1, hexA(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
}

/** Light: a soft disc added onto what is under it. */
export function glow(p: p5, k: number, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  soft(p, k, x, y, r, hex, a)
  ctx.restore()
}

/** A shaft of light from a window: a quad from the opening's edge (a0, a1) to where it lands (b0, b1), fading. Added. */
export function shaft(p: p5, k: number, a0: Pt, a1: Pt, b0: Pt, b1: Pt, hex: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const mid = (u: Pt, v: Pt): Pt => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2]
  const from = mid(a0, a1)
  const to = mid(b0, b1)
  const g = ctx.createLinearGradient(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
  g.addColorStop(0, hexA(hex, a))
  g.addColorStop(1, hexA(hex, a * 0.15))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(a0[0] * k, a0[1] * k)
  ctx.lineTo(a1[0] * k, a1[1] * k)
  ctx.lineTo(b1[0] * k, b1[1] * k)
  ctx.lineTo(b0[0] * k, b0[1] * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the houses */

export interface Win {
  /** The opening: left, top, width, height. */
  x: number
  y: number
  w: number
  h: number
}
export interface House {
  x0: number
  w: number
  /** Floor lines, bottom up: the ground at 0.13, each upper floor's sill; the last is the eaves. */
  floors: number[]
  /** The ridge over the eaves. */
  ridge: number
  wall: string
  /** Upper windows (with shutters): the street's waking opens some of them. */
  wins: Win[]
  /** A door on the ground floor, its left edge. */
  door: number
  /** A chimney's x, or null. */
  chimney: number | null
  dormer: boolean
}

const G = TOWN_AT.ground
const WALLS = [
  mixHex(TOWN.plaster, TOWN.gold, 0.32),
  mixHex(TOWN.plaster, TOWN.rose, 0.55),
  mixHex(TOWN.plaster, TOWN.canal, 0.5),
  mixHex(TOWN.plaster, TOWN.shutter, 0.42),
  TOWN.plaster,
  mixHex(TOWN.plaster, TOWN.rose, 0.3),
]

function makeHouse(i: number, x0: number, w: number, storeys: number): House {
  const floors = [G, G - 3.05]
  for (let s = 1; s < storeys; s++) floors.push(floors[floors.length - 1] - 2.55)
  const eaves = floors[floors.length - 1]
  const wins: Win[] = []
  const bays = w > 2.8 ? 3 : 2
  for (let s = 1; s < floors.length - 1; s++) {
    const y1 = floors[s] - 0.55
    for (let b = 0; b < bays; b++) {
      const cx = x0 + (w * (b + 0.5)) / bays
      wins.push({ x: cx - 0.3, y: y1 - 1.35, w: 0.6, h: 1.35 })
    }
  }
  return {
    x0,
    w,
    floors,
    ridge: eaves - w * (0.78 + 0.18 * hash(i, 2)),
    wall: WALLS[i % WALLS.length],
    wins,
    door: x0 + w * (0.25 + 0.4 * hash(i, 7)) - 0.4,
    chimney: hash(i, 9) > 0.35 ? x0 + w * (0.25 + 0.5 * hash(i, 11)) : null,
    dormer: w > 2.6,
  }
}

/** The houses across the street, left to right from the shop's door to the alley's mouth (x = 26). */
export const HOUSES: House[] = (() => {
  const widths = [2.9, 2.5, 3.3, 2.7, 3.0, 2.4]
  const storeys = [2, 3, 2, 3, 2, 3]
  const out: House[] = []
  let x = TOWN_AT.street[0]
  widths.forEach((w, i) => {
    out.push(makeHouse(i, x, w, storeys[i]))
    x += w
  })
  return out
})()
/** The houses to the left of the shop (only seen at the show's first moments, and wide). */
const WEST: House[] = [makeHouse(7, -5.0, 2.6, 2), makeHouse(8, -7.9, 2.9, 3)]

/** How open a shutter of `HOUSES[h]`'s window `w` is at `t`: 1 folded back against the wall, 0 shut over the glass. */
export function shutterAt(h: number, w: number, t: number): number {
  if (t >= SEAM.curse) return 1
  const wake = WAKE.find((q) => q.house === h && q.win === w)
  if (!wake) return hash(h, w, 3) > 0.8 ? 1 : 0
  const s = t - (wake.t - 0.3)
  if (s <= 0) return 0
  // Pushed open from inside: out to the wall on the hit, then the leaf knocks against the wall and settles.
  const out = s < 0.3 ? Math.pow(s / 0.3, 2) : 1
  const settle = s >= 0.3 ? 0.08 * Math.exp(-(s - 0.3) / 0.35) * Math.abs(Math.sin((s - 0.3) * 11)) : 0
  return Math.max(0, Math.min(1, out - settle))
}

/* ------------------------------------------------------------------ the set */

type Tone = (hex: string) => string

/** How a colour inside the shop looks at `t`: sunk into the dark before the dawn and at night. For the parts in the shop. */
export function inside(t: number): Tone {
  return toner(t).inTone
}
/** How a colour outside (the street, the houses) looks at `t`. */
export function outside(t: number): Tone {
  return toner(t).tone
}

/** The light in the town at `t`: how the outside and the shop's inside sink into the dark. */
function toner(t: number): { tone: Tone; inTone: Tone; night: boolean } {
  const sky = skyAt(t)
  const shade = mixHex(TOWN.night, '#3A3052', 0.35)
  const tone: Tone = (hex) => mixHex(hex, shade, sky.dark * 0.68)
  const inside = shopLight(t)
  const deep = t >= SEAM.curse ? TOWN.night : shade
  const inTone: Tone = (hex) => mixHex(hex, deep, (1 - inside) * 0.8)
  // Windows light up at night, never at dawn (the town is asleep until Sophie passes).
  return { tone, inTone, night: sky.dark > 0.5 && t >= SEAM.curse - 1 }
}

export const town = scenery<null>({
  name: 'town',
  draw: (p, _s, c) => {
    const { k, weight: W, ink, t } = c
    const f = frame(p, k)
    const sky = skyAt(t)
    const { tone, inTone, night } = toner(t)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    p.push()
    p.rectMode(p.CORNER)

    // The sky: a gradient over the whole frame.
    const g = ctx.createLinearGradient(0, Math.min(f.y0, -14) * k, 0, (G + 1) * k)
    g.addColorStop(0, sky.top)
    g.addColorStop(1, sky.low)
    ctx.fillStyle = g
    ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    // The sun's warmth low in the east at dawn: a soft band over the roofs.
    if (t < SEAM.alley + 2) glow(p, k, 12, -9, 16, TOWN.glow, 0.22 * smooth(t, 1, 9) * (1 - smooth(t, 30, 44)))

    const mine = t < SEAM.alley + 3 || (t >= SEAM.curse - 0.5 && t < 150) || t >= 200
    if (mine) {
      // The far town: roofs and the church's tower, pale with distance, a little parallax.
      drawFar(p, k, f, tone, night)
      // The houses across the street, and the ones to the west of the shop.
      for (let i = 0; i < HOUSES.length; i++) drawHouse(p, k, W, ink, HOUSES[i], i, t, tone, night)
      for (const h of WEST) drawHouse(p, k, W, ink, h, -1, t, tone, night)
    }

    // The ground: cobbles in the street, the shop's boards, the stone under both.
    drawGround(p, k, W, ink, f, tone, inTone)

    // The hat shop and its house.
    drawShop(p, k, W, ink, t, tone, inTone, night)

    // The war's glow on the street, low and red.
    if (sky.war > 0) {
      const w = ctx.createLinearGradient(0, (G - 8) * k, 0, G * k)
      w.addColorStop(0, 'rgba(240, 120, 50, 0)')
      w.addColorStop(1, `rgba(240, 120, 50, ${0.18 + 0.08 * Math.sin(t * 5)})`)
      ctx.fillStyle = w
      ctx.fillRect(f.x0 * k, (G - 8) * k, (f.x1 - f.x0) * k, 8 * k)
    }
    p.pop()
  },
})

/* --------------------------------------------- the far town */

function drawFar(p: p5, k: number, f: ReturnType<typeof frame>, tone: Tone, night: boolean): void {
  // The far roofs sit behind the street's houses and move with 0.4 of the camera, so they fall behind as it pans.
  const ox = f.cx * 0.4
  const far = mixHex(mixHex(TOWN.slate, TOWN.day, 0.55), TOWN.rose, 0.12)
  p.noStroke()
  p.fill(tone(far))
  const y0 = -6.0
  for (let i = -8; i < 18; i++) {
    const x = i * 2.1 + ox + hash(i, 21) * 0.6
    if (x > TOWN_AT.street[1] - 1.5 || x < -16) continue
    const h = 1.6 + hash(i, 22) * 2.4
    const w = 1.7 + hash(i, 23) * 0.9
    p.rect(x * k, (y0 - h) * k, w * k, (h + 6) * k)
    p.triangle((x - 0.1) * k, (y0 - h) * k, (x + w + 0.1) * k, (y0 - h) * k, (x + w / 2) * k, (y0 - h - w * 0.7) * k)
  }
  // The church: a tall tower with a pointed spire, far off over the street.
  const cx = 17.5 + ox
  if (cx < TOWN_AT.street[1] - 1) {
    p.fill(tone(mixHex(far, TOWN.slateDark, 0.25)))
    p.rect((cx - 0.6) * k, -12.5 * k, 1.2 * k, 8 * k)
    p.triangle((cx - 0.75) * k, -12.5 * k, (cx + 0.75) * k, -12.5 * k, cx * k, -16.6 * k)
    p.fill(night ? TOWN.glow : tone(mixHex(far, TOWN.night, 0.3)))
    p.rect((cx - 0.18) * k, -11.6 * k, 0.36 * k, 0.7 * k)
  }
}

/* --------------------------------------------- a house front */

function drawHouse(p: p5, k: number, W: number, ink: string, h: House, index: number, t: number, tone: Tone, night: boolean): void {
  const X = (v: number) => v * k
  const eaves = h.floors[h.floors.length - 1]
  const x1 = h.x0 + h.w
  // The roof first: steep slate, the ridge over the middle.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(TOWN.slate))
  p.beginShape()
  p.vertex(X(h.x0 - 0.25), X(eaves + 0.05))
  p.vertex(X(h.x0 + h.w * 0.5), X(h.ridge))
  p.vertex(X(x1 + 0.25), X(eaves + 0.05))
  p.endShape(p.CLOSE)
  // Slate courses: a few soft lines across the roof, short of its edges.
  p.stroke(alpha(p, ink, 0.18))
  p.strokeWeight(W * 0.45)
  for (let r = 1; r < 5; r++) {
    const y = eaves + ((h.ridge - eaves) * r) / 5
    const half = (h.w / 2 + 0.25) * (1 - r / 5)
    p.line(X(h.x0 + h.w / 2 - half + 0.15), X(y), X(h.x0 + h.w / 2 + half - 0.15), X(y))
  }
  // A dormer in the roof.
  if (h.dormer) {
    const dx = h.x0 + h.w * 0.5
    const dy = eaves + (h.ridge - eaves) * 0.42
    p.stroke(ink)
    p.strokeWeight(W * 0.7)
    p.fill(tone(h.wall))
    p.rect(X(dx - 0.32), X(dy - 0.1), X(0.64), X(0.7))
    p.fill(night ? TOWN.glow : tone(mixHex(TOWN.slateDark, TOWN.canal, 0.3)))
    p.rect(X(dx - 0.18), X(dy + 0.05), X(0.36), X(0.45))
    p.fill(tone(TOWN.slateDark))
    p.triangle(X(dx - 0.42), X(dy - 0.08), X(dx + 0.42), X(dy - 0.08), X(dx), X(dy - 0.55))
  }
  // The chimney, and its smoke: soft, slow, the morning's fires.
  if (h.chimney !== null) {
    const cx = h.chimney
    const u = (cx - h.x0) / h.w
    const roofY = eaves + (h.ridge - eaves) * (1 - Math.abs(u - 0.5) * 2)
    p.stroke(ink)
    p.strokeWeight(W * 0.7)
    p.fill(tone(mixHex(TOWN.rose, TOWN.timber, 0.35)))
    p.rect(X(cx - 0.18), X(roofY - 1.0), X(0.36), X(1.3))
    p.fill(tone(TOWN.timberDark))
    p.rect(X(cx - 0.24), X(roofY - 1.08), X(0.48), X(0.12))
    smoke(p, k, cx, roofY - 1.1, t, index + 3, tone, night)
  }
  // The walls, floor by floor, each jettied a little over the one below.
  for (let s = 0; s < h.floors.length - 1; s++) {
    const yb = h.floors[s]
    const yt = h.floors[s + 1]
    const jut = s * 0.1
    p.stroke(ink)
    p.strokeWeight(W * 0.85)
    p.fill(tone(s === 0 ? mixHex(h.wall, TOWN.plasterShade, 0.35) : h.wall))
    p.rect(X(h.x0 - jut), X(yt), X(h.w + 2 * jut), X(yb - yt))
    if (s > 0) timbers(p, k, h.x0 - jut, x1 + jut, yt, yb, index * 5 + s, tone)
    // The floor's beam, a heavy line under the jetty.
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.fill(tone(TOWN.timber))
    p.rect(X(h.x0 - jut - 0.04), X(yt - 0.02), X(h.w + 2 * jut + 0.08), X(0.14))
  }
  // The ground floor's door: an arched plank door.
  const d = h.door
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(TOWN.timberDark))
  p.beginShape()
  p.vertex(X(d), X(G))
  p.vertex(X(d), X(G - 1.75))
  p.bezierVertex(X(d), X(G - 2.2), X(d + 0.8), X(G - 2.2), X(d + 0.8), X(G - 1.75))
  p.vertex(X(d + 0.8), X(G))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.4))
  p.strokeWeight(W * 0.5)
  p.line(X(d + 0.4), X(G - 1.95), X(d + 0.4), X(G - 0.05))
  // A window beside the door on the ground floor.
  const gx = d > h.x0 + h.w / 2 ? h.x0 + 0.35 : h.x0 + h.w - 1.05
  if (gx + 0.7 < x1 && gx > h.x0) window(p, k, W, ink, { x: gx, y: G - 2.1, w: 0.7, h: 1.2 }, 1, night && hash(index + 30, 1) > 0.4, tone, false)
  // The upper windows: shutters, and a box of flowers under each.
  h.wins.forEach((win, j) => window(p, k, W, ink, win, index >= 0 ? shutterAt(index, j, t) : 1, night && hash(index + 20, j) > 0.3, tone, true))
}

/** The timber framing of an upper floor: posts at the corners, a rail, and braces in the end panels. */
function timbers(p: p5, k: number, x0: number, x1: number, yt: number, yb: number, seed: number, tone: Tone): void {
  const X = (v: number) => v * k
  p.stroke(tone(TOWN.timber))
  p.strokeCap(p.SQUARE)
  const beam = 0.09
  p.strokeWeight(beam * k)
  p.line(X(x0 + beam / 2), X(yt), X(x0 + beam / 2), X(yb))
  p.line(X(x1 - beam / 2), X(yt), X(x1 - beam / 2), X(yb))
  const rail = yb - 0.45
  p.line(X(x0), X(rail), X(x1), X(rail))
  // Braces: a pair of diagonals in the two end panels, leaning out like arms (the Alsatian "man").
  p.strokeWeight(beam * 0.8 * k)
  const dx = Math.min(0.55, (x1 - x0) * 0.16)
  p.line(X(x0 + 0.05), X(rail), X(x0 + dx), X(yt + 0.1))
  p.line(X(x1 - 0.05), X(rail), X(x1 - dx), X(yt + 0.1))
  if (hash(seed, 3) > 0.4) {
    p.line(X(x0 + 0.05), X(yt + 0.25), X(x0 + dx), X(rail))
    p.line(X(x1 - 0.05), X(yt + 0.25), X(x1 - dx), X(rail))
  }
  p.strokeCap(p.ROUND)
}

/** A window with its frame, glass (lit at night), two shutters (1 folded open, 0 shut over it) and a box of flowers. */
function window(p: p5, k: number, W: number, ink: string, w: Win, open: number, lit: boolean, tone: Tone, box: boolean): void {
  const X = (v: number) => v * k
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(tone(TOWN.timber))
  p.rect(X(w.x - 0.06), X(w.y - 0.06), X(w.w + 0.12), X(w.h + 0.12))
  p.fill(lit ? TOWN.glow : tone(mixHex(TOWN.slateDark, TOWN.canal, 0.25)))
  p.rect(X(w.x), X(w.y), X(w.w), X(w.h))
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(W * 0.45)
  p.line(X(w.x + w.w / 2), X(w.y), X(w.x + w.w / 2), X(w.y + w.h))
  p.line(X(w.x), X(w.y + w.h * 0.45), X(w.x + w.w), X(w.y + w.h * 0.45))
  // The shutters: each leaf hinged at the window's side, swinging from over the glass (0) to flat against the wall (1).
  const leaf = w.w / 2
  for (const side of [-1, 1]) {
    const hinge = side < 0 ? w.x : w.x + w.w
    // Seen from the front, a leaf turning on its hinge narrows to an edge at a right angle, then opens out on the wall.
    const reach = Math.cos(open * Math.PI) * leaf
    const edge = hinge - side * reach
    const lo = Math.min(hinge, edge)
    const wd = Math.abs(hinge - edge)
    p.stroke(ink)
    p.strokeWeight(W * 0.65)
    p.fill(tone(TOWN.shutter))
    if (wd > 0.015) {
      p.rect(X(lo), X(w.y), X(wd), X(w.h))
      p.stroke(alpha(p, ink, 0.35))
      p.strokeWeight(W * 0.45)
      for (let r = 1; r < 4; r++) p.line(X(lo + 0.03), X(w.y + (w.h * r) / 4), X(lo + wd - 0.03), X(w.y + (w.h * r) / 4))
    } else p.line(X(hinge), X(w.y), X(hinge), X(w.y + w.h))
  }
  if (!box) return
  // The window box, and its flowers in clusters of different sizes.
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(tone(TOWN.timberDark))
  p.rect(X(w.x - 0.1), X(w.y + w.h + 0.02), X(w.w + 0.2), X(0.16))
  p.noStroke()
  const cols = [TOWN.ribbon, TOWN.rose, TOWN.gold, TOWN.ribbon]
  for (let i = 0; i < 7; i++) {
    const fx = w.x - 0.04 + ((w.w + 0.08) * (i + 0.5)) / 7 + (hash(i, Math.round(w.x * 10)) - 0.5) * 0.05
    const fy = w.y + w.h - hash(i, Math.round(w.y * 10)) * 0.1
    p.fill(tone(TOWN.moss))
    p.circle(X(fx), X(fy + 0.04), X(0.1 + 0.05 * hash(i, 3)))
    p.fill(tone(cols[(((i + Math.floor(w.x)) % cols.length) + cols.length) % cols.length]))
    p.circle(X(fx + 0.02), X(fy - 0.02), X(0.05 + 0.06 * hash(i, 5, Math.round(w.x))))
  }
}

/** Chimney smoke: a few soft puffs rising and drifting east, the morning's fires (and a thread at night). */
function smoke(p: p5, k: number, x: number, y: number, t: number, seed: number, tone: Tone, night: boolean): void {
  const n = 6
  const col = tone(mixHex(TOWN.plaster, TOWN.slate, 0.25))
  for (let i = 0; i < n; i++) {
    const life = 7
    const age = ((((t + seed * 1.7) / life + i / n) % 1) + 1) % 1
    const r = 0.25 + age * 1.1
    const a = (night ? 0.08 : 0.22) * Math.sin(Math.PI * Math.min(1, age * 1.4)) * (1 - age)
    soft(p, k, x + age * 2.2 + Math.sin(t * 0.6 + i + seed) * 0.15, y - age * 3.2, r, col, a)
  }
}

/* --------------------------------------------- the ground */

function drawGround(p: p5, k: number, W: number, ink: string, f: ReturnType<typeof frame>, tone: Tone, inTone: Tone): void {
  const X = (v: number) => v * k
  const [s0] = TOWN_AT.shop
  const wallL = s0 - 0.4
  const inside1 = TOWN_AT.wall[1]
  // Under everything: the stone the town stands on, in courses, sinking into shadow.
  p.noStroke()
  const deep = Math.max(1, f.y1 - G)
  const stone = tone(mixHex(TOWN.cobbleDark, TOWN.night, 0.3))
  p.fill(stone)
  p.rect(X(f.x0 - 1), X(G + 0.5), X(f.x1 - f.x0 + 2), X(deep))
  p.fill(tone(mixHex(TOWN.cobbleDark, TOWN.night, 0.42)))
  for (let r = 0; r < 6; r++) {
    const y = G + 0.5 + r * 0.34
    if (y > f.y1) break
    const off = (r % 2) * 0.45
    for (let x = Math.floor((f.x0 - 1) / 0.9) * 0.9 + off; x < f.x1 + 1; x += 0.9) p.rect(X(x), X(y + 0.3), X(0.86), X(0.035))
  }
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(G + 0.5), 0, X(G + 0.5 + Math.min(deep, 3)))
  g.addColorStop(0, hexA(TOWN.night, 0))
  g.addColorStop(1, hexA(TOWN.night, 0.45))
  ctx.fillStyle = g
  ctx.fillRect(X(f.x0 - 1), X(G + 0.5), X(f.x1 - f.x0 + 2), X(deep))
  // The street's cobbles: a band seen a little from above, stones in soft rows, no ink but the kerb's edge.
  const sx0 = Math.max(f.x0 - 1, inside1)
  const sx1 = f.x1 + 1
  if (sx1 > sx0) {
    p.fill(tone(TOWN.cobble))
    p.rect(X(sx0), X(G), X(sx1 - sx0), X(0.5))
    for (let row = 0; row < 3; row++) {
      const y = G + 0.07 + row * 0.15
      const sz = 0.2 + row * 0.03
      for (let x = Math.floor(sx0 / sz) * sz; x < sx1; x += sz) {
        const j = Math.round(x / sz)
        p.fill(tone(mixHex(TOWN.cobble, TOWN.cobbleDark, 0.25 + 0.45 * hash(j, row, 5))))
        p.rect(X(x + 0.02 + (row % 2) * sz * 0.5), X(y), X(sz - 0.04), X(0.1 + row * 0.01), X(0.03))
      }
    }
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.line(X(sx0), X(G), X(sx1), X(G))
  }
  // West of the shop: the neighbour's cobbles.
  if (f.x0 < wallL) {
    p.noStroke()
    p.fill(tone(TOWN.cobble))
    p.rect(X(f.x0 - 1), X(G), X(wallL - f.x0 + 1), X(0.5))
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.line(X(f.x0 - 1), X(G), X(wallL), X(G))
  }
  // The shop's floor: boards in the cut, the joists under them, and the cellar's dark below.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(inTone(TOWN.timber))
  p.rect(X(wallL), X(G), X(inside1 - wallL), X(0.2))
  p.noStroke()
  p.fill(inTone(mixHex(TOWN.timberDark, TOWN.night, 0.5)))
  p.rect(X(wallL), X(G + 0.2), X(inside1 - wallL), X(0.3))
  p.fill(inTone(TOWN.timberDark))
  for (let x = wallL + 0.3; x < inside1 - 0.2; x += 0.9) p.rect(X(x), X(G + 0.2), X(0.16), X(0.22))
}

/* --------------------------------------------- the hat shop */

function drawShop(p: p5, k: number, W: number, ink: string, t: number, tone: Tone, inTone: Tone, night: boolean): void {
  const X = (v: number) => v * k
  const A = TOWN_AT
  const [s0, s1] = A.shop
  const wallL0 = s0 - 0.4
  const [w0, w1] = A.wall
  const beamTop = A.ceil - 0.32
  const ctx = p.drawingContext as CanvasRenderingContext2D

  // The house over the shop: two jettied storeys of timber and plaster, and the roof.
  const x0 = wallL0
  const hw = w1 - wallL0
  const floors = [beamTop, beamTop - 2.85, beamTop - 5.6]
  const eaves = floors[2]
  const ridge = eaves - 5.4
  const wall = mixHex(TOWN.plaster, TOWN.rose, 0.18)
  // The roof: a big steep slate roof with two dormers and the chimney.
  p.stroke(ink)
  p.strokeWeight(W * 0.85)
  p.fill(tone(TOWN.slate))
  p.beginShape()
  p.vertex(X(x0 - 0.4), X(eaves + 0.1))
  p.vertex(X(x0 + hw * 0.5), X(ridge))
  p.vertex(X(x0 + hw + 0.4), X(eaves + 0.1))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.18))
  p.strokeWeight(W * 0.45)
  for (let r = 1; r < 7; r++) {
    const y = eaves + ((ridge - eaves) * r) / 7
    const half = (hw / 2 + 0.4) * (1 - r / 7)
    p.line(X(x0 + hw / 2 - half + 0.2), X(y), X(x0 + hw / 2 + half - 0.2), X(y))
  }
  for (const dx of [0.28, 0.72]) {
    const cx = x0 + hw * dx
    const dy = eaves - 1.6
    p.stroke(ink)
    p.strokeWeight(W * 0.75)
    p.fill(tone(wall))
    p.rect(X(cx - 0.5), X(dy), X(1.0), X(1.1))
    p.fill(night && !blackedOut(t) ? TOWN.glow : tone(mixHex(TOWN.slateDark, TOWN.canal, 0.3)))
    p.rect(X(cx - 0.28), X(dy + 0.2), X(0.56), X(0.72))
    p.fill(tone(TOWN.slateDark))
    p.triangle(X(cx - 0.65), X(dy + 0.02), X(cx + 0.65), X(dy + 0.02), X(cx), X(dy - 0.7))
  }
  const chx = x0 + hw * 0.2
  const chy = eaves - (ridge - eaves) * -0.4
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(mixHex(TOWN.rose, TOWN.timber, 0.35)))
  p.rect(X(chx - 0.25), X(chy - 1.6), X(0.5), X(1.8))
  p.fill(tone(TOWN.timberDark))
  p.rect(X(chx - 0.32), X(chy - 1.7), X(0.64), X(0.14))
  smoke(p, k, chx, chy - 1.75, t, 1, tone, night)
  // The two storeys.
  for (let s = 0; s < 2; s++) {
    const yb = floors[s]
    const yt = floors[s + 1]
    const jut = 0.12 * (s + 1)
    p.stroke(ink)
    p.strokeWeight(W * 0.85)
    p.fill(tone(wall))
    p.rect(X(x0 - jut), X(yt), X(hw + 2 * jut), X(yb - yt))
    timbers(p, k, x0 - jut, x0 + hw + jut, yt, yb, 40 + s, tone)
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.fill(tone(TOWN.timber))
    p.rect(X(x0 - jut - 0.05), X(yt - 0.02), X(hw + 2 * jut + 0.1), X(0.16))
    const bays = 4
    for (let b = 0; b < bays; b++) {
      const cx = x0 + (hw * (b + 0.5)) / bays
      window(p, k, W, ink, { x: cx - 0.34, y: yb - 2.0, w: 0.68, h: 1.35 }, 1, night && !blackedOut(t) && (b + s) % 2 === 0, tone, true)
    }
  }

  // Inside the shop: the back wall, a wainscot, lit by the dawn or the lamp.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(inTone(mixHex(TOWN.plaster, TOWN.gold, 0.12)))
  p.rect(X(s0), X(A.ceil), X(s1 - s0), X(G - A.ceil))
  p.noStroke()
  p.fill(inTone(mixHex(TOWN.timber, TOWN.plaster, 0.45)))
  p.rect(X(s0), X(G - 0.95), X(s1 - s0), X(0.95))
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(W * 0.55)
  p.line(X(s0), X(G - 0.95), X(s1), X(G - 0.95))
  for (let x = s0 + 0.55; x < s1; x += 0.8) p.line(X(x), X(G - 0.88), X(x), X(G - 0.06))
  // The ceiling's beam in section, the joists' ends, and the post between the workroom and the shop.
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  p.fill(inTone(TOWN.timber))
  p.rect(X(wallL0), X(beamTop), X(w1 - wallL0), X(A.ceil - beamTop))
  p.fill(inTone(TOWN.timberDark))
  for (let x = s0 + 0.6; x < s1; x += 1.5) p.rect(X(x), X(A.ceil), X(0.22), X(0.14))

  // The workroom's wall: a high shelf of wooden hat blocks, and ribbons hanging from pegs under it.
  const hs = -2.62
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.fill(inTone(TOWN.timber))
  p.rect(X(0.9), X(hs), X(3.0), X(0.07))
  p.fill(inTone(TOWN.timberDark))
  for (const x of [1.1, 3.6]) p.triangle(X(x), X(hs + 0.07), X(x + 0.09), X(hs + 0.07), X(x), X(hs + 0.3))
  const blocks: [number, number, number][] = [[1.25, 0.34, 0.3], [1.72, 0.3, 0.36], [2.2, 0.38, 0.26], [2.72, 0.28, 0.32], [3.2, 0.34, 0.3]]
  blocks.forEach(([x, w, h], i) => {
    p.stroke(ink)
    p.strokeWeight(W * 0.65)
    p.fill(inTone(mixHex(TOWN.timber, TOWN.straw, 0.25 + 0.2 * hash(i, 31))))
    p.rect(X(x - w / 2), X(hs - h), X(w), X(h), X(0.06), X(0.06), X(0.01), X(0.01))
    p.stroke(alpha(p, ink, 0.35))
    p.strokeWeight(W * 0.45)
    p.line(X(x - w / 2 + 0.03), X(hs - h * 0.35), X(x + w / 2 - 0.03), X(hs - h * 0.35))
  })
  const ribbons = [TOWN.ribbon, TOWN.shutter, TOWN.gold, TOWN.felt, TOWN.rose]
  ribbons.forEach((col, i) => {
    const x = 2.98 + i * 0.15
    const len = 0.5 + 0.35 * hash(i, 33)
    p.stroke(ink)
    p.strokeWeight(W * 0.5)
    p.fill(inTone(TOWN.timberDark))
    p.circle(X(x), X(hs + 0.2), X(0.04))
    p.noStroke()
    p.fill(inTone(col))
    p.beginShape()
    p.vertex(X(x - 0.03), X(hs + 0.2))
    p.vertex(X(x + 0.03), X(hs + 0.2))
    p.vertex(X(x + 0.03 + 0.02 * Math.sin(t * 0.7 + i)), X(hs + 0.2 + len))
    p.vertex(X(x + 0.0 + 0.02 * Math.sin(t * 0.7 + i)), X(hs + 0.2 + len - 0.05))
    p.vertex(X(x - 0.03 + 0.02 * Math.sin(t * 0.7 + i)), X(hs + 0.2 + len))
    p.endShape(p.CLOSE)
  })

  // The workroom's window: the dawn outside it, mullions, a deep sill (the music box stands on it).
  const [wx0, wx1, wy0, wy1] = A.window
  const sky = skyAt(t)
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  p.fill(inTone(TOWN.timber))
  p.rect(X(wx0 - 0.1), X(wy0 - 0.1), X(wx1 - wx0 + 0.2), X(wy1 - wy0 + 0.1))
  const view = ctx.createLinearGradient(0, wy0 * k, 0, wy1 * k)
  view.addColorStop(0, sky.top)
  view.addColorStop(1, sky.low)
  ctx.fillStyle = view
  ctx.fillRect(X(wx0), X(wy0), X(wx1 - wx0), X(wy1 - wy0))
  // Through it: the roofs across the yard.
  p.noStroke()
  p.fill(tone(mixHex(TOWN.slate, TOWN.day, 0.35)))
  p.beginShape()
  p.vertex(X(wx0), X(wy1))
  p.vertex(X(wx0), X(wy1 - 0.55))
  p.vertex(X(wx0 + 0.3), X(wy1 - 0.85))
  p.vertex(X(wx0 + 0.55), X(wy1 - 0.6))
  p.vertex(X(wx0 + 0.7), X(wy1 - 0.62))
  p.vertex(X(wx1), X(wy1 - 0.4))
  p.vertex(X(wx1), X(wy1))
  p.endShape(p.CLOSE)
  if (t < SEAM.curse) glow(p, k, wx1 - 0.2, wy1 - 0.5, 0.9, TOWN.glow, 0.35 * smooth(t, 2, 12))
  p.stroke(inTone(TOWN.timber))
  p.strokeWeight(W * 1.2)
  p.line(X((wx0 + wx1) / 2), X(wy0), X((wx0 + wx1) / 2), X(wy1))
  p.line(X(wx0), X((wy0 + wy1) / 2), X(wx1), X((wy0 + wy1) / 2))
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(inTone(TOWN.timberDark))
  p.rect(X(wx0 - 0.22), X(wy1), X(wx1 - wx0 + 0.44), X(0.14))

  // The dawn's light through it, across the workroom (only in the morning).
  if (t < SEAM.alley + 1) {
    const a = 0.2 * smooth(t, 0.5, 8) * (1 - 0.4 * smooth(t, 20, 36))
    shaft(p, k, [wx0, wy0], [wx1, wy1 - 0.1], [wx0 + 3.2, G - 0.6], [wx1 + 4.6, G + 0.05], TOWN.glow, a)
  }

  // The shelves of hats on the shop's back wall, over the counter.
  drawHatShelves(p, k, W, ink, t, inTone)

  // The bench along the workroom's wall.
  const [b0, b1, bt] = A.bench
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  p.fill(inTone(TOWN.timber))
  p.rect(X(b0), X(bt), X(b1 - b0), X(0.13))
  p.fill(inTone(TOWN.timberDark))
  p.rect(X(b0 + 0.05), X(bt + 0.13), X(0.12), X(G - bt - 0.13))
  p.rect(X(b1 - 0.17), X(bt + 0.13), X(0.12), X(G - bt - 0.13))

  // The counter: a panelled front, a top with a lip.
  const [c0, c1, ct] = A.counter
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  p.fill(inTone(mixHex(TOWN.timber, TOWN.rose, 0.12)))
  p.rect(X(c0), X(ct), X(c1 - c0), X(G - ct))
  p.fill(inTone(TOWN.timberDark))
  p.rect(X(c0 - 0.08), X(ct - 0.05), X(c1 - c0 + 0.16), X(0.1))
  p.noFill()
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(W * 0.5)
  const pw = (c1 - c0 - 0.3) / 3
  for (let i = 0; i < 3; i++) p.rect(X(c0 + 0.12 + i * (pw + 0.03)), X(ct + 0.18), X(pw), X(G - ct - 0.34), X(0.03))

  drawDisplay(p, k, W, ink, t, inTone)

  // The cheval mirror by the door: a tall glass in a frame on a stand. The glass shows a cool sheen, never a picture.
  const [m0, m1, mt] = A.mirror
  const mb = G - 0.3
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.line(X(m0 + 0.08), X(G), X(m0 + 0.12), X((mt + mb) / 2))
  p.line(X(m1 - 0.08), X(G), X(m1 - 0.12), X((mt + mb) / 2))
  p.fill(inTone(TOWN.timberDark))
  p.ellipse(X((m0 + m1) / 2), X((mt + mb) / 2), X(m1 - m0 - 0.08), X(mb - mt))
  p.noStroke()
  p.fill(inTone(mixHex(TOWN.canal, TOWN.plaster, 0.4)))
  p.ellipse(X((m0 + m1) / 2), X((mt + mb) / 2), X(m1 - m0 - 0.24), X(mb - mt - 0.16))
  p.fill(alpha(p, TOWN.plaster, night ? 0.12 : 0.3))
  p.beginShape()
  p.vertex(X(m0 + 0.2), X(mt + 0.35))
  p.vertex(X(m0 + 0.36), X(mt + 0.18))
  p.vertex(X(m0 + 0.3), X(mb - 0.5))
  p.vertex(X(m0 + 0.18), X(mb - 0.62))
  p.endShape(p.CLOSE)

  // The lamp's fixture: a brass chain from the ceiling and the lamp's shade (its flame is the night part's).
  const [lx, ly] = A.lamp
  p.stroke(inTone(TOWN.gold))
  p.strokeWeight(W * 0.7)
  p.line(X(lx), X(A.ceil), X(lx), X(ly - 0.3))
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.fill(inTone(mixHex(TOWN.shutter, TOWN.timberDark, 0.3)))
  p.beginShape()
  p.vertex(X(lx - 0.08), X(ly - 0.32))
  p.vertex(X(lx + 0.08), X(ly - 0.32))
  p.vertex(X(lx + 0.34), X(ly - 0.05))
  p.vertex(X(lx - 0.34), X(ly - 0.05))
  p.endShape(p.CLOSE)

  // The cut walls: the left wall in section, and the right wall over the door.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(mixHex(TOWN.plasterShade, TOWN.timber, 0.25)))
  p.rect(X(wallL0), X(A.ceil), X(s0 - wallL0), X(G - A.ceil))
  p.rect(X(w0), X(A.ceil), X(w1 - w0), X(A.doorTop - A.ceil))
  drawDoorway(p, k, W, ink, t, tone, inTone, night)

  // The sign outside, over the door: a wrought bracket and a hat's silhouette in iron, swaying.
  const sway = 0.05 * Math.sin(t * 0.9) + 0.03 * Math.sin(t * 2.1 + 1)
  const bx = w1
  const by = A.ceil + 0.4
  p.stroke(ink)
  p.strokeWeight(W * 1.1)
  p.line(X(bx), X(by), X(bx + 1.25), X(by))
  p.noFill()
  p.strokeWeight(W * 0.8)
  p.bezier(X(bx), X(by + 0.45), X(bx + 0.4), X(by + 0.4), X(bx + 0.6), X(by + 0.1), X(bx + 0.8), X(by))
  p.push()
  p.translate(X(bx + 0.85), X(by))
  p.rotate(sway)
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.line(X(-0.22), 0, X(-0.22), X(0.26))
  p.line(X(0.22), 0, X(0.22), X(0.26))
  p.translate(0, X(0.62))
  hatShape(p, k, W, ink, 0.9, tone(TOWN.timberDark), tone(TOWN.ribbon))
  p.pop()
}

/** The shelves of hats over the counter: felt, straw, ribbon; the morning's light or the night's lamp on them. */
export const HAT_SHELVES: { y: number; x0: number; x1: number; hats: number[] }[] = [
  { y: -2.05, x0: 4.7, x1: 7.0, hats: [4.95, 5.55, 6.2, 6.75] },
  { y: -2.95, x0: 4.7, x1: 7.0, hats: [5.2, 5.85, 6.5] },
]
/** The shelves' hats' colours, in order. */
export const HAT_COLOURS = [TOWN.felt, TOWN.straw, mixHex(TOWN.ribbon, TOWN.plaster, 0.3), TOWN.straw, mixHex(TOWN.felt, TOWN.timber, 0.4), TOWN.rose, TOWN.straw]

/** A hat in elevation, its brim's middle at the origin, `w` across the brim. For the shelves, the hat line, the sign. */
export function hatShape(p: p5, k: number, W: number, ink: string, w: number, body: string, band: string, bow = 0): void {
  const X = (v: number) => v * k
  const b = w / 2
  const cw = w * 0.3
  const ch = w * 0.34
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(body)
  p.beginShape()
  p.vertex(X(-b), X(0.02 * w))
  p.bezierVertex(X(-b), X(-0.04 * w), X(-cw - 0.06 * w), X(-0.05 * w), X(-cw), X(-0.05 * w))
  p.bezierVertex(X(-cw * 1.02), X(-ch * 0.7), X(-cw * 0.8), X(-ch), X(0), X(-ch))
  p.bezierVertex(X(cw * 0.8), X(-ch), X(cw * 1.02), X(-ch * 0.7), X(cw), X(-0.05 * w))
  p.bezierVertex(X(cw + 0.06 * w), X(-0.05 * w), X(b), X(-0.04 * w), X(b), X(0.02 * w))
  p.bezierVertex(X(b * 0.5), X(0.08 * w), X(-b * 0.5), X(0.08 * w), X(-b), X(0.02 * w))
  p.endShape(p.CLOSE)
  if (!band) return
  p.noStroke()
  p.fill(band)
  p.rect(X(-cw), X(-0.16 * w), X(cw * 2), X(0.09 * w))
  if (bow > 0) {
    p.stroke(ink)
    p.strokeWeight(W * 0.5)
    p.fill(band)
    const s = bow * w
    p.triangle(X(cw * 0.55), X(-0.115 * w), X(cw * 0.55 + 0.2 * s), X(-0.2 * w), X(cw * 0.55 + 0.2 * s), X(-0.03 * w))
    p.triangle(X(cw * 0.55), X(-0.115 * w), X(cw * 0.55 - 0.2 * s), X(-0.2 * w), X(cw * 0.55 - 0.2 * s), X(-0.03 * w))
  }
}

/**
 * The Witch's laugh shakes the hats on their shelves: on the accents as she looms and after the curse, some of them
 * jump and settle. These are the recording's accents (the curse part strikes them).
 */
export const LOOM = [99.445, 99.84, 100.241, 100.571, 100.955, 101.309]
export const LAUGH = [102.011, 102.394, 103.143, 103.509, 104.258, 104.618, 105.337, 105.697, 106.429, 106.812]
const SHAKES = [...LOOM, ...LAUGH]
function hatJolt(n: number, t: number): number {
  if (t < LOOM[0] || t > LAUGH[LAUGH.length - 1] + 2) return 0
  let y = 0
  SHAKES.forEach((at, i) => {
    if (hash(n, i, 13) < 0.45) return
    const s = t - at
    if (s < 0 || s > 0.9) return
    // A jump off the shelf and back, damped: up on the accent, down with a small bounce.
    y -= 0.07 * Math.exp(-s / 0.12) * Math.abs(Math.sin(s * 16))
  })
  return y
}
function hatTilt(n: number, t: number): number {
  if (t < LOOM[0] || t > LAUGH[LAUGH.length - 1] + 3) return 0
  let a = 0
  SHAKES.forEach((at, i) => {
    if (hash(n, i, 13) < 0.45) return
    const s = t - at
    if (s < 0 || s > 2) return
    a += 0.12 * (hash(n, i, 17) - 0.5) * Math.exp(-s / 0.4) * Math.cos(s * 12)
  })
  return a
}

function drawHatShelves(p: p5, k: number, W: number, ink: string, t: number, inTone: Tone): void {
  const X = (v: number) => v * k
  let n = 0
  for (const s of HAT_SHELVES) {
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.fill(inTone(TOWN.timber))
    p.rect(X(s.x0), X(s.y), X(s.x1 - s.x0), X(0.09))
    p.fill(inTone(TOWN.timberDark))
    for (const x of [s.x0 + 0.2, s.x1 - 0.3]) p.triangle(X(x), X(s.y + 0.09), X(x + 0.1), X(s.y + 0.09), X(x), X(s.y + 0.35))
    for (const x of s.hats) {
      const col = HAT_COLOURS[n % HAT_COLOURS.length]
      const band = [TOWN.ribbon, TOWN.shutter, TOWN.felt, TOWN.gold][n % 4]
      p.push()
      p.translate(X(x), X(s.y - 0.03 + hatJolt(n, t)))
      p.rotate(hatTilt(n, t))
      hatShape(p, k, W, ink, 0.5 + 0.06 * hash(n, 4), inTone(col), inTone(band))
      p.pop()
      n++
    }
  }
}

/** The display carousel: its plinth, its pedal, the pole, three arms of hats turning round it, folded for the night. */
function drawDisplay(p: p5, k: number, W: number, ink: string, t: number, inTone: Tone): void {
  const X = (v: number) => v * k
  const { x, arms, top, reach } = DISPLAY
  const turn = displayTurn(t)
  const fold = t >= SEAM.curse ? displayFold(t) : 0
  const pedal = displayPedal(t)
  // The pedal, a flat lever out of the plinth's foot to the left.
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.fill(inTone(TOWN.gold))
  p.push()
  p.translate(X(x - 0.2), X(G))
  p.rotate(-0.12 * (1 - pedal))
  p.rect(X(-0.46), X(-0.04), X(0.46), X(0.04), X(0.015))
  p.pop()
  // The plinth: a round of wood, its top seen a little from above.
  p.fill(inTone(TOWN.timberDark))
  p.rect(X(x - 0.3), X(G - 0.16), X(0.6), X(0.16), X(0.03))
  p.fill(inTone(TOWN.timber))
  p.ellipse(X(x), X(G - 0.16), X(0.6), X(0.1))
  // The arms: each a brass rod out from the pole with a hat on a small stand at its end; behind the pole first.
  const n = arms.length
  const items = arms.map((y, i) => {
    const a = turn + (i * Math.PI * 2) / n + i * 0.4
    return { y, a, z: Math.cos(a), i }
  })
  items.sort((u, v) => u.z - v.z)
  const cols = [TOWN.straw, TOWN.felt, mixHex(TOWN.ribbon, TOWN.plaster, 0.35)]
  const drawArm = (it: { y: number; a: number; z: number; i: number }) => {
    const r = reach * (1 - fold)
    const tipX = x + r * Math.sin(it.a)
    const drop = fold * (0.55 - it.i * 0.05)
    const tipY = it.y + drop + 0.04 * it.z * (1 - fold)
    p.stroke(inTone(TOWN.gold))
    p.strokeWeight(X(0.025))
    p.line(X(x), X(it.y), X(tipX), X(tipY))
    p.push()
    p.translate(X(tipX), X(tipY - 0.02))
    hatShape(p, k, W * 0.7, ink, 0.34 + 0.04 * it.z * (1 - fold), inTone(mixHex(cols[it.i], TOWN.night, it.z < 0 ? 0.25 : 0)), inTone(TOWN.ribbon))
    p.pop()
  }
  for (const it of items) if (it.z < 0) drawArm(it)
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(inTone(TOWN.gold))
  p.rect(X(x - 0.03), X(top), X(0.06), X(G - 0.16 - top))
  p.circle(X(x), X(top - 0.03), X(0.08))
  for (const it of items) if (it.z >= 0) drawArm(it)
}

/* --------------------------------------------- the door */

/** The door's leaf where it hangs, for parts that draw on it (the blind): the opening's x0 and x1, its top, its glass. */
export const DOOR_AT = { x0: TOWN_AT.wall[0] + 0.07, x1: TOWN_AT.wall[1] - 0.07, top: TOWN_AT.doorTop, glass: [-1.95, -1.05] as [number, number] }

/** How wide the door's leaf shows at `t`, hinged at its left edge: its full width shut, narrowing as it swings in. */
export const leafAt = (t: number): number => (DOOR_AT.x1 - DOOR_AT.x0) * Math.cos(doorAt(t) * Math.PI * 0.48)

function drawDoorway(p: p5, k: number, W: number, ink: string, t: number, tone: Tone, inTone: Tone, night: boolean): void {
  const X = (v: number) => v * k
  const A = TOWN_AT
  const { x0, x1, top } = DOOR_AT
  // The opening: the street's light (or the night) through it.
  const sky = skyAt(t)
  p.noStroke()
  p.fill(tone(mixHex(sky.low, TOWN.cobble, 0.3)))
  p.rect(X(x0), X(top), X(x1 - x0), X(G - top))
  // The frame: posts and a lintel.
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  p.fill(tone(TOWN.timberDark))
  p.rect(X(A.wall[0]), X(top - 0.12), X(A.wall[1] - A.wall[0]), X(0.14))
  p.rect(X(A.wall[0]), X(top), X(0.07), X(G - top))
  p.rect(X(A.wall[1] - 0.07), X(top), X(0.07), X(G - top))
  // The leaf: hinged at the inside edge, swinging in toward us; it narrows as it opens.
  const lw = leafAt(t)
  if (lw > 0.012) {
    const open = doorAt(t)
    p.stroke(ink)
    p.strokeWeight(W * 0.85)
    p.fill(inTone(mixHex(TOWN.shutter, TOWN.timber, 0.35 + 0.3 * open)))
    p.rect(X(x0), X(top), X(lw), X(G - top))
    // Its glass: the upper panel, the street's light through it.
    const [g0, g1] = DOOR_AT.glass
    p.fill(night ? tone(TOWN.night) : tone(mixHex(sky.low, TOWN.plaster, 0.3)))
    p.rect(X(x0 + lw * 0.16), X(g0), X(lw * 0.68), X(g1 - g0))
    p.noFill()
    p.stroke(alpha(p, ink, 0.4))
    p.strokeWeight(W * 0.5)
    p.rect(X(x0 + lw * 0.16), X(-0.85), X(lw * 0.68), X(0.72))
    // The knob on the free edge.
    if (lw > 0.25) {
      p.noStroke()
      p.fill(inTone(TOWN.gold))
      p.circle(X(x0 + lw - 0.1), X(-1.0), X(0.07))
    }
  }
  // The bell over the door on its curled spring: it swings when the door opens (never a drawn ring).
  const a = bellAt(t)
  const hx = A.wall[0] - 0.14
  const hy = top - 0.35
  p.stroke(inTone(TOWN.timberDark))
  p.strokeWeight(W * 0.9)
  p.noFill()
  p.bezier(X(A.wall[0]), X(hy - 0.1), X(A.wall[0] - 0.1), X(hy - 0.1), X(hx - 0.02), X(hy - 0.12), X(hx), X(hy))
  p.push()
  p.translate(X(hx), X(hy))
  p.rotate(a)
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.line(0, 0, 0, X(0.08))
  p.fill(inTone(TOWN.gold))
  p.beginShape()
  p.vertex(X(-0.05), X(0.08))
  p.bezierVertex(X(-0.07), X(0.13), X(-0.1), X(0.2), X(-0.11), X(0.24))
  p.vertex(X(0.11), X(0.24))
  p.bezierVertex(X(0.1), X(0.2), X(0.07), X(0.13), X(0.05), X(0.08))
  p.endShape(p.CLOSE)
  p.pop()
}

/** The cells the town's scenery claims (it draws wherever the camera goes in the town). */
export const TOWN_BOX = { x0: -30, y0: -60, x1: 170, y1: 12 }
