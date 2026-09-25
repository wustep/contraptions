import { R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, part, route, smooth, type PartShot, type Way } from '../kit'
import { JUMPS, level } from '../music'
import { G, hop } from '../physics'
import { SEAMS } from '../seams'
import { DOJO, DOJO_THEME, HIBACHI, HIBACHI_THEME, HOME, HOTDOG, HOTDOG_THEME, STAR, VOID } from '../worlds'
import { STOP, basketFront, drawGarland, seatAt } from './set-garland'
import { BIG_DRYER, LIGHTS, dryerBody, lantern, lanternLit, penOf, portDoor, type Pen } from './set'

/**
 * The breath: the big dryer, 34.33 to the first jump at 57.95.
 *
 * The hanger hits the stop over the dryer's open mouth (34.33) and the basket swings on and tips her in; she comes
 * down on the drum's wall (34.59) and rocks to the bottom. The door swings to on its own weight, the lamp comes on,
 * and the drum turns with the music's long swells: the louder, the faster, and the higher up the rising side she
 * is carried before she rolls back. Twice a swell carries her over and she drops across the drum into the washing
 * (38.75, 49.31). The camera comes in slowly the whole time until the round window is the screen.
 *
 * From 46 the glass starts to show other worlds: between the drum's lifters, turning with it, a red carpet under a
 * flash, a dojo's lacquer red, hot dog pink, a raccoon's mask, the bagel's black. More and faster. The shop's lights
 * sag as the dryer draws on them, and in the last seconds the drum spins her right round, pinned to its wall, the
 * worlds a blur behind her. In the hush before the jump she is carried up the rising side, and on 57.95 the door
 * bursts open and she flies out through the circle: the first jump.
 *
 * The part's frame: its entry cell is the laundromat's exit (the basket at the stop). Everything is laid out in the
 * room's cells and moved by `O`.
 */

/** Where this part's frame sits in the room: the ball enters at (-0.5, 0), which is the basket's seat at the stop. */
const SEAT = seatAt(STOP)
const O: Pt = [SEAT[0] + 0.5, SEAT[1]]
const toPart = ([x, y]: Pt): Pt => [x - O[0], y - O[1]]

const C = BIG_DRYER.port
/** How far from the drum's centre the ball's centre is when it lies on the drum's wall. */
const RHO = BIG_DRYER.glass - 0.05 - R
const LAND = 34.586
const DOOR_TO = [34.85, 35.6] as const
const DRUM_ON = 35.6
/** Two swells carry her over, and she comes down across the drum on these. */
const DROPS = [38.754, 49.308]
const BURST = JUMPS.premiere
const OUT_V = SEAMS.premiere.v

/* ------------------------------------------------------------------ the drum and the ball in it */

const RATE = 240
const DT = 1 / RATE

/** The music's loudness, smoothed over a second: what the drum's speed follows. Tabled once. */
const SWELL: Float32Array = (() => {
  const n = Math.ceil((JUMPS.premiere + 1 - 30) * 40)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = 30 + i / 40
    let s = 0
    let m = 0
    for (let d = -0.6; d <= 0.6; d += 0.15) {
      s += level(t + d)
      m++
    }
    out[i] = s / m
  }
  return out
})()
function swell(t: number): number {
  const i = Math.max(0, Math.min(SWELL.length - 2, (t - 30) * 40))
  const j = Math.floor(i)
  return SWELL[j] + (SWELL[j + 1] - SWELL[j]) * (i - j)
}

/** The final spin: the speed she leaves the wall with (her speed along it over the wall's radius), and where. */
const OUT_W = Math.hypot(OUT_V[0], OUT_V[1]) / RHO
/** Where on the wall she leaves: going up the rising side with exactly the seam's heading (tangent (cos, -sin)). */
const OUT_PHI = Math.atan2(-OUT_V[1], OUT_V[0])
const SPIN_UP = 1.8
/** From here she is eased onto the line that leaves on the jump. */
const BLEND = BURST - 1.3
/** How her drops go: a lifter scoops her up the rising side at this speed and she leaves it here (radians up). */
const LIFT_W = 3.0
const LET_GO = 2.45
const FALL = (5 / 7) * (G / RHO)
/** How long the lifter takes to take her up into the scoop. */
const SCOOP_IN = 0.75
/** Where the lifter takes her from: low on the far side. */
const SCOOP_FROM = -0.3
/** How long the lifter takes to get up to speed. */
const LIFT_UP = 0.25

