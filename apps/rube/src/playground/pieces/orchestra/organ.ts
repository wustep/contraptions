import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, ball, definePiece, fly, over, ramp, wait, type BallChange, type Lane, type Pt } from '../../../parts'
import { baluster, brass, feltColor, ivory, stage } from './hall'

/**
 * An organ: a pedal at the stage's edge, a wind chest beyond it, and three
 * pipes standing on the chest, each taller than the last and each stopped
 * by a ball sitting in its mouth. The ball rolls onto the pedal, presses it
 * and stays there, holding the note. Wind comes up: the first pipe's ball
 * lifts off its mouth and bobs on the air, then the second's, higher, and
 * then the third's, whose pipe is cut on the slant, is blown clear: up and
 * over in an arc onto the stage beyond the chest, where it rolls on with
 * the thread. The wind runs out and the other two sink back onto their
 * pipes. The ball that came is still on the pedal.
 */
/** The pedal: its toe, its hinge on the chest, where the ball stops on it, and how far it sinks there. */
const TOE = -0.44
const HINGE = -0.04
const STOP = -0.27
const SINK = 0.03
const ARRIVE = arriveAt(STOP)
/** The chest, and the three pipes on it: middle, half-width and top. */
const CHEST: [number, number, number] = [0.02, 1.36, 0.24]
const HALF = 0.105
const PIPES: { x: number; top: number; at: number; lift: number }[] = [
  { x: 0.24, top: -0.1, at: 0.12, lift: 0.14 },
  { x: 0.66, top: -0.38, at: 0.42, lift: 0.22 },
  { x: 1.08, top: -0.66, at: 0.72, lift: 0.2 },
]
/** How far a ball's middle stands over the mouth it stops. */
const SEAT = Math.sqrt(R * R - HALF * HALF)
/** The third ball's rise on the wind, and the moment it is blown clear; when the wind runs out, and how long the others take to sink. */
const RISE = 0.15
const T_BLOW = PIPES[2].at + RISE
const T_SPENT = T_BLOW + 0.45
const SINKING = 0.7

/** How far over its seat ball `i` is, `since` the pedal went down. The third is the piece's only until it is blown. */
function liftAt(i: number, since: number): number {
  const pipe = PIPES[i]
  const tau = since - pipe.at
  if (tau <= 0) return 0
  if (i === 2) return pipe.lift * easeInQuad(clamp(tau / RISE))
  const up = pipe.lift * (1 - Math.exp(-tau * 9) * Math.cos(tau * 16))
  const bob = 0.012 * Math.sin(tau * 11) * (1 - over(since, T_SPENT, T_SPENT + SINKING))
  return (up + bob) * (1 - easeInOutSine(over(since, T_SPENT, T_SPENT + SINKING)))
}

/** Blown clear: from the top of its rise, over, and down onto the stage beyond the chest. */
const G = 16
const FLIGHT = 0.55
const FROM: Pt = [PIPES[2].x, PIPES[2].top - SEAT - PIPES[2].lift]
const LAND: Pt = [2.06, 0]
const VX = (LAND[0] - FROM[0]) / FLIGHT

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [STOP, SINK]),
    wait([STOP, SINK], T_BLOW),
    fly(FROM, LAND, FLIGHT, (G * FLIGHT * FLIGHT) / 8),
    ramp(LAND, [2.5, 0], VX, ROLL),
  ],
  fire: ARRIVE,
}

