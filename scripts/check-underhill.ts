/** Focused checks for the three staged worlds and their recording-led show. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ballAt } from '../apps/rube/src/parts'
import { underhillWorlds } from '../apps/rube/src/playground/pieces/underhill'
import { performance, score, fires, clock, PHRASES, VISITS } from '../apps/rube/src/shows/versions/mountain-king/underhill'

let failures = 0
function check(label: string, okay: boolean, detail = ''): void {
  console.log(`  ${okay ? 'ok  ' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`)
  if (!okay) failures++
}

const show = performance.show
check('three separate staged worlds', underhillWorlds.map((w) => w.name).join() === 'underhill-cavern,underhill-boiler,underhill-throne')
check('six cave visits, six works visits, five throne visits',
  Array.from({ length: VISITS }, (_, i) => show.universe(i).world.name).join() ===
  [...Array(6).fill('underhill-cavern'), ...Array(6).fill('underhill-boiler'), ...Array(5).fill('underhill-throne')].join())
check('world entrances land on the measured phrase changes',
  show.at(PHRASES[1] + 0.01).universe.world.name === 'underhill-boiler' &&
  show.at(PHRASES[2] + 0.01).universe.world.name === 'underhill-throne')
check('recording is the in-repo public-domain Ogg',
  readFileSync(join(process.cwd(), 'docs/promo/mountain-king-musopen.ogg')).toString('ascii', 0, 4) === 'OggS' &&
  performance.soundtrack?.credit?.includes('public domain') === true)

const knots = score.knots
check('music map never turns backwards', knots.every((k, i) => i === 0 || (k.at > knots[i - 1].at && k.native > knots[i - 1].native)))
check('every chosen machine strike hits its measured note', score.aligned.length >= 35 && score.aligned.every((hit) =>
  Math.abs(clock(hit.at) - hit.native) < 1e-6 &&
  show.at(hit.at).placed.piece.name === hit.piece), `${score.aligned.length}/${fires.length} strikes`)
check('phrase shifts keep the machine near its own speed', knots.slice(1).every((k, i) => {
  const rate = (k.native - knots[i].native) / (k.at - knots[i].at)
  return rate >= 0.62 - 1e-9 && rate <= 1.55 + 1e-9
}))
let last = -Infinity
let forwards = true
for (let t = 0; t <= PHRASES[3]; t += 0.05) {
  const next = clock(t)
  if (next < last) forwards = false
  last = next
}
check('scrubbing the recording has no backward jump', forwards)

const charged = Array.from({ length: VISITS }, (_, i) => show.universe(i)).flatMap((u) => u.pieces
  .slice(0, -1).map((p, i) => ({ piece: p, next: u.pieces[i + 1] })))
  .filter(({ piece }) => piece.piece.name === 'crystal-battery' || piece.piece.name === 'pressure-pump')
check('stored charge is carried to the next piece', charged.length > 0 && charged.every(({ piece, next }) =>
  ballAt(piece.ballIn, piece.changes, Infinity).charge === next.ballIn.charge))
const before = show.at(30).balls ?? []
const middle = show.at(68).balls ?? []
const tutti = show.at(108).balls ?? []
check('counterpoint voices enter with the orchestral sections', before.length === 1 && middle.length >= 2 && tutti.length >= 2,
  `${before.length}, ${middle.length}, ${tutti.length}`)
check('the ending holds a finite frame through the decay', [150, 151, 153.9].every((t) => {
  const p = show.at(t)
  const c = performance.camera?.(t)
  return Number.isFinite(p.x) && Number.isFinite(p.y) && !!c && Number.isFinite(c.cells) && c.cells >= 7
}))

console.log(`\n${failures ? `${failures} failure(s)` : 'Underhill is in time'}`)
process.exit(failures ? 1 : 0)
