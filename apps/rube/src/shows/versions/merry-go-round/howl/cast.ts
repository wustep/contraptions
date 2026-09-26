import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../parts'
import { alpha } from './kit'
import { CALCIFER, DIAL, HEEN, HOWL_BIRD, TURNIP, WASTES } from './worlds'

/**
 * The canonical drawings of the show's recurring characters and props (the director's). Every part that shows one
 * of these calls it from here, so Calcifer is one Calcifer and the door is one door everywhere. If one needs
 * something it does not do, say so in your report; do not draw your own.
 *
 * Every function draws in cells about the origin the caller has translated to (`p.translate(x * k, y * k)`), with
 * `k` pixels a cell, `weight` the stage's line weight and `ink` the world's ink, and leaves p5's state as it found
 * it. None of them draws text, rings or dashed lines.
 */

type Wave = (u: number) => number
const wave: Wave = (u) => Math.sin(u) * 0.6 + Math.sin(u * 2.3 + 1.1) * 0.3 + Math.sin(u * 4.1 + 2.3) * 0.1

/* ------------------------------------------------------------------ Calcifer */

export interface CalciferOpts {
  /** Show time, for his flicker. */
  t: number
  /** Height in cells (a fire in the grate is about 0.6; carried, 0.55 × 0.6; roaring, up to 1.4). */
  size?: number
  /** 0 his orange, 1 weak and blue (the water, the plank's last steps). */
  weak?: number
  /** Where he looks: -1 left, 1 right; and up (-1) or down (1). */
  look?: Pt
  /** 0 mouth shut, 1 wide open (a roar, a laugh). */
  mouth?: number
  /** 0 eyes open, 1 shut (asleep, a blink). */
  shut?: number
  /** How far the tongues lean (the wind of a run; -1 left, 1 right). */
  lean?: number
  /** Opacity. */
  light?: number
}

/**
 * Calcifer, the fire demon: a flame with a face. His base sits at the origin (on the log, on Sophie's hands, on
 * the plank's front), and he rises from it: a soft round belly of fire, three tongues that flicker on their own
 * clock, two big eyes and a wide mouth. Uninked, like a flame: the eyes alone have a thin line. Never a disc: the
 * tongues and the face keep him from reading as a ball.
 */
