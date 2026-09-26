import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { CASTLE, HULL_OUTLINE, MODULE_PIVOT, doorAt, drawCastle, onBody, puff, spline, type CastlePose, type ModuleId, type ModuleMove } from '../wastes/castle'
import { ROOM, WASTES } from '../worlds'
import { BX0, c, CROUCH, deck, ring, T0, YG, type Deck } from './plank-rig'

/**
 * The castle falling apart round her (243.635 → 251.797), drawn through the castle builder's API and nothing else.
 *
 * The room's near wall is gone from the first frame (the room was always seen cut open), and on the climax its back
 * wall breaks up and falls away, so she stands on the floor in the open with the sky behind her. On the same note the
 * hull's back breaks over her head: the iron over the room cracks through and sags into a V, the cottage settling
 * into it. Then, a piece a bar, the castle comes down, and the hull comes apart in jagged iron plates as the things
 * standing on them go: the flag tears off on the first downbeat, the chimney topples on its second beat; the back
 * turret tips over, its slate cone snapping off, and both crumble into their dust where they strike; the cottage
 * slides off backwards and the plate over the room goes with it; the front turret goes the same way as the back one,
 * tearing the other half of the plate over her up and over with it; the pipes and the plates they stood on; the
 * face; and last what is left of the hull, a jagged block either side of the floor, leaving one plank on four legs.
 * Each piece lets go on a downbeat and lands on a later one, in dust.
 *
 * Every piece still on the castle is drawn with the plank's own shudder; a piece that lets go keeps where it was at
 * that moment and falls in the world, so what lies on the ground never moves again.
 */

/* ------------------------------------------------------------------ placing the castle on the plank */

/** The castle's own drawing of a standing point, at the pose we draw it in (its bob and rock taken back out). */
const POSE0: CastlePose = { t: 0, step: 0, noLegs: true }
const D0 = doorAt(POSE0)
const LEAN0 = (() => {
  const a = onBody(POSE0, [0, -6.9])
  const b = onBody(POSE0, [10, -6.9])
  return Math.atan2(b[1] - a[1], b[0] - a[0])
})()
const DOOR = CASTLE.door

/** From here the castle's standing points are drawn where they are: undo its own bob and rock about the door. */
function standing(p: p5, k: number) {
  p.translate(DOOR[0] * k, DOOR[1] * k)
  p.rotate(-LEAN0)
  p.translate(-D0[0] * k, -D0[1] * k)
}

/** A standing castle point in the plank's deck cells: the floor (the door's sill) is the deck's top. */
export const deckOf = (c: Pt): Pt => [c[0], c[1] - DOOR[1]]

/* ------------------------------------------------------------------ the hull's shape, and its plates */

/** The hull's outline and the head's (the castle's own numbers): torn edges are drawn only inside the iron. */
const HULL_O: Pt[] = [...HULL_OUTLINE]
const HEAD_O: Pt[] = spline([[5.7, -12.55], [7.2, -12.6], [8.35, -12.3], [9.0, -11.6], [9.2, -10.3], [9.05, -9.3], [8.6, -8.95], [7.1, -8.82], [6.3, -8.4]], 5)

/** The room's opening in the hull (standing cells): from the floor up to under the deck, torn at the edges. */
const HOLE: Pt[] = [
  [-4.6, -6.8], [-4.75, -7.6], [-4.45, -8.3], [-4.8, -9.2], [-4.5, -10.1], [-4.7, -11.0], [-3.9, -11.25], [-3.0, -11.05], [-2.1, -11.3],
  [-1.1, -11.1], [-0.1, -11.35], [0.9, -11.1], [1.8, -11.3], [2.7, -11.0], [3.0, -10.2], [2.75, -9.3], [3.05, -8.5], [2.8, -7.6], [3.0, -6.8],
]

/**
 * The hull's plates (standing cells), which tile it (their outer edges run wide of the iron; the hull clips them).
 * The two over the room meet on the break, the ragged line the hull finally parts along.
 */
