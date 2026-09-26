import type { SoundtrackSpec } from './registry'
import { createYouTubeSoundtrack } from './youtube'

/**
 * The music. One audio element for the page's life, handed a new recording
 * when the version changes: a browser that wants a gesture before it will
 * play anything wants it once an element, not once a song.
 *
 * It is the show's clock while it plays (`clock.ts`), so what it is asked
 * most is where it is. A doubled recording is time-stretched, not pitched
 * up (`preservesPitch`), which is why this is an element and not a buffer
 * source: 2× still sounds like the music.
 */

/**
 * Where an element is, in seconds of show, read once a frame. Some browsers
 * move `currentTime` in steps coarser than a frame; between two steps the
 * recording has still moved on at its rate, so the reading is carried
 * forward from the last step. Never by more than a tenth of a second, so a
 * recording that stalls holds the picture with it, and never backwards
 * while it plays.
 */
export function hearing(audio: HTMLAudioElement, offset: () => number): { position(): number; reset(): void } {
  let last = -1
  let lastAt = 0
  let floor = -Infinity
  return {
    position() {
      const ct = audio.currentTime
      const at = performance.now()
      if (ct !== last) {
        last = ct
        lastAt = at
      }
      const moving = !audio.paused && !audio.seeking && !audio.ended && audio.readyState >= 3
      const ahead = moving ? Math.min(0.1, ((at - lastAt) / 1000) * audio.playbackRate) : 0
      const t = ct + ahead - offset()
      floor = moving ? Math.max(floor, t) : t
      return floor
    },
    reset() {
      last = -1
      floor = -Infinity
    },
  }
}

export type SoundtrackState = 'none' | 'loading' | 'ready' | 'failed'
/** What came of asking to play: it is, the browser wants a gesture first, or there is nothing to play. */
export type PlayResult = 'playing' | 'blocked' | 'silent'

export interface Soundtrack {
  /** Take up a version's recording, or put the last one down. */
  load(spec: SoundtrackSpec | null): void
  state(): SoundtrackState
  /** Where the recording is, in seconds of show; null when it has no say, and the clock runs on the wall. */
  position(): number | null
  /** Told where the show is, once a frame, whoever keeps its time: a soundtrack of several cues brings each in on it. */
  follow(t: number): void
  play(at: number): Promise<PlayResult>
  pause(): void
  seek(at: number): void
  setSpeed(speed: number): void
  setMuted(muted: boolean): void
  /** Hears when the state changes. */
  onChange(fn: () => void): void
}

/** Where a show's music is coming from: the site's own file, or YouTube's player. */
export type MusicSource = 'file' | 'youtube'

export interface ShowSoundtrack extends Soundtrack {
  /** Which is playing the version that is up; null with no music. */
  source(): MusicSource | null
  /** YouTube would not play it here, and the file is playing it instead. */
  fellBack(): boolean
  /** Heard when the viewer plays or pauses YouTube's own player. */
  onPlayer(fn: (playing: boolean) => void): void
  /** YouTube's unsmoothed report of where it is, in seconds of show; null from a file. For the dev probes. */
  report(): number | null
}

/**
 * The music as the page has it: YouTube's player for a version that names
 * its upload (`SoundtrackSpec.youtube`), the file otherwise. `prefer: 'file'`
 * turns YouTube off (`?music=file`, to hear the two side by side). YouTube
 * that will not play here — blocked, refused, not embeddable — hands over to
 * the file, and says so.
 */
