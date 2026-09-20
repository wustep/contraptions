/** Compile explicit arrangements. Musical fit comes from piece order, never retiming. */
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ballAt, laneAt, laneTime, type BallState, type Pt } from '../apps/rube/src/parts'
import { worldByName } from '../apps/rube/src/worlds'
import type { StockMap, StockScore, StockSpec } from '../apps/rube/src/shows/stock/types'
import type { Phrase } from '../apps/rube/src/timed/premiere-arabesque/types'
import premiere from '../apps/rube/src/timed/premiere-arabesque/score.generated.json'
import { stockPlacement } from './stock-placement'
import { schubert } from './show-plans/schubert'

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
  schubert: schubert.cues,
} satisfies Record<string, [string, number][]>

interface Arrangement { world: StockMap['world']; target: number; pieces: StockSpec[] }

function generate(work: 'premiere' | 'clair' | 'schubert') {
  const arabesque = work === 'premiere'
  const impromptu = work === 'schubert'
  const id = impromptu ? schubert.id : arabesque ? 'premiere-arabesque/take-b' : 'clair-de-lune/take-a'
  const command = arabesque ? 'premiere:b' : work
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
    maps.push(map)
  }
  const phrases: Phrase[] = arabesque
    ? premiere.phrases.map(({ title, begin, end, visible }) => ({ title, begin, end, visible }))
    : (impromptu ? schubert.phrases : clairPhrases).map(([end, title, visible], i, all) => ({ begin: i ? all[i - 1][0] : 0, end, title, visible }))
  const pieces = maps.flatMap((m) => m.pieces)
  const score: StockScore = { id, title: impromptu ? schubert.title : arabesque ? 'Première Arabesque' : 'Clair de Lune',
    performer: impromptu ? schubert.performer : arabesque ? 'Patrizia Prati' : 'Laurens Goedhart',
    audioOffset: impromptu ? schubert.audioOffset : arabesque ? 2.38 : 2.44,
    duration: impromptu ? schubert.duration : arabesque ? premiere.duration : 301.648526, phrases, maps,
    cues: cueSets[work].map(([name, target]) => {
      const piece = pieces.find((p) => p.spec.name === name)!
      return { piece: name, target, actual: piece.begin + piece.lane.fire }
    }),
  }
  const folder = `apps/rube/src/shows/versions/${id.split('/')[0]}`
  mkdirSync(folder, { recursive: true })
  writeFileSync(`${folder}/${id.split('/')[1]}.generated.json`, JSON.stringify(score) + '\n')
  const lines = [`# ${score.title}, ${id.split('/')[1]}`, '',
    `Generated by \`npm run generate:${command}\`. Every piece runs at stock timing.`, '',
    '| World | Start | End | Cadence error | Pieces | Repeated travel |', '| --- | ---: | ---: | ---: | ---: | --- |']
  for (const [i, map] of maps.entries()) {
    const counts = new Map<string, number>()
    for (const p of map.pieces.filter((p) => p.spec.name !== 'portal')) counts.set(p.spec.name, (counts.get(p.spec.name) ?? 0) + 1)
    const repeats = [...counts].filter(([, n]) => n > 1).map(([name, n]) => `${name} ×${n}`).join(', ')
    lines.push(`| ${worldByName(map.world)!.label} | ${map.begin.toFixed(3)} | ${map.end.toFixed(3)} | ${(map.end - plan[i].target).toFixed(3)}s | ${map.pieces.length} | ${repeats || 'None'} |`)
  }
  lines.push('', 'Repeats carry the chain through the full recording and connect its terraces. All other catalog entries appear once per world. The final portal completes the chain; only the terminal audio resonance remains.', '',
    '| Stock strike | Recording cue | Actual strike | Error |', '| --- | ---: | ---: | ---: |')
  for (const cue of score.cues) lines.push(`| ${cue.piece} | ${cue.target.toFixed(3)} | ${cue.actual.toFixed(3)} | ${(cue.actual - cue.target).toFixed(3)}s |`)
  lines.push('', `Source offset: ${score.audioOffset}s. Full playback: ${score.duration.toFixed(3)}s. Final portal: ${maps.at(-1)!.end.toFixed(3)}s.`, '')
  writeFileSync(`docs/promo/${impromptu ? 'SCHUBERT_TAKE_A' : arabesque ? 'PREMIERE_TAKE_B' : 'CLAIR_TAKE_A'}_ARRANGEMENT.md`, lines.join('\n'))
  console.log(`${id}: ${pieces.length} pieces, ${score.duration.toFixed(3)}s, four maps, zero authored rests or clock changes.`)
}

const work = process.argv[2]
assert.ok(work === 'premiere' || work === 'clair' || work === 'schubert', 'Choose premiere, clair or schubert')
generate(work)
