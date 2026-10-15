import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { depth, type Ctx } from '../kit'
import { fall } from '../music'
import { HOME, VOID } from '../worlds'
import { BEHIND } from './bagel'
import { PULLEY, RP, TAUT, TURN, T_IN, T_OUT, WAY_X } from './peakClock'

/**
 * The rig Waymond's line runs on: the peak's machine, the biggest in the show.
 *
 * The pulley does not hang from nothing. It hangs from the jib of an iron headframe that stands in the dark to the
 * left of the bagel, as a pit's winding tower stands over its shaft: a lattice tower and its raking back leg, the jib
 * out over the bagel with a stay to the mast, and down the tower's face the guides his weight runs in. The line is
 * governed by a clock: on the tower hangs a great brass escapement, its anchor rocked by a long pendulum, and a chain
 * from its arbor up to the jib, where the pulley's rod hangs. Held cocked while the machine waits (Waymond on the
 * pulley, the two of them at the lip), it is let go as the balance tips on beat 119, and from then the pendulum
 * swings a beat each way and the wheel lets go a tooth a beat, every lurch of the bagel a tick, to the window at the
 * jump.
 *
 * All of it is in the dark's own cells, "rel" (`peakClock.ts`): the bagel's resting centre is 0, 0. It stands left
 * of the line, clear of the bagel as it shrinks and climbs toward it, so the camera's draw-backs find more of it.
 */

/* ------------------------------------------------------------------ geometry (rel cells) */

/** The tower: its centre line, its half-width, its foot (below any frame) and its head. */
const TX = -8.15
const TW = 0.36
const FOOT = 9
const HEAD = -8.55
/** The back leg, from the head down and out to the left. */
const LEG_FOOT: Pt = [-12.2, FOOT]
/** The jib: its two chords, from the tower out past the pulley. */
const JIB = { x0: TX - TW, x1: PULLEY[0] + 0.85, top: -8.0, bot: -7.62 }
/** The mast over the head, and the stay from it to the jib's tip. */
const MAST: Pt = [TX, -9.7]
/** The sprocket under the jib that the pulley's rod hangs from, and its radius. */
export const JIB_WHEEL: Pt = [PULLEY[0], -7.22]
const JR = 0.2
/** The escapement wheel's arbor, its radius and teeth; the anchor's pivot over it; the pendulum's length and its bob. */
const ESC: Pt = [-7.4, -3.75]
const ER = 1.18
const TEETH = 15
const ES = 0.3
const PIVOT: Pt = [ESC[0], ESC[1] - ER - 0.34]
const PEND = 4.05
const BOB = 0.34
/** The pendulum's swing either way (radians). */
const SWING = 0.105
/** The guides his weight runs down in, either side of his line, from under the pulley. */
const RAILS = [WAY_X - 0.23, WAY_X + 0.23]
const RAIL_TOP = PULLEY[1] + RP + 0.42
/** The girders from the tower across to the guides. */
const STRUTS = [0.55, 3.35]

/* ------------------------------------------------------------------ the clock */

const BEAT = fall(1) - fall(0)
/** Every beat the escapement lets a tooth go on: from the tip of the balance to the last notch before the jump. */
const TICKS: number[] = []
for (let k = 119; k <= 159; k++) TICKS.push(fall(k))
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const ss = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
/** One tooth let go: most of it in the first tenth of a second, a small recoil, still well before the next. */
function step(x: number): number {
  if (x <= 0) return 0
  if (x >= 0.3) return 1
  return ss(x / 0.08) - 0.07 * Math.sin(Math.PI * clamp01((x - 0.08) / 0.22))
}
/** How many teeth the wheel has let go by `t`. */
function teeth(t: number): number {
  let n = 0
  for (const at of TICKS) {
    if (t <= at) break
    n += step(t - at)
  }
  return n
}
/**
 * The pendulum's angle (radians, + to the right). Held cocked to the right while the machine waits, with a shiver when
 * the line snaps taut; let go on beat 119, it swings out to the left on the next beat and back on the one after, a
 * beat each way, each tick at the end of a swing.
 */
