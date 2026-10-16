import { hash } from '../kit'
import { layer, sway, type View } from '../depth'
import { clamp01, knock, mix, rgba } from './hand'
import { GLASS, TUBE } from './plan'

/**
 * The archive behind the light table (the B1 builder's): aisles of steel shelving going back into the dark, on
 * three planes, with film cans and labelled boxes on them (flat tones, no lettering), a rolling ladder, the far
 * aisle's end with its green exit sign over a door, and high on the back wall a window at street level, the city's
 * daylight coming in through its grating and lying on the wall under it. In front of them, strips of negatives hang drying on lines.
 *
 * The room is lit by the table's spill and nothing else, so the archive is barely there: a can's rim, a box's edge.
 * When the tubes strike and stutter, their flashes light the whole room, and the aisles stand out of the dark for a
 * moment each time before the tubes catch and they settle back into it.
 *
 * Every plane is drawn in its own cells from geometry made once (it does not change with time), in a few flat fills
 * a frame: one for each tone at each of a few distances from the table, lit by the clock.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera is for most of the room's time, and how close: where every plane is composed as seen. */
const ANCHOR: [number, number] = [2.6, -0.6]
const REF = 3.4

/** The tones of the archive: unlit (the dark itself, barely), lit by the table's warm spill, and in a tube's flash. */
const TONES = {
  wall: ['#121819', '#2C302D', '#506466'],
  steel: ['#151B1D', '#4B4D47', '#6E8789'],
  edge: ['#1B2224', '#6A6B62', '#9AB4B4'],
  rim: ['#111617', '#3A3B36', '#58706F'],
  face: ['#192022', '#58574F', '#86A2A2'],
  box: ['#181D1D', '#4E4B42', '#728888'],
  label: ['#1D2322', '#6E6A5D', '#9DB3AE'],
  dark: ['#0C1011', '#1E1F1C', '#2E3B3C'],
} as const
type Tone = keyof typeof TONES
/** How much of the table's spill reaches a thing, by how far it is from the table (the plane's own falloff). */
const BINS = [1, 0.6, 0.3]
/** The planes are cut into columns this many cells wide, so a frame fills only the columns it can see. */
const COLUMN = 2

interface Plane {
  z: number
  /** The share of the table's light that reaches this plane, and of a tube's flash. */
  spill: number
  flash: number
  /** For each column, tone and bin to path, in the plane's cells. */
  columns: Map<number, Map<string, Path2D>>
}

/** How far from the light table a point of a plane is, in its cells, as a bin. Under the table is in its shadow. */
function binOf(x: number, y: number): number {
  const dx = Math.max(0, Math.abs(x - 3) - 3.2)
  const d = Math.hypot(dx * 1.3, (y + 0.6) * 1.2) + (y > 0.2 ? 2.5 : 0)
  return d < 1.2 ? 0 : d < 2.6 ? 1 : 2
}

class Builder {
  columns = new Map<number, Map<string, Path2D>>()
  path(tone: Tone, bin: number, x: number): Path2D {
    const c = Math.floor(x / COLUMN)
    let col = this.columns.get(c)
    if (!col) {
      col = new Map()
      this.columns.set(c, col)
    }
    const key = `${tone}${bin}`
    let p = col.get(key)
    if (!p) {
      p = new Path2D()
      col.set(key, p)
    }
    return p
  }
  /** A box; a long one (a wall, a beam) is cut at the columns. */
  rect(tone: Tone, x0: number, y0: number, x1: number, y1: number, at?: number): void {
    const bin = at ?? binOf((x0 + x1) / 2, (y0 + y1) / 2)
    for (let a = x0; a < x1 - 1e-9; ) {
      const b = Math.min(x1, (Math.floor(a / COLUMN + 1e-9) + 1) * COLUMN)
      this.path(tone, bin, (a + b) / 2).rect(a, y0, b - a + (b < x1 ? 0.002 : 0), y1 - y0)
      a = b
    }
  }
  disc(tone: Tone, x: number, y: number, r: number, at?: number): void {
    const p = this.path(tone, at ?? binOf(x, y), x)
    p.moveTo(x + r, y)
    p.arc(x, y, r, 0, Math.PI * 2)
  }
  quad(tone: Tone, pts: [number, number][], at: number): void {
    const p = this.path(tone, at, pts.reduce((s, [x]) => s + x, 0) / pts.length)
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
    p.closePath()
  }
}

