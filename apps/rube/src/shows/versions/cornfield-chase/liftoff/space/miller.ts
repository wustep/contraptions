import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, laneAt, mixHex, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, part, route, smooth, type Companion, type Ctx, type Way } from '../kit'
import { beat } from '../music'
import { G_LOW, hop } from '../physics'
import { BALL, BRAND, DARK, GREY, VOID } from '../worlds'

/**
 * Miller's world, and the one who waits.
 *
 * The ball goes into the sphere and the camera goes after it, fast, to the
 * far side: a ring of its own colour closes on a point in a pale sky, and it
 * drops out. Below is a sheet of water to the horizon, ankle deep, and on the
 * horizon a range of mountains.
 *
 * Down here the buoys' lamps keep the planet's tick, two beats, the film's
 * 1.25 s, and the machines hurry through it: the Ranger (the station's own
 * ship, standing on Edmunds' legs with its hood run back) takes the ball into
 * its cockpit, sinks on its legs, and its seat-back kicks it out over the nose
 * on the and; two beacon buoys bob under it and throw it on, and TARS
 * catches it in the crook of its slabs and cartwheels, a slab planted in the
 * water on each vault, the last one whipping over to throw.
 *
 * Up in orbit the ring keeps another time. Brand, whom the trapdoor left
 * behind runs round the inside of it once an eighth, trips a catch every
 * lap, and her blue dims toward the grey of the years. The ring is the
 * clock: its windows are dark when he goes down, and every other lap, on the
 * beat, one more module lights, going round from the catch the way she runs.
 * On the twenty-third lap the twelfth lights, the ring is lit all round, the
 * catch locks and holds her, and the ring goes from the sky.
 *
 * From beat 172 the mountains move. They are one wave, and near it is a wall
 * of water. TARS's third plant throws the ball onto its foot (178), the face
 * lifts it, the crest feathers on 179, and on 180 the lip throws it up and to
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
/** The ball drops into the Ranger's cockpit; its seat-back kicks it out on the and. */
const COLLAR = beat(168)
const COLLAR_TOSS = beat(168.5)
/** The two buoys. */
const BUOY_AT = [beat(169.5), beat(171)]
const BUOY_TOSS = [beat(170), beat(171.5)]
/** TARS takes it, and plants a slab on each vault after, a beat and a half apart and the last one quicker; the third plant throws it. */
const CATCH = beat(173)
const PLANTS = [beat(174.5), beat(176), beat(177)]
/** The ball comes down on the wave's foot, the crest feathers, the lip throws. */
const FOOT = beat(178)
const FEATHER = beat(179)
const FLING = beat(180)
/** The mountains move from here; the wave is at the ball's depth from here. */
const MOVE = beat(172)
const ARRIVE = beat(177.75)
/** The beacons' lamps: the planet's tick. */
const TICKS = [166, 168, 170, 172, 174, 176, 178].map(beat)
/** She trips the catch every eighth from his arrival; the twenty-third locks it. */
const CLICKS = Array.from({ length: 23 }, (_, i) => beat(167 + i / 2))
const LATCH = CLICKS[CLICKS.length - 1]
/** The years, on the ring: every other lap, on the beat, a module's windows light; the twelfth on the lock. */
const YEARS = Array.from({ length: 12 }, (_, n) => beat(167 + n))

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

/** The Ranger (drawn below, `drawRangerShip`): where the ball sits in its open cockpit, at rest on its legs. */
const RX = 8.75
const SEAT_Y = -0.84
/**
 * Beat 178: as the ball meets the wave, the Ranger lifts off — from here the
 * next part (Gargantua) draws it, the same hull at the same size, skimming the
 * wave to pick TARS up and climbing to the hole to catch the ball. So this part
 * stops drawing the Ranger then, and TARS once it is picked up.
 */
