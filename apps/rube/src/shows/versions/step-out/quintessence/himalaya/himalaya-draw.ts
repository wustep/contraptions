import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { level } from '../music'
import { ellipse, fillPoly, line, mix, rgba, type Pen } from '../home/pen'
import { litY, tone, wind, type Tone } from './dawn'
import { DECK, drawChoughs } from './far'
import { along, bands, billow, cut, lobe, ROWS, rowOutline, SAMPLES, sunOn } from './paint'
import {
  CAT_LOOK,
  CAT_LOOK_AWAY,
  catAt,
  CAT_STEPS_IN,
  CAT_STEPS_OUT,
  FAR_Y,
  LANDINGS,
  LEDGE_Y,
  R,
  SEAN_AT,
  SIFTS,
  SIFT_X,
  STEPS,
  TICKS,
} from './himalaya-plan'

/**
 * The Himalayas, drawn on the machine's plane: the face he climbs, its snow calm and a few bands of rock through it, its
 * steps capped with snow; the ledge at the top with Sean's tripod and long lens on it; across the valley, the far
 * spur and the mountain behind it, and on the spur, if you look, the snow leopard; and the sea of cloud filling the
 * valley between them, the spur standing out of it. Beyond the valley is `far.ts`.
 *
 * All of it is in the hour's light (`dawn.ts`): blue-grey through the climb, and lit from the right once the sun is
 * up, the light coming down the face from its summit ridge to the ledge, and on down past it.
 */

export const C = {
  lens: '#3E423E',
  lensBand: '#D8D6CC',
  tripod: '#2F3338',
  strap: '#6B5A3E',
}

type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }
type C2 = CanvasRenderingContext2D

/** Fill or stroke paths made in cells. */
function inCells(pen: Pen, fn: (c: C2) => void): void {
  const { c, k } = pen
  c.save()
  c.scale(k, k)
  fn(c)
  c.restore()
}

/** Where the light is on the machine's plane: the colour of snow at height `y` (its own colour in shadow). */
function litSnow(tn: Tone, t: number, y: number, shadow: string): string {
  const ly = litY(t, 'world')
  return mix(shadow, tn.faceLit, smooth(ly - y, -0.15, 0.35) * 0.92)
}

/* ------------------------------------------------------------------ the mountain he climbs */

/** How far down the face and its foot go: past the bottom of the tallest frame that looks at them. */
const DEEP = 40

/** The snow the climb starts in: its edge drifted in long low waves, level where he waits at the foot. */
const FOOT: Pt[] = [
  ...Array.from({ length: 58 }, (_, i): Pt => {
    const x = -22 + i * 0.35
    return [x, R + 0.02 - 0.08 * (0.5 + 0.5 * Math.sin(x * 1.7 + 0.6)) * (0.6 + 0.4 * Math.sin(x * 0.53)) * smooth(-x, 1.6, 2.6)]
  }),
  [-1.6, R - 0.02],
  [-0.2, R],
  [0.5, R + 0.06],
  [1.6, R + 0.45],
  [3.2, R + 1.3],
  [5.5, R + 2.4],
  [8.0, R + 3.9],
  [10.2, R + 5.6],
  [12.6, R + 8.2],
  [15.5, DEEP],
  [-22, DEEP],
]

/** The boulder over the foot, up to his left: the gust takes the snow off its top. */
export const BOULDER: Pt = [-1.6, -1.75]

/** The face's outline: off to the left and down, its right flank down into the cloud, the ledge's lip, the summit ridge. */
const FACE: Pt[] = [
  [-22, DEEP],
  [19.6, DEEP],
  [17.1, 9],
  [15.77, 5.5],
  [15.02, 3],
  [13.93, 0.4],
  [13.44, -1.4],
  [12.47, -3.2],
  [11.92, -4.6],
  [11.12, -5.9],
  [10.87, -6.7],
  [10.42, -7.4],
  [10.3, -8.0],
  [10.0, -8.4],
  [9.75, LEDGE_Y + 0.05],
  [9.9, LEDGE_Y],
  [9.95, LEDGE_Y - 0.08],
  [9.35, LEDGE_Y - 0.6],
  [9.1, LEDGE_Y - 1.4],
  [8.5, -11.25],
  [7.6, -11.6],
  [6.3, -12.2],
  [5.1, -12.9],
  [4.2, -13.3],
  [3.0, -12.6],
  [1.3, -12.8],
  [-0.6, -11.8],
  [-3.2, -12.3],
  [-6, -10.8],
  [-9.5, -11.4],
  [-13, -10.2],
  [-17, -10.9],
  [-22, -9.6],
]

/** Each polygon's bounding box, for a quick no. */
const boxes = new WeakMap<readonly Pt[], [number, number, number, number]>()
/** Whether a point is inside a polygon. */
function inside(poly: readonly Pt[], x: number, y: number): boolean {
  let b = boxes.get(poly)
  if (!b) {
    b = [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))]
    boxes.set(poly, b)
  }
  if (x < b[0] || y < b[1] || x > b[2] || y > b[3]) return false
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** A closed outline as a path, in cells. */
function shape(pts: readonly Pt[]): Path2D {
  const path = new Path2D()
  pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
  path.closePath()
  return path
}

/**
 * The rock showing through the face's snow: a few long bands, where they hold the picture together. One beside the
 * first leg, one in the bend of the switchback, one under the ledge, and one high on the left under the summit ridge.
 * Each is where its left end is, how long it runs along the strata, and how thick it stands out of the snow.
 */
const BANDS: [number, number, number, number][] = [
  [3.1, -1.3, 2.9, 0.4],
  [3.4, -5.4, 3.2, 0.45],
  [7.6, -7.9, 2.0, 0.35],
  [-5.6, -8.6, 3.6, 0.5],
]
/** How the strata tilt: y per x. */
const TILT = -0.09

