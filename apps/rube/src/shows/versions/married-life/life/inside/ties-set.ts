import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha } from '../kit'
import { drawFalls, FALLS } from '../props/falls'
import { CHURCH, CLINIC, HOME, INK } from '../worlds'

/**
 * The hall's furniture and machines (the ties builder's; `ties.ts` animates them): pure drawings of a state, in the
 * part's own cells. The part's frame puts Carl's entry, in the doorway from the living room, at (-0.5, 0): the hall
 * runs from x -0.35 (the partition) to 8.25 (the front wall), its floor's top at y 0.13, the stairs on its far wall
 * from x 0.65 (at the floor) to 5.85 (at the landing).
 *
 * Left to right, as the years go: the tie wheel on its stand by the doorway, the gramophone, the open floor they
 * dance on, the desk under her painting of the falls with the ticket machine and its pedal, and the front door.
 */

export const FLOOR = 0.13

/** The tie wheel: its hub, its radius, and how far each collar hangs below its pin. */
export const WHEEL = { x: 0.75, y: -1.055, r: 0.7, hang: 0.24, spokes: 6, plate: 0.2 }

/** The gramophone's cabinet: its middle, half its width, its top. */
export const GRAM = { x: 2.2, half: 0.25, top: -0.36 }

/** The desk (a fixed top and a drop leaf on its right), the ticket machine on it, the pedal on the floor before it. */
export const DESK = { x0: 6.7, x1: 7.3, leaf: 0.42, top: -0.52, thick: 0.045 }
export const MACHINE = { x: 7.0, half: 0.24, top: -1.1, window: [0.3, 0.2] as [number, number], wy: -0.84 }
export const PEDAL = { x: 7.45, half: 0.16 }

/** Her painting of Paradise Falls over the desk, framed; the picture lamp over it. */
export const PAINTING = { x0: 6.62, y0: -2.42, w: 1.3, h: 0.94 }

/** The front door: the middle of the wall it hangs in, and how wide its leaf is when it swings out onto the porch. */
export const DOOR = { x: 8.4, w: 0.85, top: -2.2 }

const IRON = mixHex(INK, HOME.section, 0.45)
const IRON_LIGHT = mixHex(IRON, CLINIC.steel, 0.35)

function rect(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0): void {
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, r * k)
}

/* ------------------------------------------------------------------ the tie wheel */

/**
 * The wheel's frame (behind them): an easel-like stand of two splayed legs, the wheel on its hub with a ratchet and a
 * pawl, six spokes, a rim with a brass pin at each spoke for a hanger, and the brass plate in the floor he stands on.
 * `turn` is the wheel's angle (radians, clockwise); `pawl` 0..1 how far the pawl is lifted; `plate` the plate's sink.
 */
