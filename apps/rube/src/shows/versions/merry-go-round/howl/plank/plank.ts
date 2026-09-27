import type p5 from 'p5'
import { laneAt, mixHex, R, type Lane, type Pt } from '../../../../../parts'
import { calciferBody, drawCalcifer, drawTurnip, drawWings } from '../cast'
import { alpha, box, carried, frame, hash, part, smooth, type Company, type PartShot } from '../kit'
import { CASTLE, puff, drawLeg } from '../wastes/castle'
import { CALCIFER, HOWL, HOWL_BIRD, WASTES } from '../worlds'
import { COLLAPSE_HITS, drawCollapse } from './plank-collapse'
import { drawBack, drawGround, STONES } from './plank-land'
import {
  BUCKLE, BX0, c, calciferAt, deck, DECK, DOWN, drive, FOOTFALLS, FREE, GLANCE, GO, ground, HEART, HOWL_IN, HOWL_LAND,
  HOVER_AT, howlAt, howlU, IMPACT, LAND, legAt, LEGS, LIFT_OUT, onDeck, phaseOfBar, PUT, RAISE, ring, sophieAt, sophieU,
  STIR, T0, T1, turnipAt, wingsAt, YG, type Deck,
} from './plank-rig'

/**
 * Tending him on the run: on c14, c15 and c16 (pairs of feet landing on each), the lurch of every stride rocks her
 * back half a pace from the grate, and on each downbeat she comes in to him at its rim again, and he flares up and
 * looks round at her. Eased both ways, so she never jerks; outside it she is exactly where the rig has her (at the
 * grate's rim: she never steps into it).
 */
const TENDS = [c(14), c(15), c(16)]
/** 0..1: how far in to him she is at a downbeat (1 on it), eased in over 0.4 s and out over 0.6 s. */
function tend(t: number): number {
  for (const b of TENDS) {
    if (t >= b - 0.4 && t <= b) return smooth(t, b - 0.4, b)
    if (t > b && t <= b + 0.6) return 1 - smooth(t, b, b + 0.6)
  }
  return 0
}
/** How far back along the deck the run rocks her between downbeats. */
const TEND_BACK = 0.2
function tendOff(t: number): number {
  const w = smooth(t, TENDS[0] - 1.0, TENDS[0] - 0.4) * (1 - smooth(t, TENDS[2] + 0.6, TENDS[2] + 1.3))
  return -TEND_BACK * w * (1 - tend(t))
}
/**
 * Howl coming home (c20 → c22): the deck jolts under his landing on the loudest note and she starts up off the boards
 * with it, then turns from Calcifer's grate toward the prow (a lean, at the grate's rim), and settles back to lift
 * Calcifer out on c23. Eased both ways: the start rises from rest over 0.2 s and comes down over half a second.
 */
function startle(t: number): number {
  return 0.1 * smooth(t, HOWL_LAND, HOWL_LAND + 0.2) * (1 - smooth(t, HOWL_LAND + 0.2, HOWL_LAND + 0.75))
}
function turnTo(t: number): number {
  return 0.06 * smooth(t, HOWL_LAND + 0.1, HOWL_LAND + 0.8) * (1 - smooth(t, LIFT_OUT - 0.75, LIFT_OUT - 0.05))
}
/**
 * The loss (c9 → c10): as the plank's first stroke tears it clear of the dust, she goes a step back along the deck
 * toward the stern, toward what is left of the castle on the moor behind her, and comes back to the grate by c10's
 * end. The camera frames that look: the wreck behind her.
 */
function lookBack(t: number): number {
  return -0.32 * smooth(t, GO - 0.15, GO + 0.5) * (1 - smooth(t, c(10) + 0.3, c(10) + 1.05))
}

/* ------------------------------------------------------------------ the stop's teeter */

/** Where the keel's front underside rests on the ledge: the stop tips the deck about it. */
const PIVOT_U = DECK.front - 0.75
const PIVOT_V = DECK.keel + 0.12
/**
 * On the stop the nose goes down over the lip about the keel's front (the back end lifts), hangs a moment on a
 * shiver, comes back, and rocks once more, smaller. Radians, nose down positive; nil before the stop and after 3 s.
 * The hit is sharp; the rest is long and damped.
 */
function teeter(t: number): number {
  const a = t - IMPACT
  if (a <= 0 || a >= 3) return 0
  const dip = 1 - Math.exp(-a / 0.07)
  const hang = 1 - smooth(a, 0.45, 1.35)
  const again = 0.3 * Math.sin(Math.PI * smooth(a, 1.35, 2.5))
  const shiver = 0.1 * Math.sin(a * 23) * Math.exp(-a / 0.2)
  return 0.1 * (dip * hang + again + shiver * dip)
}
/** The deck at `t`: the rig's, tipped about the keel's front on the stop. */
function deckAt(t: number): Deck {
  const d = deck(t)
  const tip = teeter(t)
  if (tip === 0) return d
  const [px, py] = onDeck(t, PIVOT_U, PIVOT_V, d)
  const cs = Math.cos(tip)
  const sn = Math.sin(tip)
  const dx = d.x - px
  const dy = d.y - py
  return { x: px + dx * cs - dy * sn, y: py + dx * sn + dy * cs, rot: d.rot + tip }
}

/** Sophie on the plank, with the look back, the tending on the run, her turn to Howl and the teeter (the rig's `sophieAt` otherwise, exactly). */
const herAt = (t: number): Pt => onDeck(t, sophieU(t) + lookBack(t) + tendOff(t) + turnTo(t), -R - startle(t), deckAt(t))
/** Howl: the rig's, riding the teeter once he is down. */
const howlX = (t: number): Pt => (t >= HOWL_LAND ? onDeck(t, howlU(t), -R, deckAt(t)) : howlAt(t))

/**
 * Calcifer watches the bird come down out of the sky: his eyes go up to him from c19 and follow him onto the prow, and
 * are his own again (forward, into the wind) by the time she lifts him out. How much, 0..1.
 */
function watching(t: number): number {
  return smooth(t, c(19) - 0.3, c(19) + 0.5) * (1 - smooth(t, HOWL_LAND + 0.9, LIFT_OUT - 0.3))
}

/**
 * Calcifer straining: every stride is his. On each footfall he flares and leans back into the wind (a sharp rise,
 * a third of a second to die), and dims between; the flares weaken as he fails, from the bird's coming to the lift.
 */
const STRIDES = [...new Set(FOOTFALLS.map((f) => Math.round(f.t * 1000) / 1000))].sort((a, b) => a - b)
function strain(t: number): number {
  let f = 0
  for (const b of STRIDES) {
    const a = t - b
    if (a > 0 && a < 1.2) f = Math.max(f, (1 - Math.exp(-a / 0.04)) * Math.exp(-a / 0.3) * 1.3)
  }
  return Math.min(1, f) * drive(t) * (1 - 0.5 * smooth(t, c(19), LIFT_OUT))
}

/**
 * Calcifer comes out of Howl's chest (FREE): a spark at his breast that swells to his full size and brightness over
 * `EMERGE` as it rises out of him onto the rig's spiral, joining it at the rig's own speed (the blend's rate is nil
 * at its end). Before FREE and after the swell, the rig's pose exactly.
 */
const EMERGE = 0.3
/**
 * The cadenza's star turns low over the two of them, over the gap between them (1.75 cells over their middles, the
 * top of his turn), not up at the crag's summit. The rig's hover (`HOVER_AT`, up and right, where the finale's dive
 * starts from) is moved here by an offset over the whole of his coming down, and handed back after the cadenza's last
 * note: from 291.95 to the tutti's downbeat (292.734) he lifts up and right into the rig's place, eased from rest to
 * rest, gathering for the dive over their heads into the grate. `PLANK_END.star` stays the rig's.
 */
const OVER: Pt = (() => {
  const s = sophieAt(T1)
  const h = howlAt(T1)
  const hv = HOVER_AT()
  return [(s[0] + h[0]) / 2 + 0.06 - hv[0], (s[1] + h[1]) / 2 - 1.75 - hv[1]]
})()
const OVER_BACK = 291.95
function overThem(t: number, at: Pt): Pt {
  if (t < 280 || t > T1) return at
  const w = 1 - smooth(t, OVER_BACK, T1)
  return [at[0] + OVER[0] * w, at[1] + OVER[1] * w]
}

function freed(t: number, cal0: ReturnType<typeof calciferAt>): ReturnType<typeof calciferAt> & { light: number } {
  const cal = { ...cal0, at: overThem(t, cal0.at) }
  if (t < FREE || t >= FREE + EMERGE || !cal.shown) return { ...cal, light: 1 }
  const e = smooth(t, FREE, FREE + EMERGE)
  const [hx, hy] = howlX(t)
  // His breast, high on the front of Howl's ball (the ball is drawn over the parts), so the spark shows over its
  // crown from the first frame.
  const chest: Pt = [hx + 0.04, hy - 0.125]
  return {
    ...cal,
    at: [chest[0] + (cal.at[0] - chest[0]) * e, chest[1] + (cal.at[1] - chest[1]) * e],
    size: cal.size * (0.25 + 0.75 * e),
    light: 0.5 + 0.5 * e,
  }
}

/**
 * Howl is spent: on each of his last heavy strokes a feather or two tears loose from his wings, and more on the
 * landing, and they tumble away behind the running plank, falling slowly and fading. Blades like his own, never round.
 */
const SHED: { t: number; n: number }[] = [
  { t: 264.649, n: 1 },
  { t: 265.427, n: 1 },
  { t: HOWL_LAND, n: 2 },
]
const SHED_LIFE = 2.4
function drawFeathers(p: p5, k: number, W: number, ink: string, t: number) {
  const edge = mixHex(HOWL_BIRD, '#6F6A86', 0.5)
  for (const [si, sh] of SHED.entries()) {
    const a = t - sh.t
    if (a <= 0 || a > SHED_LIFE) continue
    const [bx, by] = howlX(sh.t)
    const [bx0, by0] = howlX(sh.t - 0.05)
    // His speed as it tears loose; the air takes it off in about a third of a second.
    const vx = (bx - bx0) / 0.05
    const vy = (by - by0) / 0.05
    const drag = 0.32
    const carry = drag * (1 - Math.exp(-a / drag))
    for (let j = 0; j < sh.n; j++) {
      const side = j % 2 ? 1 : -1
      const r = hash(si, j, 61)
      const x0 = bx + side * (0.35 + 0.3 * r)
      const y0 = by - 0.05 - 0.15 * hash(si, j, 62)
      // Falling slowly, rocking side to side as a feather does.
      const x = x0 + vx * carry * 0.6 - 0.25 * a + 0.12 * Math.sin(a * (3.2 + r) + j)
      const y = y0 + vy * carry * 0.4 + 0.38 * a + 0.06 * a * a
      const fade = 1 - smooth(a, SHED_LIFE * 0.55, SHED_LIFE)
      // A flight feather: a broad vane, round at the tip, narrowing to its quill.
      const len = 0.4 + 0.08 * hash(si, j, 63)
      const wid = 0.075
      p.push()
      p.translate(x * k, y * k)
      p.rotate(side * 0.6 + 1.1 * Math.sin(a * (2.4 + r) + si) + 0.4 * a)
      p.stroke(alpha(p, ink, 0.85 * fade))
      p.strokeWeight(W * 0.5)
      p.fill(alpha(p, j % 2 ? edge : HOWL_BIRD, fade))
      p.beginShape()
      p.vertex(-len * 0.5 * k, 0)
      p.bezierVertex(-len * 0.2 * k, -wid * 0.7 * k, len * 0.25 * k, -wid * 1.1 * k, len * 0.5 * k, -wid * 0.2 * k)
      p.bezierVertex(len * 0.56 * k, wid * 0.35 * k, len * 0.2 * k, wid * 0.8 * k, -len * 0.5 * k, 0)
      p.endShape(p.CLOSE)
      p.pop()
    }
  }
}

