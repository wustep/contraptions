import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { box, carried, frame, part, type Companion, type Ctx, type Pose } from '../kit'
import { CLINIC, HOME } from '../worlds'
import { CEIL, D_IN, D_OUT, drawVisitorChair, FLOOR, hexA, lean, OFFICE, OFFICE_APART, officeBars, officeCold } from './clinic'

/**
 * DOCTOR (73.456 to 84.376): the doctor's office, the held note, the silence. The film's own restraint: nothing
 * strikes, nothing is said, and the doctor is never seen (we sit in his chair; his white coat is on its stand).
 *
 * They sit side by side in two of the clinic's chairs, a little apart, facing us, in bars of sun from blinds we never
 * see. Through the held note the sun moves: its bars slide off him, then off her. On the first of four soft notes
 * (80.469) she draws herself up a little; on the third (81.136) she sinks, rolling a little away from him, her gaze
 * falling; on the fourth (81.508) he leans to her. A cloud takes the last of the sun, the room goes cold, and in the
 * near silence he sits back, alone with it, as the camera drifts from her to the left of him, where on the far side
 * of the cut the back door opens on the yard, and she is out there by herself.
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
const SLUMP = 81.136
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
const roll = (T: number): number => 0.09 * settle((T - SLUMP - 0.05) / 1.7)
/** She is a little less, sunk: 1 to 0.965. */
const small = (T: number): number => 1 - 0.035 * settle((T - SLUMP) / 1.6)

/** Carl's lean to her (radians, clockwise): out on the fourth note, held, and back in the near silence. */
function tilt(T: number): number {
  const out = 0.14 * inout((T - LEAN) / 1.25) + 0.012 * inout((T - LEAN - 1.25) / 0.4)
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

/** The sun's bars, over everything in the room and over the two of them. */
function light(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const b = officeBars(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const ox = O
  ctx.save()
  ctx.beginPath()
  ctx.rect((f.x0 - 0.1) * k, CEIL * k, (f.x1 - f.x0 + 0.2) * k, (FLOOR + 0.06 - CEIL) * k)
  ctx.clip()
  if (b.a > 0.005) {
    ctx.globalCompositeOperation = 'screen'
    const x0 = ox + b.x0
    const x1 = ox + b.x1
    // The jambs' edges soft, the far one softest; the whole stack's light falling off to the right.
    const g = ctx.createLinearGradient((x0 - 0.06) * k, 0, (x1 + 0.08) * k, 0)
    const col = mixHex(CLINIC.light, HOME.lamp, 0.25)
    g.addColorStop(0, hexA(col, 0))
    g.addColorStop(0.1, hexA(col, 0.5 * b.a))
    g.addColorStop(0.55, hexA(col, 0.44 * b.a))
    g.addColorStop(0.92, hexA(col, 0.2 * b.a))
    g.addColorStop(1, hexA(col, 0))
    ctx.fillStyle = g
    const w = x1 - x0
    const drop = w * b.slope
    // Each bar three times, a little wider and fainter each time: a sun's soft edge, not a ruled line.
    for (const [grow, a] of [[0.05, 0.35], [0.018, 0.55], [-0.02, 0.5]] as [number, number][]) {
      ctx.globalAlpha = a
      ctx.beginPath()
      for (let i = 0; i < b.n; i++) {
        const y = b.top + i * b.pitch - grow / 2
        const h = b.lit + grow
        ctx.moveTo(x0 * k, y * k)
        ctx.lineTo(x1 * k, (y + drop) * k)
        ctx.lineTo(x1 * k, (y + drop + h) * k)
        ctx.lineTo(x0 * k, (y + h) * k)
        ctx.closePath()
      }
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()
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
      // His chair and hers, her seat pressed where she has sunk into it.
      drawVisitorChair(p, k, weight, O)
      drawVisitorChair(p, k, weight, O + OFFICE_APART, Math.max(0, ey) * 0.9, ex)
      cold(p, c, T)
    },
    over: (p, s, c) => light(p, c, c.t + s.begin),
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const lane = carried((t) => carl(slot.begin + t), 0, dur, Math.max(1, Math.round(dur / 0.04)))
    const her = (T: number): Companion => {
      const [x, y] = ellieDoctor(T)
      return { x, y, scale: small(T) }
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
    // From the two-shot the nursery hands over (4 cells), a slow breath out to the room: the coat, the bars, the two.
    { t: 77.6, cells: 4.55, hold: [O + 0.08, -0.66], w: 1 },
    // Then the long drift left, off her and past him, to where the yard will be: the cut (`CUTS.yard`).
    { t: slot.end, cells: 4.5, hold: [O - 1.4, -0.7], w: 1 },
  ],
)
