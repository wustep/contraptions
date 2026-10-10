import { mixHex, type Pt } from '../../../../../parts'
import { beam, rgba } from '../cast'
import { hash, type frame } from '../kit'
import { HOME, PLANE } from '../worlds'
import { AT_BOOTH, BRIDGE, CAB, CLEAR, DOCK, GLASS, GROUND, HOME as HOME_T, INSIDE, STAMP, TERM, TOUCH, clamp01, cobbAt, lerp, sm } from './plane-geo'
import { asP5, box, glow, line, oval, polyline, puff, rbox, shape, vwash, type Pen } from './plane-kit'

/**
 * Off the plane (the PLANE builder's): the jet bridge that swings out from the terminal and closes on the door; the
 * arrivals hall at the level of the cabin's floor; the immigration booth, its officer (one quiet silhouette at his
 * stamp) and the stamp; the glass doors onto the morning, and the glare beyond them. All of it stands in the plane's
 * world to the right of the cabin, and only after the wheels are down.
 */

type Frame = ReturnType<typeof frame>

/** How far the jet bridge has come out (0: swung back along the terminal, unseen; 1: docked on the door). */
export const bridgeOut = (t: number): number => {
  const u = clamp01((t - (DOCK - 2.1)) / 2.1)
  return 1 - (1 - u) ** 2.4
}
const bridgeFront = (t: number): number => lerp(TERM.air, BRIDGE.front, bridgeOut(t))
/** The hull's outside at height y (right side). */
const hullX = (y: number): number => CAB.cx + Math.sqrt(Math.max(0, CAB.rOut ** 2 - (y - CAB.cy) ** 2))

const CONCRETE = mixHex(PLANE.hull, PLANE.caseDark, 0.3)
const STEEL = mixHex(PLANE.caseDark, PLANE.window, 0.35)
const FLOORING = mixHex(PLANE.hull, PLANE.seatShade, 0.35)
const SIL = mixHex(PLANE.night, PLANE.cabin, 0.3)

/* ------------------------------------------------------------------ the jet bridge */

