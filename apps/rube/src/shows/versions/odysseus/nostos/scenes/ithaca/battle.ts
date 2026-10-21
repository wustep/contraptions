import { PENELOPE_SIZE, SUITOR_SIZE, TELEMACHUS_SIZE } from '../../cast'
import { fly, flightFor, ramp, rest, roll, type Move, type Pt } from '../../path'
import { DAIS, HALL, R, STAIRS, TRIAL } from './geo'
import { stepAt } from './palace'

/**
 * The reckoning in the hall, on the last swell. The bow's note is how they all know him. They are on their feet at
 * once; Antinous goes for the son in the doorway, three of them after him, and the rest draw together where they are.
 * The arrow takes Antinous in the air. Then, where the old telling has the rest give in, they come at him, all of
 * them, and the hall is a battle, a blow on each of the music's notes:
 *
 * - 503.15   they charge: five at him by the west door, three at the son, who goes up the stairs to stand between
 *            them and his mother.
 * - 504.26, 504.66   the first two reach him, and he throws them back over the bow onto the dais.
 * - 505.83   one of the three gets up onto the stairs at the son and drives him up a step.
 * - 506.68, 507.30, 507.79   he goes east down the hall through the other three, one on each note; the last leaps at
 *            him, and he goes under him and throws him over.
 * - 508.96   the swell's hardest attack: he reaches the two at the stairs' foot and the son comes down at the one on
 *            the stairs, the same blow, and all three go out of the house through the east door into the courtyard.
 * - 509.39   the rest, who never fought, have drawn together on the dais among the dead. The son comes down to his
 *            father; Penelope comes down the stairs a step a note, and steps off onto the floor beside him on the
 *            swell's last attack (512.68).
 *
 * The suitors are balls, as he is, so a blow is a collision: whoever he runs into is thrown on the way he was going,
 * lands, rolls, and lies still, and the colour goes out of him. No weapon but the bow, no blood.
 */

export const FIGHT = {
  sing: TRIAL.sing,
  loose: TRIAL.loose,
  strike: TRIAL.strike,
  charge: TRIAL.erupts,
  /** He throws the first two back at the west end. */
  first: [504.26, 504.66],
  /** One of the three gets up onto the stairs and drives the son up a step. */
  sonHit: 505.83,
  /** Down the hall through three, one on each note. */
  rampage: [506.68, 507.3, 507.79],
  /** The three at the stairs' foot thrown out of the house. */
  last: 508.96,
  /** Penelope's steps down, and onto the floor beside him. */
  down: [509.39, 509.99, 510.79, 511.4, 511.95],
  meet: TRIAL.meet,
} as const

const FLOOR = HALL.floor
const RS = R * SUITOR_SIZE
/** A suitor's centre on the hall's floor, and on the dais. */
export const SY = FLOOR - RS
export const DY = DAIS.top - RS
const HY = FLOOR - R
const RT = R * TELEMACHUS_SIZE
const TY = FLOOR - RT
const RP = R * PENELOPE_SIZE

const at = (x: number, y = SY): Pt => [x, y]

/** A step of the stairs for a ball of radius r (`stepAt` is for the hero's). */
const stepFor = (i: number, r: number): Pt => {
  const p = stepAt(i)
  return [p[0], p[1] + R - r]
}

/** A hop from `a` that lands at `b` exactly at `t`, peaking `lift` over the higher end. */
const hopTo = (a: Pt, b: Pt, t: number, lift = 0.12): Move => fly(a, b, t - flightFor(a, b, lift), t)

/** Thrown at `t` from `a` to `land` (peaking `lift` over the higher), a short roll on the way it went, and still. */
function thrown(a: Pt, land: Pt, t: number, lift: number, roll0 = 0.14): { moves: Move[]; down: number } {
  const T = flightFor(a, land, lift)
  const dir = Math.sign(land[0] - a[0]) || 1
  const lie: Pt = [land[0] + dir * roll0, land[1]]
  return {
    moves: [fly(a, land, t, t + T), roll([land, lie], t + T, t + T + 0.4, 'out'), rest(lie, t + T + 0.4, 560)],
    down: t + T,
  }
}