function swingAt(t: number): number {
  if (t < TURN) {
    const x = t - TAUT
    return SWING + (x > 0 ? 0.012 * Math.exp(-x / 0.12) * Math.sin(x * 70) : 0)
  }
  return SWING * Math.cos((Math.PI * (t - TURN)) / BEAT)
}

/* ------------------------------------------------------------------ drawing */

const IRON = mixHex(VOID.poppy, VOID.bagel, 0.35)
const IRON_FACE = VOID.poppy
const BRASS = mixHex(HOME.gold, VOID.bagel, 0.5)
const BRASS_DEEP = mixHex(HOME.gold, VOID.bagel, 0.68)
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** A lattice girder from a to b, `w` deep: two chords and the zigzag lacing between, panel by panel. `far` dims it into the dark. */
function girder(ctx: CanvasRenderingContext2D, k: number, a: Pt, b: Pt, w: number, ink: string, weight: number, far = 0): void {
  const near = 1 - far
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy)
  if (L < 1e-6) return
  const ux = dx / L
  const uy = dy / L
  const nx = -uy * (w / 2)
  const ny = ux * (w / 2)
  const A1: Pt = [a[0] + nx, a[1] + ny]
  const A2: Pt = [a[0] - nx, a[1] - ny]
  const B1: Pt = [b[0] + nx, b[1] + ny]
  const B2: Pt = [b[0] - nx, b[1] - ny]
  // The web behind, a shade off the dark, so the girder reads as a thing and not as two lines.
  ctx.fillStyle = far ? mixHex(IRON, VOID.bagel, 0.25 + 0.5 * far) : rgba(IRON, 0.55)
  ctx.beginPath()
  ctx.moveTo(A1[0] * k, A1[1] * k)
  ctx.lineTo(B1[0] * k, B1[1] * k)
  ctx.lineTo(B2[0] * k, B2[1] * k)
  ctx.lineTo(A2[0] * k, A2[1] * k)
  ctx.closePath()
  ctx.fill()
  // The lacing.
  const panels = Math.max(1, Math.round(L / (w * 1.15)))
  ctx.strokeStyle = rgba(ink, 0.22 * near)
  ctx.lineWidth = Math.max(0.6, weight * 0.55)
  ctx.beginPath()
  for (let i = 0; i < panels; i++) {
    const s0 = (i / panels) * L
    const s1 = ((i + 1) / panels) * L
    const side = i % 2 ? 1 : -1
    ctx.moveTo((a[0] + ux * s0 + side * nx) * k, (a[1] + uy * s0 + side * ny) * k)
    ctx.lineTo((a[0] + ux * s1 - side * nx) * k, (a[1] + uy * s1 - side * ny) * k)
  }
  ctx.stroke()
  // The two chords: iron, lit along their edges by the great light above.
  const chord = Math.max(1.2, w * 0.2 * k)
  for (const [P, Q] of [[A1, B1], [A2, B2]] as [Pt, Pt][]) {
    ctx.lineCap = 'butt'
    ctx.strokeStyle = rgba(ink, 0.38 * near)
    ctx.lineWidth = chord + 1.4 * weight * 0.6
    ctx.beginPath()
    ctx.moveTo(P[0] * k, P[1] * k)
    ctx.lineTo(Q[0] * k, Q[1] * k)
    ctx.stroke()
    ctx.strokeStyle = far ? mixHex(IRON_FACE, VOID.bagel, 0.3 + 0.4 * far) : IRON_FACE
    ctx.lineWidth = chord
    ctx.stroke()
  }
}

/** A plain bar from a to b, `w` thick, in iron or brass. */
function bar(ctx: CanvasRenderingContext2D, k: number, a: Pt, b: Pt, w: number, fill: string, ink: string, weight: number, inkA = 0.45): void {
  ctx.lineCap = 'round'
  ctx.strokeStyle = rgba(ink, inkA)
  ctx.lineWidth = w * k + 1.4 * weight * 0.6
  ctx.beginPath()
  ctx.moveTo(a[0] * k, a[1] * k)
  ctx.lineTo(b[0] * k, b[1] * k)
  ctx.stroke()
  ctx.strokeStyle = fill
  ctx.lineWidth = w * k
  ctx.stroke()
}

