import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../src/core/ease'
import { R, type Lane, type Pt } from '../../../../parts'
import { alpha, box, carried, frame, hash, knock, part, smooth, type Companion, type Ctx, type PartShot } from './kit'
import { BUILD, CRESCENDO, STARS } from './music'
import { beam, flat, glow, hexA } from './rig'
import { PAINT } from './worlds'

/**
 * The planetarium: the dream ballet. They come in at the apex of the
 * carousel's throw, at rest in the air, and the flying rig's hooks are
 * waiting there: on the cadence's last hit (167.65) the wires take their
 * weight, the lines stretch and the sheaves on the grid click. A starcloth
 * hangs behind: a painted night, its paper stars on threads, all dark.
 *
 * The soft stretch (167.65 → 185.6): the rig lifts them slowly up and across
 * the cloth. On the first three soft onsets three paper stars light, one by
 * one, leading the eye to where the moon will hang; the paper moon flies in
 * on its wire from above right and stops, with a bob, on the strongest of the
 * soft onsets (174.96), its lamp lit as a crescent; four more paper stars
 * light round it. Mia orbits him: one slow turn as the moon comes in, a rest
 * beside him in the quiet, and in the rising run (179.6 → 185.0) a second
 * turn in which the cloth's own lamps light where she passes, a star on each
 * note: the trail of her dance stays in the sky. Below them the planetarium
 * projector (the dumbbell) turns slowly on its pedestal, its beam sweeping
 * across the cloth; nothing hits between the onsets.
 *
 * The crescendo (185.6 → 192.96): the rig lowers them. The projector spins
 * up, and on each of the nine hits of the rush a band of lamps lights,
 * outward from the moon, until the whole cloth is stars. On the big chords
 * the whole sky flares, and the moon waxes from a crescent to full in three
 * steps; on 192.96 they touch down together on the stage floor, the wires go
 * slack and are hauled up out of sight. Then the set is cleared for the
 * number: the moon flies straight up out on its wire (gone above the frame
 * by 196.5), and every lamp, paper star and beam fades over 193 → 197, so the
 * number's stage is dark but for its own light.
 *
 * Frame: entry (-0.5, 0) is the apex. The floor is 4 cells below it; the
 * landing is at (8.9, 4) and the exit (9.4, 4). The cloth runs from x = -2
 * (Paris's set is left of that) to 16 (the number's set is drawn over it).
 */

/* ------------------------------------------------------------------ the clock */

/** The cadence's last hit: the wires take them. */
const CATCH = STARS
/** Three paper stars, one by one. */
const SOFT = [170.887, 171.398, 172.884]
/** The moon flies in from the third star to the strongest soft onset, and lights. */
const MOON_IN = 172.884
const MOON = 174.962
/** Four paper stars round the moon. */
const AROUND = [175.682, 176.03, 176.251, 176.82]
/** The rising run: a lamp lights where she passes, on every note. */
const RUN = [179.606, 179.943, 180.257, 180.558, 180.872, 181.452, 181.743, 182.01, 182.277, 182.602, 183.217, 183.496, 183.751, 184.065, 184.413, 184.959]
/** The rush: a band of lamps on each hit, outward from the moon. */
const RUSH = [185.597, 185.853, 186.154, 186.445, 186.793, 187.095, 187.385, 187.977, 188.36]
/** The big chords: the sky flares on each; on three of them the moon waxes, to full. */
const CHORDS = [189.974, 190.125, 190.717, 190.973, 191.646]
const WAX = [189.974, 190.717, 191.646]
/** Touchdown, on the downbeat that starts the number's build. */
const TOUCH = BUILD

export const STARS_HITS: number[] = [CATCH, ...SOFT, MOON, ...AROUND, ...RUN, ...RUSH, ...CHORDS, TOUCH]

/* ------------------------------------------------------------------ the set */

/** The floor: a ball at rest on it has its centre here. */
const FLOOR_Y = 4
/** The fly grid the wires run to, and its sheaves. */
const GRID = -6.2
/** The starcloth. */
const CLOTH = { x0: -2, y0: -7.6, x1: 16, y1: FLOOR_Y + R }
/** The paper moon: where it hangs, and where it flies in from. */
const MOON_AT: Pt = [8.7, -1.2]
const MOON_R = 0.72
const MOON_FROM: Pt = [13, -8.5]
/** The projector's axle, on its pedestal. */
const AXLE: Pt = [4.3, 2.35]
const ARM = 0.62
const BULB = 0.3
/** The landing, and the exit. */
const LAND: Pt = [8.9, FLOOR_Y]
const EXIT: Pt = [9.4, FLOOR_Y]

