/**
 * Headless checks for the Playground: the door, the shelves, and every
 * staged piece held to what `check:rube`
 * holds a stock piece to, so that a piece approved here can be moved into
 * Machine as it stands. And that Machine knows nothing of any of it.
 *
 *   npm run check:playground
 */
import { MODE_LINKS } from '../../src/ui/shell'
import { R, ballAt, type Pt } from './src/parts'
import { beatCount, isDynamic, isFlight } from './src/plan'
import { SHELVES, loadShelves } from './src/playground/staging'
import { Show } from './src/show'
import { CATALOG_LIMIT, WORLDS, builtWorlds, worldByName, worldOf } from './src/worlds'

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
const shared = new Set(['rail', 'portal'])
const SEED = 'amber-gasket'

async function main(): Promise<void> {
  /* ---------------------------------------------------------------- the door */

  console.log('\nthe door')
  const tab = MODE_LINKS.find((m) => m.mode === 'playground')
  check('the Playground is a mode, at /playground/', tab?.path === '/playground/' && tab.label === 'Playground')
  check('it is the third tab on the switch, before Shows', MODE_LINKS[2] === tab)
  check('the switch is four modes, always', MODE_LINKS.map((m) => m.mode).join() === 'explorations,machine,playground,shows')

  /* ---------------------------------------------------------------- before anything is fetched */

  console.log('\nbefore a shelf is fetched')
  check('no world stands beside the loop', builtWorlds().length === 0)
  check('the loop is the four stock worlds', WORLDS.map((w) => w.name).join() === 'workshop,garden,harbor,arcade')
  const stockNames = new Set(WORLDS.flatMap((w) => w.pieces.map((c) => c.name)))

  const shelves = await loadShelves()

  /* ---------------------------------------------------------------- the shelves */

  console.log('\nthe shelves')
  check('every shelf loads under the name the sheet lists it by', shelves.every((s, i) => s.world.name === SHELVES[i].name && s.world.label === SHELVES[i].label))
  check('every shelf is registered beside the loop, and none in it', shelves.every((s) => worldByName(s.world.name) === s.world && !WORLDS.includes(s.world)))
  check('every shelf says it is staged', shelves.every((s) => !!s.world.staged))
  check('the loop is still the four stock worlds', WORLDS.length === 4 && WORLDS.every((w) => !w.staged))
  const additions = shelves.filter((_, i) => SHELVES[i].kind === 'additions')
  const worlds = shelves.filter((_, i) => SHELVES[i].kind === 'world')
  check('a shelf for each stock world, in the loop’s order', additions.map((s) => s.world.name).join() === WORLDS.map((w) => `staged-${w.name}`).join())
  check('a stock world’s shelf wears that world’s label, palettes and rail', additions.every((s, i) => s.world.label === WORLDS[i].label && s.world.themes === WORLDS[i].themes && s.world.pieces[0] === WORLDS[i].pieces[0]))

  // A staged piece is one piece in one place: never a stock piece's name, never on two shelves.
  const owners = new Map<string, string[]>()
  for (const s of shelves) for (const name of Object.keys(s.staged)) if (!shared.has(name)) owners.set(name, [...(owners.get(name) ?? []), s.world.name])
  const twice = [...owners].filter(([, ws]) => ws.length > 1).map(([n]) => n)
  check('no staged piece is on two shelves', twice.length === 0, twice.join(','))
  const taken = [...owners.keys()].filter((n) => stockNames.has(n))
  check('no staged piece has a stock piece’s name', taken.length === 0, taken.join(','))
  const stockPalettes = new Set(WORLDS.flatMap((w) => w.themes.map((t) => t.name)))
  check('a new world brings its own palettes', worlds.every((s) => s.world.themes.every((t) => !stockPalettes.has(t.name))))
  const luma = (hex: string) => (0.2126 * parseInt(hex.slice(1, 3), 16) + 0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16)) / 255
  check('and is painted on light paper: night is the arcade’s alone', worlds.every((s) => s.world.themes.every((t) => luma(t.bg) >= 0.5)))

  let staged = 0
  for (const shelf of shelves) {
    const w = shelf.world
    const isWorld = worlds.includes(shelf)
    console.log(`\n${w.name}`)
    const names = w.pieces.map((c) => c.name)
    const own = w.pieces.filter((c) => w.own!.includes(c.name))
    const beats = own.filter((c) => !shared.has(c.name))
    staged += beats.length
    check('every name is unique', new Set(names).size === names.length)
    check('has a rail and a portal', names.includes('rail') && names.includes('portal'))
    check('portal is placed by hand, not by weight', w.pieces.find((c) => c.name === 'portal')?.weight === 0)
    check('what it stages and what is said of it are the same list', [...w.own!].sort().join() === Object.keys(shelf.staged).sort().join())
    check('every staged piece has a status and a line said of it', Object.values(shelf.staged).every((s) => (s.status === 'new' || s.status === 'restored') && (isWorld || s.note.length > 0)))
    check('every staged beat may be drawn by the planner', beats.every((c) => c.weight > 0 || c.finale))
    if (isWorld) {
      check(`fewer than ${CATALOG_LIMIT} pieces`, w.pieces.length < CATALOG_LIMIT, `${w.pieces.length}`)
      check('nineteen pieces of its own: a rail and eighteen beats', beats.length === 18 && w.own!.includes('rail'), `${beats.length}`)
      check('at least two of them are flights', w.pieces.filter(isFlight).length >= 2)
      check('at least one of them changes the ball', w.pieces.some(isDynamic))
      check('more than one palette, all with five colours', w.themes.length > 1 && w.themes.every((t) => t.colors.length === 5))
      check('more than one taste', Object.keys(w.tastes).length > 1)
      const unknown = Object.values(w.tastes).flatMap((t) => Object.keys(t)).filter((n) => !names.includes(n))
      check('every taste names its own pieces', unknown.length === 0, unknown.join(','))
    }
    if (w.name === 'staged-arcade') {
      const mute = beats.filter((c) => !c.points && !c.finale).map((c) => c.name)
      check('every staged arcade beat scores', mute.length === 0, mute.join(','))
      check('the shelf borrows the ticket machine, and does not stage it', w.pieces.some((c) => c.finale) && !own.some((c) => c.finale))
    }

    // A solo world is the piece between two portals, as on the sheet.
    const solos = own.map((piece) => ({ piece, u: new Show(SEED, { solo: piece.name, world: w.name }).universe(0) }))
    const lonely = solos.filter(({ piece, u }) => {
      const seq = u.pieces.map((p) => p.piece.name)
      return seq[0] !== 'portal' || seq[seq.length - 1] !== 'portal' || !seq.slice(1, -1).includes(piece.name) || u.world !== w
    })
    check('every staged piece has a solo world with itself between two portals', lonely.length === 0, lonely.map((l) => l.piece.name).join(','))
    check('a solo world opens on its piece', solos.filter(({ piece }) => !piece.finale).every(({ piece, u }) => u.pieces[1].piece.name === piece.name))
    check('a solo world is short', solos.every(({ u }) => u.journey < 8), solos.filter(({ u }) => u.journey >= 8).map(({ piece }) => piece.name).join(','))
    check('a solo resolves to this shelf without being told', beats.every((c) => worldOf(c.name) === w))

    // Inside every piece the lane joins up, comes in on the rail line at
    // the west edge and leaves on it at an edge, on a floor; over many
    // seeds, so every variant a piece has is walked.
    const NUDGE = R / 2
    let broken: string[] = []
    const ghosts: string[] = []
    const stale: string[] = []
    for (const piece of own) {
      for (let i = 0; i < 24; i++) {
        const u = new Show(`${SEED}-${i}`, { solo: piece.name, world: w.name }).universe(0)
        for (const placed of u.pieces) {
          if (placed.piece !== piece) continue
          const { segs } = placed.lane
          const relays = placed.changes.some((c) => c.relay)
          for (let j = 1; j < segs.length; j++) {
            if (segs[j].hidden || segs[j - 1].hidden || relays) continue
            const [ax, ay] = segs[j - 1].to
            const [bx, by] = segs[j].from
            if (Math.hypot(ax - bx, ay - by) > NUDGE) broken.push(`${piece.name}@${j}`)
          }
          if (segs.some((s) => !(s.dur > 0) || !Number.isFinite(s.dur))) broken.push(`${piece.name}:dur`)
          if (!eq(segs[0].from, [-0.5, 0])) broken.push(`${piece.name}:entry`)
          const [ex, ey] = segs[segs.length - 1].to
          if (Math.abs(Math.abs(ex % 1) - 0.5) > 1e-6 || Math.abs(ey - Math.round(ey)) > 1e-6) broken.push(`${piece.name}:exit`)
          // The lane leaves through the cell the placement said it would.
          if (!(placed.lane.fire >= 0 && placed.lane.fire <= placed.span + 1e-9)) broken.push(`${piece.name}:fire`)
          if (!placed.changes.every((c) => c.at >= 0 && c.at <= placed.span)) broken.push(`${piece.name}:change`)
          const after = ballAt(placed.ballIn, placed.changes, Infinity)
          if (after.ghost) ghosts.push(piece.name)
          if ((after.id !== placed.ballIn.id || placed.changes.some((c) => c.color)) && after.color === placed.ballIn.color) stale.push(piece.name)
          if (placed.changes.length > 0 && !piece.dynamic) broken.push(`${piece.name}:dynamic`)
        }
      }
    }
    broken = [...new Set(broken)]
    check('every lane joins up inside its piece, in every variant', broken.length === 0, broken.join(','))
    check('a ghost is solid again before it leaves its piece', ghosts.length === 0, [...new Set(ghosts)].join(','))
    check('a piece that changes the ball hands it on in another colour', stale.length === 0, [...new Set(stale)].join(','))

    // The shelf run as a world: maps built from nothing but what is staged.
    let gaps = 0
    let overlap = 0
    const used = new Set<string>()
    const counts: number[] = []
    for (let i = 0; i < 12; i++) {
      const show = new Show(`${SEED}-${i}`, { world: w.name })
      for (let j = 0; j < 3; j++) {
        const u = show.universe(j)
        const seen = new Set<string>()
        for (let n = 0; n < u.pieces.length; n++) {
          const a = u.pieces[n]
          used.add(a.piece.name)
          for (const [c, r] of a.cells) {
            if (seen.has(`${c}:${r}`)) overlap++
            seen.add(`${c}:${r}`)
          }
          const b = u.pieces[n + 1]
          if (!b) continue
          const end = a.lane.segs[a.lane.segs.length - 1].to
          const start = b.lane.segs[0].from
          if (!eq([a.col + a.mirror * end[0], a.row + end[1]], [b.col + b.mirror * start[0], b.row + start[1]])) gaps++
        }
        counts.push(beatCount(u.pieces))
        if (u.pieces.some((p) => !w.pieces.includes(p.piece))) gaps++
      }
    }
    check('run as a world, every lane hands off exactly where the next begins', gaps === 0, `${gaps}`)
    check('and no two pieces share a cell', overlap === 0, `${overlap}`)
    const unseen = beats.filter((c) => !c.finale && !used.has(c.name)).map((c) => c.name)
    check('and every staged beat turns up in a map', unseen.length === 0, unseen.join(','))
    check('and a map has at least four beats', Math.min(...counts) >= Math.min(4, beats.length), `${Math.min(...counts)}`)
  }

  /* ---------------------------------------------------------------- machine is untouched */

  console.log('\nmachine')
  check('a solo of a stock piece still resolves to its stock world', WORLDS.every((w) => w.pieces.filter((c) => !shared.has(c.name)).every((c) => worldOf(c.name) === w)))
  const loop = new Show(SEED)
  check('the show still goes round the four stock worlds', [0, 1, 2, 3, 4, 5, 6, 7].every((i) => loop.universe(i).world === WORLDS[i % 4]))
  check('and never draws a staged piece', [0, 1, 2, 3, 4, 5, 6, 7].every((i) => loop.universe(i).pieces.every((p) => !owners.has(p.piece.name))))

  console.log(`\n${staged} staged beats on ${shelves.length} shelves`)
  console.log(failures ? `\n${failures} failure(s)` : '\nall good')
  process.exit(failures ? 1 : 0)
}

void main()
