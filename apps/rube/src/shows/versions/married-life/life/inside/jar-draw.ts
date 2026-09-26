import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, type Ctx } from '../kit'
import { AGE } from '../music'
import { HOME, INK } from '../worlds'
import { drawChairs } from '../props/chairs'
import { drawJar } from '../props/jar'
import { INSIDE } from './inside'
import {
  AXLE, BOX, CHAIRS_X, CUP, FIXED, HALF, HANDFUL, HINGE, HUBCAP, LAMP, LADDER, LANDS, MANTLE, POURS, SLAMS, SLOT, TREE, TYRE,
  carAt, clamp01, cupAt, fillAt, jarAt, jarBase, jarMouth, ladderAt, lampAt, onPlank, plankAt, smoothstep, stormAt, sunAt,
} from './jar-clock'

/**
 * The living room, drawn (the jar builder's): what is seen through its two windows (the car in the drive, the big
 * tree in the garden, the storm), the lamp over the stepladder, the seesaw that throws their savings into the jar, the
 * jar on the mantle and the coins it pours, the two armchairs. Everything here is in the house's INSIDE cells and is
 * handed show time `T`; it draws behind Carl and Ellie (the part's `draw`).
 */

const X = (k: number) => (v: number) => v * k
const G = 12

/** A coin seen nearly edge on: a flat brass disc, turning, inked so it reads against brick; its face flashes pale as it turns to us. */
function coin(p: p5, k: number, weight: number, x: number, y: number, spin: number, turn = 0, a = 1): void {
  const w = 0.15
  const face = Math.abs(Math.sin(spin))
  const h = 0.022 + 0.07 * face
  p.push()
  p.translate(x * k, y * k)
  p.rotate(turn)
  p.stroke(alpha(p, INK, 0.85 * a))
  p.strokeWeight(weight * 0.45)
  p.fill(alpha(p, mixHex(HOME.brass, HOME.shine, face * face * 0.7), a))
  p.ellipse(0, 0, w * k, h * k)
  p.pop()
}

/* ------------------------------------------------------------------ the windows */

const [LEFT_WIN, RIGHT_WIN] = INSIDE.windows

function clipTo(p: p5, k: number, [x0, x1, y0, y1]: number[], draw: () => void): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  draw()
  ctx.restore()
}

/** The frame, bars and sill over a window, as the set draws them (the view is painted between the set and these). */
function frameOver(p: p5, k: number, weight: number, [x0, x1, y0, y1]: number[]): void {
  const x = X(k)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, '#FFFFFF', 0.22))
  p.quad(x(x0 + 0.2), x(y1), x(x0 + 0.75), x(y0), x(x0 + 1.05), x(y0), x(x0 + 0.5), x(y1))
  p.noFill()
  p.stroke(HOME.trim)
  p.strokeWeight(0.1 * k)
  p.rect(x(x0), x(y0), x(x1 - x0), x(y1 - y0))
  p.line(x((x0 + x1) / 2), x(y0), x((x0 + x1) / 2), x(y1))
  p.line(x(x0), x((y0 + y1) / 2), x(x1), x((y0 + y1) / 2))
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.7)
  p.rect(x(x0 - 0.05), x(y0 - 0.05), x(x1 - x0 + 0.1), x(y1 - y0 + 0.1))
  p.fill(HOME.trim)
  p.rect(x(x0 - 0.15), x(y1), x(x1 - x0 + 0.3), x(0.1))
  p.pop()
}

