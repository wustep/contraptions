import type { Pt } from '../../../../parts'
import { hash } from './kit'
import { rgb } from './pen'

/**
 * The finale's pigeons (`finale.ts`): a loft on the building's roof, over the ward, and the boy who keeps it.
 *
 * Racing pigeons were the Lower East Side's own sport, kept in lofts on the tenement roofs and flown at dawn: the keeper
 * sends them up and keeps them up with a long pole, a rag tied to its end, and they wheel over the roofs together
 * until he lets them come down. Here they go up as the camera comes away from the glass, wheel round the building
 * the whole time the credits are up (out in front of it, low over the roof, and round behind it, where the building
 * hides them), and come home to the loft as the camera comes back in on the top floor.
 *
 * A bird is a small dark shape against the dawn, its wings its own beat; the flock breathes, long and short, as it
 * goes, and flaps and glides in waves along its length. As it banks at the ends of its wheel its birds turn their pale
 * undersides to the camera, and the flock goes from dark to pale and back as the turn runs through it. That is all the
 * light there is on them: no glint, nothing laid on. Every bird of a frame is drawn in a handful of fills.
 */

/* ------------------------------------------------------------------ the loft and its keeper */

/** The loft on the roof: its ends, and its floor (a little over the parapet, on legs). */
const LOFT_X0 = -16.4
const LOFT_X1 = -10.6
const LEGS = 0.4
const BODY = 2.0
/** The trap, at the front of the loft's top, where they go in and come out. */
const TRAP: Pt = [(LOFT_X0 + LOFT_X1) / 2 + 0.6, 0]
/** The keeper's feet, right of the loft. */
const KEEPER_X = -8.7

/** When he sends them up, when they are wheeling, and when he brings them down. */
const REL = 235.0
const HOME = 259.0
const WAVE_FROM = REL - 0.6
const WAVE_TO = HOME - 0.6

/* ------------------------------------------------------------------ the flock */

const N = 440
/** How far in front of the building (or behind it, negative) the wheel goes, in the depth `deep` uses in `finale.ts`. */
const NEAR = 9
const FAR = 10
/**
 * The wheel: round the building's middle and out past each end; seen from below, high in front and low behind, where
 * the roof hides the lowest of them; higher at its left end, by the water tank, and lowest at its right, by the sun.
 */
const X0 = -30
const RX = 34
const Y0 = -13
const RY = 3.2
const TILT = 2.2
/** Once round, in seconds. */
const LAP = 12.6

interface Bird {
  /** How far behind the flock's head it flies, 0 to 1; how high or low in it, and how near or far; -1 to 1. */
  lag: number
  up: number
  near: number
  hz: number
  ph: number
  size: number
  /** When it goes up, and when it lands. */
  go: number
  land: number
  /** Where it sits when it is not flying, on the loft or the parapet; null for those that go in. */
  perch: Pt | null
}

const gauss = (i: number, s: number): number => (hash(i, s, 1) + hash(i, s, 2) + hash(i, s, 3) - 1.5) / 1.5

/** Where the birds that stay out sit: along the loft's ridge, on the parapet either side of it. */
function perchOf(j: number, roof: number): Pt {
  if (j < 14) return [LOFT_X0 + 0.35 + j * ((LOFT_X1 - LOFT_X0 - 0.7) / 13), ridgeY(LOFT_X0 + 0.35 + j * ((LOFT_X1 - LOFT_X0 - 0.7) / 13), roof)]
  if (j < 24) return [LOFT_X0 - 0.6 - (j - 14) * 0.48, roof - 0.5]
  return [LOFT_X1 + 0.55 + (j - 24) * 0.46, roof - 0.5]
}
/** The loft's roof slopes down to the left. */
const ridgeY = (x: number, roof: number): number => roof - 0.5 - LEGS - BODY - 0.25 - 0.5 * ((x - LOFT_X0) / (LOFT_X1 - LOFT_X0))

