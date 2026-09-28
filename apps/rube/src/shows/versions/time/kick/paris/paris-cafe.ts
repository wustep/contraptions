import { mixHex, type Pt } from '../../../../../parts'
import { bloom } from '../cast'
import { hash } from '../kit'
import { PARIS, PARIS_THEME } from '../worlds'
import { crowd, figure, turned, type Figure } from './paris-crowd'
import { ARI_SEAT, BLASTS, BR, COBB_SEAT, CUT, TABLE_X, Y_S } from './paris-geo'
import { fillPaths, line, oval, puff, quad, rect, seen, shape, strokePaths, type Pen } from './paris-pen'
import { CAFE, GROUND_FLOOR } from './paris-set'

/**
 * The café (the PARIS builder's): its front, its awning and its window, the terrace (their table, their chairs, two
 * more tables), the fruit stand next door, the newspaper kiosk on the square, the pigeons on the cobbles, the waiter at
 * the door and the passers-by; and bar 9, when it all blows apart in slow motion on the strings' three attacks (the
 * window, the fruit stand, the kiosk) and what flew hangs in the air, turning slowly, for as long as Paris lasts.
 */

type Frame = { x0: number; y0: number; x1: number; y1: number }

const RED = PARIS_THEME.colors[4]
const WOOD = mixHex(PARIS.cafe, PARIS.stoneShade, 0.35)
const CRATE = mixHex(PARIS.stoneShade, PARIS.cafe, 0.42)
const PAPER = mixHex(PARIS.mirror, PARIS.stone, 0.4)
const INSIDE = mixHex(PARIS.cafe, PARIS.crowd, 0.5)
const SHOPGLASS = mixHex(PARIS.glass, PARIS.slate, 0.3)
const KIOSK = mixHex(PARIS.awning, PARIS.iron, 0.25)
const DUST = mixHex(PARIS.stone, PARIS.sky, 0.3)
const SEAT = mixHex(PARIS.stoneShade, PARIS.cafe, 0.2)

/* ------------------------------------------------------------------ what flies */

type Kind = 'glass' | 'bottle' | 'cup' | 'slat' | 'fruit' | 'paper' | 'panel' | 'chair' | 'table' | 'cloth' | 'crate'
interface Bit {
  kind: Kind
  from: Pt
  /** Its blast's time. */
  at: number
  /** How far it is thrown (cells, before the air holds it), and which way. */
  v: Pt
  /** Where the air then lets it drift, a little a second. */
  drift: Pt
  a0: number
  spin0: number
  spin1: number
  size: number
  color: string
  seed: number
}

