import type { Pt } from '../../../../../parts'
import { CODA, CODA_CHORDS, eighth, note, strength } from '../music'
import { PLAN } from '../seams'

/**
 * The mine as functions of show time, in the mine part's own frame (the ball lands at (-0.5, 0) on 74.422; the part
 * is laid mirrored, so in the world all of this runs west). `mine.ts` samples `peerAt` for the lane, and the set
 * and the carts are drawn from the same functions, so he never slides off his heap of ore.
 *
 *   74.422  (phrase 8, B) he drops through the hall's floor onto the ore heaped in a cart; the chock jumps out and
 *           the cart begins to roll. Behind him, up the dark tunnel, two troll miners asleep in their own cart wake
 *   75.403  the lead troll knocks off their brake: their cart rolls after him
 *   76.375  the cart's first clack over a rail joint, a spark, and the first torch catches: from here the wheels
 *           click over a joint on every note of the theme (the joints are laid where the notes fall), and each
 *           torch on the timbers catches from a spark as he passes, so the mine lights up behind him
 *   79.245, 80.182, 81.115  the trolls gaining, the lead lunging for him on the accents
 *   82.053  (phrase 9) wide: the whole stope, the chase, the switch ahead
 *   83.453  his wheel knocks over the switch lever; it topples, lifting the switch blade behind him
 *   83.912  the blade is up as the trolls reach it: their cart runs up the catch siding
 *   84.816  into the buffer: the trolls pitched over it
 *   87.482  his cart hits the stop block at the shaft; the bin pitches forward and throws him
 *   87.921  he bounces off the tipped bin's lip, and drops 8 cells straight down the shaft
 *   89.232  (phrase 10) onto the drum
 */

export const BEGIN = PLAN.mine.begin
export const END = PLAN.mine.end

/* ------------------------------------------------------------------ the music's moments */

/** Eighth `j` of the grid, counted from the part's first note (74.422 is eighth 256: phrase 8's downbeat). */
const J0 = 256
const at8 = (j: number): number => eighth(J0 + j)

export const LAND = BEGIN
/** The lead troll knocks the brake off their cart (the phrase's first strong accent). */
export const BRAKE = at8(4)
/** The wheels' first clack and the first torch (the phrase's strongest note). */
export const FIRST_CLACK = at8(8)
/** The trolls lunging for him. */
export const LUNGES = [at8(20), at8(24), at8(28)]
/** Phrase 9: the pull back. */
export const WIDE = at8(32)
/** His front wheel knocks the switch lever over; the trolls reach the raised blade; their buffer. */
export const TRIP = at8(38)
export const ONTO = at8(40)
export const CRASH = at8(44)
/** The trolls' last shout after him. */
export const SHOUT = at8(50)
/** The stop block at the shaft, and his bounce off the tipped bin's lip. */
export const STOP = at8(56)
export const BOUNCE = at8(58)

/** The clacks: every note of the theme from the first clack to the stop (the joints are laid where they fall). */
export interface Clack {
  t: number
  /** How loud the note is measured (0..~5). */
  s: number
  /** The rail joint's x, where his front wheel is at `t`. */
  x: number
}

/* ------------------------------------------------------------------ geometry */

/** The main line's rail top. The ball on the heap in his cart sits exactly 0.88 above it: at y 0. */
export const RAIL = 0.88
/** The floor's top (the sleepers sit in it). */
export const FLOOR_Y = 0.97

/** An ore cart's shape, in cells, from the rail up: wheels, the bin's bottom and rim, their half-lengths, the bumpers. */
export interface CartShape {
  wheelR: number
  /** The axles, either side of the middle. */
  wheelX: number
  /** Heights above the rail. */
  bottom: number
  rim: number
  rimHalf: number
  bottomHalf: number
  /** Bumper blocks' outer faces, from the middle. */
  bump: number
}
export const PEER_CART: CartShape = { wheelR: 0.12, wheelX: 0.32, bottom: 0.19, rim: 0.55, rimHalf: 0.5, bottomHalf: 0.41, bump: 0.54 }
export const TROLL_CART: CartShape = { wheelR: 0.16, wheelX: 0.52, bottom: 0.24, rim: 0.72, rimHalf: 0.82, bottomHalf: 0.7, bump: 0.86 }
/** The heap's top under him (above the rail): he sits on it. */
export const HEAP_TOP = 0.75

