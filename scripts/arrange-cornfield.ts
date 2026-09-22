/**
 * Cornfield Chase tech demo. Stock lanes only — piece order and rail breaths
 * carry the hits onto the recording. Run: npm run generate:cornfield
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { makeRng } from '../src/core/rng'
import { ballAt, laneAt, laneTime, pointsOf, type BallState, type Pt } from '../apps/rube/src/parts'
import { portalPlacement } from '../apps/rube/src/pieces/portal'
import type { Piece } from '../apps/rube/src/parts'
import { worldByName, type World } from '../apps/rube/src/worlds'
import { StockShow } from '../apps/rube/src/shows/stock/show'
import type { StockMap, StockPiece, StockScore, StockSpec } from '../apps/rube/src/shows/stock/types'
import type { Phrase } from '../apps/rube/src/timed/premiere-arabesque/types'
import { stockPlacement } from './stock-placement'

const DURATION = 126.984
const PERIOD = 0.626938775510204
const PHASE = 0.4466938775510204
const beat = (i: number): number => PHASE + i * PERIOD

const BALL0: BallState = { color: '#E76B31', ghost: false, id: 0 }

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

interface Target {
  time: number
  index: number
  strong: boolean
  section: 'field' | 'gather' | 'chase' | 'climax'
}

interface Node {
  cursor: number
  col: number
  row: number
  mirror: 1 | -1
  occupied: Set<string>
  specs: StockSpec[]
  cost: number
  misses: number
  used: Map<string, number>
  last: string
}

function specOf(v: Variant): StockSpec {
  const spec: StockSpec = { name: v.name }
  if (v.portal) spec.portal = v.portal
  else if (v.exit) spec.exit = [v.exit[0], v.exit[1]]
  return spec
}

function enumerate(world: World, piece: Piece): Variant[] {
  const theme = world.themes[0]
  const found = new Set<string>()
  const out: Variant[] = []
  for (let n = 0; n < 16; n++) {
    let seen: Pt | null = null
    const placed = piece.place({
      rng: makeRng('stock'),
      color: theme.colors[1],
      theme,
      ball: BALL0,
      earned: 600,
      taste: { weights: {} },
      fits(_cells, exit) {
        const key = `${exit[0]},${exit[1]}`
        if (found.has(key)) return false
        seen = [exit[0], exit[1]]
        return true
      },
    })
    if (!placed || !seen) break
    found.add(`${seen[0]},${seen[1]}`)
    const check = stockPlacement(world, { name: piece.name, exit: [seen[0], seen[1]] }, BALL0, 1)
    if (Math.abs(laneTime(check.lane) - laneTime(placed.lane)) > 1e-9) {
      throw new Error(`${world.name}/${piece.name} exit ${seen} did not round-trip`)
    }
    out.push({
      name: piece.name,
      exit: [seen[0], seen[1]],
      dur: laneTime(check.lane),
      fire: check.lane.fire,
      cells: check.cells.map((c) => [c[0], c[1]]),
      exitAt: [check.exit.at[0], check.exit.at[1]],
      exitDir: check.exit.dir,
      flight: !!piece.flight,
    })
  }
  return out
}

function portalVariant(kind: 'in' | 'out'): Variant {
  const placed = portalPlacement(kind, '#E76B31')
  return {
    name: 'portal',
    exit: null,
    portal: kind,
    dur: laneTime(placed.lane),
    fire: placed.lane.fire,
    cells: placed.cells.map((c) => [c[0], c[1]]),
    exitAt: [placed.exit.at[0], placed.exit.at[1]],
    exitDir: placed.exit.dir,
    flight: false,
  }
}

/** Geometry only. A changed clock here would make the search lie about the strike. */
function assertStable(world: World, variants: Variant[]): void {
  const alt: BallState = { color: '#3FC4D2', ghost: true, id: 4 }
  for (const v of variants) {
    if (v.name === 'rail' || v.name === 'portal' || !v.exit) continue
    for (const [index, ball, earned] of [[0, BALL0, 600], [3, alt, 4800]] as const) {
      const placed = stockPlacement(world, { name: v.name, exit: v.exit }, ball, index, earned)
      const same = Math.abs(laneTime(placed.lane) - v.dur) < 1e-9
        && Math.abs(placed.lane.fire - v.fire) < 1e-9
        && JSON.stringify(placed.cells) === JSON.stringify(v.cells)
        && placed.exit.at[0] === v.exitAt[0] && placed.exit.at[1] === v.exitAt[1]
        && placed.exit.dir === v.exitDir
      if (!same && v.name !== 'ticket') {
        throw new Error(`${world.name}/${v.name} geometry depends on ball, index or payout`)
      }
    }
  }
}

