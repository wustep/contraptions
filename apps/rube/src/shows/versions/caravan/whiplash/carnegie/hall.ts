import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { drawKit } from '../drums'
import { drawConductor } from '../fletcher'
import { alpha, frame, hash, scenery, type Ctx } from '../kit'
import { CARNEGIE, CHORD, CUTOFF, FINAL, LAST_CHORD, SOLO, level, SHOUT_ORIGIN, SHOUT_PERIOD } from '../music'
import { HALL, KIT } from '../worlds'
import { fletcherAt, poseAt } from './conductor'
import { ARCH, BASS, DOOR, FLOOR, KIT_AT, LIP, PIANO, PODIUM, RISERS } from './stage'
import { sinceStroke } from './strokes'

/**
 * Carnegie Hall: the stage and everything on it that is not a part's own machine. Scenery, drawn from show time,
 * placed by the score at the Carnegie frame's origin (`stage.ts`): the back wall and the gilt arch, the floor and
 * the lip, the house in the dark below, the band on its risers, the piano and the bass, the kit (answering every
 * part's strokes, `strokes.ts`), Fletcher's podium, and, from the solo's first stroke, Fletcher's rig. And the
 * light: the whole stage lit for the last chorus, the band going down into the dark when Fletcher cuts it off, a
 * pool on the kit for the solo, the band lit again for the last chord, and everything down to the dark under the
 * credits.
 *
 * The director's (the sabotage builder may refine it; keep the exports).
 *
 * PRE-PRODUCTION: a first pass, to be drawn properly.
 */

interface HallState {
  /** Nothing: the hall is drawn from show time alone. */
  on: true
}

/**
 * The hall's lights coming up after the match cut from the road: the cut opens on the road's darkness, and the
 * stage wakes on the chorus's first big hit (243.297).
 */
export const LIGHTS_UP = 243.297
const wake = (t: number): number => 0.12 + 0.88 * easeInOutSine(clamp((t - (LIGHTS_UP - 0.08)) / 0.35))

/** How lit the band is at `t`, 0..1: up for the chorus, down after the cut-off, up for the last chord, down at the end. */
export function bandLight(t: number): number {
  if (t < LIGHTS_UP + 0.5) return wake(t)
  if (t < CUTOFF) return 1
  if (t < LAST_CHORD - 0.05) return 1 - 0.72 * easeInOutSine(clamp((t - CUTOFF) / 2.2))
  if (t < FINAL) return 0.28 + 0.72 * easeInOutSine(clamp((t - LAST_CHORD + 0.05) / 0.18))
  return 1 - 0.8 * easeInOutSine(clamp((t - FINAL - 0.6) / 6))
}

/** How lit the kit is at `t`: the stage's light, then the solo's pool, and down at the end. */
export function kitLight(t: number): number {
  if (t < LIGHTS_UP + 0.5) return wake(t)
  if (t < FINAL) return 1
  return 1 - 0.55 * easeInOutSine(clamp((t - FINAL - 1.2) / 8))
}

/** How much the band's horns are up at `t` (0 in their laps, 1 at their mouths). */
function hornsUp(t: number): number {
  if (t < CARNEGIE - 1) return 1
  if (t < CUTOFF) return 1
  if (t < LAST_CHORD - 1.6) return 1 - easeInOutSine(clamp((t - CUTOFF - 0.3) / 1.6))
  if (t < FINAL) return easeInOutSine(clamp((t - (LAST_CHORD - 1.6)) / 1.3))
  return 1 - easeInOutSine(clamp((t - FINAL - 0.8) / 2.5))
}

/** A horn player's accent at `t`: a lift of the bell on the chorus's strong beats, damped. */
function accent(t: number, seat: number): number {
  if (t < CARNEGIE - 0.5 || t > CHORD + 0.5) return 0
  const k = (t - SHOUT_ORIGIN) / SHOUT_PERIOD
  const since = (k - Math.floor(k)) * SHOUT_PERIOD
  const bar = Math.floor(k) % 2 === 0 ? 1 : 0.5
  return bar * Math.exp(-since / 0.14) * (0.8 + 0.2 * hash(seat, Math.floor(k)))
}

