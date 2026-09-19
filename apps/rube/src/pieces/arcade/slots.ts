import { solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, mixHex, over, post, rail, ramp, trace, type Lane, type Pt } from '../../parts'
import { cabinet, digits, flash, glow, marquee, score } from './neon'

/**
 * A one-armed bandit, two floors tall, standing behind the rails. Its arm
 * is a long lever hubbed on its front with a tray where the knob should
 * be — a floor and a far wall — held up level with the lane. The ball
 * rolls off the rail's end onto the tray and up against its wall, and its
 * weight does what a hand does: the lever creaks, goes, and comes down
 * through a quarter turn with the ball in the crook of the tray, the reels
 * spinning all the way — and stopping one by one as it comes — until it
 * lands on its stop with the tray's wall lying along the rail below, and
 * the ball rolls out of it and on. The last reel stops on the clunk:
 * seven, seven, seven. The lamps chase, the coins come pouring out of the
 * payout tray onto the floor, and nobody picks them up. Later the lever
 * goes back up on its spring.
 *
 * The ball's seat is traced from the same swing the lever is drawn with,
 * so it sits in the tray at every angle until it rolls out.
 */
/** The tray: how thick its floor and its wall are, how far the floor reaches back, how high the wall stands; the ball's centre is this far above the arm's end, which is under the floor. */
const TRAY_T = 0.06
const TRAY_BACK = 0.18
const TRAY_WALL = TRAY_T + R
const SEAT = R + TRAY_T
/** The hub, and the arm: its length and the angle it is held up at, such that a quarter turn sets the ball down a floor below where it took it up. */
const HUB: Pt = [-0.37, 0.5]
const ARM = Math.hypot(0.5, 0.5 - SEAT)
const UP = -Math.atan2(0.5 - SEAT, 0.5)
/** Where the ball comes to rest on the tray, against its wall. */
const REST = HUB[0] + 0.5
const ARRIVE = arriveAt(REST)
const CREAK = 0.14
const PULL = 0.62
const FIRE = ARRIVE + CREAK + PULL
const RETURN = 2.4
/** When each reel stops, as a share of the pull: the last on the clunk. */
const STOPS = [0.5, 0.76, 1]
/** The cabinet, behind everything, and what is on its face. */
const CAB_X = -0.13
const CAB_W = 0.62
const REELS_Y = -0.29
const REEL_W = 0.15
const TRAY_Y = 1.32
const COINS = 9

/** How far the lever has swung, in radians, `since` the clunk: held, creaking, down through a quarter turn, held, and back up on its spring. */
const swingAt = (since: number) =>
  since < -PULL - CREAK ? 0
  : since < -PULL ? 0.05 * easeInQuad(over(since, -PULL - CREAK, -PULL))
  : since < 0 ? 0.05 + (Math.PI / 2 - 0.05) * easeInOutSine(over(since, -PULL, 0))
  : since < RETURN ? Math.PI / 2
  : (Math.PI / 2) * (1 - easeInOutSine(over(since, RETURN, RETURN + 1.1)))

/** The arm's end, and the ball's centre in the crook of the tray on it, with the lever swung `a`. */
const endAt = (a: number): Pt => [HUB[0] + ARM * Math.cos(UP + a), HUB[1] + ARM * Math.sin(UP + a)]
function seatAt(t: number): Pt {
  const a = swingAt(t - FIRE)
  const [x, y] = endAt(a)
  return [x + SEAT * Math.sin(a), y - SEAT * Math.cos(a)]
}

