import { mixHex, R, type Pt } from '../../../../../parts'
import { beam, bloom, pool } from '../cast'
import { hash } from '../kit'
import { DEREK, SPA } from '../worlds'
import { G, G_LOW } from '../physics'
import {
  BELT_X0,
  BELT_X1,
  beltD,
  CAB,
  CAB_IN,
  CAB_OUT,
  CAB_PUFF,
  CHOPS,
  CAB_LAMP,
  clamp01,
  CYCLES,
  DRUM_T,
  DRUM_UP,
  DRUM_X,
  DRY,
  DRY_UP,
  FLINGS,
  FLOOR_Y,
  FOG_GO,
  GANTRIES,
  HOOD,
  lerp,
  LAMPS_ON,
  LIFT_GO,
  LIFT_X,
  liftRise,
  MUD_TIP,
  MUD_X,
  RINSE_OFF,
  RINSE_ON,
  RINSE_X,
  SET_OFF,
  SLICER_X,
  SLICER_Y,
  SLICES,
  sm,
  TOWEL,
  TOWEL_GO,
  TOWEL_X,
  WAY,
  XT,
} from './spa-geo'
import { box, column, dot, line, polyline, puff, rbox, shape, vwash, type Pen } from './spa-kit'
import { CEIL } from './spa-set'

/**
 * The line: a car wash for models. A teak-slatted belt from the door to the recliner, and over it, each under its own
 * brass gantry, the treatments: two towel drums, the mud trough and the teal rinse, the cucumber slicer, the steam
 * cabinet, the hot towel's arm and the dryer's hood. Mugatu's lift beside the door. And over the room past the line's
 * end, the steam that hides the rig until it clears.
 */

const TEAK = mixHex(SPA.mud, SPA.brass, 0.42)
const TEAK_DARK = mixHex(SPA.mud, SPA.marble, 0.35)
const CHROME = SPA.steel
const GANTRY_TOP = -2.15

/* ------------------------------------------------------------------ the belt */

export function drawBelt(pen: Pen, t: number, f: { x0: number; x1: number }): void {
  const a = Math.max(BELT_X0, f.x0 - 1)
  const b = Math.min(BELT_X1, f.x1 + 1)
  if (a >= b) return
  // Its body under the slats, sunk in the floor: dark, a brass edge, its rollers.
  box(pen, a, FLOOR_Y + 0.07, b, FLOOR_Y + 0.28, SPA.tile, 0.6)
  box(pen, a, FLOOR_Y + 0.07, b, FLOOR_Y + 0.1, SPA.brass, 0)
  // The slats: moving his way at the belt's pace.
  const pitch = 0.2
  const d = beltD(t)
  const start = Math.floor((a - BELT_X0 - d) / pitch) * pitch + BELT_X0 + d
  for (let x = start; x < b; x += pitch) {
    const x0 = Math.max(a, x + 0.015)
    const x1 = Math.min(b, x + pitch - 0.02)
    if (x1 <= x0) continue
    box(pen, x0, FLOOR_Y, x1, FLOOR_Y + 0.08, TEAK, 0.45)
    box(pen, x0, FLOOR_Y, x1, FLOOR_Y + 0.02, mixHex(TEAK, SPA.candle, 0.35), 0)
  }
  // The drums at each end, turning with it.
  for (const [x, r] of [
    [BELT_X0 + 0.14, 0.14],
    [BELT_X1 - 0.12, 0.12],
  ] as const) {
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const c: Pt = [x, FLOOR_Y + 0.14]
    dot(pen, c, r, TEAK_DARK, 0.6)
    const ang = d / r
    line(pen, [c[0] - Math.cos(ang) * r * 0.8, c[1] - Math.sin(ang) * r * 0.8], [c[0] + Math.cos(ang) * r * 0.8, c[1] + Math.sin(ang) * r * 0.8], SPA.brass, 0.6)
  }
}

/* ------------------------------------------------------------------ Mugatu's lift */

