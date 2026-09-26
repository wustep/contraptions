import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../parts'
import { outline, solid } from '../../../../../../../src/core/draw'
import type { Ctx } from './kit'
import { BLOOD, KIT } from './worlds'

/**
 * The drum kit: the one prop the whole film is about, drawn one way everywhere it stands (the practice room, the
 * studio band's room, the competitions, Carnegie Hall). Canonical: every part that shows a kit draws it with
 * `drawKit`, and the hall's kit is this one too. A part never draws its own kit.
 *
 * Seen from the front, as the house sees it, in elevation, a little from above so a head reads as a thin ellipse.
 * A cell is about a foot. The kit's frame has its origin where the ball rests on the snare's head: the ball's
 * centre is at (0, 0) there, and the head's top is at y = R (0.13). Everything is placed from that:
 *
 *   crash (high, right of centre)            ride (high, left)
 *   hi-hat (right)   snare (0, 0)   rack tom (left)   floor tom (far left)
 *                     kick (behind the snare, left of it; its front head faces the house)
 *   the floor at y = KIT_FLOOR
 *
 * `KIT_LAND[piece]` is where the ball's centre is when it rests on each surface (a cymbal: on its bow, a little in
 * from the bell). The kit responds to strikes: give `drawKit` a `since(piece)` (seconds since that piece was last
 * struck, Infinity if never) and each head dips and rings, each cymbal swings and settles, long and damped.
 */

export type KitPiece = 'snare' | 'hat' | 'rack' | 'floor' | 'kick' | 'ride' | 'crash'
export const KIT_PIECES: readonly KitPiece[] = ['kick', 'floor', 'rack', 'snare', 'hat', 'ride', 'crash']

/** The floor under the kit, in the kit's frame. */
export const KIT_FLOOR = 2.25

/** A drum: centre x, the head's top y, its width across and the shell's depth below the head. */
export interface Drum {
  x: number
  top: number
  w: number
  depth: number
}
/** A cymbal: its bell's centre, its width across, and its tilt (radians; positive dips its RIGHT edge, as p5 turns). */
export interface Cymbal {
  x: number
  y: number
  w: number
  tilt: number
}

export const SNARE: Drum = { x: 0, top: 0.13, w: 1.17, depth: 0.46 }
export const RACK: Drum = { x: -1.0, top: -0.66, w: 0.98, depth: 0.72 }
export const FLOOR_TOM: Drum = { x: -2.85, top: 0.32, w: 1.33, depth: 1.2 }
/** The kick: its front head is a circle facing the house, centre (x, cy), radius r. */
export const KICK = { x: -1.3, cy: KIT_FLOOR - 0.92, r: 0.92 }
export const HAT: Cymbal = { x: 1.55, y: -0.64, w: 1.17, tilt: 0 }
export const RIDE: Cymbal = { x: -3.05, y: -1.35, w: 1.72, tilt: 0.13 }
export const CRASH: Cymbal = { x: 0.5, y: -2.1, w: 1.45, tilt: -0.17 }

/** Where the ball's centre sits on a cymbal `dx` from its bell: on the tilted bow's top, the dome's rise included. */
function seat(s: Cymbal, dx: number): Pt {
  const dome = 0.085 * 0.9 * Math.sin(Math.PI * Math.max(0, Math.min(1, dx / s.w + 0.5)))
  return [s.x + dx * Math.cos(s.tilt), s.y + dx * Math.sin(s.tilt) - dome - 0.13]
}

/** Where the ball rests on each surface (its centre). The kick's is on its pedal's footboard. */
export const KIT_LAND: Record<KitPiece, Pt> = {
  snare: [0, 0],
  rack: [RACK.x, RACK.top - 0.13],
  floor: [FLOOR_TOM.x, FLOOR_TOM.top - 0.13],
  hat: [HAT.x - 0.28, HAT.y - 0.16],
  ride: seat(RIDE, 0.45),
  crash: seat(CRASH, 0.35),
  kick: [KICK.x + 0.78, KIT_FLOOR - 0.2],
}

