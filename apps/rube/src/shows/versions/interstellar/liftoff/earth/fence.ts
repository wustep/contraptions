import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { type Pt } from '../../../../../parts'
import { alpha, hash, puff } from '../kit'
import { PERIOD } from '../music'
import { G_EARTH } from '../physics'
import { DUST } from '../worlds'

/**
 * The split-rail fence the truck goes through on bar four's downbeat (`truck.ts`), and how it breaks: two posts and
 * two rails, each rail two lengths nailed to the posts and butted in the middle, where the grille takes them.
 *
 * - The near lengths keep their nails at the near post. Their broken ends drop, the length swings down on its nail,
 *   and the broken end strikes the ground, kicks, and rests: two boards slanting from the post into the stubble.
 * - The far lengths are torn off the far post and thrown on ahead of the grille, tumbling. The low one comes down on
 *   the eighth (80½) and the high one on the next beat (81): each hits on an end or a face, kicks up a little dust,
 *   bounces once, slides, and lies flat. They are heavy timber, so gravity is the farm's own and nothing floats.
 * - The far post, yanked forward as its rails go, tips over on its foot and settles leaning; the near one shudders.
 * - A few splinters fly off the break, fall, and are gone in the stubble.
 *
 * The flights are worked out once, as a rigid board under gravity with the ground under it (an impulse at each corner
 * that goes into it, with friction), and sampled; the swings, as a board on a nail. Everything here is in the fence's
 * frame: x from its middle, y down from the ground, seconds from the hit.
 */

const RAIL_L = 0.94
const RAIL_T = 0.08
const POST_W = 0.1
const POST_H = 0.9
/** The posts' x, and the two rails' heights over the ground. */
const POST_X = 0.95
const RAILS = [0.72, 0.38] as const

const STEP = 1 / 240
const SPAN = 2.4
/** How lively the timber is off the ground, and how hard it drags. */
const BOUNCE = 0.22
const GRIP = 0.55

interface Flight {
  /** x, y, angle per step. */
  path: Float32Array
  /** When it first meets the ground, and where. */
  land: number
  landX: number
}

/** A board of `len` by `thick`, thrown from `p` at angle `a` with velocity `v` and spin `w`, until it lies still. */
function fly(p: Pt, a: number, v: Pt, w: number, len = RAIL_L, thick = RAIL_T): Flight {
  const n = Math.ceil(SPAN / STEP)
  const path = new Float32Array((n + 1) * 3)
  const inertia = (len * len + thick * thick) / 12
  let [x, y] = p
  let [vx, vy] = v
  let land = Infinity
  let landX = x
  let still = false
  for (let i = 0; i <= n; i++) {
    path[i * 3] = x
    path[i * 3 + 1] = y
    path[i * 3 + 2] = a
    if (still) continue
    vy += G_EARTH * STEP
    x += vx * STEP
    y += vy * STEP
    a += w * STEP
    // The corners: any under the ground is pushed back up through an impulse at it, and dragged along it.
    for (let pass = 0; pass < 2; pass++) {
      for (const [cx, cy] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
        const rx = Math.cos(a) * cx * len - Math.sin(a) * cy * thick
        const ry = Math.sin(a) * cx * len + Math.cos(a) * cy * thick
        const depth = y + ry
        if (depth <= 0) continue
        if (land === Infinity) {
          land = i * STEP
          landX = x
        }
        y -= depth
        const py = vy + w * rx
        if (py <= 0) continue
        const jn = (-(1 + BOUNCE) * py) / (1 + (rx * rx) / inertia)
        vy += jn
        w += (rx * jn) / inertia
        const qx = vx - w * ry
        let jt = -qx / (1 + (ry * ry) / inertia)
        jt = Math.max(-GRIP * Math.abs(jn), Math.min(GRIP * Math.abs(jn), jt))
        vx += jt
        w -= (ry * jt) / inertia
      }
    }
    // Lying on the ground and barely moving: it is down. Flat on a face, square to the ground, so it does not rock.
    const low = y + Math.abs(Math.sin(a)) * len * 0.5 + Math.abs(Math.cos(a)) * thick * 0.5
    if (land < Infinity && low > -0.01 && Math.hypot(vx, vy) < 0.05 && Math.abs(w) < 0.3) still = true
  }
  return { path, land, landX }
}

/** Seconds from the hit at which a board thrown so first meets the ground, for the throw's upward speed `up`. */
const landsAt = (p: Pt, a: number, vx: number, up: number, w: number): number => fly(p, a, [vx, -up], w).land