let birds: Bird[] | null = null
function flock(roof: number): Bird[] {
  if (birds) return birds
  birds = Array.from({ length: N }, (_, i): Bird => {
    const out = i % 13 === 0 && i / 13 < 32
    return {
      lag: hash(i, 4, 61),
      up: gauss(i, 62),
      near: gauss(i, 63),
      hz: 3.1 + 1.5 * hash(i, 5, 61),
      ph: hash(i, 6, 61) * Math.PI * 2,
      size: 0.85 + 0.3 * hash(i, 7, 61),
      go: REL + 1.6 * Math.pow(hash(i, 8, 61), 1.3),
      // A few are still flying round the loft at the end.
      land: i % 5 === 2 ? HOME + 8.4 + 1.5 * hash(i, 9, 61) : HOME + 2.6 + 3.8 * hash(i, 9, 61),
      perch: out ? perchOf(i / 13, roof) : null,
    }
  })
  return birds
}

/** Where in its wheel the flock is as it goes up: off to the right, towards the sun. */
const PHASE = -0.35
/** How far down the building's face their first pass in front comes. */
const DIVE = 13
/**
 * The pass over the lit rooms, once the song is over: when it starts and how long it takes, how far down it comes and
 * how much nearer than the wheel (so the birds go big as they pass the lens), and how much it slows at its height
 * (radians a second), so it takes its time.
 */
const PASS = 249.0
const PASS_FOR = 9
const PASS_DIP = 20.5
const CLOSE = 2.4
const SLOW = 0.25
/** How far behind the plain wheel the slowing has left the flock by `t`. */
function slowed(t: number): number {
  const u = Math.max(0, Math.min(1, (t - PASS) / PASS_FOR))
  return (SLOW * PASS_FOR * (1 - Math.cos(Math.PI * u))) / Math.PI
}
const bump = (u: number): number => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u))

const smoother = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (6 * v - 15) + 10)
}

/** The wheel at angle `a`: x, y and how near (1 in front, -1 behind). */
const wheel = (a: number, rx: number): [number, number, number] => [X0 + rx * Math.cos(a), Y0 - RY * Math.sin(a) + TILT * Math.cos(a), Math.sin(a)]

