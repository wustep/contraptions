import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { drawShell, shellHalf } from '../cast'
import { box, frame, hash, scenery } from '../kit'
import { BURST1, pulse } from '../music'
import { VALLEY } from '../worlds'
import { CAMP_PROPS, drawPad, drawRoad, PAD } from './camp'
import { BELLY, MEADOW, SHELL_H, SHELL_W, SHELL_X, SLOT_W } from './geo'
import { band, clamp01, fbm, lerp, lobe, lobeR, rgbOf, sm, softBeam, vnoise } from './set-air'

/**
 * The valley's standing set (the valley builder's; the lift part plays in it): Montana under low cloud.
 *
 * Seen side on, and in depth. The meadow and the hills either side of it stand in the world's own plane, where the
 * balls roll, the helicopter flies and the shell hangs. Behind them the valley goes back in four layers of land, each
 * farther and paler (the air between), mist lying in the folds between them, up to a far range whose tops are in the
 * cloud. The layers are drawn in perspective about the frame's middle: one `d` deep moves (1 - 1/d) as far as the
 * camera does, so the far range hardly moves and the horizon stays at the camera's own height. They are composed for
 * the great wide of the flight (`REVEAL`), where they are exactly where they are drawn here.
 *
 * The fog pours over the ridges like a slow waterfall: over the far range's saddles, and, the hero of it, over the
 * near ridge on the left: the bank of cloud piled on it, which the helicopter comes out of. A band of fog hangs under
 * the shell's belly, 7 to 9 cells over the meadow. By show time the slot opens in six steps on the first burst; at
 * the end the shell rises into the cloud and goes to vapour, the cloud opens over the valley and the fog lifts.
 */

/** The great wide of the flight: where the camera looks, and how much it shows, when the shell is revealed. */
export const REVEAL = { at: [-45, -82] as Pt, cells: 200 }
/** The reveal's pulse (68): the helicopter tops the ridge and the shell comes clear of the mist. */
const REVEAL_AT = pulse(68)

/** Everything the set draws, in valley cells. */
export const VALLEY_BOX = { x0: -250, y0: -240, x1: 170, y1: 40 }

/* ------------------------------------------------------------------ the shell by show time */

/** The slot, 0 shut .. 1 open: a step on each of the first burst's six hard pulses, each quick and settling. */
export function slotAt(t: number): number {
  let v = 0
  for (const at of BURST1) {
    const u = t - at
    if (u <= 0) continue
    // Quick (70 ms), a small overshoot, and settled within a third of a second.
    const step = sm(u, 0, 0.07) + 0.12 * Math.sin(Math.min(Math.PI, u * 14)) * Math.exp(-u / 0.09) * (u > 0.07 ? 1 : 0)
    v += step / BURST1.length
  }
  return clamp01(v)
}

/** When the departure starts: the shell's first lift, on a pulse (780). */
export const DEPART = 186.288
/** How far the shell has risen (cells, up is negative): a first start on the pulse, then slowly, gathering. */
export function riseAt(t: number): number {
  const u = t - DEPART
  if (u <= 0) return 0
  const start = 0.6 * (1 - Math.exp(-u / 0.35))
  const climb = 44 * Math.pow(sm(u, 0.15, 8.5), 1.35)
  return -(start + climb)
}
/**
 * How far the shell has gone (drawn with `goes: 'fade'`: it pales into the air as a whole, no line anywhere): from
 * soon after it starts up, even, gone by ~194.2. The cloud it rises into takes it from the top meanwhile.
 */
export function vanishAt(t: number): number {
  return clamp01((t - (DEPART + 0.7)) / 7.2)
}
/** How far the cloud has opened over the valley where it went, and the fog lifted off it: 0 .. 1. */
export function openAt(t: number): number {
  return sm(t, DEPART + 3.0, DEPART + 9.6)
}
/** The low cloud it goes up into: there from the cut back into the valley. */
const deckAt = (t: number) => sm(t, DEPART - 1.25, DEPART - 0.3)
/** The underside of that cloud, at x: lowering a little as it takes the shell. */
const deckUnder = (x: number, t: number) => -142 + 40 * sm(t, DEPART, DEPART + 6.2) + 11 * (fbm(x / 22 + t * 0.012, 53) - 0.5)

/* ------------------------------------------------------------------ the land */

/** A bump of height 1 at `c`, `w` wide. */
const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2))
/** Ridged noise: sharp crests, round troughs, in [0, 1]. */
const ridged = (x: number, seed: number) => 1 - Math.abs(2 * vnoise(x, seed) - 1)

/**
 * The near land's surface (the world's own plane): the flat meadow from x -48 to 55, the near ridge rising on the
 * left to its crest at -68 (the one the helicopter comes over), lower land behind it, the right hills rising to 105,
 * and more beyond both.
 */
export function hillY(x: number): number {
  const left = 28 * sm(-x, 48, 68) - 8 * bump(x, -92, 14) * sm(-x, 68, 76) + 12 * sm(-x, 115, 175) + 22 * sm(-x, 185, 260)
  const right = 36 * sm(x, 55, 106) - 7 * bump(x, 128, 12) * sm(x, 106, 114) + 22 * sm(x, 132, 190)
  const grain = (5 * fbm(x / 11, 3) - 2.5) * (sm(-x, 50, 62) + sm(x, 57, 70))
  return MEADOW - Math.max(0, left + right + grain)
}

interface Layer {
  /** How deep: 1 is the world's plane. */
  d: number
  color: string
  /** Its ridgeline in the great wide's own coordinates. */
  ridge: (x: number) => number
  /** Where fog pours over it: at x (the wide's), how wide, how far down. */
  pours: { x: number; w: number; drop: number; seed: number }[]
}
/** Where a layer `d` deep puts its valley floor in the great wide. */
const floorOf = (d: number) => REVEAL.at[1] + (MEADOW - REVEAL.at[1]) / d

