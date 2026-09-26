import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { drawKit, type KitPiece } from '../drums'
import { drawConductor } from '../fletcher'
import { alpha, frame, hash, scenery, type Ctx } from '../kit'
import { CARNEGIE, CHORD, CUTOFF, FINAL, LAST_CHORD, SOLO, level, SHOUT_ORIGIN, SHOUT_PERIOD } from '../music'
import { HALL, KIT } from '../worlds'
import { baseAt, bowAt, crashAskew, fletcherAt, floorAt, hushDoor, poseAt, riseAt, rubatoOn } from './conductor'
import { ROLL, rolling } from './finale-clock'
import { drawFinaleBody } from './finale-rig'
import { CUE_FROM, cueAt, type Cue } from './light'
import { drawDrummerBody } from './solo-rig'
import { ARCH, DOOR, FLOOR, JIM_WINGS, KIT_AT, LIP, PIANO, PODIUM, RISERS } from './stage'
import { sinceStroke } from './strokes'
import { drawLeafAt, drawOpenDoorway } from './sabotage-set'

/**
 * Carnegie Hall: the stage and everything on it that is not a part's own machine. Scenery, drawn from show time,
 * placed by the score at the Carnegie frame's origin (`stage.ts`). Seen from the house, in elevation:
 *
 * - the proscenium: a broad gilt arch over the stage, the stage shell inside it in tall warm panels, the dark of
 *   the hall round it;
 * - the stage floor and its lip, the house below in the dark (the velvet backs of the front rows in the spill);
 * - the band on three risers, each player a dark figure behind a big-band stand with its lamp, horns gilt and up
 *   when they play, lifting on the chorus's accents;
 * - the grand piano (side on, lid up), Fletcher's podium, the stage door (no upright bass: with no player it had no
 *   job, and every time Fletcher crossed between the kit and his podium its scroll rose out of his head);
 * - the kit, answering every Carnegie part's strokes (`strokes.ts`), its crash knocked askew in the hush until
 *   Fletcher sets it straight (`conductor.ts`), its snare trembling under the finale's roll, its cymbals choked on
 *   the cut-off;
 * - Fletcher's rig from the solo's first stroke (the sabotage draws him before);
 * - and the light (`light.ts`): one scored cue from the cut-off before the solo to the dark under the credits, read
 *   by every light here and by the dark laid over the stage after the parts' machines (`hallDark`).
 *
 * The stage draws in `rectMode(CENTER)` (`engine.ts`); everything here is laid out by corners, so the hall sets
 * `CORNER` inside its own push.
 */

interface HallState {
  /** Nothing: the hall is drawn from show time alone. */
  on: true
}

/** The springline of the proscenium's arch: its sides stand to here, and the arch rises from it to `ARCH.top`. */
const SPRING = -6.4
const ARCH_CX = (ARCH.x0 + ARCH.x1) / 2
const ARCH_RX = (ARCH.x1 - ARCH.x0) / 2
const ARCH_RY = SPRING - ARCH.top
/** The gilt moulding round the opening. */
const MOULD = 0.6
/** The edge of anything dark on the stage: its own black, never the cream ink (light tells it from the wall). */
const EDGE = '#050404'

export { LIGHTS_UP } from './light'

/** How lit the band is at `t`, 0..1 (the cue's band channel). */
export function bandLight(t: number): number {
  return cueAt(t).band
}

/** How lit the kit's lacquer is at `t` (the cue's; the rubato's metronome draws its kit with it too). */
export function kitLight(t: number): number {
  return cueAt(t).kit
}

const ease = (t: number, a: number, b: number): number => easeInOutSine(clamp((t - a) / (b - a)))

/** How much the band's horns are up at `t` (0 in their laps, 1 at their mouths). */
function hornsUp(t: number): number {
  if (t < CUTOFF) return 1
  if (t < LAST_CHORD - 1.6) return 1 - ease(t, CUTOFF + 0.3, CUTOFF + 1.9)
  if (t < FINAL) return ease(t, LAST_CHORD - 1.6, LAST_CHORD - 0.3)
  return 1 - ease(t, FINAL + 0.8, FINAL + 3.3)
}

/** A horn player's accent at `t`: a lift of the bell on the chorus's strong beats, damped; one on the last chord. */
function accent(t: number, seat: number): number {
  if (t < CARNEGIE - 0.5 || t > CHORD + 0.5) {
    const s = t - LAST_CHORD
    return s >= 0 && s < 2 ? Math.exp(-s / 0.3) * (0.8 + 0.2 * hash(seat, 7)) : 0
  }
  const k = (t - SHOUT_ORIGIN) / SHOUT_PERIOD
  const since = (k - Math.floor(k)) * SHOUT_PERIOD
  const bar = Math.floor(k) % 2 === 0 ? 1 : 0.5
  return bar * Math.exp(-since / 0.14) * (0.8 + 0.2 * hash(seat, Math.floor(k)))
}

/**
 * Seconds since `piece` was struck, for the hall's kit: the parts' strokes; the finale's roll drawn on the snare as
 * a tremble of its head (nothing struck, `finale-clock.ts`); and the cymbals choked on the cut-off.
 */
export function kitSince(piece: KitPiece, T: number): number {
  const s = sinceStroke(piece, T)
  if ((piece === 'crash' || piece === 'ride') && T > FINAL + 0.05 && T - s <= FINAL + 0.05) return Infinity
  if (piece === 'snare' && rolling(T)) return Math.min(s, (T - ROLL[0]) % 0.072)
  return s
}

