import { CHORD, LINE, SIXTEENTHS, hzOf, midi } from './prelude'

/**
 * The machine, laid out from the score.
 *
 * The world is the score. A cell is 5 cm and gravity is the real one, so a steel ball falls as it would on a bench.
 * Every ball moves to the right at one speed, a sixteenth note every 1.25 cells, so **across the machine is time**:
 * a part's place along it is the moment it sounds, and parts at one place sound together. A ball's speed across never
 * changes (nothing in the machine pushes it sideways: every part it lands on is level), so all that is designed is how
 * high it is: it rolls along a level felt rail while it has nothing to play, runs off the rail's end and falls onto
 * its first note, bounces from part to part down a short stair (each bounce a true parabola, each part giving back
 * the share of the speed its material does), and lands on the next rail, a little lower. The machine goes down three
 * cells every half bar: the fall is what pays for the bounces.
 *
 * Three lanes run down that slope, one behind another: flue pipes on bellows at the top, tines in the middle, and the
 * bass at the bottom, hammers and strings first and then one bow, carried down past a row of cellos. The prelude is
 * one line of sixteenths, so the balls take turns at it (`who`), and the only chord in it, its last bar, is played by
 * every ball at once.
 */

export const BPM = 66
/** A sixteenth, seconds. */
export const S = 60 / BPM / 4
/** A cell, metres. */
export const CELL = 0.05
/** Gravity, cells a second squared. */
export const G = 9.81 / CELL
/** Cells to a sixteenth. */
export const U = 1.25
/** Every ball's speed across, cells a second. */
export const VX = U / S
/** A ball's radius. */
export const R = 0.33
/** When the first note sounds. */
export const T0 = 2.6
/** How far the machine falls in half a bar. */
export const DROP = 3
export const SLOPE = DROP / (8 * U)
/** What a hammer takes from the ball's landing on its lever to the string: the ball lands that much early. */
export const HAMMER = 0.02
/** A released ball's run down its ramp, seconds, and the ramp's fall across it. */
export const RAMP = 0.56
const RAMP_TAN = Math.tan(0.5 * Math.asin((2 * 7 * (VX / RAMP)) / (5 * G)))

/** The lanes: how far below the top lane's line each one's line runs. */
export const LANES = { pipe: 0, tine: 4.6, bass: 10.4 }

/** Where the last two bars broaden from. */
const RIT_FROM = 512
const TIMES = new Float64Array(SIXTEENTHS + 1)
{
  let t = T0
  for (let i = 0; i <= SIXTEENTHS; i++) {
    TIMES[i] = t
    const u = i < RIT_FROM ? 0 : (i - RIT_FROM + 1) / 32
    t += S * (1 + 0.5 * u * u + (i === SIXTEENTHS - 1 ? 0.6 : 0))
  }
}
/** When sixteenth `i` sounds; the last chord is sixteenth 544. */
export const timeOf = (i: number): number => TIMES[i]
export const CHORD_T = TIMES[SIXTEENTHS]
/** A lane's line: where its first notes stand, at `x`. */
export const lineY = (off: number, x: number): number => off + SLOPE * x

export type PartKind = 'tine' | 'piano' | 'pipe'
export type Voice = PartKind | 'bow'
export const BALLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
/** A vermilion, B ink blue, C green; the three that come for the chord, ochre, plum and teal. */
export const BALL_COLORS = ['#D2452D', '#2C4E86', '#2E8463', '#C58A1F', '#7A4A78', '#2B8A99']

/** Who plays sixteenth `i`, and on what: the orchestration. */
export function who(i: number): { ball: number; kind: Voice } {
  const bar = Math.floor(i / 16) + 1
  const j = i % 8
  if (bar <= 4) return { ball: 0, kind: 'tine' }
  if (bar <= 11) return j < 2 ? { ball: 1, kind: 'piano' } : { ball: 0, kind: 'tine' }
  if (bar <= 19) return j < 2 ? { ball: 1, kind: 'piano' } : j < 5 ? { ball: 0, kind: 'tine' } : { ball: 2, kind: 'pipe' }
  if (bar <= 23) return j < 2 ? { ball: 1, kind: 'piano' } : j < 5 ? { ball: 2, kind: 'pipe' } : { ball: 0, kind: 'tine' }
  if (bar <= 32) return j === 0 ? { ball: 1, kind: 'bow' } : j < 5 ? { ball: 0, kind: 'tine' } : { ball: 2, kind: 'pipe' }
  return i % 16 === 0 ? { ball: 1, kind: 'bow' } : { ball: 0, kind: 'tine' }
}

