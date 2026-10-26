import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { HOME, INK, carlAt, ellieAt } from '../worlds'
import { drawChair, CHAIR } from '../props/chairs'
import { stripe } from '../inside/papers'
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
  /** 0 .. 1: how far the first snow has settled (the end only). */
  snow?: number
}

const NIGHT = '#27304A'
const DUST = '#8F8B82'

/** A colour under the dusk. */
export const dusk = (L: Look, hex: string): string => mixHex(hex, NIGHT, L.dark * 0.78)

/** Settled snow in the light of the hour: pale, and dimmed by the night less than what it lies on. */
export const snowTone = (L: Look): string => mixHex('#E9EDF4', NIGHT, L.dark * 0.5)

function palette(L: Look) {
  const a = L.age
  const s = (h: string) => dusk(L, h)
  return {
    siding: s(L.old ? mixHex(HOME.sidingOld, DUST, 0.62) : mixHex(HOME.siding, HOME.sidingOld, a)),
    trim: s(L.old ? mixHex(HOME.trim, DUST, 0.55) : mixHex(HOME.trim, '#E6DAC2', a)),
    roof: mixHex(s(L.old ? mixHex(HOME.roofOld, '#6A625C', 0.55) : mixHex(HOME.roof, HOME.roofOld, a)), snowTone(L), 0.3 * (L.snow ?? 0)),
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

/**
 * What hangs at the house's windows once it is lived in (from his coming home alone; at the fix-up it is new and
 * empty): the nursery's pink at the two under the gable, drawn shut since the doctor as they are inside; their
 * bedroom's cream, and the living room's faded green, tied back.
 */
const CLOTH = {
  nursery: mixHex(HOME.pink, HOME.trim, 0.45),
  bedroom: mixHex(HOME.trim, '#D9C7A8', 0.55),
  living: mixHex(mixHex(HOME.leaf, HOME.trim, 0.52), '#C9C6B4', 0.7),
}
const LIVED_IN = 200

/** Curtains seen through a window's glass, x0..x1 by y0..y1: two panels tied back to the jambs, or drawn across. */
function curtainsIn(p: p5, k: number, weight: number, L: Look, x0: number, x1: number, y0: number, y1: number, cloth: string, drawn: boolean): void {
  const w = x1 - x0
  const h = y1 - y0
  const fill = dusk(L, mixHex(cloth, HOME.glass, 0.18))
  const fold = dusk(L, mixHex(cloth, INK, 0.2))
  p.noStroke()
  p.fill(fill)
  if (drawn) {
    rect(p, k, x0, y0, x1, y1)
    p.stroke(fold)
    p.strokeWeight(weight * 0.5)
    for (let i = 1; i < 8; i++) {
      if (i === 4) continue
      const x = x0 + (w * i) / 8
      p.line(x * k, (y0 + 0.04) * k, x * k, (y1 - 0.02) * k)
    }
    return
  }
  const tie = y0 + h * 0.6
  for (const side of [-1, 1]) {
    const jamb = side < 0 ? x0 : x1
    const at = (u: number) => jamb - side * u * w
    p.noStroke()
    p.fill(fill)
    p.beginShape()
    p.vertex(at(0) * k, y0 * k)
    p.vertex(at(0.27) * k, y0 * k)
    p.bezierVertex(at(0.25) * k, (y0 + h * 0.3) * k, at(0.11) * k, (tie - h * 0.08) * k, at(0.11) * k, tie * k)
    p.bezierVertex(at(0.11) * k, (tie + h * 0.12) * k, at(0.2) * k, (y1 - h * 0.12) * k, at(0.21) * k, y1 * k)
    p.vertex(at(0) * k, y1 * k)
    p.endShape(p.CLOSE)
    p.stroke(fold)
    p.strokeWeight(weight * 0.5)
    for (const u of [0.09, 0.18]) p.line(at(u) * k, (y0 + 0.04) * k, at(u * 0.45) * k, (tie - 0.02) * k)
  }
}

/** A window: frame, glass (the sky in it, or broken dark on the old house), a sash bar. Shutters where asked; curtains once it is lived in. */
function windowAt(p: p5, k: number, weight: number, L: Look, c: Pal, x0: number, x1: number, y0: number, y1: number, seed: number, opts: { shutters?: boolean; boarded?: boolean; glow?: number; curtain?: { cloth: string; drawn: boolean } } = {}): void {
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
  if (opts.curtain && !L.old && L.T > LIVED_IN) curtainsIn(p, k, weight, L, x0, x1, y0, y1, opts.curtain.cloth, opts.curtain.drawn)
  if (L.old) {
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
    // (The lower panel stops short of the leaf's foot: it ran 0.08 past it, onto the porch boards.)
    p.rect(0.12 * (w / w0) * k, -(h - 0.78) * k, (w - 0.24 * (w / w0)) * k, 0.5 * k)
    p.rect(0.12 * (w / w0) * k, -(h - 1.36) * k, (w - 0.24 * (w / w0)) * k, 0.46 * k)
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
  const th = snowDepth(L)
  if (th > 0) {
    p.noStroke()
    p.fill(snowTone(L))
    p.quad((x0 + 0.12) * k, (roof - 0.36 - th) * k, (x1 + 0.18) * k, (roof - 0.12 + sag - th) * k, (x1 + 0.2) * k, (roof - 0.11 + sag) * k, (x0 + 0.1) * k, (roof - 0.35) * k)
  }
}

/** How deep the settled snow lies on a roof's top edge (cells), growing from a line. */
const snowDepth = (L: Look): number => ((L.snow ?? 0) > 0 ? 0.015 + 0.11 * (L.snow ?? 0) : 0)

/** The room seen through the bay: its papered back wall, the floor, the lamp by his chair, the two chairs once they are in. */
function room(p: p5, k: number, weight: number, L: Look, chairsIn: { carl: boolean; ellie: boolean }): void {
  const { x0, x1, sill, head } = HOUSE.bay
  const lit = L.lamp
  const wall = L.old ? dusk(L, '#4E4640') : mixHex(dusk(L, mixHex(HOME.paper, '#D9C39C', L.age * 0.8)), HOME.lamp, 0.55 * lit)
  p.noStroke()
  p.fill(wall)
  rect(p, k, x0, head - 0.1, x1, P)
  if (!L.old) {
    // Its paper, the living room's (`inside/papers.ts`): the same room from the street.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const papered = { x0, x1, y0: head - 0.1, y1: P - 0.1 }
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, papered.y0 * k, (x1 - x0) * k, (papered.y1 - papered.y0) * k)
    ctx.clip()
    stripe(ctx, k, papered, papered, wall, 1 - 0.35 * L.age)
    ctx.restore()
    // The skirting and floor. (No picture rail: at the end the balloon floats over her chair at its height, and a
    // line behind the balloon's lower third read as a cut through it.)
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
 * the middle pane's mullion), the wall between the bay and the door, and the door's jambs. The
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
  // The frame: head, sill, the two posts where the faces turn, the middle pane's mullion. The middle light has no
  // transom: at the end the balloon over her chair spans −2.77 … −2.07, head to lamp, so any bar across it cuts the
  // balloon or the lampshade; its glass runs whole from head to floor, a picture window between two transomed sides.
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
  // The wall between the bay and the door, up to the porch roof, and the door's jambs and head. It meets the bay's
  // corner post (x1 + 0.05): a gap there showed a slit of the balloon between post and wall as he came in.
  const d = HOUSE.door
  siding(p, k, weight, L, c, x1 + 0.05, d.x0, HOUSE.porch.roof, P, 7)
  // And the wall over the door, up under the porch roof: what anyone indoors (and the balloon) is behind. Clipped to the
  // roof's underside, which slopes across it (drawn square, it covered a notch of the roof's trim), and its laps on the
  // wall's own (they ran 0.08 off the wall's either side of it, so it read as a patch).
  {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const { x0: px0, x1: px1, roof } = HOUSE.porch
    const sag = L.old ? 0.22 : 0
    const under = (x: number) => roof - 0.12 + ((x - (px0 + 0.1)) / (px1 + 0.1 - px0)) * (0.22 + sag)
    const wx0 = d.x0 - 0.08
    const wx1 = d.x1 + 0.08
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx0 * k, under(wx0) * k)
    ctx.lineTo(wx1 * k, under(wx1) * k)
    ctx.lineTo(wx1 * k, d.top * k)
    ctx.lineTo(wx0 * k, d.top * k)
    ctx.closePath()
    ctx.clip()
    const top = P - 0.2 * Math.ceil((P + 2.9) / 0.2)
    siding(p, k, weight, L, c, wx0, wx1, top, P, 8)
    ctx.restore()
  }
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.trim)
  rect(p, k, d.x0 - 0.08, d.top - 0.12, d.x1 + 0.08, d.top)
  rect(p, k, d.x0 - 0.08, d.top, d.x0, P)
  rect(p, k, d.x1, d.top, d.x1 + 0.08, P)
  p.pop()
}

/**
 * The lit room's light out through the bay at night, where it falls: across the porch floor beside the bay (through
 * the bay's side light, which faces the porch) and on the floor's edge by the door, fading as it goes. Not on the
 * clapboard round the window, which faces the same way the glass does and so gets none of it; the lawn's share is the
 * set's (`front.ts`). Flat warm layers, no gradient.
 */
export function drawBayLight(p: p5, k: number, L: Look): void {
  const a = L.lamp * Math.max(0, Math.min(1, (L.dark - 0.3) / 0.4))
  if (a <= 0.01 || L.old) return
  const { x1 } = HOUSE.bay
  const { x1: px1 } = HOUSE.porch
  p.push()
  // Its own corner rects: the stage's centred ones laid it back across the bay's posts and up off the floor.
  p.rectMode(p.CORNER)
  p.noStroke()
  // The floor's front edge, lit from the bay's corner and fading toward the steps in even steps.
  const from = x1 + 0.08
  for (let i = 0; i < 6; i++) {
    p.fill(alpha(p, HOME.lamp, 0.07 * a))
    rect(p, k, from, P, from + (px1 - from) * (1 - i / 6), P + 0.12)
  }
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
  const cap = snowDepth(L)
  if (cap > 0 && !L.old) {
    p.push()
    p.noStroke()
    p.fill(snowTone(L))
    p.rect(X(bx0 + 0.03), Y(top - cap * 0.7), (bx1 - bx0 - 0.06) * k, (cap * 0.7 + 0.03) * k, 0.1 * k, 0.1 * k, 0, 0)
    p.pop()
  }
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
  // The first snow, settling: a line along the ridge and down the roof's ends (behind the chimney), and on its cap.
  const th = snowDepth(L)
  if (th > 0 && !L.old) {
    p.noStroke()
    p.fill(snowTone(L))
    p.beginShape()
    p.vertex(r0 * k, (H.eaves + 0.04) * k)
    p.vertex((r0 + 0.3) * k, H.ridge * k)
    p.vertex((r1 - 0.3) * k, H.ridge * k)
    p.vertex(r1 * k, (H.eaves + 0.04) * k)
    p.vertex((r1 - 0.06) * k, (H.eaves + 0.04) * k)
    p.vertex((r1 - 0.3 - 0.4 * th) * k, (H.ridge + th) * k)
    p.vertex((r0 + 0.3 + 0.4 * th) * k, (H.ridge + th) * k)
    p.vertex((r0 + 0.06) * k, (H.eaves + 0.04) * k)
    p.endShape(p.CLOSE)
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
  if (th > 0 && !L.old) {
    p.noStroke()
    p.fill(snowTone(L))
    rect(p, k, c0 - 0.1, ctop - 0.16 - th * 0.8, c1 + 0.1, ctop - 0.15)
  }

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
  if (th > 0 && !L.old) {
    // Snow along the gable's rakes and the eaves.
    p.noStroke()
    p.fill(snowTone(L))
    for (const side of [-1, 1]) {
      const ex = side < 0 ? g.x0 - 0.2 : g.x1 + 0.2
      p.quad(ex * k, (H.eaves + 0.05) * k, gm * k, (g.apex - 0.14) * k, gm * k, (g.apex - 0.14 - th) * k, ex * k, (H.eaves + 0.05 - th) * k)
    }
    rect(p, k, r0, H.eaves - 0.02 - th * 0.6, g.x0 - 0.15, H.eaves - 0.02)
    rect(p, k, g.x1 + 0.15, H.eaves - 0.02 - th * 0.6, r1, H.eaves - 0.02)
  }

  // Upstairs windows: two under the gable, and one on the right with its shutters.
  const [uy0, uy1] = H.upperY
  H.upper.forEach(([x0, x1], i) =>
    windowAt(p, k, weight, L, c, x0, x1, uy0, uy1, 20 + i, { shutters: i === 2, curtain: i === 2 ? { cloth: CLOTH.bedroom, drawn: false } : { cloth: CLOTH.nursery, drawn: true } }),
  )
  // The ground floor's side window, boarded up on the old house.
  const [sx0, sx1, sy0, sy1] = H.side
  windowAt(p, k, weight, L, c, sx0, sx1, sy0, sy1, 30, { boarded: true, glow: 0, curtain: { cloth: CLOTH.living, drawn: false } })

  // The bay: the room behind its glass, the glass, its little roof. (Its frame is `drawFacadeFront`.)
  const b = H.bay
  room(p, k, weight, L, chairsIn)
  bayGlass(p, k, L)
  // While nobody is indoors the set draws the bay's frame itself; once they go in, the parts draw it over them.
  if (frontHere) drawFacadeFront(p, k, weight, L)
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.8)
  p.fill(c.siding)
  // The apron under the bay's sill, down to the porch floor: none now the sill is the floor (it would cover the sill).
  if (b.sill + 0.1 < P + 0.02) rect(p, k, b.x0 - 0.12, b.sill + 0.1, b.x1 + 0.12, P + 0.02)
  p.fill(c.roof)
  p.quad((b.x0 - 0.22) * k, (b.head - 0.12) * k, (b.x1 + 0.22) * k, (b.head - 0.12) * k, (b.x1 - 0.15) * k, b.top * k, (b.x0 + 0.15) * k, b.top * k)
  if (th > 0 && !L.old) {
    p.noStroke()
    p.fill(snowTone(L))
    rect(p, k, b.x0 + 0.15, b.top - th * 0.8, b.x1 - 0.15, b.top + 0.01)
  }

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

/* ------------------------------------------------------------------ the neighbours */

/**
 * His neighbours, on his own side of the street, at his house's depth and scale: a cottage with a porch and a dormer,
 * a two-storey with its gable to the street, a long low bungalow, and one with a bay. Each on its lot with its lawn,
 * a front path, a picket fence or a hedge along the pavement, and a porch light by the door.
 *
 * They stand beyond the widest frame of the fix-up and of every frame of his coming home (out past the street lamps,
 * clear of a 2:1 screen's frame too), so the camera's last draw-back is the first time they are seen, and each comes
 * into the frame in turn as it widens. By then it is night: they are silhouettes against the afterglow a little
 * lighter than the street's far side so they stand in front of it, their porch lights off. A window or two in the
 * first three is still lit as it comes in, a flat warm pane, and in the quiet after the piano's last note the street
 * goes to bed: the lights go out one at a time, the last some four seconds before the end, until the one lit window
 * in the street is his. (By day, were a wide screen ever to show one, they are in their pastels.)
 */
interface Neighbour {
  kind: 'cottage' | 'gable' | 'bungalow' | 'bay'
  x0: number
  x1: number
  /** The lot's front along the pavement, what runs along it, and its path's middle (the door's). */
  lot: [number, number]
  fence: 'picket' | 'hedge'
  path: number
  /** Its paint by day: walls, roof. */
  day: [string, string]
  /** Its windows still lit as it comes in (each by its place in the order they are drawn), and when each goes out. */
  lit?: [number, number][]
}

/**
 * Where they stand, nearest first: the cottage past the right lamp, the bungalow past the left one (long and low, so the
 * hospital on the far ridge stands clear over its roof), the gable house at the right edge of the last frame, the house
 * with the bay out at its left. All of them out past the frame of the cut from the church (to -9.42) and of the fix-up's
 * reveal (to 15.41), with room for a 2:1 screen. They come into the frame at about 237, 241, 249 and 254 s; their
 * lights go out at 244.6 (the cottage's front room), 247.4 (its dormer), 250.6 (the bungalow) and 253.9 (the gable
 * house's landing), and the house with the bay comes in dark.
 */
export const NEIGHBOURS: Neighbour[] = [
  { kind: 'cottage', x0: 16.9, x1: 21.5, lot: [16.6, 22.0], fence: 'picket', path: 18.15, day: ['#EAD9A6', '#8A6A5A'], lit: [[2, 244.6], [0, 247.4]] },
  { kind: 'bungalow', x0: -16.7, x1: -10.6, lot: [-17.1, -10.3], fence: 'hedge', path: -13.1, day: ['#C9D3B4', '#8C5E4A'], lit: [[2, 250.6]] },
  { kind: 'gable', x0: 22.5, x1: 28.0, lot: [22.2, 28.6], fence: 'hedge', path: 26.9, day: ['#B9C6D0', '#6F6670'], lit: [[1, 253.9]] },
  { kind: 'bay', x0: -24.8, x1: -18.0, lot: [-25.4, -17.5], fence: 'picket', path: -23.55, day: ['#E3C0BA', '#6E5A55'] },
]

/** The night's tones they go to: a little lighter than the far side of the street. */
const NB = { wall: '#3A4160', roof: '#30364F', trim: '#4A516E', pane: '#1D2131', door: '#2A2F46', found: '#2D3247', hedge: '#29353F', fence: '#4B5271', path: '#454A60' }
/** A neighbour's lit window: a room's light through a blind, warmer and lower than his lamp. */
const NB_LIT = mixHex(HOME.lamp, '#C98F5A', 0.4)

/** Every neighbour whose lot lies between x0 and x1, in the light (and the settled snow) of `L`. */
export function drawNeighbours(p: p5, k: number, weight: number, L: Look, x0: number, x1: number): void {
  const dusky = Math.max(0, Math.min(1, (L.dark - 0.25) / 0.5))
  const tone = (day: string, night: string) => mixHex(dusk(L, day), night, dusky)
  const snow = snowDepth(L)
  const white = snowTone(L)
  p.push()
  p.rectMode(p.CORNER)
  for (const n of NEIGHBOURS) {
    if (n.lot[1] < x0 - 1 || n.lot[0] > x1 + 1) continue
    const c = {
      wall: tone(n.day[0], NB.wall),
      roof: mixHex(tone(n.day[1], NB.roof), white, 0.3 * (L.snow ?? 0)),
      trim: tone(HOME.trim, NB.trim),
      pane: tone(mixHex(HOME.glass, HOME.sky, 0.35), NB.pane),
      door: tone(mixHex(n.day[0], HOME.woodDark, 0.6), NB.door),
      found: tone('#8C7B6A', NB.found),
      ink: tone(INK, '#1C1F30'),
      white,
      snow,
      // Which panes are lit: on until their time (put out, not faded), and only once it is dark enough to see them.
      on: Object.fromEntries((n.lit ?? []).map(([i, out]) => [i, dusky * (L.T < out ? 1 : 0)])) as Record<number, number>,
      next: 0,
    }
    neighbour(p, k, weight, n, c)
    lot(p, k, weight, L, n, c, tone)
  }
  p.pop()
}

type NPal = { wall: string; roof: string; trim: string; pane: string; door: string; found: string; ink: string; white: string; snow: number; on: Record<number, number>; next: number }

function poly(p: p5, k: number, pts: [number, number][]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A window: its frame in the trim, a flat pane (dark, or lit while its light is on), one bar across. */
function pane(p: p5, k: number, weight: number, c: NPal, x0: number, y0: number, x1: number, y1: number): void {
  const on = c.on[c.next++] ?? 0
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.6)
  p.fill(c.trim)
  rect(p, k, x0 - 0.07, y0 - 0.07, x1 + 0.07, y1 + 0.06)
  p.noStroke()
  p.fill(on > 0 ? mixHex(c.pane, NB_LIT, on) : c.pane)
  rect(p, k, x0, y0, x1, y1)
  p.fill(c.trim)
  rect(p, k, (x0 + x1) / 2 - 0.025, y0, (x0 + x1) / 2 + 0.025, y1)
}

/** A door, with its porch light beside it: a small lantern, dark. */
function doorway2(p: p5, k: number, weight: number, c: NPal, x0: number, x1: number, top: number, floor: number): void {
  p.stroke(c.ink)
  p.strokeWeight(weight * 0.7)
  p.fill(c.trim)
  rect(p, k, x0 - 0.07, top - 0.08, x1 + 0.07, floor)
  p.fill(c.door)
  rect(p, k, x0, top, x1, floor)
  p.fill(c.pane)
  rect(p, k, x1 + 0.14, top + 0.3, x1 + 0.27, top + 0.52)
  p.fill(c.trim)
  rect(p, k, x1 + 0.12, top + 0.25, x1 + 0.29, top + 0.3)
}

/** A cap of settled snow along a roof's top edge, from a to b (a line of points), `d` deep. */
function capAlong(p: p5, k: number, c: NPal, pts: [number, number][]): void {
  if (c.snow <= 0) return
  p.noStroke()
  p.fill(c.white)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  for (let i = pts.length - 1; i >= 0; i--) p.vertex(pts[i][0] * k, (pts[i][1] - c.snow) * k)
  p.endShape(p.CLOSE)
}

function neighbour(p: p5, k: number, weight: number, n: Neighbour, c: NPal): void {
  const { x0, x1 } = n
  const cx = (x0 + x1) / 2
  const floor = G - 0.45
  const line = (w: number) => {
    p.stroke(c.ink)
    p.strokeWeight(weight * w)
  }
  if (n.kind === 'cottage') {
    // A storey and a half: a steep side-gabled roof with a dormer, the chimney, a porch along the left.
    line(0.8)
    p.fill(c.found)
    rect(p, k, x0 - 0.05, floor, x1 + 0.05, G)
    p.fill(c.roof)
    rect(p, k, x1 - 1.3, -5.75, x1 - 0.9, -4.4)
    poly(p, k, [
      [x0 - 0.3, -2.75],
      [x0 + 0.95, -5.15],
      [x1 - 0.95, -5.15],
      [x1 + 0.3, -2.75],
    ])
    p.fill(c.wall)
    rect(p, k, x0, -2.75, x1, floor)
    capAlong(p, k, c, [
      [x0 - 0.3, -2.75],
      [x0 + 0.95, -5.15],
      [x1 - 0.95, -5.15],
      [x1 + 0.3, -2.75],
    ])
    if (c.snow > 0) rect(p, k, x1 - 1.35, -5.75 - c.snow * 0.8, x1 - 0.85, -5.74)
    // The dormer.
    line(0.7)
    p.fill(c.wall)
    rect(p, k, cx - 0.5, -4.45, cx + 0.5, -3.35)
    p.fill(c.roof)
    p.triangle((cx - 0.68) * k, -4.4 * k, cx * k, -4.95 * k, (cx + 0.68) * k, -4.4 * k)
    capAlong(p, k, c, [
      [cx - 0.68, -4.4],
      [cx, -4.95],
      [cx + 0.68, -4.4],
    ])
    pane(p, k, weight, c, cx - 0.3, -4.2, cx + 0.3, -3.55)
    // The porch: its floor, two posts, its roof; the door under it, a window beside.
    const px0 = x0 + 0.15
    const px1 = x0 + 2.75
    doorway2(p, k, weight, c, n.path - 0.37, n.path + 0.37, -2.05, floor - 0.12)
    pane(p, k, weight, c, px1 - 0.95, -1.95, px1 - 0.25, -0.95)
    pane(p, k, weight, c, x1 - 1.55, -2.1, x1 - 0.45, -0.9)
    line(0.75)
    p.fill(c.trim)
    rect(p, k, px0, floor - 0.12, px1, floor + 0.02)
    for (const x of [px0 + 0.1, px1 - 0.18]) rect(p, k, x, -2.3, x + 0.08, floor - 0.12)
    p.fill(c.roof)
    poly(p, k, [
      [px0 - 0.1, -2.62],
      [px1 + 0.12, -2.62],
      [px1 + 0.12, -2.4],
      [px0 - 0.1, -2.4],
    ])
    capAlong(p, k, c, [
      [px0 - 0.1, -2.62],
      [px1 + 0.12, -2.62],
    ])
    // Two steps down to the path.
    line(0.6)
    p.fill(c.found)
    rect(p, k, n.path - 0.45, floor + 0.02, n.path + 0.45, floor + 0.22)
    rect(p, k, n.path - 0.5, floor + 0.22, n.path + 0.5, G)
  } else if (n.kind === 'gable') {
    // Two storeys, its gable to the street: the chimney behind the rake, a band between the floors, an attic light.
    line(0.8)
    p.fill(c.found)
    rect(p, k, x0 - 0.05, floor, x1 + 0.05, G)
    p.fill(c.roof)
    rect(p, k, x0 + 0.9, -7.5, x0 + 1.35, -6.0)
    const apex = -8.05
    p.fill(c.wall)
    poly(p, k, [
      [x0, floor],
      [x0, -5.3],
      [cx, apex + 0.25],
      [x1, -5.3],
      [x1, floor],
    ])
    p.fill(c.roof)
    for (const side of [-1, 1]) {
      const ex = side < 0 ? x0 - 0.3 : x1 + 0.3
      poly(p, k, [
        [ex, -5.2],
        [cx, apex],
        [cx, apex + 0.28],
        [ex + side * -0.05, -4.92],
      ])
    }
    capAlong(p, k, c, [
      [x0 - 0.3, -5.2],
      [cx, apex],
      [x1 + 0.3, -5.2],
    ])
    if (c.snow > 0) rect(p, k, x0 + 0.85, -7.5 - c.snow * 0.8, x0 + 1.4, -7.49)
    line(0.7)
    p.fill(c.trim)
    rect(p, k, x0 - 0.05, -2.95, x1 + 0.05, -2.78)
    pane(p, k, weight, c, cx - 0.35, -6.9, cx + 0.35, -6.15)
    pane(p, k, weight, c, x0 + 0.6, -4.75, x0 + 1.75, -3.45)
    pane(p, k, weight, c, x1 - 1.75, -4.75, x1 - 0.6, -3.45)
    pane(p, k, weight, c, x0 + 0.6, -2.3, x0 + 2.0, -0.95)
    doorway2(p, k, weight, c, n.path - 0.38, n.path + 0.38, -2.2, floor)
    // A hood over the door.
    line(0.7)
    p.fill(c.roof)
    poly(p, k, [
      [n.path - 0.62, -2.32],
      [n.path + 0.62, -2.32],
      [n.path + 0.5, -2.55],
      [n.path - 0.5, -2.55],
    ])
    capAlong(p, k, c, [
      [n.path - 0.5, -2.55],
      [n.path + 0.5, -2.55],
    ])
    p.fill(c.found)
    rect(p, k, n.path - 0.5, floor, n.path + 0.5, G)
  } else if (n.kind === 'bungalow') {
    // Long and low under a shallow hipped roof, the chimney through it, a stoop at the door.
    const eave = -2.3
    const top = -3.4
    line(0.8)
    p.fill(c.found)
    rect(p, k, x0 - 0.05, floor, x1 + 0.05, G)
    p.fill(c.roof)
    rect(p, k, x1 - 2.3, top - 0.45, x1 - 1.85, top + 0.6)
    poly(p, k, [
      [x0 - 0.35, eave],
      [x0 + 1.5, top],
      [x1 - 1.5, top],
      [x1 + 0.35, eave],
    ])
    p.fill(c.wall)
    rect(p, k, x0, eave, x1, floor)
    capAlong(p, k, c, [
      [x0 - 0.35, eave],
      [x0 + 1.5, top],
      [x1 - 1.5, top],
      [x1 + 0.35, eave],
    ])
    if (c.snow > 0) rect(p, k, x1 - 2.35, top - 0.45 - c.snow * 0.8, x1 - 1.8, top - 0.44)
    pane(p, k, weight, c, x0 + 0.5, -1.85, x0 + 1.9, -0.95)
    pane(p, k, weight, c, x0 + 2.25, -1.85, n.path - 0.7, -0.95)
    pane(p, k, weight, c, x1 - 1.7, -1.85, x1 - 0.5, -0.95)
    doorway2(p, k, weight, c, n.path - 0.37, n.path + 0.37, -1.95, floor)
    line(0.6)
    p.fill(c.found)
    rect(p, k, n.path - 0.55, floor, n.path + 0.55, G)
  } else {
    // Two storeys, side-gabled, a canted bay on the ground floor right, the door on the left.
    line(0.8)
    p.fill(c.found)
    rect(p, k, x0 - 0.05, floor, x1 + 0.05, G)
    p.fill(c.roof)
    rect(p, k, x1 - 1.5, -7.75, x1 - 1.05, -6.6)
    poly(p, k, [
      [x0 - 0.3, -5.1],
      [x0 + 1.05, -7.25],
      [x1 - 1.05, -7.25],
      [x1 + 0.3, -5.1],
    ])
    p.fill(c.wall)
    rect(p, k, x0, -5.1, x1, floor)
    capAlong(p, k, c, [
      [x0 - 0.3, -5.1],
      [x0 + 1.05, -7.25],
      [x1 - 1.05, -7.25],
      [x1 + 0.3, -5.1],
    ])
    if (c.snow > 0) rect(p, k, x1 - 1.55, -7.75 - c.snow * 0.8, x1 - 1.0, -7.74)
    line(0.7)
    p.fill(c.trim)
    rect(p, k, x0 - 0.05, -2.95, x1 + 0.05, -2.8)
    for (const [a, b] of [
      [x0 + 0.6, x0 + 1.55],
      [cx - 0.5, cx + 0.5],
      [x1 - 1.55, x1 - 0.6],
    ]) pane(p, k, weight, c, a, -4.6, b, -3.45)
    doorway2(p, k, weight, c, n.path - 0.37, n.path + 0.37, -2.15, floor)
    p.fill(c.found)
    rect(p, k, n.path - 0.5, floor, n.path + 0.5, G)
    // The bay: three lights, its little roof.
    const b0 = x1 - 2.75
    const b1 = x1 - 0.55
    line(0.75)
    p.fill(c.wall)
    rect(p, k, b0, -2.45, b1, floor)
    pane(p, k, weight, c, b0 + 0.12, -2.2, b0 + 0.45, -0.85)
    pane(p, k, weight, c, b0 + 0.62, -2.2, b1 - 0.62, -0.85)
    pane(p, k, weight, c, b1 - 0.45, -2.2, b1 - 0.12, -0.85)
    line(0.75)
    p.fill(c.roof)
    poly(p, k, [
      [b0 - 0.15, -2.42],
      [b1 + 0.15, -2.42],
      [b1 - 0.2, -2.75],
      [b0 + 0.2, -2.75],
    ])
    capAlong(p, k, c, [
      [b0 + 0.2, -2.75],
      [b1 - 0.2, -2.75],
    ])
  }
}

/** The lot's front: its path across the lawn, and the picket fence or the hedge along the pavement, a gap at the path. */
function lot(p: p5, k: number, weight: number, L: Look, n: Neighbour, c: NPal, tone: (day: string, night: string) => string): void {
  const base = G + 0.24
  const [a, b] = n.lot
  const gap: [number, number] = [n.path - 0.42, n.path + 0.42]
  p.noStroke()
  p.fill(mixHex(tone(HOME.stone, NB.path), c.white, 0.5 * (L.snow ?? 0)))
  rect(p, k, n.path - 0.32, G, n.path + 0.32, base)
  const runs: [number, number][] = [
    [a, gap[0]],
    [gap[1], b],
  ]
  if (n.fence === 'picket') {
    const top = base - 0.5
    const fence = tone(HOME.trim, NB.fence)
    for (const [r0, r1] of runs) {
      p.stroke(c.ink)
      p.strokeWeight(weight * 0.55)
      p.fill(fence)
      rect(p, k, r0, top + 0.12, r1, top + 0.18)
      rect(p, k, r0, top + 0.36, r1, top + 0.42)
      for (let x = r0 + 0.04; x < r1 - 0.06; x += 0.19) {
        poly(p, k, [
          [x, base],
          [x, top + 0.06],
          [x + 0.04, top],
          [x + 0.08, top + 0.06],
          [x + 0.08, base],
        ])
      }
      if (c.snow > 0) {
        p.noStroke()
        p.fill(c.white)
        rect(p, k, r0, top + 0.12 - c.snow * 0.5, r1, top + 0.13)
      }
    }
    // The gate across the path, shut, with its posts.
    p.stroke(c.ink)
    p.strokeWeight(weight * 0.55)
    p.fill(fence)
    for (const x of [gap[0] - 0.05, gap[1] - 0.05]) rect(p, k, x, top - 0.08, x + 0.1, base)
    for (let x = gap[0] + 0.1; x < gap[1] - 0.12; x += 0.17) rect(p, k, x, top + 0.04, x + 0.07, base - 0.04)
    rect(p, k, gap[0] + 0.06, top + 0.14, gap[1] - 0.06, top + 0.19)
    rect(p, k, gap[0] + 0.06, top + 0.36, gap[1] - 0.06, top + 0.41)
  } else {
    const hedge = tone(mixHex(HOME.leaf, '#4B6A40', 0.4), NB.hedge)
    for (const [r0, r1] of runs) {
      const top = base - 0.62
      p.stroke(c.ink)
      p.strokeWeight(weight * 0.6)
      p.fill(hedge)
      p.rect(r0 * k, top * k, (r1 - r0) * k, (base - top) * k, 0.18 * k, 0.18 * k, 0, 0)
      if (c.snow > 0) {
        p.noStroke()
        p.fill(c.white)
        p.rect((r0 + 0.04) * k, (top - c.snow * 0.6) * k, (r1 - r0 - 0.08) * k, (c.snow * 0.6 + 0.08) * k, 0.12 * k, 0.12 * k, 0.02 * k, 0.02 * k)
      }
    }
  }
}
