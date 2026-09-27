import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, hash, knock } from '../kit'
import { drawTorch, flicker, glow } from '../lantern'
import { drip, hollow, stalactite } from '../rock'
import type { Pen } from '../troll'
import { LAMP, SKY, STONE } from '../worlds'
import {
  BARS, BEGIN, CUP_DRIPS, CUP_TIP, DOOR_X0, DRIPS, E, FRONTS, G1, G2, LAMPS, RAMP0, RAMP1, SHOWERS, STEPS, T2_X0, T2_X1, T3_X0, T3_X1, XYLO,
  Y_DOOR, Y_T2, Y_T3, barTop, barX, fillet, gutterAt, litOf, reached, tipY, tread, type Front, type Gutter,
} from './deep-plan'

/**
 * The tunnels' rock, light, water and fire (the part's own frame). The machines themselves are `deep-works.ts`.
 *
 * The tunnel is one hollow cut down through the rock from the gate's threshold to the hall's west door: an upper
 * gallery with the drip xylophone on its shelf, the drop to the lever's terrace, the wheel's pit with its sump, the
 * hammer's ledge, and the stair down to the door. It is dark (a step above the rock, and the gate's moonlight at its
 * mouth) until the lanterns catch; each throws its pool on the wall behind, and everything near it takes its light.
 */

/* ------------------------------------------------------------------ light */

/**
 * The wheel's torch. The upper gutter ends at the flume's head; from there a runnel cut in the wall runs on, down
 * over the wheel's top, to a torch in an iron bracket over the pit. The flame that came back along the gutter from
 * the slam runs on down it, gathering speed downhill, and the torch catches on E(26) (29.51, a sounded note) as he
 * rolls out onto the flume: the wheel, its buckets, the rider and the hammer's tail and bar are in its light from
 * then on, before the hammer's own lantern lights on the first blow. (Not a strike of the part's: a light of the
 * set's, landing on the note.)
 */
const RUNNEL_PTS: Pt[] = [[7.25, 0.75], [8.2, 0.98], [9.35, 1.8], [10.32, 2.89]]
const RUNNEL: Gutter = (() => {
  const s = [0]
  for (let i = 1; i < RUNNEL_PTS.length; i++) s.push(s[i - 1] + Math.hypot(RUNNEL_PTS[i][0] - RUNNEL_PTS[i - 1][0], RUNNEL_PTS[i][1] - RUNNEL_PTS[i - 1][1]))
  return { pts: RUNNEL_PTS, s }
})()
const WHEEL_TORCH = { at: [10.4, 2.9] as Pt, catch: E(26), seed: 10, size: 0.44 }
/** Where its flame burns (the torch's cup is half its size out from the foot and nearly its size up). */
const WHEEL_FLAME: Pt = [WHEEL_TORCH.at[0] + WHEEL_TORCH.size * 0.5, WHEEL_TORCH.at[1] - WHEEL_TORCH.size * 1.15]
const wheelLit = (t: number): number => {
  const u = Math.max(0, Math.min(1, (t - WHEEL_TORCH.catch) / 0.35))
  return u * u * (3 - 2 * u)
}
/** The runnel's front: from the gutter's end (as the gutter's own front reaches it) to the torch, speeding up downhill. */
const RUNNEL_FRONT: Front = (() => {
  const L = RUNNEL.s[RUNNEL.s.length - 1]
  const t0 = LAMPS[3].catch + 0.2
  const t1 = WHEEL_TORCH.catch
  return { g: RUNNEL, keys: [[t0, 0], [t0 + 0.45 * (t1 - t0), 0.28 * L], [t0 + 0.75 * (t1 - t0), 0.62 * L], [t1, L]] }
})()

