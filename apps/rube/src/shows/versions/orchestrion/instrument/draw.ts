import type p5 from 'p5'
import { BAR_HALF, GAP, PIPE_BORE, PIPE_WALL, RAIL_HALF, RAIL_Y, RELEASE_X, ROLL_Y, METAL_E, type Part } from './design'
import { CUP, LIFT_SPEED, tickTime, type Performance } from './run'
import type { Note } from './score'
import { BALL_R } from './sim'
import { BAYS, TICK } from './tuning'
import { barRing, chimeRing, stringRing } from './voices'

/**
 * The instrument, drawn. A dim room and a lamp; the parts in their own materials, quiet until they are struck. What
 * sounds glows, in its bay's light, for as long as it rings (the same decay the voice has), so the picture shows
 * the music as well as the machine: a string trembles, a bar lights and fades, a pipe warms while the ball is in it
 * and a little after.
 *
 * In cells, on the canvas with the stage's transform scaled by a cell. Nothing is written.
 */

/** Where the bowl stands, beside the lift's foot. */
export const BOWL_X = (liftX: number): number => liftX - 1.65

export const COLORS = {
  bg: '#14161B',
  bgTop: '#1A1D24',
  bgLow: '#0E1014',
  pool: '#3B3327',
  wood: '#3B3029',
  woodLight: '#5A4A3D',
  woodDark: '#241D18',
  alu: '#BAC1C8',
  aluLight: '#E8ECEF',
  aluDark: '#78808A',
  rose: '#8A5240',
  roseLight: '#B67E63',
  roseDark: '#57332A',
  string: '#D8CFB8',
  peg: '#B59258',
  brass: '#B08B50',
  brassLight: '#E0C389',
  brassDark: '#6A512E',
  mouth: '#17120E',
  chrome: '#B2B8BE',
  chromeDark: '#6D747B',
  felt: '#2D3934',
  glass: '#A9BEC8',
  chain: '#5C534A',
  ball: '#EFE9DD',
  ballShade: '#9E988C',
  light: '#FFF6E4',
}

type G = CanvasRenderingContext2D

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const ease = (v: number) => {
  const x = clamp(v)
  return x * x * (3 - 2 * x)
}

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}
function mix(a: string, b: string, f: number): string {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  const k = clamp(f)
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${h(r1 + (r2 - r1) * k)}${h(g1 + (g2 - g1) * k)}${h(b1 + (b2 - b1) * k)}`
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`
}

/** The struck notes of one part, in time order: when and how hard. */
interface Hits {
  t: number[]
  v: number[]
  u: number[]
}

function lastIndex(ts: number[], t: number): number {
  let lo = 0
  let hi = ts.length - 1
  if (hi < 0 || ts[0] > t) return -1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ts[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** How much a part is sounding at `t`: its hits, each dying away over `tau`. */
function envelope(h: Hits | undefined, t: number, tau: number): number {
  if (!h) return 0
  let i = lastIndex(h.t, t)
  let sum = 0
  while (i >= 0) {
    const age = t - h.t[i]
    if (age > tau * 5) break
    sum += (h.v[i] / 13.5) * Math.exp(-age / tau)
    i--
  }
  return Math.min(1.4, sum)
}

/** Where the frame is, in cells. */
function viewOf(g: G): { x0: number; y0: number; x1: number; y1: number } {
  const m = g.getTransform().inverse()
  const c = g.canvas
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [px, py] of [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height]]) {
    const x = m.a * px + m.c * py + m.e
    const y = m.b * px + m.d * py + m.f
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1 }
}

export interface Drawing {
  draw(p: p5, t: number, k: number): void
  over(p: p5, t: number, k: number): void
}

