/**
 * Cornfield Chase, [Opus 5.5] Music-sync. Stock lanes only: the arrangement is
 * the piece order, the exit variant and the rail breaths. Nothing retimes a lane.
 *
 * The targets are measured, not assumed (`cornfield-opus55-onsets.py` →
 * `show-plans/cornfield-opus55-onsets.json`): the piano's own notes over the
 * field, the organ's onsets as it gathers, and every eighth of the chase on
 * the 96.0 bpm comb that the chase actually keeps.
 *
 * The lock is hard: every stock strike (a mechanism's `lane.fire`) must land
 * on a measured target, or the piece is not placed there. Within that, a
 * lattice search over targets pays for every downbeat, beat and eighth that
 * no strike covers, and for the error of the ones that are covered. The
 * portal hop and the booth-and-ticket finale are searched jointly with the
 * music on either side of them.
 *
 * Run: npm run generate:cornfield:opus55
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { makeRng } from '../src/core/rng'
import { ballAt, laneAt, laneTime, pointsOf, type BallState, type Pt } from '../apps/rube/src/parts'
import type { Piece } from '../apps/rube/src/parts'
import { portalPlacement } from '../apps/rube/src/pieces/portal'
import { StockShow } from '../apps/rube/src/shows/stock/show'
import type { StockMap, StockPiece, StockScore, StockSpec } from '../apps/rube/src/shows/stock/types'
import type { Phrase } from '../apps/rube/src/timed/premiere-arabesque/types'
import { worldByName, type World } from '../apps/rube/src/worlds'
import { stockPlacement } from './stock-placement'

const FOLDER = 'apps/rube/src/shows/versions/cornfield-chase'
const TAKE = 'opus55-music-sync'
const BALL0: BallState = { color: '#E76B31', ghost: false, id: 0 }

interface Onsets {
  duration: number
  period: number
  origin: number
  drop: { beat: number; t: number }
  organ: number
  last: { beat: number; t: number }
  piano: { t: number; s: number }[]
  gather: { t: number; s: number }[]
  eighths: { beat: number; t: number; onset: number | null; s: number }[]
}

const ONSETS = JSON.parse(readFileSync('scripts/show-plans/cornfield-opus55-onsets.json', 'utf8')) as Onsets
const beatAt = (k: number): number => ONSETS.origin + k * ONSETS.period
/** The chase, in bars from the drop: beat 68 is a downbeat, and a phrase is four bars. */
const DOWNBEAT = (k: number): boolean => Number.isInteger(k) && (k - 68) % 4 === 0
const PHRASE = (k: number): boolean => Number.isInteger(k) && (k - 68) % 16 === 0
/** Where the organ swells to its full weight: four phrases after the drop. */
const FULL_ORGAN = 132
/** The booth's flash may fall on any beat of the last phrase before the ticket's hit. */
const BOOTH_BEATS: [number, number] = [184, 189.5]

type Section = 'field' | 'gather' | 'drop' | 'chase' | 'climax' | 'last'

interface Target {
  time: number
  section: Section
  /** Paid when no strike covers it. */
  skip: number
  /** Taken off when a strike covers it: the field and the organ reward a hit rather than punish a miss. */
  bonus: number
  tol: number
  beat?: number
  kind: 'note' | 'down' | 'beat' | 'eighth'
}

interface Variant {
  name: string
  exit: Pt | null
  portal?: 'in' | 'out'
  dur: number
  fire: number
  cells: Pt[]
  exitAt: Pt
  exitDir: 1 | -1
  flight: boolean
}

interface Node {
  cursor: number
  col: number
  row: number
  mirror: 1 | -1
  occupied: Set<string>
  specs: StockSpec[]
  cost: number
  used: Map<string, number>
  last: string
  /** The last target index whose miss has already been charged. */
  paid: number
  hits: { target: number; name: string; at: number }[]
  /** Once through the portal: the Forest route this Arcade continues, and where it ended. */
  forest?: { specs: StockSpec[]; end: number }
}

/* ------------------------------------------------------------------ targets */

