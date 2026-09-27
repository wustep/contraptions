import { R } from '../../../../parts'
import { CHUTE_LENGTH, onChute } from './chute'
import { arm, BACK, bowl, COUNT, PIVOTS } from './cups'
import { add, dir, scale, type Pt } from './kit'
import { GLASS, GONDOLAS, HANG, LAMP, SCREW_RADIUS, TROUGH_LEFT, TROUGH_LIP, TROUGH_R, WHEEL_R } from './layout'
import { bell, BELLS, onRail, RAIL_LENGTH } from './rail'
import { PITCH, SCREW_ALONG, SCREW_DOWN, SCREW_FOOT, SCREW_LENGTH, spout, turns, AT_TOP, SPOUT } from './screw'
import { hammer, TROUGH_C } from './trough'
import { pin, tilt, wheelAngle } from './wheel'
import { BRASS, BRASS_DARK, BRASS_LIGHT, FELT, FELT_DARK, INK, scenery, WOOD, WOOD_DARK, type Ctx2D } from './world'

/**
 * The machine, drawn: wood, brass and felt, on the sill and hung from the window's head. What the ball is in front of
 * is drawn under it (`machine`), and what is in front of the ball over it (`fronts`): the near lip of a cup, the near
 * turn of the screw's wire, the near side of a gondola, the near wall of a channel. So the ball sits in things.
 */

const HEAD = GLASS.y0

function line(ctx: Ctx2D, k: number, a: Pt, b: Pt): void {
  ctx.beginPath()
  ctx.moveTo(a[0] * k, a[1] * k)
  ctx.lineTo(b[0] * k, b[1] * k)
  ctx.stroke()
}

function thread(ctx: Ctx2D, k: number, from: Pt, w: number): void {
  ctx.strokeStyle = 'rgba(216, 205, 184, 0.32)'
  ctx.lineWidth = Math.max(0.7, w * 0.4)
  line(ctx, k, from, [from[0], HEAD])
}

/** A cup, in its own frame (its bowl's middle at the origin, the arm's line along x), turned by `g`. */
function cupShape(ctx: Ctx2D, k: number, at: Pt, g: number, front: boolean, w: number): void {
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  ctx.rotate(g)
  const K = (v: number) => v * k
  if (!front) {
    // The felt inside, behind the ball.
    ctx.fillStyle = FELT_DARK
    ctx.beginPath()
    ctx.moveTo(K(-0.19), K(-0.27))
    ctx.quadraticCurveTo(K(-0.2), K(0.05), K(0), K(0.05))
    ctx.quadraticCurveTo(K(0.2), K(0.05), K(0.19), K(-0.27))
    ctx.closePath()
    ctx.fill()
  } else {
    // The near side: brass, up to a little under the ball's middle.
    ctx.fillStyle = BRASS
    ctx.strokeStyle = INK
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(K(-0.2), K(-0.13))
    ctx.quadraticCurveTo(K(-0.21), K(0.07), K(0), K(0.07))
    ctx.quadraticCurveTo(K(0.21), K(0.07), K(0.2), K(-0.13))
    ctx.quadraticCurveTo(K(0), K(-0.07), K(-0.2), K(-0.13))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = BRASS_LIGHT
    ctx.lineWidth = w * 0.7
    ctx.beginPath()
    ctx.moveTo(K(-0.16), K(-0.1))
    ctx.quadraticCurveTo(K(0), K(-0.05), K(0.16), K(-0.1))
    ctx.stroke()
  }
  ctx.restore()
}

// ---------------------------------------------------------------- the cups

const BEAM_FROM: Pt = add(PIVOTS[0], [-0.55, -0.12])
const BEAM_TO: Pt = add(PIVOTS[COUNT - 1], [0.3, -0.12])