export const hall = scenery<HallState>({
  name: 'hall',
  draw: (p, _s, c) => {
    const T = c.t
    const f = frame(p, c.k)
    p.push()
    p.rectMode(p.CORNER)
    shell(p, c, f, T)
    floorAndHouse(p, c, f, T)
    // The light falls on the wall and the floor, under everything that stands on the stage: the dark things (the
    // shells, the piano, Fletcher) stay dark against a lit wall instead of being lifted to its value.
    hallLight(p, c, T)
    door(p, c, T)
    band(p, c, T)
    piano(p, c, T)
    podium(p, c, T)
    p.push()
    p.translate(KIT_AT[0] * c.k, KIT_AT[1] * c.k)
    // The drummer's frame's body sits behind the drums (the solo and the hush; the finale's own clock).
    drawDrummerBody(p, c, T)
    drawFinaleBody(p, c, T)
    drawKit(p, c, { shell: KIT.lacquer, since: (piece) => kitSince(piece, T), light: kitLight(T), askew: { crash: crashAskew(T) } })
    p.pop()
    if (T >= SOLO) drawConductor(p, c, fletcherAt(T), poseAt(T), { floor: floorAt(T), base: baseAt(T), bow: bowAt(T), light: Math.max(kitLight(T), 0.55 + 0.45 * Math.min(1, bandLight(T))) })
    p.pop()
  },
})

/* ------------------------------------------------------------------ the room */

/** The proscenium's opening as a path: up the two sides to the springline and over the arch. `inset` shrinks it. */
function opening(ctx: CanvasRenderingContext2D, k: number, inset = 0): void {
  ctx.beginPath()
  ctx.moveTo((ARCH.x0 + inset) * k, (FLOOR + 1) * k)
  ctx.lineTo((ARCH.x0 + inset) * k, SPRING * k)
  ctx.ellipse(ARCH_CX * k, SPRING * k, (ARCH_RX - inset) * k, (ARCH_RY - inset) * k, 0, Math.PI, 2 * Math.PI)
  ctx.lineTo((ARCH.x1 - inset) * k, (FLOOR + 1) * k)
  ctx.closePath()
}

function shell(p: p5, c: Ctx, f: ReturnType<typeof frame>, T: number): void {
  const { k, weight } = c
  const q = cueAt(T)
  const lit = 0.35 + 0.65 * Math.min(1, q.band)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The hall round the arch: its dark front wall.
  p.noStroke()
  p.fill(mixHex(c.bg, HALL.deep, 0.35))
  p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (FLOOR - f.y0 + 0.5) * k)
  // The gilt moulding round the opening, then the stage shell inside it.
  ctx.save()
  opening(ctx, k, -MOULD)
  ctx.clip()
  p.fill(mixHex(HALL.deep, HALL.gilt, 0.22 + 0.3 * lit))
  p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (FLOOR - f.y0) * k)
  ctx.restore()
  ctx.save()
  opening(ctx, k)
  ctx.clip()
  const wall = mixHex(c.bg, HALL.deep, 0.6 + 0.4 * lit)
  p.fill(wall)
  p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (FLOOR - f.y0) * k)
  // The shell's tall panels: wood a shade warmer than the wall, with a narrow dark joint between each (fills, no lines).
  const panel = mixHex(wall, HALL.floor, 0.16 + 0.1 * lit)
  const W = 2.6
  const first = ARCH.x0 + 0.25
  const top = Math.max(f.y0, ARCH.top)
  const i0 = Math.max(0, Math.floor((f.x0 - first) / W) - 1)
  const i1 = Math.ceil((f.x1 - first) / W)
  p.fill(panel)
  for (let i = i0; i <= i1; i++) {
    const x = first + i * W
    if (x > ARCH.x1) break
    p.rect((x + 0.06) * k, top * k, (W - 0.12) * k, (FLOOR - top) * k)
  }
  // The light on the back wall, as the practice room's lamp lights its wall, made grand: a field where the cue's pool
  // is (behind the kit and the podium for the whole stage, the kit alone for the solo, the metronome in the rubato, the
  // two of them at the end), in the cue's colour, and one behind the band (the band's light), falling to the dark at
  // the arch and up in the flies. Every dark thing on the stage stands against it.
  const kitGlow = Math.min(1, q.wall)
  field(ctx, k, q.cx, q.cy, q.rx, q.ry, wallTone(q), 0.95 * kitGlow)
  field(ctx, k, 12.8, FLOOR - 3.3, 9.0, 5.2, wallTone({ ...q, cool: 0 }), 0.8 * Math.min(1, q.band))
  // Over the light: the joints between the panels, the rail along the shell at hand height with its top catching
  // the light, and the lower panels in the shadow of the risers and the drums.
  ctx.fillStyle = css(HALL.black, 0.42)
  for (let i = i0; i <= i1 + 1; i++) {
    const x = first + i * W
    if (x > ARCH.x1 + 0.1) break
    ctx.fillRect((x - 0.06) * k, top * k, 0.12 * k, (FLOOR - top) * k)
  }
  const rail = FLOOR - 1.35
  ctx.fillStyle = css(HALL.black, 0.32)
  ctx.fillRect(ARCH.x0 * k, (rail + 0.1) * k, (ARCH.x1 - ARCH.x0) * k, (FLOOR - rail - 0.1) * k)
  ctx.fillStyle = css(HALL.black, 0.5)
  ctx.fillRect(ARCH.x0 * k, (rail + 0.02) * k, (ARCH.x1 - ARCH.x0) * k, 0.08 * k)
  const railLit = ctx.createLinearGradient((ARCH.x0 + 2) * k, 0, (ARCH.x1 - 2) * k, 0)
  const at = (x: number): number => (x - (ARCH.x0 + 2)) / (ARCH.x1 - ARCH.x0 - 4)
  railLit.addColorStop(0, css(HALL.gilt, 0.08 * lit))
  railLit.addColorStop(clamp(at(-1.5)), css(HALL.gilt, 0.2 + 0.4 * kitGlow))
  railLit.addColorStop(clamp(at(4.5)), css(HALL.gilt, 0.15 + 0.3 * Math.max(kitGlow, Math.min(1, q.band))))
  railLit.addColorStop(clamp(at(12.5)), css(HALL.gilt, 0.15 + 0.35 * Math.min(1, q.band)))
  railLit.addColorStop(1, css(HALL.gilt, 0.08 * lit))
  ctx.fillStyle = railLit
  ctx.fillRect(ARCH.x0 * k, rail * k, (ARCH.x1 - ARCH.x0) * k, 0.035 * k)
  ctx.restore()
  // The moulding's two edges, catching the light (and the last chord's blaze).
  ctx.save()
  ctx.lineWidth = weight * (0.9 + 0.5 * q.blaze)
  ctx.strokeStyle = mixHex(HALL.gilt, HALL.beam, 0.2 * lit + 0.35 * q.blaze)
  ctx.globalAlpha = Math.min(1, 0.4 + 0.4 * lit + 0.2 * q.blaze)
  opening(ctx, k, -MOULD)
  ctx.stroke()
  ctx.globalAlpha = Math.min(1, 0.25 + 0.3 * lit + 0.2 * q.blaze)
  opening(ctx, k)
  ctx.stroke()
  ctx.restore()
}

