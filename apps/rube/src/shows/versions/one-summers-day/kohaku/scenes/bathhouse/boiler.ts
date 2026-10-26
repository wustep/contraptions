import type { Light } from '../../light'
import { box, circle, ellipse, fill, hash, ink, knock, lerp, lit, mix, poly, pool, rgba, smooth, smoother, sway, vgrad, type Paint, type Pt } from '../../paint'
import { BATH } from '../../geo'
import { CATCH, COAL, CUT_BOILER, CUT_HALL, DRAWER, HERBS } from './beats'

/**
 * The boiler room at the foot of the bathhouse, opened up for the token's arrival: Kamaji on his dais before his wall
 * of herb drawers, his six long arms at work; the furnace with its fire; the soot carrying coal to it a lump a note;
 * the pipe going up from the furnace through the ceiling to the spout in the hall. The token comes down its cord from
 * the hall, a hand takes it, another pulls a drawer, a third tips the herbs into the hopper on the pipe, and the hot
 * water goes up.
 */

const B = BATH.boiler
const FLOOR = B.y1
const PIPE_X = BATH.spout[0]
/** The fire's light: everything in here is lit by it. */
const FIRE = '#FFD3A0'

/** The cord the token comes down from the hall, and where its end is. */
const CORD_TOP: Pt = [65.15, B.y0]
const CORD_END: Pt = [65.15, 2.0]
const HOPPER: Pt = [PIPE_X, 2.05]
const DRAWERS = { x0: 63.4, x1: 65.95, y0: 1.6, y1: 3.0, cols: 6, rows: 4 }
const KAMAJI = { x: 64.8, seat: 3.25 }
const MOUTH = { x0: 67.25, x1: 68.15, y0: 3.12, y1: 3.68 }

/** The token's place: down the cord from the ceiling, then in the hand that takes it, up to his glasses. */
function tokenAt(t: number): Pt | null {
  if (t < CUT_BOILER - 0.05) return null
  const down = smoother(t, CUT_BOILER, CATCH - 0.25)
  const p: Pt = [CORD_TOP[0], lerp(CORD_TOP[1] - 0.05, CORD_END[1], down)]
  if (t < CATCH) return p
  const look = smoother(t, CATCH, CATCH + 0.35)
  return [lerp(p[0], KAMAJI.x + 0.15, look), lerp(p[1], 2.18, look)]
}

/** One arm: from its shoulder, through its elbow, to its hand, eased between the places it is sent. */
interface Arm {
  shoulder: Pt
  rest: Pt
  /** [time, where the hand goes, how long it takes] */
  goes: [number, Pt, number][]
}

const sh = (dx: number, dy: number): Pt => [KAMAJI.x + dx, 2.62 + dy]

const ARMS: Arm[] = [
  // The token's arm: up to the cord's end, takes it, brings it to his eyes.
  { shoulder: sh(0.16, -0.02), rest: [65.25, 2.55], goes: [[CATCH - 0.35, CORD_END, 0.35], [CATCH + 0.05, [KAMAJI.x + 0.18, 2.2], 0.35]] },
  // The drawer's arm: up behind him to a drawer, pulls it out.
  { shoulder: sh(-0.16, -0.02), rest: [63.95, 2.55], goes: [[DRAWER - 0.35, [63.98, 1.93], 0.35], [DRAWER, [63.98, 2.12], 0.18]] },
  // The herbs' arm: a pinch from the drawer, to the hopper, tipped in.
  { shoulder: sh(0.2, 0.08), rest: [65.6, 2.95], goes: [[DRAWER + 0.1, [64.1, 2.05], 0.3], [HERBS - 0.35, HOPPER, 0.35]] },
  // The three others at their own slow work: grinding, stirring, resting on the dais.
  { shoulder: sh(-0.2, 0.08), rest: [63.75, 3.12], goes: [] },
  { shoulder: sh(0.12, 0.16), rest: [65.4, 3.2], goes: [] },
  { shoulder: sh(-0.12, 0.16), rest: [64.05, 3.22], goes: [] },
]

function handOf(arm: Arm, t: number, i: number): Pt {
  let p: Pt = arm.rest
  const idle = 0.03 * Math.sin(t * 1.8 + i * 1.7)
  p = [p[0] + idle, p[1] + idle * 0.5]
  for (const [at, to, dur] of arm.goes) {
    const u = smoother(t, at, at + dur)
    p = [lerp(p[0], to[0], u), lerp(p[1], to[1], u)]
  }
  // Back to rest after the work, slowly.
  const last = arm.goes[arm.goes.length - 1]
  if (last) {
    const back = smoother(t, last[0] + last[2] + 0.9, last[0] + last[2] + 2.0)
    p = [lerp(p[0], arm.rest[0], back), lerp(p[1], arm.rest[1], back)]
  }
  return p
}

