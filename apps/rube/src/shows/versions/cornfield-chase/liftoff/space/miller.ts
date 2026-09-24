import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, laneAt, mixHex, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, part, route, smooth, type Companion, type Ctx, type Way } from '../kit'
import { beat } from '../music'
import { G_LOW, hop } from '../physics'
import { AGED, BALL, DARK, GOLD } from '../worlds'

/**
 * Miller's world, and the one who waits.
 *
 * The ball goes into the sphere and the camera goes after it, fast, to the
 * far side: a ring of its own colour closes on a point in a pale sky, and it
 * drops out. Below is a sheet of water to the horizon, ankle deep, and on the
 * horizon a range of mountains.
 *
 * Down here everything keeps the planet's tick, two beats, the film's 1.25 s:
 * the Ranger's legs take the ball and throw it on, two beacon buoys bob under
 * it and throw it on, and TARS catches it in the crook of its slabs and
 * cartwheels, a slab planted in the water on every tick. The buoys' lamps
 * keep the same tick.
 *
 * Up in orbit the ring keeps another time. The gold ball the trapdoor left
 * behind runs round the inside of it once an eighth, trips a catch every
 * lap, and the catch cuts a mark on the tally beside it; her gold goes to
 * the grey of the years. On the twenty-third mark the catch locks and holds
 * her, and the ring goes from the sky.
 *
 * From beat 175 the mountains move. They are one wave, and near it is a wall
 * of water. TARS's third plant throws the ball onto its foot (181), the face
 * lifts it, the crest feathers on 182, and on 183 the lip throws it up and to
 * the right, at Gargantua (which the next part draws, over the lip), and the
 * wave breaks behind it. Miller fades as the dark takes over.
 *
 * The part's frame: the ball comes in at the sphere, (-0.5, 0); the sea at
 * the Ranger's depth is at y = FLOOR, so a ball touching it has its centre
 * on y = 0, and the horizon is at HZ.
 */

const TAU = Math.PI * 2
const EIGHTH = beat(0.5) - beat(0)

/* ------------------------------------------------------------------ the clock (show seconds) */

/** Out of the far side of the sphere. */
const OUT = beat(167)
/** The Ranger's collar takes it; its legs throw it on the and. */
const COLLAR = beat(168)
const COLLAR_TOSS = beat(168.5)
/** The two buoys. */
const BUOY_AT = [beat(170), beat(172)]
const BUOY_TOSS = [beat(170.5), beat(172.5)]
/** TARS takes it, and plants a slab on each tick after; the third plant throws it. */
const CATCH = beat(174)
const PLANTS = [beat(176), beat(178), beat(180)]
/** The ball comes down on the wave's foot, the crest feathers, the lip throws. */
const FOOT = beat(181)
const FEATHER = beat(182)
const FLING = beat(183)
/** The mountains move from here; the wave is at the ball's depth from here. */
const MOVE = beat(175)
const ARRIVE = beat(180.75)
/** The beacons' lamps: the planet's tick. */
const TICKS = [166, 168, 170, 172, 174, 176, 178, 180].map(beat)
/** She trips the catch every eighth from his arrival; the twenty-third locks it. */
const CLICKS = Array.from({ length: 23 }, (_, i) => beat(167 + i / 2))
const LATCH = CLICKS[CLICKS.length - 1]

/** The strikes the audience sees down on the water: the tick, and the wave. */
export const MILLER_HITS = [OUT, COLLAR, COLLAR_TOSS, BUOY_AT[0], BUOY_TOSS[0], BUOY_AT[1], BUOY_TOSS[1], CATCH, ...PLANTS, FOOT, FEATHER, FLING]
/** Her catch, every eighth, the last one locking. */
export const MILLER_TWIN_HITS = CLICKS

/* ------------------------------------------------------------------ the sea, in depth */

/** The water at the ball's depth. */
const NEAR = FLOOR
/** The horizon. */
const HZ = -1.15
/** The point on the horizon the sea runs to. */
const VPX = 14.3
/** How flat a ring on the water is at the ball's depth. */
const FLAT = 0.2
/** A thing on the water at depth `s` (1 at the ball's, less further off): where its foot is, and where a point `x` of the ball's plane is drawn. */
const depthY = (s: number) => HZ + (NEAR - HZ) * s
const depthX = (x: number, s: number) => VPX + (x - VPX) * s

/* ------------------------------------------------------------------ the things on the water */

/** Where the ball comes out of the far side. */
const Q: Pt = [8.72, -2.2]

/** The Ranger: its collar's centre, and its belly at rest. */
const RX = 8.75
const BELLY = -0.34
/** The top of the hull at the collar, over the belly. */
const ROOF = 0.4
/** The ball's centre in the collar, at rest. */
const SEAT_Y = BELLY - ROOF - R + 0.03
const LEGS = [-0.78, 0.62]
/**
 * Beat 181: as the ball meets the wave, the Ranger lifts off — from here the
 * next part (Gargantua) draws it, the same hull at the same size, skimming the
 * wave to pick TARS up and climbing to the hole to catch the ball. So this part
 * stops drawing the Ranger then, and TARS once it is picked up.
 */
const RANGER_UP = beat(181)
/** TARS takes hold of the Ranger's back as it skims past. */
const TARS_PICKED = beat(182.5)

/** The buoys: their x, and the ball's centre in the cup at rest. */
const BUOYS = [10.75, 11.97]
const MAST = 0.5
const CUP_Y = NEAR - 0.06 - MAST - R + 0.03

/** TARS: spoke length, slab width, and the hub at rest, standing on two slabs as an X. */
const TR = 0.62
const SLAB = 0.19
const T0 = 13.3
const STEP = 2 * TR * Math.SQRT1_2
const HUB_Y = NEAR - TR * Math.SQRT1_2

/** Where the ball lands on the wave's foot. */
const LAND_X = T0 + 3 * STEP + 0.62

/** The ring overhead: a hub, four spokes, twelve modules; she runs round the inside of the rim. */
const STATION: Pt = [10.05, -3.38]
const RING_IN = 0.5
const RING_OUT = 0.63
/** She is that far off: drawn at this size. */
const TWIN_SCALE = 0.6
const PATH = RING_IN - R * TWIN_SCALE - 0.012
/** Where on her lap she meets the catch (radians, y down: just under three o'clock). */
const MEET = (R * TWIN_SCALE) / PATH + 0.02
/** Where the sun is, seen from the ring's centre: low on the left, as it was when he left her. */
const SUN = (150 * Math.PI) / 180
/** The catch's pivot, in the gap between two modules at three o'clock, and where the tally starts. */
const PIVOT: Pt = [STATION[0] + (RING_IN + RING_OUT) / 2, STATION[1]]
const TALLY_X = STATION[0] + RING_OUT + 0.42


/* ------------------------------------------------------------------ the wave */

