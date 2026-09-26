import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { drawKit, type KitPiece } from '../drums'
import { drawConductor } from '../fletcher'
import { alpha, frame, hash, scenery, type Ctx } from '../kit'
import { CARNEGIE, CHORD, CUTOFF, FINAL, LAST_CHORD, SOLO, level, SHOUT_ORIGIN, SHOUT_PERIOD } from '../music'
import { HALL, KIT } from '../worlds'
import { baseAt, bowAt, crashAskew, fletcherAt, floorAt, poseAt } from './conductor'
import { ROLL, rolling } from './finale-clock'
import { drawFinaleBody } from './finale-rig'
import { drawDrummerBody } from './solo-rig'
import { ARCH, BASS, DOOR, FLOOR, JIM_WINGS, KIT_AT, LIP, PIANO, PODIUM, RISERS } from './stage'
import { sinceStroke } from './strokes'

/**
 * Carnegie Hall: the stage and everything on it that is not a part's own machine. Scenery, drawn from show time,
 * placed by the score at the Carnegie frame's origin (`stage.ts`). Seen from the house, in elevation:
 *
 * - the proscenium: a broad gilt arch over the stage, the stage shell inside it in tall warm panels, the dark of
 *   the hall round it;
 * - the stage floor and its lip, the house below in the dark (the velvet backs of the front rows in the spill);
 * - the band on three risers, each player a dark figure behind a big-band stand with its lamp, horns gilt and up
 *   when they play, lifting on the chorus's accents;
 * - the grand piano (side on, lid up), the upright bass in its stand, Fletcher's podium, the stage door;
 * - the kit, answering every Carnegie part's strokes (`strokes.ts`), its crash knocked askew in the hush until
 *   Fletcher sets it straight (`conductor.ts`), its snare trembling under the finale's roll, its cymbals choked on
 *   the cut-off;
 * - Fletcher's rig from the solo's first stroke (the sabotage draws him before);
 * - and the light: the whole stage for the last chorus, the band down into the dark on the cut-off and a pool on
 *   the kit for the solo, the band lit again for the last chord, and everything down to the dark under the credits.
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

/**
 * The hall's lights coming up after the match cut from the road: the cut opens on the road's darkness, and the
 * stage wakes on the chorus's first big hit (243.297).
 */
export const LIGHTS_UP = 243.297
const wake = (t: number): number => 0.12 + 0.88 * easeInOutSine(clamp((t - (LIGHTS_UP - 0.08)) / 0.35))
const ease = (t: number, a: number, b: number): number => easeInOutSine(clamp((t - a) / (b - a)))

/** How lit the band is at `t`, 0..1: up for the chorus, down after the cut-off, up for the last chord, down at the end. */
export function bandLight(t: number): number {
  if (t < LIGHTS_UP + 0.5) return wake(t)
  if (t < CUTOFF) return 1
  if (t < LAST_CHORD - 0.05) return 1 - 0.72 * ease(t, CUTOFF, CUTOFF + 2.2)
  if (t < FINAL) return 0.28 + 0.72 * ease(t, LAST_CHORD - 0.05, LAST_CHORD + 0.13)
  return 1 - 0.92 * ease(t, FINAL + 0.6, FINAL + 7)
}

/** The end of the show's light: the spot on the drummer closes over the last three seconds of the credits. */
const SPOT_OUT: [number, number] = [572.2, 575.3]

/** How lit the kit is at `t`: the stage's light, then the solo's pool; at the end it stays in its spot to the last. */
export function kitLight(t: number): number {
  if (t < LIGHTS_UP + 0.5) return wake(t)
  if (t < FINAL) return 1
  return (1 - 0.18 * ease(t, FINAL + 1.2, FINAL + 9)) * (1 - 0.8 * ease(t, SPOT_OUT[0], SPOT_OUT[1]))
}

/**
 * The solo's pool of light on the kit: it gathers as the band's chord is cut off; after the last cut-off it stays on
 * him (the band, the piano and the house go dark round it) and closes over the credits' last seconds.
 */
