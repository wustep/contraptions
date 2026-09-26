import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, knock, lastOf, smooth, type Ctx } from '../kit'
import { flame, flicker, glow } from '../lantern'
import { beat, CODA, FF } from '../music'
import { hollow, quake, slab, stalactite } from '../rock'
import { drawTroll } from '../troll'
import { LAMP, STONE, TROLL, WORKS } from '../worlds'
import {
  BEGIN,
  BLOWS,
  BURST,
  BURST_X,
  CLIMB,
  DRUM2,
  DRUM3,
  DRUMMERS,
  DUCK,
  LEAP,
  FLOOR,
  KETTLE,
  KETTLE_Y,
  LANDINGS,
  SHAFT,
  VAULT,
  farEdge,
  pairAt,
  pairedBlow,
  phase,
  type Drum,
  type Drummer,
} from './drum-clock'

/**
 * The drawing of the trolls' drum, from show time `T` (the part hands it its own `t` plus its begin). Everything is
 * a pure function of the clock, so it reads the same scrubbed, before its slot (dark: the fires banked, the
 * drummers not yet up) and after (lit, the war-drum's pair pounding on until the coda, then ducking away).
 *
 * Layers: `back` is drawn under the ball (the room, the fires, the skins, the drummers on the back rims); `front`
 * over it (each drum's near rim and barrel, so a ball that sinks into a skin, or falls through the burst one, goes
 * behind the drum as it should).
 */

/* ------------------------------------------------------------------ light */

/**
 * How lit the chamber is, 0..1. The two war-fires are banked (a red bed of embers) until the ball's fall strikes the
 * kettle; every blow of the drums fans them, and every drummer who climbs up adds his blows, so the fire and the
 * light grow bar by bar with the crescendo, and stay.
 */
export function light(T: number): number {
  let a = 0.06
  a += 0.18 * smooth(T, BEGIN - 0.02, BEGIN + 0.7)
  for (const d of DRUMMERS) a += 0.12 * smooth(T, beat(d.up) - 0.35, beat(d.up) + 0.8)
  a += 0.1 * smooth(T, FF - 1.4, FF + 0.4)
  // Each blow fans the coals: a lift over a twentieth of a second, gone in a third.
  const { i } = lastOf(BLOWS, T)
  for (let j = Math.max(0, i - 3); j <= i; j++) {
    if (BLOWS[j] < beat(DRUMMERS[0].up) - 0.01) continue
    a += 0.045 * knock(T - BLOWS[j], 0.3) * smooth(T, BLOWS[j], BLOWS[j] + 0.05)
  }
  // And the kettle's strokes, before any drummer is up.
  for (const l of LANDINGS) if (l.drum === 1) a += 0.06 * knock(T - beat(l.b), 0.3) * smooth(T, beat(l.b), beat(l.b) + 0.05)
  return Math.min(1, a)
}

/** Lit colour: `hex` as the fire shows it, sunk toward the rock where it does not reach. */
const lit = (hex: string, L: number, dark = STONE.deep, floor = 0.14): string => mixHex(dark, hex, floor + (1 - floor) * L)

/** A blow's thump: 0 before `at`, up to 1 over `rise` seconds, then dying away. */
export function thump(T: number, at: number, rise = 0.035, decay = 0.12): number {
  const s = T - at
  if (s < 0) return 0
  if (s < rise) return Math.sin((Math.PI / 2) * (s / rise))
  return Math.exp(-(s - rise) / decay)
}

/* ------------------------------------------------------------------ small drawing helpers */

type Poly = Pt[]

function shape(p: p5, c: Ctx, pts: Poly, close = true): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * c.k, y * c.k)
  if (close) p.endShape(p.CLOSE)
  else p.endShape()
}

/** The upper (far) or lower (near) arc of an ellipse, from its left end to its right, `n` points. */
function arc(cx: number, cy: number, rx: number, ry: number, far: boolean, n = 24): Poly {
  const out: Poly = []
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n
    const h = ry * Math.sqrt(Math.max(0, 1 - u * u))
    out.push([cx + rx * u, cy + (far ? -h : h)])
  }
  return out
}

/** Clip the drawing in `fn` to the region above the drum's far rim (behind the drum's skin nothing shows). */
function aboveRim(p: p5, c: Ctx, d: Drum, dy: number, allow: number, fn: () => void): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const k = c.k
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((d.cx - d.rx - 3) * k, -40 * k)
  ctx.lineTo((d.cx + d.rx + 3) * k, -40 * k)
  ctx.lineTo((d.cx + d.rx + 3) * k, (d.skin + dy - 0.05) * k)
  const far = arc(d.cx, d.skin + dy, d.rx, d.ry, true, 32)
  for (let i = far.length - 1; i >= 0; i--) ctx.lineTo(far[i][0] * k, (far[i][1] + allow) * k)
  ctx.lineTo((d.cx - d.rx - 3) * k, (d.skin + dy - 0.05) * k)
  ctx.closePath()
  ctx.clip()
  fn()
  ctx.restore()
}

/* ------------------------------------------------------------------ the room */

