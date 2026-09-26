/**
 * The checks for Caravan (`versions/caravan/opus55.show.ts`), run by `check:shows`: Whiplash's finale, one ball
 * through Shaffer, the road and Carnegie Hall, every strike on the recording.
 *
 * The picker, the soundtrack, the places, one path, strikes on the music, the people's continuity, the credits; and
 * what the built parts keep: the densest strike stretch in the catalogue, the solo's strong strokes struck, the
 * rubato stroke for stroke, the crash's breaks, the people where the film has them, and the fist.
 */
import type { Performance, Version } from '../src/shows/registry'
import type { ShowBall } from '../src/show'
import onsetsFile from '../../../scripts/shows/plans/caravan-onsets.json'
import { show as caravanShow } from '../src/shows/versions/caravan/whiplash'
import { SWITCH } from '../src/shows/versions/caravan/whiplash/score'
import { STRIKES } from '../src/shows/versions/caravan/whiplash/hits'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/caravan/whiplash/credits'
import { BASS, BREAKS, CHORD, COMBS, CYMBALS, DURATION, FINAL, HUSH, KICKS, RECORDING, RIDE, SNARES, SOLO } from '../src/shows/versions/caravan/whiplash/music'
import { poseAt } from '../src/shows/versions/caravan/whiplash/carnegie/conductor'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkCaravan(perf: Performance, version: Version, check: Check): void {
  const show = caravanShow
  const cam = perf.camera!
  const data = onsetsFile as unknown as { duration: number; onsets: { t: number; s: number }[] }

  check('caravan: in the picker it is Caravan, Opus 5.5, with no note and no byline',
    version.title === 'Caravan' && version.label === 'Opus 5.5' && version.note === undefined && !('director' in version))
  check('caravan: the whole recording from zero, credited to Juan Tizol, Duke Ellington, John Wasson and Whiplash, with its label upload',
    perf.show === show && near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 &&
    !!perf.soundtrack?.src?.includes('whiplash-caravan-demo') && near(RECORDING, data.duration) && DURATION > RECORDING &&
    ['Juan Tizol', 'Duke Ellington', 'John Wasson', 'Caravan', 'Whiplash'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=38CRu1rCaKg' &&
    perf.soundtrack?.youtube?.length === 1 && perf.soundtrack.youtube[0].id === '38CRu1rCaKg')

  // The places, in the film's order, each changing on the music.
  check('caravan: Shaffer, then the road from the band\'s loud return, then Carnegie Hall from the last chorus',
    show.universe(0).world.name === 'shaffer' && show.universe(1).world.name === 'road' && show.universe(2).world.name === 'carnegie' &&
    show.indexAt(SWITCH.road - 0.001) === 0 && show.indexAt(SWITCH.road + 0.001) === 1 &&
    show.indexAt(SWITCH.carnegie - 0.001) === 1 && show.indexAt(SWITCH.carnegie + 0.001) === 2)
  check('caravan: no portal anywhere, and no cut drawn', [0, 1, 2].every((i) => show.universe(i).pieces.every((p) => p.piece.name !== 'portal')) &&
    [0, 100, 200, 300, 450, 560].every((t) => perf.cuts?.(t) === false))

  // One thread, one continuous path: never a jump, the changes of place included.
  let jump = 0
  let at = 0
  let prev = show.where(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
    if (d > jump) { jump = d; at = t }
    prev = here
  }
  check('caravan: Andrew never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${at.toFixed(3)} s`)
  let hidden = 0
  let longest = 0
  let longAt = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    if (hidden > longest) { longest = hidden; longAt = t }
  }
  check('caravan: Andrew is never hidden for more than 2 s', longest <= 2.0, `${longest.toFixed(2)} s at ${longAt.toFixed(2)}`)

  // Every strike lands on the music: the tune's click (a beat or an eighth, ±30 ms), the last chorus's comb, a
  // measured onset (±35 ms, at least a little strong), or, in the solo, a stroke of one drum measured on its own
  // or of the ride's rubato (±30 ms).
  const marks = data.onsets.filter((o) => o.s >= 0.15).map((o) => o.t)
  const onMark = (t: number) => marks.some((m) => Math.abs(m - t) <= 0.035)
  const onComb = (name: string, t: number) => COMBS.filter((c) => c.name === name).some((c) => t >= c.from - 0.05 && t <= c.to + 0.05 && c.times.some((b) => Math.abs(b - t) <= 0.03))
  const drumStrokes = [...KICKS, ...SNARES, ...CYMBALS].filter((o) => o.s >= 0.35).map((o) => o.t)
  const onRide = (t: number) => RIDE.some((r) => Math.abs(r - t) <= 0.03) || drumStrokes.some((r) => Math.abs(r - t) <= 0.03)
  const off: string[] = []
  let count = 0
  for (const [group, parts] of Object.entries(STRIKES) as [keyof typeof STRIKES, Record<string, number[]>][]) {
    for (const [name, list] of Object.entries(parts)) {
      for (const t of list) {
        count++
        const ok = group === 'tune' ? onComb('tune', t) || onMark(t) : group === 'shout' ? onComb('shout', t) || onMark(t) : onMark(t) || onRide(t)
        if (!ok) off.push(`${name} ${t.toFixed(3)}`)
      }
    }
  }
  check('caravan: every strike lands on the music', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const all: number[] = Object.values(STRIKES).flatMap((g: Record<string, number[]>) => Object.values(g).flat()).sort((a, b) => a - b)
  check('caravan: the final cut-off is struck', all.some((t) => Math.abs(t - FINAL) <= 0.03))
  const struck = (t: number, eps: number) => all.some((s) => Math.abs(s - t) <= eps)
  let dense = 0
  for (let i = 0, j = 0; i < all.length; i++) {
    while (all[i] - all[j] > 10) j++
    dense = Math.max(dense, i - j + 1)
  }
  check('caravan: the solo is the densest strike stretch in the catalogue (60 or more strikes in some ten seconds)', dense >= 60, `${dense}`)
  const strong = [...KICKS, ...SNARES, ...CYMBALS].filter((o) => o.t > SOLO && o.t < HUSH && o.s >= 1.0)
  const missed = strong.filter((o) => !struck(o.t, 0.035))
  check('caravan: the solo strikes its strong strokes (95% of every drum\'s strokes at 1.0 or more)', missed.length <= strong.length * 0.05, `${strong.length - missed.length} of ${strong.length}`)
  check('caravan: the rubato strikes every stroke of the ride, one by one', RIDE.length === 162 && RIDE.every((r) => struck(r, 0.03)))
  check('caravan: the crash strikes every one of the stop-time breaks', BREAKS.length === 12 && BREAKS.every((b) => struck(b, 0.03)))

  // The people: they never jump where they can be seen, and come and go only out of shot or at a change of place.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 + 0.2 && Math.abs(b.y - f.y) < f.cells / 2 + 0.2
  }
  const atSwitch = (t: number) => Math.abs(t - SWITCH.road) < 0.002 || Math.abs(t - SWITCH.carnegie) < 0.002
  for (const [name, who] of [['Fletcher', 'fletcher'], ['Jim', 'jim'], ['Tanner', 'tanner']] as const) {
    let gJump = 0
    let gAt = 0
    const pops: string[] = []
    let gPrev: ShowBall | null = show.person(who, 0)
    for (let t = 0.001; t <= perf.duration; t += 0.001) {
      const g = show.person(who, t)
      if (g && gPrev && !atSwitch(t)) {
        const d = Math.hypot(g.x - gPrev.x, g.y - gPrev.y)
        if (d > gJump) { gJump = d; gAt = t }
      }
      if (!atSwitch(t)) {
        if (!gPrev && inShot(t, g)) pops.push(`in at ${t.toFixed(3)}`)
        else if (gPrev && !g && inShot(t - 0.001, gPrev)) pops.push(`out at ${t.toFixed(3)}`)
      }
      gPrev = g
    }
    check(`caravan: ${name} never jumps where he can be seen (no more than 0.04 cells a millisecond)`, gJump <= 0.04, `${gJump.toFixed(3)} at ${gAt.toFixed(3)} s`)
    check(`caravan: ${name} comes and goes only out of shot, or at a change of place`, pops.length === 0, pops.slice(0, 8).join(', '))
  }
  check('caravan: Jim only at Carnegie, Tanner never there, Fletcher on his podium through the solo',
    [10, 100, 150, 200, 240].every((t) => !show.jim(t)) && [250, 300, 400, 500, 560].every((t) => !show.tanner(t)) &&
    [SOLO + 1, 300, 400, 500, 540].every((t) => !!show.fletcher(t)))
  // Where the film has them: Fletcher in the practice room's doorway on the bass; Fletcher and Tanner in the band
  // room; Tanner at the competition; Jim holding his son at the stage door under the held chord, close and not
  // pressed; Jim in the wings through the solo; and the fist, once, on the cut-off.
  const gap = (t: number, b: ShowBall | null) => {
    if (!b) return Infinity
    const [x, y] = show.where(t)
    return Math.hypot(b.x - x, b.y - y)
  }
  check('caravan: Fletcher at the practice room\'s door on the bass; Fletcher and Tanner in the band room; Tanner at the competition',
    !!show.fletcher(BASS + 1) && [40, 70, 100, 120].every((t) => !!show.fletcher(t) && !!show.tanner(t)) && [175, 185].every((t) => !!show.tanner(t)))
  check('caravan: his father holds him at the stage door under the held chord (close, never flush)',
    [CHORD + 0.8, CHORD + 2, CHORD + 3.2].every((t) => gap(t, show.jim(t)) >= 0.27 && gap(t, show.jim(t)) <= 0.45))
  check('caravan: his father watches from the wings by the stage door, from the solo to the end',
    [SOLO + 1, 300, 360, 450, 530, 570].every((t) => { const j = show.jim(t); return !!j && gap(t, j) > 4 }))
  let fists = 0
  for (let t = SOLO; t < DURATION; t += 0.05) if (poseAt(t).right.hand === 'fist' || poseAt(t).left.hand === 'fist') fists++
  check('caravan: Fletcher\'s fist closes once, on the final cut-off, and nowhere before it',
    [poseAt(FINAL + 0.05).right.hand, poseAt(FINAL + 0.05).left.hand].includes('fist') && poseAt(FINAL - 0.1).right.hand !== 'fist' && poseAt(FINAL - 0.1).left.hand !== 'fist' && fists > 0 &&
    Array.from({ length: Math.floor((FINAL - 0.05 - SOLO) / 0.05) }, (_, i) => SOLO + i * 0.05).every((t) => poseAt(t).right.hand !== 'fist' && poseAt(t).left.hand !== 'fist'))

  const crowd = [5, 60, 150, 190, 250, 300, 460, 545].map((t) => show.at(t).balls ?? [])
  check('caravan: every ball on the stage is someone, once', crowd.every((b) => new Set(b.map((x) => x.id)).size === b.length && b.length <= 4))

  // The end credits: words the page sets (the canvas sets none), after the fist, over the dark hall.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('caravan: end credits after the cut-off, set by the page: directed by Claude Opus 5.5, the four balls, the music and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CARDS[0].at - 0.05).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && !/Stephen Wu/.test(said) &&
    ['Andrew Neiman', 'Terence Fletcher', 'Jim Neiman', 'Carl Tanner', 'Juan Tizol', 'Duke Ellington', 'John Wasson', 'Caravan', 'Whiplash', 'p5.js'].every((w) => said.includes(w)) &&
    !/tech demo/i.test(said), said)
}
