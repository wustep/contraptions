/** Phrase-led choreography. No planner, random choices, or material beyond 30s. */
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { ballAt, laneTime, type BallState, type Pt } from '../apps/rube/src/parts'
import { worldByName } from '../apps/rube/src/worlds'
import type { Phrase, PremiereScore, TimedMap, TimedPiece } from '../apps/rube/src/timed/premiere-arabesque/types'
import type { Rng } from '../src/core/rng'

const phrases: Phrase[] = [
  { title: 'Unfurling', begin: 0, end: 4.90 },
  { title: 'The first wave', begin: 4.90, end: 13.70 },
  { title: 'Weight and suspension', begin: 13.70, end: 22.49 },
  { title: 'Lift and drift', begin: 22.49, end: 30 },
]
const maps: TimedMap[] = []
let map: TimedMap
let col = 0, row = 0
let mirror: 1 | -1 = 1
let ball: BallState = { color: '#E5647E', ghost: false, id: 0 }

function scene(title: string, world: TimedMap['world'], begin: number, end: number, start: Pt, direction: 1 | -1, camera: TimedMap['camera']) {
  map = { title, world, begin, end, backdrop: world === 'garden' ? 'sprigs' : world === 'harbor' ? 'waves' : 'dots', pieces: [], camera }
  maps.push(map)
  ;[col, row] = start
  mirror = direction
}

interface Choice {
  exit?: Pt
  pick?: string
  strike?: number
  /** Additional real/native anchors for a held load or a landing. */
  anchors?: (piece: TimedPiece) => [number, number][]
}

function put(name: string, end: number, color: string, label: string, choice: Choice = {}) {
  const world = worldByName(map.world)!
  const piece = world.pieces.find((p) => p.name === name)!
  assert.ok(piece, `Unknown stock piece ${map.world}/${name}`)
  // Enumerate variants in their declared order; fits selects the authored exit.
  const rng = new Proxy({
    shuffle: <T>(items: readonly T[]) => [...items],
    weighted: <T>(items: readonly T[]) => items[0],
    pick: <T>(items: readonly T[]): T => {
      const selected = choice.pick as T
      assert.ok(items.includes(selected), `Missing explicit choice for ${name}`)
      return selected
    },
  }, { get(target, key) {
    if (key in target) return target[key as keyof typeof target]
    throw new Error(`Randomness is forbidden: ${String(key)}`)
  } }) as unknown as Rng
  const placement = piece.place({
    rng, color, theme: world.themes[0], taste: { weights: {} }, ball, earned: 0,
    fits: (_cells, exit) => !choice.exit || exit[0] === choice.exit[0] && exit[1] === choice.exit[1],
  })
  assert.ok(placement, `Cannot place ${name}`)
  const begin = map.pieces.at(-1)?.end ?? map.begin
  const nativeEnd = laneTime(placement.lane)
  const saved: TimedPiece = {
    name, label, begin, end, col, row, mirror,
    cells: placement.cells.map(([x, y]) => [col + mirror * x, row + y]),
    lane: placement.lane, state: placement.state, ballIn: ball, changes: placement.changes ?? [], timing: [],
  }
  const anchors: [number, number][] = [[begin, 0], ...(choice.strike === undefined ? [] : [[choice.strike, placement.lane.fire] as [number, number]]), ...(choice.anchors?.(saved) ?? []), [end, nativeEnd]]
  anchors.sort((a, b) => a[0] - b[0])
  for (let i = 1; i < anchors.length; i++) {
    assert.ok(anchors[i][0] > anchors[i - 1][0] && anchors[i][1] >= anchors[i - 1][1], `Nonmonotone timing for ${label}`)
  }
  saved.timing = anchors.map(([time, native]) => ({ time, native, slope: 0 }))
  map.pieces.push(saved)
  ball = ballAt(ball, saved.changes, nativeEnd)
  col += mirror * placement.exit.at[0]
  row += placement.exit.at[1]
  mirror = mirror * placement.exit.dir as 1 | -1
}

// These stock pieces enter with roll + braking ramp. Add time where the ball
// has already stopped, before the mechanism releases, rather than stretching a fall.
function holdAfterArrival(piece: TimedPiece, begin: number, end: number): [number, number][] {
  const rest = piece.lane.segs[0].dur + piece.lane.segs[1].dur
  return [[begin, rest], [end, rest]]
}

