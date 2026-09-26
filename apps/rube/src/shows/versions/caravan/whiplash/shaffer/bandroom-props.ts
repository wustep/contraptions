import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { alpha, hash, type Ctx } from '../kit'
import { KIT, SHOP } from '../worlds'
import { BACK_H, SEAT_H, type Section } from './band-plan'


/** A stroke in a colour with alpha over a fill. */
function penFill(p: p5, colour: p5.Color, w: number, fill: string): void {
  p.stroke(colour)
  p.strokeWeight(w)
  p.fill(fill)
}

/**
 * The band room's props, drawn one way wherever they stand: the chair (every chair in the room, the one that is
 * thrown included), a player seated in profile with a horn, a player's music stand with its lamp, and Tanner's
 * chart on its stand facing the house, whose page Andrew turns.
 *
 * Everything takes its place in the band's frame and draws in cells times `c.k`; `light` (0..1) is how much of the
 * room's tungsten reaches it.
 */

/** A shade of `hex` in the room's light: toward the room's dark as the light goes. */
export const lit = (hex: string, light: number): string => mixHex(SHOP.deep, hex, 0.3 + 0.7 * Math.max(0, Math.min(1, light)))

/** Brass, as the band's horns are: duller and darker than the ball, so he never sits against it. */
export const BRASS = mixHex(KIT.bronze, SHOP.deep, 0.22)
/** A player: a warm black a step off the room's dark, so the figure reads against the wall behind it. */
const BODY = mixHex(SHOP.black, SHOP.deep, 0.4)

/* ------------------------------------------------------------------ the chair */

/**
 * A band chair, in profile: a moulded seat and back on a tubular steel frame (the back legs run up into the back's
 * post). `at` is the middle of the seat's top; `facing` 1 has its front to the right. `turn` rolls it about the
 * seat's middle; `scale` shrinks it (as it goes back toward a wall).
 */
export function drawChair(p: p5, c: Ctx, at: Pt, facing: 1 | -1, light: number, turn = 0, scale = 1, quiet = false): void {
  const { k, weight } = c
  // A chair in the band's rows is part of the dark: no ink edge, the steel only a shade off the black.
  const ink = quiet ? mixHex(SHOP.black, c.bg, 0.4) : c.ink
  const steel = quiet ? mixHex(SHOP.black, SHOP.panel, 0.35 + 0.25 * light) : lit(KIT.chrome, light * 0.85)
  const shell = quiet ? mixHex(SHOP.black, SHOP.deep, 0.25) : lit(SHOP.black, 0.35 + 0.65 * light)
  const f = facing
  const back = BACK_H - SEAT_H
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(turn)
  p.scale(scale)
  const K = k
  const X = (v: number) => v * f * K
  const Y = (v: number) => v * K
  // The frame: tubes with an ink edge, the steel catching the light.
  const tube = (pts: Pt[], w = 1) => {
    for (const [sw, col] of [[weight * 2.6 * w, ink], [weight * 1.5 * w, steel]] as const) {
      p.stroke(col)
      p.strokeWeight(sw)
      p.noFill()
      p.beginShape()
      for (const [x, y] of pts) p.vertex(X(x), Y(y))
      p.endShape()
    }
  }
  // Back leg and post, one bend of tube; the front leg, raked a little forward; the stretcher between them.
  tube([[-0.46, SEAT_H], [-0.37, 0.07], [-0.39, -back * 0.5], [-0.47, -back]], 1.15)
  tube([[0.46, SEAT_H], [0.36, 0.08]], 1.15)
  tube([[-0.415, SEAT_H * 0.64], [0.41, SEAT_H * 0.64]], 0.85)
  // The seat: a moulded shell with some thickness, its front edge rolled down.
  solid(p, ink, weight * 0.9, shell)
  p.beginShape()
  p.vertex(X(-0.47), Y(-0.03))
  p.bezierVertex(X(-0.15), Y(0.03), X(0.2), Y(0.02), X(0.44), Y(-0.02))
  p.bezierVertex(X(0.52), Y(-0.01), X(0.53), Y(0.11), X(0.45), Y(0.14))
  p.bezierVertex(X(0.2), Y(0.15), X(-0.15), Y(0.16), X(-0.45), Y(0.13))
  p.endShape(p.CLOSE)
  // The back: a moulded panel as tall as a hand is long, curved to the sitter, leaning back with the post.
  p.beginShape()
  p.vertex(X(-0.35), Y(-back * 0.46))
  p.bezierVertex(X(-0.28), Y(-back * 0.64), X(-0.33), Y(-back * 0.88), X(-0.41), Y(-back * 1.03))
  p.vertex(X(-0.57), Y(-back * 0.99))
  p.bezierVertex(X(-0.51), Y(-back * 0.84), X(-0.47), Y(-back * 0.64), X(-0.5), Y(-back * 0.44))
  p.endShape(p.CLOSE)
  // A thin catch of the lamp's light along the seat's top.
  p.stroke(alpha(p, SHOP.tungsten, (quiet ? 0.18 : 0.35) * light))
  p.strokeWeight(weight * 0.6)
  p.line(X(-0.38), Y(0.015), X(0.38), Y(0.02))
  p.pop()
}

