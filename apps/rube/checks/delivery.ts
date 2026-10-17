import assert from 'node:assert/strict'
import { Depot, SHIFT } from '../src/games/special-delivery/game'
import type { Address, Color } from '../src/games/special-delivery/machines'

let checks = 0
function check(name: string, run: () => void): void { run(); checks++; console.log(`  ✓ ${name}`) }
function until(game: Depot, condition: () => boolean, limit = 12): void {
  const end = game.time + limit
  while (!condition() && game.time < end) game.advance(game.time + 0.025)
  assert.ok(condition(), `condition did not resolve at ${game.time}`)
}
function ready(game: Depot, color: Color): void { assert.ok(game.paint(color)); until(game, () => game.ready.length > 0) }

check('a reserved request survives its deadline and only scores on arrival', () => {
  const g = new Depot('reservation')
  ready(g, 0)
  g.orders[0].until = g.time + 0.1
  assert.ok(g.send(0)); assert.equal(g.score, 0)
  until(g, () => g.delivered === 1)
  assert.equal(g.score, 100); assert.equal(g.missed, 0)
  assert.equal(g.orders[0].serial, 2)
})
check('a wrong parcel comes back, keeps its identity, and earns a rescue bonus', () => {
  const g = new Depot('rescue', true)
  ready(g, 0)
  const id = g.ready[0].id
  const old = g.position(g.ready[0], 0.2)
  assert.ok(g.send(1))
  until(g, () => g.rework.length === 1)
  assert.equal(g.mistakes, 1); assert.equal(g.score, 0)
  assert.equal(g.rework[0].id, id)
  ready(g, 1)
  assert.equal(g.ready[0].id, id)
  assert.deepEqual(g.position(g.ready[0], 0.2), old)
  assert.ok(g.send(1)); until(g, () => g.delivered === 1)
  assert.equal(g.score, 150); assert.equal(g.rescues, 1)
  assert.equal(g.activeCount, 0)
})
check('feed hold, full intake, parking, and swap preserve queue order', () => {
  const g = new Depot('queues', true)
  g.hold()
  for (const c of [0, 1, 2] as Color[]) assert.ok(g.paint(c))
  assert.equal(g.paint(0), false)
  g.advance(5); assert.equal(g.ready.length, 0)
  assert.equal(g.intake.length, 3)
  g.hold(); until(g, () => g.ready.length === 3)
  assert.deepEqual(g.ready.map((p) => p.color), [0, 1, 2])
  g.park(); assert.equal(g.parked?.color, 0)
  assert.deepEqual(g.ready.map((p) => p.color), [1, 2])
  g.park(); assert.equal(g.parked?.color, 1)
  assert.deepEqual(g.ready.map((p) => p.color), [0, 2])
})
check('busy cannon and reserved addresses never consume a second parcel', () => {
  const g = new Depot('busy', true)
  g.paint(0); g.paint(1); until(g, () => g.ready.length === 2)
  g.send(0)
  const id = g.ready[0].id
  assert.equal(g.send(1), false); assert.equal(g.ready[0].id, id)
  g.advance(g.cannonFree)
  assert.equal(g.send(0), false); assert.equal(g.ready[0].id, id)
})
check('last-second sends count after the bell; new work cannot enter', () => {
  const g = new Depot('last-post')
  g.advance(85)
  const color = g.orders[0].color
  g.orders[0].until = 100
  ready(g, color)
  g.advance(89.9); assert.ok(g.send(0))
  g.advance(SHIFT)
  assert.equal(g.phase, 'closing')
  assert.equal(g.paint(0), false); assert.equal(g.send(1), false)
  until(g, () => g.phase === 'finished')
  assert.equal(g.delivered, 1); assert.equal(g.score, 100)
})
check('deadlines end an idle shift and never run during training', () => {
  const g = new Depot('idle'); g.advance(100)
  assert.equal(g.phase, 'finished'); assert.ok(g.missed > 9); assert.equal(g.time, SHIFT)
  const training = new Depot('training', true); training.advance(120)
  assert.equal(training.missed, 0); assert.equal(training.phase, 'open')
})
check('event results are independent of rendering frame size', () => {
  const play = (step: number) => {
    const g = new Depot('same-order-sequence')
    const advance = (target: number) => { while (g.time < target && g.phase !== 'finished') g.advance(Math.min(target, g.time + step)) }
    const actions: [number, 'paint' | 'send', number][] = [[0, 'paint', 0], [0.5, 'paint', 1], [1, 'paint', 2], [4, 'send', 0], [7, 'send', 1], [10, 'send', 0], [18, 'paint', 2], [22, 'send', 2]]
    for (const [at, action, value] of actions) { advance(at); if (action === 'paint') g.paint(value as Color); else g.send(value as Address) }
    advance(100)
    return { score: g.score, delivered: g.delivered, missed: g.missed, deliveries: g.deliveries, choices: g.choices, orders: g.orders }
  }
  assert.deepEqual(play(0.017), play(100))
})
check('saturated mixed inputs cannot overflow buffers, lose identity, or create lane jumps', () => {
  const g = new Depot('stress')
  for (let i = 0; i < 720; i++) {
    g.advance(i / 8)
    if (i % 2 === 0) g.paint((i % 3) as Color)
    if (i % 7 === 0) g.send((i % 3) as Address)
    if (i % 17 === 0) g.park()
    if (i % 31 === 0) g.hold()
    assert.ok(g.intake.length <= 3); assert.ok(g.load <= 3); assert.ok(g.activeCount <= 8)
    assert.equal(g.production.length, g.painting)
    const assigned = [...g.intake, ...g.production, ...g.ready, ...g.rework, ...(g.parked ? [g.parked] : [])]
    assert.equal(new Set(assigned.map((p) => p.id)).size, assigned.length)
  }
  for (const p of g.parcels) for (const m of p.motions) {
    assert.ok(m.lane.segs.every((s) => s.dur >= 0))
    for (let i = 1; i < m.lane.segs.length; i++) {
      const a = m.lane.segs[i - 1].to, b = m.lane.segs[i].from
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.00001, `parcel ${p.id} lane seam`)
    }
  }
  g.advance(100); assert.equal(g.phase, 'finished')
})
console.log(`Special Delivery: ${checks} behavioral checks passed.`)
