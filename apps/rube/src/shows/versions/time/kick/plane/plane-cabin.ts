import { mixHex, R, type Pt } from '../../../../../parts'
import { beam, rgba } from '../cast'
import type { frame } from '../kit'
import { HOME, PLANE } from '../worlds'
import {
  CAB,
  CASE,
  CASE_X,
  DOCK,
  DOOR,
  DOOR_TOP,
  DRIPS,
  DROP_FALL,
  GROUND,
  LAMP_OUT,
  LET_GO,
  LID,
  PLUNGE,
  SEAT,
  SHADE,
  TOUCH,
  WIN,
  ariadneAt,
  clamp01,
  cobbAt,
  fischerAt,
  gearDown,
  jolt,
  lerp,
  sm,
  teamNod,
  wallAt,
} from './plane-geo'
import { arcPts, asP5, box, clipCircle, clipTo, glow, line, oval, polyline, puff, rbox, shape, type Pen } from './plane-kit'
import { isDay, spinAt, treads } from './plane-sky'

/**
 * The cabin in cross-section (the PLANE builder's): the fuselage's skin cut through, and inside it the cabin going away
 * aft (its walls with their windows, the bins, the ceiling, the aisle, the bulkhead at its far end); the first row's
 * four seats (Ariadne, Cobb; across the aisle one of the team, and Fischer); the silver case open on the floor in front
 * of Cobb and Ariadne with its drip, its plunger and its lines; the reading lamp; the window shades; the door in the
 * right wall; the hold; the nose gear under it.
 */

type Frame = ReturnType<typeof frame>
const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the light of the place */

interface Pal {
  skin: string
  crown: string
  wall: string
  ceil: string
  bin: string
  binCut: string
  floor: string
  bulk: string
  far: string
  beam: string
  hold: string
  seat: string
  seatShade: string
  seatDark: string
  sil: string
  rim: string
}

function palAt(t: number): Pal {
  if (!isDay(t)) {
    return {
      skin: mixHex(PLANE.hull, PLANE.night, 0.6),
      crown: mixHex(PLANE.cabin, PLANE.night, 0.55),
      wall: mixHex(PLANE.cabinLit, PLANE.cabin, 0.35),
      ceil: mixHex(PLANE.cabinLit, PLANE.night, 0.3),
      bin: mixHex(PLANE.cabinLit, PLANE.cabin, 0.2),
      binCut: mixHex(PLANE.cabinLit, PLANE.seat, 0.12),
      floor: mixHex(PLANE.night, PLANE.cabin, 0.55),
      bulk: mixHex(PLANE.cabin, PLANE.night, 0.35),
      far: PLANE.night,
      beam: mixHex(PLANE.night, PLANE.caseDark, 0.25),
      hold: mixHex(PLANE.night, PLANE.cabin, 0.3),
      seat: mixHex(PLANE.seat, PLANE.cabin, 0.6),
      seatShade: mixHex(PLANE.seatShade, PLANE.cabin, 0.68),
      seatDark: mixHex(PLANE.seatShade, PLANE.night, 0.78),
      sil: mixHex(PLANE.night, PLANE.cabin, 0.2),
      rim: PLANE.dawnHigh,
    }
  }
  // Morning: the cabin warm from the windows aft; brighter in our row once the sun comes in on Fischer's side.
  const b = sm(t, SHADE, SHADE + 1.2)
  const warm = (c: string, f: number) => mixHex(c, PLANE.dawn, f)
  const lining = mixHex(PLANE.hull, PLANE.dawnHigh, 0.3)
  return {
    skin: warm(PLANE.hull, 0.14),
    crown: mixHex(PLANE.cabinLit, PLANE.dawnHigh, 0.3),
    wall: warm(lining, 0.12 + 0.24 * b),
    ceil: warm(mixHex(PLANE.hull, PLANE.dawnHigh, 0.4), 0.12),
    bin: warm(mixHex(lining, PLANE.seatShade, 0.3), 0.1),
    binCut: warm(mixHex(PLANE.hull, PLANE.seat, 0.4), 0.08 + 0.1 * b),
    floor: warm(mixHex(PLANE.cabinLit, PLANE.window, 0.3), 0.18),
    bulk: warm(lining, 0.4),
    far: warm(PLANE.lamp, 0.3),
    beam: mixHex(PLANE.caseDark, PLANE.cabinLit, 0.4),
    hold: mixHex(mixHex(PLANE.cabinLit, PLANE.dawnHigh, 0.35), PLANE.window, 0.25),
    seat: mixHex(mixHex(mixHex(PLANE.seat, PLANE.dawnHigh, 0.4), PLANE.cabinLit, 0.22), mixHex(PLANE.seat, PLANE.dawn, 0.3), b),
    seatShade: mixHex(mixHex(mixHex(PLANE.seatShade, PLANE.dawnHigh, 0.45), PLANE.cabinLit, 0.25), mixHex(PLANE.seatShade, PLANE.dawn, 0.3), b),
    seatDark: mixHex(PLANE.seatShade, PLANE.caseDark, 0.55),
    sil: mixHex(PLANE.night, PLANE.cabin, 0.35),
    rim: PLANE.dawn,
  }
}

