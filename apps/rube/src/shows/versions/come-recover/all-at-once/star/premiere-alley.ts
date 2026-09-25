import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { mixHex, R, type Pt } from '../../../../../parts'
import { frame, hash, smooth, type Ctx } from '../kit'
import { EVELYN, STAR, WAYMOND } from '../worlds'
import {
  CARPET,
  COVER_L,
  COVER_R,
  DROP,
  EDGE_X,
  HEART,
  LANDING,
  MEET_X,
  MOUTH,
  NEON_ON,
  NOSING,
  SHAFT_L,
  SHAFT_R,
  SPLASH,
  SPLASH_AT,
  STEPS,
  STEP_LAND,
  TERRACE_R,
  WATER,
  WAYMOND_X,
  alleyTime,
  coverAt,
  stepFace,
  timeRate,
  waymondAt,
} from './premiere-clock'
import { INK, IRON, NIGHT, STONE, STONE_DEEP, STREET, WALL, WALL_FAR, WET, glow, pool, rgba, smear } from './premiere-light'

/**
 * The alley behind the theatre, in the rain: the film's "in another life", lit like In the Mood for Love.
 *
 * Stone steps go down from the carpet's end to a wet landing. On the landing a lamp post leans its lantern over a
 * drain, and Waymond waits under it. Across from him a laundromat's window, and in it a neon washing machine that
 * stutters on as she comes down to him. The time slows as the rain begins, and the steps are floated rather than
 * fallen. She reaches him, and they are still. Then the rain comes on full, the downspout floods the drain, its cover
 * rocks under her and gives, and she drops away from him into the race under the landing, which carries her out
 * through the terrace wall. He goes to the cover where she was, and waits there.
 */

/* ------------------------------------------------------------------ the set */

/** The lower lane, below the terrace. */
const LOWER = LANDING + 3.3
/** The race under the landing: its roof and its bed. */
const RACE_ROOF = SPLASH_AT[1] - 0.38
const RACE_BED = SPLASH_AT[1] + 0.2
const RACE_X0 = SHAFT_L - 0.3
/** The paving's wet face, seen a little from above: reflections are drawn in it. */
const PAVE = 0.42
/** The lamp: its post, and the lantern its crook holds out over the two of them. */
const POST_X = WAYMOND_X + 0.62
const POST_TOP = LANDING - 5.15
const LANTERN: Pt = [MEET_X + 0.13, LANDING - 4.55]
/** The laundromat's window, and the neon washer hung in it. */
const WIN = { x0: WAYMOND_X + 1.25, x1: WAYMOND_X + 3.35, y0: LANDING - 3.7, y1: LANDING - 0.75 }
const NEON: Pt = [(WIN.x0 + WIN.x1) / 2, LANDING - 2.3]
/** The downspout: down the wall behind, its shoe letting out onto the landing toward the drain. */
const SPOUT_X = MEET_X - 0.62
/** The fire escape's lowest landing, high on the wall over the steps. */
const ESCAPE = { x0: EDGE_X + 0.9, x1: NOSING[5] - 0.1, y: LANDING - 5.9 }

/** The ground's face at `x`: the carpet, a step, the landing, or the lower lane past the terrace. */
function groundAt(x: number): number {
  if (x < EDGE_X) return CARPET
  for (let i = 1; i < NOSING.length; i++) if (x < NOSING[i]) return stepFace(i)
  if (x < TERRACE_R) return LANDING
  return LOWER
}

/* ------------------------------------------------------------------ light */

/** The neon's brightness at show time `t`: dark, stuttering on, and a pulse's two dips after the touch. */
function neonAt(t: number): number {
  const s = t - NEON_ON
  if (s < 0) return 0
  let b = s < 0.05 ? 1 : s < 0.1 ? 0.12 : s < 0.15 ? 0.85 : s < 0.2 ? 0.3 : Math.min(1, 0.7 + (s - 0.2) * 2)
  for (const h of HEART) {
    const d = t - h
    if (d >= 0 && d < 0.075) b *= 0.22
  }
  // A hum: the gas never quite steady.
  return b * (0.94 + 0.06 * Math.sin(t * 37) * Math.sin(t * 5.3))
}

