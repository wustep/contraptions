import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { along as depthAlong, birds, clouds, smoke, wobble, type Flight, type Frame } from '../depth'
import { drawFar, farRow } from '../house/far'
import { alpha, frame, hash, type Ctx } from '../kit'
import { AGE } from '../music'
import { CHURCH, HOME, INK } from '../worlds'
import { drawChairs } from '../props/chairs'
import { drawJar } from '../props/jar'
import { INSIDE } from './inside'
import {
  AXLE, BOX, CHAIRS_X, CHUTE, CHUTE_LEN, COIN_GAP, CUP, FIXED, HALF, HANDFUL, HINGE, HUBCAP, JAR_H, JAR_W, LAMP, LADDER, LANDS, MANTLE, POURS, PUSH2,
  SLAMS, SLOT, SUN, THUNDER, TREE, TYRE, carAt, clamp01, cupAt, fillAt, jarAt, jarBase, jarMouth, ladderAt, lampAt, onPlank, plankAt,
  smoothstep, stormAt, sunAt,
} from './jar-clock'

/**
 * The living room, drawn (the jar builder's): what is seen through its two windows (the street beyond in its layers,
 * the car in the drive, the big tree in the garden, the storm) and the curtains at them, the lamp over the stepladder,
 * the fire in the grate, the seesaw that throws their savings into the jar, the jar on the mantle and the coins it
 * pours, the two armchairs, and the afternoon's sun. Everything here is in the house's INSIDE cells and is handed show
 * time `T`; it draws behind Carl and Ellie (the part's `draw`).
 */

const X = (k: number) => (v: number) => v * k
const G = 12

/** A coin seen nearly edge on: a flat brass disc, turning, inked so it reads against brick; its face pales as it turns to us. */
function coin(p: p5, k: number, weight: number, x: number, y: number, spin: number, turn = 0, a = 1): void {
  const w = 0.15
  const face = Math.abs(Math.sin(spin))
  const h = 0.022 + 0.07 * face
  p.push()
  p.translate(x * k, y * k)
  p.rotate(turn)
  p.stroke(alpha(p, INK, 0.85 * a))
  p.strokeWeight(weight * 0.45)
  p.fill(alpha(p, mixHex(HOME.brass, HOME.shine, face * face * 0.7), a))
  p.ellipse(0, 0, w * k, h * k)
  p.pop()
}

/* ------------------------------------------------------------------ the windows */

const [LEFT_WIN, RIGHT_WIN] = INSIDE.windows

function clipTo(p: p5, k: number, [x0, x1, y0, y1]: number[], draw: () => void): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  draw()
  ctx.restore()
}

/** The frame, bars and sill over a window, as the set draws them (the view is painted between the set and these). */
function frameOver(p: p5, k: number, weight: number, [x0, x1, y0, y1]: number[]): void {
  const x = X(k)
  p.push()
  p.rectMode(p.CORNER)
  p.noFill()
  p.stroke(HOME.trim)
  p.strokeWeight(0.1 * k)
  p.rect(x(x0), x(y0), x(x1 - x0), x(y1 - y0))
  p.line(x((x0 + x1) / 2), x(y0), x((x0 + x1) / 2), x(y1))
  p.line(x(x0), x((y0 + y1) / 2), x(x1), x((y0 + y1) / 2))
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.7)
  p.rect(x(x0 - 0.05), x(y0 - 0.05), x(x1 - x0 + 0.1), x(y1 - y0 + 0.1))
  p.fill(HOME.trim)
  p.rect(x(x0 - 0.15), x(y1), x(x1 - x0 + 0.3), x(0.1))
  p.pop()
}

/** The weather over a pane: the storm's dark, the rain, the lightning. */
function weather(p: p5, k: number, T: number, [x0, x1, y0, y1]: number[], seed: number): void {
  const x = X(k)
  const { storm, flash, rain } = stormAt(T)
  p.noStroke()
  if (storm > 0.01) {
    p.fill(alpha(p, HOME.night, 0.58 * storm))
    p.rect(x(x0), x(y0), x(x1 - x0), x(y1 - y0))
  }
  if (rain > 0.01) {
    p.stroke(alpha(p, '#DCEEF3', 0.5 * rain))
    p.strokeWeight(Math.max(1, k * 0.012))
    for (let i = 0; i < 26; i++) {
      const u = (hash(i, seed, 7) + T * (1.6 + hash(i, seed, 9) * 0.6)) % 1
      const rx = x0 + hash(i, seed, 3) * (x1 - x0 + 0.6) - 0.3 * u
      const ry = y0 - 0.3 + u * (y1 - y0 + 0.6)
      p.line(x(rx), x(ry), x(rx - 0.06), x(ry + 0.22))
    }
  }
  if (flash > 0.01) {
    p.noStroke()
    p.fill(alpha(p, '#F4F7F2', 0.85 * flash))
    p.rect(x(x0), x(y0), x(x1 - x0), x(y1 - y0))
  }
}

/* ------------------------------------------------------------------ the view out */

/**
 * One street seen through both windows, in layers that keep their own depth as the camera moves (`along`), so the far
 * side slides against the window frame and the room is a room with a world outside it: the sky and its clouds
 * drifting, the houses across the road among their trees (the street's far side, small and hazed), the far pavement
 * and the road, the garden hedge; then the drive and the car, or the garden tree, at the glass. All flat and unlined,
 * hazed toward the sky. A neighbour walks a dog along the far pavement once, hurrying ahead of the storm (never in the
 * tyre's still frame), and birds cross before the coins and after the sun.
 */
const ACROSS = farRow(-30, 110, 0.19, 0.2, 23)
/** Each layer's depth: how much of the camera's move it keeps (0 the wall, 1 the sky that never moves). */
const DEPTH = { cloud: 0.6, birds: 0.45, across: 0.35, street: 0.2, hedge: 0.08 }
/** Where each window's view stands as designed: the frame's middle when it is looked at most (the tyre; the storm's end). */
const ANCHOR = [4.5, 9.8]
/** The far side's foot (the far pavement's back edge), the road's far and near kerbs, the hedge's top. */
const FAR_FOOT = -1.71
const ROAD = [-1.68, -1.56]
const HEDGE_TOP = -1.5

const FAR_TREE = mixHex(HOME.sky, mixHex(HOME.leaf, '#7D8A86', 0.3), 0.5)
const FAR_HOUSE = mixHex(HOME.sky, mixHex(HOME.siding, '#E9D8C2', 0.5), 0.45)
const FAR_PANE = mixHex(FAR_HOUSE, '#7E8C96', 0.25)
const PAVEMENT = mixHex(HOME.stone, HOME.sky, 0.25)
const TARMAC = mixHex('#A39C92', HOME.sky, 0.3)
const HEDGE = mixHex(HOME.leaf, '#9AAE8A', 0.35)
const CLOUD = mixHex('#FFFFFF', HOME.sky, 0.2)
const CLOUD_SHADE = mixHex(HOME.sky, '#A9C2CF', 0.5)

