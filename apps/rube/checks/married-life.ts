/**
 * The checks for Married Life (`versions/married-life/opus55.show.ts`), run by `check:shows`. Kept in their own
 * file: what the show promises is its own.
 */
import { zoomFrame as zoomOf, type Performance, type Version } from '../src/shows/registry'
import onsets from '../../../scripts/shows/plans/married-life-onsets.json'
import { STRIKES } from '../src/shows/versions/married-life/life/hits'
import { AT, BEATS, CUT, DURATION, ONSETS, PIANO, RECORDING, SEAM } from '../src/shows/versions/married-life/life/music'
import { CARDS, CREDITS_AT, CREDITS_OK, creditsAt } from '../src/shows/versions/married-life/life/credits'
import { CUTS } from '../src/shows/versions/married-life/life/seams'
import { CARL, ELLIE, ELLIE_ID, carlAt, ellieAt } from '../src/shows/versions/married-life/life/worlds'
import { BALLOON_FROM, balloonAt, ellieSpin, HALF, LEANS, lookOf, STIRS } from '../src/shows/versions/married-life/life/cast'
import { BALLOON_SIZE } from '../src/shows/versions/married-life/life/props/balloon'
import { ridge, STEP } from '../src/shows/versions/married-life/life/hill/hill'
import { INSIDE_SPAN } from '../src/shows/versions/married-life/life/inside/inside'
import { INSIDE_AT } from '../src/shows/versions/married-life/life/score'
import { JOLTS } from '../src/shows/versions/married-life/life/score'
import { FUN } from '../src/shows/versions/married-life/life/church/church'
import { ALONE } from '../src/shows/versions/married-life/life/house/front-plan'
import { R } from '../src/parts'
import { HAND } from '../src/shows/versions/married-life/life/clinic/hospital'
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
    !perf.soundtrack?.src &&
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
    const z = zoomOf(f, 1.5)
    return Math.max((Math.abs(x - z.x) + r) / ((z.cells * 16) / 9 / 2), (Math.abs(y - z.y) + r) / (z.cells / 2))
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
    { what: "bar 4's peal, the bell whole, and the run out of the church to the old house", from: 20.3, to: 23.0, cells: 6.6 },
    { what: 'the house made new, the machine as tall as it', from: 23.5, to: 37.6, cells: 10.2 },
    { what: 'the storm: the whole house, its roof and the garden tree, the limb through the roof into the nursery, and the hole boarded', from: 126.5, to: 137.2, cells: 17.6 },
    { what: 'the one toll, the whole empty church and its bell', from: 196.5, to: 200, cells: 7.6 },
    { what: 'the credits: the house small under the stars', from: CREDITS_AT - 2, to: perf.duration, cells: 27.5 },
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

  // A phone held upright (as tall as 9:21) sees far above and beside the composed frame (`stage.ts`, `perf.tall`):
  // wherever the house's inside is on, that whole stage is inside the sky and earth the set paints round it, so the
  // storm's wide has no edge in its sky.
  const ARM = 16 / 9
  const bare: string[] = []
  for (const [from, to] of [[CUT.nursery, CUT.doctor], [CUT.yard, CUT.climb]]) {
    for (let t = from; t < to; t += 0.05) {
      const f = cam(t)
      const high = f.cells * ARM * (21 / 9)
      const extra = high - f.cells
      const top = f.y - f.cells / 2 - (perf.tall ?? 0.5) * extra - INSIDE_AT[1]
      const foot = top + high
      const side = (f.cells * ARM) / 2
      const x = f.x - INSIDE_AT[0]
      if (top < INSIDE_SPAN[2] || foot > INSIDE_SPAN[3] || x - side < INSIDE_SPAN[0] || x + side > INSIDE_SPAN[1]) {
        bare.push(`${t.toFixed(2)} (top ${top.toFixed(1)}, foot ${foot.toFixed(1)})`)
      }
    }
  }
  check('married life: a phone held upright sees no edge to the house\'s sky, not even at the storm', bare.length === 0, bare.slice(0, 4).join(', '))

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
  // The balloon: he brings it into the hospital, gives it to her at her bedside, and it is his again from the church
  // on; it never jumps in a place (across a cut it moves with the cut, as everything does).
  const knotOnHim = (t: number) => {
    const b = balloonAt(show, t)
    const [x, y] = show.where(t)
    return !!b && Math.hypot(b.anchor[0] - x - HALF * 0.7, b.anchor[1] - y + HALF * 0.9) < 0.06
  }
  const knotOnHer = (t: number) => {
    const b = balloonAt(show, t)
    const e = show.ellie(t)
    return !!b && !!e && Math.hypot(b.anchor[0] - e.x - 0.03, b.anchor[1] - e.y + R * 0.92) < 0.02
  }
  const overHer = (() => {
    const t = HAND.to + 1.5
    const b = balloonAt(show, t)
    const e = show.ellie(t)
    const [x] = show.where(t)
    return !!b && !!e && Math.abs(b.at[0] - e.x - 0.18) < 0.12 && b.at[0] > x + 0.35
  })()
  check('married life: the balloon comes in with him to the hospital, is hers at her bedside, and his again from the church to the end',
    !balloonAt(show, BALLOON_FROM - 0.01) && knotOnHim(BALLOON_FROM + 0.01) && knotOnHim(HAND.from - 0.01) && knotOnHer(HAND.to + 0.05) &&
      knotOnHer(CUT.funeral - 0.01) && overHer && knotOnHim(CUT.funeral + 0.01) && !!balloonAt(show, DURATION) && near(BALLOON_FROM, CUT.hospital),
    `on him at ${BALLOON_FROM + 0.01}: ${knotOnHim(BALLOON_FROM + 0.01)}, on her at ${HAND.to + 0.05}: ${knotOnHer(HAND.to + 0.05)}, over her: ${overHer}, his in the church: ${knotOnHim(CUT.funeral + 0.01)}`)
  let balloonJump = 0
  let balloonJumpAt = 0
  for (let t = BALLOON_FROM + 0.004; t <= DURATION; t += 0.004) {
    if (show.owner(t) !== show.owner(t - 0.004)) continue
    const a = balloonAt(show, t - 0.004)
    const b = balloonAt(show, t)
    if (!a || !b) continue
    const d = Math.hypot(b.at[0] - a.at[0], b.at[1] - a.at[1])
    if (d > balloonJump) { balloonJump = d; balloonJumpAt = t }
  }
  check('married life: the balloon never jumps in a place (no more than 0.04 cells in 4 ms)', balloonJump <= 0.04, `${balloonJump.toFixed(3)} at ${balloonJumpAt.toFixed(3)} s`)

  // The heaviest note is felt through the frame, and only it: the camera takes one blow, on the toll, a damped swing of
  // at most 1.5% of the frame's height. The balloon is stirred by the toll and its answer and nothing else; at home it
  // leans toward him only on the piano's own notes, after he has sat down and before the credits.
  const pianoNote = (t: number) => PIANO.some((n) => Math.abs(n.t - t) <= 0.01)
  check('married life: the frame takes a blow only on the toll (at most 1.5% of its height), the balloon is stirred only by the toll and its answer, and at home it leans only on the piano\'s notes',
    JOLTS.length === 1 && near(JOLTS[0].t, AT.church) && JOLTS[0].amp <= 0.015 &&
      STIRS.length === 2 && near(STIRS[0].t, FUN.toll) && near(STIRS[1].t, FUN.answer) &&
      LEANS.length > 0 && LEANS.every((l) => pianoNote(l.t) && l.t > ALONE.sit && l.t < CREDITS_AT),
    `jolts ${JOLTS.map((j) => j.t.toFixed(3)).join(', ')}; stirs ${STIRS.map((x) => x.t.toFixed(3)).join(', ')}; leans ${LEANS.map((l) => l.t.toFixed(3)).join(', ')}`)

  // The end credits: words the page sets over the house, after he has sat down, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('married life: end credits over the house, set by the page, opening on Directed by Claude Opus 5.5 and naming Carl and Ellie Fredricksen, Michael Giacchino, Married Life, Up, Pete Docter and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Claude Opus 5.5', 'Carl Fredricksen', 'Ellie Fredricksen', 'Michael Giacchino', 'Married Life', 'Up', 'Pete Docter', 'p5.js'].every((w) => said.includes(w)) &&
    !/Stephen Wu|tech demo/i.test(said), said)

  // Under Zoom the two of them keep off the frame's edges, not only inside it (Zoom's own hold, `zoom.ts`): neither is
  // within an eighth of its half size of an edge for 2.5 s or more, except where the staging fills the Zoom frame: the
  // nursery, him at the winch and her on the cradle nine tenths of its width apart, and the ward, the balloon over them
  // and the two of them under it. And the balloon's crown is never cut by more than a sliver (0.08 of
  // the half height) under Zoom.
  const zoomFrame = (t: number) => {
    const f = cam(t)
    const z = zoomOf(f, 1.5)
    const zh = z.cells / 2
    return { zh, zw: (zh * 16) / 9, zy: z.y, zx: z.x }
  }
  let edgeRun = 0
  let edgeFrom = 0
  let edgeWorst = 0
  let edgeWorstAt = ''
  let crown = Infinity
  let crownAt = 0
  for (let t = 0; t <= perf.duration; t += 0.05) {
    const { zh, zw, zy, zx } = zoomFrame(t)
    const h = show.at(t)
    const e = show.ellie(t)
    let worst = 0
    const bodies: [number, number, number][] = []
    if (!h.hidden && h.scale >= 0.3) bodies.push([h.x, h.y, HALF * h.scale])
    if (e && (e.scale ?? 1) >= 0.3) bodies.push([e.x, e.y, R * (e.scale ?? 1)])
    for (const [x, y, r] of bodies) worst = Math.max(worst, (y + r - zy) / zh, (zy - y + r) / zh, (x + r - zx) / zw, (zx - x + r) / zw)
    const full = (t >= 64.5 && t <= 69.5) || (t >= CUT.hospital - 0.3 && t <= 186.0)
    if (worst > 0.88 && !full) {
      if (edgeRun === 0) edgeFrom = t
      edgeRun += 0.05
      if (edgeRun > edgeWorst) { edgeWorst = edgeRun; edgeWorstAt = `${edgeFrom.toFixed(2)} s` }
    } else edgeRun = 0
    const b = balloonAt(show, t)
    if (b) {
      const [, wy] = show.where(t)
      const c = (h.y + (b.at[1] - wy) - BALLOON_SIZE.ry - (zy - zh)) / zh
      if (c < crown) { crown = c; crownAt = t }
    }
  }
  check('married life: under Zoom the two of them keep off the frame\'s edges (never within an eighth of an edge for 2.5 s, but in the nursery and the ward, where they fill it)',
    edgeWorst < 2.5, `longest ${edgeWorst.toFixed(2)} s from ${edgeWorstAt}`)
  check('married life: under Zoom the balloon\'s crown is never cut by more than a sliver (0.08 of the half height)',
    crown >= -0.08, `${crown.toFixed(3)} at ${crownAt.toFixed(2)} s`)

  // Zoom's hold moves as gently as the camera's own move: the frame's sharpest change of speed under Zoom (pan in frame
  // heights and zoom in log units, a second squared, at 60 fps, cuts and the toll's blow aside) is at most twice the
  // show's own. Straight lines between the hold's samples once made it twenty times (a judder each tenth of a second).
  const sharpest = (zoomed: boolean) => {
    const dt = 1 / 60
    const cutTimes: number[] = Object.values(CUT)
    const at = (t: number) => {
      const f = cam(t)
      const z = zoomed ? zoomOf(f, 1.5) : f
      return { x: z.x, y: z.y, L: Math.log(z.cells), cells: z.cells }
    }
    let worst = 0
    let worstAt = 0
    for (let t = 2 * dt; t < perf.duration - 2 * dt; t += dt) {
      if (cutTimes.some((c) => Math.abs(t - c) < 0.05) || JOLTS.some((j) => t > j.t - 0.05 && t < j.t + 1.5)) continue
      const a = at(t - dt)
      const b = at(t)
      const c = at(t + dt)
      const v = Math.hypot((c.x - 2 * b.x + a.x) / b.cells, (c.y - 2 * b.y + a.y) / b.cells, c.L - 2 * b.L + a.L) / dt / dt
      if (v > worst) { worst = v; worstAt = t }
    }
    return [worst, worstAt]
  }
  const [own, ownAt] = sharpest(false)
  const [inZoom, inZoomAt] = sharpest(true)
  check('married life: under Zoom the frame moves as gently as the show\'s own (its sharpest change of speed at most twice the show\'s)',
    inZoom <= 2 * own, `Zoom ${inZoom.toFixed(2)} at ${inZoomAt.toFixed(2)} s; the show's ${own.toFixed(2)} at ${ownAt.toFixed(2)} s`)

  // His square and her ball never overlap (by more than 0.02 cells), anywhere she is with him: touching at the kiss,
  // never pressed into one shape (a step on top of his lean once pressed his corner over her there).
  let overlap = 0
  let overlapAt = 0
  for (let t = 0; t <= CUT.funeral; t += 0.01) {
    const e = show.ellie(t)
    const h = show.at(t)
    if (!e || h.hidden) continue
    const tilt = show.pose(t)?.tilt ?? 0
    const dx = e.x - h.x
    const dy = e.y - h.y
    const lx = Math.cos(-tilt) * dx - Math.sin(-tilt) * dy
    const ly = Math.sin(-tilt) * dx + Math.cos(-tilt) * dy
    const gap = Math.hypot(Math.max(Math.abs(lx) - HALF, 0), Math.max(Math.abs(ly) - HALF, 0)) - R * (e.scale ?? 1)
    if (-gap > overlap) { overlap = -gap; overlapAt = t }
  }
  check('married life: his square and her ball never overlap (by more than 0.02 cells)', overlap <= 0.02, `${overlap.toFixed(3)} at ${overlapAt.toFixed(2)} s`)

  // On the hill his hurry down to her shows on screen: while he runs flat out (175.0 to 176.2 s) he keeps moving toward
  // her in the frame, at least 3% of its width a second, under Zoom too; a camera that catches up at his own speed
  // stands him still mid-run, and that reads as hesitating.
  for (const zoomed of [false, true]) {
    const across = (t: number) => {
      const z = zoomed ? zoomOf(cam(t), 1.5) : cam(t)
      return (show.at(t).x - z.x) / ((z.cells * 16) / 9)
    }
    let slowest = Infinity
    let slowestAt = 0
    for (let t = 175.0; t <= 176.2; t += 0.02) {
      const v = (across(t + 0.02) - across(t)) / 0.02
      if (v < slowest) { slowest = v; slowestAt = t }
    }
    check(`married life: on the hill he keeps moving toward her on screen while he runs${zoomed ? ', under Zoom' : ''}`,
      slowest >= 0.03, `${(slowest * 100).toFixed(1)}% of the width a second at ${slowestAt.toFixed(2)} s`)
  }

  // On the fieldstone, given way, she lies slumped, not round like a ball at rest: from 176.8 to 178.7 s, before her
  // answer, drawn at most 92% of her height and at least 1.2 times as wide as high.
  let slumpWorst = ''
  for (let t = 176.8; t <= 178.7; t += 0.05) {
    const e = show.ellie(t)
    const h = e?.scale ?? 1
    const w = h * (e?.stretch ?? 1)
    if (!e || h > 0.92 || w / h < 1.2) { slumpWorst = `${t.toFixed(2)} s: height ${h.toFixed(3)}, width ${(w / h).toFixed(2)} times it`; break }
  }
  check('married life: on the fieldstone she lies slumped, not round', slumpWorst === '', slumpWorst)

  // Her face, the dot, is steered where the story needs it (`LOOKS`): at him for the kiss, at the crest of the dance and
  // on the fieldstone; up at the clouds on the blanket; at him in her armchair. And it never turns faster than her own
  // roll would turn it, beyond a brisk turn (0.15 rad in a 60 fps frame more than her roll): no snap.
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
  const drawn = (t: number) => lookOf(show, t, ellieSpin(show, t))
  const toHim = (t: number) => {
    const e = show.ellie(t)!
    const c = show.at(t)
    return Math.atan2(c.y - 0.12 - e.y, c.x - e.x)
  }
  const beats: [string, number, () => number][] = [
    ['the kiss', 17.9, () => toHim(17.9)],
    ['her armchair', 47.3, () => toHim(47.3)],
    ['the clouds', 56, () => -1.35],
    ['the crest', 157.5, () => toHim(157.5)],
    ['the fieldstone', 179.6, () => toHim(179.6)],
  ]
  const offs = beats.map(([n, t, at]) => [n, Math.abs(wrap(drawn(t) - at()))] as [string, number])
  check('married life: her face looks where the story needs it (at him at the kiss, in her armchair, at the crest and on the fieldstone; up at the clouds)',
    offs.every(([, d]) => d < 0.35), offs.map(([n, d]) => `${n} ${((d * 180) / Math.PI).toFixed(0)}°`).join(', '))
  let snap = 0
  let snapAt = 0
  for (let t = 0; t <= CUT.funeral; t += 1 / 120) {
    if (!show.ellie(t) || !show.ellie(t + 1 / 60)) continue
    const d = Math.abs(wrap(drawn(t + 1 / 60) - drawn(t)))
    const o = Math.abs(wrap(ellieSpin(show, t + 1 / 60) - ellieSpin(show, t)))
    if (d - o > snap) { snap = d - o; snapAt = t }
  }
  check('married life: her face never snaps round (at most 0.15 rad a frame faster than her own roll)', snap <= 0.15, `${snap.toFixed(3)} at ${snapAt.toFixed(2)} s`)

  // On the hill's flank they rest on the slope, not in it (`seat`): their outline never cuts into the drawn ground by
  // more than a twentieth of R, until she gives way (her slump is the story's).
  const sink = (cx: number, cy: number) => {
    let best = Infinity
    for (let x = cx - 1; x <= Math.min(cx + 1, STEP.x0); x += 0.004) best = Math.min(best, Math.hypot(x - cx, ridge(x) + R - cy))
    return best / R - 1
  }
  let flank = 0
  let flankAt = 0
  for (let t = CUT.climb; t <= 174.3; t += 0.05) {
    const [cx, cy] = show.where(t)
    const h = show.at(t)
    const e = show.ellie(t)
    if (cx < STEP.x0 - 0.2) { const s = sink(cx, cy); if (s < flank) { flank = s; flankAt = t } }
    if (e) {
      const ex = e.x - h.x + cx
      const ey = e.y - h.y + cy
      if (ex < STEP.x0 - 0.2) { const s = sink(ex, ey); if (s < flank) { flank = s; flankAt = t } }
    }
  }
  check('married life: on the hill\'s flank they rest on the slope, not in it (until she gives way)', flank >= -0.05, `${flank.toFixed(3)} R at ${flankAt.toFixed(2)} s`)
}
