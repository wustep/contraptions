import type p5 from 'p5'
import { BLOSSOM, drawBlossom, plant } from './blossom'
import { R as BALL_R, mixHex, type PieceCtx } from '../../../../parts'
import { PERIOD, PIECES, wrap } from './music'
import { LENGTH, RADIUS, STONES, along, ballLocal, float, since, sink, squash, stonesIn, type Stone } from './path'
import { drawGull } from './air'
import { alpha, hash, osc, polar, smooth, type Sky } from './world'
import { scenery, type Ctx2D, type View, viewOf, onCanvas, atSea, weathered, sunAngle, sunWay, lamplighter, devicePx } from './frame'

// ---------------------------------------------------------------- the stones

/**
 * The dawn puts out what the night lit, coming round the planet from the sun's side: in the wide shot at the top of the
 * period, as the title comes up, each lamp goes out and each flower closes as the day reaches it, so the night's ring of
 * light is seen to end. `DAWN_FROM` is when it starts, on the side facing the sun, and `DAWN_SWEEP` how long it takes
 * to come round to the far side; each goes in `DAWN_GOING`.
 */
export const DAWN_FROM = 1
const DAWN_SWEEP = 2.8
export const DAWN_GOING = 1.3

/** Which way the dawn comes from: the sun's way from the planet's middle as the sweep begins. */
let dawnWay: number | null = null

/** When the dawn reaches `stone`: soonest on the side facing the sun, last on the far side. */
export function dawnAt(stone: Stone): number {
  dawnWay ??= sunWay(DAWN_FROM + DAWN_SWEEP / 2)
  const a = (stone.u0 + stone.u1) / 2 / RADIUS - dawnWay
  const off = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / Math.PI
  return DAWN_FROM + off * DAWN_SWEEP + 0.35 * hash(stone.index, 7)
}

/**
 * The night's hold on `stone` at `t`: how long ago the ball came to it (seconds), and how much of the night is still
 * on it (1, down to 0 as the dawn comes to it). The lamps the ball lights burn, and the flowers it opens stay open,
 * until the sun comes up; before the ball comes to it this time round it is last night's, going out with the dawn,
 * and then nothing. Only the Gnossiennes' stones: the night's.
 */
function tonight(stone: Stone, t: number): { age: number; left: number } | null {
  const u = wrap(t)
  const at = stone.touches[0]
  if (u >= at) return { age: u - at, left: 1 }
  const out = dawnAt(stone)
  const left = 1 - smooth(u, out, out + DAWN_GOING)
  return left > 0 ? { age: u + PERIOD - at, left } : null
}

/**
 * How bright a lamp burns, 0 to 1: it catches as the ball comes down on it, flares as hard as the note was played,
 * and settles to burn, a little unsteadily, until dawn.
 */
export function lampLight(stone: Stone, t: number): number {
  const night = tonight(stone, t)
  if (!night) return 0
  const s = night.age
  const burn = 0.56 * smooth(s, 0, 0.3) * (1 + 0.07 * osc(t, 0.37, stone.index * 1.7))
  const flare = 0.55 * stone.weight[0] * (1 - Math.exp(-s / 0.03)) * Math.exp(-s / 1.6)
  return night.left * Math.min(1, burn + flare + 0.45 * pulse(stone, t))
}

/** How far a flower is open, 0 a bud to 1: it opens as the ball comes, and closes again at dawn. */
export function bloom(stone: Stone, t: number): number {
  const night = tonight(stone, t)
  return night ? night.left * smooth(night.age, 0, 2.2) : 0
}

/**
 * Each piece's last note runs back along the way the ball came: a slow wave of light going back through the piece's
 * stones as the camera draws out, a glint along the columns' tops in the sunset, a flare through the lamps, and,
 * after the third Gnossienne, round the whole planet through the flowers and then the lamps: the night's way, once
 * more, as the period comes round.
 */
export const CADENCES = PIECES.map((piece, i) => ({
  t: piece.last,
  u: along(piece.last),
  pieces: i === 2 ? [1, 2] : [i],
  /** How far back its way goes: to where the first of its pieces began. */
  way: along(piece.last) - along(PIECES[i === 2 ? 1 : i].from),
  /** Cells a second it runs back, how wide it is, and how long it lasts. */
  speed: [3, 3.4, 40][i],
  width: [1.6, 1.6, 7][i],
  lasts: [10, 10, 14][i],
}))