function floorAndHouse(p: p5, c: Ctx, f: ReturnType<typeof frame>, T: number): void {
  const { k, weight } = c
  const x0 = Math.min(f.x0, ARCH.x0 - 6)
  const x1 = Math.max(f.x1, ARCH.x1 + 6)
  // The floor and the house's front rows in the cue's light (up to 1.4 for the burst's slam and the last chord).
  const house = cueAt(T).house
  const lit = 0.5 + 0.5 * Math.min(1, house)
  const rows = 0.6 + 0.4 * house
  // The stage floor: its boards seen a little from above, dark wood, and the apron's face below them.
  p.noStroke()
  p.fill(mixHex(c.bg, HALL.floor, 0.45 + 0.4 * lit))
  p.rect(x0 * k, FLOOR * k, (x1 - x0) * k, 0.14 * k)
  p.fill(mixHex(c.bg, HALL.floor, 0.22 + 0.12 * lit))
  p.rect(x0 * k, (FLOOR + 0.14) * k, (x1 - x0) * k, (LIP - FLOOR - 0.14) * k)
  // The stage's front edge: the light along the nosing.
  p.stroke(alpha(p, HALL.gilt, 0.14 + 0.2 * lit))
  p.strokeWeight(weight * 0.6)
  p.line(x0 * k, (FLOOR + 0.14) * k, x1 * k, (FLOOR + 0.14) * k)
  // The house below the lip: dark, and the velvet backs of the front rows in the stage's spill.
  p.noStroke()
  p.fill(mixHex(c.bg, HALL.deep, 0.4))
  p.rect(x0 * k, LIP * k, (x1 - x0) * k, (Math.max(f.y1, LIP + 1) - LIP) * k)
  // The front rows: one dark band each, its top edge rising and falling where the seat backs are (never a row of
  // beads), lit only by the stage's spill.
  const fx0 = Math.max(x0, f.x0 - 1)
  const fx1 = Math.min(x1, f.x1 + 1)
  for (let row = 0; row < 3; row++) {
    const y = LIP + 0.8 + row * 0.7
    p.fill(mixHex(c.bg, HALL.velvet, (0.3 - row * 0.08) * rows))
    p.beginShape()
    p.vertex(fx0 * k, (y + 0.9) * k)
    for (let x = Math.floor(fx0 * 4) / 4; x <= fx1 + 0.25; x += 0.25) {
      const bump = 0.07 * Math.sin((x + row * 0.45) * 3.4) + 0.05 * (hash(Math.round(x * 4), row) - 0.5)
      p.vertex(x * k, (y - bump) * k)
    }
    p.vertex(fx1 * k, (y + 0.9) * k)
    p.endShape(p.CLOSE)
  }
}

/**
 * The stage door in the wings: shut, a dark leaf in a dark frame, its small window lit from the corridor (the
 * sabotage opens it); the stage's spill catches the frame's edge on the side toward the stage.
 */
