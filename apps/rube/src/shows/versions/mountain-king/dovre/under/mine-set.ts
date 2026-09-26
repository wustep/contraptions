import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { drawTorch, glow } from '../lantern'
import type { Pen } from '../troll'
import { GOLD, LAMP, STONE, WORKS } from '../worlds'
import {
  BLADE_L, BLADE_UP, CLACKS, CX_STOP, FLOOR_Y, LAND, LEVER_X, RAIL, SETS, SHAFT, SIDING_END, SIDING_UP, STOP, STOP_X, TORCHES, TRIP, X_F,
  bladeAngle, beamLit, binLip, binTip, clamp01, leverAngle, lightAt, peerCartSpeed, peerCartX, torchLit,
} from './mine-clock'

/**
 * The gallery the carts run through: a long, low stope the trolls have dug out of the rock under the hall, held up
 * by square-set timbering, the rails along its floor, the switch and its catch siding, the torches on the
 * posts, the shaft down to the drum at its end, and the low tunnel at its start where the trapdoor lets the hall's
 * light down. All in the mine part's frame; everything is drawn in the light of `lightAt`, so it is dark until his
 * cart's sparks light the torches and stays lit after.
 */

const shade = (hex: string, light: number, bg: string, floor = 0.2): string => mixHex(bg, hex, floor + (1 - floor) * clamp01(light))
const inkIn = (c: Pen, light: number): string => mixHex(c.bg, c.ink, 0.3 + 0.7 * clamp01(light))

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the rooms */

/** The stope's outline: the low tunnel (x -5 to 1.6), the chamber rising to its ragged roof, down to the end wall over the shaft. */
const ROOF: Pt[] = [
  [1.55, -1.12],
  [1.95, -2.0],
  [2.6, -2.75],
  [3.8, -3.05],
  [5.6, -3.2],
  [7.6, -3.35],
  [9.8, -3.15],
  [12.2, -3.45],
  [14.6, -3.2],
  [16.6, -3.3],
  [18.3, -3.05],
  [19.8, -2.9],
  [21.1, -2.7],
  [22.3, -2.55],
  [22.9, -2.3],
]
const ROOM: Pt[] = (() => {
  const out: Pt[] = [
    [-5.2, FLOOR_Y + 0.02],
    [-5.2, -1.02],
  ]
  // The tunnel's roof, a little uneven.
  for (let x = -4.6; x < 1.5; x += 0.7) out.push([x, -1.08 - 0.07 * hash(Math.round(x * 10), 2, 1)])
  // The chamber's roof, broken between its corners.
  for (let i = 0; i < ROOF.length; i++) {
    out.push(ROOF[i])
    if (i + 1 < ROOF.length) {
      const [x0, y0] = ROOF[i]
      const [x1, y1] = ROOF[i + 1]
      out.push([(x0 + x1) / 2 + 0.2 * (hash(i, 3, 2) - 0.5), (y0 + y1) / 2 - 0.25 * hash(i, 3, 3)])
    }
  }
  out.push([22.9, FLOOR_Y + 0.02])
  return out
})()