/** The lamp's cone: its half-width at height `y`, and whether (x, y) is in it. */
const CONE_TOP = LANTERN[1] + 0.3
const coneHalf = (y: number): number => 0.14 + (1.55 - 0.14) * clamp((y - CONE_TOP) / (LANDING - CONE_TOP))
const inCone = (x: number, y: number): number => {
  if (y < CONE_TOP) return 0
  const d = Math.abs(x - LANTERN[0]) / coneHalf(y)
  return d >= 1 ? 0 : 1 - d * d
}

/** How hard the downspout runs: a trickle in the rain, and the flood that opens the drain. */
const floodAt = (t: number): number => 0.15 + 0.85 * smooth(t, 80.5, 81.4) * (1 - smooth(t, DROP + 0.8, DROP + 2.5))

/* ------------------------------------------------------------------ drawing */

function drawWalls(p: p5, c: Ctx, t: number, f: ReturnType<typeof frame>): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const x0 = Math.max(EDGE_X, f.x0 - 1)
  const x1 = f.x1 + 1
  if (x1 <= x0) return
  const top = f.y0 - 1
  // The back wall, down to the lower lane.
  p.noStroke()
  p.fill(WALL)
  p.rect(X((x0 + x1) / 2), X((top + LOWER) / 2), X(x1 - x0), X(LOWER - top))
  // Past the terrace, the lane drops away between walls further back.
  if (x1 > TERRACE_R + 1.6) {
    p.fill(WALL_FAR)
    const a = Math.max(x0, TERRACE_R + 1.6)
    p.rect(X((a + x1) / 2), X((top + LOWER) / 2), X(x1 - a), X(LOWER - top))
    outline(p, rgba(INK, 0.25), weight * 0.5)
    p.line(X(a), X(top), X(a), X(LOWER))
  }
  // The light on the wall: the lamp's warm pool round the lantern and down, the neon's pink, the window's cold.
  glow(p, X(LANTERN[0]), X(LANTERN[1] + 1.8), X(5.2), STAR.gold, 0.2, 0.3)
  glow(p, X(LANTERN[0]), X(LANDING - 0.5), X(3.0), STAR.spot, 0.18, 0.3)
  const nb0 = neonAt(t)
  if (nb0 > 0.01) glow(p, X(NEON[0]), X(NEON[1]), X(3.6), STAR.neonPink, 0.2 * nb0, 0.25)
  // One string course along the wall, faint.
  p.stroke(rgba(INK, 0.1))
  p.strokeWeight(Math.max(1, weight * 0.5))
  p.line(X(x0), X(LANDING - 4.4), X(Math.min(x1, TERRACE_R + 1.6)), X(LANDING - 4.4))

  // The fire escape: a landing high on the wall, its railing, and its stair going up out of sight.
  if (f.y0 < ESCAPE.y + 0.6) {
    const e = ESCAPE
    outline(p, rgba(INK, 0.32), weight * 0.55)
    p.fill(IRON)
    p.rect(X((e.x0 + e.x1) / 2), X(e.y), X(e.x1 - e.x0), X(0.1))
    p.noFill()
    p.line(X(e.x0), X(e.y - 1.05), X(e.x1), X(e.y - 1.05))
    for (let x = e.x0; x <= e.x1 + 1e-6; x += (e.x1 - e.x0) / 6) p.line(X(x), X(e.y - 1.05), X(x), X(e.y))
    // The stair up to the next, and the drop ladder hung under this one.
    p.line(X(e.x0 + 0.4), X(e.y), X(e.x1 - 0.4), X(e.y - 3.2))
    p.line(X(e.x0 + 0.65), X(e.y), X(e.x1 - 0.15), X(e.y - 3.2))
    for (let i = 1; i < 8; i++) {
      const u = i / 8
      const ax = e.x0 + 0.4 + (e.x1 - e.x0 - 0.8) * u
      p.line(X(ax), X(e.y - 3.2 * u), X(ax + 0.25), X(e.y - 3.2 * u))
    }
    p.line(X(e.x1 - 0.5), X(e.y), X(e.x1 - 0.5), X(e.y + 1.5))
    p.line(X(e.x1 - 0.18), X(e.y), X(e.x1 - 0.18), X(e.y + 1.5))
    for (let y = e.y + 0.3; y < e.y + 1.5; y += 0.3) p.line(X(e.x1 - 0.5), X(y), X(e.x1 - 0.18), X(y))
  }

  // The laundromat's window: dark glass, and the cold light of its tubes inside, high up.
  const wx = (WIN.x0 + WIN.x1) / 2
  const wy = (WIN.y0 + WIN.y1) / 2
  const nb = neonAt(t)
  p.noStroke()
  p.fill(mixHex(NIGHT, STAR.neonTeal, 0.07))
  p.rect(X(wx), X(wy), X(WIN.x1 - WIN.x0), X(WIN.y1 - WIN.y0))
  glow(p, X(wx), X(WIN.y0 + 0.25), X(1.9), STAR.neonTeal, 0.12)
  // Its frame, and the sill.
  outline(p, rgba(INK, 0.55), weight * 0.8)
  p.rect(X(wx), X(wy), X(WIN.x1 - WIN.x0), X(WIN.y1 - WIN.y0))
  solid(p, rgba(INK, 0.55), weight * 0.7, STONE)
  p.rect(X(wx), X(WIN.y1 + 0.05), X(WIN.x1 - WIN.x0 + 0.3), X(0.1))

  // The neon washer, hung in the window: pink glass tubes, dark until it comes on.
  drawNeon(p, c, nb)

  // The downspout, down the wall to its shoe, and the water it lets out.
  const sx = SPOUT_X
  solid(p, rgba(INK, 0.55), weight * 0.7, IRON)
  p.rect(X(sx), X((top + LANDING - 0.42) / 2), X(0.13), X(LANDING - 0.42 - top))
  p.beginShape()
  p.vertex(X(sx - 0.065), X(LANDING - 0.42))
  p.quadraticVertex(X(sx - 0.065), X(LANDING - 0.2), X(sx + 0.22), X(LANDING - 0.22))
  p.vertex(X(sx + 0.22), X(LANDING - 0.35))
  p.quadraticVertex(X(sx + 0.065), X(LANDING - 0.35), X(sx + 0.065), X(LANDING - 0.42))
  p.endShape(p.CLOSE)
  for (let y = LANDING - 1.6; y > top; y -= 1.5) {
    solid(p, rgba(INK, 0.55), weight * 0.5, IRON)
    p.rect(X(sx), X(y), X(0.22), X(0.07))
  }
  const fl = floodAt(t)
  p.noFill()
  p.stroke(rgba(STAR.rain, 0.45 + 0.35 * fl))
  p.strokeWeight(X(0.025 + 0.06 * fl))
  p.beginShape()
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    p.vertex(X(sx + 0.22 + (0.1 + 0.25 * fl) * u), X(LANDING - 0.285 + 0.26 * u * u))
  }
  p.endShape()
}

