import type p5 from 'p5'
import { laneAt, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, knock, lastOf, part, smooth, type PartShot } from '../kit'
import { CODA, LAST1, LAST2 } from '../music'
import { dawn, REST, skyline, surface } from '../mountain'
import { quake } from '../rock'
import { SEAM_SHOT } from '../seams'
import type { Pen } from '../troll'
import { STONE } from '../worlds'
import { breach, capCracks, collar, collarFront, dropped, G, stone, thrown, vent, VENT, type Floor, type Stone } from './fall-rock'
import { column, crown, plume, steam } from './fall-water'

/**
 * The director's: the coda (134.25 → the end). Ibsen's order: the bells ring, the trolls flee, the hall comes down,
 * and Peer is out on the hillside at sunrise. The machine that gets him out is the mountain's own heart, broken:
 *
 *   134.25  the first chord: he drops into an iron collar in the heart's floor at the chimney's foot, a pipe's mouth
 *           narrower than he is, and stops it like a cork. The pressure under him spits round him.
 *   135.41  the crash: he is blown out of it on a geyser, the dancing ball on a fountain, and rammed up the heart
 *           against the drum's floor (136.11), which cracks, and bursts on 136.36; up the drum room, rammed against
 *           the mine's floor (138.60), which cracks, and bursts on 139.07; up the mine to the hall's floor (140.05),
 *           which bursts on 140.27. Chunks of each floor are thrown up round him and land on the floor they came from;
 *           stones let go of the ceilings and come down past him, on the chords.
 *   140.8   he floats up through the hall as it comes down round him (the hall part's collapse; a stalactite and blocks
 *           of its vault here, on 143.20, 144.12, 144.84), into the vent over it.
 *   145.35  the six hammer blows: six short surges into the vent's mouth, the hall seen whole below him as its
 *           pillars and throne come down and its lights go out one a blow; the last throws him up the dark vent.
 *   147.0   the silence: he coasts up it to a stop under the summit's cap and hangs there, the dust hanging.
 *   148.24  the roll: the geyser slams him up against the cap (148.49), and the cap cracks, light coming through.
 *   149.52  the first of the last two chords: the cap is blown out and he with it, out of the summit into the dawn.
 *   149.82  the second: the plume's second surge throws him clear, east, in a long arc under the last stars; the cap's
 *           blocks come down on the flanks as the chord rings; he lands on the east shoulder (153.17), bounces
 *           (153.61), rolls into the grassy hollow there and rocks to rest; the geyser sinks to a burble; the stave
 *           church's bell rings on in the valley (`mountain.ts`); the camera cranes up and back over the credits.
 *
 * The part is laid where the heart's runaway leaves the ball: its entry is the chimney's foot, world (47.5, 33), so
 * this frame's origin is world (48, 33) (`ORIGIN`). Everything here is laid out in world cells (the rooms' floors,
 * the vent, the summit) and moved into this frame to draw.
 */

/** Where the score lays this part (the runaway's exit, the chimney's foot): its frame's origin, world cells. */
export const ORIGIN: Pt = [48, 33]
/** The chimney's column, world x. */
const COL = 47.5
const lx = (x: number) => x - ORIGIN[0]
const ly = (y: number) => y - ORIGIN[1]

/** The floors the geyser breaks, world y: each one's top (the room above's floor), its underside (the room below's ceiling). */
const FLOORS: Floor[] = [
  { top: 25.13, bot: 26.5, crack: 136.11, burst: 136.36 },
  { top: 17.13, bot: 18.5, crack: 138.598, burst: 139.072 },
  { top: 8.13, bot: 10.0, crack: 140.045, burst: 140.273 },
]
/** The summit's cap: from the vent's top up to the surface; it bursts on the first of the last two chords. */
const CAP: Floor = { top: -21, bot: VENT.top, crack: 148.491, burst: LAST1 }
/** The roll's accents that crack the cap. */
const CAP_CRACKS = [148.243, 148.491, 148.981]