/* ------------------------------------------------------------------ the hero */

/** The hero's moves from the floor by the west door, after the loose, to the moment she reaches him. */
export function heroFight(byDoor: Pt): Move[] {
  const m: Move[] = []
  const x = (v: number): Pt => [v, HY]
  // Out to meet the first two, a recoil off each.
  m.push(roll([byDoor, x(826.3)], FIGHT.charge + 0.4, FIGHT.first[0], 'in'))
  m.push(roll([x(826.3), x(826.42)], FIGHT.first[0], 504.45, 'out'))
  m.push(roll([x(826.42), x(826.3)], 504.45, FIGHT.first[1], 'in'))
  m.push(roll([x(826.3), x(826.48)], FIGHT.first[1], 505.0, 'out'))
  m.push(rest(x(826.48), 505.0, 506.1))
  // Then east, down the whole hall, through the three, to the stairs' foot.
  // Each blow checks him, and he drives on harder from it.
  m.push(roll([x(826.48), x(825.65)], 506.1, FIGHT.rampage[0], 'in'))
  m.push(drive(x(825.65), x(824.55), FIGHT.rampage[0], FIGHT.rampage[1]))
  m.push(drive(x(824.55), x(823.45), FIGHT.rampage[1], FIGHT.rampage[2]))
  m.push(drive(x(823.45), x(HERO_LAST), FIGHT.rampage[2], FIGHT.last))
  m.push(roll([x(HERO_LAST), x(820.4)], FIGHT.last, 509.3, 'out'))
  m.push(rest(x(820.4), 509.3, 512.2))
  // To her as she steps down.
  m.push(roll([x(820.4), x(HERO_MEET)], 512.2, FIGHT.meet, 'inout'))
  return m
}

/** From `a` to `b` in exactly `t0` to `t1`, from a fifth of the mean pace (just checked by a blow) up to nearly twice it. */
function drive(a: Pt, b: Pt, t0: number, t1: number): Move {
  const mean = Math.hypot(b[0] - a[0], b[1] - a[1]) / (t1 - t0)
  return ramp([a, b], t0, 0.4 * mean, 1.6 * mean)
}

/** Where he is when the last blow lands, and where he stands with her. */
const HERO_LAST = 820.24
export const HERO_MEET = 820.155

/* ------------------------------------------------------------------ the son */

/** The son's moves from the doorway, where Antinous fell at his feet, to beside his parents. */
export function sonFight(doorway: Pt): { moves: Move[]; end: Pt } {
  const m: Move[] = []
  const over: Pt = [818.95, TY]
  const foot: Pt = [STAIRS.x0 - 0.2, TY]
  m.push(rest(doorway, 453.6, 503.3))
  // Over the dead man, to the stairs, and up two steps: between them and his mother.
  m.push(fly(doorway, over, 503.3, 503.3 + flightFor(doorway, over, 0.3)))
  const t1 = 503.3 + flightFor(doorway, over, 0.3)
  m.push(roll([over, foot], t1, 503.95, 'inout'))
  const s0 = stepFor(0, RT)
  const s1 = stepFor(1, RT)
  const s2 = stepFor(2, RT)
  m.push(rest(foot, 503.95, FIGHT.first[0] - flightFor(foot, s0, 0.1)))
  m.push(hopTo(foot, s0, FIGHT.first[0], 0.1))
  m.push(rest(s0, FIGHT.first[0], FIGHT.first[1] - flightFor(s0, s1, 0.1)))
  m.push(hopTo(s0, s1, FIGHT.first[1], 0.1))
  // Driven up a step when one of them gets up onto the stairs at him; down at him again on the note his father strikes.
  m.push(rest(s1, FIGHT.first[1], FIGHT.sonHit))
  const up = flightFor(s1, s2, 0.08)
  m.push(fly(s1, s2, FIGHT.sonHit, FIGHT.sonHit + up))
  m.push(rest(s2, FIGHT.sonHit + up, FIGHT.last - flightFor(s2, s1, 0.12)))
  m.push(hopTo(s2, s1, FIGHT.last, 0.12))
  // Down to the floor beside his father when it is over, and in close with them as she comes to him.
  const beside: Pt = [SON_BESIDE, TY]
  m.push(rest(s1, FIGHT.last, FIGHT.down[0] - flightFor(s1, beside, 0.1)))
  m.push(hopTo(s1, beside, FIGHT.down[0], 0.1))
  const end: Pt = [HERO_MEET + R + RT, TY]
  m.push(rest(beside, FIGHT.down[0], 512.2))
  m.push(roll([beside, end], 512.2, FIGHT.meet, 'inout'))
  return { moves: m, end }
}

