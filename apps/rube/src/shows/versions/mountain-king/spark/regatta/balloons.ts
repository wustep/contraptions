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
  climbInt,
  EXIT,
  GROUND,
  LIT,
  N0,
  POPS,
  REG,
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
  ss,
  swellOf,
  theta1,
  ventOf,
  warmth,
  type Balloon,
  type Blast,
} from './balloons-plan'
import { drawFar, drawFlock, drawLand, drawSky, drawTiny, persp, type Frame } from './balloons-sky'

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
 * The crescendo's strikes on the top balloon (B4), 97.063 and 99.322, and the fortissimo's great blast on 100.826:
 * each is a roar of its burner that shoves the whole balloon up a step. A critically damped step: no way on it at the
 * strike, the shove at once, most of the climb in the first half second, then a long ease into the new height.
 */
const STEPS = [
  { at: AT.land4, d: 3.4 },
  { at: AT.glow, d: 4.0 },
  { at: AT.blast4, d: 2.2 },
] as const
const STEP_TAU = 0.28
/**
 * And between the shoves it never stops: lit, B4 climbs away from the rest of the regatta (cells a second over the
 * regatta's own climb), so the balloons under it fall away below and the far ones slide down past it, near ones
 * faster. It eases in off the landing, and out as the spark is drawn into the great blast, so the door keeps its speed.
 */
