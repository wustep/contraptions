/**
 * The checks for Come Recover, All at Once: one ball through every world, on the recording's own onsets. Called by
 * `check-shows.ts` for that take.
 */
import type { Performance } from './src/shows/registry'
import onsets from '../../scripts/show-plans/eeaao-onsets.json'
import { STRIKES } from './src/shows/versions/come-recover/all-at-once/hits'
import { COMBS, CREDITS_AT, DURATION, HOME_HITS, JUMPS, fall, fight } from './src/shows/versions/come-recover/all-at-once/music'
import { CARDS, CREDITS_OK, creditsAt } from './src/shows/versions/come-recover/all-at-once/credits'
import { JOY_EYE } from './src/shows/versions/come-recover/all-at-once/void/peak'
import type { MultiverseShow } from './src/shows/versions/come-recover/all-at-once/show'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkAllAtOnce(perf: Performance, check: Check): void {
  const show = perf.show as MultiverseShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('all at once: the whole cue from zero, to its fade, credited to Son Lux and the film',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 &&
    !!perf.soundtrack?.src?.includes('eeaao-come-recover-demo') &&
    ['Son Lux', 'Come Recover', 'Everything Everywhere All at Once'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=IOh1H06Cx0w')

  // The worlds, in the order the story goes, each jump on the recording.
  const order = show.legs.map((l) => l.world).join(',')
  check('all at once: the laundromat, five worlds, the dark, everywhere, home, the rocks, the dark, and home',
    order === 'home,premiere,dojo,hotdog,hibachi,multi,void,multi,home,rocks,void,home', order)
  const o = onsets as { onsets: { t: number; s: number }[] }
  const jumpTimes = show.legs.slice(1).map((l) => l.from)
  const offJump = jumpTimes.filter((t) => !near(t, JUMPS.rocks) && !o.onsets.some((x) => x.s >= 0.45 && Math.abs(x.t - t) <= 0.02))
  check('all at once: every jump is on a clear onset (the drop into the rocks on the silence after the last hit)',
    jumpTimes.length === 11 && offJump.length === 0 && near(JUMPS.rocks, fall(0)), offJump.map((t) => t.toFixed(3)).join(', '))
  check('all at once: no portal anywhere, and no cut drawn', [0, 57.9, 58, 128, 191.3, 250, 300].every((t) => perf.cuts?.(t) === false))
  check('all at once: flickers only in the second before a jump, each a frame or three',
    show.flickers.every((f) => f.to - f.from <= 0.1 && jumpTimes.some((j) => j - f.from > 0 && j - f.from < 1.0)) && show.flickers.length >= 20)

  // One ball, one path: in its world it never jumps; at a jump the camera carries it, so on the screen it holds still.
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
  check('all at once: inside a world the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('all at once: every jump is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // Every strike lands on something the recording has: a measured onset, or a beat or an eighth of a comb where the pulse holds.
  const within = (t: number) =>
    o.onsets.some((x) => x.s >= 0.2 && Math.abs(x.t - t) <= 0.04) ||
    COMBS.some((c) => t >= c.from - 0.05 && t <= c.to + 0.05 && c.times.some((b) => Math.abs(b - t) <= 0.03))
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('all at once: every strike lands on a measured onset or on the pulse', off.length === 0, `${count} strikes; off: ${off.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const struck = (a: number, b: number, beat: (k: number) => number) => {
    let n = 0
    let of = 0
    for (let k = a; k <= b; k++) { of++; if (all.some((s) => Math.abs(s - beat(k)) <= 0.03)) n++ }
    return { n, of }
  }
  const allAtOnce = struck(72, 144, fight)
  const peak = struck(119, 160, fall)
  check('all at once: everywhere at once and the kindness after it strike nearly every beat of the fight\'s pulse (170.8 to 199.6 s)', allAtOnce.n >= allAtOnce.of * 0.85, `${allAtOnce.n}/${allAtOnce.of}`)
  check('all at once: the peak strikes nearly every beat (247.7 to 264.1 s)', peak.n >= peak.of * 0.85, `${peak.n}/${peak.of}`)
  check('all at once: home\'s last three hits are struck', HOME_HITS.every((h) => all.some((s) => Math.abs(s - h) <= 0.03)))

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('all at once: the ball is never hidden for more than 2.5 s', longest <= 2.5, `${longest.toFixed(2)} s`)

  // The family. Joy and Waymond each appear only in their own worlds' parts, never jump, and only come and go out of
  // shot or at a jump, when the whole world changes. Never more than one of each.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(b.y - f.y) < f.cells / 2
  }
  for (const who of ['joy', 'waymond'] as const) {
    const get = (t: number) => (who === 'joy' ? show.joy(t) : show.waymond(t))
    let worst = 0
    let worstAt = 0
    let pops: string[] = []
    let last = get(0)
    let lastWorld = show.presented(0)
    for (let t = 0.005; t <= perf.duration; t += 0.005) {
      const b = get(t)
      const world = show.presented(t)
      const changed = world !== lastWorld
      if (b && last && !changed) {
        const d = Math.hypot(b.x - last.x, b.y - last.y)
        if (d > worst) { worst = d; worstAt = t }
      }
      if (!changed && !!b !== !!last && (inShot(t, b) || inShot(t - 0.005, last))) pops.push(t.toFixed(3))
      last = b
      lastWorld = world
    }
    pops = pops.slice(0, 6)
    check(`all at once: ${who} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`all at once: ${who} only comes and goes out of shot, or at a jump`, pops.length === 0, pops.join(', '))
  }
  const counts = [58, 100, 150, 195, 220, 250, 270, 300].map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0).map((b) => b.id))
  check('all at once: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))

  // The googly eyes: Evelyn is given hers on the great hit, and Joy hers as she is pulled back.
  check('all at once: the googly eye comes on the great hit, beat 123 of the fight', near(JUMPS.eye, 191.216) && Math.abs(fight(123) - JUMPS.eye) < 0.03)
  check('all at once: Joy is given her eye while her mother pulls her back, after the brink and before home', JOY_EYE > JUMPS.brink && JOY_EYE < JUMPS.home)

  // The end credits: words the page sets over the dark room after the last hit, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('all at once: end credits after the last hit, set by the page, naming Stephen Wu, Opus 5.5, Evelyn, Joy, Waymond, Son Lux, the film and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT > HOME_HITS[2] && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    ['Directed by', 'Stephen Wu', 'Opus 5.5', 'Evelyn', 'Joy', 'Waymond', 'Son Lux', 'Come Recover', 'Everything Everywhere All at Once', 'Daniels', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo/i.test(said), said)
}