export function drawLift(pen: Pen, t: number): void {
  const rise = liftRise(t)
  const x = LIFT_X
  // Its rails, up into the dark; a counterweight coming down as the car goes up.
  for (const dx of [-0.3, 0.3]) line(pen, [x + dx, FLOOR_Y], [x + dx, CEIL], SPA.brass, 0.55)
  const cw = -2.9 + rise * 0.7
  box(pen, x + 0.24, cw - 0.3, x + 0.36, cw, SPA.steelDark, 0.4)
  // The car: its floor under him, a brass cage, a little canopy.
  const y = FLOOR_Y - rise
  box(pen, x - 0.3, y, x + 0.3, y + 0.06, SPA.brass, 0.6)
  const top = y - 0.62
  for (const dx of [-0.28, 0.28]) line(pen, [x + dx, y], [x + dx, top], SPA.brass, 0.5)
  shape(
    pen,
    [
      [x - 0.33, top],
      [x, top - 0.14],
      [x + 0.33, top],
    ],
    SPA.brass,
    0.5,
  )
  line(pen, [x - 0.28, y - 0.36], [x + 0.28, y - 0.36], SPA.brass, 0.4)
  // Its cable up into the dark.
  line(pen, [x, top - 0.14], [x, CEIL], SPA.steelDark, 0.4)
  if (t > LIFT_GO - 0.3 && t < LIFT_GO + 0.4) bloom(pen.p, pen.k, [x, y - 0.3], 0.6, SPA.candle, 0.1 * (1 - sm(t, LIFT_GO, LIFT_GO + 0.4)))
}

/* ------------------------------------------------------------------ the gantries and their lamps */

/** How lit a gantry's lamp is: dim, switched on on its downbeat (a quick bright catch, settling), dimmed once he is by. */
function gantryLit(i: number, t: number): number {
  const on = LAMPS_ON[i]
  const off = [DRUM_UP[1] + 0.3, RINSE_OFF + 0.2, SLICES[1] + 0.4, DRY_UP + 0.3][i]
  if (t < on) return 0.12
  const u = t - on
  const catchUp = u < 0.05 ? u / 0.05 : 1
  return 0.12 + 0.88 * catchUp * (1 + 0.25 * Math.exp(-u / 0.2)) * (1 - sm(t, off, off + 0.9))
}

export function drawGantries(pen: Pen, t: number, f: { x0: number; x1: number }): void {
  GANTRIES.forEach((g, i) => {
    const x0 = g.x - g.w / 2
    const x1 = g.x + g.w / 2
    if (x1 < f.x0 - 1 || x0 > f.x1 + 1) return
    const lit = gantryLit(i, t)
    // The lamp's light down onto the belt.
    beam(pen.p, pen.k, [g.x, GANTRY_TOP + 0.2], [g.x, FLOOR_Y], 0.2, g.w * 0.8, SPA.candle, 0.26 * lit)
    pool(pen.p, pen.k, [g.x, FLOOR_Y + 0.02], g.w * 0.5, 0.09, SPA.candle, 0.55 * lit)
    // The portal: two posts and a beam, its corners rounded like an arch.
    const w = 0.07
    box(pen, x0 - w / 2, GANTRY_TOP + 0.25, x0 + w / 2, FLOOR_Y, SPA.brass, 0.55)
    box(pen, x1 - w / 2, GANTRY_TOP + 0.25, x1 + w / 2, FLOOR_Y, SPA.brass, 0.55)
    const arc: Pt[] = []
    for (let s = 0; s <= 16; s++) {
      const a = Math.PI + (Math.PI * s) / 16
      arc.push([g.x + Math.cos(a) * (g.w / 2), GANTRY_TOP + 0.25 + Math.sin(a) * 0.25])
    }
    polyline(pen, arc, SPA.brass, 2.0)
    // The lamp: a little brass shade.
    shape(
      pen,
      [
        [g.x - 0.09, GANTRY_TOP + 0.12],
        [g.x + 0.09, GANTRY_TOP + 0.12],
        [g.x + 0.05, GANTRY_TOP + 0.02],
        [g.x - 0.05, GANTRY_TOP + 0.02],
      ],
      SPA.brass,
      0.5,
    )
    bloom(pen.p, pen.k, [g.x, GANTRY_TOP + 0.16], 0.35, SPA.candle, 0.6 * lit)
  })
}

/* ------------------------------------------------------------------ the towel drums */

const DRUM_R = 0.38
/** A drum's hub at `t`: parked up under its beam, down on his top from its beat, riding him, and up again. */
export function drumHub(i: number, t: number): Pt {
  const parked: Pt = [DRUM_X[i] - 0.05, -1.3]
  const him = WAY.at(t)
  const onHim: Pt = [him[0], him[1] - R - DRUM_R + 0.02]
  // Down onto him, gathering, so it lands on the beat.
  const down = clamp01((t - (DRUM_T[i] - 0.32)) / 0.32)
  const d = down * down
  const up = sm(t, DRUM_UP[i], DRUM_UP[i] + 0.45)
  const w = d * (1 - up)
  // Kneading: a small press on the half beat while it rides him.
  const knead = t > DRUM_T[i] && t < DRUM_UP[i] ? 0.03 * Math.sin(((t - DRUM_T[i]) / (DRUM_UP[i] - DRUM_T[i])) * Math.PI * 2) : 0
  const hold: Pt = [lerp(parked[0], parked[0] + 0.35, up), parked[1]]
  return [lerp(hold[0], onHim[0], w), lerp(hold[1], onHim[1] + knead, w)]
}
/** How far round a drum has turned: spinning from the belt's start, faster while on him. */
const drumTurn = (i: number, t: number): number => {
  const u = Math.max(0, t - SET_OFF)
  return (i ? -1 : 1) * (u * 3.2 + 4 * Math.max(0, Math.min(t, DRUM_UP[i] + 0.5) - DRUM_T[i]))
}

