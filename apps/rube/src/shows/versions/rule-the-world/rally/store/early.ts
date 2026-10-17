import type { Pt } from '../../../../../parts'
import { sway } from '../depth'
import { hash } from '../kit'
import { ctxOf, ellipse, mix, rgba, shape, type Pen } from '../pen'

/**
 * The street's early risers, through the store's front window while Marty ticks on the counter: a man in a hat
 * walking his dog the length of the block on the far pavement (it stops to nose at the snow, and pulls on again); the
 * bakery's boy riding off on his bicycle with the morning's bread in the basket; and pigeons along the cornice
 * across the street, shuffling, bobbing, one or another shaking its wings. Each is drawn in its own layer's cells by
 * the street (`street.ts`), so it moves with the street's depth as the camera goes.
 */

type Box = [number, number, number, number]
const INK = '#151A20'

/** The far pavement, where the man and the dog walk. */
const PAVE = -0.15
/** The man: where he is (his feet's middle), walking right at a stroll from before the first frame. */
const manX = (t: number): number => -2.6 + 0.27 * t
/** The dog stops to nose at the snow, and trots on to its lead again. */
const SNIFF: [number, number] = [4.6, 5.9]
function dogX(t: number): number {
  const lead = 0.36
  if (t < SNIFF[0]) return manX(t) + lead
  const held = manX(SNIFF[0]) + lead
  if (t < SNIFF[1]) return held
  // Back out to the end of its lead at a trot.
  return Math.min(manX(t) + lead, held + 0.75 * (t - SNIFF[1]))
}

/** The man walking his dog, and the bakery's boy on his bicycle: in the street's layer. */
export function drawEarly(pen: Pen, t: number, w: Box, dawn: number): void {
  const ink = mix(INK, '#2A3038', dawn * 0.6)
  man(pen, t, w, ink)
  bicycle(pen, t, w, ink)
}

