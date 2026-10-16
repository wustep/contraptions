import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { MOVIE_MAT as M } from '../worlds'
import { box2, seg, shape, trackAt, type Key } from './movie-kit'

/**
 * The life a family's film catches round the three of them without meaning to, a little of it in every shot and more
 * as the reel goes on: a sprinkler on the lawn at the house; the dog at the party, and the pinwheels; a kite over the
 * beach, a sandcastle, a crab, more boats out on the swell; a plane going over the pool; a train along the far hills
 * and a wind pump turning over the field; at home, the curtains stirring and the cat asleep on the rug.
 *
 * All in the home movie part's cells, drawn behind the balls and inside the gate, in the film's own colours.
 */

const TAU = Math.PI * 2
const DOG = '#B07A4A'
const DOG_DEEP = '#7E5333'

/** A lawn sprinkler: its head in the grass, swinging a fan of water slowly side to side. */
export function sprinkler(p: p5, k: number, ink: string, w: number, x: number, foot: number, t: number): void {
  const swing = 0.75 * Math.sin(t * 1.25)
  p.noStroke()
  for (let j = 0; j < 4; j++) {
    const a = -Math.PI / 2 + swing + (j - 1.5) * 0.12
    const v = 1.8 + 0.1 * j
    // Each jet a run of drops along its arc, travelling out along it.
    for (let i = 0; i < 9; i++) {
      const u = ((i / 9 + t * 0.9 + j * 0.13) % 1) * 0.8
      const dx = Math.cos(a) * v * u
      const dy = Math.sin(a) * v * u + 2.4 * u * u
      if (foot - 0.05 + dy > foot + 0.02) continue
      p.fill(alpha(p, i % 2 ? M.cream : M.sky, 0.85 - 0.6 * (u / 0.8)))
      p.ellipse((x + dx) * k, (foot - 0.05 + dy) * k, 0.035 * k, 0.03 * k)
    }
  }
  box2(p, k, x - 0.07, foot - 0.07, x + 0.07, foot + 0.01, M.teal, ink, w * 0.6, 0.02)
  seg(p, k, [x, foot - 0.07], [x + Math.sin(swing) * 0.08, foot - 0.13], ink, w * 0.9)
}

/** A pinwheel on its stick in the lawn, turning in the breeze. */
export function pinwheel(p: p5, k: number, ink: string, w: number, x: number, foot: number, h: number, t: number, i: number): void {
  const hub: Pt = [x, foot - h]
  seg(p, k, [x, foot], hub, ink, w * 0.9)
  const a0 = t * (3.2 + 0.8 * i) + 1.6 * Math.sin(t * 0.7 + i)
  const cols = [M.pink, M.sun, M.teal, M.orange]
  for (let b = 0; b < 4; b++) {
    const a = a0 + (b * TAU) / 4
    const r = 0.15
    const tip: Pt = [hub[0] + Math.cos(a) * r, hub[1] + Math.sin(a) * r]
    const side: Pt = [hub[0] + Math.cos(a + 0.9) * r * 0.75, hub[1] + Math.sin(a + 0.9) * r * 0.75]
    shape(p, k, [hub, tip, side], cols[(b + i) % 4], ink, w * 0.5)
  }
  p.noStroke()
  p.fill(ink)
  p.circle(hub[0] * k, hub[1] * k, 0.035 * k)
}

/**
 * The dog: sitting, trotting or bounding along the lawn, facing the way it goes. `pose` is 0 sitting, 1 trotting,
 * 2 bounding; `look` tips its head up (at the balloons).
 */
