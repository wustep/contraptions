import { R, type Pt, type Seg } from '../../../../../parts'
import { G_EARTH } from '../physics'
import { CODA_CHORDS, P, eighth, onset } from '../music'

/**
 * The hall's score: every moment the court part (40.19 → 58.02) and the wake part (58.02 → 74.42) are timed to,
 * and the paths Peer and the Woman in Green take through the Mountain King's hall. Both parts and the hall's
 * drawing (`hall.ts`) read these, so what moves and what it moves on are one clock.
 *
 * Everything is in the COURT part's frame (cells, y down): the hall's floor top is at y = R (0.13), the ball's
 * centre rolls at y = 0; Peer comes in at (-0.5, 0) at the west door and stands before the throne at (15.5, 0).
 * The wake part's frame is this one moved 16 cells west (`WAKE_DX`).
 */

/* ------------------------------------------------------------------ the grid */

/** Phrase n's eighth `at` (0..31): the notes the hall is timed to. */
const q = (n: number) => (at: number): number => eighth(32 * n + at)
export const q4 = q(4)
export const q5 = q(5)
export const q6 = q(6)
export const q7 = q(7)

export const COURT_BEGIN = P[4]
export const WAKE_BEGIN = P[6]
export const WAKE_END = P[8]
/** Court-local x of the wake part's origin: the court part leaves the ball at (15.5, 0), which is wake's (-0.5, 0). */
export const WAKE_DX = 16

/* ------------------------------------------------------------------ the hall's plan (court frame) */

/** The floor's top: the ball's centre is R above it. */
export const FL = R
/** The benches the court sits on: seat tops, front row to the high gallery. */
export const ROW_Y = [-0.32, -1.62, -2.92]
/** The far gallery, dark: only their eyes are seen, when they open. */
export const GALLERY_Y = -4.3
/** The living-rock pillars (their middles), floor to vault. P1 and P2 hold up the court's side, P3 the east end. */
export const PILLARS = [4.3, 9.5, 24.9]
/** The dais: its first step's top and the top of the second, and where they run. */
export const DAIS = { x0: 16.4, x1: 23.2, step: -0.2, top: -0.55, inset: 0.4 }
/** The throne's seat (its middle and its top) and the King's place. */
export const THRONE = { x: 19.7, seat: -1.15, back: -4.9, w: 2.1 }
/** Where he stands once he is up: stepped off his throne, west of its seat, his whole silhouette clear of it. */
export const KING_UP: Pt = [18.15, DAIS.top]
/** The hatch in the floor (the trolls' way down to the mine), hinged at its east edge; the wake part's shaft under it. */
export const HATCH = { x0: 26.9, x1: 28.1, hinge: 28.1 }
/** The chimney's column (the director's finale lifts Peer up it, ~141.7 → 145): kept clear of what falls. */
export const CHIMNEY_X = 7.5

/** The ball on a flat of height `top` (a step, the dais): its centre. */
const on = (top: number): number => top - R

/* ------------------------------------------------------------------ the tails (the court's stepping stones) */

/**
 * Three sleepers' tails come out from under them, over the bench's edge, and lie along the floor in front of it: the
 * stones Peer treads on. `root` is under the troll, `hang` where it comes down the bench's face, `tuft` its end on the
 * floor, `land` where he treads; `top` is its upper edge there.
 */
export interface Tail {
  root: Pt
  hang: number
  tuft: number
  land: number
  top: number
}
export const TAIL_TOP = FL - 0.1

/* ------------------------------------------------------------------ court: the moments */

/** Station 1: the tail trodden, flicked, the sleeper's snort into its brazier, the wall torch catching from the sparks. */
export const TAIL_A = q4(8)
export const FLICK_A = q4(10)
export const SNORT_A = q4(12)
export const TORCH_A = q4(14)
/** Station 2, the same, bigger. */
export const TAIL_B = q4(24)
export const FLICK_B = q4(26)
export const SNORT_B = q4(28)
export const TORCH_B = q4(30)
/** Station 3, the elder: its eye opens a crack on the tail; the snort flares its brazier into the low lantern of the chain. */
export const TAIL_C = q5(8)
export const FLICK_C = q5(10)
export const SNORT_C = q5(12)
/** The wick along the chain of lanterns burns east to the crown-lamp over the throne: each lantern catches on a note. */
export const LANTERNS = [SNORT_C, q5(16), q5(18)]
export const CROWN_LAMP = q5(20)

/* ------------------------------------------------------------------ wake: the moments */