/* ------------------------------------------------------------------ motion */

/** A cubic from `a` leaving at velocity `va` to `b` arriving at `vb`, `T` seconds apart, at `u` (0..1) of the way. */
function hermite(a: Pt, va: Pt, b: Pt, vb: Pt, T: number, u: number): Pt {
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  return [h00 * a[0] + h10 * T * va[0] + h01 * b[0] + h11 * T * vb[0], h00 * a[1] + h10 * T * va[1] + h01 * b[1] + h11 * T * vb[1]]
}

// His path on the rig: caught, lifted slowly across the cloth, lowered fast and set down.
const P0: Pt = [-0.5, 0]
const LIFT = CATCH + 1.3
const P1: Pt = [1.3, -1.0]
const V1: Pt = [0.35, -0.05]
const P2: Pt = [6.9, -1.9]
const V2: Pt = [0.7, 0.25]
/** Touching down: still coming down at this speed, and the floor stops them. */
const VL: Pt = [0.04, 1.1]

/** The wires take the weight: the lines stretch and the two dip and settle. */
const sag = (s: number): number => (s <= 0 ? 0 : 0.06 * (1 - Math.cos((2 * Math.PI * s) / 0.5)) * Math.exp(-s / 0.3))

function himAt(T: number): Pt {
  if (T <= CATCH) return P0
  if (T < LIFT) return [P0[0], P0[1] + sag(T - CATCH)]
  if (T < AROUND[3]) return hermite(P0, [0, 0], P1, V1, AROUND[3] - LIFT, (T - LIFT) / (AROUND[3] - LIFT))
  if (T < CRESCENDO) return hermite(P1, V1, P2, V2, CRESCENDO - AROUND[3], (T - AROUND[3]) / (CRESCENDO - AROUND[3]))
  if (T < TOUCH) return hermite(P2, V2, LAND, VL, TOUCH - CRESCENDO, (T - CRESCENDO) / (TOUCH - CRESCENDO))
  return LAND
}

// Her dance: one slow turn round him as the moon comes in, a rest beside him, a second turn through the run that
// she finishes as the rig starts to lower them.
const ORBIT_A: [number, number] = [CATCH + 1.5, AROUND[3]]
const ORBIT_B: [number, number] = [RUN[0] - 0.6, CRESCENDO + 1.0]
/** 0 → 1 across a stretch, at rest at both ends. */
const phase = (T: number, [a, b]: [number, number]): number => smooth(T, a, b)
/** How far out she is on a turn: 0 at its ends, 1 in the middle. */
const swell = (T: number, [a, b]: [number, number]): number => Math.sin(Math.PI * clamp((T - a) / (b - a)))

function herOff(T: number): Pt {
  const turns = phase(T, ORBIT_A) + phase(T, ORBIT_B)
  const th = Math.PI + 2 * Math.PI * turns
  const r = 0.32 + 0.34 * swell(T, ORBIT_A) + 0.22 * swell(T, ORBIT_B)
  // Lowered fast, her wire runs a touch slower: she trails above him, and is level again for the touchdown.
  const trail = -0.16 * Math.sin(Math.PI * clamp((T - CRESCENDO - 1.0) / (TOUCH - CRESCENDO - 1.0))) ** 2
  return [r * Math.cos(th), 0.55 * r * Math.sin(th) + trail]
}

function herAt(T: number): Pt {
  const h = himAt(T)
  const o = herOff(T)
  return [h[0] + o[0], h[1] + o[1]]
}

/** The moon on its traveller: flown in from above right, stopped with a bob, and swinging itself out on its wire. */
function moonAt(T: number): Pt {
  if (T <= MOON_IN) return MOON_FROM
  if (T < MOON) return hermite(MOON_FROM, [-2.4, 2.6], MOON_AT, [-0.4, 0], MOON - MOON_IN, (T - MOON_IN) / (MOON - MOON_IN))
  const s = T - MOON
  const sway = -(0.4 / 0.9) * Math.sin(0.9 * s) * Math.exp(-s / 7)
  const bob = 0.05 * Math.sin(11.4 * s) * Math.exp(-s / 0.25)
  // Set down, the moon is flown straight up and out: the traveller gathers speed for 1.4 s and then hauls at 2.8 cells/s.
  const out = T - TOUCH
  const flown = out <= 0 ? 0 : out < 1.4 ? out * out : 1.96 + 2.8 * (out - 1.4)
  return [MOON_AT[0] + sway, MOON_AT[1] + bob - flown]
}