const PLATE = {
  /** The stern's top, under the back turret. */
  sternCap: [[-9.6, -13.6], [-5.7, -13.4], [-5.95, -12.3], [-5.6, -11.6], [-6.0, -10.9], [-5.75, -10.35], [-6.5, -10.1], [-7.2, -10.45], [-7.8, -10.0], [-8.5, -10.3], [-9.6, -10.1]] as Pt[],
  /** Over the room, stern half: under the cottage. */
  sternLintel: [[-5.7, -13.4], [-0.3, -13.2], [-0.95, -12.1], [-0.4, -11.4], [-1.1, -10.3], [-4.2, -10.3], [-4.2, -10.9], [-5.1, -10.6], [-5.75, -10.35], [-6.0, -10.9], [-5.6, -11.6], [-5.95, -12.3]] as Pt[],
  /** Over the room, bow half. */
  bowLintel: [[-0.3, -13.2], [3.2, -13.4], [3.45, -12.1], [3.1, -11.6], [3.35, -10.9], [2.6, -10.3], [-1.1, -10.3], [-0.4, -11.4], [-0.95, -12.1]] as Pt[],
  /** The bow's shoulder, under the pipes and the little turret. */
  shoulder: [[3.2, -13.4], [5.8, -13.4], [5.95, -12.2], [5.7, -11.3], [5.9, -10.5], [5.2, -10.3], [4.6, -10.75], [3.9, -10.45], [3.35, -10.9], [3.1, -11.6], [3.45, -12.1]] as Pt[],
  /** What is left either side of the floor. */
  hullL: [[-9.6, -10.1], [-8.5, -10.3], [-7.8, -10.0], [-7.2, -10.45], [-6.5, -10.1], [-5.75, -10.35], [-5.1, -10.6], [-4.2, -10.9], [-4.2, -10.3], [-1.1, -10.3], [-0.6, -9.4], [-1.2, -8.1], [-0.7, -6.9], [-1.0, -5.5], [-1.0, -4.5], [-9.6, -4.5]] as Pt[],
  hullR: [[-1.1, -10.3], [2.6, -10.3], [3.35, -10.9], [3.9, -10.45], [4.6, -10.75], [5.2, -10.3], [5.9, -10.5], [6.3, -9.9], [6.1, -9.0], [6.4, -8.2], [10.5, -8.0], [10.5, -4.5], [-1.0, -4.5], [-1.0, -5.5], [-0.7, -6.9], [-1.2, -8.1], [-0.6, -9.4]] as Pt[],
  /** The head's brow over the face, and the dark of its mouth: it goes with the face. */
  brow: [[5.8, -13.4], [10.5, -13.6], [10.5, -8.0], [6.4, -8.2], [6.1, -9.0], [6.3, -9.9], [5.9, -10.5], [5.7, -11.3], [5.95, -12.2]] as Pt[],
}
type PlateId = keyof typeof PLATE

/** Where the turrets snap: a ragged line across each tower just under its cone. */
const SNAP_BACK: Pt[] = [[-8.0, -19.9], [-7.5, -20.05], [-7.1, -19.7], [-6.6, -19.95], [-6.15, -19.72], [-5.7, -19.98], [-5.4, -19.85]]
const SNAP_FRONT: Pt[] = [[6.2, -15.95], [6.6, -15.72], [7.05, -16.0], [7.45, -15.75], [7.9, -15.98], [8.25, -15.8]]

/* ------------------------------------------------------------------ the pieces */

type Name =
  | 'flag' | 'chimney' | 'backBody' | 'backCone' | 'house' | 'sternLintel' | 'frontBody' | 'frontCone' | 'bowLintel'
  | 'pipes' | 'shoulder' | 'sternCap' | 'face' | 'hullL' | 'hullR'

interface Piece {
  name: Name
  /** When it lets go, and when it lands (both on the recording). */
  at: number
  land: number
  /** What it turns about, and its outline for where it comes to rest (standing cells). */
  pivot: Pt
  pts: Pt[]
  /** Where its pivot comes down (castle x, from the castle's standing origin), and how far it has turned. */
  to: number
  rot: number
  /** Modules it draws (clipped to `clip`, standing cells), and/or a hull plate (drawn under them). */
  ids?: ModuleId[]
  clip?: Pt[]
  plate?: PlateId
  /** The ragged break across it, drawn as a torn edge between these x. */
  snap?: { line: Pt[]; x0: number; x1: number }
  /** It crumbles into its own dust where it lands, over this window after the landing (s). */
  crumble?: [number, number]
  /** It rides another piece from the letting go, and comes off it over this part of the fall. */
  ride?: { on: Name; from: number; to: number }
  /** How much dust it throws up. */
  big?: number
}

const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const BACK_BODY_CLIP: Pt[] = [[-12, -19.9], ...SNAP_BACK, [-4, -19.85], [-4, -10], [-12, -10]]
const BACK_CONE_CLIP: Pt[] = [[-12, -19.9], ...SNAP_BACK, [-4, -19.85], [-4, -27], [-12, -27]]
const FRONT_CONE_CLIP: Pt[] = [[5.6, -15.9], ...SNAP_FRONT, [9.5, -15.8], [9.5, -21], [5.6, -21]]
const FRONT_BODY_CLIP: Pt[] = [[0, -21], [5.6, -21], [5.6, -15.9], ...SNAP_FRONT, [9.5, -15.8], [9.5, -10], [0, -10]]
const TURRET: [number, number] = [0.2, 1.7]
const PLATES: [number, number] = [0.3, 2.0]
const HEAVY: [number, number] = [0.45, 2.3]