/** The upward speed that brings a board down at `when` (seconds after the hit). */
function aimed(p: Pt, a: number, vx: number, w: number, when: number): number {
  let lo = -2
  let hi = 6
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (landsAt(p, a, vx, mid, w) < when) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Where a board is at `k` seconds after the hit. */
function sample(f: Flight, k: number): [number, number, number] {
  const u = Math.max(0, Math.min(f.path.length / 3 - 1.001, k / STEP))
  const i = Math.floor(u)
  const s = u - i
  const at = (j: number) => f.path[i * 3 + j] + (f.path[(i + 1) * 3 + j] - f.path[i * 3 + j]) * s
  return [at(0), at(1), at(2)]
}

/**
 * A board on a nail at its outer end, its broken end let go: how far it has swung down (radians from level) at `k`
 * seconds after the hit, worked out once per rail height. It stops where the broken end meets the ground.
 */
function swing(height: number): Float32Array {
  const n = Math.ceil(SPAN / STEP)
  const out = new Float32Array(n + 1)
  // The grille's knock starts it down; its end meets the ground at this angle (the board is longer than the rail is high).
  const stop = Math.asin(Math.min(1, (height - RAIL_T / 2) / RAIL_L))
  let phi = 0
  let dphi = 1.6
  for (let i = 0; i <= n; i++) {
    out[i] = phi
    dphi += ((3 * G_EARTH) / (2 * RAIL_L)) * Math.cos(phi) * STEP
    dphi *= 1 - 0.4 * STEP
    phi += dphi * STEP
    if (phi >= stop) {
      phi = stop
      dphi = dphi > 0.4 ? -dphi * 0.25 : 0
    }
  }
  return out
}

interface Break {
  /** The far lengths' flights, high rail then low; the near lengths' swings, the same. */
  thrown: Flight[]
  swung: Float32Array[]
  splinters: { p: Pt; v: Pt; w: number; len: number }[]
}

let made: { vc: number; brk: Break } | null = null

/** The break, for a truck going `vc` cells a second through it. */
function breakFor(vc: number): Break {
  if (made && made.vc === vc) return made.brk
  // The high length comes down on the next beat, after half a turn backwards (the grille took it low); the low one
  // on the eighth, nose down. Each turns just short of flat by then, so it lands on one end and slaps down on the other.
  const plan = [
    { y: -RAILS[0], vx: vc * 1.15, w: -(Math.PI - 0.3) / PERIOD, when: PERIOD },
    { y: -RAILS[1], vx: vc * 1.25, w: 0.3 / (PERIOD / 2), when: PERIOD / 2 },
  ]
  const thrown = plan.map(({ y, vx, w, when }) => {
    const p: Pt = [RAIL_L / 2, y]
    return fly(p, 0, [vx, -aimed(p, 0, vx, w, when)], w)
  })
  const swung = RAILS.map((h) => swing(h))
  const splinters: Break['splinters'] = []
  for (let i = 0; i < 6; i++) {
    splinters.push({
      p: [0.02, -RAILS[i % 2] + (hash(i, 41) - 0.5) * RAIL_T],
      v: [vc * (0.9 + 0.7 * hash(i, 42)), -(1.2 + 2.2 * hash(i, 43))],
      w: (hash(i, 44) - 0.5) * 30,
      len: 0.08 + 0.1 * hash(i, 45),
    })
  }
  const brk = { thrown, swung, splinters }
  made = { vc, brk }
  return brk
}

/**
 * A length of rail: centred on the origin along x, its broken end (the side `jag` points to, or none) splintered
 * rather than sawn square.
 */
function board(p: p5, k: number, ink: string, weight: number, jag: -1 | 0 | 1): void {
  const X = (v: number) => v * k
  const h = RAIL_T / 2
  const l = RAIL_L / 2
  // Long tongues of grain torn out along the board at the broken end, not a saw's square end; drawn for the right
  // end and mirrored for the left.
  const end: Pt[] = jag === 0 ? [[l, -h], [l, h]] : [[l, -h], [l + 0.07, -h * 0.35], [l - 0.02, -h * 0.05], [l + 0.1, h * 0.3], [l - 0.03, h * 0.62], [l + 0.03, h]]
  const pts: Pt[] = [[-l, -h], ...end, [-l, h]].map(([px, py]): Pt => [jag < 0 ? -px : px, py])
  solid(p, ink, weight, DUST.wood)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
  // The grain: one line along it.
  outline(p, alpha(p, ink, 0.35).toString(), weight * 0.5)
  p.line(X(-l + 0.08), X(h * 0.1), X(l - 0.12), X(h * 0.1))
}

/** A post on its foot at (x, ground), leaning `lean` radians (positive: its top forward, the way the truck goes). */
function post(p: p5, k: number, ink: string, weight: number, x: number, ground: number, lean: number): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(ground))
  p.rotate(lean)
  solid(p, ink, weight, DUST.wood)
  p.rect(0, X(-POST_H / 2), X(POST_W), X(POST_H))
  p.pop()
}