/** The stop block at the end of the line, its face; the shaft beyond it, down to the drum. */
export const STOP_X = 20.35
export const SHAFT: [number, number] = [20.5, 22.5]
/** His cart's middle against the stop block. */
export const CX_STOP = STOP_X - PEER_CART.bump
/** Where the ball lands on the drum: the part's exit, less half a cell. */
export const EXIT: Pt = [PLAN.mine.exit[0] - 0.5, PLAN.mine.exit[1]]
/** Where the empty cart rolls back to after the tip, clear of the chimney (local x 19.5) that the finale rises up. */
export const CX_PARKED = 16.9
/** The chimney the finale lifts him up (the director's), in this frame: keep it clear. */
export const CHIMNEY_X = 19.5

/** The trolls' cart parked up the tunnel behind him. */
const TROLL_S0 = -3.1

/** The switch: the blade's hinge, its length and its raised angle; the catch siding's angle up to its buffer. */
export const BLADE_L = 0.62
export const BLADE_UP = 0.42
export const SIDING_UP = 0.5

/* ------------------------------------------------------------------ motion helpers */

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
export const smooth01 = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
export const ease = (t: number, a: number, b: number): number => smooth01((t - a) / (b - a))
/** A kick: 1 at `d` 0, decaying over `tau`; 0 before. */
export const kick = (d: number, tau: number): number => (d < 0 ? 0 : Math.exp(-d / tau))

/** A drive from knots of speed (time, cells a second), linear between: the distance covered since the first knot. Two knots at one time jump the speed. */
function driven(knots: [number, number][]): { dist: (t: number) => number; speed: (t: number) => number } {
  const acc: number[] = [0]
  for (let i = 1; i < knots.length; i++) acc.push(acc[i - 1] + ((knots[i][1] + knots[i - 1][1]) / 2) * (knots[i][0] - knots[i - 1][0]))
  const seg = (t: number): number => {
    let i = 0
    while (i + 2 < knots.length && t > knots[i + 1][0]) i++
    return i
  }
  return {
    dist: (t) => {
      if (t <= knots[0][0]) return 0
      const n = knots.length
      if (t >= knots[n - 1][0]) return acc[n - 1] + knots[n - 1][1] * (t - knots[n - 1][0])
      const i = seg(t)
      const [ta, va] = knots[i]
      const [tb, vb] = knots[i + 1]
      const u = t - ta
      return acc[i] + va * u + (tb > ta ? ((vb - va) / (tb - ta)) * u * u * 0.5 : 0)
    },
    speed: (t) => {
      if (t <= knots[0][0]) return knots[0][1]
      const n = knots.length
      if (t >= knots[n - 1][0]) return knots[n - 1][1]
      const i = seg(t)
      const [ta, va] = knots[i]
      const [tb, vb] = knots[i + 1]
      return tb > ta ? va + ((vb - va) * (t - ta)) / (tb - ta) : vb
    },
  }
}

/* ------------------------------------------------------------------ his cart */

/**
 * His cart rolls from the chock's release, gathering speed down the gallery's long grade the way the music gathers
 * tempo (the quarter note goes from 0.49 to 0.44 s over the part), until it hits the stop block on 87.482.
 */
const peerDrive = (() => {
  const knots: [number, number][] = [
    [LAND, 0],
    [FIRST_CLACK, 0.62],
    [at8(16), 1.25],
    [at8(24), 1.7],
    [WIDE, 2.0],
    [CRASH, 2.3],
    [STOP, 2.6],
  ]
  const raw = driven(knots)
  const k = (CX_STOP + 0.5) / raw.dist(STOP)
  return { dist: (t: number) => k * raw.dist(t), speed: (t: number) => k * raw.speed(t) }
})()