function targets(): Target[] {
  const out: Target[] = []
  // The piano, rubato. Only notes that stand out; the stronger, the more a hit is worth. Nothing is owed for a miss:
  // the Forest's machines are long, and the field is for seeing them before they fire.
  for (const n of ONSETS.piano) {
    if (n.s < 0.5 || n.t < 2.5) continue
    out.push({ time: n.t, section: 'field', skip: 0, bonus: 0.2 + 0.35 * Math.min(1.4, n.s), tol: 0.04, kind: 'note' })
  }
  // The organ gathering: its own onsets, the fill into the drop included. Owed, lightly.
  for (const n of ONSETS.gather) {
    if (n.s < 0.3) continue
    out.push({ time: n.t, section: 'gather', skip: 0.12 * Math.min(1.3, n.s), bonus: 0.1 + 0.2 * Math.min(1.3, n.s), tol: 0.03, kind: 'note' })
  }
  out.push({ time: ONSETS.drop.t, section: 'drop', skip: 0, bonus: 0, tol: 0.02, beat: 68, kind: 'down' })
  // The chase: every eighth on the comb, from the one after the drop to the last hit. Downbeats owe most.
  for (const e of ONSETS.eighths) {
    if (e.beat <= 68 || e.beat >= ONSETS.last.beat) continue
    const kind: Target['kind'] = DOWNBEAT(e.beat) ? 'down' : Number.isInteger(e.beat) ? 'beat' : 'eighth'
    const loud = 0.7 + 0.3 * Math.min(1.5, e.s)
    const skip = (kind === 'down' ? 1.0 : kind === 'beat' ? 0.75 : 0.1) * loud
    const bonus = kind === 'eighth' ? 0.2 : 0
    out.push({ time: e.t, section: e.beat < FULL_ORGAN ? 'chase' : 'climax', skip, bonus, tol: 0.026, beat: e.beat, kind })
  }
  out.push({ time: ONSETS.last.t, section: 'last', skip: 0, bonus: 0, tol: 0.03, beat: ONSETS.last.beat, kind: 'down' })
  return out.sort((a, b) => a.time - b.time)
}

/* ------------------------------------------------------------------ variants */

function specOf(v: Variant): StockSpec {
  const spec: StockSpec = { name: v.name }
  if (v.portal) spec.portal = v.portal
  else if (v.exit) spec.exit = [v.exit[0], v.exit[1]]
  return spec
}

/** Every exit a stock piece offers, measured through the same placement the score is compiled with. */
function enumerate(world: World, piece: Piece): Variant[] {
  const theme = world.themes[0]
  const found = new Set<string>()
  const out: Variant[] = []
  for (let n = 0; n < 16; n++) {
    let seen: Pt | null = null
    const placed = piece.place({
      rng: makeRng('stock'), color: theme.colors[1], theme, ball: BALL0, earned: 600, taste: { weights: {} },
      fits(_cells, exit) {
        const key = `${exit[0]},${exit[1]}`
        if (found.has(key)) return false
        seen = [exit[0], exit[1]]
        return true
      },
    })
    if (!placed || !seen) break
    const exit: Pt = seen
    found.add(`${exit[0]},${exit[1]}`)
    const check = stockPlacement(world, { name: piece.name, exit }, BALL0, 1)
    if (Math.abs(laneTime(check.lane) - laneTime(placed.lane)) > 1e-9) throw new Error(`${world.name}/${piece.name} exit ${exit} did not round-trip`)
    out.push({
      name: piece.name, exit, dur: laneTime(check.lane), fire: check.lane.fire,
      cells: check.cells.map((c) => [c[0], c[1]]), exitAt: [check.exit.at[0], check.exit.at[1]], exitDir: check.exit.dir,
      flight: !!piece.flight,
    })
  }
  return out
}

function portalVariant(kind: 'in' | 'out'): Variant {
  const placed = portalPlacement(kind, BALL0.color)
  return {
    name: 'portal', exit: null, portal: kind, dur: laneTime(placed.lane), fire: placed.lane.fire,
    cells: placed.cells.map((c) => [c[0], c[1]]), exitAt: [placed.exit.at[0], placed.exit.at[1]], exitDir: placed.exit.dir, flight: false,
  }
}

/** The search trusts each variant's clock. Prove the clock does not move with the ball, the index or the payout. */
function assertStable(world: World, variants: Variant[]): void {
  const alt: BallState = { color: '#3FC4D2', ghost: true, id: 4 }
  for (const v of variants) {
    if (!v.exit) continue
    for (const [index, ball, earned] of [[0, BALL0, 600], [5, alt, 5200]] as const) {
      const placed = stockPlacement(world, { name: v.name, exit: v.exit }, ball, index, earned)
      const same = Math.abs(laneTime(placed.lane) - v.dur) < 1e-9 && Math.abs(placed.lane.fire - v.fire) < 1e-9
        && JSON.stringify(placed.cells) === JSON.stringify(v.cells)
        && placed.exit.at[0] === v.exitAt[0] && placed.exit.at[1] === v.exitAt[1] && placed.exit.dir === v.exitDir
      if (!same) throw new Error(`${world.name}/${v.name} clock or geometry depends on ball, index or payout`)
    }
  }
}