export function dog(p: p5, k: number, ink: string, w: number, x: number, foot: number, t: number, face: number, pose: number, look: number): void {
  const run = Math.min(1, pose)
  const bound = Math.max(0, pose - 1)
  const gait = t * (9 + 4 * bound)
  const hop = bound * 0.07 * Math.abs(Math.sin(gait * 0.5))
  const sit = 1 - run
  const y = foot - 0.17 - hop + 0.04 * sit
  const f = face
  // The legs: four lines that swing when it goes, folded under when it sits.
  for (let i = 0; i < 4; i++) {
    const front = i < 2
    const lx = x + f * (front ? 0.11 : -0.12) + (i % 2 ? 0.03 : -0.03)
    const sw = run * 0.07 * Math.sin(gait + (i % 2 ? Math.PI : 0) + (front ? 0 : Math.PI / 2))
    const ly = front ? foot - hop : foot - hop * 0.5 - 0.02 * sit
    seg(p, k, [lx, y + 0.04], [lx + sw * f + (front ? 0 : -0.05 * sit * f), ly], i % 2 ? ink : alpha(p, ink, 0.75), w * 1.3)
  }
  // The tail, wagging: faster when it is happy (which is always).
  const wag = 0.5 * Math.sin(t * 13)
  const tb: Pt = [x - f * 0.16, y - 0.04]
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 1.1)
  p.bezier(tb[0] * k, tb[1] * k, (tb[0] - f * 0.06) * k, (tb[1] - 0.06) * k, (tb[0] - f * 0.08 + 0.03 * wag) * k, (tb[1] - 0.12) * k, (tb[0] - f * 0.05 + 0.07 * wag) * k, (tb[1] - 0.18) * k)
  // The body, tipped up at the front when it sits.
  p.push()
  p.translate(x * k, y * k)
  p.rotate(-f * 0.35 * sit)
  p.fill(DOG)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.ellipse(0, 0, 0.36 * k, 0.17 * k)
  p.noStroke()
  p.fill(alpha(p, M.cream, 0.8))
  p.ellipse(f * 0.08 * k, 0.03 * k, 0.12 * k, 0.07 * k)
  p.pop()
  // The head, up at the front, tipped further up to look; an ear that flops as it goes.
  const hx = x + f * (0.19 + 0.02 * sit)
  const hy = y - 0.12 - 0.07 * sit - 0.03 * look
  p.push()
  p.translate(hx * k, hy * k)
  p.rotate(-f * 0.5 * look)
  p.fill(DOG)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.circle(0, 0, 0.17 * k)
  p.ellipse(f * 0.08 * k, 0.025 * k, 0.11 * k, 0.07 * k)
  p.noStroke()
  p.fill(ink)
  p.circle(f * 0.13 * k, 0.012 * k, 0.03 * k)
  p.circle(f * 0.03 * k, -0.02 * k, 0.022 * k)
  const flop = 0.25 * Math.sin(gait * 0.5) * run
  p.fill(DOG_DEEP)
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  p.push()
  p.rotate(f * (0.3 + flop))
  p.ellipse(-f * 0.05 * k, 0.04 * k, 0.06 * k, 0.12 * k)
  p.pop()
  p.pop()
}

/** Where the dog is at the party, how it goes, which way it faces and where it looks: keyed to the party's own beats. */
export interface DogKey {
  t: number
  x: number
  pose: number
  look?: number
}
export function dogAt(keys: DogKey[], t: number): { x: number; face: number; pose: number; look: number } {
  const tk: Key[] = keys.map((d) => ({ t: d.t, p: [d.x, 0] }))
  const x = trackAt(tk, t)[0]
  const x2 = trackAt(tk, t + 0.05)[0]
  let i = 0
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++
  const a = keys[i]
  const b = keys[Math.min(keys.length - 1, i + 1)]
  const u = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0
  const pose = a.pose + (b.pose - a.pose) * u
  const look = (a.look ?? 0) + ((b.look ?? 0) - (a.look ?? 0)) * u
  // It faces the way it is going; standing still, the way it last went.
  let face = 1
  for (let j = 1; j < keys.length && keys[j].t <= t + 0.05; j++) if (Math.abs(keys[j].x - keys[j - 1].x) > 0.05) face = Math.sign(keys[j].x - keys[j - 1].x)
  if (Math.abs(x2 - x) > 0.002) face = Math.sign(x2 - x)
  return { x, face, pose, look }
}

