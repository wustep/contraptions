import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { hash, route, type Way } from '../kit'
import { a, at, BEATS, LOSS, SEAM } from '../music'
import { G } from '../physics'

/**
 * London's clock and ground: the British Open, 1952 (52.455 → 91.016, bars 25 to 43), in the place's own cells (the
 * ball comes in at (-0.5, 0), sitting on the near corner of the semifinal's table).
 *
 * Two match tables side by side down the hall, each under its own pair of lamps, each with Marty's sprung bat clamped
 * to its left end: table A (the semifinal, against Kletzki), and table B (the final, against Endo), with a gap
 * between them where Kletzki stands. Behind them the low barrier, the gallery and the hall.
 *
 *   bar 25    the lamp clicks on; Kletzki knocks his bat on the table; Marty hops into his pan; the toss
 *   26 – 31   the semifinal: bat on the beat, the table on the "a"; Marty's smash on 31.3, Kletzki misses on 31.4
 *   32        the smash's kick carries him over the gap into his pan on table B; the umpire's card; Endo's tap
 *   33 – 40   the final: Endo's soft high loops, three of them lobs a beat long
 *   41.1      LOSS: Endo's dead shot; it dies on Marty's side, his bat swings over it; it trickles off the end
 *   42        on the floorboards, three bounces and a roll to rest; Endo bows; Kay's glove has fallen
 */

export const T0 = SEAM.london
export const T1 = SEAM.hotel

/* ------------------------------------------------------------------ the ground */

export const R = 0.13
/** The tables' top, the floor at the near legs, the floor's far edge (the barrier's foot). */
export const TOP = 0.13
export const FLOOR = 1.43
export const FLOOR_BACK = 1.12
export const NET_H = 0.31
export interface Table {
  x0: number
  x1: number
  net: number
}
export const A: Table = { x0: -0.75, x1: 4.75, net: 2.0 }
export const B: Table = { x0: 8.5, x1: 14.0, net: 11.25 }

/** Marty's sprung bat: its hub on the clamp at the table's left end, the arm, the bat's face off the arm. */
export const ARM = 0.78
export const FACE = 0.2
export const hubOf = (t: Table): Pt => [t.x0 - 0.1, 0.32]
const D = Math.hypot(ARM, FACE)
const FACE_ANG = Math.atan2(FACE, ARM)
/** Where the ball is when the bat meets it, at angle `phi` (degrees, y down) round the hub. */
export const contactAt = (t: Table, phi: number): Pt => {
  const h = hubOf(t)
  const r = (phi * Math.PI) / 180
  return [h[0] + D * Math.cos(r), h[1] + D * Math.sin(r)]
}
/** The arm's angle (radians) when the ball at `phi` is on its face. */
export const armFor = (phi: number): number => (phi * Math.PI) / 180 - FACE_ANG
/** The serving pan, on its lever off the clamp's post: the ball sits in it at this point. */
export const panOf = (t: Table): Pt => [t.x0 - 1.0, -0.43]
export const POST = (t: Table): Pt => [t.x0 - 0.08, -0.27]

/** Where the opponents stand (feet), and their heights. */
export const KLETZKI_X = A.x1 + 1.45
export const KLETZKI_H = 3.35
export const ENDO_X = B.x1 + 1.45
export const ENDO_H = 3.0
/** Kay, in the gallery's front row. */
export const KAY_X = 12.75
/** The umpires' chairs, behind the nets. */
export const UMP_A = A.net
export const UMP_B = B.net
/** The gallery's parapet top: the front row sits behind it. */
export const PARAPET = -0.55

/* ------------------------------------------------------------------ the clock */

