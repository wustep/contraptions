/**
 * The checks for Raindrop: Chopin's "Raindrop" Prelude as a machine the rain runs at the charterhouse of Valldemossa,
 * on Ivan Ilić's recording and the clock measured from it. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/raindrop-onsets.json'
import { BARS, DRIPS, FORM, NOTES, PULSE, RECORDING, at, bar } from '../src/shows/versions/raindrop/charterhouse/music'
import { CARDS, CREDITS_OK, DURATION, LAST_GONE, creditsAt } from '../src/shows/versions/raindrop/charterhouse/credits'
import { TIP } from '../src/shows/versions/raindrop/charterhouse/jar'
import { INTO_HEAD, KNOCKS, OUT_SHOE } from '../src/shows/versions/raindrop/charterhouse/route'
import { DOWN_FROM, DOWN_TO, INTO_BUCKET, LANDS, TIPS } from '../src/shows/versions/raindrop/charterhouse/garden'
import { OUT as OUTLET, STEPS } from '../src/shows/versions/raindrop/charterhouse/cistern'
import { KNOCK, OVER } from '../src/shows/versions/raindrop/charterhouse/terraces'
import { BOARD, FIRE } from '../src/shows/versions/raindrop/charterhouse/noria'
import { IN_CATCH, IN_CUP, LIT, ON_ROOF, OPENS, SHUTS, STROKES } from '../src/shows/versions/raindrop/charterhouse/gate'
import { AT_GATE, CLIMB, GUST, IN, LOOK, OUT as LANTERN_OUT, theirLight } from '../src/shows/versions/raindrop/charterhouse/travelers'
import { rainAt, stormAt, nightAt } from '../src/shows/versions/raindrop/charterhouse/look'
import type { RaindropShow } from '../src/shows/versions/raindrop/charterhouse/show'

type Check = (name: string, ok: boolean, detail?: string) => void

const o = measured as unknown as { duration: number; bars: number[]; pulse: { t: number }[]; notes: { t: number; heard: boolean }[] }

/** The onset nearest `t`, and how far off it is. */
function nearest(t: number): number {
  let best = Infinity
  for (const n of NOTES) best = Math.min(best, Math.abs(n.t - t))
  return best
}