const TAU_THROW = 0.34
function bits(): Bit[] {
  const out: Bit[] = []
  let seed = 0
  const add = (kind: Kind, from: Pt, at: number, dir: number, reach: number, size: number, color: string) => {
    const i = seed++
    const lift = -0.25 - 0.35 * hash(i, 4)
    out.push({
      kind,
      from,
      at,
      v: [Math.cos(dir) * reach, Math.sin(dir) * reach],
      drift: [0.06 * (hash(i, 5) - 0.5), 0.05 * lift],
      a0: hash(i, 6) * Math.PI * 2,
      spin0: (hash(i, 7) - 0.5) * 7,
      spin1: (hash(i, 8) - 0.5) * 0.7,
      size,
      color,
      seed: i,
    })
  }
  // The café's window, and what was on the shelves behind it: out and up round the two of them.
  const [b0, b1, b2] = BLASTS
  for (let i = 0; i < 14; i++) {
    const x = CAFE.x0 + 0.3 + (CAFE.x1 - CAFE.x0 - 1.4) * hash(i, 11)
    const y = Y_S - 0.6 - 1.1 * hash(i, 12)
    const dir = -Math.PI / 2 + (hash(i, 13) - 0.5) * 2.7
    add('glass', [x, y], b0, dir, 1.0 + 1.8 * hash(i, 14), 0.14 + 0.16 * hash(i, 15), PARIS.glass)
  }
  // The window's frame, in lengths of painted wood.
  for (let i = 0; i < 6; i++) {
    const x = CAFE.x0 + 0.4 + (CAFE.x1 - CAFE.x0 - 1.6) * hash(i, 16)
    add('slat', [x, Y_S - 0.9 - 0.9 * hash(i, 17)], b0, -Math.PI / 2 + (hash(i, 18) - 0.5) * 2.2, 1.1 + 1.4 * hash(i, 19), 0.45 + 0.3 * hash(i, 20), PARIS.cafe)
  }
  for (let i = 0; i < 9; i++) {
    const x = -2.3 + 3.4 * hash(i, 21)
    const dir = -Math.PI / 2 + (hash(i, 22) - 0.5) * 2.2
    add(i % 3 === 0 ? 'cup' : 'bottle', [x, Y_S - 1.1 - 0.5 * hash(i, 23)], b0, dir, 1.2 + 1.6 * hash(i, 24), 0.07, i % 3 === 0 ? PARIS.mirror : PARIS.iron)
  }
  // Chips of the facade's stone.
  for (let i = 0; i < 8; i++) add('glass', [CAFE.x0 + (CAFE.x1 - CAFE.x0) * hash(i, 27), Y_S - 2.0 - 0.3 * hash(i, 28)], b0, -Math.PI / 2 + (hash(i, 29) - 0.5) * 2.4, 0.9 + 1.2 * hash(i, 30), 0.08 + 0.06 * hash(i, 26), PARIS.stone)
  // The neighbouring table and its chairs lift, and hang.
  for (const [x, kind] of [[-2.1, 'table'], [-2.58, 'chair'], [-1.62, 'chair']] as [number, Kind][]) {
    add(kind, [x, Y_S - 0.2], b0, -Math.PI / 2 + (hash(seed, 25) - 0.5) * 0.9, 1.0 + 0.7 * hash(seed, 26), 1, SEAT)
  }
  // The fruit stand: its crates, whole and in boards, its fruit, its paper bags.
  for (let i = 0; i < 3; i++) add('crate', [-5.65 + 0.68 * i, Y_S - 0.8], b1, -Math.PI / 2 + (i - 1) * 0.6 + (hash(i, 30) - 0.5) * 0.4, 1.2 + 0.6 * hash(i, 31), 1, CRATE)
  for (let i = 0; i < 6; i++) {
    const x = -6.1 + 2.2 * hash(i, 31)
    add('slat', [x, Y_S - 0.3 - 0.4 * hash(i, 32)], b1, -Math.PI / 2 + (hash(i, 33) - 0.5) * 2.4, 0.9 + 1.6 * hash(i, 34), 0.3 + 0.15 * hash(i, 35), CRATE)
  }
  for (let i = 0; i < 18; i++) {
    const x = -6 + 2 * hash(i, 41)
    const col = [RED, mixHex(PARIS.lamp, RED, 0.35), mixHex(PARIS.awning, PARIS.lamp, 0.35)][i % 3]
    add('fruit', [x, Y_S - 0.9 - 0.2 * hash(i, 42)], b1, -Math.PI / 2 + (hash(i, 43) - 0.5) * 2.8, 1.1 + 2.1 * hash(i, 44), 0.05 + 0.015 * hash(i, 45), col)
  }
  // The kiosk: its panels and its papers, a flock of them.
  for (let i = 0; i < 5; i++) add('panel', [3.2 + 1.0 * hash(i, 51), Y_S - 0.6 - 1.2 * hash(i, 52)], b2, -Math.PI / 2 + (hash(i, 53) - 0.35) * 2.4, 0.9 + 1.3 * hash(i, 54), 0.34 + 0.12 * hash(i, 55), KIOSK)
  for (let i = 0; i < 18; i++) add('paper', [3.3 + 0.9 * hash(i, 61), Y_S - 0.7 - 1.3 * hash(i, 62)], b2, -Math.PI / 2 + (hash(i, 63) - 0.4) * 2.9, 1.1 + 2.3 * hash(i, 64), 0.2 + 0.1 * hash(i, 65), PAPER)
  // The awning's fringe, torn off in strips.
  for (let i = 0; i < 5; i++) add('cloth', [CAFE.x0 + 0.5 + 4.6 * hash(i, 71), Y_S - 1.35], b0, -Math.PI / 2 + (hash(i, 72) - 0.5) * 1.6, 0.8 + 0.9 * hash(i, 73), 0.5, PARIS.awning)
  return out
}
const BITS = bits()