const RANGER_UP = FOOT
/** TARS takes hold of the Ranger as it skims past. */
const TARS_PICKED = FOOT + 1.5 * (beat(1) - beat(0))

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
const STATION: Pt = [10.6, -2.8]
const RING_IN = 0.5
const RING_OUT = 0.63
/** She is that far off: drawn at this size. */
const TWIN_SCALE = 0.6
const PATH = RING_IN - R * TWIN_SCALE - 0.012
/** Where on her lap she meets the catch (radians, y down: just under three o'clock). */
const MEET = (R * TWIN_SCALE) / PATH + 0.02
/** Where the sun is, seen from the ring's centre: low on the left, as it was when he left her. */
const SUN = (150 * Math.PI) / 180
/** The catch's pivot, in the gap between two modules at three o'clock. */
const PIVOT: Pt = [STATION[0] + (RING_IN + RING_OUT) / 2, STATION[1]]


/* ------------------------------------------------------------------ the wave */

const S_FAR = 0.13
const L_FACE = 2.6
const L_BACK = 14
const H0 = 3.0
/** The ride: how far right the ball's contact goes while the face lifts it, and how far under the crest it leaves. */
const RIDE_DX = 1.3 * 1.25 - 0.2 * 1.25 * 1.25
const EXIT_D = 0.39
/** Its speed along the sea, cells a second: slowing as it stands up, so the face meets the ball where it must. */
const C_WAVE = (L_FACE - EXIT_D - RIDE_DX) / (FLING - FOOT)
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
const LIP = rideAt(FLING)
export const MILLER_LIP_V: Pt = (() => {
  const a = rideAt(FLING - 0.004)
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

/** Her blue after the years she waits in orbit: dimmed toward grey, still hers. */
const ORBIT_YEARS = mixHex(BRAND, GREY, 0.4)

/** Where she is on her lap, and her colour: her blue dimming with the years by the lock. */
function waitsAt(t: number): { x: number; y: number; angle: number; color: string } {
  // Caught on the locking mark: she runs a hair past it and is held back to it, rather than stopping dead.
  const k = t - LATCH
  const a = t < LATCH ? MEET - (TAU * (t - CLICKS[0])) / EIGHTH : MEET - 0.2 * Math.exp(-k / 0.12) * Math.sin(k * 35)
  const color = mixHex(BRAND, ORBIT_YEARS, clamp((t - OUT) / (LATCH - OUT)))
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
    // Out of the far side, drawn out of nothing, and down into the Ranger's open cockpit.
    const seat: Pt = [RX, SEAT_Y]
    const T1 = COLLAR - OUT
    const vx = (seat[0] - Q[0]) / T1
    const vy = (seat[1] - Q[1] - 0.5 * G_LOW * T1 * T1) / T1
    const E = 0.16
    const P1: Pt = [Q[0] + vx * E, Q[1] + vy * E + 0.5 * G_LOW * E * E]
    segs.push({ from: Q, to: P1, dur: E, arc: (G_LOW * E * E) / 8, portal: 'in' })
    const w1: Way = { at: at(OUT) + E, p: P1 }
    segs.push(...route([w1, hop(w1, seat, at(COLLAR), G_LOW)]))
    // The seat sinks with the Ranger on its legs and comes back up; on the and the seat-back kicks it out.
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
      const born = smooth(t, slot.begin + 0.14, slot.begin + 0.5)
      return { x: w.x, y: w.y, color: w.color, scale: TWIN_SCALE * presence(t, state) * stationOn(t) * born, angle: w.angle }
    }
    return {
      cells: box(-1, -7, 24, 3),
      exit: [end[0] + 0.5, end[1]],
      lane,
      state,
      // A moment after the ring's part lets her go (a gap: she is somewhere else now), growing out of nothing.
      company: [{ from: slot.begin + 0.14, to: GONE + 0.02, at: waits }],
    }
  },
  (slot) => [
    // The whip to the far side from the sphere (the ring's part holds on it), one long move, landing as he comes out.
    { t: OUT, cells: 5.4, hold: [11.35, -1.55] },
    // Only drifting on while the ball drops into the Ranger and is kicked out of it, so the whole ship is seen.
    { t: COLLAR_TOSS, cells: 5.45, hold: [11.55, -1.56] },
    { t: CATCH, cells: 5.8, hold: [13.1, -1.7] },
    { t: beat(176), cells: 7, hold: [13.9, -1.95] },
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
  // The rim she runs on, and twelve modules round it, a gap at three o'clock for the catch; the far sun catches
  // their outer edges on its side. The years go by in it: its windows are dark when he goes down, and on each beat
  // she is up there one more module lights, going round from the catch the way she runs, until on the twelfth the
  // ring is lit all round, the hour struck, and the catch locks.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rw = (RING_IN + RING_OUT) / 2
  outline(p, ink, weight * 0.55)
  p.circle(X(cx), X(cy), X(2 * RING_IN))
  for (let j = 0; j < 12; j++) {
    const a0 = (j * TAU) / 12 + 0.07
    const a1 = ((j + 1) * TAU) / 12 - 0.07
    const mid = (a0 + a1) / 2
    const since = t - YEARS[11 - j]
    const on = since >= 0
    const fl = on ? knock(since, 0.16) : 0
    // Dark, or lit from inside: warm, and brighter a moment as it comes on.
    solid(p, ink, weight * 0.45, on ? mixHex(mixHex(DARK.slate, DARK.amber, 0.42), VOID.ink, 0.45 * fl) : DARK.slate)
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
    const sun = Math.cos(mid - SUN)
    if (sun > 0) {
      outline(p, alpha(p, DARK.hull, 0.85 * sun).toString(), weight * 0.9)
      p.arc(X(cx), X(cy), X(2 * RING_OUT), X(2 * RING_OUT), a0 + 0.03, a1 - 0.03)
    }
    // Its two windows, and the light they give.
    for (const off of [-0.085, 0.085]) {
      const wx = cx + rw * Math.cos(mid + off)
      const wy = cy + rw * Math.sin(mid + off)
      if (on) {
        const g = ctx.createRadialGradient(X(wx), X(wy), 0, X(wx), X(wy), X(0.09 + 0.14 * fl))
        g.addColorStop(0, rgba(DARK.amber, 0.45 + 0.5 * fl))
        g.addColorStop(1, rgba(DARK.amber, 0))
        ctx.save()
        ctx.fillStyle = g
        ctx.fillRect(X(wx - 0.25), X(wy - 0.25), X(0.5), X(0.5))
        ctx.restore()
      }
      p.noStroke()
      p.fill(on ? mixHex(DARK.amber, VOID.ink, 0.25 + 0.6 * fl) : DARK.deep)
      p.circle(X(wx), X(wy), Math.max(1.5, X(0.048)))
    }
  }
  // The catch: a lever through the tube at three o'clock, its inner end in her way; each lap she trips it, and it rocks.
  const last = lastClick(t)
  const locked = t >= LATCH
  const rock = locked ? 0.22 : last.ago < 0.3 ? 0.4 * knock(last.ago, 0.08) : 0
  const [px, py] = PIVOT
  const reach = px - STATION[0] - PATH + 0.03
  const inner: Pt = [px - reach * Math.cos(rock), py - reach * Math.sin(rock)]
  const outer: Pt = [px + 0.09 * Math.cos(rock), py + 0.09 * Math.sin(rock)]
  outline(p, ink, weight * 0.7)
  p.line(X(inner[0]), X(inner[1]), X(outer[0]), X(outer[1]))
  solid(p, ink, weight * 0.4, locked ? DARK.gold : DARK.hull)
  p.circle(X(px), X(py), X(0.06))
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
    ctx.strokeStyle = rgba(DARK.gold, 0.22 * (1 - j / 14) * (0.42 + 0.58 * smooth(t, beat(179.2), beat(180.2))))
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
  // The Ranger's feet as it takes the ball, and as they leave the water.
  for (const fx of FEET_X) {
    ring(p, k, fx, NEAR, t - COLLAR, 0.8, FLAT, 0.55)
    ring(p, k, fx, NEAR, t - RANGER_UP, 0.9, FLAT, 0.5)
  }
  ring(p, k, RX, NEAR, t - RANGER_UP, 1.8, FLAT, 0.55)
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

/**
 * The Ranger: the ship the station's hangar holds (`act2/hub.ts`), that
 * undocks (`act2/undock.ts`) and comes down on Edmunds' planet on these same
 * legs (`act2/edmunds.ts`). It is one ship from Miller's water to the end, so
 * it is the hub's drawing, in the hub's ship units at the hub's scale: x
 * forward from the ball's seat, y down, the belly line at y = KEEL. A white
 * hull with the black of its belly and nose, a swept wing hung under its
 * after half, a bubble canopy on a sliding hood over the seat, a docking
 * collar on its back, two bells on the tail; in the dark's colours, as
 * Edmunds paints it. Gargantua's part flies the same drawing.
 */
export const RANGER_SCALE = 0.86
/** Its belly line. */
const KEEL = 0.41
/**
 * Where it is flown from: on the belly line under its back, just behind the
 * canopy, where TARS rides and the tether hangs (`MILLER_HANDOFF.ranger` is
 * this point on the water).
 */
export const RANGER_ANCHOR: Pt = [-0.9, KEEL]
/** The hull: the nose, the sill under the canopy, the spine, the tail, the belly. */
const HULL: Pt[] = [
  [1.4, 0.27],
  [1.12, 0.19],
  [0.84, 0.13],
  [0.56, 0.1],
  [-0.46, 0.1],
  [-0.55, 0.0],
  [-0.78, -0.05],
  [-1.86, -0.06],
  [-2.02, -0.01],
  [-2.06, 0.36],
  [-1.98, 0.41],
  [0.35, 0.41],
  [0.86, 0.38],
  [1.16, 0.32],
]
/** The black of the belly and the nose. */
const BLACK: Pt[] = [
  [1.4, 0.27],
  [1.16, 0.32],
  [0.86, 0.38],
  [0.35, 0.41],
  [-1.98, 0.41],
  [-2.05, 0.33],
  [0.35, 0.335],
  [0.86, 0.305],
  [1.13, 0.25],
]
/** The wing, swept and drooped: side-on it hangs under the after half. */
const WING: Pt[] = [
  [-0.3, 0.36],
  [-1.72, 0.72],
  [-2.14, 0.72],
  [-1.98, 0.36],
]
/** The two bells, as bands of the tail, and where the main engine's flame starts. */
const BELLS: Pt[] = [
  [0.02, 0.17],
  [0.21, 0.36],
]
const TAIL = -2.27
/** The canopy's foot at the windscreen. Open, the hood is slid back along the spine by SLIDE. */
const SCREEN: Pt = [0.56, 0.1]
const SLIDE: Pt = [-0.86, -0.12]
/** The docking collar on its back, the fuel port, the wingtip lamp. */
const DOCK: Pt = [-1.66, -0.1]
const PORT: Pt = [-1.5, 0.2]
const WINGTIP: Pt = [-1.95, 0.7]
/** The belly engines, ahead of the wing, and how far under the belly line their mouths are. */
const ENGINES = [-0.228, 0.237]
const JET_Y = KEEL + 0.116
/** The hub's tin, in the dark's colours. */
const TIN = mixHex(DARK.hull, DARK.deep, 0.34)
/** The underside, tail to nose. */
const UNDER: Pt[] = [
  [-1.98, KEEL],
  [0.35, KEEL],
  [0.86, 0.38],
  [1.16, 0.32],
  [1.4, 0.27],
]
function underAt(x: number): number {
  for (let i = 1; i < UNDER.length; i++) {
    const [x0, y0] = UNDER[i - 1]
    const [x1, y1] = UNDER[i]
    if (x <= x1) return y0 + ((y1 - y0) * (Math.max(x, x0) - x0)) / (x1 - x0)
  }
  return UNDER[UNDER.length - 1][1]
}
/** Edmunds' landing legs: hinged under the belly fore and aft; down, each foot splays out, fore or aft, and down. */
const LEG_X = [0.795, -1.25]
const LEG_OUT = 0.22 / RANGER_SCALE
const LEG_REACH = 0.55 / RANGER_SCALE
/** The sleeve each leg's rod runs out of: as long as on Edmunds' flat ground. */
const SLEEVE = 0.55 * Math.hypot(LEG_OUT, LEG_REACH)
/** Down on flat ground, where a foot is. */
const legDown = (i: number): Pt => [LEG_X[i] + (i === 0 ? LEG_OUT : -LEG_OUT), KEEL + LEG_REACH]
/**
 * On Miller's water the feet stand a little under the surface, ankle deep
 * (the legs run out a little further than on Edmunds' ground): where they are
 * in the ship's units with it at rest, and where they stand on the sea.
 */
const FOOT_Y = NEAR + 0.015
export const RANGER_FEET: Pt[] = [0, 1].map((i): Pt => [legDown(i)[0], (FOOT_Y - SEAT_Y) / RANGER_SCALE])
const FEET_X = RANGER_FEET.map(([x]) => RX + x * RANGER_SCALE)

/** How the Ranger is, at a moment. */
export interface RangerLook {
  /** Show seconds: what the flames flicker by. */
  at: number
  /** The hood: 1 slid back, open; 0 shut (a little under as it knocks home). */
  hood: number
  /** The seat-back, swung forward: 0..1. */
  kick: number
  /** The legs: 0 down, 1 folded up into the belly. */
  fold: number
  /** While the legs are down, where the feet are (the ship's units); on flat ground if not given. */
  feet?: Pt[]
  /** The wingtip lamp, 0..1. */
  blink: number
  /** The belly engines, 0 cold to 1 at full thrust; the main engine, likewise. */
  thrust: number
  burn: number
  /** 1 at full size; toward 0 (small, far off) the fine lines go. */
  detail: number
}

/** The hood: back while the ball comes and goes, then run forward, knocking home against its stop as it lifts off (178). */
export function rangerHood(t: number): number {
  const since = t - RANGER_UP
  if (since < -0.3) return 1
  if (since < 0) {
    const u = (since + 0.3) / 0.3
    return 1 - u * u
  }
  return -0.04 * Math.exp(-since / 0.18) * Math.sin(since * 17)
}

/** The seat-back kicks the ball out over the nose on the and, and settles back. */
const kickAt = (t: number): number => {
  const d = t - (COLLAR_TOSS - 0.03)
  return d < 0 ? 0 : Math.min(1, d / 0.07) * Math.exp(-Math.max(0, d - 0.07) / 0.3)
}

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A soft light (pixels), saved and restored so p5's idea of the fill stays true. */
function glowAt(p: p5, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.005 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(1, rgba(hex, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** The bubble, from the windscreen over the seat to its back: the cockpit's well, and the glass that closes over it. */
function bubble(p: p5, k: number): void {
  const X = (v: number) => v * k
  p.beginShape()
  p.vertex(X(SCREEN[0]), X(SCREEN[1]))
  p.bezierVertex(X(0.42), X(-0.14), X(0.14), X(-0.31), X(-0.1), X(-0.3))
  p.bezierVertex(X(-0.36), X(-0.29), X(-0.5), X(-0.12), X(-0.46), X(0.1))
  p.endShape(p.CLOSE)
}

/**
 * The Ranger in its own units. The caller has put the frame on the seat and
 * scaled it by RANGER_SCALE (and by whatever else), and gives `c.weight` in
 * those units. Legs and engines, the hull, the cockpit, the wing over the
 * flank, and the hood's glass.
 */
export function drawRangerShip(p: p5, c: Ctx, look: RangerLook): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const faint = alpha(p, ink, 0.45 * look.detail).toString()
  // The legs, behind the hull (the rear one behind the wing too); folded, all of them is inside it.
  if (look.fold < 0.999) for (let i = 0; i < 2; i++) rangerLeg(p, c, i, look)
  // The main engine: a flame from each bell, ice and a white core.
  if (look.burn > 0.01) {
    const flick = 0.88 + 0.12 * Math.sin(look.at * 61)
    const len = (0.5 + 2.2 * look.burn) * flick
    const w = 0.08 + 0.03 * look.burn
    glowAt(p, X(TAIL - 0.1), X(0.19), X(0.35 + 0.45 * look.burn), DARK.ice, 0.55 * look.burn)
    ctx.save()
    for (const [y0, y1] of BELLS) {
      const yc = (y0 + y1) / 2
      for (const [l, ww, hex, a] of [
        [len, w, DARK.ice, 0.9],
        [len * 0.55, w * 0.5, VOID.ink, 1],
      ] as [number, number, string, number][]) {
        const g = ctx.createLinearGradient(X(TAIL), 0, X(TAIL - l), 0)
        g.addColorStop(0, rgba(hex, a * Math.min(1, look.burn * 1.5)))
        g.addColorStop(0.45, rgba(hex, a * 0.45 * Math.min(1, look.burn * 1.5)))
        g.addColorStop(1, rgba(hex, 0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(X(TAIL), X(yc - ww))
        ctx.quadraticCurveTo(X(TAIL - l * 0.4), X(yc - ww * 1.3), X(TAIL - l), X(yc))
        ctx.quadraticCurveTo(X(TAIL - l * 0.4), X(yc + ww * 1.3), X(TAIL), X(yc + ww))
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.restore()
  }
  // The bells, on the tail.
  for (const [y0, y1] of BELLS) {
    solid(p, ink, weight * 0.7, TIN)
    poly(p, k, [
      [-2.05, y0 + 0.025],
      [-2.26, y0 - 0.015],
      [-2.26, y1 + 0.015],
      [-2.05, y1 - 0.025],
    ])
  }
  // The belly engines: a flame down from each while they burn, and their bells, warm after.
  for (const x of ENGINES) {
    const th = look.thrust
    if (th > 0.01) {
      const len = (0.4 + 0.9 * th) * (0.88 + 0.12 * Math.sin(look.at * 67 + x * 9))
      glowAt(p, X(x), X(JET_Y + len * 0.4), X(0.4 + 0.45 * th), DARK.amber, 0.55 * th)
      solid(p, alpha(p, ink, 0.6).toString(), weight * 0.5, DARK.amber)
      poly(p, k, [
        [x - 0.08, JET_Y],
        [x, JET_Y + len],
        [x + 0.08, JET_Y],
      ])
      p.noStroke()
      p.fill(alpha(p, VOID.ink, 0.85))
      poly(p, k, [
        [x - 0.04, JET_Y],
        [x, JET_Y + len * 0.45],
        [x + 0.04, JET_Y],
      ])
    }
    solid(p, ink, weight * 0.6, mixHex(DARK.slate, DARK.amber, 0.8 * Math.min(1, th)))
    poly(p, k, [
      [x - 0.058, KEEL - 0.012],
      [x - 0.093, JET_Y],
      [x + 0.093, JET_Y],
      [x + 0.058, KEEL - 0.012],
    ])
  }
  // The hull, and the black of its belly and nose.
  solid(p, ink, weight, DARK.hull)
  poly(p, k, HULL)
  p.noStroke()
  p.fill(DARK.deep)
  poly(p, k, BLACK)
  // Panel lines, the hatch, the fuel port: they go when it is small.
  if (look.detail > 0.02) {
    outline(p, faint, weight * 0.5)
    for (const x of [-0.78, -1.62]) p.line(X(x), X(-0.04), X(x), X(0.33))
    p.rect(X(-1.1), X(0.16), X(0.3), X(0.18), X(0.04))
    solid(p, faint, weight * 0.5, mixHex(DARK.slate, DARK.hull, 1 - look.detail))
    p.circle(X(PORT[0]), X(PORT[1]), X(0.12))
  }
  // The docking collar on its back.
  solid(p, ink, weight * 0.7, TIN)
  p.rect(X(DOCK[0]), X(DOCK[1]), X(0.36), X(0.09), X(0.02))
  // The cockpit: the well dark under the glass (with the hood back, only its floor: an open cockpit, not a dark
  // dome), the lit panel, the red seat-back behind the ball.
  const open = clamp(look.hood)
  ctx.save()
  if (open > 0) {
    ctx.beginPath()
    ctx.rect(X(-1), X(-0.34 + 0.3 * open), X(2), X(0.6))
    ctx.clip()
  }
  solid(p, ink, weight * 0.6, DARK.deep)
  bubble(p, k)
  ctx.restore()
  glowAt(p, 0, 0, X(0.42), DARK.amber, 0.28 * (1 - 0.6 * open))
  if (look.detail > 0.02) {
    for (const [x, y, col] of [
      [0.4, 0.04, DARK.amber],
      [0.33, -0.05, DARK.ice],
      [0.26, -0.12, DARK.hull],
    ] as const) {
      p.noStroke()
      p.fill(alpha(p, col, look.detail))
      p.circle(X(x), X(y), X(0.05))
    }
  }
  p.push()
  p.translate(X(-0.235), X(0.1))
  p.rotate(0.95 * look.kick)
  solid(p, ink, weight * 0.6, DARK.red)
  poly(p, k, [
    [-0.075, 0],
    [0.005, -0.24],
    [0.095, -0.24],
    [0.075, 0],
  ])
  p.pop()
  // The wing, swept back and hung down under the after half, over the flank; and its lamp.
  solid(p, ink, weight * 0.9, TIN)
  poly(p, k, WING)
  if (look.detail > 0.02) {
    outline(p, faint, weight * 0.5)
    p.line(X(-0.75), X(0.47), X(-2.02), X(0.47))
  }
  if (look.blink > 0.02) glowAt(p, X(WINGTIP[0]), X(WINGTIP[1]), X(0.28), DARK.red, 0.8 * look.blink)
  solid(p, ink, weight * 0.5, look.blink > 0.3 ? DARK.amber : DARK.red)
  p.circle(X(WINGTIP[0]), X(WINGTIP[1]), X(0.075))
  // The hood's glass, its windscreen frame, a glint: slid back along the spine while it is open.
  p.push()
  p.translate(X(SLIDE[0] * look.hood), X(SLIDE[1] * clamp(look.hood)))
  solid(p, ink, weight * 1.1, alpha(p, DARK.ice, 0.24).toString())
  bubble(p, k)
  outline(p, ink, weight * 0.8)
  p.line(X(0.16), X(-0.27), X(0.32), X(0.1))
  outline(p, alpha(p, ink, 0.6).toString(), Math.max(weight * 0.9, X(0.035)))
  p.arc(X(-0.02), X(-0.02), X(0.46), X(0.46), -2.4, -1.5)
  p.pop()
}

/** A landing leg: the sleeve from its hinge, the rod run out of it to the foot's pad, a brace from the belly. */
function rangerLeg(p: p5, c: Ctx, i: number, look: RangerLook): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const hx = LEG_X[i]
  const top: Pt = [hx, underAt(hx)]
  const down = look.feet?.[i] ?? legDown(i)
  const L0 = Math.hypot(down[0] - top[0], down[1] - top[1])
  const a0 = Math.atan2(down[1] - top[1], down[0] - top[0])
  // Folding, it swings through straight down to lie along the belly toward the other leg, a little up into it,
  // and draws in: folded, the hull hides all of it.
  const u = look.fold * look.fold * (3 - 2 * look.fold)
  const a1 = i === 0 ? Math.PI + 0.14 : -0.14
  const a = a0 + (a1 - a0) * u
  const L = L0 * (1 - 0.35 * u)
  const foot: Pt = [top[0] + Math.cos(a) * L, top[1] + Math.sin(a) * L]
  const s = Math.min(L, SLEEVE)
  const mid: Pt = [top[0] + Math.cos(a) * s, top[1] + Math.sin(a) * s]
  const bx = hx + (i === 0 ? -0.372 : 0.372)
  outline(p, ink, weight * 0.7)
  p.line(X(bx), X(underAt(bx)), X(mid[0]), X(mid[1]))
  outline(p, ink, weight * 0.9)
  p.line(X(mid[0]), X(mid[1]), X(foot[0]), X(foot[1]))
  outline(p, ink, weight * 1.7)
  p.line(X(top[0]), X(top[1]), X(mid[0]), X(mid[1]))
  p.stroke(DARK.hull)
  p.strokeWeight(weight * 0.9)
  p.line(X(top[0]), X(top[1]), X(mid[0]), X(mid[1]))
  solid(p, ink, weight * 0.6, DARK.slate)
  p.ellipse(X(foot[0]), X(foot[1] - 0.017), X(0.256), X(0.058))
  solid(p, ink, weight * 0.5, DARK.hull)
  p.circle(X(top[0]), X(top[1]), X(0.07))
}

/** The Ranger standing on the water: the ball's seat at RX, sinking on its legs as it takes the ball, its feet where they stand. */
function drawRanger(p: p5, c: Ctx, t: number): void {
  if (t >= RANGER_UP) return
  const y = SEAT_Y + rangerDip(t)
  const S = RANGER_SCALE
  const feet = RANGER_FEET.map(([x]): Pt => [x, (FOOT_Y - y) / S])
  let blink = 0
  for (const tk of TICKS) blink = Math.max(blink, knock(t - tk, 0.18))
  p.push()
  p.translate(RX * c.k, y * c.k)
  p.scale(S)
  drawRangerShip(p, { ...c, weight: c.weight / S }, {
    at: t,
    hood: rangerHood(t),
    kick: kickAt(t),
    fold: 0,
    feet,
    blink,
    // The belly engines spool up as the wave comes: it is going.
    thrust: 0.3 * smooth(t, RANGER_UP - 0.3, RANGER_UP),
    burn: 0,
    detail: 1,
  })
  p.pop()
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
  // The Ranger lifts off: its belly engines blow the water out from under it, both ways.
  drops(p, k, t, RANGER_UP, RX - 0.25, NEAR, 12, 1.7, up - 0.8, 0.8, 90)
  drops(p, k, t, RANGER_UP, RX + 0.25, NEAR, 12, 1.7, up + 0.8, 0.8, 91)
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
  }
}

/**
 * What the next part needs to carry on from this one, in this part's cells:
 * the Ranger's anchor (RANGER_ANCHOR, on the belly line under its back)
 * where it stands on the water, TARS's hub
 * over time, the moments they are handed on, and where the ball leaves.
 */
export const MILLER_HANDOFF = {
  ranger: [RX + RANGER_ANCHOR[0] * RANGER_SCALE, SEAT_Y + RANGER_ANCHOR[1] * RANGER_SCALE] as Pt,
  lift: RANGER_UP,
  picked: TARS_PICKED,
  tars: (t: number): Pt => tarsAt(t).hub,
  exitEnd: (): Pt => rideAt(FLING),
}
