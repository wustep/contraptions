import type { Pt } from '../../../../../parts'
import { layer, motes, sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { type Pen } from '../pen'
import { AY, BX0, BX1, DOOR_X, FLOOR, ROAD, S, SF } from './geo'
import { F, fireAt, fireLight } from './fire'
import { bag, box, cone, disc, fill, oval, poly, seg, stroke, wrap } from './ink'

/**
 * The airfield at night, round the airliner (`draw.ts` has the plane and its stair): the far side of the field (the
 * hangars with their doors lit, the control tower, the beacon on its roof turning, green and white by turns, the
 * runway's lights, a twin-engined plane taxiing with its props turning and its lights on, a fuel truck), a windsock on
 * the field's edge, mist lying on the field at two depths, and the barn's embers still going over on the wind. "I
 * can't stand this indecision": the field is wide, and all of it is going. Its lights are lamps, each the lit thing
 * itself, steady; none chases, pulses or blooms.
 */

export const A = {
  steel: '#0B1418',
  shed: '#0E171C',
  shedRib: '#16222A',
  door: '#D8BF7C',
  glass: '#BFE3D0',
  green: '#7FE3A0',
  white: '#F2EAD0',
  runway: '#F2E6C4',
  blue: '#7FA6FF',
  red: '#E0342A',
  amber: '#F2B63A',
  mist: '#8EA5B2',
  mistWarm: '#9A6A5A',
  plane: '#5A676E',
  planeDark: '#323C42',
  prop: '#C7D0D4',
  sockRed: '#B8322A',
  sockWhite: '#E6E2D6',
  pole: '#1A2226',
  dust: '#E8EED8',
  lamp: '#F4F0DC',
}

const ANCHOR: Pt = [0, AY]
/** The airfield's far side, and the mist: how far off each is (`depth.ts`). */
const D_FIELD = 0.65
const D_MIST = 0.8
const D_FRONT = 1.25
/** The far side's ground, in its own cells. */
const FIELD_BASE = ROAD - 0.72

/** The beacon's turn: once round every five seconds or so, at its own pace, not the song's. */
export const beaconTurn = (t: number): number => (2 * Math.PI * t) / 5.2

/* ------------------------------------------------------------------ the far side of the field */

/** The control tower, the rotating beacon on its roof. */
const TOWER_X = 36.2
const SHEDS: [number, number, number][] = [
  [41.2, 3.0, 1.25],
  [44.6, 3.4, 1.45],
  [48.6, 3.0, 1.2],
]
const TRUCK_X = 46.2
/** The twin taxiing out along the far apron, left to right. */
const TWIN_FROM = 161
const twinX = (t: number): number => 32.2 + 0.62 * Math.max(0, t - TWIN_FROM)

export function drawFarField(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < S + 20) return
  const span = f.y1 - f.y0
  layer(
    pen,
    f,
    D_FIELD,
    (g) => {
      if (g.x1 < 22 || g.x0 > 66) return
      const gy = FIELD_BASE
      // The ground of the far apron, a shade lighter than the field.
      const apron = bag()
      box(apron, Math.max(g.x0 - 1, 22), gy - 0.06, Math.min(g.x1 + 1, 66), gy + 0.3)
      fill(pen, apron, '#0C1A1C', 1)
      // The sheds: arched roofs, ribs, lit doors and a lamp over each.
      const sheds = bag()
      const doors = bag()
      for (const [x, w, h] of SHEDS) {
        if (x + w / 2 < g.x0 || x - w / 2 > g.x1) continue
        const arch: Pt[] = [[x - w / 2, gy]]
        for (let i = 0; i <= 10; i++) arch.push([x - w / 2 + (w * i) / 10, gy - h * Math.sin((i / 10) * Math.PI) ** 0.55])
        arch.push([x + w / 2, gy])
        poly(sheds, arch)
        box(doors, x - 0.36, gy - 0.55, x - 0.02, gy)
        box(doors, x + 0.02, gy - 0.55, x + 0.36, gy)
      }
      stroke(pen, sheds, A.shedRib, 1, 0.9)
      fill(pen, sheds, A.shed, 1)
      fill(pen, doors, A.door, 0.55)
      const lamps = bag()
      for (const [x] of SHEDS) if (x > g.x0 - 1 && x < g.x1 + 1) box(lamps, x - 0.06, gy - 0.7, x + 0.06, gy - 0.64)
      fill(pen, lamps, A.lamp, 0.9)
      // The control tower: its shaft, its glass room lit, the red light on its roof.
      if (TOWER_X > g.x0 - 1 && TOWER_X < g.x1 + 1) {
        const tw = bag()
        box(tw, TOWER_X - 0.17, gy - 1.85, TOWER_X + 0.17, gy)
        box(tw, TOWER_X - 0.42, gy - 2.32, TOWER_X + 0.42, gy - 2.26)
        box(tw, TOWER_X - 0.36, gy - 1.9, TOWER_X + 0.36, gy - 1.82)
        fill(pen, tw, A.steel, 1)
        const glass = bag()
        box(glass, TOWER_X - 0.36, gy - 2.26, TOWER_X + 0.36, gy - 1.9)
        fill(pen, glass, A.glass, 0.75)
        const mast = bag()
        seg(mast, TOWER_X - 0.24, gy - 2.26, TOWER_X - 0.24, gy - 1.9)
        seg(mast, TOWER_X, gy - 2.26, TOWER_X, gy - 1.9)
        seg(mast, TOWER_X + 0.24, gy - 2.26, TOWER_X + 0.24, gy - 1.9)
        stroke(pen, mast, A.steel, 1, 0.5)
      }
      // The fuel truck, its amber lamp on the cab's roof.
      if (TRUCK_X > g.x0 - 1.5 && TRUCK_X < g.x1 + 1.5) {
        const tr = bag()
        poly(tr, [[TRUCK_X - 0.75, gy - 0.12], [TRUCK_X - 0.75, gy - 0.48], [TRUCK_X + 0.45, gy - 0.48], [TRUCK_X + 0.45, gy - 0.12]])
        poly(tr, [[TRUCK_X + 0.5, gy - 0.12], [TRUCK_X + 0.5, gy - 0.5], [TRUCK_X + 0.82, gy - 0.5], [TRUCK_X + 0.92, gy - 0.32], [TRUCK_X + 0.92, gy - 0.12]])
        disc(tr, TRUCK_X - 0.45, gy - 0.1, 0.1)
        disc(tr, TRUCK_X + 0.7, gy - 0.1, 0.1)
        fill(pen, tr, A.steel, 1)
        const lamp = bag()
        disc(lamp, TRUCK_X + 0.66, gy - 0.54, 0.035)
        fill(pen, lamp, A.amber, 0.85)
      }
      // The far runway: two rows of lights, and the threshold's green.
      runway(pen, g, gy, span)
      // The twin, taxiing out.
      twin(pen, t, g, gy)
      // The beacon on the tower's roof.
      beacon(pen, t, g, gy, span)
    },
    ANCHOR,
  )
}

