import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { R, ROLL, definePiece, fly, laneAt, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { piling, seaColor, splash, water } from './sea'

/**
 * A pufferfish asleep in a gap in the pier. It floats at the surface with
 * its back just under the deck, snoring a bubble now and then. The ball
 * rolls off the deck's end onto its back; it wakes with a start and blows
 * up in an instant to a ball of spines twice the size, and the ball is
 * popped up off its back and over onto the far deck. It stays blown up a
 * while, eye wide, fin going like mad; then it lets the air out in a long
 * sigh of bubbles, the spines lie down and the eye droops shut again.
 *
 * The ball rides the back up: its lane through the pop is traced from the
 * same swelling the fish is drawn with.
 */
const GAP0 = -0.36
const GAP1 = 0.2
const CX = -0.08
/** Asleep: a small oval low in the water. Blown up: a ball. */
const SLACK = { rx: 0.16, ry: 0.105, cy: 0.295 }
const FULL = { rx: 0.185, ry: 0.185, cy: 0.27 }
/** Where the ball comes down on the far deck. */
const LAND: Pt = [0.3, 0]
const T_EDGE = (0.5 + GAP0) / ROLL
/** Off the deck's end and down onto the back. */
const DROP = 0.09
const FIRE = T_EDGE + DROP
/** The swelling: this long to full, the ball on its back for the first part of it. */
const PUFF = 0.08
const RIDE = 0.02
const FLIGHT = 0.34
const LOFT = 0.24
/** Blown up this long, then this long letting it out. */
const HELD = 1.1
const SIGH = 1.7

/** How blown up it is, `since` the ball touched it: 0 asleep, 1 full, with a wobble as it fills. */
function puffAt(since: number): number {
  if (since < 0) return 0
  if (since < HELD) return easeOutCubic(over(since, 0, PUFF)) + 0.07 * Math.sin(since * 34) * Math.exp(-since * 7) * over(since, PUFF * 0.6, PUFF)
  return 1 - easeInOutSine(over(since, HELD, HELD + SIGH))
}

const shapeAt = (f: number) => ({ rx: lerp(SLACK.rx, FULL.rx, f), ry: lerp(SLACK.ry, FULL.ry, f), cy: lerp(SLACK.cy, FULL.cy, f) })
/** The ball's centre on the top of its back, drifting on a little as it goes up. */
const onBack = (since: number): Pt => {
  const s = shapeAt(puffAt(since))
  return [CX - 0.02 + 0.02 * over(since, 0, RIDE), s.cy - s.ry - R]
}

const POP = trace(onBack, 0, RIDE, 2)
const SEAT = POP[0].from
const OFF = POP[POP.length - 1].to
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [GAP0, 0], ROLL),
    fly([GAP0, 0], SEAT, DROP, 0.012),
    ...POP,
    fly(OFF, LAND, FLIGHT, LOFT),
    fly(LAND, [LAND[0] + 0.08, 0], 0.05, 0.012),
    ramp([LAND[0] + 0.08, 0], [0.5, 0], 1.7, ROLL),
  ],
  fire: FIRE,
}