const S_FAR = 0.13
const L_FACE = 2.6
const L_BACK = 14
const H0 = 3.0
/** The ride: how far right the ball's contact goes while the face lifts it, and how far under the crest it leaves. */
const RIDE_DX = 1.3 * 1.25 - 0.2 * 1.25 * 1.25
const EXIT_D = 0.39
/** Its speed along the sea, cells a second: slowing as it stands up, so the face meets the ball where it must. */
const C_WAVE = (L_FACE - EXIT_D - RIDE_DX) / (beat(183) - beat(181))
/** Where its crest is at the foot's moment (the ball's plane). */
const X_FOOT = LAND_X + L_FACE
/** The far range: extra peaks off the main one, [offset from the crest, height, half-width], all in the ball's plane. */
const PEAKS: [number, number, number][] = [
  [-4.4, 0.46, 1.3],
  [2.5, 0.8, 1.15],
  [4.9, 0.64, 1.3],
  [7.3, 0.52, 1.1],
  [10.2, 0.34, 1.7],
]

/** How near the wave is: its scale, S_FAR on the horizon to 1 at the ball's depth. */
function waveS(t: number): number {
  if (t <= MOVE) return S_FAR
  if (t >= ARRIVE) return 1
  const u = (t - MOVE) / (ARRIVE - MOVE)
  return Math.pow(S_FAR, 1 - u * u * (3 - 2 * u))
}

/** Its height in the ball's plane: standing up as it arrives, and falling as it breaks. */
function waveH(t: number): number {
  if (t <= FOOT) return H0
  if (t <= FLING) return H0 + 0.35 * Math.pow((t - FOOT) / (FLING - FOOT), 1.5)
  return H0 + 0.35 - 1.8 * smooth(t, FLING, FLING + 1.3)
}

/** Its crest's x in the ball's plane. It holds still while it is a mountain. */
function waveX(t: number): number {
  return X_FOOT + C_WAVE * (FOOT - Math.max(t, MOVE))
}

/** The wave's height (0..1 of H) at `d` from its crest, in the ball's plane, at scale `s`: a range of sharp peaks far off, one smooth wave near. */
function profile(d: number, s: number): number {
  const sharp = 1 - smooth(s, 0.2, 0.75)
  let smoothF = 0
  let tri = 0
  if (d > -L_FACE && d <= 0) {
    smoothF = 0.5 - 0.5 * Math.cos(Math.PI * (1 + d / L_FACE))
    tri = 1 + d / (L_FACE * 0.8)
  } else if (d > 0 && d < L_BACK) {
    // Near, it is a wall: the top runs back level, a long way.
    smoothF = (1 - 0.28 * smooth(d, 0, 6)) * (1 - smooth(d, 8, L_BACK))
    tri = 1 - d / 3.2
  }
  let F = smoothF + (Math.max(0, tri) - smoothF) * sharp
  if (sharp > 0) for (const [pd, ph, pw] of PEAKS) F = Math.max(F, sharp * ph * Math.max(0, 1 - Math.abs(d - pd) / pw))
  return F
}

/** The sea's surface at `x` of the ball's plane once the wave is there (s = 1): its y. */
function surface(x: number, t: number): number {
  return NEAR - waveH(t) * profile(x - waveX(t), 1)
}

/** The ball riding the face: its contact slides a little right while the face comes left under it and lifts it. */
function rideAt(t: number): Pt {
  const tau = clamp(t - FOOT, 0, FLING - FOOT)
  const x = LAND_X + 1.3 * tau - 0.2 * tau * tau
  const y = surface(x, t)
  const e = 0.01
  const m = (surface(x + e, t) - surface(x - e, t)) / (2 * e)
  const n = Math.hypot(m, 1)
  return [x + (R * m) / n, y - R / n]
}

/** Where the lip lets the ball go, and how fast: Gargantua's part takes it from here. */
const LIP = rideAt(beat(183))
export const MILLER_LIP_V: Pt = (() => {
  const a = rideAt(beat(183) - 0.004)
  return [(LIP[0] - a[0]) / 0.004, (LIP[1] - a[1]) / 0.004]
})()

/**
 * Gargantua hangs in Miller's sky up and on from the lip. The next part draws
 * it (its C, from its entry cell, which is our exit) the whole time it is in
 * view, glow and all, so there is one hole; Miller only lays its light on the
 * water under it.
 */
const GARG_FROM_EXIT: Pt = [0.95, -0.85]
const GARG: Pt = [LIP[0] + 0.5 + GARG_FROM_EXIT[0], LIP[1] + GARG_FROM_EXIT[1]]

/* ------------------------------------------------------------------ the Ranger and the buoys */

/** How far a thing that took the ball at `at` has sunk on its springs: down and back up by the and, then a settle. */
function sink(t: number, at: number, depth: number): number {
  const d = t - at
  if (d < 0) return 0
  if (d < EIGHTH) return depth * Math.sin((Math.PI * d) / EIGHTH)
  const e = d - EIGHTH
  return -0.3 * depth * Math.sin((Math.PI * e) / 0.42) * Math.exp(-e / 0.45)
}

const rangerDip = (t: number) => sink(t, COLLAR, 0.14)
const buoyDip = (t: number, i: number) => sink(t, BUOY_AT[i], 0.15) + 0.012 * Math.sin(t * 2.2 + i * 1.7)

/* ------------------------------------------------------------------ TARS */

interface Tars {
  hub: Pt
  /** The body's angle: slab k points at phi + k·π/2 from straight down, y down. */
  phi: number
}

/** TARS at show time `t`: standing, then a vault a tick, then standing where it threw the ball, until the wave lifts it. */
function tarsAt(t: number): Tars {
  const vaults = [CATCH, ...PLANTS]
  const x0 = T0 + TR * Math.SQRT1_2
  if (t < CATCH) return { hub: [T0, HUB_Y + 0.008 * Math.sin(t * 1.6)], phi: Math.PI / 4 }
  if (t < PLANTS[PLANTS.length - 1]) {
    let j = 0
    while (t >= vaults[j + 1]) j++
    const u = (t - vaults[j]) / (vaults[j + 1] - vaults[j])
    // From rest it leans into the first; the last whips over, to throw.
    const v = j === 0 ? u * u * (2 - u) : j === 2 ? u + 0.8 * u * u * (u - 1) : u
    const a = Math.PI / 4 - (Math.PI / 2) * v
    const pivot = x0 + j * STEP
    // The catch: the hub gives a little as the ball comes into it.
    const give = j === 0 ? 0.05 * Math.sin(Math.PI * clamp((t - CATCH) / 0.3)) : 0
    return { hub: [pivot - TR * Math.sin(a), NEAR - TR * Math.cos(a) + give], phi: a - j * (Math.PI / 2) }
  }
  // Standing on its last two slabs, until the wave comes under them.
  const left = x0 + 2 * STEP
  const right = left + STEP
  const yl = t > FOOT ? surface(left, t) : NEAR
  const yr = t > FOOT ? surface(right, t) : NEAR
  const tilt = Math.atan2(yr - yl, right - left)
  const cx = (left + right) / 2
  const cy = (yl + yr) / 2
  const recoil = -0.04 * Math.sin(Math.PI * clamp((t - PLANTS[2]) / 0.35))
  return {
    hub: [cx + TR * Math.SQRT1_2 * Math.sin(tilt), cy - TR * Math.SQRT1_2 * Math.cos(tilt) + recoil],
    phi: Math.PI / 4 - 3 * (Math.PI / 2) + tilt,
  }
}