/** The neighbour's walk: when, from where on the far pavement, how fast (cells a second, in the street's own layer). */
const WALK = { t0: 123.3, t1: 127.2, x: 1.5, v: 0.45 }

/** Birds over the street: a pair as they come in from the yard, a few after the storm. */
const FLIGHTS: Flight[] = [
  { t0: 103.8, from: [2.29, -2.42], v: [0.52, -0.03], dur: 3.8, n: 2, span: 0.07, color: mixHex(INK, HOME.sky, 0.45), beat: 3.1, seed: 4, depth: DEPTH.birds, anchor: ANCHOR[0] },
  { t0: 136.7, from: [12.2, -2.5], v: [-0.5, 0.02], dur: 5.5, n: 4, span: 0.06, color: mixHex(INK, HOME.sky, 0.5), beat: 3.4, seed: 9, depth: DEPTH.birds, anchor: ANCHOR[1] },
  { t0: 138.0, from: [8.0, -2.2], v: [0.42, -0.02], dur: 5, n: 2, span: 0.06, color: mixHex(INK, HOME.sky, 0.5), beat: 3.0, seed: 12, depth: DEPTH.birds, anchor: ANCHOR[1] },
]

/** A neighbour in a hat walking a little dog on a lead, both facing right, the walker's feet at (`at`, `foot`). Far: unlined. */
function neighbour(p: p5, k: number, weight: number, at: number, foot: number, step: number): void {
  const X = (v: number) => v * k
  const coat = mixHex('#6B5E73', HOME.sky, 0.25)
  const dark = mixHex(coat, INK, 0.35)
  const dog = mixHex('#8A6A4E', HOME.sky, 0.25)
  const swing = Math.sin(step)
  const bob = 0.004 * Math.abs(Math.cos(step))
  p.push()
  // Drawn at its own size about the walker's feet, a little smaller than the measures below.
  p.translate(X(at), X(foot))
  p.scale(0.85)
  const x = 0
  const y = 0
  p.noFill()
  // The lead, a little slack, from the hand to the dog's collar.
  const hand: Pt = [x + 0.035, y - 0.075 - bob]
  const dx = x + 0.15
  const neck: Pt = [dx + 0.035, y - 0.035]
  p.stroke(alpha(p, dark, 0.8))
  p.strokeWeight(Math.max(1, weight * 0.3))
  p.bezier(X(hand[0]), X(hand[1]), X(hand[0] + 0.04), X(hand[1] + 0.03), X(neck[0] - 0.04), X(neck[1] + 0.01), X(neck[0]), X(neck[1]))
  // Legs: two strokes scissoring as they walk.
  p.stroke(dark)
  p.strokeWeight(Math.max(1, weight * 0.55))
  p.line(X(x), X(y - 0.05 - bob), X(x + 0.018 * swing), X(y))
  p.line(X(x), X(y - 0.05 - bob), X(x - 0.018 * swing), X(y))
  p.noStroke()
  // The coat, the head, the hat.
  p.fill(coat)
  p.rect(X(x - 0.026), X(y - 0.13 - bob), X(0.052), X(0.085), X(0.016), X(0.016), X(0.006), X(0.006))
  p.fill(mixHex('#D9B8A0', HOME.sky, 0.25))
  p.circle(X(x + 0.002), X(y - 0.148 - bob), X(0.034))
  p.fill(dark)
  p.rect(X(x - 0.03), X(y - 0.164 - bob), X(0.064), X(0.008), X(0.004))
  p.rect(X(x - 0.016), X(y - 0.186 - bob), X(0.034), X(0.024), X(0.006), X(0.006), 0, 0)
  // The dog, trotting ahead at twice her pace: legs, body, head, an ear, its tail up.
  const trot = Math.sin(step * 2)
  p.stroke(dog)
  p.strokeWeight(Math.max(1, weight * 0.45))
  for (const [lx, ph] of [[dx - 0.028, 1], [dx + 0.026, -1]] as [number, number][]) {
    p.line(X(lx), X(y - 0.022), X(lx + 0.009 * trot * ph), X(y))
    p.line(X(lx + 0.006), X(y - 0.022), X(lx + 0.006 - 0.009 * trot * ph), X(y))
  }
  p.line(X(dx - 0.04), X(y - 0.035), X(dx - 0.058), X(y - 0.06 - 0.006 * trot))
  p.noStroke()
  p.fill(dog)
  p.ellipse(X(dx), X(y - 0.032), X(0.085), X(0.03))
  p.circle(X(dx + 0.045), X(y - 0.048), X(0.03))
  p.fill(mixHex(dog, INK, 0.3))
  p.ellipse(X(dx + 0.038), X(y - 0.052), X(0.012), X(0.022))
  p.pop()
}

/**
 * The far layers of the view through window `w` (0 the left, 1 the right), drawn inside its clip, behind what stands
 * at the glass: clouds, birds, the houses across, the street and anyone on it, the hedge.
 */
function view(p: p5, c: Ctx, T: number, f: Frame, w: 0 | 1): void {
  const { k, weight } = c
  const x = X(k)
  const [x0, x1, y0, y1] = INSIDE.windows[w]
  const anchor = ANCHOR[w]
  const shift = (depth: number) => depthAlong(f, depth, anchor)
  p.push()
  p.rectMode(p.CORNER)
  clouds(p, k, f, T, { y0: y0 + 0.12, y1: y0 + 0.42, per: 42, size: 0.5, speed: 0.05, depth: DEPTH.cloud, anchor, body: CLOUD, shade: CLOUD_SHADE, heap: 0.75, seed: 31 })
  for (const fl of FLIGHTS) birds(p, k, f, T, fl, weight)
  // The houses across the road, in their gardens.
  const sa = shift(DEPTH.across)
  p.push()
  p.translate(x(sa), 0)
  drawFar(p, k, ACROSS, FAR_FOOT, x0 - sa, x1 - sa, FAR_TREE, FAR_HOUSE, FAR_PANE, 0.05)
  p.pop()
  // The far pavement, then whoever walks it, then the road in front.
  p.noStroke()
  p.fill(PAVEMENT)
  p.rect(x(x0), x(FAR_FOOT - 0.01), x(x1 - x0), x(ROAD[0] - FAR_FOOT + 0.01))
  if (T > WALK.t0 && T < WALK.t1) {
    const s = T - WALK.t0
    const wx = WALK.x + WALK.v * s + shift(DEPTH.street)
    if (wx > x0 - 0.3 && wx < x1 + 0.3) neighbour(p, k, weight, wx, (FAR_FOOT + ROAD[0]) / 2 + 0.008, (s * WALK.v) / 0.05)
  }
  p.noStroke()
  p.fill(TARMAC)
  p.rect(x(x0), x(ROAD[0]), x(x1 - x0), x(ROAD[1] - ROAD[0] + 0.02))
  // The garden hedge, clipped round, its top sliding a little against the frame.
  const sh = shift(DEPTH.hedge)
  const i0 = Math.floor((x0 - sh) / 0.24) - 1
  const i1 = Math.ceil((x1 - sh) / 0.24) + 1
  p.fill(HEDGE)
  p.beginShape()
  p.vertex(x(i0 * 0.24 + sh), x(y1))
  for (let i = i0; i <= i1; i++) p.vertex(x(i * 0.24 + sh), x(HEDGE_TOP - 0.06 * Math.abs(Math.sin(i * 1.9))))
  p.vertex(x(i1 * 0.24 + sh), x(y1))
  p.endShape(p.CLOSE)
  p.pop()
}

