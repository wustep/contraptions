import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash } from '../kit'
import { clock } from '../stack'
import { LIMBO, SLEEP } from '../worlds'
import {
  BACKWASH,
  BOTTOM,
  BREAK_X,
  CALVING,
  CITY,
  CRACK,
  CREST_V,
  GARDEN,
  GROUND,
  HORIZON,
  HOUSE,
  PARALLAX,
  SEA,
  SUN_AT,
  SWING,
  memory,
  TOP_OF_SKY,
  TREE,
  UPRUSH,
  WATERLINE,
  WAVES,
  crestH,
  lerp,
  roughness,
  sandY,
  sm,
  washFront,
  type Calving,
  type Tower,
} from './limbo-geo'
import { box, clipped, ctxOf, gradFill, hgradFill, line, polyline, shape, soft, vwash, wash, type Pen } from './limbo-pen'

type Frame = ReturnType<typeof frame>

/**
 * Limbo's land and water (the LIMBO builder's): the cold huge sky at dusk, the endless grey sea and its breakers (one
 * on every chord), the pale shore, the city they built out on the far water (crumbling into it on the peak's
 * downbeats, like ice calving), the walled garden of their old house at the tower's foot, and the house.
 */

const SKY_TOP = mixHex(LIMBO.sky, SLEEP.mid, 0.55)
const SKY_HIGH = mixHex(LIMBO.sky, LIMBO.seaDeep, 0.3)
const SKY_LOW = mixHex(LIMBO.sky, LIMBO.skyWarm, 0.55)
const FAR_SEA = mixHex(LIMBO.sky, LIMBO.sea, 0.4)
const NEAR_SEA = mixHex(LIMBO.sea, LIMBO.seaDeep, 0.3)
const CLOUD = mixHex(LIMBO.sky, LIMBO.foam, 0.45)
const SEABED_TOP = mixHex(LIMBO.sandWet, LIMBO.seaDeep, 0.55)
const EARTH = mixHex(LIMBO.sandWet, LIMBO.concreteDark, 0.45)
const EARTH_DEEP = mixHex(LIMBO.concreteDark, SLEEP.mid, 0.55)
const CITY_NEAR = mixHex(LIMBO.concreteDark, LIMBO.sky, 0.2)
const CITY_FAR = mixHex(LIMBO.concreteDark, LIMBO.sky, 0.62)
const MID_NEAR = mixHex(LIMBO.concreteDark, LIMBO.sky, 0.06)
const SPRAY = mixHex(LIMBO.foam, LIMBO.sky, 0.15)
const SPRAY_NEAR = mixHex(LIMBO.foam, LIMBO.sky, 0.06)
const SPRAY_SHADE = mixHex(LIMBO.foam, LIMBO.seaDeep, 0.4)

/* ------------------------------------------------------------------ the sky */

const CLOUDS = [
  ...Array.from({ length: 9 }, (_, i) => ({
    x: -70 + hash(i, 1, 7) * 150,
    y: 71.5 + hash(i, 2, 7) * 9.5,
    len: 9 + hash(i, 3, 7) * 16,
    th: 0.35 + hash(i, 4, 7) * 0.5,
    a: 0.18 + hash(i, 5, 7) * 0.2,
  })),
]
/** Long thin streaks of cloud low over the sea, dark against the afterglow. */
const STREAKS = Array.from({ length: 12 }, (_, i) => ({
  x: -60 + hash(i, 1, 9) * 110,
  y: 82.6 + hash(i, 2, 9) * 2.2,
  len: 5 + hash(i, 3, 9) * 12,
  th: 0.05 + hash(i, 4, 9) * 0.09,
  a: 0.22 + hash(i, 5, 9) * 0.22,
}))
const STREAK = mixHex(LIMBO.sky, LIMBO.seaDeep, 0.45)

export function drawSky(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > HORIZON + 1 || f.y1 < TOP_OF_SKY) return
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  vwash(pen, x0, x1, TOP_OF_SKY, HORIZON + 0.05, [
    [0, SKY_TOP, 1],
    [0.2, SKY_HIGH, 1],
    [0.55, LIMBO.sky, 1],
    [0.86, SKY_LOW, 1],
    [1, LIMBO.skyWarm, 1],
  ])
  const c = clock('limbo', t)
  // The afterglow, low over the sea to the west: very far, so it hardly moves with the camera.
  const gx = -15 + f.cx * 0.85
  soft(pen, gx, HORIZON - 0.4, 30, 5.5, LIMBO.skyWarm, 0.42)
  soft(pen, gx, HORIZON - 0.2, 12, 1.6, LIMBO.skyWarm, 0.35)
  // The brightest thing in the sky: the band of light just over the sea.
  vwash(pen, x0, x1, HORIZON - 0.9, HORIZON + 0.02, [
    [0, LIMBO.foam, 0],
    [0.75, LIMBO.foam, 0.28],
    [1, LIMBO.foam, 0.5],
  ])
  for (let i = 0; i < STREAKS.length; i++) {
    const st = STREAKS[i]
    const x = st.x + c * 0.05 + f.cx * 0.7
    if (x + st.len < x0 || x - st.len > x1) continue
    soft(pen, x, st.y, st.len / 2, st.th, STREAK, st.a)
    soft(pen, x + 0.4, st.y + st.th * 0.8, st.len / 2.3, st.th * 0.5, LIMBO.skyWarm, st.a * 0.8)
  }
  // Long thin banks of cloud, drifting.
  for (let i = 0; i < CLOUDS.length; i++) {
    const cl = CLOUDS[i]
    const x = cl.x + c * 0.035 + f.cx * 0.6
    if (x + cl.len < x0 || x - cl.len > x1) continue
    const warm = sm((cl.y - 76) / 6)
    soft(pen, x, cl.y, cl.len / 2, cl.th, mixHex(CLOUD, LIMBO.foam, 0.6 * warm), cl.a)
  }
}