function drawNeon(p: p5, c: Ctx, b: number): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const [nx, ny] = NEON
  const w = 0.92
  const h = 1.0
  if (b > 0.01) glow(p, X(nx), X(ny), X(2.4), STAR.neonPink, 0.3 * b, 0.25)
  // Its chains to the window's head.
  outline(p, mixHex(INK, NIGHT, 0.5), weight * 0.5)
  p.line(X(nx - 0.35), X(WIN.y0), X(nx - 0.35), X(ny - h / 2))
  p.line(X(nx + 0.35), X(WIN.y0), X(nx + 0.35), X(ny - h / 2))
  const tube = (draw: () => void) => {
    // Unlit, the glass is a dull line; lit, a soft halo and a white-hot core.
    p.noFill()
    if (b > 0.01) {
      p.stroke(rgba(STAR.neonPink, 0.45 * b))
      p.strokeWeight(X(0.11))
      draw()
      p.stroke(mixHex(mixHex(STAR.neonPink, NIGHT, 0.55), STAR.neonPink, b))
      p.strokeWeight(X(0.045))
      draw()
      p.stroke(rgba(mixHex(STAR.neonPink, STAR.flash, 0.7), 0.9 * b))
      p.strokeWeight(Math.max(1, X(0.016)))
      draw()
    } else {
      p.stroke(mixHex(STAR.neonPink, NIGHT, 0.62))
      p.strokeWeight(Math.max(1, X(0.035)))
      draw()
    }
  }
  tube(() => p.rect(X(nx), X(ny), X(w), X(h), X(0.08)))
  tube(() => p.circle(X(nx), X(ny + 0.1), X(0.52)))
  tube(() => p.line(X(nx - w / 2 + 0.08), X(ny - h / 2 + 0.22), X(nx + w / 2 - 0.08), X(ny - h / 2 + 0.22)))
  tube(() => p.line(X(nx + 0.22), X(ny - h / 2 + 0.11), X(nx + 0.34), X(ny - h / 2 + 0.11)))
  // The wash inside the door: a slosh line.
  tube(() => {
    p.beginShape()
    for (let i = 0; i <= 10; i++) {
      const u = i / 10
      p.vertex(X(nx - 0.2 + 0.4 * u), X(ny + 0.16 + 0.04 * Math.sin(u * Math.PI * 2)))
    }
    p.endShape()
  })
}

