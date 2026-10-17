import { frequency, STEP, type Take, type Voice } from './model'
import { scoreFor, type ScoreEvent } from './instruments'

/** Dry, small acoustic voices. No oscillator is left running between strikes. */
export function voiceSamples(voice: Voice, degree: number, sampleRate: number): Float32Array {
  const duration = { triangle: 2.4, harp: 1.65, musicbox: 1.9, timpani: 1.15, keys: 1.7, xylophone: .9 }[voice]
  const data = new Float32Array(Math.ceil(sampleRate * duration))
  const base = frequency(degree)
  let seed = 7293 + degree * 17
  const noise = () => { seed = Math.imul(seed ^ (seed >>> 13), 1274126177); return ((seed >>> 0) / 2147483648) - 1 }
  if (voice === 'harp') {
    // A plucked delay line: the bright attack rounds naturally into a string.
    const period = Math.max(2, Math.round(sampleRate / base))
    const string = Float32Array.from({ length: period }, () => noise() * .5)
    const mean = string.reduce((sum, v) => sum + v, 0) / period
    for (let i = 0; i < period; i++) string[i] -= mean
    let previous = 0
    for (let i = 0; i < data.length; i++) {
      const j = i % period, current = string[j]
      string[j] = .498 * (current + previous)
      previous = current
      data[i] = current * 1.25 * Math.exp(-i / sampleRate / 1.2) * Math.min(1, i / (sampleRate * .0015))
    }
    return data
  }
  const partials: Record<Exclude<Voice, 'harp' | 'timpani'>, number[][]> = {
    triangle: [[1, .36, 1.2], [1.51, .18, .65], [2.04, .12, .85], [2.78, .08, .38], [4.12, .06, .21]],
    musicbox: [[1, .48, .65], [2.76, .19, .28], [5.4, .09, .14], [8.93, .025, .07]],
    keys: [[1, .4, .65], [2.002, .2, .38], [3.009, .1, .25], [4.02, .06, .18], [6.05, .035, .1]],
    xylophone: [[1, .6, .23], [3.99, .21, .075], [9.96, .06, .035]],
  }
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    let value = 0
    if (voice === 'timpani') {
      const f = base * .34
      const phase = 2 * Math.PI * f * (t + .14 * .025 * (1 - Math.exp(-t / .025)))
      value = .65 * Math.sin(phase) * Math.exp(-t / .26) + .2 * Math.sin(phase * 1.5) * Math.exp(-t / .14)
      // Upper membrane modes keep the low drum legible on a phone speaker.
      value += .13 * Math.sin(phase * 2.13) * Math.exp(-t / .12) + .07 * Math.sin(phase * 2.92) * Math.exp(-t / .075)
      value += .13 * noise() * Math.exp(-t / .009)
    } else {
      const f = base * (voice === 'triangle' ? 2 : 1)
      for (const [ratio, gain, decay] of partials[voice]) {
        if (f * ratio < sampleRate * .46) value += gain * Math.sin(2 * Math.PI * f * ratio * t) * Math.exp(-t / decay)
      }
      if (voice === 'keys') value += noise() * .07 * Math.exp(-t / .007)
      if (voice === 'xylophone') value += noise() * .1 * Math.exp(-t / .004)
    }
    data[i] = value * Math.min(1, t / .0015) * Math.min(1, (duration - t) / .02) * .72
  }
  return data
}

/** Half-open windows guarantee an event belongs to exactly one scheduling pass. */
export function eventsBetween(events: ScoreEvent[], cycle: number, from: number, to: number): (ScoreEvent & { absolute: number })[] {
  const found: (ScoreEvent & { absolute: number })[] = []
  for (let lap = Math.max(0, Math.floor(from / cycle) - 1); lap <= Math.floor(to / cycle); lap++) {
    for (const event of events) {
      const absolute = lap * cycle + event.at
      if (absolute >= from && absolute < to) found.push({ ...event, absolute })
    }
  }
  return found.sort((a, b) => a.absolute - b.absolute)
}

