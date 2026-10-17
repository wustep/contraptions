import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { laneAt, laneTime } from '../src/parts'
import { RESIDENTS, TOYS, behaviors, cleanName, decide, freshMemory, parseMemory, personalize, remember, type Decision } from '../src/games/pet-the-machine/model'
import { actorTime, loadCast, perform } from '../src/games/pet-the-machine/performance'

let checks = 0
function check(name: string, test: () => void): void {
  test()
  checks++
  console.log(`  ok   ${name}`)
}

async function main(): Promise<void> {
  console.log('\nPet the Machine')
  check('all nine first gifts have their own reaction, and deciding does not mutate memory', () => {
    for (const resident of RESIDENTS) for (const toy of TOYS) {
      const memory = freshMemory()
      const before = JSON.stringify(memory)
      assert.equal(decide(memory, resident, toy).behavior, `${resident}-${toy}`)
      assert.equal(JSON.stringify(memory), before)
    }
  })
  check('only completed encounters are remembered; repeated discoveries never inflate the scrapbook', () => {
    const memory = freshMemory()
    const decision = decide(memory, 'snail', 'ball')
    assert.equal(memory.visits.snail, 0)
    assert.equal(remember(memory, decision), true)
    assert.equal(remember(memory, decision), false)
    assert.equal(memory.visits.snail, 2)
    assert.deepEqual(memory.found, ['snail-ball'])
  })
  check('an encore needs the same resident and bell twice in a row', () => {
    for (const resident of ['snail', 'frog'] as const) {
      const memory = freshMemory()
      remember(memory, decide(memory, resident, 'bell'))
      assert.equal(decide(memory, resident, 'bell').behavior, resident === 'snail' ? 'snail-again' : 'frog-encore')
      remember(memory, decide(memory, 'fern', 'bell'))
      assert.equal(decide(memory, resident, 'bell').behavior, `${resident}-bell`)
    }
  })
  check('a gentle pat unlocks trust; another gift can still reveal the ordinary umbrella', () => {
    const memory = freshMemory()
    memory.pats.fern++
    const trusted = decide(memory, 'fern', 'pompom')
    assert.equal(trusted.behavior, 'fern-trust')
    remember(memory, trusted)
    assert.equal(decide(memory, 'fern', 'pompom').behavior, 'fern-pompom')
  })
  check('catch needs both friends introduced and neighboring perches', () => {
    const memory = freshMemory()
    memory.perches = 'together'
    assert.equal(decide(memory, 'frog', 'ball').behavior, 'frog-ball')
    remember(memory, decide(memory, 'snail', 'ball'))
    assert.equal(decide(memory, 'frog', 'ball').behavior, 'frog-ball')
    remember(memory, decide(memory, 'frog', 'ball'))
    assert.equal(decide(memory, 'frog', 'ball').behavior, 'neighbors')
    memory.perches = 'apart'
    assert.equal(decide(memory, 'frog', 'ball').behavior, 'frog-ball')
  })
  check('all thirteen discoveries are reachable in a normal visit', () => {
    const memory = freshMemory()
    for (const resident of RESIDENTS) for (const toy of TOYS) {
      remember(memory, decide(memory, resident, toy))
      if (toy === 'bell') remember(memory, decide(memory, resident, toy))
    }
    memory.pats.fern++
    memory.last = null
    remember(memory, decide(memory, 'fern', 'pompom'))
    memory.perches = 'together'
    remember(memory, decide(memory, 'frog', 'ball'))
    assert.deepEqual([...memory.found].sort(), behaviors.map((b) => b.id).sort())
  })
  check('unknown versions, invalid JSON, missing fields, and corrupt counts recover safely', () => {
    for (const raw of [null, '{broken', 'null', '[]', '{}', '{"version":99}']) assert.deepEqual(parseMemory(raw), freshMemory())
    const recovered = parseMemory(JSON.stringify({ version: 1, names: { snail: '   ', fern: null }, visits: { snail: -4, frog: 2.5, fern: 2 ** 53 }, pats: { frog: 'lots' }, found: ['neighbors', 'neighbors', 'no-such-reaction', null], last: { resident: '__proto__', toy: 'ball' } }))
    assert.deepEqual(recovered.found, ['neighbors'])
    assert.deepEqual(recovered.visits, freshMemory().visits)
    assert.deepEqual(recovered.names, freshMemory().names)
    assert.equal(recovered.last, null)
  })
  check('a valid scrapbook, settings, and personal names survive serialization', () => {
    const memory = freshMemory()
    memory.names.snail = 'Professor Pip'
    memory.names.fern = '芽'
    memory.sound = false
    memory.perches = 'together'
    memory.pats.frog = 3
    remember(memory, decide(memory, 'frog', 'bell'))
    assert.deepEqual(parseMemory(JSON.stringify(memory)), memory)
  })
  check('names preserve whole Unicode characters and are substituted only once', () => {
    assert.equal(cleanName('  \n\t ', 'Pip'), 'Pip')
    assert.equal(Array.from(cleanName('🌱'.repeat(20), 'Fern')).length, 18)
    assert.equal(personalize('Moss throws. Pip thinks.', { snail: 'Moss', frog: 'Fern', fern: 'Pip' }), 'Fern throws. Moss thinks.')
  })

  const cast = await loadCast()
  for (const behavior of behaviors) check(`${behavior.id}: deterministic, continuous, finite, bounded, and less than eleven seconds`, () => {
    for (const perches of ['apart', 'together'] as const) {
      const decision: Decision = { resident: behavior.resident, toy: behavior.toy, behavior: behavior.id, perches }
      const play = perform(cast, decision, freshMemory().names)
      const again = perform(cast, decision, freshMemory().names)
      assert.deepEqual(play.lane, again.lane)
      assert.ok(play.duration > 2 && play.duration < 11)
      assert.ok(play.hero > 0 && play.hero < play.duration)
      assert.ok(Math.abs(laneTime(play.lane) - play.duration) < 1e-9)
      play.lane.segs.forEach((seg, i, all) => {
        assert.ok(seg.dur > 0)
        assert.ok([...seg.from, ...seg.to, seg.dur].every(Number.isFinite))
        if (i) assert.ok(Math.hypot(all[i - 1].to[0] - seg.from[0], all[i - 1].to[1] - seg.from[1]) < 1e-6)
      })
      for (let t = -1; t <= play.duration + 4; t += 1 / 60) {
        const at = laneAt(play.lane, t)
        assert.ok(Number.isFinite(at.x) && Number.isFinite(at.y))
        assert.ok(at.x >= -6 && at.x <= 6 && at.y > -3.5 && at.y <= 2.2)
        for (const resident of RESIDENTS) assert.ok(Number.isFinite(actorTime(play, resident, t, 10)))
        for (const clip of play.clips) {
          if (clip.resident !== 'frog' || t < clip.start + 0.02 || t > clip.start + clip.duration - 0.02) continue
          const local = clip.clock(t - clip.start)
          const stock = cast.frog.placement.lane
          // Away from visibility boundaries, the sampled lane must preserve the frog's hidden mouth.
          const before = laneAt(stock, local - 0.02).hidden
          const after = laneAt(stock, local + 0.02).hidden
          if (before === after) assert.equal(at.hidden, before)
        }
      }
      play.cues.forEach((cue, i, all) => { assert.ok(cue.at >= 0 && cue.at <= play.duration); if (i) assert.ok(cue.at >= all[i - 1].at) })
      play.captions.forEach((caption, i, all) => { if (i) assert.ok(caption.at >= all[i - 1].at) })
    }
  })
  check('the game is its own entry; existing mode routes keep their trailing-slash guard', () => {
    const vite = readFileSync('vite.config.ts', 'utf8')
    assert.ok(vite.includes('games/pet-the-machine/index.html'))
    assert.ok(vite.includes('games\\/pet-the-machine'))
    const pages = [...vite.matchAll(/\$\{here\}([a-z]+)\/index\.html/g)].map((m) => m[1])
    const slashless = /\^\\\/\(([a-z|]+)\|shows/.exec(vite)?.[1].split('|') ?? []
    assert.ok(pages.every((p) => slashless.includes(p)))
  })
  console.log(`\n${checks} Pet the Machine checks passed\n`)
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
