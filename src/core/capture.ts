import type p5 from 'p5'
import { FPS } from './constants'

/**
 * Getting a picture out of a canvas, for both modes: one frame as a PNG at
 * any multiple of the screen's density, or a run of frames as a WebM. Each
 * mode owns its clock and says what frame `i` is; this only holds the camera.
 */

export function canvasOf(instance: p5): HTMLCanvasElement {
  // p5 exposes the element but @types/p5 does not declare it.
  return (instance as unknown as { canvas: HTMLCanvasElement }).canvas
}

export function downloadBlob(blob: Blob, filename: string): void {
  // A data: anchor is silently dropped by Chromium once the URL grows
  // past a couple of MB, which every scaled export does. A Blob URL has
  // no such cap. The anchor joins the document for Firefox's sake.
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Leave the URL alive long enough for the download to begin.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function webmMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/**
 * Save the frame on the canvas as a PNG. `scale` supersamples: the sketch is
 * redrawn at that multiple of its pixel density for one frame, captured, and
 * put back. `stale` asks for a redraw at scale 1 too, for a sketch that is
 * not looping. toBlob snapshots the bitmap synchronously at call time — only
 * the PNG encoding is async — so the canvas can be restored immediately. The
 * caller holds its clock across the call so the redraws are the same frame.
 */
export function savePng(instance: p5, filename: string, scale = 1, stale = false): void {
  const el = canvasOf(instance)
  const before = instance.pixelDensity()
  if (scale !== 1) instance.pixelDensity(before * scale)
  if (scale !== 1 || stale) instance.redraw()
  el.toBlob((blob) => {
    if (!blob) return
    downloadBlob(blob, `${filename}.png`)
  }, 'image/png')
  if (scale !== 1) {
    instance.pixelDensity(before)
    instance.redraw()
  }
}

/**
 * Record `frames` frames of the canvas as a WebM at the canvas's own size.
 * `paint(i)` draws frame `i`; the caller has stopped its own loop so nothing
 * else paints into the stream. `progress` hears how far along it is, 0..1.
 */
export async function saveWebm(
  el: HTMLCanvasElement,
  filename: string,
  frames: number,
  paint: (i: number) => void,
  progress?: (done: number) => void,
): Promise<void> {
  const mime = webmMime()
  if (!mime) throw new Error('This browser cannot record a WebM from the canvas.')

  // captureStream(fps) timestamps from the live clock. Walking with
  // requestFrame(0) is faster but Chrome writes a 0-duration file, which
  // is a still by another name. Pace the walk at FPS so the WebM runs as
  // long as what you see.
  const stream = el.captureStream(FPS)
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(), { once: true })
    recorder.addEventListener('error', () => reject(new Error('WebM recording failed')), { once: true })
  })

  try {
    recorder.start()
    await waitFrame()
    const origin = performance.now()
    for (let i = 0; i < frames; i++) {
      paint(i)
      progress?.((i + 1) / frames)
      const target = origin + ((i + 1) * 1000) / FPS
      const delay = target - performance.now()
      if (delay > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, delay))
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1000 / FPS))
    if (recorder.state === 'recording') recorder.requestData()
    recorder.stop()
    await stopped
  } finally {
    if (recorder.state !== 'inactive') recorder.stop()
    for (const t of stream.getTracks()) t.stop()
  }

  if (!chunks.length) throw new Error('WebM recording produced no data.')
  downloadBlob(new Blob(chunks, { type: 'video/webm' }), `${filename}.webm`)
}