export const hall = scenery<HallState>({
  name: 'hall',
  draw: (p, _s, c) => {
    const T = c.t
    const f = frame(p, c.k)
    backWall(p, c, f, T)
    floorAndHouse(p, c, f, T)
    door(p, c, T)
    piano(p, c, T)
    band(p, c, T)
    bass(p, c, T)
    podium(p, c)
    p.push()
    p.translate(KIT_AT[0] * c.k, KIT_AT[1] * c.k)
    drawKit(p, c, { shell: KIT.lacquer, since: (piece) => sinceStroke(piece, T), light: kitLight(T) })
    p.pop()
    if (T >= SOLO) drawConductor(p, c, fletcherAt(T), poseAt(T), { floor: FLOOR - PODIUM.h, light: kitLight(T) })
    light(p, c, T)
  },
})

/** A stroke in a colour with alpha, no fill. */
function pen(p: p5, colour: p5.Color, w: number): void {
  p.stroke(colour)
  p.strokeWeight(w)
  p.noFill()
}

/* ------------------------------------------------------------------ the room */

function backWall(p: p5, c: Ctx, f: ReturnType<typeof frame>, T: number): void {
  const { k, ink, weight } = c
  const lit = 0.4 + 0.6 * bandLight(T)
  p.push()
  // The shell behind the stage: a warm dark, a step up from the paper where the light reaches.
  p.noStroke()
  p.fill(mixHex(c.bg, HALL.deep, lit))
  p.rect(Math.max(f.x0, ARCH.x0) * k, Math.max(f.y0, ARCH.top) * k, (Math.min(f.x1, ARCH.x1) - Math.max(f.x0, ARCH.x0)) * k, (FLOOR - Math.max(f.y0, ARCH.top)) * k)
  // Tall panels in the shell, the gilt catching the light at their edges.
  pen(p, alpha(p, HALL.gilt, 0.25 + 0.3 * lit), weight * 0.6)
  for (let x = ARCH.x0 + 2.5; x < ARCH.x1 - 1; x += 3.4) p.line(x * k, (ARCH.top + 3.2) * k, x * k, (FLOOR - 0.02) * k)
  // The arch: a great round-topped opening, gilt, over the whole stage.
  const cx = (ARCH.x0 + ARCH.x1) / 2
  const w = ARCH.x1 - ARCH.x0
  pen(p, alpha(p, HALL.gilt, 0.55 + 0.35 * lit), weight * 1.6)
  p.arc(cx * k, (ARCH.top + w * 0.28) * k, w * k, w * 0.56 * k, Math.PI, 2 * Math.PI)
  p.line(ARCH.x0 * k, (ARCH.top + w * 0.28) * k, ARCH.x0 * k, FLOOR * k)
  p.line(ARCH.x1 * k, (ARCH.top + w * 0.28) * k, ARCH.x1 * k, FLOOR * k)
  pen(p, alpha(p, HALL.gilt, 0.3 + 0.2 * lit), weight * 0.7)
  p.arc(cx * k, (ARCH.top + w * 0.28) * k, (w - 1.2) * k, (w * 0.56 - 1.2) * k, Math.PI, 2 * Math.PI)
  p.pop()
  void ink
}

function floorAndHouse(p: p5, c: Ctx, f: ReturnType<typeof frame>, T: number): void {
  const { k, ink, weight } = c
  const x0 = Math.max(f.x0, ARCH.x0 - 6)
  const x1 = Math.min(f.x1, ARCH.x1 + 6)
  p.push()
  // The stage floor, dark wood, and its lip.
  solid(p, ink, weight, mixHex(c.bg, HALL.floor, 0.55 + 0.45 * kitLight(T)))
  p.rect(x0 * k, FLOOR * k, (x1 - x0) * k, (LIP - FLOOR) * k)
  // The house below the lip: dark, and the velvet backs of the front rows in the stage's spill.
  p.noStroke()
  p.fill(mixHex(c.bg, HALL.deep, 0.5))
  p.rect(x0 * k, LIP * k, (x1 - x0) * k, (Math.max(f.y1, LIP + 1) - LIP) * k)
  // The front rows: one dark band each, its top edge rising and falling a little where the seat backs are (never a
  // row of beads), lit only by the stage's spill.
  for (let row = 0; row < 3; row++) {
    const y = LIP + 0.8 + row * 0.7
    p.fill(mixHex(c.bg, HALL.velvet, 0.32 - row * 0.09))
    p.beginShape()
    p.vertex(x0 * k, (y + 0.9) * k)
    for (let x = x0; x <= x1 + 0.25; x += 0.25) {
      const bump = 0.07 * Math.sin((x + row * 0.45) * 3.4) + 0.05 * (hash(Math.round(x * 4), row) - 0.5)
      p.vertex(x * k, (y - bump) * k)
    }
    p.vertex(x1 * k, (y + 0.9) * k)
    p.endShape(p.CLOSE)
  }
  p.pop()
}