/** The face's outline, and its bands of rock, each with the snow lying on its top (made once). */
let faceGeo: { outline: Path2D; bands: { rock: Path2D; lit: Path2D; top: Path2D; y: number }[] } | null = null
function faceOf() {
  return (faceGeo ??= {
    outline: shape(FACE),
    bands: BANDS.map(([xa, y0, len, th], j) => {
      // Tilted with the strata, ragged along its top where the snow lies.
      const top: Pt[] = []
      const low: Pt[] = []
      const n = Math.max(4, Math.round(len / 0.25))
      for (let i = 0; i <= n; i++) {
        const u = i / n
        const x = xa + len * u
        const y = y0 + len * u * TILT
        const taper = Math.sin(Math.PI * u) ** 0.6
        top.push([x, y - th * taper * (0.55 + 0.45 * hash(j * 31, i + 100, 41))])
        // Its foot broken where it goes into the snow under it, not ruled.
        low.push([x, y + th * taper * (0.12 + 0.22 * hash(j * 31, i + 200, 43))])
      }
      // The snow lying on it, drifted down over its top unevenly: the slope's own snow, so it runs on unbroken from above.
      const cap = top.map(([x, y], i): Pt => [x, y + th * (0.2 + 0.2 * hash(j * 31, i + 300, 47)) * Math.sin((Math.PI * i) / n) ** 0.6])
      // Its upper side, toward the sky, takes more light than its face.
      const lit = top.map(([x, y], i): Pt => [x, y + (low[i][1] - y) * (0.5 + 0.15 * hash(j * 31, i + 400, 53))])
      return {
        rock: shape([...top, ...[...low].reverse()]),
        lit: shape([...top, ...lit.reverse()]),
        top: shape([...top.map(([x, y]): Pt => [x, y - 0.2]), ...cap.reverse()]),
        y: y0 - th,
      }
    }),
  })
}

/** The face's own snow at `t`, filled into `clip` (or over its whole outline): the bands' caps are the slope's own. */
function faceSnow(c: C2, f: Frame, t: number, tn: Tone, y0: number, y1: number, clip?: Path2D): void {
  const g = faceOf()
  const ly = litY(t, 'world')
  if (clip) {
    c.save()
    c.clip(clip)
  }
  bands(c, f.x0 - 1, f.x1 + 1, y0, y1, (y) => mix(tn.faceSnow, tn.faceLow, Math.max(0, Math.min(1, (y + 13.5) / 22.5))), g.outline)
  if (ly > -14.5) sunOn(c, FACE, ly, mix(tn.faceSnow, tn.faceLit, 0.95))
  if (clip) c.restore()
}

/** The outcrop over the ledge, which the snow sifts down off its overhanging tip: its rock, its lit top, its snow. */
const SIFT_BY = LEDGE_Y - 1.2
const SIFT_ROCK: Pt[] = [[SIFT_X - 1.7, SIFT_BY - 0.05], [SIFT_X - 1.3, SIFT_BY - 0.3], [SIFT_X - 0.8, SIFT_BY - 0.5], [SIFT_X - 0.3, SIFT_BY - 0.6], [SIFT_X, SIFT_BY - 0.52], [SIFT_X + 0.14, SIFT_BY - 0.1], [SIFT_X + 0.04, SIFT_BY + 0.02], [SIFT_X - 0.4, SIFT_BY + 0.06], [SIFT_X - 0.9, SIFT_BY + 0.12], [SIFT_X - 1.4, SIFT_BY + 0.06]]
const SIFT_LIT: Pt[] = [[SIFT_X - 1.7, SIFT_BY - 0.05], [SIFT_X - 1.3, SIFT_BY - 0.3], [SIFT_X - 0.8, SIFT_BY - 0.5], [SIFT_X - 0.3, SIFT_BY - 0.6], [SIFT_X, SIFT_BY - 0.52], [SIFT_X + 0.12, SIFT_BY - 0.2], [SIFT_X - 0.35, SIFT_BY - 0.3], [SIFT_X - 0.9, SIFT_BY - 0.18], [SIFT_X - 1.4, SIFT_BY - 0.06]]
const SIFT_LIP: Pt[] = [[SIFT_X - 1.8, SIFT_BY - 0.02], [SIFT_X - 1.3, SIFT_BY - 0.4], [SIFT_X - 0.8, SIFT_BY - 0.68], [SIFT_X - 0.3, SIFT_BY - 0.8], [SIFT_X + 0.02, SIFT_BY - 0.7], [SIFT_X + 0.16, SIFT_BY - 0.12], [SIFT_X + 0.04, SIFT_BY - 0.3], [SIFT_X - 0.3, SIFT_BY - 0.48], [SIFT_X - 0.6, SIFT_BY - 0.42], [SIFT_X - 0.9, SIFT_BY - 0.4], [SIFT_X - 1.3, SIFT_BY - 0.22], [SIFT_X - 1.6, SIFT_BY - 0.06]]

