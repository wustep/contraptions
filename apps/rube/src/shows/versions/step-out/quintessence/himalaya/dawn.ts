import type { Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { at } from '../music'
import { mix } from '../home/pen'

/**
 * The build is a sunrise. It opens in the blue hour: cold slate-blue shadows, pale blue-grey snow, an indigo sky with
 * the last stars in it. The horizon warms to apricot through the climb; as the choir comes in, first light touches the
 * highest far peaks in rose-gold; by the leopard the far range is gold and the sun's edge lifts over a ridge; by the
 * peak everything is gold-white. The light comes down each range in turn, the far ones first, and last onto the face
 * they are on.
 *
 * Everything here is a function of show time alone: the colours, where the light has reached, the sun, the wind.
 */

/** The build's phrases: four bars each, the choir coming up a phrase at a time, to the peak (bar 110). */
export const PHRASES = [83, 87, 91, 95, 99, 103, 107, 110].map((b) => at(b))

/** How far the build has climbed, 0 to 1: each phrase steps up on its downbeat and creeps on through it, so every one is bigger than the last. */
export function rise(t: number): number {
  if (t <= PHRASES[0]) return 0
  if (t >= PHRASES[7]) return 1
  let i = 0
  while (t >= PHRASES[i + 1]) i++
  const a = PHRASES[i]
  const b = PHRASES[i + 1]
  return (i + 0.55 * smooth(t, a, a + 0.9) + 0.45 * ((t - a) / (b - a))) / 7
}

/* ------------------------------------------------------------------ the colours */

/** When the light changes: the blue hour, the horizon warming, first light on the summits, the alpenglow, the sun's edge, the sun on the ledge, gold-white. */
const KEYS = [146.5, 157, 166.4, 173, 179, 185, 191.4]

function ramp(t: number, cols: readonly string[]): string {
  if (t <= KEYS[0]) return cols[0]
  for (let i = 0; i + 1 < KEYS.length; i++) if (t < KEYS[i + 1]) return mix(cols[i], cols[i + 1], smooth(t, KEYS[i], KEYS[i + 1]))
  return cols[cols.length - 1]
}

function num(t: number, vals: readonly number[]): number {
  if (t <= KEYS[0]) return vals[0]
  for (let i = 0; i + 1 < KEYS.length; i++) if (t < KEYS[i + 1]) return vals[i] + (vals[i + 1] - vals[i]) * smooth(t, KEYS[i], KEYS[i + 1])
  return vals[vals.length - 1]
}

export interface Tone {
  t: number
  /** The sky, top to bottom. */
  zenith: string
  high: string
  low: string
  horizon: string
  /** The far ranges: snow in shadow, the shadowed flanks, rock, and the light where it has reached. */
  snow: string
  shade: string
  rock: string
  lit: string
  litRock: string
  /** The sea of cloud: its tops and its undersides. */
  cloud: string
  cloudUnder: string
  /** The face he climbs: its snow high and low, its shadows, its rock, the rock's snow-lit tops. */
  faceSnow: string
  faceLow: string
  faceShade: string
  faceRock: string
  faceRockTop: string
  /** The light on the face. */
  faceLit: string
  /** The air's tint for distance. */
  haze: string
  /** Birds, and the darkest things far off. */
  ink: string
  /** The sun: its disc, and how strong its light is (0 before it is up). */
  sun: string
  light: number
  /** How much of the night is left: the stars. */
  night: number
}

let last: Tone | null = null

/** The light at `t`. The set and the front ask in the same frame, so the last is kept. */
export function tone(t: number): Tone {
  if (last && last.t === t) return last
  const x: Tone = {
    t,
    zenith: ramp(t, ['#1C2450', '#222D5E', '#2A3B70', '#34508A', '#4669A1', '#5A84BA', '#76A0CE']),
    high: ramp(t, ['#33407A', '#3E4E86', '#566596', '#7782AE', '#9DAACB', '#BFCCE0', '#D6E4F0']),
    low: ramp(t, ['#5E6390', '#7D7598', '#B38C9A', '#D6A79E', '#EBC7A6', '#F6DDBA', '#FCEDD4']),
    horizon: ramp(t, ['#8A86A8', '#B994A0', '#E2AE96', '#F0C095', '#F7D39C', '#FBE3B8', '#FFF2DA']),
    snow: ramp(t, ['#7E89AE', '#8892B4', '#97A0BE', '#A7AFC9', '#B9C3D8', '#CBD5E4', '#DCE5EF']),
    shade: ramp(t, ['#47517C', '#4E5882', '#5A6489', '#64709A', '#6E7FAE', '#7C8FBC', '#8DA1C9']),
    rock: ramp(t, ['#353D62', '#3B4468', '#454E70', '#525C7B', '#616C88', '#717D97', '#8290A8']),
    lit: ramp(t, ['#A99CB8', '#C9A6AE', '#F0BFAB', '#F4C9A8', '#F8D8A2', '#FCE6BE', '#FFF5E2']),
    litRock: ramp(t, ['#5E5A78', '#7A6676', '#9C7F84', '#A98C82', '#B39E80', '#C2AF90', '#D2C4A8']),
    cloud: ramp(t, ['#8E95B6', '#9AA0BD', '#ACAEC6', '#C7C1CF', '#E6D9CF', '#F7EBDC', '#FFF7EC']),
    cloudUnder: ramp(t, ['#5E6790', '#68709A', '#757CA2', '#838BAD', '#98A3BE', '#AEBACE', '#C3CEDD']),
    faceSnow: ramp(t, ['#A9B4CC', '#B0BAD0', '#B9C1D4', '#C4CBDB', '#D2D8E4', '#E3E7EE', '#F0F2F5']),
    faceLow: ramp(t, ['#8E9AB6', '#96A1BC', '#A0AAC2', '#ABB5CA', '#BCC5D5', '#CDD5E1', '#DCE2EB']),
    faceShade: ramp(t, ['#6F7C9C', '#7683A2', '#808CA9', '#8C97B1', '#9AA6BE', '#AAB6CB', '#BAC5D7']),
    faceRock: ramp(t, ['#3C4762', '#414C67', '#47526C', '#4F5A73', '#58637B', '#626D84', '#6D788E']),
    faceRockTop: ramp(t, ['#C4CDDE', '#C9D1E0', '#D2D7E3', '#DCDDE4', '#EDE5DD', '#F8EEDF', '#FFF8EA']),
    faceLit: ramp(t, ['#C6BCD0', '#D8C0C4', '#F2CDB8', '#F8D7B6', '#FCE3BA', '#FFEFCF', '#FFF8E8']),
    haze: ramp(t, ['#7378A0', '#8A86A6', '#B29CAB', '#CDB2AE', '#E3CDB6', '#F0E0CA', '#F8EEDF']),
    ink: ramp(t, ['#232A40', '#262D44', '#2A3147', '#2F354B', '#353A4F', '#3B4054', '#42475A']),
    sun: ramp(t, ['#FFD9A8', '#FFD9A8', '#FFDDAA', '#FFE2AE', '#FFEABF', '#FFF2D6', '#FFFAEE']),
    light: num(t, [0, 0, 0.12, 0.3, 0.62, 0.85, 1]),
    night: 1 - smooth(t, 148, 163),
  }
  last = x
  return x
}

/* ------------------------------------------------------------------ where the light has reached */

/**
 * The line the sunlight has come down to on each plane, in that plane's own cells (y down): above it the plane is lit,
 * below it in shadow. The far range first, as the choir comes in; the face they are on last, onto the ledge as Sean
 * lifts his eye from the camera and on down after.
 */
const LIT: Record<string, [number, number][]> = {
  far: [[164.5, -14.2], [168, -12.6], [174, -11.4], [180, -9.8], [191.4, -6.5]],
  mid: [[169, -12.8], [173.5, -11.6], [179, -10.2], [186, -8.2], [191.4, -6.5]],
  near: [[173, -12], [177.5, -10.8], [182, -9.4], [188, -7.4], [191.4, -6]],
  low: [[176, -10.8], [180, -9.6], [186, -8], [191.4, -6]],
  world: [[177.5, -13.8], [180.5, -12.2], [183.5, -9.9], [187.5, -6.8], [191.4, -3.5]],
}
export type LitPlane = keyof typeof LIT

export function litY(t: number, plane: LitPlane): number {
  const ks = LIT[plane]
  if (t <= ks[0][0]) return ks[0][1] - 4
  for (let i = 0; i + 1 < ks.length; i++) {
    const [a, ya] = ks[i]
    const [b, yb] = ks[i + 1]
    if (t < b) return ya + (yb - ya) * ((t - a) / (b - a))
  }
  return ks[ks.length - 1][1]
}

/* ------------------------------------------------------------------ the sun */

/**
 * Where the sky's plane is pinned: the valley, where the camera is through the hold, at the hold's distance. The sky
 * is painted at depth 0 (it never moves on the screen); the ranges in front of it move a little more each.
 */
export const VALLEY: Pt = [10.6, -10.0]
export const REF = 7

/** The sun on the sky's plane: below the far range through the climb, its edge over the ridge as the cat comes out, climbing on into the peak. */
const SUN: [number, number][] = [[150, -9.0], [176, -10.2], [178, -10.88], [191.4, -12.9]]
export function sunAt(t: number): Pt {
  if (t <= SUN[0][0]) return [14.15, SUN[0][1]]
  for (let i = 1; i < SUN.length; i++) if (t < SUN[i][0]) return [14.15, SUN[i - 1][1] + ((SUN[i][1] - SUN[i - 1][1]) * (t - SUN[i - 1][0])) / (SUN[i][0] - SUN[i - 1][0])]
  return [14.15, SUN[SUN.length - 1][1]]
}
export const SUN_R = 0.3

/* ------------------------------------------------------------------ the wind */

/**
 * The gusts: on every other downbeat through the slow climb, every downbeat as the choir comes up, and on the third
 * beats too through the hold, so the wind builds with the music. Each one tears snow off every ridge.
 */
export const GUSTS: number[] = (() => {
  const out: number[] = []
  for (let b = 83; b <= 109; b++) {
    if (b < 91 && b % 2 === 0) continue
    out.push(at(b, 1))
    if (b >= 97 && b <= 108) out.push(at(b, 3))
  }
  return out
})()

/** How hard the wind is blowing, 0 to about 1.6: a floor that rises with the build, and each gust on it. */
export function wind(t: number): number {
  let g = 0
  for (const s of GUSTS) {
    const d = t - s
    if (d < 0 || d > 3) continue
    g = Math.max(g, (1 - Math.exp(-d / 0.1)) * Math.exp(-d / 0.9))
  }
  return 0.25 + 0.5 * rise(t) + g * (0.5 + 0.4 * rise(t))
}
