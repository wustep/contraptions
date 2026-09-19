import assert from 'node:assert/strict'
import { laneAt, laneTime } from '../apps/rube/src/parts'
import { at, cameraAt, pieceTime, phraseAt, score } from '../apps/rube/src/timed/premiere-arabesque/show'

assert.equal(score.title, 'Première Arabesque')
assert.equal(score.performer, 'Patrizia Prati')
assert.equal(score.revision, 4)
assert.equal(score.duration, 290.61133333333333)
assert.equal(score.audioOffset, 2.38)
assert.equal(score.phrases.length, 36)
assert.deepEqual(score.maps.map(m=>m.world), ['workshop','garden','harbor','arcade'])
assert.ok(score.maps.every(m=>m.end-m.begin >= 60))
const pieces = score.maps.flatMap((p) => p.pieces)
assert.equal(pieces.filter((p) => p.name === 'rail').length, 4)
assert.ok(pieces.filter((p) => p.name === 'rail').reduce((sum, p) => sum + p.end - p.begin, 0) < score.duration * .03)
assert.ok(!pieces.some((p) => p.name === 'ribbon'))

let seams = 0, reversals = 0, holds = 0, maxTravel = 0, maxSpeedDifference = 0
for (const map of score.maps) {
  const occupied = new Set<string>()
  assert.equal(map.pieces[0].begin, map.begin)
  assert.equal(map.pieces.at(-1)!.end, map.end)
  for (const [i, piece] of map.pieces.entries()) {
    for (const cell of piece.cells) {
      assert.ok(!occupied.has(cell.join(',')), `Overlap in ${map.title}`)
      occupied.add(cell.join(','))
    }
    const duration = laneTime(piece.lane)
    assert.ok(Math.abs(pieceTime(piece, piece.end) - duration) < 1e-10)
    for (const knot of piece.timing) assert.ok(Math.abs(pieceTime(piece, knot.time) - knot.native) < 1e-10)
    for (let k = 1; k < piece.timing.length; k++) {
      const a = piece.timing[k - 1], b = piece.timing[k]
      if (a.native !== b.native) continue
      holds++
      assert.equal(a.slope, 0)
      assert.equal(b.slope, 0)
      const rest = laneAt(piece.lane, a.native)
      for (const u of [0.1, 0.5, 0.9]) {
        const held = laneAt(piece.lane, pieceTime(piece, a.time + (b.time - a.time) * u))
        assert.ok(Math.hypot(held.x - rest.x, held.y - rest.y) < 1e-10, 'Ball creeps during a rest')
      }
    }
    let previousTime = -Infinity
    for (let j = 0; j <= 500; j++) {
      const native = pieceTime(piece, piece.begin + (piece.end - piece.begin) * j / 500)
      assert.ok(native >= previousTime - 1e-12, `${piece.label}: clock moved backward`)
      previousTime = native
    }
    for (const segment of piece.lane.segs) assert.ok(segment.dur > 0 && [...segment.from, ...segment.to, segment.dur].every(Number.isFinite))
    if (i) {
      seams++
      const before = map.pieces[i - 1]
      if (piece.mirror !== before.mirror) reversals++
      assert.equal(before.end, piece.begin)
      const exit = laneAt(before.lane, laneTime(before.lane)), entry = laneAt(piece.lane, 0)
      assert.ok(Math.hypot(before.col + before.mirror * exit.x - piece.col - piece.mirror * entry.x, before.row + exit.y - piece.row - entry.y) < 1e-8, `Position jump at ${piece.begin}`)
      const e = 1e-5, seam = at(piece.begin), left = at(piece.begin - e), right = at(piece.begin + e)
      const beforeSpeed = Math.hypot(seam.x - left.x, seam.y - left.y) / e
      const afterSpeed = Math.hypot(right.x - seam.x, right.y - seam.y) / e
      maxSpeedDifference = Math.max(maxSpeedDifference, Math.abs(beforeSpeed - afterSpeed))
      assert.ok(Math.abs(beforeSpeed - afterSpeed) < 0.03, `Speed jump at ${piece.begin}: ${beforeSpeed} → ${afterSpeed}`)
    }
  }
}
assert.ok(reversals >= 3)
assert.ok(holds >= 10)
assert.equal(pieces.filter(p=>p.name==='portal').length, 6)
assert.ok(pieces.every(p=>p.end>p.begin))
for (const [i, phrase] of score.phrases.entries()) {
  assert.equal(phrase.begin, i ? score.phrases[i - 1].end : 0)
  assert.equal(phraseAt(phrase.begin), phrase)
  for (const strike of phrase.strikes ?? []) {
    const piece = pieces.find(p => p.begin <= strike.time && strike.time < p.end)!
    assert.equal(piece.name, strike.piece)
    assert.ok(Math.abs(pieceTime(piece, strike.time) - piece.lane.fire) < 1e-9, 'Strike misses its recording cue')
  }
  if (i && !score.maps.some(m=>m.begin===phrase.begin)) {
    assert.equal(at(phrase.begin - 1e-6).universe, at(phrase.begin + 1e-6).universe, 'Phrase changes the map')
    const left = cameraAt(phrase.begin - 1e-6), right = cameraAt(phrase.begin + 1e-6)
    assert.ok(Math.hypot(left.x - right.x, left.y - right.y, left.visible - right.visible) < 1e-4, 'Camera jumps at a phrase boundary')
  }
}
assert.equal(score.phrases.at(-1)!.end, score.duration)
{
  const cannon = pieces.find((p) => p.name === 'cannon')!
  assert.ok(cannon.begin > 6 && cannon.begin < 6.2, `first cannon begins at ${cannon.begin}`)
  for (let k = 1; k < cannon.timing.length; k++) {
    const a = cannon.timing[k - 1], b = cannon.timing[k]
    if (a.native !== b.native) continue
    const mid = (a.time + b.time) / 2
    assert.ok(at(mid).hidden, `first cannon holds the ball in sight at ${mid}`)
  }
}
for (let frame = 0; frame <= Math.ceil(score.duration * 120); frame++) {
  const t = Math.min(score.duration, frame / 120), point = at(t), camera = cameraAt(t)
  assert.ok([point.x, point.y, camera.x, camera.y, camera.visible].every(Number.isFinite))
  assert.ok(Math.abs(point.x - camera.x) < camera.visible * 8 / 9 - 0.15 && Math.abs(point.y - camera.y) < camera.visible / 2 - 0.15, `Ball offscreen at ${t}`)
  if (frame) {
    const previous = at((frame - 1) / 120)
    if (point.universe === previous.universe && point.ball.id === previous.ball.id && !point.hidden && !previous.hidden) {
      const travel = Math.hypot(point.x - previous.x, point.y - previous.y)
      maxTravel = Math.max(maxTravel, travel)
      assert.ok(travel < 0.15, `Unexpected jump at ${t}: ${travel}`)
    } else if (point.universe !== previous.universe) {
      assert.ok(point.scale < 0.08 && previous.scale < 0.08, 'World changes while the ball is visible')
    }
  }
}
const forward = Array.from({ length: Math.floor(score.duration * 10) + 1 }, (_, i) => at(i / 10))
for (let i = forward.length - 1; i >= 0; i--) assert.deepEqual(at(i / 10), forward[i], 'Backward seeking differs')
assert.deepEqual(at(999), at(score.duration))
assert.deepEqual(at(-1), at(0))
console.log(`Full Première: ${Math.ceil(score.duration * 120) + 1} samples; ${seams} continuous position/speed seams; ${reversals} reversals; max seam speed difference ${maxSpeedDifference.toFixed(5)} cells/s; max 120Hz travel ${maxTravel.toFixed(4)} cells. ${score.phrases.length} phrases, four long maps, three transitions, four rail cells, ${holds} rests.`)
