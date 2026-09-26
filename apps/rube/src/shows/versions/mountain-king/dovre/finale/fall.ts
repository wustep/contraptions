import type p5 from 'p5'
import { laneAt, mixHex, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, lastOf, part, smooth, type PartShot } from '../kit'
import { CODA, LAST1, LAST2 } from '../music'
import { dawn, REST, skyline, surface } from '../mountain'
import { quake } from '../rock'
import { CODA_SHOT } from '../seams'
import { drawTroll, type Pen, type TrollLook } from '../troll'
import { SKY, STONE, WORKS } from '../worlds'
import { DRUM2, DRUMMERS, farEdge, FLOOR, LEAP } from '../under/drum-clock'
import { breach, capCracks, collar, collarFront, dropped, G, hollowOf, puff, stone, thrown, vent, VENT, type Floor, type Stone } from './fall-rock'
import { column, crown, plume } from './fall-water'

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
const G_FLIGHT = 4.4
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
]

/* ------------------------------------------------------------------ the cap, blown out */

/**
 * A block of the summit's cap: blown out of it at t0 from `from` (world), it lands on a flank at x1 on t1 (a measured
 * onset of the ringing chord), and tumbles on down the flank over its corners, `roll` cells further (signed: west is
 * negative), slowing, until it comes to lie on a flat face at t1 + `dur`. Only its landing strikes.
 */
interface Tumble {
  from: Pt
  t0: number
  x1: number
  t1: number
  size: number
  seed: number
  roll: number
  dur: number
}

/** A block's outline in its own frame: a rough slab of 6 or 7 corners, `size` across, broader than it is tall. */
function slabOf(seed: number, size: number): Pt[] {
  const n = 6 + Math.floor(hash(seed, 171) * 2)
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.45 * (hash(seed, i, 172) - 0.5)
    const r = size * (0.34 + 0.18 * hash(seed, i, 173))
    pts.push([Math.cos(a) * r * 1.12, Math.sin(a) * r * 0.78])
  }
  return pts
}

const turn = (pts: Pt[], a: number): Pt[] => pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)])

/** Where the block's middle sits (world y) at world x turned to `a`: its lowest corner on the ground, corner by corner. */
function seat(pts: Pt[], x: number, a: number): number {
  let y = Infinity
  for (const [vx, vy] of turn(pts, a)) y = Math.min(y, skyline(x + vx) - vy)
  return y
}

interface Laid extends Tumble {
  pts: Pt[]
  /** Its angle as it lands, and the angle it comes to lie at (a flat face down, turned the way it rolls). */
  a1: number
  a2: number
  /** Where it lands (world y of its middle). */
  y1: number
  spin: number
}

function lay(b: Tumble): Laid {
  const pts = slabOf(b.seed, b.size)
  const dir = Math.sign(b.roll) || 1
  const spin = (dir * (2.2 + 2.5 * hash(b.seed, 174))) / Math.sqrt(b.size)
  const a1 = hash(b.seed, 175) * Math.PI + spin * (b.t1 - b.t0)
  // Rolling over its corners it turns about as far as it goes over its half-width; it stops on the flattest face near
  // there (the one that sits lowest), still turning the way it rolls.
  const want = a1 + b.roll / (0.42 * b.size)
  const x2 = b.x1 + b.roll
  let a2 = want
  let best = Infinity
  for (let a = want - 1.1; a <= want + 1.1; a += 0.01) {
    if ((a - a1) * dir < 0.3) continue
    const h = skyline(x2) - seat(pts, x2, a)
    if (h < best) {
      best = h
      a2 = a
    }
  }
  return { ...b, pts, a1, a2, y1: seat(pts, b.x1, a1), spin }
}

/** How far along its roll a block is (0..1 of the distance), slowing to a stop: a long, damped recovery. */
function rolled(b: Laid, T: number): number {
  const u = Math.max(0, Math.min(1, (T - b.t1) / b.dur))
  return 1 - Math.pow(1 - u, 2.4)
}