function cellKeys(v: Variant, col: number, row: number, mirror: 1 | -1): string[] {
  return v.cells.map(([x, y]) => `${col + mirror * x},${row + y}`)
}

function lay(node: Node, chain: Variant[]): Node | null {
  let { col, row, mirror, cursor } = node
  const occupied = new Set(node.occupied)
  const specs = [...node.specs]
  for (const v of chain) {
    const keys = cellKeys(v, col, row, mirror)
    if (keys.some((k) => occupied.has(k))) return null
    for (const k of keys) occupied.add(k)
    specs.push(specOf(v))
    cursor += v.dur
    col += mirror * v.exitAt[0]
    row += v.exitAt[1]
    mirror = (mirror * v.exitDir) as 1 | -1
  }
  return { ...node, col, row, mirror, cursor, occupied, specs }
}

function targets(): Target[] {
  const out: Target[] = []
  const push = (index: number, section: Target['section']) => {
    const time = beat(index)
    out.push({ time, index, strong: index % 4 === 3, section })
  }
  for (let i = 7; i <= 47; i += 5) push(i, 'field')
  for (let i = 54; i <= 62; i += 2) push(i, 'gather')
  for (let i = 67; i <= 183; i++) push(i, i < 134 ? 'chase' : 'climax')
  return out
}

function sectionRails(section: Target['section']): number {
  if (section === 'field') return 12
  if (section === 'gather') return 5
  return 4
}

function minFutureError(cursor: number, target: Target, variants: Variant[], rail: Variant): number {
  const maxRails = sectionRails(target.section)
  let best = Infinity
  for (const v of variants) {
    for (let n = 0; n <= maxRails; n++) {
      best = Math.min(best, Math.abs(cursor + n * rail.dur + v.fire - target.time))
    }
  }
  return best
}

function expand(beam: Node[], target: Target, upcoming: Target[], variants: Variant[], rail: Variant): Node[] {
  const maxRails = sectionRails(target.section)
  const tol = target.section === 'chase' || target.section === 'climax' ? 0.05 : 0.07
  const loose = tol + 0.045
  const next: Node[] = []
  for (const node of beam) {
    const found: Node[] = []
    const consider = (limit: number) => {
      for (const v of variants) {
        for (let n = 0; n <= maxRails; n++) {
          const start = node.cursor + n * rail.dur
          const err = start + v.fire - target.time
          if (Math.abs(err) > limit) continue
          // The drop is a flight. A perfect pusher is the wrong gesture for it.
          if (target.index === 67 && !v.flight && limit <= tol) continue
          const chain = [...Array(n).fill(rail), v]
          const laid = lay(node, chain)
          if (!laid) continue
          let swallowed = 0
          for (const u of upcoming) {
            if (u.time <= target.time + 0.02) continue
            if (u.time < laid.cursor - 0.03) swallowed++
            else break
          }
          const count = node.used.get(v.name) ?? 0
          let cost = node.cost + Math.abs(err) * 7 + n * 0.03
          cost += swallowed * (target.strong ? 0.055 : 0.14)
          if (v.name === node.last) cost += 0.2
          if (target.section === 'field' && count) cost += 0.45
          else if (count >= 5) cost += 0.05 * (count - 4)
          if (target.strong && v.flight) cost -= 0.08
          if (target.section === 'field' && v.dur >= 1.7 && v.dur <= 3.25) cost -= 0.06
          if (target.section === 'field' && v.dur < 0.85) cost += 0.12
          if (target.section === 'gather' && v.dur > 1.55) cost += 0.1
          if ((target.section === 'chase' || target.section === 'climax') && !target.strong && v.dur > 1.3) cost += 0.1
          if ((target.section === 'chase' || target.section === 'climax') && v.dur <= 0.72) cost -= 0.035
          if (target.section === 'climax' && target.strong && v.flight && v.dur >= 1.2 && v.dur <= 2.2) cost -= 0.05
          if (laid.row < -5 || laid.row > 7) cost += 0.22
          if (v.exitAt[1] === 0) cost -= 0.012
          const after = upcoming.find((u) => u.time > target.time + 0.02 && u.time >= laid.cursor - 0.03)
          if (after && !swallowed) cost += Math.min(0.18, minFutureError(laid.cursor, after, variants, rail))
          const used = new Map(node.used)
          used.set(v.name, count + 1)
          found.push({ ...laid, cost, misses: node.misses, used, last: v.name })
        }
      }
    }
    consider(tol)
    if (!found.length) consider(loose)
    if (!found.length) next.push({ ...node, cost: node.cost + 0.55, misses: node.misses + 1 })
    else next.push(...found)
  }
  next.sort((a, b) => a.cost - b.cost || a.misses - b.misses || a.cursor - b.cursor)
  const kept: Node[] = []
  for (const node of next) {
    if (kept.some((k) => Math.abs(k.cursor - node.cursor) < 0.02 && k.last === node.last && k.specs.length === node.specs.length)) continue
    kept.push(node)
    if (kept.length === 6) break
  }
  return kept
}

