import type { Cue } from './performance'

/** Small, dry sounds. Audio is created only after a gesture and never controls the game clock. */
export class GardenSound {
  private context: AudioContext | null = null
  enabled = true
  unlock(): void {
    if (!this.enabled) return
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* A silent garden still plays. */ }
  }
  play(cue: Pick<Cue, 'kind' | 'pitch'>): void {
    const ctx = this.context
    if (!this.enabled || !ctx || ctx.state !== 'running') return
    const hz = { offer: 330, pluck: 260, bell: 880, boop: 180, leaf: 520, land: 125 }[cue.kind] * (cue.pitch ?? 1)
    const duration = cue.kind === 'bell' ? 0.6 : cue.kind === 'leaf' ? 0.16 : 0.13
    for (let i = 0; i < (cue.kind === 'bell' ? 3 : 1); i++) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = cue.kind === 'bell' ? 'sine' : 'triangle'
      oscillator.frequency.setValueAtTime(hz * [1, 2.76, 4.07][i], ctx.currentTime)
      if (cue.kind === 'boop') oscillator.frequency.exponentialRampToValueAtTime(hz * 0.5, ctx.currentTime + duration)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.065 / (i + 1), ctx.currentTime + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + duration + 0.01)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    }
  }
  quiet(): void { if (this.context?.state === 'running') void this.context.suspend().catch(() => {}) }
  destroy(): void { void this.context?.close().catch(() => {}) }
}
