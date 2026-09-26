import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { box, carried, frame, hash, part, type Ctx, type PartShot, type Slot } from '../kit'
import { BREAKS } from '../music'
import { G_EARTH } from '../physics'
import { ROAD } from '../worlds'
import {
  BRAKE, CURB_F, CURB_R, DIES, DROP, END, FLASH, IMPACT, LAMP_T, LAND, LAST_LIGHT, ON, OUT, POST_T, REST_X, ROAD_Y, ROLLS, T0, T_GO, TAIL, TRUCK_HIT_X, WRECK,
  carAt, him, seatX, truckX,
} from './crash-clock'
import { WHEEL_R, carPt, drawCar, drawCarOver, drawTruck, type CarLook } from './crash-car'
import { WALL_X, drawGround, drawLamps, drawReflections, drawSky, lightAt } from './crash-road'
import { glow, hexA, kick, poly } from './crash-paint'

/**
 * The road, `FOLDER_END` (205.92) → 242.34: the drive to the competition, late, and the crash on the stop-time
 * breaks. The film: he races to Dunellen in a rental car and a truck hits it at a crossing; the car rolls; he
 * crawls out of the wreck and goes on. No blood.
 *
 * He drops into the rental car's seat as its door slams (the folder part lands him there), the lamps come on, and
 * he pulls away over the curb onto a dark road. Every sodium lamp along it is dark until he passes under it, and
 * lights on the beat as he does: every other beat at first, then every beat, so the road lights up behind him in
 * time with the band and stays dark ahead, his own headlamps the only light there. Far ahead a truck flashes its
 * high beams (225.42); he brakes (226.71); on the first of the band's stop-time breaks (227.15) it hits him. The
 * car is driven back and up onto its tail and slams down on it on the second (227.79), and is thrown into the air;
 * through the silence between the breaks it turns over, slowly, and on the third (230.57) comes down on its roof;
 * then it rolls end over end, a slam on every break, and on the last and loudest (233.99) it stops against a lamp
 * post, on its roof. The post's lamp dies, and the lamps round the wreck go out one by one on the band's hits.
 * Hanging in his belt, he drops out of his seat (236.35), crawls out under the hood, stops, and goes on; the wreck's
 * last headlamp dies (241.06), and he comes to rest in the dark on 242.34: the stage changes to Carnegie Hall.
 *
 * The frame's origin is where he sits in the parked car (the folder part hands him over there); the clock is
 * `crash-clock.ts`, the vehicles `crash-car.ts`, the set `crash-road.ts`.
 */

interface CrashState {
  begin: number
}

