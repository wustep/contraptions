/**
 * The checks for Composure: the Andante of Haydn's "Surprise" Symphony on a still board of pegs, with a launcher at its
 * foot firing a pellet of colour on each accent, timed to Karajan's recording and the clock measured from it. Called
 * by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/surprise-onsets.json'
import { BEATS, LAST, ONSETS, PHRASES, RECORDING, SURPRISE, beat } from '../src/shows/versions/surprise/pegboard/music'
import { CARDS, CREDITS_AT, CREDITS_OK, DURATION, LAST_GONE, creditsAt } from '../src/shows/versions/surprise/pegboard/credits'
import { SHOTS, HOMEWARD } from '../src/shows/versions/surprise/pegboard/score'
import { BURSTS, pegAt } from '../src/shows/versions/surprise/pegboard/grid'
import { angleAt, blockAt, pelletOf } from '../src/shows/versions/surprise/pegboard/launcher'
import { GAPS, HOME, MIDDLE, PEGS } from '../src/shows/versions/surprise/pegboard/geo'
import { YOUTUBE } from '../src/shows/versions/surprise/pegboard'

type Check = (name: string, ok: boolean, detail?: string) => void

const o = measured as unknown as { duration: number; beats: { t: number; heard: boolean }[]; phrases: unknown[] }

export function checkComposure(perf: Performance, version: ShowVersion, check: Check): void {
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

  check('composure: one take, Composure, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Composure' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('composure: the label\'s upload from its first second, YouTube only, credited to Haydn, Karajan and the Berlin Philharmonic',
    (perf.soundtrack?.offset ?? 0) === 0 && !perf.soundtrack?.src && perf.soundtrack?.youtube?.length === 1 && perf.soundtrack.youtube[0].id === YOUTUBE &&
    YOUTUBE === '14G_PDZWXVE' && perf.soundtrack.href === `https://www.youtube.com/watch?v=${YOUTUBE}` &&
    ['Haydn', 'Surprise', 'Andante', 'Karajan', 'Berliner Philharmoniker'].every((w) => perf.soundtrack?.credit?.includes(w)))
  check('composure: the show runs the whole video, then the credits in the quiet after the last chord, every card up and gone',
    near(perf.duration, DURATION) && DURATION >= RECORDING && CREDITS_OK && LAST_GONE <= DURATION && CARDS[0].at > LAST + 2)
  check('composure: the credits are the page\'s, after the last chord, and none before it',
    perf.titles === creditsAt && creditsAt(LAST).length === 0 && creditsAt(CREDITS_AT - 0.01).length === 0 && creditsAt(CARDS[1].at + 2).length > 0)
  check('composure: one frame, held, and nothing to cut', [0, 30, 120, 240, 334, perf.duration].every((t) => perf.cuts?.(t) === false &&
    JSON.stringify(perf.camera?.(t)) === JSON.stringify(perf.camera?.(0))))

  // The measured clock.
  check('composure: the clock is the measured one: 22 strains, 181 bars of two beats in order, the video\'s length',
    PHRASES.length === 22 && o.phrases.length === 22 && BEATS.length === 362 && BEATS.every((b, i) => i === 0 || b.t > BEATS[i - 1].t) &&
    BEATS[BEATS.length - 1].bar === 181 && near(RECORDING, o.duration))
  check('composure: most beats are on their own attack', BEATS.filter((b) => b.heard).length >= BEATS.length * 0.75, `${BEATS.filter((b) => b.heard).length}/${BEATS.length}`)
  check('composure: the surprise is beat 2 of bar 16, the loudest rise in the piece',
    near(beat(16, 2), SURPRISE, 0.002) && ONSETS.every((n) => n.jump <= ONSETS.find((m) => near(m.t, SURPRISE, 0.002))!.jump))

  // Every shot lands on the music, fired a beat before.
  const onBeat = (t: number) => BEATS.some((b) => b.heard && near(b.t, t, 1e-6))
  const onOnset = (t: number) => ONSETS.some((n) => near(n.t, t, 1e-6))
  const off = SHOTS.filter((s) => !onBeat(s.at) && !onOnset(s.at))
  check('composure: every shot lands on an attack the recording has', SHOTS.length >= 40 && off.length === 0, `${SHOTS.length} shots; off: ${off.map((s) => s.at.toFixed(3)).join(', ')}`)
  const unfired = SHOTS.filter((s) => {
    const flight = s.at - s.launch
    const beatThere = BEATS.some((b) => near(b.t, s.launch, 1e-6))
    return !(flight > 0.6 && flight < 1.3) || (!beatThere && flight > 1.0)
  })
  check('composure: every shot is fired on the beat before it lands (or, across a pause, a quarter before), and flies under a second and a half',
    unfired.length === 0, unfired.map((s) => `${s.i} ${s.launch.toFixed(3)}→${s.at.toFixed(3)}`).join(', '))
  check('composure: the surprise is the first shot, the hardest, in the middle gap; nothing lands before it, and the last chord lands there too',
    near(SHOTS[0].at, SURPRISE) && SHOTS[0].s === 1 && SHOTS.every((s, i) => i === 0 || (s.s < SHOTS[0].s && s.s * s.push < SHOTS[0].s * SHOTS[0].push)) && SHOTS[0].target.join() === MIDDLE.join() &&
    SHOTS.every((s, i) => i === 0 || s.at > SURPRISE) && near(SHOTS[SHOTS.length - 1].at, LAST) && SHOTS[SHOTS.length - 1].target.join() === MIDDLE.join())
  check('composure: every shot lands in a gap of the board, between four pegs', SHOTS.every((s) =>
    Number.isInteger(s.target[0]) && Number.isInteger(s.target[1]) && s.target[0] >= GAPS.x0 && s.target[0] <= GAPS.x1 && s.target[1] >= GAPS.y0 && s.target[1] <= GAPS.y1))
  const mirrors = SHOTS.filter((s) => s.mirrors !== null)
  check('composure: on a strain\'s repeat every shot lands in the mirror of the first time\'s',
    mirrors.length >= 15 && mirrors.every((s) => { const m = SHOTS[s.mirrors!]; return s.target[0] === -m.target[0] && s.target[1] === m.target[1] && m.at < s.at }))

  // The machine does its work in order, in the music's time.
  const disorder = SHOTS.filter((s, i) => {
    const prev = SHOTS[i - 1]
    if (prev && !(s.reload[0] > prev.launch && s.launch > prev.launch + 1.5)) return true
    if (!(s.reload[1] <= s.aim[0] + 1e-9 && s.aim[0] <= s.aim[1])) return true
    if (s.steps.length && !(s.aim[1] < s.steps[0] && s.steps.every((t, j) => (j === 0 || t > s.steps[j - 1]) && BEATS.some((b) => near(b.t, t, 1e-6))) && s.steps[s.steps.length - 1] < s.launch)) return true
    if (!s.steps.length && !(s.pull && s.pull[0] >= s.aim[1] && s.pull[1] < s.launch)) return true
    return false
  })
  check('composure: each shot in order: the lift, the swing, the clicks on the beats (or a pull), and the shot', disorder.length === 0, disorder.map((s) => s.i).join(', '))
  check('composure: the spring is drawn back a click on every bar of the pianissimo before the surprise',
    SHOTS[0].steps.length === 7 && SHOTS[0].steps.every((t, j) => near(t, beat(9 + j, 1))))
  check('composure: the launcher starts and ends pointing up the board', near(angleAt(0), HOME) && near(angleAt(perf.duration), HOME) && HOMEWARD[1] < CREDITS_AT)

  // Nothing jumps.
  let swing = 0
  let slide = 0
  let flown = 0
  for (let t = 0; t < perf.duration; t += 1 / 240) {
    swing = Math.max(swing, Math.abs(angleAt(t + 1 / 240) - angleAt(t)))
    // A frame apart: the block is let go in an instant, but over three frames, never in one.
    slide = Math.max(slide, Math.abs(blockAt(t + 1 / 60) - blockAt(t)))
  }
  for (const s of SHOTS) {
    let prev: [number, number] | null = null
    for (let t = s.launch + 0.12; t < s.at; t += 1 / 240) {
      const p = pelletOf(s, t)
      if (p?.where !== 'air') continue
      if (prev) flown = Math.max(flown, Math.hypot(p.x - prev[0], p.y - prev[1]))
      prev = [p.x, p.y]
    }
  }
  check('composure: the turntable, the block and the pellets never jump',
    swing < 0.03 && slide < 0.75 && flown < 0.12, `swing ${swing.toFixed(4)} rad and pellet ${flown.toFixed(3)} cells in 1/240 s, block ${slide.toFixed(3)} cells in a frame`)

  // The board: still between the accents, never jumping in a burst, and composed again after.
  let peg = 0
  for (const b of BURSTS.filter((_, i) => i % 6 === 0)) {
    const ids = b.touches.filter((_, j) => j % 5 === 0).map((tc) => tc.peg)
    for (const id of ids) {
      let prev = pegAt(id, b.at - 0.01)
      for (let t = b.at; t < b.until + 0.05; t += 1 / 240) {
        const now = pegAt(id, t)
        peg = Math.max(peg, Math.hypot(now.dx - prev.dx, now.dy - prev.dy), Math.abs(now.c - prev.c) / 4)
        prev = now
      }
    }
  }
  check('composure: no peg jumps or flashes in a burst', peg < 0.03, `${peg.toFixed(4)} cells (or colour/4) in 1/240 s`)
  const still = [1, 15, 29.0, 200, 336].filter((t) => BURSTS.every((b) => t < b.at || t > b.until))
  check('composure: between the bursts every peg is black and in its place',
    still.length >= 4 && still.every((t) => PEGS.every((_, i) => { const p = pegAt(i, t); return p.c === 0 && p.dx === 0 && p.dy === 0 })), still.join(', '))
  check('composure: the board is composed again before the credits', BURSTS.every((b) => b.until < CREDITS_AT))
}
