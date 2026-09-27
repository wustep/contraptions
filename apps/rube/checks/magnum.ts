/**
 * The checks for Magnum: Derek from the awards through the spa, the walk-off and Derelicte to the Center, on the
 * recording's own beat and onsets. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/relax-onsets.json'
import { STRIKES } from '../src/shows/versions/relax/magnum/hits'
import { BACK, BEATS, BREAK, CREDITS_AT, DRUMS, DURATION, END, HALVES, ONSETS, RECORDING, ROCK, SEAM, SPLASH, STOP, WASH, CALL } from '../src/shows/versions/relax/magnum/music'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/relax/magnum/credits'
import { FLASHED, PUNCHES, flashCutAt } from '../src/shows/versions/relax/magnum/score'
import { FIRST } from '../src/shows/versions/relax/magnum/seams'
import type { MagnumShow } from '../src/shows/versions/relax/magnum/show'
import type { Who } from '../src/shows/versions/relax/magnum/kit'
import { R } from '../src/parts'

type Check = (name: string, ok: boolean, detail?: string) => void

/**
 * Where Derek may be small or out of the Zoom frame: the great wides, and the shots of Hansel on his way up the tower
 * while Derek is on the runway below. Each is a stretch of show seconds, said by the part that frames it.
 */
const WIDE: [number, number][] = []

