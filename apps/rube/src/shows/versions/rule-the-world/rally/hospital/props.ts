import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { layer, sway, type Frame } from '../depth'
import { ctxOf, ellipse, glint, line, mix, rect, rgba, ring, shape, type Pen } from '../pen'
import { gold } from './dawn'
import { CEIL, FLOOR, HEAD_X, T0 } from './geo'

/**
 * The ward's small life: the clock on the ward's wall going round toward six, the drip in Rachel's bottle, the flowers
 * on her nightstand nodding in the draught from the window, the corridor's ceiling fan turning, the nursery's mobile
 * turning over the bassinets, and the soft dark shapes close to the lens at the foot of the frame (a visitor's chair by
 * her bed; a trolley and a potted palm in the hall by the nursery) that slide by faster than the room as the camera goes.
 */

/* ------------------------------------------------------------------ the ward */

/** The ward's clock: an enamel face high on the wall, a little before six, its second hand ticking round. */
export function clock(pen: Pen, t: number, c: Pt, r: number): void {
  const { p } = pen
  ellipse(pen, [c[0] + 0.03, c[1] + 0.04], r * 1.08, r * 1.08, '#9AAE9F')
  ellipse(pen, c, r * 1.08, r * 1.08, '#56625C')
  ellipse(pen, c, r * 0.93, r * 0.93, '#F7F5EC')
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r0 = i % 3 === 0 ? 0.72 : 0.8
    line(pen, [c[0] + Math.sin(a) * r * r0, c[1] - Math.cos(a) * r * r0], [c[0] + Math.sin(a) * r * 0.86, c[1] - Math.cos(a) * r * 0.86], '#3E4642', i % 3 === 0 ? 0.9 : 0.5)
  }
  // The time of day: 5:53 at the cut, on by the show's own seconds; the second hand snaps on to each second.
  const day = 5 * 3600 + 53 * 60 + 12 + (t - T0)
  const sec = Math.floor(day)
  const snap = Math.min(1, (day - sec) / 0.07) + 0.06 * ring(day - sec - 0.07, 9, 0.05)
  const hand = (a: number, len: number, w: number, col: string) => {
    p.strokeCap(p.ROUND)
    line(pen, [c[0] - Math.sin(a) * len * 0.15, c[1] + Math.cos(a) * len * 0.15], [c[0] + Math.sin(a) * len, c[1] - Math.cos(a) * len], col, w)
  }
  hand(((day / 3600) % 12) / 12 * Math.PI * 2, r * 0.48, 1.6, '#2F3532')
  hand(((day / 60) % 60) / 60 * Math.PI * 2, r * 0.74, 1.1, '#2F3532')
  hand((((sec % 60) + snap) / 60) * Math.PI * 2, r * 0.8, 0.45, '#A33A30')
  ellipse(pen, c, 0.018, 0.018, '#2F3532')
  // The glass over its face, catching the window.
  glint(pen, [c[0] + r * 0.4, c[1] - r * 0.45], r * 0.35, '#FFFFFF', 0.25 + 0.25 * gold(t))
}

/**
 * Rachel's drip: a glass bottle upside down in its bail on a stand behind the nightstand, the drip chamber under it, a
 * drop gathering and falling, and the tube going down to her behind the bed's head.
 */
