import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../../src/core/ease'
import { FLOOR, puff, type Pt } from '../../../../parts'
import { alpha, box, carried, frame, hash, part, smooth, type Ctx } from './kit'
import { beat, IGNITION } from './music'
import { DUST } from './worlds'

/**
 * The rocket: the only door between the two worlds.
 *
 * It stands on the pad beside the gantry the whole show, drawn with the
 * farm's ink, and the ball goes into the round window in its nose while the
 * lamps count down. Beat 134, when the organ's pedal comes in under
 * everything: the engines light and the trench fills with smoke. Beat 136,
 * the downbeat: it lets go of the pad and climbs, slowly, then not slowly.
 * On beat 142 it goes into the cloud — and comes out of the top of it in the
 * other universe, in the other ink, the frame white for a moment between.
 * Beat 144: the first stage lets go and falls away; 145: the second lights.
 * It leans over into orbit, and on 147 the nose opens like a seed and the
 * ball floats out.
 *
 * The part's frame: the ball in the window is (-0.5, 0) at ignition. The
 * rocket's own frame (its "body") has its base at (0, 0) and its axis up;
 * the window is at (0, -WINDOW).
 */

export const WINDOW = 7.3
/** Where the base of the rocket stands on the pad, in the part's frame. */
const BASE: Pt = [-0.5, WINDOW]
const S1_TOP = 4.4
const S2_TOP = 6.5
const NOSE = 8.25
const W1 = 0.74
const W2 = 0.6

export const LIFTOFF = beat(136)
/** Inside the cloud: the stage changes universe here. */
export const PUNCH = beat(142)
export const STAGING = beat(144)
export const SECOND = beat(145)
export const OPEN = beat(147)
export const RELEASE = beat(148)
/** Where the first stage's burn starts to lean the rocket over, and where it is flat. */
const TURN0 = beat(141)
const TURN1 = beat(147)

/** The engine surges on every beat of the climb the music has no other event on: a bright pulse through the flame. */
const SURGES = [135, 137, 138, 139, 140, 141, 143, 146].map(beat)
export const ROCKET_HITS = [IGNITION, LIFTOFF, PUNCH, STAGING, SECOND, OPEN, ...SURGES].sort((a, b) => a - b)

/**
 * How far it has flown, `s` seconds after liftoff: it lets go gently, and
 * the first stage burns harder and harder; after staging the second stage
 * only has to hold it, and the frame settles to the pace of an orbit (what
 * the ball is let go at).
 */
const BURN = STAGING - LIFTOFF
const COAST = 1.4
const SETTLE = 0.6
const burnLen = (s: number): number => 0.42 * s * s + 0.075 * s * s * s
const burnRate = (s: number): number => 0.84 * s + 0.225 * s * s
/** After the nose opens the spent stage drops back from the ball it let go: it slows to a drift. */
const SPENT = 0.25
const FALLBACK = 0.5
function travelled(s: number): number {
  if (s <= 0) return 0
  if (s <= BURN) return burnLen(s)
  const x = s - BURN
  let d = burnLen(BURN) + COAST * x + (burnRate(BURN) - COAST) * SETTLE * (1 - Math.exp(-x / SETTLE))
  const after = s - (OPEN - LIFTOFF)
  if (after > 0) d -= (COAST - SPENT) * (after - FALLBACK * (1 - Math.exp(-after / FALLBACK)))
  return d
}

/** How far over it leans, 0 upright to π/2 flat, at show time `t`. */
const lean = (t: number): number => (Math.PI / 2) * 0.92 * easeInOutSine(clamp((t - TURN0) / (TURN1 - TURN0)))

/**
 * Where the rocket is: its base in the part's frame, and its lean. Integrated
 * from the climb rate along the lean, so a rocket leaning over goes on
 * forward as fast as it was going up.
 */