/** The reading lamp over the case: on through boarding, out as his eyes close. */
const lampAt = (t: number): number => (isDay(t) ? 0 : 1 - sm(t, LAMP_OUT[0], LAMP_OUT[1]))
/** The sun in through Fischer's window, from the moment he puts the shade up until the jet bridge closes over the door. */
export const sunAt = (t: number): number => (isDay(t) ? sm(t, SHADE - 0.05, SHADE + 0.5) * (1 - sm(t, DOCK - 1.6, DOCK + 0.2)) : 0)
/** The morning through the windows aft (it dims as the plane turns in to the gate and the terminal shades it). */
const aftSunAt = (t: number): number => (isDay(t) ? 1 - 0.7 * sm(t, DOCK - 1.6, DOCK + 0.5) : 0)
/** How far the door has lifted (0 shut, 1 stowed up in the crown). */
export const doorOpen = (t: number): number => (isDay(t) ? sm(t, DOOR - 0.05, DOOR + 1.25) : 0)
const DOOR_SWING = 0.95

/* ------------------------------------------------------------------ the cabin going away aft */

/** The vanishing point: a sitter's eye, in the middle of the aisle. */
const V: Pt = [CAB.cx, -0.8]
/** How small the far bulkhead is. */
const S_FAR = 0.4
const proj = ([x, y]: Pt, s: number): Pt => [V[0] + (x - V[0]) * s, V[1] + (y - V[1]) * s]
const at = (pts: Pt[], s: number): Pt[] => pts.map((q) => proj(q, s))

const AISLE_L = 0.28
const AISLE_R = 2 * CAB.cx - AISLE_L
const CEIL_L = 0.38
const CEIL_R = 2 * CAB.cx - CEIL_L
const wallPts = (side: -1 | 1, y0: number, y1: number, n = 12): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const y = lerp(y0, y1, i / n)
    out.push([side < 0 ? wallAt(y)[0] : wallAt(y)[1], y])
  }
  return out
}
/** The section's opening onto the cabin: floor, walls up to the bins, the bins' undersides and faces, the ceiling. */
const OPENING: Pt[] = [
  ...wallPts(-1, CAB.floor, CAB.bin),
  [AISLE_L, CAB.bin],
  [CEIL_L, CAB.ceil],
  [CEIL_R, CAB.ceil],
  [AISLE_R, CAB.bin],
  ...wallPts(1, CAB.bin, CAB.floor),
]
/** A band between a near edge and its far copy. */
const band = (near: Pt[], s0 = 1, s1 = S_FAR): Pt[] => [...at(near, s0), ...at(near, s1).reverse()]
/** The windows along each wall, going away: depths (scale at their near and far jambs). */
const WINDOWS: [number, number][] = [
  [0.985, 0.845],
  [0.8, 0.75],
  [0.68, 0.645],
  [0.59, 0.565],
  [0.52, 0.5],
  [0.465, 0.45],
]
const DOOR_S: [number, number] = [1, 0.875]

function windowQuad(side: -1 | 1, [s0, s1]: [number, number]): Pt[] {
  const top: Pt = [side < 0 ? wallAt(WIN.y0)[0] : wallAt(WIN.y0)[1], WIN.y0]
  const bot: Pt = [side < 0 ? wallAt(WIN.y1)[0] : wallAt(WIN.y1)[1], WIN.y1]
  return [proj(top, s0), proj(top, s1), proj(bot, s1), proj(bot, s0)]
}