export function drip(pen: Pen, t: number, x: number): void {
  const top = -2.02
  // The stand, its hook arm, and its feet behind the nightstand.
  line(pen, [x, FLOOR - 0.08], [x, top], '#9AA39E', 1.1)
  line(pen, [x - 0.18, FLOOR - 0.06], [x + 0.18, FLOOR - 0.06], '#7E8782', 1)
  line(pen, [x, top + 0.04], [x - 0.27, top + 0.04], '#9AA39E', 0.9)
  const bx = x - 0.25
  line(pen, [bx, top + 0.04], [bx, top + 0.12], '#7E8782', 0.6)
  // The bottle, neck down; the fluid a little down from its base; a paper band round it.
  const b0 = top + 0.12
  const b1 = b0 + 0.36
  shape(pen, [[bx - 0.085, b0], [bx + 0.085, b0], [bx + 0.085, b1], [bx + 0.04, b1 + 0.07], [bx + 0.022, b1 + 0.1], [bx - 0.022, b1 + 0.1], [bx - 0.04, b1 + 0.07], [bx - 0.085, b1]], '#E4EEF0')
  shape(pen, [[bx - 0.075, b0 + 0.09], [bx + 0.075, b0 + 0.09], [bx + 0.075, b1], [bx + 0.035, b1 + 0.065], [bx - 0.035, b1 + 0.065], [bx - 0.075, b1]], '#EFE7C8')
  rect(pen, bx - 0.086, b0 + 0.17, bx + 0.086, b0 + 0.25, '#F6F3E8')
  line(pen, [bx - 0.06, b0 + 0.03], [bx - 0.06, b1 - 0.02], '#FFFFFF', 0.7)
  // The drip chamber, and the drop: gathering, falling, landing in the little pool.
  const c0 = b1 + 0.13
  const c1 = c0 + 0.16
  rect(pen, bx - 0.012, b1 + 0.1, bx + 0.012, c0, '#C9D3D0')
  shape(pen, [[bx - 0.03, c0], [bx + 0.03, c0], [bx + 0.03, c1], [bx - 0.03, c1]], '#E6EFF0')
  rect(pen, bx - 0.028, c1 - 0.04, bx + 0.028, c1, '#EFE7C8')
  const P = 1.45
  const u = ((((t - T0) / P) % 1) + 1) % 1
  if (u < 0.82) ellipse(pen, [bx, c0 + 0.012 + 0.008 * u], 0.006 + 0.008 * u, 0.007 + 0.01 * u, '#F4EED4')
  else ellipse(pen, [bx, c0 + 0.03 + (c1 - 0.06 - c0) * Math.min(1, (u - 0.82) / 0.1)], 0.011, 0.014, '#F4EED4')
  // The tube, down and round to her behind the bed's head.
  const { p, k } = pen
  p.noFill()
  p.stroke(pen.tone('#D9E3E3'))
  p.strokeWeight(pen.w * 0.7)
  p.bezier(bx * k, c1 * k, bx * k, (c1 + 0.6) * k, (HEAD_X + 0.6) * k, (c1 + 0.2) * k, (HEAD_X + 0.24) * k, -0.55 * k)
}

/** The flowers on her nightstand in a glass vase, nodding in the window's draught; one has dropped a petal. */
export function flowers(pen: Pen, t: number, vx: number, y: number): void {
  const blooms: [number, number, string][] = [
    [-0.12, 0.62, '#F3E5AE'],
    [0.07, 0.7, '#F7F2E6'],
    [-0.03, 0.78, '#EDC5C9'],
    [0.13, 0.55, '#F2D3A8'],
    [-0.16, 0.48, '#F7F2E6'],
  ]
  const neck: Pt = [vx, y - 0.24]
  blooms.forEach(([dx, h, col], i) => {
    const nod = 0.025 * sway(t, i * 1.7 + 3, 5.5 + i * 0.4)
    const tip: Pt = [vx + dx + nod, y - 0.24 - h * 0.5]
    line(pen, [neck[0] + dx * 0.15, neck[1]], tip, '#6F8F67', 0.7)
    if (i % 2 === 0) ellipse(pen, [(neck[0] + tip[0]) / 2 + 0.03, (neck[1] + tip[1]) / 2], 0.035, 0.012, '#7C9B71')
    ellipse(pen, tip, 0.058, 0.048, col)
    ellipse(pen, [tip[0] - 0.012, tip[1] - 0.014], 0.03, 0.022, mix(col, '#FFFFFF', 0.45))
  })
  // The vase: a squat glass, the water line in it.
  shape(pen, [[vx - 0.07, y - 0.02], [vx + 0.07, y - 0.02], [vx + 0.075, y - 0.16], [vx + 0.035, y - 0.25], [vx - 0.035, y - 0.25], [vx - 0.075, y - 0.16]], '#CADBDD')
  rect(pen, vx - 0.068, y - 0.12, vx + 0.068, y - 0.03, '#B8CFD2')
  line(pen, [vx - 0.045, y - 0.2], [vx - 0.05, y - 0.06], '#FFFFFF', 0.6)
  ellipse(pen, [vx + 0.17, y - 0.012], 0.03, 0.01, '#EDC5C9')
}