/** A disc at c, radius r: a fill and an ink rim. */
function disc(ctx: CanvasRenderingContext2D, k: number, c: Pt, r: number, fill: string, ink: string, weight: number, inkA = 0.5): void {
  ctx.beginPath()
  ctx.arc(c[0] * k, c[1] * k, r * k, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = rgba(ink, inkA)
  ctx.lineWidth = Math.max(0.8, weight * 0.8)
  ctx.stroke()
}

/** The escape wheel at its arbor, turned `a`: hooked brass teeth round a rim, crossed spokes, the chain's sprocket on its hub. */
function escapeWheel(ctx: CanvasRenderingContext2D, k: number, a: number, ink: string, weight: number): void {
  const [x, y] = ESC
  const root = ER * 0.84
  ctx.beginPath()
  for (let i = 0; i < TEETH; i++) {
    const b = a + (i * 2 * Math.PI) / TEETH
    const pitch = (2 * Math.PI) / TEETH
    // Up the tooth's straight face to its tip, leaning ahead, and down its long back to the next root.
    ctx.lineTo((x + root * Math.cos(b)) * k, (y + root * Math.sin(b)) * k)
    ctx.lineTo((x + ER * Math.cos(b + 0.1)) * k, (y + ER * Math.sin(b + 0.1)) * k)
    ctx.lineTo((x + root * Math.cos(b + pitch * 0.92)) * k, (y + root * Math.sin(b + pitch * 0.92)) * k)
  }
  ctx.closePath()
  ctx.fillStyle = BRASS
  ctx.fill()
  ctx.strokeStyle = rgba(ink, 0.55)
  ctx.lineWidth = Math.max(0.8, weight * 0.8)
  ctx.stroke()
  // The rim's inside edge, and the open wheel: the dark through it between the spokes.
  ctx.beginPath()
  ctx.arc(x * k, y * k, root * 0.8 * k, 0, Math.PI * 2)
  ctx.fillStyle = VOID.bagel
  ctx.fill()
  ctx.stroke()
  for (let i = 0; i < 4; i++) {
    const s = a + (i * Math.PI) / 2 + 0.3
    bar(ctx, k, [x + 0.1 * Math.cos(s), y + 0.1 * Math.sin(s)], [x + root * 0.82 * Math.cos(s), y + root * 0.82 * Math.sin(s)], 0.08, BRASS, ink, weight, 0.5)
  }
  // The sprocket on its hub, its teeth turning with it.
  ctx.beginPath()
  const n = 12
  for (let i = 0; i < 2 * n; i++) {
    const b = a + (i * Math.PI) / n
    const r = i % 2 ? ES * 0.82 : ES
    ctx.lineTo((x + r * Math.cos(b)) * k, (y + r * Math.sin(b)) * k)
  }
  ctx.closePath()
  ctx.fillStyle = IRON_FACE
  ctx.fill()
  ctx.strokeStyle = rgba(ink, 0.5)
  ctx.stroke()
  disc(ctx, k, ESC, 0.09, BRASS, ink, weight)
}

/** The outer tangent lines between two circles (centres a, b; radii ra, rb): the chain's two runs. */
function tangents(a: Pt, ra: number, b: Pt, rb: number): [Pt, Pt][] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const d = Math.hypot(dx, dy)
  const base = Math.atan2(dy, dx)
  const off = Math.acos((ra - rb) / d)
  return [1, -1].map((s) => {
    const n = base + s * off
    return [
      [a[0] + ra * Math.cos(n), a[1] + ra * Math.sin(n)],
      [b[0] + rb * Math.cos(n), b[1] + rb * Math.sin(n)],
    ] as [Pt, Pt]
  })
}