/** Inside the lining: the cabin's depth, its light, the near bins' cut ends, the crown, the floor's cut, the hold. */
function drawInside(pen: Pen, t: number, p: Pal): void {
  const { cx, cy, rIn } = CAB
  const day = isDay(t)
  const aft = aftSunAt(t)
  clipCircle(pen, cx, cy, rIn, () => {
    box(pen, cx - rIn, cy - rIn, cx + rIn, cy + rIn, p.crown, 0)
    // The planes, going away: ceiling, bins' faces and undersides, walls, floor; the bulkhead at the far end.
    shape(pen, OPENING, p.wall, 0)
    shape(pen, band([[CEIL_L, CAB.ceil], [CEIL_R, CAB.ceil]]), p.ceil, 0.5)
    for (const s of [-1, 1] as const) {
      const aisle = s < 0 ? AISLE_L : AISLE_R
      const ceil = s < 0 ? CEIL_L : CEIL_R
      const wall: Pt = [s < 0 ? wallAt(CAB.bin)[0] : wallAt(CAB.bin)[1], CAB.bin]
      shape(pen, band([[aisle, CAB.bin], [ceil, CAB.ceil]]), mixHex(p.bin, p.ceil, 0.3), 0.5)
      shape(pen, band([wall, [aisle, CAB.bin]]), mixHex(p.bin, PLANE.night, day ? 0.12 : 0.3), 0.5)
      shape(pen, band(wallPts(s, CAB.bin, CAB.floor, 10)), p.wall, 0.5)
      // The window at the section, the day or the night in it (Fischer's, on the right, is in the door).
      if (s < 0) shape(pen, windowQuad(s, WINDOWS[0]), day ? mixHex(PLANE.dawnHigh, PLANE.dawn, 0.45) : mixHex(PLANE.window, PLANE.night, 0.35), 0.6)
      // Along the wall aft, the windows' light on it (the panes themselves are edge-on from here).
      if (day && s > 0) for (let i = 1; i < WINDOWS.length; i++) {
        const q = windowQuad(s, WINDOWS[i])
        glow(pen, [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2], 0.34 * WINDOWS[i][0], HOME.sun, 0.5 * aft)
      }
    }
    shape(pen, band([[wallAt(CAB.floor)[0], CAB.floor], [wallAt(CAB.floor)[1], CAB.floor]]), p.floor, 0.5)
    // The far bulkhead, and the galley's doorway in it at the aisle's end.
    shape(pen, at(OPENING, S_FAR), p.bulk, 0.5)
    shape(pen, at([[0.62, CAB.floor], [0.62, -1.35], [1.38, -1.35], [1.38, CAB.floor]], S_FAR), day ? mixHex(p.bulk, p.far, 0.45) : mixHex(PLANE.cabin, PLANE.dawnHigh, 0.15), 0.5)
    // The morning aft: the low sun in through the windows on the right, laying shafts across the aisle.
    if (day) {
      for (let i = 1; i < WINDOWS.length; i++) {
        const [s0, s1] = WINDOWS[i]
        const sm0 = (s0 + s1) / 2
        const from = proj([wallAt(-0.45)[1], -0.45], sm0)
        const to = proj([wallAt(0.35)[0] + 0.3, 0.45], sm0 * 0.93)
        beam(asP5(pen), pen.k, from, to, 0.4 * sm0, 1.0 * sm0, PLANE.lamp, 0.32 * aft)
        puff(pen, proj([0.4, CAB.floor], sm0 * 0.93), 0.9 * sm0, 0.22 * sm0, PLANE.lamp, 0.35 * aft)
      }
      glow(pen, V, 1.4, HOME.sun, 0.18 * aft)
    } else {
      // Night aft: dark, and the galley's glow faint at the far end.
      glow(pen, proj([cx, -0.3], S_FAR), 0.35, PLANE.dawnHigh, 0.12)
    }
    // The bins' cut ends at the section, and the ceiling's.
    for (const s of [-1, 1] as const) {
      const aisle = s < 0 ? AISLE_L : AISLE_R
      const ceil = s < 0 ? CEIL_L : CEIL_R
      const pts: Pt[] = wallPts(s, CAB.bin, -2.22, 8)
      pts.push([ceil + s * 0.12, -2.22], [ceil, CAB.ceil + 0.14], [aisle, CAB.bin])
      shape(pen, pts, p.binCut, 0.7)
    }
    box(pen, CEIL_L, CAB.ceil - 0.08, CEIL_R, CAB.ceil, p.binCut, 0.6)
    // The reading lights in the bins' undersides, over each seat.
    for (const x of [SEAT.ariadne, SEAT.cobb, SEAT.team, SEAT.fischer]) rbox(pen, x - 0.06, CAB.bin, x + 0.06, CAB.bin + 0.03, 0.012, mixHex(p.binCut, PLANE.night, 0.25), 0.4)
    // The floor's cut: carpet, the beams under it; the hold.
    box(pen, cx - rIn, CAB.floor, cx + rIn, CAB.floor + 0.06, p.floor, 0.6)
    box(pen, cx - rIn, CAB.floor + 0.06, cx + rIn, CAB.beam, p.beam, 0.6)
    box(pen, cx - rIn, CAB.beam, cx + rIn, cy + rIn, p.hold, 0)
    for (const x of [-0.7, 0.2, 1.8, 2.7]) line(pen, [x, CAB.beam], [x, cy + Math.sqrt(Math.max(0, rIn * rIn - (x - cx) ** 2))], rgba(PLANE.night, 0.4), 0.8)
    box(pen, 0.6, CAB.beam + 0.1, 1.4, cy + rIn, mixHex(p.hold, PLANE.night, 0.45), 0.5)
  })
}

/* ------------------------------------------------------------------ the section's skin, the door, Fischer's window */

const angleAt = (y: number, r: number): number => Math.asin(Math.max(-1, Math.min(1, (y - CAB.cy) / r)))
/** The door's arc on the right side: from the top of the doorway to the floor. */
const DOOR_A0 = angleAt(DOOR_TOP, CAB.rIn)
const DOOR_A1 = angleAt(CAB.floor, CAB.rIn)