/** The weather over a pane: the storm's dark, the rain, the lightning. */
function weather(p: p5, k: number, T: number, [x0, x1, y0, y1]: number[], seed: number): void {
  const x = X(k)
  const { storm, flash, rain } = stormAt(T)
  p.noStroke()
  if (storm > 0.01) {
    p.fill(alpha(p, HOME.night, 0.58 * storm))
    p.rect(x(x0), x(y0), x(x1 - x0), x(y1 - y0))
  }
  if (rain > 0.01) {
    p.stroke(alpha(p, '#DCEEF3', 0.5 * rain))
    p.strokeWeight(Math.max(1, k * 0.012))
    for (let i = 0; i < 26; i++) {
      const u = (hash(i, seed, 7) + T * (1.6 + hash(i, seed, 9) * 0.6)) % 1
      const rx = x0 + hash(i, seed, 3) * (x1 - x0 + 0.6) - 0.3 * u
      const ry = y0 - 0.3 + u * (y1 - y0 + 0.6)
      p.line(x(rx), x(ry), x(rx - 0.06), x(ry + 0.22))
    }
  }
  if (flash > 0.01) {
    p.noStroke()
    p.fill(alpha(p, '#F4F7F2', 0.85 * flash))
    p.rect(x(x0), x(y0), x(x1 - x0), x(y1 - y0))
  }
}

/** The drive through the left-hand window: a hedge, the drive, their car; the tyre that blows, and the hubcap. */
function driveway(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const [x0, x1, y0, y1] = LEFT_WIN
  void y0
  clipTo(p, k, LEFT_WIN, () => {
    p.push()
    p.rectMode(p.CORNER)
    p.noStroke()
    // Far off: a soft hedge; then the lawn and the pale drive the car stands on.
    p.fill(mixHex(HOME.leaf, '#9AAE8A', 0.35))
    p.beginShape()
    p.vertex(x(x0 - 0.2), x(y1))
    for (let i = 0; i <= 12; i++) p.vertex(x(x0 - 0.2 + i * 0.24), x(-1.5 - 0.06 * Math.abs(Math.sin(i * 1.9))))
    p.vertex(x(x1 + 0.2), x(y1))
    p.endShape(p.CLOSE)
    p.fill(mixHex(HOME.grass, '#A7BC90', 0.3))
    p.rect(x(x0), x(-1.3), x(x1 - x0), x(0.36))
    p.fill(HOME.stone)
    p.rect(x(x0), x(-1.07), x(x1 - x0), x(0.14))

    // The car: rear to the left. It sags on its rear when the tyre goes, and stands level again once it is paid for.
    const car = carAt(T)
    const REAR = 1.78
    const FRONT = 3.2
    const WHEEL = -1.11
    const R = 0.1
    p.push()
    p.translate(x(FRONT), x(WHEEL + R))
    p.rotate(-car.sag * 0.075)
    p.translate(-x(FRONT), -x(WHEEL + R))
    p.stroke(alpha(p, INK, 0.85))
    p.strokeWeight(weight * 0.7)
    // The wheels first (dark tyres, small hubs; the rear one flattens), then the body over their tops, the cabin.
    for (const [wx, flat] of [[REAR, Math.max(0, car.sag)], [FRONT, 0]] as [number, number][]) {
      p.fill(INK)
      p.ellipse(x(wx), x(WHEEL + flat * 0.03), x(2 * R * (1 + flat * 0.25)), x(2 * R * (1 - flat * 0.32)))
      if (wx === FRONT || T < TYRE || T >= FIXED - 0.2) {
        p.noStroke()
        p.fill(HOME.trim)
        p.circle(x(wx), x(WHEEL + flat * 0.03), x(0.07))
        p.stroke(alpha(p, INK, 0.85))
      }
    }
    p.fill(mixHex(HOME.yellow, '#F4DFA0', 0.25))
    p.beginShape()
    p.vertex(x(2.02), x(-1.38))
    p.bezierVertex(x(2.1), x(-1.66), x(2.3), x(-1.7), x(2.55), x(-1.7))
    p.bezierVertex(x(2.85), x(-1.7), x(2.95), x(-1.62), x(3.08), x(-1.38))
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(alpha(p, HOME.glass, 0.9))
    p.quad(x(2.14), x(-1.4), x(2.24), x(-1.61), x(2.52), x(-1.64), x(2.52), x(-1.4))
    p.quad(x(2.6), x(-1.4), x(2.6), x(-1.64), x(2.84), x(-1.61), x(2.96), x(-1.4))
    p.stroke(alpha(p, INK, 0.85))
    p.fill(HOME.yellow)
    p.rect(x(1.42), x(-1.42), x(2.1), x(0.24), x(0.1))
    p.pop()

    // The blow: a puff of dust off the drive, spreading and thinning.
    if (car.puff > 0 && car.puff < 1.4) {
      const u = car.puff / 1.4
      p.noStroke()
      for (let i = 0; i < 5; i++) {
        const a = (1 - u) * (1 - u) * 0.55
        const dx = (hash(i, 2, 5) - 0.6) * 0.5 * Math.sqrt(u) - 0.15 * u
        const dy = -0.05 - 0.22 * Math.sqrt(u) * hash(i, 4, 1)
        p.fill(alpha(p, '#CFC6B6', a))
        p.circle(x(REAR + dx), x(-1.02 + dy), x(0.12 + 0.3 * Math.sqrt(u) * (0.6 + hash(i, 1, 1))))
      }
    }
    // The hubcap: off it pops, lands on the drive on the next downbeat, wobbles, and rolls away out of sight.
    if (T >= TYRE && T < FIXED) {
      const fly = HUBCAP - TYRE
      const s = T - TYRE
      let hx: number
      let hy: number
      let tilt = 0
      if (s < fly) {
        const u = s / fly
        hx = REAR - 0.45 * u
        hy = WHEEL + (-1.02 - 0.03 - WHEEL) * u - 4 * 0.2 * u * (1 - u)
        tilt = s * 14
      } else {
        const r = s - fly
        hx = REAR - 0.45 - 0.55 * r
        hy = -1.05 - 0.03 * Math.abs(Math.sin(r * 10)) * Math.exp(-r / 0.25)
        tilt = 1.4 + r * 5
      }
      p.stroke(alpha(p, INK, 0.8))
      p.strokeWeight(weight * 0.5)
      p.fill(HOME.trim)
      p.ellipse(x(hx), x(hy), x(0.09), x(0.09 * Math.abs(Math.cos(tilt)) + 0.02))
    }
    // Seen through glass.
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', 0.1))
    p.rect(x(x0), x(-3), x(x1 - x0), x(2.2))
    p.pop()
    weather(p, k, T, LEFT_WIN, 1)
  })
  frameOver(p, k, weight, LEFT_WIN)
}