/* ------------------------------------------------------------------ the corridor */

/** The corridor's ceiling fan on its long rod, turning slowly: four blades seen from the side, the near ones over the hub. */
export function fan(pen: Pen, t: number, hub: Pt, f: Frame): void {
  if (hub[0] + 1 < f.x0 || hub[0] - 1 > f.x1 || hub[1] - 0.3 > f.y1) return
  const L = 0.66
  const col = '#6F6A61'
  const lite = '#8F897D'
  line(pen, [hub[0], CEIL], [hub[0], hub[1] - 0.1], col, 0.9)
  const th = t * 2.1
  const blade = (i: number) => {
    const a = th + (i * Math.PI) / 2
    const cx = Math.cos(a)
    const sy = Math.sin(a)
    const tip: Pt = [hub[0] + L * cx, hub[1] + 0.05 * sy]
    const w = 0.022 + 0.03 * Math.abs(sy)
    shape(pen, [[hub[0], hub[1] - 0.012], [tip[0], tip[1] - w], [tip[0] + 0.02 * Math.sign(cx), tip[1]], [tip[0], tip[1] + w * 0.6], [hub[0], hub[1] + 0.012]], sy > 0 ? lite : col)
  }
  for (let i = 0; i < 4; i++) if (Math.sin(th + (i * Math.PI) / 2) <= 0) blade(i)
  // The motor's housing.
  shape(pen, [[hub[0] - 0.08, hub[1] - 0.1], [hub[0] + 0.08, hub[1] - 0.1], [hub[0] + 0.11, hub[1] + 0.02], [hub[0] - 0.11, hub[1] + 0.02]], col)
  ellipse(pen, [hub[0], hub[1] + 0.035], 0.05, 0.022, lite)
  for (let i = 0; i < 4; i++) if (Math.sin(th + (i * Math.PI) / 2) > 0) blade(i)
}

/* ------------------------------------------------------------------ the nursery */

/** A little shape on the mobile: a star, a moon, a bird, a fish, in the nursery's pastels; `turn` is its own spin. */
function charm(pen: Pen, c: Pt, s: number, kind: number, turn: number, col: string): void {
  const sx = Math.max(0.25, Math.abs(Math.cos(turn)))
  const pts: Pt[] = []
  if (kind === 0) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 ? s * 0.45 : s
      pts.push([c[0] + Math.cos(a) * r * sx, c[1] + Math.sin(a) * r])
    }
  } else if (kind === 1) {
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI
      pts.push([c[0] + Math.cos(a) * s * sx, c[1] + Math.sin(a) * s])
    }
    for (let i = 12; i >= 0; i--) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI
      pts.push([c[0] + Math.cos(a) * s * 0.45 * sx, c[1] + Math.sin(a) * s * 0.8])
    }
  } else if (kind === 2) {
    pts.push([c[0] - s * sx, c[1]], [c[0] - s * 0.2 * sx, c[1] - s * 0.7], [c[0] + s * 0.2 * sx, c[1] - s * 0.15], [c[0] + s * sx, c[1] - s * 0.35], [c[0] + s * 0.4 * sx, c[1] + s * 0.35], [c[0] - s * 0.4 * sx, c[1] + s * 0.3])
  } else {
    pts.push([c[0] - s * sx, c[1]], [c[0] - s * 0.2 * sx, c[1] - s * 0.5], [c[0] + s * 0.5 * sx, c[1] - s * 0.1], [c[0] + s * sx, c[1] - s * 0.45], [c[0] + s * sx, c[1] + s * 0.45], [c[0] + s * 0.5 * sx, c[1] + s * 0.1], [c[0] - s * 0.2 * sx, c[1] + s * 0.5])
  }
  shape(pen, pts, col)
}

/**
 * The mobile over the bassinets, hung from the nursery's ceiling: a cross of wire turning slowly, and on each arm a
 * little shape on its thread, the near ones larger, each spinning on its own thread.
 */
