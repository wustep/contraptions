import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { glow, lamp } from './neon'

/**
 * A little Ferris wheel. Six gondolas hang upright from the rim, each a
 * seat on a rod under a little roof, and the lamps round the rim chase
 * the whole time. The lane is the boarding platform: the ball rolls onto
 * the seat of the gondola at the bottom and the hub lights; the wheel
 * turns half way round, slowly — back and up the near side, over the top
 * — easing in and easing out, every gondola swinging out a little on its
 * pivot as it goes; at the top the seat is level with the upper rail, the
 * gondola rocks forward as the wheel stops, and the ball rolls off it and
 * on. Half a turn of six gondolas leaves the wheel exactly as it was.
 *
 * The wheel's angle, a gondola's swing and the ball's place on its seat
 * are one function of time, which the lane traces and the drawing uses.
 */
const RIM = 0.5
/** A seat hangs this far under its pivot, which puts the hub here: the low seat on the lane's line, the high one on the upper rail's. */
const HANG = 0.34
const HUB: Pt = [0.5, FLOOR - HANG - RIM]
const GONDOLAS = 6
const SEAT = 0.34
const ARRIVE = arriveAt(HUB[0])
const BOARD = 0.15
const TURN = 1.7
const T_GO = ARRIVE + BOARD
const T_TOP = T_GO + TURN
/** The ball sets off along the seat this long after the wheel has stopped, while the gondola is still rocked forward. */
const SETTLE = 0.1
/** How far a gondola swings for the sideways pull on its pivot. */
const SWING = 0.02

/** How far round the wheel is, and how fast, and how that is changing. */
function wheelAt(t: number): { a: number; v: number; acc: number } {
  if (t <= T_GO) return { a: 0, v: 0, acc: 0 }
  if (t >= T_TOP) return { a: Math.PI, v: 0, acc: 0 }
  const u = (t - T_GO) / TURN
  const w = Math.PI / TURN
  return { a: Math.PI * easeInOutSine(u), v: (Math.PI * w * Math.sin(Math.PI * u)) / 2, acc: (Math.PI * w * w * Math.cos(Math.PI * u)) / 2 }
}

/** The pivot of the gondola that started `b` round from the bottom. The wheel turns back and up the near side. */
const pivotAt = (a: number): Pt => [HUB[0] - RIM * Math.sin(a), HUB[1] + RIM * Math.cos(a)]

/**
 * A gondola's swing, forward of hanging: it hangs back from the sideways
 * pull on its pivot, eased in at the start so nothing jerks, and rocks on a
 * little after the wheel has stopped.
 */
function swingAt(t: number, b: number): number {
  if (t <= T_GO) return 0
  const pull = (at: number) => {
    const w = wheelAt(at)
    return RIM * (Math.cos(w.a + b) * w.acc - Math.sin(w.a + b) * w.v * w.v)
  }
  if (t < T_TOP) return SWING * pull(t) * easeInOutSine(over(t, T_GO, T_GO + 0.3))
  const s = t - T_TOP
  return SWING * pull(T_TOP - 1e-6) * Math.exp(-s * 2.2) * Math.cos(s * 7)
}

/** The ball on the seat of the gondola it boarded. */
const ballAt = (t: number): Pt => {
  const [px, py] = pivotAt(wheelAt(t).a)
  const s = swingAt(t, 0)
  return [px + (HANG - R) * Math.sin(s), py + (HANG - R) * Math.cos(s)]
}

const OFF = ballAt(T_TOP + SETTLE)
const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [HUB[0], 0]),
    wait([HUB[0], 0], BOARD),
    ...trace(ballAt, T_GO, T_TOP + SETTLE, 54),
    ramp(OFF, [0.82, -1], 0.2, 1.9),
    ramp([0.82, -1], [1.5, -1], 1.9, ROLL),
  ],
  fire: T_GO,
}

/** A car's side walls stand this high over its floor, and are this thick: short enough that the ball rides over them in plain sight, thick enough to be part of the silhouette. */
const WALL = 0.075
const SIDE = 0.035

/**
 * One gondola hanging from (px, py), swung by `s`: a roof over the pivot, a
 * rod, a car. The car is a floor with a short wall at each end, cut as one
 * shape, so it is still three shapes six times: anything more and the wheel
 * is a thicket at the show's scale.
 */
function gondola(p: p5, k: number, ink: string, weight: number, color: string, px: number, py: number, s: number): void {
  p.push()
  p.translate(px * k, py * k)
  p.rotate(-s)
  outline(p, ink, weight)
  p.line(0, 0, 0, HANG * k)
  solid(p, ink, weight, color)
  p.arc(0, 0.045 * k, 0.26 * k, 0.15 * k, Math.PI, Math.PI * 2, p.CHORD)
  const out = SEAT / 2
  const inn = out - SIDE
  const top = HANG - WALL
  p.beginShape()
  for (const [x, y] of [[-out, top], [-inn, top], [-inn, HANG], [inn, HANG], [inn, top], [out, top], [out, HANG + 0.05], [-out, HANG + 0.05]]) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  p.pop()
}

export const ferris = definePiece<{ color: string }>({
  name: 'ferris',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const { a } = wheelAt(t)
    const running = t > ARRIVE ? 1 - over(t, T_TOP + 0.6, T_TOP + 1.4) : 0

    // The platforms, behind the wheel: the lane in to the low seat, the upper rail on from the high one.
    rail(p, k, ink, weight, -0.5, HUB[0] - SEAT / 2 - 0.03)
    rail(p, k, ink, weight, HUB[0] + SEAT / 2 + 0.03, 1.5, -1 + FLOOR)
    post(p, k, ink, weight, 1.42, -1 + FLOOR, 0.5)
    // The legs, from the hub to the ground.
    outline(p, ink, weight * 1.2)
    for (const foot of [0.16, 0.84]) {
      p.line(HUB[0] * k, HUB[1] * k, foot * k, 0.5 * k)
      p.line((foot - 0.07) * k, 0.5 * k, (foot + 0.07) * k, 0.5 * k)
    }

    // The wheel: a rim, a spoke to every pivot, lamps round the rim between them that chase.
    outline(p, ink, weight)
    p.circle(HUB[0] * k, HUB[1] * k, RIM * 2 * k)
    outline(p, ink, weight * 0.7)
    for (let i = 0; i < GONDOLAS; i++) {
      const [px, py] = pivotAt(a + (i * Math.PI * 2) / GONDOLAS)
      p.line(HUB[0] * k, HUB[1] * k, px * k, py * k)
    }
    for (let i = 0; i < GONDOLAS * 2; i++) {
      const [lx, ly] = pivotAt(a + ((i + 0.5) * Math.PI) / GONDOLAS)
      lamp(p, k, ink, weight, s.color, bg, lx, ly, 0.03, Math.floor(t * 5 + i) % 3 === 0 ? 1 : 0)
    }
    // The hub, lit while there is a rider.
    glow(p, k, s.color, HUB[0], HUB[1], 0.13, running)
    solid(p, ink, weight, running > 0.5 ? s.color : bg)
    p.circle(HUB[0] * k, HUB[1] * k, 0.15 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(HUB[0] * k, HUB[1] * k, 0.04 * k)

    // The gondolas, each hanging upright from its pivot and swinging with the wheel's pull.
    for (let i = 0; i < GONDOLAS; i++) {
      const b = (i * Math.PI * 2) / GONDOLAS
      const [px, py] = pivotAt(a + b)
      gondola(p, k, ink, weight, s.color, px, py, swingAt(t, b))
    }
  },
})
