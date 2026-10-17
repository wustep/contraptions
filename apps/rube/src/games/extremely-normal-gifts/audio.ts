/** Small dry mechanical notes. No assets, autoplay, music bed or sustained oscillators. */
export class GiftAudio {
  private context: AudioContext | null = null
  muted = false

  unlock(): void {
    if (this.muted) return
    try {
      this.context ??= new AudioContext()
      void this.context.resume().catch(() => {})
    } catch {
      /* Audio is optional on devices without Web Audio. */
    }
  }

  setMuted(value: boolean): void {
    this.muted = value
    if (value) void this.context?.suspend().catch(() => {})
    else this.unlock()
  }

  note(frequency: number, length = 0.09, delay = 0, type: OscillatorType = 'sine', volume = 0.08): void {
    if (this.muted || !this.context || this.context.state !== 'running') return
    const ctx = this.context
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const when = ctx.currentTime + delay
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, when)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.7), when + length)
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(volume, when + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.001, when + length)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(when)
    oscillator.stop(when + length + 0.01)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }

  click(): void {
    this.unlock()
    this.note(620, 0.035, 0, 'triangle', 0.045)
  }
  hit(id: string): void {
    if (id === 'bell') this.note(1400, 0.42)
    else if (id === 'cannon') {
      this.note(110, 0.17, 0, 'triangle', 0.15)
      this.note(75, 0.12, 0.025, 'sine', 0.12)
    } else if (id === 'photo') {
      this.note(1800, 0.025, 0, 'triangle')
      this.note(900, 0.04, 0.055, 'triangle')
    } else if (id === 'snow' || id === 'paint')
      [0, 0.06, 0.12, 0.18].forEach((d, i) => this.note(380 + i * 140, 0.06, d, 'triangle', 0.045))
    else this.note(id === 'stamp' ? 150 : 420, 0.1, 0, 'triangle', 0.1)
  }
  finish(): void {
    ;[523, 659, 784].forEach((f, i) => this.note(f, 0.24, i * 0.11, 'sine', 0.075))
  }
  destroy(): void {
    void this.context?.close().catch(() => {})
  }
}