const LAYERS: Layer[] = [
  {
    // The far range, its peaks in the cloud, fog pouring through its saddles.
    d: 6,
    color: mixHex(VALLEY.ridgeFar, VALLEY.sky, 0.46),
    ridge: (x) =>
      floorOf(6) -
      (20 + 22 * ridged(x / 22 + 3, 9) + 18 * fbm(x / 60, 19) - 16 * bump(x, -58, 12) - 13 * bump(x, 70, 11) - 8 * bump(x, 150, 14) + 14 * sm(Math.abs(x + 30), 90, 200)),
    pours: [
      { x: -58, w: 26, drop: 16, seed: 1 },
      { x: 70, w: 22, drop: 15, seed: 2 },
      { x: 150, w: 20, drop: 12, seed: 5 },
    ],
  },
  {
    d: 2.8,
    color: mixHex(mixHex(VALLEY.ridge, VALLEY.ridgeFar, 0.55), VALLEY.sky, 0.3),
    ridge: (x) =>
      floorOf(2.8) - (10 + 12 * ridged(x / 17 + 7, 5) + 12 * fbm(x / 40, 6) + 16 * sm(Math.abs(x + 10), 55, 170) - 10 * bump(x, -104, 9) - 8 * bump(x, 50, 8)),
    pours: [
      { x: -104, w: 18, drop: 13, seed: 3 },
      { x: 50, w: 16, drop: 11, seed: 4 },
    ],
  },
  {
    d: 1.7,
    color: mixHex(VALLEY.ridge, VALLEY.sky, 0.14),
    ridge: (x) => floorOf(1.7) - (2 + 5 * fbm(x / 16, 11) + 34 * sm(-x, 80, 175) + 32 * sm(x, 32, 118) + 6 * ridged(x / 14, 12) * sm(Math.abs(x), 40, 120)),
    pours: [],
  },
  {
    d: 1.25,
    color: mixHex(mixHex(VALLEY.hill, VALLEY.ridge, 0.4), VALLEY.sky, 0.06),
    ridge: (x) => floorOf(1.25) - (1 + 3 * fbm(x / 12, 13) + 28 * sm(-x, 112, 200) + 26 * sm(x, 66, 128)),
    pours: [],
  },
]

/** A layer's shift from where the great wide has it, for a camera at (cx, cy): perspective, as a slide. */
const shiftOf = (d: number, cx: number, cy: number): Pt => {
  const q = 1 - 1 / d
  return [q * (cx - REVEAL.at[0]), q * (cy - REVEAL.at[1])]
}

type F = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/** How much of the far land the ground mist takes, for a camera at height `cy`: none from the air, most from the meadow. */
const lowHaze = (cy: number) => 0.7 * sm(cy, -16, -2.5)

function drawLayer(ctx: CanvasRenderingContext2D, k: number, f: F, L: Layer, air: string, openNow = 0): void {
  const [sx, sy] = shiftOf(L.d, f.cx, f.cy)
  const n = 180
  const bottom = f.y1 + 1
  // Seen from low down, through the mist lying on the valley floor, the far land is paler still: from the meadow
  // itself the far distance is all but lost in it, and there is only the air over the near land.
  // And once the cloud has opened at the end, the air is lit: the far land paler in it.
  const low = Math.min(0.9, lowHaze(f.cy) * Math.min(1, (1 - 1 / L.d) * 1.25) + 0.12 * openNow)
  ctx.fillStyle = mixHex(L.color, air, low)
  ctx.beginPath()
  ctx.moveTo((f.x0 - 1) * k, bottom * k)
  for (let i = 0; i <= n; i++) {
    const x = f.x0 - 1 + ((f.x1 - f.x0 + 2) * i) / n
    const y = L.ridge(x - sx) + sy
    ctx.lineTo(x * k, Math.min(bottom, y) * k)
  }
  ctx.lineTo((f.x1 + 1) * k, bottom * k)
  ctx.closePath()
  ctx.fill()
}

/**
 * The rest of the camp, farther up the valley on the second layer's floor: tents, a truck, a light tower, a mast, as
 * soft silhouettes in the air between (seen from the meadow behind the near camp; specks in the wide).
 */