export function drawFace(pen: Pen, f: Frame, t: number): void {
  const tn = tone(t)
  const g = faceOf()
  inCells(pen, (c) => {
    // Snow over all of it, bluer low down, and the sun on it down to where the light has reached.
    faceSnow(c, f, t, tn, -14, DEEP)
    // The bands of rock (a value lighter than the steps' slabs, so the climb reads against them), the band over the
    // ledge among them, and on their tops the slope's own snow, lit as the slope round it is.
    c.fillStyle = mix(tn.faceRock, tn.faceShade, 0.42)
    for (const b of g.bands) c.fill(b.rock)
    c.fill(shape(SIFT_ROCK))
    c.fillStyle = mix(tn.faceRock, tn.faceShade, 0.72)
    for (const b of g.bands) c.fill(b.lit)
    c.fill(shape(SIFT_LIT))
    const caps = new Path2D()
    for (const b of g.bands) caps.addPath(b.top)
    caps.addPath(shape(SIFT_LIP))
    faceSnow(c, f, t, tn, -14, 0, caps)
    // The snow the climb starts in, along the foot.
    if (f.y1 > R - 0.5) {
      c.fillStyle = mix(tn.faceSnow, '#FFFFFF', 0.25)
      c.fill(shape(FOOT))
    }
  })
  // The boulder over the foot, whose snow the gust tears off.
  fillPoly(pen, [[BOULDER[0] - 0.8, BOULDER[1] + 0.05], [BOULDER[0], BOULDER[1] - 0.25], [BOULDER[0] + 0.65, BOULDER[1] - 0.05], [BOULDER[0] + 0.8, BOULDER[1] + 0.4], [BOULDER[0] - 0.9, BOULDER[1] + 0.45]], tn.faceRock)
  fillPoly(pen, [[BOULDER[0] - 0.84, BOULDER[1] + 0.06], [BOULDER[0], BOULDER[1] - 0.3], [BOULDER[0] + 0.68, BOULDER[1] - 0.06], [BOULDER[0] + 0.1, BOULDER[1] - 0.12], [BOULDER[0] - 0.5, BOULDER[1] + 0.12]], mix(tn.faceSnow, '#FFFFFF', 0.4))
}

/** The steps: a slab of rock under every landing, capped with snow; the ledge at the top. */
export function drawSteps(pen: Pen, f: Frame, t: number): void {
  const tn = tone(t)
  // The trail: a shelf worn along each leg of the switchback, the steps on it, its ends tapering into the snow.
  const ext = (a: Pt, b: Pt, u: number): Pt => [a[0] + (a[0] - b[0]) * u, a[1] + (a[1] - b[1]) * u]
  for (const [a, b] of [[0, 9], [9, 17], [17, STEPS.length]] as [number, number][]) {
    const leg = STEPS.slice(a, b).map((s) => s.p).sort((p, q) => p[0] - q[0])
    const n = leg.length
    const top = [ext(leg[0], leg[1], 0.8), ...leg, ext(leg[n - 1], leg[n - 2], 0.8)].map(([x, y]): Pt => [x, y + R + 0.1])
    const low = [ext(leg[0], leg[1], 0.3), ...leg, ext(leg[n - 1], leg[n - 2], 0.3)].map(([x, y]): Pt => [x, y + R + 0.42]).reverse()
    fillPoly(pen, [...top, ...low], rgba(tn.faceRock, 0.22))
  }
  const cap = mix(tn.faceSnow, '#FFFFFF', 0.5)
  for (const s of STEPS) {
    const [x, y] = s.p
    if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const top = y + R
    const h = (i: number) => hash(Math.round(x * 100), Math.round(y * 100), i)
    fillPoly(pen, [[x - 0.3, top], [x + 0.3, top], [x + 0.26 + h(1) * 0.05, top + 0.2], [x + 0.05, top + 0.3 + h(2) * 0.08], [x - 0.24, top + 0.22]], tn.faceRock)
    fillPoly(pen, [[x - 0.32, top + 0.02], [x - 0.2, top - 0.035], [x + 0.18, top - 0.04], [x + 0.32, top + 0.02], [x + 0.25, top + 0.06], [x - 0.26, top + 0.06]], litSnow(tn, t, top, cap))
  }
  // The ledge: a long shelf out over the valley.
  const y = LEDGE_Y
  const a = STEPS[STEPS.length - 1].p[0] - 0.4
  fillPoly(pen, [[a, y], [9.95, y], [9.9, y + 0.12], [9.4, y + 0.32], [8.2, y + 0.45], [a + 0.2, y + 0.4]], tn.faceRock)
  fillPoly(pen, [[a - 0.05, y + 0.02], [a + 0.3, y - 0.05], [9.0, y - 0.05], [9.98, y + 0.01], [9.8, y + 0.07], [a + 0.1, y + 0.07]], litSnow(tn, t, y, cap))
  drawRope(pen, f, t, tn)
}

/**
 * The old fixed rope's pitons: in the rock above every fourth step of the last pitch, clear of his leaps, and over the
 * ledge.
 */
const PITONS: Pt[] = [...[18, 22, 26, 30].map((k): Pt => [STEPS[k].p[0] - 0.12, STEPS[k].p[1] - 0.68]), [STEPS[STEPS.length - 1].p[0] - 0.3, LEDGE_Y - 0.62]]

/**
 * An old fixed rope, weathered dark, up the last pitch to the ledge from some earlier party: clipped to a piton above
 * every fourth step, sagging between them and stirring in the wind, its loose end lying in the snow below the first.
 */
function drawRope(pen: Pen, f: Frame, t: number, tn: Tone): void {
  if (f.x1 < PITONS[0][0] - 1 || f.x0 > PITONS[PITONS.length - 1][0] + 1 || f.y1 < PITONS[PITONS.length - 1][1] - 1 || f.y0 > PITONS[0][1] + 1) return
  const { c, k } = pen
  const w = wind(t)
  const rope = mix(tn.ink, C.strap, 0.4)
  c.save()
  c.beginPath()
  const [x0, y0] = PITONS[0]
  c.moveTo((x0 - 0.35) * k, (y0 + 0.42) * k)
  c.quadraticCurveTo((x0 - 0.05) * k, (y0 + 0.3) * k, x0 * k, y0 * k)
  for (let i = 1; i < PITONS.length; i++) {
    const [ax, ay] = PITONS[i - 1]
    const [bx, by] = PITONS[i]
    const sag = 0.1 + 0.03 * w * Math.sin(t * 1.9 + i * 1.3)
    c.quadraticCurveTo(((ax + bx) / 2 - 0.02 * w) * k, ((ay + by) / 2 + sag) * k, bx * k, by * k)
  }
  c.strokeStyle = rope
  c.lineWidth = 0.022 * k
  c.lineCap = 'round'
  c.stroke()
  c.restore()
  // The pitons: a blade in the rock, an eye, the rope through it.
  for (const [px, py] of PITONS) {
    fillPoly(pen, [[px - 0.07, py - 0.015], [px + 0.02, py - 0.03], [px + 0.02, py + 0.015]], tn.faceRock)
    ellipse(pen, px + 0.03, py, 0.028, 0.028, null, mix(tn.ink, '#8B8F92', 0.4), 0.012)
  }
}