/** Where a bit is `u` seconds after its blast (thrown, caught by the air, drifting), and how it is turned. */
function bitAt(b: Bit, u: number): { at: Pt; a: number } {
  if (u <= 0) return { at: b.from, a: b.a0 }
  const e = 1 - Math.exp(-u / TAU_THROW)
  // The air's hold is not quite still: a slow float, a sway.
  const sway = 0.04 * Math.sin(u * 0.7 + b.seed)
  return {
    at: [b.from[0] + (b.v[0] * e) + b.drift[0] * u + sway, b.from[1] + (b.v[1] * e) + b.drift[1] * u],
    a: b.a0 + b.spin0 * TAU_THROW * e + b.spin1 * u,
  }
}

function drawBits(pen: Pen, t: number, f: Frame): void {
  const glass: Pt[][] = []
  const lit: Pt[][] = []
  for (const b of BITS) {
    const u = t - b.at
    if (u <= 0) continue
    const { at, a } = bitAt(b, u)
    if (!seen(f, at[0] - 0.6, at[1] - 0.6, at[0] + 0.6, at[1] + 0.6)) continue
    const s = b.size
    switch (b.kind) {
      case 'glass': {
        const pts: Pt[] = [0, 1, 2].map((j) => {
          const ang = a + j * 2.1 + hash(b.seed, j) * 0.8
          const r = s * (0.6 + 0.6 * hash(b.seed, j + 3))
          return [at[0] + Math.cos(ang) * r, at[1] + Math.sin(ang) * r] as Pt
        })
        if (b.color === PARIS.stone) {
          shape(pen, pts, b.color, 0.35)
          break
        }
        // The shard catches the sun as it turns.
        ;(Math.cos(a * 2 + b.seed) > 0.55 ? lit : glass).push(pts)
        break
      }
      case 'bottle':
        shape(pen, quad(at, 0.035, 0.1, a), b.color, 0.4)
        break
      case 'cup':
        shape(pen, quad(at, 0.05, 0.035, a), b.color, 0.45)
        break
      case 'slat':
        shape(pen, quad(at, s / 2, 0.04, a), b.color, 0.45)
        break
      case 'crate': {
        // A crate of fruit, turning over; its fruit tipping out of it as it goes.
        shape(pen, quad(at, 0.3, 0.13, a * 0.5), b.color, 0.55)
        line(pen, quad(at, 0.3, 0.13, a * 0.5)[0], quad(at, 0.3, 0.13, a * 0.5)[2], mixHex(CRATE, PARIS.cafe, 0.4), 0.4)
        break
      }
      case 'fruit':
        oval(pen, at, s, s * 0.9, b.color, 0.35)
        break
      case 'paper': {
        // A sheet, fluttering: its width breathes as it turns over.
        const flap = 0.35 + 0.65 * Math.abs(Math.cos(u * 2.4 + b.seed))
        shape(pen, quad(at, (s / 2) * flap, s * 0.36, a * 0.4), b.color, 0.35)
        break
      }
      case 'panel':
        shape(pen, quad(at, s / 2, s * 0.6, a * 0.5), b.color, 0.55)
        break
      case 'cloth': {
        const flap = Math.sin(u * 1.6 + b.seed)
        const pts: Pt[] = [
          [-s / 2, 0],
          [s / 2, 0.02 * flap],
          [s / 2 - 0.02, 0.16],
          [s * 0.25, 0.12 + 0.03 * flap],
          [0, 0.16],
          [-s * 0.25, 0.12 - 0.03 * flap],
          [-s / 2 + 0.02, 0.16],
        ].map(([x, y]) => [at[0] + x * Math.cos(a * 0.3) - y * Math.sin(a * 0.3), at[1] + x * Math.sin(a * 0.3) + y * Math.cos(a * 0.3)] as Pt)
        shape(pen, pts, b.color, 0.45)
        break
      }
      case 'chair':
        chair(pen, at, 1, a * 0.35)
        break
      case 'table':
        table(pen, at, a * 0.25, [])
        break
    }
  }
  fillPaths(pen, glass, SHOPGLASS, 0.85)
  fillPaths(pen, lit, PARIS.mirror, 0.95)
  strokePaths(pen, [...glass, ...lit].map((g) => [...g, g[0]]), mixHex(PARIS.slate, PARIS.glass, 0.4), 0.3, 0.8)
}

