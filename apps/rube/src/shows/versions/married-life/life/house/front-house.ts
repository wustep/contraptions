import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { HOME, INK, carlAt, ellieAt } from '../worlds'
import { drawChair, CHAIR } from '../props/chairs'
import { CHAIRS, DOOR_HUNG, EDGE, FLAG_AT, G, HOUSE, LAMP_X, MAILBOX, P, PANE_AT, PRINT_AT, PRINTS, TREADS, TREE_AT, type DoorSwing } from './front-plan'

/**
 * The house from the street, drawn in one of its two conditions: `old` (the derelict clubhouse they bought: grey,
 * boards missing, glass broken, the door off a hinge, a step gone, the mailbox leaning) or new (fixed up, and then
 * the years on it: `age` fades the paint, and from the storm on the roof is patched). `dark` is the dusk on it,
 * `lamp` the light of the lamp in the room. The fix-up draws it twice, old and new either side of its rollers.
 *
 * What stands in front of the two of them when they are indoors (the bay's frame and glass, the strip of wall between
 * the bay and the door, the door's jambs) is `drawFacadeFront`, which the parts draw in their `over`.
 */

export interface Look {
  old: boolean
  age: number
  /** 0 day .. 1 night: how much of the dusk is on everything the lamp does not light. */
  dark: number
  /** 0 off .. 1 on: the lamp by his chair. */
  lamp: number
  T: number
}

const NIGHT = '#27304A'
const DUST = '#8F8B82'

/** A colour under the dusk. */
export const dusk = (L: Look, hex: string): string => mixHex(hex, NIGHT, L.dark * 0.78)

function palette(L: Look) {
  const a = L.age
  const s = (h: string) => dusk(L, h)
  return {
    siding: s(L.old ? mixHex(HOME.sidingOld, DUST, 0.62) : mixHex(HOME.siding, HOME.sidingOld, a)),
    trim: s(L.old ? mixHex(HOME.trim, DUST, 0.55) : mixHex(HOME.trim, '#E6DAC2', a)),
    roof: s(L.old ? mixHex(HOME.roofOld, '#6A625C', 0.55) : mixHex(HOME.roof, HOME.roofOld, a)),
    gable: s(L.old ? mixHex(HOME.yellow, DUST, 0.7) : mixHex(HOME.yellow, '#D9C08A', a)),
    pink: s(L.old ? mixHex(HOME.pink, DUST, 0.65) : mixHex(HOME.pink, '#C7A5A6', a)),
    door: s(L.old ? mixHex(HOME.yellow, DUST, 0.72) : mixHex(HOME.yellow, '#D8BF86', a)),
    brick: s(L.old ? mixHex('#A8604A', DUST, 0.5) : mixHex('#A8604A', '#8E6656', a)),
    found: s(L.old ? '#6F665E' : mixHex('#8C7B6A', '#7C6E62', a)),
    wood: s(L.old ? mixHex(HOME.woodDark, DUST, 0.35) : mixHex(HOME.wood, '#A08A70', a)),
    gap: s('#3A302B'),
    ink: s(INK),
  }
}

type Pal = ReturnType<typeof palette>

