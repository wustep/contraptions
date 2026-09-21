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
import impromptu from '../apps/rube/src/shows/versions/schubert-impromptu/take-a.generated.json'
import { schubert } from './show-plans/schubert'
import { stockPlacement } from './stock-placement'

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
assert.ok(work === 'premiere' || work === 'clair' || work === 'clair-b' || work === 'schubert', 'Choose premiere, clair, clair-b or schubert')
/** How many stock types each world had, rail and portal included, when the take was arranged. */
const CATALOG_WHEN_ARRANGED: Record<string, number[]> = {
  premiere: [35, 25, 24, 25],
  clair: [35, 25, 24, 25],
  'clair-b': WORLDS.map((w) => w.pieces.length),
  schubert: [35, 25, 24, 25],
}
/**
 * How long the recording may play on after the last portal. The older takes fill it to the final resonance;
 * Take B lets its last travel repeats go and closes on the finished machine while the last bars play out.
 */
const TAIL: Record<string, number> = { premiere: 5, clair: 5, 'clair-b': 11, schubert: 5 }
/** How many travel repeats each take may lean on to reach the end of its recording. */
const REPEAT_BUDGET: Record<string, number> = { premiere: 55, clair: 60, 'clair-b': 30, schubert: 38 }
const score = ({ premiere, clair, 'clair-b': clairB, schubert: impromptu }[work]) as unknown as StockScore
const plan = JSON.parse(readFileSync(`scripts/show-plans/${work}.json`, 'utf8')) as { world: string; target: number; pieces: unknown[] }[]
const show = new StockShow(score)
assert.equal(score.id, work === 'premiere' ? 'premiere-arabesque/take-b' : work === 'clair' ? 'clair-de-lune/take-a' : work === 'clair-b' ? 'clair-de-lune/take-b' : schubert.id)
assert.equal(score.audioOffset, work === 'schubert' ? schubert.audioOffset : work === 'premiere' ? 2.38 : 2.44)
assert.equal(score.duration, work === 'schubert' ? schubert.duration : work === 'premiere' ? 290.61133333333333 : 301.648526)
// Take B pops the arcade's points and nothing else's; the older takes strip every score.
assert.deepEqual(score.scores ?? [], work === 'clair-b' ? ['arcade'] : [])
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
  assert.ok(map.end - map.begin > (work === 'schubert' ? 40 : 55), 'Keep phrases inside long maps')
  assert.equal(map.pieces[0].begin, map.begin)
  assert.equal(map.pieces.at(-1)!.end, map.end)
  // A take covers the whole catalog as it stood when it was arranged; the catalog may have grown since.
  const used = new Set(map.pieces.map((p) => p.spec.name))
  for (const name of used) assert.ok(world.pieces.some((p) => p.name === name), `Unknown ${map.world} stock type ${name}`)
  assert.ok(used.size >= CATALOG_WHEN_ARRANGED[work][mi], `Missing a ${map.world} stock type`)
  assert.equal(map.pieces.filter((p) => p.spec.name === 'rail').length, 1, 'No rail padding')
  assert.equal(map.pieces.filter((p) => p.spec.portal === 'out').length, 1)
  assert.equal(map.pieces.filter((p) => p.spec.portal === 'in').length, mi ? 1 : 0)
  const occupied = new Set<string>(), names = new Set<string>()
  for (const [i, piece] of map.pieces.entries()) {
    const stock = stockPlacement(world, piece.spec, piece.ballIn, i)
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
    if (piece.spec.name !== 'portal' && names.has(piece.spec.name)) repeats++
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
// Take B keeps the whale in the water: nothing stands in the cells under its footprint.
if (work === 'clair-b') for (const map of score.maps) {
  const taken = new Set(map.pieces.flatMap((p) => p.cells.map((c) => c.join(','))))
  for (const whale of map.pieces.filter((p) => p.spec.name === 'blowhole')) {
    const own = new Set(whale.cells.map((c) => c.join(',')))
    for (const [x, y] of whale.cells) assert.ok(own.has(`${x},${y + 1}`) || !taken.has(`${x},${y + 1}`), 'The whale is perched on another piece')
  }
}
const lastMap = score.maps.at(-1)!
assert.equal(lastMap.pieces.at(-2)!.spec.name, 'ticket', 'The ticket belongs at the finale')
assert.ok(score.duration > lastMap.end && score.duration - lastMap.end < TAIL[work], 'Only the close of the recording may outlast the chain')
assert.equal(show.at(score.duration).scale, 0, 'Do not freeze a visible ball during the final resonance')
if (work === 'schubert') {
  assert.deepEqual(score.cues.map((c) => [c.piece, c.target]), schubert.cues)
  assert.deepEqual(score.phrases, schubert.phrases.map(([end, title, visible], i, all) => ({ begin: i ? all[i - 1][0] : 0, end, title, visible })), 'Regenerate after changing phrase framing')
}
for (const cue of score.cues) assert.ok(Math.abs(cue.actual - cue.target) <= .12, `Missed ${cue.piece} cue`)
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
