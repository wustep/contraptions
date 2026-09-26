/**
 * The checks for Married Life (`versions/married-life/opus55.show.ts`), run by `check:shows`. Kept in their own
 * file: what the show promises is its own.
 */
import type { Performance, Version } from '../src/shows/registry'
import onsets from '../../../scripts/shows/plans/married-life-onsets.json'
import { STRIKES } from '../src/shows/versions/married-life/life/hits'
import { AT, BEATS, CUT, DURATION, ONSETS, RECORDING, SEAM } from '../src/shows/versions/married-life/life/music'
import { CARDS, CREDITS_AT, CREDITS_OK, creditsAt } from '../src/shows/versions/married-life/life/credits'
import { CUTS } from '../src/shows/versions/married-life/life/seams'
import { CARL, ELLIE, ELLIE_ID, carlAt, ellieAt } from '../src/shows/versions/married-life/life/worlds'
import { BALLOON_FROM, balloonAt, HALF } from '../src/shows/versions/married-life/life/cast'
import { R } from '../src/parts'
import type { LifeShow } from '../src/shows/versions/married-life/life/show'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
const same = (a: string, b: string) => a.toUpperCase() === b.toUpperCase()

export function checkMarriedLife(perf: Performance, version: Version, check: Check): void {
  const show = perf.show as LifeShow
  const cam = perf.camera!

  check('married life: in the picker it is Married Life, Opus 5.5, with no note and no byline, and a share line and still',
    version.title === 'Married Life' && version.label === 'Opus 5.5' && version.note === undefined && !('director' in version) &&
    !!version.about && typeof version.still === 'number' && version.still > 0 && version.still < DURATION)
  check('married life: the whole recording from zero, credited to Michael Giacchino and Up, on the label\'s upload',
    near(perf.duration, DURATION) && DURATION > AT.last + 10 && DURATION >= RECORDING && (perf.soundtrack?.offset ?? 0) === 0 &&
    !!perf.soundtrack?.src?.includes('married-life-demo') &&
    ['Michael Giacchino', 'Married Life', 'Up'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=2rn-vMbFglI' && perf.soundtrack?.youtube?.[0]?.id === '2rn-vMbFglI')

  // The places, in the film's order, each cut on the music.
  const order = show.legs.map((l) => `${l.key}:${l.world}`).join(',')
  check('married life: the church, the house, the hill, the nursery, the doctor, the house\'s long take, the hill, the hospital, the church, home',
    order === 'wedding:church,fixup:house,clouds:hill,nursery:house,doctor:clinic,house:house,climb:hill,hospital:clinic,funeral:church,alone:house', order)
  const o = onsets as { onsets: { t: number; s: number }[] }
  const cuts = show.legs.slice(1).map((l) => l.from)
  const offCut = cuts.filter((t) => !o.onsets.some((x) => x.s >= 0.4 && Math.abs(x.t - t) <= 0.02))
  check('married life: every cut is on a clear onset', cuts.length === 9 && offCut.length === 0 && cuts.every((t, i) => near(t, Object.values(CUT)[i])), offCut.map((t) => t.toFixed(3)).join(', '))
  check('married life: the house\'s long take changes rooms on the jar waltz\'s downbeats (bars 3 and 37)',
    BEATS.some((b) => b.stretch === 'jar' && b.bar === 3 && b.pos === 1 && near(b.t, SEAM.jar)) && BEATS.some((b) => b.stretch === 'jar' && b.bar === 37 && b.pos === 1 && near(b.t, SEAM.ties)))
  check('married life: no portal anywhere, and no cut drawn', show.legs.every((l) => l.placed.every((p) => p.piece.name !== 'portal')) &&
    [0, 21.6, 100, 180.5, 250].every((t) => perf.cuts?.(t) === false))

  // One Carl, one path: in a place he never jumps; at a cut the camera carries him, so on the screen he holds still.
  let jump = 0
  let jumpAt = 0
  let screen = 0
  let screenAt = 0
  let prev = show.where(0)
  let prevLeg = show.owner(0)
  const onScreen = (t: number) => {
    const h = show.where(t)
    const f = cam(t)
    return [(h[0] - f.x) / f.cells, (h[1] - f.y) / f.cells]
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
  check('married life: in a place Carl never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('married life: every cut is a match cut: on the screen he never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)
  // One take: at a cut the camera's move carries on at the speed it had (pan and zoom), carried by the cut's shift, so
  // no cut is a stop and a start again.
  const seams: string[] = []
  for (let i = 1; i < show.legs.length; i++) {
    const t = show.legs[i].from
    const [sx, sy] = show.shift(i - 1, i)
    const d = 0.002
    const a0 = cam(t - 2 * d), a1 = cam(t - d), b0 = cam(t + d), b1 = cam(t + 2 * d)
    const pan = Math.hypot((b1.x - b0.x) - (a1.x - a0.x), (b1.y - b0.y) - (a1.y - a0.y)) / d / a1.cells
    const zoom = Math.abs(Math.log(b1.cells / b0.cells) - Math.log(a1.cells / a0.cells)) / d
    const gap = Math.hypot(b0.x - sx - a1.x, b0.y - sy - a1.y) / a1.cells
    if (pan > 0.02 || zoom > 0.02 || gap > 0.01) seams.push(`${t.toFixed(3)}: pan ${pan.toFixed(3)} fh/s, zoom ${zoom.toFixed(3)}/s, gap ${gap.toFixed(4)}`)
    // Where he is on the move across the cut, so is the camera: it does not come to rest there.
    const w0 = show.where(t - 2 * d), w1 = show.where(t - d)
    const carl = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) / d
    const moving = Math.hypot(a1.x - a0.x, a1.y - a0.y) / d / a1.cells > 0.02 || Math.abs(Math.log(a1.cells / a0.cells)) / d > 0.02
    if (carl > 0.2 && !moving) seams.push(`${t.toFixed(3)}: the camera stops while he goes on at ${carl.toFixed(2)} cells/s`)
  }
  check('married life: the camera is one take: at every cut its move carries on through, carried by the cut', seams.length === 0, seams.join('; '))
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('married life: Carl is never hidden for more than 2.5 s', longest <= 2.5, `${longest.toFixed(2)} s`)
  check('married life: the stage draws no ball (the cast draws the two of them)', [0, 30, 100, 200, 250].every((t) => Array.isArray(show.at(t).balls) && show.at(t).balls!.length === 0))

  // Every strike lands on the music: a beat of a waltz (±30 ms), or a measured onset (±35 ms, at least a little strong).
  const beatTimes = BEATS.filter((b) => b.pos !== undefined).map((b) => b.t)
  const marks = ONSETS.filter((x) => x.s >= 0.15).map((x) => x.t)
  const onMusic = (t: number) => beatTimes.some((b) => Math.abs(b - t) <= 0.03) || marks.some((m) => Math.abs(m - t) <= 0.035)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!onMusic(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('married life: every strike lands on the music', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number) => all.some((s) => Math.abs(s - t) <= 0.03)
  // The waltzes are struck bar by bar: nearly every downbeat from the house to the nursery, and from the book to the
  // tickets. The breaths (the house's quiet bars before the hill, the ritard into the loss) may go unstruck.
  const downs = (stretch: 'waltz' | 'jar', a: number, b: number) => BEATS.filter((x) => x.stretch === stretch && x.pos === 1 && x.bar! >= a && x.bar! <= b)
  const w1 = downs('waltz', 5, 50)
  const w2 = downs('jar', 1, 61)
  const w1n = w1.filter((b) => hit(b.t)).length
  const w2n = w2.filter((b) => hit(b.t)).length
  check('married life: the first waltz is struck bar by bar (at least 80% of its downbeats, bars 5 to 50)', w1n >= w1.length * 0.8, `${w1n}/${w1.length}`)
  check('married life: the second waltz is struck bar by bar (at least 80% of its downbeats, bars 1 to 61)', w2n >= w2.length * 0.8, `${w2n}/${w2.length}`)
  check('married life: the flash, the book, the tickets\' three hits, the fall and the church\'s great chord are struck',
    [AT.flash, AT.book, ...AT.cadence, AT.fall, AT.church].every((t) => all.some((s) => Math.abs(s - t) <= 0.035)),
    [AT.flash, AT.book, ...AT.cadence, AT.fall, AT.church].filter((t) => !all.some((s) => Math.abs(s - t) <= 0.035)).map((t) => t.toFixed(3)).join(', '))
  const empty = Object.entries(STRIKES).filter(([name, list]) => list.length === 0 && name !== 'doctor').map(([name]) => name)
  check('married life: every part strikes (the doctor\'s office may keep its silence)', empty.length === 0, empty.join(', '))

  // Under Zoom (half as close again as the show's camera) the two of them stay whole in the frame wherever they are
  // to be seen: his whole square and her whole ball, not only their middles.
  const zoomed = (t: number, x: number, y: number, r: number) => {
    const f = cam(t)
    const cells = f.cells / 1.5
    return Math.max((Math.abs(x - f.x) + r) / ((cells * 16) / 9 / 2), (Math.abs(y - f.y) + r) / (cells / 2))
  }
  const outOfZoom: string[] = []
  const herOutOfZoom: string[] = []
  for (let t = 0; t <= perf.duration; t += 0.05) {
    const h = show.at(t)
    if (!h.hidden && h.scale >= 0.3) {
      const u = zoomed(t, h.x, h.y, HALF * h.scale)
      if (u > 1) outOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
    }
    const e = show.ellie(t)
    if (e && (e.scale ?? 1) >= 0.3) {
      const u = zoomed(t, e.x, e.y, R * (e.scale ?? 1))
      if (u > 1) herOutOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
    }
  }
  check('married life: under Zoom Carl never leaves the frame, not even a corner of him', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))
  check('married life: under Zoom Ellie never leaves the frame either', herOutOfZoom.length === 0, herOutOfZoom.slice(0, 6).join(', '))

  // No wide shot lingers: a frame over 6 cells tall (where the two of them are a few pixels on a phone) lasts at most
  // 2.5 s, except the named reveals, each held to its window and to how wide it may go.
  const REVEALS: { what: string; from: number; to: number; cells: number }[] = [
    { what: 'the house made new, the machine as tall as it', from: 23.5, to: 37.6, cells: 10.2 },
    { what: 'the storm: the tree through the roof over the nursery, and the hole boarded', from: 127, to: 137.2, cells: 9.8 },
    { what: 'the hill, years later, too far for her now', from: 168, to: 173, cells: 9.6 },
    { what: 'the one toll, the whole empty church and its bell', from: 196.5, to: 200, cells: 7.6 },
    { what: 'the credits: the house small under the stars', from: CREDITS_AT - 2, to: perf.duration, cells: 22 },
  ]
  const wide: string[] = []
  let wideFrom = -1
  let widest = 0
  for (let t = 0; t <= perf.duration + 0.05; t += 0.05) {
    const c = t <= perf.duration ? cam(t).cells : 0
    const reveal = REVEALS.find((r) => t >= r.from && t <= r.to)
    if (reveal && c > reveal.cells) wide.push(`${t.toFixed(2)}: ${c.toFixed(1)} cells, wider than ${reveal.what} may go`)
    if (c > 6 && !reveal) {
      if (wideFrom < 0) { wideFrom = t; widest = 0 }
      widest = Math.max(widest, c)
    } else if (wideFrom >= 0) {
      if (t - wideFrom > 2.5) wide.push(`${wideFrom.toFixed(1)}–${t.toFixed(1)} (${widest.toFixed(1)} cells)`)
      wideFrom = -1
    }
  }
  check('married life: no wide shot lingers (over 6 cells for at most 2.5 s, but for the named reveals)', wide.length === 0, wide.slice(0, 6).join('; '))

  // Ellie: with him from the wedding to the hospital, never after; she never jumps in a place, and comes and goes
  // only out of shot or at a cut. At the kiss she touches him.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  }
  const seen = [1, 10, AT.waltz, 30, 45, 55, 68, 78, 101, 120, 150, 165, 172, 178, 185]
  const miss = seen.filter((t) => !inShot(t, show.ellie(t))).map((t) => `not in shot at ${t}`)
  for (const t of [CUT.funeral + 0.1, 195, CUT.home + 0.1, 230, DURATION]) if (show.ellie(t)) miss.push(`still here at ${t}`)
  check('married life: Ellie is with him from the wedding to the hospital, and gone from the church on', miss.length === 0, miss.join(', '))
  let worst = 0
  let worstAt = 0
  const pops: string[] = []
  let last = show.ellie(0)
  let lastLeg = show.owner(0)
  for (let t = 0.002; t <= perf.duration; t += 0.002) {
    const b = show.ellie(t)
    const leg = show.owner(t)
    const cut = leg !== lastLeg
    if (b && last && !cut) {
      const d = Math.hypot(b.x - last.x, b.y - last.y)
      if (d > worst) { worst = d; worstAt = t }
    }
    if (!cut && !!b !== !!last && (inShot(t, b) || inShot(t - 0.002, last))) pops.push(t.toFixed(3))
    last = b
    lastLeg = leg
  }
  check('married life: Ellie never jumps (no more than 0.04 cells in 2 ms)', worst <= 0.04, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
  check('married life: Ellie comes and goes only out of shot, or at a cut', pops.length === 0, pops.slice(0, 6).join(', '))
  const kiss = (() => {
    let d = Infinity
    for (let t = AT.waltz - 0.3; t <= AT.waltz + 0.6; t += 0.01) {
      const e = show.ellie(t)
      const c = show.where(t)
      if (e) d = Math.min(d, Math.hypot(e.x - c[0], e.y - c[1]))
    }
    return d
  })()
  check('married life: on the kiss (bar 1 of the waltz) they touch, close but not pressed', kiss >= 0.24 && kiss <= 0.34, kiss.toFixed(3))
  const cutsHeld = Object.values(CUTS).filter((c) => c.ellie).filter((c) => {
    const e0 = show.ellie(c.t - 0.001)
    const e1 = show.ellie(c.t + 0.001)
    const c0 = show.where(c.t - 0.001)
    const c1 = show.where(c.t + 0.001)
    return !e0 || !e1 || Math.hypot(e0.x - c0[0] - c.ellie![0], e0.y - c0[1] - c.ellie![1]) > 0.03 || Math.hypot(e1.x - c1[0] - c.ellie![0], e1.y - c1[1] - c.ellie![1]) > 0.03
  }).map((c) => c.t.toFixed(3))
  check('married life: at every cut she is where the seam says, on both sides of it', cutsHeld.length === 0, cutsHeld.join(', '))
  check('married life: they grow old together: his blue and her coral grey with the years, and hers is the colour she is drawn in',
    same(carlAt(1), CARL) && same(ellieAt(1), ELLIE) && !same(carlAt(200), CARL) && !same(ellieAt(175), ELLIE) &&
    [10, 100, 150, 175].every((t) => show.ellie(t)?.color === ellieAt(t)) && [10, 150].every((t) => show.ellie(t)?.id === ELLIE_ID))
  check('married life: the balloon is his from the hospital to the end, and not before',
    !balloonAt(show, BALLOON_FROM - 0.01) && !!balloonAt(show, BALLOON_FROM + 0.01) && !!balloonAt(show, DURATION) && near(BALLOON_FROM, CUT.hospital))

  // The end credits: words the page sets over the house, after he has sat down, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('married life: end credits over the house, set by the page, opening on Directed by Claude Opus 5.5 and naming Carl and Ellie Fredricksen, Michael Giacchino, Married Life, Up, Pete Docter and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Claude Opus 5.5', 'Carl Fredricksen', 'Ellie Fredricksen', 'Michael Giacchino', 'Married Life', 'Up', 'Pete Docter', 'p5.js'].every((w) => said.includes(w)) &&
    !/Stephen Wu|tech demo/i.test(said), said)
}
