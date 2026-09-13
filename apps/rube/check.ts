/**
 * Headless checks for the show's pure logic: the planner, the lanes, the
 * chain of universes. No canvas is needed to be wrong about any of it.
 *
 *   npm run check:rube
 */
import { TRANSIT, laneAt, type Pt } from './src/parts'
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

    // Footprints never overlap.
    const seen = new Set<string>()
    let overlap = false
    for (const placed of u.pieces) {
      for (const [c, r] of placed.cells) {
        const key = `${c}:${r}`
        if (seen.has(key)) overlap = true
        seen.add(key)
      }
    }
    check(`${tag}: no two pieces share a cell`, !overlap)

    // The chain is continuous: each lane ends where the next begins, in
    // world cells, except across a portal, where it must be a transit.
    let gaps = 0
    let badPortal = 0
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
      const aPortal = a.piece.name === 'portal' && a.lane.segs[a.lane.segs.length - 1].portal === 'out'
      const bPortal = b.piece.name === 'portal' && b.lane.segs[0].portal === 'in'
      if (aPortal !== bPortal) badPortal++
      if (aPortal) continue
      if (!eq(end, start)) gaps++
    }
    check(`${tag}: every lane hands off exactly where the next begins`, gaps === 0, `${gaps} gaps`)
    check(`${tag}: portals come in pairs`, badPortal === 0)
    check(`${tag}: every segment takes time`, badDur === 0)

    // Sections: portal in, beats, portal out; hop gates at the ends only.
    const first = u.pieces[0]
    const last = u.pieces[u.pieces.length - 1]
    const state = (p: typeof first) => p.state as { kind: string; hop: boolean }
    check(`${tag}: opens with a world gate`, first.piece.name === 'portal' && state(first).kind === 'in' && state(first).hop)
    check(`${tag}: closes with a world gate`, last.piece.name === 'portal' && state(last).kind === 'out' && state(last).hop)
    const gates = u.pieces.filter((p) => p.piece.name === 'portal' && state(p).hop).length
    check(`${tag}: no other world gates`, gates === 2, `${gates}`)
    for (let s = 0; s < u.sections.length; s++) {
      const section = u.pieces.filter((p) => p.section === s)
      check(`${tag}: section ${s} has beats`, beatCount(section) >= 2, `${beatCount(section)}`)
      const rails = section.filter((p) => p.piece.name === 'rail')
      check(`${tag}: section ${s} never ends on rail`, section[section.length - 2]?.piece.name !== 'rail' || rails.length === 0)
    }
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
  check(`three worlds use most of the catalog`, used.size >= 9, [...used].sort().join(','))
}

console.log(failures ? `\n${failures} failure(s)` : '\nall good')
process.exit(failures ? 1 : 0)
