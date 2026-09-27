import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { beam, bloom, flashAt, pool, rgba } from '../cast'
import { frame, hash, type Ctx } from '../kit'
import { level } from '../music'
import { AWARDS as A } from '../worlds'
import { BANK1, BANK2, BULBS, DAIS, ease, hanselLag, HOUSE, LEG_L, LEG_R, MOUTH, PARADE, PIT_LATE, RUNWAY, snapOn, STAGE, SURF, SWING, WING_LEGS } from './awards-clock'
import { lightAt } from './awards-rig'
import { hairOf, person, personRim } from './awards-crowd'

/**
 * The theatre (the AWARDS builder's): the dark of the house and its tiers of heads beyond the runway, the wall of
 * bulbs behind the stage, the plum curtains, and the stage, the runway and the podium in black gloss. Everything that
 * moves on it (the rig, the trophy, the press) is the part's.
 */

type Frame = ReturnType<typeof frame>

/** The house: dark air, deeper up in the roof. */
function drawHouse(p: p5, k: number, f: Frame): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, -7 * k, 0, 1 * k)
  g.addColorStop(0, A.houseDeep)
  g.addColorStop(1, A.house)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()
}

/**
 * The audience beyond the runway: tier on tier of heads and shoulders going up into the dark, one mass, the nearest
 * rows rimmed by the runway's edge light. Only where no stage stands in front of them (left of the proscenium).
 */
function drawTiers(p: p5, k: number, f: Frame, t: number): void {
  const x1 = Math.min(f.x1 + 1, LEG_L.x0 + 0.3)
  const x0 = Math.max(f.x0 - 1, -40)
  if (x1 <= x0) return
  const heave = level(t)
  for (let r = 4; r >= 0; r--) {
    const S = 0.82 - 0.07 * r
    const top = -0.4 - 0.46 * r
    const fill = mixHex(A.crowd, A.house, 0.16 * r)
    const rim = 0.3 - 0.055 * r
    const gap = 0.52 * S
    const i0 = Math.floor(x0 / gap) - 1
    const i1 = Math.ceil(x1 / gap) + 1
    const row: [number, number][] = []
    p.noStroke()
    p.fill(fill)
    for (let i = i0; i <= i1; i++) {
      const hx = i * gap + (hash(i, r, 3) - 0.5) * 0.18 * S
      if (hx < x0 - 0.5 || hx > x1) continue
      const bob = 0.018 * heave * (0.5 + 0.5 * Math.sin(2.1 * t + i * 1.7 + r))
      const ht = top + (hash(i, r, 7) - 0.5) * 0.1 - bob
      row.push([hx, ht])
      person(p, k, hx, ht, S * (0.92 + 0.16 * hash(i, r, 5)), HOUSE, hairOf(i, r))
    }
    // The rim along each head and shoulder, stronger toward the runway and where the spots fall.
    // The rim: only the nearest rows catch the runway's light; the rows behind are dark on dark.
    if (r <= 1)
      for (const [hx, ht] of row) {
        const light = Math.min(1, lightAt(hx, t) + Math.max(0, 1 - (RUNWAY.x0 - hx) / 5) * 0.45)
        personRim(p, k, hx, ht, S, A.crowdRim, rim * Math.max(0, light - 0.2) * (r === 0 ? 2.6 : 1.6))
      }
  }
}

/** How far the house has come up: low until the wall of bulbs lights, bank by bank. */
export const houseUp = (t: number): number => 0.5 * Math.min(1, Math.max(0, snapOn(t - BANK1))) + 0.5 * Math.min(1, Math.max(0, snapOn(t - BANK2)))

/**
 * Backstage: the fly lines, ropes down out of the dark to a pin rail on the wings' back wall, each tied off round its
 * pin. Only the rail and the ropes' edges catch the spill.
 */