/* ------------------------------------------------------------------ search */

/** Lay a chain after a node. Only the cells are copied, and only when the chain fits. */
function lay(node: Node, chain: Variant[]): Node | null {
  let { col, row, mirror, cursor } = node
  const added: string[] = []
  for (const v of chain) {
    for (const [x, y] of v.cells) {
      const key = `${col + mirror * x},${row + y}`
      if (node.occupied.has(key) || added.includes(key)) return null
      added.push(key)
    }
    cursor += v.dur
    col += mirror * v.exitAt[0]
    row += v.exitAt[1]
    mirror = (mirror * v.exitDir) as 1 | -1
  }
  const occupied = new Set(node.occupied)
  for (const k of added) occupied.add(k)
  return { ...node, col, row, mirror, cursor, occupied, specs: [...node.specs, ...chain.map(specOf)] }
}

function fresh(cursor: number, paid: number): Node {
  return { cursor, col: 0, row: 0, mirror: 1, occupied: new Set(), specs: [], cost: 0, used: new Map(), last: '', paid, hits: [] }
}

class Lattice {
  readonly skipSum: number[]
  constructor(readonly list: Target[]) {
    this.skipSum = [0]
    for (const t of list) this.skipSum.push(this.skipSum.at(-1)! + t.skip)
  }
  /** Sum of misses over target indices a..b inclusive. */
  owed(a: number, b: number): number { return b < a ? 0 : this.skipSum[b + 1] - this.skipSum[a] }
  /** The target a strike at `time` lands on, if any, after index `after`. */
  landing(time: number, after: number): number {
    let lo = after + 1, hi = this.list.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.list[mid].time < time) lo = mid + 1
      else hi = mid
    }
    for (const i of [lo - 1, lo]) {
      if (i > after && i < this.list.length && Math.abs(this.list[i].time - time) <= this.list[i].tol) return i
    }
    return -1
  }
  /** Charge every target the node can no longer reach: those before its earliest possible next strike. */
  commit(node: Node, earliest: number): Node {
    let paid = node.paid
    while (paid + 1 < this.list.length && this.list[paid + 1].time < node.cursor + earliest - this.list[paid + 1].tol) paid++
    return { ...node, cost: node.cost + this.owed(node.paid + 1, paid), paid }
  }
}

interface Style {
  maxRails: number
  railCost: number
  repeat(count: number, same: boolean, v: Variant): number
  shape(v: Variant, target: Target, row: number): number
}

const FIELD: Style = {
  maxRails: 9,
  railCost: 0.012,
  // A walk through the Forest: a machine seen twice has to earn it.
  repeat: (count, same) => (same ? 1 : 0) + 0.55 * count,
  shape(v, target, row) {
    let c = 0
    if (target.section === 'field' && v.dur < 0.9) c += 0.25 // the field is for long machines
    if (target.section === 'field' && v.dur >= 1.6) c -= 0.12
    if (target.section === 'gather' && v.dur > 1.5) c += 0.15 // the organ moves faster
    if (Math.abs(row) > 5) c += 0.2 * (Math.abs(row) - 5)
    return c
  },
}

const CHASE: Style = {
  maxRails: 3,
  railCost: 0.03,
  // An ostinato is allowed to come back; the same machine twice running is not.
  repeat: (count, same) => (same ? 0.15 : 0) + (count > 5 ? 0.04 * (count - 5) : 0) - (count === 0 ? 0.2 : 0),
  shape(v, target, row) {
    let c = 0
    if (target.kind === 'down' && v.flight) c -= 0.12
    if (target.beat !== undefined && PHRASE(target.beat) && v.flight) c -= 0.2
    if (target.kind === 'eighth' && v.dur > 1.4) c += 0.1
    if (Math.abs(row) > 5) c += 0.15 * (Math.abs(row) - 5)
    return c
  },
}

const ERR = 6 // cost per second of strike error: 25 ms costs 0.15

