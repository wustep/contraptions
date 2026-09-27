import { mixHex, R, type Pt } from '../../../../../parts'
import { beam, bloom, pool } from '../cast'
import { PM, SPA } from '../worlds'
import {
  BALCONY,
  BLAST,
  chairAngle,
  chairPoint,
  CHUTE,
  chuteY,
  CYCLES,
  DELIVER,
  DISC,
  dryerAt,
  DRYER,
  FLINGS,
  FLOOR_Y,
  HINGE,
  hornAt,
  lerp,
  LEVER,
  leverAt,
  P,
  REST,
  rot,
  seatY,
  sinkAt,
  sm,
  targetTip,
  windUp,
  XT,
} from './spa-geo'
import { box, disc, dot, line, polyline, puff, rbox, shape, vwash, type Pen } from './spa-kit'
import { CEIL, DEEP } from './spa-set'

/**
 * The conditioning rig, past the line's end: the recliner in its pit, hinged at its foot, a coil spring under its back
 * and a latch at its back's end; over it Mugatu's balcony, his console with the gramophone that plays the song, and
 * the brass horn hung under it aimed at the chair; his lever, its cable down to the latch. Across the room the
 * target in the Prime Minister's crimson on its post, the chute back to the chair under it, and the big chrome dryer
 * that comes down out of the ceiling at the end.
 */

const LEATHER = SPA.mint
const LEATHER_DARK = mixHex(SPA.mint, SPA.marble, 0.35)
const PALE = mixHex(PM, SPA.towel, 0.72)
const CHROME = SPA.steel
export const PIT = { x0: P[0] - 2.05, x1: P[0] + 0.22, floor: 0.46 }
/** The horn's bell: its middle, aimed at where he sits. */
export const BELL: Pt = [P[0] - 1.82, -1.72]
const BELL_R = 0.5
const THROAT: Pt = [P[0] - 2.2, BALCONY.top + 0.2]

/* ------------------------------------------------------------------ the recliner */

/** Is the latch open at `t` (0 shut, 1 open)? Open from the lever's pull to the ratchet's last click. */
function latchOpen(t: number): number {
  let v = 0
  CYCLES.forEach((c, k) => {
    const f = FLINGS[k]
    v = Math.max(v, sm(t, c.lever - 0.02, f.start + 0.02) * (1 - sm(t, c.latch - 0.12, c.latch)))
  })
  return v
}

/** A pad of the chair, cocked (world): its top along where he rolls, its bottom on the frame, its ends rounded. */
function pad(xa: number, xb: number, bottom = 0.355): Pt[] {
  const top = (x: number) => seatY(Math.max(P[0] - 1.9, Math.min(P[0] + 0.1, x))) + R + 0.004
  const r = 0.06
  const out: Pt[] = []
  out.push([xa, bottom])
  for (let i = 0; i <= 4; i++) {
    const a = Math.PI - (i * Math.PI) / 8
    out.push([xa + r + Math.cos(a) * r, top(xa + r) + r - Math.sin(a) * r])
  }
  for (let i = 1; i < 16; i++) {
    const x = xa + r + ((xb - xa - 2 * r) * i) / 16
    out.push([x, top(x)])
  }
  for (let i = 4; i >= 0; i--) {
    const a = (i * Math.PI) / 8
    out.push([xb - r + Math.cos(a) * r, top(xb - r) + r - Math.sin(a) * r])
  }
  out.push([xb, bottom])
  return out
}
/** The back, the seat and the footrest: three tufted pads. */
const PADS: Pt[][] = [pad(P[0] - 1.97, P[0] - 1.06), pad(P[0] - 1.03, P[0] - 0.45), pad(P[0] - 0.42, P[0] + 0.13, 0.33)]