export function checkRaindrop(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as RaindropShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('raindrop: one take, Raindrop, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Raindrop' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('raindrop: the whole recording from zero, its own file, credited to Chopin and to Ivan Ilić under CC BY 3.0, from Wikimedia Commons',
    (perf.soundtrack?.offset ?? 0) === 0 && !!perf.soundtrack?.src?.includes('chopin-raindrop-ilic') && !perf.soundtrack?.youtube &&
    ['Chopin', 'Op. 28 No. 15', 'Ivan Ilić', 'CC BY 3.0'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !!perf.soundtrack?.href?.startsWith('https://commons.wikimedia.org/'))
  check('raindrop: the show runs the whole recording and the credits after the last chord, every card up and gone',
    near(perf.duration, DURATION) && DURATION >= RECORDING && CREDITS_OK && LAST_GONE <= DURATION && CARDS[0].at > FORM.last + 1)
  check('raindrop: the credits are the page\'s, after the last chord, and none before it',
    creditsAt(FORM.last).length === 0 && creditsAt(CARDS[1].at + 2).length > 0 && perf.titles === creditsAt)
  check('raindrop: no portal and no iris', [0, 50, 120, 200, 250, perf.duration].every((t) => perf.cuts?.(t) === false))

  // The measured clock.
  check('raindrop: the clock is the measured one: 89 bars in order, the recording\'s length',
    BARS.length === 89 && BARS.every((t, i) => i === 0 || t > BARS[i - 1]) && near(RECORDING, o.duration) && near(BARS[0], o.bars[0]))
  check('raindrop: most onsets are on their own attack', o.notes.filter((n) => n.heard).length >= o.notes.length * 0.95, `${o.notes.filter((n) => n.heard).length}/${o.notes.length}`)
  const gap = DRIPS.filter((t) => t > FORM.still + 1e-6 && t < FORM.drips - 1e-6)
  check('raindrop: the drip is every eighth of the repeated note, and stops from the high B-flat to bar 84',
    PULSE.length === o.pulse.length && PULSE.length > 600 && gap.length === 0 && DRIPS.some((t) => near(t, FORM.drips, 1e-3)))

  // Every arrival is on a note.
  const flights = show.path.moves.filter((m) => m.kind === 'fly')
  const offNote = flights.filter((m) => nearest(m.t1) > 0.012)
  check('raindrop: every landing of the ball is on a note', flights.length >= 25 && offNote.length === 0, `${flights.length} landings${offNote.length ? '; off: ' : ''}` + offNote.map((m) => m.t1.toFixed(3)).join(', '))
  const marks: [string, number[]][] = [
    ['the lever tips (bar 9)', [TIP]],
    ['into the pipe\'s head, and each length of pipe knocked', [INTO_HEAD, ...KNOCKS]],
    ['out of the shoe (bar 11)', [OUT_SHOE]],
    ['each tile of the chime landed on and tipped', [...LANDS, ...TIPS]],
    ['into the bucket (bar 19)', [INTO_BUCKET]],
    ['the bucket goes (bar 27) and meets the water (bar 28)', [DOWN_FROM, DOWN_TO]],
    ['each step of the overflow, and out (bar 35)', [...STEPS, OUTLET]],
    ['each hammer over and back on its stone', [...OVER, ...KNOCK]],
    ['into the wheel\'s pot (bar 51)', [BOARD]],
    ['the sling (bar 56), and onto the gate\'s roof', [FIRE, ON_ROOF]],
    ['into the catch (bar 60), the lantern lit (bar 61), into the bell\'s cup (bar 64)', [IN_CATCH, LIT, IN_CUP]],
    ['the door opens on the run and shuts on bar 81', [OPENS, SHUTS]],
    ['the gust and the lantern out', [GUST, LANTERN_OUT]],
  ]
  for (const [what, ts] of marks) check(`raindrop: on a note: ${what}`, ts.every((t) => nearest(t) < 0.002), ts.map((t) => nearest(t).toFixed(3)).join(', '))
  check('raindrop: the bell strikes on every high A-flat of bars 64 to 67, sixteen times or so',
    STROKES.length >= 12 && STROKES.every((t) => NOTES.some((n) => near(n.t, t) && n.rh === 68 && n.bar >= 64 && n.bar <= 67)))
  check('raindrop: the climaxes: the lantern blown out on the first fortissimo, the sling on the second',
    GUST === bar(40) && LANTERN_OUT === bar(41) && FIRE === bar(56) && near(FORM.peak1, bar(40)) && near(FORM.peak2, bar(56)))

  // One ball, one path, no jumps.
  let jump = 0
  let worst = 0
  for (let t = 0; t < perf.duration; t += 1 / 120) {
    const a = show.path.at(t)
    const b = show.path.at(t + 1 / 120)
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (!a.hidden && !b.hidden && d > 0.45) jump++
    worst = Math.max(worst, a.hidden || b.hidden ? 0 : d)
  }
  check('raindrop: the ball\'s path is continuous wherever it is seen', jump === 0, `${jump} jumps, worst ${worst.toFixed(3)} cells in 1/120 s`)
  const moves = show.path.moves
  check('raindrop: the moves are laid end to end in time', moves.every((m, i) => m.t1 >= m.t0 - 1e-9 && (i === 0 || near(m.t0, moves[i - 1].t1, 1e-6))))
  const end = show.at(perf.duration)
  check('raindrop: the ball has gone in at the door before it shuts, and is not seen after', end.scale === 0 && show.at(SHUTS).scale === 0 && show.at(OPENS - 1).scale === 1)

  // The weather and the story.
  check('raindrop: it rains from the first bar, hardest in the minor, and stops on the high B-flat',
    rainAt(1) > 0.2 && rainAt(FORM.peak2 + 1) > rainAt(10) && rainAt(FORM.still - 1) > 0 && rainAt(FORM.still) === 0 && rainAt(FORM.end) === 0)
  check('raindrop: the storm is at its height in the minor and gone by the stop; the night is clear after',
    stormAt(FORM.peak2) > 0.9 && stormAt(FORM.still) <= 1e-6 && nightAt(FORM.still) > 0.99)
  check('raindrop: their lantern is lit till the gust and out after; they look up only once the gate\'s lantern is lit and the bell has rung',
    theirLight(GUST - 1) === 1 && theirLight(LANTERN_OUT + 0.5) === 0 && LOOK > LIT && LOOK >= STROKES[STROKES.length - 1] && CLIMB > LOOK)
  check('raindrop: they are at the gate after the bell, and in before the door shuts', AT_GATE > STROKES[STROKES.length - 1] && IN + 1.2 < SHUTS && OPENS < IN)

  // The camera cuts on the music.
  const cam = perf.camera!
  const cuts: number[] = []
  for (let t = 0.02; t < perf.duration; t += 1 / 60) {
    const a = cam(t - 1 / 60)
    const b = cam(t)
    if (Math.hypot(b.x - a.x, b.y - a.y) > 0.25 * Math.max(a.cells, b.cells) || Math.abs(b.cells - a.cells) > 0.2 * a.cells) cuts.push(t)
  }
  const offCut = cuts.filter((t) => nearest(t) > 1 / 60 + 0.004 && Math.abs(t - FORM.still) > 0.02)
  check('raindrop: every cut is on a note', cuts.length >= 15 && offCut.length === 0, `${cuts.length} cuts; off: ${offCut.map((t) => t.toFixed(2)).join(', ')}`)
  check('raindrop: it opens and closes on the jar under the eave', cam(0.5).cells < 10 && cam(perf.duration).cells < 11 && Math.abs(cam(perf.duration).x - cam(0.5).x) < 4)
  void at
}