/** Where each cadence's wave is at `t`: cells along, and how bright; for those running now. */
export function cadenceFronts(t: number): { u: number; light: number }[] {
  const out: { u: number; light: number }[] = []
  for (const c of CADENCES) {
    const s = since(t, c.t)
    if (s < 0 || s > c.lasts) continue
    const back = c.speed * s
    const light = smooth(s, 0, 0.6) * (1 - smooth(s, c.lasts * 0.55, c.lasts)) * (1 - smooth(back, c.way - c.width, c.way))
    if (light > 0.01) out.push({ u: c.u - back, light })
  }
  return out
}

/** How much of a cadence's wave is on `stone` at `t`, 0 to 1. */
export function cadence(stone: Stone, t: number): number {
  let out = 0
  for (const c of CADENCES) {
    if (!c.pieces.includes(stone.piece)) continue
    const s = since(t, c.t)
    if (s < 0 || s > c.lasts) continue
    let back = (c.u - (stone.u0 + stone.u1) / 2) % LENGTH
    if (back < 0) back += LENGTH
    const d = back - c.speed * s
    out = Math.max(out, Math.exp(-((d / c.width) ** 2)) * (1 - smooth(s, c.lasts * 0.55, c.lasts)))
  }
  return out
}

/** A restrike's pulse: the chord striking the held note's key again, answered by the stone. */
function pulse(stone: Stone, t: number): number {
  let out = 0
  for (let i = 1; i < stone.touches.length; i++) {
    if (stone.bounced[i]) continue
    const s = since(t, stone.touches[i])
    if (s >= 0 && s < 3) out = Math.max(out, Math.exp(-s / 0.7))
  }
  return out
}

const MARBLE_SHADE = 0.22

/**
 * A column, or a lintel on two: the Gymnopédie's stones, drawn from the front foot, `w` wide, top at `-h`. Slender,
 * with air between: a colonnade in the sea, not a wall.
 */
function column(p: p5, k: number, w: number, h: number, day: Sky, weight: number, shine: number, sun: number): void {
  const K = (v: number) => v * k
  const stone = day.lit
  const shade = mixHex(day.lit, day.sea, MARBLE_SHADE)
  const ink = day.line
  const lintel = w > 0.62
  const shafts = lintel ? [0.14, w - 0.14] : [w / 2]
  const sw = lintel ? 0.11 : Math.max(0.08, Math.min(0.16, w * 0.36))
  const capH = lintel ? 0.09 : 0.06
  const slabW = lintel ? w : Math.min(w, sw * 2.1)
  p.strokeWeight(weight)
  for (const x of shafts) {
    // The shaft, into the sea: lit on the sun's side and in shade on the other, the shade narrowing to noon and
    // crossing over through the afternoon (`sun`, -1 west to 1 east).
    p.stroke(ink)
    p.fill(stone)
    p.rect(K(x), K(-h / 2 + 0.2), K(sw), K(h + 0.4))
    p.noStroke()
    p.fill(alpha(p, shade, 0.8))
    const shadeW = sw * (0.14 + 0.32 * Math.abs(sun))
    p.rect(K(x - sun * (sw / 2 - shadeW / 2 - sw * 0.04)), K(-h / 2 + 0.2), K(shadeW), K(h + 0.4 - 0.02))
    p.stroke(alpha(p, ink, 0.28))
    p.strokeWeight(weight * 0.55)
    const fluting = x + (sun >= 0 ? 1 : -1) * sw * 0.16
    p.line(K(fluting), K(-h + capH + 0.1), K(fluting), K(0.2))
    p.strokeWeight(weight)
    // The capital: a cushion under the slab.
    p.stroke(ink)
    p.fill(stone)
    p.quad(K(x - sw * 0.8), K(-h + capH), K(x + sw * 0.8), K(-h + capH), K(x + sw * 0.52), K(-h + capH + 0.06), K(x - sw * 0.52), K(-h + capH + 0.06))
  }
  // The slab the ball walks on.
  p.fill(stone)
  p.rect(K(w / 2), K(-h + capH / 2), K(slabW), K(capH))
  if (shine > 0.01) {
    p.stroke(alpha(p, '#FFF6E2', shine))
    p.strokeWeight(weight * 1.6)
    p.line(K(w / 2 - slabW / 2 + 0.02), K(-h), K(w / 2 + slabW / 2 - 0.02), K(-h))
  }
}