/* ------------------------------------------------------------------ the far sea */

export function drawFarSea(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > SEA + 1 || f.y1 < HORIZON - 1) return
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  vwash(pen, x0, x1, HORIZON, SEA + 0.8, [
    [0, mixHex(FAR_SEA, LIMBO.sky, 0.5), 1],
    [0.12, FAR_SEA, 1],
    [0.55, mixHex(LIMBO.sea, LIMBO.sky, 0.12), 1],
    [1, NEAR_SEA, 1],
  ])
  const gx = -15 + f.cx * 0.85
  // The afterglow's path on the water, and a thin bright line where sea meets sky.
  soft(pen, gx, HORIZON + 0.35, 22, 0.45, LIMBO.skyWarm, 0.3)
  soft(pen, gx + 3, HORIZON + 1.3, 5, 1.2, LIMBO.skyWarm, 0.16)
  vwash(pen, x0, x1, HORIZON - 0.02, HORIZON + 0.12, [
    [0, LIMBO.skyWarm, 0],
    [0.4, LIMBO.skyWarm, 0.35],
    [1, LIMBO.skyWarm, 0],
  ])
  // A few soft glints drifting on the far water, of many lengths.
  const c = clock('limbo', t)
  for (let i = 0; i < 70; i++) {
    const q = hash(i, 2, 11)
    const y = HORIZON + 0.15 + q * q * 2.8
    const x = -70 + hash(i, 1, 11) * 150 + f.cx * PARALLAX * (1 - q) + Math.sin(c * 0.3 + i) * 0.4
    if (x < x0 - 4 || x > x1 + 4) continue
    const a = (0.08 + 0.12 * Math.sin(c * (0.4 + hash(i, 3, 11) * 0.5) + i * 2.1) ** 2) * (1 - 0.4 * q)
    soft(pen, x, y, (0.5 + hash(i, 4, 11) * 3.2) * (1 - 0.5 * q), 0.02 + 0.03 * q + 0.015 * hash(i, 5, 11), LIMBO.foam, a)
  }
}

/* ------------------------------------------------------------------ the city */

/** A slab's state at t: null while it is part of its tower. */
function slabAt(e: Calving, t: number): { gone: boolean; hinge: Pt; theta: number; dust: number } | null {
  const tw = CITY[e.tower]
  const s = e.side
  const xSide = tw.x + (s * tw.w) / 2 - s * (e.off ?? 0)
  const t0 = e.hit - e.fall
  if (t < t0) return null
  const u = (t - t0) / e.fall
  const h0: Pt = [xSide, e.top + e.h]
  if (e.big) {
    // A glacier's face: the whole top leans out, slowly, and then slides down into the sea, and on under it.
    const drop = tw.base - (e.top + e.h)
    if (u < 0.42) {
      const v = u / 0.42
      return { gone: true, hinge: h0, theta: s * 0.13 * v * v, dust: v }
    }
    if (u <= 1) {
      const v = (u - 0.42) / 0.58
      return { gone: true, hinge: [xSide + s * 0.35 * v, h0[1] + drop * v * v], theta: s * (0.13 + 0.17 * v), dust: 1 }
    }
    const after = t - e.hit
    return { gone: true, hinge: [xSide + s * (0.35 + 0.2 * sm(after / 2.4)), h0[1] + drop + e.h * 1.15 * sm(after / 2.6)], theta: s * (0.3 + 0.08 * sm(after / 2.4)), dust: 1 }
  }
  if (u < 0.55) {
    const v = u / 0.55
    return { gone: true, hinge: h0, theta: s * 0.4 * v * v, dust: v }
  }
  const drop = tw.base - (e.top + e.h) + e.h * 0.32
  if (u <= 1) {
    const v = (u - 0.55) / 0.45
    return { gone: true, hinge: [xSide + s * 0.7 * v, h0[1] + drop * v * v], theta: s * (0.4 + 0.7 * Math.pow(v, 1.4)), dust: 1 }
  }
  const after = t - e.hit
  return { gone: true, hinge: [xSide + s * (0.7 + 0.25 * sm(after / 2)), h0[1] + drop + after * 1.1], theta: s * (1.1 + 0.15 * sm(after / 2)), dust: 1 }
}

/** The prologue's one sign: the cracked slab on tower 4 slips a little on bar 3 and hangs there, leaning. */
function crackAt(t: number): number {
  const u = t - CRACK.at
  return u < 0 ? 0 : 1 - Math.exp(-u / 0.16) * Math.cos(u * 13)
}

/** How much a tower moves with the camera: the middle distance less than the far city. */
const par = (tw: Tower): number => (tw.mid ? 0.08 : PARALLAX)
/** A tower's colour: the far city pale in the haze, the middle distance darker, with weight. */
function towerColor(tw: Tower): string {
  return tw.mid ? mixHex(MID_NEAR, CITY_NEAR, tw.far * 2) : mixHex(CITY_NEAR, CITY_FAR, tw.far)
}
const towerInk = (pen: Pen, tw: Tower, col: string): [number, string] => (tw.mid ? [0.7, mixHex(pen.ink, col, 0.25)] : [0.45, mixHex(pen.ink, col, 0.55)])