/**
 * The fence at `x` on the ground at `ground` (world cells), `k` seconds since the grille hit it (negative before),
 * the truck going `vc` cells a second.
 */
export function drawFence(p: p5, k: number, ink: string, weight: number, x: number, ground: number, since: number, vc: number): void {
  const X = (v: number) => v * k
  if (since <= 0) {
    for (const side of [-1, 1]) post(p, k, ink, weight, x + side * POST_X, ground, 0)
    for (const h of RAILS) {
      for (const half of [-1, 1]) {
        p.push()
        p.translate(X(x + half * RAIL_L / 2), X(ground - h))
        board(p, k, ink, weight, 0)
        p.pop()
      }
    }
    return
  }
  const brk = breakFor(vc)
  const i = Math.min(Math.floor(since / STEP), brk.swung[0].length - 1)

  // The near post shudders with the knock and is left a little out of true; the far one is pulled over by its rails
  // as they go, and comes to rest leaning, heavily: one slow overshoot and still.
  const near = 0.05 * (1 - Math.exp(-since / 0.1)) + 0.06 * Math.exp(-since / 0.14) * Math.sin(since * 26)
  const pull = since / 0.22
  const far = 0.32 * (1 - Math.exp(-pull) * (Math.cos(pull * 1.7) + (1 / 1.7) * Math.sin(pull * 1.7)))
  post(p, k, ink, weight, x - POST_X, ground, near)
  post(p, k, ink, weight, x + POST_X, ground, far)

  // The near lengths, swinging on their nails at the near post into the ground.
  RAILS.forEach((h, r) => {
    const phi = brk.swung[r][i]
    const nail: Pt = [x - RAIL_L + 0.02, ground - h]
    p.push()
    p.translate(X(nail[0]), X(nail[1]))
    p.rotate(phi)
    p.translate(X(RAIL_L / 2 - 0.02), 0)
    board(p, k, ink, weight, 1)
    p.pop()
  })

  // The far lengths, thrown, and dust where each comes down.
  for (const f of brk.thrown) {
    const [bx, by, a] = sample(f, since)
    const age = since - f.land
    if (age > 0 && age < 0.7) {
      const u = age / 0.7
      p.push()
      p.drawingContext.globalAlpha = 0.7 * (1 - u) * (1 - u)
      puff(p, k, alpha(p, ink, 0.5).toString(), weight * 0.6, DUST.husk, x + f.landX + 0.15 * age, ground - 0.06 - age * 0.12, 0.07 + age * 0.16)
      p.pop()
    }
    p.push()
    p.translate(X(x + bx), X(ground + by))
    p.rotate(a)
    board(p, k, ink, weight, -1)
    p.pop()
  }

  // Splinters off the break: a moment in the air, and gone where they fall.
  for (const s of brk.splinters) {
    let sx = s.p[0] + s.v[0] * since
    let sy = s.p[1] + s.v[1] * since + 0.5 * G_EARTH * since * since
    let a = s.w * since
    if (sy > 0) {
      // Down: where it fell, lying.
      const tl = (-s.v[1] + Math.sqrt(s.v[1] * s.v[1] - 2 * G_EARTH * s.p[1])) / G_EARTH
      sx = s.p[0] + s.v[0] * tl
      sy = -0.01
      a = 0.1 * Math.sign(s.w)
    }
    const fade = 1 - Math.min(1, Math.max(0, (since - 0.5) / 0.3))
    if (fade <= 0) continue
    const dx = Math.cos(a) * s.len * 0.5
    const dy = Math.sin(a) * s.len * 0.5
    p.stroke(alpha(p, ink, fade))
    p.strokeWeight(Math.max(1, weight * 0.9))
    p.line(X(x + sx - dx), X(ground + sy - dy), X(x + sx + dx), X(ground + sy + dy))
  }
}
