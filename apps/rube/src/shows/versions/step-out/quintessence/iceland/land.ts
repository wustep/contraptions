import { mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { cached, ellipses, outline, polyline, type Frame } from './far'
import { HUSH, PINS, RIGHT_X, RY, SHORE_Y, ridgeY, roadLine } from './geo'
import { rgbaHex, shadows } from './ranges'
import { ICE } from './theme'

/**
 * The mountain the road is cut into, near to (the machine's own plane): moss over black rock, cropped by sheep, with
 * the shadows of the clouds going over it on the wind; the basalt cliff the hairpins hang off, a fall of water coming
 * off its lip; the road's worn asphalt; and the shore's black stones, the fjord lapping at them.
 *
 * The moss is a tile painted once and laid as a pattern (one fill a frame), and the road's wear is made once in
 * chunks along it, only the chunks in the frame drawn.
 */

/* ------------------------------------------------------------------ the hill */

const EDGE = RIGHT_X + 0.5
const TOP = ridgeY(EDGE) - 0.3
/** Down the cliff below the right-hand hairpins: ragged basalt, stepping out. */
const STEPS: Pt[] = [
  [EDGE, TOP],
  [EDGE + 0.12, TOP + 0.25],
  [EDGE + 0.05, TOP + 0.8],
  [EDGE + 0.3, PINS[0].cy + RY + 0.2],
  [EDGE + 0.18, PINS[0].cy + RY + 0.9],
  [EDGE + 0.42, PINS[2].cy - 0.3],
  [EDGE + 0.3, PINS[2].cy + 0.5],
  [EDGE + 0.55, PINS[2].cy + RY + 0.3],
  [EDGE + 0.75, SHORE_Y - 0.6],
  [EDGE + 1.3, SHORE_Y - 0.36],
]
/** The shore's line: the water's edge along the foot of everything. */
export const shoreY = (x: number): number => SHORE_Y + 0.26 + 0.05 * Math.sin(x * 1.7) + 0.03 * Math.sin(x * 4.1)
/** The mountain's outline, from the ridge round the cliff to the shore. */
export const HILL: Pt[] = (() => {
  const out: Pt[] = []
  for (let x = -60; x <= EDGE; x += 0.25) out.push([x, ridgeY(x) - 0.3])
  out.push(...STEPS.slice(1))
  out.push([70, SHORE_Y - 0.33], [70, SHORE_Y + 0.26])
  for (let x = 70; x >= -60; x -= 0.5) out.push([x, shoreY(x)])
  return out
})()
export const hillPath = cached(() => outline(HILL))

/** The cliff's face: the basalt the hairpins hang over, in columns. */
const CLIFF = cached(() => {
  const face = outline([...STEPS, [EDGE + 1.3, SHORE_Y - 0.2], ...[...STEPS].reverse().map(([x, y]): Pt => [x - 0.32 - 0.06 * Math.sin(y * 3), y])])
  const columns = new Path2D()
  for (let i = 0; i < 46; i++) {
    const y0 = TOP + 0.1 + (SHORE_Y - TOP - 0.4) * hash(i, 201)
    const len = 0.25 + 0.5 * hash(i, 202)
    // Where the face is at this height.
    let x = EDGE
    for (let s = 1; s < STEPS.length; s++) if (STEPS[s][1] >= y0) {
      const [ax, ay] = STEPS[s - 1]
      const [bx, by] = STEPS[s]
      x = ax + ((bx - ax) * (y0 - ay)) / Math.max(1e-6, by - ay)
      break
    }
    const cx = x - 0.04 - 0.24 * hash(i, 203)
    polyline([[cx, y0], [cx + 0.01, y0 + len]], columns)
  }
  return { face, columns }
})
/** The fall off the cliff: over its lip and down the face to the first ledge, where the face steps out. */
const FALL_X = EDGE - 0.1
const FALL_TOP = TOP + 0.02
const FALL_FOOT = PINS[0].cy + RY + 0.2

/* ------------------------------------------------------------------ the moss */

/**
 * The moss is a tile painted once and laid over the hill as a pattern: big soft swells of darker moss, a few
 * tussocks darker and lighter, and a few stones. Two grains: a fine one close to, and a coarse one (each tussock twice
 * the size) for the wide, so on the screen the grain is about the same.
 */
const TILE = 4
const PPC = 150
const mossCanvases = new Map<number, HTMLCanvasElement | null>()
function mossCanvas(lod: number): HTMLCanvasElement | null {
  if (mossCanvases.has(lod)) return mossCanvases.get(lod) ?? null
  if (typeof document === 'undefined') return null
  const size = TILE * lod
  const ppc = PPC / lod
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.round(size * ppc)
  const g = canvas.getContext('2d')
  if (!g) return null
  g.scale(ppc, ppc)
  g.fillStyle = ICE.moss
  g.fillRect(0, 0, size, size)
  const seed = 300 + lod
  const s = lod
  // Every mark drawn again a tile over where it crosses an edge, so the tile meets itself.
  const each = (n: number, salt: number, mark: (x: number, y: number, m: number) => void) => {
    for (let m = 0; m < n; m++) {
      const x = hash(m, salt, seed) * size
      const y = hash(m, salt + 1, seed) * size
      for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
        if (Math.abs(x + dx - size / 2) > size / 2 + 0.3 * s || Math.abs(y + dy - size / 2) > size / 2 + 0.3 * s) continue
        mark(x + dx, y + dy, m)
      }
    }
  }
  const fill = (colour: string, a: number, draw: (path: Path2D) => void) => {
    const path = new Path2D()
    draw(path)
    g.globalAlpha = a
    g.fillStyle = colour
    g.fill(path)
  }
  // Big soft swells of darker moss, then a few tussocks on them, darker and lighter, then a few stones.
  fill(ICE.mossDeep, 0.35, (path) => each(26, 5, (x, y, m) => {
    const r = (0.25 + 0.35 * hash(m, 7, seed)) * s
    path.moveTo(x + r, y)
    path.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2)
  }))
  fill(ICE.mossDark, 0.28, (path) => each(60, 10, (x, y, m) => {
    const r = (0.06 + 0.08 * hash(m, 12, seed)) * s
    path.moveTo(x + r, y)
    path.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2)
  }))
  fill(ICE.mossLight, 0.2, (path) => each(40, 20, (x, y, m) => {
    const r = (0.05 + 0.07 * hash(m, 22, seed)) * s
    path.moveTo(x + r, y)
    path.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2)
  }))
  fill(ICE.basaltLight, 1, (path) => each(6, 40, (x, y, m) => {
    const r = (0.05 + 0.07 * hash(m, 42, seed)) * s
    const pts: Pt[] = []
    for (let q = 0; q < 7; q++) {
      const a = (q / 7) * Math.PI * 2
      const rr = r * (0.65 + 0.35 * hash(m * 7 + q, 43, seed))
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6])
    }
    outline(pts, path)
  }))
  mossCanvases.set(lod, canvas)
  return canvas
}
const mossPatterns = new WeakMap<CanvasRenderingContext2D, Map<number, CanvasPattern>>()
function mossPattern(ctx: CanvasRenderingContext2D, lod: number): CanvasPattern | null {
  let mine = mossPatterns.get(ctx)
  if (!mine) mossPatterns.set(ctx, (mine = new Map()))
  const had = mine.get(lod)
  if (had) return had
  const canvas = mossCanvas(lod)
  const pattern = canvas ? ctx.createPattern(canvas, 'repeat') : null
  if (!pattern) return null
  // The tile's pixels to cells.
  pattern.setTransform(new DOMMatrix().scale(lod / PPC))
  mine.set(lod, pattern)
  return pattern
}

