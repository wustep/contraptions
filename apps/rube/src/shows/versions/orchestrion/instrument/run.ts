import { RAIL_SPEED, RELEASE_X, ROLL_Y, buildMachine, type Machine } from './design'
import { BALL_R, DT, World, type Ball, type BallKind, type Contact, type Passage, type Seg } from './sim'
import { TICK, TICKS_PER_BAY } from './tuning'

/**
 * The performance, run once: the whole show is one simulation, from the first ball out of the jar to the last one
 * back in the bowl, and everything heard and seen is read off it.
 *
 * Between the bays the balls are carried (the trough, the lift, the hopper's track): those legs are drawn on a path,
 * not simulated, and the few sounds they make (a ball seating against the one ahead of it, the escapement's tick, a
 * ball landing in the trough's felt) are written down where they happen. In the bays, and on the rail above them,
 * the balls are free, and the physics (`sim.ts`) says where they go.
 *
 * The form is the machine's too. The escapement ticks every dotted eighth and lets a ball go if one is seated in it.
 * Every sixteen ticks its count turns the gates over, the next bay's opens and its chime is struck: the chord changes.
 * How many balls are going round, and what they are made of, is the density and the loudness of the music: the jar
 * lets them into the machine one at a time — ivory, then glass, then brass — and at the trough's end a trap takes them
 * out again into the bowl, the heavy brass first, until one is left, and then none. The governor on the escapement is
 * the other hand: in the song (A) it lets a ball go at most every third tick, nine sixteenths, so balls interlock; in
 * the middle (B) every second, six sixteenths, an even number, so they fall in step and sound together.
 */

/** When the escapement's first tick falls. */
export const FIRST_TICK = 2.4

export type Section = 'A' | 'B' | 'coda'

/** One chord of the form: the bay whose gate is open, and the governor's setting (at most a ball every so many ticks). */
export interface Block {
  bay: number
  every: number
  section: Section
}

/**
 * The escapement's governor, in the song: a ball is let go at most every third tick. Nine sixteenths is an odd
 * number of them, so a ball lands between its neighbour's bounces, never on them, and two balls interlock in
 * sixteenths; and balls that came back up the lift together go out spaced, instead of in a run that stays a run all
 * the way round. In the middle it is let out to every second tick: six sixteenths, even, so a ball falls in step with
 * the one ahead of it, three eighths behind, and they strike together: chords in eighths, not sixteenths between.
 */
const SONG = [0, 1, 2, 3]
const MIDDLE = [2, 3, 4, 1]
export const FORM: Block[] = [
  // A: D, Bm, G, A, twice, the jar filling the machine the first time round.
  ...SONG.map((bay): Block => ({ bay, every: 3, section: 'A' })),
  ...SONG.map((bay): Block => ({ bay, every: 3, section: 'A' })),
  // B: G, A, F♯m, Bm, the governor let out.
  ...MIDDLE.map((bay): Block => ({ bay, every: 2, section: 'B' })),
  // A again, emptying.
  ...SONG.map((bay): Block => ({ bay, every: 3, section: 'A' })),
  // The coda: D, one ball.
  { bay: 0, every: 3, section: 'coda' },
]
/** The coda's first tick: from the first ball let go into it, every ball that comes up the lift goes to rest. */
export const CODA = (FORM.length - 1) * TICKS_PER_BAY
/** Seconds after the last sound that the show holds the machine, still, before it ends. */
const RING_OUT = 7

/** The chord at tick `n`. */
export const blockAt = (n: number): Block => FORM[Math.max(0, Math.min(FORM.length - 1, Math.floor(Math.max(0, n) / TICKS_PER_BAY)))]

/**
 * The ticks before the coda in which the escapement lets nothing go: the machine draws breath, and the jar's last ball,
 * let out onto the track as it does, is seated in time to be let go exactly as the coda's chime is struck.
 */
const HOLD = 4

/**
 * The jar's balls, in the order it lets them go, and when (in ticks): ivory over the first time round the song, glass
 * over the second, brass as the middle comes in. The last, glass, is kept back for the coda: it comes out as the other
 * balls are going to rest, and is the one that plays D at the end.
 */
