import type { Framing } from '../../../registry'
import { PROPS, SILL } from './desk'
import { TRACKS, barTime } from './music'
import { LAPS, ballAt } from './route'

/**
 * The camera: a slow operator who is always a little behind what they decide to look at.
 *
 * Where it wants to be is a list of aims, each from a moment on: the whole window, the sill with the ball walking it,
 * the stair and the cup, the cup close. Where it is, is that list as a heavy, critically damped rig follows it: every
 * move starts from rest, gathers, and settles into its new frame over several seconds without overshooting, and a move
 * begun before the last has settled carries on from where it is. Written as the sum of each aim's step response, so it
 * is a function of time alone and a scrub back is the same frame as the play forward.
 *
 * How far out it is (cells top to bottom) moves on a log scale, so a push in and a pull out of the same ratio feel the
 * same.
 */

interface Aim {
  t: number
  x: number
  y: number
  cells: number
  /** A frame the camera settles into and holds, as against one of the steps it takes following the ball along the sill. */
  held: boolean
}

/** The rig's natural frequency, per second: a move is half done in two seconds and settled in six. */
const W = 1.3

/** The room: the lower window, the whole desk, the lamp. How the show opens and closes. */
const WIDE = { x: 0.9, y: -2.2, cells: 7.0 }
/** The lower window and the whole machine: what a lob needs, and what a break draws back to. */
const ROOM = { x: -0.17, y: -1.95, cells: 5.3 }
/** The stair and the cup, with the sill's end over them, and the cat watching from beside the books. */
const STAIR = { x: 1.45, y: -1.3, cells: 3.9 }

/**
 * Where the camera sits with the listener through a groove, a phrase (eight bars) at a time. Each track takes them in
 * its own order, so no two tracks are framed alike, and none is a new idea: the same four looks at the same desk.
 */
const GROOVE = [
  // The cup, close: the ball in its seat, the stair's foot, the band rising out of frame.
  { x: 1.75, y: -0.64, cells: 2.45 },
  // The desk under the lamp: the cat, books, cup, band, the shade whole over them.
  { x: 2.0, y: -1.55, cells: 4.5 },
  // The window over the desk: the rain, the plant and the mug, and the stair and the cup small under the lamp.
  { x: 0.21, y: -1.9, cells: 4.9 },
  // From the lamp's side: the shade, the band's arch, the cup under the light.
  { x: 3.0, y: -1.45, cells: 3.7 },
]
/** The order each track takes them in (indices into GROOVE), the first being where it settles after the stair. */
const ORDERS = [
  [0, 1, 2, 1],
  [1, 3, 0, 2],
  [0, 2, 1, 3],
  [3, 1, 0, 2],
  [1, 0, 2, 3],
  [0, 3, 1, 2],
  [2, 1, 0, 3],
  [1, 2, 3, 0],
  [0, 1, 3, 2],
  [3, 0, 2, 1],
  [1, 3, 2, 0],
  [0, 2, 1, 3],
]

const AIMS: Aim[] = []
const at = (t: number, f: { x: number; y: number; cells: number }, held = true) => AIMS.push({ t, x: f.x, y: f.y, cells: f.cells, held })

function plan(): void {
  // The show opens on the room, and comes down to the sill as the ball sets off.
  at(-10, WIDE)
  for (const lap of LAPS) {
    const tr = TRACKS[lap.track]
    const bar = 4 * tr.period
    const order = ORDERS[tr.n % ORDERS.length]
    // The walk: the sill with the ball on it, the frame keeping a little ahead of it. From the room (or from where the
    // lob left it) it comes down onto the sill over a few bars.
    const prev = LAPS[lap.track - 1]
    const walkFrom = prev?.bounce ?? 6
    for (let s = walkFrom + 3; s < lap.tip - 1.5 * bar; s += 3) {
      // Where it stops following, at the sill's end, is a frame it holds until the stair.
      const x = Math.min(SILL.x1 - 0.65, ballAt(s + 2).x + 0.5)
      at(s, { x, y: -1.58, cells: 3.7 }, x === SILL.x1 - 0.65)
    }
    // A bar and a half before the drop: back to take in the stair.
    at(lap.tip - 1.5 * bar, STAIR)
    // Once it is in the cup, the track's first look; then a new one each phrase.
    at(lap.cup + 0.5 * bar, GROOVE[order[0]])
    const endGroove = lap.lob ?? barTime(tr, tr.exit)
    const breaks = tr.runs.slice(1).map((r, i) => ({ from: barTime(tr, tr.runs[i].to), to: barTime(tr, r.from) }))
    let phrase = 0
    for (let i = tr.entry + 2 + 8; ; i += 8) {
      const start = barTime(tr, i)
      if (start > endGroove - 2 * bar) break
      // Not in a break, nor just before or after one: the break has its own frames.
      if (breaks.some((b) => start > b.from - 2 * bar && start < b.to + 3 * bar)) continue
      phrase++
      at(start - 0.5 * bar, GROOVE[order[phrase % order.length]])
    }
    // A break: out to the room, and back in as the drums return, to the look the phrase after it would have.
    for (const b of breaks) {
      at(b.from - 0.25 * bar, ROOM)
      phrase++
      at(b.to - 0.75 * bar, GROOVE[order[phrase % order.length]])
    }
    if (lap.lob === null) {
      // The last track: the ball stays; as the drums leave, the camera draws back to the room, and the credits stand on
      // its dark wall while the last track rings out.
      at(barTime(tr, tr.exit) - 0.5 * bar, WIDE)
      continue
    }
    // The lob: back out a bar before, so the whole of its arc is in the frame.
    at(lap.lob - 1.25 * bar, ROOM)
  }
  AIMS.sort((a, b) => a.t - b.t)
}

plan()

/**
 * The rig's response to a step, 0 to 1, `s` seconds after it: three critically damped stages, so a move starts with
 * neither speed nor acceleration, and settles without overshoot.
 */
const step = (s: number): number => (s <= 0 ? 0 : 1 - (1 + W * s + (W * s) ** 2 / 2) * Math.exp(-W * s))

export function camera(t: number): Framing {
  let x = AIMS[0].x
  let y = AIMS[0].y
  let lc = Math.log(AIMS[0].cells)
  for (let i = 1; i < AIMS.length; i++) {
    const a = AIMS[i]
    if (a.t > t) break
    const p = AIMS[i - 1]
    const f = step(t - a.t)
    x += (a.x - p.x) * f
    y += (a.y - p.y) * f
    lc += (Math.log(a.cells) - Math.log(p.cells)) * f
  }
  return { x, y, cells: Math.exp(lc) }
}

/**
 * Whether the camera's frame from `t` on (the aim it is settling into) shows the cat whole: so the cat can play to
 * the camera, saving its nodding along and its yawns for when someone is looking.
 */
export function catInViewAt(t: number): boolean {
  let a = AIMS[0]
  for (const aim of AIMS) {
    if (aim.t > t) break
    a = aim
  }
  const [x0, y0, x1, y1] = PROPS.cat
  const hw = (a.cells * 16) / 9 / 2
  const hh = a.cells / 2
  return x0 >= a.x - hw && x1 <= a.x + hw && y0 >= a.y - hh && y1 <= a.y + hh
}

export { AIMS }