export class OrchestraAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private bus: GainNode | null = null
  private releaseBus: () => void = () => {}
  private cache = new Map<string, AudioBuffer>()
  private sources = new Set<AudioBufferSourceNode>()
  private timer = 0
  private anchor = 0
  private position = 0
  private scheduled = 0
  private rate = 1
  private take: Take | null = null
  private events: ScoreEvent[] = []
  playing = false
  volume = .7
  onInterruption: () => void = () => {}

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' })
      this.master = this.context.createGain()
      const limit = this.context.createDynamicsCompressor()
      limit.threshold.value = -12; limit.knee.value = 10; limit.ratio.value = 4
      limit.attack.value = .003; limit.release.value = .16
      this.master.gain.value = this.volume
      this.master.connect(limit).connect(this.context.destination)
      this.newBus()
      this.context.onstatechange = () => {
        if (this.playing && this.context?.state !== 'running') this.onInterruption()
      }
    }
    await this.context.resume()
    if (this.context.state !== 'running') throw new Error('Audio is paused by the browser')
  }

  private newBus(): void {
    const ctx = this.context!
    this.bus = ctx.createGain()
    this.bus.connect(this.master!)
    // A very small wooden room. A single, quiet early reflection, no wash.
    const echo = ctx.createDelay(.2), soften = ctx.createBiquadFilter(), wet = ctx.createGain()
    echo.delayTime.value = .043; soften.type = 'lowpass'; soften.frequency.value = 2600; wet.gain.value = .08
    this.bus.connect(echo).connect(soften).connect(wet).connect(this.master!)
    const bus = this.bus
    this.releaseBus = () => { bus.disconnect(); echo.disconnect(); soften.disconnect(); wet.disconnect() }
  }

  private buffer(voice: Voice, degree: number): AudioBuffer {
    const key = `${voice}:${degree}`
    if (!this.cache.has(key)) {
      const ctx = this.context!, samples = voiceSamples(voice, degree, ctx.sampleRate)
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate)
      buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
      this.cache.set(key, buffer)
    }
    return this.cache.get(key)!
  }

  private strike(event: ScoreEvent, when: number, count: number): void {
    const ctx = this.context!, source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner()
    source.buffer = this.buffer(event.voice, event.degree)
    gain.gain.value = event.strength * .7
    pan.pan.value = count > 1 ? (event.slot / (count - 1) - .5) * .65 : 0
    source.connect(gain).connect(pan).connect(this.bus!)
    this.sources.add(source)
    source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); pan.disconnect() }
    source.start(Math.max(ctx.currentTime, when))
  }

  /** Audio hardware time, compensated for the output queue, drives the picture. */
  now(): number {
    if (!this.playing || !this.context) return this.position
    const ctx = this.context
    const stamp = ctx.getOutputTimestamp?.()
    const heard = stamp && (stamp.contextTime ?? 0) > 0 && (stamp.performanceTime ?? 0) > 0
      ? stamp.contextTime! + (performance.now() - stamp.performanceTime!) / 1000
      : ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0)
    return this.position + (heard - this.anchor) * this.rate
  }

  start(take: Take, at: number): void {
    this.silence()
    this.take = take; this.events = scoreFor(take); this.rate = take.tempo / 84
    // Warm buffers before anchoring the score; synthesis never steals a strike.
    for (const event of this.events) this.buffer(event.voice, event.degree)
    this.position = at; this.anchor = this.context!.currentTime + .045; this.scheduled = at
    this.playing = true
    this.schedule()
    this.timer = window.setInterval(() => this.schedule(), 20)
  }

  private schedule(): void {
    if (!this.playing || !this.take) return
    const current = this.position + (this.context!.currentTime - this.anchor) * this.rate
    const until = current + .12 * this.rate
    // A throttled tab skips missed strikes rather than firing a burst on return.
    const from = Math.max(this.scheduled, current - .015 * this.rate)
    for (const event of eventsBetween(this.events, this.take.length * STEP, from, until)) {
      this.strike(event, this.anchor + (event.absolute - this.position) / this.rate, this.take.tracks.length)
    }
    this.scheduled = Math.max(this.scheduled, until)
  }

  pause(): void {
    this.position = this.now()
    this.playing = false
    this.silence()
  }

  private silence(): void {
    clearInterval(this.timer)
    if (!this.context || !this.bus) return
    const bus = this.bus, release = this.releaseBus, sources = [...this.sources], ctx = this.context
    bus.gain.setTargetAtTime(0, ctx.currentTime, .006)
    for (const source of sources) { try { source.stop(ctx.currentTime + .035) } catch { /* already ended */ } }
    window.setTimeout(release, 100)
    this.newBus()
  }

  setVolume(volume: number): void {
    this.volume = volume
    if (this.context && this.master) this.master.gain.setTargetAtTime(volume, this.context.currentTime, .025)
  }
}
