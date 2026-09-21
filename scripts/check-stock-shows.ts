import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ballAt, laneAt, laneTime, pointsOf, type BallState } from '../apps/rube/src/parts'
import { overviewCamera } from '../apps/rube/src/overview'
import { StockShow } from '../apps/rube/src/shows/stock/show'
import type { StockScore } from '../apps/rube/src/shows/stock/types'
import { WORLDS, worldByName } from '../apps/rube/src/worlds'
import premiere from '../apps/rube/src/shows/versions/premiere-arabesque/take-b.generated.json'
import clair from '../apps/rube/src/shows/versions/clair-de-lune/take-a.generated.json'
import clairB from '../apps/rube/src/shows/versions/clair-de-lune/take-b.generated.json'
import { stockPlacement } from './stock-placement'
import { ticketsFor, type TicketState } from '../apps/rube/src/pieces/arcade/ticket'

/**
 * A saved lane must be the stock lane: same segments, flags, and clocks.
 * Coordinates (and other floats) may move by engine ULPs of Math.pow/cos;
 * a real retiming or variant change is orders of magnitude larger.
 */
function nearStock(a: number, b: number) {
  return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b))
}

function sameStockLane(saved: unknown, stock: unknown, label: string, path = 'lane'): void {
  if (typeof saved === 'number' && typeof stock === 'number') {
    assert.ok(nearStock(saved, stock), `${label}: altered stock lane (${path})`)
    return
  }
  if (Array.isArray(saved) && Array.isArray(stock)) {
    assert.equal(saved.length, stock.length, `${label}: altered stock lane (${path})`)
    saved.forEach((v, i) => sameStockLane(v, stock[i], label, `${path}[${i}]`))
    return
  }
  if (saved && stock && typeof saved === 'object' && typeof stock === 'object') {
    const keys = Object.keys(saved).sort(), stockKeys = Object.keys(stock).sort()
    assert.deepEqual(keys, stockKeys, `${label}: altered stock lane (${path})`)
    for (const key of keys) sameStockLane((saved as Record<string, unknown>)[key], (stock as Record<string, unknown>)[key], label, `${path}.${key}`)
    return
  }
  assert.deepEqual(saved, stock, `${label}: altered stock lane (${path})`)
}

{
  const lane = { fire: 1.7687921570983507, segs: [{ from: [0, 0.14775452821772703], to: [1, 0], dur: 0.4 }] }
  sameStockLane(lane, { ...lane, segs: [{ ...lane.segs[0], from: [0, 0.14775452821772705] }] }, 'engine-ulp')
  assert.throws(() => sameStockLane(lane, { ...lane, fire: 1.78 }, 'x'))
  assert.throws(() => sameStockLane(lane, { ...lane, segs: [{ ...lane.segs[0], dur: 0.5 }] }, 'x'))
  assert.throws(() => sameStockLane(lane, { ...lane, segs: [...lane.segs, lane.segs[0]] }, 'x'))
  assert.throws(() => sameStockLane(lane, { ...lane, segs: [{ ...lane.segs[0], ease: 'in' }] }, 'x'))
}

const work = process.argv[2]
assert.ok(work === 'premiere' || work === 'clair' || work === 'clair-b', 'Choose premiere, clair or clair-b')
const isClair = work !== 'premiere'
/** How many stock types each world had, rail and portal included, when the take was arranged. */
const CATALOG_WHEN_ARRANGED: Record<string, number[]> = {
  premiere: [35, 25, 24, 25],
  clair: WORLDS.map((w) => w.pieces.length),
  'clair-b': WORLDS.map((w) => w.pieces.length),
}
/**
 * How long the recording may play on after the last portal. Première fills it to the final resonance;
 * Clair lets its last travel repeats go and closes on the finished machine while the last bars play out.
 */