/** The chamber's hollow: a low vault, the mine's shaft coming down through it at the west end, the pit at the east. */
const ROOM: Poly = [
  [-1.0, FLOOR],
  [-1.0, -3.4],
  [-1.0, -6.5],
  [0.35, -6.5],
  [0.5, -5.9],
  [1.4, -6.15],
  [3.0, -6.3],
  [5.2, -6.45],
  [7.4, -6.35],
  [9.6, -6.5],
  [12.0, -6.45],
  [14.2, -6.5],
  [16.2, -6.4],
  [17.0, -5.9],
  [17.0, FLOOR],
]

/** Stalactites on the vault: never over the chimney's column, never where he flies high. */
const STALACTITES: [number, number, number][] = [
  [4.7, 0.62, 0.2],
  [5.35, 0.4, 0.14],
  [7.25, 0.85, 0.24],
  [8.05, 0.5, 0.16],
  [10.25, 0.7, 0.2],
  [16.75, 0.45, 0.16],
]

/** The war-fires on the floor: one by the kettle, one between the drums. */
export const FIRES = [2.6, 8.75]
const FIRE_Y = FLOOR - 0.4

/**
 * How far fire `i` has caught, 0..1: banked embers until the chain reaches it (the kettle's first stroke fans the one
 * beside it; the war-drum's first blows the one between the drums), catching over half a second, and staying lit.
 */
export function caught(i: number, T: number): number {
  const at = i === 0 ? BEGIN : beat(DRUMMERS[0].up)
  return smooth(T, at - 0.02, at + 0.5)
}

export function drawRoom(p: p5, c: Ctx, T: number, L: number): void {
  hollow(p, c, ROOM, 0.12 + 0.75 * L)
  // The fire's light on the rock, over the hollow, before anything it lights.
  for (const [i, x] of FIRES.entries()) {
    const f = flicker(T, i * 3 + 1) * caught(i, T)
    glow(p, c, x, FIRE_Y - 0.5, (1.6 + 4.8 * L) * f, (0.05 + 0.21 * L) * f)
    glow(p, c, x, FIRE_Y - 0.2, (0.8 + 2.2 * L) * flicker(T, i + 7), (0.04 + 0.15 * L) * caught(i, T), LAMP.flame)
  }
  for (const [i, [x, len, w]] of STALACTITES.entries()) stalactite(p, c, x, vaultAt(x) - 0.05, len, w, 0.15 + 0.7 * L, i + 2)
  // The floor, broken by the pit under the great drum; the pit going down to the heart.
  hollow(p, c, [[SHAFT.x0, FLOOR - 0.02], [SHAFT.x1, FLOOR - 0.02], [SHAFT.x1 - 0.05, 3], [SHAFT.x1, SHAFT.bottom], [SHAFT.x0 + 0.04, SHAFT.bottom], [SHAFT.x0 - 0.04, 3.5]], 0.05 + 0.25 * L)
  slab(p, c, -1.0, SHAFT.x0, FLOOR, 0.05, 0.2 + 0.7 * L, 3)
  slab(p, c, SHAFT.x1, 17.0, FLOOR, 0.05, 0.2 + 0.7 * L, 4)
}

/** The vault's height at x (the room's polygon, top edge). */
function vaultAt(x: number): number {
  const top = ROOM.slice(2, ROOM.length - 1)
  for (let i = 0; i < top.length - 1; i++) {
    const [x0, y0] = top[i]
    const [x1, y1] = top[i + 1]
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-6, x1 - x0)
  }
  return VAULT
}

/* ------------------------------------------------------------------ the fires */

/**
 * A war-fire on the floor: a ring of stones, logs laid across, a bed of embers, and the flames, low and red when
 * banked, a tall fire as the drumming fans it (the canonical `flame`: pointed, never round).
 */
export function drawFire(p: p5, c: Ctx, x: number, T: number, L: number, seed: number, jolt: number): void {
  const { k, ink, weight } = c
  const lit1 = caught(seed - 1, T)
  const y = FLOOR + jolt * 0.3
  const inkC = mixHex(STONE.deep, ink, 0.24 + 0.71 * L)
  const glowing = mixHex(mixHex(STONE.deep, WORKS.rust, 0.35 + 0.25 * lit1), LAMP.flame, (0.1 + 0.55 * L) * lit1)
  p.push()
  p.strokeJoin(p.ROUND)
  // The embers' bed, then two logs crossed over it, their ends glowing.
  p.noStroke()
  p.fill(glowing)
  shape(p, c, [[x - 0.42, y - 0.02], [x - 0.3, y - 0.12], [x, y - 0.16], [x + 0.3, y - 0.12], [x + 0.42, y - 0.02]])
  for (const [a, b, h] of [[-0.46, 0.34, 0.08], [0.44, -0.3, 0.1]] as const) {
    const x0 = x + a
    const x1 = x + b
    const y0 = y - 0.04
    const y1 = y - 0.04 - h - 0.14
    const nx = -(y1 - y0)
    const ny = x1 - x0
    const len = Math.hypot(nx, ny)
    const w = 0.055
    p.stroke(inkC)
    p.strokeWeight(weight * 0.9)
    p.fill(lit(WORKS.wood, L))
    shape(p, c, [[x0 + (nx / len) * w, y0 + (ny / len) * w], [x1 + (nx / len) * w, y1 + (ny / len) * w], [x1 - (nx / len) * w, y1 - (ny / len) * w], [x0 - (nx / len) * w, y0 - (ny / len) * w]])
    p.noStroke()
    p.fill(glowing)
    p.ellipse(x1 * k, y1 * k, 0.07 * k, 0.1 * k)
  }
  // The ring of stones round it, each its own lump, lit on top.
  const stones: [number, number, number][] = [[-0.6, 0.26, 0.11], [-0.33, 0.22, 0.09], [0.34, 0.25, 0.1], [0.6, 0.22, 0.09]]
  for (const [i, [dx, w, h]] of stones.entries()) {
    const sx = x + dx
    const j = hash(i, seed, 2)
    p.stroke(mixHex(STONE.deep, ink, 0.2 + 0.35 * L))
    p.strokeWeight(weight * 0.7)
    p.fill(lit(STONE.mid, L, STONE.deep, 0.3))
    shape(p, c, [[sx - w / 2, y], [sx - w * 0.45, y - h * 0.7], [sx - w * 0.1, y - h * (0.95 + 0.1 * j)], [sx + w * 0.3, y - h * 0.9], [sx + w / 2, y - h * 0.35], [sx + w * 0.48, y]])
    p.noStroke()
    p.fill(lit(STONE.light, L, STONE.deep, 0.2))
    shape(p, c, [[sx - w * 0.3, y - h * 0.8], [sx - w * 0.1, y - h * (0.95 + 0.1 * j)], [sx + w * 0.25, y - h * 0.85], [sx, y - h * 0.7]])
  }
  p.pop()
  // The flames: low when banked, a tall fire as the drumming fans it.
  const tongues = [-0.24, -0.1, 0.04, 0.17, 0.29, -0.02]
  if (lit1 <= 0.01) return
  for (const [i, dx] of tongues.entries()) {
    const h = (0.14 + 0.85 * L) * (0.55 + 0.45 * hash(i, seed, 9)) * (i === 5 ? 1.3 : 1)
    flame(p, c, x + dx, y - 0.1, h, T, seed * 5 + i, Math.min(1, 0.3 + L) * lit1)
  }
}

