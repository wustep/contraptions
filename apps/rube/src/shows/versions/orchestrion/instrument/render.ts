import type { Performance } from './run'
import { mixdown, notes } from './score'
import { SR, noise } from './voices'

/**
 * The room and the desk, and the soundtrack as a file.
 *
 * Live (`live.ts`) and offline alike, the instrument goes through what a room and a desk would do to it: the dry
 * instrument and a convolution with a room's answer (a hall of about three seconds, made here from seeded noise,
 * darker as it dies) are summed, a slow compressor holds them together, and a fast one with a hard knee is the
 * limiter (`room`).
 *
 * For what needs a file (a saved video, a browser with no AudioWorklet, `?music=file`) the same voices are worked
 * out sample by sample into two channels by the same engine (`score.ts`, `engine.ts`), through the same room in an
 * offline audio context, brought to a peak of −1 dBFS so nothing in it can clip, and written as a WAV the player plays
 * as it would any recording (`renderSoundtrack`). It is made only when it is asked for.
 */

/**
 * The live sound's level after the limiter: the gain the offline render brings its own peak to −1 dBFS with, so live
 * and file are as loud as each other (the same voices through the same room; measured on the render in Chrome: its
 * peak out of the limiter 0.82, so 0.891 / 0.82).
 */
export const LIVE_GAIN = 1.09

/** A hall's answer: stereo, decorrelated, its high end dying faster than its low. */
function hall(ctx: BaseAudioContext, seconds: number, rt60: number): AudioBuffer {
  const sr = ctx.sampleRate
  const n = Math.round(seconds * sr)
  const buf = ctx.createBuffer(2, n, sr)
  const pre = Math.round(0.016 * sr)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    const rnd = noise(ch ? 0x5eed : 0xbeef)
    let lp = 0
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr
      // The lowpass closes as the tail goes on: the air takes the top first.
      const k = 0.55 * Math.exp(-t / (rt60 * 0.35)) + 0.06
      lp += k * (rnd() - lp)
      data[i] = lp * Math.exp((-6.91 * t) / rt60)
    }
    // A few early reflections, so there are walls.
    const taps = ch ? [0.019, 0.031, 0.047, 0.066] : [0.023, 0.029, 0.052, 0.071]
    taps.forEach((d, j) => {
      const at = pre + Math.round(d * sr)
      if (at < n) data[at] += (0.5 - j * 0.09) * (ch ? 1 : -1)
    })
  }
  return buf
}

/** 16-bit PCM WAV of a rendered buffer, scaled by `gain`. */
function wav(buf: AudioBuffer, gain: number): Blob {
  const n = buf.length
  const L = buf.getChannelData(0)
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L
  const bytes = new ArrayBuffer(44 + n * 4)
  const view = new DataView(bytes)
  const tag = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i))
  }
  tag(0, 'RIFF')
  view.setUint32(4, 36 + n * 4, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 2, true)
  view.setUint32(24, buf.sampleRate, true)
  view.setUint32(28, buf.sampleRate * 4, true)
  view.setUint16(32, 4, true)
  view.setUint16(34, 16, true)
  tag(36, 'data')
  view.setUint32(40, n * 4, true)
  const pcm = new Int16Array(bytes, 44, n * 2)
  for (let i = 0; i < n; i++) {
    pcm[2 * i] = Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767)
    pcm[2 * i + 1] = Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767)
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

export interface Rendered {
  url: string
  seconds: number
  /** The rendered peak before it was brought to −1 dBFS, and the gain that did it. */
  peak: number
  gain: number
}

/** Whether this page can make the soundtrack: an offline audio context is all it needs. */
export const canRender = (): boolean =>
  typeof globalThis !== 'undefined' &&
  (typeof (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext === 'function' ||
    typeof (globalThis as { webkitOfflineAudioContext?: unknown }).webkitOfflineAudioContext === 'function')

/** The hall's answer, made once a context. */
const halls = new WeakMap<BaseAudioContext, AudioBuffer>()

/** The room and the desk, from its `input` to its `output`: the same live and offline. */
export function room(ctx: BaseAudioContext, makeup = 1): { input: AudioNode; output: GainNode; dispose(): void } {
  const input = ctx.createGain()
  const direct = ctx.createGain()
  direct.gain.value = 0.92
  const hallNode = ctx.createConvolver()
  hallNode.normalize = true
  let answer = halls.get(ctx)
  if (!answer) halls.set(ctx, (answer = hall(ctx, 3.6, 2.9)))
  hallNode.buffer = answer
  const wet = ctx.createGain()
  wet.gain.value = 0.36
  // The glue: slow, gentle, only on the loudest passages.
  const glue = ctx.createDynamicsCompressor()
  glue.threshold.value = -20
  glue.knee.value = 12
  glue.ratio.value = 2.2
  glue.attack.value = 0.02
  glue.release.value = 0.35
  // The limiter: fast and hard, just under full scale.
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.12
  const out = ctx.createGain()
  out.gain.value = makeup
  input.connect(direct).connect(glue)
  input.connect(hallNode).connect(wet).connect(glue)
  glue.connect(limiter).connect(out)
  return {
    input,
    output: out,
    dispose() {
      for (const node of [input, direct, hallNode, wet, glue, limiter, out]) node.disconnect()
    },
  }
}

export async function renderSoundtrack(perf: Performance): Promise<Rendered> {
  const g = globalThis as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }
  const Offline = g.OfflineAudioContext ?? g.webkitOfflineAudioContext!
  const seconds = perf.duration
  const length = Math.ceil(seconds * SR)
  const ctx = new Offline(2, length, SR)

  // The instrument, dry, written straight into the buffer the context will play.
  const dry = ctx.createBuffer(2, length, SR)
  mixdown(perf, notes(perf), seconds, { L: dry.getChannelData(0), R: dry.getChannelData(1) })

  const source = ctx.createBufferSource()
  source.buffer = dry
  const desk = room(ctx)
  source.connect(desk.input)
  desk.output.connect(ctx.destination)
  source.start(0)

  const out = await ctx.startRendering()
  let peak = 0
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const d = out.getChannelData(ch)
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i])
      if (a > peak) peak = a
    }
  }
  // −1 dBFS at the loudest sample: the limiter's overshoot, if any, is taken up here too.
  const gain = peak > 0 ? 0.891 / peak : 1
  return { url: URL.createObjectURL(wav(out, gain)), seconds, peak, gain }
}