/* ------------------------------------------------------------------ the terrace */

/** A bistro chair whose seat's top is at `at` (its back on the side `side`: -1 left, 1 right), turned `a`. */
function chair(pen: Pen, at: Pt, side: number, a = 0): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const P = (x: number, y: number): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]
  const legs: Pt[][] = [
    [P(-0.12, 0.03), P(-0.14, 0.22)],
    [P(0.12, 0.03), P(0.14, 0.22)],
    [P(side * 0.13, 0), P(side * 0.14, -0.4)],
    [P(side * 0.14, -0.4), P(side * 0.05, -0.42)],
  ]
  strokePaths(pen, legs, PARIS.iron, 0.75)
  shape(pen, [P(-0.15, -0.015), P(0.15, -0.015), P(0.14, 0.045), P(-0.14, 0.045)], SEAT, 0.55)
  // The rattan back.
  shape(pen, [P(side * 0.12, -0.36), P(side * 0.16, -0.36), P(side * 0.16, -0.12), P(side * 0.12, -0.12)], SEAT, 0.45)
}

/** A round café table (seen side on: a marble top, a pedestal, a foot) whose top is at `at`, with cups on it. */
function table(pen: Pen, at: Pt, a: number, cups: { at: Pt; a: number }[]): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const P = (x: number, y: number): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]
  strokePaths(pen, [[P(0, 0.04), P(0, 0.33)], [P(-0.15, 0.37), P(0, 0.31), P(0.15, 0.37)]], PARIS.iron, 0.8)
  shape(pen, [P(-0.19, -0.02), P(0.19, -0.02), P(0.18, 0.04), P(-0.18, 0.04)], PARIS.mirror, 0.6)
  for (const cup of cups) {
    shape(pen, quad([cup.at[0], cup.at[1] + 0.005], 0.05, 0.009, cup.a), PARIS.mirror, 0.4)
    shape(pen, quad([cup.at[0] + Math.sin(cup.a) * 0.035, cup.at[1] - 0.035], 0.03, 0.03, cup.a), PARIS.mirror, 0.4)
  }
}

/* ------------------------------------------------------------------ the café's front */