/**
 * The curtains at a window: a rod over it and a panel hanging either side, outside the glass, gathered at the top
 * with soft folds down them. They stir in the room's air, their hems swaying, and blow about in the storm.
 */
function curtains(p: p5, c: Ctx, T: number, [x0, x1, y0, y1]: number[], seed: number): void {
  const { k, weight } = c
  const x = X(k)
  const { storm } = stormAt(T)
  const cloth = mixHex(mixHex(HOME.leaf, HOME.trim, 0.52), '#C9C6B4', AGE(T) * 0.7)
  const fold = mixHex(cloth, INK, 0.16)
  const top = y0 - 0.14
  const hem = y1 + 0.14
  p.push()
  p.rectMode(p.CORNER)
  for (const side of [-1, 1]) {
    // The draught's sway: a slow stir, and the storm's gusts pulling at the hem; the blow, a start.
    const s = seed * 2 + side
    const sway = 0.018 * wobble(T, s, 2.3) + storm * (0.05 * wobble(T, s + 5, 0.7) + 0.025) + 0.04 * Math.exp(-Math.max(0, T - TREE) / 0.5) * (T > TREE ? Math.sin((T - TREE) * 9) : 0)
    const inner = side < 0 ? x0 + 0.03 : x1 - 0.03
    const outer = side < 0 ? x0 - 0.36 : x1 + 0.36
    const a = Math.min(inner, outer)
    const b = Math.max(inner, outer)
    const bend = (y: number) => sway * ((y - top) / (hem - top)) ** 2
    p.stroke(alpha(p, INK, 0.75))
    p.strokeWeight(weight * 0.6)
    p.fill(cloth)
    p.beginShape()
    // Gathered under the rod: a scalloped head.
    for (let i = 0; i <= 4; i++) p.vertex(x(a + ((b - a) * i) / 4), x(top + (i % 2 ? 0.025 : 0)))
    p.bezierVertex(x(b), x(top + 0.6), x(b + bend(hem) * 0.6), x(hem - 0.5), x(b + bend(hem)), x(hem))
    // The hem, a gentle wave.
    p.bezierVertex(x(b + bend(hem) - 0.1), x(hem + 0.03), x(a + bend(hem) + 0.1), x(hem - 0.03), x(a + bend(hem)), x(hem))
    p.bezierVertex(x(a + bend(hem) * 0.6), x(hem - 0.5), x(a), x(top + 0.6), x(a), x(top))
    p.endShape(p.CLOSE)
    // Its folds: soft darker lines that swing with it.
    p.noFill()
    p.stroke(alpha(p, fold, 0.55))
    p.strokeWeight(weight * 0.5)
    for (const u of [0.3, 0.62]) {
      const fx = a + (b - a) * u
      p.bezier(x(fx), x(top + 0.06), x(fx), x(top + 0.6), x(fx + bend(hem) * 0.6), x(hem - 0.5), x(fx + bend(hem)), x(hem - 0.02))
    }
  }
  // The rod and its two knobs.
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.6)
  p.fill(HOME.woodDark)
  p.rect(x(x0 - 0.44), x(top - 0.035), x(x1 - x0 + 0.88), x(0.035), x(0.015))
  p.circle(x(x0 - 0.46), x(top - 0.018), x(0.06))
  p.circle(x(x1 + 0.46), x(top - 0.018), x(0.06))
  p.pop()
}

/** How far up the glass the drive and the car sit, so the wheels clear the window's sill and frame. */
const DRIVE_UP = 0.14
/** The hubcap's width: as big as the hub it comes off and then some, so it is seen to fly. */
const HUBCAP_D = 0.17

