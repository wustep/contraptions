import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, over, ramp, trace, type Lane, type Pt } from '../../../parts'
import { SNOW, powder, snow, snowAt, snowWhite } from './snow'

/**
 * A halfpipe cut in the snow, two cells across and most of a floor deep.
 * The track runs up a bank onto the near coping, a hand higher than it
 * came, and the climb takes nearly all the ball's pace: it creeps to the
 * edge, tips over the coping, and drops in. Down the wall, round the
 * transition, across the flat, up the far wall as fast as it came down,
 * and off the lip: a little air over the far deck, a landing in a puff of
 * powder, and it rolls on.
 *
 * It is one motion and no energy is made or lost in it until the landing:
 * the ball's pace at every point is what its height gives it, from the
 * track's own pace at the track's own level, so it is slow on the raised
 * coping, fastest on the flat, and leaves the far lip, which is no higher
 * than the track, at the pace it rolled in at. The near wall is the very
 * line a ball tipping off that coping would fall along, so it rides the
 * wall down without ever pressing on it or leaving it; the far lip throws
 * it on the line a thrown ball takes. The pipe is drawn from the ball's
 * line, a radius outside it.
 */
const G = 22
/** How far the near coping stands over the track, and the pace that leaves the ball there. */
const RISE = 0.14
const CREEP = Math.sqrt(ROLL * ROLL - 2 * G * RISE)
/** The transitions' radius on the ball's line, how steep the near wall gets, how steep the far wall is at its lip, and the flat between. */
const BEND = 0.28
const STEEP = (80 * Math.PI) / 180
const LIP = (72 * Math.PI) / 180
const FLAT = 0.05
/** Where on the far deck the ball comes down. */
const LAND_X = 1.22
/** The ball's pace where its centre is `y` under the track's line. */
const paceAt = (y: number): number => Math.sqrt(ROLL * ROLL + 2 * G * y)

interface Line {
  /** The ball's centre, point by point, and the seconds at which it is there. */
  pts: Pt[]
  at: number[]
  /** The pipe's surface under each point, a radius off it; null while the ball is in the air. */
  skin: (Pt | null)[]
  /** When it leaves the far lip, when it lands, and its pace along the deck as it does. */
  launch: number
  land: number
  landPace: number
  /** The near coping's corner, and the far one. */
  near: Pt
  far: Pt
}

/** The whole ride, with the near coping's corner at `edge`. */
function ride(edge: number): Line {
  const pts: Pt[] = []
  const skin: (Pt | null)[] = []
  const put = (x: number, y: number, slope: number | null) => {
    pts.push([x, y])
    skin.push(slope === null ? null : [x - R * Math.sin(slope), y + R * Math.cos(slope)])
  }
  // Up the bank onto the coping: level at both ends.
  const n = 28
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = -0.5 + (edge + 0.5) * u
    const dy = (-RISE * 6 * u * (1 - u)) / (edge + 0.5)
    put(x, -RISE * u * u * (3 - 2 * u), Math.atan(dy))
  }
  const near: Pt = [edge, FLOOR - RISE]
  // Over the corner: the ball turns about it until its own pace would carry it clear.
  const clear = Math.acos((CREEP * CREEP + 2 * G * R) / (3 * G * R))
  for (let i = 1; i <= 10; i++) {
    const a = (clear * i) / 10
    pts.push([edge + R * Math.sin(a), near[1] - R * Math.cos(a)])
    skin.push(near)
  }
  // And falls, and the wall is the line it falls along, until that line is as steep as the wall gets.
  const [x0, y0] = pts[pts.length - 1]
  const v0 = paceAt(y0)
  const vx = v0 * Math.cos(clear)
  const vy = v0 * Math.sin(clear)
  const fall = (vx * Math.tan(STEEP) - vy) / G
  for (let i = 1; i <= 16; i++) {
    const s = (fall * i) / 16
    put(x0 + vx * s, y0 + vy * s + 0.5 * G * s * s, Math.atan2(vy + G * s, vx))
  }
  // Round the transition to the flat, across it, and round the far one.
  const [x1, y1] = pts[pts.length - 1]
  const hub: Pt = [x1 + BEND * Math.sin(STEEP), y1 - BEND * Math.cos(STEEP)]
  for (let i = 1; i <= 18; i++) {
    const a = STEEP * (1 - i / 18)
    put(hub[0] - BEND * Math.sin(a), hub[1] + BEND * Math.cos(a), a)
  }
  const bed = hub[1] + BEND
  put(hub[0] + FLAT, bed, 0)
  for (let i = 1; i <= 16; i++) {
    const a = (LIP * i) / 16
    put(hub[0] + FLAT + BEND * Math.sin(a), bed - BEND * (1 - Math.cos(a)), -a)
  }
  // Straight up the far wall to its lip, which is the track's own level.
  const [x2, y2] = pts[pts.length - 1]
  const top = FLOOR - R * Math.cos(LIP)
  const run = (y2 - top) / Math.sin(LIP)
  for (let i = 1; i <= 8; i++) put(x2 + (run * Math.cos(LIP) * i) / 8, y2 - (run * Math.sin(LIP) * i) / 8, -LIP)
  const [x3, y3] = pts[pts.length - 1]
  const far: Pt = [x3 + R * Math.sin(LIP), FLOOR]
  const launchIndex = pts.length - 1
  // Off the lip, on the line a thrown ball takes, until it is back down on the deck.
  const v3 = paceAt(y3)
  const ux = v3 * Math.cos(LIP)
  const uy = -v3 * Math.sin(LIP)
  const air = (-uy + Math.sqrt(uy * uy - 2 * G * y3)) / G
  for (let i = 1; i <= 16; i++) {
    const s = (air * i) / 16
    put(x3 + ux * s, i === 16 ? 0 : y3 + uy * s + 0.5 * G * s * s, null)
  }
  // The seconds: every step at the pace its height gives.
  const at = [0]
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    at.push(at[i - 1] + d / paceAt((pts[i][1] + pts[i - 1][1]) / 2))
  }
  return { pts, at, skin, launch: at[launchIndex], land: at[at.length - 1], landPace: ux, near, far }
}