/** The back wall of the stope, the tunnel and the two shafts (the trapdoor's from the hall, the one down to the drum). */
export function drawRooms(p: p5, c: Pen): void {
  const k = c.k
  const lit = 0.14
  const wall = mixHex(mixHex(STONE.deep, STONE.dark, 0.45), STONE.dark, lit)
  p.push()
  p.noStroke()
  p.fill(wall)
  poly(p, k, ROOM)
  // The trapdoor's shaft from the hall's floor down into the tunnel's roof.
  poly(p, k, [[-1.25, -7.4], [0.25, -7.4], [0.25, -0.95], [-1.25, -0.95]])
  // The shaft at the end, down to the drum (its lower half is the drum's chamber, which draws over it).
  poly(p, k, [[SHAFT[0], FLOOR_Y - 0.02], [SHAFT[1], FLOOR_Y - 0.02], [SHAFT[1], 8.3], [SHAFT[0], 8.3]])
  // The shaft is deep: darker as it goes down.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, (FLOOR_Y + 0.2) * k, 0, 4 * k)
  const deep = p.color(STONE.deep)
  const rgb = `${p.red(deep)},${p.green(deep)},${p.blue(deep)}`
  g.addColorStop(0, `rgba(${rgb},0)`)
  g.addColorStop(1, `rgba(${rgb},0.85)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(SHAFT[0] * k, (FLOOR_Y - 0.02) * k, (SHAFT[1] - SHAFT[0]) * k, (8.3 - FLOOR_Y) * k)
  // The tunnel runs on into the dark behind him: the rock closes over it.
  const h = ctx.createLinearGradient(-1.1 * k, 0, -4.4 * k, 0)
  const bg = p.color(c.bg)
  const brgb = `${p.red(bg)},${p.green(bg)},${p.blue(bg)}`
  h.addColorStop(0, `rgba(${brgb},0)`)
  h.addColorStop(1, `rgba(${brgb},1)`)
  ctx.fillStyle = h
  ctx.fillRect(-5.3 * k, -1.3 * k, 4.2 * k, (FLOOR_Y + 1.45) * k)
  ctx.restore()
  p.pop()
}

/* ------------------------------------------------------------------ light */

/** The light: the hall's through the trapdoor, a soft shaft falling on his cart; and every burning torch's pool. */
export function drawLight(p: p5, c: Pen, t: number): void {
  const k = c.k
  const b = beamLit(t)
  if (b > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const col = p.color(LAMP.glow)
    const rgb = `${p.red(col)},${p.green(col)},${p.blue(col)}`
    const g = ctx.createLinearGradient(0, -7.4 * k, 0, FLOOR_Y * k)
    g.addColorStop(0, `rgba(${rgb},0)`)
    g.addColorStop(0.12, `rgba(${rgb},${0.2 * b})`)
    g.addColorStop(1, `rgba(${rgb},${0.07 * b})`)
    ctx.save()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-1.2 * k, -7.4 * k)
    ctx.lineTo(0.2 * k, -7.4 * k)
    ctx.lineTo(0.45 * k, FLOOR_Y * k)
    ctx.lineTo(-1.45 * k, FLOOR_Y * k)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    glow(p, c, -0.5, 0.5, 1.5, 0.18 * b)
  }
  for (const tr of TORCHES) {
    const l = torchLit(tr, t)
    if (l <= 0.01) continue
    glow(p, c, tr.x + 0.15, tr.y - 0.35, 3.1 * Math.min(1, l), 0.2 * l)
  }
}

/* ------------------------------------------------------------------ the timbering */

const CAPS = [-1.5]
/** The roof over x, the chamber's ceiling (for where the timbering stops). */
function roofAt(x: number): number {
  if (x < ROOF[0][0]) return -1.08
  for (let i = 0; i + 1 < ROOF.length; i++) {
    const [x0, y0] = ROOF[i]
    const [x1, y1] = ROOF[i + 1]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return ROOF[ROOF.length - 1][1]
}

/** A squared timber from (x0, y0) to (x1, y1), `w` thick, lit where it stands. */
function beam(p: p5, c: Pen, x0: number, y0: number, x1: number, y1: number, w: number, light: number): void {
  const k = c.k
  const L = Math.hypot(x1 - x0, y1 - y0) || 1
  const nx = (-(y1 - y0) / L) * (w / 2)
  const ny = ((x1 - x0) / L) * (w / 2)
  p.stroke(inkIn(c, light * 0.8))
  p.strokeWeight(c.weight * 0.7)
  p.fill(shade(WORKS.timber, light, STONE.dark, 0.18))
  poly(p, k, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]])
}

/**
 * The square sets: a post at every set (the far post of each pair; the near half of the mine is cut away), the caps
 * seen end on at each level, and girts along the gallery between them, up to the roof. In the tunnel, one set
 * holding its low roof.
 */
export function drawTimbers(p: p5, c: Pen, t: number): void {
  const k = c.k
  p.push()
  p.rectMode(p.CORNER)
  const levels = [FLOOR_Y, ...CAPS]
  // Girts first (behind the posts), between neighbouring sets at each cap.
  for (let i = 0; i + 1 < SETS.length; i++) {
    const a = SETS[i]
    const b = SETS[i + 1]
    if (b - a > 3) continue
    for (const y of CAPS) {
      if (y < Math.max(roofAt(a), roofAt(b)) + 0.25) continue
      beam(p, c, a, y + 0.02, b, y + 0.02, 0.13, lightAt((a + b) / 2, y, t))
    }
    // The roof's girt, under the rock between the posts' heads.
    if (roofAt(a) < -1.8 && roofAt(b) < -1.8) beam(p, c, a, roofAt(a) + 0.1, b, roofAt(b) + 0.1, 0.13, lightAt((a + b) / 2, roofAt((a + b) / 2), t))
  }
  // The posts, each set up to the roof; the caps end on at every level.
  for (const x of SETS) {
    const roof = roofAt(x)
    for (let lv = 0; lv < levels.length; lv++) {
      const y0 = levels[lv]
      const y1 = lv + 1 < levels.length ? levels[lv + 1] : roof
      if (y1 >= y0 - 0.3) break
      const top = Math.max(y1, roof)
      const l = lightAt(x, (y0 + top) / 2, t)
      beam(p, c, x, y0, x, top + 0.02, 0.15, l)
      if ((lv + 1 < levels.length && levels[lv + 1] > roof + 0.25) || (lv + 1 === levels.length && roof < -1.8)) {
        const cy = lv + 1 < levels.length ? levels[lv + 1] : roof + 0.12
        const lc = lightAt(x, cy, t)
        p.stroke(inkIn(c, lc * 0.8))
        p.strokeWeight(c.weight * 0.7)
        p.fill(shade(WORKS.wood, lc, STONE.dark, 0.18))
        p.rect((x - 0.13) * k, (cy - 0.1) * k, 0.26 * k, 0.22 * k)
      }
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the torches */

/** A torch in a bracket on each set's post: dark until his wheel's spark catches it. */
export function drawTorches(p: p5, c: Pen, t: number): void {
  for (const tr of TORCHES) {
    const l = torchLit(tr, t)
    const light = Math.max(lightAt(tr.x, tr.y, t), 0.15)
    const pen: Pen = { ...c, ink: inkIn(c, light) }
    // The end wall's torch leans out from the rock, the others from their posts.
    const wallSide = tr.x > SHAFT[1] ? -1 : 1
    drawTorch(p, pen, tr.x + wallSide * 0.07, tr.y, { lit: Math.min(1, l), t, seed: tr.seed, side: wallSide, size: 0.36 })
  }
}

/* ------------------------------------------------------------------ the main line */

/** The rail's sections, from joint to joint: where he clacks (the notes), and the gallery's ends. */
const JOINTS: number[] = (() => {
  const out = CLACKS.map((c) => c.x)
  // Before the first note, and past the last, the rails run on in long lengths.
  for (let x = CLACKS[0].x - 1.6; x > -5.4; x -= 1.6) out.push(x)
  return out.sort((a, b) => a - b)
})()

/** The gallery's floor, sleepers, rails and their joints; the switch's blade and lever; the stop block; the shaft's collar. */
export function drawMainLine(p: p5, c: Pen, t: number): void {
  const k = c.k
  p.push()
  p.rectMode(p.CORNER)
  // The floor: a lit lip where the torchlight falls on it.
  p.noStroke()
  for (let x = -5.2; x < SHAFT[0]; x += 0.5) {
    const x1 = Math.min(SHAFT[0], x + 0.5)
    const l = lightAt(x + 0.25, FLOOR_Y, t)
    p.fill(shade(STONE.mid, l, STONE.dark, 0.1))
    p.rect(x * k, FLOOR_Y * k, (x1 - x + 0.01) * k, 0.07 * k)
  }
  for (const x0 of [SHAFT[1]]) {
    const l = lightAt(x0 + 0.2, FLOOR_Y, t)
    p.fill(shade(STONE.mid, l, STONE.dark, 0.1))
    p.rect(x0 * k, FLOOR_Y * k, (22.9 - x0) * k, 0.07 * k)
  }
  // Sleepers, end on.
  for (let x = -5.0; x < STOP_X + 0.1; x += 0.42) {
    const l = lightAt(x, RAIL, t)
    p.fill(shade(WORKS.wood, l, STONE.dark, 0.15))
    p.rect((x - 0.12) * k, (RAIL + 0.035) * k, 0.24 * k, (FLOOR_Y - RAIL - 0.02) * k)
  }
  // The rail, in lengths from joint to joint: a small gap and a fishplate at each joint.
  const ends = [-5.2, ...JOINTS.filter((x) => x > -5.2 && x < STOP_X), STOP_X + 0.15]
  for (let i = 0; i + 1 < ends.length; i++) {
    const a = ends[i] + (i > 0 ? 0.012 : 0)
    const b = ends[i + 1] - (i + 1 < ends.length - 1 ? 0.012 : 0)
    const l = lightAt((a + b) / 2, RAIL, t)
    p.fill(shade(WORKS.iron, l, STONE.dark, 0.2))
    p.rect(a * k, RAIL * k, (b - a) * k, 0.055 * k)
    p.fill(shade(WORKS.steel, l, STONE.dark, 0.25))
    p.rect(a * k, RAIL * k, (b - a) * k, 0.016 * k)
  }
  for (const x of JOINTS) {
    if (x < -5.2 || x > STOP_X) continue
    const l = lightAt(x, RAIL, t)
    p.fill(shade(WORKS.iron, l * 0.8, STONE.dark, 0.2))
    p.rect((x - 0.06) * k, (RAIL + 0.022) * k, 0.12 * k, 0.03 * k)
  }
  // The stop block at the end of the line, iron-shod, bolted down at the shaft's lip.
  {
    const l = lightAt(STOP_X, RAIL - 0.2, t)
    const ink = inkIn(c, l)
    p.stroke(ink)
    p.strokeWeight(c.weight)
    p.fill(shade(WORKS.timber, l, STONE.dark, 0.18))
    p.rect(STOP_X * k, (RAIL - 0.32) * k, 0.2 * k, (FLOOR_Y - RAIL + 0.32) * k)
    p.fill(shade(WORKS.iron, l, STONE.dark, 0.2))
    p.rect((STOP_X - 0.02) * k, (RAIL - 0.3) * k, 0.06 * k, 0.12 * k)
  }
  // The shaft's collar: heavy timbers at its lips.
  for (const x of [SHAFT[0], SHAFT[1]]) {
    const l = lightAt(x, FLOOR_Y, t)
    beam(p, c, x + (x === SHAFT[0] ? 0.08 : -0.08), FLOOR_Y - 0.02, x + (x === SHAFT[0] ? 0.08 : -0.08), FLOOR_Y + 1.4, 0.16, l * 0.8)
  }
  p.pop()
}

/** The lever's pose: its pivot, its crank below and its head, at `t`. */
function leverPose(t: number): { la: number; pivot: Pt; crank: Pt; top: Pt } {
  const la = leverAngle(t)
  const L = 0.78
  const pivot: Pt = [LEVER_X, RAIL + 0.02]
  return { la, pivot, crank: [pivot[0] - Math.sin(la) * 0.16, pivot[1] + Math.cos(la) * 0.16], top: [pivot[0] + Math.sin(la) * L, pivot[1] - Math.cos(la) * L] }
}

/** The switch's blade hinged in the main line, and the rod the lever lifts it by. Behind the carts. */
export function drawSwitch(p: p5, c: Pen, t: number): void {
  const k = c.k
  const a = bladeAngle(t)
  const tip: Pt = [X_F + BLADE_L * Math.cos(a), RAIL - BLADE_L * Math.sin(a)]
  const l = Math.max(0.3, lightAt(X_F + 0.5, RAIL, t))
  const ink = inkIn(c, l)
  const { crank } = leverPose(t)
  p.push()
  // The rod, from the lever's crank back to the blade's tip.
  p.stroke(shade(WORKS.iron, l, STONE.dark, 0.35))
  p.strokeWeight(c.weight * 1.5)
  p.line(crank[0] * k, crank[1] * k, (tip[0] - 0.02) * k, (tip[1] + 0.06) * k)
  // The blade: a length of rail on a hinge pin, bright where the wheels have worn it.
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.8)
  p.fill(shade(WORKS.steel, l, STONE.dark, 0.4))
  const n: Pt = [Math.sin(a) * 0.07, Math.cos(a) * 0.07]
  poly(p, k, [[X_F, RAIL], tip, [tip[0] + n[0], tip[1] + n[1]], [X_F + n[0], RAIL + n[1]]])
  p.noStroke()
  p.fill(ink)
  p.circle(X_F * k, (RAIL + 0.035) * k, 0.08 * k)
  p.pop()
}

/**
 * The switch lever: a tall iron bar on a stand beside the rail, an iron weight at its head. Standing, it holds the
 * blade down; his wheel presses its latch's pedal as he passes, and it topples back toward the trolls, its crank
 * lifting the blade behind him. Behind the carts (he passes in front of it).
 */
export function drawLever(p: p5, c: Pen, t: number): void {
  const k = c.k
  const { la, pivot, crank, top } = leverPose(t)
  const lk = Math.max(0.4, lightAt(LEVER_X, RAIL - 0.4, t))
  const lin = inkIn(c, lk)
  p.push()
  p.stroke(lin)
  p.strokeWeight(c.weight * 2.4)
  p.line(crank[0] * k, crank[1] * k, top[0] * k, top[1] * k)
  p.stroke(shade(WORKS.steel, lk, STONE.dark, 0.35))
  p.strokeWeight(c.weight * 1.1)
  p.line(crank[0] * k, crank[1] * k, top[0] * k, top[1] * k)
  p.push()
  p.translate(top[0] * k, top[1] * k)
  p.rotate(la)
  p.stroke(lin)
  p.strokeWeight(c.weight * 0.9)
  p.fill(shade(WORKS.iron, lk, STONE.dark, 0.35))
  p.rectMode(p.CENTER)
  p.rect(0, -0.03 * k, 0.26 * k, 0.18 * k, 0.025 * k)
  p.pop()
  // Its stand, bolted to the sleepers.
  p.stroke(lin)
  p.strokeWeight(c.weight * 0.8)
  p.fill(shade(WORKS.iron, lk, STONE.dark, 0.35))
  poly(p, k, [[pivot[0] - 0.13, FLOOR_Y + 0.04], [pivot[0] + 0.13, FLOOR_Y + 0.04], [pivot[0] + 0.05, pivot[1] - 0.04], [pivot[0] - 0.05, pivot[1] - 0.04]])
  p.noStroke()
  p.fill(lin)
  p.circle(pivot[0] * k, pivot[1] * k, 0.05 * k)
  // The latch's pedal on the rail, pressed flat as his wheel goes over it.
  const press = t >= TRIP ? 1 : 0
  p.fill(shade(WORKS.steel, lk, STONE.dark, 0.35))
  poly(p, k, [[LEVER_X - 0.14, RAIL + 0.005], [LEVER_X + 0.1, RAIL + 0.005], [LEVER_X + 0.1, RAIL - 0.05 * (1 - press) - 0.005]])
  p.pop()
}

/** The ramp's rail height at x: up the blade, then up the catch siding. */
function rampY(x: number): number {
  const up: Pt = [X_F + BLADE_L * Math.cos(BLADE_UP), RAIL - BLADE_L * Math.sin(BLADE_UP)]
  if (x <= up[0]) return RAIL - (x - X_F) * Math.tan(BLADE_UP)
  return up[1] - (x - up[0]) * Math.tan(SIDING_UP)
}

/**
 * The catch siding, behind the main line: a planked timber ramp rising from the blade's tip to a heavy buffer, rails
 * along its top. A runaway (or a troll) sent up it is stopped dead there.
 */
export function drawSiding(p: p5, c: Pen, t: number): void {
  const k = c.k
  const up: Pt = [X_F + BLADE_L * Math.cos(BLADE_UP), RAIL - BLADE_L * Math.sin(BLADE_UP)]
  const end = SIDING_END
  const l = Math.max(0.15, lightAt((up[0] + end[0]) / 2, (up[1] + end[1]) / 2, t))
  const ink = inkIn(c, l * 0.85)
  p.push()
  // The spoil heaped against the buffer's back: broken rock, the waste of the dig.
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.7)
  p.fill(shade(STONE.mid, l * 0.8, STONE.dark, 0.2))
  const hx = end[0] + 0.25
  poly(p, k, [
    [hx - 0.1, FLOOR_Y], [hx - 0.1, end[1] - 0.2], [hx + 0.15, end[1] - 0.42], [hx + 0.42, end[1] - 0.18], [hx + 0.72, end[1] + 0.2], [hx + 1.05, FLOOR_Y],
  ])
  p.noStroke()
  for (let i = 0; i < 6; i++) {
    const x = hx + 0.05 + 0.8 * hash(i, 17, 1)
    const y = FLOOR_Y - 0.12 - (end[1] < 0 ? 0 : 0) - 0.55 * hash(i, 17, 2) * (1 - (x - hx) / 1.1)
    const r = 0.05 + 0.05 * hash(i, 17, 3)
    const aa = hash(i, 17, 4) * 6
    p.fill(shade(i % 2 ? STONE.light : STONE.dark, l * 0.8, STONE.dark, 0.2))
    poly(p, k, [0, 1, 2, 3].map((q) => [x + Math.cos(aa + q * 1.6) * r, y + Math.sin(aa + q * 1.6) * r * 0.75] as Pt))
  }
  // The ramp: timber, planked, standing on the floor under its rails.
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.8)
  p.fill(shade(WORKS.wood, l, STONE.dark, 0.18))
  const x0 = X_F + 0.12
  poly(p, k, [[x0, FLOOR_Y], [x0, rampY(x0) + 0.07], [up[0], up[1] + 0.07], [end[0] + 0.02, end[1] + 0.07], [end[0] + 0.02, FLOOR_Y]])
  p.stroke(shade(mixHex(WORKS.wood, WORKS.iron, 0.5), l, STONE.dark, 0.18))
  p.strokeWeight(c.weight * 0.55)
  for (let x = x0 + 0.3; x < end[0]; x += 0.3) p.line(x * k, (rampY(x) + 0.1) * k, x * k, (FLOOR_Y - 0.02) * k)
  // Its rails.
  p.noStroke()
  p.fill(shade(WORKS.iron, l, STONE.dark, 0.2))
  const nn: Pt = [Math.sin(SIDING_UP) * 0.06, Math.cos(SIDING_UP) * 0.06]
  poly(p, k, [up, end, [end[0] + nn[0], end[1] + nn[1]], [up[0] + nn[0], up[1] + nn[1]]])
  p.fill(shade(WORKS.steel, l, STONE.dark, 0.3))
  poly(p, k, [up, end, [end[0] + nn[0] * 0.3, end[1] + nn[1] * 0.3], [up[0] + nn[0] * 0.3, up[1] + nn[1] * 0.3]])
  p.pop()
}

/** The buffer at the siding's end: a heavy squared block, iron-bound, standing on the ramp. Drawn in front of the trolls' cart. */
export function drawBuffer(p: p5, c: Pen, t: number): void {
  const k = c.k
  const [ex, ey] = SIDING_END
  const l = Math.max(0.15, lightAt(ex, ey - 0.3, t))
  const ink = inkIn(c, l)
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.fill(shade(WORKS.timber, l, STONE.dark, 0.18))
  // Its post, down through the ramp to the floor, and the block across the rails at a cart's bumper height.
  p.rect((ex + 0.04) * k, (ey - 0.5) * k, 0.16 * k, (FLOOR_Y - ey + 0.5) * k)
  p.rect((ex - 0.04) * k, (ey - 0.42) * k, 0.34 * k, 0.3 * k)
  p.noStroke()
  p.fill(shade(WORKS.iron, l, STONE.dark, 0.25))
  p.rect((ex - 0.04) * k, (ey - 0.33) * k, 0.34 * k, 0.06 * k)
  p.pop()
}

/* ------------------------------------------------------------------ small things that fly */

/** The chock under his front wheel, knocked out as he lands on the cart: it tumbles out and lies by the rail. */
export function drawChock(p: p5, c: Pen, t: number): void {
  const k = c.k
  const x0 = -0.5 + 0.32 + 0.16
  const y0 = RAIL - 0.05
  const d = Math.max(0, t - LAND)
  const T = 0.34
  const u = Math.min(d, T)
  const x = x0 + 1.05 * u
  const y = y0 - 1.5 * u + 6 * u * u
  const yRest = FLOOR_Y + 0.05
  const at: Pt = d < T ? [x, Math.min(y, yRest)] : [x0 + 1.05 * T + 0.12 * (1 - Math.exp(-(d - T) / 0.1)), yRest]
  const spin = d < T ? d * 14 : T * 14 + 0.6
  const l = Math.max(0.2, lightAt(at[0], at[1], t))
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(d > 0 ? spin : 0)
  p.stroke(inkIn(c, l))
  p.strokeWeight(c.weight * 0.7)
  p.fill(shade(WORKS.timber, l, STONE.dark, 0.2))
  poly(p, k, [[-0.08, 0.05], [0.08, 0.05], [0.08, -0.05]])
  p.pop()
}

interface Spark {
  t0: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

/** The sparks: a spray off his front wheel at each loud clack, and at the stop; one flies up into each torch as it catches. */
const SPARKS: Spark[] = (() => {
  const out: Spark[] = []
  for (const [i, cl] of CLACKS.entries()) {
    if (cl.s < 1.0 && !TORCHES.some((tr) => tr.t === cl.t)) continue
    const v = peerCartSpeed(cl.t)
    const n = 3 + Math.round(Math.min(3, cl.s))
    for (let j = 0; j < n; j++) {
      out.push({
        t0: cl.t,
        x: cl.x,
        y: RAIL - 0.02,
        vx: v * 0.3 - 0.6 - 1.4 * hash(i, j, 21),
        vy: -1.1 - 1.8 * hash(i, j, 22),
        life: 0.2 + 0.22 * hash(i, j, 23),
      })
    }
  }
  // The stop: iron on iron.
  for (let j = 0; j < 9; j++) {
    out.push({ t0: STOP, x: STOP_X, y: RAIL - 0.12, vx: -0.4 + 2.6 * hash(j, 5, 24), vy: -1.2 - 2.4 * hash(j, 5, 25), life: 0.2 + 0.25 * hash(j, 5, 26) })
  }
  return out
})()

export function drawSparks(p: p5, c: Pen, t: number): void {
  const k = c.k
  p.push()
  p.strokeCap(p.ROUND)
  for (const s of SPARKS) {
    const d = t - s.t0
    if (d < 0 || d > s.life) continue
    const x = s.x + s.vx * d
    const y = s.y + s.vy * d + 6 * d * d
    const f = 1 - d / s.life
    const col = p.color(f > 0.5 ? LAMP.core : LAMP.flame)
    col.setAlpha(255 * Math.min(1, f * 1.4))
    p.stroke(col)
    p.strokeWeight(Math.max(1.2, 0.03 * k))
    p.line(x * k, y * k, (x - s.vx * 0.04) * k, (y - (s.vy + 12 * d) * 0.04) * k)
  }
  // The ember that catches each torch: from his wheel up to the torch's head, in a tenth of a second.
  for (const tr of TORCHES) {
    const d = t - tr.t
    if (d < 0 || d > 0.14 || tr.x > SHAFT[1]) continue
    const from: Pt = [peerCartX(tr.t) + 0.32, RAIL - 0.05]
    const to: Pt = [tr.x + 0.2, tr.y - 0.3]
    const u = Math.min(1, d / 0.1)
    const x = from[0] + (to[0] - from[0]) * u
    const y = from[1] + (to[1] - from[1]) * u - 0.25 * Math.sin(u * Math.PI)
    const col = p.color(LAMP.core)
    col.setAlpha(255 * (1 - Math.max(0, d - 0.1) / 0.04))
    p.stroke(col)
    p.strokeWeight(Math.max(1.2, 0.03 * k))
    const b = Math.max(0, u - 0.25)
    const bx = from[0] + (to[0] - from[0]) * b
    const by = from[1] + (to[1] - from[1]) * b - 0.25 * Math.sin(b * Math.PI)
    p.line(bx * k, by * k, x * k, y * k)
  }
  p.pop()
}

/** Ore spilling from the tipped bin into the shaft: a few broken lumps and a speck of gold, lost in the dark as they fall. */
export function drawSpill(p: p5, c: Pen, t: number): void {
  const k = c.k
  if (t < STOP || t > STOP + 2.2) return
  p.push()
  p.noStroke()
  for (let i = 0; i < 7; i++) {
    const t0 = STOP + 0.16 + 0.07 * i + 0.05 * hash(i, 9, 1)
    const d = t - t0
    if (d < 0) continue
    const lip = binLip(CX_STOP, Math.min(0.95, binTip(t0)))
    const x = lip[0] + 0.05 + (0.35 + 0.9 * hash(i, 9, 2)) * d
    const y = lip[1] - 0.05 + (0.2 * hash(i, 9, 3) - 0.3) * d + 6 * d * d
    const dark = clamp01((y - 1.6) / 2.6)
    if (dark >= 1) continue
    const l = Math.max(0.2, lightAt(x, y, t)) * (1 - dark)
    const col = i === 3 ? GOLD : i % 2 ? STONE.light : STONE.mid
    const cc = p.color(shade(col, l, STONE.dark, 0.2))
    cc.setAlpha(255 * (1 - dark))
    p.fill(cc)
    const r = 0.045 + 0.04 * hash(i, 9, 4)
    const a = d * (6 + 8 * hash(i, 9, 5))
    poly(p, k, [0, 1, 2, 3].map((q) => [x + Math.cos(a + q * 1.6) * r, y + Math.sin(a + q * 1.6) * r * 0.8] as Pt))
  }
  p.pop()
}
