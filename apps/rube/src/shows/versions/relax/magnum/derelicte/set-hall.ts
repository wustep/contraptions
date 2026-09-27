import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { beam, bloom, pool, rgba } from '../cast'
import { hash, smooth, type frame } from '../kit'
import { level } from '../music'
import { DERELICTE } from '../worlds'
import { FLOOR_Y, PM_SEAT, RUNWAY } from './geo'
import { AIR, bankAt, derekAt, FOLLOW_ON, followAt, houseAt, powerAt, TRIGGER, worksAt } from './runway-clock'

/**
 * The warehouse (the runway builder's): brick to a roof of steel trusses, tall dark windows, oil-drum fires behind the
 * runway and in the corners, the spots on the trusses and their light. Drawn in the runway's frame, from show time.
 */

type Frame = ReturnType<typeof frame>
export interface Ink {
  ink: string
  weight: number
}

/** The hall: its ends, its floor, its roof. */
export const HALL = { x0: -10, x1: 36, floor: FLOOR_Y, top: -13 }
/** The trusses' chords, and where the lamps hang. */
export const TRUSS = { low: -9.55, high: -11.1, bay: 1.5 }
const LAMP_Y = TRUSS.low + 0.34

/** The back wall's brick in the dark, and lit. */
const WALL = mixHex(DERELICTE.brick, DERELICTE.roof, 0.79)
const WALL_LOW = mixHex(DERELICTE.brickDark, DERELICTE.roof, 0.62)
const PIER = mixHex(DERELICTE.brick, DERELICTE.roof, 0.7)
const MORTAR = mixHex(DERELICTE.brickDark, DERELICTE.roof, 0.8)

/* ------------------------------------------------------------------ lamps */

export interface Lamp {
  at: Pt
  aim: (t: number) => Pt
  on: (t: number) => number
  big?: boolean
}
/** Each bank: two lamps, crossing their beams on the runway. */
export const BANK_X = [3.2, 8.2, 13.2, 18.2]
const TOP = RUNWAY.top
export const LAMPS: Lamp[] = [
  ...BANK_X.flatMap((x, i): Lamp[] => [
    { at: [x - 0.55, LAMP_Y], aim: () => [x + 1.25, TOP], on: (t) => bankAt(i, t) },
    { at: [x + 0.55, LAMP_Y], aim: () => [x - 1.25, TOP], on: (t) => bankAt(i, t) },
  ]),
  // The follow spot: his light, from the moment he comes out.
  { at: [13.0, LAMP_Y + 0.05], aim: (t) => { const f = followAt(t); return [f.at[0], f.at[1] + 0.13] }, on: (t) => followAt(t).on, big: true },
  // The front row's: the Prime Minister in a soft light all night.
  { at: [24.7, LAMP_Y], aim: () => [PM_SEAT[0], PM_SEAT[1] + 0.3], on: (t) => 0.55 * powerAt(t) },
]
/** Mugatu's own lamp on his gantry's rail: it snaps onto Derek on the title, and holds him to the curtain. */
export const MUGATU_LAMP: Lamp = {
  at: [-0.72, -3.42],
  aim: (t) => {
    const d = t < FOLLOW_ON ? derekAt(t) : followAt(t).at
    return [d[0], d[1] + 0.13]
  },
  // Snapped on at the title; once the follow spot has him, kept on him down the whole runway, dimmer; off at its end.
  on: (t) => (t < TRIGGER ? 0 : (1 + 1.2 * Math.exp(-(t - TRIGGER) / 0.12)) * (1 - 0.5 * smooth(t, FOLLOW_ON, FOLLOW_ON + 0.8)) * (1 - smooth(t, 154.3, 155.4)) * powerAt(t)),
}

/* ------------------------------------------------------------------ the fires */