function man(pen: Pen, t: number, w: Box, ink: string): void {
  const x = manX(t)
  const dx = dogX(t)
  if (x - 0.3 > w[2] && dx - 0.2 > w[2]) return
  if (dx + 0.2 < w[0]) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const h = 0.48
  const step = t * 5.2
  const bob = 0.008 * Math.abs(Math.sin(step))
  const top = PAVE - h - bob
  // His legs, scissoring under the coat.
  ctx.save()
  ctx.strokeStyle = rgba(pen, ink, 1)
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.028 * k
  ctx.beginPath()
  for (const ph of [0, Math.PI]) {
    const s = Math.sin(step + ph)
    ctx.moveTo(x * k, (PAVE - 0.17) * k)
    ctx.lineTo((x + 0.075 * s) * k, (PAVE - 0.005) * k)
  }
  ctx.stroke()
  ctx.restore()
  // The overcoat, the head, the hat; his arm out with the lead.
  shape(pen, [[x - 0.085, PAVE - 0.15], [x + 0.085, PAVE - 0.15], [x + 0.065, top + 0.12], [x + 0.04, top + 0.085], [x - 0.05, top + 0.085], [x - 0.07, top + 0.12]], ink)
  ellipse(pen, [x + 0.008, top + 0.05], 0.035, 0.04, ink)
  shape(pen, [[x - 0.06, top + 0.025], [x + 0.075, top + 0.025], [x + 0.06, top + 0.012], [x + 0.04, top - 0.03], [x - 0.03, top - 0.03], [x - 0.045, top + 0.012]], ink)
  const hand: Pt = [x + 0.08, PAVE - 0.24 + 0.006 * Math.sin(step)]
  shape(pen, [[x + 0.03, top + 0.13], [x + 0.055, top + 0.12], [hand[0] + 0.012, hand[1]], [hand[0] - 0.01, hand[1] + 0.01]], ink)
  // The dog: a little terrier, trotting ahead on its lead, or nose down in the snow.
  const sniffing = t >= SNIFF[0] && t < SNIFF[1]
  const trot = sniffing ? 0 : 1
  const g = t * 11
  const body: Pt = [dx, PAVE - 0.07 - 0.006 * Math.abs(Math.sin(g)) * trot]
  const nose = sniffing ? 0.035 + 0.01 * Math.sin(t * 9) : 0
  ctx.save()
  ctx.strokeStyle = rgba(pen, ink, 1)
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.016 * k
  ctx.beginPath()
  for (const [ox, ph] of [[0.05, 0], [0.035, Math.PI], [-0.05, Math.PI], [-0.035, 0]] as const) {
    ctx.moveTo((dx + ox) * k, (body[1] + 0.02) * k)
    ctx.lineTo((dx + ox + 0.02 * Math.sin(g + ph) * trot) * k, (PAVE - 0.003) * k)
  }
  // Its tail up and going.
  ctx.moveTo((dx - 0.07) * k, (body[1] - 0.01) * k)
  ctx.lineTo((dx - 0.1 + 0.012 * Math.sin(t * 14)) * k, (body[1] - 0.06) * k)
  // The lead, from his hand to its collar, slack while it sniffs.
  const collar: Pt = [dx + 0.06, body[1] - 0.025 + nose * 0.6]
  ctx.lineWidth = Math.max(0.5, 0.005 * k)
  ctx.moveTo(hand[0] * k, hand[1] * k)
  ctx.quadraticCurveTo(((hand[0] + collar[0]) / 2) * k, (Math.max(hand[1], collar[1]) + 0.02 + (sniffing ? 0.05 : 0)) * k, collar[0] * k, collar[1] * k)
  ctx.stroke()
  ctx.restore()
  ellipse(pen, body, 0.075, 0.032, ink)
  ellipse(pen, [dx + 0.075, body[1] - 0.03 + nose], 0.03, 0.026, ink)
  ellipse(pen, [dx + 0.1, body[1] - 0.02 + nose * 1.1], 0.018, 0.012, ink)
  shape(pen, [[dx + 0.06, body[1] - 0.05 + nose], [dx + 0.075, body[1] - 0.085 + nose], [dx + 0.085, body[1] - 0.05 + nose]], ink)
}