/** The coping's corner is wherever puts the landing where it is wanted. */
const LINE = ride(LAND_X - ride(0).pts[ride(0).pts.length - 1][0])

/** The ball's centre, `t` seconds into the piece. */
function ballAt(t: number): Pt {
  const { pts, at } = LINE
  if (t <= 0) return pts[0]
  let i = 1
  while (i < at.length - 1 && at[i] < t) i++
  const f = Math.min(1, (t - at[i - 1]) / (at[i] - at[i - 1]))
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
}

const LANE: Lane = {
  segs: [...trace(ballAt, 0, LINE.land, 84), ramp([LAND_X, 0], [1.5, 0], LINE.landPace, ROLL)],
  fire: LINE.launch,
}

/** The pipe's skin, coping to coping, and the snow's body behind it. */
const SKIN: Pt[] = LINE.skin.filter((q): q is Pt => q !== null).filter((q, i, all) => i === 0 || q !== all[i - 1])
/** How thick the snow stands behind the walls, and under the decks where they leave the ground. */
const WALL = 0.11
const BACK: Pt[] = (() => {
  const out: Pt[] = []
  for (let i = 1; i + 1 < SKIN.length; i++) {
    const [ax, ay] = SKIN[i - 1]
    const [bx, by] = SKIN[i + 1]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const q: Pt = [SKIN[i][0] - ((by - ay) / len) * WALL, SKIN[i][1] + ((bx - ax) / len) * WALL]
    // Only under the ground: above it the walls' backs are the banks.
    if (q[1] > snowAt(q[0]) && q[0] > LINE.near[0] - WALL - 0.02 && q[0] < LINE.far[0] + WALL + 0.02) out.push(q)
  }
  return out
})()
/** The banks under the two decks: nothing at the piece's edge, where the track is a rail, and swelling down to the ground this far in. */
const SWELL = 0.2
const NEAR_FOOT = -0.5 + SWELL
const FAR_FOOT = 1.5 - SWELL
const bankUnder = (edge: number, hand: 1 | -1): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    const x = edge + hand * SWELL * u
    out.push([x, FLOOR + 0.03 + (snowAt(x) - FLOOR - 0.03) * (1 - (1 - u) ** 3)])
  }
  return out
}
const NEAR_BANK = bankUnder(-0.5, 1)
const FAR_BANK = bankUnder(1.5, -1)
/** The pipe's belly: its middle, and how low it hangs. It rests in a heap on the snow of the floor below. */
const BELLY_X = BACK.reduce((low, q) => (q[1] > low[1] ? q : low), BACK[0])[0]
const BELLY = Math.max(...BACK.map((q) => q[1]))

export const halfpipe = definePiece<{ white: string }>({
  name: 'halfpipe',
  weight: 0.8,
  // It throws the ball off its far lip: an accent, as a flight is.
  flight: true,
  place: ({ fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { white: snowWhite(theme) } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    snow(p, k, ink, weight, -0.5, NEAR_FOOT)
    snow(p, k, ink, weight, FAR_FOOT, 1.5)
    // The floor below has its own snow, and the pipe's belly rests in a heap of it: white under one soft line, the ground's own beneath.
    const heap: Pt[] = [[BELLY_X - 0.5, snowAt(BELLY_X - 0.5, SNOW + 1)], [BELLY_X - 0.22, BELLY - 0.03], [BELLY_X + 0.22, BELLY - 0.03], [BELLY_X + 0.5, snowAt(BELLY_X + 0.5, SNOW + 1)]]
    for (const stroked of [false, true]) {
      if (stroked) outline(p, ink, weight)
      else {
        p.noStroke()
        p.fill(s.white)
      }
      p.beginShape()
      p.curveVertex(heap[0][0] * k, heap[0][1] * k)
      for (const [x, y] of heap) p.curveVertex(x * k, y * k)
      p.curveVertex(heap[3][0] * k, heap[3][1] * k)
      p.endShape()
    }
    snow(p, k, ink, weight, -0.5, heap[0][0], SNOW + 1)
    snow(p, k, ink, weight, heap[3][0], 1.5, SNOW + 1)

    // One body of snow: the banks under the decks, the walls' backs under the ground, and the skin the ball rides.
    solid(p, ink, weight, s.white)
    p.beginShape()
    for (const [x, y] of SKIN) p.vertex(x * k, y * k)
    p.vertex(1.5 * k, FLOOR * k)
    for (const [x, y] of FAR_BANK) p.vertex(x * k, y * k)
    for (let i = BACK.length - 1; i >= 0; i--) p.vertex(BACK[i][0] * k, BACK[i][1] * k)
    for (let i = NEAR_BANK.length - 1; i >= 0; i--) p.vertex(NEAR_BANK[i][0] * k, NEAR_BANK[i][1] * k)
    p.endShape(p.CLOSE)

    // The landing: a puff of powder off the far deck.
    powder(p, k, ink, weight, s.white, LAND_X, FLOOR - 0.01, over(t, LINE.land, LINE.land + 0.35), 0.7)
  },
})