export function createSoundtrack(host: HTMLElement, prefer: MusicSource = 'youtube'): ShowSoundtrack {
  const file = createFileSoundtrack()
  const tube = createYouTubeSoundtrack(host)
  let spec: SoundtrackSpec | null = null
  let active: Soundtrack = file
  let fell = false
  let wanted = false
  /** A play is waiting on YouTube's answer, and takes the file's answer if YouTube fails it. */
  let asking = false
  let shown = 0
  let changed = () => {}
  file.onChange(() => changed())
  tube.onChange(() => {
    if (active === tube && tube.state() === 'failed' && spec?.src) {
      // YouTube will not have it. The file plays it instead.
      fell = true
      active = file
      tube.load(null)
      file.load(spec)
      // The show was already going: the file picks it up where it is. A play still waiting is answered by the file.
      if (wanted && !asking) void file.play(shown)
    }
    changed()
  })
  const other = (): Soundtrack => (active === file ? tube : file)
  return {
    load(next) {
      spec = next
      fell = false
      wanted = false
      const wantsTube = !!next?.youtube?.length && prefer === 'youtube'
      active = wantsTube ? tube : file
      other().load(null)
      active.load(next)
    },
    state: () => active.state(),
    position: () => active.position(),
    follow(t) {
      shown = t
      active.follow(t)
    },
    async play(at) {
      wanted = true
      shown = at
      if (active !== tube) return active.play(at)
      asking = true
      const result = await tube.play(at).finally(() => (asking = false))
      // YouTube failed it and handed over: the file's answer is the answer, blocked or not.
      if (result === 'silent' && active === file && wanted) return file.play(shown)
      return result
    },
    pause() {
      wanted = false
      active.pause()
    },
    seek: (at) => active.seek(at),
    setSpeed(speed) {
      file.setSpeed(speed)
      tube.setSpeed(speed)
    },
    setMuted(muted) {
      file.setMuted(muted)
      tube.setMuted(muted)
    },
    onChange(fn) {
      changed = fn
    },
    source: () => (!spec ? null : active === tube ? 'youtube' : 'file'),
    fellBack: () => fell,
    onPlayer: (fn) => tube.onPlayer(fn),
    report: () => (active === tube ? tube.report() : null),
  }
}

/**
 * A loop's music, played round without a seam. An element cannot: it stops at its end and is sent back, and the
 * gap is heard. So a looping recording is also decoded whole and played from a buffer that loops on the sample,
 * between `offset` and `offset + loop`. The element is kept for what the buffer cannot do: 2×, which it plays
 * time-stretched (a looped buffer would only play it an octave up), the seconds before the buffer is decoded, and a
 * visit the browser will only let play muted (an audio context wants a gesture, muted or not). Wherever the element
 * plays a loop it is sent back a period when it runs past the end: the same music, so only a hitch is heard, at 2×.
 */
interface Looper {
  /** The decoded recording, once it is. */
  buffer: AudioBuffer | null
  /** Playing from the buffer: when (the context's clock) and from where (seconds of show). */
  started: { at: number; from: number } | null
  source: AudioBufferSourceNode | null
}

let context: AudioContext | null = null
const decoded = new Map<string, Promise<AudioBuffer>>()

function audioContext(): AudioContext | null {
  if (context) return context
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
  if (!Ctor) return null
  context = new Ctor()
  return context
}

function decode(src: string): Promise<AudioBuffer> {
  let job = decoded.get(src)
  if (!job) {
    const ctx = audioContext()
    job = ctx
      ? fetch(src).then((r) => r.arrayBuffer()).then((data) => ctx.decodeAudioData(data))
      : Promise.reject(new Error('no audio context'))
    decoded.set(src, job)
    job.catch(() => decoded.delete(src))
  }
  return job
}

