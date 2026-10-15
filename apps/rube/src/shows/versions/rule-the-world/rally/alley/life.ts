import { R, type Pt } from '../../../../../parts'
import { bloom, flicker, layer, motes, pulse, shade, sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { BEAT } from '../music'
import { clamp01, ctxOf, ease, flash, glow, line, mix, rect, rgba, ring, shape, type Pen } from '../pen'
import { CAB } from '../cab'
import {
  CURB_KICK,
  EDGE,
  END_WALL,
  FAR,
  HEADPIN,
  LIFT_X,
  NEAR,
  SEAT,
  SIDEWALK,
  SKIP,
  STRIKE,
  T0,
  TABLE,
  TOP,
  TRACK,
  WALK,
  WALL,
  WAY,
} from './geo'

/**
 * The alley's depth and its life: what makes the room a place at one in the morning rather than a diagram of a hustle.
 * Everything here is a pure function of show time, and every layer is laid out against the master shot (the whole
 * table, the lanes below), where it lies exactly where it is drawn; elsewhere it drifts at its own depth.
 *
 * Far back (d 0.72), through the long opening in the back wall above the wainscot: the main floor of the alley, its
 * lanes running away to the right under their own tubes, its neon on the far wall (a martini glass, a pin and a ball, a
 * star, a crown), a teal jukebox cycling its lights, two regulars on the settee (one smokes, one drinks), and three late
 * bowlers who keep bowling: a ball down a lane, the pins going over, the rake sweeping the deadwood and the rack coming
 * down again, and now and then a strike and a pair of arms going up. All of it under a smoky haze, so it stays back.
 *
 * Overhead (d 0.86): ceiling fans turning in the smoke. Midground: the neon beer sign over the counter, the pin-and-ball
 * sign hung over the lanes (which flares and chases on the strike), the marquee bulbs round the masking board, glasses
 * of beer on the counter and the ledge with their bubbles rising, an ashtray's thread of smoke, dust turning in the
 * money table's lamp, and the smoke hanging in layers under the tubes. Under the floor, the work lights swing on their
 * cords and the return's lift wheel turns. Close (d 1.4), soft and dark at the frame's foot: a bar stool, a glass, an
 * ashtray, a rack of house balls; outside, a hydrant and a trash can.
 *
 * Outside: the street is wet. The alley's own blade sign hangs over the sidewalk in pink and red, and it, the windows
 * and the streetlamp run down the road in long broken reflections; steam comes up out of a manhole; a late car goes by
 * behind the cab, its lamps sweeping the wet and throwing up a puddle; and a puddle on the sidewalk rings where he rolls
 * through it.
 */

/* ------------------------------------------------------------------ the frame of the place */

/** The master shot's hold: every layer here lies where it is drawn when the camera is on it. */
export const ANCHOR: Pt = [5.85, -2.2]
/** The back wall's long opening onto the main floor: where the solid wall over the counter ends, its head, its sill. */
export const OPEN0 = 4.3
export const OPEN_TOP = -4.12
export const CAP = -2.06
/** The posts between its bays. */
export const POSTS = [7.6, 10.9, 14.2, 17.5, 20.8]

const FAR_D = 0.72
const FAN_D = 0.86
const NEAR_D = 1.4

/** The neon: cherry red (well off his orange), magenta, pink, teal, a warm white for foam and bulbs. */
export const NEON = {
  red: '#FF2E4C',
  magenta: '#FF3FA8',
  pink: '#FF8FD2',
  teal: '#38E6D2',
  cream: '#FFE9B8',
  white: '#FFF2F8',
}
const HAZE = '#45414F'
const SMOKE = '#C4BDCC'

/* ------------------------------------------------------------------ quick paint */

/*
 * Most of what is here is many small flat shapes in a few colours, every frame: they are painted straight onto the
 * canvas with their styles made once and kept, rather than through p5 (which parses the colour each time).
 */
const STYLE = new Map<string, string>()
/** A colour at an alpha as a canvas style, through the pen's tone (this place's pen does not tone), kept; alphas in 200ths. */
function css(pen: Pen, hex: string, a = 1): string {
  const q = Math.round(clamp01(a) * 200)
  const key = hex + q
  let st = STYLE.get(key)
  if (st === undefined) {
    st = rgba(pen, hex, q / 200)
    STYLE.set(key, st)
  }
  return st
}
const MIXED = new Map<string, string>()
/** `mix`, kept. */
function mixed(a: string, b: string, f: number): string {
  const key = a + b + f
  let m = MIXED.get(key)
  if (m === undefined) {
    m = mix(a, b, f)
    MIXED.set(key, m)
  }
  return m
}
/** A box, in cells. */
function box(pen: Pen, x0: number, y0: number, x1: number, y1: number, hex: string, a = 1): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.fillStyle = css(pen, hex, a)
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}
/** A closed polygon, in cells. */
function poly(pen: Pen, pts: Pt[], hex: string, a = 1): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.fillStyle = css(pen, hex, a)
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.fill()
}
/** A disc, in cells. */
function disc(pen: Pen, c: Pt, r: number, hex: string, a = 1): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.fillStyle = css(pen, hex, a)
  ctx.beginPath()
  ctx.arc(c[0] * k, c[1] * k, r * k, 0, Math.PI * 2)
  ctx.fill()
}
/** A straight stroke, `w` cells wide. */
function seg(pen: Pen, a: Pt, b: Pt, hex: string, w: number, al = 1): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.strokeStyle = css(pen, hex, al)
  ctx.lineWidth = Math.max(0.6, w * k)
  ctx.beginPath()
  ctx.moveTo(a[0] * k, a[1] * k)
  ctx.lineTo(b[0] * k, b[1] * k)
  ctx.stroke()
}

/* ------------------------------------------------------------------ neon tubes */

interface Tube {
  pts: Pt[]
  col: string
  closed?: boolean
  /** How lit, 0 to 1: under 0.1 the tube is dark glass. */
  on?: number
}

/** Points round an ellipse, from `a0` to `a1` (radians). */
function arc(c: Pt, rx: number, ry: number, a0 = 0, a1 = Math.PI * 2, n = 22): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry])
  }
  return out
}

/** A four-pointed star of tube. */
function star(c: Pt, r: number): Pt[] {
  const s = r * 0.28
  return [[c[0], c[1] - r], [c[0] + s, c[1] - s], [c[0] + r, c[1]], [c[0] + s, c[1] + s], [c[0], c[1] + r], [c[0] - s, c[1] + s], [c[0] - r, c[1]], [c[0] - s, c[1] - s]]
}

/** A bowling pin's outline, standing on `base`, `h` tall. */
function pinLine(base: Pt, h: number): Pt[] {
  const half: Pt[] = [[0.11, 0], [0.16, -0.2], [0.165, -0.34], [0.12, -0.55], [0.07, -0.68], [0.075, -0.8], [0.09, -0.9], [0.05, -0.98], [0, -1]]
  const right = half.map(([x, y]): Pt => [base[0] + x * h, base[1] + y * h])
  const left = half.slice(0, -1).reverse().map(([x, y]): Pt => [base[0] - x * h, base[1] + y * h])
  return [...right, ...left]
}

/**
 * Lit tubes: for each, a wide soft halo, the coloured glass, and a hot core nearly white, each pass over them all.
 * `w` is the core's width in cells.
 */