/* ------------------------------------------------------------------ a player */

/** What a player's horn is doing: up at the mouth or down, lifted on an accent, a trombone's slide out. */
export interface Playing {
  /** 0 in the lap, 1 at the mouth. */
  up: number
  /** Radians the bell lifts on an accent. */
  lift: number
  /** A trombone's slide, 0 in to 1 out. */
  slide: number
  /** 0 seated, 1 standing (the trumpets stand for the tutti). */
  stand: number
  /** A small sway with the time. */
  sway: number
}

/**
 * A player seated in profile facing right, on a band chair, holding a horn: dark, faceless, a rim of the lamp's
 * light on the back of the head and shoulders. `seat` is the chair's seat middle. `depth` 0 is the nearest of a
 * section, 1 and 2 behind (smaller, darker).
 */
export function drawPlayer(p: p5, c: Ctx, seat: Pt, section: Section, play: Playing, light: number, depth: number, seed: number): void {
  const { k, weight } = c
  // No ink round a player: a silhouette, its only edge the lamp's rim.
  const ink = mixHex(SHOP.black, c.bg, 0.25)
  const s = 1 - depth * 0.05
  const dark = depth * 0.18
  const body = mixHex(BODY, SHOP.black, dark)
  const L = light * (1 - dark)
  p.push()
  p.translate(seat[0] * k, seat[1] * k)
  drawChair(p, { ...c, weight: weight * s }, [0, 0], 1, L * 0.8, 0, s, true)
  p.scale(s)
  const K = k
  const V = (x: number, y: number) => p.vertex(x * K, y * K)
  // Standing: the hips rise and come forward, the knees straighten.
  const st = play.stand
  const hip: Pt = [-0.08 + 0.12 * st, -0.14 - 0.72 * st]
  const knee: Pt = [0.4 - 0.2 * st, -0.12 - 0.38 * st]
  const foot: Pt = [0.46 - 0.12 * st, SEAT_H - 0.02]
  const lean = 0.12 + 0.03 * play.sway + (section === 'saxes' ? 0.06 : 0)
  const shoulder: Pt = [hip[0] + 0.1 + lean * 0.9, hip[1] - 0.88]
  const neck: Pt = [shoulder[0] + 0.05, shoulder[1] - 0.12]
  const tilt = -play.lift * 0.5 * play.up
  const head: Pt = [neck[0] + 0.07, neck[1] - 0.2]
  // Legs: thigh and shin as thick soft strokes, the foot a wedge.
  p.noFill()
  for (const [w, col] of [[0.25, ink], [0.2, body]] as const) {
    p.stroke(col)
    p.strokeWeight((w * K) / 1)
    p.strokeCap(p.ROUND)
    p.beginShape()
    V(...hip)
    V(...knee)
    V(...foot)
    p.endShape()
  }
  p.strokeCap(p.ROUND)
  p.noStroke()
  p.fill(body)
  p.beginShape()
  V(foot[0] - 0.1, foot[1] - 0.08)
  V(foot[0] + 0.16, foot[1] - 0.04)
  V(foot[0] + 0.17, foot[1] + 0.02)
  V(foot[0] - 0.1, foot[1] + 0.02)
  p.endShape(p.CLOSE)
  // Torso: a soft wedge from the hips to the shoulders, leaning in to the horn.
  p.beginShape()
  V(hip[0] - 0.2, hip[1] + 0.08)
  p.bezierVertex((hip[0] - 0.26) * K, (hip[1] - 0.4) * K, (shoulder[0] - 0.3) * K, (shoulder[1] + 0.1) * K, (shoulder[0] - 0.18) * K, (shoulder[1] - 0.02) * K)
  p.bezierVertex((shoulder[0] - 0.05) * K, (shoulder[1] - 0.1) * K, (shoulder[0] + 0.14) * K, (shoulder[1] - 0.04) * K, (shoulder[0] + 0.17) * K, (shoulder[1] + 0.12) * K)
  p.bezierVertex((shoulder[0] + 0.2) * K, (shoulder[1] + 0.45) * K, (hip[0] + 0.24) * K, (hip[1] - 0.2) * K, (hip[0] + 0.2) * K, (hip[1] + 0.1) * K)
  p.endShape(p.CLOSE)
  // Head: an egg, tipped forward to the horn and back on a lift; no face.
  p.push()
  p.translate(head[0] * K, head[1] * K)
  p.rotate(0.25 + tilt)
  p.ellipse(0, 0, 0.3 * K, 0.38 * K)
  p.pop()
  // The rim: the lamp's light along the back of the head and shoulders.
  p.stroke(alpha(p, SHOP.tungsten, 0.12 + 0.4 * L))
  p.strokeWeight(weight * 1.1)
  p.noFill()
  p.arc(head[0] * K, head[1] * K, 0.3 * K, 0.38 * K, Math.PI * 0.95, Math.PI * 1.55)
  p.line((shoulder[0] - 0.2) * K, (shoulder[1] + 0.05) * K, (shoulder[0] - 0.06) * K, (shoulder[1] - 0.06) * K)
  // The horn, from the mouth: up to play (with a lift on the accents), down across the lap to rest.
  const mouth: Pt = [head[0] + 0.15, head[1] + 0.07]
  const lap: Pt = [hip[0] + 0.35, hip[1] - 0.28]
  const at: Pt = [lap[0] + (mouth[0] - lap[0]) * play.up, lap[1] + (mouth[1] - lap[1]) * play.up]
  const aim = (1 - play.up) * (section === 'saxes' ? -0.6 : 0.9) - play.lift * play.up
  drawHorn(p, c, at, aim, section, play, L, seed)
  // The near arm: shoulder to the horn's grip.
  const grip: Pt = [at[0] + Math.cos(aim) * 0.3 - (section === 'saxes' ? 0.1 : 0), at[1] + Math.sin(aim) * 0.3 + (section === 'saxes' ? 0.35 : 0.05)]
  const elbow: Pt = [(shoulder[0] + grip[0]) / 2 - 0.02, Math.max(shoulder[1], grip[1]) + 0.2]
  for (const [w, col] of [[0.17, ink], [0.12, body]] as const) {
    p.stroke(col)
    p.strokeWeight(w * K)
    p.noFill()
    p.beginShape()
    V(shoulder[0] + 0.02, shoulder[1] + 0.08)
    V(...elbow)
    V(...grip)
    p.endShape()
  }
  p.pop()
}

