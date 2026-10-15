import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { drawInk, drawScreen, inkRing, mix, rgba, shellOnScreen } from '../cast'
import { box, frame, hash, part, route, scenery, smooth, type PartShot, type Way } from '../kit'
import { SEAM, nearestBeat, onset } from '../music'
import type { ShellSpot } from '../seams'
import { shellDown } from '../shell-path'
import { HALL, TENT } from '../worlds'

/**
 * The lecture hall at the university, twice: the film's first scene and, years on, its last flash-forward.
 *
 * - The day they came (98.429 → 102.110, after the bed). The hall dim for the projector, Louise at the lectern, her
 *   students up the rising rows. On the half cadence their phones light, one and then another and then all of them,
 *   up and down the rows; on the beat she touches the lectern and the screen behind her comes on: the news, a shell
 *   coming down out of the cloud over Montana. The camera pushes into the screen until its picture is the frame, and
 *   on the double bass the show cuts on the shell to the real one (the cut the television made before).
 * - Years on (266.124 → 269.915, after the fog, before the gala). The same hall in daylight, full; on the screen, white,
 *   and as she touches the lectern their writing comes up on it from both ends, the great logogram she was given in
 *   the fog: she teaches it. The opening lecture played forward.
 *
 * Its own world cells, y down: she stands on the stage at (0, 0); the floor's face at y = R.
 */

const b = (t: number): number => nearestBeat(t)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/* ------------------------------------------------------------------ the room */

const FLOOR = R
/** The lectern on her right: its foot, its slanted top. */
const LECTERN = { x: 0.42, w: 0.3, top: -0.42 }
/** The screen on the back wall over the front rows (16:9). */
export const SCREEN = { x: 0.05, y: -3.25, w: 3.3, h: (3.3 * 9) / 16 }
/** The rows going up away from the stage to the right: where each begins, how wide, how much higher than the last. */
const ROWS = { x0: 1.85, w: 0.78, rise: 0.24, n: 5 }
const rowTop = (r: number): number => FLOOR - ROWS.rise * (r + 1)

/** The students: two a row (one nearer, one a little further and higher), facing the stage. */
interface Student {
  x: number
  y: number
  s: number
  near: boolean
  seed: number
  /** When their phone lights, the day they came. */
  phone: number
  /** Only there years on: the rows fuller, the world learning. */
  later: boolean
}
/** The half cadence and the onsets after it: the news reaching them, a few at a time. */
const PINGS = [98.429, 98.557, 98.679, 98.795, 98.963, 99.463, 99.788, 99.944, 100.206].map((t) => (t === 98.429 ? b(t) : onset(t, 0.45)))
const STUDENTS: Student[] = (() => {
  const out: Student[] = []
  for (let r = 0; r < ROWS.n; r++) {
    for (const near of [false, true]) {
      const x = ROWS.x0 + r * ROWS.w + (near ? 0.28 : 0.55) + 0.06 * (hash(r, near ? 1 : 2, 31) - 0.5)
      const s = near ? 1 : 0.86
      const y = rowTop(r) - R * s - (near ? 0 : 0.03)
      // Back rows first, then down to the front, the far ones a beat behind the near: the news spreading.
      const order = (ROWS.n - 1 - r) * 2 + (near ? 0 : 1)
      out.push({ x, y, s, near, seed: r * 2 + (near ? 1 : 0), phone: PINGS[Math.min(PINGS.length - 1, Math.floor(order * 0.9))], later: false })
    }
    // Years on, a third in every row, between the two.
    out.push({ x: ROWS.x0 + r * ROWS.w + 0.42, y: rowTop(r) - R * 0.93 - 0.015, s: 0.93, near: false, seed: 40 + r, phone: Infinity, later: true })
  }
  return out.sort((p, q) => Number(p.near) - Number(q.near))
})()

/* ------------------------------------------------------------------ the clock */

export const H = {
  /** The day they came. */
  in: SEAM.news,
  /** Her touch on the lectern: the screen comes on. */
  touch: b(99.376),
  out: SEAM.arrival,
  /** Years on. */
  futureIn: SEAM.future,
  /** Her touch, and their writing up on the screen, closing on the beat. */
  teach: b(267.012),
  stroke: b(267.964),
  closes: b(268.968),
  futureOut: SEAM.gala,
}
export const HALL_HITS = [...PINGS, H.touch, b(100.27), b(101.187), H.teach, H.stroke, H.closes].filter((t, i, all) => all.indexOf(t) === i)