function flightAt(t: number): { base: Pt; lean: number } {
  if (t <= LIFTOFF) return { base: BASE, lean: 0 }
  const n = Math.max(1, Math.ceil((t - LIFTOFF) * 30))
  const dt = (t - LIFTOFF) / n
  let x = BASE[0]
  let y = BASE[1]
  let prev = 0
  for (let i = 1; i <= n; i++) {
    const s = i * dt
    const h = travelled(s)
    const d = h - prev
    prev = h
    const a = lean(LIFTOFF + s - dt / 2)
    x += Math.sin(a) * d
    y -= Math.cos(a) * d
  }
  return { base: [x, y], lean: lean(t) }
}

const cache = new Map<number, { base: Pt; lean: number }>()
function flight(t: number): { base: Pt; lean: number } {
  const key = Math.round(t * 240)
  let v = cache.get(key)
  if (!v) {
    v = flightAt(key / 240)
    if (cache.size > 20000) cache.clear()
    cache.set(key, v)
  }
  return v
}

/** A point of the rocket's body (x across, y up from the base) in the part's frame, at show time `t`, with its shake. */
function body(t: number, x: number, y: number, shake = true): Pt {
  const { base, lean: a } = flight(t)
  const s = shake ? shakeAt(t) : 0
  const bx = x + s
  return [base[0] + bx * Math.cos(a) + y * Math.sin(a), base[1] + bx * Math.sin(a) - y * Math.cos(a)]
}

/** The engines' shake: nothing on the pad, hard at ignition and as it lets go, less as it climbs. */
function shakeAt(t: number): number {
  if (t < IGNITION) return 0
  const hard = 0.018 * (0.6 + 0.4 * smooth(t, IGNITION, LIFTOFF)) * (1 - 0.7 * smooth(t, LIFTOFF + 1, LIFTOFF + 4))
  return hard * Math.sin(t * 97) * Math.sin(t * 31 + 1)
}

/** Where the ball is while it rides in the window. */
export const windowAt = (t: number): Pt => body(t, 0, WINDOW)

/** Where the ball is after the nose opens: it floats out ahead of the rocket, and away. */
function floatAt(t: number, exit: Pt): Pt {
  const from = windowAt(OPEN)
  const u = clamp((t - OPEN) / (RELEASE - OPEN))
  // Eased out of the window, then going at the pace the ring's builder was promised.
  const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65
  return [from[0] + (exit[0] - from[0]) * e, from[1] + (exit[1] - from[1]) * e - Math.sin(u * Math.PI) * 0.12]
}

interface RocketState {
  begin: number
  exit: Pt
}

export const rocket = part<RocketState>(
  {
    name: 'rocket',
    flight: true,
    draw: (p, s, c) => drawRocket(p, s, c),
    over: (p, s, c) => {
      // The window's glass and rim over the ball in it, while it rides.
      const t = c.t + s.begin
      if (t >= OPEN + 0.05) return
      const { k, ink, weight } = c
      const [wx, wy] = windowAt(t)
      p.push()
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight * 1.1)
      p.circle(wx * k, wy * k, 0.36 * k)
      p.noStroke()
      p.fill(alpha(p, '#FFFFFF', 0.22))
      p.arc(wx * k, wy * k, 0.3 * k, 0.3 * k, Math.PI * 1.05, Math.PI * 1.55)
      p.pop()
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // The ball's way out: from the window, forward and a little up, going about 1.4 cells a second as it leaves.
    const open = windowAt(OPEN)
    const exitPt: Pt = [open[0] + 1.3, open[1] - 0.25]
    const s: RocketState = { begin: slot.begin, exit: exitPt }
    const ride = (t: number) => windowAt(t + slot.begin)
    const float = (t: number) => floatAt(t + slot.begin, exitPt)
    const segs = [
      ...carried(ride, 0, at(OPEN), Math.ceil(at(OPEN) * 30)),
      ...carried(float, at(OPEN), at(slot.end), 24),
    ]
    const top = Math.min(...[LIFTOFF, PUNCH, STAGING, OPEN, slot.end].map((t) => windowAt(t)[1])) - 4
    const right = Math.max(...[OPEN, slot.end].map((t) => windowAt(t)[0])) + 4
    return {
      cells: box(-5, top, right, WINDOW + 4),
      exit: [exitPt[0] + 0.5, exitPt[1]],
      lane: { segs, fire: at(IGNITION) },
      state: s,
    }
  },
  () => {
    // On the pad: the whole stack. It lets go and the frame goes with it, low, so the pad drops away under it.
    return [
      { t: IGNITION, cells: 10.6, hold: [BASE[0] - 0.3, BASE[1] - 3.6] },
      { t: LIFTOFF + 0.2, cells: 10.8, hold: [BASE[0] - 0.1, BASE[1] - 3.7] },
      { t: LIFTOFF + 1.6, cells: 9.5, off: [0.2, 2.6] },
      { t: PUNCH - 0.4, cells: 8.2, off: [0.1, 1.8] },
      { t: STAGING + 0.4, cells: 8.6, off: [0.3, 1.6] },
      { t: OPEN - 0.5, cells: 6.2, off: [0.6, 0.4] },
      { t: RELEASE, cells: 6.2, off: [0.8, 0] },
    ]
  },
)

