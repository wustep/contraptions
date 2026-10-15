import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { frame, hash, scenery } from './kit'
import { bloom, confetti, flicker, motes, pulse, rising, shaft } from './depth'
import { live } from './live'
import { BAR, CREDITS_AT, DURATION, at } from './music'
import { ctxOf, rgb } from './pen'
import { snapshot, painted, rest, type Snap } from './snap'

/**
 * The finale: the machine, whole.
 *
 * Under the credits the camera comes away from the nursery's glass, and keeps coming: the ward is the top floor of a
 * building cut open like a doll's house, and every floor under it is a place he has been, each painted as the show
 * painted it at its moment (`snap.ts`): the shoe store and the British Open at the bottom, the hotel and the bowling
 * alley over them, the farm on fire and the airfield, and Tokyo beside the ward at the top. It stands in a city at
 * dawn, the sun coming up behind it.
 *
 * The building is asleep as the camera finds it, its rooms dark. Then the light of his path runs up through it, from
 * the store's counter through every room he crossed, bounce by bounce, out through the walls and up the pipes on the
 * building's sides, and each room's lights come on as it passes (the store's opening bars again, the windows across
 * the street waking a beat apiece, now a whole building); it comes in at the ward and up onto the sill where he is at
 * the glass with his son, and stays lit, a bead of light running up it now and then, while the city wakes round it.
 *
 * Everything here is in the ward's own cells (the building is laid round the ward where it stands), drawn over the
 * ward everywhere but in the ward's own room, which is the ward itself, live.
 */

export const FINALE = CREDITS_AT

/* ------------------------------------------------------------------ the building */

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}
/** The three columns of rooms and the three floors, top to bottom: the ward's room is the top of the right column. */
const COL: [number, number][] = [
  [-68, -43.5],
  [-42.5, -18],
  [-17, 7.5],
]
const FLOORS: [number, number][] = [
  [-5.9, 2.6],
  [3.6, 12.1],
  [13.1, 21.6],
]
const WALL = 1
const ROOF = -7.1
const BASE = 22.6
const LEFT = COL[0][0] - WALL
const RIGHT = COL[2][1] + WALL
const roomBox = (col: number, floor: number): Box => ({ x0: COL[col][0], x1: COL[col][1], y0: FLOORS[floor][0], y1: FLOORS[floor][1] })
/** The ward, live: the room the building is laid round. */
export const WARD_ROOM = roomBox(2, 0)

interface Room {
  key: string
  box: Box
  /** The place painted into it, or none for the ward (itself). */
  snap?: Snap
  /** Which way his path crosses it: 1 left to right, -1 right to left. */
  dir: 1 | -1
  /** The room's own life over its picture. */
  life: (pen: Lens, t: number, lit: number) => void
}

/** A pen of sorts for the rooms: the canvas, cells, and a box to put things in by fractions of it. */
interface Lens {
  p: p5
  k: number
  box: Box
  at: (u: number, v: number) => Pt
}

const PIC_W = 1150
const PIC_H = 400

/** The rooms in the order his path runs through them, bottom to top. */
const ROOMS: Room[] = [
  { key: 'store', box: roomBox(0, 2), dir: 1, snap: { key: 'store', t: 15.5, at: [9.1, -0.25], cells: 8.5 }, life: storeLife },
  { key: 'london', box: roomBox(1, 2), dir: 1, snap: { key: 'london', t: 62, at: [2.0, -1.5], cells: 10 }, life: londonLife },
  { key: 'hotel', box: roomBox(2, 2), dir: 1, snap: { key: 'hotel', t: 101.5, at: [5.0, 1.6], cells: 8.5 }, life: hotelLife },
  { key: 'alley', box: roomBox(2, 1), dir: -1, snap: { key: 'alley', t: 129.6, at: [6.1, -2.6], cells: 8.5 }, life: alleyLife },
  { key: 'road', box: roomBox(1, 1), dir: -1, snap: { key: 'road', t: 144, at: [22.05, -1.32], cells: 7.5 }, life: roadLife },
  { key: 'barn', box: roomBox(0, 1), dir: -1, snap: { key: 'barn', t: 160, at: [46.6, -2.6], cells: 10 }, life: jerseyLife },
  { key: 'airfield', box: roomBox(0, 0), dir: 1, snap: { key: 'airfield', t: 171, at: [60.5, -1.3], cells: 8.5 }, life: airfieldLife },
  { key: 'tokyo', box: roomBox(1, 0), dir: 1, snap: { key: 'tokyo', t: 190.0, at: [2.9, -2.0], cells: 9.5 }, life: tokyoLife },
  { key: 'ward', box: WARD_ROOM, dir: 1, life: () => {} },
]

/* ------------------------------------------------------------------ his path */

/** Where he is at the glass at the end (`hospital/geo.ts` AT_GLASS), the path's end. */
const SILL: Pt = [-7.7, 0.05 - 0.13]
/** The pipes on the building's two sides that carry the path up a floor. */
const PIPE_L = LEFT - 0.75
const PIPE_R = RIGHT + 0.75

