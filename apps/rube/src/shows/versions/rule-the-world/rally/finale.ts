import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { frame, hash, scenery } from './kit'
import { rising } from './depth'
import { live } from './live'
import { CREDITS_AT, DURATION, at } from './music'
import { ctxOf, rgb } from './pen'
import { paintInto, painted, prepare, snapshot, type Snap } from './snap'
import { drawFlock, drawLoft, flockX } from './flock'
import { CHIMNEY, STACK, drawMilk, drawNear, drawNextDoor, drawPavement, drawRoofWashing } from './city'

/**
 * The finale: the machine, whole.
 *
 * Under the credits the camera comes away from the nursery's glass, and keeps coming: the ward is the top floor of a
 * building cut open like a doll's house, and every room under and beside it is a place he has been, each painted as
 * the show painted it (`snap.ts`): the shoe store, the British Open and the hotel on the ground floor, the bowling
 * alley, the road and the farm on fire over them, and the airfield and Tokyo beside the ward at the top. It stands in a
 * city at dawn.
 *
 * The building is half asleep as the camera finds it, every room going on with its own place in the dark. On the
 * song's last two bars their lights come on a room a beat in the order he went through them, from the store to Tokyo
 * (as the windows across the street from the store woke a beat apiece at the start), and the song's last beat is on
 * the ward, where he is at the glass with his son; and in the quiet after the song the camera comes back in on the top
 * floor.
 *
 * Round it the city wakes (`city.ts`), and over it the pigeons from the loft on its roof wheel and come home
 * (`flock.ts`): across the sleeping rooms' faces as the camera draws back, and once every room is lit, close past the
 * lens over them.
 *
 * Everything here is in the ward's own cells (the building is laid round the ward where it stands), drawn over the
 * ward everywhere but in the ward's own room, which is the ward itself, live. There is no light laid over any of it:
 * the rooms are lit by their own lamps, the city by its windows and the dawn.
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
  /** The place painted into it, or none for the ward (itself): framed as `snap` says, from the start of `loop`. */
  snap?: Snap
  /**
   * The stretch of its place the room plays over and over once its lights are on (show seconds), and whether its
   * framing follows that place's camera across (the road, which goes by).
   */
  loop?: [number, number]
  follow?: boolean
}

const PIC_W = 920
const PIC_H = 320

/** The rooms in the order he went through them, bottom to top. */
const ROOMS: Room[] = [
  { key: 'store', box: roomBox(0, 2), snap: { key: 'store', t: 10.4, at: [9.1, -0.25], cells: 8.5 }, loop: [10.4, 18.4] },
  { key: 'london', box: roomBox(1, 2), snap: { key: 'london', t: 60.4, at: [2.0, -1.5], cells: 10 }, loop: [60.4, 66.4] },
  { key: 'hotel', box: roomBox(2, 2), snap: { key: 'hotel', t: 112, at: [5.0, 1.6], cells: 8.5 }, loop: [112, 120] },
  { key: 'alley', box: roomBox(2, 1), snap: { key: 'alley', t: 124, at: [6.1, -2.6], cells: 8.5 }, loop: [124, 132] },
  { key: 'road', box: roomBox(1, 1), snap: { key: 'road', t: 140, at: [22.05, -1.32], cells: 7.5 }, loop: [140, 146.6], follow: true },
  { key: 'barn', box: roomBox(0, 1), snap: { key: 'barn', t: 157.5, at: [46.6, -2.6], cells: 10 }, loop: [157.5, 163.5] },
  { key: 'airfield', box: roomBox(0, 0), snap: { key: 'airfield', t: 166.5, at: [60.5, -1.3], cells: 8.5 }, loop: [166.5, 172.5] },
  { key: 'tokyo', box: roomBox(1, 0), snap: { key: 'tokyo', t: 190.2, at: [2.9, -2.0], cells: 9.5 }, loop: [190.2, 197.2] },
  { key: 'ward', box: WARD_ROOM },
]

/* ------------------------------------------------------------------ the order he came */

/** Where he is at the glass at the end (`hospital/geo.ts` AT_GLASS). */
const SILL: Pt = [-7.7, 0.05 - 0.13]
/** The building's drainpipes, one up each side. */
const PIPE_L = LEFT - 0.75
const PIPE_R = RIGHT + 0.75

