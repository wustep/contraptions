import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { easeOutQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, mixHex, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from '../../../pieces/harbor/sea'

/**
 * A tide pool. Off the deck's end a crag stands in deep water, two floors
 * of it, and in its top, level with the deck, the last tide left a pool:
 * brim-full, cut through here so the water shows. The pool's far rim is
 * cracked. The crack comes in from the far face most of the way to the
 * water, and it weeps: a drop swells at its end, lets go, and falls to the
 * sea. The ball rolls off the rock into the pool with a plop and floats,
 * half under, bobbing. The plop sends one wave along the pool. The wave
 * slaps the far rim, the crack runs the rest of the way, and the rim
 * outside it tips outward and goes down the crag's face into the sea. The
 * pool follows it out through the gap: a waterfall a floor tall, thrown
 * clear onto the deck below while the pool is full and falling back to the
 * face as it empties. The current takes the ball to the gap, over the sill
 * and down with the water onto the lower deck, where it lands in the wash
 * and rolls on. The pool is left a puddle under the sill, the fall a
 * dribble, then a drip, and the rim a rock awash at the crag's foot.
 *
 * The pool's surface is one height at every x and every instant: the brim,
 * the wave, the level going down and the sheet over the sill. The ball
 * floats on it, and its lane from the plop to the lip is traced from it.
 * The fall is drops, each let go of the lip at the pace the pool's head
 * then gave it and left to the one gravity that the ball falls under too.
 */

/** The sea here is a floor deeper: where it lies, and its bed. */
const SEA = 1 + WATER
const BED = 1.5
/** Cartoon gravity: the ball's, the water's and the broken rim's. */
const G = 18

/** Where the rock's near shoulder ends: the pool's near wall, and the last of the ball's footing. */
const EDGE = -0.2
/** The pool: how full it stands, how deep its floor lies, and its far wall. */
const BRIM = 0.18
const DEEP = 0.48
const RIM_IN = 0.5
/** The far rim: its top, and its outer face at the top. */
const RIM_TOP = 0.1
const RIM_OUT = 0.72
/** The crack: from the sill on the pool's side, which is what the pool drains to, out and down to the lip on the far face. */
const SILL = 0.42
const LIP: Pt = [0.73, 0.49]
const SLOPE = Math.atan2(LIP[1] - SILL, LIP[0] - RIM_IN)
const sillAt = (x: number): number => SILL + (x - RIM_IN) * Math.tan(SLOPE)
/** How much of the crack shows before the wave: from the lip in, this much of the way. */
const CRACKED = 0.7
/** The lower deck: where it starts, and its piling. */
const DECK_X = 1.12
const POST_X = 1.36

/** Off the rock at the deck's pace, falling: when and where the ball's underside meets the pool. */
const T_EDGE = (EDGE + 0.5) / ROLL
const T_FALL = Math.sqrt((2 * (BRIM - R)) / G)
const T_WET = T_EDGE + T_FALL
const WET: Pt = [EDGE + ROLL * T_FALL, BRIM - R]
/** The wave off the plop: its pace along the pool, its height, and how long its back and its face are. */
const WAVE_V = 1.3
const WAVE_H = 0.085
const WAVE_BACK = 0.17
const WAVE_FACE = 0.09
/** When the wave slaps the far rim; the crack takes this long to run through, and then the rim goes. */
const T_SLAP = T_WET + (RIM_IN - WET[0] - R) / WAVE_V
const CRACK = 0.06
const FIRE = T_SLAP + CRACK
/** The rim tips about the lip, this hard, to this far over, and then falls. */
const TIP_ACC = 24
const TIP_GO = 0.45
const T_GO = FIRE + Math.sqrt((2 * TIP_GO) / TIP_ACC)
/** The gap is open this long after the rim starts to go, and the pool has run out this long after. */
const OPEN = 0.16
const DRAIN = 2.3

/** How much of the pool has gone, 0 to 1: nothing at first while the rim is still in the way, fastest a third of the way in, and a long tail. */
const drainedAt = (t: number): number => {
  const u = over(t, FIRE, FIRE + DRAIN)
  return 1 - (1 - u) ** 3 * (1 + 3 * u)
}
/** How hard it is running out, 0 to 1: the rate the level falls at. */
const flowAt = (t: number): number => {
  const u = over(t, FIRE, FIRE + DRAIN)
  return (27 / 4) * u * (1 - u) ** 2
}
/** The pool's level away from the gap. */
const levelAt = (t: number): number => BRIM + (SILL - BRIM) * drainedAt(t)
/** Toward the gap the surface dips by this much of the head of water over the sill, and the sheet over the sill thins by this much by the lip. */
const DIP = 0.15
const THIN = 0.35

/** The pool's surface at `x`, `t` seconds into the piece: the brim, the wave on it, the level going down, and the sheet over the sill. */
function poolAt(x: number, t: number): number {
  const level = levelAt(t)
  // The wave: a bump born at the plop, run along to the far rim, piled against it, and let out with the rim.
  let bump = 0
  if (t > T_WET) {
    const at = Math.min(RIM_IN, WET[0] + R + WAVE_V * (t - T_WET))
    const d = (x - at) / (x < at ? WAVE_BACK : WAVE_FACE)
    if (Math.abs(d) < 1) bump = WAVE_H * over(t, T_WET, T_WET + 0.06) * (1 - over(t, FIRE, FIRE + 0.15)) * (0.5 + 0.5 * Math.cos(Math.PI * d))
  }
  if (t <= FIRE) return level - bump
  const head = SILL - level
  const open = over(t, FIRE, FIRE + OPEN)
  if (x <= RIM_IN) {
    const near = over(x, RIM_IN - 0.3, RIM_IN)
    return level + DIP * head * open * near * near * (3 - 2 * near) - bump
  }
  const u = (x - RIM_IN) / (LIP[0] - RIM_IN)
  return sillAt(x) - head * (1 - DIP * open) * (1 - THIN * u) - bump
}

/** The lowest the ball's centre can be at `x`: a radius off the pool's floor, round the sill's corner, and off the sill's slope. */
function groundAt(x: number): number {
  const dx = x - RIM_IN
  if (dx < -R) return DEEP - R
  if (dx < R * Math.sin(SLOPE)) return SILL - Math.sqrt(R * R - dx * dx)
  return sillAt(x - R * Math.sin(SLOPE)) - R * Math.cos(SLOPE)
}

/** The ball in the water: the pool stops its roll this hard, and the current to the gap takes it from `T_PULL` at this much a second, every second. */
const DRAG = 20
const T_PULL = FIRE + 0.05
const PULL = 3.7
const floatX = (t: number): number => WET[0] + (ROLL / DRAG) * (1 - Math.exp(-DRAG * (t - T_WET))) + 0.5 * PULL * Math.max(0, t - T_PULL) ** 2
/** Its bob about its own waterline, which is half under: in from a radius above it at the pace it fell, and dying away. */
const BOB_DAMP = 5
const BOB_W = 13
const BOB_IN = (G * T_FALL - BOB_DAMP * R) / BOB_W
const bobAt = (s: number): number => Math.exp(-BOB_DAMP * s) * (-R * Math.cos(BOB_W * s) + BOB_IN * Math.sin(BOB_W * s))
/** The ball afloat, `t` seconds into the piece: on the pool's surface at its own x, or on the rock where the water is too thin to float it. */
const afloat = (t: number): Pt => {
  const x = floatX(t)
  return [x, Math.min(poolAt(x, t) + bobAt(t - T_WET), groundAt(x))]
}
/** When it rolls off the lip. */
const T_LIP = (() => {
  let lo = T_PULL
  let hi = T_PULL + 2
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (floatX(mid) < LIP[0] + R * Math.sin(SLOPE)) lo = mid
    else hi = mid
  }
  return lo
})()