/** His cart's middle (on the rail). After the stop it stands against the block; when its bin has fallen back, it rolls back clear of the chimney. */
export function peerCartX(t: number): number {
  if (t <= LAND) return -0.5
  if (t <= STOP) return -0.5 + peerDrive.dist(t)
  return CX_STOP + (CX_PARKED - CX_STOP) * ease(t, STOP + 1.2, STOP + 3.6)
}
export const peerCartSpeed = (t: number): number => (t <= LAND || t >= STOP ? 0 : peerDrive.speed(t))

/* ------------------------------------------------------------------ the clacks */

/** Every sounded note from the first clack to just before the stop that the recording has something on. */
export const CLACKS: Clack[] = (() => {
  const out: Clack[] = []
  for (let j = 8; j < 56; j++) {
    const n = note(J0 + j)
    const s = strength(J0 + j).s
    if (!n.sounded || s < 0.3) continue
    const t = at8(j)
    out.push({ t, s, x: peerCartX(t) + PEER_CART.wheelX })
  }
  return out
})()

/** The cart's jolt from the clacks: how far its front dips (radians) and how far it drops, at `t`. */
export function jolt(t: number): { pitch: number; drop: number } {
  let pitch = 0
  let drop = 0
  for (const c of CLACKS) {
    const d = t - c.t
    if (d < 0 || d > 0.5) continue
    const a = Math.min(1, 0.35 + c.s / 3)
    const e = Math.exp(-d / 0.07)
    pitch += 0.05 * a * e * Math.cos(d * 38)
    drop += 0.02 * a * e
  }
  return { pitch, drop }
}

/** How high each clack throws him off the ore, and the bump's shape: sharp up, and down onto the heap softly. */
const HOP_T = 0.17
function hops(t: number): number {
  let y = 0
  for (const c of CLACKS) {
    const d = t - c.t
    if (d < 0 || d > HOP_T) continue
    const u = d / HOP_T
    const h = 0.016 + 0.034 * Math.min(1, c.s / 2.6)
    y += h * 6.75 * u * (1 - u) * (1 - u)
  }
  return y
}

/* ------------------------------------------------------------------ the trolls' cart */

/**
 * Their cart is parked up the tunnel behind his (its middle at -3.1 on the main line) until the brake comes off.
 * Then it runs down the tunnel's steeper grade, gaining on him, the lead troll lunging on the accents; it drops back
 * a little as his cart gathers speed (enough for the switch to be thrown between them); and at the switch it runs
 * up the catch siding into the buffer, stopping dead on 84.816.
 */
const trollDrive = driven([
  [BRAKE, 0],
  [FIRST_CLACK, 1.0],
  [at8(16), 1.45],
  [LUNGES[0], 1.56],
  [LUNGES[2], 1.7],
  [TRIP, 1.7],
  [ONTO, 1.78],
])
/** Their cart's distance along its track (its middle): the main line, then (from the switch) the blade and the siding. */
const trollMain = (t: number): number => TROLL_S0 + trollDrive.dist(t)
/** The switch blade's hinge: where their front wheel is when it reaches the raised blade. */
export const X_F = trollMain(ONTO) + TROLL_CART.wheelX
const V_ONTO = trollDrive.speed(ONTO)
const V_HIT = 0.95
/** Along the siding their cart slows, climbing; it hits the buffer at CRASH. */
const S_HIT = trollMain(ONTO) + ((V_ONTO + V_HIT) / 2) * (CRASH - ONTO)
/** The catch siding's length past the blade, so that their front bumper meets the buffer on the note. */
export const SIDING_L = S_HIT + TROLL_CART.bump - X_F - BLADE_L