/** A kite high over the beach on a long string down out of the picture, swaying, its tail of bows waving. */
export function kite(p: p5, k: number, ink: string, w: number, x: number, y: number, to: Pt, t: number): void {
  const kx = x + 0.18 * Math.sin(t * 0.55) + 0.05 * Math.sin(t * 1.7)
  const ky = y + 0.1 * Math.sin(t * 0.8 + 1)
  const tilt = 0.18 * Math.sin(t * 0.55 + 0.6)
  p.noFill()
  p.stroke(alpha(p, ink, 0.6))
  p.strokeWeight(w * 0.5)
  p.bezier(kx * k, (ky + 0.2) * k, (kx - 0.2) * k, (ky + 1.0) * k, (to[0] + 0.6) * k, (to[1] - 0.6) * k, to[0] * k, to[1] * k)
  p.push()
  p.translate(kx * k, ky * k)
  p.rotate(tilt)
  shape(p, k, [[0, -0.24], [0.16, -0.02], [0, 0.22], [-0.16, -0.02]], M.pink, ink, w * 0.7)
  shape(p, k, [[0, -0.24], [0.16, -0.02], [0, -0.02]], M.sun, null)
  shape(p, k, [[0, 0.22], [-0.16, -0.02], [0, -0.02]], M.sun, null)
  seg(p, k, [0, -0.24], [0, 0.22], ink, w * 0.5)
  seg(p, k, [-0.16, -0.02], [0.16, -0.02], ink, w * 0.5)
  // The tail: a line with bows on it, waving after it.
  let px = 0
  let py = 0.22
  for (let i = 1; i <= 6; i++) {
    const nx = 0.06 * Math.sin(t * 3 - i * 0.9)
    const ny = 0.22 + i * 0.11
    seg(p, k, [px, py], [nx, ny], alpha(p, ink, 0.7), w * 0.5)
    shape(p, k, [[nx - 0.04, ny - 0.02], [nx + 0.04, ny + 0.02], [nx + 0.04, ny - 0.02], [nx - 0.04, ny + 0.02]], i % 2 ? M.teal : M.orange, null)
    px = nx
    py = ny
  }
  p.pop()
}

/** A sandcastle: two towers and a keep, crenellated, a paper flag on the keep. */
export function sandcastle(p: p5, k: number, ink: string, w: number, x: number, foot: number, t: number): void {
  const sand = '#E2C68F'
  const tower = (cx: number, hw: number, h: number) => {
    const top = foot - h
    const pts: Pt[] = [[cx - hw - 0.03, foot], [cx - hw, top]]
    for (let i = 0; i < 3; i++) {
      const x0 = cx - hw + (i * 2 * hw) / 3
      const x1 = x0 + (2 * hw) / 6
      pts.push([x0, top - 0.05], [x1, top - 0.05], [x1, top])
    }
    pts.push([cx + hw, top - 0.05], [cx + hw, top], [cx + hw + 0.03, foot])
    shape(p, k, pts, sand, ink, w * 0.7)
  }
  tower(x - 0.2, 0.08, 0.24)
  tower(x + 0.2, 0.08, 0.22)
  tower(x, 0.12, 0.34)
  shape(p, k, [[x - 0.3, foot], [x + 0.3, foot], [x + 0.28, foot - 0.1], [x - 0.28, foot - 0.1]], sand, ink, w * 0.7)
  box2(p, k, x - 0.035, foot - 0.12, x + 0.035, foot, alpha(p, ink, 0.55), null, 0, 0.02)
  // The flag on its stick, flapping.
  seg(p, k, [x, foot - 0.39], [x, foot - 0.6], ink, w * 0.6)
  const flap = 0.025 * Math.sin(t * 6)
  shape(p, k, [[x, foot - 0.6], [x + 0.16, foot - 0.56 + flap], [x, foot - 0.5]], M.orange, ink, w * 0.5)
}

/** A crab on the sand, scuttling sideways in fits and starts, its legs going, its claws up. */
export function crab(p: p5, k: number, ink: string, w: number, x: number, foot: number, t: number, moving: number): void {
  const y = foot - 0.05
  const scut = t * 24
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const lx = x + s * (0.05 + i * 0.025)
      const kick = moving * 0.02 * Math.sin(scut + i * 2 + (s > 0 ? Math.PI : 0))
      seg(p, k, [lx, y], [lx + s * 0.05 + kick, foot], ink, w * 0.6)
    }
  for (const s of [-1, 1]) {
    const nip = 0.012 * Math.sin(t * 5 + s)
    seg(p, k, [x + s * 0.06, y - 0.02], [x + s * 0.1, y - 0.08], ink, w * 0.6)
    p.fill('#D9603E')
    p.stroke(ink)
    p.strokeWeight(w * 0.5)
    p.ellipse((x + s * 0.11) * k, (y - 0.1 - nip) * k, 0.06 * k, 0.045 * k)
  }
  p.fill('#D9603E')
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  p.ellipse(x * k, y * k, 0.16 * k, 0.08 * k)
  p.noStroke()
  p.fill(ink)
  p.circle((x - 0.025) * k, (y - 0.05) * k, 0.02 * k)
  p.circle((x + 0.025) * k, (y - 0.05) * k, 0.02 * k)
}

