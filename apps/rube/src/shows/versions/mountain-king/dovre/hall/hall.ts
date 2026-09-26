import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash } from '../kit'
import { drawLantern, drawTorch, flame, flicker, glow } from '../lantern'
import { beatAt } from '../music'
import { quake, stalactite } from '../rock'
import { drawTroll, type Pen, type TrollDrawn } from '../troll'
import { GOLD, LAMP, STONE, TROLL, WORKS } from '../worlds'
import {
  CHIMNEY_X, COURT_UP, CRACK, CRACKS, CROWN_LAMP, DAIS, FL, FLOOR_BREAK, GALLERY_Y, HAMMERS, HATCH, LANTERNS, LURCH, OPEN, PILLARS, PILLAR_FALL,
  ROW_Y, SMASH, SNORT_A, SNORT_B, STEPS, TAILS, THRONE, TORCH_A, TORCH_B, ease, ring, type Tail,
} from './hall-clock'
import { COURT, SCEPTRE, courtierAt, kingAt, shout, type KingPose, type Pose } from './hall-court'

/**
 * The Mountain King's hall (the hall builder's), drawn in the court part's frame for any show time: the director's
 * finale imports `drawHall` to see it come down. A great cavern of living rock under the mountain's summit, its
 * floor at y = R: the court in tiers on the west side (benches cut in the rock, a dark gallery above), two pillars
 * of living rock among them and a third east of the throne, the dais and the throne with its carved high-seat posts,
 * the King, and the lights, every one of them lit by the chain as Peer goes by:
 *
 *   - three braziers of banked embers on the front bench, breathing with the sleepers beside them (their only light
 *     at the start); a snort into each flares it;
 *   - two torches on the first pillar (its west and east faces), caught from the first two braziers' sparks;
 *   - a chain of three lanterns on an oiled rope from over the elder's brazier up to the crown-lamp over the throne:
 *     the elder's snort catches the first, and the fire runs along the rope to the crown-lamp, and the King is lit.
 *
 * Then the wake, the chase, the King's sceptre on the dais, the crack, the hatch (the trolls' way down to the mine)
 * opening under Peer. And in the coda: the court freezes at the bells and flees; the pillars crack and fall, one a
 * chord; the throne topples; stalactites fall from the vault; the lights go out one a hammer blow. The chimney's
 * column (x 7.5) is kept clear: its floor breaks open at `FLOOR_BREAK` so Peer can come up through it, and the vault
 * over it has always had its smoke hole.
 */

/* ------------------------------------------------------------------ the room */

/** The vault, west to east, over the floor: where the hollow's top is (the smoke hole at the chimney's column aside). */
const VAULT: Pt[] = [
  [-0.4, -2.1], [0.3, -2.6], [0.25, -5.6], [1.1, -8.0], [2.8, -9.5], [5.2, -10.5], [CHIMNEY_X, -10.95], [10.2, -11.2], [13.2, -11.05],
  [16.4, -10.5], [19.7, -9.9], [23.0, -9.0], [26.0, -7.5], [28.4, -5.2], [29.6, -2.7], [29.7, -2.05], [30.6, -1.95],
]

/** The vault's height at x (a smooth line through `VAULT`). */
export function vaultY(x: number): number {
  const v = VAULT
  if (x <= v[0][0]) return v[0][1]
  if (x >= v[v.length - 1][0]) return v[v.length - 1][1]
  let i = 0
  while (i + 1 < v.length && v[i + 1][0] < x) i++
  const [x0, y0] = v[i]
  const [x1, y1] = v[i + 1]
  const u = (x - x0) / (x1 - x0)
  const s = u * u * (3 - 2 * u)
  return y0 + (y1 - y0) * (0.5 * u + 0.5 * s)
}

/** A pillar's half-width at height y (an hourglass of flowstone: wide at the floor, narrow at the waist, spreading into the vault). */
const WAIST = -5.0
function pillarHalf(y: number, top: number): number {
  if (y > WAIST) {
    const u = (y - WAIST) / (FL - WAIST)
    return 0.34 + 0.34 * u * u
  }
  const u = (WAIST - y) / (WAIST - top)
  return 0.34 + 0.62 * u * u * u
}

/* ------------------------------------------------------------------ the lights */

interface Light {
  x: number
  y: number
  /** 0..1: how much it burns. */
  s: number
  /** Reach of its light (cells) and how strongly it lights what it reaches. */
  r: number
  w: number
  col: string
}

/** A lamp catching over a third of a second, from `at`; out over a quarter second after `out`. */
const burning = (t: number, at: number, out = Infinity): number => ease(t, at - 0.05, at + 0.3) * (1 - ease(t, out, out + 0.25))

const BRAZIERS = [
  { x: 3.3, who: 0 },
  { x: 5.3, who: 1 },
  { x: 12.35, who: 3 },
]
const BRAZIER_Y = ROW_Y[0] - 0.62
const TORCH_Y = -3.05
const torchFoot = (side: -1 | 1): Pt => [PILLARS[0] + side * pillarHalf(TORCH_Y, vaultY(PILLARS[0])), TORCH_Y]
const TORCHES = [
  { foot: torchFoot(-1), side: -1 as const, at: TORCH_A, out: HAMMERS[0] },
  { foot: torchFoot(1), side: 1 as const, at: TORCH_B, out: HAMMERS[1] },
]
const TORCH_SIZE = 0.6
const torchFlame = (i: number): Pt => [TORCHES[i].foot[0] + TORCHES[i].side * TORCH_SIZE * 0.5, TORCHES[i].foot[1] - TORCH_SIZE * 0.95]

/** The oiled rope: from the first lantern's hook, over the elder's brazier, up to the crown-lamp's hook over the throne. */
const ROPE0: Pt = [BRAZIERS[2].x, -2.3]
const CROWN: Pt = [THRONE.x, -6.45]
const ROPE1: Pt = [THRONE.x, -7.4]
const SAG = 1.0
const rope = (u: number): Pt => [ROPE0[0] + (ROPE1[0] - ROPE0[0]) * u, ROPE0[1] + (ROPE1[1] - ROPE0[1]) * u + SAG * 4 * u * (1 - u)]
const LANTERN_U = [0, 0.36, 0.7]
/** How far along the rope the fire has run (0 at the first lantern, 1 at the crown-lamp). */
function burnt(t: number): number {
  const ts = [LANTERNS[0] + 0.3, LANTERNS[1], LANTERNS[2], CROWN_LAMP]
  const us = [0, LANTERN_U[1], LANTERN_U[2], 1]
  if (t <= ts[0]) return 0
  for (let i = 1; i < ts.length; i++) if (t <= ts[i]) return us[i - 1] + ((us[i] - us[i - 1]) * (t - ts[i - 1])) / (ts[i] - ts[i - 1])
  return 1
}

/** A brazier's embers: how hot, breathing with the sleeper beside it (brighter on the out-breath). */
function heatOf(t: number, who: number): number {
  const breathOut = 0.5 + 0.5 * Math.cos(Math.PI * beatAt(t) + COURT[who].seed * 1.7)
  return (0.55 + 0.25 * breathOut) * (1 - ease(t, HAMMERS[5], 147.3))
}