function drawLamp(p: p5, c: Ctx): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const [lx, ly] = LANTERN
  // The cone of light down through the rain, and the pool it makes on the wet stone.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(CONE_TOP), 0, X(LANDING))
  g.addColorStop(0, rgba(STAR.spot, 0.24))
  g.addColorStop(1, rgba(STAR.spot, 0.06))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(X(lx - coneHalf(CONE_TOP)), X(CONE_TOP))
  ctx.lineTo(X(lx + coneHalf(CONE_TOP)), X(CONE_TOP))
  ctx.lineTo(X(lx + coneHalf(LANDING)), X(LANDING))
  ctx.lineTo(X(lx - coneHalf(LANDING)), X(LANDING))
  ctx.closePath()
  ctx.fill()
  glow(p, X(lx), X(ly + 0.1), X(1.1), STAR.spot, 0.55)
  // The post: a fluted foot, a column, and its crook.
  solid(p, INK, weight, IRON)
  p.rect(X(POST_X), X(LANDING - 0.25), X(0.3), X(0.5), X(0.04))
  p.rect(X(POST_X), X((LANDING - 0.5 + POST_TOP) / 2), X(0.11), X(LANDING - 0.5 - POST_TOP))
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(X(0.11) + weight * 2)
  const crook = () => {
    p.beginShape()
    p.vertex(X(POST_X), X(POST_TOP + 0.02))
    p.bezierVertex(X(POST_X), X(POST_TOP - 0.55), X(lx), X(POST_TOP - 0.62), X(lx), X(ly - 0.35))
    p.endShape()
  }
  crook()
  p.stroke(IRON)
  p.strokeWeight(X(0.11))
  crook()
  // The lantern: a cap, glass, a finial under.
  solid(p, INK, weight, IRON)
  p.triangle(X(lx - 0.24), X(ly - 0.2), X(lx + 0.24), X(ly - 0.2), X(lx), X(ly - 0.4))
  solid(p, INK, weight * 0.8, mixHex(STAR.spot, STAR.gold, 0.25))
  p.quad(X(lx - 0.17), X(ly - 0.2), X(lx + 0.17), X(ly - 0.2), X(lx + 0.12), X(ly + 0.26), X(lx - 0.12), X(ly + 0.26))
  outline(p, INK, weight * 0.6)
  p.line(X(lx), X(ly - 0.2), X(lx), X(ly + 0.26))
  solid(p, INK, weight * 0.8, IRON)
  p.rect(X(lx), X(ly + 0.3), X(0.26), X(0.08))
}