/* ------------------------------------------------------------------ across the valley */

/** The far spur's top, and the two rocks the cat comes from behind and goes behind. */
const ROCK_A: Pt[] = [[11.75, FAR_Y + 0.2], [11.95, FAR_Y - 0.42], [12.35, FAR_Y - 0.55], [12.62, FAR_Y - 0.3], [12.7, FAR_Y + 0.2]]
const ROCK_B: Pt[] = [[14.7, FAR_Y + 0.2], [14.85, FAR_Y - 0.36], [15.3, FAR_Y - 0.58], [15.75, FAR_Y - 0.4], [16.0, FAR_Y + 0.2]]

const FY = FAR_Y + 0.1
/**
 * The mountain behind the spur: the cat is against it, pale on pale, not against the sky. Low enough for the sun to
 * come up over the range beyond it. It rises from behind the spur's top, so no edge of it shows below.
 */
const BEHIND: Pt[] = [[12.0, FY - 0.05], [12.4, FY - 0.66], [12.9, FY - 1.05], [13.5, FY - 0.95], [14.2, FY - 1.15], [14.9, FY - 1.55], [15.5, FY - 1.35], [16.3, FY - 1.95], [17.1, FY - 1.6], [17.9, FY - 1.1], [19.0, FY - 0.6], [20.4, FY + 0.2], [22.0, FY + 1.4], [24.0, FY + 3.0], [26.5, 4], [12.6, 4], [12.6, FY + 0.3]]
/**
 * The spur: its top where the cat walks, its flank stepping down in broken rock into the cloud, and its ridge going
 * down to the right into the cloud.
 */
const SPUR: Pt[] = [[11.2, 2], [11.5, -3.6], [11.66, -7.4], [11.6, -7.75], [11.8, -8.1], [11.72, -8.42], [11.9, -8.72], [11.85, -8.98], [12.0, FY - 0.05], [13.1, FY - 0.1], [14.4, FY], [16.2, FY - 0.25], [16.9, FY + 0.1], [18.0, FY + 0.55], [19.4, FY + 1.3], [20.8, FY + 2.3], [22.6, FY + 3.8], [24.6, FY + 5.6], [26.5, 2]]

/** The spur and the mountain behind it are all snow, but for the two rocks on its top: the cat is pale on pale. */
let farGeo: { behind: Path2D; spur: Path2D; snowTop: Path2D } | null = null
function farOf() {
  if (farGeo) return farGeo
  farGeo = {
    behind: shape(BEHIND),
    spur: shape(SPUR),
    snowTop: shape([[11.95, FY + 0.02], [12.0, FY - 0.06], [13.1, FY - 0.12], [14.4, FY - 0.03], [16.2, FY - 0.28], [16.9, FY + 0.08], [18.0, FY + 0.52], [17.9, FY + 0.62], [16.8, FY + 0.2], [16.2, FY - 0.15], [14.4, FY + 0.06], [12.6, FY + 0.05]]),
  }
  return farGeo
}

/**
 * What of the frame the mountains on the machine's plane leave open, sampled on a grid: the rows of it the sky and the
 * ranges beyond can be seen through (a clip, in cells, a little generous), or null where the face and the spur fill
 * the frame; and whether anything but the face is in view at all. Nothing is drawn where it cannot be seen.
 */
export function openings(f: Frame): { beyond: Path2D | null; far: boolean } {
  const cols = 32
  const rows = 18
  const dx = (f.x1 - f.x0) / cols
  const dy = (f.y1 - f.y0) / rows
  const lo: number[] = []
  const hi: number[] = []
  let far = false
  for (let j = 0; j <= rows; j++) {
    const y = f.y0 + j * dy
    lo.push(Infinity)
    hi.push(-Infinity)
    for (let i = 0; i <= cols; i++) {
      const x = f.x0 + i * dx
      if (inside(FACE, x, y)) continue
      far = true
      if (inside(SPUR, x, y) || inside(BEHIND, x, y)) continue
      lo[j] = Math.min(lo[j], x)
      hi[j] = Math.max(hi[j], x)
    }
  }
  // One rectangle round all of it: a plain rectangle is the one clip the canvas does for nothing.
  let a = Infinity
  let b = -Infinity
  let top = Infinity
  let bottom = -Infinity
  for (let j = 0; j <= rows; j++) {
    if (lo[j] > hi[j]) continue
    a = Math.min(a, lo[j])
    b = Math.max(b, hi[j])
    top = Math.min(top, f.y0 + (j - 1) * dy)
    bottom = Math.max(bottom, f.y0 + (j + 1) * dy)
  }
  // It runs on down to the sea of cloud, which covers everything below its top that the face does not.
  let path: Path2D | null = null
  const foot = Math.min(Math.max(bottom, f.y1 + 0.1), DECK + 0.1)
  if (a <= b && foot > top) {
    path = new Path2D()
    path.rect(a - dx, top, b - a + 2 * dx, foot - top)
  }
  return { beyond: path, far }
}