const FEEDS: { tick: number; kind: BallKind }[] = [
  ...[-3, 5, 13, 21, 29, 37, 45, 53].map((tick) => ({ tick, kind: 'ivory' as const })),
  ...[64, 72, 80, 88, 96].map((tick) => ({ tick, kind: 'glass' as const })),
  ...[127, 130, 133, 136, 139, 142, 145, 148, 151, 154].map((tick) => ({ tick, kind: 'brass' as const })),
  { tick: CODA - HOLD + 1, kind: 'glass' },
]
/**
 * From this tick, in the middle's last chord, the trap at the trough's end is set for weight: every brass ball that
 * comes to it drops into the bowl, so the brass leaves the machine first, as the song comes back.
 */
const TRAP = 11 * TICKS_PER_BAY + 4
/** When (in ticks) the trap takes the next ball of any weight to come to it out of the machine and into the bowl. */
const RETIRES = [190, 196, 202, 210, 218]
/** From this tick, in the last chord before the coda, the trap takes every ball that comes to it. */
const EMPTY = CODA - 14

/** Down the chute to the bowl, cells a second. */
const CHUTE_SPEED = 3.4
/** The track's balls roll this fast, cells a second. */
const TRACK_SPEED = 2.2
/** The trough's. */
const TROUGH_SPEED = 4.2
/** The lift's chain, and the space between its cups. */
export const LIFT_SPEED = 3
export const CUP = 1.25

export type Mode = 'jar' | 'track' | 'free' | 'trough' | 'wait' | 'lift' | 'chute' | 'bowl'

/** Where a ball is, sampled: times and positions, and a flag for where it is not drawn by itself (the jar, the bowl). */
export interface Track {
  id: number
  t: number[]
  x: number[]
  y: number[]
  /** For each sample: drawn (true) or held in the jar or bowl, drawn with them (false). */
  shown: boolean[]
}

/** A sound made by a part of the machine that is not a sounding part: a tick, a seat, a landing. */
export interface Knock {
  t: number
  kind: 'tick' | 'seat' | 'felt' | 'bowl' | 'flap'
  /** How hard, cells a second. */
  v: number
  x: number
  y: number
  /** The ball that made it, if one did. */
  ball?: number
}

/** A chime struck as its bay's gate opens. */
export interface Strike {
  t: number
  part: number
  v: number
}

export interface Performance {
  machine: Machine
  duration: number
  tracks: Track[]
  contacts: Contact[]
  passages: Passage[]
  knocks: Knock[]
  strikes: Strike[]
  /** When each gate flap opened and closed: per gate, alternating times, starting closed. */
  flaps: number[][]
  /** The bay whose gate is open at each tick, and when each tick fell. */
  ticks: { t: number; bay: number; released: number | null }[]
  /** Every release: which ball, and when. */
  releases: { t: number; ball: number }[]
  /** How many balls are in the jar and in the bowl over time: [time, count] steps. */
  jar: [number, number][]
  bowl: [number, number][]
  /** What each ball is made of, by its id: the order the jar lets them go. */
  balls: BallKind[]
  /** The balls into the bowl, in order. */
  bowled: { t: number; ball: number }[]
  /** When the trap opened for each of them, at the trough's end. */
  trapped: { t: number; ball: number }[]
  /** The most balls ever waiting on the hopper's track at once, and how many it has room for. */
  queue: { most: number; at: number; room: number }
}

/** The bay whose gate is open at tick `n`. */
export const bayAt = (n: number): number => blockAt(n).bay

export const tickTime = (n: number): number => FIRST_TICK + n * TICK

interface State {
  id: number
  mode: Mode
  /** On the track: how far up it from the escapement, cells. */
  s: number
  x: number
  y: number
  vx: number
  vy: number
  /** When the current carried leg ends. */
  until: number
  /** Where the trough leg starts. */
  x0: number
  t0: number
}