/** The set cleared for the number: every light of this set fades over 193 → 197. */
const dimmed = (T: number): number => 1 - smooth(T, TOUCH, TOUCH + 4)

/** How much of the moon is lit: the shadow disc's offset in radii. A crescent when the lamp comes on; full by the last chord. */
function moonPhase(T: number): number {
  let d = 0.34
  for (const t of WAX) d += 0.555 * smooth(T, t, t + 0.14)
  return d
}

/**
 * The projector's dumbbell: a slow sweep on its own clock, and a spin through the rush. The angle is the integral
 * of a rate, worked out once as a table.
 */
const SPIN = (() => {
  const t0 = CATCH - 6
  const t1 = TOUCH + 8
  const dt = 0.01
  const n = Math.ceil((t1 - t0) / dt)
  const rate = (T: number): number => 0.05 + 2.6 * (smooth(T, CRESCENDO - 0.3, CRESCENDO + 0.9) - smooth(T, RUSH[8] - 0.2, RUSH[8] + 1.6))
  const a = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) a[i] = a[i - 1] + rate(t0 + (i - 0.5) * dt) * dt
  return { t0, dt, a }
})()
function projectorAt(T: number): number {
  const i = clamp((T - SPIN.t0) / SPIN.dt, 0, SPIN.a.length - 1)
  const j = Math.floor(i)
  const spun = j >= SPIN.a.length - 1 ? SPIN.a[SPIN.a.length - 1] : SPIN.a[j] + (SPIN.a[j + 1] - SPIN.a[j]) * (i - j)
  return -Math.PI / 2 - 0.5 + 0.95 * Math.sin(0.23 * (T - CATCH) + 0.6) + spun
}

/* ------------------------------------------------------------------ the stars */

interface Star {
  x: number
  y: number
  /** Show time it lights. */
  at: number
  /** Its size: the outer radius. */
  r: number
  /** One of hers: lit where she passed in the run. They lie close, so they take the chords' flare gently. */
  hers?: boolean
}

/** The paper stars on threads: three leading the eye, four round the moon. Where and when. */
const PAPER: Star[] = [
  { x: 0.4, y: -2.6, at: SOFT[0], r: 0.19 },
  { x: 2.1, y: -3.35, at: SOFT[1], r: 0.16 },
  { x: 3.8, y: -2.55, at: SOFT[2], r: 0.21 },
  { x: 6.7, y: -2.85, at: AROUND[0], r: 0.17 },
  { x: 9.1, y: -2.85, at: AROUND[1], r: 0.2 },
  { x: 9.25, y: 0.7, at: AROUND[2], r: 0.15 },
  { x: 6.4, y: 0.55, at: AROUND[3], r: 0.18 },
]

/** The cloth's lamps: the run's, where she passes; the rush's, in bands outward from the moon. */
const LAMPS: Star[] = (() => {
  const out: Star[] = []
  for (let i = 0; i < RUN.length; i++) {
    const T = RUN[i]
    const h = himAt(T)
    const m = herAt(T)
    const dx = m[0] - h[0]
    const dy = m[1] - h[1]
    const L = Math.hypot(dx, dy) || 1
    // The last notes come as she slows on the near side, so they would pile up: those lamps lie further out.
    const off = 0.2 + 0.1 * hash(i, 3) + 0.3 * Math.max(0, (i - 11) / 4)
    out.push({ x: m[0] + (dx / L) * off + (hash(i, 4) - 0.5) * 0.08, y: m[1] + (dy / L) * off + (hash(i, 5) - 0.5) * 0.08, at: T, r: 0.075 + 0.05 * hash(i, 6), hers: true })
  }
  const clear = (x: number, y: number): boolean => {
    if (x < CLOTH.x0 + 0.4 || x > CLOTH.x1 - 0.4 || y < CLOTH.y0 + 0.4 || y > 3.3) return false
    if (Math.hypot(x - MOON_AT[0], y - MOON_AT[1]) < MOON_R + 0.5) return false
    for (const s of [...PAPER, ...out]) if (Math.hypot(x - s.x, y - s.y) < 0.55) return false
    return true
  }
  for (let w = 0; w < RUSH.length; w++) {
    const r0 = 1.5 + 0.92 * w
    const n = 6 + w
    for (let j = 0; j < n; j++) {
      const a = ((j + hash(w, j, 1) * 0.9) / n) * Math.PI * 2
      const r = r0 + (hash(w, j, 2) - 0.5) * 0.8
      const x = MOON_AT[0] + Math.cos(a) * r * 1.15
      const y = MOON_AT[1] + Math.sin(a) * r * 0.85
      if (!clear(x, y)) continue
      out.push({ x, y, at: RUSH[w], r: 0.06 + 0.05 * hash(w, j, 7) })
    }
  }
  return out
})()