/** The garden's big tree through the right-hand window: it sways in the storm, and loses its great limb. */
function garden(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const [x0, x1] = RIGHT_WIN
  const { storm } = stormAt(T)
  const sway = storm * (0.07 * Math.sin(T * 2.1) + 0.04 * Math.sin(T * 3.7 + 1))
  clipTo(p, k, RIGHT_WIN, () => {
    p.push()
    p.rectMode(p.CORNER)
    p.noStroke()
    p.fill(mixHex(HOME.grass, '#A7BC90', 0.3))
    p.rect(x(x0), x(-1.25), x(x1 - x0), x(0.3))
    // The trunk, leaning with the wind.
    p.stroke(alpha(p, INK, 0.7))
    p.strokeWeight(weight * 0.6)
    p.fill(HOME.bark)
    p.quad(x(9.62), x(-0.95), x(9.98), x(-0.95), x(9.92 + sway), x(-2.05), x(9.72 + sway), x(-2.05))
    // The crown: soft masses, no outline; the great limb on the left goes at the blow.
    const gone = T >= TREE ? smoothstep((T - TREE) / 0.5) : 0
    p.noStroke()
    const clumps: [number, number, number, number][] = [
      [9.1, -2.35, 0.8, 0], [9.85, -2.55, 0.95, 0], [10.6, -2.3, 0.8, 0], [9.5, -1.95, 0.6, 0], [10.3, -1.9, 0.6, 0],
      [8.75, -2.75, 0.75, 1], [9.3, -2.95, 0.7, 1],
    ]
    for (const [cx, cy, r, limb] of clumps) {
      const off = limb ? gone : 0
      const lx = cx + sway * (1.3 + (cy + 2) * -0.3) + off * 1.4
      const ly = cy - off * 1.6
      if (limb && off > 0.999) continue
      p.fill(mixHex(HOME.leaf, '#5E8A4C', hash(cx * 10, 3, 1) * 0.5))
      p.ellipse(x(lx), x(ly), x(r * 1.25), x(r))
    }
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', 0.1))
    p.rect(x(x0), x(-3), x(x1 - x0), x(2.2))
    p.pop()
    weather(p, k, T, RIGHT_WIN, 2)
  })
  frameOver(p, k, weight, RIGHT_WIN)
}

