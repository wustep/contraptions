/**
 * Headless checks for Shows: the door, the registry and the version files
 * on disk, the clock, the time maps, and the placeholder take. The stage, the
 * soundtrack and the recorder need a browser and are not here.
 *
 *   npm run check:shows
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MODE_LINKS } from '../../src/ui/shell'
import { SHOW_SPEEDS, Transport, clockText } from './src/shows/clock'
import { performanceProblems, pickVersion, readShows, versionPath, type Performance, type ShowVersion } from './src/shows/registry'
import { renderWav } from './src/shows/ticks'
import { RetimedShow, knotProblems, musicTimeOf, timeMap } from './src/shows/timemap'
import { GRID, strictTake, strikes } from './src/shows/versions/metronome/metronome'
import { Show } from './src/show'
import { CORNFIELD_DURATION, CORNFIELD_MEET, CORNFIELD_RIDERS } from './src/shows/versions/cornfield-chase/multiball'
import { universeAt } from './src/universe'
import type { StockShow } from './src/shows/stock/show'
import cornfieldOnsets from '../../scripts/show-plans/cornfield-opus55-onsets.json'
import epilogueOnsets from '../../scripts/show-plans/lalaland-epilogue-onsets.json'
import { STRIKES as EPILOGUE_STRIKES } from './src/shows/versions/la-la-land/epilogue/hits'
import { INTO, OUT } from './src/shows/versions/la-la-land/epilogue/score'
import { CHORUS, DURATION as EPILOGUE_END, HOME, KISS, KISS_PEAK, LAST_CHORDS, LOOK, PIANO2, STARS, STRUCK, SWING_FROM, SWING_MID, SWING_SOFT, WALTZ_FROM, WALTZ_END, swing as swingBeat, waltz as waltzBar, number as numberBeat, NUMBER_FROM, NUMBER_END, BUILD } from './src/shows/versions/la-la-land/epilogue/music'
import { CARDS as EPILOGUE_CARDS, CREDITS_OK as EPILOGUE_CREDITS_OK, creditsAt as epilogueCredits } from './src/shows/versions/la-la-land/epilogue/credits'
import { KISS_AT, ROOM } from './src/shows/versions/la-la-land/epilogue/room'
import { MIA as MIA_HEX, HUSBAND as HUSBAND_HEX } from './src/shows/versions/la-la-land/epilogue/worlds'
import type { EpilogueShow } from './src/shows/versions/la-la-land/epilogue/show'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${name}`)
    return
  }
  failures++
  console.log(`  FAIL ${name}${detail ? `   ${detail}` : ''}`)
}

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

async function main(): Promise<void> {
  /* ------------------------------------------------------------------ the door */

  console.log('\nthe door')
  const tab = MODE_LINKS.find((m) => m.mode === 'shows')
  check('Shows is a mode, at /shows/', tab?.path === '/shows/' && tab.label === 'Shows')
  check('the switch is four modes, always', MODE_LINKS.map((m) => m.mode).join() === 'machine,explorations,shows,playground')
  const page = readFileSync(join(process.cwd(), 'shows/index.html'), 'utf8')
  const player = readFileSync(join(process.cwd(), 'apps/rube/src/shows/main.ts'), 'utf8')
  const stage = readFileSync(join(process.cwd(), 'apps/rube/src/shows/stage.ts'), 'utf8')
  check('the page loads the player itself', page.includes('src="/apps/rube/src/shows/main.ts"'))
  check('a visit starts the show', /if \(current\) void open\(current, true\)/.test(player) && /if \(perf && thenPlay\) void play\(\)/.test(player))
  check('Zoom sits half as close again as the follow camera', /export const FOLLOW_ZOOM = 1\.5/.test(stage) && stage.includes('cam.cells / FOLLOW_ZOOM'))
  check('Z toggles Zoom and O toggles Overview', /case 'z':/.test(player) && /case 'o':/.test(player) && player.includes('Zoom in on the action (Z)') && player.includes('Zoom out to the whole world (O)'))

  /* ------------------------------------------------------------------ the registry */

  console.log('\nthe registry')
  const stub = (title: string, label: string): ShowVersion => ({ title, label, load: async () => ({}) as Performance })
  check('a path names its work and its take', versionPath('./versions/clair-de-lune/take-a.show.ts')?.work === 'clair-de-lune' && versionPath('./versions/clair-de-lune/take-a.show.ts')?.take === 'take-a')
  check('anything else is not a version', ['./versions/a.show.ts', './versions/A/b.show.ts', './versions/a/b.ts', './versions/a/b/c.show.ts', './other/a/b.show.ts'].every((p) => versionPath(p) === null))
  {
    const { works, problems } = readShows({
      './versions/clair-de-lune/take-b.show.ts': stub('Clair de Lune', 'Take B'),
      './versions/premiere-arabesque/take-a.show.ts': stub('Première Arabesque', 'Take A'),
      './versions/clair-de-lune/take-a.show.ts': stub('Clair de Lune', 'Take A'),
    })
    check('takes of one work are grouped under it', works.length === 2 && works[0].work === 'clair-de-lune' && works[0].versions.length === 2, JSON.stringify(works.map((w) => [w.work, w.versions.length])))
    check('in file order, so nothing keeps a list', works[0].versions.map((v) => v.take).join(',') === 'take-a,take-b' && works[1].work === 'premiere-arabesque')
    check('a work takes its title from its takes', works[0].title === 'Clair de Lune')
    check('a clean folder has no problems', problems.length === 0, problems.join(' · '))
    check('a link names a version', pickVersion(works, 'clair-de-lune', 'take-b')?.label === 'Take B')
    check('a take that is not there falls to the work\'s first', pickVersion(works, 'premiere-arabesque', 'take-z')?.take === 'take-a')
    check('except Clair de Lune, which falls to Take B', pickVersion(works, 'clair-de-lune', 'take-z')?.take === 'take-b')
    check('a work that is not there falls to the first work', pickVersion(works, 'nocturne', null)?.work === 'clair-de-lune')
    check('a link with no work opens Clair de Lune, Take B', pickVersion(works, null, null)?.work === 'clair-de-lune' && pickVersion(works, null, null)?.take === 'take-b')
    check('Clair de Lune with no take opens Take B', pickVersion(works, 'clair-de-lune', null)?.take === 'take-b')
    check('an explicit take is still that take', pickVersion(works, 'clair-de-lune', 'take-a')?.take === 'take-a')
    check('an empty folder picks nothing', pickVersion([], 'clair-de-lune', 'take-a') === null)
  }
  {
    const { works, problems } = readShows({
      './versions/a/one.show.ts': stub('A', 'One'),
      './versions/a/two.show.ts': stub('Not A', 'One'),
      './versions/a/three.show.ts': { title: 'A' },
      './versions/a/four.show.ts': null,
      './versions/B/five.show.ts': stub('B', 'Five'),
    })
    check('a bad file is left out and said, and the rest still stand', works.length === 1 && works[0].versions.length === 2 && problems.length === 5, `${works.length} works, ${problems.length} problems`)
    check('takes that disagree on the title are said', problems.some((p) => p.includes('Not A')))
    check('two takes with one label are said', problems.some((p) => p.includes('second take')))
  }
  {
    const show = new Show('check')
    check('a performance that can be played has no problems', performanceProblems({ show, duration: 10, soundtrack: { src: 'a.mp3', offset: 1.5 } }).length === 0)
    check('no length, no source or a negative offset is said', [{ show, duration: 0 }, { show, duration: NaN }, { show, duration: 10, soundtrack: { src: '' } }, { show, duration: 10, soundtrack: { src: 'a.mp3', offset: -1 } }].every((p) => performanceProblems(p).length === 1))
    check('what is not a performance is refused, not thrown on', performanceProblems(null as unknown as Performance).length > 0 && performanceProblems({} as Performance).length > 0)
  }

  /* ------------------------------------------------------------------ the versions folder */

  console.log('\nshipped versions')
  const root = join(process.cwd(), 'apps/rube/src/shows/versions')
  const found: Record<string, unknown> = {}
  for (const work of readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory())) {
    for (const file of readdirSync(join(root, work)).filter((f) => f.endsWith('.show.ts'))) {
      const take = file.slice(0, -'.show.ts'.length)
      // A glob import, as esbuild reads it: every version file is bundled, and the folder on disk says which to ask for.
      found[`./versions/${work}/${file}`] = (await import(`./src/shows/versions/${work}/${take}.show.ts`)).default
      // The page reads every version file before it shows a picker, so a version file imports nothing
      // that weighs anything: the registry's helper, types, and the URL of a recording.
      const source = readFileSync(join(root, work, file), 'utf8')
      const heavy = [...source.matchAll(/^import\s+(?!type\b)[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]).filter((from) => from !== '../../registry' && !/\.(mp3|ogg|wav|m4a|flac|opus)$/.test(from))
      check(`${work}/${file}: keeps what is heavy behind load()`, heavy.length === 0, heavy.join(', '))
    }
  }
  const shipped = readShows(found)
  check('every version file is a version', shipped.problems.length === 0, shipped.problems.join(' · '))
  check('the Shows tab opens Clair de Lune, Take B', pickVersion(shipped.works, null, null)?.work === 'clair-de-lune' && pickVersion(shipped.works, null, null)?.take === 'take-b')
  check('Clair de Lune with no take is Take B, and take-a is still there', pickVersion(shipped.works, 'clair-de-lune', null)?.take === 'take-b' && pickVersion(shipped.works, 'clair-de-lune', 'take-a')?.take === 'take-a')
  check('Première keeps Take A alongside Take B', shipped.works.find((w) => w.work === 'premiere-arabesque')?.versions.map((v) => v.take).join(',') === 'take-a,take-b')
  check('Clair de Lune keeps Take A alongside Take B', shipped.works.find((w) => w.work === 'clair-de-lune')?.versions.map((v) => v.take).join(',') === 'take-a,take-b')
  check('the shows are Clair de Lune, Cornfield Chase, La La Land, the metronome and Première', shipped.works.map((w) => w.work).sort().join(',') === 'clair-de-lune,cornfield-chase,la-la-land,metronome,premiere-arabesque')
  const lalaland = shipped.works.find((w) => w.work === 'la-la-land')?.versions ?? []
  check('La La Land has the one take, Epilogue, with a faint byline (Directed by wustep) and no model or tech-demo line',
    lalaland.map((v) => v.take).join(',') === 'fable51-epilogue' && lalaland[0]?.label === 'Epilogue' && lalaland[0]?.note === undefined &&
    lalaland[0]?.director?.name === 'wustep' && lalaland[0]?.director?.href === 'https://x.com/wustep')
  check('Cornfield Chase keeps the Grok music-sync, multi-ball and trails takes beside the Opus 5.5 music-sync', shipped.works.find((w) => w.work === 'cornfield-chase')?.versions.map((v) => v.take).join(',') === 'multiball,opus55-music-sync,tech-demo,voices')
  check('Cornfield Chase labels name the model and stay unique', shipped.works.find((w) => w.work === 'cornfield-chase')?.versions.map((v) => v.label).join('|') === '[Grok 4.7] Multi-ball|[Opus 5.5] Music-sync|[Grok 4.7] Music-sync|[Grok 4.7] Trails')
  check('Cornfield Chase notes say these are one-shot tech demos', shipped.works.find((w) => w.work === 'cornfield-chase')?.versions.every((v) => /pure tech demo/i.test(v.note ?? '') && /one-shot/i.test(v.note ?? '')) === true)
  check('a named take is still that take', pickVersion(shipped.works, 'metronome', 'strict')?.take === 'strict')
  for (const work of shipped.works) {
    for (const version of work.versions) {
      const perf = await version.load()
      const wrong = performanceProblems(perf)
      check(`${work.work}/${version.take}: loads, and can be played`, wrong.length === 0, wrong.join(' · '))
      if (wrong.length) continue
      if (work.work === 'premiere-arabesque' || work.work === 'clair-de-lune') {
        const premiere = work.work === 'premiere-arabesque'
        check(`${work.work}/${version.take}: full approved recording and panel credit`,
          near(perf.duration, premiere ? 290.61133333333333 : 301.648526) &&
          near(perf.soundtrack?.offset ?? 0, premiere ? 2.38 : 2.44) &&
          !!perf.soundtrack?.credit?.includes(premiere ? 'Patrizia Prati' : 'Laurens Goedhart') &&
          !!perf.soundtrack?.href?.startsWith('https://commons.wikimedia.org/'))
      }
      // The player asks for show.at(t) over 0..duration and nothing else.
      let ok = true
      for (let t = 0; t <= perf.duration && ok; t += 0.25) {
        const here = perf.show.at(t)
        const cam = perf.camera?.(t)
        ok = Number.isFinite(here.x) && Number.isFinite(here.y) && (!cam || (Number.isFinite(cam.x) && Number.isFinite(cam.y) && cam.cells > 0))
      }
      check(`${work.work}/${version.take}: is on the stage for every second of its length`, ok)
      if (work.work === 'clair-de-lune' && version.take === 'take-b') {
        const final = perf.show.universe(3)
        const souvenirs = final.pieces.filter((p) => ['booth', 'ticket'].includes(p.piece.name))
        const cam = perf.camera!(perf.duration)
        const zoomCells = cam.cells / 1.5
        check('Clair B: the photograph and ticket fit the final Zoom frame', souvenirs.length === 2 && souvenirs.flatMap((p) => p.cells).every(([x, y]) =>
          Math.abs(x - cam.x) + .5 < zoomCells * 8 / 9 && Math.abs(y - cam.y) + .5 < zoomCells / 2))
        check('Clair B: resonance keeps the picture after the final portal', perf.cuts?.(perf.duration - 1) === false && perf.cuts?.(150) === true)
        let visible = true
        for (let t = 290; t <= perf.duration; t += 1 / 120) {
          const point = perf.show.at(t), frame = perf.camera!(t), cells = frame.cells / 1.5
          visible &&= Math.abs(point.x - frame.x) < cells * 8 / 9 - .15 && Math.abs(point.y - frame.y) < cells / 2 - .15
        }
        check('Clair B: the camera settles with the ball inside the Zoom frame', visible)
      }
      if (work.work === 'cornfield-chase' && version.take === 'tech-demo') {
        check('cornfield: the whole recording, with the demo credit',
          near(perf.duration, 126.984) &&
          (perf.soundtrack?.offset ?? 0) === 0 &&
          !!perf.soundtrack?.credit?.includes('Hans Zimmer') &&
          !!perf.soundtrack?.credit?.toLowerCase().includes('demo') &&
          perf.soundtrack?.href === 'https://www.youtube.com/watch?v=JuSsvM8B4Jc')
        const endCam = perf.camera?.(perf.duration)
        check('cornfield: the closing frame stays wide enough for the souvenirs', !!endCam && endCam.cells >= 8)
        check('cornfield: the closing portal does not iris the picture away', perf.cuts?.(perf.duration - 1) === false && perf.cuts?.(30) === true)
      }
      if (work.work === 'la-la-land' && version.take === 'fable51-epilogue') {
        check('epilogue: the whole recording from zero, credited to Justin Hurwitz and La La Land, ending after the last chord',
          (perf.soundtrack?.offset ?? 0) === 0 && !!perf.soundtrack?.src?.includes('lalaland-epilogue-demo') && near(perf.duration, EPILOGUE_END) &&
          EPILOGUE_END > LAST_CHORDS[LAST_CHORDS.length - 1] + 1 && EPILOGUE_END <= epilogueOnsets.duration &&
          !!perf.soundtrack?.credit?.includes('Justin Hurwitz') && !!perf.soundtrack?.credit?.includes('La La Land') &&
          !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') && perf.soundtrack?.href === 'https://www.youtube.com/watch?v=jQVvT_UKZ6w')
        const said = EPILOGUE_CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
        check('epilogue: end credits over the last chords, set by the page, naming Stephen Wu, Fable 5.1, Sebastian, Mia, Justin Hurwitz, Epilogue, La La Land and p5.js, gone before the last chord',
          EPILOGUE_CREDITS_OK && perf.titles === epilogueCredits && epilogueCredits(EPILOGUE_CARDS[0].at - 0.1).length === 0 && epilogueCredits(perf.duration).length === 0 &&
          ['Directed by', 'Stephen Wu', 'Fable 5.1', 'Sebastian', 'Mia', 'Justin Hurwitz', 'Epilogue', 'La La Land', 'p5.js'].every((w) => said.includes(w)) &&
          !/private tech demo/i.test(said), said)
        const show = perf.show as EpilogueShow
        check('epilogue: the club, then the dream from the kiss, then the club again from the moment the set is struck',
          show.universe(0).world.name === 'sebs' && show.universe(1).world.name === 'backlot' && show.universe(2).world.name === 'sebs' &&
          show.indexAt(INTO - 0.01) === 0 && show.indexAt(INTO + 0.01) === 1 && show.indexAt(OUT - 0.01) === 1 && show.indexAt(OUT + 0.01) === 2 &&
          near(INTO, KISS) && near(OUT, STRUCK))
        check('epilogue: no portal anywhere, and no cut is drawn', [0, 1, 2].every((i) => show.universe(i).pieces.every((p) => p.piece.name !== 'portal')) &&
          [0, 30, KISS, 100, 200, STRUCK, 400].every((t) => perf.cuts?.(t) === false))
        // One ball on one continuous path: never a jump, the changes of world included.
        let jump = 0
        let at = 0
        let prev = show.where(0)
        for (let t = 0.001; t <= perf.duration; t += 0.001) {
          const here = show.where(t)
          const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
          if (d > jump) { jump = d; at = t }
          prev = here
        }
        check('epilogue: the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${at.toFixed(3)} s`)
        // Every strike, part by part, lands on something the recording has.
        const o = epilogueOnsets as {
          piano: { t: number; s: number }[]; kiss: number; swing: { beats: { t: number }[] }; waltz: { beats: { t: number }[] }; number: { beats: { t: number }[] }
          stars: { t: number; s: number }[]; bridge: { t: number; s: number }[]; home: { t: number; s: number }[]; piano2: { t: number; s: number }[]; look: { t: number; s: number }[]; last: { t: number; s: number }[]; strong: { t: number; s: number }[]
        }
        const within = (t: number, marks: number[], tol: number) => marks.some((m) => Math.abs(t - m) <= tol + 1e-9)
        const pianoNotes = [...o.piano.map((n) => n.t), ...o.piano2.map((n) => n.t), ...o.look.filter((n) => n.s >= 0.3).map((n) => n.t), ...o.last.filter((n) => n.s >= 0.3).map((n) => n.t)]
        const swingComb = o.swing.beats.map((b) => b.t)
        const waltzComb = o.waltz.beats.map((b) => b.t)
        const numberComb = o.number.beats.map((b) => b.t)
        const free = [KISS, KISS_PEAK, ...o.strong.map((n) => n.t), ...o.stars.filter((n) => n.s >= 0.3).map((n) => n.t), ...o.bridge.filter((n) => n.s >= 0.3).map((n) => n.t), ...o.home.filter((n) => n.s >= 0.3).map((n) => n.t), ...LAST_CHORDS]
        const off: string[] = []
        let count = 0
        for (const [name, list] of Object.entries(EPILOGUE_STRIKES.piano)) for (const t of list) { count++; if (!within(t, pianoNotes, 0.04)) off.push(`${name} ${t.toFixed(3)}`) }
        for (const [name, list] of Object.entries(EPILOGUE_STRIKES.swing)) for (const t of list) { count++; if (!within(t, swingComb, 0.026)) off.push(`${name} ${t.toFixed(3)}`) }
        for (const [name, list] of Object.entries(EPILOGUE_STRIKES.waltz)) for (const t of list) { count++; if (!within(t, [...waltzComb, ...free], 0.026)) off.push(`${name} ${t.toFixed(3)}`) }
        for (const [name, list] of Object.entries(EPILOGUE_STRIKES.number)) for (const t of list) { count++; if (!within(t, [...numberComb, ...free], 0.026)) off.push(`${name} ${t.toFixed(3)}`) }
        for (const [name, list] of Object.entries(EPILOGUE_STRIKES.free)) for (const t of list) { count++; if (!within(t, [...free, ...pianoNotes], 0.035)) off.push(`${name} ${t.toFixed(3)}`) }
        check('epilogue: every strike lands on a measured onset', count > 200 && off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
        const swingHits = Object.values(EPILOGUE_STRIKES.swing).flat()
        const swingBeats: number[] = []
        for (let b = SWING_FROM; b <= SWING_SOFT; b++) swingBeats.push(swingBeat(b))
        const swingStruck = swingBeats.filter((t) => swingHits.some((s) => Math.abs(s - t) <= 0.026))
        check('epilogue: through the loud swing, nearly every beat is struck', swingStruck.length >= swingBeats.length * 0.85, `${swingStruck.length}/${swingBeats.length}`)
        const waltzHits = Object.values(EPILOGUE_STRIKES.waltz).flat()
        const bars: number[] = []
        for (let b = WALTZ_FROM; b <= WALTZ_END; b++) bars.push(waltzBar(b))
        const barsStruck = bars.filter((t) => waltzHits.some((s) => Math.abs(s - t) <= 0.026))
        check('epilogue: every bar of the waltz is struck, or all but one', barsStruck.length >= bars.length - 1, `${barsStruck.length}/${bars.length}`)
        const numberHits = Object.values(EPILOGUE_STRIKES.number).flat()
        const numberBeats: number[] = []
        for (let b = NUMBER_FROM + 4; b <= NUMBER_END; b++) numberBeats.push(numberBeat(b))
        const numberStruck = numberBeats.filter((t) => numberHits.some((s) => Math.abs(s - t) <= 0.026))
        check('epilogue: through the number, nearly every beat is struck', numberStruck.length >= numberBeats.length * 0.85, `${numberStruck.length}/${numberBeats.length}`)
        const pianoHits = EPILOGUE_STRIKES.piano.piano
        const strongNotes = o.piano.filter((n) => n.s >= 0.6).map((n) => n.t)
        const notesStruck = strongNotes.filter((t) => pianoHits.some((s) => Math.abs(s - t) <= 0.04))
        check('epilogue: the piano plays its theme: nearly every strong note of the opening is struck, and the four notes at the end', notesStruck.length >= strongNotes.length * 0.85 &&
          PIANO2.every((t) => EPILOGUE_STRIKES.piano.finale.some((s) => Math.abs(s - t) <= 0.04)), `${notesStruck.length}/${strongNotes.length}`)
        check('epilogue: the kiss is struck, on the burst', EPILOGUE_STRIKES.free.kiss.some((t) => near(t, KISS) || near(t, KISS_PEAK)))
        // The ball is never out of sight for long.
        let hidden = 0
        let longest = 0
        for (let t = 0; t <= perf.duration; t += 0.01) {
          const here = show.at(t)
          hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
          longest = Math.max(longest, hidden)
        }
        check('epilogue: the ball is never hidden for more than 2.5 s', longest <= 2.5, `${longest.toFixed(2)} s`)
        check('epilogue: Seb is a solid ball the whole show', [0, 30, KISS + 0.5, 100, 200, 300, STRUCK + 1, 400].every((t) => !show.at(t).ball.ghost))
        // The kiss: the ball touches Mia's on the burst, beside her table, and the room turns.
        const kissAt = show.where(KISS)
        const miaAtKiss = show.mia(KISS)
        check('epilogue: on the kiss he is at her table, touching her', !!miaAtKiss && near(kissAt[0], KISS_AT[0], 0.02) && near(kissAt[1], KISS_AT[1], 0.02) &&
          Math.hypot(miaAtKiss.x - kissAt[0], miaAtKiss.y - kissAt[1]) <= 0.3, `${kissAt.map((v) => v.toFixed(2))} · Mia ${miaAtKiss ? `${miaAtKiss.x.toFixed(2)},${miaAtKiss.y.toFixed(2)}` : 'absent'}`)
        // Company, as in the film. Mia sits at her table while he plays, is with him everywhere in the dream, and at
        // the end is back at her table with her husband, and leaves. Her husband is only in the club at the end.
        const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
          if (!b || (b.scale ?? 1) <= 0.02) return false
          const f = perf.camera!(t)
          const a = f.angle ?? 0
          const dx = b.x - f.x
          const dy = b.y - f.y
          const x = dx * Math.cos(a) - dy * Math.sin(a)
          const y = dx * Math.sin(a) + dy * Math.cos(a)
          return Math.abs(x) < (f.cells * 16) / 9 / 2 + 0.2 && Math.abs(y) < f.cells / 2 + 0.2
        }
        const withHim = [KISS + 1, 80, 95, 110, 125, 150, 160, 175, 200, 225, 250, 265, 290, 320, 334]
        // After the set is struck the camera is tight on Seb at the keys for the chord's decay; her table comes into
        // frame with the pull-back on the look.
        const atTable = [KISS - 0.5, LOOK + 2, LOOK + 6]
        const husbandAway = [1, 30, 60, KISS + 1, 100, 200, 300, STRUCK - 1]
        const miss: string[] = []
        for (const t of [...withHim, ...atTable]) if (!inShot(t, show.mia(t))) miss.push(`Mia not in shot ${t}`)
        for (const t of husbandAway) if (show.husband(t)) miss.push(`husband at ${t}`)
        check('epilogue: Mia at her table for the kiss, with him through the dream, at her table again after; her husband only in the club at the end', miss.length === 0, miss.join(', '))
        const two = [...withHim, ...atTable].map((t) => show.at(t).balls ?? [])
        check('epilogue: where she is, two balls with two ids, or three with her husband, never more', two.every((b) => b.length >= 2 && b.length <= 3 && new Set(b.map((x) => x.id)).size === b.length))
        check('epilogue: she is her yellow, and he his grey', withHim.every((t) => show.mia(t)?.color?.toUpperCase() === MIA_HEX.toUpperCase()) && [400, 420].every((t) => !show.husband(t) || show.husband(t)?.color?.toUpperCase() === HUSBAND_HEX.toUpperCase()))
        // The company never jumps while drawn, and comes and goes only out of shot.
        const drawn = (g: { scale?: number } | null) => !!g && (g.scale ?? 1) > 0.02
        for (const [name, of] of [['Mia', (t: number) => show.mia(t)], ['her husband', (t: number) => show.husband(t)]] as const) {
          let gJump = 0
          let gAt = 0
          const pops: string[] = []
          let gPrev = of(0)
          for (let t = 0.001; t <= perf.duration; t += 0.001) {
            const g = of(t)
            if (g && gPrev) {
              const d = Math.hypot(g.x - gPrev.x, g.y - gPrev.y)
              if (d > gJump) { gJump = d; gAt = t }
            }
            if (!gPrev && inShot(t, g)) pops.push(`in at ${t.toFixed(3)}`)
            else if (gPrev && !g && inShot(t - 0.001, gPrev)) pops.push(`out at ${t.toFixed(3)}`)
            else if (gPrev && g && !drawn(gPrev) && (g.scale ?? 1) > 0.3 && inShot(t, g)) pops.push(`shown at ${t.toFixed(3)}`)
            else if (gPrev && g && drawn(gPrev) && (gPrev.scale ?? 1) > 0.3 && !drawn(g) && inShot(t - 0.001, gPrev)) pops.push(`hidden at ${t.toFixed(3)}`)
            gPrev = g
          }
          check(`epilogue: ${name} never jumps (no more than 0.04 cells a millisecond)`, gJump <= 0.04, `${gJump.toFixed(3)} at ${gAt.toFixed(3)} s`)
          check(`epilogue: ${name} comes and goes only out of shot`, pops.length === 0, pops.slice(0, 8).join(', '))
        }
        void ROOM
        void STARS
        void HOME
        void CHORUS
        void SWING_MID
        void BUILD
      }
      if (work.work === 'cornfield-chase' && version.take === 'opus55-music-sync') {
        check('cornfield opus55: the whole recording from zero, with the demo credit',
          near(perf.duration, 126.984) && (perf.soundtrack?.offset ?? 0) === 0 &&
          !!perf.soundtrack?.credit?.includes('Hans Zimmer') && !!perf.soundtrack?.credit?.toLowerCase().includes('demo') &&
          perf.soundtrack?.href === 'https://www.youtube.com/watch?v=JuSsvM8B4Jc')
        const score = (perf.show as StockShow).score
        check('cornfield opus55: Forest, one portal, then the Arcade', score.maps.map((m) => m.world).join(',') === 'garden,arcade' &&
          score.maps[0].pieces.at(-1)?.spec.portal === 'out' && score.maps[1].pieces[0]?.spec.portal === 'in')
        // Every strike, measured again here from the saved score, lands on an onset the recording has.
        const o = cornfieldOnsets as { drop: { t: number }; last: { t: number }; piano: { t: number }[]; gather: { t: number }[]; eighths: { beat: number; t: number }[] }
        const marks = [...o.piano.map((n) => [n.t, 0.04]), ...o.gather.map((n) => [n.t, 0.03]), [o.drop.t, 0.02], [o.last.t, 0.03],
          ...o.eighths.filter((e) => e.beat > 68 && e.beat < 191).map((e) => [e.t, 0.026])]
        const struck = score.maps.flatMap((m) => m.pieces).filter((p) => p.spec.name !== 'rail' && !p.spec.portal).map((p) => p.begin + p.lane.fire)
        const off = struck.filter((t) => !marks.some(([at, tol]) => Math.abs(t - at) <= tol + 1e-9))
        check('cornfield opus55: every stock strike lands on a measured onset', struck.length > 120 && off.length === 0, off.map((t) => t.toFixed(3)).join(', '))
        const beats = o.eighths.filter((e) => Number.isInteger(e.beat) && e.beat > 68 && e.beat < 191)
        const hit = beats.filter((b) => struck.some((t) => Math.abs(t - b.t) <= 0.026))
        const downs = beats.filter((b) => (b.beat - 68) % 4 === 0)
        check('cornfield opus55: the chase strikes most beats and nearly every downbeat',
          hit.length >= beats.length * 0.85 && downs.filter((b) => hit.includes(b)).length >= downs.length - 1, `${hit.length}/${beats.length} beats`)
        check('cornfield opus55: a flight on the drop', struck.some((t) => Math.abs(t - o.drop.t) <= 0.02) &&
          ['shooter', 'hoops', 'hockey', 'skee', 'slingshot', 'whack', 'bumpercar', 'coaster', 'popcorn', 'foosball'].includes(score.maps[1].pieces[1]?.spec.name ?? ''))
        const endCam = perf.camera?.(perf.duration)
        check('cornfield opus55: the closing frame holds the photograph and the ticket', !!endCam && endCam.cells >= 7.5)
        check('cornfield opus55: the closing portal does not iris the picture away', perf.cuts?.(perf.duration - 1) === false && perf.cuts?.(30) === true)
      }
      if (work.work === 'cornfield-chase' && version.take === 'multiball') {
        const before = perf.show.at(CORNFIELD_RIDERS[0].spawn - 0.5).balls ?? []
        const joined = perf.show.at(CORNFIELD_RIDERS[0].spawn + 1).balls ?? []
        const mid = perf.show.at(CORNFIELD_RIDERS[CORNFIELD_RIDERS.length - 1].spawn + 2).balls ?? []
        const merged = perf.show.at(CORNFIELD_MEET + 0.3).balls ?? []
        const ys = merged.map((b) => b.y)
        const xs = merged.map((b) => b.x)
        const spread = Math.max(...ys) - Math.min(...ys)
        const xspread = Math.max(...xs) - Math.min(...xs)
        check('cornfield: the whole recording, riders joining on their accents', near(perf.duration, CORNFIELD_DURATION) && before.length === 0 && joined.length === 1 && mid.length === CORNFIELD_RIDERS.length)
        check('cornfield: each rider keeps its own id and colour', mid.every((b, i) => b.id === CORNFIELD_RIDERS[i].id && b.color === CORNFIELD_RIDERS[i].color))
        const atJoin = perf.show.at(CORNFIELD_RIDERS[0].spawn + 1)
        const rider = atJoin.balls?.[0]
        const threadY = universeAt(perf.show.universe(0), atJoin.local).y
        check('cornfield: the first lane sits off the thread', !!rider && Math.abs(rider.y - threadY - CORNFIELD_RIDERS[0].lane) < 0.35, rider ? `dy ${rider.y - threadY}` : 'no rider')
        check('cornfield: the lanes have merged at the portal', merged.length === CORNFIELD_RIDERS.length && spread < 0.35 && xspread < 0.35, `x ${xspread.toFixed(3)} y ${spread.toFixed(3)}`)
        const cam = perf.camera?.(60)
        check('cornfield: the camera holds the whole garden', !!cam && cam.cells > 6)
      }
      if (work.work === 'cornfield-chase' && version.take === 'voices') {
        check('Cornfield voices: private credit, and a clip of the chase',
          !!perf.soundtrack?.credit?.includes('Zimmer') &&
          !!perf.soundtrack?.href?.includes('JuSsvM8B4Jc') &&
          (perf.soundtrack?.offset ?? 0) > 60 &&
          perf.duration >= 40 && perf.duration <= 55)
        const mid = perf.show.at(perf.duration / 2)
        const cam = perf.camera!(perf.duration / 2)
        const zoomH = cam.cells / 1.5
        check('Cornfield voices: the hero stays inside the Zoom frame',
          Math.abs(mid.x - cam.x) < zoomH * (16 / 9) / 2 - 0.2 && Math.abs(mid.y - cam.y) < zoomH / 2 - 0.2)
      }
    }
  }

  /* ------------------------------------------------------------------ the clock */

  console.log('\nthe clock')
  check('the speeds are 1× and 2×', SHOW_SPEEDS.join(',') === '1,2')
  {
    let wall = 0
    const c = new Transport({ duration: 10, wall: () => wall })
    check('starts at the top, standing still', c.now() === 0 && !c.playing)
    wall = 5000
    check('does not run until it is played', c.now() === 0)
    c.play()
    wall = 7000
    check('counts the wall clock', near(c.now(), 2))
    c.setSpeed(2)
    wall = 8000
    check('twice as fast at 2×, from where it was', near(c.now(), 4) && c.speed === 2)
    c.pause()
    wall = 60000
    check('holds where it was paused', near(c.now(), 4))
    c.seek(9)
    c.play()
    wall = 62000
    check('stops at the end and does not pass it', c.now() === 10 && c.ended)
    c.seek(-3)
    check('and does not go before the top', c.now() === 0)
    c.seek(NaN)
    check('a time that is not a number is the top', c.now() === 0)
  }
  {
    let wall = 0
    let heard: number | null = 0
    const c = new Transport({ duration: 30, wall: () => wall, heard: () => heard })
    c.play()
    wall = 4000
    heard = 3.2
    check('with a soundtrack, the time is where the music is', near(c.now(), 3.2))
    wall = 9000
    check('a recording that stalls holds the picture with it', near(c.now(), 3.2))
    // The music has not moved yet when the clock is sent somewhere: the clock says where, and the music is sent there.
    check('a seek answers with where it went, not with where the music still is', c.seek(20) === 20 && c.seek(99) === 30 && c.seek(-1) === 0)
    heard = 3.2
    c.setSpeed(2)
    heard = 6
    check('at 2× it is still where the music is', near(c.now(), 6))
    wall = 9500
    heard = null
    check('music that drops out is carried on from, at the speed it had', near(c.now(), 7))
    heard = 99
    check('music that runs past the end does not take the show with it', c.now() === 30)
    c.pause()
    heard = 12
    check('paused, it does not listen', c.now() === 30)
  }
  check('the readout is m:ss', clockText(0) === '0:00' && clockText(59.9) === '0:59' && clockText(61) === '1:01' && clockText(-4) === '0:00')

  /* ------------------------------------------------------------------ time maps */

  console.log('\ntime maps')
  {
    const knots = [{ at: 0, native: 0 }, { at: 2, native: 2.4 }, { at: 3, native: 3.2 }, { at: 6, native: 6 }]
    const map = timeMap(knots)
    check('passes through every knot', knots.every((k) => near(map(k.at), k.native)))
    let monotone = true
    let steepest = 0
    for (let t = -1; t < 8; t += 0.01) {
      const rate = (map(t + 0.01) - map(t)) / 0.01
      if (rate <= 0) monotone = false
      steepest = Math.max(steepest, rate)
    }
    check('never runs the machine backwards or stops it dead', monotone)
    check('never lurches: no faster than the steepest pair of knots asks, and a little', steepest < 1.2 * 1.25, steepest.toFixed(3))
    check('runs at the machine\'s own rate outside the knots', near(map(-1), -1) && near(map(8), 8))
    check('reads the other way round', near(map(musicTimeOf(map, 2.75, 0, 6)), 2.75, 1e-6))
    check('one knot, or none, is the machine\'s own clock moved', near(timeMap([])(3), 3) && near(timeMap([{ at: 1, native: 4 }])(2), 5))
    check('knots in order and in bounds have no problems', knotProblems(knots).length === 0, knotProblems(knots).join(' · '))
    check('knots out of order are said', knotProblems([{ at: 0, native: 0 }, { at: 2, native: 2 }, { at: 1, native: 3 }]).length === 1)
    check('a lurch is said', knotProblems([{ at: 0, native: 0 }, { at: 1, native: 2 }]).length === 1 && knotProblems([{ at: 0, native: 0 }, { at: 2, native: 1 }]).length === 1)
  }
  {
    const plain = new Show('retime')
    const held = new RetimedShow('retime', {}, (t) => t * 0.5)
    const a = plain.at(3)
    const b = held.at(6)
    check('a retimed show is the same machine on another clock', near(a.x, b.x) && near(a.y, b.y) && a.placed.piece.name === b.placed.piece.name && near(a.local, b.local))
  }

  /* ------------------------------------------------------------------ the placeholders */

  console.log('\nthe placeholder take')
  {
    const strict = strictTake()
    const plain = new Show('metronome')
    const native = strikes(plain)
    const wrong = knotProblems(strict.knots, 0.75, 1.35)
    check('strict time: the machine is never asked for more than a slight change of pace', wrong.length === 0, wrong.join(' · '))
    check('strict time: most strikes are brought onto the beat', strict.onGrid.length >= native.length * 0.8, `${strict.onGrid.length}/${native.length}`)
    check('strict time: and those land on the half-beat exactly', strict.onGrid.every((at) => near(at / GRID, Math.round(at / GRID), 1e-9)))
    // The note for a strike is where the retimed machine strikes: what is heard is what is seen.
    const map = timeMap(strict.knots)
    const struck = strict.notes.slice(0, native.length)
    check('strict time: every note is on its strike', struck.every((n, i) => near(map(n.at), native[i], 1e-5)))
    check('strict time: the show is as long as its map, to the cut out of its second world', near(map(strict.duration), plain.begin(2), 1e-9))
    const last = strict.show.at(strict.duration)
    check('strict time: it ends on the frame the machine ends on', last.universe.index === 2 && near(last.local, 0, 1e-6))

    // The strikes alone, without the beat under them, so the silence before the first can be heard.
    const wav = renderWav(struck, strict.duration + 1)
    const view = new DataView(wav.buffer)
    const tag = (at: number) => String.fromCharCode(...wav.slice(at, at + 4))
    check('the soundtrack renders to a WAV', tag(0) === 'RIFF' && tag(8) === 'WAVE' && tag(36) === 'data' && view.getUint32(40, true) === wav.length - 44)
    check('as long as it was asked to be', near((wav.length - 44) / 2 / view.getUint32(24, true), strict.duration + 1, 1e-3))
    let peak = 0
    let silentBefore = true
    const rate = view.getUint32(24, true)
    const first = Math.floor(struck[0].at * rate)
    for (let i = 0; i < (wav.length - 44) / 2; i++) {
      const v = Math.abs(view.getInt16(44 + i * 2, true))
      peak = Math.max(peak, v)
      if (i < first - 1 && v !== 0) silentBefore = false
    }
    check('silent until the first strike, then heard', silentBefore && peak > 8000, `peak ${peak}`)
    check('and never clipped', peak < 32767, `peak ${peak}`)
  }

  console.log(failures ? `\n${failures} failure(s)` : '\nall good')
  process.exit(failures ? 1 : 0)
}

void main()