/** The tip that comes down on the water at a plant. */
function plantAt(at: number): Pt {
  const s = tarsAt(at + 1e-4)
  let best: Pt = s.hub
  for (let q = 0; q < 4; q++) {
    const p = tip(s, q)
    if (p[1] > s.hub[1] && p[0] > best[0]) best = p
  }
  return best
}

/** Where slab k's tip is. */
const tip = (s: Tars, k: number): Pt => {
  const a = s.phi + (k * Math.PI) / 2
  return [s.hub[0] + TR * Math.sin(a), s.hub[1] + TR * Math.cos(a)]
}

/* ------------------------------------------------------------------ her, up there */

/** The ring in orbit, and she on it, go once she is caught: the wave and the hole have the sky to themselves. */
const stationOn = (t: number): number => 1 - smooth(t, beat(178.3), beat(179.6))
/** When the ring is gone from the sky, and her with it. */
const GONE = beat(179.6)

/** Where she is on her lap, and her colour: gold going to the grey of the years by the lock. */
function waitsAt(t: number): { x: number; y: number; angle: number; color: string } {
  const a = t < LATCH ? MEET - (TAU * (t - CLICKS[0])) / EIGHTH : MEET
  const color = mixHex(GOLD, AGED, clamp((t - OUT) / (LATCH - OUT)))
  return { x: STATION[0] + PATH * Math.cos(a), y: STATION[1] + PATH * Math.sin(a), angle: a - Math.PI / 2, color }
}

/* ------------------------------------------------------------------ the part */

interface MillerState {
  begin: number
  end: number
  lane: Lane
}

/** How much of Miller is on the stage: it comes up while the camera goes through the sphere, and goes once the ball has left. */
const presence = (t: number, s: MillerState) => smooth(t, s.begin + 0.08, s.begin + 0.5) * (1 - smooth(t, s.end + 0.35, s.end + 1.6))

export const miller = part<MillerState>(
  {
    name: 'miller',
    flight: true,
    draw: (p, s, c) => drawMiller(p, s, c),
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const segs: Seg[] = []
    // Into the sphere and out of the far side: hidden, as fast as the camera can follow.
    segs.push({ from: [-0.5, 0], to: Q, dur: at(OUT), hidden: true, ease: 'inout' })
    // Out of the far side, drawn out of nothing, and down to the Ranger's collar.
    const seat: Pt = [RX, SEAT_Y]
    const T1 = COLLAR - OUT
    const vx = (seat[0] - Q[0]) / T1
    const vy = (seat[1] - Q[1] - 0.5 * G_LOW * T1 * T1) / T1
    const E = 0.16
    const P1: Pt = [Q[0] + vx * E, Q[1] + vy * E + 0.5 * G_LOW * E * E]
    segs.push({ from: Q, to: P1, dur: E, arc: (G_LOW * E * E) / 8, portal: 'in' })
    const w1: Way = { at: at(OUT) + E, p: P1 }
    segs.push(...route([w1, hop(w1, seat, at(COLLAR), G_LOW)]))
    // The collar sinks with the Ranger on its legs and comes back up: the and throws it.
    segs.push(...carried((u) => [RX, SEAT_Y + rangerDip(u + slot.begin)], at(COLLAR), at(COLLAR_TOSS), 10))
    const cup = (i: number) => (u: number): Pt => [BUOYS[i], CUP_Y + buoyDip(u + slot.begin, i)]
    let from: Way = { at: at(COLLAR_TOSS), p: [RX, SEAT_Y + rangerDip(COLLAR_TOSS)] }
    for (let i = 0; i < BUOYS.length; i++) {
      segs.push(...route([from, hop(from, cup(i)(at(BUOY_AT[i])), at(BUOY_AT[i]), G_LOW)]))
      segs.push(...carried(cup(i), at(BUOY_AT[i]), at(BUOY_TOSS[i]), 10))
      from = { at: at(BUOY_TOSS[i]), p: cup(i)(at(BUOY_TOSS[i])) }
    }
    // Into the crook of TARS, and carried at its hub while it cartwheels.
    const hub = (u: number): Pt => tarsAt(u + slot.begin).hub
    segs.push(...route([from, hop(from, hub(at(CATCH)), at(CATCH), G_LOW)]))
    segs.push(...carried(hub, at(CATCH), at(PLANTS[2]), Math.ceil((PLANTS[2] - CATCH) * 40)))
    // The third plant throws it onto the wave's foot; the face lifts it to the lip.
    const thrown: Way = { at: at(PLANTS[2]), p: hub(at(PLANTS[2])) }
    const ride = (u: number) => rideAt(u + slot.begin)
    segs.push(...route([thrown, hop(thrown, ride(at(FOOT)), at(FOOT), G_LOW)]))
    segs.push(...carried(ride, at(FOOT), at(slot.end), 50))
    const end = ride(at(slot.end))
    const lane: Lane = { segs, fire: at(COLLAR) }
    const state: MillerState = { begin: slot.begin, end: slot.end, lane }
    // Her: on the ring in the sky, coming up with Miller's world while the camera is still in the sphere (the
    // ring is out of the frame then), and going with the ring, smaller and smaller, until it is gone.
    const waits = (t: number): Companion | null => {
      const w = waitsAt(t)
      return { x: w.x, y: w.y, color: w.color, scale: TWIN_SCALE * presence(t, state) * stationOn(t), angle: w.angle }
    }
    return {
      cells: box(-1, -7, 24, 3),
      exit: [end[0] + 0.5, end[1]],
      lane,
      state,
      company: [{ from: slot.begin + 0.14, to: GONE + 0.02, at: waits }],
    }
  },
  (slot) => [
    // The sphere, as the ball goes in; then the whip to the far side, stopping as it comes out.
    { t: slot.begin, cells: 7, hold: [-0.5, 0] },
    { t: OUT, cells: 5.4, hold: [11.35, -1.55] },
    { t: CATCH, cells: 5.8, hold: [13.1, -1.7] },
    { t: beat(179), cells: 7, hold: [13.9, -1.95] },
    { t: FEATHER, cells: 8, hold: [15.3, -2.45] },
    // The seam: the framing Gargantua's part opens on (its hold, from its entry cell, which is our exit).
    { t: slot.end, cells: 8, hold: [LIP[0] + 0.5 - 1.44, LIP[1] + 0.43], w: 0.85 },
  ],
)

/* ------------------------------------------------------------------ drawing */

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

type Frame = ReturnType<typeof frame>