function front(pen: Pen, t: number, f: Frame): void {
  const { x0, x1 } = CAFE
  const top = Y_S - GROUND_FLOOR + 0.05
  if (!seen(f, x0 - 0.3, top - 0.3, x1 + 0.3, Y_S)) return
  const blown = t >= BLASTS[0]
  // The frontage: dark painted wood; a blank board over it with the sun on it.
  rect(pen, x0, top, x1, Y_S, PARIS.cafe, 0.7)
  rect(pen, x0 + 0.12, top + 0.08, x1 - 0.12, top + 0.34, mixHex(PARIS.cafe, PARIS.stone, 0.22), 0.4)
  // The door, and the two great windows (the glass gone once the blast has been: the dim room behind).
  const door: [number, number] = [x1 - 0.95, x1 - 0.2]
  rect(pen, door[0], top + 0.55, door[1], Y_S, INSIDE, 0.5)
  rect(pen, door[0] + 0.08, top + 0.65, door[1] - 0.08, Y_S - 0.8, blown ? INSIDE : SHOPGLASS, 0)
  const panes: [number, number][] = [[x0 + 0.18, -0.3], [-0.12, door[0] - 0.18]]
  for (const [a, b] of panes) {
    rect(pen, a, top + 0.55, b, Y_S - 0.28, INSIDE, 0.5)
    if (!blown) {
      rect(pen, a + 0.04, top + 0.59, b - 0.04, Y_S - 0.32, SHOPGLASS, 0)
      // The street's light across the glass.
      shape(pen, [[a + 0.3, top + 0.59], [a + 0.75, top + 0.59], [a + 0.25, Y_S - 0.32], [a + 0.04, Y_S - 0.32], [a + 0.04, top + 1.1]], mixHex(SHOPGLASS, PARIS.mirror, 0.6), 0)
    } else {
      // The bar in the dark, its shelves bare.
      rect(pen, a + 0.1, Y_S - 0.62, b - 0.1, Y_S - 0.28, mixHex(INSIDE, WOOD, 0.4), 0)
      line(pen, [a + 0.1, top + 0.95], [b - 0.1, top + 0.95], WOOD, 0.5)
      // Teeth of glass still in the frame.
      const teeth: Pt[][] = []
      for (let x = a + 0.05; x < b - 0.1; x += 0.23) teeth.push([[x, top + 0.59], [x + 0.2, top + 0.59], [x + 0.08 + 0.08 * hash(Math.round(x * 30), 3), top + 0.66 + 0.1 * hash(Math.round(x * 30), 4)]])
      fillPaths(pen, teeth, SHOPGLASS, 0.9)
    }
  }
}

/** The awning over the terrace: its slope seen from the front, its scalloped fringe; the blast lifts it and it hangs. */
function awning(pen: Pen, t: number): void {
  const { x0, x1 } = CAFE
  const top = Y_S - GROUND_FLOOR + 0.42
  const u = t - BLASTS[0]
  const lift = u > 0 ? 0.25 * (1 - Math.exp(-u / 0.35)) + 0.02 * Math.sin(u * 0.9) : 0
  const ripple = (x: number) => (u > 0 ? 0.03 * Math.sin(x * 3.2 + u * 1.3) * Math.min(1, u) : 0)
  const low = top + 0.55 - lift
  const pts: Pt[] = [[x0 - 0.1, top]]
  pts.push([x1 + 0.1, top])
  const edge: Pt[] = []
  for (let x = x1 + 0.1; x >= x0 - 0.1 - 1e-6; x -= 0.1) edge.push([x, low + ripple(x)])
  shape(pen, [...pts, ...edge], PARIS.awning, 0.7)
  // Its stripes of light and shade across the slope.
  const bands: Pt[][] = []
  for (let x = x0; x < x1; x += 0.56) bands.push([[x, top + 0.02], [x + 0.28, top + 0.02], [x + 0.28, low + ripple(x + 0.28) - 0.02], [x, low + ripple(x) - 0.02]])
  fillPaths(pen, bands, mixHex(PARIS.awning, PARIS.lamp, 0.12))
  // The fringe (strips of it gone once the blast has torn them).
  const scallops: Pt[][] = []
  for (let x = x0 - 0.1, i = 0; x < x1 + 0.1 - 1e-6; x += 0.25, i++) {
    if (u > 0 && hash(i, 77) < 0.35) continue
    const y = low + ripple(x)
    scallops.push([[x, y], [x + 0.25, y], [x + 0.2, y + 0.12], [x + 0.125, y + 0.15], [x + 0.05, y + 0.12]])
  }
  fillPaths(pen, scallops, mixHex(PARIS.awning, PARIS.iron, 0.25))
}