function drawGround(p: p5, c: Ctx, t: number, f: ReturnType<typeof frame>): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const foot = Math.max(LOWER + 1, f.y1 + 1)
  // The stair and the terrace: one mass of dark stone. Only its top, where the light falls, is drawn in ink.
  const profile: Pt[] = [[EDGE_X, CARPET]]
  for (let i = 1; i < NOSING.length; i++) profile.push([NOSING[i - 1], stepFace(i)], [NOSING[i], stepFace(i)])
  profile.push([NOSING[5], LANDING], [TERRACE_R, LANDING])
  p.noStroke()
  p.fill(STONE_DEEP)
  p.beginShape()
  for (const [x, y] of profile) p.vertex(X(x), X(y))
  p.vertex(X(TERRACE_R), X(foot))
  p.vertex(X(EDGE_X), X(foot))
  p.endShape(p.CLOSE)
  // The terrace's big dressed blocks, barely there.
  p.stroke(rgba(STONE, 0.22))
  p.strokeWeight(Math.max(1, weight * 0.5))
  for (let row = 0; row < 7; row++) {
    const y = LANDING + PAVE + 0.62 * (row + 1)
    if (y > LOWER - 0.1) break
    const x0 = Math.max(EDGE_X + 0.2, NOSING[Math.min(5, Math.max(0, row))] - 0.4)
    p.line(X(x0), X(y), X(TERRACE_R - 0.05), X(y))
    for (let x = x0 + (row % 2) * 0.8 + 0.5; x < TERRACE_R - 0.1; x += 1.6) p.line(X(x), X(y - 0.62), X(x), X(y))
  }
  // Each tread's wet face, and its nosing catching the light.
  for (let i = 1; i < NOSING.length; i++) {
    const a = NOSING[i - 1]
    const b = NOSING[i]
    p.noStroke()
    p.fill(STONE)
    p.rect(X((a + b) / 2), X(stepFace(i) + 0.05), X(b - a), X(0.1))
    p.stroke(rgba(STAR.rain, 0.55))
    p.strokeWeight(Math.max(1, X(0.018)))
    p.line(X(a + 0.03), X(stepFace(i) + 0.012), X(b - 0.05), X(stepFace(i) + 0.012))
  }
  // The landing's paving, wet: its face seen a little from above, dark and shining.
  const px0 = NOSING[5]
  p.noStroke()
  p.fill(WET)
  p.rect(X((px0 + TERRACE_R) / 2), X(LANDING + PAVE / 2), X(TERRACE_R - px0), X(PAVE))
  p.stroke(rgba(NIGHT, 0.8))
  p.strokeWeight(Math.max(1, weight))
  p.line(X(px0), X(LANDING + PAVE), X(TERRACE_R), X(LANDING + PAVE))
  outline(p, rgba(INK, 0.75), weight * 0.8)
  p.beginShape()
  for (const [x, y] of profile) p.vertex(X(x), X(y))
  p.endShape()
  // The lower lane past the terrace.
  p.noStroke()
  p.fill(STREET)
  p.rect(X((TERRACE_R + f.x1 + 1) / 2), X((LOWER + foot) / 2), X(f.x1 + 1 - TERRACE_R), X(foot - LOWER))
  outline(p, rgba(INK, 0.4), weight * 0.7)
  p.line(X(TERRACE_R), X(LOWER), X(f.x1 + 1), X(LOWER))

  // The drain, cut open: the shaft under the cover, and the arched race it drops into, lined with stone.
  const lining = mixHex(STONE_DEEP, STONE, 0.35)
  const race = () => {
    const w = TERRACE_R - RACE_X0
    const h = RACE_BED - RACE_ROOF
    p.rect(X((SHAFT_L + SHAFT_R) / 2), X((LANDING + PAVE + RACE_ROOF + 0.2) / 2), X(SHAFT_R - SHAFT_L), X(RACE_ROOF + 0.2 - LANDING - PAVE))
    p.rect(X(RACE_X0 + w / 2), X(RACE_ROOF + h / 2), X(w), X(h), X(0.28), X(0.28), X(0.04), X(0.04))
  }
  p.noStroke()
  p.fill(lining)
  const pad = 0.07
  p.rect(X((SHAFT_L + SHAFT_R) / 2), X((LANDING + PAVE + RACE_ROOF + 0.2) / 2), X(SHAFT_R - SHAFT_L + 2 * pad), X(RACE_ROOF + 0.2 - LANDING - PAVE))
  p.rect(X((RACE_X0 + TERRACE_R) / 2), X((RACE_ROOF + RACE_BED) / 2), X(TERRACE_R - RACE_X0 + 2 * pad), X(RACE_BED - RACE_ROOF + 2 * pad), X(0.34), X(0.34), X(0.06), X(0.06))
  p.fill(NIGHT)
  race()
  // Light from the lamp through the grate: thin blades down the shaft while it is shut, a wedge while it is open.
  const open = clamp(coverAt(t) / 0.9)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const shaftTop = LANDING + PAVE
  const g = ctx.createLinearGradient(0, X(shaftTop), 0, X(WATER))
  g.addColorStop(0, rgba(STAR.spot, 0.3 + 0.25 * open))
  g.addColorStop(1, rgba(STAR.spot, 0.03))
  ctx.fillStyle = g
  if (open < 0.08) {
    for (let i = 1; i < 5; i++) {
      const sx = COVER_L + ((COVER_R - COVER_L) * i) / 5 - 0.045
      ctx.fillRect(X(sx - 0.018), X(shaftTop), X(0.036), X(WATER - shaftTop))
    }
  } else {
    ctx.beginPath()
    ctx.moveTo(X(COVER_L), X(shaftTop))
    ctx.lineTo(X(SHAFT_R - 0.02), X(shaftTop))
    ctx.lineTo(X(SHAFT_R - 0.02), X(WATER))
    ctx.lineTo(X(SHAFT_L + 0.02), X(WATER))
    ctx.closePath()
    ctx.fill()
  }
  pool(p, X((COVER_L + COVER_R) / 2), X(WATER + 0.02), X(0.55), X(0.07), STAR.spot, 0.3 + 0.3 * open)
  // The water in the race, running out to the mouth.
  p.noStroke()
  p.fill(mixHex(STAR.wet, STAR.rain, 0.3))
  p.rect(X((RACE_X0 + TERRACE_R) / 2), X((WATER + RACE_BED) / 2), X(TERRACE_R - RACE_X0 - 0.02), X(RACE_BED - WATER))

  // The mouth: a pipe out of the terrace wall, and the water falling from it to the lane.
  const my = MOUTH[1] + 0.02
  solid(p, INK, weight, IRON)
  p.rect(X((TERRACE_R + MOUTH[0] + 0.06) / 2), X(my), X(MOUTH[0] + 0.06 - TERRACE_R), X(0.5))
  p.noStroke()
  p.fill(NIGHT)
  p.rect(X((TERRACE_R + MOUTH[0]) / 2), X(my), X(MOUTH[0] - TERRACE_R), X(0.36))
  solid(p, INK, weight, mixHex(IRON, INK, 0.2))
  p.rect(X(MOUTH[0] + 0.06), X(my), X(0.1), X(0.6), X(0.02))
  const fl = 0.3 + 0.7 * smooth(t, SPLASH - 0.3, SPLASH + 0.8)
  p.noFill()
  p.stroke(rgba(STAR.rain, 0.55))
  p.strokeWeight(X(0.04 + 0.1 * fl))
  p.beginShape()
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    p.vertex(X(MOUTH[0] + 0.1 + (0.3 + 0.5 * fl) * u), X(my + 0.12 + (LOWER - my - 0.12) * u * u))
  }
  p.endShape()
}