/**
 * When each room's lights come on: a room a beat over the song's last two bars, in the order he went through them; the
 * ward is lit throughout, and the song's last beat falls on it.
 */
const WAKES: number[] = ROOMS.map((room, i) => (room.key === 'ward' ? FINALE : at(113 + Math.floor(i / 4), 1 + (i % 4))))
/** The song's last beat. */
const LAST = at(115, 1)

/* ------------------------------------------------------------------ the camera */

/** Where the crane has the camera when it has come all the way out, and when. */
const OUT_AT = at(113, 1)
const OUT_CELLS = 48
/** His place on the screen with the building whole: high on the right, the top floor, the sky over it for the credits. */
const OUT_SCREEN: Pt = [(SILL[0] - (LEFT + RIGHT) / 2) / OUT_CELLS, (SILL[1] - 2.6) / OUT_CELLS]
/** And in the quiet after the song, back in on the top floor: his room whole in the middle, the sky over it. */
const IN_AT = LAST + 6
const IN_CELLS = 24
const IN_SCREEN: Pt = [(SILL[0] - (WARD_ROOM.x0 + WARD_ROOM.x1) / 2) / IN_CELLS, 0.12]

const smoother = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (6 * v - 15) + 10)
}
const smooth3 = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/**
 * The crane over the credits, from the camera's last framing on the glass (`from`, at FINALE): out and down, Marty
 * held on the screen and drifting to the building's top floor as it is found, until the whole building is in the
 * frame with the sky over it for the credits; then, once the song is over, back in slowly on the top floor where he
 * is at the glass with his son (as the camera once pushed in on the two of them there).
 */
export function crane(t: number, from: Framing): Framing {
  if (t <= FINALE) return from
  const u = (t - FINALE) / (OUT_AT - FINALE)
  const start: Pt = [(SILL[0] - from.x) / from.cells, (SILL[1] - from.y) / from.cells]
  const s = smoother(u * 1.15 - 0.1)
  let cells = Math.exp(Math.log(from.cells) + (Math.log(OUT_CELLS) - Math.log(from.cells)) * smoother(u))
  let o: Pt = [start[0] + (OUT_SCREEN[0] - start[0]) * s, start[1] + (OUT_SCREEN[1] - start[1]) * s]
  const v = smoother((t - IN_AT) / (DURATION - IN_AT))
  if (v > 0) {
    cells = Math.exp(Math.log(OUT_CELLS) + (Math.log(IN_CELLS) - Math.log(OUT_CELLS)) * v)
    o = [OUT_SCREEN[0] + (IN_SCREEN[0] - OUT_SCREEN[0]) * v, OUT_SCREEN[1] + (IN_SCREEN[1] - OUT_SCREEN[1]) * v]
  }
  // Out wide it never quite stops: it goes on drawing back a little, and travels slowly along the building from its
  // left towards the loft and the sun, so the near things slide against the far ones; then gives the move up to the
  // way back in.
  const along = (-0.5 * smoother((t - 235.5) / 3) + smooth3((t - 238) / 18)) * (1 - v)
  const back = 1 + DRAW_BACK * smoother((t - 238) / 11) * (1 - v)
  return { ...from, x: SILL[0] - o[0] * cells + TRAVEL * along, y: SILL[1] - o[1] * cells, cells: cells * back }
}
/** How far the wide goes on drawing back (a share of the frame), and how far it travels along the building (cells). */
const DRAW_BACK = 0.05
const TRAVEL = 5
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
/**
 * Clouds going over the dawn at a time-lapse's pace, lit rose and gold underneath by the sun that is still below the
 * roofs and dark on top: so far off they keep their place in the frame, and the sky is never still.
 */
