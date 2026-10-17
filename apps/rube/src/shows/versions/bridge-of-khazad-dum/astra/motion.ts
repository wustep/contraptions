import type { Pt } from '../../../../parts'
import type { ShowBall } from '../../../../show'
import { curve, mix, phase, rotate, settle, smooth } from './math'

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

/** Height of the actual supporting surface, measured at the ball centre. */
function profile(x: number, points: Pt[]): number {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) return mix(points[i - 1][1], points[i][1], phase(x, points[i - 1][0], points[i][0]))
  }
  return points[points.length - 1][1]
}
const approachX = curve([[0, -2], [8, -2], [16, 1], [24, 8], [35, 13], [43, 16], [56, 24], [64, 28.6]])
export const roadY = (x: number): number => profile(x, [[1, 0], [8, 1], [24, 3], [28.6, 3]])
export const rootAngle = (t: number): number => -0.13 * smooth(t, 35, 39) + 0.13 * smooth(t, 44, 49) + settle(t, 39, 0.025)
export const councilAngle = (t: number): number => -0.16 * smooth(t, 78, 89) + settle(t, 89, 0.016, 3)
export const councilDeck = (x: number, t: number): Pt => {
  const q = rotate(x, -0.8, councilAngle(t))
  return [34 + q[0], 4.015 + q[1] - RADIUS]
}
const councilX = curve([[64, -5.4], [73, -1.2], [81, -0.6], [90, 2.3], [99, 5.4]])
export const liftAt = (t: number): Pt => {
  const u = smooth(t, 112, 140)
  return [47 + 7 * u, 1 - 10 * u]
}
const mountainX = curve([[140, 54], [146, 58], [152, 61], [158, 64]])
export const mountainY = (x: number): number => profile(x, [[52.65, -9], [55.35, -9], [58, -8], [61, -4], [64, 0], [72, 1], [78, 2]])
const hallX = curve([[158, 64], [174, 72], [184, 77], [190, 78]])
export const stairAngle = (t: number): number => 0.2 + 0.11 * smooth(t, 188, 198.4) + settle(t, 198.4, 0.035, 4, 2.6)
/** Left hinge stays on its abutment. The top edge and every rider use this same transform. */
export const stairAt = (u: number, t: number): Pt => [78 + 14 * u * Math.cos(stairAngle(t)), 2 + 14 * u * Math.sin(stairAngle(t))]
function stairWalk(distance: number, t: number): Pt {
  if (distance < 0) return [78 + distance, mountainY(78 + distance)]
  if (distance <= 14) return stairAt(distance / 14, t)
  const end = stairAt(1, t), x = end[0] + distance - 14
  return [x, profile(x, [end, [97, 5], [139, 5]])]
}
const crossingX = curve([[234, 104], [247, 114], [263, 129], [272, 135], [280, 139]])
const groveX = curve([[280, 139], [289, 142], [294, 144]])
export const leafAt = (t: number): Pt => {
  const u = smooth(t, 294, 307)
  return [144 + 5.5 * u, 5.5 + 5.2 * u]
}
const shoreX = curve([[307, 149.5], [313, 152.7], [319, 155]])
const boatX = curve([[319, 155], [326, 159.5], [330, 160.7], [339, 168], [357, 179], [383, 181]])
export const boatAt = (t: number): Pt => [boatX(t), 10.7 + 0.026 * Math.sin((t - 319) * 1.2) * smooth(t, 319, 323)]
export const boatAngle = (t: number): number => 0.07 * smooth(t, 320, 324) - 0.07 * smooth(t, 329.2, 334) + settle(t, 329.2, -0.11, 3, 2.5)
function seated(t: number, offset: number): Pt {
  const q = boatAt(t), r = rotate(offset, -0.06, boatAngle(t))
  return [q[0] + r[0], q[1] + RADIUS + r[1] - RADIUS * Math.cos(boatAngle(t))]
}