function drawBridge(pen: Pen, t: number, f: Frame): void {
  const front = bridgeFront(t)
  if (front >= TERM.air - 0.05) return
  if (front > f.x1 + 1 || TERM.air < f.x0 - 1) return
  const base = TERM.air
  const floor = CAB.floor
  const roof = BRIDGE.ceil
  const cab1 = front + 1.7
  // The far wall inside (the near one is cut away): pale, a band of windows onto the apron and the morning.
  shape(pen, [[front + 0.2, roof], [base, roof + 0.1], [base, floor], [front + 0.2, floor]], mixHex(PLANE.hull, PLANE.dawnHigh, 0.28), 0)
  vwash(pen, front + 0.35, base, -1.45, -0.55, [
    [0, mixHex(PLANE.dawnHigh, PLANE.dawn, 0.4), 0.9],
    [1, mixHex(PLANE.dawn, HOME.sun, 0.3), 0.9],
  ])
  for (let x = front + 0.35; x < base; x += 0.55) line(pen, [x, -1.45], [x, -0.55], STEEL, 0.5)
  line(pen, [front + 0.35, -1.45], [base, -1.45], STEEL, 0.6)
  line(pen, [front + 0.35, -0.55], [base, -0.55], STEEL, 0.6)
  // The roof and the floor, cut: the cab a little taller, the tunnel's sections stepping at their seams.
  const mid = (cab1 + base) / 2
  shape(pen, [[front, roof - 0.22], [cab1, roof - 0.22], [cab1, roof - 0.12], [mid, roof - 0.12], [mid, roof - 0.05], [base, roof - 0.05], [base, roof + 0.08], [front, roof + 0.08]], STEEL, 0.7)
  shape(pen, [[front, floor], [base, floor], [base, floor + 0.17], [cab1, floor + 0.17], [cab1, floor + 0.24], [front, floor + 0.24]], STEEL, 0.7)
  box(pen, front, floor - 0.02, base, floor + 0.02, FLOORING, 0)
  for (const x of [cab1, mid]) line(pen, [x, roof - 0.12], [x, floor + 0.2], rgba(PLANE.night, 0.55), 0.7)
  // Its lights along the ceiling.
  for (let x = front + 0.6; x < base - 0.2; x += 1.1) puff(pen, [x, roof + 0.18], 0.45, 0.18, HOME.sun, 0.35)
  // The canopy: pleats of the bellows from floor to roof, pressed to the hull's curve once it is docked.
  for (let i = 0; i < 5; i++) {
    const pts: Pt[] = []
    for (let y = roof - 0.22; y <= floor + 0.001; y += 0.1) pts.push([Math.max(front, hullX(y) - 0.05) + i * 0.055, y])
    polyline(pen, pts, i % 2 ? mixHex(PLANE.night, PLANE.cabin, 0.5) : mixHex(PLANE.caseDark, PLANE.night, 0.4), 2.2)
  }
  // Its leg and wheels, on the apron, the wheels turning as it comes out.
  const lx = front + 1.1
  box(pen, lx - 0.08, floor + 0.24, lx + 0.08, GROUND - 0.5, STEEL, 0.6)
  box(pen, lx - 0.3, GROUND - 0.55, lx + 0.3, GROUND - 0.45, STEEL, 0.6)
  const roll = (front - TERM.air) / 0.5
  for (const s of [-1, 1]) {
    const wx = lx + s * 0.17
    oval(pen, wx, GROUND - 0.22, 0.22, 0.22, mixHex(PLANE.night, PLANE.cabin, 0.4), 0.6)
    const a = roll * 2 * s
    line(pen, [wx - Math.cos(a) * 0.12, GROUND - 0.22 - Math.sin(a) * 0.12], [wx + Math.cos(a) * 0.12, GROUND - 0.22 + Math.sin(a) * 0.12], STEEL, 0.6)
  }
  // The rotunda it swings on, at the terminal.
  box(pen, base - 0.55, floor + 0.17, base - 0.1, GROUND, CONCRETE, 0.7)
}

/* ------------------------------------------------------------------ the terminal */

/** A glass door in a wall seen end-on: shut, a thin pane across the way; opening, it swings out (away) and is seen face-on. */
function leaf(pen: Pen, x: number, top: number, open: number, width: number, tint: string): void {
  const a = open * Math.PI * 0.46
  const w = Math.max(0.035, width * Math.sin(a))
  shape(pen, [[x, top], [x + w, top + 0.04 * Math.sin(a)], [x + w, CAB.floor - 0.04 * Math.sin(a)], [x, CAB.floor]], rgba(tint, 0.18 + 0.3 * (1 - open)), 0.8, STEEL)
  if (w > 0.2) line(pen, [x + w * 0.9, (top + CAB.floor) / 2 - 0.1], [x + w * 0.9, (top + CAB.floor) / 2 + 0.1], STEEL, 1.2)
  line(pen, [x, top], [x, CAB.floor], STEEL, 1.1)
}

/** How far the morning's glare has come up: nothing until he is two seconds from the doors, then building to the veil. */
const glareAt = (t: number): number => sm(t, HOME_T - 2.1, HOME_T - 0.15)

