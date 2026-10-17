import type { Pt } from '../../../../parts'
import type { ShowBall } from '../../../../show'
import { curve, mix, phase, rotate, route, settle, smooth } from './math'

export const MUSIC_END = 357
export const DURATION = 383
export const RADIUS = 0.215
export const CAST = {
  frodo: { id: 0, color: '#78876A' },
  sam: { id: 1, color: '#C18A5F' },
  gandalf: { id: 2, color: '#DED9C7' },
} as const

/** The cue is not a metronome. These are authored dramatic anchors in recording seconds. */
export const BEATS = {
  ring: 7.6, leave: 24, riders: 37, council: 64, pledge: 82,
  lift: 112, pass: 146, door: 158, bucket: 187.2, stair: 198.4,
  bridge: 234, hold: 263.4, break: 274.2, loss: 280,
  leaf: 294, shore: 310, apart: 319, leap: 326, together: 329.2,
  river: 339, credits: MUSIC_END,
} as const

const approach = route([[0, -2, 0], [8, -2, 0], [16, 1, 0], [24, 8, 1], [35, 13, 1.8], [43, 16, 2.1], [56, 24, 3], [64, 28.6, 3]])
export const roadY = (x: number): number => x < 1 ? 0 : x < 8 ? (x - 1) / 7 : x < 24 ? 1 + (x - 8) / 8 : 3
export const rootAngle = (t: number): number => -0.13 * smooth(t, 35, 39) + 0.13 * smooth(t, 44, 49) + settle(t, 39, 0.025)
export const councilAngle = (t: number): number => -0.16 * smooth(t, 78, 89) + settle(t, 89, 0.016, 3)
export const councilDeck = (x: number, t: number): Pt => {
  const q = rotate(x, -0.8, councilAngle(t))
  return [34 + q[0], 3.8 + q[1] - RADIUS]
}
const councilX = curve([[64, -5.4], [73, -1.2], [81, -0.6], [90, 2.3], [99, 5.4]])
const toLift = route([[99, 39.2, 2.04], [106, 43, 1.4], [112, 47, 1]])
export const liftAt = (t: number): Pt => {
  const u = smooth(t, 112, 140)
  return [47 + 7 * u, 1 - 10 * u + settle(t, 140, 0.06, 2.5, 2.8)]
}
const mountain = route([[140, 54, -9], [146, 58, -8], [152, 61, -4], [158, 64, 0]])
const hall = route([[158, 64, 0], [174, 72, 1], [184, 77, 2], [190, 78, 2]])
export const stairAngle = (t: number): number => 0.2 + 0.11 * smooth(t, 188, 198.4) + settle(t, 198.4, 0.035, 4, 2.6)
export const stairAt = (u: number, t: number): Pt => {
  const q = rotate(mix(-7, 7, u), -RADIUS, stairAngle(t))
  return [85 + q[0], 4.38 + q[1]]
}
const toBridge = route([[212, 91.73, 6.31], [220, 97, 5], [234, 104, 5]])
const crossingX = curve([[234, 104], [247, 114], [263, 129], [272, 135], [280, 139]])
const grove = route([[280, 139, 5], [289, 142, 5.2], [294, 144, 5.5]])
export const leafAt = (t: number): Pt => {
  const u = smooth(t, 294, 307)
  return [144 + 5.5 * u, 5.5 + 5.2 * u + settle(t, 307, 0.06, 3, 2.7)]
}
const shore = route([[307, 149.5, 10.7], [313, 152.7, 10.7], [319, 155, 10.7]])
export const boatAt = (t: number): Pt => {
  const x = curve([[319, 155], [326, 159.5], [330, 160.7], [339, 168], [357, 179], [383, 181]])(t)
  return [x, 10.7 + 0.026 * Math.sin((t - 319) * 1.2) * smooth(t, 319, 323)]
}
export const boatAngle = (t: number): number => 0.07 * smooth(t, 320, 324) - 0.07 * smooth(t, 329.2, 334) + settle(t, 329.2, -0.11, 3, 2.5)