/* ------------------------------------------------------------------ the lamp and the ladder */

function lampLight(p: p5, k: number, T: number): void {
  const { lit } = lampAt(T)
  if (lit <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cx = LAMP.x * k
  const cy = (LAMP.rim + 0.3) * k
  ctx.save()
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1.9 * k)
  g.addColorStop(0, `rgba(255, 227, 166, ${0.22 * lit})`)
  g.addColorStop(1, 'rgba(255, 227, 166, 0)')
  ctx.fillStyle = g
  ctx.fillRect(cx - 1.9 * k, cy - 1.9 * k, 3.8 * k, 3.8 * k)
  ctx.restore()
}

function lamp(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const { lit, swing } = lampAt(T)
  p.push()
  p.translate(x(LAMP.x), x(LAMP.ceil))
  p.rotate(swing)
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.5)
  p.line(0, 0, 0, x(LAMP.cord))
  p.translate(0, x(LAMP.cord))
  // The bulb under the rim: warm when lit, grey when it has gone.
  p.noStroke()
  p.fill(lit > 0.01 ? mixHex('#E6E1D6', HOME.lamp, lit) : '#D6D1C6')
  p.ellipse(0, x(0.22), x(0.1), x(0.08))
  // The shade: a cream bell.
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.7)
  p.fill(HOME.trim)
  p.beginShape()
  p.vertex(x(-0.07), 0)
  p.vertex(x(0.07), 0)
  p.bezierVertex(x(0.12), x(0.08), x(0.17), x(0.14), x(0.19), x(0.2))
  p.vertex(x(-0.19), x(0.2))
  p.bezierVertex(x(-0.17), x(0.14), x(-0.12), x(0.08), x(-0.07), 0)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The stepladder: two rails, two treads, a top; rocked about one foot when it is kicked. */
function ladder(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const rock = ladderAt(T)
  const foot: Pt = rock >= 0 ? [LADDER.front, INSIDE.ground] : [LADDER.rear, INSIDE.ground]
  const wood = mixHex(HOME.wood, '#A88C70', AGE(T) * 0.6)
  p.push()
  p.translate(x(foot[0]), x(foot[1]))
  p.rotate(rock)
  p.translate(-x(foot[0]), -x(foot[1]))
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(wood, INK, 0.15))
  // The rear rail, then the spreader, the front rail with its treads, the top.
  p.quad(x(LADDER.rear), x(0.13), x(LADDER.rear + 0.07), x(0.13), x(LADDER.topX - 0.01), x(LADDER.top), x(LADDER.topX - 0.07), x(LADDER.top))
  p.line(x(3.5), x(-0.85), x(3.86), x(-0.85))
  p.fill(wood)
  p.quad(x(LADDER.front - 0.07), x(0.13), x(LADDER.front), x(0.13), x(LADDER.topX + 0.1), x(LADDER.top), x(LADDER.topX + 0.03), x(LADDER.top))
  p.rectMode(p.CORNER)
  for (const top of [-0.62, -1.25]) {
    const rail = LADDER.front + (top - 0.13) * (0.33 / 2.13)
    p.rect(x(rail - 0.17), x(top), x(0.36), x(0.05), x(0.01))
  }
  p.rect(x(LADDER.topX - 0.14), x(LADDER.top - 0.06), x(0.3), x(0.07), x(0.01))
  p.pop()
}

/* ------------------------------------------------------------------ the seesaw and the coin box */

