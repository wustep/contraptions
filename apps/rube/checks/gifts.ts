import assert from 'node:assert/strict'
import { GiftPerformance } from '../src/games/extremely-normal-gifts/performance'
import { cleanText, decodeRecipe, encodeRecipe, FINALS, replyRecipe, type Recipe } from '../src/games/extremely-normal-gifts/recipe'
import { snowblower } from '../src/playground/pieces/alpine/snowblower'
import { laneAt } from '../src/parts'

const recipe: Recipe = { v: 1, to: 'Zoë 🎁', from: '蒼', message: 'You make ordinary days better.', picks: [0, 0, 0], finale: 'fanfare', seed: 'normal-test', hop: 0 }
assert.deepEqual(decodeRecipe(encodeRecipe(recipe)), recipe, 'Unicode recipe round trips')
assert.equal(decodeRecipe(encodeRecipe({ ...recipe, message: 'Hello.\nVery\tgood socks.' }))?.message, 'Hello. Very good socks.', 'Multiline notes remain shareable')
assert.equal(cleanText('  \u0000Nice   socks.\r\n'), 'Nice socks.')
const raw = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url')
for (const bad of ['', 'not+a-recipe', '%', 'a'.repeat(4097), raw({ ...recipe, v: 2 }), raw({ ...recipe, picks: [0, -1, 2] }), raw({ ...recipe, picks: [0, 1.5, 2] }), raw({ ...recipe, picks: [0, 1] }), raw({ ...recipe, message: ' ' }), raw({ ...recipe, message: 'a'.repeat(81) }), raw({ ...recipe, to: 'x'.repeat(29) }), raw({ ...recipe, finale: 'nope' }), raw({ ...recipe, hop: -1 }), raw({ ...recipe, seed: null }), raw({ ...recipe, message: '<b>hi</b>\u0000' })]) {
  assert.equal(decodeRecipe(bad), null, `Reject malformed recipe: ${bad.slice(0, 30)}`)
}
assert.equal(decodeRecipe(encodeRecipe({ ...recipe, message: '<img src=x onerror=alert(1)>' }))?.message, '<img src=x onerror=alert(1)>', 'Text stays data; the UI escapes it')
const reply = replyRecipe(recipe)
assert.equal(reply.to, recipe.from); assert.equal(reply.from, recipe.to); assert.equal(reply.message, recipe.message); assert.equal(reply.hop, 1)
reply.picks[0] = 1
assert.equal(recipe.picks[0], 0, 'Reply choices cannot mutate the original')

let variants = 0
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
  for (const opening of ['gentle', 'deluxe'] as const) for (const finale of FINALS) {
    const gift = { ...recipe, picks: [a, b, c] as Recipe['picks'], finale: finale.id }
    const show = new GiftPerformance(gift, opening, snowblower)
    const replay = new GiftPerformance(gift, opening, snowblower)
    assert.equal(show.departments.length, opening === 'deluxe' ? 4 : 3)
    assert.ok(show.duration >= 10 && show.duration < 15, 'Sessions remain short')
    assert.ok(show.finaleStart < show.duration)
    for (const [index, department] of show.departments.entries()) {
      assert.ok(department.fire >= department.start && department.fire < department.start + department.duration)
      const occupied = new Set<string>()
      for (const placed of department.universe.pieces) {
        for (const cell of placed.cells) {
          assert.ok(!occupied.has(cell.join(',')), 'Authored footprints do not overlap')
          occupied.add(cell.join(','))
        }
        assert.ok(placed.lane.segs.every(seg => seg.dur > 0 && Number.isFinite(seg.dur)))
      }
      const pieces = department.universe.pieces
      for (let i = 0; i < pieces.length - 1; i++) {
        const from = pieces[i]; const to = pieces[i + 1]
        const end = laneAt(from.lane, from.span); const start = laneAt(to.lane, 0)
        assert.ok(Math.hypot(from.col + end.x - to.col - start.x, from.row + end.y - to.row - start.y) < 1e-8, 'Portal and actor lanes hand off continuously')
      }
      if (index > 0) assert.deepEqual(pieces[0].ballIn, show.atDepartment(index - 1, Infinity).ball, 'Color and relay identity survive portal handoffs')
    }
    for (let t = 0; t <= show.duration; t += 1 / 30) {
      const at = show.at(t); const again = replay.at(t)
      assert.ok([at.x, at.y, at.scale, at.local].every(Number.isFinite))
      assert.deepEqual([at.x, at.y, at.scale, at.ball], [again.x, again.y, again.scale, again.ball], 'Every replay is deterministic')
    }
    if (b === 0) assert.equal(show.at(Infinity).ball.color, '#ffffff', 'Snow visibly coats the gift white')
    if (b === 2) assert.equal(show.at(Infinity).ball.id, 1, 'The apple inherits the delivery thread')
    variants++
  }
}
console.log(`Gifts: ${variants} deterministic deliveries, continuous portal handoffs, transformations, Unicode links and invalid-input checks passed.`)
