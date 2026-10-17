import { LAP, PLANK, POCKET, ROWS, SLACK, W } from './geo'

/**
 * The toy as it runs: where every cube and plank is at any moment, built once from the score's cues and checked as
 * it is built. A cube is always somewhere solid: standing on a plank (and carried with it), standing on the rim, or
 * seated in its pocket, where its top is part of the plank's and another cube may walk over it. It moves only by
 * tipping over one of its bottom edges into the next cell, a quarter turn; into an open pocket it tips and drops.
 * A plank moves only along its row (a slide) or by being lifted, turned over and set back (a flip), and only with
 * nothing on it while it turns.
 */

export type Dir = 'E' | 'W' | 'N' | 'S'
export const STEP: Record<Dir, [number, number]> = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }

export const CUBES = ['black', 'red', 'yellow', 'blue', 'green'] as const
export type CubeName = (typeof CUBES)[number]

/** Where a cube is between moves. */
export type Spot =
  | { on: 'plank'; row: number; i: number }
  | { on: 'rim'; x: number; y: number }
  | { on: 'pocket'; row: number }

/** A quarter turn over one edge. */
export interface Flop {
  cube: CubeName
  dir: Dir
  /** When it starts to tip, and when it lands, show seconds. */
  t0: number
  t1: number
  /** Its own step from rest, or struck by a cube landing against it, so it leaves already moving. */
  how: 'step' | 'struck'
  from: Spot
  to: Spot
}

/** A plank sliding along its row, or turned over. */
export interface PlankMove {
  row: number
  kind: 'slide' | 'flip'
  t0: number
  t1: number
  /** Where its west end is before and after (a flip leaves it where it was). */
  from: number
  to: number
}

/** What the score says happens, in show seconds. */
export type Cue =
  | { kind: 'flop'; cube: CubeName; dir: Dir; t0: number; t1: number; how: 'step' | 'struck' }
  | { kind: 'slide'; row: number; to: number; t0: number; t1: number }
  | { kind: 'flip'; row: number; t0: number; t1: number }

export interface Setup {
  /** Each row's plank: where its west end is, and whether its pocket is up. */
  planks: { at: number; up: boolean }[]
  cubes: Record<CubeName, Spot>
  /** Whose pocket each row's is. */
  homes: CubeName[]
}

export interface PlankState {
  row: number
  /** Where its west end is (between cells while it slides). */
  at: number
  /** Whether its pocket is up, once any turn it is making is done. */
  up: boolean
  /** Turning over: how far, 0 to 1, and whether the pocket was up when it began. */
  flip: { u: number; wasUp: boolean } | null
  /** Who is seated in its pocket, if anyone (and they have finished dropping in). */
  seated: CubeName | null
}

export interface CubeState {
  name: CubeName
  /** Where it is, or where it is going from. */
  spot: Spot
  /** Tipping: the flop, and how far through it, 0 to 1. */
  flop: { move: Flop; u: number } | null
}

const RIM = new Set(LAP.map(([x, y]) => `${x},${y}`))
export const onRim = (x: number, y: number): boolean => RIM.has(`${x},${y}`)

export class Machine {
  readonly flops: Flop[] = []
  readonly moves: PlankMove[] = []
  readonly problems: string[] = []
  private readonly byCube = new Map<CubeName, Flop[]>()
  private readonly byRow = new Map<number, PlankMove[]>()

