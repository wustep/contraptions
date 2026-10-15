import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { along, birds, clouds, gust, smoke, type Flight } from '../depth'
import { CARD_ZONE, CREDITS_AT, LAST_GONE, LIFT } from '../credits'
import { AGE } from '../music'
import { HOME, INK } from '../worlds'
import { drawHouse, dusk, snowTone, type Look } from './front-house'
import { drawBeyond, drawFar, farRow, type BeyondLook } from './far'
import { ALONE, CHAIR_LIFT, darkAt, G, HALT, HOUSE, LAMPS, SHOVE, STAR, SWINGS, W } from './front-plan'

/**
 * The front set (the house builder's): the house from the street, the lawn and the pavement, the sky, the mailbox
 * and the street lamps. Standing scenery for the whole show, drawn from show time (`c.t`) in the house world's cells
 * from the set's origin. Seen twice: the fix-up (the derelict clubhouse made new on the waltz, left to right behind
 * the machine's rollers) and the end (the same house fifty years on, faded and patched, at dusk, the lamp lit in the
 * window, the street lamps coming on, the first stars).
 *
 * Round the house, the world: clouds drifting by day, a car going by, birds, the neighbours' trees in the wind and
 * their chimneys smoking at dusk; past them a far ridge with the places of their whole life on it (`far.ts`); and at
 * the frame's foot, nearer than the house, our side of the road, its kerb and verge.
 *
 * What is where, and when, is `front-plan.ts`; the house itself is `front-house.ts`.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const FRONT_BOX: [number, number, number, number] = [-24, -22, 36, 12]

/** The house's condition at T, old or new. */
export function lookAt(T: number, old = false): Look {
  return {
    old,
    age: old ? 0 : AGE(T),
    dark: darkAt(T),
    lamp: T < ALONE.lamp ? 0 : smooth(T, ALONE.lamp, ALONE.lamp + 0.1),
    T,
    snow: settleAt(T),
  }
}

/** From when the bay's frame, the wall by the door and its jambs are drawn by the parts over the two of them (indoors). */
export const FRONT_OVER = 42.0

/** Which chairs stand in the room at T. */
export const chairsIn = (T: number) => ({ carl: T >= CHAIR_LIFT.carl[2], ellie: T >= CHAIR_LIFT.ellie[2] })

type Frame = ReturnType<typeof frame>

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))

/** How far the dusk has gone to one silhouette: 0 by day and as he comes home, 1 at night. */
const duskyAt = (T: number) => clamp01((darkAt(T) - 0.25) / 0.5)

/**
 * The sky: a day's blue for the fix-up; for the end, an evening's warmth low down going to night, and under it, along
 * the horizon behind the street's far trees, the last of the afterglow, which stays warm a little longer than the
 * sky over it and is the last of the day to go.
 */
function skyAt(T: number): { top: string; low: string; glow: string } {
  const d = darkAt(T)
  if (d <= 0) return { top: '#A8CFE3', low: '#DDEDF1', glow: '#E6F1EF' }
  const u = Math.max(0, Math.min(1, (d - 0.3) / 0.52))
  return {
    top: mixHex('#7C86AE', HOME.night, u),
    low: mixHex(HOME.dusk, '#4E5277', Math.pow(u, 0.8)),
    glow: mixHex('#F2C49C', '#6A6189', Math.pow(u, 1.5)),
  }
}