/** The drive through the left-hand window: the street beyond, the drive, their car; the tyre that blows, and the hubcap. */
function driveway(p: p5, c: Ctx, T: number, f: Frame): void {
  const { k, weight } = c
  const x = X(k)
  const [x0, x1, y0, y1] = LEFT_WIN
  void y0
  void y1
  clipTo(p, k, LEFT_WIN, () => {
    p.push()
    p.rectMode(p.CORNER)
    p.noStroke()
    // Far off: the street and the houses across it, the hedge; then the lawn and the pale drive the car stands on.
    view(p, c, T, f, 0)
    p.noStroke()
    // The lawn, the drive and all on it sit a little up the glass, so the car's wheels clear the sill and frame: the
    // tyre that goes flat is seen flat, not lost behind the sill under its dust.
    p.push()
    p.translate(0, x(-DRIVE_UP))
    p.fill(mixHex(HOME.grass, '#A7BC90', 0.3))
    p.rect(x(x0), x(-1.3), x(x1 - x0), x(0.5))
    p.fill(HOME.stone)
    p.rect(x(x0), x(-1.07), x(x1 - x0), x(0.14))

    // The car: a round-shouldered family car, rear to the left, whole in the window. It sags on its rear when the tyre
    // goes, and stands level again once it is paid for.
    const car = carAt(T)
    const REAR = 2.1
    const FRONT = 3.0
    const WHEEL = -1.14
    const R = 0.13
    // Paid for, it drives off (away to the right, gathering speed, out of the window): its job is done, and the
    // window is only the drive and the hedge behind the fall and the bandage.
    const go = Math.max(0, Math.min(1, (T - FIXED - 0.45) / 1.7))
    const away = 2.4 * go * go
    if (away < 2.35) {
      p.push()
      p.translate(x(away), 0)
      p.translate(x(FRONT), x(WHEEL + R))
      p.rotate(-car.sag * 0.075)
      p.translate(-x(FRONT), -x(WHEEL + R))
      p.stroke(alpha(p, INK, 0.85))
      p.strokeWeight(weight * 0.7)
      // The wheels first (dark tyres, small hubs; the rear one flattens), then the body over their tops, the cabin.
      for (const [wx, flat] of [[REAR, Math.max(0, car.sag)], [FRONT, 0]] as [number, number][]) {
        p.fill(INK)
        p.ellipse(x(wx), x(WHEEL + flat * 0.03), x(2 * R * (1 + flat * 0.25)), x(2 * R * (1 - flat * 0.32)))
        if (wx === FRONT || T < TYRE || T >= FIXED - 0.2) {
          p.noStroke()
          p.fill(HOME.trim)
          p.circle(x(wx), x(WHEEL + flat * 0.03), x(0.09))
          p.stroke(alpha(p, INK, 0.85))
        }
      }
      // The cabin, a rounded dome over the middle, a gentle slope behind and a steeper windscreen; its two windows.
      p.fill(mixHex(HOME.yellow, '#F4DFA0', 0.25))
      p.beginShape()
      p.vertex(x(2.08), x(-1.44))
      p.bezierVertex(x(2.16), x(-1.72), x(2.34), x(-1.79), x(2.56), x(-1.79))
      p.bezierVertex(x(2.78), x(-1.79), x(2.88), x(-1.7), x(2.98), x(-1.44))
      p.endShape(p.CLOSE)
      p.noStroke()
      p.fill(alpha(p, HOME.glass, 0.9))
      p.quad(x(2.2), x(-1.46), x(2.3), x(-1.69), x(2.52), x(-1.73), x(2.52), x(-1.46))
      p.quad(x(2.6), x(-1.46), x(2.6), x(-1.73), x(2.78), x(-1.69), x(2.86), x(-1.46))
      p.stroke(alpha(p, INK, 0.85))
      p.fill(HOME.yellow)
      // The body: short and deep, round at both ends, over the wheels' tops.
      p.rect(x(1.8), x(-1.47), x(1.5), x(0.3), x(0.12))
      p.pop()
    }

    // The blow: a puff of dust off the drive, spreading and thinning.
    if (car.puff > 0 && car.puff < 1.4) {
      const u = car.puff / 1.4
      p.noStroke()
      for (let i = 0; i < 5; i++) {
        const a = (1 - u) * (1 - u) * 0.55
        const dx = (hash(i, 2, 5) - 0.6) * 0.5 * Math.sqrt(u) - 0.15 * u
        const dy = -0.05 - 0.22 * Math.sqrt(u) * hash(i, 4, 1)
        p.fill(alpha(p, '#CFC6B6', a))
        p.circle(x(REAR + dx), x(-1.02 + dy), x(0.12 + 0.3 * Math.sqrt(u) * (0.6 + hash(i, 1, 1))))
      }
    }
    // The hubcap: off it pops, lands on the drive on the next downbeat, wobbles, and rolls away out of sight.
    if (T >= TYRE && T < FIXED) {
      const fly = HUBCAP - TYRE
      const s = T - TYRE
      let hx: number
      let hy: number
      let tilt = 0
      if (s < fly) {
        const u = s / fly
        hx = REAR - 0.45 * u
        hy = WHEEL + (-1.02 - 0.03 - WHEEL) * u - 4 * 0.2 * u * (1 - u)
        tilt = s * 14
      } else {
        const r = s - fly
        hx = REAR - 0.45 - 0.55 * r
        hy = -1.05 - 0.03 * Math.abs(Math.sin(r * 10)) * Math.exp(-r / 0.25)
        tilt = 1.4 + r * 5
      }
      p.stroke(alpha(p, INK, 0.8))
      p.strokeWeight(weight * 0.5)
      p.fill(HOME.trim)
      p.ellipse(x(hx), x(hy), x(HUBCAP_D), x(HUBCAP_D * Math.abs(Math.cos(tilt)) + 0.02))
      p.noFill()
      p.ellipse(x(hx), x(hy), x(HUBCAP_D * 0.5), x(HUBCAP_D * 0.5 * Math.abs(Math.cos(tilt)) + 0.01))
    }
    p.pop()
    // Seen through glass.
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', 0.1))
    p.rect(x(x0), x(-3), x(x1 - x0), x(2.2))
    p.pop()
    weather(p, k, T, LEFT_WIN, 1)
  })
  frameOver(p, k, weight, LEFT_WIN)
  curtains(p, c, T, LEFT_WIN, 1)
}

/** The garden's big tree through the right-hand window: it stirs in the breeze, sways in the storm, and loses its great limb. */
function garden(p: p5, c: Ctx, T: number, f: Frame): void {
  const { k, weight } = c
  const x = X(k)
  const [x0, x1] = RIGHT_WIN
  const { storm } = stormAt(T)
  const sway = storm * (0.07 * Math.sin(T * 2.1) + 0.04 * Math.sin(T * 3.7 + 1)) + 0.012 * wobble(T, 17, 2.8)
  clipTo(p, k, RIGHT_WIN, () => {
    p.push()
    p.rectMode(p.CORNER)
    p.noStroke()
    // Far off: the street and the houses across it, behind the garden's hedge; the lawn the tree stands in.
    view(p, c, T, f, 1)
    p.noStroke()
    p.fill(mixHex(HOME.grass, '#A7BC90', 0.3))
    p.rect(x(x0), x(-1.25), x(x1 - x0), x(0.3))
    // The trunk, leaning with the wind.
    p.stroke(alpha(p, INK, 0.7))
    p.strokeWeight(weight * 0.6)
    p.fill(HOME.bark)
    p.quad(x(9.62), x(-0.95), x(9.98), x(-0.95), x(9.92 + sway), x(-2.05), x(9.72 + sway), x(-2.05))
    // The crown: soft masses, no outline; the great limb on the left goes at the blow.
    const gone = T >= TREE ? smoothstep((T - TREE) / 0.5) : 0
    p.noStroke()
    const clumps: [number, number, number, number][] = [
      [9.1, -2.35, 0.8, 0], [9.85, -2.55, 0.95, 0], [10.6, -2.3, 0.8, 0], [9.5, -1.95, 0.6, 0], [10.3, -1.9, 0.6, 0],
      [8.75, -2.75, 0.75, 1], [9.3, -2.95, 0.7, 1],
    ]
    for (const [cx, cy, r, limb] of clumps) {
      const off = limb ? gone : 0
      const lx = cx + sway * (1.3 + (cy + 2) * -0.3) + off * 1.4
      const ly = cy - off * 1.6
      if (limb && off > 0.999) continue
      p.fill(mixHex(HOME.leaf, '#5E8A4C', hash(cx * 10, 3, 1) * 0.5))
      p.ellipse(x(lx), x(ly), x(r * 1.25), x(r))
    }
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', 0.1))
    p.rect(x(x0), x(-3), x(x1 - x0), x(2.2))
    p.pop()
    weather(p, k, T, RIGHT_WIN, 2)
  })
  frameOver(p, k, weight, RIGHT_WIN)
  curtains(p, c, T, RIGHT_WIN, 2)
}

