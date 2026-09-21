import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, post, rail, ramp, rankBy, roll, trace, wait, type Lane, type Pt } from '../../parts'
import { lamp, score } from './neon'

/**
 * A tube man, the fairground's air dancer. One long sleeve of bright cloth
 * strapped over a blower, two short sleeves for arms, a face painted on. It
 * lies limp along the end of the lane with its flat head on a pad let into
 * the rail. The ball rolls up onto the slack head and the pad gives under
 * it; the blower's lamp lights and its wheel runs up; a swell goes along the
 * cloth; and the sleeve stands up from the foot, the bend running up it to
 * the head, which comes up last in a whip with the ball on its crown, past
 * plumb, back, and still. Arms out. Two hundred. It bows over the deck one
 * or two floors up, lays its head against the deck's end, and the ball rolls
 * off the crown onto it. Let go, it flings back up and dances a second with
 * nothing to carry. Then the blower cuts, the arms drop, the head nods over
 * and the whole sleeve folds down on itself onto the rail, flat, as it lay.
 *
 * It only ever sends the ball on. A deck on the way back would stand where
 * the head comes up.
 *
 * The sleeve is one spine of short links, each told from the clock how full
 * it is, how far it has stood and which way it leans, and laid on the rail
 * wherever it would go through it. The ball is a ball's radius over the
 * round of the head at every instant: the lane is traced from that spine and
 * the drawing strokes the same one.
 */
export interface TubemanState {
  color: string
  floors: number
}

/** The blower's mouth, where the sleeve is strapped on: the column the sleeve stands in. */
const FX = 1
const MOUTH_Y = FLOOR
/** The sleeve's half width blown up, and lying flat; its links. */
const HW = 0.1
const HW_LIMP = 0.032
const N = 30
/** How far along the rail it lies when it is limp, whatever its height: slack cloth lies in wrinkles. */
const LIMP_LEN = 1
/** Lying, it points this far round from plumb: west and a little down, so it rests on the rail. */
const LIE = 1.75
/** Folding down after the blower cuts, the cloth over the fold hangs this far round. */
const DROOP = 2.5
/** The bow: the top of the sleeve bends over this far, along this much of its length. */
const BOW = 1
const BOW_LEN = 0.55
/** The pad under the head: how wide, how far it gives. */
const PAD_W = 0.26
const SINK = 0.03
/** The arms: how far under the crown they are sewn on, how long, how wide. */
const ARM_DOWN = 0.44
const ARM_LEN = 0.34
const ARM_HW = 0.036
const ARM_LINKS = 5
/** The blower runs up this long after the pad goes down; the sleeve starts to stand this long after that. */
const WAKE = 0.12
const LAG = 0.1
/** How long a link takes to fill once the air is at it. */
const FILL = 0.14
/** How far short of the head's middle the ball starts to climb onto it. */
const CLIMB = 0.14
/** The ball waits this long on the bowed head; the head is let go this long after it starts off; and dances this long before the blower cuts. */
const NOD = 0.05
const LET_GO = 0.16
const DANCE = 1.2

const smooth = (x: number) => x * x * (3 - 2 * x)

/** A sprung step: 0 before, 1 long after, over the top and back on the way. `f` hertz, damping `z`. */
function spring(tau: number, f: number, z: number): number {
  if (tau <= 0) return 0
  const w = 2 * Math.PI * f
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau))
}

/** One tube man's measure and its clock. */
interface Rig {
  floors: number
  /** The sleeve's length blown up, and how much of that it lies in when slack. */
  L: number
  slack: number
  /** Where the head lies on the rail, and where it is laid against the deck. */
  xHead: number
  xBow: number
  /** The ball onto the pad, and at rest on the head; the blower on. */
  tPad: number
  tOn: number
  fire: number
  /** How long the air takes to reach the head, and the bend. */
  tAir: number
  tStand: number
  /** Up; the bow; the ball gone and the head let go; the blower off; how long the fold takes to come down the sleeve. */
  tUp: number
  bow0: number
  bow1: number
  tFree: number
  tOff: number
  sag: number
  tDown: number
}

interface Pose {
  /** The spine, mouth to crown: N + 1 points, and a half width a link. */
  pts: Pt[]
  hw: number[]
  /** Which way the head points, round from plumb. */
  tilt: number
  /** The arms, shoulder to cuff, and their half width. */
  arms: Pt[][]
  armHw: number
  /** How full the head is. */
  head: number
}

/** How far the pad is down. */
const padAt = (g: Rig, t: number): number => over(t, g.tPad, g.tOn) - over(t, g.fire + LAG + 0.08, g.fire + LAG + 0.2)