/* ------------------------------------------------------------------ the part */

interface StarsState {
  begin: number
  lane: Lane
}

export const stars = part<StarsState>(
  {
    name: 'stars',
    draw: (p, s, c) => drawSet(p, s, c),
    over: (p, s, c) => drawLight(p, s, c),
  },
  (slot) => {
    const end = slot.end - slot.begin
    const segs = carried((t) => himAt(t + slot.begin), 0, end, Math.ceil(end * 40))
    const lane: Lane = { segs, fire: MOON - slot.begin }
    return {
      cells: box(-3, -8, EXIT[0] + 8, FLOOR_Y + 1, 2),
      exit: EXIT,
      lane,
      state: { begin: slot.begin, lane },
      company: [{ from: slot.begin, to: slot.end, at: (T): Companion => { const [x, y] = herAt(T); return { x, y } } }],
    }
  },
  (slot): PartShot[] => [
    // The catch, with them: the projector below, the dark cloth behind.
    { t: slot.begin, cells: 6.8, hold: [0.8, 1.4], w: 0.55 },
    // A wide, mostly held: they drift across it and up, small among the stars; the floor drops out of the frame.
    { t: SOFT[0] - 0.4, cells: 7.6, hold: [3.6, 1.5], w: 0.4 },
    { t: CRESCENDO, cells: 7.6, hold: [5.2, 1.5], w: 0.4 },
    // Down with them, the moon in the frame for the chords; then in on the touchdown.
    { t: CHORDS[4], cells: 7.0, hold: [7.4, 0.5], w: 0.5 },
    { t: slot.end, cells: 5.8, hold: [8.0, 2.4], w: 0.55 },
  ],
)

/* ------------------------------------------------------------------ drawing */

/** A four-point sparkle: the cloth's lamps. */
function sparkle(p: p5, k: number, x: number, y: number, r: number): void {
  const q = r * 0.3
  p.beginShape()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const rr = i % 2 ? q : r
    p.vertex((x + Math.cos(a) * rr) * k, (y + Math.sin(a) * rr) * k)
  }
  p.endShape(p.CLOSE)
}

/** A five-point paper star, its top point up. */
function paperStar(p: p5, k: number, x: number, y: number, r: number): void {
  const q = r * 0.42
  p.beginShape()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    const rr = i % 2 ? q : r
    p.vertex((x + Math.cos(a) * rr) * k, (y + Math.sin(a) * rr) * k)
  }
  p.endShape(p.CLOSE)
}

/** The whole sky's flare on the big chords. */
const flare = (T: number): number => {
  let f = 0
  for (const t of CHORDS) f += knock(T - t, 0.28)
  return Math.min(1.2, f)
}

