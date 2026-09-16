/**
 * Headless checks for the show's pure logic: the worlds, the planner, the
 * lanes, the chain of universes. No canvas is needed to be wrong about any
 * of it.
 *
 *   npm run check:rube
 */
import { R, TRANSIT, ballAt, laneAt, type Pt } from './src/parts'
import { beatCount, isDynamic, isFlight } from './src/plan'
import { Show } from './src/show'
import { CATALOG_LIMIT, WORLDS, worldAt, worldOf } from './src/worlds'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${name}`)
    return
  }
  failures++
  console.log(`  FAIL ${name}${detail ? `   ${detail}` : ''}`)
}

const eq = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6

/* ------------------------------------------------------------------ worlds */

console.log('\nworlds')
check('there are exactly four', WORLDS.length === 4, `${WORLDS.length}`)
check('in the order workshop → harbor → garden → arcade', WORLDS.map((w) => w.name).join(',') === 'workshop,harbor,garden,arcade')
check('every world has its own name', new Set(WORLDS.map((w) => w.name)).size === WORLDS.length)
// A piece belongs to one world. Rail and the portal are the two exceptions:
// every world has a rail of its own, and the portal is the same door everywhere.
const shared = new Set(['rail', 'portal'])
const owners = new Map<string, string[]>()
for (const w of WORLDS) for (const c of w.pieces) if (!shared.has(c.name)) owners.set(c.name, [...(owners.get(c.name) ?? []), w.name])
const straddling = [...owners].filter(([, ws]) => ws.length > 1)
check('no piece is in two worlds', straddling.length === 0, straddling.map(([n, ws]) => `${n}:${ws.join('/')}`).join(','))
// Palettes are the world's own too.
const palettes = new Map<string, string[]>()
for (const w of WORLDS) for (const t of w.themes) palettes.set(t.name, [...(palettes.get(t.name) ?? []), w.name])
check('no palette is shared between worlds', [...palettes.values()].every((ws) => ws.length === 1))

for (const w of WORLDS) {
  console.log(`\n${w.name}`)
  const names = w.pieces.map((c) => c.name)
  check(`fewer than ${CATALOG_LIMIT} pieces`, w.pieces.length < CATALOG_LIMIT, `${w.pieces.length}`)
  check('every name is unique', new Set(names).size === names.length)
  check('has a rail and a portal', names.includes('rail') && names.includes('portal'))
  check('portal is placed by hand, not by weight', w.pieces.find((c) => c.name === 'portal')?.weight === 0)
  check('at least ten beats of its own', w.pieces.filter((c) => !shared.has(c.name)).length >= 10, `${w.pieces.length - 2}`)
  check('at least two of them are flights', w.pieces.filter(isFlight).length >= 2)
  check('at least one of them changes the ball', w.pieces.some(isDynamic))
  check('more than one palette, all with five colours', w.themes.length > 1 && w.themes.every((t) => t.colors.length === 5))
  check('more than one taste', Object.keys(w.tastes).length > 1)
  const unknown = Object.values(w.tastes).flatMap((t) => Object.keys(t)).filter((n) => !names.includes(n) && !['drop-deep', 'lift-tall'].includes(n))
  check('every taste names its own pieces', unknown.length === 0, unknown.join(','))

  // A solo world — what `?solo=` shows and what the catalog's cells loop —
  // is the piece between two portals, for every piece, rail and portal included.
  const lonely = w.pieces.filter((piece) => {
    const u = new Show('amber-gasket', { solo: piece.name, world: w.name }).universe(0)
    const seq = u.pieces.map((p) => p.piece.name)
    const between = seq.slice(1, -1)
    const held = piece.name === 'portal' ? between.length > 0 : between.includes(piece.name)
    return seq[0] !== 'portal' || seq[seq.length - 1] !== 'portal' || !held || u.world !== w
  })
  check('every piece has a solo world with itself between two portals', lonely.length === 0, lonely.map((p) => p.name).join(','))
  check('a solo world is short', w.pieces.every((piece) => new Show('amber-gasket', { solo: piece.name, world: w.name }).universe(0).journey < 8))
  check('a solo resolves to this world without being told', w.pieces.filter((c) => !shared.has(c.name)).every((c) => worldOf(c.name) === w))

  // Inside every piece the lane joins up: each segment starts where the
  // last ended, give or take a nudge smaller than half the ball — onto a
  // bat, over a rim — unless the ball is out of sight for one of them, or
  // the thread passes to another ball that stands somewhere else.
  const NUDGE = R / 2
  let broken: string[] = []
  for (const piece of w.pieces) {
    const u = new Show('amber-gasket', { solo: piece.name, world: w.name }).universe(0)
    for (const placed of u.pieces) {
      const { segs } = placed.lane
      const relays = placed.changes.some((c) => c.relay)
      for (let i = 1; i < segs.length; i++) {
        if (segs[i].hidden || segs[i - 1].hidden || relays) continue
        const [ax, ay] = segs[i - 1].to
        const [bx, by] = segs[i].from
        if (Math.hypot(ax - bx, ay - by) > NUDGE) broken.push(`${placed.piece.name}@${i}`)
      }
      // The ball comes in on the rail line at the west edge and leaves on it at the east.
      const first = segs[0]
      const last = segs[segs.length - 1]
      if (placed.piece.name !== 'portal') {
        if (!eq(first.from, [-0.5, 0])) broken.push(`${placed.piece.name}:entry`)
        const [ex, ey] = last.to
        const onEdge = Math.abs(Math.abs(ex % 1) - 0.5) < 1e-6
        const onFloor = Math.abs(ey - Math.round(ey)) < 1e-6
        if (!onEdge || !onFloor) broken.push(`${placed.piece.name}:exit`)
      }
    }
  }
  broken = [...new Set(broken)]
  check('every lane joins up inside its piece', broken.length === 0, broken.join(','))
}

/* ------------------------------------------------------------------ the show */

const SEEDS = ['amber-flywheel-812', 'quiet-cam-001', 'stubborn-winch-404', 'paper-valve-077', 'cobalt-gasket-999', 'a', 'b', 'c']
const VISITS = 4

const beats: number[] = []
const mechanics = new Set<string>()
for (const seed of SEEDS) {
  console.log(`\nshow · ${seed}`)
  const show = new Show(seed)
  const used = new Set<string>()
  for (let i = 0; i < VISITS; i++) {
    const u = show.universe(i)
    const tag = `world ${i} (${u.world.name})`
    check(`${tag}: is the loop's world for its index`, u.world === worldAt(i))
    check(`${tag}: has pieces`, u.pieces.length > 2)
    check(`${tag}: journey is positive`, u.journey > 0)
    check(`${tag}: every piece is from its own world`, u.pieces.every((p) => u.world.pieces.includes(p.piece)))
    check(`${tag}: painted in one of its own palettes`, u.world.themes.includes(u.theme))
    check(`${tag}: leans on one of its own tastes`, u.taste in u.world.tastes)
    check(`${tag}: theme differs from the last`, i === 0 || u.theme.name !== show.universe(i - 1).theme.name)

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
    // Consecutive rails are capped at three.
    let run = 0
    let longest = 0
    for (const p of u.pieces) {
      run = p.piece.name === 'rail' ? run + 1 : 0
      longest = Math.max(longest, run)
    }
    check(`${tag}: at most three rails in a row`, longest <= 3, `${longest}`)

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

    // A ghost never reaches a portal, and a relay always hands the thread to a differently coloured ball.
    const leaving = ballAt(last.ballIn, last.changes, Infinity)
    check(`${tag}: the ball is solid at the portal out`, !leaving.ghost)
    let relayOk = true
    for (const p of u.pieces) {
      const before = p.ballIn
      const after = ballAt(before, p.changes, Infinity)
      if (after.id !== before.id && after.color === before.color) relayOk = false
    }
    check(`${tag}: every relay changes the ball`, relayOk)
    // A piece that recolours the ball, by paint or by relay, never hands it on in the colour it arrived in.
    const recolourOk = u.pieces.every((p) => !p.changes.some((c) => c.color) || ballAt(p.ballIn, p.changes, Infinity).color !== p.ballIn.color)
    check(`${tag}: every recolouring changes the colour`, recolourOk)
    for (const p of u.pieces) {
      used.add(`${u.world.name}/${p.piece.name}`)
      for (const c of p.changes) {
        if (c.relay) mechanics.add('relay')
        if (c.color) mechanics.add('color')
        if (c.ghost) mechanics.add('ghost')
      }
    }
  }

  // Round the loop twice more: the same four worlds in the same order, and
  // no visit to a world looks like its last one.
  let order = true
  let samePalette = false
  let sameTaste = false
  let sameMap = false
  for (let i = 0; i < 12; i++) {
    const u = show.universe(i)
    if (u.world !== WORLDS[i % 4]) order = false
    if (i >= 4) {
      const before = show.universe(i - 4)
      if (u.theme.name === before.theme.name) samePalette = true
      if (u.taste === before.taste) sameTaste = true
      if (u.pieces.map((p) => p.piece.name).join() === before.pieces.map((p) => p.piece.name).join()) sameMap = true
    }
  }
  check('twelve worlds go round the loop three times in order', order)
  check('no world is painted the same twice running', !samePalette)
  check('no world leans on the same taste twice running', !sameTaste)
  check('no world lays out the same map twice running', !sameMap)

  // The seed fixes everything: the same seed builds the same show.
  const again = new Show(seed)
  const same = [0, 1, 2, 3].every((i) => {
    const a = show.universe(i)
    const b = again.universe(i)
    return a.theme === b.theme && a.taste === b.taste && a.pieces.map((p) => `${p.piece.name}@${p.col},${p.row}`).join() === b.pieces.map((p) => `${p.piece.name}@${p.col},${p.row}`).join()
  })
  check('the same seed builds the same four worlds again', same)

  // The show's clock crosses worlds without a seam.
  const b1 = show.begin(1)
  const before = show.at(b1 - 1e-3)
  const after = show.at(b1 + 1e-3)
  check('the clock crosses into world 1 at the gate', before.universe.index === 0 && after.universe.index === 1)
  check('and the ball is invisible on both sides of it', before.scale < 0.02 && after.scale < 0.02)
  check(`one lap uses much of every world`, used.size >= 24, `${used.size}`)
}

