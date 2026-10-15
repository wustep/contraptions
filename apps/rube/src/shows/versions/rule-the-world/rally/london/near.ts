import type { Pt } from '../../../../../parts'
import { bloom, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { at } from '../music'
import { ctxOf, rgba, type Pen } from '../pen'
import { ballAt, FLOOR, R, REST_AT, WINNER } from './geo'
import { busy, cheer, groan, hush, still } from './mood'
import { C } from './palette'

/**
 * The near side of the court, between the lens and the play: the front row's heads and shoulders along the bottom of
 * the frame (d 1.35, so they slide past faster than the hall as the camera goes), soft and dark against the lit court,
 * every head turning after the ball and the row coming up off its seats on the big points, slumping at the loss; the
 * rope on its brass posts just beyond them (d 1.2); and two press photographers among them, cameras up for the big
 * moments, whose flashes burst big and soft this close. After the loss people get up and go along in front of them.
 *
 * All of it keeps to the bottom of the frame and below a line it never crosses: under the table, its bats and Marty,
 * wherever the camera is (it sinks out of the way, never over them). It is drawn before the ball, so even so he is on
 * top of it.
 */

const D_ROW = 1.35
const D_ROPE = 1.2
/** Where the near layers lie as they are drawn: about the middle of the court. */
const AX = 7
const GAP = 1.06
/** The two photographers, by their seat in the row. */
const PRESS_SEATS: Record<number, number> = { 4: 0, 16: 1 }
/**
 * Their flashes, and whose: on Kletzki's last smash and as the hall is seen whole after his miss; on Marty's winner in
 * the final, and on two of his smashes off Endo's lobs.
 */
const NEAR_FLASHES: [number, number][] = [
  [at(30, 2) + 0.06, 0],
  [at(31, 4) + 0.1, 0],
  [WINNER + 0.04, 1],
  [at(38, 4) + 0.06, 1],
  [at(39, 3) + 0.06, 1],
]
const lit = (u: number): number => (u < 0 || u > 0.5 ? 0 : Math.exp(-u / 0.06) + 0.1 * Math.exp(-u / 0.22))
/** A photographer's camera at his eye: up a while before his flash, and down again after. */
function aim(who: number, t: number): number {
  let v = 0
  for (const [ft, w] of NEAR_FLASHES) {
    if (w !== who) continue
    const u = t - ft
    if (u < -1.6 || u > 1.1) continue
    v = Math.max(v, u < 0 ? smooth(u, -1.6, -1.1) : 1 - smooth(u, 0.6, 1.1))
  }
  return v
}

/** The out-of-focus edge: bands of stroke, widths (a share of the row's size) and alphas, widest faintest. */
const SOFT: [number, number][] = [
  [0.42, 0.06],
  [0.26, 0.1],
  [0.12, 0.18],
]

/** The people who get up and go after the loss, along in front of the row: when each crosses. */
const LEAVING = [REST_AT - 0.7, REST_AT + 0.75, REST_AT + 1.9]

export function drawNear(pen: Pen, t: number, f: Frame): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const h = f.y1 - f.y0
  // Their size: as near things are, bigger as the camera comes in, but held to a band along the bottom.
  const S = 0.36 * Math.pow(h / 6.9, 0.6)
  const bottom = f.y1
  // The line nothing here may come up past: low in the frame, under the players' feet where the floor shows, never
  // over the table and its bats (in close, only the tops of their heads), and well under Marty.
  const ball = ballAt(t)
  const base = Math.max(bottom - 0.2 * h, Math.min(FLOOR + 0.1, bottom - 0.08 * h), 0.95)
  const capAt = (x: number): number => {
    const w = 1 - smooth(Math.abs(x - ball[0]), 0.45 + 1.1 * S, 1.0 + 2.2 * S)
    return w > 0 ? Math.max(base, base + (ball[1] + R + 0.3 - base) * w) : base
  }
  const shift = (d: number) => (d - 1) * (f.cx - AX)

  // The rope on its posts.
  {
    const sx = shift(D_ROPE)
    const j0 = Math.floor((f.x0 - 3 + sx) / 2.7)
    const j1 = Math.ceil((f.x1 + 3 + sx) / 2.7)
    const tops: Pt[] = []
    for (let j = j0; j <= j1; j++) {
      const x = j * 2.7 + 0.9 - sx
      tops.push([x, Math.max(capAt(x) + 0.06 * S, bottom - 1.0 * S)])
    }
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = rgba(pen, C.near, 0.85)
    ctx.lineWidth = 0.13 * S * k
    ctx.beginPath()
    for (const [x, y] of tops) {
      ctx.moveTo(x * k, (bottom + 0.3) * k)
      ctx.lineTo(x * k, y * k)
    }
    ctx.stroke()
    ctx.strokeStyle = rgba(pen, C.rope, 0.95)
    ctx.lineWidth = 0.12 * S * k
    ctx.beginPath()
    for (let i = 0; i + 1 < tops.length; i++) {
      const [a, b] = [tops[i], tops[i + 1]]
      const sag = 0.3 * S * (1 + 0.04 * Math.sin(t * 1.3 + i))
      ctx.moveTo(a[0] * k, (a[1] + 0.05 * S) * k)
      ctx.quadraticCurveTo(((a[0] + b[0]) / 2) * k, ((a[1] + b[1]) / 2 + 2 * sag) * k, b[0] * k, (b[1] + 0.05 * S) * k)
    }
    ctx.stroke()
    ctx.fillStyle = rgba(pen, '#2E271C', 1)
    ctx.beginPath()
    for (const [x, y] of tops) {
      ctx.moveTo((x + 0.1 * S) * k, y * k)
      ctx.arc(x * k, y * k, 0.1 * S * k, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.restore()
  }

  // The row.
  const sx = shift(D_ROW)
  const i0 = Math.floor((f.x0 - 1.5 + sx) / GAP)
  const i1 = Math.ceil((f.x1 + 1.5 + sx) / GAP)
  const C0 = cheer(t)
  const G = groan(t)
  const quiet = 1 - 0.8 * still(t)
  const heads = new Path2D()
  const arms = new Path2D()
  const dishes: [Pt, number, number][] = []
  for (let i = i0; i <= i1; i++) {
    const px = i * GAP + (hash(i, 1, 91) - 0.5) * 0.42 - sx
    const kind = hash(i, 2, 91)
    const keen = hash(i, 3, 91)
    const press = PRESS_SEATS[i]
    const b = ballAt(t - 0.1 - 0.14 * hash(i, 4, 91))
    const look = Math.max(-1, Math.min(1, (b[0] - px) / 3.5))
    const rise = C0 * (0.35 + 0.65 * keen) * 0.5 * S
    const up = press !== undefined ? aim(press, t) : 0
    let hy =
      bottom -
      1.3 * S -
      rise +
      (0.12 * G + 0.05 * hush(t)) * S +
      0.02 * S * Math.sin(t * 1.1 + i * 1.7) +
      0.035 * S * quiet * busy(t) * Math.sin(t * (2.2 + keen) + i)
    // Arms up for the big points: some of the keen ones, a hat in the hand of some of those.
    const armsUp = press === undefined && C0 > 0.3 && hash(i, 5, 91) < 0.5 ? Math.min(1, (C0 - 0.3) / 0.35) : 0
    const hatOn = kind < 0.4 && !(armsUp > 0.3 && hash(i, 6, 91) < 0.55)
    const top = hy - (armsUp > 0 ? 0.55 * S + 0.55 * S * armsUp : hatOn || press !== undefined ? 0.75 * S : 0.5 * S)
    const cap = capAt(px)
    if (top < cap) hy += cap - top
    const hx = px + 0.1 * S * look
    const sy = hy + 0.66 * S
    const tilt = 0.06 * S * look
    heads.moveTo((px - 1.25 * S) * k, (bottom + 0.4) * k)
    heads.lineTo((px - 1.1 * S) * k, (sy + 0.28 * S + tilt) * k)
    heads.quadraticCurveTo((px - 0.95 * S) * k, (sy + tilt) * k, (px - 0.55 * S) * k, (sy - 0.02 * S + tilt) * k)
    heads.lineTo((px - 0.22 * S) * k, (sy - 0.18 * S) * k)
    heads.lineTo((px + 0.22 * S) * k, (sy - 0.18 * S) * k)
    heads.lineTo((px + 0.55 * S) * k, (sy - 0.02 * S - tilt) * k)
    heads.quadraticCurveTo((px + 0.95 * S) * k, (sy - tilt) * k, (px + 1.1 * S) * k, (sy + 0.28 * S - tilt) * k)
    heads.lineTo((px + 1.25 * S) * k, (bottom + 0.4) * k)
    heads.closePath()
    heads.moveTo((hx + 0.4 * S) * k, hy * k)
    heads.ellipse(hx * k, hy * k, 0.4 * S * k, 0.48 * S * k, 0, 0, Math.PI * 2)
    // Turned after the ball: his nose (or ear) shows past the line of his head on that side.
    if (Math.abs(look) > 0.2) {
      const nx = hx + Math.sign(look) * 0.37 * S
      heads.moveTo((nx + 0.1 * S) * k, (hy + 0.06 * S) * k)
      heads.ellipse(nx * k, (hy + 0.06 * S) * k, 0.1 * S * Math.min(1, Math.abs(look) * 1.5) * k, 0.12 * S * k, 0, 0, Math.PI * 2)
    }
    const hat = (cx: number, cy: number) => {
      // A trilby: its brim, and the crown with its pinch.
      heads.moveTo((cx + 0.62 * S) * k, cy * k)
      heads.ellipse(cx * k, cy * k, 0.62 * S * k, 0.1 * S * k, 0, 0, Math.PI * 2)
      heads.moveTo((cx - 0.38 * S) * k, cy * k)
      heads.lineTo((cx - 0.34 * S) * k, (cy - 0.36 * S) * k)
      heads.lineTo((cx - 0.08 * S) * k, (cy - 0.42 * S) * k)
      heads.lineTo(cx * k, (cy - 0.37 * S) * k)
      heads.lineTo((cx + 0.08 * S) * k, (cy - 0.42 * S) * k)
      heads.lineTo((cx + 0.34 * S) * k, (cy - 0.36 * S) * k)
      heads.lineTo((cx + 0.38 * S) * k, cy * k)
      heads.closePath()
    }
    if (hatOn || press !== undefined) hat(hx, hy - 0.3 * S)
    else if (kind > 0.7 && kind < 0.9) {
      // A woman's small hat, tipped.
      heads.moveTo((hx + 0.48 * S) * k, (hy - 0.36 * S) * k)
      heads.ellipse((hx + 0.05 * S) * k, (hy - 0.36 * S) * k, 0.48 * S * k, 0.2 * S * k, -0.15, 0, Math.PI * 2)
    } else if (kind >= 0.9) {
      // A flat cap, its peak toward where he looks.
      heads.moveTo((hx + 0.44 * S) * k, (hy - 0.3 * S) * k)
      heads.ellipse((hx + 0.06 * S * look) * k, (hy - 0.3 * S) * k, 0.44 * S * k, 0.2 * S * k, 0, 0, Math.PI * 2)
    }
    if (armsUp > 0) {
      for (const sd of [-1, 1]) {
        if (sd === 1 && hash(i, 7, 91) < 0.5) continue
        const wave = 0.18 * S * Math.sin(t * 10 + i * 1.9)
        const hand: Pt = [px + sd * (0.75 * S) + wave, Math.max(cap, hy - (0.3 + 0.75 * armsUp) * S)]
        arms.moveTo((px + sd * 0.75 * S) * k, (sy + 0.15 * S) * k)
        arms.quadraticCurveTo((px + sd * 1.05 * S) * k, ((sy + hand[1]) / 2) * k, hand[0] * k, hand[1] * k)
        if (kind < 0.4 && !hatOn && sd === -1) hat(hand[0], hand[1] - 0.05 * S)
      }
    }
    if (press !== undefined && up > 0.02) {
      // His camera up at his eye, seen from behind: its box out past his head, his hands on it, the dish up beside it.
      const cy = hy + 0.05 * S + (1 - up) * 1.4 * S
      const cw = 0.62 * S
      heads.rect((hx - cw) * k, (cy - 0.32 * S) * k, 2 * cw * k, 0.62 * S * k)
      arms.moveTo((px - 0.75 * S) * k, (sy + 0.2 * S) * k)
      arms.lineTo((hx - cw) * k, (cy + 0.1 * S) * k)
      arms.moveTo((px + 0.75 * S) * k, (sy + 0.2 * S) * k)
      arms.lineTo((hx + cw) * k, (cy + 0.1 * S) * k)
      const dish: Pt = [hx - 0.95 * S, Math.max(cap + 0.4 * S, cy - 0.62 * S)]
      heads.moveTo((dish[0] + 0.38 * S) * k, dish[1] * k)
      heads.ellipse(dish[0] * k, dish[1] * k, 0.38 * S * k, 0.4 * S * k, 0, 0, Math.PI * 2)
      dishes.push([dish, press, up])
    }
  }
  ctx.save()
  // Soft edges first (the lens has them out of focus: a few widening bands, each fainter), then the dark of them.
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const [wide, a] of SOFT) {
    ctx.strokeStyle = rgba(pen, C.near, a)
    ctx.lineWidth = wide * S * k
    ctx.stroke(heads)
    ctx.lineWidth = (wide + 0.36) * S * k
    ctx.stroke(arms)
  }
  ctx.fillStyle = rgba(pen, C.near, 0.93)
  ctx.fill(heads)
  ctx.strokeStyle = rgba(pen, C.near, 0.93)
  ctx.lineWidth = 0.36 * S * k
  ctx.stroke(arms)
  ctx.restore()

  // The photographers' flashes: big and soft this near, and the whole frame lit a moment.
  for (const [dish, who, up] of dishes) {
    // The bulb's dish catches the light.
    bloom(pen, dish, 0.5 * S, C.whiteShade, 0.12 * up)
    for (const [ft, w] of NEAR_FLASHES) {
      if (w !== who) continue
      const I = lit(t - ft)
      if (I <= 0.01) continue
      bloom(pen, dish, 2.4 * S, C.flash, 0.95 * I)
      bloom(pen, [f.cx, f.cy], 0.6 * h, C.flash, 0.12 * I)
    }
  }

  // After the loss: people up and going, along in front of the row, nearer still.
  leaving(pen, t, f, S, capAt)
}

/** The people going, after the loss: heads and shoulders along the bottom, a step's bob, faster than the row. */
function leaving(pen: Pen, t: number, f: Frame, S: number, capAt: (x: number) => number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const w = f.x1 - f.x0
  const p = new Path2D()
  let any = false
  LEAVING.forEach((t0, j) => {
    const u = (t - t0) / 3.2
    if (u < 0 || u > 1) return
    any = true
    const s = S * (1.25 + 0.1 * j)
    const x = f.x1 + 1.5 * s - (w + 3 * s) * u
    let hy = f.y1 - 0.95 * s + 0.05 * s * Math.abs(Math.sin(t * 7 + j))
    const top = hy - 0.5 * s - (j === 1 ? 0.3 * s : 0)
    const cap = capAt(x)
    if (top < cap) hy += cap - top
    p.moveTo((x - 1.2 * s) * k, (f.y1 + 0.4) * k)
    p.lineTo((x - 1.0 * s) * k, (hy + 0.85 * s) * k)
    p.lineTo((x - 0.3 * s) * k, (hy + 0.55 * s) * k)
    p.lineTo((x + 0.3 * s) * k, (hy + 0.55 * s) * k)
    p.lineTo((x + 1.0 * s) * k, (hy + 0.85 * s) * k)
    p.lineTo((x + 1.2 * s) * k, (f.y1 + 0.4) * k)
    p.closePath()
    p.moveTo((x + 0.4 * s) * k, hy * k)
    p.ellipse(x * k, hy * k, 0.4 * s * k, 0.48 * s * k, 0, 0, Math.PI * 2)
    if (j === 1) {
      p.moveTo((x + 0.62 * s) * k, (hy - 0.3 * s) * k)
      p.ellipse(x * k, (hy - 0.3 * s) * k, 0.62 * s * k, 0.1 * s * k, 0, 0, Math.PI * 2)
      p.rect((x - 0.36 * s) * k, (hy - 0.7 * s) * k, 0.72 * s * k, 0.4 * s * k)
    }
  })
  if (!any) return
  ctx.save()
  ctx.lineJoin = 'round'
  for (const [wide, a] of SOFT) {
    ctx.strokeStyle = rgba(pen, C.near, a)
    ctx.lineWidth = wide * 1.3 * S * k
    ctx.stroke(p)
  }
  ctx.fillStyle = rgba(pen, C.near, 0.95)
  ctx.fill(p)
  ctx.restore()
}