function drawSet(p: p5, s: StarsState, c: Ctx): void {
  const { k, ink, weight } = c
  const T = c.t + s.begin
  const X = (v: number) => v * k
  const f = frame(p, k)
  const inView = (x: number, y: number, m = 1) => x > f.x0 - m && x < f.x1 + m && y > f.y0 - m && y < f.y1 + m

  // The starcloth: a painted night, deep at the top, a violet foot; hung from its batten.
  flat(p, c, CLOTH.x0, CLOTH.y0, CLOTH.x1 - CLOTH.x0, CLOTH.y1 - CLOTH.y0, PAINT.deep, hexA(PAINT.violet, 0.45))
  // The floor.
  outline(p, ink, weight)
  p.line(X(CLOTH.x0 - 1), X(FLOOR_Y + R), X(CLOTH.x1), X(FLOOR_Y + R))

  const pulse = flare(T)
  const dim = dimmed(T)

  // The paper stars on their threads: dark paper until each one's lamp comes on.
  for (let i = 0; i < PAPER.length; i++) {
    const st = PAPER[i]
    if (!inView(st.x, st.y, 1.2)) continue
    const since = T - st.at
    const lit = smooth(since, 0, 0.1) * dim
    if (dim <= 0) continue
    p.stroke(alpha(p, ink, 0.3 * dim))
    p.strokeWeight(weight * 0.35)
    p.line(X(st.x), X(st.y - st.r), X(st.x), X(CLOTH.y0))
    if (lit > 0) glow(p, c, st.x, st.y, st.r * (2.2 + 1.8 * knock(since, 0.4) + 0.5 * pulse), 0.5 * lit * (1 + 0.6 * pulse), PAINT.gold)
    p.stroke(alpha(p, ink, 0.6 * dim))
    p.strokeWeight(weight * 0.55)
    p.fill(alpha(p, lit > 0 ? PAINT.cream : PAINT.deep, dim))
    paperStar(p, k, st.x, st.y, st.r)
  }

  // The cloth's lamps: nothing until each lights; a flare on its note, then a steady small glow.
  p.noStroke()
  if (dim > 0) {
    for (const st of LAMPS) {
      const since = T - st.at
      if (since < 0 || !inView(st.x, st.y, 0.8)) continue
      const kn = knock(since, 0.35)
      const pl = st.hers ? pulse * 0.4 : pulse
      glow(p, c, st.x, st.y, st.r * (2.2 + 2.2 * kn + 0.7 * pl), (0.35 + 0.4 * kn + 0.35 * pl) * dim, PAINT.cream)
      p.fill(alpha(p, PAINT.cream, dim))
      sparkle(p, k, st.x, st.y, st.r * (1 + 0.6 * kn))
    }
  }

  // The paper moon on its wire.
  const [mx, my] = moonAt(T)
  if (inView(mx, my, MOON_R + 1)) {
    const lit = smooth(T - MOON, 0, 0.12)
    const d = moonPhase(T)
    outline(p, ink, weight * 0.45)
    p.stroke(alpha(p, ink, 0.55))
    p.line(X(mx), X(my - MOON_R), X(mx + (mx - MOON_AT[0]) * 0.3), X(GRID))
    if (lit > 0) {
      // The lit part's centre of light, for the glow: toward the lit limb while it is a crescent.
      const cx = mx + MOON_R * Math.max(0, 1 - d / 2) * 0.7
      glow(p, c, cx, my, MOON_R * (1.5 + 0.6 * Math.min(1, d / 2) + 0.35 * pulse), lit * dim * (0.28 + 0.2 * Math.min(1, d / 2) + 0.35 * pulse), PAINT.gold)
    }
    p.push()
    p.translate(X(mx), X(my))
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(weight * 0.7)
    p.fill(PAINT.deep)
    p.circle(0, 0, X(MOON_R * 2))
    if (lit > 0) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, X(MOON_R), 0, Math.PI * 2)
      ctx.clip()
      p.noStroke()
      p.fill(alpha(p, PAINT.cream, lit))
      p.circle(0, 0, X(MOON_R * 2))
      p.fill(PAINT.deep)
      p.circle(X(-d * MOON_R), 0, X(MOON_R * 2))
      ctx.restore()
      outline(p, ink, weight * 0.7)
      p.stroke(alpha(p, ink, 0.6))
      p.circle(0, 0, X(MOON_R * 2))
    }
    p.pop()
  }

  // The fly grid: a pipe with the sheave blocks the wires run over, above the frame most of the time.
  const him = himAt(T)
  const her = herAt(T)
  if (f.y0 < GRID + 0.6) {
    outline(p, ink, weight * 0.9)
    p.line(X(CLOTH.x0 - 1), X(GRID), X(CLOTH.x1), X(GRID))
  }
  // The wires: two to each of them, from the sheaves; waiting at the apex before the catch, hauled up after the touchdown.
  const hooks: Pt[] = T <= CATCH ? [P0, [P0[0] - 0.32, P0[1]]] : [him, her]
  // Set down, the lines go slack (they bow out) and the rig hauls the empty hooks up out of sight.
  const down = T - TOUCH
  const slack = smooth(down, 0, 0.14)
  const haul = down > 0.25 ? 9 * (down - 0.25) ** 2 : 0
  const twang = 0.035 * Math.sin(38 * (T - CATCH)) * knock(T - CATCH, 0.2)
  for (const [hx, hy0] of hooks) {
    const hy = hy0 - haul
    if (hy < GRID) continue
    for (const side of [-1, 1]) {
      const sx = hx + side * 0.28
      p.stroke(alpha(p, ink, 0.6))
      p.strokeWeight(weight * 0.4)
      p.noFill()
      p.beginShape()
      p.vertex(X(sx), X(GRID))
      p.quadraticVertex(X((sx + hx) / 2 + twang + side * 0.5 * slack), X((GRID + hy) / 2 + 0.6 * slack), X(hx), X(hy))
      p.endShape()
      if (f.y0 < GRID + 0.6) {
        // The sheave block on the pipe, its wheel turning with the wire.
        solid(p, ink, weight * 0.6, PAINT.timber)
        p.rect(X(sx), X(GRID - 0.1), X(0.16), X(0.14))
        solid(p, ink, weight * 0.6, PAINT.cream)
        p.circle(X(sx), X(GRID + 0.06), X(0.16))
        const a = (hy - GRID) / 0.08
        outline(p, ink, weight * 0.5)
        p.line(X(sx - Math.cos(a) * 0.07), X(GRID + 0.06 - Math.sin(a) * 0.07), X(sx + Math.cos(a) * 0.07), X(GRID + 0.06 + Math.sin(a) * 0.07))
      }
    }
  }

  // The projector on the floor: a plinth, a column, the yoke, and the dumbbell turning on its axle.
  drawProjector(p, c, T)
}