export const slots = definePiece<{ color: string; coin: string }>({
  name: 'slots',
  weight: 1,
  place: ({ rng, color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    const others = theme.colors.filter((c) => c !== color)
    const coin = others.length ? rng.pick(others) : color
    const lane: Lane = {
      segs: [...arrive([-0.5, 0], seatAt(ARRIVE)), ...trace(seatAt, ARRIVE, FIRE, 16), ramp(seatAt(FIRE), [0.5, 1], 0, ROLL)],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, 1], dir: 1 }, lane, state: { color, coin } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const swing = swingAt(since)
    const pulling = since > -PULL && since < 0
    const jackpot = since < 0 ? 0 : 1 - over(since, 2.2, 3)
    const shake = pulling ? 0.004 * Math.sin(t * 70) : since > 0 && since < 0.12 ? 0.01 * Math.sin(since * 80) : 0

    // The cabinet, from a marquee over the reels down to the floor of the cell below.
    p.push()
    p.translate(shake * k, 0)
    glow(p, k, s.coin, CAB_X, REELS_Y, 0.22, jackpot * (0.6 + 0.4 * Math.sin(since * 14)))
    cabinet(p, k, ink, weight, s.color, CAB_X, -0.47, 1.5, CAB_W)
    marquee(p, k, ink, weight, s.coin, bg, CAB_X - 0.26, CAB_X + 0.26, -0.425, 7, jackpot > 0 ? since * 2.5 : t * 0.35, true, 0.055)
    // The reels: three dark windows, a digit in each — whatever they were left on, a blur while they spin, a seven when they stop.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    for (let i = 0; i < 3; i++) {
      const x = CAB_X + (i - 1) * (REEL_W + 0.025)
      const stop = -PULL + PULL * STOPS[i]
      const spinning = since > -PULL && since < stop
      const stopped = since >= stop
      solid(p, ink, weight, bg)
      p.rect(x * k, REELS_Y * k, REEL_W * k, 0.2 * k, 0.015 * k)
      p.push()
      ctx.beginPath()
      ctx.rect((x - REEL_W / 2 + 0.015) * k, (REELS_Y - 0.085) * k, (REEL_W - 0.03) * k, 0.17 * k)
      ctx.clip()
      if (spinning) {
        // Two digits running down the window, one after the other.
        const run = (since + PULL) * 9 + i * 0.37
        const f = run % 1
        const n = Math.floor(run)
        const dim = mixHex(bg, ink, 0.55)
        digits(p, k, dim, x, REELS_Y - 0.2 + 0.2 * f, String((n * 7 + i * 3 + 4) % 10), 0.028)
        digits(p, k, dim, x, REELS_Y + 0.2 * f, String((n * 7 + i * 3 + 1) % 10), 0.028)
      } else {
        // It lands with a bounce.
        const bounce = stopped ? 0.03 * Math.exp(-(since - stop) * 14) * Math.cos((since - stop) * 40) : 0
        digits(p, k, stopped ? s.coin : mixHex(bg, ink, 0.42), x, REELS_Y + bounce, stopped ? '7' : String([2, 5, 8][i]), 0.028)
      }
      p.pop()
    }
    // The payout tray at its foot: a dark recess for the coins to land in.
    solid(p, ink, weight, bg)
    p.rect((CAB_X - 0.04) * k, TRAY_Y * k, 0.44 * k, 0.17 * k, 0.03 * k)
    // The coins: down into the tray one after another, where they heap up, and nobody picks them up.
    for (let i = 0; i < COINS; i++) {
      const born = 0.06 + i * 0.09
      if (since < born) break
      const f = easeInQuad(over(since, born, born + 0.16))
      const row = i < 5 ? 0 : 1
      const x = CAB_X - 0.04 + (row ? (i - 6.5) * 0.074 : (i - 2) * 0.074)
      const y1 = TRAY_Y + 0.045 - row * 0.05
      const y = TRAY_Y - 0.07 + (y1 - TRAY_Y + 0.07) * f
      solid(p, ink, weight * 0.4, s.coin)
      p.circle(x * k, y * k, 0.068 * k)
    }
    p.pop()

    // The rail in, to the tray; the rail out, from where the tray's wall comes to lie.
    rail(p, k, ink, weight, -0.5, REST - TRAY_BACK - 0.015)
    const [sx, sy] = endAt(Math.PI / 2)
    rail(p, k, ink, weight, sx + TRAY_WALL + 0.02, 0.5, 1 + FLOOR)
    post(p, k, ink, weight, 0.4, 1 + FLOOR, 1.5)

    // The lever: the arm from its hub, and the tray on the end of it.
    const [ex, ey] = endAt(swing)
    p.push()
    p.stroke(ink)
    p.strokeWeight(weight * 2.2)
    p.line(HUB[0] * k, HUB[1] * k, ex * k, ey * k)
    p.pop()
    p.push()
    p.translate(ex * k, ey * k)
    p.rotate(swing)
    solid(p, ink, weight, s.coin)
    p.beginShape()
    p.vertex(-TRAY_BACK * k, -TRAY_T * k)
    p.vertex(R * k, -TRAY_T * k)
    p.vertex(R * k, -TRAY_WALL * k)
    p.vertex((R + TRAY_T) * k, -TRAY_WALL * k)
    p.vertex((R + TRAY_T) * k, 0)
    p.vertex(-TRAY_BACK * k, 0)
    p.endShape(p.CLOSE)
    p.pop()
    solid(p, ink, weight, s.coin)
    p.circle(HUB[0] * k, HUB[1] * k, 0.13 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(HUB[0] * k, HUB[1] * k, 0.04 * k)

    // The clunk.
    flash(p, k, s.coin, weight, sx + TRAY_WALL / 2, sy + R + TRAY_T, since, 0.2, 0.05, 0.2)
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.coin, bg, 0.26, 0.66, '+777', since, 1.2),
})