/* ------------------------------------------------------------------ Peer's way up */

/**
 * His height (world y, his centre) at each moment the geyser does something, and how fast he is still going there
 * (v1, cells/s, upward; 0 rammed against a ceiling). Between two, gravity slows him evenly (a `ramp` segment): a hit
 * is sharp and the recovery long. `v0` instead of v1: the leg carries on from the one before without a kick.
 */
interface Leg {
  at: number
  y: number
  v1?: number
  v0?: number
}
const RISE: Leg[] = [
  { at: CODA, y: 33 },
  // In the collar, stopping it; the pickup lifts him a hair on the water spitting round him.
  { at: 135.146, y: 33 },
  { at: 135.411, y: 32.88, v1: 0 },
  // Blown out, up the heart, rammed against the drum's floor; it cracks; it bursts.
  { at: 136.11, y: 26.68, v1: 0 },
  { at: 136.36, y: 26.65, v1: 0 },
  { at: 137.118, y: 21.4, v1: 0.7 },
  // Up the drum room to the mine's floor; it cracks, it bursts, a second surge (the crash) up the mine.
  { at: 138.598, y: 18.68, v1: 0 },
  { at: 139.072, y: 18.65, v1: 0 },
  { at: 139.326, y: 16.0, v1: 7 },
  // Up the mine to the hall's floor; it cracks; it bursts.
  { at: 140.045, y: 10.18, v1: 0 },
  { at: 140.273, y: 10.15, v1: 0 },
  { at: 140.8, y: 7.0, v1: 2.2 },
  // Floating up through the hall as it comes down, to the vent's mouth in its vault.
  { at: 143.199, y: 2.4, v0: 2.2 },
  { at: 144.12, y: 0.3, v1: 0.4 },
  { at: 144.84, y: -1.7, v1: 0.5 },
  { at: 145.345, y: -3.5, v1: 0.5 },
  // The six hammer blows: six short surges up into the vent, over the hall as its lights go out.
  { at: 145.597, y: -4.0, v1: 0.3 },
  { at: 145.847, y: -4.5, v1: 0.3 },
  { at: 146.107, y: -5.0, v1: 0.3 },
  { at: 146.348, y: -5.5, v1: 0.3 },
  { at: 146.601, y: -6.0, v1: 0.3 },
  // The last blow throws him up the dark vent; he coasts through the silence to a stop under the cap, hangs, and
  // begins to sink.
  { at: 148.08, y: -17.6, v1: 0.05 },
  { at: 148.243, y: -17.45 },
  // The roll: slammed up against the cap, and held there while it cracks.
  { at: 148.491, y: VENT.top + R + 0.05, v1: 0 },
  { at: LAST1, y: VENT.top + R + 0.01, v1: 0 },
  // Blown out of the summit.
  { at: LAST2, y: -22.6, v1: 3 },
]

/** Out of the summit: the long arc east, under this gravity, to the shoulder. */
const G_FLIGHT = 6
/** Where he lands on the east shoulder (world x) and when; where the bounce puts him down again, and when. */
const LAND = { x: 56.9, t: 153.17 }
const BOUNCE = { x: 57.75, t: 153.611 }
/** Rolling into the hollow and rocking there until he lies still, by this time. */
const STILL = 159.6

const onGround = (x: number): Pt => [lx(x), ly(skyline(x) - R)]

/** His x along the shoulder while he rolls into the hollow and rocks to rest (show time T ≥ BOUNCE.t). */
function rolling(T: number): number {
  const v0 = (BOUNCE.x - LAND.x) / (BOUNCE.t - LAND.t)
  const x0 = BOUNCE.x - REST[0]
  const tau = 0.95
  const w = (Math.PI * 2) / 2.3
  // x = REST + A e^(-t/τ) cos(ωt + φ), matched to where and how fast the bounce sets him down.
  const a = x0
  const b = -(v0 + x0 / tau) / w
  const t = T - BOUNCE.t
  const settle = 1 - smooth(T, STILL - 2.2, STILL)
  return REST[0] + Math.exp(-t / tau) * (a * Math.cos(w * t) + b * Math.sin(w * t)) * settle
}

