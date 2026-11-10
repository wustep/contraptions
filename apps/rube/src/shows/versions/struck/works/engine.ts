/**
 * The voices, as an engine that plays them as they come.
 *
 * Every sound in Struck is a ball meeting an instrument, and the engine is what turns one meeting into sound: told a
 * `Strike` (when, what, how hard, for how long), it starts that instrument's physical model at that sample and runs
 * everything that is sounding a block at a time. The same engine plays the show live, in an audio thread (`live.ts`),
 * and renders it whole for a file (`render.ts`), so what is heard live and what is in a file are the same arithmetic,
 * whatever the block size.
 *
 * - A **piano** string is a stiff string as a digital waveguide: two travelling velocity waves between the agraffe and
 *   the bridge, a loss filter and dispersion all-passes at the bridge (stiff wire makes the upper partials sharp), tuned
 *   to the fraction of a sample. It is struck an eighth of the way along by a felt hammer whose spring stiffens as it is
 *   squashed (F = K·x^p), solved against the string every sample (backward Euler, Newton), so a harder strike is
 *   brighter by physics: the felt is stiffer and the contact shorter. From C3 up there are two strings a quarter of a
 *   hertz apart. There are no dampers. Hammer mass, stiffness and exponent follow Chaigne & Askenfelt (1994); the structure
 *   is the one in wustep/instruments (`piano-core.ts`, `voice.ts`), much reduced.
 * - A **tine** is a clamped–free bar (modes 1 : 6.27 : 17.55) struck near its tip: damped sinusoids whose levels are
 *   the spectrum of the contact (a Hertzian half-sine, shorter for a harder hit), on a small wooden box.
 * - A **pipe** is an open flue pipe: the air column is a waveguide a period long, and a jet of air from a bellows is
 *   deflected by the sound in the pipe, half a period later, in or out of the mouth through a saturating flow law
 *   (the delayed-jet structure of Cook's STK flute and of `flute.ts` in wustep/instruments), with the jet's turbulence
 *   as noise. The bellows gives the pressure: up in a hundredth of a second, held while it is squeezed, let go.
 * - A **bow** is a cello's open string bowed at a steady speed: a waveguide either side of the bow, and at the bow the
 *   stick–slip of rosined hair (the friction-table junction of McIntyre, Schumacher & Woodhouse as in STK's Bowed),
 *   so the Helmholtz motion forms by itself. The bridge drives a cello body: its air and wood resonances and its
 *   bridge hill. When the hair leaves, the open string rings on.
 * - A **knock** is a latch letting go: a short wooden click.
 *
 * `defineEngine` holds all of it and refers to nothing outside itself: the live engine is this function's own text,
 * run in the audio thread (`live.ts`), where nothing else of the page is.
 */

export type StrikeKind = 'tine' | 'piano' | 'pipe' | 'bow' | 'knock'

/** One note as the engine takes it: plain data, so that it can be posted to an audio thread. */
export interface Strike {
  /** Seconds of show when the sound begins: the ball's contact (tine, pipe), the hammer meeting the string, the hair reaching it. */
  t: number
  kind: StrikeKind
  /** Sounding pitch. */
  hz: number
  /** Metres a second: the ball's normal speed (tine, pipe, knock), the hammer's at the string, the bow's. */
  v: number
  /** Seconds of show: how long the bellows is squeezed (pipe), or the hair is on the string (bow). */
  dur: number
  /** A pipe whose bellows empties: the wind falls away over `dur`. A bow that slows to rest over `dur`. */
  sag: boolean
  /** Into the left and right channels: where it is, and how loud its kind sits. */
  gl: number
  gr: number
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
  const TAU = Math.PI * 2

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