/** Shared, current supports. Companions are separated along a deck, not delayed in its clock. */
function traveller(t: number, offset: number): Pt {
  if (t < 64) { const x = approachX(t) + offset; return [x, roadY(x)] }
  if (t < 99) return councilDeck(councilX(t) + offset, t)
  if (t < 112) {
    const first = councilDeck(5.4 + offset, 99), u = smooth(t, 99, 112)
    const x = mix(first[0], 47 + offset, u)
    const edge = councilDeck(7.5, 99)
    const y = x <= edge[0] ? 4.015 - 0.8 / Math.cos(councilAngle(99)) + (x - 34) * Math.tan(councilAngle(99)) - RADIUS
      : profile(x, [edge, [45.65, 1], [48.35, 1]])
    return [x, y]
  }
  if (t < 140) { const q = liftAt(t); return [q[0] + offset, q[1]] }
  if (t < 158) { const x = mountainX(t) + offset; return [x, mountainY(x)] }
  if (t < 190) {
    const x = hallX(t) + offset
    return x < 78 ? [x, mountainY(x)] : stairWalk(x - 78, t)
  }
  if (t < 212) return stairWalk(14 * smooth(t, 190, 212) + offset, t)
  if (t < 234) {
    const first = stairWalk(14 + offset, 212), end = stairAt(1, t)
    const x = mix(first[0], 104 + offset, smooth(t, 212, 234))
    return x <= end[0] ? [x, 2 + (x - 78) * Math.tan(stairAngle(t))] : [x, profile(x, [end, [97, 5], [139, 5]])]
  }
  if (t < 280) return [crossingX(t) + offset, 5]
  if (t < 294) {
    const x = groveX(t) + offset
    return [x, profile(x, [[139, 5], [142.65, 5.5], [145.35, 5.5]])]
  }
  if (t < 307) { const q = leafAt(t); return [q[0] + offset, q[1]] }
  if (t < 319) return [shoreX(t) + offset, 10.7]
  const q = boatAt(t), end = seated(t, 0.35)
  return [mix(q[0], end[0], smooth(t, 319, 321)), mix(q[1], end[1], smooth(t, 319, 321))]
}
export const frodoAt = (t: number): Pt => traveller(t, 0)
export function samAt(t: number): Pt {
  if (t < 319) return traveller(t, -0.85)
  if (t < 326) return [154.15, 10.7]
  if (t < 329.2) {
    const u = phase(t, 326, 329.2), end = seated(329.2, -0.46)
    return [mix(154.15, end[0], u), mix(10.7, end[1], u) - 2.5 * 4 * u * (1 - u)]
  }
  return seated(t, -0.46)
}
export function gandalfAt(t: number): Pt | null {
  if (t < 74) return [36.5, 3]
  if (t < 90) {
    const q = traveller(t, 0.85), u = smooth(t, 74, 90)
    const x = mix(36.5, q[0], u)
    return [x, 4.015 - 0.8 / Math.cos(councilAngle(t)) + (x - 34) * Math.tan(councilAngle(t)) - RADIUS]
  }
  if (t < 234) return traveller(t, 0.85)
  if (t < 263.4) return [curve([[234, 104.85], [243, 116], [263.4, 116]])(t), 5 - 0.65 * smooth(t, 243, 245) + 0.65 * smooth(t, 253, 257)]
  if (t < 274.2) return [116, 5 + 0.12 * smooth(t, 263.4, 274.2)]
  if (t < 282) { const d = t - 274.2; return [116 - 0.13 * d, 5.12 + 0.7 * d * d] }
  return null
}

/** The ring is a prop, not another cast member. No ball is spawned or recoloured. */
export function ringAt(t: number): Pt {
  if (t < 7.6) return [mix(-4.25, -2.48, smooth(t, 0, 7.6)), mix(-1.4, 0.045, smooth(t, 0, 7.6))]
  const p = frodoAt(t)
  const ground = t < 319 ? traveller(t, -0.48) : (() => {
    const q = rotate(-0.48, 0, boatAngle(t))
    return [p[0] + q[0], p[1] + q[1]] as Pt
  })()
  const temptation = smooth(t, 311, 315) * (1 - smooth(t, 317, 320))
  // The aperture's hanging cord draws the hoop toward the empty seat; the
  // traveller keeps moving until the tether slips free. The pull has a source.
  return [mix(ground[0], 152.8, temptation * 0.82), mix(ground[1] + 0.045, 9.7, temptation * 0.82)]
}

export function castAt(t: number): ShowBall[] {
  const ball = (who: keyof typeof CAST, p: Pt): ShowBall => ({ ...CAST[who], x: p[0], y: p[1], scale: RADIUS / 0.13, spin: null, rim: '#252B29' })
  const out = [ball('frodo', frodoAt(t)), ball('sam', samAt(t))]
  const g = gandalfAt(t)
  if (g) out.push(ball('gandalf', g))
  return out
}