/** A window: 0 outside [a, b], 1 inside, eased over `e` at each edge. */
const inside = (t: number, a: number, b: number, e: number): number => smooth(t, a - e, a + e) * (1 - smooth(t, b - e, b + e))

/** The drum's speed: still till the door is shut, then with the swell; harder on each drop's swell; the last spin. */
function drumSpeed(t: number, spinFrom: number): number {
  if (t < DRUM_ON) return 0
  const on = smooth(t, DRUM_ON, DRUM_ON + 1.2)
  let w = on * (1.3 + 2.2 * swell(t))
  for (const d of DROPS) w += 0.9 * inside(t, d - 1.6, d - 0.3, 0.3)
  w += (OUT_W - w) * smooth(t, spinFrom, spinFrom + SPIN_UP)
  return w
}

/** How high up the rising side the drum carries her before she slips back: higher the louder. */
const slipAt = (t: number): number => 0.5 + 0.75 * swell(t)

/** Her angle on the wall (radians from the bottom, + up the rising side) from t0, sampled RATE a second. */
interface Run {
  t0: number
  phi: Float32Array
  w: Float32Array
}

/**
 * Her on the drum's wall between drops. The lifters carry her up the rising side at the drum's speed until she is
 * so high she slips; she rolls back down under her weight, through the bottom and up the far side, and is caught
 * again as the wall comes round. From `spinFrom` the washing packs round her and she is carried right round.
 */
function run(t0: number, phi0: number, w0: number, until: number, spinFrom: number): Run {
  const n = Math.max(2, Math.ceil((until - t0) * RATE) + 2)
  const P = new Float32Array(n)
  const V = new Float32Array(n)
  let phi = phi0
  let w = w0
  let mode: 'stick' | 'slip' | 'catch' = 'slip'
  for (let i = 0; i < n; i++) {
    const t = t0 + i * DT
    P[i] = phi
    V[i] = w
    const W = drumSpeed(t, spinFrom)
    const up = Math.atan2(Math.sin(phi), Math.cos(phi))
    if (t >= spinFrom) {
      w += (-FALL * Math.sin(phi) * 0.2 + 5 * (W - w)) * DT
    } else if (mode === 'stick') {
      w = W
      if (up > slipAt(t)) mode = 'slip'
    } else if (mode === 'slip') {
      const w0s = w
      w += (-FALL * Math.sin(phi) - 1.1 * w) * DT
      if (W > 0.2 && ((w0s < 0 && w >= 0) || (Math.abs(w) < 0.08 && Math.abs(up) < 0.3))) mode = 'catch'
    } else {
      w += (-FALL * Math.sin(phi) + 7 * (W - w)) * DT
      if (w >= 0.92 * W) mode = 'stick'
      else if (up > slipAt(t)) mode = 'slip'
    }
    phi += w * DT
  }
  return { t0, phi: P, w: V }
}

const runPhi = (r: Run, t: number): number => {
  const i = Math.max(0, Math.min(r.phi.length - 1.001, (t - r.t0) * RATE))
  const j = Math.floor(i)
  return r.phi[j] + (r.phi[j + 1] - r.phi[j]) * (i - j)
}
const onWall = (phi: number): Pt => [C[0] + RHO * Math.sin(phi), C[1] + RHO * Math.cos(phi)]

/** A drop: scooped up the rising side, let go at LET_GO, across the drum through the air, down on the wall on `at`. */
interface Drop {
  at: number
  scoop: number
  release: number
  from: Pt
  v: Pt
  landPhi: number
  landW: number
}