export function drawRecliner(pen: Pen, t: number): void {
  const a = chairAngle(t)
  const at = (q: Pt): Pt => chairPoint(a, q)
  // The pit it lies in: dark, a brass lip at its edges.
  box(pen, PIT.x0, FLOOR_Y, PIT.x1, PIT.floor, DEEP, 0)
  box(pen, PIT.x0 - 0.05, FLOOR_Y - 0.02, PIT.x0 + 0.03, FLOOR_Y + 0.12, SPA.brass, 0)
  box(pen, PIT.x1 - 0.03, FLOOR_Y - 0.02, PIT.x1 + 0.05, FLOOR_Y + 0.12, SPA.brass, 0)
  // The spring: from the pit's floor to under the back, a coil stretched as the chair goes up.
  const foot: Pt = [P[0] - 1.05, PIT.floor]
  const head = at([P[0] - 1.05, 0.4])
  const n = 7
  const dir: Pt = [head[0] - foot[0], head[1] - foot[1]]
  const len = Math.hypot(dir[0], dir[1])
  const nrm: Pt = [-dir[1] / len, dir[0] / len]
  const coil: Pt[] = [foot]
  for (let i = 1; i < 2 * n; i++) {
    const u = i / (2 * n)
    const s = i % 2 ? 1 : -1
    coil.push([foot[0] + dir[0] * u + nrm[0] * 0.11 * s, foot[1] + dir[1] * u + nrm[1] * 0.11 * s])
  }
  coil.push(head)
  polyline(pen, coil, CHROME, 1.1)
  // Its frame under the pads, brass, to the hinge at its foot.
  shape(pen, [at([P[0] - 1.97, 0.35]), at([P[0] + 0.15, 0.33]), at([P[0] + 0.15, 0.4]), at([P[0] - 1.97, 0.41])], SPA.brass, 0.6)
  // The pads: mint leather, a button or two in each; dented under him where he sinks in, gathering.
  const w = windUp(t)
  const dent = sinkAt(t) > 0 ? { x: REST[0], d: sinkAt(t) } : w.sink > 0 ? { x: REST[0] - w.back, d: w.sink } : null
  const dented = (q: Pt): Pt => (dent && a < 1e-6 ? [q[0], q[1] + dent.d * Math.exp(-(((q[0] - dent.x) / 0.2) ** 2))] : q)
  PADS.forEach((pts, i) => {
    shape(pen, pts.map((q) => at(dented(q))), LEATHER, 0.75)
    const xs = i === 0 ? [P[0] - 1.7, P[0] - 1.35] : i === 1 ? [P[0] - 0.74] : [P[0] - 0.14]
    for (const x of xs) dot(pen, at([x, (seatY(x) + R + 0.34) / 2 + 0.02]), 0.018, LEATHER_DARK, 0)
  })
  dot(pen, P, 0.07, SPA.brass, 0.6)
  // The latch at its back's end: a heavy brass claw on a pivot at the pit's edge, hooked over a keeper on the frame;
  // thrown open by the cable, shut by the ratchet's last click. While it is shut the chair cannot go.
  const open = latchOpen(t)
  const keeper = at([P[0] - 1.9, 0.33])
  dot(pen, keeper, 0.05, SPA.brass, 0.6)
  const hp: Pt = [P[0] - 2.16, 0.46]
  box(pen, hp[0] - 0.05, hp[1], hp[0] + 0.05, FLOOR_Y + 0.02, SPA.brass, 0.6)
  const claw: Pt[] = [
    [-0.05, 0.02],
    [-0.03, -0.3],
    [0.08, -0.38],
    [0.3, -0.36],
    [0.36, -0.26],
    [0.3, -0.12],
    [0.24, -0.16],
    [0.26, -0.25],
    [0.1, -0.26],
    [0.05, -0.2],
    [0.05, 0.02],
  ].map(([x, y]) => {
    const q = rot(-1.0 * open, [x, y])
    return [hp[0] + q[0], hp[1] + q[1]] as Pt
  })
  shape(pen, claw, SPA.brass, 0.7)
  dot(pen, [hp[0], hp[1] - 0.02], 0.035, SPA.steelDark, 0.4)
}

/* ------------------------------------------------------------------ the balcony, the console, the horn, the lever */