/** The swell far out: lines of it rolling in from the horizon toward the shore, one after another. */
export function swell(p: p5, k: number, w: number, x0: number, x1: number, far: number, near: number, t: number): void {
  p.noFill()
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.22 + i / 3) % 1
    const y = far + (near - far) * u * u
    const a = Math.sin(Math.PI * u) * 0.5
    p.stroke(alpha(p, M.cream, a))
    p.strokeWeight(w * (0.6 + 0.8 * u))
    p.beginShape()
    for (let x = x0; x <= x1 + 0.2; x += 0.3) p.vertex(x * k, (y + 0.012 * Math.sin(x * 2.3 + i)) * k)
    p.endShape()
  }
}

/** A light plane crossing the sky, a long thin trail drawn out behind it and fading. */
export function plane(p: p5, k: number, ink: string, w: number, x: number, y: number, trail: number): void {
  p.noFill()
  const n = 8
  for (let i = 0; i < n; i++) {
    p.stroke(alpha(p, '#FBF4E2', 0.75 * (1 - i / n)))
    p.strokeWeight(w * (1.4 - i * 0.08))
    p.line((x - 0.22 - (i * trail) / n) * k, (y + 0.005 * i) * k, (x - 0.22 - ((i + 1) * trail) / n) * k, (y + 0.005 * (i + 1)) * k)
  }
  shape(p, k, [[x - 0.2, y - 0.02], [x + 0.14, y - 0.025], [x + 0.2, y], [x + 0.14, y + 0.025], [x - 0.2, y + 0.02]], M.cream, ink, w * 0.5)
  shape(p, k, [[x - 0.02, y], [x + 0.06, y], [x - 0.03, y - 0.13], [x - 0.08, y - 0.13]], M.orange, ink, w * 0.4)
  shape(p, k, [[x - 0.2, y - 0.01], [x - 0.15, y - 0.01], [x - 0.2, y - 0.08]], M.orange, ink, w * 0.4)
}

/** A little train along the far hills: an engine and four cars running along the track at the hills' foot. */
export function train(p: p5, k: number, ink: string, w: number, x: number, track: (x: number) => number, x0: number, x1: number): void {
  // The track.
  p.noFill()
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(w * 0.5)
  p.beginShape()
  for (let tx = x0; tx <= x1 + 0.3; tx += 0.3) p.vertex(tx * k, track(tx) * k)
  p.endShape()
  const cars = [M.orange, M.cream, M.teal, M.cream, M.pink]
  for (let i = 0; i < cars.length; i++) {
    const cx = x - i * 0.27
    if (cx < x0 - 0.3 || cx > x1 + 0.3) continue
    const y = track(cx)
    const y2 = track(cx + 0.1)
    const ang = Math.atan2(y2 - y, 0.1)
    p.push()
    p.translate(cx * k, y * k)
    p.rotate(ang)
    if (i === 0) {
      shape(p, k, [[-0.12, -0.02], [0.12, -0.02], [0.12, -0.09], [0.05, -0.09], [0.05, -0.15], [-0.12, -0.15]], cars[i], ink, w * 0.5)
      box2(p, k, -0.09, -0.21, -0.05, -0.15, ink, null)
    } else {
      box2(p, k, -0.12, -0.13, 0.12, -0.02, cars[i], ink, w * 0.5)
      for (const wx of [-0.06, 0.02]) box2(p, k, wx, -0.11, wx + 0.05, -0.07, alpha(p, ink, 0.4), null)
    }
    p.pop()
  }
}