export function makeDrawing(perf: Performance, list: Note[]): Drawing {
  const m = perf.machine
  const hits = new Map<number, Hits>()
  for (const n of list) {
    if (n.part < 0) continue
    let h = hits.get(n.part)
    if (!h) hits.set(n.part, (h = { t: [], v: [], u: [] }))
    h.t.push(n.t)
    // A pipe's breath is the ball's speed through it, a little softened.
    h.v.push(n.kind === 'pipe' ? 13.5 * Math.min(1.2, n.v / 18) : n.kind === 'chime' ? 13.5 : n.kind === 'pipe-knock' ? 0 : n.v)
    h.u.push(n.u)
  }
  const pipeBreath = new Map<number, { tIn: number[]; tOut: number[] }>()
  for (const g of perf.passages) {
    let b = pipeBreath.get(g.part)
    if (!b) pipeBreath.set(g.part, (b = { tIn: [], tOut: [] }))
    b.tIn.push(g.tIn)
    b.tOut.push(g.tOut)
  }
  const hue = (bay: number) => BAYS[bay]?.hue ?? COLORS.light
  const bars = m.parts.filter((p) => p.kind === 'bar')
  const strings = m.parts.filter((p) => p.kind === 'string')
  const pipes = m.parts.filter((p) => p.kind === 'pipe')
  const chimes = m.parts.filter((p) => p.kind === 'chime')
  const cx = (m.box.x0 + m.box.x1) / 2
  const cy = (m.box.y0 + m.box.y1) / 2

  const trackLen = Math.hypot(m.track.x1 - m.track.x0, m.track.y1 - m.track.y0)
  const jarAt = (() => {
    const s = trackLen * 0.55
    return { x: m.track.x1 + ((m.track.x0 - m.track.x1) / trackLen) * s, y: m.track.y1 + ((m.track.y0 - m.track.y1) / trackLen) * s }
  })()

  /** A step function's value at `t`. */
  const stepAt = (steps: [number, number][], t: number): number => {
    let v = steps[0][1]
    for (const [at, n] of steps) {
      if (at > t) break
      v = n
    }
    return v
  }

  /** How far open each flap is, 0 to 1, at `t`. */
  const flapOpen = (i: number, t: number): number => {
    const times = perf.flaps[i]
    let open = 0
    for (let j = 0; j < times.length; j++) {
      if (times[j] > t) break
      const f = ease((t - times[j]) / 0.12)
      open = j % 2 === 0 ? f : 1 - f
    }
    return open
  }

  /* ---------------------------------------------------------------- pieces */

  function background(g: G, t: number): void {
    const v = viewOf(g)
    const sky = g.createLinearGradient(0, v.y0, 0, v.y1)
    sky.addColorStop(0, COLORS.bgTop)
    sky.addColorStop(1, COLORS.bgLow)
    g.fillStyle = sky
    g.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, v.y1 - v.y0 + 2)
    // The lamp: a warm pool behind the instrument, breathing very slightly with how much is sounding.
    const r = Math.max(m.box.x1 - m.box.x0, m.box.y1 - m.box.y0) * 0.62
    const pool = g.createRadialGradient(cx, cy - 1, 0, cx, cy - 1, r)
    pool.addColorStop(0, rgba(COLORS.pool, 0.55))
    pool.addColorStop(0.55, rgba(COLORS.pool, 0.18))
    pool.addColorStop(1, rgba(COLORS.pool, 0))
    g.fillStyle = pool
    g.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, v.y1 - v.y0 + 2)
    void t
  }

  function frame(g: G, px: number): void {
    // The beam the chimes hang from, and the posts at either end down to the trough.
    const beamX0 = chimes[0].ax - 0.9
    const beamX1 = chimes[chimes.length - 1].ax + 0.9
    g.fillStyle = COLORS.wood
    g.fillRect(beamX0, m.beamY - 0.14, beamX1 - beamX0, 0.28)
    g.fillStyle = COLORS.woodLight
    g.fillRect(beamX0, m.beamY - 0.14, beamX1 - beamX0, Math.max(px, 0.035))
    // The trough: a wooden channel lined with felt, down to the lift's foot.
    g.strokeStyle = COLORS.wood
    g.lineWidth = 0.16
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(m.troughX0 - 0.1, m.troughY(m.troughX0) + 0.08)
    g.lineTo(m.troughX1 + 0.2, m.troughY(m.troughX1) + 0.08)
    g.stroke()
    g.strokeStyle = COLORS.felt
    g.lineWidth = 0.05
    g.beginPath()
    g.moveTo(m.troughX0, m.troughY(m.troughX0) + 0.015)
    g.lineTo(m.troughX1, m.troughY(m.troughX1) + 0.015)
    g.stroke()
    // The trough's end stop on the right.
    g.fillStyle = COLORS.wood
    g.fillRect(m.troughX1 + 0.12, m.troughY(m.troughX1) - 0.45, 0.16, 0.6)
  }

  function rail(g: G, t: number, px: number): void {
    const y = RAIL_Y
    g.fillStyle = COLORS.brassDark
    let from = m.rail.x0
    const pieces: [number, number][] = []
    for (const gate of m.gates) {
      pieces.push([from, gate.x0])
      from = gate.x1
    }
    pieces.push([from, m.rail.x1])
    for (const [a, b] of pieces) {
      g.fillStyle = COLORS.brass
      g.fillRect(a, y - RAIL_HALF, b - a, RAIL_HALF * 2)
      g.fillStyle = COLORS.brassLight
      g.fillRect(a, y - RAIL_HALF, b - a, Math.max(px, 0.02))
    }
    // The rail's end over the last bay: a small stop.
    g.fillStyle = COLORS.brassDark
    g.fillRect(m.rail.x1 - 0.02, y - RAIL_HALF, 0.04, RAIL_HALF * 2)
    // The flaps: hinged at their left end, swung down when their gate is open.
    m.gates.forEach((gate, i) => {
      const open = flapOpen(i, t)
      const a = open * 1.35
      g.save()
      g.translate(gate.x0, y)
      g.rotate(a)
      g.fillStyle = mix(COLORS.brass, COLORS.brassDark, open * 0.5)
      g.fillRect(0, -RAIL_HALF, GAP, RAIL_HALF * 2)
      g.restore()
      g.fillStyle = COLORS.brassDark
      g.beginPath()
      g.arc(gate.x0, y, 0.05, 0, Math.PI * 2)
      g.fill()
    })
  }

  function escapement(g: G, t: number): void {
    // A star wheel behind the seated ball, a sixth of a turn at every tick.
    const n = Math.floor((t - tickTime(0)) / TICK)
    const into = (t - tickTime(n)) / TICK
    const turn = (n + ease(into / 0.22)) * ((Math.PI * 2) / 6)
    const x = RELEASE_X - 0.12
    const y = ROLL_Y + 0.02
    g.save()
    g.translate(x, y)
    g.rotate(turn)
    g.fillStyle = COLORS.brassDark
    g.beginPath()
    for (let i = 0; i < 12; i++) {
      const r = i % 2 === 0 ? 0.36 : 0.22
      const a = (i / 12) * Math.PI * 2
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.closePath()
    g.fill()
    g.fillStyle = COLORS.brass
    g.beginPath()
    g.arc(0, 0, 0.08, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }

  function chimesAndHammers(g: G, t: number, px: number): void {
    chimes.forEach((c) => {
      const h = hits.get(c.id)
      const i = h ? lastIndex(h.t, t) : -1
      const since = i >= 0 ? t - h!.t[i] : Infinity
      const swing = since < 12 ? 0.035 * Math.exp(-since / 2.6) * Math.sin(2 * Math.PI * 0.52 * since) : 0
      const glow = envelope(h, t, chimeRing * 0.55)
      const topY = m.beamY
      g.save()
      g.translate(c.ax, topY)
      g.rotate(swing)
      // Its cord.
      g.strokeStyle = COLORS.chain
      g.lineWidth = Math.max(px, 0.018)
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(0, c.ay - topY)
      g.stroke()
      // The tube, lit from the lamp's side.
      const w = 0.17
      const grad = g.createLinearGradient(-w / 2, 0, w / 2, 0)
      grad.addColorStop(0, mix(COLORS.chromeDark, hue(c.bay), glow * 0.5))
      grad.addColorStop(0.35, mix(COLORS.chrome, COLORS.light, glow * 0.6))
      grad.addColorStop(1, mix(COLORS.chromeDark, hue(c.bay), glow * 0.3))
      g.fillStyle = grad
      g.fillRect(-w / 2, c.ay - topY, w, c.len)
      g.fillStyle = COLORS.chromeDark
      g.fillRect(-w / 2 - 0.015, c.ay - topY, w + 0.03, 0.06)
      g.restore()
      // Its mallet: hung from the beam beside it, drawn back as the gate's count comes round and let fall against
      // the tube's foot as the gate opens, then swinging slowly back to rest.
      const rod = c.len * 0.8
      const px0 = c.ax + 0.36
      const touch = Math.asin(Math.min(0.99, (0.36 - 0.085 - 0.06) / rod))
      let a = 0
      const next = h ? h.t.find((x) => x > t) : undefined
      if (next !== undefined && next - t < 0.5) a = -0.22 * ease(1 - (next - t) / 0.5)
      if (since < 0.5) a = since < 0.06 ? touch * (1 - since / 0.06) + 0 : 0
      if (since >= 0.06 && since < 8) a = -0.08 * Math.exp(-since / 1.6) * Math.sin(2 * Math.PI * 0.6 * (since - 0.06))
      if (since < 0.06) a = touch
      g.save()
      g.translate(px0, topY)
      g.rotate(a)
      g.strokeStyle = COLORS.chain
      g.lineWidth = Math.max(px, 0.016)
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(0, rod)
      g.stroke()
      g.fillStyle = COLORS.felt
      g.beginPath()
      g.ellipse(0, rod, 0.06, 0.075, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    })
  }

  function lift(g: G, t: number, px: number): void {
    const x = m.liftX
    const back = x - 0.62
    const top = m.liftHead - 0.05
    const foot = m.liftFoot - BALL_R
    const r = 0.31
    // The chain's two runs, and its sprockets.
    g.strokeStyle = COLORS.chain
    g.lineWidth = Math.max(px, 0.025)
    g.beginPath()
    g.moveTo(x + 0.0, top)
    g.lineTo(x + 0.0, foot)
    g.moveTo(back, top)
    g.lineTo(back, foot)
    g.stroke()
    for (const sy of [top, foot]) {
      const turn = (t * LIFT_SPEED) / r
      g.save()
      g.translate((x + back) / 2, sy)
      g.rotate(turn)
      g.strokeStyle = COLORS.woodLight
      g.lineWidth = 0.05
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.stroke()
      g.lineWidth = Math.max(px, 0.03)
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3
        g.beginPath()
        g.moveTo(0, 0)
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        g.stroke()
      }
      g.fillStyle = COLORS.brassDark
      g.beginPath()
      g.arc(0, 0, 0.06, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    // The cups: going up on the right run with a ball's seat in each, coming down empty and upside down on the left.
    const phase = (t * LIFT_SPEED) % CUP
    g.strokeStyle = COLORS.brass
    g.lineWidth = 0.045
    g.lineCap = 'round'
    for (let s = phase; s < foot - top; s += CUP) {
      const y = foot - s
      g.beginPath()
      g.arc(x, y, BALL_R + 0.05, 0.15 * Math.PI, 0.85 * Math.PI)
      g.stroke()
      const yd = top + s
      g.beginPath()
      g.arc(back, yd, BALL_R + 0.05, 1.15 * Math.PI, 1.85 * Math.PI)
      g.stroke()
    }
  }

  function track(g: G, px: number): void {
    const { x0, y0, x1, y1 } = m.track
    const l = Math.hypot(x1 - x0, y1 - y0)
    const nx = -(y1 - y0) / l
    const ny = (x1 - x0) / l
    // The rail under the balls' centres.
    const off = BALL_R + 0.03
    const sx = ny > 0 ? 1 : -1
    g.strokeStyle = COLORS.brass
    g.lineWidth = 0.06
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x0 + nx * off * sx, y0 + ny * off * sx)
    g.lineTo(x1 + nx * off * sx, y1 + ny * off * sx)
    g.stroke()
    void px
  }

  /** The balls held in a vessel, packed from the bottom: `n` of them, rows of `per` and `per - 1` in turn. */
  function pile(g: G, x: number, bottom: number, width: number, n: number): void {
    const per = Math.max(1, Math.floor(width / (2 * BALL_R) + 1e-6))
    let row = 0
    let left = n
    while (left > 0) {
      const inRow = Math.min(left, row % 2 === 0 ? per : Math.max(1, per - 1))
      const full = row % 2 === 0 ? per : Math.max(1, per - 1)
      const by = bottom - BALL_R - row * BALL_R * 1.74
      for (let c = 0; c < inRow; c++) ball(g, x + (c - (full - 1) / 2) * 2 * BALL_R, by, 1)
      left -= inRow
      row++
    }
  }

  function jar(g: G, t: number, px: number): void {
    const n = stepAt(perf.jar, t)
    const w = 1.3
    const bottom = jarAt.y - BALL_R - 0.16
    const top = bottom - 2.3
    g.save()
    g.fillStyle = rgba(COLORS.glass, 0.05)
    g.strokeStyle = rgba(COLORS.glass, 0.4)
    g.lineWidth = Math.max(px, 0.03)
    g.beginPath()
    g.moveTo(jarAt.x - w / 2, top)
    g.lineTo(jarAt.x - w / 2, bottom - 0.2)
    g.quadraticCurveTo(jarAt.x - w / 2, bottom, jarAt.x - 0.16, bottom + 0.02)
    g.lineTo(jarAt.x + 0.16, bottom + 0.02)
    g.quadraticCurveTo(jarAt.x + w / 2, bottom, jarAt.x + w / 2, bottom - 0.2)
    g.lineTo(jarAt.x + w / 2, top)
    g.fill()
    g.stroke()
    g.restore()
    pile(g, jarAt.x, bottom - 0.02, w - 0.1, n)
    // Its glass in front of them: a pale band.
    g.fillStyle = rgba(COLORS.glass, 0.07)
    g.fillRect(jarAt.x - w / 2 + 0.12, top + 0.15, 0.1, bottom - top - 0.4)
  }

  function bowl(g: G, t: number, px: number): void {
    const n = stepAt(perf.bowl, t)
    const x = BOWL_X(m.liftX)
    const y = m.liftFoot + 0.12
    const w = 0.98
    pile(g, x, y - 0.03, 1.62, n)
    g.fillStyle = COLORS.wood
    g.beginPath()
    g.moveTo(x - w, y - 0.36)
    g.quadraticCurveTo(x - w * 0.92, y + 0.14, x, y + 0.16)
    g.quadraticCurveTo(x + w * 0.92, y + 0.14, x + w, y - 0.36)
    g.lineTo(x + w - 0.09, y - 0.36)
    g.quadraticCurveTo(x + w * 0.8, y + 0.03, x, y + 0.04)
    g.quadraticCurveTo(x - w * 0.8, y + 0.03, x - w + 0.09, y - 0.36)
    g.closePath()
    g.fill()
    void px
  }

  function bar(g: G, part: Part, t: number, px: number): void {
    const metal = part.e >= METAL_E
    const glow = envelope(hits.get(part.id), t, barRing(part.hz, metal) * 0.6)
    const dx = part.bx - part.ax
    const dy = part.by - part.ay
    const l = Math.hypot(dx, dy)
    const ang = Math.atan2(dy, dx)
    const h = hits.get(part.id)
    const i = h ? lastIndex(h.t, t) : -1
    const since = i >= 0 ? t - h!.t[i] : Infinity
    // It dips a hair as it is struck, and rings back.
    const dip = since < 0.25 ? 0.025 * Math.exp(-since / 0.05) * Math.cos(since * 70) : 0
    g.save()
    g.translate(part.ax, part.ay)
    g.rotate(ang)
    g.translate(0, dip)
    // Its two felt pins, at the nodes (0.224 of the way in from each end), on which a free bar rests.
    g.fillStyle = COLORS.felt
    for (const at of [0.224, 0.776]) {
      g.fillRect(at * l - 0.025, BAR_HALF, 0.05, 0.12)
    }
    const base = metal ? COLORS.alu : COLORS.rose
    const light = metal ? COLORS.aluLight : COLORS.roseLight
    const dark = metal ? COLORS.aluDark : COLORS.roseDark
    const lit = Math.min(1, glow * 0.75)
    g.fillStyle = mix(base, metal ? hue(part.bay) : light, lit * 0.55)
    g.beginPath()
    g.roundRect(0, -BAR_HALF, l, BAR_HALF * 2, BAR_HALF * 0.6)
    g.fill()
    g.fillStyle = mix(light, COLORS.light, lit)
    g.fillRect(0.02, -BAR_HALF, l - 0.04, Math.max(px, BAR_HALF * 0.45))
    g.fillStyle = dark
    g.fillRect(0.02, BAR_HALF - Math.max(px, BAR_HALF * 0.35), l - 0.04, Math.max(px, BAR_HALF * 0.35))
    g.restore()
  }

  function string(g: G, part: Part, t: number, px: number): void {
    const h = hits.get(part.id)
    const ring = stringRing(part.hz)
    const amp = envelope(h, t, Math.min(0.9, ring * 0.25)) * 0.07
    const glow = envelope(h, t, ring * 0.35)
    const dx = part.bx - part.ax
    const dy = part.by - part.ay
    const l = Math.hypot(dx, dy)
    const nx = -dy / l
    const ny = dx / l
    // The blur of its swing: a lens as wide as it is swinging.
    if (amp > 0.002) {
      g.fillStyle = rgba(hue(part.bay), Math.min(0.32, amp * 4))
      g.beginPath()
      const N = 24
      for (let i = 0; i <= N; i++) {
        const s = i / N
        const d = Math.sin(Math.PI * s) * amp
        const x = part.ax + dx * s + nx * d
        const y = part.ay + dy * s + ny * d
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      for (let i = N; i >= 0; i--) {
        const s = i / N
        const d = -Math.sin(Math.PI * s) * amp
        g.lineTo(part.ax + dx * s + nx * d, part.ay + dy * s + ny * d)
      }
      g.fill()
    }
    // The string itself, caught mid-swing.
    const wob = Math.sin(t * 2 * Math.PI * 9.3 + part.id) * amp * 0.6
    g.strokeStyle = mix(COLORS.string, COLORS.light, glow * 0.8)
    g.lineWidth = Math.max(px * 1.4, 0.036)
    g.beginPath()
    g.moveTo(part.ax, part.ay)
    g.quadraticCurveTo(part.ax + dx / 2 + nx * wob * 2, part.ay + dy / 2 + ny * wob * 2, part.bx, part.by)
    g.stroke()
    // Its pegs.
    g.fillStyle = COLORS.peg
    for (const [x, y] of [[part.ax, part.ay], [part.bx, part.by]]) {
      g.beginPath()
      g.arc(x, y, 0.065, 0, Math.PI * 2)
      g.fill()
    }
  }

  function pipe(g: G, part: Part, t: number, px: number): void {
    const b = pipeBreath.get(part.id)
    // Warm while a ball is in it, and a little after.
    let breath = 0
    if (b) {
      let i = lastIndex(b.tIn, t)
      while (i >= 0 && t - b.tIn[i] < 3) {
        const inside = t >= b.tIn[i] && t <= b.tOut[i]
        const after = t > b.tOut[i] ? Math.exp(-(t - b.tOut[i]) / 0.55) : 0
        breath = Math.max(breath, inside ? ease((t - b.tIn[i]) / 0.06) : after)
        i--
      }
    }
    const w = PIPE_BORE + PIPE_WALL * 2
    const x0 = part.ax - w / 2
    const grad = g.createLinearGradient(x0, 0, x0 + w, 0)
    const warm = breath * 0.55
    // At rest the brass is in the lamp's shadow; a ball in the bore warms it.
    grad.addColorStop(0, mix(COLORS.brassDark, COLORS.woodDark, 0.4))
    grad.addColorStop(0.32, mix(mix(COLORS.brass, COLORS.brassLight, 0.3 + warm * 0.7), hue(part.bay), warm * 0.5))
    grad.addColorStop(0.55, mix(mix(COLORS.brassDark, COLORS.brass, 0.6), COLORS.brassLight, warm))
    grad.addColorStop(1, mix(COLORS.brassDark, COLORS.woodDark, 0.3))
    g.fillStyle = grad
    g.fillRect(x0, part.ay, w, part.len)
    // The mouth, open, and the foot.
    g.fillStyle = COLORS.mouth
    g.beginPath()
    g.ellipse(part.ax, part.ay, w / 2 - 0.03, 0.07, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = COLORS.brassLight
    g.lineWidth = Math.max(px, 0.025)
    g.beginPath()
    g.ellipse(part.ax, part.ay, w / 2, 0.085, 0, Math.PI, Math.PI * 2)
    g.stroke()
    g.fillStyle = COLORS.brassDark
    g.fillRect(x0 - 0.02, part.by - 0.07, w + 0.04, 0.07)
  }

  function ball(g: G, x: number, y: number, scale: number): void {
    const r = BALL_R * scale
    const grad = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r)
    grad.addColorStop(0, '#FFFFFF')
    grad.addColorStop(0.35, COLORS.ball)
    grad.addColorStop(1, COLORS.ballShade)
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }

  function balls(g: G, t: number): void {
    for (const tr of perf.tracks) {
      const i = lastIndex(tr.t, t)
      if (i < 0) continue
      if (!tr.shown[i]) continue
      let x = tr.x[i]
      let y = tr.y[i]
      if (i + 1 < tr.t.length && tr.shown[i + 1] && tr.t[i + 1] > tr.t[i]) {
        const f = (t - tr.t[i]) / (tr.t[i + 1] - tr.t[i])
        x += (tr.x[i + 1] - x) * f
        y += (tr.y[i + 1] - y) * f
      }
      ball(g, x, y, 1)
    }
  }

  /** The light of what is sounding, laid over everything with an additive hand. */
  function glows(g: G, t: number): void {
    g.save()
    g.globalCompositeOperation = 'lighter'
    const spot = (x: number, y: number, r: number, color: string, a: number) => {
      if (a < 0.01) return
      const grad = g.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, rgba(color, a))
      grad.addColorStop(1, rgba(color, 0))
      g.fillStyle = grad
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    for (const b of bars) {
      const a = envelope(hits.get(b.id), t, barRing(b.hz, b.e >= METAL_E) * 0.6)
      spot((b.ax + b.bx) / 2, (b.ay + b.by) / 2, 0.45 + b.len * 0.5, hue(b.bay), a * 0.22)
    }
    for (const s of strings) {
      const h = hits.get(s.id)
      const a = envelope(h, t, stringRing(s.hz) * 0.3)
      if (a < 0.01 || !h) continue
      const i = lastIndex(h.t, t)
      const u = h.u[i]
      spot(s.ax + (s.bx - s.ax) * u, s.ay + (s.by - s.ay) * u, 0.9, hue(s.bay), a * 0.18)
    }
    for (const c of chimes) {
      const a = envelope(hits.get(c.id), t, chimeRing * 0.5)
      spot(c.ax, (c.ay + c.by) / 2, 1.4, hue(c.bay), a * 0.16)
    }
    g.restore()
  }

  function pipeGlows(g: G, t: number): void {
    g.save()
    g.globalCompositeOperation = 'lighter'
    for (const p of pipes) {
      const b = pipeBreath.get(p.id)
      if (!b) continue
      let a = 0
      let i = lastIndex(b.tIn, t)
      while (i >= 0 && t - b.tIn[i] < 3) {
        a = Math.max(a, t <= b.tOut[i] ? ease((t - b.tIn[i]) / 0.06) : Math.exp(-(t - b.tOut[i]) / 0.6))
        i--
      }
      if (a < 0.01) continue
      const grad = g.createRadialGradient(p.ax, p.ay, 0, p.ax, p.ay, 1.3)
      grad.addColorStop(0, rgba(hue(p.bay), a * 0.28))
      grad.addColorStop(1, rgba(hue(p.bay), 0))
      g.fillStyle = grad
      g.fillRect(p.ax - 1.3, p.ay - 1.3, 2.6, 2.6)
    }
    g.restore()
  }

  return {
    draw(p, t, k) {
      const g = p.drawingContext as G
      g.save()
      g.scale(k, k)
      const px = 1 / k
      background(g, t)
      frame(g, px)
      chimesAndHammers(g, t, px)
      lift(g, t, px)
      track(g, px)
      escapement(g, t)
      rail(g, t, px)
      for (const s of strings) string(g, s, t, px)
      for (const b of bars) bar(g, b, t, px)
      jar(g, t, px)
      balls(g, t)
      bowl(g, t, px)
      g.restore()
    },
    over(p, t, k) {
      const g = p.drawingContext as G
      g.save()
      g.scale(k, k)
      const px = 1 / k
      for (const q of pipes) pipe(g, q, t, px)
      pipeGlows(g, t)
      glows(g, t)
      g.restore()
    },
  }
}