function lightsAt(t: number, poses: Pose[]): Light[] {
  const out: Light[] = []
  // The tunnels' lantern light spilling in at the west door, once they are lit (the tunnels part lights them).
  const spill = ease(t, 36, 39.5) * (1 - ease(t, HAMMERS[5], HAMMERS[5] + 0.6))
  if (spill > 0) out.push({ x: 0.1, y: -1.1, s: 0.55 * spill, r: 3.2, w: 0.5, col: LAMP.glow })
  const flare = 1 + 0.35 * shout(t)
  for (const b of BRAZIERS) {
    const f = poses[b.who].puff
    out.push({ x: b.x, y: BRAZIER_Y - 0.1, s: Math.min(1, 0.5 * heatOf(t, b.who) + f), r: 2.1 + 2.4 * f, w: 0.75, col: mixHex(WORKS.rust, LAMP.glow, 0.35 + 0.5 * f) })
  }
  TORCHES.forEach((tc, i) => {
    const s = burning(t, tc.at, tc.out)
    if (s > 0) {
      const [x, y] = torchFlame(i)
      out.push({ x, y, s: s * flicker(t, i + 3) * flare, r: 6.4, w: 0.95, col: LAMP.glow })
    }
  })
  LANTERNS.forEach((at, i) => {
    const s = burning(t, at + (i === 0 ? 0.12 : 0), HAMMERS[2 + i])
    if (s > 0) {
      const [x, y] = rope(LANTERN_U[i])
      out.push({ x, y: y + 0.7, s: s * flicker(t, i + 7) * flare, r: 4.4, w: 0.8, col: LAMP.glow })
    }
  })
  const cs = burning(t, CROWN_LAMP, HAMMERS[5])
  if (cs > 0) out.push({ x: CROWN[0], y: CROWN[1] + 0.4, s: cs * flicker(t, 11) * flare, r: 8.6, w: 1.0, col: LAMP.glow })
  return out
}

/** How lit a point of the hall is, 0 (the dark) to 1, by the lights burning. */
function litAt(lights: Light[], x: number, y: number): number {
  let v = 0.03
  for (const l of lights) {
    const d = Math.hypot(x - l.x, y - l.y)
    if (d < l.r) v += l.s * l.w * Math.pow(1 - d / l.r, 1.2)
  }
  return Math.max(0, Math.min(1, v))
}

/* ------------------------------------------------------------------ small drawings */

const ctxOf = (p: p5) => p.drawingContext as CanvasRenderingContext2D

/** The pen for something in the dark: its ink sinks toward the rock with the light, so an unlit sleeper is a shape, not a drawing. */
const dim = (c: Pen, lit: number): Pen => ({ ...c, ink: mixHex(c.bg, c.ink, 0.22 + 0.78 * Math.max(0, Math.min(1, lit))) })

