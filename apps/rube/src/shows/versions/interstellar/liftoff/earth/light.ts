import { mixHex } from '../../../../../parts'
import { smooth } from '../kit'

/**
 * The farm's day, as a colorist would grade it: one function of show time that the sky, the far land, the room's
 * window and the near ground all read, so Act I's light moves as one.
 *
 *   0 to 14 s    blue before dawn, then the dawn (Murph's room)
 *   18 to 30 s   a pale morning in the yard, the sun low on the left
 *   38 to 53 s   noon in the corn: bleached, flat, the sun overhead and out of the frame
 *   55 to 72 s   afternoon at the combine and the fence: the sun coming down, the light warming
 *   72 to 88 s   late afternoon at the base and the launch: ochre and rust under the dust wall, the sun low and orange
 *
 * The dust wall on the horizon grows with it (`storm`), from a low bank in the morning to the storm they leave ahead of.
 */
export interface Day {
  /** The sky at the top of the frame and down at the horizon, before height turns it blue. */
  top: string
  low: string
  /** The far land, from the horizon down. */
  land: [string, string, string]
  /** The sun: across from the frame's middle and up from the horizon (cells), its size, colour and strength. */
  sunX: number
  sunUp: number
  sunR: number
  sun: string
  /** How far the dust wall has come, 0 to 1. */
  storm: number
  /** Afternoon, 0 to 1: how warm the light has gone. */
  warm: number
  /** The grade laid over the whole frame (multiplied): its colour, and how much of it. */
  grade: string
  gradeA: number
}

type Key = { t: number; top: string; low: string; land: [string, string, string]; sunX: number; sunUp: number; sun: string; grade: string; gradeA: number }

const KEYS: Key[] = [
  { t: 0, top: '#56637A', low: '#B79E86', land: ['#B5A17D', '#AD9766', '#9F8A5C'], sunX: -3.2, sunUp: 0.4, sun: '#FFF1D8', grade: '#FFFFFF', gradeA: 0 },
  { t: 14, top: '#BFC6C2', low: '#F2DDB8', land: ['#DFCEA0', '#D9C27A', '#CBB06E'], sunX: -3.2, sunUp: 1.4, sun: '#FFF7E4', grade: '#FFFFFF', gradeA: 0 },
  // Morning in the yard: cool at the top, pale at the horizon.
  { t: 24, top: '#C7CEC8', low: '#F1E1C0', land: ['#E0CFA2', '#DAC37E', '#CCB171'], sunX: -3.0, sunUp: 2.0, sun: '#FFF8E8', grade: '#FFFFFF', gradeA: 0 },
  // Noon in the corn: bleached, the sun gone up out of the frame.
  { t: 40, top: '#E2E2D6', low: '#F0E8D2', land: ['#E8DAB0', '#E0CD8E', '#D3BA7C'], sunX: -1.4, sunUp: 3.9, sun: '#FFFCF2', grade: '#FFFFFF', gradeA: 0 },
  { t: 53, top: '#E0DED0', low: '#EFE4CA', land: ['#E6D6A8', '#DECA88', '#D1B676'], sunX: -2.2, sunUp: 3.6, sun: '#FFFBEE', grade: '#FFFFFF', gradeA: 0 },
  // Afternoon: the sun coming down on the left, the light warming.
  { t: 62, top: '#D9D0B6', low: '#ECD2A2', land: ['#E0C795', '#D7BC7A', '#C8A86A'], sunX: -3.6, sunUp: 2.4, sun: '#FFEBC2', grade: '#FCEFDD', gradeA: 0.6 },
  { t: 72, top: '#CFC0A0', low: '#E2B984', land: ['#D8B987', '#CDA96B', '#BA965C'], sunX: -4.8, sunUp: 1.75, sun: '#FCDCA4', grade: '#F8E4C8', gradeA: 0.85 },
  // Late, under the dust wall: ochre low down, the sun low and orange.
  { t: 82, top: '#C6B597', low: '#D79B62', land: ['#CFA674', '#C29660', '#AE8452'], sunX: -5.8, sunUp: 1.3, sun: '#F7C27E', grade: '#F3D9B8', gradeA: 1 },
  { t: 90, top: '#C2B092', low: '#D39459', land: ['#CBA06E', '#BE915B', '#A9804E'], sunX: -6.0, sunUp: 1.2, sun: '#F5B972', grade: '#F2D6B4', gradeA: 1 },
]

const ease = (u: number) => u * u * (3 - 2 * u)

/** The day at show time `t`. */
export function dayAt(t: number): Day {
  let i = 0
  while (i + 1 < KEYS.length - 1 && t >= KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const u = ease(Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))))
  const m = (x: string, y: string) => mixHex(x, y, u)
  const n = (x: number, y: number) => x + (y - x) * u
  return {
    top: m(a.top, b.top),
    low: m(a.low, b.low),
    land: [m(a.land[0], b.land[0]), m(a.land[1], b.land[1]), m(a.land[2], b.land[2])],
    sunX: n(a.sunX, b.sunX),
    sunUp: n(a.sunUp, b.sunUp),
    sunR: 0.23 + 0.05 * smooth(t, 60, 86),
    sun: m(a.sun, b.sun),
    storm: smooth(t, 34, 84),
    warm: smooth(t, 55, 82),
    grade: m(a.grade, b.grade),
    gradeA: n(a.gradeA, b.gradeA),
  }
}

/** The integral of `smooth(t, a, b)` from 0: how long it has been on, counting its ease. */
const onFor = (t: number, a: number, b: number): number => {
  if (t <= a) return 0
  if (t >= b) return t - (a + b) / 2
  const u = (t - a) / (b - a)
  return (b - a) * (u ** 3 - u ** 4 / 2)
}

/**
 * How far the wind has carried the dust by `t` (cells, + to the right): a light air drifting right in the morning, and
 * from the afternoon the storm's outflow, blowing back hard to the left ahead of the wall.
 */
export const windAt = (t: number): number => 0.09 * t - 0.75 * onFor(t, 56, 74)
/** The wind's pace at `t`, cells a second (+ to the right). */
export const windPace = (t: number): number => 0.09 - 0.75 * smooth(t, 56, 74)

/**
 * The near ground in world cells, under the frame's middle: the yard and the channel (1.13), the road the truck runs
 * (2.13), and the valley floor past the dam (5.13), where the base stands. What the far land is laid out toward.
 */
export function groundAt(cx: number): number {
  return 1.13 + smooth(cx, 21, 27) + 3 * smooth(cx, 73, 79)
}