/** Where a point of the shut door is, as the door lifts (round the curve, up into the crown). */
const onDoor = (t: number, [x, y]: Pt): Pt => {
  const a = -DOOR_SWING * doorOpen(t)
  const dx = x - CAB.cx
  const dy = y - CAB.cy
  return [CAB.cx + dx * Math.cos(a) - dy * Math.sin(a), CAB.cy + dx * Math.sin(a) + dy * Math.cos(a)]
}

/** The door in the right wall, its inside face going back into the cabin a little; Fischer's window in it, and its shade. */
function drawDoor(pen: Pen, t: number, p: Pal): void {
  const open = doorOpen(t)
  const edge = wallPts(1, DOOR_TOP, CAB.floor, 14)
  const face = band(edge, DOOR_S[0], DOOR_S[1])
  // The doorway, once the door is up: the jet bridge's daylight.
  if (open > 0.001) shape(pen, face, mixHex(PLANE.hull, PLANE.dawnHigh, 0.2), 0)
  const lift = (q: Pt): Pt => onDoor(t, q)
  clipTo(pen, [...wallPts(1, CAB.bin + 0.02, CAB.floor + 0.3), [CAB.cx, CAB.floor + 0.3], [CAB.cx, CAB.bin + 0.02]], () => {
    shape(pen, face.map(lift), mixHex(p.wall, PLANE.hull, 0.25), 0.7)
    // The window in it: the morning or the night, and Fischer's shade over it until he puts it up.
    const q = windowQuad(1, WINDOWS[0]).map(lift)
    const day = isDay(t)
    // Its frame (the lining's reveal round the pane), and the pane: the sun itself out there, low.
    const mid: Pt = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2]
    const grow = (pts: Pt[], f: number): Pt[] => pts.map(([x, y]) => [mid[0] + (x - mid[0]) * f, mid[1] + (y - mid[1]) * f])
    shape(pen, grow(q, 1.18), mixHex(p.wall, PLANE.hull, 0.4), 0.6)
    shape(pen, q, day ? mixHex(PLANE.lamp, HOME.sun, 0.55) : mixHex(PLANE.window, PLANE.night, 0.3), 0.6)
    if (day) {
      const up = sm(t, SHADE - 0.08, SHADE + 0.14)
      const lo = lerp(1, 0.1, up)
      const shade: Pt[] = [q[0], q[1], [lerp(q[1][0], q[2][0], lo), lerp(q[1][1], q[2][1], lo)], [lerp(q[0][0], q[3][0], lo), lerp(q[0][1], q[3][1], lo)]]
      // The shade: cream plastic, the sun behind it showing through as a warm blush.
      shape(pen, shade, mixHex(mixHex(PLANE.seat, PLANE.dawnHigh, 0.3), PLANE.dawn, 0.25 + 0.2 * (1 - up)), 0.6)
      const tab: Pt = [(shade[2][0] + shade[3][0]) / 2, (shade[2][1] + shade[3][1]) / 2]
      rbox(pen, tab[0] - 0.045, tab[1] - 0.008, tab[0] + 0.045, tab[1] + 0.03, 0.012, PLANE.seatShade, 0.5)
      if (up < 0.5) line(pen, [tab[0], tab[1] + 0.03], [tab[0] - 0.01, tab[1] + 0.13], PLANE.seatShade, 0.7)
      if (up > 0.02) glow(pen, mid, 0.42, HOME.sun, 0.7 * up)
    }
    // The handle.
    const h0 = lift(proj([wallAt(-0.95)[1], -0.98], 0.94))
    const h1 = lift(proj([wallAt(-0.8)[1], -0.8], 0.94))
    line(pen, h0, h1, PLANE.caseDark, 1.4)
  })
}

/** The fuselage's skin, cut: a ring, with the door's arc of it drawn on its own (it lifts). */
function drawSkin(pen: Pen, t: number, p: Pal): void {
  const { cx, cy, rIn, rOut } = CAB
  const open = doorOpen(t)
  const outer = arcPts(cx, cy, rOut, DOOR_A1, DOOR_A0 + TAU, 64)
  const inner = arcPts(cx, cy, rIn, DOOR_A0 + TAU, DOOR_A1, 64)
  shape(pen, [...outer, ...inner], p.skin, 0.8)
  if (open > 0) {
    const gap = [...arcPts(cx, cy, rOut + 0.05, DOOR_A0, DOOR_A1, 12), ...arcPts(cx, cy, rIn, DOOR_A1, DOOR_A0, 12)]
    shape(pen, gap, mixHex(PLANE.hull, PLANE.dawnHigh, 0.25), 0)
    box(pen, wallAt(CAB.floor)[1] - 0.05, CAB.floor, cx + rOut, CAB.floor + 0.05, PLANE.caseDark, 0.4)
  }
  const turn = -DOOR_SWING * open
  const seg = [...arcPts(cx, cy, rOut, DOOR_A0 + turn, DOOR_A1 + turn, 12), ...arcPts(cx, cy, rIn - 0.02, DOOR_A1 + turn, DOOR_A0 + turn, 12)]
  shape(pen, seg, mixHex(p.skin, p.wall, 0.35), 0.8)
}

