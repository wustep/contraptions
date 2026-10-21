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
 * at the steps' foot, one on the steps. The rest get up the steps to Athena's statue, the one sanctuary on the height,
 * and stand there round her, headless now, while the torches climb the steps after them in the music's held breath and
 * wait at the top. On the cue's hardest notes the Greeks come over the top and across the forecourt, and kill them at
 * her feet. Every death is the same and nothing more: a blow from behind, a short fall, and the colour going out of
 * them. They lie where they fell as the city burns, and he leaves past it.
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
  /** Up the steps from step `from` to step `to` (or the top, -1), a hop each `dt`. */
  up(from: number, to: number, dt: number): this {
    for (let i = from; i >= to; i--) this.hop(i >= 0 ? onStep(i) : TOP, this.t + dt)
    return this
  }
  /** Struck from behind at `at`: thrown on `by` the way he was going (west), down, a short roll, and still. */
  struck(at: number, by: number, lift = 0.16): number {
    this.wait(at)
    const land = on(this.p[0] - by)
    const T = flightFor(this.p, land, lift)
    const lie = on(land[0] - 0.1)
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

/** Where those who reach the height stand round Athena's statue, and the old man by the brazier. */
const HUDDLE = { a: -36.5, f: -36.15, g: -35.75, h: -35.15 }

function trojans(): Body[] {
  const b: Body[] = []
  const add = (w: Way, name: string, from: number, dies?: number) => b.push({ path: w.path(name), from, dies })
  // The house by the gate, whose roof burns first. One is struck at his own door as he comes out of it.
  {
    const w = out(DOOR_3, 115.98).run(DOOR_3 - 0.1, 116.2, 'in')
    add(w, 'trojan b', 115.98, w.struck(KILLS.street[0], 0.45))
  }
  // One runs for the steps and is caught in the street.
  {
    const w = out(DOOR_3, 116.12).run(-31.0, KILLS.street[1], 'in')
    add(w, 'trojan c', 116.12, w.struck(KILLS.street[1], 0.45))
  }
  // One gets as far as the steps' foot, and is thrown down on them.
  {
    const w = out(DOOR_3, 116.28).run(-31.95, KILLS.street[2], 'in')
    add(w, 'trojan d', 116.28, w.struck(KILLS.street[2], 0.42, 0.22))
  }
  // The house at the steps' foot: one is cut down on the steps themselves, and falls on them.
  {
    const w = out(DOOR_1, 116.82).hop(onStep(6), 117.0).hop(onStep(5), 117.15)
    add(w, 'trojan e', 116.82, w.struck(KILLS.street[3], 0.26, 0.14))
  }
  // Those who get up to the height, to the statue, and are killed there on the hardest notes, backing against her.
  {
    const w = out(DOOR_3, 115.85).run(STREET.x0 + 0.08, 116.6, 'in').up(STEPS.n - 2, -1, 0.15)
    w.run(HUDDLE.a, w.t + 1.6, 'out').wait(125.07).run(HUDDLE.a - 0.15, KILLS.statue[3] - 0.2, 'inout')
    add(w, 'trojan a', 115.85, w.struck(KILLS.statue[3], 0.0, 0.08))
  }
  {
    const w = out(DOOR_1, 116.38).up(STEPS.n - 2, -1, 0.15)
    w.run(HUDDLE.f, w.t + 1.5, 'out').wait(125.07).run(HUDDLE.f - 0.15, KILLS.statue[1] + 0.1, 'inout')
    add(w, 'trojan f', 116.38, w.struck(KILLS.statue[2], 0.05, 0.1))
  }
  {
    const w = out(DOOR_1, 116.62).up(STEPS.n - 2, -1, 0.14)
    w.run(HUDDLE.g, w.t + 1.7, 'out').wait(125.07).run(HUDDLE.g - 0.1, KILLS.statue[1] - 0.1, 'inout')
    add(w, 'trojan g', 116.62, w.struck(KILLS.statue[1], 0.1, 0.12))
  }
  // An old man who was up on the height by the brazier already, and does not run.
  {
    const w = new Way(on(HUDDLE.h), 114)
    add(w, 'trojan h', 114, w.struck(KILLS.statue[0], 0.25))
  }
  return b
}

/** Round the gate tower's foot into the street, where the Greeks come in. */
const IN_AT = TOWER.x0 + 0.2

/**
 * A Greek: in round the tower, to the one he kills in the street (standing just behind him, east, as the blow lands),
 * up the steps in the held breath to wait on step `wait`, and over the top and across to the one he kills at the statue.
 */
function greek(t0: number, street: { x: Pt; at: number }, wait: number, statue: { x: number; at: number }, name: string): Body {
  const w = new Way([IN_AT, STREET.y - R_T], t0)
  if (street.x[0] >= STREET.x0) w.run(street.x[0] + R_T * 2 + 0.03, street.at, 'none')
  else w.run(STREET.x0 + 0.06, street.at - 0.21, 'none').hop(onStep(6), street.at, 0.06)
  // On a little after him as he falls (in the street); then on up the steps after the rest, slowly, through the held
  // breath, to wait near the top.
  let from = STEPS.n - 3
  if (w.p[0] >= STREET.x0) {
    w.run(w.p[0] - 0.12, w.t + 0.45, 'out').wait(w.t + 0.3)
    w.run(STREET.x0 + 0.06, w.t + 0.8, 'inout')
    from = STEPS.n - 2
  } else w.wait(w.t + 0.5)
  w.up(from, wait, 0.45)
  // Over the top on the cue's hardest notes, and across the forecourt at the run.
  w.wait(125.07).up(wait - 1, -1, 0.11)
  w.run(statue.x + R_T * 2 + 0.03, statue.at, 'in')
  w.run(statue.x + R_T * 2 - 0.15, statue.at + 0.5, 'out').wait(141)
  return { path: w.path(name), from: t0, greek: true }
}

function greeks(): Body[] {
  return [
    greek(115.95, { x: on(DOOR_3 - 0.1), at: KILLS.street[0] }, 0, { x: HUDDLE.h, at: KILLS.statue[0] }, 'greek a'),
    greek(116.1, { x: on(-31.0), at: KILLS.street[1] }, 1, { x: HUDDLE.g - 0.1, at: KILLS.statue[1] }, 'greek b'),
    greek(116.2, { x: on(-31.95), at: KILLS.street[2] }, 2, { x: HUDDLE.f - 0.15, at: KILLS.statue[2] }, 'greek c'),
    greek(116.4, { x: onStep(5), at: KILLS.street[3] }, 3, { x: HUDDLE.a - 0.15, at: KILLS.statue[3] }, 'greek d'),
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
    const gone = p.dies === undefined ? 0 : smooth(t, p.dies + 0.1, p.dies + 0.9)
    const color = mix(alive, tone(ASH, t, { fire: 0.25 * fire }), 0.75 * gone)
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