export const PIECES: Piece[] = [
  { name: 'flag', ids: ['flag'], at: c(1), land: c(1) + 3.4, pivot: MODULE_PIVOT.flag, pts: box(-8.6, -25.7, -6.8, -23.6), to: -16, rot: 2.6 },
  { name: 'chimney', ids: ['chimney'], at: c(1, 2), land: c(3), pivot: MODULE_PIVOT.chimney, pts: box(0.0, -22.3, 1.4, -17.6), to: -2.8, rot: -1.62 },
  {
    name: 'backBody', ids: ['turretBack', 'cannonTop'], clip: BACK_BODY_CLIP, snap: { line: SNAP_BACK, x0: -7.9, x1: -5.5 }, at: c(2), land: c(4),
    pivot: MODULE_PIVOT.turretBack, pts: [[-7.85, -12.0], [-5.45, -12.0], [-5.4, -19.85], [-8.0, -19.9], [-8.85, -17.0], [-9.05, -18.3], [-9.82, -15.58], [-9.82, -15.3]],
    to: -8.4, rot: -1.0, crumble: TURRET, big: 0.9,
  },
  {
    name: 'backCone', ids: ['turretBack'], clip: BACK_CONE_CLIP, snap: { line: SNAP_BACK, x0: -7.9, x1: -5.5 }, at: c(2), land: c(4),
    pivot: [-6.7, -20.6], pts: [[-8.35, -19.95], [-5.1, -19.95], [-6.95, -23.75], [-7.1, -19.7], [-5.7, -19.98]],
    to: -13.6, rot: -2.1, crumble: TURRET, ride: { on: 'backBody', from: 0.28, to: 0.62 }, big: 0.7,
  },
  { name: 'house', ids: ['house'], at: c(3), land: c(5), pivot: MODULE_PIVOT.house, pts: box(-5.55, -19.25, 3.2, -12.25), to: -10.5, rot: -0.36 },
  {
    name: 'sternLintel', plate: 'sternLintel', at: c(3), land: c(5), pivot: [-3.0, -11.8],
    pts: [[-5.9, -12.35], [-4.6, -12.3], [-2.2, -12.45], [-0.4, -12.25], [-0.4, -11.35], [-1.1, -11.1], [-3.9, -11.25], [-4.7, -11.0], [-5.75, -10.35]],
    to: -6.8, rot: -2.6, crumble: PLATES, big: 0.8,
  },
  {
    name: 'frontBody', ids: ['turretFront'], clip: FRONT_BODY_CLIP, snap: { line: SNAP_FRONT, x0: 6.3, x1: 8.1 }, at: c(4), land: c(6),
    pivot: MODULE_PIVOT.turretFront, pts: [[3.3, -12.25], [4.5, -12.25], [3.05, -15.5], [4.75, -15.5], [3.9, -17.6], [6.25, -12.4], [8.15, -12.4], [8.2, -15.85], [6.2, -15.9]],
    to: 8.2, rot: 1.0, crumble: TURRET, big: 0.9,
  },
  {
    name: 'frontCone', ids: ['turretFront'], clip: FRONT_CONE_CLIP, snap: { line: SNAP_FRONT, x0: 6.3, x1: 8.1 }, at: c(4), land: c(6),
    pivot: [7.2, -16.8], pts: [[5.9, -15.9], [8.5, -15.9], [7.15, -19.05], [6.6, -15.72], [7.45, -15.75]],
    to: 12.2, rot: 2.3, crumble: TURRET, ride: { on: 'frontBody', from: 0.28, to: 0.62 }, big: 0.7,
  },
  {
    name: 'bowLintel', plate: 'bowLintel', at: c(4), land: c(6), pivot: [1.2, -11.8],
    pts: [[-0.9, -12.3], [0.4, -12.2], [2.9, -12.42], [3.45, -12.1], [3.1, -11.6], [3.3, -10.95], [2.7, -11.0], [-0.1, -11.35], [-0.4, -11.4]],
    to: 5.6, rot: 2.7, crumble: PLATES, big: 0.8,
  },
  { name: 'pipes', ids: ['pipes'], at: c(5), land: c(7), pivot: MODULE_PIVOT.pipes, pts: box(4.5, -18.1, 6.35, -12.3), to: 6.6, rot: 1.25, crumble: HEAVY },
  {
    name: 'shoulder', plate: 'shoulder', at: c(5), land: c(7), pivot: [4.6, -11.5],
    pts: [[3.45, -12.1], [5.0, -12.3], [5.9, -12.5], [5.7, -11.3], [5.9, -10.5], [5.2, -10.3], [3.9, -10.45], [3.35, -10.9], [3.1, -11.6]],
    to: 9.0, rot: 2.0, crumble: PLATES, big: 0.8,
  },
  {
    name: 'sternCap', plate: 'sternCap', at: c(5), land: c(7), pivot: [-7.2, -11.3],
    pts: [[-7.65, -12.2], [-6.3, -12.5], [-5.9, -12.35], [-5.6, -11.6], [-6.0, -10.9], [-5.75, -10.35], [-6.5, -10.1], [-7.8, -10.0], [-8.5, -10.3], [-8.6, -10.45], [-8.35, -11.55]],
    to: -12.4, rot: -3.0, big: 0.8,
  },
  { name: 'face', ids: ['eye', 'nose', 'jaw'], plate: 'brow', at: c(6), land: c(7, 2), pivot: MODULE_PIVOT.eye, pts: box(6.3, -12.6, 10.85, -6.4), to: 9.8, rot: 1.45, crumble: HEAVY },
  {
    name: 'hullL', plate: 'hullL', at: c(7), land: c(8), pivot: [-4.6, -8.3],
    pts: [[-8.6, -10.45], [-5.75, -10.35], [-4.7, -10.8], [-4.6, -6.8], [-1.0, -6.8], [-1.0, -6.03], [-1.7, -6.03], [-3.9, -6.36], [-5.7, -7.0], [-7.1, -7.95], [-8.15, -9.15]],
    to: -12.8, rot: -0.35, big: 1.3,
  },
  {
    name: 'hullR', plate: 'hullR', at: c(7), land: c(8), pivot: [4.2, -9.2],
    pts: [[-1.0, -6.8], [2.9, -6.8], [3.0, -10.2], [3.35, -10.9], [5.9, -10.5], [6.3, -9.9], [6.1, -9.0], [6.4, -8.2], [6.3, -7.55], [5.1, -6.7], [3.1, -6.18], [0.8, -5.98], [-1.0, -6.0]],
    to: 9.0, rot: 0.45, crumble: HEAVY, big: 1.8,
  },
]
const BY_NAME = new Map<Name, Piece>(PIECES.map((f) => [f.name, f]))