const SON_BESIDE = 820.4 + R + RT

/* ------------------------------------------------------------------ Penelope */

/** Penelope from the stairs' head, where she has watched it all, down a step a note, and off onto the floor by him. */
export function penelopeDown(head: Pt): { moves: Move[]; end: Pt } {
  const m: Move[] = []
  const steps = [4, 3, 2, 1, 0].map((i) => stepFor(i, RP))
  const times = FIGHT.down
  let from = head
  let t = 503.95
  steps.forEach((s, k) => {
    const T = flightFor(from, s, 0.06)
    m.push(rest(from, t, times[k] - T))
    m.push(fly(from, s, times[k] - T, times[k]))
    from = s
    t = times[k]
  })
  // Off the lowest step onto the floor, forward, beside him.
  const end: Pt = [HERO_MEET - R - RP, FLOOR - RP]
  m.push(rest(from, t, FIGHT.meet - flightFor(from, end, 0.05)))
  m.push(hopTo(from, end, FIGHT.meet, 0.05))
  return { moves: m, end }
}

/* ------------------------------------------------------------------ the suitors */

/** What becomes of each suitor once the bow has sung: thrown and dead (and when he lands), or among those who give in. */
export interface Fate {
  moves: Move[]
  /** When he comes down dead, if he does. */
  dies?: number
}

/** How each suitor stands at the bow's note: his place, and whether it is on the dais. */
export interface Start {
  p: Pt
  i: number
}

/** On their feet at once, all of them, a jolt where each stands, a little apart in time. */
const JOLT = [0.0, 0.06, 0.12, 0.03, 0.09, 0.15, 0, 0.04, 0.1, 0.13, 0.02, 0.08, 0.11]
function jolt(p: Pt, i: number): { moves: Move[]; t: number } {
  const t0 = FIGHT.sing + JOLT[i]
  const T = 0.2
  return { moves: [rest(p, FIGHT.sing - 0.0001, t0), fly(p, p, t0, t0 + T)], t: t0 + T }
}