/** A wind pump on a far hill: its lattice tower, its wheel of blades turning, its tail to the wind. */
export function windPump(p: p5, k: number, ink: string, w: number, x: number, foot: number, t: number): void {
  const h = 0.7
  const ink2 = alpha(p, ink, 0.7)
  seg(p, k, [x - 0.1, foot], [x - 0.02, foot - h], ink2, w * 0.6)
  seg(p, k, [x + 0.1, foot], [x + 0.02, foot - h], ink2, w * 0.6)
  for (let i = 1; i < 4; i++) {
    const y = foot - (h * i) / 4
    const hw = 0.1 - (0.08 * i) / 4
    seg(p, k, [x - hw, y], [x + hw, y], ink2, w * 0.4)
  }
  const hub: Pt = [x, foot - h - 0.02]
  shape(p, k, [[hub[0], hub[1] - 0.01], [hub[0] + 0.28, hub[1] - 0.05], [hub[0] + 0.28, hub[1] + 0.05], [hub[0], hub[1] + 0.01]], alpha(p, M.cream, 0.9), ink2, w * 0.4)
  const a0 = t * 2.4
  p.stroke(ink2)
  p.strokeWeight(w * 0.5)
  for (let i = 0; i < 12; i++) {
    const a = a0 + (i * TAU) / 12
    p.line(hub[0] * k, hub[1] * k, (hub[0] + Math.cos(a) * 0.18) * k, (hub[1] + Math.sin(a) * 0.18) * k)
  }
  p.noFill()
  p.circle(hub[0] * k, hub[1] * k, 0.36 * k)
}

/** Curtains at a window, gathered at its sides, their hems stirring in the evening air. */
export function curtains(p: p5, k: number, ink: string, w: number, x0: number, x1: number, y0: number, y1: number, t: number, col: string): void {
  for (const s of [-1, 1]) {
    const outer = s < 0 ? x0 - 0.12 : x1 + 0.12
    const inner = s < 0 ? x0 + 0.3 : x1 - 0.3
    const stir = 0.04 * Math.sin(t * 0.9 + s) + 0.02 * Math.sin(t * 2.1 + 2 * s)
    const pts: Pt[] = [[outer, y0 - 0.1], [inner, y0 - 0.1]]
    for (let i = 1; i <= 6; i++) {
      const u = i / 6
      pts.push([inner + s * 0.12 * Math.sin(u * Math.PI) * 0.6 + (s < 0 ? stir : -stir) * u * u, y0 - 0.1 + (y1 + 0.25 - y0 + 0.1) * u])
    }
    pts.push([outer, y1 + 0.25])
    shape(p, k, pts, col, ink, w * 0.7)
    for (let i = 1; i < 3; i++) {
      const fx = outer + (inner - outer) * (i / 3)
      seg(p, k, [fx, y0 - 0.06], [fx + (s < 0 ? stir : -stir) * 0.5, y1 + 0.2], alpha(p, ink, 0.25), w * 0.5)
    }
  }
  // The rod.
  seg(p, k, [x0 - 0.2, y0 - 0.12], [x1 + 0.2, y0 - 0.12], ink, w * 1.2)
}

/** The cat, asleep in a curl on the rug: breathing, its tail's tip twitching now and then, an ear flicking once. */
export function cat(p: p5, k: number, ink: string, w: number, x: number, foot: number, t: number): void {
  const breathe = 1 + 0.03 * Math.sin(t * 2.2)
  const ginger = '#D9884A'
  // The tail round the front of it, its tip flicking.
  const flick = Math.max(0, Math.sin(t * 0.8)) ** 6 * 0.08 * Math.sin(t * 9)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 2.4)
  p.bezier((x + 0.2) * k, (foot - 0.04) * k, (x + 0.1) * k, (foot + 0.02) * k, (x - 0.15) * k, (foot + 0.01) * k, (x - 0.24) * k, (foot - 0.04 + flick) * k)
  p.stroke(ginger)
  p.strokeWeight(w * 1.4)
  p.bezier((x + 0.2) * k, (foot - 0.04) * k, (x + 0.1) * k, (foot + 0.02) * k, (x - 0.15) * k, (foot + 0.01) * k, (x - 0.24) * k, (foot - 0.04 + flick) * k)
  p.fill(ginger)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.ellipse(x * k, (foot - 0.1 * breathe) * k, 0.46 * k, 0.2 * breathe * k)
  for (let i = 0; i < 3; i++) seg(p, k, [x - 0.08 + i * 0.08, foot - 0.18 * breathe], [x - 0.1 + i * 0.08, foot - 0.08], alpha(p, ink, 0.3), w * 0.6)
  // Its head, tucked down at the left, the ears up; one flicks.
  const ear = hash(Math.floor(t / 2.6), 7) > 0.6 ? 0.1 * Math.max(0, Math.sin(((t % 2.6) / 2.6) * Math.PI * 6)) : 0
  const hx = x - 0.2
  const hy = foot - 0.12
  shape(p, k, [[hx - 0.08, hy - 0.04], [hx - 0.07, hy - 0.15 - ear], [hx - 0.02, hy - 0.07]], ginger, ink, w * 0.6)
  shape(p, k, [[hx + 0.02, hy - 0.07], [hx + 0.06, hy - 0.15], [hx + 0.08, hy - 0.04]], ginger, ink, w * 0.6)
  p.fill(ginger)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.ellipse(hx * k, hy * k, 0.19 * k, 0.15 * k)
  seg(p, k, [hx - 0.05, hy], [hx - 0.02, hy + 0.005], ink, w * 0.5)
  seg(p, k, [hx + 0.02, hy + 0.005], [hx + 0.05, hy], ink, w * 0.5)
}

