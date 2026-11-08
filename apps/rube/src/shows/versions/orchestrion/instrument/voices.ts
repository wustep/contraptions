/**
 * The voices: each part's sound, worked out from how it was touched. Plain arithmetic into sample arrays, so it is
 * the same in a page and in the headless checks, and the same every time.
 *
 * - A **bar** is a modal resonator: a few damped sinusoids at a beam's tuned modes. What excites them is the
 *   contact. A ball meets a bar for a fraction of a millisecond, and a shorter contact (a harder hit) reaches higher
 *   modes: the half-sine pulse of that contact is the filter on the partials (Hertz: the contact shortens as the
 *   fifth root of the speed). The mode that has a node at the middle is quiet when a bar is struck at its middle.
 *   Aluminium rings long; rosewood is warmer and short.
 * - A **string** is Karplus–Strong: a delay line a period long, a loss filter in its loop, tuned to the fraction of
 *   a sample with an all-pass. The ball's touch is the excitation, and where it touched is a comb on it (a string
 *   struck near its end is thin and bright).
 * - A **pipe** is an air column: a waveguide comb at its open pipe's period, breathed into by the ball as it falls
 *   through — noise for the turbulence and the ball's own push, in for as long as the ball is in the bore, harder
 *   as it falls faster — and ringing on a little after it has gone.
 * - A **chime** is a hanging tube: a beam's free modes, long, with the slow beat a real tube has between two nearly
 *   equal modes.
 */

export const SR = 44100

/** A seeded noise: the same hiss every time. */
export function noise(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >> 17
    s ^= s << 5
    s >>>= 0
    return s / 2147483648 - 1
  }
}

/** Where a voice goes: two channels, and how much of it in each. */
export interface Out {
  L: Float32Array
  R: Float32Array
  /** First sample. */
  at: number
  gl: number
  gr: number
}

/** Adds a sum of damped sinusoids: frequencies, amplitudes, time constants (seconds). */
function modes(out: Out, f: number[], a: number[], tau: number[], attack: number): void {
  const { L, R, at, gl, gr } = out
  for (let m = 0; m < f.length; m++) {
    if (f[m] >= SR * 0.45 || a[m] === 0) continue
    const len = Math.min(L.length - at, Math.ceil(tau[m] * 6.9 * SR))
    if (len <= 0) continue
    // A damped rotation: the recursion of a decaying phasor, exact and cheap. Its sine starts from rest, as a
    // resonator's answer to a blow does.
    const w = (2 * Math.PI * f[m]) / SR
    const r = Math.exp(-1 / (tau[m] * SR))
    const c = r * Math.cos(w)
    const s = r * Math.sin(w)
    let re = a[m]
    let im = 0
    const rise = Math.max(1, Math.round(attack * SR))
    for (let i = 0; i < len; i++) {
      const v = i < rise ? im * (0.5 - 0.5 * Math.cos((Math.PI * i) / rise)) : im
      L[at + i] += v * gl
      R[at + i] += v * gr
      const nre = re * c - im * s
      im = re * s + im * c
      re = nre
    }
  }
}

/** The spectrum of a half-sine contact `tc` seconds long at frequency `f`, 1 at 0 Hz. */
export function contact(f: number, tc: number): number {
  const x = 2 * f * tc
  if (Math.abs(1 - x * x) < 1e-6) return Math.PI / 4
  return Math.abs(Math.cos(Math.PI * f * tc) / (1 - x * x))
}

/** How long a ball stays on a part, seconds: shorter the harder it comes in (Hertz: as the speed to the −1/5). */
export const contactTime = (v: number, soft: number): number => soft * Math.pow(Math.max(0.5, v) / 13.5, -0.2)

/** How long a bar's fundamental rings, seconds. Also the drawing's glow. */
export function barRing(hz: number, metal: boolean): number {
  return metal ? Math.min(2.4, Math.max(0.5, 1.7 * Math.pow(440 / hz, 0.5))) : Math.min(1.2, Math.max(0.28, 0.85 * Math.pow(440 / hz, 0.6)))
}