/** His path through the building: bounces across each room, out through its wall, up a pipe, in at the next floor. */
const PATH: Pt[] = (() => {
  const out: Pt[] = []
  // A ball's way across a room: a few long bounces, each a little lower than the last, as he would go.
  const hops = (x0: number, x1: number, y: number, n: number, h: number) => {
    for (let i = 0; i < n; i++) {
      const a = x0 + ((x1 - x0) * i) / n
      const b = x0 + ((x1 - x0) * (i + 1)) / n
      const hh = h * (0.8 + 0.4 * hash(i, Math.round(y * 3), 41)) * (1 - 0.06 * (i % 3))
      for (let j = i === 0 && out.length === 0 ? 0 : 1; j <= 16; j++) {
        const u = j / 16
        out.push([a + (b - a) * u, y - 4 * hh * u * (1 - u)])
      }
    }
  }
  const floorY = (f: number) => FLOORS[f][1] - 0.7
  const L = COL[0][0] + 0.6
  const Rr = COL[2][1] - 0.6
  // The store, London and the hotel, left to right along the ground floor.
  hops(L, Rr, floorY(2), 12, 2.6)
  // Out through the hotel's wall, up the right-hand pipe to the alley.
  out.push([PIPE_R, floorY(2)], [PIPE_R, floorY(1)], [Rr, floorY(1)])
  hops(Rr, L, floorY(1), 12, 2.8)
  out.push([PIPE_L, floorY(1)], [PIPE_L, floorY(0)], [L, floorY(0)])
  // The airfield and Tokyo, into the ward along its floor, and up onto the nursery's sill.
  hops(L, -12.6, floorY(0), 9, 2.8)
  const [sx, sy] = SILL
  for (let j = 1; j <= 16; j++) {
    const u = j / 16
    out.push([-12.6 + (sx - -12.6) * u, floorY(0) + (sy - floorY(0)) * u - 4 * 1.6 * u * (1 - u)])
  }
  return out
})()
/** How far along the path each point is, in cells. */
const ALONG: number[] = (() => {
  const d = [0]
  for (let i = 1; i < PATH.length; i++) d.push(d[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]))
  return d
})()
const LENGTH = ALONG[ALONG.length - 1]

/** Where his path comes into each room, in cells along it. */
const ENTRIES: number[] = ROOMS.map((room) => ALONG[Math.max(0, PATH.findIndex(([x, y]) => x >= room.box.x0 - 0.01 && x <= room.box.x1 + 0.01 && y >= room.box.y0 && y <= room.box.y1))])
/**
 * The light runs up his path on the song's last two bars, a room a beat (the store's windows across the street woke a
 * beat apiece; now the building does), and comes to him at the glass on the song's last beat.
 */
const KNOTS: [number, number][] = [
  ...ROOMS.slice(0, -1).map((_, i): [number, number] => [at(113 + Math.floor(i / 4), 1 + (i % 4)), ENTRIES[i]]),
  [at(115, 1), LENGTH],
]
const RUN_FROM = KNOTS[0][0]
const RUN_TO = KNOTS[KNOTS.length - 1][0]
/** How far along his path the light has run at `t`. */
function runAt(t: number): number {
  if (t <= RUN_FROM) return 0
  for (let i = 1; i < KNOTS.length; i++) {
    const [t1, d1] = KNOTS[i]
    if (t > t1) continue
    const [t0, d0] = KNOTS[i - 1]
    return d0 + ((d1 - d0) * (t - t0)) / (t1 - t0)
  }
  return LENGTH
}
/** The point `d` cells along the path. */
function pointAt(d: number): Pt {
  let lo = 0
  let hi = ALONG.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ALONG[mid] <= d) lo = mid
    else hi = mid - 1
  }
  if (lo >= PATH.length - 1) return PATH[PATH.length - 1]
  const u = (d - ALONG[lo]) / Math.max(1e-6, ALONG[lo + 1] - ALONG[lo])
  return [PATH[lo][0] + (PATH[lo + 1][0] - PATH[lo][0]) * u, PATH[lo][1] + (PATH[lo + 1][1] - PATH[lo][1]) * u]
}
/** When each room wakes: as the light comes in. */
const WAKES: number[] = [...KNOTS.slice(0, ROOMS.length - 1).map(([t]) => t), FINALE]

/* ------------------------------------------------------------------ the camera */

/** Where the crane has the camera when it has come all the way out, and when. */
const OUT_AT = at(113, 1)
const OUT_CELLS = 48
/** His place on the screen at the end: high on the right, the building's top floor, the sky over it for the credits. */
const OUT_SCREEN: Pt = [(SILL[0] - (LEFT + RIGHT) / 2) / OUT_CELLS, (SILL[1] - 2.6) / OUT_CELLS]

const smoother = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (6 * v - 15) + 10)
}

/**
 * The crane over the credits, from the camera's last framing on the glass (`from`, at FINALE): out and down, Marty
 * held on the screen and drifting to the building's top floor as it is found, until the whole building is in the
 * frame with the sky over it for the credits; then a slow drift on out to the end.
 */
export function crane(t: number, from: Framing): Framing {
  if (t <= FINALE) return from
  const u = (t - FINALE) / (OUT_AT - FINALE)
  const drift = Math.max(0, t - OUT_AT) / (DURATION - OUT_AT)
  const cells = Math.exp(Math.log(from.cells) + (Math.log(OUT_CELLS) - Math.log(from.cells)) * smoother(u)) * (1 + 0.07 * drift)
  const start: Pt = [(SILL[0] - from.x) / from.cells, (SILL[1] - from.y) / from.cells]
  const s = smoother(u * 1.15 - 0.1)
  const o: Pt = [start[0] + (OUT_SCREEN[0] - start[0]) * s, start[1] + (OUT_SCREEN[1] - start[1]) * s]
  return { ...from, x: SILL[0] - o[0] * cells, y: SILL[1] - o[1] * cells, cells }
}
/** From when Marty is too small on the screen to be the shot: the finale's wide. */
export const FINALE_WIDE: [number, number][] = [[FINALE + 0.47 * (OUT_AT - FINALE), DURATION]]