/** A burning light's pool on the wall: where it centres, how lit it is, and how far its light reaches. */
interface Light {
  x: number
  y: number
  lit: number
  /** The pool's reach, cells, and how far it lifts the wall to lit stone at its middle. */
  r: number
  wall: number
  /** A broad pool (a big flame over a pit) keeps its light further out. */
  broad?: boolean
  seed: number
}
/** Every burning light of the tunnels at t. */
function lights(t: number): Light[] {
  const out: Light[] = []
  for (const l of LAMPS) {
    const lit = litOf(l, t)
    if (lit > 0) out.push({ x: l.at[0] + (l.hang > 0 ? 0 : 0.17), y: l.at[1] + (l.hang > 0 ? 0.3 : -0.3), lit, r: 4.2, wall: 0.62, seed: l.seed })
  }
  // The flame running down the runnel carries its own light with it, the chase seen on the wall.
  const [t0, t1] = [RUNNEL_FRONT.keys[0][0], RUNNEL_FRONT.keys[RUNNEL_FRONT.keys.length - 1][0]]
  if (t > t0 && t < t1 + 0.35) {
    const u = Math.min(1, (t - t0) / (t1 - t0))
    const keys = RUNNEL_FRONT.keys
    let s = keys[keys.length - 1][1]
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        s = keys[i - 1][1] + ((keys[i][1] - keys[i - 1][1]) * (t - keys[i - 1][0])) / (keys[i][0] - keys[i - 1][0])
        break
      }
    }
    const [x, y] = gutterAt(RUNNEL, s)
    const a = Math.min(1, u * 4) * (1 - wheelLit(t))
    if (a > 0) out.push({ x, y: y - 0.1, lit: 0.75 * a, r: 3.2, wall: 0.62, seed: 12 })
  }
  const w = wheelLit(t)
  // The wheel's torch burns bigger (a fat pine torch over a pit) and lights the pit down to the landing.
  // Its pool hangs a little under the flame: the light falls into the pit, not up on the roof.
  if (w > 0) out.push({ x: WHEEL_FLAME[0] - 0.2, y: WHEEL_FLAME[1] + 0.9, lit: w, r: 6.4, wall: 0.8, broad: true, seed: WHEEL_TORCH.seed })
  return out
}

/** How lit a point is at show time t: the gate's cool light near the mouth, and every lantern that has caught. */
export function lightAt(x: number, y: number, t: number): number {
  let v = 0.05 + 0.3 * Math.max(0, 1 - (x + 0.8) / 4.6) * Math.max(0, 1 - Math.abs(y + 0.8) / 4)
  for (const l of LAMPS) {
    const lit = litOf(l, t)
    if (lit <= 0) continue
    const d = Math.hypot(x - l.at[0], y - l.at[1] - 0.2)
    v += lit * 0.9 * Math.pow(Math.max(0, 1 - d / 4.2), 1.4)
  }
  const w = wheelLit(t)
  if (w > 0) v += w * 0.95 * Math.pow(Math.max(0, 1 - Math.hypot(x - WHEEL_FLAME[0], y - WHEEL_FLAME[1]) / 5.8), 1.2)
  return Math.min(1, v)
}

/** A stone colour at a light level: from the rock's dark to its lit face. */
export const stoneAt = (lit: number, hi = STONE.light): string => mixHex(STONE.dark, hi, 0.12 + 0.72 * lit)
/**
 * The edge at a light level: the shadow of what it edges, darker than any lit stone or timber, sinking into the dark
 * with the things it draws. (It was the page's cream, up to four-fifths of it: the slabs, the beam and the wheel read
 * as pale line art. `ink` is kept for the callers' signature.)
 */
const EDGE = mixHex(STONE.deep, '#000000', 0.2)
export const inkAt = (_ink: string, lit: number): string => mixHex(STONE.dark, EDGE, 0.35 + 0.65 * Math.max(0, Math.min(1, lit)))

/* ------------------------------------------------------------------ the hollow */