export function drawFarSide(pen: Pen, f: Frame, t: number): void {
  const tn = tone(t)
  const g = farOf()
  const ly = litY(t, 'world')
  const lit = (y: number, shadow: string) => mix(shadow, tn.faceLit, smooth(ly - y, -0.2, 0.4) * 0.85)
  // Only what stands out of the sea of cloud is drawn.
  const low = Math.min(f.y1, DECK + 0.3)
  inCells(pen, (c) => {
    // The mountain behind the spur, a little paler for the air between.
    const hi = mix(tn.faceSnow, tn.haze, 0.3)
    const lo = mix(tn.faceLow, tn.haze, 0.3)
    bands(c, Math.max(11.5, f.x0 - 1), f.x1 + 1, FY - 2.2, low, (y) => mix(hi, lo, Math.max(0, Math.min(1, (y - FY + 2) / 4))), g.behind)
    if (ly > FY - 2.5) sunOn(c, cut(BEHIND, [0, 1], DECK + 0.3), ly, mix(hi, tn.faceLit, 0.85))
    // The spur, its flank in its own shadow going down into the cloud, the sun coming down it.
    const flank: [number, string][] = [[0, mix(tn.faceSnow, tn.faceShade, 0.25)], [0.12, mix(tn.faceSnow, tn.faceShade, 0.5)], [1, mix(tn.faceShade, tn.cloud, 0.45)]]
    bands(c, Math.max(11, f.x0 - 1), f.x1 + 1, FY - 0.5, low, (y) => along(flank, (y - FY + 0.5) / 9.5), g.spur)
    if (ly > FY - 0.5) sunOn(c, cut(SPUR, [0, 1], DECK + 0.3), ly, mix(flank[0][1], tn.faceLit, 0.85))
    // Snow along its top, where the cat will walk.
    c.fillStyle = lit(FY - 0.1, mix(tn.faceSnow, '#FFFFFF', 0.35))
    c.fill(g.snowTop)
  })
}

export function drawFarRocks(pen: Pen, t: number): void {
  const tn = tone(t)
  const rock = mix(tn.faceRock, tn.faceShade, 0.45)
  const cap = litSnow(tn, t, FAR_Y - 0.5, mix(tn.faceSnow, '#FFFFFF', 0.35))
  fillPoly(pen, ROCK_A, rock)
  fillPoly(pen, [[11.93, FAR_Y - 0.38], [12.35, FAR_Y - 0.57], [12.6, FAR_Y - 0.32], [12.3, FAR_Y - 0.42]], cap)
  fillPoly(pen, ROCK_B, rock)
  fillPoly(pen, [[14.84, FAR_Y - 0.34], [15.3, FAR_Y - 0.6], [15.75, FAR_Y - 0.41], [15.3, FAR_Y - 0.48]], cap)
}

/**
 * The sea of cloud filling the valley, on the machine's plane, its far edge a little under the ledge: the spur and the
 * mountain behind it stand out of it, and the face goes down into it. Seen from above, it is a level floor of cloud,
 * its far edge billowed, with a few big heaps standing up out of it, flatter far off and rounder near, each lit on its
 * crown and in shadow on its flank away from the sun, drifting slowly with the wind. It is lit when the light is down
 * to it. Two lesser summits stand out of it, catching the sun on their tops and throwing long shadows across it,
 * shorter as the sun climbs. The pair of choughs wheel over it.
 */
/** The summits standing out of the cloud: x, how far into the sea (below its far edge), width, height. */
const ISLANDS: [number, number, number, number][] = [[26.0, 1.3, 4.4, 1.5], [14.3, 2.5, 3.6, 1.2]]
/**
 * The heaps of cloud: x, how far into the sea, how big, and how much taller than the rest. A few big ones with open
 * floor between them, so the sea is a calm floor and not dotted with heaps; and the one welling up in the gorge under
 * the ledge, which stays where it is.
 */
const HEAPS: [number, number, number, number?][] = [[10.9, 0.25, 0.8, 2.4], [21.0, 0.4, 1.3], [17.6, 1.4, 1.5], [31.6, 1.7, 1.7], [23.6, 2.6, 2.4], [14.0, 3.4, 2.2], [26.6, 5.0, 2.8]]
/** Everything standing up out of the sea, furthest first: so each lies over the feet of what is behind it. */
const STANDING = [...HEAPS.map((h, i) => ({ d: h[1], i, heap: true })), ...ISLANDS.map((h, i) => ({ d: h[1], i, heap: false }))].sort((a, b) => a.d - b.d)

