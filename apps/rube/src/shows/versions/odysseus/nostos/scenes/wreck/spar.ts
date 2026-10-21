import { mix, rgba, ring, smooth, stroke, type Paint } from '../../draw'
import { M } from '../../music'
import { G, type Pt } from '../../path'
import { glide } from '../../voyage'
import { surface } from '../../world/sea'
import { frontLift } from '../storm/weather'
import { DECK } from '../../world/ship'
import { lazy, STRIKE } from '../sirens/course'
import { bowHalf, halfAngle, onHalf, sternHalf } from './hull'

/**
 * The mast, struck: it stands for an instant as the ship drew it, then goes over towards the bow as the hull cracks,
 * its yard and furled sail tearing away into the sea, and the pole comes down flat on the water and floats. That pole is
 * what he rides for the rest of the storm, and on, to Ogygia: drifting, tossed on the great seas, and at the last
 * attack driven into the shallows of the beach, where it stops dead.
 */

/** When the mast is down on the water, floating. */
export const FLOAT = STRIKE + 1.25
/** When the spar runs aground: the cue's last attack. */
export const AGROUND = M.lastAttack
/** The pole's length, and its thickness once it is a timber on the water. */
export const POLE = 2.4
const THICK = 0.1

const fall = (t: number): number => {
  const u = Math.max(0, Math.min(1, (t - (STRIKE + 0.15)) / (FLOAT - STRIKE - 0.15)))
  return u * u
}

/** The mast's foot and its pointing angle while it stands on the bow half. */
const standingFoot = (t: number): Pt => onHalf(t, bowHalf, [0.15, DECK])
const standingAngle = (t: number): number => halfAngle(t, bowHalf) - Math.PI / 2

/** Where the floating spar's middle is along the sea: carried by the storm, faster in the great seas, and aground. */
const drift = lazy(() =>
  glide([
    [FLOAT, standingFoot(FLOAT)[0] + POLE / 2, 0.7],
    [M.lowBack, 571, 2.6],
    [334, 603, 3.1],
    [M.lowGone, 629, 2.7],
    [347, 645.5, 2.0],
    [AGROUND, 654.2, 1.4],
  ]),
)
export const sparX = (t: number): number => {
  if (t <= AGROUND) return drift()(t)
  // Aground: it stops dead and rocks back a hair.
  return 654.2 - 0.04 * ring(t, AGROUND, 2.2, 0.25)
}

/** The spar's pose: its foot (left end) and its angle (along the pole, from the foot), and how thick it is drawn. */
export interface SparPose {
  foot: Pt
  a: number
  thick: number
}

export function sparPose(t: number): SparPose {
  const k = fall(t)
  const x = sparX(Math.max(t, FLOAT))
  const settle = t < AGROUND ? 0.09 * ring(t, FLOAT, 1.3, 0.5) : 0
  const ground = smooth(t, AGROUND - 0.2, AGROUND + 0.3)
  // On the sea, and on the front rank of the great seas where they stand (`frontLift`).
  const Y = (u: number) => surface(u, t) - frontLift(u, t)
  const a = Math.atan2(Y(x + POLE / 2) - Y(x - POLE / 2), POLE) * 0.9 * (1 - ground) - 0.05 * ground
  const cy = Y(x) - 0.01 + settle - 0.08 * ground
  const lie: Pt = [x - (POLE / 2) * Math.cos(a), cy - (POLE / 2) * Math.sin(a)]
  const thick = 2.86 / 108 + (THICK - 2.86 / 108) * smooth(t, STRIKE + 0.2, FLOAT)
  if (k >= 1) return { foot: lie, a, thick }
  const f = standingFoot(t)
  const a0 = standingAngle(t)
  return { foot: [f[0] + (lie[0] - f[0]) * k, f[1] + (lie[1] - f[1]) * k], a: a0 + (a - a0) * k, thick }
}

/** A point on the spar: `d` along it from the foot, `h` off it on its upper side (cells). */
export function onSpar(t: number, d: number, h: number): Pt {
  const s = sparPose(t)
  const c = Math.cos(s.a)
  const n = Math.sin(s.a)
  return [s.foot[0] + c * d + n * h, s.foot[1] + n * d - c * h]
}

export const sparAngle = (t: number): number => sparPose(t).a