function drawMiller(p: p5, s: MillerState, c: Ctx): void {
  if (c.t < 0) return
  const t = c.t + s.begin
  const on = presence(t, s)
  if (on <= 0) return
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.globalAlpha = on

  drawSky(p, c, f, t)
  ctx.globalAlpha = on * stationOn(t)
  if (stationOn(t) > 0) drawStation(p, c, t)
  ctx.globalAlpha = on
  drawSea(p, c, f, t)
  const s0 = waveS(t)
  drawWave(p, c, f, t)
  // The things on the water, their reflections first.
  p.push()
  ctx.beginPath()
  ctx.rect(f.x0 * k, NEAR * k, (f.x1 - f.x0) * k, (f.y1 - NEAR) * k)
  ctx.clip()
  p.translate(0, 2 * NEAR * k)
  p.scale(1, -1)
  ctx.globalAlpha = on * 0.2
  const here = laneAt(s.lane, c.t)
  if (!here.hidden && here.y < 0.05 && t < FOOT) {
    p.noStroke()
    p.fill(BALL)
    p.circle(here.x * k, here.y * k, 2 * R * k * here.scale)
  }
  drawRanger(p, c, t)
  for (let i = 0; i < BUOYS.length; i++) drawBuoy(p, c, t, i)
  drawTars(p, c, t)
  p.pop()
  ctx.globalAlpha = on
  drawRipples(p, c, t, s0)
  drawRanger(p, c, t)
  for (let i = 0; i < BUOYS.length; i++) drawBuoy(p, c, t, i)
  drawTars(p, c, t)
  drawSpray(p, c, f, t)
  drawOut(p, c, t)
  p.pop()
}

/* ------------------------------------------------------------------ the sky */

function drawSky(p: p5, c: Ctx, f: Frame, t: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Miller's air: the dark overhead, going pale down to the water.
  const top = HZ - 4.4
  ctx.fillStyle = c.bg
  ctx.fillRect(X(f.x0 - 0.5), X(f.y0 - 0.5), X(f.x1 - f.x0 + 1), X(Math.max(0, top - f.y0 + 0.5)))
  const g = ctx.createLinearGradient(0, X(top), 0, X(HZ))
  g.addColorStop(0, c.bg)
  g.addColorStop(0.55, mixHex(c.bg, DARK.deep, 0.9))
  g.addColorStop(0.85, mixHex(DARK.deep, DARK.ice, 0.16))
  g.addColorStop(1, mixHex(DARK.deep, DARK.ice, 0.36))
  ctx.fillStyle = g
  ctx.fillRect(X(f.x0 - 0.5), X(top), X(f.x1 - f.x0 + 1), X(HZ - top))
  // A few stars through it, far, going out in the haze.
  p.noStroke()
  const cell = 1.1
  const ox = f.cx * 0.92
  const oy = f.cy * 0.92
  for (let i = Math.floor((f.x0 - ox) / cell) - 1; i <= Math.ceil((f.x1 - ox) / cell); i++) {
    for (let j = Math.floor((f.y0 - oy) / cell) - 1; j <= Math.ceil((HZ - oy) / cell); j++) {
      if (hash(i, j, 91) > 0.5) continue
      const x = ox + (i + hash(i, j, 92)) * cell
      const y = oy + (j + hash(i, j, 93)) * cell
      const a = (1 - smooth(y, top + 1.2, HZ - 1)) * (0.4 + 0.5 * hash(i, j, 94)) * (0.8 + 0.2 * Math.sin(t * 1.7 + i * 3 + j))
      if (a <= 0.02) continue
      p.fill(alpha(p, '#F4EEDF', a))
      p.circle(X(x), X(y), 1.2 + 1.2 * hash(i, j, 95))
    }
  }
}

/* ------------------------------------------------------------------ the station */

function drawStation(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const [cx, cy] = STATION
  // Four spokes and the hub.
  outline(p, ink, weight * 0.5)
  for (let q = 0; q < 4; q++) {
    const a = Math.PI / 4 + (q * Math.PI) / 2
    p.line(X(cx + 0.09 * Math.cos(a)), X(cy + 0.09 * Math.sin(a)), X(cx + RING_IN * Math.cos(a)), X(cy + RING_IN * Math.sin(a)))
  }
  solid(p, ink, weight * 0.5, DARK.hull)
  p.circle(X(cx), X(cy), X(0.18))
  // The rim she runs on, and twelve modules round it, a gap at three o'clock for the catch: the ring as he left
  // it, sunlit on the sun's side, and on the night side its windows lit.
  outline(p, ink, weight * 0.55)
  p.circle(X(cx), X(cy), X(2 * RING_IN))
  for (let j = 0; j < 12; j++) {
    const a0 = (j * TAU) / 12 + 0.07
    const a1 = ((j + 1) * TAU) / 12 - 0.07
    const mid = (a0 + a1) / 2
    const lit = Math.cos(mid - SUN) > 0
    solid(p, ink, weight * 0.45, lit ? DARK.hull : DARK.slate)
    p.beginShape()
    for (let i = 0; i <= 4; i++) {
      const a = a0 + ((a1 - a0) * i) / 4
      p.vertex(X(cx + RING_OUT * Math.cos(a)), X(cy + RING_OUT * Math.sin(a)))
    }
    for (let i = 4; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / 4
      p.vertex(X(cx + RING_IN * Math.cos(a)), X(cy + RING_IN * Math.sin(a)))
    }
    p.endShape(p.CLOSE)
    if (!lit) {
      p.noStroke()
      p.fill(DARK.amber)
      const rw = (RING_IN + RING_OUT) / 2
      p.circle(X(cx + rw * Math.cos(mid)), X(cy + rw * Math.sin(mid)), Math.max(1.5, X(0.035)))
    }
  }
  // The catch: a lever through the tube at three o'clock. Its inner end is in her way; its outer end cuts the tally.
  const last = lastClick(t)
  const locked = t >= LATCH
  const rock = locked ? 0.22 : last.ago < 0.25 ? 0.4 * knock(last.ago, 0.05) : 0
  const [px, py] = PIVOT
  const reach = px - STATION[0] - PATH + 0.03
  const inner: Pt = [px - reach * Math.cos(rock), py - reach * Math.sin(rock)]
  const outer: Pt = [px + 0.3 * Math.cos(rock), py + 0.3 * Math.sin(rock)]
  outline(p, ink, weight * 0.7)
  p.line(X(inner[0]), X(inner[1]), X(outer[0]), X(outer[1]))
  solid(p, ink, weight * 0.4, locked ? DARK.gold : DARK.hull)
  p.circle(X(px), X(py), X(0.06))
  // The tally: a mark cut for every lap, in fives.
  const n = last.i + 1
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.lineCap = 'round'
  for (let m = 0; m < n; m++) {
    const g = Math.floor(m / 5)
    const r = m % 5
    const x = TALLY_X + g * 0.4
    const fresh = knock(t - CLICKS[m], 0.3)
    p.stroke(fresh > 0.03 ? mixHex(DARK.hull, DARK.gold, fresh) : DARK.hull)
    p.strokeWeight(weight * 0.6)
    if (r < 4) {
      const xx = x + r * 0.065 + (hash(m, 3) - 0.5) * 0.012
      p.line(X(xx), X(cy - 0.12 + hash(m, 5) * 0.02), X(xx + (hash(m, 4) - 0.5) * 0.025), X(cy + 0.12))
    } else p.line(X(x - 0.05), X(cy + 0.09), X(x + 0.24), X(cy - 0.09))
  }
  // A lamp at the pivot: a blink each lap, steady once it holds.
  if (locked || last.ago < 0.15) {
    const a = locked ? 0.45 : knock(last.ago, 0.06)
    const g = ctx.createRadialGradient(X(px), X(py), 0, X(px), X(py), X(0.18))
    g.addColorStop(0, rgba(DARK.gold, 0.75 * a))
    g.addColorStop(1, rgba(DARK.gold, 0))
    ctx.fillStyle = g
    ctx.fillRect(X(px - 0.18), X(py - 0.18), X(0.36), X(0.36))
  }
}