  constructor(
    readonly setup: Setup,
    cues: Cue[],
  ) {
    for (const c of CUBES) this.byCube.set(c, [])
    for (let r = 0; r < ROWS; r++) this.byRow.set(r, [])
    // Plank moves first: a flop asks where the planks are.
    const plankCues = cues.filter((c): c is Exclude<Cue, { kind: 'flop' }> => c.kind !== 'flop').sort((a, b) => a.t0 - b.t0)
    const at = setup.planks.map((p) => p.at)
    for (const c of plankCues) {
      const list = this.byRow.get(c.row)!
      const last = list[list.length - 1]
      if (last && c.t0 < last.t1) this.problems.push(`row ${c.row}: a ${c.kind} at ${c.t0.toFixed(2)} s before its last move is done`)
      const to = c.kind === 'slide' ? c.to : at[c.row]
      if (to < 0 || to > SLACK || !Number.isInteger(to)) this.problems.push(`row ${c.row}: slid to ${to}, outside the tray`)
      const move: PlankMove = { row: c.row, kind: c.kind, t0: c.t0, t1: c.t1, from: at[c.row], to }
      list.push(move)
      this.moves.push(move)
      at[c.row] = to
    }
    // Then every cube's flops in order.
    const spots = new Map<CubeName, Spot>(CUBES.map((c) => [c, setup.cubes[c]]))
    const flopCues = cues.filter((c): c is Extract<Cue, { kind: 'flop' }> => c.kind === 'flop').sort((a, b) => a.t0 - b.t0)
    for (const c of flopCues) {
      const list = this.byCube.get(c.cube)!
      const last = list[list.length - 1]
      const name = `${c.cube} ${c.dir} landing ${c.t1.toFixed(2)} s`
      if (last && c.t0 < last.t1 - 1e-9) this.problems.push(`${name}: starts before its last flop lands`)
      const from = spots.get(c.cube)!
      if (from.on === 'pocket') this.problems.push(`${name}: is seated, and cannot leave its pocket`)
      const [x, y] = this.cell(from, c.t0)
      const [dx, dy] = STEP[c.dir]
      const tx = x + dx
      const ty = y + dy
      const to = this.target(c.cube, tx, ty, c.t0, c.t1, spots, name)
      // Neither the plank it leaves nor the one it lands on may move under it.
      for (const s of [from, to]) {
        if (s.on === 'rim') continue
        if (this.plankBusy(s.row, c.t0, c.t1)) this.problems.push(`${name}: plank ${s.row} moves under it`)
      }
      const flop: Flop = { cube: c.cube, dir: c.dir, t0: c.t0, t1: c.t1, how: c.how, from, to }
      list.push(flop)
      this.flops.push(flop)
      spots.set(c.cube, to)
    }
    this.flops.sort((a, b) => a.t0 - b.t0)
    this.checkFlips()
    this.checkRoom()
  }

  /** A plank's west end at `t`. */
  plankAt(row: number, t: number): number {
    let x = this.setup.planks[row].at
    for (const m of this.byRow.get(row)!) {
      if (t >= m.t1) x = m.to
      else if (t > m.t0) return m.from + (m.to - m.from) * slideEase((t - m.t0) / (m.t1 - m.t0))
      else break
    }
    return x
  }

  /** Whether a plank's pocket is up at `t` (counting a turn as done when it is). */
  upAt(row: number, t: number): boolean {
    let up = this.setup.planks[row].up
    for (const m of this.byRow.get(row)!) if (m.kind === 'flip' && t >= m.t1) up = !up
    return up
  }

  private plankBusy(row: number, t0: number, t1: number): boolean {
    return this.byRow.get(row)!.some((m) => m.t0 < t1 - 1e-9 && m.t1 > t0 + 1e-9)
  }

  /** The cell a spot is at, at `t` (rounded: asked only while its plank stands). */
  cell(s: Spot, t: number): [number, number] {
    if (s.on === 'rim') return [s.x, s.y]
    if (s.on === 'pocket') return [Math.round(this.plankAt(s.row, t)) + POCKET, s.row]
    return [Math.round(this.plankAt(s.row, t)) + s.i, s.row]
  }