/** The first half bar the bow plays, and how many strokes it makes before the chord. */
export const BOW_FROM = 46
export const BOW_T = timeOf(BOW_FROM * 8)
/** How far ahead of the ball the bow's hair begins, how long it is, and how far under the ball's middle it runs. */
export const HAIR_FROM = 0.6
export const HAIR = 8 * U
export const HAIR_UNDER = 0.62
/** The last stroke: the bow slowing to rest. */
export const LAST_STROKE = 3.6

/**
 * A part's size from its pitch, cells: a tine as 1/√f (a clamped bar, and about life size), a stopped pipe as 1/f
 * (a quarter of its wave, at half life size), a string shorter as it rises, as a piano's are.
 */
export const tineLen = (hz: number): number => 1.3 * Math.sqrt(523.25 / hz)
export const stringLen = (hz: number): number => 7 * Math.pow(65.41 / hz, 0.55)
export const pipeLen = (hz: number): number => (1.64 * 523.25) / hz

/** What a part gives back of the speed a ball lands with. */
const E_OF: Record<PartKind, number> = { tine: 0.9, piano: 0.6, pipe: 0.7 }
/** The opening stair's tines: the give that keeps a ball bouncing on every sixteenth down the machine's own slope. */
const E_STAIR = (() => {
  const k = DROP / 8 / (S * ((G * S) / 2))
  return (1 - k) / (1 + k)
})()

export interface Contact {
  /** Its sixteenth; the chord's are all 544. */
  i: number
  /** When the ball lands, and when the note sounds (a hammer's flight later, for a string). */
  t: number
  sound: number
  /** The ball's middle as it lands: the part's top is `R` under it. */
  x: number
  y: number
  kind: PartKind
  midi: number
  hz: number
  ball: number
  /** The speed it lands with and leaves with, cells a second, straight down and straight up. */
  vin: number
  vout: number
  /** Its length, from its pitch. */
  len: number
}

export type Seg =
  | { k: 'rest'; t0: number; t1: number; x: number; y: number }
  | { k: 'ramp'; t0: number; t1: number; x: number; y: number }
  | { k: 'roll'; t0: number; t1: number; x: number; y: number; vy: number }
  | { k: 'fly'; t0: number; t1: number; x: number; y: number; vy: number }
  | { k: 'brake'; t0: number; t1: number; x: number; y: number }

export interface Rail {
  x0: number
  x1: number
  /** The ball's middle on it. */
  y: number
  ball: number
  /** It begins as a shelf and a ramp, the ball kept on it by a latch until `release`. */
  shelf?: { x: number; y: number; release: number }
}

export interface Ball {
  id: number
  color: string
  segs: Seg[]
}

export interface Cello {
  /** Where the hair crosses its string. */
  x: number
  y: number
  midi: number
  hz: number
  /** While the hair is on it. */
  t0: number
  t1: number
  last: boolean
}

interface NoteSpec {
  i: number
  kind: PartKind
  midi: number
  /** Its lane's line. */
  off: number
  /** How far the ball falls onto it from its rail, when it is the first of a run. */
  d: number
  e: number
  /** It begins a run of its own, from a rail, though the note before it is the ball's too. */
  fresh?: boolean
}

const contacts: Contact[] = []
const rails: Rail[] = []
const cups: { x: number; y: number; ball: number }[] = []
const trips: { t: number; x0: number; y0: number; x1: number; y1: number }[] = []
const knocks: { t: number; x: number; y: number; v: number }[] = []