function door(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const x = DOOR.x
  p.push()
  solid(p, ink, weight * 0.8, mixHex(c.bg, HALL.deep, 0.8))
  p.rect((x - DOOR.w / 2) * k, (FLOOR - DOOR.h) * k, DOOR.w * k, DOOR.h * k)
  // Its little window, lit from the corridor behind.
  p.noStroke()
  p.fill(alpha(p, HALL.gold, 0.5))
  p.rect((x - 0.25) * k, (FLOOR - DOOR.h + 0.7) * k, 0.5 * k, 0.7 * k, 0.05 * k)
  p.pop()
  void T
}

function piano(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const x0 = PIANO.x - PIANO.w / 2
  const top = FLOOR - 1.9
  p.push()
  solid(p, ink, weight * 0.8, mixHex(HALL.black, c.bg, 0.2))
  // Side-on grand: the case, its lid raised on its stick, three legs.
  p.beginShape()
  p.vertex(x0 * k, top * k)
  p.vertex((x0 + PIANO.w) * k, top * k)
  p.bezierVertex((x0 + PIANO.w + 0.2) * k, top * k, (x0 + PIANO.w + 0.2) * k, (top + 0.5) * k, (x0 + PIANO.w) * k, (top + 0.5) * k)
  p.vertex(x0 * k, (top + 0.5) * k)
  p.endShape(p.CLOSE)
  p.quad(x0 * k, top * k, (x0 + PIANO.w * 0.95) * k, (top - 1.1) * k, (x0 + PIANO.w) * k, (top - 1.02) * k, (x0 + 0.1) * k, top * k)
  p.line((x0 + PIANO.w * 0.6) * k, top * k, (x0 + PIANO.w * 0.62) * k, (top - 0.7) * k)
  for (const lx of [x0 + 0.25, x0 + PIANO.w - 0.35]) p.rect((lx - 0.06) * k, (top + 0.5) * k, 0.12 * k, (FLOOR - top - 0.5) * k)
  p.pop()
  void T
}

function bass(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const x = BASS.x
  p.push()
  solid(p, ink, weight * 0.8, mixHex(HALL.deep, HALL.floor, 0.7))
  // An upright bass on its end pin, resting on its stand.
  p.beginShape()
  p.vertex(x * k, (FLOOR - 0.15) * k)
  p.bezierVertex((x - 0.75) * k, (FLOOR - 0.2) * k, (x - 0.7) * k, (FLOOR - 1.3) * k, (x - 0.38) * k, (FLOOR - 1.45) * k)
  p.bezierVertex((x - 0.58) * k, (FLOOR - 1.9) * k, (x - 0.5) * k, (FLOOR - 2.5) * k, x * k, (FLOOR - 2.55) * k)
  p.bezierVertex((x + 0.5) * k, (FLOOR - 2.5) * k, (x + 0.58) * k, (FLOOR - 1.9) * k, (x + 0.38) * k, (FLOOR - 1.45) * k)
  p.bezierVertex((x + 0.7) * k, (FLOOR - 1.3) * k, (x + 0.75) * k, (FLOOR - 0.2) * k, x * k, (FLOOR - 0.15) * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.9)
  p.line(x * k, (FLOOR - 2.5) * k, x * k, (FLOOR - 4.1) * k)
  p.pop()
  void T
}

function podium(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  solid(p, ink, weight * 0.8, HALL.black)
  p.rect((PODIUM.x - PODIUM.w / 2) * k, (FLOOR - PODIUM.h) * k, PODIUM.w * k, PODIUM.h * k, 0.04 * k)
}

/* ------------------------------------------------------------------ the band */