/** The roof, west to east (the hammer's ledge is part of the east wall). */
const ROOF: Pt[] = [
  [-0.6, -2.3], [-0.1, -2.75], [0.9, -2.95], [2.2, -3.0], [3.4, -2.8], [4.5, -2.35], [5.3, -1.95], [6.3, -1.45], [7.3, -0.55], [8.4, 0.25],
  [9.8, 0.42], [10.8, 0.9], [11.2, 2.3], [11.55, 2.95], [11.95, 2.35], [12.4, 1.1], [13.7, 0.7], [14.3, 1.3], [14.6, 2.5], [14.55, 4.12], [12.72, 4.12], [12.8, 4.5], [14.3, 4.9],
  [15.2, 6.2], [16.2, 7.8], [16.9, 8.75], [17.4, 9.15], [18.4, 9.15],
]
/** The roof's height at x (the lowest roof point over it, for stalactites and hangers). */
export function roofY(x: number): number {
  for (let i = 1; i < 18; i++) {
    const [x0, y0] = ROOF[i - 1]
    const [x1, y1] = ROOF[i]
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return ROOF[0][1]
}

/** The walking surfaces' tops (a ball on them has its centre R higher). */
const UPPER: Pt[] = fillet([[-0.6, 0], RAMP0, RAMP1]).map(([x, y]) => [x, y + R] as Pt)
const STAIR: Pt[] = (() => {
  const out: Pt[] = [[T3_X0, Y_T3 + R], [T3_X1, Y_T3 + R]]
  for (let i = 1; i < STEPS; i++) {
    const s = tread(i)
    out.push([s.x0, s.y + R], [s.x1, s.y + R])
  }
  out.push([DOOR_X0, Y_DOOR + R], [18.4, Y_DOOR + R])
  return out
})()
/** The wheel's pit under the terrace's end, down to its sump and up to the landing. */
const PIT: Pt[] = [[T2_X1, 2.83], [T2_X1, 3.25], [6.75, 4.2], [6.65, 5.8], [6.7, 7.4], [7.3, 7.85], [10.6, 7.85], [11.15, 7.45], [10.95, 6.9], [T3_X0, Y_T3 + R]]

const OUTLINE: Pt[] = [
  ...ROOF,
  [18.4, Y_DOOR + R],
  ...[...STAIR].reverse(),
  ...[...PIT].reverse(),
  [T2_X0, Y_T2 + R],
  [RAMP1[0] + 0.02, RAMP1[1] + R],
  ...[...UPPER].reverse(),
]

/**
 * Before the gate opens the tunnels are solid rock to anyone looking (the opening's wide shot sees the whole flank):
 * they come out of the dark as Peer reaches the threshold. Drawn last, over the whole hollow.
 */
export function unseen(p: p5, c: Pen, T: number): void {
  const a = 1 - Math.max(0, Math.min(1, (T - (BEGIN - 3)) / 2.6))
  if (a <= 0.002) return
  const k = c.k
  p.push()
  p.noStroke()
  p.fill(alpha(p, STONE.deep, a))
  p.beginShape()
  for (const [x, y] of COVER) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  // And the room's middle whole (the hammer's bar and the flume's trestle reach past the hollow into the rock),
  // clear of the gate's mouth (x < 1) and the hall's wall (x > 16), which are theirs to keep dark.
  p.rectMode(p.CORNER)
  p.rect(1 * k, -3.9 * k, 15 * k, 16.9 * k)
  p.pop()
}
/** The hollow and the floors' rims under it: the roof as it is, everything else half a cell lower. */
const COVER: Pt[] = OUTLINE.map(([x, y], i) => (i < ROOF.length ? [x, y - 0.1] : [x, y + 0.5]) as Pt)

/** A floor's rim: a band of lit stone under its top line, and the lip along it. */
export function rim(p: p5, c: Pen, pts: Pt[], depth: number, lit: number): void {
  const k = c.k
  p.push()
  p.noStroke()
  p.fill(stoneAt(lit * 0.8, STONE.mid))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  for (let i = pts.length - 1; i >= 0; i--) p.vertex(pts[i][0] * k, (pts[i][1] + depth * (0.82 + 0.18 * Math.sin(pts[i][0] * 1.7))) * k)
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(stoneAt(lit))
  p.strokeWeight(Math.max(1, 0.055 * k))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
  p.pop()
}

/** The back wall where a flame lights it: the lit stone, a little warm (the pool's amber goes over it). */
const WALL_LIT = mixHex(STONE.mid, LAMP.glow, 0.1)

/**
 * The wall's own light round a flame: the hollow's dark lifted to lit stone near it, falling off to nothing at `r`.
 * Pools that overlap add up towards the lit stone, never past it. (A raw gradient in its own save/restore, so p5's
 * cached fill stays true.)
 */
function wallPool(p: p5, c: Pen, x: number, y: number, r: number, a: number, broad = false): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cx = x * c.k
  const cy = y * c.k
  const R = r * c.k
  const col = p.color(WALL_LIT)
  const rgb = `${p.red(col)},${p.green(col)},${p.blue(col)}`
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(0.25, `rgba(${rgb},${a * (broad ? 0.95 : 0.8)})`)
  g.addColorStop(0.55, `rgba(${rgb},${a * (broad ? 0.66 : 0.38)})`)
  if (broad) g.addColorStop(0.8, `rgba(${rgb},${a * 0.26})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** The rock: the hollow, the lanterns' pools and the gate's light on its walls, and the floors. */
export function drawRock(p: p5, c: Pen, T: number): void {
  hollow(p, c, OUTLINE, 0)
  // The light falls on the cave's walls, not on the rock it is cut in: every pool is clipped to the hollow.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  OUTLINE.forEach(([x, y], i) => (i ? ctx.lineTo(x * c.k, y * c.k) : ctx.moveTo(x * c.k, y * c.k)))
  ctx.closePath()
  ctx.clip()
  // The gate's summer-night light, cool and faint, at the tunnel's mouth.
  glow(p, c, -0.9, -0.7, 4.2, 0.16, mixHex(SKY.dusk, STONE.wet, 0.5))
  const ls = lights(T)
  // Each burning flame lifts the wall round it to lit stone (the dark before the slam has none: nothing burns yet),
  for (const l of ls) wallPool(p, c, l.x, l.y, l.r, l.wall * l.lit, l.broad)
  // and its amber pool goes over that.
  for (const l of ls) glow(p, c, l.x, l.y, l.r * 0.93, 0.42 * l.lit * flicker(T, l.seed), LAMP.glow)
  ctx.restore()
}

export function drawFloors(p: p5, c: Pen, T: number): void {
  rim(p, c, UPPER, 0.4, lightAt(1, 0.3, T))
  rim(p, c, [[T2_X0, Y_T2 + R], [T2_X1, Y_T2 + R]], 0.42, lightAt(5.2, 2.6, T))
  rim(p, c, STAIR.slice(0, 2), 0.36, lightAt(11.6, 6, T))
  for (let i = 1; i < STEPS; i++) {
    const s = tread(i)
    rim(p, c, [[s.x0, s.y + R], [s.x1, s.y + R]], 0.3, lightAt(s.mid, s.y, T))
  }
  rim(p, c, [[DOOR_X0, Y_DOOR + R], [18.4, Y_DOOR + R]], 0.4, lightAt(17, 11.6, T))
  // The sump under the wheel: dark water, its surface a faint sheen.
  const k = c.k
  p.push()
  p.noStroke()
  p.fill(mixHex(STONE.deep, STONE.wet, 0.12 + 0.1 * lightAt(8.9, 7.5, T)))
  p.beginShape()
  for (const [x, y] of [[6.78, 7.5], [11.02, 7.5], [10.6, 7.85], [7.3, 7.85]] as Pt[]) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, STONE.wet, 0.18 + 0.35 * lightAt(8.9, 7.3, T)))
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.line(6.8 * k, 7.5 * k, 11.0 * k, 7.5 * k)
  p.pop()
}

/* ------------------------------------------------------------------ drips and the xylophone */

/** How hard bar i is ringing at t (0..1): each drip knocks it, and it rings down. */
export function ring(i: number, T: number): number {
  let r = 0
  for (const d of DRIPS) if (d.bar === i && d.at <= T && T - d.at < 1) r = Math.max(r, knock(T - d.at, 0.22))
  return r
}

export function drawXylophone(p: p5, c: Pen, T: number): void {
  const k = c.k
  const lit = lightAt(1.6, -1.2, T)
  // The shelf the slabs stand on: a lip of rock out of the gallery's wall (its edge is the gutter, drawn with the fire).
  rim(p, c, [[-0.55, XYLO.shelf], [3.55, XYLO.shelf]], 0.26, lit * 0.8)
  // The stalactites over the slabs, each dripping its note.
  for (let i = 0; i < BARS; i++) {
    const x = barX(i)
    const y0 = roofY(x)
    stalactite(p, c, x, y0 - 0.05, tipY(i) - y0 + 0.05, 0.19 + 0.05 * Math.sin(i * 1.3), lightAt(x, tipY(i), T), i)
  }
  // The slabs: standing stones, tallest on the left; each rings when its drip lands (it sways, and its wet face shines).
  for (let i = 0; i < BARS; i++) {
    const x = barX(i)
    const r = ring(i, T)
    const top = barTop(i)
    const w = XYLO.w * (1.08 - (0.16 * i) / (BARS - 1)) * (1 + 0.06 * Math.sin(i * 4.1))
    const sway = 0.018 * r * Math.sin((T - i * 0.03) * 55)
    const l = Math.max(lit, lightAt(x, top, T))
    p.push()
    p.stroke(inkAt(c.ink, l))
    p.strokeWeight(c.weight * 0.7)
    p.fill(mixHex(stoneAt(l * 0.85, STONE.mid), STONE.wet, 0.1 + 0.5 * r))
    // A cut slab: square-shouldered, its top a little out of true, its corners knocked off.
    const tl = top + 0.025 * Math.sin(i * 2.7 + 1)
    const tr = top - 0.025 * Math.sin(i * 2.7 + 1)
    const ch = 0.035
    p.beginShape()
    p.vertex((x - w / 2) * k, XYLO.shelf * k)
    p.vertex((x - w / 2 + sway * 0.9) * k, (tl + ch) * k)
    p.vertex((x - w / 2 + ch + sway) * k, tl * k)
    p.vertex((x + w / 2 - ch + sway) * k, tr * k)
    p.vertex((x + w / 2 + sway * 0.9) * k, (tr + ch) * k)
    p.vertex((x + w / 2) * k, XYLO.shelf * k)
    p.endShape(p.CLOSE)
    // Its crown catches the light; a struck slab's wet crown and face shine.
    p.noFill()
    p.stroke(stoneAt(l, STONE.light))
    p.strokeWeight(Math.max(1, 0.03 * k))
    p.line((x - w / 2 + ch + sway) * k, (tl + 0.02) * k, (x + w / 2 - ch + sway) * k, (tr + 0.02) * k)
    if (r > 0.02) {
      p.noFill()
      p.stroke(alpha(p, STONE.wet, 0.95 * r))
      p.strokeWeight(Math.max(1, 0.035 * k))
      p.line((x - w * 0.3 + sway) * k, (tl + 0.03) * k, (x + w * 0.3 + sway) * k, (tr + 0.03) * k)
      p.stroke(alpha(p, STONE.wet, 0.4 * r))
      p.line((x - w * 0.18 + sway * 0.6) * k, (top + 0.12) * k, (x - w * 0.2) * k, (XYLO.shelf - 0.08) * k)
    }
    p.pop()
  }
  // The drips: each lands on its slab on its note.
  for (const d of DRIPS) {
    if (d.at < T - 0.4 || d.at > T + 1.3) continue
    const x = barX(d.bar)
    drip(p, c, x, tipY(d.bar), barTop(d.bar) - tipY(d.bar), d.at, T)
  }
}

/** The cup's stalactite, and its drips: into the cup while it is level, onto the terrace (the runnel) once it has tipped. */
export function drawCupDrips(p: p5, c: Pen, T: number, cupWater: (t: number) => number): void {
  const [x, tip] = CUP_TIP
  const y0 = roofY(x)
  stalactite(p, c, x, y0 - 0.05, tip - y0 + 0.05, 0.3, lightAt(x, tip, T), 17)
  for (const at of CUP_DRIPS) {
    if (at < T - 0.4 || at > T + 1.3) continue
    drip(p, c, x, tip, cupWater(at) - tip, at, T)
  }
}

/* ------------------------------------------------------------------ fire */

/** A gutter: a narrow shelf cut along the wall, its lip lit, oil in its channel. */
function drawGutter(p: p5, c: Pen, g: Gutter, T: number): void {
  const mid = g.pts[Math.floor(g.pts.length / 2)]
  rim(p, c, g.pts, 0.13, lightAt(mid[0], mid[1], T) * 0.8)
}

/**
 * The runnel to the wheel's torch: a groove cut down the wall, not a shelf (a lit rim on a long diagonal read as a
 * track he might roll on): only its dark channel, soft against the lit wall, and the embers in it once it has burned.
 */
function drawRunnel(p: p5, c: Pen, T: number): void {
  const k = c.k
  const lit = lightAt(8.8, 1.4, T)
  p.push()
  p.noFill()
  p.strokeJoin(p.ROUND)
  p.stroke(mixHex(STONE.dark, STONE.deep, 0.3 + 0.4 * (1 - lit)))
  p.strokeWeight(Math.max(1.2, 0.065 * k))
  p.beginShape()
  for (const [x, y] of RUNNEL.pts) p.vertex(x * k, y * k)
  p.endShape()
  p.pop()
}

/** The flame running along a gutter: one tongue of fire, tallest where it has just come, burning down behind to embers. */
function drawBurn(p: p5, c: Pen, f: Front, T: number): void {
  const k = c.k
  const L = f.g.s[f.g.s.length - 1]
  const step = 0.06
  const top: Pt[] = []
  const base: Pt[] = []
  const embers: Pt[] = []
  for (let s = 0; s <= L + 1e-9; s += step) {
    const at = reached(f, s)
    if (at > T) {
      if (top.length) break
      continue
    }
    const age = T - at
    const [x, y] = gutterAt(f.g, s)
    embers.push([x, y - 0.012])
    const h = 0.2 * Math.exp(-age / 0.35) * (0.8 + 0.2 * Math.sin(s * 9 + T * 13)) * Math.min(1, age * 12 + 0.25)
    if (h > 0.012) {
      top.push([x, y - 0.015 - h])
      base.push([x, y - 0.01])
    }
  }
  p.push()
  p.noFill()
  if (embers.length > 1) {
    p.stroke(alpha(p, LAMP.flame, 0.22))
    p.strokeWeight(Math.max(1, 0.035 * k))
    p.beginShape()
    for (const [x, y] of embers) p.vertex(x * k, y * k)
    p.endShape()
  }
  if (top.length > 1) {
    p.noStroke()
    for (const [col, sc, a] of [[LAMP.flame, 1, 0.9], [LAMP.core, 0.45, 0.8]] as const) {
      p.fill(alpha(p, col, a))
      p.beginShape()
      for (let i = 0; i < top.length; i++) p.vertex(top[i][0] * k, (base[i][1] + (top[i][1] - base[i][1]) * sc) * k)
      for (let i = base.length - 1; i >= 0; i--) p.vertex(base[i][0] * k, base[i][1] * k)
      p.endShape(p.CLOSE)
    }
  }
  p.pop()
}

export function drawFire(p: p5, c: Pen, T: number): void {
  drawGutter(p, c, G1, T)
  drawGutter(p, c, G2, T)
  drawRunnel(p, c, T)
  for (const f of FRONTS) drawBurn(p, c, f, T)
  drawBurn(p, c, RUNNEL_FRONT, T)
  // The wheel's torch, on the wall over the pit (behind the flume, the wheel and the hammer's arm, drawn after this).
  const lit = wheelLit(T)
  const [x, y] = WHEEL_TORCH.at
  const pen: Pen = { ...c, ink: inkAt(c.ink, Math.max(0.15 * lit, lightAt(x, y, T) * 0.6)) }
  drawTorch(p, pen, x, y - 0.01, { lit, t: T, seed: WHEEL_TORCH.seed, size: WHEEL_TORCH.size, side: 1 })
}

/** Sparks: short amber streaks thrown up and out, falling, gone within the second. */
export function drawSparks(p: p5, c: Pen, T: number): void {
  const k = c.k
  for (const sh of SHOWERS) {
    const age = T - sh.at
    if (age >= 0 && age < 0.6) glow(p, c, sh.p[0], sh.p[1] - 0.1, 1.8, 0.38 * Math.exp(-age / 0.12), LAMP.core)
  }
  p.push()
  for (const sh of SHOWERS) {
    const age = T - sh.at
    if (age < 0 || age > 1.1) continue
    for (let i = 0; i < sh.n; i++) {
      const life = 0.45 + 0.55 * hash(i, sh.seed, 1)
      if (age > life) continue
      const vx = (hash(i, sh.seed, 2) - 0.5) * 3.2
      const vy = -sh.up * (0.45 + 0.55 * hash(i, sh.seed, 3))
      const g = 9
      const x = sh.p[0] + vx * age
      const y = sh.p[1] + vy * age + 0.5 * g * age * age
      const dx = vx
      const dy = vy + g * age
      const n = Math.hypot(dx, dy) || 1
      const len = 0.05 + 0.06 * Math.min(1, n / 4)
      p.stroke(alpha(p, i % 3 ? LAMP.flame : LAMP.core, 1 - age / life))
      p.strokeWeight(Math.max(1.2, 0.034 * k))
      p.line(x * k, y * k, (x - (dx / n) * len) * k, (y - (dy / n) * len) * k)
    }
  }
  p.pop()
}