/** The cover over the drain: an iron grate, hinged at its right edge, rocking and dropping open. */
function drawCover(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const a = coverAt(t)
  const len = COVER_R - COVER_L
  p.push()
  p.translate(X(COVER_R), X(LANDING))
  p.rotate(-a)
  solid(p, INK, weight, IRON)
  p.rect(X(-len / 2), X(0.04), X(len), X(0.08))
  outline(p, mixHex(INK, NIGHT, 0.3), weight * 0.5)
  for (let i = 1; i < 5; i++) p.line(X(-len + (len * i) / 5), X(0.01), X(-len + (len * i) / 5), X(0.07))
  solid(p, INK, weight * 0.8, IRON)
  p.circle(0, X(0.04), X(0.07))
  p.pop()
}

/** What the wet paving gives back: the lamp, the neon, the two of them. */
function drawReflections(p: p5, c: Ctx, t: number, her: Pt | null): void {
  const X = (v: number) => v * c.k
  const y = LANDING + 0.01
  // The lamp's pool on the stone, and its long shine in the wet; the neon's; the window's.
  pool(p, X(LANTERN[0]), X(LANDING + 0.05), X(2.1), X(0.24), STAR.spot, 0.55)
  smear(p, X(LANTERN[0]), X(y), X(0.5), X(PAVE), STAR.spot, 0.6)
  const nb = neonAt(t)
  if (nb > 0.01) smear(p, X(NEON[0]), X(y), X(0.9), X(PAVE), STAR.neonPink, 0.32 * nb)
  smear(p, X((WIN.x0 + WIN.x1) / 2), X(y), X(2.2), X(PAVE * 0.8), STAR.neonTeal, 0.12)
  // The two of them, given back by the wet.
  const w = waymondAt(t)
  smear(p, X(w[0]), X(y), X(0.26), X(PAVE * 0.9), WAYMOND, 0.45)
  if (her && her[0] > NOSING[5] && her[0] < TERRACE_R && Math.abs(her[1] - (LANDING - R)) < 0.12) smear(p, X(her[0]), X(y), X(0.26), X(PAVE * 0.9), EVELYN, 0.5)
  // The flood from the downspout: a sheet of water running along the stone to the drain.
  const fl = floodAt(t)
  if (fl > 0.2) {
    p.noStroke()
    p.fill(rgba(STAR.rain, 0.35 * fl))
    p.rect(X((SPOUT_X + 0.3 + COVER_L) / 2), X(LANDING - 0.012), X(COVER_L - SPOUT_X - 0.3), X(0.024 + 0.02 * fl))
  }
}