/* ------------------------------------------------------------------ the drummers' fists */

/** A drummer watches the ball: the nose swings toward him. After the burst the great drum's three stare into the hole. */
export function faceOf(d: Drummer, peerX: number, T: number): number {
  const at = d.drum === 3 && T > BURST ? BURST_X : peerX
  return Math.max(-0.75, Math.min(0.75, (at - d.x) / 1.4))
}

/** A drummer's club: its length and how far it is turned in from the forearm (in toward the troll's middle). */
const CLUB = { len: 0.3, turn: 1.0 }

/**
 * Where a drummer's club comes down: with the arm hanging (the blow, `troll.ts`) the club is turned in, so its head
 * lands on the skin just in front of the troll's feet, a little to the side of the fist that holds it.
 */
function clubHead(d: Drummer, face: number, s: number, rim: number): Pt {
  return [d.x + 0.049 * face * d.size + s * 0.095 * d.size, rim + 0.075 * d.size]
}

/** Is drummer `d` pounding at blow time `at` (up on its rim, and its drum not burst)? */
const pounds = (d: Drummer, at: number): boolean => at >= beat(d.up) - 0.01 && !(d.drum === 3 && at > BURST + 0.01) && at < DUCK

/** The drummers' strike phase: the war-drum's pair drum on; the great drum's three stop dead at the burst. */
export function drummerPhase(d: Drummer, T: number): number {
  if (d.drum === 2 || T <= BURST) return phase(T)
  // Stop over a quarter second after the burst's blow: the arms come up a little and hang there.
  const v = (phase(BURST + 0.01) - phase(BURST - 0.01)) / 0.02
  const s = Math.min(T - BURST, 0.3)
  return phase(BURST) + v * s - (v * s * s) / (2 * 0.3)
}

/* ------------------------------------------------------------------ dents and dust on a skin */

/**
 * A blow on a skin, drawn on the skin's far part: a dent (a dark dip) and two grains of dust jumping off it. The
 * ball's landings dent the middle of the skin under him.
 */