function drawTower(pen: Pen, tw: Tower, i: number, t: number, f: Frame): void {
  const col = towerColor(tw)
  const dx = f.cx * par(tw)
  const xl = tw.x - tw.w / 2 + dx
  const xr = tw.x + tw.w / 2 + dx
  if (xr < f.x0 - 2 || xl > f.x1 + 2) return
  const top = tw.top
  const topR = top + (tw.broken ?? 0)
  const notch = (side: 1 | -1) => {
    const gone = CALVING.filter((e) => e.tower === i && e.side === side && slabAt(e, t)?.gone)
    if (!gone.length) return null
    const topN = Math.min(...gone.map((e) => e.top))
    return { w: Math.max(...gone.map((e) => (e.off ?? 0) + e.w)), top: topN, h: Math.max(...gone.map((e) => e.top + e.h)) - topN }
  }
  const nl = notch(-1)
  const nr = notch(1)
  const pts: Pt[] = [[xl, tw.base]]
  const jag = (a: Pt, b: Pt, n: number, seed: number): Pt[] => {
    const out: Pt[] = []
    for (let j = 1; j < n; j++) {
      const q = j / n
      out.push([lerp(a[0], b[0], q) + (hash(seed, j, 3) - 0.5) * 0.14, lerp(a[1], b[1], q) + (hash(seed, j, 4) - 0.5) * 0.14])
    }
    return out
  }
  const whole = (n: { w: number } | null) => !!n && n.w >= tw.w - 0.06
  if (whole(nr) || whole(nl)) {
    // Its whole top is gone: a broken stump.
    const yb = Math.max(nr ? nr.top + nr.h : 0, nl ? nl.top + nl.h : 0)
    pts.push([xl, yb], ...jag([xl, yb], [xr, yb], 7, i * 10 + 5), [xr, yb])
  } else if (nl) {
    const yb = nl.top + nl.h
    pts.push([xl, yb], ...jag([xl, yb], [xl + nl.w, yb], 4, i * 10 + 1), [xl + nl.w, yb], ...jag([xl + nl.w, yb], [xl + nl.w, top], 5, i * 10 + 2))
    pts.push([xl + nl.w, nl.top > top + 0.05 ? nl.top : top])
  } else pts.push([xl, top])
  if (nr && !whole(nr) && !whole(nl)) {
    const yb = nr.top + nr.h
    const xn = xr - nr.w
    pts.push([xn, lerp(top, topR, (xn - xl) / (xr - xl))], ...jag([xn, top], [xn, yb], 5, i * 10 + 3), [xn, yb], ...jag([xn, yb], [xr, yb], 4, i * 10 + 4), [xr, yb])
  } else if (!nr && !whole(nl)) pts.push([xr, topR])
  pts.push([xr, tw.base])
  const ctx = ctxOf(pen.p)
  ctx.save()
  if (tw.lean) {
    const cx = (xl + xr) / 2
    ctx.translate(cx * pen.k, tw.base * pen.k)
    ctx.rotate(tw.lean)
    ctx.translate(-cx * pen.k, -tw.base * pen.k)
  }
  const [lw, ink] = towerInk(pen, tw, col)
  shape(pen, pts, col, lw, ink)
  // Its glass, in one of three manners (bands of floors, tall fins, a grid), clipped to what is left of it.
  if (pen.k * 0.5 > 3) {
    const glass = mixHex(LIMBO.glass, col, 0.45)
    const k = pen.k
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0] * k, pts[j][1] * k)
    ctx.closePath()
    ctx.clip()
    const manner = i % 3
    if (manner === 1) {
      for (let x = xl + 0.14; x < xr - 0.1; x += 0.34) box(pen, x, top + 0.25, x + 0.15, tw.base - 0.25, glass, 0)
    } else {
      const gap = manner === 0 ? 0.62 : 0.5
      for (let y = top + 0.3; y < tw.base - 0.3; y += gap) box(pen, xl + 0.12, y, xr - 0.12, y + (manner === 0 ? 0.2 : 0.26), glass, 0)
      if (manner === 2) for (let x = xl + 0.4; x < xr - 0.2; x += 0.4) box(pen, x, top, x + 0.05, tw.base, col, 0)
    }
    ctx.restore()
  }
  ctx.restore()
  // Its reflection in the far water, soft.
  vwash(pen, xl, xr, tw.base, tw.base + 0.5, [
    [0, col, 0.4],
    [1, col, 0],
  ])
}

function drawSlab(pen: Pen, e: Calving, t: number, f: Frame): void {
  const tw = CITY[e.tower]
  const s = slabAt(e, t)
  const dx = f.cx * par(tw)
  const col = towerColor(tw)
  const xSide = tw.x + (e.side * tw.w) / 2 - e.side * (e.off ?? 0) + dx
  if (xSide < f.x0 - 8 || xSide > f.x1 + 8) return
  // The slab as a box from the hinge (its bottom outer corner), turned about it.
  const local: Pt[] = [
    [0, 0],
    [-e.side * e.w, 0],
    [-e.side * e.w, -e.h],
    [0, -e.h],
  ]
  let hinge: Pt
  let theta: number
  if (!s) {
    // Still part of its tower: drawn only if it is the cracked one (leaning a little, the crack dark behind it).
    if (e !== CALVING[CRACK.slab]) return
    const c = crackAt(t)
    if (c <= 0) return
    hinge = [xSide, e.top + e.h + 0.22 * c]
    theta = e.side * 0.06 * c
    // The dust of it, where it slipped.
    const du = t - CRACK.at
    if (du < 3) soft(pen, xSide - e.side * e.w * 0.5, e.top + e.h * 0.5, e.w * 0.9, e.h * 0.35, mixHex(col, LIMBO.sky, 0.55), 0.45 * sm(du / 0.15) * Math.exp(-du / 1.1))
  } else {
    if (t > e.hit + 3.5) return
    hinge = [s.hinge[0] + dx, s.hinge[1]]
    theta = s.theta
    // Dust where it breaks away: along the break, for a great one, as it tears from the stump.
    if (s.dust < 1 || t < e.hit) {
      const a = 0.35 * Math.sin(Math.PI * Math.min(1, (t - (e.hit - e.fall)) / e.fall))
      if (e.big) {
        const yb = e.top + e.h
        soft(pen, xSide - e.side * e.w * 0.5, yb + 0.1, e.w * 0.85, 0.55, mixHex(col, LIMBO.sky, 0.55), a * 1.1)
      } else soft(pen, xSide - e.side * e.w * 0.5, e.top + e.h * 0.4, e.w * 0.9, e.h * 0.45, mixHex(col, LIMBO.sky, 0.5), a * 0.6)
    }
  }
  const pts = local.map(([x, y]): Pt => [hinge[0] + x * Math.cos(theta) - y * Math.sin(theta), hinge[1] + x * Math.sin(theta) + y * Math.cos(theta)])
  clipped(pen, f.x0 - 10, TOP_OF_SKY, f.x1 + 10, tw.base, () => {
    const [lw, ink] = towerInk(pen, tw, col)
    shape(pen, pts, col, lw, ink)
    // Its glass floors, turned with it.
    if (pen.k * 0.5 > 3) {
      const glass = mixHex(LIMBO.glass, col, 0.45)
      for (let y = -e.h + 0.3; y < -0.2; y += 0.62) {
        const band: Pt[] = [
          [-e.side * 0.1, y],
          [-e.side * (e.w - 0.1), y],
          [-e.side * (e.w - 0.1), y + 0.2],
          [-e.side * 0.1, y + 0.2],
        ].map(([x, yy]): Pt => [hinge[0] + x * Math.cos(theta) - yy * Math.sin(theta), hinge[1] + x * Math.sin(theta) + yy * Math.cos(theta)])
        shape(pen, band, glass, 0)
      }
    }
  })
  // The crack: a dark gap behind the slab that slipped in the prologue, opening wider before it goes.
  if (e === CALVING[CRACK.slab] && (!s || t < e.hit - e.fall * 0.5)) {
    const open = !s ? 0.04 * crackAt(t) : 0.04 + 0.1 * sm((t - (e.hit - e.fall)) / (e.fall * 0.45))
    const xi = xSide - e.side * e.w
    shape(
      pen,
      [
        [xi, e.top],
        [xi + e.side * open, e.top],
        [xi + e.side * open * 0.3, e.top + e.h],
        [xi, e.top + e.h],
      ],
      mixHex(pen.ink, col, 0.6),
      0,
    )
  }
}

