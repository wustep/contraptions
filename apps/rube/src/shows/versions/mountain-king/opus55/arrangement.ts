import type p5 from 'p5'
import type { Theme } from '../../../../../../../src/core/themes'
import { outline, solid } from '../../../../../../../src/core/draw'
import { FLOOR, R, laneAt, type BallState, type Piece, type PieceCtx, type Placement, type Pt, type Seg } from '../../../../parts'
import type { Placed } from '../../../../plan'
import { shelf } from '../../../../playground/pieces/dovre'
import * as bridgeMod from '../../../../playground/pieces/dovre/ropebridge'
import * as headsMod from '../../../../playground/pieces/dovre/heads'
import * as tankardsMod from '../../../../playground/pieces/dovre/tankards'
import { boulder as rock, floor, lamp, gold, moss, prop, rockShade, stone, wood } from '../../../../playground/pieces/dovre/look'
import type { TempoCtx, TimedPiece } from '../../../../playground/pieces/dovre/tempo'
import { bounds, hop, stand, type Move, type Troll, OOM, PAH, KING } from './cast'
import { BEATS, PHRASE, THEME_CONTOUR, THEME_RHYTHM, beatAt, beatTime } from './grid'
import { Route, air, everywhere, scenery, universe, type Timed } from './machine'
import { MountainKing, castPiece, type Act } from './show'
export { MountainKing }

/**
 * The arrangement: who goes where, on which beat.
 *
 * Two acts. **Under the mountain** (the theme six times, pianissimo to a
 * roar): Peer tiptoes in over the heads of sleeping trolls, one head a
 * note, the heads' heights the tune; crosses a rope bridge on the same
 * tune; the bridge gives under the last note and drops him on a sleeping
 * troll, Oom, who wakes. The chase: Oom bounds after him along the gallery
 * below, landing on one and three; at the fifth statement Oom lands on the
 * end of a handcar and flings Pah awake off the other, and the two pump it
 * after Peer, oom-pah, faster and faster, until Peer knocks three times on
 * the door into the mountain. **The hall** (the theme fortissimo, and the
 * coda): the door bursts open on the downbeat; the King is there; the tune
 * comes back on his tankards, three trolls under the table keeping the
 * beat, and on to the end.
 */

const dovre = shelf.world
const [LANTERN, FEAST] = dovre.themes
const named = <S = unknown>(name: string) => dovre.pieces.find((p) => p.name === name) as TimedPiece<any, any> & Piece<S>
const railPiece = dovre.pieces.find((p) => p.name === 'rail')!

/** Peer's colour: the lamplight gold in the mine, and the same gold in the hall. He is the one warm thing in the dark. */
const PEER = (theme: Theme) => gold(theme)

/* ------------------------------------------------------------------ building blocks */

type Decor = 'prop' | 'lamp' | 'moss' | 'none'
const DECOR: Decor[] = ['prop', 'none', 'lamp', 'none', 'moss', 'prop', 'none', 'none']

/** One cell of the gallery floor, in beats. */
function railCell(i: number, color: string): Placement<{ color: string; decor: Decor }> {
  return {
    cells: [[0, 0]],
    exit: { at: [1, 0], dir: 1 },
    lane: { segs: [{ from: [-0.5, 0], to: [0.5, 0], dur: 1 }], fire: 0.5 },
    state: { color, decor: DECOR[((i % DECOR.length) + DECOR.length) % DECOR.length] },
  }
}

function rails(route: Route, n: number): void {
  for (let i = 0; i < n; i++) route.put(railPiece as Piece<unknown>, railCell(route.col, route.paint(i)) as Placement<unknown>)
}

/** Rail to a beat. */
function railTo(route: Route, beat: number): void {
  rails(route, Math.max(0, Math.round(beat - route.beat)))
}

const ctxOf = (route: Route, color?: string): TempoCtx => ({ color: color ?? route.paint(route.legs.length), theme: route.theme, ball: route.ball })