export function bar(out: Out, hz: number, v: number, u: number, metal: boolean): void {
  const tc = contactTime(v, metal ? 0.00055 : 0.0009)
  const t1 = barRing(hz, metal)
  const ratios = metal ? [1, 3.99, 9.83] : [1, 3.93, 9.24]
  const f = ratios.map((r) => r * hz)
  // The second mode has a node at the middle; the first and third are loudest there.
  const off = Math.abs(u - 0.5)
  const shape = [1, Math.min(1, 0.25 + 4 * off), 1 - 1.2 * off]
  const base = metal ? [1, 0.38, 0.16] : [1, 0.5, 0.12]
  const level = Math.pow(v / 13.5, 1.1) * Math.pow(hz / 440, -0.28)
  const a = f.map((fm, m) => level * base[m] * shape[m] * contact(fm, tc))
  const tau = metal ? [t1, t1 * 0.22, t1 * 0.075] : [t1, t1 * 0.3, t1 * 0.11]
  modes(out, f, a, tau, tc)
  // The touch itself: a click a millisecond long, quiet, so the onset reads.
  const rnd = noise(Math.round(hz * 1000 + v * 77))
  const n = Math.round(0.0012 * SR)
  let lp = 0
  for (let i = 0; i < n && out.at + i < out.L.length; i++) {
    lp += 0.35 * (rnd() - lp)
    const k = 0.06 * level * (1 - i / n)
    out.L[out.at + i] += lp * k * out.gl
    out.R[out.at + i] += lp * k * out.gr
  }
}

/** How long a string rings, seconds. Also the drawing's vibration. */
export const stringRing = (hz: number): number => Math.min(5, Math.max(1.6, 3.6 * Math.pow(150 / hz, 0.35)))

export function string(out: Out, hz: number, v: number, u: number): void {
  const { L, R, at, gl, gr } = out
  const T60 = stringRing(hz)
  const len = Math.min(L.length - at, Math.ceil(T60 * SR))
  if (len <= 0) return
  // The loop: N whole samples, the loss filter's half a sample, and an all-pass for the rest.
  const S = 0.5
  const period = SR / hz
  const whole = Math.floor(period - S - 0.1)
  const frac = period - S - whole
  const C = (1 - frac) / (1 + frac)
  const g = Math.pow(10, -3 / (T60 * hz))
  const line = new Float32Array(whole + 2)
  // The excitation: a short pulse, brighter the harder the touch, combed by where along the string it landed.
  const bright = Math.min(0.7, 0.22 + 0.03 * v)
  const rnd = noise(Math.round(hz * 31 + v * 1009 + u * 7))
  const exc = new Float32Array(whole)
  let lp = 0
  for (let i = 0; i < whole; i++) {
    const shape = Math.sin((Math.PI * i) / whole)
    lp += bright * (rnd() * 0.25 + shape - lp)
    exc[i] = lp
  }
  const pick = Math.max(1, Math.round(Math.min(u, 1 - u) * whole))
  const level = 0.55 * Math.pow(v / 13.5, 1.05)
  let idx = 0
  let prev = 0
  let apX = 0
  let apY = 0
  let dc = 0
  let dcIn = 0
  // A soundboard's gentleness: the top above 3.5 kHz taken down, as a harp's wood does.
  const soft = 1 - Math.exp((-2 * Math.PI * 3500) / SR)
  let body = 0
  for (let i = 0; i < len; i++) {
    const out0 = line[idx]
    // One-zero loss filter, then the all-pass for the fraction.
    const lpOut = (1 - S) * out0 + S * prev
    prev = out0
    const ap = C * lpOut + apX - C * apY
    apX = lpOut
    apY = ap
    let x = 0
    if (i < whole) x = exc[i] - (i >= pick ? exc[i - pick] : 0)
    const y = x * level + g * ap
    line[idx] = y
    idx = idx + 1 >= whole ? 0 : idx + 1
    // A gentle DC block, and out.
    dc = y - dcIn + 0.995 * dc
    dcIn = y
    // The last half second fades, so a long string never stops on a step.
    body += soft * (dc - body)
    const tail = len - i < SR * 0.5 ? (len - i) / (SR * 0.5) : 1
    L[at + i] += body * gl * tail
    R[at + i] += body * gr * tail
  }
}