function planDrop(at: number): Drop {
  const from = onWall(LET_GO)
  const v: Pt = [RHO * LIFT_W * Math.cos(LET_GO), -RHO * LIFT_W * Math.sin(LET_GO)]
  // Fly until she meets the wall again.
  let T = 0
  let p: Pt = from
  let clear = false
  for (let i = 1; i < 4000; i++) {
    T = i / 2000
    p = [from[0] + v[0] * T, from[1] + v[1] * T + 0.5 * G * T * T]
    const d = Math.hypot(p[0] - C[0], p[1] - C[1])
    if (d < RHO - 0.02) clear = true
    if (clear && d >= RHO) break
  }
  const landPhi = Math.atan2(p[0] - C[0], p[1] - C[1])
  const vl: Pt = [v[0], v[1] + G * T]
  const tan = vl[0] * Math.cos(landPhi) - vl[1] * Math.sin(landPhi)
  const release = at - T
  return { at, scoop: release - (LET_GO - SCOOP_FROM) / LIFT_W - LIFT_UP / 2, release, from, v, landPhi, landW: (0.35 * tan) / RHO }
}

const FIRST_PHI = -0.35
const FIRST: Pt = onWall(FIRST_PHI)
const DROP_PLANS = DROPS.map(planDrop)

interface Plan {
  runs: Run[]
  spinFrom: number
  /** The turn of the leaving line nearest her as the blend takes her. */
  turns: number
}

const PLAN: Plan = (() => {
  // Her speed along the wall as she lands in the drum, out of the basket.
  const T = LAND - STOP
  const vx = (FIRST[0] - SEAT[0]) / T
  const vy = (FIRST[1] - SEAT[1]) / T + 0.5 * G * T
  const w0 = (0.3 * (vx * Math.cos(FIRST_PHI) - vy * Math.sin(FIRST_PHI))) / RHO
  const runs: Run[] = [run(LAND, FIRST_PHI, w0, DROP_PLANS[0].release, 1e9)]
  for (let i = 0; i < DROP_PLANS.length; i++) {
    const d = DROP_PLANS[i]
    const until = i + 1 < DROP_PLANS.length ? DROP_PLANS[i + 1].release : BURST
    runs.push(run(d.at, d.landPhi, d.landW, until, 1e9))
  }
  // The last run carries the last spin: start it so she is nearest the leaving line as the blend takes her.
  const last = DROP_PLANS[DROP_PLANS.length - 1]
  let best = { spinFrom: 54.6, miss: Infinity, turns: 0, r: runs[runs.length - 1] }
  for (let sf = 53.4; sf <= 55.4; sf += 0.01) {
    const r = run(last.at, last.landPhi, last.landW, BURST, sf)
    const phi = runPhi(r, BLEND)
    const w = r.w[Math.min(r.w.length - 1, Math.round((BLEND - r.t0) * RATE))]
    const line = OUT_PHI + OUT_W * (BLEND - BURST)
    const turns = Math.round((phi - line) / (2 * Math.PI))
    const miss = Math.abs(phi - line - 2 * Math.PI * turns) + 0.15 * Math.abs(w - OUT_W)
    if (miss < best.miss) best = { spinFrom: sf, miss, turns, r }
  }
  runs[runs.length - 1] = best.r
  return { runs, spinFrom: best.spinFrom, turns: best.turns }
})()

/** Where she is in the drum at `t`: on the wall, scooped, flying across, pinned in the spin, leaving. */
function ballIn(t: number): Pt {
  const [first, ...rest] = PLAN.runs
  for (let i = 0; i < DROP_PLANS.length; i++) {
    const d = DROP_PLANS[i]
    const before = i === 0 ? first : rest[i - 1]
    if (t < d.release) {
      const own = runPhi(before, t)
      // The scoop: a lifter comes up under her and takes her up at its speed; blended in, so she is taken, not snapped.
      const b = smooth(t, d.scoop - SCOOP_IN, d.scoop + 0.2)
      if (b <= 0) return onWall(own)
      // The lifter waits at the bottom for her, then takes her up.
      const tau = t - d.scoop
      const lift = tau <= 0 ? SCOOP_FROM : tau < LIFT_UP ? SCOOP_FROM + (LIFT_W * tau * tau) / (2 * LIFT_UP) : SCOOP_FROM + LIFT_W * (tau - LIFT_UP / 2)
      // Which turn of the wall she is taken on: settled once, as the scoop starts.
      const t0 = d.scoop - SCOOP_IN
      const k = Math.round((runPhi(before, t0) - SCOOP_FROM) / (2 * Math.PI))
      return onWall(own + (lift + 2 * Math.PI * k - own) * b)
    }
    if (t < d.at) {
      const T = t - d.release
      return [d.from[0] + d.v[0] * T, d.from[1] + d.v[1] * T + 0.5 * G * T * T]
    }
  }
  const r = rest[rest.length - 1]
  const own = runPhi(r, t)
  if (t < BLEND) return onWall(own)
  const line = OUT_PHI + OUT_W * (t - BURST) + 2 * Math.PI * PLAN.turns
  return onWall(own + (line - own) * smooth(t, BLEND, BLEND + 0.9))
}