function drawDents(p: p5, c: Ctx, d: Drum, n: 2 | 3, T: number, dy: number, peerX: number, L: number): void {
  const k = c.k
  const shade = mixHex(WORKS.skin, WORKS.wood, 0.55)
  p.push()
  p.noStroke()
  for (const l of LANDINGS) {
    if (l.drum !== n) continue
    const a = thump(T, beat(l.b), 0.03, 0.09)
    if (a < 0.02) continue
    p.fill(alpha(p, shade, 0.55 * a))
    p.ellipse(l.x * k, (d.skin + dy + 0.015) * k, (0.42 + 0.1 * a) * k, (0.08 + 0.07 * a) * k)
  }
  const { i } = lastOf(BLOWS, T)
  for (let j = Math.max(0, i - 2); j <= i; j++) {
    const at = BLOWS[j]
    const s = T - at
    if (s > 0.45) continue
    const right = Math.round((phase(at) - 0.15) * 2) % 2 === 0
    const sides = pairedBlow(at) ? [-1, 1] : [right ? 1 : -1]
    for (const dr of DRUMMERS) {
      if (dr.drum !== n || !pounds(dr, at)) continue
      for (const side of sides) {
        const [x, y] = clubHead(dr, faceOf(dr, peerX, at), side, farEdge(d, dr.x) + dy)
        const a = thump(T, at, 0.03, 0.1)
        if (a > 0.02) {
          p.fill(alpha(p, shade, 0.6 * a))
          p.ellipse(x * k, y * k, 0.36 * k, (0.05 + 0.05 * a) * k)
        }
        // Two grains jump off the skin and fall back.
        for (const g of [-1, 1]) {
          const u = s / 0.42
          if (u > 1) continue
          const gx = x + g * (0.08 + 0.22 * u) * (0.8 + 0.4 * hash(j, dr.seed, g + 2))
          const gy = y - 0.05 - (0.34 * (0.7 + 0.6 * hash(j, dr.seed, g + 5))) * 4 * u * (1 - u)
          p.fill(alpha(p, lit(STONE.light, L), 0.7 * (1 - u)))
          p.ellipse(gx * k, gy * k, 0.03 * k, 0.03 * k)
        }
      }
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the kettle */

const K1 = () => beat(161) - BEGIN
const K2 = () => beat(162) - BEGIN

/**
 * The kettle's tilt at T. At rest it is tipped east toward the war-drum. His fall rocks it back on its legs, and
 * again, less, on his second bounce; on the third it springs east under him, which is the throw, and rocks itself
 * still. It is exactly at rest-tilt at each of his landings, so he lands on the skin where it is.
 */
export function kettleTilt(T: number): number {
  const s = T - BEGIN
  if (s <= 0) return KETTLE.tilt
  const t1 = K1()
  const t2 = K2()
  if (s < t1) return KETTLE.tilt - 0.11 * Math.sin((Math.PI * s) / t1)
  if (s < t2) return KETTLE.tilt - 0.06 * Math.sin((Math.PI * (s - t1)) / (t2 - t1))
  const u = s - t2
  return KETTLE.tilt + 0.26 * Math.sin(u * 13) * Math.exp(-u / 0.3)
}

/** The kettle: a deep riveted iron bowl on three splayed legs, a skin on it, tipped toward the war-drum. */
export function drawKettle(p: p5, c: Ctx, T: number, L: number, layer: 'back' | 'front'): void {
  const { k, ink, weight } = c
  const t = kettleTilt(T)
  const { cx, rx, ry, depth } = KETTLE
  const inkC = mixHex(STONE.deep, ink, 0.4 + 0.55 * L)
  const bowlC = lit(mixHex(WORKS.iron, WORKS.rust, 0.35), L, STONE.deep, 0.3)
  const steel = lit(WORKS.steel, L, STONE.deep, 0.3)
  const skin = lit(WORKS.skin, L, STONE.deep, 0.35)
  const toWorld = (u: number, v: number): Pt => [cx + u * Math.cos(t) - v * Math.sin(t), KETTLE_Y + u * Math.sin(t) + v * Math.cos(t)]
  // The pivot is the bowl's foot: the kettle rocks about it, and the legs stand under it.
  if (layer === 'back') {
    // Legs, from under the bowl out to the floor.
    p.push()
    p.strokeJoin(p.ROUND)
    for (const [u, foot] of [[-0.42, -0.62], [0.42, 0.66], [0.05, 0.12]] as const) {
      const [lx, ly] = toWorld(u, depth * 0.78)
      p.stroke(inkC)
      p.strokeWeight(weight * 2.2)
      p.line(lx * k, ly * k, (cx + foot) * k, FLOOR * k)
      p.stroke(lit(WORKS.iron, L, STONE.deep, 0.3))
      p.strokeWeight(weight * 1.1)
      p.line(lx * k, ly * k, (cx + foot) * k, FLOOR * k)
    }
    p.pop()
    // The skin: the whole ellipse (its near half is drawn again over the ball), and the dent of each landing.
    p.push()
    p.translate(cx * k, KETTLE_Y * k)
    p.rotate(t)
    p.stroke(inkC)
    p.strokeWeight(weight)
    p.fill(skin)
    p.ellipse(0, 0, 2 * rx * k, 2 * ry * k)
    const du = (-0.5 - cx) * Math.cos(KETTLE.tilt) + (0 - KETTLE_Y) * Math.sin(KETTLE.tilt)
    for (const l of LANDINGS) {
      if (l.drum !== 1) continue
      const a = thump(T, beat(l.b), 0.03, 0.1) * (l.b === 160 ? 1 : 0.7)
      if (a < 0.02) continue
      p.noStroke()
      p.fill(alpha(p, mixHex(WORKS.skin, WORKS.wood, 0.55), 0.6 * a))
      p.ellipse(du * k, 0.015 * k, (0.46 + 0.1 * a) * k, (ry + 0.06 * a) * k)
    }
    p.pop()
    return
  }
  // Front: the bowl round from the skin's near edge, its rim band and lugs, a gleam along its belly.
  p.push()
  p.strokeJoin(p.ROUND)
  const bowl: Poly = []
  for (let i = 0; i <= 24; i++) {
    const a = (Math.PI * i) / 24
    // A timpani's bowl: steep sides, a round bottom.
    const v = depth * Math.pow(Math.sin(a), 0.7)
    bowl.push(toWorld(-rx * Math.cos(a) * (1 - 0.08 * Math.sin(a)), v))
  }
  const near = arc(0, 0, rx, ry, false, 20).map(([u, v]) => toWorld(u, v))
  p.stroke(inkC)
  p.strokeWeight(weight)
  p.fill(bowlC)
  shape(p, c, [...near, ...[...bowl].reverse().slice(1, -1)])
  p.noFill()
  p.stroke(alpha(p, steel, 0.75))
  p.strokeWeight(weight * 1.4)
  p.beginShape()
  for (let i = 5; i <= 11; i++) {
    const a = (Math.PI * i) / 24
    const [bx, by] = toWorld(-rx * 0.78 * Math.cos(a), depth * 0.8 * Math.pow(Math.sin(a), 0.7))
    p.vertex(bx * k, by * k)
  }
  p.endShape()
  // The rim: an iron band under the skin's near edge, with tuning lugs.
  p.stroke(inkC)
  p.strokeWeight(weight)
  p.fill(steel)
  const rimTop = arc(0, 0, rx, ry, false, 20).map(([u, v]) => toWorld(u, v))
  const rimBot = arc(0, 0.08, rx * 0.99, ry, false, 20).map(([u, v]) => toWorld(u, v)).reverse()
  shape(p, c, [...rimTop, ...rimBot])
  p.fill(lit(WORKS.iron, L, STONE.deep, 0.3))
  for (const u of [-0.6, -0.2, 0.2, 0.6]) {
    const v = ry * Math.sqrt(1 - (u / rx) ** 2)
    const [a0, b0] = toWorld(u, v + 0.1)
    p.push()
    p.translate(a0 * k, b0 * k)
    p.rotate(t)
    p.rect(0, 0, 0.07 * k, 0.15 * k, 0.02 * k)
    p.pop()
  }
  p.pop()
}

/* ------------------------------------------------------------------ a barrel drum */

/**
 * A troll war-drum: a barrel of heavy staves, a hide laced over the top with rope running down to an iron band,
 * another band at the foot, and (the great drum) a trestle under it. `back` draws the skin (its dents, the burst);
 * `front` the near half of the skin again, its hoop, and the barrel, over the ball.
 */
export function drawDrum(p: p5, c: Ctx, d: Drum, n: 2 | 3, T: number, L: number, layer: 'back' | 'front', jolt: number, peerX: number): void {
  const { k, ink, weight } = c
  const inkC = mixHex(STONE.deep, ink, 0.24 + 0.71 * L)
  const skinC = lit(WORKS.skin, L)
  const cy = d.skin + jolt
  const burst = n === 3 ? smooth(T, BURST - 0.005, BURST + 0.08) : 0
  const hole = { x: BURST_X, y: cy + 0.01, rx: 0.62 * burst, ry: 0.23 * burst }
  if (layer === 'back' && n === 3) drawTrestle(p, c, d, L, jolt)
  p.push()
  p.strokeJoin(p.ROUND)
  if (layer === 'back') {
    p.stroke(inkC)
    p.strokeWeight(weight)
    p.fill(skinC)
    p.ellipse(d.cx * k, cy * k, 2 * d.rx * k, 2 * d.ry * k)
    // The worn ring where the fists fall, a shade darker.
    p.noFill()
    p.stroke(alpha(p, mixHex(WORKS.skin, WORKS.wood, 0.35), 0.35))
    p.strokeWeight(weight * 3)
    p.ellipse(d.cx * k, (cy + 0.01) * k, 2 * d.rx * 0.9 * k, 2 * d.ry * 0.78 * k)
    drawDents(p, c, d, n, T, jolt, peerX, L)
    if (burst > 0) drawHole(p, c, hole, T, L)
    p.pop()
    return
  }
  // The near half of the skin again (with the burst's hole cut out of it), over anything sunk into it.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  if (burst > 0) {
    ctx.beginPath()
    ctx.rect((d.cx - d.rx - 1) * k, (cy - 1) * k, (2 * d.rx + 2) * k, (d.ry + 2) * k)
    ctx.ellipse(hole.x * k, hole.y * k, Math.max(0.001, hole.rx) * k, Math.max(0.001, hole.ry) * k, 0, 0, Math.PI * 2)
    ctx.clip('evenodd')
  }
  p.noStroke()
  p.fill(skinC)
  shape(p, c, [[d.cx - d.rx, cy], ...arc(d.cx, cy, d.rx, d.ry, false, 32)])
  ctx.restore()
  // The barrel: its sides bulge a little; its bottom is the near half of an ellipse.
  const top = cy + d.ry * 0.25
  const bot = d.bottom + jolt
  const bulge = 0.07 * (d.rx / 1.6)
  const wood = lit(WORKS.wood, L)
  const timber = lit(WORKS.timber, L)
  const side = (s: number, v: number): number => d.cx + s * (d.rx + bulge * Math.sin(Math.PI * v))
  const N = 14
  const left: Poly = []
  const right: Poly = []
  for (let i = 0; i <= N; i++) {
    const v = i / N
    left.push([side(-1, v), top + (bot - top) * v])
    right.push([side(1, v), top + (bot - top) * v])
  }
  const bottom = arc(d.cx, bot, d.rx, d.ry * 0.9, false, 24)
  const skinNear = arc(d.cx, cy, d.rx, d.ry, false, 32).reverse()
  p.stroke(inkC)
  p.strokeWeight(weight)
  p.fill(wood)
  shape(p, c, [...left, ...bottom.slice(1, -1), ...right.reverse(), ...skinNear])
  // The staves, spaced as a cylinder's would be.
  p.strokeWeight(weight * 0.6)
  for (let i = 1; i < 11; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 11
    const u = Math.sin(a)
    const x0 = d.cx + u * d.rx
    const yTop = cy + d.ry * Math.sqrt(1 - u * u)
    const yBot = bot + d.ry * 0.9 * Math.sqrt(1 - u * u)
    p.stroke(alpha(p, i % 2 ? timber : inkC, 0.45))
    p.noFill()
    p.beginShape()
    for (let j = 0; j <= 6; j++) {
      const v = j / 6
      p.vertex((x0 + u * bulge * Math.sin(Math.PI * v)) * k, (yTop + (yBot - yTop) * v) * k)
    }
    p.endShape()
  }
  // Light down the barrel's front, where the fire catches it.
  p.noStroke()
  p.fill(alpha(p, WORKS.timber, 0.14 + 0.22 * L))
  shape(p, c, [
    [d.cx - d.rx * 0.35, top + d.ry * 0.9],
    [d.cx + d.rx * 0.05, top + d.ry],
    [d.cx + d.rx * 0.05, bot + d.ry * 0.85],
    [d.cx - d.rx * 0.35, bot + d.ry * 0.8],
  ])
  // Iron bands: one under the lacing, one near the foot.
  const band = (v: number, h: number) => {
    const y = top + (bot - top) * v
    const w = d.rx + bulge * Math.sin(Math.PI * v)
    const a0 = arc(d.cx, y, w, d.ry * (1 - 0.1 * v), false, 24)
    const a1 = arc(d.cx, y + h, w, d.ry * (1 - 0.1 * v), false, 24).reverse()
    p.stroke(inkC)
    p.strokeWeight(weight * 0.9)
    p.fill(lit(WORKS.iron, L))
    shape(p, c, [...a0, ...a1])
  }
  const lace = 0.38
  band(lace, 0.09)
  band(0.86, 0.08)
  // The hide's hoop round the top, and the rope laced from it down to the band: a zigzag round the drum.
  const hoopH = 0.1 + 0.02 * d.rx
  p.stroke(inkC)
  p.strokeWeight(weight)
  p.fill(timber)
  shape(p, c, [...arc(d.cx, cy, d.rx * 1.005, d.ry, false, 32), ...arc(d.cx, cy + hoopH, d.rx * 1.01, d.ry, false, 32).reverse()])
  const yLace = top + (bot - top) * lace
  const M = n === 3 ? 14 : 10
  const pt = (i: number, low: boolean): Pt => {
    const a = -Math.PI / 2 + (Math.PI * (i + 0.5)) / M
    const u = Math.sin(a)
    const w = low ? d.rx + bulge * Math.sin(Math.PI * lace) : d.rx
    return [d.cx + u * w, (low ? yLace : cy + hoopH) + d.ry * Math.sqrt(1 - u * u) * (low ? 0.96 : 1)]
  }
  p.noFill()
  const zig = () => {
    p.beginShape()
    for (let i = 0; i < M; i++) {
      const [x, y] = pt(i, i % 2 === 1)
      p.vertex(x * k, y * k)
    }
    p.endShape()
  }
  p.stroke(inkC)
  p.strokeWeight(weight * 1.6)
  zig()
  p.stroke(lit(WORKS.rope, L))
  p.strokeWeight(weight * 0.8)
  zig()
  p.pop()
  if (n === 3 && T > BURST) drawShreds(p, c, T, L)
}

/** The great drum's trestle: two A-legs on the floor either side of the pit, a cross-piece on each. */
function drawTrestle(p: p5, c: Ctx, d: Drum, L: number, jolt: number): void {
  const { ink, weight } = c
  const inkC = mixHex(STONE.deep, ink, 0.24 + 0.71 * L)
  const wood = lit(WORKS.wood, L)
  const y0 = d.bottom + jolt + d.ry * 0.5
  p.push()
  p.strokeJoin(p.ROUND)
  for (const s of [-1, 1]) {
    const x = d.cx + s * (d.rx - 0.28)
    p.stroke(inkC)
    p.strokeWeight(weight)
    p.fill(wood)
    for (const e of [-1, 1]) {
      const top: Pt = [x + e * 0.12, y0]
      const foot: Pt = [x + e * 0.34, FLOOR]
      const w = 0.075
      shape(p, c, [[top[0] - w, top[1]], [top[0] + w, top[1]], [foot[0] + w, foot[1]], [foot[0] - w, foot[1]]])
    }
    const ym = y0 + (FLOOR - y0) * 0.55
    shape(p, c, [[x - 0.3, ym - 0.05], [x + 0.3, ym - 0.05], [x + 0.3, ym + 0.05], [x - 0.3, ym + 0.05]])
  }
  p.pop()
}

/** The burst: a ragged hole in the great drum's skin, torn flaps hanging into it, the dark of the barrel inside. */
function drawHole(p: p5, c: Ctx, h: { x: number; y: number; rx: number; ry: number }, T: number, L: number): void {
  const { ink, weight } = c
  const pts: Poly = []
  const n = 15
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    const r = i % 2 ? 1 : 0.74 + 0.18 * hash(i, 5, 1)
    pts.push([h.x + Math.cos(a) * h.rx * r, h.y + Math.sin(a) * h.ry * r])
  }
  p.push()
  p.stroke(mixHex(STONE.deep, ink, 0.3 + 0.5 * L))
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(STONE.deep, WORKS.wood, 0.25))
  shape(p, c, pts)
  // Flaps of hide hanging into it from the far lip.
  p.noStroke()
  p.fill(lit(mixHex(WORKS.skin, WORKS.wood, 0.3), L))
  for (const u of [-0.62, -0.2, 0.25, 0.66]) {
    const x = h.x + u * h.rx
    const y = h.y - h.ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.85
    const sway = 0.03 * Math.sin((T - BURST) * 8 + u * 4) * Math.exp(-(T - BURST) / 1.0)
    shape(p, c, [[x - 0.08, y], [x + 0.08, y], [x + sway, y + 0.15 + 0.05 * hash(u * 10, 2)]])
  }
  p.pop()
}