/* ------------------------------------------------------------------ the sheep */

/** Where the sheep graze, a ewe and her lambs together: on the moss under the ridge road, and between the road's tiers. */
const FLOCK: { x: number; y: number; room: number; ph: number }[] = (() => {
  const road = roadLine(0.08)
  const out: { x: number; y: number; room: number; ph: number }[] = []
  // Each group: where it is along the hill, which gap down the hill it grazes in, and how many there are.
  const groups: [number, number, number][] = [[-2.6, 0, 2], [1.4, 0, 1], [6.3, 1, 3], [11.9, 2, 2], [16.4, 4, 3], [18.6, 1, 2]]
  groups.forEach(([x, gap, n], i) => {
    // The road's crossings at this x, top to bottom, and the moss between them.
    const ys = road.filter(([rx], q) => q > 0 && (road[q - 1][0] - x) * (rx - x) <= 0).map(([, ry]) => ry).sort((a, b) => a - b)
    const gaps: [number, number][] = []
    for (let q = 0; q < ys.length; q++) gaps.push([ys[q], q + 1 < ys.length ? ys[q + 1] : Math.min(ys[q] + 2.2, shoreY(x) - 0.2)])
    const usable = gaps.filter(([a, b]) => b - a > 0.6)
    if (!usable.length) return
    const [a, b] = usable[gap % usable.length]
    const y = a + 0.3 + (b - a - 0.55) * hash(i, 211)
    const ph = hash(i, 212) * 6.283
    for (let m = 0; m < n; m++) out.push({ x: x + (m - (n - 1) / 2) * 0.24, y: y + 0.05 * (m % 2), room: Math.min(0.5, (b - a) * 0.25), ph: ph + 0.4 * m })
  })
  return out
})()