const RIDE = trace(afloat, T_WET, T_LIP, 44)
const OFF = RIDE[RIDE.length - 1].to
/** Off the lip at the pace the current gave it, and a thrown thing from there, under the water's own gravity, down to the lower deck. */
const OFF_V: Pt = [(OFF[0] - afloat(T_LIP - 1e-3)[0]) / 1e-3, (OFF[1] - afloat(T_LIP - 1e-3)[1]) / 1e-3]
const FLIGHT = (-OFF_V[1] + Math.sqrt(OFF_V[1] ** 2 + 2 * G * (1 - OFF[1]))) / G
const T_LAND = T_LIP + FLIGHT
const LAND: Pt = [OFF[0] + OFF_V[0] * FLIGHT, 1]
const HOP: Pt = [LAND[0] + 0.07, 1]
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [EDGE, 0], ROLL),
    fly([EDGE, 0], WET, T_FALL, WET[1] / 4),
    ...RIDE,
    fly(OFF, LAND, FLIGHT, (G * FLIGHT * FLIGHT) / 8),
    fly(LAND, HOP, 0.07 / OFF_V[0], 0.012),
    ramp(HOP, [1.5, 1], OFF_V[0], ROLL),
  ],
  fire: FIRE,
}

/** The same scatter every time: 0 to 1 from an index and a salt. */
const hash = (i: number, salt: number): number => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/** The crack's line from the sill to the lip: not quite straight. */
const CRACK_LINE: Pt[] = [
  [RIM_IN, SILL],
  [RIM_IN + 0.06, sillAt(RIM_IN + 0.06) + 0.012],
  [RIM_IN + 0.12, sillAt(RIM_IN + 0.12) - 0.01],
  [RIM_IN + 0.18, sillAt(RIM_IN + 0.18) + 0.01],
  LIP,
]
/** A second crack off the first, up into the rim: it goes nowhere, and goes down with the rim. */
const BRANCH: Pt[] = [CRACK_LINE[2], [RIM_IN + 0.1, 0.35], [RIM_IN + 0.135, 0.27]]
/** The rim outside the crack, clockwise from the sill: up the pool's wall, along the top, down the far face to the lip. */
const RIM_TOPS: Pt[] = [
  [RIM_IN, RIM_TOP + 0.04],
  [RIM_IN + 0.035, RIM_TOP - 0.02],
  [RIM_IN + 0.11, RIM_TOP - 0.05],
  [RIM_OUT - 0.035, RIM_TOP - 0.015],
  [RIM_OUT + 0.005, RIM_TOP + 0.09],
]