/**
 * Shreds of the burst hide, thrown up out of the hole and falling back, and the drum's breath of dust puffing out
 * after them: a few, small, gone within a second.
 */
function drawShreds(p: p5, c: Ctx, T: number, L: number): void {
  const k = c.k
  const s = T - BURST
  if (s > 1.1) return
  p.push()
  p.noStroke()
  for (let i = 0; i < 9; i++) {
    const u = s / (0.7 + 0.3 * hash(i, 8, 1))
    if (u > 1) continue
    const ang = -Math.PI / 2 + (hash(i, 8, 2) - 0.5) * 2.2
    const r = 0.25 + 0.75 * (1 - (1 - u) * (1 - u))
    const x = BURST_X + Math.cos(ang) * r * (0.5 + 0.4 * hash(i, 8, 3))
    const y = DRUM3.skin - 0.02 + Math.sin(ang) * r * 0.55 + 0.25 * u * u
    p.fill(alpha(p, mixHex(STONE.light, WORKS.skin, 0.4), 0.5 * (1 - u)))
    p.ellipse(x * k, y * k, (0.06 + 0.1 * u) * k, (0.05 + 0.07 * u) * k)
  }
  p.pop()
  p.push()
  p.noStroke()
  p.fill(alpha(p, lit(WORKS.skin, L), Math.min(1, 2.2 * (1 - s / 1.1))))
  for (let i = 0; i < 5; i++) {
    const vx = (hash(i, 3, 1) - 0.5) * 2.4
    const vy = -(2.6 + 1.8 * hash(i, 3, 2))
    const x = BURST_X + vx * s
    const y = DRUM3.skin - 0.05 + vy * s + 6 * s * s
    p.push()
    p.translate(x * k, y * k)
    p.rotate(s * (6 + 5 * hash(i, 3, 4)) * (i % 2 ? 1 : -1))
    p.triangle(-0.07 * k, -0.02 * k, 0.07 * k, -0.03 * k, 0.01 * k, 0.05 * k)
    p.pop()
  }
  p.pop()
}