const present = (t: number): boolean => t < 200
/** The screen on: the news coming up, with a flicker, from her touch; years on, white from the start. */
function screenOn(t: number): number {
  if (!present(t)) return 1
  const u = t - H.touch
  if (u < 0) return 0
  const dip = u < 0.2 ? 0.5 * Math.exp(-((u - 0.06) ** 2) / 0.002) : 0
  return clamp01(Math.max(smooth(u, 0.05, 0.4), dip))
}
/** How lit the hall is: dim for the projector the day they came, full daylight years on. */
const roomLight = (t: number): number => (present(t) ? 0.22 + 0.12 * screenOn(t) : 1)

/** The great logogram, the one she was given beyond the glass, as she teaches it. */
const TAUGHT = inkRing(253)
const taughtU = (t: number): number => {
  if (t < H.teach) return 0
  if (t < H.stroke) return 0.55 * smooth(t, H.teach, H.stroke)
  return 0.55 + 0.45 * smooth(t, H.stroke, H.closes)
}

/* ------------------------------------------------------------------ the drawing */

type Ctx = CanvasRenderingContext2D

function drawHall(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  const px = (v: number) => v * k
  const L = roomLight(t)
  const on = screenOn(t)
  ctx.save()
  // The back wall: dark wooden panelling, lit from the screen; years on, warm in the day's light through high windows.
  const day = present(t) ? 0 : 1
  const wall = mix(mix(HALL.wall, HALL.wallLit, L), HALL.lamp, 0.32 * day)
  const g = ctx.createLinearGradient(0, px(f.y0 - 1), 0, px(FLOOR))
  g.addColorStop(0, mix(wall, HALL.dark, 0.35))
  g.addColorStop(1, wall)
  ctx.fillStyle = g
  ctx.fillRect(px(f.x0 - 1), px(f.y0 - 1), px(f.x1 - f.x0 + 2), px(FLOOR - f.y0 + 1))
  // Its panels' seams.
  ctx.fillStyle = rgba(HALL.dark, 0.35)
  for (let x = Math.floor((f.x0 - 1) / 1.2) * 1.2; x < f.x1 + 1; x += 1.2) ctx.fillRect(px(x), px(f.y0 - 1), Math.max(1, px(0.02)), px(FLOOR - f.y0 + 1))
  // The screen's light on the wall round it, and on the room.
  if (on > 0.01) {
    const cx = SCREEN.x + SCREEN.w / 2
    const cy = SCREEN.y + SCREEN.h / 2
    const sg = ctx.createRadialGradient(px(cx), px(cy), px(1), px(cx), px(cy), px(5.5))
    sg.addColorStop(0, rgba(present(t) ? TENT.screenGlow : HALL.lamp, 0.25 * on))
    sg.addColorStop(1, rgba(present(t) ? TENT.screenGlow : HALL.lamp, 0))
    ctx.fillStyle = sg
    ctx.fillRect(px(cx - 5.5), px(cy - 5.5), px(11), px(11))
  }
  // The screen: the news the day they came; years on, white, their writing on it.
  if (present(t)) drawScreen(p, k, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, { on, place: 'montana', t, descend: shellDown(t), bezel: HALL.dark, glow: 0.6 })
  else {
    ctx.fillStyle = HALL.dark
    ctx.fillRect(px(SCREEN.x - 0.06), px(SCREEN.y - 0.06), px(SCREEN.w + 0.12), px(SCREEN.h + 0.12))
    ctx.fillStyle = mix(HALL.screen, HALL.lamp, 0.1)
    ctx.fillRect(px(SCREEN.x), px(SCREEN.y), px(SCREEN.w), px(SCREEN.h))
    drawInk(p, k, SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2, SCREEN.h * 0.32, TAUGHT, taughtU(t), { color: HALL.ink })
  }
  // The stage and the floor.
  ctx.fillStyle = mix(HALL.floor, HALL.dark, 0.4 * (1 - L))
  ctx.fillRect(px(f.x0 - 1), px(FLOOR), px(f.x1 - f.x0 + 2), px(Math.max(0.2, f.y1 - FLOOR + 1)))
  ctx.fillStyle = rgba(HALL.wallLit, 0.35 * (0.4 + L))
  ctx.fillRect(px(f.x0 - 1), px(FLOOR), px(f.x1 - f.x0 + 2), Math.max(1, px(0.015)))
  // The rows going up to the right: their steps.
  for (let r = 0; r < ROWS.n; r++) {
    const x0 = ROWS.x0 + r * ROWS.w
    const top = rowTop(r)
    ctx.fillStyle = mix(mix(HALL.wood, HALL.dark, 0.55), HALL.wallLit, 0.25 * L)
    ctx.fillRect(px(x0), px(top), px(f.x1 + 1 - x0), px(FLOOR - top))
    ctx.fillStyle = rgba(HALL.wallLit, 0.5 * (0.3 + L))
    ctx.fillRect(px(x0), px(top), px(f.x1 + 1 - x0), Math.max(1, px(0.014)))
  }
  // The lectern on her right.
  ctx.fillStyle = mix(HALL.wood, HALL.dark, 0.3 * (1 - L))
  ctx.fillRect(px(LECTERN.x + 0.1), px(LECTERN.top + 0.05), px(0.1), px(FLOOR - LECTERN.top - 0.05))
  ctx.beginPath()
  ctx.moveTo(px(LECTERN.x), px(LECTERN.top + 0.1))
  ctx.lineTo(px(LECTERN.x + LECTERN.w), px(LECTERN.top - 0.02))
  ctx.lineTo(px(LECTERN.x + LECTERN.w), px(LECTERN.top + 0.06))
  ctx.lineTo(px(LECTERN.x), px(LECTERN.top + 0.16))
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(px(LECTERN.x + 0.02), px(FLOOR - 0.04), px(LECTERN.w - 0.04), px(0.04))
  // Years on, the day through high windows: soft bands of it slanting down the wall.
  if (day > 0) {
    for (const x of [-3.2, 0.4, 4.0, 7.6]) {
      const wg = ctx.createLinearGradient(px(x), px(-4.6), px(x - 1.2), px(FLOOR))
      wg.addColorStop(0, rgba(HALL.lamp, 0.22))
      wg.addColorStop(1, rgba(HALL.lamp, 0))
      ctx.fillStyle = wg
      ctx.beginPath()
      ctx.moveTo(px(x), px(-4.6))
      ctx.lineTo(px(x + 0.9), px(-4.6))
      ctx.lineTo(px(x - 0.5), px(FLOOR))
      ctx.lineTo(px(x - 1.6), px(FLOOR))
      ctx.closePath()
      ctx.fill()
    }
  }
  // The students, the far ones first.
  for (const s of STUDENTS) if (!s.later || !present(t)) student(ctx, k, t, s, L)
  ctx.restore()
}