function rect(p: p5, k: number, x0: number, y0: number, x1: number, y1: number): void {
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/** Clapboard: the lap lines of the boards across a wall; on the old house some boards are gone and some hang loose. */
function siding(p: p5, k: number, weight: number, L: Look, c: Pal, x0: number, x1: number, y0: number, y1: number, seed: number): void {
  p.noStroke()
  p.fill(c.siding)
  rect(p, k, x0, y0, x1, y1)
  const lap = 0.2
  const n = Math.floor((y1 - y0) / lap)
  p.stroke(alpha(p, c.ink, 0.2))
  p.strokeWeight(weight * 0.45)
  for (let i = 1; i <= n; i++) {
    const y = y1 - i * lap
    if (y <= y0 + 0.02) break
    p.line(x0 * k, y * k, x1 * k, y * k)
  }
  if (!L.old) return
  // The wreck: here and there a board gone (the dark behind it), and one hanging off a nail at one end.
  const w = x1 - x0
  const holes = Math.max(1, Math.round(w * (y1 - y0) * 0.18))
  for (let i = 0; i < holes; i++) {
    const row = Math.floor(hash(i, seed, 1) * n)
    const y = y1 - (row + 1) * lap
    const len = 0.35 + hash(i, seed, 2) * 0.6
    const x = x0 + hash(i, seed, 3) * Math.max(0.01, w - len)
    p.noStroke()
    p.fill(c.gap)
    rect(p, k, x, y + 0.02, x + len, y + lap - 0.01)
    if (hash(i, seed, 4) < 0.45) {
      // The board that was there, hanging from its left nail.
      p.push()
      p.translate(x * k, (y + 0.1) * k)
      p.rotate(0.22 + hash(i, seed, 5) * 0.25)
      p.stroke(alpha(p, c.ink, 0.7))
      p.strokeWeight(weight * 0.5)
      p.fill(c.siding)
      p.rect(0, -0.08 * k, len * k, 0.17 * k)
      p.pop()
    }
  }
}

/** A window: frame, glass (the sky in it, or broken dark on the old house), a sash bar. Shutters where asked. */
function windowAt(p: p5, k: number, weight: number, L: Look, c: Pal, x0: number, x1: number, y0: number, y1: number, seed: number, opts: { shutters?: boolean; boarded?: boolean; glow?: number } = {}): void {
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.trim)
  rect(p, k, x0 - 0.1, y0 - 0.1, x1 + 0.1, y1 + 0.08)
  p.noStroke()
  const glass = L.old ? dusk(L, '#4C5256') : dusk(L, mixHex(HOME.glass, HOME.sky, 0.35))
  p.fill(glass)
  rect(p, k, x0, y0, x1, y1)
  if (opts.glow && opts.glow > 0) {
    p.fill(alpha(p, HOME.lamp, 0.85 * opts.glow))
    rect(p, k, x0, y0, x1, y1)
  }
  if (!L.old) {
    // A soft slant of light across the glass.
    p.fill(alpha(p, '#FFFFFF', 0.22 * (1 - L.dark)))
    p.quad((x0 + 0.12) * k, y1 * k, (x0 + 0.42) * k, y0 * k, (x0 + 0.62) * k, y0 * k, (x0 + 0.32) * k, y1 * k)
  } else {
    // Broken: a ragged hole in one pane.
    const cx = x0 + (0.3 + hash(seed, 1) * 0.4) * (x1 - x0)
    const cy = y0 + (0.3 + hash(seed, 2) * 0.4) * (y1 - y0)
    p.fill(dusk(L, '#2E2A28'))
    p.beginShape()
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const r = 0.1 + hash(seed, i + 3) * 0.14
      p.vertex((cx + Math.cos(a) * r) * k, (cy + Math.sin(a) * r * 0.9) * k)
    }
    p.endShape(p.CLOSE)
  }
  p.stroke(c.trim)
  p.strokeWeight(0.06 * k)
  p.line(((x0 + x1) / 2) * k, y0 * k, ((x0 + x1) / 2) * k, y1 * k)
  p.line(x0 * k, ((y0 + y1) / 2) * k, x1 * k, ((y0 + y1) / 2) * k)
  p.stroke(alpha(p, c.ink, 0.8))
  p.strokeWeight(weight * 0.6)
  p.noFill()
  rect(p, k, x0, y0, x1, y1)
  if (opts.boarded && L.old) {
    // Two planks nailed across it.
    for (const [yy, tilt] of [
      [y0 + (y1 - y0) * 0.32, -0.12],
      [y0 + (y1 - y0) * 0.7, 0.09],
    ] as [number, number][]) {
      p.push()
      p.translate(((x0 + x1) / 2) * k, yy * k)
      p.rotate(tilt)
      p.stroke(c.ink)
      p.strokeWeight(weight * 0.7)
      p.fill(c.wood)
      p.rect((-(x1 - x0) / 2 - 0.18) * k, -0.08 * k, (x1 - x0 + 0.36) * k, 0.16 * k)
      p.pop()
    }
  }
  if (opts.shutters) {
    const sw = 0.3
    for (const side of [-1, 1]) {
      const hx = side < 0 ? x0 - 0.12 : x1 + 0.12
      p.push()
      p.translate(hx * k, y0 * k)
      // The old house's left shutter hangs from its bottom hinge; the right one is gone.
      if (L.old && side > 0) {
        p.pop()
        continue
      }
      if (L.old) p.rotate(-0.35)
      p.stroke(c.ink)
      p.strokeWeight(weight * 0.7)
      p.fill(c.pink)
      p.rect(side < 0 ? -sw * k : 0, 0, sw * k, (y1 - y0) * k)
      p.stroke(alpha(p, c.ink, 0.35))
      p.strokeWeight(weight * 0.45)
      for (let i = 1; i < 6; i++) {
        const yy = ((y1 - y0) * i) / 6
        p.line((side < 0 ? -sw + 0.05 : 0.05) * k, yy * k, (side < 0 ? -0.05 : sw - 0.05) * k, yy * k)
      }
      p.pop()
    }
  }
}

