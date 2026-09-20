import { solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, mixHex, over, rail, ramp, rankBy, trace, wait, type Lane, type Pt } from '../../parts'
import { glow, lamp, score } from './neon'

/**
 * A stacker: a light tower one or two floors tall, rows of dark blocks up
 * its face and the major-prize lamp on top. The ball rolls onto the
 * platform at the tower's foot and stops, and the game starts: the rows
 * light up the face one at a time from the bottom, tick, tick, tick, and
 * the platform rises with them a row a tick, the ball riding it, until
 * the top row lights and the prize lamp flares. Five hundred. The
 * platform tilts toward the rail and the ball rolls off it onto the rail
 * up there, on or back the way it came. The tower stays lit a while; then
 * the rows go out and the platform comes back down for the next one.
 *
 * The platform's climb is one function of time, stepped, which the lane
 * traces and the drawing uses; a row lights when the platform is on it.
 */
export interface StackerState {
  color: string
  floors: number
  turn: 1 | -1
}

/** The tower's half width, its frame round the dark face, and the head over the face where the prize lamp is. */
const TOWER = 0.26
const FRAME = 0.05
const HEAD = 0.42
/** The rows: a block's height, and the pitch from one row to the next; five to a floor. */
const BLOCK_H = 0.16
const PITCH = 0.2
const ROWS_PER_FLOOR = Math.round(1 / PITCH)
/** The platform the ball rides. */
const PLAT_W = 0.34
const PLAT_T = 0.05
const ARRIVE = arriveAt(0)
const WAKE = 0.25
const T_START = ARRIVE + WAKE
const MOVE = 0.08
const TICK = 0.18
const FLARE = 0.25
const TILT = 0.15
/** The lights go out and the platform comes down this long after the win. */
const RESET = 2.4
const rowsFor = (floors: number) => floors * ROWS_PER_FLOOR
const topAt = (floors: number) => T_START + rowsFor(floors) * TICK

/** The platform's level, in rows, at `t`: stepped up a row a tick, held at the top, and down again later. */
function levelAt(t: number, floors: number): number {
  const rows = rowsFor(floors)
  if (t <= T_START) return 0
  const top = topAt(floors)
  if (t >= top) {
    const since = t - top
    if (since < RESET) return rows
    return rows * (1 - easeInOutSine(over(since, RESET, RESET + 1.0)))
  }
  const i = Math.floor((t - T_START) / TICK)
  const f = (t - T_START - i * TICK) / TICK
  return i + easeOutQuad(Math.min(1, f * (TICK / MOVE)))
}
const platY = (t: number, floors: number) => -levelAt(t, floors) * PITCH

export const stacker = definePiece<StackerState>({
  name: 'stacker',
  points: 500,
  weight: 0.9,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const top = topAt(floors)
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [0, 0]),
          wait([0, 0], WAKE),
          ...trace((t) => [0, platY(t, floors)], T_START, top, rowsFor(floors) * 4),
          wait([0, -floors], FLARE + TILT),
          ramp([0, -floors], [turn * 0.5, -floors], 0, ROLL),
        ],
        fire: top,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const rows = rowsFor(floors)
    const level = levelAt(t, floors)
    const y = platY(t, floors)
    const top = -floors - HEAD
    const won = since < 0 ? 0 : 1 - over(since, RESET - 0.6, RESET)
    // The tilt toward the rail once the lamp has flared, and back once the platform is down.
    const tilt = since < FLARE ? 0 : since < RESET ? turn * 0.14 * easeOutCubic(over(since, FLARE, FLARE + TILT)) : turn * 0.14 * (1 - over(since, RESET, RESET + 0.3))

    rail(p, k, ink, weight, -0.5, -TOWER)
    rail(p, k, ink, weight, turn * TOWER, turn * 0.5, -floors + FLOOR)
    // The tower: a body in the colour from the floor to the head, a base band, and the dark face let into it.
    solid(p, ink, weight, s.color)
    p.rect(0, ((top + 0.5) / 2) * k, TOWER * 2 * k, (0.5 - top) * k, 0.03 * k)
    p.rect(0, 0.46 * k, (TOWER * 2 + 0.16) * k, 0.08 * k)
    const faceTop = -floors - 0.14
    const faceBottom = FLOOR + 0.28
    solid(p, ink, weight * 0.8, bg)
    p.rect(0, ((faceTop + faceBottom) / 2) * k, (TOWER - FRAME) * 2 * k, (faceBottom - faceTop) * k, 0.02 * k)
    // The rows: dark blocks up the face, lit in the colour from the bottom as the platform climbs onto each.
    const dim = mixHex(bg, ink, 0.28)
    for (let j = 1; j <= rows; j++) {
      const ry = -j * PITCH + FLOOR + BLOCK_H / 2
      const lit = level >= j - 0.02 ? 1 : 0
      if (lit) glow(p, k, s.color, 0, ry, 0.16, 0.6 * (since < RESET - 0.6 ? 1 : won))
      solid(p, lit ? ink : dim, weight * 0.8, lit ? s.color : bg)
      p.rect(0, ry * k, (TOWER - FRAME - 0.03) * 2 * k, BLOCK_H * k, 0.012 * k)
    }
    // The head: the major-prize lamp, flaring at the top.
    glow(p, k, s.color, 0, top + 0.16, 0.22, won)
    lamp(p, k, ink, weight, s.color, bg, 0, top + 0.16, 0.07, won)
    // The platform, and the ball on it: a plank in the slot, tilting toward the rail at the top.
    p.push()
    p.translate(0, (y + FLOOR + PLAT_T / 2) * k)
    p.rotate(tilt)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, PLAT_W * k, PLAT_T * k, 0.01 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, (PLAT_T / 2 - 0.01) * k, (PLAT_W - 0.04) * k, 0.02 * k)
    p.pop()
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, 0, -s.floors - HEAD + 0.1, '+500', since, 1.2),
})