const RAIL = { x0: 9.35, x1: 10.45, y: -1.25 }
function drawFly(p: p5, k: number, c: Ctx, f: Frame, t: number): void {
  if (f.x1 < RAIL.x0 - 0.3 || f.x0 > RAIL.x1 + 0.3) return
  const rope = mixHex(A.crowdRim, A.gold, 0.25)
  const lit = 0.35 + 0.15 * level(t)
  p.stroke(rgba(rope, 0.55 * lit + 0.2))
  p.strokeWeight(Math.max(1, 0.024 * k))
  const pins = [9.5, 9.72, 9.94, 10.16, 10.36]
  pins.forEach((x, i) => {
    if (i === 3) return
    p.line(x * k, (Math.min(-6, f.y0 - 1)) * k, x * k, (RAIL.y + 0.02) * k)
    // The tail, coiled and hung off the pin.
    p.noFill()
    p.bezier(x * k, (RAIL.y + 0.02) * k, (x - 0.08) * k, (RAIL.y + 0.5) * k, (x + 0.08) * k, (RAIL.y + 0.62) * k, (x + 0.01) * k, (RAIL.y + 0.3 + 0.1 * (i % 2)) * k)
  })
  // The rail and its pins.
  p.stroke(rgba(c.ink, 0.28))
  p.strokeWeight(c.weight * 0.5)
  p.fill(mixHex(A.stage, A.runway, 0.3))
  p.rect(RAIL.x0 * k, (RAIL.y - 0.035) * k, (RAIL.x1 - RAIL.x0) * k, 0.07 * k)
  p.noStroke()
  p.fill(mixHex(A.stageEdge, A.gold, 0.3))
  for (const x of pins) p.rect((x - 0.018) * k, (RAIL.y - 0.1) * k, 0.036 * k, 0.2 * k)
}

/** How lit bank `b` of the wall of bulbs is at `t`. */
const bankOn = (b: number, t: number): number => snapOn(t - (b === 0 ? BANK1 : BANK2))

