import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, smooth } from '../kit'
import { drawLantern, flame, glow } from '../lantern'
import { hollow, slab } from '../rock'
import { dawn, skyline } from '../mountain'
import type { Pen } from '../troll'
import { LAMP, SKY, STONE, WORKS } from '../worlds'
import {
  CHAMBER,
  CHANNEL,
  DOOR,
  DRAIN,
  LANDING,
  LANDING_HITS,
  LINTEL,
  LIP,
  MOUTH,
  P1,
  P2,
  PAN,
  PEBBLE_R,
  PIT,
  PULLEY_R,
  RUN_Y,
  SLOT,
  TIMES,
  TREAD_HITS,
  TREADS,
  WORKS_LAMP,
  FLAME,
  flameFront,
  panJolt,
  pawlLift,
  SLOT_LAMP,
  slotLamp,
  ring,
  worksLamp,
} from './gate-motion'

/**
 * The gate's set, in world cells: the west flank's turf, the trolls' stair up to the gate, the mouth in the cliff's
 * foot with its lintel and its sinking door, and under the path (the mountain cut open) the works: the chamber where
 * the counterweight's pan hangs over its pit, the chain along its channel under the stair, the pulley under the door.
 * Outside is lit by the summer night's sky; inside is dark until the pebble's spark lights the works' lamp.
 */

/* ------------------------------------------------------------------ colours */

const nightMix = (hex: string, t: number, f = 0.3): string => mixHex(hex, SKY.night, f * (1 - dawn(t)))

/* ------------------------------------------------------------------ the flank */

/** The west flank's skin of turf, from the far west up to the cliff (the director's `drawTurf` does the rest). */
export function drawFlank(p: p5, c: Pen, t: number): void {
  const { k } = c
  const f = frame(p, k)
  const x0 = Math.max(-40, f.x0 - 1)
  const x1 = Math.min(19.86, f.x1 + 1)
  if (x1 <= x0) return
  const d = dawn(t)
  const step = Math.max(0.2, (f.x1 - f.x0) / 180)
  const grass = mixHex(mixHex(SKY.grass, SKY.night, 0.72), SKY.grass, d)
  const earth = mixHex(mixHex(WORKS.wood, STONE.deep, 0.55), mixHex(WORKS.wood, STONE.deep, 0.25), d)
  const thick = 0.17
  p.push()
  p.noStroke()
  for (const [col, depth] of [[earth, thick + 0.16], [grass, thick]] as const) {
    p.fill(col)
    p.beginShape()
    for (let x = x0; x <= x1 + step; x += step) {
      const X = Math.min(x, x1)
      p.vertex(X * k, skyline(X) * k)
    }
    for (let x = x1; x >= x0 - step; x -= step) {
      const X = Math.max(x, x0)
      const ragged = depth * (0.85 + 0.15 * Math.sin(X * 5.3) * Math.sin(X * 1.7))
      p.vertex(X * k, (skyline(X) + ragged) * k)
    }
    p.endShape(p.CLOSE)
  }
  // The rim: the turf's edge catching the sky's light.
  p.noFill()
  const rim = p.color(mixHex(mixHex(SKY.grass, SKY.dusk, 0.6), SKY.dawn, 0.4 * d))
  rim.setAlpha(150)
  p.stroke(rim)
  p.strokeWeight(Math.max(1, 0.04 * k))
  p.beginShape()
  for (let x = x0; x <= x1 + step; x += step) p.vertex(Math.min(x, x1) * k, skyline(Math.min(x, x1)) * k)
  p.endShape()
  // Tufts and heather along the path (none on the stair or in the drain).
  p.noStroke()
  const tuft = mixHex(mixHex(SKY.grass, SKY.night, 0.6), mixHex(SKY.grass, SKY.sun, 0.25), d)
  const heath = mixHex(mixHex(WORKS.rust, SKY.night, 0.7), mixHex(WORKS.rust, SKY.grass, 0.3), d)
  const first = Math.ceil(x0 / 0.5)
  for (let i = first; i * 0.5 <= x1; i++) {
    if (hash(i, 17) < 0.4) continue
    const X = i * 0.5 + 0.35 * hash(i, 18)
    if (X > DRAIN.x0 - 0.15 && X < LANDING.x1) continue
    if (X > x1) continue
    const y = skyline(X) + 0.03
    if (hash(i, 21) < 0.28) {
      // A clump of heather: a low dark mound.
      p.fill(heath)
      const w = 0.2 + 0.12 * hash(i, 22)
      p.beginShape()
      p.vertex((X - w / 2) * k, y * k)
      p.bezierVertex((X - w / 2) * k, (y - 0.1) * k, (X + w / 2) * k, (y - 0.12) * k, (X + w / 2) * k, y * k)
      p.endShape(p.CLOSE)
      continue
    }
    p.fill(tuft)
    const h = 0.08 + 0.1 * hash(i, 19)
    const sway = 0.025 * Math.sin(t * 0.9 + i)
    for (let b = -1; b <= 1; b++) {
      const bx = X + b * 0.045
      p.triangle((bx - 0.022) * k, y * k, (bx + 0.022) * k, y * k, (bx + b * 0.045 + sway) * k, (y - h * (b === 0 ? 1 : 0.7)) * k)
    }
  }
  p.pop()
}