/** A block at show time T: its middle (world) and its angle; null before it is blown out. */
function blockAt(b: Laid, T: number): { at: Pt; angle: number } | null {
  if (T < b.t0) return null
  if (T <= b.t1) {
    const dur = b.t1 - b.t0
    const u = T - b.t0
    const vx = (b.x1 - b.from[0]) / dur
    const vy = (b.y1 - b.from[1] - 0.5 * G * dur * dur) / dur
    return { at: [b.from[0] + vx * u, b.from[1] + vy * u + 0.5 * G * u * u], angle: b.a1 - b.spin * (b.t1 - T) }
  }
  const r = rolled(b, T)
  const angle = b.a1 + (b.a2 - b.a1) * r
  const x = b.x1 + b.roll * r
  return { at: [x, seat(b.pts, x, angle)], angle }
}

/** Under the cap (world y), where the blocks start. */
const CAP_Y = -20.4
/**
 * The cap's blocks. The first chord blows them up and out both sides of the summit; the second chord's surge throws
 * the torn rim after them. They come down on the flanks as the chord rings (each on a measured onset) and tumble on
 * down: the west flank is the steeper, so they go further there; on the east they stop short of the shoulder where
 * he will land.
 */
const TUMBLES: Laid[] = (
  [
    { from: [47.0, CAP_Y], t0: LAST1, x1: 44.6, t1: 150.263, size: 0.72, seed: 21, roll: -3.1, dur: 1.9 },
    { from: [48.2, CAP_Y], t0: LAST1, x1: 50.7, t1: 150.42, size: 0.62, seed: 22, roll: 1.5, dur: 1.5 },
    { from: [47.4, CAP_Y - 0.2], t0: LAST1, x1: 45.4, t1: 150.543, size: 0.46, seed: 23, roll: -2.3, dur: 1.5 },
    { from: [46.6, CAP_Y + 0.1], t0: LAST1, x1: 42.3, t1: 150.995, size: 0.98, seed: 24, roll: -4.6, dur: 2.6 },
    { from: [48.0, CAP_Y - 0.1], t0: LAST1, x1: 51.3, t1: 150.995, size: 0.42, seed: 25, roll: 1.1, dur: 1.2 },
    { from: [48.6, CAP_Y + 0.1], t0: LAST1, x1: 52.5, t1: 151.248, size: 0.84, seed: 26, roll: 1.7, dur: 2.0 },
    { from: [47.1, CAP_Y - 0.2], t0: LAST1, x1: 43.4, t1: 151.328, size: 0.56, seed: 27, roll: -3.2, dur: 2.0 },
    // The surge throws the torn rim after them.
    { from: [46.2, -20.6], t0: LAST2, x1: 44.9, t1: 150.42, size: 0.36, seed: 28, roll: -1.6, dur: 1.2 },
    { from: [49.0, -20.8], t0: LAST2, x1: 50.0, t1: 150.263, size: 0.34, seed: 29, roll: 0.8, dur: 1.0 },
  ] as Tumble[]
).map(lay)

