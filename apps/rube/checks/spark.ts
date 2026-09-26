/**
 * The checks for Mountain King · Spark (`versions/mountain-king/opus55-spark.show.ts`), run by `check:shows`: one
 * spark through four worlds by their fires, on the recording's own onsets and tracked beat.
 */
import type { Performance, Version } from '../src/shows/registry'
import onsets from '../../../scripts/shows/plans/mountain-king-onsets.json'
import { STRIKES } from '../src/shows/versions/mountain-king/spark/hits'
import { CODA, CREDITS_AT, DOORS, DURATION, FESTIVAL, GRID, LAST, LOFT_SEAM, MUSIC_END, ROLL, SILENCE, THEME, THEME_END, phrase } from '../src/shows/versions/mountain-king/spark/music'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/mountain-king/spark/credits'
import { WICK } from '../src/shows/versions/mountain-king/spark/loft/layout'
import type { SparkShow } from '../src/shows/versions/mountain-king/spark/show'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkSpark(perf: Performance, version: Version, check: Check): void {
  const show = perf.show as SparkShow
  const cam = perf.camera!

  check('spark: in the picker it is Mountain King, Spark, with no note and no byline',
    version.title === 'Mountain King' && version.label === 'Spark' && version.note === undefined && !('director' in version) &&
    typeof version.about === 'string' && typeof version.still === 'number')
  check('spark: the whole recording from zero, credited to Grieg and the orchestra, then the credits in silence',
    near(MUSIC_END, 154.091, 1e-3) && near(perf.duration, DURATION) && DURATION > MUSIC_END + 20 && DURATION < 185 && (perf.soundtrack?.offset ?? 0) === 0 &&
    !!perf.soundtrack?.src?.includes('grieg-mountain-king-musopen') &&
    ['Grieg', 'In the Hall of the Mountain King', 'Czech National Symphony Orchestra'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=k8HCJS4FflY' &&
    perf.soundtrack?.youtube?.[0]?.id === 'k8HCJS4FflY' && (perf.soundtrack?.youtube?.[0]?.from ?? 0) === 0 && (perf.soundtrack?.youtube?.[0]?.at ?? 0) === 0)

  // The worlds, in the story's order, each door on the music.
  const order = show.legs.map((l) => l.world).join(',')
  check('spark: the loft, the glassworks, the regatta, the railway; then home back through the regatta and the glassworks to the loft',
    order === 'loft,glassworks,regatta,railway,regatta,glassworks,loft', order)
  check('spark: the doors are on phrase 6, phrase 9 and phrase 12, the festival on phrase 16, the loft\'s hand-on on phrase 3',
    near(DOORS.glass, phrase(6)) && near(DOORS.regatta, phrase(9)) && near(DOORS.railway, phrase(12)) && near(FESTIVAL, phrase(16)) && near(LOFT_SEAM, phrase(3)) &&
    near(show.legs[1].from, DOORS.glass) && near(show.legs[2].from, DOORS.regatta) && near(show.legs[3].from, DOORS.railway))
  const o = onsets as { onsets: { t: number; s: number }[] }
  const onOnset = (t: number, min = 0.5, tol = 0.03) => o.onsets.some((x) => x.s >= min && Math.abs(x.t - t) <= tol)
  check('spark: the dash home is on the roll\'s strokes, after the silence, before the first last chord',
    DOORS.back.every((t) => t > ROLL && t < LAST[0] && onOnset(t, 0.5, 0.012)) && show.legs.slice(4).every((l, i) => near(l.from, DOORS.back[i])))
  check('spark: no portal drawn, and no cut', [0, 58.1, 101.9, 134.3, 148.5, 170].every((t) => perf.cuts?.(t) === false))

  // One spark, one path: in a world it never jumps; at a door the camera carries it, so on the screen it holds still.
  let jump = 0
  let jumpAt = 0
  let screen = 0
  let screenAt = 0
  let prev = show.where(0)
  let prevLeg = show.owner(0)
  const onScreen = (t: number) => {
    const h = show.at(t)
    const f = cam(t)
    return [(h.x - f.x) / f.cells, (h.y - f.y) / f.cells]
  }
  let prevS = onScreen(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const leg = show.owner(t)
    if (leg === prevLeg) {
      const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
      if (d > jump) { jump = d; jumpAt = t }
    }
    const s = onScreen(t)
    const ds = Math.hypot(s[0] - prevS[0], s[1] - prevS[1])
    if (ds > screen) { screen = ds; screenAt = t }
    prev = here
    prevLeg = leg
    prevS = s
  }
  check('spark: inside a world the spark never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('spark: every door is a match cut: on the screen the spark never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // It starts on its wick, and it is back on it on the first last chord, to stay.
  const [wx, wy] = WICK
  const onWick = (t: number) => { const [x, y] = show.where(t); return Math.hypot(x - wx, y - wy) < 0.08 && show.worldKey(t) === 'loft' }
  check('spark: on its wick at the start, and back on it from the first last chord to the end',
    onWick(0) && [LAST[0] + 0.001, LAST[1], CREDITS_AT, DURATION].every(onWick))

  // Every strike lands on the music: a measured onset, or a quarter or an eighth of the theme's tracked beat.
  const within = (t: number) => onOnset(t, 0.3, 0.035) || (t >= THEME - 0.05 && t <= THEME_END + 0.05 && GRID.some((g) => Math.abs(g - t) <= 0.03))
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('spark: every strike lands on a measured onset or on the theme\'s beat', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const empty = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('spark: every part strikes', empty.length === 0, empty.join(', '))
  const hit = (t: number, tol = 0.03) => all.some((s) => Math.abs(s - t) <= tol)
  const bigChords = CODA.filter((c) => c.s >= 4)
  check('spark: the coda\'s heavy chords, the roll and both last chords are struck', bigChords.every((c) => hit(c.t)) && hit(ROLL) && LAST.every((t) => hit(t)),
    bigChords.filter((c) => !hit(c.t)).map((c) => c.t.toFixed(3)).join(', '))
  check('spark: nothing is struck in the silence', !all.some((t) => t > SILENCE + 0.05 && t < ROLL - 0.05))

  // Under Zoom (half as close again as the show's camera) the spark stays in the frame wherever it is to be seen.
  const outOfZoom: string[] = []
  for (let t = 0; t <= perf.duration; t += 0.05) {
    const h = show.at(t)
    if (h.hidden || h.scale < 0.3) continue
    const f = cam(t)
    const cells = f.cells / 1.5
    const u = Math.max(Math.abs(h.x - f.x) / ((cells * 16) / 9 / 2), Math.abs(h.y - f.y) / (cells / 2))
    if (u > 1) outOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
  }
  check('spark: under Zoom the spark never leaves the frame', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

  // The spark is never out of sight for long.
  let hidden = 0
  let longest = 0
  let longAt = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    if (hidden > longest) { longest = hidden; longAt = t }
  }
  check('spark: the spark is never hidden for more than 2.5 s', longest <= 2.5, `${longest.toFixed(2)} s at ${longAt.toFixed(2)}`)
  check('spark: one ball on the stage, always', [5, 60, 90, 110, 130, 140, 149, 160].every((t) => (show.at(t).balls ?? []).length <= 1))

  // The end credits: words the page sets over the dark loft after the last chord, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('spark: end credits in the silence after the last chord, set by the page, opening on Directed by Claude Opus 5.5 and naming Spark, the cat, Grieg, the orchestra, Musopen and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Claude Opus 5.5', 'Spark', 'The cat', 'Edvard Grieg', 'In the Hall of the Mountain King', 'Czech National Symphony Orchestra', 'Musopen', 'p5.js'].every((w) => said.includes(w)) &&
    !/Stephen Wu|tech demo|demo only/i.test(said), said)
}