export function drawDrums(pen: Pen, t: number): void {
  DRUM_X.forEach((x, i) => {
    const hub = drumHub(i, t)
    const pivot: Pt = [x - 0.05 + (i ? 0.45 : -0.45), GANTRY_TOP + 0.3]
    // The arm from the beam to the hub.
    line(pen, pivot, hub, SPA.brass, 1.3)
    dot(pen, pivot, 0.05, SPA.brass, 0.5)
    // The drum: a roll of towel seen end on, its spiral going round as it turns; a soft nap at its edge.
    const turn = drumTurn(i, t)
    const pts: Pt[] = []
    const n = 40
    for (let q = 0; q < n; q++) {
      const a = (q / n) * Math.PI * 2
      const nap = 0.012 * Math.sin((a + turn) * 11)
      pts.push([hub[0] + Math.cos(a) * (DRUM_R + nap), hub[1] + Math.sin(a) * (DRUM_R + nap)])
    }
    shape(pen, pts, SPA.towel, 0.6)
    const spiral: Pt[] = []
    for (let q = 0; q <= 60; q++) {
      const u = q / 60
      const a = turn + u * Math.PI * 2 * 2.6
      const r = 0.1 + (DRUM_R - 0.14) * u
      spiral.push([hub[0] + Math.cos(a) * r, hub[1] + Math.sin(a) * r])
    }
    polyline(pen, spiral, SPA.towelShade, 0.9)
    dot(pen, hub, 0.07, SPA.brass, 0.5)
  })
}

/* ------------------------------------------------------------------ the mud and the rinse */

const MUD_LIP_Y = GANTRY_TOP + 0.55
/** The trough's tip (radians) at `t`: tipping on its beat, pouring, and back. */
const troughTip = (t: number): number => 1.25 * sm(t, MUD_TIP - 0.08, MUD_TIP + 0.12) * (1 - sm(t, MUD_TIP + 1.3, MUD_TIP + 2.2))
/** The mud falling: its head and its tail (y), from the lip to the belt. */
function mudFall(t: number): { head: number; tail: number } | null {
  const u = t - MUD_TIP
  if (u < 0) return null
  const head = MUD_LIP_Y + 0.5 * G * u * u
  const v = Math.max(0, u - 0.62)
  const tail = MUD_LIP_Y + 0.5 * G * v * v
  if (tail > FLOOR_Y) return null
  return { head: Math.min(FLOOR_Y, head), tail }
}