function lastClick(t: number): { i: number; ago: number } {
  if (t < CLICKS[0]) return { i: -1, ago: Infinity }
  const i = Math.min(CLICKS.length - 1, Math.floor((t - CLICKS[0]) / EIGHTH + 1e-6))
  return { i, ago: t - CLICKS[i] }
}

/* ------------------------------------------------------------------ the sea */

function drawSea(p: p5, c: Ctx, f: Frame, t: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bottom = f.y1 + 0.5
  ctx.fillStyle = mixHex(DARK.slate, DARK.deep, 0.5)
  ctx.fillRect(X(f.x0 - 0.5), X(HZ), X(f.x1 - f.x0 + 1), X(bottom - HZ))
  // The sky in it, bright at the horizon.
  const g = ctx.createLinearGradient(0, X(HZ), 0, X(HZ + 1.1))
  g.addColorStop(0, rgba(DARK.ice, 0.3))
  g.addColorStop(1, rgba(DARK.ice, 0))
  ctx.fillStyle = g
  ctx.fillRect(X(f.x0 - 0.5), X(HZ), X(f.x1 - f.x0 + 1), X(1.1))
  // Glints, closer together as they go off.
  ctx.lineCap = 'round'
  for (let j = 0; j < 16; j++) {
    const sd = 2.3 * Math.pow(0.79, j)
    const y = depthY(sd)
    if (y > bottom) continue
    ctx.strokeStyle = rgba(DARK.ice, 0.1 + 0.1 * (1 - sd / 2.3))
    ctx.lineWidth = Math.max(0.6, k * 0.022 * Math.min(1, sd))
    ctx.beginPath()
    const a = VPX + (f.x0 - VPX) / sd
    const b = VPX + (f.x1 - VPX) / sd
    const gap = 1.6
    for (let i = Math.floor(a / gap) - 1; i <= Math.ceil(b / gap); i++) {
      if (hash(i, j, 11) > 0.55) continue
      const x = i * gap + hash(i, j, 12) * gap + 0.25 * Math.sin(t * 0.5 + i + j)
      const l = (0.25 + hash(i, j, 13) * 0.7) * sd
      const sx = depthX(x, sd)
      ctx.moveTo(X(sx), X(y))
      ctx.lineTo(X(sx + l), X(y))
    }
    ctx.stroke()
  }
  // Gargantua's light lying on the water under it.
  for (let j = 0; j < 14; j++) {
    const y = HZ + 0.06 + j * 0.14 + j * j * 0.012
    if (y > bottom) break
    const w = 0.18 + 0.05 * j + 0.08 * Math.sin(t * 1.3 + j * 2.1)
    ctx.strokeStyle = rgba(DARK.gold, 0.22 * (1 - j / 14) * (0.42 + 0.58 * smooth(t, beat(182.2), beat(183.2))))
    ctx.lineWidth = Math.max(0.6, k * 0.025)
    ctx.beginPath()
    ctx.moveTo(X(GARG[0] - w / 2 + 0.05 * Math.sin(t + j)), X(y))
    ctx.lineTo(X(GARG[0] + w / 2 + 0.05 * Math.sin(t + j)), X(y))
    ctx.stroke()
  }
  // The horizon.
  p.stroke(alpha(p, DARK.hull, 0.55))
  p.strokeWeight(weight * 0.6)
  p.line(X(f.x0 - 0.5), X(HZ), X(f.x1 + 0.5), X(HZ))
  void ink
}

/* ------------------------------------------------------------------ the wave */