function extend(lat: Lattice, node: Node, j: number, v: Variant, rails: number, rail: Variant, style: Style, earliest: number): Node | null {
  const target = lat.list[j]
  const strike = node.cursor + rails * rail.dur + v.fire
  const laid = lay(node, [...Array(rails).fill(rail), v])
  if (!laid) return null
  const count = node.used.get(v.name) ?? 0
  let cost = node.cost + lat.owed(node.paid + 1, j - 1) - target.bonus + Math.abs(strike - target.time) * ERR
  cost += rails * style.railCost + style.repeat(count, v.name === node.last, v) + style.shape(v, target, laid.row)
  const used = new Map(node.used)
  used.set(v.name, count + 1)
  return lat.commit({ ...laid, cost, used, last: v.name, paid: j, hits: [...node.hits, { target: j, name: v.name, at: strike }] }, earliest)
}

/** Expand every kept node at every target, in time order. Returns the beam kept at each target. */
function search(lat: Lattice, starts: Map<number, Node[]>, variants: Variant[], rail: Variant, style: Style, until: number, width: number): Map<number, Node[]> {
  const earliest = Math.min(...variants.map((v) => v.fire))
  const pending = new Map<number, Node[]>(starts)
  const kept = new Map<number, Node[]>()
  const keys = [...pending.keys()].sort((a, b) => a - b)
  for (let j = keys[0]; j < lat.list.length && lat.list[Math.max(0, j)].time <= until; j++) {
    const beam = prune(pending.get(j) ?? [], width)
    pending.delete(j)
    if (!beam.length) continue
    kept.set(j, beam)
    for (const node of beam) {
      for (const v of variants) {
        for (let n = 0; n <= style.maxRails; n++) {
          const strike = node.cursor + n * rail.dur + v.fire
          const k = lat.landing(strike, j)
          if (k < 0 || lat.list[k].time > until) continue
          const next = extend(lat, node, k, v, n, rail, style, earliest)
          if (!next) continue
          const list = pending.get(k) ?? []
          list.push(next)
          // Keep memory flat: a target's queue is thinned long before it is expanded.
          pending.set(k, list.length > width * 6 ? prune(list, width * 2) : list)
        }
      }
    }
  }
  return kept
}

function prune(nodes: Node[], width: number): Node[] {
  nodes.sort((a, b) => a.cost - b.cost || a.cursor - b.cursor)
  const out: Node[] = []
  for (const n of nodes) {
    if (out.some((k) => Math.abs(k.cursor - n.cursor) < 0.012 && k.last === n.last && k.row === n.row && k.col === n.col)) continue
    out.push(n)
    if (out.length === width) break
  }
  return out
}

/* ------------------------------------------------------------------ compile */

/** The real placement, piece by piece, as the player will see it. Checks every join and every cell. */
function compile(worldName: StockMap['world'], specs: StockSpec[], begin: number, ballIn: BallState, backdrop: StockMap['backdrop']): { map: StockMap; ball: BallState } {
  const world = worldByName(worldName)!
  const map: StockMap = { world: worldName, begin, end: begin, backdrop, pieces: [] }
  let col = 0, row = 0, mirror: 1 | -1 = 1, cursor = begin, ball = ballIn, earned = 0
  const occupied = new Set<string>()
  for (const [i, spec] of specs.entries()) {
    const placed = stockPlacement(world, spec, ball, i, spec.name === 'ticket' ? earned : undefined)
    const cells: Pt[] = placed.cells.map(([x, y]) => [col + mirror * x, row + y])
    for (const cell of cells) {
      const key = cell.join(',')
      if (occupied.has(key)) throw new Error(`${worldName}/${spec.name} overlaps ${key} at ${cursor.toFixed(3)}`)
      occupied.add(key)
    }
    const duration = laneTime(placed.lane)
    const piece: StockPiece = {
      spec, begin: cursor, end: cursor + duration, col, row, mirror, cells,
      lane: placed.lane, state: placed.state, ballIn: ball, changes: placed.changes ?? [],
    }
    const previous = map.pieces.at(-1)
    if (previous) {
      const a = laneAt(previous.lane, laneTime(previous.lane))
      const b = laneAt(piece.lane, 0)
      const gap = Math.hypot(previous.col + previous.mirror * a.x - col - mirror * b.x, previous.row + a.y - row - b.y)
      if (gap > 1e-6) throw new Error(`${worldName}/${spec.name} is disconnected by ${gap}`)
    }
    map.pieces.push(piece)
    cursor = piece.end
    ball = ballAt(ball, piece.changes, duration)
    const stock = world.pieces.find((p) => p.name === spec.name)
    if (stock) earned += pointsOf(stock, placed.state)
    col += mirror * placed.exit.at[0]
    row += placed.exit.at[1]
    mirror = (mirror * placed.exit.dir) as 1 | -1
  }
  map.end = cursor
  return { map, ball }
}