/* ------------------------------------------------------------------ the drummers */

/**
 * One drummer, standing on its drum's back rim, pounding it (the canonical troll, `strike`: a fist down on every
 * blow, its knees giving a little under each). It climbs up the drum's back in the bar before it joins (the same
 * swing of the arms, hand over hand), from the coda's first chord it freezes, and on the chords after it ducks down
 * behind the drum, gone.
 */
export function drawDrummer(p: p5, c: Ctx, dr: Drummer, T: number, L: number, peerX: number, jolt: number): void {
  const d = dr.drum === 2 ? DRUM2 : DRUM3
  const up = beat(dr.up)
  const climb = smooth(T, up - CLIMB, up)
  if (climb <= 0) return
  // The war-drum's pair stay on the rim, frozen, until they leap off it (the finale draws them from then).
  const leap = LEAP[dr.seed]
  if (leap !== undefined && T >= leap) return
  const duck = leap !== undefined ? 0 : smooth(T, DUCK, DUCK + 0.8)
  if (duck >= 1) return
  // The knees give under each of its own blows.
  const { i } = lastOf(BLOWS, T)
  let dip = 0
  let shout = 0
  for (let j = Math.max(0, i - 1); j <= i; j++) {
    if (!pounds(dr, BLOWS[j])) continue
    dip += thump(T, BLOWS[j], 0.04, 0.14)
    // A war cry on the great blows of the second phrase, open-mouthed through the recovery.
    if (BLOWS[j] >= beat(176) - 0.01) shout = Math.max(shout, Math.exp(-(T - BLOWS[j]) / 0.3))
  }
  const rim = farEdge(d, dr.x) + jolt
  const feet = rim + (1 - climb) * dr.size * 1.02 + duck * dr.size * 1.05 + 0.028 * dr.size * dip
  // The bells (the coda's first chord): the pair on the war-drum freeze and look up at the vault.
  const bells = leap !== undefined ? smooth(T, CODA - 0.05, CODA + 0.3) : 0
  const face = faceOf(dr, peerX, T) * (1 - bells)
  const stare = dr.drum === 3 ? smooth(T, BURST, BURST + 0.25) : 0
  const eyes = 1.05 + 0.4 * smooth(T, up - 0.4, up) * (1 - smooth(T, up + 0.2, up + 1.2)) + 0.45 * Math.max(stare, bells)
  const mouth = Math.max(0.8 * shout * smooth(T, up, up + 0.3), 0.45 * stare, 0.35 * bells)
  let hands: { at: [number, number]; angle: number }[] = []
  aboveRim(p, c, d, jolt, 0.06, () => {
    const drawn = drawTroll(p, c, dr.x, feet, {
      size: dr.size,
      pose: 'strike',
      phase: drummerPhase(dr, T),
      face,
      eyes,
      mouth,
      // After the burst, the great drum's three lean their heads down over the hole he went through.
      slump: 0.55 * stare - 0.35 * bells,
      seed: dr.seed,
      hide: dr.hide ?? TROLL.hide,
      lit: 0.1 + 0.62 * L,
      outward: true,
      pair: pairAt(Math.min(T, dr.drum === 3 ? BURST : T)),
    })
    hands = drawn?.hands ?? []
  })
  // The clubs, in front of it: behind the drum while it climbs, reaching down onto the skin once it is up.
  const reach = 0.06 + d.ry * 1.1 * smooth(T, up - 0.12, up)
  aboveRim(p, c, d, jolt, reach, () => {
    for (const [n, h] of hands.entries()) drawClub(p, c, h.at, h.angle, n === 0 ? -1 : 1, dr.size, L)
  })
}