/* ------------------------------------------------------------------ the seats */

/** A first-class seat seen from ahead, a ball's width in its cushion: back and headrest, cushion, pedestal. */
function drawSeat(pen: Pen, x: number, p: Pal, arms: [boolean, boolean], dy: number): void {
  const y = dy
  box(pen, x - 0.15, 0.24 + y, x + 0.15, CAB.floor, p.seatDark, 0.6)
  rbox(pen, x - 0.2, 0.4 + y, x + 0.2, 0.47 + y, 0.02, p.seatShade, 0.5)
  rbox(pen, x - 0.23, -0.64 + y, x + 0.23, 0.2 + y, [0.1, 0.1, 0.03, 0.03], p.seat, 0.7)
  rbox(pen, x - 0.19, -0.6 + y, x + 0.19, -0.46 + y, 0.05, p.seatShade, 0.5)
  line(pen, [x - 0.12, -0.28 + y], [x + 0.12, -0.28 + y], rgba(PLANE.night, 0.18), 0.5)
  rbox(pen, x - 0.25, R + y, x + 0.25, 0.27 + y, 0.04, p.seat, 0.7)
  if (arms[0]) rbox(pen, x - 0.33, -0.02 + y, x - 0.24, 0.27 + y, 0.035, p.seatShade, 0.6)
  if (arms[1]) rbox(pen, x + 0.24, -0.02 + y, x + 0.33, 0.27 + y, 0.035, p.seatShade, 0.6)
}

/** The team's sleeper: one quiet silhouette in the seat by Fischer, his head fallen to one side till he wakes. */
function drawTeam(pen: Pen, t: number, p: Pal, dy: number): void {
  const x = SEAT.team
  const nod = teamNod(t)
  const y = dy
  shape(pen, [[x - 0.19, 0.2 + y], [x - 0.17, 0.02 + y], [x - 0.1, -0.04 + y], [x + 0.1, -0.04 + y], [x + 0.17, 0.02 + y], [x + 0.19, 0.2 + y]], p.sil, 0)
  const hx = x - 0.045 * nod
  const hy = -0.13 + 0.035 * nod + y
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(hx * k, hy * k)
  ctx.rotate(-0.35 * nod)
  oval(pen, 0, 0, 0.075, 0.09, p.sil, 0)
  ctx.restore()
  const lit = isDay(t) ? 0.35 + 0.5 * sunAt(t) : 0.3
  polyline(pen, arcPts(hx, hy, 0.085, -1.2 - 0.35 * nod, 0.6 - 0.35 * nod, 8), rgba(p.rim, lit), 0.7)
  polyline(pen, [[x + 0.1, -0.03 + y], [x + 0.17, 0.02 + y], [x + 0.19, 0.12 + y]], rgba(p.rim, lit * 0.8), 0.6)
}

/* ------------------------------------------------------------------ the case */

/** The plunger's handle: up just under him; pressed down under his weight on bar 17, and down it stays. */
function handleAt(t: number): number {
  if (isDay(t) || t >= PLUNGE) return CASE.handle + 0.11
  return Math.max(CASE.handle, cobbAt(t)[1] + R - 0.02)
}
/** The lid: open (0) to shut (1); Ariadne brings it down on bar 57. */
const lidAt = (t: number): number => (isDay(t) ? clamp01((t - (LID - 0.5)) / 0.5) ** 2 : 0)
/** The drip's chamber stands up in the lid (1) until it sinks away, before the lid comes down. */
const chamberAt = (t: number): number => (isDay(t) ? 1 - sm(t, LID - 1.5, LID - 0.7) : 1)
/** The lines: 1 on their wrists; reeling home from bar 56's second beat. */
const linesAt = (t: number): number => (isDay(t) ? 1 - sm(t, LET_GO, LET_GO + 1.3) : 1)