const FAR_CAMP: { kind: 'tent' | 'truck' | 'tower'; x: number; len: number }[] = [
  { kind: 'tent', x: -41, len: 7.6 },
  { kind: 'tent', x: -36.5, len: 5.5 },
  { kind: 'truck', x: -33.2, len: 5.5 },
  { kind: 'truck', x: -22, len: 5.5 },
  { kind: 'tower', x: -18.6, len: 0 },
  { kind: 'tent', x: -17, len: 6.5 },
  { kind: 'tent', x: -12.5, len: 7 },
]
const FAR_D = 3.2
function drawFarCamp(ctx: CanvasRenderingContext2D, k: number, f: F, air: string): void {
  const [sx, sy] = shiftOf(FAR_D, f.cx, f.cy)
  const s = 1 / FAR_D
  const y0 = floorOf(FAR_D) + sy + 0.1 * s
  if (y0 - 8 * s > f.y1 || y0 < f.y0) return
  // It stands on the valley floor in front of the near hills, small with distance: so it is hazed a little less than
  // the hill behind it, never more (paler than the land behind, it read as pale boxes floating on the hill).
  const behind = LAYERS[LAYERS.length - 1].d
  const low = 0.85 * Math.min(0.9, lowHaze(f.cy) * Math.min(1, (1 - 1 / behind) * 1.25))
  // Seen only from down on the meadow (from the air it is specks, and hidden by the shell).
  const seen = sm(f.cy, -24, -10)
  if (seen <= 0.01) return
  ctx.save()
  ctx.globalAlpha *= seen
  ctx.fillStyle = mixHex(mixHex(VALLEY.ridge, VALLEY.oliveDark, 0.6), air, 0.12 + low)
  for (const it of FAR_CAMP) {
    const x0 = it.x + sx
    if (x0 + 9 * s < f.x0 || x0 > f.x1) continue
    const X = (u: number) => (x0 + u * s) * k
    const Y = (v: number) => (y0 - v * s) * k
    ctx.beginPath()
    if (it.kind === 'tent') {
      ctx.moveTo(X(0), Y(0))
      ctx.lineTo(X(0), Y(1.25))
      ctx.lineTo(X(0.9), Y(2.45))
      ctx.lineTo(X(it.len - 0.9), Y(2.45))
      ctx.lineTo(X(it.len), Y(1.25))
      ctx.lineTo(X(it.len), Y(0))
    } else if (it.kind === 'truck') {
      ctx.moveTo(X(0), Y(0.2))
      ctx.lineTo(X(0), Y(2.35))
      ctx.lineTo(X(0.25), Y(2.55))
      ctx.lineTo(X(3.2), Y(2.55))
      ctx.lineTo(X(3.4), Y(2.35))
      ctx.lineTo(X(3.55), Y(2.25))
      ctx.lineTo(X(4.6), Y(2.25))
      ctx.lineTo(X(4.6), Y(1.6))
      ctx.lineTo(X(5.5), Y(1.5))
      ctx.lineTo(X(5.5), Y(0.2))
    } else {
      ctx.moveTo(X(-0.12), Y(0))
      ctx.lineTo(X(-0.12), Y(7.2))
      ctx.lineTo(X(-0.6), Y(7.2))
      ctx.lineTo(X(-0.6), Y(7.8))
      ctx.lineTo(X(0.6), Y(7.8))
      ctx.lineTo(X(0.6), Y(7.2))
      ctx.lineTo(X(0.12), Y(7.2))
      ctx.lineTo(X(0.12), Y(0))
    }
    ctx.closePath()
    ctx.fill()
    // A tent's roof and a truck's canvas catch the sky: a paler band, so they read as things and not as blocks.
    if (it.kind !== 'tower') {
      const body: string = String(ctx.fillStyle)
      ctx.fillStyle = mixHex(body, air, 0.2)
      ctx.beginPath()
      if (it.kind === 'tent') {
        ctx.moveTo(X(0.06), Y(1.25))
        ctx.lineTo(X(0.92), Y(2.4))
        ctx.lineTo(X(it.len - 0.92), Y(2.4))
        ctx.lineTo(X(it.len - 0.06), Y(1.25))
      } else {
        ctx.moveTo(X(0.05), Y(1.1))
        ctx.lineTo(X(0.05), Y(2.3))
        ctx.lineTo(X(3.35), Y(2.3))
        ctx.lineTo(X(3.35), Y(1.1))
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = body
    }
  }
  ctx.restore()
}

/** Mist lying in the valley's fold at a layer's foot: a soft band, a few slow swells along it. */
function drawFold(ctx: CanvasRenderingContext2D, k: number, f: F, L: Layer, t: number, a: number): void {
  const [sx, sy] = shiftOf(L.d, f.cx, f.cy)
  const y = floorOf(L.d) + sy
  const thick = 2 + 5 / L.d
  a *= 1 - lowHaze(f.cy) * 0.85
  if (y - thick * 2 > f.y1 || y + thick < f.y0 || a <= 0.01) return
  const fog = rgbOf(VALLEY.fog)
  // Lying in the fold as long soft swells, never an even stripe: thick in places, gone in others.
  const g = 9
  const drift = t * 0.2 + sx
  const i0 = Math.floor((f.x0 - 30 - drift) / g)
  const i1 = Math.ceil((f.x1 + 30 - drift) / g)
  if (i1 - i0 > 90) return
  for (let i = i0; i <= i1; i++) {
    const x = i * g + drift + (hash(i, L.d * 10, 3) - 0.5) * g
    const swell = Math.pow(vnoise(x / 40 - sx / 40 + L.d * 3, 71), 1.5)
    const r = 14 + 12 * hash(i, L.d * 10, 4)
    lobe(ctx, k, x, y - thick * (0.3 + 0.5 * hash(i, L.d * 10, 6)), r, thick * (0.7 + 0.6 * swell), fog, 0.42 * a * (0.25 + swell), 0.5)
  }
}

/**
 * Fog pouring over a saddle, far off: the cloud lying on the crest, and below it a slow cascade down the near face,
 * soft long lobes that swell as they go down and fade out into the fold at the foot. `lift` thins it at the end.
 */
function drawPour(ctx: CanvasRenderingContext2D, k: number, f: F, L: Layer, pour: Layer['pours'][number], t: number, lift: number): void {
  const [sx, sy] = shiftOf(L.d, f.cx, f.cy)
  const cx = pour.x + sx
  const crest = L.ridge(pour.x) + sy
  const { w, drop } = pour
  if (cx + w * 2 < f.x0 || cx - w * 2 > f.x1 || crest - w > f.y1 || crest + drop + 6 < f.y0) return
  const fog = rgbOf(VALLEY.fog)
  const cloud = rgbOf(VALLEY.cloud)
  const a0 = 1 - 0.75 * lift
  // The cloud lying on the saddle, long and flat along the crest.
  for (let j = -1; j <= 1; j++) {
    lobe(ctx, k, cx + j * w * 0.5 + Math.sin(t * 0.04 + j) * 0.5, L.ridge(pour.x + j * w * 0.5) + sy + 0.5, w * 0.62, w * 0.2, cloud, 0.55 * a0, 0.5)
  }
  // The cascade: a sheet draped down the face, its lobes sliding slowly down it and spreading.
  const n = 8
  const rate = 0.02 + 0.01 * hash(pour.seed, 1, 5)
  for (let i = 0; i < n; i++) {
    const ph = (t * rate + i / n + 0.37 * hash(i, pour.seed, 7)) % 1
    const y = crest + drop * (0.1 + 0.8 * ph)
    const x = cx + (hash(i, pour.seed, 2) - 0.5) * w * 0.6 + ph * w * 0.08
    const rx = w * (0.32 + 0.3 * ph)
    const ry = drop * (0.22 + 0.1 * ph)
    lobe(ctx, k, x, y, rx, ry, fog, 0.26 * Math.pow(Math.sin(Math.PI * ph), 0.6) * a0, 0.5)
  }
  // Where it lands: a pool spreading at the foot.
  lobe(ctx, k, cx + w * 0.1, crest + drop, w * 1.1, drop * 0.18, fog, 0.3 * a0, 0.5)
}

/* ------------------------------------------------------------------ the near cloud (the helicopter comes out of it) */

/**
 * The front of the cloud bank piled on the near ridge, its x at height y: a tall steep wall where the helicopter comes
 * out of it (at y -50, x -124 on 11.099), and below it the spill, running out low over the ridge's back to its crest.
 */
export function bankFront(y: number, t: number): number {
  const wall = -124 + 0.8 * (y + 50)
  const spill = -117.6 + 47.6 * sm(y, -42, -29)
  return (y < -42 ? wall : spill) + 3 * (fbm(y / 7 + t * 0.03, 21) - 0.5)
}
/** How deep in the near cloud a point is: 0 outside .. 1 well inside. */
export function bankAt(x: number, y: number, t: number): number {
  if (y > hillY(x) + 1.5) return 0
  const inside = sm(bankFront(y, t) - x, -2, 4.5)
  const top = sm(y, -100, -84)
  return inside * top
}

/**
 * The near cloud: the bank on the ridge in octaves of soft lobes (only the sizes this frame can see), billowing at its
 * front, lit above and grey below; and its pour down the ridge's near face to the meadow. `front` draws only its
 * thin near wisps, which go over the helicopter while it is inside.
 */
function drawBank(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, lift: number, front = false): void {
  // Nothing of it in the frame: done.
  if (f.x0 > bankFront(Math.max(-100, Math.min(-28, f.y1)), t) + 10 || f.y1 < -104) return
  const cloud = rgbOf(VALLEY.cloud)
  const shade = rgbOf(mixHex(VALLEY.cloud, VALLEY.cloudShade, 0.55))
  const fade0 = 1 - 0.85 * lift
  const octaves = front
    ? [{ g: 2.2, r: 2.0, a: 0.26, seed: 7 }]
    : [
        { g: 7, r: 12, a: 0.36, seed: 1 },
        { g: 2.6, r: 4, a: 0.34, seed: 2 },
        { g: 0.95, r: 1.4, a: 0.3, seed: 3 },
      ]
  for (const o of octaves) {
    const px = o.r * k
    // Only the octaves this frame can see: none a speck, none bigger than the frame many times over.
    const fade = sm(px, 5, 14) * (1 - sm(px, 900, 2200))
    if (fade <= 0.01) continue
    const drift = t * (front ? 0.9 : 0.35)
    // Only over the bank's own box (it lies left of x -60, between y -104 and the ground).
    const bx0 = f.x0 - o.r
    const bx1 = Math.min(f.x1 + o.r, -56)
    const by0 = Math.max(f.y0 - o.r, -106)
    const by1 = Math.min(f.y1 + o.r, 2)
    if (bx1 <= bx0 || by1 <= by0) continue
    const i0 = Math.floor((bx0 - drift) / o.g)
    const i1 = Math.ceil((bx1 - drift) / o.g)
    const j0 = Math.floor(by0 / o.g)
    const j1 = Math.ceil(by1 / o.g)
    if ((i1 - i0) * (j1 - j0) > 1400) continue
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const x = i * o.g + drift + (hash(i, j, o.seed) - 0.5) * o.g * 0.9
        const y = j * o.g + (hash(i, j, o.seed + 5) - 0.5) * o.g * 0.9
        const d = bankAt(x, y, t)
        if (d <= 0.01) continue
        const r = o.r * (0.75 + 0.5 * hash(i, j, o.seed + 9))
        // Lit toward its top, greyer in its lower body.
        const lit = sm(-y, 40, 70)
        const col = hash(i, j, 4) < 0.45 - 0.3 * lit ? shade : cloud
        lobe(ctx, k, x, y, r, r * (front ? 0.45 : 0.58), col, o.a * d * fade * fade0, 0.5)
      }
    }
  }
  if (front) return
  // Its front: billows along the face, brighter, rolling slowly.
  const step = Math.max(2.2, 7 / Math.max(0.5, k / 6))
  for (let y = -98; y <= -28; y += step) {
    const x = bankFront(y, t)
    if (x + 8 < f.x0 || x - 8 > f.x1 || y + 8 < f.y0 || y - 8 > f.y1) continue
    const i = Math.round(y / step)
    const r = (2.6 + 2.4 * hash(i, 3, 91)) * (0.8 + 0.3 * Math.sin(t * 0.3 + i))
    lobe(ctx, k, x - r * 0.35, y, r, r * 0.8, cloud, 0.45 * sm(-y, 28, 40) * sm(k, 3, 9) * fade0, 0.55)
  }
  // The pour: long lobes lying along the ridge's near face, running down it from the crest to the meadow and pooling
  // at its foot.
  const fog = rgbOf(VALLEY.fog)
  const lanes = 4
  const per = 8
  for (let l = 0; l < lanes; l++) {
    const rate = 0.018 + 0.006 * hash(l, 9, 9)
    for (let i = 0; i < per; i++) {
      const ph = (t * rate + i / per + hash(l, i, 77)) % 1
      const x = lerp(-72 + l * 0.8, -40 + l * 2.5, ph)
      const s0 = hillY(x - 1.5)
      const s1 = hillY(x + 1.5)
      const rot = Math.atan2(s1 - s0, 3)
      const th = 2.6 + 2.6 * (1 - ph) + 0.9 * l
      const y = hillY(x) - th * 0.6
      const rx = 6 + 6 * ph + 2 * hash(l, i, 5)
      const a = 0.32 * Math.pow(Math.sin(Math.PI * Math.min(1, ph * 1.05)), 0.6) * fade0
      if (x + rx < f.x0 || x - rx > f.x1 || y + rx < f.y0 || y - rx > f.y1) continue
      lobeR(ctx, k, x, y, rx, th, rot * (1 - 0.6 * sm(ph, 0.7, 1)), fog, a, 0.5)
    }
  }
}