/** A few boulders lying on the flank beyond the path: far, low, darker than the stair. */
const BOULDERS: [number, number, number][] = [
  [-7.2, 0.95, 0.5],
  [2.6, 0.62, 0.33],
  [7.9, 0.8, 0.42],
]

export function drawBoulders(p: p5, c: Pen, t: number): void {
  const { k, ink, weight } = c
  const face = nightMix(mixHex(STONE.dark, STONE.mid, 0.5), t, 0.35)
  const lip = nightMix(STONE.mid, t, 0.3)
  p.push()
  for (const [x, w, h] of BOULDERS) {
    const y = skyline(x) + 0.12
    const pts: Pt[] = []
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI
      const r = 1 + 0.12 * Math.sin(i * 2.3 + x) + 0.06 * Math.sin(i * 5.1 + x)
      pts.push([x + Math.cos(a) * w * 0.5 * r, y + Math.sin(a) * h * r])
    }
    p.stroke(alpha(p, ink, 0.35))
    p.strokeWeight(weight * 0.6)
    p.fill(face)
    p.beginShape()
    for (const [px, py] of pts) p.vertex(px * k, py * k)
    p.endShape(p.CLOSE)
    // The top catches the sky.
    p.noStroke()
    p.fill(lip)
    p.beginShape()
    for (let i = 3; i <= 7; i++) p.vertex(pts[i][0] * k, pts[i][1] * k)
    for (let i = 7; i >= 3; i--) p.vertex(pts[i][0] * k, (pts[i][1] + 0.05 + 0.02 * Math.sin(i)) * k)
    p.endShape(p.CLOSE)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the stair and the landing */

/** One dressed stone of the stair: its top flat (the tread), its body sunk into the slope. */
function stone(p: p5, c: Pen, t: number, x0: number, x1: number, top: number, rung: number, seed: number): void {
  const { k, ink, weight } = c
  const bottom = Math.max(skyline(x0), skyline(x1)) + 0.28
  const face = nightMix(mixHex(STONE.mid, STONE.dark, 0.25 + 0.2 * hash(seed, 3)), t, 0.28)
  const lipCol = mixHex(nightMix(STONE.light, t, 0.3), STONE.wet, 0.75 * rung)
  const r = 0.05
  p.push()
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(weight * 0.65)
  p.fill(face)
  p.beginShape()
  p.vertex(x0 * k, bottom * k)
  p.vertex(x0 * k, (top + r) * k)
  p.quadraticVertex(x0 * k, top * k, (x0 + r) * k, top * k)
  p.vertex((x1 - r) * k, top * k)
  p.quadraticVertex(x1 * k, top * k, x1 * k, (top + r) * k)
  p.vertex(x1 * k, bottom * k)
  p.endShape()
  // The tread's worn lip: moonlit, and bright for a moment when something lands on it.
  p.noStroke()
  p.fill(lipCol)
  p.rectMode(p.CORNER)
  p.rect((x0 + r * 0.6) * k, top * k, (x1 - x0 - r * 1.2) * k, Math.max(1, 0.055 * k))
  // A crack or two in the face, so no two stones are the same.
  p.stroke(alpha(p, ink, 0.22))
  p.strokeWeight(weight * 0.5)
  const cx = x0 + (x1 - x0) * (0.25 + 0.5 * hash(seed, 5))
  p.line(cx * k, (top + 0.08) * k, (cx + 0.06 * (hash(seed, 6) - 0.5)) * k, (top + 0.2) * k)
  p.pop()
}

export function drawStair(p: p5, c: Pen, t: number): void {
  // Bottom to top, so each stone sits on the one below.
  for (let i = TREADS.length - 1; i >= 0; i--) {
    const s = TREADS[i]
    stone(p, c, t, s.x0, s.x1 + 0.02, s.top, ring(TREAD_HITS[i], t), i + 3)
  }
  // The foot stone at the drain's lip.
  stone(p, c, t, LIP.x0, LIP.x1, LIP.top, ring([TIMES.pebble[5]], t), 11)
  // The landing, running on into the gate's mouth up to the door's slot.
  stone(p, c, t, LANDING.x0, DOOR.x0, LANDING.top, ring(LANDING_HITS, t) * 0.6, 1)
}

/** The drain at the stair's foot: a dark hole in the path, down into the works. */
export function drawDrain(p: p5, c: Pen, lit: number): void {
  const { k } = c
  p.push()
  p.noStroke()
  p.fill(mixHex(STONE.deep, '#000000', 0.35))
  p.beginShape()
  p.vertex(DRAIN.x0 * k, (skyline(DRAIN.x0) - 0.01) * k)
  p.vertex(DRAIN.x1 * k, (skyline(DRAIN.x1) - 0.01) * k)
  p.vertex(DRAIN.x1 * k, CHAMBER.y0 * k)
  p.vertex(DRAIN.x0 * k, CHAMBER.y0 * k)
  p.endShape(p.CLOSE)
  // Once the lamp below is lit, a little of its light comes up the hole.
  if (lit > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const top = Math.min(skyline(DRAIN.x0), skyline(DRAIN.x1))
    const g = ctx.createLinearGradient(0, CHAMBER.y0 * k, 0, top * k)
    g.addColorStop(0, `rgba(247,184,102,${0.22 * lit})`)
    g.addColorStop(1, 'rgba(247,184,102,0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(DRAIN.x0 * k, top * k, (DRAIN.x1 - DRAIN.x0) * k, (CHAMBER.y0 - top) * k)
    ctx.restore()
  }
  p.pop()
}

/* ------------------------------------------------------------------ the gate */

/** The mouth's hollow in the cliff's foot, running on into the mountain: a rough roof, the threshold's floor. */
const MOUTH_PTS: Pt[] = [
  [19.84, MOUTH.floor],
  [19.93, MOUTH.ceil],
  [21.25, MOUTH.ceil],
  [21.45, MOUTH.ceil - 0.3],
  [22.1, MOUTH.ceil - 0.42],
  [MOUTH.x1, MOUTH.ceil - 0.3],
  [MOUTH.x1, MOUTH.floor],
]

/**
 * The mouth behind the door: a hollow in the rock (so the door is seen standing in an opening), dark while the door
 * is shut; as it sinks the night's light comes in over it and lies across the threshold.
 */
export function drawMouth(p: p5, c: Pen, open: number): void {
  const { k } = c
  hollow(p, c, MOUTH_PTS, 0.12 + 0.3 * open)
  if (open > 0.01) {
    // The sky's light through the opening: cool and soft, strongest at the sill, fading into the mountain.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const sky = p.color(mixHex(SKY.dusk, SKY.star, 0.2))
    const rgb = `${p.red(sky)},${p.green(sky)},${p.blue(sky)}`
    const cx = DOOR.x0 * k
    const cy = (MOUTH.floor - 0.3) * k
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 2.8 * k)
    g.addColorStop(0, `rgba(${rgb},${0.3 * open})`)
    g.addColorStop(0.5, `rgba(${rgb},${0.1 * open})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.save()
    ctx.beginPath()
    MOUTH_PTS.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
    ctx.closePath()
    ctx.clip()
    ctx.fillStyle = g
    ctx.fillRect(cx - 3 * k, cy - 3 * k, 6 * k, 6 * k)
    ctx.restore()
  }
  // The threshold inside: a floor of the rock, its lip catching what light there is.
  slab(p, c, DOOR.x1, MOUTH.x1, MOUTH.floor, 0.3, 0.25 + 0.45 * open, 4)
}

/**
 * The lintel over the mouth: the cliff's own rock, dressed square over the door. Only its face and its underside are
 * cut (ink); above and behind, it is the mountain. The cliff is filled out above it so no sky shows over the door.
 */
export function drawLintel(p: p5, c: Pen, t: number): void {
  const { k, ink, weight } = c
  const { x0, x1, y1 } = LINTEL
  p.push()
  // The rock above the mouth, out to the cliff's face: made good up to where it meets its own slope, its face broken
  // into ledges and bulges (a cliff, not a straight cut against the sky).
  const cliff: Pt[] = [
    [x0, y1],
    [x0 - 0.05, y1 - 0.35],
    [x0 + 0.04, y1 - 0.62],
    [x0 - 0.06, y1 - 1.0],
    [x0 + 0.05, y1 - 1.3],
    [x0 + 0.01, y1 - 1.75],
    [x0 + 0.13, y1 - 2.05],
    [20.07, -9.0],
    [20.3, -9.0],
    [20.3, y1],
  ]
  p.noStroke()
  p.fill(c.bg)
  p.beginShape()
  for (const [x, y] of cliff) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  // The lintel: the cliff's own rock over the door, only its underside cut, a shade lighter where the door grinds.
  p.noFill()
  p.stroke(alpha(p, mixHex(ink, STONE.deep, 0.55), 0.8))
  p.strokeWeight(weight * 0.8)
  p.beginShape()
  p.vertex(x0 * k, (y1 - 0.08) * k)
  p.quadraticVertex(x0 * k, y1 * k, (x0 + 0.06) * k, y1 * k)
  p.vertex((x0 + (x1 - x0) * 0.5) * k, (y1 + 0.02) * k)
  p.vertex(x1 * k, (y1 - 0.02) * k)
  p.endShape()
  p.noStroke()
  p.fill(nightMix(mixHex(STONE.dark, STONE.mid, 0.5), t, 0.25))
  p.rectMode(p.CORNER)
  p.rect((x0 + 0.06) * k, (y1 - 0.05) * k, (DOOR_FACE - x0) * k, Math.max(1, 0.045 * k))
  p.pop()
}

/** The door's east face (drawn): the slab is thick, its bulk east of the slot's line into the mouth. */
const DOOR_FACE = 20.98

/** The rack's teeth on the door's west face: a notch a click. */
export const TOOTH = DOOR.travel / TIMES.clicks.length
/** Where the pawl bites, just under the landing's lip on the slot's west wall. */
const PAWL: Pt = [19.9, -3.66]
const BITE_Y = -3.8

/**
 * The door: a great slab of stone in the mouth, bound in iron, sinking into its slot a notch a click. `drop` is how
 * far it has gone down; `knock` shakes it (her knock).
 */
export function drawDoor(p: p5, c: Pen, t: number, drop: number, knock: number): void {
  const { k, ink, weight } = c
  // A great slab of rough stone, thick as a troll is broad (seen edge-on in the cliff it is still a wall, not a post):
  // its west face on the slot's line, its bulk east into the mouth.
  const x0 = DOOR.x0 + knock
  const x1 = DOOR_FACE + knock
  const top = MOUTH.ceil + drop
  const bottom = MOUTH.floor + drop
  const face = nightMix(mixHex(STONE.mid, STONE.dark, 0.35), t, 0.22)
  const edge = mixHex(ink, STONE.deep, 0.7)
  p.push()
  p.rectMode(p.CORNER)
  // The slab, its edges a little broken.
  p.stroke(edge)
  p.strokeWeight(weight * 0.8)
  p.fill(face)
  p.beginShape()
  p.vertex(x0 * k, bottom * k)
  p.vertex(x0 * k, (top + 0.1) * k)
  p.vertex((x0 + 0.1) * k, top * k)
  p.vertex((x0 + (x1 - x0) * 0.45) * k, (top + 0.025) * k)
  p.vertex((x1 - 0.12) * k, top * k)
  p.vertex(x1 * k, (top + 0.09) * k)
  p.vertex((x1 - 0.02) * k, ((top + bottom) / 2) * k)
  p.vertex(x1 * k, bottom * k)
  p.endShape(p.CLOSE)
  // The stone's courses: two faint seams across it.
  p.stroke(mixHex(face, STONE.deep, 0.45))
  p.strokeWeight(weight * 0.6)
  for (const v of [0.4, 0.62]) {
    const y = top + (bottom - top) * v
    p.line((x0 + 0.05) * k, y * k, (x0 + (x1 - x0) * 0.55) * k, (y + 0.03) * k)
  }
  // Its top edge, the part that will be the doorstep: worn a little paler.
  p.noStroke()
  p.fill(nightMix(mixHex(STONE.mid, STONE.light, 0.5), t, 0.25))
  p.rect((x0 + 0.08) * k, top * k, (x1 - x0 - 0.18) * k, Math.max(1, 0.045 * k))
  // Two iron straps across it, riveted.
  for (const v of [0.24, 0.78]) {
    const y = top + (bottom - top) * v
    p.stroke(edge)
    p.strokeWeight(weight * 0.6)
    p.fill(nightMix(WORKS.iron, t, 0.2))
    p.rect((x0 - 0.02) * k, (y - 0.07) * k, (x1 - x0 + 0.04) * k, 0.14 * k)
    p.noStroke()
    p.fill(nightMix(WORKS.steel, t, 0.25))
    for (let bx = x0 + 0.1; bx < x1 - 0.05; bx += 0.26) p.rect((bx - 0.02) * k, (y - 0.02) * k, 0.04 * k, 0.04 * k)
  }
  // The rack: iron teeth down its west face, seen only where they go into the slot at the doorstep, the pawl biting.
  p.stroke(edge)
  p.strokeWeight(weight * 0.6)
  p.fill(WORKS.iron)
  const phase = ((BITE_Y - MOUTH.ceil) % TOOTH + TOOTH) % TOOTH
  const from = Math.max(top + 0.08, MOUTH.floor - 0.16)
  if (from < bottom - 0.04) {
    p.beginShape()
    p.vertex(x0 * k, from * k)
    for (let y = top + phase; y < bottom - 0.04; y += TOOTH) {
      if (y < from) continue
      p.vertex((x0 - 0.075) * k, (y - TOOTH * 0.1) * k)
      p.vertex(x0 * k, (y + TOOTH * 0.55) * k)
    }
    p.vertex(x0 * k, (bottom - 0.04) * k)
    p.endShape(p.CLOSE)
  }
  // Below the doorstep it goes down into the rock: the slot is inside the mountain, so what has sunk is not seen.
  p.noStroke()
  p.fill(c.bg)
  p.rect((x0 - 0.12) * k, (MOUTH.floor + 0.015) * k, (x1 - x0 + 0.16) * k, (SLOT.y1 - MOUTH.floor + 0.12) * k)
  // The threshold's rim, over the slab's foot, as the mouth drew it.
  slab(p, c, DOOR.x1, MOUTH.x1, MOUTH.floor, 0.3, 0.25 + 0.45 * Math.min(1, drop / DOOR.travel), 4)
  p.pop()
}

/** The pawl on the slot's lip, riding the rack: lifted as a tooth passes, dropping in on the click. */
export function drawPawl(p: p5, c: Pen, t: number): void {
  const { k, ink, weight } = c
  const lift = pawlLift(t)
  const a = -0.25 - 0.55 * lift
  p.push()
  p.translate(PAWL[0] * k, PAWL[1] * k)
  // Its seat: a notch in the landing's end.
  p.noStroke()
  p.fill(mixHex(STONE.deep, STONE.dark, 0.3))
  p.ellipse(0, 0, 0.16 * k, 0.16 * k)
  p.rotate(a)
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(WORKS.iron)
  p.beginShape()
  p.vertex(-0.04 * k, -0.035 * k)
  p.vertex(0.17 * k, -0.02 * k)
  p.vertex(0.2 * k, 0.03 * k)
  p.vertex(-0.04 * k, 0.035 * k)
  p.endShape(p.CLOSE)
  p.fill(WORKS.steel)
  p.noStroke()
  p.ellipse(0, 0, 0.045 * k, 0.045 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the works */

/** The rock of the works where no light reaches: a hair above the paper, so nothing shows in the night's wide shot. */
const worksFill = (lit: number): string => mixHex(mixHex(STONE.deep, STONE.dark, 0.12), STONE.dark, Math.max(0, Math.min(1, lit)))

/** How lit the works are at x: the lamp's pool in the chamber, and the gutter's fire wherever it has run. */
export function worksLight(t: number, x: number): number {
  const lamp = worksLamp(t) * Math.max(0, 1 - Math.max(0, x - CHAMBER.x1) / 1.6)
  const front = flameFront(t)
  const fire = front === null ? 0 : x <= front + 0.3 ? 0.75 * Math.min(1, (front + 0.3 - x) / 0.6) : 0
  const end = slotLamp(t) * Math.max(0, 1 - Math.abs(x - SLOT_LAMP[0]) / 1.4)
  return Math.min(1, Math.max(lamp, fire, end))
}

/** The hollows of the works: the chamber and its pit, the channel under the stair, the pulley's housing under the slot. */
export function drawWorksHollows(p: p5, c: Pen, t: number): void {
  const { k } = c
  const lamp = worksLamp(t)
  const front = flameFront(t)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  // The channel, and the housing under the door's slot.
  p.fill(worksFill(0))
  p.rect(CHANNEL.x0 * k, CHANNEL.y0 * k, (CHANNEL.x1 - CHANNEL.x0) * k, (CHANNEL.y1 - CHANNEL.y0) * k)
  p.rect((P2[0] - 0.32) * k, SLOT.y1 * k, 1.25 * k, (CHANNEL.y1 - SLOT.y1) * k)
  // Lit where the fire has run: the channel's back wall warms behind it.
  if (front !== null) {
    const x1 = Math.min(CHANNEL.x1, front + 0.2)
    p.fill(worksFill(0.55))
    p.rect(CHANNEL.x0 * k, CHANNEL.y0 * k, Math.max(0, x1 - CHANNEL.x0) * k, (CHANNEL.y1 - CHANNEL.y0) * k)
  }
  const sl = slotLamp(t)
  if (sl > 0.01) {
    p.fill(worksFill(0.7 * sl))
    p.rect((P2[0] - 0.32) * k, SLOT.y1 * k, 1.25 * k, (CHANNEL.y1 - SLOT.y1) * k)
  }
  // The chamber and its pit.
  p.fill(worksFill(lamp))
  p.beginShape()
  p.vertex(CHAMBER.x0 * k, (CHAMBER.y0 + 0.14) * k)
  p.vertex((CHAMBER.x0 + 0.18) * k, CHAMBER.y0 * k)
  p.vertex((CHAMBER.x1 - 0.12) * k, CHAMBER.y0 * k)
  p.vertex(CHAMBER.x1 * k, (CHAMBER.y0 + 0.12) * k)
  p.vertex(CHAMBER.x1 * k, CHAMBER.y1 * k)
  p.vertex(PIT.x1 * k, CHAMBER.y1 * k)
  p.vertex(PIT.x1 * k, PIT.y1 * k)
  p.vertex(PIT.x0 * k, PIT.y1 * k)
  p.vertex(PIT.x0 * k, CHAMBER.y1 * k)
  p.vertex(CHAMBER.x0 * k, CHAMBER.y1 * k)
  p.endShape(p.CLOSE)
  // The pit darkens with depth (the lamp is above it).
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, CHAMBER.y1 * k, 0, PIT.y1 * k)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${0.55 * lamp})`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(PIT.x0 * k, CHAMBER.y1 * k, (PIT.x1 - PIT.x0) * k, (PIT.y1 - CHAMBER.y1) * k)
  ctx.restore()
  // The lamps' pools on the back walls; the fire's glow running along the channel.
  if (lamp > 0.01) glow(p, c, WORKS_LAMP[0] + 0.25, WORKS_LAMP[1] + 1.0, 1.7, 0.45 * lamp)
  if (front !== null && front < FLAME.x1 + 0.2) glow(p, c, front, RUN_Y + 0.1, 0.9, 0.5 * Math.min(1, (t - FLAME.t0) / 0.2))
  if (sl > 0.01) glow(p, c, SLOT_LAMP[0], SLOT_LAMP[1] + 0.25, 1.3, 0.45 * sl)
  p.pop()
}

/** The ink of something in the works: all but gone where it is dark, full where it is lit. */
const worksInk = (c: Pen, l: number): Pen => ({ ...c, ink: mixHex(c.bg, c.ink, 0.12 + 0.88 * l) })

/** A pulley: an iron wheel with three spokes, turned by `turn`. */
function pulley(p: p5, c: Pen, at: Pt, turn: number, lit: number): void {
  const { k, weight } = c
  const iron = mixHex(mixHex(STONE.deep, STONE.dark, 0.4), WORKS.iron, lit)
  const edge = mixHex(STONE.dark, WORKS.steel, lit)
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.stroke(worksInk(c, lit).ink)
  p.strokeWeight(weight * 0.75)
  p.fill(iron)
  p.ellipse(0, 0, 2 * PULLEY_R * k, 2 * PULLEY_R * k)
  p.rotate(turn)
  p.stroke(edge)
  p.strokeWeight(weight * 0.8)
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3
    p.line(0, 0, Math.cos(a) * PULLEY_R * 0.78 * k, Math.sin(a) * PULLEY_R * 0.78 * k)
  }
  p.noStroke()
  p.fill(edge)
  p.ellipse(0, 0, 0.06 * k, 0.06 * k)
  p.pop()
}

/** The chain's path from the pan's ring to the door's foot: up to P1, over it, along the channel, under P2, up. */
function chainPath(ringY: number, footY: number, n: number): Pt[] {
  const pts: Pt[] = []
  const r = PULLEY_R
  pts.push([P1[0] - r, ringY])
  pts.push([P1[0] - r, P1[1]])
  for (let i = 1; i <= n; i++) {
    const a = Math.PI + (i / n) * (Math.PI / 2)
    pts.push([P1[0] + Math.cos(a) * r, P1[1] + Math.sin(a) * r])
  }
  pts.push([P2[0], RUN_Y])
  for (let i = 1; i <= n; i++) {
    const a = Math.PI / 2 - (i / n) * (Math.PI / 2)
    pts.push([P2[0] + Math.cos(a) * r, P2[1] + Math.sin(a) * r])
  }
  pts.push([P2[0] + r, footY])
  return pts
}

/**
 * The chain: heavy iron links, one seen flat and the next edge on, fixed on the chain (counted from the pan's ring),
 * so as the pan sinks they run up over P1, along the channel and down under P2. Dark where the works are dark.
 */
function drawChain(p: p5, c: Pen, t: number, ringY: number, footY: number): void {
  const { k } = c
  const pts = chainPath(ringY, footY, 10)
  const L = 0.12
  p.push()
  let s = 0
  let i = 0
  let next = 0
  for (let j = 1; j < pts.length; j++) {
    const [ax, ay] = pts[j - 1]
    const [bx, by] = pts[j]
    const len = Math.hypot(bx - ax, by - ay)
    const a = Math.atan2(by - ay, bx - ax)
    while (next <= s + len) {
      const u = (next - s) / (len || 1)
      const x = ax + (bx - ax) * u
      const y = ay + (by - ay) * u
      const l = worksLight(t, x)
      if (l < 0.02) {
        i++
        next += L
        continue
      }
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.globalAlpha = Math.min(1, l / 0.25)
      const iron = mixHex(mixHex(STONE.deep, STONE.dark, 0.5), WORKS.iron, l)
      const shine = mixHex(mixHex(STONE.deep, STONE.dark, 0.6), mixHex(WORKS.steel, LAMP.flame, 0.25), l)
      p.push()
      p.translate(x * k, y * k)
      p.rotate(a)
      if (i % 2 === 0) {
        p.noFill()
        p.stroke(iron)
        p.strokeWeight(Math.max(1.5, 0.05 * k))
        p.ellipse(0, 0, L * 1.35 * k, 0.085 * k)
        p.stroke(shine)
        p.strokeWeight(Math.max(1, 0.02 * k))
        p.arc(0, 0, L * 1.35 * k, 0.085 * k, Math.PI * 1.1, Math.PI * 1.9)
      } else {
        p.stroke(iron)
        p.strokeWeight(Math.max(1.5, 0.045 * k))
        p.line(-L * 0.62 * k, 0, L * 0.62 * k, 0)
      }
      p.pop()
      ctx.globalAlpha = 1
      i++
      next += L
    }
    s += len
  }
  p.pop()
}

/** The counterweight: its ring and rod, a shallow iron dish, and under it a great block of stone bound in iron. */
function drawPan(p: p5, c: Pen, ringY: number, lit: number): void {
  const { k, weight } = c
  const pen = worksInk(c, lit)
  const x = PAN.x
  const dish = ringY + (PAN.dish - PAN.ring)
  const half = PAN.w / 2
  const iron = mixHex(mixHex(STONE.deep, STONE.dark, 0.5), WORKS.iron, lit)
  const steel = mixHex(STONE.dark, WORKS.steel, lit)
  const rock = mixHex(mixHex(STONE.deep, STONE.dark, 0.5), STONE.mid, lit)
  p.push()
  p.rectMode(p.CORNER)
  // The rod from the ring to the dish.
  p.stroke(steel)
  p.strokeWeight(Math.max(1.5, 0.035 * k))
  p.line(x * k, ringY * k, x * k, dish * k)
  p.noFill()
  p.ellipse(x * k, ringY * k, 0.09 * k, 0.09 * k)
  // The block under the dish: the weight itself.
  const b0 = dish + 0.12
  const b1 = dish + 0.78
  p.stroke(pen.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(rock)
  p.beginShape()
  p.vertex((x - 0.3) * k, (b0 + 0.03) * k)
  p.vertex((x + 0.29) * k, b0 * k)
  p.vertex((x + 0.32) * k, (b1 - 0.06) * k)
  p.vertex((x + 0.24) * k, b1 * k)
  p.vertex((x - 0.26) * k, (b1 + 0.02) * k)
  p.vertex((x - 0.33) * k, (b1 - 0.12) * k)
  p.endShape(p.CLOSE)
  p.fill(iron)
  p.rect((x - 0.34) * k, (b0 + 0.24) * k, 0.67 * k, 0.1 * k)
  p.stroke(alpha(p, pen.ink, 0.35))
  p.strokeWeight(weight * 0.5)
  p.line((x + 0.08) * k, (b0 + 0.4) * k, (x + 0.15) * k, (b1 - 0.08) * k)
  // The dish: a shallow bowl on top, its rim catching the lamp.
  p.fill(iron)
  p.beginShape()
  p.vertex((x - half) * k, dish * k)
  p.vertex((x + half) * k, dish * k)
  p.vertex((x + half - 0.09) * k, (dish + 0.12) * k)
  p.vertex((x - half + 0.09) * k, (dish + 0.12) * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(mixHex(iron, LAMP.flame, 0.4 * lit))
  p.rect((x - half + 0.02) * k, dish * k, (2 * half - 0.04) * k, Math.max(1, 0.035 * k))
  p.pop()
}

/**
 * The gutter's fire: one continuous ribbon of low flame along the gutter where it has run (tall and bright just
 * behind the front, settling to a low burn), and the running flame at its head.
 */
function drawFire(p: p5, c: Pen, t: number): void {
  const front = flameFront(t)
  if (front === null) return
  const { k } = c
  const y = CHANNEL.y1 - 0.02
  const x0 = FLAME.x0
  const x1 = Math.min(front, FLAME.x1)
  if (x1 <= x0 + 0.02) return
  const height = (x: number) => {
    const age = Math.max(0, front - x)
    const lick = 0.5 + 0.5 * Math.sin(t * 9 + x * 11) * Math.sin(t * 5.3 + x * 4.1)
    return (0.035 + 0.075 * Math.exp(-age / 0.7)) * (0.75 + 0.5 * lick) * Math.min(1, (x1 - x) / 0.08 + 0.3)
  }
  p.push()
  p.noStroke()
  // The embers in the gutter, then the flame's body over them, then its hot inner line.
  p.fill(mixHex(WORKS.rust, LAMP.flame, 0.3))
  p.rectMode(p.CORNER)
  p.rect(x0 * k, (y - 0.02) * k, (x1 - x0) * k, 0.04 * k)
  for (const [col, f, a] of [[LAMP.flame, 1, 0.85], [LAMP.core, 0.45, 0.9]] as const) {
    const cc = p.color(col)
    cc.setAlpha(255 * a)
    p.fill(cc)
    p.beginShape()
    p.vertex(x0 * k, y * k)
    for (let x = x0; x <= x1; x += 0.05) p.vertex(x * k, (y - height(x) * f) * k)
    p.vertex(x1 * k, (y - height(x1) * f) * k)
    p.vertex(x1 * k, y * k)
    p.endShape(p.CLOSE)
  }
  p.pop()
  if (front < FLAME.x1) flame(p, c, front, y, 0.16, t, 7, 1)
}

/** The works in the rock: the lamps, the pulleys, the chain, the pan and its block; the spark that lights the lamp. */
export function drawWorks(p: p5, c: Pen, t: number, drop: number): void {
  const lit = worksLamp(t)
  const ringY = PAN.ring + drop + panJolt(t)
  const footY = MOUTH.floor + drop
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Nothing of the works shows until light reaches it (the pan a shade sooner: the pebble is falling toward it).
  const seen = (v: number, fn: () => void) => {
    if (v <= 0.01) return
    ctx.globalAlpha = Math.min(1, v)
    fn()
    ctx.globalAlpha = 1
  }
  const l1 = worksLight(t, P1[0])
  const l2 = worksLight(t, P2[0])
  seen(l1 / 0.25, () => pulley(p, c, P1, drop / PULLEY_R, l1))
  seen(l2 / 0.25, () => pulley(p, c, P2, -drop / PULLEY_R, l2))
  drawChain(p, c, t, ringY, footY)
  seen(Math.max(0.35 * smooth(t, 14.9, 15.6), lit / 0.3), () => drawPan(p, c, ringY, lit))
  drawFire(p, c, t)
  // The lamps: the works' own, hanging from the chamber's roof (it swings from the jolt), and the one under the door.
  const swing = t > TIMES.pan ? 0.12 * Math.exp(-(t - TIMES.pan) / 1.4) * Math.sin((t - TIMES.pan) * 4.2) : 0
  seen(lit / 0.2, () => drawLantern(p, c, WORKS_LAMP[0], WORKS_LAMP[1], { lit, t, seed: 3, size: 0.34, hang: 0.22, swing }))
  const sl = slotLamp(t)
  const ls = worksLight(t, SLOT_LAMP[0])
  seen(ls / 0.25, () => drawLantern(p, c, SLOT_LAMP[0], SLOT.y1, { lit: sl, t, seed: 5, size: 0.26, hang: 0.08 }))
  drawSparks(p, c, t)
}

/** Flint on iron: a few sparks off the dish as the pebble lands, one of them up into the lamp. */
function drawSparks(p: p5, c: Pen, t: number): void {
  const d = t - TIMES.pan
  if (d < 0 || d > 0.45) return
  const { k } = c
  const x0 = PAN.x - 0.19
  const y0 = PAN.dish - 0.02
  p.push()
  p.noStroke()
  for (let i = 0; i < 7; i++) {
    const life = 0.16 + 0.24 * hash(i, 41)
    if (d > life) continue
    // One flies to the lamp's open bottom; the rest scatter and die.
    const toLamp = i === 0
    const tx = toLamp ? WORKS_LAMP[0] : x0 + (hash(i, 42) - 0.5) * 1.0
    const ty = toLamp ? WORKS_LAMP[1] + 0.5 : y0 - 0.2 - 0.5 * hash(i, 43)
    const u = Math.min(1, d / life)
    const x = x0 + (tx - x0) * u
    const y = y0 + (ty - y0) * u - 0.12 * Math.sin(u * Math.PI)
    const col = p.color(i % 2 ? LAMP.core : LAMP.flame)
    col.setAlpha(255 * (1 - u * u))
    p.fill(col)
    const s = 0.03 * (1 - 0.5 * u)
    p.ellipse(x * k, y * k, s * k, s * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the pebble */

/** The pebble: a small grey chip of flint, angular, turning as it tumbles. Never round, never near ball-sized. */
export function drawPebble(p: p5, c: Pen, t: number, at: Pt, turn: number): void {
  const { k, ink, weight } = c
  const r = PEBBLE_R
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(turn)
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(weight * 0.5)
  p.fill(nightMix(mixHex(STONE.light, STONE.wet, 0.3), t, 0.15))
  p.beginShape()
  const shape = [1.15, 0.95, 1.05, 0.9, 1.1, 0.85]
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2
    p.vertex(Math.cos(a) * r * shape[i] * 1.25 * k, Math.sin(a) * r * shape[i] * 0.95 * k)
  }
  p.endShape(p.CLOSE)
  p.pop()
  void smooth
}