export function poolLight(t: number): number {
  return ease(t, CUTOFF - 0.3, SOLO + 0.35) * (1 - 0.12 * ease(t, FINAL + 1, FINAL + 8)) * (1 - 0.9 * ease(t, SPOT_OUT[0], SPOT_OUT[1]))
}

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
    bass(p, c, T)
    podium(p, c, T)
    p.push()
    p.translate(KIT_AT[0] * c.k, KIT_AT[1] * c.k)
    // The drummer's frame's body sits behind the drums (the solo and the hush; the finale's own clock).
    drawDrummerBody(p, c, T)
    drawFinaleBody(p, c, T)
    drawKit(p, c, { shell: KIT.lacquer, since: (piece) => kitSince(piece, T), light: kitLight(T), askew: { crash: crashAskew(T) } })
    p.pop()
    if (T >= SOLO) drawConductor(p, c, fletcherAt(T), poseAt(T), { floor: floorAt(T), base: baseAt(T), bow: bowAt(T), light: Math.max(kitLight(T), 0.55 + 0.45 * bandLight(T)) })
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
  const lit = 0.35 + 0.65 * bandLight(T)
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
  // The light on the back wall, as the practice room's lamp lights its wall, made grand: a warm field behind the kit
  // and the podium (the solo's spot), and one behind the band (the band's light), falling to the dark at the arch and
  // up in the flies. Every dark thing on the stage stands against it.
  const kitGlow = Math.max(poolLight(T), 0.75 * bandLight(T) * (T < SOLO ? kitLight(T) : 1))
  field(ctx, k, 1.0, FLOOR - 2.9, 7.8, 5.6, WALL_LIT, 0.95 * kitGlow)
  field(ctx, k, 12.8, FLOOR - 3.3, 9.0, 5.2, WALL_LIT, 0.8 * bandLight(T))
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
  railLit.addColorStop(clamp(at(4.5)), css(HALL.gilt, 0.15 + 0.3 * Math.max(kitGlow, bandLight(T))))
  railLit.addColorStop(clamp(at(12.5)), css(HALL.gilt, 0.15 + 0.35 * bandLight(T)))
  railLit.addColorStop(1, css(HALL.gilt, 0.08 * lit))
  ctx.fillStyle = railLit
  ctx.fillRect(ARCH.x0 * k, rail * k, (ARCH.x1 - ARCH.x0) * k, 0.035 * k)
  ctx.restore()
  // The moulding's two edges, catching the light.
  ctx.save()
  ctx.lineWidth = weight * 0.9
  ctx.strokeStyle = mixHex(HALL.gilt, HALL.beam, 0.2 * lit)
  ctx.globalAlpha = 0.4 + 0.4 * lit
  opening(ctx, k, -MOULD)
  ctx.stroke()
  ctx.globalAlpha = 0.25 + 0.3 * lit
  opening(ctx, k)
  ctx.stroke()
  ctx.restore()
}

