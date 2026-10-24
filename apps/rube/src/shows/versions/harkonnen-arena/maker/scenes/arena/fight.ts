import { R } from '../../../../../../parts'
import { FEYD, FEYD_ID, FEYD_RIM, FEYD_SIZE, PRISONER, PRISONER_ID, PRISONER_RIM } from '../../cast'
import { hold, hop, Path, roll, type Ease, type Move } from '../../motion'
import { mix, smooth, type Pt } from '../../paint'
import type { Actor } from '../../show'
import { A } from './geo'
import { gateX } from './set'

/**
 * The fight, ball by ball. Feyd-Rautha comes out of the west gate; the three Atreides prisoners are shoved out of the
 * east one. He fells the first and the second on the cue's two hardest blows. The third, not drugged, goes over his dead
 * to get at him, and they fight: strokes on the notes, a ram that knocks Feyd down, a vault over him, a held breath, and
 * the kill. Every contact is two balls exactly touching on its note.
 *
 * Everyone is on the floor (y = 0), so a ball's centre is its radius above it; along x is all there is.
 */

const RF = R * FEYD_SIZE
const RP = R
/** Two balls touching, Feyd and a prisoner: centre to centre. */
const D = RF + RP

/** A run of rolls through [t, x, ease into this key] keys, on the floor; a hold where a key does not move. */
function along(keys: [number, number, Ease?][], r: number): Move[] {
  const out: Move[] = []
  for (let i = 1; i < keys.length; i++) {
    const [t0, x0] = keys[i - 1]
    const [t1, x1, ease] = keys[i]
    if (t1 - t0 < 1e-6) continue
    if (Math.abs(x1 - x0) < 1e-6) out.push(hold([x0, -r], t0, t1))
    else out.push(roll([[x0, -r], [x1, -r]], t0, t1, ease ?? 'inout'))
  }
  return out
}

/** A hop along the floor from `a` to `b` (x), from `t0` to `t1`. */
const leap = (a: number, b: number, t0: number, t1: number, r: number, g?: number): Move => hop([a, -r], [b, -r], t0, t1, g)

const [F1, F2, F3, F4, F5] = A.flurry
const [E1, E2, E3, E4] = A.exchange

/** Where the prisoners fall, each beside the last. */
export const FALLEN = [6001.0, 6000.5, 5996.7]

const P1_AT = 5999.6
/** The second prisoner comes over the first and meets the second blow here. */
const P2_HIT = 5999.52

/** Feyd-Rautha: waiting in his gate; out when it opens, to the floor's middle; the two blows, each in, and back. */
const feydMoves: Move[] = along([
  [A.in, gateX(-1)],
  [A.westGate + 0.8, gateX(-1)],
  [196.0, 5994.0],
  [197.62, 5997.2, 'out'],
  [197.74, 5997.2],
  [A.blow1, P1_AT - D, 'in'],
  [A.blow1 + 0.55, 5998.5, 'out'],
  [201.65, 5998.5],
  [A.blow2, P2_HIT - D, 'in'],
  [A.blow2 + 0.5, 5998.7, 'out'],
  [A.clash1, 5998.7],
], RF)

/**
 * The duel with the third: [t, Feyd, prisoner, ease]. A key where they are `D` apart is a stroke, on its note; between
 * them they part and close. From the ram on, Feyd's way is his own (knocked back and down, and up).
 */