/** A ball's whole way: off its shelf at `release`, through its notes, to what it ends in. */
function lay(id: number, release: number, notes: NoteSpec[], end: 'cup' | 'stay' | 'bow'): Ball {
  const segs: Seg[] = []
  const runs: NoteSpec[][] = []
  for (const n of notes) {
    const run = runs[runs.length - 1]
    if (run && !n.fresh && n.i - run[run.length - 1].i === 1) run.push(n)
    else runs.push([n])
  }
  const landing = (n: NoteSpec) => timeOf(n.i) - (n.kind === 'piano' ? HAMMER : 0)
  /** Where the ball is as a rail begins, and from when. */
  let on: { t: number; y: number } | null = null
  let last: { t: number; y: number; vout: number } | null = null
  const railTo = (y: number, leave: number, why: string) => {
    if (last) {
      // Off the last part, up and over, and down onto the rail.
      const rise = y - last.y
      const disc = last.vout * last.vout + 2 * G * rise
      if (disc < 0) throw new Error(`struck: ball ${BALLS[id]} cannot reach its rail ${why} (${rise.toFixed(2)} cells)`)
      const land = last.t + (last.vout + Math.sqrt(disc)) / G
      if (land > leave - 0.02) throw new Error(`struck: ball ${BALLS[id]} lands on its rail too late ${why}`)
      segs.push({ k: 'fly', t0: last.t, t1: land, x: VX * last.t, y: last.y, vy: -last.vout })
      on = { t: land, y }
      rails.push({ x0: VX * land - 0.55, x1: VX * leave, y, ball: id })
    } else {
      // Off the shelf: at rest behind its latch, down the ramp, and on.
      const end = release + RAMP
      if (end > leave) throw new Error(`struck: ball ${BALLS[id]} is let go too late`)
      const x1 = VX * end
      const x0 = x1 - (VX * RAMP) / 2
      const y0 = y - (x1 - x0) * RAMP_TAN
      segs.push({ k: 'rest', t0: -1e9, t1: release, x: x0, y: y0 })
      segs.push({ k: 'ramp', t0: release, t1: end, x: x0, y: y0 })
      on = { t: end, y }
      rails.push({ x0: x1, x1: VX * leave, y, ball: id, shelf: { x: x0, y: y0, release } })
      knocks.push({ t: release, x: x0, y: y0, v: 0.5 })
    }
    segs.push({ k: 'roll', t0: on.t, t1: leave, x: VX * on.t, y, vy: 0 })
  }
  for (const run of runs) {
    const first = run[0]
    const t1 = landing(first)
    // On its lane's line, or as near under it as the last bounce can reach (where a ball changes its place in the
    // figure, it has less than half a bar to fall the half bar's three cells).
    const reach: number = last ? (last as { y: number; vout: number }).y - (0.8 * (last as { vout: number }).vout ** 2) / (2 * G) + first.d : -Infinity
    const y1 = Math.max(lineY(first.off, VX * timeOf(first.i)), reach)
    const leave = t1 - Math.sqrt((2 * first.d) / G)
    railTo(y1 - first.d, leave, `before sixteenth ${first.i}`)
    segs.push({ k: 'fly', t0: leave, t1, x: VX * leave, y: y1 - first.d, vy: 0 })
    let y = y1
    let vin = Math.sqrt(2 * G * first.d)
    run.forEach((n, k) => {
      const t = landing(n)
      const vout = n.e * vin
      const hz = hzOf(n.midi)
      contacts.push({
        i: n.i, t, sound: timeOf(n.i), x: VX * t, y, kind: n.kind, midi: n.midi, hz, ball: id, vin, vout,
        len: n.kind === 'tine' ? tineLen(hz) : n.kind === 'piano' ? stringLen(hz) : pipeLen(hz),
      })
      last = { t, y, vout }
      const next = run[k + 1]
      if (!next) return
      const span = landing(next) - t
      segs.push({ k: 'fly', t0: t, t1: t + span, x: VX * t, y, vy: -vout })
      y += -vout * span + (G * span * span) / 2
      vin = -vout + G * span
    })
  }
  const done = last! as { t: number; y: number; vout: number }
  if (end === 'stay') {
    // Kept on the last bellows by its lip: the ball's weight is the last note's wind.
    segs.push({ k: 'rest', t0: done.t, t1: 1e9, x: VX * done.t, y: done.y })
  } else if (end === 'cup') {
    // One more bounce, into felt.
    const fall = 0.7
    const land = done.t + (done.vout + Math.sqrt(done.vout * done.vout + 2 * G * fall)) / G
    segs.push({ k: 'fly', t0: done.t, t1: land, x: VX * done.t, y: done.y, vy: -done.vout })
    segs.push({ k: 'rest', t0: land, t1: 1e9, x: VX * land, y: done.y + fall })
    cups.push({ x: VX * land, y: done.y + fall, ball: id })
  } else {
    // Off its last rail and into the bow's frog, and down the slope with the bow, the string's grip on the hair
    // holding them to the one speed; after the chord the rail's felt brings them to rest.
    const fall = 0.8
    const y = lineY(LANES.bass, VX * BOW_T)
    railTo(y - fall, BOW_T - Math.sqrt((2 * fall) / G), 'before the bow')
    segs.push({ k: 'fly', t0: BOW_T - Math.sqrt((2 * fall) / G), t1: BOW_T, x: VX * (BOW_T - Math.sqrt((2 * fall) / G)), y: y - fall, vy: 0 })
    knocks.push({ t: BOW_T, x: VX * BOW_T, y, v: Math.sqrt(2 * G * fall) * CELL })
    segs.push({ k: 'roll', t0: BOW_T, t1: CHORD_T, x: VX * BOW_T, y, vy: SLOPE * VX })
    const x = VX * CHORD_T
    segs.push({ k: 'brake', t0: CHORD_T, t1: CHORD_T + LAST_STROKE, x, y: lineY(LANES.bass, x) })
    const rest = x + (VX * LAST_STROKE) / 2
    segs.push({ k: 'rest', t0: CHORD_T + LAST_STROKE, t1: 1e9, x: rest, y: lineY(LANES.bass, rest) })
  }
  return { id, color: BALL_COLORS[id], segs }
}