function floorAndHouse(p: p5, c: Ctx, f: ReturnType<typeof frame>, T: number): void {
  const { k, weight } = c
  const x0 = Math.min(f.x0, ARCH.x0 - 6)
  const x1 = Math.max(f.x1, ARCH.x1 + 6)
  const lit = 0.5 + 0.5 * Math.max(kitLight(T) * 0.8, bandLight(T))
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
    p.fill(mixHex(c.bg, HALL.velvet, (0.3 - row * 0.08) * (0.6 + 0.4 * lit)))
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
  const lit = 0.4 + 0.6 * Math.max(kitLight(T) * 0.7, bandLight(T))
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

/** The upright bass in its stand beside the kit (its player is off): a dark varnished body, rim-lit. */
function bass(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const ink = EDGE
  const lit = 0.35 + 0.65 * Math.max(kitLight(T) * 0.6, bandLight(T))
  const x = BASS.x + 0.3
  const foot = FLOOR - 0.28
  const H = 2.3
  const body = mixHex(HALL.deep, HALL.floor, 0.3 + 0.3 * lit)
  const y = (v: number) => -v * H * k
  p.push()
  p.translate(x * k, foot * k)
  p.rotate(-0.06)
  // The stand: a low black cradle under the lower bout, and the end pin to the floor.
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.line(0, 0, 0.02 * k, 0.26 * k)
  solid(p, ink, weight * 0.7, HALL.black)
  p.rect(-0.55 * k, -0.18 * k, 1.1 * k, 0.1 * k, 0.03 * k)
  p.rect(-0.07 * k, -0.1 * k, 0.14 * k, 0.36 * k, 0.02 * k)
  // The body: lower bout, the waist with its C-bouts, the upper bout sloping in to the neck.
  solid(p, ink, weight * 0.9, body)
  p.beginShape()
  p.vertex(0, y(0))
  p.bezierVertex(0.5 * k, y(0), 0.66 * k, y(0.1), 0.64 * k, y(0.28))
  p.bezierVertex(0.62 * k, y(0.4), 0.46 * k, y(0.44), 0.4 * k, y(0.5))
  p.bezierVertex(0.36 * k, y(0.55), 0.5 * k, y(0.6), 0.5 * k, y(0.7))
  p.bezierVertex(0.5 * k, y(0.84), 0.3 * k, y(0.92), 0.12 * k, y(1))
  p.vertex(-0.12 * k, y(1))
  p.bezierVertex(-0.3 * k, y(0.92), -0.5 * k, y(0.84), -0.5 * k, y(0.7))
  p.bezierVertex(-0.5 * k, y(0.6), -0.36 * k, y(0.55), -0.4 * k, y(0.5))
  p.bezierVertex(-0.46 * k, y(0.44), -0.62 * k, y(0.4), -0.64 * k, y(0.28))
  p.bezierVertex(-0.66 * k, y(0.1), -0.5 * k, y(0), 0, y(0))
  p.endShape(p.CLOSE)
  // The f-holes: two thin dark slits either side of the bridge.
  p.noFill()
  p.stroke(mixHex(body, HALL.black, 0.75))
  p.strokeWeight(weight * 1.1)
  for (const s of [-1, 1]) p.bezier(s * 0.2 * k, y(0.54), s * 0.28 * k, y(0.46), s * 0.14 * k, y(0.4), s * 0.22 * k, y(0.3))
  // The bridge and the tailpiece, the fingerboard up the neck, the pegbox and its scroll.
  solid(p, ink, weight * 0.6, mixHex(HALL.floor, HALL.beam, 0.35 * lit))
  p.rect(-0.13 * k, y(0.44), 0.26 * k, 0.08 * k, 0.02 * k)
  solid(p, ink, weight * 0.7, HALL.black)
  p.quad(-0.07 * k, y(0.08), 0.07 * k, y(0.08), 0.1 * k, y(0.28), -0.1 * k, y(0.28))
  p.quad(-0.05 * k, y(0.52), 0.05 * k, y(0.52), 0.07 * k, y(1.72), -0.07 * k, y(1.72))
  solid(p, ink, weight * 0.8, body)
  p.rect(-0.06 * k, y(1.87), 0.12 * k, 0.16 * H * k, 0.04 * k)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.arc(0.03 * k, y(1.88), 0.18 * k, 0.18 * k, Math.PI * 0.9, Math.PI * 2.4)
  // The strings, faint, from the tailpiece over the bridge and up the fingerboard.
  p.stroke(alpha(p, HALL.beam, 0.2 * lit))
  p.strokeWeight(weight * 0.4)
  for (const s of [-0.025, 0.025]) p.line(s * k, y(0.24), s * 1.4 * k, y(1.7))
  // The rim light down its right side.
  p.stroke(alpha(p, HALL.gold, 0.16 + 0.3 * lit))
  p.strokeWeight(weight * 0.9)
  p.bezier(0.5 * k, y(0.62), 0.5 * k, y(0.75), 0.4 * k, y(0.88), 0.14 * k, y(0.99))
  p.pop()
}

function podium(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  solid(p, EDGE, weight * 0.8, HALL.black)
  p.rect((PODIUM.x - PODIUM.w / 2) * k, (FLOOR - PODIUM.h) * k, PODIUM.w * k, PODIUM.h * k, 0.04 * k)
  p.stroke(alpha(p, HALL.gilt, 0.3 + 0.3 * Math.max(bandLight(T), 0.6 * poolLight(T))))
  p.strokeWeight(weight * 0.8)
  p.line((PODIUM.x - PODIUM.w / 2 + 0.05) * k, (FLOOR - PODIUM.h + 0.03) * k, (PODIUM.x + PODIUM.w / 2 - 0.05) * k, (FLOOR - PODIUM.h + 0.03) * k)
}

/* ------------------------------------------------------------------ the band */

/** The band on its risers: each player a dark figure at a big-band stand, the stand's lamp on the page, the horn gilt. */
function band(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const lit = bandLight(T)
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
 * the kit, Fletcher; every part's machine is drawn over it too): the warm wash from above, beams down from the
 * flies (a strong one on the kit, softer ones over the band), the solo's pool on the kit, and the spill into the
 * wings where Jim stands.
 */
export function hallLight(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const pool = poolLight(T)
  const band = bandLight(T)
  const wash = 0.06 + 0.1 * band + 0.05 * level(T)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // The stage's warm wash, from above.
  const g = ctx.createLinearGradient(0, (ARCH.top + 2) * k, 0, FLOOR * k)
  g.addColorStop(0, 'rgba(227, 176, 91, 0)')
  g.addColorStop(1, `rgba(227, 176, 91, ${wash.toFixed(3)})`)
  ctx.fillStyle = g
  ctx.fillRect(ARCH.x0 * k, (ARCH.top + 2) * k, (ARCH.x1 - ARCH.x0) * k, (FLOOR - ARCH.top - 2) * k)
  // The beams from the flies: the spot on the kit (with the solo's pool, and whenever the kit is lit for the band),
  // and three softer ones over the band's risers.
  const spot = Math.max(pool, 0.45 * band * kitLight(T))
  beam(ctx, k, KIT_AT[0] - 0.7, ARCH.top + 0.6, 3.6, 0.075 * spot)
  for (const x of [9.6, 13.4, 17.2]) beam(ctx, k, x, ARCH.top + 0.6, 2.5, 0.045 * band)
  // The pool on the kit for the solo, and where the spot lands on the floor.
  if (pool > 0.001) {
    const cx = (KIT_AT[0] - 1.2) * k
    const cy = (KIT_AT[1] + 0.2) * k
    const r = 4.4 * k
    const q = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    q.addColorStop(0, `rgba(255, 241, 207, ${(0.16 * pool).toFixed(3)})`)
    q.addColorStop(0.6, `rgba(255, 241, 207, ${(0.06 * pool).toFixed(3)})`)
    q.addColorStop(1, 'rgba(255, 241, 207, 0)')
    ctx.fillStyle = q
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
    ctx.save()
    ctx.translate((KIT_AT[0] - 0.7) * k, (FLOOR + 0.05) * k)
    ctx.scale(1, 0.14)
    const fl = ctx.createRadialGradient(0, 0, 0, 0, 0, 3.8 * k)
    fl.addColorStop(0, `rgba(255, 241, 207, ${(0.2 * pool).toFixed(3)})`)
    fl.addColorStop(1, 'rgba(255, 241, 207, 0)')
    ctx.fillStyle = fl
    ctx.fillRect(-3.8 * k, -3.8 * k, 7.6 * k, 7.6 * k)
    ctx.restore()
  }
  // The stage's light spilling into the wings where his father stands to watch: faint all through the solo, up
  // while the camera is with him (the solo's look across at him, the hush's, the build's), and out with the hall at
  // the end. Low and wide, on the floor, and a little up the wall behind him.
  const wings = T < SOLO ? 0 : (0.35 + 0.65 * jimLit(T)) * smoothIn(T, SOLO, SOLO + 3) * (1 - smoothIn(T, FINAL + 2, FINAL + 9))
  if (wings > 0.001) {
    const cx = (JIM_WINGS[0] + 0.25) * k
    const cy = (FLOOR - 0.55) * k
    const r = 1.9 * k
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.62)
    const q = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    q.addColorStop(0, `rgba(227, 176, 91, ${(0.13 * wings).toFixed(3)})`)
    q.addColorStop(0.55, `rgba(227, 176, 91, ${(0.05 * wings).toFixed(3)})`)
    q.addColorStop(1, 'rgba(227, 176, 91, 0)')
    ctx.fillStyle = q
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
    // The spill up the wall behind him, from the stage's side.
    const up = 0.65 * jimLit(T) * wings
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
  ctx.restore()
}

/**
 * How much the wings' light is up for Jim, 0..1: while the camera is with him. The solo's look across at him
 * (`solo.ts`, 304.8-307.9), the hush's visit (358.6-367.8), and the build's (`fast.ts`, 396.7-398.9).
 */
export function jimLit(T: number): number {
  return Math.max(visit(T, 303.6, 308.4), visit(T, 358.6, 367.8), visit(T, 395.4, 400.4))
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
 * A beam from the flies: a cone of `hex` light from a narrow mouth high above (x, `from`) to `spread` either side of
 * x at the floor, two nested so its edges are soft.
 */
function beam(ctx: CanvasRenderingContext2D, k: number, x: number, from: number, spread: number, a: number): void {
  if (a < 0.003) return
  const L = FLOOR - from
  for (const [w, f] of [[1, 0.55], [0.66, 0.8]] as const) {
    const g = ctx.createLinearGradient(0, from * k, 0, FLOOR * k)
    g.addColorStop(0, css(HALL.beam, 0))
    g.addColorStop(0.25, css(HALL.beam, a * f * 0.9))
    g.addColorStop(1, css(HALL.beam, a * f * 0.5))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((x - 0.35 * w) * k, from * k)
    ctx.lineTo((x + 0.35 * w) * k, from * k)
    ctx.lineTo((x + spread * w) * k, (from + L) * k)
    ctx.lineTo((x - spread * w) * k, (from + L) * k)
    ctx.closePath()
    ctx.fill()
  }
}