/** The first eyes open (the troll nearest him), and the heads turn to him in a wave, west from the throne, on the run. */
export const FIRST_EYES = q6(0)
export const WAVE = [q6(1), q6(2), q6(3), q6(4), q6(5), q6(6)]
/** "Slay him!": the court's mouths and arms, three times, and smaller cries between. */
export const SLAY = [q6(8), q6(24), onset(71.36, 3)]
export const CRIES = [q6(4), q6(12), q7(8), q7(12), q7(22)]
/** The King: his eyes open, and he rises (a bar), and roars with the court. */
export const KING_EYES = q6(12)
export const KING_RISE: [number, number] = [q6(16), q6(23)]
/** The court stands on the next phrase's downbeat; the front row steps down and comes on, on the notes. */
export const COURT_UP = q7(0)
export const STEPS = [q7(2), q7(4), q7(6)]
/** Grabs at him that close on air: the troll nearest him at the dais's foot, then the King reaching down. */
export const GRAB = q7(8)
export const KING_GRAB = q7(12)
/** The King's sceptre comes down on the biggest accent, where Peer was; the floor cracks east to the hatch. */
export const SMASH = SLAY[2]
export const CRACK = [q7(22), q7(24)]
/** The hatch lurches, and swings open under him: he falls straight down the shaft into the mine. */
export const LURCH = q7(26)
export const OPEN = q7(27)

/* ------------------------------------------------------------------ the collapse (the coda, for the director's finale) */

const chord = (t: number): number => CODA_CHORDS.reduce((b, c) => (Math.abs(c.t - t) < Math.abs(b - t) ? c.t : b), CODA_CHORDS[0].t)
/** The bells: the court freezes and looks up. */
export const BELLS = chord(134.25)
/**
 * They stay frozen, looking up, until he bursts up through their floor; then they flee, row by row, on the chords
 * (the crack under them, the burst, the next chord), in the frame as he comes up through the hall.
 */
export const FLEE = [chord(140.05), chord(140.27), chord(141.05), chord(141.05)]
/** The pillars crack on the next pairs; the floor over the chimney's column breaks open. */
export const CRACKS = [chord(139.07), chord(139.33), chord(140.05)]
export const FLOOR_BREAK = chord(140.27)
/** The pillars come down, one a chord: P1, P2, P3. */
export const PILLAR_FALL = [chord(143.2), chord(144.12), chord(145.08)]
/** The six hammer blows: the throne topples, the vault drops its stalactites, the lights go out one a blow. */
export const HAMMERS = CODA_CHORDS.filter((c) => c.t >= 145.3).map((c) => c.t)

/* ------------------------------------------------------------------ paths */

export type Ease = 'lin' | 'in' | 'out' | 'inout'
const shape = (e: Ease) => (u: number): number =>
  e === 'lin' ? u : e === 'in' ? u * u : e === 'out' ? 1 - (1 - u) * (1 - u) : 0.5 - 0.5 * Math.cos(Math.PI * u)

interface Move {
  t0: number
  t1: number
  rest?: boolean
  at: (u: number) => Pt
}

/** A path through timed moves: rests, glides with an ease, hops on a parabola, falls. Each move starts where the last ended. */
export class Path {
  readonly moves: Move[] = []
  constructor(public t: number, public p: Pt) {}
  private add(t1: number, at: (u: number) => Pt, rest = false): this {
    this.moves.push({ t0: this.t, t1, at, rest })
    this.t = t1
    this.p = at(1)
    return this
  }
  rest(t1: number): this {
    const p = this.p
    return this.add(t1, () => p, true)
  }
  go(to: Pt, t1: number, e: Ease = 'inout'): this {
    const a = this.p
    const f = shape(e)
    return this.add(t1, (u) => {
      const s = f(u)
      return [a[0] + (to[0] - a[0]) * s, a[1] + (to[1] - a[1]) * s]
    })
  }
  /** A flight to `to` landing at `t1`, peaking `lift` over the chord's middle (default: the lift gravity gives). */
  hop(to: Pt, t1: number, lift?: number): this {
    const a = this.p
    const T = t1 - this.t
    const h = lift ?? (G_EARTH * T * T) / 8
    return this.add(t1, (u) => [a[0] + (to[0] - a[0]) * u, a[1] + (to[1] - a[1]) * u - h * 4 * u * (1 - u)])
  }
  /** Straight down from rest under constant gravity, arriving at `t1`. */
  fall(to: Pt, t1: number): this {
    const a = this.p
    return this.add(t1, (u) => [a[0] + (to[0] - a[0]) * u * u, a[1] + (to[1] - a[1]) * u * u])
  }
  at(t: number): Pt {
    const m = this.moves
    if (t <= m[0].t0) return m[0].at(0)
    let lo = 0
    let hi = m.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (m[mid].t0 <= t) lo = mid
      else hi = mid - 1
    }
    const mv = m[lo]
    const u = mv.t1 > mv.t0 ? Math.min(1, Math.max(0, (t - mv.t0) / (mv.t1 - mv.t0))) : 1
    return mv.at(u)
  }
  /**
   * The lane from show time `t0` to `t1` (both on move boundaries), each move cut into straight pieces of at most
   * `dt` seconds so every landing is exactly on its time; `dx` moves it into another part's frame.
   */
  segs(t0: number, t1: number, dx = 0, dt = 0.02): Seg[] {
    const out: Seg[] = []
    const mv = (p: Pt): Pt => [p[0] + dx, p[1]]
    for (const m of this.moves) {
      if (m.t1 <= t0 + 1e-9 || m.t0 >= t1 - 1e-9) continue
      const n = m.rest ? 1 : Math.max(1, Math.ceil((m.t1 - m.t0) / dt - 1e-9))
      const d = (m.t1 - m.t0) / n
      for (let i = 0; i < n; i++) out.push({ from: mv(m.at(i / n)), to: mv(m.at((i + 1) / n)), dur: d })
    }
    return out
  }
}

