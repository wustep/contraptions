import { outline, solid } from '../../../../../src/core/draw'
import { FAST, FLOOR, R, ROLL, arcPts, chain, definePiece, fly, over, rail, ramp, roll, segTime, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, marquee, score } from './neon'

/**
 * A skee-ball lane. A kicker in the rail slaps the ball as it passes; it
 * runs up the alley, up the curved lip at the end, and flies — over the
 * gap, up a floor, and into the fifty ring on the target board, where it
 * lands on the shelf behind and rolls on. The rings light up, fifty pops,
 * and the lane's lights run for a while.
 */
const KICK = -0.3
const LIP0: Pt = [0.0, 0]
const LIP_R = 0.28
const LAND: Pt = [1.18, -1]
const T_KICK = (0.5 + KICK) / ROLL
const FLIGHT = 0.4

export const skee = definePiece<{ color: string }>({
  name: 'skee',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    // The lip: a quarter circle up from the alley's end, the ball's line a radius inside it.
    const lip = chain(arcPts(LIP0[0], LIP0[1] - LIP_R, LIP_R, Math.PI / 2, Math.PI / 4, 6), (Math.PI / 4) * LIP_R / (FAST * 1.1))
    const top = lip[lip.length - 1].to
    const run = ramp([KICK, 0], LIP0, ROLL, FAST * 1.1)
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [KICK, 0], ROLL),
        run,
        ...lip,
        fly(top, LAND, FLIGHT, 0.3),
        fly(LAND, [LAND[0] + 0.1, -1], 0.06, 0.02),
        ramp([LAND[0] + 0.1, -1], [1.5, -1], 2.2, ROLL),
      ],
      fire: T_KICK + run.dur + segTime(lip),
    }
    return { cells, exit: { at: [2, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const kicked = t > T_KICK && t < T_KICK + 0.15 ? 1 : 0
    const lit = since < 0 ? 0 : 1 - over(since, 1.4, 2.4)

    // The alley: a box under the rail from the kicker to the lip, and the lip curving up.
    rail(p, k, ink, weight, -0.5, LIP0[0])
    solid(p, ink, weight, s.color)
    p.rect(((-0.5 + LIP0[0]) / 2) * k, 0.34 * k, (0.5 + LIP0[0]) * k, 0.3 * k)
    outline(p, ink, weight)
    p.noFill()
    const surf = LIP_R + R
    p.arc(LIP0[0] * k, -LIP_R * k, surf * 2 * k, surf * 2 * k, Math.PI / 4, Math.PI / 2)
    const tipX = LIP0[0] + Math.cos(Math.PI / 4) * surf
    p.line(tipX * k, (-LIP_R + Math.sin(Math.PI / 4) * surf) * k, tipX * k, 0.5 * k)
    p.line((tipX - 0.06) * k, 0.5 * k, (tipX + 0.06) * k, 0.5 * k)
    // The kicker: a solenoid bat in the rail's side, out for an instant.
    p.push()
    p.translate(KICK * k, (FLOOR + 0.08) * k)
    p.rotate(-0.6 * kicked)
    solid(p, ink, weight, s.color)
    p.rect(0.04 * k, 0, 0.14 * k, 0.05 * k)
    p.pop()
    // The target board: on the back wall of the upper cell, three rings standing up, the shelf across the bottom.
    const cx = LAND[0] + 0.02
    const cy = -1 - 0.14
    glow(p, k, s.color, cx, cy, 0.4, lit)
    for (const [r, i] of [
      [0.34, 0],
      [0.24, 1],
      [0.14, 2],
    ] as [number, number][]) {
      solid(p, ink, weight, lit > 0.5 && i % 2 === 0 ? s.color : bg)
      p.ellipse(cx * k, cy * k, r * 1.6 * k, r * 2 * k)
    }
    solid(p, ink, weight, ink)
    p.ellipse(cx * k, cy * k, 0.1 * k, 0.16 * k)
    // The shelf, on a post, and the rail on from it.
    rail(p, k, ink, weight, 0.72, 1.5, -1 + FLOOR)
    outline(p, ink, weight)
    p.line(0.78 * k, (-1 + FLOOR) * k, 0.78 * k, 0.5 * k)
    p.line(0.72 * k, 0.5 * k, 0.84 * k, 0.5 * k)
    p.line(1.44 * k, (-1 + FLOOR) * k, 1.44 * k, -0.6 * k)
    // The lane's lights along the alley's side, running after the score.
    marquee(p, k, ink, weight, s.color, bg, -0.42, LIP0[0] - 0.06, 0.3, 5, since, lit > 0.2)
    lamp(p, k, ink, weight, s.color, bg, cx, cy - 0.44, 0.035, lit)
    flash(p, k, s.color, weight, LAND[0], -1, since, 0.3, 0.1, 0.36)
    score(p, k, s.color, cx, cy - 0.6, '+50', since, 1)
  },
})