export const puffer = definePiece<{ color: string }>({
  name: 'puffer',
  weight: 1,
  place: ({ color, fits, theme }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const f = puffAt(since)
    const { rx, ry, cy } = shapeAt(f)
    const asleep = since < 0
    // It bobs while it sleeps, sinks a hair under the ball, and rocks after the pop.
    const bob = asleep ? 0.008 * Math.sin(t * 2.1) + 0.02 * over(t, T_EDGE + DROP * 0.7, FIRE) : 0.02 * Math.cos(since * 9) * Math.exp(-since * 2.2)
    const y = cy + bob

    rail(p, k, ink, weight, -0.5, GAP0)
    rail(p, k, ink, weight, GAP1, 0.5)
    piling(p, k, ink, weight, GAP0 - 0.07)
    piling(p, k, ink, weight, GAP1 + 0.16)

    // The spines: flat to the skin asleep, out all round when it blows up. Behind the body, so only their points show.
    if (f > 0.04) {
      solid(p, ink, weight * 0.8, s.color)
      const n = 13
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * 0.94 + (i / (n - 1)) * Math.PI * 1.88
        const len = 0.06 * Math.min(1, f * 1.2) * (i % 2 ? 0.8 : 1)
        const bx = CX + Math.cos(a) * rx * 0.96
        const by = y + Math.sin(a) * ry * 0.96
        const da = 0.13
        p.triangle(
          (CX + Math.cos(a - da) * rx * 0.9) * k,
          (y + Math.sin(a - da) * ry * 0.9) * k,
          (CX + Math.cos(a + da) * rx * 0.9) * k,
          (y + Math.sin(a + da) * ry * 0.9) * k,
          (bx + Math.cos(a) * len) * k,
          (by + Math.sin(a) * len) * k,
        )
      }
    }
    // The tail: a small fan at the back, smaller still beside the ball it is stuck on.
    solid(p, ink, weight, s.color)
    const wag = asleep ? 0.12 * Math.sin(t * 2.1) : 0.5 * Math.sin(t * 26) * (since < HELD ? 1 : 1 - over(since, HELD, HELD + 0.5))
    p.push()
    p.translate((CX + rx - 0.01) * k, y * k)
    p.rotate(wag * 0.4)
    p.triangle(0, 0, 0.09 * k, -0.06 * k, 0.09 * k, 0.06 * k)
    p.pop()
    // The body, and its pale belly.
    solid(p, ink, weight, s.color)
    p.ellipse(CX * k, y * k, rx * 2 * k, ry * 2 * k)
    p.noStroke()
    p.fill(bg)
    p.arc(CX * k, y * k, (rx * 2 - 0.05) * k, (ry * 2 - 0.05) * k, 0.35, Math.PI - 0.35, p.CHORD)
    // The side fin, going like mad while it is blown up.
    solid(p, ink, weight * 0.9, s.color)
    p.push()
    p.translate((CX + 0.02) * k, (y + ry * 0.12) * k)
    p.rotate(0.45 + (asleep ? 0.1 * Math.sin(t * 2.1) : 0.6 * Math.sin(t * 40) * f))
    p.arc(0, 0, 0.19 * k, 0.19 * k, -0.5, 0.5, p.PIE)
    p.pop()
    // The face, toward the ball: an eye shut in a line, wide with a start, drooping again; a mouth that puckers.
    const ex = CX - rx * 0.52
    const ey = y - ry * 0.3
    const wide = asleep ? 0 : since < HELD ? 1 : 1 - over(since, HELD + SIGH * 0.4, HELD + SIGH)
    if (wide > 0.05) {
      solid(p, ink, weight * 0.8, bg)
      p.ellipse(ex * k, ey * k, 0.085 * k, 0.085 * (0.25 + 0.75 * wide) * k)
      // Awake, it watches where the ball went.
      const at = laneAt(LANE, t)
      const look = Math.atan2(at.y - ey, at.x - ex)
      p.noStroke()
      p.fill(ink)
      p.circle((ex + Math.cos(look) * 0.016) * k, (ey + Math.sin(look) * 0.016 * wide) * k, 0.03 * k)
    } else {
      outline(p, ink, weight * 0.9)
      p.arc(ex * k, (ey - 0.01) * k, 0.07 * k, 0.05 * k, 0.15, Math.PI - 0.15)
    }
    solid(p, ink, weight * 0.8, bg)
    const mouth = 0.035 + 0.02 * f
    p.ellipse((CX - rx + 0.005) * k, (y + ry * 0.12) * k, mouth * 0.8 * k, mouth * k)

    // The sea in front: what is under the line is under water.
    water(p, k, ink, weight, -0.5, 0.5)

    // A snore: one bubble off the mouth every so often, while it sleeps.
    if (asleep) {
      const g = (((t * 0.55) % 1) + 1) % 1
      if (g < 0.6) {
        solid(p, ink, weight * 0.6, bg)
        p.circle((CX - rx - 0.035 - 0.02 * g) * k, (y + ry * 0.1 - 0.3 * g) * k, (0.03 + 0.035 * g) * k)
      }
    }
    // The sigh: the air comes out of its mouth in a run of bubbles.
    if (since > HELD && since < HELD + SIGH) {
      const g = over(since, HELD, HELD + SIGH)
      solid(p, ink, weight * 0.6, bg)
      for (let i = 0; i < 4; i++) {
        const ph = (g * 3.2 + i / 4) % 1
        p.circle((CX - rx - 0.035 - 0.05 * ph + 0.015 * Math.sin(ph * 9 + i)) * k, (y + ry * 0.1 - 0.36 * ph) * k, (0.03 + 0.03 * ph) * (1 - g * 0.4) * k)
      }
    }
    // The pop: a start of lines off its back, and the water it shoves aside.
    if (since > 0 && since < 0.22) {
      const g = over(since, 0, 0.22)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight * (1 - g * 0.6))
      for (const a of [-2.75, -Math.PI / 2, -0.4]) {
        const r0 = FULL.rx + 0.11 + 0.1 * g
        const r1 = r0 + 0.08 * (1 - g * 0.5)
        p.line((CX + Math.cos(a) * r0) * k, (FULL.cy + Math.sin(a) * r0) * k, (CX + Math.cos(a) * r1) * k, (FULL.cy + Math.sin(a) * r1) * k)
      }
      p.pop()
    }
    splash(p, k, s.color, weight, CX - 0.2, 0.37, over(since, 0.02, 0.5), 0.55)
    splash(p, k, s.color, weight, CX + 0.22, 0.37, over(since, 0.02, 0.5), 0.55)
  },
})