/* ------------------------------------------------------------------ main */

function main(): void {
  const garden = worldByName('garden')!
  const arcade = worldByName('arcade')!
  const skip = new Set(['portal', 'rail', 'booth', 'ticket'])
  const gardenVariants = garden.pieces.filter((p) => !skip.has(p.name)).flatMap((p) => enumerate(garden, p))
  const arcadeVariants = arcade.pieces.filter((p) => !skip.has(p.name)).flatMap((p) => enumerate(arcade, p))
  const gardenRail = enumerate(garden, garden.pieces.find((p) => p.name === 'rail')!)[0]
  const arcadeRail = enumerate(arcade, arcade.pieces.find((p) => p.name === 'rail')!)[0]
  const booths = enumerate(arcade, arcade.pieces.find((p) => p.name === 'booth')!)
  const tickets = enumerate(arcade, arcade.pieces.find((p) => p.name === 'ticket')!)
  assertStable(garden, gardenVariants)
  assertStable(arcade, [...arcadeVariants, ...booths, ...tickets])
  const outPortal = portalVariant('out')
  const inPortal = portalVariant('in')
  console.log(`variants garden ${gardenVariants.length}, arcade ${arcadeVariants.length}; rail ${gardenRail.dur.toFixed(3)}s, portal ${outPortal.dur.toFixed(3)}+${inPortal.dur.toFixed(3)}s`)

  const list = targets()
  const lat = new Lattice(list)
  const drop = list.findIndex((t) => t.section === 'drop')
  const last = list.length - 1
  console.log(`targets ${list.length}: field ${list.filter((t) => t.section === 'field').length}, gather ${list.filter((t) => t.section === 'gather').length}, chase ${list.filter((t) => t.section === 'chase' || t.section === 'climax').length}; drop ${list[drop].time.toFixed(3)}s, last ${list[last].time.toFixed(3)}s`)

  // 1. The Forest: the piano and the organ, up to just before the drop.
  const forest = search(lat, new Map([[-1, [fresh(0, -1)]]]), gardenVariants, gardenRail, FIELD, list[drop].time - 0.15, 24)

  // 2. The portal, searched with the music on both sides: out of the Forest, into the Arcade, and a flight on the drop.
  const flights = arcadeVariants.filter((v) => v.flight)
  let entries: Node[] = []
  for (const [j, beam] of forest) {
    if (j < 0 || list[j].time < list[drop].time - 6) continue
    for (const node of beam) {
      for (let n = 0; n <= 10; n++) {
        const door = lay(node, [...Array(n).fill(gardenRail), outPortal])
        if (!door) continue
        const arcadeBegin = door.cursor
        for (let m = 0; m <= 3; m++) {
          const entered = lay(fresh(arcadeBegin, drop - 1), [inPortal, ...Array(m).fill(arcadeRail)])!
          for (const v of flights) {
            const strike = entered.cursor + v.fire
            if (Math.abs(strike - list[drop].time) > list[drop].tol) continue
            const laid = lay(entered, [v])!
            // The drop is the biggest moment in the recording: a long flight, not a flick.
            const big = v.dur >= 0.9 ? -0.8 : 0
            const cost = node.cost + lat.owed(node.paid + 1, drop - 1) + n * 0.02 + m * 0.03 + Math.abs(strike - list[drop].time) * ERR * 2 + big
            entries.push(lat.commit({
              ...laid, cost, used: new Map([[v.name, 1]]), last: v.name, paid: drop,
              hits: [...node.hits, { target: drop, name: v.name, at: strike }],
              // The Forest's route rides along for the compile.
              forest: { specs: door.specs, end: arcadeBegin },
            }, Math.min(...arcadeVariants.map((a) => a.fire))))
          }
        }
      }
    }
  }
  entries = prune(entries, 16)
  if (!entries.length) throw new Error('no portal lands a flight on the drop')
  console.log(`portal: ${entries.length} ways onto the drop, best ${entries[0].cost.toFixed(2)} via ${entries[0].last}`)

  // 3. The chase, eighth by eighth, up to the last phrase.
  const lastBooth = beatAt(BOOTH_BEATS[1]) + 0.03
  const chase = search(lat, new Map([[drop, entries]]), arcadeVariants, arcadeRail, CHASE, lastBooth, 90)

  // 4. The finale: the booth's flash on a beat of the last phrase, the ticket's payout on the last hit, then the door.
  let best: { cost: number; node: Node; specs: StockSpec[]; booth: number; flash: number } | null = null
  for (const [j, beam] of chase) {
    if (list[j].time < beatAt(BOOTH_BEATS[0]) - 4) continue
    for (const node of beam) {
      for (let a = 0; a <= 4; a++) {
        for (const booth of booths) {
          const flash = node.cursor + a * arcadeRail.dur + booth.fire
          const k = lat.landing(flash, j)
          const bt = list[k]?.beat
          if (k < 0 || bt === undefined || !Number.isInteger(bt) || bt < BOOTH_BEATS[0] || bt > BOOTH_BEATS[1]) continue
          const shot = lay(node, [...Array(a).fill(arcadeRail), booth])
          if (!shot) continue
          for (let b = 0; b <= 6; b++) {
            for (const ticket of tickets) {
              const pay = shot.cursor + b * arcadeRail.dur + ticket.fire
              if (Math.abs(pay - list[last].time) > list[last].tol) continue
              const paid = lay(shot, [...Array(b).fill(arcadeRail), ticket])
              if (!paid) continue
              for (let c = 0; c <= 3; c++) {
                const closed = lay(paid, [...Array(c).fill(arcadeRail), outPortal])
                if (!closed || closed.cursor > ONSETS.duration - 3) continue
                const cost = node.cost + lat.owed(node.paid + 1, k - 1) + lat.owed(k + 1, last - 1) * 0.5
                  + Math.abs(flash - list[k].time) * ERR + Math.abs(pay - list[last].time) * ERR
                  + (a + b + c) * 0.03 + Math.max(0, 3 - b) * 0.15 // a breath between the photograph and the payout
                if (!best || cost < best.cost) {
                  const hits = [...node.hits, { target: k, name: 'booth', at: flash }, { target: last, name: 'ticket', at: pay }]
                  best = { cost, node: { ...node, hits }, specs: closed.specs, booth: k, flash }
                }
              }
            }
          }
        }
      }
    }
  }
  if (!best) throw new Error('no finale lands the booth on the last phrase and the ticket on the last hit')

  const forestRoute = best.node.forest!
  const gardenCompiled = compile('garden', forestRoute.specs, 0, BALL0, 'sprigs')
  if (Math.abs(gardenCompiled.map.end - forestRoute.end) > 1e-9) throw new Error('the Forest compiled to a different length than it was searched at')
  const arcadeCompiled = compile('arcade', best.specs, gardenCompiled.map.end, gardenCompiled.ball, 'stars')
  const maps = [gardenCompiled.map, arcadeCompiled.map]

  // 5. Measure what was compiled, not what was planned: every stock strike against the targets.
  const pieces = maps.flatMap((m) => m.pieces)
  const strikes = pieces.filter((p) => p.spec.name !== 'rail' && !p.spec.portal).map((p) => ({ name: p.spec.name, at: p.begin + p.lane.fire }))
  const locked = strikes.map((s) => {
    const k = lat.landing(s.at, -1)
    return { ...s, target: k, err: k < 0 ? Infinity : s.at - list[k].time }
  })
  const loose = locked.filter((s) => s.target < 0)
  if (loose.length) throw new Error(`strikes off every target: ${loose.map((s) => `${s.name}@${s.at.toFixed(3)}`).join(', ')}`)
  const planned = best.node.hits
  if (planned.length !== strikes.length || planned.some((h, i) => h.name !== strikes[i].name || Math.abs(h.at - strikes[i].at) > 1e-6)) {
    throw new Error('the compiled strikes are not the strikes the search planned')
  }
  const covered = new Set(locked.map((s) => s.target))
  const stats = summarize(list, covered, locked)
  for (const line of stats.lines) console.log(line)

  const booth = arcadeCompiled.map.pieces.find((p) => p.spec.name === 'booth')!
  const phrases: Phrase[] = [
    { begin: 0, end: ONSETS.organ, title: 'Piano over the field', visible: 8.6 },
    { begin: ONSETS.organ, end: list[drop].time, title: 'The organ gathers', visible: 6.6 },
    { begin: list[drop].time, end: beatAt(FULL_ORGAN), title: 'Cornfield chase', visible: 4.8 },
    { begin: beatAt(FULL_ORGAN), end: booth.begin, title: 'Full organ', visible: 4.3 },
    { begin: booth.begin, end: ONSETS.duration, title: 'The photograph', visible: 7.5 },
  ]
  const score: StockScore = {
    id: `cornfield-chase/${TAKE}`,
    title: 'Cornfield Chase',
    performer: 'Hans Zimmer',
    audioOffset: 0,
    duration: ONSETS.duration,
    phrases,
    maps,
    cues: locked.filter((s) => list[s.target].kind === 'down' || list[s.target].section === 'drop' || list[s.target].section === 'last')
      .map((s) => ({ piece: s.name, target: list[s.target].time, actual: s.at })),
    scores: ['arcade'],
  }
  const show = new StockShow(score)
  for (let t = 0; t <= score.duration; t += 0.1) {
    const here = show.at(t)
    const cam = show.camera(t)
    if (![here.x, here.y, cam.x, cam.y, cam.cells].every(Number.isFinite)) throw new Error(`non-finite frame at ${t}`)
  }

  writeFileSync(`${FOLDER}/${TAKE}.generated.json`, JSON.stringify(score) + '\n')
  writeFileSync('scripts/show-plans/cornfield-opus55.json', JSON.stringify(maps.map((m) => ({
    world: m.world, target: m.end, pieces: m.pieces.map((p) => p.spec),
  })), null, 2) + '\n')
  writeFileSync('docs/promo/CORNFIELD_CHASE_OPUS55.md', report(score, list, locked, stats))
  console.log(`wrote ${FOLDER}/${TAKE}.generated.json: Forest ends ${gardenCompiled.map.end.toFixed(3)}s, Arcade ends ${arcadeCompiled.map.end.toFixed(3)}s, flash ${best.flash.toFixed(3)}s`)
}