/**
 * Granite tors on the moor along the run: stacked slabs of weathered rock with heather at their feet, the plank's
 * legs striding past them, so its speed reads across the locked-off wides. Only on the flat moor, ahead of the wreck.
 */
const TORS: { x: number; h: number; lean: number }[] = [
  { x: 14.5, h: 1.7, lean: 0.12 },
  { x: 22.5, h: 2.6, lean: -0.08 },
  { x: 31, h: 1.35, lean: 0.1 },
  { x: 40.5, h: 2.2, lean: -0.12 },
]
const TOR = mixHex(WASTES.rock, WASTES.stone, 0.35)
const TOR_SHADE = mixHex(WASTES.rockDark, WASTES.rock, 0.25)

/** One tor: three or four slabs, each narrower than the one under it, set a little askew, stacked from `g` at x. */
function torAt(p: p5, k: number, W: number, ink: string, x: number, g: number, h: number, lean: number, seed: number, fill = TOR, shade = TOR_SHADE) {
  const slabs: [number, number, number, number][] = []
  let y = g + 0.06
  let w = h * 1.15
  let cx = x
  const count = h > 2 ? 4 : 3
  for (let i = 0; i < count; i++) {
    const hh = (h / count) * (1.05 - 0.12 * i + 0.1 * hash(seed, i, 51))
    slabs.push([cx, y - hh, hh, w])
    y -= hh - 0.02
    cx += lean * hh + (hash(seed, i, 52) - 0.5) * 0.18
    w *= 0.72 + 0.1 * hash(seed, i, 53)
  }
  p.push()
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  for (const [sx, top, hh, sw] of slabs) {
    p.fill(fill)
    p.rect((sx - sw / 2) * k, top * k, sw * k, hh * k, Math.min(sw, hh) * 0.42 * k)
    // The shade under each slab's belly and down its lee side.
    p.push()
    p.noStroke()
    p.fill(alpha(p, shade, 0.75))
    p.rect((sx - sw / 2 + 0.06) * k, (top + hh * 0.62) * k, (sw - 0.12) * k, hh * 0.3 * k, hh * 0.15 * k)
    p.rect((sx + sw * 0.18) * k, (top + 0.05) * k, sw * 0.26 * k, hh * 0.85 * k, hh * 0.13 * k)
    p.pop()
  }
  p.pop()
}

function drawTors(p: p5, k: number, W: number, ink: string, f: { x0: number; x1: number }) {
  for (const [n, tor] of TORS.entries()) {
    if (tor.x < f.x0 - 3 || tor.x > f.x1 + 3) continue
    torAt(p, k, W, ink, tor.x, ground(tor.x), tor.h, tor.lean, n)
    // Heather and moss in clumps round its foot, of every size.
    p.push()
    p.noStroke()
    for (let j = 0; j < 9; j++) {
      const side = j % 2 ? 1 : -1
      const x = tor.x + side * (tor.h * 0.45 + 0.5 * hash(n, j, 54))
      const big = 0.5 + 0.9 * hash(n, j, 55)
      const gy = ground(x)
      p.fill(hash(n, j, 56) < 0.5 ? WASTES.heather : WASTES.heatherDeep)
      p.ellipse(x * k, (gy - 0.1 * big + 0.03) * k, 0.3 * big * k, 0.22 * big * k)
      if (hash(n, j, 57) < 0.4) {
        p.fill(mixHex(WASTES.moss, WASTES.rockDark, 0.2))
        p.ellipse((x + 0.12) * k, (gy - 0.02) * k, 0.4 * big * k, 0.1 * big * k)
      }
    }
    p.pop()
  }
}

/** A heather clump at (x, g): sprays of every size, never a row of beads. */
function heatherClump(p: p5, k: number, x: number, g: number, big: number, seed: number, dim = 0) {
  const n = 3 + Math.floor(hash(seed, 1, 23) * 4)
  p.push()
  p.noStroke()
  p.fill(mixHex(mixHex(WASTES.moss, WASTES.rockDark, 0.3), WASTES.night, dim))
  p.ellipse(x * k, (g - 0.03 * big) * k, 0.55 * big * k, 0.13 * big * k)
  for (let j = 0; j < n; j++) {
    const dx = (hash(seed, j, 25) - 0.5) * 0.5 * big
    const h = (0.12 + 0.22 * hash(seed, j, 26)) * big
    const w = (0.08 + 0.12 * hash(seed, j, 27)) * big
    p.fill(mixHex(hash(seed, j, 28) < 0.55 ? WASTES.heather : WASTES.heatherDeep, WASTES.night, dim))
    p.ellipse((x + dx) * k, (g - h * 0.5) * k, w * k, h * k)
  }
  p.pop()
}

/** A stone at rest, its foot at (x, g): a rounded lump of uneven outline with its shaded side. */
function stoneAt(p: p5, k: number, W: number, ink: string, x: number, g: number, r: number, seed: number, dim = 0) {
  const pts: Pt[] = []
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI
    const rr = r * (0.8 + 0.3 * hash(seed, i, 7))
    pts.push([x + Math.cos(a) * rr * 1.25, g + 0.04 + Math.sin(a) * rr * 0.85])
  }
  p.push()
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(mixHex(WASTES.rock, WASTES.night, dim))
  p.beginShape()
  for (const [px, py] of pts) p.vertex(px * k, py * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, mixHex(WASTES.rockDark, WASTES.night, dim), 0.8))
  p.beginShape()
  for (const [px, py] of pts.slice(5)) p.vertex(px * k, py * k)
  p.vertex(x * k, (g + 0.04) * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** A chip of rock, `r` across, turned `rot`: five uneven corners, never round. */
function chip(p: p5, k: number, x: number, y: number, r: number, rot: number, seed: number) {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(rot)
  p.beginShape()
  for (let j = 0; j < 5; j++) {
    const an = (j / 5) * Math.PI * 2 + 0.4 * hash(seed, j, 34)
    const rr = r * (0.7 + 0.45 * hash(seed, j, 33))
    p.vertex(Math.cos(an) * rr * k, Math.sin(an) * rr * 0.8 * k)
  }
  p.endShape(p.CLOSE)
  p.pop()
}

/* ------------------------------------------------------------------ the brink along the run */

/**
 * From c12 the plank runs along a gorge: the moor's near edge is a brink at the frame's foot, a rim of rock with the
 * gorge's depth under it going down into mist. It comes in from below on the right (the gorge swinging in to meet
 * the run) and swings away again before the brow, where the plank sits and slides.
 */
const BRINK = { in0: 9.5, in1: 15.5, out0: 35, out1: 43.5, y: YG + 0.45 }
function brinkDrop(x: number): number {
  return 8 * (1 - smooth(x, BRINK.in0, BRINK.in1)) + 8 * smooth(x, BRINK.out0, BRINK.out1)
}
function brinkY(x: number): number {
  return BRINK.y + brinkDrop(x) + 0.07 * Math.sin(x * 2.1 + 0.4) + 0.05 * Math.sin(x * 5.3) + 0.03 * Math.sin(x * 11.7)
}
const GORGE_DEEP = mixHex(mixHex(WASTES.slate, WASTES.night, 0.25), '#5F7AA6', 0.2)
const GORGE_MIST = mixHex(WASTES.mist, '#AEB8C8', 0.35)
const BRINK_ROCK = mixHex(WASTES.rock, WASTES.rockDark, 0.45)

function drawBrink(p: p5, k: number, W: number, ink: string, f: View) {
  const x0 = Math.max(f.x0 - 1, BRINK.in0 - 1)
  const x1 = Math.min(f.x1 + 1, BRINK.out1 + 1)
  if (x1 <= x0) return
  const step = Math.max(0.1, (f.x1 - f.x0) / 170)
  const xs: number[] = []
  for (let x = x0; x < x1; x += step) xs.push(x)
  xs.push(x1)
  const ys = xs.map(brinkY)
  if (Math.min(...ys) > f.y1 + 0.1) return
  const bottom = f.y1 + 2
  const face = (x: number) => 0.28 + 0.1 * Math.sin(x * 3.1 + 1) + 0.07 * Math.sin(x * 7.7)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  // The gorge's depth: cool shadow under the rim, going down into mist.
  const g = ctx.createLinearGradient(0, BRINK.y * k, 0, (BRINK.y + 4.5) * k)
  g.addColorStop(0, GORGE_DEEP)
  g.addColorStop(0.3, mixHex(GORGE_DEEP, GORGE_MIST, 0.45))
  g.addColorStop(1, GORGE_MIST)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(xs[0] * k, bottom * k)
  xs.forEach((x, i) => ctx.lineTo(x * k, ys[i] * k))
  ctx.lineTo(x1 * k, bottom * k)
  ctx.closePath()
  ctx.fill()
  // Wisps of mist drifting in the gorge, below the rim.
  for (let i = Math.floor(x0 / 3.2); i <= Math.ceil(x1 / 3.2); i++) {
    const x = i * 3.2 + hash(i, 91) * 2
    if (x < x0 || x > x1) continue
    const y = brinkY(x) + 1.1 + 0.9 * hash(i, 92)
    puff(p, k, x, y, 0.9 + 0.6 * hash(i, 93), WASTES.mist, 0.3, 0.35)
  }
  // The rock of the rim: a ragged band, its face in shade.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(BRINK_ROCK)
  p.beginShape()
  xs.forEach((x, i) => p.vertex(x * k, ys[i] * k))
  for (let i = xs.length - 1; i >= 0; i--) p.vertex(xs[i] * k, (ys[i] + face(xs[i])) * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, WASTES.rockDark, 0.7))
  p.beginShape()
  xs.forEach((x, i) => p.vertex(x * k, (ys[i] + face(x) * 0.55) * k))
  for (let i = xs.length - 1; i >= 0; i--) p.vertex(xs[i] * k, (ys[i] + face(xs[i])) * k)
  p.endShape(p.CLOSE)
  // Cracks down its face, now and then.
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(W * 0.55)
  for (let i = Math.floor(x0 / 0.9); i <= Math.ceil(x1 / 0.9); i++) {
    const x = i * 0.9 + hash(i, 94) * 0.5
    if (x < x0 || x > x1 || hash(i, 95) < 0.45) continue
    const y = brinkY(x)
    p.line(x * k, (y + 0.06) * k, (x + 0.06) * k, (y + face(x) * 0.8) * k)
  }
  p.pop()
  // Heather hanging on at the rim.
  for (let i = Math.floor(x0 / 1.1); i <= Math.ceil(x1 / 1.1); i++) {
    const x = i * 1.1 + hash(i, 96) * 0.7
    if (x < x0 || x > x1 || hash(i, 97) < 0.35 || brinkDrop(x) > 1.5) continue
    heatherClump(p, k, x, brinkY(x) + 0.03, 0.55 + 0.6 * hash(i, 98), 300 + i)
  }
}