/** The plume a slab throws up where it hits the water: big, slow, heavy. Soft volume only. */
function drawPlume(pen: Pen, e: Calving, t: number, f: Frame): void {
  const u = t - e.hit
  const tw = CITY[e.tower]
  const dx = f.cx * par(tw)
  const base = tw.base
  if (e.big) {
    if (u < 0 || u > 8) return
    // Where the face went in: under the tower, a little out on the side it leaned to.
    const x = tw.x + e.side * 0.3 + dx
    if (x < f.x0 - 12 || x > f.x1 + 12) return
    const H = Math.min(9, 0.95 * e.h + 1.4)
    const W = e.w * 0.7 + 0.7
    // It climbs (heavy: nearly a second), hangs, and falls back; the crown spreads and comes down in curtains.
    const rise = 1 - Math.exp(-u / 0.32)
    const back = u > 1.7 ? 0.5 * (u - 1.7) ** 2 : 0
    const top = Math.max(0, H * rise - back)
    const fade = u < 2.8 ? 1 : Math.exp(-(u - 2.8) / 1.7)
    // The column: narrow and white at its root, widening as it climbs; its far side in the shade of itself.
    for (let j = 0; j <= 9; j++) {
      const q = j / 9
      const rx = W * (0.34 + 0.34 * q) * (1 + 0.2 * sm(u / 2))
      soft(pen, x + rx * 0.35, base - top * q + 0.1, rx, 0.45 + 0.5 * q, SPRAY_SHADE, 0.45 * (1 - 0.25 * q) * fade)
    }
    for (let j = 0; j <= 9; j++) {
      const q = j / 9
      soft(pen, x - W * 0.06, base - top * q, W * (0.3 + 0.3 * q) * (1 + 0.2 * sm(u / 2)), 0.45 + 0.5 * q, SPRAY_NEAR, 0.85 * (1 - 0.25 * q) * fade)
    }
    // The crown: spreading like a fountain's, and coming back down in two curtains of spray at its edges.
    const crownY = base - top
    const spread = W * (0.55 + 1.15 * sm(u / 1.8))
    soft(pen, x, crownY + 0.25, spread, 0.75 + 0.3 * u, SPRAY_NEAR, 0.78 * fade)
    if (u > 0.5) {
      const len = Math.min(top * 0.95, 2.2 * (u - 0.5) ** 1.2)
      for (const side of [-1, 1]) soft(pen, x + side * spread * 0.78, crownY + 0.3 + len / 2, W * 0.32, len / 2 + 0.35, SPRAY, 0.6 * fade)
    }
    // White water boiling at its foot.
    soft(pen, x, base - 0.3, W * (0.9 + 1.4 * sm(u / 1.2)), 0.55, SPRAY_NEAR, 0.8 * fade)
    // The mist it leaves hanging, lingering.
    soft(pen, x, base - 1.0, W * (1.4 + 2.4 * sm(u / 3.5)), 1.2 + 0.45 * u, SPRAY, 0.5 * Math.exp(-u / 3.2) * sm(u / 0.3))
    // The swell running out from it across the water, both ways: a foaming crest, and the water stirred behind it.
    for (const side of [-1, 1]) {
      const xs = x + side * (W * 0.6 + 2.1 * u)
      soft(pen, xs, base + 0.05, 1.0, 0.07, LIMBO.foam, 0.65 * Math.exp(-u / 2.4) * sm(u / 0.25))
    }
    soft(pen, x, base + 0.1, W * (0.7 + 2.1 * u), 0.14, LIMBO.foam, 0.35 * Math.exp(-u / 2.2))
    return
  }
  if (u < 0 || u > 6) return
  const x = tw.x + (e.side * tw.w) / 2 - e.side * (e.off ?? 0) + e.side * (0.75 + e.h * 0.25) + dx
  if (x < f.x0 - 8 || x > f.x1 + 8) return
  const H = Math.min(6, 0.9 * e.h + 1.1)
  const rise = 1 - Math.exp(-u / 0.2)
  const hang = u < 0.8 ? 1 : Math.exp(-(u - 0.8) / 1.5)
  const W = e.w * 0.7 + 0.5
  for (let j = 0; j <= 6; j++) {
    const q = j / 6
    const fallBack = u > 0.7 ? 0.5 * (u - 0.7) ** 2 * q : 0
    const y = base - H * rise * q * hang + fallBack
    const spread = q * q * W * 0.9 * sm(u / 1.2)
    for (const side of j === 0 ? [0] : [-1, 1]) {
      soft(pen, x + side * spread, y, W * (0.45 + 0.6 * q) * (1 + 0.3 * sm(u / 2)), 0.55 + 0.5 * q + 0.3 * u, SPRAY, 0.7 * (1 - 0.4 * q) * hang)
    }
  }
  soft(pen, x, base - 0.6, W * (1.2 + 1.8 * sm(u / 3)), 0.9 + 0.5 * u, SPRAY, 0.5 * Math.exp(-u / 2.4) * sm(u / 0.2))
  soft(pen, x, base + 0.08, W * (0.8 + 2.4 * sm(u / 2.5)), 0.14, LIMBO.foam, 0.45 * Math.exp(-u / 2))
}

