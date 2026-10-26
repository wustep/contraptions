/**
 * The checks for Maker: a blue ball from the harvester's end in the deep desert, through the thumper and the first worm
 * ride, under the black sun of Giedi Prime's arena, to the charge out of the storm, on Hans Zimmer's "Harkonnen Arena".
 * Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/harkonnen-arena-onsets.json'
import { M, RECORDING, YOUTUBE } from '../src/shows/versions/harkonnen-arena/maker/music'
import { CARDS, CREDITS_AT, CREDITS_OK, creditsAt } from '../src/shows/versions/harkonnen-arena/maker/credits'
import { gradeAt } from '../src/shows/versions/harkonnen-arena/maker/grade'
import { END, T } from '../src/shows/versions/harkonnen-arena/maker/timeline'
import { SCENES } from '../src/shows/versions/harkonnen-arena/maker/scenes'
import type { MakerShow } from '../src/shows/versions/harkonnen-arena/maker/show'

type Check = (name: string, ok: boolean, detail?: string) => void

interface Data {
  onsets: { t: number; g: number }[]
  combs: Record<string, { beats: { t: number }[] }>
}
const data = measured as unknown as Data
const ONSETS = data.onsets.map((o) => o.t)
const BEATS = Object.values(data.combs).flatMap((c) => c.beats.map((b) => b.t))

export function checkMaker(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as MakerShow
  const cam = perf.camera!
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('maker: one take, Maker, Opus 5.5, with an about after the film and a still, and no note or byline',
    version.title === 'Maker' && version.label === 'Opus 5.5' && version.note === undefined && /Dune: Part Two/.test(version.about ?? '') &&
    typeof version.still === 'number' && !('director' in version))
  check('maker: the whole cue from zero, from WaterTower Music\'s upload only (no local file), credited to Hans Zimmer, the cue and the film, with the credits after it',
    near(perf.duration, END) && END > RECORDING + 20 && (perf.soundtrack?.offset ?? 0) === 0 && !perf.soundtrack?.src &&
    ['Hans Zimmer', 'Harkonnen Arena', 'Dune: Part Two'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === `https://www.youtube.com/watch?v=${YOUTUBE}` && YOUTUBE === 'UdlvgIFdNZU' && perf.soundtrack?.youtube?.length === 1 &&
    perf.soundtrack.youtube[0].id === YOUTUBE && (perf.soundtrack.youtube[0].from ?? 0) === 0 && (perf.soundtrack.youtube[0].at ?? 0) === 0)
  check('maker: no portal anywhere, and no cut drawn', [0, 40, 100, 150, 200, 250, 300, 340].every((t) => perf.cuts?.(t) === false))

  // The credits: the page's words, after the last chord, owing what is owed, gone before the end.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('maker: end credits after the music, set by the page, directed by Claude Opus 5.5, naming the cast, Hans Zimmer, the cue, Dune: Part Two, Denis Villeneuve, Frank Herbert and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.05).length === 0 && creditsAt(END).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join('|') === 'Claude Opus 5.5' &&
    ['Paul Atreides', 'Chani', 'Feyd-Rautha', 'Hans Zimmer', '“Harkonnen Arena”', 'Dune: Part Two', 'Denis Villeneuve', 'Frank Herbert', 'p5.js'].every((w) => said.includes(w)), said)
  check('maker: the credits keep the house floor on a phone and rise into the sky over the frame',
    creditsAt(CARDS[1].at + 2).every((c) => c.least === 4.5 && c.lift === 0.6))

  // The arc of light: the desert's own colours, the eclipse's infrared, Giedi Prime's black and white, the colour back.
  check('maker: the colour is the desert\'s until the eclipse, infrared under it, black and white on Giedi Prime, and back with the storm',
    [10, 100, 150].every((t) => gradeAt(t).ir === 0 && gradeAt(t).mono === 0) && gradeAt(M.silence - 1).ir > 0.9 &&
    [T.arena + 1, 220, T.charge - 1].every((t) => gradeAt(t).mono === 1) && [T.charge + 2, 300, END].every((t) => gradeAt(t).ir === 0 && gradeAt(t).mono === 0))

  // The scenes cover the show end to end, in order.
  const gaps = SCENES.slice(1).filter((s, i) => !near(s.from, SCENES[i].to))
  check('maker: the scenes are laid end to end from 0 to the end', SCENES[0].from === 0 && near(SCENES[SCENES.length - 1].to, END) && gaps.length === 0,
    gaps.map((s) => s.key).join(', '))

  // The strikes the story turns on, each on something the recording has.
  const onMusic = (t: number, tol = 0.03) => ONSETS.some((o) => Math.abs(o - t) <= tol) || BEATS.some((b) => Math.abs(b - t) <= tol)
  const strikes = SCENES.flatMap((s) => (s.strikes ?? []).map(([n, t]): [string, number] => [`${s.key}: ${n}`, t]))
  const off = strikes.filter(([, t]) => !onMusic(t))
  check('maker: every strike the story turns on lands on a measured onset or beat', off.length === 0, off.map(([n, t]) => `${n} ${t.toFixed(3)}`).join(', '))
  const cutsOff = show.cameraCuts.filter((t) => !onMusic(t, 0.04))
  check('maker: every camera cut lands on the music', cutsOff.length === 0, cutsOff.map((t) => t.toFixed(3)).join(', '))

  // Nothing jumps in shot: no ball moves more than a third of a cell in a 240th of a second, or comes or goes, in the
  // frame, except across a cut or a dissolve (the frame before is laid over it).
  const dissolves = SCENES.flatMap((s) => s.dissolves ?? [])
  const cutNear = (t: number) => show.cameraCuts.some((c) => Math.abs(c - t) < 0.01) || dissolves.some(([at, dur]) => t >= at - 0.01 && t <= at + dur)
  const inShot = (t: number, x: number, y: number) => {
    const f = cam(t)
    return Math.abs(x - f.x) < (f.cells * 16) / 9 / 2 + 0.2 && Math.abs(y - f.y) < f.cells / 2 + 0.2
  }
  const jumps: string[] = []
  const step = 1 / 240
  let prev = show.at(0).balls ?? []
  for (let t = step; t <= END; t += step) {
    const now = show.at(t).balls ?? []
    if (!cutNear(t)) {
      for (const b of now) {
        const p = prev.find((q) => q.id === b.id)
        if (p && Math.hypot(b.x - p.x, b.y - p.y) > 0.34 && inShot(t, b.x, b.y)) jumps.push(`${b.id} jumps at ${t.toFixed(3)}`)
        if (!p && (b.scale ?? 1) > 0.3 && inShot(t, b.x, b.y)) jumps.push(`${b.id} comes at ${t.toFixed(3)}`)
      }
      for (const p of prev) if (!now.some((b) => b.id === p.id) && (p.scale ?? 1) > 0.3 && inShot(t - step, p.x, p.y)) jumps.push(`${p.id} goes at ${t.toFixed(3)}`)
    }
    if (jumps.length > 12) break
    prev = now
  }
  check('maker: no ball jumps, comes or goes in shot, but across a cut or a dissolve', jumps.length === 0, jumps.slice(0, 12).join(', '))
}