/** The sleeve, `t` seconds after the ball came in. */
function pose(g: Rig, t: number): Pose {
  const { L, fire } = g
  const pad = padAt(g, t)
  const bow = easeInOutSine(over(t, g.bow0, g.bow1)) * (1 - spring(t - g.tFree, 1.6, 0.32))
  // It sways a little with the ball on its head, stills to bow, and dances when it has been let go.
  const ride = over(t, g.tUp - 0.15, g.tUp + 0.2) * (1 - easeInOutSine(over(t, g.bow0 - 0.15, g.bow1 - 0.1)))
  const free = over(t, g.tFree, g.tFree + 0.35) * (1 - over(t, g.tOff, g.tOff + 0.9))
  const sway = 0.08 * ride + 0.42 * free
  const soft = smooth(over(t, g.tOff, g.tOff + 0.5))
  const settled = smooth(over(t, g.tDown, g.tDown + 0.3))

  const pts: Pt[] = [[FX, MOUTH_Y]]
  const hw: number[] = []
  let x = FX
  let y = MOUTH_Y
  let head = 0
  for (let i = 0; i < N; i++) {
    const s = (i + 0.5) / N
    // The bend: up from the foot, sprung; and the fold, down from the top.
    const up = spring(t - (fire + LAG + s * g.tStand), 2.1, 0.42)
    const tFold = g.tOff + 0.15 + (1 - s) * g.sag
    const fold = smooth(over(t, tFold, tFold + 0.65))
    // The air: in from the foot as a swell; with the blower off the sleeve goes soft all at once, and flat link by link as it folds.
    const tIn = fire + s * g.tAir
    const flat = smooth(over(t, tFold + 0.1, tFold + 0.8))
    const full = smooth(over(t, tIn, tIn + FILL)) * (1 - 0.4 * soft) * (1 - flat)
    const swell = Math.sin(Math.PI * over(t, tIn + 0.04, tIn + 0.34))
    const lie = -LIE * smooth(clamp(s / 0.05))
    const bent = BOW * bow * smooth(clamp((s * L - (L - BOW_LEN)) / BOW_LEN))
    const wave = sway * Math.pow(s, 1.3) * Math.sin(2 * Math.PI * 1.7 * (t - g.tUp) - 3.6 * s)
    const th = lerp(lie * (1 - up) + bent + wave - 0.3 * soft * s, lerp(-DROOP, lie, settled), fold)
    const len = (L / N) * lerp(g.slack, 1, clamp(up) * (1 - fold))
    // Strapped round the mouth at its foot whatever is in it.
    const w = lerp(HW, lerp(HW_LIMP, HW, full) + 0.03 * swell, smooth(clamp((s * L) / 0.16)))

    let nx = x + len * Math.sin(th)
    let ny = y - len * Math.cos(th)
    // Laid on the rail, or on the pad, where it would go through it: a lying link's whole half width clear of it, a standing one's none.
    const ground = FLOOR + (Math.abs(nx - g.xHead) < PAD_W / 2 ? SINK * pad : 0) - w * Math.abs(Math.sin(th))
    if (ny > ground) {
      ny = ground
      const run = Math.sqrt(Math.max(0, len * len - (ny - y) * (ny - y)))
      nx = x + (Math.sin(th) < 0 ? -run : run)
    }
    x = nx
    y = ny
    pts.push([x, y])
    hw.push(w)
    head = full
  }

  // The arms: slack, they hang back down the sleeve behind it; filled, they fly out and flail.
  const at = Math.round(N * (1 - ARM_DOWN / L))
  const sA = at / N
  const goneA = smooth(over(t, g.tOff + 0.05, g.tOff + 0.55))
  const fullA = smooth(over(t, fire + sA * g.tAir + 0.05, fire + sA * g.tAir + 0.05 + FILL)) * (1 - goneA)
  const out = spring(t - (fire + LAG + sA * g.tStand + 0.06), 2.4, 0.3) * (1 - goneA)
  const lively = clamp(out) * (0.35 + 0.65 * Math.max(ride * 0.4, free))
  /** Which way link `i` really runs, laid on the rail or not. */
  const runs = (i: number) => Math.atan2(pts[i + 1][0] - pts[i][0], pts[i][1] - pts[i + 1][1])
  const arms: Pt[][] = []
  for (const side of out > 0.02 ? [-1, 1] : []) {
    const arm: Pt[] = [pts[at]]
    let ax = pts[at][0]
    let ay = pts[at][1]
    for (let j = 0; j < ARM_LINKS; j++) {
      const back = runs(Math.max(0, at - 1 - j)) + side * Math.PI
      const flail = 0.55 * lively * ((j + 1) / ARM_LINKS) * Math.sin(2 * Math.PI * 2.3 * t + side * 1.3 - 1.1 * j)
      const flung = runs(at - 1) + side * (1.2 - 0.12 * j) + flail
      const th = lerp(back, flung, out)
      const len = (ARM_LEN / ARM_LINKS) * lerp(0.7, 1, fullA)
      ax += len * Math.sin(th)
      ay = Math.min(ay - len * Math.cos(th), FLOOR - HW_LIMP)
      arm.push([ax, ay])
    }
    arms.push(arm)
  }
  return { pts, hw, tilt: runs(N - 1), arms, armHw: lerp(0.016, ARM_HW, fullA), head }
}