/** An elbow between `a` and `b` for an arm `len` long each way, bent away from his body (`side`). */
function elbow(a: Pt, b: Pt, len: number, side: number): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const d = Math.max(1e-6, Math.hypot(dx, dy))
  const h = Math.sqrt(Math.max(0, len * len - (d / 2) * (d / 2)))
  return [a[0] + dx / 2 - (dy / d) * h * side, a[1] + dy / 2 + (dx / d) * h * side]
}

export function drawBoiler(g: Paint, L: Light): void {
  const { ctx, t } = g
  // Only while the camera is down here: from just before the cut down to just after the cut back up.
  if (t < CUT_BOILER - 0.5 || t > CUT_HALL + 0.5) return
  const IN = mix(FIRE, L.ambient, 0.1)
  const line = lit('#24160E', IN)
  ctx.save()
  ctx.beginPath()
  ctx.rect(B.x0, B.y0, B.x1 - B.x0, FLOOR - B.y0 + 0.02)
  ctx.clip()
  // The room: the back wall dark, the floor, the ceiling's beams.
  ctx.fillStyle = vgrad(ctx, B.y0, FLOOR, [
    [0, lit('#4A3226', IN)],
    [1, lit('#6A4632', IN)],
  ])
  ctx.fillRect(B.x0, B.y0, B.x1 - B.x0, FLOOR - B.y0)
  box(ctx, B.x0, B.y0, B.x1 - B.x0, 0.14, lit('#2A1C14', IN))
  for (let x = B.x0 + 0.9; x < B.x1; x += 1.8) box(ctx, x - 0.08, B.y0, 0.16, 0.26, lit('#2A1C14', IN))
  // The fire's light on the wall and the floor round the furnace.
  pool(ctx, (MOUTH.x0 + MOUTH.x1) / 2, MOUTH.y1 + 0.1, 2.4, '#FFB066', 0.5 + 0.08 * Math.sin(t * 5.3), 0.6)
  // The drawers: a wall of them in warm wood behind him, one standing out once he has pulled it.
  const dw = (DRAWERS.x1 - DRAWERS.x0) / DRAWERS.cols
  const dh = (DRAWERS.y1 - DRAWERS.y0) / DRAWERS.rows
  box(ctx, DRAWERS.x0 - 0.06, DRAWERS.y0 - 0.06, DRAWERS.x1 - DRAWERS.x0 + 0.12, DRAWERS.y1 - DRAWERS.y0 + 0.12, lit('#3A2618', IN))
  for (let c = 0; c < DRAWERS.cols; c++) {
    for (let r = 0; r < DRAWERS.rows; r++) {
      const x = DRAWERS.x0 + c * dw
      const y = DRAWERS.y0 + r * dh
      const pulled = c === 1 && r === 1 ? smoother(t, DRAWER, DRAWER + 0.18) : 0
      box(ctx, x + 0.02, y + 0.02 + pulled * 0.06, dw - 0.04, dh - 0.04, lit(mix('#9A6A40', '#B07C4C', hash(c, r)), IN))
      circle(ctx, x + dw / 2, y + dh / 2 + pulled * 0.06, 0.022)
      fill(ctx, lit('#3A2618', IN))
    }
  }
  // The dais he sits on.
  box(ctx, DRAWERS.x0 - 0.1, KAMAJI.seat, DRAWERS.x1 - DRAWERS.x0 + 0.3, FLOOR - KAMAJI.seat, lit('#5A3C28', IN))
  box(ctx, DRAWERS.x0 - 0.1, KAMAJI.seat, DRAWERS.x1 - DRAWERS.x0 + 0.3, 0.06, lit('#8A6040', IN))
  // The pipe: up from the furnace through the ceiling, the hopper on it; the hot water going up it once the herbs are in.
  box(ctx, PIPE_X - 0.08, B.y0 - 0.1, 0.16, 2.55 - B.y0 + 0.1, lit('#8C6A3A', IN))
  poly(ctx, [[HOPPER[0] - 0.2, HOPPER[1] - 0.16], [HOPPER[0] + 0.2, HOPPER[1] - 0.16], [HOPPER[0] + 0.06, HOPPER[1] + 0.06], [HOPPER[0] - 0.06, HOPPER[1] + 0.06]])
  fill(ctx, lit('#A07A3E', IN))
  ink(g, line, 1.2)
  const up = smooth(t, HERBS + 0.2, CUT_HALL)
  if (up > 0 && up < 1) {
    const y = lerp(2.55, B.y0 - 0.1, up)
    box(ctx, PIPE_X - 0.05, y - 0.25, 0.1, 0.3, rgba('#F6E2B8', 0.75))
  }
  // The furnace: an iron box, its mouth open on the fire.
  box(ctx, 66.75, 2.45, 1.9, FLOOR - 2.45, lit('#3C3836', IN))
  ink(g, line, 1.4)
  ctx.strokeStyle = line
  ctx.lineWidth = Math.max(1.25 * g.px, 1.4 / 108)
  ctx.strokeRect(66.75, 2.45, 1.9, FLOOR - 2.45)
  box(ctx, 66.65, 2.38, 2.1, 0.1, lit('#2C2826', IN))
  for (const x of [66.9, 68.5]) for (const y of [2.6, 3.85]) {
    circle(ctx, x, y, 0.025)
    fill(ctx, lit('#6A6460', IN))
  }
  drawFire(g, IN)
  // The coal heap by the furnace.
  ctx.beginPath()
  ctx.moveTo(68.85, FLOOR)
  ctx.quadraticCurveTo(69.4, FLOOR - 0.65, 70.05, FLOOR)
  ctx.closePath()
  fill(ctx, lit('#24201E', IN))
  for (let i = 0; i < 7; i++) {
    circle(ctx, 69.0 + hash(i, 5) * 0.95, FLOOR - 0.05 - hash(i, 6) * 0.3 * (1 - Math.abs(hash(i, 5) - 0.5) * 2), 0.045 + 0.02 * hash(i, 7))
    fill(ctx, lit('#3A3532', IN))
  }
  drawSoot(g, IN)
  drawKamaji(g, IN, line)
  // The cord down from the hall, and the token on it.
  poly(ctx, [CORD_TOP, CORD_END], false)
  ink(g, lit('#D9C49A', IN), 1.4)
  const tok = tokenAt(t)
  if (tok) {
    ctx.save()
    ctx.translate(tok[0], tok[1])
    ctx.rotate(0.12 * Math.sin(t * 3))
    box(ctx, -0.055, -0.08, 0.11, 0.17, lit('#C9A26A', IN))
    box(ctx, -0.055, -0.03, 0.11, 0.05, lit('#A8402C', IN))
    ctx.restore()
  }
  // The herbs tipped into the hopper: a pinch falling.
  const fall = smooth(t, HERBS, HERBS + 0.35)
  if (fall > 0 && fall < 1) {
    for (let i = 0; i < 6; i++) {
      circle(ctx, HOPPER[0] - 0.05 + hash(i, 11) * 0.1, HOPPER[1] - 0.28 + fall * 0.25 + hash(i, 12) * 0.08, 0.018)
      fill(ctx, lit('#6A8A3A', IN))
    }
  }
  ctx.restore()
}

