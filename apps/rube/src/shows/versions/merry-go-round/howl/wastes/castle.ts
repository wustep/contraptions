import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha } from '../kit'
import { drawDoor } from '../cast'
import { ROOM, WASTES } from '../worlds'

/**
 * Howl's castle, the show's hero machine (canonical: the castle builder owns this file and makes it magnificent;
 * the plank builder and the director draw it through this API and nothing else, so keep every export's name and
 * meaning). A heap of iron hull, turrets, slate roofs, chimneys, pipes and cannons on four bird legs, walking to
 * the right. The director wrote this first version so the show runs; everything about its look may change.
 *
 * Frame: cells, origin on the ground between its feet, y down; it faces right (+x). Standing, its belly is at
 * `CASTLE.belly` and its highest chimney at about y = -22.
 *
 * Walking: `step` counts footfalls (a foot lands at every whole number; a step a bar of the waltz). The caller moves
 * the castle's origin by `STRIDE` cells per step (at whatever pace inside a step it likes); the feet are then
 * planted on the ground while the body goes over them.
 */

export const STRIDE = 3.2

export const CASTLE = {
  /** The underside of the hull, standing. */
  belly: -8.6,
  /** Hip joints (near legs; the far legs are the same, set back and darker). */
  hips: [[2.4, -8.9], [-2.6, -8.9]] as Pt[],
  thigh: 4.7,
  shin: 4.7,
  /** The door (its sill, in the hull's side, facing us) and the porch before it. */
  door: [-0.3, -9.2] as Pt,
  porch: [-1.2, 0.9] as Pt,
  /** The hanging stair from the porch down toward the ground: its top and its foot. */
  stairTop: [0.8, -9.2] as Pt,
  stairFoot: [1.9, -6.4] as Pt,
  /** Calcifer's chimney: its mouth. */
  chimney: [0.9, -22.2] as Pt,
  /** The deck on the hull's top, where the houses stand. */
  deck: -14.2,
}

export type ModuleId = 'hull' | 'jaw' | 'nose' | 'eye' | 'house' | 'chimney' | 'turretBack' | 'turretFront' | 'pipes' | 'flag' | 'cannonTop'

/** How a module has moved from its place (for the collapse): offset (cells), turn (radians), and how gone it is (0..1). */
export interface ModuleMove {
  dx?: number
  dy?: number
  rot?: number
  gone?: number
}

export interface CastlePose {
  /** Show time: smoke, flicker. */
  t: number
  /** Footfalls so far (see the header). */
  step: number
  /** 0 standing, 1 sat down on its folded legs (belly near the ground). */
  sit?: number
  /** Chimney smoke, 0..1. */
  smoke?: number
  /** Windows lit, 0..1. */
  lights?: number
  /** Night, 0..1: the iron and stone go toward the dark. */
  night?: number
  /** The door: how open, and its dial. */
  door?: number
  dial?: number
  /** The collapse: per module, how it has moved. Missing modules are in place. */
  modules?: Partial<Record<ModuleId, ModuleMove>>
  /** Leave the legs out (the plank builder draws its own plank on legs). */
  noLegs?: boolean
}

/** How far the body has dropped at `sit` (cells, positive down). */
const sag = (sit: number) => 5.2 * sit

/** The body's bob for a step phase: down as a foot lands, up mid-stride. */
export function bob(step: number): number {
  const u = step - Math.floor(step)
  return 0.28 * Math.cos(2 * Math.PI * u) - 0.05
}

/** Where the door's sill is at a pose, in the castle's frame: where Sophie steps in. */
export function doorAt(pose: CastlePose): Pt {
  return [CASTLE.door[0], CASTLE.door[1] + bob(pose.step) + sag(pose.sit ?? 0)]
}

/** A point of the body (given standing) where it is at a pose: for riding the castle (`carried`). */
export function onBody(pose: CastlePose, at: Pt): Pt {
  return [at[0], at[1] + bob(pose.step) + sag(pose.sit ?? 0)]
}

/** Where a foot is, relative to its hip's x, at a step phase: planted and sliding back, or swinging forward. */
function footAt(phase: number): Pt {
  // Each leg: stance for 0.55 of its cycle, swing for 0.45. The cycle is two steps long.
  const u = ((phase % 2) + 2) % 2 / 2
  if (u < 0.55) {
    const s = u / 0.55
    return [STRIDE * (0.5 - s) * 2 * 0.5, 0]
  }
  const s = (u - 0.55) / 0.45
  const e = s * s * (3 - 2 * s)
  return [STRIDE * (-0.5 + e) * 2 * 0.5, -1.4 * Math.sin(Math.PI * s)]
}

