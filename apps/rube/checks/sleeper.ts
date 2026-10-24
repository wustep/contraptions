/**
 * The checks for Sleeper: Hans Zimmer's "Paul's Dream", after Denis Villeneuve's Dune, a sea-green ball from Caladan
 * to the Fremen. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import { CARDS, CREDITS_AT, LAST_GONE, creditsAt } from '../src/shows/versions/pauls-dream/sleeper/credits'
import { scopeAt } from '../src/shows/versions/pauls-dream/sleeper/film'
import { M, RECORDING, YOUTUBE, measuredAt } from '../src/shows/versions/pauls-dream/sleeper/music'
import { CHANI } from '../src/shows/versions/pauls-dream/sleeper/cast'
import { DREAM_SHOT, END, OPENING, WINDOWS } from '../src/shows/versions/pauls-dream/sleeper/plan'
import { SCENES } from '../src/shows/versions/pauls-dream/sleeper/scenes'
import type { SleeperShow } from '../src/shows/versions/pauls-dream/sleeper/show'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkSleeper(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as SleeperShow
  const cam = perf.camera!
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('sleeper: one take, Sleeper, Opus 5.5, with an about after Dune and a still, and no note or byline',
    version.title === 'Sleeper' && version.label === 'Opus 5.5' && version.note === undefined && /Dune/.test(version.about ?? '') &&
    typeof version.still === 'number' && !('director' in version))
  check('sleeper: the whole cue from zero, from WaterTower Music\'s upload only (no local file), credited to Hans Zimmer, the cue and the film, with the credits after it',
    near(perf.duration, END) && END > RECORDING + 10 && (perf.soundtrack?.offset ?? 0) === 0 && !perf.soundtrack?.src &&
    ['Hans Zimmer', 'Paul’s Dream', 'Dune'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === `https://www.youtube.com/watch?v=${YOUTUBE}` && YOUTUBE === 'BdtiYwSP9ko' && perf.soundtrack?.youtube?.length === 1 &&
    perf.soundtrack.youtube[0].id === YOUTUBE && (perf.soundtrack.youtube[0].from ?? 0) === 0 && (perf.soundtrack.youtube[0].at ?? 0) === 0)
  check('sleeper: no portal anywhere, and no cut drawn', [0, 50, 110, 200, 300, 400, 439].every((t) => perf.cuts?.(t) === false))

  // The scenes: end to end, each in its window.
  const ordered = [...SCENES].sort((a, b) => a.from - b.from)
  const tiled = ordered.every((s, i) => s.from < s.to && (i === 0 ? s.from === 0 : near(s.from, ordered[i - 1].to)))
  check('sleeper: the scenes tile the show from 0 to the end, each in its window', tiled && near(ordered[ordered.length - 1].to, END) &&
    ordered.every((s) => (WINDOWS as Record<string, readonly number[]>)[s.key] === undefined || (near(s.from, (WINDOWS as Record<string, readonly number[]>)[s.key][0]) && near(s.to, (WINDOWS as Record<string, readonly number[]>)[s.key][1]))),
    ordered.map((s) => `${s.key} ${s.from.toFixed(2)}–${s.to.toFixed(2)}`).join(', '))

  // The credits: the page's words, after the last blow, owing what is owed, gone before the end.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('sleeper: end credits after the last blow and on into the quiet, set by the page, directed by Claude Opus 5.5, naming the cast, Hans Zimmer, the cue, Dune, Denis Villeneuve, Frank Herbert and p5.js',
    CREDITS_AT > M.last && LAST_GONE <= END - 1.5 && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.05).length === 0 && creditsAt(END).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join('|') === 'Claude Opus 5.5' &&
    ['Paul Atreides', 'Lady Jessica', 'Chani', 'Hans Zimmer', '“Paul’s Dream”', 'Dune', 'Denis Villeneuve', 'Frank Herbert', 'p5.js'].every((w) => said.includes(w)), said)
  check('sleeper: the credits keep the house\'s least size on a phone and go up into the sky over the frame',
    creditsAt(CARDS[1].at + 2).every((c) => c.least === 4.5 && c.lift === 0.6))

  // The frame: Caladan in scope, opening on the drop as the frigate comes down, open from then on.
  check('sleeper: Caladan is in the scope picture, and the frame opens on the drop and stays open',
    [1, 30, 70, 109].every((t) => scopeAt(t) > 0.999) && near(OPENING.from, M.drop) && [OPENING.to, 150, 250, 350, 430].every((t) => scopeAt(t) < 0.001))

  // The strikes the story turns on, each on something the recording has.
  const strikes = ordered.flatMap((s) => (s.strikes ?? []).map(([n, t]): [string, number] => [`${s.key}: ${n}`, t]))
  const off = strikes.filter(([, t]) => !measuredAt(t, 0.03))
  check(`sleeper: every strike the story turns on (${strikes.length}) lands on a measured onset, tick or boom`, off.length === 0, off.map(([n, t]) => `${n} ${t.toFixed(3)}`).join(', '))

  // A bare cut is struck on the music; a cut under a dissolve or a vision is a soft change and is held to nothing.
  const blended = (t: number) => !!perf.blend?.(t) || !!perf.blend?.(t + 0.01)
  const cutsOff = show.cuts.filter((c) => c > 0 && !blended(c) && !measuredAt(c, 0.04))
  check('sleeper: every bare cut of the camera is on a measured onset, tick or boom', cutsOff.length === 0, cutsOff.map((c) => c.toFixed(3)).join(', '))

  // The dream shot: Chani on the crest, in the frame, through the whole of it.
  const chaniIn = [DREAM_SHOT.from, (DREAM_SHOT.from + DREAM_SHOT.to) / 2, DREAM_SHOT.to - 0.01].every((t) => {
    const b = show.at(t).balls?.find((x) => x.id === CHANI.id)
    const f = cam(t)
    return !!b && Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  })
  check('sleeper: Chani is in the dream shot from its first moment to its last', chaniIn)

  // Nothing jumps in shot: the hero, the cast and the camera, but at a cut or under a blend.
  const inShot = (t: number, x: number, y: number) => {
    const f = cam(t)
    return Math.abs(x - f.x) < (f.cells * 16) / 9 / 2 + 0.3 && Math.abs(y - f.y) < f.cells / 2 + 0.3
  }
  const step = 0.004
  const cutting = (t: number) => show.cuts.some((c) => c > t - step - 1e-6 && c <= t + 1e-6)
  const coveredList = ordered.flatMap((s) => s.covered ?? [])
  const isCovered = (t: number, id: number) => coveredList.some(([ct, cid]) => cid === id && Math.abs(ct - t) < 0.02)
  let heroJump = 0
  let heroAt = 0
  let camJump = 0
  let camAt = 0
  const pops: string[] = []
  let prev = show.at(0)
  let prevCam = cam(0)
  for (let t = step; t <= perf.duration; t += step) {
    const here = show.at(t)
    const f = cam(t)
    if (!blended(t) && !cutting(t)) {
      const d = Math.hypot(here.x - prev.x, here.y - prev.y)
      if (!here.hidden && !prev.hidden && d > heroJump && (inShot(t, here.x, here.y) || inShot(t - step, prev.x, prev.y))) {
        heroJump = d
        heroAt = t
      }
      const dc = Math.hypot(f.x - prevCam.x, f.y - prevCam.y) / f.cells + Math.abs(Math.log(f.cells / prevCam.cells))
      if (dc > camJump) {
        camJump = dc
        camAt = t
      }
      const was = new Map((prev.balls ?? []).map((b) => [b.id, b]))
      const now = new Map((here.balls ?? []).map((b) => [b.id, b]))
      for (const [id, b1] of now) {
        const b0 = was.get(id)
        if (!b0 && (b1.scale ?? 1) > 0.3 && inShot(t, b1.x, b1.y) && !isCovered(t, id)) pops.push(`${id} in at ${t.toFixed(3)}`)
        if (b0 && Math.hypot(b1.x - b0.x, b1.y - b0.y) > 0.12 && (inShot(t, b1.x, b1.y) || inShot(t - step, b0.x, b0.y))) pops.push(`${id} jumps at ${t.toFixed(3)}`)
      }
      for (const [id, b0] of was) {
        if (!now.has(id) && (b0.scale ?? 1) > 0.3 && inShot(t - step, b0.x, b0.y) && !isCovered(t, id)) pops.push(`${id} out at ${t.toFixed(3)}`)
      }
    }
    prev = here
    prevCam = f
  }
  check('sleeper: the hero never jumps in shot (no more than 0.1 cells in 4 ms) but at a cut or under a blend', heroJump <= 0.1, `${heroJump.toFixed(3)} at ${heroAt.toFixed(3)} s`)
  check('sleeper: the camera never jumps (no more than 1.5% of the frame in 4 ms) but at a cut or under a blend', camJump <= 0.015, `${camJump.toFixed(4)} at ${camAt.toFixed(3)} s`)
  check('sleeper: no one comes, goes or jumps in shot', pops.length === 0, pops.slice(0, 12).join(', '))
}