/* ------------------------------------------------------------------ the pool's own life */

/**
 * Next door, over the hedge at the back of the pool: a stretch of their fence, their tree over it stirring, and their
 * sprinkler's arc of water swinging up over the fence and back. Drawn before the hedge, so the hedge stands in front.
 */
export function nextDoor(p: p5, k: number, ink: string, w: number, x0: number, x1: number, foot: number, t: number): void {
  // Their tree, behind the fence.
  const tx = x0 + 0.75
  const sway = 0.025 * Math.sin(t * 0.7)
  seg(p, k, [tx, foot], [tx + sway * 0.4, foot - 0.95], alpha(p, ink, 0.7), w * 1.3)
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(w * 0.7)
  p.fill(alpha(p, M.teal, 0.9))
  p.ellipse((tx + sway) * k, (foot - 1.2) * k, 0.95 * k, 0.8 * k)
  p.noStroke()
  p.fill(alpha(p, M.grass, 0.55))
  p.ellipse((tx - 0.12 + sway) * k, (foot - 1.3) * k, 0.45 * k, 0.36 * k)
  // Their sprinkler, out of sight behind the fence: a fan of jets swinging slowly over it, its drops running out along
  // each arc and falling back behind the boards.
  const sx = x1 - 0.7
  const src = foot - 0.35
  const swing = Math.sin(t * 0.9)
  p.noStroke()
  for (let j = 0; j < 5; j++) {
    const reach = (0.55 + 0.1 * j) * swing
    const high = 0.75 + 0.06 * j
    for (let i = 0; i < 10; i++) {
      const u = (i / 10 + t * 0.85 + j * 0.17) % 1
      const x = sx + reach * u
      const y = src - 4 * high * u * (1 - u)
      if (y > foot - 0.66) continue
      p.fill(alpha(p, i % 2 ? M.cream : M.sky, 0.8 - 0.5 * u))
      p.ellipse(x * k, y * k, 0.035 * k, 0.03 * k)
    }
  }
  // The fence: pointed boards, weathered, standing a little taller than the hedge in front of it.
  const top = foot - 0.72
  for (let x = x0, i = 0; x < x1; x += 0.13, i++) {
    const h = 0.02 * hash(i, 77)
    shape(p, k, [[x, foot], [x, top + 0.05 - h], [x + 0.055, top - h], [x + 0.11, top + 0.05 - h], [x + 0.11, foot]], i % 3 ? M.warm : M.cream, alpha(p, ink, 0.55), w * 0.5)
  }
}

/** A car going by on the street beyond the hedge: its cabin and the top of its body showing over the hedge as it passes. */
export function passingCar(p: p5, k: number, ink: string, w: number, x: number, foot: number): void {
  const body = '#C2604A'
  shape(p, k, [[x - 0.55, foot], [x - 0.55, foot - 0.28], [x - 0.3, foot - 0.32], [x - 0.18, foot - 0.52], [x + 0.25, foot - 0.52], [x + 0.38, foot - 0.32], [x + 0.55, foot - 0.28], [x + 0.55, foot]], body, ink, w * 0.7)
  shape(p, k, [[x - 0.12, foot - 0.33], [x - 0.06, foot - 0.47], [x + 0.03, foot - 0.47], [x + 0.03, foot - 0.33]], M.sky, ink, w * 0.5)
  shape(p, k, [[x + 0.08, foot - 0.33], [x + 0.08, foot - 0.47], [x + 0.21, foot - 0.47], [x + 0.29, foot - 0.33]], M.sky, ink, w * 0.5)
}