const DUEL: [number, number, number, Ease?][] = [
  [A.clash1, 5998.7, 5998.7 + D],
  [A.clash1 + 0.55, 5998.0, 5999.5, 'out'],
  [207.0, 5998.1, 5998.85],
  // Five strokes in a second, by turns: he comes in, Feyd answers, and so on, each driving the other back a step.
  [F1, 5998.2, 5998.2 + D, 'in'],
  [207.63, 5997.95, 5998.62, 'out'],
  [F2, 5998.25, 5998.25 + D, 'in'],
  [207.85, 5998.05, 5998.75, 'out'],
  [F3, 5998.3, 5998.3 + D, 'in'],
  [208.06, 5998.0, 5998.7, 'out'],
  [F4, 5998.2, 5998.2 + D, 'in'],
  [208.34, 5997.95, 5998.65, 'out'],
  [F5, 5998.25, 5998.25 + D, 'in'],
  [209.3, 5997.7, 5999.0, 'out'],
  [A.part, 5997.1, 5998.9],
  [211.8, 5997.3, 5998.6],
  [212.9, 5997.6, 5998.4],
  [A.clash2, 5997.95, 5997.95 + D, 'in'],
  [213.9, 5997.3, 5998.8, 'out'],
  [215.6, 5997.6, 5998.5],
  [A.wide, 5997.85, 5997.85 + D, 'in'],
  [217.5, 5997.4, 5998.7, 'out'],
  [A.back, 5997.5, 5998.9],
  [220.6, 5997.6, 5999.2],
  [220.95, 5997.6, 5999.3],
  [A.ram, 5997.6, 5997.6 + D, 'in'],
]
const AFTER_RAM: [number, number, number, Ease?][] = [
  [A.circle, 5996.1, 5998.3],
  [226.5, 5996.7, 5998.9],
  [228.6, 5997.2, 5999.0],
  [229.9, 5997.3, 5998.6],
  // A feint: he comes in, and Feyd is not there to be hit.
  [A.feint, 5997.3, 5997.3 + D + 0.16, 'in'],
  [230.9, 5997.0, 5998.3, 'out'],
  [232.6, 5997.5, 5998.5],
  [A.clash3, 5997.8, 5997.8 + D, 'in'],
  [234.4, 5997.3, 5998.6, 'out'],
  [235.4, 5997.6, 5998.5],
  [E1, 5997.9, 5997.9 + D, 'in'],
  [236.3, 5997.7, 5998.35, 'out'],
  [E2, 5997.85, 5997.85 + D, 'in'],
  [236.9, 5997.78, 5998.2, 'out'],
  [E3, 5997.82, 5997.82 + D, 'in'],
  [237.25, 5997.72, 5998.15, 'out'],
  [E4, 5997.7, 5997.7 + D, 'in'],
  [238.6, 5997.1, 5998.6, 'out'],
  [241.5, 5997.4, 5998.9],
  [242.95, 5997.5, 5998.7],
]
const feydDuel = DUEL.map(([t, f, , e]): [number, number, Ease?] => [t, f, e])
const prisonerDuel = DUEL.map(([t, , p, e]): [number, number, Ease?] => [t, p, e])
feydMoves.push(...along(feydDuel, RF))
// Rammed: knocked back off his feet, sliding to a stop on the note, still; and up again on the next.
const RAM_X = DUEL[DUEL.length - 1][1]
feydMoves.push(
  leap(RAM_X, RAM_X - 1.1, A.ram, A.ram + 0.39, RF),
  ...along([[A.ram + 0.39, RAM_X - 1.1], [A.down, RAM_X - 1.7, 'out'], [A.up - 0.4, RAM_X - 1.7]], RF),
  leap(RAM_X - 1.7, RAM_X - 1.5, A.up - 0.4, A.up, RF),
  ...along([[A.up, RAM_X - 1.5], [A.circle, 5996.1, 'inout']], RF),
  ...along(AFTER_RAM.map(([t, f, , e]): [number, number, Ease?] => [t, f, e]), RF),
)
// The vault: as the prisoner lunges, Feyd goes up and over him, and comes down on his other side.
const VAULT_TO = 5999.4
feydMoves.push(
  leap(5997.5, VAULT_TO, 242.95, A.lunge + 0.13, RF, 11),
  ...along([
    [A.lunge + 0.13, VAULT_TO],
    [A.lunge + 0.8, VAULT_TO - 0.15, 'out'],
    [246.2, 5999.2],
    [249.85, 5999.1],
  ], RF),
)
// The kill, after the held breath: in, the strike, and back a step over him.
const P3_LAST = 5997.8
feydMoves.push(...along([[249.85, 5999.1], [A.kill, P3_LAST + D, 'in'], [A.kill + 0.7, 5998.5, 'out'], [A.out, 5998.5]], RF))

/** The prisoners, waiting in the east gate behind its door, shoved out in turn. */
const P1: Move[] = along([
  [A.in, gateX(1) - 0.45],
  [A.shoved[0], gateX(1) - 0.45],
  [197.5, P1_AT, 'out'],
  [A.blow1, P1_AT],
], RP)
P1.push(leap(P1_AT, FALLEN[0] - 0.25, A.blow1, A.blow1 + 0.42, RP), ...along([[A.blow1 + 0.42, FALLEN[0] - 0.25], [A.blow1 + 1.0, FALLEN[0], 'out'], [A.out, FALLEN[0]]], RP))