/* ------------------------------------------------------------------ the city */

const css = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}

interface Tower {
  x: number
  w: number
  top: number
  kind: number
}
/** A skyline: towers along a layer's ground, laid by hash so it is the same every time. */
function skyline(seed: number, from: number, to: number, ground: number, lo: number, hi: number, wide: [number, number]): Tower[] {
  const out: Tower[] = []
  let x = from
  let i = 0
  while (x < to) {
    const w = wide[0] + (wide[1] - wide[0]) * hash(i, seed, 1)
    const tall = lo + (hi - lo) * Math.pow(hash(i, seed, 2), 1.6)
    out.push({ x, w, top: ground - tall, kind: Math.floor(hash(i, seed, 3) * 6) })
    x += w + (hash(i, seed, 4) < 0.3 ? 0.4 + hash(i, seed, 5) * 1.4 : 0.05)
    i++
  }
  return out
}
const GROUND = BASE + 0.4
const FAR = skyline(11, -190, 150, GROUND, 8, 42, [4, 9])
const MID = skyline(23, -150, 120, GROUND, 6, 30, [3.5, 8])
const NEAR = skyline(37, -110, 90, GROUND, 4, 22, [3, 7])

/**
 * A layer `e` cells behind the building: as the camera comes away it shrinks less than the building does, and moves
 * less as the camera moves, as a thing that far off would. Drawn in its own cells, about the frame's middle.
 */
function deep(p: p5, f: { cx: number; cy: number; y0: number; y1: number }, k: number, e: number, draw: (s: number) => void): void {
  const H = f.y1 - f.y0
  const s = H / (H + e)
  p.push()
  p.translate(f.cx * k, f.cy * k)
  p.scale(s)
  p.translate(-f.cx * k, -f.cy * k)
  draw(s)
  p.pop()
}

/** The first light: night blue overhead going to lavender, rose and gold along the roofs. */
function drawSky(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  const ctx = ctxOf(p)
  const H = f.y1 - f.y0
  const g = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
  const rise = Math.min(1, Math.max(0, (t - FINALE) / (DURATION - FINALE)))
  g.addColorStop(0, css('#1C2650', 1))
  g.addColorStop(0.12, css('#34407A', 1))
  g.addColorStop(0.24, css(rise > 0.6 ? '#9C82AE' : '#8A74A2', 1))
  g.addColorStop(0.33, css('#E6A08E', 1))
  g.addColorStop(0.42, css('#FFC98A', 1))
  g.addColorStop(1, css('#FFD99A', 1))
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, (f.y0 - 0.02 * H) * k, (f.x1 - f.x0) * k, H * 1.04 * k)
}

/**
 * The sun, coming up behind the building on the right: at first all glow and rays round the roof's edge, the building
 * against it; by the end clearing the roof (as it cleared the roofs in the nursery's window).
 */
function drawSun(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  const rise = Math.max(0, Math.min(1, (t - FINALE) / (DURATION - FINALE)))
  const H = f.y1 - f.y0
  const r = 0.05 * H
  const c: Pt = [RIGHT - 9, ROOF + 1.6 * r - 3.6 * r * rise * rise]
  const pen = { p, k, ink: '#000', w: 1, tone: (h: string) => h }
  bloom(pen, c, r * 16, '#FFB070', 0.34)
  bloom(pen, c, r * 6, '#FFE2A8', 0.55)
  const ctx = ctxOf(p)
  ctx.save()
  ctx.fillStyle = css('#FFF3D0', 1)
  ctx.beginPath()
  ctx.arc(c[0] * k, c[1] * k, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // Its rays fanning up past the roof, turning slowly.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i / 10 - 0.5) * 2.6 + 0.06 * Math.sin(t * 0.15 + i)
    shaft(pen, c, a, 0.06 + 0.04 * hash(i, 3, 5), H * 1.4, '#FFD9A0', 0.06 + 0.035 * Math.sin(t * 0.4 + i * 1.3))
  }
}