function lane(begin: number, end: number): Lane {
  const segs: Seg[] = []
  const X = lx(COL)
  for (let i = 1; i < RISE.length; i++) {
    const a = RISE[i - 1]
    const b = RISE[i]
    const dur = b.at - a.at
    const len = Math.abs(b.y - a.y)
    const seg: Seg = { from: [X, ly(a.y)], to: [X, ly(b.y)], dur }
    if (len > 1e-6) {
      let v0: number
      let v1: number
      if (b.v0 !== undefined) {
        v0 = b.v0
        v1 = Math.max(0, (2 * len) / dur - v0)
      } else {
        v1 = b.v1 ?? 0
        v0 = Math.max(0, (2 * len) / dur - v1)
        if (b.v1 === undefined) {
          // A leg with neither: from rest, gathering speed (the sink in the silence).
          v1 = (2 * len) / dur
          v0 = 0
        }
      }
      if (v0 + v1 > 1e-6) seg.ramp = [v0, v1]
    }
    segs.push(seg)
  }
  // The arc: a real throw from where the plume leaves him to the shoulder.
  const out: Pt = [X, ly(RISE[RISE.length - 1].y)]
  const land = onGround(LAND.x)
  const T1 = LAND.t - LAST2
  segs.push({ from: out, to: land, dur: T1, arc: (G_FLIGHT * T1 * T1) / 8 })
  // The bounce: small, quick, down again a little further on.
  const T2 = BOUNCE.t - LAND.t
  segs.push({ from: land, to: onGround(BOUNCE.x), dur: T2, arc: (G * T2 * T2) / 8 })
  // Into the hollow, rocking there, still.
  segs.push(...carried((t) => onGround(rolling(t)), BOUNCE.t, STILL, Math.ceil((STILL - BOUNCE.t) * 30)))
  const rest = onGround(REST[0])
  segs.push({ from: rest, to: rest, dur: end - STILL })
  return { segs, fire: 135.411 - begin }
}

/* ------------------------------------------------------------------ what comes down */

/** A block of the summit's cap, blown out on the first of the last chords, landing on a flank at `x` at t1. */
const capBlock = (x0: number, t1: number, x: number, size: number, seed: number): Stone => thrown([x0, -20.35], LAST1, x, skyline(x), t1, size, seed)

const STONES: Stone[] = [
  // The heart: two stones come down past him as he is blown up it.
  dropped(46.2, 27.1, 33.13, 136.11, 0.55, 1),
  dropped(48.95, 27.1, 33.13, 136.36, 0.7, 2),
  // The drum's floor bursts: chunks of it thrown up round him, down on either side.
  thrown([47.2, 25.6], 136.36, 46.0, 25.13, 137.118, 0.45, 3),
  thrown([47.85, 25.7], 136.36, 49.1, 25.13, 137.404, 0.52, 4),
  // The drum room's ceiling lets go.
  dropped(49.7, 19.0, 25.13, 138.598, 0.62, 5),
  dropped(45.7, 19.0, 25.13, 139.072, 0.46, 6),
  // The mine's floor, and its ceiling.
  thrown([47.2, 17.6], 139.072, 45.95, 17.13, 139.326, 0.42, 7),
  thrown([47.85, 17.7], 139.072, 49.15, 17.13, 140.045, 0.5, 8),
  dropped(45.55, 10.5, 17.13, 140.98, 0.55, 9),
  // The hall's floor.
  thrown([47.2, 8.8], 140.273, 45.9, 8.13, 141.046, 0.48, 10),
  thrown([47.85, 8.9], 140.273, 49.3, 8.13, 141.524, 0.55, 11),
  // The hall's vault coming down round him: a stalactite, then blocks.
  dropped(45.35, -2.2, 8.13, 143.199, 1.1, 12, { spike: true, shatter: true }),
  dropped(50.15, -2.0, 8.13, 144.12, 0.7, 13),
  dropped(44.5, -2.3, 8.13, 144.84, 0.55, 14, { shatter: true }),
  // The cap: its blocks come down on the flanks as the last chord rings.
  capBlock(46.95, 150.263, 44.1, 0.62, 15),
  capBlock(48.1, 150.42, 51.0, 0.55, 16),
  capBlock(47.2, 150.543, 45.7, 0.4, 17),
  capBlock(46.7, 150.995, 42.4, 0.8, 18),
  capBlock(48.35, 151.248, 52.6, 0.7, 19),
]