/** The fruit stand before the épicerie: trestles, tilted crates of fruit (gone to the air on its blast). */
function fruitStand(pen: Pen, t: number, f: Frame): void {
  if (!seen(f, -6.4, Y_S - 1.2, -3.6, Y_S)) return
  const blown = t >= BLASTS[1]
  strokePaths(pen, [[[-6.1, Y_S], [-5.9, Y_S - 0.62]], [[-3.9, Y_S], [-4.1, Y_S - 0.62]], [[-6.0, Y_S - 0.3], [-4.0, Y_S - 0.3]]], WOOD, 0.8)
  if (blown) {
    shape(pen, [[-6.15, Y_S - 0.66], [-3.85, Y_S - 0.66], [-3.9, Y_S - 0.6], [-6.1, Y_S - 0.6]], CRATE, 0.5)
    return
  }
  const fruit: [Pt, string][] = []
  for (let i = 0; i < 3; i++) {
    const x = -5.95 + i * 0.68
    shape(pen, [[x, Y_S - 0.62], [x + 0.62, Y_S - 0.7], [x + 0.62, Y_S - 0.98], [x, Y_S - 0.9]], CRATE, 0.5)
    for (let j = 0; j < 6; j++) fruit.push([[x + 0.08 + j * 0.095, Y_S - 0.97 - 0.012 * j], [RED, mixHex(PARIS.lamp, RED, 0.35), mixHex(PARIS.awning, PARIS.lamp, 0.35)][i]])
  }
  for (const [at, col] of fruit) oval(pen, at, 0.05, 0.045, col, 0.35)
}

/** The newspaper kiosk on the square: green panels under a six-sided cap; its blast takes the panels and lifts the cap. */
function kiosk(pen: Pen, t: number, f: Frame): void {
  const x0 = 3.05
  const x1 = 4.25
  if (!seen(f, x0 - 0.4, Y_S - 3.5, x1 + 0.4, Y_S)) return
  const u = t - BLASTS[2]
  const blown = u > 0
  // Its posts.
  strokePaths(pen, [[[x0 + 0.05, Y_S], [x0 + 0.05, Y_S - 2.0]], [[x1 - 0.05, Y_S], [x1 - 0.05, Y_S - 2.0]]], PARIS.iron, 0.9)
  if (!blown) {
    rect(pen, x0, Y_S - 1.95, x1, Y_S - 0.05, KIOSK, 0.6)
    // The open hatch, its papers in rows.
    rect(pen, x0 + 0.2, Y_S - 1.35, x1 - 0.2, Y_S - 0.75, INSIDE, 0.4)
    const rows: Pt[][] = []
    for (let x = x0 + 0.26; x < x1 - 0.3; x += 0.2) rows.push([[x, Y_S - 1.28], [x + 0.14, Y_S - 1.28], [x + 0.14, Y_S - 1.08], [x, Y_S - 1.08]], [[x, Y_S - 1.02], [x + 0.14, Y_S - 1.02], [x + 0.14, Y_S - 0.82], [x, Y_S - 0.82]])
    fillPaths(pen, rows, PAPER)
  } else {
    // A bare frame: the counter left, a torn panel.
    line(pen, [x0, Y_S - 0.75], [x1, Y_S - 0.75], PARIS.iron, 0.7)
    shape(pen, [[x0, Y_S - 0.05], [x0 + 0.45, Y_S - 0.05], [x0 + 0.38, Y_S - 0.5], [x0, Y_S - 0.62]], KIOSK, 0.5)
  }
  // The cap: lifted by the blast and hanging over it, turned a little.
  const lift = blown ? 0.55 * (1 - Math.exp(-u / 0.4)) + 0.015 * u : 0
  const tilt = blown ? -0.28 * (1 - Math.exp(-u / 0.5)) + 0.02 * Math.sin(u * 0.6) : 0
  const cx = (x0 + x1) / 2 - (blown ? 0.12 * (1 - Math.exp(-u / 0.4)) : 0)
  const cy = Y_S - 2.0 - lift
  const cap: Pt[] = [[-0.72, 0], [0.72, 0], [0.62, -0.18], [0.36, -0.52], [0.06, -0.72], [0.06, -0.92], [-0.06, -0.92], [-0.06, -0.72], [-0.36, -0.52], [-0.62, -0.18]]
  const cs = Math.cos(tilt)
  const sn = Math.sin(tilt)
  shape(pen, cap.map(([x, y]) => [cx + x * cs - y * sn, cy + x * sn + y * cs] as Pt), KIOSK, 0.7)
}

