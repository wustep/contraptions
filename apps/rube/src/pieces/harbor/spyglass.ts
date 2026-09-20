import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, laneAt, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { bodyColor, piling, water } from './sea'

/**
 * A spyglass. The deck ends at the big end of a brass spyglass on a
 * stand, shut up short, its nose a little high and pointing across open
 * water at the far pier. The ball rolls in at the big end and is gone
 * for a moment, down the inside, and fetches up in the small tube's end,
 * a snug fit, its front half out of the eyepiece like a cork. Its way
 * goes into the glass: the small tube is carried out with it to its stop,
 * clack, and takes the middle tube out after it, slower, clack, the nose
 * sinking as the ball goes out along it until the tip drops into a crutch
 * on the far pier. With nowhere left to slide the ball comes unstuck and
 * rolls out of the eyepiece onto the deck. The glass stays out.
 *
 * The ball is in the small tube's end the whole way across, in plain
 * sight, so where the tip is, it is: its lane is sampled from the same
 * draw and the same tilt the tubes are drawn with.
 */
/** The yoke's pin, which the glass tips about; everything along the glass is measured from it, toward the eyepiece. */
const PIVOT: Pt = [0.06, 0]
const TILT = 0.075
/** The big end; the big tube's length; how far each smaller tube stands out of the last when shut, and how far it draws. */
const MOUTH = -0.26
const BIG = 0.5
const STUB = 0.06
const DRAW = 0.36
/** Each tube's radius, big to small, and the length of the two that slide. */
const RAD = [0.21, 0.18, 0.15]
const TUBE = 0.5
/** The ball sticks in the small tube's end with its centre this far past the tip: half of it out of the eyepiece. */
const NOSE = 0.01
/** The far pier, and the crutch the tip lands in. */
const EAST = 1.15
const CRUTCH = 1.0

/** A shove that starts at `v0` and has slowed to `v1` when the tube reaches its stop: how long it takes, and how far it has gone after `s`. */
const shoveTime = (v0: number, v1: number) => DRAW / ((v0 + v1) / 2)
const shoved = (v0: number, v1: number, s: number) => v0 * s + ((v1 - v0) * s * s) / (2 * shoveTime(v0, v1))
/** The small tube, fast; the middle one with it, slower. */
const A = [1.1, 0.7] as const
const B = [0.55, 0.25] as const

const IN = MOUTH + R + 0.03
const T_IN = (PIVOT[0] + IN * Math.cos(TILT) + 0.5) / ROLL
const SHUT_TIP = MOUTH + BIG + 2 * STUB
/** Along the glass, where the ball's front reaches the eyepiece and it is seen again. */
const SHOW = SHUT_TIP - R
const FIRE = T_IN + (SHUT_TIP + NOSE - IN) / ROLL
const T_A = FIRE + shoveTime(...A)
const T_B = T_A + shoveTime(...B)
/** The ball comes unstuck. */
const HOLD = 0.24059
const T_OUT = T_B + HOLD
const V_OUT = 0.9

/** How far the middle tube and the small tube have drawn. */
function drawnAt(t: number): [number, number] {
  if (t < FIRE) return [0, 0]
  if (t < T_A) return [0, shoved(...A, t - FIRE)]
  if (t < T_B) return [shoved(...B, t - T_A), DRAW]
  return [DRAW, DRAW]
}
/** Nose up while it is shut; down as the ball goes out along it; into the crutch as the last tube stops, with a bounce. */
function tiltAt(t: number): number {
  if (t >= T_B) return 0.014 * Math.exp(-(t - T_B) * 14) * Math.abs(Math.sin((t - T_B) * 24))
  const [mid, small] = drawnAt(t)
  const e = (mid + small) / (2 * DRAW)
  return TILT * (1 - e * e)
}
/** A point `u` along the glass from the pin, in the cell's frame. */
const onGlass = (u: number, t: number): Pt => [PIVOT[0] + u * Math.cos(tiltAt(t)), PIVOT[1] - u * Math.sin(tiltAt(t))]
const tipAt = (t: number) => SHUT_TIP + drawnAt(t)[0] + drawnAt(t)[1]
const ballAt = (t: number): Pt => onGlass(tipAt(t) + NOSE, t)
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], onGlass(IN, 0), ROLL),
    // Out of sight only down the inside of the glass, until its front is at the eyepiece.
    { ...roll(onGlass(IN, 0), onGlass(SHOW, 0), ROLL), hidden: true },
    roll(onGlass(SHOW, 0), ballAt(FIRE), ROLL),
    ...trace(ballAt, FIRE, T_A, 8),
    ...trace(ballAt, T_A, T_B, 14),
    ...trace(ballAt, T_B, T_OUT, 4),
    ramp(ballAt(T_OUT), [1.5, 0], V_OUT, ROLL),
  ],
  fire: FIRE,
}

