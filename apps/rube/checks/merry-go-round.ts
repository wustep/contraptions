/**
 * The checks for Merry-Go-Round: Sophie through the hatter's town, the wastes, the castle's room and the flower
 * fields, on the recording's own onsets and tracked beats. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/merry-go-round-onsets.json'
import { STRIKES } from '../src/shows/versions/merry-go-round/howl/hits'
import { BEATS, CHORD, CREDITS_AT, CURSE, DURATION, HEART, ONSETS, RECORDING, SEAM, downbeats } from '../src/shows/versions/merry-go-round/howl/music'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/merry-go-round/howl/credits'
import { age, sophieAt } from '../src/shows/versions/merry-go-round/howl/age'
import { SOPHIE_SILVER } from '../src/shows/versions/merry-go-round/howl/worlds'
import type { CastleShow } from '../src/shows/versions/merry-go-round/howl/show'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkMerryGoRound(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as CastleShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('merry-go-round: one take, Merry-Go-Round, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Merry-Go-Round' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('merry-go-round: the whole recording from zero, credited to Joe Hisaishi and the film, played from the label\'s upload, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 20 &&
    !!perf.soundtrack?.src?.includes('merry-go-round-demo') &&
    ['Joe Hisaishi', 'Merry-Go-Round of Life', 'Howl’s Moving Castle'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=f7SS57LFPco' && perf.soundtrack?.youtube?.[0]?.id === 'f7SS57LFPco')

  // The places, in the order the story goes, each cut on the recording.
  const order = show.legs.map((l) => l.world).join(',')
  check('merry-go-round: the town, the town at night, the wastes, the room, the flowers, the town at war, the room, the wastes',
    order === 'town,town,wastes,room,flowers,town,room,wastes', order)
  const onsets = ONSETS
  const onBeat = (t: number, eps: number) => BEATS.some((b) => Math.abs(b.t - t) <= eps)
  const onOnset = (t: number, eps: number, min = 0.2) => onsets.some((o) => o.s >= min && Math.abs(o.t - t) <= eps)
  const cuts = show.legs.slice(1).map((l) => l.from)
  const seams = Object.values(SEAM)
  const offSeam = seams.filter((t) => !onOnset(t, 0.02, 0.3) && !onBeat(t, 0.02))
  check('merry-go-round: every seam and every cut is on a measured onset or a tracked beat',
    offSeam.length === 0 && cuts.length === 7 && cuts.every((c) => seams.some((s) => near(s, c, 1e-3))), offSeam.map((t) => t.toFixed(3)).join(', '))
  check('merry-go-round: no portal anywhere, and no cut drawn', [0, 50, 85.8, 108, 152, 178.1, 206, 237, 244, 300].every((t) => perf.cuts?.(t) === false))

  // One ball, one path: in a place it never jumps; at a cut the camera carries it, so on the screen it holds still.
  const cam = perf.camera!
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
  check('merry-go-round: inside a place the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('merry-go-round: every cut is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // Every strike lands on something the recording has: a measured onset, or a tracked beat of a stretch with a pulse.
  const within = (t: number) => onOnset(t, 0.04) || onBeat(t, 0.03)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('merry-go-round: every strike lands on a measured onset or a tracked beat', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const quiet = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('merry-go-round: every part strikes', quiet.length === 0, `no strikes yet: ${quiet.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number, eps = 0.03) => all.some((s) => Math.abs(s - t) <= eps)
  const cover = (ts: number[]) => ({ n: ts.filter((t) => hit(t)).length, of: ts.length })
  const sky = cover(downbeats('waltz', 1, 32))
  const castle = cover(downbeats('waltz', 65, 88))
  const climax = cover(downbeats('climax', 1, 37))
  const finale = cover(downbeats('finale', 1, 6))
  check('merry-go-round: the walk on the air lands a step on most of the waltz\'s downbeats (bars 1 to 32)', sky.n >= sky.of * 0.75, `${sky.n}/${sky.of}`)
  check('merry-go-round: the castle\'s feet land on most of the waltz\'s downbeats while it walks (bars 65 to 88)', castle.n >= castle.of * 0.8, `${castle.n}/${castle.of}`)
  check('merry-go-round: the collapse and the plank strike most of the climax\'s downbeats (bars 1 to 37)', climax.n >= climax.of * 0.75, `${climax.n}/${climax.of}`)
  check('merry-go-round: the last tutti\'s downbeats are struck', finale.n === finale.of, `${finale.n}/${finale.of}`)
  check('merry-go-round: the curse, the slow waltz\'s hit, the climax, the heart and the last chord are struck',
    [CURSE, SEAM.field, SEAM.plank, HEART, CHORD[0]].every((t) => hit(t)), [CURSE, SEAM.field, SEAM.plank, HEART, CHORD[0]].filter((t) => !hit(t)).map((t) => t.toFixed(3)).join(', '))

  // Under Zoom (half as close again as the show's camera) the ball stays in the frame wherever it is to be seen.
  const outOfZoom: string[] = []
  for (let t = 0; t <= perf.duration; t += 0.05) {
    const h = show.at(t)
    if (h.hidden || h.scale < 0.3) continue
    const f = cam(t)
    const cells = f.cells / 1.5
    const u = Math.max(Math.abs(h.x - f.x) / ((cells * 16) / 9 / 2), Math.abs(h.y - f.y) / (cells / 2))
    if (u > 1) outOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
  }
  check('merry-go-round: under Zoom the ball never leaves the frame', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('merry-go-round: the ball is never hidden for more than 2 s', longest <= 2, `${longest.toFixed(2)} s`)

  // Howl and Markl: each only in their own parts' spans, never jumping, coming and going only out of shot or at a cut.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  }
  for (const who of ['howl', 'markl'] as const) {
    const get = (t: number) => (who === 'howl' ? show.howl(t) : show.markl(t))
    let worst = 0
    let worstAt = 0
    let pops: string[] = []
    let last = get(0)
    let lastLeg = show.owner(0)
    for (let t = 0.005; t <= perf.duration; t += 0.005) {
      const b = get(t)
      const leg = show.owner(t)
      const changed = leg !== lastLeg
      if (b && last && !changed) {
        const d = Math.hypot(b.x - last.x, b.y - last.y)
        if (d > worst) { worst = d; worstAt = t }
      }
      if (!changed && !!b !== !!last && (inShot(t, b) || inShot(t - 0.005, last))) pops.push(t.toFixed(3))
      last = b
      lastLeg = leg
    }
    pops = pops.slice(0, 6)
    check(`merry-go-round: ${who} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`merry-go-round: ${who} only comes and goes out of shot, or at a cut`, pops.length === 0, pops.join(', '))
  }
  const counts = [45, 70, 160, 190, 220, 280, 310].map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0).map((b) => b.id))
  check('merry-go-round: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))
  check('merry-go-round: Howl is not in the town at dawn, nor in the hat shop at night, nor up the hills',
    [5, 30, 90, 100, 112, 118].every((t) => !show.howl(t)))

  // Sophie's age is her colour: young until the curse, old from it, younger among the flowers, silver at the end.
  check('merry-go-round: Sophie is young until the curse, old after it, younger among the flowers, and bright silver once the heart is given back',
    age(CURSE - 1) === 0 && age(110) === 1 && age(195) < 0.5 && age(186) > age(195) && sophieAt(HEART + 3).toLowerCase() === SOPHIE_SILVER.toLowerCase() && sophieAt(DURATION).toLowerCase() === SOPHIE_SILVER.toLowerCase() &&
    show.at(20).ball.color !== show.at(120).ball.color)

  // The end credits: words the page sets over the sky after the last chord, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('merry-go-round: end credits after the last chord, set by the page, opening on Directed by Claude Opus 5.5 and naming Sophie, Howl, Calcifer, Joe Hisaishi, the song, the film, Miyazaki, Studio Ghibli, Diana Wynne Jones and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT > CHORD[2] && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Sophie', 'Howl', 'Calcifer', 'Joe Hisaishi', 'Merry-Go-Round of Life', 'Howl’s Moving Castle', 'Hayao Miyazaki', 'Studio Ghibli', 'Diana Wynne Jones', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo|Stephen Wu/i.test(said), said)

  // The measured file is the one the parts were timed to.
  const m = measured as { duration: number; youtube: string }
  check('merry-go-round: the onsets file is this recording\'s', near(m.duration, RECORDING, 1e-9) && m.youtube === 'f7SS57LFPco' && Math.abs(RECORDING - 311.211) < 0.01)
}
