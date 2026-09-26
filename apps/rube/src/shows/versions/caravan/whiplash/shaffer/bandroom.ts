import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { drawKit, type KitPiece } from '../drums'
import { drawConductor } from '../fletcher'
import { alpha, frame, hash, smooth, type Ctx } from '../kit'
import { BAND, ONSETS, QUIET, TUNE_ORIGIN, TUNE_PERIOD } from '../music'
import { KIT, SHOP } from '../worlds'
import {
  CORRIDOR_R_TOP, CORRIDOR_TOP, DOOR_R_TOP, DOOR_TOP, DOOR_W, G, KX, KY, PIT, PODIUM, PODIUM_TOP, ROOM_TOP, SEAT_H, STAND,
  TIERS, WALL_L, WALL_R, type Section,
} from './band-plan'
import { ANSWER, TUTTI, doorL, pageAt } from './band-motion'
import { chairAt, fletcherBase, fletcherFloor, fletcherHead, fletcherPose, sinceStroke } from './band-people'
import { drawChair, drawChartStand, drawPlayer, drawPlayerStand, lit, type Playing } from './bandroom-props'
import { doorR, spill } from './tempo-motion'

/** A stroke in a colour with alpha, no fill. */
function pen(p: p5, colour: p5.Color, w: number): void {
  p.stroke(colour)
  p.strokeWeight(w)
  p.noFill()
}
/** A stroke in a colour with alpha over a fill. */
function penFill(p: p5, colour: p5.Color, w: number, fill: string): void {
  p.stroke(colour)
  p.strokeWeight(w)
  p.fill(fill)
}

/**
 * The studio band's room at Shaffer: the canonical set for the band and tempo parts, drawn from show time. The band
 * part draws it for both (its cells cover the whole room); the tempo part draws only the far corridor and what must
 * stand in front of the ball.
 *
 * Back to front: the room's dark shell and its acoustic panels; the tiers, each with its section (three or four
 * players deep, in profile, facing down the tiers to the conductor); the pit: Fletcher's podium, Tanner's chart on
 * its stand and the alternate's chair, the kit; the chair when it is behind the kit; Fletcher's rig; the doors'
 * leaves; and the light: the tungsten troughs overhead and the stand lamps.
 */

/* ------------------------------------------------------------------ light */

/** How lit the room is: low before the band, up on its entrance, low again after the band stops. */
export function roomLight(T: number): number {
  const on = 0.3 + 0.7 * easeInOutSine(clamp((T - (BAND - 0.28)) / 0.3))
  const off = 1 - 0.72 * easeInOutSine(clamp((T - (QUIET + 0.4)) / 2.6))
  return on * off
}

/* ------------------------------------------------------------------ the band's playing */

/** The horns are up while the band plays: up just before the band comes in, down after it stops. */
function hornsUp(T: number): number {
  return easeInOutSine(clamp((T - (BAND - 0.55)) / 0.45)) * (1 - easeInOutSine(clamp((T - (QUIET + 0.1)) / 0.9)))
}

const ACCENTS = ONSETS.filter((o) => o.t > BAND - 0.1 && o.t < QUIET + 0.1 && o.s >= 0.9)
/** A section's accent at `T`: its bells lifting on the hits it plays (the trumpets the bright ones, the trombones the low, the saxophones the middle). */
function accent(T: number, section: Section): number {
  let a = 0
  for (const o of ACCENTS) {
    const since = T - o.t
    if (since < -0.05 || since > 1.2) continue
    const w = section === 'trumpets' ? o.hi : section === 'bones' ? o.lo + 0.4 * o.mid : o.mid
    const rise = since < 0 ? 0 : 1 - Math.exp(-since / 0.025)
    a += 0.16 * Math.min(1.4, w) * o.s * Math.exp(-Math.max(0, since) / 0.22) * rise
  }
  return Math.min(0.42, a)
}

