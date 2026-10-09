import { mixHex } from '../../../../parts'
import { rgba } from './canvas'
import { GLASS, LAMP } from './desk'
import { MUSIC_END, smooth } from './music'
import { INK, MOUTH, hash, lampAt, lampColor, lit, rainAt } from './world'

/**
 * A moth, come in once the rain has stopped, to the lamp: the one small thing alive in the room through the clear
 * last part of the night. It circles the light in loose, uneven loops, close round the bulb and out again, and now and
 * then settles on the outside of the shade a while, its wings folded. Being so near the bulb, the lamp throws its
 * shadow big and soft across the wall behind, fluttering. The kitten watches it when it flies. And when the lamp is
 * turned down at the end, it leaves the light and goes to the moonlit window, and is there on the glass as the show
 * ends.
 *
 * A function of show time, like everything else: its loops are sums of slow sines, its rests set once, at load.
 */

type Ctx = CanvasRenderingContext2D

/** Its wingspan, cells (about three centimetres). */
const SPAN = 0.2

/** The shade's axis (from its hinge out through its mouth) and the normal to it on its upper side. */
const U = { x: MOUTH.ux, y: MOUTH.uy }
const N = { x: -MOUTH.uy, y: MOUTH.ux }
/** Where it loops: just out from the shade's mouth, in the light. */
const CENTRE = { x: MOUTH.x + U.x * 0.22, y: MOUTH.y + U.y * 0.22 }
/** Where it rests: on the shade's upper outside, a little back from the mouth, along the shade. */
const PERCH = { x: LAMP.hinge.x + U.x * 0.38 + N.x * 0.29, y: LAMP.hinge.y + U.y * 0.38 + N.y * 0.29 }
/** Where it goes at the end: on the glass, in the right-hand pane, toward the moon. */
const GLASS_SPOT = { x: GLASS.x1 - 0.85, y: GLASS.y0 + 1.6 }

/** When it comes: as the rain thins to the last of it after the storm. */
export const MOTH_IN = (() => {
  for (let t = 1200; t < MUSIC_END; t += 1) if (rainAt(t) < 0.3) return t
  return MUSIC_END
})()
/** When it leaves the light: as the knob is turned down (`hands.ts`), the lamp going. */
const MOTH_OUT = MUSIC_END - 0.5
/** How long its flight in takes, and its flight to the window. */
const ARRIVE = 7
const LEAVE = 5

/** Its rests on the shade: [from, to], each a while, a minute or so apart. */
const RESTS: [number, number][] = (() => {
  const out: [number, number][] = []
  let t = MOTH_IN + ARRIVE + 35
  let i = 0
  while (t < MOTH_OUT - 40) {
    const len = 18 + hash(i, 301) * 30
    out.push([t, t + len])
    t += len + 45 + hash(i, 302) * 50
    i++
  }
  return out
})()

/** How far it is settled on the shade, 0 flying to 1 settled, eased over a second each way. */
function restAt(t: number): number {
  let r = 0
  for (const [a, b] of RESTS) r = Math.max(r, smooth(t, a - 1.2, a) * (1 - smooth(t, b, b + 0.8)))
  return r
}

/** Where it loops round the light at `t`: loose and uneven, wider and narrower, fluttering. */
function loop(t: number): { x: number; y: number } {
  const r = 0.26 + 0.12 * Math.sin(t * 0.37) + 0.06 * Math.sin(t * 1.13 + 1)
  const a = t * 2.1 + 0.8 * Math.sin(t * 0.61)
  const jx = 0.018 * Math.sin(t * 23.1) + 0.012 * Math.sin(t * 37.7 + 2)
  const jy = 0.018 * Math.sin(t * 19.3 + 1) + 0.012 * Math.sin(t * 31.1)
  return { x: CENTRE.x + Math.cos(a) * r * 1.15 + jx, y: CENTRE.y + Math.sin(a) * r * 0.75 + jy }
}

const mix = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })

/**
 * Where the moth is at `t`, and how: `a`, there at all; `fly`, flying (its wings a blur) as against settled; `angle`,
 * which way its body lies; `glass`, how far it has gone to the window at the end.
 */
