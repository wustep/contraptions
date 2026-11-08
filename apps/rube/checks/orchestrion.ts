/**
 * The checks for Orchestrion: a show whose soundtrack is its physics. Called by `checks/shows.ts` for that take.
 *
 * What it holds: every ball let go plays the bay it drops into exactly as the bay was designed for it (the same parts,
 * in the same order, each within a millisecond and a half of its sixteenth); every part is cut to a note of D major,
 * and its length is the one that note's physics gives it; the form ends with every ball at rest in the bowl; and the
 * score is the simulation's log and nothing else. The soundtrack itself is played in a page (an audio worklet, or an
 * offline audio context for a file), so here the dry mix stands in for it: finite, and nothing in it without a contact
 * behind it; and the engine that plays it live is held to the same mix, block by block, at any speed.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import { run, score } from '../src/shows/versions/orchestrion/instrument'
import { mixdown, strikes } from '../src/shows/versions/orchestrion/instrument/score'
import { defineEngine } from '../src/shows/versions/orchestrion/instrument/engine'
import { BAYS, SIXTEENTH, TICKS_PER_BAY, barLength, midiHz, pipeLength, stringLength } from '../src/shows/versions/orchestrion/instrument/tuning'
import { CODA, bayAt } from '../src/shows/versions/orchestrion/instrument/run'
import { METAL_E } from '../src/shows/versions/orchestrion/instrument/design'

type Check = (name: string, ok: boolean, detail?: string) => void

/** D major's pitch classes. */
const D_MAJOR = new Set([2, 4, 6, 7, 9, 11, 1])