/** The ball's centre: a radius over the round of the head. */
function ballOn(g: Rig, t: number): Pt {
  const { pts, hw } = pose(g, t)
  return [pts[N][0], pts[N][1] - hw[N - 1] - R]
}

const RIGS = new Map<number, Rig>()
const LANES = new Map<number, Lane>()

/** The rig for a deck `floors` up: the length whose bow lays the crown level with the deck, and the clock. */
function rigFor(floors: number): Rig {
  const known = RIGS.get(floors)
  if (known) return known
  // Bowed and still, the spine is a plumb run and a bend; its crown is this far over and up.
  const bowed = (L: number): Pt => {
    let x = FX
    let y = MOUTH_Y
    for (let i = 0; i < N; i++) {
      const th = BOW * smooth(clamp((((i + 0.5) / N) * L - (L - BOW_LEN)) / BOW_LEN))
      x += (L / N) * Math.sin(th)
      y -= (L / N) * Math.cos(th)
    }
    return [x, y - HW - R]
  }
  let lo = floors - 0.5
  let hi = floors + 0.5
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (bowed(mid)[1] > -floors) lo = mid
    else hi = mid
  }
  const L = (lo + hi) / 2
  // Long before any of it: the sleeve as it lies, which says where the head is.
  const far = 1e6
  const g: Rig = { floors, L, slack: LIMP_LEN / L, xHead: 0, xBow: bowed(L)[0], tPad: far, tOn: far, fire: far, tAir: 0.2 + 0.08 * floors, tStand: 0.3 + 0.2 * floors, tUp: far, bow0: far, bow1: far, tFree: far, tOff: far, sag: 0.6 + 0.35 * floors, tDown: far }
  g.xHead = pose(g, -1).pts[N][0]
  // The ball meets the head's end a little before it is over it, and climbs on, slowing.
  g.tPad = (g.xHead - CLIMB + 0.5) / ROLL
  g.tOn = g.tPad + Math.hypot(CLIMB, 2 * HW_LIMP - SINK) / (ROLL / 2)
  g.fire = g.tOn + WAKE
  g.tUp = g.fire + LAG + g.tStand + 0.26
  g.bow0 = g.tUp + 0.5
  g.bow1 = g.bow0 + 0.45
  g.tFree = g.bow1 + NOD + LET_GO
  g.tOff = g.tFree + DANCE
  g.tDown = g.tOff + 0.15 + g.sag + 0.65
  RIGS.set(floors, g)
  return g
}

function laneFor(g: Rig): Lane {
  const known = LANES.get(g.floors)
  if (known) return known
  const on: Pt = [g.xHead, SINK - 2 * HW_LIMP]
  const off = ballOn(g, g.bow1 + NOD)
  const segs = [
    roll([-0.5, 0], [g.xHead - CLIMB, 0], ROLL),
    ramp([g.xHead - CLIMB, 0], on, ROLL, 0),
    ...trace((t) => ballOn(g, t), g.tOn, g.bow1, Math.ceil((g.bow1 - g.tOn) / 0.015)),
    wait(off, NOD),
    // Off the crown and onto the deck, picking up the rail's pace.
    ramp(off, [FX + 0.5, -g.floors], 0.5, ROLL),
  ]
  const lane: Lane = { segs, fire: g.fire }
  LANES.set(g.floors, lane)
  return lane
}

/**
 * A sleeve: every link stroked round-ended in ink, then again inside it in
 * the colour, so the links run into one outlined tube. Each link is drawn in
 * thirds, its width run from one joint's to the next, so a taper is a slope
 * and not a flight of steps.
 */
function sleeve(p: p5, k: number, ink: string, weight: number, color: string, pts: Pt[], hw: (i: number) => number): void {
  const links = pts.length - 1
  const joint = (i: number) => (hw(Math.max(0, i - 1)) + hw(Math.min(links - 1, i))) / 2
  for (const pass of [0, 1]) {
    p.stroke(pass ? color : ink)
    for (let i = 0; i < links; i++) {
      for (let j = 0; j < 3; j++) {
        const w = lerp(joint(i), joint(i + 1), (j + 0.5) / 3)
        p.strokeWeight(Math.max(0.5, 2 * w * k + (pass ? -weight : weight)))
        p.line(lerp(pts[i][0], pts[i + 1][0], j / 3) * k, lerp(pts[i][1], pts[i + 1][1], j / 3) * k, lerp(pts[i][0], pts[i + 1][0], (j + 1) / 3) * k, lerp(pts[i][1], pts[i + 1][1], (j + 1) / 3) * k)
      }
    }
  }
}