function door(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const x = DOOR.x
  const leaf = mixHex(c.bg, HALL.deep, 0.8)
  const frameCol = mixHex(HALL.deep, HALL.floor, 0.35)
  p.noStroke()
  p.fill(frameCol)
  p.rect((x - DOOR.w / 2 - 0.12) * k, (FLOOR - DOOR.h - 0.12) * k, (DOOR.w + 0.24) * k, (DOOR.h + 0.12) * k)
  // Open for the hush's look at Jim (`conductor.ts` `hushDoor`): the lit corridor behind him, as at the meeting.
  const open = T >= SOLO ? hushDoor(T) : 0
  if (open > 0.001) {
    drawOpenDoorway(p, c, open, 0.35 * clamp(open / 1.3))
    drawLeafAt(p, c, open)
    p.push()
    p.rectMode(p.CORNER)
    p.noStroke()
    const lit = 0.25 + 0.5 * jimLit(T)
    p.fill(alpha(p, HALL.gilt, 0.35 * lit))
    p.rect((x + DOOR.w / 2) * k, (FLOOR - DOOR.h - 0.12) * k, 0.12 * k, (DOOR.h + 0.12) * k)
    p.pop()
    return
  }
  p.fill(leaf)
  p.rect((x - DOOR.w / 2) * k, (FLOOR - DOOR.h) * k, DOOR.w * k, DOOR.h * k)
  // The lit edge: the frame's stage side and its head, in the spill.
  const lit = 0.25 + 0.5 * Math.max(0.3 * bandLight(T), T >= SOLO ? jimLit(T) : 0)
  p.fill(alpha(p, HALL.gilt, 0.35 * lit))
  p.rect((x + DOOR.w / 2) * k, (FLOOR - DOOR.h - 0.12) * k, 0.12 * k, (DOOR.h + 0.12) * k)
  p.fill(alpha(p, HALL.gilt, 0.2 * lit))
  p.rect((x - DOOR.w / 2 - 0.12) * k, (FLOOR - DOOR.h - 0.12) * k, (DOOR.w + 0.24) * k, 0.035 * k)
  // The window, lit from the corridor, and its dark bar.
  p.fill(alpha(p, HALL.gold, 0.5))
  p.rect((x - 0.25) * k, (FLOOR - DOOR.h + 0.7) * k, 0.5 * k, 0.7 * k, 0.05 * k)
  // The push bar across the leaf.
  p.fill(mixHex(leaf, HALL.gilt, 0.25))
  p.rect((x - DOOR.w / 2 + 0.15) * k, (FLOOR - 1.95) * k, (DOOR.w - 0.3) * k, 0.06 * k, 0.03 * k)
}

/** The grand piano, side on, its lid up toward the house, its keyboard toward the kit. Nobody at it: the solo is the drums'. */
function piano(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const ink = EDGE
  const q = cueAt(T)
  const lit = 0.4 + 0.6 * Math.min(1, Math.max(0.7 * q.wall, q.band))
  const x0 = PIANO.x - PIANO.w / 2
  const x1 = PIANO.x + PIANO.w / 2
  const rim = FLOOR - 1.95
  const under = rim + 0.46
  const black = mixHex(HALL.black, c.bg, 0.25)
  // The legs, and the lyre between them with its pedals.
  solid(p, ink, weight * 0.7, black)
  for (const lx of [x0 + 0.32, x1 - 0.42]) p.quad((lx - 0.09) * k, under * k, (lx + 0.09) * k, under * k, (lx + 0.06) * k, (FLOOR - 0.06) * k, (lx - 0.06) * k, (FLOOR - 0.06) * k)
  const ly = x1 - 1.05
  p.rect((ly - 0.08) * k, under * k, 0.16 * k, (FLOOR - 0.28 - under) * k, 0.03 * k)
  p.rect((ly - 0.16) * k, (FLOOR - 0.3) * k, 0.32 * k, 0.07 * k, 0.02 * k)
  // The lid, raised on its stick, a great tilted plane catching the stage's light on its edge.
  const hinge: [number, number] = [x1 - 0.25, rim]
  const tail: [number, number] = [x0 + 0.25, rim - 1.25]
  solid(p, ink, weight * 0.8, mixHex(black, HALL.deep, 0.5))
  p.quad(hinge[0] * k, hinge[1] * k, (hinge[0] - 0.2) * k, (hinge[1] - 0.16) * k, tail[0] * k, tail[1] * k, (tail[0] + 0.12) * k, (tail[1] + 0.16) * k)
  p.stroke(alpha(p, HALL.gilt, 0.35 * lit))
  p.strokeWeight(weight * 0.8)
  p.line((hinge[0] - 0.2) * k, (hinge[1] - 0.16) * k, tail[0] * k, tail[1] * k)
  // The stick under the lid.
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.line((x0 + 1.1) * k, rim * k, (x0 + 1.18) * k, (rim - 0.9) * k)
  // The case: straight along the keyboard end, curving in round the tail.
  solid(p, ink, weight * 0.85, black)
  p.beginShape()
  p.vertex(x1 * k, rim * k)
  p.vertex((x0 + 0.5) * k, rim * k)
  p.bezierVertex((x0 + 0.1) * k, rim * k, x0 * k, (rim + 0.12) * k, x0 * k, (rim + 0.24) * k)
  p.bezierVertex(x0 * k, (under - 0.08) * k, (x0 + 0.1) * k, under * k, (x0 + 0.5) * k, under * k)
  p.vertex(x1 * k, under * k)
  p.endShape(p.CLOSE)
  // The rim light along its top, and the keys at its end: a pale strip, dimmed.
  p.stroke(alpha(p, HALL.gilt, 0.25 + 0.3 * lit))
  p.strokeWeight(weight * 0.8)
  p.line((x0 + 0.5) * k, (rim + 0.05) * k, (x1 - 0.05) * k, (rim + 0.05) * k)
  p.noStroke()
  p.fill(mixHex(black, HALL.beam, 0.25 * lit))
  p.rect((x1 - 0.02) * k, (rim + 0.14) * k, 0.22 * k, 0.07 * k, 0.015 * k)
  solid(p, ink, weight * 0.6, black)
  p.rect((x1 - 0.02) * k, (rim + 0.21) * k, 0.26 * k, 0.12 * k, 0.02 * k)
}