/** The chain from the escapement's sprocket up to the jib's: two runs, their links moving on as the wheel lets a tooth go. */
function chain(ctx: CanvasRenderingContext2D, k: number, travel: number, ink: string, weight: number): void {
  const runs = tangents(ESC, ES, JIB_WHEEL, JR)
  const pitch = 0.11
  const links = new Path2D()
  runs.forEach(([a, b], i) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ux = (b[0] - a[0]) / L
    const uy = (b[1] - a[1]) / L
    bar(ctx, k, a, b, 0.045, IRON_FACE, ink, weight, 0.4)
    // The links: one run goes up as the other comes down.
    const s0 = (((i ? -travel : travel) % pitch) + pitch) % pitch
    const ang = Math.atan2(uy, ux)
    for (let s = s0; s < L; s += pitch) {
      const px = (a[0] + ux * s) * k
      const py = (a[1] + uy * s) * k
      links.moveTo(px + Math.cos(ang) * pitch * 0.32 * k, py + Math.sin(ang) * pitch * 0.32 * k)
      links.ellipse(px, py, pitch * 0.32 * k, 0.03 * k, ang, 0, Math.PI * 2)
    }
  })
  ctx.fillStyle = rgba(ink, 0.42)
  ctx.fill(links)
  // The jib's sprocket, on its hanger, and round both sprockets the chain's turn.
  const turnB = -travel / JR
  ctx.beginPath()
  const n = 9
  for (let i = 0; i < 2 * n; i++) {
    const b = turnB + (i * Math.PI) / n
    const r = i % 2 ? JR * 0.8 : JR
    ctx.lineTo((JIB_WHEEL[0] + r * Math.cos(b)) * k, (JIB_WHEEL[1] + r * Math.sin(b)) * k)
  }
  ctx.closePath()
  ctx.fillStyle = IRON_FACE
  ctx.fill()
  ctx.strokeStyle = rgba(ink, 0.5)
  ctx.lineWidth = Math.max(0.8, weight * 0.8)
  ctx.stroke()
  disc(ctx, k, JIB_WHEEL, 0.06, BRASS, ink, weight)
}

/** The anchor over the wheel, rocked `a` with the pendulum: its two arms down to the pallets that catch the teeth. */
function anchor(ctx: CanvasRenderingContext2D, k: number, a: number, ink: string, weight: number): void {
  const [px, py] = PIVOT
  const reach = ER + 0.34
  const at = (ang: number, r: number): Pt => [px + r * Math.sin(ang + a), py + r * Math.cos(ang + a)]
  for (const side of [-1, 1]) {
    const pallet = at(side * 0.62, reach * 0.93)
    bar(ctx, k, PIVOT, pallet, 0.1, BRASS_DEEP, ink, weight, 0.5)
    // The pallet's jewel: a small dark block on the arm's end.
    const tip = at(side * 0.58, reach * 1.03)
    bar(ctx, k, pallet, tip, 0.13, VOID.bagelRim, ink, weight, 0.5)
  }
  disc(ctx, k, PIVOT, 0.12, BRASS, ink, weight)
}

/** The pendulum from the pivot, swung `a`: a brass rod and a lens-shaped bob. */
function pendulum(ctx: CanvasRenderingContext2D, k: number, a: number, ink: string, weight: number): void {
  const [px, py] = PIVOT
  const bob: Pt = [px + PEND * Math.sin(a), py + PEND * Math.cos(a)]
  bar(ctx, k, PIVOT, bob, 0.05, BRASS_DEEP, ink, weight, 0.45)
  ctx.save()
  ctx.translate(bob[0] * k, bob[1] * k)
  ctx.rotate(-a)
  ctx.beginPath()
  ctx.ellipse(0, 0, BOB * k, BOB * 0.78 * k, 0, 0, Math.PI * 2)
  ctx.fillStyle = BRASS
  ctx.fill()
  ctx.strokeStyle = rgba(ink, 0.55)
  ctx.lineWidth = Math.max(0.8, weight * 0.8)
  ctx.stroke()
  // Its turned face: a ring, and the great light caught along its top.
  ctx.beginPath()
  ctx.ellipse(0, 0, BOB * 0.6 * k, BOB * 0.46 * k, 0, 0, Math.PI * 2)
  ctx.strokeStyle = rgba(ink, 0.3)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, 0, BOB * 0.86 * k, BOB * 0.64 * k, 0, Math.PI * 1.15, Math.PI * 1.85)
  ctx.strokeStyle = rgba(VOID.rimLight, 0.35)
  ctx.lineWidth = Math.max(1, weight)
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ the far ironwork */