export function drawBalcony(pen: Pen, t: number): void {
  const { x0, x1, top } = BALCONY
  // The cable from the lever: along under the slab, down the wall, to the latch; it jerks when he pulls.
  const pull = leverAt(t)
  const jerk = 0.05 * pull
  polyline(
    pen,
    [
      [LEVER[0], top + 0.15],
      [x0 + 0.15 - jerk, top + 0.22],
      [x0 + 0.1 - jerk, FLOOR_Y - 0.1],
      [P[0] - 2.12, FLOOR_Y + 0.12],
    ],
    SPA.brass,
    1.1,
  )
  // Its bracket to the wall, the slab.
  shape(
    pen,
    [
      [x0 + 0.25, top + 0.2],
      [x0 + 0.9, top + 0.2],
      [x0 + 0.25, top + 0.85],
    ],
    SPA.brass,
    0.5,
  )
  box(pen, x0, top, x1, top + 0.2, mixHex(SPA.tile, SPA.marbleVein, 0.5), 0.7)
  box(pen, x0, top, x1, top + 0.04, SPA.brass, 0)
  // The console at its near end: a cabinet, the gramophone on it, turning while the song plays.
  const c0 = x0 + 0.12
  const c1 = x0 + 0.78
  rbox(pen, c0, top - 0.55, c1, top, 0.04, SPA.tile, 0.7)
  box(pen, c0 + 0.08, top - 0.45, c1 - 0.08, top - 0.12, mixHex(SPA.tile, SPA.brass, 0.25), 0.4)
  const play = hornAt(t)
  const pc: Pt = [(c0 + c1) / 2, top - 0.6]
  disc(pen, pc, 0.27, 0.07, SPA.marble, 0.6)
  const spin = t * 5.5
  if (play > 0) line(pen, [pc[0] + Math.cos(spin) * 0.2, pc[1] + Math.sin(spin) * 0.05], [pc[0] + Math.cos(spin) * 0.08, pc[1] + Math.sin(spin) * 0.02], SPA.marbleVein, 0.7)
  line(pen, [c1 - 0.05, top - 0.62], [pc[0] + 0.08, pc[1] - 0.01], SPA.brass, 0.7)
  // The lever: a tall brass lever on a quadrant, leaning back toward him; he pushes it over, and it springs back.
  const lp: Pt = [LEVER[0], top - 0.05]
  shape(
    pen,
    [
      [lp[0] - 0.2, top],
      [lp[0] + 0.2, top],
      [lp[0] + 0.12, top - 0.14],
      [lp[0] - 0.12, top - 0.14],
    ],
    SPA.brass,
    0.5,
  )
  const ang = -0.38 + 1.05 * pull
  const tip: Pt = [lp[0] + Math.sin(ang) * 0.82, lp[1] - Math.cos(ang) * 0.82]
  line(pen, lp, tip, SPA.brass, 1.9)
  dot(pen, tip, 0.06, SPA.brass, 0.6)
  dot(pen, lp, 0.045, SPA.steelDark, 0.4)
}

/** The rail along the balcony's front: in front of Mugatu (drawn over him). */
export function drawBalconyRail(pen: Pen): void {
  const { x0, x1, top } = BALCONY
  const h = 0.42
  line(pen, [x0 + 0.05, top - h], [x1 - 0.02, top - h], SPA.brass, 1.0)
  for (let x = x0 + 0.05; x <= x1; x += 0.36) line(pen, [x, top], [x, top - h], SPA.brass, 0.5)
}