/**
 * A troll's drumstick: a club of dark timber in its fist, thick at the head and blunt, turned in from the forearm
 * (in toward its middle when the arm hangs, over its head when the arm is up).
 */
function drawClub(p: p5, c: Ctx, hand: [number, number], angle: number, s: number, size: number, L: number): void {
  const { k, ink, weight } = c
  const th = angle + s * CLUB.turn * Math.sin(angle)
  const grip: Pt = [hand[0] + 0.05 * size * Math.cos(angle), hand[1] + 0.05 * size * Math.sin(angle)]
  const len = CLUB.len * size
  const ux = Math.cos(th)
  const uy = Math.sin(th)
  const nx = -uy
  const ny = ux
  const w0 = 0.018 * size
  const w1 = 0.038 * size
  const tail = -0.05 * size
  const pts: Pt[] = [
    [grip[0] + ux * tail + nx * w0, grip[1] + uy * tail + ny * w0],
    [grip[0] + ux * len * 0.82 + nx * w1, grip[1] + uy * len * 0.82 + ny * w1],
    [grip[0] + ux * len + nx * w1 * 0.55, grip[1] + uy * len + ny * w1 * 0.55],
    [grip[0] + ux * len - nx * w1 * 0.55, grip[1] + uy * len - ny * w1 * 0.55],
    [grip[0] + ux * len * 0.82 - nx * w1, grip[1] + uy * len * 0.82 - ny * w1],
    [grip[0] + ux * tail - nx * w0, grip[1] + uy * tail - ny * w0],
  ]
  p.push()
  p.strokeJoin(p.ROUND)
  p.stroke(mixHex(STONE.deep, ink, 0.35 + 0.6 * L))
  p.strokeWeight(weight * 0.9)
  p.fill(lit(WORKS.wood, L))
  shape(p, c, pts)
  // A band of rope bound round it at the grip.
  p.stroke(lit(WORKS.rope, L))
  p.strokeWeight(weight * 1.2)
  const b = len * 0.62
  p.line((grip[0] + ux * b + nx * w1 * 0.95) * k, (grip[1] + uy * b + ny * w1 * 0.95) * k, (grip[0] + ux * b - nx * w1 * 0.95) * k, (grip[1] + uy * b - ny * w1 * 0.95) * k)
  p.pop()
}