/** The wall of bulbs behind the stage: dark strips of dull bulbs until the lights come up, then a slow chase. */
function drawBulbs(p: p5, k: number, f: Frame, t: number): void {
  const wx0 = LEG_L.x1
  const wx1 = LEG_R.x0
  if (f.x1 < wx0 - 1 || f.x0 > wx1 + 1) return
  const top = BULBS.y0 - BULBS.dy * (BULBS.rows - 1) - 0.28
  // The back wall itself: a dark panel, a shade deeper than the house.
  p.noStroke()
  p.fill(mixHex(A.houseDeep, A.stage, 0.35))
  p.rect(wx0 * k, top * k, (wx1 - wx0) * k, (SURF - top) * k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const beat = 0.85 + 0.15 * level(t)
  // On the drums the wall goes dark behind Derek and stays up toward Hansel; it comes back as Hansel parades.
  const focus = ease(t, SWING, SWING + 0.45) * (1 - ease(t, PARADE, PARADE + 1.6))
  const hx = Math.min(MOUTH - 0.4, hanselLag(t, 0.3))
  for (let i = 0; i < BULBS.n; i++) {
    const x = BULBS.x0 + i * BULBS.dx
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const toward = 0.12 + 0.88 * Math.exp(-(((x - hx) / 2.0) ** 2))
    const on = Math.max(0, bankOn(i % 2, t)) * (1 - focus * (1 - toward))
    // The strip: a slim black batten.
    p.noStroke()
    p.fill(mixHex(A.runway, A.stageEdge, 0.4))
    p.rect((x - 0.05) * k, (top + 0.1) * k, 0.1 * k, (SURF - top - 0.1) * k)
    // Its glow on the wall, soft, when it is on.
    if (on > 0.01) {
      const g = ctx.createLinearGradient((x - 0.42) * k, 0, (x + 0.42) * k, 0)
      g.addColorStop(0, rgba(A.bulb, 0))
      g.addColorStop(0.5, rgba(A.bulb, 0.07 * on * beat))
      g.addColorStop(1, rgba(A.bulb, 0))
      ctx.save()
      ctx.fillStyle = g
      ctx.fillRect((x - 0.42) * k, (top + 0.1) * k, 0.84 * k, (SURF - top - 0.1) * k)
      ctx.restore()
    }
    for (let j = 0; j < BULBS.rows; j++) {
      const y = BULBS.y0 - j * BULBS.dy
      const chase = 0.5 + 0.5 * Math.sin(2.4 * t - 0.55 * j + 0.8 * i)
      const b = on * (0.5 + 0.32 * chase) * beat
      if (b > 0.02) {
        p.noStroke()
        p.fill(rgba(A.bulb, 0.13 * b))
        p.circle(x * k, y * k, 0.15 * k)
      }
      p.noStroke()
      // A bulb turned low goes back toward the dull of an unlit one.
      p.fill(mixHex(mixHex(A.gold, A.crowd, 0.62), mixHex(A.gold, A.bulb, Math.min(1, b)), Math.min(1, b * 3)))
      p.circle(x * k, y * k, Math.max(1.4, 0.052 * k))
    }
  }
}

/**
 * A curtain leg of plum velvet, from out of sight above down to the stage: vertical folds in flat shade, its hem
 * lifting a little off the floor between them, and a rim of the stage's light on the side toward it.
 */
function drawLeg(p: p5, k: number, f: Frame, x0: number, x1: number, deep: number, rim: number, rimSide: -1 | 1): void {
  if (f.x1 < x0 - 0.2 || f.x0 > x1 + 0.2) return
  const top = Math.min(-6, f.y0 - 1)
  const base = mixHex(A.curtain, A.house, deep)
  const shade = mixHex(A.curtainShade, A.houseDeep, deep)
  p.noStroke()
  p.fill(base)
  p.rect(x0 * k, top * k, (x1 - x0) * k, (SURF - top) * k)
  const n = Math.max(2, Math.round((x1 - x0) / 0.2))
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    // The shade of each fold: a slim band that swells toward the hem.
    const cx = x0 + (i + 0.72) * w
    p.fill(shade)
    p.beginShape()
    p.vertex((cx - w * 0.12) * k, top * k)
    p.vertex((cx + w * 0.12) * k, top * k)
    p.bezierVertex((cx + w * 0.16) * k, -2 * k, (cx + w * 0.3) * k, -0.6 * k, (cx + w * 0.26) * k, SURF * k)
    p.vertex((cx - w * 0.26) * k, SURF * k)
    p.bezierVertex((cx - w * 0.3) * k, -0.6 * k, (cx - w * 0.16) * k, -2 * k, (cx - w * 0.12) * k, top * k)
    p.endShape(p.CLOSE)
  }
  // The rim toward the light.
  if (rim > 0.02) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const edge = rimSide < 0 ? x0 : x1
    const g = ctx.createLinearGradient(edge * k, 0, (edge - rimSide * 0.34) * k, 0)
    g.addColorStop(0, rgba(A.warm, 0.42 * rim))
    g.addColorStop(1, rgba(A.warm, 0))
    ctx.save()
    ctx.fillStyle = g
    const gx = rimSide < 0 ? edge : edge - 0.34
    ctx.fillRect(gx * k, top * k, 0.34 * k, (SURF - top) * k)
    ctx.restore()
  }
}

/** The valance over the stage: plum swags with a gold edge, seen only when the camera draws back. */
function drawValance(p: p5, k: number, c: Ctx, f: Frame): void {
  const y0 = -6.2
  const y1 = -5.1
  if (f.y0 > y1 + 0.3) return
  const x0 = LEG_L.x0 - 0.2
  const x1 = LEG_R.x1 + 0.2
  const n = 5
  const w = (x1 - x0) / n
  p.noStroke()
  p.fill(A.curtain)
  p.beginShape()
  p.vertex(x0 * k, (y0 - 3) * k)
  p.vertex(x1 * k, (y0 - 3) * k)
  p.vertex(x1 * k, y1 * k)
  for (let i = n - 1; i >= 0; i--) {
    const a = x0 + i * w
    p.bezierVertex((a + w * 0.75) * k, (y1 + 0.32) * k, (a + w * 0.25) * k, (y1 + 0.32) * k, a * k, y1 * k)
  }
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(A.gold)
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.beginShape()
  p.vertex(x1 * k, y1 * k)
  for (let i = n - 1; i >= 0; i--) {
    const a = x0 + i * w
    p.bezierVertex((a + w * 0.75) * k, (y1 + 0.32) * k, (a + w * 0.25) * k, (y1 + 0.32) * k, a * k, y1 * k)
  }
  p.endShape()
  void c
}