export function drawMud(pen: Pen, t: number, front: boolean): void {
  const x = MUD_X + 0.02
  if (!front) {
    // The trough on its pivot: brass, filled with mud, tipping toward us over the belt.
    const tip = troughTip(t)
    const piv: Pt = [x + 0.28, GANTRY_TOP + 0.45]
    const rotp = (q: Pt): Pt => {
      const dx = q[0] - piv[0]
      const dy = q[1] - piv[1]
      const c = Math.cos(-tip)
      const s = Math.sin(-tip)
      return [piv[0] + dx * c - dy * s, piv[1] + dx * s + dy * c]
    }
    const body: Pt[] = [
      [x - 0.34, GANTRY_TOP + 0.33],
      [x + 0.34, GANTRY_TOP + 0.33],
      [x + 0.28, GANTRY_TOP + 0.58],
      [x - 0.28, GANTRY_TOP + 0.58],
    ].map((q) => rotp(q as Pt))
    const full = 1 - sm(t, MUD_TIP + 0.1, MUD_TIP + 0.7)
    if (full > 0.02) {
      const mud: Pt[] = [
        [x - 0.3, GANTRY_TOP + 0.36 + 0.18 * (1 - full)],
        [x + 0.3, GANTRY_TOP + 0.36 + 0.18 * (1 - full)],
        [x + 0.27, GANTRY_TOP + 0.56],
        [x - 0.27, GANTRY_TOP + 0.56],
      ].map((q) => rotp(q as Pt))
      shape(pen, mud, SPA.mud, 0)
    }
    shape(pen, body, SPA.brass, 0.7)
    dot(pen, piv, 0.045, SPA.brass, 0.5)
    // The grate in the belt where the mud goes.
    box(pen, x - 0.3, FLOOR_Y + 0.07, x + 0.3, FLOOR_Y + 0.12, SPA.marbleVein, 0)
    return
  }
  // The curtain of mud: a thick falling sheet, its head rounded, its edges wavering; a splash where it lands.
  const m = mudFall(t)
  if (!m) return
  const w = 0.36
  const pts: Pt[] = []
  const n = 12
  for (let s = 0; s <= n; s++) {
    const y = lerp(m.tail, m.head, s / n)
    pts.push([x - w / 2 + 0.03 * Math.sin(y * 9 + t * 7), y])
  }
  for (let s = n; s >= 0; s--) {
    const y = lerp(m.tail, m.head, s / n)
    pts.push([x + w / 2 + 0.03 * Math.sin(y * 8 - t * 6 + 1), y])
  }
  shape(pen, pts, SPA.mud, 0)
  // Its sheen, soft down its middle.
  column(pen, x - 0.04, m.tail, m.head, 0.1, SPA.brass, 0.18, 0.1)
  if (m.head >= FLOOR_Y - 0.02) {
    const s = t - (MUD_TIP + Math.sqrt((2 * (FLOOR_Y - MUD_LIP_Y)) / G))
    for (let j = 0; j < 5; j++) {
      const a = -Math.PI / 2 + (j - 2) * 0.55
      const r = 0.12 + 0.35 * clamp01(s * 2.5) * (0.6 + 0.4 * hash(j, 3))
      const q: Pt = [x + Math.cos(a) * r, FLOOR_Y - 0.02 + Math.sin(a) * r * 0.6 + 2 * s * s]
      if (s > 0 && s < 0.6) dot(pen, q, 0.045 * (1 - s / 0.6), SPA.mud, 0)
    }
  }
}

/** The rinse: a bar of jets; on, it pours teal water in four soft streams onto the belt and him. */
export function drawRinse(pen: Pen, t: number, front: boolean): void {
  const x = RINSE_X
  const y = GANTRY_TOP + 0.4
  if (!front) {
    box(pen, x - 0.42, y - 0.06, x + 0.42, y + 0.06, SPA.brass, 0.6)
    for (let j = 0; j < 4; j++) {
      const nx = x - 0.3 + j * 0.2
      shape(
        pen,
        [
          [nx - 0.04, y + 0.06],
          [nx + 0.04, y + 0.06],
          [nx + 0.025, y + 0.14],
          [nx - 0.025, y + 0.14],
        ],
        SPA.brass,
        0.4,
      )
    }
    line(pen, [x, y - 0.06], [x, GANTRY_TOP + 0.05], SPA.brass, 0.8)
    return
  }
  const on = sm(t, RINSE_ON - 0.05, RINSE_ON + 0.12) * (1 - sm(t, RINSE_OFF - 0.1, RINSE_OFF + 0.25))
  if (on <= 0.01) return
  // The streams come down from the jets as the water reaches them.
  const reach = Math.min(FLOOR_Y, y + 0.14 + 0.5 * G * Math.max(0, t - RINSE_ON) ** 2 * 0.8 + 3 * Math.max(0, t - RINSE_ON))
  const gone = Math.max(y + 0.14, y + 0.14 + (t > RINSE_OFF ? 6 * (t - RINSE_OFF) ** 2 * 3 : 0))
  for (let j = 0; j < 4; j++) {
    const nx = x - 0.3 + j * 0.2
    const wob = 0.012 * Math.sin(t * 17 + j * 2)
    column(pen, nx + wob, gone, reach, 0.11, SPA.waterLight, 0.55 * on, 0.06)
    column(pen, nx + wob, gone, reach, 0.05, SPA.towel, 0.35 * on, 0.06)
  }
  if (reach >= FLOOR_Y - 0.01) puff(pen, [x, FLOOR_Y - 0.05], 0.5, SPA.waterLight, 0.35 * on)
}

/* ------------------------------------------------------------------ the cucumber slicer, and the slices */