/** The breath a ball gives a pipe: in at `tIn` (s from the voice's start: 0), out at `dur`, speeds in and out. */
export function pipe(out: Out, hz: number, dur: number, vIn: number, vOut: number, seed: number): void {
  const { L, R, at, gl, gr } = out
  const after = 1.4
  const len = Math.min(L.length - at, Math.ceil((dur + after) * SR))
  if (len <= 0) return
  // The column's period, less the delay its loss filter adds at the fundamental, so the resonance is in tune too.
  const LOSS = 0.32
  const wf = (2 * Math.PI * hz) / SR
  const lossDelay = Math.atan2((1 - LOSS) * Math.sin(wf), 1 - (1 - LOSS) * Math.cos(wf)) / wf
  const period = SR / hz - lossDelay
  const N = Math.floor(period)
  const frac = period - N
  const size = N + 2
  const line = new Float32Array(size)
  let w = 0
  const g = 0.985
  let lp = 0
  const rnd = noise(seed)
  let hp = 0
  let hpIn = 0
  let breath = 0
  let core = 0
  const dw = (2 * Math.PI * hz) / SR
  const mouth = 1 - Math.exp((-2 * Math.PI * 2500) / SR)
  let airLp = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    // The breath: up quickly as the ball comes in, following its speed down the bore, and away after it leaves.
    const k = t < dur ? Math.min(1, t / 0.035) * ((vIn + (vOut - vIn) * (t / dur)) / 20) : ((vOut / 20) * Math.exp(-(t - dur) / 0.09))
    breath += 0.004 * (k - breath)
    // Turbulence, high-passed, into the column.
    const n = rnd()
    hp = 0.97 * (hp + n - hpIn)
    hpIn = n
    const x = hp * breath * 0.05
    // The column: a comb a period long, with a loss filter, read with a fractional delay.
    const r0 = line[(w - N + size) % size]
    const r1 = line[(w - N - 1 + size) % size]
    const back = r0 + (r1 - r0) * frac
    lp += LOSS * (back - lp)
    const y = x + g * lp
    line[w] = y
    w = (w + 1) % size
    // The steady tone the column settles to, under the hiss: what makes it a note and not a rush of air.
    core += 0.0025 * (breath - core)
    const tone = Math.sin(dw * i) * core * 0.34 + Math.sin(2 * dw * i) * core * 0.07
    const tail = len - i < SR * 0.3 ? (len - i) / (SR * 0.3) : 1
    // The pipe's mouth is round and its air soft: nothing above about 2.5 kHz to speak of.
    airLp += mouth * (y * 0.9 + tone - airLp)
    const s = airLp * tail
    L[at + i] += s * gl
    R[at + i] += s * gr
  }
}

/** A knock on a pipe's wall from inside: a short tap into the column. */
export function pipeKnock(out: Out, hz: number, v: number): void {
  const level = 0.08 * Math.min(1, v / 10)
  const f = [hz, 2 * hz, 3 * hz, 4.1 * hz]
  modes(out, f, f.map((_, m) => level / (m + 1)), [0.35, 0.22, 0.14, 0.06], 0.002)
}

export const chimeRing = 5.5

export function chime(out: Out, hz: number, v: number): void {
  const ratios = [1, 1.0026, 2.756, 2.761, 5.404, 8.933]
  const amps = [0.55, 0.45, 0.42, 0.2, 0.22, 0.1]
  const taus = [chimeRing, chimeRing * 0.92, 3.1, 2.8, 1.6, 0.8]
  const tc = 0.0011
  const f = ratios.map((r) => r * hz)
  modes(out, f, f.map((fm, m) => v * amps[m] * contact(fm, tc)), taus, tc)
}

/** The escapement letting go, a ball seating against another, a flap, a landing in felt, a ball into the bowl. */
export function knock(out: Out, kind: 'tick' | 'seat' | 'felt' | 'bowl' | 'flap', v: number): void {
  switch (kind) {
    case 'tick':
      modes(out, [1180, 2730], [0.05, 0.025], [0.028, 0.012], 0.0006)
      break
    case 'seat':
      modes(out, [2950, 6650], [0.022 * Math.min(1, v / 2), 0.012], [0.006, 0.003], 0.0002)
      break
    case 'flap':
      modes(out, [640, 1580], [0.035, 0.018], [0.03, 0.014], 0.0008)
      break
    case 'bowl':
      modes(out, [1840, 4420, 7100], [0.03, 0.018, 0.008], [0.09, 0.05, 0.02], 0.0003)
      break
    case 'felt': {
      const level = 0.07 * Math.min(1.5, v / 22)
      modes(out, [88, 141], [level, level * 0.5], [0.045, 0.03], 0.002)
      const rnd = noise(Math.round(v * 1000))
      let lp = 0
      const n = Math.round(0.012 * SR)
      for (let i = 0; i < n && out.at + i < out.L.length; i++) {
        lp += 0.08 * (rnd() - lp)
        const k = level * 0.8 * (1 - i / n)
        out.L[out.at + i] += lp * k * out.gl
        out.R[out.at + i] += lp * k * out.gr
      }
      break
    }
  }
}