/** Each line's way from its port on the case to its sleeper's wrist (Cobb's, Ariadne's and Fischer's move with them). */
function linePaths(t: number): Pt[][] {
  const c = cobbAt(t)
  const a = ariadneAt(t)
  const f = fischerAt(t)
  const dy = jolt(t)
  const wrist = (x: number, y: number, s: number): Pt => [x + s * R * Math.cos(1.05), y + R * Math.sin(1.05)]
  const floor = CAB.floor - 0.03
  const port = (x: number): Pt => [x, CASE.top + 0.01 + dy]
  const cw = wrist(c[0], c[1], -1)
  const aw = wrist(a.x, a.y, 1)
  return [
    [port(CASE.x1 - 0.2), [lerp(CASE.x1 - 0.2, cw[0], 0.4), lerp(CASE.top, cw[1], 0.5) + 0.03], cw],
    [port(CASE.x0 + 0.16), [lerp(CASE.x0 + 0.16, aw[0], 0.4), lerp(CASE.top, aw[1], 0.5) + 0.03], aw],
    [[CASE.x1, CASE.top + 0.12 + dy], [CASE.x1 + 0.08, floor - 0.02], [CASE.x1 + 0.35, floor], [SEAT.team - 0.32, floor], [SEAT.team - 0.22, 0.3 + dy], [SEAT.team - 0.14, 0.15 + dy]],
    [[CASE.x1, CASE.top + 0.16 + dy], [CASE.x1 + 0.06, floor], [CASE.x1 + 0.4, floor + 0.01], [SEAT.fischer - 0.26, floor + 0.01], [SEAT.fischer - 0.2, 0.3 + dy], wrist(f.x, f.y, -1)],
  ]
}

const lengthOf = (pts: Pt[]): number => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0)
/** The first `len` of a path. */
function along(pts: Pt[], len: number): Pt[] {
  const out: Pt[] = [pts[0]]
  let left = len
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (d >= left) {
      const u = d > 0 ? left / d : 0
      out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)])
      return out
    }
    out.push(pts[i])
    left -= d
  }
  return out
}

/** The lines from the case: pale tubes to each sleeper's wrist, a bead of the compound running down each on every drop. */
function drawLines(pen: Pen, t: number): void {
  const held = linesAt(t)
  if (held <= 0.002) return
  const day = isDay(t)
  for (const pts of linePaths(t)) {
    const L = lengthOf(pts)
    const shown = along(pts, L * held)
    polyline(pen, shown, rgba(PLANE.tube, day ? 0.9 : 0.6), 0.6)
    const end = shown[shown.length - 1]
    rbox(pen, end[0] - 0.025, end[1] - 0.018, end[0] + 0.025, end[1] + 0.018, 0.01, PLANE.caseDark, 0.4)
    if (day) continue
    for (const d of DRIPS) {
      const u = t - d
      const s = u * 1.4
      if (u < 0 || s > L + 0.05) continue
      const from = along(pts, Math.max(0, s - 0.06))
      const run = along(pts, Math.min(L, s + 0.06))
      const seg = [from[from.length - 1], ...run.slice(from.length)]
      polyline(pen, seg, rgba(PLANE.drip, 0.95 * (1 - clamp01((s - L + 0.25) / 0.3))), 1.25)
    }
  }
}

/** The silver case, open on the floor: the lid up behind with the drip's chamber standing in it; the plunger. */
function drawCase(pen: Pen, t: number, dy: number): void {
  const { x0, x1, top, bottom } = CASE
  const day = isDay(t)
  const y = dy
  const lid = lidAt(t)
  const silver = day ? mixHex(PLANE.case, PLANE.dawn, 0.14) : mixHex(PLANE.case, PLANE.cabin, 0.3)
  const silverDark = day ? PLANE.caseDark : mixHex(PLANE.caseDark, PLANE.night, 0.35)
  // The lid, up behind (its dark foam face to us), coming down toward us as it shuts.
  if (lid < 0.999) {
    const h = CASE.lid * Math.cos((lid * Math.PI) / 2)
    shape(pen, [[x0, top + y], [x0 + 0.015, top - h + y], [x1 - 0.015, top - h + y], [x1, top + y]], silver, 0.8)
    if (h > 0.05) shape(pen, [[x0 + 0.035, top + y], [x0 + 0.045, top - h + 0.035 + y], [x1 - 0.045, top - h + 0.035 + y], [x1 - 0.035, top + y]], mixHex(PLANE.night, silverDark, 0.3), 0)
  }
  // The drip's chamber, glass, standing in the lid.
  const ch = chamberAt(t)
  if (ch > 0.01 && lid < 0.6) drawChamber(pen, t, dy, ch)
  // The body.
  rbox(pen, x0, top + y, x1, bottom + y, 0.03, silver, 0.8)
  line(pen, [x0 + 0.02, top + 0.075 + y], [x1 - 0.02, top + 0.075 + y], rgba(PLANE.night, 0.3), 0.5)
  for (const x of [x0 + 0.1, x1 - 0.1]) box(pen, x - 0.03, top + 0.04 + y, x + 0.03, top + 0.1 + y, silverDark, 0.4)
  if (lid >= 0.999) {
    polyline(pen, arcPts(CASE_X, top + y, 0.07, Math.PI, TAU, 10), silverDark, 1.2)
    line(pen, [x0 + 0.02, top + 0.02 + y], [x1 - 0.02, top + 0.02 + y], silverDark, 0.6)
  }
  // The plunger: its rod up out of the case's right end, the T of its handle just under him.
  if (lid < 0.5) {
    const hy = handleAt(t) + y
    const px = CASE.plungeX
    box(pen, px - 0.012, hy, px + 0.012, top + y, silverDark, 0.4)
    rbox(pen, px - 0.08, hy - 0.012, px + 0.08, hy + 0.022, 0.01, silver, 0.6)
    box(pen, px - 0.035, top - 0.02 + y, px + 0.035, top + y, silverDark, 0.4)
  }
}

