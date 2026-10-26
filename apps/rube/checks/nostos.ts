/**
 * The checks for Nostos: a bronze ball from the fall of Troy through the trials of the sea and seven years on Ogygia,
 * home to Ithaca, the bow and Penelope, on Ludwig Göransson's "Odysseus". Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/odysseus-onsets.json'
import { M, RECORDING, YOUTUBE } from '../src/shows/versions/odysseus/nostos/music'
import { CARDS, CREDITS_AT, CREDITS_OK, creditsAt } from '../src/shows/versions/odysseus/nostos/credits'
import { END, SEAMS } from '../src/shows/versions/odysseus/nostos/voyage'
import { AXES, HOME, SHUTTLE, TRIAL } from '../src/shows/versions/odysseus/nostos/scenes/ithaca/geo'
import { arrowPasses, axeTime } from '../src/shows/versions/odysseus/nostos/scenes/ithaca/rig'
import { HEAVES, THRUSTS } from '../src/shows/versions/odysseus/nostos/scenes/troy/horse'
import { SURGE } from '../src/shows/versions/odysseus/nostos/scenes/troy/host'
import { KILLS } from '../src/shows/versions/odysseus/nostos/scenes/troy/sack'
import { FIGHT } from '../src/shows/versions/odysseus/nostos/scenes/ithaca/battle'
import { WRECK_STRIKES } from '../src/shows/versions/odysseus/nostos/scenes/wreck'
import { FIRE, KNEEL } from '../src/shows/versions/odysseus/nostos/scenes/storm/island'
import type { NostosShow } from '../src/shows/versions/odysseus/nostos/show'

type Check = (name: string, ok: boolean, detail?: string) => void

const ONSETS = (measured as unknown as { onsets: { t: number; s: number }[] }).onsets.map((o) => o.t)
const BEATS = (measured as unknown as { beats: { t: number }[] }).beats.map((b) => b.t)

export function checkNostos(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as NostosShow
  const cam = perf.camera!
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('nostos: one take, Nostos, Opus 5.5, with an about after the film and a still, and no note or byline',
    version.title === 'Nostos' && version.label === 'Opus 5.5' && version.note === undefined && /The Odyssey/.test(version.about ?? '') &&
    typeof version.still === 'number' && !('director' in version))
  check('nostos: the whole cue from zero, from Back Lot Music\'s upload only (no local file), credited to Ludwig Göransson, the cue and the film, with the credits after it',
    near(perf.duration, END) && END > RECORDING + 20 && (perf.soundtrack?.offset ?? 0) === 0 && !perf.soundtrack?.src &&
    ['Ludwig Göransson', 'Odysseus', 'The Odyssey'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === `https://www.youtube.com/watch?v=${YOUTUBE}` && YOUTUBE === 'WCxx_OVOVUw' && perf.soundtrack?.youtube?.length === 1 &&
    perf.soundtrack.youtube[0].id === YOUTUBE && (perf.soundtrack.youtube[0].from ?? 0) === 0 && (perf.soundtrack.youtube[0].at ?? 0) === 0)
  check('nostos: no portal anywhere, and no cut drawn', [0, 40, 100, 200, 300, 400, 500, 540].every((t) => perf.cuts?.(t) === false))

  // The credits: the page's words, after the music has faded, owing what is owed, gone before the end.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('nostos: end credits in the fade and the quiet after it, set by the page, directed by Claude Opus 5.5, naming the cast, Ludwig Göransson, the cue, The Odyssey, Christopher Nolan and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.05).length === 0 && creditsAt(END).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join('|') === 'Claude Opus 5.5' &&
    ['Odysseus', 'Penelope', 'Telemachus', 'Ludwig Göransson', '“Odysseus”', 'The Odyssey', 'Christopher Nolan', 'p5.js'].every((w) => said.includes(w)), said)

  // The strikes the story turns on, each on something the recording has.
  const onOnset = (t: number, tol = 0.03) => ONSETS.some((o) => Math.abs(o - t) <= tol) || BEATS.some((b) => Math.abs(b - t) <= tol)
  const strikes: [string, number][] = [
    ['the boulder door', M.ground],
    ['the stake', M.swell],
    ['the pulse', M.pulse],
    ['the bolt', M.cut],
    ['Argos', HOME.dies],
    ['the bow sings', TRIAL.sing],
    ['the loose', TRIAL.loose],
    ['the arrow takes Antinous', TRIAL.strike],
    ['the host goes in', SURGE],
    ['Apollo\'s cow goes down', KNEEL[1]],
    ['the men\'s fire', FIRE.lit],
    ...HEAVES.map(([t], i): [string, number] => [`heave ${i}`, t]),
    ...THRUSTS.map((t, i): [string, number] => [`spear ${i}`, t]),
    ['they meet', TRIAL.meet],
    ...KILLS.street.map((t, i): [string, number] => [`a Trojan struck down in the street ${i}`, t]),
    ...KILLS.statue.map((t, i): [string, number] => [`a Trojan killed at Athena's feet ${i}`, t]),
    ...WRECK_STRIKES.under.map((t, i): [string, number] => [`his last men go under ${i}`, t]),
    ['the suitors charge', FIGHT.charge],
    ...FIGHT.first.map((t, i): [string, number] => [`the first blows ${i}`, t]),
    ['the son driven up the stairs', FIGHT.sonHit],
    ...FIGHT.rampage.map((t, i): [string, number] => [`down the hall ${i}`, t]),
    ['the last three thrown out', FIGHT.last],
    ...FIGHT.down.map((t, i): [string, number] => [`Penelope's step ${i}`, t]),
    ...SHUTTLE.map((t, i): [string, number] => [`shuttle ${i}`, t]),
    ...AXES.map((_, i): [string, number] => [`axe ${i}`, axeTime(i)]),
    ...TRIAL.climb.map((t, i): [string, number] => [`step ${i}`, t]),
    ...TRIAL.tries.map((t, i): [string, number] => [`try ${i}`, t]),
  ]
  const off = strikes.filter(([, t]) => !onOnset(t))
  check('nostos: every strike the story turns on lands on a measured onset or beat', off.length === 0, off.map(([n, t]) => `${n} ${t.toFixed(3)}`).join(', '))
  check('nostos: the arrow goes through the twelve eyes in order, east, between the loose and Antinous',
    AXES.every((x, i) => arrowPasses(x) > TRIAL.loose && (i === 0 || arrowPasses(x) > arrowPasses(AXES[i - 1]))) && arrowPasses(AXES[AXES.length - 1]) < TRIAL.strike)

  // The seams: where a scene hands the hero on at rest, he is there.
  const rests = SEAMS.filter((s) => s.hero).map((s) => {
    const [x, y] = show.where(s.t)
    return { t: s.t, d: Math.hypot(x - s.hero![0], y - s.hero![1]) }
  })
  check('nostos: at each seam where he is ashore, he is where the seam says', rests.every((r) => r.d < 0.02), rests.map((r) => `${r.t}: ${r.d.toFixed(3)}`).join(', '))

  // Nothing jumps in shot: the hero, the cast and the camera, except across a dissolve (the frame before is laid over it).
  const inShot = (t: number, x: number, y: number) => {
    const f = cam(t)
    return Math.abs(x - f.x) < (f.cells * 16) / 9 / 2 + 0.3 && Math.abs(y - f.y) < f.cells / 2 + 0.3
  }
  const dissolving = (t: number) => !!perf.blend?.(t) || !!perf.blend?.(t + 0.004)
  // A cut of the camera is film grammar, not a jump: allowed, and each on the music.
  const cutting = (t: number) => show.cameraCuts.some((c) => c > t - step - 1e-6 && c <= t + 1e-6)
  // A bare cut is struck on the music; a cut under a dissolve is a soft change of place and is held to nothing.
  const cutsOff = show.cameraCuts.filter((c) => !perf.blend?.(c + 0.01) && !onOnset(c, 0.04))
  check('nostos: every bare cut of the camera is on a measured onset or beat', cutsOff.length === 0, cutsOff.map((c) => c.toFixed(3)).join(', '))
  // Where someone leaves the stage behind something drawn over them: the Cyclops' fist closing on men 4 and 5.
  const covered: [number, number[]][] = [[161.6, [104, 105]]]
  const coveredAt = (t: number, id: number) => covered.some(([at, ids]) => ids.includes(id) && Math.abs(at - t) < 0.01)
  const step = 0.002
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
    if (!dissolving(t)) {
      const d = Math.hypot(here.x - prev.x, here.y - prev.y)
      if (d > heroJump && (inShot(t, here.x, here.y) || inShot(t - step, prev.x, prev.y))) { heroJump = d; heroAt = t }
      const dc = cutting(t) ? 0 : Math.hypot(f.x - prevCam.x, f.y - prevCam.y) / f.cells + Math.abs(Math.log(f.cells / prevCam.cells))
      if (dc > camJump) { camJump = dc; camAt = t }
      // The cast: nobody comes or goes in shot, or jumps there.
      const was = new Map((prev.balls ?? []).map((b) => [b.id, b]))
      const now = new Map((here.balls ?? []).map((b) => [b.id, b]))
      for (const a of cast) {
        const b0 = was.get(a.id)
        const b1 = now.get(a.id)
        if (!b0 && b1 && (b1.scale ?? 1) > 0.3 && inShot(t, b1.x, b1.y)) pops.push(`${a.id} in at ${t.toFixed(3)}`)
        if (b0 && !b1 && (b0.scale ?? 1) > 0.3 && inShot(t - step, b0.x, b0.y) && !coveredAt(t, a.id)) pops.push(`${a.id} out at ${t.toFixed(3)}`)
        if (b0 && b1 && Math.hypot(b1.x - b0.x, b1.y - b0.y) > 0.06 && (inShot(t, b1.x, b1.y) || inShot(t - step, b0.x, b0.y))) pops.push(`${a.id} jumps at ${t.toFixed(3)}`)
      }
    }
    prev = here
    prevCam = f
  }
  check('nostos: the hero never jumps in shot (no more than 0.05 cells in 2 ms) but across a dissolve', heroJump <= 0.05, `${heroJump.toFixed(3)} at ${heroAt.toFixed(3)} s`)
  check('nostos: the camera never jumps (no more than 1% of the frame in 2 ms) but at a cut or across a dissolve', camJump <= 0.01, `${camJump.toFixed(4)} at ${camAt.toFixed(3)} s`)
  check('nostos: no one comes, goes or jumps in shot', pops.length === 0, pops.slice(0, 10).join(', '))
}
