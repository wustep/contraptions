/**
 * A soundtrack made of nothing: struck notes at given times, rendered to a
 * WAV in memory. It is what the placeholder shows play, so that the tab has
 * music to lock to, double and export before any recording is in the repo,
 * and no recording's licence to answer for. A real version imports a file
 * instead and never comes here.
 *
 * Plain arithmetic into a byte array. No audio context, so it renders the
 * same in the headless checks as in the page.
 */

export interface Note {
  /** Seconds. */
  at: number
  /** Hertz. */
  freq: number
  /** 0..1. */
  gain: number
}

const RATE = 32000
/** How long a note rings, in seconds. */
const RING = 0.9

/**
 * A struck bar: the fundamental, a quiet octave, and the fourth partial a
 * marimba bar is tuned to, which dies first and is what makes the attack
 * read as wood and the instant of it read clearly.
 */
function strike(out: Float32Array, note: Note): void {
  const from = Math.round(note.at * RATE)
  const len = Math.min(out.length - from, Math.round(RING * RATE))
  for (let i = 0; i < len; i++) {
    const t = i / RATE
    // A two-millisecond rise, so the attack is sharp without being a click.
    const rise = Math.min(1, t / 0.002)
    const w = 2 * Math.PI * note.freq * t
    const v = Math.sin(w) * Math.exp(-t * 7) + 0.25 * Math.sin(2 * w) * Math.exp(-t * 11) + 0.35 * Math.sin(4 * w) * Math.exp(-t * 28)
    out[from + i] += v * rise * note.gain * 0.5
  }
}

/** The notes as 16-bit mono PCM in a WAV container, `duration` seconds long. */
export function renderWav(notes: readonly Note[], duration: number): Uint8Array {
  const samples = new Float32Array(Math.ceil(duration * RATE))
  for (const note of notes) if (note.at >= 0 && note.at < duration) strike(samples, note)
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const tag = (at: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)) }
  tag(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  tag(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, Math.round(v * 32767), true)
  }
  return bytes
}

/** A URL for the rendered notes, good for the page's life. */
export function wavUrl(notes: readonly Note[], duration: number): string {
  const bytes = renderWav(notes, duration)
  return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' }))
}