/** Draw a block of the cap at T, lit by the dawn, and its dust where it lands and where it lies down. */
function drawBlock(p: p5, c: Pen, b: Laid, T: number, q: Pt, lit: number): void {
  const where = blockAt(b, T)
  if (!where) return
  const { k, ink, weight } = c
  const landed = T > b.t1
  const qq: Pt = landed ? q : [0, 0]
  const x = lx(where.at[0]) + qq[0]
  const y = ly(where.at[1]) + qq[1]
  if (landed) {
    puff(p, c, lx(b.x1) + q[0], ly(skyline(b.x1)) + q[1], T - b.t1, b.size * 1.3, lit)
    const x2 = b.x1 + b.roll
    puff(p, c, lx(x2) + q[0], ly(skyline(x2)) + q[1], T - b.t1 - b.dur * 0.55, b.size * 0.8, lit)
  }
  const face = mixHex(STONE.dark, STONE.mid, 0.35 + 0.65 * lit)
  const top = mixHex(STONE.mid, STONE.light, 0.3 + 0.7 * lit)
  const pts = turn(b.pts, where.angle)
  p.push()
  p.translate(x * k, y * k)
  p.stroke(mixHex(ink, STONE.deep, 0.55))
  p.strokeWeight(weight * 0.7)
  p.fill(face)
  p.beginShape()
  for (const [a, v] of pts) p.vertex(a * k, v * k)
  p.endShape(p.CLOSE)
  // Its lit top: the facet the sky sees, whichever way it has turned.
  p.noStroke()
  p.fill(top)
  p.beginShape()
  for (const [a, v] of pts) if (v < 0.06 * b.size) p.vertex(a * 0.78 * k, (v * 0.78 - 0.03 * b.size) * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/* ------------------------------------------------------------------ the vent plugged */

/**
 * After the blow-out the crater's torn rim falls back into the vent's throat: a jumble of blocks wedged in its top,
 * dropping in after the geyser has gone (on no strike: the chords have rung), so nothing straight-walled is left
 * open under the crater through the credits.
 */
function plug(p: p5, c: Pen, T: number, q: Pt): void {
  const { k, ink, weight } = c
  const d = dawn(T)
  // One mass of broken rock settling into the throat from the crater's lip, jagged across its top, its blocks' seams
  // showing as dark cracks: not a stack of stones.
  const at = 151.05
  if (T < at - 0.55) return
  const u = Math.min(1, Math.max(0, (T - (at - 0.55)) / 0.55))
  const drop = 1.6 * (1 - u * u)
  const X = (x: number) => (lx(x) + q[0]) * k
  const Y = (y: number) => (ly(y + 0 - drop) + q[1]) * k
  const top: Pt[] = [[46.6, -19.1], [46.95, -19.55], [47.25, -19.3], [47.6, -19.75], [47.95, -19.4], [48.2, -19.6], [48.45, -19.05]]
  const pts: Pt[] = [...top, [48.4, -18.2], [48.1, -17.5], [47.5, -17.2], [46.9, -17.5], [46.65, -18.2]]
  p.push()
  p.stroke(mixHex(ink, STONE.deep, 0.65))
  p.strokeWeight(weight * 0.6)
  p.fill(mixHex(STONE.deep, STONE.dark, 0.7 + 0.3 * d))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(x), Y(y))
  p.endShape(p.CLOSE)
  // Its top catches the day.
  p.noStroke()
  p.fill(mixHex(STONE.dark, STONE.mid, 0.3 + 0.5 * d))
  p.beginShape()
  for (const [x, y] of top) p.vertex(X(x), Y(y))
  for (let i = top.length - 1; i >= 0; i--) p.vertex(X(top[i][0]), Y(top[i][1] + 0.12))
  p.endShape(p.CLOSE)
  // The seams between its blocks.
  p.stroke(mixHex(STONE.deep, '#000000', 0.2))
  p.strokeWeight(weight * 0.7)
  p.noFill()
  for (const seam of [[[47.25, -19.3], [47.1, -18.6], [47.4, -17.9]], [[47.95, -19.4], [48.05, -18.7], [47.8, -18.1]], [[47.1, -18.6], [47.75, -18.45], [48.05, -18.7]]] as Pt[][]) {
    p.beginShape()
    for (const [x, y] of seam) p.vertex(X(x), Y(y))
    p.endShape()
  }
  p.pop()
}

/* ------------------------------------------------------------------ the trolls flee */

/**
 * Ibsen: the bells ring, the trolls flee shrieking. Each room's flight is on a chord while the camera is in that room
 * (the heart's crew, `heart-trolls.ts`; the court, `hall-court.ts`); these are the ones in the drum room and the mine
 * as he comes up through them. Frozen by the bells, looking up, until their chord; then away, out of the frame.
 */
interface Runner {
  /** Where its feet are (world) while it stands frozen, from `seen` (the drum's are drawn by the drum part till then). */
  at: Pt
  seen: number
  /** The chord it bolts on. */
  go: number
  /** A leap first (off a drum's rim): where its feet come down (world), and when. */
  land?: Pt
  landAt?: number
  /** Then along the floor this way, cells/s. */
  dir: 1 | -1
  speed: number
  size: number
  seed: number
  lit: number
  /** Its clubs, dropped where it stood (the drummers'): they fall onto the skin, world y. */
  clubs?: number
}

/** The war-drum's rim under a drummer's feet, world y (the drum part's frame is world (46, 25)). */
const rimAt = (x: number): number => 25 + farEdge(DRUM2, x)

const RUNNERS: Runner[] = [
  // The war-drum's pair: the west one, beside the burst, leaps on it, east over its drum and away; the east one on the
  // next chord. Their clubs drop on the skin.
  ...DRUMMERS.filter((d) => d.drum === 2 && LEAP[d.seed] !== undefined).map((d, i): Runner => ({
    at: [46 + d.x, rimAt(d.x)],
    seen: LEAP[d.seed],
    go: LEAP[d.seed],
    land: [46 + DRUM2.cx + DRUM2.rx + 0.9 + 0.6 * i, 25 + FLOOR],
    landAt: LEAP[d.seed] + (i === 0 ? 0.62 : 0.5),
    dir: 1,
    speed: 4.2,
    size: d.size,
    seed: d.seed,
    lit: 0.72,
    clubs: 25 + DRUM2.skin,
  })),
  // Two miners in the gallery, frozen under the timbers: one bolts east as the floor cracks beside him, the other,
  // further on, as it bursts (west is the shaft down to the drum).
  { at: [49.7, 17.97], seen: 136.4, go: 138.598, dir: 1, speed: 4.2, size: 1.55, seed: 41, lit: 0.62 },
  { at: [53.5, 17.97], seen: 136.4, go: 139.072, dir: 1, speed: 4.0, size: 1.75, seed: 42, lit: 0.62 },
]

/** A runner at T: its feet (world), its pose; null when it is not to be drawn. */
function runnerAt(r: Runner, T: number): { at: Pt; look: TrollLook } | null {
  if (T < r.seen) return null
  // Frozen, head back, looking up at the vault.
  if (T < r.go) return { at: r.at, look: { size: r.size, seed: r.seed, pose: 'stand', face: 0, slump: -0.35, eyes: 1.5, mouth: 0.35, arms: 0.25, lit: r.lit } }
  let x: number
  let y: number
  let air = 0
  let t0 = r.go
  let x0 = r.at[0]
  let y0 = r.at[1]
  if (r.land && r.landAt) {
    const T1 = r.landAt - r.go
    if (T < r.landAt) {
      // The leap: a crouch into it, then a bound east over the drum, arms flung up.
      const u = (T - r.go) / T1
      const lift = 0.9
      x = r.at[0] + (r.land[0] - r.at[0]) * u
      y = r.at[1] + (r.land[1] - r.at[1]) * u - lift * 4 * u * (1 - u)
      air = Math.sin(Math.PI * u)
      return { at: [x, y], look: { size: r.size, seed: r.seed, pose: 'run', phase: 0.25, face: r.dir, eyes: 1.5, mouth: 0.8, arms: 0.35 + 0.5 * air, lit: r.lit } }
    }
    t0 = r.landAt
    x0 = r.land[0]
    y0 = r.land[1]
  }
  // Away along the floor, gathering speed from where it came down (or stood).
  const run = T - t0
  const lead = r.land ? 0.1 : 0.3
  const dist = r.speed * (run - lead * (1 - Math.exp(-run / lead)))
  x = x0 + r.dir * dist
  y = y0
  // The knees give as it comes down from the leap.
  const give = r.land ? 0.06 * r.size * Math.exp(-run / 0.12) * Math.min(1, run / 0.03) : 0
  return { at: [x, y + give], look: { size: r.size, seed: r.seed, pose: 'run', phase: dist / (0.55 * r.size), face: r.dir, eyes: 1.5, mouth: 0.75, arms: 0.3 * Math.exp(-run / 0.6), slump: -0.1, lit: r.lit } }
}

/** A dropped club lying on the skin (after falling from the fist onto it): dark timber, thick at the head. */
function droppedClub(p: p5, c: Pen, x: number, y0: number, skin: number, T: number, t0: number, side: number, q: Pt): void {
  if (T < t0) return
  const k = c.k
  const fallT = 0.26
  const u = Math.min(1, (T - t0) / fallT)
  const y = y0 + (skin - y0) * u * u
  // Turning as it falls, lying along the skin once down, with a small bounce.
  const lie = side * (0.12 + 0.04 * side)
  const a = (1 - u) * (-side * 1.2) + u * lie + (u >= 1 ? 0.05 * Math.exp(-(T - t0 - fallT) / 0.08) * Math.sin((T - t0 - fallT) * 40) : 0)
  const len = 0.5
  const pts: Pt[] = [
    [-len / 2, -0.02],
    [len * 0.3, -0.045],
    [len / 2, -0.03],
    [len / 2, 0.03],
    [len * 0.3, 0.045],
    [-len / 2, 0.02],
  ]
  p.push()
  p.translate((lx(x) + q[0]) * k, (ly(y) - 0.04 + q[1]) * k)
  p.rotate(a)
  p.stroke(mixHex(STONE.deep, c.ink, 0.7))
  p.strokeWeight(c.weight * 0.8)
  p.fill(mixHex(WORKS.wood, STONE.deep, 0.25))
  p.beginShape()
  for (const [u2, v] of pts) p.vertex(u2 * k, v * k)
  p.endShape(p.CLOSE)
  p.pop()
}

function drawRunners(p: p5, c: Pen, T: number, q: Pt, f: { x0: number; x1: number; y0: number; y1: number }): void {
  for (const r of RUNNERS) {
    if (r.clubs !== undefined) {
      droppedClub(p, c, r.at[0] - 0.35, r.at[1] - r.size * 0.55, r.clubs, T, r.go, -1, q)
      droppedClub(p, c, r.at[0] + 0.3, r.at[1] - r.size * 0.6, r.clubs, T, r.go + 0.04, 1, q)
    }
    const w = runnerAt(r, T)
    if (!w) continue
    const x = lx(w.at[0]) + q[0]
    const y = ly(w.at[1]) + q[1]
    // Gone once it is out of the frame (it never comes back).
    if (x < f.x0 - 3 || x > f.x1 + 3) continue
    drawTroll(p, c, x, y, { ...w.look, noTail: false })
  }
}

/* ------------------------------------------------------------------ the flanks cracking */

/**
 * The cracks the last chords open along the skyline: from the crater's rim down each flank, a little under the
 * surface, jagged, with a branch or two down into the rock. The first chord opens the west one, the second runs it on
 * and opens the east; the dawn and the geyser's glare show through them as they open, then they go dark.
 */
const FLANKS = [
  { from: 46.05, to: 39.6, at: LAST1, more: LAST2, seed: 31 },
  { from: 49.0, to: 54.2, at: LAST2, more: LAST2, seed: 32 },
]

function flankCracks(p: p5, c: Pen, T: number, q: Pt): void {
  const k = c.k
  const X = (v: number) => (lx(v) + q[0]) * k
  const Y = (v: number) => (ly(v) + q[1]) * k
  p.push()
  p.noStroke()
  for (const fl of FLANKS) {
    if (T < fl.at) continue
    // How far it has run (0..1 of its length): half on the chord that opens it, the rest on the next.
    const first = fl.at === fl.more ? 1 : 0.55
    const run = first * smooth(T, fl.at, fl.at + 0.22) + (1 - first) * smooth(T, fl.more, fl.more + 0.3)
    if (run <= 0.01) continue
    const glow = Math.max(0, 1 - (T - fl.at) / 3.2) * (0.45 + 0.55 * Math.exp(-(T - fl.at) / 0.5))
    // Its knots are fixed in the rock along its whole length (a zigzag stepping in and out, never a line drawn along
    // the skyline); it runs out along them, so it never bunches up while it is short.
    const n = 12
    const knots: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const u = (i + 0.35 * (hash(fl.seed, i, 183) - 0.5) * (i > 0 && i < n ? 1 : 0)) / n
      const x = fl.from + (fl.to - fl.from) * u
      const under = 0.3 + 0.45 * u + (i % 2 ? 0.16 : -0.1) * (0.6 + 0.8 * hash(fl.seed, i, 181)) * (i > 0 ? 1 : 0)
      knots.push([x, skyline(x) + under])
    }
    const tip = run * n
    const pts: Pt[] = knots.slice(0, Math.floor(tip) + 1)
    if (tip < n && tip > Math.floor(tip)) {
      const [x0, y0] = knots[Math.floor(tip)]
      const [x1, y1] = knots[Math.floor(tip) + 1]
      const f = tip - Math.floor(tip)
      pts.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f])
    }
    if (pts.length < 2) continue
    // Widest at the rim, closing to nothing at its tip; wider as it opens. Once its light is out it is only a dark
    // seam, and fades into the rock.
    const width = (i: number) => (0.085 + 0.025 * smooth(T, fl.at, fl.at + 1)) * Math.pow(Math.max(0, 1 - i / Math.max(tip, 1e-3)), 0.8)
    const lit = Math.min(1, glow)
    const seam = 1 - 0.8 * smooth(T, fl.at + 2.2, fl.at + 5)
    p.fill(alpha(p, mixHex(hollowOf(0), mixHex(SKY.dawn, SKY.sun, 0.4), lit), Math.max(lit, seam)))
    p.beginShape()
    pts.forEach(([x, y], i) => p.vertex(X(x), Y(y - width(i) / 2)))
    for (let i = pts.length - 1; i >= 0; i--) p.vertex(X(pts[i][0]), Y(pts[i][1] + width(i) / 2))
    p.endShape(p.CLOSE)
    // Branches down into the rock from two of its knots.
    const s = Math.sign(fl.to - fl.from)
    for (const j of [3, 7]) {
      if (j >= pts.length - 1) continue
      const [bx, by] = pts[j]
      // It grows as the crack runs on past it.
      const len = (0.5 + 0.4 * hash(fl.seed, j, 182)) * Math.min(1, (tip - j) / 2.5)
      const w = width(j) * 0.6
      p.triangle(X(bx - w), Y(by), X(bx + w), Y(by), X(bx + s * len * 0.45), Y(by + len))
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the dawn bursting through */

const rgb = (hex: string): string => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')

/** 0..1: the light up through the crater, a burst on each of the last two chords, dying back into the dawn. */
function burstAt(T: number): number {
  let a = 0
  if (T >= LAST1) a += smooth(T, LAST1, LAST1 + 0.05) * Math.exp(-(T - LAST1) / 0.7)
  if (T >= LAST2) a += 0.75 * smooth(T, LAST2, LAST2 + 0.05) * Math.exp(-(T - LAST2) / 0.9)
  return Math.min(1, a)
}

/**
 * The light that comes up out of the crater as the cap goes: a fan of warm light up through the hole, widening as it
 * rises, and a warm wash over the sky round the summit. Only above the mountain's surface (clipped to the sky), and
 * soft (light is the one gradient allowed): a burst, not a ring.
 */
function dawnBurst(p: p5, c: Pen, T: number, f: { x0: number; x1: number; y0: number }): void {
  const a = burstAt(T)
  if (a <= 0.005) return
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X0 = f.x0 - 1
  const X1 = f.x1 + 1
  const top = f.y0 - 1
  const step = Math.max(0.2, (X1 - X0) / 160)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(X0 * k, top * k)
  for (let x = X0; x <= X1 + step; x += step) ctx.lineTo(x * k, ly(surface(Math.min(x, X1) + ORIGIN[0], T)) * k)
  ctx.lineTo(X1 * k, top * k)
  ctx.closePath()
  ctx.clip()
  const cx = lx(COL)
  const floor = ly(surface(COL, T))
  const sun = rgb(SKY.sun)
  const warm = rgb(SKY.dawn)
  // The wash: the sky round the summit warmed from the crater.
  const R0 = 9
  const wash = ctx.createRadialGradient(cx * k, floor * k, 0, cx * k, floor * k, R0 * k)
  wash.addColorStop(0, `rgba(${sun},${0.26 * a})`)
  wash.addColorStop(0.35, `rgba(${warm},${0.16 * a})`)
  wash.addColorStop(1, `rgba(${warm},0)`)
  ctx.fillStyle = wash
  ctx.fillRect((cx - R0) * k, (floor - R0) * k, 2 * R0 * k, 2 * R0 * k)
  // The fan: straight up out of the crater, widening as it rises; laid as thin wedges one inside the next, so it is
  // brightest in its middle and its edges are soft (a shaft of light, not a spotlight's cone).
  const H = 13
  const layers = 7
  for (let i = 0; i < layers; i++) {
    const v = (i + 1) / layers
    const base = 0.35 + 0.95 * v
    const spread = 0.9 + 3.6 * v
    const strength = 0.62 / layers
    const g = ctx.createLinearGradient(0, floor * k, 0, (floor - H) * k)
    g.addColorStop(0, `rgba(${sun},${strength * a})`)
    g.addColorStop(0.4, `rgba(${warm},${strength * 0.5 * a})`)
    g.addColorStop(1, `rgba(${warm},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((cx - base) * k, (floor + 0.4) * k)
    ctx.lineTo((cx + base) * k, (floor + 0.4) * k)
    ctx.lineTo((cx + spread) * k, (floor - H) * k)
    ctx.lineTo((cx - spread) * k, (floor - H) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the strikes */

const LEGS = RISE.slice(1).map((b, i) => ({ a: RISE[i], b }))
/** When the geyser kicks him up: the start of every leg that rises and is not carried on from the one before. */
const KICKS = LEGS.filter(({ a, b }) => b.v0 === undefined && a.y - b.y > 0.05).map(({ a }) => a.at)
/** When a ceiling stops him dead: the end of every rising leg that ends at rest. */
const STOPS = LEGS.filter(({ a, b }) => b.v1 === 0 && a.y - b.y > 0.05).map(({ b }) => b.at)

/** Every strike of the finale: his landing in the collar, the kicks and the stops, the throw, each stone's landing, the cap's cracks, the arc's two touches. */
export const FALL_HITS: number[] = (() => {
  const all = [CODA, ...KICKS, ...STOPS, LAST2, ...STONES.map((s) => s.t1), ...TUMBLES.map((b) => b.t1), ...CAP_CRACKS, LAND.t, BOUNCE.t].sort((a, b) => a - b)
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
 * The geyser once he has left it (world y of its top), and how big its head still is: the second chord's surge
 * drives it straight up, out of the top of the wide frame, and holds it there (the water's own burst, in
 * `fall-water.ts`, climbs on over this top, falls back and is gone by the credits); later it sinks to a burble in the
 * crater and goes down into the vent.
 */
/** The plume's top at the height of the second chord's surge (world y): at the top edge of the wide frame over the summit. */
const SURGE = -30.5

function plumeAt(T: number): { top: number } {
  const floor = skyline(COL) + 1.96
  // The surge: fast off his top at LAST2 (he is thrown off it east), easing into its height in about half a second.
  const u = T - LAST2
  const surge = 1 - Math.pow(1 - Math.min(1, Math.max(0, u) / 0.55), 2.2)
  const high = -22.6 + (SURGE + 22.6) * surge + 0.2 * Math.sin(u * 2.1) * smooth(T, LAST2 + 0.4, LAST2 + 1.2)
  const sink = smooth(T, LAST2 + 1.5, LAST2 + 4.6)
  const gone = smooth(T, LAST2 + 6, LAST2 + 9.5)
  const burble = floor - 0.6 + 0.1 * Math.sin(T * 3.1)
  const top = high * (1 - sink) + burble * sink
  // Then the water drains back down the vent, gathering speed, out of every frame.
  const drain = Math.max(0, T - (LAST2 + 9.5))
  const low = floor + 1.2 + (3 * drain * drain) / (drain + 1.2)
  return { top: top * (1 - gone) + low * gone }
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
  // Before the coda there is no vent: the summit is solid rock over the hall's smoke hole (the opening wide sees it).
  // After the blow-out the day comes down it only while the geyser is up; then the crater's rubble plugs its top.
  const inVent = smooth(T, 142.6, 145.0) * (1 - 0.8 * smooth(T, LAST2 + 8, LAST2 + 16))
  if (T >= CODA) vent(p, c, ORIGIN, COL, q, { wet: inVent, day: T >= LAST1 ? smooth(T, LAST1, LAST1 + 0.6) * (1 - smooth(T, LAST2 + 0.9, LAST2 + 2.6)) : 0.25 * smooth(T, CAP_CRACKS[0], LAST1), shut: smooth(T, LAST2 + 1.2, LAST2 + 4) })
  if (T >= LAST2) plug(p, c, T, q)
  for (const fl of FLOORS) breach(p, c, ORIGIN, COL, fl, T, q)
  collar(p, c, ORIGIN, COL, 33.13, q)
  capCracks(p, c, ORIGIN, COL, T, q, CAP_CRACKS, LAST1, (x) => skyline(x))

  // The last chords: the dawn bursting up through the crater, the flanks cracking along the skyline.
  if (T >= LAST1) {
    dawnBurst(p, c, T, f)
    flankCracks(p, c, T, q)
  }

  // The trolls in the drum room and the mine, fleeing on the chords as he comes up through their floors.
  if (T < 142) drawRunners(p, c, T, q, f)

  // What comes down, and what is thrown up.
  for (const st of STONES) stone(p, c, ORIGIN, st, T, q, 0.55)
  for (const b of TUMBLES) drawBlock(p, c, b, T, q, 0.35 + 0.55 * d)

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
      plume(p, c, X, ly(surface(COL, T)), ly(plumeAt(T).top), T, d, (x) => ly(surface(x + ORIGIN[0], T)))
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
      // The machine broken over him, wide (the runaway's last keys hold the same): he drops into the collar low in it.
      { t: slot.begin, cells: CODA_SHOT.cells, hold: w(CODA_SHOT.world[0], CODA_SHOT.world[1]), w: CODA_SHOT.w },
      // One slow push in on the corked collar while the heart's crew bolt for its doors on the pickup and the crash;
      // held on him until the crash, then one eased tilt up as it blows him out.
      { t: 135.146, cells: 8.3, hold: w(48.7, 31.5), w: 0.85 },
      { t: 135.411, cells: 7.9, hold: w(47.9, 31.5), w: 0.75 },
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
      // Up the dark vent after him through the silence, already opening out, so that by the roll the frame holds the
      // summit whole, both flanks falling away from it and the sky over it: the cap blows out in a wide shot.
      { t: 147.45, cells: 15.4, off: [0, -2.4] },
      { t: 148.243, cells: 17.6, hold: w(48.3, -20.3), w: 0.9 },
      { t: LAST1, cells: 18.6, hold: w(48.6, -21.0), w: 0.95 },
      { t: LAST2, cells: 19.1, hold: w(49.3, -21.5), w: 0.92 },
      // The plume surges out of the top of the frame; he is thrown across it east, the blocks tumbling down both flanks.
      { t: 150.6, cells: 19.7, hold: w(51.3, -22.2), w: 0.82 },
      { t: 151.8, cells: 19.9, hold: w(53.3, -22.4), w: 0.76 },
      { t: 153.2, cells: 16.2, hold: w(56.3, -21.0), w: 0.62 },
      // In to him at rest in the hollow, the church in the valley: then one long crane back over the credits, from
      // the hollow to the whole mountain in cross-section at dawn, every place he lit on his way down still lit, the
      // broken hall dark, the chimney he came up: the lighting rule's payoff. (He stays in the frame under Zoom.)
      { t: 156, cells: 12.6, hold: w(61, -19.9), w: 0.9 },
      { t: 161, cells: 15.5, hold: w(60.6, -19.6), w: 0.95 },
      // (The summit kept a fifth of the way down the frame, under the cards, which sit on the sky over it.)
      { t: 166, cells: 24, hold: w(57, -15.5), w: 0.97 },
      { t: 171, cells: 40, hold: w(51, -12), w: 0.98 },
      { t: 175.5, cells: 60, hold: w(47, -3), w: 0.99 },
      { t: slot.end, cells: 72, hold: w(46, 1.0), w: 1 },
    ]
  },
)
