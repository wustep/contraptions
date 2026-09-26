import type { SoundtrackSpec, YouTubeCue } from './registry'
import type { PlayResult, Soundtrack, SoundtrackState } from './soundtrack'

/**
 * The music, played by YouTube. A show's recording can be the label's own
 * upload, embedded, instead of a file the site serves: YouTube plays it,
 * and the page only listens to where it has got to.
 *
 * A soundtrack here is one or more cues (`YouTubeCue`), each a stretch of
 * one video laid on the show's timeline: Voyage is Cornfield Chase whole
 * and then No Time for Caution from bar 26; Come Recover stops at 5:32 on a
 * fade. Each cue has its own player. The cue that has come in most recently
 * is the one the clock listens to, and the next one is started a little
 * early and silently when it can be, so it is already running when it is
 * brought up and the handover costs the picture nothing.
 *
 * The players are shown, never hidden: YouTube's terms want an embedded
 * player seen, at least 200 px each way, so the panel carries it. The one
 * being heard is the one on top.
 *
 * YouTube tells the page where a video is only a few times a second, and
 * late. So the clock is not the last report but a running estimate, carried
 * forward at the playback rate and eased onto each report as it comes in
 * (`listener`). It never runs backwards while the music plays: a report
 * that is behind holds the picture until the music catches up, as a
 * stalled file does.
 */

/** How long before its entry a cue is started, silently, where its video has that much before it. */
const PREROLL = 4
/** How far a cue running early may be off the show's time before it is put back on it. */
const TRUE = 0.02
/** How long a play may sit unstarted before it counts as refused. One still buffering is waited for, to a limit. */
const PATIENCE = 2500
const PATIENCE_BUFFERING = 12000
/** How long after our own word to a player its news is taken as the answer to it, not as the viewer's doing. */
const ECHO = 800

/* ------------------------------------------------------------------ the IFrame API */

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  cueVideoById(o: { videoId: string; startSeconds?: number }): void
  getCurrentTime(): number
  getPlayerState(): number
  getPlaybackRate(): number
  setPlaybackRate(rate: number): void
  setVolume(volume: number): void
  mute(): void
  unMute(): void
  destroy(): void
  getIframe(): HTMLIFrameElement
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    o: {
      host?: string
      width?: string | number
      height?: string | number
      videoId: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: () => void
        onStateChange?: (e: { data: number }) => void
        onError?: (e: { data: number }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

/** The player's states, as `onStateChange` numbers them. */
const UNSTARTED = -1
const ENDED = 0
const PLAYING = 1
const PAUSED = 2
const BUFFERING = 3

let api: Promise<YTNamespace> | null = null

/** YouTube's player script, loaded once for the page's life, the first time a show wants it. */
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  api ??= new Promise<YTNamespace>((resolve, reject) => {
    const before = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      before?.()
      resolve(window.YT!)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      // A blocker, or no network: the next show may ask again.
      api = null
      script.remove()
      reject(new Error('YouTube would not load'))
    }
    document.head.append(script)
  })
  return api
}

/* ------------------------------------------------------------------ the listener */

/**
 * Where a video is, as a steady clock, from YouTube's reports of it. Each
 * report is carried forward from when it arrived, never by more than a
 * third of a second (so a stall, or an advert, holds the clock with it),
 * and the estimate is eased towards that a little each frame, or put there
 * outright when it is more than a quarter of a second out.
 */
export function listener(): { hear(report: number, moving: boolean, rate: number, now: number): number; reset(): void } {
  let est = 0
  let estAt = 0
  let last = NaN
  let lastAt = 0
  let fresh = true
  return {
    hear(report, moving, rate, now) {
      if (report !== last) {
        last = report
        lastAt = now
      }
      if (!moving || fresh) {
        fresh = !moving
        est = report
        estAt = now
        return est
      }
      const target = report + Math.min(0.33, (now - lastAt) / 1000) * rate
      const run = est + ((now - estAt) / 1000) * rate
      const err = target - run
      // Far out (a seek, a skip): believe the report. Close: ease onto it, never backwards.
      const next = Math.abs(err) > 0.25 ? target : Math.max(est, run + err * 0.12)
      est = next
      estAt = now
      return est
    },
    reset() {
      fresh = true
      last = NaN
    },
  }
}