/** The lamp over table A clicks on. */
export const LAMP_ON = at(25, 1)
/** Kletzki knocks his bat on the table's end: impatient. */
export const KNOCK = at(25, 2)
/** Marty hops off the corner and lands in his pan; the pan tosses him. */
export const HOP_OFF = at(25, 2)
export const IN_PAN_A = at(25, 3)
export const TOSS_A = at(25, 4)
/** The smash's kick lands him in table B's pan; the umpire flips Marty's card. */
export const IN_PAN_B = at(32, 1)
export const FLIP_A = at(32, 1)
/** Endo taps his sponge on the table: quiet. */
export const ENDO_TAP = at(32, 2)
/** Kletzki lays his bat down on his end of the table, and walks away. */
export const BAT_DOWN = at(32, 3)
export const WALK = [at(32, 3) + 0.25, at(33, 3)] as const
export const TOSS_B = at(32, 4)
/** Kletzki is gone (out of shot) and table A's lamps go down. */
export const KLETZKI_GONE = 75
export const A_DIM: [number, number] = [75, 77]

/** The last point. */
export const DEAD = LOSS
export const DIES = at(41, 2)
export const MISS = a(41, 2)
export const FLIP_B = at(41, 3)
export const OFF_END = at(41, 4)
export const BOW = at(41, 4)
export const GLOVE: [number, number] = [at(41, 3), at(41, 4)]
export const FLOOR_HITS = [at(42, 1), at(42, 2), a(42, 2), at(42, 3)]
export const REST_AT = at(42, 3) + 0.62

/* ------------------------------------------------------------------ the rallies */

export type Who = 'marty' | 'kletzki' | 'endo'
export type Kind = 'serve' | 'drive' | 'smash' | 'lob' | 'dead' | 'miss'
/** A stroke: who, when, where the ball is on the bat, and what kind. Marty's also carries the arm's angle. */
export interface Stroke {
  t: number
  who: Who
  p: Pt
  kind: Kind
  table: Table
  arm?: number
}
/** A bounce on the table (or the floor). */
export interface Bounce {
  t: number
  p: Pt
}

const beatAt = (bar: number, pos: number) => BEATS.find((b) => b.bar === bar && b.pos === pos)!
const beatList = (b0: number, b1: number) => BEATS.filter((b) => b.bar >= b0 && b.bar <= b1)

/** The ball's centre clears the net by this much: the arc a flight needs, at least. */
function clearArc(from: Pt, to: Pt, net: number, min: number): number {
  const s = (net - from[0]) / (to[0] - from[0])
  if (s <= 0 || s >= 1) return min
  const chord = from[1] + s * (to[1] - from[1])
  const want = TOP - NET_H - R - 0.07
  return Math.max(min, (chord - want) / (4 * s * (1 - s)))
}

const ways: Way[] = []
export const STROKES: Stroke[] = []
export const BOUNCES: Bounce[] = []
const push = (w: Way) => ways.push(w)
const lastWay = () => ways[ways.length - 1]

const martyStroke = (table: Table, t: number, phi: number, kind: Kind): Pt => {
  const p = contactAt(table, phi)
  STROKES.push({ t, who: 'marty', p, kind, table, arm: armFor(phi) })
  return p
}

/** A flight to `p` at `t` with the arc it needs (at least `min`), from wherever the ball is. */
function flyTo(t: number, p: Pt, table: Table | null, min: number, extra = 0): void {
  const from = lastWay().p
  const arc = table ? clearArc(from, p, table.net, min) + extra : min
  push({ at: t, p, arc })
}

/* ---- bar 25: on the corner; into the pan; the toss ---- */
push({ at: T0, p: [-0.5, 0] })
push({ at: HOP_OFF, p: [-0.5, 0] })
{
  const T = IN_PAN_A - HOP_OFF
  push({ at: IN_PAN_A, p: panOf(A), arc: (G * T * T) / 8 })
}
push({ at: TOSS_A, p: panOf(A) })