/** The horn under the balcony: a brass tulip, its bell aimed at the chair; breathing with the song when it plays. */
export function drawHorn(pen: Pen, t: number): void {
  const play = hornAt(t)
  const aim = Math.atan2(REST[1] - BELL[1], REST[0] - BELL[0])
  const ax: Pt = [Math.cos(aim), Math.sin(aim)]
  const nx: Pt = [-ax[1], ax[0]]
  const breathe = 1 + 0.035 * play
  // The song, pouring out of it at him: warm air, soft, strongest on each line.
  if (play > 0.01) {
    beam(pen.p, pen.k, [BELL[0] + ax[0] * 0.05, BELL[1] + ax[1] * 0.05], [REST[0] + ax[0] * 0.3, REST[1] + ax[1] * 0.3], BELL_R * 1.8, 0.7, SPA.candle, 0.2 * play)
  }
  // Its body: from the throat under the slab, curving down, flaring to the bell.
  const back: Pt = [BELL[0] - ax[0] * 0.95, BELL[1] - ax[1] * 0.95]
  const pts: Pt[] = []
  const side = (s: number, sign: number): Pt => {
    // A quadratic from the throat through `back` to the bell's rim.
    const q = (1 - s) * (1 - s)
    const c = [q * THROAT[0] + 2 * (1 - s) * s * back[0] + s * s * BELL[0], q * THROAT[1] + 2 * (1 - s) * s * back[1] + s * s * BELL[1]]
    const w = (0.035 + (BELL_R - 0.035) * Math.pow(s, 3.2)) * breathe
    return [c[0] + nx[0] * w * sign, c[1] + nx[1] * w * sign]
  }
  for (let i = 0; i <= 20; i++) pts.push(side(i / 20, 1))
  for (let i = 20; i >= 0; i--) pts.push(side(i / 20, -1))
  shape(pen, pts, SPA.horn, 0.75)
  polyline(
    pen,
    Array.from({ length: 12 }, (_, i) => {
      const s = 0.35 + (0.6 * i) / 11
      const a = side(s, 1)
      const b = side(s, -1)
      return [lerp(a[0], b[0], 0.3), lerp(a[1], b[1], 0.3)] as Pt
    }),
    SPA.candle,
    0.7,
  )
  // The bell's mouth, seen a little from the side: dark inside, a glow in it on each breath.
  const { p, k } = pen
  p.push()
  p.translate(BELL[0] * k, BELL[1] * k)
  p.rotate(aim)
  disc(pen, [0, 0], 0.11 * breathe, BELL_R * breathe, mixHex(SPA.horn, SPA.marble, 0.7), 0.75)
  p.pop()
  if (play > 0.01) bloom(p, k, BELL, 0.55, SPA.candle, 0.35 * play)
}

/* ------------------------------------------------------------------ the target, the chute */

export function drawTarget(pen: Pen, t: number): void {
  const tip = targetTip(t)
  // Its post and foot.
  box(pen, HINGE[0] - 0.035, HINGE[1], HINGE[0] + 0.035, FLOOR_Y - 0.03, SPA.brass, 0.6)
  rbox(pen, HINGE[0] - 0.28, FLOOR_Y - 0.06, HINGE[0] + 0.28, FLOOR_Y, 0.03, SPA.brass, 0.6)
  // The board and the disc on it, turned back about the hinge; as it goes over it turns edge on.
  const { p, k } = pen
  p.push()
  p.translate(HINGE[0] * k, HINGE[1] * k)
  p.rotate(tip)
  const thin = 1 - 0.86 * Math.sin(Math.min(Math.PI / 2, tip))
  const c: Pt = [DISC.c[0] - HINGE[0], DISC.c[1] - HINGE[1]]
  rbox(pen, c[0] - 0.44 * thin + 0.1 * thin, c[1] - 0.72, c[0] + 0.52 * thin, c[1] + 0.68, 0.06, SPA.tile, 0.7)
  const rings: [number, string][] = [
    [1, PM],
    [0.78, PALE],
    [0.58, PM],
    [0.38, PALE],
    [0.18, PM],
  ]
  rings.forEach(([f, col], i) => disc(pen, c, DISC.rx * f * thin, DISC.ry * f, col, i === 0 ? 0.75 : 0.35))
  box(pen, -0.06, -0.06, 0.06, 0.02, SPA.brass, 0.5)
  p.pop()
}

export function drawChute(pen: Pen): void {
  const { x0, y0, x1, y1 } = CHUTE
  // A brass trough from under the target down to the chair's foot, on legs.
  const lip = 0.07
  shape(
    pen,
    [
      [x0 - 0.1, y0 + R + 0.02],
      [x1 + 0.05, y1 + R],
      [x1 + 0.05, y1 + R - 0.08],
      [x1 + 0.12, y1 + R - 0.08],
      [x1 + 0.12, y1 + R + lip],
      [x0 - 0.1, y0 + R + lip + 0.02],
    ],
    SPA.brass,
    0.6,
  )
  for (let x = x0 + 0.6; x < x1; x += 1.25) {
    const y = chuteY(x) + R + lip
    if (y < FLOOR_Y - 0.02) line(pen, [x, y], [x, FLOOR_Y], SPA.brass, 0.6)
  }
}

