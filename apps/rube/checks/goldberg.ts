/**
 * The checks for Goldberg Variations (`versions/goldberg-variations/sonnet55.show.ts`), run by `check:shows`: Bach's
 * thirty-two pieces played in order from Deutsche Grammophon's own YouTube uploads, and round again, one lap of a
 * colonnade to each.
 */
import type { Performance, Version } from '../src/shows/registry'
import { performanceProblems } from '../src/shows/registry'
import { Transport } from '../src/shows/clock'
import { show } from '../src/shows/versions/goldberg-variations/rotunda'
import { ALBUM, CUES, PERIOD, STARTS, VARIATIONS, trackAt } from '../src/shows/versions/goldberg-variations/rotunda/music'
import { COLUMNS, RING, SEAT, lapAt, lapsAt, project, ridersAt, tiltAt, turnAt, viewAt } from '../src/shows/versions/goldberg-variations/rotunda/path'
import { camera } from '../src/shows/versions/goldberg-variations/rotunda/camera'
import { lampAt, petalAt, roomAt } from '../src/shows/versions/goldberg-variations/rotunda/scene'
import { CARDS, LAST_GONE, TITLES_OK, titlesAt } from '../src/shows/versions/goldberg-variations/rotunda/titles'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkGoldberg(perf: Performance, version: Version, check: Check): void {
  check('goldberg: in the picker it is Goldberg Variations, Sonnet 5.5, with no note and no byline',
    version.title === 'Goldberg Variations' && version.label === 'Sonnet 5.5' && version.note === undefined && !('director' in version))

  // The music: the album's own uploads, one video to a track, nothing of the recording in the build.
  const soundtrack = perf.soundtrack
  const credit = soundtrack?.credit ?? ''
  check('goldberg: the soundtrack is YouTube only, with no file: nothing of the recording is shipped',
    !!soundtrack && !soundtrack.src && (soundtrack.youtube?.length ?? 0) === 32)
  check('goldberg: it credits Bach, Víkingur Ólafsson and Deutsche Grammophon, and links the album',
    ['Bach', 'Goldberg Variations', 'Víkingur Ólafsson', 'Deutsche Grammophon', '2023'].every((w) => credit.includes(w)) &&
    soundtrack?.href === ALBUM && ALBUM.startsWith('https://www.youtube.com/playlist?list=OLAK5uy_'))
  check('goldberg: the Aria, Variations 1 to 30 and the Aria da capo, in order: thirty-two tracks, thirty-two distinct videos',
    VARIATIONS.length === 32 && VARIATIONS.every((v, i) => v.n === i) &&
    VARIATIONS[0].kind === 'aria' && VARIATIONS[31].kind === 'capo' && VARIATIONS[30].kind === 'quodlibet' &&
    new Set(VARIATIONS.map((v) => v.id)).size === 32 && VARIATIONS.every((v) => /^[\w-]{11}$/.test(v.id)))
  check('goldberg: the cues are the tracks laid end to end, each entering where the one before ends, each from its start',
    CUES.length === 32 && CUES.every((c, i) => c.id === VARIATIONS[i].id && c.from === 0 && near(c.at ?? -1, STARTS[i], 0.006)) &&
    CUES.every((c, i) => i === 0 || c.at! > CUES[i - 1].at!) && CUES[0].at === 0 &&
    soundtrack?.youtube?.every((c, i) => c === CUES[i]) === true)
  check('goldberg: the album is 74:06.52 of music, and no track is under fifty-five seconds',
    near(PERIOD, 4446.52, 1e-6) && VARIATIONS.every((v) => v.ms > 55000))

  // The loop: the show is the album once, goes round, and its music restarts with it.
  check('goldberg: a loop, and its soundtrack loops exactly its period from the show\'s zero',
    perf.loop === true && perf.duration === PERIOD && soundtrack?.loop === PERIOD && (soundtrack?.offset ?? 0) === 0 &&
    performanceProblems(perf).length === 0, performanceProblems(perf).join('; '))
  const t = new Transport({ duration: PERIOD, loop: true })
  check('goldberg: the clock goes round: past the end is the start, and a loop never ends',
    near(t.seek(PERIOD + 1.5), 1.5) && near(t.seek(-0.5), PERIOD - 0.5) && !t.ended)
  const a = show.at(0)
  const b = show.at(PERIOD - 1e-9)
  const ca = perf.camera!(0)
  const cb = perf.camera!(PERIOD - 1e-9)
  check('goldberg: the last moment of the period is the first: the ball where it started, and the camera where it was',
    Math.hypot(a.x - b.x, a.y - b.y) < 1e-4 && Math.hypot(ca.x - cb.x, ca.y - cb.y) < 1e-4 && near(ca.cells, cb.cells, 1e-4))
  check('goldberg: a time a period on is the same time', [0.3, 111.1, 1333, 3300, 4400].every((s) => {
    const p = show.at(s)
    const q = show.at(s + PERIOD)
    return Math.hypot(p.x - q.x, p.y - q.y) < 1e-6
  }))
  // Every part of the room is at rest in the dark at both ends, so the cut is between two rooms that are the same.
  const dark = (s: number): boolean => {
    const room = roomAt(s)
    return room.warm < 0.02 &&
      Array.from({ length: COLUMNS }, (_, c) => lampAt(c, s)).every((l) => l < 0.02) &&
      Array.from({ length: COLUMNS }, (_, c) => petalAt(c, s)).every((l) => l < 0.02) &&
      show.at(s).balls!.every((r) => (r.scale ?? 1) < 0.02)
  }
  check('goldberg: both ends of the period are the same dark room: no lamp lit, no petal open, no ball seen, no light from above',
    dark(0) && dark(PERIOD - 1e-9) && near(roomAt(0).second, roomAt(PERIOD - 1e-9).second, 1e-6) && near(roomAt(0).cool, roomAt(PERIOD - 1e-9).cool, 1e-6))
  check('goldberg: the ball comes out of the dark within seconds, and goes back into it over the credits',
    (show.at(5).balls![0].scale ?? 0) > 1 && (show.at(PERIOD - 20).balls![0].scale ?? 0) > 0.05 && (show.at(PERIOD - 2).balls![0].scale ?? 1) < 0.02)

  // One lap to a variation, at the recording's own pace.
  check('goldberg: k laps are done when track k starts: the ball is at the gate at the top of every variation',
    STARTS.slice(0, 32).every((s, i) => near(lapsAt(s), i, 1e-6)) && near(lapsAt(PERIOD - 1e-9), 32, 1e-4))
  let mono = true
  let slowest = Infinity
  let fastest = 0
  let prev = show.at(0)
  const grid = 0.5
  let jump = 0
  for (let s = grid; s < PERIOD; s += grid) {
    const p = show.at(s)
    const dt = grid
    if (lapsAt(s) < lapsAt(s - grid) - 1e-9) mono = false
    const sp = Math.hypot(p.x - prev.x, p.y - prev.y) / dt
    // Away from the ends, where the ball is drawn only as it comes out of the dark.
    if (s > 20 && s < PERIOD - 20) {
      slowest = Math.min(slowest, lapsAt(s) - lapsAt(s - grid))
      fastest = Math.max(fastest, sp)
    }
    jump = Math.max(jump, sp)
    prev = p
  }
  check('goldberg: the ball never goes back and never stops: a lap is always going on', mono && slowest > 0, `${slowest}`)
  check('goldberg: it is a slow ball, all through: never faster than a cell a second on the screen', fastest < 1, fastest.toFixed(3))
  check('goldberg: it never jumps: no step of half a second moves it more than half a cell', jump * grid < 0.5, (jump * grid).toFixed(3))
  const slow = VARIATIONS.map((_, i) => STARTS[i + 1] - STARTS[i]).map((len) => (2 * Math.PI * RING) / len)
  check('goldberg: the longest variation, the Adagio, is the ball\'s slowest lap and the shortest its fastest',
    slow[25] === Math.min(...slow) && Math.max(...slow) === slow[4])

  // The kinds of variation.
  const canons = VARIATIONS.filter((v) => v.kind === 'canon')
  check('goldberg: nine canons, every third variation from the third, at the unison, the second and so up to the ninth',
    canons.length === 9 && canons.every((c, i) => c.n === 3 * (i + 1) && c.interval === i + 1) &&
    canons.filter((c) => c.inverse).map((c) => c.n).join(',') === '12,15' && canons.find((c) => c.bassless)?.n === 27)
  check('goldberg: the minor variations are 15, 21 and 25; the overture opens the second half at 16',
    VARIATIONS.filter((v) => v.minor).map((v) => v.n).join(',') === '15,21,25' && VARIATIONS[16].kind === 'overture' &&
    VARIATIONS[25].kind === 'pearl')
  const mid = (n: number) => (STARTS[n] + STARTS[n + 1]) / 2
  const at = (n: number, f: number) => STARTS[n] + f * (STARTS[n + 1] - STARTS[n])
  // A canon's follower is one bar, one column, behind the leader, at its interval above; contrary motion goes the other way round.
  const follower = (n: number, f: number) => {
    const s = at(n, f)
    const { p } = lapAt(s)
    const riders = ridersAt(s)
    const [x, y] = project(2 * Math.PI * (VARIATIONS[n].inverse ? -1 : 1) * (p - 1 / COLUMNS), RING, SEAT + (VARIATIONS[n].interval! - 1) * 0.15, viewAt(s))
    const r = riders.find((q) => q.id === 1)
    return !!r && near(r.x, x, 1e-9) && near(r.y, y, 1e-9)
  }
  check('goldberg: a canon\'s second voice is one column behind on a rail as much higher as its interval; the inverted go the other way round',
    canons.every((c) => follower(c.n, 0.5)))
  check('goldberg: the canons\' second voices are come out and gone within their lap; the free variations have none',
    canons.every((c) => (ridersAt(at(c.n, 0.002)).find((q) => q.id === 1)?.scale ?? 0) < 0.2 && ridersAt(at(c.n, 0.5)).length === 2) &&
    VARIATIONS.filter((v) => v.kind === 'free').every((v) => ridersAt(mid(v.n)).length === 1))
  check('goldberg: the two hands are two balls at the middle of a lap and one at the ends; the quodlibet has six',
    VARIATIONS.filter((v) => v.kind === 'hands').every((v) => ridersAt(mid(v.n)).length === 2 && ridersAt(at(v.n, 0.0005)).every((r) => r.id === 0 || (r.scale ?? 0) < 0.1)) &&
    ridersAt(mid(30)).length === 6)
  const tr = trackAt(mid(25))
  check('goldberg: the Adagio, at the middle of it, is the black pearl', tr.i === 25 && ridersAt(mid(25)).find((r) => r.id === 0)?.color !== ridersAt(mid(5)).find((r) => r.id === 0)?.color)

  // The words.
  check('goldberg: every card is up and gone within the period and none is up with another, and the last is gone well before the seam',
    TITLES_OK && LAST_GONE < PERIOD - 20)
  check('goldberg: no card at either end of the period across the seam',
    titlesAt(0).length === 0 && titlesAt(PERIOD - 1e-9).length === 0 && titlesAt(PERIOD - 30).length === 0)
  check('goldberg: the title comes as the Aria begins, each variation is named as it starts, and the credits follow the da capo',
    titlesAt(4).some((c) => c.title) &&
    VARIATIONS.slice(1, 31).every((v) => titlesAt(STARTS[v.n] + 4.5).some((c) => c.names[0] === `Variation ${v.n}`)) &&
    titlesAt(STARTS[31] + 4.5).some((c) => c.names[0] === 'Aria da Capo') &&
    CARDS[CARDS.length - 2].role === 'Directed by' && CARDS[CARDS.length - 1].role === 'Music' &&
    titlesAt(CARDS[CARDS.length - 1].at + 3).some((c) => c.notes?.some((n) => n.includes('Víkingur Ólafsson'))))

  // The camera: it only ever looks at the room.
  let steady = true
  let bounds = true
  let step = 0
  let last = camera(0)
  for (let s = 1; s <= PERIOD; s += 1) {
    const c = camera(s)
    step = Math.max(step, Math.hypot(c.x - last.x, c.y - last.y), Math.abs(c.cells - last.cells))
    if (!(c.cells >= 7.5 && c.cells <= 16.5 && Math.abs(c.x) < 6 && c.y > -5 && c.y < 3)) bounds = false
    if (c.cells !== c.cells || c.x !== c.x || c.y !== c.y) steady = false
    last = c
  }
  check('goldberg: the camera stays on the room: between 7.5 and 16.5 cells high, never far from its middle', bounds && steady)
  // The view: it rises as the floor is written, and is low again at the seam; the room turns only in the Adagio.
  check('goldberg: the view rises as the floor is written, and at the seam is where it began',
    near(tiltAt(0), tiltAt(PERIOD - 1e-9), 1e-4) && tiltAt(mid(30)) > tiltAt(mid(1)) + 0.12 && tiltAt(mid(16)) > tiltAt(mid(15)))
  // A whole turn is no turn: how far apart two turns are, round the circle.
  const apart = (a: number, b: number) => Math.abs((((a - b + 0.5) % 1) + 1) % 1 - 0.5)
  const still = [STARTS[25] + 0.01, STARTS[26] - 0.01].every((s) => apart(turnAt(s + 0.5), turnAt(s - 0.5)) < 1e-4)
  check('goldberg: the room turns once in the Adagio, from rest to rest, and at no other time',
    turnAt(STARTS[25]) === 0 && near(turnAt(STARTS[26] - 1e-6), 1, 1e-4) && turnAt(STARTS[26] + 0.1) === 0 && turnAt(mid(24)) === 0 && still)
  check('goldberg: the camera never cuts: no second of it moves it more than a fifth of a cell', step < 0.2, step.toFixed(3))
}