/* ------------------------------------------------------------------ the lamp and the ladder */

/**
 * The pendant's swing: the house's knocks (`lampAt`), and under them a hair of its own, the room's air moving it, so it
 * is never quite still.
 */
const lampSwing = (T: number): number => lampAt(T).swing + 0.011 * Math.sin((2 * Math.PI * T) / 1.85) * (0.6 + 0.4 * wobble(T, 61, 3.1))

function lampLight(p: p5, k: number, T: number): void {
  const { lit } = lampAt(T)
  if (lit <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // Hung from the ceiling and swinging with the lamp: a soft cone of light down from its rim onto the wall, so that
  // when it sputters and goes out the room is seen to lose it. Drawn before the window, which stands over it: the
  // light lands on the paper round the glass, not on the street seen through it.
  ctx.translate(LAMP.x * k, LAMP.ceil * k)
  ctx.rotate(lampSwing(T))
  const rim = LAMP.cord + 0.2 * LAMP_SCALE
  const cone = ctx.createLinearGradient(0, rim * k, 0, (rim + 1.8) * k)
  cone.addColorStop(0, `rgba(255, 232, 178, ${0.44 * lit})`)
  cone.addColorStop(1, 'rgba(255, 232, 178, 0)')
  ctx.fillStyle = cone
  ctx.beginPath()
  ctx.moveTo(-0.17 * k, rim * k)
  ctx.lineTo(0.17 * k, rim * k)
  ctx.lineTo(0.8 * k, (rim + 1.8) * k)
  ctx.lineTo(-0.8 * k, (rim + 1.8) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** The lamp's shade and bulb, drawn this much over their measures (the cord, and the light, are as they were). */
const LAMP_SCALE = 1.5

function lamp(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const { lit } = lampAt(T)
  p.push()
  p.translate(x(LAMP.x), x(LAMP.ceil))
  p.rotate(lampSwing(T))
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.5)
  p.line(0, 0, 0, x(LAMP.cord))
  p.translate(0, x(LAMP.cord))
  // Half as big again as it was drawn: small at the frame's top, its going out was not seen, and it is why he climbs.
  p.scale(LAMP_SCALE)
  // The bulb under the rim: bright and warm when lit, dark when it has gone, so the reason he climbs is seen (a fresh
  // viewer, with a pale bulb and a faint glow, did not see the lamp go out at all).
  p.noStroke()
  p.fill(lit > 0.01 ? mixHex('#E6E1D6', '#FFD86B', lit) : '#6E6A64')
  p.ellipse(0, x(0.22), x(0.12), x(0.1))
  if (lit > 0.5) {
    p.fill(alpha(p, '#FFFBEA', lit))
    p.ellipse(0, x(0.215), x(0.05), x(0.04))
  }
  // The shade: a cream bell.
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.7)
  p.fill(HOME.trim)
  p.beginShape()
  p.vertex(x(-0.07), 0)
  p.vertex(x(0.07), 0)
  p.bezierVertex(x(0.12), x(0.08), x(0.17), x(0.14), x(0.19), x(0.2))
  p.vertex(x(-0.19), x(0.2))
  p.bezierVertex(x(-0.17), x(0.14), x(-0.12), x(0.08), x(-0.07), 0)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The stepladder: two rails, two treads, a top; rocked about one foot when it is kicked. */
function ladder(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const rock = ladderAt(T)
  const foot: Pt = rock >= 0 ? [LADDER.front, INSIDE.ground] : [LADDER.rear, INSIDE.ground]
  const wood = mixHex(HOME.wood, '#A88C70', AGE(T) * 0.6)
  p.push()
  p.translate(x(foot[0]), x(foot[1]))
  p.rotate(rock)
  p.translate(-x(foot[0]), -x(foot[1]))
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(wood, INK, 0.15))
  // The rear rail, then the spreader, the front rail with its treads, the top.
  p.quad(x(LADDER.rear), x(0.13), x(LADDER.rear + 0.07), x(0.13), x(LADDER.topX - 0.01), x(LADDER.top), x(LADDER.topX - 0.07), x(LADDER.top))
  p.line(x(3.5), x(-0.85), x(3.86), x(-0.85))
  p.fill(wood)
  p.quad(x(LADDER.front - 0.07), x(0.13), x(LADDER.front), x(0.13), x(LADDER.topX + 0.1), x(LADDER.top), x(LADDER.topX + 0.03), x(LADDER.top))
  p.rectMode(p.CORNER)
  for (const top of [-0.62, -1.25]) {
    const rail = LADDER.front + (top - 0.13) * (0.33 / 2.13)
    p.rect(x(rail - 0.17), x(top), x(0.36), x(0.05), x(0.01))
  }
  p.rect(x(LADDER.topX - 0.14), x(LADDER.top - 0.06), x(0.3), x(0.07), x(0.01))
  p.pop()
}

/* ------------------------------------------------------------------ the seesaw and the coin box */

function seesaw(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const phi = plankAt(T)
  const wood = mixHex(HOME.wood, '#A88C70', AGE(T) * 0.6)
  // The coin box's back and its heap of brass (the cup dips into it).
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(HOME.woodDark, INK, 0.2))
  p.rect(x(BOX.x0 + 0.03), x(BOX.rim - 0.06), x(BOX.x1 - BOX.x0 - 0.06), x(0.12))
  p.noStroke()
  p.fill(HOME.brass)
  p.beginShape()
  p.vertex(x(BOX.x0 + 0.04), x(BOX.rim + 0.05))
  p.bezierVertex(x(BOX.x0 + 0.12), x(BOX.rim - 0.1), x(BOX.x1 - 0.12), x(BOX.rim - 0.1), x(BOX.x1 - 0.04), x(BOX.rim + 0.05))
  p.endShape(p.CLOSE)
  // The trestle.
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.woodDark)
  p.quad(x(AXLE[0] - 0.17), x(0.13), x(AXLE[0] + 0.17), x(0.13), x(AXLE[0] + 0.07), x(AXLE[1] + 0.02), x(AXLE[0] - 0.07), x(AXLE[1] + 0.02))
  // The plank, its counterweight hung under the cup's side, the cup at its end.
  p.push()
  p.translate(x(AXLE[0]), x(AXLE[1]))
  p.rotate(phi)
  p.fill(HOME.section)
  p.line(x(0.5), x(0.035), x(0.5), x(0.13))
  p.rect(x(0.43), x(0.13), x(0.14), x(0.11), x(0.02))
  p.fill(wood)
  p.rect(x(-HALF), x(-0.035), x(2 * HALF), x(0.07), x(0.015))
  // The cup: a small tin scoop, full while it rests in the box.
  p.fill('#B9B3A6')
  p.beginShape()
  p.vertex(x(CUP - 0.11), x(-0.035))
  p.bezierVertex(x(CUP - 0.11), x(-0.16), x(CUP + 0.11), x(-0.16), x(CUP + 0.11), x(-0.035))
  p.endShape()
  const since = T - Math.max(-Infinity, ...SLAMS.filter((s) => s <= T))
  const full = !(since >= 0.03 && since < 0.7)
  if (full) {
    p.noStroke()
    p.fill(HOME.brass)
    p.ellipse(x(CUP), x(-0.1), x(0.18), x(0.05))
  }
  p.pop()
  p.stroke(alpha(p, INK, 0.9))
  p.fill(INK)
  p.circle(x(AXLE[0]), x(AXLE[1]), x(0.045))
  // The box's front wall, over the cup's bowl.
  p.fill(HOME.woodDark)
  p.rect(x(BOX.x0), x(BOX.rim), x(BOX.x1 - BOX.x0), x(0.13 - BOX.rim))
  p.stroke(alpha(p, INK, 0.35))
  p.line(x(BOX.x0 + 0.05), x(-0.04), x(BOX.x1 - 0.05), x(-0.04))
  p.pop()
}

