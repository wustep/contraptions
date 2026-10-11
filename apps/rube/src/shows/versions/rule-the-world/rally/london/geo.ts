import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { carried, route, smooth, type Way } from '../kit'
import { a, at, LOSS, SEAM } from '../music'
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
 *   26 – 31   the semifinal, one long rally: bat on the beat, the table on the "a". Kletzki attacks from in close,
 *             flat and hard, and smashes off each of Marty's loops; Marty blocks, drives deeper and flatter, and when
 *             a stretched Kletzki floats one up, smashes it on 31.3; Kletzki misses on 31.4
 *   32        the smash's kick carries him over the gap into his pan on table B; the umpire's card; Endo's tap
 *   33 – 36   the final's first point, Marty's: Endo loops and lobs, Marty smashes on 34.4 past Endo's lunge; the
 *             umpire turns Marty's card level; Endo catches the ball on his bat and pats it back to the pan
 *   37 – 40   the last point: Endo backs off the table and lobs, from deeper each time, and Marty smashes each one;
 *             then Endo comes running back in
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

/**
 * The final's first point, Marty's: his smash (34.4) goes by Endo's lunge (35.1) and twice off the floorboards; the
 * umpire turns Marty's card level (35.3); Endo, turned round, catches it on his bat (35.4), carries it back, and pats
 * it over the net (36.1), a bounce, into Marty's pan (36.3), which tosses him for the last point (36.4).
 */
export const WINNER = at(34, 4)
export const LUNGE = at(35, 1)
export const OUT = [at(35, 2), at(35, 3)]
export const CATCH = at(35, 4)
export const FEED = at(36, 1)
export const FEED_BOUNCE = at(36, 2)
export const IN_PAN_B2 = at(36, 3)
export const TOSS_B2 = at(36, 4)
export const FLIP_M = at(35, 3)

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
export type Kind = 'serve' | 'drive' | 'loop' | 'block' | 'smash' | 'lob' | 'dead' | 'miss' | 'catch' | 'feed'
/**
 * A stroke: who, when, where the ball is on the bat, what kind, and how hard (0 to 1: what the contact's pop and the
 * crowd go by). Marty's also carries the arm's angle.
 */
export interface Stroke {
  t: number
  who: Who
  p: Pt
  kind: Kind
  table: Table
  power: number
  arm?: number
}
/** A bounce on the table (or the floor), and how hard it lands. */
export interface Bounce {
  t: number
  p: Pt
  power: number
  floor?: boolean
}

const POWER: Record<Kind, number> = { serve: 0.3, drive: 0.55, loop: 0.4, block: 0.35, smash: 1, lob: 0.3, dead: 0.12, miss: 0, catch: 0.05, feed: 0.15 }

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
const stroke = (s: Omit<Stroke, 'power'> & { power?: number }) => STROKES.push({ ...s, power: s.power ?? POWER[s.kind] })

/** A flight to `p` at `t` with the arc it needs (at least `min`), from wherever the ball is. */
function flyTo(t: number, p: Pt, table: Table | null, min: number): void {
  const from = lastWay().p
  push({ at: t, p, arc: table ? clearArc(from, p, table.net, min) : min })
}
/** A flight from where the ball is to `p` at `t` under gravity, scaled (`k` under 1 for a tired bounce). */
function hopTo(t: number, p: Pt, k = 1): void {
  const T = t - lastWay().at
  push({ at: t, p, arc: (k * G * T * T) / 8 })
}

/**
 * A shot: who plays it, on which beat, how, from where (an opponent's bat; Marty's from the angle `phi` his arm meets
 * it at), and where it lands on the other side (`land`, at `bt`: the beat's "a", or the next beat's for a lob), over
 * the net with at least `arc` of lift: low and flat for a drive or a smash, high for a loop, higher for a lob.
 */
interface Shot {
  who: Who
  t: number
  kind: Kind
  p?: Pt
  phi?: number
  land: number
  bt: number
  arc: number
}