export function drawWheelFrame(p: p5, k: number, weight: number, turn: number, pawl: number, plate: number, age: number): void {
  const { x, y, r } = WHEEL
  const wood = mixHex(HOME.wood, '#A88C70', age * 0.8)
  const dark = mixHex(HOME.woodDark, '#6A5040', age)
  const brass = mixHex(HOME.brass, '#B9A06A', age * 0.7)
  p.push()
  p.rectMode(p.CORNER)
  // The plate, set flush in the floor: it sinks a little under him.
  p.noStroke()
  p.fill(alpha(p, INK, 0.55))
  rect(p, k, x - WHEEL.plate - 0.02, FLOOR, x + WHEEL.plate + 0.02, FLOOR + 0.035 + plate)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.fill(brass)
  rect(p, k, x - WHEEL.plate, FLOOR + plate, x + WHEEL.plate, FLOOR + plate + 0.03, 0.006)
  // The legs, splayed from the hub to the floor either side, with small feet.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(dark)
  for (const side of [-1, 1]) {
    const fx = x + side * 0.64
    const nx = -(FLOOR - y)
    const ny = side * 0.64
    const n = Math.hypot(nx, ny)
    const ox = (nx / n) * 0.03
    const oy = (ny / n) * 0.03
    p.quad((x + ox) * k, (y + oy) * k, (x - ox) * k, (y - oy) * k, (fx - ox) * k, (FLOOR - oy) * k, (fx + ox) * k, (FLOOR + oy) * k)
    rect(p, k, fx - 0.06, FLOOR - 0.035, fx + 0.06, FLOOR, 0.01)
  }
  // The rim: a painted band between two inked edges, and the spokes.
  p.push()
  p.translate(x * k, y * k)
  p.rotate(turn)
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(0.064 * k)
  p.circle(0, 0, 2 * r * k)
  p.stroke(wood)
  p.strokeWeight(0.044 * k)
  p.circle(0, 0, 2 * r * k)
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  for (let i = 0; i < WHEEL.spokes; i++) {
    const a = (i / WHEEL.spokes) * Math.PI * 2 + Math.PI / 2
    p.push()
    p.rotate(a)
    p.fill(wood)
    p.quad(0.06 * k, -0.018 * k, (r - 0.03) * k, -0.012 * k, (r - 0.03) * k, 0.012 * k, 0.06 * k, 0.018 * k)
    p.pop()
  }
  // The ratchet on the hub: a toothed brass wheel.
  p.fill(brass)
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.beginShape()
  const teeth = 12
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const a1 = ((i + 0.7) / teeth) * Math.PI * 2
    p.vertex(Math.cos(a0) * 0.1 * k, Math.sin(a0) * 0.1 * k)
    p.vertex(Math.cos(a1) * 0.075 * k, Math.sin(a1) * 0.075 * k)
    p.vertex(Math.cos(((i + 1) / teeth) * Math.PI * 2) * 0.075 * k, Math.sin(((i + 1) / teeth) * Math.PI * 2) * 0.075 * k)
  }
  p.endShape(p.CLOSE)
  p.fill(dark)
  p.circle(0, 0, 0.07 * k)
  p.pop()
  // The pawl: a small iron catch on the left leg, resting in the ratchet's teeth; it lifts as the wheel turns.
  p.push()
  p.translate((x - 0.2) * k, (y - 0.13) * k)
  p.rotate(0.55 - pawl * 0.3)
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.fill(IRON)
  p.quad(0, -0.015 * k, 0.15 * k, -0.006 * k, 0.15 * k, 0.012 * k, 0, 0.015 * k)
  p.fill(brass)
  p.circle(0, 0, 0.035 * k)
  p.pop()
  p.pop()
}