// Two different seeds lay out a world differently: the seed drives the map inside a world.
const layoutsDiffer = WORLDS.every((_, i) => {
  const a = new Show('a').universe(i).pieces.map((p) => p.piece.name).join()
  const b = new Show('b').universe(i).pieces.map((p) => p.piece.name).join()
  return a !== b
})
check('\ntwo seeds lay out every world differently', layoutsDiffer)

// A pinned show stays put.
const pinned = new Show('amber-gasket', { world: 'garden' })
check('a pinned show stays in its world', [0, 1, 2, 3, 4].every((i) => pinned.universe(i).world.name === 'garden'))

// Tempo and cadence over a longer run of worlds: flights in most maps, the pieces that change the
// ball never more than two a map and never absent for three maps running.
for (const seed of SEEDS.slice(0, 3)) {
  const show = new Show(seed)
  let flights = 0
  let dry = 0
  let tooMany = false
  let longestDry = 0
  for (let i = 0; i < 12; i++) {
    const u = show.universe(i)
    const pieces = u.pieces.map((p) => p.piece)
    if (pieces.some(isFlight)) flights++
    const d = pieces.filter(isDynamic).length
    if (d > 2) tooMany = true
    dry = d ? 0 : dry + 1
    longestDry = Math.max(longestDry, dry)
  }
  check(`${seed}: most maps have a flight`, flights >= 9, `${flights}/12`)
  check(`${seed}: never more than two ball-changing pieces a map`, !tooMany)
  check(`${seed}: never three maps running without one`, longestDry <= 2, `${longestDry}`)
}

const sorted = [...beats].sort((a, b) => a - b)
console.log(`\nbeats per map: min ${sorted[0]} · median ${sorted[sorted.length >> 1]} · max ${sorted[sorted.length - 1]}`)
check('maps average at least eight beats', beats.reduce((a, b) => a + b, 0) / beats.length >= 8)
check('the ball is recoloured and relayed somewhere in the run', ['color', 'relay'].every((m) => mechanics.has(m)), [...mechanics].join(','))

console.log(failures ? `\n${failures} failure(s)` : '\nall good')
process.exit(failures ? 1 : 0)