/** The yard and its furled sail: on the mast until it is half over, then torn away into the sea, and down. */
const TEAR = STRIKE + 0.15 + (FLOAT - STRIKE - 0.15) * Math.SQRT1_2
const yardOnMast = (t: number): { c: Pt; a: number } => ({ c: onSpar(t, POLE - 0.25, 0), a: sparPose(t).a + Math.PI / 2 })
/** How the yard leaves the mast: its speed and its turning at the tear, and when it meets the water (about). */
const tear = lazy(() => {
  const a = yardOnMast(TEAR - 0.01)
  const b = yardOnMast(TEAR)
  const v: Pt = [(b.c[0] - a.c[0]) / 0.01, (b.c[1] - a.c[1]) / 0.01]
  let s = 0
  while (s < 2 && b.c[1] + v[1] * s + 0.5 * G * s * s <= 0.15) s += 0.005
  return { c: b.c, a: b.a, v, spin: (b.a - a.a) / 0.01, splash: TEAR + s }
})

function yardAt(t: number): { c: Pt; a: number; alpha: number } {
  if (t <= TEAR) return { ...yardOnMast(t), alpha: 1 }
  const T = tear()
  const s = Math.min(t, T.splash) - TEAR
  const c: Pt = [T.c[0] + T.v[0] * s, T.c[1] + T.v[1] * s + 0.5 * G * s * s]
  let a = T.a + T.spin * s
  if (t > T.splash) {
    // In the water: it slows, lies over, and goes down slowly into the dark.
    const w = t - T.splash
    c[0] += 0.6 * (1 - Math.exp(-w / 0.5))
    c[1] += 0.45 * w
    a += 0.6 * (1 - Math.exp(-w / 0.8))
  }
  return { c, a, alpha: 1 - smooth(t, T.splash + 0.8, T.splash + 4) }
}

const INK = '#15181C'
const WOOD = '#5C4A35'
const CANVAS = '#D8CBB0'

/** The mast as it falls (and its stays, cut, for the instant of the strike), and then the spar on the water. */
export function drawSpar(g: Paint): void {
  const { ctx, t, view } = g
  if (t < STRIKE || t > M.hush + 60) return
  const s = sparPose(t)
  if (s.foot[0] < view.x0 - 4 || s.foot[0] > view.x1 + 4) return
  const c = Math.cos(s.a)
  const n = Math.sin(s.a)
  const top: Pt = [s.foot[0] + c * POLE, s.foot[1] + n * POLE]
  // The stays, parted by the bolt: there for the strike's first frames, then gone.
  const stays = 1 - smooth(t, STRIKE, STRIKE + 0.12)
  if (stays > 0.01) {
    const bow = onHalf(t, bowHalf, [0.15 + 1.7, DECK + 0.02])
    const stern = onHalf(t, sternHalf, [0.15 - 1.65, DECK - 0.05])
    ctx.beginPath()
    ctx.moveTo(top[0], top[1])
    ctx.lineTo(bow[0], bow[1])
    ctx.moveTo(top[0], top[1])
    ctx.lineTo(stern[0], stern[1])
    stroke(g, rgba(INK, 0.6 * stays), 1.25)
  }
  // The pole: a line as the ship drew its mast, thickening into a floating timber as it comes down.
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(s.foot[0], s.foot[1])
  ctx.lineTo(top[0], top[1])
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(1.25 * g.px, s.thick + (2 / 108) * smooth(t, STRIKE + 0.2, FLOAT))
  ctx.stroke()
  const inner = s.thick - 2.86 / 108
  if (inner > 0.004) {
    ctx.strokeStyle = WOOD
    ctx.lineWidth = inner
    ctx.stroke()
  }
  ctx.lineCap = 'butt'
  // The yard, and the sail furled along it.
  const y = yardAt(t)
  if (y.alpha > 0.01) {
    const yc = Math.cos(y.a)
    const yn = Math.sin(y.a)
    ctx.beginPath()
    ctx.moveTo(y.c[0] - yc * 1.05, y.c[1] - yn * 1.05)
    ctx.lineTo(y.c[0] + yc * 1.05, y.c[1] + yn * 1.05)
    stroke(g, rgba(INK, y.alpha), 2.42)
    // The sail sits just under the yard (towards the mast's foot while it stands).
    const along: Pt = [-yn * 0.06, yc * 0.06]
    ctx.beginPath()
    ctx.ellipse(y.c[0] + along[0], y.c[1] + along[1], 1.0, 0.07, y.a, 0, Math.PI * 2)
    ctx.fillStyle = rgba(mix(CANVAS, '#5E615C', smooth(t, tear().splash, tear().splash + 1.5)), y.alpha)
    ctx.fill()
    stroke(g, rgba(INK, y.alpha), 1.76)
  }
}