export function perform(lenient = false, retires: number[] = RETIRES): Performance {
  const machine = buildMachine()
  const { track } = machine
  const trackLen = Math.hypot(track.x1 - track.x0, track.y1 - track.y0)
  const along = { x: (track.x0 - track.x1) / trackLen, y: (track.y0 - track.y1) / trackLen }
  const trackAt = (s: number): [number, number] => [track.x1 + along.x * s, track.y1 + along.y * s]
  /** Where on the track the jar drops a ball. */
  const jarS = machine.jar.s
  const SLOT = 2 * BALL_R + 0.01

  // The gate flaps: solid while closed. Each flap's segment asks its gate.
  const gateOpen = machine.gates.map(() => false)
  const flaps: number[][] = machine.gates.map(() => [])
  const flapSegs: Seg[] = machine.gates.map((g, i) => ({
    ax: g.x0,
    ay: 0,
    bx: g.x1,
    by: 0,
    half: 0.045,
    e: 0,
    material: 'gate' as const,
    caps: false,
    part: -1,
    solid: () => !gateOpen[i],
  }))
  const world = new World([...machine.segs, ...flapSegs], machine.sensors)

  const kinds = FEEDS.map((f) => f.kind)
  const feedTicks = FEEDS.map((f) => f.tick)
  const bowled: Performance['bowled'] = []
  const trapped: Performance['trapped'] = []
  // The chute, walked at a ball's rolling speed.
  const legs = machine.chute.slice(1).map(([x, y], i) => Math.hypot(x - machine.chute[i][0], y - machine.chute[i][1]))
  const chuteLen = legs.reduce((a, b) => a + b, 0)
  const chuteAt = (d: number): [number, number] => {
    for (let i = 0; i < legs.length; i++) {
      if (d <= legs[i] || i === legs.length - 1) {
        const f = Math.min(1, d / legs[i])
        const [ax, ay] = machine.chute[i]
        const [bx, by] = machine.chute[i + 1]
        return [ax + (bx - ax) * f, ay + (by - ay) * f]
      }
      d -= legs[i]
    }
    return machine.chute[machine.chute.length - 1]
  }
  const states: State[] = FEEDS.map((_, id) => ({ id, mode: 'jar', s: 0, x: 0, y: 0, vx: 0, vy: 0, until: Infinity, x0: 0, t0: 0 }))
  const tracks: Track[] = states.map((s) => ({ id: s.id, t: [], x: [], y: [], shown: [] }))
  const contacts: Contact[] = []
  const passages: Passage[] = []
  const knocks: Knock[] = []
  const strikes: Strike[] = []
  const ticks: Performance['ticks'] = []
  const releases: Performance['releases'] = []
  const jar: [number, number][] = [[0, FEEDS.length]]
  const bowl: [number, number][] = [[0, 0]]
  const count = (mode: Mode) => states.filter((s) => s.mode === mode).length

  let fed = 0
  let retiring = 0
  let nextTick = Math.min(0, ...feedTicks)
  let most = 0
  let mostAt = 0
  let trap = false
  let emptying = false
  let coda = false
  let lastRelease = -Infinity
  let lastSound = 0
  let lastSample = -1
  let lastKinematic = -1
  let end = Infinity
  /** Gates waiting to close, until no ball is in their gap. */
  const closing = new Set<number>()

  const record = (st: State, t: number, shown = true) => {
    const tr = tracks[st.id]
    tr.t.push(t)
    tr.x.push(st.x)
    tr.y.push(st.y)
    tr.shown.push(shown)
  }

  /** The bay chime over gate `bay`'s bay is struck as its gate opens. */
  const chimeOf = (bay: number) => machine.parts.find((p) => p.kind === 'chime' && p.bay === bay)!.id

  const openBay = (bay: number, t: number) => {
    machine.gates.forEach((g, i) => {
      const open = g.bay === bay
      if (open && !gateOpen[i]) {
        gateOpen[i] = true
        closing.delete(i)
        flaps[i].push(t)
        knocks.push({ t, kind: 'flap', v: 2, x: (g.x0 + g.x1) / 2, y: 0 })
      } else if (!open && gateOpen[i]) closing.add(i)
    })
    strikes.push({ t: t + 0.06, part: chimeOf(bay), v: 1 })
  }

  for (let t = 0; t < end; t += DT) {
    // The escapement.
    if (t >= tickTime(nextTick)) {
      const n = nextTick++
      const tt = tickTime(n)
      if (n >= 0 && n % TICKS_PER_BAY === 0 && n <= CODA) {
        // The count turns the gates over: the next chord.
        openBay(bayAt(n), tt)
      }
      // Who is seated: the ball on the track nearest the escapement, if it is home.
      const onTrack = states.filter((s) => s.mode === 'track').sort((a, b) => a.s - b.s)
      const seated = onTrack[0] && onTrack[0].s < 0.02 ? onTrack[0] : null
      let released: number | null = null
      const held = n >= CODA - HOLD && n < CODA
      if (seated && n >= 0 && !held && n - lastRelease >= blockAt(n).every) {
        lastRelease = n
        seated.mode = 'free'
        seated.x = RELEASE_X
        seated.y = ROLL_Y
        seated.vx = RAIL_SPEED
        seated.vy = 0
        released = seated.id
        releases.push({ t: tt, ball: seated.id })
        knocks.push({ t: tt, kind: 'tick', v: 3, x: RELEASE_X, y: ROLL_Y, ball: seated.id })
        record(seated, tt)
      }
      ticks.push({ t: tt, bay: bayAt(n), released })
      if (released !== null && n >= CODA) coda = true
      if (fed < states.length && feedTicks[fed] === n) {
        // The jar lets one go, onto the track.
        const st = states[fed++]
        st.mode = 'track'
        st.s = jarS
        ;[st.x, st.y] = trackAt(jarS)
        knocks.push({ t: tt, kind: 'seat', v: 1.5, x: st.x, y: st.y, ball: st.id })
        record(st, tt)
        jar.push([tt, count('jar')])
      }
      if (retires.includes(n)) retiring++
      if (n >= TRAP) trap = true
      if (n >= EMPTY) emptying = true
      if (coda) retiring = Infinity
    }

    // The flaps that are waiting to close, once their gap is clear.
    for (const i of [...closing]) {
      const g = machine.gates[i]
      const busy = states.some((s) => s.mode === 'free' && s.x > g.x0 - BALL_R - 0.05 && s.x < g.x1 + BALL_R + 0.05 && s.y > -0.6 && s.y < 0.5)
      if (!busy) {
        gateOpen[i] = false
        closing.delete(i)
        flaps[i].push(t)
        knocks.push({ t, kind: 'flap', v: 1.2, x: (g.x0 + g.x1) / 2, y: 0 })
      }
    }

    // The physics.
    const free = states.filter((s) => s.mode === 'free')
    if (free.length) {
      const balls: Ball[] = free.map((s) => ({ id: s.id, x: s.x, y: s.y, vx: s.vx, vy: s.vy }))
      const before = contacts.length
      world.step(t, DT, balls, contacts, passages)
      balls.forEach((b, i) => Object.assign(free[i], { x: b.x, y: b.y, vx: b.vx, vy: b.vy }))
      // A contact is a sample of its own: the drawing touches the part exactly where it was touched.
      for (let c = before; c < contacts.length; c++) {
        const k = contacts[c]
        const st = states[k.ball]
        if (st.mode !== 'free') continue
        const tr = tracks[st.id]
        // The ball's centre at the touch, wound back along its velocity from the end of the step.
        const back = t + DT - k.t
        tr.t.push(k.t)
        tr.x.push(st.x - st.vx * back)
        tr.y.push(st.y - st.vy * back)
        tr.shown.push(true)
        lastSound = Math.max(lastSound, k.t)
      }
      for (const st of free) {
        // Down into the trough.
        if (st.y >= machine.troughY(st.x) - BALL_R && st.x > machine.troughX0) {
          st.y = machine.troughY(st.x) - BALL_R
          knocks.push({ t: t + DT, kind: 'felt', v: Math.abs(st.vy), x: st.x, y: st.y, ball: st.id })
          world.forget(st.id)
          lastSound = Math.max(lastSound, t)
          st.mode = 'trough'
          st.x0 = st.x
          st.t0 = t + DT
          st.until = t + DT + (st.x - machine.troughX0) / TROUGH_SPEED
          record(st, t + DT)
        }
      }
    }
    if (t - lastSample >= 1 / 240) {
      lastSample = t
      for (const st of free) if (st.mode === 'free') record(st, t + DT)
    }

    // The carried legs.
    const sampleKinematic = t - lastKinematic >= 1 / 60
    if (sampleKinematic) lastKinematic = t
    for (const st of states) {
      if (st.mode === 'trough') {
        const f = Math.min(1, (t - st.t0) / (st.until - st.t0))
        st.x = st.x0 + (machine.troughX0 - st.x0) * f
        st.y = machine.troughY(st.x) - BALL_R
        const heavy = (trap && kinds[st.id] === 'brass') || emptying
        if (t >= st.until && (retiring > 0 || heavy)) {
          // The trap at the trough's end opens under it (set for weight, a brass ball's falls open under it), and it
          // runs down the chute into the bowl, to rest.
          if (!heavy) retiring--
          st.mode = 'chute'
          st.t0 = t
          st.until = t + chuteLen / CHUTE_SPEED
          knocks.push({ t, kind: 'flap', v: 1.4, x: machine.troughX0, y: machine.liftFoot, ball: st.id })
          trapped.push({ t, ball: st.id })
          record(st, t)
        } else if (t >= st.until) {
          // Waits for the next cup to come round the foot.
          const phase = (t * LIFT_SPEED) / CUP
          st.mode = 'wait'
          st.until = (Math.ceil(phase) * CUP) / LIFT_SPEED
          st.x = machine.liftX
          st.y = machine.liftFoot - BALL_R
          record(st, t)
        } else if (sampleKinematic) record(st, t)
      } else if (st.mode === 'chute') {
        ;[st.x, st.y] = chuteAt(Math.min(chuteLen, (t - st.t0) * CHUTE_SPEED))
        if (t >= st.until) {
          st.mode = 'bowl'
          knocks.push({ t, kind: 'bowl', v: CHUTE_SPEED, x: machine.bowlX, y: machine.bowlY, ball: st.id })
          record(st, t, false)
          bowl.push([t, count('bowl')])
          bowled.push({ t, ball: st.id })
        } else if (sampleKinematic) record(st, t)
      } else if (st.mode === 'wait' && t >= st.until) {
        st.mode = 'lift'
        st.t0 = st.until
        st.until = st.t0 + (machine.liftFoot - BALL_R - machine.liftHead) / LIFT_SPEED
        record(st, t)
      } else if (st.mode === 'lift') {
        st.x = machine.liftX
        st.y = machine.liftFoot - BALL_R - (t - st.t0) * LIFT_SPEED
        if (t >= st.until) {
          st.y = machine.liftHead
          st.mode = 'track'
          st.s = trackLen
          ;[st.x, st.y] = trackAt(trackLen)
          record(st, t)
        } else if (sampleKinematic) record(st, t)
      }
    }

    // The track: every ball on it rolls down until it seats against the one ahead, or the escapement.
    const onTrack = states.filter((s) => s.mode === 'track').sort((a, b) => a.s - b.s)
    if (onTrack.length > most) [most, mostAt] = [onTrack.length, t]
    onTrack.forEach((st, i) => {
      const home = i * SLOT
      if (st.s > home) {
        const was = st.s
        st.s = Math.max(home, st.s - TRACK_SPEED * DT)
        ;[st.x, st.y] = trackAt(st.s)
        if (st.s === home && was > home) {
          knocks.push({ t, kind: i === 0 ? 'tick' : 'seat', v: TRACK_SPEED, x: st.x, y: st.y, ball: st.id })
          record(st, t)
        } else if (sampleKinematic) record(st, t)
      }
    })

    if (end === Infinity && coda && count('bowl') === states.length) {
      // The last ball at rest; the show holds the still machine while the last notes ring.
      end = Math.max(t + 2, lastSound + RING_OUT)
    }
    if (t > 400 && lenient) end = t
    else if (t > 400) throw new Error(`orchestrion: the performance never came to rest: ${states.map((s) => `${s.id}:${s.mode}@${s.x.toFixed(2)},${s.y.toFixed(2)}`).join(' ')}; releases ${releases.length}, coda ${coda}`)
  }

  // Every ball's last sample at the very end, so a drawing between its last move and the end holds it there.
  for (const st of states) record(st, end, st.mode !== 'bowl' && st.mode !== 'jar')
  // A ball still in the jar at the start is held there from zero.
  for (const tr of tracks) {
    if (tr.t[0] > 0) {
      tr.t.unshift(0)
      tr.x.unshift(tr.x[0])
      tr.y.unshift(tr.y[0])
      tr.shown.unshift(false)
    }
  }
  return { machine, duration: end, tracks, contacts, passages, knocks, strikes, flaps, ticks, releases, jar, bowl, balls: kinds, bowled, trapped, queue: { most, at: mostAt, room: Math.floor(trackLen / SLOT) } }
}