/** The front door's leaf: its hinge at the left jamb; open is inward, the leaf narrowing as it turns away. */
export function doorOpen(T: number, swings: DoorSwing[]): number {
  for (const s of swings) {
    if (T < s.open || T > s.shut) continue
    if (T < s.wide) {
      // The latch gives on the note: a crack of the door, and then the slow swing in.
      const crack = 0.1 * Math.min(1, (T - s.open) / 0.07)
      const u = Math.max(0, (T - s.open - 0.12) / (s.wide - s.open - 0.12))
      return crack + (1 - crack) * (u * u * (3 - 2 * u))
    }
    if (T < s.close) return 1
    // Closing: eased in, so it meets the frame with a little pace, and the latch takes it.
    const u = (T - s.close) / (s.shut - s.close)
    return 1 - u * u
  }
  return 0
}

/** Whether the leaf stands behind whoever is in the doorway (swinging open, or open) or in front of them (closing, shut). */
export const doorBehind = (T: number, swings: DoorSwing[]): boolean => swings.some((s) => T >= s.open && T < s.close)

function doorway(p: p5, k: number, L: Look): void {
  const { x0, x1, top } = HOUSE.door
  // The dark of the hall behind the doorway.
  p.noStroke()
  p.fill(dusk(L, L.old ? '#2F2925' : mixHex('#4A3A30', HOME.lamp, 0.35 * L.lamp)))
  rect(p, k, x0, top, x1, P)
}

function door(p: p5, k: number, weight: number, L: Look, c: Pal, swings: DoorSwing[]): void {
  const { x0, x1, top } = HOUSE.door
  const T = L.T
  const w0 = x1 - x0
  let tilt = 0
  let open = doorOpen(T, swings)
  if (T < DOOR_HUNG) {
    // Off its top hinge: hanging from the bottom one, leant out and ajar.
    tilt = 0.1
    open = 0.28
  } else {
    const s = T - DOOR_HUNG
    tilt = 0.1 * Math.exp(-s / 0.24) * Math.cos(s * 11)
  }
  const w = w0 * Math.cos(open * 1.35) + 0.02
  p.push()
  p.translate(x0 * k, P * k)
  p.rotate(tilt)
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.door)
  const h = P - top
  p.rect(0, -h * k, w * k, h * k)
  if (w > 0.3) {
    // A small pane high up, two panels, a brass knob.
    p.fill(dusk(L, L.old ? '#4C5256' : mixHex(HOME.glass, HOME.lamp, 0.5 * L.lamp)))
    p.rect(0.14 * (w / w0) * k, -(h - 0.18) * k, (w - 0.28 * (w / w0)) * k, 0.42 * k)
    p.noFill()
    p.stroke(alpha(p, c.ink, 0.45))
    p.strokeWeight(weight * 0.5)
    p.rect(0.12 * (w / w0) * k, -(h - 0.78) * k, (w - 0.24 * (w / w0)) * k, 0.5 * k)
    p.rect(0.12 * (w / w0) * k, -(h - 1.4) * k, (w - 0.24 * (w / w0)) * k, 0.6 * k)
    p.noStroke()
    p.fill(dusk(L, HOME.brass))
    p.rect((w - 0.13 * (w / w0)) * k, -1.0 * k, 0.05 * k, 0.05 * k, 0.02 * k)
  }
  p.pop()
}

/** The porch: its floor, its roof on one post and a bracket; the steps down to the right. */
function porch(p: p5, k: number, weight: number, L: Look, c: Pal): void {
  const { x0, x1, roof } = HOUSE.porch
  // Under it, the dark behind the lattice.
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.75)
  p.fill(c.found)
  rect(p, k, x0, P, x1, G)
  p.stroke(alpha(p, c.ink, 0.35))
  p.strokeWeight(weight * 0.5)
  for (let x = x0 + 0.2; x < x1 - 0.05; x += 0.22) p.line(x * k, (P + 0.14) * k, x * k, G * k)
  // The floor's edge.
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.wood)
  rect(p, k, x0, P, x1, P + 0.12)
  // The steps: a tread and its riser each. On the old house the top one is gone and the next has split and tipped.
  TREADS.forEach((t, i) => {
    if (L.old && i === 0) {
      p.noStroke()
      p.fill(c.gap)
      rect(p, k, t.x0, t.y, t.x1, G)
      return
    }
    p.stroke(c.ink)
    p.strokeWeight(weight * 0.75)
    p.fill(c.found)
    rect(p, k, t.x0, t.y + 0.1, t.x1, G)
    p.fill(c.wood)
    p.push()
    p.translate(t.x0 * k, t.y * k)
    if (L.old) p.rotate(0.12)
    p.rect(-0.02 * k, 0, (t.x1 - t.x0 + 0.05) * k, 0.1 * k)
    p.pop()
  })
  // The roof over the door: a shed roof off the wall, on a post at the steps' top and a bracket on the wall.
  const sag = L.old ? 0.22 : 0
  const post = x1 - 0.07
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.trim)
  p.push()
  p.translate(post * k, P * k)
  if (L.old) p.rotate(-0.1)
  p.rect(-0.06 * k, -(P - roof - sag) * k, 0.12 * k, (P - roof - sag) * k)
  p.pop()
  p.fill(c.roof)
  p.beginShape()
  p.vertex((x0 + 0.1) * k, (roof - 0.36) * k)
  p.vertex((x1 + 0.2) * k, (roof - 0.12 + sag) * k)
  p.vertex((x1 + 0.2) * k, (roof + 0.02 + sag) * k)
  p.vertex((x0 + 0.1) * k, (roof - 0.2) * k)
  p.endShape(p.CLOSE)
  p.fill(c.trim)
  p.beginShape()
  p.vertex((x0 + 0.1) * k, (roof - 0.2) * k)
  p.vertex((x1 + 0.2) * k, (roof + 0.02 + sag) * k)
  p.vertex((x1 + 0.2) * k, (roof + 0.1 + sag) * k)
  p.vertex((x0 + 0.1) * k, (roof - 0.12) * k)
  p.endShape(p.CLOSE)
}