export function mothAt(t: number): { x: number; y: number; a: number; fly: number; angle: number; glass: number } {
  if (t < MOTH_IN) return { x: 0, y: 0, a: 0, fly: 0, angle: 0, glass: 0 }
  // In, from above the frame toward the light, wandering a little as it comes.
  const come = smooth(t, MOTH_IN, MOTH_IN + ARRIVE)
  const from = { x: CENTRE.x - 1.6, y: CENTRE.y - 2.6 }
  const wander = { x: Math.sin(t * 1.7) * 0.25 * (1 - come), y: Math.sin(t * 1.1) * 0.15 * (1 - come) }
  let p = mix({ x: from.x + wander.x, y: from.y + wander.y }, loop(t), come)
  const rest = restAt(t)
  p = mix(p, PERCH, rest)
  // Out to the glass as the light goes, and still there.
  const go = smooth(t, MOTH_OUT, MOTH_OUT + LEAVE)
  const settle = smooth(t, MOTH_OUT + LEAVE - 1, MOTH_OUT + LEAVE + 0.6)
  const drift = { x: GLASS_SPOT.x + 0.04 * Math.sin(t * 3.1) * (1 - settle), y: GLASS_SPOT.y + 0.03 * Math.sin(t * 2.3) * (1 - settle) }
  const mid = { x: (p.x + drift.x) / 2, y: Math.min(p.y, drift.y) - 0.5 }
  // A curve, not a line: up from the lamp and across.
  const q = mix(mix(p, mid, go), mix(mid, drift, go), go)
  const fly = Math.max(1 - rest, go) * (1 - settle)
  const angle = rest > 0.5 && go < 0.5 ? Math.atan2(U.y, U.x) - Math.PI / 2 : settle > 0.5 ? 0 : Math.sin(t * 0.9) * 0.4
  return { x: q.x, y: q.y, a: smooth(t, MOTH_IN, MOTH_IN + 1.5), fly, angle, glass: go }
}

const WING_LIT = '#F6E6C4'

/** The moth: a small soft body, and its wings, a pale blur flying, folded back into a little roof at rest. */
export function moth(ctx: Ctx, lw: number, t: number): void {
  const m = mothAt(t)
  if (m.a <= 0.01) return
  const lamp = lampAt(t)
  // Bright in the lamp's light near the bulb; dimmer on the shade's outside, and on the moonlit glass.
  const near = Math.max(0, 1 - Math.hypot(m.x - MOUTH.x, m.y - MOUTH.y) / 1.1)
  const l = Math.min(1, 0.25 + near * lamp * 1.1) * (1 - 0.5 * restAt(t)) * (1 - m.glass)
  // On the glass, moonlit: pale and cool against the night.
  const wingColor = mixHex(lit('#5C5248', WING_LIT, l), '#D9D6F0', 0.8 * m.glass)
  ctx.save()
  ctx.globalAlpha = m.a
  ctx.translate(m.x, m.y)
  ctx.rotate(m.angle)
  if (m.fly > 0.5) {
    // Flying, its wings beat too fast to see: a pale blur either side, flickering, and the body between.
    const beat = 0.55 + 0.45 * Math.abs(Math.sin(t * 41 + Math.sin(t * 7)))
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(side * SPAN * 0.27, -0.005, SPAN * 0.3, SPAN * 0.2 * beat, side * 0.35, 0, Math.PI * 2)
      ctx.fillStyle = rgba(wingColor, 0.62)
      ctx.fill()
      ctx.strokeStyle = rgba(INK, 0.3)
      ctx.lineWidth = lw * 0.45
      ctx.stroke()
    }
  } else {
    // Settled: the wings laid back along the body, a small rounded roof, a darker band across them.
    ctx.beginPath()
    ctx.moveTo(0, -SPAN * 0.2)
    ctx.quadraticCurveTo(SPAN * 0.32, SPAN * 0.05, SPAN * 0.2, SPAN * 0.32)
    ctx.lineTo(-SPAN * 0.2, SPAN * 0.32)
    ctx.quadraticCurveTo(-SPAN * 0.32, SPAN * 0.05, 0, -SPAN * 0.2)
    ctx.fillStyle = wingColor
    ctx.fill()
    ctx.strokeStyle = rgba(INK, 0.85)
    ctx.lineWidth = lw * 0.5
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-SPAN * 0.2, SPAN * 0.14)
    ctx.quadraticCurveTo(0, SPAN * 0.08, SPAN * 0.2, SPAN * 0.14)
    ctx.strokeStyle = rgba('#5C4A3A', 0.5)
    ctx.stroke()
  }
  // The body, and two feathered antennae.
  ctx.beginPath()
  ctx.ellipse(0, SPAN * 0.04, SPAN * 0.07, SPAN * 0.2, 0, 0, Math.PI * 2)
  ctx.fillStyle = lit('#3E342C', '#C9AE88', l)
  ctx.fill()
  ctx.strokeStyle = rgba(INK, 0.6)
  ctx.lineWidth = lw * 0.6
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * SPAN * 0.02, -SPAN * 0.15)
    ctx.quadraticCurveTo(side * SPAN * 0.1, -SPAN * 0.3, side * SPAN * 0.16, -SPAN * 0.32)
    ctx.stroke()
  }
  ctx.restore()
  // In the light, a little glow of its own off its wings.
  if (m.fly > 0.5 && near * lamp > 0.2) {
    const warm = lampColor(t)
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, SPAN * 0.9)
    g.addColorStop(0, rgba(warm, 0.18 * near * lamp * m.a))
    g.addColorStop(1, rgba(warm, 0))
    ctx.fillStyle = g
    ctx.fillRect(m.x - SPAN, m.y - SPAN, SPAN * 2, SPAN * 2)
  }
}