export function drawCity(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > SEA + 1 || f.y1 < 68) return
  // The far towers first (paler), then nearer ones over them.
  const order = CITY.map((_, i) => i).sort((a, b) => CITY[b].far - CITY[a].far)
  for (const i of order) {
    drawTower(pen, CITY[i], i, t, f)
    for (const e of CALVING) if (e.tower === i) drawSlab(pen, e, t, f)
  }
  for (const e of CALVING) drawPlume(pen, e, t, f)
}

/* ------------------------------------------------------------------ the near sea */

/** The sea's surface at x (the swell, and the breakers coming in on the chords). */
export function surface(x: number, t: number): number {
  const c = clock('limbo', t)
  const r = roughness(t)
  const out = Math.min(1, Math.max(0, (WATERLINE - x) / 2.5))
  const sw = 0.55 + 0.8 * r
  let y = SEA + sw * out * (0.07 * Math.sin(0.85 * x + 1.1 * c) + 0.04 * Math.sin(1.9 * x - 1.7 * c + 2) + 0.022 * Math.sin(3.4 * x + 2.6 * c))
  for (const tk of WAVES) {
    const ahead = tk - t
    if (ahead > 6.5 || ahead < -0.6) continue
    let xc: number
    let h: number
    let wf: number
    if (ahead >= 0) {
      xc = BREAK_X - CREST_V * ahead
      h = crestH(tk) * (0.2 + 0.8 * sm(1 - ahead / 5.5))
      wf = lerp(0.62, 0.24, sm(1 - ahead / 2.5))
    } else {
      const u = -ahead / 0.6
      xc = BREAK_X + 0.3 * u
      h = crestH(tk) * (1 - u) * (1 - u)
      wf = 0.24
    }
    const d = x - xc
    const shapeV = d < 0 ? Math.exp(-((d / 1.25) ** 2)) : Math.exp(-((d / wf) ** 2))
    y -= h * shapeV
  }
  return y
}

/** Where the sea's surface meets the sand (the swash aside), for drawing the water only as far as it goes. */
const SHORE_END = WATERLINE + 0.9

export function drawSea(pen: Pen, t: number, f: Frame): void {
  if (f.x0 > SHORE_END || f.y0 > BOTTOM || f.y1 < SEA - 2) return
  const xa = f.x0 - 1
  const xb = Math.min(f.x1 + 1, SHORE_END)
  const step = Math.max(0.12, (xb - xa) / 160)
  const top: Pt[] = []
  for (let x = xa; x <= xb + 1e-9; x += step) top.push([x, surface(x, t)])
  const body: Pt[] = [...top, [xb, BOTTOM], [xa, BOTTOM]]
  gradFill(pen, body, SEA - 0.7, SEA + 7, [
    [0, mixHex(NEAR_SEA, LIMBO.sky, 0.15), 1],
    [0.1, NEAR_SEA, 1],
    [0.45, mixHex(NEAR_SEA, LIMBO.seaDeep, 0.7), 1],
    [1, LIMBO.seaDeep, 1],
  ])
  // The sky in the surface: a pale skin along it, brightest on the swells' backs.
  const skin: Pt[] = [...top, ...top.slice().reverse().map(([x, y]): Pt => [x, y + 0.11])]
  gradFill(pen, skin, SEA - 0.7, SEA + 0.2, [
    [0, LIMBO.foam, 0.7],
    [0.6, LIMBO.sky, 0.45],
    [1, LIMBO.sky, 0.3],
  ])
  const glint: Pt[] = [...top, ...top.slice().reverse().map(([x, y]): Pt => [x, y + 0.035])]
  wash(pen, glint, LIMBO.foam, 0.45)
  // Foam on the breakers' crests as they rise to break.
  for (const tk of WAVES) {
    const ahead = tk - t
    if (ahead > 1.4 || ahead < 0) continue
    const xc = BREAK_X - CREST_V * ahead
    const y = surface(xc + 0.08, t)
    soft(pen, xc + 0.1, y + 0.03, 0.3 + 0.4 * crestH(tk), 0.1, LIMBO.foam, 0.75 * sm(1 - ahead / 1.4))
  }
}