/**
 * Each handful in the air: five coins off the cup on a stroke, a loose spray that closes up over the room and drops
 * into the lid's slot one after another on the next downbeat, turning as they go. Their flight is flatter
 * than a thrown ball's (the cup flings them hard), so the whole of it stays in the frame over the machine.
 */
const COIN_G = 6.2
function handfuls(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  SLAMS.forEach((slam, i) => {
    for (let j = 0; j < HANDFUL; j++) {
      const r = slam + 0.03 + j * 0.02
      const land = LANDS[i] + j * COIN_GAP
      if (T < r || T >= land) continue
      const [sx, sy] = cupAt(r)
      const off = j - (HANDFUL - 1) / 2
      const from: Pt = [sx + off * 0.035, sy - 0.015 * Math.abs(off)]
      const to: Pt = [SLOT[0] + off * 0.02, SLOT[1]]
      const D = land - r
      const u = (T - r) / D
      // Spread apart in the air (each its own height), together again at the slot.
      const arc = ((COIN_G * D * D) / 8) * (1 + 0.07 * off)
      const spread = 0.09 * off * Math.sin(Math.PI * u)
      const cx = from[0] + (to[0] - from[0]) * u + spread
      const cy = from[1] + (to[1] - from[1]) * u - arc * 4 * u * (1 - u)
      coin(p, k, weight, cx, cy, (T - r) * (9 + j * 2.3) + j, 0.25 * off)
    }
  })
}

/* ------------------------------------------------------------------ the jar in its cradle, and the chute */

const BRASS = '#B8912F'
const BRASS_DARK = '#8E6B1F'
const TIN = '#B9B3A6'
const TIN_DARK = '#8F897D'

/** The trough's direction (unit) and its normal (pointing up off it), and a point `d` down it, `up` off its floor. */
const DIR: Pt = [(CHUTE.foot[0] - CHUTE.top[0]) / CHUTE_LEN, (CHUTE.foot[1] - CHUTE.top[1]) / CHUTE_LEN]
const NRM: Pt = [DIR[1], -DIR[0]]
const along = (d: number, up = 0): Pt => [CHUTE.top[0] + DIR[0] * d + NRM[0] * up, CHUTE.top[1] + DIR[1] * d + NRM[1] * up]
const ANGLE = Math.atan2(DIR[1], DIR[0])

/** The chute's back: the hopper's inside and the trough's dark bed (the coins slide in front of these). */
function chuteBack(p: p5, c: Ctx): void {
  const { k, weight } = c
  const x = X(k)
  const [hx, hy] = CHUTE.top
  const hw = CHUTE.hopper / 2
  p.push()
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  // The wall slot at its foot: dark, with a brass lip, a little taller than the trough.
  const [fx, fy] = CHUTE.foot
  p.push()
  p.translate(x(fx), x(fy))
  p.rotate(ANGLE)
  p.fill(BRASS)
  p.rectMode(p.CENTER)
  p.rect(x(0.02), x(-0.02), x(0.09), x(0.2), x(0.03))
  p.noStroke()
  p.fill(mixHex(INK, '#000000', 0.2))
  p.rect(x(0.02), x(-0.02), x(0.045), x(0.14), x(0.02))
  p.pop()
  // The trough's bed, seen from the side: a dark channel, the coins run in it.
  const a0 = along(0.02, -0.03)
  const a1 = along(CHUTE_LEN - 0.02, -0.03)
  const b1 = along(CHUTE_LEN - 0.02, 0.1)
  const b0 = along(0.02, 0.1)
  p.fill(mixHex(TIN_DARK, INK, 0.25))
  p.quad(x(a0[0]), x(a0[1]), x(a1[0]), x(a1[1]), x(b1[0]), x(b1[1]), x(b0[0]), x(b0[1]))
  // The hopper's inside.
  p.fill(mixHex(TIN_DARK, INK, 0.3))
  p.quad(x(hx - hw), x(hy - 0.17), x(hx + hw), x(hy - 0.17), x(hx + 0.08), x(hy + 0.02), x(hx - 0.08), x(hy + 0.02))
  p.pop()
}

/** The chute's front: the hopper's near face and the trough's near lip, over the coins in them; two brackets to the wall. */
function chuteFront(p: p5, c: Ctx): void {
  const { k, weight } = c
  const x = X(k)
  const [hx, hy] = CHUTE.top
  const hw = CHUTE.hopper / 2
  p.push()
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  // The near lip: a tin strip along the trough's lower half.
  const a0 = along(0.0, -0.06)
  const a1 = along(CHUTE_LEN, -0.06)
  const b1 = along(CHUTE_LEN, 0.02)
  const b0 = along(0.0, 0.02)
  p.fill(TIN)
  p.quad(x(a0[0]), x(a0[1]), x(a1[0]), x(a1[1]), x(b1[0]), x(b1[1]), x(b0[0]), x(b0[1]))
  // The hopper's near face: a tin funnel, wide at its mouth, rolled at its rim.
  p.quad(x(hx - hw), x(hy - 0.12), x(hx + hw), x(hy - 0.12), x(hx + 0.09), x(hy + 0.03), x(hx - 0.09), x(hy + 0.03))
  p.fill(mixHex(TIN, '#FFFFFF', 0.25))
  p.rect(x(hx - hw - 0.02), x(hy - 0.15), x(2 * hw + 0.04), x(0.035), x(0.015))
  // Two brackets holding it to the wall.
  p.fill(BRASS_DARK)
  for (const d of [0.32, 0.72]) {
    const q = along(d * CHUTE_LEN, -0.075)
    p.push()
    p.translate(x(q[0]), x(q[1]))
    p.rotate(ANGLE)
    p.rect(x(-0.025), x(-0.02), x(0.05), x(0.05), x(0.01))
    p.pop()
  }
  p.pop()
}