function crumbleAt(f: Piece, t: number): number {
  return f.crumble ? smooth(t, f.land + f.crumble[0], f.land + f.crumble[1]) : 0
}

/** The draw order the castle draws its modules in (the hull's second call, the stair, goes with it). */
const ALL: ModuleId[] = ['turretBack', 'cannonTop', 'flag', 'house', 'chimney', 'pipes', 'turretFront', 'hull', 'eye', 'nose', 'jaw']

/** How far down its pivot sits when it lies at rest turned by `rot`: its lowest point on the ground. */
function restHeight(f: Piece): number {
  const cs = Math.cos(f.rot)
  const sn = Math.sin(f.rot)
  let low = -Infinity
  for (const [x, y] of f.pts) low = Math.max(low, (x - f.pivot[0]) * sn + (y - f.pivot[1]) * cs)
  return low
}
const REST = new Map<Name, number>(PIECES.map((f) => [f.name, restHeight(f)]))

/* ------------------------------------------------------------------ the break over her head */

/** A hit that settles: 0 at the hit, up at once, a small damped overshoot, 1 after. */
const settle = (u: number): number => (u <= 0 ? 0 : 1 - Math.exp(-u / 0.12) * Math.cos((2 * Math.PI * u) / 0.5))
/** How far the two plates over the room have sagged into the break (radians each): on the climax, and again on bar 1. */
const sag = (t: number): number => 0.06 * settle(t - T0) + 0.03 * settle(t - c(1))

/** How a piece still on the castle has moved from its place (standing cells): turned about `about`, then shifted. */
interface Held {
  about: Pt
  rot: number
  dx: number
  dy: number
}
const STILL: Held = { about: [0, 0], rot: 0, dx: 0, dy: 0 }
function held(name: Name, t: number): Held {
  const a = sag(t)
  if (name === 'sternLintel') return { about: [-4.8, -11.9], rot: a, dx: -3 * a, dy: 0 }
  if (name === 'bowLintel') return { about: [3.2, -11.9], rot: -a, dx: 3 * a, dy: 0 }
  // The cottage (and the chimney on it) settles into the V.
  if (name === 'house' || name === 'chimney') return { about: [0, 0], rot: 0, dx: 0, dy: 2.2 * a }
  return STILL
}
function heldAt(h: Held, q: Pt): Pt {
  const cs = Math.cos(h.rot)
  const sn = Math.sin(h.rot)
  const x = q[0] - h.about[0]
  const y = q[1] - h.about[1]
  return [h.about[0] + x * cs - y * sn + h.dx, h.about[1] + x * sn + y * cs + h.dy]
}
function applyHeld(p: p5, k: number, h: Held) {
  p.translate((h.about[0] + h.dx) * k, (h.about[1] + h.dy) * k)
  p.rotate(h.rot)
  p.translate(-h.about[0] * k, -h.about[1] * k)
}

/* ------------------------------------------------------------------ the falls */