/** Under each near foot along the brink, a bite of the rim breaks away and falls into the gorge, and the mist takes it. */
function drawCrumbs(p: p5, k: number, W: number, ink: string, t: number) {
  for (const [fi, ff] of FOOTFALLS.entries()) {
    if (LEGS[ff.leg].far) continue
    const fx = ff.x + 0.3
    if (brinkDrop(fx) > 0.4) continue
    const a0 = t - ff.t - 0.05
    if (a0 < 0 || a0 > 2.2) continue
    puff(p, k, fx, brinkY(fx) + 0.2 + a0 * 0.4, 0.2 + a0 * 0.45, mixHex(WASTES.rock, WASTES.mist, 0.5), 0.35 * Math.exp(-a0 / 0.45), 0.8)
    for (let j = 0; j < 4; j++) {
      const a = a0 - 0.12 * j * hash(fi, j, 80)
      if (a < 0) continue
      const r = 0.06 + 0.14 * hash(fi, j, 81)
      const x0 = fx - 0.35 + 0.7 * hash(fi, j, 82)
      const y0 = brinkY(x0) + 0.1 + r * 0.4
      const x = x0 + (0.5 * hash(fi, j, 83) - 0.1) * a
      const y = y0 + 0.4 * a + 3.6 * a * a
      const fade = 1 - smooth(y - y0, 0.5, 3.2)
      if (fade <= 0) continue
      p.push()
      p.stroke(alpha(p, ink, 0.9 * fade))
      p.strokeWeight(W * 0.6)
      p.fill(alpha(p, mixHex(BRINK_ROCK, GORGE_MIST, 0.5 * smooth(y - y0, 0.3, 2.5)), fade))
      chip(p, k, x, y, r, a * (2 + 3 * hash(fi, j, 84)), fi * 7 + j)
      p.pop()
    }
  }
}

/* ------------------------------------------------------------------ the near bank */

/**
 * A near bank of the moor, nearer than the feet, passing faster than the ground (and far faster than the range): a
 * dark rim of turf with heather, stones and now and then a low tor on it, at the foot of the frame while the plank
 * breaks clear and runs (c9 → c12). It moves up and down with the camera by its nearness too, so the wides above it
 * never see it; it ends before the brink comes in.
 */
const NEAR = { par: 1.45, eye: 3.4, end: 14 }
const NEAR_TURF = mixHex(mixHex(WASTES.moss, WASTES.rockDark, 0.5), WASTES.night, 0.14)
function nearTop(b: number): number {
  return YG + 0.55 + 0.08 * Math.sin(b * 0.83 + 0.3) + 0.05 * Math.sin(b * 2.3) + 3.6 * smooth(b, NEAR.end - 9, NEAR.end)
}
function drawNear(p: p5, k: number, W: number, ink: string, f: View) {
  const sx = f.cx * (1 - NEAR.par)
  const sy = (f.cy - NEAR.eye) * (1 - NEAR.par)
  const b0 = f.x0 - sx - 1
  const b1 = Math.min(f.x1 - sx + 1, NEAR.end + 0.5)
  if (b1 <= b0) return
  const step = Math.max(0.15, (f.x1 - f.x0) / 140)
  const bs: number[] = []
  for (let b = b0; b < b1; b += step) bs.push(b)
  bs.push(b1)
  if (Math.min(...bs.map((b) => nearTop(b) + sy)) - 1.4 > f.y1) return
  p.push()
  p.stroke(ink)
  p.strokeWeight(W * 1.1)
  p.fill(NEAR_TURF)
  p.beginShape()
  p.vertex((bs[0] + sx) * k, (f.y1 + 2) * k)
  for (const b of bs) p.vertex((b + sx) * k, (nearTop(b) + sy) * k)
  p.vertex((b1 + sx) * k, (f.y1 + 2) * k)
  p.endShape(p.CLOSE)
  p.pop()
  for (let i = Math.floor(b0 / 1.2) - 1; i <= Math.ceil(b1 / 1.2); i++) {
    const b = i * 1.2 + hash(i, 101) * 0.9
    if (b < b0 - 1 || b > NEAR.end - 6) continue
    const x = b + sx
    const g = nearTop(b) + sy + 0.04
    const kind = hash(i, 102)
    if (kind < 0.1) torAt(p, k, W, ink, x, g, 0.9 + 0.4 * hash(i, 103), (hash(i, 104) - 0.5) * 0.2, 500 + i, mixHex(TOR, WASTES.night, 0.2), mixHex(TOR_SHADE, WASTES.night, 0.2))
    else if (kind < 0.42) stoneAt(p, k, W, ink, x, g, 0.18 + 0.24 * hash(i, 105), 600 + i, 0.18)
    else heatherClump(p, k, x, g, 1.2 + 1.0 * hash(i, 106), 700 + i, 0.15)
  }
}

/* ------------------------------------------------------------------ the far side behind the brink */

/** The far range's colour (as `plank-land.ts` has it) and the deeper crag of it that rises behind the brink. */
const FAR_MTN = mixHex(mixHex(WASTES.slate, WASTES.mist, 0.3), '#5F7AA6', 0.3)
const CRAG = mixHex(FAR_MTN, WASTES.night, 0.32)
/** The gorge's far wall as `plank-land.ts` draws it (the crag rises from behind its top and never covers it). */
function farWall(cx: number) {
  const x0 = LAND.edge + 2.8 + (cx - LAND.edge) * 0.12
  const lip = LAND.ledge - 1.3
  const face = (y: number) => x0 + 0.3 * Math.sin(y * 1.7) + 0.18 * Math.sin(y * 4.1) + (y - lip) * 0.08
  return { x0, lip, face }
}
/**
 * The crag's height over the ledge, from its left foot to where it meets the far wall's top (x from the wall). Its
 * long shoulder (from -27.5 to -8) runs back behind the slope, so on the slide down it she and the deck ride against
 * the dark range from 278 on, never the moor's pale mist (her silver is the mist's own light); the mist lies at its
 * foot, under the deck.
 */
const CRAG_H: [number, number][] = [
  [-27.5, -0.8], [-25.5, 1.1], [-23.6, 2.3], [-21.4, 3.1], [-19.4, 3.75], [-17.9, 3.6], [-16.4, 3.15], [-14.6, 2.8],
  [-12.8, 2.6], [-11.0, 2.4], [-9.6, 2.2], [-8.2, 2.15], [-7.0, 2.35], [-6.0, 2.9], [-5.0, 3.55], [-4.3, 3.45],
  [-3.5, 4.05], [-2.7, 4.3], [-1.9, 3.95], [-1.2, 3.0], [-0.5, 2.0], [0, 1.5],
]
/** A lit band down the crag's skyline, `xa` → `xb` (x from the wall), tapering in over `ta` and out over `tb`. */
function cragLit(p: p5, k: number, x0: number, sky: (x: number) => number, xa: number, xb: number, ta: number, tb: number) {
  const th = (x: number) => {
    const s = x - x0
    const a = ta > 0 ? smooth(s, xa, xa + ta) : 1
    const b = tb > 0 ? 1 - smooth(s, xb - tb, xb) : 1
    return a * b
  }
  p.beginShape()
  for (let x = x0 + xa; x < x0 + xb; x += 0.12) p.vertex(x * k, (sky(x) + 0.02) * k)
  for (let x = x0 + xb; x > x0 + xa; x -= 0.12) {
    const w = th(x)
    p.vertex((x - (0.25 + 0.12 * Math.sin(x * 2.2)) * w) * k, (sky(x) + 0.02 + (0.48 + 0.2 * Math.sin(x * 1.7)) * w) * k)
  }
  p.endShape(p.CLOSE)
}
function cragH(s: number): number {
  if (s <= CRAG_H[0][0]) return CRAG_H[0][1]
  for (let i = 0; i < CRAG_H.length - 1; i++) {
    const [a, ha] = CRAG_H[i]
    const [b, hb] = CRAG_H[i + 1]
    if (s <= b) {
      const u = (s - a) / (b - a)
      return ha + (hb - ha) * u * u * (3 - 2 * u)
    }
  }
  return CRAG_H[CRAG_H.length - 1][1]
}
/**
 * Behind the brink the gorge's far side rises into a crag of the deep far range: seen past the ledge, so the plank's
 * last stand and the cadenza have the dark range behind them (her silver, Howl's blue, the star's gold all stand on
 * it) instead of the moor's pale mist. Its foot goes down into the gorge's mist; its right side rises from behind the
 * far wall's top, which stays in front of it.
 */
function drawCrag(p: p5, k: number, W: number, ink: string, f: View) {
  const { x0, lip, face } = farWall(f.cx)
  const xl = x0 + CRAG_H[0][0]
  if (f.x1 < xl || f.x0 > x0 + 1) return
  const g = LAND.ledge
  const sky = (x: number) => g - cragH(x - x0) - 0.07 * Math.sin(x * 4.3) - 0.04 * Math.sin(x * 9.1 + 1)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const top = g - 5.2
  const grad = ctx.createLinearGradient(0, top * k, 0, (g + 1.1) * k)
  const rgb = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }
  const span = g + 1.1 - top
  grad.addColorStop(0, rgb(CRAG, 1))
  grad.addColorStop((g - 1.3 - top) / span, rgb(mixHex(CRAG, WASTES.mist, 0.12), 1))
  grad.addColorStop((g - 0.3 - top) / span, rgb(mixHex(CRAG, WASTES.mist, 0.4), 0.92))
  grad.addColorStop(1, rgb(WASTES.mist, 0))
  ctx.save()
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(xl * k, (g + 1.2) * k)
  for (let x = xl; x < x0; x += 0.12) ctx.lineTo(x * k, sky(x) * k)
  ctx.lineTo(face(lip) * k, lip * k)
  for (let y = lip; y < g + 1.2; y += 0.2) ctx.lineTo((face(y) - 0.02) * k, y * k)
  ctx.lineTo((face(g + 1.2) - 0.02) * k, (g + 1.2) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Its skyline, faintly inked as the far layers are; a lit shoulder down its left side.
  p.push()
  p.noFill()
  p.stroke(alpha(p, ink, 0.3))
  p.strokeWeight(W * 0.6)
  p.beginShape()
  for (let x = xl + 1.2; x < x0 - 0.3; x += 0.12) p.vertex(x * k, sky(x) * k)
  p.endShape()
  p.noStroke()
  p.fill(alpha(p, mixHex(FAR_MTN, WASTES.mist, 0.15), 0.55))
  // (Up the long shoulder's rise, and down the crag's own face from its saddle, as before.)
  cragLit(p, k, x0, sky, -25.2, -19.2, 1.2, 1.6)
  cragLit(p, k, x0, sky, -10.2, -3.1, 1.4, 0)
  // Its lee face in shade, from the summit down toward the far wall.
  p.fill(alpha(p, WASTES.night, 0.2))
  p.beginShape()
  for (let x = x0 - 2.7; x < x0 - 0.15; x += 0.12) p.vertex(x * k, (sky(x) + 0.02) * k)
  p.vertex((x0 - 0.3) * k, (lip + 0.5) * k)
  p.bezierVertex((x0 - 1.0) * k, (lip - 0.4) * k, (x0 - 1.6) * k, (lip - 1.3) * k, (x0 - 2.7) * k, (sky(x0 - 2.7) + 0.05) * k)
  p.endShape(p.CLOSE)
  p.pop()
}