function podium(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  solid(p, EDGE, weight * 0.8, HALL.black)
  p.rect((PODIUM.x - PODIUM.w / 2) * k, (FLOOR - PODIUM.h) * k, PODIUM.w * k, PODIUM.h * k, 0.04 * k)
  const q = cueAt(T)
  p.stroke(alpha(p, HALL.gilt, 0.3 + 0.3 * Math.min(1, Math.max(q.band, 0.6 * q.wall))))
  p.strokeWeight(weight * 0.8)
  p.line((PODIUM.x - PODIUM.w / 2 + 0.05) * k, (FLOOR - PODIUM.h + 0.03) * k, (PODIUM.x + PODIUM.w / 2 - 0.05) * k, (FLOOR - PODIUM.h + 0.03) * k)
}

/* ------------------------------------------------------------------ the band */

/** The band on its risers: each player a dark figure at a big-band stand, the stand's lamp on the page, the horn gilt. */
function band(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const lit = Math.min(1, bandLight(T))
  const up = hornsUp(T)
  // Back to front: the trumpets on the top riser first, the saxophones on the floor last.
  for (let row = RISERS.length - 1; row >= 0; row--) {
    const r = RISERS[row]
    // The riser: a black step, its top edge catching a little light.
    if (row > 0) {
      p.noStroke()
      p.fill(mixHex(HALL.black, c.bg, 0.4))
      p.rect(r.x0 * k, r.top * k, (r.x1 - r.x0) * k, (FLOOR - r.top) * k)
      p.stroke(alpha(p, HALL.gilt, 0.15 + 0.25 * lit))
      p.strokeWeight(weight * 0.6)
      p.line(r.x0 * k, r.top * k, r.x1 * k, r.top * k)
    }
    const gap = (r.x1 - r.x0) / r.seats
    for (let i = 0; i < r.seats; i++) {
      const seat = row * 10 + i
      const x = r.x0 + gap * (i + 0.5) + (row % 2) * 0.3
      player(p, c, x, r.top, row, seat, lit, up, accent(T, seat))
    }
  }
}

function player(p: p5, c: Ctx, x: number, top: number, row: number, seat: number, lit: number, up: number, a: number): void {
  const { k, weight } = c
  const ink = EDGE
  const body = mixHex(HALL.black, HALL.deep, 0.35 + 0.45 * lit)
  const hy = top - 2.2 + 0.03 * Math.sin(seat * 1.7)
  // The figure: a seated torso, shoulders, a head well above the ball's size, all in shadow.
  p.noStroke()
  p.fill(body)
  p.rect((x - 0.37) * k, (top - 1.85) * k, 0.74 * k, 1.3 * k, 0.26 * k, 0.26 * k, 0.05 * k, 0.05 * k)
  p.ellipse((x + 0.02) * k, hy * k, 0.5 * k, 0.6 * k)
  // The rim light: the top of the head and the far shoulder.
  p.noFill()
  p.stroke(alpha(p, HALL.gold, 0.12 + 0.4 * lit))
  p.strokeWeight(weight * 0.8)
  p.arc((x + 0.02) * k, hy * k, 0.5 * k, 0.6 * k, Math.PI * 1.2, Math.PI * 1.85)
  p.arc(x * k, (top - 1.6) * k, 0.74 * k, 0.5 * k, Math.PI * 1.55, Math.PI * 1.95)
  // The horn: an alto in front, trombones, trumpets behind; at the mouth when playing, lifted on the accents.
  const tilt = -0.25 - 0.5 * up - 0.18 * a * up
  solid(p, ink, weight * 0.6, mixHex(HALL.deep, HALL.gilt, 0.3 + 0.7 * lit))
  p.push()
  p.translate((x - 0.12) * k, (hy + 0.18 + 0.5 * (1 - up)) * k)
  if (row === 0) {
    // An alto: the neck from the mouth, the body down, the bow and the bell turned up.
    p.rotate(0.35 - 0.3 * up - 0.12 * a * up)
    p.rect(-0.05 * k, 0, 0.1 * k, 0.78 * k, 0.04 * k)
    p.quad(-0.05 * k, 0.74 * k, 0.1 * k, 0.86 * k, 0.34 * k, 0.56 * k, 0.24 * k, 0.5 * k)
  } else if (row === 1) {
    // A trombone: the slide out toward the conductor, the bell over the shoulder.
    p.rotate(tilt)
    p.rect(-1.0 * k, -0.035 * k, 1.0 * k, 0.07 * k)
    p.rect(-1.0 * k, 0.07 * k, 0.8 * k, 0.05 * k)
    p.triangle(0.05 * k, 0, 0.35 * k, -0.2 * k, 0.35 * k, 0.2 * k)
  } else {
    // A trumpet, level, its bell toward the conductor.
    p.rotate(tilt)
    p.rect(-0.55 * k, -0.04 * k, 0.55 * k, 0.08 * k)
    p.triangle(-0.52 * k, 0, -0.78 * k, -0.14 * k, -0.78 * k, 0.14 * k)
  }
  p.pop()
  // The big-band stand in front of him: a dark front, and the lit page on its desk above it.
  const sx = x - 0.08
  const st = top - 1.0
  solid(p, ink, weight * 0.5, mixHex(HALL.deep, HALL.beam, 0.2 + 0.6 * lit))
  p.quad((sx - 0.34) * k, (st - 0.22) * k, (sx + 0.34) * k, (st - 0.22) * k, (sx + 0.38) * k, st * k, (sx - 0.38) * k, st * k)
  solid(p, ink, weight * 0.6, mixHex(HALL.black, c.bg, 0.2))
  p.rect((sx - 0.46) * k, st * k, 0.92 * k, (top - st) * k, 0.03 * k)
  p.noStroke()
  p.fill(alpha(p, HALL.gilt, 0.25 + 0.45 * lit))
  p.rect((sx - 0.46) * k, st * k, 0.92 * k, 0.05 * k)
}

