import { rgba, viewOf } from './canvas'
import { GLASS, WINDOW } from './desk'
import { REACHES, handAt, mugAt } from './hands'
import { lensIn } from './lens'
import { camera } from './camera'
import { CLIMB, STRETCHES, snowLookAt } from './cat'
import { beatOf, drumsAt, smooth, trackAt } from './music'
import { flashAt, shootAt } from './sky'
import { hash, lampAt, lampColor, skyAt } from './world'

/**
 * Whoever sits at the desk, seen at last, the only way they could be: in the window. Once it is dark outside, the
 * glass is a mirror, and the lamp lights them in it, faint, behind the rain: hair up in a bun with a pencil through it,
 * the sage sweater the hand's sleeve is with its roll collar, head bowed over their work, the pen going along the lines,
 * nodding a little with the drums, breathing; the lamp they sit under beside them in the glass. Their reflection does
 * what the hand does: lifts the mug to their face for a sip, looks up from the work at the finger drawing on the glass,
 * and up when the lightning goes, a star falls, or the first snow comes (a moment after the kitten). Between, they write (the head going along the lines), and now and then stop with the pen at
 * their lips to look out at the night; and once, late, just after the kitten has, they stretch. They come with the lamp and go with it.
 *
 * A reflection is light on the glass, never dark: it only adds. It sits in front of the camera, as anyone's own
 * reflection does, so it is in the pane only when the camera faces the window, and gone at the edge of the glass.
 */

type Ctx = CanvasRenderingContext2D

/** Where the reflection sits when the camera looks at the window over the desk (`lens.ts`'s home): head, and size. */
const AT = { x: -0.62, y: -2.72 }
const HOME_X = 0.21
/** How much it moves with the camera: nearly all the way, as one's own reflection does. */
const FOLLOW = 0.85

const KNIT = '#8FA592'
const SKIN = '#F2B98E'
const HAIR = '#3E2822'

/** A small canvas the reflection is drawn into, laid over the glass soft: made once. */
let pad: HTMLCanvasElement | null = null
const RES = 160
const BOX = { x0: -1.25, y0: -1.0, x1: 1.25, y1: 1.15 }

/** How strongly the window shows them: the lamp on them, and the dark outside (the dusk outshines a reflection). */
export const reflectionSeen = (t: number): number => lampAt(t) * (1 - skyAt(t).dusk) ** 2 * smooth(t, 30, 90)

/** Where the reflection is, across, with the camera at `x`. */
const centreAt = (x: number): number => {
  // It moves with the camera, but eased into the right-hand pane at either side: whoever sits at the desk is in front
  // of that pane wherever the camera is in the room, so the desk's looks show them too, not only the window's.
  const raw = AT.x + FOLLOW * (x - HOME_X)
  const lo = WINDOW.mullion + 0.55
  const hi = GLASS.x1 - 0.5
  const mid = (lo + hi) / 2
  const half = (hi - lo) / 2
  return mid + half * Math.tanh((raw - mid) / half)
}

/** How long their stretch takes: arms up over the head, a yawn, and down. */
const REACH_UP = 5.5

/**
 * Their stretch: once, late, a moment after the kitten's (a stretch is catching), when the window shows them all
 * the while. Worked out once, at load.
 */
export const HUMAN_STRETCH: number = (() => {
  for (const s of [...STRETCHES].reverse()) {
    if (s < 0) continue
    // A moment after the kitten's, the first the window holds them all the while.
    for (let at = s + 7.5; at < s + 30; at += 0.5) {
      let ok = true
      for (let t = at - 0.5; t <= at + REACH_UP + 0.5 && ok; t += 0.5) {
        const cx = centreAt(camera(t).x)
        if (cx - 0.5 < GLASS.x0 || cx + 0.5 > GLASS.x1 || reflectionSeen(t) < 0.4) ok = false
      }
      if (ok) return at
    }
  }
  return -100
})()

/**
 * Thinking: now and then, between spells of writing, the pen comes up to their lips and they lift their head to look
 * out at the night a few seconds, then go back to it. At most once in each forty seconds, never while the hand is out.
 */