/** A bird leg from hip to foot: two bones with the joint bent backwards, a scaled shin, three toes forward and a spur. */
export function drawLeg(p: p5, k: number, weight: number, ink: string, hip: Pt, foot: Pt, color: string, fold = 0): void {
  const { thigh, shin } = CASTLE
  const dx = foot[0] - hip[0]
  const dy = foot[1] - hip[1]
  const d = Math.min(thigh + shin - 0.01, Math.hypot(dx, dy))
  const a = Math.atan2(dy, dx)
  const cosK = (thigh * thigh + d * d - shin * shin) / (2 * thigh * d)
  const off = Math.acos(Math.max(-1, Math.min(1, cosK)))
  // The joint bends backwards (to the left, away from where it walks): the knee is on the left of the line.
  const ka = a + off
  const knee: Pt = [hip[0] + Math.cos(ka) * thigh, hip[1] + Math.sin(ka) * thigh]
  p.push()
  p.stroke(alpha(p, ink, 1))
  p.strokeWeight(weight)
  // The thigh: an armoured drumstick.
  p.fill(color)
  p.beginShape()
  const nx = -Math.sin(ka)
  const ny = Math.cos(ka)
  p.vertex((hip[0] + nx * 0.9) * k, (hip[1] + ny * 0.9) * k)
  p.vertex((knee[0] + nx * 0.35) * k, (knee[1] + ny * 0.35) * k)
  p.vertex((knee[0] - nx * 0.35) * k, (knee[1] - ny * 0.35) * k)
  p.vertex((hip[0] - nx * 0.9) * k, (hip[1] - ny * 0.9) * k)
  p.endShape(p.CLOSE)
  // The shin: thin, scaled (rings across it).
  const sa = Math.atan2(foot[1] - knee[1], foot[0] - knee[0])
  const sx = -Math.sin(sa)
  const sy = Math.cos(sa)
  p.fill(mixHex(color, '#E8D9B0', 0.35))
  p.beginShape()
  p.vertex((knee[0] + sx * 0.22) * k, (knee[1] + sy * 0.22) * k)
  p.vertex((foot[0] + sx * 0.14) * k, (foot[1] + sy * 0.14) * k)
  p.vertex((foot[0] - sx * 0.14) * k, (foot[1] - sy * 0.14) * k)
  p.vertex((knee[0] - sx * 0.22) * k, (knee[1] - sy * 0.22) * k)
  p.endShape(p.CLOSE)
  p.strokeWeight(weight * 0.5)
  for (let i = 1; i < 6; i++) {
    const u = i / 6
    const cx = knee[0] + (foot[0] - knee[0]) * u
    const cy = knee[1] + (foot[1] - knee[1]) * u
    const r = 0.22 - 0.08 * u
    p.line((cx + sx * r) * k, (cy + sy * r) * k, (cx - sx * r) * k, (cy - sy * r) * k)
  }
  // The knee joint.
  p.strokeWeight(weight)
  p.fill(mixHex(color, '#000000', 0.2))
  p.circle(knee[0] * k, knee[1] * k, 0.62 * k)
  // Toes: three forward, one back, curling as it lifts.
  p.strokeWeight(weight * 1.2)
  p.noFill()
  const lift = Math.max(0, -foot[1]) * 0.12 + fold
  for (const [tx, ty] of [[1.2, 0], [0.9, 0.05], [1.35, -0.05]] as Pt[]) {
    p.line(foot[0] * k, foot[1] * k, (foot[0] + tx * (1 - lift * 0.3)) * k, (foot[1] + ty + lift * 0.3) * k)
  }
  p.line(foot[0] * k, foot[1] * k, (foot[0] - 0.6) * k, (foot[1] + 0.05) * k)
  p.pop()
}

