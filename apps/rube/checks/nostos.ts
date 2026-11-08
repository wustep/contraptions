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
import { skyAt } from '../src/shows/versions/odysseus/nostos/world/sky'
import { layer } from '../src/shows/versions/odysseus/nostos/world/depth'
import { frameH } from '../src/shows/versions/odysseus/nostos/draw'
import { atLoom, shedAt } from '../src/shows/versions/odysseus/nostos/scenes/ithaca/loom'

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

  // The light changes with the camera at a bare cut, never a frame before it or after it: no frame shows one shot in
  // the other's light (the dead's light came on 20 ms before the cut to their shore). The bolt's flash is the one light
  // that comes up after its cut, over its first frames, by design; but not before it.
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const lightStep = (a: number, b: number) => {
    const A = skyAt(a)
    const B = skyAt(b)
    return Math.max(...(['top', 'low', 'far', 'near', 'body', 'lit'] as const).flatMap((k) => hex(A[k]).map((v, i) => Math.abs(v - hex(B[k])[i]))))
  }
  const lightOff = show.cameraCuts.filter((c) => !perf.blend?.(c + 0.01)).flatMap((c) => {
    const before = lightStep(c - 1 / 60, c - 1e-4)
    const after = Math.abs(c - M.cut) < 1e-3 ? 0 : lightStep(c + 1e-4, c + 1 / 60)
    return before > 3 || after > 3 ? [`${c.toFixed(3)} (${before} before, ${after} after)`] : []
  })
  check('nostos: the light never changes in the frame before or after a bare cut', lightOff.length === 0, lightOff.join(', '))

  // The loom's heddle turns over between passes; it never jumps across the warp from one frame to the next.
  let shedJump = 0
  let shedAt0 = 0
  for (let t = 0; t + 1 / 60 < perf.duration && atLoom(t + 1 / 60); t += 1 / 240) {
    const d = Math.abs(shedAt(t + 1 / 60) - shedAt(t))
    if (d > shedJump) { shedJump = d; shedAt0 = t }
  }
  check('nostos: the loom\'s heddle never moves more than a third of its swing in a frame', shedJump <= 0.008, `${shedJump.toFixed(4)} at ${shedAt0.toFixed(3)} s`)

  // A stage taller than 16:9 sees more round the same frame through the same lens: the discs and far layers keep the
  // size they have against the world (on a portrait phone they were drawn three and four times too big).
  const wide = { x0: -8.9, x1: 8.9, y0: -5, y1: 5, cx: 0, cy: 0, h: 10 }
  const tall = { x0: -8.9, x1: 8.9, y0: -21, y1: 21, cx: 0, cy: 0, h: 42 }
  check('nostos: the lens and the sky\'s discs go by the composed frame, not the stage, so a tall phone draws far things their size',
    Math.abs(frameH(tall) - frameH(wide)) < 0.02 && Math.abs(layer(tall, 30).s - layer(wide, 30).s) < 1e-3 && Math.abs(layer(tall, 120).s - layer(wide, 120).s) < 1e-3,
    `frameH ${frameH(wide).toFixed(2)} / ${frameH(tall).toFixed(2)}, s(30) ${layer(wide, 30).s.toFixed(3)} / ${layer(tall, 30).s.toFixed(3)}`)
  check('nostos: the camera never jumps (no more than 1% of the frame in 2 ms) but at a cut or across a dissolve', camJump <= 0.01, `${camJump.toFixed(4)} at ${camAt.toFixed(3)} s`)
  check('nostos: no one comes, goes or jumps in shot', pops.length === 0, pops.slice(0, 10).join(', '))
}