/* ------------------------------------------------------------------ the rain, and its splashes */

/** Where a splash is thrown up: each landing she makes in the alley, in its own time. */
const SPLASHES: { t: number; at: Pt; big: number }[] = [
  ...STEPS.slice(1).map((s, i) => ({ t: s, at: [STEP_LAND[i + 1][0], stepFace(i + 2)] as Pt, big: 0.7 })),
  { t: SPLASH, at: [SPLASH_AT[0], WATER] as Pt, big: 1.6 },
]

function drawSplashes(p: p5, c: Ctx, t: number): void {
  const X = (v: number) => v * c.k
  for (const sp of SPLASHES) {
    // Measured in the alley's own time, so the slow ones hang.
    const s = alleyTime(t) - alleyTime(sp.t)
    if (s < 0 || s > 0.55) continue
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42 + (hash(i, Math.round(sp.t * 10)) - 0.5) * 0.2
      const v = (1.1 + 0.8 * hash(i, 7, Math.round(sp.t * 10))) * sp.big
      const x = sp.at[0] + Math.cos(a) * v * s
      const y = sp.at[1] + Math.sin(a) * v * s + 0.5 * 9 * s * s
      if (y > sp.at[1] + 0.02) continue
      p.noStroke()
      p.fill(rgba(STAR.rain, 0.85 * (1 - s / 0.55)))
      p.circle(X(x), X(y), X(0.035 * (0.7 + 0.5 * hash(i, 3))))
    }
  }
}