function seesaw(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const phi = plankAt(T)
  const wood = mixHex(HOME.wood, '#A88C70', AGE(T) * 0.6)
  // The coin box's back and its heap of brass (the cup dips into it).
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(HOME.woodDark, INK, 0.2))
  p.rect(x(BOX.x0 + 0.03), x(BOX.rim - 0.06), x(BOX.x1 - BOX.x0 - 0.06), x(0.12))
  p.noStroke()
  p.fill(HOME.brass)
  p.beginShape()
  p.vertex(x(BOX.x0 + 0.04), x(BOX.rim + 0.05))
  p.bezierVertex(x(BOX.x0 + 0.12), x(BOX.rim - 0.1), x(BOX.x1 - 0.12), x(BOX.rim - 0.1), x(BOX.x1 - 0.04), x(BOX.rim + 0.05))
  p.endShape(p.CLOSE)
  // The trestle.
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.woodDark)
  p.quad(x(AXLE[0] - 0.17), x(0.13), x(AXLE[0] + 0.17), x(0.13), x(AXLE[0] + 0.07), x(AXLE[1] + 0.02), x(AXLE[0] - 0.07), x(AXLE[1] + 0.02))
  // The plank, its counterweight hung under the cup's side, the cup at its end.
  p.push()
  p.translate(x(AXLE[0]), x(AXLE[1]))
  p.rotate(phi)
  p.fill(HOME.section)
  p.line(x(0.5), x(0.035), x(0.5), x(0.13))
  p.rect(x(0.43), x(0.13), x(0.14), x(0.11), x(0.02))
  p.fill(wood)
  p.rect(x(-HALF), x(-0.035), x(2 * HALF), x(0.07), x(0.015))
  // The cup: a small tin scoop, full while it rests in the box.
  p.fill('#B9B3A6')
  p.beginShape()
  p.vertex(x(CUP - 0.11), x(-0.035))
  p.bezierVertex(x(CUP - 0.11), x(-0.16), x(CUP + 0.11), x(-0.16), x(CUP + 0.11), x(-0.035))
  p.endShape()
  const since = T - Math.max(-Infinity, ...SLAMS.filter((s) => s <= T))
  const full = !(since >= 0.03 && since < 0.7)
  if (full) {
    p.noStroke()
    p.fill(HOME.brass)
    p.ellipse(x(CUP), x(-0.1), x(0.18), x(0.05))
  }
  p.pop()
  p.stroke(alpha(p, INK, 0.9))
  p.fill(INK)
  p.circle(x(AXLE[0]), x(AXLE[1]), x(0.045))
  // The box's front wall, over the cup's bowl.
  p.fill(HOME.woodDark)
  p.rect(x(BOX.x0), x(BOX.rim), x(BOX.x1 - BOX.x0), x(0.13 - BOX.rim))
  p.stroke(alpha(p, INK, 0.35))
  p.line(x(BOX.x0 + 0.05), x(-0.04), x(BOX.x1 - 0.05), x(-0.04))
  p.pop()
}

/** Each handful in the air: three coins off the cup on a stroke, over the room and down into the lid's slot. */
function handfuls(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  SLAMS.forEach((slam, i) => {
    for (let j = 0; j < HANDFUL; j++) {
      const r = slam + 0.03 + j * 0.03
      const land = LANDS[i] + j * 0.03
      if (T < r || T >= land) continue
      const [sx, sy] = cupAt(r)
      const from: Pt = [sx + (j - 1) * 0.04, sy - 0.02 * j]
      const to: Pt = [SLOT[0] + (j - 1) * 0.035, SLOT[1]]
      const D = land - r
      const u = (T - r) / D
      const arc = (G * D * D) / 8
      const cx = from[0] + (to[0] - from[0]) * u
      const cy = from[1] + (to[1] - from[1]) * u - arc * 4 * u * (1 - u)
      coin(p, k, weight, cx, cy, (T - r) * (11 + j * 3), 0.3 * (j - 1))
    }
  })
}