function drawWave(p: p5, c: Ctx, f: Frame, t: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const s = waveS(t)
  const H = waveH(t)
  const xc = waveX(t)
  const base = depthY(s)
  const near = smooth(s, 0.25, 0.95)
  const x0 = f.x0 - 0.5
  const x1 = f.x1 + 0.5
  const pts: Pt[] = []
  const fr: number[] = []
  for (let sx = x0; sx <= x1 + 1e-6; sx += 0.035) {
    const d = VPX + (sx - VPX) / s - xc
    const F = profile(d, s)
    fr.push(F)
    pts.push([sx, base - s * H * F])
  }
  // Its reflection in the sheet of water in front of it.
  ctx.fillStyle = rgba(DARK.slate, 0.4 - 0.2 * near)
  ctx.beginPath()
  ctx.moveTo(X(x0), X(base))
  for (const [x, y] of pts) ctx.lineTo(X(x), X(base + (base - y) * 0.55))
  ctx.lineTo(X(x1), X(base))
  ctx.closePath()
  ctx.fill()
  // The body: far off it is the blue of hills in haze; near, the dark of deep water.
  const far = mixHex(DARK.slate, DARK.ice, 0.42)
  const body = mixHex(far, mixHex(DARK.deep, DARK.ice, 0.24), near)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(X(x0), X(base + 0.01))
  for (const [x, y] of pts) ctx.lineTo(X(x), X(y))
  ctx.lineTo(X(x1), X(base + 0.01))
  ctx.closePath()
  ctx.fill()
  // Near, it is water: light through the top of the face, lines running with it, white on the crest, spray blown back off it.
  const broke = smooth(t, FLING, FLING + 0.9)
  if (near > 0.05) {
    // The normal at each sample, pointing into the water.
    const nrm: Pt[] = pts.map((_, i) => {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const l = Math.hypot(dx, dy) || 1
      return [-dy / l, dx / l]
    })
    const dOf = (i: number) => VPX + (pts[i][0] - VPX) / s - xc
    // Light through the face under the crest.
    ctx.fillStyle = rgba(DARK.ice, 0.26 * near)
    ctx.beginPath()
    let first = true
    const band: Pt[] = []
    for (let i = 0; i < pts.length; i++) {
      const d = dOf(i)
      const w = s * H * 0.22 * fr[i] * smooth(d, -L_FACE * 0.85, -L_FACE * 0.3) * (1 - smooth(d, 0.2, 1.6))
      if (first) ctx.moveTo(X(pts[i][0]), X(pts[i][1]))
      else ctx.lineTo(X(pts[i][0]), X(pts[i][1]))
      first = false
      band.push([pts[i][0] + nrm[i][0] * w, pts[i][1] + nrm[i][1] * w])
    }
    for (let i = band.length - 1; i >= 0; i--) ctx.lineTo(X(band[i][0]), X(band[i][1]))
    ctx.closePath()
    ctx.fill()
    // Lines that run with the face, inside it.
    ctx.lineCap = 'round'
    for (const [off, al] of [[0.16, 0.3], [0.34, 0.22], [0.56, 0.14]] as Pt[]) {
      ctx.strokeStyle = rgba(DARK.ice, al * near)
      ctx.lineWidth = Math.max(0.6, k * 0.02)
      ctx.beginPath()
      let pen = false
      for (let i = 0; i < pts.length; i++) {
        const d = dOf(i)
        const keep = d > -L_FACE * 0.75 + off && d < 1.4 - off * 1.5 && fr[i] > 0.25
        if (!keep) {
          pen = false
          continue
        }
        const o = off * s * (H / 3)
        const x = X(pts[i][0] + nrm[i][0] * o)
        const y = X(pts[i][1] + nrm[i][1] * o)
        if (!pen) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        pen = true
      }
      ctx.stroke()
    }
  }
  // The outline of it against the sky.
  outline(p, ink, weight * (0.45 + 0.45 * near))
  p.stroke(alpha(p, ink, 0.45 + 0.4 * near))
  p.beginShape()
  for (const [x, y] of pts) if (y < base - 0.002) p.vertex(X(x), X(y))
  p.endShape()
  // Snow on the peaks far off; whitewater along the crest near, heavier as it breaks.
  ctx.lineCap = 'round'
  for (let i = 1; i < pts.length; i++) {
    const hi = smooth(Math.min(fr[i], fr[i - 1]), 0.55 + 0.33 * near, 0.9 + 0.08 * near)
    if (hi <= 0) continue
    ctx.strokeStyle = rgba(DARK.hull, 0.92 * hi)
    ctx.lineWidth = X((0.03 + 0.06 * near + 0.2 * broke) * (0.75 + 0.5 * hash(i, 17)))
    ctx.beginPath()
    ctx.moveTo(X(pts[i - 1][0]), X(pts[i - 1][1] + 0.012 + 0.08 * broke))
    ctx.lineTo(X(pts[i][0]), X(pts[i][1] + 0.012 + 0.08 * broke))
    ctx.stroke()
  }
  if (near > 0.5) {
    // Spray, always coming off the top and blown back the way it came from.
    p.noStroke()
    const peak = xc
    for (let i = 0; i < 44; i++) {
      const period = 0.9 + 0.5 * hash(i, 31)
      const age = (t / period + hash(i, 32)) % 1
      const d0 = (hash(i, 33) - 0.35) * 3
      const F = profile(d0, 1)
      const y0 = base - H * F * s
      const x = depthX(peak + d0, s) + age * (0.5 + 0.4 * hash(i, 34))
      const y = y0 - age * (0.35 + 0.35 * hash(i, 35)) + 0.3 * age * age
      p.fill(alpha(p, DARK.hull, 0.6 * (1 - age) * smooth(F, 0.6, 0.9) * smooth(near, 0.5, 1)))
      p.circle(X(x), X(y), X(0.035 + 0.045 * hash(i, 36)))
    }
  }
  // It breaks the moment it has thrown: the lip pitches out forward and comes down in white.
  const pitch = smooth(t, FLING - 0.05, FLING + 0.75)
  if (s >= 1 && pitch > 0) {
    const cy = NEAR - H
    const L = 1.25 * pitch
    const drop = smooth(t, FLING + 0.45, FLING + 1.3)
    const lipPts: Pt[] = [
      [xc + 0.35, cy + 0.06],
      [xc - 0.05, cy - 0.2 * pitch + 0.5 * drop],
      [xc - 0.55 * L, cy - 0.12 * pitch + 0.9 * drop],
      [xc - 0.95 * L, cy + 0.12 * L + 1.2 * drop],
      [xc - 1.05 * L, cy + 0.42 * L + 1.4 * drop],
      [xc - 0.85 * L, cy + 0.34 * L + 1.1 * drop],
      [xc - 0.55 * L, cy + 0.2 * L + 0.7 * drop],
      [xc - 0.35, cy + 0.3],
    ]
    solid(p, ink, weight * 0.8, mixHex(body, DARK.ice, 0.25))
    p.beginShape()
    p.curveVertex(X(lipPts[0][0]), X(lipPts[0][1]))
    for (const [x, y] of lipPts) p.curveVertex(X(x), X(y))
    p.curveVertex(X(lipPts[lipPts.length - 1][0]), X(lipPts[lipPts.length - 1][1]))
    p.endShape(p.CLOSE)
    ctx.strokeStyle = rgba(DARK.hull, 0.9)
    ctx.lineWidth = X(0.07 + 0.08 * drop)
    ctx.beginPath()
    ctx.moveTo(X(lipPts[1][0]), X(lipPts[1][1] + 0.02))
    ctx.quadraticCurveTo(X(lipPts[2][0]), X(lipPts[2][1] + 0.02), X(lipPts[3][0]), X(lipPts[3][1] + 0.03))
    ctx.stroke()
  }
  // Where it meets the sea, a line of white.
  if (s > 0.2) {
    ctx.strokeStyle = rgba(DARK.hull, 0.35 * near)
    ctx.lineWidth = X(0.03)
    ctx.beginPath()
    let pen = false
    for (let i = 0; i < pts.length; i++) {
      if (fr[i] <= 0.001) {
        pen = false
        continue
      }
      if (!pen) ctx.moveTo(X(pts[i][0]), X(base))
      else ctx.lineTo(X(pts[i][0]), X(base))
      pen = true
    }
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ ripples */

function ring(p: p5, k: number, x: number, y: number, age: number, size: number, flat: number, a0: number): void {
  for (let r = 0; r < 3; r++) {
    const a = age - r * 0.2
    if (a <= 0 || a > 2.6) continue
    const rx = (0.1 + 0.55 * Math.pow(a, 0.65)) * size
    const al = a0 * Math.pow(1 - a / 2.6, 1.6) * (1 - r * 0.28)
    p.noFill()
    p.stroke(alpha(p, DARK.hull, al))
    p.strokeWeight(Math.max(0.6, k * 0.02))
    p.ellipse(x * k, y * k, 2 * rx * k, 2 * rx * flat * k)
  }
}

function drawRipples(p: p5, c: Ctx, t: number, sWave: number): void {
  const { k } = c
  // Swallowed once the wave is over them.
  const under = (x: number) => sWave >= 1 && t > FOOT && surface(x, t) < NEAR - 0.02
  for (const lx of LEGS) ring(p, k, RX + lx + Math.sign(lx) * 0.2, NEAR, t - COLLAR, 0.8, FLAT, 0.55)
  for (let i = 0; i < BUOYS.length; i++) {
    ring(p, k, BUOYS[i], NEAR, t - BUOY_AT[i], 1, FLAT, 0.6)
    ring(p, k, BUOYS[i], NEAR, t - BUOY_TOSS[i], 0.7, FLAT, 0.35)
  }
  for (const at of PLANTS) {
    const x = plantAt(at)[0]
    if (!under(x)) ring(p, k, x, NEAR, t - at, 0.8, FLAT, 0.5)
  }
  if (!under(LAND_X)) ring(p, k, LAND_X, NEAR, t - FOOT, 1.2, FLAT, 0.6)
}

/* ------------------------------------------------------------------ the Ranger */

function drawRanger(p: p5, c: Ctx, t: number): void {
  if (t >= RANGER_UP) return
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const dip = rangerDip(t)
  const by = BELLY + dip
  // Legs: a strut from the belly to a pad on the water, the piston sliding into it as the body sinks.
  for (const lx of LEGS) {
    const top: Pt = [RX + lx, by - 0.02]
    const foot: Pt = [RX + lx + Math.sign(lx) * 0.2, NEAR - 0.02]
    const mid: Pt = [top[0] + (foot[0] - top[0]) * 0.55, top[1] + (foot[1] - top[1]) * 0.55]
    outline(p, ink, weight * 1.6)
    p.line(X(top[0]), X(top[1]), X(mid[0]), X(mid[1]))
    p.stroke(DARK.hull)
    p.strokeWeight(weight * 0.9)
    p.line(X(top[0]), X(top[1]), X(mid[0]), X(mid[1]))
    outline(p, ink, weight * 0.8)
    p.line(X(mid[0]), X(mid[1]), X(foot[0]), X(foot[1]))
    solid(p, ink, weight * 0.6, DARK.slate)
    p.ellipse(X(foot[0]), X(foot[1]), X(0.24), X(0.06))
  }
  // The hull: a low wedge, the nose to the right.
  const hull: Pt[] = [
    [-1.15, 0],
    [1.12, 0],
    [1.2, -0.05],
    [0.9, -0.2],
    [0.45, -0.4],
    [-0.2, -0.42],
    [-1.0, -0.36],
    [-1.18, -0.3],
  ]
  solid(p, ink, weight, DARK.hull)
  p.beginShape()
  for (const [x, y] of hull) p.vertex(X(RX + x), X(by + y))
  p.endShape(p.CLOSE)
  // Its belly in shadow, the engine block, the window.
  solid(p, ink, weight * 0.6, DARK.slate)
  p.beginShape()
  for (const [x, y] of [[-1.15, 0], [1.12, 0], [1.05, -0.07], [-1.12, -0.09]] as Pt[]) p.vertex(X(RX + x), X(by + y))
  p.endShape(p.CLOSE)
  p.rect(X(RX - 1.23), X(by - 0.18), X(0.1), X(0.2), X(0.02))
  solid(p, ink, weight * 0.6, c.bg)
  p.beginShape()
  for (const [x, y] of [[0.55, -0.34], [0.86, -0.2], [0.98, -0.14], [0.6, -0.26]] as Pt[]) p.vertex(X(RX + x), X(by + y))
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.5)
  p.line(X(RX - 0.55), X(by - 0.38), X(RX - 0.55), X(by - 0.09))
  p.line(X(RX + 0.25), X(by - 0.41), X(RX + 0.25), X(by - 0.09))
  // The collar on its back: a short ring with two jaws the ball sits between.
  const cy = by - ROOF
  solid(p, ink, weight * 0.7, DARK.slate)
  p.rect(X(RX), X(cy + 0.02), X(0.36), X(0.07), X(0.02))
  outline(p, ink, weight * 0.9)
  const open = 0.03 * knock(t - COLLAR, 0.15)
  p.line(X(RX - 0.17 - open), X(cy), X(RX - 0.16 - open), X(cy - 0.13))
  p.line(X(RX + 0.17 + open), X(cy), X(RX + 0.16 + open), X(cy - 0.13))
}

/* ------------------------------------------------------------------ the buoys */

function drawBuoy(p: p5, c: Ctx, t: number, i: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const dy = buoyDip(t, i)
  const x = BUOYS[i]
  const wl = NEAR + dy
  // Swallowed by the wave.
  if (waveS(t) >= 0.999 && t > FOOT && surface(x, t) < NEAR - 0.05) return
  // The float, half under.
  solid(p, ink, weight * 0.8, DARK.red)
  p.rect(X(x), X(wl - 0.02), X(0.34), X(0.2), X(0.08))
  solid(p, ink, weight * 0.6, DARK.hull)
  p.rect(X(x), X(wl - 0.06), X(0.34), X(0.05))
  // The mast and the cup.
  const top = wl - 0.1 - MAST
  outline(p, ink, weight * 0.9)
  p.line(X(x), X(wl - 0.1), X(x), X(top))
  p.line(X(x - 0.13), X(top - 0.01), X(x - 0.11), X(top - 0.1))
  p.line(X(x + 0.13), X(top - 0.01), X(x + 0.11), X(top - 0.1))
  p.line(X(x - 0.13), X(top - 0.01), X(x + 0.13), X(top - 0.01))
  // The lamp: out on an arm, lit on every tick.
  const lx = x + 0.1
  const ly = wl - 0.1 - MAST * 0.55
  p.line(X(x), X(ly), X(lx), X(ly))
  let lit = 0
  for (const tk of TICKS) lit = Math.max(lit, knock(t - tk, 0.18))
  lit = Math.max(lit, 1.3 * knock(t - BUOY_AT[i], 0.3))
  solid(p, ink, weight * 0.5, lit > 0.05 ? mixHex(DARK.slate, DARK.red, Math.min(1, lit)) : DARK.slate)
  p.circle(X(lx), X(ly), X(0.07))
  if (lit > 0.03) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(X(lx), X(ly), 0, X(lx), X(ly), X(0.3))
    g.addColorStop(0, rgba(DARK.red, 0.55 * Math.min(1, lit)))
    g.addColorStop(1, rgba(DARK.red, 0))
    ctx.fillStyle = g
    ctx.fillRect(X(lx - 0.3), X(ly - 0.3), X(0.6), X(0.6))
  }
}