interface Note {
  at: number
  lift: number
}

/** The theme as notes on a run whose entry is `lead` beats before the phrase's first note. */
function tune(lead: number, from = 0, lo = 0.26, per = 0.068): Note[] {
  return THEME_RHYTHM.map((r, i) => ({ at: r + lead, lift: lo + THEME_CONTOUR[i] * per })).slice(from)
}

/** A stand-in run until a piece's long mode exists: hops from note to note, over stone posts. */
function stand_inRun(notes: Note[], beats: number): Placement<{ notes: Note[] }> {
  const segs: Seg[] = []
  let at: Pt = [-0.5, 0]
  let b = 0
  for (const n of notes) {
    const land: Pt = [n.at - 0.5, -n.lift]
    if (n.at - b > 1) {
      segs.push({ from: at, to: at, dur: n.at - b - 1 })
      b = n.at - 1
    }
    segs.push({ from: at, to: land, dur: n.at - b, arc: 0.3 })
    at = land
    b = n.at
  }
  const down: Pt = [b + 0.5, 0]
  segs.push({ from: at, to: down, dur: 1, arc: 0.25 })
  segs.push({ from: down, to: [beats - 0.5, 0], dur: beats - b - 1 })
  const cells: Pt[] = []
  for (let x = 0; x < beats; x++) cells.push([x, 0])
  return { cells, exit: { at: [beats, 0], dir: 1 }, lane: { segs, fire: notes[0].at }, state: { notes } }
}

const standIn: Piece<{ notes: Note[] }> = {
  name: 'stand-in',
  weight: 0,
  place: () => null,
  draw: (p, s, { k, ink, weight, theme }) => {
    floor(p, k, ink, weight, -0.5, s.notes[s.notes.length - 1].at + 2)
    for (const n of s.notes) {
      solid(p, ink, weight, stone(theme))
      p.rect((n.at - 0.5) * k, ((-n.lift + R + FLOOR) / 2 + 0.06) * k, 0.26 * k, (n.lift + FLOOR - R) * k)
    }
  },
}

type RunFn = (notes: Note[], beats: number, beat: number, ctx: TempoCtx, give?: number) => Placement<unknown>

function headsRun(route: Route, notes: Note[], beats: number): Timed {
  const run = (headsMod as unknown as { headsRun?: RunFn }).headsRun
  if (run) return route.put(named('heads'), run(notes, beats, 1, ctxOf(route)))
  return route.put(standIn as Piece<unknown>, stand_inRun(notes, beats) as Placement<unknown>)
}

function tankardsRun(route: Route, notes: Note[], beats: number): Timed {
  const run = (tankardsMod as unknown as { tankardsRun?: RunFn }).tankardsRun
  if (run) return route.put(named('tankards'), run(notes, beats, 1, ctxOf(route)))
  return route.put(standIn as Piece<unknown>, stand_inRun(notes, beats) as Placement<unknown>)
}

function bridgeRun(route: Route, steps: number[], beats: number, give?: number): Timed {
  const run = (bridgeMod as unknown as { bridgeRun?: (s: number[], n: number, beat: number, ctx: TempoCtx, give?: number) => Placement<unknown> }).bridgeRun
  if (run) return route.put(named('ropebridge'), run(steps, beats, 1, ctxOf(route), give))
  return route.put(standIn as Piece<unknown>, stand_inRun(steps.map((at) => ({ at, lift: 0.05 })), beats) as Placement<unknown>)
}

/** A troll piece in its first variant that fits the wanted exit rise, or any. */
function piece(route: Route, name: string, rise?: number): Timed {
  const p = named(name)
  const vs = p.tempo.variants
  const pick = rise === undefined ? vs[0] : vs.find((v: unknown) => p.tempo.plan(v, 1, ctxOf(route)).exit.at[1] === rise) ?? vs[0]
  return route.add(p, pick)
}