/** A shape through points (cells), closed, filled. */
function poly(p: p5, k: number, pts: Pt[], curve = false): void {
  p.beginShape()
  if (curve) {
    p.curveVertex(pts[0][0] * k, pts[0][1] * k)
    for (const [x, y] of pts) p.curveVertex(x * k, y * k)
    p.curveVertex(pts[pts.length - 1][0] * k, pts[pts.length - 1][1] * k)
  } else for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** The hollow of the hall: the back wall, a step lighter than the rock; the smoke hole going up over the chimney's column. */
function drawRoom(p: p5, c: Pen, lit: number): void {
  const k = c.k
  // From the west wall's inner face: the doorway west of it, and the tunnel beyond, are the tunnels part's to draw.
  const pts: Pt[] = [[0.3, FL + 0.02], [0.3, -2.6]]
  for (const [x, y] of VAULT) {
    if (x <= 0.3) continue
    if (x === CHIMNEY_X) {
      pts.push([x - 0.95, vaultY(x - 0.95)], [x - 0.55, -12.4], [x + 0.55, -12.4], [x + 0.95, vaultY(x + 0.95)])
      continue
    }
    pts.push([x, y])
  }
  pts.push([30.6, FL + 0.02])
  p.noStroke()
  p.fill(mixHex(mixHex(STONE.deep, STONE.dark, 0.5), STONE.dark, lit))
  poly(p, k, pts)
}

/** The court's benches cut in the rock: terraces stepping down from the dark gallery to the front bench, lit where the light falls. */
const TIER_X1 = [12.9, 12.6, 12.4, 12.2]
function drawTerraces(p: p5, c: Pen, lit: (x: number, y: number) => number): void {
  const k = c.k
  const seats = [ROW_Y[0], ROW_Y[1], ROW_Y[2], GALLERY_Y]
  p.noStroke()
  for (let r = 3; r >= 0; r--) {
    const top = seats[r]
    const bottom = r === 0 ? FL : seats[r - 1]
    const x0 = 0.3
    const x1 = TIER_X1[r]
    // The riser, and the lip of the seat over it (the pools of light drawn over them do the lighting).
    const l = 0.35 * lit(6, (top + bottom) / 2)
    p.fill(mixHex(mixHex(STONE.deep, STONE.dark, 0.6), STONE.mid, 0.12 + l))
    p.rect(x0 * k, top * k, (x1 - x0) * k, (bottom - top) * k)
    p.fill(mixHex(STONE.dark, STONE.light, 0.22 + l))
    p.rect(x0 * k, top * k, (x1 - x0) * k, Math.max(1, 0.1 * k))
    // The terrace's end, a step lighter, where it meets the approach to the throne.
    p.fill(mixHex(STONE.dark, STONE.mid, 0.2 + 0.4 * lit(x1, top)))
    p.rect((x1 - 0.12) * k, top * k, 0.12 * k, (bottom - top) * k)
  }
  // The court's ways out at the west end of each bench: low dark archways into the trolls' warren.
  p.fill(mixHex(STONE.deep, TROLL.shade, 0.35))
  for (const y of [ROW_Y[1], ROW_Y[2], GALLERY_Y]) {
    const h = 1.15
    p.beginShape()
    p.vertex(0.3 * k, y * k)
    p.vertex(0.3 * k, (y - h * 0.7) * k)
    p.bezierVertex(0.3 * k, (y - h) * k, 1.05 * k, (y - h) * k, 1.05 * k, (y - h * 0.7) * k)
    p.vertex(1.05 * k, y * k)
    p.endShape(p.CLOSE)
  }
}

/** A pillar of living rock (index i), whole, cracked at its waist, or broken: its stump, and its fallen top. */
function drawPillar(p: p5, c: Pen, i: number, t: number, lights: Light[]): void {
  const k = c.k
  const x = PILLARS[i]
  const top = vaultY(x) - 0.4
  const lit = litAt(lights, x, -3)
  const body = mixHex(mixHex(STONE.deep, STONE.dark, 0.75), STONE.mid, 0.3 * lit)
  const crackAt = CRACKS[i]
  const fallAt = PILLAR_FALL[i]
  const dir = i === 0 ? -1 : 1
  // The shape, from the floor to the vault (or a stretch of it).
  const outline = (y0: number, y1: number, n = 14): Pt[] => {
    const l: Pt[] = []
    const r: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const y = y0 + ((y1 - y0) * j) / n
      const h = pillarHalf(y, top) * (1 + 0.05 * Math.sin(y * 2.3 + i))
      l.push([x - h, y])
      r.push([x + h, y])
    }
    return [...l, ...r.reverse()]
  }
  const drop = 0.7
  const fall0 = fallAt - drop
  p.noStroke()
  p.fill(body)
  if (t < fall0) {
    // Once cracked, the column's top has slipped a little on its break.
    const slip = t >= crackAt ? dir * 0.07 * ease(t, crackAt, crackAt + 0.1) + dir * 0.02 * ring(t - crackAt, 0.3, 20) : 0
    if (slip !== 0) {
      poly(p, k, outline(FL, WAIST + 0.02, 10))
      p.push()
      p.translate(slip * k, 0)
      poly(p, k, outline(WAIST + 0.02, top, 10))
      p.pop()
    } else poly(p, k, outline(FL, top))
    // Each flank catches the light on its side: a rim of lit stone down the column.
    for (const s of [-1, 1]) {
      const l = litAt(lights, x + s * 0.8, -2.2)
      if (l < 0.08) continue
      const rim: Pt[] = []
      const inner: Pt[] = []
      for (let j = 0; j <= 16; j++) {
        const y = FL + ((top + 0.6 - FL) * j) / 16
        const h = pillarHalf(y, top) * (1 + 0.05 * Math.sin(y * 2.3 + i))
        rim.push([x + s * h, y])
        inner.push([x + s * (h - 0.09 - 0.05 * l), y])
      }
      p.fill(mixHex(STONE.dark, STONE.light, Math.min(1, 0.85 * l)))
      poly(p, k, [...rim, ...inner.reverse()])
    }
  } else {
    // The stump, its top broken.
    poly(p, k, [...outline(FL, WAIST + 0.35, 8).slice(0, 9), [x + 0.1, WAIST + 0.15], ...outline(FL, WAIST + 0.35, 8).slice(9)])
    // The top: falls, turning away from the chimney's column, and lies where it lands.
    const u = Math.min(1, (t - fall0) / drop)
    const land = Math.max(0, t - fallAt)
    const g = u * u
    // The first leans its broken top against the west wall; the others lie along the floor.
    const lean = i === 0 ? 0.72 : 1.25
    const slide = i === 0 ? 0.9 : 1.6
    const angle = dir * (0.1 * g + lean * g * g) + (land > 0 ? dir * 0.05 * ring(land, 0.25, 16) : 0)
    const baseY = WAIST - 0.2 + (FL - 0.55 - (WAIST - 0.2)) * g
    p.push()
    p.translate((x + dir * slide * g) * k, baseY * k)
    p.rotate(angle)
    p.translate(-x * k, -(WAIST - 0.2) * k)
    poly(p, k, outline(WAIST - 0.2, top + 0.25, 10))
    p.pop()
    // The scar in the vault where it broke away, and the stones that come down after it (never over the chimney).
    p.fill(mixHex(STONE.deep, STONE.dark, 0.6))
    poly(p, k, [[x - 0.8, top + 0.45], [x - 0.3, top + 0.9], [x + 0.35, top + 0.8], [x + 0.85, top + 0.4]])
    for (let j = 0; j < 5; j++) {
      const sx = x + dir * 0.4 + (hash(j, i + 60) - 0.5) * 1.8
      if (Math.abs(sx - CHIMNEY_X) < 1.1) continue
      const lag = 0.08 + 0.12 * j
      const s = t - fall0 - lag
      if (s < 0) continue
      const sy0 = top + 0.7
      const land = FL - 0.15
      const T = Math.sqrt((2 * (land - sy0)) / 30)
      const r = 0.16 + 0.12 * hash(j, i + 70)
      const sy = s < T ? sy0 + 0.5 * 30 * s * s : land
      const spin = s < T ? s * (3 + 4 * hash(j, i)) : T * (3 + 4 * hash(j, i))
      p.fill(mixHex(STONE.mid, STONE.light, 0.3 * litAt(lights, sx, sy)))
      p.push()
      p.translate(sx * k, sy * k)
      p.rotate(spin)
      poly(p, k, [[-r, 0], [-r * 0.5, -r * 0.8], [r * 0.4, -r * 0.9], [r, -r * 0.1], [r * 0.6, r * 0.7], [-r * 0.6, r * 0.6]])
      p.pop()
    }
  }
  // The crack across its waist: a jagged dark line on the chord, widening.
  if (t >= crackAt && t < fall0 + 0.05) {
    const w = ease(t, crackAt, crackAt + 0.12)
    const hw = pillarHalf(WAIST, top)
    p.stroke(mixHex(STONE.deep, TROLL.shade, 0.3))
    p.strokeWeight(Math.max(1.5, (0.07 + 0.05 * ease(t, crackAt + 0.4, fall0)) * k))
    p.noFill()
    p.beginShape()
    for (let j = 0; j <= 6; j++) p.vertex((x - hw - 0.05 + (2 * hw + 0.1) * (j / 6) * w) * k, (WAIST + 0.1 * Math.sin(j * 2.1 + i) + 0.06 * (j % 2)) * k)
    p.endShape()
    // Grit spilling from the break.
    p.noStroke()
    for (let j = 0; j < 6; j++) {
      const s = t - crackAt - 0.05 * j
      if (s < 0 || s > 0.8) continue
      const gx = x + (hash(j, i + 40) - 0.5) * hw * 1.6 + (hash(j, i) - 0.5) * 0.3 * s
      p.fill(alpha(p, STONE.light, 0.8 * (1 - s / 0.8)))
      p.rect(gx * k, (WAIST + 0.5 * 14 * s * s) * k, 0.05 * k, 0.05 * k)
    }
  }
}

/** A brazier on the bench: an iron basket on short legs, banked embers, the flare. */
function drawBrazier(p: p5, c: Pen, x: number, t: number, heat: number, flare: number, lit: number): void {
  const k = c.k
  const y0 = ROW_Y[0]
  const yb = BRAZIER_Y
  const inkC = mixHex(STONE.dark, c.ink, 0.3 + 0.5 * lit)
  p.stroke(inkC)
  p.strokeWeight(Math.max(1, 0.05 * k))
  for (const s of [-1, 1]) p.line((x + s * 0.12) * k, (yb + 0.02) * k, (x + s * 0.22) * k, y0 * k)
  p.strokeWeight(c.weight * 0.9)
  p.fill(mixHex(WORKS.iron, WORKS.steel, 0.3 * lit))
  poly(p, k, [[x - 0.3, yb - 0.17], [x + 0.3, yb - 0.17], [x + 0.2, yb + 0.03], [x - 0.2, yb + 0.03]])
  // The embers heaped in it: a dark mound, cracked with red that glows with the breath, amber in the flare.
  const hot = Math.max(0, Math.min(1, 0.25 + 0.5 * heat + flare))
  const top = yb - 0.17
  p.noStroke()
  p.fill(mixHex(TROLL.shade, WORKS.rust, 0.25 + 0.35 * hot))
  poly(p, k, [[x - 0.27, top], [x - 0.2, top - 0.07], [x - 0.08, top - 0.1], [x + 0.03, top - 0.13], [x + 0.14, top - 0.09], [x + 0.24, top - 0.05], [x + 0.27, top]], true)
  p.fill(mixHex(WORKS.rust, LAMP.core, Math.max(0, hot - 0.45) * 0.9))
  poly(p, k, [[x - 0.19, top], [x - 0.12, top - 0.05], [x - 0.02, top - 0.07], [x + 0.06, top - 0.09], [x + 0.13, top - 0.05], [x + 0.19, top]], true)
  if (flare > 0.02) for (let j = 0; j < 3; j++) flame(p, c, x - 0.14 + 0.14 * j, yb - 0.17, (0.2 + 0.75 * flare) * (0.75 + 0.35 * hash(j, 13)), t, j * 3 + x, Math.min(1, flare * 1.6))
}

