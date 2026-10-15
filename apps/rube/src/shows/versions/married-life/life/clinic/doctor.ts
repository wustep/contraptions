import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, part, type Companion, type Ctx, type Pose } from '../kit'
import { CUTS } from '../seams'
import { CLINIC, HOME, INK } from '../worlds'
import { CEIL, D_IN, D_OUT, drawVisitorChair, FLOOR, hexA, lean, OFFICE, OFFICE_APART, officeBars, officeCold, plantShape, SEAT } from './clinic'

/**
 * DOCTOR (73.456 to 84.376): the doctor's office, the held note, the silence. The film's own restraint: nothing
 * strikes, nothing is said, and the doctor is never seen (we sit in his chair; his white coat is on its stand).
 *
 * They sit side by side in two of the clinic's chairs, a little apart, facing us, in bars of sun from blinds we never
 * see. Through the held note the sun moves: its bars slide off him, then off her. On the first of four soft notes
 * (80.469) she draws herself up a little; on the third (81.136) she sinks, slumping as she will on the hill, rolling a
 * little away from him, her gaze falling to the floor; on the fourth (81.508) he leans to her. A cloud takes the last
 * of the sun, the room goes cold, and in the near silence he sits back, alone with it, and the camera, close on them
 * since her sinking, drifts off her to the left of him, where on the far side of the cut the back door opens on the
 * yard, and she is out there by herself.
 *
 * Frame: Carl's seat is (-0.5, 0) (he enters there at rest, and leaves there at rest: `exit` is [0, 0]); the set
 * draws the room from the same point (`OFFICE`).
 */

/** Where this part's entry cell is: half a cell right of Carl's seat in the office (he enters at (-0.5, 0)). */
export const DOCTOR_AT: Pt = [OFFICE[0] + 0.5, OFFICE[1]]

/** Carl's seat in this frame. */
const O = -0.5

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The first of four soft notes: she draws herself up, hearing it. */
const TENSE = 80.469
/** The third, the strongest: she sinks. */
export const SLUMP = 81.136
/** The fourth: he leans to her. */
const LEAN = 81.508
/** The two soft notes in the near silence (83.064, 83.406): he sits back between them and the cut. */
const BACK = 83.064

/** Every strike of this part, in show seconds (check:shows holds each to the music): only her sinking, on its note. */
export const DOCTOR_HITS: number[] = [SLUMP]

/* ------------------------------------------------------------------ the two of them */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
/** Fast from its start, settling long: the shape of a loss of heart. */
const settle = (u: number) => 1 - Math.pow(1 - clamp01(u), 3)
const inout = (u: number) => { const v = clamp01(u); return v * v * (3 - 2 * v) }

/** How far she has sunk into her seat (cells, down): up a hair on the first note, then down on the third. */
function sink(T: number): number {
  const up = -0.016 * settle((T - TENSE) / 0.5)
  if (T < SLUMP) return up
  return up + 0.078 * settle((T - SLUMP) / 1.45)
}
/** How far she has rolled away from him in it: her dot turns from up and away to down and away. */
const roll = (T: number): number => 0.1 * settle((T - SLUMP - 0.05) / 1.7)
/**
 * Her shape as she sinks: the hill's slump (`slumpOf`), most of it, lower and wider, settling into her seat as the
 * heart goes out of her. Only a little less (to 0.965), she stayed round and upright, and a fresh viewer saw two
 * people in a waiting room: his lean read, her sinking (the news) did not.
 */
function slump(T: number): { scale: number; stretch: number } {
  const s = settle((T - SLUMP) / 1.6)
  return { scale: 1 - 0.085 * s, stretch: 1 + 0.22 * s }
}
const small = (T: number): number => slump(T).scale

/**
 * Carl's lean to her (radians, clockwise): out on the fourth note, held, and back in the near silence. About 14°: at
 * 8° a fresh viewer could not tell whether he leaned to her or only sat still, and his reach to her is half the beat.
 */
function tilt(T: number): number {
  const out = 0.24 * inout((T - LEAN) / 1.25) + 0.012 * inout((T - LEAN - 1.25) / 0.4)
  return out * (1 - inout((T - BACK) / 1.15))
}

/** Where she is at `T`, in this frame. */
export function ellieDoctor(T: number): Pt {
  return [O + OFFICE_APART + roll(T), sink(T) + (1 - small(T)) * 0.13]
}