/**
 * Its shadow on the wall: the lamp, so close, throws it several times its size, soft, along the line from the bulb
 * through the moth, so it sweeps the wall as the moth loops and flutters as its wings do. Only while it is in the light
 * and the lamp is up. Drawn on the wall, behind everything on the desk.
 */
export function mothShadow(ctx: Ctx, t: number): void {
  const m = mothAt(t)
  const lamp = lampAt(t)
  if (m.a <= 0.01 || lamp < 0.3 || m.glass > 0.5) return
  const dx = m.x - MOUTH.x
  const dy = m.y - MOUTH.y
  const d = Math.hypot(dx, dy)
  // Only what the bulb lights: in front of the shade's mouth, not behind it.
  const ahead = (dx * U.x + dy * U.y) / (d || 1)
  const k = 3.4
  const a = 0.38 * m.a * lamp * smooth(ahead, -0.2, 0.3) * Math.max(0.35, 1 - d / 1.4) * (1 - 0.6 * restAt(t))
  if (a < 0.01) return
  const sx = MOUTH.x + dx * k
  const sy = MOUTH.y + dy * k
  const s = SPAN * k
  const beat = Math.abs(Math.sin(t * 41 + Math.sin(t * 7)))
  // A moth's shape, wings out, beating (they fold toward the body and open again), twice: a soft wide copy and a
  // firmer one inside it, so it reads as a shadow thrown from close to a bulb, not as a smudge.
  const shape = (g: number) => {
    const open = 0.35 + 0.65 * beat
    ctx.beginPath()
    for (const side of [-1, 1]) {
      ctx.moveTo(sx, sy - s * 0.12 * g)
      ctx.quadraticCurveTo(sx + side * s * 0.55 * open * g, sy - s * 0.35 * g, sx + side * s * 0.5 * open * g, sy + s * 0.05 * g)
      ctx.quadraticCurveTo(sx + side * s * 0.3 * open * g, sy + s * 0.3 * g, sx, sy + s * 0.12 * g)
    }
    ctx.ellipse(sx, sy, s * 0.06 * g, s * 0.22 * g, 0, 0, Math.PI * 2)
  }
  ctx.save()
  ctx.fillStyle = `rgba(14, 9, 26, ${(a * 0.45).toFixed(3)})`
  shape(1.25)
  ctx.fill()
  ctx.fillStyle = `rgba(14, 9, 26, ${(a * 0.6).toFixed(3)})`
  shape(1)
  ctx.fill()
  ctx.restore()
}