export const organ = definePiece<{ color: string; metal: string; key: string; next: string }>({
  name: 'organ',
  weight: 0.8,
  dynamic: true,
  flight: true,
  place: ({ rng, color, fits, theme, ball: arriving }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, 0])) return null
    // The balls on the pipes are never the colour the ball arrives in; with nothing else to offer, the organ stays out of the map.
    const pool = theme.colors.filter((c) => c !== arriving.color)
    if (!pool.length) return null
    const next = rng.pick(pool)
    const metal = [brass(theme), ...theme.colors].find((c) => c !== arriving.color && c !== next) ?? brass(theme)
    const wood = [feltColor(theme, color, arriving.color), ...theme.colors].find((c) => c !== metal && c !== arriving.color && c !== ivory(theme)) ?? color
    const changes: BallChange[] = [{ at: ARRIVE + T_BLOW, relay: true, color: next }]
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: wood, metal, key: ivory(theme), next }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, color, spin }) => {
    const down = t < ARRIVE ? over(t, ARRIVE - 0.12, ARRIVE) : 1
    // The stage to the pedal's toe, and on from beyond the chest.
    stage(p, k, ink, weight, -0.5, TOE)
    stage(p, k, ink, weight, CHEST[1] + 0.12, 2.5)
    baluster(p, k, ink, weight, s.color, 1.95)

    // The pipes, tallest last, each with a mouth cut in its foot; the third's top is cut on the slant.
    PIPES.forEach((pipe, i) => {
      solid(p, ink, weight, s.metal)
      p.beginShape()
      p.vertex((pipe.x - HALF) * k, CHEST[2] * k)
      p.vertex((pipe.x - HALF) * k, (pipe.top - (i === 2 ? 0.05 : 0)) * k)
      p.vertex((pipe.x + HALF) * k, (pipe.top + (i === 2 ? 0.03 : 0)) * k)
      p.vertex((pipe.x + HALF) * k, CHEST[2] * k)
      p.endShape(p.CLOSE)
      solid(p, ink, weight * 0.8, bg)
      p.beginShape()
      p.vertex((pipe.x - 0.06) * k, 0.15 * k)
      p.vertex(pipe.x * k, 0.06 * k)
      p.vertex((pipe.x + 0.06) * k, 0.15 * k)
      p.endShape(p.CLOSE)
    })
    // The chest they stand on.
    solid(p, ink, weight, s.color)
    p.rect(((CHEST[0] + CHEST[1]) / 2) * k, ((CHEST[2] + 0.5) / 2) * k, (CHEST[1] - CHEST[0]) * k, (0.5 - CHEST[2]) * k, 0.015 * k)

    // The pedal, hinged on the chest's near face: level with the stage until the ball is on it, and down from then on.
    const tilt = Math.atan2(SINK * down, HINGE - STOP)
    p.push()
    p.translate(HINGE * k, (FLOOR + 0.025) * k)
    p.rotate(-tilt)
    solid(p, ink, weight, s.key)
    p.rect(((TOE - HINGE) / 2) * k, 0, (HINGE - TOE) * k, 0.05 * k, 0.015 * k)
    p.pop()
    outline(p, ink, weight)
    p.line(HINGE * k, (FLOOR + 0.05) * k, CHEST[0] * k, CHEST[2] * k)

    // The wind under each ball that is off its seat: three thin strokes from the mouth up to it.
    PIPES.forEach((pipe, i) => {
      const lift = liftAt(i, since)
      const blown = i === 2 && since >= T_BLOW
      const jet = blown ? 1 - over(since, T_BLOW, T_BLOW + 0.3) : clamp(lift / 0.05)
      if (jet <= 0) return
      const air = p.color(ink)
      air.setAlpha(120 * jet)
      p.stroke(air)
      p.strokeWeight(weight * 0.7)
      const reach = blown ? pipe.lift + 0.12 : lift
      for (const dx of [-0.05, 0, 0.05]) p.line((pipe.x + dx) * k, (pipe.top - 0.01) * k, (pipe.x + dx * 1.3) * k, (pipe.top - Math.max(0.02, reach + SEAT - R * 0.8)) * k)
    })
    // The balls stopping the pipes, the piece's to draw: two for good, the third until it is blown clear.
    PIPES.forEach((pipe, i) => {
      if (i === 2 && since >= T_BLOW) return
      ball(p, k, ink, weight, s.next, pipe.x * k, (pipe.top - SEAT - liftAt(i, since)) * k, spin(pipe.x))
    })
    // The ball that came, on the pedal, once the thread has gone.
    if (since >= T_BLOW) ball(p, k, ink, weight, color, STOP * k, SINK * k, spin(STOP))
  },
})