/** A falling piece at `t`, on its own: where its pivot is in the world, and how far it has turned (world). */
function ownFall(f: Piece, t: number): { at: Pt; rot: number } {
  const d = deck(f.at)
  const h = held(f.name, f.at)
  const cs = Math.cos(d.rot)
  const sn = Math.sin(d.rot)
  const [pu, pv] = deckOf(heldAt(h, f.pivot))
  const x0 = d.x + pu * cs - pv * sn
  const y0 = d.y + pu * sn + pv * cs
  const r0 = d.rot + h.rot
  const u = Math.max(0, Math.min(1, (t - f.at) / (f.land - f.at)))
  if (f.name === 'flag') {
    // Torn off, it goes away on the wind, turning over, and is gone.
    return { at: [x0 + (BX0 + f.to - x0) * u * (0.4 + 0.6 * u), y0 - 5 * u + 2.5 * u * u], rot: r0 + f.rot * u }
  }
  const x1 = BX0 + f.to
  const y1 = YG - (REST.get(f.name) ?? 1)
  // A topple: slow to start, the turn and the drop gathering to the ground; then a jolt and a settle.
  const e = u * u
  const after = Math.max(0, t - f.land)
  const bounce = t > f.land ? 0.18 * Math.max(0, ring(after, 0.34, 0.12)) : 0
  return {
    at: [x0 + (x1 - x0) * (u * 0.35 + 0.65 * e), y0 + (y1 - y0) * e - bounce],
    rot: r0 + (f.rot - r0) * e + 0.05 * Math.sign(f.rot) * ring(after, 0.4, 0.25),
  }
}

/** A falling piece at `t`: its own fall, or, while it rides another, carried on that one until it comes free. */
function fallAt(f: Piece, t: number): { at: Pt; rot: number } {
  const own = ownFall(f, t)
  if (!f.ride) return own
  const on = BY_NAME.get(f.ride.on)!
  const b = ownFall(on, t)
  const cs = Math.cos(b.rot)
  const sn = Math.sin(b.rot)
  const dx = f.pivot[0] - on.pivot[0]
  const dy = f.pivot[1] - on.pivot[1]
  const carried: Pt = [b.at[0] + dx * cs - dy * sn, b.at[1] + dx * sn + dy * cs]
  const u = (t - f.at) / (f.land - f.at)
  const w = smooth(u, f.ride.from, f.ride.to)
  return { at: [carried[0] + (own.at[0] - carried[0]) * w, carried[1] + (own.at[1] - carried[1]) * w], rot: b.rot + (own.rot - b.rot) * w }
}

/* ------------------------------------------------------------------ the room, torn open */

/** The room's back wall, which breaks into slabs on the climax: columns and rows of the opening. */
const XS = [-4.8, -2.6, -0.6, 0.15, 1.2, 3.1]
const YS = [-11.4, -9.3, -6.8]
interface Slab {
  pts: Pt[]
  mid: Pt
  at: number
  vx: number
  spin: number
  g: number
}
const SLABS: Slab[] = (() => {
  const out: Slab[] = []
  const j = (i: number, n: number, s: number) => (hash(i, n, s) - 0.5) * 0.35
  for (let ci = 0; ci < XS.length - 1; ci++) {
    for (let ri = 0; ri < YS.length - 1; ri++) {
      const x0 = XS[ci] + (ci ? j(ci, ri, 1) : 0)
      const x1 = XS[ci + 1] + (ci < XS.length - 2 ? j(ci + 1, ri, 1) : 0)
      const y0 = YS[ri] + (ri ? j(ci, ri, 2) : 0)
      const y1 = YS[ri + 1] + (ri < YS.length - 2 ? j(ci, ri + 1, 2) : 0)
      // A ragged slab: a notch in its top edge and one down a side, so no two read as boxes.
      const nx = x0 + (x1 - x0) * (0.3 + 0.4 * hash(ci, ri, 8))
      const ny = y0 + (y1 - y0) * (0.3 + 0.4 * hash(ci, ri, 9))
      const pts: Pt[] = [[x0, y0], [nx, y0 + 0.25 + j(ci, ri, 3)], [x1, y0 + j(ci, ri, 3) * 0.5], [x1 - 0.2 * hash(ci, ri, 10), ny], [x1, y1], [x0 + 0.25, y1 + j(ci, ri, 4) * 0.5], [x0 + 0.15 * hash(ci, ri, 12), ny + 0.3]]
      const mid: Pt = [(x0 + x1) / 2, (y0 + y1) / 2]
      const at = T0 + 0.02 + 0.16 * hash(ci, ri, 5) + (ri === 0 ? 0.06 : 0)
      // They break away from the top first and drop behind the floor, turning, gone into the hull's hold.
      out.push({ pts, mid, at, vx: (mid[0] + 0.8) * 0.25 + (hash(ci, ri, 6) - 0.5) * 0.6, spin: (hash(ci, ri, 7) - 0.5) * 2.2, g: 13 + 4 * hash(ci, ri, 11) })
    }
  }
  return out
})()