/**
 * The first Gnossienne's stones: a beam of bronze on slim dark posts, with a lamp at its front that the ball lights
 * as it lands. `lamp` is how bright it burns.
 */
function stele(p: p5, k: number, w: number, h: number, day: Sky, weight: number, lamp: number, withLamp: boolean, lean = 0): void {
  const K = (v: number) => v * k
  const body = mixHex('#23283C', day.lit, 0.2)
  const posts = w > 0.42 ? [0.09, w - 0.09] : [w / 2]
  const pw = w > 0.42 ? 0.075 : Math.max(0.06, Math.min(0.12, w * 0.4))
  p.strokeWeight(weight)
  p.stroke(alpha(p, day.line, 0.7))
  p.fill(body)
  for (const x of posts) p.rect(K(x), K(-h / 2 + 0.2), K(pw), K(h + 0.4))
  // The beam.
  p.fill(mixHex('#6E5232', '#C99C5C', 0.25 + 0.75 * lamp))
  const bw = w > 0.42 ? w : Math.min(w, pw * 2.4)
  p.rect(K(w / 2), K(-h + 0.03), K(bw), K(0.06))
  if (!withLamp) return
  // The lamp: a small bowl at the front, where the ball lands.
  const lx = w > 0.42 ? 0.1 : w / 2
  p.fill(mixHex('#3A2C22', '#E9B866', lamp))
  p.arc(K(lx), K(-h - 0.005), K(0.1), K(0.09), Math.PI, Math.PI * 2, 'chord')
  if (lamp > 0.02) {
    const ctx = p.drawingContext as Ctx2D
    const r = K(0.14 + 0.6 * lamp)
    const cy = K(-h - 0.08)
    const g = ctx.createRadialGradient(K(lx), cy, 0, K(lx), cy, r)
    g.addColorStop(0, `rgba(255, 214, 140, ${(0.75 * lamp).toFixed(3)})`)
    g.addColorStop(0.35, `rgba(242, 170, 80, ${(0.28 * lamp).toFixed(3)})`)
    g.addColorStop(1, 'rgba(242, 170, 80, 0)')
    ctx.fillStyle = g
    ctx.fillRect(K(lx) - r, cy - r, r * 2, r * 2)
    // The flame.
    p.noStroke()
    p.fill(alpha(p, '#FFE7B0', Math.min(1, lamp * 1.4)))
    const fh = 0.05 + 0.06 * lamp
    // Leaning from its foot, as the ball rolls by (`bowAt`).
    p.push()
    p.translate(K(lx), K(-h - 0.05))
    p.rotate(lean)
    p.ellipse(0, K(-fh / 2), K(0.035), K(fh))
    p.pop()
  }
}

