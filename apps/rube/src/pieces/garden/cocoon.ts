import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { R, ROLL, definePiece, laneAt, mixHex, over, rail, ramp, roll, segTime, wait, type BallChange, type Lane, type Pt, type Seg } from '../../parts'
import { leaf, tuft } from './green'

/**
 * A cocoon spun between two forked twigs astride the path: a tunnel of
 * silk the rail runs through. The ball rolls in at one mouth and stops
 * inside, a lump in the silk; whatever was asleep in there wakes — the
 * cocoon rocks on its threads and flushes with colour from the middle out,
 * the seam along its top splits, and three small butterflies come out of
 * it one after another and go to find somewhere to sit. The ball rolls
 * out of the far mouth the butterflies' colour, for good. The silk stays
 * stained and the seam stays split, and the butterflies stay where they
 * settled, fanning their wings.
 *
 * The cocoon stands in front of the ball, so the ball goes *into* the
 * mouth and comes *out* of the other; the change happens out of sight.
 */
const MOUTH = 0.25
const HALF_H = 0.175
/** The ball's back is inside the mouth, and it is gone; it stops in the middle. */
const GONE = -MOUTH + R
const STIR = 0.45
const BURST = 0.3
const IN: Seg[] = [roll([-0.5, 0], [GONE, 0], ROLL), { ...ramp([GONE, 0], [0, 0], ROLL, 0), hidden: true }]
const T_STOP = segTime(IN)
const FIRE = T_STOP + STIR
const LANE: Lane = {
  segs: [
    ...IN,
    wait([0, 0], STIR + BURST, { hidden: true }),
    { ...ramp([0, 0], [-GONE, 0], 0, 1.5), hidden: true },
    ramp([-GONE, 0], [0.5, 0], 1.5, ROLL),
  ],
  fire: FIRE,
}

/** The forked twigs' feet and forks, and where the silk is made fast on the cocoon. */
const TWIGS: { foot: Pt; fork: Pt; side: 1 | -1 }[] = [
  { foot: [-0.39, 0.5], fork: [-0.36, -0.22], side: -1 },
  { foot: [0.4, 0.5], fork: [0.37, -0.26], side: 1 },
]
/** Where each butterfly settles, how long after the split it sets off, and how long the trip takes. */
const FLIGHTS: { to: Pt; at: number; dur: number; swing: number }[] = [
  { to: [-0.43, -0.39], at: 0.0, dur: 1.1, swing: 0.1 },
  { to: [0.31, -0.4], at: 0.14, dur: 1.2, swing: -0.12 },
  { to: [0.12, -0.215], at: 0.3, dur: 1.5, swing: 0.16 },
]
const SEAM: Pt = [0, -HALF_H]

/** How hard the cocoon is rocking: up as the thing inside wakes, dying away after the split. */
const stirAt = (t: number, since: number) => (t < T_STOP ? 0 : since < 0 ? easeInOutSine(over(t, T_STOP, FIRE)) : Math.exp(-since * 5))