/** The jar on the mantle, with the brass hinge its cradle turns on. */
function jar(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const { tilt, lid, jolt } = jarAt(T)
  const [bx, by] = jarBase(tilt)
  p.push()
  p.noStroke()
  p.fill('#9C7424')
  p.rectMode(p.CORNER)
  p.rect(x(HINGE[0] - 0.09), x(MANTLE.top - 0.03), x(0.12), x(0.03))
  p.pop()
  const dust = clamp01((AGE(T) - 0.3) * 1.6)
  drawJar(p, k, weight, bx, by - jolt, { fill: fillAt(T), lid, tilt, dust })
}

/** What each pour lets go: coins streaming off the jar's mouth, bouncing on the boards, skittering away and gone. */
function spill(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  POURS.forEach((pour, n) => {
    if (T < pour.stop - 0.1 || T > pour.stop + 3.5) return
    const count = [24, 12, 9][n]
    for (let j = 0; j < count; j++) {
      const r = pour.stop - 0.06 + (j / count) * 0.5 + hash(j, n, 2) * 0.03
      if (T < r) continue
      const tilt = jarAt(r).tilt
      const [mx, my] = jarMouth(tilt)
      const vx = 0.5 + 0.6 * hash(j, n, 5)
      const vy = 0.3 + 0.4 * hash(j, n, 6)
      const floor = INSIDE.ground - 0.02
      // Time to reach the floor from the mouth.
      const tf = (-vy + Math.sqrt(vy * vy + 2 * G * (floor - my))) / G
      const s = T - r
      if (s < tf) {
        coin(p, k, weight, mx + vx * s, my + vy * s + 0.5 * G * s * s, s * (9 + 6 * hash(j, n, 8)), 0.4)
        continue
      }
      const q = s - tf
      const v0 = 2.6 + 1.2 * hash(j, n, 9)
      const dec = 1.6
      const stop = v0 / dec
      const tq = Math.min(q, stop)
      const sx = mx + vx * tf + v0 * tq - 0.5 * dec * tq * tq
      const bounce = 0.07 * Math.abs(Math.sin(q * 16)) * Math.exp(-q / 0.07)
      // Skittering off out of the room, thinning as they go: gone within the second.
      const a = 1 - smoothstep((q - 0.45) / 0.55)
      if (a <= 0.01) continue
      coin(p, k, weight, sx, floor - bounce, q < 0.2 ? q * 20 : Math.PI / 2 - 0.2, 0, a)
    }
  })
}

/** The sun back after the storm: warm in both panes, and falling in two soft shafts across the floor. */
function sunlight(p: p5, k: number, T: number): void {
  const sun = sunAt(T)
  if (sun <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  for (const [x0, x1, y0, y1] of [LEFT_WIN, RIGHT_WIN]) {
    ctx.fillStyle = `rgba(255, 227, 166, ${0.3 * sun})`
    ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    const g = ctx.createLinearGradient(0, y1 * k, 0, INSIDE.ground * k)
    g.addColorStop(0, `rgba(255, 227, 166, ${0.2 * sun})`)
    g.addColorStop(1, `rgba(255, 227, 166, ${0.05 * sun})`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x0 * k, y1 * k)
    ctx.lineTo(x1 * k, y1 * k)
    ctx.lineTo((x1 + 0.9) * k, INSIDE.ground * k)
    ctx.lineTo((x0 + 0.9) * k, INSIDE.ground * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the room, in order */

/** The storm's dark over the living room (and not over the two of them: they are the light in it). */
function dim(p: p5, k: number, T: number): void {
  const { storm } = stormAt(T)
  if (storm <= 0.01) return
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, HOME.night, 0.2 * storm))
  p.rect(-0.9 * k, INSIDE.ceil * k, 13.8 * k, (INSIDE.ground - INSIDE.ceil) * k)
  p.pop()
}

export function drawRoom(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  driveway(p, c, T)
  garden(p, c, T)
  lampLight(p, k, T)
  drawChairs(p, k, weight, CHAIRS_X, INSIDE.ground, AGE(T) * 0.8)
  ladder(p, c, T)
  lamp(p, c, T)
  seesaw(p, c, T)
  handfuls(p, c, T)
  jar(p, c, T)
  spill(p, c, T)
  dim(p, k, T)
  sunlight(p, k, T)
  void onPlank
}
