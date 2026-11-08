import { mix, smooth, type Paint } from '../../draw'
import { MAN, MAN_RIM } from '../../cast'
import { Path, fly, flightFor, rest, roll, type Move, type Pt } from '../../path'
import { flame } from './city'
import { TROJAN, token } from './crowd'
import { FORECOURT, STEPS, STREET, TOWER, step } from './geo'
import { firelight, tone } from './tone'

/**
 * The sack, seen. The fire alone made Troy a burning skyline; the people in it are what make it a massacre. When their
 * roofs catch, the Trojans who hauled the horse in at dusk come running out of their doors into the lower street, and
 * the Greeks come in round the gate tower's foot with their torches and cut them down, one on each of the music's notes,
 * each in his own place, a sweep up the street from the gate to the steps: one at his own door, one in the street, one
 * at the steps' foot, one on the steps. The rest get up the steps onto the height, where an old man stands at their
 * head, and wait there between him and Athena's statue, the one sanctuary, while the torches climb the steps after them
 * in the music's held breath and wait at the top. On the cue's hardest notes the Greeks come over the top and sweep the
 * forecourt to her: the old man where he stands, then each of the rest as they back away towards her, the last at her
 * feet. Every death is the same and nothing more: a blow, a short fall, and the colour going out of them at once. Each
 * lies apart where he fell, his killer standing over him, as the city burns, and he leaves past it.
 *
 * Trojans and Greeks alike are drawn here, as the stage draws a ball (`token`), in the plane of the street: they never
 * touch the cast.
 */

const R = 0.13
const R_T = R * 0.86
const TROJAN_RIM = '#3A1C14'
/** What a Trojan is once the colour has gone out of him: the ash of his own clay. */
const ASH = '#2A2422'

/** The killings: a sweep up the lower street as the city takes fire; and on the hardest notes, at Athena's feet. */
export const KILLS = { street: [116.23, 116.61, 116.85, 117.21], statue: [125.34, 125.74, 126.7, 127.04] } as const

/** The ground in the lower town's plane at x: the forecourt, a step, or the street. */
function floorAt(x: number): number {
  if (x >= STREET.x0) return STREET.y
  if (x <= STEPS.x0) return FORECOURT.y
  const i = Math.min(STEPS.n - 1, Math.max(0, Math.floor((x - STEPS.x0) / STEPS.run)))
  return step(i).y
}
const on = (x: number, r = R_T): Pt => [x, floorAt(x) - r]
/** The riser at the west end of the level ground at x (the forecourt has none): a ball's middle stays R_T off it. */
function riser(x: number): number {
  if (x <= STEPS.x0) return -Infinity
  return step(Math.min(STEPS.n - 1, Math.floor((x - STEPS.x0) / STEPS.run))).x0
}
/** Where a body thrown or sliding west to x comes to rest: against the riser, if it reaches it, not in the stone. */
const stop = (x: number): number => Math.max(x, riser(x) + R_T + 0.01)

/** How much higher than the step it lands on a hop over someone's step goes: his head clears its rise. */
const LIFT_OVER = 0.3
/** Everyone placed so far, for those placed after them to keep clear of: none lands or waits on another. */
const placed: { path: Path; from: number }[] = []
/** Whether a man at `p` from t0 to t1 is clear of everyone placed so far (and on by then). */
function clear(p: Pt, t0: number, t1: number): boolean {
  for (const o of placed) {
    for (let t = Math.max(t0, o.from); t <= t1 + 1e-9; t += 0.02) {
      const [x, y] = o.path.where(t)
      if (Math.hypot(x - p[0], y - p[1]) < 2 * R_T + 0.005) return false
    }
  }
  return true
}
/** Where one stands on step `i` (0 the top; the last is level with the street). */
const onStep = (i: number): Pt => [step(i).x0 + STEPS.run * 0.5, step(i).y - R_T]
const TOP: Pt = [STEPS.x0 - 0.18, FORECOURT.y - R_T]