/* ------------------------------------------------------------------ the rig's lights */

export function drawRigLight(pen: Pen, t: number): void {
  const { p, k } = pen
  const on = sm(t, DELIVER - 1.8, DELIVER + 0.4)
  if (on <= 0) return
  // One hard light from the dark over the target, the other on the chair; each a pool on the floor.
  beam(p, k, [XT - 0.9, -4.6], [XT - 0.05, FLOOR_Y], 0.25, 1.6, SPA.steam, 0.2 * on)
  pool(p, k, [XT - 0.1, FLOOR_Y + 0.03], 0.9, 0.08, SPA.steam, 0.3 * on)
  beam(p, k, [REST[0] + 0.5, -4.6], [REST[0], FLOOR_Y], 0.2, 1.5, SPA.steam, 0.1 * on)
  pool(p, k, [REST[0] - 0.1, FLOOR_Y + 0.02], 1.0, 0.08, SPA.steam, 0.18 * on)
}

/* ------------------------------------------------------------------ the big dryer */

export function drawBigDryer(pen: Pen, t: number): void {
  const d = dryerAt(t)
  const hood: Pt = [DRYER.x, d.y]
  if (hood[1] < CEIL - 1.5) return
  // Its column: three chrome tubes telescoping out of a slot in the ceiling.
  const topY = CEIL
  const span = hood[1] - 0.3 - topY
  for (let i = 0; i < 3; i++) {
    const w = 0.07 - i * 0.015
    const y0 = topY + (span * i) / 3
    box(pen, hood[0] - w, y0, hood[0] + w, hood[1] - 0.25, i === 0 ? SPA.steelDark : CHROME, 0.5)
  }
  box(pen, hood[0] - 0.22, topY - 0.1, hood[0] + 0.22, topY + 0.05, SPA.brass, 0.5)
  // The hood: a big chrome dome, turned to aim down his way; hot inside as it spins up.
  const { p, k } = pen
  p.push()
  p.translate(hood[0] * k, hood[1] * k)
  p.rotate(-d.aim * 0.9)
  const dome: Pt[] = []
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + (Math.PI * i) / 20
    dome.push([Math.cos(a) * 0.6, Math.sin(a) * 0.5 + 0.22])
  }
  shape(pen, dome, CHROME, 0.75)
  line(pen, [-0.4, -0.12], [0.28, -0.2], SPA.steam, 1.0)
  // Its mouth, edge on: a rim, the glow of its heaters.
  disc(pen, [0, 0.22], 0.6, 0.09, mixHex(SPA.steelDark, SPA.candle, 0.4 * d.spin), 0.75)
  p.pop()
  if (d.spin > 0.02) bloom(p, k, [hood[0] + 0.25, hood[1] + 0.4], 0.8, SPA.candle, 0.35 * d.spin)
  // The blast: hot air rolling out of it along the floor, his way.
  if (d.blow > 0.01) {
    const u = t - BLAST
    for (let j = 0; j < 7; j++) {
      const s = (u * 2.2 + j * 0.16) % 1.4
      const x = hood[0] + 0.5 + s * 3.2
      const y = hood[1] + 0.55 + s * 0.35 + 0.08 * Math.sin(j * 2.1)
      puff(pen, [x, Math.min(FLOOR_Y - 0.15, y)], 0.28 + s * 0.25, SPA.candle, 0.3 * d.blow * (1 - s / 1.4))
    }
    vwash(pen, hood[0], hood[0] + 3.5, FLOOR_Y - 0.9, FLOOR_Y, [
      [0, SPA.candle, 0],
      [1, SPA.candle, 0.12 * d.blow],
    ])
  }
}