/** Outside the landside glass: the morning street, clear, and the glare coming up over it at the end. */
function drawOutside(pen: Pen, t: number, f: Frame): void {
  const x0 = TERM.land
  const x1 = Math.max(f.x1 + 1, x0 + 1)
  const floor = CAB.floor
  // Its sky comes in only from the terminal's top down, out of the morning's own: above the roofs (a tall frame sees
  // that far up) the two skies met on a ruled vertical line.
  const top = TERM.roof - 1.1
  const span = floor - top
  vwash(pen, x0, x1, top, floor, [
    [0, mixHex(HOME.sky, PLANE.dawnHigh, 0.35), 0],
    [(TERM.roof - top) / span, mixHex(HOME.sky, PLANE.dawnHigh, 0.35), 1],
    [1 - 0.3 * (floor - TERM.roof) / span, mixHex(PLANE.dawn, HOME.sun, 0.35), 1],
    [1, mixHex(PLANE.dawn, HOME.sun, 0.55), 1],
  ])
  // Across the road: low buildings in the morning haze, palms along the kerb.
  for (let i = 0; i < 9; i++) {
    const bx = x0 + 0.6 + i * 0.85
    const h = 0.5 + 0.9 * hash(i, 41, 2)
    box(pen, bx, floor - 0.35 - h * 0.6, bx + 0.65, floor - 0.35, `${mixHex(PLANE.dawnHigh, PLANE.dawn, 0.45)}77`, 0)
  }
  for (const [x, h] of [[14.3, 2.3], [16.6, 2.7], [19.0, 2.1]] as const) {
    const top: Pt = [x + 0.12, floor - h]
    const col = mixHex(PLANE.window, PLANE.dawnHigh, 0.25)
    polyline(pen, [[x, floor], [x + 0.06, floor - h * 0.5], top], col, 1.3)
    for (let j = 0; j < 8; j++) {
      const a = -Math.PI / 2 + (j - 3.5) * 0.45
      const tip: Pt = [top[0] + Math.cos(a) * 0.5, top[1] + Math.sin(a) * 0.26 + 0.1 + 0.03 * Math.abs(j - 3.5)]
      polyline(pen, [top, [(top[0] + tip[0]) / 2, (top[1] + tip[1]) / 2 - 0.06], tip], col, 1.0)
    }
  }
  // The kerb, the walk under the canopy.
  box(pen, x0, floor, x1, floor + 0.35, mixHex(PLANE.hull, PLANE.dawn, 0.3), 0.6)
  // The glare, only at the end: the sun off the street and the glass, coming up to the veil.
  const g = glareAt(t)
  if (g > 0.002) {
    vwash(pen, x0, x1, top, floor + 0.35, [
      [0, HOME.sun, 0],
      [(TERM.roof - top) / (floor + 0.35 - top), HOME.sun, 0.85 * g],
      [1, HOME.sun, 0.85 * g],
    ])
    glow(pen, [x0 + 0.6, -0.6], 3.2, HOME.sun, 0.8 * g)
  }
}

const HALL_WALL = mixHex(mixHex(PLANE.hull, PLANE.caseDark, 0.3), PLANE.dawn, 0.12)
const HALL_FLOOR = mixHex(PLANE.hull, PLANE.seatShade, 0.45)
const SKIRT = mixHex(PLANE.night, PLANE.caseDark, 0.4)
const CEIL = mixHex(PLANE.caseDark, PLANE.hull, 0.35)