/** The rocket's base and lean at show time `t`, in this part's frame: what the cloud draws its shadow from. */
export const rocketPose = (t: number): { base: Pt; lean: number } => flight(t)
export const ROCKET_LENGTH = NOSE

/** Show time the rocket's window is in the cloud: for the score, which puts the cloud there. */
export const punchHeight = (): number => windowAt(PUNCH)[1]

function drawRocket(p: p5, s: RocketState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k
  const f = frame(p, k)
  const farm = c.theme.name === 'dust-bowl'
  const hull = farm ? DUST.bone : '#D9D4C6'
  const band = farm ? DUST.denim : '#3A4257'
  const flameHot = '#FFF1C9'
  const flameMid = '#F4B24A'
  const flameEdge = DUST.rust

  // The pad: the mount, the trench, the deflector. On the farm only; from above the cloud it is long gone.
  if (farm) {
    const [bx, by] = BASE
    solid(p, ink, weight, DUST.shade)
    p.rect(X(bx - 1.9), X(by + 0.35 + (FLOOR + 0.2) / 2), X(1.6), X(FLOOR + 0.2))
    p.rect(X(bx + 1.9), X(by + 0.35 + (FLOOR + 0.2) / 2), X(1.6), X(FLOOR + 0.2))
    outline(p, ink, weight)
    p.line(X(bx - 1.1), X(by + 0.35 + FLOOR + 0.2), X(bx - 0.4), X(by + 0.35 + FLOOR + 1.0))
    p.line(X(bx + 1.1), X(by + 0.35 + FLOOR + 0.2), X(bx + 0.4), X(by + 0.35 + FLOOR + 1.0))
    // The mount's arms hold the base until the rocket lets go, and fall back.
    const let_go = easeOutCubic(clamp((t - LIFTOFF) / 0.5))
    solid(p, ink, weight, DUST.wood)
    for (const side of [-1, 1]) {
      p.push()
      p.translate(X(bx + side * 0.95), X(by + 0.35))
      p.rotate(side * let_go * 0.7)
      p.rect(X(-side * 0.25), X(-0.12), X(0.55), X(0.12))
      p.pop()
    }
  }

  // Smoke: on the pad, a billow out of the trench both ways from ignition; in the air, a column left where it has been.
  if (farm && t > IGNITION - 0.1) {
    const [bx, by] = BASE
    p.push()
    for (let i = 0; i < 26; i++) {
      const born = IGNITION + i * 0.12
      if (born > t) break
      const age = t - born
      const side = i % 2 ? 1 : -1
      const x = bx + side * (0.6 + age * (1.1 + hash(i, 1) * 0.6))
      const y = by + 0.7 - age * (0.25 + hash(i, 2) * 0.25)
      const r = 0.25 + age * 0.35
      if (x < f.x0 - 2 || x > f.x1 + 2) continue
      p.drawingContext.globalAlpha = Math.max(0, 1 - age / 5)
      puff(p, k, ink, weight * 0.7, DUST.bone, x, y, r)
    }
    for (let i = 0; i < 40; i++) {
      const born = LIFTOFF + i * 0.1
      if (born > t) break
      const age = t - born
      const at = body(born, 0, -0.4, false)
      const r = 0.22 + age * 0.22
      if (at[1] < f.y0 - 2 || at[1] > f.y1 + 2) continue
      p.drawingContext.globalAlpha = Math.max(0, 0.85 - age / 4)
      puff(p, k, ink, weight * 0.6, DUST.bone, at[0] + (hash(i, 3) - 0.5) * 0.3, at[1] + age * 0.2, r)
    }
    p.pop()
  }

  // The first stage, once it lets go: it drifts back and down, turning, with a last cough of flame.
  if (t >= STAGING && t < STAGING + 6) {
    // It goes on along the same path on a slower clock, so it drops back from the ship, sinking and turning over.
    const since = t - STAGING
    const slow = STAGING + since * 0.45 - Math.min(since, 0.3) * 0.02
    const at = flight(slow)
    const pivot = body(slow, 0, S1_TOP / 2, false)
    p.push()
    p.translate(X(pivot[0] - 0.2 * since), X(pivot[1] + 0.3 * since * since))
    p.rotate(at.lean - since * 0.45)
    stage1(p, k, ink, weight, hull, band, S1_TOP / 2)
    p.pop()
  }

  // The flame: long and bright under the first stage, a short blue-white tongue under the second.
  const lit = t >= IGNITION && t < STAGING ? 1 : t >= SECOND && t < OPEN + 0.3 ? 0.55 : 0
  if (lit > 0) {
    const from = t < STAGING ? 0 : S1_TOP
    // A surge on the beat: the flame lengthens and a bright diamond runs down it.
    const surge = SURGES.reduce((m, at) => Math.max(m, t >= at ? Math.exp(-(t - at) / 0.16) : 0), 0)
    const flick = (0.85 + 0.15 * Math.sin(t * 57) * Math.sin(t * 23)) * (1 + 0.35 * surge)
    const grow = t < STAGING ? (0.4 + 0.6 * smooth(t, IGNITION, LIFTOFF)) * (1 + 0.8 * smooth(t, LIFTOFF, LIFTOFF + 3)) : smooth(t, SECOND, SECOND + 0.3)
    const len = (t < STAGING ? 1.6 : 0.9) * grow * flick
    const wide = t < STAGING ? W1 * 0.62 : W2 * 0.45
    const tongue = (w: number, l: number, fill: string) => {
      const pts: Pt[] = [body(t, -w, from + 0.02), body(t, w, from + 0.02), body(t, w * 0.35, from - l), body(t, 0, from - l * 1.12), body(t, -w * 0.35, from - l)]
      p.fill(fill)
      p.beginShape()
      for (const [x, y] of pts) p.vertex(X(x), X(y))
      p.endShape(p.CLOSE)
    }
    p.push()
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    tongue(wide, len, t < STAGING ? flameEdge : '#8FC6E6')
    p.noStroke()
    tongue(wide * 0.72, len * 0.8, flameMid)
    tongue(wide * 0.4, len * 0.55, flameHot)
    if (surge > 0.05) {
      // The shock diamond: a bright lozenge that runs down the flame and fades.
      const [dx, dy] = body(t, 0, from - len * (0.25 + 0.4 * (1 - surge)))
      p.fill(alpha(p, '#FFFBEA', surge))
      p.ellipse(X(dx), X(dy), X(wide * 0.9), X(0.2))
    }
    p.pop()
    // Light off the flame on the pad and the smoke.
    if (farm && t < LIFTOFF + 2.5) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const [lx, ly] = body(t, 0, -0.6)
      const g = ctx.createRadialGradient(X(lx), X(ly), 0, X(lx), X(ly), X(3.2))
      g.addColorStop(0, `rgba(255, 214, 140, ${0.45 * grow})`)
      g.addColorStop(1, 'rgba(255, 214, 140, 0)')
      ctx.fillStyle = g
      ctx.fillRect(X(lx - 3.2), X(ly - 3.2), X(6.4), X(6.4))
    }
  }

  // The stack: the first stage until it goes, the second, and the nose.
  p.push()
  const { base, lean: a } = flight(t)
  p.translate(X(base[0] + shakeAt(t) * Math.cos(a)), X(base[1] + shakeAt(t) * Math.sin(a)))
  p.rotate(a)
  if (t < STAGING) stage1(p, k, ink, weight, hull, band, 0)
  // The second stage: plain, one band, its small bell.
  solid(p, ink, weight, hull)
  p.rect(0, X(-(S1_TOP + S2_TOP) / 2), X(W2), X(S2_TOP - S1_TOP))
  solid(p, ink, weight, band)
  p.rect(0, X(-S2_TOP + 0.35), X(W2), X(0.16))
  solid(p, ink, weight * 0.8, DUST.shade)
  p.quad(X(-0.16), X(-S1_TOP), X(0.16), X(-S1_TOP), X(0.22), X(-S1_TOP + 0.22), X(-0.22), X(-S1_TOP + 0.22))
  // Pyro ring: a flash where the stages part.
  const pyro = t - STAGING
  if (pyro > 0 && pyro < 0.35) {
    p.noStroke()
    p.fill(alpha(p, '#FFF6DE', 1 - pyro / 0.35))
    p.ellipse(0, X(-S1_TOP), X(W1 * (1.4 + pyro * 4)), X(0.3 + pyro))
  }
  // The nose: two halves of a pointed shell, with the window in the near one. They open on beat 147.
  const open = easeOutCubic(clamp((t - OPEN) / 0.35))
  const away = Math.max(0, t - OPEN - 0.25)
  for (const side of [-1, 1] as const) {
    if (away > 3) continue
    p.push()
    // Hinged open on the beat, then let go: each half sails off to its own side, turning over.
    p.translate(X(side * W2 * 0.5 + side * away * 0.75), X(-S2_TOP - away * 0.35))
    p.rotate(side * open * 1.0 + side * away * 1.6)
    p.drawingContext.globalAlpha = 1 - clamp((away - 1.6) / 1.4)
    solid(p, ink, weight, hull)
    p.beginShape()
    p.vertex(0, 0)
    p.bezierVertex(X(0), X(-0.9), X(-side * W2 * 0.35), X(-(NOSE - S2_TOP) + 0.2), X(-side * W2 * 0.5), X(-(NOSE - S2_TOP)))
    p.vertex(X(-side * W2 * 0.5), 0)
    p.endShape(p.CLOSE)
    p.pop()
  }
  // The window's socket (its glass and rim are drawn over the ball, in `over`).
  if (open < 0.02) {
    solid(p, ink, weight, '#1C2233')
    p.circle(0, X(-WINDOW), X(0.36))
  }
  p.pop()
}