/** How far each voice falls onto the first note of a run: how hard it begins. The piece grows by it. */
function fallOf(kind: PartKind, bar: number): number {
  if (kind === 'piano') return bar <= 11 ? 1.15 : bar <= 19 ? 1.45 : 1.8
  if (kind === 'pipe') return bar <= 23 ? 1.1 : 1.35
  return bar <= 4 ? (((G * S) / 2 + DROP / 8 / S) ** 2) / (2 * G) : bar <= 11 ? 1.1 : bar <= 23 ? 1.25 : bar <= 32 ? 1.5 : 1.7
}

const specs: NoteSpec[][] = [[], [], [], [], [], []]
for (let i = 0; i < SIXTEENTHS; i++) {
  const { ball, kind } = who(i)
  if (kind === 'bow') continue
  const bar = Math.floor(i / 16) + 1
  specs[ball].push({ i, kind, midi: LINE[i], off: kind === 'pipe' ? LANES.pipe : kind === 'tine' ? LANES.tine : LANES.bass, d: fallOf(kind, bar), e: bar <= 4 ? E_STAIR : E_OF[kind] })
}
/**
 * The chord, bar 35: C2 is the bow's, C5 a pipe's, and the three between are tines, one under another, since parts
 * that sound together stand at the one place across. Three more balls come for it, let go in the bar before, and the
 * pipes' own ball has gone to its cup by then: nothing could bring it down the two bars it has no notes in but a fall.
 */
const chord = CHORD.map(midi)
specs[5].push({ i: SIXTEENTHS, kind: 'pipe', midi: chord[4], off: LANES.pipe, d: 0.6, e: 0 })
specs[0].push({ i: SIXTEENTHS, kind: 'tine', midi: chord[3], off: LANES.tine + 0.4, d: 1, e: 0.86, fresh: true })
specs[3].push({ i: SIXTEENTHS, kind: 'tine', midi: chord[2], off: LANES.tine + 2.8, d: 1.2, e: 0.86 })
specs[4].push({ i: SIXTEENTHS, kind: 'tine', midi: chord[1], off: LANES.tine + 4.2, d: 1.2, e: 0.86 })