/* ------------------------------------------------------------------ the pigeons */

const PIGEONS = Array.from({ length: 6 }, (_, i) => ({ x: 1.7 + 0.42 * i + 0.2 * hash(i, 81), dir: hash(i, 82) > 0.5 ? 1 : -1, delay: 0.05 * hash(i, 83), seed: i }))

/** The pigeons on the cobbles before the café; on the cut they go up, all at once, and wheel off over the square. */
function pigeons(pen: Pen, t: number): void {
  const body = mixHex(PARIS.slate, PARIS.zinc, 0.45)
  const wing = mixHex(PARIS.slate, PARIS.iron, 0.3)
  for (const g of PIGEONS) {
    const u = t - CUT - g.delay
    if (u > 3.4) continue
    const d = u <= 0 ? g.dir : 1
    // Bird cells: x along its heading, y down; drawn at its place, facing `d`.
    let at: Pt
    let pitch = 0
    let flap = 0
    if (u <= 0) {
      at = [g.x, Y_S - 0.07]
      pitch = 0.25 + 0.15 * Math.sin(t * 5 + g.seed)
    } else {
      const vx = 1.2 + 0.9 * hash(g.seed, 84)
      at = [g.x + vx * u + 0.35 * u * u, Y_S - 0.07 - (2.4 * u + 0.4 * u * u)]
      pitch = -0.5 + 0.25 * Math.min(1, u)
      flap = Math.sin(u * 21 + g.seed * 1.7)
    }
    const c = Math.cos(pitch)
    const sn = Math.sin(pitch)
    const P = (x: number, y: number): Pt => [at[0] + d * (x * c - y * sn), at[1] + x * sn + y * c]
    // Body, tail, head.
    shape(pen, [P(-0.15, -0.01), P(-0.06, -0.06), P(0.06, -0.07), P(0.1, -0.05), P(0.08, 0.0), P(-0.06, 0.02)], body, 0.4)
    shape(pen, [P(0.08, -0.06), P(0.13, -0.09), P(0.16, -0.075), P(0.15, -0.05), P(0.1, -0.035)], body, 0.4)
    if (u > 0) {
      // The wings, beating: up over the back, then down past the belly.
      const tipY = -0.05 - 0.19 * flap
      shape(pen, [P(-0.03, -0.05), P(-0.12, tipY), P(-0.02, tipY + 0.03), P(0.05, -0.05)], wing, 0.4)
    } else {
      shape(pen, [P(-0.1, -0.045), P(0.04, -0.06), P(0.0, -0.02), P(-0.12, -0.01)], wing, 0)
    }
  }
}

/* ------------------------------------------------------------------ the people of the street */

/** The waiter at the door, the passers-by behind the terrace, and two on the square: they stop, and stare. */
function street(pen: Pen, t: number): void {
  const figs: Figure[] = []
  const blast = BLASTS[0]
  // The waiter: at the door, facing out; he turns to the table on the blast.
  figs.push(figure(3, 2.05, Y_S, turned(t, blast + 0.1, 0.9, -0.9)))
  // Two walking along behind the terrace from the left; they stop on the blast and stare at the table.
  for (const [i, x0, v] of [[5, -4.9, 0.42], [6, -4.35, 0.4]] as const) {
    const walkFor = Math.min(t, blast + 0.2) - 30.2
    const x = x0 + v * Math.max(0, walkFor)
    const walking = t < blast + 0.2
    figs.push(figure(i, x, Y_S, walking ? 1 : turned(t, blast + 0.25 + (i - 5) * 0.15, 1, 1), walking ? walkFor * 7.5 : NaN))
  }
  // Two on the square by the tree, watching the café (and then the street go up).
  figs.push(figure(8, 4.6, Y_S, turned(t, BLASTS[2] + 0.2, -0.7, -1)))
  figs.push(figure(9, 4.95, Y_S, turned(t, BLASTS[2] + 0.4, 0.4, -1)))
  crowd(pen, figs)
}

