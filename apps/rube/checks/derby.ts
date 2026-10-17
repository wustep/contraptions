import assert from 'node:assert/strict'
import {
  available,
  champion,
  commitHeat,
  HAND,
  HEATS,
  houseChoice,
  newMatch,
  resolveHeat,
  totals,
  type Card,
  type Choice,
  type Racer,
} from '../src/games/dirty-little-derby/model'
import { DerbyShow, FINISH, ROWS } from '../src/games/dirty-little-derby/race'
import { laneAt, laneTime } from '../src/parts'

const near = (a: number, b: number): void => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
const choice = (route: Choice['route'], card: Card): Choice => ({ route, card })
const clean = choice('rocket', 'clean')

// Exhaust every pairing: rules, stock-machine clock scaling, continuity, replay and finish agreement.
let combinations = 0
const choices = (['rocket', 'covered'] as const).flatMap((route) => [...HAND, 'clean' as Card].map((card) => choice(route, card)))
for (let heat = 0; heat < HEATS.length; heat++) {
  for (const a of choices)
    for (const b of choices) {
      const resolved = resolveHeat(heat, [a, b])
      const show = new DerbyShow(resolved)
      const reversed = resolveHeat(heat, [b, a])
      assert.deepEqual(resolved.outcomes, [...reversed.outcomes].reverse(), 'No lane advantage')
      assert.equal(resolved.points[0] + resolved.points[1], 4)
      for (const racer of [0, 1] as const) {
        const runner = show.runners[racer]
        near(runner.finish, resolved.outcomes[racer].time)
        for (const [index, piece] of runner.pieces.entries()) {
          near(laneTime(piece.lane), piece.span)
          assert.ok(piece.lane.segs.every((s) => s.dur > 0 && Number.isFinite(s.dur)))
          const next = runner.pieces[index + 1]
          if (next) {
            const end = laneAt(piece.lane, piece.span)
            const start = laneAt(next.lane, 0)
            near(piece.col + end.x, next.col + start.x)
            near(piece.row + end.y, next.row + start.y)
            near(next.start, piece.start + piece.span)
          }
        }
        const finish = show.position(racer, runner.finish).point
        near(finish.x, FINISH)
        near(finish.y, ROWS[racer])
        for (let t = 0; t <= runner.finish; t += 0.12) {
          const before = show.position(racer, t)
          assert.ok(Number.isFinite(before.point.x) && Number.isFinite(before.point.y))
          // A backwards scrub and another racer cannot mutate the timeline.
          show.at(t + 2)
          show.at(t - 1)
          assert.deepEqual(show.position(racer, t), before)
        }
      }
      const hasSnail = resolved.outcomes.some((o) => o.incoming === 'snail' && o.penalty)
      const hasDunk = resolved.outcomes.some((o) => o.incoming === 'dunk' && o.penalty)
      assert.equal(
        show.arena.pieces.some((p) => p.piece.name === 'snail'),
        hasSnail,
      )
      assert.equal(
        show.arena.pieces.some((p) => p.piece.name === 'dunk'),
        hasDunk,
      )
      assert.ok(
        show.arena.pieces.every((p) => p.points === 0 && !p.piece.scores),
        'Stock arcade points never count',
      )
      combinations++
    }
}
console.log(
  `  ok   ${combinations} route/card/heat pairings: finite paths, continuous handoffs, independent pieces, exact finish times, repeatable replay`,
)

assert.equal(resolveHeat(0, [clean, choice('covered', 'clean')]).winner, 0)
assert.equal(resolveHeat(0, [clean, choice('covered', 'snail')]).winner, 1, 'A prank reverses the result')
assert.equal(resolveHeat(0, [choice('rocket', 'shield'), choice('covered', 'snail')]).winner, 0, 'A shield reverses it back')
near(resolveHeat(0, [choice('covered', 'clean'), choice('rocket', 'snail')]).outcomes[0].penalty, 1.3)
near(resolveHeat(0, [choice('covered', 'clean'), choice('rocket', 'dunk')]).outcomes[0].penalty, 0.9)
assert.equal(resolveHeat(0, [choice('rocket', 'shield'), choice('rocket', 'snail')]).winner, null)
assert.equal(resolveHeat(0, [clean, choice('covered', 'boost')]).winner, 1, 'Boost can reverse the route advantage')
console.log('  ok   pranks and defenses reverse winners; cover halves both delays; boost changes the outcome')

const match = newMatch('local', 'inventory', ['A', 'B'])
commitHeat(match, [choice('rocket', 'snail'), clean])
const snapshot = JSON.stringify(match)
assert.throws(() => commitHeat(match, [choice('rocket', 'snail'), choice('covered', 'boost')]))
assert.equal(JSON.stringify(match), snapshot, 'Invalid commits are atomic')
assert.equal(available(match.drivers[0], 'snail'), false)
assert.equal(available(match.drivers[0], 'clean'), true)
commitHeat(match, [clean, clean])
commitHeat(match, [clean, clean])
assert.throws(() => commitHeat(match, [clean, clean]))
assert.deepEqual(totals(match), [7, 5])
assert.equal(champion(match), 0)
const tied = newMatch('local', 'tie', ['A', 'B'])
for (let i = 0; i < 3; i++) commitHeat(tied, [clean, clean])
assert.deepEqual(totals(tied), [6, 6])
assert.equal(champion(tied), null)
const timeBreak = newMatch('local', 'time', ['A', 'B'])
commitHeat(timeBreak, [choice('rocket', 'snail'), clean])
commitHeat(timeBreak, [clean, choice('rocket', 'dunk')])
commitHeat(timeBreak, [clean, clean])
assert.deepEqual(totals(timeBreak), [6, 6])
assert.equal(champion(timeBreak), 0, 'Equal points use total time')
console.log('  ok   single-use cards, clean reuse, three-heat limit, shared trophies and time tiebreaks')

const botCards = new Set<Card>()
const botRoutes = new Set<string>()
for (let seed = 0; seed < 300; seed++) {
  const game = newMatch('solo', `house:${seed}`, ['A', 'Pip'])
  for (let heat = 0; heat < 3; heat++) {
    const bot = houseChoice(game)
    assert.deepEqual(houseChoice(game), bot)
    assert.ok(available(game.drivers[1], bot.card))
    botCards.add(bot.card)
    botRoutes.add(bot.route)
    commitHeat(game, [choice(heat === 2 ? 'covered' : 'rocket', HAND[heat]), bot])
  }
  assert.ok([0, 1, null].includes(champion(game) as Racer | null))
}
assert.equal(botCards.size, 5)
assert.equal(botRoutes.size, 2)
console.log('  ok   300 seeded complete house derbies: no spent cards, repeatable choices, every card and route represented')