function tubes(pen: Pen, list: Tube[], w: number, a = 1): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const trace = (tb: Tube) => {
    ctx.beginPath()
    tb.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
    if (tb.closed) ctx.closePath()
    ctx.stroke()
  }
  for (const [lw, al, hot] of [[5.5, 0.11, 0], [2.3, 0.42, 0], [1, 0.95, 0.62]] as [number, number, number][]) {
    ctx.lineWidth = Math.max(0.6, w * lw * k)
    for (const tb of list) {
      const on = (tb.on ?? 1) * a
      if (on < 0.1) {
        // Out: the glass shows, dark.
        if (hot) {
          ctx.strokeStyle = css(pen, mixed(tb.col, '#000000', 0.62), 0.85)
          trace(tb)
        }
        continue
      }
      ctx.strokeStyle = css(pen, hot ? mixed(tb.col, '#FFFFFF', hot) : tb.col, al * on)
      trace(tb)
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the far floor (through the back wall) */

/** The far lanes, nearest first: their bands (layer cells), and the scale of what stands on them. */
const LANES: [number, number][] = [
  [-2.43, -2.26],
  [-2.6, -2.48],
  [-2.74, -2.65],
]
const LANE_S = [0.5, 0.45, 0.4]
const FOUL_F = 8.15
const DECK_F: [number, number] = [17.25, 18.35]
const WALL_FOOT = -3.04

interface FarThrow {
  at: number
  v: number
  /** Pins left standing: 0 a strike. */
  left: number
}
/** Each late bowler: his lane, where he waits, his look, and his balls (show times of release). Only one is bowling at first. */
const BOWLERS: { lane: number; home: number; coat: string; hat: boolean; ball: string; throws: FarThrow[] }[] = [
  {
    lane: 0,
    home: 6.45,
    coat: '#3B3F4A',
    hat: true,
    ball: '#1A1A22',
    throws: [
      { at: 123.0, v: 4.5, left: 3 },
      { at: 128.9, v: 4.7, left: 1 },
      { at: 133.95, v: 4.6, left: 0 },
    ],
  },
  {
    lane: 1,
    home: 6.6,
    coat: '#4A3426',
    hat: false,
    ball: '#5A1E2E',
    throws: [
      { at: 126.3, v: 4.8, left: 0 },
      { at: 132.2, v: 4.4, left: 2 },
    ],
  },
  { lane: 2, home: 6.8, coat: '#2E3B44', hat: true, ball: '#24505C', throws: [{ at: 129.9, v: 4.9, left: 0 }] },
]
const hitOf = (th: FarThrow) => th.at + (DECK_F[0] - FOUL_F) / th.v

/** A far figure, drawn as a silhouette in thick round strokes. */
interface Man {
  x: number
  y: number
  s: number
  face: 1 | -1
  coat: string
  hat?: boolean
  crouch?: number
  /** The trunk's lean forward, radians. */
  lean?: number
  /** The near arm and the far arm: radians from hanging, forward positive. */
  arm?: number
  arm2?: number
  /** A stride's phase, radians; none standing. */
  step?: number
  sit?: boolean
  /** A ball in the near hand. */
  ball?: string | null
}

function man(pen: Pen, m: Man): Pt {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const s = m.s
  const f = m.face
  const cr = (m.crouch ?? 0) * s
  const ln = m.lean ?? 0
  const hip: Pt = [m.x, m.y - (m.sit ? 0.95 : 1.45) * s + cr]
  const sh: Pt = [hip[0] + Math.sin(ln) * 1.02 * s * f, hip[1] - Math.cos(ln) * 1.02 * s]
  const head: Pt = [sh[0] + Math.sin(ln) * 0.4 * s * f, sh[1] - Math.cos(ln) * 0.4 * s]
  const coatDark = mixed(m.coat, '#000000', 0.35)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const stroke = (col: string, w: number, lines: Pt[][]) => {
    ctx.strokeStyle = css(pen, col)
    ctx.lineWidth = w * k
    ctx.beginPath()
    for (const l of lines) l.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
    ctx.stroke()
  }
  // Legs: seated, the thighs out and the shins down; standing or striding.
  if (m.sit) {
    const knee: Pt = [hip[0] + 0.55 * s * f, hip[1] + 0.02 * s]
    stroke('#141317', 0.22 * s, [[hip, knee, [knee[0] + 0.04 * s * f, m.y]]])
  } else {
    const ph = m.step
    const sw = ph === undefined ? 0 : Math.sin(ph)
    const footN: Pt = [m.x + (ph === undefined ? 0.1 : 0.34 * sw) * s * f, m.y - (ph === undefined ? 0 : Math.max(0, Math.cos(ph)) * 0.12 * s)]
    const footF: Pt = [m.x - (ph === undefined ? 0.06 : 0.34 * sw) * s * f, m.y - (ph === undefined ? 0 : Math.max(0, -Math.cos(ph)) * 0.12 * s)]
    const knee = (foot: Pt): Pt => [(hip[0] + foot[0]) / 2 + (0.07 * s + cr * 0.7) * f, (hip[1] + foot[1]) / 2]
    stroke('#141317', 0.22 * s, [[hip, knee(footF), footF], [hip, knee(footN), footN]])
  }
  const armPts = (a: number, from: Pt): Pt[] => {
    const el: Pt = [from[0] + Math.sin(a) * 0.55 * s * f, from[1] + Math.cos(a) * 0.55 * s]
    const hd: Pt = [el[0] + Math.sin(a + 0.3) * 0.5 * s * f, el[1] + Math.cos(a + 0.3) * 0.5 * s]
    return [from, el, hd]
  }
  stroke(coatDark, 0.15 * s, [armPts(m.arm2 ?? 0.15, [sh[0] - 0.08 * s * f, sh[1] + 0.06 * s])])
  stroke(m.coat, 0.52 * s, [[[hip[0], hip[1] - 0.05 * s], [sh[0], sh[1] + 0.12 * s]]])
  ctx.fillStyle = css(pen, '#B48468')
  ctx.beginPath()
  ctx.ellipse(head[0] * k, head[1] * k, 0.19 * s * k, 0.22 * s * k, 0, 0, Math.PI * 2)
  ctx.fill()
  if (m.hat) {
    ctx.fillStyle = css(pen, '#1B1816')
    ctx.beginPath()
    ctx.ellipse(head[0] * k, (head[1] - 0.13 * s) * k, 0.3 * s * k, 0.05 * s * k, 0, 0, Math.PI * 2)
    ctx.rect((head[0] - 0.16 * s) * k, (head[1] - 0.38 * s) * k, 0.32 * s * k, 0.26 * s * k)
    ctx.fill()
  }
  const near = armPts(m.arm ?? 0.1, [sh[0] + 0.04 * s * f, sh[1] + 0.08 * s])
  stroke(m.coat, 0.16 * s, [near])
  const hand = near[2]
  if (m.ball) {
    ctx.fillStyle = css(pen, m.ball, 1)
    ctx.beginPath()
    ctx.arc(hand[0] * k, hand[1] * k, 0.19 * s * k, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  return hand
}

/** What a late bowler is doing: waiting with his ball, the approach, the release, watching it go, his answer, the walk back. */
function bowlerPose(t: number, home: number, throws: FarThrow[]): Omit<Man, 'y' | 's' | 'coat' | 'ball'> & { ball: boolean } {
  let prev: FarThrow | null = null
  let next: FarThrow | null = null
  for (const th of throws) {
    if (th.at <= t) prev = th
    else if (!next) next = th
  }
  const idle = (x: number) => ({ x, face: 1 as const, crouch: 0, lean: 0.04 + 0.03 * sway(t, home, 5), arm: 1.15 + 0.06 * Math.sin(t * 1.3 + home), arm2: 0.95, ball: true })
  if (next && t >= next.at - 1.1) {
    // Four steps to the line, the push-away, the backswing, and down and through as he slides.
    const u = clamp01((t - (next.at - 1.1)) / 1.1)
    const x = home + (FOUL_F - 0.12 - home) * Math.min(1, u / 0.88)
    let arm: number
    if (u < 0.2) arm = 1.15 + 0.35 * ease(u / 0.2)
    else if (u < 0.65) arm = 1.5 - 3.8 * ease((u - 0.2) / 0.45)
    else arm = -2.3 + 2.45 * ease((u - 0.65) / 0.35)
    const low = ease((u - 0.5) / 0.5)
    return { x, face: 1, crouch: 0.35 * low, lean: 0.1 + 0.35 * low, arm, arm2: -0.4 - 0.9 * low, step: u * Math.PI * 4, ball: true }
  }
  if (!prev) return idle(home)
  const hit = hitOf(prev)
  const s = t - prev.at
  if (s < 0.75) {
    const u = s / 0.75
    return { x: FOUL_F - 0.12 + 0.06 * ease(u), face: 1, crouch: 0.35 - 0.12 * u, lean: 0.45 - 0.2 * u, arm: 0.15 + 2.2 * ease(Math.min(1, u * 2.5)), arm2: -1.3, ball: false }
  }
  if (t < hit + 0.15) {
    // Watching it go, leaning after it.
    const u = clamp01((s - 0.75) / 0.4)
    return { x: FOUL_F - 0.06, face: 1, crouch: 0.23 * (1 - u), lean: 0.25 - 0.12 * u + 0.08 * Math.sin(t * 2.4), arm: 2.35 * (1 - u) + 0.35 * u, arm2: -1.3 * (1 - u) + 0.2, ball: false }
  }
  if (t < hit + 1.0) {
    const u = (t - hit - 0.15) / 0.85
    if (prev.left === 0) {
      // A strike: both arms up, a hop.
      const up = ease(u * 3) * (1 - ease((u - 0.75) / 0.25))
      return { x: FOUL_F - 0.06, face: 1, crouch: -0.06 * Math.abs(Math.sin(u * 9)) * up, lean: -0.05, arm: 0.35 + 2.55 * up, arm2: 0.2 + 2.5 * up, ball: false }
    }
    // A hand to his head for the pins left standing.
    const up = ease(u * 3) * (1 - ease((u - 0.7) / 0.3))
    return { x: FOUL_F - 0.06, face: 1, crouch: 0, lean: 0.12 - 0.15 * up, arm: 0.35 + 2.3 * up, arm2: 0.2, ball: false }
  }
  if (t < hit + 2.8) {
    const u = (t - hit - 1.0) / 1.8
    const step = u * Math.PI * 6
    return { x: FOUL_F - 0.06 + (home - FOUL_F + 0.06) * u, face: -1, crouch: 0, lean: 0.05, arm: 0.3 * Math.sin(step), arm2: -0.3 * Math.sin(step), step, ball: false }
  }
  // Home: he bends for his next ball off the return, and holds it.
  const dip = clamp01(1 - Math.abs(t - hit - 3.05) / 0.25)
  return { ...idle(home), crouch: 0.28 * dip, lean: 0.04 + 0.4 * dip, ball: t > hit + 3.05 }
}

/** The far hall, drawn in its own (layer) cells. */
function hall(pen: Pen, t: number, g: Frame): void {
  const x0 = Math.max(g.x0 - 0.5, 3.4)
  const x1 = Math.min(g.x1 + 0.5, 20.5)
  if (x1 <= x0) return
  const ctx = ctxOf(pen.p)
  const k = pen.k
  // The far wall: dark panelling, and its own tubes under its ceiling.
  box(pen, x0, OPEN_TOP - 0.4, x1, WALL_FOOT, '#2A1A1D')
  ctx.fillStyle = css(pen, '#33211F')
  ctx.beginPath()
  for (let x = Math.floor(x0 / 1.6) * 1.6; x < x1; x += 1.6) ctx.rect((x + 0.07) * k, -3.92 * k, 1.46 * k, 0.7 * k)
  ctx.fill()
  box(pen, x0, -3.22, x1, WALL_FOOT, '#22141A')
  box(pen, x0, -3.25, x1, -3.21, '#4A2A22')
  ctx.fillStyle = css(pen, '#F2FBF4')
  ctx.beginPath()
  for (let x = 5.2; x < 20; x += 3.6) if (x + 1.2 > x0 && x < x1) ctx.rect(x * k, -4.08 * k, 1.2 * k, 0.05 * k)
  ctx.fill()
  glow(pen, [(x0 + x1) / 2, -3.95], (x1 - x0) * 0.6, '#C8F0D4', 0.1)
  // Its neon: a martini glass, a pin and its ball, a star, a crown. Each hums a little; the pin's ball stutters now and then.
  const hum = (seed: number) => flicker(t, seed, 0.12)
  const stutter = (seed: number) => (hash(Math.floor(t * 7), seed, 9) < 0.035 ? 0.05 : 1)
  const signs: Tube[] = []
  // A cocktail glass: in teal behind the money table (nothing warm behind his flight), in magenta over the far lanes.
  for (const [gx, col, seed] of [[5.6, NEON.teal, 1], [14.6, NEON.magenta, 5]] as [number, string, number][]) {
    if (x0 > gx + 0.8 || x1 < gx - 0.8) continue
    const c: Pt = [gx, -3.62]
    signs.push({ pts: [[c[0] - 0.28, c[1] - 0.2], [c[0] + 0.28, c[1] - 0.2], [c[0], c[1] + 0.08], [c[0] - 0.28, c[1] - 0.2]], col, on: hum(seed) })
    signs.push({ pts: [[c[0], c[1] + 0.08], [c[0], c[1] + 0.3], [c[0] - 0.14, c[1] + 0.32], [c[0] + 0.14, c[1] + 0.32]], col, on: hum(seed) })
    signs.push({ pts: arc([c[0] + 0.08, c[1] - 0.11], 0.04, 0.04, 0, Math.PI * 2, 8), col: '#B6FF7A', on: hum(seed + 1) })
  }
  if (x0 < 11 && x1 > 9.4) {
    const c: Pt = [10.2, -3.3]
    signs.push({ pts: pinLine(c, 0.62), col: NEON.white, closed: true, on: hum(3) })
    signs.push({ pts: arc([c[0] + 0.34, c[1] - 0.14], 0.14, 0.14), col: NEON.red, on: hum(4) * stutter(4) })
  }
  if (x0 < 19.6 && x1 > 18.2) {
    const c: Pt = [18.9, -3.55]
    signs.push({ pts: [[c[0] - 0.3, c[1] + 0.16], [c[0] - 0.34, c[1] - 0.14], [c[0] - 0.15, c[1] + 0.02], [c[0], c[1] - 0.22], [c[0] + 0.15, c[1] + 0.02], [c[0] + 0.34, c[1] - 0.14], [c[0] + 0.3, c[1] + 0.16]], col: NEON.pink, closed: true, on: hum(6) })
  }
  if (signs.length) tubes(pen, signs, 0.03)
  if (x0 < 6.6 && x1 > 4.6) glow(pen, [5.6, -3.6], 0.9, NEON.teal, 0.14)
  if (x0 < 11.2 && x1 > 9.2) glow(pen, [10.3, -3.6], 0.9, NEON.red, 0.16)
  if (x0 < 15.6 && x1 > 13.6) glow(pen, [14.6, -3.6], 0.9, NEON.magenta, 0.2)

  // The jukebox against the far wall, its tubes cycling a colour a beat.
  if (x0 < 12.8 && x1 > 11.6) jukebox(pen, t, JUKE)

  // The masking units over the far decks, and the light under them on the pins.
  if (x1 > DECK_F[0] - 0.4) {
    box(pen, DECK_F[0] - 0.35, -3.4, DECK_F[1] + 0.35, -2.8, '#2E1B14')
    box(pen, DECK_F[0] - 0.3, -3.34, DECK_F[1] + 0.3, -2.86, '#3E2618')
    box(pen, DECK_F[0] - 0.35, -2.8, DECK_F[1] + 0.35, -2.77, '#F2FBF4')
    glow(pen, [(DECK_F[0] + DECK_F[1]) / 2, -2.5], 1.1, '#E8F6EC', 0.2)
  }
  // The floor: the concourse's carpet, the approach's maple, the lanes and their gutters, the decks.
  box(pen, x0, WALL_FOOT, x1, CAP + 0.1, '#36101D')
  if (x0 < FOUL_F) box(pen, Math.max(x0, 6.2), LANES[2][0] - 0.02, Math.min(x1, FOUL_F), CAP + 0.1, '#9C7646')
  const lx0 = Math.max(x0, FOUL_F)
  const lx1 = Math.min(x1, DECK_F[1])
  if (lx1 > lx0) {
    const bands = (hex: string, ys: [number, number][], from = lx0) => {
      ctx.fillStyle = css(pen, hex)
      ctx.beginPath()
      for (const [a, b] of ys) ctx.rect(from * k, a * k, (lx1 - from) * k, (b - a) * k)
      ctx.fill()
    }
    bands('#B07B42', LANES)
    bands('#D9AE78', LANES.map(([a]): [number, number] => [a, a + 0.025]))
    bands('#1A0F0D', [[-2.65, -2.6], [-2.48, -2.43], [-2.26, -2.2]])
    if (x1 > DECK_F[0]) bands('#D2A66E', LANES, Math.max(lx0, DECK_F[0]))
  }
  // The settee behind the approach, and two regulars on it: one smokes, one drinks.
  if (x0 < 6.2 && x1 > 4.4) {
    box(pen, 4.55, -3.32, 6.05, -2.98, '#24343A')
    box(pen, 4.55, -2.98, 6.05, -2.9, '#162226')
    const smoker = man(pen, { x: 4.95, y: -2.8, s: 0.42, face: 1, coat: '#3A3430', hat: true, sit: true, lean: -0.1, arm: drag(t, 2.1, 7.5) * 2.6 + 0.4, arm2: 0.4 })
    const drinker = man(pen, { x: 5.7, y: -2.8, s: 0.42, face: -1, coat: '#26323A', sit: true, lean: -0.06 + 0.04 * sway(t, 3, 6), arm: drag(t, 5.3, 9) * 2.5 + 0.5, arm2: 0.3 })
    box(pen, drinker[0] - 0.03, drinker[1] - 0.1, drinker[0] + 0.03, drinker[1], '#DDB24E')
    disc(pen, smoker, 0.025, '#FF9A70', 0.6 + 0.4 * drag(t, 2.1, 7.5))
    curl(pen, t, smoker, 0.75, 2, SMOKE, 0.22, 0.12)
  }
  // The late bowlers, the far lanes back to front, each with his ball going down and his pins.
  for (let i = BOWLERS.length - 1; i >= 0; i--) {
    const b = BOWLERS[i]
    const [a, bb] = LANES[b.lane]
    const ly = (a + bb) / 2
    const s = LANE_S[b.lane]
    if (x1 > DECK_F[0] - 0.4) farPins(pen, t, b.lane, b.throws)
    for (const th of b.throws) {
      const hit = hitOf(th)
      if (t < th.at || t > hit) continue
      const bx = FOUL_F + th.v * (t - th.at)
      const r = 0.19 * s
      disc(pen, [bx, ly - r], r, b.ball)
      disc(pen, [bx - r * 0.35, ly - r * 1.4], r * 0.3, '#FFFFFF', 0.35)
    }
    const ps = bowlerPose(t, b.home, b.throws)
    if (ps.x < x0 - 1 || ps.x > x1 + 1) continue
    man(pen, { ...ps, y: ly + 0.02, s, coat: b.coat, hat: b.hat, ball: ps.ball ? b.ball : null })
  }
}

/** 0 to 1 and back: a hand going up to the lips every `every` seconds, from a phase `seed`, for a second and a bit. */
function drag(t: number, seed: number, every: number): number {
  const u = (((t + seed) % every) + every) % every
  return u < 1.3 ? Math.sin((u / 1.3) * Math.PI) : 0
}

const JUKE: Pt = [12.2, WALL_FOOT + 0.1]
const JUKE_ARCH = arc([JUKE[0], JUKE[1] - 0.98 + 0.31], 0.31, 0.31, Math.PI, Math.PI * 2, 14)
const JUKE_TUBES = Array.from({ length: 6 }, (_, i) => {
  const a0 = Math.PI + (i * Math.PI) / 6
  return arc([JUKE[0], JUKE[1] - 0.98 + 0.31], 0.27, 0.27, a0, a0 + Math.PI / 6 - 0.04, 3)
})

function jukebox(pen: Pen, t: number, base: Pt): void {
  const [x, y] = base
  const w = 0.62
  const h = 0.98
  glow(pen, [x, y - h * 0.55], 1.2, NEON.teal, 0.26 + 0.1 * pulse(t, 0.3))
  // The cabinet: a teal body, an arched top, the grille, the window of records.
  box(pen, x - w / 2, y - h + w / 2, x + w / 2, y, '#0F4A4A')
  poly(pen, JUKE_ARCH, '#0F4A4A')
  box(pen, x - w * 0.32, y - h * 0.42, x + w * 0.32, y - h * 0.08, '#0B1E22')
  for (let i = 1; i < 6; i++) box(pen, x - w * 0.32 + (i * w * 0.64) / 6 - 0.006, y - h * 0.42, x - w * 0.32 + (i * w * 0.64) / 6 + 0.006, y - h * 0.08, '#2A4E50')
  box(pen, x - w * 0.22, y - h * 0.68, x + w * 0.22, y - h * 0.5, '#F4E6C4')
  // The bubble tubes round the arch, six lengths each side, their colours walking on the beat.
  const cols = [NEON.magenta, NEON.cream, NEON.teal, NEON.red]
  const step = Math.floor((t - T0) / BEAT)
  const list: Tube[] = []
  const beat = 0.75 + 0.25 * pulse(t, 0.25)
  for (let i = 0; i < 6; i++) list.push({ pts: JUKE_TUBES[i], col: cols[(i + step) % 4], on: beat })
  list.push({ pts: [[x - w / 2 + 0.04, y - h + w / 2], [x - w / 2 + 0.04, y - 0.06]], col: cols[(step + 1) % 4] })
  list.push({ pts: [[x + w / 2 - 0.04, y - h + w / 2], [x + w / 2 - 0.04, y - 0.06]], col: cols[(step + 3) % 4] })
  tubes(pen, list, 0.022)
}

/** A far lane's ten pins: standing, flying off on a hit, lying till the rake sweeps them, and the rack coming down again. */
function farPins(pen: Pen, t: number, lane: number, throws: FarThrow[]): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const [a, b] = LANES[lane]
  const sc = LANE_S[lane] * 2
  const ph = 0.15 * sc
  const pw = 0.045 * sc
  let last: FarThrow | null = null
  for (const th of throws) if (hitOf(th) <= t) last = th
  const s = last ? t - hitOf(last) : Infinity
  // The rake sweeps from the deck's front back into the pit, taking the deadwood with it.
  const rakeX = DECK_F[0] - 0.05 + (DECK_F[1] + 0.2 - DECK_F[0]) * ease((s - 0.95) / 0.5)
  const reset = s >= 1.9
  const drop = reset ? 0.3 * (1 - ease((s - 1.9) / 0.4)) : 0
  const up: Pt[] = []
  const down: [Pt, number][] = []
  for (let i = 0; i < 10; i++) {
    const row = i === 0 ? 0 : i < 3 ? 1 : i < 6 ? 2 : 3
    const first = [0, 1, 3, 6][row]
    const j = i - first
    const home: Pt = [DECK_F[0] + 0.1 + row * 0.17, (a + b) / 2 + 0.02 + (j - row / 2) * (b - a) * 0.3]
    // Which go over: a strike all of them; else all but the last few of the back row.
    const knocked = last && !reset && (last.left === 0 || i < 10 - last.left)
    if (!knocked) {
      up.push([home[0], home[1] - drop])
      continue
    }
    const u = clamp01(s / 0.35)
    const fx = home[0] + (0.25 + 0.45 * hash(i, lane, 31)) * u
    const fy = home[1] - 0.22 * Math.sin(Math.PI * u) * hash(i, lane, 32)
    if ((s > 0.95 && fx < rakeX) || s > 1.45) continue
    down.push([[fx, fy], u * (hash(i, lane, 33) > 0.5 ? 1.5 : -1.5)])
  }
  ctx.save()
  ctx.fillStyle = css(pen, '#EEE8DC', reset ? 1 - drop * 2 : 1)
  ctx.beginPath()
  for (const [x, y] of up) {
    ctx.rect((x - pw / 2) * k, (y - ph) * k, pw * k, ph * k)
    ctx.moveTo((x + pw * 0.4) * k, (y - ph) * k)
    ctx.arc(x * k, (y - ph) * k, pw * 0.4 * k, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.fillStyle = css(pen, '#C9C0B0', 1)
  for (const [[x, y], rot] of down) {
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.rotate(rot)
    ctx.fillRect((-pw / 2) * k, -ph * k, pw * k, ph * k)
    ctx.restore()
  }
  ctx.restore()
  // The rake: a dark bar dropped in front of the deck, swept back to the pit, lifted.
  if (s > 0.8 && s < 1.6) {
    const dropIn = ease((s - 0.8) / 0.15) * (1 - ease((s - 1.45) / 0.15))
    const top = -2.8 + lane * 0.02
    rect(pen, rakeX - 0.035, top, rakeX + 0.035, top + (b + 0.02 - top) * dropIn, '#141012')
  }
}

/**
 * The main floor beyond the back wall, seen through its long opening (clipped to it), and the smoke between: drawn at
 * depth 0.72, with a haze laid over it so that it stays well back of the money table.
 */
export function farHall(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < OPEN0 || f.x0 > END_WALL || f.y0 > CAP || f.y1 < OPEN_TOP) return
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const x0 = Math.max(OPEN0, f.x0 - 0.1)
  const x1 = Math.min(END_WALL, f.x1 + 0.1)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, OPEN_TOP * k, (x1 - x0) * k, (CAP - OPEN_TOP) * k)
  ctx.clip()
  // Across only: the far floor keeps its height behind the sill, wherever the camera is up or down.
  layer(pen, f, FAR_D, (g) => hall(pen, t, g), [ANCHOR[0], f.cy])
  // The haze: thicker under the ceiling, where the smoke hangs, and growing as the night goes on.
  const thick = 0.85 + 0.25 * smooth(t, T0, STRIKE)
  const g = ctx.createLinearGradient(0, OPEN_TOP * k, 0, CAP * k)
  g.addColorStop(0, css(pen, HAZE, 0.62 * thick))
  g.addColorStop(0.45, css(pen, HAZE, 0.36 * thick))
  g.addColorStop(1, css(pen, HAZE, 0.24 * thick))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, OPEN_TOP * k, (x1 - x0) * k, (CAP - OPEN_TOP) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the room's own neon, and its wall */

/** One fluorescent tube over the lanes is going: now and then it stutters. 1 lit, under it out. */
export function tubeOn(i: number, t: number): number {
  if (i !== 5) return 1
  for (const st of [124.62, 130.24, 133.12]) {
    const s = t - st
    if (s < 0 || s > 0.26) continue
    if (s < 0.05) return 0.12
    if (s < 0.09) return 0.85
    if (s < 0.19) return 0.08
    return 0.6 + 2 * (s - 0.19)
  }
  return 1
}

const BAR_SIGN: Pt = [0.2, -3.62]
/** The beer sign over the back bar: a red ring, a frothing glass in magenta with a handle, two pink sparkles. */
const BAR_TUBES = (() => {
  const [x, y] = BAR_SIGN
  return {
    ring: arc([x, y], 0.72, 0.3, 0, Math.PI * 2, 30),
    mug: [[x - 0.17, y - 0.12], [x - 0.14, y + 0.2], [x + 0.12, y + 0.2], [x + 0.15, y - 0.12]] as Pt[],
    handle: arc([x + 0.16, y + 0.03], 0.1, 0.09, -Math.PI / 2, Math.PI / 2, 8),
    foam: [[x - 0.2, y - 0.12], ...arc([x - 0.12, y - 0.14], 0.08, 0.06, Math.PI, Math.PI * 2, 5), ...arc([x + 0.03, y - 0.15], 0.08, 0.07, Math.PI, Math.PI * 2, 5), ...arc([x + 0.15, y - 0.13], 0.05, 0.04, Math.PI, Math.PI * 2, 4)] as Pt[],
    l: star([x - 0.48, y], 0.1),
    r: star([x + 0.5, y + 0.02], 0.08),
  }
})()

/** The neon beer sign over the back bar, and its spill on the wall. Its handle's tube is the one that stutters. */
export function barSign(pen: Pen, t: number): void {
  const [x, y] = BAR_SIGN
  const hum = flicker(t, 11, 0.1)
  const stut = hash(Math.floor(t * 6), 12, 7) < 0.04 ? 0.05 : 1
  box(pen, x - 0.82, y - 0.38, x + 0.82, y + 0.38, '#1A1013')
  glow(pen, [x, y], 1.9, NEON.red, 0.22 * hum)
  tubes(pen, [
    { pts: BAR_TUBES.ring, col: NEON.red, closed: true, on: hum },
    { pts: BAR_TUBES.mug, col: NEON.magenta, on: hum },
    { pts: BAR_TUBES.handle, col: NEON.magenta, on: hum * stut },
    { pts: BAR_TUBES.foam, col: NEON.white, on: hum },
    { pts: BAR_TUBES.l, col: NEON.pink, closed: true, on: hum * (0.7 + 0.3 * Math.sin(t * 3.1)) },
    { pts: BAR_TUBES.r, col: NEON.pink, closed: true, on: hum * (0.7 + 0.3 * Math.sin(t * 3.1 + 2)) },
  ], 0.028)
}

const LANE_SIGN: Pt = [15.85, -3.55]
const LANE_TUBES = (() => {
  const [x, y] = LANE_SIGN
  return {
    border: [[x - 0.95, y - 0.42], [x + 0.95, y - 0.42], [x + 0.95, y + 0.42], [x - 0.95, y + 0.42]] as Pt[],
    pinA: pinLine([x - 0.42, y + 0.32], 0.6),
    pinB: pinLine([x - 0.12, y + 0.3], 0.56),
    ball: arc([x + 0.42, y + 0.06], 0.24, 0.24, 0, Math.PI * 2, 18),
    holes: [arc([x + 0.36, y - 0.04], 0.03, 0.03, 0, Math.PI * 2, 6), arc([x + 0.47, y - 0.06], 0.03, 0.03, 0, Math.PI * 2, 6), arc([x + 0.42, y + 0.06], 0.03, 0.03, 0, Math.PI * 2, 6)],
  }
})()

/**
 * The pin-and-ball sign hung on chains in the opening over the lanes. On the strike it flares, and its border chases;
 * its colours lie on the polished lanes under it in long smears.
 */
export function laneSign(pen: Pen, t: number): void {
  const [x, y] = LANE_SIGN
  const swingA = 0.012 * sway(t, 7, 3.3)
  const hit = flash(t - STRIKE, 0.35)
  const hum = flicker(t, 21, 0.1) * (1 + 0.6 * hit)
  seg(pen, [x - 0.8, OPEN_TOP], [x - 0.8 + swingA, y - 0.45], '#2A2420', 0.018)
  seg(pen, [x + 0.8, OPEN_TOP], [x + 0.8 + swingA, y - 0.45], '#2A2420', 0.018)
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.translate(swingA * pen.k, 0)
  box(pen, x - 1.02, y - 0.48, x + 1.02, y + 0.48, '#1A1114')
  glow(pen, [x, y], 2.0, NEON.magenta, 0.16 * hum)
  if (hit > 0.02) bloom(pen, [x, y], 1.8, NEON.pink, 0.35 * hit)
  // The border chases on the strike: a gap running round it.
  const chase = t > STRIKE && t < STRIKE + 2.2
  const border: Tube[] = []
  if (chase) {
    const n = 16
    const pts = LANE_TUBES.border
    const go = Math.floor((t - STRIKE) * 18)
    for (let i = 0; i < n; i++) {
      const u0 = i / n
      const u1 = (i + 0.8) / n
      const along = (u: number): Pt => {
        const per = u * 4
        const e = Math.floor(per) % 4
        const v = per - Math.floor(per)
        const p0 = pts[e]
        const p1 = pts[(e + 1) % 4]
        return [p0[0] + (p1[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * v]
      }
      border.push({ pts: [along(u0), along(u1)], col: NEON.red, on: (i + go) % 4 === 0 ? 0.08 : hum })
    }
  } else border.push({ pts: LANE_TUBES.border, col: NEON.red, closed: true, on: hum })
  tubes(pen, [
    ...border,
    { pts: LANE_TUBES.pinA, col: NEON.white, closed: true, on: hum },
    { pts: LANE_TUBES.pinB, col: NEON.white, closed: true, on: hum },
    { pts: LANE_TUBES.ball, col: NEON.teal, closed: true, on: hum },
    ...LANE_TUBES.holes.map((h): Tube => ({ pts: h, col: NEON.teal, closed: true, on: hum })),
  ], 0.032)
  ctx.restore()
}

/** The lane sign's colours lying on the polished lanes under it, broken by the boards. */
export function laneSheen(pen: Pen, t: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const hum = flicker(t, 21, 0.1) * (1 + 0.6 * flash(t - STRIKE, 0.35))
  ctx.save()
  for (const [a, b] of [FAR, NEAR]) {
    for (const [dx, col, w] of [[-0.3, NEON.pink, 0.9], [0.42, NEON.teal, 0.5]] as [number, string, number][]) {
      const cx = LANE_SIGN[0] + dx
      const g = ctx.createLinearGradient((cx - w) * k, 0, (cx + w) * k, 0)
      g.addColorStop(0, css(pen, col, 0))
      g.addColorStop(0.5, css(pen, col, 0.22 * hum))
      g.addColorStop(1, css(pen, col, 0))
      ctx.fillStyle = g
      ctx.fillRect((cx - w) * k, (a + 0.02) * k, 2 * w * k, (b - a - 0.06) * 0.55 * k)
    }
  }
  ctx.restore()
}

/** The marquee bulbs round the masking board: dim, or on the strike running round it. */
export function marquee(pen: Pen, t: number, x0: number, y0: number, x1: number, y1: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const per = 2 * (x1 - x0 + y1 - y0)
  const n = Math.floor(per / 0.2)
  const s = t - STRIKE
  const live = s >= 0 && s < 2.6
  const go = live ? Math.floor(s * 16) : Math.floor(t * 1.5)
  const at = (u: number): Pt => {
    let d = u * per
    const w = x1 - x0
    const h = y1 - y0
    if (d < w) return [x0 + d, y0]
    d -= w
    if (d < h) return [x1, y0 + d]
    d -= h
    if (d < w) return [x1 - d, y1]
    d -= w
    return [x0, y1 - d]
  }
  const lit: Pt[] = []
  const dim: Pt[] = []
  for (let i = 0; i < n; i++) ((i + go) % (live ? 3 : 2) === 0 ? lit : dim).push(at(i / n))
  ctx.save()
  ctx.fillStyle = css(pen, '#6A4A2A', 1)
  ctx.beginPath()
  for (const [x, y] of dim) {
    ctx.moveTo((x + 0.035) * k, y * k)
    ctx.arc(x * k, y * k, 0.035 * k, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.fillStyle = css(pen, NEON.cream, live ? 1 : 0.75)
  ctx.beginPath()
  for (const [x, y] of lit) {
    ctx.moveTo((x + 0.04) * k, y * k)
    ctx.arc(x * k, y * k, 0.04 * k, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
  if (live) glow(pen, [(x0 + x1) / 2, (y0 + y1) / 2], 1.8, NEON.cream, 0.3 * flash(s, 0.6))
}

/** The clock's second hand, ticking each second, with a little shiver on the tick. */
export function secondHand(pen: Pen, t: number, c: Pt): void {
  const sec = Math.floor(t)
  const u = t - sec
  const a = ((((sec % 60) + Math.min(1, u / 0.06) + 0.05 * ring(u - 0.06, 7, 0.05)) / 60) * Math.PI * 2) + 2.1
  const d: Pt = [Math.sin(a), -Math.cos(a)]
  line(pen, [c[0] - d[0] * 0.05, c[1] - d[1] * 0.05], [c[0] + d[0] * 0.21, c[1] + d[1] * 0.21], '#B5262A', 0.45)
}

/* ------------------------------------------------------------------ overhead */

/** The ceiling fans, hung further back than the tubes, turning slowly in the smoke, their blades lit from under. */
export function fans(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > -4.5) return
  layer(pen, f, FAN_D, (g) => {
    const dx = f.cx - g.cx
    for (const [i, fx] of [1.4, 7.0, 12.6, 18.2].entries()) {
      const wx = fx + dx
      if (wx < WALL[1] + 1.0 || wx > END_WALL - 1.0 || fx < g.x0 - 1.2 || fx > g.x1 + 1.2) continue
      const hub: Pt = [fx, -4.9]
      seg(pen, [fx, -5.45], hub, '#141110', 0.035)
      const th = t * Math.PI * 2 * 0.75 + i * 1.3
      const L = 0.95
      const blade = (a: number): Pt[] => {
        const p = (aa: number, r: number): Pt => [hub[0] + Math.cos(aa) * r, hub[1] + 0.03 + Math.sin(aa) * r * 0.22]
        return [p(a - 0.16, 0.14), p(a - 0.1, L), p(a + 0.1, L), p(a + 0.16, 0.14)]
      }
      const angles = [0, 1, 2, 3].map((j) => th + (j * Math.PI) / 2)
      for (const a of angles) if (Math.sin(a) < 0) poly(pen, blade(a), '#24190F')
      poly(pen, [[hub[0] - 0.16, hub[1] - 0.12], [hub[0] + 0.16, hub[1] - 0.12], [hub[0] + 0.14, hub[1] + 0.06], [hub[0] - 0.14, hub[1] + 0.06]], '#5E4A2E')
      box(pen, hub[0] - 0.16, hub[1] - 0.12, hub[0] + 0.16, hub[1] - 0.09, '#8A7048')
      for (const a of angles) {
        if (Math.sin(a) < 0) continue
        const b = blade(a)
        poly(pen, b, '#3A2A1C')
        seg(pen, b[1], b[2], '#7A6450', 0.018)
      }
      // A little glass shade under the hub, lit.
      disc(pen, [hub[0], hub[1] + 0.12], 0.2, '#FFE6B0', 0.12)
      disc(pen, [hub[0], hub[1] + 0.1], 0.07, '#F2DDB0')
    }
  }, ANCHOR)
}

/**
 * The smoke hanging in layers: up under the ceiling, where it pools in the tubes' light, and in a thinner sheet at head
 * height; drifting, and thickening as the night goes on.
 */
export function strata(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < WALL[1] || f.y0 > -3.0) return
  const thick = 0.75 + 0.5 * smooth(t, T0, STRIKE)
  const span = END_WALL - WALL[1]
  layer(pen, f, 0.94, (g) => {
    for (let i = 0; i < 10; i++) {
      const rx = 1.5 + 1.8 * hash(i, 81)
      const x = WALL[1] + rx + ((((hash(i, 82) * span + t * (0.06 + 0.08 * hash(i, 83))) % span) + span) % span) * ((span - 2 * rx) / span)
      const high = i < 6
      const y = (high ? -5.3 + 1.0 * hash(i, 84) : -4.2 + 0.8 * hash(i, 84)) + 0.06 * Math.sin(t * 0.4 + i)
      if (x + rx < g.x0 || x - rx > g.x1 || y - 0.4 > g.y1 || y + 0.4 < g.y0) continue
      shade(pen, [x, y], rx, (high ? 0.22 : 0.15) + 0.12 * hash(i, 85), i % 3 ? SMOKE : '#D6A9C8', (high ? 0.11 : 0.07 + 0.04 * hash(i, 86)) * thick)
    }
  }, ANCHOR)
}

/** Dust and smoke turning in the money table's lamp. */
export function lampMotes(pen: Pen, t: number, lx: number): void {
  const top = -3.3
  const bottom = TOP + 0.05
  motes(pen, t, {
    n: 56,
    seed: 57,
    box: [TABLE[0] - 0.6, top, TABLE[1] + 0.6, bottom],
    size: [0.009, 0.022],
    color: '#FFE2B0',
    alpha: 0.6,
    drift: [0.05, -0.025],
    wander: 0.14,
    twinkle: 0.6,
    light: (x, y) => {
      const u = (y - top) / (bottom - top)
      const hw = 0.3 + u * ((TABLE[1] - TABLE[0]) / 2 + 0.3)
      return clamp01(1.4 - Math.abs(x - lx) / hw) * (0.5 + 0.5 * u)
    },
  })
}

/* ------------------------------------------------------------------ drinks and smoke */

/** A glass of beer standing on `base`: the beer, its head, the glass's catch of light. */
export function beer(pen: Pen, base: Pt, h: number, w: number, tilt = 0, level = 0.82): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.translate(base[0] * k, base[1] * k)
  ctx.rotate(tilt)
  const top = -h
  const fill = top * level
  ctx.fillStyle = css(pen, '#9FB9B7', 0.35)
  ctx.beginPath()
  ctx.moveTo((-w / 2) * k, 0)
  ctx.lineTo((-w / 2 - 0.02) * k, top * k)
  ctx.lineTo((w / 2 + 0.02) * k, top * k)
  ctx.lineTo((w / 2) * k, 0)
  ctx.fill()
  ctx.fillStyle = css(pen, '#DDB24E', 0.95)
  ctx.beginPath()
  ctx.moveTo((-w / 2 + 0.01) * k, -0.01 * k)
  ctx.lineTo((-w / 2 - 0.01) * k, fill * k)
  ctx.lineTo((w / 2 + 0.01) * k, fill * k)
  ctx.lineTo((w / 2 - 0.01) * k, -0.01 * k)
  ctx.fill()
  ctx.fillStyle = css(pen, '#F4ECD8', 0.95)
  ctx.fillRect((-w / 2 - 0.012) * k, (fill - 0.035) * k, (w + 0.024) * k, 0.035 * k)
  ctx.fillStyle = css(pen, '#FFFFFF', 0.45)
  ctx.fillRect((-w / 2 + 0.008) * k, (top + 0.02) * k, 0.012 * k, (h - 0.04) * k)
  ctx.restore()
}

/** Bubbles going up in glasses of beer: every glass's in one fill. Each glass is [x, base, height, width]. */
export function bubbles(pen: Pen, t: number, glasses: [number, number, number, number][]): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.fillStyle = css(pen, '#FFF6DC', 0.7)
  ctx.beginPath()
  glasses.forEach(([x, base, h, w], gi) => {
    for (let i = 0; i < 6; i++) {
      const rate = 0.5 + 0.6 * hash(i, gi, 91)
      const u = (((t * rate + hash(i, gi, 92)) % 1) + 1) % 1
      const bx = x + (hash(i, gi, 93) - 0.5) * w * 0.6 + 0.006 * Math.sin(t * 9 + i)
      const by = base - 0.02 - u * (h * 0.78 - 0.05)
      const r = (0.006 + 0.006 * hash(i, gi, 94)) * k
      ctx.moveTo(bx * k + r, by * k)
      ctx.arc(bx * k, by * k, r, 0, Math.PI * 2)
    }
  })
  ctx.fill()
  ctx.restore()
}

/**
 * A thread of smoke going up from `at`, `h` high: a curl that starts tight and widens as it rises and wanders, drawn in
 * three pieces, each fainter and wider than the one under it.
 */
export function curl(pen: Pen, t: number, at: Pt, h: number, seed: number, col: string, a: number, wobble = 0.22): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const n = 18
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let part = 0; part < 3; part++) {
    ctx.beginPath()
    for (let i = part * 6; i <= part * 6 + 6; i++) {
      const u = i / n
      const y = at[1] - u * h
      const amp = 0.015 + wobble * u * u
      const x = at[0] + amp * Math.sin(u * 9 - t * 2.1 + seed) + 0.14 * u * u * Math.sin(t * 0.45 + seed * 1.7)
      if (i === part * 6) ctx.moveTo(x * k, y * k)
      else ctx.lineTo(x * k, y * k)
    }
    ctx.strokeStyle = css(pen, col, a * (1 - part * 0.3))
    ctx.lineWidth = Math.max(0.6, (0.012 + part * 0.018) * h * 1.6 * k)
    ctx.stroke()
  }
  ctx.restore()
}

/** An ashtray with a cigarette going in it, and its thread of smoke. */
export function ashtray(pen: Pen, t: number, at: Pt, s = 1): void {
  const [x, y] = at
  poly(pen, [[x - 0.13 * s, y - 0.05 * s], [x + 0.13 * s, y - 0.05 * s], [x + 0.1 * s, y], [x - 0.1 * s, y]], '#5E6A6C')
  box(pen, x - 0.13 * s, y - 0.06 * s, x + 0.13 * s, y - 0.045 * s, '#9DAAAC')
  seg(pen, [x - 0.02 * s, y - 0.06 * s], [x + 0.14 * s, y - 0.09 * s], '#EFE8DA', 0.022 * s)
  disc(pen, [x + 0.15 * s, y - 0.09 * s], 0.045 * s, '#FF9A70', 0.25)
  disc(pen, [x + 0.15 * s, y - 0.09 * s], 0.016 * s, '#FFB08A', 0.7 + 0.3 * Math.sin(t * 2.3))
  curl(pen, t, [x + 0.15 * s, y - 0.1 * s], 1.1 * s, x * 3.1, SMOKE, 0.3)
}

/* ------------------------------------------------------------------ under the floor */

/** Under the floor: the work lights swinging on their cords (their light swinging with them), dust, the lift wheel turning. */
export function underFloor(pen: Pen, t: number, f: Frame): void {
  if (f.y1 < EDGE) return
  const bulbs: Pt[] = []
  for (const [i, bx] of [4.5, 12.5].entries()) {
    const a = 0.12 * sway(t, 31 + i, 2.6)
    const L = 0.3
    const b: Pt = [bx + Math.sin(a) * L, EDGE + 0.1 + Math.cos(a) * L]
    bulbs.push(b)
    seg(pen, [bx, EDGE + 0.1], b, '#0A0607', 0.012)
    glow(pen, [b[0], b[1] + 0.2], 1.3, '#FFD08A', 0.17)
    disc(pen, b, 0.05, '#FFE6B0', 0.9)
  }
  if (f.y1 > EDGE + 0.4)
    motes(pen, t, {
      n: 40,
      seed: 73,
      box: [3.0, EDGE + 0.15, 14.0, Math.min(f.y1, 2.6)],
      size: [0.008, 0.016],
      color: '#FFD9A0',
      alpha: 0.5,
      drift: [0.03, 0.01],
      wander: 0.1,
      light: (x, y) => {
        let l = 0
        for (const b of bulbs) l = Math.max(l, 1 - Math.hypot(x - b[0], (y - b[1]) * 1.4) / 1.2)
        return l
      },
    })
  // The return's lift wheel, at the foot of the shaft: it turns the whole time.
  if (f.x0 > LIFT_X + 0.4 || f.x1 < LIFT_X - 0.4) return
  const c: Pt = [LIFT_X + 0.02, TRACK + 0.24]
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.strokeStyle = css(pen, '#5E5C58', 1)
  ctx.lineWidth = 0.02 * k
  ctx.beginPath()
  // The belt, its cleats running up the shaft.
  const run = (t * 0.9) % 0.12
  for (let y = TRACK + 0.1 - run; y > EDGE + 0.12; y -= 0.12) {
    ctx.moveTo((LIFT_X - 0.1) * k, y * k)
    ctx.lineTo((LIFT_X + 0.14) * k, y * k)
  }
  ctx.stroke()
  ctx.strokeStyle = css(pen, '#8C8A84', 1)
  ctx.lineWidth = 0.022 * k
  ctx.beginPath()
  ctx.arc(c[0] * k, c[1] * k, 0.14 * k, 0, Math.PI * 2)
  const a0 = t * 4.2
  for (let i = 0; i < 6; i++) {
    const a = a0 + (i * Math.PI) / 3
    ctx.moveTo((c[0] + Math.cos(a) * 0.035) * k, (c[1] + Math.sin(a) * 0.035) * k)
    ctx.lineTo((c[0] + Math.cos(a) * 0.14) * k, (c[1] + Math.sin(a) * 0.14) * k)
  }
  ctx.stroke()
  ctx.fillStyle = css(pen, '#8C8A84', 1)
  ctx.beginPath()
  ctx.arc(c[0] * k, c[1] * k, 0.04 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the strike */

/** The strike, blown up: a white flash off the deck, a ring of air, splinters and chalk dust flying. */
export function strikeBurst(pen: Pen, t: number): void {
  const s = t - STRIKE
  if (s < 0 || s > 1.4) return
  const c: Pt = [HEADPIN + 0.35, (NEAR[0] + NEAR[1]) / 2 - 0.25]
  bloom(pen, c, 2.6, '#FFF6E6', 0.75 * flash(s, 0.1))
  bloom(pen, c, 1.4, '#FFD9A0', 0.45 * flash(s, 0.3))
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  if (s < 0.35) {
    ctx.strokeStyle = css(pen, '#FFF6E6', 0.55 * (1 - s / 0.35))
    ctx.lineWidth = 0.03 * k
    ctx.beginPath()
    ctx.ellipse(c[0] * k, c[1] * k, (0.3 + 5 * s) * k, (0.15 + 2.2 * s) * k, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  // Splinters and chips: thrown up and out from the pocket, falling.
  for (const [col, from] of [['#F3EDE0', 0], ['#E6D2AE', 1]] as [string, number][]) {
    ctx.fillStyle = css(pen, col, clamp01(1.3 - s))
    ctx.beginPath()
    for (let i = from; i < 40; i += 2) {
      const vx = -0.5 + 5.5 * hash(i, 101)
      const vy = -2.2 - 4.5 * hash(i, 102)
      const x = c[0] + vx * s
      const y = c[1] + vy * s + 6 * s * s
      if (y > EDGE) continue
      const r = (0.015 + 0.02 * hash(i, 103)) * k
      ctx.moveTo(x * k + r, y * k)
      ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.restore()
  // The chalk dust off the deck, spreading and settling.
  for (let i = 0; i < 3; i++) shade(pen, [c[0] + 0.3 + i * 0.4, c[1] - 0.1 - i * 0.15], 0.5 + 1.2 * s, 0.25 + 0.5 * s, '#E8DCC4', 0.3 * clamp01(1 - s / 1.4))
}

/* ------------------------------------------------------------------ outside */

const LAMP: Pt = [-10.0, -3.72]
const SIGN: Pt = [-1.95, -3.2]
/** The road's puddle the late car runs through (just off the cab's nose), and the sidewalk's he rolls through. */
const ROAD_PUDDLE: Pt = [-2.5, -0.1]
const WALK_PUDDLE: Pt = [-4.4, (WALK[0] + WALK[1]) / 2 + 0.02]
/** The manhole in the far lane, off the cab's nose: steaming. */
const MANHOLE: Pt = [-2.95, -0.36]
/**
 * The late car: when its nose would be at x 0 (it comes out past the alley's front just after he pops out of the
 * rack), and how fast it goes (to the left): past him as he kicks off the curb, and gone before he drops into the cab.
 */
const CAR_V = 13
const CAR_AT = 136.13 + WALL[0] / CAR_V
const carX = (t: number) => -(t - CAR_AT) * CAR_V
/** When he rolls through the sidewalk's puddle. */
const SPLASH = (() => {
  for (let t = SIDEWALK; t < CURB_KICK; t += 0.005) if (WAY.at(t)[0] <= WALK_PUDDLE[0]) return t
  return SKIP
})()

/** The alley's blade sign over the sidewalk: a pin, a ball, a red frame; on in pink and red. */
const SIGN_TUBES = (() => {
  const [x, y] = SIGN
  return {
    frame: [[x - 0.55, y - 0.72], [x + 0.55, y - 0.72], [x + 0.55, y + 0.72], [x - 0.55, y + 0.72]] as Pt[],
    pin: pinLine([x - 0.12, y + 0.55], 1.0),
    ball: arc([x + 0.24, y + 0.32], 0.2, 0.2, 0, Math.PI * 2, 16),
  }
})()

/** The far side of the street: its buildings stand back at this depth (the street itself is the stage's). */
export const STREET_D = 0.85
/** Laid out against the framing on the cab at the cut, so the cut's picture is as it was. */
export const STREET_ANCHOR: Pt = [-6.25, -1.06]

/** The far side's buildings, as `outside` lays them out: their tops, and which windows are lit. */
const bldgTop = (i: number) => -2.0 - 1.4 * hash(i, 41)
const litWin = (i: number, c: number, r: number) => hash(i * 7 + c, r, 43)

/** The far side's lights, for the reflections: [x, colour, alpha], in the buildings' own cells. */
function streetLights(x0: number, x1: number): [number, string, number][] {
  const out: [number, string, number][] = []
  for (let i = Math.floor(x0 / 2.3) - 1; i * 2.3 < x1; i++) {
    const bx = i * 2.3
    for (let c = 0; c < 3; c++) {
      let col = ''
      for (let r = 0; r < 4; r++) {
        if (bldgTop(i) + 0.35 + r * 0.55 > -0.9) break
        const h = litWin(i, c, r)
        if (h > 0.84) col = h > 0.93 ? '#7FA3B8' : '#C99A52'
      }
      if (col) out.push([bx + 0.44 + c * 0.7, col, 0.13])
    }
    if (hash(i, 44) > 0.6) out.push([bx + 1.1, '#C99A52', 0.1])
  }
  return out
}

/** The far side's few signs of life, in the buildings' layer: a television's flicker in two dark windows. */
export function windowsLife(pen: Pen, t: number, x0: number, x1: number): void {
  for (const i of [-3, -6]) {
    const wx = i * 2.3 + 1.0
    const wy = bldgTop(i) + 0.9
    if (wx < x0 - 1 || wx > x1 + 1) continue
    const tv = 0.5 + 0.3 * Math.sin(t * 13 + wx) + 0.2 * Math.sin(t * 29.7 + wx * 2)
    rect(pen, wx, wy, wx + 0.28, wy + 0.32, mix('#2A4A7A', '#B9D3F2', tv))
    glow(pen, [wx + 0.14, wy + 0.16], 0.5, '#9FC3FF', 0.1 + 0.08 * tv)
  }
}

/**
 * The wet road: everything lit lies down it in long broken streaks that shiver. `dx` is how far the buildings' layer
 * stands moved, so their windows' streaks fall under them.
 */
export function roadWet(pen: Pen, t: number, x0: number, x1: number, dx: number): void {
  const list: [number, string, number, number][] = streetLights(x0 - dx, x1 - dx).map(([x, c, a]) => [x + dx, c, a * 0.8, 0.2])
  list.push([LAMP[0] + 0.6, '#B9D3E2', 0.2, 0.4])
  list.push([SIGN[0], NEON.magenta, 0.26, 0.5])
  list.push([SIGN[0] + 0.24, NEON.red, 0.2, 0.25])
  // Each a long wavering streak down the road from the far curb, fading as it comes nearer.
  for (const [x, col, a, w] of list) if (x > x0 - 1 && x < x1 + 0.5) streak(pen, t, x, -0.47, WALK[0] - 0.08, w, col, a)
  puddle(pen, ROAD_PUDDLE, 0.6, x0, x1)
  if (MANHOLE[0] > x0 - 1 && MANHOLE[0] < x1 + 1) shape(pen, [[MANHOLE[0] - 0.3, MANHOLE[1] - 0.02], [MANHOLE[0] + 0.3, MANHOLE[1] - 0.02], [MANHOLE[0] + 0.26, MANHOLE[1] + 0.035], [MANHOLE[0] - 0.26, MANHOLE[1] + 0.035]], '#0A0D13')
}

/** A light's reflection in the wet: a soft streak from `y0` down to `y1`, its edges wavering slowly, fading as it comes. */
function streak(pen: Pen, t: number, x: number, y0: number, y1: number, w: number, col: string, a: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const n = 14
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, css(pen, col, a))
  g.addColorStop(0.55, css(pen, col, a * 0.5))
  g.addColorStop(1, css(pen, col, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  for (let side = -1; side <= 1; side += 2) {
    for (let jj = 0; jj <= n; jj++) {
      const j = side < 0 ? jj : n - jj
      const y = y0 + ((y1 - y0) * j) / n
      const wob = 0.018 * Math.sin(t * 1.9 + y * 14 + x * 3)
      const ww = w * (0.8 + 0.2 * Math.sin(y * 21 + x + t * 1.3 * side)) * (1 - 0.35 * (j / n))
      const px = x + wob + (side * ww) / 2
      if (side < 0 && jj === 0) ctx.moveTo(px * k, y * k)
      else ctx.lineTo(px * k, y * k)
    }
  }
  ctx.closePath()
  ctx.fill()
}

function puddle(pen: Pen, c: Pt, rx: number, x0: number, x1: number): void {
  if (c[0] + rx < x0 || c[0] - rx > x1) return
  shade(pen, c, rx, 0.07, '#04060B', 0.75)
  shade(pen, [c[0] + 0.1, c[1]], rx * 0.5, 0.04, NEON.magenta, 0.3)
}

/** The wet sidewalk: the blade sign's pink and the lamp's cold in it, its puddle, and the rings where he rolls through. */
export function walkWet(pen: Pen, t: number, x0: number, x1: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  for (const [x, col, a] of [[SIGN[0], NEON.magenta, 0.3], [LAMP[0] + 0.6, '#B9D3E2', 0.2]] as [number, string, number][]) {
    if (x < x0 - 1 || x > x1 + 1) continue
    streak(pen, t, x, WALK[0] + 0.01, WALK[1] - 0.01, 0.5, col, a)
  }
  puddle(pen, WALK_PUDDLE, 0.55, x0, x1)
  const s = t - SPLASH
  if (s > 0 && s < 1.2) {
    ctx.save()
    ctx.lineWidth = Math.max(0.6, 0.015 * k)
    for (let i = 0; i < 3; i++) {
      const u = s - i * 0.18
      if (u <= 0 || u >= 1) continue
      ctx.strokeStyle = css(pen, '#DDE6F0', 0.5 * (1 - u))
      ctx.beginPath()
      ctx.ellipse(WALK_PUDDLE[0] * k, WALK_PUDDLE[1] * k, (0.05 + 0.5 * u) * k, (0.012 + 0.07 * u) * k, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** The alley's blade sign, hung off its front over the sidewalk: the first thing outside, and the pink in the wet. */
export function bladeSign(pen: Pen, t: number): void {
  const [x, y] = SIGN
  const hum = flicker(t, 41, 0.12)
  box(pen, x + 0.55, y - 0.55, WALL[0], y - 0.5, '#0A0C12')
  box(pen, x + 0.55, y + 0.5, WALL[0], y + 0.55, '#0A0C12')
  box(pen, x - 0.62, y - 0.8, x + 0.62, y + 0.8, '#120A10')
  glow(pen, [x, y], 2.4, NEON.magenta, 0.24 * hum)
  // The frame's chase lights run all night.
  const go = Math.floor(t * 4)
  const frame: Tube[] = []
  for (let i = 0; i < 12; i++) {
    const along = (u: number): Pt => {
      const per = u * 4
      const e = Math.floor(per) % 4
      const v = per - Math.floor(per)
      const p0 = SIGN_TUBES.frame[e]
      const p1 = SIGN_TUBES.frame[(e + 1) % 4]
      return [p0[0] + (p1[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * v]
    }
    frame.push({ pts: [along(i / 12), along((i + 0.75) / 12)], col: NEON.red, on: (i + go) % 3 === 0 ? 0.4 * hum : hum })
  }
  tubes(pen, [...frame, { pts: SIGN_TUBES.pin, col: NEON.white, closed: true, on: hum }, { pts: SIGN_TUBES.ball, col: NEON.magenta, closed: true, on: hum }], 0.035)
}

/**
 * Steam: out of the manhole off the cab's nose (pink from the sign), up from a grate behind the cab (only its top shows
 * over the roof), and out of one far down the street under the lamp.
 */
export function steam(pen: Pen, t: number, x0: number, x1: number): void {
  for (const [i, [mx, my, hot]] of ([[MANHOLE[0], MANHOLE[1], '#E2B6D6'], [-5.6, -0.56, '#C8C2DA'], [-11.3, -0.26, '#CFE0EC']] as [number, number, string][]).entries()) {
    if (mx + 2 < x0 || mx - 1.5 > x1) continue
    // Soft puffs, each rising, swelling, leaning off on the night air, and going.
    for (let j = 0; j < 7; j++) {
      const life = 2.6 + 0.9 * hash(j, i, 121)
      const u = (((t / life + hash(j, i, 122)) % 1) + 1) % 1
      const px = mx + (hash(j, i, 123) - 0.5) * 0.3 + u * u * 0.9 + 0.12 * Math.sin(t * 0.8 + j * 2.1) * u
      const py = my - u * 2.7
      const r = 0.2 + 0.85 * u
      shade(pen, [px, py], r, r * 0.75, u < 0.35 ? hot : '#A9B3C4', 0.32 * Math.min(1, u * 5) * (1 - u))
    }
  }
}

/** A late car going by on the far side of the road, its lamps on the wet, throwing up the puddle by the door. */
export function passingCar(pen: Pen, t: number, x0: number, x1: number): void {
  const cx = carX(t)
  if (cx + 3.5 < x0 || cx - 4 > x1) return
  const y = -0.18
  const ctx = ctxOf(pen.p)
  const k = pen.k
  // Its beams ahead of it on the road, and their streaks in the wet.
  const g = ctx.createLinearGradient(cx * k, 0, (cx - 4) * k, 0)
  g.addColorStop(0, css(pen, '#FFF1C2', 0.32))
  g.addColorStop(1, css(pen, '#FFF1C2', 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(cx * k, (y - 0.42) * k)
  ctx.lineTo((cx - 4) * k, (y - 0.25) * k)
  ctx.lineTo((cx - 4) * k, (y + 0.3) * k)
  ctx.lineTo(cx * k, (y - 0.25) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  for (let j = 0; j < 4; j++) rect(pen, cx - 0.2 - j * 0.12, y + 0.04 + j * 0.08, cx + 0.05 - j * 0.1, y + 0.07 + j * 0.08, mix('#FFF1C2', '#141B27', 0.35 + j * 0.15))
  // The body: a low dark sedan, rimmed by the lamp over it.
  const L = 3.4
  const body: Pt[] = [[cx, y - 0.2], [cx + 0.1, y - 0.5], [cx + 0.85, y - 0.58], [cx + 1.15, y - 0.98], [cx + 2.3, y - 1.0], [cx + 2.75, y - 0.62], [cx + L, y - 0.55], [cx + L, y - 0.12], [cx, y - 0.12]]
  shape(pen, body, '#10161F')
  line(pen, [cx + 1.15, y - 0.98], [cx + 2.3, y - 1.0], '#4A5A70', 0.6)
  shape(pen, [[cx + 1.25, y - 0.6], [cx + 1.3, y - 0.92], [cx + 2.2, y - 0.94], [cx + 2.6, y - 0.6]], '#1E2A38')
  for (const wx of [0.7, 2.75]) {
    ctx.save()
    ctx.fillStyle = css(pen, '#07080A', 1)
    ctx.beginPath()
    ctx.arc((cx + wx) * k, (y - 0.12) * k, 0.22 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  glow(pen, [cx + 0.02, y - 0.38], 0.5, '#FFF1C2', 0.75)
  glow(pen, [cx + L - 0.02, y - 0.4], 0.35, NEON.red, 0.55)
  spray(pen, cx)
}

/** Through the puddle off the cab's nose: a spray thrown up behind the car's front wheel. */
function spray(pen: Pen, cx: number): void {
  const s = (ROAD_PUDDLE[0] - cx - 0.7) / CAR_V
  if (s <= 0 || s >= 0.7) return
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.fillStyle = css(pen, '#C8D6E6', 0.55 * (1 - s / 0.7))
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const vx = 1.0 + 2.2 * hash(i, 111)
    const vy = -1.4 - 1.8 * hash(i, 112)
    const px = ROAD_PUDDLE[0] + vx * s
    const py = ROAD_PUDDLE[1] + vy * s + 6 * s * s
    const r = 0.018 * k
    ctx.moveTo(px * k + r, py * k)
    ctx.arc(px * k, py * k, r, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/**
 * The late car's lamps seen through the cab's windows as it goes by behind it: a glare sliding across the glass. Drawn
 * over the cab, clipped to its two windows (`cab.ts`), before he is in it.
 */
export function carGlare(pen: Pen, t: number): void {
  const cx = carX(t)
  const sx = SEAT[0]
  if (cx < sx - 1.8 || cx > sx + 3.8) return
  const roofY = SEAT[1] + CAB.road + CAB.roof
  const sill = SEAT[1] + R + 0.17
  const belt = SEAT[1] - 0.32
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.beginPath()
  ctx.rect((sx - 0.8) * k, (roofY + 0.14) * k, 2.08 * k, (sill - roofY - 0.14) * k)
  ctx.rect((sx + 1.47) * k, (roofY + 0.14) * k, 1.0 * k, (belt - roofY - 0.14) * k)
  ctx.clip()
  bloom(pen, [cx, -0.62], 1.2, '#FFF1C2', 0.6)
  ctx.restore()
}

/** Mist in the streetlamp's light. */
export function lampMist(pen: Pen, t: number, x0: number, x1: number): void {
  if (LAMP[0] + 2.4 < x0 || LAMP[0] - 2.4 > x1) return
  motes(pen, t, {
    n: 50,
    seed: 77,
    box: [LAMP[0] - 2.4, -4.6, LAMP[0] + 2.4, 0.2],
    size: [0.008, 0.016],
    color: '#D8E8F2',
    alpha: 0.55,
    drift: [-0.12, 0.35],
    wander: 0.08,
    twinkle: 0.4,
    light: (x, y) => clamp01(1 - Math.hypot(x - LAMP[0], (y - LAMP[1]) * 0.55) / 2.2),
  })
}

/** The neon on the cab: the blade sign's pink caught along its roof and its hood, under the street's own cold. */
export function cabSheen(pen: Pen, t: number): void {
  const hum = flicker(t, 41, 0.12)
  const road = SEAT[1] + CAB.road
  glow(pen, [SEAT[0] + CAB.front - 0.5, SEAT[1] - 0.48], 0.6, NEON.magenta, 0.2 * hum)
  glow(pen, [SEAT[0] + 2.2, road + CAB.roof + 0.05], 0.8, NEON.pink, 0.12 * hum)
}

/* ------------------------------------------------------------------ in front of the lens */

type Near = 'stool' | 'glass' | 'ashtray' | 'rack' | 'hydrant' | 'can'
/** What passes close in front of the lens, at depth 1.4, and where along the place (layer cells). */
const NEAR_THINGS: [number, Near][] = [
  [-14.8, 'can'],
  [-7.4, 'hydrant'],
  [-0.2, 'stool'],
  [12.3, 'glass'],
  [19.2, 'rack'],
  [26.6, 'ashtray'],
]

/**
 * Close in front of the lens, soft and dark at the frame's foot: a bar stool, a glass of beer, the house balls on their
 * rack, an ashtray; outside, a hydrant and a trash can. Each passes faster than the room as the camera goes, sized to
 * the frame so it never climbs more than a sixth of the way up it, and none is there on the cut in or at the cab.
 */
export function foreground(pen: Pen, t: number, f: Frame): void {
  const fade = smooth(t, T0 + 0.8, T0 + 2.4)
  if (fade <= 0) return
  layer(pen, f, NEAR_D, (g) => {
    const u = ((g.y1 - g.y0) / 8.4) * 1.25
    for (const [x, kind] of NEAR_THINGS) {
      const w = 1.4 * u
      if (x + w < g.x0 || x - w > g.x1) continue
      nearThing(pen, t, kind, [x, g.y1 + 0.04 * u], u, fade)
    }
  }, ANCHOR)
}

function nearThing(pen: Pen, t: number, kind: Near, b: Pt, u: number, a: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const dark = '#07050A'
  const [x, y] = b
  ctx.save()
  ctx.globalAlpha = a
  const trace = (pts: Pt[], grow = 1) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    ctx.beginPath()
    pts.forEach(([px, py], i) => {
      const X = (cx + (px - cx) * grow) * k
      const Y = (cy + (py - cy) * grow) * k
      if (i) ctx.lineTo(X, Y)
      else ctx.moveTo(X, Y)
    })
    ctx.closePath()
  }
  // Out of focus: each shape a little larger and faint round itself, then itself.
  const soft = (pts: Pt[], col: string, al = 0.96) => {
    ctx.fillStyle = css(pen, col, al * 0.3)
    trace(pts, 1.07)
    ctx.fill()
    ctx.fillStyle = css(pen, col, al)
    trace(pts)
    ctx.fill()
  }
  const disc = (c: Pt, r: number, col: string, al: number) => {
    ctx.fillStyle = css(pen, col, al)
    ctx.beginPath()
    ctx.arc(c[0] * k, c[1] * k, r * k, 0, Math.PI * 2)
    ctx.fill()
  }
  // The neon's catch along an edge: a soft wide stroke, and a thin bright one in it.
  const rim = (pts: Pt[], col: string, al: number) => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const [w, aa] of [[0.08, al * 0.3], [0.028, al]] as [number, number][]) {
      ctx.strokeStyle = css(pen, col, aa)
      ctx.lineWidth = w * u * k
      ctx.beginPath()
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * k, py * k) : ctx.moveTo(px * k, py * k)))
      ctx.stroke()
    }
  }
  if (kind === 'stool') {
    // The seat's round top, red vinyl gone black in the dark, and its chrome post going down out of the frame.
    soft([[x - 0.06 * u, y - 0.9 * u], [x + 0.06 * u, y - 0.9 * u], [x + 0.06 * u, y + 0.3], [x - 0.06 * u, y + 0.3]], dark)
    rim([[x - 0.03 * u, y - 0.86 * u], [x - 0.03 * u, y]], '#B9D3E2', 0.35)
    soft(arc([x, y - 1.0 * u], 0.62 * u, 0.17 * u, 0, Math.PI * 2, 18), '#1C070D')
    rim(arc([x, y - 1.0 * u], 0.62 * u, 0.17 * u, Math.PI * 1.02, Math.PI * 1.75, 10), NEON.red, 0.75)
  } else if (kind === 'glass') {
    // A glass of beer with the light coming through it: dark glass, the beer glowing amber, its bubbles going up.
    const w = 0.42 * u
    const h = 0.95 * u
    const body: Pt[] = [[x - w / 2, y], [x - w / 2 - 0.04 * u, y - h], [x + w / 2 + 0.04 * u, y - h], [x + w / 2, y]]
    soft(body, '#1A0E04')
    ctx.save()
    trace(body)
    ctx.clip()
    glow(pen, [x, y - h * 0.45], h * 0.7, '#E2B850', 0.6)
    rect(pen, x - w, y - h, x + w, y - h * 0.86, '#6E5A44')
    ctx.restore()
    bubbles(pen, t, [[x, y, h, w]])
    rim([[x + w / 2 + 0.035 * u, y - h + 0.04 * u], [x + w / 2 + 0.005 * u, y - 0.1 * u]], NEON.teal, 0.6)
    rim([[x - w / 2 - 0.035 * u, y - h + 0.04 * u], [x - w / 2 - 0.035 * u, y - h + 0.3 * u]], NEON.magenta, 0.4)
  } else if (kind === 'ashtray') {
    soft([[x - 0.55 * u, y - 0.18 * u], [x + 0.55 * u, y - 0.18 * u], [x + 0.45 * u, y + 0.1], [x - 0.45 * u, y + 0.1]], dark)
    rim([[x - 0.52 * u, y - 0.19 * u], [x + 0.52 * u, y - 0.19 * u]], NEON.magenta, 0.55)
    glow(pen, [x + 0.42 * u, y - 0.26 * u], 0.08 * u, '#FF8A5C', 0.7 + 0.25 * Math.sin(t * 2.3))
    curl(pen, t, [x + 0.42 * u, y - 0.28 * u], 2.2 * u, 5, SMOKE, 0.2, 0.3)
  } else if (kind === 'rack') {
    // House balls on their rack: dark spheres, each with the neon caught on its shoulder.
    soft([[x - 1.1 * u, y - 0.5 * u], [x + 1.1 * u, y - 0.5 * u], [x + 1.1 * u, y + 0.3], [x - 1.1 * u, y + 0.3]], dark)
    rim([[x - 1.08 * u, y - 0.52 * u], [x + 1.08 * u, y - 0.52 * u]], '#B9D3E2', 0.3)
    for (const [i, dx] of [-0.7, 0, 0.7].entries()) {
      const c: Pt = [x + dx * u, y - 0.84 * u]
      const col = [NEON.magenta, NEON.teal, NEON.red][i]
      disc(c, 0.4 * u, ['#0C0A12', '#081418', '#14070C'][i], 0.97)
      rim(arc(c, 0.37 * u, 0.37 * u, Math.PI * 1.1, Math.PI * 1.55, 8), col, 0.6)
      disc([c[0] - 0.14 * u, c[1] - 0.16 * u], 0.05 * u, col, 0.55)
    }
  } else if (kind === 'hydrant') {
    soft([[x - 0.3 * u, y + 0.2], [x - 0.26 * u, y - 0.75 * u], [x - 0.18 * u, y - 0.95 * u], [x + 0.18 * u, y - 0.95 * u], [x + 0.26 * u, y - 0.75 * u], [x + 0.3 * u, y + 0.2]], '#0A0B10')
    soft([[x - 0.44 * u, y - 0.62 * u], [x + 0.44 * u, y - 0.62 * u], [x + 0.44 * u, y - 0.47 * u], [x - 0.44 * u, y - 0.47 * u]], '#0A0B10')
    rim([[x + 0.2 * u, y - 0.93 * u], [x + 0.27 * u, y - 0.75 * u], [x + 0.29 * u, y]], NEON.magenta, 0.55)
    rim([[x - 0.18 * u, y - 0.97 * u], [x + 0.16 * u, y - 0.97 * u]], '#B9D3E2', 0.55)
  } else {
    soft([[x - 0.48 * u, y + 0.2], [x - 0.52 * u, y - 1.05 * u], [x + 0.52 * u, y - 1.05 * u], [x + 0.48 * u, y + 0.2]], '#0A0C12')
    soft([[x - 0.58 * u, y - 1.05 * u], [x + 0.58 * u, y - 1.05 * u], [x + 0.5 * u, y - 1.18 * u], [x - 0.5 * u, y - 1.18 * u]], '#0D1018')
    rim([[x - 0.56 * u, y - 1.08 * u], [x + 0.3 * u, y - 1.17 * u]], '#B9D3E2', 0.5)
    rim([[x - 0.52 * u, y - 1.0 * u], [x - 0.48 * u, y]], NEON.pink, 0.35)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the people's small life */

/** The bettor's beer: on the counter, then picked up after the raise, a long nervous pull, held, and put back down. */
export const BETTOR_GLASS: Pt = [1.45, -2.52]
export function bettorDrink(t: number, rest: Pt, mouth: Pt): { hand: Pt | null; glass: Pt; tilt: number; held: boolean } {
  const grip: Pt = [BETTOR_GLASS[0], BETTOR_GLASS[1] - 0.12]
  const chest: Pt = [rest[0] - 0.05, rest[1] - 0.18]
  const keys: [number, Pt, number][] = [
    [127.62, rest, 0],
    [127.95, grip, 0],
    [128.35, mouth, -0.5],
    [128.95, mouth, -0.95],
    [129.35, chest, -0.1],
    [130.95, chest, -0.1],
    [131.35, grip, 0],
    [131.65, rest, 0],
  ]
  if (t < keys[0][0] || t >= keys[keys.length - 1][0]) return { hand: null, glass: BETTOR_GLASS, tilt: 0, held: false }
  let i = 0
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i++
  const [t0, p0, a0] = keys[i]
  const [t1, p1, a1] = keys[i + 1]
  const u = ease((t - t0) / (t1 - t0))
  const hand: Pt = [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u]
  const held = t > 127.95 && t < 131.35
  return { hand, glass: held ? [hand[0], hand[1] + 0.12] : BETTOR_GLASS, tilt: held ? a0 + (a1 - a0) * u : 0, held }
}

/** The mark who plays tips his hat back, cocky, while he laughs at the given point. 0 to 1. */
export const hatTip = (t: number): number => {
  const s = t - 126.05
  return s < 0 || s > 0.9 ? 0 : Math.sin((s / 0.9) * Math.PI)
}

/** People never stand quite still: a slow shift of weight, about a share of a cell. */
export const shift = (t: number, seed: number): number => 0.025 * sway(t, seed, 5.5)