/** Towers against the sky at depth `e`: their faces in `body`, their lit windows waking as the city does. */
function drawSkyline(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number, list: Tower[], e: number, body: string, lit: string, windows: number, seed: number): void {
  deep(p, f, k, e, (s) => {
    const ctx = ctxOf(p)
    const H = f.y1 - f.y0
    const half = ((f.x1 - f.x0) / 2) / s + 2
    const lo = f.cx - half
    const hi = f.cx + half
    ctx.save()
    ctx.fillStyle = body
    ctx.beginPath()
    for (const tw of list) {
      if (tw.x + tw.w < lo || tw.x > hi) continue
      ctx.rect(tw.x * k, tw.top * k, tw.w * k, (GROUND + H - tw.top) * k)
      // A crown on some: a step, a spire, a water tank.
      if (tw.kind === 0) ctx.rect((tw.x + tw.w * 0.25) * k, (tw.top - 2) * k, tw.w * 0.5 * k, 2 * k)
      if (tw.kind === 1) {
        ctx.moveTo((tw.x + tw.w * 0.3) * k, tw.top * k)
        ctx.lineTo((tw.x + tw.w * 0.5) * k, (tw.top - tw.w * 1.2) * k)
        ctx.lineTo((tw.x + tw.w * 0.7) * k, tw.top * k)
      }
      if (tw.kind === 2) {
        ctx.rect((tw.x + tw.w * 0.6) * k, (tw.top - 1.1) * k, 0.9 * k, 1.1 * k)
        ctx.rect((tw.x + tw.w * 0.6 - 0.1) * k, (tw.top - 1.5) * k, 1.1 * k, 0.45 * k)
      }
    }
    ctx.fill()
    if (windows > 0) {
      // Windows: each wakes on a beat of its own as the morning comes, and a few go out again.
      ctx.fillStyle = lit
      ctx.beginPath()
      const since = t - FINALE + 6
      for (let i = 0; i < list.length; i++) {
        const tw = list[i]
        if (tw.x + tw.w < lo || tw.x > hi) continue
        const cols = Math.max(1, Math.floor(tw.w / 0.9))
        const rows = Math.floor((GROUND - tw.top) / 1.1)
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const h = hash(i * 97 + c, r, seed)
            if (h > windows) continue
            const on = (h / windows) * 34
            if (on > since) continue
            if (hash(i, r * 13 + c, seed + 1) < 0.08 && Math.sin(t * 0.7 + i + r) > 0.6) continue
            ctx.rect((tw.x + 0.25 + c * 0.9) * k, (tw.top + 0.5 + r * 1.1) * k, 0.4 * k, 0.5 * k)
          }
        }
      }
      ctx.fill()
    }
    ctx.restore()
  })
}

/** Smoke from the chimneys and stacks of the near roofs, leaning in the dawn wind. */
function drawSmoke(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  deep(p, f, k, 22, () => {
    const pen = { p, k, ink: '#000', w: 1, tone: (h: string) => h }
    for (let i = 0; i < NEAR.length; i += 4) {
      const tw = NEAR[i]
      if (tw.kind !== 3 && tw.kind !== 4) continue
      rising(pen, t, { seed: 300 + i, n: 26, from: [tw.x + tw.w * 0.3, tw.x + tw.w * 0.3 + 0.4, tw.top - 0.6], rise: 9, life: 7, spread: 3.5, size: [0.35, 1.0], color: '#B8A8B8', hot: '#D8C8C8', alpha: 0.28 })
    }
  })
}

