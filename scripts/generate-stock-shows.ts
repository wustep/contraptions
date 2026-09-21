/** Compile explicit arrangements. Musical fit comes from piece order, never retiming. */
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ballAt, laneAt, laneTime, type BallState, type Pt } from '../apps/rube/src/parts'
import { worldByName } from '../apps/rube/src/worlds'
import type { StockMap, StockScore, StockSpec } from '../apps/rube/src/shows/stock/types'
import type { Phrase } from '../apps/rube/src/timed/premiere-arabesque/types'
import premiere from '../apps/rube/src/timed/premiere-arabesque/score.generated.json'
import { stockPlacement } from './stock-placement'

const clairPhrases: [number, string, number][] = [
  [16.07, 'Opening statement', 6], [32.1235, 'Quiet answer', 6],
  [47.9476, 'The line gathers', 5.6], [62.1054, 'Opening crest', 5.4],
  [76.9018, 'Growing branches', 5.6], [97.4451, 'Leaves after the crest', 6],
  [113.1594, 'Across the terrace', 5.6], [126.8981, 'The softer answer', 6],
  [140.8165, 'Toward the water', 5.8], [157.299, 'Rising swell', 5.2],
  [177.3136, 'The wide wave', 5.4], [196.3303, 'Receding', 6.2],
  [209.3707, 'Returning line', 6], [227.8288, 'Lights across the melody', 5.8],
  [245.3789, 'A brighter answer', 5.4], [260.0655, 'The last crest', 5.6],
  [279.4814, 'Descending coda', 6.2], [301.648526, 'Release and resonance', 6.4],
]
const cueSets = {
  premiere: [['cannon',8.58],['hammer',15.31],['inverter',58.85],['vine',71.24],['dandelion',98.57],['frog',124.76],['dolphin',148.78],['oyster',157.94],['whirlpool',168.87],['hoops',215.76],['striker',223.94],['hockey',241.76]],
  clair: [['trapeze',9.8043],['bell',32.1235],['pendulum',47.9476],['spade',74.4074],['croquet',105.2573],['frog',123.5857],['blowhole',150.285],['dolphin',157.299],['oyster',183.2002],['hoops',218.7993],['striker',245.3789],['changer',260.0655]],
} satisfies Record<string, [string, number][]>

interface Arrangement { world: StockMap['world']; target: number; pieces: StockSpec[] }

type Work = 'premiere' | 'clair' | 'clair-b'
const IDS: Record<Work, string> = { premiere: 'premiere-arabesque/take-b', clair: 'clair-de-lune/take-a', 'clair-b': 'clair-de-lune/take-b' }
const COMMANDS: Record<Work, string> = { premiere: 'premiere:b', clair: 'clair', 'clair-b': 'clair:b' }
const REPORTS: Record<Work, string> = { premiere: 'PREMIERE_TAKE_B', clair: 'CLAIR_TAKE_A', 'clair-b': 'CLAIR_TAKE_B' }