function runway(pen: Pen, g: Frame, gy: number, span: number): void {
  const lights = bag()
  const ends = bag()
  const r = span * 0.0021
  for (let x = Math.max(24, Math.ceil(g.x0 / 0.5) * 0.5); x <= Math.min(62, g.x1 + 0.5); x += 0.5) {
    for (const y of [gy + 0.05, gy + 0.2]) disc(lights, x, y, r)
  }
  for (const y of [gy + 0.05, gy + 0.2]) {
    if (24 > g.x0 && 24 < g.x1) for (let j = 0; j < 3; j++) disc(ends, 23.8 - j * 0.12, y, r * 1.2)
  }
  fill(pen, lights, A.runway, 0.7)
  fill(pen, ends, A.green, 0.85)
}

function twin(pen: Pen, t: number, g: Frame, gy: number): void {
  if (t < TWIN_FROM) return
  const x = twinX(t)
  if (x + 1.6 < g.x0 || x - 1.6 > g.x1) return
  const body = bag()
  // A tail-dragger at rest on its wheels: the fuselage sloping up to the nose, the fin, the tailplane.
  poly(body, [
    [x - 1.15, gy - 0.5],
    [x - 1.05, gy - 0.98],
    [x - 0.88, gy - 0.98],
    [x - 0.7, gy - 0.62],
    [x + 0.75, gy - 0.72],
    [x + 1.08, gy - 0.62],
    [x + 1.14, gy - 0.52],
    [x + 0.95, gy - 0.42],
    [x - 0.2, gy - 0.4],
    [x - 1.1, gy - 0.42],
  ])
  poly(body, [[x - 1.25, gy - 0.55], [x - 0.65, gy - 0.58], [x - 0.65, gy - 0.52], [x - 1.25, gy - 0.5]])
  // The wing, nearly edge on, and the near engine's nacelle.
  poly(body, [[x - 0.15, gy - 0.46], [x + 0.65, gy - 0.5], [x + 0.6, gy - 0.4], [x - 0.15, gy - 0.38]])
  poly(body, [[x + 0.3, gy - 0.52], [x + 0.78, gy - 0.54], [x + 0.84, gy - 0.46], [x + 0.78, gy - 0.38], [x + 0.3, gy - 0.4]])
  // The gear: the mains under the engine, the tail wheel.
  box(body, x + 0.46, gy - 0.4, x + 0.5, gy - 0.12)
  disc(body, x + 0.48, gy - 0.1, 0.1)
  disc(body, x - 1.0, gy - 0.04, 0.045)
  fill(pen, body, A.plane, 1)
  const belly = bag()
  poly(belly, [[x - 1.1, gy - 0.46], [x + 0.95, gy - 0.48], [x + 0.95, gy - 0.42], [x - 0.2, gy - 0.4], [x - 1.1, gy - 0.42]])
  fill(pen, belly, A.planeDark, 1)
  // Its cabin windows, lit.
  const win = bag()
  for (let i = 0; i < 7; i++) box(win, x - 0.55 + i * 0.16, gy - 0.64 + i * 0.006, x - 0.5 + i * 0.16, gy - 0.6 + i * 0.006)
  fill(pen, win, A.door, 0.9)
  // The props: a blur disc, edge on, and a blade's ghost going round in it; the far engine's beyond it.
  const blur = bag()
  const blade = bag()
  for (const [i, [px, py, ry]] of ([[x + 0.88, gy - 0.46, 0.3], [x + 0.95, gy - 0.6, 0.26]] as [number, number, number][]).entries()) {
    oval(blur, px, py, 0.045, ry)
    const a = t * 21 + i * 1.3
    seg(blade, px, py - ry * Math.sin(a), px, py + ry * Math.sin(a + 0.4))
  }
  fill(pen, blur, A.prop, 0.3)
  stroke(pen, blade, A.planeDark, 0.55, 0.5)
  // Its lights, small and steady: the wingtips (green near, red far), the tail's white, the red light on its back, the
  // taxi light under the nose.
  const lamp = (col: string, px: number, py: number, r: number) => {
    const c = bag()
    disc(c, px, py, r)
    fill(pen, c, col, 0.9)
  }
  lamp(A.green, x + 0.62, gy - 0.4, 0.03)
  lamp(A.red, x + 0.5, gy - 0.54, 0.025)
  lamp(A.white, x - 1.17, gy - 0.52, 0.025)
  lamp(A.red, x, gy - 0.74, 0.03)
  lamp(A.lamp, x + 0.66, gy - 0.44, 0.04)
}