const CRUISE = 4.4
const cruiseV = (t: number): number => CRUISE * ss(t, AT.land4, AT.land4 + 1.3) * (1 - ss(t, AT.blast4 + 0.25, T1))
const CRUISE_STEP = 0.01
const cruiseTable: number[] = (() => {
  const out = [0]
  for (let i = 0; AT.land4 + i * CRUISE_STEP < T1 + 0.5; i++) {
    const a = AT.land4 + i * CRUISE_STEP
    out.push(out[i] + ((cruiseV(a) + cruiseV(a + CRUISE_STEP)) / 2) * CRUISE_STEP)
  }
  return out
})()
function cruised(t: number): number {
  if (t <= AT.land4) return 0
  const u = (t - AT.land4) / CRUISE_STEP
  const i = Math.floor(u)
  if (i >= cruiseTable.length - 1) return cruiseTable[cruiseTable.length - 1]
  return cruiseTable[i] + (cruiseTable[i + 1] - cruiseTable[i]) * (u - i)
}
function lift4(t: number): number {
  let y = cruised(t)
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
/**
 * The blue flash of a strike's roar: sharp on, long off. The fortissimo's great blast is held into the door, so its
 * light stays up (and grows a little) until the spark is in it.
 */
function flash4(t: number): number {
  let v = 0
  for (const s of STEPS) {
    const u = t - s.at
    if (u < 0 || u > 3) continue
    const held = s.at === AT.blast4 ? 1.2 * Math.min(1, u / 0.035) * (0.75 + 0.25 * Math.exp(-u / 0.3)) : 0
    v = Math.max(v, Math.min(1, u / 0.035) * Math.exp(-u / 0.42), held)
  }
  return v
}

/**
 * The light of a burner's roar round it: a tall soft blue over the jet, warming to gold where it goes up into the
 * envelope's mouth, the shape of the jet, never a disc. `n` is the nozzle.
 */
function drawBlue(p: p5, k: number, n: Pt, f: number): void {
  if (f < 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Past 1 (the great blast held), taller.
  const L = 3.2 * (f > 1 ? 1 + (0.35 * (f - 1)) / 0.2 : 1)
  const a = Math.min(1, f)
  ctx.save()
  ctx.translate(n[0] * k, (n[1] - 1.3) * k)
  ctx.scale(0.42, 1)
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L * k)
  g.addColorStop(0, `rgba(120, 185, 255, ${0.55 * a})`)
  g.addColorStop(0.45, `rgba(95, 169, 238, ${0.22 * a})`)
  g.addColorStop(1, 'rgba(95, 169, 238, 0)')
  ctx.fillStyle = g
  ctx.fillRect(-L * k, -L * k, 2 * L * k, 2 * L * k)
  // The gold where the flame goes into the mouth, spilling on the silk round it.
  ctx.translate(0, -1.6 * k)
  ctx.scale(1 / 0.42, 0.62)
  const G = 2.4
  const h = ctx.createRadialGradient(0, 0, 0, 0, 0, G * k)
  h.addColorStop(0, `rgba(255, 214, 140, ${0.42 * a})`)
  h.addColorStop(1, 'rgba(255, 190, 120, 0)')
  ctx.fillStyle = h
  ctx.fillRect(-G * k, -G * k, 2 * G * k, 2 * G * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the regatta round the top balloon */

/**
 * Four of the regatta near the top balloon in the crescendo, between it and the far ones: at a middle depth, so their
 * burners read in the wide. They climb with the regatta and B4 climbs away from them, so they fall away below it
 * (by their depth: the nearest fastest). Their burners answer B4: all of them on its landing roar (97.063), each side
 * on its call (the left on 97.822, the right on 98.573), and all together, long, on the glow (99.322).
 *
 * Each is placed by where it should look to be at the glow in the wide's frame: `u` across and `v` down from the
 * frame's middle, in frame heights; `d` its depth (the size it is drawn, and how far it moves with the camera).
 */
interface Mate {
  u: number
  v: number
  d: number
  b: Balloon
  side: 'L' | 'R'
  seed: number
}
const mate = (a: string, b: string, band?: string): Balloon => ({ key: 'mate', H: 10.5, Rs: 4.3, silk: { a, b, band, cap: band ?? a } })
/** Far to near, the order they are drawn in. */
const MATES: Mate[] = [
  { u: -0.73, v: -0.02, d: 0.44, b: mate(REG.teal, REG.ivory), side: 'L', seed: 31 },
  { u: 0.72, v: 0.06, d: 0.48, b: mate(REG.indigo, REG.ivory, REG.coral), side: 'R', seed: 33 },
  { u: -0.5, v: 0.2, d: 0.56, b: mate(REG.coral, REG.ivory), side: 'L', seed: 32 },
  { u: 0.46, v: 0.26, d: 0.6, b: mate(REG.saffron, REG.saffron, REG.coral), side: 'R', seed: 34 },
]
/** Their burners' blasts. */
const mateBlasts = (m: Mate): Blast[] => {
  const call = m.side === 'L' ? AT.bags4 : AT.groupB
  return [
    { on: AT.land4, off: AT.land4 + 0.45, i: 1.3 },
    { on: call, off: call + 0.35, i: 1.15 },
    { on: AT.glow, off: AT.glow + 0.8, i: 1.5 },
  ]
}
/** When they are drawn: from B3's vent popping (they are well above the frame then) until the door. */
const MATE_FROM = AT.pop3
const MATE_TO = T1 + 0.3

/** Where a mate's basket floor is drawn in the frame `f` at `t`, placed by the reference framing `ref`. */
function mateAt(m: Mate, f: Frame, t: number, ref: { x: number; y: number; cells: number }): Pt {
  const fh = ref.cells
  const fw = (fh * 16) / 9
  const r: Frame = { x0: ref.x - fw / 2, x1: ref.x + fw / 2, y0: ref.y - fh / 2, y1: ref.y + fh / 2, cx: ref.x, cy: ref.y }
  // Its true place, from where it looks to be in the reference frame (the drawing is linear in the true place).
  const [ox, oy] = persp(r, ref.x, ref.y, m.d)
  const x = ref.x + (ref.x + m.u * fh - ox) / m.d
  const y = ref.y + (ref.y + m.v * fh - oy) / m.d
  const up = climbInt(t) - climbInt(AT.glow)
  return persp(f, x, y - up, m.d)
}

function drawMates(p: p5, look: Look, f: Frame, t: number, ref: { x: number; y: number; cells: number }): void {
  if (t < MATE_FROM || t > MATE_TO) return
  const { k } = look
  for (const m of MATES) {
    const [bx, by] = mateAt(m, f, t, ref)
    if (by < f.y0 - 1 || by - 16 * m.d > f.y1 + 1 || bx < f.x0 - 6 * m.d || bx > f.x1 + 6 * m.d) continue
    const blasts = mateBlasts(m)
    const roar = roarOf(blasts, t)
    const warm = warmth(blasts, t, AT.land4)
    const drift = 0.25 * Math.sin(t * 0.23 + m.seed)
    const haze = 0.1 + 0.45 * Math.pow(1 - m.d, 1.4)
    const nozzle: Pt = [0, -ANAT.floorY]
    p.push()
    p.translate((bx + drift * m.d) * k, by * k)
    p.scale(m.d)
    const mateLook: Look = {
      k,
      weight: look.weight * Math.min(1.6, 0.8 / Math.sqrt(m.d)),
      haze: haze * (1 - 0.5 * Math.min(1, roar)),
      simple: true,
      dusk: dusk(t) * 0.55 * (1 - 0.6 * Math.min(1, warm)),
    }
    drawBalloon(p, mateLook, m.b, {
      t,
      pose: { n: nozzle, a: 0, fill: 0.98 + swellOf(blasts, t), vent: 0 },
      roar,
      warm: Math.min(1.2, warm * 1.1),
      pilot: true,
      spark: null,
      bags: null,
      seed: m.seed,
    })
    drawThrough(p, k, nozzle, t, roar)
    drawBlue(p, k, nozzle, Math.min(1, roar))
    p.pop()
  }
}

/**
 * A big roar seen through the silk: the flame goes on up past the mouth into the envelope, and shows through it as a
 * tall tongue of light (gold, whitening low), the length of the roar. Only past a full roar (B4's strikes, the mates'
 * calls, the great blast); `great` lengthens the fortissimo's, the longest flame of the regatta.
 */
function drawThrough(p: p5, k: number, n: Pt, t: number, roar: number, great = 1): void {
  const a = Math.min(1, (roar - 0.9) / 0.4)
  if (a <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = 0.06 * Math.sin(t * 29) + 0.04 * Math.sin(t * 47.3 + 1)
  const L = (1.6 + 3.0 * Math.min(1, Math.max(0, roar - 1) / 0.7)) * great * (1 + f)
  const W = 1.0 + 0.25 * Math.min(1, roar - 1)
  const y0 = n[1] + ANAT.mouthY + 0.1
  // Its half-width `u` of the way up: the mouth's width low, swelling a little, and drawn out to a tip.
  const half = (u: number): number => (W / 2) * Math.pow(1 - u, 0.7) * (0.75 + 0.25 * Math.sin(Math.PI * u))
  const lean = (u: number): number => 0.1 * Math.sin(t * 7) * u * u
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createLinearGradient(0, y0 * k, 0, (y0 - L) * k)
  g.addColorStop(0, `rgba(255, 240, 200, ${0.55 * a})`)
  g.addColorStop(0.35, `rgba(255, 205, 120, ${0.38 * a})`)
  g.addColorStop(1, 'rgba(255, 170, 90, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  const m = 18
  for (let i = 0; i <= m; i++) {
    const u = i / m
    const x = n[0] + half(u) + lean(u)
    if (i === 0) ctx.moveTo(x * k, y0 * k)
    else ctx.lineTo(x * k, (y0 - L * u) * k)
  }
  for (let i = m; i >= 0; i--) {
    const u = i / m
    ctx.lineTo((n[0] - half(u) + lean(u)) * k, (y0 - L * u) * k)
  }
  ctx.closePath()
  ctx.fill()
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
  drawThrough(p, k, n, t, roar, t >= AT.blast4 && t < T1 + 1 ? 1.45 : 1)
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

/* ------------------------------------------------------------------ the camera */

/** A smooth schedule through [t, value] keys: cosine steps between them, in log space (for `cells`). */
function schedule(keys: [number, number][], t: number): number {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, v0] = keys[i]
    const [t1, v1] = keys[i + 1]
    if (t > t1) continue
    const u = (1 - Math.cos((Math.PI * (t - t0)) / (t1 - t0))) / 2
    return Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * u)
  }
  return keys[keys.length - 1][1]
}

/**
 * The spark's path smoothed with a kernel `long` seconds wide (a share `mix` of it) plus one `short` wide, leaning
 * `lean` seconds ahead. The spark only ever rises here, so a smoothing of it only ever rises too.
 */
function smoothed(t: number, long: number, short: number, mix: number, lean: number): Pt {
  let x = 0
  let y = 0
  let sum = 0
  const n = Math.ceil((3 * long) / 0.04)
  for (let j = -n; j <= n; j++) {
    const d = j * 0.04
    const w = (mix / long) * Math.exp(-0.5 * (d / long) ** 2) + ((1 - mix) / short) * Math.exp(-0.5 * (d / short) ** 2)
    const [px, py] = sparkHere(t + lean + d).p
    x += px * w
    y += py * w
    sum += w
  }
  return [x / sum, y / sum]
}

/**
 * The balloon stair (up out of B1 to the reveal of B4), three climbs, each framed its own way so the stair reads as a
 * climb and not one climb looped.
 *
 * - Climb 1 (whoosh1 to land2) on one rising line: the spark's path smoothed, so the camera climbs steadily and the
 *   ride up inside B1 and the float to B2 move within the frame. Half the smoothing is long, half short (so the frame
 *   still leans into the ride).
 * - Climb 2 (land2 to land3) low and close: in on B2's basket as the spark floats down onto its pilot, held there
 *   for the ballast; then, as the burner roars, back to the balloon whole (`TILT2`): basket and burner low, the
 *   envelope's lower two thirds over them, so the spark going up the jet and the glow climbing the silk are seen as
 *   one balloon doing it. A slow tilt that lags the glow: the burner's flame stays in the frame until the glow is
 *   past halfway up, then the frame goes up after it and closes on the vent for the pop and the float to B3.
 * - Climb 3 (land3 to pop3) side on and wider: B3 in the left third, the sky it is climbing into on the right, so the
 *   step up to B4 (high and to the right) reads as a diagonal; on the whoosh the same opening to the balloon whole
 *   and lagging tilt (`TILT3`), the diagonal kept; then in on the vent as it pops.
 *
 * Inside a balloon the glow is kept in Zoom's frame (the middle two thirds) and the envelope under about 70% of the
 * frame's height until the frame closes on the vent. Keys every 0.2 s, so the camera's own easing follows these lines.
 */
const STAIR_FROM = AT.whoosh1 + 0.45
const STAIR_TO = AT.pop3 + 0.45
const stairLine = (t: number): Pt => smoothed(t, 1.0, 0.3, 0.55, 0)
/** The stair's framing: [t, cells]. */
const STAIR_CELLS: [number, number][] = [
  [STAIR_FROM, 12],
  [AT.whoosh1 + 1.15, 13.6],
  [AT.pop1, 13],
  // Climb 2: in on B2's basket as the spark comes down onto it and the ballast goes; back to the balloon whole as the
  // burner roars and the spark goes up the jet; held wide while the glow climbs; in on the vent for the pop.
  [AT.pop1 + 0.45, 12.4],
  [AT.bags2, 7.5],
  [AT.whoosh2 + 0.55, 12.8],
  [AT.flare2, 12.7],
  [AT.pop2 + 0.3, 9.8],
  [AT.land3 - 0.25, 10.2],
  // Climb 3: side on; back to the balloon whole on the whoosh, held wide while the glow climbs, in on the vent.
  [AT.land3 + 0.35, 11],
  [AT.whoosh3 - 0.1, 11],
  [AT.whoosh3 + 0.5, 12.5],
  [AT.flare3 + 0.15, 12.4],
  [AT.pop3, 10],
  [STAIR_TO, 10.8],
]
/** A monotone cubic through [t, value] keys (Fritsch-Carlson), flat outside them: no stop at the keys between. */
function pchip(keys: [number, number][], t: number): number {
  const n = keys.length
  if (t <= keys[0][0]) return keys[0][1]
  if (t >= keys[n - 1][0]) return keys[n - 1][1]
  const d = keys.slice(0, -1).map(([t0, v0], i) => (keys[i + 1][1] - v0) / (keys[i + 1][0] - t0))
  const m = keys.map((_, i) => {
    if (i === 0 || i === n - 1) return 0
    const a = d[i - 1]
    const b = d[i]
    if (a * b <= 0) return 0
    const h0 = keys[i][0] - keys[i - 1][0]
    const h1 = keys[i + 1][0] - keys[i][0]
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b)
  })
  let i = 0
  while (t > keys[i + 1][0]) i++
  const h = keys[i + 1][0] - keys[i][0]
  const u = (t - keys[i][0]) / h
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * keys[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * keys[i + 1][1] + (u3 - u2) * h * m[i + 1]
}
/** Climb 1's frame off its line: a little right of the stair (it steps east), and low enough to centre the ride. */
const STAIR_OFF: Pt = [0.4, 0.4]
/**
 * Climb 3, side on: a steady line up the stair, with the spark's balloon in the left third. The frame is low on the
 * sit (the envelope going up out of it) and rises ahead of the glow, so at the pop the crown is low left and B4's
 * basket is in over it, up and to the right.
 */
const SIDE3 = (t: number): Pt => add(smoothed(t, 0.9, 0.3, 0.6, 0), [3.9, 0.9 - 2.6 * ss(t, AT.whoosh3, AT.pop3 - 0.1)])
/**
 * Climb 2 on B2, the frame's middle off its nozzle, [t, across, down]. Low for the ballast (the basket's floor at the
 * bottom, the mouth high); then back and up with the whoosh to the balloon whole (the floor at 0.93 of the frame, the
 * envelope over it), and a tilt up after the glow that lags it: the nozzle stays in the frame until the glow is past
 * halfway up (about `flare2`), then the frame goes up the silk and is under the vent as it pops. After the pop it
 * goes on up after the spark more slowly than the spark (which floats up out of the frame's top third and slows onto
 * B3), to where the side-on frame of climb 3 takes it.
 */
const TILT2_OUT = AT.land3 + 0.35
const TILT2_KEYS: [number, number, number][] = [
  [AT.bags2 + 0.1, -0.2, -1.1],
  [AT.whoosh2 + 0.2, -0.1, -2.1],
  [AT.whoosh2 + 0.55, 0, -3.3],
  [AT.flare2, 0.1, -5.2],
  [AT.pop2, 0.2, -11.2],
  [AT.pop2 + 0.45, 0.9, -14.1],
  // Across, on over the spark's float to the right; the side-on frame's own blend takes it the rest of the way.
  [TILT2_OUT, 1.4, SIDE3(TILT2_OUT)[1] - n2(TILT2_OUT)[1]],
]
const TILT2_X: [number, number][] = TILT2_KEYS.map(([s, x]) => [s, x])
const TILT2_Y: [number, number][] = TILT2_KEYS.map(([s, , y]) => [s, y])
const TILT2 = (t: number): Pt => add(n2(t), [pchip(TILT2_X, t), pchip(TILT2_Y, t)])
/**
 * Climb 3's ride, on B3: the side-on frame widened to the balloon whole on the whoosh (B3's nozzle kept at 0.3 of
 * the frame's width, so the diagonal to B4 stays), the floor at 0.93, and the same lagging tilt: the nozzle in the
 * frame until the glow is past halfway up, then up the silk to the vent, and on after the spark to where the side-on
 * frame is at the stair's end. Down off B3's nozzle, from where the side-on frame is as it starts.
 */
const TILT3_IN = AT.whoosh3 - 0.3
const TILT3_KEYS: [number, number][] = [
  [TILT3_IN, SIDE3(TILT3_IN)[1] - n3(TILT3_IN)[1]],
  [AT.whoosh3 + 0.2, -2.0],
  [AT.whoosh3 + 0.5, -3.0],
  [AT.flare3 + 0.15, -5.6],
  [AT.pop3, -13.0],
  [STAIR_TO, SIDE3(STAIR_TO)[1] - n3(STAIR_TO)[1]],
]
const TILT3 = (t: number): Pt => [
  smoothed(t, 0.9, 0.3, 0.6, 0)[0] + 0.2 * ((schedule(STAIR_CELLS, t) * 16) / 9),
  n3(t)[1] + pchip(TILT3_KEYS, t),
]
const mix = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
function stairHold(t: number): Pt {
  let h = add(stairLine(t), STAIR_OFF)
  h = mix(h, TILT2(t), ss(t, AT.pop1 + 0.45, AT.bags2))
  h = mix(h, SIDE3(t), ss(t, AT.land3 - 0.45, TILT2_OUT))
  if (t > TILT3_IN) h = mix(h, TILT3(t), ss(t, TILT3_IN, AT.whoosh3 + 0.1) * (1 - ss(t, AT.pop3 - 0.05, STAIR_TO)))
  return h
}
const STAIR: PartShot[] = (() => {
  const out: PartShot[] = []
  const n = Math.round((STAIR_TO - STAIR_FROM) / 0.2)
  for (let i = 0; i <= n; i++) {
    const t = STAIR_FROM + ((STAIR_TO - STAIR_FROM) * i) / n
    out.push({ t, cells: schedule(STAIR_CELLS, t), hold: stairHold(t), w: 1 })
  }
  return out
})()

/**
 * The crescendo (land4 to the fortissimo), on the top balloon: its envelope fills the top of the frame, the spark on
 * its pilot a little below the middle, opening only a little (12 to 14 cells) so the spark stays findable, and the
 * regatta dropping past below and round it. The show's widest frames belong to the crash and the Titan. The balloon
 * never stops climbing (its cruise), and the camera climbs with it on a line smoothed over about a second, so each
 * roar's shove carries the balloon up the frame and the camera eases after it: steps on a climb that never parks.
 */
const WIDE_CELLS: [number, number][] = [
  [AT.land4, 12],
  [AT.glow, 13.5],
  [AT.blast4, 14],
]
const WIDE_DOWN = 0.6
const wideLine = (t: number): Pt => smoothed(t, 0.9, 0.3, 0.8, 0)
const wideHold = (t: number, cells: number): Pt => add(wideLine(t), [0.65, -(WIDE_DOWN - 0.5) * cells])
const WIDE: PartShot[] = (() => {
  const out: PartShot[] = []
  const n = Math.round((AT.blast4 - AT.land4) / 0.3)
  for (let i = 0; i <= n; i++) {
    const t = AT.land4 + ((AT.blast4 - AT.land4) * i) / n
    const cells = schedule(WIDE_CELLS, t)
    out.push({ t, cells, hold: wideHold(t, cells), w: 1 })
  }
  return out
})()
/** The wide's frame at the glow, which the regatta round the top balloon is placed by. */
const MATE_REF: { x: number; y: number; cells: number } = (() => {
  const cells = schedule(WIDE_CELLS, AT.glow)
  const [x, y] = wideHold(AT.glow, cells)
  return { x, y, cells }
})()

/**
 * The fortissimo is the push: on 100.826 the great blast, and from the wide the camera goes in on the top burner on
 * one accelerating curve (a power of the time, in log cells), into its flame on the door at the seam's 2.4 cells. The
 * frame's offset off the spark shrinks with it, so the spark comes to the middle as the flame fills the frame.
 */
const PUSH: PartShot[] = (() => {
  const last = WIDE[WIDE.length - 1]
  const c0 = last.cells
  const s0 = sparkHere(AT.blast4).p
  const off0: Pt = [last.hold![0] - s0[0], last.hold![1] - s0[1]]
  const out: PartShot[] = []
  for (const u of [0.2, 0.4, 0.55, 0.7, 0.82, 0.92]) {
    const t = AT.blast4 + (T1 - AT.blast4) * u
    const cells = Math.exp(Math.log(c0) + (Math.log(2.4) - Math.log(c0)) * Math.pow(u, 1.7))
    const k = cells / c0
    out.push({ t, cells, hold: add(sparkHere(t).p, [off0[0] * k, off0[1] * k]), w: 1 })
  }
  out.push({ t: T1, cells: 2.4, hold: EXIT4, w: 1 })
  return out
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
      drawFlock(p, look, f, t, MATE_REF)
      drawMates(p, look, f, t, MATE_REF)
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
      // Everything the camera may look at: the meadow, the stair of balloons, the sky round them, and the top balloon high
      // over them on the way home (it climbed away in the crescendo), its flame alight.
      cells: box(-14, -130, 36, 8, 2),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: AT.land1 - T0 },
      state: { begin: slot.begin },
    }
  },
  (): PartShot[] => [
    // Out of the fire: pull back at once to the burner it came out of (whole: basket, burner and the skirt, its silk
    // going up out of the frame), the breeze, and the balloon lying on the grass with its fan, where the spark is
    // thrown; in by 82.8, so the flight reads as a throw that lands on 83.912.
    { t: T0 + 0.42, cells: 3.3, hold: [2.4, -0.6], w: 0.25 },
    { t: T0 + 0.95, cells: 10, hold: [5.0, -0.35], w: 0.85 },
    { t: AT.land1, cells: 10.6, hold: [6.8, -0.4], w: 0.85 },
    // The stand-up, whole: the envelope swings up off the meadow.
    { t: AT.heave2, cells: 13.5, hold: [9.6, -2.6], w: 0.8 },
    { t: AT.upright, cells: 17.5, hold: [8.0, -4.8], w: 0.88 },
    { t: AT.blast1, cells: 16.5, hold: [7.7, -4.0], w: 0.85 },
    // In on its burner for the big blast (held a touch low, so the climb that follows starts from it and never turns).
    { t: AT.whoosh1 - 0.08, cells: 11.5, hold: [7.0, -2.6], w: 1 },
    // Up inside it with the glow, out of the top, and up the stair of balloons on one rising line.
    ...STAIR,
    // The crescendo: the top balloon whole, the spark on its pilot low in the frame, the regatta falling away below.
    ...WIDE,
    // The fortissimo: the push, from the wide into the flame.
    ...PUSH,
  ],
)