function generate(work: Work) {
  const arabesque = work === 'premiere'
  const id = IDS[work]
  const command = COMMANDS[work]
  const plan: Arrangement[] = JSON.parse(readFileSync(`scripts/show-plans/${work}.json`, 'utf8'))
  const maps: StockMap[] = []
  let cursor = 0
  let ball: BallState = { color: '#E76B31', ghost: false, id: 0 }
  for (const [index, scene] of plan.entries()) {
    const world = worldByName(scene.world)!
    const map: StockMap = { world: scene.world, begin: cursor, end: 0,
      backdrop: (['dots', 'sprigs', 'waves', 'stars'] as const)[index], pieces: [] }
    let col = 0, row = 0, mirror: 1 | -1 = 1
    const occupied = new Set<string>()
    for (const [i, spec] of scene.pieces.entries()) {
      const placed = stockPlacement(world, spec, ball, i)
      const cells: Pt[] = placed.cells.map(([x, y]) => [col + mirror * x, row + y])
      for (const cell of cells) {
        assert.ok(!occupied.has(cell.join(',')), `${id}/${map.world}/${spec.name}: overlapping cell ${cell}`)
        occupied.add(cell.join(','))
      }
      const duration = laneTime(placed.lane)
      const piece = { spec, begin: cursor, end: cursor + duration, col, row, mirror, cells,
        lane: placed.lane, state: placed.state, ballIn: ball, changes: placed.changes ?? [] }
      const previous = map.pieces.at(-1)
      if (previous) {
        const a = laneAt(previous.lane, laneTime(previous.lane)), b = laneAt(piece.lane, 0)
        assert.ok(Math.hypot(previous.col + previous.mirror * a.x - col - mirror * b.x, previous.row + a.y - row - b.y) < 1e-8, `Disconnected ${spec.name}`)
      }
      map.pieces.push(piece)
      cursor = piece.end
      ball = ballAt(ball, piece.changes, duration)
      col += mirror * placed.exit.at[0]; row += placed.exit.at[1]; mirror = mirror * placed.exit.dir as 1 | -1
    }
    map.end = cursor
    assert.ok(Math.abs(map.end - scene.target) < .17, `${map.world} misses its cadence by ${map.end - scene.target}s`)
    // Clair keeps the whale in the water: the cells under its footprint are open sea, not another machine's roof.
    if (!arabesque) for (const whale of map.pieces.filter((p) => p.spec.name === 'blowhole')) {
      const own = new Set(whale.cells.map((c) => c.join(',')))
      for (const [x, y] of whale.cells) assert.ok(own.has(`${x},${y + 1}`) || !occupied.has(`${x},${y + 1}`), `${map.world}: the whale at ${x},${y} is perched on another piece`)
    }
    maps.push(map)
  }
  const phrases: Phrase[] = arabesque
    ? premiere.phrases.map(({ title, begin, end, visible }) => ({ title, begin, end, visible }))
    : clairPhrases.map(([end, title, visible], i, all) => ({ begin: i ? all[i - 1][0] : 0, end, title, visible }))
  const pieces = maps.flatMap((m) => m.pieces)
  const score: StockScore = { id, title: arabesque ? 'Première Arabesque' : 'Clair de Lune',
    performer: arabesque ? 'Patrizia Prati' : 'Laurens Goedhart',
    audioOffset: arabesque ? 2.38 : 2.44,
    duration: arabesque ? premiere.duration : 301.648526, phrases, maps,
    cues: cueSets[arabesque ? 'premiere' : 'clair'].map(([name, target]) => {
      const piece = pieces.find((p) => p.spec.name === name)!
      return { piece: name, target, actual: piece.begin + piece.lane.fire }
    }),
    ...(!arabesque ? { scores: ['arcade' as const] } : {}),
  }
  const folder = `apps/rube/src/shows/versions/${id.split('/')[0]}`
  mkdirSync(folder, { recursive: true })
  writeFileSync(`${folder}/${id.split('/')[1]}.generated.json`, JSON.stringify(score) + '\n')
  const lines = [`# ${score.title}, ${id.split('/')[1]}`, '',
    `Generated by \`npm run generate:${command}\`. Every piece runs at stock timing.`, '',
    '| World | Start | End | Cadence error | Pieces | Rails | Repeated travel |', '| --- | ---: | ---: | ---: | ---: | ---: | --- |']
  for (const [i, map] of maps.entries()) {
    // Rails are breath, counted apart and never as repeats.
    const rails = map.pieces.filter((p) => p.spec.name === 'rail').length
    const counts = new Map<string, number>()
    for (const p of map.pieces.filter((p) => p.spec.name !== 'portal' && p.spec.name !== 'rail')) counts.set(p.spec.name, (counts.get(p.spec.name) ?? 0) + 1)
    const repeats = [...counts].filter(([, n]) => n > 1).map(([name, n]) => `${name} ×${n}`).join(', ')
    lines.push(`| ${worldByName(map.world)!.label} | ${map.begin.toFixed(3)} | ${map.end.toFixed(3)} | ${(map.end - plan[i].target).toFixed(3)}s | ${map.pieces.length} | ${rails} | ${repeats || 'None'} |`)
  }
  const tail = score.duration - maps.at(-1)!.end
  const breaths = work === 'clair-b'
    ? ' Short runs of one to three stock rails give machines room and separate gestures; even three rails take only 1.154s. Rails are not counted as repeats.'
    : maps.some((m) => m.pieces.filter((p) => p.spec.name === 'rail').length > 1)
    ? ' Rails are breath: a lead-in where a world opens, and a single rail between pieces after a long run of them; they are not counted as repeats.'
    : ''
  lines.push('', tail < 5
    ? `Repeats carry the chain through the full recording and connect its terraces. All other catalog entries appear once per world.${breaths} The final portal completes the chain; only the terminal audio resonance remains.`
    : `Repeats connect the terraces. All other catalog entries appear once per world.${breaths} The final portal completes the chain ${tail.toFixed(1)}s before the recording ends, and its last bars play out over the finished machine.`, '',
    '| Stock strike | Recording cue | Actual strike | Error |', '| --- | ---: | ---: | ---: |')
  for (const cue of score.cues) lines.push(`| ${cue.piece} | ${cue.target.toFixed(3)} | ${cue.actual.toFixed(3)} | ${(cue.actual - cue.target).toFixed(3)}s |`)
  lines.push('', `Source offset: ${score.audioOffset}s. Full playback: ${score.duration.toFixed(3)}s. Final portal: ${maps.at(-1)!.end.toFixed(3)}s.`, '')
  if (work === 'clair-b') {
    const takeA: StockScore = JSON.parse(readFileSync(`${folder}/take-a.generated.json`, 'utf8'))
    const error = (cue: StockScore['cues'][number]) => Math.abs(cue.actual - cue.target)
    const mean = (s: StockScore) => s.cues.reduce((sum, cue) => sum + error(cue), 0) / s.cues.length
    lines.push('## Comparison with Take A', '',
      '| Strike | Take A error | Take B error |', '| --- | ---: | ---: |')
    for (const cue of score.cues) {
      const before = takeA.cues.find((c) => c.piece === cue.piece)!
      lines.push(`| ${cue.piece} | ${((before.actual - before.target) * 1000).toFixed(1)} ms | ${((cue.actual - cue.target) * 1000).toFixed(1)} ms |`)
    }
    lines.push('', `Mean absolute cue error: ${(mean(takeA) * 1000).toFixed(1)} ms → ${(mean(score) * 1000).toFixed(1)} ms. Maximum: ${(Math.max(...takeA.cues.map(error)) * 1000).toFixed(1)} ms → ${(Math.max(...score.cues.map(error)) * 1000).toFixed(1)} ms.`, '',
      '## Intentional repeats', '',
      'Only windchime, frog, hoops and bumper repeat. Each answer is nearby, with at most one other machine between the pair. Rails do not count toward AA or ABA. Different stock placement colors distinguish the two gestures; pusher and every other machine appear once.', '',
      '| World | Motif | First strike | Answer | Gesture | Colors |', '| --- | --- | ---: | ---: | --- | --- |')
    for (const map of maps) {
      const travel = map.pieces.filter((p) => !['rail', 'portal'].includes(p.spec.name))
      for (const name of new Set(travel.map((p) => p.spec.name))) {
        const pair = travel.filter((p) => p.spec.name === name)
        if (pair.length !== 2) continue
        const between = travel.slice(travel.indexOf(pair[0]) + 1, travel.indexOf(pair[1])).map((p) => p.spec.name)
        lines.push(`| ${worldByName(map.world)!.label} | ${name} | ${(pair[0].begin + pair[0].lane.fire).toFixed(3)} | ${(pair[1].begin + pair[1].lane.fire).toFixed(3)} | ${[name, ...between, name].join(' → ')} | ${pair.map((p) => (p.state as { color: string }).color).join(' → ')} |`)
      }
    }
    lines.push('',
      '## Phrase arrangement', '',
      'The twelve named strikes keep the original Goedhart cue targets. Stock exit variants choose the route; their lanes, fire times and mechanism state come directly from the catalog. No duration, phrase landmark, playback rate or audio offset is adjusted. Regular and Aqua have no repeated machines. Forest and Arcade each retain two repeats. Rails replace the other 25 repeats and spread the machines across more open routes.', '',
      '| World | Cue sequence | Piece order, with rails shown as breath |', '| --- | --- | --- |')
    for (const map of maps) {
      const names = new Set(map.pieces.map((p) => p.spec.name))
      const cues = score.cues.filter((c) => names.has(c.piece)).map((c) => `${c.piece} at ${c.target.toFixed(3)}s`).join(' → ')
      const route: string[] = []
      let rails = 0
      const breath = () => { if (rails) route.push(`rail ×${rails}`); rails = 0 }
      for (const piece of map.pieces.filter((p) => p.spec.name !== 'portal')) {
        if (piece.spec.name === 'rail') { rails++; continue }
        breath()
        route.push(piece.spec.name)
      }
      breath()
      const order = route.join(' → ')
      lines.push(`| ${worldByName(map.world)!.label} | ${cues} | ${order} |`)
    }
    lines.push('')
  }
  writeFileSync(`docs/promo/${REPORTS[work]}_ARRANGEMENT.md`, lines.join('\n'))
  console.log(`${id}: ${pieces.length} pieces, ${score.duration.toFixed(3)}s, four maps, zero authored rests or clock changes.`)
}

const work = process.argv[2]
assert.ok(work === 'premiere' || work === 'clair' || work === 'clair-b', 'Choose premiere, clair or clair-b')
generate(work)