/** A student: as the gala's guests are, a muted ball at the cast's scale with a dim outline and a mark that looks at
 * the stage; the day they came, a phone in front of them that lights. */
function student(ctx: Ctx, k: number, t: number, s: Student, L: number): void {
  const px = (v: number) => v * k
  const r = R * s.s
  const haze = s.near ? 0 : 0.3
  const body = mix(mix(HALL.student, HALL.dark, 0.35 * (1 - L)), HALL.wall, haze)
  const drift = 0.01 * Math.sin(t * 0.5 + s.seed * 1.3)
  const x = s.x + drift
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(px(x), px(s.y), px(r), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = rgba(HALL.wallLit, 0.45 * (1 - haze))
  ctx.lineWidth = Math.max(0.6, px(0.014))
  ctx.beginPath()
  ctx.arc(px(x), px(s.y), px(r - 0.007), 0, Math.PI * 2)
  ctx.stroke()
  // Looking to the stage; the day they came, down at the phone once it lights, and then up at the screen with the news
  // on it: the whole room turned to it.
  const down = present(t) ? smooth(t, s.phone, s.phone + 0.3) * (1 - smooth(t, H.touch + 0.2, H.touch + 0.8)) : 0
  const up = present(t) ? smooth(t, H.touch + 0.2, H.touch + 0.8) : 0
  const toScreen = Math.atan2(SCREEN.y + SCREEN.h / 2 - s.y, SCREEN.x + SCREEN.w / 2 - x)
  const look = Math.PI + 0.15 - 1.0 * down + (toScreen - (Math.PI + 0.15)) * up
  ctx.fillStyle = rgba(HALL.dark, 0.75 * (1 - haze))
  ctx.beginPath()
  ctx.arc(px(x + Math.cos(look) * r * 0.5), px(s.y + Math.sin(look) * r * 0.5), Math.max(0.6, px(r * 0.17)), 0, Math.PI * 2)
  ctx.fill()
  if (!present(t)) return
  const lit = smooth(t, s.phone, s.phone + 0.08)
  if (lit <= 0.01) return
  // The phone, held in front, lit: the news.
  const fx = x - r * 0.95
  const fy = s.y + r * 0.35
  const glow = ctx.createRadialGradient(px(fx), px(fy), 0, px(fx), px(fy), px(0.32))
  glow.addColorStop(0, rgba(TENT.screenOn, 0.45 * lit * (1 - haze)))
  glow.addColorStop(1, rgba(TENT.screenOn, 0))
  ctx.fillStyle = glow
  ctx.fillRect(px(fx - 0.32), px(fy - 0.32), px(0.64), px(0.64))
  ctx.fillStyle = rgba(mix(TENT.screenOn, '#FFFFFF', 0.4), lit * (1 - 0.4 * haze))
  ctx.fillRect(px(fx - 0.025), px(fy - 0.045), px(0.05), px(0.09))
}

/** Every cell the hall claims. */
export const HALL_CELLS: Pt[] = box(-6, -6, 10, 3, 1)

export const hallSet = scenery<null>({ name: 'hall-set', draw: (p, _s, c) => drawHall(p, c.k, c.t) })

/** The shell on the screen at the double bass, in the hall's cells: what the cut to the valley lands on. */
export const HALL_SHELL: ShellSpot = shellOnScreen(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, shellDown(SEAM.arrival))

/* ------------------------------------------------------------------ the parts */

/** Both parts start with her at rest at the lectern: (-0.5, 0) from here. */
export const HALL_AT: Pt = [0.5, 0]

/** Her touch on the lectern: into it on the beat and back. */
function touching(slot: { begin: number; end: number }, at: number): Way[] {
  const T = 0.5
  return [
    { at: 0, p: [-0.5, 0] },
    { at: at - slot.begin - T, p: [-0.5, 0] },
    { at: at - slot.begin, p: [LECTERN.x - R - 0.5 - 0.005, 0], ease: 'in' },
    { at: at - slot.begin + 0.6, p: [-0.5 + 0.03, 0], ease: 'out' },
    { at: slot.end - slot.begin, p: [-0.5, 0], ease: 'inout' },
  ]
}

const key = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - HALL_AT[0], y - HALL_AT[1]], w: 1 })
const SC: Pt = [SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2]