/** A horn in profile from its mouthpiece at `at`, pointing along `aim` (radians; 0 straight ahead, to the right). */
function drawHorn(p: p5, c: Ctx, at: Pt, aim: number, section: Section, play: Playing, light: number, seed: number): void {
  const { k, weight } = c
  // Brass edged in the room's dark, not in ink: the horns catch the light, the players stay in shadow.
  const ink = mixHex(SHOP.black, SHOP.deep, 0.3)
  const K = k
  const brass = lit(BRASS, 0.3 + 0.7 * light)
  p.push()
  p.translate(at[0] * K, at[1] * K)
  p.rotate(aim)
  const tube = (pts: Pt[], w: number) => {
    for (const [sw, col] of [[w + weight * 1.1, ink], [w, brass]] as const) {
      p.stroke(col)
      p.strokeWeight(sw)
      p.noFill()
      p.beginShape()
      for (const [x, y] of pts) p.vertex(x * K, y * K)
      p.endShape()
    }
  }
  const bell = (x: number, y: number, len: number, mouth: number, dir = 1) => {
    solid(p, ink, weight * 0.8, brass)
    p.beginShape()
    p.vertex(x * K, (y - 0.035) * K)
    p.bezierVertex((x + len * 0.6 * dir) * K, (y - 0.04) * K, (x + len * 0.85 * dir) * K, (y - mouth * 0.3) * K, (x + len * dir) * K, (y - mouth) * K)
    p.vertex((x + len * dir) * K, (y + mouth) * K)
    p.bezierVertex((x + len * 0.85 * dir) * K, (y + mouth * 0.3) * K, (x + len * 0.6 * dir) * K, (y + 0.04) * K, x * K, (y + 0.035) * K)
    p.endShape(p.CLOSE)
  }
  if (section === 'trumpets') {
    // Leadpipe forward, the valve block, the tube looping back under, the bell out front.
    tube([[0, 0], [0.42, 0.02]], weight * 1.6)
    tube([[0.2, 0.02], [0.22, 0.12], [0.5, 0.12], [0.52, 0.02]], weight * 1.3)
    solid(p, ink, weight * 0.7, brass)
    for (const x of [0.28, 0.34, 0.4]) p.rect(x * K, -0.03 * K, 0.035 * K, 0.14 * K, 0.01 * K)
    bell(0.42, 0.02, 0.36, 0.1)
  } else if (section === 'bones') {
    // The slide, out and in with the beat; the bell section above it, flared forward; the tuning bow behind.
    const ext = 0.2 + 0.55 * play.slide
    tube([[0, 0.02], [0.55 + ext, 0.02], [0.6 + ext, 0.08], [0.55 + ext, 0.13], [0.05, 0.13]], weight * 1.2)
    tube([[0.05, -0.05], [0.6, -0.08]], weight * 1.5)
    bell(0.6, -0.08, 0.34, 0.14)
    tube([[0.02, -0.05], [-0.28, -0.02], [-0.32, 0.06], [-0.2, 0.1]], weight * 1.3)
  } else {
    // An alto: the crook down from the mouth, the body falling back and down, the bow, the bell turned up and out.
    const sway = (hash(seed) - 0.5) * 0.08
    p.rotate(0.9 + sway)
    tube([[0, 0], [0.12, 0.03], [0.2, 0.1]], weight * 1.4)
    solid(p, ink, weight * 0.8, brass)
    p.beginShape()
    p.vertex(0.18 * K, 0.08 * K)
    p.vertex(0.26 * K, 0.1 * K)
    p.vertex(0.78 * K, 0.18 * K)
    p.bezierVertex(0.94 * K, 0.2 * K, 0.96 * K, 0.02 * K, 0.84 * K, -0.02 * K)
    p.vertex(0.62 * K, -0.08 * K)
    p.bezierVertex(0.58 * K, -0.2 * K, 0.6 * K, -0.2 * K, 0.52 * K, -0.2 * K)
    p.vertex(0.5 * K, 0.0 * K)
    p.vertex(0.2 * K, 0.0)
    p.endShape(p.CLOSE)
    // Its keys: a few small dark pads along the body.
    p.noStroke()
    p.fill(alpha(p, SHOP.black, 0.55))
    for (let i = 0; i < 4; i++) p.ellipse((0.34 + i * 0.1) * K, (0.1 + i * 0.013) * K, 0.04 * K, 0.03 * K)
  }
  p.pop()
}