/* ------------------------------------------------------------------ the light */

/**
 * The stage's light on the wall and the floor, drawn under everything that stands on the stage (the band, the piano,
 * the kit, Fletcher; every part's machine is drawn over it too), all from the cue (`light.ts`): the wash from above,
 * beams down from the flies (the spot on the kit, softer ones over the band, the narrow top light on the rubato's
 * metronome), the cream pool on the kit and the floor, and the spill into the wings where Jim stands.
 */
export function hallLight(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const q = cueAt(T)
  const band = Math.min(1, q.band)
  const wash = q.wash + 0.05 * level(T) + 0.1 * q.blaze
  const tone = lightRGB(q)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // The stage's wash, from above.
  const g = ctx.createLinearGradient(0, (ARCH.top + 2) * k, 0, FLOOR * k)
  g.addColorStop(0, `rgba(${tone}, 0)`)
  g.addColorStop(1, `rgba(${tone}, ${Math.min(1, wash).toFixed(3)})`)
  ctx.fillStyle = g
  ctx.fillRect(ARCH.x0 * k, (ARCH.top + 2) * k, (ARCH.x1 - ARCH.x0) * k, (FLOOR - ARCH.top - 2) * k)
  // The beams from the flies: the spot on the kit, three softer ones over the band's risers (and every one of them up
  // on the last chord's blaze), and the rubato's narrow top light on the metronome.
  const beamHex = beamTone(q)
  const blaze = 1 + 0.6 * q.blaze
  beam(ctx, k, KIT_AT[0] - 0.7, ARCH.top + 0.6, 3.6, 0.075 * q.beam * blaze, beamHex)
  for (const x of [9.6, 13.4, 17.2]) beam(ctx, k, x, ARCH.top + 0.6, 2.5, 0.045 * band * blaze, beamHex)
  if (q.metro > 0.003) beam(ctx, k, METRO_X, ARCH.top + 0.6, 0.62, 0.11 * q.metro, beamHex, 0.18)
  // The cream pool the spot lays on the kit, and where it lands on the floor.
  if (q.pool > 0.001) {
    const cream = poolRGB(q)
    const cx = (q.cx - 0.6) * k
    const cy = (q.cy + 0.9) * k
    const r = 0.8 * q.rx * k
    const pq = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    pq.addColorStop(0, `rgba(${cream}, ${(0.16 * q.pool).toFixed(3)})`)
    pq.addColorStop(0.6, `rgba(${cream}, ${(0.06 * q.pool).toFixed(3)})`)
    pq.addColorStop(1, `rgba(${cream}, 0)`)
    ctx.fillStyle = pq
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
    ctx.save()
    ctx.translate((q.cx - 0.2) * k, (FLOOR + 0.05) * k)
    ctx.scale(1, 0.14)
    const fr = 0.7 * q.rx
    const fl = ctx.createRadialGradient(0, 0, 0, 0, 0, fr * k)
    fl.addColorStop(0, `rgba(${cream}, ${(0.2 * q.pool).toFixed(3)})`)
    fl.addColorStop(1, `rgba(${cream}, 0)`)
    ctx.fillStyle = fl
    ctx.fillRect(-fr * k, -fr * k, 2 * fr * k, 2 * fr * k)
    ctx.restore()
  }
  // The stage's light spilling into the wings where his father stands to watch: faint all through the solo, up
  // while the camera is with him (the solo's look across at him, the hush's), and out with the hall at the end. Low
  // and wide, on the floor, and a little up the wall behind him. Always warm: in the hush's cool it is the one other
  // warm island on the stage.
  const wings = T < SOLO ? 0 : (0.35 + 0.65 * jimLit(T)) * smoothIn(T, SOLO, SOLO + 3) * (1 - smoothIn(T, FINAL + 2, FINAL + 9))
  if (wings > 0.001) {
    const cx = (JIM_WINGS[0] + 0.25) * k
    const cy = (FLOOR - 0.55) * k
    const r = 1.9 * k
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.62)
    const wq = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    wq.addColorStop(0, `rgba(227, 176, 91, ${(0.13 * wings).toFixed(3)})`)
    wq.addColorStop(0.55, `rgba(227, 176, 91, ${(0.05 * wings).toFixed(3)})`)
    wq.addColorStop(1, 'rgba(227, 176, 91, 0)')
    ctx.fillStyle = wq
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
    // The spill up the wall behind him, from the stage's side: the wall round the door warm (the one other warm island
    // when the stage is cool and dark), and a little brighter low behind him.
    const up = 0.65 * jimLit(T) * wings
    if (up > 0.003) field(ctx, k, JIM_WINGS[0] + 0.5, FLOOR - 1.9, 2.3, 2.6, WALL_LIT, 0.75 * up)
    if (up > 0.003) {
      ctx.save()
      ctx.translate((JIM_WINGS[0] + 0.6) * k, (FLOOR - 1.2) * k)
      ctx.scale(1, 1.5)
      const w2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.6 * k)
      w2.addColorStop(0, `rgba(227, 176, 91, ${(0.12 * up).toFixed(3)})`)
      w2.addColorStop(1, 'rgba(227, 176, 91, 0)')
      ctx.fillStyle = w2
      ctx.fillRect(-1.6 * k, -1.6 * k, 3.2 * k, 3.2 * k)
      ctx.restore()
    }
  }
  // Behind Fletcher when the stage round him is dark (the rubato): a little of his light on the wall, so his black
  // figure stands against it, rim-lit, and does not go out with the wall.
  const back = T >= SOLO ? q.fl * q.dark : 0
  if (back > 0.02) {
    const [fx, fy] = fletcherAt(T)
    field(ctx, k, fx + 0.1, fy + 1.1, 1.3, 2.3, wallTone({ ...q, cool: 0 }), 0.22 * back)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the dark */

/** The metronome's pivot across the stage (`rubato-metronome.ts` `PIVOT_X`, which imports this file). */
const METRO_X = -1.47
/** The dark is soft everywhere, so it is drawn at a quarter of the canvas's size and laid over it smoothed. */
const MASK = 0.25
let mask: HTMLCanvasElement | null = null

/**
 * The dark laid over the stage after every part (the frame's arms, the engine, the metronome: machines drawn over the
 * hall, which its light cannot reach) and before the balls: the cue's dark outside its pool (and its `inside` over
 * the pool), with holes where the light falls: the pool, the metronome's top light, Fletcher's own light, and the
 * wings' warm spill for Jim. Then the burst's flash, a white slam over everything, gone in half a second.
 * On the Carnegie stage's `after` (`score.ts`).
 */
export const hallDark = scenery<HallState>({
  name: 'hall-dark',
  draw: (p, _s, c) => {
    const T = c.t
    if (T < CUE_FROM) return
    const q = cueAt(T)
    darkOver(p, c, T, q)
    if (q.flash > 0.004) {
      const { k } = c
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const f = frame(p, k)
      const r = 13 * k
      const cx = (KIT_AT[0] + 1.5) * k
      const cy = (KIT_AT[1] - 1) * k
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, `rgba(255, 243, 224, ${(0.34 * q.flash).toFixed(3)})`)
      g.addColorStop(1, `rgba(255, 243, 224, ${(0.14 * q.flash).toFixed(3)})`)
      ctx.fillStyle = g
      ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
      ctx.restore()
    }
  },
})