const P2: Move[] = along([
  [A.in, gateX(1)],
  [A.shoved[1], gateX(1)],
  [197.6, 6001.9, 'out'],
  [A.blow1, 6001.9],
  // He flinches from the first blow; then comes on, over the fallen man.
  [A.blow1 + 0.6, 6002.3, 'out'],
  [200.9, 6002.3],
], RP)
P2.push(
  leap(6002.3, 6000.2, 200.9, 201.5, RP),
  ...along([[201.5, 6000.2], [A.blow2, P2_HIT, 'in']], RP),
  leap(P2_HIT, FALLEN[1] - 0.05, A.blow2, A.blow2 + 0.38, RP),
  ...along([[A.blow2 + 0.38, FALLEN[1] - 0.05], [A.blow2 + 0.9, FALLEN[1], 'out'], [A.out, FALLEN[1]]], RP),
)

const P3: Move[] = along([
  [A.in, gateX(1) + 0.45],
  [A.shoved[2], gateX(1) + 0.45],
  [197.7, 6004.4, 'out'],
  [A.advance, 6004.4],
  [204.45, 6002.0, 'in'],
], RP)
// Over his dead, and onto Feyd.
P3.push(leap(6002.0, 5998.7 + D, 204.45, A.clash1, RP))
P3.push(...along(prisonerDuel, RP))
P3.push(
  ...along([
    [A.ram, DUEL[DUEL.length - 1][2]],
    [A.ram + 0.75, 5998.3, 'out'],
    [A.circle, 5998.3],
  ], RP),
  ...along(AFTER_RAM.map(([t, , p, e]): [number, number, Ease?] => [t, p, e]), RP),
  // The lunge at where Feyd was, as he goes over.
  ...along([
    [242.95, 5998.7],
    [A.lunge, 5997.6, 'in'],
    [A.lunge + 0.55, 5997.2, 'out'],
    [246.0, 5997.6],
    [249.85, P3_LAST],
    [A.kill, P3_LAST],
  ], RP),
  // Struck, he goes back along the sand and stops, the colour going out of him: a slide, not a fall, so it reads from
  // the rim as well as from the floor.
  ...along([[A.kill, P3_LAST], [A.kill + 1.0, FALLEN[2], 'out'], [A.out, FALLEN[2]]], RP),
)

/** The colour going out of a prisoner from the blow that fells him. */
const DEAD = '#2C2F31'
const fading = (at: number) => (t: number) => mix(PRISONER, DEAD, smooth(t, at + 0.05, at + 1.1))

const on = (t: number) => t >= A.in && t < A.out

export const FEYD_PATH = new Path(feydMoves, 'feyd', FEYD_SIZE)
export const PRISONER_PATHS = [new Path(P1, 'prisoner 1'), new Path(P2, 'prisoner 2'), new Path(P3, 'prisoner 3')]
const DEATHS = [A.blow1, A.blow2, A.kill]

export const FIGHTERS: Actor[] = [
  // Feyd faces east, toward them, from the first.
  { id: FEYD_ID, color: FEYD, rim: FEYD_RIM, size: FEYD_SIZE, path: FEYD_PATH, on, turn: 0 },
  ...PRISONER_PATHS.map((path, i): Actor => ({
    id: PRISONER_ID + i,
    color: PRISONER,
    rim: PRISONER_RIM,
    size: 1,
    path,
    on,
    colorAt: fading(DEATHS[i]),
    turn: Math.PI + [0.3, -0.4, 0.1][i],
  })),
]

/** Feyd's knife: out on the three kills, toward the man it kills, and back. [at, direction]. */
export const KNIFE: [number, 1 | -1][] = [[A.blow1, 1], [A.blow2, 1], [A.kill, -1]]

/** Where Feyd is at `t`, and the pair's middle (him and the third), for the camera. */
export const feydAt = (t: number): Pt => FEYD_PATH.where(t)
export const pairAt = (t: number): Pt => {
  const [fx, fy] = FEYD_PATH.where(t)
  const [px, py] = PRISONER_PATHS[2].where(t)
  return [(fx + px) / 2, (fy + py) / 2]
}

/** The pair's middle along the floor, at the floor's height: what the camera keeps, so it does not bob with a leap. */
export const pairLine = (t: number): Pt => [pairAt(t)[0], -0.14]

/** Every contact the fight turns on, by name, for the checks. */
export const FIGHT_STRIKES: [string, number][] = [
  ['the first blow', A.blow1],
  ['the second blow', A.blow2],
  ['he comes over his dead', A.clash1],
  ...A.flurry.map((t, i): [string, number] => [`stroke ${i + 1}`, t]),
  ['they clash', A.clash2],
  ['they clash again', A.wide],
  ['the ram', A.ram],
  ['down', A.down],
  ['up', A.up],
  ['the feint', A.feint],
  ['they clash again', A.clash3],
  ...A.exchange.map((t, i): [string, number] => [`exchange ${i + 1}`, t]),
  ['the lunge, and the vault', A.lunge],
  ['the kill', A.kill],
]