/** The ground: the seabed under the sea, the shore, and the earth down to the level's bottom. */
export function drawGround(pen: Pen, f: Frame): void {
  if (f.y1 < GROUND - 1 || f.y0 > BOTTOM) return
  const xa = f.x0 - 1
  const xb = f.x1 + 1
  const step = Math.max(0.15, (xb - xa) / 140)
  const top: Pt[] = []
  for (let x = xa; x <= xb + 1e-9; x += step) top.push([x, sandY(x)])
  gradFill(pen, [...top, [xb, BOTTOM], [xa, BOTTOM]], GROUND, BOTTOM, [
    [0, mixHex(LIMBO.sand, LIMBO.sandWet, 0.35), 1],
    [0.18, mixHex(LIMBO.sandWet, EARTH, 0.3), 1],
    [0.5, EARTH, 1],
    [0.8, EARTH_DEEP, 1],
    [1, SLEEP.deep, 1],
  ])
  // The surface: sand on the shore (wet near the water), the seabed under the sea.
  const band = (x0: number, x1: number, col: string, a: number, th: number) => {
    const lo = Math.max(xa, x0)
    const hi = Math.min(xb, x1)
    if (hi <= lo) return
    const pts: Pt[] = []
    for (let x = lo; x <= hi + 1e-9; x += step) pts.push([x, sandY(x)])
    pts.push([hi, sandY(hi)])
    wash(pen, [...pts, ...pts.slice().reverse().map(([x, y]): Pt => [x, y + th])], col, a)
  }
  // The seabed's skin and the sand's cross-fade under the water's edge, so the shore runs down into the sea and is
  // not cut off square at the waterline (the sea over it is clear enough to show a square end).
  const M = 0.35
  const fade = (x0: number, x1: number, col: string, th: number, a0: number, a1: number) => {
    const lo = Math.max(xa, x0)
    const hi = Math.min(xb, x1)
    if (hi <= lo) return
    const pts: Pt[] = []
    for (let x = lo; x <= hi + 1e-9; x += Math.min(step, 0.05)) pts.push([x, sandY(x)])
    pts.push([hi, sandY(hi)])
    hgradFill(pen, [...pts, ...pts.slice().reverse().map(([x, y]): Pt => [x, y + th])], x0, x1, [
      [0, col, a0],
      [1, col, a1],
    ])
  }
  band(-200, WATERLINE - M + 0.06, SEABED_TOP, 1, 0.45)
  fade(WATERLINE - M, WATERLINE + M, SEABED_TOP, 0.45, 1, 0)
  band(WATERLINE + M - 0.06, 200, LIMBO.sand, 1, 0.34)
  fade(WATERLINE - M, WATERLINE + M, LIMBO.sand, 0.34, 0, 1)
  fade(WATERLINE - M - 0.1, WATERLINE - 0.1, LIMBO.sandWet, 0.36, 0, 0.9)
  {
    const lo = Math.max(xa, WATERLINE - 0.1)
    const hi = Math.min(xb, -3.6)
    if (hi > lo) {
      const pts: Pt[] = []
      for (let x = lo; x <= hi + 1e-9; x += step) pts.push([x, sandY(x)])
      pts.push([hi, sandY(hi)])
      hgradFill(pen, [...pts, ...pts.slice().reverse().map(([x, y]): Pt => [x, y + 0.36])], WATERLINE - 0.1, -3.6, [
        [0, LIMBO.sandWet, 0.9],
        [0.45, LIMBO.sandWet, 0.6],
        [1, LIMBO.sandWet, 0],
      ])
    }
  }
  // The wet sand holds the sky: a faint shine, and far off the warmth of the lit window high up.
  {
    const pts: Pt[] = []
    for (let x = Math.max(xa, WATERLINE); x <= Math.min(xb, -4.2); x += step) pts.push([x, sandY(x)])
    if (pts.length > 1)
      hgradFill(pen, [...pts, ...pts.slice().reverse().map(([x, y]): Pt => [x, y + 0.05])], WATERLINE, -4.2, [
        [0, LIMBO.sky, 0.35],
        [1, LIMBO.sky, 0],
      ])
  }
  soft(pen, -5.0, sandY(-5.0) + 0.02, 0.9, 0.05, LIMBO.lamp, 0.28)
  // The shore's edge, lightly inked above the water.
  const edge = top.filter(([x]) => x > WATERLINE - 0.05)
  if (edge.length > 1) polyline(pen, edge, mixHex(pen.ink, LIMBO.sand, 0.5), 0.5)
}