export function drawDeck(pen: Pen, f: Frame, t: number): void {
  if (f.y1 < DECK - 0.4 || f.x1 < 9.5) return
  const tn = tone(t)
  const sea = smooth(litY(t, 'low'), -8.4, -7.4)
  const top = mix(tn.cloud, tn.lit, 0.6 * sea)
  const shade = mix(top, tn.cloudUnder, 0.85)
  // Only what the face's flank leaves open is drawn: it runs from about (10, -8.4) down to (12.9, -2.5).
  const flank = (y: number) => 10.0 + Math.max(0, Math.min(5.9, y + 8.4)) * 0.49
  const lo = Math.max(9.7, f.x0) - 0.6
  const hi = f.x1 + 1
  const ly = litY(t, 'world')
  const reach = 2 + 9 * (1 - smooth(t, 182, 191.4)) ** 1.5
  const island = (c: C2, [x, d, w, h]: [number, number, number, number], n: number) => {
    if (x + w < lo || x - w - reach * h > hi) return
    const base = DECK + d + 0.12
    const hz = Math.max(0.1, 0.42 - 0.12 * d)
    const q = (i: number) => hash(n, i, 91)
    const sx = (q(1) - 0.4) * 0.2
    // Its outline from the left foot over the summit to the right; the flank toward the sun from the summit down.
    const pts: Pt[] = [[-0.5, 0], [-0.36, 0.3 + 0.1 * q(2)], [-0.22, 0.5], [-0.1, 0.66 + 0.1 * q(3)], [sx, 1], [sx + 0.1, 0.82], [0.18, 0.7 + 0.1 * q(4)], [0.3, 0.45], [0.5, 0]]
    const at = ([u, v]: Pt): Pt => [x + u * w, base - v * h]
    const fill = (poly: Pt[], col: string) => {
      c.fillStyle = col
      c.beginPath()
      poly.forEach((p, i) => (i ? c.lineTo(...at(p)) : c.moveTo(...at(p))))
      c.closePath()
      c.fill()
    }
    // Snow in the shade on the flank away from the sun, then the flank toward it, lit as the light comes down to it.
    fill(pts, mix(mix(tn.faceShade, tn.faceSnow, 0.25), tn.haze, hz))
    const on = smooth(ly - (base - h), -0.2, 0.5)
    fill([...pts.slice(4), [sx + 0.06, 0], [sx - 0.03, 0.5]], mix(mix(tn.faceSnow, tn.faceLit, 0.9 * on), tn.haze, hz))
  }
  // The floor of the sea between the heaps, in their shadow: bluer toward the lens.
  const floor = (y: number) => mix(top, tn.cloudUnder, 0.12 + 0.4 * smooth(y, DECK, DECK + 5))
  // A heap: a dome with a lesser top behind it and two shoulders before it, each lobe in front of the one behind, so
  // it is lumped as cloud is.
  const heap = (c: C2, [hx, d, r, tall = 1]: [number, number, number, number?], n: number) => {
    const x = hx + (t - 170) * (tall > 1 ? 0.01 : 0.08 * (1 + 0.3 * d))
    const base = DECK + d
    if (x + 1.3 * r < Math.max(lo, flank(base) - 0.6) || x - 1.3 * r > hi || base - r > f.y1) return
    // Flat far off, rounder near.
    const round = (0.28 + 0.2 * smooth(d, 0, 4)) * tall
    const q = (k: number) => hash(n, k, 77)
    const breathe = (i: number) => 1 + 0.05 * Math.sin(t * 0.4 + n + i * 1.7)
    const dome = r * (0.68 + 0.12 * q(2))
    const lobes: [number, number, number, number][] = [
      [x + (q(3) - 0.5) * 0.5 * r, base - dome * round * 1.15, r * (0.36 + 0.1 * q(4)), r * (0.36 + 0.1 * q(4)) * round * breathe(0)],
      [x + (q(1) - 0.5) * 0.25 * r, base - dome * round * 0.45, dome, dome * round * breathe(1)],
      [x - (0.58 + 0.12 * q(5)) * r, base - 0.15 * r * round, r * (0.38 + 0.12 * q(6)), r * (0.38 + 0.12 * q(6)) * round * 0.85 * breathe(2)],
      [x + (0.56 + 0.12 * q(7)) * r, base - 0.2 * r * round, r * (0.4 + 0.12 * q(8)), r * (0.4 + 0.12 * q(8)) * round * 0.85 * breathe(3)],
    ]
    const body = floor(base)
    const side = mix(body, tn.cloudUnder, 0.5)
    // The crowns are only a little lighter than the floor until the sun is on the sea, and then lit.
    const crown = mix(body, mix(top, '#FFFFFF', 0.25), 0.5 + 0.5 * sea)
    const foot = (px: number) => base + 0.05 * r * Math.sqrt(Math.max(0, 1 - ((px - x) / (1.3 * r)) ** 2))
    // Only the top and the dome are high enough to catch the light on a crown.
    lobes.forEach(([cx, cy, rx, ry], i) => lobe(c, cx, cy, rx, ry, foot, side, body, i < 2 ? crown : null))
  }
  inCells(pen, (c) => {
    bands(c, lo, hi, DECK, f.y1 + 0.5, floor, undefined, 8)
    // Its far edge, billowed: low rounded tops, heaped up here and there.
    const step = 0.8
    const go = t * 0.1
    const shift = go % step
    const id0 = Math.floor(go / step)
    const i0 = Math.floor((Math.max(lo, flank(DECK) - 0.2) - step - shift) / step)
    const i1 = Math.ceil((hi - shift) / step) + 1
    const dx = step * 0.12
    const x0 = i0 * step + shift - step
    const n = Math.min(SAMPLES, Math.ceil(((i1 - i0 + 2) * step) / dx) + 1)
    const [et, eb] = ROWS
    et.fill(Infinity, 0, n)
    eb.fill(-Infinity, 0, n)
    for (let i = i0; i <= i1; i++) {
      const h = (k: number) => hash(i - id0, k, 70)
      const rx = step * (0.5 + 0.45 * h(62))
      billow(et, eb, x0, dx, n, i * step + shift + (h(61) - 0.5) * 0.4 * step, DECK + (h(64) - 0.5) * 0.07, rx * 0.94, rx * (0.18 + 0.09 * h(63)) * (1 + 2.4 * h(65) ** 3))
    }
    c.fillStyle = top
    c.fill(rowOutline(et, eb, x0, dx, n))
    for (const s of STANDING) {
      if (s.heap) heap(c, HEAPS[s.i], s.i)
      else island(c, ISLANDS[s.i], s.i)
    }
    // Once the sun is on the sea, each summit's shadow lies across it and over the heaps in front, away from the sun
    // (left, and toward the lens): from the summit's foot to the shadow of its top, long while the sun is low.
    if (sea > 0.02) {
      const path = new Path2D()
      ISLANDS.forEach(([x, d, w, h]) => {
        const base = DECK + d + 0.12
        const L = 0.5 * reach * h
        if (x + w < lo || x - w - L > hi) return
        path.moveTo(x - w * 0.42, base - 0.04)
        path.lineTo(x + w * 0.16, base)
        path.lineTo(x - L, base + 0.38 * L)
        path.closePath()
      })
      c.fillStyle = rgba(shade, 0.5 * sea)
      c.fill(path)
    }
  })
  drawChoughs(pen.c, pen.k, t)
}