function drawProjector(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const [ax, ay] = AXLE
  solid(p, ink, weight, PAINT.timber)
  p.rect(X(ax), X(FLOOR_Y + R - 0.08), X(1.1), X(0.16), X(0.02))
  p.rect(X(ax), X((FLOOR_Y + R - 0.16 + ay + 0.35) / 2), X(0.26), X(FLOOR_Y + R - 0.16 - ay - 0.35))
  // The yoke: two arms up to the axle.
  outline(p, ink, weight)
  for (const side of [-1, 1]) p.line(X(ax + side * 0.13), X(ay + 0.35), X(ax + side * 0.42), X(ay))
  p.line(X(ax - 0.42), X(ay), X(ax + 0.42), X(ay))
  const a = projectorAt(T)
  p.push()
  p.translate(X(ax), X(ay))
  p.rotate(a)
  solid(p, ink, weight, PAINT.deep)
  p.rect(0, 0, X(ARM * 2), X(0.14), X(0.02))
  for (const side of [-1, 1]) {
    const cx = side * ARM
    solid(p, ink, weight, PAINT.deep)
    p.circle(X(cx), 0, X(BULB * 2))
    // The lens barrels, a few, and the bright lens at the pole.
    outline(p, ink, weight * 0.6)
    for (const da of [-0.9, -0.45, 0.45, 0.9]) {
      const b = side > 0 ? da : Math.PI + da
      p.line(X(cx + Math.cos(b) * BULB), X(Math.sin(b) * BULB), X(cx + Math.cos(b) * (BULB + 0.09)), X(Math.sin(b) * (BULB + 0.09)))
    }
    solid(p, ink, weight * 0.6, PAINT.beam)
    p.circle(X(cx + side * BULB), 0, X(0.11))
  }
  solid(p, ink, weight, PAINT.timber)
  p.circle(0, 0, X(0.16))
  p.pop()
}

/** The light, over everything: the projector's beams, sweeping the cloth. */
function drawLight(p: p5, s: StarsState, c: Ctx): void {
  const T = c.t + s.begin
  const dim = dimmed(T)
  if (dim <= 0) return
  const a = projectorAt(T)
  const [ax, ay] = AXLE
  for (const side of [-1, 1]) {
    const lx = ax + Math.cos(a) * side * (ARM + BULB)
    const ly = ay + Math.sin(a) * side * (ARM + BULB)
    const L = 7.5
    const to: Pt = [lx + Math.cos(a) * side * L, ly + Math.sin(a) * side * L]
    beam(p, c, [lx, ly], to, 3.2, 0.13 * dim)
  }
}