/** Drawn over the balls: the sea's body (so what is under the water is seen through it), the wash, the foam. */
export function drawSeaOver(pen: Pen, t: number, f: Frame): void {
  if (f.x0 > SHORE_END + 3 || f.y0 > BOTTOM || f.y1 < SEA - 2) return
  const xa = f.x0 - 1
  const xb = Math.min(f.x1 + 1, SHORE_END)
  if (xb > xa) {
    const step = Math.max(0.12, (xb - xa) / 160)
    const top: Pt[] = []
    const bed: Pt[] = []
    for (let x = xa; x <= xb + 1e-9; x += step) {
      const s = surface(x, t)
      const b = Math.max(s, sandY(x))
      top.push([x, s])
      bed.push([x, b])
    }
    gradFill(pen, [...top, ...bed.reverse()], SEA - 0.5, SEA + 4, [
      [0, LIMBO.sea, 0.28],
      [0.2, LIMBO.sea, 0.5],
      [1, LIMBO.seaDeep, 0.72],
    ])
  }
  // A haze of spray hangs in the air over the surf.
  const lv = roughness(t)
  soft(pen, BREAK_X + 0.9, SEA - 0.45, 2.6, 0.75, LIMBO.foam, 0.07 + 0.1 * lv)
  // The breakers' foam as they collapse, and the wash running up the sand.
  for (const tk of WAVES) {
    const u = t - tk
    if (u < 0 || u > UPRUSH + BACKWASH) continue
    const r = crestH(tk)
    if (u < 1.6) {
      const grow = sm(u / 0.5)
      const a = 0.75 * Math.exp(-u / 0.55) * (0.6 + r)
      soft(pen, BREAK_X + 0.25 + 0.55 * grow, SEA - 0.1 - 0.22 * sm(u / 0.25) * (1 - sm((u - 0.25) / 0.9)), 0.45 + 0.75 * grow, 0.2 + 0.14 * grow, LIMBO.foam, a)
      for (let j = 0; j < 3; j++) {
        const v = u / 0.9
        if (v > 1) break
        const sx = BREAK_X + 0.3 + (0.4 + 0.3 * j) * v
        const sy = SEA - 0.2 - (0.25 + 0.12 * j) * Math.sin(Math.PI * v) * (0.5 + r)
        soft(pen, sx, sy, 0.12 + 0.05 * j, 0.08, LIMBO.foam, 0.5 * (1 - v))
      }
    }
    const front = washFront(tk, t)
    if (front === null) continue
    const x0 = Math.max(BREAK_X, WATERLINE - 0.35)
    if (front <= x0 + 0.05) continue
    const up = u <= UPRUSH
    const D = up ? 0.13 : 0.13 * (1 - sm((u - UPRUSH) / BACKWASH)) + 0.02
    const pts: Pt[] = []
    const n = 18
    for (let j = 0; j <= n; j++) {
      const x = x0 + ((front - x0) * j) / n
      const q = (x - x0) / (front - x0)
      pts.push([x, sandY(x) - D * Math.pow(1 - q, 0.55)])
    }
    const bottom: Pt[] = []
    for (let j = n; j >= 0; j--) {
      const x = x0 + ((front - x0) * j) / n
      bottom.push([x, sandY(x) + 0.01])
    }
    wash(pen, [...pts, ...bottom], LIMBO.sea, up ? 0.55 : 0.4)
    // The lace of foam on it, and at its running edge.
    const lace: Pt[] = [...pts, ...pts.slice().reverse().map(([x, y]): Pt => [x, y + 0.035])]
    wash(pen, lace, LIMBO.foam, up ? 0.5 : 0.25)
    soft(pen, front - 0.1, sandY(front) - 0.035, 0.28, 0.055, LIMBO.foam, up ? 0.7 : 0.3)
  }
}

/* ------------------------------------------------------------------ the garden and the house */

const WALL = mixHex(LIMBO.house, LIMBO.concrete, 0.35)
/** The garden wall's face in its own shade (the low sun is behind it), and its coping, lit along the top. */
const WALL_SHADE = mixHex(WALL, LIMBO.gardenDark, 0.32)
const COPING = mixHex(LIMBO.house, LIMBO.skyWarm, 0.55)
const LEAVES = mixHex(LIMBO.gardenDark, LIMBO.sky, 0.12)
const LEAVES_LIT = mixHex(LIMBO.garden, LIMBO.skyWarm, 0.28)
const BARK = mixHex(LIMBO.roof, LIMBO.gardenDark, 0.35)
const LAWN = LIMBO.garden
const LAWN_GLOW = mixHex(LIMBO.garden, LIMBO.skyWarm, 0.55)

/** A mass of foliage: one flat shape with a leafy edge, stirring on limbo's clock. `flat` sits it on its base. */
function foliage(pen: Pen, cx: number, cy: number, rx: number, ry: number, seed: number, c: number, fill: string, flat = false, lw = 0.6): void {
  const pts: Pt[] = []
  const n = 30
  for (let j = 0; j < n; j++) {
    const a = flat ? Math.PI + (j / (n - 1)) * Math.PI : (j / n) * Math.PI * 2
    const r = 1 + 0.08 * Math.sin(a * 6 + seed) + 0.05 * Math.sin(a * 11 + seed * 2.3) + 0.02 * Math.sin(a * 4 + c * 0.9 + seed)
    pts.push([cx + Math.cos(a) * rx * r + 0.02 * Math.sin(c * 0.7 + seed) * (1 - Math.sin(a)), cy + Math.sin(a) * ry * r])
  }
  if (flat) pts.push([cx + rx, cy], [cx - rx, cy])
  shape(pen, pts, fill, lw, mixHex(pen.ink, fill, 0.35))
}

/** The swing's angle from hanging straight (radians): nobody on it; the evening air stirs it a little. */
export const swingAngle = (t: number): number => {
  const c = clock('limbo', t)
  return 0.06 * Math.sin((2 * Math.PI * c) / 3.1) + 0.025 * Math.sin((2 * Math.PI * c) / 4.9 + 1.3)
}

