/**
 * Headless checks for the show's pure logic: the planner, the lanes, the
 * chain of universes. No canvas is needed to be wrong about any of it.
 *
 *   npm run check:rube
 */
import { TRANSIT, ballAt, laneAt, type Pt } from './src/parts'
import { CATALOG_LIMIT, catalog } from './src/pieces'
import { Show } from './src/show'
import { THEME_MEMORY } from './src/universe'
import { beatCount } from './src/plan'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${name}`)
    return
  }
  failures++
  console.log(`  FAIL ${name}${detail ? `   ${detail}` : ''}`)
}

console.log('\ncatalog')
check(`fewer than ${CATALOG_LIMIT} pieces`, catalog.length < CATALOG_LIMIT, `${catalog.length}`)
check('every name is unique', new Set(catalog.map((c) => c.name)).size === catalog.length)
check('portal is placed by hand, not by weight', catalog.find((c) => c.name === 'portal')?.weight === 0)
check('rail is in the catalog', catalog.some((c) => c.name === 'rail'))

const SEEDS = ['amber-flywheel-812', 'quiet-cam-001', 'stubborn-winch-404', 'paper-valve-077', 'cobalt-gasket-999', 'a', 'b', 'c']
const WORLDS = 3

const eq = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6

const beats: number[] = []
for (const seed of SEEDS) {
  console.log(`\nshow · ${seed}`)
  const show = new Show(seed)
  const used = new Set<string>()
  for (let i = 0; i < WORLDS; i++) {
    const u = show.universe(i)
    const tag = `world ${i}`
    check(`${tag}: has pieces`, u.pieces.length > 2)
    check(`${tag}: journey is positive`, u.journey > 0)
    check(`${tag}: theme differs from the last`, i === 0 || u.theme.name !== show.universe(i - 1).theme.name)
    check(`${tag}: taste differs from the last`, i === 0 || u.taste !== show.universe(i - 1).taste)

    // Footprints never overlap, and stay inside the box.
    const seen = new Set<string>()
    let overlap = false
    let outside = false
    for (const placed of u.pieces) {
      for (const [c, r] of placed.cells) {
        const key = `${c}:${r}`
        if (seen.has(key)) overlap = true
        seen.add(key)
        if (c < u.box.x0 || c > u.box.x1 || r < u.box.y0 || r > u.box.y1) outside = true
      }
    }
    check(`${tag}: no two pieces share a cell`, !overlap)
    check(`${tag}: every piece is inside the box`, !outside)

    // The chain is continuous: each lane ends where the next begins, in
    // world cells; only the two portals are transits.
    let gaps = 0
    let badDur = 0
    for (let j = 0; j < u.pieces.length; j++) {
      const a = u.pieces[j]
      if (a.lane.segs.some((s) => !(s.dur > 0))) badDur++
      const b = u.pieces[j + 1]
      if (!b) continue
      const endLocal = a.lane.segs[a.lane.segs.length - 1].to
      const startLocal = b.lane.segs[0].from
      const end: Pt = [a.col + a.mirror * endLocal[0], a.row + endLocal[1]]
      const start: Pt = [b.col + b.mirror * startLocal[0], b.row + startLocal[1]]
      if (!eq(end, start)) gaps++
    }
    check(`${tag}: every lane hands off exactly where the next begins`, gaps === 0, `${gaps} gaps`)
    check(`${tag}: every segment takes time`, badDur === 0)

    // One map: a portal in, beats, a portal out, and no portal between.
    const first = u.pieces[0]
    const last = u.pieces[u.pieces.length - 1]
    const state = (p: typeof first) => p.state as { kind: string }
    check(`${tag}: opens with a portal in`, first.piece.name === 'portal' && state(first).kind === 'in')
    check(`${tag}: closes with a portal out`, last.piece.name === 'portal' && state(last).kind === 'out')
    const portals = u.pieces.filter((p) => p.piece.name === 'portal').length
    check(`${tag}: no portal in the middle of the map`, portals === 2, `${portals}`)
    check(`${tag}: has at least four beats`, beatCount(u.pieces) >= 4, `${beatCount(u.pieces)}`)
    check(`${tag}: never ends on rail`, u.pieces[u.pieces.length - 2].piece.name !== 'rail')
    beats.push(beatCount(u.pieces))
    // Consecutive rails are capped at two.
    let run = 0
    let longest = 0
    for (const p of u.pieces) {
      run = p.piece.name === 'rail' ? run + 1 : 0
      longest = Math.max(longest, run)
    }
    check(`${tag}: at most two rails in a row`, longest <= 2, `${longest}`)

    // Time: starts are monotonic and sum to the journey.
    let mono = true
    for (let j = 1; j < u.pieces.length; j++) if (u.pieces[j].start < u.pieces[j - 1].start) mono = false
    check(`${tag}: starts are monotonic`, mono)
    const total = u.pieces.reduce((s, p) => s + p.span, 0)
    check(`${tag}: spans sum to the journey`, Math.abs(total - u.journey) < 1e-6)

    // The ball at both ends is inside a portal.
    const t0 = laneAt(first.lane, 0)
    const tN = laneAt(last.lane, last.span)
    check(`${tag}: the ball is born inside a portal`, t0.scale === 0)
    check(`${tag}: the ball leaves inside a portal`, tN.scale === 0 && last.lane.segs[last.lane.segs.length - 1].dur === TRANSIT)

    // The ball's state rides the chain: what leaves one piece arrives at the next.
    let carried = true
    for (let j = 1; j < u.pieces.length; j++) {
      const prev = u.pieces[j - 1]
      const left = ballAt(prev.ballIn, prev.changes, Infinity)
      const arrived = u.pieces[j].ballIn
      if (left.color !== arrived.color || left.ghost !== arrived.ghost || left.id !== arrived.id) carried = false
    }
    check(`${tag}: the ball's state is carried from piece to piece`, carried)
    check(`${tag}: the ball starts in the world's colour`, first.ballIn.color === u.ballColor)
    check(`${tag}: every change happens inside its piece`, u.pieces.every((p) => p.changes.every((c) => c.at >= 0 && c.at <= p.span)))

    for (const p of u.pieces) used.add(p.piece.name)
  }
  // A long run of worlds never repeats a theme within the memory window.
  let repeat = false
  for (let i = 1; i < 12; i++) {
    const recent = new Set<string>()
    for (let j = Math.max(0, i - THEME_MEMORY); j < i; j++) recent.add(show.universe(j).theme.name)
    if (recent.has(show.universe(i).theme.name)) repeat = true
  }
  check(`no theme repeats within ${THEME_MEMORY} worlds over twelve`, !repeat)

  // The show's clock crosses worlds without a seam.
  const b1 = show.begin(1)
  const before = show.at(b1 - 1e-3)
  const after = show.at(b1 + 1e-3)
  check('the clock crosses into world 1 at the gate', before.universe.index === 0 && after.universe.index === 1)
  check('and the ball is invisible on both sides of it', before.scale < 0.02 && after.scale < 0.02)
  check(`three worlds use much of the catalog`, used.size >= 12, `${used.size}: ${[...used].sort().join(',')}`)
}

const sorted = [...beats].sort((a, b) => a - b)
console.log(`\nbeats per map: min ${sorted[0]} · median ${sorted[sorted.length >> 1]} · max ${sorted[sorted.length - 1]}`)
check('maps average at least eight beats', beats.reduce((a, b) => a + b, 0) / beats.length >= 8)

console.log(failures ? `\n${failures} failure(s)` : '\nall good')
process.exit(failures ? 1 : 0)
