import { downloadBlob } from '../../../../src/core/capture'
import { FPS } from '../../../../src/core/constants'
import type { SoundtrackSpec } from './registry'
import { hearing } from './soundtrack'

/**
 * A show as a video file: the picture and the music, and nothing else.
 *
 * The rest of the app records a canvas by walking its frames against the
 * wall clock. A show has music in it, so here the recording is a
 * performance: the soundtrack plays through once, into the file and not
 * only the speakers, and every frame painted is the frame for where the
 * music is at that instant. A frame that comes late is a frame dropped,
 * never a frame that pushes the ones after it off their notes, so the
 * picture in the file is locked to the music in the file from the first
 * bar to the last however the machine doing the recording is coping.
 *
 * It takes as long as the show does, at the speed it is recorded at.
 */

/**
 * How long an element's sound takes to reach the file, in seconds of real
 * time: the element says where it is, and its samples come through the audio
 * graph and into the recorder a little after. Left alone, every note in a
 * file trails its strike by this much. The picture is painted this far
 * behind the element's clock, so that in the file the two arrive together.
 *
 * Measured, not derived: Chrome on macOS, the placeholder show saved at 1×
 * and at 2×, the first note's onset and the portal cut's first dark frame
 * read back out of the file with ffmpeg against the show's own times. The
 * sound trailed by 65ms and 50ms; with this, by under a frame.
 */
const TAPE_DELAY = 0.055

export interface RecordingFormat {
  mime: string
  ext: 'webm' | 'mp4'
}

/** What this browser can record a show as: WebM where it can, MP4 where that is what there is (Safari). */
export function recordingFormat(withAudio: boolean): RecordingFormat | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates: RecordingFormat[] = withAudio
    ? [
        { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
        { mime: 'video/webm', ext: 'webm' },
        { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
        { mime: 'video/mp4', ext: 'mp4' },
      ]
    : [
        { mime: 'video/webm;codecs=vp9', ext: 'webm' },
        { mime: 'video/webm;codecs=vp8', ext: 'webm' },
        { mime: 'video/webm', ext: 'webm' },
        { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
        { mime: 'video/mp4', ext: 'mp4' },
      ]
  return candidates.find((c) => MediaRecorder.isTypeSupported(c.mime)) ?? null
}

export interface RecordOptions {
  canvas: HTMLCanvasElement
  filename: string
  /** Seconds of show. */
  duration: number
  speed: number
  soundtrack?: SoundtrackSpec
  /** Whether the music is also heard while it is recorded. It is in the file either way. */
  monitor: boolean
  /** Paint the frame for show time `t`. */
  paint(t: number): void
  progress?(done: number): void
  /** Aborting stops the recording and keeps no file. */
  signal: AbortSignal
}

/** The next frame, or a tenth of a second where there are none: a hidden tab paints nothing, and the music must not be left to run on alone. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const go = () => {
      if (done) return
      done = true
      resolve()
    }
    requestAnimationFrame(go)
    window.setTimeout(go, 100)
  })
}

function once(target: EventTarget, ok: string, bad: string, what: string, ms = 20_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${what} took too long.`)), ms)
    target.addEventListener(ok, () => { window.clearTimeout(timer); resolve() }, { once: true })
    target.addEventListener(bad, () => { window.clearTimeout(timer); reject(new Error(`${what} failed.`)) }, { once: true })
  })
}

/** Resolves true when a file was saved, false when the recording was stopped. */
export async function recordShow(o: RecordOptions): Promise<boolean> {
  const format = recordingFormat(!!o.soundtrack)
  if (!format) throw new Error('This browser cannot record the canvas.')

  // The recording's own player and its own graph, so nothing it does to them outlives it.
  let audio: HTMLAudioElement | null = null
  let context: AudioContext | null = null
  const tracks: MediaStreamTrack[] = []
  const offset = o.soundtrack?.offset ?? 0
  if (o.soundtrack) {
    context = new AudioContext()
    audio = new Audio()
    audio.preload = 'auto'
    audio.preservesPitch = true
    const loaded = once(audio, 'canplaythrough', 'error', 'Loading the soundtrack')
    audio.src = o.soundtrack.src
    audio.load()
    await Promise.all([loaded, context.resume()])
    audio.playbackRate = o.speed
    if (offset > 0) {
      const sought = once(audio, 'seeked', 'error', 'Finding the top of the soundtrack')
      audio.currentTime = offset
      await sought
    }
    const source = context.createMediaElementSource(audio)
    const tape = context.createMediaStreamDestination()
    source.connect(tape)
    if (o.monitor) source.connect(context.destination)
    tracks.push(...tape.stream.getAudioTracks())
  }

  o.paint(0)
  const picture = o.canvas.captureStream(FPS)
  tracks.push(...picture.getVideoTracks())
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(new MediaStream(tracks), {
    mimeType: format.mime,
    videoBitsPerSecond: 12_000_000,
    audioBitsPerSecond: 192_000,
  })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(), { once: true })
    recorder.addEventListener('error', () => reject(new Error('The recording failed.')), { once: true })
  })

  try {
    recorder.start()
    await nextFrame()
    const ear = audio ? hearing(audio, () => offset) : null
    if (audio) await audio.play()
    let t = 0
    let at = performance.now()
    for (;;) {
      if (o.signal.aborted) break
      // Where the music is on the tape; without any, or once it has run out before the show has, the wall clock carries on.
      const wall = performance.now()
      if (ear && !audio!.ended) t = ear.position() - TAPE_DELAY * o.speed
      else t += ((wall - at) / 1000) * o.speed
      at = wall
      if (t >= o.duration) break
      o.paint(Math.max(0, t))
      o.progress?.(Math.max(0, t) / o.duration)
      await nextFrame()
    }
    audio?.pause()
    if (!o.signal.aborted) {
      // The last frame, held long enough to be in the file.
      o.paint(o.duration)
      o.progress?.(1)
      await nextFrame()
      await nextFrame()
    }
    if (recorder.state === 'recording') recorder.requestData()
    recorder.stop()
    await stopped
  } finally {
    if (recorder.state !== 'inactive') recorder.stop()
    for (const t of tracks) t.stop()
    audio?.pause()
    audio?.removeAttribute('src')
    void context?.close()
  }

  if (o.signal.aborted) return false
  if (!chunks.length) throw new Error('The recording produced no data.')
  downloadBlob(new Blob(chunks, { type: format.mime.split(';')[0] }), `${o.filename}.${format.ext}`)
  return true
}