const EYES: Pt[] = [
  [-0.05, -0.03],
  [0.05, -0.03],
]
const SLICE_R = 0.04
/** Where each slice is at `t`, and whether it is on him: cut, fluttering down, riding him, then torn off by the first fling. */
export function sliceAt(i: number, t: number): { at: Pt; tilt: number; on: boolean } | null {
  const cut = CHOPS[i]
  if (t < cut) return null
  const land = SLICES[i]
  const blade: Pt = [SLICER_X + 0.22, SLICER_Y]
  if (t < land) {
    const u = (t - cut) / (land - cut)
    const target = WAY.at(land)
    const end: Pt = [target[0] + EYES[i][0], target[1] + EYES[i][1]]
    return { at: [lerp(blade[0], end[0], u) + 0.03 * Math.sin(u * 9), lerp(blade[1], end[1], u * u)], tilt: Math.sin(u * 7) * 0.8, on: false }
  }
  const tear = CYCLES[0].fling
  if (t < tear) {
    const him = WAY.at(t)
    return { at: [him[0] + EYES[i][0], him[1] + EYES[i][1]], tilt: 0, on: true }
  }
  return offHim(t, EYES[i], i)
}

/** A thing that rode him, left behind by the fling: peeled back off him, fluttering down into the pit behind the chair. */
function offHim(t: number, rel: Pt, i: number): { at: Pt; tilt: number; on: boolean } | null {
  const tear = CYCLES[0].fling
  const from = FLINGS[0].from
  const u = t - tear
  const vx = -0.7 - 0.25 * i
  const x = from[0] + rel[0] + vx * 0.5 * (1 - Math.exp(-u / 0.5)) - 0.15 * u
  const y = Math.min(0.42, from[1] + rel[1] - 0.6 * (1 - Math.exp(-u / 0.25)) + 0.5 * G_LOW * u * u)
  if (y >= 0.42 && u > 3) return null
  return { at: [x, y], tilt: u * 5 * (i ? -1 : 1), on: false }
}

export function drawSlicer(pen: Pen, t: number): void {
  const x = SLICER_X
  const y = SLICER_Y
  const hangs = GANTRY_TOP + 0.3
  line(pen, [x, hangs], [x, y - 0.2], SPA.brass, 0.8)
  // The cucumber: fed into the slicer from the left, a slice shorter at each chop.
  const fed = CHOPS.filter((c) => t >= c).length * 0.04
  const cuke0 = x - 0.62 + fed
  rbox(pen, cuke0, y - 0.1, x + 0.12 + 0.04 * (t >= CHOPS[1] ? 0 : 1), y + 0.01, 0.05, SPA.cucumber, 0.5)
  // The slicer's body over the cucumber's end, and its blade dropping on each chop.
  rbox(pen, x - 0.08, y - 0.2, x + 0.18, y - 0.06, 0.03, SPA.brass, 0.6)
  let drop = 0
  for (const c of CHOPS) {
    const u = t - c
    if (u > -0.1 && u < 0.35) drop = Math.max(drop, u < 0 ? 1 + u / 0.1 : Math.exp(-u / 0.08))
  }
  box(pen, x + 0.16, y - 0.22 + 0.2 * drop, x + 0.21, y - 0.02 + 0.12 * drop, CHROME, 0.4)
}

export function drawSlices(pen: Pen, t: number): void {
  for (let i = 0; i < 2; i++) {
    const s = sliceAt(i, t)
    if (!s) continue
    const { p, k } = pen
    p.push()
    p.translate(s.at[0] * k, s.at[1] * k)
    p.rotate(s.tilt)
    // A slice seen near face on: its skin, its pale flesh, a ring of seeds as a faint inner ring.
    dot(pen, [0, 0], SLICE_R, SPA.cucumber, 0.35)
    dot(pen, [0, 0], SLICE_R * 0.74, SPA.cucumberPale, 0)
    dot(pen, [0, 0], SLICE_R * 0.34, mixHex(SPA.cucumberPale, SPA.cucumber, 0.35), 0)
    p.pop()
  }
}

/* ------------------------------------------------------------------ the steam cabinet */

/** The cabinet's doors: how far each is up (1 open). The entry door comes down behind him; the far one goes up. */
const cabDoors = (t: number): { entry: number; exit: number } => ({
  entry: 1 - sm(t, CAB_IN - 0.18, CAB_IN),
  exit: sm(t, CAB_OUT - 0.02, CAB_OUT + 0.22) * (1 - sm(t, CAB_OUT + 1.8, CAB_OUT + 2.4)) + (t < CAB_IN - 0.5 ? 0 : 0),
})
/** How thick the steam in it is (0..1). */
const cabSteam = (t: number): number => 0.2 + 0.75 * sm(t, CAB_IN - 0.05, CAB_PUFF) * (1 - sm(t, CAB_OUT, CAB_OUT + 1.2))