/** Oil drums with fires in them: behind the runway (on pallets, their flames over its deck), and in the corners. */
export const DRUMS: { x: number; base: number }[] = [
  { x: -5.6, base: FLOOR_Y },
  { x: 4.9, base: FLOOR_Y - 0.62 },
  { x: 10.7, base: FLOOR_Y - 0.62 },
  { x: 16.4, base: FLOOR_Y - 0.62 },
  { x: 32.6, base: FLOOR_Y },
]
const DRUM_W = 0.72
const DRUM_H = 1.05

/** A drum's flame at world-clock `tw`: tongues of fire, soft (air, not ink). */
function drawFire(p: p5, k: number, x: number, y: number, tw: number, seed: number, a = 1): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The glow on the wall and the air round it.
  const flick = 0.85 + 0.15 * Math.sin(tw * 11 + seed) * Math.sin(tw * 7.3 + seed * 2)
  bloom(p, k, [x, y - 0.9], 3.0, DERELICTE.fire, 0.13 * flick * a)
  bloom(p, k, [x, y - 0.3], 0.9, DERELICTE.fireCore, 0.16 * flick * a)
  ctx.save()
  for (let i = 0; i < 4; i++) {
    const ph = tw * (2.6 + i * 0.55) + seed * 3 + i * 1.9
    const h = (0.5 + 0.35 * hash(i, seed, 3)) * (0.8 + 0.2 * Math.sin(ph)) * (i === 1 || i === 2 ? 1.05 : 0.7)
    const cx = x + (i - 1.5) * 0.13 + 0.04 * Math.sin(ph * 1.3)
    const w = 0.16 + 0.05 * hash(i, seed, 4)
    const tip = cx + 0.1 * Math.sin(ph * 0.7 + 1)
    const g = ctx.createLinearGradient(0, y * k, 0, (y - h) * k)
    const outer = i === 0 || i === 3
    g.addColorStop(0, rgba(outer ? DERELICTE.fire : DERELICTE.fireCore, 0.62 * a))
    g.addColorStop(0.5, rgba(DERELICTE.fire, 0.34 * a))
    g.addColorStop(1, rgba(DERELICTE.fire, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((cx - w) * k, y * k)
    ctx.bezierCurveTo((cx - w) * k, (y - h * 0.45) * k, (tip - w * 0.2) * k, (y - h * 0.7) * k, tip * k, (y - h) * k)
    ctx.bezierCurveTo((tip + w * 0.2) * k, (y - h * 0.7) * k, (cx + w) * k, (y - h * 0.45) * k, (cx + w) * k, y * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** Smoke off a fire: slow soft puffs rising and spreading, drifting right. */
function drawSmoke(p: p5, k: number, x: number, y: number, tw: number, seed: number): void {
  for (let i = 0; i < 4; i++) {
    const life = 7
    const u = (((tw + i * (life / 4) + seed * 1.7) % life) + life) % life / life
    const px = x + 0.7 * u + 0.25 * Math.sin(u * 5 + seed + i)
    const py = y - 0.6 - 5.2 * u
    const r = 0.4 + 1.3 * u
    const a = 0.07 * Math.sin(Math.PI * u)
    bloom(p, k, [px, py], r, DERELICTE.paperShade, a)
  }
}

function drawDrum(p: p5, k: number, x: number, base: number, ink: Ink): void {
  const X = (v: number) => v * k
  const y0 = base - DRUM_H
  // A pallet under the raised ones.
  if (base < FLOOR_Y - 0.1) {
    solid(p, ink.ink, ink.weight * 0.5, mixHex(DERELICTE.cardboard, DERELICTE.roof, 0.62))
    p.rect(X(x), X((base + FLOOR_Y) / 2), X(DRUM_W + 0.5), X(FLOOR_Y - base))
  }
  solid(p, ink.ink, ink.weight * 0.7, mixHex(DERELICTE.rust, DERELICTE.roof, 0.35))
  p.rect(X(x), X(y0 + DRUM_H / 2), X(DRUM_W), X(DRUM_H), X(0.04))
  // Its ribs, and the fire's light on its rim.
  p.stroke(mixHex(DERELICTE.rust, DERELICTE.roof, 0.6))
  p.strokeWeight(Math.max(1, X(0.035)))
  for (const f of [0.33, 0.66]) p.line(X(x - DRUM_W / 2 + 0.02), X(y0 + DRUM_H * f), X(x + DRUM_W / 2 - 0.02), X(y0 + DRUM_H * f))
  p.stroke(rgba(DERELICTE.fire, 0.8))
  p.strokeWeight(Math.max(1, X(0.03)))
  p.line(X(x - DRUM_W / 2), X(y0 + 0.02), X(x + DRUM_W / 2), X(y0 + 0.02))
}

/* ------------------------------------------------------------------ drawing */

/** The back wall: brick in the dark, piers, tall windows high up, the soot band low down, and the roof's dark. */
function drawWall(p: p5, k: number, f: Frame, t: number): void {
  const X = (v: number) => v * k
  const x0 = Math.max(HALL.x0, f.x0 - 1)
  const x1 = Math.min(HALL.x1, f.x1 + 1)
  const y0 = Math.max(HALL.top, f.y0 - 1)
  const y1 = Math.min(HALL.floor, f.y1 + 1)
  if (x1 <= x0 || y1 <= y0) return
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(WALL)
  p.rect(X(x0), X(y0), X(x1 - x0), X(y1 - y0))
  // The soot band along the bottom.
  const soot = -1.4
  if (y1 > soot) {
    p.fill(WALL_LOW)
    p.rect(X(x0), X(Math.max(y0, soot)), X(x1 - x0), X(y1 - Math.max(y0, soot)))
  }
  // Coursing, only where it can be seen as brick (not as noise).
  const course = 0.3
  const px = course * k
  if (px > 6) {
    const a = Math.min(0.35, (px - 6) / 18)
    p.stroke(rgba(MORTAR, a))
    p.strokeWeight(Math.max(1, X(0.02)))
    const j0 = Math.ceil(y0 / course)
    const j1 = Math.floor(y1 / course)
    for (let j = j0; j <= j1; j++) p.line(X(x0), X(j * course), X(x1), X(j * course))
    if (px > 12) {
      for (let j = j0; j < j1; j++) {
        const off = j % 2 === 0 ? 0 : 0.3
        for (let x = Math.floor((x0 - off) / 0.6) * 0.6 + off; x < x1; x += 0.6) p.line(X(x), X(j * course), X(x), X((j + 1) * course))
      }
    }
  }
  // Piers every six cells, and between them the windows high up.
  for (let i = Math.floor(x0 / 6) - 1; i <= Math.ceil(x1 / 6) + 1; i++) {
    const cx = i * 6 + 1
    if (cx + 0.5 >= x0 && cx - 0.5 <= x1) {
      p.noStroke()
      p.fill(PIER)
      p.rect(X(cx - 0.38), X(y0), X(0.76), X(y1 - y0))
    }
    drawWindow(p, k, cx + 3, f)
  }
  // The roof's dark comes down over the top of the wall.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(-13), 0, X(-5.5))
  g.addColorStop(0, rgba(DERELICTE.roof, 1))
  g.addColorStop(0.55, rgba(DERELICTE.roof, 0.75))
  g.addColorStop(1, rgba(DERELICTE.roof, 0))
  ctx.fillStyle = g
  ctx.fillRect(X(x0), X(Math.max(y0, -13)), X(x1 - x0), X(Math.max(0, Math.min(y1, -5.5) - Math.max(y0, -13))))
  p.pop()
  // The runway's light thrown back on the brick behind it, bank by bank; and the follow spot's.
  BANK_X.forEach((bx, i) => {
    const on = Math.min(1, bankAt(i, t))
    if (on > 0 && bx + 5 > x0 && bx - 5 < x1) bloom(p, k, [bx, -0.9], 3.6, DERELICTE.spot, 0.075 * on)
  })
  const fo = followAt(t)
  if (fo.on > 0) bloom(p, k, [fo.at[0], fo.at[1] - 0.9], 1.9, DERELICTE.spot, 0.1 * Math.min(1.3, fo.on))
  // The house's light on the wall (the audience's wash), dimming on the needle.
  const house = houseAt(t)
  if (house > 0.3) for (let x = Math.floor(x0 / 7) * 7; x < x1 + 7; x += 7) bloom(p, k, [x + 3.5, -1.2], 5, DERELICTE.spot, 0.05 * house)
}

/** A tall industrial window, arched, its panes dark with a little sheen. */
function drawWindow(p: p5, k: number, cx: number, f: Frame): void {
  const X = (v: number) => v * k
  const w = 2.1
  const y0 = -8.4
  const y1 = -3.6
  if (cx + w < f.x0 || cx - w > f.x1 || y1 < f.y0 || y0 - 1.2 > f.y1) return
  p.push()
  p.rectMode(p.CENTER)
  p.noStroke()
  p.fill(mixHex(DERELICTE.brickDark, DERELICTE.roof, 0.3))
  p.rect(X(cx), X((y0 + y1) / 2 + 0.05), X(w + 0.3), X(y1 - y0 + 0.25))
  p.arc(X(cx), X(y0), X(w + 0.3), X(1.5), Math.PI, 0)
  p.fill(mixHex(DERELICTE.roof, DERELICTE.steelDark, 0.25))
  p.rect(X(cx), X((y0 + y1) / 2), X(w), X(y1 - y0))
  p.arc(X(cx), X(y0), X(w), X(1.3), Math.PI, 0)
  // A faint cold sheen across the glass.
  p.fill(rgba(DERELICTE.paper, 0.045))
  p.quad(X(cx - w / 2), X(y0 + 1.6), X(cx + w / 2), X(y0 + 0.3), X(cx + w / 2), X(y0 + 1.3), X(cx - w / 2), X(y0 + 2.6))
  // Muntins.
  p.stroke(mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.35))
  p.strokeWeight(Math.max(1, X(0.05)))
  for (let i = 1; i < 4; i++) p.line(X(cx - w / 2 + (w * i) / 4), X(y0 - 0.55 * Math.sqrt(Math.max(0, 1 - ((i / 4 - 0.5) * 2) ** 2))), X(cx - w / 2 + (w * i) / 4), X(y1))
  for (let j = 0; j <= 5; j++) p.line(X(cx - w / 2), X(y0 + (j * (y1 - y0)) / 5), X(cx + w / 2), X(y0 + (j * (y1 - y0)) / 5))
  p.pop()
}

/** A little night through the high windows: faint cold shafts, felt only when the show's lights are out. */
export function drawWindowSpill(p: p5, k: number, f: Frame, t: number): void {
  const a = 0.035 + 0.05 * (1 - powerAt(t)) * (1 - 0.6 * Math.min(1, worksAt(t)))
  for (let i = Math.floor(f.x0 / 6) - 2; i <= Math.ceil(f.x1 / 6) + 1; i++) {
    const cx = i * 6 + 4
    if (cx < HALL.x0 || cx > HALL.x1) continue
    beam(p, k, [cx, -6.2], [cx + 3.2, FLOOR_Y], 1.7, 2.6, DERELICTE.star, a)
  }
}

/** The work lamps: big flat floods on the trusses, dark all show, the house lights after it. */
export const WORKS_X = [-3, 5, 13, 21, 29]
export function drawWorks(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  const on = Math.min(1, worksAt(t))
  for (const x of WORKS_X) {
    if (x < f.x0 - 3 || x > f.x1 + 3) continue
    p.push()
    solid(p, ink.ink, ink.weight * 0.5, DERELICTE.booth)
    p.rectMode(p.CENTER)
    p.rect(X(x), X(TRUSS.low + 0.3), X(1.1), X(0.32), X(0.04))
    p.noStroke()
    p.fill(mixHex(DERELICTE.booth, DERELICTE.star, 0.12 + 0.85 * on))
    p.rect(X(x), X(TRUSS.low + 0.47), X(0.96), X(0.06))
    p.pop()
    if (on > 0.01) {
      bloom(p, k, [x, TRUSS.low + 0.5], 1.2, DERELICTE.star, 0.4 * on)
      beam(p, k, [x, TRUSS.low + 0.5], [x, FLOOR_Y], 1.0, 7.5, DERELICTE.star, 0.08 * on)
      // Flat cold light on the runway's deck and the floor under it.
      pool(p, k, [x + 0.5, 0.15], 3.6, 0.2, DERELICTE.star, 0.18 * on)
      pool(p, k, [x + 1, FLOOR_Y + 0.02], 4.2, 0.22, DERELICTE.star, 0.2 * on)
    }
  }
}

/** The trusses along the roof, and the lamps hanging off them (their bodies; the light is drawn with the beams). */
function drawTrusses(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  if (f.y0 > TRUSS.low + 1.2) return
  const x0 = Math.max(HALL.x0, f.x0 - 2)
  const x1 = Math.min(HALL.x1, f.x1 + 2)
  const steel = mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.35)
  p.push()
  p.stroke(steel)
  p.strokeWeight(Math.max(1.2, X(0.11)))
  p.line(X(x0), X(TRUSS.low), X(x1), X(TRUSS.low))
  p.line(X(x0), X(TRUSS.high), X(x1), X(TRUSS.high))
  p.strokeWeight(Math.max(1, X(0.06)))
  for (let i = Math.floor(x0 / TRUSS.bay); i <= Math.ceil(x1 / TRUSS.bay); i++) {
    const x = i * TRUSS.bay
    p.line(X(x), X(TRUSS.low), X(x), X(TRUSS.high))
    p.line(X(x), X(TRUSS.low), X(x + TRUSS.bay), X(TRUSS.high))
  }
  // Their undersides rimmed by the light below.
  p.stroke(rgba(DERELICTE.spot, 0.12))
  p.strokeWeight(Math.max(1, X(0.03)))
  p.line(X(x0), X(TRUSS.low + 0.05), X(x1), X(TRUSS.low + 0.05))
  p.pop()
  for (const lamp of LAMPS) {
    if (lamp.at[0] < f.x0 - 1 || lamp.at[0] > f.x1 + 1) continue
    drawLampBody(p, k, lamp, t, ink)
  }
  drawWorks(p, k, f, t, ink)
}

function drawLampBody(p: p5, k: number, lamp: Lamp, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  const [x, y] = lamp.at
  const [ax, ay] = lamp.aim(t)
  const ang = Math.atan2(ay - y, ax - x)
  const len = lamp.big ? 0.78 : 0.6
  const wid = lamp.big ? 0.34 : 0.27
  p.push()
  // The yoke up to the chord.
  p.stroke(mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.2))
  p.strokeWeight(Math.max(1, X(0.05)))
  p.line(X(x), X(TRUSS.low), X(x), X(y))
  p.translate(X(x), X(y))
  p.rotate(ang)
  solid(p, ink.ink, ink.weight * 0.6, DERELICTE.booth)
  p.rect(X(len * 0.2), 0, X(len), X(wid), X(0.04))
  // Its lens, lit when it is on.
  const on = Math.min(1, lamp.on(t))
  p.noStroke()
  p.fill(mixHex(DERELICTE.booth, DERELICTE.spot, 0.15 + 0.8 * on))
  p.rect(X(len * 0.7), 0, X(0.05), X(wid * 0.8))
  p.pop()
}

/** The light: the beams through the air from every lamp that is on, and their pools. */
export function drawLight(p: p5, k: number, f: Frame, t: number): void {
  for (const lamp of [...LAMPS, MUGATU_LAMP]) {
    const on = lamp.on(t)
    if (on <= 0.01) continue
    const aim = lamp.aim(t)
    const lx = lamp.at[0] + Math.cos(Math.atan2(aim[1] - lamp.at[1], aim[0] - lamp.at[0])) * 0.72
    const ly = lamp.at[1] + Math.sin(Math.atan2(aim[1] - lamp.at[1], aim[0] - lamp.at[0])) * 0.72
    const minX = Math.min(lx, aim[0]) - 1.5
    const maxX = Math.max(lx, aim[0]) + 1.5
    if (maxX < f.x0 || minX > f.x1) continue
    const big = !!lamp.big
    const near = lamp === MUGATU_LAMP
    beam(p, k, [lx, ly], aim, big || near ? 0.2 : 0.18, big ? 0.8 : near ? 0.55 : 0.85, DERELICTE.spot, (big ? 0.3 : near ? 0.3 : 0.095) * Math.min(1.6, on))
    pool(p, k, aim, big ? 0.62 : near ? 0.45 : 1.0, big ? 0.16 : 0.12, DERELICTE.spot, (big ? 0.5 : near ? 0.55 : 0.28) * Math.min(1.6, on))
    // The follow spot's own pool: a hard bright core round him, big enough to find him in a wide.
    if (big) {
      pool(p, k, aim, 0.42, 0.1, DERELICTE.spot, 0.75 * Math.min(1.3, on))
      bloom(p, k, [aim[0], aim[1] - 0.3], 0.95, DERELICTE.spot, 0.2 * Math.min(1.3, on))
    }
    bloom(p, k, [lx, ly], 0.35, DERELICTE.spot, 0.35 * Math.min(1.4, on))
  }
}

export function drawHall(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const tw = AIR(t)
  drawWall(p, k, f, t)
  // The fires' glow on the brick first, then the drums and the flames.
  for (const [i, d] of DRUMS.entries()) {
    if (d.x < f.x0 - 3 || d.x > f.x1 + 3) continue
    drawSmoke(p, k, d.x, d.base - DRUM_H, tw, i)
  }
  drawTrusses(p, k, f, t, ink)
  for (const [i, d] of DRUMS.entries()) {
    if (d.x < f.x0 - 3 || d.x > f.x1 + 3) continue
    drawDrum(p, k, d.x, d.base, ink)
    drawFire(p, k, d.x, d.base - DRUM_H, tw, i + 1, 0.9 + 0.1 * level(t))
  }
}

/** The fires' light again, over the dark the plug leaves: the only warm light in the hall. */
export function drawFireGlow(p: p5, k: number, f: Frame, t: number, a: number): void {
  if (a <= 0.01) return
  const tw = AIR(t)
  for (const [i, d] of DRUMS.entries()) {
    if (d.x < f.x0 - 4 || d.x > f.x1 + 4) continue
    const top = d.base - DRUM_H
    const flick = 0.85 + 0.15 * Math.sin(tw * 11 + i + 1) * Math.sin(tw * 7.3 + (i + 1) * 2)
    bloom(p, k, [d.x, top - 0.9], 3.4, DERELICTE.fire, 0.12 * a * flick)
    drawFire(p, k, d.x, top, tw, i + 1, a)
  }
}

/** The floor's front edge, where the concrete meets the dark in front of it (mostly under the audience). */
export function drawFloor(p: p5, k: number, f: Frame): void {
  const X = (v: number) => v * k
  const x0 = Math.max(HALL.x0, f.x0 - 1)
  const x1 = Math.min(HALL.x1, f.x1 + 1)
  if (f.y1 < HALL.floor) return
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(mixHex(DERELICTE.concreteDark, DERELICTE.roof, 0.55))
  p.rect(X(x0), X(HALL.floor), X(x1 - x0), X(Math.max(0.1, f.y1 + 1 - HALL.floor)))
  p.fill(mixHex(DERELICTE.concrete, DERELICTE.concreteDark, 0.45))
  p.rect(X(x0), X(HALL.floor), X(x1 - x0), X(0.05))
  p.pop()
  // Where the light falls on it: round the front row.
  pool(p, k, [PM_SEAT[0] - 0.8, HALL.floor + 0.02], 2.6, 0.18, DERELICTE.spot, 0.2)
}