const TAIL: Record<string, number> = { premiere: 5, clair: 11, 'clair-b': 5 }
/** How many travel repeats each take may lean on to reach the end of its recording. */
const REPEAT_BUDGET: Record<string, number> = { premiere: 55, clair: 30, 'clair-b': 5 }
const score = ({ premiere, clair, 'clair-b': clairB }[work]) as unknown as StockScore
const plan = JSON.parse(readFileSync(`scripts/show-plans/${work}.json`, 'utf8')) as { world: string; target: number; pieces: unknown[] }[]
const show = new StockShow(score)
assert.equal(score.id, work === 'premiere' ? 'premiere-arabesque/take-b' : `clair-de-lune/${work === 'clair-b' ? 'take-b' : 'take-a'}`)
assert.equal(score.audioOffset, work === 'premiere' ? 2.38 : 2.44)
assert.equal(score.duration, work === 'premiere' ? 290.61133333333333 : 301.648526)
// Clair pops the arcade's points and nothing else's; Première strips every score.
assert.deepEqual(score.scores ?? [], isClair ? ['arcade'] : [])
assert.deepEqual(score.maps.map((m) => m.world), WORLDS.map((w) => w.name))
assert.equal(score.maps.length, 4)
let seams = 0, nativeWaits = 0, repeats = 0
let ball: BallState = { color: '#E76B31', ghost: false, id: 0 }
for (const [mi, map] of score.maps.entries()) {
  const world = worldByName(map.world)!
  assert.equal(map.begin, mi ? score.maps[mi - 1].end : 0)
  assert.equal(map.world, plan[mi].world)
  assert.deepEqual(map.pieces.map((p) => p.spec), plan[mi].pieces, 'Regenerate after changing the piece order')
  assert.ok(Math.abs(map.end - plan[mi].target) < .17, 'World misses its recording cue')
  assert.ok(map.end - map.begin > 55, 'Keep phrases inside long maps')
  assert.equal(map.pieces[0].begin, map.begin)
  assert.equal(map.pieces.at(-1)!.end, map.end)
  // A take covers the whole catalog as it stood when it was arranged; the catalog may have grown since.
  const used = new Set(map.pieces.map((p) => p.spec.name))
  for (const name of used) assert.ok(world.pieces.some((p) => p.name === name), `Unknown ${map.world} stock type ${name}`)
  assert.ok(used.size >= CATALOG_WHEN_ARRANGED[work][mi], `Missing a ${map.world} stock type`)
  // Take B gives machines space with short stock rails and a longer breath after the final photograph.
  // Existing takes keep their original lead-in and single-rail limits.
  const opens = map.pieces[0]?.spec.portal === 'in' ? 1 : 0
  let lead = 0
  while (map.pieces[opens + lead]?.spec.name === 'rail') lead++
  const railCount = map.pieces.filter((p) => p.spec.name === 'rail').length
  if (work === 'premiere') assert.equal(railCount, 1, 'No rail padding')
  assert.ok(lead <= (work === 'clair-b' ? 3 : 2), 'Rail lead-in grew')
  if (work === 'clair-b') {
    let run = 0
    for (const [i, piece] of map.pieces.entries()) {
      run = piece.spec.name === 'rail' ? run + 1 : 0
      assert.ok(run <= 3 || run === 4 && map.world === 'arcade' && map.pieces[i + 1]?.spec.name === 'ticket', 'Only the final photograph has a four-rail breath')
    }
  } else {
    assert.ok(map.pieces.every((p, j) => j <= opens + lead || p.spec.name !== 'rail' || map.pieces[j - 1].spec.name !== 'rail'), 'A breath is one rail')
  }
  assert.equal(map.pieces.filter((p) => p.spec.portal === 'out').length, 1)
  assert.equal(map.pieces.filter((p) => p.spec.portal === 'in').length, mi ? 1 : 0)
  const occupied = new Set<string>(), names = new Set<string>()
  let earned = 0
  for (const [i, piece] of map.pieces.entries()) {
    const stock = stockPlacement(world, piece.spec, piece.ballIn, i, work === 'clair-b' ? earned : undefined)
    const duration = laneTime(stock.lane)
    // Compare to fresh stock placement, not a duplicate timing formula.
    sameStockLane(piece.lane, JSON.parse(JSON.stringify(stock.lane)), `${map.world}/${piece.spec.name}`)
    assert.deepEqual(piece.state, JSON.parse(JSON.stringify(stock.state)), `${map.world}/${piece.spec.name}: altered mechanism state`)
    assert.deepEqual(piece.changes, stock.changes ?? [])
    assert.deepEqual(piece.ballIn, ball, 'Ball continuity across placements and portals')
    ball = ballAt(ball, piece.changes, duration)
    assert.ok(Math.abs(piece.end - piece.begin - duration) < 1e-10, 'Stretched mechanism')
    assert.ok(!('timing' in piece) && !('restAt' in piece), 'Authored clock/rest')
    const stockPiece = world.pieces.find((p) => p.name === piece.spec.name)!
    if (work === 'clair-b' && piece.spec.name === 'ticket') {
      const ticket = piece.state as TicketState
      assert.equal(ticket.points, earned, 'Ticket must pay the accumulated stock points, not a placeholder')
      assert.equal(ticket.tickets, ticketsFor(earned), 'Ticket payout must use the stock conversion')
      assert.ok(earned > 600, 'The full Arcade earns more than the old placeholder payout')
      // A corrected payout changes the display, never the native lane or mechanism clock.
      sameStockLane(piece.lane, stockPlacement(world, piece.spec, piece.ballIn, i).lane, 'Ticket payout clock')
    }
    earned += pointsOf(stockPiece, piece.state)
    assert.equal(show.universe(mi).pieces[i].piece.draw, stockPiece.draw, 'Stock renderer was wrapped/retimed')
    if (score.scores?.includes(map.world)) {
      assert.equal(show.universe(mi).pieces[i].piece.scores, stockPiece.scores, 'Score pass was not the stock one')
      assert.equal(show.universe(mi).pieces[i].points, pointsOf(stockPiece, piece.state), 'Points were not the stock ones')
    } else {
      assert.equal(show.universe(mi).pieces[i].piece.scores, undefined)
      assert.equal(show.universe(mi).pieces[i].points, 0)
    }
    for (const cell of piece.cells) {
      assert.ok(!occupied.has(cell.join(',')), `${map.world}: overlapping footprint`)
      occupied.add(cell.join(','))
    }
    nativeWaits += piece.lane.segs.filter((s) => s.from[0] === s.to[0] && s.from[1] === s.to[1]).length
    // A rail is breath, and is never counted as a repeat.
    if (piece.spec.name !== 'portal' && piece.spec.name !== 'rail' && names.has(piece.spec.name)) repeats++
    names.add(piece.spec.name)
    for (const f of [.05, .25, .5, .75, .95]) {
      const t = piece.begin + duration * f, native = t - piece.begin
      const at = show.at(t), lane = laneAt(stock.lane, native)
      assert.ok(Math.hypot(at.x - piece.col - piece.mirror * lane.x, at.y - piece.row - lane.y) < 1e-9, 'Playback changed the stock clock')
      assert.equal(at.hidden, lane.hidden)
    }
    for (const change of piece.changes.filter((c) => c.relay)) {
      assert.equal(show.at(piece.begin + change.at).ball.id, ballAt(piece.ballIn, piece.changes, change.at).id, `Exact relay seek at ${piece.spec.name}`)
    }
    if (!i) continue
    const previous = map.pieces[i - 1]
    assert.equal(previous.end, piece.begin, 'Gap or overlap in the chain clock')
    const a = laneAt(previous.lane, laneTime(previous.lane)), b = laneAt(piece.lane, 0)
    assert.ok(Math.hypot(previous.col + previous.mirror * a.x - piece.col - piece.mirror * b.x, previous.row + a.y - piece.row - b.y) < 1e-8, 'Position jump at handoff')
    seams++
  }
  for (const [width, height] of [[1440, 900], [1920, 1080], [390, 844]]) {
    const camera = overviewCamera(show.universe(mi).bounds, width, height)
    for (const [x, y] of map.pieces.flatMap((p) => p.cells)) {
      assert.ok((Math.abs(x - camera.x) + .5) * camera.scale < width / 2)
      assert.ok((Math.abs(y - camera.y) + .5) * camera.scale < height / 2)
    }
  }
}
assert.ok(repeats < REPEAT_BUDGET[work], 'Travel repeat budget grew')
// Clair keeps the whale in the water: nothing stands in the cells under its footprint.
if (isClair) for (const map of score.maps) {
  const taken = new Set(map.pieces.flatMap((p) => p.cells.map((c) => c.join(','))))
  for (const whale of map.pieces.filter((p) => p.spec.name === 'blowhole')) {
    const own = new Set(whale.cells.map((c) => c.join(',')))
    for (const [x, y] of whale.cells) assert.ok(own.has(`${x},${y + 1}`) || !taken.has(`${x},${y + 1}`), 'The whale is perched on another piece')
  }
}
const lastMap = score.maps.at(-1)!
assert.equal(lastMap.pieces.filter((p) => !['rail', 'portal'].includes(p.spec.name)).at(-1)!.spec.name, 'ticket', 'The ticket belongs at the finale')
assert.ok(score.duration > lastMap.end && score.duration - lastMap.end < TAIL[work], 'Only the close of the recording may outlast the chain')
assert.equal(show.at(score.duration).scale, 0, 'Do not freeze a visible ball during the final resonance')
for (const cue of score.cues) assert.ok(Math.abs(cue.actual - cue.target) <= .12, `Missed ${cue.piece} cue`)
if (work === 'clair-b') {
  // B improves the arrangement without moving A's musical landmarks or hiding cue drift in its report.
  assert.deepEqual(score.phrases, clair.phrases)
  assert.deepEqual(score.cues.map(({ piece, target }) => ({ piece, target })), clair.cues.map(({ piece, target }) => ({ piece, target })))
  const takeAPlan = JSON.parse(readFileSync('scripts/show-plans/clair.json', 'utf8')) as typeof plan
  assert.deepEqual(plan.map((m) => m.target), takeAPlan.map((m) => m.target))
  assert.equal(score.maps[0].pieces.find((p) => p.spec.name !== 'rail')!.spec.name, 'balloon', 'Keep the gentle balloon opening')
  assert.deepEqual(lastMap.pieces.slice(-9).map((p) => p.spec.name), ['booth', 'rail', 'rail', 'rail', 'rail', 'ticket', 'rail', 'rail', 'portal'], 'Give the photograph and payout their own ending')
  assert.ok(lastMap.pieces.find((p) => p.spec.name === 'slots')!.end < 245.3789, 'Slots belongs before the final crest')
  const forest = score.maps[1].pieces
  const chime = forest.find((p) => p.spec.name === 'windchime')!
  const frogAnswer = forest.filter((p) => p.spec.name === 'frog')[1]
  assert.ok(Math.abs(chime.begin + chime.lane.fire - 113.1594) < .05, 'The chime closes Across the terrace')
  assert.ok(Math.abs(frogAnswer.begin + frogAnswer.lane.fire - 126.8981) < .12, 'The frog answers on the softer cadence')
  for (const cue of score.cues) {
    const piece = score.maps.flatMap((m) => m.pieces).find((p) => p.spec.name === cue.piece)!
    assert.equal(cue.actual, piece.begin + piece.lane.fire, 'Cue report disagrees with its stock strike')
    assert.ok(Math.abs(cue.actual - cue.target) <= .046, `Take B regressed the worst Take A cue: ${cue.piece}`)
  }
  for (const [mi, map] of score.maps.entries()) {
    const cells = map.pieces.flatMap((p) => p.cells)
    const width = Math.max(...cells.map(([x]) => x)) - Math.min(...cells.map(([x]) => x)) + 1
    const height = Math.max(...cells.map(([, y]) => y)) - Math.min(...cells.map(([, y]) => y)) + 1
    assert.ok(width <= [34, 38, 36, 40][mi] && height >= [12, 12, 12, 16][mi], 'Keep the maps folded into vertical layers')
    const travel = map.pieces.filter((p) => !['rail', 'portal'].includes(p.spec.name))
    assert.ok(travel.length - new Set(travel.map((p) => p.spec.name)).size <= [0, 2, 0, 2][mi], 'Take B repeat reduction regressed')
    const motifs = [[], ['windchime', 'frog'], [], ['hoops', 'bumper']][mi]
    const repeated = [...new Set(travel.map((p) => p.spec.name))].filter((name) => travel.filter((p) => p.spec.name === name).length > 1)
    assert.deepEqual(repeated.sort(), [...motifs].sort(), 'Only the intentional motifs repeat')
    for (const name of motifs) {
      const pair = travel.filter((p) => p.spec.name === name)
      assert.equal(pair.length, 2, 'A motif is one answer')
      assert.ok(travel.indexOf(pair[1]) - travel.indexOf(pair[0]) <= 2, 'A repeat must read as AA or ABA, ignoring rails')
      assert.ok(pair[1].begin - pair[0].begin < 6, 'Keep the answering gesture nearby')
      assert.notEqual((pair[0].state as { color: string }).color, (pair[1].state as { color: string }).color, 'Give the answer a different stock placement color')
    }
  }
}
for (const [i, phrase] of score.phrases.entries()) {
  assert.equal(phrase.begin, i ? score.phrases[i - 1].end : 0)
  assert.ok(phrase.end > phrase.begin)
}
assert.equal(score.phrases.at(-1)!.end, score.duration)
let maxTravel = 0
for (let frame = 0; frame <= Math.ceil(score.duration * 120); frame++) {
  const t = Math.min(score.duration, frame / 120), point = show.at(t), camera = show.camera(t)
  assert.ok([point.x, point.y, camera.x, camera.y, camera.cells].every(Number.isFinite))
  assert.ok(Math.abs(point.x - camera.x) < camera.cells * 8 / 9 - .15 && Math.abs(point.y - camera.y) < camera.cells / 2 - .15, `Ball offscreen at ${t}`)
  if (!frame) continue
  const previous = show.at((frame - 1) / 120)
  if (point.universe === previous.universe && point.ball.id === previous.ball.id && !point.hidden && !previous.hidden) {
    const travel = Math.hypot(point.x - previous.x, point.y - previous.y)
    maxTravel = Math.max(maxTravel, travel)
    assert.ok(travel < .4, `Visible jump at ${t}: ${travel}`)
  } else if (point.universe !== previous.universe) {
    assert.ok(point.scale < .08 && previous.scale < .08, 'World changes with a visible ball')
  }
}
// Seek in both directions across all handoffs and relay changes.
const times = score.maps.flatMap((m) => m.pieces.flatMap((p) => [p.begin - 1e-5, p.begin, p.begin + 1e-5, ...p.changes.map((c) => p.begin + c.at)]))
const snapshots = times.map((t) => show.at(t))
for (let i = times.length - 1; i >= 0; i--) assert.deepEqual(show.at(times[i]), snapshots[i])
assert.deepEqual(show.at(999), show.at(score.duration))
assert.deepEqual(show.at(-1), show.at(0))
console.log(`${score.id}: ${seams} joined handoffs, every catalog entry, ${repeats} travel repeats; ${nativeWaits} original stock waits, zero authored waits; ${Math.ceil(score.duration * 120) + 1} camera/motion samples; max travel ${maxTravel.toFixed(3)} cells at 120Hz. Native clocks, overview bounds and reverse seeking pass.`)
