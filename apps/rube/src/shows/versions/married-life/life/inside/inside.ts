import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, scenery } from '../kit'
import { AGE, CUT } from '../music'
import { HOME, INK } from '../worlds'

/**
 * The house, inside (the director's set): the house cut open like a doll's house, from the back yard on the left to
 * the porch on the right, two floors and the roof. Carl and Ellie live here from the nursery to the tickets: the
 * nursery upstairs (the home builder), the yard and the back door (the home builder), the living room with its
 * mantle and the jar (the jar builder), the hall with the stairs and the front door (the ties builder).
 *
 * This file draws only the house itself: the sky, the ground, the rooms' papered walls, the walls and floors cut
 * through, the windows, the fireplace and its mantle, the stairs, the roof and the chimney. Everything that moves or
 * is used (doors' leaves, furniture, the machines) is the part's whose room it is. Its papers age with the years.
 *
 * Coordinates are cells from the set's origin, which the score puts at `INSIDE_AT` in the house world. A ball (or
 * Carl) standing on the ground floor has its centre at y = 0; upstairs at y = `INSIDE.up`.
 */
export const INSIDE = {
  /** Ball centres on the ground floor and upstairs; the surfaces they stand on. */
  floor: 0,
  ground: 0.13,
  up: -3.85,
  groundUp: -3.72,
  /** Undersides of the ceilings. */
  ceil: -3.6,
  ceilUp: -7.0,
  /** The yard, left of the back wall. */
  yard: [-17, -1.2] as [number, number],
  /** The back wall (in section) and the back door's opening in it, up from the ground to `backDoorTop`. */
  backWall: [-1.2, -0.9] as [number, number],
  backDoorTop: -2.1,
  /** The living room; its fireplace on the far wall, and the mantle's top (where the jar stands). */
  living: [-0.9, 12.9] as [number, number],
  fireplace: 6.0,
  mantle: -1.35,
  /** The wall between the living room and the hall, open below `doorway`. */
  partition: [12.9, 13.2] as [number, number],
  doorway: -2.5,
  /** The hall, and the stairs on its far wall (from the ground at x0 up to the upstairs floor at x1). */
  hall: [13.2, 21.8] as [number, number],
  stairs: [14.2, 19.4] as [number, number],
  /** The front wall and the front door's opening, and the porch outside it. */
  frontWall: [21.8, 22.1] as [number, number],
  frontDoorTop: -2.2,
  porch: [22.1, 25.5] as [number, number],
  /** Upstairs: the nursery over the living room, the landing over the hall. */
  nursery: [-0.9, 12.9] as [number, number],
  landing: [13.2, 21.8] as [number, number],
  /** The roof: its eaves and its ridge; the chimney over the fireplace. */
  eaves: [-1.9, 22.8] as [number, number],
  eavesY: -6.9,
  ridge: [10.45, -10.7] as [number, number],
  chimney: [5.4, 6.6, -11.8] as [number, number, number],
  /** The windows on the far walls, [x0, x1, y0, y1]. */
  windows: [
    [1.4, 3.8, -2.7, -0.95],
    [8.6, 11.0, -2.7, -0.95],
    [4.4, 7.6, -6.2, -4.6],
  ] as [number, number, number, number][],
}

/** How far round the house its sky and earth are painted: [x0, x1, y0, y1] from its origin. */
const SPAN = [-70, 70, -40, 30]

/** The cells the set claims, [x0, y0, x1, y1] from its origin. */
export const INSIDE_BOX: [number, number, number, number] = [-18, -13, 27, 3]

/** The sky over the yard and the roof: grey through the loss, clear with the book, warm with the late years. */
function skyAt(t: number): string {
  const grey = '#C6CDD0'
  // The yard opens grey (the doctor's office ends cold, and the cut carries its light across), and warms as the
  // book comes out to her.
  if (t < CUT.doctor) return HOME.sky
  if (t < 95) return grey
  if (t < 101) return mixHex(grey, HOME.sky, (t - 95) / 6)
  return mixHex(HOME.sky, '#D9D3C4', Math.max(0, Math.min(1, (t - 140) / 25)))
}