type View = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/**
 * The castle falls apart; the plank on legs; the heart given back; the slide to the cliff; the cadenza
 * (243.635 → 292.734): the plank builder's.
 *
 * On the climax she is standing where the hearth was, holding Calcifer, and without its fire the castle comes down
 * round her, a piece a bar (`plank-collapse.ts`), until nothing is left but the floor she stands on: one plank on
 * four legs. She sets Calcifer back in his grate at its front and he drives it: a boiler pipe to a cylinder under
 * the boards, a rod to a crank at each near hip, a stroke a bar. As it tears clear of the dust she looks back at the
 * wreck, and Turnip Head springs out of the dust onto its stern and rides it. It runs across the wastes, a pair of
 * feet down on every downbeat, kicking up stones and heather, along the brink of a gorge (the rim breaking under its
 * near feet), shedding boards off its stern, sparks at its grinding hips, a loose plate flapping on a leg, Calcifer
 * flaring on every stride and dimming between. On the accents Howl the bird comes down out of the sky, spent, onto
 * its prow, on the loudest note. She lifts Calcifer out (the legs falter and stumble to a stop at the brow), carries
 * him along the deck to Howl, raises him, and on 272.370 gives him back his heart: Calcifer goes into his chest,
 * Howl's colour comes back and his wings fold away, and Calcifer comes out again free, a small star, and flies up out
 * of sight. Her curse breaks (the show turns her bright silver). The plank, its fire gone, sits down on its folded
 * legs and slides down the long slope, bumping over the stones on the bars, onto the ledge, toward the edge; Turnip
 * Head leaps off the stern over them and bounds ahead down the slope to the brink, braces on his pole and stops it
 * (283.353): his pole bows, the nose tips out over the edge, stones go down into the mist. The cadenza is the one
 * still frame: the two of them at rest at the edge against the dark crag of the far range, the little star come back
 * to turn over them on the high notes, Howl stirring beside her.
 *
 * The part's frame: Sophie comes in at (-0.5, 0) at rest; the wastes' ground under the castle is `YG` below. Its
 * origin is `PLANK_AT` in the wastes, far from the hills. Its motion is all in `plank-rig.ts`.
 */

/** Where the collapse leg starts in the wastes world: far from the hills, so the two castles are never both in view. */
export const PLANK_AT: Pt = [400, 0]

/**
 * How the plank ends (the part's frame, cells), for the finale to build the castle again on it: the deck's top from
 * its back end to its front, the ground under it, the cliff's edge, where Sophie and Howl are, where Turnip Head
 * stands (the foot of his pole) and where the little star is turning.
 */
export const PLANK_END = (() => {
  const d = deck(T1)
  const back = onDeck(T1, DECK.back, 0, d)
  const front = onDeck(T1, DECK.front, 0, d)
  return {
    deck: { x0: back[0], x1: front[0], y: back[1] },
    /** The deck's middle (u = 0), on the boards; the castle's own origin x is here. */
    middle: [d.x, d.y] as Pt,
    ground: LAND.ledge,
    edge: LAND.edge,
    sophie: sophieAt(T1),
    howl: howlAt(T1),
    turnip: turnipAt(T1).at,
    star: calciferAt(T1).at,
    /** The legs' hips (deck cells) and where the sat legs' feet are, so the finale can stand them up again. */
    hips: LEGS.map((l) => [l.u, l.v] as Pt),
  }
})()

/**
 * What of this part the stage draws after its slot, while the finale has the same place: the land (yes) and the
 * plank at rest at the edge, Turnip Head and the little star. The finale may turn any of them off (e.g.
 * `PLANK_AFTER.plank = false` once it draws the castle round the plank, `PLANK_AFTER.star = false` when Calcifer comes
 * back down).
 */
export const PLANK_AFTER = { land: true, plank: true, turnip: true, star: true }

/* ------------------------------------------------------------------ drawing the plank */

const IRON = WASTES.iron
const IRON_DARK = WASTES.ironDark

/**
 * The boards shed off the stern on the run, a board's end on a downbeat: each works loose (its end lifting) over the
 * half-second before, and tears away on the beat. `to` is where the boards end after it. The iron keel stays whole,
 * its end bared.
 */
const TEARS: { t: number; to: number }[] = [
  { t: c(11), to: -4.98 },
  { t: c(13), to: -4.75 },
  { t: c(15), to: -4.53 },
  { t: c(18), to: -4.3 },
]
/** Where the boards end once the run has shed them: the plank as the finale has it. */
export const STERN = TEARS[TEARS.length - 1].to
const TEAR_PEEL = 0.5
function sternAt(t: number): number {
  let b = DECK.back
  for (const s of TEARS) if (t >= s.t) b = s.to
  return b
}

/** The deck and its keel, the engine under it, drawn in deck cells; the boards end at `back` (shed on the run). */
export function drawDeck(p: p5, k: number, W: number, ink: string, back = STERN) {
  const X = (v: number) => v * k
  p.push()
  p.strokeJoin(p.ROUND)
  // The keel: an iron beam under the boards, the hips in it.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(IRON_DARK)
  p.beginShape()
  p.vertex(X(DECK.back + 0.55), X(DECK.boards))
  p.vertex(X(DECK.front - 0.45), X(DECK.boards))
  p.vertex(X(DECK.front - 0.75), X(DECK.keel + 0.12))
  p.vertex(X(DECK.back + 0.85), X(DECK.keel + 0.12))
  p.endShape(p.CLOSE)
  // The boards: the room's floor, broken off at both ends.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(WASTES.wood)
  p.beginShape()
  p.vertex(X(back), X(0))
  p.vertex(X(DECK.front), X(0))
  p.vertex(X(DECK.front + 0.12), X(0.07))
  p.vertex(X(DECK.front - 0.05), X(0.12))
  p.vertex(X(DECK.front + 0.08), X(DECK.boards))
  p.vertex(X(back + 0.1), X(DECK.boards))
  p.vertex(X(back - 0.16), X(0.14))
  p.vertex(X(back + 0.02), X(0.09))
  p.vertex(X(back - 0.1), X(0.03))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.4))
  p.strokeWeight(W * 0.5)
  for (let u = DECK.back + 0.9; u < DECK.front - 0.3; u += 1.15) if (u > back + 0.2) p.line(X(u), X(0.03), X(u), X(DECK.boards - 0.03))
  p.line(X(back + 0.1), X(0.11), X(DECK.front - 0.1), X(0.11))
  p.pop()
}

/** A torn board's end, `len` long, drawn from its front end at the origin back along -x (deck cells). */
function drawBoardEnd(p: p5, k: number, W: number, ink: string, len: number) {
  const X = (v: number) => v * k
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(WASTES.wood)
  p.beginShape()
  p.vertex(X(0.03), X(0))
  p.vertex(X(-len), X(0))
  p.vertex(X(-len - 0.1), X(0.03))
  p.vertex(X(-len + 0.02), X(0.09))
  p.vertex(X(-len - 0.16), X(0.14))
  p.vertex(X(-len + 0.1), X(DECK.boards))
  p.vertex(X(-0.02), X(DECK.boards))
  p.vertex(X(0.06), X(0.13))
  p.vertex(X(-0.03), X(0.08))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.4))
  p.strokeWeight(W * 0.5)
  p.line(X(-len + 0.05), X(0.11), X(-0.05), X(0.11))
}

/** The board working loose at the stern before it tears: drawn in deck cells, lifting about its front end. */
function drawPeel(p: p5, k: number, W: number, ink: string, t: number) {
  for (const [i, s] of TEARS.entries()) {
    const a = t - s.t
    if (a < -TEAR_PEEL || a >= 0) continue
    const from = i ? TEARS[i - 1].to : DECK.back
    const lift = 0.3 * smooth(t, s.t - TEAR_PEEL, s.t) + 0.04 * Math.sin((a + TEAR_PEEL) * 30) * smooth(t, s.t - TEAR_PEEL, s.t - 0.2)
    p.push()
    p.translate(s.to * k, 0)
    p.rotate(lift)
    drawBoardEnd(p, k, W, ink, s.to - from)
    p.pop()
  }
}

/** The tear: where the board goes when it tears away, tumbling back off the stern onto the moor, and lying there. */
const TORN = TEARS.map((s, i) => {
  const from = i ? TEARS[i - 1].to : DECK.back
  const len = s.to - from
  const d = deckAt(s.t)
  const d1 = deckAt(s.t + 0.02)
  const d0 = deckAt(s.t - 0.02)
  const rot0 = d.rot + 0.3
  // The board's middle, off its front end at the tear.
  const [fx, fy] = onDeck(s.t, s.to, 0, d)
  const mx = fx - Math.cos(rot0) * len * 0.5 - Math.sin(rot0) * -DECK.boards * 0.5
  const my = fy - Math.sin(rot0) * len * 0.5 + Math.cos(rot0) * DECK.boards * 0.5
  const vx = (d1.x - d0.x) / 0.04 - 1.2 - 0.6 * hash(i, 111)
  const vy = -1.3 - 0.8 * hash(i, 112)
  const g = 11
  // It comes down on the moor (flat there) when its middle is a board's half-thickness over the ground.
  const rest = YG - DECK.boards * 0.5
  const tl = (-vy + Math.sqrt(vy * vy + 2 * g * (rest - my))) / g
  const spin = -(4 + 2 * hash(i, 113))
  const land = Math.round((rot0 + spin * tl) / Math.PI) * Math.PI
  return { t: s.t, len, mx, my, vx, vy, g, tl, rot0, w: (land - rot0) / tl, land, lx: mx + vx * tl }
})
function drawTorn(p: p5, k: number, W: number, ink: string, t: number, f: View) {
  for (const b of TORN) {
    const a = t - b.t
    if (a < 0) continue
    let x: number
    let y: number
    let rot: number
    if (a < b.tl) {
      x = b.mx + b.vx * a
      y = b.my + b.vy * a + 0.5 * b.g * a * a
      rot = b.rot0 + b.w * a
    } else {
      // Down: one small skip along the turf, then it lies where it fell.
      const u = Math.min(1, (a - b.tl) / 0.3)
      x = b.lx + 0.35 * (1 - (1 - u) * (1 - u))
      y = YG - DECK.boards * 0.5 - 0.12 * 4 * u * (1 - u)
      rot = b.land
      const da = a - b.tl
      if (da < 1.2) puff(p, k, b.lx, YG - 0.1 - da * 0.3, 0.25 + da * 0.6, mixHex(WASTES.rock, WASTES.mist, 0.5), 0.35 * Math.exp(-da / 0.4), 0.7)
    }
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    p.push()
    p.translate(x * k, y * k)
    p.rotate(rot)
    p.translate((b.len * 0.5) * k, -DECK.boards * 0.5 * k)
    drawBoardEnd(p, k, W, ink, b.len)
    p.pop()
  }
}

/**
 * The engine: one brass steam pipe from Calcifer's grate to the near front hip (the leg nearest his fire), a real
 * pipe and not a line: thick, inked, lit along its top and shaded under it, bent in elbows, strapped to the keel's
 * face by iron brackets a cell apart with a bolted flange joint between each pair, a round wheel valve just off the
 * grate, and a flange where it goes down into the hip. The warmer his fire, the warmer its brass. Drawn in deck cells.
 */