/**
 * In the pool: the band of tiles at its waterline, along the long wall the section shows; the dark marks on that wall
 * under the water, seen through it; a ladder; a pool noodle riding the surface; and, after each of them goes in, the
 * bubbles coming up. `under` draws what is below the water (after the water, so it is seen through it, and dimmer);
 * otherwise what is above it.
 */
export function poolLife(p: p5, k: number, ink: string, w: number, x0: number, x1: number, lip: number, water: number, floor: number, surface: (x: number) => number, t: number, dives: [number, number][], under: boolean): void {
  const LADDER = 2.35
  if (!under) {
    // The waterline tiles: a band of small squares just above the water, dark and light by turns.
    for (let x = x0 + 0.04, i = 0; x < x1; x += 0.1, i++) box2(p, k, x, water - 0.11, x + 0.09, water - 0.02, i % 2 ? M.cream : alpha(p, M.teal, 0.6), alpha(p, ink, 0.35), w * 0.3)
    // The ladder's rails coming up out of the water and over onto the deck, and its top rung.
    for (const dx of [-0.13, 0.13]) {
      const x = LADDER + dx
      p.noFill()
      p.stroke(M.cream)
      p.strokeWeight(w * 1.6)
      p.beginShape()
      p.vertex(x * k, (water + 0.05) * k)
      p.bezierVertex(x * k, (lip - 0.5) * k, (x - 0.3) * k, (lip - 0.5) * k, (x - 0.32) * k, lip * k)
      p.endShape()
    }
    return
  }
  // Under the water, seen through it: the ladder's rungs; the return jet's current, wavering out from the wall.
  for (let i = 0; i < 4; i++) {
    const u = ((t * 0.5 + i / 4) % 1)
    const x = x0 + 0.15 + 1.4 * u
    const y = RETURN_Y + 0.05 * Math.sin(t * 2.3 + i * 1.7) + (i - 1.5) * 0.04
    seg(p, k, [x, y], [x + 0.25, y + 0.01], alpha(p, M.cream, 0.4 * (1 - u)), w * 0.6)
  }
  void floor
  for (const dx of [-0.13, 0.13]) seg(p, k, [LADDER + dx, water + 0.02], [LADDER + dx, water + 0.9], alpha(p, M.cream, 0.55), w * 1.4)
  for (const y of [0.18, 0.46, 0.74]) seg(p, k, [LADDER - 0.13, water + y], [LADDER + 0.13, water + y], alpha(p, M.cream, 0.55), w * 1.1)
  // The surface's marks: short strokes just under it, drifting slowly the way the breeze pushes the water.
  for (let i = 0; i < 9; i++) {
    const span = x1 - x0
    const x = x0 + 0.3 + ((i / 9) * span + t * 0.12 + 0.3 * hash(i, 81)) % (span - 0.6)
    const y = surface(x) + 0.05 + 0.05 * hash(i, 82)
    seg(p, k, [x, y], [x + 0.22 + 0.1 * hash(i, 83), y + 0.004], alpha(p, M.cream, 0.45), w * 0.7)
  }
  // Bubbles after each of them goes in: a short column wobbling up from where they went under, and gone at the top.
  for (const [at, x] of dives) {
    const s = t - at
    if (s < 0.15 || s > 2.6) continue
    for (let i = 0; i < 8; i++) {
      const u = (s - 0.15 - 0.22 * i) / 1.3
      if (u <= 0 || u >= 1) continue
      const bx = x + 0.12 * (hash(i, 84) - 0.5) + 0.03 * Math.sin(s * 9 + i)
      const by = water + 0.6 - 0.58 * u
      p.noFill()
      p.stroke(alpha(p, M.cream, 0.8 * (1 - u * u)))
      p.strokeWeight(w * 0.6)
      p.circle(bx * k, by * k, (0.035 + 0.025 * hash(i, 85)) * k)
    }
  }
}

/** A pink pool noodle riding the surface at x, tipping with the water under its two ends. */
export function noodle(p: p5, k: number, ink: string, w: number, x: number, surface: (x: number) => number): void {
  const L = 0.45
  const a: Pt = [x - L, surface(x - L) + 0.02]
  const b: Pt = [x + L, surface(x + L) + 0.02]
  const n = Math.hypot(b[0] - a[0], b[1] - a[1])
  const ny = (b[0] - a[0]) / n
  const nx = -(b[1] - a[1]) / n
  const r = 0.05
  shape(p, k, [[a[0] + nx * r, a[1] + ny * r], [b[0] + nx * r, b[1] + ny * r], [b[0] - nx * r, b[1] - ny * r], [a[0] - nx * r, a[1] - ny * r]], M.pink, ink, w * 0.6)
}