export function drawCabinet(pen: Pen, t: number, front: boolean): void {
  const { x0, x1, top } = CAB
  const doors = cabDoors(t)
  if (!front) {
    // Its inside: dark marble, the steam in it lit from a lamp in its roof.
    box(pen, x0, top, x1, FLOOR_Y, mixHex(SPA.tile, SPA.marble, 0.4), 0.7)
    const lamp = t < CAB_LAMP ? 0.15 : 0.15 + 0.85 * Math.min(1, (t - CAB_LAMP) / 0.05) * (1 - sm(t, CAB_OUT + 0.5, CAB_OUT + 1.5))
    bloom(pen.p, pen.k, [(x0 + x1) / 2, top + 0.4], 0.9, SPA.candle, 0.3 * lamp)
    pool(pen.p, pen.k, [(x0 + x1) / 2, FLOOR_Y], 0.6, 0.06, SPA.candle, 0.3 * lamp)
    // The steam cloud rolling out of the far door after him.
    const out = t - CAB_OUT
    if (out > 0 && out < 3) {
      for (let j = 0; j < 4; j++) {
        const u = out - j * 0.12
        if (u < 0) continue
        puff(pen, [x1 + 0.2 + u * 0.35 + j * 0.1, FLOOR_Y - 0.35 - u * 0.45 - j * 0.12], 0.35 + u * 0.3, SPA.steam, 0.35 * Math.exp(-u / 0.9))
      }
    }
    return
  }
  // Its front: frosted glass in a brass frame, fogging white as the steam thickens (it shows where he is).
  const steam = cabSteam(t)
  const him = WAY.at(t)
  const inside = him[0] > x0 - 0.05 && him[0] < x1 + 0.05 && t > CAB_IN - 0.4 && t < CAB_OUT + 0.3
  vwash(pen, x0 + 0.06, x1 - 0.06, top + 0.08, FLOOR_Y - 0.02, [
    [0, SPA.steam, 0.25 + 0.55 * steam],
    [1, SPA.steam, 0.35 + 0.6 * steam],
  ])
  if (inside && steam > 0.4) {
    // Through the fogged glass, a soft blue shape where he is.
    puff(pen, him, 0.24, DEREK, 0.5 * steam)
  }
  // The frame, its mullion, its roof and vent (a puff out of it on the steam's beat).
  const fr = SPA.brass
  box(pen, x0, top, x1, top + 0.08, fr, 0.6)
  box(pen, x0, FLOOR_Y - 0.04, x1, FLOOR_Y + 0.02, fr, 0)
  box(pen, (x0 + x1) / 2 - 0.025, top + 0.08, (x0 + x1) / 2 + 0.025, FLOOR_Y - 0.04, fr, 0)
  box(pen, (x0 + x1) / 2 - 0.12, top - 0.14, (x0 + x1) / 2 + 0.12, top, fr, 0.5)
  const pu = t - CAB_PUFF
  if (pu > -0.05 && pu < 2.2) {
    for (let j = 0; j < 3; j++) {
      const u = Math.max(0, pu - j * 0.1)
      puff(pen, [(x0 + x1) / 2 + j * 0.08, top - 0.25 - u * 0.9], 0.25 + u * 0.35, SPA.steam, 0.55 * Math.exp(-u / 0.7) * sm(pu, -0.05, 0.05))
    }
  }
  // The doors: slabs at each end sliding down (shut) and up (open) in brass guides.
  for (const [x, up] of [
    [x0, doors.entry],
    [x1, doors.exit],
  ] as const) {
    const h = FLOOR_Y - top - 0.08
    const y1 = FLOOR_Y - 0.02 - h * up * 0.95
    box(pen, x - 0.05, y1 - h, x + 0.05, y1, mixHex(SPA.tile, SPA.marbleVein, 0.6), 0.6)
    line(pen, [x - 0.07, top - 0.9], [x - 0.07, FLOOR_Y], fr, 0.45)
    line(pen, [x + 0.07, top - 0.9], [x + 0.07, FLOOR_Y], fr, 0.45)
  }
}

/* ------------------------------------------------------------------ the hot towel, and the dryer's hood */

/** The towel arm's angle (0 parked up, 1 down at him). */
const towelArm = (t: number): number => sm(t, TOWEL_GO, TOWEL) * (1 - sm(t, TOWEL + 0.15, TOWEL + 0.9))
const TOWEL_PIVOT: Pt = [TOWEL_X + 0.55, GANTRY_TOP + 0.3]