function drawTerminal(pen: Pen, t: number, f: Frame): void {
  if (t < TOUCH) return
  if (f.x1 < TERM.air - 1) return
  const floor = CAB.floor
  const air = TERM.air
  const land = TERM.land
  const foot = TERM.foot
  if (f.x1 > land) drawOutside(pen, t, f)
  // The lower level, concrete, down to the apron.
  box(pen, air - 0.1, floor + 0.35, Math.max(f.x1 + 1, land + 3), GROUND, CONCRETE, 0.7)
  for (let x = air + 0.4; x < land - 0.5; x += 1.4) box(pen, x, 1.6, x + 0.8, GROUND, mixHex(PLANE.night, PLANE.cabinLit, 0.5), 0.6)
  // The hall's back wall, and in it a long window onto the morning city.
  box(pen, air, TERM.ceil, land, foot, HALL_WALL, 0)
  const w0 = air + 0.3
  const w1 = land - 0.3
  const wt = -2.05
  const wb = -0.72
  vwash(pen, w0, w1, wt, wb, [
    [0, mixHex(HOME.sky, PLANE.dawnHigh, 0.3), 1],
    [0.75, mixHex(PLANE.dawn, HOME.sun, 0.3), 1],
    [1, mixHex(PLANE.dawn, PLANE.lamp, 0.3), 1],
  ])
  // The city out there: towers far off in the haze, nearer blocks, a palm or two.
  const far = mixHex(PLANE.dawnHigh, PLANE.window, 0.2)
  for (let i = 0; i < 12; i++) {
    const bx = w0 + 0.05 + i * 0.27
    if (bx > w1 - 0.1) break
    const h = 0.18 + 0.55 * hash(i, 51, 4) ** 1.6
    box(pen, bx, wb - 0.2 - h, bx + 0.12 + 0.08 * hash(i, 52, 4), wb - 0.2, `${far}88`, 0)
  }
  for (let i = 0; i < 8; i++) {
    const bx = w0 + i * 0.45
    if (bx > w1 - 0.2) break
    box(pen, bx, wb - 0.22 - 0.12 * hash(i, 53, 4), bx + 0.4, wb, mixHex(far, PLANE.window, 0.35), 0)
  }
  for (let x = w0; x <= w1 + 1e-6; x += (w1 - w0) / 5) line(pen, [x, wt], [x, wb], STEEL, 0.9)
  line(pen, [w0, (wt + wb) / 2 - 0.2], [w1, (wt + wb) / 2 - 0.2], STEEL, 0.6)
  box(pen, w0, wt, w1, wb, null, 0.9, STEEL)
  // The morning in through it, laid across the hall in shafts.
  for (let x = air + 1.2; x < land; x += 0.95) beam(asP5(pen), pen.k, [x, wb], [x - 0.9, 0.4], 0.35, 0.7, PLANE.lamp, 0.2)
  // The floor going back to the wall, polished: darker at the wall's foot, the windows faint in it.
  box(pen, air, foot, land, floor, HALL_FLOOR, 0)
  vwash(pen, air, land, foot, floor, [
    [0, SKIRT, 0.35],
    [0.45, SKIRT, 0.08],
    [1, HOME.sun, 0.12],
  ])
  box(pen, air, foot - 0.08, land, foot, SKIRT, 0.5)
  for (let x = w0 + 0.3; x < w1; x += 0.7) puff(pen, [x, (foot + floor) / 2], 0.22, 0.12, HOME.sun, 0.12)
  // The queue's rail: posts and a sagging rope, back from the way, leading to the booth.
  const posts = [air + 0.35, air + 0.8, air + 1.25]
  const postFoot = foot + 0.2
  const postTop = postFoot - 0.36
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i]
    const b = posts[i + 1]
    const sag: Pt[] = []
    for (let j = 0; j <= 8; j++) {
      const u = j / 8
      sag.push([lerp(a, b, u), postTop + 0.03 + 0.07 * Math.sin(u * Math.PI)])
    }
    polyline(pen, sag, mixHex(PLANE.window, PLANE.night, 0.3), 1.5)
  }
  for (const x of posts) {
    box(pen, x - 0.018, postTop, x + 0.018, postFoot, PLANE.caseDark, 0.4)
    oval(pen, x, postFoot, 0.07, 0.018, PLANE.caseDark, 0.4)
    box(pen, x - 0.03, postTop - 0.03, x + 0.03, postTop + 0.01, PLANE.case, 0.4)
  }
  // The floor slab (cut), and the roof over the hall running on out as the canopy over the kerb.
  box(pen, air - 0.1, floor, Math.max(f.x1 + 1, land + 3), floor + 0.35, CONCRETE, 0.7)
  box(pen, air - 0.1, floor - 0.02, land, floor + 0.02, mixHex(HALL_FLOOR, PLANE.night, 0.2), 0)
  box(pen, air, TERM.ceil, land, TERM.ceil + 0.12, CEIL, 0)
  box(pen, air - 0.2, TERM.roof, land + 2.4, TERM.ceil, CONCRETE, 0.7)
  for (let x = air + 0.7; x < land - 0.3; x += 1.2) puff(pen, [x, TERM.ceil + 0.2], 0.45, 0.12, HOME.sun, 0.3)
  // The terminal's face over the roofline.
  box(pen, air + 0.8, TERM.roof - 1.1, land + 1.6, TERM.roof, mixHex(CONCRETE, PLANE.dawn, 0.2), 0.7)
  for (let x = air + 1.0; x < land + 1.4; x += 0.45) line(pen, [x, TERM.roof - 1.0], [x, TERM.roof - 0.1], rgba(PLANE.window, 0.35), 0.6)
  // The airside wall, cut: glass floor to ceiling, the door from the bridge in its foot.
  box(pen, air - 0.08, TERM.ceil, air + 0.02, -1.6, rgba(PLANE.dawnHigh, 0.5), 0.6, STEEL)
  box(pen, air - 0.12, -1.66, air + 0.06, -1.58, STEEL, 0.5)
  leaf(pen, air, -1.6, sm(t, INSIDE - 0.1, INSIDE + 0.45), 0.8, PLANE.dawnHigh)
  // The landside wall, the same; its doors swing out onto the morning.
  box(pen, land - 0.03, TERM.ceil, land + 0.07, -1.6, rgba(HOME.glass, 0.45), 0.6, STEEL)
  box(pen, land - 0.07, -1.66, land + 0.11, -1.58, STEEL, 0.5)
  leaf(pen, land, -1.6, sm(t, GLASS - 0.1, GLASS + 0.55), 0.95, HOME.glass)
  // The glare spilling in at the doors, at the end.
  const g = glareAt(t)
  if (g > 0.002) puff(pen, [land - 0.2, floor - 0.1], 2.4 * g + 0.4, 0.35, HOME.sun, 0.7 * g)
}