// The phrase map in docs/promo/PREMIERE_PHRASE_MAP.md comes first. Only selected
// gestures use a strike anchor; every other event takes its time from its phrase.
// One continuous garden. A musical phrase never resets the map or the camera.
scene('A long garden', 'garden', 0, 30, [0, 0], 1, [
  { time: 0, x: 1.3, y: -0.7, visible: 5.1 },
  { time: 2.7, x: 1.6, y: -0.95, visible: 4.5 },
  { time: 4.9, x: 2.1, y: -0.4, visible: 5.4 },
  { time: 7.7, x: 3.1, y: 1.1, visible: 5.4 },
  { time: 9.45, x: 3.5, y: 0.5, visible: 4.7 },
  { time: 10.65, x: 4.4, y: -0.2, visible: 5.3 },
  { time: 13.7, x: 6, y: -0.2, visible: 5.3 },
  { time: 15.6, x: 7.6, y: -0.15, visible: 4.7 },
  { time: 17.06, x: 8.2, y: 0.05, visible: 4.5 },
  { time: 19.6, x: 9.4, y: 0.8, visible: 5.5 },
  { time: 22.49, x: 12, y: 1.4, visible: 5.5 },
  { time: 24.77, x: 14.7, y: 0.4, visible: 5.2 },
  { time: 26.7, x: 14.6, y: -0.1, visible: 5.5 },
  { time: 30, x: 13.8, y: -0.3, visible: 5.5 },
])
put('rail', 0.38, '#F0B429', 'One-cell lead-in', { pick: 'pot' })
put('vine', 2.65, '#5C9E4A', 'A vine grows two floors', { exit: [1, -2] })
put('rail', 3.00, '#9A7BC4', 'A breath at the top', { pick: 'tuft' })
put('bamboo', 4.90, '#F0B429', 'Bamboo rests, tips down, and turns back', {
  anchors: (p) => holdAfterArrival(p, 3.35, 4.00),
})

// The first wave travels down the well beside the opening, then climbs back up.
put('well', 7.70, '#9A7BC4', 'A bucket descends three floors and turns east', { exit: [-1, 3], strike: 5.50 })
put('spade', 10.65, '#F0B429', 'A held spade launches the ball two floors', {
  exit: [1, -2], strike: 9.45, anchors: (p) => holdAfterArrival(p, 8.05, 9.10),
})
put('snail', 14.18, '#9A7BC4', 'A quiet shell ride carries across the phrase boundary')

// The music answers while the same garden continues. The apple takes over;
// a mallet gives the accent, a leaf and barrow let the following bars breathe.
put('appletree', 15.05, '#F0B429', 'The ball knocks an apple free', { pick: '#5C9E4A', strike: 14.37 })
put('croquet', 17.40, '#C9643B', 'A mallet waits, then swings through the accent', {
  strike: 17.06, anchors: (p) => holdAfterArrival(p, 15.45, 16.65),
})
put('maple', 20.60, '#C9643B', 'A maple leaf holds, then drifts two floors down', {
  exit: [1, 2], strike: 18.57, anchors: (p) => holdAfterArrival(p, 17.80, 18.15),
})
put('wheelbarrow', 22.49, '#5C9E4A', 'A barrow carries the phrase below the upper path')

// The last gesture rises above the route, reverses, and coils down into a bloom.
put('toadstools', 24.50, '#E5647E', 'Three mushrooms bounce uphill')
put('dandelion', 27.80, '#9A7BC4', 'A seed lifts two floors and folds back west', {
  exit: [-1, -2], strike: 25.10, anchors: (p) => [[27.17, p.lane.fire + 2.10]],
})
put('bloom', 30, '#E5647E', 'The ball circles a flower and leaves one floor lower', { exit: [1, 1] })

// Monotone cubic time maps. Interior tangents are harmonic means; two touching
// pieces share one end tangent, so the clock rate cannot jump at a handoff.
const secant = (p: TimedPiece, i: number) => {
  const a = p.timing[i], b = p.timing[i + 1]
  return (b.native - a.native) / (b.time - a.time)
}
for (const map of maps) {
  for (const p of map.pieces) {
    p.timing.forEach((k, i, knots) => {
      if (!i) k.slope = Math.min(0.8, secant(p, 0) * 2)
      else if (i === knots.length - 1) k.slope = Math.min(0.8, secant(p, i - 1) * 2)
      else {
        const a = secant(p, i - 1), b = secant(p, i)
        k.slope = a + b ? 2 * a * b / (a + b) : 0
      }
    })
  }
  for (let i = 1; i < map.pieces.length; i++) {
    const a = map.pieces[i - 1].timing.at(-1)!, b = map.pieces[i].timing[0]
    a.slope = b.slope = Math.min(a.slope, b.slope)
  }
  const occupied = new Set<string>()
  for (const p of map.pieces) for (const cell of p.cells) {
    const key = cell.join(',')
    assert.ok(!occupied.has(key), `${map.title}: overlapping cell ${key}`)
    occupied.add(key)
  }
  assert.equal(map.pieces.at(-1)!.end, map.end)
}

const score: PremiereScore = { id: 'premiere-arabesque-prati-garden', title: 'Première Arabesque', performer: 'Patrizia Prati', revision: 3, audioOffset: 2.38, duration: 30, phrases, maps }
writeFileSync('apps/rube/src/timed/premiere-arabesque/score.study-3.generated.json', JSON.stringify(score) + '\n')
console.log(`Saved four phrases in one garden, ${maps[0].pieces.length} stock pieces. Two rail cells, no portals or ribbons, 30 seconds.`)