/** The day they came. */
export const lecture = part<{ begin: number }>(
  { name: 'hall-lecture', draw: () => {} },
  (slot) => ({ cells: box(-2, -4, 6, 1), exit: [0, 0] as Pt, lane: { segs: route(touching(slot, H.touch)), fire: H.touch - slot.begin }, state: { begin: slot.begin } }),
  (slot) => [
    // The hall round her as the phones light up the rows; then into the screen until its picture is the frame.
    key(slot.begin + 0.6, 4.8, 1.5, -1.25),
    key(H.touch + 0.3, 4.4, 1.6, -1.5),
    key(slot.end, SCREEN.h / 0.85, SC[0], SC[1]),
  ],
)

/** Years on. */
export const teaching = part<{ begin: number }>(
  { name: 'hall-teaching', draw: () => {} },
  (slot) => ({ cells: box(-2, -4, 6, 1), exit: [0, 0] as Pt, lane: { segs: route(touching(slot, H.teach)), fire: H.teach - slot.begin }, state: { begin: slot.begin } }),
  (slot) => [
    // The hall full in daylight, her at the lectern and their writing coming up on the screen over her.
    key(slot.begin + 0.8, 5.0, 1.4, -1.45),
    key(slot.end, 4.7, 1.3, -1.3),
  ],
)