/** The drum's turn at `t` (radians): the integral of its speed, tabled. */
const TURN: Float32Array = (() => {
  const n = Math.ceil((BURST - LAND) * RATE) + 2
  const out = new Float32Array(n)
  let th = 0
  for (let i = 0; i < n; i++) {
    out[i] = th
    th += drumSpeed(LAND + i * DT, PLAN.spinFrom) * DT
  }
  return out
})()
function drumTurn(t: number): number {
  if (t < LAND) return 0
  const end = TURN.length - 1
  const i = (t - LAND) * RATE
  if (i >= end) {
    // Once she is out, it runs on and winds down.
    const u = (i - end) / RATE
    return TURN[end] + OUT_W * 1.6 * (1 - Math.exp(-u / 1.6))
  }
  const j = Math.floor(i)
  return TURN[j] + (TURN[j + 1] - TURN[j]) * (i - j)
}

/* ------------------------------------------------------------------ the door, the lamp, the light */

/** The door: open, waiting, until she is in; it swings to; shut; and on the jump it bursts open. */
function doorAt(t: number): number {
  if (t < DOOR_TO[0]) return 1
  if (t < DOOR_TO[1]) {
    const u = (t - DOOR_TO[0]) / (DOOR_TO[1] - DOOR_TO[0])
    return 1 - u * u * (3 - 2 * u) * (0.6 + 0.4 * u)
  }
  if (t < BURST - 0.03) {
    const u = t - DOOR_TO[1]
    return 0.03 * Math.exp(-u / 0.08) * Math.abs(Math.sin(u * 30))
  }
  // Burst: flung wide, and swinging on its hinge after.
  const u = t - (BURST - 0.03)
  return Math.min(1.08, u / 0.05) - 0.08 * (1 - Math.exp(-u / 0.6)) + 0.05 * Math.exp(-u / 0.7) * Math.sin(u * 7)
}

/** The drum's lamp: on with the door shut, and flaring through the last seconds. */
const lampAt = (t: number): number => (t < DOOR_TO[1] ? 0 : (0.75 + 0.25 * smooth(t, 55, 57.8)) * (1 - smooth(t, BURST + 0.2, BURST + 1.5)))

/** The shop's lights sag in the last seconds, as the dryer draws on them; they are back once she has gone. */
LIGHTS.dim.push((t) => (t < 54.5 || t > BURST + 0.5 ? 1 : 1 - 0.78 * smooth(t, 54.5, 57.6)))
LIGHTS.glows.push((t) => (t > DOOR_TO[1] && t < BURST + 0.5 ? [{ x: C[0], y: C[1], r: 1.9, a: 0.9 * lampAt(t), color: HOME.light }] : []))

/* ------------------------------------------------------------------ other worlds in the glass */

type World = 'premiere' | 'dojo' | 'hotdog' | 'raccoon' | 'bagel'

/** When each world shows in the glass, in which of the drum's three bays, and for how long. More and faster. */
const GLIMPSES: { at: number; bay: number; world: World; hold: number }[] = (() => {
  const out: { at: number; bay: number; world: World; hold: number }[] = []
  const seq: World[] = ['dojo', 'hotdog', 'raccoon', 'premiere', 'bagel']
  let t = 46.3
  let i = 0
  let gap = 2.1
  while (t < BURST - 0.1) {
    out.push({ at: t, bay: i % 3, world: seq[i % seq.length], hold: Math.max(0.35, gap * 0.55) })
    i++
    t += gap
    gap = Math.max(0.16, gap * 0.8)
  }
  return out
})()