function beacon(pen: Pen, t: number, g: Frame, gy: number, span: number): void {
  const x = TOWER_X
  if (x < g.x0 - 16 || x > g.x1 + 16) return
  const top = gy - 2.62
  // Its stand on the tower's roof, and its drum.
  const head = bag()
  box(head, x - 0.025, top, x + 0.025, gy - 2.32)
  box(head, x - 0.09, top - 0.12, x + 0.09, top + 0.04)
  fill(pen, head, A.steel, 1)
  // Its two lenses, green and white, back to back, going round: whichever is toward the camera shows, brightest as it
  // faces it square. A lamp turning; it throws nothing across the sky.
  const o: Pt = [x, top - 0.02]
  const facing = Math.cos(beaconTurn(t))
  const c = bag()
  disc(c, o[0], o[1], span * 0.003 + 0.025)
  fill(pen, c, facing > 0 ? A.green : A.white, 0.3 + 0.6 * Math.abs(facing) ** 2)
}

/* ------------------------------------------------------------------ the near edge of the field */

/** The windsock's pole, on the field's edge just short of the apron, and its height. */
const SOCK_X = S + 30.2
const SOCK_H = 3.6

/** The windsock: on its pole, streaming off downwind and flapping, gusting with the wind; a lamp on the pole's head. */
export function drawWindsock(pen: Pen, t: number, f: Frame): void {
  if (SOCK_X + 2 < f.x0 || SOCK_X - 1 > f.x1) return
  const foot = ROAD - 0.42
  const top: Pt = [SOCK_X, foot - SOCK_H]
  const pole = bag()
  box(pole, SOCK_X - 0.045, top[1] - 0.3, SOCK_X + 0.045, foot)
  box(pole, SOCK_X - 0.16, foot - 0.08, SOCK_X + 0.16, foot)
  box(pole, SOCK_X - 0.02, top[1] - 0.05, SOCK_X + 0.2, top[1] + 0.02)
  box(pole, SOCK_X - 0.12, top[1] - 0.38, SOCK_X + 0.05, top[1] - 0.26)
  fill(pen, pole, A.pole, 1)
  // The fire's light on its near side.
  const fl = Math.min(1, fireLight(t)) * fireAt(t)
  if (fl > 0.02) {
    const lit = bag()
    box(lit, SOCK_X - 0.045, top[1], SOCK_X - 0.015, foot)
    fill(pen, lit, F.red, 0.6 * fl)
  }
  // The sock: five hoops off the swivel, drooping as the gusts drop, each flapping a little behind the one before.
  const gust = 0.55 + 0.45 * (0.5 + 0.5 * sway(t, 3, 2.6))
  const droop = 0.85 - 0.75 * gust
  const red = bag()
  const white = bag()
  let p: Pt = [top[0] + 0.2, top[1] - 0.02]
  let a = droop * 0.4
  let r0 = 0.17
  for (let j = 0; j < 5; j++) {
    a += droop * 0.16 + 0.1 * (j + 1) * 0.35 * Math.sin(t * 9.5 + 1.2 * sway(t, 3, 2.6) - j * 1.15)
    const L = 0.25
    const q: Pt = [p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L]
    const r1 = r0 * (0.86 + 0.06 * Math.sin(t * 11 - j * 1.3))
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    poly(j % 2 ? white : red, [
      [p[0] + nx * r0, p[1] + ny * r0],
      [q[0] + nx * r1, q[1] + ny * r1],
      [q[0] - nx * r1, q[1] - ny * r1],
      [p[0] - nx * r0, p[1] - ny * r0],
    ])
    p = q
    r0 = r1
  }
  fill(pen, red, A.sockRed, 1)
  fill(pen, white, A.sockWhite, 1)
  // Its lamp, on the pole's head, turned down on it.
  const lamp = bag()
  box(lamp, top[0] + 0.03, top[1] - 0.34, top[0] + 0.07, top[1] - 0.28)
  fill(pen, lamp, A.lamp, 1)
}