export function mobile(pen: Pen, t: number, at: Pt, top: number): void {
  const th = t * 0.38 + 0.4 * sway(t, 2, 9)
  const R = 0.27
  const wire = '#8F8878'
  line(pen, [at[0], top], at, wire, 0.45)
  const cols = ['#A9C6E0', '#E8B2C0', '#EED58A', '#B5D6BB']
  const order = [0, 1, 2, 3].sort((a, b) => Math.sin(th + (a * Math.PI) / 2) - Math.sin(th + (b * Math.PI) / 2))
  line(pen, [at[0] - R * Math.cos(th), at[1] - 0.02 * Math.sin(th)], [at[0] + R * Math.cos(th), at[1] + 0.02 * Math.sin(th)], wire, 0.5)
  line(pen, [at[0] + R * Math.sin(th), at[1] - 0.02 * Math.cos(th)], [at[0] - R * Math.sin(th), at[1] + 0.02 * Math.cos(th)], wire, 0.5)
  for (const i of order) {
    const a = th + (i * Math.PI) / 2
    const near = Math.sin(a)
    const x = at[0] + R * Math.cos(a)
    const y0 = at[1] + 0.02 * near
    const drop = 0.13 + 0.05 * i + 0.008 * Math.sin(t * 1.7 + i)
    line(pen, [x, y0], [x, y0 + drop], wire, 0.35)
    charm(pen, [x, y0 + drop + 0.06], 0.07 * (1 + 0.14 * near), i, t * (0.6 + 0.2 * i) + i, mix(cols[i], '#8FA5B5', 0.12 - 0.12 * near))
  }
}

/* ------------------------------------------------------------------ the foreground */

const FG = '#26302B'

/** A shape close to the lens, out of focus: its body dark and a little hazed, its edge going soft in two steps. */
function soft(pen: Pen, path: Path2D, a: number): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = rgba(pen, FG, 0.09 * a)
  ctx.lineWidth = 0.13 * k
  ctx.stroke(path)
  ctx.strokeStyle = rgba(pen, FG, 0.2 * a)
  ctx.lineWidth = 0.065 * k
  ctx.stroke(path)
  ctx.fillStyle = rgba(pen, FG, 0.62 * a)
  ctx.fill(path, 'evenodd')
  ctx.restore()
}
const poly = (k: number, pts: Pt[], into = new Path2D()): Path2D => {
  pts.forEach(([x, y], i) => (i ? into.lineTo(x * k, y * k) : into.moveTo(x * k, y * k)))
  into.closePath()
  return into
}

/** How clear of Marty a foreground shape is on the screen (its box moved as its layer moves): it fades rather than cover him. */
function clearOf(box: [number, number, number, number], shift: Pt, marty: Pt): number {
  const dx = Math.max(box[0] + shift[0] - marty[0], marty[0] - (box[2] + shift[0]), 0)
  const dy = Math.max(box[1] + shift[1] - marty[1], marty[1] - (box[3] + shift[1]), 0)
  return smooth(Math.hypot(dx, dy), 0.25, 0.7)
}

/** The ward's foreground: a bentwood visitor's chair by her nightstand. */
const CHAIR_AT: Pt = [0.25, -0.45]
function chair(pen: Pen): Path2D {
  const { k } = pen
  const p = new Path2D()
  poly(k, [[2.18, 0.86], [2.86, 0.86], [2.86, 0.93], [2.18, 0.93]], p)
  poly(k, [[2.22, 0.9], [2.27, 0.9], [2.22, 1.6], [2.17, 1.6]], p)
  poly(k, [[2.74, 0.25], [2.8, 0.25], [2.86, 1.6], [2.8, 1.6]], p)
  // The bentwood hoop of its back: a ring.
  const h = new Path2D()
  h.ellipse(2.83 * k, 0.55 * k, 0.14 * k, 0.33 * k, 0.12, 0, Math.PI * 2)
  h.ellipse(2.83 * k, 0.55 * k, 0.09 * k, 0.27 * k, 0.12, 0, Math.PI * 2)
  p.addPath(h)
  return p
}

