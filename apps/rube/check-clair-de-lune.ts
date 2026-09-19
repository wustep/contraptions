import assert from 'node:assert/strict'
import { ballAt, laneAt, laneTime } from './src/parts'
import { Show } from './src/show'
import { ClairDeLunePreview, CLAIR_AUDIO_OFFSET, CLAIR_DURATION, clairDeLuneScore } from './src/shows/clair-de-lune'

const signature = (show: Show) => JSON.stringify(show.universe(0).pieces.map((p) => [p.piece.name, p.col, p.row, p.state, p.lane]))
const before = signature(new Show('clair-stock-check'))
const show = new ClairDeLunePreview()
assert.equal(CLAIR_DURATION, 30)
assert.equal(CLAIR_AUDIO_OFFSET, 2.44)
assert.deepEqual(show.at(-10), show.at(0))
assert.deepEqual(show.at(40), show.at(30))
assert.equal(show.at(15.296 - 1e-7).universe.world.name, 'workshop')
assert.equal(show.at(15.296).universe.world.name, 'harbor')

for (const [index, scene] of clairDeLuneScore.scenes.entries()) {
  const map = show.universe(index)
  for (const cue of scene.cues) {
    // The cut belongs to the incoming map; check the outgoing endpoint from the left.
    const t: number = cue.at === scene.end && scene.end < CLAIR_DURATION ? cue.at - 1e-8 : cue.at
    assert.ok(Math.abs(show.at(t).local - cue.native) < 1e-6, `Cue missed: ${cue.label}`)
  }
  let previous = -Infinity
  for (let frame = 0; frame < (scene.end - scene.begin) * 240; frame++) {
    const t = scene.begin + frame / 240
    const here = show.at(t)
    assert.ok(here.local >= previous, `Clock reversed at ${t}`)
    assert.ok([here.x, here.y, here.local, here.scale].every(Number.isFinite))
    assert.equal(here.universe, map)
    const cam = show.cameraAt(t)
    // Keep the ball on screen, with a margin for its rim, at the exported 16:9 framing.
    assert.ok(Math.abs(here.x - cam.x) < cam.cells * 16 / 18 - 0.2, `Ball left the frame at ${t}`)
    assert.ok(Math.abs(here.y - cam.y) < cam.cells / 2 - 0.2, `Ball left the frame vertically at ${t}`)
    previous = here.local
  }
  const occupied = new Set<string>()
  for (const [i, p] of map.pieces.entries()) {
    assert.ok(Math.abs(laneTime(p.lane) - p.span) < 1e-8)
    assert.ok(map.world.pieces.includes(p.piece), 'Only real world pieces belong in this score')
    assert.notEqual((p.state as { color?: string }).color, p.ballIn.color, `Ball disappears into ${p.piece.name}`)
    for (const cell of p.cells) {
      const key = cell.join(':')
      assert.ok(!occupied.has(key), `Overlapping cell at ${scene.world}/${key}`)
      occupied.add(key)
    }
    if (!i) continue
    const last = map.pieces[i - 1]
    assert.ok(Math.abs(p.start - last.start - last.span) < 1e-8)
    const out = laneAt(last.lane, last.span), into = laneAt(p.lane, 0)
    assert.ok(Math.hypot(last.col + last.mirror * out.x - p.col - p.mirror * into.x, last.row + out.y - p.row - into.y) < 1e-6, `Broken handoff at ${p.piece.name}`)
    assert.deepEqual(p.ballIn, ballAt(last.ballIn, last.changes, Infinity))
  }
  assert.ok(map.bounds.y1 - map.bounds.y0 >= 2, 'Each map uses vertical space')
  assert.ok(map.pieces.some((p) => p.mirror === -1), 'Each map changes direction')
  assert.ok(map.pieces.filter((p) => p.piece.name === 'rail').length <= 2, 'Rails are short breaths')
}
const relay = clairDeLuneScore.scenes[0].cues.find((c) => c.label === 'Cradle relay')!
assert.equal(show.at(relay.at - 0.001).ball.id, 0)
assert.equal(show.at(relay.at + 0.001).ball.id, 1)
const replay = new ClairDeLunePreview()
for (const t of [30, 29.9, 24, 15.5, 15.296, 7.5, 0]) {
  const actual = replay.at(t), expected = show.at(t)
  assert.deepEqual([actual.x, actual.y, actual.ball], [expected.x, expected.y, expected.ball])
}
assert.equal(signature(new Show('clair-stock-check')), before)
console.log('Clair de lune: two authored maps; exact cues, portal cut, joined lanes, relay, monotone clocks, camera bounds, replay, 30s stop and stock show pass.')