/** The lamp on the stair's head, its light falling down the steps, and a little dust going round in it. */
export function drawStairLamp(pen: Pen, t: number, f: Frame): void {
  if (SF + 3 < f.x0 || SF - 3 > f.x1) return
  const o: Pt = [DOOR_X - 0.15, FLOOR - 1.15]
  const aim = -Math.atan2(SF - o[0], ROAD - o[1])
  cone(pen, o, aim, 0.5, 3.6, A.lamp, 0.07)
  motes(pen, t, {
    n: 18,
    seed: 61,
    box: [SF - 1.2, FLOOR - 1.1, DOOR_X + 0.2, ROAD],
    size: [0.008, 0.018],
    color: A.dust,
    alpha: 0.55,
    drift: [0.04, 0.05],
    wander: 0.18,
    twinkle: 0.15,
    light: (x, y) => {
      const ang = -Math.atan2(x - o[0], y - o[1])
      const off = Math.abs(ang - aim)
      const dist = Math.hypot(x - o[0], y - o[1])
      return Math.max(0, 1 - off / 0.3) * Math.max(0, 1 - dist / 4)
    },
  })
  const c = bag()
  box(c, o[0] - 0.09, o[1] - 0.06, o[0] + 0.09, o[1] + 0.05)
  fill(pen, c, A.lamp, 1)
}

