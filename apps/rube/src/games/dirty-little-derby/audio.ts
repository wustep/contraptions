/** Tiny synthesized wooden clicks and mechanical chirps. No downloads, music, or autoplay. */
export class DerbyAudio {
  private context: AudioContext | null = null
  enabled = false

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled
    if (!enabled) return
    try {
      this.context ??= new AudioContext()
      await this.context.resume()
      this.play('click')
    } catch {
      this.enabled = false
    }
  }

  play(kind: 'click' | 'lock' | 'count' | 'go' | 'prank' | 'finish' | 'win'): void {
    if (!this.enabled || !this.context || this.context.state !== 'running') return
    const ctx = this.context
    const notes: Record<typeof kind, number[]> = {
      click: [420],
      lock: [320, 480],
      count: [240],
      go: [480, 720],
      prank: [300, 210, 150],
      finish: [520, 660],
      win: [390, 490, 590, 780],
    }
    notes[kind].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + i * 0.085
      oscillator.type = kind === 'prank' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.7, start + 0.12)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.12, start + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.18)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    })
  }
}