/** Where bird `b` (index `i`) is at `t`, in the building's cells, and how near (-1 to 1); null while it sits or is in. */
function birdAt(b: Bird, i: number, t: number, roof: number): { x: number; y: number; z: number; bank: number; turn: number } | null {
  if (t < b.go || t > b.land) return null
  // The wheel goes round once a lap, its length breathing; each bird is a little behind the one ahead.
  const theta = ((t - REL) / LAP) * Math.PI * 2 + PHASE - slowed(t)
  // Coming near, it opens out.
  const open = 1 + bump((t - PASS) / PASS_FOR) + 0.6 * bump((t - 236.2) / 5.4)
  const long = (0.42 + 0.14 * Math.sin(t * 0.43 + 0.6)) * (0.6 + 0.4 * open)
  const tall = (1.7 + 0.6 * Math.sin(t * 0.37 + 2.1)) * (0.4 + 0.6 * open)
  const rx = RX + 3 * Math.sin(t * 0.21)
  const a = theta - b.lag * long
  let [x, y, z] = wheel(a, rx)
  // Their first time round in front they come down and sweep across the sleeping building's face, as the camera draws
  // back; once the rooms are all lit, down over them, close.
  y += Math.pow(Math.max(0, Math.sin(a)), 2) * (DIVE * bump((t - 236.4) / 5) + PASS_DIP * bump((t - PASS) / PASS_FOR))
  y += 1.6 * Math.sin(t * 0.29 + 0.8)
  // Its place in the flock, and a little of its own.
  const own = 0.22 * Math.sin(t * (0.9 + 0.5 * hash(i, 10, 61)) + i)
  // The flock folds and unfolds as it goes: a bend that runs back along it, and a ripple through it.
  y += b.up * tall + 1.1 * Math.sin(b.lag * 4.2 - t * 0.9) + 0.4 * Math.sin(b.lag * 9 - t * 2.1) + own
  x += 0.5 * Math.sin(t * (0.6 + 0.4 * hash(i, 11, 61)) + i * 1.3)
  z += b.near * 0.3
  // In front, the swoop comes nearer than the wheel, and the pass over the lit rooms nearer still: past the lens.
  if (z > 0) z *= 1 + 1.0 * bump((t - 236.2) / 5.4) + CLOSE * bump((t - PASS) / PASS_FOR)
  // Up from the loft into the wheel, and down to it again.
  const loft: Pt = [TRAP[0], roof - 0.5 - LEGS - BODY - 0.4]
  const into = smoother((t - REL - 0.6) / 3)
  if (into < 1) {
    const u = t - REL
    // Out of the trap they circle the loft first, low over the roof and round the keeper, wider each time round.
    const c = Math.PI + 2.1 * u - b.lag * 1.6
    const r = 2.2 + 1.6 * u
    const rise: [number, number, number] = [loft[0] + 1.5 + r * Math.cos(c), loft[1] + 0.6 - 1.2 * Math.sin(c) * (0.6 + 0.2 * u) + b.up * 0.5, 0.35 * Math.sin(c) + b.near * 0.12]
    x = rise[0] + (x - rise[0]) * into
    y = rise[1] + (y - rise[1]) * into
    z = rise[2] + (z - rise[2]) * into
  }
  const home = smoother((t - HOME) / 1.6)
  if (home > 0) {
    // Home: round from behind the building's left, low and close past the rooms, and up over the roof to the loft.
    const v = smoother((t - HOME) / 4.2)
    const ax = -27 + (loft[0] + 1 + 27) * v + b.lag * 5 * (1 - v)
    const ay = loft[1] - 1.2 + 8.5 * bump(Math.min(1, v * 1.2)) + b.up * 0.9 * (1 - v)
    const az = 1.1 * bump(Math.min(1, v * 1.1)) + b.near * 0.15
    x += (ax - x) * home
    y += (ay - y) * home
    z += (az - z) * home
  }
  // The last few circle the loft, close, before they come down.
  const late = smoother((t - (HOME + 3.4)) / 2)
  if (late > 0 && b.land > HOME + 8) {
    const c = (t - HOME) * 1.9 + b.lag * 2.4
    const lx = loft[0] + 3 + 9 * Math.cos(c) + b.near * 0.8
    const ly = loft[1] - 1.8 + 1.2 * Math.sin(c) + b.up * 0.6
    x += (lx - x) * late
    y += (ly - y) * late
    z += (0.45 * Math.sin(c) - 0.15 - z) * late
  }
  // Each from its sitting place, and to it at the end (or to the trap, and in).
  const seat: Pt = b.perch ?? [TRAP[0] + 0.3 * b.near, loft[1] + 0.25]
  const off = smoother((t - b.go) / 0.9)
  const on = smoother((t - (b.land - 1.15)) / 1.15)
  const w = Math.min(off, 1 - on)
  if (w < 1) {
    x = seat[0] + (x - seat[0]) * w
    y = seat[1] + (y - seat[1]) * w
    z = z * w
  }
  // Banking: where the wheel turns, at its ends, they tip, and show what is under their wings.
  // And a turn runs back through the flock now and then on its own, each bird tipping as it reaches it.
  const ripple = Math.max(0, Math.sin(b.lag * 6 - t * 2.6 + b.up * 0.8) - 0.55) / 0.45
  const bank = Math.max(Math.pow(Math.abs(Math.cos(a)), 3), ripple * (0.5 + 0.5 * Math.sin(t * 0.31))) * into * (1 - home)
  return { x, y, z, bank, turn: Math.sign(Math.cos(a)) * (Math.sin(a) >= 0 ? 1 : -1) }
}

/** Where the flock is across the city at `t` (for eyes that follow it), or the loft while they are home. */
export function flockX(t: number): number {
  const loft = TRAP[0]
  if (t < REL) return loft
  const [x] = wheel(((t - REL) / LAP) * Math.PI * 2 + PHASE - slowed(t) - 0.3, RX)
  const w = smoother((t - REL) / 3.4) * (1 - smoother((t - HOME) / 3.6))
  return loft + (x - loft) * w
}

/* ------------------------------------------------------------------ drawing */

const css = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}
/**
 * The birds' tones: dark against the dawn low down, the grey of their backs against the night still overhead, and their
 * undersides as they bank.
 */
const TONES = ['#2E2838', '#8A7C94', '#E0D2D4']
const TONE_A = [0.94, 0.95, 0.95]

export interface View {
  cx: number
  cy: number
  /** The frame's height, in cells: how far off the camera is. */
  H: number
}

/**
 * The flock at `t`: the birds behind the building's face (`side` 'back', drawn before it, so it hides them) or in front
 * of it. Each bird is laid at its depth as `finale.ts`'s `deep` would lay it, about the frame's middle.
 */