/* ------------------------------------------------------------------ TARS */

function drawTars(p: p5, c: Ctx, t: number): void {
  if (t >= TARS_PICKED) return
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const s = tarsAt(t)
  const [hx, hy] = s.hub
  // Four slabs on one hinge. The one with the lamp is the one that plants first.
  for (let q = 0; q < 4; q++) {
    const a = s.phi + (q * Math.PI) / 2
    const [tx, ty] = tip(s, q)
    const mx = (hx + tx) / 2
    const my = (hy + ty) / 2
    p.push()
    p.translate(X(mx), X(my))
    p.rotate(-a)
    solid(p, ink, weight * 0.8, mixHex(DARK.slate, DARK.hull, 0.22))
    p.rect(0, 0, X(SLAB), X(TR + 0.02), X(0.02))
    outline(p, ink, weight * 0.4)
    p.line(-X(SLAB * 0.28), -X(TR * 0.3), -X(SLAB * 0.28), X(TR * 0.4))
    if (q === 1) {
      p.noStroke()
      p.fill(DARK.ice)
      p.rect(X(SLAB * 0.12), -X(TR * 0.12), X(SLAB * 0.3), X(0.1))
    }
    p.pop()
  }
  solid(p, ink, weight * 0.7, DARK.hull)
  p.circle(X(hx), X(hy), X(0.13))
}