/** How the kit looks: its shell, how it is lit, and how recently each piece was struck. */
export interface KitLook {
  /** The shells' lacquer: `KIT.oxblood` in the practice room, `KIT.lacquer` everywhere else. */
  shell?: string
  /** Seconds since `piece` was last struck (Infinity if never): what makes the kit move. */
  since?: (piece: KitPiece) => number
  /** How open the hi-hat is, 0 (closed, pedal down) to 1. */
  hat?: number
  /** One dab of blood on the snare's head: the practice room at night, and nowhere else. */
  blood?: boolean
  /** 0..1, how much of the kit is in light (a lamp's pool): 0 draws it as a dark shape against the dark. */
  light?: number
  /** Leave a piece out (a part that draws its own snare as a machine, say). */
  without?: KitPiece[]
  /** A cymbal knocked askew on its stand: radians added to its tilt (Carnegie's crash, in the hush). */
  askew?: Partial<Record<'ride' | 'crash', number>>
}

const never = (): number => Infinity

/** A struck head's dip, in cells: quick down, a long damped ring back. */
export function headDip(since: number, depth = 0.05): number {
  if (!(since >= 0) || since > 1.2) return 0
  return depth * Math.exp(-since / 0.09) * Math.cos(since * 38)
}

/** A struck cymbal's swing, radians: a hit tips it, and it rocks back slowly, damped over a second or two. */
export function cymbalSwing(since: number, amp = 0.14, ring = 1.1): number {
  if (!(since >= 0) || since > 6) return 0
  return amp * Math.exp(-since / ring) * Math.sin(Math.PI * 2 * 1.6 * since + 0.35) * (1 - Math.exp(-since / 0.02))
}

/** The whole kit, in the kit's frame (the snare's landing point at 0, 0). */
export function drawKit(p: p5, c: Ctx, look: KitLook = {}): void {
  const since = look.since ?? never
  const shell = look.shell ?? KIT.lacquer
  const light = look.light ?? 1
  const skip = new Set(look.without ?? [])
  p.push()
  // Laid out by corners (the stage draws in rectMode(CENTER)): the lugs, the pedal's footboard.
  p.rectMode(p.CORNER)
  // Back to front: the ride and the floor tom, the kick, the rack tom, the snare, the hi-hat, the crash.
  if (!skip.has('ride')) cymbal(p, c, RIDE, cymbalSwing(since('ride'), 0.08, 1.4) + (look.askew?.ride ?? 0), light, true)
  if (!skip.has('floor')) drum(p, c, FLOOR_TOM, shell, headDip(since('floor'), 0.06), light, 'legs')
  if (!skip.has('kick')) kick(p, c, shell, since('kick'), light)
  if (!skip.has('rack')) drum(p, c, RACK, shell, headDip(since('rack'), 0.05), light, 'mount')
  if (!skip.has('snare')) drum(p, c, SNARE, shell, headDip(since('snare'), 0.045), light, 'stand', look.blood)
  if (!skip.has('hat')) hat(p, c, look.hat ?? 0, since('hat'), light)
  if (!skip.has('crash')) cymbal(p, c, CRASH, cymbalSwing(since('crash'), 0.16, 1.2) + (look.askew?.crash ?? 0), light, true)
  p.pop()
}