/** One person's way: moves laid end to end from where and when the last left off. */
class Way {
  readonly m: Move[] = []
  constructor(p: Pt, t: number) {
    this.m.push(rest(p, t, t))
  }
  get p(): Pt {
    const mv = this.m[this.m.length - 1]
    return mv.at(mv.t1)
  }
  get t(): number {
    return this.m[this.m.length - 1].t1
  }
  wait(until: number): this {
    if (until > this.t + 1e-9) this.m.push(rest(this.p, this.t, until))
    return this
  }
  /** Along level ground (the street, or the forecourt) to x, arriving at t1. */
  run(x: number, t1: number, ease: 'inout' | 'in' | 'out' | 'none' = 'none'): this {
    this.m.push(roll([this.p, on(x)], this.t, t1, ease))
    return this
  }
  /** A hop to `to`, landing at `t`. */
  hop(to: Pt, t: number, lift = 0.08): this {
    const T = flightFor(this.p, to, lift)
    this.wait(t - T)
    this.m.push(fly(this.p, to, t - T, t))
    return this
  }
  /**
   * Up the steps from step `from` to step `to` (or the top, -1), a hop each `dt`. In a slow climb, over any step someone
   * is lying or waiting on, in one hop to the next, and onto none until whoever was on it has left it (the Greeks
   * landed on the dead and on each other, 117-120.5 s). A quick one is a file going up a step apart, all at once.
   */
  up(from: number, to: number, dt: number): this {
    const slow = dt > 0.3
    let over = false
    for (let i = from; i >= to; i--) {
      const at = i >= 0 ? onStep(i) : TOP
      if (slow && i > to && !over && !clear(at, this.t + dt, this.t + 1.8 * dt)) {
        over = true
        continue
      }
      let t = this.t + dt
      for (let k = 0; slow && k < 10 && !clear(at, t - 0.12, t + 0.05); k++) t += 0.05
      // A hop over someone goes high enough to clear him.
      this.hop(at, t, over ? LIFT_OVER : 0.08)
      over = false
    }
    return this
  }
  /** Struck at `at`: thrown on `by` the way he was going (west), down, a short roll of `slide`, and still. */
  struck(at: number, by: number, lift = 0.16, slide = 0.1): number {
    this.wait(at)
    // Each where his fall stops: against the riser of the step above, if he reaches it (two lay a third of a ball
    // into the stone, 117.5-141 s).
    const land = on(stop(this.p[0] - by))
    const T = flightFor(this.p, land, lift)
    const lie = on(stop(land[0] - slide))
    this.m.push(fly(this.p, land, at, at + T), roll([land, lie], at + T, at + T + 0.35, 'out'), rest(lie, at + T + 0.35, 141))
    return at
  }
  path(name: string): Path {
    return new Path(this.m, name)
  }
}

interface Body {
  path: Path
  /** When he comes on: out of his door, or round the gate tower. */
  from: number
  /** When the blow that kills him lands (Trojans who die). */
  dies?: number
  greek?: boolean
}

const DOOR_3 = -30.25
const DOOR_1 = -32.06
/** Out of his door at `t`: he comes out of the dark doorway into the street. */
const out = (door: number, t: number): Way => new Way(on(door), t)

/**
 * Where those who reach the height wait through the held breath (the old man at the top of the steps, the rest back
 * towards Athena), and where each is when he is struck: far enough apart that every body lies clear of the next and of
 * the man who kills the next, the brazier between the second and the third, the last against her plinth.
 */
const HUDDLE = { a: -36.45, f: -35.9, g: -35.0, h: -34.55 }
const FALL = { a: -36.72, f: -36.1, g: -35.25, h: HUDDLE.h }