/** How deep the return jet comes into the pool, below its wall's top. */
const RETURN_Y = 0.62
/**
 * The pool's plumbing, in the ground the section cuts: the pump in its pit under the deck, its motor humming round,
 * a pipe from the skimmer at the waterline down to it, and the return pipe out to the jet in the pool wall, the water
 * running through both as a stream of dashes.
 */
export function poolPlumbing(p: p5, k: number, ink: string, w: number, pumpX: number, wall: number, lip: number, water: number, t: number): void {
  const pump: Pt = [pumpX, 0.5]
  const pipe = '#D9CDB0'
  const pw = 0.09
  // The runs: skimmer (at the wall, just under the waterline) down and along to the pump's top; pump's side out to the
  // return jet in the wall.
  const suction: Pt[] = [[wall - 0.05, water + 0.12], [wall - 0.6, water + 0.12], [wall - 0.6, 0.12], [pump[0] + 0.1, 0.12], [pump[0] + 0.1, pump[1] - 0.2]]
  const back: Pt[] = [[pump[0] + 0.28, pump[1] + 0.1], [wall, pump[1] + 0.1]]
  for (const run of [suction, back]) {
    for (let i = 1; i < run.length; i++) {
      const [a, b] = [run[i - 1], run[i]]
      const x = Math.min(a[0], b[0]) - pw / 2
      const y = Math.min(a[1], b[1]) - pw / 2
      box2(p, k, x, y, Math.max(a[0], b[0]) + pw / 2, Math.max(a[1], b[1]) + pw / 2, pipe, alpha(p, ink, 0.6), w * 0.5)
    }
  }
  // The water running through them: dashes travelling along each run at the pump's pace.
  const flow = (run: Pt[], dir: number) => {
    const lens = run.slice(1).map((q, i) => Math.hypot(q[0] - run[i][0], q[1] - run[i][1]))
    const total = lens.reduce((a, b) => a + b, 0)
    for (let d = 0; d < total; d += 0.22) {
      let s = (d + dir * t * 0.55) % total
      if (s < 0) s += total
      let i = 0
      while (i < lens.length - 1 && s > lens[i]) s -= lens[i++]
      const [a, b] = [run[i], run[i + 1]]
      const u = s / lens[i]
      const x = a[0] + (b[0] - a[0]) * u
      const y = a[1] + (b[1] - a[1]) * u
      const ux = (b[0] - a[0]) / lens[i]
      const uy = (b[1] - a[1]) / lens[i]
      seg(p, k, [x - ux * 0.04, y - uy * 0.04], [x + ux * 0.04, y + uy * 0.04], alpha(p, M.pool, 0.9), w * 0.9)
    }
  }
  flow(suction, 1)
  flow(back, 1)
  // The skimmer's mouth in the wall, and the jet's.
  box2(p, k, wall - 0.12, water + 0.04, wall, water + 0.2, alpha(p, ink, 0.55), null)
  box2(p, k, wall - 0.06, pump[1] + 0.04, wall, pump[1] + 0.16, alpha(p, ink, 0.55), null)
  // The pump: its pit, its body, and the motor's fan turning behind its grille.
  box2(p, k, pump[0] - 0.42, pump[1] - 0.32, pump[0] + 0.42, pump[1] + 0.32, alpha(p, ink, 0.18), null, 0, 0.04)
  box2(p, k, pump[0] - 0.32, pump[1] - 0.2, pump[0] + 0.3, pump[1] + 0.22, M.teal, ink, w * 0.7, 0.05)
  p.noFill()
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(w * 0.6)
  p.circle((pump[0] - 0.08) * k, pump[1] * k, 0.26 * k)
  const a0 = t * 7
  for (let b = 0; b < 3; b++) {
    const a = a0 + (b * TAU) / 3
    seg(p, k, [pump[0] - 0.08, pump[1]], [pump[0] - 0.08 + Math.cos(a) * 0.11, pump[1] + Math.sin(a) * 0.11], alpha(p, ink, 0.7), w * 0.7)
  }
  void lip
}
