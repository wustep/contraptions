/**
 * The checks for Windowlight (`versions/near-light/opus55.show.ts`), run by `check:shows`: Ólafur Arnalds' Near
 * Light round a small machine on a winter windowsill, as a loop with no seam.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sectionOf, type Performance, type Version } from '../src/shows/registry'
import { Transport } from '../src/shows/clock'
import { show } from '../src/shows/versions/near-light/windowlight'
import { BAR, BEAT, BARS, MARGIN, ONSETS, PERIOD, PHASE, bar, beatAt, section } from '../src/shows/versions/near-light/windowlight/music'
import { CATCHES, POURS, SEATS, STOP, WEIGHTS, arm, REST } from '../src/shows/versions/near-light/windowlight/cups'
import { AMPLITUDE_BEFORE, CATCH, DRUMS, INTO_SCREW, OVER, PASS_TIMES, PUSHES, amplitude, angle, hammer } from '../src/shows/versions/near-light/windowlight/trough'
import { AT_TOP, SCREW_TURNS, turns, climbed } from '../src/shows/versions/near-light/windowlight/screw'
import { BELL_TIMES, BELLS, BOARD, along, bell } from '../src/shows/versions/near-light/windowlight/rail'
import { ALIGHT, TURN, wheelAngle } from '../src/shows/versions/near-light/windowlight/wheel'
import { CHUTE_CREST_V, LAND, OVER_CREST, run } from '../src/shows/versions/near-light/windowlight/chute'
import { LEGS, spin, squash, where } from '../src/shows/versions/near-light/windowlight/route'
import { auroraLight } from '../src/shows/versions/near-light/windowlight/room'
import { cellsAt } from '../src/shows/versions/near-light/windowlight/camera'
import { lampBreath } from '../src/shows/versions/near-light/windowlight/light'
import { CARDS, TITLES_OK, titlesAt } from '../src/shows/versions/near-light/windowlight/titles'
import { GONDOLAS, LAMP, RAIL_TO, TROUGH_LEFT, TROUGH_LIP, WHEEL_R } from '../src/shows/versions/near-light/windowlight/layout'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
const onsetNear = (t: number, tol: number, min = 0) => ONSETS.some((o) => Math.abs(o.t - t) <= tol && o.s >= min)

export function checkWindowlight(perf: Performance, version: Version, check: Check): void {
  check('windowlight: in the picker it is Windowlight, Opus 5.5, with no note and no byline, on the Ambient shelf',
    version.title === 'Windowlight' && version.label === 'Opus 5.5' && version.note === undefined && !('director' in version) && sectionOf('near-light') === 'Ambient')

  // The music: the label's own recording, demo only, looped round whole bars of its click.
  const credit = perf.soundtrack?.credit ?? ''
  check('windowlight: its music is Near Light, credited to Ólafur Arnalds and Erased Tapes, and said to be a demo',
    !!perf.soundtrack?.src?.includes('near-light-demo') && ['Ólafur Arnalds', 'Near Light', 'Erased Tapes', 'demo'].every((w) => credit.includes(w)) &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=ejaaxLeUQd4')
  const attribution = join(process.cwd(), 'apps/rube/src/shows/versions/near-light/ATTRIBUTION.txt')
  check('windowlight: an ATTRIBUTION.txt says whose the recording is and that it is not to ship',
    existsSync(attribution) && /Erased Tapes/.test(readFileSync(attribution, 'utf8')) && /do not ship/i.test(readFileSync(attribution, 'utf8')))
  check('windowlight: the period is 101 bars of the click (118.008 a minute), from the recording\'s own zero; the first chord is bar 0\'s downbeat',
    BARS === 101 && near(PERIOD, BARS * BAR, 0.002) && near(60 / BEAT, 118.008, 0.01) && near(PHASE, CATCHES[0], 0.02) && onsetNear(CATCHES[0], 0.001))

  // The loop.
  check('windowlight: a loop, and its soundtrack loops exactly its period from the show\'s zero',
    perf.loop === true && perf.duration === PERIOD && perf.soundtrack?.loop === PERIOD && perf.soundtrack?.offset === MARGIN && MARGIN >= 1)
  const tr = new Transport({ duration: PERIOD, loop: true })
  check('windowlight: the clock goes round: past the end is the start, and a loop never ends',
    near(tr.seek(PERIOD + 1.5), 1.5) && near(tr.seek(-0.5), PERIOD - 0.5) && !tr.ended)
  const a = show.at(0)
  const b = show.at(PERIOD - 1e-9)
  const ca = perf.camera!(0)
  const cb = perf.camera!(PERIOD - 1e-9)
  check('windowlight: the last moment of the period is the first: the ball, its turn, and the camera',
    Math.hypot(a.x - b.x, a.y - b.y) < 1e-4 && near((spin(PERIOD - 1e-9) - spin(0)) / (2 * Math.PI), Math.round((spin(PERIOD - 1e-9) - spin(0)) / (2 * Math.PI)), 1e-3) &&
    Math.hypot(ca.x - cb.x, ca.y - cb.y) < 1e-4 && near(ca.cells, cb.cells, 1e-4))
  check('windowlight: a time a period on is the same time', [0.3, 50.2, 111.1, 180, 204.9].every((s) => {
    const p = show.at(s)
    const q = show.at(s + PERIOD)
    return Math.hypot(p.x - q.x, p.y - q.y) < 1e-6
  }))
  check('windowlight: the legs of the ball\'s way end to end, one period round',
    LEGS.every((l, i) => l.from < l.to && (i === 0 || near(l.from, LEGS[i - 1].to))) && near(LEGS[LEGS.length - 1].to - LEGS[0].from, PERIOD, 1e-9))

  // One ball, one continuous way round.
  let jump = 0
  let at = 0
  let prev = show.where(-0.001)
  let still = 0
  let stillAt = 0
  let run0 = 0
  for (let s = 0; s <= PERIOD + 0.001; s += 0.001) {
    const here = show.where(s)
    const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
    if (d > jump) { jump = d; at = s }
    if (d < 1e-7) { run0 += 0.001; if (run0 > still) { still = run0; stillAt = s } } else run0 = 0
    prev = here
  }
  check('windowlight: the ball never jumps, the seam included (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(4)} at ${at.toFixed(3)} s`)
  check('windowlight: the ball is never quite still: something always has it moving', still < 0.05, `${still.toFixed(3)} s still at ${stillAt.toFixed(2)}`)

  // The cups: each catch a chord of the piano.
  check('windowlight: the cups catch the ball on eight chords of the intro, each a measured onset, and the trough on the strings\' entry',
    CATCHES.length === 9 && CATCHES.slice(0, 8).every((t) => onsetNear(t, 0.001, 0.6)) && onsetNear(CATCH, 0.001, 2) && CATCH > section('strings').t0 && CATCH < section('strings').t0 + 0.5)
  const late = CATCHES.slice(1, 8).map((t, i) => Math.hypot(where(t).p[0] - SEATS[i + 1][0], where(t).p[1] - SEATS[i + 1][1])).filter((d) => d > 1e-3)
  check('windowlight: the ball arrives in each cup as its chord sounds, the cup at rest', late.length === 0 && CATCHES.slice(1, 8).every((t, i) => near(arm(i + 1, t), REST, 1e-6)))
  check('windowlight: every pour is the ball rolling off a tipped lip, never thrown: along the lip, and downhill',
    POURS.every((p) => p.v[1] > 0 && Math.abs(Math.atan2(p.v[1], p.v[0]) - STOP) < 1e-6))
  check('windowlight: a cup gives under the ball as hard as its chord was played', WEIGHTS.every((w) => w > 0.5) && CATCHES.slice(1, 8).every((t) => squash(t + 0.03) > 0.02))

  // The trough: the strings swing it wider, the drums put it over the lip.
  check('windowlight: the ball goes through the trough\'s floor on every chord change (bars 22 to 48), and the last is the drums\' first downbeat',
    PASS_TIMES.length === 14 && PASS_TIMES.every((t, i) => near(t, bar(22 + 2 * i))) && near(DRUMS, bar(48)) && onsetNear(DRUMS, 0.03, 1) &&
    PASS_TIMES.every((t) => Math.abs(angle(t)) < 1e-9))
  check('windowlight: the swing only grows, and only at the floor, where the hammer is; it stays under the lip until the drums, and inside the left rim',
    PUSHES.every((p) => p > 0) && (() => {
      let ok = true
      for (let t = CATCH; t < OVER; t += 0.01) {
        const inPass = PASS_TIMES.some((p) => Math.abs(t - p) < 0.2)
        if (!inPass && Math.abs(amplitude(t + 0.01) - amplitude(t)) > 1e-9) ok = false
        if (t < DRUMS - 0.2 && (angle(t) > TROUGH_LIP - 0.03 || angle(t) < TROUGH_LEFT + 0.08)) ok = false
      }
      return ok && amplitude(DRUMS - 0.3) <= AMPLITUDE_BEFORE + 1e-9
    })())
  check('windowlight: the hammer comes up at each pass and at no other time', PASS_TIMES.every((t) => hammer(t).lift > 0.05) &&
    [CATCH - 1, 60.9, 80.3, 120, 0.5].every((t) => hammer(t).lift === 0 || PASS_TIMES.some((p) => Math.abs(t - p) < 0.4)))
  check('windowlight: over the lip on the drums\' third beat, and into the screw\'s mouth on the fourth',
    near(OVER, beatAt(194)) && near(INTO_SCREW, beatAt(195)) && near(angle(OVER - 1e-6), TROUGH_LIP, 1e-3))

  // The screw: the beat.
  const ride: number[] = []
  for (let k = 196; k < 288; k++) {
    const t0 = PHASE + k * BEAT
    let best = 0
    let bestAt = 0
    for (let s = -0.25; s <= 0.25; s += 0.005) {
      const v = climbed(t0 + s + 0.005) - climbed(t0 + s)
      if (v > best) { best = v; bestAt = s }
    }
    ride.push(bestAt)
  }
  check('windowlight: the screw carries the ball up from the fourth beat of the drums to bar 72\'s downbeat, where they stop, fastest on every beat',
    near(AT_TOP, bar(72)) && ride.every((s) => Math.abs(s) <= 0.03), `${ride.filter((s) => Math.abs(s) > 0.03).length} beats off`)
  check('windowlight: the screw turns a whole number of times a period, so it comes round',
    SCREW_TURNS > 30 && near(turns(PERIOD - 1e-7) - turns(0), SCREW_TURNS, 1e-3))

  // The rail: a bell on every accent.
  check('windowlight: nine bells on the rail, each rung on an accent of the piano after the drums (a measured onset), where the ball is then',
    BELL_TIMES.length === 9 && BELL_TIMES.every((t) => onsetNear(t, 0.001, 0.8) && t > section('after').t0 && t < section('after').t1) &&
    BELLS.every((u, i) => near(along(BELL_TIMES[i]), u)) && BELL_TIMES.every((t, i) => bell(i, t - 0.01).ringing === 0 && bell(i, t + 0.1).ringing > 0.3))

  // The wheel: the arpeggios.
  check('windowlight: the ball boards the wheel on the arpeggios\' first accent and leaves it four and a half turns later, on the coda\'s last chord',
    onsetNear(BOARD, 0.001, 1) && near(ALIGHT - BOARD, 4.5 * TURN) && onsetNear(ALIGHT, 0.02, 1.5) && ALIGHT > section('coda').t0)
  const sixths = (wheelAngle(PERIOD) - wheelAngle(0)) / ((2 * Math.PI) / GONDOLAS)
  check('windowlight: the wheel turns a whole number of sixths a period, and its six gondolas come round', near(sixths, Math.round(sixths), 1e-6), sixths.toFixed(4))
  check('windowlight: the rail ends clear of the gondolas going round', Math.hypot(RAIL_TO[0] - LAMP[0], RAIL_TO[1] - LAMP[1]) > WHEEL_R + 0.55)

  // The chute: the coda, and the seam.
  let slowest = Infinity
  for (let t = LEGS[LEGS.length - 1].from; t < LAND - 0.6; t += 0.01) slowest = Math.min(slowest, run(t + 0.01) - run(t))
  check('windowlight: on the chute the ball all but stops at the crest as the last note dies, and never quite does; then it drops into the first cup on the first chord',
    CHUTE_CREST_V < 0.3 && CHUTE_CREST_V > 0.02 && slowest > 0 && OVER_CREST > section('coda').t0 && near(LAND, CATCHES[0] + PERIOD))

  // The aurora: the strings.
  check('windowlight: the aurora is dark while the piano plays alone and in the coda, comes in with the strings, is brightest through the beat, and comes round',
    auroraLight(section('strings').t0 - 5) === 0 && auroraLight(section('coda').t0 + 1) === 0 && auroraLight(20) === 0 &&
    auroraLight(section('beat').t0 + 10) > 0.6 && auroraLight(section('beat').t0 + 10) > auroraLight(section('strings').t0 + 12) &&
    near(auroraLight(0), auroraLight(PERIOD - 1e-6), 1e-6))

  // The lamp: the arpeggios.
  let stray = 0
  for (let t = 0; t < PERIOD; t += 0.05) {
    // The coda's last chord dies away across the seam, into the first seconds of the intro.
    if (lampBreath(t) > 1e-6 && t > 3.5 && t < section('arpeggios').t0) stray++
  }
  check('windowlight: the lamp swells on the arpeggios\' accents and the coda\'s last chord (dying away over the seam), and nowhere else',
    stray === 0 && lampBreath(BOARD + 2.1) > 0.3 && near(lampBreath(0), lampBreath(PERIOD - 1e-6), 1e-5))

  // The camera: never a jump in or out.
  let zoom = 0
  let zoomAt = 0
  for (let t = 0; t < PERIOD; t += 0.01) {
    const d = Math.abs(Math.log(cellsAt(t + 0.01) / cellsAt(t)))
    if (d > zoom) { zoom = d; zoomAt = t }
  }
  check('windowlight: the camera never jumps in or out (under 1% a hundredth of a second), and is all the way out at the seam',
    zoom < 0.01 && cellsAt(0) > 25, `${(zoom * 100).toFixed(2)}% at ${zoomAt.toFixed(2)} s`)

  // The words.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names, ...(c.notes ?? [])].join(' ')).join(' | ')
  check('windowlight: titles set by the page within the period: Windowlight, directed by Stephen Wu and Claude Opus 5.5, Ólafur Arnalds, Near Light, p5.js',
    TITLES_OK && perf.titles === titlesAt && titlesAt(0).length === 0 && titlesAt(PERIOD - 0.01).length === 0 &&
    ['Windowlight', 'Directed by', 'Stephen Wu', 'Claude Opus 5.5', 'Ólafur Arnalds', 'Near Light', 'p5.js'].every((w) => said.includes(w)), said)
  check('windowlight: no portal and no cut', perf.cuts?.(0) === false && perf.cuts?.(100) === false)
}