/** The first note each ball plays, and the note that lets it go: its latch is tripped by a part another ball strikes. */
const firstOf = (b: number) => specs[b][0].i
const TRIPS = [-1, firstOf(1) - 8, firstOf(2) - 8, SIXTEENTHS - 15, SIXTEENTHS - 15, SIXTEENTHS - 15]

export const balls: Ball[] = [
  lay(0, 0.75, specs[0], 'cup'),
  lay(1, timeOf(TRIPS[1]), specs[1], 'bow'),
  lay(2, timeOf(TRIPS[2]), specs[2], 'cup'),
  lay(3, timeOf(TRIPS[3]), specs[3], 'cup'),
  lay(4, timeOf(TRIPS[4]), specs[4], 'cup'),
  lay(5, timeOf(TRIPS[5]), specs[5], 'stay'),
]
contacts.sort((a, b) => a.x - b.x || a.y - b.y)
for (let b = 1; b < balls.length; b++) {
  const by = contacts.find((c) => c.i === TRIPS[b] && c.ball !== b)
  const shelf = rails.find((r) => r.ball === b && r.shelf)!.shelf!
  if (!by) throw new Error(`struck: nothing strikes at sixteenth ${TRIPS[b]} to let ball ${BALLS[b]} go`)
  trips.push({ t: shelf.release, x0: by.x, y0: by.y + R, x1: shelf.x, y1: shelf.y })
}

/** The cellos, one to a stroke: the bow's tip comes to each as its frog leaves the one before. */
export const cellos: Cello[] = []
for (let hb = BOW_FROM; hb <= SIXTEENTHS / 8; hb++) {
  const t0 = timeOf(hb * 8)
  const last = hb === SIXTEENTHS / 8
  const x = VX * t0 + HAIR_FROM + HAIR
  const note = last ? chord[0] : LINE[hb * 8 - ((hb * 8) % 16)]
  cellos.push({ x, y: lineY(LANES.bass, x) + HAIR_UNDER, midi: note, hz: hzOf(note), t0, t1: last ? t0 + LAST_STROKE : timeOf(hb * 8 + 8), last })
}

export { contacts, rails, cups, trips, knocks }

/** When everything has rung out. */
export const DURATION = Math.ceil(CHORD_T + 7)

/** Where a ball is at `t`, and whether it is rolling (its spin), flying, or still. */
export function ballAt(b: Ball, t: number): { x: number; y: number; k: Seg['k'] } {
  const segs = b.segs
  let lo = 0
  let hi = segs.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (segs[mid].t1 <= t) lo = mid + 1
    else hi = mid
  }
  const s = segs[lo]
  const u = Math.max(0, Math.min(s.t1, t) - s.t0)
  switch (s.k) {
    case 'rest':
      return { x: s.x, y: s.y, k: s.k }
    case 'ramp': {
      const dx = ((VX / RAMP) * u * u) / 2
      return { x: s.x + dx, y: s.y + dx * RAMP_TAN, k: s.k }
    }
    case 'roll':
      return { x: s.x + VX * u, y: s.y + s.vy * u, k: s.k }
    case 'fly':
      return { x: s.x + VX * u, y: s.y + s.vy * u + (G * u * u) / 2, k: s.k }
    case 'brake': {
      const dx = VX * (u - (u * u) / (2 * LAST_STROKE))
      return { x: s.x + dx, y: s.y + SLOPE * dx, k: s.k }
    }
  }
}

/** The bow's speed along its rail at `t`, cells a second: nothing before the ball lands in it. */
export function bowSpeed(t: number): number {
  const along = Math.hypot(1, SLOPE) * VX
  if (t < BOW_T) return 0
  if (t <= CHORD_T) return along
  return along * Math.max(0, 1 - (t - CHORD_T) / LAST_STROKE)
}

/** The machine's extent. */
export const BOX = (() => {
  const x1 = VX * (CHORD_T + LAST_STROKE) + 24
  return { x0: -6, y0: -12, x1, y1: lineY(LANES.bass, x1) + 14 }
})()