/** A trombone's slide on the beat: out and in to its next position at each beat, quick, then still. */
function slideAt(T: number, seed: number): number {
  const k = (T - TUNE_ORIGIN) / TUNE_PERIOD
  const n = Math.floor(k)
  const pos = (i: number) => 0.5 + 0.45 * Math.sin(i * 1.93 + seed * 2.1) * Math.cos(i * 0.61 + seed)
  const u = easeInOutSine(clamp((k - n) / 0.3))
  return pos(n - 1) + (pos(n) - pos(n - 1)) * u
}

/** The trumpets stand for the tutti, and sit again after its answer. */
const standing = (T: number): number => smooth(T, TUTTI - 0.5, TUTTI - 0.05) * (1 - smooth(T, ANSWER + 1.0, ANSWER + 1.8))

function playing(T: number, section: Section, seed: number): Playing {
  const k = (T - TUNE_ORIGIN) / TUNE_PERIOD
  return {
    up: hornsUp(T),
    lift: accent(T, section) + (section === 'trumpets' ? 0.12 * standing(T) : 0),
    slide: section === 'bones' ? slideAt(T, seed) : 0,
    stand: section === 'trumpets' ? standing(T) : 0,
    sway: Math.sin(Math.PI * k + seed) * hornsUp(T),
  }
}

/** The players of each tier: seat x (the seat's middle), depth, and how many deep. */
function seats(tier: (typeof TIERS)[number]): { x: number; depth: number; seed: number }[] {
  const n = 3
  const out: { x: number; depth: number; seed: number }[] = []
  for (let j = n - 1; j >= 0; j--) out.push({ x: tier.x1 - 1.3 - j * 0.56, depth: j, seed: TIERS.indexOf(tier) * 10 + j })
  return out
}

/* ------------------------------------------------------------------ the room */

export function drawBandRoom(p: p5, c: Ctx, T: number): void {
  const f = frame(p, c.k)
  const L = roomLight(T)
  p.push()
  if (f.x0 < WALL_L.x1 + 0.5) corridor(p, c, T, f)
  shell(p, c, f, L)
  for (const tier of TIERS) if (f.x1 > tier.x0 - 2 && f.x0 < tier.x1 + 2) section(p, c, T, tier, L)
  podium(p, c, L)
  const chair = chairAt(T)
  // Fletcher stands behind everything in the pit (the chart, the chair, the drums): over Andrew's shoulder at the kit.
  if (chair.held) drawChair(p, c, [chair.x, chair.y], -1, L, chair.turn, chair.scale)
  if (T >= BAND - 1e-6 && T < QUIET) drawConductor(p, c, fletcherHead(T), fletcherPose(T), { floor: fletcherFloor(T), base: fletcherBase(T), light: 0.5 + 0.5 * L })
  const pg = pageAt(T)
  drawChartStand(p, c, STAND.x, STAND.ledge, STAND.w, STAND.h, PIT, pg.turned, pg.u, L)
  if (!chair.held) drawChair(p, c, [chair.x, chair.y], -1, chair.behind ? L * 0.75 : L, chair.turn, chair.scale)
  p.push()
  p.translate(KX * c.k, KY * c.k)
  drawKit(p, c, { shell: KIT.lacquer, since: (piece: KitPiece) => sinceStroke(piece, T), light: 0.45 + 0.55 * L })
  p.pop()
  doors(p, c, T, L)
  glow(p, c, T, f, L)
  p.pop()
}