/** The room seen through the bay: its papered back wall, the floor, the lamp by his chair, the two chairs once they are in. */
function room(p: p5, k: number, weight: number, L: Look, chairsIn: { carl: boolean; ellie: boolean }): void {
  const { x0, x1, sill, head } = HOUSE.bay
  const lit = L.lamp
  const wall = L.old ? dusk(L, '#4E4640') : mixHex(dusk(L, mixHex(HOME.paper, '#D9C39C', L.age * 0.8)), HOME.lamp, 0.55 * lit)
  p.noStroke()
  p.fill(wall)
  rect(p, k, x0, head - 0.1, x1, P)
  if (!L.old) {
    // A picture rail, and the skirting and floor.
    p.fill(alpha(p, dusk(L, HOME.woodDark), 0.5))
    rect(p, k, x0, -2.25, x1, -2.2)
    p.fill(dusk(L, mixHex(HOME.woodDark, HOME.lamp, 0.2 * lit)))
    rect(p, k, x0, P - 0.1, x1, P)
    // The lamp's pool of light on the wall, soft.
    if (lit > 0.01) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      const g = ctx.createRadialGradient(LAMP_X * k, -1.75 * k, 0, LAMP_X * k, -1.75 * k, 2.4 * k)
      g.addColorStop(0, `rgba(255, 227, 166, ${0.55 * lit})`)
      g.addColorStop(1, 'rgba(255, 227, 166, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x0 * k, head * k, (x1 - x0) * k, (P - head) * k)
      ctx.restore()
    }
    // The floor lamp: a brass stand on a round foot, a pleated fabric shade.
    const ink = dusk(L, INK)
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.fill(dusk(L, mixHex(HOME.brass, HOME.woodDark, 0.35)))
    p.rect((LAMP_X - 0.03) * k, -1.74 * k, 0.06 * k, (P - 0.05 + 1.74) * k)
    p.ellipse(LAMP_X * k, (P - 0.04) * k, 0.3 * k, 0.07 * k)
    const shadeCol = mixHex(dusk(L, mixHex(HOME.pink, HOME.trim, 0.55 + 0.2 * L.age)), HOME.lamp, lit)
    p.fill(shadeCol)
    p.quad((LAMP_X - 0.1) * k, -2.1 * k, (LAMP_X + 0.1) * k, -2.1 * k, (LAMP_X + 0.19) * k, -1.72 * k, (LAMP_X - 0.19) * k, -1.72 * k)
    p.stroke(alpha(p, ink, 0.3))
    p.strokeWeight(weight * 0.45)
    for (const u of [-0.5, 0, 0.5]) p.line((LAMP_X + u * 0.1) * k, -2.08 * k, (LAMP_X + u * 0.19) * k, -1.74 * k)
  } else {
    // The empty clubhouse: dust in the corners, a fallen board.
    p.fill(alpha(p, '#2E2A28', 0.35))
    rect(p, k, x0, P - 0.25, x1, P)
    p.push()
    p.translate(2.9 * k, (P - 0.05) * k)
    p.rotate(-0.35)
    p.fill(dusk(L, mixHex(HOME.woodDark, DUST, 0.4)))
    p.rect(0, -0.07 * k, 0.9 * k, 0.1 * k)
    p.pop()
  }
  // The chairs, once they are in: faded with the years, and dimmed by the dusk but for the lamp's light.
  const shade = L.dark * 0.78 * (1 - 0.7 * lit)
  if (chairsIn.carl) drawChair(p, k, weight, 'carl', CHAIRS.carl, P, L.age, 1, shade)
  if (chairsIn.ellie) drawChair(p, k, weight, 'ellie', CHAIRS.ellie, P, L.age, 1, shade)
  void CHAIR
  void sill
}

