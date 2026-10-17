import assert from 'node:assert/strict'
import { eventsBetween, voiceSamples } from './audio'
import { onSegment, routeAt, routesFor, scoreFor } from './instruments'
import { beatX, blankTake, boardHeight, copy, decodeTake, encodeTake, frequency, PRESETS, resizeTake, STEP, validTake, VOICES } from './model'

for (const take of [...PRESETS, blankTake()]) assert.deepEqual(decodeTake(encodeTake(take)), take)
const unicode = { ...copy(PRESETS[0]), title: 'Été — 雨 ♫ <a>' }
assert.deepEqual(decodeTake(encodeTake(unicode)), unicode)
for (const hash of ['', '#no', 'v3.abc', 'v2.%%%%', 'v2.' + 'A'.repeat(24001)]) assert.equal(decodeTake(hash), null)
for (const bad of [{ tempo: Infinity }, { length: 7 }, { tracks: [] }, { notes: Array(49).fill(PRESETS[0].notes[0]) }]) assert.equal(validTake({ ...PRESETS[0], ...bad }), null)
for (const bad of [{ id: '<svg>' }, { pitch: 1.5 }, { pitch: 15 }, { kind: 'unknown' }, { track: 'missing' }, { beat: NaN }, { size: Infinity }]) assert.equal(validTake({ ...PRESETS[0], notes: [{ ...PRESETS[0].notes[0], ...bad }] }), null)
const old = 'v1.' + btoa(JSON.stringify({ title: 'Old take', tempo: 84, slots: [{ kind: 'harp', pitch: 1 }, null] }))
assert.equal(decodeTake(old)?.notes[0].kind, 'harp')
assert.equal(decodeTake(old)?.tracks.length, 1)
assert.equal(validTake({ ...PRESETS[0], tempo: 900 })?.tempo, 160)
assert.equal(frequency(0), frequency(5) / 2)
assert.ok(Math.abs(frequency(-1) - 220) < .001)

// The ball is on the instrument at the sound event; every segment, including
// the return belt and vertical lift, meets its neighbor without teleportation.
for (const take of PRESETS) {
  const routes = routesFor(take), events = scoreFor(take)
  assert.equal(events.length, take.notes.length)
  for (const route of routes) {
    for (const [i, segment] of route.segments.entries()) {
      assert.deepEqual(onSegment(segment, 0), { x: segment.a.x, y: segment.a.y })
      assert.deepEqual(onSegment(segment, 1), { x: segment.b.x, y: segment.b.y })
      assert.ok(segment.b.beat > segment.a.beat)
      const next = route.segments[(i + 1) % route.segments.length]
      assert.equal(segment.b.x, next.a.x); assert.equal(segment.b.y, next.a.y)
    }
    assert.deepEqual(routeAt(route, 0, take.length), routeAt(route, take.length, take.length))
    for (const n of take.notes.filter(n => n.track === route.track)) {
      const event = events.find(e => e.id === n.id)!, point = routeAt(route, event.at / STEP, take.length)
      assert.ok(Math.abs(point.x - beatX(n.beat)) < 1e-8 && Math.abs(point.y - n.y) < 1e-8, `${n.kind}: exact contact`)
    }
    for (let beat = 0; beat < take.length; beat += .013) {
      const p = routeAt(route, beat, take.length)
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && p.y >= 0 && p.y <= boardHeight(take))
    }
  }
}
const muted = copy(PRESETS[0]); muted.tracks[1].muted = true
assert.ok(scoreFor(muted).every(e => e.slot !== 1))
assert.deepEqual(routesFor(muted), routesFor(PRESETS[0]), 'mute changes sound, never the physical route')
const long = copy(PRESETS[0]); resizeTake(long, 24)
assert.ok(long.notes.every(n => n.beat >= .5 && n.beat <= 22)); resizeTake(long, 8)
assert.ok(long.notes.every(n => n.beat >= .5 && n.beat <= 6))

const take = PRESETS[0], events = scoreFor(take), cycle = take.length * STEP
const whole = eventsBetween(events, cycle, -.38, cycle * 3), chunks: typeof whole = []
for (let from = -.38; from < cycle * 3; from += .037) chunks.push(...eventsBetween(events, cycle, from, Math.min(cycle * 3, from + .037)))
assert.deepEqual(chunks, whole); assert.equal(whole.length, events.length * 3)
assert.equal(whole.filter(e => Math.abs(e.absolute - STEP) < .000001).length, 3, 'three tracks strike in sync')
assert.equal(eventsBetween(events, cycle, -1, 0).length, 0)

const prints: number[] = []
for (const kind of VOICES) {
  const samples = voiceSamples(kind, 0, 24000)
  let energy = 0, tail = 0, peak = 0
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]; assert.ok(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); energy += v * v
    if (i > samples.length * .9) tail += v * v
  }
  assert.equal(samples[0], 0); assert.ok(peak < .95 && peak > .05)
  assert.ok(Math.sqrt(energy / samples.length) > .005 && tail / energy < .05)
  prints.push(Math.round(energy * 1000))
}
assert.equal(new Set(prints).size, 6)
console.log('Pocket Orchestra: continuous rails/lifts, exact contacts, synchronized tracks, editing bounds, links, six acoustic voices ✓')