/** Pigeons wheeling over the roofs, and a plane going over very high. */
function drawBirds(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  const ctx = ctxOf(p)
  deep(p, f, k, 30, () => {
    ctx.save()
    ctx.strokeStyle = css('#2A2438', 0.85)
    ctx.lineWidth = Math.max(1, 0.12 * k)
    ctx.lineCap = 'round'
    ctx.beginPath()
    const u = t - FINALE
    const cx = -20 + 18 * Math.sin(u * 0.11) + u * 0.6
    const cy = -16 + 3 * Math.sin(u * 0.23)
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4 + u * (0.4 + 0.1 * hash(i, 1, 9))
      const x = cx + 6 * Math.cos(a) * (0.4 + hash(i, 2, 9))
      const y = cy + 2.5 * Math.sin(a * 1.3) * (0.4 + hash(i, 3, 9))
      const flap = Math.sin(u * 9 + i * 1.7) * 0.35
      ctx.moveTo((x - 0.6) * k, (y - flap) * k)
      ctx.quadraticCurveTo((x - 0.25) * k, (y - 0.25) * k, x * k, y * k)
      ctx.quadraticCurveTo((x + 0.25) * k, (y - 0.25) * k, (x + 0.6) * k, (y - flap) * k)
    }
    ctx.stroke()
    ctx.restore()
  })
  // The plane, far up, its light blinking.
  deep(p, f, k, 90, () => {
    const u = t - FINALE
    const x = -150 + u * 6
    const y = -40
    ctx.save()
    ctx.fillStyle = css('#3A3550', 0.9)
    ctx.beginPath()
    ctx.ellipse(x * k, y * k, 2.6 * k, 0.45 * k, 0, 0, Math.PI * 2)
    ctx.moveTo((x - 0.5) * k, y * k)
    ctx.lineTo((x + 0.6) * k, (y + 2.2) * k)
    ctx.lineTo((x + 1.2) * k, y * k)
    ctx.fill()
    if (Math.sin(u * 6) > 0.6) {
      ctx.fillStyle = css('#FF5A4A', 1)
      ctx.beginPath()
      ctx.arc((x + 0.4) * k, (y + 0.3) * k, 0.45 * k, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  })
}

/* ------------------------------------------------------------------ the building itself */

const BRICK = '#2B1F24'
const BRICK_HI = '#4A3438'
const SLAB_HI = '#5C4A48'
const IRON = '#232029'

function drawShell(p: p5, k: number, t: number): void {
  const ctx = ctxOf(p)
  ctx.save()
  // The whole building's cut face first, then its rooms are let into it.
  ctx.fillStyle = BRICK
  ctx.fillRect(LEFT * k, ROOF * k, (RIGHT - LEFT) * k, (BASE - ROOF) * k)
  // Brick courses on the cut walls and slabs, faint.
  ctx.strokeStyle = css('#000000', 0.18)
  ctx.lineWidth = Math.max(1, 0.03 * k)
  ctx.beginPath()
  for (let y = ROOF; y < BASE; y += 0.45) {
    ctx.moveTo(LEFT * k, y * k)
    ctx.lineTo(RIGHT * k, y * k)
  }
  ctx.stroke()
  // The slabs' lit top edges.
  ctx.fillStyle = SLAB_HI
  for (const [, y1] of FLOORS) ctx.fillRect(LEFT * k, y1 * k, (RIGHT - LEFT) * k, 0.12 * k)
  ctx.fillRect(LEFT * k, ROOF * k, (RIGHT - LEFT) * k, 0.18 * k)
  // The roof: a parapet, the water tank on its legs, the mast with its light.
  ctx.fillStyle = BRICK_HI
  ctx.fillRect((LEFT - 0.3) * k, (ROOF - 0.5) * k, (RIGHT - LEFT + 0.6) * k, 0.5 * k)
  ctx.fillStyle = IRON
  const tank = LEFT + 7
  for (const lx of [tank, tank + 3.2]) ctx.fillRect(lx * k, (ROOF - 3.2) * k, 0.25 * k, 2.7 * k)
  ctx.fillStyle = '#4A3A30'
  ctx.beginPath()
  ctx.moveTo((tank - 0.4) * k, (ROOF - 3.2) * k)
  ctx.lineTo((tank + 3.85) * k, (ROOF - 3.2) * k)
  ctx.lineTo((tank + 3.85) * k, (ROOF - 6.4) * k)
  ctx.lineTo((tank + 1.72) * k, (ROOF - 7.6) * k)
  ctx.lineTo((tank - 0.4) * k, (ROOF - 6.4) * k)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = css('#2A2018', 0.8)
  ctx.lineWidth = Math.max(1, 0.06 * k)
  ctx.beginPath()
  for (let y = ROOF - 3.7; y > ROOF - 6.4; y -= 0.7) {
    ctx.moveTo((tank - 0.4) * k, y * k)
    ctx.lineTo((tank + 3.85) * k, y * k)
  }
  ctx.stroke()
  const mast = RIGHT - 4
  ctx.strokeStyle = css(IRON, 1)
  ctx.lineWidth = Math.max(1, 0.12 * k)
  ctx.beginPath()
  ctx.moveTo(mast * k, (ROOF - 0.5) * k)
  ctx.lineTo(mast * k, (ROOF - 9) * k)
  ctx.moveTo((mast - 1) * k, (ROOF - 0.5) * k)
  ctx.lineTo(mast * k, (ROOF - 6) * k)
  ctx.lineTo((mast + 1) * k, (ROOF - 0.5) * k)
  ctx.stroke()
  const blink = Math.max(0, Math.sin(t * Math.PI * 0.9)) ** 6
  const pen = { p, k, ink: '#000', w: 1, tone: (h: string) => h }
  ctx.fillStyle = css('#FF4A3A', 0.5 + 0.5 * blink)
  ctx.beginPath()
  ctx.arc(mast * k, (ROOF - 9.1) * k, 0.25 * k, 0, Math.PI * 2)
  ctx.fill()
  bloom(pen, [mast, ROOF - 9.1], 2.2, '#FF4A3A', 0.5 * blink)
  // The pipes his path goes up, with their brackets.
  for (const x of [PIPE_L, PIPE_R]) {
    ctx.fillStyle = IRON
    ctx.fillRect((x - 0.32) * k, (FLOORS[0][1] - 1.3) * k, 0.64 * k, (FLOORS[FLOORS.length - 1][1] - FLOORS[0][1] + 0.6) * k)
    ctx.fillStyle = css('#5A5060', 1)
    ctx.fillRect((x - 0.32) * k, (FLOORS[0][1] - 1.3) * k, 0.12 * k, (FLOORS[FLOORS.length - 1][1] - FLOORS[0][1] + 0.6) * k)
    for (let y = FLOORS[0][1]; y < FLOORS[FLOORS.length - 1][1]; y += 2.4) {
      ctx.fillStyle = IRON
      ctx.fillRect((Math.min(x, x < LEFT ? LEFT : x) - 0.5) * k, y * k, 1.2 * k, 0.22 * k)
    }
  }
  ctx.restore()
}

/** The street at the building's foot: the pavement, lamps still lit, an early cab going by. */
function drawStreet(p: p5, k: number, f: Box, t: number): void {
  const ctx = ctxOf(p)
  ctx.save()
  ctx.fillStyle = '#2A2630'
  ctx.fillRect((f.x0 - 1) * k, BASE * k, (f.x1 - f.x0 + 2) * k, (f.y1 - BASE + 1) * k)
  ctx.fillStyle = '#4A4450'
  ctx.fillRect((f.x0 - 1) * k, BASE * k, (f.x1 - f.x0 + 2) * k, 0.35 * k)
  ctx.fillStyle = '#1A171E'
  ctx.fillRect((f.x0 - 1) * k, (BASE + 1.4) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - BASE) * k)
  const pen = { p, k, ink: '#000', w: 1, tone: (h: string) => h }
  for (let x = Math.floor(f.x0 / 12) * 12; x < f.x1 + 12; x += 12) {
    ctx.fillStyle = IRON
    ctx.fillRect((x - 0.1) * k, (BASE - 4) * k, 0.2 * k, 4 * k)
    ctx.fillRect((x - 0.1) * k, (BASE - 4) * k, 1 * k, 0.15 * k)
    bloom(pen, [x + 0.9, BASE - 3.8], 2.4, '#FFC878', 0.35 * flicker(t, x, 0.1))
  }
  // A cab, early, going past along the street, and another the other way later.
  for (const [i, from, v, col] of [[0, -90, 9, '#E8B83A'], [1, 60, -7, '#C8C0B0']] as const) {
    const x = from + v * (t - FINALE - 4 * i)
    if (x < f.x0 - 6 || x > f.x1 + 6) continue
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.roundRect((x - 2) * k, (BASE + 0.45) * k, 4 * k, 0.8 * k, 0.3 * k)
    ctx.roundRect((x - 1.1) * k, (BASE - 0.1) * k, 2.2 * k, 0.7 * k, 0.3 * k)
    ctx.fill()
    ctx.fillStyle = '#121014'
    for (const wx of [x - 1.2, x + 1.2]) {
      ctx.beginPath()
      ctx.arc(wx * k, (BASE + 1.25) * k, 0.35 * k, 0, Math.PI * 2)
      ctx.fill()
    }
    bloom(pen, [x + Math.sign(v) * 2.1, BASE + 0.75], 1.6, '#FFF0C0', 0.5)
  }
  ctx.restore()
}