export function drawFlock(ctx: CanvasRenderingContext2D, k: number, v: View, t: number, roof: number, side: 'back' | 'front', face: [number, number] = [0, 0]): void {
  if (t < REL || t > HOME + 8) return
  const list = flock(roof)
  const paths = TONES.map(() => new Path2D())
  let any = false
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    const at = birdAt(b, i, t, roof)
    if (!at) continue
    if ((at.z >= 0) !== (side === 'front')) continue
    const e = at.z >= 0 ? -at.z * NEAR : -at.z * FAR
    if (v.H + e < 5) continue
    const s = v.H / (v.H + e)
    const x = v.cx + (at.x - v.cx) * s
    const y = v.cy + (at.y - v.cy) * s
    const hw = 0.37 * b.size * s
    // Flapping, in waves along the flock, and gliding between with the wings held up.
    const beat = 0.35 + 0.65 * Math.max(0, Math.min(1, (Math.sin(t * 0.7 - b.lag * 5) + 0.15) * 1.6))
    const flap = Math.sin(t * b.hz * Math.PI * 2 + b.ph)
    const up = hw * (0.18 * (1 - beat) + 0.5 * beat * flap)
    const roll = 0.45 * at.bank * at.turn * hw
    // How far down the sky it is (0 at the frame's top): the night overhead, the dawn lower.
    const low = (y - (v.cy - v.H / 2)) / v.H
    // Against the night, or the building's dark face, their backs are grey and their turned undersides pale; against
    // the bright sky low down they are dark, and only go grey as they turn.
    const dark = low < 0.24 || (side === 'front' && at.y > roof - 0.6 && at.x > face[0] && at.x < face[1])
    const tone = dark ? (at.bank > 0.55 ? 2 : 1) : at.bank > 0.55 ? 1 : 0
    const P = paths[tone]
    P.moveTo((x - hw) * k, (y - up + roll) * k)
    P.lineTo((x - 0.2 * hw) * k, (y - 0.13 * hw) * k)
    P.lineTo(x * k, (y - 0.22 * hw) * k)
    P.lineTo((x + 0.2 * hw) * k, (y - 0.13 * hw) * k)
    P.lineTo((x + hw) * k, (y - up - roll) * k)
    P.lineTo((x + 0.22 * hw) * k, (y + 0.1 * hw) * k)
    P.lineTo(x * k, (y + 0.34 * hw) * k)
    P.lineTo((x - 0.22 * hw) * k, (y + 0.1 * hw) * k)
    P.closePath()
    any = true
  }
  if (!any) return
  ctx.save()
  paths.forEach((P, j) => {
    ctx.fillStyle = css(TONES[j], TONE_A[j] * (side === 'back' ? 0.9 : 1))
    ctx.fill(P)
  })
  ctx.restore()
}