/**
 * A run of steel shelving seen side-on, from `x0` to `x1`, its top at `top`, shelves every `pitch` down to `floor`,
 * and on every shelf what an archive keeps: film cans stood on edge in rows, cans lying flat in stacks, archive boxes
 * with a label on the end. `s` is the size of things on this plane (1 for the nearest).
 */
function shelving(b: Builder, x0: number, x1: number, top: number, floor: number, pitch: number, s: number, seed: number, simple = false): void {
  const post = 0.045 * s
  b.rect('steel', x0 - post, top - 0.04 * s, x1 + post, top + 0.02 * s)
  for (let y = top + pitch, row = 0; y < floor; y += pitch, row++) {
    const bin = binOf((x0 + x1) / 2, y)
    // The shelf's board and its lit front edge.
    b.rect('steel', x0, y, x1, y + 0.035 * s, bin)
    b.rect('edge', x0, y, x1, y + 0.012 * s, bin)
    // What stands on it.
    let x = x0 + 0.06 * s
    let i = 0
    while (x < x1 - 0.12 * s) {
      const h = hash(row, i, seed)
      const at = binOf(x, y)
      if (h < 0.26 && !simple) {
        // A row of cans on edge, touching.
        const r = (0.1 + 0.035 * hash(row, i, seed + 1)) * s * Math.min(1, (pitch * 0.92) / (0.27 * s))
        const n = 2 + Math.floor(hash(row, i, seed + 2) * 4)
        for (let j = 0; j < n && x + 2 * r < x1 - 0.04 * s; j++) {
          const cx = x + r
          const cy = y - r
          b.disc('rim', cx, cy, r, at)
          b.disc('face', cx, cy, r * 0.8, at)
          x += 2 * r + 0.01 * s
        }
      } else if (h < 0.6) {
        // A stack of cans lying flat (far off, one block of them).
        const w = (0.26 + 0.06 * hash(row, i, seed + 3)) * s
        const n = 2 + Math.floor(hash(row, i, seed + 4) * Math.max(1, (pitch / s - 0.06) / 0.055))
        if (simple) b.rect('face', x, y - Math.min(n * 0.052, pitch / s - 0.08) * s, x + w, y, at)
        else
          for (let j = 0; j < n; j++) {
            const cy = y - (j + 1) * 0.052 * s
            if (cy < y - pitch + 0.06 * s) break
            b.rect(j % 2 ? 'face' : 'box', x, cy, x + w, cy + 0.042 * s, at)
          }
        x += w + 0.03 * s
      } else if (h < 0.9) {
        // An archive box, its label on the end facing out.
        const w = (0.3 + 0.16 * hash(row, i, seed + 5)) * s
        const hgt = Math.min(pitch - 0.07 * s, (0.26 + 0.12 * hash(row, i, seed + 6)) * s)
        b.rect('box', x, y - hgt, x + w, y, at)
        if (!simple) b.rect('label', x + w * 0.25, y - hgt * 0.72, x + w * 0.75, y - hgt * 0.5, at)
        x += w + 0.02 * s
      } else x += (0.2 + 0.3 * hash(row, i, seed + 7)) * s
      x += 0.02 * s
      i++
    }
  }
  // The uprights, at the ends and every so often between.
  const n = Math.max(1, Math.round((x1 - x0) / (1.5 * s)))
  for (let j = 0; j <= n; j++) {
    const x = x0 + ((x1 - x0) * j) / n
    b.rect('steel', x - post / 2, top - 0.04 * s, x + post / 2, floor)
  }
}