/** Every strike, in show seconds: the car's jolts, every lamp lighting, the flash and the brakes, the twelve breaks, the lamps dying, his drop. */
export const CRASH_HITS: number[] = [
  ...new Set([T_GO, CURB_F, CURB_R, ...LAMP_T, FLASH, BRAKE, ...BREAKS, ...DIES.values(), DROP, LAST_LIGHT].map((t) => Math.round(t * 1e4) / 1e4)),
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the car and the truck, looked at */

const smooth01 = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/** The roof, pressed down a little more on each slam that lands on it. */
function roofAt(t: number): number {
  if (t < LAND) return 0
  let r = 0.5
  for (const b of [ROLLS[3], ROLLS[7]]) if (t >= b) r += 0.25
  return Math.min(1, r)
}

/** The wheels' turn: rolling with the drive; after the hit, spinning on and slowing for a long while. */
function turnAt(t: number): number {
  if (t < IMPACT) return (seatX(t) + 0.5) / WHEEL_R
  const tau = t - IMPACT
  return (seatX(IMPACT) + 0.5) / WHEEL_R + 16 * 3.2 * (1 - Math.exp(-tau / 3.2))
}

function carLook(t: number): CarLook {
  const q = carAt(t)
  let lamps = 0
  if (t >= T0 && t < IMPACT) lamps = 0.85 + 0.4 * kick(t - T0, 0.25)
  // Smashed in the hit, the lamp only glows while the car tumbles; when it comes to rest the one left burns along
  // the road, until it dies.
  else if (t >= IMPACT && t < LAST_LIGHT) lamps = t < POST_T ? 0.12 : 0.12 + 0.6 * smooth01((t - POST_T - 0.25) / 0.5)
  else if (t >= LAST_LIGHT) lamps = 0.75 * Math.max(0, 1 - (t - LAST_LIGHT) / 0.3) * (0.4 + 0.6 * kick(t - LAST_LIGHT, 0.06))
  const brake = t < BRAKE ? 0 : t < IMPACT ? 0.7 + 0.3 * kick(t - BRAKE, 0.2) : Math.max(0, 1 - (t - IMPACT) / 0.5)
  // The light on the paint: the lamps overhead, and the truck's headlamps as it comes.
  const gap = truckX(t) - (q.x + 1.8)
  const glare = t < IMPACT + 2 ? Math.max(0, 1 - gap / 9) * (0.6 + 0.8 * kick(t - FLASH, 0.3)) : 0
  return {
    light: 0.3 + 0.8 * lightAt(q.x, t) + glare,
    turn: turnAt(t),
    door: t < T0 ? 1 - smooth01((t - (T0 - 0.32)) / 0.32) ** 2 : 0,
    lamps: Math.max(0, lamps),
    brake,
    nose: t < IMPACT ? 0 : Math.min(1, (t - IMPACT) / 0.06),
    glass: t < LAND ? 0 : 1,
    roof: roofAt(t),
  }
}

/* ------------------------------------------------------------------ glass */

interface Shard {
  t0: number
  from: Pt
  v: Pt
  size: number
  spin: number
  seed: number
}
/** The glass: the headlamp's and the grille's at the hit, the windows' when it lands on its roof. */
const SHARDS: Shard[] = (() => {
  const out: Shard[] = []
  const nose = carPt(carAt(IMPACT), 3.55, 0.7)
  for (let i = 0; i < 9; i++) {
    out.push({ t0: IMPACT, from: [nose[0] - 0.1 * hash(i, 1), nose[1] - 0.2 * hash(i, 2)], v: [-1.2 - 3.5 * hash(i, 3), -1.5 - 3.2 * hash(i, 4)], size: 0.05 + 0.05 * hash(i, 5), spin: 6 + 10 * hash(i, 6), seed: i })
  }
  const q = carAt(LAND)
  for (let i = 0; i < 14; i++) {
    const at = carPt(q, 1.0 + 1.6 * hash(i, 7), 1.0 + 0.2 * hash(i, 8))
    out.push({ t0: LAND, from: at, v: [-2.8 + 3.2 * hash(i, 9), -1.2 - 2.6 * hash(i, 10)], size: 0.04 + 0.05 * hash(i, 11), spin: 5 + 12 * hash(i, 12), seed: 20 + i })
  }
  return out
})()

function shardAt(s: Shard, t: number): { p: Pt; a: number; resting: boolean } | null {
  const tau = t - s.t0
  if (tau < 0) return null
  // The flight to the road, and where it comes to lie, a little further on.
  const g = G_EARTH
  const y0 = s.from[1]
  const floor = ROAD_Y - 0.02
  const land = (s.v[1] + Math.sqrt(s.v[1] * s.v[1] + 2 * g * Math.max(0, floor - y0))) / g
  if (tau < land) return { p: [s.from[0] + s.v[0] * tau, y0 + s.v[1] * tau + 0.5 * g * tau * tau], a: s.spin * tau, resting: false }
  const slide = Math.min(tau - land, 0.35)
  const x = s.from[0] + s.v[0] * land + s.v[0] * 0.3 * (slide - (slide * slide) / 0.7)
  return { p: [x, floor], a: s.spin * land, resting: true }
}

function drawShards(p: p5, c: Ctx, t: number): void {
  const { k } = c
  p.push()
  p.noStroke()
  for (const s of SHARDS) {
    const at = shardAt(s, t)
    if (!at) continue
    const light = 0.35 + lightAt(at.p[0], t)
    p.fill(hexA(mixHex(ROAD.paint, ROAD.car, 0.4), Math.min(0.95, 0.3 + 0.5 * light)))
    const r = s.size
    const a = at.resting ? 0.2 * (hash(s.seed, 13) - 0.5) : at.a
    const sq = at.resting ? 0.35 : 1
    const pts: Pt[] = [0, 1, 2].map((i) => {
      const ang = a + (i / 3) * Math.PI * 2 + 0.6 * hash(s.seed, i + 20)
      return [at.p[0] + Math.cos(ang) * r, at.p[1] + Math.sin(ang) * r * sq]
    })
    poly(p, k, pts)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the part */

function drawCrash(p: p5, s: CrashState, c: Ctx): void {
  const T = c.t + s.begin
  const { k } = c
  const f = frame(p, k)
  if (f.x1 < WALL_X) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.save()
  ctx.beginPath()
  ctx.rect(WALL_X * k, (f.y0 - 2) * k, (f.x1 - WALL_X + 2) * k, (f.y1 - f.y0 + 4) * k)
  ctx.clip()
  drawSky(p, c, f)
  drawGround(p, c, f)
  drawLamps(p, c, f, T, false)
  drawLamps(p, c, f, T, true)
  drawReflections(p, c, f, T)
  // The truck, when it is anywhere near the frame.
  const tx = truckX(T)
  if (tx < f.x1 + 1 && tx + 14 > f.x0) {
    drawTruck(p, c, tx, ROAD_Y, {
      light: 0.45 + 0.7 * lightAt(tx + 2, T),
      lamps: 1,
      flash: kick(T - FLASH, 0.35),
      turn: -(tx / 0.48),
      dent: T < IMPACT ? 0 : Math.min(1, (T - IMPACT) / 0.05),
      dive: T < IMPACT ? 0 : 0.14 * kick(T - IMPACT, 0.9),
    })
  }
  drawCar(p, c, carAt(T), carLook(T))
  // After the last lamp dies the road goes dark round him, so the hall opens out of the same dark.
  const dark = nightFall(T)
  if (dark > 0.005) {
    p.noStroke()
    p.fill(c.bg)
    ctx.globalAlpha = dark
    p.rect(((f.x0 + f.x1) / 2) * k, ((f.y0 + f.y1) / 2) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    ctx.globalAlpha = 1
  }
  ctx.restore()
  p.pop()
}

/** The dark closing in at the end: from the last headlamp's death to the cut. */
const nightFall = (t: number): number => 0.82 * smooth01((t - (LAST_LIGHT + 0.15)) / (END - 0.1 - LAST_LIGHT - 0.15))

function drawCrashOver(p: p5, s: CrashState, c: Ctx): void {
  const T = c.t + s.begin
  const f = frame(p, c.k)
  if (f.x1 < WALL_X) return
  p.push()
  // The door stands in front of him while he sits: from the moment it slams until he drops out of his belt.
  if (T < DROP + 0.3) drawCarOver(p, c, carAt(T), carLook(T))
  if (nightFall(T) < 0.5) drawShards(p, c, T)
  // The slams: a brief soft flare of the road's dust in the lamplight where the car hits.
  for (const b of [IMPACT, TAIL, LAND, ...ROLLS, POST_T]) {
    const since = T - b
    if (since < 0 || since > 0.6) continue
    const q = carAt(b)
    const at: Pt = b === IMPACT ? carPt(q, 3.6, 0.6) : [q.x, ROAD_Y - 0.15]
    glow(p, c, at[0], at[1], 0.9 + 0.8 * since, 0.22 * (1 - since / 0.6) ** 2, ROAD.paint)
  }
  p.pop()
}

export const crash = part<CrashState>(
  { name: 'crash', flight: true, draw: drawCrash, over: drawCrashOver },
  (slot: Slot) => {
    const span = slot.end - slot.begin
    const segs = carried((t) => him(t + slot.begin), 0, span, Math.ceil(span / 0.02))
    const end = him(slot.end)
    return {
      cells: box(WALL_X - 1, ROAD_Y - 9, TRUCK_HIT_X + 24, ROAD_Y + 4, 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: LAMP_T[0] - slot.begin },
      state: { begin: slot.begin },
    }
  },
  (slot: Slot): PartShot[] => {
    const at = (t: number): Pt => {
      const q = carAt(t)
      return [q.x, q.y]
    }
    const hit = at(IMPACT)
    const tail = at(TAIL)
    const land = at(LAND)
    const mid = at(ROLLS[3])
    const rest = him(END)
    // How far ahead of him the frame leans at the flash: to halfway between him and the truck's front.
    const lead = (truckX(FLASH) - seatX(FLASH)) / 2 - 0.3
    return [
      // In the seat as the door slams; away over the curb, the frame opening round him as he gathers speed.
      { t: slot.begin, cells: 4.4, off: [0.9, -0.6] },
      { t: CURB_F, cells: 5.0, off: [1.2, -0.9] },
      { t: LAMP_T[3], cells: 5.8, off: [1.0, -1.3] },
      // Low and close on him at the wheel at speed, the lamps whipping over him and lighting as they pass; then
      // back, wide, the road lit behind him and dark ahead.
      { t: LAMP_T[6], cells: 2.9, off: [0.25, -0.3] },
      { t: LAMP_T[11], cells: 3.1, off: [0.3, -0.35] },
      // Out over the river: wide, low, the lamps doubled in the water.
      { t: LAMP_T[16], cells: 8.8, off: [0.3, 0.15] },
      { t: LAMP_T[19], cells: 8.8, off: [0.5, 0.05] },
      { t: LAMP_T[23], cells: 7.2, off: [-0.4, -1.8] },
      { t: LAMP_T[28], cells: 7.6, off: [0.8, -1.9] },
      // Leaning ahead into the dark road; then up and back, long and high, to hold both of them as the truck's high
      // beams flash far ahead: the car small on the left under its lamps, the truck coming on the right; and in as
      // they close, still on the crossing for the hit; then with the car through its slow turn in the air.
      { t: LAMP_T[33], cells: 9.6, off: [4.2, -2.6] },
      { t: FLASH, cells: 18, off: [lead, -4.6] },
      { t: IMPACT, cells: 9.6, hold: [hit[0] - 1.0, ROAD_Y - 2.5], w: 1 },
      { t: TAIL + 0.5, cells: 9.8, hold: [tail[0] - 2.8, ROAD_Y - 2.9], w: 1 },
      { t: LAND, cells: 10.2, hold: [land[0] - 3.0, ROAD_Y - 2.6], w: 1 },
      { t: ROLLS[3], cells: 10.4, hold: [mid[0] - 2.5, ROAD_Y - 2.5], w: 1 },
      { t: POST_T + 0.4, cells: 8.6, hold: [WRECK.x - 1.2, ROAD_Y - 2.2], w: 1 },
      // The dark closing in on the wreck; in on him as he comes out, and with him to where he stops.
      { t: DROP, cells: 5.4, hold: [WRECK.x - 0.9, ROAD_Y - 1.2], w: 1 },
      { t: OUT + 0.4, cells: 4.8, hold: [WRECK.x - 1.9, ROAD_Y - 0.9], w: 1 },
      { t: ON + 0.8, cells: 4.0, hold: [REST_X + 1.2, ROAD_Y - 0.6], w: 1 },
      { t: END - 0.6, cells: 3.6, hold: [rest[0], rest[1]], w: 1 },
      { t: END, cells: 3.5, hold: [rest[0], rest[1]], w: 1 },
    ]
  },
)