export const cocoon = definePiece<{ color: string; paint: string }>({
  name: 'cocoon',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The butterflies are never the colour the ball arrives in; with nothing else to offer, the cocoon stays out of the map.
    const pool = theme.colors.filter((c) => c !== ball.color)
    if (!pool.length) return null
    const paint = rng.pick(pool)
    const changes: BallChange[] = [{ at: FIRE, color: paint }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color, paint }, changes }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const rock = 0.05 * Math.sin(t * 27) * stirAt(t, since)

    // The path, the ground, and the two forked twigs standing behind the path with a leaf each.
    rail(p, k, ink, weight, -0.5, 0.5)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    tuft(p, k, ink, weight, -0.12, 0.5, 0.08, 0.02)
    for (const { foot, fork, side } of TWIGS) {
      outline(p, ink, weight * 1.3)
      p.line(foot[0] * k, foot[1] * k, fork[0] * k, fork[1] * k)
      outline(p, ink, weight * 1.1)
      p.line(fork[0] * k, fork[1] * k, (fork[0] + side * 0.07) * k, (fork[1] - 0.13) * k)
      p.line(fork[0] * k, fork[1] * k, (fork[0] - side * 0.06) * k, (fork[1] - 0.1) * k)
      leaf(p, k, ink, weight * 0.8, s.color, fork[0] + side * 0.02, fork[1] + 0.62, 0.18, side > 0 ? -1.15 : Math.PI + 1.15, 0.5)
    }
    // The silk: a fan of threads from each fork to the cocoon's near end.
    outline(p, ink, weight * 0.6)
    for (const { fork, side } of TWIGS) {
      for (const [ax, ay] of [
        [side * 0.22, -HALF_H * 0.55],
        [side * 0.15, -HALF_H * 0.9],
        [side * 0.05, -HALF_H],
      ]) {
        const [x, y] = turned(ax, ay, rock)
        p.line(fork[0] * k, fork[1] * k, x * k, y * k)
      }
    }
  },
  over: (p, s, { k, t, since, ink, bg, weight }) => {
    const stir = stirAt(t, since)
    const rock = 0.05 * Math.sin(t * 27) * stir
    // The flush: the new colour soaks out through the silk from the middle, and stays.
    const flush = t < T_STOP ? 0 : 0.6 * easeInOutSine(over(t, T_STOP + 0.1, FIRE + 0.15))
    const silk = mixHex(bg, s.paint, flush)
    // The lump: where the ball is, from the moment it is in the mouth until it is out of the other.
    const bx = laneAt(LANE, Math.max(0, t)).x
    const lump = t < 0 ? 0 : Math.min(over(bx, -MOUTH - R, GONE), 1 - over(bx, -GONE, MOUTH + R))
    const pulse = 1 + 0.35 * stir * Math.sin(t * 27 + 1)
    // A spindle, fat in the middle, its ends cut off where the ball goes in and comes out.
    const skin = (x: number) => HALF_H * (1 - 0.2 * Math.pow(x / MOUTH, 2)) + 0.03 * lump * pulse * Math.exp(-Math.pow((x - bx) / 0.13, 2))
    const open = since < 0 ? 0 : easeOutCubic(over(since, 0, 0.12))

    p.push()
    p.rotate(rock)
    // The body: a barrel of silk, open at both ends.
    solid(p, ink, weight, silk)
    p.beginShape()
    const n = 28
    for (let i = 0; i <= n; i++) {
      const x = -MOUTH + (2 * MOUTH * i) / n
      p.vertex(x * k, -skin(x) * k)
    }
    for (let i = n; i >= 0; i--) {
      const x = -MOUTH + (2 * MOUTH * i) / n
      p.vertex(x * k, skin(x) * k)
    }
    p.endShape(p.CLOSE)
    // The windings: bands round it, bowed the way a thread lies round a barrel.
    outline(p, ink, weight * 0.6)
    p.noFill()
    for (const x0 of [-0.17, -0.1, -0.03, 0.04, 0.11, 0.18]) {
      const h = skin(x0) - 0.012
      p.beginShape()
      p.vertex((x0 - 0.02) * k, -h * k)
      p.quadraticVertex((x0 + 0.05) * k, 0, (x0 - 0.02) * k, h * k)
      p.endShape()
    }
    // The mouths: dark, the rail running into them.
    p.noStroke()
    p.fill(ink)
    for (const side of [-1, 1]) p.ellipse(side * (MOUTH - 0.014) * k, 0, 0.05 * k, skin(side * MOUTH) * 1.75 * k)
    // The seam along the top: closed, then split.
    if (open > 0) {
      p.fill(ink)
      p.beginShape()
      p.vertex(-0.11 * k, (-HALF_H + 0.005) * k)
      p.vertex(-0.03 * k, (-HALF_H - 0.012 - 0.022 * open) * k)
      p.vertex(0.02 * k, (-HALF_H - 0.004) * k)
      p.vertex(0.07 * k, (-HALF_H - 0.012 - 0.02 * open) * k)
      p.vertex(0.11 * k, (-HALF_H + 0.005) * k)
      p.vertex(0.04 * k, (-HALF_H + 0.012 + 0.03 * open) * k)
      p.vertex(-0.04 * k, (-HALF_H + 0.012 + 0.03 * open) * k)
      p.endShape(p.CLOSE)
    } else {
      outline(p, ink, weight * 0.7)
      p.line(-0.1 * k, (-HALF_H + 0.012) * k, 0.1 * k, (-HALF_H + 0.012) * k)
    }
    p.pop()

    // The butterflies: out of the seam one after another, a wandering flight to a twig's tip, and there they stay, fanning.
    FLIGHTS.forEach(({ to, at, dur, swing }, i) => {
      const f = over(since, at, at + dur)
      if (f <= 0) return
      const e = easeInOutSine(f)
      const x = lerp(SEAM[0], to[0], e) + swing * Math.sin(f * Math.PI * 2) * (1 - f)
      const y = lerp(SEAM[1], to[1], e) - 0.06 * Math.sin(f * Math.PI) + 0.015 * Math.sin(t * 19 + i) * (1 - f)
      const beat = f < 1 ? Math.abs(Math.cos(t * 23 + i * 2)) : 0.72 + 0.28 * Math.sin(t * 2.2 + i * 1.9)
      butterfly(p, k, ink, weight, s.paint, x, y, beat, f < 1 ? 0.5 * Math.sin(f * 9 + i) : i === 0 ? -0.35 : i === 1 ? 0.3 : 0)
    })
  },
})

/** A point on the cocoon, rocked about its middle. */
const turned = (x: number, y: number, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

/** A butterfly seen from behind: a body, two pairs of wings that close to a line; `beat` from 0 (shut) to 1 (spread). */
function butterfly(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, beat: number, tilt: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(tilt)
  solid(p, ink, weight * 0.7, color)
  const w = 0.012 + 0.05 * beat
  for (const side of [-1, 1]) {
    p.beginShape()
    p.vertex(0, -0.005 * k)
    p.vertex(side * w * 1.1 * k, -0.06 * k)
    p.vertex(side * w * 1.25 * k, -0.01 * k)
    p.vertex(side * w * 0.8 * k, 0.04 * k)
    p.vertex(0, 0.015 * k)
    p.endShape(p.CLOSE)
  }
  outline(p, ink, weight * 0.9)
  p.line(0, -0.03 * k, 0, 0.03 * k)
  p.pop()
}