/** Where the cradle is fixed: a brass plate on the mantle's front at its right end, the knuckle the cradle turns on. */
function bracket(p: p5, c: Ctx): void {
  const { k, weight } = c
  const x = X(k)
  const [hx, hy] = HINGE
  p.push()
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.fill(BRASS_DARK)
  p.quad(x(hx - 0.1), x(hy + 0.005), x(hx + 0.1), x(hy + 0.005), x(hx + 0.06), x(hy + 0.13), x(hx - 0.06), x(hy + 0.13))
  p.pop()
}

/** The torsion spring round the knuckle, wound as the jar goes over, and the knuckle's barrel and pin over it. */
function knuckle(p: p5, c: Ctx, tilt: number): void {
  const { k, weight } = c
  const x = X(k)
  const [hx, hy] = HINGE
  p.push()
  p.translate(x(hx), x(hy))
  p.noFill()
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.5)
  p.beginShape()
  const turns = 1.6 + 0.3 * (tilt / 1.9)
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    const a = -Math.PI / 2 + tilt * 0.5 + u * turns * 2 * Math.PI
    const r = 0.05 + 0.04 * u
    p.vertex(x(r * Math.cos(a)), x(r * Math.sin(a)))
  }
  p.endShape()
  p.fill(BRASS)
  p.strokeWeight(weight * 0.6)
  p.circle(0, 0, x(0.075))
  p.noStroke()
  p.fill(INK)
  p.circle(0, 0, x(0.022))
  p.pop()
}

/** The cradle, in the jar's own frame (its bottom middle, turned with it): a base plate and two side straps (behind the glass's edges), and the band across its front (over it). */
function cradle(p: p5, c: Ctx, bx: number, by: number, tilt: number, front: boolean): void {
  const { k, weight } = c
  const x = X(k)
  const w = JAR_W
  p.push()
  p.translate(x(bx), x(by))
  p.rotate(tilt)
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.fill(BRASS)
  if (!front) {
    // The straps up each side, and the plate it stands on.
    p.rect(x(-w / 2 - 0.035), x(-0.36 * JAR_H), x(0.035), x(0.36 * JAR_H + 0.02), x(0.01))
    p.rect(x(w / 2), x(-0.36 * JAR_H), x(0.035), x(0.36 * JAR_H + 0.02), x(0.01))
    p.rect(x(-w / 2 - 0.045), x(-0.005), x(w + 0.09), x(0.04), x(0.01))
  } else {
    // The band round its belly, below the painting, with a rivet at each end.
    p.rect(x(-w / 2 - 0.035), x(-0.33 * JAR_H), x(w + 0.07), x(0.045), x(0.012))
    p.noStroke()
    p.fill(BRASS_DARK)
    for (const s of [-1, 1]) p.circle(x(s * (w / 2 + 0.0)), x(-0.33 * JAR_H + 0.022), x(0.022))
  }
  p.pop()
}

/** The jar on the mantle, in its cradle: tipped over its right-hand foot on the knuckle, it pours into the chute. */
function jar(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const { tilt, lid, jolt } = jarAt(T)
  const [bx, by] = jarBase(tilt)
  bracket(p, c)
  cradle(p, c, bx, by - jolt, tilt, false)
  const dust = clamp01((AGE(T) - 0.3) * 1.6)
  drawJar(p, k, weight, bx, by - jolt, { fill: fillAt(T), lid, tilt, dust })
  cradle(p, c, bx, by - jolt, tilt, true)
  knuckle(p, c, tilt)
  void MANTLE
}

/**
 * What each pour lets go: coins streaming off the jar's mouth into the hopper, sliding down the trough, and gone
 * through the slot in the wall. Drawn between the chute's back and its front, so they run in it.
 */
function spill(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  POURS.forEach((pour, n) => {
    if (T < pour.stop - 0.1 || T > pour.stop + 2.5) return
    const count = [22, 14, 10][n]
    for (let j = 0; j < count; j++) {
      const r = pour.stop - 0.06 + (j / count) * 0.8 + hash(j, n, 2) * 0.03
      if (T < r) continue
      const [mx, my] = jarMouth(jarAt(r).tilt)
      const vx = 0.1 + 0.25 * hash(j, n, 5)
      const vy = 0.15 + 0.2 * hash(j, n, 6)
      // Down from the mouth into the hopper.
      const into = CHUTE.top[1] - 0.05
      const tf = (-vy + Math.sqrt(vy * vy + 2 * G * Math.max(0.01, into - my))) / G
      const s = T - r
      if (s < tf) {
        coin(p, k, weight, mx + vx * s, my + vy * s + 0.5 * G * s * s, s * (9 + 6 * hash(j, n, 8)), 0.4)
        continue
      }
      // Then down the trough, gathering speed, flat on it; into the slot at its foot, and gone.
      const q = s - tf
      const d = 0.55 * q + 2.6 * q * q
      if (d > CHUTE_LEN + 0.02) continue
      const hx = mx + vx * tf
      const settle = clamp01(q / 0.12)
      const [ax, ay] = along(Math.max(0, d), 0.048)
      const cx = hx + (ax - hx) * settle
      const cy = into + (ay - into) * settle
      const a = 1 - smoothstep((d - (CHUTE_LEN - 0.08)) / 0.1)
      coin(p, k, weight, cx, cy, 0.55 + 0.15 * hash(j, n, 3), ANGLE * settle + 0.4 * (1 - settle), a)
    }
  })
}

/**
 * The afternoon's sun through the two windows, lying down the wall under each to the floor: a soft slanted patch the
 * window's width (three layers, each a little larger, for a soft edge) that leans further and warms as the afternoon
 * goes on, so it travels slowly through the scene. The storm puts it out; it comes back on its beat when the sun
 * breaks through, warm in both panes, and settles.
 */