/* ---- the semifinal, bars 26 to 31 ---- */
{
  const bs = beatList(26, 31)
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i]
    const h1 = hash(i, 3, 7)
    const h2 = hash(i, 5, 11)
    const marty = i % 2 === 0
    if (i === bs.length - 1) {
      // Kletzki swings at it and misses: the smash's kick has it over his bat.
      STROKES.push({ t: b.t, who: 'kletzki', p: [A.x1 + 0.45, -0.22], kind: 'miss', table: A })
      break
    }
    let p: Pt
    if (marty) {
      const kind: Kind = i === 0 ? 'serve' : i === bs.length - 2 ? 'smash' : 'drive'
      p = martyStroke(A, b.t, kind === 'smash' ? 256 : 238 + 14 * h1, kind)
    } else {
      p = [A.x1 + 0.42 + 0.18 * h1, -0.32 - 0.26 * h2]
      STROKES.push({ t: b.t, who: 'kletzki', p, kind: 'drive', table: A })
    }
    if (i === 0) {
      // The toss up out of the pan and down onto the bat's face.
      const T = b.t - TOSS_A
      push({ at: b.t, p, arc: (G * T * T) / 8 })
    } else {
      const prev = BOUNCES[BOUNCES.length - 1]
      const T = b.t - prev.t
      push({ at: b.t, p, arc: 0.06 + 0.12 * h2 + (G * T * T) / 16 })
    }
    // Over the net onto the other side, on the "a".
    const ta = a(b.bar, b.pos)
    const smash = i === bs.length - 2
    const bx = marty ? (smash ? A.x0 + 4.55 : A.x0 + 3.55 + 0.95 * h2) : A.x0 + 0.55 + 1.05 * h1
    const bp: Pt = [bx, 0]
    flyTo(ta, bp, A, smash ? 0.12 : marty ? 0.18 : 0.26, smash ? 0.04 : 0.06 + 0.1 * h1)
    BOUNCES.push({ t: ta, p: bp })
  }
}

/* ---- bar 32: the smash's kick over Kletzki and the gap, into table B's pan ---- */
{
  const T = IN_PAN_B - lastWay().at
  push({ at: IN_PAN_B, p: panOf(B), arc: (G * T * T) / 8 })
  push({ at: TOSS_B, p: panOf(B) })
}

/* ---- the final, bars 33 to 40, and Endo's dead shot on bar 41 ---- */
/** Endo's lobs: high and slow, a beat longer than a drive (each turns the rally over a beat). */
export const LOBS = [5, 14, 21]
{
  const bs = [...beatList(33, 40), beatAt(41, 1)]
  let j = 0
  let marty = true
  let first = true
  while (j < bs.length) {
    const b = bs[j]
    const h1 = hash(j, 13, 2)
    const h2 = hash(j, 17, 9)
    const last = j === bs.length - 1
    if (last) {
      if (marty) throw new Error('london: the dead shot must be Endo\'s')
      break
    }
    const lob = !marty && LOBS.includes(j)
    let p: Pt
    if (marty) p = martyStroke(B, b.t, 236 + 16 * h1, first ? 'serve' : 'drive')
    else {
      p = lob ? [B.x1 + 0.72, -0.12] : [B.x1 + 0.45 + 0.2 * h1, -0.36 - 0.22 * h2]
      STROKES.push({ t: b.t, who: 'endo', p, kind: lob ? 'lob' : 'drive', table: B })
    }
    if (first) {
      const T = b.t - TOSS_B
      push({ at: b.t, p, arc: (G * T * T) / 8 })
    } else {
      const prev = BOUNCES[BOUNCES.length - 1]
      const T = b.t - prev.t
      push({ at: b.t, p, arc: 0.06 + 0.12 * h2 + (G * T * T) / 16 })
    }
    first = false
    const nb = lob ? bs[j + 1] : b
    const ta = a(nb.bar, nb.pos)
    const bx = marty ? B.x0 + 3.55 + 0.95 * h2 : lob ? B.x0 + 0.95 + 0.5 * h1 : B.x0 + 0.55 + 1.0 * h1
    const bp: Pt = [bx, 0]
    // Endo's sponge loops them high and soft; his lobs higher.
    flyTo(ta, bp, B, marty ? 0.18 : lob ? 1.25 : 0.42, marty ? 0.05 + 0.08 * h1 : 0.12 + 0.12 * h2)
    BOUNCES.push({ t: ta, p: bp })
    j += lob ? 2 : 1
    marty = !marty
  }
}