/** A rolling ladder against a run of shelving: its rails, its rungs, its hook on the top rail and its wheels. */
function ladder(b: Builder, foot: number, top: [number, number], floor: number, s: number): void {
  const at = binOf(foot, (top[1] + floor) / 2)
  const w = 0.32 * s
  const rail = 0.035 * s
  for (const dx of [0, w]) b.quad('steel', [[top[0] + dx, top[1]], [top[0] + dx + rail, top[1]], [foot + dx + rail, floor], [foot + dx, floor]], at)
  const n = Math.floor((floor - top[1]) / (0.28 * s))
  for (let i = 1; i < n; i++) {
    const u = i / n
    const x = top[0] + (foot - top[0]) * u
    const y = top[1] + (floor - top[1]) * u
    b.rect('edge', x, y, x + w + rail, y + 0.025 * s, at)
  }
  b.rect('steel', top[0] - 0.02 * s, top[1] - 0.06 * s, top[0] + w + 0.06 * s, top[1] + 0.02 * s, at)
  b.disc('rim', foot + 0.02 * s, floor - 0.04 * s, 0.045 * s, at)
  b.disc('rim', foot + w + 0.02 * s, floor - 0.04 * s, 0.045 * s, at)
}

/** The planes, made once. Far: the aisles' end, the exit, the back wall. Then two runs of shelving nearer. */
let planes: Plane[] | null = null
function made(): Plane[] {
  if (planes) return planes
  // The far end of the aisles: low runs along the back wall, the door under the exit sign, the ceiling's pipes. Each
  // plane is made only as wide as the camera ever sees it.
  const far = new Builder()
  far.rect('dark', -3, -4.4, 8, -2.2, 2)
  for (const y of [-2.28, -2.22]) far.rect('steel', -3, y, 8, y + 0.02, 2)
  for (let x = -2.6; x < 8; x += 1.3) far.rect('steel', x, -2.32, x + 0.02, -2.2, 2)
  // The ceiling over the far end: its joists, a duct along it in ribbed lengths, the sprinkler line and its heads.
  for (let x = -3; x < 8; x += 0.24) {
    far.rect('steel', x, -4.4, x + 0.05, -2.36, 2)
    far.rect('edge', x, -2.4, x + 0.05, -2.36, 2)
  }
  far.rect('box', -3, -2.9, 8, -2.66, 2)
  for (let x = -2.9; x < 8; x += 0.36) far.rect('edge', x, -2.9, x + 0.025, -2.66, 2)
  far.rect('edge', -3, -2.67, 8, -2.65, 2)
  far.rect('steel', -3, -2.52, 8, -2.49, 2)
  for (let x = -2.5; x < 8; x += 0.9) far.rect('edge', x, -2.49, x + 0.04, -2.44, 2)
  far.rect('dark', 0.68, -1.42, 1.14, 0.6, 2)
  far.rect('steel', 0.65, -1.45, 1.17, -1.42, 2)
  // A riser pipe and the fuse boxes on the back wall, beside the window.
  for (const x of [2.35, 2.43]) far.rect('steel', x, -2.22, x + 0.035, 0.6, 2)
  far.rect('box', 4.3, -1.95, 4.62, -1.62, 2)
  far.rect('label', 4.38, -1.88, 4.54, -1.8, 2)
  far.rect('box', 4.7, -1.9, 4.92, -1.68, 2)
  // Under the window, the old radiator: its fins.
  far.rect('steel', 2.75, -1.62, 4.1, -1.58, 2)
  for (let x = 2.78; x < 4.08; x += 0.045) far.rect('steel', x, -1.58, x + 0.024, -1.3, 2)
  far.rect('steel', 2.75, -1.3, 4.1, -1.27, 2)
  // Under it, a plan chest of shallow drawers, each with its pull.
  far.rect('box', 2.5, -1.18, 4.95, 0.6, 2)
  for (let y = -1.12; y < 0.55; y += 0.13) {
    far.rect('rim', 2.53, y + 0.1, 4.92, y + 0.12, 2)
    far.rect('edge', 2.53, y + 0.12, 4.92, y + 0.13, 2)
    for (const x of [3.05, 4.25]) far.rect('edge', x, y + 0.05, x + 0.14, y + 0.07, 2)
  }
  far.rect('edge', 2.46, -1.22, 4.99, -1.18, 2)
  shelving(far, -3, 0.5, -2.05, 0.6, 0.22, 0.3, 21, true)
  shelving(far, 1.3, 2.25, -2.05, 0.6, 0.22, 0.3, 22, true)
  shelving(far, 5.1, 8, -2.05, 0.6, 0.22, 0.3, 23, true)
  // The middle runs: an aisle open toward the window, and one toward the exit.
  const mid = new Builder()
  shelving(mid, -3.2, -0.05, -1.6, 1.1, 0.3, 0.45, 31)
  shelving(mid, 4.5, 7.7, -1.6, 1.1, 0.3, 0.45, 33)
  shelving(mid, 8.7, 9.6, -1.6, 1.1, 0.3, 0.45, 34)
  // A filing cabinet in the aisle toward the window, its drawers' pulls and label holders.
  mid.rect('steel', 2.6, -1.38, 3.32, 1.1, 1)
  for (let y = -1.32; y < 1.0; y += 0.48) {
    mid.rect('box', 2.64, y, 3.28, y + 0.44, 1)
    mid.rect('label', 2.86, y + 0.08, 3.06, y + 0.14, 1)
    mid.rect('edge', 2.84, y + 0.2, 3.08, y + 0.235, 1)
  }
  // The ceiling over them: a beam, and the long fixtures hanging off it on their chains, unlit.
  mid.rect('dark', -3.2, -3.6, 9.6, -2.78, 2)
  for (let x = -3.2; x < 9.6; x += 0.32) mid.rect('steel', x, -3.6, x + 0.06, -2.8, 2)
  mid.rect('steel', -3.2, -2.8, 9.6, -2.7, 2)
  for (let x = -2.7; x < 9.6; x += 3.4) {
    for (const cx of [x + 0.15, x + 1.15]) mid.rect('steel', cx, -2.7, cx + 0.012, -2.36, 2)
    mid.rect('steel', x, -2.37, x + 1.3, -2.3, 2)
    mid.rect('edge', x + 0.05, -2.3, x + 1.25, -2.285, 2)
  }
  // The nearest runs, taller, at the sides of the table, and the ladders against them.
  const near = new Builder()
  shelving(near, -4.6, -1.2, -1.95, 1.6, 0.38, 0.62, 41)
  shelving(near, 5.6, 9.6, -1.95, 1.6, 0.38, 0.62, 42)
  ladder(near, -1.3, [-1.62, -1.95], 1.6, 0.62)
  ladder(near, 6.4, [6.75, -1.95], 1.6, 0.62)
  planes = [
    { z: 0.3, spill: 0.46, flash: 0.75, columns: far.columns },
    { z: 0.55, spill: 0.6, flash: 0.88, columns: mid.columns },
    { z: 0.8, spill: 0.8, flash: 1, columns: near.columns },
  ]
  return planes
}

