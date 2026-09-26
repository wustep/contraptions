import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { heat } from '../fx'
import { box, part, type PartShot } from '../kit'
import { drawBalloon, drawBasket, drawBurner, drawEnvelope, drawJet, drawPilot, drawSandbag, drawWires, type Look, type Moment } from './balloons-draw'
import { drawFan, drawTether } from './balloons-ground'
import {
  add,
  ANAT,
  AT,
  B,
  BACK,
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

/* ------------------------------------------------------------------ the top balloon's climb */

/**
 * The crescendo's two strikes on the top balloon (B4), 97.063 and 99.322: each is a roar of its burner that shoves
 * the whole balloon up a step. A critically damped step: no way on it at the strike, the shove at once, most of the
 * climb in the first half second, then a long ease into the new height. Added on top of the regatta's own climb.
 */
const STEPS = [
  { at: AT.land4, d: 3.6 },
  { at: AT.glow, d: 3.8 },
] as const
const STEP_TAU = 0.28
function lift4(t: number): number {
  let y = 0
  for (const s of STEPS) {
    const u = (t - s.at) / STEP_TAU
    if (u > 0) y += s.d * (1 - (1 + u) * Math.exp(-u))
  }
  return y
}
const up4 = (t: number): Pt => [0, -lift4(t)]
/** B4's nozzle with its stepped climb. */
const n4s = (t: number): Pt => add(n4(t), up4(t))

/** The spark, with the top balloon's steps once it is on it (the step is still at the landing, so it joins smoothly). */
function sparkHere(t: number): { p: Pt; hidden: boolean } {
  const s = sparkAt(t)
  return t > AT.land4 ? { p: add(s.p, up4(t)), hidden: s.hidden } : s
}

/**
 * B4's burner: louder, longer roars on the two strikes (a tall blue jet), the fortissimo's great blast into the door,
 * and alight again for the return.
 */
const B4_BLASTS = [
  { on: AT.land4, off: AT.land4 + 0.7, i: 1.5 },
  { on: AT.glow, off: AT.glow + 0.75, i: 1.55 },
  ...BLASTS.b4.filter((b) => b.on >= AT.blast4 - 1e-6),
]
/** The blue flash of a strike's roar: sharp on, long off. */
function flash4(t: number): number {
  let v = 0
  for (const s of STEPS) {
    const u = t - s.at
    if (u < 0 || u > 3) continue
    v = Math.max(v, Math.min(1, u / 0.035) * Math.exp(-u / 0.42))
  }
  return v
}

/** The light of a strike's roar round the burner: a tall soft blue, the shape of the jet, never a disc. */
function drawBlue(p: p5, k: number, n: Pt, f: number): void {
  if (f < 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const L = 3.2
  ctx.save()
  ctx.translate(n[0] * k, (n[1] - 1.3) * k)
  ctx.scale(0.42, 1)
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L * k)
  g.addColorStop(0, `rgba(120, 185, 255, ${0.55 * f})`)
  g.addColorStop(0.45, `rgba(95, 169, 238, ${0.22 * f})`)
  g.addColorStop(1, 'rgba(95, 169, 238, 0)')
  ctx.fillStyle = g
  ctx.fillRect(-L * k, -L * k, 2 * L * k, 2 * L * k)
  ctx.restore()
}

/** B4's ballast: a big sack each side, hung off the rim; the pair let go on 97.822, a few hundredths apart. */
const SACK = 1.9
function drawSacks(p: p5, look: Look, n: Pt, t: number, drop: number): void {
  for (const side of [-1, 1] as const) {
    const hook: Pt = [n[0] + side * (ANAT.rimW + 0.02), n[1] + ANAT.rimY + 0.02]
    p.push()
    p.translate(hook[0] * look.k, hook[1] * look.k)
    p.scale(SACK)
    p.translate(-hook[0] * look.k, -hook[1] * look.k)
    drawSandbag(p, { ...look, weight: look.weight / SACK }, n, side, t, side < 0 ? drop : drop + 0.06)
    p.pop()
  }
}

/** The top balloon, drawn here (not by `drawBalloon`) for its blue roars and its big sacks. */
function drawTop(p: p5, look: Look, t: number): void {
  const { k } = look
  const n = n4s(t)
  const warm = warmth(B4_BLASTS, t, LIT.b4)
  const roar = roarOf(B4_BLASTS, t)
  // The spark sits on the pilot arm from its landing to the door; after that the pilot's own small flame shows.
  const pilot = t > T1 + 0.15
  drawBasket(p, look, n)
  p.push()
  p.translate(n[0] * k, n[1] * k)
  drawWires(p, look, 1)
  drawJet(p, k, t, roar, 8.2)
  drawBurner(p, look, roar)
  if (pilot) drawPilot(p, k, t, 8.2)
  p.pop()
  drawEnvelope(p, look, B.b4, { n, a: 0, fill: 0.97 + 0.025 * Math.min(1, warm) + swellOf(B4_BLASTS, t), vent: 0 }, warm, null, heat(t))
  drawBlue(p, k, n, flash4(t))
  drawSacks(p, look, n, t, BAGS.b4)
}

/**
 * Where a lit burner is on the way home (148.330 to 148.404): the highest balloon's, which the spark went into, its
 * flame alight again then. World cells: the middle of its jet.
 */
export const BURNER_AT: Pt = add(BURNER_POINT, up4(BACK[0]))
/** Where the spark leaves, with the top balloon's steps. */
const EXIT4: Pt = add(EXIT, up4(T1))

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
  const at = ts.map((t) => sparkHere(t))
  // Whether the spark is out of sight between sample i and i + 1 (read at the middle).
  const gone = ts.slice(0, -1).map((t, i) => sparkHere((t + ts[i + 1]) / 2).hidden)
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

/**
 * The crescendo's wide (land4 to the fortissimo): [t, cells, x, y], 22.5 to 24 cells tall. The spark on the top
 * balloon's pilot sits low in the frame (two thirds down) with the whole balloon over it; each roar shoves the balloon
 * up the frame, and the camera takes the next second or so to climb after it, so the two steps read as steps.
 */
const WIDE: [number, number, number, number][] = (() => {
  // [t, cells, how far down the frame the spark is]
  const keys: [number, number, number][] = [
    [AT.land4, 22.5, 0.67],
    [AT.land4 + 0.9, 23.4, 0.57],
    [AT.glow, 24, 0.65],
    [AT.glow + 0.9, 24, 0.55],
    [AT.blast4, 23.6, 0.57],
  ]
  return keys.map(([t, cells, down]) => {
    const [x, y] = sparkHere(t).p
    return [t, cells, x + 0.65, y - (down - 0.5) * cells]
  })
})()

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
      drawTop(p, hero, t)
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
    // The third stair is not framed like the first two: in close on the crown as the glow comes up inside, so the
    // vent popping fills the frame, then the reveal as the spark floats up to the top balloon (phrase 11 begins).
    { t: AT.whoosh3, cells: 11.4, off: [0.4, -0.7] },
    { t: AT.flare3, cells: 9.6, off: [0.3, -1.0] },
    { t: AT.pop3, cells: 8, off: [0.3, -0.9] },
    { t: AT.pop3 + 0.45, cells: 10.5, off: [0.8, -1.3] },
    // The crescendo: the top balloon whole, the spark on its pilot low in the frame, B3 dropping away below and the
    // regatta round it. The camera climbs steadily; the balloon climbs in steps on its two roars, up through it.
    ...WIDE.map(([t, cells, x, y]) => ({ t, cells, hold: [x, y] as Pt, w: 1 })),
    // The fortissimo is the push: from the wide, in on the top burner, and into its flame on the door.
    { t: AT.blast4 + 0.5, cells: 7, hold: add(sparkHere(AT.blast4 + 0.5).p, [0.35, -0.6]), w: 1 },
    { t: T1 - 0.25, cells: 3.4, hold: add(sparkHere(T1 - 0.25).p, [0.05, -0.3]), w: 1 },
    { t: T1, cells: 2.4, hold: EXIT4, w: 1 },
  ],
)