export const tubeman = definePiece<TubemanState>({
  name: 'tubeman',
  points: 200,
  weight: 0.9,
  place: ({ rng, color, fits, taste, theme, ball }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    for (const floors of rankBy(rng, [1, 2], (f) => Math.pow(tall, f - 1))) {
      // The lane's cell and the blower's, the column over the blower, and the cell the head comes up through.
      const cells: Pt[] = [
        [0, 0],
        [1, 0],
        [0, -1],
      ]
      for (let i = 1; i <= floors; i++) cells.push([1, -i])
      const exit: Pt = [2, -floors]
      if (!fits(cells, exit)) continue
      // Never the ball's own colour: it has to be seen to sit on the head, not to be the head.
      const cloth = color === ball.color ? rng.pick(theme.colors.filter((c) => c !== ball.color)) : color
      return { cells, exit: { at: exit, dir: 1 }, lane: laneFor(rigFor(floors)), state: { color: cloth, floors } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const g = rigFor(s.floors)
    const { pts, hw, tilt, arms, armHw, head } = pose(g, t)
    const pad = padAt(g, t)
    // The wheel's turn: its pace run up over a quarter of a second and down over one.
    const run = (tau: number, d: number) => (tau <= 0 ? 0 : tau < d ? (tau * tau) / (2 * d) : tau - d / 2)
    const turn = 20 * (run(t - g.fire, 0.25) - run(t - g.tOff, 1))

    // The lane, broken for the pad; the deck up top on its post.
    rail(p, k, ink, weight, -0.5, g.xHead - PAD_W / 2)
    rail(p, k, ink, weight, g.xHead + PAD_W / 2, FX - HW)
    rail(p, k, ink, weight, g.xBow + HW - 0.02, FX + 0.5, -s.floors + FLOOR)
    post(p, k, ink, weight, FX + 0.43, -s.floors + FLOOR, -s.floors + 0.5)
    post(p, k, ink, weight, g.xHead, FLOOR + 0.05 + SINK * pad, 0.5)
    solid(p, ink, weight, s.color)
    p.rect(g.xHead * k, (FLOOR + 0.025 + SINK * pad) * k, PAD_W * k, 0.05 * k, 0.012 * k)

    // The arms behind the sleeve, the sleeve, and its face.
    p.push()
    p.strokeCap(p.ROUND)
    for (const arm of arms) sleeve(p, k, ink, weight, s.color, arm, () => armHw)
    sleeve(p, k, ink, weight, s.color, pts, (i) => hw[i])
    p.pop()
    if (head > 0.3) {
      p.push()
      p.translate(pts[N][0] * k, pts[N][1] * k)
      p.rotate(tilt)
      p.scale(head)
      // Painted on in the dark of the paper: the ink is as pale as the cloth.
      p.fill(bg)
      p.noStroke()
      for (const dx of [-0.042, 0.042]) p.circle(dx * k, 0, 0.04 * k)
      p.stroke(bg)
      p.strokeWeight(weight)
      p.line(-0.04 * k, 0.075 * k, 0.04 * k, 0.075 * k)
      p.pop()
    }

    // The blower: the strap round its mouth, a box on the floor, the wheel in its round window, the lamp.
    solid(p, ink, weight, s.color)
    p.rect(FX * k, (MOUTH_Y + 0.05) * k, (HW * 2 + 0.07) * k, 0.1 * k, 0.015 * k)
    solid(p, ink, weight, bg)
    p.rect(FX * k, 0.365 * k, 0.54 * k, 0.27 * k, 0.03 * k)
    p.circle(FX * k, 0.365 * k, 0.2 * k)
    p.stroke(ink)
    p.strokeWeight(weight * 1.2)
    for (let b = 0; b < 3; b++) {
      const a = turn + (b * Math.PI * 2) / 3
      p.line(FX * k, 0.365 * k, (FX + 0.08 * Math.cos(a)) * k, (0.365 + 0.08 * Math.sin(a)) * k)
    }
    lamp(p, k, ink, weight, s.color, bg, FX + 0.2, 0.29, 0.032, t >= g.fire && t < g.tOff ? 1 : 0)
  },
  // It pops over the ball as the head whips up under it.
  scores: (p, s, { k, t, bg }) => {
    const g = rigFor(s.floors)
    score(p, k, s.color, bg, FX, -s.floors - 0.22, '+200', t - g.tUp, 1)
  },
})
