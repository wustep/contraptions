/**
 * The checks for Ostinato: Ravel's Boléro, whole, as one tower that grows a storey for each turn of the tune, on the
 * recording's one comb. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/bolero-onsets.json'
import { BEAT, BAR, COLLAPSE, LAST, RECORDING, RETURN, STATEMENTS, STROKES, T0, THEMES, bar } from '../src/shows/versions/bolero/tower/music'
import { DRUM, INTO_CUP, LOOPS, R, RIDES, TOWER, UNFOLD, engineAt, lapOf, sOf, statementsOn, unfoldsAt } from '../src/shows/versions/bolero/tower/plan'
import { FALL_FROM, FINIAL, HEAD, LAST_RIDE, REST, TREAD_AT } from '../src/shows/versions/bolero/tower/finale'
import { DOWN } from '../src/shows/versions/bolero/tower/pose'
import { CARDS, CREDITS_AT, CREDITS_OK, DURATION, creditsAt } from '../src/shows/versions/bolero/tower/credits'
import { DRUM_LANDING, LIFT, MELODY, STICK, TREADS } from '../src/shows/versions/bolero/tower/hits'
import { stickLift } from '../src/shows/versions/bolero/tower/base'
import type { OstinatoShow } from '../src/shows/versions/bolero/tower/show'
import { ALONG } from '../src/shows/versions/bolero/tower/storey'
import { place } from '../src/shows/versions/bolero/tower/pose'

type Check = (name: string, ok: boolean, detail?: string) => void

const o = measured as unknown as {
  duration: number
  comb: { t0: number; beat: number }
  statements: { n: number; t: number; theme: string; drift_ms: number }[]
  heard: { A: number[]; B: number[] }
  form: { last: number; collapse_t: number; emajor: [number, number]; return: number }
}

export function checkOstinato(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as OstinatoShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check('ostinato: one take, Ostinato, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Ostinato' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('ostinato: the whole recording from zero, credited to Ravel and to Omega13a under CC BY 4.0, from Wikimedia Commons, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING &&
    !!perf.soundtrack?.src?.includes('bolero-omega13a') &&
    ['Maurice Ravel', 'Boléro', 'Omega13a', 'CC BY 4.0'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !!perf.soundtrack?.href?.startsWith('https://commons.wikimedia.org/'))

  // The recording keeps the score's tempo: one comb from the first bar to the last.
  const drifts = o.statements.map((s) => Math.abs(s.drift_ms))
  check('ostinato: one comb, a quarter = 72, every statement within 6 ms of it', near(o.comb.beat, 60 / 72) && near(T0, o.comb.t0) && Math.max(...drifts) <= 6, drifts.join(', '))
  const heardA = o.heard.A.filter((v) => v > 0).length / o.heard.A.length
  const heardB = o.heard.B.filter((v) => v > 0).length / o.heard.B.length
  check('ostinato: the tune as transcribed from the score is heard in the recording (A every note, B all but a few)', heardA === 1 && heardB >= 0.95, `${(heardA * 100).toFixed(0)}% · ${(heardB * 100).toFixed(0)}%`)
  check('ostinato: eighteen statements every 18 bars from bar 5, A A B B four times and then A B',
    STATEMENTS.length === 18 && STATEMENTS.every((s, k) => near(s.t, bar(5 + 18 * k), 1e-3) && s.theme === (k < 16 ? 'AABB'[k % 4] : 'AB'[k - 16])))

  check('ostinato: no portal and no cut', [0, 100, 400, 800, 846, perf.duration].every((t) => perf.cuts?.(t) === false))

  // The tower: ten storeys, each wider than the one under it, one over another on the mast.
  check('ostinato: ten storeys on the drum, each wider than the one under it and standing on it',
    TOWER.length === 10 && TOWER.every((st, n) => n === 0 || (st.w > TOWER[n - 1].w && near(st.floor, TOWER[n - 1].top))) && TOWER[0].floor < DRUM.head)
  check('ostinato: a storey for each pair of statements, and one each for the last two',
    TOWER.every((st) => statementsOn(st.n).every((k) => lapOf(k).storey === st.n && STATEMENTS[k].theme === st.theme)) && statementsOn(8).join() === '16' && statementsOn(9).join() === '17')
  check('ostinato: every storey has unfolded before the ball reaches it',
    TOWER.every((st) => unfoldsAt(st.n) + UNFOLD <= STATEMENTS[statementsOn(st.n)[0]].t + 1e-9 && unfoldsAt(st.n) >= (st.n === 0 ? bar(3) : STATEMENTS[statementsOn(st.n)[0] - 1].t + 40) - 1e-6))
  check('ostinato: each storey\'s engine is let in on its second statement (the last two, on their one)',
    TOWER.every((st) => { const ks = statementsOn(st.n); return near(engineAt(st.n), STATEMENTS[ks[ks.length - 1]].t) }))

  // Every note is a key, and the ball is on the key as the note sounds.
  const notes = STATEMENTS.reduce((n, s) => n + THEMES[s.theme].length, 0)
  const offKey: string[] = []
  for (const h of MELODY) {
    const loop = LOOPS[h.storey]
    const key = loop.keys[h.i]
    const knot = loop.knots.find(([q]) => near(q, h.q, 1e-9))
    if (!knot || !near(knot[1], key.s0, 1e-9) || key.s1 <= key.s0) offKey.push(`${h.k}:${h.q}`)
  }
  check('ostinato: every note of all eighteen statements is a key the ball crosses as it sounds', MELODY.length === notes && notes > 1700 && offKey.length === 0, `${MELODY.length} of ${notes}; off: ${offKey.slice(0, 8).join(', ')}`)
  const onComb = (t: number, eps = 1e-6) => Math.abs(((t - T0) / (BEAT / 12)) - Math.round((t - T0) / (BEAT / 12))) * (BEAT / 12) <= eps || Math.abs(((t - T0) / (BEAT / 6)) - Math.round((t - T0) / (BEAT / 6))) * (BEAT / 6) <= eps
  check('ostinato: every strike is on the comb (a note, a stroke, a step of the lift, a tread)', [...MELODY.map((h) => h.t), ...STICK, ...LIFT, ...TREADS].every((t) => onComb(t)))
  check('ostinato: the drum is struck on every stroke of its rhythm, from the first bar to the collapse, and the stick is down on each',
    STICK.length === 169 * 24 && STICK.every((t) => stickLift(t) < 0.004) && near(STICK[0], T0) && STICK[STICK.length - 1] < COLLAPSE,
    `${STICK.length} strokes`)
  check('ostinato: the lift steps only on strokes, with the ball in its cup',
    LIFT.length > 18 * 18 && LIFT.every((t) => STROKES.some((s) => near(s, t))) && [...RIDES, LAST_RIDE].every((r) => r.steps.every((s) => s > r.from && s < r.to)))
  check('ostinato: the tune\'s doublings grow: from the ninth statement, the storeys under the ball with its theme play along, more of them each time',
    ALONG.slice(0, 8).every((a) => a.length === 0) && ALONG[8].length === 1 && ALONG[16].length === 4 && ALONG[17].length === 4 &&
    ALONG.every((a, k) => a.every((n) => TOWER[n].theme === STATEMENTS[k].theme && n < lapOf(k).storey)))

  // One ball on one path: it never jumps and is never hidden.
  let jump = 0
  let jumpAt = 0
  let prev = show.where(0)
  let hidden = 0
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
    if (d > jump) { jump = d; jumpAt = t }
    prev = here
  }
  for (let t = 0; t <= perf.duration; t += 0.05) if (perf.show.at(t).hidden || perf.show.at(t).scale <= 0.02) hidden++
  check('ostinato: the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(4)} at ${jumpAt.toFixed(3)} s`)
  check('ostinato: the ball is never hidden', hidden === 0, `${hidden} samples`)

  // The ball is in the frame all the way, and under Zoom (half as close again), but for the tower's great wides: on each
  // storey's second time round the frame pulls back to the tower so far; in E major, the whole tower in its gold; and
  // the collapse.
  const wides: [number, number][] = [
    ...STATEMENTS.flatMap((s, k) => (lapOf(k).round === 1 ? [[s.t + 12.5 * BAR, s.t + 18 * BAR] as [number, number]] : [])),
    // From the ninth statement, the storeys under the ball playing along with it.
    ...STATEMENTS.flatMap((s, k) => (k >= 8 && lapOf(k).round === 0 ? [[s.t + 8.5 * BAR, s.t + 16.4 * BAR] as [number, number]] : [])),
    [bar(328), bar(334.8)],
    [bar(336.5), LAST + 1.6],
  ]
  const wide = (t: number) => wides.some(([a, b]) => t >= a && t <= b)
  const out: string[] = []
  const outZoom: string[] = []
  for (let t = 0; t <= perf.duration; t += 0.02) {
    const b = show.where(t)
    const f = cam(t)
    const dx = Math.abs(b[0] - f.x)
    const dy = Math.abs(b[1] - f.y)
    if (dx > (f.cells * 16) / 9 / 2 - R || dy > f.cells / 2 - R) out.push(t.toFixed(2))
    const z = f.cells / 1.5
    if (!wide(t) && (dx > (z * 16) / 9 / 2 - R || dy > z / 2 - R)) outZoom.push(t.toFixed(2))
  }
  check('ostinato: the ball is in the frame all the way', out.length === 0, `${out.length} out: ${out.slice(0, 8).join(', ')}`)
  check('ostinato: and under Zoom, but in the tower\'s great wides', outZoom.length === 0, `${outZoom.length} out: ${outZoom.slice(0, 8).join(', ')}`)

  // The finale: up the roof's stair a beat at a time in E major, into the finial on C's return, down onto the drum.
  check('ostinato: in E major the ball climbs the roof\'s stair a tread a beat, from bar 328 to the finial on C\'s return (bar 335)',
    TREAD_AT.length === 22 && near(TREAD_AT[0], bar(328)) && near(TREAD_AT[21], RETURN) && near(RETURN, bar(o.form.return)) &&
    TREAD_AT.every((t, i) => i === 0 || near(t - TREAD_AT[i - 1], BEAT)) && near(LAST_RIDE.from, sOf(17, INTO_CUP)))
  const inCup = [RETURN + 0.05, RETURN + 4, COLLAPSE - 0.05].every((t) => { const [x, y] = show.where(t); const [fx, fy] = place(FINIAL, 10, -1, t); return Math.hypot(x - fx, y - fy) < 0.03 })
  check('ostinato: it rests in the finial cup through the tutti\'s last bars', inCup)
  const onHead = show.where(DRUM_LANDING)
  check('ostinato: on the collapse it falls straight down onto the drum head, landing on the last chord, and comes to rest there',
    near(FALL_FROM, o.form.collapse_t) && near(DRUM_LANDING, o.form.last) && Math.hypot(onHead[0] - HEAD[0], onHead[1] - HEAD[1]) < 0.02 &&
    REST < LAST + 1.2 && Math.hypot(show.where(REST + 0.1)[0] - HEAD[0], show.where(REST + 0.1)[1] - HEAD[1]) < 1e-6 && near(show.where(perf.duration)[1], HEAD[1]))
  check('ostinato: the tower comes down round the drum by the last chord', Math.abs(DOWN - LAST) <= 0.15, `down at ${DOWN.toFixed(3)}, last chord ${LAST.toFixed(3)}`)

  // The credits.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('ostinato: end credits in the night after the last chord, set by the page, naming Claude Opus 5.5 as director, Maurice Ravel, Boléro, Omega13a and p5.js, gone before the end',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    said.includes('Directed by Claude Opus 5.5') && ['Maurice Ravel', 'Boléro', 'Omega13a', 'CC BY 4.0', 'p5.js'].every((w) => said.includes(w)) && !/private tech demo/i.test(said), said)
}