function glimpse(pen: Pen, world: World, cx: number, cy: number, r: number, a0: number, a1: number, alph: number, t: number): void {
  const { p, k } = pen
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx * k, cy * k)
  ctx.arc(cx * k, cy * k, r * k, a0, a1)
  ctx.closePath()
  ctx.clip()
  ctx.globalAlpha = alph
  const mid = (a0 + a1) / 2
  const mx = cx + Math.cos(mid) * r * 0.55
  const my = cy + Math.sin(mid) * r * 0.55
  p.noStroke()
  const fill = (hex: string) => {
    p.fill(hex)
    p.circle(cx * k, cy * k, 2.2 * r * k)
  }
  if (world === 'premiere') {
    // The red carpet, a brass post and its velvet rope, and a flashbulb going off: a white star.
    fill(STAR.carpet)
    p.fill(STAR.carpetDeep)
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(mid + Math.PI / 2)
    p.rect(0, r * 0.18 * k, r * 1.6 * k, r * 0.22 * k)
    p.stroke(STAR.velvet)
    p.strokeWeight(Math.max(1, r * 0.07 * k))
    p.noFill()
    p.arc(0, -r * 0.1 * k, r * 0.7 * k, r * 0.3 * k, 0, Math.PI)
    p.noStroke()
    p.fill(STAR.brass)
    for (const sx of [-0.35, 0.35]) {
      p.rect(sx * r * k, -r * 0.02 * k, r * 0.05 * k, r * 0.32 * k)
      p.circle(sx * r * k, -r * 0.18 * k, r * 0.09 * k)
    }
    p.pop()
    const f = Math.max(0, Math.sin(t * 11)) ** 3
    const sx = cx + Math.cos(mid - 0.35) * r * 0.62
    const sy = cy + Math.sin(mid - 0.35) * r * 0.62
    p.fill(STAR.flash)
    p.noStroke()
    const a = r * (0.08 + 0.2 * f)
    const b = a * 0.18
    p.beginShape()
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4
      const rr = i % 2 === 0 ? a : b
      p.vertex((sx + Math.cos(ang) * rr) * k, (sy + Math.sin(ang) * rr) * k)
    }
    p.endShape(p.CLOSE)
    const g = ctx.createRadialGradient(sx * k, sy * k, 0, sx * k, sy * k, r * 0.4 * k)
    g.addColorStop(0, `rgba(255, 255, 255, ${0.45 * f})`)
    g.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = g
    ctx.fillRect((sx - r * 0.4) * k, (sy - r * 0.4) * k, r * 0.8 * k, r * 0.8 * k)
  } else if (world === 'dojo') {
    fill(DOJO.lacquer)
    p.noFill()
    p.stroke(DOJO_THEME.ink)
    p.strokeWeight(r * 0.13 * k)
    p.arc(mx * k, my * k, r * 0.8 * k, r * 0.8 * k, mid + 1.2, mid + 4.2)
    p.noStroke()
    p.fill(DOJO.gold)
    p.circle((mx + Math.cos(mid) * r * 0.2) * k, (my + Math.sin(mid) * r * 0.2) * k, r * 0.14 * k)
  } else if (world === 'hotdog') {
    fill(HOTDOG_THEME.bg)
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(mid + Math.PI / 2 + 0.3)
    p.stroke(HOTDOG_THEME.ink)
    p.strokeWeight(Math.max(1, r * 0.03 * k))
    p.fill(HOTDOG.sausage)
    p.rect(0, 0, r * 0.7 * k, r * 0.2 * k, r * 0.1 * k)
    p.noFill()
    p.stroke(HOTDOG.mustard)
    p.strokeWeight(Math.max(1, r * 0.04 * k))
    p.beginShape()
    for (let i = 0; i <= 8; i++) p.vertex((-0.28 + (0.56 * i) / 8) * r * k, Math.sin(i * 2.2) * r * 0.04 * k)
    p.endShape()
    p.pop()
  } else if (world === 'raccoon') {
    // A raccoon's face peeping: grey head, ears, the black bandit mask, bright eyes, a black nose.
    fill(HIBACHI.hat)
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(mid + Math.PI / 2)
    const s = r * 0.5
    p.stroke(HIBACHI_THEME.ink)
    p.strokeWeight(Math.max(1, s * 0.05 * k))
    p.fill(HIBACHI.raccoon)
    for (const e of [-1, 1]) p.triangle(e * s * 0.55 * k, -s * 0.35 * k, e * s * 0.25 * k, -s * 0.6 * k, e * s * 0.72 * k, -s * 0.85 * k)
    p.ellipse(0, 0, s * 1.5 * k, s * 1.15 * k)
    p.noStroke()
    p.fill(HIBACHI.raccoonDeep)
    p.beginShape()
    p.vertex(-s * 0.72 * k, -s * 0.08 * k)
    p.bezierVertex(-s * 0.5 * k, -s * 0.34 * k, -s * 0.12 * k, -s * 0.3 * k, 0, -s * 0.12 * k)
    p.bezierVertex(s * 0.12 * k, -s * 0.3 * k, s * 0.5 * k, -s * 0.34 * k, s * 0.72 * k, -s * 0.08 * k)
    p.bezierVertex(s * 0.5 * k, s * 0.22 * k, s * 0.15 * k, s * 0.15 * k, 0, s * 0.05 * k)
    p.bezierVertex(-s * 0.15 * k, s * 0.15 * k, -s * 0.5 * k, s * 0.22 * k, -s * 0.72 * k, -s * 0.08 * k)
    p.endShape(p.CLOSE)
    p.fill(HIBACHI.hat)
    p.circle(-s * 0.32 * k, -s * 0.08 * k, s * 0.2 * k)
    p.circle(s * 0.32 * k, -s * 0.08 * k, s * 0.2 * k)
    p.fill(HIBACHI_THEME.ink)
    p.ellipse(0, s * 0.3 * k, s * 0.2 * k, s * 0.13 * k)
    p.pop()
  } else {
    fill(VOID.bagel)
    p.noFill()
    p.stroke(VOID.bagelRim)
    p.strokeWeight(r * 0.16 * k)
    p.circle(mx * k, my * k, r * 0.62 * k)
    p.noStroke()
    for (let i = 0; i < 9; i++) {
      const b = mid + i * 0.7
      const rr = r * (0.2 + 0.22 * ((i * 37) % 10) / 10)
      p.fill(i % 3 === 0 ? VOID.salt : VOID.sesame)
      p.ellipse((mx + Math.cos(b) * rr) * k, (my + Math.sin(b) * rr) * k, r * (0.04 + 0.03 * (i % 2)) * k, r * 0.025 * k)
    }
  }
  ctx.restore()
}