/** The near cloud's thin wisps, over whatever is inside it (the flight draws them over the helicopter). */
export function drawBankFront(p: p5, k: number, t: number, off: Pt): void {
  const g = frame(p, k)
  const f: F = { x0: g.x0 + off[0], x1: g.x1 + off[0], y0: g.y0 + off[1], y1: g.y1 + off[1], cx: g.cx + off[0], cy: g.cy + off[1] }
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(-off[0] * k, -off[1] * k)
  drawBank(ctx, k, f, t, openAt(t), true)
  ctx.restore()
}

/* ------------------------------------------------------------------ fog under the belly, mist on the meadow */

/** The band of fog under the belly, 7 to 9 cells over the meadow: a soft layer, long lobes drifting slowly across. */
function drawFogBand(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, a: number, seed: number, slot: number): void {
  const y0 = MEADOW - 9
  const y1 = MEADOW - 7
  if (f.y1 < y0 - 3 || f.y0 > y1 + 3 || a <= 0.01) return
  const fog = rgbOf(VALLEY.fog)
  // The layer itself: thickest under the belly's middle, thinning out toward its ends.
  const xa = Math.max(f.x0 - 1, -34)
  const xb = Math.min(f.x1 + 1, 34)
  if (xb > xa) {
    // Long flat swells laid end to end, overlapping: a continuous layer with no seams.
    for (let x = Math.floor(xa / 5) * 5 - 5; x <= xb + 5; x += 5) {
      const w = sm(32 - Math.abs(x - SHELL_X), 0, 16)
      lobe(ctx, k, x, (y0 + y1) / 2, 8, 1.7, fog, 0.3 * a * w, 0.55)
    }
  }
  const near = sm(k, 2.5, 8)
  if (near <= 0.01) return
  a *= near
  const g = 3
  const drift = t * 0.16
  const i0 = Math.floor((Math.max(f.x0, -36) - 5 - drift) / g)
  const i1 = Math.ceil((Math.min(f.x1, 36) + 5 - drift) / g)
  for (let i = i0; i <= i1; i++) {
    const x = i * g + drift + (hash(i, seed, 1) - 0.5) * g
    const w = sm(32 - Math.abs(x - SHELL_X), 0, 16)
    if (w <= 0.01) continue
    const y = (y0 + y1) / 2 + (hash(i, seed, 2) - 0.5) * 1.1 + 0.2 * Math.sin(t * 0.2 + i)
    const r = 3.4 + 2 * hash(i, seed, 3)
    lobe(ctx, k, x, y, r, r * 0.26, fog, a * w * (0.45 + 0.35 * hash(i, seed, 4)), 0.45)
  }
  // Where the slot's light falls through it, the fog is lit.
  if (slot > 0.01) lobe(ctx, k, SHELL_X, (y0 + y1) / 2, 5.5, 1.5, rgbOf(VALLEY.slotLight), 0.5 * slot * a, 0.35)
}