/** The fire in the furnace's mouth: flat tongues, licking, bigger for a moment as each lump of coal goes in. */
function drawFire(g: Paint, IN: string): void {
  const { ctx, t } = g
  const m = MOUTH
  box(ctx, m.x0, m.y0, m.x1 - m.x0, m.y1 - m.y0, lit('#2A1208', IN))
  const fed = COAL.reduce((s, c) => s + knock(t, c + 0.3, 0.12, 0.6), 0)
  ctx.save()
  ctx.beginPath()
  ctx.rect(m.x0, m.y0, m.x1 - m.x0, m.y1 - m.y0)
  ctx.clip()
  for (const [col, k] of [['#C8402A', 1], ['#F08A3A', 0.72], ['#FAD27A', 0.42]] as const) {
    ctx.beginPath()
    ctx.moveTo(m.x0, m.y1)
    const n = 5
    for (let i = 0; i <= n; i++) {
      const x = m.x0 + ((m.x1 - m.x0) * i) / n
      const h = (0.22 + 0.12 * Math.sin(t * 7 + i * 2.1) + 0.12 * fed) * k
      ctx.lineTo(x - 0.05, m.y1 - h * 0.4)
      ctx.lineTo(x + 0.04, m.y1 - h)
    }
    ctx.lineTo(m.x1, m.y1)
    ctx.closePath()
    fill(ctx, col)
  }
  ctx.restore()
  box(ctx, m.x0 - 0.06, m.y0 - 0.06, m.x1 - m.x0 + 0.12, 0.07, lit('#1E1A18', IN))
}

/**
 * The soot: small black balls of fluff with two white eyes, carrying lumps of coal on their heads from the heap to
 * the furnace's mouth, each tossing its lump in on its note; two more sit by the heap.
 */