function thinkAt(t: number): number {
  const k = Math.floor(t / 40)
  if (hash(k, 401) > 0.18) return 0
  const at = k * 40 + 6 + hash(k, 402) * 22
  const s = t - at
  if (s < 0 || s > 8) return 0
  if (REACHES.some((r) => r.at < at + 9 && r.at + r.dur > at - 1)) return 0
  if (Math.abs(at - HUMAN_STRETCH) < 15) return 0
  return smooth(s, 0, 1.2) * (1 - smooth(s, 6.6, 8))
}

/** A page of their notebook lasts this long, and turning it takes this long. */
const PAGE = 150
const TURN = 1.5
/** They close the notebook a little before the kitten gets up for the sill, and so before the lamp goes down. */
const CLOSE_AT = CLIMB - 9

/**
 * Their notebook at `t`: how much of the page in hand is written (`lines`, 0 to 1), how far over the last page is being
 * turned (`turn`, 0 to 1, or 0 when none is), and how far it has been closed (`close`).
 */
function pageAt(t: number): { lines: number; turn: number; close: number } {
  const n = Math.floor(t / PAGE)
  const s = t - n * PAGE
  const turn = n > 0 && s < TURN ? smooth(s, 0, TURN) : 0
  const close = smooth(t, CLOSE_AT, CLOSE_AT + 1.8)
  const lines = Math.max(0, Math.min(1, (Math.min(t, CLOSE_AT) - n * PAGE - TURN) / (PAGE - TURN - 4)))
  return { lines, turn: close > 0 ? 0 : turn, close }
}

/** How the person in the window is, at `t`: how strongly seen, where the head is turned, the mug, the reach. */
function poseAt(t: number) {
  const seen = reflectionSeen(t)
  // Head bowed over the work; up to look out at a flash or a falling star; nodding a little with the drums.
  // And up at the first snow, a moment after the kitten does.
  const up = Math.max(flashAt(t).look, shootAt(t - 0.4).a, snowLookAt(t - 0.8).a)
  const tr = trackAt(t)
  const b = beatOf(tr, t)
  const f = b - Math.floor(b)
  const nod = drumsAt(t) * Math.exp(-((f - 0.15) ** 2) / 0.02) * (1 - up)
  const bow = 0.55 * (1 - up) + 0.04 * nod
  const m = mugAt(t)
  // Reaching up to draw on the glass, they look up from the work at what the finger does.
  const draw = REACHES.find((r) => r.kind === 'draw' && t > r.at && t < r.at + r.dur)
  const looking = draw ? handAt(t).a : 0
  // At the end, they look up from the work and down to the left, at the kitten climbing to the sill.
  const kitten = smooth(t, CLIMB + 1.5, CLIMB + 2.5) * (1 - smooth(t, CLIMB + 10.5, CLIMB + 11.5))
  const think = thinkAt(t) * (1 - up) * (1 - kitten)
  const st = t - HUMAN_STRETCH
  const stretch = st > 0 && st < REACH_UP ? smooth(st, 0, 1.4) * (1 - smooth(st, REACH_UP - 1.4, REACH_UP)) : 0
  // Writing: the head goes along a line and back to the start of the next, every few seconds.
  const line = (t / 3.3) % 1
  const scan = 0.035 * (line < 0.85 ? line / 0.85 : 1 - (line - 0.85) / 0.15) - 0.017
  const lifted = Math.max(looking, think, stretch, kitten)
  return { seen, bow: bow * (1 - lifted), sip: m.e * (1 - m.gone), think, stretch, scan: scan * (1 - lifted) * (1 - up), kitten, away: Math.max(lifted, up) }
}