/** A lotus leaf on its stem: the third Gnossienne's stones. `open` is how far its flower has opened, if it has one. */
function lotus(p: p5, k: number, w: number, h: number, day: Sky, weight: number, sway: number, open: number, flower: boolean, wave = 0, bow = 0): void {
  const K = (v: number) => v * k
  const leaf = mixHex('#5E8C77', day.lit, 0.25)
  const ink = alpha(p, day.line, 0.75)
  // The stem, from under the sea to the leaf's middle, bowed a little by the swell.
  p.noFill()
  p.stroke(mixHex('#4F7466', day.sea, 0.3))
  p.strokeWeight(Math.max(devicePx(p.drawingContext as Ctx2D), K(0.03)))
  p.bezier(K(w / 2 + sway * 0.4), K(0.3), K(w / 2 - 0.08 + sway), K(-h * 0.35), K(w / 2 + 0.06), K(-h * 0.7), K(w / 2), K(-h + 0.02))
  // The leaf: flat, with a rim turned up at its edge.
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(leaf)
  const rim = Math.min(0.06, 0.03 + w * 0.02)
  p.beginShape()
  p.vertex(K(0), K(-h - rim))
  p.quadraticVertex(K(0.02), K(-h + 0.035), K(w * 0.18), K(-h + 0.04))
  p.vertex(K(w * 0.82), K(-h + 0.04))
  p.quadraticVertex(K(w - 0.02), K(-h + 0.035), K(w), K(-h - rim))
  p.vertex(K(w - 0.03), K(-h))
  p.vertex(K(0.03), K(-h))
  p.endShape(p.CLOSE)
  if (!flower) return
  // The flower at the leaf's far end: a small closed bud, green at its foot, until the ball comes; then open, pale,
  // and lit a little by the moon, so the way the ball has come is a line of flowers and the way ahead is buds.
  const fx = w - Math.min(0.24, w * 0.25)
  const fy = -h - 0.02
  if (open > 0.02) {
    const ctx = p.drawingContext as Ctx2D
    const r = K(0.34 * (1 + 0.5 * wave))
    const cy = K(fy - 0.09)
    const g = ctx.createRadialGradient(K(fx), cy, 0, K(fx), cy, r)
    g.addColorStop(0, `rgba(246, 226, 232, ${(0.22 * open + 0.3 * wave * open).toFixed(3)})`)
    g.addColorStop(1, 'rgba(246, 226, 232, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(K(fx) - r, cy - r, 2 * r, 2 * r)
    ctx.restore()
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  for (const i of [-2, 2, -1, 1, 0]) {
    const a = i * (0.1 + 0.4 * open)
    const len = 0.12 + 0.09 * open - Math.abs(i) * 0.018
    p.push()
    p.translate(K(fx), K(fy))
    p.rotate(a + bow)
    p.fill(mixHex(mixHex('#9DB59A', '#D8A9B3', 0.55), mixHex('#EFC6CD', '#FBF1EE', Math.abs(i) / 3), open))
    p.ellipse(0, K(-len / 2), K(0.05 + 0.035 * open), K(len))
    p.pop()
  }
}

/**
 * Gulls perched on the colonnade, one at the far end of a long stone here and there, most facing the way the ball
 * comes. As the
 * ball comes down on their stone they lift off, on its note, and fly on ahead of it, climbing and beating, until they
 * are gone; and they are back on their perches before the ball comes round again.
 */
export const PERCHED = new Map<number, { at: number; face: number }>()
for (const s of STONES) {
  // Only on a long stone (a held note), at its far end: the ball comes down well away from the gull, which is up and
  // gone before the ball rolls along to where it sat.
  if (s.piece !== 0 || s.u1 - s.u0 < 1.1 || hash(s.index, 211) > 0.6) continue
  PERCHED.set(s.index, { at: s.u1 - 0.18, face: hash(s.index, 213) > 0.35 ? -1 : 1 })
}

plant(new Set(PERCHED.keys()))

/** Where a gull is `s` seconds after it lifts off, from its perch: cells along, and up. Startled up first, then away. */
export const gullFlight = (s: number): [number, number] => [0.15 * s + 0.3 * s * s, 0.12 + 1.3 * s - 0.12 * s * s]

/** Seconds since the gull on `stone` lifted off at `t`: negative while it is still on its perch. */
const flown = (stone: Stone, t: number): number => since(t, stone.touches[0])

/** A gull at rest, in its perch's frame (its feet at the origin, up the frame's up), `k` pixels a cell. */
function perchedGull(p: p5, k: number, day: Sky, weight: number, face: number, t: number, seed: number): void {
  const K = (v: number) => v * k
  const ink = day.line
  const white = mixHex('#F6F3EC', day.lit, 0.35)
  const grey = mixHex('#C3C8CF', day.lit, 0.3)
  // A turn of the head now and then.
  const look = osc(t, 0.07 + 0.04 * hash(seed, 214), seed) > 0.6 ? -1 : 1
  p.push()
  p.scale(face, 1)
  p.strokeWeight(weight * 0.8)
  p.stroke(ink)
  // Legs.
  p.line(K(-0.015), 0, K(-0.02), K(-0.05))
  p.line(K(0.02), 0, K(0.015), K(-0.05))
  // Body, tail and the folded wing.
  p.fill(white)
  p.beginShape()
  p.vertex(K(-0.17), K(-0.1))
  p.quadraticVertex(K(-0.09), K(-0.05), K(0.04), K(-0.05))
  p.quadraticVertex(K(0.12), K(-0.07), K(0.09), K(-0.13))
  p.quadraticVertex(K(-0.02), K(-0.15), K(-0.17), K(-0.1))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(grey)
  p.beginShape()
  p.vertex(K(-0.15), K(-0.105))
  p.quadraticVertex(K(-0.04), K(-0.08), K(0.06), K(-0.12))
  p.quadraticVertex(K(-0.03), K(-0.14), K(-0.16), K(-0.105))
  p.endShape(p.CLOSE)
  // Head and beak.
  p.stroke(ink)
  p.fill(white)
  p.ellipse(K(0.1), K(-0.16), K(0.075), K(0.07))
  p.noStroke()
  p.fill('#E3A04B')
  p.triangle(K(0.1 + 0.03 * look), K(-0.155), K(0.1 + 0.075 * look), K(-0.152), K(0.1 + 0.03 * look), K(-0.142))
  p.fill(ink)
  p.ellipse(K(0.1 + 0.015 * look), K(-0.168), K(0.014), K(0.014))
  p.pop()
}

/**
 * How far a lotus flower (or a lamp's flame) standing at `u` on a stone `h` high bows from the ball at `t`, radians: away from it as it rolls
 * close along the leaf, most when it is nearest, and back upright once it has gone; nothing while the ball is in the air
 * over it. It turns from leaning one way to the other as the ball goes over its foot, where the ball hides it.
 */
function bowAt(u: number, h: number, t: number): number {
  const b = ballLocal(t)
  let du = (u - b.u) % LENGTH
  if (du > LENGTH / 2) du -= LENGTH
  if (du < -LENGTH / 2) du += LENGTH
  const low = Math.exp(-(((b.h - (h + 0.15)) / 0.25) ** 2))
  return 0.6 * Math.tanh(du / 0.08) * Math.exp(-((du / 0.32) ** 2)) * low
}

/** The longest a stone is drawn in one piece: longer, it is several, each standing square to the curve of the sea. */
export const SEGMENT = [1.5, 1.3, 1.1]

/**
 * Every stone in the frame, in its piece's material, on `p` (the stage, or the sea's mirror). Mirrored, each is drawn
 * upside down from its foot, as the still sea gives it back.
 */
export function drawStones(p: p5, c: PieceCtx, v: View, day: Sky, mirrored: boolean): void {
  const k = c.k
  // Which side the sun is on, for the columns' shade: from the east at dawn to the west at dusk.
  // (Taken into a half-turn either way first: through the night the angle runs on round under the planet.)
  const a = Math.atan2(Math.sin(sunAngle(c.t)), Math.cos(sunAngle(c.t)))
  const sun = Math.max(-1, Math.min(1, a / 1.1))
  // Far off, where a cell is a few pixels, each stone is drawn as its silhouette, in its colours, all in a few strokes:
  // the same picture at that size, for a fraction of the work (the wide shot at the seam draws every stone there is).
  // Across a short band of sizes the two are crossed, so nothing the silhouettes leave out (a perched gull, a lamp's
  // flame, an open flower) goes in a frame.
  const ctx = p.drawingContext as Ctx2D
  // By how far out the camera is, as the far lights (`over.ts`) are, so they are wholly up before the flames go, on
  // any size of canvas. The silhouettes stay whole underneath as the full drawing comes in over them, and go only once
  // it is nearly whole, so no stone is seen through.
  if (v.cells > FAR_CELLS[1]) return farStones(ctx, c, v, day, mirrored)
  const whole = 1 - smooth(v.cells, FAR_CELLS[0], FAR_CELLS[1])
  const alpha = ctx.globalAlpha
  if (whole < 1) {
    ctx.globalAlpha = alpha * (1 - smooth(whole, 0.6, 1))
    farStones(ctx, c, v, day, mirrored)
    ctx.globalAlpha = alpha * whole
  }
  for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
    const w = stone.u1 - stone.u0
    // Too small to be anything but a mark.
    if (w * k < 1.5 && v.wide > 0.9) continue
    const h = stone.h - sink(stone, c.t) + float(stone, c.t)
    const n = Math.max(1, Math.ceil(w / SEGMENT[stone.piece]))
    const gap = n > 1 ? 0.07 : 0
    const sw = (w - gap * (n - 1)) / n
    for (let j = 0; j < n; j++) {
      const u0 = stone.u0 + shift + j * (sw + gap)
      p.push()
      atSea(p, k, u0)
      if (mirrored) p.scale(1, -1)
      if (stone.piece === 0) {
        column(p, k, sw, h, day, c.weight, Math.min(1, 0.7 * pulse(stone, c.t) + cadence(stone, c.t)), sun)
        // Bougainvillea over the first of a flowering stone's spans.
        if (j === 0 && BLOSSOM.has(stone.index)) drawBlossom(ctx, k, stone, sw, h, day, c.t)
      } else if (stone.piece === 1) {
        // Lit by the ball, and burning on behind it until dawn: Ariadne's thread in lamps.
        const lit = lampLight(stone, c.t)
        const lampU = u0 + (sw > 0.42 ? 0.1 : sw / 2)
        stele(p, k, sw, h, day, c.weight, lit > 0 ? Math.min(1, lit + 0.45 * cadence(stone, c.t)) : 0, j === 0, j === 0 ? 0.8 * bowAt(lampU, h - 0.05, c.t) : 0)
      } else {
        const sway = 0.03 * osc(c.t, 0.11, stone.index + j)
        const flower = j === n - 1 && w > 0.9
        lotus(p, k, sw, h, day, c.weight, sway, bloom(stone, c.t), flower, cadence(stone, c.t), flower ? bowAt(u0 + sw - Math.min(0.24, sw * 0.25), h, c.t) : 0)
      }
      p.pop()
    }
    const perch = PERCHED.get(stone.index)
    if (perch && flown(stone, c.t) < 0) {
      p.push()
      atSea(p, k, perch.at + shift)
      if (mirrored) p.scale(1, -1)
      p.translate(0, -k * h)
      perchedGull(p, k, day, c.weight, perch.face, c.t, stone.index)
      p.pop()
    }
  }
  ctx.globalAlpha = alpha
}

/** Cells top to bottom of the picture from which the stones are drawn as silhouettes (from the second; crossed between). */
export const FAR_CELLS = [34, 54]
/** How much of a far column's colour is its lit stone, the rest its outline. */
const MARBLE_FAR = 0.35

/**
 * The stones as silhouettes, far off, and in the sea's mirror (where the water's ripple and fade leave no more of
 * them than this): shafts, posts and stems as strokes, slabs, beams and leaves along their tops. */
export function farStones(ctx: Ctx2D, c: PieceCtx, v: View, day: Sky, mirrored: boolean, marble = MARBLE_FAR): void {
  const k = c.k
  const cell = Math.hypot(ctx.getTransform().a, ctx.getTransform().b) * k
  const px = (n: number) => Math.max(0.8, n * cell) / (cell / k)
  const flip = mirrored ? -1 : 1
  const at = (u: number, h: number): [number, number] => {
    const [x, y] = polar(u, h * flip)
    return [x * k, y * k]
  }
  const lit = new Path2D()
  const post = new Path2D()
  const beam = new Path2D()
  const stem = new Path2D()
  const leaf = new Path2D()
  const line = (path: Path2D, u0: number, h0: number, u1: number, h1: number) => {
    const [x0, y0] = at(u0, h0)
    const [x1, y1] = at(u1, h1)
    path.moveTo(x0, y0)
    path.lineTo(x1, y1)
  }
  for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
    const w = stone.u1 - stone.u0
    if (w * k < 1.5 && v.wide > 0.9) continue
    const h = stone.h - sink(stone, c.t) + float(stone, c.t)
    const u0 = stone.u0 + shift
    if (stone.piece === 0) {
      for (const x of w > 0.62 ? [0.14, w - 0.14] : [w / 2]) {
        line(lit, u0 + x, -0.2, u0 + x, h)
      }
      line(lit, u0 + (w > 0.62 ? 0 : w / 2 - 0.12), h, u0 + (w > 0.62 ? w : w / 2 + 0.12), h)
    } else if (stone.piece === 1) {
      for (const x of w > 0.42 ? [0.09, w - 0.09] : [w / 2]) line(post, u0 + x, -0.2, u0 + x, h)
      line(beam, u0 + (w > 0.42 ? 0 : w / 2 - 0.1), h + 0.03, u0 + (w > 0.42 ? w : w / 2 + 0.1), h + 0.03)
    } else {
      line(stem, u0 + w / 2, -0.3, u0 + w / 2, h)
      line(leaf, u0, h + 0.02, u0 + w, h + 0.02)
    }
  }
  ctx.save()
  ctx.lineCap = 'round'
  const stroke = (path: Path2D, colour: string, width: number) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.stroke(path)
  }
  // At this size a column is mostly its ink outline, with a little of its lit stone in the middle.
  stroke(lit, mixHex(day.line, day.lit, marble), px(0.12))
  // A post reads by its outline at night, when the outline is pale, and by its body by day.
  stroke(post, mixHex(mixHex('#23283C', day.lit, 0.2), day.line, 0.6), px(0.1))
  stroke(beam, mixHex('#6E5232', '#C99C5C', 0.6), px(0.07))
  stroke(stem, mixHex('#4F7466', day.sea, 0.3), px(0.03))
  stroke(leaf, mixHex('#5E8C77', day.lit, 0.25), px(0.07))
  ctx.restore()
}