/** The bay's panes: glass in every opening but the middle one, which the old house has lost and the fix-up slides back. */
function bayGlass(p: p5, k: number, L: Look): void {
  const { x0, x1, sill, head, facet } = HOUSE.bay
  const T = L.T
  const panes: [number, number, boolean][] = [
    [x0, x0 + facet, false],
    [x0 + facet, x1 - facet, true],
    [x1 - facet, x1, false],
  ]
  p.noStroke()
  for (const [a, b, middle] of panes) {
    if (middle && (L.old || T < PANE_AT - 0.42)) continue
    // The middle pane slides down out of the head, gathering speed, and lands on the sill on its beat.
    let drop = 0
    if (middle && T < PANE_AT) {
      const u = (T - (PANE_AT - 0.42)) / 0.42
      drop = (sill - head) * (1 - u * u)
    }
    const tint = L.old ? alpha(p, dusk(L, '#565B5E'), 0.62) : alpha(p, dusk(L, HOME.glass), 0.16 + 0.2 * L.dark * (1 - L.lamp))
    p.fill(tint)
    rect(p, k, a, head, b, sill - drop)
    if (middle && !L.old && T >= PANE_AT - 0.42 && T < PANE_AT + 0.5) {
      // A glint running up the new glass as it lands.
      const g = Math.max(0, 1 - Math.abs(T - PANE_AT) / 0.5)
      p.fill(alpha(p, '#FFFFFF', 0.35 * g))
      rect(p, k, a + 0.1, head, a + 0.3, sill - drop)
    }
  }
  if (L.old) {
    // The side panes, dust-dark and holed.
    p.fill(alpha(p, '#2E2A28', 0.7))
    for (const [cx, cy, s] of [
      [x0 + facet / 2, -1.9, 1],
      [x1 - facet / 2, -1.2, 2],
    ] as [number, number, number][]) {
      p.beginShape()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const r = 0.08 + hash(s, i) * 0.1
        p.vertex((cx + Math.cos(a) * r) * k, (cy + Math.sin(a) * r * 1.4) * k)
      }
      p.endShape(p.CLOSE)
    }
  }
}

/**
 * What stands in front of anyone indoors: the bay's frame (its head, its sill, the posts between its three faces,
 * the middle pane's bars) and the glass's sheen, the wall between the bay and the door, and the door's jambs. The
 * parts draw it in their `over`, so the two of them are indoors behind it.
 */
export function drawFacadeFront(p: p5, k: number, weight: number, L: Look, swings: DoorSwing[] = []): void {
  const c = palette(L)
  if (swings.length && !doorBehind(L.T, swings)) {
    p.push()
    p.rectMode(p.CORNER)
    door(p, k, weight, L, c, swings)
    p.pop()
  }
  const { x0, x1, sill, head, facet } = HOUSE.bay
  p.push()
  p.rectMode(p.CORNER)
  // The glass's sheen: two soft slants, fainter as the room behind it is lit.
  if (!L.old) {
    p.noStroke()
    const a = 0.12 * (1 - 0.6 * L.lamp)
    p.fill(alpha(p, '#FFFFFF', a))
    p.quad((x0 + facet + 0.25) * k, sill * k, (x0 + facet + 0.95) * k, head * k, (x0 + facet + 1.25) * k, head * k, (x0 + facet + 0.55) * k, sill * k)
    p.fill(alpha(p, '#FFFFFF', a * 0.6))
    p.quad((x1 - facet - 0.9) * k, sill * k, (x1 - facet - 0.35) * k, head * k, (x1 - facet - 0.2) * k, head * k, (x1 - facet - 0.75) * k, sill * k)
  }
  // The frame: head, sill, the two posts where the faces turn, the middle pane's bars.
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.trim)
  rect(p, k, x0 - 0.08, head - 0.14, x1 + 0.08, head)
  rect(p, k, x0 - 0.12, sill, x1 + 0.12, sill + 0.1)
  for (const x of [x0, x0 + facet, x1 - facet, x1]) rect(p, k, x - 0.05, head, x + 0.05, sill)
  const midPane = !L.old && L.T >= PANE_AT - 0.5
  if (midPane) {
    const mx = (x0 + x1) / 2
    p.noStroke()
    p.fill(c.trim)
    rect(p, k, mx - 0.03, head, mx + 0.03, sill)
    rect(p, k, x0 + facet, -2.2, x1 - facet, -2.15)
    p.stroke(alpha(p, c.ink, 0.5))
    p.strokeWeight(weight * 0.4)
    p.line((mx - 0.03) * k, head * k, (mx - 0.03) * k, sill * k)
    p.line((mx + 0.03) * k, head * k, (mx + 0.03) * k, sill * k)
  }
  // The side faces' transoms.
  p.noStroke()
  p.fill(c.trim)
  rect(p, k, x0, -2.2, x0 + facet, -2.15)
  rect(p, k, x1 - facet, -2.2, x1, -2.15)
  // The wall between the bay and the door, up to the porch roof, and the door's jambs and head.
  const d = HOUSE.door
  siding(p, k, weight, L, c, x1 + 0.08, d.x0, HOUSE.porch.roof, P, 7)
  // And the wall over the door, up under the porch roof: what anyone indoors (and the balloon) is behind.
  siding(p, k, weight, L, c, d.x0 - 0.08, d.x1 + 0.08, -2.86, d.top, 8)
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.trim)
  rect(p, k, d.x0 - 0.08, d.top - 0.12, d.x1 + 0.08, d.top)
  rect(p, k, d.x0 - 0.08, d.top, d.x0, P)
  rect(p, k, d.x1, d.top, d.x1 + 0.08, P)
  p.pop()
}