/** The stage, the runway and the podium: black gloss, lit along their edges. */
function drawStage(p: p5, k: number, c: Ctx, f: Frame, t: number): void {
  const ink = c.ink
  const up = houseUp(t)
  const x0 = Math.max(f.x0 - 1, STAGE.x0)
  const x1 = Math.min(f.x1 + 1, STAGE.x1)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The stage's face and the gloss of its top.
  if (x1 > x0) {
    p.noStroke()
    p.fill(mixHex(A.stage, A.runway, 0.45))
    p.rect(x0 * k, SURF * k, (x1 - x0) * k, (HOUSE - SURF) * k)
    // The lip catching the stage's light, fading down its face.
    const g = ctx.createLinearGradient(0, (SURF + 0.11) * k, 0, (SURF + 0.6) * k)
    g.addColorStop(0, rgba(A.stageEdge, 0.25 + 0.45 * up))
    g.addColorStop(1, rgba(A.stageEdge, 0))
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, (SURF + 0.11) * k, (x1 - x0) * k, 0.49 * k)
    ctx.restore()
    p.noStroke()
    p.fill(mixHex(mixHex(A.stage, A.runway, 0.45), A.stageEdge, 0.45 + 0.55 * up))
    p.rect(x0 * k, SURF * k, (x1 - x0) * k, 0.11 * k)
    p.stroke(rgba(ink, 0.35))
    p.strokeWeight(c.weight * 0.6)
    p.line(x0 * k, SURF * k, x1 * k, SURF * k)
    p.stroke(rgba(ink, 0.18))
    p.line(x0 * k, (SURF + 0.11) * k, x1 * k, (SURF + 0.11) * k)
  }
  // The runway: darker, its top edge lit its whole length.
  const r0 = Math.max(f.x0 - 1, RUNWAY.x0)
  const r1 = Math.min(f.x1 + 1, RUNWAY.x1)
  if (r1 > r0) {
    p.noStroke()
    p.fill(A.runway)
    p.rect(r0 * k, SURF * k, (r1 - r0) * k, (HOUSE - SURF) * k)
    p.fill(A.runwayLit)
    p.rect(r0 * k, SURF * k, (r1 - r0) * k, 0.1 * k)
    const g = ctx.createLinearGradient(0, (SURF + 0.1) * k, 0, (SURF + 0.5) * k)
    g.addColorStop(0, rgba(A.warm, 0.2))
    g.addColorStop(1, rgba(A.warm, 0))
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(r0 * k, (SURF + 0.1) * k, (r1 - r0) * k, 0.4 * k)
    ctx.restore()
    p.stroke(rgba(A.warm, 0.7))
    p.strokeWeight(Math.max(1, 0.024 * k))
    p.line(r0 * k, (SURF + 0.1) * k, r1 * k, (SURF + 0.1) * k)
    p.stroke(rgba(ink, 0.35))
    p.strokeWeight(c.weight * 0.6)
    p.line(r0 * k, SURF * k, r1 * k, SURF * k)
    if (RUNWAY.x0 >= f.x0 - 1) p.line(RUNWAY.x0 * k, SURF * k, RUNWAY.x0 * k, HOUSE * k)
  }
  // The podium.
  if (f.x1 > DAIS.x0 - 0.5 && f.x0 < DAIS.x1 + 0.5) {
    const body = mixHex(A.runway, A.stage, 0.45)
    p.stroke(rgba(ink, 0.62))
    p.strokeWeight(c.weight * 0.8)
    p.fill(body)
    p.beginShape()
    p.vertex(DAIS.x0 * k, SURF * k)
    p.vertex(DAIS.x0 * k, DAIS.step * k)
    p.vertex(DAIS.s0 * k, DAIS.step * k)
    p.vertex(DAIS.s0 * k, DAIS.top * k)
    p.vertex(DAIS.s1 * k, DAIS.top * k)
    p.vertex(DAIS.s1 * k, DAIS.step * k)
    p.vertex(DAIS.x1 * k, DAIS.step * k)
    p.vertex(DAIS.x1 * k, SURF * k)
    p.endShape(p.CLOSE)
    // Gold on every tread's nose.
    p.stroke(A.gold)
    p.strokeWeight(Math.max(1, 0.028 * k))
    const nose = (a: number, b: number, y: number) => p.line((a + 0.02) * k, (y + 0.025) * k, (b - 0.02) * k, (y + 0.025) * k)
    nose(DAIS.x0, DAIS.s0, DAIS.step)
    nose(DAIS.s0, DAIS.s1, DAIS.top)
    nose(DAIS.s1, DAIS.x1, DAIS.step)
    // The gloss of its risers: a soft sheen where the light is.
    const lit = Math.min(1, lightAt((DAIS.s0 + DAIS.s1) / 2, t))
    if (lit > 0.02) {
      const g = ctx.createLinearGradient(0, DAIS.top * k, 0, SURF * k)
      g.addColorStop(0, rgba(A.spot, 0.14 * lit))
      g.addColorStop(1, rgba(A.spot, 0))
      ctx.save()
      ctx.fillStyle = g
      ctx.fillRect((DAIS.s0 + 0.05) * k, (DAIS.top + 0.06) * k, (DAIS.s1 - DAIS.s0 - 0.1) * k, (SURF - DAIS.top - 0.06) * k)
      ctx.restore()
    }
  }
}

