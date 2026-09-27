/**
 * The checks for Palindrome: Louise from the lake house to the shell, through the language and the world's breaking
 * and its mending, and back to the lake house, on the recording's own beats, chords and onsets. Called by
 * `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/nature-of-daylight-onsets.json'
import { STRIKES } from '../src/shows/versions/nature-of-daylight/palindrome/hits'
import { ARRIVAL, BEATS, BLAST, CALL, CHORDS, CREDITS_AT, DURATION, HALF, LAST, ONSETS, PEAK, RECORDING, RELEASE, SEAM, SILENT, SWELL, TONIC, TURN, beats } from '../src/shows/versions/nature-of-daylight/palindrome/music'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/nature-of-daylight/palindrome/credits'
import { PUNCHES, VEILED, veilAt } from '../src/shows/versions/nature-of-daylight/palindrome/score'
import { FIRST, HANNAH_BY, SEAMS } from '../src/shows/versions/nature-of-daylight/palindrome/seams'
import type { PalindromeShow } from '../src/shows/versions/nature-of-daylight/palindrome/show'
import { HANNAH_AGE } from '../src/shows/versions/nature-of-daylight/palindrome/worlds'
import { GONE, TV_SHELL } from '../src/shows/versions/nature-of-daylight/palindrome/house/house'
import { SHELL_CUT, SHELL_DOWN, SHELL_UP, shellAt } from '../src/shows/versions/nature-of-daylight/palindrome/valley/valley'
import { FALLS, RISES } from '../src/shows/versions/nature-of-daylight/palindrome/twelve/twelve'
import { R } from '../src/parts'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkPalindrome(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as PalindromeShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check('palindrome: one take, Palindrome, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Palindrome' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('palindrome: the whole recording from zero, credited to Max Richter and the film, played from the label\'s upload, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 20 &&
    !!perf.soundtrack?.src?.includes('nature-of-daylight-demo') &&
    ['Max Richter', 'On the Nature of Daylight', 'Arrival'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=rVN1B-tUpgs' && perf.soundtrack?.youtube?.[0]?.id === 'rVN1B-tUpgs')

  // The places, in the order the story goes, each cut on a chord.
  const order = show.legs.map((l) => l.world).join(',')
  check('palindrome: the lake house (dawn, the swing, the bed, the news), the valley, the shell, the tent, the shell, the fog, the lake house, the fog, the gala, the tent, the valley, the lake house',
    order === 'house,house,house,house,valley,shell,tent,shell,fog,house,fog,gala,tent,valley,house', order)
  const onBeat = (t: number, eps: number) => BEATS.some((b) => Math.abs(b.t - t) <= eps)
  const onChord = (t: number, eps: number) => CHORDS.some((c) => Math.abs(c.t - t) <= eps)
  const onOnset = (t: number, eps: number, min = 0.2) => ONSETS.some((o) => o.s >= min && Math.abs(o.t - t) <= eps)
  const cuts = show.legs.slice(1).map((l) => l.from)
  const seams = Object.values(SEAM)
  check('palindrome: every cut between places is on a change of chord',
    cuts.length === 14 && cuts.every((c) => seams.some((s) => near(s, c, 1e-3))) && seams.every((s) => onChord(s, 1e-3)), cuts.map((t) => t.toFixed(3)).join(', '))
  check('palindrome: no portal anywhere, and no cut drawn', [0, 30, 100, 150, 210, 240, 270, 300, 330, 380].every((t) => perf.cuts?.(t) === false))

  // One ball, one path: in a place it never jumps; at a cut the camera carries it, so on the screen it holds still
  // (all but the cut on the shell, which carries the shell instead).
  const onScreen = (t: number): [number, number] => {
    const h = show.at(t)
    const f = cam(t)
    return [(h.x - f.x) / f.cells, (h.y - f.y) / f.cells]
  }
  let jump = 0
  let jumpAt = 0
  let screen = 0
  let screenAt = 0
  let prev = show.where(0)
  let prevLeg = show.owner(0)
  let prevS = onScreen(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const leg = show.owner(t)
    if (leg === prevLeg) {
      const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
      if (d > jump) { jump = d; jumpAt = t }
    }
    const s = onScreen(t)
    const cutHere = show.cameraCuts.some((c) => c > t - 0.001 - 1e-9 && c <= t + 1e-9) || (t > ARRIVAL - 1e-9 && t - 0.001 < ARRIVAL + 1e-9)
    const ds = cutHere ? 0 : Math.hypot(s[0] - prevS[0], s[1] - prevS[1])
    if (ds > screen) { screen = ds; screenAt = t }
    prev = here
    prevLeg = leg
    prevS = s
  }
  check('palindrome: inside a place the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('palindrome: every cut is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // The cut on the shell: the television's picture of it and the real one, the same size in the same place on the
  // screen, on the double bass.
  const fa = cam(ARRIVAL - 1e-4)
  const fb = cam(ARRIVAL + 1e-4)
  const sa = [(TV_SHELL.c[0] - fa.x) / fa.cells, (TV_SHELL.c[1] - fa.y) / fa.cells, TV_SHELL.h / fa.cells]
  const sb = [(SHELL_CUT.c[0] - fb.x) / fb.cells, (SHELL_CUT.c[1] - fb.y) / fb.cells, SHELL_CUT.h / fb.cells]
  const real = shellAt(ARRIVAL)
  check('palindrome: on the double bass the television\'s shell becomes the real one, the same size in the same place on the screen, and big in it',
    Math.hypot(sa[0] - sb[0], sa[1] - sb[1]) < 0.005 && Math.abs(sa[2] - sb[2]) < 0.005 && sa[2] > 0.25 && Math.hypot(real.c[0] - SHELL_CUT.c[0], real.c[1] - SHELL_CUT.c[1]) < 1e-3 && near(real.h, SHELL_CUT.h, 1e-3),
    `${sa.map((v) => v.toFixed(3)).join(',')} vs ${sb.map((v) => v.toFixed(3)).join(',')}`)

  // A palindrome: the shell goes up into the cloud the way it came down out of it, backwards; and the twelve links
  // stand again in the order they fell, backwards.
  const down = SHELL_DOWN[1] - SHELL_DOWN[0]
  const up = SHELL_UP[1] - SHELL_UP[0]
  let mirror = 0
  for (let u = 0; u <= 1.0001; u += 0.02) {
    const a = shellAt(SHELL_DOWN[0] + u * down)
    const b = shellAt(SHELL_UP[1] - u * up)
    mirror = Math.max(mirror, Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]) + Math.abs(a.h - b.h))
  }
  check('palindrome: the shell goes up the way it came down (on the television from the half cadence, then over the valley): its path out is its path in, backwards, and it is gone when the high violins stop',
    down > 3 && Math.abs(up - down) < 0.5 && mirror < 1e-3 && near(SHELL_DOWN[0], HALF, 1e-3) && Math.abs(SHELL_UP[1] - RELEASE) < 0.05,
    `in ${down.toFixed(2)} s, out ${up.toFixed(2)} s, off by ${mirror.toFixed(4)}`)
  const fallOrder = [...FALLS].sort((a, b) => a.t - b.t).map((f) => f.screen)
  const riseOrder = [...RISES].sort((a, b) => a.t - b.t).map((f) => f.screen)
  check('palindrome: the twelve links fall one by one after the bass drops out and stand again at the call in the reverse order, the ring whole on the loudest bar',
    FALLS.length === 11 && RISES.length === 11 && riseOrder.join() === [...fallOrder].reverse().join() &&
    FALLS.every((f) => f.t > TURN - 1e-3 && f.t < SEAM.bomb) && RISES.every((r) => r.t >= CALL - 1e-3 && r.t <= PEAK + 1e-3) && RISES.some((r) => near(r.t, PEAK, 0.05)),
    `fell ${fallOrder.join(' ')}; rose ${riseOrder.join(' ')}`)

  // Every strike lands on something the recording has: a beat, a change of chord, or a measured onset.
  const within = (t: number) => onBeat(t, 0.04) || onChord(t, 0.04) || onOnset(t, 0.04)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('palindrome: every strike lands on a beat, a change of chord, or a measured onset', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const quiet = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('palindrome: every part strikes', quiet.length === 0, `no strikes yet: ${quiet.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number, eps = 0.04) => all.some((s) => Math.abs(s - t) <= eps)
  const changes = CHORDS.filter((c) => c.t < SILENT)
  const struckChords = changes.filter((c) => hit(c.t))
  check('palindrome: nearly every change of chord makes something happen (nine in ten)', struckChords.length >= changes.length * 0.9,
    `${struckChords.length}/${changes.length}; missed ${changes.filter((c) => !hit(c.t)).map((c) => c.t.toFixed(2)).slice(0, 10).join(', ')}`)
  const loud = beats(CALL - 0.01, RELEASE + 0.01)
  const loudHit = loud.filter((t) => hit(t))
  check('palindrome: the loudest eight bars strike most of their beats (three in four)', loudHit.length >= loud.length * 0.75, `${loudHit.length}/${loud.length}`)
  const marks: [string, number][] = [['Hannah goes, on the swell', SWELL], ['the double bass', ARRIVAL], ['the turn', TURN], ['the blast', BLAST], ['the call', CALL], ['the loudest bar', PEAK], ['the shell gone', RELEASE], ['the last B-flat', TONIC], ['the last chord\'s attack', LAST]]
  const unmarked = marks.filter(([, t]) => !hit(t, 0.03)).map(([w]) => w)
  check('palindrome: the story\'s moments are struck on the music\'s', unmarked.length === 0, unmarked.join(', '))

  // The camera cuts inside a place only on a strike, and otherwise never whips.
  const cameraCuts = show.cameraCuts
  const offStrike = cameraCuts.filter((c) => !all.some((s) => Math.abs(s - c) <= 0.005))
  check('palindrome: the camera cuts inside a place only on a strike', offStrike.length === 0, `${cameraCuts.length} cuts${offStrike.length ? `; off: ${offStrike.map((c) => c.toFixed(3)).join(', ')}` : ''}`)
  let whip = 0
  let whipAt = 0
  const ZDT = 1 / 120
  for (let t = ZDT; t <= perf.duration; t += ZDT) {
    if (show.owner(t) !== show.owner(t - ZDT)) continue
    if (cameraCuts.some((c) => c > t - ZDT && c <= t + 1e-9)) continue
    if (PUNCHES.some(([at]) => t >= at - 0.01 && t <= at + 0.15)) continue
    const z = Math.abs(Math.log(cam(t).cells / cam(t - ZDT).cells)) / ZDT
    if (z > whip) { whip = z; whipAt = t }
  }
  check('palindrome: the camera never whips: its zoom under 0.6 of a scale a second but for its punches and its cuts', whip <= 0.6, `${whip.toFixed(2)} log/s at ${whipAt.toFixed(2)} s`)

  // The white-out: white at its cut, and nowhere else.
  check('palindrome: the blast\'s dust goes to white at the cut into the fog, and only there',
    VEILED.length === 1 && near(VEILED[0], SEAM.fog) && veilAt(SEAM.fog).a > 0.99 && [5, 100, 150, 210, 223, 260, 300, 350].every((t) => veilAt(t).a === 0))

  // The circle: the show's last frame is its first. From the last B-flat to the end the camera is on FIRST, Louise
  // where she was, baby Hannah in the cradle where she was.
  const f0 = cam(0)
  const s0 = onScreen(0)
  const h0 = show.hannah(0)
  let drift = 0
  for (let t = TONIC + 1; t <= perf.duration; t += 0.25) {
    const f = cam(t)
    const s = onScreen(t)
    const h = show.hannah(t)
    const hs = h && h0 ? Math.hypot((h.x - f.x) / f.cells - (h0.x - f0.x) / f0.cells, (h.y - f.y) / f.cells - (h0.y - f0.y) / f0.cells) : 1
    drift = Math.max(drift, Math.abs(f.cells - f0.cells) / f0.cells, Math.hypot(s[0] - s0[0], s[1] - s0[1]), hs)
  }
  check('palindrome: the last frame is the first: from the last B-flat on, the same framing, Louise and baby Hannah where they were',
    near(f0.cells, FIRST.cells) && !!h0 && near(h0.scale ?? 0, HANNAH_AGE.baby, 1e-6) && near(show.hannah(perf.duration)?.scale ?? 0, HANNAH_AGE.baby, 1e-6) && drift < 0.01,
    `off by ${drift.toFixed(4)}`)
  // Hannah's rhyme: at each cut into or out of the lake house, on Louise's right a little above her (the cradle, the
  // swing, the bed), growing.
  const rhyme = (['swing', 'bed', 'sees', 'fog2'] as const).map((key) => {
    const t = SEAMS[key].t
    const side = key === 'fog2' ? t - 1e-3 : t + 1e-3
    const h = show.hannah(side)
    const l = show.at(side)
    return h ? Math.hypot(h.x - l.x - HANNAH_BY[0], h.y - l.y - HANNAH_BY[1]) : 9
  })
  check('palindrome: at the lake house\'s cuts Hannah is on Louise\'s right, a little above her: the cradle, the swing, the bed',
    rhyme.every((d) => d < 0.02), rhyme.map((d) => d.toFixed(3)).join(', '))

  // Under Zoom (half as close again as the show's camera) the ball stays in the frame wherever it is to be seen. The
  // great wides are the builders' to list here.
  const WIDE: [number, number][] = [[ARRIVAL - 3.7, ARRIVAL + 14], [RELEASE - 8, RELEASE + 9.3]]
  const outOfZoom: string[] = []
  for (let t = 0; t <= perf.duration; t += 0.05) {
    if (WIDE.some(([a, b]) => t >= a && t <= b)) continue
    const h = show.at(t)
    if (h.hidden || h.scale < 0.3) continue
    const s = onScreen(t)
    const u = Math.max((Math.abs(s[0]) * 1.5) / (16 / 9 / 2), (Math.abs(s[1]) * 1.5) / 0.5)
    if (u > 1) outOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
  }
  check('palindrome: under Zoom the ball never leaves the frame (but for the great wides)', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

  // She can be found: outside the great wides she is never under 5.5 px across at 640x360 for more than 1.5 s.
  let small = 0
  let smallest = 0
  let smallAt = 0
  for (let t = 0; t <= perf.duration; t += 0.05) {
    const h = show.at(t)
    const px = (2 * R * (h.scale ?? 1) * 360) / cam(t).cells
    small = !h.hidden && px < 5.5 && !WIDE.some(([a, b]) => t >= a && t <= b) ? small + 0.05 : 0
    if (small > smallest) { smallest = small; smallAt = t }
  }
  check('palindrome: she can be found: never under 5.5 px across for more than 1.5 s outside the great wides', smallest <= 1.5, `${smallest.toFixed(2)} s to ${smallAt.toFixed(2)}`)

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('palindrome: the ball is never hidden for more than 2 s', longest <= 2, `${longest.toFixed(2)} s`)

  // Ian, Hannah and Shang: each only in their own places, never jumping, coming and going only out of shot or at a
  // cut (Hannah also on the swell, when she goes).
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  }
  for (const who of ['ian', 'hannah', 'shang'] as const) {
    const get = (t: number) => (who === 'ian' ? show.ian(t) : who === 'hannah' ? show.hannah(t) : show.shang(t))
    let worst = 0
    let worstAt = 0
    let pops: string[] = []
    let last = get(0)
    let lastLeg = show.owner(0)
    for (let t = 0.005; t <= perf.duration; t += 0.005) {
      const b = get(t)
      const leg = show.owner(t)
      const changed = leg !== lastLeg || cameraCuts.some((c) => c > t - 0.005 && c <= t + 1e-9)
      if (b && last && !changed) {
        const d = Math.hypot(b.x - last.x, b.y - last.y)
        if (d > worst) { worst = d; worstAt = t }
      }
      const going = who === 'hannah' && t >= GONE[0] && t <= GONE[1]
      if (!changed && !going && !!b !== !!last && (inShot(t, b) || inShot(t - 0.005, last))) pops.push(t.toFixed(3))
      last = b
      lastLeg = leg
    }
    pops = pops.slice(0, 6)
    check(`palindrome: ${who} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`palindrome: ${who} only comes and goes out of shot, or at a cut`, pops.length === 0, pops.join(', '))
  }
  check('palindrome: Hannah goes on the swell, and is gone from the bed after it', GONE[0] >= SWELL - 0.5 && GONE[1] <= SEAM.news && !show.hannah(SEAM.news - 0.1))
  const counts = [2, 30, 80, 110, 160, 205, 220, 240, 253, 270, 300, 330, 360].map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0).map((b) => b.id))
  check('palindrome: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))
  const worldAt = (t: number) => show.legs[show.owner(t)].world
  const samples = Array.from({ length: Math.floor(perf.duration * 4) }, (_, i) => i / 4)
  const ianWhere = samples.filter((t) => show.ian(t)).map(worldAt)
  const hannahWhere = samples.filter((t) => show.hannah(t)).map(worldAt)
  const shangWhere = samples.filter((t) => show.shang(t)).map(worldAt)
  check('palindrome: Ian is never at the lake house before the end nor beyond the glass; Hannah is only ever at the lake house; Shang only at the gala',
    samples.filter((t) => show.ian(t) && worldAt(t) === 'house').every((t) => t >= SEAM.home) && ianWhere.every((w) => w !== 'fog' && w !== 'gala') &&
    hannahWhere.every((w) => w === 'house') && shangWhere.every((w) => w === 'gala') && shangWhere.length > 0)

  // The end credits: words the page sets over the lake house after the last chord has died, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('palindrome: end credits once the last chord has died, set by the page, opening on Directed by Claude Opus 5.5 and naming the cast, Max Richter, the cue, the film, Denis Villeneuve, Ted Chiang and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT > SILENT && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Louise Banks', 'Ian Donnelly', 'Hannah', 'General Shang', 'Abbott and Costello', 'Max Richter', 'On the Nature of Daylight', 'Arrival', 'Denis Villeneuve', 'Ted Chiang', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo|Stephen Wu/i.test(said), said)

  // The measured file is the one the parts were timed to.
  const m = measured as { duration: number; youtube: string }
  check('palindrome: the onsets file is this recording\'s', near(m.duration, RECORDING, 1e-9) && m.youtube === 'rVN1B-tUpgs' && Math.abs(RECORDING - 374.91) < 0.01)
}