/** The mailbox at the street: a box on a post, the flag on its end; leaning and dull on the old house. The prints once pressed. */
function mailbox(p: p5, k: number, weight: number, L: Look, c: Pal): void {
  const { x, box } = MAILBOX
  const [bx0, bx1, top, bottom] = box
  const T = L.T
  p.push()
  p.translate(x * k, G * k)
  if (L.old) p.rotate(-0.13)
  else {
    // Knocked upright by the blow on its post: a small shiver, settling.
    const s = T - FLAG_AT
    if (s > 0) p.rotate(0.035 * Math.exp(-s / 0.3) * Math.sin(s * 14))
  }
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.75)
  p.fill(c.wood)
  p.rect(-0.05 * k, (bottom - G) * k, 0.1 * k, (G - bottom) * k)
  const X = (v: number) => (v - x) * k
  const Y = (v: number) => (v - G) * k
  const body = L.old ? dusk(L, mixHex('#9A948A', '#7E6E62', 0.4)) : dusk(L, mixHex(HOME.yellow, '#D9C08A', L.age))
  p.fill(body)
  p.rect(X(bx0), Y(top), (bx1 - bx0) * k, (bottom - top) * k, 0.14 * k, 0.14 * k, 0.02 * k, 0.02 * k)
  // The door at its street end, and the flag on its arm at the house end.
  p.stroke(alpha(p, c.ink, 0.45))
  p.strokeWeight(weight * 0.5)
  p.line(X(bx0 + 0.08), Y(top + 0.06), X(bx0 + 0.08), Y(bottom - 0.02))
  const up = L.old ? 0 : smooth(T, FLAG_AT, FLAG_AT + 0.12)
  const s = T - FLAG_AT
  const wob = !L.old && s > 0 ? 0.25 * Math.exp(-s / 0.35) * Math.sin(s * 11) : 0
  const ang = L.old ? 0.35 : (1 - up) * 0 + up * (-Math.PI / 2) + wob
  p.push()
  p.translate(X(bx1 - 0.05), Y(bottom - 0.12))
  p.rotate(ang)
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.6)
  p.line(0, 0, 0.34 * k, 0)
  p.noStroke()
  p.fill(dusk(L, L.old ? mixHex(HOME.pink, DUST, 0.6) : mixHex('#D9574B', '#B98A82', L.age)))
  p.rect(0.2 * k, -0.07 * k, 0.16 * k, 0.1 * k)
  p.pop()
  // The prints: two hands pressed into the wet paint, fingers up, the thumbs reaching toward each other, so they read
  // as a pair of hands and never as two more of them: small (a palm under half his width), in a paint
  // tone (the box's own colour pressed darker, only tinted with theirs), no outline. His palm is square, hers round.
  if (!L.old) {
    const print = (who: 'carl' | 'ellie', at: number) => {
      if (T < at) return
      const col = who === 'carl' ? carlAt(at) : ellieAt(at)
      const [px, py] = PRINTS[who]
      const side = who === 'carl' ? -1 : 1
      const paint = mixHex(mixHex(body, col, 0.42), INK, 0.22 + 0.1 * L.age)
      p.push()
      p.translate(X(px), Y(py + 0.02))
      p.rotate(side * 0.06)
      p.noStroke()
      p.fill(alpha(p, dusk(L, paint), 0.86))
      p.rectMode(p.CENTER)
      const pw = 0.11
      const ph = 0.1
      if (who === 'carl') p.rect(0, 0, pw * k, ph * k, 0.025 * k)
      else p.ellipse(0, 0, pw * 1.04 * k, ph * 1.06 * k)
      // Four fingers, a little splayed, the middle ones longest; the thumb out to the side, lower.
      const lens = [0.052, 0.07, 0.066, 0.05]
      for (let i = 0; i < 4; i++) {
        const fx = (-0.0375 + i * 0.025) * -side
        const ang = (i - 1.5) * 0.09 * -side
        p.push()
        p.translate(fx * k, (-ph / 2 + 0.008) * k)
        p.rotate(ang)
        p.rect(0, -lens[i] / 2 * k, 0.021 * k, lens[i] * k, 0.0105 * k)
        p.pop()
      }
      p.push()
      p.translate(-side * (pw / 2 - 0.008) * k, 0.005 * k)
      p.rotate(-side * 0.95)
      p.rect(0, -0.026 * k, 0.024 * k, 0.052 * k, 0.012 * k)
      p.pop()
      p.pop()
    }
    print('carl', PRINT_AT.carl)
    print('ellie', PRINT_AT.ellie)
  }
  p.pop()
}