/** The corridor off the room's left: carpet, dark walls, the doors of other rooms, one lamp. */
function corridor(p: p5, c: Ctx, T: number, f: ReturnType<typeof frame>): void {
  const { k, ink, weight } = c
  const x0 = Math.max(-0.5, f.x0 - 0.5)
  const x1 = WALL_L.x0
  if (x1 <= x0) return
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  // The same dark as the practice rooms' corridor it carries on from (`room.ts`).
  p.fill(mixHex(c.bg, SHOP.deep, 0.62))
  p.rect(x0 * k, CORRIDOR_TOP * k, (x1 - x0) * k, (G - CORRIDOR_TOP) * k)
  // A skirting board, and the carpet's edge.
  p.fill(mixHex(SHOP.deep, SHOP.wood, 0.3))
  p.rect(x0 * k, (G - 0.18) * k, (x1 - x0) * k, 0.18 * k)
  // A door on the corridor's far wall: another practice room, dark.
  for (const dx of [0.35]) {
    if (dx < x0 - 1 || dx > x1) continue
    penFill(p, alpha(p, ink, 0.5), weight * 0.7, mixHex(SHOP.deep, SHOP.wood, 0.28))
    p.rect((dx - 0.55) * k, (G - 2.45) * k, 1.1 * k, 2.45 * k)
    p.noStroke()
    p.fill(mixHex(SHOP.deep, SHOP.black, 0.5))
    p.rect((dx - 0.14) * k, (G - 2.0) * k, 0.28 * k, 0.5 * k)
  }
  // Floor and ceiling lines.
  outline(p, ink, weight)
  p.line(x0 * k, G * k, x1 * k, G * k)
  pen(p, alpha(p, ink, 0.5), weight * 0.8)
  p.line(x0 * k, CORRIDOR_TOP * k, x1 * k, CORRIDOR_TOP * k)
  // Light from the band room under and through its door: warmer while the door stands open.
  const open = doorL(T)
  const band = roomLight(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const a = 0.05 * band + 0.16 * open * band
  const g = ctx.createLinearGradient(x1 * k, 0, (x1 - 2.4) * k, 0)
  g.addColorStop(0, `rgba(240, 179, 90, ${a.toFixed(3)})`)
  g.addColorStop(1, 'rgba(240, 179, 90, 0)')
  ctx.fillStyle = g
  ctx.fillRect((x1 - 2.4) * k, DOOR_TOP * k, 2.4 * k, (G - DOOR_TOP) * k)
  ctx.restore()
  p.pop()
}

/** The room's shell: the back wall and its panels, the ceiling and its lamps, the tiered floor, the pit, the walls. */
function shell(p: p5, c: Ctx, f: ReturnType<typeof frame>, L: number): void {
  const { k, ink, weight } = c
  const x0 = WALL_L.x1
  const x1 = WALL_R.x0
  const bottom = Math.max(PIT + 1, f.y1 + 1)
  p.push()
  p.rectMode(p.CORNER)
  // The back wall, warm dark, lifting with the light.
  p.noStroke()
  p.fill(mixHex(c.bg, SHOP.deep, 0.5 + 0.5 * L))
  p.rect(x0 * k, ROOM_TOP * k, (x1 - x0) * k, (PIT - ROOM_TOP) * k)
  // Acoustic panels: tall soft slabs in a row, each a shade apart, with a shadowed edge.
  for (let i = 0; i < 11; i++) {
    const px = x0 + 0.65 + i * 2.1
    if (px + 1.6 > x1 - 0.3) break
    const top = ROOM_TOP + 0.95
    const h = 2.3
    p.fill(mixHex(SHOP.deep, SHOP.panel, (0.35 + 0.15 * hash(i, 2)) * (0.45 + 0.55 * L)))
    p.rect(px * k, top * k, 1.6 * k, h * k, 0.06 * k)
    p.fill(alpha(p, SHOP.black, 0.25))
    p.rect(px * k, (top + h - 0.08) * k, 1.6 * k, 0.08 * k)
  }
  // The wainscot: a band of wood round the pit, behind the rhythm section.
  p.fill(mixHex(SHOP.deep, SHOP.wood, 0.25 + 0.3 * L))
  p.rect(TIERS[2].x1 * k, (PIT - 1.15) * k, (x1 - TIERS[2].x1) * k, 1.15 * k)
  p.fill(alpha(p, SHOP.tungsten, 0.08 * L))
  p.rect(TIERS[2].x1 * k, (PIT - 1.15) * k, (x1 - TIERS[2].x1) * k, 0.04 * k)
  // The tiered floor, down to the pit: one dark mass, its treads lighter, its risers in shadow.
  const floorCol = mixHex(SHOP.deep, SHOP.wood, 0.3 + 0.25 * L)
  p.noStroke()
  p.fill(floorCol)
  p.beginShape()
  p.vertex(x0 * k, TIERS[0].top * k)
  for (const t of TIERS) {
    p.vertex(t.x1 * k, t.top * k)
    p.vertex(t.x1 * k, (t.top + 0.8) * k)
  }
  p.vertex(x1 * k, PIT * k)
  p.vertex(x1 * k, bottom * k)
  p.vertex(x0 * k, bottom * k)
  p.endShape(p.CLOSE)
  // Its treads and risers in ink, not the mass's cut ends (those ran down the frame as lines at the walls).
  outline(p, ink, weight)
  p.beginShape()
  p.vertex(x0 * k, TIERS[0].top * k)
  for (const t of TIERS) {
    p.vertex(t.x1 * k, t.top * k)
    p.vertex(t.x1 * k, (t.top + 0.8) * k)
  }
  p.vertex(x1 * k, PIT * k)
  p.endShape()
  p.noStroke()
  for (const t of TIERS) {
    p.fill(alpha(p, SHOP.black, 0.3))
    p.rect(t.x1 * k, t.top * k, 0.04 * k, 0.8 * k)
    p.fill(alpha(p, SHOP.tungsten, 0.1 + 0.12 * L))
    p.rect(t.x0 * k, t.top * k, (t.x1 - t.x0) * k, 0.035 * k)
  }
  // The ceiling, and the trough lights hung from it.
  pen(p, alpha(p, ink, 0.55), weight * 0.8)
  p.line(x0 * k, ROOM_TOP * k, x1 * k, ROOM_TOP * k)
  for (const lx of LAMPS) {
    if (lx < f.x0 - 2 || lx > f.x1 + 2) continue
    pen(p, alpha(p, ink, 0.6), weight * 0.6)
    p.line(lx * k, ROOM_TOP * k, lx * k, (ROOM_TOP + 0.5) * k)
    solid(p, ink, weight * 0.8, mixHex(SHOP.black, SHOP.deep, 0.4))
    p.quad((lx - 0.7) * k, (ROOM_TOP + 0.5) * k, (lx + 0.7) * k, (ROOM_TOP + 0.5) * k, (lx + 0.85) * k, (ROOM_TOP + 0.72) * k, (lx - 0.85) * k, (ROOM_TOP + 0.72) * k)
    p.noStroke()
    p.fill(lit(SHOP.tungsten, L))
    p.rect((lx - 0.78) * k, (ROOM_TOP + 0.7) * k, 1.56 * k, 0.04 * k)
  }
  // The walls at either end, cut through: lintels over the doors, the rest solid.
  const wall = mixHex(c.bg, SHOP.deep, 0.35)
  // Filled, no contour: an ink edge round them ran as long hairlines down the frame at the corridor seams.
  p.noStroke()
  p.fill(wall)
  p.rect(WALL_L.x0 * k, (ROOM_TOP - 0.4) * k, (WALL_L.x1 - WALL_L.x0) * k, (DOOR_TOP - ROOM_TOP + 0.4) * k)
  p.rect(WALL_R.x0 * k, (ROOM_TOP - 0.4) * k, (WALL_R.x1 - WALL_R.x0) * k, (DOOR_R_TOP - ROOM_TOP + 0.4) * k)
  // Above the corridors: the building, dark.
  p.noStroke()
  p.fill(mixHex(c.bg, SHOP.black, 0.3))
  if (f.x0 < WALL_L.x0) p.rect(Math.max(-0.5, f.x0 - 1) * k, (ROOM_TOP - 0.4) * k, (WALL_L.x0 - Math.max(-0.5, f.x0 - 1)) * k, (CORRIDOR_TOP - ROOM_TOP + 0.4) * k)
  p.pop()
}

/** Where the trough lights hang. */
const LAMPS = [4.6, 9.2, 13.8, 18.4, 23.0]

/** A tier's section: its players, back to front, and their stands. */
function section(p: p5, c: Ctx, T: number, tier: (typeof TIERS)[number], L: number): void {
  for (const s of seats(tier)) {
    const lift = s.depth * 0.1
    const seat: Pt = [s.x, tier.top - SEAT_H - lift]
    const play = playing(T, tier.section, s.seed)
    drawPlayer(p, c, seat, tier.section, play, L, s.depth, s.seed)
    drawPlayerStand(p, c, [s.x + 1.02, tier.top - lift], L, play.up, s.depth)
  }
}

function podium(p: p5, c: Ctx, L: number): void {
  const { k, ink, weight } = c
  p.push()
  p.rectMode(p.CORNER)
  solid(p, ink, weight, lit(SHOP.black, 0.5 + 0.5 * L))
  p.rect((PODIUM.x - PODIUM.w / 2) * k, PODIUM_TOP * k, PODIUM.w * k, PODIUM.h * k, 0.03 * k)
  p.noStroke()
  p.fill(alpha(p, SHOP.tungsten, 0.15 * L))
  p.rect((PODIUM.x - PODIUM.w / 2 + 0.05) * k, (PODIUM_TOP + 0.02) * k, (PODIUM.w - 0.1) * k, 0.035 * k)
  p.pop()
}

/** The two doors' leaves: shut, they are the wall's thickness; swung, a face-on door with its small window. */
function doors(p: p5, c: Ctx, T: number, L: number): void {
  leaf(p, c, WALL_L.x1, G, DOOR_TOP, doorL(T), 1, L, WALL_L.x1 - WALL_L.x0)
}

function leaf(p: p5, c: Ctx, hinge: number, floor: number, top: number, open: number, dir: 1 | -1, light: number, thick: number): void {
  const { k, ink, weight } = c
  const a = open * (Math.PI / 2)
  const w = DOOR_W * Math.sin(a)
  const t = thick * 0.6 * Math.cos(a)
  const grow = 1 + 0.05 * Math.sin(a)
  const h = floor - top
  const x0 = hinge - dir * t
  const x1 = hinge + dir * w
  const wood = lit(SHOP.wood, 0.35 + 0.65 * light)
  p.push()
  // Shut, the leaf is the wall's thickness: its edge soft, so it is not a bright line the height of the frame.
  p.stroke(alpha(p, ink, 0.3 + 0.7 * Math.sin(a)))
  p.strokeWeight(weight)
  p.fill(wood)
  p.beginShape()
  p.vertex(x0 * k, top * k)
  p.vertex(x1 * k, (floor - h * grow) * k)
  p.vertex(x1 * k, floor * k)
  p.vertex(x0 * k, floor * k)
  p.endShape(p.CLOSE)
  if (w > 0.25) {
    // The small window, high in the door, and the push plate.
    const cx = hinge + dir * w * 0.55
    const ww = 0.26 * Math.sin(a)
    p.noStroke()
    p.fill(mixHex(SHOP.deep, SHOP.window, 0.18 + 0.2 * light))
    p.rect(cx * k, (floor - h * 0.72) * k, ww * k, 0.55 * k, 0.03 * k)
    p.fill(lit(KIT.chrome, light))
    p.rect((hinge + dir * w * 0.82) * k, (floor - h * 0.45) * k, 0.06 * Math.sin(a) * k, 0.3 * k)
  }
  p.pop()
}

/** The light: warm cones under the troughs and the stand lamps' pools, all on the room's light. */
function glow(p: p5, c: Ctx, T: number, f: ReturnType<typeof frame>, L: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const lx of LAMPS) {
    if (lx < f.x0 - 4 || lx > f.x1 + 4) continue
    const top = (ROOM_TOP + 0.72) * k
    const g = ctx.createLinearGradient(0, top, 0, PIT * k)
    const a = 0.065 * L
    g.addColorStop(0, `rgba(240, 179, 90, ${a.toFixed(3)})`)
    g.addColorStop(1, 'rgba(240, 179, 90, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((lx - 0.8) * k, top)
    ctx.lineTo((lx + 0.8) * k, top)
    ctx.lineTo((lx + 3.0) * k, PIT * k)
    ctx.lineTo((lx - 3.0) * k, PIT * k)
    ctx.closePath()
    ctx.fill()
  }
  // Each section's front stand lamp: a small pool on the page, flaring with the section's hits.
  for (const tier of TIERS) {
    if (tier.x1 < f.x0 - 2 || tier.x0 > f.x1 + 2) continue
    const s = seats(tier).find((q) => q.depth === 0)!
    const flare = accent(T, tier.section) / 0.42
    const cx = (s.x + 0.86) * k
    const cy = (tier.top - 1.9) * k
    const r = (0.55 + 0.25 * flare) * k
    const a = (0.07 + 0.2 * flare) * L * hornsUp(T)
    if (a < 0.004) continue
    const q = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    q.addColorStop(0, `rgba(246, 217, 160, ${a.toFixed(3)})`)
    q.addColorStop(1, 'rgba(246, 217, 160, 0)')
    ctx.fillStyle = q
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the far corridor (the tempo part's) */

/** The corridor beyond the far door, from the wall to `x1`: dark, lit only through the open door. */
export function drawFarCorridor(p: p5, c: Ctx, T: number, x1: number): void {
  const { k, ink, weight } = c
  const x0 = WALL_R.x1
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(mixHex(c.bg, SHOP.deep, 0.62))
  p.rect(x0 * k, CORRIDOR_R_TOP * k, (x1 - x0) * k, (PIT - CORRIDOR_R_TOP) * k)
  p.fill(mixHex(SHOP.deep, SHOP.wood, 0.22))
  p.rect(x0 * k, (PIT - 0.18) * k, (x1 - x0) * k, 0.18 * k)
  p.fill(mixHex(c.bg, SHOP.black, 0.3))
  p.rect(x0 * k, (ROOM_TOP - 0.4) * k, (x1 - x0) * k, (CORRIDOR_R_TOP - ROOM_TOP + 0.4) * k)
  p.rect(x0 * k, PIT * k, (x1 - x0) * k, 3 * k)
  outline(p, ink, weight)
  p.line(x0 * k, PIT * k, x1 * k, PIT * k)
  pen(p, alpha(p, ink, 0.5), weight * 0.8)
  p.line(x0 * k, CORRIDOR_R_TOP * k, x1 * k, CORRIDOR_R_TOP * k)
  // The far door's leaf, swung out into this corridor (drawn here, over the corridor's dark).
  leaf(p, c, WALL_R.x1, PIT, DOOR_R_TOP, doorR(T), 1, 0.6 * roomLight(T), WALL_R.x1 - WALL_R.x0)
  const s = spill(T) * roomLight(T)
  if (s > 0.001) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createLinearGradient(x0 * k, 0, (x0 + 2.6) * k, 0)
    g.addColorStop(0, `rgba(240, 179, 90, ${(0.2 * s).toFixed(3)})`)
    g.addColorStop(1, 'rgba(240, 179, 90, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, DOOR_R_TOP * k, 2.6 * k, (PIT - DOOR_R_TOP) * k)
    ctx.restore()
  }
  p.pop()
}

/** The snare alone, drawn over the ball while he ducks behind it. */
export function drawSnareOver(p: p5, c: Ctx, T: number): void {
  p.push()
  p.translate(KX * c.k, KY * c.k)
  drawKit(p, c, { shell: KIT.lacquer, since: (piece: KitPiece) => sinceStroke(piece, T), light: 0.45 + 0.55 * roomLight(T), without: ['kick', 'floor', 'rack', 'hat', 'ride', 'crash'] })
  p.pop()
}