const PIPE_Y = DECK.keel - 0.22
/** Out of the grate's side over the boards, down the boards' edge, along the keel, and down into the hip. */
const PIPE_DROP = DECK.grate + 0.5
const PIPE_HIP = LEGS[0].u - 0.42
const PIPE_VALVE = DECK.grate + 0.95
export function drawPipes(p: p5, k: number, W: number, ink: string, heat: number) {
  const X = (v: number) => v * k
  const y = PIPE_Y
  const top = -0.1
  const bot = DECK.keel + 0.1
  // Thick enough to be a pipe at every framing (never under 2.6 line weights across).
  const bore = Math.max(0.085 * k, W * 2.6)
  const brass = mixHex(WASTES.brass, CALCIFER.body, 0.25 * heat)
  const lit = mixHex(brass, '#FFF3D6', 0.5)
  const shade = mixHex(brass, IRON_DARK, 0.35)
  const r = 0.14
  const path = () => {
    p.beginShape()
    p.vertex(X(DECK.grate + 0.22), X(top))
    p.vertex(X(PIPE_DROP - r), X(top))
    p.quadraticVertex(X(PIPE_DROP), X(top), X(PIPE_DROP), X(top + r))
    p.vertex(X(PIPE_DROP), X(y - r))
    p.quadraticVertex(X(PIPE_DROP), X(y), X(PIPE_DROP + r), X(y))
    p.vertex(X(PIPE_HIP - r), X(y))
    p.quadraticVertex(X(PIPE_HIP), X(y), X(PIPE_HIP), X(y + r))
    p.vertex(X(PIPE_HIP), X(bot))
    p.endShape()
  }
  p.push()
  p.noFill()
  p.strokeJoin(p.ROUND)
  p.strokeCap(p.SQUARE)
  p.rectMode(p.CENTER)
  // Its ink edge, its brass, a shade along its underside and a highlight along its top.
  p.stroke(ink)
  p.strokeWeight(bore + W * 1.6)
  path()
  p.stroke(brass)
  p.strokeWeight(bore)
  path()
  p.strokeWeight(Math.max(1, bore * 0.26))
  p.stroke(shade)
  p.line(X(PIPE_DROP + r), X(y) + bore * 0.3, X(PIPE_HIP - r), X(y) + bore * 0.3)
  p.stroke(lit)
  p.line(X(DECK.grate + 0.3), X(top) - bore * 0.22, X(PIPE_DROP - r), X(top) - bore * 0.22)
  p.line(X(PIPE_DROP) - bore * 0.22, X(top + r), X(PIPE_DROP) - bore * 0.22, X(y - r))
  p.line(X(PIPE_DROP + r), X(y) - bore * 0.24, X(PIPE_HIP - r), X(y) - bore * 0.24)
  p.line(X(PIPE_HIP) - bore * 0.22, X(y + r), X(PIPE_HIP) - bore * 0.22, X(bot))
  const fl = bore / k + 0.07
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  // Flanged joints about a cell apart along the keel, each a pair of bolted rims; a strap bracket to the keel between.
  const run = PIPE_HIP - r - (PIPE_DROP + r)
  const n = Math.max(1, Math.round(run / 1.05))
  for (let i = 0; i <= n; i++) {
    const u = PIPE_DROP + r + (run * i) / n
    if (i > 0 && i < n) {
      p.fill(shade)
      p.rect(X(u - 0.028), X(y), X(0.05), X(fl), X(0.012))
      p.rect(X(u + 0.028), X(y), X(0.05), X(fl), X(0.012))
    }
    const b = u + run / n / 2
    if (i === n || Math.abs(b - PIPE_VALVE) < 0.25) continue
    p.fill(IRON_DARK)
    p.rect(X(b), X(y), X(0.07), X(fl + 0.1), X(0.02))
    p.noStroke()
    p.fill(mixHex(IRON_DARK, WASTES.mist, 0.35))
    for (const s of [-1, 1]) p.circle(X(b), X(y + s * (fl + 0.1) * 0.36), Math.max(1.5, X(0.03)))
    p.stroke(ink)
  }
  // Where it goes down into the hip: a bolted flange at the keel's underside.
  p.fill(shade)
  p.rect(X(PIPE_HIP), X(bot - 0.03), X(fl + 0.02), X(0.06), X(0.015))
  // The valve: a squat bonnet on the pipe, a stem up out of it, and a handwheel with spokes, face on.
  const vw = 0.11
  const vy = y - 0.25
  p.strokeWeight(W * 1.4)
  p.line(X(PIPE_VALVE), X(y), X(PIPE_VALVE), X(vy))
  p.strokeWeight(W * 0.8)
  p.fill(shade)
  p.rect(X(PIPE_VALVE), X(y), X(0.15), X(fl + 0.03), X(0.035))
  p.fill(brass)
  p.rect(X(PIPE_VALVE), X(y - fl / 2 - 0.02), X(0.08), X(0.05), X(0.012))
  const rim = Math.max(W * 2, X(0.04))
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(rim + W * 1.4)
  p.circle(X(PIPE_VALVE), X(vy), X(vw * 2))
  p.stroke(mixHex(WASTES.rust, IRON_DARK, 0.25))
  p.strokeWeight(rim)
  p.circle(X(PIPE_VALVE), X(vy), X(vw * 2))
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3 + 0.3
    p.line(X(PIPE_VALVE - Math.cos(a) * vw), X(vy - Math.sin(a) * vw), X(PIPE_VALVE + Math.cos(a) * vw), X(vy + Math.sin(a) * vw))
  }
  p.fill(brass)
  p.circle(X(PIPE_VALVE), X(vy), X(0.05))
  p.pop()
}

/** Where a leg's knee is (the castle's own bend: backwards), for the steam out of it. */
function kneeOf(hip: Pt, foot: Pt): Pt {
  const th = CASTLE.thigh
  const sh = CASTLE.shin
  const dx = foot[0] - hip[0]
  const dy = foot[1] - hip[1]
  const d = Math.max(Math.abs(th - sh) + 0.01, Math.min(th + sh - 0.01, Math.hypot(dx, dy)))
  const a = Math.atan2(dy, dx)
  const off = Math.acos(Math.max(-1, Math.min(1, (th * th + d * d - sh * sh) / (2 * th * d))))
  return [hip[0] + Math.cos(a + off) * th, hip[1] + Math.sin(a + off) * th]
}

/**
 * A plate on the near front thigh shakes loose on c12 (a rivet goes) and hangs by one corner from then on, flapping
 * with every stride and thrown about on each of that leg's landings.
 */
const PLATE_LOOSE = c(12)
const PLATE = { w: 0.62, h: 0.42 }
const walking = (t: number) => smooth(t, GO, GO + 1) * (1 - smooth(t, c(26), c(26) + 0.9))
function drawPlate(p: p5, k: number, W: number, ink: string, t: number, hip: Pt, foot: Pt) {
  const knee = kneeOf(hip, foot)
  const ka = Math.atan2(knee[1] - hip[1], knee[0] - hip[0])
  const tx = Math.cos(ka)
  const ty = Math.sin(ka)
  // On the thigh's front edge, a third of the way down it.
  const u = 0.32
  const r = 0.82 + (0.36 - 0.82) * u
  const hx = hip[0] + tx * CASTLE.thigh * u + ty * r * 0.62
  const hy = hip[1] + ty * CASTLE.thigh * u - tx * r * 0.62
  const loose = smooth(t, PLATE_LOOSE, PLATE_LOOSE + 0.12)
  let swing = 0.9 * ring(t - PLATE_LOOSE, 0.55, 0.5)
  for (const ff of FOOTFALLS) if (ff.leg === 0 && ff.t > PLATE_LOOSE + 0.1) swing += 0.55 * ring(t - ff.t, 0.5, 0.4)
  swing += 0.28 * walking(t) * Math.sin(2 * Math.PI * phaseOfBar(t) + 0.9)
  // Fastened it lies along the thigh; loose it hangs down from its corner, swinging.
  const along = ka + (Math.PI / 2 + 0.35 + swing - ka) * loose
  const ax = Math.cos(along)
  const ay = Math.sin(along)
  const corners: Pt[] = [
    [hx, hy],
    [hx + ax * PLATE.w, hy + ay * PLATE.w],
    [hx + ax * PLATE.w - ay * PLATE.h, hy + ay * PLATE.w + ax * PLATE.h],
    [hx - ay * PLATE.h, hy + ax * PLATE.h],
  ]
  p.push()
  p.strokeJoin(p.ROUND)
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  // Loose, its rusted back shows as it turns.
  p.fill(mixHex(mixHex(WASTES.rust, IRON, 0.45), WASTES.rust, 0.4 * loose))
  p.beginShape()
  for (const [x, y] of corners) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  // Its riveted hinge corner, and the torn hole of the rivet that went.
  p.noStroke()
  p.fill(IRON_DARK)
  p.circle((hx + ax * 0.08 - ay * 0.08) * k, (hy + ay * 0.08 + ax * 0.08) * k, 0.07 * k)
  p.pop()
}

/** Calcifer's grate at the plank's front: a squat iron basket with a brass rim, embers in it while he is. */
export function drawGrate(p: p5, k: number, W: number, ink: string, t: number, lit: number, weak: number) {
  const X = (v: number) => v * k
  const u = DECK.grate
  p.push()
  p.strokeJoin(p.ROUND)
  if (lit > 0.01) {
    const col = calciferBody(weak)
    p.noStroke()
    for (let i = 0; i < 3; i++) {
      p.fill(alpha(p, i % 2 ? CALCIFER.edge : col, 0.9 * lit))
      p.ellipse(X(u - 0.13 + i * 0.13), X(-0.19), X(0.16 + 0.03 * Math.sin(t * 5 + i)), X(0.08))
    }
  }
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(IRON_DARK)
  p.beginShape()
  p.vertex(X(u - 0.3), X(-0.21))
  p.vertex(X(u + 0.3), X(-0.21))
  p.vertex(X(u + 0.22), X(-0.02))
  p.vertex(X(u - 0.22), X(-0.02))
  p.endShape(p.CLOSE)
  p.fill(WASTES.brass)
  p.rect(X(u - 0.33), X(-0.25), X(0.66), X(0.06), X(0.03))
  p.pop()
}

/* ------------------------------------------------------------------ Turnip Head */

/** His place on the stern while he rides it: just forward of where the boards tear to, over the back hips. */
const T_U = STERN + 0.58
/** He springs out of the wreck's dust on c9's second beat and comes down on the stern on c10. */
const T_UP = c(9, 2)
const T_ON = c(10)
/** Where he springs from: the dust behind the stern, on the moor. */
const T_FROM: Pt = [deck(T_UP).x + DECK.back + 1.2, YG]
/**
 * The leaps: off the sat stern over the two of them onto the prow (c30), off the prow down the slope, and two more
 * bounds to the brink, each off on the downbeat and down on beat three, and there he is the rig's (c33.3 on).
 */
