import { mixHex } from '../../../../parts'
import { frame, hash, rgba, scenery, smooth } from './kit'
import { picture } from './lens'
import { insideRoom, ROOM } from './club/room'
import { drawPalm, PALMS } from './city'
import { figure } from './movie/drive'
import { DRIVE_MAT as D } from './worlds'

/**
 * The block Seb's stands on: the street the camera comes in from at the start and draws back over at the end. It is
 * drawn in the piano's frame, as the room and the city are, at street level, so it does not slide against the club.
 *
 * Two pieces. `block`, behind the club: across the side street on the left a diner open all night, a shop shuttered
 * for it and an apartment house; on the right, wall to wall with the club, an apartment over a corner store with its
 * fire escape, then a low shop, a car park and a three-storey house; and the palms along the pavement in front of
 * them. Every one is lower than the club's roof, so the credits keep their sky. `street`, in front of the road: the
 * light of the shopfronts lying on the pavement, the bus stop, the people on the pavement and the cars on the road,
 * their headlamps' light on the asphalt ahead of them.
 *
 * At the start it is late and nearly still: the diner and two windows lit, one car going by. Through the goodbye it
 * stays so. From the band on it fills with the city, a window and a car at a time, and is at its fullest as The End's
 * orchestra climbs; each thing comes out by its own number, so nothing pops.
 */
export interface StreetState {
  end: boolean
}

/** The pavement's top, the road's far and near edges, and the two lanes' ground lines. */
const WALK = ROOM.floor
const ROAD0 = ROOM.floor + 0.22
const LANE: [number, number] = [ROAD0 + 0.72, ROAD0 + 1.63]
/** Each lane's way (+1 to the right) and its speed, cells a second: one speed a lane, so no car runs into another. */
const WAY: [number, number] = [1, -1]
const SPEED: [number, number] = [6.2, 7.1]

/** How much of the street's life is out: late and quiet, until the band; then filling with the city to The End's climb. */
export function life(t: number, end: boolean): number {
  return end ? 0.12 + 0.88 * smooth(t, 479, 500) : 0.12
}
/** How far out one thing whose number is `h` (0..1) is when the street is `b` alive. */
const out = (b: number, h: number): number => smooth(b, h * 0.9, h * 0.9 + 0.1)

/* ------------------------------------------------------------------ the buildings */

interface Win {
  x0: number
  y0: number
  x1: number
  y1: number
  /** Its number: lit once the street is this alive. Below 0.12, lit from the start. */
  h: number
  /** Someone in it: 0 nobody, 1 at the sill, 2 crossing the room now and then. */
  who: number
  warm: boolean
}
interface House {
  x0: number
  x1: number
  top: number
  wall: string
  /** Upper floors: how many, and windows across each. */
  floors: number
  across: number
  /** The ground floor's kind. */
  ground: 'diner' | 'shutter' | 'store' | 'lobby' | 'closed'
  /** The ground floor's height. */
  gh: number
  wins: Win[]
}
const FLOOR_H = 1.62
const GROUND_H = 2.15
function house(i: number, x0: number, x1: number, floors: number, across: number, ground: House['ground'], wall: string, lit: number[] = [], gh = GROUND_H): House {
  const top = WALK - gh - floors * FLOOR_H - 0.12
  const wins: Win[] = []
  const bay = (x1 - x0) / across
  for (let f = 0; f < floors; f++) {
    for (let j = 0; j < across; j++) {
      const n = f * across + j
      const y1 = WALK - gh - f * FLOOR_H - 0.38
      const cx = x0 + bay * (j + 0.5)
      const h = lit.includes(n) ? 0.05 : 0.18 + 0.8 * hash(i, n, 91)
      const who = hash(i, n, 92) < 0.18 ? 1 : hash(i, n, 93) < 0.2 ? 2 : 0
      wins.push({ x0: cx - bay * 0.26, x1: cx + bay * 0.26, y0: y1 - 0.86, y1, h, who, warm: hash(i, n, 94) < 0.78 })
    }
  }
  return { x0, x1, top, wall, floors, across, ground, gh, wins }
}
/** Left, across the side street; then right, wall to wall with the club. */
const HOUSES: House[] = [
  house(0, -26.1, -16.8, 0, 1, 'diner', '#2A2234', [], 2.75),
  house(1, -30.6, -26.4, 1, 2, 'shutter', '#241D2E', [1]),
  house(2, -43, -30.9, 3, 5, 'lobby', '#1F1A2B', [7]),
  house(3, ROOM.wallR1 + 0.05, 19.9, 3, 4, 'store', '#2B2131', [5, 10]),
  house(4, 21.1, 29.4, 1, 3, 'closed', '#231C2C'),
  house(5, 36.4, 48, 2, 5, 'lobby', '#211B2D', [3]),
]
const DINER = HOUSES[0]
/** The car park between the low shop and the last house: its fence, its lamp, and the one car left in it. */
const LOT: [number, number] = [29.9, 35.9]

/** The diner's sign on its roof: a cup in a pink tube, its steam three strokes over it. No letters. */
const SIGN_TUBE = '#F07A8A'
const SIGN_CORE = '#FFE2E6'