function drawClouds(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  const ctx = ctxOf(p)
  const H = f.y1 - f.y0
  const W = f.x1 - f.x0
  const u = t - FINALE
  ctx.save()
  for (let i = 0; i < 9; i++) {
    const h1 = hash(i, 1, 501)
    const h2 = hash(i, 2, 501)
    const span = 1.5
    const x = f.x0 + W * ((((h1 * span + u * (0.012 + 0.012 * h2)) % span) + span) % span - 0.25)
    const y = f.y0 + H * (0.06 + 0.24 * h2)
    const w = W * (0.12 + 0.12 * hash(i, 3, 501))
    const hh = H * (0.018 + 0.02 * hash(i, 4, 501))
    // Lit from below: a warm belly, a cooler top.
    for (const [dy, col, a] of [[-0.35, '#5E5684', 0.32], [0.2, '#E8A496', 0.38], [0.45, '#FFD2A0', 0.3]] as const) {
      ctx.fillStyle = css(col, a)
      ctx.beginPath()
      for (let j = 0; j < 5; j++) {
        const cx = x + w * (j / 4 - 0.5) * 0.9
        const cy = y + hh * dy + hh * 0.35 * Math.sin(j * 1.9 + i)
        ctx.ellipse(cx * k, cy * k, w * (0.2 + 0.08 * Math.sin(j + i)) * k, hh * (0.75 - 0.25 * Math.abs(j - 2) / 2) * k, 0, 0, Math.PI * 2)
      }
      ctx.fill()
    }
  }
  ctx.restore()
}