/** A move of the show's own: segments in world cells and beats, from wherever the route is, leaving its cursor at (col, row). */
function path(route: Route, segs: Seg[], col: number, row: number): Timed {
  route.col = 0
  route.row = 0
  route.dir = 1
  return route.put(air as Piece<unknown>, { cells: [], exit: { at: [col, row], dir: 1 }, lane: { segs, fire: 0 }, state: null } as Placement<unknown>)
}

/* ------------------------------------------------------------------ the mine */

/** Rows: Peer's gallery is row 0; the gallery the trolls run on is `LOW` floors down. */
const LOW = 3
const R_OOM = 0.27
const R_PAH = 0.19
const R_KING = 0.42

function mine(): Act {
  const theme = LANTERN
  const origin = 0
  const ball: BallState = { color: PEER(theme), ghost: false, id: 0 }
  const b0 = beatAt(0)
  const route = new Route(-6, 0, b0, ball, origin, theme)

  // In from the dark: out of a tunnel mouth, a stop, a look, and on to the first head.
  {
    const n = -1 - b0
    const segs: Seg[] = []
    segs.push({ from: [-0.5, 0], to: [-0.5, 0], dur: 0.5, hidden: true })
    segs.push({ from: [-0.5, 0], to: [3.2, 0], dur: 2.6, ease: 'out' })
    const wait = n - 0.5 - 2.6 - 2.4
    segs.push({ from: [3.2, 0], to: [3.2, 0], dur: Math.max(0.2, wait) })
    // From rest to a cell a beat: a ramp, then the stride.
    const tr = 2 * (2.4 - 2.3)
    segs.push({ from: [3.2, 0], to: [3.2 + tr / 2, 0], dur: tr, ramp: [0, 1] })
    segs.push({ from: [3.2 + tr / 2, 0], to: [5.5, 0], dur: 2.4 - tr })
    route.put(air as Piece<unknown>, { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], exit: { at: [6, 0], dir: 1 }, lane: { segs, fire: 0 }, state: null } as Placement<unknown>)
  }

  // I. Tiptoe: the tune on the heads of sleeping trolls.
  const heads = headsRun(route, tune(1), 31)
  railTo(route, PHRASE - 1)

  // II. The rope bridge, on the same tune. It gives way under the long last note.
  const bridgeAt = route.col
  const steps = THEME_RHYTHM.map((r) => r + 1)
  const give = 30
  bridgeRun(route, steps, 31, give)
  // Where he is on the last plank when it goes.
  const onPlank = route.legs[route.legs.length - 1]
  const plank = laneAt(onPlank.lane, give)
  const px = onPlank.col + plank.x
  const py = onPlank.row + plank.y
  const oomX = px
  const oomY = stand(LOW, R_OOM)
  const head = oomY - R_OOM - R
  // Hang, fall, land on Oom's head on the downbeat, and bounce back up to the gallery beyond.
  route.beat = PHRASE - 1 + give
  const hang = 0.8
  const land = Math.ceil(px + 2.5) + 0.5
  path(route, [
    { from: [px, py], to: [px, py], dur: hang },
    { from: [px, py], to: [px + 0.08, head], dur: 64 - route.beat - hang, ease: 'in' },
    { from: [px + 0.08, head], to: [land, 0], dur: 2, arc: 1.9 },
  ], land + 0.5, 0)

  // III–VI. The chase.
  const chase: [string, number?][] = [
    ['stampmill'], ['nose'], ['rockingstone'], ['tail'], ['threeheads'], ['sunbeam'], ['tippler'], ['manengine'], ['bear'], ['boulder'], ['crucible'], ['stampmill'],
  ]
  let i = 0
  const DOOR = 188
  while (route.beat < DOOR - 6 && i < chase.length * 3) {
    railTo(route, route.beat + (i % 3 === 0 ? 2 : 1))
    const [name, rise] = chase[i % chase.length]
    const next = named(name)
    const v = next.tempo.variants[0]
    if (route.beat + next.tempo.beats(v) > DOOR - 1) break
    piece(route, name, rise)
    i++
  }
  railTo(route, DOOR)
  piece(route, 'door')

  // The trolls. Oom sleeps under the bridge's far end until Peer lands on him.
  const peerX = (b: number) => route.at(beatTime(b)).x
  const oomMoves: Move[] = [{ b0: -99, b1: 64, from: [oomX, oomY], to: [oomX, oomY], arc: 0 }]
  let ox = oomX
  for (let b = 66; b < 128; b += 2) {
    const want = peerX(b + 2) - 4
    const step = Math.max(1, Math.min(3, want - ox))
    oomMoves.push(hop(b, b + 2, [ox, oomY], [ox + step, oomY], 0.9))
    ox += step
  }
  // Pah sleeps further along, where Oom will land beside him on the fifth statement.
  const pahY = stand(LOW, R_PAH)
  const pahX = ox + 1.2
  const pahMoves: Move[] = [{ b0: -99, b1: 128, from: [pahX, pahY], to: [pahX, pahY], arc: 0 }]
  let qx = pahX
  for (let b = 128; b < 192; b += 2) {
    const want = peerX(b + 2) - 4
    const step = Math.max(1, Math.min(3, want - ox))
    oomMoves.push(hop(b, b + 2, [ox, oomY], [ox + step, oomY], 1.0))
    ox += step
    const pstep = Math.max(1, Math.min(3, ox + 1.3 - qx))
    pahMoves.push(hop(b + 1, b + 3, [qx, pahY], [qx + pstep, pahY], 0.8))
    qx += pstep
  }
  const trolls: Troll[] = [
    { name: 'oom', r: R_OOM, fill: OOM, wake: 64, moves: oomMoves, thumps: [64] } as Troll,
    { name: 'pah', r: R_PAH, fill: PAH, wake: 128.6, moves: pahMoves } as Troll,
  ]

  const x0 = -8
  const x1 = route.col + 4
  const scene: Placed[] = [
    scenery('mine', null, everywhere(x0, x1, -3, LOW + 1), (p, _s, c) => drawMine(p, c, { tunnel: -6.5, chasm: [bridgeAt - 0.5, bridgeAt + 29.5], low: [bridgeAt - 0.5, x1] })),
  ]
  let actRef: Act | null = null
  const cast = scenery('cast', null, everywhere(x0, x1, -3, LOW + 1), castPiece(() => trolls, () => route, origin))
  const pieces = [...scene, ...route.legs, cast]
  const u = universe(0, 'mountain-king', dovre, theme, 'plain', ball.color, pieces, beatTime(192) - origin)
  const act: Act = {
    universe: u,
    t0: origin,
    peer: route,
    trolls,
    frame: (b, peer) => {
      // Close on Peer while he is alone; wide enough for the gallery below once Oom is awake.
      const wake = Math.max(0, Math.min(1, (b - 62) / 6))
      const cells = 5.2 + wake * 2.6 + Math.max(0, Math.min(1, (b - 150) / 30)) * 0.8
      const y = peer.y * (1 - wake * 0.5) + (LOW * 0.55) * wake
      return { x: peer.x + 1.2 + wake * 0.6, y: Math.min(y, LOW - 1.2), cells }
    },
  }
  actRef = act
  void actRef
  void heads
  return act
}