/* ------------------------------------------------------------------ the strikes */

const LEGS = RISE.slice(1).map((b, i) => ({ a: RISE[i], b }))
/** When the geyser kicks him up: the start of every leg that rises and is not carried on from the one before. */
const KICKS = LEGS.filter(({ a, b }) => b.v0 === undefined && a.y - b.y > 0.05).map(({ a }) => a.at)
/** When a ceiling stops him dead: the end of every rising leg that ends at rest. */
const STOPS = LEGS.filter(({ a, b }) => b.v1 === 0 && a.y - b.y > 0.05).map(({ b }) => b.at)

/** Every strike of the finale: his landing in the collar, the kicks and the stops, the throw, each stone's landing, the cap's cracks, the arc's two touches. */
export const FALL_HITS: number[] = (() => {
  const all = [CODA, ...KICKS, ...STOPS, LAST2, ...STONES.map((s) => s.t1), ...CAP_CRACKS, LAND.t, BOUNCE.t].sort((a, b) => a - b)
  const out: number[] = []
  for (const t of all) if (!out.some((u) => Math.abs(u - t) < 0.02)) out.push(t)
  return out
})()

/* ------------------------------------------------------------------ the part */

interface State {
  begin: number
  lane: Lane
}

/** How hard the geyser is pushing at T: a surge on each kick, dying back. */
function force(T: number): number {
  const { ago } = lastOf(KICKS, T)
  return 0.35 + 0.65 * knock(ago, 0.35)
}

/** 0..1: how hard he is rammed against a ceiling that has not given way yet (his top within a hair of its underside). */
function pressed(T: number, y: number): number {
  let out = 0
  for (const f of [...FLOORS, CAP]) {
    if (T >= f.burst) continue
    const gap = y - R - f.bot
    if (gap >= -0.02) out = Math.max(out, 1 - smooth(gap, 0.02, 0.3))
  }
  return out
}

/**
 * The geyser once he has left it (world y of its top), and how big its head still is: it goes on up after throwing
 * him (the second chord's surge), stands a moment, sinks to a burble in the crater, and goes down into the vent.
 */
function plumeAt(T: number): { top: number; h: number } {
  const floor = skyline(COL) + 1.96
  const up = smooth(T, LAST2, LAST2 + 1.0)
  const high = -22.6 + (-27.9 + 22.6) * (1 - (1 - up) * (1 - up)) + 0.2 * Math.sin((T - LAST2) * 2.1) * up
  const sink = smooth(T, LAST2 + 1.5, LAST2 + 4.6)
  const gone = smooth(T, LAST2 + 6, LAST2 + 9.5)
  const burble = floor - 0.6 + 0.1 * Math.sin(T * 3.1)
  const top = high * (1 - sink) + burble * sink
  // Then the water drains back down the vent, gathering speed, out of every frame.
  const drain = Math.max(0, T - (LAST2 + 9.5))
  const low = floor + 1.2 + (3 * drain * drain) / (drain + 1.2)
  return { top: top * (1 - gone) + low * gone, h: smooth(T, LAST2, LAST2 + 0.5) * (1 - 0.85 * sink) * (1 - gone) }
}