/* ------------------------------------------------------------------ the booth and the stamp */

/** The reading slope on the booth's counter, facing us, and the open passport's pages on it. */
const SLOPE = { x0: TERM.booth0 - 0.02, x1: TERM.booth0 + 0.42, bottom: TERM.ledge - 0.005, top: TERM.ledge - 0.27, lean: 0.03 }
const SLOPE_MID = (SLOPE.x0 + SLOPE.x1) / 2
/** Where the stamp comes down: the right-hand page. */
const MARK: Pt = [SLOPE_MID + 0.085, (SLOPE.bottom + SLOPE.top) / 2 + 0.005]

/** The stamp's face (its middle), over time: raised, brought down onto the page on bar 63, lifted off. */
function stampAt(t: number): Pt {
  const rest: Pt = [TERM.booth0 + 0.5, -0.12]
  const high: Pt = [MARK[0] + 0.02, MARK[1] - 0.34]
  const down: Pt = [MARK[0], MARK[1]]
  if (t < STAMP - 0.75) return rest
  if (t < STAMP - 0.12) {
    const u = sm(t, STAMP - 0.75, STAMP - 0.2)
    return [lerp(rest[0], high[0], u), lerp(rest[1], high[1], u)]
  }
  if (t < STAMP) {
    const u = ((t - (STAMP - 0.12)) / 0.12) ** 2
    return [lerp(high[0], down[0], u), lerp(high[1], down[1], u)]
  }
  if (t < STAMP + 0.16) return down
  const u = sm(t, STAMP + 0.16, STAMP + 0.75)
  return [lerp(down[0], rest[0], u), lerp(down[1], rest[1], u) - 0.12 * Math.sin(u * Math.PI)]
}

/**
 * His passport: up from him onto the slope as he comes to the booth, shut; it opens; stamped; it shuts on the slope
 * and goes back down to him.
 */
