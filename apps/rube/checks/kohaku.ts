/**
 * The checks for Kohaku: Joe Hisaishi's "One Summer's Day", from Spirited Away, as a Rube Goldberg machine with a rose
 * ball for Chihiro, from the tunnel to the bathhouse, the dragon, the train over the water and his name. Called by
 * `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/kohaku-onsets.json'
import { M, RECORDING, YOUTUBE } from '../src/shows/versions/one-summers-day/kohaku/music'
import { CARDS, CREDITS_AT, CREDITS_OK, END, creditsAt } from '../src/shows/versions/one-summers-day/kohaku/credits'
import { LAMP_AT, STEP_LANDS, STONE_LANDS } from '../src/shows/versions/one-summers-day/kohaku/scenes/way'
import { SHUT, SLAMS } from '../src/shows/versions/one-summers-day/kohaku/scenes/dragon/birds'
import { JERKS } from '../src/shows/versions/one-summers-day/kohaku/scenes/dragon/flight'
import { BURST } from '../src/shows/versions/one-summers-day/kohaku/scenes/sky'
import { PART, STONE_LANDS as HOME_STONES } from '../src/shows/versions/one-summers-day/kohaku/scenes/home'
import { SCENES } from '../src/shows/versions/one-summers-day/kohaku/scenes'
import * as BATHHOUSE from '../src/shows/versions/one-summers-day/kohaku/scenes/bathhouse/beats'
import { STEPS } from '../src/shows/versions/one-summers-day/kohaku/scenes/train'
import { ARRIVE_LONELY, ARRIVE_SWAMP, BOARD, LAMP_BACK, LAMP_OUT } from '../src/shows/versions/one-summers-day/kohaku/scenes/train/plan'
import type { KohakuShow } from '../src/shows/versions/one-summers-day/kohaku/show'

type Check = (name: string, ok: boolean, detail?: string) => void

const ONSETS = (measured as unknown as { onsets: { t: number; s: number }[] }).onsets.map((o) => o.t)
const EIGHTHS = (measured as unknown as { beats: { t: number }[] }).beats.map((b) => b.t)

export function checkKohaku(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as KohakuShow
  const cam = perf.camera!
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('kohaku: one take, Kohaku, Opus 5.5, with an about after the film and a still, and no note or byline',
    version.title === 'Kohaku' && version.label === 'Opus 5.5' && version.note === undefined && /Spirited Away/.test(version.about ?? '') &&
    typeof version.still === 'number' && !('director' in version))
  check('kohaku: the whole cue from zero, from Joe Hisaishi\'s own upload only (no local file), credited to him, the cue and the film, with the credits after it',
    near(perf.duration, END) && END > RECORDING && (perf.soundtrack?.offset ?? 0) === 0 && !perf.soundtrack?.src &&
    ['Joe Hisaishi', 'One Summer’s Day', 'Spirited Away'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === `https://www.youtube.com/watch?v=${YOUTUBE}` && YOUTUBE === 'TK1Ij_-mank' && perf.soundtrack?.youtube?.length === 1 &&
    perf.soundtrack.youtube[0].id === YOUTUBE && (perf.soundtrack.youtube[0].from ?? 0) === 0 && (perf.soundtrack.youtube[0].at ?? 0) === 0)
  check('kohaku: no portal anywhere, and no cut drawn', [0, 40, 100, 150, 200, 250].every((t) => perf.cuts?.(t) === false))

  // The scenes: end to end, in order, covering the show.
  const gaps = SCENES.slice(1).filter((s, i) => !near(s.from, SCENES[i].to))
  check('kohaku: the scenes are laid end to end from 0 to the end', near(SCENES[0].from, 0) && near(SCENES[SCENES.length - 1].to, END) && gaps.length === 0,
    gaps.map((s) => s.key).join(', '))

  // The credits: the page's words, after the music has faded, owing what is owed, gone before the end.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('kohaku: end credits in the fade and the quiet after it, set by the page, directed by Claude Opus 5.5, naming the cast, Joe Hisaishi, the cue, Spirited Away, Hayao Miyazaki and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.05).length === 0 && creditsAt(END).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join('|') === 'Claude Opus 5.5' &&
    ['Chihiro', 'Haku', 'No-Face', 'Joe Hisaishi', '“One Summer’s Day”', 'Spirited Away', 'Hayao Miyazaki', 'p5.js'].every((w) => said.includes(w)), said)
  check('kohaku: every credit card keeps the phone floor, and goes all the way up into a tall stage\'s sky', creditsAt(CARDS[1].at + 2).every((c) => c.least === 4.5 && c.lift === 1))

  // The strikes the story turns on, each on something the recording has.
  const onMusic = (t: number, tol = 0.03) => ONSETS.some((o) => Math.abs(o - t) <= tol) || EIGHTHS.some((b) => Math.abs(b - t) <= tol)
  const strikes: [string, number][] = [
    ['she comes up out of the tunnel', M.chord1],
    ['out into the sun', M.chord2],
    ['the wind pulls into the tunnel', M.chord3],
    ['on to the brow', M.chord4],
    ...STONE_LANDS.map((t, i): [string, number] => [`stone ${i}`, t]),
    ...STEP_LANDS.map((t, i): [string, number] => [`step ${i}`, t]),
    ...LAMP_AT.map((t, i): [string, number] => [`lantern ${i}`, t]),
    ['Haku sets off to her', BATHHOUSE.HAKU_GO],
    ['they set off over the bridge', BATHHOUSE.SET_OFF],
    ['the spirit heaves into the tub', BATHHOUSE.HEAVE],
    ['the treadle and the token', BATHHOUSE.TREADLE],
    ['Kamaji catches it', BATHHOUSE.CATCH],
    ['the drawer', BATHHOUSE.DRAWER],
    ...BATHHOUSE.COAL.map((t, i): [string, number] => [`coal ${i}`, t]),
    ['the tub floods', BATHHOUSE.FLOOD],
    ['the hook takes the thorn', BATHHOUSE.HOOK],
    ...BATHHOUSE.PULLS.map((t, i): [string, number] => [`haul ${i}`, t]),
    ['the thorn comes free', BATHHOUSE.FREE],
    ...BATHHOUSE.JUNK.map((t, i): [string, number] => [`junk ${i}`, t]),
    ['the clean spirit rises', BATHHOUSE.RISE],
    ['and goes', BATHHOUSE.AWAY],
    ['the dragon in at her door', M.peak],
    ['the shutter', SHUT],
    ...SLAMS.map((t, i): [string, number] => [`paper bird ${i} on the shutter`, t]),
    ...JERKS.map((t, i): [string, number] => [`he jerks ${i}`, t]),
    ...STEPS.map(([t], i): [string, number] => [`a step on the water ${i}`, t]),
    ['the train in at the lonely station', ARRIVE_LONELY],
    ['the train in at Swamp Bottom', ARRIVE_SWAMP],
    ...LAMP_OUT.map((t, i): [string, number] => [`the lamp's hop out ${i}`, t]),
    ...LAMP_BACK.map((t, i): [string, number] => [`the lamp's hop back ${i}`, t]),
    ['she is on his back', BOARD],
    ['his name: the scales', BURST.at],
    ['they part', PART],
    ...HOME_STONES.map((t, i): [string, number] => [`home stone ${i}`, t]),
  ]
  const off = strikes.filter(([, t]) => !onMusic(t))
  check('kohaku: every strike the story turns on lands on a measured onset or eighth', off.length === 0, off.map(([n, t]) => `${n} ${t.toFixed(3)}`).join(', '))

  // Every ball's way is one piece: each move begins where and when the last ended.
  const paths = [show.hero, ...show.cast]
  // A seam while the ball is off the stage is no tear: it was elsewhere, unseen.
  const onStage = (a: (typeof paths)[number], t: number) => (a.on ? a.on(t) : true)
  const torn = paths.flatMap((a) => a.path.seams()
    .filter(([t, d]) => d > 0.02 && onStage(a, t - 0.01) && onStage(a, t + 0.01) && !show.cameraCuts.some((c) => Math.abs(c - t) < 0.02) && !perf.blend?.(t + 0.01))
    .map(([t, d]) => `${a.path.name} ${t.toFixed(3)} (${d.toFixed(3)})`))
  check('kohaku: no ball\'s way is torn while it is on the stage, but at a cut or under a dissolve', torn.length === 0, torn.slice(0, 8).join(', '))

  // A look turns a still or carried ball's mark; on a rolling ball it would slide the mark against the roll.
  const rolling: string[] = []
  for (const l of show.looks) {
    const a = l.id === show.hero.id ? show.hero : show.cast.find((c) => c.id === l.id)
    if (!a) { rolling.push(`${l.id}: no such ball`); continue }
    for (let t = l.from; t <= l.to; t += 0.05) {
      const m = a.path.moveAt(t)
      if (m.kind !== 'roll') continue
      const p0 = a.path.where(t)
      const p1 = a.path.where(t + 0.05)
      if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.005) { rolling.push(`${a.path.name} ${t.toFixed(2)}`); break }
    }
  }
  check('kohaku: every look is on a ball that is still or carried, never one rolling', rolling.length === 0, rolling.join(', '))

  // Nothing jumps in shot: her, the cast and the camera, except at a cut or across a dissolve.
  const step = 0.002
  const inShot = (t: number, x: number, y: number) => {
    const f = cam(t)
    return Math.abs(x - f.x) < (f.cells * 16) / 9 / 2 + 0.3 && Math.abs(y - f.y) < f.cells / 2 + 0.3
  }
  const dissolving = (t: number) => !!perf.blend?.(t) || !!perf.blend?.(t + 0.004)
  const cutting = (t: number) => show.cameraCuts.some((c) => c > t - step - 1e-6 && c <= t + 1e-6)
  const cutsOff = show.cameraCuts.filter((c) => !perf.blend?.(c + 0.01) && !onMusic(c, 0.04))
  check('kohaku: every bare cut of the camera is on a measured onset or eighth', cutsOff.length === 0, cutsOff.map((c) => c.toFixed(3)).join(', '))
  let heroJump = 0
  let heroAt = 0
  let camJump = 0
  let camAt = 0
  const pops: string[] = []
  const cast = [show.hero, ...show.cast]
  let prev = show.at(0)
  let prevCam = cam(0)
  for (let t = step; t <= perf.duration; t += step) {
    const here = show.at(t)
    const f = cam(t)
    if (!dissolving(t) && !cutting(t)) {
      const d = Math.hypot(here.x - prev.x, here.y - prev.y)
      if (d > heroJump && (inShot(t, here.x, here.y) || inShot(t - step, prev.x, prev.y))) { heroJump = d; heroAt = t }
      const dc = Math.hypot(f.x - prevCam.x, f.y - prevCam.y) / f.cells + Math.abs(Math.log(f.cells / prevCam.cells))
      if (dc > camJump) { camJump = dc; camAt = t }
      const was = new Map((prev.balls ?? []).map((b) => [b.id, b]))
      const now = new Map((here.balls ?? []).map((b) => [b.id, b]))
      for (const a of cast) {
        const b0 = was.get(a.id)
        const b1 = now.get(a.id)
        if (!b0 && b1 && (b1.scale ?? 1) > 0.3 && inShot(t, b1.x, b1.y)) pops.push(`${a.id} in at ${t.toFixed(3)}`)
        if (b0 && !b1 && (b0.scale ?? 1) > 0.3 && inShot(t - step, b0.x, b0.y)) pops.push(`${a.id} out at ${t.toFixed(3)}`)
        if (b0 && b1 && Math.hypot(b1.x - b0.x, b1.y - b0.y) > 0.06 && (inShot(t, b1.x, b1.y) || inShot(t - step, b0.x, b0.y))) pops.push(`${a.id} jumps at ${t.toFixed(3)}`)
      }
    }
    prev = here
    prevCam = f
  }
  check('kohaku: she never jumps in shot (no more than 0.05 cells in 2 ms) but at a cut or across a dissolve', heroJump <= 0.05, `${heroJump.toFixed(3)} at ${heroAt.toFixed(3)} s`)
  check('kohaku: the camera never jumps (no more than 1% of the frame in 2 ms) but at a cut or across a dissolve', camJump <= 0.01, `${camJump.toFixed(4)} at ${camAt.toFixed(3)} s`)
  check('kohaku: no one comes, goes or jumps in shot', pops.length === 0, pops.slice(0, 10).join(', '))
}