/**
 * Further back in the dark, behind the bagel, the house the machine stands in: tall lattice columns, X-braced
 * between, going up out of the frame, iron gone almost to the dark's own black. Barely there while the dark is dark; as the beams of
 * every life come up behind the bagel it stands against them, so the light shows how big the place is. It moves at
 * half the camera's speed, so every draw-back and push-in has the near iron sliding past the far.
 */
const FAR_F = 0.5
/** Where the camera stands when the far iron is where it is drawn: the peak's wide. */
const FAR_REF: Pt = [-1.8, -1.6]
const FAR_COLS = [-15.5, -6.2, 6.6, 15.4]

function drawFar(p: p5, k: number, ink: string, weight: number, T: number): void {
  if (T < T_IN - 1.5 || T > T_OUT + 0.6) return
  depth(p, k, FAR_F, FAR_REF, (fr) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    const top = fr.y0 - 0.5
    const bottom = fr.y1 + 0.5
    for (const x of FAR_COLS) {
      if (x < fr.x0 - 1 || x > fr.x1 + 1) continue
      girder(ctx, k, [x, bottom], [x, top], 0.62, ink, weight, 0.8)
    }
    // X-braced bays between the columns, the far house's walls.
    for (let i = 0; i + 1 < FAR_COLS.length; i++) {
      const a = FAR_COLS[i] + 0.31
      const b = FAR_COLS[i + 1] - 0.31
      if (b < fr.x0 || a > fr.x1) continue
      for (const [y0, y1] of [[-11.4, -2.4], [-2.4, 6.6], [6.6, 15.6]]) {
        if (y0 > bottom || y1 < top) continue
        bar(ctx, k, [a, y0], [b, y1], 0.06, mixHex(IRON_FACE, VOID.bagel, 0.55), ink, weight, 0.07)
        bar(ctx, k, [b, y0], [a, y1], 0.06, mixHex(IRON_FACE, VOID.bagel, 0.55), ink, weight, 0.07)
      }
    }
    ctx.restore()
  })
}
BEHIND.push(drawFar)

/** Where the pulley's rod meets the hanger under the jib (rel): what `drawPulley` hangs the pulley from. */
export const ROD_TOP = JIB_WHEEL[1] + JR + 0.02

/**
 * The rig, at `T` (show seconds), drawn in the dark's own cells ("rel"): the caller has moved the canvas there. Under
 * the line and the pulley, over the radiance, so the beams pass behind the iron.
 */
export function drawRig(p: p5, c: Ctx, T: number, view: { x0: number; x1: number; y0: number; y1: number }): void {
  if (T < T_IN - 1.5 || T > T_OUT + 0.6) return
  if (view.x0 > PULLEY[0] + 1.2) return
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const bottom = Math.min(FOOT, view.y1 + 1)
  // The back leg, behind, raking out to the left: down to the frame's foot along its line.
  const legAt = (y: number): number => TX - TW + ((y - (HEAD + 0.5)) / (LEG_FOOT[1] - (HEAD + 0.5))) * (LEG_FOOT[0] - (TX - TW))
  girder(ctx, k, [TX - TW, HEAD + 0.5], [legAt(bottom), bottom], 0.42, ink, weight)
  // The tower, from below the frame up to its head, braced across to the leg.
  girder(ctx, k, [TX, bottom], [TX, HEAD], TW * 2, ink, weight)
  for (const y of [-5.6, -1.6, 2.2]) {
    if (y > bottom) continue
    bar(ctx, k, [legAt(y), y], [TX - TW, y], 0.07, IRON_FACE, ink, weight, 0.35)
  }
  // The girders across to the guides, and the guides his weight runs down in.
  for (const y of STRUTS) {
    if (y > bottom) continue
    girder(ctx, k, [TX + TW, y], [RAILS[0] - 0.04, y], 0.24, ink, weight)
  }
  for (const x of RAILS) bar(ctx, k, [x, RAIL_TOP], [x, bottom], 0.055, IRON_FACE, ink, weight, 0.42)
  // Their head: a crosshead joining the two under the pulley.
  bar(ctx, k, [RAILS[0] - 0.08, RAIL_TOP], [RAILS[1] + 0.08, RAIL_TOP], 0.07, IRON_FACE, ink, weight, 0.42)
  // The mast and the stay to the jib's tip; the jib out over the bagel.
  bar(ctx, k, [TX, HEAD], MAST, 0.12, IRON_FACE, ink, weight, 0.4)
  bar(ctx, k, MAST, [JIB.x1, JIB.top], 0.04, IRON_FACE, ink, weight, 0.35)
  girder(ctx, k, [JIB.x0, (JIB.top + JIB.bot) / 2], [JIB.x1, (JIB.top + JIB.bot) / 2], JIB.bot - JIB.top, ink, weight)
  // The tower's head: a cap plate with its rivets.
  bar(ctx, k, [TX - TW - 0.12, HEAD], [TX + TW + 0.12, HEAD], 0.14, IRON_FACE, ink, weight, 0.45)
  // The jib sprocket's hanger.
  bar(ctx, k, [JIB_WHEEL[0], JIB.bot], JIB_WHEEL, 0.06, IRON_FACE, ink, weight, 0.45)
  // The escapement's bracket off the tower, and the clock itself.
  bar(ctx, k, [TX + TW, ESC[1]], ESC, 0.16, IRON_FACE, ink, weight, 0.4)
  bar(ctx, k, [TX + TW, PIVOT[1]], PIVOT, 0.1, IRON_FACE, ink, weight, 0.4)
  const n = teeth(T)
  const wheel = -(n * 2 * Math.PI) / TEETH
  chain(ctx, k, -wheel * ES, ink, weight)
  escapeWheel(ctx, k, wheel, ink, weight)
  const a = swingAt(T)
  anchor(ctx, k, -a * 0.9, ink, weight)
  pendulum(ctx, k, a, ink, weight)
  ctx.restore()
}

