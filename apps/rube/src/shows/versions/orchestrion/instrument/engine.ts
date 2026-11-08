/**
 * The voices, as an engine that plays them as they come.
 *
 * Every sound in Orchestrion is a contact in the simulation, and the engine is what turns one into sound: told a
 * contact (a `Strike`: when, what was struck, how hard, where), it starts that part ringing at that sample, and runs
 * everything that is ringing a block at a time. The same engine plays the show live, in an audio thread as the
 * picture goes (`live.ts`), and renders it whole, offline, for a saved video and the headless checks (`score.ts`).
 * So what is heard live and what is in a file are the same arithmetic.
 *
 * Live, the engine keeps the show's time against its own samples (`go`), so at ½× or 2× the balls strike the parts
 * half or twice as often and every part still rings at its own pitch, for its own time: the machine is slower or
 * faster, not the recording.
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
 *
 * `defineEngine` holds all of it and refers to nothing outside itself: the live engine is this function's own text,
 * run in the audio thread (`live.ts`), where nothing else of the page is.
 */

export type StrikeKind = 'bar' | 'string' | 'pipe' | 'pipe-knock' | 'chime' | 'knock'
export type KnockKind = 'tick' | 'seat' | 'felt' | 'bowl' | 'flap'

/** One note as the engine takes it: plain data, so that it can be posted to an audio thread. */
export interface Strike {
  /** Seconds of show. */
  t: number
  kind: StrikeKind
  hz: number
  /** How hard, cells a second. */
  v: number
  /** Where along the part, 0 to 1. */
  u: number
  /** Into the left and right channels: where it happened across the machine, and how loud its kind sits. */
  gl: number
  gr: number
  /** A pipe's breath: how long the ball was in it, and how fast it came out. */
  dur: number
  vOut: number
  /** A bar of aluminium (or rosewood). */
  metal: boolean
  knock: KnockKind
}

export interface Engine {
  /** The notes, in time order. */
  load(notes: Strike[]): void
  /**
   * Plays from show time `from`, which falls at engine sample `at`, at `speed`. Fresh (a play, a seek): what was
   * sounding is let go over a few milliseconds, and what was struck in the seconds before `from` is picked up ringing
   * where it would be. Not fresh (a change of speed): everything sounding rings on, and only the clock changes.
   */
  go(from: number, at: number, speed: number, fresh: boolean): void
  /** Stops at engine sample `at`: nothing new is struck, and everything sounding is let go over a few milliseconds. */
  stop(at: number): void
  /** Adds the `n` samples from engine sample `k0` into `L` and `R`, from index `o`. */
  process(L: Float32Array, R: Float32Array, o: number, n: number, k0: number): void
  /** How many voices are sounding. */
  voices(): number
}