/** The eyepiece's open end, `u` along the glass, in the glass's frame. */
function eyepiece(p: p5, k: number, ink: string, u: number): void {
  p.fill(ink)
  p.noStroke()
  p.ellipse(u * k, 0, 0.045 * k, (RAD[2] + 0.02) * 2 * k)
}

/** A clack where one tube fetches up on the next: three short lines off the top of the collar. */
function clack(p: p5, k: number, ink: string, weight: number, x: number, y: number, f: number): void {
  if (f <= 0 || f >= 1) return
  p.push()
  p.stroke(ink)
  p.strokeWeight(weight * (1 - f))
  for (const a of [-2.2, -1.57, -0.94]) {
    const r0 = 0.04 + 0.05 * f
    const r1 = 0.08 + 0.09 * f
    p.line((x + Math.cos(a) * r0) * k, (y + Math.sin(a) * r0) * k, (x + Math.cos(a) * r1) * k, (y + Math.sin(a) * r1) * k)
  }
  p.pop()
}

export const spyglass = definePiece<{ color: string }>({
  name: 'spyglass',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, _s, { k, t, ink, weight }) => {
    // The two piers, the stand's post under the yoke, and the crutch on its own post off the far pier's end.
    water(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, PIVOT[0] + MOUTH)
    piling(p, k, ink, weight, -0.36)
    rail(p, k, ink, weight, EAST, 1.5)
    piling(p, k, ink, weight, 1.36)
    post(p, k, ink, weight, PIVOT[0], RAD[0], 0.5)
    post(p, k, ink, weight, CRUTCH, RAD[2] + 0.02, 0.5)
    outline(p, ink, weight)
    p.arc(CRUTCH * k, (RAD[2] - 0.04) * k, 0.2 * k, 0.12 * k, 0.15 * Math.PI, 0.85 * Math.PI)
    // The dark of the eyepiece, behind the ball that corks it.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(-tiltAt(t))
    eyepiece(p, k, ink, tipAt(t))
    p.pop()
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    const [mid, small] = drawnAt(t)
    const ends = [MOUTH + BIG, MOUTH + BIG + STUB + mid, MOUTH + BIG + 2 * STUB + mid + small]

    // The glass, in front of the ball, about its pin: the small tube first and the big one last, each over the foot of
    // the one that slides in it, each with a collar at its far end.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(-tiltAt(t))
    for (const i of [2, 1, 0]) {
      const x1 = ends[i]
      const x0 = i ? x1 - TUBE : MOUTH
      solid(p, ink, weight, s.color)
      p.rect(((x0 + x1) / 2) * k, 0, (x1 - x0) * k, RAD[i] * 2 * k)
      p.rect((x1 - 0.0325) * k, 0, 0.065 * k, (RAD[i] + 0.02) * 2 * k, 0.012 * k)
    }
    // The big end's bell, and the dark of its mouth; one line of light along the barrel.
    solid(p, ink, weight, s.color)
    p.rect((MOUTH + 0.05) * k, 0, 0.1 * k, (RAD[0] + 0.03) * 2 * k, 0.012 * k)
    p.fill(ink)
    p.ellipse(MOUTH * k, 0, 0.04 * k, (RAD[0] + 0.03) * 2 * k)
    p.push()
    p.stroke(bg)
    p.strokeWeight(weight * 1.2)
    p.line((MOUTH + 0.17) * k, -(RAD[0] - 0.06) * k, (MOUTH + BIG - 0.12) * k, -(RAD[0] - 0.06) * k)
    p.pop()
    // The eyepiece's open end, unless the ball is corking it.
    const at = laneAt(LANE, t)
    if (at.hidden || Math.abs(at.x - onGlass(ends[2], t)[0]) > R + 0.03) eyepiece(p, k, ink, ends[2])
    // The clacks: the small tube on the middle one's collar, and the middle one on the big one's.
    clack(p, k, ink, weight, ends[1], -RAD[1] - 0.02, over(t, T_A, T_A + 0.16))
    clack(p, k, ink, weight, ends[0], -RAD[0] - 0.02, over(t, T_B, T_B + 0.16))
    p.pop()

    // The yoke's arm: the stand's post carried on up the near side of the barrel to the pin.
    outline(p, ink, weight)
    p.line(PIVOT[0] * k, PIVOT[1] * k, PIVOT[0] * k, (RAD[0] + 0.04) * k)
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.07 * k)
  },
})