/* ------------------------------------------------------------------ the mist, and the embers on the wind */

/** Banks of mist, and how far apart they come round: more than a wide picture's width and two banks, so none is seen twice. */
const BANKS = 16
const BANK_PERIOD = 36
const BANK_WIND = 0.3

/** Mist lying on the field, at a depth, drifting downwind: a few long soft banks, warm on the side of the fire. */
function mist(pen: Pen, t: number, f: Frame, d: number, y0: number, seed: number, a: number, size: number): void {
  layer(
    pen,
    f,
    d,
    (g) => {
      const cool = [bag(), bag()]
      const warm = [bag(), bag()]
      const fire = fireAt(t)
      let any = false
      for (let i = 0; i < BANKS; i++) {
        const L = (2.2 + 3 * hash(i, seed, 1)) * size
        const h = (0.16 + 0.22 * hash(i, seed, 2)) * size
        // Each bank where it has drifted to, brought round to just short of the picture's left edge.
        const x = wrap(BANK_PERIOD * hash(i, seed, 3) + BANK_WIND * (0.7 + 0.6 * hash(i, seed, 4)) * t * (d > 1 ? 1.4 : 1), g.x0 - 7, BANK_PERIOD)
        const y = y0 - h * 0.6 - 0.25 * hash(i, seed, 5)
        if (x + L < g.x0 || x - L > g.x1) continue
        const wx = x + f.cx * (1 - d)
        // Only out over the field and the airfield.
        const on = smooth(wx, BX1 - 1, BX1 + 4)
        if (on < 0.15) continue
        any = true
        const bucket = fire > 0.2 && wx < S + 28 ? warm : cool
        oval(bucket[0], x, y, L * 0.75, h * 1.5)
        oval(bucket[1], x + 0.2 * L, y + 0.1 * h, L * 0.5, h)
      }
      if (!any) return
      fill(pen, cool[0], A.mist, a * 0.55)
      fill(pen, cool[1], A.mist, a * 0.75)
      fill(pen, warm[0], A.mistWarm, a * 0.6)
      fill(pen, warm[1], A.mistWarm, a * 0.8)
    },
    ANCHOR,
  )
}

/** The mist beyond the path, lying low over the field. */
export function drawMistBack(pen: Pen, t: number, f: Frame): void {
  mist(pen, t, f, D_MIST, ROAD - 0.5, 1, 0.1, 1)
}

/** The mist in front, at the foot of the picture: drawn over everything, low and thin, never up to Marty. */
export function drawMistFront(pen: Pen, t: number, f: Frame): void {
  mist(pen, t, f, D_FRONT, ROAD + 1.1, 2, 0.11, 1.3)
}

/** The barn's embers carried off over the field on the wind, thinning as they go. */
export function drawDrift(pen: Pen, t: number, f: Frame): void {
  const fire = fireAt(t)
  if (fire <= 0 || f.x1 < BX1 - 1) return
  const span = f.y1 - f.y0
  motes(pen, t, {
    n: Math.round(36 * fire),
    seed: 71,
    box: [BX0 + 2, ROAD - 9, S + 46, ROAD - 0.6],
    size: [span * 0.0016, span * 0.003],
    color: F.ember,
    alpha: 0.85,
    drift: [0.85, -0.16],
    wander: 0.35,
    twinkle: 0.3,
    light: (x) => Math.max(0, 1 - Math.max(0, x - BX1) / 22),
  })
}