/**
 * Mist lying on the meadow, thickest where the pour pools at the near ridge's foot; close to, it lies in drifts that
 * move slowly across the grass and rise off it, and at the end, as the cloud opens, it lifts and thins.
 */
function drawMist(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, a: number, open = 0): void {
  if (f.y1 < MEADOW - 6 || f.y0 > MEADOW + 1 || a <= 0.01) return
  const fog = rgbOf(VALLEY.fog)
  const cells = f.y1 - f.y0
  const close = 1 - sm(cells, 9, 18)
  if (close > 0.01) {
    const g = 2.4
    const drift = t * 0.28
    const i0 = Math.floor((f.x0 - 3 - drift) / g)
    const i1 = Math.ceil((f.x1 + 3 - drift) / g)
    if (i1 - i0 < 200) {
      for (let i = i0; i <= i1; i++) {
        const x = i * g + drift + (hash(i, 41, 1) - 0.5) * g
        // Each drift rises off the grass and thins on its own slow cycle; higher and fainter as the fog lifts.
        const ph = (t * (0.05 + 0.03 * hash(i, 41, 2)) + hash(i, 41, 3)) % 1
        const y = MEADOW - 0.1 - 0.3 * hash(i, 41, 4) - ph * (1.1 + 2.2 * open)
        const r = (1.1 + 1.4 * hash(i, 41, 5)) * (1 + 0.7 * ph)
        const al = 0.55 * close * Math.sin(Math.PI * ph) ** 1.5 * (1 - 0.35 * open) * (hash(i, 41, 6) < 0.7 ? 1 : 0)
        lobe(ctx, k, x, y, r, r * 0.34, fog, al, 0.45)
      }
    }
  }
  a *= 1 - 0.5 * open
  band(ctx, k, f.x0 - 1, f.x1 + 1, MEADOW - 1.4, MEADOW + 0.2, fog, 0.35 * a)
  // Its swells, where they are big enough to be soft (in a wide it is the haze alone).
  const near = sm(k, 3, 10)
  if (near <= 0.01) return
  a *= near
  const g = 4
  const drift = t * 0.08
  const i0 = Math.floor((f.x0 - 8 - drift) / g)
  const i1 = Math.ceil((f.x1 + 8 - drift) / g)
  if (i1 - i0 > 300) return
  for (let i = i0; i <= i1; i++) {
    const x = i * g + drift + (hash(i, 31, 1) - 0.5) * g
    const pool = 1 + 1.6 * sm(-x, 28, 46) * (1 - sm(-x, 58, 72))
    const r = (3.2 + 2 * hash(i, 31, 2)) * pool
    lobe(ctx, k, x, MEADOW - 0.4 - 0.3 * hash(i, 31, 3) * pool, r, r * 0.22, fog, a * (0.4 + 0.35 * hash(i, 31, 4)) * Math.min(1.5, pool), 0.45)
  }
}

/* ------------------------------------------------------------------ the sky */

/** The overcast: big soft darker and paler masses in the cloud, far off, drifting; the sun somewhere behind it. */
function drawOvercast(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, open: number): void {
  const [sx, sy] = shiftOf(14, f.cx, f.cy)
  const cloud = rgbOf(VALLEY.cloud)
  const shade = rgbOf(VALLEY.cloudShade)
  // Where the sun is, behind the cloud, up on the left (the side the shell's rim catches): a paler glow; at the end,
  // as the cloud opens, it comes through over the valley.
  const glow = rgbOf(mixHex(VALLEY.cloud, VALLEY.floodlight, 0.25 + 0.4 * open))
  lobe(ctx, k, -170 + 120 * open + sx, -165 + sy, 95, 42, glow, 0.38 + 0.25 * open, 0.35)
  const g = 34
  const drift = t * 0.5
  const i0 = Math.floor((f.x0 - sx - 60 - drift) / g)
  const i1 = Math.ceil((f.x1 - sx + 60 - drift) / g)
  if (i1 - i0 > 40) return
  for (let i = i0; i <= i1; i++) {
    for (let j = 0; j < 3; j++) {
      const x = i * g + drift + sx + (hash(i, j, 81) - 0.5) * g
      const y = -210 + j * 34 + (hash(i, j, 82) - 0.5) * 20 + sy
      const r = 30 + 22 * hash(i, j, 83)
      if (y - r * 0.5 > f.y1 || y + r * 0.5 < f.y0) continue
      const dark = hash(i, j, 84) < 0.5
      lobe(ctx, k, x, y, r, r * 0.42, dark ? shade : cloud, (dark ? 0.3 : 0.24) * (1 - open), 0.5)
    }
  }
}

/** The low cloud over the valley, resting on the far range; at the end it opens over the shell and the light comes. */
function drawCeiling(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, open: number): void {
  const [sx, sy] = shiftOf(10, f.cx, f.cy)
  const base = (x: number) => -124 + 10 * fbm(x / 40, 41) + sy
  if (base(f.cx - sx) - 14 > f.y1) return
  const cloud = rgbOf(VALLEY.cloud)
  const shade = rgbOf(VALLEY.cloudShade)
  // The deck itself: dense above its base, softening down to it.
  const b0 = -124 + sy
  // All of it above the frame (the camp's shots, down on the meadow): nothing to draw.
  if (b0 + 20 < f.y0) return
  const deck = ctx.createLinearGradient(0, (b0 - 70) * k, 0, (b0 + 8) * k)
  deck.addColorStop(0, `rgba(${shade}, ${0.5 * (1 - 0.6 * open)})`)
  deck.addColorStop(0.72, `rgba(${cloud}, ${0.5 * (1 - 0.7 * open)})`)
  deck.addColorStop(1, `rgba(${cloud}, 0)`)
  ctx.fillStyle = deck
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (Math.min(f.y1, b0 + 8) - f.y0 + 1) * k)
  // Its underside: long soft lobes along the base, drifting.
  const g = 18
  const drift = t * 0.4
  const i0 = Math.floor((f.x0 - sx - 30 - drift) / g)
  const i1 = Math.ceil((f.x1 - sx + 30 - drift) / g)
  if (i1 - i0 > 80) return
  for (let i = i0; i <= i1; i++) {
    const x = i * g + drift + (hash(i, 5, 41) - 0.5) * g
    // Where the cloud opens at the end: over the shell first, wider as it goes.
    const hole = open * sm(open * 90 - Math.abs(x + sx - SHELL_X), -10, 30)
    const r = 18 + 14 * hash(i, 6, 41)
    lobe(ctx, k, x + sx, base(x) - r * 0.15, r, r * 0.32, hash(i, 7, 41) < 0.35 ? shade : cloud, 0.5 * (1 - hole), 0.5)
  }
}