/** Where he is at `T`: his seat, moved as he tips over one bottom corner. */
function carl(T: number): Pt {
  const [dx, dy] = lean(tilt(T))
  return [O + dx, dy]
}

/* ------------------------------------------------------------------ the light over them */

/**
 * The sun's bars: light, not lines. Slats' bars, each a parallelogram with a narrow soft edge whose ends lean with the
 * sun's slant (no upright edge anywhere), laid on the wall and the floor and, lighter, the chairs under the two of them
 * (in the part's draw, so they keep their colour), and once more very faintly over them (in its over), so they sit in
 * it. On the wall (`shadowed`) the bars are broken by the soft shadows of what stands in them (`shadows`).
 */
function light(p: p5, c: Ctx, T: number, strength = 1, shadowed = false): void {
  const { k } = c
  const b = officeBars(T)
  if (b.a * strength <= 0.005) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  ctx.save()
  ctx.beginPath()
  ctx.rect((f.x0 - 0.1) * k, CEIL * k, (f.x1 - f.x0 + 0.2) * k, (FLOOR + 0.06 - CEIL) * k)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  const x0 = O + b.x0
  const x1 = O + b.x1
  // The stack's light falling off to both ends, the far one longest.
  const stops: [number, number][] = [[0, 0], [0.22, 0.42], [0.55, 0.36], [0.85, 0.14], [1, 0]]
  const along = (hex: string, a: number) => {
    const g = ctx.createLinearGradient((x0 - 0.5) * k, 0, (x1 + 0.3) * k, 0)
    for (const [at, v] of stops) g.addColorStop(at, hexA(hex, v * a))
    return g
  }
  ctx.fillStyle = along(mixHex(CLINIC.light, HOME.lamp, 0.3), b.a * strength)
  const w = x1 - x0
  const drop = w * b.slope
  // The ends lean with the sun: each bar's ends are further left the lower the bar.
  const LEAN = 0.55
  // Eight slats' bars over the same stack (eight at 0.27 is the six at 0.36 it was), each with a clear shadow between
  // it and the next: with six broad bars and wide soft edges the shadows filled in, and the light read as a smear
  // over the chairs rather than sun through blinds sliding away from them.
  const n = 8
  const pitch = 0.27
  const lit = 0.145
  const bars = (grow: number) => {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const y = b.top + 0.05 + i * pitch - grow / 2
      const h = lit + grow
      const lx = x0 - LEAN * (y - b.top) - grow * 0.6
      const rx = x1 - LEAN * (y - b.top) + grow * 0.6
      ctx.moveTo(lx * k, y * k)
      ctx.lineTo(rx * k, (y + drop) * k)
      ctx.lineTo((rx - LEAN * h) * k, (y + drop + h) * k)
      ctx.lineTo((lx - LEAN * h) * k, (y + h) * k)
      ctx.closePath()
    }
  }
  // Each bar four times, from a little wide and faint to its own width: a soft edge, narrow, not a ruled one.
  for (let pass = 0; pass < 4; pass++) {
    ctx.globalAlpha = 0.33
    bars(0.06 - pass * 0.02)
    ctx.fill()
  }
  // On the wall, what stands in the sun's way takes its light back: within the bars only, soft at the edge.
  if (shadowed) {
    bars(0.06)
    ctx.clip()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = along(mixHex(CLINIC.steel, INK, 0.3), 0.62 * b.a * strength)
    for (let pass = 0; pass < 3; pass++) {
      ctx.globalAlpha = 0.34
      ctx.beginPath()
      shadows(ctx, k, T, 0.03 - pass * 0.015)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

/** How far a shadow on the wall falls from what throws it, across and down, for each cell it stands out from the wall. */
const SUN: Pt = [0.6, 0.24]

/**
 * The shadows in the sun's bars on the wall, added to the current path (each shape grown by `g`): each chair, each of
 * the two of them, and the plant throw theirs a little right of and below themselves (the sun is high on the left, and
 * a shadow falls along the bars' own slope), as far as they stand out from the wall: the chairs' backs a little, their
 * seats and the two of them more, the plant on the floor further. All wound the same way, so one fill is their union.
 */
function shadows(ctx: CanvasRenderingContext2D, k: number, T: number, g: number): void {
  const slab = (depth: number, x0: number, y0: number, x1: number, y1: number) => {
    const [dx, dy] = [SUN[0] * depth, SUN[1] * depth]
    ctx.rect((x0 + dx - g) * k, (y0 + dy - g) * k, (x1 - x0 + 2 * g) * k, (y1 - y0 + 2 * g) * k)
  }
  for (const x of [O, O + OFFICE_APART]) {
    slab(0.07, x - 0.22, -R - 0.005, x + 0.22, -R + 0.125)
    slab(0.25, x - 0.235, SEAT, x + 0.235, SEAT + 0.1)
  }
  const [cx, cy] = carl(T)
  slab(0.25, cx - R, cy - R, cx + R, cy + R)
  const [ex, ey] = ellieDoctor(Math.max(D_IN, Math.min(D_OUT, T)))
  const { scale, stretch } = slump(T)
  const [hx, hy] = [ex + SUN[0] * 0.25, ey + SUN[1] * 0.25]
  const rx = R * scale * stretch + g
  ctx.moveTo((hx + rx) * k, hy * k)
  ctx.ellipse(hx * k, hy * k, rx * k, (R * scale + g) * k, 0, 0, Math.PI * 2)
  plantShape(ctx, k, T, O + SUN[0] * 0.3, SUN[1] * 0.3, g)
}

/** Once the sun has gone the room goes cold: a blue-grey laid over it, under the two of them (drawn before the cast). */
function cold(p: p5, c: Ctx, T: number): void {
  const a = officeCold(T)
  if (a <= 0.005) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = hexA(mixHex(CLINIC.steel, HOME.night, 0.2), 0.22 * a)
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the part */

interface DoctorState {
  begin: number
}

export const doctor = part<DoctorState>(
  {
    name: 'doctor',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      const { k, weight } = c
      const [ex, ey] = ellieDoctor(Math.max(D_IN, Math.min(D_OUT, T)))
      // The sun on the wall and the floor; his chair and hers, her seat pressed where she has sunk into it; and the sun
      // on them, lighter, so the bars cross the chairs without washing out their lines.
      light(p, c, T, 0.75, true)
      // The wall a shade darker under each seat, between its legs: the chairs stand on the floor.
      p.push()
      p.noStroke()
      p.rectMode(p.CORNER)
      p.fill(alpha(p, INK, 0.09))
      for (const x of [O, O + OFFICE_APART]) p.rect((x - 0.2) * k, (SEAT + 0.1) * k, 0.4 * k, (FLOOR - SEAT - 0.1) * k, 0.03 * k)
      p.pop()
      drawVisitorChair(p, k, weight, O)
      drawVisitorChair(p, k, weight, O + OFFICE_APART, Math.max(0, ey) * 0.9, ex)
      light(p, c, T, 0.3)
      cold(p, c, T)
    },
    over: (p, s, c) => light(p, c, c.t + s.begin, 0.16),
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const lane = carried((t) => carl(slot.begin + t), 0, dur, Math.max(1, Math.round(dur / 0.04)))
    const her = (T: number): Companion => {
      const [x, y] = ellieDoctor(T)
      return { x, y, ...slump(T) }
    }
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: (T) => ({ tilt: tilt(T) }) }]
    return {
      cells: box(-6.5, -3.5, 5, 2),
      exit: [0, 0] as Pt,
      lane: { segs: lane, fire: SLUMP - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: her }],
      pose,
    }
  },
  (slot) => [
    // From the two-shot the nursery hands over (4 cells), one slow push in through the held note, easing as it
    // arrives, so her sinking (81.136) and his lean to her (81.508) are the whole picture: the two of them a third of
    // its height, the coat stand and the door gone. Framed on him a little more than on her, the empty side of the
    // room at the left.
    { t: 77.6, cells: 3.05, hold: [O + 0.2, -0.5], w: 1 },
    { t: SLUMP, cells: 2.3, hold: [O + 0.1, -0.47], w: 1 },
    // It stays with them, creeping in, through his lean and the first soft note of the near silence (83.064): the
    // camera does not leave while the moment plays.
    { t: 82.3, cells: 2.24, hold: [O + 0.02, -0.47], w: 1 },
    { t: 83.1, cells: 2.2, hold: [O - 0.08, -0.47], w: 1 },
    // Then, as he sits back, a short slow drift left, off her, to the cut (`CUTS.yard`): close, so the yard opens on
    // him alone at the back door and her small on her stump at the far left.
    { t: slot.end, cells: CUTS.yard.cells, hold: [O + CUTS.yard.frame[0], CUTS.yard.frame[1]], w: 1 },
  ],
)