/* ------------------------------------------------------------------ the soundtrack */

interface Deck {
  cue: Required<Omit<YouTubeCue, 'until'>> & { until: number }
  player: YTPlayer | null
  box: HTMLElement
  ready: boolean
  state: number
  /** Asked to run: by the show's play, or early and silent for its entry. */
  running: boolean
  /** Running before its entry, to be heard from its entry on. */
  early: boolean
  volume: number
  /** When we last told it to play or stop. */
  toldAt: number
  /** How far ahead of where it should be it is sent when it is put on time, learnt from how late it comes out of a seek. */
  lead: number
  /** When it last began to move, so it is judged only once it is running steadily. */
  movingAt: number
  ear: ReturnType<typeof listener>
}

/** A cue with its gaps filled: in at 0, from the video's start, to the video's end, no fades. */
function settle(c: YouTubeCue): Deck['cue'] {
  return { id: c.id, at: c.at ?? 0, from: c.from ?? 0, until: c.until ?? Infinity, fadeIn: c.fadeIn ?? 0, fadeOut: c.fadeOut ?? 0 }
}

export interface YouTubeSoundtrack extends Soundtrack {
  /** YouTube's own last word on where the music is, in seconds of show, unsmoothed: for the dev probes. */
  report(): number | null
  /** Heard when the viewer plays or pauses YouTube's own player, so the show can go with it. */
  onPlayer(fn: (playing: boolean) => void): void
}