function darkOver(p: p5, c: Ctx, T: number, q: Cue): void {
  if (q.dark < 0.004 || typeof document === 'undefined') return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const w = Math.max(1, Math.ceil(cw * MASK))
  const h = Math.max(1, Math.ceil(ch * MASK))
  mask ??= document.createElement('canvas')
  if (mask.width !== w || mask.height !== h) {
    mask.width = w
    mask.height = h
  }
  const g = mask.getContext('2d')
  if (!g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.clearRect(0, 0, w, h)
  g.fillStyle = css(c.bg, q.dark)
  g.fillRect(0, 0, w, h)
  const m = ctx.getTransform()
  const sx = w / cw
  const sy = h / ch
  g.setTransform(m.a * sx, m.b * sy, m.c * sx, m.d * sy, m.e * sx, m.f * sy)
  g.globalCompositeOperation = 'destination-out'
  // The pool: over it only the cue's `inside`.
  hole(g, k, q.cx, q.cy, q.rx, q.ry, 1 - Math.min(1, q.inside / q.dark), 0.5)
  // The metronome's top light: a tall narrow reach of it, from the cradle down the rod to the bob.
  if (q.metro > 0.01) hole(g, k, METRO_X, -2.9, 0.95, 2.6, 0.85 * q.metro, 0.4)
  // Fletcher's own light, on his whole figure.
  if (q.fl > 0.01 && T >= SOLO) {
    const [fx, fy] = fletcherAt(T)
    hole(g, k, fx + 0.1, fy + 1.3, 1.2, 2.8, q.fl, 0.45)
    // In the rubato his beating hand rises above his head, out toward the metronome: the light reaches its whole travel.
    const beating = rubatoOn(T)
    if (beating > 0.01) hole(g, k, fx - 0.75, fy - 0.35, 0.8, 1.05, q.fl * beating, 0.5)
  }
  // The wings' warm spill, for Jim.
  const jim = T >= SOLO ? 0.85 * jimLit(T) : 0
  // (Over to the door while it is open for him, so its lit opening is inside the light.)
  if (jim > 0.01) hole(g, k, JIM_WINGS[0] + 0.45 - 0.95 * clamp(hushDoor(T) / 1.3), FLOOR - 1.8, 2.4, 2.8, jim, 0.45)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(mask, 0, 0, w, h, 0, 0, cw, ch)
  ctx.restore()
}

/** Cut a soft elliptical hole in the dark: `a` of it taken out inside `core` of the radius, easing to none at the edge. */
function hole(g: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, a: number, core: number): void {
  if (a < 0.005 || rx <= 0 || ry <= 0) return
  g.save()
  g.translate(x * k, y * k)
  g.scale(1, ry / rx)
  const q = g.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  const at = (u: number) => core + (1 - core) * u
  q.addColorStop(0, `rgba(0,0,0,${a})`)
  q.addColorStop(core, `rgba(0,0,0,${a})`)
  q.addColorStop(at(0.25), `rgba(0,0,0,${(0.82 * a).toFixed(4)})`)
  q.addColorStop(at(0.5), `rgba(0,0,0,${(0.5 * a).toFixed(4)})`)
  q.addColorStop(at(0.75), `rgba(0,0,0,${(0.18 * a).toFixed(4)})`)
  q.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = q
  g.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  g.restore()
}

/* ------------------------------------------------------------------ the cue's colours */

/** The hush's slate (the wall's, not Jim's blue-grey), and the burst's white on the wall. */
const SLATE = '#4B5561'
const WALL_WHITE = '#D8CCB9'
const mix3 = (a: number[], b: number[], u: number): number[] => a.map((v, i) => v + (b[i] - v) * u)
const GOLD_RGB = [227, 176, 91]
const COOL_RGB = [150, 168, 186]
const WHITE_RGB = [255, 243, 224]
const CREAM_RGB = [255, 241, 207]
const rgbOf = (v: number[]): string => v.map((x) => Math.round(x)).join(', ')

/** The back wall where the light falls on it, in the cue's colour. */
const wallTone = (q: Cue): string => mixHex(mixHex(WALL_LIT, SLATE, q.cool), WALL_WHITE, 0.5 * q.white)
/** The wash's colour, and the pool's, as `r, g, b`. */
const lightRGB = (q: Cue): string => rgbOf(mix3(mix3(GOLD_RGB, COOL_RGB, q.cool), WHITE_RGB, q.white))
const poolRGB = (q: Cue): string => rgbOf(mix3(mix3(CREAM_RGB, [200, 212, 224], 0.8 * q.cool), [255, 249, 242], q.white))
/** A beam's colour. */
const beamTone = (q: Cue): string => mixHex(mixHex(HALL.beam, '#C9D5E1', 0.8 * q.cool), '#FFF8EE', q.white)

/**
 * How much the wings' light is up for Jim, 0..1: while the camera is with him. The solo's look across at him
 * (`solo.ts`, 304.8-307.9) and the hush's visit (358.8-367.6: full as the camera lands on him, 360.1, down as the
 * two-shot leaves, 366.1). The build stays on the machine.
 */
export function jimLit(T: number): number {
  return Math.max(visit(T, 303.6, 308.4), visit(T, 358.8, 367.6))
}

const smoothIn = (t: number, a: number, b: number): number => easeInOutSine(clamp((t - a) / (b - a)))
/** 0..1: up over the first second and a half of [a, b], down over its last. */
const visit = (t: number, a: number, b: number): number => smoothIn(t, a, a + 1.5) * (1 - smoothIn(t, b - 1.5, b))

/** A palette colour as a CSS colour with alpha, for the canvas's gradients. */
function css(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** The back wall where the light falls on it: the floor's wood in the stage's gold. */
const WALL_LIT = mixHex(HALL.floor, HALL.gold, 0.26)

/** A soft elliptical field of `hex` at (cx, cy), `rx` by `ry` cells, `a` at its heart. */
function field(ctx: CanvasRenderingContext2D, k: number, cx: number, cy: number, rx: number, ry: number, hex: string, a: number): void {
  if (a < 0.005) return
  ctx.save()
  ctx.translate(cx * k, cy * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, css(hex, a))
  g.addColorStop(0.4, css(hex, a * 0.8))
  g.addColorStop(0.75, css(hex, a * 0.3))
  g.addColorStop(1, css(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/**
 * A beam from the flies: a cone of `hex` light from a narrow mouth high above (x, `from`), `mouth` either side of x,
 * to `spread` either side of x at the floor, two nested so its edges are soft.
 */
function beam(ctx: CanvasRenderingContext2D, k: number, x: number, from: number, spread: number, a: number, hex: string = HALL.beam, mouth = 0.35): void {
  if (a < 0.003) return
  const L = FLOOR - from
  for (const [w, f] of [[1, 0.55], [0.66, 0.8]] as const) {
    const g = ctx.createLinearGradient(0, from * k, 0, FLOOR * k)
    g.addColorStop(0, css(hex, 0))
    g.addColorStop(0.25, css(hex, a * f * 0.9))
    g.addColorStop(1, css(hex, a * f * 0.5))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((x - mouth * w) * k, from * k)
    ctx.lineTo((x + mouth * w) * k, from * k)
    ctx.lineTo((x + spread * w) * k, (from + L) * k)
    ctx.lineTo((x - spread * w) * k, (from + L) * k)
    ctx.closePath()
    ctx.fill()
  }
}