/** The gulls that have lifted off their perches, flying on ahead of the ball, climbing, until they are gone. */
function flyingGulls(p: p5, c: PieceCtx, v: View, day: Sky): void {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const m = ctx.getTransform()
  const cell = Math.hypot(m.a, m.b) * k
  const ink = mixHex(day.line, day.low, 0.15)
  const white = mixHex('#F6F3EC', day.lit, 0.35)
  for (const { stone, shift } of stonesIn(v.u0 - 8, v.u1)) {
    const perch = PERCHED.get(stone.index)
    if (!perch) continue
    const s = flown(stone, c.t)
    if (s < 0 || s > 8) continue
    const h0 = stone.h - sink(stone, stone.touches[0])
    const [du, dh] = gullFlight(s)
    const u = perch.at + shift + du
    const h = h0 + dh
    // Hard at first, then easier: the beat slows as it climbs.
    const beat = Math.sin(2 * Math.PI * (2.4 * s - 0.08 * s * s))
    const a = smooth(s, 0, 0.15) * (1 - smooth(s, 5, 8))
    const [x, y] = onCanvas(ctx, k, ...polar(u, h), m)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, x, y)
    // The same bird as on its perch: white wings, drawn in ink.
    const size = cell * (0.2 - 0.06 * smooth(s, 0, 8))
    const width = Math.max(1.5, cell * 0.03)
    drawGull(ctx, size, beat, ink, a, width)
    drawGull(ctx, size, beat, white, a, width * 0.5)
    ctx.restore()
  }
}