/** A suitor from his place at the bow's note to the end. `i` is his index (0–5 the dais, 7–12 the floor; 6 is Antinous). */
export function suitorFight(i: number, p: Pt): Fate {
  const { moves: m, t: t0 } = jolt(p, i)
  const wait = (until: number) => {
    const t = m[m.length - 1].t1
    if (until > t + 1e-9) m.push(rest(last(m), t, until))
  }
  const go = (to: Pt, a: number, b: number, ease: 'inout' | 'in' | 'out' | 'none' = 'inout') => {
    wait(a)
    m.push(roll([last(m), to], a, b, ease))
  }
  const down = (to: Pt, t: number, lift = 0.1) => {
    const a = last(m)
    const T = flightFor(a, to, lift)
    wait(t - T)
    m.push(fly(a, to, t - T, t))
  }
  const hit = (land: Pt, t: number, lift: number, roll0?: number): Fate => {
    const th = thrown(last(m), land, t, lift, roll0)
    m.push(...th.moves)
    return { moves: m, dies: th.down }
  }
  wait(t0)
  switch (i) {
    // The five at him, by the west door. 12, 11 and 10 stand on the floor at the dais's west end; 2 and 1 come down off it.
    case 12: {
      wait(FIGHT.charge)
      go(at(826.05), FIGHT.charge, FIGHT.first[0], 'in')
      return hit(at(825.25, DY), FIGHT.first[0], 0.75)
    }
    case 11: {
      go(at(824.9), 497.2, 498.4)
      wait(FIGHT.charge + 0.1)
      go(at(826.05), FIGHT.charge + 0.1, FIGHT.first[1], 'in')
      return hit(at(824.95, DY), FIGHT.first[1], 0.9)
    }
    case 10: {
      go(at(824.55), 497.5, 498.6)
      wait(FIGHT.charge + 0.2)
      go(at(825.55), FIGHT.charge + 0.2, 504.55, 'in')
      // He falters when the two go back over the bow, and gives ground; the hero comes on.
      go(at(825.15), 504.75, 505.6, 'inout')
      wait(506.3)
      go(at(825.4), 506.3, FIGHT.rampage[0], 'inout')
      return hit(at(824.55, DY), FIGHT.rampage[0], 0.55)
    }
    case 2: {
      down(at(824.2), 498.9)
      wait(FIGHT.charge + 0.3)
      go(at(824.95), FIGHT.charge + 0.3, 504.7, 'in')
      go(at(824.6), 504.9, 505.9, 'inout')
      wait(506.7)
      go(at(824.3), 506.7, FIGHT.rampage[1], 'inout')
      return hit(at(823.15, DY), FIGHT.rampage[1], 0.6, 0.02)
    }
    case 1: {
      down(at(823.95), 499.3)
      wait(FIGHT.charge + 0.35)
      go(at(824.55), FIGHT.charge + 0.35, 504.8, 'in')
      go(at(822.8), 505.0, 507.2, 'inout')
      // He turns and leaps at him; the hero goes under, and he goes on over him and down behind.
      go(at(823.2), 507.2, FIGHT.rampage[2], 'in')
      return hit(at(824.6), FIGHT.rampage[2], 0.85, 0.2)
    }
    // The three who go after Antinous, and stop short when the arrow takes him; then at the son on the stairs. 7 gets up
    // onto them at him; 8 and 0 come round to their foot. On the last blow all three go out of the door.
    case 7: {
      go(at(821.25), 499.9, 501.9, 'inout')
      go(at(820.6), FIGHT.charge + 0.15, 504.6, 'inout')
      const s1 = stepFor(1, RS)
      down(s1, FIGHT.sonHit, 0.08)
      wait(FIGHT.last)
      return hit(at(817.1), FIGHT.last, 0.1, 0.18)
    }
    case 8: {
      go(at(821.6), 499.5, 501.9, 'inout')
      go(at(820.95), FIGHT.charge + 0.3, 504.9, 'inout')
      go(at(819.72), 506.0, 507.6, 'inout')
      wait(FIGHT.last + 0.04)
      return hit(at(817.45), FIGHT.last + 0.04, 0.72, 0.16)
    }
    case 0: {
      down(at(822.6), 500.4)
      go(at(821.95), 500.45, 501.9, 'inout')
      go(at(821.3), FIGHT.charge + 0.45, 505.0, 'inout')
      go(at(819.99), 506.1, 507.9, 'inout')
      wait(FIGHT.last)
      return hit(at(817.8), FIGHT.last, 0.48, 0.14)
    }
    // Those who never fight: they draw together on the dais, and stay there among the dead.
    case 3: {
      go(at(823.55, DY), 499.0, 500.2)
      break
    }
    case 4: {
      go(at(823.85, DY), 498.4, 499.6)
      break
    }
    case 5: {
      go(at(824.15, DY), 497.6, 499.0)
      break
    }
    case 9: {
      go(at(822.95), 499.9, 501.0)
      down(at(822.85, DY), 501.35, 0.12)
      break
    }
  }
  // Each flinches as the last blow lands, and is still.
  const here = last(m)
  wait(FIGHT.last + 0.05)
  m.push(roll([here, [here[0] + 0.04, here[1]], here], FIGHT.last + 0.05, FIGHT.last + 0.6, 'inout'))
  m.push(rest(here, FIGHT.last + 0.6, 560))
  return { moves: m }
}

const last = (m: Move[]): Pt => {
  const mv = m[m.length - 1]
  return mv.at(mv.t1)
}
