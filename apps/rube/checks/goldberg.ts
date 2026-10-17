/**
 * The checks for Quarter Turn: Bach's first Goldberg variation as a wooden toy, on Kimiko Ishizaka's recording and the
 * clock measured from it. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/goldberg-onsets.json'
import { BEATS, FORM, NOTES, RECORDING, bar } from '../src/shows/versions/goldberg/tumble/music'
import { FLUSH, LAP, ROWS } from '../src/shows/versions/goldberg/tumble/geo'
import { CUBES, type CubeName } from '../src/shows/versions/goldberg/tumble/machine'
import { MACHINE, SETUP } from '../src/shows/versions/goldberg/tumble/score'
import { DURATION } from '../src/shows/versions/goldberg/tumble'

type Check = (name: string, ok: boolean, detail?: string) => void

const o = measured as unknown as { duration: number; beats: number[]; bars: number[]; notes: { t: number; heard: boolean }[] }

/** How far `t` is from the nearest onset. */
function nearest(t: number): number {
  let best = Infinity
  for (const n of NOTES) best = Math.min(best, Math.abs(n.t - t))
  return best
}

export function checkGoldberg(perf: Performance, version: ShowVersion, check: Check): void {
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const m = MACHINE

  check('goldberg: one take, Quarter Turn, Opus 5.5, with an about and a still, and no note or byline',
    version.title === 'Quarter Turn' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && version.note === undefined && !('director' in version))
  check('goldberg: the whole recording from zero, its own file, credited to Bach and to Kimiko Ishizaka under CC0, from Wikimedia Commons',
    (perf.soundtrack?.offset ?? 0) === 0 && !!perf.soundtrack?.src?.includes('bach-goldberg-1-ishizaka') && !perf.soundtrack?.youtube &&
    ['Bach', 'Goldberg', 'Kimiko Ishizaka', 'CC0'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !!perf.soundtrack?.href?.startsWith('https://commons.wikimedia.org/'))
  check('goldberg: the show runs the whole recording and a breath after it, with no portal and no iris',
    near(perf.duration, DURATION) && DURATION >= RECORDING && [0, 30, 60, 90, perf.duration].every((t) => perf.cuts?.(t) === false))

  // The measured clock.
  check('goldberg: the clock is the measured one: 64 bars of three quarters, in order, the recording\'s length',
    BEATS.length === 192 && o.bars.length === 64 && BEATS.every((t, i) => i === 0 || t > BEATS[i - 1]) && near(RECORDING, o.duration) && near(bar(1), o.bars[0]))
  check('goldberg: nearly every onset is on its own attack', o.notes.filter((n) => n.heard).length >= o.notes.length * 0.97, `${o.notes.filter((n) => n.heard).length}/${o.notes.length}`)
  check('goldberg: the halves start where she plays them, after her breath', near(FORM.a2, bar(17)) && near(FORM.b1, bar(33)) && near(FORM.b2, bar(49)) && bar(17) - bar(16, 3) > 0.9 && bar(49) - bar(48, 3) > 0.9)

  // The toy.
  check('goldberg: the machine holds together: no two cubes in one place, nothing off the toy or on a moving plank, every cube into its own pocket',
    m.problems.length === 0, m.problems.slice(0, 6).join(' · '))
  const flops = m.flops
  const off = flops.filter((f) => nearest(f.t1) > 0.002)
  check('goldberg: every cube lands on a note', flops.length > 100 && off.length === 0, `${flops.length} landings${off.length ? '; off: ' : ''}${off.map((f) => `${f.cube} ${f.t1.toFixed(3)}`).join(', ')}`)
  const offMove = m.moves.filter((p) => nearest(p.t1) > 0.002 || nearest(p.t0) > 0.002)
  check('goldberg: every plank starts and stops on a note', m.moves.length >= 20 && offMove.length === 0, offMove.map((p) => `row ${p.row} ${p.t0.toFixed(2)}`).join(', '))

  // The clock: a quarter turn on every downbeat from bar 2, round the rim, twice; then home on the last note.
  const black = flops.filter((f) => f.cube === 'black')
  const lap = black.slice(0, -1)
  check('goldberg: the black cube steps on every downbeat from bar 2 to bar 64 and never leaves the rim till the last note',
    lap.length === 63 && lap.every((f, i) => near(f.t1, bar(i + 2)) && f.to.on === 'rim' && f.from.on === 'rim'))
  const front = lap.filter((f) => f.to.on === 'rim' && f.to.x === LAP[0][0] && f.to.y === LAP[0][1]).map((f) => f.t1)
  check('goldberg: its laps end at the front\'s middle on bars 32 and 64, the ends of the halves', front.length === 2 && near(front[0], bar(32)) && near(front[1], bar(64)))

  // Home, one a half, each on the last note of its half; the striker on a downbeat; the clock last.
  const home = (c: CubeName) => flops.find((f) => f.cube === c && f.to.on === 'pocket')
  const want: [CubeName, number][] = [['yellow', bar(16, 3)], ['blue', bar(32, 3)], ['green', bar(48, 3)], ['red', bar(56)], ['black', bar(64, 3)]]
  check('goldberg: home in turn, each on its cadence: yellow, blue and green on the last notes of the first three halves, red on bar 56, black on the last note',
    want.every(([c, t]) => near(home(c)?.t1 ?? -1, t)), want.map(([c]) => `${c} ${home(c)?.t1.toFixed(2)}`).join(', '))
  check('goldberg: the gate does not move on its own: it walks to its post, waits, and goes home only when struck',
    home('green')?.how === 'struck' && flops.filter((f) => f.cube === 'green' && f.t1 > bar(16)).length === 1)
  const passenger = flops.filter((f) => f.cube === 'yellow')
  check('goldberg: the passenger never takes a step: the planks carry it, and it only tips home', passenger.length === 1 && passenger[0].to.on === 'pocket')

  // The ending: everything flush and home.
  const end = perf.duration
  check('goldberg: at the end every plank is flush, its pocket up, and every cube is in its own pocket',
    Array.from({ length: ROWS }, (_, r) => m.plank(r, end)).every((p) => near(p.at, FLUSH) && p.up && p.seated === SETUP.homes[p.row]) &&
    CUBES.every((c) => m.cubeAt(c, end).spot.on === 'pocket'))
  check('goldberg: the planks were not flush before the last bar', Array.from({ length: ROWS }, (_, r) => m.plankAt(r, bar(63))).some((x) => !near(x, FLUSH)))
  const flips = m.moves.filter((p) => p.kind === 'flip')
  check('goldberg: two planks turn over, each at the start of a half of the second part: the gate\'s and the clock\'s',
    flips.length === 2 && near(flips[0].t0, bar(33)) && flips[0].row === 0 && near(flips[1].t0, bar(49)) && flips[1].row === 4)

  // The camera stands at the table: the toy whole and still, until it leans in over the last phrase.
  const cam = perf.camera!
  let moved = 0
  for (let t = 0; t < bar(61); t += 0.25) if (Math.abs(cam(t).cells - cam(0).cells) > 1e-9 || Math.abs(cam(t).x - cam(0).x) > 1e-9) moved++
  let jump = 0
  for (let t = 0; t < end; t += 1 / 60) if (Math.abs(cam(t + 1 / 60).cells - cam(t).cells) > 0.02) jump++
  check('goldberg: the camera holds the toy whole until bar 61, then leans in without a cut', moved === 0 && jump === 0 && cam(end).cells < cam(0).cells)
}