/** Off the lip, the rim is this long in the air, and this long going down through the sea to the bed. */
const RIM_FALL = Math.sqrt((2 * (SEA - LIP[1])) / G)
const RIM_SINK = 0.2
const T_RIM_SEA = T_GO + RIM_FALL

/** The broken rim: how far over it is, and where the corner it tips about has got to. */
function rimAt(t: number): { at: Pt; turn: number } {
  if (t <= FIRE) return { at: LIP, turn: 0 }
  if (t <= T_GO) return { at: LIP, turn: 0.5 * TIP_ACC * (t - FIRE) ** 2 }
  // Off the lip: down the face under gravity, still turning, into the sea, and onto the bed on its side.
  const s = t - T_GO
  const y = s < RIM_FALL ? LIP[1] + 0.5 * G * s * s : SEA + (BED - 0.01 - SEA) * easeOutQuad(over(s, RIM_FALL, RIM_FALL + RIM_SINK))
  const x = LIP[0] + 0.1 * over(s, 0, RIM_FALL + RIM_SINK)
  // On the bed it rocks once or twice on its long side and lies still.
  const down = Math.max(0, s - RIM_FALL - RIM_SINK)
  const rock = 0.1 * Math.exp(-down * 5) * Math.sin(down * 13)
  return { at: [x, y], turn: TIP_GO + (Math.PI / 2 + 0.07 - TIP_GO) * easeOutQuad(over(s, 0, RIM_FALL + RIM_SINK)) - rock }
}

/** The weeping: a drop every this often, and how long it takes to fall to the sea. */
const WEEP = 0.8
const WEEP_FALL = Math.sqrt((2 * (SEA - LIP[1] - 0.02)) / G)

/** The fall: a drop leaves the lip every `DRIP` seconds while the pool runs; the pace a full pool throws it at; and the longest one is in the air. */
const DRIP = 0.006
const RUSH = 2.8
const AIRBORNE = 0.38
const T_POUR = FIRE + OPEN * 0.5