/** The back wall as it was: plaster, the brick breast behind the hearth, a shelf; lit red by the war. */
function wall(p: p5, k: number, W: number) {
  p.push()
  p.rectMode(p.CORNER)
  const war = (h: string) => mixHex(mixHex(h, ROOM.night, 0.28), ROOM.warLight, 0.22)
  p.noStroke()
  p.fill(war(ROOM.plaster))
  p.rect(-5 * k, -11.6 * k, 8.4 * k, 4.9 * k)
  // The chimney breast behind the grate, as the room has it: brick to the ceiling, an arched fireplace, a mantel.
  const b0 = -0.35
  const b1 = 1.75
  p.fill(war(ROOM.brick))
  p.rect(b0 * k, -11.6 * k, (b1 - b0) * k, 4.9 * k)
  p.stroke(alpha(p, war(ROOM.brickDark), 1))
  p.strokeWeight(W * 0.5)
  for (let i = 0; i < 12; i++) {
    const y = -6.8 - (i + 1) * 0.38
    p.line(b0 * k, y * k, b1 * k, y * k)
    for (let x = b0 + (i % 2 ? 0.3 : 0.6); x < b1; x += 0.6) p.line(x * k, y * k, x * k, (y + 0.38) * k)
  }
  p.noStroke()
  p.fill(war(ROOM.hearth))
  p.beginShape()
  p.vertex((b0 + 0.25) * k, -6.8 * k)
  p.vertex((b0 + 0.25) * k, -7.9 * k)
  p.bezierVertex((b0 + 0.25) * k, -8.45 * k, (b1 - 0.25) * k, -8.45 * k, (b1 - 0.25) * k, -7.9 * k)
  p.vertex((b1 - 0.25) * k, -6.8 * k)
  p.endShape(p.CLOSE)
  p.fill(war(ROOM.woodDark))
  p.rect((b0 - 0.2) * k, -8.72 * k, (b1 - b0 + 0.4) * k, 0.2 * k)
  p.pop()
}

/* ------------------------------------------------------------------ drawing */

const tracePath = (ctx: CanvasRenderingContext2D, pts: Pt[], k: number) => {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
}
const clipTo = (p: p5, k: number, pts: Pt[]) => {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  tracePath(ctx, pts, k)
  ctx.clip()
}
const outline = (p: p5, k: number, pts: Pt[], close: boolean) => {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  if (close) p.endShape(p.CLOSE)
  else p.endShape()
}

/** Clip to everything but the room's opening (standing cells): what the hull is drawn through. */
function clipHole(p: p5, k: number) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect(-400 * k, -400 * k, 800 * k, 800 * k)
  tracePath(ctx, HOLE, k)
  ctx.clip('evenodd')
}

/** Clip to the iron itself: the hull and the head. */
function clipIron(p: p5, k: number) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  tracePath(ctx, HULL_O, k)
  tracePath(ctx, HEAD_O, k)
  ctx.clip()
}

/** The castle pose with only `show` drawn, each as the caller has placed it. */
function only(t: number, show: ModuleId[], extra: Partial<CastlePose> = {}): CastlePose {
  const modules: Partial<Record<ModuleId, ModuleMove>> = {}
  for (const id of ALL) modules[id] = { ...(extra.modules?.[id] ?? {}), ...(show.includes(id) ? {} : { gone: 1 }) }
  return { ...POSE0, t, ...extra, modules }
}

/** Into the deck's frame at `d`. */
function onto(p: p5, k: number, d: Deck) {
  p.translate(d.x * k, d.y * k)
  p.rotate(d.rot)
}

const DUST = mixHex(WASTES.rock, WASTES.mist, 0.5)

/**
 * Hull plates (standing cells), drawn through the room's opening, with their torn edges: the plating's thickness,
 * dark, inside each plate, and its ragged line. `pose` is the hull's (light, haze).
 */
function drawPlates(p: p5, k: number, W: number, ink: string, t: number, ids: PlateId[], pose: Partial<CastlePose>) {
  if (!ids.length) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  for (const id of ids) tracePath(ctx, PLATE[id], k)
  ctx.clip()
  clipHole(p, k)
  p.push()
  standing(p, k)
  drawCastle(p, k, W, ink, only(t, ['hull'], pose))
  p.pop()
  // The torn edges, only inside the iron.
  clipIron(p, k)
  const hz = pose.haze ?? 0
  p.push()
  p.noFill()
  p.strokeJoin(p.ROUND)
  for (const id of ids) {
    ctx.save()
    clipTo(p, k, PLATE[id])
    p.stroke(mixHex(mixHex(WASTES.ironDark, WASTES.night, 0.3), DUST, hz))
    p.strokeWeight(W * 2.2)
    outline(p, k, PLATE[id], true)
    outline(p, k, HOLE, false)
    p.stroke(mixHex(ink, DUST, hz * 0.92))
    p.strokeWeight(W * 0.9)
    outline(p, k, PLATE[id], true)
    outline(p, k, HOLE, false)
    ctx.restore()
  }
  p.pop()
  ctx.restore()
}

