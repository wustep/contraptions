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
 * the Greeks come in from the gate behind them with their torches and cut them down, one on each of the music's notes,
 * where they run: at a door, in the street, at the foot of the steps. The rest get up the steps to Athena's statue, the
 * one sanctuary on the height, and stand there round her, headless now; and on the cue's hardest notes the Greeks come
 * across the forecourt and kill them at her feet. Every death is the same and nothing more: a blow from behind, a short
 * fall, and the colour going out of them. They lie where they fell as the city burns, and he leaves past it.
 *
 * Trojans and Greeks alike are drawn here, as the stage draws a ball (`token`), in the plane of the street: they never
 * touch the cast.
 */

const R = 0.13
const R_T = R * 0.86
const TROJAN_RIM = '#3A1C14'
/** What a Trojan is once the colour has gone out of him: the ash of his own clay. */
const ASH = '#2A2422'

/** The ground in the lower town's plane at x: the forecourt, a step, or the street. */
function floorAt(x: number): number {
  if (x >= STREET.x0) return STREET.y
  if (x <= STEPS.x0) return FORECOURT.y
  const i = Math.min(STEPS.n - 1, Math.max(0, Math.floor((x - STEPS.x0) / STEPS.run)))
  return step(i).y
}
const on = (x: number, r = R_T): Pt => [x, floorAt(x) - r]

/** Up the steps from `x` (the street's west end, or a door at their foot) to the forecourt's edge, a hop a step. */
function upSteps(t0: number, dt: number, x = STREET.x0 + 0.08, r = R_T): { moves: Move[]; t1: number } {
  const moves: Move[] = []
  let at: Pt = on(x, r)
  let t = t0
  for (let i = STEPS.n - 2; i >= -1; i--) {
    const to: Pt = i >= 0 ? [step(i).x0 + STEPS.run * 0.5, step(i).y - r] : [STEPS.x0 - 0.18, FORECOURT.y - r]
    moves.push(fly(at, to, t, t + dt))
    at = to
    t += dt
  }
  return { moves, t1: t }
}

/** A run along level ground (or the forecourt), from `a` to `b`. */
const run = (a: number, b: number, t0: number, t1: number, ease: 'inout' | 'in' | 'out' | 'none' = 'none'): Move => roll([on(a), on(b)], t0, t1, ease)

/** Struck from behind at `at`, where he is: thrown on a little the way he was running (west), down, a short roll, still. */
function struck(x: number, at: number, by = 0.55): Move[] {
  const a = on(x)
  const land = on(x - by)
  const T = flightFor(a, land, 0.16)
  const lie = on(x - by - 0.12)
  return [fly(a, land, at, at + T), roll([land, lie], at + T, at + T + 0.35, 'out'), rest(lie, at + T + 0.35, 141)]
}

interface Body {
  path: Path
  /** When he comes on: out of his door, or round the gate tower. */
  from: number
  /** When the blow that kills him lands (Trojans who die). */
  dies?: number
  greek?: boolean
}

/** Out of the door at `door` (x) at `t`, a short way into the street. */
const outOfDoor = (door: number, t: number): Move => run(door, door - 0.2, t, t + 0.18, 'in')

const DOOR_3 = -30.25
const DOOR_1 = -32.06

/** The killings: in the lower street on the notes after the city takes fire, and at Athena's feet on the hardest. */
export const KILLS = { door: 116.85, street: 117.21, foot: 117.38, statue: [125.34, 125.74, 126.7, 127.04] } as const

function trojans(): Body[] {
  const out: Body[] = []
  // House by the gate (its roof is first to burn): three out of its door. The last is struck as he comes out.
  {
    const t0 = 115.9
    const m: Move[] = [outOfDoor(DOOR_3, t0), run(DOOR_3 - 0.2, STREET.x0 + 0.08, t0 + 0.18, 116.95)]
    const up = upSteps(116.95, 0.16)
    m.push(...up.moves, run(STEPS.x0 - 0.18, -36.45, up.t1, up.t1 + 1.5, 'out'), rest(on(-36.45), up.t1 + 1.5, KILLS.statue[1]))
    m.push(...struck(-36.45, KILLS.statue[1], 0.14))
    out.push({ path: new Path(m, 'trojan a'), from: t0, dies: KILLS.statue[1] })
  }
  {
    const t0 = 116.2
    const x = -31.25
    const m: Move[] = [outOfDoor(DOOR_3, t0), run(DOOR_3 - 0.2, x, t0 + 0.18, KILLS.street, 'none'), ...struck(x, KILLS.street)]
    out.push({ path: new Path(m, 'trojan b'), from: t0, dies: KILLS.street })
  }
  {
    const t0 = 116.5
    const x = DOOR_3 - 0.32
    const m: Move[] = [run(DOOR_3, x, t0, KILLS.door, 'in'), ...struck(x, KILLS.door, 0.45)]
    out.push({ path: new Path(m, 'trojan c'), from: t0, dies: KILLS.door })
  }
  // The house at the steps' foot: three out of its door; one caught at the foot, two up the steps.
  {
    const t0 = 116.62
    const m: Move[] = [outOfDoor(DOOR_1, t0)]
    const up = upSteps(t0 + 0.18, 0.15, DOOR_1 - 0.2)
    m.push(...up.moves, run(STEPS.x0 - 0.18, -37.3, up.t1, up.t1 + 1.9, 'out'), rest(on(-37.3), up.t1 + 1.9, KILLS.statue[2]))
    m.push(...struck(-37.3, KILLS.statue[2], 0.04))
    out.push({ path: new Path(m, 'trojan d'), from: t0, dies: KILLS.statue[2] })
  }
  {
    const t0 = 117.0
    const m: Move[] = [run(DOOR_1, DOOR_1 + 0.02, t0, KILLS.foot, 'none'), ...struck(DOOR_1 + 0.02, KILLS.foot, 0.3)]
    out.push({ path: new Path(m, 'trojan e'), from: t0, dies: KILLS.foot })
  }
  {
    const t0 = 117.15
    const m: Move[] = [outOfDoor(DOOR_1, t0)]
    const up = upSteps(t0 + 0.18, 0.14, DOOR_1 - 0.2)
    m.push(...up.moves, run(STEPS.x0 - 0.18, -36.08, up.t1, up.t1 + 1.7, 'out'), rest(on(-36.08), up.t1 + 1.7, KILLS.statue[3]))
    m.push(...struck(-36.08, KILLS.statue[3], 0.2))
    out.push({ path: new Path(m, 'trojan f'), from: t0, dies: KILLS.statue[3] })
  }
  // One who was up on the height already, by the brazier, when the rest came running to the statue.
  {
    const m: Move[] = [rest(on(-35.15), 114, 119.2), run(-35.15, -35.3, 119.2, 120.4, 'inout'), rest(on(-35.3), 120.4, KILLS.statue[0])]
    m.push(...struck(-35.3, KILLS.statue[0], 0.3))
    out.push({ path: new Path(m, 'trojan g'), from: 114, dies: KILLS.statue[0] })
  }
  return out
}