/** Play a run of shots on a table, the first off the pan's toss (or off the bounce the last flight ended on). */
function play(table: Table, shots: Shot[], fromPan: boolean): void {
  shots.forEach((s, k) => {
    const p: Pt = s.who === 'marty' ? contactAt(table, s.phi!) : s.p!
    stroke({ t: s.t, who: s.who, p, kind: s.kind, table, ...(s.who === 'marty' ? { arm: armFor(s.phi!) } : {}) })
    const T = s.t - lastWay().at
    // Off the toss, a plain throw; off a bounce, up off the table onto the bat (a lob's bounce kicks higher).
    const lobbed = k > 0 && shots[k - 1].kind === 'lob'
    push({ at: s.t, p, arc: k === 0 && fromPan ? (G * T * T) / 8 : (lobbed ? 0.22 : 0.06) + (G * T * T) / 16 })
    flyTo(s.bt, [s.land, 0], table, s.arc)
    BOUNCES.push({ t: s.bt, p: [s.land, 0], power: s.kind === 'smash' ? 1 : s.kind === 'lob' ? 0.2 : s.kind === 'drive' ? 0.5 : 0.35 })
  })
}

/** A shot on beat `pos` of bar `bar`, landing on that beat's "a" (or on the next beat's, for a lob a beat longer). */
function shot(who: Who, bar: number, pos: number, kind: Kind, from: Pt | number, land: number, arc: number): Shot {
  const nb = kind === 'lob' ? (pos === 4 ? [bar + 1, 1] : [bar, pos + 1]) : [bar, pos]
  return { who, t: at(bar, pos), kind, ...(typeof from === 'number' ? { phi: from } : { p: from }), land, bt: a(nb[0], nb[1]), arc }
}
const M = (bar: number, pos: number, kind: Kind, phi: number, land: number, arc: number) => shot('marty', bar, pos, kind, phi, land, arc)
const K = (bar: number, pos: number, kind: Kind, p: Pt, land: number, arc: number) => shot('kletzki', bar, pos, kind, p, land, arc)
const E = (bar: number, pos: number, kind: Kind, p: Pt, land: number, arc: number) => shot('endo', bar, pos, kind, p, land, arc)

/* ---- bar 25: on the corner; into the pan; the toss ---- */
push({ at: T0, p: [-0.5, 0] })
push({ at: HOP_OFF, p: [-0.5, 0] })
hopTo(IN_PAN_A, panOf(A))
push({ at: TOSS_A, p: panOf(A) })

/*
 * ---- the semifinal, bars 26 to 31: one rally, every beat a bat ----
 *
 * Kletzki plays from in close, flat and hard, and smashes off each of Marty's loops; Marty blocks them short, then
 * drives deeper and flatter as it goes on, until Kletzki, stretched wide, floats one up, and Marty smashes it.
 */
play(
  A,
  [
    M(26, 1, 'serve', 240, 3.6, 0.2),
    K(26, 2, 'drive', [5.25, -0.35], 0.2, 0.2),
    M(26, 3, 'drive', 244, 4.1, 0.17),
    K(26, 4, 'drive', [5.55, -0.28], -0.3, 0.18),
    M(27, 1, 'drive', 238, 3.3, 0.16),
    K(27, 2, 'drive', [5.05, -0.4], 1.45, 0.16),
    M(27, 3, 'loop', 232, 3.9, 0.6),
    K(27, 4, 'smash', [5.0, -0.9], 0.0, 0.05),
    M(28, 1, 'block', 236, 2.9, 0.13),
    K(28, 2, 'drive', [4.9, -0.3], 0.4, 0.17),
    M(28, 3, 'drive', 248, 4.3, 0.14),
    K(28, 4, 'drive', [5.6, -0.25], -0.45, 0.12),
    M(29, 1, 'drive', 242, 3.5, 0.14),
    K(29, 2, 'drive', [5.2, -0.4], 0.9, 0.14),
    M(29, 3, 'drive', 250, 4.35, 0.12),
    K(29, 4, 'drive', [5.65, -0.22], -0.2, 0.12),
    M(30, 1, 'loop', 236, 4.0, 0.55),
    K(30, 2, 'smash', [5.0, -0.95], 0.25, 0.05),
    M(30, 3, 'block', 240, 3.0, 0.12),
    K(30, 4, 'drive', [4.95, -0.32], -0.4, 0.1),
    M(31, 1, 'drive', 252, 4.4, 0.1),
    K(31, 2, 'loop', [5.75, -0.15], 0.6, 0.6),
    M(31, 3, 'smash', 258, 4.3, 0.06),
  ],
  true,
)
// Kletzki swings at it and misses: the smash's kick has it over his bat.
stroke({ t: at(31, 4), who: 'kletzki', p: [5.25, -0.25], kind: 'miss', table: A })