function drawSheep(ctx: CanvasRenderingContext2D, f: Frame, t: number, dim: number): void {
  const wool = new Path2D()
  const dark = new Path2D()
  for (const s of FLOCK) {
    if (s.x < f.x0 - 1 || s.x > f.x1 + 1 || s.y < f.y0 - 1 || s.y > f.y1 + 1) continue
    // Ambling: a few steps, then grazing a while, head down.
    const walk = Math.sin(t * 0.19 + s.ph)
    const x = s.x + s.room * 0.6 * Math.sin(t * 0.09 + s.ph) + 0.06 * walk
    const face = Math.cos(t * 0.09 + s.ph) >= 0 ? 1 : -1
    const graze = 0.5 + 0.5 * Math.sin(t * 0.8 + s.ph * 3)
    const y = s.y
    ellipses(wool, [[x, y - 0.06, 0.075, 0.048], [x - face * 0.03, y - 0.075, 0.045, 0.035]])
    ellipses(dark, [[x + face * (0.078 + 0.01 * graze), y - 0.07 + 0.035 * graze, 0.024, 0.02]])
    const step = 0.012 * Math.sin(t * 6 + s.ph) * Math.max(0, walk)
    dark.rect(x - 0.045 + step, y - 0.03, 0.012, 0.04)
    dark.rect(x + 0.035 - step, y - 0.03, 0.012, 0.04)
  }
  ctx.fillStyle = mixHex(ICE.wool, ICE.ash, dim)
  ctx.fill(wool)
  ctx.fillStyle = ICE.basalt
  ctx.fill(dark)
}

/* ------------------------------------------------------------------ the road and the shore */

const ROAD: Pt[] = roadLine()
/** The road's wear in chunks along it: patches of newer tar, the wheels' tracks worn pale, cracks; and the shoulders' gravel. */
const WEAR = cached(() => {
  const chunks: { x0: number; x1: number; y0: number; y1: number; tar: Path2D; tracks: Path2D; grit: Path2D }[] = []
  const N = 40
  for (let c = 0; c * N < ROAD.length - 1; c++) {
    const pts = ROAD.slice(c * N, Math.min(ROAD.length, (c + 1) * N + 1))
    const tar = new Path2D()
    const tracks = new Path2D()
    const grit = new Path2D()
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    pts.forEach(([x, y], q) => {
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
      if (q === 0) return
      const [px, py] = pts[q - 1]
      const g = c * N + q
      // The road's middle is 0.12 over its surface line, and it is 0.37 wide; the shoulders 0.055 each side of that.
      // The two tracks, a little paler, where the wheels go.
      for (const off of [-0.21, -0.04]) {
        tracks.moveTo(px, py + off)
        tracks.lineTo(x, y + off)
      }
      // Patches of newer tar.
      if (hash(g, 1, 221) < 0.06) {
        const off = -0.12 + (hash(g, 2, 221) - 0.5) * 0.14
        const w = 0.03 + 0.03 * hash(g, 3, 221)
        tar.moveTo(px, py + off - w)
        tar.lineTo(x + (x - px) * 1.5, y + off - w * 0.7)
        tar.lineTo(x + (x - px) * 1.5, y + off + w)
        tar.lineTo(px, py + off + w * 0.8)
        tar.closePath()
      }
      // The shoulders' gravel.
      for (let m = 0; m < 3; m++) {
        const off = m % 2 ? 0.07 + 0.045 * hash(g, m, 222) : -0.36 + 0.045 * hash(g, m, 223)
        const u = hash(g, m, 224)
        const r = 0.006 + 0.008 * hash(g, m, 225)
        grit.rect(px + (x - px) * u - r, py + (y - py) * u + off - r, 2 * r, 2 * r)
      }
    })
    chunks.push({ x0, x1, y0: y0 - 0.5, y1: y1 + 0.5, tar, tracks, grit })
  }
  return chunks
})