/* ------------------------------------------------------------------ report */

interface Locked { name: string; at: number; target: number; err: number }
interface Stats { lines: string[]; rows: string[][]; strikes: number; meanAll: number; worst: number }

function summarize(list: Target[], covered: Set<number>, locked: Locked[]): Stats {
  const rows: string[][] = []
  const group = (label: string, pick: (t: Target) => boolean) => {
    const idx = list.map((t, i) => [t, i] as const).filter(([t]) => pick(t)).map(([, i]) => i)
    const hit = idx.filter((i) => covered.has(i))
    const errs = locked.filter((s) => idx.includes(s.target)).map((s) => Math.abs(s.err) * 1000)
    const mean = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : 0
    rows.push([label, String(idx.length), String(hit.length), `${Math.round(100 * hit.length / Math.max(1, idx.length))}%`, mean.toFixed(1), errs.length ? Math.max(...errs).toFixed(1) : '–'])
  }
  const chase = (t: Target) => t.section === 'chase' || t.section === 'climax'
  group('Piano notes (field)', (t) => t.section === 'field')
  group('Organ onsets (gather)', (t) => t.section === 'gather')
  group('The drop', (t) => t.section === 'drop')
  group('Chase downbeats', (t) => chase(t) && t.kind === 'down')
  group('Chase beats (all)', (t) => chase(t) && t.kind !== 'eighth')
  group('Chase off-beat eighths', (t) => chase(t) && t.kind === 'eighth')
  group('The last hit', (t) => t.section === 'last')
  const errs = locked.map((s) => Math.abs(s.err) * 1000)
  const meanAll = errs.reduce((a, b) => a + b, 0) / errs.length
  const worst = Math.max(...errs)
  const lines = [
    `strikes ${locked.length}, every one on a measured target: mean ${meanAll.toFixed(1)} ms, worst ${worst.toFixed(1)} ms`,
    ...rows.map((r) => `  ${r[0].padEnd(24)} ${r[2]}/${r[1]} (${r[3]}) mean ${r[4]} ms`),
  ]
  return { lines, rows, strikes: locked.length, meanAll, worst }
}