export function trollS(t: number): number {
  if (t <= ONTO) return trollMain(t)
  if (t <= CRASH) {
    const u = t - ONTO
    const a = (V_HIT - V_ONTO) / (CRASH - ONTO)
    return trollMain(ONTO) + V_ONTO * u + 0.5 * a * u * u
  }
  // Stopped dead against the buffer; a small recoil, settling.
  const d = t - CRASH
  return S_HIT - 0.09 * Math.sin(Math.min(1, d / 0.5) * Math.PI) * Math.exp(-d / 0.35)
}

/** The blade's angle: flat until his wheel knocks the lever, then lifted as the lever topples (faster and faster), up by ONTO. */
export function bladeAngle(t: number): number {
  if (t <= TRIP) return 0
  const u = clamp01((t - TRIP) / (ONTO - TRIP))
  return BLADE_UP * u * u
}
/**
 * The lever: standing, leaning back a little against its latch; his front wheel presses the latch's pedal, and the
 * weight at its head topples it backward (away from him, toward the trolls), faster and faster, landing on ONTO; a
 * small rebound.
 */
export function leverAngle(t: number): number {
  const up = -0.12
  const down = -Math.PI / 2 + 0.06
  if (t <= TRIP) return up
  const u = clamp01((t - TRIP) / (ONTO - TRIP))
  const a = up + (down - up) * u * u
  if (t <= ONTO) return a
  const d = t - ONTO
  return down + 0.12 * Math.abs(Math.sin(d * 14)) * Math.exp(-d / 0.12)
}
/** Where the lever stands: his front wheel knocks it on TRIP. */
export const LEVER_X = peerCartX(TRIP) + PEER_CART.wheelX + 0.04

/** A point `d` along the trolls' track (d is main-line x until the switch). */
export function trackPt(d: number): Pt {
  if (d <= X_F) return [d, RAIL]
  const b = Math.min(d - X_F, BLADE_L)
  const tip: Pt = [X_F + BLADE_L * Math.cos(BLADE_UP), RAIL - BLADE_L * Math.sin(BLADE_UP)]
  if (d <= X_F + BLADE_L) return [X_F + b * Math.cos(BLADE_UP), RAIL - b * Math.sin(BLADE_UP)]
  const s = Math.min(d - X_F - BLADE_L, SIDING_L + 0.4)
  return [tip[0] + s * Math.cos(SIDING_UP), tip[1] - s * Math.sin(SIDING_UP)]
}
export const BLADE_TIP: Pt = trackPt(X_F + BLADE_L)
export const SIDING_END: Pt = trackPt(X_F + BLADE_L + SIDING_L)

/** Their cart's pose: the middle between its wheels' feet on the rail, and its tilt. */
export function trollCart(t: number): { x: number; y: number; angle: number } {
  const s = trollS(t)
  const f = trackPt(s + TROLL_CART.wheelX)
  const r = trackPt(s - TROLL_CART.wheelX)
  return { x: (f[0] + r[0]) / 2, y: (f[1] + r[1]) / 2, angle: Math.atan2(f[1] - r[1], f[0] - r[0]) }
}
export const trollSpeed = (t: number): number => (t <= BRAKE ? 0 : t <= ONTO ? trollDrive.speed(t) : t <= CRASH ? V_ONTO + ((V_HIT - V_ONTO) * (t - ONTO)) / (CRASH - ONTO) : 0)

/* ------------------------------------------------------------------ the trolls */

export interface TrollAct {
  face: number
  eyes: number
  mouth: number
  arms: number
  slump: number
  /** Leaning (radians about its feet): forward is positive (toward +x). */
  lean: number
  /** Sliding forward in the bin (cells). */
  slide: number
}

const wave = (t: number, at: number, rise: number, fall: number): number => {
  const d = t - at
  if (d < 0) return d > -rise ? smooth01(1 + d / rise) : 0
  return Math.exp(-d / fall)
}