export function checkMagnum(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as MagnumShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check('magnum: one take, Magnum, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Magnum' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('magnum: the whole recording from zero, credited to Frankie Goes to Hollywood and the film, played from the label\'s upload, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 20 &&
    !!perf.soundtrack?.src?.includes('relax-demo') &&
    ['Frankie Goes to Hollywood', 'Relax', 'Zoolander'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=kpgRJSrfoic' && perf.soundtrack?.youtube?.[0]?.id === 'kpgRJSrfoic')

  // The places, in the order the film goes, each cut on the recording.
  const order = show.legs.map((l) => l.world).join(',')
  check('magnum: the awards, the spa, the walk-off, Derelicte, the Center', order === 'awards,spa,club,derelicte,center', order)
  const onBeat = (t: number, eps: number) => BEATS.some((b) => Math.abs(b.t - t) <= eps) || HALVES.some((b) => Math.abs(b.t - t) <= eps)
  const onOnset = (t: number, eps: number, min = 0.2) => ONSETS.some((o) => o.s >= min && Math.abs(o.t - t) <= eps)
  const cuts = show.legs.slice(1).map((l) => l.from)
  const seams = Object.values(SEAM)
  const downbeat = (t: number) => BEATS.some((b) => b.k % 4 === 0 && Math.abs(b.t - t) <= 0.002)
  check('magnum: every cut is on a downbeat', cuts.length === 4 && cuts.every((c) => seams.some((s) => near(s, c, 1e-3)) && downbeat(c)), cuts.map((t) => t.toFixed(3)).join(', '))
  check('magnum: no portal anywhere, and no cut drawn', [0, 20, 50, 100, 130, 186, 210, 240].every((t) => perf.cuts?.(t) === false))

  // One ball, one path: in a place it never jumps; at a cut the camera carries it, so on the screen it holds still.
  let jump = 0
  let jumpAt = 0
  let screen = 0
  let screenAt = 0
  let prev = show.where(0)
  let prevLeg = show.owner(0)
  const onScreen = (t: number): [number, number] => {
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
    const cutHere = show.cameraCuts.some((c) => c > t - 0.001 - 1e-9 && c <= t + 1e-9)
    const ds = cutHere ? 0 : Math.hypot(s[0] - prevS[0], s[1] - prevS[1])
    if (ds > screen) { screen = ds; screenAt = t }
    prev = here
    prevLeg = leg
    prevS = s
  }
  check('magnum: inside a place the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('magnum: every cut is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // Every strike lands on something the recording has: a beat or an off-beat, or a measured onset.
  const within = (t: number) => onBeat(t, 0.03) || onOnset(t, 0.04)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('magnum: every strike lands on a beat, an off-beat or a measured onset', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const quiet = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('magnum: every part strikes', quiet.length === 0, `no strikes yet: ${quiet.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number, eps = 0.03) => all.some((s) => Math.abs(s - t) <= eps)
  const marks: [string, number][] = [['the drums coming in', DRUMS], ['the sung call', CALL], ['the count-in', BREAK], ['the surge\'s wash', WASH], ['the plug', STOP], ['Magnum', SPLASH], ['the band back in', BACK], ['the last hit', END]]
  const unstruck = marks.filter(([, t]) => !hit(t, 0.04)).map(([n, t]) => `${n} ${t.toFixed(3)}`)
  check('magnum: the song\'s landmarks are struck: the drums, the call, the count-in, the wash, the plug, Magnum, the band back, the last hit', unstruck.length === 0, unstruck.join(', '))
  const rock = BEATS.filter((b) => b.t >= ROCK - 0.01 && b.t < STOP - 0.1)
  const rockHit = rock.filter((b) => hit(b.t)).length
  check('magnum: the breakdown before the plug strikes most of its beats', rockHit >= rock.length * 0.75, `${rockHit}/${rock.length}`)

  // The camera cuts inside a place only on a strike, and otherwise never whips.
  const cameraCuts = show.cameraCuts
  const offStrike = cameraCuts.filter((c) => !all.some((s) => Math.abs(s - c) <= 0.005))
  check('magnum: the camera cuts inside a place only on a strike', offStrike.length === 0, `${cameraCuts.length} cuts${offStrike.length ? `; off: ${offStrike.map((c) => c.toFixed(3)).join(', ')}` : ''}`)
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
  check('magnum: the camera never whips: its zoom under 0.6 of a scale a second but for its punches (the looks) and its cuts', whip <= 0.6, `${whip.toFixed(2)} log/s at ${whipAt.toFixed(2)} s`)
  check('magnum: the camera\'s biggest push is Magnum\'s', PUNCHES.every(([at, s]) => at === SPLASH || s < PUNCHES.find(([a]) => a === SPLASH)![1]))
  check('magnum: the show opens on its first frame', near(cam(0).cells, FIRST.cells, 1e-6))

  // The flash cuts are white at their cuts, and nothing else is.
  check('magnum: three cuts in a press camera\'s flash, white at their cuts and only there',
    FLASHED.length === 3 && FLASHED.every((t) => flashCutAt(t) > 0.99) && [5, 60, 100, 150, 186.5, 240].every((t) => flashCutAt(t) === 0) &&
    [SEAM.spa, SEAM.club, SEAM.center].every((t) => FLASHED.some((f) => near(f, t))))

  // Under Zoom (half as close again as the show's camera) the ball stays in the frame wherever it is to be seen.
  const outOfZoom: string[] = []
  for (let t = 0; t <= perf.duration; t += 0.05) {
    if (WIDE.some(([a, b]) => t >= a && t <= b)) continue
    const h = show.at(t)
    if (h.hidden || h.scale < 0.3) continue
    const s = onScreen(t)
    const u = Math.max(Math.abs(s[0]) * 1.5 / (16 / 9 / 2), Math.abs(s[1]) * 1.5 / 0.5)
    if (u > 1) outOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
  }
  check('magnum: under Zoom the ball never leaves the frame (but for the wides and the shots of Hansel)', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

  // He can be found: outside the wides he is never under 5.5 px across at 640x360 for more than 1.5 s.
  let small = 0
  let smallest = 0
  let smallAt = 0
  for (let t = 0; t <= perf.duration; t += 0.05) {
    const h = show.at(t)
    const px = (2 * R * (h.scale ?? 1) * 360) / cam(t).cells
    small = !h.hidden && px < 5.5 && !WIDE.some(([a, b]) => t >= a && t <= b) ? small + 0.05 : 0
    if (small > smallest) { smallest = small; smallAt = t }
  }
  check('magnum: he can be found: never under 5.5 px across for more than 1.5 s outside the wides', smallest <= 1.5, `${smallest.toFixed(2)} s to ${smallAt.toFixed(2)}`)

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('magnum: the ball is never hidden for more than 2 s', longest <= 2, `${longest.toFixed(2)} s`)

  // In the silence after the plug he stands stock still, until the look.
  let moved = 0
  for (let t = STOP + 0.45; t < SPLASH - 0.35; t += 0.01) {
    const a = show.where(t)
    const b = show.where(t + 0.01)
    moved = Math.max(moved, Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.01)
  }
  check('magnum: in the silence after the plug he stands stock still', moved < 0.05, `${moved.toFixed(3)} cells/s`)

  // Hansel, Mugatu and the Prime Minister: each only in their own places, never jumping, coming and going only out of
  // shot or at a cut.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  }
  const who: Who[] = ['hansel', 'mugatu', 'pm']
  for (const w of who) {
    const get = (t: number) => show.who(t, w)
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
    check(`magnum: ${w} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`magnum: ${w} only comes and goes out of shot, or at a cut`, pops.length === 0, pops.join(', '))
  }
  const counts = [5, 20, 40, 70, 95, 110, 130, 160, 185, 195, 210, 225].map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0).map((b) => b.id))
  check('magnum: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))
  const worldAt = (t: number) => show.legs[show.owner(t)].world
  const where = (w: Who) => [...new Set(Array.from({ length: Math.floor(perf.duration * 4) }, (_, i) => i / 4).filter((t) => show.who(t, w)).map(worldAt))].sort().join(',')
  check('magnum: Hansel is never in the spa; Mugatu is never at the walk-off or the Center; the Prime Minister is only at Derelicte',
    !where('hansel').includes('spa') && !where('mugatu').includes('club') && !where('mugatu').includes('center') && ['', 'derelicte'].includes(where('pm')),
    `hansel ${where('hansel')}; mugatu ${where('mugatu')}; pm ${where('pm')}`)

  // The end credits: words the page sets over the Center after the last hit, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('magnum: end credits after the last hit, set by the page, opening on Directed by Claude Opus 5.5 and naming Derek, Hansel, Mugatu, the Prime Minister, Frankie Goes to Hollywood, the song, Trevor Horn, the film, Ben Stiller and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT > END && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Derek Zoolander', 'Hansel', 'Mugatu', 'Prime Minister', 'Frankie Goes to Hollywood', 'Relax', 'Trevor Horn', 'Zoolander', 'Ben Stiller', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo|Stephen Wu/i.test(said), said)

  // The measured file is the one the parts were timed to.
  const m = measured as { duration: number; youtube: string }
  check('magnum: the onsets file is this recording\'s', near(m.duration, RECORDING, 1e-9) && m.youtube === 'kpgRJSrfoic' && Math.abs(RECORDING - 233.613) < 0.01)
}
