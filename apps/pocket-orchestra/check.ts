import assert from 'node:assert/strict'
import { eventsBetween, voiceSamples } from './audio'
import { instruments, scoreFor } from './instruments'
import { PHRASES, PRESETS, STEP, VOICES, copy, decodeTake, encodeTake, frequency, validTake, type Take } from './model'

// Links are untrusted input. A damaged link must never feed NaN to a clock or
// make the renderer allocate an unbounded score.
for (const take of [...PRESETS, ...PHRASES.map(p => p.start)]) assert.deepEqual(decodeTake(encodeTake(take)), take)
const unicode = { ...copy(PRESETS[0]), title: 'Été — a tune for 雨 ♫' }
assert.deepEqual(decodeTake(encodeTake(unicode)), unicode)
for (const hash of ['', '#no', 'v2.abc', 'v1.%%%%', 'v1.' + 'A'.repeat(2001)]) assert.equal(decodeTake(hash), null)
for (const slots of [[], Array(7).fill(null), [{ kind: 'unknown', pitch: 0 }, null], [{ kind: 'harp', pitch: 1.5 }, null], [{ kind: 'triangle', pitch: -1 }, null]]) assert.equal(validTake({ slots, tempo: 84 }), null)
assert.equal(validTake({ ...PRESETS[0], tempo: Infinity }), null)
assert.equal(validTake({ ...PRESETS[0], tempo: 900 })?.tempo, 112)
assert.equal(frequency(0), frequency(5) / 2)
assert.ok(Math.abs(frequency(-1) - 220) < .001)

// Contact topology: a key/string/bar sounds on its own native contact, never
// on an approximate global metronome. Check against the stock lane/state data.
const count = { musicbox: 3, triangle: 1, harp: 9, timpani: 1, keys: 8, xylophone: 4 }
for (const kind of VOICES) {
  const inst = instruments[kind]
  assert.equal(inst.contacts.length, count[kind], `${kind} contact count`)
  assert.equal(inst.lead, inst.contacts[0].at)
  assert.ok(inst.contacts.every((e, i) => e.at >= 0 && e.at < inst.span && (!i || e.at > inst.contacts[i - 1].at)))
  const take: Take = { slots: [{ kind, pitch: 2 }, { kind: 'rest', pitch: 0 }], tempo: 84, title: kind }
  const events = scoreFor(take)
  assert.equal(events[0].at, 0)
  assert.ok(events.at(-1)!.at < STEP, `${kind} completes its figure inside a step`)
  assert.deepEqual(events.map(e => e.at), inst.contacts.map(c => c.at - inst.lead))
}
assert.equal(instruments.triangle.lead, instruments.triangle.placement.lane.segs[0].dur)
assert.deepEqual(instruments.xylophone.contacts.map(e => e.at), (instruments.xylophone.placement.state as { hits: number[] }).hits.slice(0, 4))
const drum = instruments.timpani.placement.lane
assert.equal(instruments.timpani.lead, drum.segs[0].dur + drum.segs[1].dur)

// Schedule each looping strike once across arbitrary lookahead boundaries,
// including the first strike at zero and one exactly at the seam.
const take = PRESETS[0], events = scoreFor(take), cycle = take.slots.length * STEP
const whole = eventsBetween(events, cycle, -.38, cycle * 3)
const chunks: typeof whole = []
for (let from = -.38; from < cycle * 3; from += .037) chunks.push(...eventsBetween(events, cycle, from, Math.min(cycle * 3, from + .037)))
assert.deepEqual(chunks, whole)
assert.equal(whole.length, events.length * 3)
assert.equal(whole.filter(e => e.absolute === cycle).length, 1)
assert.equal(eventsBetween(events, cycle, -1, 0).length, 0)

// Six genuinely different bounded signals, with quiet attack boundaries and
// dying tails. The quieter harp still has enough energy to survive phone speakers.
const prints: number[] = []
for (const kind of VOICES) {
  const samples = voiceSamples(kind, 0, 24000)
  let energy = 0, tail = 0, peak = 0
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i]; assert.ok(Number.isFinite(value))
    peak = Math.max(peak, Math.abs(value)); energy += value * value
    if (i > samples.length * .9) tail += value * value
  }
  assert.equal(samples[0], 0)
  assert.ok(peak < .95 && peak > .05, `${kind} usable amplitude ${peak}`)
  assert.ok(Math.sqrt(energy / samples.length) > .005, `${kind} audible energy`)
  assert.ok(tail / energy < .05, `${kind} dies away`)
  prints.push(Math.round(energy * 1000))
}
assert.equal(new Set(prints).size, 6)

const answers = [
  [{ kind: 'musicbox', pitch: 0 }, { kind: 'triangle', pitch: 0 }],
  [0, 2, 4].map(pitch => ({ kind: 'triangle', pitch })),
  [{ kind: 'harp', pitch: 1 }, { kind: 'triangle', pitch: 3 }, { kind: 'rest', pitch: 0 }, { kind: 'triangle', pitch: 0 }],
  [{ kind: 'triangle', pitch: 0 }, { kind: 'harp', pitch: 2 }, { kind: 'timpani', pitch: 0 }, { kind: 'rest', pitch: 0 }, { kind: 'triangle', pitch: 0 }, { kind: 'harp', pitch: 2 }],
  PRESETS[0].slots,
] as Take['slots'][]
for (let i = 0; i < PHRASES.length; i++) {
  assert.ok(!PHRASES[i].rules.every(r => r.test(PHRASES[i].start.slots)), `phrase ${i + 1} asks for a change`)
  assert.ok(PHRASES[i].rules.every(r => r.test(answers[i])), `phrase ${i + 1} is solvable`)
}
console.log('Pocket Orchestra: links, native contacts, scheduling seams, six voices, five solvable phrases ✓')