const PROW_U = 4.72
const LEAP_N = [30, 31, 32, 33]
const LEAP_TO: Pt[] = [
  [0, 0], // the prow, riding it (below)
  [57.0, ground(57.0)],
  [62.6, ground(62.6)],
  [LAND.th, LAND.ledge - LAND.lip],
]
const LEAP_H = [1.6, 1.0, 0.95, 0.85]
const onStern = (t: number): Pt => onDeck(t, T_U, 0, deckAt(t))
const onProw = (t: number): Pt => onDeck(t, PROW_U, 0, deckAt(t))
interface TurnipPose {
  at: Pt
  hop: number
  height: number
  lean: number
  /** How far his pole bows (radians from foot to top). */
  bow: number
  /** His hat lifted (a doff) and where his face turns (`drawTurnip`). */
  hat?: number
  look?: [number, number]
}
function turnipP(t: number): TurnipPose | null {
  if (t >= c(33, 3)) {
    const r = turnipAt(t)
    return { ...r, bow: bowAt(t) }
  }
  if (t < T_UP) return null
  if (t < T_ON) {
    const u = (t - T_UP) / (T_ON - T_UP)
    const to = onStern(T_ON)
    const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65
    return { at: [T_FROM[0] + (to[0] - T_FROM[0]) * e, T_FROM[1] + (to[1] - T_FROM[1]) * e], hop: u, height: 1.3, lean: 0.25 * Math.sin(Math.PI * u), bow: 0 }
  }
  // The leaps.
  for (const [i, n] of LEAP_N.entries()) {
    const a = c(n)
    const b = c(n, 3)
    if (t >= a && t < b) {
      const from = i === 0 ? onStern(a) : i === 1 ? onProw(a) : LEAP_TO[i - 1]
      const to = i === 0 ? onProw(b) : LEAP_TO[i]
      const u = (t - a) / (b - a)
      return { at: [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u], hop: u, height: LEAP_H[i], lean: 0.22 * Math.sin(Math.PI * u), bow: 0 }
    }
    if (i > 0 && t >= c(LEAP_N[i - 1], 3) && t < a) return { at: i === 1 ? onProw(t) : LEAP_TO[i - 1], hop: 0, height: 0.3, lean: 0, bow: 0 }
  }
  // Riding the stern: a hop a bar in three (off on two, down on the next downbeat, with the feet) while it runs;
  // still through the heart; on it as it sits.
  let hop = 0
  for (let n = 10; n <= 25; n++) {
    const a = c(n, 2)
    const b = c(n + 1)
    if (t >= a && t < b) hop = (t - a) / (b - a)
  }
  return { at: onStern(t), hop, height: 0.24, lean: -0.08 * walking(t), bow: 0 }
}
/** His pole: flexing as he braces, bowing hard under the plank's weight on the stop, springing back in a damped ring. */
function bowAt(t: number): number {
  const b0 = c(36, 3)
  if (t < b0) return 0
  if (t < IMPACT) return -0.08 * smooth(t, b0, IMPACT)
  const a = t - IMPACT
  return -0.08 * Math.exp(-a / 0.3) + 0.42 * (1 - Math.exp(-a / 0.045)) * Math.exp(-a / 0.42) + 0.06 * ring(a, 0.5, 0.6)
}
/**
 * Turnip Head with his pole bowed: drawn in slices up the pole, each turned a little more than the one under it, so
 * the pole bends in a smooth curve from his foot and everything above it rides the top.
 */
function drawTurnipBent(p: p5, k: number, W: number, ink: string, t: number, pose: TurnipPose) {
  if (Math.abs(pose.bow) < 0.004) {
    drawTurnip(p, k, W, ink, { t, hop: pose.hop, height: pose.height, lean: pose.lean, hat: pose.hat, look: pose.look })
    return
  }
  const N = 6
  const L = 0.62
  const ctx = p.drawingContext as CanvasRenderingContext2D
  let jx = 0
  let jy = 0
  for (let i = 0; i < N; i++) {
    const th = pose.lean + pose.bow * ((i + 0.5) / N)
    const y0 = -(L * i) / N
    const y1 = i === N - 1 ? -3 : -(L * (i + 1)) / N
    p.push()
    p.translate(jx * k, jy * k)
    p.rotate(th)
    p.translate(0, -y0 * k)
    ctx.beginPath()
    ctx.rect(-1.2 * k, (y1 - 0.004) * k, 2.4 * k, (y0 - y1 + (i === 0 ? 0.2 : 0.008)) * k)
    ctx.clip()
    drawTurnip(p, k, W, ink, { t, hop: 0, height: 0, lean: 0, hat: pose.hat, look: pose.look })
    p.pop()
    jx += Math.sin(th) * (L / N)
    jy -= Math.cos(th) * (L / N)
  }
}

/* ------------------------------------------------------------------ the part */

interface PlankState {
  begin: number
}