/** How much the drums and the fires jump on the blows: a thump on each, harder in the second phrase; and the quake. */
export function jolt(T: number): number {
  const { i } = lastOf(BLOWS, T)
  let a = 0
  for (let j = Math.max(0, i - 2); j <= i; j++) {
    const at = BLOWS[j]
    if (at < beat(DRUMMERS[0].up) - 0.01 || at > DUCK) continue
    const g = Math.abs(at - BURST) < 0.01 ? 0.07 : at >= beat(176) - 0.01 ? 0.024 : 0.012
    a += g * thump(T, at, 0.03, Math.abs(at - BURST) < 0.01 ? 0.16 : 0.09)
  }
  return a + 0.8 * quake(T)[1]
}

/* ------------------------------------------------------------------ dust */

/** Dust shaken down from the vault on the great blows (phrase 11 on): a few grains a trickle, small and grey. */
export function drawDust(p: p5, c: Ctx, T: number, L: number): void {
  const k = c.k
  const { i } = lastOf(BLOWS, T)
  const from = beat(179) - 0.01
  const col = mixHex(STONE.deep, STONE.light, 0.3 + 0.5 * L)
  p.push()
  p.noStroke()
  for (let j = Math.max(0, i - 4); j <= i; j++) {
    const at = BLOWS[j]
    if (at < from || at > DUCK) continue
    const s = T - at
    if (s < 0 || s > 1.4) continue
    for (let q = 0; q < 2; q++) {
      const xs = [3.4, 6.6, 7.9, 9.7, 10.7, 16.8]
      const x = xs[Math.floor(hash(j, q, 17) * xs.length)] + 0.2 * (hash(j, q, 5) - 0.5)
      const top = vaultAt(x) + 0.02
      for (let g = 0; g < 4; g++) {
        const ss = s - g * 0.06
        if (ss < 0) continue
        const y = top + 0.5 * 9 * ss * ss
        if (y > FLOOR) continue
        p.fill(alpha(p, col, (1 - ss / 1.4) * (0.55 - g * 0.1)))
        p.ellipse((x + 0.03 * g * (hash(j, g, 3) - 0.5)) * k, y * k, 0.035 * k, 0.05 * k)
      }
    }
  }
  p.pop()
}