function drawCups(ctx: Ctx2D, k: number, t: number, w: number): void {
  // The slanting beam they hang from, itself hung from the window's head.
  for (const f of [0.12, 0.88]) thread(ctx, k, [BEAM_FROM[0] + (BEAM_TO[0] - BEAM_FROM[0]) * f, BEAM_FROM[1] + (BEAM_TO[1] - BEAM_FROM[1]) * f], w)
  ctx.lineCap = 'round'
  ctx.strokeStyle = WOOD_DARK
  ctx.lineWidth = 0.09 * k
  line(ctx, k, BEAM_FROM, BEAM_TO)
  ctx.strokeStyle = 'rgba(156, 114, 73, 0.55)'
  ctx.lineWidth = 0.035 * k
  line(ctx, k, BEAM_FROM, BEAM_TO)
  for (let i = 0; i < COUNT; i++) {
    const P = PIVOTS[i]
    const g = arm(i, t)
    const back = add(P, scale(dir(g), -BACK))
    const end = bowl(i, g)
    // A peg from the beam, the arm, and its counterweight.
    ctx.strokeStyle = BRASS_DARK
    ctx.lineWidth = 0.05 * k
    line(ctx, k, P, [P[0], P[1] - 0.12])
    ctx.strokeStyle = BRASS
    ctx.lineWidth = 0.045 * k
    line(ctx, k, back, end)
    ctx.fillStyle = BRASS_DARK
    ctx.strokeStyle = INK
    ctx.lineWidth = w * 0.8
    ctx.beginPath()
    ctx.arc(back[0] * k, back[1] * k, 0.085 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(P[0] * k, P[1] * k, 0.035 * k, 0, Math.PI * 2)
    ctx.fill()
    cupShape(ctx, k, end, g, false, w)
  }
}

function drawCupFronts(ctx: Ctx2D, k: number, t: number, w: number): void {
  for (let i = 0; i < COUNT; i++) cupShape(ctx, k, bowl(i, arm(i, t)), arm(i, t), true, w)
}

// ---------------------------------------------------------------- the trough

/** A point on the trough's circle, `r` from its middle, at angle `a` from the floor. */
const onCircle = (a: number, r: number): Pt => [TROUGH_C[0] + r * Math.sin(a), TROUGH_C[1] + r * Math.cos(a)]

/** Along the trough's circle at radius `r` from `a0` to `a1`; `join` carries on the path rather than starting one. */
function arcPath(ctx: Ctx2D, k: number, r: number, a0: number, a1: number, join = false, n = 48): void {
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const [x, y] = onCircle(a, r)
    if (i === 0 && !join) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
}

const FLOOR_R = TROUGH_R + R
function drawTrough(ctx: Ctx2D, k: number): void {
  // Two legs to the sill.
  ctx.lineCap = 'butt'
  for (const a of [-0.42, 0.34]) {
    const [x, y] = onCircle(a, FLOOR_R + 0.12)
    ctx.fillStyle = WOOD_DARK
    ctx.fillRect((x - 0.05) * k, y * k, 0.1 * k, -y * k)
  }
  // The back wall of the channel, behind the ball: felt, up to its middle.
  ctx.beginPath()
  arcPath(ctx, k, FLOOR_R - 0.22, TROUGH_LEFT, TROUGH_LIP)
  arcPath(ctx, k, FLOOR_R, TROUGH_LIP, TROUGH_LEFT, true)
  ctx.closePath()
  ctx.fillStyle = FELT_DARK
  ctx.fill()
}

/** The felt hammer, on its arm under the floor: it swings up through the slot at each pass and taps the ball on. */
function drawHammer(ctx: Ctx2D, k: number, t: number, w: number): void {
  const h = hammer(t)
  const pivot = onCircle(0, FLOOR_R + 0.55)
  // At rest the head lies in the slot, just under the felt; at the top of its stroke it stands a ball's height up.
  const lean = Math.max(-1, Math.min(1, h.lean)) * 0.55
  const reach = 0.42 + 0.16 * h.lift
  const head: Pt = [pivot[0] + Math.sin(lean) * reach, pivot[1] - Math.cos(lean) * reach]
  ctx.lineCap = 'round'
  ctx.strokeStyle = BRASS_DARK
  ctx.lineWidth = Math.max(1, 0.035 * k)
  line(ctx, k, pivot, head)
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(pivot[0] * k, pivot[1] * k, 0.035 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#E8DCC6'
  ctx.strokeStyle = INK
  ctx.lineWidth = w * 0.7
  ctx.beginPath()
  ctx.ellipse(head[0] * k, head[1] * k, 0.1 * k, 0.065 * k, lean, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

/** The near face of the screw's glass tube: two long glints, the ball seen through them. */
function drawTube(ctx: Ctx2D, k: number, w: number): void {
  const head = add(SCREW_FOOT, scale(SCREW_ALONG, SCREW_LENGTH))
  for (const [off, a] of [[-(SCREW_RADIUS + 0.05), 0.45], [SCREW_RADIUS + 0.05, 0.3], [-(SCREW_RADIUS - 0.08), 0.12]] as const) {
    ctx.strokeStyle = `rgba(215, 232, 250, ${a})`
    ctx.lineWidth = Math.max(0.8, w * (off < 0 ? 0.9 : 0.7))
    line(ctx, k, add(SCREW_FOOT, scale(SCREW_DOWN, off)), add(head, scale(SCREW_DOWN, off)))
  }
}

function drawTroughFront(ctx: Ctx2D, k: number, w: number): void {
  // The near wall and the body: wood, felt-lined, over the ball's lower part.
  ctx.beginPath()
  arcPath(ctx, k, FLOOR_R - 0.1, TROUGH_LEFT, TROUGH_LIP)
  arcPath(ctx, k, FLOOR_R + 0.13, TROUGH_LIP, TROUGH_LEFT, true)
  ctx.closePath()
  ctx.fillStyle = WOOD
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = w
  ctx.stroke()
  ctx.beginPath()
  arcPath(ctx, k, FLOOR_R - 0.09, TROUGH_LEFT, TROUGH_LIP)
  ctx.strokeStyle = FELT
  ctx.lineWidth = 0.035 * k
  ctx.stroke()
}

// ---------------------------------------------------------------- the screw

const screwAt = (s: number, phi: number, r = SCREW_RADIUS): { p: Pt; depth: number } => ({
  p: add(add(SCREW_FOOT, scale(SCREW_ALONG, s)), scale(SCREW_DOWN, r * Math.cos(phi))),
  depth: Math.sin(phi),
})

/** The screw's wire, the half of it behind the axis (`front` false) or in front of it. */
function drawHelix(ctx: Ctx2D, k: number, t: number, front: boolean): void {
  const turn = turns(t)
  const n = Math.ceil((SCREW_LENGTH / PITCH) * 28)
  ctx.lineCap = 'round'
  ctx.strokeStyle = front ? BRASS : BRASS_DARK
  ctx.lineWidth = Math.max(1, 0.045 * k)
  ctx.beginPath()
  let drawing = false
  for (let i = 0; i <= n; i++) {
    const s = (SCREW_LENGTH * i) / n
    const phi = 2 * Math.PI * (s / PITCH - turn)
    const q = screwAt(s, phi)
    const show = front ? q.depth >= 0 : q.depth < 0
    if (show) {
      if (!drawing) ctx.moveTo(q.p[0] * k, q.p[1] * k)
      else ctx.lineTo(q.p[0] * k, q.p[1] * k)
      drawing = true
    } else drawing = false
  }
  ctx.stroke()
  if (front) {
    // A glint along the near turns.
    ctx.strokeStyle = 'rgba(255, 236, 190, 0.35)'
    ctx.lineWidth = Math.max(0.8, 0.015 * k)
    ctx.stroke()
  }
}

function drawScrew(ctx: Ctx2D, k: number, t: number, w: number): void {
  const head = add(SCREW_FOOT, scale(SCREW_ALONG, SCREW_LENGTH))
  // Hung from the window's head at the top; a post to the sill at the foot.
  ctx.strokeStyle = BRASS_DARK
  ctx.lineWidth = 0.06 * k
  line(ctx, k, head, [head[0], HEAD])
  ctx.fillStyle = WOOD_DARK
  ctx.fillRect((SCREW_FOOT[0] - 0.1) * k, SCREW_FOOT[1] * k, 0.2 * k, -SCREW_FOOT[1] * k)
  // The glass tube it turns in, and in it the shaft and the far half of the wire.
  const edge = SCREW_RADIUS + 0.05
  const a0 = add(SCREW_FOOT, scale(SCREW_DOWN, -edge))
  const a1 = add(head, scale(SCREW_DOWN, -edge))
  const b0 = add(SCREW_FOOT, scale(SCREW_DOWN, edge))
  const b1 = add(head, scale(SCREW_DOWN, edge))
  ctx.fillStyle = 'rgba(190, 215, 240, 0.07)'
  ctx.beginPath()
  ctx.moveTo(a0[0] * k, a0[1] * k)
  ctx.lineTo(a1[0] * k, a1[1] * k)
  ctx.lineTo(b1[0] * k, b1[1] * k)
  ctx.lineTo(b0[0] * k, b0[1] * k)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = WOOD_DARK
  ctx.lineWidth = 0.05 * k
  line(ctx, k, SCREW_FOOT, head)
  drawHelix(ctx, k, t, false)
  // Its bearings, and the mouth the ball is dropped into.
  for (const at of [SCREW_FOOT, head]) {
    ctx.fillStyle = BRASS
    ctx.strokeStyle = INK
    ctx.lineWidth = w * 0.8
    ctx.beginPath()
    ctx.arc(at[0] * k, at[1] * k, 0.1 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  // The spout, from the head, over its hook and back onto the rail: felt, under the ball's way.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = FELT
  ctx.lineWidth = 0.09 * k
  ctx.beginPath()
  for (let i = 0; i <= 40; i++) {
    const q = spout(AT_TOP + (SPOUT * i) / 40)
    const x = q[0] * k
    const y = (q[1] + R + 0.05) * k
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

// ---------------------------------------------------------------- the rail and its bells

/** How far over the rail the bells' wire runs. */
const BELL_WIRE = 0.56

function drawRail(ctx: Ctx2D, k: number, t: number, w: number): void {
  const a = onRail(-0.2)
  const b = onRail(RAIL_LENGTH + 0.05)
  // Threads at its ends and between, and a second wire over it that the bells hang from.
  for (const u of [0, RAIL_LENGTH * 0.33, RAIL_LENGTH * 0.66, RAIL_LENGTH]) thread(ctx, k, onRail(u), w)
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(201, 161, 92, 0.6)'
  ctx.lineWidth = Math.max(0.8, 0.02 * k)
  line(ctx, k, [a[0], a[1] - BELL_WIRE], [b[0], b[1] - BELL_WIRE])
  ctx.strokeStyle = BRASS_DARK
  ctx.lineWidth = Math.max(1, 0.055 * k)
  line(ctx, k, [a[0], a[1] + R + 0.03], [b[0], b[1] + R + 0.03])
  ctx.strokeStyle = BRASS
  ctx.lineWidth = Math.max(1, 0.03 * k)
  line(ctx, k, [a[0], a[1] + R + 0.02], [b[0], b[1] + R + 0.02])
  BELLS.forEach((u, i) => {
    const at = onRail(u)
    const top: Pt = [at[0], at[1] - BELL_WIRE]
    const { swing, ringing } = bell(i, t)
    ctx.save()
    ctx.translate(top[0] * k, top[1] * k)
    ctx.rotate(-swing)
    const K = (v: number) => v * k
    // A thread down to it, the bell, and its clapper at the ball's top.
    ctx.strokeStyle = 'rgba(216, 205, 184, 0.7)'
    ctx.lineWidth = Math.max(0.8, w * 0.45)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, K(0.16))
    ctx.stroke()
    ctx.fillStyle = ringing > 0.02 ? mixBrass(ringing) : BRASS
    ctx.strokeStyle = INK
    ctx.lineWidth = w * 0.8
    ctx.beginPath()
    ctx.moveTo(K(-0.05), K(0.17))
    ctx.quadraticCurveTo(K(-0.09), K(0.2), K(-0.1), K(0.33))
    ctx.lineTo(K(-0.13), K(0.37))
    ctx.lineTo(K(0.13), K(0.37))
    ctx.lineTo(K(0.1), K(0.33))
    ctx.quadraticCurveTo(K(0.09), K(0.2), K(0.05), K(0.17))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = BRASS_DARK
    ctx.beginPath()
    ctx.arc(0, K(0.43), K(0.035), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

function mixBrass(f: number): string {
  const a = [0xc9, 0xa1, 0x5c]
  const b = [0xff, 0xe9, 0xb0]
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * Math.min(1, f)))
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`
}

// ---------------------------------------------------------------- the lamp and its wheel

function drawWheel(ctx: Ctx2D, k: number, t: number, w: number): void {
  const K = (v: number) => v * k
  // The lamp's cord, from the ceiling, behind the wheel.
  ctx.strokeStyle = '#2B2420'
  ctx.lineWidth = Math.max(1, 0.035 * k)
  line(ctx, k, [LAMP[0], LAMP[1] - 0.7], [LAMP[0], HEAD - 30])
  // Spokes from the hub round the lamp to the rim, between the gondolas.
  const a0 = wheelAngle(t)
  ctx.strokeStyle = BRASS_DARK
  ctx.lineWidth = Math.max(1, 0.035 * k)
  for (let i = 0; i < GONDOLAS; i++) {
    const a = a0 + (2 * Math.PI * (i + 0.5)) / GONDOLAS
    line(ctx, k, [LAMP[0] + 0.5 * Math.sin(a), LAMP[1] - 0.5 * Math.cos(a)], [LAMP[0] + WHEEL_R * Math.sin(a), LAMP[1] - WHEEL_R * Math.cos(a)])
  }
  ctx.strokeStyle = BRASS
  ctx.lineWidth = Math.max(1, 0.045 * k)
  ctx.beginPath()
  ctx.arc(K(LAMP[0]), K(LAMP[1]), K(WHEEL_R), 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(K(LAMP[0]), K(LAMP[1]), K(0.5), 0, Math.PI * 2)
  ctx.stroke()
  // The lamp: a shade over a glass globe.
  ctx.fillStyle = '#3A2E26'
  ctx.strokeStyle = INK
  ctx.lineWidth = w
  ctx.beginPath()
  ctx.moveTo(K(LAMP[0] - 0.12), K(LAMP[1] - 0.72))
  ctx.lineTo(K(LAMP[0] + 0.12), K(LAMP[1] - 0.72))
  ctx.lineTo(K(LAMP[0] + 0.42), K(LAMP[1] - 0.26))
  ctx.lineTo(K(LAMP[0] - 0.42), K(LAMP[1] - 0.26))
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  const glow = ctx.createRadialGradient(K(LAMP[0]), K(LAMP[1] + 0.02), 0, K(LAMP[0]), K(LAMP[1] + 0.02), K(0.36))
  glow.addColorStop(0, '#FFF7E0')
  glow.addColorStop(0.55, '#FFE0A0')
  glow.addColorStop(1, '#F2B866')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(K(LAMP[0]), K(LAMP[1] + 0.02), K(0.34), 0, Math.PI * 2)
  ctx.fill()
  // The gondolas: bails from their pins, and the felt inside each.
  for (let i = 0; i < GONDOLAS; i++) {
    const p = pin(i, t)
    const seat: Pt = [p[0], p[1] + HANG]
    const g = tilt(i, t)
    ctx.strokeStyle = BRASS_DARK
    ctx.lineWidth = Math.max(0.8, 0.025 * k)
    const bowlAt = add(seat, rot([0, 0.12], g))
    line(ctx, k, p, add(bowlAt, rot([-0.19, -0.1], g)))
    line(ctx, k, p, add(bowlAt, rot([0.19, -0.1], g)))
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(K(p[0]), K(p[1]), K(0.035), 0, Math.PI * 2)
    ctx.fill()
    cupShape(ctx, k, bowlAt, g, false, w)
  }
}

const rot = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]

function drawGondolaFronts(ctx: Ctx2D, k: number, t: number, w: number): void {
  for (let i = 0; i < GONDOLAS; i++) {
    const p = pin(i, t)
    const g = tilt(i, t)
    cupShape(ctx, k, add([p[0], p[1] + HANG], rot([0, 0.12], g)), g, true, w)
  }
}

// ---------------------------------------------------------------- the chute

function chutePath(ctx: Ctx2D, k: number, off: number): void {
  for (let i = 0; i <= 40; i++) {
    const q = onChute((CHUTE_LENGTH * i) / 40)
    if (i === 0) ctx.moveTo(q[0] * k, (q[1] + off) * k)
    else ctx.lineTo(q[0] * k, (q[1] + off) * k)
  }
}

function drawChute(ctx: Ctx2D, k: number, w: number): void {
  const mid = onChute(CHUTE_LENGTH * 0.45)
  thread(ctx, k, mid, w)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  chutePath(ctx, k, R - 0.12)
  ctx.strokeStyle = FELT_DARK
  ctx.lineWidth = 0.2 * k
  ctx.stroke()
}

function drawChuteFront(ctx: Ctx2D, k: number, w: number): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  chutePath(ctx, k, R + 0.07)
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.16 * k + 2 * w
  ctx.stroke()
  ctx.strokeStyle = WOOD
  ctx.lineWidth = 0.16 * k
  ctx.stroke()
  ctx.beginPath()
  chutePath(ctx, k, R - 0.005)
  ctx.strokeStyle = FELT
  ctx.lineWidth = 0.035 * k
  ctx.stroke()
}

// ---------------------------------------------------------------- the passes

export const machine = scenery<null>('machine', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const w = c.weight
  ctx.save()
  drawTrough(ctx, k)
  drawScrew(ctx, k, c.t, w)
  drawRail(ctx, k, c.t, w)
  drawChute(ctx, k, w)
  drawCups(ctx, k, c.t, w)
  drawWheel(ctx, k, c.t, w)
  ctx.restore()
})

export const fronts = scenery<null>('fronts', () => {}, (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const w = c.weight
  ctx.save()
  drawTroughFront(ctx, k, w)
  drawHammer(ctx, k, c.t, w)
  drawHelix(ctx, k, c.t, true)
  drawTube(ctx, k, w)
  drawChuteFront(ctx, k, w)
  drawCupFronts(ctx, k, c.t, w)
  drawGondolaFronts(ctx, k, c.t, w)
  ctx.restore()
})