function rect(p: p5, k: number, x0: number, y0: number, x1: number, y1: number): void {
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

export const inside = scenery<null>({
  name: 'inside',
  draw: (p, _s, c) => {
    const { k, weight } = c
    const t = c.t
    const age = AGE(t)
    const H = INSIDE
    const f = frame(p, k)
    const ink = INK
    p.push()
    // The stage draws with rectMode(CENTER) (engine.ts `drawingModes`); this set thinks in corners.
    p.rectMode(p.CORNER)

    // The sky, wherever the frame shows it over the yard and the roof, and the earth under everything: only round
    // the house, so a wide look at the whole world (Overview) still sees the street side and the rest.
    const X0 = Math.max(f.x0, SPAN[0])
    const X1 = Math.min(f.x1, SPAN[1])
    const Y0 = Math.max(f.y0, SPAN[2])
    const Y1 = Math.min(f.y1, SPAN[3])
    if (X1 > X0 && Y1 > Y0) {
      p.noStroke()
      p.fill(skyAt(t))
      if (H.ground > Y0) p.rect(X0 * k, Y0 * k, (X1 - X0) * k, (Math.min(H.ground, Y1) - Y0) * k)
      p.fill(mixHex('#B09878', '#A08E78', age))
      if (Y1 > H.ground) p.rect(X0 * k, H.ground * k, (X1 - X0) * k, (Y1 - H.ground) * k)
      // The yard's grass: a band on the earth, and the lawn beyond the porch.
      p.fill(mixHex(HOME.grass, '#9DAA78', age * 0.6))
      if (H.backWall[0] > X0) p.rect(X0 * k, H.ground * k, (H.backWall[0] - X0) * k, 0.28 * k)
      if (X1 > H.porch[1]) p.rect(H.porch[1] * k, H.ground * k, (X1 - H.porch[1]) * k, 0.28 * k)
    }
    p.stroke(alpha(p, ink, 0.55))
    p.strokeWeight(weight * 0.7)
    if (H.backWall[0] > X0) p.line(X0 * k, H.ground * k, H.backWall[0] * k, H.ground * k)
    if (X1 > H.porch[1]) p.line(H.porch[1] * k, H.ground * k, X1 * k, H.ground * k)

    // The rooms' walls: papered, yellowing with the years.
    const paper = mixHex(HOME.paper, '#D9C39C', age * 0.8)
    const hallPaper = mixHex(HOME.paperHall, '#CBB793', age * 0.8)
    const nurseryPaper = mixHex(HOME.nursery, '#D3D8D2', Math.max(0, Math.min(1, (t - CUT.doctor) / 30)) * 0.7)
    p.noStroke()
    // The far wall runs on behind the partition: each room's paper meets the next's at the partition's middle.
    const mid = (H.partition[0] + H.partition[1]) / 2
    p.fill(paper)
    rect(p, k, H.living[0], H.ceil, mid, H.ground)
    p.fill(hallPaper)
    rect(p, k, mid, H.ceil, H.hall[1], H.ground)
    rect(p, k, mid, H.ceilUp, H.landing[1], H.groundUp)
    p.fill(nurseryPaper)
    rect(p, k, H.nursery[0], H.ceilUp, mid, H.groundUp)
    // A chair rail round the living room and the hall, and their skirting.
    p.stroke(alpha(p, ink, 0.28))
    p.strokeWeight(weight * 0.6)
    p.line(H.living[0] * k, -0.95 * k, H.living[1] * k, -0.95 * k)
    p.line(H.hall[0] * k, -0.95 * k, H.hall[1] * k, -0.95 * k)
    p.noStroke()
    p.fill(mixHex(HOME.woodDark, '#6A5040', age))
    rect(p, k, H.living[0], H.ground - 0.12, H.living[1], H.ground)
    rect(p, k, H.hall[0], H.ground - 0.12, H.hall[1], H.ground)
    rect(p, k, H.nursery[0], H.groundUp - 0.1, H.landing[1], H.groundUp)

    // The windows on the far walls: frames, glass with the sky in it, a sill.
    for (const [x0, x1, y0, y1] of H.windows) {
      p.noStroke()
      p.fill(alpha(p, skyAt(t), 1))
      rect(p, k, x0, y0, x1, y1)
      p.fill(alpha(p, '#FFFFFF', 0.22))
      p.quad((x0 + 0.2) * k, y1 * k, (x0 + 0.75) * k, y0 * k, (x0 + 1.05) * k, y0 * k, (x0 + 0.5) * k, y1 * k)
      p.stroke(ink)
      p.strokeWeight(weight * 0.8)
      p.fill(HOME.trim)
      // The frame as a band round the glass, and the bars.
      p.noFill()
      p.stroke(HOME.trim)
      p.strokeWeight(0.1 * k)
      rect(p, k, x0, y0, x1, y1)
      p.line(((x0 + x1) / 2) * k, y0 * k, ((x0 + x1) / 2) * k, y1 * k)
      p.line(x0 * k, ((y0 + y1) / 2) * k, x1 * k, ((y0 + y1) / 2) * k)
      p.stroke(alpha(p, ink, 0.8))
      p.strokeWeight(weight * 0.7)
      rect(p, k, x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05)
      p.fill(HOME.trim)
      rect(p, k, x0 - 0.15, y1, x1 + 0.15, y1 + 0.1)
    }

    // The fireplace on the living room's far wall: the chimney breast, brick round a dark firebox, the mantle.
    const fx = H.fireplace
    p.noStroke()
    p.fill(mixHex('#B8836A', '#A07C6C', age))
    rect(p, k, fx - 1.0, H.ceil, fx + 1.0, H.ground)
    p.fill('#3A2E2A')
    p.beginShape()
    p.vertex((fx - 0.55) * k, H.ground * k)
    p.vertex((fx - 0.55) * k, -0.55 * k)
    p.bezierVertex((fx - 0.55) * k, -0.85 * k, (fx + 0.55) * k, -0.85 * k, (fx + 0.55) * k, -0.55 * k)
    p.vertex((fx + 0.55) * k, H.ground * k)
    p.endShape(p.CLOSE)
    p.stroke(alpha(p, ink, 0.85))
    p.strokeWeight(weight * 0.8)
    p.fill(mixHex(HOME.wood, HOME.woodDark, 0.25 + age * 0.3))
    rect(p, k, fx - 1.35, H.mantle, fx + 1.35, H.mantle + 0.14)
    p.noFill()
    rect(p, k, fx - 1.0, H.ceil, fx + 1.0, H.ground)

    // The stairs on the hall's far wall: a stringer and its treads, climbing to the landing.
    const [s0, s1] = H.stairs
    const steps = 12
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(weight * 0.7)
    p.fill(mixHex(HOME.wood, '#A88C70', age))
    p.beginShape()
    p.vertex(s0 * k, H.ground * k)
    for (let i = 0; i < steps; i++) {
      const x = s0 + ((s1 - s0) * i) / steps
      const y = H.ground + ((H.groundUp - H.ground) * (i + 1)) / steps
      p.vertex(x * k, y * k)
      p.vertex((x + (s1 - s0) / steps) * k, y * k)
    }
    p.vertex(s1 * k, (H.groundUp + 0.25) * k)
    p.vertex((s0 + 0.6) * k, H.ground * k)
    p.endShape(p.CLOSE)

    // The walls and floors, cut through: the house's section, one warm dark with the clapboard's colour on its
    // outer faces.
    const section = HOME.section
    const siding = mixHex(HOME.siding, HOME.sidingOld, age)
    p.stroke(ink)
    p.strokeWeight(weight)
    p.fill(section)
    // Back wall, with the back door's opening.
    rect(p, k, H.backWall[0], H.eavesY, H.backWall[1], H.backDoorTop)
    // Front wall, with the front door's opening.
    rect(p, k, H.frontWall[0], H.eavesY, H.frontWall[1], H.frontDoorTop)
    // The partition, above the doorway downstairs; upstairs, whole but for a door's width.
    rect(p, k, H.partition[0], H.ceil, H.partition[1], H.doorway)
    rect(p, k, H.partition[0], H.ceilUp, H.partition[1], H.groundUp - 2.1)
    // The upstairs floor and the ceiling over it; the ground floor's slab on its foundation.
    rect(p, k, H.backWall[0], H.ceil, H.frontWall[1], H.groundUp)
    rect(p, k, H.backWall[0], H.ceilUp - 0.12, H.frontWall[1], H.ceilUp)
    rect(p, k, H.backWall[0], H.ground, H.frontWall[1], H.ground + 0.32)
    // The clapboard's colour on the outer faces, the trim at the corners.
    p.noStroke()
    p.fill(siding)
    rect(p, k, H.backWall[0] - 0.08, H.eavesY, H.backWall[0], H.backDoorTop)
    rect(p, k, H.frontWall[1], H.eavesY, H.frontWall[1] + 0.08, H.frontDoorTop)
    // The door frames: trim round the two openings.
    p.fill(HOME.trim)
    rect(p, k, H.backWall[0] - 0.08, H.backDoorTop - 0.1, H.backWall[1] + 0.02, H.backDoorTop)
    rect(p, k, H.frontWall[0] - 0.02, H.frontDoorTop - 0.1, H.frontWall[1] + 0.08, H.frontDoorTop)

    // The porch: its boards and a post, out past the front door.
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    p.fill(mixHex(HOME.trim, '#E6DCC8', age))
    rect(p, k, H.frontWall[1], H.ground, H.porch[1], H.ground + 0.22)
    rect(p, k, H.porch[1] - 0.25, H.eavesY + 3.2, H.porch[1] - 0.12, H.ground)
    p.fill(mixHex(HOME.roof, HOME.roofOld, age))
    p.quad(H.frontWall[1] * k, (H.eavesY + 3.1) * k, (H.porch[1] + 0.2) * k, (H.eavesY + 3.4) * k, (H.porch[1] + 0.2) * k, (H.eavesY + 3.6) * k, H.frontWall[1] * k, (H.eavesY + 3.3) * k)

    // The attic under the roof, then the roof itself in section: a thick band of shingles over a dark rafter line.
    const [rx, ry] = H.ridge
    p.noStroke()
    p.fill(mixHex('#7C6250', '#6D5A4E', age))
    p.triangle(H.eaves[0] * k, H.eavesY * k, rx * k, ry * k, H.eaves[1] * k, H.eavesY * k)
    // The chimney, up through the roof.
    const [c0, c1, ctop] = H.chimney
    p.stroke(ink)
    p.strokeWeight(weight)
    p.fill(mixHex('#A8604A', '#8E6656', age))
    rect(p, k, c0, ctop, c1, H.ceilUp)
    rect(p, k, c0 - 0.12, ctop - 0.2, c1 + 0.12, ctop)
    const roof = mixHex(HOME.roof, HOME.roofOld, age)
    p.fill(roof)
    const th = 0.42
    p.beginShape()
    p.vertex((H.eaves[0] - 0.3) * k, (H.eavesY + 0.12) * k)
    p.vertex(rx * k, (ry - th) * k)
    p.vertex((H.eaves[1] + 0.3) * k, (H.eavesY + 0.12) * k)
    p.vertex((H.eaves[1] + 0.3) * k, (H.eavesY + 0.12 + th) * k)
    p.vertex(rx * k, ry * k)
    p.vertex((H.eaves[0] - 0.3) * k, (H.eavesY + 0.12 + th) * k)
    p.endShape(p.CLOSE)
    p.pop()
  },
})