function drawHouses(ctx: CanvasRenderingContext2D, k: number, t: number, b: number, fr: { x0: number; x1: number; y0: number; y1: number }): void {
  const line = rgba('#0A0812', 0.9)
  ctx.lineWidth = Math.max(1, 0.025 * k)
  for (const [hi, hs] of HOUSES.entries()) {
    if (hs.x1 < fr.x0 - 1 || hs.x0 > fr.x1 + 1) continue
    // The house: its wall, a parapet, and the line of each floor.
    ctx.fillStyle = hs.wall
    ctx.fillRect(hs.x0 * k, hs.top * k, (hs.x1 - hs.x0) * k, (WALK - hs.top) * k)
    ctx.fillStyle = mixHex(hs.wall, '#000000', 0.35)
    ctx.fillRect((hs.x0 - 0.08) * k, (hs.top - 0.14) * k, (hs.x1 - hs.x0 + 0.16) * k, 0.18 * k)
    // The city's glow catches the parapet's top edge.
    ctx.fillStyle = rgba('#C9795E', 0.18)
    ctx.fillRect((hs.x0 - 0.08) * k, (hs.top - 0.14) * k, (hs.x1 - hs.x0 + 0.16) * k, 0.03 * k)
    ctx.strokeStyle = rgba('#000000', 0.25)
    ctx.beginPath()
    for (let f = 1; f <= hs.floors; f++) {
      const y = WALK - hs.gh - (f - 1) * FLOOR_H - 0.06
      ctx.moveTo(hs.x0 * k, y * k)
      ctx.lineTo(hs.x1 * k, y * k)
    }
    ctx.stroke()
    // The upper windows: dark glass, or lit, and lit only in the glass: the window is the light.
    for (const [wi, w] of hs.wins.entries()) {
      const on = w.h < 0.12 ? 1 : out(b, w.h)
      ctx.fillStyle = '#120F1D'
      ctx.fillRect(w.x0 * k, w.y0 * k, (w.x1 - w.x0) * k, (w.y1 - w.y0) * k)
      if (on > 0.01) {
        const glass = w.warm ? '#E2B26A' : '#9FB4D9'
        ctx.fillStyle = rgba(glass, 0.8 * on)
        ctx.fillRect(w.x0 * k, w.y0 * k, (w.x1 - w.x0) * k, (w.y1 - w.y0) * k)
        // The room behind: a little lighter low down, where the lamp is.
        ctx.fillStyle = rgba('#FFF0D2', 0.18 * on)
        ctx.fillRect(w.x0 * k, (w.y0 + (w.y1 - w.y0) * 0.55) * k, (w.x1 - w.x0) * k, (w.y1 - w.y0) * 0.45 * k)
        // Its curtains, drawn to the sides; one of them stirring.
        ctx.fillStyle = rgba(mixHex(glass, '#3A1E2A', 0.55), on)
        const cw = (w.x1 - w.x0) * (0.2 + 0.03 * Math.sin(t * 0.7 + wi * 1.9 + hi))
        ctx.fillRect(w.x0 * k, w.y0 * k, cw * k, (w.y1 - w.y0) * k)
        ctx.fillRect((w.x1 - (w.x1 - w.x0) * 0.2) * k, w.y0 * k, (w.x1 - w.x0) * 0.2 * k, (w.y1 - w.y0) * k)
        if (w.who && on > 0.5) dweller(ctx, k, t, w, hi * 31 + wi)
      }
      // The frame and the sill.
      ctx.strokeStyle = line
      ctx.beginPath()
      ctx.rect(w.x0 * k, w.y0 * k, (w.x1 - w.x0) * k, (w.y1 - w.y0) * k)
      ctx.moveTo(((w.x0 + w.x1) / 2) * k, w.y0 * k)
      ctx.lineTo(((w.x0 + w.x1) / 2) * k, w.y1 * k)
      ctx.stroke()
      ctx.fillStyle = mixHex(hs.wall, '#8A7A86', 0.3)
      ctx.fillRect((w.x0 - 0.06) * k, w.y1 * k, (w.x1 - w.x0 + 0.12) * k, 0.07 * k)
    }
    groundFloor(ctx, k, t, b, hs, hi)
  }
  // The fire escape down the front of the house beside the club: landings at each floor, ladders between, in black.
  {
    const hs = HOUSES[3]
    const x0 = hs.x0 + (hs.x1 - hs.x0) * 0.08
    const x1 = hs.x0 + (hs.x1 - hs.x0) * 0.5
    if (x1 > fr.x0 - 1 && x0 < fr.x1 + 1) {
      ctx.strokeStyle = '#07060C'
      ctx.lineWidth = Math.max(1, 0.035 * k)
      ctx.beginPath()
      for (let f = 0; f < hs.floors; f++) {
        const y = WALK - GROUND_H - f * FLOOR_H - 0.3
        ctx.moveTo(x0 * k, y * k)
        ctx.lineTo(x1 * k, y * k)
        // The rail.
        ctx.moveTo(x0 * k, (y - 0.4) * k)
        ctx.lineTo(x1 * k, (y - 0.4) * k)
        for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 6) {
          ctx.moveTo(x * k, y * k)
          ctx.lineTo(x * k, (y - 0.4) * k)
        }
        // The stair to the landing above, alternating sides.
        if (f < hs.floors - 1) {
          const [sa, sb] = f % 2 ? [x0 + 0.2, x1 - 0.3] : [x1 - 0.2, x0 + 0.3]
          ctx.moveTo(sa * k, y * k)
          ctx.lineTo(sb * k, (y - FLOOR_H) * k)
        }
      }
      // The drop ladder, hung up over the pavement.
      const yl = WALK - GROUND_H - 0.3
      ctx.moveTo((x1 - 0.15) * k, yl * k)
      ctx.lineTo((x1 - 0.15) * k, (yl + 0.9) * k)
      ctx.moveTo((x1 - 0.45) * k, yl * k)
      ctx.lineTo((x1 - 0.45) * k, (yl + 0.9) * k)
      for (let y = yl + 0.15; y < yl + 0.9; y += 0.18) {
        ctx.moveTo((x1 - 0.45) * k, y * k)
        ctx.lineTo((x1 - 0.15) * k, y * k)
      }
      ctx.stroke()
      // A pot of geraniums on the second landing, and a chair.
      const y2 = WALK - GROUND_H - FLOOR_H - 0.3
      ctx.fillStyle = '#07060C'
      ctx.fillRect((x0 + 0.5) * k, (y2 - 0.22) * k, 0.24 * k, 0.22 * k)
      ctx.fillStyle = '#5A2A3A'
      ctx.beginPath()
      ctx.arc((x0 + 0.62) * k, (y2 - 0.3) * k, 0.13 * k, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // The car park: its fence, the last car left in it, and its lamp on a pole.
  if (LOT[1] > fr.x0 - 1 && LOT[0] < fr.x1 + 1) {
    ctx.strokeStyle = rgba('#5A5068', 0.55)
    ctx.lineWidth = Math.max(1, 0.02 * k)
    ctx.beginPath()
    ctx.moveTo(LOT[0] * k, (WALK - 0.9) * k)
    ctx.lineTo(LOT[1] * k, (WALK - 0.9) * k)
    for (let x = LOT[0]; x <= LOT[1] + 1e-6; x += 0.3) {
      ctx.moveTo(x * k, (WALK - 0.9) * k)
      ctx.lineTo((x + 0.3) * k, WALK * k)
      ctx.moveTo((x + 0.3) * k, (WALK - 0.9) * k)
      ctx.lineTo(x * k, WALK * k)
    }
    ctx.stroke()
    car(ctx, k, LOT[0] + 1.2, WALK - 0.05, 1, 0.82, '#3B4152', false, 0)
    ctx.strokeStyle = '#0A0812'
    ctx.lineWidth = Math.max(1, 0.05 * k)
    ctx.beginPath()
    ctx.moveTo((LOT[1] - 1.2) * k, WALK * k)
    ctx.lineTo((LOT[1] - 1.2) * k, (WALK - 3.6) * k)
    ctx.lineTo((LOT[1] - 0.8) * k, (WALK - 3.7) * k)
    ctx.stroke()
    ctx.fillStyle = '#F2D9A0'
    ctx.fillRect((LOT[1] - 0.95) * k, (WALK - 3.7) * k, 0.3 * k, 0.06 * k)
  }
  // The diner's sign on its roof.
  if (DINER.x1 > fr.x0 - 3 && DINER.x0 < fr.x1 + 3) dinerSign(ctx, k, (DINER.x0 + DINER.x1) / 2, DINER.top - 0.14)
}

/** Someone in a lit window: at the sill, their head turning now and then; or crossing the room, and gone again. */
function dweller(ctx: CanvasRenderingContext2D, k: number, t: number, w: Win, seed: number): void {
  const wd = w.x1 - w.x0
  ctx.save()
  ctx.beginPath()
  ctx.rect(w.x0 * k, w.y0 * k, wd * k, (w.y1 - w.y0) * k)
  ctx.clip()
  ctx.fillStyle = '#1A1220'
  let x: number
  if (w.who === 1) x = w.x0 + wd * (0.5 + 0.08 * Math.sin(t * 0.31 + seed))
  else {
    // Across and back out of sight, once every so often.
    const every = 9 + 5 * hash(seed, 1, 95)
    const u = ((t + hash(seed, 2, 95) * every) % every) / 2.6
    if (u > 1) {
      ctx.restore()
      return
    }
    x = w.x0 - 0.3 + (wd + 0.6) * u
  }
  const hy = w.y1 - 0.42
  ctx.beginPath()
  ctx.ellipse(x * k, hy * k, 0.1 * k, 0.12 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo((x - 0.24) * k, w.y1 * k)
  ctx.quadraticCurveTo((x - 0.22) * k, (hy + 0.14) * k, x * k, (hy + 0.12) * k)
  ctx.quadraticCurveTo((x + 0.22) * k, (hy + 0.14) * k, (x + 0.24) * k, w.y1 * k)
  ctx.fill()
  ctx.restore()
}

/** The ground floors: the diner's long lit window, a shutter, the corner store, a lobby, a shop closed for the night. */
function groundFloor(ctx: CanvasRenderingContext2D, k: number, t: number, b: number, hs: House, hi: number): void {
  const y0 = WALK - hs.gh + (hs.ground === 'diner' ? 1.2 : 0.25)
  const y1 = WALK - 0.3
  const line = rgba('#0A0812', 0.9)
  if (hs.ground === 'diner') {
    const x0 = hs.x0 + 0.4
    const x1 = hs.x1 - 1.1
    // Inside, lit all night: the cream back wall, the pass to the kitchen with the cook at it, the counter and its
    // stools, the people at it; and over it the lamps' shades, lit.
    ctx.fillStyle = '#E8D3A6'
    ctx.fillRect(x0 * k, (y0 - 0.55) * k, (x1 - x0) * k, (y1 - y0 + 0.55) * k)
    ctx.fillStyle = '#C9A877'
    ctx.fillRect(x0 * k, (y1 - 0.62) * k, (x1 - x0) * k, 0.62 * k)
    const px0 = x0 + (x1 - x0) * 0.58
    ctx.fillStyle = '#5B4334'
    ctx.fillRect(px0 * k, (y0 - 0.35) * k, 1.6 * k, 0.55 * k)
    // The cook in his cap, along the pass and back.
    const cx = px0 + 0.8 + 0.55 * Math.sin(t * 0.45)
    figureBust(ctx, k, cx, y0 + 0.2, 0.62, '#EDE6DA', '#2A1E1E')
    // The people at the counter: one at the start, more as the night fills; each lifts a cup now and then.
    const seats = [0.12, 0.27, 0.42, 0.78, 0.9]
    seats.forEach((u, j) => {
      const there = j === 1 ? 1 : out(b, 0.3 + j * 0.13)
      if (there < 0.5) return
      const sx = x0 + (x1 - x0) * u
      const sip = Math.max(0, Math.sin(t * 0.37 + j * 2.3) - 0.85) * 6
      figureBust(ctx, k, sx, y1 - 0.55, 0.78, ['#3A2A3A', '#2E3B4A', '#4A2E2E', '#2E3A2E', '#3E3346'][j], '#1A1220', sip)
    })
    // The counter's front, its top's chrome edge, and the stools' tops in front of it.
    ctx.fillStyle = '#7A2E36'
    ctx.fillRect(x0 * k, (y1 - 0.42) * k, (x1 - x0) * k, 0.42 * k)
    ctx.fillStyle = '#D9D2C8'
    ctx.fillRect(x0 * k, (y1 - 0.45) * k, (x1 - x0) * k, 0.04 * k)
    ctx.fillStyle = '#9A2E3A'
    for (let x = x0 + 0.45; x < x1 - 0.2; x += 0.75) ctx.fillRect((x - 0.14) * k, (y1 - 0.12) * k, 0.28 * k, 0.08 * k)
    // The lamps' shades over the counter: the lit glass is the light.
    ctx.strokeStyle = rgba('#2A1E1E', 0.7)
    ctx.beginPath()
    for (let x = x0 + 0.8; x < x1 - 0.3; x += 1.6) {
      ctx.moveTo(x * k, (y0 - 0.55) * k)
      ctx.lineTo(x * k, (y0 - 0.15) * k)
    }
    ctx.stroke()
    ctx.fillStyle = '#FFE7B0'
    for (let x = x0 + 0.8; x < x1 - 0.3; x += 1.6) {
      ctx.beginPath()
      ctx.moveTo((x - 0.08) * k, (y0 - 0.15) * k)
      ctx.lineTo((x + 0.08) * k, (y0 - 0.15) * k)
      ctx.lineTo((x + 0.16) * k, (y0 + 0.02) * k)
      ctx.lineTo((x - 0.16) * k, (y0 + 0.02) * k)
      ctx.fill()
    }
    // The window's frame, mullions, and the door at its end, its glass lit.
    ctx.strokeStyle = line
    ctx.lineWidth = Math.max(1, 0.04 * k)
    ctx.beginPath()
    ctx.rect(x0 * k, (y0 - 0.55) * k, (x1 - x0) * k, (y1 - y0 + 0.55) * k)
    for (let x = x0 + (x1 - x0) / 4; x < x1 - 0.01; x += (x1 - x0) / 4) {
      ctx.moveTo(x * k, (y0 - 0.55) * k)
      ctx.lineTo(x * k, y1 * k)
    }
    ctx.stroke()
    const d0 = hs.x1 - 0.85
    ctx.fillStyle = '#D9BE86'
    ctx.fillRect(d0 * k, (y0 - 0.3) * k, 0.55 * k, (WALK - y0 + 0.3) * k)
    ctx.strokeStyle = line
    ctx.strokeRect(d0 * k, (y0 - 0.3) * k, 0.55 * k, (WALK - y0 + 0.3) * k)
    // Its band of enamel over the window, a stripe of the sign's pink.
    ctx.fillStyle = '#3A2A3E'
    ctx.fillRect(hs.x0 * k, (y0 - 0.95) * k, (hs.x1 - hs.x0) * k, 0.32 * k)
    ctx.fillStyle = rgba(SIGN_TUBE, 0.55)
    ctx.fillRect(hs.x0 * k, (y0 - 0.7) * k, (hs.x1 - hs.x0) * k, 0.04 * k)
    return
  }
  const x0 = hs.x0 + 0.35
  const x1 = hs.x1 - 0.35
  if (hs.ground === 'shutter' || hs.ground === 'closed') {
    // Shuttered for the night: the roll-down's slats; over it a lamp, its glass lit.
    const half = hs.ground === 'closed' ? 0.55 : 1
    ctx.fillStyle = '#2E2A36'
    ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0 + 0.3) * k)
    if (half < 1) {
      // Half down on a shop with its night light on at the back.
      ctx.fillStyle = '#3A3550'
      ctx.fillRect(x0 * k, (y0 + (y1 - y0) * half) * k, (x1 - x0) * k, (y1 - y0) * (1 - half) * k + 0.3 * k)
      ctx.fillStyle = rgba('#9FB4D9', 0.35)
      ctx.fillRect((x0 + 0.4) * k, (y0 + (y1 - y0) * half + 0.15) * k, 0.5 * k, 0.4 * k)
    }
    ctx.strokeStyle = rgba('#0A0812', 0.55)
    ctx.lineWidth = Math.max(1, 0.015 * k)
    ctx.beginPath()
    for (let y = y0 + 0.12; y < y0 + (y1 - y0) * half; y += 0.12) {
      ctx.moveTo(x0 * k, y * k)
      ctx.lineTo(x1 * k, y * k)
    }
    ctx.stroke()
    ctx.fillStyle = '#0A0812'
    ctx.fillRect(((x0 + x1) / 2 - 0.25) * k, (y0 - 0.22) * k, 0.5 * k, 0.12 * k)
    ctx.fillStyle = '#F2D9A0'
    ctx.fillRect(((x0 + x1) / 2 - 0.16) * k, (y0 - 0.1) * k, 0.32 * k, 0.05 * k)
    return
  }
  if (hs.ground === 'store') {
    // The corner store, still open: its window's shelves, its awning, the light on its sill; the street door beside it.
    const sx1 = x1 - 1.0
    ctx.fillStyle = '#9C8E70'
    ctx.fillRect(x0 * k, y0 * k, (sx1 - x0) * k, (y1 - y0) * k)
    ctx.fillStyle = '#4A3A30'
    for (let y = y0 + 0.35; y < y1; y += 0.42) ctx.fillRect(x0 * k, y * k, (sx1 - x0) * k, 0.05 * k)
    // Its goods on the shelves: tins and boxes, a row of small blocks.
    for (let y = y0 + 0.35; y < y1; y += 0.42) {
      for (let x = x0 + 0.1; x < sx1 - 0.1; x += 0.16) {
        const v = hash(Math.round(x * 10), Math.round(y * 10), 96)
        if (v < 0.45) continue
        ctx.fillStyle = ['#6E3438', '#34485E', '#7A6838', '#3A5240', '#5A4466'][Math.floor(v * 5) % 5]
        ctx.fillRect(x * k, (y - 0.12 - 0.06 * v) * k, 0.11 * k, (0.12 + 0.06 * v) * k)
      }
    }
    // The man behind the till, reading.
    figureBust(ctx, k, sx1 - 0.55, y1 - 0.3, 0.72, '#3A3346', '#1A1220')
    ctx.strokeStyle = line
    ctx.lineWidth = Math.max(1, 0.04 * k)
    ctx.strokeRect(x0 * k, y0 * k, (sx1 - x0) * k, (y1 - y0) * k)
    // The awning, striped.
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#2E5A4A' : '#D9CDB5'
      const a = x0 - 0.15 + ((sx1 - x0 + 0.3) * i) / 8
      ctx.beginPath()
      ctx.moveTo(a * k, (y0 - 0.3) * k)
      ctx.lineTo((a + (sx1 - x0 + 0.3) / 8) * k, (y0 - 0.3) * k)
      ctx.lineTo((a + (sx1 - x0 + 0.3) / 8 + 0.03) * k, (y0 + 0.05) * k)
      ctx.lineTo((a + 0.03) * k, (y0 + 0.05) * k)
      ctx.fill()
    }
    // The house's street door: dark wood, a lit fanlight.
    ctx.fillStyle = '#1A1220'
    ctx.fillRect((x1 - 0.7) * k, (y0 - 0.1) * k, 0.6 * k, (WALK - y0 + 0.1) * k)
    ctx.fillStyle = rgba('#E2B26A', 0.75)
    ctx.fillRect((x1 - 0.65) * k, (y0 - 0.05) * k, 0.5 * k, 0.16 * k)
    void hi
    return
  }
  // A lobby: its glass doors lit, a plant inside.
  const cx = (x0 + x1) / 2
  ctx.fillStyle = '#CBB894'
  ctx.fillRect((cx - 0.6) * k, (y0 + 0.2) * k, 1.2 * k, (WALK - y0 - 0.2) * k)
  ctx.fillStyle = '#2A3A2A'
  ctx.beginPath()
  ctx.ellipse((cx - 0.35) * k, (WALK - 0.55) * k, 0.18 * k, 0.32 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = line
  ctx.lineWidth = Math.max(1, 0.04 * k)
  ctx.beginPath()
  ctx.rect((cx - 0.6) * k, (y0 + 0.2) * k, 1.2 * k, (WALK - y0 - 0.2) * k)
  ctx.moveTo(cx * k, (y0 + 0.2) * k)
  ctx.lineTo(cx * k, WALK * k)
  ctx.stroke()
  // Its ground-floor windows either side, dark.
  ctx.fillStyle = '#120F1D'
  for (const x of [x0 + 0.2, x1 - 1.4]) ctx.fillRect(x * k, (y0 + 0.3) * k, 1.2 * k, 0.9 * k)
}

/** Someone seen from the waist up: shoulders and a head, in a colour; their arm lifting a cup by `sip` (0..1). */
function figureBust(ctx: CanvasRenderingContext2D, k: number, x: number, base: number, h: number, coat: string, head: string, sip = 0): void {
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.moveTo((x - 0.22 * h) * k, base * k)
  ctx.quadraticCurveTo((x - 0.22 * h) * k, (base - 0.42 * h) * k, x * k, (base - 0.45 * h) * k)
  ctx.quadraticCurveTo((x + 0.22 * h) * k, (base - 0.42 * h) * k, (x + 0.22 * h) * k, base * k)
  ctx.fill()
  ctx.fillStyle = head
  ctx.beginPath()
  ctx.ellipse(x * k, (base - 0.6 * h) * k, 0.11 * h * k, 0.13 * h * k, 0, 0, Math.PI * 2)
  ctx.fill()
  if (sip > 0.02) {
    const s = Math.min(1, sip)
    ctx.strokeStyle = coat
    ctx.lineWidth = Math.max(1, 0.07 * h * k)
    ctx.beginPath()
    ctx.moveTo((x + 0.15 * h) * k, (base - 0.3 * h) * k)
    ctx.lineTo((x + 0.24 * h) * k, (base - (0.3 + 0.25 * s) * h) * k)
    ctx.stroke()
  }
}

function dinerSign(ctx: CanvasRenderingContext2D, k: number, cx: number, foot: number): void {
  // Its frame on the roof, black; the tube bent into a cup and a saucer, and three strokes of steam. The tube is the
  // light: nothing round it.
  ctx.strokeStyle = '#07060C'
  ctx.lineWidth = Math.max(1, 0.05 * k)
  ctx.beginPath()
  ctx.moveTo((cx - 0.7) * k, foot * k)
  ctx.lineTo((cx - 0.7) * k, (foot - 0.5) * k)
  ctx.moveTo((cx + 0.7) * k, foot * k)
  ctx.lineTo((cx + 0.7) * k, (foot - 0.5) * k)
  ctx.moveTo((cx - 0.8) * k, (foot - 0.5) * k)
  ctx.lineTo((cx + 0.8) * k, (foot - 0.5) * k)
  ctx.stroke()
  const cup = new Path2D()
  const y = foot - 0.62
  cup.moveTo((cx - 0.45) * k, (y - 0.5) * k)
  cup.lineTo((cx - 0.38) * k, (y - 0.08) * k)
  cup.quadraticCurveTo(cx * k, (y + 0.02) * k, (cx + 0.38) * k, (y - 0.08) * k)
  cup.lineTo((cx + 0.45) * k, (y - 0.5) * k)
  cup.closePath()
  cup.moveTo((cx + 0.43) * k, (y - 0.42) * k)
  cup.quadraticCurveTo((cx + 0.7) * k, (y - 0.38) * k, (cx + 0.41) * k, (y - 0.2) * k)
  cup.moveTo((cx - 0.62) * k, (y + 0.02) * k)
  cup.lineTo((cx + 0.62) * k, (y + 0.02) * k)
  for (const dx of [-0.2, 0, 0.2]) {
    cup.moveTo((cx + dx) * k, (y - 0.6) * k)
    cup.quadraticCurveTo((cx + dx + 0.1) * k, (y - 0.75) * k, (cx + dx) * k, (y - 0.9) * k)
    cup.quadraticCurveTo((cx + dx - 0.1) * k, (y - 1.05) * k, (cx + dx) * k, (y - 1.18) * k)
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = SIGN_TUBE
  ctx.lineWidth = Math.max(1.2, 0.07 * k)
  ctx.stroke(cup)
  ctx.strokeStyle = SIGN_CORE
  ctx.lineWidth = Math.max(0.6, 0.025 * k)
  ctx.stroke(cup)
}

export const block = scenery<StreetState>({
  name: 'block',
  draw(p, s, c) {
    const k = c.k
    const t = c.t
    // Inside the room, its back wall covers the block entirely.
    if (insideRoom(picture(p, k, t))) return
    const fr = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    drawHouses(ctx, k, t, life(t, s.end), fr)
    // The palms along the pavement, in front of the houses, against the lit sky.
    for (const pm of PALMS) {
      if (pm.x < fr.x0 - 4 || pm.x > fr.x1 + 4) continue
      drawPalm(ctx, k, pm.x, WALK, pm.h, pm.lean + 0.012 * Math.sin(t * 0.5 + pm.x))
    }
    ctx.restore()
  },
})

/* ------------------------------------------------------------------ the street */

/** A car side on: its body, glass, wheels and lamps, facing `way`; its headlamps' light on the road ahead. */
function car(ctx: CanvasRenderingContext2D, k: number, rear: number, ground: number, way: number, sc: number, body: string, lamps: boolean, lit: number): void {
  const L = 2.3
  const X = (u: number) => (rear + way * u * sc) * k
  const Y = (v: number) => (ground + v * sc) * k
  if (lamps) {
    // The light on the asphalt ahead of it and the red behind: lying on the road, not in the air.
    const nose = rear + way * L * sc
    ctx.fillStyle = rgba(D.head, 0.09 * lit)
    ctx.beginPath()
    ctx.ellipse((nose + way * 1.05 * sc) * k, (ground + 0.02) * k, 1.05 * sc * k, 0.08 * sc * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(D.head, 0.1 * lit)
    ctx.beginPath()
    ctx.ellipse((nose + way * 0.6 * sc) * k, (ground + 0.02) * k, 0.55 * sc * k, 0.05 * sc * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(D.tail, 0.12 * lit)
    ctx.beginPath()
    ctx.ellipse((rear - way * 0.35 * sc) * k, (ground + 0.02) * k, 0.4 * sc * k, 0.05 * sc * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const pts: [number, number][] = [[0, -0.16], [L, -0.16], [L, -0.36], [L - 0.55, -0.46], [1.55, -0.47], [1.3, -0.78], [0.62, -0.78], [0.35, -0.48], [0, -0.45]]
  ctx.fillStyle = body
  ctx.beginPath()
  pts.forEach(([u, v], i) => (i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v))))
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgba('#0A0812', 0.6)
  ctx.lineWidth = Math.max(0.8, 0.02 * k)
  ctx.stroke()
  ctx.fillStyle = rgba('#141428', 0.92)
  ctx.beginPath()
  for (const q of [[[0.7, -0.5], [1.2, -0.5], [1.2, -0.72], [0.72, -0.72]], [[1.28, -0.5], [1.48, -0.5], [1.26, -0.72]]] as [number, number][][]) {
    q.forEach(([u, v], i) => (i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v))))
    ctx.closePath()
  }
  ctx.fill()
  ctx.fillStyle = '#0D0D18'
  ctx.beginPath()
  for (const u of [0.45, 1.85]) {
    ctx.moveTo(X(u) + 0.19 * sc * k, Y(-0.19))
    ctx.arc(X(u), Y(-0.19), 0.19 * sc * k, 0, Math.PI * 2)
  }
  ctx.fill()
  if (lamps) {
    const lx = (u: number) => Math.min(X(u), X(u + 0.08))
    ctx.fillStyle = D.head
    ctx.fillRect(lx(L - 0.06), Y(-0.36), 0.08 * sc * k, 0.08 * sc * k)
    ctx.fillStyle = D.tail
    ctx.fillRect(lx(-0.02), Y(-0.42), 0.08 * sc * k, 0.1 * sc * k)
  }
}

/** The cars on the road: one going slowly by at the start; at the end, from the band on, more and more of them. */
interface Run {
  t0: number
  lane: 0 | 1
  col: string
}
const RUNS_END: Run[] = (() => {
  const out: Run[] = []
  for (const lane of [0, 1] as const) {
    // Out on the road only once the camera has drawn back off the stage and the street is in the picture (from about
    // 489): the first of them reach it then; closer together as the city fills.
    let t = 477.5 + lane * 0.8
    let i = 0
    while (t < 515) {
      out.push({ t0: t, lane, col: mixHex(D.car[Math.floor(hash(i, lane, 84) * 5)], D.night, 0.42) })
      t += (5.2 - 3.6 * smooth(t, 478, 497)) * (0.75 + 0.5 * hash(i, lane, 83))
      i++
    }
  }
  return out
})()
/** Where a run starts, off past the edge of the widest shot, and how far it goes. */
const FROM = (lane: 0 | 1) => (WAY[lane] > 0 ? -66 : 70)
function drawTraffic(ctx: CanvasRenderingContext2D, k: number, t: number, end: boolean, fr: { x0: number; x1: number; y0: number; y1: number }): void {
  if (LANE[1] - 1 > fr.y1 || LANE[0] < fr.y0) return
  // The start's one car: slowly by on the far side, as the camera comes in.
  const runs: { rear: number; lane: 0 | 1; col: string; v: number }[] = []
  if (!end) runs.push({ rear: -24 + 3.1 * (t + 2), lane: 0, col: mixHex(D.car[2], D.night, 0.45), v: 3.1 })
  else for (const r of RUNS_END) if (t >= r.t0) runs.push({ rear: FROM(r.lane) + WAY[r.lane] * SPEED[r.lane] * (t - r.t0), lane: r.lane, col: r.col, v: SPEED[r.lane] })
  for (const r of runs) {
    if (r.rear < fr.x0 - 5 || r.rear > fr.x1 + 5) continue
    car(ctx, k, r.rear, LANE[r.lane], WAY[r.lane], 1, r.col, true, 1)
  }
}

/** The bus stop, on the pavement before the low shop: its shelter, its lit panel (a picture, no letters), its bench. */
const STOP_X = 25.4
function busStop(ctx: CanvasRenderingContext2D, k: number, t: number, fr: { x0: number; x1: number }): void {
  if (STOP_X + 1.6 < fr.x0 || STOP_X - 1.6 > fr.x1) return
  const x0 = STOP_X - 1.3
  const x1 = STOP_X + 1.3
  const top = WALK - 1.55
  // The panel at its end, lit from inside: a picture of the sea at sunset with a palm. It is the light.
  const px0 = x1 - 0.62
  const g = ctx.createLinearGradient(0, (top + 0.15) * k, 0, (WALK - 0.25) * k)
  g.addColorStop(0, '#E07A93')
  g.addColorStop(0.6, '#F2C46B')
  g.addColorStop(0.61, '#3A6A9A')
  g.addColorStop(1, '#2A4A7A')
  ctx.fillStyle = g
  ctx.fillRect(px0 * k, (top + 0.15) * k, 0.5 * k, (WALK - 0.4 - top) * k)
  ctx.strokeStyle = '#0A0812'
  ctx.lineWidth = Math.max(1, 0.04 * k)
  ctx.beginPath()
  ctx.moveTo((px0 + 0.38) * k, (WALK - 0.55) * k)
  ctx.quadraticCurveTo((px0 + 0.34) * k, (top + 0.6) * k, (px0 + 0.3) * k, (top + 0.45) * k)
  ctx.stroke()
  // Its frame, roof and posts; the bench.
  ctx.strokeStyle = '#0A0812'
  ctx.lineWidth = Math.max(1, 0.05 * k)
  ctx.beginPath()
  ctx.moveTo(x0 * k, WALK * k)
  ctx.lineTo(x0 * k, top * k)
  ctx.lineTo((x1 + 0.1) * k, top * k)
  ctx.moveTo(x1 * k, top * k)
  ctx.lineTo(x1 * k, WALK * k)
  ctx.rect(px0 * k, (top + 0.15) * k, 0.5 * k, (WALK - 0.4 - top) * k)
  ctx.moveTo((x0 + 0.3) * k, (WALK - 0.42) * k)
  ctx.lineTo((px0 - 0.15) * k, (WALK - 0.42) * k)
  ctx.moveTo((x0 + 0.4) * k, (WALK - 0.42) * k)
  ctx.lineTo((x0 + 0.4) * k, WALK * k)
  ctx.moveTo((px0 - 0.25) * k, (WALK - 0.42) * k)
  ctx.lineTo((px0 - 0.25) * k, WALK * k)
  ctx.stroke()
  ctx.fillStyle = rgba('#9FB4D9', 0.1)
  ctx.fillRect(x0 * k, top * k, (px0 - x0) * k, (WALK - top - 0.45) * k)
  // Someone waiting on the bench, who looks up the street for the bus now and then.
  const look = Math.sin(t * 0.21) > 0.6 ? 1 : 0
  sitter(ctx, k, x0 + 1.0, WALK - 0.42, 0.72, look)
}
/** Someone sitting: legs forward, the coat's body, a head turned up the street (`look` 1) or down at the hands. */
function sitter(ctx: CanvasRenderingContext2D, k: number, x: number, seat: number, h: number, look: number): void {
  ctx.fillStyle = '#120E18'
  ctx.fillRect((x - 0.02) * k, seat * k, 0.3 * h * k, 0.06 * k)
  ctx.fillRect((x + 0.26 * h) * k, seat * k, 0.06 * k, 0.42 * k)
  ctx.fillStyle = '#2E2A3E'
  ctx.beginPath()
  ctx.moveTo((x - 0.14 * h) * k, seat * k)
  ctx.lineTo((x - 0.11 * h) * k, (seat - 0.48 * h) * k)
  ctx.quadraticCurveTo(x * k, (seat - 0.53 * h) * k, (x + 0.11 * h) * k, (seat - 0.48 * h) * k)
  ctx.lineTo((x + 0.14 * h) * k, seat * k)
  ctx.fill()
  ctx.fillStyle = '#17111D'
  ctx.beginPath()
  ctx.ellipse((x - 0.03 * look * h) * k, (seat - (0.6 - 0.04 * (1 - look)) * h) * k, 0.075 * h * k, 0.09 * h * k, 0, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * The people on the pavement at the end, only where she and David never are: two outside the diner talking, a man
 * out of the house beside the club and away up the street, and a woman walking her dog the other way.
 */
function walkers(ctx: CanvasRenderingContext2D, k: number, t: number, end: boolean, fr: { x0: number; x1: number }): void {
  if (!end) return
  const on = (x: number) => x > fr.x0 - 1 && x < fr.x1 + 1
  // Outside the diner, talking, a turn of the head to whoever is speaking.
  for (const [i, x] of [-21.2, -20.6].entries()) {
    if (!on(x)) continue
    const turn = Math.sin((t - 480) * 0.8 + i * 2.4)
    figure(ctx, k, x + 0.01 * Math.sin(t * 0.6 + i), WALK, 0.72 + 0.04 * i, ['#2B2138', '#3A2131'][i], i ? -1 : 1, 0, turn)
  }
  // Out of the house beside the club, once the street is up, and off up the street.
  const out0 = 488.6
  if (t > out0) {
    const x = HOUSES[3].x1 - 0.7 + 0.4 + 0.95 * (t - out0)
    const stride = Math.sin((t - out0) * 7.5)
    if (on(x)) figure(ctx, k, x, WALK, 0.76, '#22283A', 1, stride, 0)
  }
  // A woman and her dog, coming down the street from the far end, the dog stopping at a palm.
  const w0 = 487
  const xw = -46 + 0.9 * (t - w0)
  if (t > w0 && on(xw)) {
    figure(ctx, k, xw, WALK, 0.7, '#4A2E3E', 1, Math.sin((t - w0) * 7.2), 0)
    const dx = xw + 0.75 + 0.15 * Math.sin((t - w0) * 1.3)
    ctx.fillStyle = '#120E18'
    ctx.fillRect((dx - 0.22) * k, (WALK - 0.24) * k, 0.38 * k, 0.12 * k)
    ctx.fillRect((dx + 0.12) * k, (WALK - 0.33) * k, 0.12 * k, 0.12 * k)
    ctx.beginPath()
    for (const lx of [-0.2, -0.12, 0.06, 0.14]) {
      const sw = 0.03 * Math.sin((t - w0) * 14 + lx * 20)
      ctx.rect((dx + lx + sw) * k, (WALK - 0.13) * k, 0.03 * k, 0.13 * k)
    }
    ctx.fill()
    ctx.strokeStyle = rgba('#0A0812', 0.8)
    ctx.lineWidth = Math.max(0.6, 0.012 * k)
    ctx.beginPath()
    ctx.moveTo((xw + 0.12) * k, (WALK - 0.45) * k)
    ctx.quadraticCurveTo((xw + 0.45) * k, (WALK - 0.2) * k, (dx + 0.2) * k, (WALK - 0.3) * k)
    ctx.stroke()
  }
}

/** The light of the lit shopfronts lying on the pavement in front of them. */
function shopLight(ctx: CanvasRenderingContext2D, k: number, fr: { x0: number; x1: number }): void {
  const pools: [number, number, string, number][] = [
    [DINER.x0 + 0.4, DINER.x1 - 0.3, '#E8D3A6', 0.2],
    [HOUSES[3].x0 + 0.35, HOUSES[3].x1 - 1.35, '#C9B88E', 0.1],
    [STOP_X + 0.68, STOP_X + 1.18, '#F2C46B', 0.14],
  ]
  for (const [a, b, col, al] of pools) {
    if (b < fr.x0 - 1 || a > fr.x1 + 1) continue
    ctx.fillStyle = rgba(col, al)
    ctx.beginPath()
    ctx.moveTo(a * k, WALK * k)
    ctx.lineTo(b * k, WALK * k)
    ctx.lineTo((b + 0.25) * k, ROAD0 * k)
    ctx.lineTo((a - 0.25) * k, ROAD0 * k)
    ctx.fill()
  }
}

export const street = scenery<StreetState>({
  name: 'street',
  draw(p, s, c) {
    const k = c.k
    const t = c.t
    // The street is covered wherever the picture is all inside the room above its floor.
    if (insideRoom(picture(p, k, t), true)) return
    const fr = frame(p, k)
    if (fr.y1 < WALK - 2) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    shopLight(ctx, k, fr)
    busStop(ctx, k, t, fr)
    walkers(ctx, k, t, s.end, fr)
    drawTraffic(ctx, k, t, s.end, fr)
    ctx.restore()
  },
})