/** A module piece (standing cells), clipped to its part, with the torn edge where its tower snapped. */
function drawModules(p: p5, k: number, W: number, ink: string, t: number, f: Piece, pose: Partial<CastlePose>) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  if (f.clip) clipTo(p, k, f.clip)
  p.push()
  standing(p, k)
  drawCastle(p, k, W, ink, only(t, f.ids ?? [], pose))
  p.pop()
  if (f.snap) {
    const hz = pose.haze ?? 0
    ctx.beginPath()
    ctx.rect(f.snap.x0 * k, -30 * k, (f.snap.x1 - f.snap.x0) * k, 60 * k)
    ctx.clip()
    p.push()
    p.noFill()
    p.strokeJoin(p.ROUND)
    p.stroke(mixHex(WASTES.stoneDark, DUST, hz))
    p.strokeWeight(W * 2.4)
    outline(p, k, f.snap.line, false)
    p.stroke(mixHex(ink, DUST, hz * 0.92))
    p.strokeWeight(W * 0.9)
    outline(p, k, f.snap.line, false)
    p.pop()
  }
  ctx.restore()
}

/** Everything of the castle's collapse at `t`, in the part's frame; `vis` is the frame's box (to skip what is out of it). */
export function drawCollapse(p: p5, k: number, W: number, ink: string, t: number, vis: { x0: number; x1: number; y0: number; y1: number }): void {
  if (t < T0 - 0.5) return
  if (vis.x0 > BX0 + 26 || vis.x1 < BX0 - 26) return
  const d = deck(t)
  const gone = (name: Name) => t >= BY_NAME.get(name)!.at
  const fade = smooth(t, T0, T0 + 1.6)
  const light = { lights: 0.5 * (1 - fade), night: 0.3 * (1 - smooth(t, T0, T0 + 8)) }

  // The slabs of the back wall, falling away behind the floor.
  const holdCtx = p.drawingContext as CanvasRenderingContext2D
  holdCtx.save()
  {
    // They go down behind the hull's belly: nothing of them below it.
    const m = holdCtx.getTransform()
    onto(p, k, deck(T0))
    holdCtx.beginPath()
    holdCtx.rect(-30 * k, -30 * k, 60 * k, (30 + deckOf([0, -6.05])[1]) * k)
    holdCtx.clip()
    holdCtx.setTransform(m)
  }
  for (const s of SLABS) {
    if (t < s.at || t > s.at + 1.2) continue
    const u = t - s.at
    const dd = deck(s.at)
    const [mu, mv] = deckOf(s.mid)
    const mx = dd.x + mu * Math.cos(dd.rot) - mv * Math.sin(dd.rot) + s.vx * u
    const my = dd.y + mu * Math.sin(dd.rot) + mv * Math.cos(dd.rot) + 0.5 * s.g * u * u
    if (my > vis.y1 + 3) continue
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(dd.rot + s.spin * u)
    p.translate(-s.mid[0] * k, -s.mid[1] * k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    tracePath(ctx, s.pts, k)
    ctx.clip()
    wall(p, k, W)
    ctx.restore()
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.noFill()
    p.beginShape()
    for (const [x, y] of s.pts) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    p.pop()
  }
  holdCtx.restore()

  // The pieces still on the castle, with the plank's shudder. The hull through its torn-open room.
  p.push()
  onto(p, k, d)
  p.translate(0, -DOOR[1] * k)
  // Before the break the room's back wall fills the opening.
  if (t < T0 + 0.04) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    tracePath(ctx, HOLE, k)
    ctx.clip()
    wall(p, k, W)
    ctx.restore()
  }
  const before: ModuleId[] = []
  if (!gone('backBody')) before.push('turretBack', 'cannonTop')
  if (!gone('flag')) before.push('flag')
  if (!gone('house')) before.push('house')
  if (!gone('chimney')) before.push('chimney')
  if (!gone('pipes')) before.push('pipes')
  if (!gone('frontBody')) before.push('turretFront')
  if (before.length) {
    const settled = held('house', t).dy
    p.push()
    standing(p, k)
    drawCastle(p, k, W, ink, only(t, before, { ...light, smoke: 0.5 * (1 - fade), modules: { house: { dy: settled }, chimney: { dy: settled } } }))
    p.pop()
  }
  // The hull's plates still on: the two over the room sagged into the break, the rest where they were.
  const still: PlateId[] = (['sternCap', 'shoulder', 'hullL', 'hullR'] as const).filter((id) => !gone(id))
  if (!gone('face')) still.push('brow')
  drawPlates(p, k, W, ink, t, still, light)
  for (const id of ['sternLintel', 'bowLintel'] as const) {
    if (gone(id)) continue
    p.push()
    applyHeld(p, k, held(id, t))
    drawPlates(p, k, W, ink, t, [id], light)
    p.pop()
  }
  if (!gone('face')) {
    p.push()
    standing(p, k)
    drawCastle(p, k, W, ink, only(t, ['eye', 'nose', 'jaw'], light))
    p.pop()
  }
  p.pop()

  // The pieces that have let go: each where it was when it went, falling in the world, then lying there.
  for (const f of PIECES) {
    if (t < f.at) continue
    const crumble = crumbleAt(f, t)
    if ((f.name === 'flag' && t > f.land) || crumble >= 0.985) continue
    const { at, rot } = fallAt(f, t)
    if (at[0] < vis.x0 - 16 || at[0] > vis.x1 + 16) continue
    p.push()
    p.translate(at[0] * k, at[1] * k)
    p.rotate(rot)
    p.translate(-f.pivot[0] * k, -f.pivot[1] * k)
    const pose: Partial<CastlePose> = { night: light.night, haze: crumble, hazeTo: DUST }
    if (f.plate) drawPlates(p, k, W, ink, t, [f.plate], pose)
    if (f.ids) {
      // The flag goes on the wind; the rest either lies where it fell or crumbles into its dust.
      const fadeOut = f.name === 'flag' ? smooth(t, f.land - 1.2, f.land) : 0
      if (fadeOut > 0) pose.modules = { flag: { gone: fadeOut } }
      drawModules(p, k, W, ink, t, f, pose)
    }
    p.pop()
  }

  // The dust bank each crumbling piece goes into: as thick as the piece is hazed, over the whole of it, thinning
  // away once it has gone (to nothing inside its window).
  for (const f of PIECES) {
    if (!f.crumble) continue
    const [c0, c1] = f.crumble
    const a = t - f.land
    if (a < c0 - 0.4 || a > c1 + 2.6) continue
    const bank = smooth(a, c0 - 0.35, c1 - 0.4) * (1 - smooth(a, c1 + 0.1, c1 + 2.5))
    if (bank < 0.01) continue
    const [x0, x1] = spanOnGround(f)
    const H = heightOnGround(f)
    const nx = Math.max(2, Math.round((x1 - x0) / 1.3))
    const ny = Math.max(1, Math.round(H / 1.4))
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const x = x0 + ((i + 0.5) / nx) * (x1 - x0) + (hash(i, j, 41) - 0.5) * 0.6
        const y = YG - ((j + 0.5) / ny) * H - a * 0.15
        const r = 1.1 + 0.6 * hash(i, j, 43) + 0.25 * a
        puff(p, k, x, y, r, DUST, 0.62 * bank * (0.75 + 0.25 * hash(i, j, 47)), 0.85)
      }
    }
  }

  // Dust where each piece comes down: soft, rolling out along the ground and up, and gone to nothing in its time.
  for (const f of PIECES) {
    if (f.name === 'flag' || t < f.land) continue
    const big = f.big ?? 1
    const life = 4 * Math.max(1, big)
    const a = t - f.land
    if (a > life) continue
    const out = 1 - smooth(a, life * 0.5, life)
    const [x0, x1] = spanOnGround(f)
    const n = Math.max(3, Math.round((x1 - x0) / 1.4))
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * (x1 - x0)
      const r = (0.9 + a * (1.1 + hash(i, 3) * 0.8)) * big
      const drift = (x - (x0 + x1) / 2) * 0.12 * a
      puff(p, k, x + drift, YG - 0.3 * big - a * (0.5 + 0.4 * hash(i, 5)) * big, r, DUST, out * Math.min(0.75, 0.42 * big) * Math.exp(-a / (1.3 * big)) * (0.7 + 0.3 * hash(i, 7)), big > 1 ? 1 : 0.75)
    }
  }
}

/** Where a fallen piece meets the ground, x from and to (world). */
function spanOnGround(f: Piece): [number, number] {
  const cs = Math.cos(f.rot)
  const sn = Math.sin(f.rot)
  const xs = f.pts.map(([x, y]) => (x - f.pivot[0]) * cs - (y - f.pivot[1]) * sn)
  const cx = BX0 + f.to
  return [cx + Math.min(...xs), cx + Math.max(...xs)]
}

/** How tall a fallen piece stands off the ground as it lies. */
function heightOnGround(f: Piece): number {
  const cs = Math.cos(f.rot)
  const sn = Math.sin(f.rot)
  const vs = f.pts.map(([x, y]) => (x - f.pivot[0]) * sn + (y - f.pivot[1]) * cs)
  return Math.max(...vs) - Math.min(...vs)
}

/** The strikes of the collapse: the break, each piece's letting go and each landing. */
export const COLLAPSE_HITS: number[] = [...new Set([T0, ...PIECES.map((f) => f.at), ...PIECES.filter((f) => f.name !== 'flag').map((f) => f.land)])].sort((a, b) => a - b)

/** When the collapse is done: the plank stands on its own. */
export const BARE = CROUCH
