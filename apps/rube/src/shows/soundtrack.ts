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

/** The music as a file the site serves, in one audio element. */
function createFileSoundtrack(): Soundtrack {
  const audio = new Audio()
  audio.preload = 'auto'
  audio.preservesPitch = true
  let spec: SoundtrackSpec | null = null
  let status: SoundtrackState = 'none'
  let speed = 1
  let changed = () => {}
  const offset = () => spec?.offset ?? 0
  const ear = hearing(audio, offset)

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
      spec = next
      ear.reset()
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
      if (!spec || status === 'failed' || audio.paused || audio.ended) return null
      return ear.position()
    },
    async play(at) {
      if (!spec || status === 'failed') return 'silent'
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
      audio.pause()
    },
    seek(at) {
      if (!spec || status === 'failed') return
      audio.currentTime = offset() + Math.max(0, at)
      ear.reset()
    },
    setSpeed(next) {
      speed = next
      audio.playbackRate = next
    },
    setMuted(muted) {
      audio.muted = muted
    },
    onChange(fn) {
      changed = fn
    },
  }
}