function sunlight(p: p5, k: number, T: number): void {
  const before = T < SUN ? 0.55 * (1 - smoothstep((T - (PUSH2 - 0.6)) / 2.2)) : 0
  const sun = Math.max(before, sunAt(T))
  if (sun <= 0.01) return
  const u = clamp01((T - 103) / 38)
  const lean = 0.45 + 0.75 * u
  const [r, g, b] = [255, Math.round(227 - 14 * u), Math.round(166 - 22 * u)]
  const a = 0.3 * sun
  const edge = 0.3 * a
  const inner = 1 - (1 - a) / ((1 - edge) * (1 - edge))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  for (const [x0, x1, y0, y1] of [LEFT_WIN, RIGHT_WIN]) {
    // Once the sun is back, the glass itself is bright with it.
    if (T >= SUN) {
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 * sunAt(T)})`
      ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    }
    const top = y1 + 0.1
    const foot = INSIDE.ground
    for (const [grow, f] of [[0.1, edge], [0.05, edge], [0, inner]] as [number, number][]) {
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${f})`
      ctx.beginPath()
      ctx.moveTo((x0 - grow) * k, top * k)
      ctx.lineTo((x1 + grow) * k, top * k)
      ctx.lineTo((x1 + lean + grow) * k, foot * k)
      ctx.lineTo((x0 + lean - grow) * k, foot * k)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the fire */

const FIRE_OUTER = mixHex(mixHex(CHURCH.flame, HOME.roof, 0.42), '#3A2E2A', 0.08)
const FIRE_INNER = mixHex(HOME.yellow, CHURCH.flame, 0.35)
/** The tongues of the fire: across from the grate's middle, how tall, how wide. */
const TONGUES: [number, number, number][] = [[-0.28, 0.3, 0.16], [-0.1, 0.46, 0.22], [0.1, 0.4, 0.2], [0.28, 0.28, 0.16]]

/** How much fire there is (0 out .. 1 burning), and its lean: in the storm the wind down the chimney flattens it, and the rain puts it out. */
function fireAt(T: number): { life: number; lean: number } {
  const { storm } = stormAt(T)
  const knocked = T > TREE ? 0.65 * Math.exp(-(T - TREE) / 0.5) : 0
  const life = (1 - smoothstep((T - THUNDER) / 1.6)) * (1 - knocked)
  const lean = storm * (0.07 + 0.05 * wobble(T, 71, 0.6)) * (T < SUN ? 1 : 0)
  return { life, lean }
}

/**
 * A low fire in the grate, in the firebox's dark mouth behind his seesaw: two logs on an iron grate over their coals,
 * and flames that move in shape (each tongue its own height and sway, never a glow). It burns through their years in
 * this room until the storm: the wind down the chimney leans it, the blow knocks it flat, the rain puts it out, and a
 * thread of smoke rises from the wet logs.
 */
function hearth(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = X(k)
  const fx = INSIDE.fireplace
  const base = -0.03
  const { life, lean } = fireAt(T)
  p.push()
  // The coals, red while it burns, grey when it is out.
  p.noStroke()
  p.fill(mixHex('#5E4A44', '#9A4A32', life))
  p.ellipse(x(fx), x(0.04), x(0.8), x(0.07))
  // The flames, behind the near log.
  if (life > 0.02) {
    for (const [inside, colour, scale] of [[false, FIRE_OUTER, 1], [true, FIRE_INNER, 0.55]] as [boolean, string, number][]) {
      p.fill(colour)
      TONGUES.forEach(([dx, h0, w0], i) => {
        const h = h0 * scale * life * (0.82 + 0.22 * wobble(T, 40 + i, 0.46) + 0.08 * wobble(T, 50 + i, 0.23))
        const w = w0 * (inside ? 0.55 : 1) * (0.7 + 0.3 * life)
        if (h < 0.02) return
        const bx = fx + dx
        const tip = bx + 0.045 * wobble(T, 60 + i, 0.52) + lean * 1.4 * (h / 0.3)
        p.beginShape()
        p.vertex(x(bx - w / 2), x(base))
        p.bezierVertex(x(bx - w / 2), x(base - h * 0.5), x(tip - w * 0.18), x(base - h * 0.72), x(tip), x(base - h))
        p.bezierVertex(x(tip + w * 0.18), x(base - h * 0.72), x(bx + w / 2), x(base - h * 0.5), x(bx + w / 2), x(base))
        p.endShape(p.CLOSE)
      })
    }
  }
  // The logs, crossed a little, and the grate's bars in front of them.
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.55)
  p.fill(mixHex(HOME.bark, '#4A3A34', 1 - life))
  p.push()
  p.translate(x(fx - 0.12), x(-0.005))
  p.rotate(-0.08)
  p.rect(x(-0.24), x(-0.05), x(0.48), x(0.1), x(0.05))
  p.pop()
  p.push()
  p.translate(x(fx + 0.15), x(0.01))
  p.rotate(0.06)
  p.rect(x(-0.22), x(-0.045), x(0.44), x(0.09), x(0.045))
  p.pop()
  // The basket grate on its short legs.
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.noFill()
  p.line(x(fx - 0.42), x(0.05), x(fx + 0.42), x(0.05))
  for (const u of [-0.36, -0.12, 0.12, 0.36]) p.line(x(fx + u), x(0.05), x(fx + u), x(-0.05))
  for (const u of [-0.38, 0.38]) p.line(x(fx + u), x(0.05), x(fx + u), x(INSIDE.ground))
  // Out: a thread of smoke from the wet logs, up into the firebox's dark (clipped to its mouth).
  const wisp = (1 - smoothstep((T - THUNDER - 7) / 2)) * smoothstep((T - THUNDER - 0.4) / 0.8)
  if (wisp > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.moveTo((fx - 0.55) * k, INSIDE.ground * k)
    ctx.lineTo((fx - 0.55) * k, -0.55 * k)
    ctx.bezierCurveTo((fx - 0.55) * k, -0.85 * k, (fx + 0.55) * k, -0.85 * k, (fx + 0.55) * k, -0.55 * k)
    ctx.lineTo((fx + 0.55) * k, INSIDE.ground * k)
    ctx.closePath()
    ctx.clip()
    smoke(p, k, T, fx + 0.02, -0.06, { rate: 1.8, rise: 0.28, life: 2.4, drift: 0.02, size: 0.045, color: '#A49B92', a: 0.5 * wisp, seed: 5 })
    ctx.restore()
  }
  p.pop()
}

/* ------------------------------------------------------------------ the room, in order */

/** The storm's dark over the living room (and not over the two of them: they are the light in it). */
function dim(p: p5, k: number, T: number): void {
  const { storm } = stormAt(T)
  if (storm <= 0.01) return
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, HOME.night, 0.2 * storm))
  p.rect(-0.9 * k, INSIDE.ceil * k, 13.8 * k, (INSIDE.ground - INSIDE.ceil) * k)
  p.pop()
}

export function drawRoom(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const f = frame(p, k)
  lampLight(p, k, T)
  driveway(p, c, T, f)
  garden(p, c, T, f)
  hearth(p, c, T)
  drawChairs(p, k, weight, CHAIRS_X, INSIDE.ground, AGE(T) * 0.8)
  ladder(p, c, T)
  lamp(p, c, T)
  seesaw(p, c, T)
  handfuls(p, c, T)
  chuteBack(p, c)
  spill(p, c, T)
  chuteFront(p, c)
  jar(p, c, T)
  dim(p, k, T)
  sunlight(p, k, T)
  void onPlank
}