function drawFall(p: p5, s: State, c: Pen & { t: number }): void {
  const T = s.begin + c.t
  const k = c.k
  const q = quake(T)
  const d = dawn(T)
  const f = frame(p, k)
  const X = lx(COL)
  // Peer, from the same lane the stage draws him on.
  const ball = laneAt(s.lane, Math.max(0, c.t))
  const by = T < CODA ? 0 : ball.y
  const bx = T < CODA ? X : ball.x

  // The dust of the collapse hanging in the rooms (under everything this part draws): thickening with the chords,
  // held in the silence, gone once he is out.
  const haze = 0.13 * smooth(T, CODA, CODA + 2.5) * (1 - smooth(T, LAST1, LAST1 + 1.0))
  if (haze > 0.003) {
    p.push()
    p.noStroke()
    p.fill(alpha(p, STONE.light, haze))
    p.beginShape()
    const step = (f.x1 - f.x0) / 40
    for (let x = f.x0 - 1; x <= f.x1 + 1 + step; x += step) p.vertex(x * k, Math.max(f.y0 - 1, ly(surface(x + ORIGIN[0], T))) * k)
    p.vertex((f.x1 + 1 + step) * k, (f.y1 + 1) * k)
    p.vertex((f.x0 - 1) * k, (f.y1 + 1) * k)
    p.endShape(p.CLOSE)
    p.pop()
  }

  // The vent over the hall, the floors' breaches, the collar at the foot.
  // The vent shows as he comes up the hall toward it, wet once the spray is in it.
  const inVent = smooth(T, 142.6, 145.0) * (1 - 0.8 * smooth(T, LAST2 + 8, LAST2 + 16))
  vent(p, c, ORIGIN, COL, q, { wet: inVent, day: T >= LAST1 ? smooth(T, LAST1, LAST1 + 0.6) * (1 - 0.85 * smooth(T, LAST2 + 5, LAST2 + 12)) : 0.25 * smooth(T, CAP_CRACKS[0], LAST1) })
  for (const fl of FLOORS) breach(p, c, ORIGIN, COL, fl, T, q)
  collar(p, c, ORIGIN, COL, 33.13, q)
  capCracks(p, c, ORIGIN, COL, T, q, CAP_CRACKS, LAST1, (x) => skyline(x))

  // What comes down, and what is thrown up.
  for (const st of STONES) {
    const outside = st.from[1] < -19
    stone(p, c, ORIGIN, st, T, q, outside ? 0.35 + 0.55 * d : 0.55)
  }

  // The geyser: from the collar up to him while he rides it, then up out of the summit on its own.
  const foot = 0.06
  if (T >= 135.146 && T < 135.411) {
    // Stopped by him: only spitting round him.
    crown(p, c, bx, by, T, 0.5, 0, 0, smooth(T, 135.146, 135.2))
  } else if (T >= CODA + 0.3 && T < 135.146) {
    crown(p, c, bx, by, T, 0.3, 0, 0, 0.35 * smooth(T, CODA + 0.3, CODA + 0.7))
  }
  if (T >= 135.411) {
    const fo = force(T)
    const riding = T < LAST2
    const top = riding ? by + R * 0.55 : ly(plumeAt(T).top)
    // Only the stretch of the column in view is drawn.
    const yb = Math.min(foot, f.y1 + 2)
    const yt = Math.max(top, f.y0 - 2)
    const sun = T >= LAST1 ? d : 0
    if (yb > yt) column(p, c, X, yb, yt, T, fo, sun)
    if (riding) crown(p, c, bx, by, T, fo, pressed(T, ball.y + ORIGIN[1]), sun)
    else {
      const pl = plumeAt(T)
      plume(p, c, X, ly(surface(COL, T)), ly(pl.top), T, pl.h, d, (x) => ly(surface(x + ORIGIN[0], T)))
      steam(p, c, X, ly(surface(COL, T)) - 0.2, T, smooth(T, LAST2 + 6, LAST2 + 9) * (1 - smooth(T, LAST2 + 12, LAST2 + 17)), d)
    }
  }
}