function drawRain(p: p5, c: Ctx, t: number, f: ReturnType<typeof frame>): void {
  const on = smooth(t, 68.95, 69.85)
  if (on <= 0) return
  const X = (v: number) => v * c.k
  const tau = alleyTime(t)
  const rate = timeRate(t)
  const len = 0.06 + 0.3 * rate
  const period = 6
  const x0 = Math.max(f.x0 - 0.5, EDGE_X - 6)
  const gap = 0.12
  const wind = 0.1
  p.strokeWeight(Math.max(1, X(0.012)))
  for (let j = Math.floor(x0 / gap); j <= Math.ceil((f.x1 + 0.5) / gap); j++) {
    for (let d = 0; d < 2; d++) {
      // Each column's drops have their own place in the tile and their own pace, and some start late.
      if (hash(j, d, 41) > on) continue
      const x = j * gap + hash(j, d, 21) * gap
      const phase = hash(j, d, 11) * period + 11 * tau * (0.85 + 0.3 * hash(j, d, 31))
      let y = (((phase % period) + period) % period) + Math.floor((f.y0 - 1) / period) * period
      for (; y < f.y1 + 1; y += period) {
        if (y < f.y0 - 1) continue
        const bx = x + wind * (y - f.y0)
        if (y + len > groundAt(bx)) continue
        const lit = inCone(bx, y)
        const nb = neonAt(t) * clamp(1 - Math.hypot(bx - NEON[0], y - NEON[1]) / 2.2)
        const a = 0.2 + 0.55 * lit + 0.3 * nb
        p.stroke(rgba(lit > nb ? STAR.spot : nb > 0.05 ? mixHex(STAR.rain, STAR.neonPink, 0.6) : STAR.rain, a * on))
        p.line(X(bx), X(y), X(bx - wind * len), X(y + len))
      }
    }
  }
}

/* ------------------------------------------------------------------ all of it */

/** The alley behind the ball at show time `t`; `her` is where she is (for her light on the wet stone). */
export function drawAlley(p: p5, c: Ctx, t: number, her: Pt | null): void {
  const f = frame(p, c.k)
  if (f.x1 < EDGE_X - 0.5) return
  drawWalls(p, c, t, f)
  drawLamp(p, c)
  drawGround(p, c, t, f)
  drawReflections(p, c, t, her)
  drawCover(p, c, t)
}

/** In front of the ball: the race's water over her, the splashes, and the rain. */
export function alleyOver(p: p5, c: Ctx, t: number): void {
  const f = frame(p, c.k)
  if (f.x1 < EDGE_X - 6) return
  const X = (v: number) => v * c.k
  // The race's water over whatever floats in it, its surface running toward the mouth.
  if (f.x1 > RACE_X0 && f.y1 > RACE_ROOF) {
    p.noStroke()
    p.fill(rgba(mixHex(STAR.wet, STAR.rain, 0.35), 0.72))
    p.rect(X((RACE_X0 + TERRACE_R) / 2), X((WATER + 0.035 + RACE_BED) / 2), X(TERRACE_R - RACE_X0 - 0.02), X(RACE_BED - WATER - 0.035))
    p.stroke(rgba(STAR.rain, 0.8))
    p.strokeWeight(Math.max(1, X(0.02)))
    const run = (t - SPLASH) * 1.8
    for (let i = 0; i < 14; i++) {
      const L = TERRACE_R - RACE_X0 - 0.3
      const x = RACE_X0 + 0.1 + ((((i / 14) * L + run) % L) + L) % L
      p.line(X(x), X(WATER + 0.035), X(Math.min(TERRACE_R - 0.05, x + 0.14)), X(WATER + 0.035))
    }
  }
  drawSplashes(p, c, t)
  drawRain(p, c, t, f)
}