function drawChamber(pen: Pen, t: number, dy: number, up: number): void {
  const day = isDay(t)
  const cx = CASE_X
  const [c0, c1] = CASE.chamber
  const bottom = c1 + dy
  const h = (c1 - c0) * up
  const top = bottom - h
  const w = 0.045
  if (!day) glow(pen, [cx, bottom - 0.08], 0.22, PLANE.drip, 0.22 + 0.1 * (t > PLUNGE ? 1 : 0))
  rbox(pen, cx - w, top, cx + w, bottom, 0.015, rgba(PLANE.drip, 0.16), 0.55, day ? PLANE.caseDark : mixHex(PLANE.drip, PLANE.cabin, 0.45))
  const pool = bottom - 0.065
  const last = DRIPS.filter((d) => d <= t).pop()
  const splash = last !== undefined && !day ? Math.exp(-(t - last) / 0.12) : 0
  box(pen, cx - w + 0.008, pool - 0.006 * splash, cx + w - 0.008, bottom - 0.008, rgba(PLANE.drip, 0.65 + 0.35 * splash), 0)
  rbox(pen, cx - w - 0.01, top - 0.035, cx + w + 0.01, top + 0.012, 0.012, day ? PLANE.caseDark : mixHex(PLANE.caseDark, PLANE.night, 0.25), 0.5)
  if (day || up < 0.99) return
  const nozzle = top + 0.03
  const next = DRIPS.find((d) => d > t)
  const prev = last ?? DRIPS[0] - 0.95
  if (next !== undefined) {
    const fall0 = next - DROP_FALL
    if (t < fall0) {
      // Swelling at the nozzle.
      const u = clamp01((t - prev) / Math.max(0.05, fall0 - prev))
      const r = 0.007 + 0.013 * u
      oval(pen, cx, nozzle + r * 0.9, r * 0.85, r, rgba(PLANE.drip, 0.95), 0)
    } else {
      const u = (t - fall0) / DROP_FALL
      oval(pen, cx, lerp(nozzle + 0.02, pool - 0.01, u * u), 0.012, 0.017, rgba(PLANE.drip, 0.95), 0)
    }
  }
  // The splash: two specks up off the pool and back.
  if (last !== undefined) {
    const u = t - last
    if (u < 0.18) {
      for (const s of [-1, 1]) oval(pen, cx + s * 0.013 * (1 + u * 8), pool - 0.035 * Math.sin((u / 0.18) * Math.PI), 0.005, 0.005, rgba(PLANE.drip, 0.9), 0)
    }
  }
}

/* ------------------------------------------------------------------ the nose gear */

function drawNoseGear(pen: Pen, t: number, p: Pal): void {
  const down = gearDown(t)
  const dy = jolt(t)
  const cx = CAB.cx
  const bayY = CAB.cy + CAB.rOut + dy
  if (down <= 0.01) return
  for (const s of [-1, 1]) {
    const a = Math.min(1, down * 1.6) * 1.35
    const hinge: Pt = [cx + s * 0.36, bayY - 0.08]
    line(pen, hinge, [hinge[0] - s * Math.cos(a) * 0.32, hinge[1] + Math.sin(a) * 0.32], p.skin, 2.4)
  }
  const pivot: Pt = [cx, bayY - 0.05]
  const full = GROUND - 0.42 - (CAB.cy + CAB.rOut - 0.05)
  const axleY = t >= TOUCH ? GROUND - 0.42 : pivot[1] + full * Math.sin((down * Math.PI) / 2)
  const strut = isDay(t) ? mixHex(PLANE.caseDark, PLANE.dawnHigh, 0.2) : PLANE.caseDark
  const chrome = isDay(t) ? mixHex(PLANE.case, PLANE.dawn, 0.2) : PLANE.case
  const mid = pivot[1] + (axleY - pivot[1]) * 0.55
  box(pen, cx - 0.13, pivot[1], cx + 0.13, mid, strut, 0.7)
  box(pen, cx - 0.08, mid, cx + 0.08, axleY - 0.05, chrome, 0.6)
  polyline(pen, [[cx + 0.12, mid - 0.2], [cx + 0.26, (mid + axleY) / 2 - 0.05], [cx + 0.08, axleY - 0.14]], strut, 1.4)
  box(pen, cx - 0.32, axleY - 0.06, cx + 0.32, axleY + 0.06, strut, 0.6)
  const tyre = mixHex(PLANE.night, PLANE.cabin, 0.45)
  const spin = spinAt(t)
  for (const s of [-1, 1]) {
    const tx = cx + s * 0.23
    rbox(pen, tx - 0.14, axleY - 0.42, tx + 0.14, axleY + 0.42, 0.11, tyre, 0.7)
    treads(pen, tx, axleY, 0.14, 0.42, spin)
    rbox(pen, tx - 0.05, axleY - 0.11, tx + 0.05, axleY + 0.11, 0.02, chrome, 0.4)
  }
}