/** The bakery's boy, off with the bread: in the road's far lane, pedalling right, as the lamps go on in the store. */
const RIDE: [number, number] = [9.3, 13.8]
function bicycle(pen: Pen, t: number, w: Box, ink: string): void {
  if (t < RIDE[0] || t > RIDE[1]) return
  const x = -3.25 + 1.0 * (t - RIDE[0])
  if (x - 0.3 > w[2] || x + 0.3 < w[0]) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const r = 0.075
  const y = -0.1 - r
  const back: Pt = [x - 0.13, y]
  const front: Pt = [x + 0.13, y]
  const crank: Pt = [x - 0.01, y + 0.01]
  const turn = (t - RIDE[0]) * 7
  ctx.save()
  ctx.strokeStyle = rgba(pen, ink, 1)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // The wheels, their spokes turning.
  ctx.lineWidth = Math.max(0.6, 0.012 * k)
  ctx.beginPath()
  for (const c of [back, front]) {
    ctx.moveTo((c[0] + r) * k, c[1] * k)
    ctx.arc(c[0] * k, c[1] * k, r * k, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.lineWidth = Math.max(0.5, 0.005 * k)
  ctx.beginPath()
  for (const c of [back, front]) {
    for (let i = 0; i < 3; i++) {
      const a = turn * 2.2 + (i * Math.PI) / 3
      ctx.moveTo((c[0] + Math.cos(a) * r) * k, (c[1] + Math.sin(a) * r) * k)
      ctx.lineTo((c[0] - Math.cos(a) * r) * k, (c[1] - Math.sin(a) * r) * k)
    }
  }
  ctx.stroke()
  // The frame, the bars, the saddle.
  const seat: Pt = [x - 0.05, y - 0.12]
  const bars: Pt = [x + 0.1, y - 0.13]
  ctx.lineWidth = Math.max(0.6, 0.012 * k)
  ctx.beginPath()
  for (const [a, b] of [[back, crank], [crank, front], [crank, seat], [back, seat], [seat, bars], [bars, front]] as [Pt, Pt][]) {
    ctx.moveTo(a[0] * k, a[1] * k)
    ctx.lineTo(b[0] * k, b[1] * k)
  }
  // His legs on the pedals, going round.
  ctx.lineWidth = 0.022 * k
  const hip: Pt = [seat[0] + 0.01, seat[1] - 0.02]
  for (const ph of [0, Math.PI]) {
    const pd: Pt = [crank[0] + 0.045 * Math.cos(turn + ph), crank[1] + 0.045 * Math.sin(turn + ph)]
    const knee: Pt = [(hip[0] + pd[0]) / 2 + 0.05, (hip[1] + pd[1]) / 2 - 0.02]
    ctx.moveTo(hip[0] * k, hip[1] * k)
    ctx.lineTo(knee[0] * k, knee[1] * k)
    ctx.lineTo(pd[0] * k, pd[1] * k)
  }
  ctx.stroke()
  ctx.restore()
  // Him, leaning over the bars, in a cap; the basket on the front with the loaves.
  shape(pen, [[hip[0] - 0.02, hip[1] + 0.01], [hip[0] + 0.03, hip[1] + 0.01], [bars[0] - 0.01, bars[1] - 0.02], [bars[0] - 0.04, bars[1] - 0.09], [hip[0], hip[1] - 0.15]], ink)
  ellipse(pen, [bars[0] - 0.03, bars[1] - 0.14], 0.03, 0.032, ink)
  shape(pen, [[bars[0] - 0.065, bars[1] - 0.155], [bars[0] + 0.015, bars[1] - 0.16], [bars[0] - 0.01, bars[1] - 0.18], [bars[0] - 0.055, bars[1] - 0.18]], ink)
  shape(pen, [[bars[0] + 0.0, bars[1] + 0.01], [bars[0] + 0.12, bars[1] + 0.01], [bars[0] + 0.11, bars[1] + 0.08], [bars[0] + 0.01, bars[1] + 0.08]], mix(ink, '#6A5034', 0.5))
  for (let i = 0; i < 3; i++) ellipse(pen, [bars[0] + 0.03 + i * 0.035, bars[1] + 0.005], 0.022, 0.016, '#B88A52')
}

/**
 * Pigeons along the cornice across the street, roosting till it is light: each shuffles along a little, bobs its head,
 * and now and then one shakes its wings out. In the tenements' layer.
 */
export function drawPigeons(pen: Pen, t: number, w: Box, ledge: number, dawn: number): void {
  const col = mix('#262C34', '#5A626C', dawn)
  for (let i = 0; i < 6; i++) {
    const x0 = -0.45 + i * 0.16 + 0.05 * hash(i, 1, 141)
    const x = x0 + 0.03 * sway(t, 140 + i, 5 + i)
    if (x < w[0] - 0.1 || x > w[2] + 0.1) continue
    const dir = hash(i, 2, 141) > 0.5 ? 1 : -1
    const bob = 0.008 * Math.max(0, Math.sin(t * (2.2 + 0.4 * i) + i * 2)) ** 2
    const y = ledge - 0.022
    ellipse(pen, [x, y], 0.034, 0.02, col)
    ellipse(pen, [x + dir * 0.03, y - 0.022 + bob], 0.013, 0.013, col)
    // Now and then a shake of the wings.
    const cyc = (t + 2.7 * i) % 6.5
    if (cyc < 0.45) {
      const up = Math.sin((cyc / 0.45) * Math.PI) * Math.abs(Math.sin(t * 30))
      shape(pen, [[x - 0.02, y - 0.01], [x - dir * 0.02, y - 0.05 * up - 0.012], [x + 0.025, y - 0.01]], col)
    }
  }
}