function passportAt(t: number): { at: Pt; open: number } | null {
  const on: Pt = [SLOPE_MID, (SLOPE.bottom + SLOPE.top) / 2]
  const him = (): Pt => {
    const c = cobbAt(t)
    return [c[0], c[1]]
  }
  if (t < AT_BOOTH - 0.25 || t > CLEAR + 0.02) return null
  if (t < AT_BOOTH + 0.3) {
    const u = sm(t, AT_BOOTH - 0.25, AT_BOOTH + 0.3)
    const h = him()
    return { at: [lerp(h[0], on[0], u), lerp(h[1], on[1], u) - 0.12 * Math.sin(u * Math.PI)], open: 0 }
  }
  // Shut on the slope before it goes; then off the slope's edge toward him, and only then down to him, so it never
  // hangs open in the air over the counter's front.
  const open = sm(t, AT_BOOTH + 0.3, AT_BOOTH + 0.65) * (1 - sm(t, CLEAR - 0.55, CLEAR - 0.35))
  if (t < CLEAR - 0.35) return { at: on, open }
  const ux = sm(t, CLEAR - 0.35, CLEAR - 0.12)
  const uy = sm(t, CLEAR - 0.2, CLEAR)
  const h = him()
  return { at: [lerp(on[0], h[0], ux), lerp(on[1], h[1], uy) - 0.05 * Math.sin(ux * Math.PI)], open }
}

const INK_MARK = mixHex(PLANE.window, PLANE.night, 0.25)
const COVER = mixHex(PLANE.window, PLANE.night, 0.4)
const PAGE = mixHex(PLANE.seat, HOME.sun, 0.4)

/** The passport: its navy cover; open, two pages side by side, facing us, leaning back a little on the slope. */
function drawPassport(pen: Pen, t: number, at: Pt, open: number): void {
  const hw = 0.165
  const top = at[1] - 0.115
  const bot = at[1] + 0.115
  const lean = SLOPE.lean
  // The right half (under the cover when shut): a page, with the mark once it is stamped.
  shape(pen, [[at[0], top + 0.005], [at[0] + hw - lean * 0.5, top], [at[0] + hw, bot], [at[0], bot]], open > 0.02 ? PAGE : COVER, 0.5)
  if (open > 0.02 && t >= STAMP) {
    const fresh = 1 - sm(t, STAMP, STAMP + 0.8) * 0.15
    const mx = MARK[0] + (at[0] - SLOPE_MID)
    const my = MARK[1] + (at[1] - (SLOPE.bottom + SLOPE.top) / 2)
    rbox(pen, mx - 0.052, my - 0.034, mx + 0.052, my + 0.034, 0.018, rgba(INK_MARK, 0.9 * fresh), 0)
    rbox(pen, mx - 0.036, my - 0.019, mx + 0.036, my + 0.019, 0.01, rgba(PAGE, 0.3), 0)
  }
  // The cover: swung open to the left (the left page), or shut over the right.
  const w = hw * (1 - 2 * open)
  const x = at[0] + w
  shape(pen, [[at[0], top + 0.005], [x - lean * 0.5 * Math.sign(w || 1), top], [x, bot], [at[0], bot]], open > 0.5 ? PAGE : COVER, 0.5)
  line(pen, [at[0], top + 0.005], [at[0], bot], PLANE.night, 0.6)
}