/** Stones along the water's edge, in chunks of shore four cells long. */
const STONES = cached(() => {
  const chunks: Path2D[] = []
  for (let c = 0; c < 23; c++) {
    const list: [number, number, number, number][] = []
    for (let i = 0; i < 24; i++) {
      const x = -20 + 4 * c + 4 * hash(i, c, 231)
      const r = 0.025 + 0.05 * hash(i, c, 232)
      list.push([x, shoreY(x) - 0.02 - 0.12 * hash(i, c, 233), r, r * 0.6])
    }
    chunks.push(ellipses(new Path2D(), list))
  }
  return chunks
})

/* ------------------------------------------------------------------ drawing */

/** How the grain of the moss is drawn at this frame: finer close, coarser in the wide, crossfaded between. */
const lodMix = (H: number): number => Math.max(0, Math.min(1, (H - 6.6) / 1.2))

/** The hill, its moss, sheep and weather; the cliff and its fall; the road; the shore. Drawn in cells (`k` applied). */
export function drawLand(ctx: CanvasRenderingContext2D, f: Frame, k: number, t: number, dim: number): void {
  const H = f.y1 - f.y0
  ctx.save()
  ctx.scale(k, k)
  const hill = hillPath()
  const mix = lodMix(H)
  for (const [lod, a] of [[1, 1], [2, mix]] as const) {
    if ((lod === 1 && mix >= 1) || a <= 0) continue
    const pattern = mossPattern(ctx, lod)
    // Close to the tile's own scale the pattern is laid on as it is (cheaper); larger, it is smoothed.
    const m = ctx.getTransform()
    ctx.imageSmoothingEnabled = (Math.hypot(m.a, m.b) * lod) / PPC > 1.35
    ctx.globalAlpha = a
    ctx.fillStyle = pattern ?? ICE.moss
    ctx.fill(hill)
  }
  ctx.globalAlpha = 1
  ctx.imageSmoothingEnabled = true
  drawSheep(ctx, f, t, dim)
  ctx.save()
  ctx.clip(hill)
  // The cloud shadows, going over on the wind: bigger and faster than on the far mountains, as nearer things go.
  shadows(ctx, f, t, 0.42, 9, 1.6, 2.6, 241, 0.13 * (1 - dim * 0.7))
  shadows(ctx, f, t, 0.42, 9, 5.6, 2.6, 251, 0.13 * (1 - dim * 0.7))
  ctx.restore()

  // The cliff, and its fall.
  if (f.x1 > EDGE - 1 && f.x0 < EDGE + 2) {
    const cliff = CLIFF()
    ctx.fillStyle = ICE.basalt
    ctx.fill(cliff.face)
    ctx.strokeStyle = rgbaHex(ICE.rockLit, 0.55)
    ctx.lineWidth = 0.02
    ctx.lineCap = 'butt'
    ctx.stroke(cliff.columns)
    // The fall: a ribbon of white water off the lip, widening as it drops, its edges stirring and its strands and
    // pale streaks running down it; spray where it lands on the ledge, and a stain of wet rock either side of it.
    const len = FALL_FOOT - FALL_TOP
    const mid = (y: number) => FALL_X + 0.03 * Math.sin(y * 2.3) + (0.06 * (y - FALL_TOP)) / len
    const half = (y: number) => {
      const u = (y - FALL_TOP) / len
      return 0.022 + 0.04 * u + 0.006 * Math.sin(y * 11 - t * 9) * Math.min(1, u * 4)
    }
    const left: Pt[] = []
    const right: Pt[] = []
    const n = 24
    for (let i = 0; i <= n; i++) {
      const y = FALL_TOP + (len * i) / n
      left.push([mid(y) - half(y), y])
      right.push([mid(y) + half(y), y])
    }
    ctx.fillStyle = rgbaHex(ICE.basaltLight, 0.9)
    ctx.fill(outline([...left.map(([x, y]): Pt => [x - 0.035, y]), ...right.map(([x, y]): Pt => [x + 0.035, y]).reverse()]))
    ctx.fillStyle = rgbaHex(ICE.fall, 0.9)
    ctx.fill(outline([...left, ...[...right].reverse()]))
    const strands = new Path2D()
    for (const at of [-0.45, 0.15, 0.6]) {
      for (let i = 0; i <= n; i++) {
        const y = FALL_TOP + (len * i) / n
        const x = mid(y) + at * half(y) + 0.004 * Math.sin(y * 17 + at * 5)
        if (i) strands.lineTo(x, y)
        else strands.moveTo(x, y)
      }
    }
    ctx.lineCap = 'round'
    ctx.strokeStyle = rgbaHex(ICE.fallShade, 0.55)
    ctx.lineWidth = 0.008
    ctx.stroke(strands)
    const water = new Path2D()
    for (let j = 0; j < 12; j++) {
      const y0 = FALL_TOP + ((j / 12 + (t * 0.7) / len + hash(j, 1, 261) * 0.08) % 1) * len
      const y1 = Math.min(FALL_FOOT, y0 + 0.16 + 0.1 * hash(j, 2, 261))
      const at = (hash(j, 3, 261) - 0.5) * 1.2
      water.moveTo(mid(y0) + at * half(y0), y0)
      water.lineTo(mid(y1) + at * half(y1), y1)
    }
    ctx.strokeStyle = rgbaHex(ICE.foam, 0.95)
    ctx.lineWidth = 0.014
    ctx.stroke(water)
    ctx.fillStyle = rgbaHex(ICE.fall, 0.7)
    ctx.beginPath()
    for (let m = 0; m < 4; m++) {
      const r = 0.09 + 0.03 * Math.sin(t * 2.1 + m * 2)
      const x = mid(FALL_FOOT) + (m - 1.5) * 0.08
      ctx.moveTo(x + r, FALL_FOOT - 0.01)
      ctx.ellipse(x, FALL_FOOT - 0.01, r, r * 0.55, 0, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  // The road: gravel shoulders, the asphalt with its wear, a pale line at its near edge.
  const lift = (dy: number) => ROAD.filter(([x]) => x > f.x0 - 3 && x < f.x1 + 3).map(([x, y]): Pt => [x, y + dy])
  const line = (pts: Pt[], colour: string, w: number) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke(polyline(pts))
  }
  const mid = lift(-0.12)
  line(mid, ICE.gravel, 0.48)
  line(mid, ICE.asphalt, 0.37)
  for (const ch of WEAR()) {
    if (ch.x1 < f.x0 - 0.5 || ch.x0 > f.x1 + 0.5 || ch.y1 < f.y0 || ch.y0 > f.y1) continue
    ctx.fillStyle = ICE.tar
    ctx.fill(ch.tar)
    ctx.strokeStyle = rgbaHex(ICE.track, 0.35)
    ctx.lineWidth = 0.05
    ctx.stroke(ch.tracks)
    ctx.fillStyle = ICE.gravelDark
    ctx.fill(ch.grit)
  }
  line(lift(0.035), rgbaHex(ICE.roadLine, 0.55), 0.022)
  line(lift(-0.27), rgbaHex(ICE.roadLine, 0.25), 0.014)

  // The shore: a lip of black stones, and the fjord lapping at them.
  if (f.y1 > SHORE_Y - 0.5) {
    ctx.strokeStyle = rgbaHex(ICE.basalt, 0.8)
    ctx.lineWidth = 0.06
    const edge = HILL.filter(([x, y]) => y > SHORE_Y + 0.1 && x > f.x0 - 2 && x < f.x1 + 2)
    ctx.stroke(polyline(edge))
    ctx.fillStyle = ICE.basaltLight
    {
      const chunks = STONES()
      for (let c = Math.max(0, Math.floor((f.x0 + 20) / 4) - 1); c <= Math.min(chunks.length - 1, Math.floor((f.x1 + 20) / 4) + 1); c++) ctx.fill(chunks[c])
    }
    const foam = new Path2D()
    for (let x = Math.floor(f.x0 * 4) / 4 - 0.5; x < f.x1 + 0.5; x += 0.25) {
      const lap = 0.04 + 0.035 * Math.sin(t * 1.3 + x * 0.9)
      const y = shoreY(x) + lap
      if (x === Math.floor(f.x0 * 4) / 4 - 0.5) foam.moveTo(x, y)
      else foam.lineTo(x, y)
    }
    ctx.strokeStyle = rgbaHex(ICE.foam, 0.55 * (1 - dim * 0.4))
    ctx.lineWidth = 0.03
    ctx.stroke(foam)
  }

  // The ash, settling on everything.
  const settle = smooth01(t, HUSH + 2, 133.3)
  if (settle > 0) {
    ctx.fillStyle = rgbaHex(ICE.ash, 0.5 * settle)
    ctx.fill(hill)
  }
  ctx.restore()
}

const smooth01 = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}
