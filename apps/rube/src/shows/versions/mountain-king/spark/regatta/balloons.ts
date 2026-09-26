import type { Pt, Seg } from '../../../../../parts'
import { heat } from '../fx'
import { box, part, type PartShot } from '../kit'
import { drawBalloon, type Look, type Moment } from './balloons-draw'
import { drawFan, drawTether } from './balloons-ground'
import {
  AT,
  B,
  BAGS,
  BLASTS,
  BURNER_POINT,
  EXIT,
  GROUND,
  LIT,
  N0,
  POPS,
  T0,
  T1,
  TETHER1,
  dusk,
  fill1,
  n1,
  n2,
  n3,
  n4,
  roarOf,
  sparkAt,
  swellOf,
  theta1,
  ventOf,
  warmth,
  type Balloon,
  type Blast,
} from './balloons-plan'
import { drawFar, drawLand, drawSky, drawTiny } from './balloons-sky'

/**
 * BALLOONS: the regatta at sunset (phrases 9 to 11, `DOORS.regatta` to `DOORS.railway`). The machine and its clock
 * are in `balloons-plan.ts`; the balloons are drawn by `balloons-draw.ts`, the meadow's fan and tethers by
 * `balloons-ground.ts`, the sky, the land and the far balloons by `balloons-sky.ts`.
 *
 * Out of the burner of a tethered balloon on a launch meadow, the spark rides the breeze down onto the pilot arm of
 * the balloon lying next to it, filling on the grass from its fan. Its burner roars into the mouth, the envelope
 * heaves up off the grass and stands, the spark riding the burner round on its gimbal; the big blast takes the spark
 * up the jet and into it, the tether's pin pops and it lifts off. Then the same machine, faster each time, up a
 * stair of balloons into the sky: the spark rides the hot air up inside each envelope (a glow going up through the
 * silk), the parachute vent at the crown pops it out, and it floats up to the next balloon's pilot arm, whose burner
 * roars on the landing. At the top it stays on the highest balloon's pilot while the whole regatta rises into the
 * sunset (the wide shot, every burner roaring at once on the glow), and the great blast on the fortissimo sucks it
 * up into the flame: the door to the night express.
 */

/** The strikes (show seconds): every landing, roar, heave, pop and ballast drop, on the tracked beat. */
export const BALLOON_HITS: number[] = Object.values(AT).sort((a, b) => a - b)

/**
 * Where a lit burner is on the way home (148.330 to 148.404): the highest balloon's, which the spark went into, its
 * flame alight again then. World cells: the middle of its jet.
 */
export const BURNER_AT: Pt = BURNER_POINT

interface BalloonsState {
  begin: number
}

/** The spark inside a balloon on its ride up, for the glow through the silk. */
function inside(t: number, whoosh: number, pop: number): Pt | null {
  if (t <= whoosh || t >= pop) return null
  const here = sparkAt(t)
  return here.hidden ? here.p : null
}

function moment(t: number, m: Omit<Moment, 't' | 'seed' | 'sparkHeat'>, seed: number): Moment {
  return { t, seed, sparkHeat: heat(t), ...m }
}

/** The lane: the spark's path sampled, and cut into straight pieces wherever a straight piece is true to it. */
function lane(): { segs: Seg[]; end: Pt } {
  const step = 0.005
  const times: number[] = []
  for (let t = T0; t < T1 - 1e-9; t += step) times.push(t)
  times.push(T1)
  for (const s of Object.values(AT)) if (s > T0 && s < T1) times.push(s)
  times.sort((a, b) => a - b)
  const ts = times.filter((t, i) => i === 0 || t - times[i - 1] > 1e-7)
  const hits = new Set(Object.values(AT).filter((s) => s > T0 && s < T1))
  const at = ts.map((t) => sparkAt(t))
  // Whether the spark is out of sight between sample i and i + 1 (read at the middle).
  const gone = ts.slice(0, -1).map((t, i) => sparkAt((t + ts[i + 1]) / 2).hidden)
  const fits = (i: number, j: number): boolean => {
    const [ax, ay] = at[i].p
    const [bx, by] = at[j].p
    for (let m = i + 1; m < j; m++) {
      const u = (ts[m] - ts[i]) / (ts[j] - ts[i])
      if (Math.hypot(at[m].p[0] - (ax + (bx - ax) * u), at[m].p[1] - (ay + (by - ay) * u)) > 0.003) return false
    }
    return true
  }
  const segs: Seg[] = []
  let i = 0
  while (i < ts.length - 1) {
    let j = i + 1
    while (j + 1 < ts.length && !hits.has(ts[j]) && gone[j] === gone[i] && ts[j + 1] - ts[i] <= 0.3 && fits(i, j + 1)) j++
    const seg: Seg = { from: at[i].p, to: at[j].p, dur: ts[j] - ts[i] }
    if (gone[i]) seg.hidden = true
    segs.push(seg)
    i = j
  }
  return { segs, end: at[at.length - 1].p }
}