/** The worlds in the drum's bays at `t`, over its back and under the washing and the ball. */
function drawGlimpses(pen: Pen, t: number, turn: number): void {
  if (t < GLIMPSES[0].at - 0.5 || t > BURST + 0.2) return
  const r = BIG_DRYER.glass * 0.97
  for (const g of GLIMPSES) {
    const u = t - g.at
    if (u < -0.15 || u > g.hold + 0.25) continue
    const a = smooth(u, -0.15, 0.1) * (1 - smooth(u, g.hold, g.hold + 0.25))
    const a0 = turn + (g.bay * 2 * Math.PI) / 3 + 0.12
    glimpse(pen, g.world, C[0], C[1], r, a0, a0 + (2 * Math.PI) / 3 - 0.24, a * 0.92, t)
  }
  // The hush before the jump: the premiere's night comes up behind everything, lit by flashes.
  const night = smooth(t, 57.0, 57.8)
  if (night > 0) {
    const { p, k } = pen
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.arc(C[0] * k, C[1] * k, r * k, 0, Math.PI * 2)
    ctx.clip()
    p.noStroke()
    p.fill(alpha(p, STAR.wet, 0.85 * night))
    p.circle(C[0] * k, C[1] * k, 2 * r * k)
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the part */

interface DryerState {
  lane: Lane
}

/** Every strike this part makes, in show seconds: the stop and the tip; she lands in the drum; the drops; the burst. */
export const DRYER_HITS: number[] = [STOP, LAND, ...DROPS, BURST]

/** Washing tumbling with her. */
const LOAD = [HOME.rose, HOME.paper, HOME.denim]

export const dryer = part<DryerState>(
  {
    name: 'dryer',
    flight: true,
    draw: (p, _s, c) => {
      const t = c.t + STOP
      const pen = penOf(p, c)
      p.push()
      p.translate(-O[0] * c.k, -O[1] * c.k)
      const turn = drumTurn(t)
      const w = t > DRUM_ON ? (drumTurn(t + 0.02) - drumTurn(t - 0.02)) / 0.04 : 0
      dryerBody(pen, BIG_DRYER.x, true, { turn: -turn, lamp: lampAt(t), lamp2: t > DOOR_TO[1] && t < BURST + 1.5 ? 1 : 0, load: t > DOOR_TO[1] - 0.5 ? LOAD : [], fling: smooth(w, 3.2, 4.4) })
      drawGlimpses(pen, t, -turn)
      drawGarland(
        pen,
        t,
        (x, y, lk) => lantern(pen, x, y, lk),
        (i, tt) => lanternLit(i, tt),
      )
      p.pop()
    },
    over: (p, _s, c) => {
      const t = c.t + STOP
      const pen = penOf(p, c)
      p.push()
      p.translate(-O[0] * c.k, -O[1] * c.k)
      portDoor(pen, C[0], C[1], BIG_DRYER.glass, BIG_DRYER.rim, doorAt(t), 0.16, 1)
      basketFront(pen, t)
      p.pop()
    },
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const segs: Seg[] = []
    // Tipped out of the basket at the stop, down onto the drum's wall.
    const tipped: Way = { at: 0, p: [-0.5, 0] }
    segs.push(...route([tipped, hop(tipped, toPart(FIRST), at(LAND))]))
    // In the drum: on its wall, and flying across it, to the jump.
    // The last half second, as she leaves, finely: her heading at the jump is the seam's to a hair.
    const cuts = [LAND, ...DROP_PLANS.flatMap((d) => [d.release, d.at]), BURST - 0.5, BURST]
    for (let i = 1; i < cuts.length; i++) {
      const a = cuts[i - 1]
      const b = cuts[i]
      segs.push(...carried((T) => toPart(ballIn(T + slot.begin)), at(a), at(b), Math.max(2, Math.ceil((b - a) * (b === BURST ? 480 : 40)))))
    }
    const lane: Lane = { segs, fire: 0 }
    const end = toPart(ballIn(BURST))
    return {
      cells: box(-4 - O[0], -5 - O[1], 11 - O[0], 1 - O[1], 1),
      exit: [end[0] + 0.5, end[1]],
      lane,
      state: { lane },
    }
  },
  (slot) => shotsFor(slot),
)

/* ------------------------------------------------------------------ the camera */

function shotsFor(_slot: { begin: number; end: number }): PartShot[] {
  const hold = (x: number, y: number): Pt => toPart([x, y])
  const out = toPart(ballIn(BURST))
  return [
    // The whole dryer as she goes in and the door swings to.
    { t: 35.4, cells: 4.5, hold: hold(C[0] - 0.3, C[1] + 0.1) },
    // Then in, slowly, the whole breath long, until the window is the screen, leaning a little after her.
    { t: 41, cells: 3.7, hold: hold(C[0], C[1]), w: 0.85 },
    { t: 48, cells: 3.05, hold: hold(C[0], C[1]), w: 0.8 },
    { t: 54, cells: 2.92, hold: hold(C[0], C[1]), w: 0.8 },
    { t: 57.3, cells: 2.88, hold: hold(C[0], C[1]), w: 0.8 },
    // On the jump: on her, at the seam's distance, as she leaves.
    { t: BURST, cells: SEAMS.premiere.cells, hold: [out[0] * 0.6 + toPart(C)[0] * 0.4, out[1] * 0.6 + toPart(C)[1] * 0.4], w: 0.8 },
  ]
}