/* ---- bar 32: the smash's kick over Kletzki and the gap, into table B's pan ---- */
hopTo(IN_PAN_B, panOf(B))
push({ at: TOSS_B, p: panOf(B) })

/* ---- the final's first point, bars 33 to 36: Marty's ---- */
play(
  B,
  [
    M(33, 1, 'serve', 240, 13.2, 0.2),
    E(33, 2, 'loop', [14.6, -0.42], 9.3, 0.45),
    M(33, 3, 'drive', 244, 13.5, 0.16),
    E(33, 4, 'loop', [14.9, -0.35], 9.6, 0.5),
    M(34, 1, 'drive', 238, 13.7, 0.15),
    E(34, 2, 'lob', [15.55, 0.02], 9.4, 1.3),
    M(34, 4, 'smash', 258, 13.55, 0.06),
  ],
  false,
)
/** Where the winner passes Endo, where it comes off the floor, where he catches it, and where he pats it back from. */
const PASS: Pt = [15.3, -0.62]
const FLOOR_OUT: Pt[] = [
  [16.65, FLOOR - R],
  [17.15, FLOOR - R],
]
export const CAUGHT: Pt = [17.5, 0.28]
export const FED: Pt = [16.75, -0.2]
/** The ball on Endo's bat as he turns round and carries it back to the end of the table. */
export const carryAt = (t: number): Pt => {
  const u = smooth(t, CATCH, FEED - 0.05)
  return [CAUGHT[0] + (FED[0] - CAUGHT[0]) * u, CAUGHT[1] + (FED[1] - CAUGHT[1]) * u - 0.12 * Math.sin(Math.PI * u)]
}
{
  // He lunges, and it goes over his bat.
  push({ at: LUNGE, p: PASS, arc: 0.04 })
  stroke({ t: LUNGE, who: 'endo', p: [15.35, -0.3], kind: 'miss', table: B })
  hopTo(OUT[0], FLOOR_OUT[0])
  BOUNCES.push({ t: OUT[0], p: FLOOR_OUT[0], power: 0.5, floor: true })
  hopTo(OUT[1], FLOOR_OUT[1], 0.55)
  BOUNCES.push({ t: OUT[1], p: FLOOR_OUT[1], power: 0.3, floor: true })
  hopTo(CATCH, CAUGHT)
  stroke({ t: CATCH, who: 'endo', p: CAUGHT, kind: 'catch', table: B })
  // Carried round on the bat, then patted back over the net, a bounce, and into the pan.
  let tc = CATCH
  for (const seg of carried(carryAt, CATCH, FEED, 16)) {
    tc += seg.dur
    push({ at: tc, p: seg.to })
  }
  stroke({ t: FEED, who: 'endo', p: FED, kind: 'feed', table: B })
  flyTo(FEED_BOUNCE, [10.4, 0], B, 0.5)
  BOUNCES.push({ t: FEED_BOUNCE, p: [10.4, 0], power: 0.2 })
  hopTo(IN_PAN_B2, panOf(B))
  push({ at: TOSS_B2, p: panOf(B) })
}

/*
 * ---- the last point, bars 37 to 41 ----
 *
 * Endo backs off the table and lobs, from deeper each time, and Marty smashes each one; then Endo comes running in.
 */