export const balloons = part<BalloonsState>(
  {
    name: 'balloons',
    draw: (p, _s, c) => {
      const t = T0 + c.t
      const { k, weight } = c
      const look: Look = { k, weight }
      const f = drawSky(p, k, t)
      drawLand(p, k, f, t)
      drawTiny(p, look, f, t)
      drawFar(p, look, f, t)
      const hero: Look = { k, weight, simple: k < 14, dusk: 0.55 * dusk(t) }

      // The meadow: B0 tethered, B1 tethered and lying, the fan.
      drawTether(p, hero, N0, 2.4, t, null)
      drawBalloon(p, hero, B.b0, moment(t, { pose: { n: N0, a: 0, fill: 1, vent: 0 }, roar: roarOf(BLASTS.b0, t), warm: warmth(BLASTS.b0, t, T0 - 5), pilot: true, spark: null, bags: null }, 1.3))
      const a1 = theta1(t)
      const n1t = n1(t)
      drawTether(p, hero, n1t, 2.2, t, TETHER1)
      drawBalloon(
        p,
        hero,
        B.b1,
        moment(
          t,
          {
            pose: { n: n1t, a: a1, fill: fill1(t), ground: GROUND, vent: ventOf(POPS.b1, t), sag: 1.25 * Math.max(0, Math.sin(a1)), H: B.b1.H },
            roar: roarOf(BLASTS.b1, t),
            warm: warmth(BLASTS.b1, t, LIT.b1),
            pilot: t > AT.whoosh1 + 0.15,
            spark: inside(t, AT.whoosh1, AT.pop1),
            bags: null,
          },
          2.1,
        ),
      )
      drawFan(p, hero, t)

      // The stair of balloons above.
      const aloft = (b: Balloon, n: Pt, blasts: Blast[], lit: number, whoosh: number, pop: number | null, bags: number | null, seed: number) => {
        const warm = warmth(blasts, t, lit)
        drawBalloon(
          p,
          hero,
          b,
          moment(
            t,
            {
              pose: { n, a: 0, fill: 0.97 + 0.025 * Math.min(1, warm) + swellOf(blasts, t), vent: pop === null ? 0 : ventOf(pop, t) },
              roar: roarOf(blasts, t),
              warm,
              pilot: t > whoosh + 0.15,
              spark: pop === null ? null : inside(t, whoosh, pop),
              bags,
            },
            seed,
          ),
        )
      }
      aloft(B.b2, n2(t), BLASTS.b2, LIT.b2, AT.whoosh2, POPS.b2, BAGS.b2, 3.7)
      aloft(B.b3, n3(t), BLASTS.b3, LIT.b3, AT.whoosh3, POPS.b3, BAGS.b3, 5.9)
      aloft(B.b4, n4(t), BLASTS.b4, LIT.b4, T1, null, BAGS.b4, 8.2)
    },
  },
  (slot) => {
    const { segs, end } = lane()
    // The lane is the regatta's clock, laid on the slot the score gives (the doors' own times, so they agree).
    const span = slot.end - slot.begin
    const have = segs.reduce((s, x) => s + x.dur, 0)
    if (Math.abs(have - span) > 1e-9) segs[segs.length - 1].dur += span - have
    return {
      // Everything the camera may look at: the meadow, the stair of balloons, the sky round them, the flame on the way home.
      cells: box(-14, -100, 36, 8, 2),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: AT.land1 - T0 },
      state: { begin: slot.begin },
    }
  },
  (): PartShot[] => [
    // Out of the fire: pull back to the burner, the breeze, the balloon lying on the grass.
    { t: T0 + 0.55, cells: 3.6 },
    { t: T0 + 1.3, cells: 6.6, hold: [3.6, 0.4], w: 0.5 },
    { t: AT.land1, cells: 9, hold: [7.1, 0.1], w: 0.6 },
    // The stand-up, whole: the envelope swings up off the meadow.
    { t: AT.heave2, cells: 13.5, hold: [9.6, -2.6], w: 0.8 },
    { t: AT.upright, cells: 17.5, hold: [8.0, -4.8], w: 0.88 },
    { t: AT.blast1, cells: 16.5, hold: [7.7, -4.0], w: 0.85 },
    // In on its burner for the big blast: the spark goes up the jet, the tether lets go, it lifts.
    { t: AT.whoosh1 - 0.08, cells: 11.5, hold: [7.0, -3.4], w: 0.7 },
    // Up inside it with the glow, and out of the top to the next.
    { t: AT.whoosh1 + 0.55, cells: 12, off: [0, -1.2] },
    { t: AT.whoosh1 + 1.15, cells: 14, off: [0.2, -0.8] },
    { t: AT.pop1, cells: 13, off: [0.6, -1.4] },
    { t: AT.land2, cells: 11, off: [0.3, -0.6] },
    // While it sits on the pilot, the frame keeps drifting up toward where it is going.
    { t: AT.whoosh2, cells: 11.6, off: [0.3, -0.7] },
    { t: AT.flare2, cells: 13, off: [0.4, -1.2] },
    { t: AT.land3, cells: 11.5, off: [0.4, -0.6] },
    { t: AT.whoosh3, cells: 12, off: [0.4, -0.7] },
    { t: AT.flare3, cells: 13.5, off: [0.4, -1.2] },
    { t: AT.pop3, cells: 15, off: [0.6, -1.8] },
    // The last float, and the camera goes wide: the whole regatta rising into the sunset, the spark on the highest.
    { t: AT.pop3 + 0.9, cells: 21, off: [0.3, -0.6] },
    { t: AT.land4, cells: 29, off: [0.4, 1.4] },
    { t: AT.groupB, cells: 39, off: [0.6, 2.2] },
    { t: AT.glow, cells: 44, off: [0.7, 2.0] },
    // In on the top burner for the fortissimo, and into its flame.
    { t: AT.glow + 0.75, cells: 38, off: [0.6, 1.2] },
    { t: AT.blast4, cells: 15, off: [0.3, 0.2] },
    { t: T1 - 0.45, cells: 5.4 },
    { t: T1, cells: 2.4, hold: EXIT, w: 1 },
  ],
)