function trojans(): Body[] {
  const b: Body[] = []
  const add = (w: Way, name: string, from: number, dies?: number) => {
    b.push({ path: w.path(name), from, dies })
    placed.push(b[b.length - 1])
  }
  // The house by the gate, whose roof burns first. One is struck at his own door as he comes out of it. Each in the
  // street falls short of where the next is struck from: thrown further, he lay under the Greek who struck the next,
  // and that Greek stood on him (116.6-117.3 and 116.85-117.6 s).
  {
    const w = out(DOOR_3, 115.98).run(DOOR_3 - 0.1, 116.2, 'in')
    add(w, 'trojan b', 115.98, w.struck(KILLS.street[0], 0.09, 0.16, 0.06))
  }
  // One runs for the steps and is caught in the street.
  {
    const w = out(DOOR_3, 116.12).run(-31.0, KILLS.street[1], 'in')
    add(w, 'trojan c', 116.12, w.struck(KILLS.street[1], 0.36, 0.16, 0.08))
  }
  // One gets as far as the steps' foot, and is thrown down against them. (Not up onto them: the steps are a ball wide,
  // and whoever climbed them after had to land on him.)
  {
    const w = out(DOOR_3, 116.28).run(-31.95, KILLS.street[2], 'in')
    add(w, 'trojan d', 116.28, w.struck(KILLS.street[2], 0.2, 0.22))
  }
  // The house at the steps' foot: one is cut down on the steps themselves, and falls where he stands.
  {
    const w = out(DOOR_1, 116.82).hop(onStep(6), 117.0).hop(onStep(5), 117.15)
    add(w, 'trojan e', 116.82, w.struck(KILLS.street[3], 0.0, 0.1, 0.02))
  }
  // Those who get up to the height, and are killed there on the hardest notes as they back away towards her: up the
  // steps in a file, each most of a step behind the last. (Two went up them in step, on the same treads at the same
  // moments, one ball inside the other, 116.75-117.65 s.)
  {
    const w = out(DOOR_3, 115.85).run(STREET.x0 + 0.08, 116.48, 'in').up(STEPS.n - 2, -1, 0.15)
    w.run(HUDDLE.a, w.t + 1.6, 'out').wait(125.07).run(FALL.a, KILLS.statue[3] - 0.2, 'inout')
    add(w, 'trojan a', 115.85, w.struck(KILLS.statue[3], 0.0, 0.08, 0.02))
  }
  {
    const w = out(DOOR_1, 116.38).up(STEPS.n - 2, -1, 0.15)
    w.run(HUDDLE.f, w.t + 1.5, 'out').wait(125.07).run(FALL.f, KILLS.statue[2] - 0.15, 'inout')
    add(w, 'trojan f', 116.38, w.struck(KILLS.statue[2], 0.06, 0.1, 0.04))
  }
  {
    const w = out(DOOR_1, 116.62).up(STEPS.n - 2, -1, 0.15)
    w.run(HUDDLE.g, w.t + 1.7, 'out').wait(125.07).run(FALL.g, KILLS.statue[1] - 0.1, 'inout')
    add(w, 'trojan g', 116.62, w.struck(KILLS.statue[1], 0.04, 0.1, 0.02))
  }
  // An old man who was up on the height already, at the top of the steps, and does not run: he is the first.
  {
    const w = new Way(on(HUDDLE.h), 114)
    add(w, 'trojan h', 114, w.struck(KILLS.statue[0], 0.06, 0.12, 0.04))
  }
  return b
}

/** Round the gate tower's foot into the street, where the Greeks come in. */
const IN_AT = TOWER.x0 + 0.2
/** Where the Greeks go up the steps from: clear of the man lying at their foot. */
const FOOT = STREET.x0 + 0.1

/**
 * A Greek: in round the tower, to the one he kills in the street (standing just behind him, east, as the blow lands),
 * up the steps in the held breath to wait on step `wait`, and over the top and across to the one he kills at the statue.
 */
function greek(t0: number, street: { x: Pt; at: number }, wait: number, statue: { x: number; at: number }, name: string): Body {
  const w = new Way([IN_AT, STREET.y - R_T], t0)
  if (street.x[0] >= STREET.x0) w.run(street.x[0] + R_T * 2 + 0.03, street.at, 'none')
  else w.run(FOOT, street.at - 0.21, 'none').hop(onStep(6), street.at, 0.06)
  // On a little after him as he falls (in the street); then on up the steps after the rest, slowly, through the held
  // breath, to wait near the top.
  let from = STEPS.n - 3
  if (w.p[0] >= STREET.x0) {
    // Short of anyone lying there (one stood on the man his fellow had killed, 117-117.4 s).
    let x = w.p[0] - 0.12
    while (x < w.p[0] && !clear(on(x), w.t + 0.3, w.t + 0.75)) x += 0.02
    w.run(x, w.t + 0.45, 'out').wait(w.t + 0.3)
    // To the steps' foot, or behind whoever is waiting there.
    let foot = FOOT
    while (!clear(on(foot), w.t + 0.7, w.t + 0.8 + 0.45)) foot += 0.04
    w.run(foot, w.t + 0.8, 'inout')
    from = STEPS.n - 2
  } else w.wait(w.t + 0.5)
  w.up(from, wait, 0.45)
  // Over the top on the cue's hardest notes, and across the forecourt at the run to the one he kills; then he stands
  // over him, where he struck.
  w.wait(125.07).up(wait - 1, -1, 0.11)
  w.run(statue.x + R_T * 2 + 0.03, statue.at, 'in')
  w.run(statue.x + R_T * 2 + 0.06, statue.at + 0.3, 'out').wait(141)
  const body = { path: w.path(name), from: t0, greek: true }
  placed.push(body)
  return body
}