export function drawGarden(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < GARDEN.x0 - 1 || f.x0 > HOUSE.x1 + 3 || f.y1 < HOUSE.ridge - 2 || f.y0 > GROUND + 1) return
  const c = clock('limbo', t)
  const x0 = GARDEN.x0
  const x1 = GARDEN.x1
  // The house at the garden's end: pale, a pitched roof, its back door onto the garden, its windows dark.
  shape(
    pen,
    [
      [HOUSE.x0 - 0.2, HOUSE.eaves],
      [(HOUSE.x0 + HOUSE.x1) / 2, HOUSE.ridge],
      [HOUSE.x1 + 0.2, HOUSE.eaves],
    ],
    LIMBO.roof,
    0.8,
  )
  box(pen, HOUSE.x0, HOUSE.eaves, HOUSE.x1, GROUND, LIMBO.house, 0.8)
  const dark = mixHex(LIMBO.roof, pen.ink, 0.35)
  box(pen, HOUSE.x0 + 0.35, GROUND - 1.25, HOUSE.x0 + 0.85, GROUND, dark, 0.6)
  for (const wx of [HOUSE.x0 + 1.4, HOUSE.x0 + 2.5]) {
    box(pen, wx, HOUSE.eaves + 0.35, wx + 0.55, HOUSE.eaves + 1.05, mixHex(dark, LIMBO.sky, 0.25), 0.6)
    box(pen, wx, GROUND - 1.35, wx + 0.55, GROUND - 0.6, mixHex(dark, LIMBO.sky, 0.25), 0.6)
  }
  box(pen, HOUSE.x0 - 0.1, GROUND - 0.12, HOUSE.x0 + 1.05, GROUND, LIMBO.house, 0.5)
  // The low sun behind the children, over the wall: his memory of the garden has its own light, and it comes up when
  // we look at them, the far city dissolving in it.
  const mem = memory(t)
  soft(pen, SUN_AT[0], SUN_AT[1], 2.6 + 1.6 * mem, 1.5 + 1.0 * mem, LIMBO.skyWarm, 0.5 + 0.45 * mem)
  soft(pen, SUN_AT[0], SUN_AT[1] + 0.15, 1.0 + 0.5 * mem, 0.55 + 0.25 * mem, LIMBO.lamp, 0.55 + 0.35 * mem)
  if (mem > 0.01) soft(pen, SUN_AT[0], SUN_AT[1] - 0.6, 7.5, 3.4, LIMBO.foam, 0.6 * mem)
  // The wall round the garden, in its own shade; its coping catching the sun along its top.
  vwash(pen, x0, x1, GARDEN.wallTop, GARDEN.back, [
    [0, WALL_SHADE, 1],
    [1, mixHex(WALL_SHADE, LIMBO.gardenDark, 0.3), 1],
  ])
  line(pen, [x1, GARDEN.wallTop], [x1, GARDEN.back], mixHex(pen.ink, WALL_SHADE, 0.3), 0.5)
  box(pen, x0, GARDEN.wallTop - 0.08, x1 + 0.04, GARDEN.wallTop, COPING, 0.6)
  // The sun's light on the coping, strongest behind them.
  vwash(pen, SUN_AT[0] - 1.6, SUN_AT[0] + 1.6, GARDEN.wallTop - 0.08, GARDEN.wallTop + 0.25, [
    [0, LIMBO.lamp, 0.45],
    [1, LIMBO.lamp, 0],
  ])
  // Shrubs of a few sizes at its foot.
  const shrubs: [number, number, number][] = [
    [SWING.x - 3.0, 0.55, 0.42],
    [SWING.x - 1.57, 0.9, 0.55],
    [SWING.x + 1.98, 1.1, 0.72],
  ]
  shrubs.forEach(([cx, rx, ry], i) => foliage(pen, cx, GARDEN.back + 0.03, rx, ry, i * 1.9, c, LEAVES, true, 0.5))
  // The lawn, running back to the wall's foot, glowing where the low sun comes through the grass behind them.
  vwash(pen, x0, x1, GARDEN.back, GROUND, [
    [0, mixHex(LAWN, LIMBO.gardenDark, 0.45), 1],
    [0.4, LAWN, 1],
    [1, LAWN, 1],
  ])
  soft(pen, SUN_AT[0], GARDEN.back + 0.12, 3.0, 0.22, LAWN_GLOW, 0.75 + 0.25 * mem)
  // The lawn comes on toward us to the ground's line, a lip of it over the sand (no further: carried down onto the
  // beach it read as a green patch pasted on it, below the line the house stands on).
  vwash(pen, x0, x1, GROUND - 0.01, GROUND + 0.18, [
    [0, mixHex(LAWN, LAWN_GLOW, 0.15), 1],
    [0.3, LAWN, 1],
    [0.6, mixHex(LAWN, LIMBO.gardenDark, 0.6), 0.75],
    [1, mixHex(LIMBO.gardenDark, LIMBO.sandWet, 0.5), 0],
  ])
  // The tree: a trunk from the lawn, a bough reaching left over it for the swing, and its crown, stirring.
  const X = TREE.x
  const [sx, sy] = [SWING.x, SWING.hang]
  const g = GROUND - 0.13
  foliage(pen, X + 0.4, g - 3.6, 2.6, 1.3, 1.3, c, mixHex(LEAVES, pen.ink, 0.16))
  shape(
    pen,
    [
      [X - 0.28, g - 0.16],
      [X - 0.15, g - 0.34],
      [X - 0.13, g - 1.62],
      [X - 0.28, g - 1.92],
      [sx + 0.3, sy - 0.07],
      [sx - 0.3, sy - 0.1],
      [sx - 0.28, sy + 0.02],
      [sx + 0.3, sy + 0.05],
      [X - 0.22, g - 1.78],
      [X - 0.02, g - 1.72],
      [X + 0.12, g - 2.7],
      [X + 0.26, g - 2.7],
      [X + 0.15, g - 1.62],
      [X + 0.17, g - 0.34],
      [X + 0.32, g - 0.16],
    ],
    BARK,
    0.8,
  )
  foliage(pen, X + 0.6, g - 3.45, 2.25, 1.08, 4.1, c, LEAVES)
  // Its lower leaves, lit from under by the low sun.
  foliage(pen, X - 0.5, g - 2.78, 1.3, 0.48, 2.2, c, mixHex(LEAVES, LEAVES_LIT, 0.55))
  foliage(pen, X + 1.5, g - 2.72, 1.0, 0.42, 5.2, c, mixHex(LEAVES, LEAVES_LIT, 0.4))
  // The swing: two ropes from the bough and a plank seat, moving a little.
  const a = swingAngle(t)
  const L = SWING.rope
  const px = sx + Math.sin(a) * L
  const py = sy + Math.cos(a) * L
  for (const d of [-0.18, 0.18]) line(pen, [sx + d, sy], [px + d, py], pen.ink, 0.5)
  box(pen, px - 0.26, py - 0.03, px + 0.26, py + 0.045, LIMBO.table, 0.6)
}

/** The shadow of the ball-sized things on the lawn is nothing: the light is low. A soft dusk over the garden instead. */
export function drawGardenAir(pen: Pen, _t: number, f: Frame): void {
  if (f.x1 < GARDEN.x0 || f.x0 > HOUSE.x1) return
  vwash(pen, GARDEN.x0, HOUSE.x1 + 0.4, GROUND - 1.2, GROUND, [
    [0, LIMBO.sky, 0],
    [1, LIMBO.seaDeep, 0.12],
  ])
}