/** Where the towel is and how it is: carried on the arm, wrapped round him, torn off by the first fling. */
export function towelAt(t: number): { at: Pt; wrap: number; tilt: number } | null {
  if (t < TOWEL) {
    const a = towelArm(t)
    const tip = armTip(a)
    return { at: [tip[0], tip[1] + 0.16], wrap: 0, tilt: 0 }
  }
  const tear = CYCLES[0].fling
  if (t < tear) return { at: WAY.at(t), wrap: sm(t, TOWEL, TOWEL + 0.14), tilt: 0 }
  const o = offHim(t, [0, 0.02], 2)
  return o ? { at: o.at, wrap: Math.max(0, 1 - (t - tear) * 3), tilt: o.tilt * 0.4 } : null
}
function armTip(a: number): Pt {
  const len = 1.55
  const ang = lerp(-0.2, Math.PI / 2 + 0.28, a)
  return [TOWEL_PIVOT[0] + Math.cos(Math.PI - ang) * len * 0.6 - 0.1 * a, TOWEL_PIVOT[1] + Math.sin(ang) * len * 0.95]
}

export function drawTowelArm(pen: Pen, t: number): void {
  const a = towelArm(t)
  const tip = armTip(a)
  line(pen, TOWEL_PIVOT, tip, SPA.brass, 1.2)
  dot(pen, TOWEL_PIVOT, 0.05, SPA.brass, 0.5)
  // Its clip at the end: two fingers that open to let the towel go.
  const open = sm(t, TOWEL - 0.05, TOWEL + 0.05) * (1 - sm(t, TOWEL + 0.6, TOWEL + 1))
  line(pen, tip, [tip[0] - 0.08 - 0.05 * open, tip[1] + 0.1], SPA.brass, 0.7)
  line(pen, tip, [tip[0] + 0.08 + 0.05 * open, tip[1] + 0.1], SPA.brass, 0.7)
}

/** The towel, hanging from the arm, or wrapped round his lower half (drawn over him). */
export function drawTowel(pen: Pen, t: number): void {
  const tw = towelAt(t)
  if (!tw) return
  const { at, wrap } = tw
  const { p, k } = pen
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(tw.tilt)
  if (wrap <= 0.01) {
    // Folded over the clip: a hanging white cloth, a steam wisp off it (it is hot).
    shape(
      pen,
      [
        [-0.13, -0.08],
        [0.13, -0.08],
        [0.15, 0.2],
        [-0.12, 0.22],
      ],
      SPA.towel,
      0.45,
    )
    line(pen, [-0.1, 0.05], [0.12, 0.04], SPA.towelShade, 0.5)
  } else {
    // Wrapped: a hot towel wound round his top like a turban, its twist at the front; his blue below it.
    const r = R + 0.016
    const edge = lerp(-0.13, -0.066, wrap)
    const pts: Pt[] = []
    // The circle above the line y = edge: from its left crossing over the crown to its right crossing.
    const e = Math.asin(Math.max(-1, Math.min(1, edge / r)))
    const from = Math.PI - e
    const to = 2 * Math.PI + e
    for (let s = 0; s <= 16; s++) {
      const a = from + ((to - from) * s) / 16
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
    }
    shape(pen, pts, SPA.towel, 0.45)
    line(pen, [-r * 0.8, edge + 0.004], [r * 0.8, edge + 0.004], SPA.towelShade, 0.7)
    if (wrap > 0.5) {
      // Its twist, a fold swept up over the crown.
      const q = (wrap - 0.5) * 2
      shape(
        pen,
        [
          [0.005, -r + 0.005],
          [0.07, -r - 0.035 * q],
          [0.11, -r + 0.02],
          [0.06, -r + 0.035],
        ],
        SPA.towel,
        0.4,
      )
      line(pen, [-0.06, -r + 0.03], [0.05, -r + 0.01], SPA.towelShade, 0.6)
    }
  }
  p.pop()
}

