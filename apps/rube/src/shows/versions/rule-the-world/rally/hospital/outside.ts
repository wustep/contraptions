import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { parallax, type Frame } from '../depth'
import { ctxOf, glow, mix, rgba, type Pen } from '../pen'
import { gold, rose, sunUp } from './dawn'

/**
 * The city outside the ward's windows, waking: one Manhattan seen through the tall window behind Rachel's bed, the
 * corridor's window over the bench and the nursery's own little window. Each window looks out on layers at their own
 * depths, so that as the camera goes by the far towers hang almost still while the tenement roofs and their water
 * tanks slide past under them: the sky, a plane crossing high with its trail caught pink by a sun the street has not
 * yet seen, the towers of midtown (some windows lit, going out as the day comes), the roofs and their tanks and
 * chimneys with the first smoke going up, the El running along between the roofs with its windows lit, and the
 * pigeons wheeling. Across the court from the corridor's window is the hospital's far wing, where an orderly with his
 * trolley and a nurse go along their own corridor, window to window.
 *
 * Every layer is drawn for whatever of it the window shows (it is laid out by index along the street, so there is
 * never an edge to come to however far the camera goes), and how far a layer moves up or down with the camera is
 * held to a little, so that a crane up past the window still sees roofs and sky in it.
 */