function route(map: StockMap): string {
  const out: string[] = []
  let rails = 0
  const flush = () => { if (rails) out.push(`rail ×${rails}`); rails = 0 }
  for (const p of map.pieces) {
    if (p.spec.name === 'rail') { rails++; continue }
    flush()
    out.push(p.spec.portal ? `portal ${p.spec.portal}` : p.spec.name)
  }
  flush()
  return out.join(' → ')
}

function report(score: StockScore, list: Target[], locked: Locked[], stats: Stats): string {
  const L: string[] = []
  const bpm = 60 / ONSETS.period
  L.push('# Cornfield Chase, [Opus 5.5] Music-sync', '')
  L.push('Copyrighted recording. Private tech demo and eval one-shot only — do not ship this audio in a public build.')
  L.push('Hans Zimmer, *Cornfield Chase*, from *Interstellar* (2014). Attribution: `docs/promo/CORNFIELD_CHASE_ATTRIBUTION.txt`.', '')
  L.push(`Generated by \`npm run generate:cornfield:opus55\` (\`scripts/arrange-cornfield-opus55.ts\`). Every machine is a stock piece at its stock duration, compiled through \`stockPlacement\` like every other stock show. The arrangement is only the order, the exit variant and the rail breaths.`, '')
  L.push('## The targets are measured', '')
  L.push(`\`scripts/cornfield-opus55-onsets.py\` reads the recording once and writes \`scripts/show-plans/cornfield-opus55-onsets.json\`; the generator never touches audio.`, '')
  L.push(`- **The chase pulse is ${bpm.toFixed(2)} bpm** (${ONSETS.period.toFixed(3)} s a beat), beat *k* at ${ONSETS.origin.toFixed(3)} + ${ONSETS.period.toFixed(3)}·*k* s, the drop on beat 68. A comb fitted over 42–118 s puts every beat and every eighth within a few ms; the eighths are as present as the beats.`)
  L.push('- **The piano is rubato.** No comb fits 0–33 s, so the field aims at the piano\'s own notes, the stronger the better.')
  L.push(`- **The organ enters at ${ONSETS.organ.toFixed(2)} s** and its fill into the drop pulls against the comb, so the gather aims at its onsets too.`)
  L.push(`- **The drop onset is ${ONSETS.drop.t.toFixed(3)} s; the last hit is ${ONSETS.last.t.toFixed(3)} s** (beat ${ONSETS.last.beat}), then the decay.`, '')
  L.push('## The lock', '')
  L.push('A stock strike is a piece\'s `lane.fire`. The search may only place a machine where its strike lands on a measured target (±40 ms on a piano note, ±30 ms on the organ, ±26 ms on the chase comb, ±20 ms on the drop). Within that, it pays for every downbeat, beat and eighth left without a strike, and for the error of each one covered. The portal hop is searched with the music on both sides of it, and so is the finale: the booth\'s flash on a beat of the last phrase and the ticket\'s payout on the last hit.', '')
  L.push(`**${stats.strikes} strikes, all of them on a target. Mean error ${stats.meanAll.toFixed(1)} ms, worst ${stats.worst.toFixed(1)} ms.**`, '')
  L.push('| Targets | Count | Struck | Coverage | Mean error (ms) | Worst (ms) |')
  L.push('| --- | ---: | ---: | ---: | ---: | ---: |')
  for (const r of stats.rows) L.push(`| ${r.join(' | ')} |`)
  L.push('')
  L.push('## Sections', '')
  L.push('| Section | Start | Camera before Zoom | World |')
  L.push('| --- | ---: | --- | --- |')
  for (const p of score.phrases) L.push(`| ${p.title} | ${p.begin.toFixed(2)} s | ${p.visible} cells | ${p.begin < score.maps[1].begin ? 'Forest' : 'Arcade'} |`)
  L.push('')
  L.push('## Maps', '')
  L.push('| World | Start | End | Pieces | Rails | Distinct machines |')
  L.push('| --- | ---: | ---: | ---: | ---: | ---: |')
  for (const m of score.maps) {
    const names = new Set(m.pieces.filter((p) => p.spec.name !== 'rail' && !p.spec.portal).map((p) => p.spec.name))
    L.push(`| ${worldByName(m.world)!.label} | ${m.begin.toFixed(3)} | ${m.end.toFixed(3)} | ${m.pieces.length} | ${m.pieces.filter((p) => p.spec.name === 'rail').length} | ${names.size} |`)
  }
  L.push('')
  for (const m of score.maps) L.push(`**${worldByName(m.world)!.label}.** ${route(m)}`, '')
  L.push('## Every downbeat of the chase', '')
  L.push('| Beat | Grid | Machine | Strike | Error |')
  L.push('| ---: | ---: | --- | ---: | ---: |')
  const byTarget = new Map(locked.map((s) => [s.target, s]))
  list.forEach((t, i) => {
    if (t.kind !== 'down' || t.beat === undefined) return
    const s = byTarget.get(i)
    L.push(`| ${t.beat} | ${t.time.toFixed(3)} | ${s ? s.name : '—'} | ${s ? s.at.toFixed(3) : '—'} | ${s ? `${(s.err * 1000).toFixed(1)} ms` : 'rest'} |`)
  })
  L.push('')
  return L.join('\n')
}

main()