/** The flashes out at the runway's end, seen from the wings as light on the curtain's edge. */
export function pitSpill(t: number): number {
  let v = 0
  for (const at of PIT_LATE) {
    const { pop, after } = flashAt(t - at)
    v = Math.max(v, pop + 0.35 * after)
  }
  return v
}

export function drawTheatre(p: p5, c: Ctx, t: number): void {
  const k = c.k
  const f = frame(p, k)
  p.push()
  p.rectMode(p.CORNER)
  drawHouse(p, k, f)
  drawTiers(p, k, f, t)
  drawBulbs(p, k, f, t)
  drawValance(p, k, c, f)
  // The curtains: the proscenium's two legs, lit on their stage sides; the far wings' legs, deeper in the dark.
  const up = houseUp(t)
  const stageLit = Math.min(1, 0.25 * up + lightAt(4.5, t) * 0.8)
  drawLeg(p, k, f, LEG_L.x0, LEG_L.x1, 0, Math.min(1, 0.3 * up + lightAt(0, t) * 0.7), 1)
  drawLeg(p, k, f, LEG_R.x0, LEG_R.x1, 0, Math.min(1, stageLit + 0.8 * pitSpill(t) * (t > SWING ? 1 : 0)), -1)
  WING_LEGS.forEach((leg, i) => drawLeg(p, k, f, leg.x0, leg.x1, 0.15 + 0.2 * i, (0.3 - 0.12 * i) * (t > SWING ? 1 : up), -1))
  drawFly(p, k, c, f, t)
  // Until the house comes up with the bulbs, everything but the runway and its one spot sits in the dark.
  if (up < 0.999) {
    p.noStroke()
    p.fill(rgba(A.houseDeep, 0.42 * (1 - up)))
    p.rect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  }
  drawStage(p, k, c, f, t)
  drawWings(p, k, f, t)
  p.pop()
}

/**
 * The dark of the wings: past the proscenium's curtain everything sinks into the dark, but for a faint spill of the
 * stage's light on the boards just inside it (where Derek comes to rest), flickering with the flashes out front.
 */
function drawWings(p: p5, k: number, f: Frame, t: number): void {
  const x0 = LEG_R.x1 - 0.05
  if (f.x1 < x0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(x0 * k, 0, (x0 + 1.3) * k, 0)
  g.addColorStop(0, rgba(A.houseDeep, 0))
  g.addColorStop(1, rgba(A.houseDeep, 0.5))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, (f.y0 - 1) * k, (Math.max(f.x1, x0) - x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()
  const spill = 0.5 + 0.2 * level(t) + 0.8 * (t > SWING ? pitSpill(t) : 0)
  // A wedge of it comes in past the curtain's edge from high up, onto the boards just inside.
  beam(p, k, [LEG_R.x0 - 0.35, -5.0], [LEG_R.x1 + 0.9, SURF], 0.45, 2.1, A.warm, 0.17 * spill)
  pool(p, k, [LEG_R.x1 + 0.8, SURF + 0.04], 1.3, 0.1, A.warm, 0.32 * spill)
  bloom(p, k, [LEG_R.x1 + 0.5, -0.7], 1.7, A.warm, 0.04 * spill)
}