export const plank = part<PlankState>(
  {
    name: 'plank',
    draw: (p, s, c0) => {
      const { k, weight: W, ink } = c0
      const t = s.begin + c0.t
      if (t < T0 - 1) return
      const f = frame(p, k)
      p.push()
      p.rectMode(p.CORNER)
      const land = PLANK_AFTER.land || t <= T1
      if (land) {
        drawBack(p, k, W, ink, f)
        drawCrag(p, k, W, ink, f)
        drawGround(p, k, W, ink, f)
        drawTors(p, k, W, ink, f)
        drawBrink(p, k, W, ink, f)
      }
      const plankOn = t <= T1 || PLANK_AFTER.plank
      const d = deckAt(t)
      const legs = LEGS.map((_, i) => legAt(t, i, d))
      const sit = smooth(t, BUCKLE, DOWN)
      const legCol = (far: boolean) => (far ? mixHex(IRON_DARK, WASTES.night, 0.2) : IRON)
      if (plankOn) {
        // The far legs, behind everything of the castle.
        LEGS.forEach((leg, i) => {
          if (leg.far) drawLeg(p, k, W, ink, legs[i].hip, legs[i].foot, legCol(true), Math.max(legs[i].air * 0.8, sit * 0.35))
        })
      }
      // The wreck on the moor: gone once the finale calls its pieces home (far out of shot by then).
      if (t <= T1 || PLANK_AFTER.plank) drawCollapse(p, k, W, ink, t, f)
      if (plankOn) {
        drawKicks(p, k, W, ink, t)
        LEGS.forEach((leg, i) => {
          if (!leg.far) drawLeg(p, k, W, ink, legs[i].hip, legs[i].foot, legCol(false), Math.max(legs[i].air * 0.8, sit * 0.35))
        })
        drawPlate(p, k, W, ink, t, legs[0].hip, legs[0].foot)
        p.push()
        p.translate(d.x * k, d.y * k)
        p.rotate(d.rot)
        drawDeck(p, k, W, ink, sternAt(t))
        drawPeel(p, k, W, ink, t)
        drawPipes(p, k, W, ink, drive(t))
        const cal = calciferAt(t)
        const inGrate = t >= PUT && t < LIFT_OUT + 0.1
        drawGrate(p, k, W, ink, t, inGrate ? 1 : 0.15 + 0.2 * smooth(t, T0, T0 + 1), cal.weak)
        p.pop()
        steamAndDust(p, k, t, legs)
        drawSparks(p, k, W, t)
        drawTorn(p, k, W, ink, t, f)
        drawCrumbs(p, k, W, ink, t)
      }
      // Calcifer.
      const cal = freed(t, calciferAt(t))
      if (cal.shown && (t <= T1 || PLANK_AFTER.star)) {
        if (cal.star > 0) drawStar(p, k, t, cal.at, cal.star)
        // Straining on every stride: a flare and a breath of warm light over the grate, dimming between.
        const st = strain(t)
        if (st > 0.02) puff(p, k, cal.at[0], cal.at[1] - 0.2, 0.45 + 0.2 * st, CALCIFER.core, 0.16 * st)
        p.push()
        p.translate(cal.at[0] * k, cal.at[1] * k)
        // As she leans in to him on the run he burns up a little and looks round at her.
        const tn = tend(t)
        // Watching Howl come down: his eyes on the bird.
        const wa = watching(t)
        let look: Pt = [cal.look[0] - 1.7 * tn, cal.look[1] - 0.1 * tn]
        if (wa > 0) {
          const [hx, hy] = howlX(t)
          const dx = hx - cal.at[0]
          const dy = hy - cal.at[1] + 0.3
          const dl = Math.max(0.01, Math.hypot(dx, dy))
          look = [look[0] + (dx / dl - look[0]) * wa, look[1] + (dy / dl - look[1]) * wa]
        }
        const dim = 0.07 * drive(t) * (1 - st)
        drawCalcifer(p, k, W, ink, {
          t,
          size: cal.size * (1 + 0.16 * tn + 0.26 * st),
          weak: Math.min(1, cal.weak * (1 - 0.35 * tn) * (1 - 0.5 * st) + dim),
          look,
          lean: cal.lean * (1 - 0.5 * tn) - 0.4 * st,
          mouth: cal.mouth + 0.15 * tn + 0.25 * st,
          shut: Math.min(1, cal.shut * (1 - tn) + 0.35 * st),
          light: cal.light,
        })
        p.pop()
      }
      // The heart: a warm light through Howl as Calcifer goes into him, spreading over her as well (the gift passes
      // between them), and a flare as he comes out free.
      const hu = t - HEART
      if (hu > -0.05 && hu < 2.4) {
        const [hx, hy] = howlX(t)
        const [sx, sy] = herAt(t)
        const a = 0.32 * Math.exp(-Math.max(0, hu) / 0.55) * smooth(hu, -0.05, 0.02)
        puff(p, k, hx, hy, 0.75 + 0.5 * Math.min(1, hu + 0.05), CALCIFER.core, a)
        // Between them and over her, a moment later and slower to go: it reaches her as it lights him.
        const b = 0.24 * smooth(hu, 0.02, 0.3) * Math.exp(-Math.max(0, hu - 0.3) / 0.8)
        puff(p, k, (hx + sx) / 2, (hy + sy) / 2, 0.55 + 0.3 * Math.min(1, hu), CALCIFER.core, b * 0.7)
        puff(p, k, sx, sy, 0.6 + 0.35 * Math.min(1, hu), CALCIFER.core, b)
      }
      // His warmth as he comes out: it swells with him out of Howl's chest, rides up with him and fades.
      const fu = t - FREE
      if (fu > 0 && fu < 1.6) {
        const [fx, fy] = freed(t, calciferAt(t)).at
        const e = smooth(fu, 0, EMERGE)
        const glow = 0.26 * (0.3 + 0.7 * e) * smooth(fu, 0, 0.06) * Math.exp(-Math.max(0, fu - EMERGE) / 0.35)
        puff(p, k, fx, fy - 0.08, 0.2 + 0.35 * e + 0.25 * Math.max(0, fu - EMERGE), CALCIFER.body, glow)
      }
      // Howl's wings, under his ball.
      if (t >= HOWL_IN && t <= T1 + 0.5) {
        const w = wingsAt(t)
        if (w.spread > 0.01) {
          const [hx, hy] = howlX(t)
          p.push()
          p.translate(hx * k, hy * k)
          drawWings(p, k, W, ink, { t, spread: w.spread, flap: Math.asin(Math.max(-1, Math.min(1, w.beat))), heading: w.heading })
          p.pop()
        }
      }
      drawFeathers(p, k, W, ink, t)
      // Turnip Head: out of the dust onto the stern, riding it, leaping ahead to the brink, and at the edge.
      if (PLANK_AFTER.turnip || t <= T1) {
        const a0 = t - T_UP
        if (a0 > -0.1 && a0 < 1.4) {
          // The dust he bursts out of.
          const e = Math.max(0, a0)
          puff(p, k, T_FROM[0], T_FROM[1] - 0.5 - e * 0.5, 0.8 + e * 0.9, mixHex(WASTES.rock, WASTES.mist, 0.45), 0.5 * smooth(a0, -0.1, 0.05) * Math.exp(-e / 0.5), 0.8)
        }
        const th = turnipP(t)
        if (th && th.at[0] > f.x0 - 2 && th.at[0] < f.x1 + 2) {
          p.push()
          p.translate(th.at[0] * k, th.at[1] * k)
          drawTurnipBent(p, k, W, ink, t, th)
          p.pop()
        }
      }
      pebbles(p, k, W, ink, t)
      if (land) drawNear(p, k, W, ink, f)
      p.pop()
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const segs = carried((u) => herAt(slot.begin + u), 0, dur, Math.round(dur * 40))
    const lane: Lane = { segs, fire: 0 }
    const end = laneAt(lane, dur)
    const howl: Company = {
      who: 'howl',
      from: HOWL_IN,
      to: slot.end,
      at: (t) => {
        const [x, y] = howlX(t)
        return { x, y, color: mixHex(HOWL_BIRD, HOWL, smooth(t, HEART, HEART + 1.5)) }
      },
    }
    // The stones on the slope, where it bumps.
    STONES.length = 0
    for (let n = 31; n <= 36; n++) {
      const tf = c(n)
      const x = legAt(tf, 0).foot[0] + 0.35
      STONES.push({ x, r: 0.16 + 0.05 * (n % 3) })
    }
    return {
      cells: box(-30, -30, LAND.edge + 30, YG + 24, 2),
      exit: [end.x + 0.5, end.y] as Pt,
      lane,
      state: { begin: slot.begin },
      company: [howl],
    }
  },
  (slot) => {
    const her0 = sophieAt(T0)
    const end = sophieAt(T1)
    const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
    const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
    // The run's framings: the whole machine, the frame's foot 0.85 under the feet, so every footfall lands in shot.
    const runY = (() => {
      let sum = 0
      for (let i = 0; i < 60; i++) sum += herAt(c(12) + i * 0.05)[1]
      return sum / 60
    })()
    const run = (t: number, cells: number, ox: number, foot = 0.85): PartShot => follow(t, cells, [ox, YG + foot - cells / 2 - runY])
    // The deck close: her on the deck `top` of the way down the frame, the hips, the knees and what the feet throw up
    // under her; the feet just out of it. At 7.8 cells or less she holds the lead's floor (12 px at 640x360).
    const onDeckShot = (t: number, cells: number, ox: number, top = 0.3): PartShot => follow(t, cells, [ox, (0.5 - top) * cells])
    // The crossing: the two-shot as she carries Calcifer the length of the deck to Howl. The follow's own lean (her
    // smoothed as the camera's follower has her) is taken out, so Howl sits `hx` across the frame, exactly, and she
    // walks in to him from the left; her on the deck `top` down, the far range behind all three.
    const followed = (t: number): number => {
      let x = 0
      let sum = 0
      for (let j = -12; j <= 16; j++) {
        const w = 1 - Math.abs(j - 2) / 15
        x += herAt(t + j * 0.05)[0] * w
        sum += w
      }
      return x / sum
    }
    const cross = (t: number, cells: number, hx: number, top = 0.57): PartShot =>
      follow(t, cells, [howlX(t)[0] - (hx - 0.5) * ((cells * 16) / 9) - followed(t), (0.5 - top) * cells])
    // The stop: on the contact, the brink and the drop under it; the cadenza: the two of them, the star over them.
    const JOLT_AT: Pt = [end[0] + 1.0, end[1] + 0.22]
    const CADENZA: Pt = [end[0] + 0.88, end[1] - 1.12]
    const deckY = PLANK_END.deck.y
    return [
      // The collapse, cut on the bars: close on her with Calcifer as the hearth breaks round them and the flag and
      // the chimney go (c1, c1.2); on c2 (the back turret snapping) a cut out to the whole castle tearing apart, two
      // bars; on c4 back in to her, the hull torn in plates over her head, pushing in; on c6 out again to the whole
      // of it, the cottage and the face going down; on c8 in to her on the plank standing up in the dust, the wreck
      // at the left, and on with her as it runs (c9).
      hold(244.5, 3.0, [her0[0] + 0.33, her0[1] - 0.62]),
      hold(245.0, 3.5, [her0[0] + 0.28, her0[1] - 0.72]),
      { ...hold(c(2), 23, [BX0 - 1.3, -3.7]), cut: true },
      hold(247.3, 24.2, [BX0 - 1.45, -3.1]),
      { ...onDeckShot(c(4), 7.4, -0.3, 0.44), cut: true },
      onDeckShot(c(6) - 0.05, 6.6, -0.4, 0.42),
      { ...hold(c(6), 24, [BX0 - 0.6, -2.4]), cut: true },
      hold(c(8) - 0.05, 21, [BX0 + 0.6, -1.2]),
      // The run: from c8 close on her on the deck, right of the middle, the wreck left behind at the left and Turnip
      // Head springing out of the dust onto the stern behind her; on with it close on the deck as it runs (Calcifer
      // straining in the grate, the boards shedding at the stern, the sparks off the hips, what the feet throw up
      // coming in at the foot); out to the whole machine and the size of the wastes as the bird comes down out of the
      // sky (c18, two bars); in to the two of them on the prow (the stern out of the frame) as he glides down into
      // it and lands on the loudest note, the deck line a little under the middle and open sky over it, so his last
      // swoop and his landing, wings spread, cross the middle of the frame (only the near leg's knee at its foot);
      // then, as she lifts Calcifer out, a cut in to the reunion: a two-shot on the deck with the far range behind and
      // the legs out of it, Howl slumped at the right and her carrying Calcifer in to him from the left, the frame
      // drifting on with her; and a slow push in on the two of them for the heart.
      { ...onDeckShot(c(8), 7.7, -3.1, 0.32), cut: true },
      onDeckShot(c(9) + 0.3, 7.7, -3.0, 0.34),
      onDeckShot(c(10) + 0.4, 7.3, -2.6, 0.36),
      onDeckShot(c(12) + 0.3, 6.5, 0.3, 0.37),
      onDeckShot(c(16) + 0.3, 6.3, 0.5, 0.37),
      onDeckShot(c(18) - 0.05, 6.3, 0.6, 0.37),
      { ...run(c(18), 10.6, 2.4, 1.5), cut: true },
      run(c(19) + 0.5, 10.6, 2.2, 1.5),
      run(c(20) - 0.05, 10.4, 2.2, 1.5),
      { ...onDeckShot(c(20), 6.9, 2.7, 0.54), cut: true },
      onDeckShot(c(21) + 0.3, 6.7, 2.6, 0.545),
      onDeckShot(LIFT_OUT - 0.05, 6.6, 2.4, 0.55),
      { ...cross(LIFT_OUT, 4.7, 0.74), cut: true },
      cross(c(24), 4.6, 0.71),
      cross(c(25), 4.45, 0.66),
      follow(RAISE, 4.1, [0.55, -0.4]),
      follow(272.8, 3.7, [0.45, -0.5]),
      follow(274.4, 5.2, [0.8, -0.4]),
      // The slide: with it, leading, Turnip Head leaping over the two of them off the stern and bounding on ahead
      // down the slope; then ahead of it to the brink, where he has landed and turns to it, the plank coming in, the
      // frame tightening on the contact. Close (6.5 → 6.2 cells, 14–15 px) and low, her 0.4 down the frame, so she
      // and the deck ride against the crag's long shoulder with the moor's mist under the deck line, at rest on the
      // brink by 283.0 for the brake's cut.
      follow(276.2, 6.5, [2.2, 0.1]),
      follow(277.6, 6.4, [2.9, 0.45]),
      follow(279.0, 6.35, [3.3, 0.5]),
      hold(281.2, 6.3, [end[0] - 1.6, end[1] + 0.6]),
      hold(282.9, 6.2, [end[0] - 0.4, end[1] + 0.55]),
      // The stop: a cut in on the contact, jolted by it; the settling; then in to the cadenza's one still frame.
      { ...hold(IMPACT, 5.2, JOLT_AT), cut: true },
      hold(IMPACT + 0.07, 5.2, [JOLT_AT[0] + 0.04, JOLT_AT[1] + 0.1]),
      hold(IMPACT + 0.6, 5.15, [JOLT_AT[0] - 0.01, JOLT_AT[1] - 0.02]),
      hold(284.4, 5.0, [JOLT_AT[0] - 0.05, JOLT_AT[1] - 0.2]),
      // The cadenza: the two of them and the star turning low over them, a push in so slow it reads as a held frame
      // (never parked). The deck about two thirds of the way down (0.68), so the star turns inside the Zoom frame
      // too, with Turnip Head at the right; from the glance the frame widens and tilts up with the star as it
      // gathers for the dive.
      hold(285.9, 4.8, [CADENZA[0] - 0.2, deckY - 0.18 * 4.8]),
      hold(GLANCE, 4.45, [CADENZA[0] - 0.12, deckY - 0.18 * 4.45]),
      hold(slot.end, 5.9, [end[0] + 0.85, end[1] - 1.3]),
    ]
  },
)

/* ------------------------------------------------------------------ steam, dust, sparks, kicks and pebbles */

/** Steam from the cylinder on every footfall while Calcifer drives it; dust where the feet land and where it slides. */
function steamAndDust(p: p5, k: number, t: number, legs: { hip: Pt; foot: Pt }[]) {
  const dr = drive(t)
  const dustCol = mixHex(WASTES.rock, WASTES.mist, 0.5)
  for (const ff of FOOTFALLS) {
    const a = t - ff.t
    if (a < 0 || a > 1.6) continue
    const leg = LEGS[ff.leg]
    // Dust off the foot.
    for (let j = 0; j < 3; j++) {
      const side = j % 2 ? 1 : -1
      puff(p, k, ff.x + 0.4 + side * (0.3 + a * (0.9 + j * 0.3)), ground(ff.x) - 0.12 - a * 0.3 * (1 + j * 0.3), 0.28 + a * 0.7, dustCol, 0.38 * (1 - a / 1.6) * (leg.far ? 0.55 : 1), 0.6)
    }
    // Steam out of its knee as it lands, trailing back: Calcifer's heat, driving it.
    if (!leg.far && dr > 0.02 && a < 1.2) {
      const [kx, ky] = kneeOf(legs[ff.leg].hip, legs[ff.leg].foot)
      for (let j = 0; j < 3; j++) {
        const g = a * (0.8 + 0.3 * j)
        puff(p, k, kx - 0.3 - g * 1.6 - j * 0.15, ky - 0.15 - g * 1.0, 0.25 + g * 0.7, WASTES.steam, 0.55 * dr * (1 - a / 1.2) * (1 - j * 0.25))
      }
    }
  }
  // The first stroke: a great breath of steam out of both near knees.
  const a0 = t - GO
  if (a0 > 0 && a0 < 1.8) {
    for (const i of [0, 1]) {
      const [kx, ky] = kneeOf(legs[i].hip, legs[i].foot)
      puff(p, k, kx - a0 * 0.8, ky - 0.2 - a0 * 0.8, 0.4 + a0 * 1.0, WASTES.steam, 0.6 * (1 - a0 / 1.8))
    }
  }
  // Sat down: a thump of dust along its length; then sliding, a trail of it from under the legs.
  const da = t - DOWN
  if (da > 0 && da < 2.5) {
    for (let i = 0; i < 6; i++) {
      const [x] = onDeck(DOWN, -4.6 + i * 1.8, 0, deck(DOWN))
      puff(p, k, x + (i - 2.5) * da * 0.25, ground(x) - 0.2 - da * 0.35, 0.5 + da * 0.8, dustCol, 0.4 * Math.exp(-da / 0.9), 0.7)
    }
  }
  if (t > DOWN + 0.2 && t < IMPACT + 2.5) {
    for (let j = 0; j < 12; j++) {
      const s = t - j * 0.16
      if (s < DOWN + 0.35 || s > IMPACT) continue
      const age = t - s
      const [x] = onDeck(s, LEGS[1].u - 3.8, 0, deck(s))
      const speed = Math.abs(deck(s + 0.05).x - deck(s - 0.05).x) / 0.1
      puff(p, k, x - age * 0.4, ground(x) - 0.15 - age * 0.25, 0.3 + age * 0.55, dustCol, 0.3 * Math.min(1, speed / 2) * Math.max(0, 1 - age / 1.9), 0.65)
    }
  }
  // The stop: dust thrown up against him, off the lip.
  const ia = t - IMPACT
  if (ia > 0 && ia < 2.4) {
    for (let i = 0; i < 4; i++) {
      puff(p, k, LAND.th - 0.5 - i * 0.4 + ia * 0.2 * i, LAND.ledge - 0.3 - ia * (0.4 + 0.2 * i), 0.35 + ia * 0.7, dustCol, 0.42 * Math.exp(-ia / 0.8), 0.8)
    }
  }
}

/** Sparks where the iron hips grind, thrown off on each near footfall while it runs: short hot streaks, never dots. */
function drawSparks(p: p5, k: number, W: number, t: number) {
  for (const [fi, ff] of FOOTFALLS.entries()) {
    const leg = LEGS[ff.leg]
    if (leg.far) continue
    const a0 = t - ff.t
    if (a0 < 0 || a0 > 0.7) continue
    const [hx, hy] = onDeck(ff.t, leg.u, leg.v, deckAt(ff.t))
    p.push()
    // A breath of heat where the iron bites, then the sparks: long hot streaks flying out and falling away.
    puff(p, k, hx, hy, 0.25 + 0.3 * a0, CALCIFER.body, 0.2 * Math.exp(-a0 / 0.12))
    // Thrown off behind the running plank in a low fan, each one a hot head with a fading tail, arcing down.
    const d0 = deckAt(ff.t - 0.03)
    const d1 = deckAt(ff.t + 0.03)
    const run = (d1.x - d0.x) / 0.06
    for (let j = 0; j < 5; j++) {
      const a = a0 - 0.05 * hash(fi, j, 121)
      const life = 0.35 + 0.3 * hash(fi, j, 122)
      if (a <= 0 || a > life) continue
      const an = Math.PI * (0.88 + 0.3 * hash(fi, j, 123))
      const sp = 2.4 + 2.2 * hash(fi, j, 124)
      const vx = run * 0.6 + Math.cos(an) * sp
      const vy = Math.sin(an) * sp - 1.0
      const x0 = hx + (hash(fi, j, 125) - 0.5) * 0.4
      const y0 = hy - 0.05
      const at = (s: number): Pt => [x0 + vx * s, y0 + vy * s + 7 * s * s]
      const u = a / life
      const [x, y] = at(a)
      const [xm, ym] = at(Math.max(0, a - 0.03))
      const [xb, yb] = at(Math.max(0, a - 0.1))
      p.stroke(alpha(p, CALCIFER.edge, 0.7 * (1 - u)))
      p.strokeWeight(W * 0.7)
      p.line(xb * k, yb * k, xm * k, ym * k)
      p.stroke(alpha(p, mixHex(CALCIFER.core, CALCIFER.body, u), 1 - u * u))
      p.strokeWeight(W * (1.6 - 0.7 * u))
      p.line(xm * k, ym * k, x * k, y * k)
    }
    p.pop()
  }
}

/** Each footfall kicks stones and sprigs of heather back off the moor, which fall and lie a moment. */
function drawKicks(p: p5, k: number, W: number, ink: string, t: number) {
  for (const [fi, ff] of FOOTFALLS.entries()) {
    const a = t - ff.t
    if (a < 0 || a > 1.4) continue
    const far = LEGS[ff.leg].far
    const n = far ? 2 : 5
    const g0 = ground(ff.x)
    for (let j = 0; j < n; j++) {
      const vx = -(1.3 + 2.4 * hash(fi, j, 131))
      const vy = -(1.5 + 2.2 * hash(fi, j, 132))
      const gr = 13
      const tl = (-2 * vy) / gr
      const s = Math.min(a, tl)
      const x = ff.x + 0.3 + 0.3 * hash(fi, j, 133) + vx * s
      const y = g0 - 0.03 + vy * s + 0.5 * gr * s * s
      const fade = (1 - smooth(a, tl + 0.2, tl + 0.8)) * (far ? 0.75 : 1)
      if (fade <= 0) continue
      const spin = s * (5 + 6 * hash(fi, j, 134))
      p.push()
      if (j % 3 === 2) {
        // A torn sprig of heather: a woody stem with its purple head.
        p.translate(x * k, y * k)
        p.rotate(spin)
        p.stroke(alpha(p, mixHex(WASTES.moss, WASTES.rockDark, 0.4), fade))
        p.strokeWeight(W * 0.7)
        p.line(0, 0.07 * k, 0, -0.04 * k)
        p.noStroke()
        p.fill(alpha(p, hash(fi, j, 135) < 0.5 ? WASTES.heather : WASTES.heatherDeep, fade))
        p.ellipse(0, -0.07 * k, 0.07 * k, 0.12 * k)
      } else {
        p.stroke(alpha(p, ink, 0.9 * fade))
        p.strokeWeight(W * 0.55)
        p.fill(alpha(p, hash(fi, j, 136) < 0.5 ? WASTES.rock : WASTES.rockDark, fade))
        chip(p, k, x, y - 0.03, 0.04 + 0.06 * hash(fi, j, 137), spin, fi * 11 + j)
      }
      p.pop()
    }
  }
}

/**
 * Off the brink into the gorge: a stone or two knocked over by Turnip Head's landing and his hops, grit as he plants
 * his pole, and a shower of stones on the stop. They fall down the cliff's face into the haze and the mist takes them.
 */
const DROPS: { t: number; n: number }[] = [
  { t: c(33, 3), n: 3 },
  { t: c(34, 3), n: 1 },
  { t: c(35, 3), n: 1 },
  { t: c(36, 3), n: 2 },
  { t: IMPACT, n: 7 },
]
function pebbles(p: p5, k: number, W: number, ink: string, t: number) {
  p.push()
  for (const [di, dr] of DROPS.entries()) {
    const a0 = t - dr.t
    if (a0 < 0 || a0 > 3.2) continue
    for (let i = 0; i < dr.n; i++) {
      const a = a0 - 0.14 * i * hash(di, i, 30)
      if (a < 0) continue
      const r = (dr.n > 3 ? 0.07 + 0.13 * hash(di, i, 34) : 0.06 + 0.08 * hash(di, i, 34))
      const vx = 0.4 + 0.7 * hash(di, i, 31)
      const vy = -0.6 - 0.9 * hash(di, i, 32)
      const x = LAND.edge - 0.15 + vx * a
      const y0 = LAND.ledge - LAND.lip - 0.05
      const y = y0 + vy * a + 0.5 * 7 * a * a
      const depth = y - LAND.ledge
      const fade = 1 - smooth(depth, 0.8, 3.6)
      if (fade <= 0) continue
      p.stroke(alpha(p, ink, fade))
      p.strokeWeight(W * 0.6)
      p.fill(alpha(p, mixHex(WASTES.rockDark, WASTES.mist, 0.45 * smooth(depth, 0.2, 3)), fade))
      chip(p, k, x, y, r, a * (3 + i), di * 13 + i)
    }
  }
  p.pop()
}

/**
 * Calcifer as a star: a soft glow and, behind his flame, a small soft sparkle of four short broad points with curved
 * sides (never needles, never a crosshair) that swells a little on the cadenza's high notes. His face carries it.
 */
const TWINKLES = [286.383, 286.923, 287.364, 288.943, 289.814, 291.677]
export function drawStar(p: p5, k: number, t: number, at: Pt, star: number) {
  let flare = 0.35
  for (const tw of TWINKLES) {
    const u = t - tw
    if (u >= 0) flare = Math.max(flare, 0.35 + 0.65 * Math.exp(-u / 0.5))
  }
  const [x, y] = at
  puff(p, k, x, y - 0.1, 0.5 + 0.22 * flare, CALCIFER.core, 0.24 * star * (0.55 + 0.45 * flare))
  p.push()
  p.noStroke()
  p.translate(x * k, (y - 0.1) * k)
  p.rotate(0.25 * Math.sin(t * 0.8))
  // Points under 0.22 cells up and down (the glow's layer too), 0.15 across; the waist between two points 0.045 from the middle, so each
  // point's base is about 0.09 wide.
  const long = (0.13 + 0.055 * flare) * star
  const wide = (0.1 + 0.05 * flare) * star
  const waist = 0.045 * star
  const pts: Pt[] = [[0, -long], [wide, 0], [0, long], [-wide, 0]]
  for (const [col, a, s] of [[CALCIFER.body, 0.45, 1.18], [CALCIFER.core, 0.9, 1]] as [string, number, number][]) {
    p.fill(alpha(p, col, a * star))
    p.beginShape()
    p.vertex(pts[0][0] * s * k, pts[0][1] * s * k)
    for (let i = 1; i <= 4; i++) {
      const q = pts[i % 4]
      const m = pts[i - 1]
      // The side's control point pulled in toward the middle: a curved, concave side.
      const cx = (Math.sign(m[0] + q[0]) || 0) * waist * s
      const cy = (Math.sign(m[1] + q[1]) || 0) * waist * s
      p.quadraticVertex(cx * k, cy * k, q[0] * s * k, q[1] * s * k)
    }
    p.endShape(p.CLOSE)
  }
  p.pop()
}

/** Every strike of this part, in show seconds. */
export const PLANK_HITS: number[] = (() => {
  const hits = new Set<number>(COLLAPSE_HITS)
  // Calcifer set back in the grate; the first stroke.
  hits.add(PUT)
  hits.add(GO)
  // Every footfall of the run, a pair a bar (10 to 26): the boards tear, the plate goes, Turnip Head lands on the stern.
  for (const ff of FOOTFALLS) hits.add(ff.t)
  // Howl: his last wingbeats, down on the prow, slumped.
  for (const t of [264.649, 265.427, HOWL_LAND, c(21, 2)]) hits.add(t)
  // She lifts Calcifer out; she raises him; the heart; he comes out free.
  for (const t of [LIFT_OUT, c(26, 2), c(26, 3), HEART, FREE]) hits.add(t)
  // The legs give; it sits down; over the stones; stopped.
  for (let n = 28; n <= 37; n++) if (n !== 29) hits.add(c(n))
  // Turnip Head's leaps land (the prow, the slope, the brink), his hops, and he plants his pole.
  for (const n of [30, 31, 32, 33, 34, 35, 36]) hits.add(c(n, 3))
  // The cadenza: the star turns on the high notes; Howl stirs.
  for (const t of TWINKLES) hits.add(t)
  hits.add(STIR)
  return [...hits].sort((a, b) => a - b)
})()