/** Down a shaft: on out of the cloud over its first fifth, then a little fainter at its foot. */
const shaftAlong = (v: number): number => (v < 0.2 ? sm(v, 0, 0.2) : 1 - 0.15 * ((v - 0.2) / 0.8))

/**
 * The light coming through where the cloud has opened over where the shell was: long soft shafts, leaning a little,
 * falling through the air onto the meadow under it, and pooling there on the grass.
 */
function drawShafts(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, open: number): void {
  if (open <= 0.02) return
  // Sunlight, not the floods' cream: warm, the first warmth the valley has had (the reunion is in it).
  const light = rgbOf(mixHex(VALLEY.floodlight, VALLEY.lamp, 0.5))
  const top = -132
  const len = MEADOW - top
  const lean = 0.1
  for (let j = 0; j < 6; j++) {
    const x = SHELL_X - 22 + j * 10 + 3 * Math.sin(t * 0.05 + j) + (hash(j, 2, 43) - 0.5) * 4
    const w = 2.6 + 3.2 * hash(j, 1, 43)
    const a = (0.14 + 0.09 * hash(j, 3, 43)) * sm(open, 0.05 + j * 0.06, 0.45 + j * 0.06)
    if (a <= 0.004) continue
    const foot = x + len * lean
    // Its whole soft width: as wide as its old halo was, a little narrower up at the cloud.
    const span = w * 5.6
    if (Math.max(x, foot) + span / 2 < f.x0 || Math.min(x, foot) - span / 2 > f.x1) continue
    softBeam(ctx, k, [x, top], [foot, MEADOW], span * 0.72, span, light, a * 2.3, 'shaft', shaftAlong, true)
    // Where it falls, the grass is lit.
    lobe(ctx, k, foot + w * 0.2, MEADOW - 0.1, w * 2.4, 0.55, light, a * 2.2, 0.45)
  }
}

/** Low cloud round the shell's crown, in front of it: its top is in the cloud. It lifts away as the cloud opens. */
function drawCrown(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, open: number, rise: number): void {
  const y = BELLY - SHELL_H + 8
  if (f.y1 < y - 20 || f.y0 > y + 20) return
  const cloud = rgbOf(VALLEY.cloud)
  const g = 10
  const drift = t * 0.45
  const i0 = Math.floor((Math.max(f.x0, -70) - 20 - drift) / g)
  const i1 = Math.ceil((Math.min(f.x1, 70) + 20 - drift) / g)
  if (i1 - i0 > 40) return
  for (let i = i0; i <= i1; i++) {
    const x = i * g + drift + (hash(i, 3, 51) - 0.5) * g
    const w = sm(x, -62, -30) * (1 - sm(x, 30, 62))
    const r = 12 + 8 * hash(i, 4, 51)
    const yy = y - 6 * hash(i, 5, 51) + rise * 0.3
    lobe(ctx, k, x, yy, r, r * 0.34, cloud, 0.42 * w * (1 - open) * (1 - deckAt(t)), 0.5)
  }
}

/** Down the slot's fall of light, steady and in a step's flash. */
const slotAlong = (v: number): number => (v < 0.55 ? 1 - (0.6 * v) / 0.55 : 0.4 - (0.233 * (v - 0.55)) / 0.45)
const slotFlashAlong = (v: number): number => (v < 0.55 ? 1 - (0.6 * v) / 0.55 : 0.4 * (1 - (v - 0.55) / 0.45))

/**
 * The slot's light, once it opens: a bloom at its mouth, a soft fall of light down to the meadow (brighter for a
 * moment on each of its six steps), the belly lit round it and a pool of it on the grass. Gone as the shell goes.
 */
function drawSlotLight(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, vanish: number, rise: number): void {
  const slot = slotAt(t)
  const a = slot * (1 - sm(vanish, 0, 0.3))
  if (a <= 0.01) return
  const y0 = BELLY + rise
  if (f.y1 < y0 - 6 || f.y0 > MEADOW + 1 || f.x1 < SHELL_X - 12 || f.x0 > SHELL_X + 12) return
  const light = rgbOf(VALLEY.slotLight)
  // Each step flashes as it opens.
  let flash = 0
  for (const at of BURST1) if (t >= at) flash = Math.max(flash, Math.exp(-(t - at) / 0.14))
  const sw = SLOT_W * slot
  // The fall: steady, and brighter near the mouth for a moment on each step. Its whole soft width takes in what was
  // its faint outer pass.
  const top: Pt = [SHELL_X, y0]
  const foot: Pt = [SHELL_X, MEADOW]
  const w0 = sw * 1.9
  const w1 = (sw * 3.4 + 3) * 1.9
  softBeam(ctx, k, top, foot, w0, w1, light, 0.3 * 1.7 * a, 'slot', slotAlong, true)
  softBeam(ctx, k, top, foot, w0, w1, light, 0.45 * 1.7 * flash * a, 'slotFlash', slotFlashAlong, true)
  // The bloom at its mouth, the belly lit round it, the pool on the meadow.
  lobe(ctx, k, SHELL_X, y0 + 0.2, sw * 0.9 + 0.8, 0.9, light, (0.55 + 0.6 * flash) * a, 0.3)
  lobe(ctx, k, SHELL_X, y0 - 0.4, sw * 1.6 + 2.5, 1.1, light, 0.16 * a, 0.4)
  lobe(ctx, k, SHELL_X, MEADOW - 0.25, sw * 2.2 + 3, 0.7, light, (0.3 + 0.15 * flash) * a, 0.4)
}