/* ------------------------------------------------------------------ the light */

/**
 * The tubes' flashes as the archive sees them, 0 to 1: each strike and stutter lights the room to its far end for a
 * moment, a little longer than the glass shows it, as the eye holds what it has just seen.
 */
export function revealAt(t: number): number {
  if (t < TUBE.strike) return 0
  return clamp01(
    1.0 * knock(t, TUBE.strike, 0.16) +
      0.7 * knock(t, TUBE.flick[0], 0.12) +
      0.85 * knock(t, TUBE.flick[1], 0.15) +
      0.75 * knock(t, TUBE.second, 0.24),
  )
}

/**
 * The street's daylight through the window: always there, a little brighter once the room's eyes have adjusted, and
 * going and coming a little as clouds go over the street.
 */
const dayAt = (t: number): number => (0.55 + 0.45 * Math.min(1, t / 4)) * (1 - 0.1 * (0.5 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1)))

/* ------------------------------------------------------------------ the street outside */

/** Who passes the window, and when: a pair of feet every few seconds, from either side. */
const WALKER = 3.1

/** The window high on the back wall (far plane cells). */
export const WINDOW = { x0: 2.95, x1: 3.85, y0: -1.9, y1: -1.74 }

function drawWindow(ctx: C2, k: number, t: number): void {
  const { x0, x1, y0, y1 } = WINDOW
  const day = dayAt(t)
  // The reveal of the opening, the daylight, and the pavement's edge at the bottom of the view.
  ctx.fillStyle = rgba('#0B0F10', 1)
  ctx.fillRect((x0 - 0.04) * k, (y0 - 0.035) * k, (x1 - x0 + 0.08) * k, (y1 - y0 + 0.07) * k)
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, rgba(mix('#1E2728', '#7F9293', day), 1))
  g.addColorStop(0.62, rgba(mix('#1A2223', '#677A7B', day), 1))
  g.addColorStop(0.63, rgba(mix('#151B1C', '#41504F', day), 1))
  g.addColorStop(1, rgba(mix('#121718', '#324040', day), 1))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  // Feet going by on the pavement: two dark shoes and the legs over them, scissoring, in and out of the frame.
  const walk = new Path2D()
  for (let n = Math.floor(t / WALKER) - 1; n <= Math.floor(t / WALKER); n++) {
    const s = t - n * WALKER - hash(n, 1, 77) * 0.8
    const dir = hash(n, 2, 77) < 0.5 ? 1 : -1
    const v = 0.9 + 0.5 * hash(n, 3, 77)
    const across = x1 - x0 + 0.6
    const u = s * v
    if (u < 0 || u > across) continue
    const cx = dir > 0 ? x0 - 0.3 + u : x1 + 0.3 - u
    const ground = y0 + (y1 - y0) * 0.64
    for (const leg of [0, 1]) {
      const ph = s * v * 7 + leg * Math.PI
      const fx = cx + dir * 0.07 * Math.sin(ph)
      const lift = Math.max(0, Math.cos(ph)) * 0.025
      walk.rect(fx - 0.035, y0 - 0.1, 0.05, ground - y0 + 0.08 - lift)
      walk.rect(fx - 0.04 + dir * 0.012, ground - 0.035 - lift, 0.085, 0.035)
    }
  }
  ctx.fillStyle = rgba('#0E1213', 0.92)
  ctx.save()
  ctx.scale(k, k)
  ctx.fill(walk)
  ctx.restore()
  ctx.restore()
  // The grating: its bars and its rail, dark against the light.
  const bars = new Path2D()
  for (let x = x0 + 0.05; x < x1; x += 0.09) bars.rect(x, y0, 0.018, y1 - y0)
  bars.rect(x0, y0 + (y1 - y0) * 0.45, x1 - x0, 0.016)
  ctx.save()
  ctx.scale(k, k)
  ctx.fillStyle = '#0D1112'
  ctx.fill(bars)
  ctx.restore()
}

