import { outline, solid } from '../../../../../src/core/draw'
import { FAST, FLOOR, R, ROLL, arcPts, chain, definePiece, flick, fly, over, post, rail, ramp, roll, segTime, type Lane, type Pt } from '../../parts'
import { flash, glow, marquee, score } from './neon'

/**
 * A skee-ball lane. A kicker in the rail slaps the ball as it passes; it
 * runs up the alley, up the curved lip at the end, and lobs — over the
 * gap and up a floor, over the top of its arc, and down into the fifty
 * ring on the target board, where it lands on the shelf behind and rolls
 * on. The rings light as it lands, fifty pops, and the lane's lights run
 * for a while.
 */
const KICK = -0.3
const LIP0: Pt = [0.0, 0]
const LIP_R = 0.28
const LAND: Pt = [1.18, -1]
const T_KICK = (0.5 + KICK) / ROLL
/**
 * The lip's top: how far round the quarter circle it goes. Seventy degrees
 * puts the top of the flight before the shelf, so the ball comes down onto
 * it; anything under sixty-one has it still rising at the landing, coming
 * up through the shelf's near end.
 */
const LIP_END = (Math.PI * 7) / 18
const V_LIP = FAST * 1.1
/** The lip: an arc up from the alley's end, the ball's line a radius inside it, at the pace the kick gave. */
const LIP = chain(arcPts(LIP0[0], LIP0[1] - LIP_R, LIP_R, Math.PI / 2, Math.PI / 2 - LIP_END, 8), (LIP_END * LIP_R) / V_LIP)
const TOP = LIP[LIP.length - 1].to
const RUN = ramp([KICK, 0], LIP0, ROLL, V_LIP)
/** Off the lip's top the way it was going: the flight's first velocity is the lip's last, so there is no kink at the launch. */
const VX = V_LIP * Math.cos(LIP_END)
const VY = -V_LIP * Math.sin(LIP_END)
const FLIGHT = (LAND[0] - TOP[0]) / VX
const ARC = (LAND[1] - TOP[1] - VY * FLIGHT) / 4
/** The launch off the lip is the fire; the ring is hit a flight later. */
const T_LAUNCH = T_KICK + RUN.dur + segTime(LIP)
/** The target board's centre, on the back wall of the upper cell. */
const CX = LAND[0] + 0.02
const CY = -1 - 0.14
/** The shelf the ball lands on, starting where the flight has cleared it, and the two posts it stands on. */
const SHELF0 = 0.8
const POSTS = [0.86, 1.44]

export const skee = definePiece<{ color: string }>({
  name: 'skee',
  points: 50,
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
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [KICK, 0], ROLL),
        RUN,
        ...LIP,
        fly(TOP, LAND, FLIGHT, ARC),
        // The landing takes the fall out of it; it keeps its forward pace and rolls on.
        fly(LAND, [LAND[0] + 0.1, -1], 0.06, 0.015),
        ramp([LAND[0] + 0.1, -1], [1.5, -1], VX, ROLL),
      ],
      fire: T_LAUNCH,
    }
    return { cells, exit: { at: [2, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The kick is a flick: out in a few hundredths, back with a settle.
    const kicked = t < T_KICK ? 0 : flick(t - T_KICK, 0.03, 0.1, 0.35)
    // Everything on the board answers the landing, not the launch.
    const landed = since - FLIGHT
    const lit = landed < 0 ? 0 : 1 - over(landed, 1.4, 2.4)

    // The alley: a box under the rail from the kicker to the lip, and the lip curving up.
    rail(p, k, ink, weight, -0.5, LIP0[0])
    solid(p, ink, weight, s.color)
    p.rect(((-0.5 + LIP0[0]) / 2) * k, 0.34 * k, (0.5 + LIP0[0]) * k, 0.3 * k)
    outline(p, ink, weight)
    p.noFill()
    const surf = LIP_R + R
    p.arc(LIP0[0] * k, -LIP_R * k, surf * 2 * k, surf * 2 * k, Math.PI / 2 - LIP_END, Math.PI / 2)
    const tipX = LIP0[0] + Math.cos(Math.PI / 2 - LIP_END) * surf
    post(p, k, ink, weight, tipX, -LIP_R + Math.sin(Math.PI / 2 - LIP_END) * surf, 0.5)
    // The kicker: a solenoid bat hinged in the rail's side just behind the
    // ball, lying along the alley until it swings up into the ball's back.
    p.push()
    p.translate((KICK - 0.1) * k, (FLOOR + 0.06) * k)
    p.rotate(-0.8 * kicked)
    solid(p, ink, weight, s.color)
    p.rect(0.09 * k, 0, 0.16 * k, 0.05 * k, 0.01 * k)
    p.pop()
    solid(p, ink, weight, ink)
    p.circle((KICK - 0.1) * k, (FLOOR + 0.06) * k, 0.04 * k)
    // The target board: three rings standing up, lit from the landing.
    glow(p, k, s.color, CX, CY, 0.3, lit)
    for (const [r, i] of [
      [0.34, 0],
      [0.24, 1],
      [0.14, 2],
    ] as [number, number][]) {
      solid(p, ink, weight, lit > 0.5 && i % 2 === 0 ? s.color : bg)
      p.ellipse(CX * k, CY * k, r * 1.6 * k, r * 2 * k)
    }
    solid(p, ink, weight, ink)
    p.ellipse(CX * k, CY * k, 0.1 * k, 0.16 * k)
    // The shelf on its two posts, and the rail on from it.
    rail(p, k, ink, weight, SHELF0, 1.5, -1 + FLOOR)
    for (const x of POSTS) post(p, k, ink, weight, x, -1 + FLOOR, 0.5)
    // The lane's lights along the alley's side, on a dark band let into it, running after the score.
    marquee(p, k, ink, weight, s.color, bg, -0.42, LIP0[0] - 0.06, 0.32, 5, landed, lit > 0.2, 0.1)
    flash(p, k, s.color, weight, LAND[0], -1, landed)
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, CX, CY - 0.3, '+50', since - FLIGHT, 1),
})