/* ------------------------------------------------------------------ all of it */

export function drawCafe(pen: Pen, t: number, f: Frame): void {
  if (!seen(f, -10, Y_S - 6, 7, Y_S + 0.5)) return
  fruitStand(pen, t, f)
  front(pen, t, f)
  kiosk(pen, t, f)
  street(pen, t)
  awning(pen, t)
  // Their table and chairs; the cups lift off it on the blast and hang over it.
  const u = t - BLASTS[0]
  const cupsAt = (i: number): { at: Pt; a: number } => {
    const base: Pt = [TABLE_X + (i ? 0.1 : -0.1), -0.02 - 0.012]
    if (u <= 0) return { at: base, a: 0 }
    const e = 1 - Math.exp(-u / 0.6)
    return { at: [base[0] + (i ? 0.18 : -0.14) * e, base[1] - (0.55 + 0.15 * i) * e - 0.02 * u], a: (i ? 0.6 : -0.8) * e + 0.1 * u }
  }
  table(pen, [TABLE_X, -0.02], 0, u > 0 ? [] : [cupsAt(0), cupsAt(1)])
  chair(pen, [COBB_SEAT[0], COBB_SEAT[1] + BR], -1)
  chair(pen, [ARI_SEAT[0], ARI_SEAT[1] + BR], 1)
  if (u > 0) for (const i of [0, 1]) {
    const c = cupsAt(i)
    shape(pen, quad(c.at, 0.05, 0.01, c.a), PARIS.mirror, 0.4)
    shape(pen, quad([c.at[0] + Math.sin(c.a) * 0.035, c.at[1] - 0.035], 0.03, 0.03, c.a), PARIS.mirror, 0.4)
  }
  // The neighbouring tables, until the blast takes them up (then they are bits).
  if (u <= 0) {
    table(pen, [-2.1, -0.02 + 0.0], 0, [])
    chair(pen, [-2.58, BR], -1)
    chair(pen, [-1.62, BR], 1)
  }
  pigeons(pen, t)
  drawBits(pen, t, f)
}

/** The blasts' dust and light (over everything: soft air, never outlined). */
export function drawCafeAir(pen: Pen, t: number, f: Frame): void {
  if (!seen(f, -10, Y_S - 6, 7, Y_S + 0.5)) return
  const sources: Pt[] = [[-0.2, Y_S - 1.1], [-5, Y_S - 0.7], [3.65, Y_S - 1.2]]
  BLASTS.forEach((at, i) => {
    const u = t - at
    if (u <= 0 || u > 9) return
    const [x, y] = sources[i]
    // A flash of the sun off it all, and dust that swells, hangs and thins.
    if (u < 0.5) bloom(pen.p, pen.k, [x, y], 1.6, PARIS.lamp, 0.35 * (1 - u / 0.5))
    for (let j = 0; j < 5; j++) {
      const r = (0.5 + 0.35 * j) * (1 - Math.exp(-u / 0.5)) + 0.04 * u
      const dx = (hash(i, j) - 0.5) * 1.6 * (1 - Math.exp(-u / 0.5))
      const dy = -0.3 * j * (1 - Math.exp(-u / 0.6)) - 0.03 * u
      puff(pen, [x + dx, y + dy], r, DUST, 0.22 * Math.exp(-u / 3.2))
    }
  })
}