/** The window's light into the room: laid on the back wall and the plan chest under it, dimmed as feet cross it. */
function windowLight(ctx: C2, k: number, t: number): void {
  const { x0, x1, y1 } = WINDOW
  const day = dayAt(t)
  // Feet in the window dim its light a little as they cross it.
  let shade = 0
  for (let n = Math.floor(t / WALKER) - 1; n <= Math.floor(t / WALKER); n++) {
    const s = t - n * WALKER - hash(n, 1, 77) * 0.8
    const v = 0.9 + 0.5 * hash(n, 3, 77)
    const u = (s * v) / (x1 - x0 + 0.6)
    if (u > 0.15 && u < 0.85) shade = Math.max(shade, Math.sin(Math.PI * (u - 0.15) / 0.7))
  }
  const a = 0.05 * day * (1 - 0.35 * shade)
  const g = ctx.createLinearGradient(0, y1 * k, 0, 0.6 * k)
  g.addColorStop(0, rgba('#A9C2C4', a))
  g.addColorStop(1, rgba('#A9C2C4', 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x0 * k, y1 * k)
  ctx.lineTo(x1 * k, y1 * k)
  ctx.lineTo((x1 - 0.9) * k, 0.6 * k)
  ctx.lineTo((x0 - 1.6) * k, 0.6 * k)
  ctx.closePath()
  ctx.fill()
}

/** The exit sign over the far door: green, small, the only colour in the room besides the people. */
const EXIT = { x0: 0.81, x1: 1.02, y0: -1.62, y1: -1.55 }
function exitSign(ctx: C2, k: number): void {
  // Its light on the door's head and down the frame.
  ctx.fillStyle = rgba('#2F9E6A', 0.04)
  ctx.fillRect(0.65 * k, -1.45 * k, 0.52 * k, 0.6 * k)
  ctx.fillStyle = '#123224'
  ctx.fillRect((EXIT.x0 - 0.012) * k, (EXIT.y0 - 0.012) * k, (EXIT.x1 - EXIT.x0 + 0.024) * k, (EXIT.y1 - EXIT.y0 + 0.024) * k)
  ctx.fillStyle = '#62D49C'
  ctx.fillRect(EXIT.x0 * k, EXIT.y0 * k, (EXIT.x1 - EXIT.x0) * k, (EXIT.y1 - EXIT.y0) * k)
  ctx.fillStyle = '#2A6E4E'
  ctx.fillRect((EXIT.x0 + 0.035) * k, (EXIT.y0 + 0.022) * k, (EXIT.x1 - EXIT.x0 - 0.07) * k, (EXIT.y1 - EXIT.y0 - 0.044) * k)
}

/* ------------------------------------------------------------------ negatives drying */

/** The lines across the room the developed strips hang from, and the strips on them (midground, z 0.9). */
const STRIPS_Z = 0.9
const LINE_Y = -2.2
/** Where the line runs from and to: hooked between the enlarger and the door. */
const LINE: [number, number] = [0.0, 6.6]
const HANGING: [number, number, number][] = [
  // [x, length, seed]: between the enlarger and the door, clear of the window and the exit where the camera goes.
  [0.5, 1.4, 3],
  [6.0, 1.45, 5],
  [6.42, 1.3, 6],
]

function drawStrips(ctx: C2, k: number, t: number, light: number, flash: number): void {
  // The line, with a little sag between its hooks.
  const sag = (x: number) => LINE_Y + 0.05 * Math.sin(((x - LINE[0]) / (LINE[1] - LINE[0])) * Math.PI)
  ctx.strokeStyle = rgba(mix(mix('#14191B', '#3E4446', light * 0.5), '#6F8486', flash * 0.8), 1)
  ctx.lineWidth = Math.max(0.8, 0.012 * k)
  ctx.beginPath()
  for (let x = LINE[0]; x <= LINE[1] + 1e-6; x += 0.33) (x === LINE[0] ? ctx.moveTo(x * k, sag(x) * k) : ctx.lineTo(x * k, sag(x) * k))
  ctx.stroke()
  const base = mix(mix('#141414', '#3B342B', light * 0.55), '#7C8E8C', flash * 0.7)
  const frame = mix(mix('#191A18', '#57503F', light * 0.6), '#A6B8B4', flash * 0.7)
  const holes = mix(mix('#202322', '#7A7360', light * 0.65), '#C6D6D3', flash * 0.75)
  const clip = mix(mix('#20262A', '#5E6466', light * 0.5), '#B0C2C2', flash * 0.7)
  for (const [x, len, seed] of HANGING) {
    const y = sag(x)
    const a = 0.035 * sway(t, 0.11 + 0.03 * hash(seed, 1), seed)
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.rotate(a)
    ctx.scale(k, k)
    const w = 0.3
    ctx.fillStyle = base
    ctx.fillRect(-w / 2, 0.05, w, len)
    const fr = new Path2D()
    const ho = new Path2D()
    for (let f = 0.12; f + 0.22 < len; f += 0.26) fr.rect(-w / 2 + 0.05, f, w - 0.1, 0.22)
    for (let f = 0.08; f < len; f += 0.065) {
      ho.rect(-w / 2 + 0.012, f, 0.022, 0.03)
      ho.rect(w / 2 - 0.034, f, 0.022, 0.03)
    }
    ctx.fillStyle = frame
    ctx.fill(fr)
    ctx.fillStyle = holes
    ctx.fill(ho)
    // The clip it hangs by.
    ctx.fillStyle = clip
    ctx.fillRect(-0.045, -0.02, 0.09, 0.09)
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the archive, drawn */

/** The tone of `tone` at bin `bin` of a plane, under the table's light `light` and a flash `flash`. */
function toneOf(tone: Tone, bin: number, plane: Plane, light: number, flash: number): string {
  const [dark, lit, flashed] = TONES[tone]
  const c = mix(dark, lit, clamp01(light * plane.spill * BINS[bin]))
  return mix(c, flashed, clamp01(flash * plane.flash * (0.55 + 0.45 * BINS[bin])))
}

/** The archive and what hangs in front of it, behind the room's machine: drawn first in the set. */
export function drawArchive(ctx: C2, v: View, t: number, tubes: number): void {
  // The eye opens to the archive faster than the tubes come up.
  const light = 1 - (1 - tubes) * (1 - tubes)
  const flash = revealAt(t)
  const all = made()
  all.forEach((plane, i) => {
    layer(ctx, v, plane.z, ANCHOR, REF, (inner) => {
      const k = inner.k
      if (i === 0) {
        ctx.fillStyle = toneOf('wall', 2, plane, light, flash)
        ctx.fillRect((inner.x0 - 0.5) * k, (inner.y0 - 0.5) * k, (inner.w + 1) * k, (inner.h + 1) * k)
      }
      ctx.save()
      ctx.scale(k, k)
      const c0 = Math.floor((inner.x0 - 0.4) / COLUMN)
      const c1 = Math.floor((inner.x1 + 0.4) / COLUMN)
      const styles = new Map<string, string>()
      for (let c = c0; c <= c1; c++) {
        const col = plane.columns.get(c)
        if (!col) continue
        for (const [key, path] of col) {
          let style = styles.get(key)
          if (!style) {
            style = toneOf(key.slice(0, -1) as Tone, Number(key.slice(-1)), plane, light, flash)
            styles.set(key, style)
          }
          ctx.fillStyle = style
          ctx.fill(path)
        }
      }
      ctx.restore()
      if (i === 0) exitSign(ctx, k)
    })
  })
}

/**
 * The window and its daylight, drawn over the room's dark so it is there before the tubes strike (it is high on the
 * back wall, over every run of shelving, where nothing in the archive stands in front of it), and the strips drying
 * in front of it.
 */
export function archiveLights(ctx: C2, v: View, t: number, light: number): void {
  layer(ctx, v, 0.3, ANCHOR, REF, (inner) => {
    drawWindow(ctx, inner.k, t)
    // Its light stops where the table's glass stands in front of the back of the room.
    const k = inner.k
    const glass = inner.cy + (GLASS.top - 0.1 - v.cy) * (inner.h / v.h)
    ctx.save()
    ctx.beginPath()
    ctx.rect((inner.x0 - 1) * k, (inner.y0 - 1) * k, (inner.w + 2) * k, (glass - inner.y0 + 1) * k)
    ctx.clip()
    windowLight(ctx, k, t)
    ctx.restore()
  })
  // The strips hang in front of the window, so they come after it, dark till the light finds them.
  layer(ctx, v, STRIPS_Z, ANCHOR, REF, (inner) => drawStrips(ctx, inner.k, t, light, revealAt(t)))
}

/** For the front: where the window and the exit are on the screen's far plane (their light in the air). */
export const ARCHIVE = { anchor: ANCHOR, ref: REF }