/* ------------------------------------------------------------------ light */

/** The lamp's cone over the case at night, the moon at the left window; the sun through Fischer's window in the morning. */
export function drawLight(pen: Pen, t: number, over: boolean): void {
  const dy = jolt(t)
  const lamp = lampAt(t)
  const p5 = asP5(pen)
  if (lamp > 0.002) {
    beam(p5, pen.k, [CASE_X, CAB.bin + 0.04], [CASE_X, 0.42], 0.12, 1.35, PLANE.lamp, (over ? 0.2 : 0.42) * lamp)
    if (!over) {
      puff(pen, [CASE_X, -0.1], 0.8, 0.45, PLANE.lamp, 0.2 * lamp)
      puff(pen, [CASE_X, CASE.top], 0.6, 0.12, PLANE.lamp, 0.3 * lamp)
      box(pen, CASE_X - 0.06, CAB.bin, CASE_X + 0.06, CAB.bin + 0.03, rgba(PLANE.lamp, 0.95 * lamp), 0)
    }
  }
  if (!isDay(t)) {
    if (!over) beam(p5, pen.k, proj([wallAt(-0.45)[0], -0.45], 0.93), [0.4, 0.4], 0.3, 0.9, PLANE.dawnHigh, 0.09)
    return
  }
  // The morning off the left window, soft.
  if (!over) beam(p5, pen.k, proj([wallAt(-0.45)[0], -0.45 + dy], 0.93), [0.4, 0.45 + dy], 0.3, 1.0, PLANE.dawn, 0.14 * (1 - sm(t, DOCK - 1.5, DOCK)))
  // The sun, low, through Fischer's window once he has it up: across him, the aisle, Cobb, the case, Ariadne.
  const sun = sunAt(t)
  if (sun > 0.002) {
    const q = windowQuad(1, WINDOWS[0])
    const src = onDoor(t, [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2 + dy])
    const col = mixHex(PLANE.lamp, PLANE.dawn, 0.4)
    beam(p5, pen.k, src, [-1.0, 0.4 + dy], 0.4, 1.35, col, (over ? 0.26 : 0.7) * sun)
    beam(p5, pen.k, src, [-0.7, 0.25 + dy], 0.26, 0.7, HOME.sun, (over ? 0.16 : 0.5) * sun)
    if (!over) {
      puff(pen, [0.8, CAB.floor + dy], 2.4, 0.2, col, 0.4 * sun)
      // Where it falls: on the seat backs of the row, on the case, warm.
      for (const x of [SEAT.fischer, SEAT.team, SEAT.cobb, SEAT.ariadne]) puff(pen, [x, -0.3 + dy + 0.06 * (x - 2.6) * -0.3], 0.28, 0.32, HOME.sun, 0.42 * sun)
      puff(pen, [CASE_X, CASE.top + 0.1 + dy], 0.45, 0.15, HOME.sun, 0.4 * sun)
      puff(pen, src, 0.2, 0.35, HOME.sun, 0.6 * sun)
    }
  }
}

/* ------------------------------------------------------------------ all of it */

export function drawCabin(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < CAB.cx - CAB.rOut - 1 || f.x0 > CAB.cx + CAB.rOut + 1 || f.y1 < CAB.cy - CAB.rOut - 1 || f.y0 > GROUND + 1) return
  const p = palAt(t)
  const dy = jolt(t)
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(0, dy * k)
  drawInside(pen, t, p)
  drawDoor(pen, t, p)
  drawSkin(pen, t, p)
  ctx.restore()
  drawNoseGear(pen, t, p)
  drawSeat(pen, SEAT.ariadne, p, [true, true], dy)
  drawSeat(pen, SEAT.cobb, p, [true, true], dy)
  drawSeat(pen, SEAT.team, p, [true, false], dy)
  drawSeat(pen, SEAT.fischer, p, [false, true], dy)
  // The console between the team's seat and Fischer's.
  box(pen, SEAT.team + 0.2, 0.18 + dy, SEAT.fischer - 0.2, CAB.floor, p.seatDark, 0.6)
  rbox(pen, SEAT.team + 0.18, 0.17 + dy, SEAT.fischer - 0.18, 0.22 + dy, 0.02, p.seatShade, 0.6)
  drawLight(pen, t, false)
  drawTeam(pen, t, p, dy)
  drawCase(pen, t, dy)
  drawLines(pen, t)
}