/* ------------------------------------------------------------------ Peer */

/** The tails he treads on (the sleepers are `hall-court.ts`'s A, B and C). */
export const TAILS: Record<'A' | 'B' | 'C', Tail> = {
  A: { root: [1.98, -0.42], hang: 1.76, tuft: 1.1, land: 1.46, top: TAIL_TOP },
  B: { root: [6.62, -0.42], hang: 6.86, tuft: 7.62, land: 7.22, top: TAIL_TOP },
  C: { root: [10.85, -0.46], hang: 10.58, tuft: 9.76, land: 10.13, top: TAIL_TOP },
}
const TAIL_ON = on(TAIL_TOP)

/** Tiptoes: a hop onto each landing, low; `lift` its height. */
function tiptoe(path: Path, lands: [number, number][], lift = 0.1, lead = 0.62): void {
  for (const [t, x] of lands) {
    const takeoff = Math.max(path.t, t - lead * (t - path.t))
    if (takeoff > path.t + 1e-6) path.rest(takeoff)
    path.hop([x, 0], t, lift)
  }
}

export const PEER_PATH: Path = (() => {
  const a = new Path(COURT_BEGIN, [-0.5, 0])
  // Phrase 4. At rest on the threshold; three careful tiptoes on the run's quarter notes; still on the held note.
  a.rest(COURT_BEGIN + 0.32)
  tiptoe(a, [[q4(2), 0.02], [q4(4), 0.48], [q4(6), 0.92]], 0.11)
  // Onto the first tail (it gives a little under him); it flicks and tosses him on; the sleeper snorts as he lands.
  const la = TAILS.A.land
  a.rest(q4(7) + 0.02).hop([la, TAIL_ON], TAIL_A, 0.2)
  a.go([la, TAIL_ON + 0.025], TAIL_A + 0.12, 'out').go([la, TAIL_ON + 0.01], FLICK_A - 0.02, 'inout')
  a.hop([2.55, 0], SNORT_A, 0.42)
  // Frozen while the sparks go up and the torch catches; then a scurry on the run up (every eighth).
  a.rest(q4(15) + 0.05)
  a.hop([2.95, 0], q4(16), 0.09)
  const scurry1 = [q4(17), q4(18), q4(19), q4(20), q4(21), q4(22), q4(23)]
  scurry1.forEach((t, i) => a.hop([2.95 + 0.51 * (i + 1), 0], t, 0.075))
  // Onto the second tail, tossed on again, the second snort.
  const lb = TAILS.B.land
  a.hop([lb, TAIL_ON], TAIL_B, 0.16)
  a.go([lb, TAIL_ON + 0.025], TAIL_B + 0.12, 'out').go([lb, TAIL_ON + 0.01], FLICK_B - 0.02, 'inout')
  a.hop([7.95, 0], SNORT_B, 0.42)
  // Phrase 5: still through the held notes, then the tiptoes again, and the elder's tail.
  a.rest(q5(0) - 0.3)
  tiptoe(a, [[q5(0), 8.45], [q5(2), 8.92], [q5(4), 9.32], [q5(6), 9.66]], 0.11, 0.55)
  const lc = TAILS.C.land
  a.rest(q5(7) + 0.02).hop([lc, TAIL_ON], TAIL_C, 0.22)
  a.go([lc, TAIL_ON + 0.03], TAIL_C + 0.14, 'out').go([lc, TAIL_ON + 0.01], FLICK_C - 0.02, 'inout')
  // The elder's tail is heavier: a higher toss, over the elder's knees.
  a.hop([11.75, 0], SNORT_C, 0.62)
  // Watching the fire run away along the chain overhead; then scurrying under it toward the throne.
  a.rest(q5(15) + 0.05)
  a.hop([12.15, 0], q5(16), 0.09)
  const scurry2 = [q5(17), q5(18), q5(19), q5(20), q5(21), q5(22), q5(23)]
  scurry2.forEach((t, i) => a.hop([12.15 + 0.4 * (i + 1), 0], t, 0.07))
  // The last steps, slowing, to stand before the throne.
  tiptoe(a, [[q5(24), 15.18], [q5(26), 15.38], [q5(28), 15.5]], 0.07, 0.5)
  a.rest(WAKE_BEGIN)

  // Wake. Still while the heads turn; a start back at the first "Slay him!".
  a.rest(SLAY[0])
  a.hop([15.9, 0], q6(10), 0.3)
  a.rest(SLAY[1])
  // A start back from the King's roar, and still through the held notes; the court stands.
  a.hop([15.25, 0], q6(26), 0.28)
  a.rest(STEPS[2])
  // They come on: he bolts up the dais (the grab closes where he was), under the roaring King between his feet, and
  // along it, and down its east steps.
  a.hop([17.35, on(DAIS.top)], GRAB, 0.55)
  a.rest(q7(10))
  a.hop([19.95, on(DAIS.top)], KING_GRAB, 0.16)
  a.hop([21.35, on(DAIS.top)], q7(14), 0.16)
  a.hop([22.4, on(DAIS.top)], q7(16), 0.14)
  // At the dais's end the sceptre goes up behind him; he jumps as it comes down where he stood; its jolt throws him
  // on, and the crack runs after him.
  a.rest(q7(18))
  a.hop([23.9, 0], SMASH, 0.34)
  a.hop([25.95, 0], CRACK[0], 0.3)
  a.hop([27.5, 0], CRACK[1], 0.26)
  // On the hatch: it lurches under him, and opens: straight down 9 cells into the mine.
  a.go([27.5, 0.05], LURCH, 'in')
  a.rest(OPEN)
  a.fall([27.5, 9], WAKE_END)
  return a
})()