/** The whole house in one condition. `chairsIn` says which chairs are standing in the room. */
export function drawHouse(p: p5, k: number, weight: number, L: Look, chairsIn: { carl: boolean; ellie: boolean }, swings: DoorSwing[], frontHere = true): void {
  const c = palette(L)
  const H = HOUSE
  const T = L.T
  p.push()
  p.rectMode(p.CORNER)

  // The main roof: a broad slope of shingles from the eaves to the ridge, and the chimney out of it.
  const [r0, r1] = H.roof
  const sagMid = L.old ? 0.16 : 0
  p.stroke(c.ink)
  p.strokeWeight(weight)
  p.fill(c.roof)
  p.beginShape()
  p.vertex(r0 * k, (H.eaves + 0.05) * k)
  p.vertex((r0 + 0.3) * k, H.ridge * k)
  p.bezierVertex(((r0 + r1) / 2 - 1) * k, (H.ridge + sagMid) * k, ((r0 + r1) / 2 + 1) * k, (H.ridge + sagMid) * k, (r1 - 0.3) * k, H.ridge * k)
  p.vertex(r1 * k, (H.eaves + 0.05) * k)
  p.endShape(p.CLOSE)
  // Rows of shingles.
  p.stroke(alpha(p, c.ink, 0.22))
  p.strokeWeight(weight * 0.45)
  for (let y = H.eaves - 0.34, row = 0; y > H.ridge + 0.15; y -= 0.34, row++) {
    p.line((r0 + 0.1) * k, y * k, (r1 - 0.1) * k, y * k)
    for (let x = r0 + 0.2 + (row % 2) * 0.22; x < r1 - 0.2; x += 0.44) p.line(x * k, y * k, x * k, (y + 0.1) * k)
  }
  if (L.old) {
    // Shingles gone: the dark of the attic through the gaps.
    p.noStroke()
    p.fill(c.gap)
    for (const [x, y, w] of [
      [1.2, -6.4, 0.9],
      [5.4, -7.1, 0.7],
      [7.1, -6.0, 0.55],
    ] as [number, number, number][]) p.rect(x * k, y * k, w * k, 0.3 * k)
  } else if (T >= TREE_AT) {
    // Where the tree came through: a patch of newer shingles, a shade off the rest, nailed over the hole.
    const [px0, px1, py0, py1] = [6.55, 7.5, -7.15, -6.45]
    p.stroke(alpha(p, c.ink, 0.55))
    p.strokeWeight(weight * 0.6)
    p.fill(dusk(L, mixHex(mixHex(HOME.roof, HOME.roofOld, L.age), '#C49070', 0.3)))
    p.rect(px0 * k, py0 * k, (px1 - px0) * k, (py1 - py0) * k, 0.02 * k)
    p.stroke(alpha(p, c.ink, 0.25))
    p.strokeWeight(weight * 0.45)
    for (let y = py0 + 0.23; y < py1 - 0.05; y += 0.23) p.line((px0 + 0.04) * k, y * k, (px1 - 0.04) * k, y * k)
  }
  const [c0, c1, ctop] = H.chimney
  p.stroke(c.ink)
  p.strokeWeight(weight)
  p.fill(c.brick)
  if (L.old) {
    p.beginShape()
    p.vertex(c0 * k, (H.ridge + 0.6) * k)
    p.vertex(c0 * k, (ctop + 0.3) * k)
    p.vertex((c0 + 0.2) * k, (ctop + 0.18) * k)
    p.vertex((c0 + 0.32) * k, (ctop + 0.42) * k)
    p.vertex(c1 * k, (ctop + 0.36) * k)
    p.vertex(c1 * k, (H.ridge + 0.6) * k)
    p.endShape(p.CLOSE)
  } else {
    rect(p, k, c0, ctop, c1, H.ridge + 0.6)
    rect(p, k, c0 - 0.1, ctop - 0.16, c1 + 0.1, ctop)
  }
  p.stroke(alpha(p, c.ink, 0.25))
  p.strokeWeight(weight * 0.45)
  for (let y = ctop + 0.25; y < H.ridge + 0.55; y += 0.2) p.line(c0 * k, y * k, c1 * k, y * k)

  // The walls: the ground floor and upstairs in clapboard, a band between, corner boards.
  siding(p, k, weight, L, c, H.x0, H.x1, H.eaves, P, 1)
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.trim)
  rect(p, k, H.x0 - 0.05, H.band[1], H.x1 + 0.05, H.band[0])
  rect(p, k, H.x0 - 0.1, H.eaves, H.x0 + 0.08, P)
  rect(p, k, H.x1 - 0.08, H.eaves, H.x1 + 0.1, P)
  // The foundation.
  p.fill(c.found)
  rect(p, k, H.x0 - 0.1, P, H.x1 + 0.1, G)

  // The front gable over the bay: scalloped shingles in yellow, its rakes, the little window high in it.
  const g = H.gable
  const gm = (g.x0 + g.x1) / 2
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.9)
  p.fill(c.gable)
  p.triangle(g.x0 * k, H.eaves * k, gm * k, g.apex * k, g.x1 * k, H.eaves * k)
  p.stroke(alpha(p, c.ink, 0.22))
  p.strokeWeight(weight * 0.45)
  p.noFill()
  for (let y = H.eaves - 0.24, row = 0; y > g.apex + 0.3; y -= 0.24, row++) {
    const half = ((y - g.apex) / (H.eaves - g.apex)) * (g.x1 - g.x0) / 2 - 0.08
    for (let x = gm - half + (row % 2) * 0.1; x < gm + half - 0.1; x += 0.2) p.arc((x + 0.1) * k, y * k, 0.2 * k, 0.16 * k, 0, Math.PI)
  }
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.9)
  p.fill(c.trim)
  for (const side of [-1, 1]) {
    const ex = side < 0 ? g.x0 - 0.2 : g.x1 + 0.2
    p.quad(ex * k, (H.eaves + 0.05) * k, gm * k, (g.apex - 0.14) * k, gm * k, (g.apex + 0.02) * k, (ex + side * -0.02) * k, (H.eaves + 0.21) * k)
  }
  const [a0, a1, ay0, ay1] = H.attic
  windowAt(p, k, weight, L, c, a0, a1, ay0, ay1, 11, { boarded: true })
  // The eaves' fascia, left and right of the gable.
  p.fill(c.trim)
  rect(p, k, r0, H.eaves - 0.02, g.x0 - 0.15, H.eaves + 0.12)
  rect(p, k, g.x1 + 0.15, H.eaves - 0.02, r1, H.eaves + 0.12)

  // Upstairs windows: two under the gable, and one on the right with its shutters.
  const [uy0, uy1] = H.upperY
  H.upper.forEach(([x0, x1], i) => windowAt(p, k, weight, L, c, x0, x1, uy0, uy1, 20 + i, { shutters: i === 2 }))
  // The ground floor's side window, boarded up on the old house.
  const [sx0, sx1, sy0, sy1] = H.side
  windowAt(p, k, weight, L, c, sx0, sx1, sy0, sy1, 30, { boarded: true, glow: 0 })

  // The bay: the room behind its glass, the glass, its little roof. (Its frame is `drawFacadeFront`.)
  const b = H.bay
  room(p, k, weight, L, chairsIn)
  bayGlass(p, k, L)
  // While nobody is indoors the set draws the bay's frame itself; once they go in, the parts draw it over them.
  if (frontHere) drawFacadeFront(p, k, weight, L)
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.siding)
  rect(p, k, b.x0 - 0.12, b.sill + 0.1, b.x1 + 0.12, P + 0.02)
  p.fill(c.roof)
  p.quad((b.x0 - 0.22) * k, (b.head - 0.12) * k, (b.x1 + 0.22) * k, (b.head - 0.12) * k, (b.x1 - 0.15) * k, b.top * k, (b.x0 + 0.15) * k, b.top * k)

  // The door, the porch, the steps. Once anyone goes in, the leaf is the parts' to draw whenever it is not open.
  doorway(p, k, L)
  if (frontHere || doorBehind(T, swings)) door(p, k, weight, L, c, swings)
  porch(p, k, weight, L, c)

  // Weeds at the old house's feet.
  if (L.old) {
    p.stroke(dusk(L, mixHex(HOME.grass, DUST, 0.35)))
    p.strokeWeight(weight * 0.7)
    for (let i = 0; i < 26; i++) {
      const x = -0.3 + hash(i, 41) * 10.2
      if (x > EDGE - 0.1 && x < EDGE + 0.8) continue
      const h = 0.18 + hash(i, 42) * 0.3
      const lean = (hash(i, 43) - 0.5) * 0.2
      p.line(x * k, G * k, (x + lean) * k, (G - h) * k)
      p.line((x + 0.05) * k, G * k, (x + 0.05 + lean * 1.6) * k, (G - h * 0.7) * k)
    }
  }

  mailbox(p, k, weight, L, c)
  p.pop()
}