/** The snow leopard: pale on pale, long and low, its tail as long again. Barely there, in whatever light there is. */
export function drawCat(pen: Pen, t: number): void {
  const at = catAt(t)
  if (!at) return
  const tn = tone(t)
  const back = litSnow(tn, t, FAR_Y - 0.4, mix(tn.faceSnow, tn.haze, 0.25))
  const coat = mix(back, '#E9E3D6', 0.55)
  const shade = mix(mix(tn.faceShade, tn.haze, 0.2), '#C9C2B4', 0.45)
  const spot = mix(tn.faceRock, '#9E998F', 0.55)
  const { c } = pen
  c.save()
  const s = 0.62
  const x = at.x
  const ground = FAR_Y + 0.1
  const a = 0.92
  const bob = at.walking ? Math.abs(Math.sin(at.stride * Math.PI)) * 0.012 : 0
  const body = ground - 0.2 * s - bob
  // Head: toward them (left) while it looks; otherwise along its way.
  const look = t >= CAT_LOOK && t < CAT_LOOK_AWAY ? Math.min(1, (t - CAT_LOOK) / 0.5) * (1 - Math.max(0, Math.min(1, (t - (CAT_LOOK_AWAY - 0.5)) / 0.5))) : 0
  const leg = (hx: number, phase: number) => {
    const sw = at.walking ? Math.sin((at.stride + phase) * Math.PI * 2) * 0.07 * s : 0
    line(pen, [[x + hx * s, body + 0.04 * s], [x + hx * s + sw, ground]], rgba(shade, a), 0.05 * s)
  }
  leg(-0.32, 0.5)
  leg(0.3, 0)
  // The tail: thick, long, low, curling up at its end.
  const sway = Math.sin(t * 1.1) * 0.04
  const tail: Pt[] = []
  for (let i = 0; i <= 14; i++) {
    const u = i / 14
    tail.push([x - 0.42 * s - u * 0.75 * s, body + 0.02 * s + Math.sin(u * Math.PI * 0.9) * 0.1 * s - u * u * u * 0.32 * s + sway * u])
  }
  line(pen, tail, rgba(shade, a), 0.11 * s)
  line(pen, tail, rgba(coat, a), 0.075 * s)
  // The body, long and low.
  ellipse(pen, x, body, 0.46 * s, 0.15 * s, rgba(coat, a))
  ellipse(pen, x, body + 0.05 * s, 0.4 * s, 0.08 * s, rgba(shade, a * 0.6))
  leg(-0.22, 0)
  leg(0.38, 0.5)
  // Its rosettes: faint.
  for (let i = 0; i < 9; i++) {
    const ux = (hash(i, 71) - 0.5) * 0.7 * s
    const uy = (hash(i, 72) - 0.5) * 0.16 * s
    ellipse(pen, x + ux, body + uy, 0.03 * s, 0.022 * s, rgba(spot, 0.55 * a))
  }
  // The head, small, on a short neck; turned to them while it looks.
  const hx = x + 0.5 * s - look * 0.05 * s
  const hy = body - 0.1 * s
  ellipse(pen, hx, hy, 0.12 * s, 0.1 * s, rgba(coat, a))
  fillPoly(pen, [[hx - 0.07 * s, hy - 0.07 * s], [hx - 0.04 * s, hy - 0.15 * s], [hx - 0.01 * s, hy - 0.08 * s]], rgba(shade, a))
  fillPoly(pen, [[hx + 0.02 * s, hy - 0.08 * s], [hx + 0.05 * s, hy - 0.15 * s], [hx + 0.08 * s, hy - 0.06 * s]], rgba(shade, a))
  // Its eye: the one thing on it that is not pale, and only a little; on the side it looks.
  ellipse(pen, hx + (look > 0.5 ? -0.05 : 0.06) * s, hy - 0.01 * s, 0.016 * s, 0.012 * s, rgba('#6A6F66', 0.8 * a))
  // Its feet in the snow: a little puff on each step.
  for (const st of [...CAT_STEPS_IN, ...CAT_STEPS_OUT]) {
    const g = t - st
    if (g < 0 || g > 0.5) continue
    ellipse(pen, x + 0.2 * s, ground + 0.01, 0.05 + g * 0.1, 0.012, rgba('#FFFFFF', 0.7 * (1 - g / 0.5)))
  }
  c.restore()
}

/* ------------------------------------------------------------------ Sean's tripod */

/** The tripod's shadow on the ledge, once the sun is on it: long and to the left, shortening and swinging as it climbs. */
export function drawTripodShadow(pen: Pen, t: number): void {
  const tn = tone(t)
  const on = smooth(litY(t, 'world') - LEDGE_Y, -0.1, 0.5)
  if (on <= 0.01) return
  const [sx] = SEAN_AT
  const y = LEDGE_Y - 0.01
  const len = 1.6 - 0.9 * smooth(t, 183, 191.4)
  const lift = 0.05 + 0.04 * smooth(t, 183, 191.4)
  const head: Pt = [sx + 0.36 - len * 0.55, y - lift * 0.4]
  const feet: Pt[] = [[sx + 0.12, y], [sx + 0.66, y], [sx + 0.4, y + 0.02]]
  const col = rgba(mix(tn.faceShade, tn.ink, 0.25), 0.45 * on)
  for (const ft of feet) line(pen, [ft, head], col, 0.025)
  // The lens's shadow: a long bar off the head.
  fillPoly(pen, [[head[0] - 0.05, head[1] - 0.012], [head[0] - len * 0.6, head[1] - 0.01], [head[0] - len * 0.62, head[1] + 0.035], [head[0] - 0.04, head[1] + 0.03]], col)
}