  const midiOf = (hz: number): number => 69 + 12 * Math.log2(hz / 440)
  /** A value read off a line through `pts` ([x, y] pairs in order), held past its ends. */
  function along(pts: number[][], x: number): number {
    if (x <= pts[0][0]) return pts[0][1]
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (x - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0])
    }
    return pts[pts.length - 1][1]
  }

  /** How long a piano string takes to fall 60 dB, seconds: there are no dampers. */
  const pianoT60 = (hz: number): number => along([[36, 2.6], [60, 1.6], [72, 1.2]], midiOf(hz))
  /** How long a tine's fundamental takes to fall 60 dB, seconds. */
  const tineT60 = (hz: number): number => Math.min(2.6, Math.max(0.9, 1.4 * Math.pow(523.25 / hz, 0.4)))
  /** How long an open cello string rings on after the hair has left it, seconds. */
  const BOW_RING = 1.0

  /** How long a voice visibly rings, seconds (a pipe and a bow: after the bellows or the hair has let go). */
  function ring(kind: StrikeKind, hz: number): number {
    switch (kind) {
      case 'piano':
        return pianoT60(hz) * 0.75
      case 'tine':
        return tineT60(hz) * 0.75
      case 'pipe':
        return 0.06
      case 'bow':
        return BOW_RING * 0.8
      case 'knock':
        return 0.05
    }
  }

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
    const dt = 1 / sr
    const MAX = 8192
    /** Where a voice run on in silence writes: never read. */
    const dumpL = new Float32Array(MAX)
    const dumpR = new Float32Array(MAX)

    /** A voice that can only be moved on by running it: a waveguide has no closed form. */
    function waved(run: Voice['run']): Voice {
      return {
        run,
        skip(n) {
          for (let left = n; left > 0; left -= MAX) if (!run(dumpL, dumpR, 0, Math.min(MAX, left))) return
        },
      }
    }

    /** The coefficient of a first-order all-pass (a + z⁻¹)/(1 + a z⁻¹) whose phase delay at `w` is exactly `d` samples. */
    const apFor = (d: number, w: number): number => Math.sin(((1 - d) * w) / 2) / Math.sin(((1 + d) * w) / 2)
    /** The phase delay, in samples at `w`, of that all-pass. */
    function apDelay(a: number, w: number): number {
      let phi = Math.atan2(-Math.sin(w), a + Math.cos(w)) - Math.atan2(-a * Math.sin(w), 1 + a * Math.cos(w))
      while (phi > 0) phi -= TAU
      while (phi <= -TAU) phi += TAU
      return -phi / w
    }
    /** A one-pole lowpass y += (1 − b)(x − y): its pole for a corner at `fc`, its phase delay and its gain at `w`. */
    const poleFor = (fc: number): number => Math.exp((-TAU * fc) / sr)
    const lpDelay = (b: number, w: number): number => Math.atan2(b * Math.sin(w), 1 - b * Math.cos(w)) / w
    const lpGain = (b: number, w: number): number => (1 - b) / Math.sqrt(1 - 2 * b * Math.cos(w) + b * b)

    /** A bank of two-pole resonators (constant-peak band-passes) beside the direct sound: a body. */
    function body(freqs: number[], qs: number[], gains: number[]) {
      const M = freqs.length
      const b0 = new Float64Array(M)
      const a1 = new Float64Array(M)
      const a2 = new Float64Array(M)
      const x1 = new Float64Array(M)
      const x2 = new Float64Array(M)
      const y1 = new Float64Array(M)
      const y2 = new Float64Array(M)
      for (let m = 0; m < M; m++) {
        const w = (TAU * Math.min(freqs[m], sr * 0.45)) / sr
        const alpha = Math.sin(w) / (2 * qs[m])
        b0[m] = (alpha / (1 + alpha)) * gains[m]
        a1[m] = (-2 * Math.cos(w)) / (1 + alpha)
        a2[m] = (1 - alpha) / (1 + alpha)
      }
      return (x: number): number => {
        let out = 0
        for (let m = 0; m < M; m++) {
          const y = b0[m] * (x - x2[m]) - a1[m] * y1[m] - a2[m] * y2[m]
          x2[m] = x1[m]
          x1[m] = x
          y2[m] = y1[m]
          y1[m] = y
          out += y
        }
        return out
      }
    }

    /** A sum of damped sinusoids: frequencies, amplitudes, time constants (seconds), and a raised-cosine rise. */
    function modal(f: number[], a: number[], tau: number[], attack: number, gl: number, gr: number): Voice {
      const M = f.length
      const re = new Float64Array(M)
      const im = new Float64Array(M)
      const c = new Float64Array(M)
      const s = new Float64Array(M)
      const r = new Float64Array(M)
      const w = new Float64Array(M)
      let longest = 0
      for (let m = 0; m < M; m++) {
        if (f[m] >= sr * 0.45 || a[m] === 0) continue
        w[m] = (TAU * f[m]) / sr
        r[m] = Math.exp(-1 / (tau[m] * sr))
        c[m] = Math.cos(w[m]) * r[m]
        s[m] = Math.sin(w[m]) * r[m]
        re[m] = a[m]
        longest = Math.max(longest, tau[m])
      }
      const rise = Math.max(1, Math.round(attack * sr))
      const total = Math.round(longest * 7.5 * sr)
      let k = 0
      return {
        run(L, R, o, n) {
          const end = Math.min(n, total - k)
          for (let i = 0; i < end; i++, k++) {
            let y = 0
            for (let m = 0; m < M; m++) {
              const x = re[m] * c[m] - im[m] * s[m]
              im[m] = re[m] * s[m] + im[m] * c[m]
              re[m] = x
              y += im[m]
            }
            if (k < rise) y *= 0.5 - 0.5 * Math.cos((Math.PI * k) / rise)
            L[o + i] += y * gl
            R[o + i] += y * gr
          }
          return k < total
        },
        skip(n) {
          for (let m = 0; m < M; m++) {
            if (r[m] === 0) continue
            const g = Math.pow(r[m], n)
            const cs = Math.cos(w[m] * n) * g
            const sn = Math.sin(w[m] * n) * g
            const x = re[m] * cs - im[m] * sn
            im[m] = re[m] * sn + im[m] * cs
            re[m] = x
          }
          k += n
        },
      }
    }

    /* ------------------------------------------------------------------ tine */

    /** The spectrum of a half-sine contact `tc` seconds long at frequency `f`, 1 at 0 Hz. */
    function contact(f: number, tc: number): number {
      const x = 2 * f * tc
      if (Math.abs(1 - x * x) < 1e-6) return Math.PI / 4
      return Math.abs(Math.cos(Math.PI * f * tc) / (1 - x * x))
    }

    function tine(hz: number, v: number, gl: number, gr: number): Voice {
      const speed = Math.min(4, Math.max(0.05, v))
      // A steel ball on a spring-steel strip that gives under it: about a third of a millisecond, shorter the harder
      // it comes in (Hertz: as the speed to the −1/5).
      const tc = 0.00034 * Math.pow(speed, -0.2)
      const level = 0.2 * Math.pow(speed, 1.15)
      const t1 = tineT60(hz) / 6.91
      const f = [hz, hz * 6.27, hz * 17.55, 286, 512]
      const a = [
        level,
        level * 0.62 * contact(hz * 6.27, tc),
        level * 0.4 * contact(hz * 17.55, tc),
        // The box: the blow goes into the wood too, a short thump under the note.
        level * 0.16,
        level * 0.07,
      ]
      const tau = [t1, Math.max(0.012, t1 * 0.14), 0.011, 0.028, 0.016]
      return modal(f, a, tau, 0.0005, gl, gr)
    }

    function knock(v: number, gl: number, gr: number): Voice {
      const level = 0.3 * Math.min(1.6, Math.max(0.2, v))
      return modal([740, 1180, 2730], [level * 0.5, level * 0.6, level * 0.3], [0.02, 0.026, 0.011], 0.0006, gl, gr)
    }

    /* ----------------------------------------------------------------- piano */

    function piano(hz: number, v: number, gl: number, gr: number): Voice {
      const midi = midiOf(hz)
      const w1 = (TAU * hz) / sr
      // Inharmonicity: partial k at k·f0·√(1 + B k²). About 7e-5 at C2 rising to 9e-4 at C5.
      const B = 7e-5 * Math.pow(2.34, (midi - 36) / 12)
      // The felt hammer (Chaigne & Askenfelt 1994, their C2, C4 and C7): mass, stiffness, exponent.
      const mass = along([[36, 0.0049], [60, 0.00297], [96, 0.0022]], midi)
      const p = along([[36, 2.3], [60, 2.5], [96, 3]], midi)
      // Voiced hard, about four times their felt's stiffness: these hammers are small and the room is dry.
      const K = Math.pow(10, along([[36, 9.1], [60, 10.3], [96, 12.4]], midi))
      /** The strings' wave impedance as the hammer meets it, kg/s. */
      const Z = 5
      const strings = hz >= 129 ? 2 : 1
      // Two strings a little apart drift out of step as they ring, which takes a little off: allowed for here.
      const T60 = pianoT60(hz) * (strings === 2 ? 1.1 : 1)

      // The bridge: a lowpass (the top goes first) whose gain at the fundamental gives the decay.
      const pole = poleFor(along([[36, 5200], [60, 7500], [72, 9000]], midi))
      const g = Math.min(0.9995, Math.pow(10, -3 / (hz * T60)) / lpGain(pole, w1))
      // Dispersion: all-passes whose delay falls with frequency, fitted so partial 6 is as sharp as B says.
      const AP = 3
      const k6 = Math.min(6, Math.max(2, Math.floor((0.4 * sr) / hz)))
      const wk = w1 * k6 * Math.sqrt((1 + B * k6 * k6) / (1 + B))
      const want = sr / hz - (k6 * TAU) / wk
      let lo = -0.92
      let hi = 0
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (AP * (apDelay(mid, w1) - apDelay(mid, wk)) > want) lo = mid
        else hi = mid
      }
      const disp = (lo + hi) / 2
      const fixed = lpDelay(pole, w1) + AP * apDelay(disp, w1)

      // Each string: the round trip to the agraffe and back (an eighth of the loop), and to the bridge and back.
      const lenA = new Int32Array(strings)
      const lenB = new Int32Array(strings)
      const tune = new Float64Array(strings)
      const bufA: Float32Array[] = []
      const bufB: Float32Array[] = []
      for (let s = 0; s < strings; s++) {
        // Two strings an eighth of a hertz either side of the note: one slow beat every four seconds.
        const cents = strings === 2 ? (s ? 1 : -1) * 1200 * Math.log2(1 + 0.125 / hz) : 0
        const loop = sr / (hz * Math.pow(2, cents / 1200))
        lenA[s] = Math.max(1, Math.round(loop / 8))
        const rest = loop - lenA[s] - fixed
        lenB[s] = Math.max(1, Math.floor(rest - 0.3))
        tune[s] = apFor(rest - lenB[s], w1)
        bufA.push(new Float32Array(lenA[s]))
        bufB.push(new Float32Array(lenB[s]))
      }
      const posA = new Int32Array(strings)
      const posB = new Int32Array(strings)
      const lp = new Float64Array(strings)
      const apX = new Float64Array(strings * (AP + 1))
      const apY = new Float64Array(strings * (AP + 1))

      // The hammer: how far the felt is squashed, and how fast the hammer is still going.
      let squash = 0
      let vh = Math.min(8, Math.max(0.05, v))
      let hammering = true
      const beta = dt * (dt / mass + 1 / (2 * Z))

      const board = body([92, 178, 305, 520], [7, 9, 8, 6], [0.5, 0.45, 0.3, 0.2])
      let dcX = 0
      let dcY = 0
      const dcR = 1 - (TAU * 25) / sr
            const level = 0.268 / strings
      const total = Math.round((T60 * 1.3 + 0.1) * sr)
      const fade = Math.round(0.05 * sr)
      let k = 0

      return waved((L, R, o, n) => {
        const end = Math.min(n, total - k)
        for (let i = 0; i < end; i++, k++) {
          let bridge = 0
          let force = 0
          for (let s = 0; s < strings; s++) {
            const A = bufA[s]
            const Bq = bufB[s]
            const fromA = -A[posA[s]]
            const raw = Bq[posB[s]]
            bridge += raw
            // The bridge: loss, dispersion, tuning, and the turn.
            let x = lp[s] + (1 - pole) * (raw - lp[s])
            lp[s] = x
            x *= g
            const base = s * (AP + 1)
            for (let m = 0; m <= AP; m++) {
              const a = m < AP ? disp : tune[s]
              const y = a * x + apX[base + m] - a * apY[base + m]
              apX[base + m] = x
              apY[base + m] = y
              x = y
            }
            const fromB = -x
            if (s === 0 && hammering) {
              // The felt against the string, backward Euler: squash + β·K·squash^p = what it would be untouched.
              const free = squash + dt * (vh - (fromA + fromB))
              if (free > 0) {
                let q = free
                for (let it = 0; it < 4; it++) {
                  const qp = Math.pow(q, p - 1)
                  q -= (q + beta * K * qp * q - free) / (1 + beta * K * p * qp)
                  if (q < 0) q = 0
                }
                squash = q
                force = K * Math.pow(q, p)
                vh -= (dt * force) / mass
              } else {
                squash = free
                force = 0
                if (vh <= 0 || free < -0.01) hammering = false
              }
            }
            const push = force / (2 * Z)
            A[posA[s]] = fromB + push
            Bq[posB[s]] = fromA + push
            if (++posA[s] >= lenA[s]) posA[s] = 0
            if (++posB[s] >= lenB[s]) posB[s] = 0
          }
          const dc = bridge - dcX + dcR * dcY
          dcX = bridge
          dcY = dc
          let y = (dc * 0.8 + board(dc)) * level
          if (total - k < fade) y *= (total - k) / fade
          L[o + i] += y * gl
          R[o + i] += y * gr
        }
        return k < total
      })
    }

    /* ------------------------------------------------------------------ pipe */

    /** A smooth saturation, tanh's shape without its cost. */
    const sat = (x: number): number => (x > 3 ? 1 : x < -3 ? -1 : (x * (27 + x * x)) / (27 + 9 * x * x))

    /**
     * How much longer than a period the pipe's loop has to be for it to sound in tune: the jet's own filters pull the
     * pitch a few cents, by an amount that depends on the pitch in samples (measured, `PIPE_PULL`).
     */
    const PIPE_PULL: number[][] = [[0, 1.0018]]

    function pipe(hz: number, v: number, dur: number, sag: boolean, seed: number, gl: number, gr: number): Voice {
      const period = (sr / hz) * along(PIPE_PULL, Math.log2(hz))
      const w1 = TAU / period
      // The far end and the walls: what comes back is a little less, and duller.
      const pole = poleFor(3400)
      const refl = 0.78 / lpGain(pole, w1)
      const rest = period - lpDelay(pole, w1)
      const len = Math.max(2, Math.floor(rest - 0.3))
      const tune = apFor(rest - len, w1)
      const bore = new Float32Array(len)
      // The jet: half a period from the lip to the edge.
      const jetLen = period / 2
      const jl = Math.floor(jetLen)
      const jf = jetLen - jl
      const jet = new Float32Array(jl + 2)
      let bp = 0
      let jp = 0
      let lp = 0
      let apX1 = 0
      let apY1 = 0
      let dcX = 0
      let dcY = 0
      const dcR = 1 - (TAU * 30) / sr
      let hpX = 0
      let hpY = 0
      const hpR = 1 - (TAU * 120) / sr
      const hiss = noise(seed)
      let hissLp = 0
      const hissK = 1 - poleFor(3000)

      // The bellows: the wind comes up in about 12 ms, holds while it is squeezed, and is let go over about 40 ms.
      const hard = Math.min(2.2, Math.max(0.3, v))
      const peak = 0.8 + 0.25 * hard
      const squeeze = Math.max(1, Math.round(dur * sr))
      const up = 1 - Math.exp(-1 / (0.004 * sr))
      const down = 1 - Math.exp(-1 / (0.013 * sr))
      let wind = 0
      const total = squeeze + Math.round(0.16 * sr)
      const level = 0.046 * along([[7.6, 0.56], [8.03, 0.7], [8.36, 0.81], [8.61, 0.91], [9.03, 1.03], [9.36, 1.12], [9.78, 1.23]], Math.log2(hz))
      // A long pipe is slow to speak: its jet is given more of a say.
      const push = 0.5 * along([[7.6, 1.6], [8.6, 1.2], [9.8, 1]], Math.log2(hz))
      let boost = 2.5
      const calm = Math.exp(-1 / (6 * period))
      let k = 0

      return waved((L, R, o, n) => {
        const end = Math.min(n, total - k)
        for (let i = 0; i < end; i++, k++) {
          let target = 0
          if (k < squeeze) {
            const u = k / squeeze
            target = sag ? peak * Math.pow(1 - u * u, 0.8) : peak
          }
          wind += (k < squeeze ? up : down) * (target - wind)

          const back = bore[bp]
          lp += (1 - pole) * (back - lp)
          const y = tune * lp + apX1 - tune * apY1
          apX1 = lp
          apY1 = y
          const air = y * refl

          // The jet is pushed aside by the air at the mouth, and arrives at the edge half a period later.
          hissLp += hissK * (hiss() - hissLp)
          jet[jp] = air + 0.5 * wind * hissLp
          let at = jp - jl
          if (at < 0) at += jet.length
          let at1 = at - 1
          if (at1 < 0) at1 += jet.length
          const swing = jet[at] * (1 - jf) + jet[at1] * jf
          if (++jp >= jet.length) jp = 0
          // It splits at the edge, a little off centre (even harmonics), into the pipe or out of it.
          const flow = wind * sat(swing + 0.45)
          const drive = flow - dcX + dcR * dcY
          dcX = flow
          dcY = drive

          bore[bp] = air - push * (1 + boost) * drive
          boost *= calm
          if (++bp >= len) bp = 0

          // What is heard is the mouth's flow, not the pressure in the pipe: brighter than it.
          const mouth = back - 2.5 * drive
          const out = mouth - hpX + hpR * hpY
          hpX = mouth
          hpY = out
          const s = out * level * (0.55 + 0.45 * hard)
          L[o + i] += s * gl
          R[o + i] += s * gr
        }
        return k < total
      })
    }

    /* ------------------------------------------------------------------- bow */

    /** How much longer than a period the bowed string's loop has to be: a bowed note is a hair flat (measured). */
    const BOW_PULL = 0.9997

    function bow(hz: number, v: number, dur: number, sag: boolean, seed: number, gl: number, gr: number): Voice {
      const period = (sr / hz) * BOW_PULL
      const w1 = TAU / period
      // The string's own losses: the top goes first, and the open string rings about a second.
      const pole = poleFor(5000)
      const g = Math.pow(10, -3 / (hz * (BOW_RING + 0.35))) / lpGain(pole, w1)
      // The bow, 9% of the way from the bridge.
      const lenB = Math.max(2, Math.round(period * 0.09))
      const rest = period - lenB - lpDelay(pole, w1)
      const lenN = Math.max(2, Math.floor(rest - 0.3))
      const tune = apFor(rest - lenN, w1)
      const toBridge = new Float32Array(lenB)
      const toNut = new Float32Array(lenN)
      let pb = 0
      let pn = 0
      let lp = 0
      let apX1 = 0
      let apY1 = 0

      const speed = Math.min(0.8, Math.max(0.05, v))
      /** Friction: static, sliding, and the slip speed at which it is halfway between (m/s). */
      const MU_S = 0.8
      const MU_D = 0.3
      const V0 = 0.1
      const on = Math.max(1, Math.round(dur * sr))
      const easeOn = Math.round(0.06 * sr)
      const easeOff = Math.round(0.08 * sr)
      const rosin = noise(seed)
      const vr = Math.round(0.06 * sr)
      let rough = 0
      let slipping = false

      // The cello: air (about 100 Hz), wood (about 190 and 280 Hz), and the bridge hill.
      const cello = body([98, 187, 276, 480, 2300], [9, 11, 9, 6, 2.2], [0.5, 0.9, 0.6, 0.35, 0.3])
      let dcX = 0
      let dcY = 0
      const dcR = 1 - (TAU * 25) / sr
      let warm = 0
      const warmK = 1 - poleFor(3200)
      const level = 0.2
      const total = on + easeOff + Math.round((BOW_RING + 0.5) * sr)
      const fade = Math.round(0.08 * sr)
      let k = 0

      return waved((L, R, o, n) => {
        const end = Math.min(n, total - k)
        for (let i = 0; i < end; i++, k++) {
          // The hair's grip: eased on, held, eased off; then the string is alone.
          let grip = 0
          if (k < on) grip = k < easeOn ? 0.5 - 0.5 * Math.cos((Math.PI * k) / easeOn) : 1
          else if (k < on + easeOff) grip = sag ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (k - on)) / easeOff)
          // A bow coming to rest: its speed and its weight fall away together over the stroke.
          let slow = 1
          if (sag && k < on) {
            const u = k / on
            slow = 1 - u * u * (3 - 2 * u)
            grip *= Math.min(1, slow * 4)
          }

          const raw = toBridge[pb]
          lp += (1 - pole) * (raw - lp)
          const fromBridge = -g * lp
          const far = toNut[pn]
          const y = tune * far + apX1 - tune * apY1
          apX1 = far
          apY1 = y
          const fromNut = -y

          let give = 0
          if (grip > 0) {
            // Stick and slip (Friedlander's construction on a hyperbolic friction curve, as in `bowed.ts` of
            // wustep/instruments): the hair holds the string at the bow's speed while friction can; past that the
            // string slips, held back less the faster it slips.
            rough += 0.02 * (rosin() - rough)
            const press = 4.2 * grip * (1 + 0.4 * rough)
            const gap = speed * slow * (k < vr ? k / vr : 1) - (fromBridge + fromNut)
            const D = Math.abs(gap)
            // Where the hair could either hold or slide, it goes on doing what it was doing: that memory is what
            // keeps the string to one slip a period.
            const b1 = V0 - D + press * MU_D
            const c1 = V0 * (press * MU_S - D)
            const disc = b1 * b1 - 4 * c1
            if (c1 < 0 || (slipping && b1 < 0 && disc >= 0)) {
              slipping = true
              give = (gap > 0 ? 1 : -1) * (D - (-b1 + Math.sqrt(disc)) / 2)
            } else {
              slipping = false
              give = gap
            }
          } else slipping = false
          toBridge[pb] = fromNut + give
          toNut[pn] = fromBridge + give
          if (++pb >= lenB) pb = 0
          if (++pn >= lenN) pn = 0

          const dc = raw - dcX + dcR * dcY
          dcX = raw
          dcY = dc
          warm += warmK * (dc * 0.35 + cello(dc) - warm)
          let s = warm * level
          if (total - k < fade) s *= (total - k) / fade
          L[o + i] += s * gl
          R[o + i] += s * gr
        }
        return k < total
      })
    }

    function voiceOf(s: Strike, speed: number): Voice {
      const seed = Math.round(s.t * 1000) + 1
      switch (s.kind) {
        case 'tine':
          return tine(s.hz, s.v, s.gl, s.gr)
        case 'piano':
          return piano(s.hz, s.v, s.gl, s.gr)
        case 'pipe':
          // The bellows is squeezed for a stretch of the show: at half speed, for twice as long.
          return pipe(s.hz, s.v, s.dur / speed, s.sag, seed, s.gl, s.gr)
        case 'bow':
          return bow(s.hz, s.v * speed, s.dur / speed, s.sag, seed, s.gl, s.gr)
        case 'knock':
          return knock(s.v, s.gl, s.gr)
      }
    }

    /** Seconds of sound a note makes at `speed`, from its start. */
    function lasts(s: Strike, speed: number): number {
      switch (s.kind) {
        case 'piano':
          return pianoT60(s.hz) * 1.3
        case 'tine':
          return tineT60(s.hz) * 1.05
        case 'pipe':
          return s.dur / speed + 0.15
        case 'bow':
          return s.dur / speed + BOW_RING + 0.5
        case 'knock':
          return 0.15
      }
    }

    /* -------------------------------------------------------------- the engine */

    /** Samples over which a let-go voice fades out, or a picked-up one fades in: no click either way. */
    const FADE = Math.round(0.012 * sr)
    /** How far back a fresh start looks for notes still sounding, seconds of show. */
    const BACK = 6
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
        const pace = Math.max(0.01, speed)
        if (fresh) {
          letGo()
          next = firstFrom(from)
          // What began just before `from` is still sounding: picked up where it would be, faded in.
          for (let i = next - 1; i >= 0 && notes[i].t > from - BACK; i--) {
            const s = notes[i]
            const age = (from - s.t) / pace
            if (age >= lasts(s, pace)) continue
            const v = voiceOf(s, pace)
            v.skip(Math.round(age * sr))
            sounding.push(ramped(v, true))
          }
        }
        clock = { from, at, speed: pace }
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
        // What is sounding.
        let kept = 0
        for (let i = 0; i < sounding.length; i++) {
          if (sounding[i].run(L, R, o, n)) sounding[kept++] = sounding[i]
        }
        sounding.length = kept
        // What begins in this block, from the sample it begins at.
        if (!clock) return
        const { from, at, speed } = clock
        while (next < notes.length) {
          const s = notes[next]
          const k = at + ((s.t - from) * sr) / speed
          if (k >= k0 + n) break
          next++
          const off = Math.round(k - k0)
          const v = voiceOf(s, speed)
          // A note whose moment has just passed (a message that came late) starts at once, as far on as it would be.
          if (off < 0) v.skip(-off)
          const from0 = Math.max(0, off)
          if (from0 >= n || v.run(L, R, o + from0, n - from0)) sounding.push(v)
        }
      },
    }
  }

  return { makeEngine, noise, ring, pianoT60, tineT60 }
}