export function defineEngine() {
  /** The rate the voices were tuned at; coefficients per sample are carried to any other. */
  const TUNED = 44100

  /** A seeded noise: the same hiss every time. */
  function noise(seed: number): () => number {
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

  /** The spectrum of a half-sine contact `tc` seconds long at frequency `f`, 1 at 0 Hz. */
  function contact(f: number, tc: number): number {
    const x = 2 * f * tc
    if (Math.abs(1 - x * x) < 1e-6) return Math.PI / 4
    return Math.abs(Math.cos(Math.PI * f * tc) / (1 - x * x))
  }

  /** How long a ball stays on a part, seconds: shorter the harder it comes in (Hertz: as the speed to the −1/5). */
  const contactTime = (v: number, soft: number): number => soft * Math.pow(Math.max(0.5, v) / 13.5, -0.2)

  /** How long a bar's fundamental rings, seconds. Also the drawing's glow. */
  function barRing(hz: number, metal: boolean): number {
    return metal ? Math.min(2.4, Math.max(0.5, 1.7 * Math.pow(440 / hz, 0.5))) : Math.min(1.2, Math.max(0.28, 0.85 * Math.pow(440 / hz, 0.6)))
  }

  /** How long a string rings, seconds. Also the drawing's vibration. */
  const stringRing = (hz: number): number => Math.min(5, Math.max(1.6, 3.6 * Math.pow(150 / hz, 0.35)))

  const chimeRing = 5.5

  interface Voice {
    /** Adds its next `n` samples at `o`; false once it has nothing more to say. */
    run(L: Float32Array, R: Float32Array, o: number, n: number): boolean
    /** Moves on `n` samples without a sound: a note picked up partway through its ring. */
    skip(n: number): void
    /** Under a ramp (`ramped`): which way, and the voice under it. */
    ramp?: 'up' | 'down'
    inner?: Voice
  }

  function makeEngine(sr: number): Engine {
    /** A one-pole smoothing coefficient tuned at 44.1 kHz, at this rate. */
    const per = (k: number): number => 1 - Math.pow(1 - k, TUNED / sr)
    /** A per-sample decay factor tuned at 44.1 kHz, at this rate. */
    const decay = (d: number): number => Math.pow(d, TUNED / sr)

    /** A sum of damped sinusoids: frequencies, amplitudes, time constants (seconds), and a raised-cosine rise. */
    function modal(f: number[], a: number[], tau: number[], attack: number, gl: number, gr: number): Voice {
      const M = f.length
      const re = new Float64Array(M)
      const im = new Float64Array(M)
      const c = new Float64Array(M)
      const s = new Float64Array(M)
      const r = new Float64Array(M)
      const w = new Float64Array(M)
      const left = new Float64Array(M)
      for (let m = 0; m < M; m++) {
        if (f[m] >= sr * 0.45 || a[m] === 0) continue
        // A damped rotation: the recursion of a decaying phasor, exact and cheap. Its sine starts from rest, as a
        // resonator's answer to a blow does.
        w[m] = (2 * Math.PI * f[m]) / sr
        r[m] = Math.exp(-1 / (tau[m] * sr))
        c[m] = r[m] * Math.cos(w[m])
        s[m] = r[m] * Math.sin(w[m])
        re[m] = a[m]
        left[m] = Math.ceil(tau[m] * 6.9 * sr)
      }
      const rise = Math.max(1, Math.round(attack * sr))
      let done = 0
      return {
        run(L, R, o, n) {
          let alive = false
          for (let m = 0; m < M; m++) {
            if (left[m] <= 0) continue
            const k = Math.min(n, left[m])
            const cm = c[m]
            const sm = s[m]
            let x = re[m]
            let y = im[m]
            for (let i = 0; i < k; i++) {
              const g = done + i
              const v = g < rise ? y * (0.5 - 0.5 * Math.cos((Math.PI * g) / rise)) : y
              L[o + i] += v * gl
              R[o + i] += v * gr
              const nx = x * cm - y * sm
              y = x * sm + y * cm
              x = nx
            }
            re[m] = x
            im[m] = y
            left[m] -= k
            if (left[m] > 0) alive = true
          }
          done += n
          return alive
        },
        skip(n) {
          for (let m = 0; m < M; m++) {
            if (left[m] <= 0) continue
            const k = Math.pow(r[m], n)
            const cs = Math.cos(n * w[m]) * k
            const sn = Math.sin(n * w[m]) * k
            const x = re[m] * cs - im[m] * sn
            im[m] = re[m] * sn + im[m] * cs
            re[m] = x
            left[m] -= n
          }
          done += n
        },
      }
    }

    /** A short breath of filtered noise, dying straight away: the touch itself, a landing in felt. */
    function burst(seed: number, lp0: number, seconds: number, level: number, gl: number, gr: number): Voice {
      const rnd = noise(seed)
      const N = Math.max(1, Math.round(seconds * sr))
      const k = per(lp0)
      let lp = 0
      let i0 = 0
      return {
        run(L, R, o, n) {
          for (let i = 0; i < n && i0 < N; i++, i0++) {
            lp += k * (rnd() - lp)
            const a = level * (1 - i0 / N)
            L[o + i] += lp * a * gl
            R[o + i] += lp * a * gr
          }
          return i0 < N
        },
        skip(n) {
          i0 += n
        },
      }
    }

    function bar(hz: number, v: number, u: number, metal: boolean, gl: number, gr: number): Voice[] {
      const tc = contactTime(v, metal ? 0.00055 : 0.0009)
      const t1 = barRing(hz, metal)
      const ratios = metal ? [1, 3.99, 9.83] : [1, 3.93, 9.24]
      const f = ratios.map((q) => q * hz)
      // The second mode has a node at the middle; the first and third are loudest there.
      const off = Math.abs(u - 0.5)
      const shape = [1, Math.min(1, 0.25 + 4 * off), 1 - 1.2 * off]
      const base = metal ? [1, 0.38, 0.16] : [1, 0.5, 0.12]
      const level = Math.pow(v / 13.5, 1.1) * Math.pow(hz / 440, -0.28)
      const a = f.map((fm, m) => level * base[m] * shape[m] * contact(fm, tc))
      const tau = metal ? [t1, t1 * 0.22, t1 * 0.075] : [t1, t1 * 0.3, t1 * 0.11]
      // And the touch: a click a millisecond long, quiet, so the onset reads.
      return [modal(f, a, tau, tc, gl, gr), burst(Math.round(hz * 1000 + v * 77), 0.35, 0.0012, 0.06 * level, gl, gr)]
    }

    function string(hz: number, v: number, u: number, gl: number, gr: number): Voice {
      const T60 = stringRing(hz)
      const len = Math.ceil(T60 * sr)
      // The loop: N whole samples, the loss filter's half a sample, and an all-pass for the rest.
      const S = 0.5
      const period = sr / hz
      const whole = Math.floor(period - S - 0.1)
      const frac = period - S - whole
      const C = (1 - frac) / (1 + frac)
      const g = Math.pow(10, -3 / (T60 * hz))
      const line = new Float32Array(whole + 2)
      // The excitation: a short pulse, brighter the harder the touch, combed by where along the string it landed.
      const bright = per(Math.min(0.7, 0.22 + 0.03 * v))
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
      // A soundboard's gentleness: the top above 3.5 kHz taken down, as a harp's wood does.
      const soft = 1 - Math.exp((-2 * Math.PI * 3500) / sr)
      const block = decay(0.995)
      const fade = sr * 0.5
      let idx = 0
      let prev = 0
      let apX = 0
      let apY = 0
      let dc = 0
      let dcIn = 0
      let body = 0
      let i0 = 0
      const step = (L: Float32Array | null, R: Float32Array | null, o: number, n: number): boolean => {
        for (let i = 0; i < n && i0 < len; i++, i0++) {
          const out0 = line[idx]
          // One-zero loss filter, then the all-pass for the fraction.
          const lpOut = (1 - S) * out0 + S * prev
          prev = out0
          const ap = C * lpOut + apX - C * apY
          apX = lpOut
          apY = ap
          let x = 0
          if (i0 < whole) x = exc[i0] - (i0 >= pick ? exc[i0 - pick] : 0)
          const y = x * level + g * ap
          line[idx] = y
          idx = idx + 1 >= whole ? 0 : idx + 1
          // A gentle DC block, and out.
          dc = y - dcIn + block * dc
          dcIn = y
          body += soft * (dc - body)
          if (L && R) {
            // The last half second fades, so a long string never stops on a step.
            const tail = len - i0 < fade ? (len - i0) / fade : 1
            L[o + i] += body * gl * tail
            R[o + i] += body * gr * tail
          }
        }
        return i0 < len
      }
      return { run: (L, R, o, n) => step(L, R, o, n), skip: (n) => void step(null, null, 0, n) }
    }

    /** The breath a ball gives a pipe: in for `dur`, at speeds `vIn` and `vOut`. */
    function pipe(hz: number, dur: number, vIn: number, vOut: number, seed: number, gl: number, gr: number): Voice {
      const after = 1.4
      const len = Math.ceil((dur + after) * sr)
      // The column's period, less the delay its loss filter adds at the fundamental, so the resonance is in tune too.
      const LOSS = 0.32
      const wf = (2 * Math.PI * hz) / sr
      const lossDelay = Math.atan2((1 - LOSS) * Math.sin(wf), 1 - (1 - LOSS) * Math.cos(wf)) / wf
      const period = sr / hz - lossDelay
      const N = Math.floor(period)
      const frac = period - N
      const size = N + 2
      const line = new Float32Array(size)
      const g = 0.985
      const rnd = noise(seed)
      const kBreath = per(0.004)
      const kCore = per(0.0025)
      const hpK = decay(0.97)
      const dw = (2 * Math.PI * hz) / sr
      const mouth = 1 - Math.exp((-2 * Math.PI * 2500) / sr)
      const fade = sr * 0.3
      let w = 0
      let lp = 0
      let hp = 0
      let hpIn = 0
      let breath = 0
      let core = 0
      let airLp = 0
      let i0 = 0
      const step = (L: Float32Array | null, R: Float32Array | null, o: number, n: number): boolean => {
        for (let i = 0; i < n && i0 < len; i++, i0++) {
          const t = i0 / sr
          // The breath: up quickly as the ball comes in, following its speed down the bore, and away after it leaves.
          const k = t < dur ? Math.min(1, t / 0.035) * ((vIn + (vOut - vIn) * (t / dur)) / 20) : (vOut / 20) * Math.exp(-(t - dur) / 0.09)
          breath += kBreath * (k - breath)
          // Turbulence, high-passed, into the column.
          const nz = rnd()
          hp = hpK * (hp + nz - hpIn)
          hpIn = nz
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
          core += kCore * (breath - core)
          const tone = Math.sin(dw * i0) * core * 0.34 + Math.sin(2 * dw * i0) * core * 0.07
          // The pipe's mouth is round and its air soft: nothing above about 2.5 kHz to speak of.
          airLp += mouth * (y * 0.9 + tone - airLp)
          if (L && R) {
            const tail = len - i0 < fade ? (len - i0) / fade : 1
            L[o + i] += airLp * tail * gl
            R[o + i] += airLp * tail * gr
          }
        }
        return i0 < len
      }
      return { run: (L, R, o, n) => step(L, R, o, n), skip: (n) => void step(null, null, 0, n) }
    }

    /** A knock on a pipe's wall from inside: a short tap into the column. */
    function pipeKnock(hz: number, v: number, gl: number, gr: number): Voice {
      const level = 0.08 * Math.min(1, v / 10)
      const f = [hz, 2 * hz, 3 * hz, 4.1 * hz]
      return modal(f, f.map((_, m) => level / (m + 1)), [0.35, 0.22, 0.14, 0.06], 0.002, gl, gr)
    }

    function chime(hz: number, v: number, gl: number, gr: number): Voice {
      const ratios = [1, 1.0026, 2.756, 2.761, 5.404, 8.933]
      const amps = [0.55, 0.45, 0.42, 0.2, 0.22, 0.1]
      const taus = [chimeRing, chimeRing * 0.92, 3.1, 2.8, 1.6, 0.8]
      const tc = 0.0011
      const f = ratios.map((q) => q * hz)
      return modal(f, f.map((fm, m) => v * amps[m] * contact(fm, tc)), taus, tc, gl, gr)
    }

    /** The escapement letting go, a ball seating against another, a flap, a landing in felt, a ball into the bowl. */
    function knock(kind: KnockKind, v: number, gl: number, gr: number): Voice[] {
      switch (kind) {
        case 'tick':
          return [modal([1180, 2730], [0.05, 0.025], [0.028, 0.012], 0.0006, gl, gr)]
        case 'seat':
          return [modal([2950, 6650], [0.022 * Math.min(1, v / 2), 0.012], [0.006, 0.003], 0.0002, gl, gr)]
        case 'flap':
          return [modal([640, 1580], [0.035, 0.018], [0.03, 0.014], 0.0008, gl, gr)]
        case 'bowl':
          return [modal([1840, 4420, 7100], [0.03, 0.018, 0.008], [0.09, 0.05, 0.02], 0.0003, gl, gr)]
        case 'felt': {
          const level = 0.07 * Math.min(1.5, v / 22)
          return [modal([88, 141], [level, level * 0.5], [0.045, 0.03], 0.002, gl, gr), burst(Math.round(v * 1000), 0.08, 0.012, level * 0.8, gl, gr)]
        }
      }
    }

    function voicesOf(s: Strike): Voice[] {
      switch (s.kind) {
        case 'bar':
          return bar(s.hz, s.v, s.u, s.metal, s.gl, s.gr)
        case 'string':
          return [string(s.hz, s.v, s.u, s.gl, s.gr)]
        case 'pipe':
          return [pipe(s.hz, s.dur, s.v, s.vOut, Math.round(s.t * 1000), s.gl, s.gr)]
        case 'pipe-knock':
          return [pipeKnock(s.hz, s.v, s.gl, s.gr)]
        case 'chime':
          return [chime(s.hz, s.v, s.gl, s.gr)]
        case 'knock':
          return knock(s.knock, s.v, s.gl, s.gr)
      }
    }

    /* -------------------------------------------------------------- the engine */

    /** Samples over which a let-go voice fades out, or a picked-up one fades in: no click either way. */
    const FADE = Math.round(0.012 * sr)
    /** How far back a fresh start looks for notes still ringing. */
    const BACK = 6
    const MAX = 8192
    const sL = new Float32Array(MAX)
    const sR = new Float32Array(MAX)

    /** A voice under a ramp of gain, `FADE` long: up from silence, or down to it and then done. */
    function ramped(v: Voice, up: boolean): Voice {
      let at = 0
      return {
        ramp: up ? 'up' : 'down',
        inner: v,
        run(L, R, o, n) {
          let alive = true
          for (let start = 0; start < n; start += MAX) {
            const m = Math.min(MAX, n - start)
            sL.fill(0, 0, m)
            sR.fill(0, 0, m)
            alive = v.run(sL, sR, 0, m)
            for (let i = 0; i < m; i++, at++) {
              const g = at >= FADE ? (up ? 1 : 0) : up ? at / FADE : 1 - at / FADE
              L[o + start + i] += sL[i] * g
              R[o + start + i] += sR[i] * g
            }
            if (!up && at >= FADE) return false
            if (!alive) return false
          }
          return alive
        },
        skip(n) {
          at += n
          v.skip(n)
        },
      }
    }

    let notes: Strike[] = []
    let sounding: Voice[] = []
    let next = 0
    let clock: { from: number; at: number; speed: number } | null = null
    let stopAt = -1

    /** The first note at or after show time `t`. */
    function firstFrom(t: number): number {
      let lo = 0
      let hi = notes.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (notes[mid].t < t) lo = mid + 1
        else hi = mid
      }
      return lo
    }

    /** Everything sounding is let go: faded out (one already fading out goes on fading; one fading in turns round). */
    const letGo = () => {
      sounding = sounding.map((v) => (v.ramp === 'down' ? v : ramped(v.ramp === 'up' && v.inner ? v.inner : v, false)))
    }

    return {
      load(list) {
        notes = list.slice().sort((a, b) => a.t - b.t)
        next = clock ? firstFrom(clock.from) : 0
      },
      go(from, at, speed, fresh) {
        stopAt = -1
        if (fresh) {
          letGo()
          next = firstFrom(from)
          // What was struck just before `from` is still ringing: picked up where it would be, faded in.
          for (let i = next - 1; i >= 0 && notes[i].t > from - BACK; i--) {
            const s = notes[i]
            const age = Math.round(((from - s.t) / Math.max(0.05, speed)) * sr)
            // A string or a pipe has to be run to where it would be; past a second of either, leave it.
            if ((s.kind === 'string' || s.kind === 'pipe') && age > sr) continue
            for (const v of voicesOf(s)) {
              v.skip(age)
              sounding.push(ramped(v, true))
            }
          }
        }
        clock = { from, at, speed: Math.max(0.01, speed) }
      },
      stop(at) {
        stopAt = at
      },
      voices: () => sounding.length,
      process(L, R, o, n, k0) {
        if (stopAt >= 0 && stopAt < k0 + n) {
          stopAt = -1
          clock = null
          letGo()
        }
        // What is ringing.
        let kept = 0
        for (let i = 0; i < sounding.length; i++) {
          if (sounding[i].run(L, R, o, n)) sounding[kept++] = sounding[i]
        }
        sounding.length = kept
        // What is struck in this block, from the sample it is struck at.
        if (!clock) return
        const { from, at, speed } = clock
        while (next < notes.length) {
          const s = notes[next]
          const k = at + ((s.t - from) * sr) / speed
          if (k >= k0 + n) break
          next++
          const off = Math.round(k - k0)
          for (const v of voicesOf(s)) {
            // A note whose moment has just passed (a message that came late) starts at once, as far on as it would be.
            if (off < 0) v.skip(-off)
            const from0 = Math.max(0, off)
            if (from0 < n && v.run(L, R, o + from0, n - from0)) sounding.push(v)
            else if (from0 >= n) sounding.push(v)
          }
        }
      },
    }
  }

  return { makeEngine, noise, contact, contactTime, barRing, stringRing, chimeRing }
}