/** The reflection, on the glass, after the night and before the window's frame. */
export function reflection(ctx: Ctx, t: number): void {
  const p = poseAt(t)
  if (p.seen < 0.02) return
  const lens = lensIn(ctx)
  const cx = centreAt(lens.x)
  const cy = AT.y
  // Mostly inside the glass, or not at all: no figure lurking at its edge.
  // Nor half cut by the frame's edge, a face peering in: wholly in the picture, or not shown.
  const v = viewOf(ctx)
  const framed = smooth(Math.min(cx - 0.55 - v.x0, v.x1 - (cx + 0.55)), -0.15, 0.1)
  const inside = smooth(Math.min(cx - 0.45 - GLASS.x0, GLASS.x1 - (cx + 0.45)), -0.6, 0.1) * framed
  const a = p.seen * inside
  if (a < 0.02) return
  pad ??= Object.assign(document.createElement('canvas'), { width: Math.ceil((BOX.x1 - BOX.x0) * RES), height: Math.ceil((BOX.y1 - BOX.y0) * RES) })
  const g = pad.getContext('2d') as Ctx
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, pad.width, pad.height)
  g.setTransform(RES, 0, 0, RES, -BOX.x0 * RES, -BOX.y0 * RES)
  const warm = lampColor(t)
  // Bowed over the work, the face goes down and forward and more of the top of the head shows.
  const breath = 0.008 * Math.sin((2 * Math.PI * t) / 4.2)
  const hy = 0.07 * p.bow - 0.04 * p.stretch + breath * 0.5
  // Thinking, the head turns a little toward the rain on the left, the eyes after it.
  const lean = 0.05 * p.bow + p.scan - 0.035 * p.think - 0.05 * p.kitten
  const hair = rgba(HAIR, 0.95)
  // The hair behind: falling past the shoulders either side of the face, in a few soft locks at its ends.
  g.fillStyle = hair
  g.beginPath()
  g.moveTo(-0.25, 0.36)
  g.bezierCurveTo(-0.32, 0.05, -0.27, -0.25 + hy, 0, -0.27 + hy)
  g.bezierCurveTo(0.27, -0.25 + hy, 0.33, 0.05, 0.26, 0.36)
  g.quadraticCurveTo(0.2, 0.4, 0.15, 0.33)
  g.quadraticCurveTo(0, 0.3, -0.15, 0.33)
  g.quadraticCurveTo(-0.2, 0.4, -0.25, 0.36)
  g.fill()
  // Shoulders, sloping from the neck, in the sweater, rising a little as they breathe; lit on the lamp's side, and
  // fading down into the dark (the desk and the room below take no light to throw back).
  const sy = breath
  const sw = g.createLinearGradient(0, 0.28, 0, 1.0)
  sw.addColorStop(0, rgba(KNIT, 0.85))
  sw.addColorStop(1, rgba(KNIT, 0))
  g.fillStyle = sw
  g.beginPath()
  g.moveTo(-0.11, 0.27 + sy)
  g.bezierCurveTo(-0.36, 0.3 + sy, -0.7, 0.36 + sy, -0.82, 0.62)
  g.lineTo(-0.9, 1.2)
  g.lineTo(0.9, 1.2)
  g.lineTo(0.82, 0.62)
  g.bezierCurveTo(0.7, 0.36 + sy, 0.36, 0.3 + sy, 0.11, 0.27 + sy)
  g.closePath()
  g.fill()
  // The lamp on the shoulder nearer it.
  const lit = g.createRadialGradient(0.62, 0.42, 0.02, 0.62, 0.42, 0.42)
  lit.addColorStop(0, rgba(warm, 0.55))
  lit.addColorStop(1, rgba(warm, 0))
  g.fillStyle = lit
  g.fillRect(0.1, 0.1, 0.9, 0.8)
  // The neck, and the sweater's ribbed roll collar round it.
  g.fillStyle = rgba(SKIN, 0.7)
  g.fillRect(-0.055, 0.15 + hy * 0.5, 0.11, 0.14)
  g.fillStyle = rgba(KNIT, 0.98)
  g.beginPath()
  g.ellipse(0, 0.3 + sy, 0.16, 0.065, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = rgba('#6E8472', 0.7)
  g.lineWidth = 0.008
  g.beginPath()
  for (const rx of [-0.1, -0.05, 0, 0.05, 0.1]) {
    g.moveTo(rx, 0.26 + sy)
    g.lineTo(rx * 1.05, 0.34 + sy)
  }
  g.stroke()
  // Their notebook, open on the desk under the lamp: in the glass, the brightest thing they have, a warm page lit from
  // above, its ruled lines and the lines they have written on it (darker: what gives back less light), filling as they
  // write. A page full, they turn it: the leaf lifts off the right and goes over to the left, and the page under it is
  // new. At the end, before the lamp goes down, they close it.
  {
    const py0 = 0.72
    const py1 = 1.12
    const F = 0.315
    const pg = pageAt(t)
    // A leaf on the right, turned `u` of the way over (0 flat on the right, 1 flat on the left), lifting as it goes.
    const at = (x: number, y: number, u: number) => ({
      x: F + (x - F) * Math.cos(Math.PI * u),
      y: y - 0.09 * Math.sin(Math.PI * u) * ((x - F) / 0.6),
    })
    const leaf = (u: number, fill: string, lines: number) => {
      const c = [at(F, py0, u), at(0.78, py0, u), at(0.92, py1, u), at(F, py1, u)]
      g.beginPath()
      g.moveTo(c[0].x, c[0].y)
      for (const q of c.slice(1)) g.lineTo(q.x, q.y)
      g.closePath()
      g.fillStyle = fill
      g.fill()
      // Its writing, on its face while its face is up.
      if (lines > 0 && Math.cos(Math.PI * u) > 0.05) {
        g.strokeStyle = rgba('#5A4436', 0.55)
        g.lineWidth = 0.009
        g.beginPath()
        for (let k = 0; k < 7; k++) {
          const y = py0 + 0.045 + k * 0.05
          const lx0 = 0.36 + 0.02 * (k / 7)
          const lx1 = 0.8 + 0.12 * (k / 7)
          const full = Math.max(0, Math.min(1, lines * 7 - k))
          if (full <= 0) break
          // In short words, with gaps between.
          for (let x = lx0; x < lx0 + (lx1 - lx0) * full; x += 0.07) {
            const e = Math.min(x + 0.04 + 0.02 * hash(k, Math.floor(x * 100), 611), lx0 + (lx1 - lx0) * full)
            const q0 = at(x, y, u)
            const q1 = at(e, y, u)
            g.moveTo(q0.x, q0.y)
            g.lineTo(q1.x, q1.y)
          }
        }
        g.stroke()
      }
    }
    const paper = (k: number) => rgba('#FFEBCB', 0.95 * k)
    // The left page, written full.
    const left = g.createLinearGradient(-0.24, 0, F, 0)
    left.addColorStop(0, rgba('#E9D2B0', 0.55))
    left.addColorStop(1, rgba('#F6E0BE', 0.8))
    g.fillStyle = left
    g.beginPath()
    g.moveTo(-0.12, py0)
    g.lineTo(F, py0)
    g.lineTo(F, py1)
    g.lineTo(-0.24, py1)
    g.closePath()
    g.fill()
    g.strokeStyle = rgba('#5A4436', 0.55)
    g.lineWidth = 0.009
    g.beginPath()
    for (let k = 0; k < 7; k++) {
      const y = py0 + 0.045 + k * 0.05
      for (let x = -0.08 - 0.02 * (k / 7); x < 0.27; x += 0.07) {
        g.moveTo(x, y)
        g.lineTo(x + 0.04 + 0.02 * hash(k, Math.floor(x * 100) + 50, 612), y)
      }
    }
    g.stroke()
    // The right page, the one in hand (until it is closed over).
    if (pg.close < 0.001) leaf(0, paper(1), pg.lines)
    // A page turning over, with what was written on it.
    if (pg.turn > 0 && pg.turn < 1) leaf(pg.turn, paper(0.55 + 0.45 * Math.abs(Math.cos(Math.PI * pg.turn))), 1)
    // Closing: the right page goes over onto the left, and then it is the cover that shows, dark.
    if (pg.close > 0.001) {
      leaf(pg.close, paper(0.55 + 0.45 * Math.abs(Math.cos(Math.PI * pg.close))), pg.lines)
      const shut = smooth(pg.close, 0.85, 1)
      if (shut > 0) {
        g.fillStyle = rgba('#B07A5E', 0.9 * shut)
        g.beginPath()
        g.moveTo(-0.12, py0 - 0.01)
        g.lineTo(F + 0.01, py0 - 0.01)
        g.lineTo(F + 0.01, py1)
        g.lineTo(-0.24, py1)
        g.closePath()
        g.fill()
      }
    }
    // The fold down the middle.
    g.fillStyle = rgba('#000000', 0.18 * (1 - smooth(pg.close, 0.8, 1)))
    g.fillRect(F - 0.006, py0, 0.012, py1 - py0)
  }
  // The writing arm: the forearm along the desk to the hand and its pen, which goes along the line as the head does.
  // (Off the page while it turns, and put down once the book is shut.)
  const pgw = pageAt(t)
  const write = (1 - Math.max(p.think, p.stretch, p.kitten)) * (1 - p.sip) * (1 - Math.sin(Math.PI * pgw.turn)) * (1 - smooth(pgw.close, 0, 0.3))
  if (write > 0.02) {
    // On the line it is writing, along it as the head goes.
    const done = pageAt(t).lines
    const row = Math.min(6, Math.floor(done * 7))
    const hx = 0.4 + 0.45 * (done * 7 - row) + p.scan * 0.6
    const hyw = 0.72 + 0.045 + row * 0.05
    g.globalAlpha = write
    const arm = g.createLinearGradient(0.7, 0.55, hx, hyw)
    arm.addColorStop(0, rgba(KNIT, 0.6))
    arm.addColorStop(1, rgba(KNIT, 0.25))
    g.strokeStyle = arm
    g.lineWidth = 0.17
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(0.66, 0.52)
    g.quadraticCurveTo(0.66, 0.82, hx + 0.12, hyw)
    g.stroke()
    g.fillStyle = rgba(SKIN, 0.5)
    g.beginPath()
    g.ellipse(hx, hyw - 0.01, 0.07, 0.05, -0.3, 0, Math.PI * 2)
    g.fill()
    // The pen, its end catching the lamp, moving a little as it writes.
    // (Still while they look up from the page.)
    const wig = 0.012 * Math.sin(t * 11) * (1 - p.away)
    g.strokeStyle = rgba(warm, 0.75)
    g.lineWidth = 0.016
    g.beginPath()
    g.moveTo(hx - 0.04, hyw + 0.02)
    g.lineTo(hx + 0.07 + wig, hyw - 0.14)
    g.stroke()
    g.globalAlpha = 1
  }
  // The face, bowed, the lamp's light on the cheek nearer it; the ear on that side.
  g.fillStyle = rgba(SKIN, 0.75)
  g.beginPath()
  g.ellipse(0.15 + lean * 0.8, 0.05 + hy, 0.035, 0.05, 0, 0, Math.PI * 2)
  g.fill()
  const face = g.createLinearGradient(-0.16, 0, 0.16, 0)
  face.addColorStop(0, rgba(SKIN, 0.4))
  face.addColorStop(1, rgba(SKIN, 0.95))
  g.fillStyle = face
  g.beginPath()
  // A softer chin than an oval: rounder at the top, narrowing a little to it.
  const fx = lean
  const fy = 0.03 + hy
  const fh = 0.19 - 0.03 * p.bow
  g.moveTo(fx - 0.15, fy - 0.02)
  g.bezierCurveTo(fx - 0.15, fy - fh * 1.05, fx + 0.15, fy - fh * 1.05, fx + 0.15, fy - 0.02)
  g.bezierCurveTo(fx + 0.15, fy + fh * 0.7, fx + 0.05, fy + fh, fx, fy + fh)
  g.bezierCurveTo(fx - 0.05, fy + fh, fx - 0.15, fy + fh * 0.7, fx - 0.15, fy - 0.02)
  g.fill()
  // A little colour in the cheeks.
  g.fillStyle = rgba('#F08A7E', 0.35)
  for (const cxk of [-0.085, 0.095]) {
    g.beginPath()
    g.ellipse(fx + cxk, fy + 0.07, 0.03, 0.018, 0, 0, Math.PI * 2)
    g.fill()
  }
  // Eyes: lowered lids over the work, open when they look up.
  g.strokeStyle = rgba(HAIR, 0.9)
  g.lineWidth = 0.018
  g.lineCap = 'round'
  for (const ex of [-0.06, 0.07]) {
    const x = ex + lean
    const y = 0.04 + hy
    g.beginPath()
    if (p.bow > 0.3 || p.stretch > 0.3) {
      g.moveTo(x - 0.03, y)
      g.quadraticCurveTo(x, y + 0.02, x + 0.03, y)
    } else {
      g.arc(x - 0.045 * p.think - 0.05 * p.kitten, y - 0.012 * p.think + 0.012 * p.kitten, 0.014, 0, Math.PI * 2)
    }
    g.stroke()
  }
  // The fringe, swept to one side over the brow, the crown, and the bun with a pencil through it; the lamp along the
  // bun's edge and down the hair on its side.
  g.fillStyle = hair
  g.beginPath()
  g.moveTo(-0.17 + lean * 0.6, -0.04 + hy)
  g.bezierCurveTo(-0.2 + lean * 0.6, -0.22 + hy, 0.16 + lean * 0.6, -0.26 + hy, 0.18 + lean * 0.6, -0.06 + hy)
  g.quadraticCurveTo(0.09 + lean, -0.1 + hy + 0.03 * p.bow, 0.02 + lean, -0.02 + hy + 0.04 * p.bow)
  g.quadraticCurveTo(-0.07 + lean, -0.08 + hy + 0.02 * p.bow, -0.17 + lean * 0.6, -0.04 + hy)
  g.fill()
  const bx = -0.05
  const by = -0.3 + hy * 0.5
  g.strokeStyle = rgba('#E4B45E', 0.85)
  g.lineWidth = 0.016
  g.beginPath()
  g.moveTo(bx - 0.15, by + 0.07)
  g.lineTo(bx + 0.13, by - 0.08)
  g.stroke()
  g.fillStyle = hair
  g.beginPath()
  g.arc(bx, by, 0.09, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = rgba('#E4B45E', 0.85)
  g.beginPath()
  g.moveTo(bx + 0.06, by - 0.035)
  g.lineTo(bx + 0.13, by - 0.08)
  g.stroke()
  g.strokeStyle = rgba(warm, 0.85)
  g.lineWidth = 0.022
  g.beginPath()
  g.arc(bx, by, 0.09, -1.3, 0.5)
  g.stroke()
  g.beginPath()
  g.ellipse(0, -0.02 + hy, 0.24, 0.25, 0, -1.1, 0.2)
  g.stroke()
  // A sip: the mug up to their mouth.
  if (p.sip > 0.02) {
    g.globalAlpha = p.sip
    const my = 0.1 + hy + (1 - p.sip) * 0.5
    g.fillStyle = rgba('#EBB0AA', 1)
    g.fillRect(0.02, my, 0.2, 0.24)
    g.strokeStyle = rgba('#EBB0AA', 1)
    g.lineWidth = 0.035
    g.beginPath()
    g.arc(0.24, my + 0.11, 0.06, -1.3, 1.3)
    g.stroke()
    g.fillStyle = rgba(SKIN, 0.8)
    g.beginPath()
    g.ellipse(0.2, 0.3 + hy + (1 - p.sip) * 0.5, 0.07, 0.09, 0, 0, Math.PI * 2)
    g.fill()
    g.globalAlpha = 1
  }
  // Thinking: the hand up at the chin, the pen's end against the lip.
  if (p.think > 0.02) {
    const ty = 0.2 + hy + (1 - p.think) * 0.6
    g.globalAlpha = p.think
    g.strokeStyle = rgba(KNIT, 0.8)
    g.lineWidth = 0.14
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(0.45, 0.95)
    g.lineTo(0.17 + lean, ty + 0.12)
    g.stroke()
    g.fillStyle = rgba(SKIN, 0.95)
    g.beginPath()
    g.ellipse(0.12 + lean, ty, 0.065, 0.075, 0.4, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = rgba(warm, 0.9)
    g.lineWidth = 0.018
    g.beginPath()
    g.moveTo(0.1 + lean, ty - 0.02)
    g.lineTo(0.03 + lean, ty - 0.13)
    g.stroke()
    g.globalAlpha = 1
  }
  // Their stretch: both arms up over the head, hands together at the top, a yawn.
  if (p.stretch > 0.02) {
    const k = p.stretch
    g.globalAlpha = k
    g.strokeStyle = rgba(KNIT, 0.7)
    g.lineWidth = 0.14
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const side of [-1, 1]) {
      g.beginPath()
      // Shoulder up to a wide elbow beside the head, then the forearm in over the top of it.
      g.moveTo(side * 0.48, 0.48)
      g.lineTo(side * (0.48 + 0.04 * k), 0.48 - 0.6 * k)
      g.lineTo(side * 0.1, 0.48 - 0.95 * k)
      g.stroke()
    }
    g.fillStyle = rgba(SKIN, 0.95)
    g.beginPath()
    g.ellipse(0, 0.48 - 1.0 * k, 0.09, 0.07, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = rgba(HAIR, 0.9)
    g.beginPath()
    g.ellipse(lean, 0.12 + hy, 0.03, 0.04 * k, 0, 0, Math.PI * 2)
    g.fill()
    g.globalAlpha = 1
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0)
  ctx.clip()
  // Light on the glass: it only adds.
  ctx.globalCompositeOperation = 'screen'
  // A little stronger in the wide frames, where they are small.
  ctx.globalAlpha = 0.36 * a * (1 + 0.3 * smooth(lens.size, 5.0, 5.6))
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(pad, cx + BOX.x0, cy + BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0)
  // Beside them in the glass, the lamp they sit under: its bulb a warm point in the shade's mouth, and its light round it.
  const lx = cx + 0.9
  const ly = cy - 0.42
  ctx.globalAlpha = a
  const lg = ctx.createRadialGradient(lx, ly, 0.01, lx, ly, 0.55)
  lg.addColorStop(0, rgba(warm, 0.3))
  lg.addColorStop(0.15, rgba(warm, 0.1))
  lg.addColorStop(1, rgba(warm, 0))
  ctx.fillStyle = lg
  ctx.fillRect(lx - 0.6, ly - 0.6, 1.2, 1.2)
  ctx.fillStyle = rgba('#FFF1D8', 0.22)
  ctx.beginPath()
  ctx.ellipse(lx, ly + 0.02, 0.05, 0.022, 0, 0, Math.PI * 2)
  ctx.fill()
  // Its light going down onto their page, and the desk's edge lit along the foot of the glass.
  const pg = ctx.createLinearGradient(lx, ly, cx + 0.35, cy + 0.9)
  pg.addColorStop(0, rgba(warm, 0.12))
  pg.addColorStop(1, rgba(warm, 0.02))
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.moveTo(lx - 0.06, ly + 0.03)
  ctx.lineTo(lx + 0.06, ly + 0.03)
  ctx.lineTo(cx + 0.95, cy + 0.85)
  ctx.lineTo(cx - 0.2, cy + 0.85)
  ctx.closePath()
  ctx.fill()
  const ey = cy + 1.16
  const edge = ctx.createLinearGradient(0, ey - 0.03, 0, ey + 0.03)
  edge.addColorStop(0, rgba(warm, 0))
  edge.addColorStop(0.5, rgba(warm, 0.22))
  edge.addColorStop(1, rgba(warm, 0))
  ctx.fillStyle = edge
  ctx.fillRect(cx - 1.25, ey - 0.03, 2.5, 0.06)
  ctx.restore()
}