/** The band on its risers: dark figures at stands, their horns lit gold, up when they play. */
function band(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const lit = bandLight(T)
  const up = hornsUp(T)
  p.push()
  RISERS.forEach((r, row) => {
    // The riser: a black step with an ink edge.
    solid(p, ink, weight * 0.7, mixHex(HALL.black, c.bg, 0.3))
    if (row > 0) p.rect(r.x0 * k, r.top * k, (r.x1 - r.x0) * k, (FLOOR - r.top) * k)
    const gap = (r.x1 - r.x0) / r.seats
    for (let i = 0; i < r.seats; i++) {
      const seat = row * 10 + i
      const x = r.x0 + gap * (i + 0.5) + (row % 2) * 0.3
      const a = accent(T, seat)
      const body = mixHex(HALL.black, HALL.deep, 0.4 * lit)
      // The figure: a seated torso, shoulders, a head well above the ball's size, all in shadow.
      p.noStroke()
      p.fill(body)
      p.rect((x - 0.36) * k, (r.top - 1.75) * k, 0.72 * k, 1.1 * k, 0.28 * k)
      p.ellipse(x * k, (r.top - 2.15) * k, 0.58 * k, 0.68 * k)
      // The rim light on the shoulders.
      pen(p, alpha(p, HALL.gold, 0.18 + 0.4 * lit), weight * 0.7)
      p.arc(x * k, (r.top - 1.5) * k, 0.7 * k, 0.5 * k, Math.PI * 1.1, Math.PI * 1.9)
      // The stand, and its little lit desk.
      outline(p, ink, weight * 0.6)
      p.line((x - 0.8) * k, (r.top - 0.02) * k, (x - 0.8) * k, (r.top - 1.35) * k)
      p.noStroke()
      p.fill(alpha(p, HALL.beam, 0.25 + 0.5 * lit))
      p.quad((x - 1.12) * k, (r.top - 1.35) * k, (x - 0.48) * k, (r.top - 1.35) * k, (x - 0.52) * k, (r.top - 1.62) * k, (x - 1.08) * k, (r.top - 1.62) * k)
      // The horn: a sax in front, trombones, trumpets behind; up at the mouth when playing, lifted on the accents.
      const tilt = -0.25 - 0.5 * up - 0.18 * a * up
      solid(p, ink, weight * 0.7, mixHex(HALL.deep, HALL.gilt, 0.35 + 0.65 * lit))
      p.push()
      p.translate((x - 0.1) * k, (r.top - 2.05 + 0.5 * (1 - up)) * k)
      p.rotate(tilt + (row === 0 ? 0.9 : 0))
      if (row === 0) {
        p.rect(-0.05 * k, 0, 0.1 * k, 0.75 * k, 0.04 * k)
        p.ellipse(0.06 * k, 0.78 * k, 0.26 * k, 0.16 * k)
      } else if (row === 1) {
        p.rect(-0.9 * k, -0.03 * k, 0.9 * k, 0.06 * k)
        p.triangle(-0.9 * k, 0, -1.2 * k, -0.16 * k, -1.2 * k, 0.16 * k)
      } else {
        p.rect(-0.55 * k, -0.035 * k, 0.55 * k, 0.07 * k)
        p.triangle(-0.55 * k, 0, -0.75 * k, -0.12 * k, -0.75 * k, 0.12 * k)
      }
      p.pop()
    }
  })
  p.pop()
}

/* ------------------------------------------------------------------ the light */

function light(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const pool = T < SOLO ? 0 : T < FINAL ? 1 : 1 - easeInOutSine(clamp((T - FINAL - 1) / 7))
  const wash = 0.08 + 0.1 * bandLight(T) + 0.05 * level(T)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // The stage's warm wash, from above.
  const g = ctx.createLinearGradient(0, (ARCH.top + 2) * k, 0, FLOOR * k)
  g.addColorStop(0, `rgba(227, 176, 91, 0)`)
  g.addColorStop(1, `rgba(227, 176, 91, ${wash.toFixed(3)})`)
  ctx.fillStyle = g
  ctx.fillRect(ARCH.x0 * k, (ARCH.top + 2) * k, (ARCH.x1 - ARCH.x0) * k, (FLOOR - ARCH.top - 2) * k)
  // The pool on the kit for the solo.
  if (pool > 0.001) {
    const cx = (KIT_AT[0] - 1.2) * k
    const cy = (KIT_AT[1] + 0.2) * k
    const r = 4.2 * k
    const q = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    q.addColorStop(0, `rgba(255, 241, 207, ${(0.16 * pool).toFixed(3)})`)
    q.addColorStop(1, 'rgba(255, 241, 207, 0)')
    ctx.fillStyle = q
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  }
  ctx.restore()
}