/** The tripod, the camera on it, and the long lens out over the valley. Sean's eye is at its left end. */
export function drawTripod(pen: Pen, t: number): void {
  const [sx, sy0] = SEAN_AT
  // The eyepiece is at his eye's height, a little under his middle: he is bent to it.
  const sy = sy0 + 0.07
  const head: Pt = [sx + 0.36, sy - 0.04]
  const feet: Pt[] = [[sx + 0.12, LEDGE_Y], [sx + 0.66, LEDGE_Y], [sx + 0.4, LEDGE_Y + 0.02]]
  for (const ft of feet) line(pen, [head, ft], C.tripod, 0.03)
  // The strap under the lens, swung by the wind; its buckle knocks the near leg on the ticks.
  const swing = strapSwing(t)
  const top: Pt = [sx + 0.62, sy - 0.12]
  const low: Pt = [sx + 0.56 + swing * 0.12, sy - 0.0 - Math.abs(swing) * 0.02]
  line(pen, [top, [(top[0] + low[0]) / 2 + 0.03 + swing * 0.02, (top[1] + low[1]) / 2 + 0.03], low], C.strap, 0.022)
  ellipse(pen, low[0], low[1], 0.022, 0.018, '#8B8F92')
  // On each tick the buckle knocks the leg and shakes a few grains of rime off it, which fall to the ledge.
  for (const k of TICKS) {
    const g = t - k
    if (g < 0 || g > 0.45) continue
    for (let j = 0; j < 4; j++) {
      const vx = (j - 1.5) * 0.2
      const vy = -0.5 - 0.3 * hash(j, 5, 93)
      ellipse(pen, low[0] + vx * g, Math.min(LEDGE_Y - 0.02, low[1] + vy * g + 5 * g * g), 0.012, 0.012, rgba('#FFFFFF', 0.9 * (1 - g / 0.45)))
    }
  }
  // The camera body, and the lens: long, with a pale band, its hood toward the cat.
  fillPoly(pen, [[sx + 0.16, sy - 0.24], [sx + 0.42, sy - 0.24], [sx + 0.42, sy - 0.04], [sx + 0.16, sy - 0.04]], C.tripod)
  ellipse(pen, sx + 0.15, sy - 0.12, 0.025, 0.04, '#1E2124')
  fillPoly(pen, [[sx + 0.4, sy - 0.2], [sx + 1.1, sy - 0.22], [sx + 1.1, sy - 0.04], [sx + 0.4, sy - 0.06]], C.lens)
  fillPoly(pen, [[sx + 0.66, sy - 0.21], [sx + 0.76, sy - 0.21], [sx + 0.76, sy - 0.05], [sx + 0.66, sy - 0.05]], C.lensBand)
  fillPoly(pen, [[sx + 1.1, sy - 0.24], [sx + 1.3, sy - 0.25], [sx + 1.3, sy - 0.01], [sx + 1.1, sy - 0.02]], mix(C.lens, '#000000', 0.2))
}

/** The strap's swing, -1..1: the wind lifts it away, and it falls back against the leg on each tick. */
function strapSwing(t: number): number {
  let last = -Infinity
  let next = Infinity
  for (const k of TICKS) {
    if (k <= t) last = k
    else if (k < next) next = k
  }
  const w = 0.25 + 0.5 * level(t)
  if (next < Infinity && next - t < 0.5) {
    // Lifted, and falling to the leg: it meets it on the tick.
    const u = (next - t) / 0.5
    return -w * Math.sin(u * Math.PI * 0.5)
  }
  // After a knock it rebounds a little and then rides the wind, which gusts it about.
  const g = t - last
  if (g >= 0 && g < 0.6) return w * 0.3 * Math.sin(g * 9) * Math.exp(-g / 0.25)
  return -w * (0.15 + 0.25 * Math.min(1, wind(t) - 0.4)) * Math.sin(t * 2.3) - 0.08 * Math.sin(t * 5.1)
}

/* ------------------------------------------------------------------ what moves on the beats */

/** His landings: a small kick of snow off each step. */
export function drawKicks(pen: Pen, t: number): void {
  for (let i = 0; i < STEPS.length; i++) {
    const g = t - LANDINGS[i]
    if (g < 0 || g > 0.55) continue
    const [x, y] = STEPS[i].p
    const fade = 1 - g / 0.55
    for (let j = -2; j <= 2; j++) {
      if (j === 0) continue
      const vx = j * 0.35
      const vy = -0.55 - Math.abs(j) * 0.1
      ellipse(pen, x + vx * g, Math.min(y + R - 0.01, y + R + vy * g + 3 * g * g), 0.022, 0.022, rgba('#FFFFFF', 0.9 * fade))
    }
  }
}

/**
 * Snow sifting from the rock over them: one thin stream, drifting a little downwind and widening as it falls, thickest
 * at its front, which lands on the ledge on the beat, and thinning to nothing up toward its tail, which follows it down.
 */
const SIFT_FALL = 1.5
/** How long the stream runs off the lip. */
const SIFT_RUN = 1.1
export function drawSifts(pen: Pen, t: number): void {
  const top = LEDGE_Y - 1.2 + 0.02
  const dur = (LEDGE_Y - top) / SIFT_FALL
  const x = (y: number) => SIFT_X + ((y - top) / SIFT_FALL) * 0.14
  const w = (y: number) => 0.012 + (0.03 * (y - top)) / (LEDGE_Y - top)
  for (const s of SIFTS) {
    const g = t - (s - dur)
    if (g < 0 || g > dur + SIFT_RUN) continue
    const y0 = top + Math.max(0, g - SIFT_RUN) * SIFT_FALL
    const y1 = Math.min(LEDGE_Y, top + g * SIFT_FALL)
    if (y1 > y0) {
      const k = pen.k
      const fall = pen.c.createLinearGradient(x(y0) * k, y0 * k, x(y1) * k, y1 * k)
      fall.addColorStop(0, rgba('#FFFFFF', 0))
      fall.addColorStop(1, rgba('#FFFFFF', 0.75 * Math.min(1, (y1 - y0) / 0.4)))
      fillPoly(pen, [[x(y0) - w(y0), y0], [x(y0) + w(y0), y0], [x(y1) + w(y1), y1], [x(y1) - w(y1), y1]], fall)
    }
    const land = t - s
    if (land >= 0 && land < 0.6) ellipse(pen, SIFT_X + 0.1, LEDGE_Y - 0.01, 0.06 + land * 0.25, 0.022, rgba('#FFFFFF', 0.8 * (1 - land / 0.6)))
  }
}