/** The first stage in its own frame, base at (0, y0): a white body with a band, fins, the bell. */
function stage1(p: p5, k: number, ink: string, weight: number, hull: string, band: string, y0: number): void {
  const X = (x: number) => x * k
  solid(p, ink, weight, hull)
  p.rect(0, X(y0 - S1_TOP / 2), X(W1), X(S1_TOP))
  solid(p, ink, weight, band)
  p.rect(0, X(y0 - S1_TOP + 0.5), X(W1), X(0.22))
  p.rect(0, X(y0 - 0.9), X(W1), X(0.12))
  // Fins.
  solid(p, ink, weight, band)
  for (const side of [-1, 1]) {
    p.quad(X(side * W1 * 0.5), X(y0 - 1.1), X(side * (W1 * 0.5 + 0.28)), X(y0 - 0.2), X(side * (W1 * 0.5 + 0.28)), X(y0), X(side * W1 * 0.5), X(y0 - 0.25))
  }
  // The bell.
  solid(p, ink, weight * 0.8, '#8A8578')
  p.quad(X(-0.18), X(y0), X(0.18), X(y0), X(0.28), X(y0 + 0.28), X(-0.28), X(y0 + 0.28))
  // The line down the side: a seam, to catch the light.
  outline(p, ink, weight * 0.5)
  p.line(X(W1 * 0.22), X(y0 - S1_TOP + 0.1), X(W1 * 0.22), X(y0 - 1.0))
}