export function drawCalcifer(p: p5, k: number, weight: number, ink: string, o: CalciferOpts): void {
  const h = (o.size ?? 0.6) * k
  const weak = Math.max(0, Math.min(1, o.weak ?? 0))
  const light = o.light ?? 1
  const t = o.t
  const lean = o.lean ?? 0
  if (h < 1 || light <= 0.01) return
  const body = mixHex(CALCIFER.body, CALCIFER.weak, weak)
  const core = mixHex(CALCIFER.core, CALCIFER.weakCore, weak)
  const edge = mixHex(CALCIFER.edge, '#3E5FA8', weak)
  // The silhouette, as a closed curve through points: the belly's half circle, then the three tongues.
  const W = 0.34
  const tip = (i: number, base: number, height: number, x: number): Pt => {
    const s = wave(t * (5.3 + i) + i * 1.7)
    return [(x + 0.05 * s + lean * 0.12 * (1 + i * 0.2)) * h, -(base + height * (0.88 + 0.12 * s)) * h]
  }
  const shape = (scale: number, cx: number, cy: number): Pt[] => {
    const pts: Pt[] = []
    // The belly: from the left, round under, to the right.
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * -Math.PI
      pts.push([Math.cos(a) * W * h, -W * h + Math.sin(-a) * -W * h * 0.95])
    }
    // Up the right side into the tongues and back down the left.
    pts.push([0.33 * h, -0.42 * h])
    pts.push(tip(0, 0.5, 0.32, 0.23))
    pts.push([0.12 * h, -0.62 * h])
    pts.push(tip(1, 0.62, 0.42, 0.02))
    pts.push([-0.1 * h, -0.62 * h])
    pts.push(tip(2, 0.52, 0.3, -0.21))
    pts.push([-0.33 * h, -0.42 * h])
    return pts.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale] as Pt)
  }
  const fillShape = (pts: Pt[], color: string, a: number) => {
    p.fill(alpha(p, color, a * light))
    p.beginShape()
    const n = pts.length
    // Closed Catmull-Rom: repeat the last point first and the first two last.
    p.curveVertex(pts[n - 1][0], pts[n - 1][1])
    for (const q of pts) p.curveVertex(q[0], q[1])
    p.curveVertex(pts[0][0], pts[0][1])
    p.curveVertex(pts[1][0], pts[1][1])
    p.endShape()
  }
  p.push()
  p.noStroke()
  // A soft glow round him, low and wide, so he lights what is near without a bright core of his own.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(0, -0.3 * h, 0, 0, -0.3 * h, 1.6 * h)
  const glow = weak > 0.5 ? '120, 160, 255' : '255, 170, 80'
  g.addColorStop(0, `rgba(${glow}, ${0.28 * light * (1 - 0.5 * weak)})`)
  g.addColorStop(1, `rgba(${glow}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-1.6 * h, -1.9 * h, 3.2 * h, 3.2 * h)
  fillShape(shape(1, 0, -0.3 * h), edge, 1)
  fillShape(shape(0.84, 0, -0.26 * h), body, 1)
  fillShape(shape(0.52, 0, -0.18 * h), core, 0.95)
  // The face.
  const shut = Math.max(0, Math.min(1, o.shut ?? 0))
  const [lx, ly] = o.look ?? [0, 0]
  const ey = -0.36 * h
  for (const s of [-1, 1]) {
    const ex = s * 0.09 * h
    p.stroke(alpha(p, ink, 0.8 * light))
    p.strokeWeight(Math.max(0.6, weight * 0.45))
    p.fill(alpha(p, CALCIFER.eye, light))
    p.ellipse(ex, ey, 0.12 * h, 0.15 * h * (1 - 0.85 * shut))
    if (shut < 0.6) {
      p.noStroke()
      p.fill(alpha(p, CALCIFER.pupil, light))
      p.ellipse(ex + lx * 0.02 * h, ey + ly * 0.025 * h, 0.055 * h, 0.07 * h * (1 - shut))
    }
  }
  const m = Math.max(0, Math.min(1, o.mouth ?? 0.25))
  p.noStroke()
  p.fill(alpha(p, CALCIFER.pupil, 0.85 * light))
  p.arc(0, -0.235 * h, 0.16 * h, (0.03 + 0.12 * m) * h, 0, Math.PI, p.CHORD)
  p.pop()
}

/* ------------------------------------------------------------------ Turnip Head */

export interface TurnipOpts {
  /** Where he is in his hop: 0 on the ground, rising to his top at 0.5, down at 1 (a hop a bar, in 3/4). */
  hop?: number
  /** How high a hop goes, cells. */
  height?: number
  /** Lean, radians (forward is +, to the right). */
  lean?: number
  /** Show time, for the flap of his coat. */
  t: number
  /** Upside down in a bush (1), as she finds him; 0 upright. */
  flip?: number
  light?: number
}

/**
 * Turnip Head, the scarecrow: a turnip for a head (cream, a purple crown, a painted face, and a top hat), a coat on
 * a crossbar for arms, and one pole for a leg that he hops on. The origin is the foot of his pole on the ground;
 * he stands about 1.15 cells tall. A hop lifts all of him; the pole flexes as he lands.
 */
export const TURNIP_TALL = 1.15

export function drawTurnip(p: p5, k: number, weight: number, ink: string, o: TurnipOpts): void {
  const light = o.light ?? 1
  const u = ((o.hop ?? 0) % 1 + 1) % 1
  const up = Math.sin(Math.PI * u) * (o.height ?? 0.35)
  // A squash on landing: the pole bends a little at the start and end of a hop.
  const squash = Math.exp(-u / 0.08) + Math.exp(-(1 - u) / 0.06) * 0.5
  const flip = Math.max(0, Math.min(1, o.flip ?? 0))
  p.push()
  p.translate(0, -up * k)
  p.rotate((o.lean ?? 0) + flip * Math.PI)
  if (flip > 0.5) p.translate(0, TURNIP_TALL * k)
  const w = weight
  // The pole.
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(w * 0.9)
  p.fill(alpha(p, TURNIP.pole, light))
  const bend = squash * 0.05
  p.beginShape()
  p.vertex(-0.025 * k, 0)
  p.quadraticVertex((-0.025 + bend) * k, -0.3 * k, -0.025 * k, -0.62 * k)
  p.vertex(0.025 * k, -0.62 * k)
  p.quadraticVertex((0.025 + bend) * k, -0.3 * k, 0.025 * k, 0)
  p.endShape(p.CLOSE)
  // The coat on its crossbar: a ragged trapezoid, the hem fluttering.
  const flap = Math.sin(o.t * 3.1) * 0.03 + Math.sin(o.t * 7.3) * 0.012
  p.fill(alpha(p, TURNIP.coat, light))
  p.beginShape()
  p.vertex(-0.3 * k, -0.84 * k)
  p.vertex(0.3 * k, -0.84 * k)
  p.vertex(0.2 * k, -0.52 * k)
  p.vertex((0.1 + flap) * k, -0.46 * k)
  p.vertex((0.02 + flap) * k, -0.5 * k)
  p.vertex((-0.08 + flap) * k, -0.45 * k)
  p.vertex(-0.2 * k, -0.52 * k)
  p.endShape(p.CLOSE)
  // The crossbar's ends out of the sleeves, and straw at the cuffs.
  p.strokeWeight(w * 0.8)
  p.line(-0.38 * k, -0.82 * k, -0.3 * k, -0.83 * k)
  p.line(0.3 * k, -0.83 * k, 0.38 * k, -0.82 * k)
  // The turnip: fuller at the top, a root to a point below, a purple crown.
  p.push()
  p.translate(0, -0.99 * k)
  p.strokeWeight(w * 0.85)
  p.fill(alpha(p, TURNIP.turnip, light))
  p.beginShape()
  p.vertex(0, 0.2 * k)
  p.bezierVertex(-0.06 * k, 0.12 * k, -0.15 * k, 0.07 * k, -0.15 * k, -0.02 * k)
  p.bezierVertex(-0.15 * k, -0.11 * k, -0.08 * k, -0.15 * k, 0, -0.15 * k)
  p.bezierVertex(0.08 * k, -0.15 * k, 0.15 * k, -0.11 * k, 0.15 * k, -0.02 * k)
  p.bezierVertex(0.15 * k, 0.07 * k, 0.06 * k, 0.12 * k, 0, 0.2 * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, TURNIP.top, light))
  p.arc(0, -0.08 * k, 0.29 * k, 0.15 * k, Math.PI, 2 * Math.PI, p.CHORD)
  // The painted face: two dots and a smile, in ink.
  p.fill(alpha(p, ink, 0.85 * light))
  p.circle(-0.05 * k, 0.0, 0.028 * k)
  p.circle(0.05 * k, 0.0, 0.028 * k)
  p.noFill()
  p.stroke(alpha(p, ink, 0.85 * light))
  p.strokeWeight(w * 0.55)
  p.arc(0, 0.035 * k, 0.1 * k, 0.05 * k, 0.2, Math.PI - 0.2)
  // The hat: a battered topper, a little askew.
  p.rotate(-0.12)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(w * 0.85)
  p.fill(alpha(p, TURNIP.hat, light))
  p.rectMode(p.CORNER)
  p.rect(-0.1 * k, -0.37 * k, 0.2 * k, 0.24 * k, 0.02 * k)
  p.rect(-0.17 * k, -0.15 * k, 0.34 * k, 0.04 * k, 0.02 * k)
  p.pop()
  p.pop()
}

/* ------------------------------------------------------------------ Heen */

export interface HeenOpts {
  /** Show time, for his gait and his wheeze. */
  t: number
  /** How fast he trots (0 still, 1 a trot); his legs cycle with it. */
  trot?: number
  /** Facing: 1 right, -1 left. */
  face?: 1 | -1
  light?: number
}

/**
 * Heen, Suliman's old dog: long body, short legs, long ears, a low head; the origin is under his middle on the
 * ground. About 0.42 cells long. His wheeze is his ears lifting and his sides heaving, never a puff of text.
 */
export function drawHeen(p: p5, k: number, weight: number, ink: string, o: HeenOpts): void {
  const light = o.light ?? 1
  const trot = o.trot ?? 0
  const ph = o.t * 9
  const heave = 1 + 0.04 * Math.sin(o.t * 2.2)
  p.push()
  p.scale(o.face ?? 1, 1)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight * 0.7)
  // Legs, four, short.
  p.fill(alpha(p, HEEN.coat, light))
  for (const [x, off] of [[-0.14, 0], [-0.09, Math.PI], [0.1, Math.PI], [0.15, 0]] as const) {
    const s = Math.sin(ph + off) * 0.03 * trot
    p.line((x + s) * k, -0.03 * k, (x - s) * k, 0)
  }
  // Body.
  p.ellipse(0, -0.1 * k, 0.4 * k, 0.15 * k * heave)
  // Head, low and forward, with a long ear.
  p.ellipse(0.22 * k, -0.13 * k, 0.15 * k, 0.12 * k)
  p.fill(alpha(p, HEEN.ear, light))
  const ear = 0.05 * Math.sin(o.t * 2.2)
  p.beginShape()
  p.vertex(0.18 * k, -0.17 * k)
  p.bezierVertex(0.13 * k, (-0.12 + ear) * k, 0.13 * k, (-0.05 + ear) * k, 0.17 * k, (-0.04 + ear) * k)
  p.bezierVertex(0.2 * k, -0.07 * k, 0.21 * k, -0.13 * k, 0.2 * k, -0.17 * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, HEEN.nose, light))
  p.circle(0.3 * k, -0.12 * k, 0.03 * k)
  p.circle(0.24 * k, -0.15 * k, 0.018 * k)
  // Tail.
  p.noFill()
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight * 0.6)
  p.bezier(-0.2 * k, -0.13 * k, -0.25 * k, -0.18 * k, -0.28 * k, -0.2 * k, -0.27 * k, -0.24 * k)
  p.pop()
}

/* ------------------------------------------------------------------ Howl's wings */

export interface WingsOpts {
  /** Show time. */
  t: number
  /** 0 folded away (not drawn), 1 fully out. */
  spread: number
  /** Where the flap is, radians of a wingbeat (one beat ~ a bar); leave out for a glide. */
  flap?: number
  /** The way he flies, radians (0 right). */
  heading?: number
  light?: number
}

/**
 * Howl as the bird: two great dark wings and a fan of tail feathers round his ball, drawn under him (call it from
 * your part's `draw`; the stage draws his ball, HOWL_BIRD while he is the bird, on top as the body). Feathers are
 * long pointed blades, layered, with a lighter edge; about 1.3 cells tip to tip at full spread.
 */
export function drawWings(p: p5, k: number, weight: number, ink: string, o: WingsOpts): void {
  const s = Math.max(0, Math.min(1, o.spread))
  if (s <= 0.01) return
  const light = o.light ?? 1
  const beat = o.flap === undefined ? 0.15 : Math.sin(o.flap)
  const edge = mixHex(HOWL_BIRD, '#6F6A86', 0.5)
  p.push()
  p.rotate(o.heading ?? 0)
  p.stroke(alpha(p, ink, 0.9 * light))
  p.strokeWeight(weight * 0.55)
  // The tail: five feathers fanned behind.
  for (let i = -2; i <= 2; i++) {
    p.push()
    p.rotate(Math.PI + i * 0.16 * s)
    p.fill(alpha(p, i % 2 ? edge : HOWL_BIRD, light))
    p.beginShape()
    p.vertex(0.06 * k, -0.03 * k)
    p.quadraticVertex(0.3 * k * s, -0.05 * k, 0.46 * k * s, 0)
    p.quadraticVertex(0.3 * k * s, 0.05 * k, 0.06 * k, 0.03 * k)
    p.endShape(p.CLOSE)
    p.pop()
  }
  // The wings: each a fan of blades from the shoulder, raised and lowered by the beat.
  for (const side of [-1, 1]) {
    p.push()
    p.scale(1, side)
    p.rotate(-Math.PI / 2 + 0.25 - beat * 0.55 * s)
    for (let i = 0; i < 7; i++) {
      const len = (0.34 + 0.07 * i - 0.004 * i * i) * s
      p.push()
      p.rotate(-0.18 + i * 0.1)
      p.fill(alpha(p, i % 2 ? HOWL_BIRD : edge, light))
      p.beginShape()
      p.vertex(0.05 * k, -0.035 * k)
      p.quadraticVertex(len * 0.6 * k, -0.07 * k, len * k, 0)
      p.quadraticVertex(len * 0.6 * k, 0.05 * k, 0.05 * k, 0.03 * k)
      p.endShape(p.CLOSE)
      p.pop()
    }
    p.pop()
  }
  p.pop()
}

/* ------------------------------------------------------------------ the door */

/** The door's size in cells: the opening is `w` wide and `h` tall, its sill at the origin (on the floor). */
export const DOOR = { w: 0.95, h: 2.05, frame: 0.12, dial: 0.2 }
/** The dial's colours in turning order: `dial` counts along these (0 green, 1 blue, 2 red, 3 black). */
export const DIAL_ORDER = [DIAL.green, DIAL.blue, DIAL.red, DIAL.black] as const

export interface DoorOpts {
  /** 0 shut, 1 open wide (the leaf swung toward us, hinged on the left). */
  open: number
  /** The dial's pointer, counting along DIAL_ORDER (fractions while it turns). */
  dial: number
  /** The wood of the leaf and frame. */
  wood: string
  woodDark: string
  /**
   * What is through the door while it is open, drawn clipped to the opening. It is handed the opening's box in the
   * door's own cells (x from -w/2 to w/2, y from -h to 0).
   */
  view?: (p: p5, box: { x0: number; y0: number; x1: number; y1: number }) => void
  light?: number
}

/**
 * The castle's door, the one door of the show: a heavy plank door in a timber frame, and on its lintel the colour
 * dial, a flat half-disc plate with four coloured notches and a lever that says where the door opens. Drawn in elevation, sill at the
 * origin, the opening centred on x = 0. Opening, the leaf swings toward us on its left hinge (it narrows and
 * darkens), and what is through it (`view`) shows in the opening.
 */
export function drawDoor(p: p5, k: number, weight: number, ink: string, o: DoorOpts): void {
  const { w, h, frame: f, dial: dr } = DOOR
  const light = o.light ?? 1
  const open = Math.max(0, Math.min(1, o.open))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  p.rectMode(p.CORNER)
  // The opening: the view through it, or the dark of a shut door behind the leaf.
  if (open > 0.001 && o.view) {
    p.push()
    ctx.save()
    ctx.beginPath()
    ctx.rect((-w / 2) * k, -h * k, w * k, h * k)
    ctx.clip()
    o.view(p, { x0: -w / 2, y0: -h, x1: w / 2, y1: 0 })
    ctx.restore()
    p.pop()
  }
  // The frame: posts and a lintel.
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight)
  p.fill(alpha(p, o.woodDark, light))
  p.rect((-w / 2 - f) * k, -h * k, f * k, h * k)
  p.rect((w / 2) * k, -h * k, f * k, h * k)
  p.rect((-w / 2 - f) * k, (-h - f) * k, (w + 2 * f) * k, f * k)
  // The leaf: planks and two iron straps; swung toward us, it narrows to its hinge edge.
  const lw = w * Math.cos((open * Math.PI) / 2 * 0.96)
  if (lw > 0.01) {
    const shade = mixHex(o.wood, o.woodDark, open * 0.6)
    p.fill(alpha(p, shade, light))
    p.rect((-w / 2) * k, -h * k, lw * k, h * k)
    p.stroke(alpha(p, ink, 0.45 * light))
    p.strokeWeight(weight * 0.5)
    for (let i = 1; i < 4; i++) {
      const x = -w / 2 + (lw * i) / 4
      p.line(x * k, (-h + 0.04) * k, x * k, -0.04 * k)
    }
    p.stroke(alpha(p, ink, light))
    p.strokeWeight(weight * 0.8)
    p.fill(alpha(p, '#3A3A40', light))
    for (const y of [-h * 0.78, -h * 0.25]) p.rect((-w / 2) * k, y * k, lw * 0.8 * k, 0.05 * k)
    // The latch, on the free edge.
    if (lw > 0.2) {
      p.fill(alpha(p, DIAL.brass, light))
      p.circle((-w / 2 + lw - 0.1) * k, -h * 0.5 * k, 0.07 * k)
    }
  }
  // The dial on the lintel: a flat half-disc plate of dark brass, its four colours as notches round its rim, and a
  // lever that swings from the plate's foot to the colour where the door opens. Flat, low and dark: never a disc.
  const cy = -h - f
  const R = dr * 0.9
  const plate = mixHex(DIAL.brass, o.woodDark, 0.45)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight * 0.8)
  p.fill(alpha(p, plate, light))
  p.arc(0, cy * k, 2 * R * k, 2 * R * k, Math.PI, 2 * Math.PI, p.CHORD)
  p.strokeCap(p.SQUARE)
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + ((i - 1.5) * Math.PI) / 5
    p.stroke(alpha(p, DIAL_ORDER[i], light))
    p.strokeWeight(weight * 2.2)
    p.line(Math.cos(a) * R * 0.66 * k, (cy + Math.sin(a) * R * 0.66) * k, Math.cos(a) * R * 0.9 * k, (cy + Math.sin(a) * R * 0.9) * k)
  }
  const pa = -Math.PI / 2 + ((o.dial - 1.5) * Math.PI) / 5
  p.strokeCap(p.ROUND)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight * 1.3)
  p.line(0, (cy - 0.01) * k, Math.cos(pa) * R * 1.08 * k, (cy - 0.01 + Math.sin(pa) * R * 1.08) * k)
  p.pop()
}

/** The colour the dial points at, mixed between two pips while it turns: for a light that spills from the door. */
export function dialColor(dial: number): string {
  const i = Math.max(0, Math.min(3, Math.floor(dial)))
  const j = Math.min(3, i + 1)
  return mixHex(DIAL_ORDER[i], DIAL_ORDER[j], dial - i)
}

/* ------------------------------------------------------------------ the war's fleet */

export interface ShipOpts {
  /** Show time, for the oars' beat. */
  t: number
  /** Facing: 1 right, -1 left. */
  face?: 1 | -1
  /** Its colour (default the fleet's dull iron); far ships are paler (mix toward the sky yourself). */
  color?: string
  light?: number
}

/**
 * A flying warship, the film's: a long iron hull like a whale's, a bridge tower, and rows of flapping oar-wings
 * along its belly, beating slowly. About 6 cells long; the origin is the middle of its keel. Seen far off (small,
 * pale) it is the war crossing the sky; close, the war builder's.
 */
export function drawWarship(p: p5, k: number, weight: number, ink: string, o: ShipOpts): void {
  const light = o.light ?? 1
  const c = o.color ?? WASTES.warship
  p.push()
  p.scale(o.face ?? 1, 1)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight)
  // The oar-wings, under the hull, beating in a ripple from bow to stern.
  p.fill(alpha(p, mixHex(c, '#FFFFFF', 0.15), light))
  for (let i = 0; i < 9; i++) {
    const x = -2.4 + i * 0.58
    const a = 0.5 + 0.35 * Math.sin(o.t * 2.2 - i * 0.5)
    p.push()
    p.translate(x * k, 0.1 * k)
    p.rotate(a)
    p.beginShape()
    p.vertex(0, 0)
    p.vertex(0.08 * k, 0.9 * k)
    p.vertex(-0.14 * k, 0.8 * k)
    p.endShape(p.CLOSE)
    p.pop()
  }
  // The hull: long, round-nosed, tapering to the stern.
  p.fill(alpha(p, c, light))
  p.beginShape()
  p.vertex(3.0 * k, -0.35 * k)
  p.bezierVertex(3.2 * k, -0.1 * k, 3.0 * k, 0.3 * k, 2.4 * k, 0.4 * k)
  p.vertex(-2.6 * k, 0.28 * k)
  p.bezierVertex(-3.0 * k, 0.2 * k, -3.1 * k, -0.2 * k, -2.8 * k, -0.45 * k)
  p.vertex(2.6 * k, -0.6 * k)
  p.endShape(p.CLOSE)
  // The bridge tower and a stack.
  p.fill(alpha(p, mixHex(c, '#000000', 0.2), light))
  p.rectMode(p.CORNER)
  p.rect(-0.2 * k, -1.25 * k, 1.1 * k, 0.68 * k)
  p.rect(-1.4 * k, -1.0 * k, 0.3 * k, 0.45 * k)
  p.pop()
}

/**
 * A bomber: a stubby body on bat-like wings that flap slowly, the film's. About 1.6 cells across; the origin is its
 * middle. Bombs are the war builder's.
 */
export function drawBomber(p: p5, k: number, weight: number, ink: string, o: ShipOpts): void {
  const light = o.light ?? 1
  const c = o.color ?? WASTES.warship
  const flap = Math.sin(o.t * 3.4) * 0.25
  p.push()
  p.scale(o.face ?? 1, 1)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight * 0.8)
  p.fill(alpha(p, mixHex(c, '#000000', 0.15), light))
  for (const s of [-1, 1]) {
    p.push()
    p.scale(1, 1)
    p.rotate(s * 0.08 + flap * s * 0.3)
    p.beginShape()
    p.vertex(0, -0.05 * k)
    p.vertex(s * 0.8 * k, (-0.3 - flap * 0.3) * k)
    p.vertex(s * 0.62 * k, -0.08 * k)
    p.vertex(s * 0.48 * k, 0.02 * k)
    p.vertex(s * 0.3 * k, -0.02 * k)
    p.vertex(0, 0.06 * k)
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.fill(alpha(p, c, light))
  p.ellipse(0, 0, 0.62 * k, 0.2 * k)
  p.pop()
}