/* ------------------------------------------------------------------ spray */

/** Drops thrown from `x, y` at `at`, `n` of them, falling back to the water under low gravity. */
function drops(p: p5, k: number, t: number, at: number, x: number, y: number, n: number, v: number, dir: number, spread: number, seed: number, floor = NEAR): void {
  const age = t - at
  if (age <= 0 || age > 2.2) return
  p.noStroke()
  for (let i = 0; i < n; i++) {
    const a = dir + (hash(i, seed) - 0.5) * spread
    const sp = v * (0.45 + 0.75 * hash(i, seed, 1))
    const dx = x + Math.cos(a) * sp * age
    const dy = y + Math.sin(a) * sp * age + 0.5 * G_LOW * age * age
    if (dy > floor + 0.02) continue
    const fade = 1 - age / 2.2
    p.fill(alpha(p, DARK.hull, 0.85 * fade))
    p.circle(dx * k, dy * k, (0.035 + 0.03 * hash(i, seed, 2)) * k)
  }
}

function drawSpray(p: p5, c: Ctx, f: Frame, t: number): void {
  const { k } = c
  const up = -Math.PI / 2
  // TARS's plants.
  PLANTS.forEach((at, i) => {
    const [x] = plantAt(at)
    drops(p, k, t, at, x, NEAR, 10, 1.25, up + 0.25, 1.5, 40 + i)
  })
  // The ball on the wave's foot.
  drops(p, k, t, FOOT, LAND_X, NEAR, 9, 1.3, up - 0.2, 1.6, 50, 5)
  // The buoys' floats as they go under.
  BUOY_AT.forEach((at, i) => drops(p, k, t, at + 0.12, BUOYS[i], NEAR, 5, 0.7, up, 2.4, 60 + i))
  // The crest feathers: spray off the whole lip, blown back.
  if (t > FEATHER && waveS(t) >= 1) {
    const age = t - FEATHER
    if (age < 1.6) {
      p.noStroke()
      const xc = waveX(FEATHER)
      for (let i = 0; i < 40; i++) {
        const x = f.x0 + ((f.x1 - f.x0) * (i + hash(i, 71))) / 40
        const F = profile(x - xc, 1)
        if (F < 0.6) continue
        const y0 = NEAR - waveH(FEATHER) * F
        const v = 0.7 + 0.8 * hash(i, 72)
        const dx = x + 0.35 * age + 0.1 * hash(i, 73)
        const dy = y0 - v * age + 0.5 * G_LOW * 0.4 * age * age
        p.fill(alpha(p, DARK.hull, 0.7 * (1 - age / 1.6) * smooth(F, 0.6, 0.9)))
        p.circle(dx * k, dy * k, (0.04 + 0.04 * hash(i, 74)) * k)
      }
    }
  }
  // The lip throws the ball: a burst the way it goes.
  const [fx, fy] = rideAt(FLING)
  drops(p, k, t, FLING, fx, fy + 0.08, 18, 2.4, up + 0.55, 1.5, 80, fy + 3)
  drops(p, k, t, FLING, fx - 0.1, fy + 0.1, 10, 1.2, up - 0.3, 1.2, 81, fy + 3)
  // The wake it cuts up the face.
  if (t > FOOT) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const t1 = Math.min(t, FLING)
    ctx.lineCap = 'round'
    const fade = 1 - smooth(t, FLING, FLING + 0.8)
    for (let u = FOOT; u < t1; u += 0.03) {
      const a = rideAt(u)
      const b = rideAt(Math.min(t1, u + 0.03))
      const age = t1 - u
      ctx.strokeStyle = rgba(DARK.hull, 0.55 * fade * (1 - Math.min(1, age / 1.3)))
      ctx.lineWidth = k * 0.05
      ctx.beginPath()
      ctx.moveTo(a[0] * k, (a[1] + R * 0.8) * k)
      ctx.lineTo(b[0] * k, (b[1] + R * 0.8) * k)
      ctx.stroke()
    }
  }
}

/* ------------------------------------------------------------------ the far side of the sphere */

function drawOut(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const e = t - OUT
  if (e < -0.45 || e > 1.4) return
  const [qx, qy] = Q
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The mouth: a small glass sphere, the stars bent round its edge.
  const open = smooth(e, -0.45, -0.1) * (1 - smooth(e, 0.1, 0.7))
  if (open > 0) {
    p.noFill()
    p.stroke(alpha(p, DARK.hull, 0.5 * open))
    p.strokeWeight(Math.max(0.8, k * 0.02))
    p.circle(X(qx), X(qy), X(0.62))
    p.stroke(alpha(p, DARK.ice, 0.35 * open))
    p.arc(X(qx), X(qy), X(0.5), X(0.5), Math.PI * 1.1, Math.PI * 1.6)
  }
  // Its own colour closing on a point, then the flash as it comes through.
  if (e < 0) {
    const u = smooth(e, -0.4, 0)
    p.noFill()
    p.stroke(alpha(p, BALL, 0.9 * u))
    p.strokeWeight(Math.max(1, k * 0.035))
    p.circle(X(qx), X(qy), X(0.62 - 0.4 * u))
  } else {
    const fl = knock(e, 0.22)
    const g = ctx.createRadialGradient(X(qx), X(qy), 0, X(qx), X(qy), X(0.7))
    g.addColorStop(0, rgba(DARK.hull, 0.75 * fl))
    g.addColorStop(1, rgba(DARK.hull, 0))
    ctx.fillStyle = g
    ctx.fillRect(X(qx - 0.7), X(qy - 0.7), X(1.4), X(1.4))
    const u = clamp(e / 0.45)
    p.noFill()
    p.stroke(alpha(p, DARK.ice, 0.8 * (1 - u) * (1 - u)))
    p.strokeWeight(Math.max(1, k * 0.03 * (1 - u)))
    p.circle(X(qx), X(qy), X(0.2 + 0.8 * (1 - (1 - u) * (1 - u))))
  }
}

/**
 * What the next part needs to carry on from this one, in this part's cells:
 * the Ranger's hull anchor (mid-belly) where it sits on the water, TARS's hub
 * over time, the moments they are handed on, and where the ball leaves.
 */
export const MILLER_HANDOFF = {
  ranger: [RX, BELLY] as Pt,
  lift: RANGER_UP,
  picked: TARS_PICKED,
  tars: (t: number): Pt => tarsAt(t).hub,
  exitEnd: (): Pt => rideAt(beat(183)),
}