  /** What a cube tipping into cell `tx, ty` lands on. */
  private target(cube: CubeName, tx: number, ty: number, t0: number, t1: number, spots: Map<CubeName, Spot>, name: string): Spot {
    if (onRim(tx, ty)) return { on: 'rim', x: tx, y: ty }
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= W) {
      this.problems.push(`${name}: tips off the toy into ${tx},${ty}`)
      return { on: 'rim', x: tx, y: ty }
    }
    const west = this.plankAt(ty, t0)
    const i = tx - Math.round(west)
    if (i < 0 || i >= PLANK) {
      this.problems.push(`${name}: tips into the tray's floor at ${tx},${ty}, past plank ${ty}'s end`)
      return { on: 'plank', row: ty, i }
    }
    if (i === POCKET && this.upAt(ty, t0)) {
      const seated = [...spots.entries()].find(([, s]) => s.on === 'pocket' && s.row === ty)
      if (!seated) {
        if (this.setup.homes[ty] !== cube) this.problems.push(`${name}: drops into ${this.setup.homes[ty]}'s pocket`)
        return { on: 'pocket', row: ty }
      }
    }
    void t1
    return { on: 'plank', row: ty, i }
  }

  /** No plank turns over with anything on it, seated or standing. */
  private checkFlips(): void {
    for (const m of this.moves) {
      if (m.kind !== 'flip') continue
      for (const c of CUBES) {
        for (const t of [m.t0, (m.t0 + m.t1) / 2, m.t1]) {
          const s = this.cubeAt(c, t)
          const spots = s.flop ? [s.flop.move.from, s.flop.move.to] : [s.spot]
          if (spots.some((p) => p.on !== 'rim' && p.row === m.row)) {
            this.problems.push(`row ${m.row}: turned over at ${m.t0.toFixed(2)} s with ${c} on it`)
            break
          }
        }
      }
    }
  }

  /** Never two cubes in one place: a tipping cube holds the cell it leaves and the one it lands in. */
  private checkRoom(): void {
    const end = Math.max(0, ...this.flops.map((f) => f.t1), ...this.moves.map((m) => m.t1)) + 1
    let told = 0
    for (let t = 0; t <= end && told < 12; t += 1 / 60) {
      const held = new Map<string, CubeName>()
      for (const c of CUBES) {
        const s = this.cubeAt(c, t)
        const spots = s.flop ? [s.flop.move.from, s.flop.move.to] : [s.spot]
        for (const p of spots) {
          const [x, y] = this.cellNow(p, t)
          const key = `${Math.round(x * 4) / 4},${y},${p.on === 'pocket' ? -1 : 0}`
          const other = held.get(key)
          if (other && other !== c) {
            this.problems.push(`${c} and ${other} both at ${key} at ${t.toFixed(2)} s`)
            told++
          }
          held.set(key, c)
        }
      }
    }
  }

  /** A spot's cell at `t`, between cells while its plank slides. */
  cellNow(s: Spot, t: number): [number, number] {
    if (s.on === 'rim') return [s.x, s.y]
    const west = this.plankAt(s.row, t)
    return [west + (s.on === 'pocket' ? POCKET : s.i), s.row]
  }

  plank(row: number, t: number): PlankState {
    let flip: PlankState['flip'] = null
    let up = this.setup.planks[row].up
    for (const m of this.byRow.get(row)!) {
      if (m.kind !== 'flip') continue
      if (t >= m.t1) up = !up
      else if (t > m.t0) flip = { u: (t - m.t0) / (m.t1 - m.t0), wasUp: up }
    }
    let seated: CubeName | null = null
    for (const c of CUBES) {
      const s = this.cubeAt(c, t)
      if (!s.flop && s.spot.on === 'pocket' && s.spot.row === row) seated = c
    }
    return { row, at: this.plankAt(row, t), up, flip, seated }
  }

  cubeAt(name: CubeName, t: number): CubeState {
    let spot = this.setup.cubes[name]
    for (const f of this.byCube.get(name)!) {
      if (t >= f.t1) spot = f.to
      else if (t > f.t0) return { name, spot: f.from, flop: { move: f, u: (t - f.t0) / (f.t1 - f.t0) } }
      else break
    }
    return { name, spot, flop: null }
  }

  /** Every landing, in order: what the check holds to the music. */
  landings(): { cube: CubeName; t: number; how: Flop['how']; drop: boolean }[] {
    return this.flops.map((f) => ({ cube: f.cube, t: f.t1, how: f.how, drop: f.to.on === 'pocket' }))
  }
}

/** A slide: away gently and home gently, no overshoot. */
export function slideEase(u: number): number {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (v * 6 - 15) + 10)
}