/** The El on its trestle in front of the building, a train going by now and then, its windows lit. */
function drawEl(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  const ctx = ctxOf(p)
  const y = BASE + 1.4
  // It is nearer than the building: it slides by a little faster as the camera goes.
  const dx = (f.cx - -30) * (1 - 1.12)
  ctx.save()
  ctx.translate(dx * k, 0)
  ctx.fillStyle = '#17141B'
  ctx.fillRect((f.x0 - 10) * k, y * k, (f.x1 - f.x0 + 20) * k, 0.45 * k)
  for (let x = Math.floor((f.x0 - 10) / 6) * 6; x < f.x1 + 10; x += 6) ctx.fillRect((x - 0.15) * k, y * k, 0.3 * k, (f.y1 - y + 2) * k)
  ctx.strokeStyle = css('#17141B', 1)
  ctx.lineWidth = Math.max(1, 0.08 * k)
  ctx.beginPath()
  for (let x = Math.floor((f.x0 - 10) / 6) * 6; x < f.x1 + 10; x += 6) {
    ctx.moveTo(x * k, (y + 0.45) * k)
    ctx.lineTo((x + 3) * k, (y + 2.2) * k)
    ctx.lineTo((x + 6) * k, (y + 0.45) * k)
  }
  ctx.stroke()
  // Two trains, one each way.
  for (const [from, v, at0] of [[-140, 22, FINALE + 6], [80, -18, FINALE + 21]] as const) {
    const x = from + v * (t - at0)
    const len = 26
    if (x + len < f.x0 - 10 || x - len > f.x1 + 10) continue
    const x0 = v > 0 ? x - len : x
    ctx.fillStyle = '#3A3644'
    ctx.beginPath()
    for (let car = 0; car < 4; car++) ctx.roundRect((x0 + car * 6.6) * k, (y - 2.1) * k, 6.3 * k, 2.0 * k, 0.4 * k)
    ctx.fill()
    ctx.fillStyle = css('#FFD890', 0.95)
    ctx.beginPath()
    for (let car = 0; car < 4; car++) for (let w = 0; w < 5; w++) ctx.rect((x0 + car * 6.6 + 0.5 + w * 1.15) * k, (y - 1.7) * k, 0.7 * k, 0.7 * k)
    ctx.fill()
    const pen = { p, k, ink: '#000', w: 1, tone: (h: string) => h }
    bloom(pen, [v > 0 ? x0 + 4 * 6.6 : x0, y - 1.1], 2.5, '#FFF0C0', 0.5)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the rooms' own life */

const lensOf = (p: p5, k: number, box: Box): Lens => ({ p, k, box, at: (u, v) => [box.x0 + (box.x1 - box.x0) * u, box.y0 + (box.y1 - box.y0) * v] })
const penOf = (L: Lens) => ({ p: L.p, k: L.k, ink: '#000', w: 1, tone: (h: string) => h })

function lamps(L: Lens, t: number, lit: number, list: [number, number][], col: string, r: number, a: number, seed: number): void {
  const pen = penOf(L)
  list.forEach(([u, v], i) => bloom(pen, L.at(u, v), r, col, a * lit * flicker(t, seed + i, 0.12)))
}
function storeLife(L: Lens, t: number, lit: number): void {
  lamps(L, t, lit, [[0.3, 0.12], [0.44, 0.12], [0.58, 0.12], [0.71, 0.12]], '#FFD48A', 2.4, 0.22, 1)
  const b = L.box
  motes(penOf(L), t, { n: 50, seed: 61, box: [b.x0, b.y0, b.x1, b.y1], size: [0.03, 0.07], color: '#FFE2A6', alpha: 0.5 * lit, drift: [0.15, -0.08] })
}
function londonLife(L: Lens, t: number, lit: number): void {
  lamps(L, t, lit, [[0.44, 0.48], [0.53, 0.48], [0.77, 0.48], [0.86, 0.48]], '#F2F6F0', 2.0, 0.22, 7)
  const b = L.box
  motes(penOf(L), t, { n: 60, seed: 62, box: [b.x0, b.y0 + 2, b.x1, b.y1], size: [0.03, 0.06], color: '#E8F0F2', alpha: 0.35 * lit, drift: [0.08, -0.05] })
}
function hotelLife(L: Lens, t: number, lit: number): void {
  lamps(L, t, lit, [[0.39, 0.63]], '#FFE08A', 1.8, 0.3, 11)
  bloom(penOf(L), L.at(0.71, 0.13), 1.6, '#D8E4FF', 0.25 * lit)
}
function alleyLife(L: Lens, t: number, lit: number): void {
  lamps(L, t, lit, [[0.38, 0.27], [0.48, 0.27], [0.62, 0.27], [0.75, 0.27], [0.88, 0.27]], '#E8F4FF', 1.6, 0.16, 13)
  bloom(penOf(L), L.at(0.5, 0.42), 2.2, '#FF5FAE', 0.12 * lit * (0.7 + 0.3 * pulse(t)))
}
function roadLife(L: Lens, t: number, lit: number): void {
  const pen = penOf(L)
  // The night going by: fireflies over the fields, the cab's headlight on the road.
  const b = L.box
  motes(pen, t, { n: 40, seed: 91, box: [b.x0, b.y0 + 3, b.x1, b.y1 - 1], size: [0.04, 0.08], color: '#E8F49A', alpha: 0.8 * lit, drift: [-0.6, -0.05], twinkle: 0.9 })
  bloom(pen, L.at(0.8, 0.72), 2.4, '#FFF0C0', 0.25 * lit)
}
function jerseyLife(L: Lens, t: number, lit: number): void {
  const pen = penOf(L)
  const [x0] = L.at(0.36, 0)
  const [x1] = L.at(0.56, 0)
  const [, y] = L.at(0, 0.18)
  rising(pen, t, { seed: 71, n: 90, from: [x0, x1, y], rise: 8, life: 3.2, spread: 2.5, size: [0.04, 0.1], color: '#FF7A2A', hot: '#FFE08A', alpha: 0.9 * lit })
  bloom(pen, L.at(0.46, 0.4), 5, '#FF7A2A', 0.22 * lit * flicker(t, 3, 0.4))
  // The ambulance's light going round.
  bloom(pen, L.at(0.94, 0.72), 1.6, '#FF3A2A', lit * Math.max(0, Math.sin(t * 7)) ** 2 * 0.6)
}
function airfieldLife(L: Lens, t: number, lit: number): void {
  const pen = penOf(L)
  // The runway's lights, chasing toward the plane.
  for (let i = 0; i < 9; i++) {
    const phase = (t * 1.6 - i * 0.18) % 1
    bloom(pen, L.at(0.06 + i * 0.105, 0.86), 0.8, '#9FC8FF', lit * Math.max(0, 1 - phase * 3) * 0.6)
  }
  // The beacon on its tower, sweeping.
  const a = t * 2.2
  shaft(pen, L.at(0.12, 0.3), Math.PI / 2 + 0.6 * Math.sin(a), 0.12, 16, Math.cos(a * 0.5) > 0 ? '#BFFFD0' : '#FFFFFF', 0.12 * lit)
}
function tokyoLife(L: Lens, t: number, lit: number): void {
  const pen = penOf(L)
  // Flash bulbs going off all over the house.
  for (let i = 0; i < 16; i++) {
    const period = 0.9 + 1.4 * hash(i, 1, 81)
    const ph = ((t + hash(i, 2, 81) * period) % period) / period
    const n = Math.floor((t + hash(i, 2, 81) * period) / period)
    if (ph > 0.18) continue
    bloom(pen, L.at(0.05 + 0.9 * hash(i, n, 82), 0.12 + 0.45 * hash(i, n, 83)), 1.1, '#FFFFFF', lit * (1 - ph / 0.18) * 0.9)
  }
  const b = L.box
  confetti(pen, (t - FINALE) % 6, { seed: 84, n: 70, at: 0, last: 6, box: [b.x0, b.y0 - 0.5, b.x1, b.y0 + 1], fall: 7.5, colors: ['#FFFFFF', '#E8423A', '#F2C14E'], size: 0.12, alpha: lit })
  lamps(L, t, lit, [[0.45, 0.32]], '#FFFFFF', 3, 0.25, 17)
}

/* ------------------------------------------------------------------ drawing it */

/** How lit a room is at `t`: dark as the camera finds it, its lights coming on as his path reaches it. */
function litAt(i: number, t: number): number {
  if (ROOMS[i].key === 'ward') return 1
  const u = t - WAKES[i]
  if (u < 0) return 0
  return 1 - Math.exp(-u / 0.25)
}

let lastPainted = -1

export const finale = scenery<null>({
  name: 'fx-finale',
  draw: () => {},
  over: (p, _s, c) => {
    const t = c.t
    if (live.painting || !live.show) return
    live.stage = p
    // Paint the rooms' pictures ahead of time, one a frame through the ward's last bars, so none costs a frame much.
    if (t > FINALE - 14 && t < FINALE) {
      const next = ROOMS.find((r) => r.snap && !painted(r.snap, PIC_W, PIC_H))
      if (next?.snap && Math.floor(t * 30) !== lastPainted) {
        lastPainted = Math.floor(t * 30)
        snapshot(next.snap, PIC_W, PIC_H, p)
      }
      return
    }
    if (t < FINALE) return
    const k = c.k
    const f = frame(p, k)
    const w = WARD_ROOM
    // Nothing to do while the frame is all ward.
    if (f.x0 >= w.x0 && f.x1 <= w.x1 && f.y0 >= w.y0 && f.y1 <= w.y1) return
    if (ROOMS.every((r) => !r.snap || painted(r.snap, PIC_W, PIC_H))) rest()
    const ctx = ctxOf(p)
    ctx.save()
    // Everywhere but the ward itself.
    ctx.beginPath()
    ctx.rect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    ctx.rect(w.x0 * k, w.y0 * k, (w.x1 - w.x0) * k, (w.y1 - w.y0) * k)
    ctx.clip('evenodd')
    drawSky(p, k, f, t)
    drawSun(p, k, f, t)
    drawSkyline(p, k, f, t, FAR, 120, css('#7E7392', 1), css('#FFE6B0', 0.7), 0.05, 1)
    drawSkyline(p, k, f, t, MID, 45, css('#4E4560', 1), css('#FFD890', 0.85), 0.12, 2)
    drawSmoke(p, k, f, t)
    drawSkyline(p, k, f, t, NEAR, 16, css('#2E2838', 1), css('#FFCF80', 0.95), 0.2, 3)
    drawBirds(p, k, f, t)
    drawStreet(p, k, f, t)
    drawShell(p, k, t)
    ctx.imageSmoothingQuality = 'high'
    ROOMS.forEach((room, i) => {
      if (!room.snap) return
      const b = room.box
      if (b.x1 < f.x0 || b.x0 > f.x1 || b.y1 < f.y0 || b.y0 > f.y1) return
      const pic = snapshot(room.snap, PIC_W, PIC_H, p)
      if (pic) ctx.drawImage(pic, b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      const lit = litAt(i, t)
      ctx.save()
      ctx.beginPath()
      ctx.rect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      ctx.clip()
      room.life(lensOf(p, k, b), t, lit)
      // Asleep until his light comes in; then its lights on, with a flash.
      const dark = 0.8 * (1 - lit) + 0.04
      ctx.fillStyle = `rgba(8,8,18,${dark})`
      ctx.fillRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      const flash = t >= WAKES[i] ? Math.exp(-(t - WAKES[i]) / 0.18) : 0
      if (flash > 0.01) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = `rgba(255,214,150,${0.35 * flash})`
        ctx.fillRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      }
      // The ceiling's shade.
      const g = ctx.createLinearGradient(0, b.y0 * k, 0, (b.y0 + 1.2) * k)
      g.addColorStop(0, 'rgba(0,0,0,0.35)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = g
      ctx.fillRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, 1.2 * k)
      ctx.restore()
    })
    drawEl(p, k, f, t)
    ctx.restore()
    drawPath(p, k, t)
  },
})

/** His path, lit as far as the light has run, the light's head bright; then the whole of it, a bead running up it a bar. */
function drawPath(p: p5, k: number, t: number): void {
  if (t < RUN_FROM) return
  const ctx = ctxOf(p)
  const head = runAt(t)
  const pen = { p, k, ink: '#000', w: 1, tone: (h: string) => h }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const stroke = (width: number, col: string, a: number) => {
    ctx.strokeStyle = css(col, a)
    ctx.lineWidth = Math.max(1, width * k)
    ctx.beginPath()
    ctx.moveTo(PATH[0][0] * k, PATH[0][1] * k)
    for (let i = 1; i < PATH.length && ALONG[i] <= head; i++) ctx.lineTo(PATH[i][0] * k, PATH[i][1] * k)
    const h = pointAt(head)
    ctx.lineTo(h[0] * k, h[1] * k)
    ctx.stroke()
  }
  stroke(0.5, '#F26A1B', 0.14)
  stroke(0.16, '#F26A1B', 0.45)
  stroke(0.05, '#FFC890', 0.7)
  if (head < LENGTH - 0.01) {
    const h = pointAt(head)
    bloom(pen, h, 2.6, '#FF9A4A', 0.8)
    bloom(pen, h, 0.8, '#FFF4E0', 0.9)
  } else {
    // Arrived: a bead of light up the path every bar, from the store to him.
    const since = t - RUN_TO
    const u = (since % (2 * BAR)) / (2 * BAR)
    const d = LENGTH * u
    bloom(pen, pointAt(d), 1.4, '#FFB070', 0.55 * Math.sin(Math.PI * u))
    const arrive = Math.exp(-since / 0.5)
    bloom(pen, SILL, 3.5, '#FFB070', 0.7 * arrive)
  }
  ctx.restore()
  // Where he is: a ring of his orange going out from him at the glass every bar once the light has come to him, so
  // the eye finds him in the whole of it.
  if (t >= RUN_TO) {
    const since = t - RUN_TO
    ctx.save()
    ctx.lineWidth = Math.max(1, 0.1 * k)
    for (const lag of [0, 1]) {
      const u = ((since + lag * BAR) % (2 * BAR)) / (2 * BAR)
      ctx.strokeStyle = css('#F26A1B', 0.75 * (1 - u) * (1 - u))
      ctx.beginPath()
      ctx.arc(SILL[0] * k, SILL[1] * k, (0.4 + 3.2 * u) * k, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** For the camera: the stretch of the crane, and the beat the light arrives on. */
export const FINALE_RUN: [number, number] = [RUN_FROM, RUN_TO]
