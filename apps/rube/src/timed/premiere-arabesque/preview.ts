import p5 from 'p5'
import { premiereArabesque } from './index'
import { clampTime, score, show } from './show'

// Temporary checkpoint controls; the take itself has no dependency on this page.
const { renderFrame, audio } = premiereArabesque

const host = document.querySelector<HTMLDivElement>('#stage')!
const play = document.querySelector<HTMLButtonElement>('#play')!
const restart = document.querySelector<HTMLButtonElement>('#restart')!
const speed = document.querySelector<HTMLButtonElement>('#speed')!
const seek = document.querySelector<HTMLInputElement>('#seek')!
const readout = document.querySelector<HTMLOutputElement>('#time')!
const status = document.querySelector<HTMLParagraphElement>('#status')!
const query = new URLSearchParams(location.search)
if (query.has('capture')) document.body.classList.add('capture')

let cursor = clampTime(Number(query.get('t') ?? 0))
let context: AudioContext | undefined
let buffer: AudioBuffer | undefined
let source: AudioBufferSourceNode | undefined
let sketch: p5
let startedAt = 0, startedFrom = 0, lastAudioTime = cursor
let clockPerformance = 0, clockReady = false, audioErrorMs = 0
let loading = false, generation = 0, lastControls = -Infinity
let rate = 1
let lastFrame = 0, lastShowTime = 0
const intervals: number[] = [], costs: number[] = [], steps: number[] = [], sampleTimes: number[] = [], audioErrors: number[] = []

function time() {
  if (!source || !context) return cursor
  const now = performance.now()
  if (context.state !== 'running') { clockPerformance = now; return lastAudioTime }
  const stamp = context.getOutputTimestamp?.()
  // Extrapolate the audio device's output timestamp to this display frame.
  // Reading currentTime alone exposes audio-block quantization and output latency.
  const audioTime = stamp?.performanceTime && stamp.contextTime !== undefined ? stamp.contextTime + (now - stamp.performanceTime) / 1000
    : context.currentTime - (context.outputLatency || context.baseLatency || 0)
  const target = clampTime(startedFrom + Math.max(0, audioTime - startedAt) * rate)
  if (!clockReady) {
    clockReady = target > startedFrom
    lastAudioTime = target
  } else {
    // The device timestamp can jitter by a few milliseconds. Follow its clock
    // with a bounded 2% correction, rather than exposing a timestamp step as a
    // skipped animation frame. Explicit seeks/restarts reset this estimate.
    const elapsed = Math.max(0, (now - clockPerformance) / 1000) * rate
    const predicted = lastAudioTime + elapsed, limit = elapsed * .02
    const correction = Math.max(-limit, Math.min(limit, target - predicted))
    lastAudioTime = Math.max(lastAudioTime, clampTime(predicted + correction))
  }
  clockPerformance = now
  audioErrorMs = (target - lastAudioTime) * 1000
  return lastAudioTime
}