function arrange(list: Target[], variants: Variant[], rail: Variant, start: Node): Node {
  let beam = [start]
  for (let i = 0; i < list.length; i++) beam = expand(beam, list[i], list.slice(i), variants, rail)
  return beam[0]
}

function fresh(cursor: number): Node {
  return {
    cursor, col: 0, row: 0, mirror: 1, occupied: new Set(), specs: [],
    cost: 0, misses: 0, used: new Map(), last: '',
  }
}

/** Real placement, used for the portal join and the saved score. */
function compile(worldName: StockMap['world'], specs: StockSpec[], begin: number, ballIn: BallState, backdrop: StockMap['backdrop']): { map: StockMap; ball: BallState } {
  const world = worldByName(worldName)!
  const map: StockMap = { world: worldName, begin, end: begin, backdrop, pieces: [] }
  let col = 0
  let row = 0
  let mirror: 1 | -1 = 1
  let cursor = begin
  let ball = ballIn
  let earned = 0
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

function main(): void {
  const garden = worldByName('garden')!
  const arcade = worldByName('arcade')!
  const gardenVariants = garden.pieces.filter((p) => p.name !== 'portal' && p.name !== 'rail').flatMap((p) => enumerate(garden, p))
  const arcadeVariants = arcade.pieces.filter((p) => p.name !== 'portal' && p.name !== 'rail' && p.name !== 'booth' && p.name !== 'ticket').flatMap((p) => enumerate(arcade, p))
  const gardenRail = enumerate(garden, garden.pieces.find((p) => p.name === 'rail')!)[0]
  const arcadeRail = enumerate(arcade, arcade.pieces.find((p) => p.name === 'rail')!)[0]
  assertStable(garden, gardenVariants)
  assertStable(arcade, arcadeVariants)
  const outPortal = portalVariant('out')
  const inPortal = portalVariant('in')
  console.log(`variants garden ${gardenVariants.length}, arcade ${arcadeVariants.length}, rail ${gardenRail.dur.toFixed(3)} portal ${outPortal.dur.toFixed(3)}+${inPortal.dur.toFixed(3)}`)

  const all = targets()
  const field = all.filter((t) => t.section === 'field' || t.section === 'gather')
  const chase = all.filter((t) => t.section === 'chase' || t.section === 'climax')
  console.log(`targets field ${field.length} from ${field[0].time.toFixed(3)} chase ${chase.length} drop ${chase[0].time.toFixed(3)}`)

  const grown = arrange(field, gardenVariants, gardenRail, fresh(0))
  const drop = chase[0].time
  let pad: { n: number; options: number } | null = null
  for (let n = 0; n <= 16; n++) {
    const start = grown.cursor + n * gardenRail.dur + outPortal.dur + inPortal.dur
    if (start > drop + 0.02) break
    const options = arcadeVariants.filter((v) => Math.abs(start + v.fire - drop) <= 0.05 && ['striker', 'hoops', 'slingshot', 'skee', 'whack', 'hockey', 'shooter', 'popcorn'].includes(v.name)).length
    if (options && (!pad || options > pad.options || (options === pad.options && n < pad.n))) pad = { n, options }
  }
  if (!pad) throw new Error(`no portal padding reaches the drop from ${grown.cursor.toFixed(3)}`)
  let gardenNode = grown
  for (let n = 0; n < pad.n; n++) {
    const laid = lay(gardenNode, [gardenRail])
    if (!laid) throw new Error('padding rail overlaps')
    gardenNode = laid
  }
  const withDoor = lay(gardenNode, [outPortal])
  if (!withDoor) throw new Error('exit portal overlaps')
  const gardenCompiled = compile('garden', withDoor.specs, 0, BALL0, 'sprigs')

  const arcadeStart = fresh(gardenCompiled.map.end)
  const entered = lay(arcadeStart, [inPortal])
  if (!entered) throw new Error('entry portal overlaps')
  const chased = arrange(chase, arcadeVariants, arcadeRail, { ...entered, cost: 0, misses: 0 })
  console.log(`chase cursor ${chased.cursor.toFixed(3)} misses ${chased.misses} pieces ${chased.specs.length}`)

  const finale = fitFinale(chased, arcade, arcadeRail, outPortal)
  const arcadeCompiled = compile('arcade', finale.specs, gardenCompiled.map.end, gardenCompiled.ball, 'stars')
  const phrases: Phrase[] = [
    { begin: 0, end: field.find((t) => t.section === 'gather')!.time, title: 'Piano over the field', visible: 9.2 },
    { begin: field.find((t) => t.section === 'gather')!.time, end: drop, title: 'The organ gathers', visible: 7.4 },
    { begin: drop, end: beat(134), title: 'Cornfield chase', visible: 5.0 },
    { begin: beat(134), end: finale.hold, title: 'Full organ', visible: 4.7 },
    { begin: finale.hold, end: DURATION, title: 'The photograph', visible: 8.4 },
  ]
  const pieces = [...gardenCompiled.map.pieces, ...arcadeCompiled.map.pieces]
  const strikeOf = (p: StockPiece) => p.begin + p.lane.fire
  const cues = all.map((target) => {
    let best = pieces[0]
    for (const piece of pieces) if (Math.abs(strikeOf(piece) - target.time) < Math.abs(strikeOf(best) - target.time)) best = piece
    const actual = strikeOf(best)
    return { piece: best.spec.name, target: target.time, actual, section: target.section, strong: target.strong }
  })
  const hit = (limit: number) => cues.filter((c) => Math.abs(c.actual - c.target) <= limit).length
  const mean = cues.reduce((sum, c) => sum + Math.abs(c.actual - c.target), 0) / cues.length
  const strongCues = cues.filter((c) => c.strong)
  const strongMean = strongCues.reduce((sum, c) => sum + Math.abs(c.actual - c.target), 0) / strongCues.length
  console.log(`garden ${gardenCompiled.map.pieces.length} pieces ends ${gardenCompiled.map.end.toFixed(3)} misses ${grown.misses}`)
  console.log(`arcade ${arcadeCompiled.map.pieces.length} pieces ends ${arcadeCompiled.map.end.toFixed(3)} chase misses ${chased.misses}`)
  console.log(`cues within 50ms ${hit(0.05)}/${cues.length}, within 80ms ${hit(0.08)}, mean ${(mean * 1000).toFixed(1)}ms`)
  if (hit(0.08) < cues.length * 0.85) throw new Error('cue alignment is too loose to ship')

  const score: StockScore = {
    id: 'cornfield-chase/tech-demo',
    title: 'Cornfield Chase',
    performer: 'Hans Zimmer',
    audioOffset: 0,
    duration: DURATION,
    phrases,
    maps: [gardenCompiled.map, arcadeCompiled.map],
    cues: cues.filter((c) => c.strong).map(({ piece, target, actual }) => ({ piece, target, actual })),
    scores: ['arcade'],
  }
  const show = new StockShow(score)
  for (let t = 0; t <= score.duration; t += 0.25) {
    const here = show.at(t)
    const cam = show.camera(t)
    if (![here.x, here.y, cam.x, cam.y, cam.cells].every(Number.isFinite)) throw new Error(`non-finite frame at ${t}`)
  }

  const folder = 'apps/rube/src/shows/versions/cornfield-chase'
  mkdirSync(folder, { recursive: true })
  writeFileSync(`${folder}/tech-demo.generated.json`, JSON.stringify(score) + '\n')
  writeFileSync('scripts/show-plans/cornfield.json', JSON.stringify(score.maps.map((m) => ({
    world: m.world, target: m.end, pieces: m.pieces.map((p) => p.spec),
  })), null, 2) + '\n')
  writeFileSync('docs/promo/CORNFIELD_CHASE_ARRANGEMENT.md', report(score, cues, mean, strongMean, grown.misses + chased.misses))
  console.log(`wrote ${folder}/tech-demo.generated.json and the arrangement. finale hold ${finale.hold.toFixed(3)}`)
}

function fitFinale(node: Node, world: World, rail: Variant, portal: Variant): { specs: StockSpec[]; hold: number } {
  const booths = enumerate(world, world.pieces.find((p) => p.name === 'booth')!)
  const tickets = enumerate(world, world.pieces.find((p) => p.name === 'ticket')!)
  const beats = Array.from({ length: 16 }, (_, k) => beat(180 + k)).filter((t) => t < 123)
  let best: { cost: number; specs: StockSpec[]; hold: number } | null = null
  let nearest = Infinity
  const rails = (n: number) => Array.from({ length: n }, () => rail)
  for (let lead = 0; lead <= 8; lead++) {
    for (const booth of booths) {
      const opened = lay(node, [...rails(lead), booth])
      if (!opened) continue
      const flash = node.cursor + lead * rail.dur + booth.fire
      const flashErr = Math.min(...beats.map((t) => Math.abs(t - flash)))
      for (let breath = 1; breath <= 6; breath++) {
        for (const ticket of tickets) {
          const paid = lay(opened, [...rails(breath), ticket])
          if (!paid) continue
          const pay = opened.cursor + breath * rail.dur + ticket.fire
          const payErr = Math.min(...beats.map((t) => Math.abs(t - pay)))
          nearest = Math.min(nearest, flashErr + payErr)
          if (flashErr > 0.08 || payErr > 0.14) continue
          for (let tail = 0; tail <= 3; tail++) {
            const closed = lay(paid, [...rails(tail), portal])
            if (!closed) continue
            const end = closed.cursor
            if (end < 118.6 || end > 122.4) continue
            const cost = flashErr * 10 + payErr * 6 + Math.abs(end - 120.2) + Math.max(0, 4 - breath) * 0.35
            if (!best || cost < best.cost) best = { cost, specs: closed.specs, hold: opened.cursor }
          }
        }
      }
    }
  }
  if (!best) throw new Error(`finale could not land on a beat from ${node.cursor.toFixed(3)} (nearest flash+pay ${(nearest * 1000).toFixed(0)}ms)`)
  return best
}

function report(score: StockScore, cues: { piece: string; target: number; actual: number; section: string; strong: boolean }[], mean: number, strongMean: number, misses: number): string {
  const lines: string[] = []
  lines.push('# Cornfield Chase, tech demo', '')
  lines.push('Copyrighted recording. Private tech demo only — do not ship this audio in a public build.')
  lines.push('Hans Zimmer, *Cornfield Chase*, from *Interstellar* (2014). Source used here: the WaterTower upload https://www.youtube.com/watch?v=JuSsvM8B4Jc')
  lines.push('Attribution file: `docs/promo/CORNFIELD_CHASE_ATTRIBUTION.txt`.', '')
  lines.push('Generated by `npm run generate:cornfield`. Every mechanism runs at its stock duration. The arrangement is the order, the exit variant, and short rail breaths. Nothing retimes a lane.', '')
  lines.push('## What this breaks, on purpose', '')
  lines.push('Clair Take B is a catalog tour: four worlds, almost no repeated machines, rails as breath, twelve named cues. This demo is a pulse piece, about two minutes, so it breaks those rules:', '')
  lines.push('- Two worlds, not four. Forest is the field. The Arcade is the chase. One portal, on the drop at the downbeat, not mid-phrase.')
  lines.push('- Repeats are the ostinato. Bumpers, pins and the other short Arcade gestures answer the beat instead of each appearing once.')
  lines.push('- The field is sparse (about every five beats) so the long machines can be seen before they fire. The chase is a strike on almost every beat of the 95.7 bpm grid.')
  lines.push('- The camera opens up while the piano is alone and tightens when the organ is running. Overview is for looking at a whole map; the recording is Zoom.')
  lines.push('- The Arcade score pops are on. The ticket pays what this chase earned.', '')
  lines.push('## How to watch', '')
  lines.push('`npm run dev`, then `/shows/?show=cornfield-chase&take=tech-demo`. Leave Zoom on. Overview, if you want the route, is the whole map and turns Zoom off. Record at 1080p with music. The saved file `docs/promo/cornfield-chase-stock-demo.webm` is that zoomed pass.', '')
  lines.push('| Section | Start | Camera, before Zoom | What the machines do |')
  lines.push('| --- | ---: | --- | --- |')
  lines.push('| Piano over the field | 0:00 | wide, about 9 cells | long Forest pieces, targets in view before the hit |')
  lines.push('| The organ gathers | ~0:34 | a little closer | shorter gestures, still one world |')
  lines.push('| The drop and the chase | ~0:42 | tight | the portal opens and a flight piece fires on the downbeat, then a strike per beat |')
  lines.push('| Full organ | ~1:24 | tighter | the same pulse, with a flight piece on the strong beats |')
  lines.push('| The photograph | ~1:56 | settles on the booth and the ticket | rails hold the picture, the ticket pays, the portal stays open |')
  lines.push('')
  lines.push('## Maps', '')
  lines.push('| World | Start | End | Pieces | Rails | Distinct machines |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |')
  for (const map of score.maps) {
    const rails = map.pieces.filter((p) => p.spec.name === 'rail').length
    const names = new Set(map.pieces.filter((p) => p.spec.name !== 'rail' && p.spec.name !== 'portal').map((p) => p.spec.name))
    lines.push(`| ${worldByName(map.world)!.label} | ${map.begin.toFixed(3)} | ${map.end.toFixed(3)} | ${map.pieces.length} | ${rails} | ${names.size} |`)
  }
  lines.push('')
  lines.push(`Playback ${score.duration.toFixed(3)}s, audio offset ${score.audioOffset}s. The last portal is at ${score.maps.at(-1)!.end.toFixed(3)}s and the picture stays through the decay. Search gave up on ${misses} grid targets; the table below is every strong beat and the nearest stock strike.`, '')
  lines.push(`Nearest strike against every grid point: mean ${(mean * 1000).toFixed(1)} ms. Against the strong beats only: mean ${(strongMean * 1000).toFixed(1)} ms.`, '')
  lines.push('| Section | Grid | Nearest strike | Actual | Error |')
  lines.push('| --- | ---: | --- | ---: | ---: |')
  for (const cue of cues.filter((c) => c.strong)) {
    lines.push(`| ${cue.section} | ${cue.target.toFixed(3)} | ${cue.piece} | ${cue.actual.toFixed(3)} | ${((cue.actual - cue.target) * 1000).toFixed(1)} ms |`)
  }
  lines.push('', '## Routes', '')
  for (const map of score.maps) {
    const route: string[] = []
    let rails = 0
    const flush = () => { if (rails) route.push(`rail ×${rails}`); rails = 0 }
    for (const piece of map.pieces) {
      if (piece.spec.name === 'rail') { rails++; continue }
      flush()
      route.push(piece.spec.portal ? `portal ${piece.spec.portal}` : piece.spec.name)
    }
    flush()
    lines.push(`**${worldByName(map.world)!.label}.** ${route.join(' → ')}`, '')
  }
  lines.push('Grid: 95.7 bpm, phase 0.447s, taken from the onset envelope of this recording after the drop. The drop itself is beat 67.')
  lines.push('')
  return lines.join('\n')
}

main()