/* ------------------------------------------------------------------ a player's stand */

/** A music stand in profile in front of a player: its tripod, its post, the desk tipped toward the player, and a lamp. */
export function drawPlayerStand(p: p5, c: Ctx, foot: Pt, light: number, glow: number, depth: number): void {
  const { k, weight } = c
  const ink = mixHex(SHOP.black, c.bg, 0.25)
  const s = 1 - depth * 0.05
  const K = k * s
  const col = mixHex(SHOP.black, SHOP.panel, 0.2 + 0.3 * light)
  p.push()
  p.translate(foot[0] * k, foot[1] * k)
  p.stroke(ink)
  p.strokeWeight(weight * 1.3)
  p.line(-0.2 * K, 0, 0, -0.28 * K)
  p.line(0.22 * K, 0, 0, -0.28 * K)
  p.stroke(col)
  p.strokeWeight(weight * 0.8)
  p.line(-0.2 * K, 0, 0, -0.28 * K)
  p.line(0.22 * K, 0, 0, -0.28 * K)
  p.stroke(ink)
  p.strokeWeight(weight * 1.5)
  p.line(0, -0.28 * K, 0, -1.72 * K)
  p.stroke(col)
  p.strokeWeight(weight * 0.9)
  p.line(0, -0.28 * K, 0, -1.72 * K)
  // The desk, edge on, tipped back toward the player; a page on it, catching the lamp.
  p.push()
  p.translate(0, -1.72 * K)
  p.rotate(-0.55)
  solid(p, ink, weight * 0.8, col)
  p.rect(0, -0.34 * K, 0.07 * K, 0.7 * K, 0.02 * K)
  p.stroke(alpha(p, SHOP.window, 0.3 + 0.55 * glow * light))
  p.strokeWeight(weight * 1.1)
  p.line(-0.05 * K, -0.33 * K, -0.05 * K, 0.3 * K)
  // The lamp, clipped to the desk's top, its hood over the page.
  solid(p, ink, weight * 0.7, col)
  p.quad(-0.02 * K, -0.4 * K, -0.2 * K, -0.44 * K, -0.2 * K, -0.36 * K, -0.02 * K, -0.33 * K)
  p.pop()
  p.pop()
}