/** The first `run` of a line through `pts`, 0 to 1, counted by its corners. */
function partLine(p: p5, k: number, pts: Pt[], run: number): void {
  const last = pts.length - 1
  p.beginShape()
  for (let i = 0; i <= last; i++) {
    const g = Math.min(1, run * last - (i - 1))
    if (i === 0 || g >= 1) p.vertex(pts[i][0] * k, pts[i][1] * k)
    else {
      if (g > 0) p.vertex((pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * g) * k, (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * g) * k)
      break
    }
  }
  p.endShape()
}

/**
 * The water in the air at `t`: every drop let go of the lip in the last
 * `AIRBORNE` seconds, each where its own fall has got it to, drawn along
 * the way it is going. The spray falls in front of the ball. Where the
 * last of them came down, on the lower deck or in the sea, beads hop.
 * The fill is the caller's.
 */
function pour(p: p5, k: number, t: number, front: boolean): void {
  const newest = Math.floor(t / DRIP)
  const count = Math.ceil(AIRBORNE / DRIP) + 1
  let onDeck: [number, number] | null = null
  let inSea: [number, number] | null = null
  for (let i = 0; i <= count; i++) {
    const n = newest - i
    const born = n * DRIP
    const age = t - born
    if (born < T_POUR || born > FIRE + DRAIN) continue
    const flow = flowAt(born)
    // A dribble is fewer drops, not only smaller ones.
    if (hash(n, 4) > flow * 7) continue
    // Three in four are the body of the fall, fat and close; the fourth is spray, a bead thrown a little wide of it.
    const spray = n % 4 === 3
    const head = 1 - drainedAt(born)
    // The rush builds as the gap opens, and dies with the head of water behind it.
    const v = RUSH * Math.sqrt(head) * (0.55 + 0.45 * over(born, FIRE, FIRE + 0.45)) * (spray ? 0.75 + 0.4 * hash(n, 1) : 0.9 + 0.2 * hash(n, 1))
    const vx = v * Math.cos(SLOPE)
    const v0 = v * Math.sin(SLOPE) - (spray ? 0.5 * hash(n, 5) : 0)
    // As fat as the sheet it came off, which builds as the gap opens and thins with the pool; thinner the longer it has fallen; and it leaves with its underside on the lip.
    const thick = (SILL - levelAt(born)) * (1 - DIP) * (1 - THIN)
    const girth = Math.max(0.03, thick * 1.7 * (0.4 + 0.6 * over(born, FIRE, FIRE + 0.4)))
    const d = spray ? 0.04 * (0.6 + 0.7 * hash(n, 2)) : girth * (0.85 + 0.3 * hash(n, 2)) * (1 - 0.6 * (age / AIRBORNE))
    const x = LIP[0] + vx * age
    const y = LIP[1] - (spray ? thick * hash(n, 3) : girth / 2) + v0 * age + 0.5 * G * age * age
    if (x >= DECK_X - 0.01 && y >= 1 + FLOOR - 0.02) {
      onDeck ??= [x, flow]
      continue
    }
    if (y >= SEA) {
      inSea ??= [x, flow]
      continue
    }
    if (spray !== front) continue
    const vy = v0 + G * age
    p.push()
    p.translate(x * k, y * k)
    p.rotate(Math.atan2(vy, vx))
    p.ellipse(0, 0, (d + Math.hypot(vx, vy) * (spray ? 0.004 : 0.01)) * k, d * k)
    p.pop()
  }
  if (front) return
  for (const [hit, y, big] of [
    [onDeck, 1 + FLOOR, 1],
    [inSea, SEA, 1.3],
  ] as [[number, number] | null, number, number][]) {
    if (!hit) continue
    const x = hit[0]
    const size = big * (0.35 + 0.65 * hit[1])
    const f = (t * 3.4) % 1
    p.ellipse(x * k, (y - 0.006) * k, (0.07 + 0.1 * f) * size * k, 0.034 * (1 - f) * size * k)
    for (let i = 0; i < 3; i++) {
      const g = (t * 2.9 + i / 3) % 1
      p.circle((x + (i - 1) * 0.09 * g * size) * k, (y - 0.012 - 0.4 * g * (1 - g) * size) * k, 0.028 * (1 - g * 0.5) * k)
    }
  }
}