export function checkOrchestrion(perf: Performance, version: ShowVersion, check: Check): void {
  const m = run.machine
  check('orchestrion: one take, Orchestrion, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Orchestrion' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('orchestrion: silent here, where there is no audio context to render with, and never a recording or a YouTube cue',
    !perf.soundtrack && perf.duration === run.duration && !perf.cuts?.(10))

  // Every ball plays its bay as designed.
  let worst = 0
  const off: string[] = []
  for (const r of run.releases) {
    const mine = run.contacts.filter((c) => c.ball === r.ball && c.t > r.t && (c.material === 'bar' || c.material === 'string'))
    if (!mine.length) {
      off.push(`ball ${r.ball} at ${r.t.toFixed(2)} touched nothing`)
      continue
    }
    const plan = m.bays[m.parts[mine[0].part].bay].planned
    const seq = mine.slice(0, plan.length)
    if (seq.length !== plan.length || seq.some((c, i) => c.part !== plan[i].part)) {
      off.push(`ball ${r.ball} at ${r.t.toFixed(2)} left its bay's path`)
      continue
    }
    seq.forEach((c, i) => (worst = Math.max(worst, Math.abs(c.t - r.t - plan[i].t))))
  }
  check('orchestrion: every ball let go plays its bay\'s parts in order, as the bay was built for it', off.length === 0 && run.releases.length > 40, off.slice(0, 3).join('; '))
  check('orchestrion: and each touch within 1.5 ms of where it was designed to fall', worst < 0.0015, `${(worst * 1000).toFixed(2)} ms`)
  const grid = m.bays.every((b) => b.planned.every((q) => Math.abs(q.t / SIXTEENTH - Math.round(q.t / SIXTEENTH)) < 1e-6))
  check('orchestrion: every designed touch falls on a sixteenth after the release', grid)

  // Tuned to the scale, and cut to it.
  const parts = m.parts
  check('orchestrion: every bar, string, pipe and chime is a note of D major', parts.every((p) => D_MAJOR.has(((p.midi % 12) + 12) % 12) && Math.abs(p.hz - midiHz(p.midi)) < 1e-9))
  const cut = parts.every((p) =>
    p.kind === 'bar' ? Math.abs(p.len - barLength(p.hz)) < 1e-9 && Math.abs(Math.hypot(p.bx - p.ax, p.by - p.ay) - p.len) < 1e-6 :
    p.kind === 'string' ? Math.abs(p.len - stringLength(p.hz)) < 1e-9 :
    p.kind === 'pipe' ? Math.abs(p.len - pipeLength(p.hz)) < 1e-9 : true)
  check('orchestrion: each bar is as long as 1/√pitch makes it, each string and pipe as 1/pitch', cut)
  const pipeOrder = parts.filter((p) => p.kind === 'pipe').map((p) => p.len)
  check('orchestrion: the lowest pipe (G) is the longest', Math.max(...pipeOrder) === parts.find((p) => p.kind === 'pipe' && p.midi === BAYS[2].pipe)!.len)
  const metal = parts.filter((p) => p.kind === 'bar' && p.e >= METAL_E).length
  const wood = parts.filter((p) => p.kind === 'bar' && p.e < METAL_E).length
  check('orchestrion: the bars are aluminium along a row and rosewood where a row takes up a drop', metal > 2 * wood && wood >= 2 * BAYS.length)
  check('orchestrion: every restitution the design asked for is one a real material has', parts.filter((p) => p.kind === 'bar' || p.kind === 'string').every((p) => p.e > 0.5 && p.e < 0.95))

  // The form.
  const last = run.bowl[run.bowl.length - 1]
  check('orchestrion: every ball comes out of the jar and ends at rest in the bowl', run.jar[run.jar.length - 1][1] === 0 && last[1] === run.tracks.length && last[0] < run.duration)
  check('orchestrion: the four chords each have their turn, and the coda is D', new Set(run.ticks.filter((k) => k.released !== null).map((k) => k.bay)).size === 4 && run.ticks.filter((k) => k.released !== null).slice(-1)[0].bay === 0)
  check('orchestrion: a chime is struck at every change of chord, the new chord\'s',
    run.strikes.length === CODA / TICKS_PER_BAY + 1 && run.strikes.every((s, i) => m.parts[s.part].bay === bayAt(i * TICKS_PER_BAY)))

  // The score is the log.
  const contactsHeard = run.contacts.filter((c) => c.part >= 0 && (c.material === 'bar' || c.material === 'string')).length
  check('orchestrion: one voice for every contact on a bar or a string, one breath for every passage down a pipe, nothing else sounding',
    score.filter((n) => n.kind === 'bar' || n.kind === 'string').length === contactsHeard && score.filter((n) => n.kind === 'pipe').length === run.passages.length)
  const { L, R } = mixdown(run, score.filter((n) => n.t < 20), 20)
  let finite = true
  let loud = 0
  for (let i = 0; i < L.length; i++) {
    finite &&= Number.isFinite(L[i]) && Number.isFinite(R[i])
    loud = Math.max(loud, Math.abs(L[i]), Math.abs(R[i]))
  }
  check('orchestrion: the dry mix of its first twenty seconds is finite and sounds', finite && loud > 0.05 && loud < 4, loud.toFixed(3))

  // The live engine is the offline mix's own arithmetic, run as an audio thread runs it.
  const sr = 44100
  const first = score.filter((n) => n.t < 12)
  const ref = mixdown(run, first, 12)
  const notes12 = strikes(run, first)
  // Its text alone, as the worklet gets it: it must need nothing from outside itself.
  let alone: ReturnType<typeof defineEngine> | null = null
  try {
    alone = new Function(`return (${defineEngine.toString()})()`)() as ReturnType<typeof defineEngine>
  } catch {
    alone = null
  }
  check('orchestrion: the live engine is self-contained, so its own text can be the audio worklet', !!alone && typeof alone.makeEngine === 'function')
  const live = (alone ?? defineEngine()).makeEngine(sr)
  live.load(notes12)
  live.go(0, 0, 1, true)
  const LL = new Float32Array(12 * sr)
  const LR = new Float32Array(12 * sr)
  for (let k = 0; k < LL.length; k += 128) live.process(LL, LR, k, Math.min(128, LL.length - k), k)
  let same = 0
  for (let i = 0; i < LL.length; i++) same = Math.max(same, Math.abs(LL[i] - ref.L[i]), Math.abs(LR[i] - ref.R[i]))
  check('orchestrion: played live, 128 samples at a time, it is the offline mix to the sample', same < 1e-6, same.toExponential(2))
  // At 2× the same notes come twice as often, each at its own pitch: the first loud sample at half the time.
  const fast = defineEngine().makeEngine(sr)
  fast.load(notes12)
  fast.go(0, 0, 2, true)
  const F = new Float32Array(6 * sr)
  const FR = new Float32Array(6 * sr)
  for (let k = 0; k < F.length; k += 128) fast.process(F, FR, k, 128, k)
  const onset = (a: Float32Array) => a.findIndex((v) => Math.abs(v) > 0.01)
  // (Within half a millisecond: a note's own attack takes as long at any speed.)
  check('orchestrion: at 2× the machine plays twice as fast, not a recording sped up', Math.abs(onset(F) - onset(ref.L) / 2) <= sr * 0.0005, `${onset(F)} vs ${onset(ref.L)}`)
  // A stop lets everything go in a few hundredths of a second; a seek picks up what is still ringing there.
  const stopped = defineEngine().makeEngine(sr)
  stopped.load(notes12)
  stopped.go(0, 0, 1, true)
  const S = new Float32Array(10 * sr)
  const SR2 = new Float32Array(10 * sr)
  for (let k = 0; k < S.length; k += 128) {
    if (k === 128 * 300) stopped.stop(k)
    stopped.process(S, SR2, k, 128, k)
  }
  let after = 0
  for (let i = 128 * 300 + Math.round(0.02 * sr); i < S.length; i++) after = Math.max(after, Math.abs(S[i]))
  const sought = defineEngine().makeEngine(sr)
  sought.load(notes12)
  sought.go(9, 0, 1, true)
  check('orchestrion: a stop is silent within 20 ms, and a seek picks up the notes still ringing', after === 0 && stopped.voices() === 0 && sought.voices() > 3, `after ${after}, ringing at 9 s ${sought.voices()}`)
}
