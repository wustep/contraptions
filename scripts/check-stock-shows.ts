import assert from 'node:assert/strict'
import { ballAt, laneAt, laneTime, type BallState } from '../apps/rube/src/parts'
import { overviewCamera } from '../apps/rube/src/overview'
import { StockShow } from '../apps/rube/src/shows/stock/show'
import type { StockScore } from '../apps/rube/src/shows/stock/types'
import { WORLDS, worldByName } from '../apps/rube/src/worlds'
import premiere from '../apps/rube/src/shows/versions/premiere-arabesque/take-b.generated.json'
import clair from '../apps/rube/src/shows/versions/clair-de-lune/take-a.generated.json'
import { stockPlacement } from './stock-placement'

/** V8/libm versions differ in the last bits of trig-derived stock traces. */
function sameStock(actual: unknown, expected: unknown, path: string): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    assert.ok(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) < 1e-12, `${path}: ${actual} != ${expected}`)
  } else if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    assert.equal(Array.isArray(actual), Array.isArray(expected), path)
    const a = actual as Record<string, unknown>, b = expected as Record<string, unknown>
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), path)
    for (const key of Object.keys(a)) sameStock(a[key], b[key], `${path}.${key}`)
  } else assert.deepEqual(actual, expected, path)
}

const work = process.argv[2]
assert.ok(work === 'premiere' || work === 'clair', 'Choose premiere or clair')
const score = (work === 'premiere' ? premiere : clair) as unknown as StockScore
const show = new StockShow(score)
assert.equal(score.audioOffset, work === 'premiere' ? 2.38 : 2.44)
assert.equal(score.duration, work === 'premiere' ? 290.61133333333333 : 301.648526)
assert.deepEqual(score.maps.map((m) => m.world), WORLDS.map((w) => w.name))
assert.equal(score.maps.length, 4)
let seams = 0, nativeWaits = 0, repeats = 0
let ball: BallState = { color: '#E76B31', ghost: false, id: 0 }
for (const [mi, map] of score.maps.entries()) {
  const world = worldByName(map.world)!
  assert.equal(map.begin, mi ? score.maps[mi - 1].end : 0)
  assert.ok(map.end - map.begin > 55, 'Keep phrases inside long maps')
  assert.equal(map.pieces[0].begin, map.begin)
  assert.equal(map.pieces.at(-1)!.end, map.end)
  assert.deepEqual(new Set(map.pieces.map((p) => p.spec.name)), new Set(world.pieces.map((p) => p.name)), `Missing a ${map.world} stock type`)
  assert.equal(map.pieces.filter((p) => p.spec.name === 'rail').length, 1, 'No rail padding')
  assert.equal(map.pieces.filter((p) => p.spec.portal === 'out').length, 1)
  assert.equal(map.pieces.filter((p) => p.spec.portal === 'in').length, mi ? 1 : 0)
  const occupied = new Set<string>(), names = new Set<string>()
  for (const [i, piece] of map.pieces.entries()) {
    const stock = stockPlacement(world, piece.spec, piece.ballIn, i)
    const duration = laneTime(stock.lane)
    // Compare to fresh stock placement, not a duplicate timing formula.
    sameStock(piece.lane, JSON.parse(JSON.stringify(stock.lane)), `${map.world}/${piece.spec.name}: stock lane`)
    sameStock(piece.state, JSON.parse(JSON.stringify(stock.state)), `${map.world}/${piece.spec.name}: mechanism state`)
    sameStock(piece.changes, JSON.parse(JSON.stringify(stock.changes ?? [])), `${map.world}/${piece.spec.name}: ball changes`)
    assert.deepEqual(piece.ballIn, ball, 'Ball continuity across placements and portals')
    ball = ballAt(ball, piece.changes, duration)
    assert.ok(Math.abs(piece.end - piece.begin - duration) < 1e-10, 'Stretched mechanism')
    assert.ok(!('timing' in piece) && !('restAt' in piece), 'Authored clock/rest')
    assert.equal(show.universe(mi).pieces[i].piece.draw, world.pieces.find((p) => p.name === piece.spec.name)!.draw, 'Stock renderer was wrapped/retimed')
    assert.equal(show.universe(mi).pieces[i].piece.scores, undefined)
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
assert.ok(repeats < (work === 'premiere' ? 55 : 60), 'Travel repeat budget grew')
const lastMap = score.maps.at(-1)!
assert.equal(lastMap.pieces.at(-2)!.spec.name, 'ticket', 'The ticket belongs at the finale')
assert.ok(score.duration > lastMap.end && score.duration - lastMap.end < 5, 'Only final resonance may outlast the chain')
assert.equal(show.at(score.duration).scale, 0, 'Do not freeze a visible ball during the final resonance')
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