/* ------------------------------------------------------------------ the Woman in Green */

export const WOMAN_PATH: Path = (() => {
  const w = new Path(COURT_BEGIN, [0.5, 0])
  w.rest(COURT_BEGIN + 0.55)
  // Ahead of him over the first tail, waiting beyond it.
  w.go([1.05, 0], 41.3)
  w.hop([2.3, 0], 41.85, 0.24)
  w.go([3.45, 0], 42.6, 'out')
  w.rest(44.55)
  // On, over the second tail, and waiting.
  w.go([6.5, 0], 46.1)
  w.hop([7.95, 0], 46.55, 0.22)
  w.go([8.9, 0], 47.3, 'out')
  w.rest(48.25)
  w.go([9.45, 0], 49.6)
  // Over the elder's tail, and on ahead of him to the throne: up the dais to her father's side.
  w.go([9.65, 0], 50.0, 'in')
  w.hop([10.95, 0], 50.45, 0.24)
  w.go([12.9, 0], 51.3, 'out')
  w.rest(52.95)
  w.go([16.05, 0], 54.75)
  w.hop([16.75, on(DAIS.step)], 55.1, 0.22)
  w.hop([17.35, on(DAIS.top)], 55.45, 0.22)
  w.go([17.9, on(DAIS.top)], 56.1, 'out')
  // At his side as the court wakes; she slips away east along the dais, down, and out of the east door.
  w.rest(60.85)
  w.go([22.55, on(DAIS.top)], 62.2, 'inout')
  w.hop([23.05, on(DAIS.step)], 62.45, 0.14)
  w.hop([23.6, 0], 62.7, 0.14)
  w.go([27.2, 0], 63.8, 'lin')
  w.go([31.5, 0], 65.2, 'out')
  return w
})()
/** When she is gone (out of the east door, out of shot). */
export const WOMAN_GONE = 65.2

/* ------------------------------------------------------------------ helpers for the drawing */

/** 0 until `a`, 1 from `b`, smooth between. */
export const ease = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}
/** A knock: 1 at `since` = 0, decaying; 0 before. */
export const kick = (since: number, decay = 0.25): number => (since < 0 ? 0 : Math.exp(-since / decay))
/** A damped ring after an event: 0 before, a decaying sine after. */
export const ring = (since: number, decay = 0.4, rate = 14): number => (since < 0 ? 0 : Math.exp(-since / decay) * Math.sin(since * rate))
/** Up to a peak on `at` from `lead` before, then down over `fall`: an anticipated accent. */
export const accent = (t: number, at: number, lead = 0.14, fall = 0.6): number =>
  t < at - lead ? 0 : t < at ? ease(t, at - lead, at) : Math.exp(-(t - at) / fall)