export function frodoAt(t: number): Pt {
  if (t < 64) { const p = approach(t); return [p[0], roadY(p[0])] }
  if (t < 99) return councilDeck(councilX(t), t)
  if (t < 112) return toLift(t)
  if (t < 140) return liftAt(t)
  if (t < 158) return mountain(t)
  if (t < 190) return hall(t)
  if (t < 212) return stairAt(smooth(t, 190, 212), t)
  if (t < 234) return toBridge(t)
  if (t < 280) return [crossingX(t), 5]
  if (t < 294) return grove(t)
  if (t < 307) return leafAt(t)
  if (t < 319) return shore(t)
  const q = boatAt(t), r = rotate(0.35, -0.06, boatAngle(t))
  const inBoat = smooth(t, 319, 321)
  return [q[0] + r[0] * inBoat, q[1] + r[1] * inBoat]
}

/** Sam's feet use the same support's current pose, never its earlier orientation. */
export function samAt(t: number): Pt {
  if (t < 64) { const x = frodoAt(t)[0] - 0.85; return [x, roadY(x)] }
  if (t < 99) return councilDeck(councilX(t) - 0.85, t)
  if (t >= 112 && t < 140) { const q = liftAt(t); return [q[0] - 0.8, q[1]] }
  if (t >= 190 && t < 212) return stairAt(Math.max(0, smooth(t, 190, 212) - 0.061), t)
  if (t >= 294 && t < 307) { const q = leafAt(t); return [q[0] - 0.8, q[1]] }
  if (t < 319) { const q = frodoAt(Math.max(0, t - 1.8)); return [q[0] - 0.12, q[1]] }
  if (t < 326) return [154.2, 10.7]
  if (t < 329.2) {
    const u = phase(t, 326, 329.2), end = boatAt(329.2)
    return [mix(154.2, end[0] - 0.46, u), mix(10.7, end[1] - 0.08, u) - 2.5 * 4 * u * (1 - u)]
  }
  const q = boatAt(t), r = rotate(-0.46, -0.06, boatAngle(t))
  return [q[0] + r[0], q[1] + r[1]]
}

export function gandalfAt(t: number): Pt | null {
  if (t < 59) return [36.5, 2.785]
  if (t < 99) return councilDeck(mix(2.5, councilX(t) + 1.1, smooth(t, 74, 90)), t)
  if (t >= 112 && t < 140) { const q = liftAt(t); return [q[0] + 0.8, q[1]] }
  if (t >= 190 && t < 212) return stairAt(Math.min(1, smooth(t, 190, 212) + 0.075), t)
  if (t < 234) { const q = frodoAt(Math.min(234, t + 1.5)); return [q[0] + 0.1, q[1]] }
  if (t < 263.4) return [curve([[234, 105.1], [246, 116], [263.4, 116]])(t), 5]
  if (t < 274.2) return [116, 5 + 0.12 * smooth(t, 263.4, 274.2)]
  if (t < 282) { const d = t - 274.2; return [116 - 0.13 * d, 5.12 + 0.7 * d * d] }
  return null
}

/** The ring is a prop, not another cast member. No ball is spawned or recoloured. */
export function ringAt(t: number): Pt {
  if (t < 7.6) return [mix(-4.25, -2.48, smooth(t, 0, 7.6)), mix(-1.4, 0.03, smooth(t, 0, 7.6))]
  const p = frodoAt(t)
  const temptation = smooth(t, 311, 315) * (1 - smooth(t, 317, 320))
  return [p[0] - 0.48 + 1.12 * temptation, p[1] + 0.03 - 0.26 * temptation]
}

export function castAt(t: number): ShowBall[] {
  const ball = (who: keyof typeof CAST, p: Pt): ShowBall => ({ ...CAST[who], x: p[0], y: p[1], scale: RADIUS / 0.13, spin: null, rim: '#252B29' })
  const out = [ball('frodo', frodoAt(t)), ball('sam', samAt(t))]
  const g = gandalfAt(t)
  if (g) out.push(ball('gandalf', g))
  return out
}