/** Catmull-Rom through points: a smooth line, `n` samples a span. */
function smoothLine(pts: Pt[], n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < n; j++) {
      const u = j / n
      const u2 = u * u
      const u3 = u2 * u
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/**
 * A sleeper's tail: out from under it, over the bench's edge, down its face and along the floor (his stepping stone),
 * a dark tuft at its end. It flicks (the far half lifts and curls, and settles), and is drawn in as its troll gets up.
 */
function drawTail(p: p5, c: Pen, tail: Tail, flick: number, lit: number, hide: string, gone: number): void {
  if (gone >= 1) return
  const k = c.k
  const dir = Math.sign(tail.tuft - tail.hang) || 1
  const [rx, ry] = tail.root
  const yf = FL - 0.075
  // Drawn in: the floor part shortens back toward the bench and the whole lifts off the floor.
  const reach = (tail.tuft - tail.hang) * (1 - gone)
  const lift = 0.5 * gone
  const ctrl: Pt[] = [
    [rx, ry],
    [tail.hang - dir * 0.06, ROW_Y[0] + 0.02],
    [tail.hang + dir * 0.04, (ROW_Y[0] + yf) / 2 - lift * 0.5],
    [tail.hang + dir * 0.16, yf - lift],
    [tail.hang + reach * 0.55, yf - 0.02 - lift],
    [tail.hang + reach, yf - 0.05 - lift],
  ]
  const pts = smoothLine(ctrl, 6)
  // The flick: the floor half lifts and curls up, and settles.
  const pivot = pts.length - 10
  if (flick > 0) {
    const [ox, oy] = pts[pivot]
    for (let j = pivot + 1; j < pts.length; j++) {
      const w = Math.pow((j - pivot) / (pts.length - 1 - pivot), 1.4)
      const ang = -dir * 1.3 * flick * w
      const dx = pts[j][0] - ox
      const dy = pts[j][1] - oy
      pts[j] = [ox + dx * Math.cos(ang) - dy * Math.sin(ang), oy + dx * Math.sin(ang) + dy * Math.cos(ang)]
    }
  }
  const pen = dim(c, lit)
  const inkC = mixHex(c.bg, pen.ink, 0.4 + 0.6 * lit)
  const hideC = mixHex(c.bg, hide, 0.3 + 0.7 * lit)
  const n = pts.length - 1
  p.noFill()
  for (const [col, wide, extra] of [[inkC, 0.15, c.weight * 1.2], [hideC, 0.15, 0]] as const) {
    p.stroke(col)
    for (let j = 0; j < n; j++) {
      p.strokeWeight(Math.max(1, wide * (1 - 0.5 * (j / n)) * k + extra))
      p.line(pts[j][0] * k, pts[j][1] * k, pts[j + 1][0] * k, pts[j + 1][1] * k)
    }
  }
  // The tuft, pointing on along the tail.
  const [tx, ty] = pts[n]
  const [bx, by] = pts[n - 2]
  const a = Math.atan2(ty - by, tx - bx)
  p.push()
  p.translate(tx * k, ty * k)
  p.rotate(a + Math.PI / 2)
  p.stroke(inkC)
  p.strokeWeight(c.weight * 0.8)
  p.fill(mixHex(c.bg, TROLL.old, 0.4 + 0.6 * lit))
  p.beginShape()
  p.vertex(0, 0.03 * k)
  p.bezierVertex(-0.11 * k, -0.01 * k, -0.06 * k, -0.2 * k, 0, -0.25 * k)
  p.bezierVertex(0.06 * k, -0.2 * k, 0.11 * k, -0.01 * k, 0, 0.03 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The chain of lanterns on its oiled rope, and the crown-lamp over the throne. */
function drawLamps(p: p5, c: Pen, t: number, lit: number, sway: number): void {
  const k = c.k
  const b = burnt(t)
  const iron = mixHex(WORKS.iron, c.ink, 0.25 + 0.3 * lit)
  // The chains from the vault: the first lantern's, and the crown-lamp's.
  p.stroke(iron)
  p.strokeWeight(Math.max(1, c.weight * 0.7))
  p.line(ROPE0[0] * k, vaultY(ROPE0[0]) * k, ROPE0[0] * k, ROPE0[1] * k)
  p.line(ROPE1[0] * k, vaultY(ROPE1[0]) * k, ROPE1[0] * k, ROPE1[1] * k)
  // The rope: charred behind the fire, rope-coloured ahead of it, the fire itself running along it.
  const n = 30
  p.strokeWeight(Math.max(1, c.weight * 0.9))
  for (let j = 0; j < n; j++) {
    const u0 = j / n
    const u1 = (j + 1) / n
    const [x0, y0] = rope(u0)
    const [x1, y1] = rope(u1)
    p.stroke(u1 <= b ? mixHex(TROLL.shade, WORKS.rust, 0.25) : mixHex(c.bg, WORKS.rope, 0.35 + 0.6 * lit))
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  }
  if (b > 0 && b < 1) {
    const [fx, fy] = rope(b)
    flame(p, c, fx, fy + 0.03, 0.26, t, 4, 1)
  }
  // The three lanterns.
  LANTERNS.forEach((at, i) => {
    const [x, y] = rope(LANTERN_U[i])
    const l = burning(t, at + (i === 0 ? 0.12 : 0), HAMMERS[2 + i])
    drawLantern(p, dim(c, Math.max(l, lit)), x, y, { lit: l, t, seed: i + 7, size: 0.4, hang: 0.28, swing: sway * (1 + 0.3 * i) })
  })
  // The crown-lamp: an iron ring on three chains, its five flames catching one after another around it.
  const cl = burning(t, CROWN_LAMP, HAMMERS[5])
  const [cx, cy] = CROWN
  p.push()
  p.translate(ROPE1[0] * k, ROPE1[1] * k)
  p.rotate(sway * 0.6)
  p.translate(-ROPE1[0] * k, -ROPE1[1] * k)
  p.stroke(iron)
  p.strokeWeight(Math.max(1, c.weight * 0.7))
  for (const s of [-1, 0, 1]) p.line((cx + s * 0.85) * k, cy * k, ROPE1[0] * k, ROPE1[1] * k)
  p.stroke(mixHex(c.bg, c.ink, 0.3 + 0.5 * lit))
  p.strokeWeight(c.weight)
  p.fill(mixHex(WORKS.iron, WORKS.steel, 0.3 * lit))
  p.ellipse(cx * k, cy * k, 1.9 * k, 0.26 * k)
  p.noStroke()
  p.fill(mixHex(c.bg, STONE.dark, 0.5))
  p.ellipse(cx * k, (cy - 0.02) * k, 1.55 * k, 0.12 * k)
  for (let j = 0; j < 5; j++) {
    const fx = cx - 0.76 + 0.38 * j
    const fy = cy - 0.08
    const lj = ease(t, CROWN_LAMP - 0.05 + 0.06 * j, CROWN_LAMP + 0.2 + 0.06 * j) * (1 - ease(t, HAMMERS[5], HAMMERS[5] + 0.25))
    p.stroke(mixHex(c.bg, c.ink, 0.3 + 0.4 * lit))
    p.strokeWeight(c.weight * 0.7)
    p.fill(WORKS.iron)
    p.rect((fx - 0.07) * k, (fy - 0.04) * k, 0.14 * k, 0.08 * k)
    if (lj > 0) flame(p, c, fx, fy - 0.04, 0.26 * cl + 0.06, t, j + 20, lj)
  }
  p.pop()
}

/** The dais: two broad steps of dressed stone. */
function drawDais(p: p5, c: Pen, lit: number): void {
  const k = c.k
  const { x0, x1, step, top, inset } = DAIS
  p.noStroke()
  p.fill(mixHex(STONE.dark, STONE.mid, 0.35 + 0.65 * lit))
  p.rect(x0 * k, step * k, (x1 - x0) * k, (FL - step) * k)
  p.fill(mixHex(STONE.dark, STONE.mid, 0.45 + 0.55 * lit))
  p.rect((x0 + inset) * k, top * k, (x1 - x0 - 2 * inset) * k, (step - top) * k)
  p.fill(mixHex(STONE.mid, STONE.light, lit))
  p.rect(x0 * k, step * k, (x1 - x0) * k, Math.max(1, 0.05 * k))
  p.rect((x0 + inset) * k, top * k, (x1 - x0 - 2 * inset) * k, Math.max(1, 0.05 * k))
}

/** A tapering horn along a smooth centre line: wide at its root, a point at its tip. */
function horn(p: p5, k: number, line: Pt[], root: number): void {
  const pts = smoothLine(line, 6)
  const n = pts.length - 1
  const l: Pt[] = []
  const r: Pt[] = []
  for (let j = 0; j <= n; j++) {
    const [x0, y0] = pts[Math.max(0, j - 1)]
    const [x1, y1] = pts[Math.min(n, j + 1)]
    const L = Math.hypot(x1 - x0, y1 - y0) || 1
    const w = (root / 2) * Math.pow(1 - j / n, 0.8)
    l.push([pts[j][0] - ((y1 - y0) / L) * w, pts[j][1] + ((x1 - x0) / L) * w])
    r.push([pts[j][0] + ((y1 - y0) / L) * w, pts[j][1] - ((x1 - x0) / L) * w])
  }
  poly(p, k, [...l, ...r.reverse()])
}

/**
 * The throne: a seat hewn from the mountain, its back crested with three peaks (the Dovre's), gold on their tips, and
 * two great tusks rising behind it. It topples east on the first hammer blow, landing on the next.
 */
function drawThrone(p: p5, c: Pen, t: number, lit: number): void {
  const k = c.k
  const { x, seat, w } = THRONE
  const tip = t >= HAMMERS[0] ? Math.min(1, Math.pow((t - HAMMERS[0]) / (HAMMERS[1] - HAMMERS[0]), 2)) : 0
  const settle = t >= HAMMERS[1] ? 0.04 * ring(t - HAMMERS[1], 0.3, 18) : 0
  const pen = dim(c, lit)
  const inkC = mixHex(c.bg, pen.ink, 0.4 + 0.6 * lit)
  const pivot: Pt = [x + w / 2 + 0.1, DAIS.top]
  p.push()
  p.translate(pivot[0] * k, pivot[1] * k)
  p.rotate(1.35 * tip + settle)
  p.translate(-pivot[0] * k, -pivot[1] * k)
  p.stroke(inkC)
  p.strokeWeight(c.weight)
  // The tusks, behind: out and up from the dais, curling in at their points.
  p.fill(mixHex(c.bg, TROLL.bone, 0.22 + 0.42 * lit))
  for (const s of [-1, 1]) {
    horn(p, k, [[x + s * 1.05, DAIS.top], [x + s * 1.75, -2.2], [x + s * 2.2, -3.9], [x + s * 2.05, -5.0], [x + s * 1.7, -5.45]], 0.42)
  }
  // The back: a slab of the mountain, crested with three rounded peaks.
  p.fill(mixHex(STONE.dark, STONE.mid, 0.35 + 0.65 * lit))
  const back: Pt[] = [
    [x - w / 2 - 0.05, DAIS.top], [x - w / 2 + 0.02, -3.6], [x - 0.78, -4.45], [x - 0.42, -4.12], [x, -5.05], [x + 0.42, -4.12], [x + 0.78, -4.45],
    [x + w / 2 - 0.02, -3.6], [x + w / 2 + 0.05, DAIS.top],
  ]
  poly(p, k, back, true)
  // Gold on the peaks' tips, and nowhere else.
  p.fill(mixHex(c.bg, GOLD, 0.35 + 0.65 * lit))
  for (const [px, py, r] of [[x - 0.78, -4.45, 0.13], [x, -5.05, 0.16], [x + 0.78, -4.45, 0.13]] as const) {
    poly(p, k, [[px - r, py + r * 0.9], [px - r * 0.55, py + 0.02], [px, py - r * 0.35], [px + r * 0.55, py + 0.02], [px + r, py + r * 0.9], [px, py + r * 0.55]])
  }
  // The seat and its arms.
  p.fill(mixHex(STONE.dark, STONE.mid, 0.5 + 0.5 * lit))
  p.rect((x - w / 2 + 0.12) * k, seat * k, (w - 0.24) * k, (DAIS.top - seat) * k)
  for (const s of [-1, 1]) {
    const ax = x + s * (w / 2 - 0.1)
    poly(p, k, [[ax - 0.2, DAIS.top], [ax - 0.2, -1.62], [ax - 0.1, -1.75], [ax + 0.1, -1.75], [ax + 0.2, -1.62], [ax + 0.2, DAIS.top]], false)
  }
  p.pop()
}

/** The King: the biggest troll, his crown, his sceptre. `pose` from `kingAt` (hall-court.ts). Exported for the finale. */
export function drawKing(p: p5, c: Pen, pose: KingPose, lit: number): TrollDrawn {
  const k = c.k
  const ctx = ctxOf(p)
  const a0 = ctx.globalAlpha
  if (pose.alpha < 1) ctx.globalAlpha = a0 * Math.max(0, pose.alpha)
  const drawn = drawTroll(p, dim(c, lit), pose.x, pose.y, { ...pose.look, lit })
  const hand = drawn.hands[1]
  // The sceptre, gripped low in his right fist: an iron staff with a gold head of flanges (never a ball).
  const ang = pose.sceptre
  const L = SCEPTRE.len
  const [hx, hy] = hand?.at ?? [pose.x + 0.8, pose.y - 1]
  const bx = hx - Math.cos(ang) * L * SCEPTRE.grip
  const by = hy - Math.sin(ang) * L * SCEPTRE.grip
  const tx = hx + Math.cos(ang) * L * (1 - SCEPTRE.grip)
  const ty = hy + Math.sin(ang) * L * (1 - SCEPTRE.grip)
  const inkC = mixHex(c.bg, c.ink, 0.35 + 0.65 * lit)
  p.stroke(inkC)
  p.strokeWeight(Math.max(1, 0.11 * k + c.weight))
  p.line(bx * k, by * k, tx * k, ty * k)
  p.stroke(mixHex(c.bg, WORKS.steel, 0.3 + 0.7 * lit))
  p.strokeWeight(Math.max(1, 0.11 * k - c.weight * 0.5))
  p.line(bx * k, by * k, tx * k, ty * k)
  const gold = mixHex(c.bg, GOLD, 0.3 + 0.7 * lit)
  p.push()
  p.translate(tx * k, ty * k)
  p.rotate(ang + Math.PI / 2)
  p.stroke(inkC)
  p.strokeWeight(c.weight)
  p.fill(gold)
  // The head: flanges round a short spike.
  const hs = 0.2
  poly(p, k, [
    [0, 0.05], [-hs, -0.02], [-hs * 0.55, -0.12], [-hs * 0.95, -0.24], [-hs * 0.3, -0.3], [0, -0.46], [hs * 0.3, -0.3], [hs * 0.95, -0.24],
    [hs * 0.55, -0.12], [hs, -0.02],
  ])
  p.pop()
  // The crown: a gold band on his skull with five points, slid askew while he dozed.
  const hw = drawn.headW
  const [cx] = drawn.head
  const face = pose.look.face ?? 0
  p.push()
  p.translate((cx + face * hw * 0.06) * k, (drawn.crown + 0.1) * k)
  p.rotate(pose.crownTilt)
  p.stroke(inkC)
  p.strokeWeight(c.weight)
  p.fill(gold)
  const bw = hw * 0.62
  const bh = 0.2
  const crown: Pt[] = [[-bw * 0.5, 0], [-bw * 0.56, -bh]]
  for (let j = 0; j < 5; j++) {
    const px = -bw * 0.56 + bw * 1.12 * (j / 4)
    const tall = j === 2 ? 0.34 : j % 2 ? 0.2 : 0.28
    if (j > 0) crown.push([px - bw * 0.13, -bh])
    crown.push([px, -(bh + tall)])
    if (j < 4) crown.push([px + bw * 0.13, -bh])
  }
  crown.push([bw * 0.56, -bh], [bw * 0.5, 0])
  poly(p, k, crown)
  p.noStroke()
  p.fill(mixHex(gold, TROLL.shade, 0.35))
  p.rect(-bw * 0.5 * k, -0.07 * k, bw * k, 0.05 * k)
  p.pop()
  ctx.globalAlpha = a0
  return drawn
}

/** The floor of the hall: the slab, cut by the hatch's shaft and (from the collapse) the chimney's hole. */
function drawFloor(p: p5, c: Pen, t: number, lit: (x: number) => number): void {
  const k = c.k
  const pieces: [number, number][] = []
  const broke = t >= FLOOR_BREAK
  const holes: [number, number][] = [[HATCH.x0, HATCH.x1]]
  if (broke) holes.unshift([CHIMNEY_X - 0.55, CHIMNEY_X + 0.55])
  let from = -0.6
  for (const [a, b] of holes) {
    pieces.push([from, a])
    from = b
  }
  pieces.push([from, 30.6])
  const depth = 1.45
  p.noStroke()
  for (const [a, b] of pieces) {
    p.fill(mixHex(mixHex(STONE.deep, STONE.dark, 0.7), STONE.mid, 0.6 * lit((a + b) / 2)))
    p.beginShape()
    p.vertex(a * k, FL * k)
    p.vertex(b * k, FL * k)
    const n = Math.max(2, Math.round((b - a) * 1.4))
    for (let j = n; j >= 0; j--) {
      const u = j / n
      const r = 0.5 + 0.5 * Math.sin(a * 3.1 + j * 2.3) * Math.sin(j * 1.7 + 1)
      p.vertex((a + (b - a) * u) * k, (FL + depth * (0.85 + 0.15 * r)) * k)
    }
    p.endShape(p.CLOSE)
    // Its lit lip, in stretches, each as lit as the light over it.
    const m = Math.max(1, Math.round((b - a) / 1.5))
    for (let j = 0; j < m; j++) {
      const x0 = a + ((b - a) * j) / m
      const x1 = a + ((b - a) * (j + 1)) / m
      p.fill(mixHex(STONE.dark, STONE.light, 0.15 + 0.8 * lit((x0 + x1) / 2)))
      p.rect(x0 * k, FL * k, (x1 - x0) * k + 1, Math.max(1, 0.055 * k))
    }
  }
  // The hatch's shaft: always there under it, the trolls' way down to the mine.
  p.fill(mixHex(STONE.deep, TROLL.shade, 0.25))
  p.rect(HATCH.x0 * k, (FL + 0.18) * k, (HATCH.x1 - HATCH.x0) * k, (depth + 0.5) * k)
  if (broke) {
    // The chimney's column: the floor burst open, ragged teeth at its edges.
    p.rect((CHIMNEY_X - 0.55) * k, FL * k, 1.1 * k, (depth + 0.5) * k)
    p.fill(mixHex(STONE.dark, STONE.mid, 0.4))
    for (const s of [-1, 1]) {
      const ex = CHIMNEY_X + s * 0.55
      poly(p, k, [[ex, FL], [ex - s * 0.18, FL + 0.25], [ex, FL + 0.5], [ex - s * 0.12, FL + 0.9], [ex, FL + 1.3]])
    }
  }
}

/** The hatch: a flagstone hinged at its east edge; it lurches when the crack reaches it, then swings down. */
function drawHatch(p: p5, c: Pen, t: number, lit: number): void {
  const k = c.k
  const lurch = 0.083 * ease(t, LURCH - 0.06, LURCH)
  let ang = lurch
  if (t >= OPEN) {
    const s = t - OPEN
    const u = Math.min(1, s / 0.32)
    ang = lurch + (Math.PI / 2 - lurch) * u * u - (s > 0.32 ? 0.2 * Math.exp(-(s - 0.32) / 0.6) * Math.sin((s - 0.32) * 9) : 0)
  }
  const len = HATCH.x1 - HATCH.x0
  const jolt = t >= CRACK[1] ? 0.02 * ring(t - CRACK[1], 0.12, 40) : 0
  p.push()
  p.translate(HATCH.hinge * k, (FL + jolt) * k)
  p.rotate(-ang)
  p.stroke(mixHex(c.bg, c.ink, 0.3 + 0.5 * lit))
  p.strokeWeight(c.weight)
  p.fill(mixHex(STONE.dark, STONE.mid, 0.4 + 0.6 * lit))
  p.rect(-len * k, 0, len * k, 0.18 * k)
  p.noStroke()
  p.fill(mixHex(WORKS.iron, WORKS.steel, 0.4 * lit))
  p.rect(-len * k, 0.07 * k, len * 0.85 * k, 0.045 * k)
  p.pop()
  p.noStroke()
  p.fill(WORKS.iron)
  p.rect((HATCH.hinge - 0.05) * k, (FL - 0.02) * k, 0.12 * k, 0.1 * k)
}

/** The crack from where the sceptre fell, along the dais, down its steps and across the floor to the hatch. */
function drawCrack(p: p5, c: Pen, t: number, from: Pt): void {
  if (t < SMASH) return
  const k = c.k
  const edge = DAIS.x1 + 0.25
  const run = t < CRACK[0] - 0.04
    ? from[0] + (edge - from[0]) * ease(t, SMASH, SMASH + 0.16)
    : t < CRACK[1] - 0.04
      ? edge + (25.3 - edge) * ease(t, CRACK[0] - 0.04, CRACK[0] + 0.06)
      : 25.3 + (HATCH.x0 - 25.3) * ease(t, CRACK[1] - 0.04, CRACK[1] + 0.06)
  const surf = (x: number): number => (x < DAIS.x1 - DAIS.inset ? DAIS.top : x < DAIS.x1 ? DAIS.step : FL)
  const pts: Pt[] = []
  for (let x = from[0]; x < run; x += 0.12) pts.push([x, surf(x) + 0.06 + 0.04 * Math.sin(x * 11.3) + 0.03 * Math.sin(x * 23.1)])
  pts.push([run, surf(run) + 0.06])
  p.noFill()
  p.stroke(mixHex(STONE.deep, TROLL.shade, 0.3))
  p.strokeWeight(Math.max(1, 0.05 * k))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
  // The notch where the head came down.
  p.noStroke()
  p.fill(mixHex(STONE.deep, TROLL.shade, 0.3))
  poly(p, k, [[from[0] - 0.28, DAIS.top], [from[0] - 0.1, DAIS.top + 0.13], [from[0] + 0.12, DAIS.top + 0.1], [from[0] + 0.28, DAIS.top]])
  // Chips thrown up by the blow and at each jump of the crack.
  for (const [at, x0, y0] of [[SMASH, from[0], DAIS.top], [CRACK[0], 25.3, FL], [CRACK[1], HATCH.x0, FL]] as const) {
    const s = t - at
    if (s < 0 || s > 0.6) continue
    for (let j = 0; j < 5; j++) {
      const px = x0 + (hash(j, at * 10) - 0.5) * 2.2 * s
      const py = y0 - (1.6 + 1.4 * hash(j, 3)) * s + 0.5 * 14 * s * s
      if (py > y0 + 0.02) continue
      p.fill(alpha(p, STONE.light, 1 - s / 0.6))
      const r = 0.035 + 0.03 * hash(j, 7)
      poly(p, k, [[px - r, py], [px, py - r * 0.8], [px + r, py + r * 0.2], [px + r * 0.1, py + r]])
    }
  }
}

/** Sparks from a brazier's flare up to the torch they catch. */
function drawSparks(p: p5, c: Pen, t: number, from: Pt, to: Pt, at: number, catchAt: number): void {
  const s = t - at
  const span = catchAt - at
  if (s < 0 || s > span + 0.3) return
  const k = c.k
  p.noStroke()
  for (let j = 0; j < 15; j++) {
    const lead = j === 0 ? 1 : 0.55 + 0.4 * hash(j, 17)
    const u = Math.min(1.2, (s / span) * lead * (1 + 0.1 * hash(j, 3)))
    if (u <= 0) continue
    const fade = j === 0 ? (s <= span ? 1 : 1 - (s - span) / 0.3) : Math.max(0, 1 - u / (0.75 + 0.3 * hash(j, 5)))
    if (fade <= 0) continue
    const e = 1 - (1 - Math.min(1, u)) * (1 - Math.min(1, u))
    const wob = (1 - e) * 0.25 * Math.sin(u * 9 + j * 2.1) * (j === 0 ? 0.3 : 1)
    const x = from[0] + (to[0] - from[0]) * e + wob + (j === 0 ? 0 : (hash(j, 11) - 0.5) * 0.5 * e)
    const y = from[1] + (to[1] - from[1]) * Math.min(1, u) * (j === 0 ? 1 : 0.8 + 0.3 * hash(j, 23))
    p.fill(alpha(p, j % 2 === 0 ? LAMP.core : LAMP.flame, fade))
    const r = j === 0 ? 0.085 : 0.05 + 0.035 * hash(j, 29)
    p.ellipse(x * k, y * k, r * k, r * k)
  }
}

/* ------------------------------------------------------------------ what falls */

function drawRubble(p: p5, c: Pen, t: number): void {
  const k = c.k
  // Where each pillar's top landed.
  const heaps = [
    { at: PILLAR_FALL[0], x: PILLARS[0] - 2.4, w: 2.4, seed: 1 },
    { at: PILLAR_FALL[1], x: PILLARS[1] + 2.7, w: 2.6, seed: 2 },
    { at: PILLAR_FALL[2], x: PILLARS[2] + 2.4, w: 2.0, seed: 3 },
  ]
  p.noStroke()
  for (const h of heaps) {
    if (t < h.at + 0.05) continue
    const u = ease(t, h.at + 0.05, h.at + 0.4)
    for (let j = 0; j < 7; j++) {
      const x = h.x - h.w / 2 + (h.w * (j + 0.5)) / 7 + (hash(j, h.seed) - 0.5) * 0.3
      const r = (0.2 + 0.2 * hash(j, h.seed + 5)) * u
      p.fill(mixHex(STONE.dark, STONE.mid, 0.3 + 0.3 * hash(j, h.seed + 9)))
      poly(p, k, [[x - r, FL], [x - r * 0.7, FL - r * 0.9], [x + r * 0.2, FL - r * 1.2], [x + r, FL - r * 0.5], [x + r * 0.9, FL]])
    }
  }
}

/** Stalactites hanging from the vault; four of them fall on the last blows (never over the chimney's column). */
const DRIPSTONES: { x: number; len: number; w: number; falls?: number }[] = [
  { x: 1.9, len: 0.9, w: 0.34, falls: HAMMERS[2] },
  { x: 3.3, len: 0.6, w: 0.26 },
  { x: 5.9, len: 1.1, w: 0.38 },
  { x: 11.6, len: 0.8, w: 0.3 },
  { x: 14.4, len: 1.3, w: 0.4, falls: HAMMERS[3] },
  { x: 15.9, len: 0.7, w: 0.28 },
  { x: 17.2, len: 1.0, w: 0.34, falls: HAMMERS[4] },
  { x: 22.3, len: 1.2, w: 0.38, falls: HAMMERS[5] },
  { x: 24.0, len: 0.6, w: 0.26 },
  { x: 26.6, len: 0.9, w: 0.3 },
]

function drawDripstones(p: p5, c: Pen, t: number, lights: Light[]): void {
  const k = c.k
  DRIPSTONES.forEach((d, i) => {
    const top = vaultY(d.x) - 0.1
    const lit = litAt(lights, d.x, top + 1) * 0.8
    if (d.falls === undefined || t < d.falls - 0.9) {
      stalactite(p, c, d.x, top, d.len, d.w, lit, i)
      return
    }
    // It lets go and falls, landing on its blow, and breaks.
    const floor = d.x > DAIS.x0 && d.x < DAIS.x1 ? DAIS.top : FL
    const drop = floor - (top + d.len)
    const T = Math.sqrt((2 * drop) / 30)
    const s = t - (d.falls - T)
    if (t < d.falls) {
      stalactite(p, c, d.x, top + Math.max(0, 0.5 * 30 * s * Math.abs(s) * (s > 0 ? 1 : 0)), d.len, d.w, lit, i)
    } else {
      p.noStroke()
      p.fill(mixHex(STONE.dark, STONE.mid, 0.35))
      for (let j = 0; j < 3; j++) {
        const x = d.x - 0.25 + 0.25 * j
        const r = 0.12 + 0.06 * hash(j, i)
        poly(p, k, [[x - r, floor], [x - r * 0.5, floor - r], [x + r * 0.6, floor - r * 0.8], [x + r, floor]])
      }
    }
  })
}

/* ------------------------------------------------------------------ the whole hall */

let crackFrom: Pt | null = null

/** Where the King's right hand is for a pose (his troll's arm), measured with the canvas's paint turned off. */
function kingHand(p: p5, c: Pen, pose: KingPose): Pt | undefined {
  const ctx = ctxOf(p)
  const a0 = ctx.globalAlpha
  ctx.globalAlpha = 0
  const drawn = drawTroll(p, c, pose.x, pose.y, pose.look)
  ctx.globalAlpha = a0
  return drawn.hands[1]?.at
}

/** One of the court: its troll, and in the dark gallery the glint of its eyes. */
function drawCourtier(p: p5, c: Pen, pose: Pose, lit: number, gallery: boolean): void {
  const ctx = ctxOf(p)
  const a0 = ctx.globalAlpha
  if (pose.alpha < 1) ctx.globalAlpha = a0 * pose.alpha
  const drawn = drawTroll(p, dim(c, lit), pose.x, pose.y, { ...pose.look, lit, dark: gallery ? mixHex(STONE.deep, STONE.dark, 0.6) : undefined })
  // Eyes open in the dark catch the light: the gallery's are all that is seen of them; the others' shine where it is dim.
  const shine = gallery ? pose.glint : pose.glint * (1 - Math.min(1, lit * 1.4))
  if (shine > 0.05) {
    const k = c.k
    const size = pose.look.size
    const face = pose.look.face ?? 0
    const hw = drawn.headW
    const [hx, hy] = drawn.head
    p.noStroke()
    for (const s of [-1, 1]) {
      if (s !== Math.sign(face || 1) && Math.abs(face) > 0.8) continue
      const ex = hx + face * hw * 0.28 + s * hw * 0.17 * (1 - 0.4 * Math.abs(face))
      p.fill(alpha(p, TROLL.bone, Math.min(1, shine) * 0.9))
      p.ellipse(ex * k, (hy - 0.024 * size) * k, 0.06 * size * k, 0.032 * size * Math.min(1.4, pose.glint) * k)
    }
  }
  ctx.globalAlpha = a0
}

/**
 * The whole hall at show time `t`, in the court part's frame (floor at y = R, the west door at x ≈ 0, the throne
 * at x ≈ 19.7, the hatch at 27.5). Everything shakes with `quake(t)`.
 */
export function drawHall(p: p5, c: Pen, t: number): void {
  const k = c.k
  const f = frame(p, k)
  const seen = (x0: number, x1: number): boolean => x1 > f.x0 - 0.5 && x0 < f.x1 + 0.5
  const [qx, qy] = quake(t)
  // The sceptre's blow and the crack's jumps shake the hall itself.
  const jolt = 0.05 * ring(t - SMASH, 0.22, 34) + 0.02 * ring(t - CRACK[0], 0.15, 34) + 0.02 * ring(t - CRACK[1], 0.15, 34)
  p.push()
  p.translate(qx * k, (qy + jolt) * k)
  p.rectMode(p.CORNER)
  p.strokeJoin(p.ROUND)

  const poses = COURT.map((cr) => courtierAt(cr, t))
  const lights = lightsAt(t, poses)
  const lit = (x: number, y: number) => litAt(lights, x, y)
  const hallLit = Math.min(1, lights.reduce((s, l) => s + (l.w > 0.6 ? l.s * 0.2 : 0), 0))

  drawRoom(p, c, 0.1 + 0.5 * hallLit)
  drawDripstones(p, c, t, lights)
  if (seen(0, 13)) drawTerraces(p, c, lit)
  // The pools of light on the rock, before anything they light; the pillars stand dark against them, lit at the rim.
  for (const l of lights) glow(p, c, l.x, l.y, l.r * 0.95, Math.min(0.45, 0.3 * l.s), l.col)
  for (let i = 0; i < PILLARS.length; i++) if (seen(PILLARS[i] - 3.5, PILLARS[i] + 3.5)) drawPillar(p, c, i, t, lights)

  // The gallery and the tiers, back to front, and the court on them.
  for (const row of [3, 2, 1] as const) {
    COURT.forEach((cr, i) => {
      if (cr.row !== row) return
      const pose = poses[i]
      if (pose.alpha <= 0 || !seen(pose.x - 1.2, pose.x + 1.2)) return
      drawCourtier(p, c, pose, row === 3 ? 0.25 * lit(pose.x, pose.y - 0.8) : lit(pose.x, pose.y - 0.7), row === 3)
    })
  }

  // The torches on the first pillar.
  TORCHES.forEach((tc, i) => {
    if (!seen(tc.foot[0] - 1, tc.foot[0] + 1)) return
    const l = burning(t, tc.at, tc.out)
    drawTorch(p, dim(c, Math.max(l, lit(tc.foot[0], tc.foot[1]))), tc.foot[0], tc.foot[1], { lit: l * (1 + 0.3 * shout(t)), t, seed: i + 3, side: tc.side, size: TORCH_SIZE })
  })

  // The dais, the throne, the King.
  if (seen(DAIS.x0 - 3, DAIS.x1 + 3)) {
    drawDais(p, c, lit(19.7, -1))
    drawThrone(p, c, t, lit(19.7, -3))
    // His hand, for the blow's angle, is where his troll's arm is drawn.
    const pose0 = kingAt(t)
    const pose = t >= SMASH - 0.13 && t < SMASH + 2.7 ? kingAt(t, kingHand(p, c, pose0)) : pose0
    if (pose.alpha > 0) drawKing(p, c, pose, Math.max(0.1, lit(pose.x, pose.y - 2)))
  }

  // The lamps over the approach and the throne, swinging with the mountain.
  const sway = 0.02 * Math.sin(t * 1.3) + 6 * (qx + 0.5 * qy)
  if (seen(ROPE0[0] - 1, ROPE1[0] + 1.5)) drawLamps(p, c, t, lit(16, -4), sway)

  // The front row's braziers, the tails down over the bench, the front row.
  for (const b of BRAZIERS) if (seen(b.x - 1, b.x + 1)) drawBrazier(p, c, b.x, t, heatOf(t, b.who), poses[b.who].puff, lit(b.x, BRAZIER_Y))
  ;(['A', 'B', 'C'] as const).forEach((id, i) => {
    const who = [0, 1, 3][i]
    const gone = ease(t, COURT_UP - 0.45, STEPS[0])
    if (gone < 1 && seen(TAILS[id].tuft - 1.5, TAILS[id].tuft + 1.5)) drawTail(p, c, TAILS[id], poses[who].flick, lit(TAILS[id].land, 0), COURT[who].hide ?? TROLL.hide, gone)
  })
  COURT.forEach((cr, i) => {
    if (cr.row !== 0) return
    const pose = poses[i]
    if (pose.alpha > 0 && seen(pose.x - 1.2, pose.x + 1.2)) drawCourtier(p, c, pose, lit(pose.x, pose.y - 0.7), false)
  })

  // The sparks from the first two braziers up to the torches they light.
  drawSparks(p, c, t, [BRAZIERS[0].x, BRAZIER_Y - 0.15], torchFlame(0), SNORT_A + 0.04, TORCH_A)
  drawSparks(p, c, t, [BRAZIERS[1].x, BRAZIER_Y - 0.15], torchFlame(1), SNORT_B + 0.04, TORCH_B)

  // The floor, the hatch, the crack.
  drawFloor(p, c, t, (x) => lit(x, 0))
  if (seen(HATCH.x0 - 1, HATCH.x1 + 1)) drawHatch(p, c, t, lit(27.5, 0))
  if (t >= SMASH) {
    if (!crackFrom) {
      const hand = kingHand(p, c, kingAt(SMASH)) ?? [20.8, -2]
      const a = kingAt(SMASH, hand).sceptre
      const reach = SCEPTRE.len * (1 - SCEPTRE.grip)
      crackFrom = [hand[0] + Math.cos(a) * reach, hand[1] + Math.sin(a) * reach]
    }
    drawCrack(p, c, t, crackFrom)
  }
  drawRubble(p, c, t)
  p.pop()
}