/* ------------------------------------------------------------------ the hall */

function hall(prev: Act): Act {
  const theme = FEAST
  const origin = beatTime(192)
  const door = prev.peer.legs[prev.peer.legs.length - 1]
  const ball: BallState = { color: PEER(theme), ghost: false, id: 0 }
  // The door again, in the hall's light: the same beats, so it is swinging open at the cut.
  const route = new Route(door.col, door.row, door.b, ball, origin, theme)
  piece(route, 'door')
  // VII. The King's tankards, on the tune: the first note was the door.
  const lead = 192 - route.beat
  tankardsRun(route, theme_(lead, 2), 29)
  railTo(route, 256)
  railTo(route, 290)
  const x0 = door.col - 4
  const x1 = route.col + 6
  const kingY = stand(LOW, R_KING)
  const king: Troll = { name: 'king', r: R_KING, fill: KING, crown: true, wake: 192, moves: bounds(196, 288, door.col + 1, LOW, R_KING, 4, 1.6) }
  const oomY = stand(LOW, R_OOM)
  const oom: Troll = { name: 'oom', r: R_OOM, fill: OOM, wake: 0, moves: bounds(192, 288, door.col - 1, LOW, R_OOM, 2, 1.0) }
  const pah: Troll = { name: 'pah', r: R_PAH, fill: PAH, wake: 0, moves: bounds(193, 287, door.col - 1.5, LOW, R_PAH, 2, 0.8) }
  void kingY
  void oomY
  const trolls = [oom, pah, king]
  const scene = scenery('hall', null, everywhere(x0, x1, -3, LOW + 1), (p, _s, c) => drawHall(p, c, { x0, x1 }))
  const cast = scenery('cast', null, everywhere(x0, x1, -3, LOW + 1), castPiece(() => trolls, () => route, origin))
  const u = universe(1, 'mountain-king', dovre, theme, 'plain', ball.color, [scene, ...route.legs, cast], 160 - origin)
  return {
    universe: u,
    t0: origin,
    peer: route,
    trolls,
    frame: (_b, peer) => ({ x: peer.x + 1.8, y: LOW * 0.45, cells: 8.4 }),
  }
}