/** What each troll is doing: `lead` (front, the bigger) or the one behind. */
export function trollAct(t: number, lead: boolean): TrollAct {
  const i = lead ? 0 : 1
  // Asleep in their cart until the crash of his landing; awake with a start; heads turning to him on the notes.
  const wake = ease(t, LAND, LAND + 0.18)
  const turn = ease(t, at8(1 + i), at8(1 + i) + 0.22)
  let face = (lead ? 0.25 : -0.3) * (1 - turn) + (lead ? 0.95 : 0.8) * turn
  let eyes = 1.5 * wake
  let slump = 0.9 * (1 - ease(t, LAND, LAND + 0.35))
  let mouth = 0
  let arms = 0
  let lean = 0
  let slide = 0
  // "Slay him!": the shout as they roll, and at every lunge.
  mouth += 0.85 * wave(t, at8(5 + i), 0.12, 0.5)
  if (lead) {
    // The brake: an arm swung down on it.
    arms += 0.35 * wave(t, BRAKE, 0.15, 0.25)
    for (const l of LUNGES) {
      const w = wave(t, l, 0.22, 0.38)
      arms += 0.16 * w
      lean += 0.1 * w
      mouth += 0.7 * w
    }
    arms += 0.2 * ease(t, FIRST_CLACK, FIRST_CLACK + 0.6) * (1 - ease(t, ONTO, ONTO + 0.1))
  } else {
    // The one behind shakes both fists over its head on the beats.
    const fists = ease(t, at8(10), at8(10) + 0.4) * (1 - ease(t, ONTO - 0.1, ONTO + 0.05))
    arms += fists * (0.7 + 0.15 * Math.sin((t - at8(10)) * Math.PI * 2 / (at8(12) - at8(10))))
    for (const l of LUNGES) mouth += 0.55 * wave(t, l + 0.05, 0.2, 0.35)
  }
  // Up the siding: the surprise.
  const up = wave(t, ONTO, 0.05, 0.35) * (t < CRASH ? 1 : 0)
  eyes += 0.3 * up
  arms = arms * (1 - ease(t, ONTO, ONTO + 0.2)) + 0.9 * ease(t, ONTO, ONTO + 0.25) * (1 - ease(t, CRASH, CRASH + 0.25))
  mouth += 0.4 * up
  // The buffer: pitched forward, the lead folded over it, the other into its back; dazed; then heads up after him.
  if (t >= CRASH) {
    const d = t - CRASH
    const hit = 1 - Math.exp(-d / 0.07)
    const settle = lead ? 0.78 + 0.12 * Math.exp(-d / 0.3) * Math.cos(d * 9) : 0.34 + 0.1 * Math.exp(-d / 0.25) * Math.cos(d * 11)
    lean = hit * settle * (1 - 0.45 * ease(t, CRASH + 1.0, CRASH + 2.2))
    slide = hit * (lead ? 0.12 : 0.28)
    eyes = 0.1 + 1.1 * ease(t, CRASH + 0.7, CRASH + 1.1)
    slump = 0.7 * (1 - ease(t, CRASH + 0.8, CRASH + 1.4)) + 0.25
    arms = lead ? 0.55 * hit * (1 - ease(t, CRASH + 0.5, CRASH + 1.2)) : 0.2 * hit
    // Up, and after him with their noses; a last shout; then glum.
    face = lead ? 0.95 : 0.85
    mouth = (lead ? 0.9 : 0.6) * wave(t, SHOUT, 0.15, 0.45)
    arms += (lead ? 0.45 : 0.6) * wave(t, SHOUT, 0.2, 0.6)
  }
  // The coda: the bells. They look up; on the chords they cower.
  if (t >= CODA - 0.05) {
    const look = ease(t, CODA, CODA + 0.3)
    face = face * (1 - look)
    eyes = 1.5 * look + eyes * (1 - look)
    const pair = CODA_CHORDS.find((c) => c.t > CODA + 0.5)?.t ?? CODA + 0.9
    const cower = ease(t, pair, pair + 0.3)
    slump = slump * (1 - cower) + 0.75 * cower
    arms = arms * (1 - cower) + 0.95 * cower
    mouth = 0.3 * look * (1 - cower)
  }
  return { face, eyes: Math.min(1.5, eyes), mouth: Math.min(1, mouth), arms: Math.min(1, arms), slump: Math.min(1, slump), lean, slide }
}