/** Round the gate tower's foot into the street, where the Greeks come in. */
const IN_AT = TOWER.x0 + 0.2

/** A Greek: in from the gate, to the one he kills, on through the held breath and up the steps, to the one at the statue. */
function greek(t0: number, first: { x: number; at: number } | null, second: { x: number; at: number } | null, name: string): Body {
  const m: Move[] = []
  let x = IN_AT
  let t = t0
  const close = (target: { x: number; at: number }) => {
    // He stands just behind the one he strikes (east of him) when the blow lands.
    const reach = target.x + R_T * 2 + 0.02
    if (target.x >= STREET.x0) {
      m.push(run(x, reach, t, target.at, 'none'))
    } else {
      // Up the steps first, slowly, then across the forecourt to him.
      m.push(run(x, STREET.x0 + 0.08, t, t + 0.9, 'inout'))
      const up = upSteps(t + 0.9, 0.42)
      m.push(...up.moves)
      m.push(rest(on(STEPS.x0 - 0.18), up.t1, target.at - 2.2))
      m.push(run(STEPS.x0 - 0.18, reach, target.at - 2.2, target.at, 'in'))
    }
    // The blow, and on a little after him as he falls.
    m.push(run(reach, reach - 0.2, target.at, target.at + 0.5, 'out'))
    x = reach - 0.2
    t = target.at + 0.5
  }
  if (first) close(first)
  if (second) close(second)
  m.push(rest(on(x), t, 141))
  return { path: new Path(m, name), from: t0, greek: true }
}

function greeks(): Body[] {
  return [
    greek(116.3, { x: DOOR_3 - 0.32, at: KILLS.door }, { x: -35.3, at: KILLS.statue[0] }, 'greek a'),
    greek(116.55, { x: -31.25, at: KILLS.street }, { x: -36.45, at: KILLS.statue[1] }, 'greek b'),
    greek(116.7, { x: DOOR_1 + 0.02, at: KILLS.foot }, { x: -37.3, at: KILLS.statue[2] }, 'greek c'),
    greek(117.6, null, { x: -36.08, at: KILLS.statue[3] }, 'greek d'),
  ]
}

const TROJANS = trojans()
const GREEKS = greeks()

/** Whether any of it is in the frame: the street, the steps and the forecourt by the statue. */
const IN_VIEW = (g: Paint) => !(g.view.x1 < -38 || g.view.x0 > TOWER.x0 + 0.5)

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
    const gone = p.dies === undefined ? 0 : smooth(t, p.dies + 0.25, p.dies + 1.8)
    const color = mix(alive, tone(ASH, t, { fire: 0.25 * fire }), 0.75 * gone)
    const come = smooth(t, p.from, p.from + 0.18)
    token(g, x, y, R_T * come, color, tone(TROJAN_RIM, t), p.path.spin(t, R_T))
  }
  for (const p of GREEKS) {
    if (t < p.from) continue
    const [x, y] = p.path.where(t)
    // Round the tower's foot: hidden behind it until he is past it (the tower is drawn over this).
    // Lit by his own torch: the clay warm and light, where the dead have gone dark.
    token(g, x, y, R_T, mix(tone(MAN, t, { fire: 0.85 }), MAN, 0.3), tone(MAN_RIM, t), p.path.spin(t, R_T))
    const s = 1
    g.ctx.beginPath()
    g.ctx.moveTo(x + 0.02 * s, y - R_T + 0.02)
    g.ctx.lineTo(x + 0.06 * s, y - R_T - 0.3)
    g.ctx.lineWidth = Math.max(0.75 * g.px, 0.022)
    g.ctx.strokeStyle = tone('#1A120C', t)
    g.ctx.stroke()
    flame(g.ctx, x + 0.06, y - R_T - 0.28, 0.1, 0.19, t, Math.round(p.from * 10))
  }
}

const dead = (p: Body, t: number) => p.dies !== undefined && t > p.dies