/** YouTube's players for a show's soundtrack, drawn into `host`, which the page puts where it can be seen. */
export function createYouTubeSoundtrack(host: HTMLElement): YouTubeSoundtrack {
  let decks: Deck[] = []
  let status: SoundtrackState = 'none'
  let generation = 0
  let wanted = false
  let speed = 1
  let muted = false
  /** The show's time as last followed: the floor the clock keeps to while it plays. */
  let shown = 0
  let changed = () => {}
  let toldPlayer: (playing: boolean) => void = () => {}
  /** A play waiting to hear whether the browser let it start. */
  let pending: ((r: PlayResult) => void) | null = null
  let patience = 0
  /** Plays asked for while the players were still loading. */
  let waiting: (() => void)[] = []

  const set = (next: SoundtrackState) => {
    if (next === status) return
    status = next
    if (next !== 'loading') {
      const now = waiting
      waiting = []
      for (const fn of now) fn()
    }
    changed()
  }

  /** The cue the show is in at `t`: the last to have come in. */
  const at = (t: number): Deck | null => {
    let found: Deck | null = null
    for (const d of decks) if (d.cue.at <= t + 1e-6) found = d
    return found
  }

  /** Where a cue's video should be at show time `t`. */
  const videoAt = (d: Deck, t: number) => d.cue.from + (t - d.cue.at)

  /** How loud a cue should be at `t`, 0 to 1: its fades, and nothing before it is in or after it is out. */
  const level = (d: Deck, t: number): number => {
    const { at: a, until, fadeIn, fadeOut } = d.cue
    if (t < a || t >= until) return 0
    const up = fadeIn > 0 ? Math.min(1, (t - a) / fadeIn) : 1
    const down = fadeOut > 0 && Number.isFinite(until) ? Math.min(1, (until - t) / fadeOut) : 1
    return Math.max(0, Math.min(up, down))
  }

  const setVolume = (d: Deck, v: number) => {
    const n = Math.round(v * 100)
    if (!d.player || !d.ready || n === d.volume) return
    d.volume = n
    d.player.setVolume(n)
  }

  const start = (d: Deck, t: number, early: boolean) => {
    if (!d.player || !d.ready) return
    d.running = true
    d.early = early
    d.toldAt = performance.now()
    d.ear.reset()
    d.player.setPlaybackRate(speed)
    if (muted) d.player.mute()
    else d.player.unMute()
    setVolume(d, early ? 0 : level(d, t))
    d.player.seekTo(Math.max(0, videoAt(d, t)), true)
    d.player.playVideo()
  }

  const stop = (d: Deck) => {
    d.running = false
    d.early = false
    d.toldAt = performance.now()
    if (d.player && d.ready) d.player.pauseVideo()
  }

  /**
   * A cue running early, silently, put on the show's time before it is heard. A player comes out of a start or a
   * seek later than asked, by a few tenths of a second, so it is sent that much ahead next time, and it is judged
   * again once it has been running a moment.
   */
  const ontime = (d: Deck, t: number) => {
    const now = performance.now()
    if (d.state !== PLAYING || now - d.movingAt < 250 || now - d.toldAt < 250) return
    const off = d.cue.at + d.player!.getCurrentTime() - d.cue.from - t
    if (Math.abs(off) <= TRUE) return
    d.lead = Math.max(0, Math.min(1.5, d.lead - off))
    d.toldAt = now
    d.movingAt = now
    d.player!.seekTo(videoAt(d, t) + d.lead, true)
  }

  /** Which player is seen: the one being heard, or the first before anything is. */
  const raise = (top: Deck | null) => {
    for (const d of decks) d.box.classList.toggle('on', d === (top ?? decks[0]))
  }

  /** Put every cue where the show is at `t`: the one it is in running, the rest stopped, the next one ready. */
  const arrange = (t: number) => {
    const now = at(t)
    raise(now)
    for (const d of decks) {
      const inside = d === now && t < d.cue.until
      if (wanted && inside) start(d, t, false)
      else if (d.running) stop(d)
    }
  }

  const settleRefusal = (result: PlayResult) => {
    window.clearTimeout(patience)
    const done = pending
    pending = null
    done?.(result)
  }

  function stateChange(d: Deck, state: number): void {
    if (state === PLAYING && d.state !== PLAYING) d.movingAt = performance.now()
    d.state = state
    const current = d === at(shown)
    // News that follows our own word to it closely is its answer; later news is the viewer's hand on YouTube's player.
    const theirs = performance.now() - d.toldAt > ECHO
    if (state === PLAYING) {
      if (pending && current) settleRefusal('playing')
      else if (!d.running && current && theirs) toldPlayer(true)
    } else if (state === PAUSED) {
      if (pending && current) {
        // Started and taken back at once: the browser wants a gesture first.
        settleRefusal('blocked')
      } else if (d.running && current && wanted && theirs) {
        d.running = false
        toldPlayer(false)
      }
    }
  }

  /** Start the cue the show is in, and hear whether the browser lets it. */
  function begin(): Promise<PlayResult> {
    arrange(shown)
    const d = at(shown)
    if (!d || shown >= d.cue.until) return Promise.resolve<PlayResult>('playing')
    const began = performance.now()
    return new Promise<PlayResult>((resolve) => {
      pending = resolve
      const wait = () => {
        patience = window.setTimeout(() => {
          if (pending !== resolve) return
          // Slow to come, not refused: give it longer.
          if (d.state === BUFFERING && performance.now() - began < PATIENCE_BUFFERING) return wait()
          // It never started: the browser is holding it for a gesture.
          for (const x of decks) if (x.running) stop(x)
          settleRefusal('blocked')
        }, PATIENCE)
      }
      wait()
    })
  }

  return {
    load(spec: SoundtrackSpec | null) {
      const mine = ++generation
      wanted = false
      settleRefusal('silent')
      const left = waiting
      waiting = []
      for (const fn of left) fn()
      for (const d of decks) d.player?.destroy()
      host.replaceChildren()
      decks = []
      shown = 0
      host.hidden = !spec?.youtube?.length
      if (!spec?.youtube?.length) {
        set('none')
        return
      }
      status = 'loading'
      changed()
      decks = spec.youtube.map((c) => {
        const box = document.createElement('div')
        box.className = 'yt-deck'
        const mount = document.createElement('div')
        box.append(mount)
        host.append(box)
        return { cue: settle(c), player: null, box, ready: false, state: UNSTARTED, running: false, early: false, volume: -1, toldAt: 0, lead: 0, movingAt: 0, ear: listener() }
      })
      raise(null)
      loadApi().then(
        (YT) => {
          if (mine !== generation) return
          for (const d of decks) {
            const mount = d.box.firstElementChild as HTMLElement
            d.player = new YT.Player(mount, {
              host: 'https://www.youtube-nocookie.com',
              width: '100%',
              height: '100%',
              videoId: d.cue.id,
              playerVars: {
                playsinline: 1,
                controls: 0,
                disablekb: 1,
                rel: 0,
                iv_load_policy: 3,
                fs: 0,
                start: Math.floor(d.cue.from),
                origin: location.origin,
              },
              events: {
                onReady: () => {
                  if (mine !== generation) return
                  d.ready = true
                  d.player!.getIframe().title = 'The music, on YouTube'
                  if (decks.every((x) => x.ready)) set('ready')
                },
                onStateChange: (e) => {
                  if (mine === generation) stateChange(d, e.data)
                },
                onError: (e) => {
                  if (mine !== generation) return
                  console.warn(`shows: YouTube would not play ${d.cue.id} (error ${e.data})`)
                  settleRefusal('silent')
                  set('failed')
                },
              },
            })
          }
        },
        (err) => {
          if (mine !== generation) return
          console.warn(`shows: ${err instanceof Error ? err.message : err}`)
          set('failed')
        },
      )
    },
    state: () => status,
    position() {
      if (!wanted || status !== 'ready') return null
      const d = at(shown)
      if (!d || !d.player || !d.running || d.early) return null
      // A cue that has run out, or been stopped at its end, has nothing to say: the wall carries the show on.
      if (d.state === ENDED) return null
      const moving = d.state === PLAYING
      const heard = d.cue.at + (d.ear.hear(d.player.getCurrentTime(), moving, d.player.getPlaybackRate() || speed, performance.now()) - d.cue.from)
      // Never behind what was shown: a player that starts late holds the picture until it catches up.
      return Math.max(heard, shown)
    },
    follow(t) {
      shown = t
      if (!wanted || status !== 'ready') return
      const now = at(t)
      for (const d of decks) {
        if (!d.player || !d.ready) continue
        const lead = d.cue.at - t
        if (d === now) {
          if (t >= d.cue.until) {
            if (d.running) stop(d)
            continue
          }
          if (d.early) {
            // Its entry: it has been running silently, and is heard from here.
            d.early = false
            raise(d)
          } else if (!d.running && d.state !== ENDED) {
            // Its entry, with nothing to run early from (a video from its first second): in now.
            start(d, t, false)
            raise(d)
          }
          setVolume(d, level(d, t))
        } else if (lead > 0 && lead <= PREROLL && d.cue.from >= lead && !d.running) {
          // Next in, and its video has room before its entry: start it now, silently, so it is running when it is heard.
          start(d, t, true)
        } else if (lead > 0 && d.early) {
          setVolume(d, 0)
          ontime(d, t)
        } else if (lead <= 0 && d.running) {
          // Still sounding after the next has come in: it plays out to its own end and fade.
          setVolume(d, level(d, t))
          if (t >= d.cue.until) stop(d)
        }
      }
    },
    play(t) {
      if (!decks.length || status === 'failed') return Promise.resolve<PlayResult>('silent')
      wanted = true
      shown = Math.max(0, t)
      settleRefusal('playing')
      if (status !== 'ready') {
        // The players are still coming. The music is asked for, so the picture waits for it, as it waits for a file.
        const mine = generation
        return new Promise<PlayResult>((resolve) => {
          waiting.push(() => resolve(mine === generation && wanted && status === 'ready' ? begin() : 'silent'))
        })
      }
      return begin()
    },
    pause() {
      wanted = false
      settleRefusal('playing')
      for (const d of decks) if (d.running) stop(d)
    },
    seek(t) {
      shown = Math.max(0, t)
      for (const d of decks) d.ear.reset()
      if (wanted) arrange(shown)
      else raise(at(shown))
    },
    setSpeed(next) {
      speed = next
      for (const d of decks) if (d.player && d.ready) d.player.setPlaybackRate(next)
    },
    setMuted(next) {
      muted = next
      for (const d of decks) {
        if (!d.player || !d.ready) continue
        if (next) d.player.mute()
        else d.player.unMute()
      }
    },
    onChange(fn) {
      changed = fn
    },
    onPlayer(fn) {
      toldPlayer = fn
    },
    report() {
      const d = at(shown)
      return d?.player && d.ready ? d.cue.at + d.player.getCurrentTime() - d.cue.from : null
    },
  }
}
