import type { Sound } from './game'

/** Small synthesized wood, bell and rubber sounds. No network, samples, or sound before a gesture. */
export class DepotAudio {
  private context: AudioContext | null = null
  muted = false
  unlock(): void {
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* The complete game is playable without audio. */ }
  }
  play(kind: Sound): void {
    const c = this.context
    if (!c || this.muted || c.state !== 'running') return
    const tones: Record<Sound, number[]> = {
      paint: [370, 510], send: [320], bang: [95, 55], good: [660, 880, 1100], bad: [230, 170],
      hold: [290], return: [280, 420, 310], tick: [700], finish: [440, 550, 660, 880],
    }
    tones[kind].forEach((hz, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      const at = c.currentTime + i * (kind === 'finish' ? 0.11 : 0.065)
      osc.type = kind === 'bang' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(hz, at)
      osc.frequency.exponentialRampToValueAtTime(hz * (kind === 'bang' ? 0.45 : 0.92), at + 0.12)
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(kind === 'good' ? 0.075 : 0.055, at + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.17)
      osc.connect(gain).connect(c.destination)
      osc.start(at); osc.stop(at + 0.2)
    })
  }
}