/** A window's glass, in cells. */
export interface Pane {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** How a window looks out: the camera's frame, the glass, and how the city lies in it. */
export interface Look {
  f: Frame
  win: Pane
  /** Where the camera's centre lays every layer just as it is drawn. */
  anchor: Pt
  /** The street line the city stands on (cells, as drawn); every height is measured up from it. */
  base: number
  /** The city's scale in this window: a far window's is smaller. */
  s: number
  t: number
}

/* ------------------------------------------------------------------ the colours of the morning */

interface Tones {
  skyTop: string
  skyMid: string
  skyLow: string
  far: string
  mid: string
  near: string
  cornice: string
  el: string
  bird: string
  smoke: string
  wing: string
  wingDark: string
  pane: string
}
let tonesAt = Number.NaN
let tones: Tones | null = null
function tonesOf(t: number): Tones {
  if (tones && t === tonesAt) return tones
  const r = rose(t)
  const g = gold(t)
  tonesAt = t
  tones = {
    skyTop: mix(mix('#8193A6', '#9A91AB', r), '#C9B08F', g),
    skyMid: mix(mix('#A1ABB4', '#D6ABA9', r), '#EDC48E', g),
    skyLow: mix(mix('#B5BCC0', '#F2BCA6', r), '#F8CC86', g),
    far: mix(mix('#9CA6B0', '#BCA3AB', r), '#DDB58F', g),
    mid: mix(mix('#6A7682', '#6F6674', 0.8 * r), '#7E625A', g),
    near: mix(mix('#56616C', '#5B5361', 0.8 * r), '#604A44', g),
    cornice: mix(mix('#4D5762', '#51495A', 0.8 * r), '#55403B', g),
    el: mix('#4A535E', '#4C3E3A', g),
    bird: mix('#48505A', '#4A3B37', g),
    smoke: mix(mix('#C9CED3', '#EFD4CA', r), '#F8DFBA', g),
    wing: mix(mix('#A5A9A8', '#BFA8A6', r), '#E0BC8E', g),
    wingDark: mix(mix('#868B8C', '#9C8789', r), '#B98F6C', g),
    pane: mix(mix('#B9C3C8', '#E3BDB4', r), '#FBDDA4', g),
  }
  return tones
}

/* ------------------------------------------------------------------ plumbing */

/** Clip to a window's glass, if it is in the frame at all. Call `lookIn` after, when this said yes. */
export function lookOut(pen: Pen, L: Look): boolean {
  const { win, f } = L
  if (win.x1 < f.x0 || win.x0 > f.x1 || win.y1 < f.y0 || win.y0 > f.y1) return false
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  ctx.rect(win.x0 * k, win.y0 * k, (win.x1 - win.x0) * k, (win.y1 - win.y0) * k)
  ctx.clip()
  return true
}
export const lookIn = (pen: Pen): void => ctxOf(pen.p).restore()

const soft = (u: number, l: number): number => l * Math.tanh(u / l)

/** A layer at depth `d` through the window: drawn for the stretch of street (in its own cells) the window shows. */
function within(pen: Pen, L: Look, d: number, draw: (xa: number, xb: number, ya: number, yb: number) => void): void {
  const [dx, ry] = parallax(L.f, d, L.anchor)
  const dy = soft(ry, 0.3 * L.s)
  const xa = Math.max(L.win.x0, L.f.x0) - dx
  const xb = Math.min(L.win.x1, L.f.x1) - dx
  const ya = Math.max(L.win.y0, L.f.y0) - dy
  const yb = Math.min(L.win.y1, L.f.y1) - dy
  if (xb <= xa || yb <= ya) return
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.translate(dx * pen.k, dy * pen.k)
  draw(xa, xb, ya, yb)
  ctx.restore()
}

/* Scratch lists of rects (x0, y0, x1, y1) and triangles, each filled in one go and emptied. */
const BODY: number[] = []
const TRIM: number[] = []
const LIT: number[] = []
const RIM: number[] = []
const TRI: number[] = []
function fillRects(pen: Pen, col: string, a: number, r: number[]): void {
  if (r.length && a > 0.004) {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    ctx.fillStyle = rgba(pen, col, a)
    ctx.beginPath()
    for (let i = 0; i < r.length; i += 4) ctx.rect(r[i] * k, r[i + 1] * k, (r[i + 2] - r[i]) * k, (r[i + 3] - r[i + 1]) * k)
    ctx.fill()
  }
  r.length = 0
}
function fillTris(pen: Pen, col: string, r: number[]): void {
  if (r.length) {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    ctx.fillStyle = rgba(pen, col, 1)
    ctx.beginPath()
    for (let i = 0; i < r.length; i += 6) {
      ctx.moveTo(r[i] * k, r[i + 1] * k)
      ctx.lineTo(r[i + 2] * k, r[i + 3] * k)
      ctx.lineTo(r[i + 4] * k, r[i + 5] * k)
      ctx.closePath()
    }
    ctx.fill()
  }
  r.length = 0
}

/* ------------------------------------------------------------------ the layers, far to near */

/** The sky: high grey-blue down to the glow over the roofs, and the sun's light under them (`glowAt`, if given). */
export function sky(pen: Pen, L: Look, glowAt?: Pt, glowR = 2.2): void {
  const c = tonesOf(L.t)
  within(pen, L, 0.04, (xa, xb, ya, yb) => {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    const top = L.base - 4.4 * L.s
    const g = ctx.createLinearGradient(0, top * k, 0, L.base * k)
    g.addColorStop(0, rgba(pen, c.skyTop, 1))
    g.addColorStop(0.62, rgba(pen, c.skyMid, 1))
    g.addColorStop(1, rgba(pen, c.skyLow, 1))
    ctx.fillStyle = g
    ctx.fillRect(xa * k, ya * k, (xb - xa) * k, (yb - ya) * k)
    if (glowAt) glow(pen, glowAt, glowR * L.s, mix(mix('#DCD5CA', '#FAC9B2', rose(L.t)), '#FFD79A', gold(L.t)), 0.3 + 0.2 * rose(L.t) + 0.4 * gold(L.t))
  })
}

/** A plane crossing high, its trail lit by the sun up there: one every `every` seconds, from `x0` going left. */
export function plane(pen: Pen, L: Look, o: { t0: number; x0: number; v: number; y: number; every: number }): void {
  const u = (((L.t - o.t0) % o.every) + o.every) % o.every
  const x = o.x0 - o.v * u
  const s = L.s
  within(pen, L, 0.05, (xa, xb) => {
    if (x > xb + 0.2 || x + 2 * s < xa) return
    const { k } = pen
    const ctx = ctxOf(pen.p)
    const c = tonesOf(L.t)
    const y = o.y
    // The trail behind it, spreading and fading.
    const len = Math.min(1.9 * s, o.v * u)
    if (len > 0.02) {
      const g = ctx.createLinearGradient(x * k, 0, (x + len) * k, 0)
      const lit = mix('#F4EEE8', '#FFD9C2', 0.4 + 0.6 * rose(L.t))
      g.addColorStop(0, rgba(pen, lit, 0.7))
      g.addColorStop(1, rgba(pen, lit, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo((x + 0.05 * s) * k, (y - 0.004 * s) * k)
      ctx.lineTo((x + len) * k, (y - 0.012 * s) * k)
      ctx.lineTo((x + len) * k, (y + 0.012 * s) * k)
      ctx.lineTo((x + 0.05 * s) * k, (y + 0.004 * s) * k)
      ctx.closePath()
      ctx.fill()
    }
    // A four-engined airliner, small and dark: fuselage, wings, tail.
    BODY.push(x - 0.05 * s, y - 0.006 * s, x + 0.05 * s, y + 0.006 * s, x + 0.035 * s, y - 0.022 * s, x + 0.045 * s, y)
    TRI.push(x - 0.01 * s, y, x + 0.025 * s, y, x + 0.03 * s, y + 0.02 * s)
    fillRects(pen, c.el, 0.85, BODY)
    fillTris(pen, c.el, TRI)
  })
}

/** Midtown, far off and hazy: towers with setbacks and the odd mast, a few windows lit and going out as the day comes. */
export function towers(pen: Pen, L: Look, d: number): void {
  const c = tonesOf(L.t)
  const s = L.s
  const up = sunUp(L.t)
  const lights = 0.1 + 0.22 * rose(L.t) - 0.34 * up
  within(pen, L, d, (xa, xb) => {
    const sp = 0.4 * s
    for (let i = Math.floor(xa / sp) - 1; i <= Math.ceil(xb / sp); i++) {
      const h1 = hash(i, 41, 1)
      const h2 = hash(i, 41, 2)
      const h3 = hash(i, 41, 3)
      if (h3 < 0.14) continue
      const w = sp * (0.55 + 0.4 * h2)
      const x = i * sp + (sp - w) * h1
      const tall = h3 > 0.91
      const h = s * (0.5 + 0.75 * h1 * h2 + (tall ? 0.5 : 0))
      const top = L.base - h
      BODY.push(x, top, x + w, L.base + 3)
      if (h2 > 0.5) BODY.push(x + w * 0.18, top - 0.15 * s, x + w * 0.82, top + 0.01)
      if (tall) BODY.push(x + w * 0.5 - 0.011 * s, top - 0.5 * s, x + w * 0.5 + 0.011 * s, top - 0.1 * s)
      // The face toward the sun, once it is up.
      RIM.push(x, top, x + w * 0.3, L.base + 3)
      for (let j = 0; j < 7; j++) {
        if (hash(i, j, 43) >= lights) continue
        const wx = x + w * (0.15 + 0.65 * hash(i, j, 44))
        const wy = top + (h - 0.1 * s) * (0.08 + 0.6 * hash(i, j, 45))
        LIT.push(wx, wy, wx + 0.022 * s, wy + 0.018 * s)
      }
    }
    fillRects(pen, c.far, 1, BODY)
    fillRects(pen, '#FFD9A2', 0.28 * up, RIM)
    fillRects(pen, '#FFE4A8', 0.85, LIT)
  })
}

/** Smoke going up off a chimney and leaning off with the morning air: soft puffs, batched by how faint they are. */
const PUFFS: number[][] = [[], [], [], [], []]
function plume(sx: number, sy: number, s: number, t: number, seed: number): void {
  for (let i = 0; i < 16; i++) {
    const h = hash(i, seed, 71)
    const life = 8 + 3 * hash(i, seed, 72)
    const u = (((t / life + h) % 1) + 1) % 1
    const a = Math.min(1, u * 9) * (1 - u) * (1 - u)
    if (a < 0.03) continue
    const x = sx + s * (0.5 * u * u + 0.16 * u + 0.03 * Math.sin(t * 0.8 + i * 2.1) * u)
    const y = sy - s * (0.46 * u - 0.12 * u * u)
    const r = s * (0.022 + 0.085 * u)
    PUFFS[Math.min(4, Math.floor(a * 5))].push(x, y, r)
  }
}
function puffs(pen: Pen, col: string, alpha: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  for (let b = 0; b < 5; b++) {
    const list = PUFFS[b]
    if (!list.length) continue
    ctx.fillStyle = rgba(pen, col, alpha * ((b + 0.7) / 5))
    ctx.beginPath()
    for (let i = 0; i < list.length; i += 3) {
      ctx.moveTo((list[i] + list[i + 2]) * k, list[i + 1] * k)
      ctx.arc(list[i] * k, list[i + 1] * k, list[i + 2] * k, 0, Math.PI * 2)
    }
    ctx.fill()
    list.length = 0
  }
}

/** A water tank on its legs: staves, hoops and a cone of a roof. Pushed into the scratch lists. */
function tank(tx: number, top: number, ts: number): void {
  const legTop = top - ts * 0.9
  BODY.push(tx - ts * 0.86, legTop, tx - ts * 0.7, top, tx + ts * 0.7, legTop, tx + ts * 0.86, top)
  BODY.push(tx - ts, legTop - ts * 1.45, tx + ts, legTop)
  TRIM.push(tx - ts, legTop - ts * 0.5, tx + ts, legTop - ts * 0.42, tx - ts, legTop - ts * 1.05, tx + ts, legTop - ts * 0.97)
  TRI.push(tx - ts * 1.1, legTop - ts * 1.45, tx, legTop - ts * 2.25, tx + ts * 1.1, legTop - ts * 1.45)
}

/**
 * Tenement roofs: a row of them along the street, each with its cornice, and on them water tanks and chimneys, the
 * chimneys smoking. `tanks` and `chimneys` are shares of the roofs that carry one; `tall` lifts the row.
 */
export function roofs(pen: Pen, L: Look, d: number, o: { tanks: number; chimneys: number; tall: number; seed: number; dark?: boolean }): void {
  const c = tonesOf(L.t)
  const s = L.s
  const up = sunUp(L.t)
  const t = L.t
  within(pen, L, d, (xa, xb) => {
    const sp = (o.dark ? 0.95 : 0.62) * s
    for (let i = Math.floor(xa / sp) - 1; i <= Math.ceil(xb / sp); i++) {
      const h1 = hash(i, o.seed, 1)
      const h2 = hash(i, o.seed, 2)
      const h3 = hash(i, o.seed, 3)
      const w = sp * (0.88 + 0.12 * h3)
      const x = i * sp
      const h = s * (o.tall + (o.dark ? 0.18 : 0.3) * h1)
      const top = L.base - h
      BODY.push(x, top, x + w, L.base + 3)
      TRIM.push(x - 0.014 * s, top, x + w + 0.014 * s, top + 0.03 * s)
      RIM.push(x - 0.014 * s, top - 0.01 * s, x + w + 0.014 * s, top + 0.004 * s)
      if (h2 < o.tanks) tank(x + w * (0.25 + 0.5 * h3), top, 0.1 * s * (0.75 + 0.5 * h1) * (o.dark ? 1.35 : 1))
      else if (h2 > 1 - o.chimneys) {
        const cx = x + w * (0.12 + 0.76 * h3)
        BODY.push(cx - 0.024 * s, top - 0.1 * s, cx + 0.024 * s, top)
        TRIM.push(cx - 0.03 * s, top - 0.115 * s, cx + 0.03 * s, top - 0.095 * s)
        plume(cx, top - 0.11 * s, s, t, i * 7 + o.seed)
      }
    }
    puffs(pen, c.smoke, 0.32)
    fillRects(pen, o.dark ? c.near : c.mid, 1, BODY)
    fillTris(pen, o.dark ? c.near : c.mid, TRI)
    fillRects(pen, c.cornice, 1, TRIM)
    fillRects(pen, '#FFD9A2', 0.55 * up, RIM)
  })
}

/** The El, on its girders between the roofs: a train every so often, its windows lit, running along the street. */
export function el(pen: Pen, L: Look, d: number): void {
  const c = tonesOf(L.t)
  const s = L.s
  within(pen, L, d, (xa, xb) => {
    const y = L.base - 0.3 * s
    BODY.push(xa - 0.1, y, xb + 0.1, y + 0.035 * s)
    const step = 0.42 * s
    for (let i = Math.floor(xa / step); i <= Math.ceil(xb / step); i++) BODY.push(i * step, y, i * step + 0.02 * s, L.base + 3)
    // A train every `P` cells, at `v` cells a second, going right.
    const P = 8.5 * s
    const v = 0.55 * s
    const car = 0.3 * s
    const head0 = (((v * L.t) % P) + P) % P
    for (let m = Math.floor((xa - head0) / P); m <= Math.ceil((xb + 4 * car - head0) / P); m++) {
      const head = head0 + m * P
      for (let n = 0; n < 4; n++) {
        const x1 = head - n * (car + 0.02 * s)
        const x0 = x1 - car
        if (x1 < xa || x0 > xb) continue
        BODY.push(x0, y - 0.085 * s, x1, y - 0.004 * s)
        for (let j = 0; j < 4; j++) {
          const wx = x0 + car * (0.1 + 0.22 * j)
          LIT.push(wx, y - 0.068 * s, wx + 0.035 * s, y - 0.04 * s)
        }
      }
    }
    fillRects(pen, c.el, 1, BODY)
    fillRects(pen, '#FFE0A0', 0.9 - 0.5 * sunUp(L.t), LIT)
  })
}

/** Where pigeons sit before they go up: along a roof's edge from `x0` to `x1` at `y`, and when they lift. */
export interface Perch {
  x0: number
  x1: number
  y: number
  at: number
}

/**
 * Pigeons wheeling over the roofs round `at`, a flock of `n`, wings going. Given a `perch`, they sit along it until
 * it says, then go up off it one after another, beating hard, into the wheel.
 */
export function birds(pen: Pen, L: Look, d: number, at: Pt, n = 8, perch?: Perch): void {
  const c = tonesOf(L.t)
  const s = L.s
  const t = L.t
  within(pen, L, d, () => {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    const cx = at[0] + 0.45 * s * Math.sin(t * 0.16)
    const cy = at[1] + 0.1 * s * Math.sin(t * 0.21 + 1)
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const h = hash(i, 61, 1)
      const a = t * (0.62 + 0.22 * h) + i * 0.79
      const r = s * (0.16 + 0.24 * h)
      let x = cx + r * Math.cos(a)
      let y = cy + 0.38 * r * Math.sin(a) + 0.03 * s * Math.sin(t * 1.3 + i)
      // Flapping, then a glide.
      let beat = Math.sin(t * (8 + 3 * h) + i * 2.3) * (0.35 + 0.65 * Math.max(0, Math.sin(t * 0.9 + i)))
      const ws = 0.03 * s
      if (perch) {
        const go = perch.at + 0.09 * i + 0.25 * h
        const u = smooth(t, go, go + 1.6)
        if (u < 1) {
          const px = perch.x0 + (perch.x1 - perch.x0) * ((i + 0.5 + 0.3 * (h - 0.5)) / n)
          const py = perch.y - 0.018 * s
          // Up and away: a climb that leans toward the wheel, wings beating hard as they go.
          x = px + (x - px) * u
          y = py + (y - py) * u - 0.25 * s * Math.sin(Math.PI * u)
          if (u <= 0) {
            // Sitting: a small body with its head up, now and then a bob.
            const bob = 0.004 * s * Math.max(0, Math.sin(t * 2.3 + i * 1.7))
            ctx.moveTo((px - ws * 0.45) * k, (py - bob) * k)
            ctx.lineTo((px + ws * 0.35) * k, (py - 0.012 * s - bob) * k)
            continue
          }
          beat = Math.sin(t * 16 + i * 2.3)
        }
      }
      ctx.moveTo((x - ws) * k, (y - ws * 0.8 * beat) * k)
      ctx.lineTo(x * k, (y + 0.004 * s) * k)
      ctx.lineTo((x + ws) * k, (y - ws * 0.8 * beat) * k)
    }
    ctx.strokeStyle = rgba(pen, c.bird, 0.9)
    ctx.lineWidth = Math.max(1, 0.011 * s * k)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  })
}

/* ------------------------------------------------------------------ the far wing, across the court */

/** One of the far wing's people going along its corridor: an orderly pushing his trolley, or a nurse. */
function walker(x: number, foot: number, s: number, t: number, nurse: boolean, dir: number): void {
  const h = 0.27 * s
  const step = Math.sin(t * 5.2 + (nurse ? 1 : 0))
  const bob = 0.006 * s * Math.abs(step)
  const top = foot - h - bob
  // Legs, the body in white, the head; a cap for the nurse; his trolley ahead of him.
  TRIM.push(x - 0.018 * s + 0.012 * s * step, foot - 0.1 * s, x - 0.004 * s + 0.012 * s * step, foot, x + 0.004 * s - 0.012 * s * step, foot - 0.1 * s, x + 0.018 * s - 0.012 * s * step, foot)
  BODY.push(x - 0.03 * s, top + 0.06 * s, x + 0.03 * s, foot - (nurse ? 0.07 : 0.1) * s)
  if (nurse) BODY.push(x - 0.016 * s, top - 0.012 * s, x + 0.016 * s, top + 0.006 * s)
  LIT.push(x - 0.02 * s, top + 0.012 * s, x + 0.02 * s, top + 0.055 * s)
  if (!nurse) {
    const tx = x + dir * 0.1 * s
    BODY.push(tx - 0.07 * s, foot - 0.13 * s, tx + 0.07 * s, foot - 0.11 * s, tx - 0.065 * s, foot - 0.05 * s, tx + 0.065 * s, foot - 0.04 * s)
    TRIM.push(tx - 0.06 * s, foot - 0.11 * s, tx - 0.05 * s, foot - 0.01 * s, tx + 0.05 * s, foot - 0.11 * s, tx + 0.06 * s, foot - 0.01 * s)
    // His arms out to its handle.
    TRIM.push(x + Math.min(0, dir * 0.04 * s), foot - 0.15 * s, x + Math.max(0, dir * 0.04 * s), foot - 0.135 * s)
  }
}

/**
 * The hospital's far wing across the court, its face catching the sun: a row of windows above, and its corridor's
 * windows below, lit inside, where an orderly pushes his trolley along one way and a nurse comes the other.
 */
export function wing(pen: Pen, L: Look, d: number, top: number): void {
  const c = tonesOf(L.t)
  const t = L.t
  const s = L.s
  within(pen, L, d, (xa, xb) => {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    ctx.fillStyle = rgba(pen, c.wing, 1)
    ctx.fillRect((xa - 0.1) * k, top * k, (xb - xa + 0.2) * k, 4 * k)
    const col = 0.46 * s
    const a0 = top + 0.14 * s
    const a1 = top + 0.44 * s
    const b0 = top + 0.66 * s
    const b1 = top + 0.98 * s
    // The corridor's row: its light inside, and who is going along it.
    ctx.fillStyle = rgba(pen, '#F2E0BC', 1)
    ctx.fillRect((xa - 0.1) * k, b0 * k, (xb - xa + 0.2) * k, (b1 - b0) * k)
    const span = 5.2
    const ox = -4.7 - ((((t - 205) * 0.11) % span) + span) % span
    const nx = -7.9 + ((((t - 214) * 0.13) % span) + span) % span
    walker(ox, b1, s, t, false, -1)
    walker(nx, b1, s, t, true, 1)
    fillRects(pen, '#F8F6EF', 1, BODY)
    fillRects(pen, '#4E4A48', 1, TRIM)
    fillRects(pen, '#D9AE8C', 1, LIT)
    // The piers between the windows, over them; the upper row's glass, catching the sky.
    for (let i = Math.floor(xa / col) - 1; i <= Math.ceil(xb / col); i++) {
      const x = i * col
      BODY.push(x + 0.22 * s, b0 - 0.01, x + col + 0.06 * s, b1 + 0.01)
      TRIM.push(x + 0.06 * s, a0, x + 0.22 * s, a1)
      LIT.push(x + 0.06 * s, b1, x + 0.22 * s, b1 + 0.025 * s, x + 0.06 * s, a1, x + 0.22 * s, a1 + 0.025 * s)
      RIM.push(x + 0.135 * s, a0, x + 0.145 * s, a1, x + 0.135 * s, b0, x + 0.145 * s, b1)
    }
    fillRects(pen, c.wing, 1, BODY)
    fillRects(pen, c.pane, 1, TRIM)
    fillRects(pen, c.wingDark, 1, LIT)
    fillRects(pen, c.wingDark, 0.8, RIM)
    // Its cornice, and the shade under it.
    BODY.push(xa - 0.1, top - 0.05 * s, xb + 0.1, top + 0.03 * s)
    fillRects(pen, c.wingDark, 1, BODY)
    ctx.fillStyle = rgba(pen, '#3A3433', 0.12)
    ctx.fillRect((xa - 0.1) * k, (top + 0.03 * s) * k, (xb - xa + 0.2) * k, 0.05 * s * k)
    // The sun on its face, warm, once it is up.
    const up = sunUp(t)
    if (up > 0.01) {
      ctx.fillStyle = rgba(pen, '#FFD7A0', 0.22 * up)
      ctx.fillRect((xa - 0.1) * k, top * k, (xb - xa + 0.2) * k, 4 * k)
    }
  })
}