/* ------------------------------------------------------------------ the near hawser */

/**
 * Close to the lens, across the top right, a slack hawser hangs from somewhere above the frame to somewhere off it, out
 * of focus and dark against the beams, its top edge just caught by the great light. It moves at more than one and a
 * half times the camera's speed, so the machine has something in front of it as well as behind; it sways, and every
 * tick of the clock goes through the house and shivers it.
 */
const NEAR_F = 1.6
const HAWSER: [Pt, Pt] = [[1.9, -8.6], [10.5, -3.2]]
const SAG = 2.1
const HAWSER_W = 0.2

export function drawNearRope(p: p5, c: Ctx, T: number): void {
  if (T < T_IN - 1.5 || T > T_OUT + 0.6) return
  const { k } = c
  depth(p, k, NEAR_F, FAR_REF, (fr) => {
    const [a, b] = HAWSER
    if (fr.x1 < a[0] - 0.5 || fr.y0 > b[1] + SAG + 0.5) return
    let shiver = 0
    for (const at of TICKS) {
      const x = T - at
      if (x < 0) break
      if (x < 0.6) shiver += 0.035 * Math.exp(-x / 0.14) * Math.sin(x * 48)
    }
    const sway = 0.12 * Math.sin(T * 1.9) + 0.05 * Math.sin(T * 3.1 + 1)
    const pts: Pt[] = []
    for (let i = 0; i <= 24; i++) {
      const u = i / 24
      const bow = 4 * u * (1 - u)
      pts.push([a[0] + (b[0] - a[0]) * u + 0.3 * sway * bow, a[1] + (b[1] - a[1]) * u + (SAG + sway + shiver) * bow])
    }
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const path = () => {
      ctx.beginPath()
      ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
    }
    // Soft, out of focus: a wider faint pass under the body. Then the light along its top.
    path()
    ctx.strokeStyle = rgba(VOID.bagel, 0.35)
    ctx.lineWidth = HAWSER_W * 1.35 * k
    ctx.stroke()
    ctx.strokeStyle = mixHex(VOID.bagel, VOID.poppy, 0.25)
    ctx.lineWidth = HAWSER_W * k
    ctx.stroke()
    ctx.translate(0, -HAWSER_W * 0.32 * k)
    path()
    ctx.strokeStyle = rgba(VOID.rimLight, 0.16)
    ctx.lineWidth = Math.max(1, HAWSER_W * 0.16 * k)
    ctx.stroke()
    ctx.restore()
  })
}