/** The nursery hall's foreground: a nurses' trolley at the left with its folded nappies and jug, a potted palm at the right. */
const HALL_AT: Pt = [-8.6, -0.65]
function trolley(pen: Pen): Path2D {
  const { k } = pen
  const p = new Path2D()
  poly(k, [[-12.45, 0.86], [-11.2, 0.86], [-11.2, 0.92], [-12.45, 0.92]], p)
  poly(k, [[-12.42, 0.6], [-12.37, 0.6], [-12.37, 1.7], [-12.42, 1.7]], p)
  poly(k, [[-12.5, 0.58], [-12.3, 0.58], [-12.3, 0.63], [-12.5, 0.63]], p)
  poly(k, [[-11.27, 0.9], [-11.22, 0.9], [-11.22, 1.7], [-11.27, 1.7]], p)
  // Folded nappies in two piles, and a kidney dish.
  poly(k, [[-12.2, 0.86], [-11.82, 0.86], [-11.84, 0.74], [-12.18, 0.74]], p)
  poly(k, [[-12.16, 0.735], [-11.86, 0.735], [-11.88, 0.66], [-12.14, 0.66]], p)
  poly(k, [[-11.72, 0.86], [-11.4, 0.86], [-11.42, 0.76], [-11.7, 0.76]], p)
  poly(k, [[-11.36, 0.86], [-11.24, 0.86], [-11.22, 0.82], [-11.38, 0.82]], p)
  return p
}
function palm(pen: Pen, t: number): Path2D {
  const { k } = pen
  const p = new Path2D()
  const base: Pt = [-5.05, 1.2]
  poly(k, [[base[0] - 0.24, base[1]], [base[0] + 0.24, base[1]], [base[0] + 0.2, 1.75], [base[0] - 0.2, 1.75]], p)
  for (let i = 0; i < 7; i++) {
    const h = hash(i, 5, 9)
    const a = -Math.PI / 2 + (i - 3) * 0.32 + 0.04 * sway(t, i + 11, 6.5)
    const len = 0.55 + 0.35 * h
    const tip: Pt = [base[0] + Math.cos(a) * len, base[1] - 0.05 + Math.sin(a) * len * 0.9]
    const mid: Pt = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 - 0.04]
    const nx = -(tip[1] - base[1]) / len
    const ny = (tip[0] - base[0]) / len
    const w = 0.06 + 0.03 * h
    p.moveTo(base[0] * k, (base[1] - 0.05) * k)
    p.quadraticCurveTo((mid[0] + nx * w) * k, (mid[1] + ny * w) * k, tip[0] * k, tip[1] * k)
    p.quadraticCurveTo((mid[0] - nx * w) * k, (mid[1] - ny * w) * k, base[0] * k, (base[1] - 0.05) * k)
    p.closePath()
  }
  return p
}

/**
 * The foreground, close to the lens at the foot of the frame and moving a third again as fast as the room. It is for
 * the close shots: it goes as the camera draws back (a wider frame than the nursery's), and it fades rather than come
 * over Marty.
 */
export function foreground(pen: Pen, t: number, f: Frame, marty: Pt): void {
  const h = f.y1 - f.y0
  const vis = 1 - smooth(h, 4.6, 5.8)
  if (vis < 0.01) return
  const d = 1.3
  const shiftOf = (anchor: Pt): Pt => [(f.cx - anchor[0]) * (1 - d), (f.cy - anchor[1]) * (1 - d)]
  const ward = shiftOf(CHAIR_AT)
  if (f.x1 > 2.0 + ward[0] && f.x0 < 3.0 + ward[0]) {
    const a = vis * clearOf([2.1, 0.2, 3.0, 1.6], ward, marty)
    if (a > 0.01) layer(pen, f, d, () => soft(pen, chair(pen), a), CHAIR_AT)
  }
  const hall = shiftOf(HALL_AT)
  if (f.x1 > -12.6 + hall[0] && f.x0 < -11.1 + hall[0]) {
    const a = vis * clearOf([-12.55, 0.55, -11.15, 1.7], hall, marty)
    if (a > 0.01) layer(pen, f, d, () => soft(pen, trolley(pen), a), HALL_AT)
  }
  if (f.x1 > -6.0 + hall[0] && f.x0 < -4.1 + hall[0]) {
    const a = vis * clearOf([-5.95, 0.3, -4.15, 1.75], hall, marty)
    if (a > 0.01) layer(pen, f, d, () => soft(pen, palm(pen, t), a), HALL_AT)
  }
}