/* ------------------------------------------------------------------ the tip */

/** The bin's pitch about its front hinge: flung up by the stop, resting on the block, falling back and rocking still. */
export function binTip(t: number): number {
  if (t < STOP) return 0
  const d = t - STOP
  const top = 0.95
  if (d < 0.26) return top * Math.sin((d / 0.26) * (Math.PI / 2))
  if (d < 0.75) return top
  const e = d - 0.75
  return top * Math.exp(-e / 0.18) * Math.cos(Math.min(e * 5.5, Math.PI / 2 + e * 8))
}

/** The bin's front hinge and its lip (the rim's front corner) at a tip angle. */
export function binLip(cx: number, a: number): Pt {
  const hx = cx + PEER_CART.bottomHalf
  const hy = RAIL - PEER_CART.bottom
  const rx = PEER_CART.rimHalf - PEER_CART.bottomHalf
  const ry = -(PEER_CART.rim - PEER_CART.bottom)
  return [hx + rx * Math.cos(a) - ry * Math.sin(a), hy + rx * Math.sin(a) + ry * Math.cos(a)]
}

/* ------------------------------------------------------------------ him */

const G = 12
/** Where he bounces off the tipped bin's lip. */
const BOUNCE_AT: Pt = (() => {
  const lip = binLip(CX_STOP, 0.95)
  return [lip[0] - 0.02, lip[1] - 0.13]
})()
const HOP1 = BOUNCE - STOP
const FALL = END - BOUNCE
/** Off the lip: up a little and down the shaft, easing over to its middle so the last of the fall is straight. */
const X_EASE = FALL - 0.32
const VY_OFF = (EXIT[1] - BOUNCE_AT[1] - 0.5 * G * FALL * FALL) / FALL

/** Where he is (the ball's centre), show time. The lane samples this; the carts are drawn from the same clocks. */
export function peerAt(t: number): Pt {
  if (t <= STOP) {
    const cx = peerCartX(t)
    // The landing: the ore gives under him, and he settles.
    const d = t - LAND
    const sink = d >= 0 ? 0.055 * (d / 0.05) * Math.exp(1 - d / 0.05) : 0
    return [cx, -HEAP_TOP + RAIL - 0.13 - hops(t) + sink]
  }
  if (t <= BOUNCE) {
    // Thrown off the heap as the cart stops dead: a small arc onto the lip of the pitching bin.
    const u = (t - STOP) / HOP1
    const x0 = CX_STOP
    const y0 = 0
    const lift = (G * HOP1 * HOP1) / 8
    return [x0 + (BOUNCE_AT[0] - x0) * u, y0 + (BOUNCE_AT[1] - y0) * u - lift * 4 * u * (1 - u)]
  }
  const d = t - BOUNCE
  const ux = Math.min(1, d / X_EASE)
  const x = EXIT[0] - (EXIT[0] - BOUNCE_AT[0]) * Math.pow(1 - ux, 1.6)
  const y = BOUNCE_AT[1] + VY_OFF * d + 0.5 * G * d * d
  if (t >= END) return EXIT
  return [x, y]
}

/** The moments his path turns sharply: the lane is cut exactly there. */
export const PEER_EVENTS: number[] = [LAND, ...CLACKS.map((c) => c.t), STOP, BOUNCE]

/* ------------------------------------------------------------------ the timbers and the torches */