export const tidepool = definePiece<{ color: string; sea: string; mark: string }>({
  name: 'tidepool',
  weight: 0.8,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    // The pool is the sea's own colour, a little deeper when the ball is that colour too; the rock is never the pool's colour, nor the ball's.
    const blue = seaWater(theme)
    const body = bodyColor(theme, color, ball.color)
    const rock = body !== blue ? body : bodyColor(theme, theme.colors.find((c) => c !== blue && c !== ball.color) ?? body, ball.color)
    // What lives on the rock is some other colour of the palette again, or failing that the paper's.
    const mark = theme.colors.find((c) => c !== rock && c !== blue && c !== ball.color) ?? theme.bg
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color: rock, sea: blue === ball.color ? mixHex(blue, theme.ink, 0.3) : blue, mark } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const broken = t > FIRE

    // The deck below on its piling; the sea a floor down, and its bed. The deck in needs no piling: its end lies on the crag.
    rail(p, k, ink, weight, DECK_X, 1.5, 1 + FLOOR)
    piling(p, k, ink, weight, POST_X, 1 + FLOOR, BED)
    seabed(p, k, ink, weight, -0.5, 1.5, BED)
    water(p, k, ink, weight, -0.5, 1.5, SEA)

    // The pool's water, from wall to wall and out over the sill once the rim has gone: the rock is drawn over its foot.
    const reach = broken ? RIM_IN + (LIP[0] - RIM_IN) * over(t, FIRE, FIRE + OPEN) : RIM_IN
    p.noStroke()
    p.fill(s.sea)
    p.beginShape()
    const n = 40
    for (let i = 0; i <= n; i++) {
      const x = EDGE + ((reach - EDGE) * i) / n
      p.vertex(x * k, poolAt(x, t) * k)
    }
    p.vertex(reach * k, (sillAt(reach) + 0.03) * k)
    p.vertex(RIM_IN * k, (DEEP + 0.03) * k)
    p.vertex(EDGE * k, (DEEP + 0.03) * k)
    p.endShape(p.CLOSE)

    // The crag: one rock from the bed to the deck, its head hollowed for the pool, its faces broken into ledges and its foot worn in by the sea.
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (const [x, y] of [
      [-0.46, FLOOR],
      [EDGE, FLOOR],
      [EDGE + 0.02, DEEP - 0.1],
      [EDGE + 0.1, DEEP],
      [0.2, DEEP + 0.02],
      [RIM_IN - 0.09, DEEP - 0.01],
      [RIM_IN, SILL],
      ...(broken ? CRACK_LINE : [...RIM_TOPS, LIP]),
      [0.68, 0.63],
      [0.7, 0.8],
      [0.62, 0.87],
      [0.64, 1.09],
      [0.7, 1.15],
      [0.69, 1.32],
      [0.77, BED],
      [-0.44, BED],
      [-0.4, 1.3],
      [-0.31, 1.24],
      [-0.3, 1.02],
      [-0.22, 0.95],
      [-0.25, 0.7],
      [-0.37, 0.62],
      [-0.35, 0.45],
      [-0.46, 0.36],
    ] as Pt[])
      p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    // Its strata: a few beds of stone, dipping a little seaward.
    outline(p, ink, weight * 0.7)
    p.line(-0.25 * k, 0.7 * k, 0.16 * k, 0.74 * k)
    p.line(0.26 * k, 0.83 * k, 0.62 * k, 0.87 * k)
    p.line(-0.3 * k, 1.13 * k, 0.24 * k, 1.18 * k)
    // What lives on it: a starfish on its flank, and two limpets down by the tideline.
    solid(p, ink, weight * 0.7, s.mark)
    p.beginShape()
    for (let i = 0; i < 10; i++) {
      const a = 0.35 + (i * Math.PI) / 5
      const r = i % 2 ? 0.042 : 0.1
      p.vertex((-0.02 + r * Math.sin(a)) * k, (0.94 - r * Math.cos(a)) * k)
    }
    p.endShape(p.CLOSE)
    p.arc(0.4 * k, 1.29 * k, 0.09 * k, 0.09 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.arc(0.52 * k, 1.35 * k, 0.07 * k, 0.07 * k, Math.PI, Math.PI * 2, p.CHORD)
    // The deck in, its end on the crag's shoulder.
    rail(p, k, ink, weight, -0.5, EDGE)

    // The crack: in from the lip most of the way, and the rest of the way when the wave slaps the rim.
    if (!broken) {
      outline(p, ink, weight)
      partLine(p, k, [...CRACK_LINE].reverse(), CRACKED + (1 - CRACKED) * over(t, T_SLAP, FIRE))
      partLine(p, k, BRANCH, 1)
    } else {
      // The rim, broken off: tipping about the lip, then down the face and onto the bed.
      const rim = rimAt(t)
      p.push()
      p.translate(rim.at[0] * k, rim.at[1] * k)
      p.rotate(rim.turn)
      solid(p, ink, weight, s.color)
      p.beginShape()
      for (const [x, y] of [...CRACK_LINE, ...[...RIM_TOPS].reverse()]) p.vertex((x - LIP[0]) * k, (y - LIP[1]) * k)
      p.endShape(p.CLOSE)
      outline(p, ink, weight)
      partLine(p, k, BRANCH.map(([x, y]): Pt => [x - LIP[0], y - LIP[1]]), 1)
      p.pop()
    }

    // It weeps: a drop swells at the crack's end, lets go, and falls to the sea, where a ring opens; the last one let go before the rim went still falls.
    p.noStroke()
    p.fill(s.sea)
    const began = Math.floor(t / WEEP) * WEEP
    const age = t - began - (WEEP - WEEP_FALL)
    if (age < 0 && !broken) p.circle((LIP[0] + 0.012) * k, (LIP[1] + 0.02) * k, 0.05 * over(t - began, 0, WEEP - WEEP_FALL) * k)
    if (age >= 0 && began + WEEP - WEEP_FALL < FIRE) p.ellipse((LIP[0] + 0.012) * k, (LIP[1] + 0.02 + 0.5 * G * age * age) * k, 0.04 * k, (0.05 + 0.05 * age) * k)
    if (began - WEEP_FALL < FIRE) {
      const f = over(t - began, 0, 0.3)
      if (f < 1) p.ellipse((LIP[0] + 0.012) * k, SEA * k, (0.04 + 0.1 * f) * k, 0.03 * (1 - f) * k)
    }

    // The water in the air, and what it does where it comes down.
    pour(p, k, t, false)
    splash(p, k, s.sea, weight, WET[0] + 0.04, BRIM, over(t, T_WET, T_WET + 0.4), 0.6)
    splash(p, k, s.sea, weight, RIM_IN - 0.02, BRIM - 0.04, over(t, T_SLAP, T_SLAP + 0.4), 0.6)
    splash(p, k, s.sea, weight, LIP[0] + 0.2, SEA, over(t, T_RIM_SEA, T_RIM_SEA + 0.6), 1.3)
    splash(p, k, s.sea, weight, LAND[0], 1 + FLOOR, over(t, T_LAND, T_LAND + 0.4), 0.7)
  },
  over: (p, s, { k, t }) => {
    // The ball is in the water, not on it: the pool over its lower half, seen through, and the spray of the fall in front of it.
    p.noStroke()
    if (t > T_WET && t < T_LIP) {
      const [bx] = afloat(t)
      const wet = p.color(s.sea)
      wet.setAlpha(150)
      p.fill(wet)
      p.beginShape()
      const x0 = Math.max(EDGE, bx - R - 0.01)
      const x1 = Math.min(LIP[0], bx + R + 0.01)
      for (let i = 0; i <= 10; i++) {
        const x = x0 + ((x1 - x0) * i) / 10
        p.vertex(x * k, poolAt(x, t) * k)
      }
      for (let i = 10; i >= 0; i--) {
        const x = x0 + ((x1 - x0) * i) / 10
        p.vertex(x * k, Math.min(poolAt(x, t) + R + 0.04, x > RIM_IN ? sillAt(x) : DEEP) * k)
      }
      p.endShape(p.CLOSE)
    }
    p.fill(s.sea)
    pour(p, k, t, true)
  },
})