const format = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`
function updateControls(force = false) {
  const now = performance.now()
  if (!force && now - lastControls < 100) return
  lastControls = now
  const t = time()
  seek.value = String(t)
  readout.value = `${format(t)} / ${format(score.duration)}`
  play.textContent = loading ? 'Loading music…' : source ? 'Pause' : t >= score.duration ? 'Replay with music' : 'Play with music'
  play.disabled = loading
}

function pause(redraw = true) {
  cursor = time()
  generation++
  const previous = source
  source = undefined
  if (previous) { previous.onended = null; previous.stop(); previous.disconnect() }
  sketch?.noLoop()
  if (redraw) { sketch?.redraw(); updateControls(true) }
}

async function start() {
  if (loading || source) return
  const currentGeneration = ++generation
  loading = true
  updateControls(true)
  try {
    context ??= new AudioContext()
    await context.resume()
    if (!buffer) {
      const response = await fetch(audio.src)
      if (!response.ok) throw new Error(`Audio request failed: ${response.status}`)
      buffer = await context.decodeAudioData(await response.arrayBuffer())
    }
    if (currentGeneration !== generation) return
    if (cursor >= score.duration) cursor = 0
    startedFrom = lastAudioTime = cursor
    clockReady = false
    audioErrorMs = 0
    clockPerformance = performance.now()
    startedAt = context.currentTime + 0.08
    const next = context.createBufferSource()
    next.buffer = buffer
    next.playbackRate.value = rate
    next.connect(context.destination)
    source = next
    // Keep the output clock alive until the final samples reach the device.
    // onended fires at the audio graph's end, slightly before audible output ends.
    next.start(startedAt, audio.offset + cursor, score.duration - cursor)
    intervals.length = 0; costs.length = 0; steps.length = 0; sampleTimes.length = 0; audioErrors.length = 0
    lastFrame = 0
    sketch.loop()
    status.textContent = 'Première Arabesque. Regular → Forest → Aqua → Arcade.'
  } catch (error) {
    status.textContent = `Could not play the recording. ${error instanceof Error ? error.message : String(error)}`
  } finally {
    loading = false
    updateControls(true)
  }
}

play.addEventListener('click', () => { if (source) pause(); else void start() })
restart.addEventListener('click', () => { pause(false); cursor = 0; sketch.redraw(); status.textContent = 'Ready at the first audible note.'; updateControls(true) })
speed.addEventListener('click', () => {
  const resume = !!source
  pause(false)
  rate = rate === 1 ? 2 : 1
  speed.textContent = `${rate}×`
  speed.setAttribute('aria-label', `Playback speed ${rate} times. Change to ${rate === 1 ? 2 : 1} times.`)
  if (resume) void start()
  else { sketch.redraw(); updateControls(true) }
})
seek.addEventListener('input', () => { const next = Number(seek.value); pause(false); cursor = clampTime(next); sketch.redraw(); updateControls(true) })
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return
  event.preventDefault()
  if (source) pause(); else void start()
})

function audit() {
  const percentile = (values: number[], f: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * f)] ?? 0
  return { frames: costs.length, renderP95Ms: percentile(costs, 0.95), maxRenderMs: Math.max(0, ...costs), frameP95Ms: percentile(intervals, 0.95),
    maxFrameMs: Math.max(0, ...intervals), framesOver25Ms: intervals.filter((dt) => dt > 25).length,
    maxTimelineStepMs: Math.max(0, ...steps), maxAudioErrorMs: Math.max(0, ...audioErrors), frameIntervals: [...intervals],
    slowFrames: intervals.flatMap((dt,i) => dt > 25 ? [{time:sampleTimes[i+1],intervalMs:dt,renderMs:costs[i+1]}] : []) }
}

declare global {
  interface Window {
    premierePreview: {
      render(time: number): void
      state(): { time: number; playing: boolean; loading: boolean; audioOffset: number; duration: number; piece: string; revision: number; rate: number }
      audit(): ReturnType<typeof audit>
    }
  }
}

new p5((p) => {
  sketch = p
  p.setup = () => {
    seek.max = String(score.duration)
    p.createCanvas(1600, 900).parent(host)
    p.pixelDensity(1)
    p.rectMode(p.CENTER)
    p.angleMode(p.RADIANS)
    p.strokeCap(p.ROUND)
    p.strokeJoin(p.ROUND)
    p.frameRate(60)
    // Warm stock drawing paths before audio starts, so a world's first appearance
    // does not pay its initial drawing/font cost during playback.
    for (const sample of [0, 7, 18, 71, 97, 130, 149, 163, 190, 210, 235, 255, 283]) renderFrame(p, sample)
    p.noLoop()
    window.premierePreview = {
      render(seconds) { pause(false); cursor = clampTime(seconds); renderFrame(p, cursor); updateControls(true) },
      state: () => ({ time: time(), playing: !!source, loading, audioOffset: score.audioOffset, duration: score.duration, piece: show.labelAt(time()), revision: score.revision, rate }),
      audit,
    }
  }
  p.draw = () => {
    const started = performance.now(), t = time()
    renderFrame(p, t)
    if (source) {
      costs.push(performance.now() - started)
      sampleTimes.push(t)
      audioErrors.push(Math.abs(audioErrorMs))
      if (lastFrame) { intervals.push(started - lastFrame); steps.push((t - lastShowTime) * 1000) }
      lastFrame = started
      lastShowTime = t
      if (t >= score.duration) {
        pause(false)
        cursor = score.duration
        status.textContent = 'The complete Première Arabesque. Replay or scrub to revisit the journey.'
        updateControls(true)
      }
    }
    updateControls()
  }
})