function sky(p: p5, k: number, f: Frame, T: number): void {
  const { top, low, glow } = skyAt(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const y0 = Math.min(f.y0, G)
  const y1 = Math.min(f.y1, G)
  if (y1 <= y0) return
  ctx.save()
  const g = ctx.createLinearGradient(0, -13 * k, 0, G * k)
  g.addColorStop(0, top)
  g.addColorStop(0.62, low)
  g.addColorStop(0.86, glow)
  g.addColorStop(1, glow)
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, y0 * k, (f.x1 - f.x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/**
 * The clouds. By day, fair-weather heaps at two depths drifting on the wind, the far ones keeping nearly with the
 * frame and the near ones sliding by as it pans. At dusk they lie in long low bands along the afterglow, lit warm
 * underneath while the sun's last light is on them, then going dark against the night: low, so the sky the credits
 * are set over is clear.
 */
function cloudsAt(p: p5, k: number, f: Frame, T: number): void {
  const d = darkAt(T)
  if (d <= 0) {
    // (High and thin, for the sky a phone held upright sees over the house.)
    clouds(p, k, f, T, { y0: -30, y1: -15, per: 8, size: 7, speed: 0.07, depth: 0.95, heap: 0.35, body: '#F3F8F8', shade: '#DCE8EC', a: 0.6, seed: 2 })
    clouds(p, k, f, T, { y0: -12, y1: -6, per: 11, size: 4, speed: 0.12, depth: 0.85, body: '#F7FAF9', shade: '#D3E2E8', a: 0.92, seed: 4 })
    clouds(p, k, f, T, { y0: -7.4, y1: -4.6, per: 16, size: 2.2, speed: 0.2, depth: 0.6, body: '#FAFCFB', shade: '#DAE7EB', a: 0.9, seed: 9 })
    return
  }
  const sun = 1 - smooth(d, 0.55, 0.78)
  const dark = mixHex(skyAt(T).low, '#2B3150', 0.55)
  clouds(p, k, f, T, {
    y0: -6.8,
    y1: -4.0,
    per: 16,
    size: 7,
    speed: 0.05,
    depth: 0.9,
    heap: 0.22,
    body: mixHex(dark, '#B49AAE', 0.7 * sun),
    shade: mixHex(dark, '#F0BE98', 0.85 * sun),
    a: 0.75,
    seed: 12,
  })
}

/**
 * The street's far side, along the horizon behind the lawn: the neighbours' roofs among their trees, soft and
 * unlined like the church's far trees, so the house stands in a town and not on a stage. Hazy sage and slate by day;
 * at dusk they go to one silhouette against the afterglow, darker than the sky over them, every window in them dark:
 * the one lit window in the street is his. Their trees stir in the wind; at dusk a few of their chimneys smoke.
 */
const FAR = farRow(-32, 44)
/** The neighbours' chimneys either side of the house that smoke at dusk (the nearest one by day too): their tops. */
const CHIMNEYS: [number, number][] = FAR.filter((b) => !b.tree && b.chimney > 0 && b.x > -3 && b.x < 20).map((b) => {
  const ridge = G - b.h - b.roof
  return [b.x + b.w * 0.18 + 0.09 * b.s, ridge + b.roof * 0.25 - b.chimney]
})

/** The ridge beyond the street, in the light of the hour: hazed toward the sky by day, one silhouette at dusk. */
function beyondLook(T: number): BeyondLook {
  const d = darkAt(T)
  const night = duskyAt(T)
  const { low, glow } = skyAt(T)
  // Farther than the street's far side, so lighter: between its silhouette and the afterglow. In the falling snow it
  // goes hazier still, toward the sky low down.
  const sil = mixHex('#343B57', glow, 0.5)
  const deep = mixHex(sil, '#2A2F47', 0.38)
  const veil = 0.3 * snowAt(T)
  const haze = (hex: string) => mixHex(hex, mixHex(low, '#8A8EA6', 0.25), veil)
  return {
    land: haze(mixHex(mixHex(low, '#7E9C84', 0.3), sil, night)),
    wood: haze(mixHex(mixHex(low, HOME.leaf, 0.36), mixHex(sil, '#2E3A48', 0.3), night)),
    wall: haze(mixHex(mixHex(low, '#F3EEE4', 0.5), deep, night)),
    roof: haze(mixHex(mixHex(low, '#6E7582', 0.36), deep, night)),
    pane: haze(mixHex(mixHex(low, '#7A8692', 0.34), mixHex(deep, '#1C2032', 0.4), night)),
    iron: haze(mixHex(mixHex(low, '#6E6862', 0.32), mixHex(deep, '#1E2234', 0.35), night)),
    lit: smooth(d, 0.42, 0.62) * (1 - veil),
    T,
  }
}

/** Birds now and then: by day out from behind the house and away; at dusk going to roost in the far trees. */
const DAY_BIRD = '#68757C'
const DUSK_BIRD = '#2A3048'
const FLIGHTS: Flight[] = [
  { t0: 23.0, from: [2.0, -4.3], v: [-1.5, -0.3], dur: 8.5, n: 5, span: 0.2, color: DAY_BIRD, seed: 1 },
  { t0: 30.4, from: [6.5, -6.1], v: [1.6, -0.2], dur: 9, n: 4, span: 0.21, color: DAY_BIRD, seed: 2 },
  { t0: 38.4, from: [13.8, -2.7], v: [-0.95, -0.08], dur: 6.2, n: 3, span: 0.18, color: DAY_BIRD, seed: 3 },
  { t0: 227.5, from: [17, -6.8], v: [-1.3, 0.42], dur: 16, n: 8, span: 0.24, color: DUSK_BIRD, seed: 4, beat: 2.8 },
  { t0: 233.0, from: [26, -6.2], v: [-1.6, 0.3], dur: 19, n: 12, span: 0.25, color: DUSK_BIRD, seed: 8, beat: 2.7 },
  { t0: 236.5, from: [-27, -9.6], v: [1.45, 0.01], dur: 40, n: 9, vee: true, span: 0.32, color: DUSK_BIRD, seed: 5, beat: 1.7 },
  { t0: 239.0, from: [-26, -6.6], v: [1.5, 0.3], dur: 20, n: 10, span: 0.26, color: DUSK_BIRD, seed: 9, beat: 2.6 },
  { t0: 243, from: [31, -5.6], v: [-1.5, 0.36], dur: 15, n: 6, span: 0.26, color: DUSK_BIRD, seed: 6, beat: 2.6 },
  { t0: 246.5, from: [33, -7.2], v: [-1.7, 0.4], dur: 18, n: 9, span: 0.27, color: DUSK_BIRD, seed: 10, beat: 2.5 },
  { t0: 249.5, from: [-23, -5.0], v: [1.3, 0.5], dur: 9.8, n: 4, span: 0.26, color: DUSK_BIRD, seed: 7, beat: 2.6 },
  { t0: 251.0, from: [-30, -7.4], v: [1.8, 0.0], dur: 30, n: 7, vee: true, span: 0.3, color: DUSK_BIRD, seed: 11, beat: 1.8 },
]

function far(p: p5, k: number, weight: number, f: Frame, T: number): void {
  const H = Math.min(((f.x1 - f.x0) * 9) / 16, f.y1 - f.y0)
  drawBeyond(p, k, f, G, H, beyondLook(T))
  for (const b of FLIGHTS) if (T > b.t0 && T < b.t0 + b.dur) birds(p, k, f, T, b, weight)
  if (f.y1 < G - 4) return
  const night = duskyAt(T)
  const treeDay = mixHex('#DDEDF1', HOME.leaf, 0.42)
  const houseDay = mixHex('#DDEDF1', '#8E9BA8', 0.48)
  // Nearer than the ridge beyond, so darker against it.
  const sil = '#2F3550'
  const tree = mixHex(treeDay, mixHex(sil, '#36444C', 0.35), night)
  const house = mixHex(houseDay, sil, night)
  const settled = settleAt(T)
  drawFar(p, k, FAR, G, f.x0, f.x1, tree, house, mixHex(house, night > 0.5 ? '#232A40' : '#EEF4F4', 0.32), 0.32, T, { a: settled, color: mixHex(snowTone(lookAt(T)), house, 0.3) })
  leaves(p, k, f, T, FAR_LEAVES, mixHex(tree, '#6B5A48', 0.35), 0.55)
  // Their chimneys: the nearest one's thin smoke by day, three at dusk, the wind taking it off to the right.
  const fire = darkAt(T) > 0
  CHIMNEYS.forEach(([x, y], i) => {
    if ((!fire && i > 0) || x < f.x0 - 2 || x > f.x1 + 2) return
    const color = fire ? mixHex('#8C8AA6', '#5A5D7C', night) : '#F1F5F4'
    // (At dusk the late autumn wind bends it over with the gusts.)
    const drift = fire ? 0.12 + 0.3 * gust(T - x * 0.15, WIND) : 0.13
    smoke(p, k, T, x, y, { rate: 1.1, rise: 0.3, life: 5.5, drift, size: 0.16, color, a: fire ? 0.4 : 0.45, seed: 20 + i })
  })
}

/**
 * How far a star at (x, y) is put out by the credits: 1 under a card while the cards are up, 0 clear of them. The page
 * sets the cards in the 16:9 box round the camera (lifted into the sky a taller stage shows over it), so their place
 * in cells follows from the frame; the edges are soft, and the stars drift through them slowly as the camera draws
 * back, so none pops.
 */
function underCards(p: p5, k: number, f: Frame, T: number): (x: number, y: number) => number {
  const up = smooth(T, CREDITS_AT - 0.5, CREDITS_AT + 0.3) * (1 - smooth(T, LAST_GONE - 0.2, LAST_GONE + 1.2))
  if (up <= 0) return () => 0
  const boxH = Math.min(p.width / (16 / 9), p.height) / k
  const boxW = (boxH * 16) / 9
  const extra = Math.max(0, (f.y1 - f.y0 - boxH) / 2)
  const foot = f.cy - boxH / 2 + CARD_ZONE.foot * boxH - LIFT * extra
  const half = CARD_ZONE.half * boxW
  return (x, y) => up * (1 - smooth(Math.abs(x - f.cx), half, half + 0.05 * boxW)) * (1 - smooth(y, foot, foot + 0.05 * boxH))
}

/** The evening star first, on its note; then the others, one by one as the dark comes: small and still, high over the house. */
function stars(p: p5, k: number, f: Frame, T: number): void {
  if (T < STAR.on) return
  const d = darkAt(T)
  p.noStroke()
  // The evening star: a little larger and warmer than the rest, brightening on the note and settling.
  const s = T - STAR.on
  const on = smooth(s, 0, 0.35)
  const [sx, sy] = STAR.at
  p.fill(alpha(p, '#FFF6E0', 0.95 * on * unveiled(sy, T)))
  p.circle(sx * k, sy * k, (0.14 + 0.03 * Math.exp(-s / 0.5)) * k)
  const cards = underCards(p, k, f, T)
  const dark = smooth(d, 0.5, 0.7)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.fillStyle = '#FFF3D6'
  for (const [x, y, r, at] of STARS) {
    if (T < at || x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const a = smooth(T, at, at + 1.5) * dark * (1 - cards(x, y)) * unveiled(y, T)
    if (a <= 0.002) continue
    ctx.globalAlpha = 0.7 * a
    ctx.beginPath()
    ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // The thin cloud itself, come down over them: a faint flat cover, and two thinner steps at its front.
  const veil = 0.09 * smooth(T, 238, 246)
  const front = Math.min(G, veilFront(T))
  if (veil > 0 && front > f.y0) {
    ctx.fillStyle = '#5E637C'
    for (const [y0, y1, a] of [
      [f.y0, front, 1],
      [front, front + 0.7, 0.6],
      [front + 0.7, front + 1.4, 0.3],
    ] as [number, number, number][]) {
      const top = Math.max(y0, f.y0)
      const foot = Math.min(y1, f.y1, G)
      if (foot <= top) continue
      ctx.globalAlpha = veil * a
      ctx.fillRect(f.x0 * k, top * k, (f.x1 - f.x0) * k, (foot - top) * k)
    }
    ctx.globalAlpha = 1
  }
}

/**
 * As the snow comes a thin cloud veils the stars, from the top of the sky down, once they have had their moment: the
 * height its front has come down to at T, and how much of a star at height y it leaves.
 */
const veilFront = (T: number): number => -22 + (T - 247) * 2.05
const unveiled = (y: number, T: number): number => {
  const off = Math.max(243, 247 + (y + 22) / 2.05)
  return 1 - smooth(T, off, off + 1.6)
}

/**
 * The stars: ninety over the house, and more to a like density up to the top of the last frame and the sky a phone
 * held upright sees over it. [x, y, radius, when it comes out].
 */
const STARS: [number, number, number, number][] = Array.from({ length: 610 }, (_, i) => [
  -26 + hash(i, 71) * 64,
  i < 90 ? -17.5 + hash(i, 72) * 13 : -92 + hash(i, 72) * 74.5,
  0.025 + hash(i, 74) * 0.03,
  STAR.on + 1.5 + hash(i, 73) * 12,
])

/** The lawn, the pavement and its kerb, the road: bands under the ground line, as far as the frame shows. */
function ground(p: p5, k: number, f: Frame, T: number): void {
  if (f.y1 <= G) return
  const L = lookAt(T)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The first snow pales them as it settles: the grass most, the road least.
  const white = snowTone(L)
  const settled = L.snow ?? 0
  const band = (y0: number, y1: number, hex: string, takes: number) => {
    p.fill(mixHex(dusk(L, hex), white, takes * settled))
    p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  p.noStroke()
  band(G, G + 0.24, mixHex(HOME.grass, '#9DAA78', L.age * 0.6), 0.62)
  band(G + 0.24, G + 0.55, mixHex(HOME.stone, '#B8AD9A', L.age), 0.5)
  band(G + 0.55, G + 0.66, mixHex('#9C9282', '#8E8578', L.age), 0.45)
  band(G + 0.66, Math.max(G + 0.66, f.y1 + 1), mixHex('#77716B', '#6C6862', L.age), 0.22)
  // At dusk the road deepens toward us, out of the lamps' reach: on a phone held upright the picture's lower half is
  // road, and it read as one flat grey slab.
  if (L.dark > 0 && f.y1 > G + 0.66) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const n = parseInt(HOME.night.slice(1), 16)
    const rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
    ctx.save()
    const g = ctx.createLinearGradient(0, (G + 0.66) * k, 0, f.y1 * k)
    g.addColorStop(0, `rgba(${rgb}, 0)`)
    g.addColorStop(1, `rgba(${rgb}, ${0.6 * L.dark})`)
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, (G + 0.66) * k, (x1 - x0) * k, (f.y1 + 1 - G - 0.66) * k)
    ctx.restore()
  }
}

/**
 * At the end, the lawn's grass in the late autumn wind: tufts along it stirring on the gusts (the same wind as the far
 * trees), dark against the snow as it settles.
 */
function lawn(p: p5, k: number, weight: number, f: Frame, T: number): void {
  if (T < 200 || f.y1 < G || f.y0 > G) return
  const L = lookAt(T)
  const color = dusk(L, mixHex(HOME.grass, '#4F6A3A', 0.55))
  tufts(p, k, T, f.x0 - 0.5, f.x1 + 0.5, G + 0.08, 0.13, color, weight * 0.7, 4.5, 21)
}

/**
 * By day the sun is high on the left: the house's shadow lies on the lawn to its right, deepest by the wall and soft
 * where it runs out (two flat layers, no gradient).
 */
function sunShadow(p: p5, k: number, T: number): void {
  if (darkAt(T) > 0) return
  const x = HOUSE.x1 + 0.1
  p.noStroke()
  p.fill(alpha(p, '#2F3D2C', 0.09))
  p.quad(x * k, G * k, (x + 3.6) * k, G * k, (x + 2.5) * k, (G + 0.24) * k, x * k, (G + 0.24) * k)
  p.quad(x * k, G * k, (x + 2.3) * k, G * k, (x + 1.5) * k, (G + 0.24) * k, x * k, (G + 0.24) * k)
}

/** A street lamp: an iron post and a lantern; lit on its note, the glass warm and its pool of light on the pavement under it. */
function lampPost(p: p5, k: number, weight: number, x: number, at: number, T: number): void {
  const L = lookAt(T)
  const lit = T < at ? 0 : smooth(T, at, at + 0.15)
  const top = -3.35
  const iron = dusk(L, '#4F5A57')
  if (lit > 0) {
    // Its pool on the pavement: light on the ground, laid flat.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.scale(1, 0.25)
    const cy = ((G + 0.3) * k) / 0.25
    const h = ctx.createRadialGradient(x * k, cy, 0, x * k, cy, 1.6 * k)
    h.addColorStop(0, `rgba(255, 227, 166, ${0.28 * lit})`)
    h.addColorStop(1, 'rgba(255, 227, 166, 0)')
    ctx.fillStyle = h
    ctx.fillRect((x - 1.6) * k, cy - 1.6 * k, 3.2 * k, 3.2 * k)
    ctx.restore()
  }
  p.stroke(dusk(L, INK))
  p.strokeWeight(weight * 0.8)
  p.fill(iron)
  p.rect((x - 0.05) * k, top * k, 0.1 * k, (G - top) * k)
  p.rect((x - 0.14) * k, (G - 0.12) * k, 0.28 * k, 0.12 * k, 0.03 * k)
  // The lantern: a small glass box under a cap.
  p.fill(lit > 0 ? mixHex(dusk(L, '#9AA7A4'), HOME.lamp, lit) : dusk(L, '#9AA7A4'))
  p.quad((x - 0.11) * k, (top - 0.02) * k, (x + 0.11) * k, (top - 0.02) * k, (x + 0.15) * k, (top - 0.42) * k, (x - 0.15) * k, (top - 0.42) * k)
  p.fill(iron)
  p.triangle((x - 0.22) * k, (top - 0.42) * k, (x + 0.22) * k, (top - 0.42) * k, x * k, (top - 0.62) * k)
  const settled = L.snow ?? 0
  if (settled > 0) {
    // Snow on its cap.
    const u = 0.25 + 0.55 * settled
    p.noStroke()
    p.fill(snowTone(L))
    p.triangle((x - 0.22 * u) * k, (top - 0.62 + 0.2 * u) * k, (x + 0.22 * u) * k, (top - 0.62 + 0.2 * u) * k, x * k, (top - 0.64) * k)
  }
}

/**
 * The light from the lit room out through the bay, falling on the lawn and the pavement in front of it: brightest on
 * the grass under the glass, fainter where it reaches the pavement (two flat layers).
 */
function spill(p: p5, k: number, T: number): void {
  const L = lookAt(T)
  const a = L.lamp * L.dark
  if (a <= 0.01) return
  const { x0, x1 } = HOUSE.bay
  p.noStroke()
  p.fill(alpha(p, HOME.lamp, 0.12 * a))
  p.quad((x0 - 0.1) * k, G * k, (x1 + 0.1) * k, G * k, (x1 + 0.75) * k, (G + 0.62) * k, (x0 - 0.75) * k, (G + 0.62) * k)
  p.fill(alpha(p, HOME.lamp, 0.13 * a))
  p.quad((x0 + 0.1) * k, G * k, (x1 - 0.1) * k, G * k, (x1 + 0.25) * k, (G + 0.4) * k, (x0 - 0.25) * k, (G + 0.4) * k)
}

/** Cars along the road in front, by day, under the lawn: when, from where, how fast (minus: to the left), their paint. */
const CARS: { t0: number; x0: number; v: number; body: string }[] = [
  { t0: 23.4, x0: 17.5, v: -3.3, body: mixHex(HOME.pink, '#B9A6A2', 0.3) },
  { t0: 32.2, x0: -6.5, v: 3.6, body: mixHex(HOME.glass, '#6F98A8', 0.55) },
]
/** Where a passing car's wheels meet the road. */
const ROAD_Y = G + 1.3

/** A round-shouldered family car (theirs is yellow, in their drive: `inside/jar-draw.ts`), side on, facing `dir`. */
function car(p: p5, k: number, weight: number, x: number, dir: number, body: string, T: number): void {
  const R = 0.16
  const wy = ROAD_Y - R
  p.push()
  p.translate(x * k, 0)
  p.scale(dir, 1)
  p.stroke(INK)
  p.strokeWeight(weight * 0.75)
  for (const wx of [-0.62, 0.6]) {
    p.fill(INK)
    p.circle(wx * k, wy * k, 2 * R * k)
    p.noStroke()
    p.fill(HOME.trim)
    // The hubs turn: a spot off the middle goes round.
    const a = (x / R) * dir
    p.circle((wx + Math.cos(a) * 0.04) * k, (wy + Math.sin(a) * 0.04) * k, 0.1 * k)
    p.stroke(INK)
  }
  void T
  // The cabin: a rounded dome, a gentle slope behind and a steeper windscreen; its two windows.
  const sill = wy - 0.22
  p.fill(mixHex(body, '#FFFFFF', 0.25))
  p.beginShape()
  p.vertex(-0.7 * k, sill * k)
  p.bezierVertex(-0.6 * k, (sill - 0.38) * k, -0.36 * k, (sill - 0.46) * k, -0.06 * k, (sill - 0.46) * k)
  p.bezierVertex(0.22 * k, (sill - 0.46) * k, 0.36 * k, (sill - 0.36) * k, 0.5 * k, sill * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(mixHex(HOME.glass, HOME.sky, 0.4))
  p.quad(-0.55 * k, (sill - 0.03) * k, -0.42 * k, (sill - 0.32) * k, -0.1 * k, (sill - 0.38) * k, -0.1 * k, (sill - 0.03) * k)
  p.quad(0.0 * k, (sill - 0.03) * k, 0.0 * k, (sill - 0.38) * k, 0.24 * k, (sill - 0.33) * k, 0.36 * k, (sill - 0.03) * k)
  p.stroke(INK)
  p.fill(body)
  // The body: short and deep, round at both ends, over the wheels' tops.
  p.rect(-0.98 * k, sill * k, 1.95 * k, 0.36 * k, 0.15 * k)
  p.pop()
}

function traffic(p: p5, k: number, weight: number, f: Frame, T: number): void {
  if (f.y1 < ROAD_Y - 0.9) return
  for (const c of CARS) {
    const x = c.x0 + c.v * (T - c.t0)
    if (T < c.t0 || x < f.x0 - 1.5 || x > f.x1 + 1.5) continue
    car(p, k, weight, x, Math.sign(c.v), c.body, T)
  }
}

function drawFront(p: p5, k: number, weight: number, T: number): void {
  const f = frame(p, k)
  p.push()
  p.rectMode(p.CORNER)
  sky(p, k, f, T)
  stars(p, k, f, T)
  cloudsAt(p, k, f, T)
  far(p, k, weight, f, T)
  ground(p, k, f, T)
  sunShadow(p, k, T)
  lawn(p, k, weight, f, T)
  for (const lamp of LAMPS) if (lamp.x > f.x0 - 3 && lamp.x < f.x1 + 3) lampPost(p, k, weight, lamp.x, lamp.at, T)
  const chairs = chairsIn(T)
  const here = T < FRONT_OVER
  if (T < SHOVE) drawHouse(p, k, weight, lookAt(T, true), chairs, SWINGS, here)
  else if (T >= HALT) drawHouse(p, k, weight, lookAt(T), chairs, SWINGS, here)
  else {
    // Mid fix-up: new left of the rollers, old right of them.
    const w = W(T)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const Y0 = (f.y0 - 2) * k
    const Hh = (f.y1 - f.y0 + 4) * k
    ctx.save()
    ctx.beginPath()
    ctx.rect((f.x0 - 2) * k, Y0, (w - f.x0 + 2) * k, Hh)
    ctx.clip()
    drawHouse(p, k, weight, lookAt(T), chairs, SWINGS, here)
    ctx.restore()
    ctx.save()
    ctx.beginPath()
    ctx.rect(w * k, Y0, (f.x1 - w + 2) * k, Hh)
    ctx.clip()
    drawHouse(p, k, weight, lookAt(T, true), chairs, SWINGS, here)
    ctx.restore()
  }
  spill(p, k, T)
  traffic(p, k, weight, f, T)
  p.pop()
}

/* ------------------------------------------------------------------ the season: late autumn wind, the first snow */

/**
 * The one wind. The far trees lean on it (`drawFar`, the same gust clock), the verge's tufts bend in it, and the leaves
 * and the snow ride it: how far it has carried anything riding it since `RUN.t0`, in cells at a mean gust's speed of
 * one a second, precomputed.
 */
const WIND = 3
const RUN = { t0: 170, dt: 0.05, t1: 262 }
const RUN_TABLE: Float32Array = (() => {
  const n = Math.ceil((RUN.t1 - RUN.t0) / RUN.dt) + 2
  const out = new Float32Array(n)
  for (let i = 1; i < n; i++) out[i] = out[i - 1] + (gust(RUN.t0 + (i - 0.5) * RUN.dt, WIND) / 0.55) * RUN.dt
  return out
})()
function windRun(t: number): number {
  const u = Math.max(0, Math.min(RUN_TABLE.length - 1.001, (t - RUN.t0) / RUN.dt))
  const i = Math.floor(u)
  return RUN_TABLE[i] + (RUN_TABLE[i + 1] - RUN_TABLE[i]) * (u - i)
}

/**
 * How much snow is falling at T: the first flakes as he puts the lamp on, so the lit room is held through them; heavier
 * as the credits come, thickening to the end. 0 before.
 */
function snowAt(T: number): number {
  return smooth(T, ALONE.lamp + 0.3, ALONE.lamp + 3.5) * (0.16 + 0.84 * smooth(T, CREDITS_AT - 0.3, 255))
}
/** How far it has settled: the roofs' edges, the lamps' caps, the mailbox, the lawn and the pavement, over the last twenty seconds. */
function settleAt(T: number): number {
  return smooth(T, 238, 257.5)
}

/** The street trees' leaves, late in the year: rust, ochre, a red-brown, an olive. */
const LEAF_TONES = ['#A9683C', '#C4904A', '#8C4C35', '#7D6B40']

interface Leaf {
  t0: number
  x: number
  y: number
  v: number
  size: number
  spin: number
  turn: number
  ph: number
  tone: number
  /** Ground leaves: how high and how often they hop as they skitter. Falling ones: how fast they come down, and where they land. */
  hop: number
  rate: number
  land: number
}

/**
 * Leaves let go on the gusts: one every `every` seconds from `from` to `to`, kept only where the wind was blowing
 * and the season allows (sparse while he climbs and goes in, stronger once the door has shut behind him).
 */
function leafSeeds(seed: number, from: number, to: number, every: number, make: (i: number, t0: number) => Omit<Leaf, 't0' | 'tone' | 'ph' | 'spin' | 'turn'> & { spin: number; turn: number }): Leaf[] {
  const out: Leaf[] = []
  for (let i = 0, t0 = from; t0 < to; i++, t0 = from + i * every) {
    const season = 0.3 + 0.7 * smooth(t0, ALONE.shut, ALONE.shut + 2.5)
    const blow = clamp01((gust(t0, WIND) - 0.2) / 0.55)
    if (hash(i, 1, seed) > season * (0.25 + 0.75 * blow)) continue
    const m = make(i, t0)
    out.push({ ...m, t0, ph: hash(i, 2, seed) * Math.PI * 2, tone: Math.floor(hash(i, 3, seed) * LEAF_TONES.length), spin: m.spin * (hash(i, 4, seed) < 0.5 ? -1 : 1) })
  }
  return out
}

/** Far ones: small and slow over the street's far side, passing behind the house. */
const FAR_LEAVES = leafSeeds(11, 182, 236, 0.22, (i) => ({
  x: -17 - hash(i, 5, 11) * 4,
  y: G - 0.35 - hash(i, 6, 11) * 2.3,
  v: 0.55 + hash(i, 7, 11) * 0.4,
  size: 0.045 + hash(i, 8, 11) * 0.025,
  spin: 1 + hash(i, 9, 11) * 1.5,
  turn: 1.5 + hash(i, 10, 11) * 1.5,
  hop: 0,
  rate: 0,
  land: 0,
}))
/** Mid ones along the ground, tumbling over the lawn and the pavement in front of the house (on the pavement only while he is outside, so never at his feet). */
const GROUND_LEAVES = leafSeeds(12, 190, 236, 0.24, (i, t0) => {
  const out = t0 < ALONE.shut
  // Once he is in, the gusts lift some a little off the grass, in front of the house's footing (never up to the bay's sill).
  return {
    x: -9.5 - hash(i, 5, 12) * 3,
    y: out ? G + 0.16 + hash(i, 6, 12) * 0.34 : G - 0.22 + hash(i, 6, 12) * 0.62,
    v: 1.4 + hash(i, 7, 12) * 1.2,
    size: 0.095 + hash(i, 8, 12) * 0.05,
    spin: 3 + hash(i, 9, 12) * 3,
    turn: 2 + hash(i, 10, 12) * 3,
    hop: (out ? 0.05 : 0.26) * (0.4 + 0.6 * hash(i, 11, 12)),
    rate: 0.8 + hash(i, 12, 12) * 0.8,
    land: 0,
  }
})
/**
 * Mid ones coming down, fluttering, in front of the house, each in a column clear of the bay (and of him on the steps
 * and at the door, and of the mailbox), sheltered from the wind by the house: down the left of it, beyond the mailbox,
 * between the side window and the box, and once he is in, past the door. None starts once the camera begins to draw
 * back, so none appears in the open sky.
 */
const FALL_FROM = -4.7
const FALLING_LEAVES = leafSeeds(13, 194, 224.4, 0.32, (i, t0) => {
  const cols: [number, number][] = [
    [-1.7, -0.15],
    [7.3, 8.3],
    [9.7, 13.5],
  ]
  if (t0 >= ALONE.shut) cols.push([4.35, 5.65])
  const [a, b] = cols[Math.floor(hash(i, 5, 13) * cols.length)]
  return {
    x: a + 0.2 + hash(i, 6, 13) * Math.max(0, b - a - 0.75),
    y: FALL_FROM,
    v: 0.5 + hash(i, 7, 13) * 0.25,
    size: 0.095 + hash(i, 8, 13) * 0.045,
    spin: 2 + hash(i, 9, 13) * 2.5,
    turn: 1.6 + hash(i, 10, 13) * 1.6,
    hop: 0.1 + hash(i, 11, 13) * 0.06,
    rate: 1.0 + hash(i, 12, 13) * 0.8,
    land: t0 < ALONE.shut ? G + 0.16 + hash(i, 14, 13) * 0.3 : G + hash(i, 14, 13) * 0.4,
  }
})
/**
 * Mid ones high, once he is in: over the bay's little roof and the porch roof and on up in front of the upper storey
 * (never down to the bay's glass, whose roof tops out at -3.18), the lit room under them held against the wind.
 */
const HIGH_LEAVES = leafSeeds(14, 207, 234, 0.24, (i) => ({
  x: -13 - hash(i, 5, 14) * 3,
  y: -3.34 - Math.pow(hash(i, 6, 14), 1.6) * 2.6,
  v: 1.6 + hash(i, 7, 14) * 1.0,
  size: 0.095 + hash(i, 8, 14) * 0.045,
  spin: 2.5 + hash(i, 9, 14) * 3,
  turn: 2 + hash(i, 10, 14) * 2,
  hop: 0.12,
  rate: 0.5 + hash(i, 11, 14) * 0.4,
  land: 0,
}))
/** A few near ones, larger and faster, across the foot of the frame (in box heights, and frame widths a second). */
const NEAR_LEAVES = leafSeeds(15, 201.5, 234, 0.38, (i) => ({
  x: 0,
  y: 0.04 + hash(i, 6, 15) * 0.12,
  v: 0.4 + hash(i, 7, 15) * 0.3,
  size: 0.05 + hash(i, 8, 15) * 0.03,
  spin: 5 + hash(i, 9, 15) * 4,
  turn: 3 + hash(i, 10, 15) * 3,
  hop: 0.03,
  rate: 0.7,
  land: 0,
}))

/** The wind drops and the leaves go together as the snow begins. */
const leavesOn = (T: number): number => 1 - smooth(T, ALONE.lamp + 0.3, ALONE.lamp + 4)

/** One leaf: a pointed oval, turned and tumbling (its width the face it shows), added to the current path. */
function leafPath(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, size: number, angle: number, face: number): void {
  const c = Math.cos(angle) * k
  const s = Math.sin(angle) * k
  const w = size * 0.45 * Math.max(0.15, Math.abs(face))
  const pt = (u: number, v: number): [number, number] => [x * k + u * c - v * s, y * k + u * s + v * c]
  const [ax, ay] = pt(size, 0)
  const [bx, by] = pt(0, w)
  const [cx, cy] = pt(-size * 0.8, 0)
  const [dx, dy] = pt(0, -w)
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.lineTo(cx, cy)
  ctx.lineTo(dx, dy)
  ctx.closePath()
}

/** Where a leaf is at T, by its kind; null once it is gone. */
type Place = (l: Leaf, T: number, f: Frame) => [number, number] | null

const blown = (l: Leaf, T: number): number => l.x + l.v * (windRun(T) - windRun(l.t0))
const farPlace: Place = (l, T, f) => {
  const s = T - l.t0
  const x = blown(l, T) + along(f, 0.3, NEAR_AT)
  return x > 28 ? null : [x, l.y + 0.04 * s + 0.12 * Math.sin(1.3 * s + l.ph)]
}
const groundPlace: Place = (l, T) => {
  const s = T - l.t0
  const x = blown(l, T)
  return x > 19 ? null : [x, l.y - Math.abs(Math.sin(Math.PI * l.rate * s + l.ph)) * l.hop * (0.5 + gust(T, WIND))]
}
const fallingPlace: Place = (l, T) => {
  const s = T - l.t0
  const down = (l.land - l.y) / l.v
  const flutter = (t: number) => l.x + 0.05 * t + l.hop * Math.sin(l.rate * Math.PI * t + l.ph)
  if (s <= down) return [flutter(s), l.y + l.v * s]
  // Down on the grass, the wind takes it on along the ground.
  const x = flutter(down) + 1.1 * (windRun(T) - windRun(l.t0 + down))
  return x > 19 ? null : [x, l.land - Math.abs(Math.sin(Math.PI * 1.1 * (s - down))) * 0.06]
}
const highPlace: Place = (l, T) => {
  const s = T - l.t0
  const x = blown(l, T)
  // (Never lower than the bay's roof.)
  return x > 19 ? null : [x, Math.min(-3.26, l.y + 0.02 * s - l.hop * Math.abs(Math.sin(Math.PI * l.rate * s + l.ph)))]
}

/** A layer of leaves, one path to a tone, in the dusk's light (and toward `tint` by `mix`: the far ones go with the far side's trees). */
function leaves(p: p5, k: number, f: Frame, T: number, list: Leaf[], tint: string | null, mix: number, place: Place = farPlace): void {
  const on = leavesOn(T)
  if (on <= 0 || T < 200) return
  const L = lookAt(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.globalAlpha = on
  LEAF_TONES.forEach((tone, j) => {
    ctx.beginPath()
    let any = false
    for (const l of list) {
      if (l.tone !== j || T < l.t0) continue
      const at = place(l, T, f)
      if (!at) continue
      const [x, y] = at
      if (x < f.x0 - 0.5 || x > f.x1 + 0.5 || y < f.y0 - 0.5 || y > f.y1 + 0.5) continue
      const s = T - l.t0
      leafPath(ctx, k, x, y, l.size, l.ph + l.spin * s, Math.cos(l.turn * s + l.ph))
      any = true
    }
    if (!any) return
    ctx.fillStyle = tint ? mixHex(dusk(L, tone), tint, mix) : dusk(L, tone)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

/** The near leaves: across the frame's foot, in the frame's own measure, never above the pavement. */
function nearLeaves(p: p5, k: number, f: Frame, T: number): void {
  const on = leavesOn(T)
  if (on <= 0 || T < 200) return
  const L = lookAt(T)
  const W = f.x1 - f.x0
  const Hb = Math.min((W * 9) / 16, f.y1 - f.y0)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.globalAlpha = on
  LEAF_TONES.forEach((tone, j) => {
    ctx.beginPath()
    let any = false
    for (const l of NEAR_LEAVES) {
      if (l.tone !== j) continue
      const s = T - l.t0
      const u = s * l.v * (0.6 + 0.8 * gust(l.t0, WIND)) - 0.08
      if (s < 0 || u > 1.1) continue
      const size = l.size * Hb
      const x = f.x0 + u * W
      // Below him on the steps while he is out; once he is in, low in front of the footing, under the bay's sill.
      const floor = l.t0 < ALONE.shut ? G + 0.3 + size : -0.38 + size
      const y = Math.max(floor, f.y1 - l.y * Hb - Math.abs(Math.sin(Math.PI * l.rate * s + l.ph)) * l.hop * Hb)
      if (y - size > f.y1) continue
      leafPath(ctx, k, x, y, size, l.ph + l.spin * s, Math.cos(l.turn * s + l.ph))
      any = true
    }
    if (!any) return
    ctx.fillStyle = mixHex(dusk(L, tone), '#2A2626', 0.25)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

interface Flake {
  u: number
  v: number
  th: number
  r: number
  ph: number
  w: number
}
interface SnowLayer {
  flakes: Flake[]
  /** Box heights a second; its drift on the wind (frame widths a cell of wind), its sway (frame widths). */
  fall: number
  drift: number
  sway: number
  a: number
  /** For parallax (`along`): the far flakes keep with the frame, the near ones slide past. */
  depth: number
  round: boolean
}
function snowLayer(n: number, seed: number, fall: number, r: [number, number], drift: number, sway: number, a: number, depth: number, round: boolean): SnowLayer {
  return {
    flakes: Array.from({ length: n }, (_, i) => ({
      u: hash(i, 1, seed),
      v: hash(i, 2, seed),
      th: hash(i, 3, seed) * 0.93,
      r: r[0] + hash(i, 4, seed) * (r[1] - r[0]),
      ph: hash(i, 5, seed) * Math.PI * 2,
      w: 0.5 + hash(i, 6, seed) * 0.7,
    })),
    fall,
    drift,
    sway,
    a,
    depth,
    round,
  }
}
/**
 * The first snow, at three depths, in the frame's own measure (a box height is the 16:9 frame's height): far flakes
 * tiny, slow and many; mid ones; near ones larger, faster and few (a near one crosses the frame's height in about five
 * seconds). Soft pale discs, no glint.
 */
const SNOW: SnowLayer[] = [
  snowLayer(700, 31, 1 / 26, [0.0012, 0.0018], 0.01, 0.0025, 0.5, 0.6, false),
  snowLayer(520, 32, 1 / 9.5, [0.0026, 0.0038], 0.02, 0.005, 0.72, 0, true),
  snowLayer(45, 33, 1 / 5, [0.0055, 0.0085], 0.04, 0.01, 0.88, -0.5, true),
]
/** The flakes of a layer at each of three strengths (fading in as the fall thickens, or out under a card): x, y, r. */
const FLAKE_BUF = [0, 1, 2].map(() => new Float32Array(3 * 6000))

/** The snow falling, in front of everything but the two of them; out from under the cards while they are up. */
function snowfall(p: p5, k: number, f: Frame, T: number): void {
  const amount = snowAt(T)
  if (amount <= 0) return
  const W = f.x1 - f.x0
  const Hb = Math.min((W * 9) / 16, f.y1 - f.y0)
  const tiles = Math.ceil((f.y1 - f.y0) / Hb)
  const cards = underCards(p, k, f, T)
  const run = windRun(T)
  const frac = (v: number) => v - Math.floor(v)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.fillStyle = FLAKE
  for (const layer of SNOW) {
    const shift = along(f, layer.depth - 1, NEAR_AT) / W
    const n = [0, 0, 0]
    for (const fl of layer.flakes) {
      const on = smooth(amount, fl.th, fl.th + 0.07)
      if (on <= 0.17) continue
      const x = f.x0 + frac(fl.u + layer.drift * fl.w * run + layer.sway * Math.sin(fl.w * T + fl.ph) + shift) * W
      const v = frac(fl.v + layer.fall * fl.w * T)
      for (let j = 0; j < tiles; j++) {
        const y = f.y0 + (v + j) * Hb
        if (y > f.y1 + 0.1) break
        const a = on * (1 - cards(x, y))
        const level = a > 0.83 ? 2 : a > 0.5 ? 1 : a > 0.17 ? 0 : -1
        if (level < 0 || n[level] >= 6000) continue
        const buf = FLAKE_BUF[level]
        const m = 3 * n[level]++
        buf[m] = x
        buf[m + 1] = y
        buf[m + 2] = fl.r * Hb
      }
    }
    for (let level = 0; level < 3; level++) {
      if (!n[level]) continue
      const buf = FLAKE_BUF[level]
      ctx.globalAlpha = layer.a * (level + 1) / 3
      ctx.beginPath()
      for (let i = 0; i < n[level]; i++) {
        const x = buf[3 * i] * k
        const y = buf[3 * i + 1] * k
        const r = buf[3 * i + 2] * k
        if (layer.round) {
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, Math.PI * 2)
        } else ctx.rect(x - r, y - r, 2 * r, 2 * r)
      }
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}
/** A flake: pale, a little cool. */
const FLAKE = '#E8ECF4'

/** The ground's and the high leaves, the near ones, and the snow: drawn over the set and under the two of them. */
function drawWeather(p: p5, k: number, T: number): void {
  if (T < 200) return
  const f = frame(p, k)
  p.push()
  p.noStroke()
  leaves(p, k, f, T, GROUND_LEAVES, null, 0, groundPlace)
  leaves(p, k, f, T, FALLING_LEAVES, null, 0, fallingPlace)
  leaves(p, k, f, T, HIGH_LEAVES, null, 0, highPlace)
  nearLeaves(p, k, f, T)
  snowfall(p, k, f, T)
  p.pop()
}

/* ------------------------------------------------------------------ the near side */

/** Where the near side stands true: the last frame's middle (a pan elsewhere slides it past faster than the house). */
const NEAR_AT = 4.25
/** The hydrant on our verge (well clear of the mailbox, under the hill), and the two runs of low hedge along it (house cells, as seen from the last frame). */
const HYDRANT = -3.2
const HEDGES: [number, number][] = [
  [-15.5, -9.6],
  [19.6, 27.5],
]

/**
 * Our own side of the road, at the frame's foot whenever the camera looks low enough to see it: the near kerb, its
 * grass verge with tufts leaning in the wind, a hydrant, a run of low hedge at each end. Nearer than the house, so a
 * pan slides it past faster, and it comes up from the frame's foot as the camera draws back; never higher than the
 * road, so it never covers the two of them, the steps, the mailbox or the balloon. At dusk it goes nearly black: we
 * stand in the dark across the street from his lit window.
 */
function drawNear(p: p5, k: number, weight: number, T: number): void {
  const f = frame(p, k)
  const deep = f.y1 - G - 0.9
  if (deep <= 0.01) return
  const h = deep * 0.35
  const top = f.y1 - h
  const night = smooth(darkAt(T), 0.3, 0.75)
  const white = snowTone(lookAt(T))
  const settled = settleAt(T)
  const tone = (hex: string) => mixHex(mixHex(hex, '#191D2B', 0.86 * night), white, 0.45 * settled)
  const shift = along(f, -0.4, NEAR_AT)
  const x0 = f.x0 - shift - 1
  const x1 = f.x1 - shift + 1
  const kerb = Math.min(0.08, h * 0.3)
  p.push()
  p.rectMode(p.CORNER)
  p.translate(shift * k, 0)
  p.noStroke()
  p.fill(tone(mixHex(HOME.stone, '#A79D8C', 0.45)))
  p.rect(x0 * k, top * k, (x1 - x0) * k, kerb * k)
  p.fill(tone(mixHex(HOME.grass, '#4A6339', 0.5)))
  p.rect(x0 * k, (top + kerb) * k, (x1 - x0) * k, (f.y1 + 1 - top - kerb) * k)
  // The hedges: soft lumps along the verge, one outline round the run.
  for (const [a, b] of HEDGES) {
    if (b < x0 || a > x1) continue
    const lumps: [number, number, number][] = []
    for (let x = a, i = 0; x <= b; x += 0.5, i++) lumps.push([x, 0.8 + hash(i, 5, a) * 0.3, 1.0 + hash(i, 6, a) * 0.45])
    p.stroke(tone(INK))
    p.strokeWeight(weight * 1.6)
    p.fill(tone(mixHex(HOME.leaf, '#3E5A34', 0.45)))
    for (const [x, w, hh] of lumps) p.ellipse(x * k, (top + 0.42) * k, w * k, hh * k)
    p.noStroke()
    for (const [x, w, hh] of lumps) p.ellipse(x * k, (top + 0.42) * k, w * k, hh * k)
  }
  if (HYDRANT > x0 && HYDRANT < x1) hydrant(p, k, weight, HYDRANT, top + 0.16, tone)
  tufts(p, k, T, x0, x1, top + kerb + 0.02, 0.24 * Math.min(1, h / 0.25), tone(mixHex(HOME.grass, '#3C5530', 0.55)), weight * 0.9)
  p.pop()
}

/**
 * The verge's tufts along `y` from `x0` to `x1`: stalks leaning with the wind, the gust running along the row (as
 * `grass` in `depth.ts`, drawn as one path, since at the last frame's width there are a few hundred of them).
 */
function tufts(p: p5, k: number, T: number, x0: number, x1: number, y: number, h: number, color: string, weight: number, per = 3.2, seed = 5): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  for (let i = Math.floor(x0 * per); i <= Math.ceil(x1 * per); i++) {
    if (hash(i, 51, seed) > 0.55) continue
    const x = (i + hash(i, 52, seed)) / per
    const hh = h * (0.5 + hash(i, 53, seed))
    const g = gust(T - x * 0.15, WIND)
    const lean = (0.25 + 0.5 * g) * hh + Math.sin(T * (2.1 + 2.5 * g) + i) * (0.04 + 0.1 * Math.max(0, g - 0.45)) * hh
    ctx.moveTo(x * k, y * k)
    ctx.quadraticCurveTo((x + lean * 0.3) * k, (y - hh * 0.6) * k, (x + lean) * k, (y - hh * (1 - (0.15 * Math.abs(lean)) / hh)) * k)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = weight
  ctx.stroke()
}

/** A squat hydrant on the verge, its foot at `y`: a flanged base, the barrel, a domed cap, a nozzle each side. */
function hydrant(p: p5, k: number, weight: number, x: number, y: number, tone: (hex: string) => string): void {
  const red = tone(mixHex('#C85A4C', '#8E7A6E', 0.5))
  p.push()
  p.translate(x * k, y * k)
  p.scale(0.75)
  p.stroke(tone(INK))
  // (Drawn at three quarters: its line, scaled with it, is three quarters of the set's.)
  p.strokeWeight(weight)
  p.fill(red)
  p.rect(-0.15 * k, -0.32 * k, 0.3 * k, 0.12 * k, 0.04 * k)
  p.rect(-0.11 * k, -0.7 * k, 0.22 * k, 0.6 * k, 0.03 * k)
  p.arc(0, -0.7 * k, 0.22 * k, 0.2 * k, Math.PI, 2 * Math.PI, p.CHORD)
  p.rect(-0.19 * k, -0.58 * k, 0.08 * k, 0.1 * k, 0.02 * k)
  p.rect(0.11 * k, -0.58 * k, 0.08 * k, 0.1 * k, 0.02 * k)
  p.fill(tone(mixHex(HOME.trim, '#B9AFA0', 0.3)))
  p.rect(-0.13 * k, -0.74 * k, 0.26 * k, 0.05 * k, 0.02 * k)
  p.pop()
}

export const front = scenery<null>({
  name: 'front',
  draw: (p, _s, c) => drawFront(p, c.k, c.weight, c.t),
  over: (p, _s, c) => {
    drawNear(p, c.k, c.weight, c.t)
    drawWeather(p, c.k, c.t)
  },
})