/* ---- the last point: the dead shot, the miss, off the end, the floorboards ---- */
export const DEAD_AT: Pt = [B.x1 + 0.55, -0.3]
export const DIE_AT: Pt = [B.x0 + 2.05, 0]
export const SECOND: Pt = [B.x0 + 1.05, 0]
export const EDGE: Pt = [B.x0 - 0.04, 0]
export const REST: Pt = [B.x0 - 2.1, FLOOR - R]
const FLOORS: Pt[] = [
  [B.x0 - 0.9, FLOOR - R],
  [B.x0 - 1.45, FLOOR - R],
  [B.x0 - 1.72, FLOOR - R],
  [B.x0 - 1.86, FLOOR - R],
]
{
  const prev = BOUNCES[BOUNCES.length - 1]
  STROKES.push({ t: DEAD, who: 'endo', p: DEAD_AT, kind: 'dead', table: B })
  push({ at: DEAD, p: DEAD_AT, arc: 0.06 + (G * (DEAD - prev.t) ** 2) / 16 })
  flyTo(DIES, DIE_AT, B, 0.7)
  BOUNCES.push({ t: DIES, p: DIE_AT })
  push({ at: MISS, p: SECOND, arc: 0.07 })
  BOUNCES.push({ t: MISS, p: SECOND })
  // The bat fires at where the ball should have been, and stays up, spent.
  STROKES.push({ t: MISS, who: 'marty', p: contactAt(B, 244), kind: 'miss', table: B, arm: armFor(244) })
  // It trickles to the end, slowing, and goes over.
  const L = SECOND[0] - EDGE[0]
  const v = L / (OFF_END - MISS)
  push({ at: OFF_END, p: EDGE, ramp: [v * 1.25, v * 0.75] })
  // Off the edge it falls, from rest in y: a parabola that leaves level.
  const T = FLOOR_HITS[0] - OFF_END
  const g = (2 * (FLOORS[0][1] - EDGE[1])) / (T * T)
  push({ at: FLOOR_HITS[0], p: FLOORS[0], arc: (g * T * T) / 8 })
  for (let i = 1; i < FLOORS.length; i++) {
    const dt = FLOOR_HITS[i] - FLOOR_HITS[i - 1]
    push({ at: FLOOR_HITS[i], p: FLOORS[i], arc: (G * dt * dt) / 8 })
  }
  const vr = (FLOORS[3][0] - FLOORS[2][0]) / (FLOOR_HITS[3] - FLOOR_HITS[2])
  push({ at: REST_AT, p: REST, ramp: [Math.abs(vr), 0] })
  push({ at: T1, p: REST })
}

export const SEGS: Seg[] = route(ways)
// Ramps want their duration to be the length over the mean speed: set the speeds so they are.
for (const s of SEGS) {
  if (!s.ramp) continue
  const len = Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1])
  const mean = len / s.dur
  const [v0, v1] = s.ramp
  const f = (2 * mean) / (v0 + v1)
  s.ramp = [v0 * f, v1 * f]
}
export const EXIT: Pt = [REST[0] + 0.5, REST[1]]

export const ballAt = (t: number): Pt => {
  const q = laneAt({ segs: SEGS, fire: 0 }, t - T0)
  return [q.x, q.y]
}

/* ------------------------------------------------------------------ strikes */

export const LONDON_STRIKES: number[] = [
  LAMP_ON,
  KNOCK,
  IN_PAN_A,
  TOSS_A,
  ...STROKES.map((s) => s.t),
  ...BOUNCES.map((b) => b.t),
  IN_PAN_B,
  ENDO_TAP,
  BAT_DOWN,
  TOSS_B,
  FLIP_B,
  BOW,
  ...FLOOR_HITS,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((x, y) => x - y)