/** A hanger's brass wire from its pin on the rim to the clip that holds a collar (or holds nothing, open). */
export function drawHanger(p: p5, k: number, weight: number, pin: [number, number], clip: [number, number], open: number, age: number): void {
  const brass = mixHex(HOME.brass, '#B9A06A', age * 0.7)
  const [px, py] = pin
  const [cx, cy] = clip
  const a = Math.atan2(cx - px, cy - py)
  p.push()
  p.stroke(INK)
  p.strokeWeight(weight * 1.05)
  p.line(px * k, py * k, cx * k, cy * k)
  p.stroke(brass)
  p.strokeWeight(weight * 0.55)
  p.line(px * k, py * k, cx * k, cy * k)
  // The pin, and the clip across the wire's end: two jaws that part when it lets go.
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.fill(brass)
  p.circle(px * k, py * k, 0.04 * k)
  p.translate(cx * k, cy * k)
  p.rotate(-a)
  const gap = open * 0.025
  p.rectMode(p.CENTER)
  p.rect(-(0.024 + gap) * k, -0.006 * k, 0.04 * k, 0.014 * k, 0.004 * k)
  p.rect((0.024 + gap) * k, -0.006 * k, 0.04 * k, 0.014 * k, 0.004 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the gramophone */

export interface GramState {
  /** 0 the brake on, 1 the lever flipped (she has bumped it). */
  lever: number
  /** 0 the arm swung back at rest, 1 over the record. */
  arm: number
  /** 0 raised, 1 the needle in the groove. */
  down: number
  /** How far round the record is (radians). */
  spin: number
}

/**
 * A cabinet gramophone with a great flared horn (the film's pinks): a wooden box on short legs, the turntable on
 * top with its record, the tone arm on its post, the horn rising up and out towards the floor they will dance on.
 */
export function drawGramophone(p: p5, k: number, weight: number, s: GramState, age: number): void {
  const { x, half, top } = GRAM
  const wood = mixHex(HOME.wood, '#A88C70', age * 0.6)
  const dark = mixHex(HOME.woodDark, '#6A5040', age)
  const brass = mixHex(HOME.brass, '#B9A06A', age * 0.6)
  const pink = mixHex(HOME.pink, '#D6A7AC', age * 0.5)
  const pinkDeep = mixHex(pink, CHURCH.glassRed, 0.3)
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  // Legs, the box, an inset panel and its brass lever on the left face.
  p.fill(dark)
  rect(p, k, x - half + 0.04, 0.02, x - half + 0.09, FLOOR)
  rect(p, k, x + half - 0.09, 0.02, x + half - 0.04, FLOOR)
  p.fill(wood)
  rect(p, k, x - half, top, x + half, 0.03, 0.02)
  p.strokeWeight(weight * 0.5)
  p.fill(alpha(p, dark, 0.35))
  rect(p, k, x - half + 0.06, top + 0.07, x + half - 0.06, -0.03, 0.015)
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.fill(brass)
  p.push()
  p.translate((x - half) * k, -0.09 * k)
  p.rotate(0.5 - s.lever * 1.2)
  p.rect(-0.012 * k, 0, 0.024 * k, 0.1 * k, 0.008 * k)
  p.pop()
  p.circle((x - half) * k, -0.09 * k, 0.03 * k)
  // The turntable and its record, seen a little from above so it can be seen to turn: a sheen goes round it.
  const ry = top - 0.03
  p.fill(dark)
  p.ellipse(x * k, (ry + 0.012) * k, 0.44 * k, 0.07 * k)
  p.fill(INK)
  p.ellipse(x * k, ry * k, 0.42 * k, 0.065 * k)
  p.noStroke()
  p.fill(CHURCH.glassRed)
  p.ellipse(x * k, ry * k, 0.11 * k, 0.018 * k)
  p.noFill()
  p.stroke(alpha(p, HOME.trim, 0.35))
  p.strokeWeight(weight * 0.6)
  const a0 = s.spin % (Math.PI * 2)
  p.arc(x * k, ry * k, 0.34 * k, 0.05 * k, a0, a0 + 0.9)
  p.arc(x * k, ry * k, 0.34 * k, 0.05 * k, a0 + Math.PI, a0 + Math.PI + 0.9)
  // The horn: from the arm's post a brass neck bends back and up into a great flared bell, its mouth (dark inside,
  // a rolled rim) turned up and out towards the floor they will dance on.
  const post: [number, number] = [x + 0.17, ry - 0.02]
  const throat: [number, number] = [x + 0.24, ry - 0.2]
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(brass)
  p.beginShape()
  p.vertex((post[0] - 0.022) * k, (post[1] - 0.04) * k)
  p.bezierVertex((post[0] - 0.03) * k, (post[1] - 0.14) * k, (throat[0] - 0.06) * k, (throat[1] + 0.02) * k, (throat[0] - 0.02) * k, (throat[1] - 0.01) * k)
  p.vertex((throat[0] + 0.03) * k, (throat[1] + 0.02) * k)
  p.bezierVertex((throat[0] - 0.02) * k, (throat[1] + 0.05) * k, (post[0] + 0.022) * k, (post[1] - 0.12) * k, (post[0] + 0.022) * k, (post[1] - 0.04) * k)
  p.endShape(p.CLOSE)
  const dx = 0.42
  const dy = -1
  const dl = Math.hypot(dx, dy)
  const ux = dx / dl
  const uy = dy / dl
  const nx = -uy
  const ny = ux
  const L = 0.62
  const widthAt = (u: number) => 0.022 + 0.27 * u * u * u
  const edge = (u: number, side: number): [number, number] => [throat[0] + ux * L * u + nx * widthAt(u) * side, throat[1] + uy * L * u + ny * widthAt(u) * side]
  p.fill(pink)
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const [ex, ey] = edge(i / 16, 1)
    p.vertex(ex * k, ey * k)
  }
  for (let i = 16; i >= 0; i--) {
    const [ex, ey] = edge(i / 16, -1)
    p.vertex(ex * k, ey * k)
  }
  p.endShape(p.CLOSE)
  // The petals' seams along the bell.
  p.noFill()
  p.stroke(alpha(p, pinkDeep, 0.9))
  p.strokeWeight(weight * 0.5)
  for (const f of [-0.5, 0, 0.5]) {
    p.beginShape()
    for (let i = 2; i <= 16; i++) {
      const u = i / 16
      p.vertex((throat[0] + ux * L * u + nx * widthAt(u) * f) * k, (throat[1] + uy * L * u + ny * widthAt(u) * f) * k)
    }
    p.endShape()
  }
  // The mouth: seen from a little in front, an open ellipse across the bell's end.
  const mx = throat[0] + ux * L
  const my = throat[1] + uy * L
  const mw = widthAt(1)
  p.push()
  p.translate(mx * k, my * k)
  p.rotate(Math.atan2(ny, nx))
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(pink)
  p.ellipse(0, 0, (2 * mw + 0.03) * k, 0.2 * k)
  p.noStroke()
  p.fill(mixHex(pink, INK, 0.72))
  p.ellipse(0.01 * k, 0.012 * k, 2 * mw * 0.86 * k, 0.13 * k)
  p.pop()
  // The arm on its post: swung back off the record at rest; over it to play, the sound box dropping to the groove.
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.fill(brass)
  rect(p, k, post[0] - 0.02, post[1] - 0.05, post[0] + 0.02, post[1] + 0.01, 0.006)
  const rest: [number, number] = [post[0] + 0.1, post[1] - 0.07]
  const play: [number, number] = [x - 0.03, ry - 0.035]
  const hx = rest[0] + (play[0] - rest[0]) * s.arm
  const hy = rest[1] + (play[1] - rest[1]) * s.arm + s.down * 0.02
  p.strokeWeight(weight * 1.2)
  p.line(post[0] * k, (post[1] - 0.045) * k, hx * k, hy * k)
  p.strokeWeight(weight * 0.6)
  p.stroke(brass)
  p.line(post[0] * k, (post[1] - 0.045) * k, hx * k, hy * k)
  p.stroke(INK)
  p.fill(brass)
  p.rect((hx - 0.025) * k, (hy - 0.012) * k, 0.045 * k, 0.03 * k, 0.008 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the desk, the ticket machine, the pedal */

export interface DeskState {
  /** The drop leaf's fall, 0 level .. 1 hanging down. */
  leaf: number
  /** Where the destination reel has rolled to (0 the city .. 3 the falls). */
  reel: number
  /** The stamp's plunger, 0 up .. 1 down. */
  stamp: number
  /** The pedal's sink below the floor. */
  pedal: number
  /** A small shiver of the machine on each pump. */
  shake: number
}

/** One of the reel's pictures (flat paint, no words): 0 a city, 1 the sea, 2 snowy mountains, 3 the falls. */
function reelPicture(p: p5, k: number, weight: number, i: number, x0: number, y0: number, w: number, h: number): void {
  const X = (u: number) => (x0 + u * w) * k
  const Y = (v: number) => (y0 + v * h) * k
  p.noStroke()
  if (i === 3) {
    drawFalls(p, k, weight * 0.6, x0, y0, w, h)
    return
  }
  p.fill(i === 1 ? HOME.sky : i === 2 ? '#DCE4EA' : '#E8DCC8')
  p.rect(X(0), Y(0), w * k, h * k)
  if (i === 0) {
    // A city: towers of three greys against a pale sky, one with a spire.
    const towers: [number, number, number, string][] = [
      [0.06, 0.3, 0.55, CLINIC.steel],
      [0.24, 0.2, 0.3, HOME.stone],
      [0.47, 0.22, 0.42, CLINIC.chair],
      [0.72, 0.2, 0.62, HOME.stone],
    ]
    for (const [u, tw, th, c] of towers) {
      p.fill(c)
      p.rect(X(u), Y(1 - th), tw * w * k, th * h * k)
    }
    p.fill(CLINIC.steel)
    p.triangle(X(0.3), Y(0.7), X(0.34), Y(0.5), X(0.38), Y(0.7))
  } else if (i === 1) {
    // The sea, a ship's sail on it.
    p.fill(CHURCH.glassBlue)
    p.rect(X(0), Y(0.58), w * k, h * 0.42 * k)
    p.fill(HOME.trim)
    p.triangle(X(0.46), Y(0.56), X(0.46), Y(0.2), X(0.66), Y(0.56))
    p.fill(HOME.woodDark)
    p.rect(X(0.36), Y(0.56), w * 0.36 * k, h * 0.07 * k)
  } else {
    // Mountains, their snow.
    p.fill(CLINIC.steel)
    p.triangle(X(-0.1), Y(1), X(0.3), Y(0.25), X(0.7), Y(1))
    p.fill(CLINIC.chair)
    p.triangle(X(0.35), Y(1), X(0.72), Y(0.38), X(1.1), Y(1))
    p.fill(HOME.trim)
    p.triangle(X(0.22), Y(0.4), X(0.3), Y(0.25), X(0.38), Y(0.4))
    p.triangle(X(0.65), Y(0.5), X(0.72), Y(0.38), X(0.79), Y(0.5))
  }
}

/**
 * The desk under her painting: a small writing desk with a drawer, a drop leaf on its right (the picnic basket waits
 * on it), and on its top the ticket machine: a cast-iron box with a window on a reel of places, a stamp on top, a
 * slot on its right where the tickets come out. A rod runs down from it to the pedal in the floor.
 */
export function drawDesk(p: p5, k: number, weight: number, s: DeskState, age: number): void {
  const { x0, x1, top, thick, leaf } = DESK
  const wood = mixHex(HOME.wood, '#A88C70', age * 0.6)
  const dark = mixHex(HOME.woodDark, '#6A5040', age)
  const brass = mixHex(HOME.brass, '#B9A06A', age * 0.6)
  p.push()
  p.rectMode(p.CORNER)
  // The pedal, flush in the floor, and the rod from it up to the machine.
  p.noStroke()
  p.fill(alpha(p, INK, 0.55))
  rect(p, k, PEDAL.x - PEDAL.half - 0.02, FLOOR, PEDAL.x + PEDAL.half + 0.02, FLOOR + 0.035 + s.pedal)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.fill(brass)
  rect(p, k, PEDAL.x - PEDAL.half, FLOOR + s.pedal, PEDAL.x + PEDAL.half, FLOOR + s.pedal + 0.03, 0.006)
  const rx = PEDAL.x - PEDAL.half + 0.02
  p.stroke(INK)
  p.strokeWeight(weight * 1.1)
  p.line(rx * k, (FLOOR + s.pedal) * k, rx * k, (top + thick) * k)
  p.stroke(IRON_LIGHT)
  p.strokeWeight(weight * 0.5)
  p.line(rx * k, (FLOOR + s.pedal) * k, rx * k, (top + thick) * k)
  // Legs (turned, tapering), the apron with its drawer, the top.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(dark)
  for (const lx of [x0 + 0.06, x1 - 0.06]) p.quad((lx - 0.035) * k, (top + thick) * k, (lx + 0.035) * k, (top + thick) * k, (lx + 0.018) * k, FLOOR * k, (lx - 0.018) * k, FLOOR * k)
  p.fill(wood)
  rect(p, k, x0 + 0.02, top + thick, x1 - 0.02, top + thick + 0.13)
  p.strokeWeight(weight * 0.5)
  p.fill(alpha(p, dark, 0.3))
  rect(p, k, x0 + 0.12, top + thick + 0.025, x1 - 0.12, top + thick + 0.105, 0.01)
  p.fill(brass)
  p.circle(((x0 + x1) / 2) * k, (top + thick + 0.065) * k, 0.03 * k)
  p.strokeWeight(weight * 0.8)
  p.fill(wood)
  rect(p, k, x0 - 0.04, top, x1, top + thick, 0.008)
  // The drop leaf, hinged at the top's right edge: level, it holds the basket; let go, it swings down to hang.
  p.push()
  p.translate(x1 * k, (top + thick / 2) * k)
  p.rotate(s.leaf * Math.PI * 0.5)
  rect(p, k, 0, -thick / 2, leaf, thick / 2, 0.008)
  p.pop()
  p.fill(brass)
  p.circle(x1 * k, (top + thick / 2) * k, 0.028 * k)

  // The ticket machine.
  const mx = MACHINE.x
  const mh = MACHINE.half
  p.push()
  p.translate(s.shake * 0.006 * k, 0)
  // The stamp's plunger over it: a rod through a collar, a round-topped knob.
  const drop = s.stamp * 0.06
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.fill(IRON_LIGHT)
  rect(p, k, mx - 0.022, MACHINE.top - 0.17 + drop, mx + 0.022, MACHINE.top + 0.02)
  p.fill(CHURCH.glassRed)
  p.arc(mx * k, (MACHINE.top - 0.16 + drop) * k, 0.13 * k, 0.1 * k, Math.PI, Math.PI * 2, p.CHORD)
  p.fill(IRON)
  rect(p, k, mx - 0.055, MACHINE.top - 0.035, mx + 0.055, MACHINE.top + 0.005, 0.01)
  // The body: a cast-iron box, a little taller than wide, with a brass band.
  p.fill(IRON)
  p.beginShape()
  p.vertex((mx - mh) * k, top * k)
  p.vertex((mx - mh + 0.02) * k, (MACHINE.top + 0.05) * k)
  p.bezierVertex((mx - mh + 0.03) * k, (MACHINE.top - 0.005) * k, (mx + mh - 0.03) * k, (MACHINE.top - 0.005) * k, (mx + mh - 0.02) * k, (MACHINE.top + 0.05) * k)
  p.vertex((mx + mh) * k, top * k)
  p.endShape(p.CLOSE)
  p.fill(brass)
  rect(p, k, mx - mh + 0.005, top - 0.07, mx + mh - 0.005, top - 0.045)
  // The window on the reel: a brass bezel, the picture rolling behind glass.
  const [ww, wh] = MACHINE.window
  const wx0 = mx - ww / 2
  const wy0 = MACHINE.wy - wh / 2
  p.fill(brass)
  rect(p, k, wx0 - 0.03, wy0 - 0.03, wx0 + ww + 0.03, wy0 + wh + 0.03, 0.02)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(wx0 * k, wy0 * k, ww * k, wh * k)
  ctx.clip()
  const first = Math.floor(s.reel)
  for (let i = first; i <= first + 1; i++) {
    if (i < 0 || i > 3) continue
    reelPicture(p, k, weight, i, wx0, wy0 + (i - s.reel) * wh, ww, wh)
  }
  // The glass's sheen.
  p.noStroke()
  p.fill(alpha(p, '#FFFFFF', 0.18))
  p.quad((wx0 + 0.03) * k, (wy0 + wh) * k, (wx0 + 0.11) * k, wy0 * k, (wx0 + 0.16) * k, wy0 * k, (wx0 + 0.08) * k, (wy0 + wh) * k)
  ctx.restore()
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  rect(p, k, wx0, wy0, wx0 + ww, wy0 + wh)
  // The slot the tickets come out of, on the right: a dark mouth in a brass lip.
  p.fill(brass)
  rect(p, k, mx + mh - 0.01, MACHINE.wy - 0.045, mx + mh + 0.035, MACHINE.wy + 0.005, 0.008)
  p.noStroke()
  p.fill(INK)
  rect(p, k, mx + mh, MACHINE.wy - 0.028, mx + mh + 0.03, MACHINE.wy - 0.012)
  p.pop()
  p.pop()
}

/** A ticket: a small cream card with a red stub, at its middle (`x`, `y`), turned `angle`. */
export function drawTicket(p: p5, k: number, weight: number, x: number, y: number, angle: number, light = 1): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  p.rectMode(p.CENTER)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.5)
  p.fill(alpha(p, HOME.trim, light))
  p.rect(0, 0, 0.19 * k, 0.095 * k, 0.01 * k)
  p.noStroke()
  p.fill(alpha(p, CHURCH.glassRed, light))
  p.rect(-0.065 * k, 0, 0.045 * k, 0.088 * k)
  // A band of the falls' purple: where it goes.
  p.fill(alpha(p, FALLS.cliff, 0.9 * light))
  p.rect(0.035 * k, 0.015 * k, 0.09 * k, 0.016 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the painting */

/**
 * Her painting of the falls over the desk, in a plain wooden frame, and a brass picture lamp over it (unlit: its
 * light is `drawLampLight`, drawn over the evening).
 */
export function drawPainting(p: p5, k: number, weight: number, age: number): void {
  const { x0, y0, w, h } = PAINTING
  const frameC = mixHex(HOME.woodDark, '#6A5040', age)
  const brass = mixHex(HOME.brass, '#B9A06A', age * 0.6)
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(frameC)
  rect(p, k, x0 - 0.08, y0 - 0.08, x0 + w + 0.08, y0 + h + 0.08, 0.01)
  p.noStroke()
  p.fill(alpha(p, brass, 0.8))
  rect(p, k, x0 - 0.025, y0 - 0.025, x0 + w + 0.025, y0 + h + 0.025)
  drawFalls(p, k, weight, x0, y0, w, h)
  // The lamp: a short brass arm from the frame's top and a hood.
  const lx = x0 + w / 2
  const ly = y0 - 0.2
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.noFill()
  p.line(lx * k, (y0 - 0.08) * k, lx * k, (ly + 0.03) * k)
  p.fill(brass)
  p.quad((lx - 0.2) * k, (ly + 0.06) * k, (lx - 0.14) * k, (ly - 0.02) * k, (lx + 0.14) * k, (ly - 0.02) * k, (lx + 0.2) * k, (ly + 0.06) * k)
  p.pop()
}

/** The picture lamp lit (`lamp` 0..1): a warm wash down over the picture, and the hood's lit underside. Drawn after the dusk. */
export function drawLampLight(p: p5, k: number, lamp: number): void {
  if (lamp <= 0.001) return
  const { x0, y0, w, h } = PAINTING
  const lx = x0 + w / 2
  const ly = y0 - 0.2
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const g = ctx.createLinearGradient(0, (ly + 0.06) * k, 0, (y0 + h + 0.25) * k)
  g.addColorStop(0, `rgba(255, 227, 166, ${0.5 * lamp})`)
  g.addColorStop(0.45, `rgba(255, 227, 166, ${0.2 * lamp})`)
  g.addColorStop(1, 'rgba(255, 227, 166, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((lx - 0.2) * k, (ly + 0.06) * k)
  ctx.lineTo((lx + 0.2) * k, (ly + 0.06) * k)
  ctx.lineTo((x0 + w + 0.22) * k, (y0 + h + 0.25) * k)
  ctx.lineTo((x0 - 0.22) * k, (y0 + h + 0.25) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  p.push()
  p.noStroke()
  p.fill(alpha(p, HOME.lamp, lamp))
  p.quad((lx - 0.18) * k, (ly + 0.055) * k, (lx + 0.18) * k, (ly + 0.055) * k, (lx + 0.15) * k, (ly + 0.03) * k, (lx - 0.15) * k, (ly + 0.03) * k)
  p.pop()
}

/* ------------------------------------------------------------------ the front door */

/**
 * The front door, hung in the front wall. Shut, its face fills the doorway; it opens outwards onto the porch (a
 * screen door's way), its face widening as it turns towards us: `open` 0..1 is the swing (0 shut, 1 flat open), a
 * little over 1 on its bounce.
 */
export function drawDoor(p: p5, k: number, weight: number, open: number, age: number): void {
  const pink = mixHex(HOME.pink, '#D6A7AC', age * 0.5)
  const trim = HOME.trim
  const { x, w, top } = DOOR
  const s = Math.sin(Math.max(0, Math.min(1.2, open)) * Math.PI * 0.5)
  // Shut, it fills the doorway (the wall's thickness); open, its face lies out along the porch.
  const x0 = x - 0.15
  const face = 0.3 + (w - 0.3) * s
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(pink)
  rect(p, k, x0, top, x0 + face, FLOOR)
  {
    // Its panels and its window, squeezed as the face turns.
    const X = (u: number) => x0 + face * u
    p.strokeWeight(weight * 0.5)
    p.fill(alpha(p, mixHex(pink, INK, 0.12), 1))
    rect(p, k, X(0.18), top + 1.25, X(0.82), FLOOR - 0.15, 0.01)
    p.fill(HOME.glass)
    rect(p, k, X(0.18), top + 0.2, X(0.82), top + 1.0, 0.01)
    p.stroke(trim)
    p.strokeWeight(weight * 0.9)
    p.line(((X(0.18) + X(0.82)) / 2) * k, (top + 0.2) * k, ((X(0.18) + X(0.82)) / 2) * k, (top + 1.0) * k)
    p.line(X(0.18) * k, (top + 0.6) * k, X(0.82) * k, (top + 0.6) * k)
    p.stroke(INK)
    p.strokeWeight(weight * 0.5)
    p.fill(HOME.brass)
    p.circle(X(0.88) * k, (top + 1.15) * k, 0.045 * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the evening */

/**
 * The evening sun, low, coming in at the front door and lying along the hall's far wall in a long warm wedge: tall at
 * the door, reaching back down the hall to the floor they dance on. `a` 0..1 its strength; `reach` how far back it
 * lies (it shortens and fades as the sun goes down).
 */
export function drawSunWedge(p: p5, k: number, a: number, reach: number): void {
  if (a <= 0.001) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x1 = 8.2
  const x0 = x1 - reach
  // Four layers, each a little lower and shorter, for a soft edge: a penumbra, not a cut.
  ctx.save()
  for (let i = 0; i < 4; i++) {
    const f = i / 3
    const top = -2.05 + 0.35 * f
    const left = x0 + reach * 0.12 * f
    const g = ctx.createLinearGradient(x1 * k, 0, left * k, 0)
    g.addColorStop(0, `rgba(255, 214, 150, ${0.1 * a})`)
    g.addColorStop(0.55, `rgba(255, 214, 150, ${0.06 * a})`)
    g.addColorStop(1, 'rgba(255, 214, 150, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x1 * k, top * k)
    ctx.lineTo(left * k, FLOOR * k)
    ctx.lineTo(x1 * k, FLOOR * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The hall darkening into evening, over everything in it (the two of them too: it is the light, not the paint),
 * easing off towards the open front door where the last of the day comes in.
 */
export function drawDusk(p: p5, k: number, a: number): void {
  if (a <= 0.001) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const g = ctx.createLinearGradient(7.7 * k, 0, 8.4 * k, 0)
  g.addColorStop(0, `rgba(46, 42, 40, ${a})`)
  g.addColorStop(1, 'rgba(46, 42, 40, 0)')
  ctx.fillStyle = g
  ctx.fillRect(-0.35 * k, -3.6 * k, 8.75 * k, (3.6 + FLOOR) * k)
  ctx.restore()
}