/** Draws the castle at a pose, about the caller's origin. */
export function drawCastle(p: p5, k: number, weight: number, ink: string, pose: CastlePose): void {
  const night = Math.max(0, Math.min(1, pose.night ?? 0))
  const dim = (c: string) => mixHex(c, WASTES.night, night * 0.55)
  const iron = dim(WASTES.iron)
  const ironDark = dim(WASTES.ironDark)
  const rust = dim(WASTES.rust)
  const brass = dim(WASTES.brass)
  const slate = dim(WASTES.slate)
  const stone = dim(WASTES.stone)
  const wood = dim(WASTES.wood)
  const plaster = dim('#E6DCC6')
  const lights = pose.lights ?? 0
  const sit = pose.sit ?? 0
  const lift = bob(pose.step) + sag(sit)
  const mods = pose.modules ?? {}
  const W = weight
  p.push()
  p.rectMode(p.CORNER)
  // Legs: the far pair first (set back, darker), then the body, then the near pair over its belly.
  const legs = (far: boolean) => {
    if (pose.noLegs) return
    CASTLE.hips.forEach(([hx, hy], i) => {
      const phase = pose.step + i + (far ? 1 : 0)
      const [fx, fy] = footAt(phase)
      const hip: Pt = [hx + (far ? 0.7 : 0), hy + lift]
      const foot: Pt = sit > 0 ? [hx + fx * (1 - sit) + 1.2 * sit, fy * (1 - sit)] : [hx + fx + (far ? 0.7 : 0), fy]
      drawLeg(p, k, W, ink, hip, foot, far ? mixHex(ironDark, WASTES.night, 0.3) : iron, sit)
    })
  }
  legs(true)
  const module = (id: ModuleId, draw: () => void) => {
    const m = mods[id]
    if (m && (m.gone ?? 0) >= 0.999) return
    p.push()
    p.translate(0, lift * k)
    if (m) {
      p.translate((m.dx ?? 0) * k, (m.dy ?? 0) * k)
      p.rotate(m.rot ?? 0)
    }
    draw()
    p.pop()
  }
  const lit = (x: number, y: number, w: number, h: number) => {
    p.fill(mixHex(ironDark, WASTES.window, lights))
    p.rect(x * k, y * k, w * k, h * k, 0.05 * k)
  }
  p.stroke(ink)
  p.strokeWeight(W)
  // The back turret: a tall stone tower with a cone of slate.
  module('turretBack', () => {
    p.fill(stone)
    p.rect(-6.4 * k, -19.5 * k, 2.4 * k, 7 * k)
    p.fill(slate)
    p.triangle(-6.8 * k, -19.5 * k, -3.6 * k, -19.5 * k, -5.2 * k, -23.2 * k)
    lit(-5.6, -17.8, 0.6, 0.9)
  })
  // The house on the deck: timber and plaster, a slate roof, windows.
  module('house', () => {
    p.fill(plaster)
    p.rect(-3.6 * k, -18.6 * k, 5.2 * k, 4.6 * k)
    p.fill(slate)
    p.quad(-4.1 * k, -18.6 * k, 2.1 * k, -18.6 * k, 1.2 * k, -20.6 * k, -3.0 * k, -20.6 * k)
    p.stroke(alpha(p, ink, 0.7))
    p.strokeWeight(W * 0.7)
    for (const x of [-3.6, -1.9, -0.2, 1.6]) p.line(x * k, -18.6 * k, x * k, -14.0 * k)
    p.line(-3.6 * k, -16.3 * k, 1.6 * k, -16.3 * k)
    p.stroke(ink)
    p.strokeWeight(W)
    lit(-3.0, -18.0, 0.8, 1.1)
    lit(-1.3, -18.0, 0.8, 1.1)
    lit(0.4, -15.8, 0.8, 1.1)
  })
  // Calcifer's chimney: tall brick, a crooked cap, and his smoke.
  module('chimney', () => {
    p.fill(dim(ROOM.brick))
    p.rect(0.5 * k, -22.0 * k, 0.9 * k, 3.6 * k)
    p.fill(ironDark)
    p.rect(0.35 * k, -22.35 * k, 1.2 * k, 0.4 * k)
  })
  // Pipes: a bundle up the side, with valves.
  module('pipes', () => {
    p.noFill()
    p.strokeWeight(W * 2.2)
    p.stroke(ink)
    p.line(-4.2 * k, -13.8 * k, -4.2 * k, -16.8 * k)
    p.strokeWeight(W * 1.4)
    p.stroke(brass)
    p.line(-4.2 * k, -13.8 * k, -4.2 * k, -16.8 * k)
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(brass)
    p.circle(-4.2 * k, -15.4 * k, 0.4 * k)
  })
  // The hull: a great iron bulk, rounded under, plated and riveted.
  module('hull', () => {
    p.fill(iron)
    p.beginShape()
    p.vertex(-7.2 * k, -14.2 * k)
    p.vertex(5.6 * k, -14.2 * k)
    p.bezierVertex(6.8 * k, -12.8 * k, 6.6 * k, -10.2 * k, 5.2 * k, -9.0 * k)
    p.bezierVertex(3.0 * k, -8.2 * k, -3.6 * k, -8.2 * k, -6.0 * k, -9.2 * k)
    p.bezierVertex(-7.6 * k, -10.4 * k, -7.8 * k, -12.8 * k, -7.2 * k, -14.2 * k)
    p.endShape(p.CLOSE)
    p.fill(rust)
    p.rect(-6.4 * k, -13.6 * k, 3.0 * k, 1.6 * k)
    p.fill(ironDark)
    p.rect(2.2 * k, -13.8 * k, 2.6 * k, 1.2 * k)
    p.stroke(alpha(p, ink, 0.5))
    p.strokeWeight(W * 0.6)
    for (const x of [-4.8, -2.4, 0, 2.4, 4.4]) p.line(x * k, -14.2 * k, x * k, -8.6 * k)
    p.stroke(ink)
    p.strokeWeight(W)
    // The porch and the door in the hull's side, and the hanging stair.
    const [dx, dy] = CASTLE.door
    p.fill(wood)
    p.rect((dx - 0.9) * k, dy * k, 2.4 * k, 0.22 * k)
    p.push()
    p.translate(dx * k, dy * k)
    drawDoor(p, k, W, ink, { open: pose.door ?? 0, dial: pose.dial ?? 0, wood: dim(ROOM.wood), woodDark: dim(ROOM.woodDark),
      view: (q, b) => { q.noStroke(); q.fill(mixHex(ROOM.night, '#FFB464', lights * 0.8)); q.rect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k) } })
    p.pop()
    const [ax, ay] = CASTLE.stairTop
    const [bx, by] = CASTLE.stairFoot
    p.strokeWeight(W * 0.9)
    p.line(ax * k, ay * k, bx * k, by * k)
    p.line((ax + 0.5) * k, ay * k, (bx + 0.5) * k, by * k)
    for (let i = 1; i < 6; i++) {
      const u = i / 6
      p.line((ax + (bx - ax) * u) * k, (ay + (by - ay) * u) * k, (ax + 0.5 + (bx - ax) * u) * k, (ay + (by - ay) * u) * k)
    }
  })
  // The front turret: the castle's face, a round-ish tower with one great window (its eye).
  module('turretFront', () => {
    p.fill(stone)
    p.rect(3.4 * k, -18.8 * k, 2.6 * k, 5.2 * k)
    p.fill(slate)
    p.triangle(3.0 * k, -18.8 * k, 6.4 * k, -18.8 * k, 4.7 * k, -21.4 * k)
  })
  module('eye', () => {
    p.fill(mixHex(ironDark, WASTES.window, lights * 0.9))
    p.ellipse(4.7 * k, -16.2 * k, 1.3 * k, 1.1 * k)
  })
  // The nose: a cannon out of the front, and the jaw: a hinged drawbridge with teeth under it.
  module('nose', () => {
    p.fill(ironDark)
    p.rect(5.8 * k, -12.6 * k, 2.2 * k, 0.6 * k, 0.2 * k)
    p.fill(brass)
    p.rect(7.8 * k, -12.7 * k, 0.3 * k, 0.8 * k)
  })
  module('jaw', () => {
    p.fill(rust)
    p.quad(3.6 * k, -9.6 * k, 5.6 * k, -9.4 * k, 6.2 * k, -8.8 * k, 3.4 * k, -8.9 * k)
    p.fill(plaster)
    for (let i = 0; i < 4; i++) p.triangle((3.8 + i * 0.6) * k, -9.5 * k, (4.1 + i * 0.6) * k, -9.5 * k, (3.95 + i * 0.6) * k, -9.1 * k)
  })
  module('cannonTop', () => {
    p.fill(ironDark)
    p.push()
    p.translate(-5.2 * k, -14.2 * k)
    p.rotate(-0.4)
    p.rect(0, -0.25 * k, 2.2 * k, 0.5 * k, 0.15 * k)
    p.pop()
  })
  module('flag', () => {
    p.strokeWeight(W * 0.8)
    p.line(-5.2 * k, -23.2 * k, -5.2 * k, -24.8 * k)
    p.fill(dim('#B8433A'))
    const fl = Math.sin(pose.t * 4) * 0.15
    p.triangle(-5.2 * k, -24.8 * k, -3.9 * k, (-24.5 + fl) * k, -5.2 * k, -24.2 * k)
  })
  legs(false)
  // The smoke from Calcifer's chimney: soft rising volume, never outlined.
  const smoke = pose.smoke ?? 0
  if (smoke > 0.01 && !(mods.chimney && (mods.chimney.gone ?? 0) > 0.5)) {
    p.noStroke()
    const [cx, cy] = CASTLE.chimney
    for (let i = 0; i < 7; i++) {
      const age = ((pose.t * 0.35 + i / 7) % 1)
      const r = (0.6 + age * 2.4) * smoke
      const a = (1 - age) * 0.55 * smoke
      p.fill(alpha(p, mixHex(WASTES.steam, WASTES.night, night * 0.6), a))
      p.circle((cx + age * -3.2 + Math.sin(pose.t + i) * 0.3) * k, (cy + lift - age * 5) * k, r * 2 * k)
    }
  }
  p.pop()
}

/** Every cell the castle can cover about its origin, standing or sitting: for `cells` lists. */
export const CASTLE_BOX = { x0: -9, y0: -26, x1: 10, y1: 1 }