/**
 * Where the ball touches down: a soft shadow on the stone under it, by day, as it rides, thinning as it leaves and
 * growing back as it comes down; and through the first Gnossienne, the flame it carries lays a warm pool on the beam
 * instead.
 */
function underBall(p: p5, c: PieceCtx, day: Sky): void {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const b = ballLocal(c.t)
  const bottom = b.h - BALL_R * (1 + squash(c.t))
  const flame = lamplighter(c.t)
  const shade = 1 - day.night
  if (shade < 0.02 && flame < 0.02) return
  const i = b.stone
  for (const s of [STONES[i], STONES[(i + 1) % STONES.length]]) {
    // The stone it is over, this time round or the next.
    let shift = Math.round((b.u - (s.u0 + s.u1) / 2) / LENGTH) * LENGTH
    if (b.u < s.u0 + shift - 0.05 || b.u > s.u1 + shift + 0.05) continue
    const top = s.h - sink(s, c.t) + float(s, c.t)
    const gap = Math.max(0, bottom - top)
    const near = 1 - smooth(gap, 0, 0.7)
    if (near < 0.02) continue
    p.push()
    atSea(p, k, b.u)
    const r = BALL_R * k * (1.7 - 0.4 * near)
    ctx.translate(0, -top * k)
    // Seen from the side, only on the stone's face under where it touches, not in the air beside it.
    ctx.beginPath()
    ctx.rect(-r * 3, 0, r * 6, r * 3)
    ctx.clip()
    ctx.scale(1, 0.45)
    if (shade > 0.02) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
      g.addColorStop(0, `rgba(24, 26, 42, ${(0.34 * shade * near).toFixed(3)})`)
      g.addColorStop(0.5, `rgba(24, 26, 42, ${(0.2 * shade * near).toFixed(3)})`)
      g.addColorStop(1, 'rgba(24, 26, 42, 0)')
      ctx.fillStyle = g
      ctx.fillRect(-r, -r, 2 * r, 2 * r)
    }
    if (flame > 0.02) {
      const R = r * 2.2
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
      g.addColorStop(0, `rgba(255, 206, 130, ${(0.35 * flame * near).toFixed(3)})`)
      g.addColorStop(1, 'rgba(255, 206, 130, 0)')
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.fillRect(-R, -R, 2 * R, 2 * R)
      ctx.globalCompositeOperation = 'source-over'
    }
    p.pop()
  }
}

export const stones = scenery<null>('stones', (p, _s, c) => {
  const v = viewOf(p, c)
  const day = weathered(c.t)
  drawStones(p, c, v, day, false)
  if (v.wide < 0.5) underBall(p, c, day)
  flyingGulls(p, c, v, day)
})