/** The timber sets along the gallery (their posts' x), clear of the switch's siding and of the chimney. */
export const SETS: number[] = (() => {
  const out: number[] = []
  // The switch's ramp, its buffer and the spoil heaped behind it stand where a set would: none there.
  const zone: [number, number] = [X_F - 0.6, SIDING_END[0] + 1.35]
  let after = false
  for (let x = CLACKS[0].x; x < SHAFT[0] - 0.4; x += 2.35) {
    let at = x
    if (at > zone[0] && at < zone[1]) continue
    if (at >= zone[1] && !after) {
      after = true
      // A set just past the heap, so the gallery is not left bare there.
      if (at - zone[1] > 1.45) out.push(zone[1] + 0.15)
    }
    if (Math.abs(at - CHIMNEY_X) < 0.8) at = CHIMNEY_X - 0.85
    if (out.length && at - out[out.length - 1] < 1.3) continue
    out.push(at)
  }
  return out
})()

/** A torch on each set's post, and the clack whose spark lights it (the first as his front wheel comes to the post). */
export interface Torch {
  x: number
  y: number
  t: number
  seed: number
}
export const TORCH_Y = -0.62
export const TORCHES: Torch[] = (() => {
  const out: Torch[] = []
  SETS.forEach((x, i) => {
    // The loudest clack as his front wheel comes by the post: its spark catches the torch.
    const near = CLACKS.filter((k) => k.x >= x - 0.3 && k.x <= x + 0.55)
    const c = near.length ? near.reduce((a, b) => (b.s > a.s ? b : a)) : CLACKS.find((k) => k.x >= x)
    if (c) out.push({ x, y: TORCH_Y, t: c.t, seed: i + 3 })
  })
  // On the rock over the buffer: caught by the spark as his wheel trips the switch lever, so the switch is lit for the trolls.
  out.push({ x: SIDING_END[0] + 0.3, y: -1.5, t: TRIP, seed: 17 })
  // The last, on the end wall over the shaft: the stop block's sparks.
  out.push({ x: SHAFT[1] + 0.22, y: -0.9, t: STOP, seed: 19 })
  out.sort((a, b) => a.x - b.x)
  return out
})()

/** How lit torch `i` is at `t`: catching over a third of a second, a flare, then burning. */
export function torchLit(tr: Torch, t: number): number {
  const d = t - tr.t
  if (d < 0) return 0
  const fade = t > 147 ? Math.max(0, 1 - (t - 147) / 0.6) : 1
  return Math.min(1.25, smooth01(d / 0.3) * (1 + 0.25 * Math.exp(-d / 0.4))) * fade
}

/** The light from the hall above, down through the trapdoor: on as the floor opens over him, until the hall goes dark. */
export function beamLit(t: number): number {
  const on = ease(t, BEGIN - 0.95, BEGIN - 0.4)
  const low = 1 - 0.45 * ease(t, BEGIN + 2, BEGIN + 5)
  const out = t > 147 ? Math.max(0, 1 - (t - 147) / 0.5) : 1
  return on * low * out
}

/** How lit a point is (0..1): the trapdoor's light and every burning torch. What the timbers, the rock and the trolls are drawn in. */
export function lightAt(x: number, y: number, t: number): number {
  let l = 0
  const b = beamLit(t)
  if (b > 0) {
    const dx = Math.abs(x + 0.5)
    l += 0.55 * b * Math.max(0, 1 - dx / 1.6) * (y > -7 ? 1 : 0)
  }
  for (const tr of TORCHES) {
    const lit = torchLit(tr, t)
    if (lit <= 0) continue
    const d = Math.hypot(x - tr.x, (y - tr.y) * 1.1)
    if (d < 3.2) l += 0.85 * lit * Math.pow(1 - d / 3.2, 1.4)
  }
  return Math.min(1, l)
}

/* ------------------------------------------------------------------ strikes */

/** Every strike: the landing, the trolls' brake, every clack (each torch catches on one), the lever, the blade, the buffer, the stop, the bounce. */
export const MINE_STRIKES: number[] = [...new Set([LAND, BRAKE, ...CLACKS.map((c) => c.t), TRIP, ONTO, CRASH, STOP, BOUNCE].map((t) => Math.round(t * 1e4) / 1e4))].sort((a, b) => a - b)