function drawSoot(g: Paint, IN: string): void {
  const { ctx, t } = g
  const heap = 69.25
  const mouth = (MOUTH.x0 + MOUTH.x1) / 2 + 0.25
  const sprite = (x: number, y: number, r: number, look: number) => {
    ctx.beginPath()
    const n = 14
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const rr = r * (i % 2 ? 1.18 : 0.92)
      const px = x + Math.cos(a) * rr
      const py = y + Math.sin(a) * rr
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    fill(ctx, '#141210')
    for (const s of [-1, 1]) {
      circle(ctx, x + s * r * 0.36 + look * r * 0.15, y - r * 0.1, r * 0.3)
      fill(ctx, '#F4F2EC')
      circle(ctx, x + s * r * 0.36 + look * r * 0.25, y - r * 0.08, r * 0.12)
      fill(ctx, '#141210')
    }
  }
  const r = 0.072
  COAL.forEach((c, i) => {
    // Each sets off from the heap a little before its note and hops to the mouth; tosses; goes back.
    const go = c - 1.1 + i * 0.05
    const there = c - 0.15
    const u = smoother(t, go, there)
    const back = smoother(t, c + 0.35, c + 1.4)
    const x = lerp(lerp(heap - i * 0.12, mouth + i * 0.06, u), heap - i * 0.12, back)
    const hops = Math.abs(Math.sin(((t - go) / (there - go)) * Math.PI * 4)) * (u > 0 && u < 1 ? 1 : 0)
    const toss = knock(t, c, 0.06, 0.18)
    const y = FLOOR - r * 1.1 - hops * 0.07 - toss * 0.12
    sprite(x, y, r, back > 0.5 ? 1 : -1)
    // The lump: on its head until its note, then in a short arc into the fire.
    const f = smooth(t, c, c + 0.3)
    if (f < 1) {
      const lx = lerp(x, (MOUTH.x0 + MOUTH.x1) / 2, f)
      const ly = lerp(y - r * 1.6, MOUTH.y0 + 0.25, f) - Math.sin(Math.PI * f) * 0.18
      circle(ctx, lx, ly, 0.05)
      fill(ctx, lit('#2E2A28', IN))
    }
  })
  sprite(69.85, FLOOR - r * 1.1 - 0.02 * Math.abs(Math.sin(t * 2.3)), r, -1)
  sprite(70.0, FLOOR - r * 1.1, r, -1)
}

function drawKamaji(g: Paint, IN: string, line: string): void {
  const { ctx, t } = g
  const skin = lit('#C99A6C', IN)
  const robe = lit('#3E3646', IN)
  const x = KAMAJI.x
  const breathe = 0.01 * Math.sin(t * 1.4)
  // His body: a dark robe, broad, seated.
  ctx.beginPath()
  ctx.moveTo(x - 0.42, KAMAJI.seat)
  ctx.quadraticCurveTo(x - 0.4, 2.55, x, 2.45 + breathe)
  ctx.quadraticCurveTo(x + 0.4, 2.55, x + 0.42, KAMAJI.seat)
  ctx.closePath()
  fill(ctx, robe)
  ink(g, line, 1.3)
  // The arms: long, thin, two joints each, from under his shoulders.
  ARMS.forEach((arm, i) => {
    const hand = handOf(arm, t, i)
    const side = arm.shoulder[0] < x ? 1 : -1
    // The token's arm bends out away from his face, not across it, as it brings the token up to his glasses.
    const el = elbow(arm.shoulder, hand, 0.68, i === 0 ? 1 : side * (i % 2 ? -1 : 1))
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(arm.shoulder[0], arm.shoulder[1])
    ctx.lineTo(el[0], el[1])
    ctx.lineTo(hand[0], hand[1])
    ctx.strokeStyle = line
    ctx.lineWidth = 0.048
    ctx.stroke()
    ctx.strokeStyle = skin
    ctx.lineWidth = 0.03
    ctx.stroke()
    circle(ctx, hand[0], hand[1], 0.03)
    fill(ctx, skin)
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
  })
  // His head: bald, the great white moustache, round dark glasses; he leans to the token when he reads it.
  const lean = 0.05 * smooth(t, CATCH, CATCH + 0.35) * (1 - smooth(t, CATCH + 1.3, CATCH + 2))
  const hx = x + lean
  const hy = 2.28 + breathe
  circle(ctx, hx, hy, 0.19)
  fill(ctx, skin)
  ink(g, line, 1.3)
  for (const s of [-1, 1]) {
    circle(ctx, hx + s * 0.075, hy - 0.02, 0.055)
    fill(ctx, '#1A1614')
    ellipse(ctx, hx + s * 0.11, hy + 0.08, 0.13, 0.04, s * 0.35)
    fill(ctx, lit('#EDE6DA', IN))
  }
  poly(ctx, [[hx - 0.02, hy - 0.02], [hx + 0.02, hy - 0.02]], false)
  ink(g, '#1A1614', 1.4)
  void sway
}