play(
  B,
  [
    M(37, 1, 'serve', 242, 13.3, 0.2),
    E(37, 2, 'loop', [14.55, -0.4], 9.2, 0.42),
    M(37, 3, 'drive', 246, 13.6, 0.15),
    E(37, 4, 'loop', [15.05, -0.3], 9.7, 0.5),
    M(38, 1, 'drive', 250, 13.8, 0.12),
    E(38, 2, 'lob', [15.75, 0.05], 9.3, 1.4),
    M(38, 4, 'smash', 258, 13.7, 0.06),
    E(39, 1, 'lob', [16.45, 0.15], 9.6, 1.6),
    M(39, 3, 'smash', 260, 13.85, 0.05),
    E(39, 4, 'lob', [16.95, 0.2], 9.0, 1.7),
    M(40, 2, 'smash', 260, 13.4, 0.05),
    E(40, 3, 'loop', [14.8, -0.45], 9.8, 0.35),
    M(40, 4, 'drive', 248, 13.2, 0.12),
  ],
  false,
)

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
  stroke({ t: DEAD, who: 'endo', p: DEAD_AT, kind: 'dead', table: B })
  push({ at: DEAD, p: DEAD_AT, arc: 0.06 + (G * (DEAD - prev.t) ** 2) / 16 })
  flyTo(DIES, DIE_AT, B, 0.7)
  BOUNCES.push({ t: DIES, p: DIE_AT, power: 0.1 })
  push({ at: MISS, p: SECOND, arc: 0.07 })
  BOUNCES.push({ t: MISS, p: SECOND, power: 0.05 })
  // The bat fires at where the ball should have been, and stays up, spent.
  stroke({ t: MISS, who: 'marty', p: contactAt(B, 244), kind: 'miss', table: B, arm: armFor(244) })
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

/* ------------------------------------------------------------------ the players' feet */

/**
 * Where an opponent's hips are: an arm's length behind each ball he plays, so he is always on his way to the next:
 * in close for a drive, back off the table for a loop or a lob, wide and low for the one he misses. Endo's first point
 * ends in a lunge, a turn to go after the ball, the catch, and the turn back.
 */
const REACH: Partial<Record<Kind, number>> = { lob: 0.85, miss: 0.75, catch: -0.55, feed: 0.95 }
function hipKeys(who: 'kletzki' | 'endo'): [number, number][] {
  const home = who === 'kletzki' ? KLETZKI_X : ENDO_X
  const keys: [number, number][] = [[T0, home]]
  for (const s of STROKES) if (s.who === who) keys.push([s.t, s.p[0] + (REACH[s.kind] ?? 0.95)])
  if (who === 'endo') keys.push([OUT[0], 16.75], [OUT[1], 17.05], [FEED - 0.3, 17.6])
  keys.sort((x, y) => x[0] - y[0])
  // Between two balls he gets to the next in good time, and waits there for it.
  const out: [number, number][] = [keys[0]]
  for (let i = 1; i < keys.length; i++) {
    const [t, x] = keys[i]
    const t0 = keys[i - 1][0]
    out.push([Math.max(t0 + 0.02, t - Math.min(0.42, (t - t0) * 0.8)), x], [t, x])
  }
  return out
}
const HIP: Record<'kletzki' | 'endo', [number, number][]> = { kletzki: hipKeys('kletzki'), endo: hipKeys('endo') }
export function hipAt(who: 'kletzki' | 'endo', t: number): number {
  const keys = HIP[who]
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1] = keys[i]
    if (t <= t1) {
      const [t0, x0] = keys[i - 1]
      return x0 + (x1 - x0) * smooth(t, t0, t1)
    }
  }
  return keys[keys.length - 1][1]
}
/** Endo turns his back to go after the ball he missed, and round again to carry it back. */
export const endoFace = (t: number): 1 | -1 => (t > LUNGE + 0.2 && t < CATCH + 0.32 ? -1 : 1)

/* ------------------------------------------------------------------ strikes */

/** The big shots, which the camera punches in on: Marty's smashes and Kletzki's. */
export const SMASHES = STROKES.filter((s) => s.kind === 'smash')

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
  FLIP_M,
  IN_PAN_B2,
  TOSS_B2,
  FLIP_B,
  BOW,
  ...FLOOR_HITS,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((x, y) => x - y)