/** The dryer: a wide chrome hood on a trolley rod, lowered over him as he passes; its warm breath, and up. */
const hoodDown = (t: number): number => sm(t, DRY - 0.4, DRY) * (1 - sm(t, DRY_UP, DRY_UP + 0.5))
export function drawHood(pen: Pen, t: number): void {
  const { x0, x1 } = HOOD
  const d = hoodDown(t)
  const bottom = lerp(GANTRY_TOP + 0.95, -R - 0.28, d)
  const top = bottom - 0.42
  // Its rods up to the beam.
  line(pen, [x0 + 0.15, GANTRY_TOP + 0.2], [x0 + 0.15, top + 0.1], SPA.brass, 0.7)
  line(pen, [x1 - 0.15, GANTRY_TOP + 0.2], [x1 - 0.15, top + 0.1], SPA.brass, 0.7)
  // The warm air under it while it blows.
  const blow = t > DRY - 0.05 && t < DRY_UP + 0.3 ? sm(t, DRY - 0.05, DRY + 0.05) * (1 - sm(t, DRY_UP, DRY_UP + 0.3)) : 0
  if (blow > 0) {
    vwash(pen, x0 + 0.1, x1 - 0.1, bottom, FLOOR_Y, [
      [0, SPA.candle, 0.2 * blow],
      [1, SPA.candle, 0.02 * blow],
    ])
    for (let j = 0; j < 5; j++) {
      const ph = (t * 1.8 + j * 0.37) % 1
      const xx = x0 + 0.2 + ((x1 - x0 - 0.4) * j) / 4
      column(pen, xx + 0.03 * Math.sin(t * 9 + j), bottom + ph * 0.3, bottom + ph * 0.3 + 0.18, 0.05, SPA.candle, 0.35 * blow * (1 - ph), 0.05)
    }
  }
  // The hood: a long chrome shell, a highlight along it, its vents glowing when it blows.
  const pts: Pt[] = [
    [x0, bottom],
    [x0 + 0.08, top + 0.1],
    [x0 + 0.3, top],
    [x1 - 0.3, top],
    [x1 - 0.08, top + 0.1],
    [x1, bottom],
  ]
  shape(pen, pts, CHROME, 0.7)
  line(pen, [x0 + 0.3, top + 0.1], [x1 - 0.3, top + 0.1], SPA.steam, 0.9)
  for (let j = 0; j < 6; j++) {
    const xx = x0 + 0.18 + ((x1 - x0 - 0.36) * j) / 5
    box(pen, xx - 0.03, bottom - 0.08, xx + 0.03, bottom - 0.02, blow > 0.1 ? SPA.candle : SPA.steelDark, 0)
  }
}

/* ------------------------------------------------------------------ the steam over the rig */

/** How thick the steam over the rig is: thick, then clearing from the vents' beat. */
export const fogAt = (t: number): number => 1 - sm(t, FOG_GO, FOG_GO + 2.2)

/**
 * The steam over the rig: a volume of billows, never a wall. Each billow is a soft round puff that breathes (swells and
 * shrinks), drifts a little on the room's air, and overlaps its neighbours; the near edge is ragged where the billows
 * end. Thick enough that the rig is only half seen through it. On the vents' beat the billows lift and thin, each in its
 * own time, the nearest first: the rig comes out of it as it drifts away, never as a wipe.
 */
interface Billow {
  x: number
  y: number
  r: number
  a: number
  ph: number
  late: number
}
const BILLOWS: Billow[] = (() => {
  const out: Billow[] = []
  const x0 = BELT_X1 - 0.9
  const x1 = XT + 3.2
  let j = 0
  for (let x = x0; x < x1; x += 0.8) {
    for (let y = FLOOR_Y - 0.15; y > CEIL + 0.3; y -= 0.9) {
      const h1 = hash(j, 11)
      const h2 = hash(j, 12)
      const h3 = hash(j, 13)
      // Thinner toward the near edge, where the billows straggle out.
      const edge = sm(x, x0, x0 + 2.2)
      if (edge < 0.25 && h1 > 0.55) {
        j++
        continue
      }
      out.push({
        x: x + (h1 - 0.5) * 0.7,
        y: y + (h2 - 0.5) * 0.6,
        r: 0.85 + 0.75 * h3,
        a: (0.42 + 0.14 * hash(j, 14)) * (0.55 + 0.45 * edge),
        ph: hash(j, 15) * 6.28,
        late: 0.1 + 1.0 * sm(x, x0, x1) + 0.35 * hash(j, 16),
      })
      j++
    }
  }
  return out
})()

export function drawFog(pen: Pen, t: number, f: { x0: number; x1: number; y0: number; y1: number }): void {
  if (fogAt(t) <= 0.001) return
  for (const b of BILLOWS) {
    // Its clearing: from its own moment after the vents open, it rises, spreads and thins.
    const u = Math.max(0, t - FOG_GO - b.late * 0.6)
    const thin = Math.exp(-u / 0.55)
    if (thin < 0.01) continue
    const breathe = 1 + 0.12 * Math.sin(t * 0.55 + b.ph)
    const x = b.x + 0.28 * Math.sin(t * 0.23 + b.ph) + 0.25 * u
    const y = b.y + 0.14 * Math.sin(t * 0.31 + b.ph * 1.7) - 0.9 * u * u - 0.35 * u
    const r = b.r * breathe * (1 + 0.45 * u)
    if (x + r < f.x0 - 0.5 || x - r > f.x1 + 0.5 || y + r < f.y0 - 0.5 || y - r > f.y1 + 0.5) continue
    puff(pen, [x, y], r, SPA.steam, b.a * thin)
  }
}