function greeks(): Body[] {
  // The one already on the steps first, so the rest, climbing past where he waits, keep clear of him.
  const d = greek(116.4, { x: onStep(5), at: KILLS.street[3] }, 3, { x: FALL.a, at: KILLS.statue[3] }, 'greek d')
  return [
    greek(115.95, { x: on(DOOR_3 - 0.1), at: KILLS.street[0] }, 0, { x: FALL.h, at: KILLS.statue[0] }, 'greek a'),
    greek(116.1, { x: on(-31.0), at: KILLS.street[1] }, 1, { x: FALL.g, at: KILLS.statue[1] }, 'greek b'),
    greek(116.2, { x: on(-31.95), at: KILLS.street[2] }, 2, { x: FALL.f, at: KILLS.statue[2] }, 'greek c'),
    d,
  ]
}

const TROJANS = trojans()
const GREEKS = greeks()

/** Whether any of it is in the frame: the street, the steps and the forecourt by the statue. */
const IN_VIEW = (g: Paint) => !(g.view.x1 < -38 || g.view.x0 > TOWER.x0 + 0.5)

const dead = (p: Body, t: number) => p.dies !== undefined && t > p.dies

/** The Trojans and the Greeks in the lower town and on the height, from the fire's coming to the ships' going. */
export function drawSack(g: Paint): void {
  const { t } = g
  if (t < 114 || t > 141 || !IN_VIEW(g)) return
  // The dead under the living; the Greeks over all, with their torches.
  const order = [...TROJANS].sort((a, b) => (dead(b, t) ? 1 : 0) - (dead(a, t) ? 1 : 0))
  for (const p of order) {
    if (t < p.from) continue
    const [x, y] = p.path.where(t)
    const fire = firelight(x, t)
    const alive = tone(TROJAN, t, { fire: 0.4 + 0.6 * fire })
    // The colour goes out of him with the blow, at once, so each note is one more of them gone.
    const gone = p.dies === undefined ? 0 : smooth(t, p.dies, p.dies + 0.16)
    const color = mix(alive, tone(ASH, t, { fire: 0.25 * fire }), 0.85 * gone)
    const come = smooth(t, p.from, p.from + 0.18)
    token(g, x, y, R_T * come, color, tone(TROJAN_RIM, t), p.path.spin(t, R_T))
  }
  for (const p of GREEKS) {
    if (t < p.from) continue
    const [x, y] = p.path.where(t)
    // Lit by his own torch: the clay warm and light, where the dead have gone dark. Round the tower's foot he is hidden
    // behind it until he is past it (the tower is drawn over this).
    token(g, x, y, R_T, mix(tone(MAN, t, { fire: 0.85 }), MAN, 0.3), tone(MAN_RIM, t), p.path.spin(t, R_T))
    g.ctx.beginPath()
    g.ctx.moveTo(x + 0.02, y - R_T + 0.02)
    g.ctx.lineTo(x + 0.06, y - R_T - 0.3)
    g.ctx.lineWidth = Math.max(0.75 * g.px, 0.022)
    g.ctx.strokeStyle = tone('#1A120C', t)
    g.ctx.stroke()
    flame(g.ctx, x + 0.06, y - R_T - 0.28, 0.1, 0.19, t, Math.round(p.from * 10))
  }
}