/** The music as a file the site serves, in one audio element. */
function createFileSoundtrack(): Soundtrack {
  const audio = new Audio()
  audio.preload = 'auto'
  audio.preservesPitch = true
  let spec: SoundtrackSpec | null = null
  let status: SoundtrackState = 'none'
  let speed = 1
  let changed = () => {}
  let muted = false
  const offset = () => spec?.offset ?? 0
  const ear = hearing(audio, offset)
  const looper: Looper = { buffer: null, started: null, source: null }
  let gain: GainNode | null = null
  /** The length of the loop, seconds of show, or 0 for a recording that plays once. */
  const period = () => spec?.loop ?? 0
  const round = (t: number) => {
    const P = period()
    if (!P) return t
    const u = t % P
    return u < 0 ? u + P : u
  }
  /** Whether the buffer can play the loop now: decoded, and at 1×. */
  const buffered = () => !!period() && !!looper.buffer && speed === 1

  function stopBuffer(): void {
    const src = looper.source
    looper.source = null
    looper.started = null
    if (!src) return
    src.onended = null
    try {
      src.stop()
    } catch {
      // Never started.
    }
    src.disconnect()
  }

  /** Play the loop from the buffer from `at` (seconds of show). False when the context is not allowed to run. */
  async function startBuffer(at: number): Promise<boolean> {
    const ctx = audioContext()
    if (!ctx || !looper.buffer) return false
    if (ctx.state !== 'running') {
      // Without a gesture this never settles; a short wait says whether it was allowed.
      await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 250))])
      // Read again: the wait may have changed it (TypeScript narrowed it above).
      if ((ctx.state as AudioContextState) !== 'running') return false
    }
    stopBuffer()
    if (!gain) {
      gain = ctx.createGain()
      gain.connect(ctx.destination)
    }
    gain.gain.value = muted ? 0 : 1
    const src = ctx.createBufferSource()
    src.buffer = looper.buffer
    src.loop = true
    src.loopStart = offset()
    src.loopEnd = offset() + period()
    src.connect(gain)
    const from = round(at)
    const when = ctx.currentTime + 0.02
    src.start(when, offset() + from)
    looper.source = src
    looper.started = { at: when, from }
    return true
  }

  /** Where the buffer is, seconds of show. */
  function bufferPosition(): number | null {
    const ctx = context
    if (!ctx || !looper.started) return null
    const lag = (ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0
    return round(looper.started.from + Math.max(0, ctx.currentTime - looper.started.at - lag - ctx.baseLatency))
  }

  /** An element playing a loop, sent back a period when it runs past its end. */
  function keepRound(): void {
    const P = period()
    if (!P || audio.paused) return
    if (audio.currentTime >= offset() + P) {
      audio.currentTime -= P
      ear.reset()
    }
  }

  const set = (next: SoundtrackState) => {
    if (next === status) return
    status = next
    changed()
  }
  audio.addEventListener('canplay', () => { if (spec) set('ready') })
  audio.addEventListener('error', () => { if (spec) set('failed') })

  return {
    load(next) {
      audio.pause()
      stopBuffer()
      looper.buffer = null
      spec = next
      ear.reset()
      if (next?.loop) {
        const mine = next
        decode(next.src).then(
          (buffer) => {
            if (spec !== mine) return
            looper.buffer = buffer
            if (status === 'loading') set('ready')
            // Playing on the element while it decoded: the buffer takes over where the element is.
            if (!audio.paused && speed === 1) {
              const at = round(ear.position())
              void startBuffer(at).then((ok) => { if (ok && spec === mine) audio.pause() })
            }
          },
          () => {},
        )
      }
      if (!next) {
        audio.removeAttribute('src')
        set('none')
        return
      }
      status = 'loading'
      audio.src = next.src
      // A new source puts the rate back to the default.
      audio.playbackRate = speed
      audio.load()
      changed()
    },
    state: () => status,
    position() {
      // Once asked to play it speaks for the clock, even before the first sample: the picture waits for the music.
      if (!spec || status === 'failed') return null
      if (looper.started) return bufferPosition()
      if (audio.paused || audio.ended) return null
      keepRound()
      return period() ? round(ear.position()) : ear.position()
    },
    async play(at) {
      if (!spec || status === 'failed') return 'silent'
      if (buffered()) {
        const mine = spec
        if (await startBuffer(at)) {
          if (spec !== mine) stopBuffer()
          audio.pause()
          return 'playing'
        }
        // Not allowed to start the context yet: the element, which a muted page may still play.
      }
      const want = offset() + Math.max(0, at)
      if (Math.abs(audio.currentTime - want) > 0.03) audio.currentTime = want
      audio.playbackRate = speed
      ear.reset()
      try {
        await audio.play()
        return 'playing'
      } catch (err) {
        const name = (err as DOMException | null)?.name
        if (name === 'NotAllowedError') return 'blocked'
        // A pause that overtook the play is no failure: the pause won.
        if (name === 'AbortError') return 'playing'
        set('failed')
        return 'silent'
      }
    },
    follow() {},
    pause() {
      stopBuffer()
      audio.pause()
    },
    seek(at) {
      if (!spec || status === 'failed') return
      if (looper.started) {
        void startBuffer(at)
        return
      }
      audio.currentTime = offset() + Math.max(0, round(at))
      ear.reset()
    },
    setSpeed(next) {
      // A loop changes engine with the speed: the buffer at 1×, the element (time-stretched) at 2×.
      const playing = !!looper.started || !audio.paused
      const at = looper.started ? bufferPosition() : null
      speed = next
      audio.playbackRate = next
      if (!period() || !playing) return
      if (looper.started && next !== 1) {
        const from = at ?? 0
        stopBuffer()
        audio.currentTime = offset() + from
        ear.reset()
        void audio.play().catch(() => {})
      } else if (!looper.started && buffered()) {
        const from = round(ear.position())
        void startBuffer(from).then((ok) => { if (ok) audio.pause() })
      }
    },
    setMuted(next) {
      muted = next
      audio.muted = next
      if (gain) gain.gain.value = next ? 0 : 1
    },
    onChange(fn) {
      changed = fn
    },
  }
}