/**
 * What comes off the shell as it goes: soft vapour shed from its flanks, all the way up, rising and spreading into
 * the cloud above (which is drawn over it). Never along a line.
 */
function drawVapour(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, vanish: number, rise: number): void {
  if (vanish <= 0.01 || vanish >= 0.999) return
  const cloud = rgbOf(VALLEY.cloud)
  const shade = rgbOf(mixHex(VALLEY.cloud, VALLEY.cloudShade, 0.5))
  const m = 34
  for (let i = 0; i < m; i++) {
    const born = 0.02 + 0.7 * hash(i, 1, 63)
    const life = clamp01((vanish - born) / 0.28)
    if (life <= 0 || life >= 1) continue
    const u = 0.22 + 0.72 * hash(i, 2, 63)
    const side = hash(i, 3, 63) < 0.5 ? -1 : 1
    const x = SHELL_X + side * shellHalf(u) * SHELL_W * (0.82 + 0.16 * hash(i, 4, 63)) + side * life * 7
    const y = BELLY + rise - SHELL_H * (1 - u) - life * 20 - 3 * Math.sin(t * 0.3 + i)
    const r = (5 + 6 * hash(i, 5, 63)) * (0.8 + 0.9 * life)
    if (x + r < f.x0 || x - r > f.x1 || y + r < f.y0 || y - r > f.y1) continue
    lobe(ctx, k, x, y, r, r * 0.6, hash(i, 6, 63) < 0.35 ? shade : cloud, 0.34 * Math.sin(Math.PI * life), 0.45)
  }
}

/**
 * The low cloud the shell goes up into at the end, in front of it: a deck of soft billowed volumes whose underside
 * takes the shell from the top as it rises, thin wisps drifting below it over what is left, and at last an opening
 * over where it was, the light coming through (the shafts, drawn after the land).
 */
function drawDeck(ctx: CanvasRenderingContext2D, k: number, f: F, t: number, open: number): void {
  const a = deckAt(t)
  if (a <= 0.01) return
  const mean = deckUnder(SHELL_X, t)
  if (mean + 22 < f.y0 || mean - 90 > f.y1) return
  const cloud = rgbOf(VALLEY.cloud)
  const shade = rgbOf(mixHex(VALLEY.cloud, VALLEY.cloudShade, 0.65))
  // Its underside is in its own shadow: greyer than the sky under it.
  const under = rgbOf(mixHex(VALLEY.skyHigh, VALLEY.ridgeFar, 0.45))
  const fog = rgbOf(VALLEY.fog)
  const hole = (x: number) => open * sm(open * 70 - Math.abs(x - SHELL_X), -12, 24)
  // The body: a dense fill above the underside, then rows of big soft volumes on it up past the frame's top, drifting.
  const top = Math.min(f.y0 - 2, mean - 60)
  const fill = ctx.createLinearGradient(0, top * k, 0, (mean - 6) * k)
  fill.addColorStop(0, `rgba(${cloud}, ${0.96 * a})`)
  fill.addColorStop(0.6, `rgba(${shade}, ${0.95 * a})`)
  fill.addColorStop(0.88, `rgba(${under}, ${0.85 * a})`)
  fill.addColorStop(1, `rgba(${under}, 0)`)
  ctx.fillStyle = fill
  if (open < 0.02) ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (mean - 6 - top) * k)
  else {
    // With the opening in it: the fill in strips, thinning where it has opened.
    const n = 40
    for (let i = 0; i < n; i++) {
      const xa = f.x0 - 1 + ((f.x1 - f.x0 + 2) * i) / n
      const xb = f.x0 - 1 + ((f.x1 - f.x0 + 2) * (i + 1)) / n
      ctx.globalAlpha *= 1 - hole((xa + xb) / 2)
      ctx.fillRect(xa * k, top * k, (xb - xa + 0.05) * k, (mean - 6 - top) * k)
      ctx.globalAlpha /= Math.max(1e-3, 1 - hole((xa + xb) / 2))
    }
  }
  const g = 13
  const drift = t * 0.35
  const i0 = Math.floor((f.x0 - 30 - drift) / g)
  const i1 = Math.ceil((f.x1 + 30 - drift) / g)
  if (i1 - i0 > 60) return
  for (let i = i0; i <= i1; i++) {
    const x = i * g + drift + (hash(i, 1, 57) - 0.5) * g * 0.8
    const under = deckUnder(x, t)
    const h = 1 - hole(x)
    for (let r = 0; r < 6; r++) {
      const y = under - 12 - r * 15 + (hash(i, r, 58) - 0.5) * 6
      if (y + 25 < f.y0) break
      const rad = 15 + 9 * hash(i, r, 59)
      lobe(ctx, k, x, y, rad, rad * 0.6, r % 2 ? shade : cloud, Math.min(0.9, 0.62 + 0.1 * r) * a * h, 0.55)
    }
  }
  // Its underside: billows, some lower than others, rolling slowly.
  const g2 = 9
  const j0 = Math.floor((f.x0 - 20 - drift * 0.8) / g2)
  const j1 = Math.ceil((f.x1 + 20 - drift * 0.8) / g2)
  for (let j = j0; j <= j1; j++) {
    const x = j * g2 + drift * 0.8 + (hash(j, 2, 57) - 0.5) * g2
    const rad = (7 + 8 * hash(j, 3, 57)) * (1 + 0.06 * Math.sin(t * 0.4 + j))
    const y = deckUnder(x, t) - rad * 0.1 + 6 * hash(j, 4, 57) - 2
    lobe(ctx, k, x, y, rad, rad * 0.62, hash(j, 5, 57) < 0.55 ? under : shade, 0.82 * a * (1 - hole(x)), 0.55)
    // Its lit top, above.
    lobe(ctx, k, x + rad * 0.2, y - rad * 0.45, rad * 0.8, rad * 0.4, cloud, 0.5 * a * (1 - hole(x)), 0.5)
  }
  // Below it, thin wisps drifting across over what is left of the shell: it is seen through them.
  const g3 = 11
  const k0 = Math.floor((f.x0 - 20 - drift * 1.4) / g3)
  const k1 = Math.ceil((f.x1 + 20 - drift * 1.4) / g3)
  const thin = a * sm(t, DEPART + 0.5, DEPART + 3) * (1 - 0.7 * open)
  if (thin > 0.01) {
    for (let j = k0; j <= k1; j++) {
      const x = j * g3 + drift * 1.4 + (hash(j, 6, 57) - 0.5) * g3
      const y = deckUnder(x, t) + 5 + 22 * hash(j, 7, 57)
      const rad = 8 + 8 * hash(j, 8, 57)
      lobe(ctx, k, x, y, rad, rad * 0.3, fog, 0.24 * thin * (1 - hole(x)), 0.45)
    }
  }
}