/** A stick: from its butt at `from`, `len` long, at `angle` (radians, 0 pointing right), with its tip. */
export function drawStick(p: p5, c: Ctx, from: Pt, angle: number, len = 1.3): void {
  const { k, weight } = c
  const to: Pt = [from[0] + Math.cos(angle) * len, from[1] + Math.sin(angle) * len]
  // Hickory, edged in its own shadow (no cream outline), the bead at the tip.
  const edge = mixHex(KIT.hickory, KIT.shade, 0.75)
  p.push()
  p.strokeCap(p.ROUND)
  p.stroke(edge)
  p.strokeWeight(weight * 2.5)
  p.line(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
  p.stroke(KIT.hickory)
  p.strokeWeight(weight * 1.5)
  p.line(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
  solid(p, edge, weight * 0.6, KIT.hickory)
  p.ellipse(to[0] * k, to[1] * k, 0.07 * k, 0.05 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the pieces */

/** How bright a colour is, 0..255 (for telling a dark finish from a light one). */
const luma = (hex: string): number => 0.3 * parseInt(hex.slice(1, 3), 16) + 0.59 * parseInt(hex.slice(3, 5), 16) + 0.11 * parseInt(hex.slice(5, 7), 16)
/** The stage's dark, that a dark finish sinks into as the light goes (never lifted toward a brown). */
const DARK = '#050404'
/**
 * A colour as the light on it drops: a light finish (a head, bronze, chrome) sinks toward the kit's warm shadow; a
 * dark one (black lacquer) toward the stage's dark, so it stays black instead of greying to the wall's value.
 */
const shade = (hex: string, light: number): string =>
  light >= 0.999 ? hex : mixHex(luma(hex) < luma(KIT.shade) ? DARK : KIT.shade, hex, 0.35 + 0.65 * light)
/**
 * The stands, legs, spurs and mounts: chrome in the stage's shadow, a step down from the hoops, so the kit reads as
 * drums on hardware and not as a drawing of lines.
 */
const HARDWARE = mixHex(KIT.chrome, KIT.shade, 0.42)
/** A finish's own edge: its dark, never the cream ink. */
const edgeOf = (hex: string): string => mixHex(hex, DARK, 0.6)

/**
 * Lit lacquer across a shell from `x0` to `x1` (pixels): dark at both edges, a warm lifted band about 30% across
 * where the light from above and the house's left catches it, one narrow cream specular stripe in it, and the far
 * side rolling off into shadow. A dark finish lifts toward bronze; a coloured one (the old oxblood) toward its head.
 */
function lacquer(ctx: CanvasRenderingContext2D, x0: number, x1: number, shell: string, light: number): CanvasGradient {
  const body = shade(shell, light)
  const dark = luma(shell) < 40
  const edge = mixHex(body, DARK, 0.55)
  const band = mixHex(body, dark ? KIT.bronze : KIT.head, (dark ? 0.2 : 0.1) + (dark ? 0.16 : 0.08) * light)
  const spec = mixHex(body, KIT.head, (dark ? 0.35 : 0.3) + 0.3 * light)
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  g.addColorStop(0, edge)
  g.addColorStop(0.1, body)
  g.addColorStop(0.24, band)
  g.addColorStop(0.3, spec)
  g.addColorStop(0.335, band)
  g.addColorStop(0.5, mixHex(body, band, 0.35))
  g.addColorStop(0.78, body)
  g.addColorStop(1, edge)
  return g
}


/** A stand's post and its three feet, from `top` down to the floor. */
function stand(p: p5, c: Ctx, x: number, top: number, spread = 0.42): void {
  const { k, weight } = c
  p.stroke(HARDWARE)
  p.strokeWeight(weight * 0.9)
  p.line(x * k, top * k, x * k, (KIT_FLOOR - 0.38) * k)
  p.strokeWeight(weight * 0.75)
  p.line(x * k, (KIT_FLOOR - 0.38) * k, (x - spread) * k, KIT_FLOOR * k)
  p.line(x * k, (KIT_FLOOR - 0.38) * k, (x + spread) * k, KIT_FLOOR * k)
  p.line(x * k, (KIT_FLOOR - 0.38) * k, x * k, KIT_FLOOR * k)
}

/** A drum: its shell (with hoops and lugs), its head as a thin ellipse on top, dipping by `dip`. */
function drum(p: p5, c: Ctx, d: Drum, shell: string, dip: number, light: number, mount: 'stand' | 'legs' | 'mount', blood = false): void {
  const { k, weight } = c
  const x0 = d.x - d.w / 2
  const x1 = d.x + d.w / 2
  const eh = d.w * 0.11
  const top = d.top
  const bottom = d.top + d.depth
  if (mount === 'stand') stand(p, c, d.x, bottom, 0.38)
  if (mount === 'legs') {
    p.stroke(HARDWARE)
    p.strokeWeight(weight * 0.8)
    for (const s of [-1, 1]) p.line((d.x + s * d.w * 0.44) * k, (bottom - 0.2) * k, (d.x + s * d.w * 0.6) * k, KIT_FLOOR * k)
  }
  if (mount === 'mount') {
    p.stroke(HARDWARE)
    p.strokeWeight(weight * 0.9)
    p.line(d.x * k, bottom * k, (KICK.x + 0.1) * k, (KICK.cy - KICK.r + 0.08) * k)
  }
  // The shell: a rectangle with a rounded bottom edge, lit lacquer (a cylinder: dark edges, a warm band, a stripe of
  // light), edged in its own dark.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x0 * k, top * k)
  ctx.lineTo(x1 * k, top * k)
  ctx.lineTo(x1 * k, bottom * k)
  ctx.ellipse(d.x * k, bottom * k, (d.w / 2) * k, eh * k, 0, 0, Math.PI)
  ctx.closePath()
  ctx.fillStyle = lacquer(ctx, x0 * k, x1 * k, shell, light)
  ctx.fill()
  ctx.lineWidth = weight * 0.9
  ctx.lineJoin = 'round'
  ctx.strokeStyle = edgeOf(shade(shell, light))
  ctx.stroke()
  ctx.restore()
  // Lugs: small chrome blocks round the shell's middle, fewer on a small drum.
  p.noStroke()
  p.fill(shade(mixHex(shell, KIT.chrome, 0.55), light))
  const n = d.w > 1.2 ? 5 : 4
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    const lx = x0 + u * d.w
    const lean = Math.cos(u * Math.PI) * 0.02
    p.rect((lx - 0.022 + lean) * k, (top + d.depth * 0.34) * k, 0.044 * k, Math.min(0.16, d.depth * 0.3) * k, 0.02 * k)
  }
  // The hoops: bright chrome bands at the top and bottom.
  outline(p, shade(KIT.chrome, 0.4 + 0.6 * light), weight * 1.2)
  p.line(x0 * k, (top + 0.035) * k, x1 * k, (top + 0.035) * k)
  p.arc(d.x * k, bottom * k, d.w * k, 2 * eh * k, 0, Math.PI)
  // The head: the struck skin, dipping at its middle, edged by the hoop's shadow.
  solid(p, mixHex(shade(KIT.head, light), KIT.shade, 0.55), weight * 0.8, shade(KIT.head, light))
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const cx = Math.cos(a)
    const sy = Math.sin(a)
    const sag = dip * (1 - cx * cx)
    p.vertex((d.x + (cx * d.w) / 2) * k, (top + sy * eh + (sy < 0 ? sag : sag * 0.4)) * k)
  }
  p.endShape(p.CLOSE)
  if (blood) {
    // One dab, off-centre where a stick lands: a small flattened drop, no spatter.
    p.noStroke()
    p.fill(BLOOD)
    p.ellipse((d.x + d.w * 0.14) * k, (top + dip * 0.6) * k, d.w * 0.11 * k, eh * 0.55 * k)
  }
}

/** The kick: the front head, a circle facing the house, with its hoop and a port; a tremble when struck. */
function kick(p: p5, c: Ctx, shell: string, since: number, light: number): void {
  const { k, weight } = c
  const shake = since >= 0 && since < 0.8 ? 0.012 * Math.exp(-since / 0.1) * Math.sin(since * 70) : 0
  const r = KICK.r * (1 + (since >= 0 && since < 0.5 ? 0.012 * Math.exp(-since / 0.07) : 0))
  // The spurs, out to the floor either side.
  p.stroke(HARDWARE)
  p.strokeWeight(weight * 0.8)
  for (const s of [-1, 1]) p.line((KICK.x + s * r * 0.8) * k, (KICK.cy + r * 0.45) * k, (KICK.x + s * r * 1.12) * k, KIT_FLOOR * k)
  // The hoop (the shell's lacquer, as a ring, edged in its own dark) and the head inside it.
  const hoop = shade(shell, light)
  solid(p, edgeOf(hoop), weight, mixHex(hoop, KIT.chrome, 0.12))
  p.circle(KICK.x * k, (KICK.cy + shake) * k, 2 * r * k)
  // The front head is the resonant one: a dark disc (the shell's colour lifted a little), so the big circle stays
  // quiet beside the ball; the light catches its rim along the top and the house's left, and a soft band inside it.
  const face = shade(mixHex(shell, KIT.head, 0.12), light)
  solid(p, edgeOf(face), weight * 0.8, face)
  p.circle(KICK.x * k, (KICK.cy + shake) * k, 2 * (r - 0.08) * k)
  p.noFill()
  p.stroke(mixHex(face, KIT.head, 0.12 + 0.1 * light))
  p.strokeWeight(weight * 1.2)
  p.circle(KICK.x * k, (KICK.cy + shake) * k, 2 * (r - 0.22) * k)
  p.stroke(mixHex(face, KIT.head, 0.3 + 0.35 * light))
  p.strokeWeight(weight * 1.5)
  p.arc(KICK.x * k, (KICK.cy + shake) * k, 2 * (r - 0.1) * k, 2 * (r - 0.1) * k, Math.PI * 1.02, Math.PI * 1.62)
  // Tension rods: short chrome ticks round the hoop.
  p.stroke(shade(KIT.chrome, light))
  p.strokeWeight(weight * 0.9)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3
    p.line(KICK.x * k + Math.cos(a) * (r - 0.02) * k, (KICK.cy + shake) * k + Math.sin(a) * (r - 0.02) * k, KICK.x * k + Math.cos(a) * (r + 0.05) * k, (KICK.cy + shake) * k + Math.sin(a) * (r + 0.05) * k)
  }
  // The pedal's footboard, at the kick's right foot, where the ball presses it.
  const press = since >= 0 && since < 0.4 ? Math.exp(-since / 0.06) : 0
  solid(p, edgeOf(KIT.chrome), weight * 0.7, shade(KIT.chrome, light))
  p.push()
  p.translate((KICK.x + 0.55) * k, (KIT_FLOOR - 0.02) * k)
  p.rotate(-0.22 + 0.16 * press)
  p.rect(0, -0.05 * k, 0.5 * k, 0.07 * k, 0.02 * k)
  p.pop()
}

/** A cymbal: a thin bronze lens on its stand, swung by `swing` about its bell. */
function cymbal(p: p5, c: Ctx, s: Cymbal, swing: number, light: number, boom: boolean): void {
  const { k, weight } = c
  stand(p, c, s.x + (boom ? 0.35 : 0), s.y + 0.25, 0.46)
  if (boom) {
    p.stroke(HARDWARE)
    p.strokeWeight(weight * 0.9)
    p.line((s.x + 0.35) * k, (s.y + 0.25) * k, s.x * k, (s.y + 0.04) * k)
  }
  p.push()
  p.translate(s.x * k, s.y * k)
  p.rotate(s.tilt + swing)
  const w = s.w * k
  const h = 0.085 * k
  const bronze = shade(KIT.bronze, light)
  solid(p, mixHex(bronze, KIT.shade, 0.7), weight * 0.8, bronze)
  // The lens: a shallow dome over a flat underside, and the bell on top.
  p.beginShape()
  for (let i = 0; i <= 18; i++) {
    const u = i / 18
    const x = (u - 0.5) * w
    p.vertex(x, -h * Math.sin(u * Math.PI) * 0.9)
  }
  for (let i = 18; i >= 0; i--) {
    const u = i / 18
    p.vertex((u - 0.5) * w, h * 0.18 * Math.sin(u * Math.PI))
  }
  p.endShape(p.CLOSE)
  p.ellipse(0, -h * 0.95, w * 0.2, h * 0.9)
  // Lathe lines: two faint arcs across the bow, the light catching them; and the light along its top edge.
  p.noFill()
  p.stroke(shade(KIT.head, light * 0.7))
  p.strokeWeight(weight * 0.45)
  for (const f of [0.62, 0.86]) p.arc(0, h * 0.5, w * f, h * 1.9, Math.PI * 1.08, Math.PI * 1.92)
  p.stroke(mixHex(bronze, KIT.head, 0.45 * light))
  p.strokeWeight(weight * 0.7)
  p.beginShape()
  for (let i = 2; i <= 9; i++) {
    const u = i / 18
    p.vertex((u - 0.5) * w, -h * Math.sin(u * Math.PI) * 0.9 + weight * 0.3)
  }
  p.endShape()
  p.pop()
}

/** The hi-hat: two cymbals face to face on a stand, the top one lifted by `open`. */
function hat(p: p5, c: Ctx, open: number, since: number, light: number): void {
  const { k, weight } = c
  const lift = 0.02 + 0.13 * Math.max(0, Math.min(1, open))
  const tick = since >= 0 && since < 0.5 ? 0.02 * Math.exp(-since / 0.06) : 0
  stand(p, c, HAT.x, HAT.y, 0.4)
  // The pull rod above the top cymbal.
  p.stroke(HARDWARE)
  p.strokeWeight(weight * 0.8)
  p.line(HAT.x * k, (HAT.y - lift - 0.3) * k, HAT.x * k, HAT.y * k)
  const w = HAT.w * k
  const h = 0.07 * k
  const bronze = shade(KIT.bronze, light)
  solid(p, mixHex(bronze, KIT.shade, 0.7), weight * 0.8, bronze)
  // Bottom cymbal, dome down; top cymbal, dome up.
  p.push()
  p.translate(HAT.x * k, HAT.y * k)
  p.beginShape()
  for (let i = 0; i <= 14; i++) p.vertex(((i / 14) - 0.5) * w, h * Math.sin((i / 14) * Math.PI))
  p.endShape(p.CLOSE)
  p.translate(0, -(lift + tick) * k)
  p.rotate(tick * 3)
  p.beginShape()
  for (let i = 0; i <= 14; i++) p.vertex(((i / 14) - 0.5) * w, -h * Math.sin((i / 14) * Math.PI))
  p.endShape(p.CLOSE)
  p.pop()
}