/* ------------------------------------------------------------------ Tanner's chart */

/**
 * Tanner's chart on its stand, facing the house: a tripod, a post, a dark desk with a ledge along its bottom, the
 * chart open on it (two pale pages ruled with a few bars, nothing that reads as writing), and a small lamp over it.
 * `turned` pages have gone over; `u` is how far the one going over has got (its free corner carried by the ball).
 */
export function drawChartStand(p: p5, c: Ctx, x: number, ledge: number, w: number, h: number, floor: number, turned: number, u: number, light: number): void {
  const { k, ink, weight } = c
  const K = k
  const col = lit(SHOP.black, 0.45 + 0.55 * light)
  const hub = floor - 0.42
  p.push()
  // Tripod and post.
  for (const [sw, cc] of [[weight * 1.6, ink], [weight * 0.95, col]] as const) {
    p.stroke(cc)
    p.strokeWeight(sw)
    p.line((x - 0.42) * K, floor * K, x * K, hub * K)
    p.line((x + 0.42) * K, floor * K, x * K, hub * K)
    p.line(x * K, floor * K, x * K, hub * K)
    p.line(x * K, hub * K, x * K, (ledge + 0.02) * K)
  }
  // The desk and its ledge.
  const top = ledge - h
  const half = w / 2
  solid(p, ink, weight * 0.9, col)
  p.beginShape()
  p.vertex((x - half) * K, top * K)
  p.vertex((x + half) * K, top * K)
  p.vertex((x + half) * K, ledge * K)
  p.vertex((x - half) * K, ledge * K)
  p.endShape(p.CLOSE)
  p.beginShape()
  p.vertex((x - half - 0.05) * K, (ledge - 0.02) * K)
  p.vertex((x + half + 0.05) * K, (ledge - 0.02) * K)
  p.vertex((x + half + 0.05) * K, (ledge + 0.05) * K)
  p.vertex((x - half - 0.05) * K, (ledge + 0.05) * K)
  p.endShape(p.CLOSE)
  // The chart: two pages, each ruled with a few bars; a page's ruling is its own, so a new page reads as new.
  const paper = lit(mixHex(KIT.head, SHOP.window, 0.35), 0.45 + 0.55 * light)
  const pw = half - 0.05
  const py0 = top + 0.06
  const py1 = ledge - 0.05
  // A page's ruling: three staves (a band of four thin lines each), each crossed by a bar line or two at its full
  // height; no notes, nothing that reads as writing.
  const rule = (x0: number, x1: number, page: number) => {
    p.stroke(alpha(p, SHOP.deep, 0.5))
    p.strokeWeight(weight * 0.4)
    const staves = 3
    for (let i = 0; i < staves; i++) {
      const y0 = py0 + ((py1 - py0) * (i + 0.45)) / (staves + 0.15)
      const a = x0 + (x1 - x0) * 0.08
      const b = x1 - (x1 - x0) * 0.08
      for (let j = 0; j < 4; j++) p.line(a * K, (y0 + j * 0.035) * K, b * K, (y0 + j * 0.035) * K)
      const bars = 1 + Math.floor(hash(page, i, 7) * 2)
      for (let j = 0; j <= bars + 1; j++) {
        const bx = a + ((b - a) * j) / (bars + 1)
        p.line(bx * K, y0 * K, bx * K, (y0 + 0.105) * K)
      }
    }
  }
  p.noStroke()
  p.fill(paper)
  p.rect((x - pw / 2 - 0.02) * K, ((py0 + py1) / 2) * K, pw * K, (py1 - py0) * K)
  p.rect((x + pw / 2 + 0.02) * K, ((py0 + py1) / 2) * K, pw * K, (py1 - py0) * K)
  rule(x - pw - 0.02, x - 0.02, turned * 2)
  rule(x + 0.02, x + pw + 0.02, turned * 2 + (u > 0 ? 3 : 1))
  // The page going over: from the spine to its free corner, lifting in the middle of its travel. Past halfway its
  // back is the new left page, ruled as that page is.
  if (u > 0) {
    const edge = x + (pw + 0.02) * Math.cos(Math.PI * u)
    const lift = 0.14 * Math.sin(Math.PI * u)
    const face = u < 0.5
    const shade = 1 - 0.25 * Math.sin(Math.PI * u)
    penFill(p, alpha(p, SHOP.deep, 0.7), weight * 0.6, lit(mixHex(KIT.head, SHOP.window, 0.35), (0.45 + 0.55 * light) * shade))
    p.beginShape()
    p.vertex(x * K, py0 * K)
    p.vertex(edge * K, (py0 - lift * 0.7) * K)
    p.vertex(edge * K, (py1 - lift) * K)
    p.vertex(x * K, py1 * K)
    p.endShape(p.CLOSE)
    if (face) rule(x + 0.02, edge, turned * 2 + 1)
    else if (u > 0.62) rule(edge, x - 0.02, turned * 2 + 2)
  }
  // The spine.
  p.stroke(alpha(p, SHOP.deep, 0.6))
  p.strokeWeight(weight * 0.7)
  p.line(x * K, py0 * K, x * K, py1 * K)
  p.pop()
}