/* ------------------------------------------------------------------ the set */

export const valleySet = scenery<null>({
  name: 'valley-set',
  draw: (p, _s, c) => drawValley(p, c.k, c.t, c.ink, c.weight),
  over: (p, _s, c) => {
    const { k, t } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // In front of everything: the fog band's near side, which the lift goes up through.
    drawFogBand(ctx, k, f, t + 40, 0.26 * (1 - 0.85 * openAt(t)), 7, slotAt(t))
  },
})

function drawValley(p: p5, k: number, t: number, ink: string, weight: number): void {
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cells = f.y1 - f.y0
  const open = openAt(t)
  const vanish = vanishAt(t)

  // The sky: the cloud's grey overhead, paling to the horizon (the camera's own height); at the end, opening, with
  // the light coming through.
  const top = mixHex(mixHex(VALLEY.skyHigh, VALLEY.cloudShade, 0.3), VALLEY.cloud, 0.55 * open)
  const low = mixHex(VALLEY.sky, VALLEY.cloud, 0.45 * open)
  const sky = ctx.createLinearGradient(0, (f.cy - 110) * k, 0, (f.cy + 4) * k)
  sky.addColorStop(0, top)
  sky.addColorStop(0.85, low)
  sky.addColorStop(1, mixHex(low, VALLEY.fog, 0.5))
  ctx.fillStyle = sky
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  drawOvercast(ctx, k, f, t, open)

  // The far land, back to front, each with its pours and the mist in its fold; the cloud ceiling over the farthest.
  const lift = 1 - 0.8 * open
  LAYERS.forEach((L, i) => {
    drawLayer(ctx, k, f, L, low, open)
    if (i === LAYERS.length - 1) drawFarCamp(ctx, k, f, low)
    for (const pour of L.pours) drawPour(ctx, k, f, L, pour, t + i * 17, open)
    if (i === 0) drawCeiling(ctx, k, f, t, open)
    drawFold(ctx, k, f, L, t, lift)
  })

  // The shell, over the meadow: the air between pales it a little in the wide; at the end it rises and goes to
  // vapour.
  // Until the helicopter tops the ridge it stands paler in the mist, and on that pulse (16.283) it resolves.
  const mist = t > 11 && t < REVEAL_AT + 0.4 ? 0.3 * (1 - sm(t, REVEAL_AT - 0.3, REVEAL_AT + 0.05)) * sm(t, 11, 11.3) : 0
  const haze = 0.04 + 0.12 * sm(Math.log(cells), Math.log(18), Math.log(190)) + 0.3 * vanish + mist
  const rise = riseAt(t)
  if (vanish < 0.999) {
    ctx.save()
    p.push()
    p.translate(SHELL_X * k, (BELLY + rise) * k)
    drawShell(p, k, { t, h: SHELL_H, w: SHELL_W, slot: slotAt(t), slotW: SLOT_W, vanish, haze, air: mixHex(VALLEY.sky, VALLEY.cloud, 0.4 * open), puffs: false, goes: 'fade' })
    p.pop()
    ctx.restore()
  }
  drawSlotLight(ctx, k, f, t, vanish, rise)
  drawVapour(ctx, k, f, t, vanish, rise)
  drawCrown(ctx, k, f, t, open, rise)
  drawDeck(ctx, k, f, t, open)

  // The near land: the hills either side (the near ridge on the left), then the meadow's floor.
  const n = 180
  ctx.fillStyle = VALLEY.hill
  ctx.beginPath()
  ctx.moveTo((f.x0 - 1) * k, (f.y1 + 1) * k)
  for (let i = 0; i <= n; i++) {
    const x = f.x0 - 1 + ((f.x1 - f.x0 + 2) * i) / n
    ctx.lineTo(x * k, Math.min(f.y1 + 1, hillY(x)) * k)
  }
  ctx.lineTo((f.x1 + 1) * k, (f.y1 + 1) * k)
  ctx.closePath()
  ctx.fill()
  if (f.y1 > MEADOW) {
    ctx.fillStyle = VALLEY.meadow
    ctx.fillRect((f.x0 - 1) * k, MEADOW * k, (f.x1 - f.x0 + 2) * k, (f.y1 - MEADOW + 1) * k)
    // The grass's top catches the sky; the ground under it darkens.
    ctx.fillStyle = mixHex(VALLEY.meadow, VALLEY.grass, 0.45)
    ctx.fillRect((f.x0 - 1) * k, MEADOW * k, (f.x1 - f.x0 + 2) * k, Math.max(0.05, Math.min(0.12, 1.2 / k)) * k)
    const dark = ctx.createLinearGradient(0, MEADOW * k, 0, (MEADOW + Math.max(2, cells * 0.2)) * k)
    dark.addColorStop(0, `rgba(${rgbOf(VALLEY.meadowDark)}, 0)`)
    dark.addColorStop(1, `rgba(${rgbOf(VALLEY.meadowDark)}, 0.55)`)
    ctx.fillStyle = dark
    ctx.fillRect((f.x0 - 1) * k, (MEADOW + 0.12) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - MEADOW + 1) * k)
  }
  drawBank(ctx, k, f, t, open)
  drawMist(ctx, k, f, t, 0.36 * lift + 0.12 * open, open)
  drawShafts(ctx, k, f, t, open)

  // The camp's standing hardware: the road, the helideck, the tents, trucks and the comms mast.
  if (f.y1 > MEADOW - 22 && f.y0 < MEADOW + 2) {
    if (f.x1 > -60 && f.x0 < PAD.x0) drawRoad(p, k, Math.max(f.x0 - 1, -60), PAD.x0 - 2.6)
    if (f.x1 > PAD.x0 - 3 && f.x0 < PAD.x1) drawPad(p, k, ink, weight)
    for (const prop of CAMP_PROPS) if (f.x1 > prop.x0 - 1 && f.x0 < prop.x1 + 1) prop.draw(p, k, ink, weight, t)
  }

  // The fog under the belly, its far side (the near side is drawn over everything).
  drawFogBand(ctx, k, f, t, 0.55 * (1 - 0.85 * open), 3, slotAt(t))
}

export const VALLEY_CELLS = box(VALLEY_BOX.x0, VALLEY_BOX.y0, VALLEY_BOX.x1, VALLEY_BOX.y1, 4)