/** The loft, the birds sitting on it, and the keeper with his pole: drawn on the roof, after the building. */
export function drawLoft(ctx: CanvasRenderingContext2D, k: number, t: number, roof: number): void {
  const top = roof - 0.5
  const floor = top - LEGS
  const ceil = floor - BODY
  ctx.save()
  // Legs, the floor, the body with its three bays of wire, the lean-to roof, the trap.
  ctx.fillStyle = '#2A2228'
  for (const x of [LOFT_X0 + 0.2, (LOFT_X0 + LOFT_X1) / 2, LOFT_X1 - 0.4]) ctx.fillRect(x * k, floor * k, 0.18 * k, LEGS * k)
  ctx.fillStyle = '#4E4250'
  ctx.fillRect(LOFT_X0 * k, ceil * k, (LOFT_X1 - LOFT_X0) * k, BODY * k)
  ctx.fillStyle = '#2A2430'
  const bay = (LOFT_X1 - LOFT_X0 - 0.8) / 3
  for (let j = 0; j < 3; j++) ctx.fillRect((LOFT_X0 + 0.3 + j * (bay + 0.1)) * k, (ceil + 0.35) * k, bay * k, (BODY - 0.6) * k)
  ctx.strokeStyle = css('#6C5E6E', 0.7)
  ctx.lineWidth = Math.max(1, 0.035 * k)
  ctx.beginPath()
  for (let x = LOFT_X0 + 0.3; x < LOFT_X1 - 0.3; x += 0.28) {
    ctx.moveTo(x * k, (ceil + 0.35) * k)
    ctx.lineTo(x * k, (floor - 0.25) * k)
  }
  for (let y = ceil + 0.35; y < floor - 0.25; y += 0.28) {
    ctx.moveTo((LOFT_X0 + 0.3) * k, y * k)
    ctx.lineTo((LOFT_X1 - 0.3) * k, y * k)
  }
  ctx.stroke()
  ctx.fillStyle = '#3A3038'
  ctx.beginPath()
  ctx.moveTo((LOFT_X0 - 0.3) * k, (ridgeY(LOFT_X0, roof) + 0.35) * k)
  ctx.lineTo((LOFT_X1 + 0.3) * k, (ridgeY(LOFT_X1, roof) - 0.05) * k)
  ctx.lineTo((LOFT_X1 + 0.3) * k, (ridgeY(LOFT_X1, roof) + 0.3) * k)
  ctx.lineTo((LOFT_X0 - 0.3) * k, (ridgeY(LOFT_X0, roof) + 0.65) * k)
  ctx.closePath()
  ctx.fill()
  // The roof's top edge has the sky on it.
  ctx.strokeStyle = css('#9A8690', 0.8)
  ctx.lineWidth = Math.max(1, 0.06 * k)
  ctx.beginPath()
  ctx.moveTo((LOFT_X0 - 0.3) * k, (ridgeY(LOFT_X0, roof) + 0.35) * k)
  ctx.lineTo((LOFT_X1 + 0.3) * k, (ridgeY(LOFT_X1, roof) - 0.05) * k)
  ctx.stroke()
  // The trap: a box on the front of the roof with its bob wires.
  ctx.fillStyle = '#3E343E'
  ctx.fillRect((TRAP[0] - 0.55) * k, (ceil - 0.05) * k, 1.1 * k, 0.45 * k)
  ctx.fillStyle = '#1A1620'
  ctx.fillRect((TRAP[0] - 0.4) * k, (ceil + 0.05) * k, 0.8 * k, 0.3 * k)

  // The birds at rest: before he sends them up, and after they come home.
  const list = flock(roof)
  const sit = new Path2D()
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    if (!b.perch || (t >= b.go && t <= b.land)) continue
    const [x, y] = b.perch
    const face = hash(i, 12, 61) < 0.5 ? -1 : 1
    // A bob of the head now and then, and the settling of a bird just down.
    const settle = t > b.land ? Math.exp(-(t - b.land) / 0.5) * Math.sin((t - b.land) * 14) * 0.08 : 0
    const bob = Math.max(0, Math.sin(t * (1.1 + hash(i, 13, 61)) + i * 2.3) - 0.85) * 0.5
    sit.moveTo((x + 0.2) * k, (y - 0.13 + settle) * k)
    sit.ellipse(x * k, (y - 0.13 + settle) * k, 0.2 * k, 0.13 * k, 0, 0, Math.PI * 2)
    const hx = x + face * (0.17 + bob * 0.1)
    const hy = y - 0.3 + bob * 0.12 + settle
    sit.moveTo((hx + 0.08) * k, hy * k)
    sit.arc(hx * k, hy * k, 0.08 * k, 0, Math.PI * 2)
    sit.moveTo((x - face * 0.18) * k, (y - 0.15 + settle) * k)
    sit.lineTo((x - face * 0.38) * k, (y - 0.08 + settle) * k)
    sit.lineTo((x - face * 0.16) * k, (y - 0.05 + settle) * k)
  }
  ctx.fillStyle = css('#332C3C', 0.95)
  ctx.fill(sit)

  // The keeper: a boy in a cap, his pole up, waving it round in a long slow figure as they wheel, then down.
  const feet = top
  const x = KEEPER_X
  const waving = smoother((t - WAVE_FROM) / 0.8) * (1 - smoother((t - WAVE_TO) / 1.6))
  const u = t - WAVE_FROM
  const lean = -0.2 + waving * (0.62 * Math.sin(u * 2.3) + 0.1 * Math.sin(u * 4.6 + 0.5)) + (1 - waving) * 0.04 * Math.sin(t * 0.8)
  const hands: Pt = [x + 0.12, feet - 1.22 + 0.06 * waving * Math.sin(u * 4.6)]
  const dir: Pt = [Math.sin(lean), -Math.cos(lean)]
  const tip: Pt = [hands[0] + dir[0] * 5.6, hands[1] + dir[1] * 5.6]
  const butt: Pt = [hands[0] - dir[0] * 0.9, hands[1] - dir[1] * 0.9]
  ctx.fillStyle = '#211B26'
  // Legs, braced; the body; the head and cap.
  ctx.beginPath()
  ctx.moveTo((x - 0.28) * k, feet * k)
  ctx.lineTo((x - 0.1) * k, (feet - 0.85) * k)
  ctx.lineTo((x + 0.12) * k, (feet - 0.85) * k)
  ctx.lineTo((x + 0.3) * k, feet * k)
  ctx.lineTo((x + 0.16) * k, feet * k)
  ctx.lineTo(x * k, (feet - 0.55) * k)
  ctx.lineTo((x - 0.14) * k, feet * k)
  ctx.closePath()
  ctx.moveTo((x - 0.22) * k, (feet - 0.82) * k)
  ctx.lineTo((x + 0.24) * k, (feet - 0.82) * k)
  ctx.lineTo((x + 0.2) * k, (feet - 1.5) * k)
  ctx.lineTo((x - 0.2) * k, (feet - 1.5) * k)
  ctx.closePath()
  ctx.moveTo((x + 0.15) * k, (feet - 1.68) * k)
  ctx.arc(x * k, (feet - 1.68) * k, 0.15 * k, 0, Math.PI * 2)
  ctx.moveTo((x - 0.2) * k, (feet - 1.74) * k)
  ctx.lineTo((x + 0.3) * k, (feet - 1.74) * k)
  ctx.lineTo((x + 0.14) * k, (feet - 1.86) * k)
  ctx.lineTo((x - 0.16) * k, (feet - 1.84) * k)
  ctx.closePath()
  ctx.fill()
  // His arms up to the pole.
  ctx.strokeStyle = '#211B26'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1, 0.12 * k)
  ctx.beginPath()
  ctx.moveTo((x - 0.14) * k, (feet - 1.42) * k)
  ctx.lineTo((hands[0] - 0.05) * k, (hands[1] + 0.12) * k)
  ctx.moveTo((x + 0.14) * k, (feet - 1.42) * k)
  ctx.lineTo((hands[0] + dir[0] * 0.35) * k, (hands[1] + dir[1] * 0.35) * k)
  ctx.stroke()
  // The pole, bending a little as it goes, and the rag at its end.
  const bend = 0.25 * waving * Math.cos(u * 2.3)
  const mid: Pt = [(butt[0] + tip[0]) / 2 - dir[1] * bend, (butt[1] + tip[1]) / 2 + dir[0] * bend]
  ctx.strokeStyle = '#3A2E30'
  ctx.lineWidth = Math.max(1, 0.07 * k)
  ctx.beginPath()
  ctx.moveTo(butt[0] * k, butt[1] * k)
  ctx.quadraticCurveTo(mid[0] * k, mid[1] * k, tip[0] * k, tip[1] * k)
  ctx.stroke()
  // It streams out behind the pole's swing, and hangs when the pole is still.
  const swing = waving * Math.cos(u * 2.3)
  const fl = Math.sin(t * 9.5) * 0.12
  let rx = -swing * Math.cos(lean)
  let ry = -swing * Math.sin(lean) + 0.55
  const len = Math.hypot(rx, ry) || 1
  rx /= len
  ry /= len
  const nx = -ry
  const ny = rx
  ctx.fillStyle = '#7A2E30'
  ctx.beginPath()
  ctx.moveTo(tip[0] * k, tip[1] * k)
  ctx.quadraticCurveTo((tip[0] + rx * 0.5 + nx * fl) * k, (tip[1] + ry * 0.5 + ny * fl) * k, (tip[0] + rx * 1.0 + nx * fl * 1.6) * k, (tip[1] + ry * 1.0 + ny * fl * 1.6) * k)
  ctx.lineTo((tip[0] + rx * 0.85 + nx * (0.4 - fl)) * k, (tip[1] + ry * 0.85 + ny * (0.4 - fl)) * k)
  ctx.quadraticCurveTo((tip[0] + rx * 0.4 + nx * (0.45 + fl)) * k, (tip[1] + ry * 0.4 + ny * (0.45 + fl)) * k, (tip[0] + nx * 0.4) * k, (tip[1] + ny * 0.4) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
