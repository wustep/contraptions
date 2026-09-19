/**
 * A show's clock. It runs from zero to the show's length and stops there,
 * at one speed or two, and it has two ways of knowing the time.
 *
 * On its own it counts the wall clock, the way Machine's does. With a
 * soundtrack it is told the time instead: `heard` answers with where the
 * recording is, in seconds of show, and while it answers the clock is
 * exactly that. The picture follows the music, never the other way about,
 * so the two cannot drift: a recording that stalls holds the picture with
 * it, and at 2× the picture is wherever the doubled recording has got to.
 * When `heard` has nothing to say — no soundtrack, one that would not
 * load, one that has run out before the show has — the clock carries on
 * from the last thing it heard.
 *
 * Pure: the wall clock is handed in, so the headless checks can drive it.
 */

/** The transport's stops. Two, since a doubled recording still sounds like the music; a quartered one does not. */
export const SHOW_SPEEDS = [1, 2]

export interface TransportOptions {
  /** Seconds of show. */
  duration: number
  /** The wall clock, in milliseconds. */
  wall?: () => number
  /** Where the soundtrack is, in seconds of show, or null when it has no say. */
  heard?: () => number | null
}

export class Transport {
  readonly duration: number
  private readonly wall: () => number
  private readonly heard: () => number | null
  private base = 0
  private origin = 0
  private running = false
  private rate = 1

  constructor(options: TransportOptions) {
    this.duration = options.duration
    this.wall = options.wall ?? (() => performance.now())
    this.heard = options.heard ?? (() => null)
  }

  private clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  now(): number {
    if (!this.running) return this.base
    const heard = this.heard()
    if (heard !== null) {
      // Anchored where the music is, so a recording that drops out is carried on from there.
      this.base = this.clamp(heard)
      this.origin = this.wall()
      return this.base
    }
    return this.clamp(this.base + ((this.wall() - this.origin) / 1000) * this.rate)
  }

  get playing(): boolean {
    return this.running
  }

  get speed(): number {
    return this.rate
  }

  /** At the end, with nowhere left to run. */
  get ended(): boolean {
    return this.now() >= this.duration
  }

  play(): void {
    if (this.running) return
    this.origin = this.wall()
    this.running = true
  }

  pause(): void {
    if (!this.running) return
    this.base = this.now()
    this.running = false
  }

  /**
   * Go to `t`, and answer with where that came to once held to the show's
   * length. The answer is what the soundtrack is sent to: asking `now()` for
   * it would be asking the music, which has not moved yet.
   */
  seek(t: number): number {
    this.base = this.clamp(t)
    this.origin = this.wall()
    return this.base
  }

  setSpeed(speed: number): void {
    this.base = this.now()
    this.origin = this.wall()
    this.rate = speed
  }
}

/** `m:ss`, for a readout. */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