/** The sun, coming up behind the building on the right, and clearing its roof by the end. */
function drawSun(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  const rise = Math.max(0, Math.min(1, (t - FINALE) / (DURATION - FINALE)))
  const r = 0.05 * (f.y1 - f.y0)
  const c: Pt = [RIGHT - 9, ROOF + 1.6 * r - 3.6 * r * rise * rise]
  const ctx = ctxOf(p)
  ctx.save()
  ctx.fillStyle = css('#FFE7B8', 1)
  ctx.beginPath()
  ctx.arc(c[0] * k, c[1] * k, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
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

/** A plane going over very high, its light blinking. */
function drawPlane(p: p5, k: number, f: Box & { cx: number; cy: number }, t: number): void {
  const ctx = ctxOf(p)
  // The plane, far up, its light blinking.
  deep(p, f, k, 90, () => {
    const u = t - FINALE
    const x = -150 + u * 6
    const y = -40
    ctx.save()
    // An airliner side on, nose to the right: the fuselage, the tail's fin and plane, the wing and its two engines.
    ctx.fillStyle = css('#3A3550', 0.9)
    ctx.beginPath()
    ctx.moveTo((x + 2.9) * k, y * k)
    ctx.quadraticCurveTo((x + 2.8) * k, (y - 0.32) * k, (x + 2.2) * k, (y - 0.34) * k)
    ctx.lineTo((x - 2.0) * k, (y - 0.3) * k)
    ctx.lineTo((x - 2.7) * k, (y - 1.3) * k)
    ctx.lineTo((x - 3.15) * k, (y - 1.3) * k)
    ctx.lineTo((x - 2.95) * k, (y - 0.12) * k)
    ctx.lineTo((x - 2.6) * k, (y + 0.08) * k)
    ctx.lineTo((x + 2.2) * k, (y + 0.3) * k)
    ctx.quadraticCurveTo((x + 2.8) * k, (y + 0.28) * k, (x + 2.9) * k, y * k)
    ctx.moveTo((x + 0.6) * k, (y + 0.12) * k)
    ctx.lineTo((x - 0.5) * k, (y + 0.4) * k)
    ctx.lineTo((x - 1.0) * k, (y + 0.4) * k)
    ctx.lineTo((x - 0.2) * k, (y + 0.1) * k)
    ctx.moveTo((x - 2.4) * k, (y - 0.05) * k)
    ctx.lineTo((x - 3.3) * k, (y + 0.05) * k)
    ctx.lineTo((x - 3.3) * k, (y - 0.1) * k)
    for (const ex of [0.55, -0.1]) ctx.rect((x + ex - 0.35) * k, (y + 0.18) * k, 0.55 * k, 0.2 * k)
    ctx.fill()
    if (Math.sin(u * 6) > 0.6) {
      ctx.fillStyle = css('#FF5A4A', 1)
      ctx.beginPath()
      ctx.arc((x - 0.2) * k, (y + 0.32) * k, 0.22 * k, 0, Math.PI * 2)
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
  // The mast's warning lamp, on and off.
  ctx.fillStyle = Math.sin(t * Math.PI * 0.9) > 0.3 ? '#E8483A' : '#5A2A28'
  ctx.beginPath()
  ctx.arc(mast * k, (ROOF - 9.1) * k, 0.22 * k, 0, Math.PI * 2)
  ctx.fill()
  // The drainpipes, with their brackets.
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
  for (let x = Math.floor(f.x0 / 12) * 12; x < f.x1 + 12; x += 12) {
    ctx.fillStyle = IRON
    ctx.fillRect((x - 0.1) * k, (BASE - 4) * k, 0.2 * k, 4 * k)
    ctx.fillRect((x - 0.1) * k, (BASE - 4) * k, 1 * k, 0.15 * k)
    ctx.fillStyle = '#F2D08C'
    ctx.fillRect((x + 0.6) * k, (BASE - 3.85) * k, 0.55 * k, 0.22 * k)
  }
  // Cabs and cars going by, more as the morning gets going.
  const cars: [number, number, number, string][] = []
  for (let i = 0; i < 16; i++) cars.push([i, i % 2 ? 70 : -110, (i % 2 ? -1 : 1) * (6 + 5 * hash(i, 1, 77)), ['#E8B83A', '#C8C0B0', '#7A2A2A', '#2A4A6A', '#E8B83A', '#3A4A3A'][i % 6]])
  for (const [i, from, v, col] of cars) {
    const x = from + v * (t - FINALE - 2.1 * i - 1.4 * hash(i, 2, 77))
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
    ctx.fillStyle = '#F6E6B8'
    ctx.fillRect((x + Math.sign(v) * 1.95 - 0.1) * k, (BASE + 0.6) * k, 0.2 * k, 0.25 * k)
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
  // Its columns stand in the near street, which only a tall frame reaches down to: there each has its footing.
  for (let x = Math.floor((f.x0 - 10) / 6) * 6; x < f.x1 + 10; x += 6) {
    ctx.fillRect((x - 0.15) * k, y * k, 0.3 * k, (EL_FOOT - y) * k)
    ctx.fillRect((x - 0.35) * k, (EL_FOOT - 0.3) * k, 0.7 * k, 0.3 * k)
  }
  ctx.strokeStyle = css('#17141B', 1)
  ctx.lineWidth = Math.max(1, 0.08 * k)
  ctx.beginPath()
  for (let x = Math.floor((f.x0 - 10) / 6) * 6; x < f.x1 + 10; x += 6) {
    ctx.moveTo(x * k, (y + 0.45) * k)
    ctx.lineTo((x + 3) * k, (y + 2.2) * k)
    ctx.lineTo((x + 6) * k, (y + 0.45) * k)
  }
  ctx.stroke()
  // The trains, one way and the other, closer together as the rush begins.
  for (const [from, v, at0] of [[-140, 22, FINALE + 4], [80, -18, FINALE + 8.5], [-140, 20, FINALE + 13], [80, -21, FINALE + 17], [-140, 23, FINALE + 21], [80, -19, FINALE + 24.5], [-140, 21, FINALE + 28], [80, -22, FINALE + 31.5]] as const) {
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
    ctx.fillStyle = '#F6E6B8'
    ctx.fillRect((v > 0 ? x0 + 4 * 6.6 - 0.45 : x0 + 0.15) * k, (y - 1.3) * k, 0.3 * k, 0.35 * k)
  }
  ctx.restore()
  if (f.y1 > EL_FOOT) {
    // The near street under it: a kerb catching the dawn, and the road going dark toward the lens.
    ctx.save()
    ctx.fillStyle = '#2E2A33'
    ctx.fillRect((f.x0 - 1) * k, EL_FOOT * k, (f.x1 - f.x0 + 2) * k, 0.25 * k)
    const g = ctx.createLinearGradient(0, (EL_FOOT + 0.25) * k, 0, (EL_FOOT + 6) * k)
    g.addColorStop(0, '#1A171E')
    g.addColorStop(1, '#0E0C11')
    ctx.fillStyle = g
    ctx.fillRect((f.x0 - 1) * k, (EL_FOOT + 0.25) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - EL_FOOT + 1) * k)
    ctx.restore()
  }
}
/** Where the El's columns stand, below the frame but for a tall one. */
const EL_FOOT = BASE + 6.2

/* ------------------------------------------------------------------ drawing it */

/** How lit a room is at `t`: dark as the camera finds it, its lights coming on on its beat. */
function litAt(i: number, t: number): number {
  if (ROOMS[i].key === 'ward') return 1
  const u = t - WAKES[i]
  if (u < 0) return 0
  return 1 - Math.exp(-u / 0.12)
}

let lastPainted = -1

/**
 * The rooms run: once a room's lights are on, it plays its stretch of its place over and over, repainted ten
 * times a second (a diorama's pace; the rooms' turns staggered, so a frame repaints two at most), and at each
 * turn of its loop the last of it dissolves into the start again.
 */
const ROOM_FPS = 10
/**
 * From when the rooms go on in the half-dark, before their lights come: as the crane comes out of the ward, so the
 * building it finds is asleep but not still.
 */
const STIR = FINALE + 4
const DISSOLVE = 0.5
const running = new Map<string, { pic: HTMLCanvasElement; at: number }>()
/** The room's place at `t` (show time of the finale): its framing, at the moment its loop has reached. */
function roomSnap(room: Room, i: number, t: number): { snap: Snap; within: number; turns: number } | null {
  const { snap, loop } = room
  if (!snap || !loop) return null
  const L = loop[1] - loop[0]
  // Every room on one grid, each an eighth of a step after the last, so no frame repaints more than two.
  const q = Math.floor((t - FINALE) * ROOM_FPS - i / ROOMS.length)
  const u = Math.max(0, FINALE + (q + i / ROOMS.length) / ROOM_FPS - STIR)
  const turns = Math.floor(u / L)
  const within = u - turns * L
  const at = loop[0] + within
  const cam = room.follow ? live.camera?.(at) : null
  return { snap: { ...snap, key: `${snap.key}-run`, t: at, at: cam ? [cam.x, snap.at[1]] : snap.at }, within, turns }
}
/** The end of a room's loop, kept: what dissolves into its start at each turn. */
const endOf = (room: Room): Snap | null =>
  room.snap && room.loop ? { ...room.snap, key: `${room.snap.key}-end`, t: room.loop[1], at: room.follow ? [live.camera?.(room.loop[1]).x ?? room.snap.at[0], room.snap.at[1]] : room.snap.at } : null
/** The room's picture at `t`: its still until it wakes, then its place running. */
function roomPicture(p: p5, room: Room, i: number, t: number): { pic: HTMLCanvasElement | null; end: HTMLCanvasElement | null; fade: number } {
  if (!room.snap) return { pic: null, end: null, fade: 0 }
  const still = snapshot(room.snap, PIC_W, PIC_H, p)
  const run = t >= STIR ? roomSnap(room, i, t) : null
  if (!run || typeof document === 'undefined') return { pic: still, end: null, fade: 0 }
  let r = running.get(room.key)
  if (!r) {
    const pic = document.createElement('canvas')
    pic.width = PIC_W
    pic.height = PIC_H
    r = { pic, at: NaN }
    running.set(room.key, r)
  }
  if (r.at !== run.snap.t) {
    if (!paintInto(r.pic, run.snap, p)) return { pic: still, end: null, fade: 0 }
    r.at = run.snap.t
  }
  const endSnap = run.turns > 0 && run.within < DISSOLVE ? endOf(room) : null
  return { pic: r.pic, end: endSnap ? snapshot(endSnap, PIC_W, PIC_H, p) : null, fade: 1 - run.within / DISSOLVE }
}

/** Paint the rooms' pictures ahead, in the page's idle time, from the show's first frame (`snap.prepare`). */
export function prepareRooms(p: p5): void {
  prepare(ROOMS.flatMap((r) => (r.snap ? [r.snap, ...(live.camera ? [endOf(r)!] : [])] : [])), PIC_W, PIC_H, p)
}

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
    const ctx = ctxOf(p)
    ctx.save()
    // Everywhere but the ward itself.
    ctx.beginPath()
    ctx.rect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    ctx.rect(w.x0 * k, w.y0 * k, (w.x1 - w.x0) * k, (w.y1 - w.y0) * k)
    ctx.clip('evenodd')
    drawSky(p, k, f, t)
    drawClouds(p, k, f, t)
    drawSun(p, k, f, t)
    drawSkyline(p, k, f, t, FAR, 120, css('#7E7392', 1), css('#FFE6B0', 0.7), 0.05, 1)
    drawSkyline(p, k, f, t, MID, 45, css('#4E4560', 1), css('#FFD890', 0.85), 0.12, 2)
    drawSmoke(p, k, f, t)
    drawSkyline(p, k, f, t, NEAR, 16, css('#2E2838', 1), css('#FFCF80', 0.95), 0.2, 3)
    drawPlane(p, k, f, t)
    const view = { cx: f.cx, cy: f.cy, H: f.y1 - f.y0 }
    // The flock behind the building's face first, so it hides them as they go round behind it.
    drawFlock(ctx, k, view, t, ROOF, 'back')
    drawNextDoor(ctx, k, f, t, FINALE, flockX(t))
    if (f.x1 > CHIMNEY[0] - 6) {
      rising({ p, k, ink: '#000', w: 1, tone: (h: string) => h }, t, { seed: 911, n: 30, from: [CHIMNEY[0] - 0.2, CHIMNEY[0] + 0.2, CHIMNEY[1]], rise: 7, life: 6, spread: 3.2, size: [0.3, 0.9], color: '#A898A8', hot: '#C8B8B8', alpha: 0.3 })
    }
    drawStreet(p, k, f, t)
    drawShell(p, k, t)
    drawLoft(ctx, k, t, ROOF)
    drawRoofWashing(ctx, k, f, t, ROOF)
    if (f.x0 < STACK[0] + 12 && f.y0 < ROOF) {
      // The stack's smoke, leaning downwind over the washing.
      const sx = STACK[0]
      const sy = ROOF - 3.7
      ctx.save()
      ctx.translate(sx * k, sy * k)
      ctx.transform(1, 0, -0.9, 1, 0, 0)
      ctx.translate(-sx * k, -sy * k)
      rising({ p, k, ink: '#000', w: 1, tone: (h: string) => h }, t, { seed: 917, n: 34, from: [sx - 0.3, sx + 0.3, sy], rise: 6.5, life: 5, spread: 1.6, size: [0.35, 1.1], color: '#9A8C9C', hot: '#B8AAB2', alpha: 0.32 })
      ctx.restore()
    }
    ctx.imageSmoothingQuality = 'high'
    ROOMS.forEach((room, i) => {
      if (!room.snap) return
      const b = room.box
      if (b.x1 < f.x0 || b.x0 > f.x1 || b.y1 < f.y0 || b.y0 > f.y1) return
      const { pic, end, fade } = roomPicture(p, room, i, t)
      if (pic) ctx.drawImage(pic, b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      if (end && fade > 0) {
        ctx.globalAlpha = fade
        ctx.drawImage(end, b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
        ctx.globalAlpha = 1
      }
      const lit = litAt(i, t)
      ctx.save()
      ctx.beginPath()
      ctx.rect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      ctx.clip()
      // Dim until its lights come on.
      const dark = 0.72 * (1 - lit) + 0.04
      ctx.fillStyle = `rgba(8,8,18,${dark})`
      ctx.fillRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      // The ceiling's shade.
      const g = ctx.createLinearGradient(0, b.y0 * k, 0, (b.y0 + 1.2) * k)
      g.addColorStop(0, 'rgba(0,0,0,0.35)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, 1.2 * k)
      ctx.restore()
    })
    drawMilk(ctx, k, f, t, FINALE, BASE)
    drawFlock(ctx, k, view, t, ROOF, 'front', [LEFT, RIGHT])
    drawPavement(ctx, k, f, t, FINALE, BASE, 'ground')
    drawEl(p, k, f, t)
    drawPavement(ctx, k, f, t, FINALE, BASE, 'people')
    drawNear(ctx, k, f, t)
    ctx.restore()
  },
})