function drawBooth(pen: Pen, t: number, f: Frame): void {
  if (t < TOUCH || f.x1 < TERM.booth0 - 1 || f.x0 > TERM.booth1 + 1) return
  const x0 = TERM.booth0
  const x1 = TERM.booth1
  const ledge = TERM.ledge
  const knock = t >= STAMP ? 0.008 * Math.exp(-(t - STAMP) / 0.08) : 0
  const wood = mixHex(PLANE.night, PLANE.seatShade, 0.3)
  const woodLit = mixHex(wood, PLANE.lamp, 0.25)
  // The canopy: two slim posts and a roof, dark; the lamp under it, the one warm light of the hall.
  box(pen, x0 + 0.02, -1.02, x0 + 0.06, ledge, wood, 0.5)
  box(pen, x1 - 0.06, -1.02, x1 - 0.02, ledge, wood, 0.5)
  glow(pen, [x0 + 0.45, -0.8], 0.9, PLANE.lamp, 0.55)
  puff(pen, [x0 + 0.3, ledge - 0.08], 0.6, 0.22, PLANE.lamp, 0.6)
  // The officer, seated behind his counter: head and shoulders, one dark shape, rimmed by his lamp.
  const nod = 0.035 * (sm(t, STAMP + 0.3, STAMP + 0.55) - sm(t, STAMP + 0.7, STAMP + 1.05))
  const hx = x0 + 0.62
  const hy = -0.4 + nod
  shape(pen, [[x0 + 0.34, ledge], [x0 + 0.38, -0.2], [x0 + 0.5, -0.27], [x0 + 0.76, -0.27], [x0 + 0.86, -0.2], [x0 + 0.9, ledge]], SIL, 0)
  oval(pen, hx, hy, 0.095, 0.11, SIL, 0)
  polyline(pen, [[hx - 0.09, hy - 0.02], [hx - 0.06, hy - 0.08], [hx, hy - 0.11]], rgba(PLANE.lamp, 0.85), 0.8)
  polyline(pen, [[x0 + 0.38, -0.19], [x0 + 0.5, -0.26]], rgba(PLANE.lamp, 0.6), 0.7)
  // The roof, over it all.
  box(pen, x0 - 0.06, -1.14, x1 + 0.06, -1.0, wood, 0.8)
  box(pen, x0 + 0.25, -1.0, x0 + 0.65, -0.97, rgba(PLANE.lamp, 0.95), 0)
  // The low glass on the counter in front of him.
  box(pen, x0 + 0.36, -0.42, x1 - 0.04, ledge, rgba(HOME.glass, 0.25), 0.5, STEEL)
  // The counter: a dark mass to the floor, its top lit, and the reading slope on it.
  box(pen, x0, ledge + knock, x1, CAB.floor, wood, 0.9)
  box(pen, x0 - 0.05, ledge - 0.02 + knock, x1 + 0.03, ledge + 0.03 + knock, woodLit, 0.7)
  for (const x of [x0 + 0.3, x0 + 0.62]) line(pen, [x, ledge + 0.08 + knock], [x, CAB.floor - 0.04], rgba(PLANE.hull, 0.12), 0.6)
  shape(pen, [[SLOPE.x0, SLOPE.bottom + knock], [SLOPE.x0 + SLOPE.lean, SLOPE.top + knock], [SLOPE.x1 - SLOPE.lean, SLOPE.top + knock], [SLOPE.x1, SLOPE.bottom + knock]], mixHex(wood, PLANE.seatShade, 0.35), 0.6)
  // The passport on it.
  const pp = passportAt(t)
  if (pp) drawPassport(pen, t, [pp.at[0], pp.at[1] + knock], pp.open)
  // The officer's arm and the stamp, over the counter.
  const s = stampAt(t)
  const shoulder: Pt = [x0 + 0.45, -0.22]
  const hand: Pt = [s[0] + 0.015, s[1] - 0.13]
  polyline(pen, [shoulder, [(shoulder[0] + hand[0]) / 2 + 0.05, (shoulder[1] + hand[1]) / 2 + 0.06], hand], SIL, 3.4)
  rbox(pen, s[0] - 0.025, s[1] - 0.14, s[0] + 0.025, s[1] - 0.06, 0.018, woodLit, 0.5)
  box(pen, s[0] - 0.06, s[1] - 0.06, s[0] + 0.06, s[1] - 0.016, mixHex(wood, PLANE.seatShade, 0.4), 0.5)
  box(pen, s[0] - 0.055, s[1] - 0.016, s[0] + 0.055, s[1] + 0.004, INK_MARK, 0)
}

/* ------------------------------------------------------------------ all of it */

/** Behind the ball: the bridge, the hall, the booth. */
export function drawHall(pen: Pen, t: number, f: Frame): void {
  if (t < TOUCH - 0.5) return
  drawTerminal(pen, t, f)
  drawBridge(pen, t, f)
  drawBooth(pen, t, f)
}

/** Over the ball: the morning's glare off the glass doors on him as he goes out (only at the very end). */
export function drawHallOver(pen: Pen, t: number, f: Frame): void {
  const g = glareAt(t)
  if (g <= 0.002 || f.x1 < TERM.land - 3) return
  puff(pen, [TERM.land + 0.4, -0.5], 1.2 + 2.2 * g, 2.2, HOME.sun, 0.5 * g * g)
}