function theme_(lead: number, from: number): Note[] {
  return tune(lead, from, 0.3, 0.06)
}

/* ------------------------------------------------------------------ scenery */

function drawMine(p: p5, c: PieceCtx, s: { tunnel: number; chasm: [number, number]; low: [number, number] }): void {
  const { k, ink, weight, theme } = c
  // The tunnel Peer comes out of: a mouth of dark in the rock.
  solid(p, ink, weight, rockShade(theme))
  p.arc((s.tunnel - 0.2) * k, FLOOR * k, 1.1 * k, 1.5 * k, Math.PI, Math.PI * 2, p.CHORD)
  rock(p, k, ink, weight, stone(theme), s.tunnel - 1.1, -0.2, 0.7, 0.9, 11, 0.5)
  // The lower gallery, where the trolls run.
  floor(p, k, ink, weight, s.low[0], s.low[1], LOW + FLOOR)
  for (let x = Math.ceil(s.low[0]); x < s.low[1]; x += 3) prop(p, k, ink, weight, wood(theme), x + 0.3, LOW + FLOOR, LOW + 0.5)
  // The chasm's walls.
  outline(p, ink, weight)
  p.line(s.chasm[0] * k, FLOOR * k, s.chasm[0] * k, (LOW + FLOOR) * k)
  for (let x = Math.ceil(s.low[0]) + 1; x < s.low[1]; x += 7) lamp(p, k, ink, weight, gold(theme), x + 0.5, -0.9, 0.5)
  void moss
}

function drawHall(p: p5, c: PieceCtx, s: { x0: number; x1: number }): void {
  const { k, ink, weight, theme } = c
  floor(p, k, ink, weight, s.x0, s.x1, LOW + FLOOR)
  for (let x = Math.ceil(s.x0); x < s.x1; x += 6) {
    solid(p, ink, weight, wood(theme))
    p.rect((x + 0.5) * k, (-1.2 + (LOW + FLOOR + 1.2) / 2) * k, 0.3 * k, (LOW + FLOOR + 1.2) * k)
  }
}

/* ------------------------------------------------------------------ the whole */

export const DURATION = 152

export function build(): MountainKing {
  const a = mine()
  const b = hall(a)
  return new MountainKing([a, b], DURATION)
}

export { BEATS }
