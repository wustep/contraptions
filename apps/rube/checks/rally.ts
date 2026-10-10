/**
 * The checks for Rally: Marty, a table-tennis ball, from his uncle's shoe store through London, the hotel, the bowling
 * alley, the night in New Jersey and Tokyo to the nursery's glass, on the recording's own beats, shuffles and onsets.
 * Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/rule-the-world-onsets.json'
import { STRIKES } from '../src/shows/versions/rule-the-world/rally/hits'
import { AUDIBLE, BEATS, CRASH, CREDITS_AT, DURATION, LOSS, ONSETS, RECORDING, SEAM, SHUFFLES, SON, WIN, at } from '../src/shows/versions/rule-the-world/rally/music'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/rule-the-world/rally/credits'
import { PUNCHES } from '../src/shows/versions/rule-the-world/rally/score'
import { FIRST } from '../src/shows/versions/rule-the-world/rally/seams'
import type { RallyShow } from '../src/shows/versions/rule-the-world/rally/show'
import type { Who } from '../src/shows/versions/rule-the-world/rally/kit'
import { BABY_SCALE, MARTY } from '../src/shows/versions/rule-the-world/rally/worlds'
import { WIDE } from '../src/shows/versions/rule-the-world/rally/wides'
import { R } from '../src/parts'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkRally(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as RallyShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check('rally: one take, Rally, Opus 5.5, with an about after the film and a still, and no note or byline',
    version.title === 'Rally' && version.label === 'Opus 5.5' && version.note === undefined && /Marty Supreme/.test(version.about ?? '') &&
    typeof version.still === 'number' && !('director' in version))
  check('rally: the whole recording from zero, from Universal Music Group\'s upload only (no local file), credited to Tears for Fears, the song and the film',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 10 && !perf.soundtrack?.src &&
    ['Tears for Fears', 'Everybody Wants to Rule the World', 'Marty Supreme'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=awoFZaSuko4' && perf.soundtrack?.youtube?.length === 1 &&
    perf.soundtrack.youtube[0].id === 'awoFZaSuko4' && (perf.soundtrack.youtube[0].from ?? 0) === 0 && (perf.soundtrack.youtube[0].at ?? 0) === 0)

  // The places, in the order the film goes, each cut on a downbeat.
  const order = show.legs.map((l) => l.key).join(',')
  check('rally: the shoe store, London, the hotel, the bowling alley, New Jersey, Tokyo, the ward', order === 'store,london,hotel,alley,jersey,tokyo,hospital', order)
  const cuts = show.legs.slice(1).map((l) => l.from)
  const seams = Object.values(SEAM)
  const downbeat = (t: number) => BEATS.some((b) => b.pos === 1 && Math.abs(b.t - t) <= 0.002)
  check('rally: every cut is on a downbeat, on the song\'s turns: the first two hooks, the break, the guitar, the broken-off line, "All for freedom"',
    cuts.length === 6 && cuts.every((c) => seams.some((s) => near(s, c, 1e-3)) && downbeat(c)) &&
    [at(25), at(43), at(57), at(65), at(83), at(95)].every((m) => cuts.some((c) => near(c, m, 1e-3))),
    cuts.map((t) => t.toFixed(3)).join(', '))
  check('rally: no portal anywhere, and no cut drawn', [0, 20, 60, 100, 130, 160, 190, 230, 260].every((t) => perf.cuts?.(t) === false))

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
  check('rally: inside a place the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('rally: every cut is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // Marty is his orange from the first frame to the last.
  const colours = [1, 30, 60, 100, 125, 150, 185, 210, 250].map((t) => show.at(t).ball.color.toUpperCase())
  check('rally: Marty is his orange throughout', colours.every((c) => c === MARTY.toUpperCase()), colours.join(','))

  // Every strike lands on something the recording has: a beat, a shuffle's "a", or a measured onset.
  const onBeat = (t: number, eps: number) => BEATS.some((b) => Math.abs(b.t - t) <= eps) || SHUFFLES.some((b) => Math.abs(b.t - t) <= eps)
  const onOnset = (t: number, eps: number, min = 0.2) => ONSETS.some((o) => o.s >= min && Math.abs(o.t - t) <= eps)
  const within = (t: number) => onBeat(t, 0.03) || onOnset(t, 0.03)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('rally: every strike lands within 30 ms of a beat, a shuffle or a measured onset', off.length === 0 && count >= 300, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const quiet = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('rally: every place strikes', quiet.length === 0, `no strikes yet: ${quiet.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number, eps = 0.03) => all.some((s) => Math.abs(s - t) <= eps)
  const marks: [string, number][] = [['the bass in', at(5)], ['"Welcome to your life"', at(14)], ['the first hook', at(25)], ['the lost point', LOSS], ['the tub through the floor', CRASH], ['the break', at(57)], ['the guitar', at(65)], ['the broken-off line', at(83)], ['the winning point', WIN], ['"All for freedom"', at(95)], ['his son', SON]]
  const unstruck = marks.filter(([, t]) => !hit(t, 0.03)).map(([n, t]) => `${n} ${t.toFixed(3)}`)
  check('rally: the song\'s turns and the story\'s are struck: the bass in, the first line, the first hook, the lost point, the tub, the break, the guitar, the broken line, the winning point, "All for freedom", his son', unstruck.length === 0, unstruck.join(', '))
  // Where there is a match, the machine plays every beat of it.
  for (const [name, a, b, share] of [['the semifinal in London', 26, 31, 0.75], ['the final in London', 33, 40, 0.75], ['the hustle', 58, 63, 0.6], ['the real match in Tokyo', 85, 88, 0.85]] as const) {
    const bs = BEATS.filter((x) => x.bar >= a && x.bar <= b)
    const struck = bs.filter((x) => hit(x.t)).length
    check(`rally: ${name} strikes at least ${Math.round(share * 100)}% of its beats (bars ${a} to ${b})`, struck >= bs.length * share, `${struck}/${bs.length}`)
  }

  // The camera cuts inside a place only on a strike, and otherwise never whips.
  const cameraCuts = show.cameraCuts
  const offStrike = cameraCuts.filter((c) => !all.some((s) => Math.abs(s - c) <= 0.005))
  check('rally: the camera cuts inside a place only on a strike', offStrike.length === 0, `${cameraCuts.length} cuts${offStrike.length ? `; off: ${offStrike.map((c) => c.toFixed(3)).join(', ')}` : ''}`)
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
  check('rally: the camera never whips: its zoom under 0.6 of a scale a second but for its punches and its cuts', whip <= 0.6, `${whip.toFixed(2)} log/s at ${whipAt.toFixed(2)} s`)
  check('rally: the show opens on its first frame', near(cam(0).cells, FIRST.cells, 1e-6))

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
  check('rally: under Zoom the ball never leaves the frame (but for the wides)', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

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
  check('rally: he can be found: never under 5.5 px across for more than 1.5 s outside the wides', smallest <= 1.5, `${smallest.toFixed(2)} s to ${smallAt.toFixed(2)}`)
  const wideTotal = WIDE.reduce((s, [a, b]) => s + (b - a), 0)
  check('rally: the wides are few: under 12% of the show', wideTotal <= DURATION * 0.12, `${wideTotal.toFixed(1)} s`)

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('rally: the ball is never hidden for more than 2.5 s', longest <= 2.5, `${longest.toFixed(2)} s`)

  // Rachel and the baby: each only in their own places, never jumping, coming and going only out of shot or at a cut.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  }
  const who: Who[] = ['rachel', 'baby']
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
    check(`rally: ${w} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`rally: ${w} only comes and goes out of shot, or at a cut`, pops.length === 0, pops.join(', '))
  }
  const counts = Array.from({ length: 53 }, (_, i) => i * 5).map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0).map((b) => b.id))
  check('rally: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))
  const legAt = (t: number) => show.legs[show.owner(t)].key
  const where = (w: Who) => [...new Set(Array.from({ length: Math.floor(perf.duration * 4) }, (_, i) => i / 4).filter((t) => show.who(t, w)).map(legAt))].sort().join(',')
  const rachelIn = where('rachel').split(',').filter(Boolean)
  const babyIn = where('baby').split(',').filter(Boolean)
  check('rally: Rachel only in the shoe store, New Jersey and the ward; their son only in the ward, and only from when Marty comes to the glass',
    rachelIn.join() === 'hospital,jersey,store' && babyIn.join() === 'hospital' && !inShot(SEAM.hospital + 0.5, show.who(SEAM.hospital + 0.5, 'baby')),
    `rachel ${rachelIn.join(',')}; baby ${babyIn.join(',')}`)
  const babyScales = Array.from({ length: 100 }, (_, i) => SON + i * 0.4).map((t) => show.who(t, 'baby')).filter((b): b is NonNullable<typeof b> => !!b).map((b) => b.scale ?? 1)
  check('rally: their son is small: drawn at about half Marty\'s size', babyScales.length > 0 && babyScales.every((s) => Math.abs(s - BABY_SCALE) < 0.15), babyScales.slice(0, 4).join(','))

  // The end credits: words the page sets over the ward as the song fades, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('rally: end credits in the fade, set by the page, opening on Directed by Claude Opus 5.5 and naming Marty, Rachel, their son, Tears for Fears, the song, its writers, the film, Josh Safdie and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT < AUDIBLE && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    CARDS.some((c) => c.role === 'After' && c.names.join() === 'Marty Supreme' && (c.notes ?? []).join().includes('Josh Safdie (2025)')) &&
    ['Marty Mauser', 'Rachel Mizler', 'Their son', 'Tears for Fears', 'Everybody Wants to Rule the World', 'Roland Orzabal', 'Ian Stanley', 'Chris Hughes', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo|inspired by/i.test(said), said)

  // The measured file is the one the parts were timed to.
  const m = measured as { duration: number; youtube: string }
  check('rally: the onsets file is this video\'s', near(m.duration, RECORDING, 1e-9) && m.youtube === 'awoFZaSuko4' && Math.abs(RECORDING - 251.5) < 0.05)
}