export const fall = part<State>(
  {
    name: 'fall',
    draw: (p, s, c) => drawFall(p, s, c),
    // Over the ball: the front of the standpipe's mouth, so he sits down inside it when he drops on it.
    over: (p, s, c) => collarFront(p, c, ORIGIN, COL, 33.13, quake(s.begin + c.t)),
  },
  (slot) => {
    const l = lane(slot.begin, slot.end)
    const rest = onGround(REST[0])
    return {
      // The chimney from the heart to the summit, the plume over it, and the east shoulder where he comes to rest.
      cells: box(-5.5, -64, 13, 1.5, 1),
      exit: [rest[0] + 0.5, rest[1]] as Pt,
      lane: l,
      state: { begin: slot.begin, lane: l },
    }
  },
  (slot): PartShot[] => {
    const w = (x: number, y: number): Pt => [lx(x), ly(y)]
    return [
      { t: slot.begin, ...SEAM_SHOT },
      // Up the chimney: pulling back a little at each floor, looking up the way he is going.
      // Held on the pipe while he stops it, so the burst starts in the frame.
      { t: 135.146, cells: 6, hold: w(COL, 32.6), w: 0.8 },
      { t: 135.411, cells: 6.3, hold: w(COL, 32.2), w: 0.55 },
      // Pinned under a floor the camera settles on him (it would otherwise run on ahead to the burst); moving, it leads.
      { t: 136.11, cells: 7.4, off: [0, -0.4] },
      { t: 138.598, cells: 8.5, off: [0, -0.4] },
      { t: 140.273, cells: 10, off: [0, -0.5] },
      // The hall, wide, coming down round him: the pillars one a chord, then on the hammer blows the throne and the
      // lights, with him rising into the vent's mouth over it all.
      { t: 142.0, cells: 12.5, off: [0, -1.5] },
      { t: 143.5, cells: 14.5, hold: w(51.5, 1.2), w: 0.75 },
      { t: 145.345, cells: 16.5, hold: w(53.5, 0.4), w: 0.9 },
      { t: 146.107, cells: 16, hold: w(53.2, -0.4), w: 0.9 },
      { t: 146.601, cells: 15, hold: w(52, -2.4), w: 0.8 },
      // Up the dark vent after him, through the silence; the roll.
      { t: 147.45, cells: 9.5, off: [0, -1.0] },
      { t: 148.243, cells: 8, off: [0, -0.6] },
      // Held on the cap as it bursts, so he comes out of the bottom of the frame into it.
      { t: LAST1, cells: 8, hold: w(47.5, -20.4), w: 0.8 },
      // Out, and back to take in the summit, the plume, the dawn and his arc (kept under the first credit card).
      { t: 150.4, cells: 11.5, hold: w(49.5, -24.5), w: 0.6 },
      { t: 151.8, cells: 14.5, hold: w(53.5, -26.9), w: 0.85 },
      { t: 153.2, cells: 12, hold: w(56.5, -21.2), w: 0.55 },
      // At rest in the hollow, the church in the valley: then one long, even crane up and back over the credits,
      // to the whole dawn valley with him small on the hillside (it never stops: an even zoom, geometric keys).
      { t: 156, cells: 12.6, hold: w(61, -19.9), w: 0.9 },
      { t: 162, cells: 14.7, hold: w(61.4, -20.8), w: 0.95 },
      { t: 168.5, cells: 17.4, hold: w(61.8, -21.9), w: 0.97 },
      { t: 174.5, cells: 20.3, hold: w(62.1, -23.0), w: 0.97 },
      { t: 177.8, cells: 22.1, hold: w(62.2, -23.6), w: 0.97 },
      { t: slot.end, cells: 22.8, hold: w(62.3, -23.75), w: 0.97 },
    ]
  },
)
