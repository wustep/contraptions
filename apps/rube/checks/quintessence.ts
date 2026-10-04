/**
 * The checks for Quintessence: Walter from the negatives room through the daydream, Nuuk, the sea, Iceland, his
 * mother's piano and the Himalayas to the presses and the newsstand, on the recording's own tracked beats and onsets.
 * Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/step-out-onsets.json'
import { STRIKES } from '../src/shows/versions/step-out/quintessence/hits'
import { BAND, BAND2, BEATS, BUILD, CREDITS_AT, DURATION, HUSH, LAST, LAST_HIT, ONSETS, PEAK, PULSE, RECORDING, SEAM, UNDER, at } from '../src/shows/versions/step-out/quintessence/music'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/step-out/quintessence/credits'
import { COVERED, PUNCHES, ashAt } from '../src/shows/versions/step-out/quintessence/score'
import { FIRST } from '../src/shows/versions/step-out/quintessence/seams'
import type { QuintessenceShow } from '../src/shows/versions/step-out/quintessence/show'
import type { Who } from '../src/shows/versions/step-out/quintessence/kit'
import { WALTER, WALTER_WARM } from '../src/shows/versions/step-out/quintessence/worlds'
import { WIDE } from '../src/shows/versions/step-out/quintessence/wides'
import { R } from '../src/parts'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkQuintessence(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as QuintessenceShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check('quintessence: one take, Quintessence, Opus 5.5, with an about after the film and a still, and no note or byline',
    version.title === 'Quintessence' && version.label === 'Opus 5.5' && version.note === undefined && /The Secret Life of Walter Mitty/.test(version.about ?? '') &&
    typeof version.still === 'number' && !('director' in version))
  check('quintessence: the whole recording from zero, from Republic Records\' upload only (no local file), credited to José González, the song and the film, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 15 && !perf.soundtrack?.src &&
    ['José González', 'Step Out', 'The Secret Life of Walter Mitty'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=5EV9IdeU3D0' && perf.soundtrack?.youtube?.length === 1 &&
    perf.soundtrack.youtube[0].id === '5EV9IdeU3D0' && (perf.soundtrack.youtube[0].from ?? 0) === 0 && (perf.soundtrack.youtube[0].at ?? 0) === 0)

  // The places, in the order the film goes, each cut on a downbeat.
  const order = show.legs.map((l) => l.key).join(',')
  check('quintessence: the negatives, the daydream, the negatives again, Nuuk, the sky, the sea, Iceland, home, the Himalayas, Life, the street',
    order === 'opening,dream,clues,nuuk,sky,sea,iceland,home,himalaya,press,street', order)
  const cuts = show.legs.slice(1).map((l) => l.from)
  const seams = Object.values(SEAM)
  const downbeat = (t: number) => BEATS.some((b) => b.pos === 1 && Math.abs(b.t - t) <= 0.002)
  check('quintessence: every cut is on a downbeat, and on the song\'s turns: the band in, the band out under the sea, the pulse, the build, the peak, the fall',
    cuts.length === 10 && cuts.every((c) => seams.some((s) => near(s, c, 1e-3)) && downbeat(c)) &&
    [BAND, UNDER, PULSE, BUILD, PEAK].every((m) => cuts.some((c) => Math.abs(c - m) <= 0.002)) && Math.abs(SEAM.street - at(131)) < 1e-9,
    cuts.map((t) => t.toFixed(3)).join(', '))
  check('quintessence: no portal anywhere, and no cut drawn', [0, 20, 50, 100, 130, 190, 230, 250].every((t) => perf.cuts?.(t) === false))

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
  check('quintessence: inside a place the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('quintessence: every cut is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // Walter's colour: slate until the hinge at Nuuk, red from the helipad on.
  const colourAt = (t: number) => show.at(t).ball.color.toUpperCase()
  check('quintessence: Walter is slate until he runs out of the bar at Nuuk, and Life\'s red from the helipad to the end',
    [1, 20, 30, 40].every((t) => colourAt(t) === WALTER.toUpperCase()) && [SEAM.sky + 0.01, 80, 120, 170, 200, 240].every((t) => colourAt(t) === WALTER_WARM.toUpperCase()),
    [1, 40, SEAM.sky + 0.01, 240].map((t) => `${t}: ${colourAt(t)}`).join(', '))

  // Every strike lands on something the recording has: a tracked beat or a measured onset.
  const onBeat = (t: number, eps: number) => BEATS.some((b) => Math.abs(b.t - t) <= eps)
  const onOnset = (t: number, eps: number, min = 0.2) => ONSETS.some((o) => o.s >= min && Math.abs(o.t - t) <= eps)
  const within = (t: number) => onBeat(t, 0.03) || onOnset(t, 0.03)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('quintessence: every strike lands within 30 ms of a tracked beat or a measured onset', off.length === 0 && count >= 300, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const quiet = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('quintessence: every place strikes', quiet.length === 0, `no strikes yet: ${quiet.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number, eps = 0.03) => all.some((s) => Math.abs(s - t) <= eps)
  const marks: [string, number][] = [['the band in', BAND], ['under the sea', UNDER], ['the band back', BAND2], ['the last hit before the hush', LAST_HIT], ['the pulse', PULSE], ['the build', BUILD], ['the peak', PEAK], ['the last chord', LAST]]
  const unstruck = marks.filter(([, t]) => !hit(t, 0.03)).map(([n, t]) => `${n} ${t.toFixed(3)}`)
  check('quintessence: the song\'s turns are struck: the band in, the drop under, the band back, the last hit, the pulse, the build, the peak, the last chord', unstruck.length === 0, unstruck.join(', '))
  // Where the band plays, the machine plays with it: most downbeats struck in each full stretch.
  for (const [name, a, b] of [['the band', 1, 36], ['the band back', 48, 66], ['the peak', 110, 130]] as const) {
    const downs = BEATS.filter((x) => x.pos === 1 && x.bar >= a && x.bar <= b)
    const struck = downs.filter((x) => hit(x.t)).length
    check(`quintessence: ${name} strikes at least 75% of its downbeats (bars ${a} to ${b})`, struck >= downs.length * 0.75, `${struck}/${downs.length}`)
  }
  const peakBeats = BEATS.filter((x) => x.bar >= 110 && x.bar <= 130 && x.onset)
  const peakHit = peakBeats.filter((x) => hit(x.t)).length
  check('quintessence: the peak strikes at least 70% of its beats', peakHit >= peakBeats.length * 0.7, `${peakHit}/${peakBeats.length}`)

  // The camera cuts inside a place only on a strike, and otherwise never whips.
  const cameraCuts = show.cameraCuts
  const offStrike = cameraCuts.filter((c) => !all.some((s) => Math.abs(s - c) <= 0.005))
  check('quintessence: the camera cuts inside a place only on a strike', offStrike.length === 0, `${cameraCuts.length} cuts${offStrike.length ? `; off: ${offStrike.map((c) => c.toFixed(3)).join(', ')}` : ''}`)
  let whip = 0
  let whipAt = 0
  const ZDT = 1 / 120
  for (let t = ZDT; t <= perf.duration; t += ZDT) {
    if (show.owner(t) !== show.owner(t - ZDT)) continue
    if (cameraCuts.some((c) => c > t - ZDT && c <= t + 1e-9)) continue
    if (PUNCHES.some(([p]) => t >= p - 0.01 && t <= p + 0.15)) continue
    const z = Math.abs(Math.log(cam(t).cells / cam(t - ZDT).cells)) / ZDT
    if (z > whip) { whip = z; whipAt = t }
  }
  check('quintessence: the camera never whips: its zoom under 0.6 of a scale a second but for its punch and its cuts', whip <= 0.6, `${whip.toFixed(2)} log/s at ${whipAt.toFixed(2)} s`)
  check('quintessence: the show opens on its first frame', near(cam(0).cells, FIRST.cells, 1e-6))

  // The ash: grey over the frame at its cut, and nowhere else.
  check('quintessence: one cut under the volcano\'s ash, whole at its cut and only round it',
    COVERED.length === 1 && near(COVERED[0], SEAM.home) && ashAt(SEAM.home) > 0.99 && [5, 60, 100, 128, 140, 200, 240].every((t) => ashAt(t) === 0))

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
  check('quintessence: under Zoom the ball never leaves the frame (but for the wides)', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

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
  check('quintessence: he can be found: never under 5.5 px across for more than 1.5 s outside the wides', smallest <= 1.5, `${smallest.toFixed(2)} s to ${smallAt.toFixed(2)}`)
  const wideTotal = WIDE.reduce((s, [a, b]) => s + (b - a), 0)
  check('quintessence: the wides are few: under 12% of the show', wideTotal <= DURATION * 0.12, `${wideTotal.toFixed(1)} s`)

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('quintessence: the ball is never hidden for more than 2.5 s', longest <= 2.5, `${longest.toFixed(2)} s`)

  // The hush is a hush: through the ash he stands still on the road.
  let moved = 0
  for (let t = HUSH + 6; t < SEAM.home - 0.05; t += 0.01) {
    const a = show.where(t)
    const b = show.where(t + 0.01)
    moved = Math.max(moved, Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.01)
  }
  check('quintessence: in the hush, under the ash, he stands still', moved < 0.05, `${moved.toFixed(3)} cells/s`)

  // Cheryl and Sean: each only in their own places, never jumping, coming and going only out of shot or at a cut.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  }
  const who: Who[] = ['cheryl', 'sean']
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
    check(`quintessence: ${w} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`quintessence: ${w} only comes and goes out of shot, or at a cut`, pops.length === 0, pops.join(', '))
  }
  const counts = [5, 20, 30, 45, 60, 80, 110, 140, 170, 200, 230, 240].map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0).map((b) => b.id))
  check('quintessence: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))
  const legAt = (t: number) => show.legs[show.owner(t)].key
  const where = (w: Who) => [...new Set(Array.from({ length: Math.floor(perf.duration * 4) }, (_, i) => i / 4).filter((t) => show.who(t, w)).map(legAt))].sort().join(',')
  const cherylIn = where('cheryl').split(',').filter(Boolean)
  const seanIn = where('sean').split(',').filter(Boolean)
  check('quintessence: Cheryl only in the office, the daydream, the little stage at Nuuk and the street; Sean only in the Himalayas',
    cherylIn.every((k) => ['clues', 'dream', 'nuuk', 'street'].includes(k)) && ['clues', 'dream', 'nuuk', 'street'].every((k) => cherylIn.includes(k)) && seanIn.join() === 'himalaya',
    `cheryl ${cherylIn.join(',')}; sean ${seanIn.join(',')}`)

  // The end credits: words the page sets over the street after the last chord, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('quintessence: end credits after the last chord, set by the page, opening on Directed by Claude Opus 5.5 and naming Walter, Cheryl, Sean, José González, the song, its writers, the film, Ben Stiller and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT > LAST && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    CARDS.some((c) => c.role === 'After' && c.names.join() === 'The Secret Life of Walter Mitty' && (c.notes ?? []).join().includes('Ben Stiller (2013)')) &&
    ['Walter Mitty', 'Cheryl Melhoff', "Sean O'Connell", 'José González', 'Step Out', 'Theodore Shapiro', 'Craig Wedren', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo|inspired by/i.test(said), said)

  // The measured file is the one the parts were timed to.
  const m = measured as { duration: number; youtube: string }
  check('quintessence: the onsets file is this video\'s', near(m.duration, RECORDING, 1e-9) && m.youtube === '5EV9IdeU3D0' && Math.abs(RECORDING - 241.07) < 0.01)
}
